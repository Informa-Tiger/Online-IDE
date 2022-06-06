import { TokenType } from "../lexer/Token.js";
import { ArrayType } from "../types/Array.js";
import { Klass, Interface } from "../types/Class.js";
import { Attribute, Method, Parameterlist, PrimitiveType } from "../types/Types.js";
import { stringPrimitiveType, objectType } from "../types/PrimitiveTypes.js";
import { Enum } from "../types/Enum.js";
import { JsonTool } from "../types/TypeTools.js";
// TODO: find cyclic references in extends ...
export class TypeResolver {
    constructor(main) {
        this.main = main;
        this.moduleToTypeParameterListMap = new Map();
        this.genericTypes = [];
        this.genericTypesInClassDefinitions = [];
        this.typeParameterList = [];
    }
    start(moduleStore) {
        this.classes = [];
        this.interfaces = [];
        this.enums = [];
        this.unresolvedTypes = new Map();
        this.moduleStore = moduleStore;
        this.resolveTypesInModules();
        this.setupClassesAndInterfaces();
        let unresolvedGenericTypesInClasses = this.resolveTypeVariables();
        this.resolveUnresolvedTypes(false);
        this.resolveGenericTypes(unresolvedGenericTypesInClasses);
        this.resolveExtendsImplements();
        let unresolvedGenericTypes = this.resolveGenericTypes(this.genericTypes);
        this.resolveUnresolvedTypes(true);
        this.resolveGenericTypes(unresolvedGenericTypes);
        this.setupMethodsAndAttributes();
        this.checkDoubleIdentifierDefinition();
        this.checkGenericTypesAgainsTypeGuards();
        this.setupAttributeIndices();
    }
    setupAttributeIndices() {
        for (let cl of this.classes) {
            cl.resolvedType.setupAttributeIndicesRecursive();
            if (cl.resolvedType.staticClass != null) {
                cl.resolvedType.staticClass.setupAttributeIndicesRecursive();
            }
        }
        for (let cl of this.enums) {
            cl.resolvedType.setupAttributeIndicesRecursive();
            if (cl.resolvedType.staticClass != null) {
                cl.resolvedType.staticClass.setupAttributeIndicesRecursive();
            }
        }
    }
    checkGenericTypesAgainsTypeGuards() {
        for (let tn of this.genericTypes) {
            if (tn.typeNode.genericParameterTypes == null)
                continue; // Error in resolveGenericType => nothing to do.
            let ci = tn.typeNode.resolvedType;
            if (ci.isGenericVariantFrom == null)
                continue;
            if (ci.typeVariables.length != ci.isGenericVariantFrom.typeVariables.length) {
                tn.module.errors[2].push({
                    position: tn.typeNode.position,
                    text: "Der Generische Typ " + ci.isGenericVariantFrom.identifier + " hat " + ci.isGenericVariantFrom.typeVariables.length + " Typparameter. Hier wurden aber " + ci.typeVariables.length + " angegeben.",
                    level: "error"
                });
                continue;
            }
            for (let i = 0; i < ci.typeVariables.length; i++) {
                let error = null;
                let actualType = ci.typeVariables[i];
                let typeGuard = ci.isGenericVariantFrom.typeVariables[i];
                let genericParameterType = tn.typeNode.genericParameterTypes[i];
                actualType.scopeFrom = typeGuard.scopeFrom;
                actualType.scopeTo = typeGuard.scopeTo;
                actualType.identifier = typeGuard.identifier;
                error = "";
                if (!actualType.type.hasAncestorOrIs(typeGuard.type)) {
                    error += "Die Klasse " + actualType.type.identifier + " ist keine Unterklasse von " + typeGuard.type.identifier + " und pass damit nicht zum Typparamter " + typeGuard.identifier + " der Klasse " + ci.isGenericVariantFrom.identifier + ". ";
                }
                let ifList = [];
                for (let tgInterface of typeGuard.type.implements) {
                    if (!actualType.type.implementsInterface(tgInterface)) {
                        ifList.push(tgInterface.identifier);
                    }
                }
                if (ifList.length > 0) {
                    error += "Die Klasse " + actualType.identifier + " implementiert nicht die Interfaces " + ifList.join(", ");
                }
                if (error != "") {
                    tn.module.errors[2].push({
                        position: genericParameterType.position,
                        text: "Der angegebene Wert des Typparameters passt nicht zur Definition: " + error,
                        level: "error"
                    });
                }
            }
            this.adjustMethodsAndAttributesToTypeParameters(ci, TypeResolver.WATCHDOG);
        }
    }
    adjustMethodsAndAttributesToTypeParameters(classOrInterface, watchdog) {
        if (watchdog <= 0)
            return;
        if (classOrInterface != null && classOrInterface.isGenericVariantFrom != null && classOrInterface.typeVariables.length != 0) {
            let methodListAltered = false;
            let newMethodList = [];
            for (let m of classOrInterface.methods) {
                let newMethod = this.getAdjustedMethod(m, classOrInterface.typeVariables, watchdog - 1);
                methodListAltered = methodListAltered || newMethod.altered;
                newMethodList.push(newMethod.newMethod);
            }
            if (methodListAltered)
                classOrInterface.methods = newMethodList;
            if (classOrInterface instanceof Klass) {
                let newAttributes = [];
                let newAttributeMap = new Map();
                let attributesAltered = false;
                for (let attribute of classOrInterface.attributes) {
                    let newAttribute = this.getAdjustedAttribute(attribute, classOrInterface.typeVariables, watchdog - 1);
                    attributesAltered = attributesAltered || newAttribute.altered;
                    newAttributes.push(newAttribute.newAttribute);
                    newAttributeMap.set(attribute.identifier, newAttribute.newAttribute);
                }
                if (attributesAltered) {
                    classOrInterface.attributes = newAttributes;
                    classOrInterface.attributeMap = newAttributeMap;
                }
                this.adjustMethodsAndAttributesToTypeParameters(classOrInterface.baseClass, watchdog - 1);
                // for (let impl of classOrInterface.implements) {
                //     this.adjustMethodsAndAttributesToTypeParameters(impl);
                // }
            }
            else {
                for (let ext of classOrInterface.extends) {
                    this.adjustMethodsAndAttributesToTypeParameters(ext, watchdog - 1);
                }
            }
        }
    }
    getAdjustedAttribute(attribute, typeVariables, watchdog) {
        let nt = this.getAdjustedType(attribute.type, typeVariables, true, watchdog - 1);
        if (nt.altered) {
            let a = Object.create(attribute);
            a.type = nt.newType;
            return { altered: true, newAttribute: a };
        }
        else {
            return { altered: false, newAttribute: attribute };
        }
    }
    getAdjustedMethod(method, typeVariables, watchdog) {
        let nrt = this.getAdjustedType(method.returnType, typeVariables, true, watchdog - 1);
        let parameterAltered = false;
        let newParameters = [];
        for (let p of method.parameterlist.parameters) {
            let nt = this.getAdjustedType(p.type, typeVariables, false, watchdog - 1);
            if (nt.altered) {
                parameterAltered = true;
                let pNew = Object.create(p);
                pNew.type = nt.newType;
                newParameters.push(pNew);
            }
            else {
                newParameters.push(p);
            }
        }
        if (nrt.altered || parameterAltered) {
            let newMethod = Object.create(method);
            if (nrt.altered)
                newMethod.returnType = nrt.newType;
            if (parameterAltered) {
                newMethod.parameterlist = new Parameterlist(newParameters);
            }
            return { altered: true, newMethod: newMethod };
        }
        else {
            return { altered: false, newMethod: method };
        }
    }
    getAdjustedType(type, typeVariables, adjustMethodsAndAttributesRecursive, watchdog) {
        if (type == null)
            return { altered: false, newType: type };
        if (type["isTypeVariable"] == true) {
            for (let tv of typeVariables) {
                if (tv.identifier == type.identifier) {
                    return { altered: true, newType: tv.type };
                }
            }
            return { altered: false, newType: type };
        }
        if ((type instanceof Klass || type instanceof Interface) && type.typeVariables.length > 0) {
            let newTypeVariables = [];
            let altered = false;
            for (let tv of type.typeVariables) {
                let nt = this.getAdjustedType(tv.type, typeVariables, false, watchdog - 1);
                if (nt.altered) {
                    newTypeVariables.push({
                        identifier: tv.identifier,
                        scopeFrom: tv.scopeFrom,
                        scopeTo: tv.scopeTo,
                        type: nt.newType
                    });
                    altered = true;
                }
                else {
                    newTypeVariables.push(tv);
                }
            }
            if (altered) {
                let newClassInterface = type.clone();
                newClassInterface.typeVariables = newTypeVariables;
                if (adjustMethodsAndAttributesRecursive)
                    this.adjustMethodsAndAttributesToTypeParameters(newClassInterface, watchdog - 1);
                return { altered: true, newType: newClassInterface };
            }
            else {
                return { altered: false, newType: type };
            }
        }
        if (type instanceof ArrayType) {
            let nt = this.getAdjustedType(type.arrayOfType, typeVariables, adjustMethodsAndAttributesRecursive, watchdog - 1);
            return {
                altered: nt.altered,
                newType: nt.altered ? new ArrayType(nt.newType) : type
            };
        }
        return { altered: false, newType: type };
    }
    resolveGenericTypes(genericTypes) {
        let done = false;
        let todoList = genericTypes.slice(0);
        while (!done) {
            done = true;
            for (let i = 0; i < todoList.length; i++) {
                let tn = todoList[i];
                if (this.resolveGenericType(tn)) {
                    done = false;
                }
                if (tn.typeNode.genericParameterTypes == null || tn.typeNode.genericParameterTypesResolved != null) {
                    todoList.splice(todoList.indexOf(tn), 1);
                    i--;
                }
            }
        }
        return todoList;
    }
    // returns true if something new could be resolved
    resolveGenericType(tn) {
        if (tn.typeNode.genericParameterTypesResolved != null)
            return false;
        if (tn.typeNode.genericParameterTypes == null)
            return true;
        /**
         * e.g. Map<Integer, String> test = new Map<>();
         * Subsequent Code processes the type Map<Integer, String>
         */
        let ci = tn.typeNode.resolvedType; // in example: Map
        if (ci == null || !(ci instanceof Interface || ci instanceof Klass)) { // There had been an error... (in example: Map has not been resolved)
            tn.typeNode.genericParameterTypes = null;
            return false; // => exit gracefully
        }
        if (!ci.typeVariablesReady)
            return false;
        let parameterTypes = [];
        for (let i = 0; i < tn.typeNode.genericParameterTypes.length; i++) {
            let genericParameterType = tn.typeNode.genericParameterTypes[i];
            let resolvedType = genericParameterType.resolvedType;
            if (resolvedType == null) {
                return false;
            }
            if (genericParameterType.genericParameterTypes != null && genericParameterType.genericParameterTypesResolved == null) {
                return false; // first resolve this type!
            }
            if (!(resolvedType instanceof Interface || resolvedType instanceof Klass)) {
                tn.module.errors[2].push({
                    position: genericParameterType.position,
                    text: "Hier wird ein Interface- oder Klassentyp erwartet. Der Typ " + genericParameterType.identifier + " ist aber keiner.",
                    level: "error"
                });
                tn.typeNode.genericParameterTypes = null;
                return true; // => exit gracefully
            }
            parameterTypes.push(genericParameterType.resolvedType);
        }
        let typeVariablesOldToNewMap = new Map();
        if (ci.typeVariables.length != parameterTypes.length) {
            tn.module.errors[2].push({
                position: tn.typeNode.position,
                text: (ci instanceof Klass ? "Die Klasse " : "Das Interface ") + ci.identifier + " hat " + ci.typeVariables.length + " Typparameter, hier sind aber " + parameterTypes.length + " angegeben.",
                level: "error"
            });
            tn.typeNode.genericParameterTypes = null;
            return true; // => exit gracefully
        }
        let i = 0;
        for (let type of parameterTypes) {
            let oldTypeVariable = ci.typeVariables[i];
            if (type instanceof Interface) {
                let type1 = objectType.clone();
                type1.implements.push(type);
                type = type1;
            }
            let newTypeVariable = {
                identifier: oldTypeVariable.identifier,
                scopeFrom: oldTypeVariable.scopeFrom,
                scopeTo: oldTypeVariable.scopeTo,
                type: type
            };
            typeVariablesOldToNewMap.set(ci.typeVariables[i].type, newTypeVariable.type);
            i++;
        }
        let newCi = this.propagateTypeParameterToBaseClassesAndImplementedInterfaces(ci, typeVariablesOldToNewMap);
        tn.typeNode.resolvedType = newCi;
        tn.typeNode.genericParameterTypesResolved = true;
        return true;
    }
    propagateTypeParameterToBaseClassesAndImplementedInterfaces(classOrInterface, typeVariablesOldToNewMap) {
        if (classOrInterface instanceof Klass) {
            let newClass = classOrInterface.clone();
            newClass.typeVariables = [];
            for (let tv of classOrInterface.typeVariables) {
                let newType = typeVariablesOldToNewMap.get(tv.type);
                let tv1 = tv;
                if (newType != null) {
                    tv1 = {
                        identifier: tv.identifier,
                        scopeFrom: tv.scopeFrom,
                        scopeTo: tv.scopeTo,
                        type: newType
                    };
                }
                newClass.typeVariables.push(tv1);
            }
            let baseKlass = classOrInterface.baseClass;
            if (baseKlass != null && baseKlass.isGenericVariantFrom != null) {
                newClass.setBaseClass(this.propagateTypeParameterToBaseClassesAndImplementedInterfaces(baseKlass, typeVariablesOldToNewMap));
            }
            newClass.implements = [];
            for (let impl of classOrInterface.implements) {
                if (impl.isGenericVariantFrom == null) {
                    newClass.implements.push(impl);
                }
                else {
                    newClass.implements.push(this.propagateTypeParameterToBaseClassesAndImplementedInterfaces(impl, typeVariablesOldToNewMap));
                }
            }
            return newClass;
        }
        else {
            let newInterface = classOrInterface.clone();
            newInterface.typeVariables = [];
            for (let tv of classOrInterface.typeVariables) {
                let newType = typeVariablesOldToNewMap.get(tv.type);
                let tv1 = tv;
                if (newType != null) {
                    tv1 = {
                        identifier: tv.identifier,
                        scopeFrom: tv.scopeFrom,
                        scopeTo: tv.scopeTo,
                        type: newType
                    };
                }
                newInterface.typeVariables.push(tv1);
            }
            newInterface.extends = [];
            for (let impl of classOrInterface.extends) {
                if (impl.isGenericVariantFrom == null) {
                    newInterface.extends.push(impl);
                }
                else {
                    newInterface.extends.push(this.propagateTypeParameterToBaseClassesAndImplementedInterfaces(impl, typeVariablesOldToNewMap));
                }
            }
            return newInterface;
        }
    }
    checkDoubleIdentifierDefinition() {
        let identifierModuleMap = new Map();
        for (let module of this.moduleStore.getModules(false)) {
            for (let type of module.typeStore.typeList) {
                let otherModule = identifierModuleMap.get(type.identifier);
                if (otherModule != null) {
                    module.errors[1].push({
                        text: "Der Typbezeichner " + type.identifier + " wurde mehrfach definiert, nämlich in den Modulen " +
                            module.file.name + " und " + otherModule.file.name + ".",
                        position: type.declaration.position,
                        level: "error"
                    });
                    let otherType = otherModule.typeStore.getType(type.identifier);
                    if (otherType != null) {
                        otherModule.errors[1].push({
                            text: "Der Typbezeichner " + type.identifier + " wurde mehrfach definiert, nämlich in den Modulen " +
                                otherModule.file.name + " und " + module.file.name + ".",
                            position: otherType.declaration.position,
                            level: "error"
                        });
                    }
                }
                else {
                    identifierModuleMap.set(type.identifier, module);
                }
            }
        }
        let baseModule = this.moduleStore.getBaseModule();
        for (let tp of this.typeParameterList) {
            let module = tp.ci.module;
            let otherModule = identifierModuleMap.get(tp.tpn.identifier);
            if (otherModule == null) {
                let systemType = baseModule.typeStore.getType(tp.tpn.identifier);
                if (systemType != null)
                    otherModule = baseModule;
            }
            if (otherModule != null) {
                module.errors[1].push({
                    text: "Der Typbezeichner " + tp.tpn.identifier + " wurde mehrfach definiert, nämlich in den Modulen " +
                        module.file.name + " und " + otherModule.file.name + ".",
                    position: tp.tpn.position,
                    level: "error"
                });
                let otherType = otherModule.typeStore.getType(tp.tpn.identifier);
                if (otherType != null && otherModule != baseModule) {
                    otherModule.errors[1].push({
                        text: "Der Typbezeichner " + tp.tpn.identifier + " wurde mehrfach definiert, nämlich in den Modulen " +
                            otherModule.file.name + " und " + module.file.name + ".",
                        position: otherType.declaration.position,
                        level: "error"
                    });
                }
            }
        }
    }
    resolveUnresolvedTypes(lastPass) {
        for (let module of this.moduleStore.getModules(false)) {
            module.dependsOnModules = new Map();
        }
        for (let module of this.moduleStore.getModules(false)) {
            let ut = this.unresolvedTypes.get(module);
            let utNew = [];
            for (let type of ut) {
                if (!this.resolveType(type, module, lastPass)) {
                    utNew.push(type);
                }
            }
            this.unresolvedTypes.set(module, utNew);
        }
    }
    addFromJsonMethod(klass) {
        let interpreter = this.main.getInterpreter();
        klass.addMethod(new Method("fromJson", new Parameterlist([
            { identifier: "jsonString", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), klass, (parameters) => {
            let json = parameters[1].value;
            return new JsonTool().fromJson(json, klass, this.moduleStore, interpreter);
        }, false, true, `Konvertiert eine Json-Zeichenkette in ein ${klass.identifier}-Objekt ("deserialisieren"). Vor dem Deserialisieren eines Objekts werden die Attributinitialisierer angewandt und - falls vorhanden - ein parameterloser Konstruktor ausgeführt. Der Algorithmus kommt auch mit zyklischen Objektreferenzen zurecht.`, false));
    }
    addToJsonMethod(klass) {
        klass.addMethod(new Method("toJson", new Parameterlist([]), stringPrimitiveType, (parameters) => {
            return new JsonTool().toJson(parameters[0]);
        }, false, false, `Konvertiert ein Objekt (rekursiv mitsamt referenzierter Objekte) in eine Json-Zeichenkette. Nicht konvertiert werden Systemklassen (außer: ArrayList) sowie mit dem Schlüsselwort transient ausgezeichnete Attribute.`));
    }
    setupMethodsAndAttributes() {
        let classesOrEnums = [];
        classesOrEnums = classesOrEnums.concat(this.classes);
        classesOrEnums = classesOrEnums.concat(this.enums);
        for (let cn of classesOrEnums) {
            for (let mn of cn.methods) {
                let m = this.setupMethod(mn, cn.resolvedType.module, cn.resolvedType);
                if (m != null) {
                    if (mn.commentBefore != null)
                        m.documentation = "" + mn.commentBefore.value;
                    cn.resolvedType.addMethod(m);
                }
            }
            this.addFromJsonMethod(cn.resolvedType);
            this.addToJsonMethod(cn.resolvedType);
            for (let att of cn.attributes) {
                this.resolveType(att.attributeType, cn.resolvedType.module, true);
                let type = att.attributeType.resolvedType;
                if (type == null) {
                    continue;
                }
                let attribute = new Attribute(att.identifier, type, null, att.isStatic, att.visibility, att.isFinal);
                att.resolvedType = attribute;
                if (att.commentBefore != null)
                    attribute.documentation = "" + att.commentBefore.value;
                attribute.annotation = att.annotation;
                attribute.isTransient = att.isTransient;
                if (cn.resolvedType.attributeMap.get(attribute.identifier) != null) {
                    cn.resolvedType.module.errors[2].push({
                        text: "Es darf nicht mehrere Attribute mit demselben Bezeichner '" + attribute.identifier + "' in derselben Klassse geben.",
                        position: att.position, level: "error"
                    });
                }
                cn.resolvedType.addAttribute(attribute);
                this.pushUsagePosition(cn.resolvedType.module, att.position, attribute);
                attribute.declaration = { module: cn.resolvedType.module, position: att.position };
            }
        }
        for (let ic of this.interfaces) {
            for (let mn of ic.methods) {
                let m1 = this.setupMethod(mn, ic.resolvedType.module, ic.resolvedType);
                if (m1 != null) {
                    ic.resolvedType.addMethod(m1);
                }
            }
        }
    }
    setupMethod(mn, m, c) {
        let typesOK = true;
        typesOK = typesOK && this.resolveType(mn.returnType, m, true);
        let parameters = [];
        for (let par of mn.parameters) {
            typesOK = typesOK && this.resolveType(par.parameterType, m, true);
            if (typesOK) {
                let parameter = {
                    definition: par.position,
                    identifier: par.identifier,
                    usagePositions: new Map(),
                    type: par.parameterType.resolvedType,
                    declaration: { module: m, position: par.position },
                    isFinal: par.isFinal,
                    isEllipsis: par.isEllipsis
                };
                parameters.push(parameter);
                this.pushUsagePosition(m, par.position, parameter);
            }
        }
        let pl = new Parameterlist(parameters);
        if (typesOK) {
            let method = new Method(mn.identifier, pl, mn.returnType.resolvedType, null, mn.isAbstract, mn.isStatic);
            method.isConstructor = mn.identifier == c.identifier;
            method.visibility = mn.visibility;
            method.isConstructor = mn.isConstructor;
            mn.resolvedType = method;
            method.annotation = mn.annotation;
            this.pushUsagePosition(m, mn.position, method);
            method.declaration = {
                module: m,
                position: mn.position
            };
            return method;
        }
        return null;
    }
    pushUsagePosition(m, position, element) {
        m.addIdentifierPosition(position, element);
        if (element instanceof PrimitiveType) {
            return;
        }
        let positionList = element.usagePositions.get(m);
        if (positionList == null) {
            positionList = [];
            element.usagePositions.set(m, positionList);
        }
        positionList.push(position);
    }
    resolveType(tn, m, lastPass) {
        if (tn.resolvedType == null) {
            let typeModule = this.moduleStore.getType(tn.identifier);
            if (typeModule != null) {
                let type = typeModule.type;
                m.dependsOnModules.set(typeModule.module, true);
                this.pushUsagePosition(m, tn.position, type);
                type = getArrayType(type, tn.arrayDimension);
                this.registerGenericType(tn, m, false);
                tn.resolvedType = type;
                return true;
            }
            let typeParameterList = this.moduleToTypeParameterListMap.get(m);
            if (typeParameterList != null) {
                for (let tg of typeParameterList) {
                    if (tg.identifier == tn.identifier) {
                        let position = tn.position;
                        if (position.line > tg.scopeFrom.line || position.line == tg.scopeFrom.line && position.column >= tg.scopeFrom.column) {
                            if (position.line < tg.scopeTo.line || position.line == tg.scopeTo.line && position.column <= tg.scopeTo.column) {
                                this.pushUsagePosition(m, tn.position, tg.type);
                                tn.resolvedType = tg.type;
                                return true;
                            }
                        }
                    }
                }
            }
            if (lastPass) {
                let typKlasse = (tn.identifier.length > 0 && tn.identifier[0].toUpperCase() == tn.identifier[0]) ? "Die Klasse" : "Der Typ";
                m.errors[2].push({
                    position: tn.position,
                    text: typKlasse + " " + tn.identifier + " konnte nicht gefunden werden." +
                        (tn.identifier == "string" ? " Meinten Sie String (großgeschrieben)?" : ""),
                    level: "error",
                    quickFix: (tn.identifier == "string") ? {
                        title: "String groß schreiben",
                        editsProvider: (uri) => {
                            return [
                                {
                                    resource: uri,
                                    edit: {
                                        range: { startLineNumber: tn.position.line, startColumn: tn.position.column - 1, endLineNumber: tn.position.line, endColumn: tn.position.column + 6 },
                                        text: "String"
                                    }
                                }
                            ];
                        }
                    } : null
                });
            }
            tn.resolvedType = null;
            return false;
        }
        return true;
    }
    resolveExtendsImplements() {
        for (let cn of this.classes) {
            let c = cn.resolvedType;
            for (let iNode of cn.implements) {
                this.resolveType(iNode, c.module, true);
                let iType = iNode.resolvedType;
                if (iType == null) {
                    continue;
                }
                if (!(iType instanceof Interface)) {
                    c.module.errors[2].push({
                        position: iNode.position,
                        text: "Der Typ " + iNode.identifier + " ist kein interface, darf also nicht bei implements... stehen.",
                        level: "error"
                    });
                    continue;
                }
                c.implements.push(iType);
                iNode.resolvedType = iType;
            }
            if (cn.extends != null) {
                this.resolveType(cn.extends, c.module, true);
                let eType = cn.extends.resolvedType;
                if (eType == null || !(eType instanceof Klass)) {
                    c.module.errors[2].push({
                        position: cn.extends.position,
                        text: "Der Typ " + cn.extends.identifier + " ist keine Klasse, darf also nicht hinter extends stehen.",
                        level: "error"
                    });
                    continue;
                }
                c.setBaseClass(eType);
                cn.extends.resolvedType = eType;
            }
            else {
                c.setBaseClass(this.moduleStore.getType("Object").type);
            }
        }
        for (let interf of this.interfaces) {
            let c = interf.resolvedType;
            for (let iNode of interf.extends) {
                this.resolveType(iNode, c.module, true);
                let iType = iNode.resolvedType;
                if (iType == null) {
                    continue;
                }
                if (!(iType instanceof Interface)) {
                    c.module.errors[2].push({
                        position: iNode.position,
                        text: "Der Typ " + iNode.identifier + " ist kein interface, darf also nicht bei extends... stehen.",
                        level: "error"
                    });
                    continue;
                }
                c.extends.push(iType);
                iNode.resolvedType = iType;
            }
        }
    }
    setupClassesAndInterfaces() {
        for (let m of this.moduleStore.getModules(false)) {
            if (m.classDefinitionsAST != null) {
                for (let cdn of m.classDefinitionsAST) {
                    switch (cdn.type) {
                        case TokenType.keywordClass:
                            this.classes.push(cdn);
                            let c = new Klass(cdn.identifier, m);
                            if (cdn.commentBefore != null)
                                c.documentation = "" + cdn.commentBefore.value;
                            cdn.resolvedType = c;
                            c.visibility = cdn.visibility;
                            c.isAbstract = cdn.isAbstract;
                            m.typeStore.addType(c);
                            this.pushUsagePosition(m, cdn.position, c);
                            c.declaration = { module: m, position: cdn.position };
                            this.registerTypeVariables(cdn, c);
                            if (cdn.extends != null)
                                this.registerGenericType(cdn.extends, m, true);
                            if (cdn.implements != null) {
                                for (let im of cdn.implements)
                                    this.registerGenericType(im, m, true);
                            }
                            break;
                        case TokenType.keywordEnum:
                            this.enums.push(cdn);
                            let e = new Enum(cdn.identifier, m, cdn.values);
                            if (cdn.commentBefore != null)
                                e.documentation = "" + cdn.commentBefore.value;
                            cdn.resolvedType = e;
                            e.visibility = cdn.visibility;
                            m.typeStore.addType(e);
                            this.pushUsagePosition(m, cdn.position, e);
                            e.declaration = { module: m, position: cdn.position };
                            break;
                        case TokenType.keywordInterface:
                            this.interfaces.push(cdn);
                            let i = new Interface(cdn.identifier, m);
                            if (cdn.commentBefore != null)
                                i.documentation = "" + cdn.commentBefore.value;
                            cdn.resolvedType = i;
                            m.typeStore.addType(i);
                            this.pushUsagePosition(m, cdn.position, i);
                            i.declaration = { module: m, position: cdn.position };
                            this.registerTypeVariables(cdn, i);
                            if (cdn.extends != null) {
                                for (let im of cdn.extends)
                                    this.registerGenericType(im, m, true);
                            }
                            break;
                    }
                }
            }
        }
    }
    resolveTypeVariables() {
        let todoList = this.typeParameterList.slice(0);
        let done = false;
        let unresolvedGenericTypes = this.genericTypesInClassDefinitions.slice(0);
        while (!done) {
            this.resolveUnresolvedTypes(false);
            unresolvedGenericTypes = this.resolveGenericTypes(unresolvedGenericTypes);
            done = true;
            for (let i = 0; i < todoList.length; i++) {
                let tv = todoList[i];
                let ready = true;
                let ext = tv.tpn.extends == null ? [] : [tv.tpn.extends];
                if (tv.tpn.implements != null)
                    ext = ext.concat(tv.tpn.implements);
                for (let extType of ext) {
                    if (extType.genericParameterTypes != null && !(extType.genericParameterTypesResolved == true)) {
                        ready = false;
                    }
                }
                if (ready) {
                    this.resolveTypeVariable(tv);
                    todoList.splice(todoList.indexOf(tv), 1);
                    i--;
                    done = false;
                }
            }
        }
        return unresolvedGenericTypes;
    }
    resolveTypeVariable(tp) {
        let typeParameterKlass;
        if (tp.tpn.extends != null && tp.tpn.extends.resolvedType != null) {
            typeParameterKlass = tp.tpn.extends.resolvedType.clone();
        }
        else {
            typeParameterKlass = objectType.clone();
        }
        typeParameterKlass.identifier = tp.tpn.identifier;
        typeParameterKlass.isTypeVariable = true;
        typeParameterKlass.declaration = {
            module: tp.ci.module,
            position: tp.tpn.position
        };
        if (tp.tpn.implements != null) {
            for (let impl of tp.tpn.implements) {
                if (typeParameterKlass.implements.indexOf(impl.resolvedType) < 0) {
                    typeParameterKlass.implements.push(impl.resolvedType);
                }
            }
        }
        let tp1 = {
            identifier: tp.tpn.identifier,
            type: typeParameterKlass,
            scopeFrom: tp.cdn.position,
            scopeTo: tp.cdn.scopeTo
        };
        tp.ci.typeVariables[tp.index] = tp1;
        tp.ci.typeVariablesReady = true;
        for (let tv of tp.ci.typeVariables)
            if (tv == null)
                tp.ci.typeVariablesReady = false;
        let typeParameterList = this.moduleToTypeParameterListMap.get(tp.ci.module);
        if (typeParameterList == null) {
            typeParameterList = [];
            this.moduleToTypeParameterListMap.set(tp.ci.module, typeParameterList);
        }
        typeParameterList.push(tp1);
        this.pushUsagePosition(tp.ci.module, tp.tpn.position, typeParameterKlass);
    }
    registerTypeVariables(cdn, classOrInterface) {
        let index = 0;
        for (let typeParameter of cdn.typeParameters) {
            if (typeParameter.extends != null)
                this.registerGenericType(typeParameter.extends, classOrInterface.module, true);
            if (typeParameter.implements != null) {
                for (let im of typeParameter.implements) {
                    this.registerGenericType(im, classOrInterface.module, true);
                }
            }
            classOrInterface.typeVariablesReady = false;
            classOrInterface.typeVariables.push(null); // leave room
            this.typeParameterList.push({
                tpn: typeParameter, tp: {
                    identifier: typeParameter.identifier,
                    type: null,
                    scopeFrom: cdn.position,
                    scopeTo: cdn.scopeTo
                }, ci: classOrInterface, cdn: cdn,
                index: index++
            });
        }
    }
    resolveTypesInModules() {
        for (let m of this.moduleStore.getModules(false)) {
            let ut = [];
            this.unresolvedTypes.set(m, ut);
            for (let tn of m.typeNodes) {
                if (tn.resolvedType == null) {
                    let typeModule = this.moduleStore.getType(tn.identifier);
                    if (typeModule != null) {
                        let type = typeModule.type;
                        this.pushUsagePosition(m, tn.position, type);
                        tn.resolvedType = getArrayType(type, tn.arrayDimension);
                        this.registerGenericType(tn, m, false);
                    }
                    else {
                        ut.push(tn);
                    }
                }
            }
        }
    }
    registerGenericType(typeNode, module, isInClassDefinition) {
        if (typeNode.genericParameterTypes != null) {
            if (isInClassDefinition) {
                this.genericTypesInClassDefinitions.push({ typeNode: typeNode, module: module });
            }
            else {
                this.genericTypes.push({ typeNode: typeNode, module: module });
            }
        }
        else {
            // new ArrayList<>() (without type Parameters!) should be castable to ANY other type with same name regarldess of it's type variable types (Java 7-style!)
            let type = typeNode.resolvedType;
            if (type != null && type instanceof Klass && type.typeVariables.length > 0) {
                let type1 = type.clone();
                type1.typeVariables = []; // now this type can cast to ANY other type with same name regardless of it's type variable types!
                typeNode.resolvedType = type1;
            }
        }
    }
}
TypeResolver.WATCHDOG = 5;
export function getArrayType(type, arrayDimension) {
    while (arrayDimension > 0) {
        type = new ArrayType(type);
        arrayDimension--;
    }
    return type;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHlwZVJlc29sdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9jb21waWxlci9wYXJzZXIvVHlwZVJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQWdCLE1BQU0sbUJBQW1CLENBQUM7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFnQixNQUFNLG1CQUFtQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBa0IsYUFBYSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFHcEcsT0FBTyxFQUE2RixtQkFBbUIsRUFBcUIsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDM0wsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQWFqRCw4Q0FBOEM7QUFDOUMsTUFBTSxPQUFPLFlBQVk7SUFrQnJCLFlBQW9CLElBQWM7UUFBZCxTQUFJLEdBQUosSUFBSSxDQUFVO1FBVGxDLGlDQUE0QixHQUFnQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBSXRFLGlCQUFZLEdBQW9CLEVBQUUsQ0FBQztRQUNuQyxtQ0FBOEIsR0FBb0IsRUFBRSxDQUFDO1FBRXJELHNCQUFpQixHQUF3QixFQUFFLENBQUM7SUFJNUMsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUF3QjtRQUUxQixJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNsQixJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFFakMsSUFB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QUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQzthQUNwRjtpQkFBTTtnQkFDSCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7YUFDbEU7U0FDSjthQUFNO1lBQ0gsMEpBQTBKO1lBQzFKLElBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUM7WUFDakMsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksWUFBWSxLQUFLLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUN4RSxJQUFJLEtBQUssR0FBVSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2hDLEtBQUssQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDLENBQUMsa0dBQWtHO2dCQUM1SCxRQUFRLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQzthQUNqQztTQUNKO0lBQ0wsQ0FBQzs7QUEvK0JNLHFCQUFRLEdBQVcsQ0FBQyxDQUFDO0FBbS9CaEMsTUFBTSxVQUFVLFlBQVksQ0FBQyxJQUFVLEVBQUUsY0FBc0I7SUFDM0QsT0FBTyxjQUFjLEdBQUcsQ0FBQyxFQUFFO1FBQ3ZCLElBQUksR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixjQUFjLEVBQUUsQ0FBQztLQUNwQjtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb2tlblR5cGUsIFRleHRQb3NpdGlvbiB9IGZyb20gXCIuLi9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheVR5cGUgfSBmcm9tIFwiLi4vdHlwZXMvQXJyYXkuanNcIjtcclxuaW1wb3J0IHsgS2xhc3MsIEludGVyZmFjZSwgVHlwZVZhcmlhYmxlIH0gZnJvbSBcIi4uL3R5cGVzL0NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IEF0dHJpYnV0ZSwgTWV0aG9kLCBQYXJhbWV0ZXJsaXN0LCBUeXBlLCBWYXJpYWJsZSwgUHJpbWl0aXZlVHlwZSB9IGZyb20gXCIuLi90eXBlcy9UeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBDbGFzc0RlY2xhcmF0aW9uTm9kZSwgSW50ZXJmYWNlRGVjbGFyYXRpb25Ob2RlLCBNZXRob2REZWNsYXJhdGlvbk5vZGUsIFR5cGVOb2RlLCBFbnVtRGVjbGFyYXRpb25Ob2RlLCBUeXBlUGFyYW1ldGVyTm9kZSB9IGZyb20gXCIuL0FTVC5qc1wiO1xyXG5pbXBvcnQgeyBNb2R1bGUsIE1vZHVsZVN0b3JlIH0gZnJvbSBcIi4vTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IG51bGxUeXBlLCBpbnRQcmltaXRpdmVUeXBlLCBib29sZWFuUHJpbWl0aXZlVHlwZSwgZmxvYXRQcmltaXRpdmVUeXBlLCBkb3VibGVQcmltaXRpdmVUeXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlLCBjaGFyUHJpbWl0aXZlVHlwZSwgb2JqZWN0VHlwZSB9IGZyb20gXCIuLi90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBFbnVtIH0gZnJvbSBcIi4uL3R5cGVzL0VudW0uanNcIjtcclxuaW1wb3J0IHsgSnNvblRvb2wgfSBmcm9tIFwiLi4vdHlwZXMvVHlwZVRvb2xzLmpzXCI7XHJcbmltcG9ydCB7IE1haW5CYXNlIH0gZnJvbSBcIi4uLy4uL21haW4vTWFpbkJhc2UuanNcIjtcclxuXHJcbnR5cGUgR2VuZXJpY1R5cGVMaXN0ID0geyB0eXBlTm9kZTogVHlwZU5vZGUsIG1vZHVsZTogTW9kdWxlIH1bXTtcclxuXHJcbnR5cGUgVHlwZVBhcmFtZXRlckluZm8gPSB7XHJcbiAgICB0cG46IFR5cGVQYXJhbWV0ZXJOb2RlO1xyXG4gICAgdHA6IFR5cGVWYXJpYWJsZTtcclxuICAgIGNpOiBLbGFzcyB8IEludGVyZmFjZTtcclxuICAgIGNkbjogQ2xhc3NEZWNsYXJhdGlvbk5vZGUgfCBJbnRlcmZhY2VEZWNsYXJhdGlvbk5vZGU7XHJcbiAgICBpbmRleDogbnVtYmVyXHJcbn07XHJcblxyXG4vLyBUT0RPOiBmaW5kIGN5Y2xpYyByZWZlcmVuY2VzIGluIGV4dGVuZHMgLi4uXHJcbmV4cG9ydCBjbGFzcyBUeXBlUmVzb2x2ZXIge1xyXG5cclxuICAgIHN0YXRpYyBXQVRDSERPRzogbnVtYmVyID0gNTtcclxuICAgIG1vZHVsZVN0b3JlOiBNb2R1bGVTdG9yZTtcclxuXHJcbiAgICBjbGFzc2VzOiBDbGFzc0RlY2xhcmF0aW9uTm9kZVtdO1xyXG4gICAgaW50ZXJmYWNlczogSW50ZXJmYWNlRGVjbGFyYXRpb25Ob2RlW107XHJcbiAgICBlbnVtczogRW51bURlY2xhcmF0aW9uTm9kZVtdO1xyXG5cclxuICAgIG1vZHVsZVRvVHlwZVBhcmFtZXRlckxpc3RNYXA6IE1hcDxNb2R1bGUsIFR5cGVWYXJpYWJsZVtdPiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICB1bnJlc29sdmVkVHlwZXM6IE1hcDxNb2R1bGUsIFR5cGVOb2RlW10+O1xyXG5cclxuICAgIGdlbmVyaWNUeXBlczogR2VuZXJpY1R5cGVMaXN0ID0gW107XHJcbiAgICBnZW5lcmljVHlwZXNJbkNsYXNzRGVmaW5pdGlvbnM6IEdlbmVyaWNUeXBlTGlzdCA9IFtdO1xyXG5cclxuICAgIHR5cGVQYXJhbWV0ZXJMaXN0OiBUeXBlUGFyYW1ldGVySW5mb1tdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBtYWluOiBNYWluQmFzZSkge1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzdGFydChtb2R1bGVTdG9yZTogTW9kdWxlU3RvcmUpIHtcclxuXHJcbiAgICAgICAgdGhpcy5jbGFzc2VzID0gW107XHJcbiAgICAgICAgdGhpcy5pbnRlcmZhY2VzID0gW107XHJcbiAgICAgICAgdGhpcy5lbnVtcyA9IFtdO1xyXG4gICAgICAgIHRoaXMudW5yZXNvbHZlZFR5cGVzID0gbmV3IE1hcCgpO1xyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZVN0b3JlID0gbW9kdWxlU3RvcmU7XHJcblxyXG4gICAgICAgIHRoaXMucmVzb2x2ZVR5cGVzSW5Nb2R1bGVzKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0dXBDbGFzc2VzQW5kSW50ZXJmYWNlcygpO1xyXG5cclxuICAgICAgICBsZXQgdW5yZXNvbHZlZEdlbmVyaWNUeXBlc0luQ2xhc3NlcyA9IHRoaXMucmVzb2x2ZVR5cGVWYXJpYWJsZXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5yZXNvbHZlVW5yZXNvbHZlZFR5cGVzKGZhbHNlKTtcclxuXHJcbiAgICAgICAgdGhpcy5yZXNvbHZlR2VuZXJpY1R5cGVzKHVucmVzb2x2ZWRHZW5lcmljVHlwZXNJbkNsYXNzZXMpO1xyXG5cclxuICAgICAgICB0aGlzLnJlc29sdmVFeHRlbmRzSW1wbGVtZW50cygpO1xyXG5cclxuICAgICAgICBsZXQgdW5yZXNvbHZlZEdlbmVyaWNUeXBlcyA9IHRoaXMucmVzb2x2ZUdlbmVyaWNUeXBlcyh0aGlzLmdlbmVyaWNUeXBlcyk7XHJcblxyXG4gICAgICAgIHRoaXMucmVzb2x2ZVVucmVzb2x2ZWRUeXBlcyh0cnVlKTtcclxuXHJcbiAgICAgICAgdGhpcy5yZXNvbHZlR2VuZXJpY1R5cGVzKHVucmVzb2x2ZWRHZW5lcmljVHlwZXMpO1xyXG5cclxuICAgICAgICB0aGlzLnNldHVwTWV0aG9kc0FuZEF0dHJpYnV0ZXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5jaGVja0RvdWJsZUlkZW50aWZpZXJEZWZpbml0aW9uKCk7XHJcblxyXG4gICAgICAgIHRoaXMuY2hlY2tHZW5lcmljVHlwZXNBZ2FpbnNUeXBlR3VhcmRzKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0dXBBdHRyaWJ1dGVJbmRpY2VzKCk7XHJcblxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBzZXR1cEF0dHJpYnV0ZUluZGljZXMoKSB7XHJcbiAgICAgICAgZm9yKGxldCBjbCBvZiB0aGlzLmNsYXNzZXMpe1xyXG4gICAgICAgICAgICBjbC5yZXNvbHZlZFR5cGUuc2V0dXBBdHRyaWJ1dGVJbmRpY2VzUmVjdXJzaXZlKCk7XHJcbiAgICAgICAgICAgIGlmKGNsLnJlc29sdmVkVHlwZS5zdGF0aWNDbGFzcyAhPSBudWxsKXtcclxuICAgICAgICAgICAgICAgIGNsLnJlc29sdmVkVHlwZS5zdGF0aWNDbGFzcy5zZXR1cEF0dHJpYnV0ZUluZGljZXNSZWN1cnNpdmUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IobGV0IGNsIG9mIHRoaXMuZW51bXMpe1xyXG4gICAgICAgICAgICBjbC5yZXNvbHZlZFR5cGUuc2V0dXBBdHRyaWJ1dGVJbmRpY2VzUmVjdXJzaXZlKCk7XHJcbiAgICAgICAgICAgIGlmKGNsLnJlc29sdmVkVHlwZS5zdGF0aWNDbGFzcyAhPSBudWxsKXtcclxuICAgICAgICAgICAgICAgIGNsLnJlc29sdmVkVHlwZS5zdGF0aWNDbGFzcy5zZXR1cEF0dHJpYnV0ZUluZGljZXNSZWN1cnNpdmUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgY2hlY2tHZW5lcmljVHlwZXNBZ2FpbnNUeXBlR3VhcmRzKCkge1xyXG5cclxuICAgICAgICBmb3IgKGxldCB0biBvZiB0aGlzLmdlbmVyaWNUeXBlcykge1xyXG4gICAgICAgICAgICBpZiAodG4udHlwZU5vZGUuZ2VuZXJpY1BhcmFtZXRlclR5cGVzID09IG51bGwpIGNvbnRpbnVlOyAvLyBFcnJvciBpbiByZXNvbHZlR2VuZXJpY1R5cGUgPT4gbm90aGluZyB0byBkby5cclxuXHJcbiAgICAgICAgICAgIGxldCBjaTogS2xhc3MgfCBJbnRlcmZhY2UgPSA8YW55PnRuLnR5cGVOb2RlLnJlc29sdmVkVHlwZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjaS5pc0dlbmVyaWNWYXJpYW50RnJvbSA9PSBudWxsKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjaS50eXBlVmFyaWFibGVzLmxlbmd0aCAhPSBjaS5pc0dlbmVyaWNWYXJpYW50RnJvbS50eXBlVmFyaWFibGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgdG4ubW9kdWxlLmVycm9yc1syXS5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdG4udHlwZU5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJEZXIgR2VuZXJpc2NoZSBUeXAgXCIgKyBjaS5pc0dlbmVyaWNWYXJpYW50RnJvbS5pZGVudGlmaWVyICsgXCIgaGF0IFwiICsgY2kuaXNHZW5lcmljVmFyaWFudEZyb20udHlwZVZhcmlhYmxlcy5sZW5ndGggKyBcIiBUeXBwYXJhbWV0ZXIuIEhpZXIgd3VyZGVuIGFiZXIgXCIgKyBjaS50eXBlVmFyaWFibGVzLmxlbmd0aCArIFwiIGFuZ2VnZWJlbi5cIixcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNpLnR5cGVWYXJpYWJsZXMubGVuZ3RoOyBpKyspIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgZXJyb3I6IHN0cmluZyA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGFjdHVhbFR5cGUgPSBjaS50eXBlVmFyaWFibGVzW2ldO1xyXG4gICAgICAgICAgICAgICAgbGV0IHR5cGVHdWFyZCA9IGNpLmlzR2VuZXJpY1ZhcmlhbnRGcm9tLnR5cGVWYXJpYWJsZXNbaV07XHJcbiAgICAgICAgICAgICAgICBsZXQgZ2VuZXJpY1BhcmFtZXRlclR5cGUgPSB0bi50eXBlTm9kZS5nZW5lcmljUGFyYW1ldGVyVHlwZXNbaV07XHJcbiAgICAgICAgICAgICAgICBhY3R1YWxUeXBlLnNjb3BlRnJvbSA9IHR5cGVHdWFyZC5zY29wZUZyb207XHJcbiAgICAgICAgICAgICAgICBhY3R1YWxUeXBlLnNjb3BlVG8gPSB0eXBlR3VhcmQuc2NvcGVUbztcclxuICAgICAgICAgICAgICAgIGFjdHVhbFR5cGUuaWRlbnRpZmllciA9IHR5cGVHdWFyZC5pZGVudGlmaWVyO1xyXG5cclxuICAgICAgICAgICAgICAgIGVycm9yID0gXCJcIjtcclxuICAgICAgICAgICAgICAgIGlmICghYWN0dWFsVHlwZS50eXBlLmhhc0FuY2VzdG9yT3JJcyh0eXBlR3VhcmQudHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvciArPSBcIkRpZSBLbGFzc2UgXCIgKyBhY3R1YWxUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIGlzdCBrZWluZSBVbnRlcmtsYXNzZSB2b24gXCIgKyB0eXBlR3VhcmQudHlwZS5pZGVudGlmaWVyICsgXCIgdW5kIHBhc3MgZGFtaXQgbmljaHQgenVtIFR5cHBhcmFtdGVyIFwiICsgdHlwZUd1YXJkLmlkZW50aWZpZXIgKyBcIiBkZXIgS2xhc3NlIFwiICsgY2kuaXNHZW5lcmljVmFyaWFudEZyb20uaWRlbnRpZmllciArIFwiLiBcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaWZMaXN0OiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgdGdJbnRlcmZhY2Ugb2YgdHlwZUd1YXJkLnR5cGUuaW1wbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghYWN0dWFsVHlwZS50eXBlLmltcGxlbWVudHNJbnRlcmZhY2UodGdJbnRlcmZhY2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmTGlzdC5wdXNoKHRnSW50ZXJmYWNlLmlkZW50aWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaWZMaXN0Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvciArPSBcIkRpZSBLbGFzc2UgXCIgKyBhY3R1YWxUeXBlLmlkZW50aWZpZXIgKyBcIiBpbXBsZW1lbnRpZXJ0IG5pY2h0IGRpZSBJbnRlcmZhY2VzIFwiICsgaWZMaXN0LmpvaW4oXCIsIFwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IgIT0gXCJcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRuLm1vZHVsZS5lcnJvcnNbMl0ucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBnZW5lcmljUGFyYW1ldGVyVHlwZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJEZXIgYW5nZWdlYmVuZSBXZXJ0IGRlcyBUeXBwYXJhbWV0ZXJzIHBhc3N0IG5pY2h0IHp1ciBEZWZpbml0aW9uOiBcIiArIGVycm9yLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkanVzdE1ldGhvZHNBbmRBdHRyaWJ1dGVzVG9UeXBlUGFyYW1ldGVycyhjaSwgVHlwZVJlc29sdmVyLldBVENIRE9HKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBhZGp1c3RNZXRob2RzQW5kQXR0cmlidXRlc1RvVHlwZVBhcmFtZXRlcnMoY2xhc3NPckludGVyZmFjZTogS2xhc3MgfCBJbnRlcmZhY2UsIHdhdGNoZG9nOiBudW1iZXIpIHtcclxuXHJcbiAgICAgICAgaWYod2F0Y2hkb2cgPD0gMCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAoY2xhc3NPckludGVyZmFjZSAhPSBudWxsICYmIGNsYXNzT3JJbnRlcmZhY2UuaXNHZW5lcmljVmFyaWFudEZyb20gIT0gbnVsbCAmJiBjbGFzc09ySW50ZXJmYWNlLnR5cGVWYXJpYWJsZXMubGVuZ3RoICE9IDApIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBtZXRob2RMaXN0QWx0ZXJlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICBsZXQgbmV3TWV0aG9kTGlzdDogTWV0aG9kW10gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbSBvZiBjbGFzc09ySW50ZXJmYWNlLm1ldGhvZHMpIHtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdNZXRob2QgPSB0aGlzLmdldEFkanVzdGVkTWV0aG9kKG0sIGNsYXNzT3JJbnRlcmZhY2UudHlwZVZhcmlhYmxlcywgd2F0Y2hkb2cgLSAxKTtcclxuICAgICAgICAgICAgICAgIG1ldGhvZExpc3RBbHRlcmVkID0gbWV0aG9kTGlzdEFsdGVyZWQgfHwgbmV3TWV0aG9kLmFsdGVyZWQ7XHJcbiAgICAgICAgICAgICAgICBuZXdNZXRob2RMaXN0LnB1c2gobmV3TWV0aG9kLm5ld01ldGhvZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChtZXRob2RMaXN0QWx0ZXJlZCkgY2xhc3NPckludGVyZmFjZS5tZXRob2RzID0gbmV3TWV0aG9kTGlzdDtcclxuXHJcbiAgICAgICAgICAgIGlmIChjbGFzc09ySW50ZXJmYWNlIGluc3RhbmNlb2YgS2xhc3MpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3QXR0cmlidXRlczogQXR0cmlidXRlW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdBdHRyaWJ1dGVNYXA6IE1hcDxzdHJpbmcsIEF0dHJpYnV0ZT4gPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgYXR0cmlidXRlc0FsdGVyZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgb2YgY2xhc3NPckludGVyZmFjZS5hdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0F0dHJpYnV0ZSA9IHRoaXMuZ2V0QWRqdXN0ZWRBdHRyaWJ1dGUoYXR0cmlidXRlLCBjbGFzc09ySW50ZXJmYWNlLnR5cGVWYXJpYWJsZXMsIHdhdGNoZG9nIC0gMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlc0FsdGVyZWQgPSBhdHRyaWJ1dGVzQWx0ZXJlZCB8fCBuZXdBdHRyaWJ1dGUuYWx0ZXJlZDtcclxuICAgICAgICAgICAgICAgICAgICBuZXdBdHRyaWJ1dGVzLnB1c2gobmV3QXR0cmlidXRlLm5ld0F0dHJpYnV0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3QXR0cmlidXRlTWFwLnNldChhdHRyaWJ1dGUuaWRlbnRpZmllciwgbmV3QXR0cmlidXRlLm5ld0F0dHJpYnV0ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXNBbHRlcmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NPckludGVyZmFjZS5hdHRyaWJ1dGVzID0gbmV3QXR0cmlidXRlcztcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc09ySW50ZXJmYWNlLmF0dHJpYnV0ZU1hcCA9IG5ld0F0dHJpYnV0ZU1hcDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkanVzdE1ldGhvZHNBbmRBdHRyaWJ1dGVzVG9UeXBlUGFyYW1ldGVycyhjbGFzc09ySW50ZXJmYWNlLmJhc2VDbGFzcywgd2F0Y2hkb2cgLSAxKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBmb3IgKGxldCBpbXBsIG9mIGNsYXNzT3JJbnRlcmZhY2UuaW1wbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIHRoaXMuYWRqdXN0TWV0aG9kc0FuZEF0dHJpYnV0ZXNUb1R5cGVQYXJhbWV0ZXJzKGltcGwpO1xyXG4gICAgICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZXh0IG9mIGNsYXNzT3JJbnRlcmZhY2UuZXh0ZW5kcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRqdXN0TWV0aG9kc0FuZEF0dHJpYnV0ZXNUb1R5cGVQYXJhbWV0ZXJzKGV4dCwgd2F0Y2hkb2cgLSAxKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0QWRqdXN0ZWRBdHRyaWJ1dGUoYXR0cmlidXRlOiBBdHRyaWJ1dGUsIHR5cGVWYXJpYWJsZXM6IFR5cGVWYXJpYWJsZVtdLCB3YXRjaGRvZzogbnVtYmVyKTogeyBhbHRlcmVkOiBib29sZWFuLCBuZXdBdHRyaWJ1dGU6IEF0dHJpYnV0ZSB9IHtcclxuXHJcbiAgICAgICAgbGV0IG50ID0gdGhpcy5nZXRBZGp1c3RlZFR5cGUoYXR0cmlidXRlLnR5cGUsIHR5cGVWYXJpYWJsZXMsIHRydWUsIHdhdGNoZG9nIC0gMSk7XHJcbiAgICAgICAgaWYgKG50LmFsdGVyZWQpIHtcclxuICAgICAgICAgICAgbGV0IGE6IEF0dHJpYnV0ZSA9IE9iamVjdC5jcmVhdGUoYXR0cmlidXRlKTtcclxuICAgICAgICAgICAgYS50eXBlID0gbnQubmV3VHlwZTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgYWx0ZXJlZDogdHJ1ZSwgbmV3QXR0cmlidXRlOiBhIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4geyBhbHRlcmVkOiBmYWxzZSwgbmV3QXR0cmlidXRlOiBhdHRyaWJ1dGUgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0QWRqdXN0ZWRNZXRob2QobWV0aG9kOiBNZXRob2QsIHR5cGVWYXJpYWJsZXM6IFR5cGVWYXJpYWJsZVtdLCB3YXRjaGRvZzogbnVtYmVyKTogeyBhbHRlcmVkOiBib29sZWFuLCBuZXdNZXRob2Q6IE1ldGhvZCB9IHtcclxuXHJcbiAgICAgICAgbGV0IG5ydCA9IHRoaXMuZ2V0QWRqdXN0ZWRUeXBlKG1ldGhvZC5yZXR1cm5UeXBlLCB0eXBlVmFyaWFibGVzLCB0cnVlLCB3YXRjaGRvZyAtIDEpO1xyXG5cclxuICAgICAgICBsZXQgcGFyYW1ldGVyQWx0ZXJlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBuZXdQYXJhbWV0ZXJzOiBWYXJpYWJsZVtdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgcCBvZiBtZXRob2QucGFyYW1ldGVybGlzdC5wYXJhbWV0ZXJzKSB7XHJcbiAgICAgICAgICAgIGxldCBudCA9IHRoaXMuZ2V0QWRqdXN0ZWRUeXBlKHAudHlwZSwgdHlwZVZhcmlhYmxlcywgZmFsc2UsIHdhdGNoZG9nIC0gMSk7XHJcbiAgICAgICAgICAgIGlmIChudC5hbHRlcmVkKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJBbHRlcmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBwTmV3OiBWYXJpYWJsZSA9IE9iamVjdC5jcmVhdGUocCk7XHJcbiAgICAgICAgICAgICAgICBwTmV3LnR5cGUgPSBudC5uZXdUeXBlO1xyXG4gICAgICAgICAgICAgICAgbmV3UGFyYW1ldGVycy5wdXNoKHBOZXcpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbmV3UGFyYW1ldGVycy5wdXNoKHApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobnJ0LmFsdGVyZWQgfHwgcGFyYW1ldGVyQWx0ZXJlZCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3TWV0aG9kOiBNZXRob2QgPSBPYmplY3QuY3JlYXRlKG1ldGhvZCk7XHJcbiAgICAgICAgICAgIGlmIChucnQuYWx0ZXJlZCkgbmV3TWV0aG9kLnJldHVyblR5cGUgPSBucnQubmV3VHlwZTtcclxuICAgICAgICAgICAgaWYgKHBhcmFtZXRlckFsdGVyZWQpIHtcclxuICAgICAgICAgICAgICAgIG5ld01ldGhvZC5wYXJhbWV0ZXJsaXN0ID0gbmV3IFBhcmFtZXRlcmxpc3QobmV3UGFyYW1ldGVycyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgYWx0ZXJlZDogdHJ1ZSwgbmV3TWV0aG9kOiBuZXdNZXRob2QgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IGFsdGVyZWQ6IGZhbHNlLCBuZXdNZXRob2Q6IG1ldGhvZCB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0QWRqdXN0ZWRUeXBlKHR5cGU6IFR5cGUsIHR5cGVWYXJpYWJsZXM6IFR5cGVWYXJpYWJsZVtdLCBhZGp1c3RNZXRob2RzQW5kQXR0cmlidXRlc1JlY3Vyc2l2ZTogYm9vbGVhbiwgd2F0Y2hkb2c6IG51bWJlcik6IHsgYWx0ZXJlZDogYm9vbGVhbiwgbmV3VHlwZTogVHlwZSB9IHtcclxuXHJcbiAgICAgICAgaWYgKHR5cGUgPT0gbnVsbCkgcmV0dXJuIHsgYWx0ZXJlZDogZmFsc2UsIG5ld1R5cGU6IHR5cGUgfTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVbXCJpc1R5cGVWYXJpYWJsZVwiXSA9PSB0cnVlKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHR2IG9mIHR5cGVWYXJpYWJsZXMpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0di5pZGVudGlmaWVyID09IHR5cGUuaWRlbnRpZmllcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IGFsdGVyZWQ6IHRydWUsIG5ld1R5cGU6IHR2LnR5cGUgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyBhbHRlcmVkOiBmYWxzZSwgbmV3VHlwZTogdHlwZSB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCh0eXBlIGluc3RhbmNlb2YgS2xhc3MgfHwgdHlwZSBpbnN0YW5jZW9mIEludGVyZmFjZSkgJiYgdHlwZS50eXBlVmFyaWFibGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgbGV0IG5ld1R5cGVWYXJpYWJsZXM6IFR5cGVWYXJpYWJsZVtdID0gW107XHJcbiAgICAgICAgICAgIGxldCBhbHRlcmVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHR2IG9mIHR5cGUudHlwZVZhcmlhYmxlcykge1xyXG4gICAgICAgICAgICAgICAgbGV0IG50ID0gdGhpcy5nZXRBZGp1c3RlZFR5cGUodHYudHlwZSwgdHlwZVZhcmlhYmxlcywgZmFsc2UsIHdhdGNoZG9nIC0gMSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobnQuYWx0ZXJlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R5cGVWYXJpYWJsZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IHR2LmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlRnJvbTogdHYuc2NvcGVGcm9tLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZVRvOiB0di5zY29wZVRvLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiA8S2xhc3M+bnQubmV3VHlwZVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgYWx0ZXJlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R5cGVWYXJpYWJsZXMucHVzaCh0dik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGFsdGVyZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdDbGFzc0ludGVyZmFjZSA9IHR5cGUuY2xvbmUoKTtcclxuICAgICAgICAgICAgICAgIG5ld0NsYXNzSW50ZXJmYWNlLnR5cGVWYXJpYWJsZXMgPSBuZXdUeXBlVmFyaWFibGVzO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFkanVzdE1ldGhvZHNBbmRBdHRyaWJ1dGVzUmVjdXJzaXZlKSB0aGlzLmFkanVzdE1ldGhvZHNBbmRBdHRyaWJ1dGVzVG9UeXBlUGFyYW1ldGVycyhuZXdDbGFzc0ludGVyZmFjZSwgd2F0Y2hkb2cgLSAxKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IGFsdGVyZWQ6IHRydWUsIG5ld1R5cGU6IG5ld0NsYXNzSW50ZXJmYWNlIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IGFsdGVyZWQ6IGZhbHNlLCBuZXdUeXBlOiB0eXBlIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYodHlwZSBpbnN0YW5jZW9mIEFycmF5VHlwZSl7XHJcbiAgICAgICAgICAgIGxldCBudCA9IHRoaXMuZ2V0QWRqdXN0ZWRUeXBlKHR5cGUuYXJyYXlPZlR5cGUsIHR5cGVWYXJpYWJsZXMsIGFkanVzdE1ldGhvZHNBbmRBdHRyaWJ1dGVzUmVjdXJzaXZlLCB3YXRjaGRvZyAtIDEpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgYWx0ZXJlZDogbnQuYWx0ZXJlZCxcclxuICAgICAgICAgICAgICAgIG5ld1R5cGU6IG50LmFsdGVyZWQgPyBuZXcgQXJyYXlUeXBlKG50Lm5ld1R5cGUpIDogdHlwZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4geyBhbHRlcmVkOiBmYWxzZSwgbmV3VHlwZTogdHlwZSB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJlc29sdmVHZW5lcmljVHlwZXMoZ2VuZXJpY1R5cGVzOiBHZW5lcmljVHlwZUxpc3QpOiBHZW5lcmljVHlwZUxpc3Qge1xyXG4gICAgICAgIGxldCBkb25lOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IHRvZG9MaXN0OiBHZW5lcmljVHlwZUxpc3QgPSBnZW5lcmljVHlwZXMuc2xpY2UoMCk7XHJcbiAgICAgICAgd2hpbGUgKCFkb25lKSB7XHJcbiAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRvZG9MaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdG4gPSB0b2RvTGlzdFtpXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yZXNvbHZlR2VuZXJpY1R5cGUodG4pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9uZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHRuLnR5cGVOb2RlLmdlbmVyaWNQYXJhbWV0ZXJUeXBlcyA9PSBudWxsIHx8IHRuLnR5cGVOb2RlLmdlbmVyaWNQYXJhbWV0ZXJUeXBlc1Jlc29sdmVkICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0b2RvTGlzdC5zcGxpY2UodG9kb0xpc3QuaW5kZXhPZih0biksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0b2RvTGlzdDtcclxuICAgIH1cclxuXHJcbiAgICAvLyByZXR1cm5zIHRydWUgaWYgc29tZXRoaW5nIG5ldyBjb3VsZCBiZSByZXNvbHZlZFxyXG4gICAgcmVzb2x2ZUdlbmVyaWNUeXBlKHRuOiB7IHR5cGVOb2RlOiBUeXBlTm9kZSwgbW9kdWxlOiBNb2R1bGUgfSk6IGJvb2xlYW4ge1xyXG5cclxuICAgICAgICBpZiAodG4udHlwZU5vZGUuZ2VuZXJpY1BhcmFtZXRlclR5cGVzUmVzb2x2ZWQgIT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmICh0bi50eXBlTm9kZS5nZW5lcmljUGFyYW1ldGVyVHlwZXMgPT0gbnVsbCkgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIGUuZy4gTWFwPEludGVnZXIsIFN0cmluZz4gdGVzdCA9IG5ldyBNYXA8PigpO1xyXG4gICAgICAgICAqIFN1YnNlcXVlbnQgQ29kZSBwcm9jZXNzZXMgdGhlIHR5cGUgTWFwPEludGVnZXIsIFN0cmluZz5cclxuICAgICAgICAgKi9cclxuXHJcbiAgICAgICAgbGV0IGNpOiBLbGFzcyB8IEludGVyZmFjZSA9IDxhbnk+dG4udHlwZU5vZGUucmVzb2x2ZWRUeXBlOyAvLyBpbiBleGFtcGxlOiBNYXBcclxuICAgICAgICBpZiAoY2kgPT0gbnVsbCB8fCAhKGNpIGluc3RhbmNlb2YgSW50ZXJmYWNlIHx8IGNpIGluc3RhbmNlb2YgS2xhc3MpKSB7IC8vIFRoZXJlIGhhZCBiZWVuIGFuIGVycm9yLi4uIChpbiBleGFtcGxlOiBNYXAgaGFzIG5vdCBiZWVuIHJlc29sdmVkKVxyXG4gICAgICAgICAgICB0bi50eXBlTm9kZS5nZW5lcmljUGFyYW1ldGVyVHlwZXMgPSBudWxsO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vID0+IGV4aXQgZ3JhY2VmdWxseVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFjaS50eXBlVmFyaWFibGVzUmVhZHkpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgbGV0IHBhcmFtZXRlclR5cGVzOiAoS2xhc3MgfCBJbnRlcmZhY2UpW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRuLnR5cGVOb2RlLmdlbmVyaWNQYXJhbWV0ZXJUeXBlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgZ2VuZXJpY1BhcmFtZXRlclR5cGUgPSB0bi50eXBlTm9kZS5nZW5lcmljUGFyYW1ldGVyVHlwZXNbaV07XHJcbiAgICAgICAgICAgIGxldCByZXNvbHZlZFR5cGUgPSBnZW5lcmljUGFyYW1ldGVyVHlwZS5yZXNvbHZlZFR5cGU7XHJcblxyXG4gICAgICAgICAgICBpZiAocmVzb2x2ZWRUeXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGdlbmVyaWNQYXJhbWV0ZXJUeXBlLmdlbmVyaWNQYXJhbWV0ZXJUeXBlcyAhPSBudWxsICYmIGdlbmVyaWNQYXJhbWV0ZXJUeXBlLmdlbmVyaWNQYXJhbWV0ZXJUeXBlc1Jlc29sdmVkID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gZmlyc3QgcmVzb2x2ZSB0aGlzIHR5cGUhXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghKHJlc29sdmVkVHlwZSBpbnN0YW5jZW9mIEludGVyZmFjZSB8fCByZXNvbHZlZFR5cGUgaW5zdGFuY2VvZiBLbGFzcykpIHtcclxuICAgICAgICAgICAgICAgIHRuLm1vZHVsZS5lcnJvcnNbMl0ucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGdlbmVyaWNQYXJhbWV0ZXJUeXBlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiSGllciB3aXJkIGVpbiBJbnRlcmZhY2UtIG9kZXIgS2xhc3NlbnR5cCBlcndhcnRldC4gRGVyIFR5cCBcIiArIGdlbmVyaWNQYXJhbWV0ZXJUeXBlLmlkZW50aWZpZXIgKyBcIiBpc3QgYWJlciBrZWluZXIuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWw6IFwiZXJyb3JcIlxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB0bi50eXBlTm9kZS5nZW5lcmljUGFyYW1ldGVyVHlwZXMgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7IC8vID0+IGV4aXQgZ3JhY2VmdWxseVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBwYXJhbWV0ZXJUeXBlcy5wdXNoKDxhbnk+Z2VuZXJpY1BhcmFtZXRlclR5cGUucmVzb2x2ZWRUeXBlKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdHlwZVZhcmlhYmxlc09sZFRvTmV3TWFwOiBNYXA8S2xhc3MsIEtsYXNzPiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICAgICAgaWYgKGNpLnR5cGVWYXJpYWJsZXMubGVuZ3RoICE9IHBhcmFtZXRlclR5cGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0bi5tb2R1bGUuZXJyb3JzWzJdLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHRuLnR5cGVOb2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogKGNpIGluc3RhbmNlb2YgS2xhc3MgPyBcIkRpZSBLbGFzc2UgXCIgOiBcIkRhcyBJbnRlcmZhY2UgXCIpICsgY2kuaWRlbnRpZmllciArIFwiIGhhdCBcIiArIGNpLnR5cGVWYXJpYWJsZXMubGVuZ3RoICsgXCIgVHlwcGFyYW1ldGVyLCBoaWVyIHNpbmQgYWJlciBcIiArIHBhcmFtZXRlclR5cGVzLmxlbmd0aCArIFwiIGFuZ2VnZWJlbi5cIixcclxuICAgICAgICAgICAgICAgIGxldmVsOiBcImVycm9yXCJcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRuLnR5cGVOb2RlLmdlbmVyaWNQYXJhbWV0ZXJUeXBlcyA9IG51bGw7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlOyAvLyA9PiBleGl0IGdyYWNlZnVsbHlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICBmb3IgKGxldCB0eXBlIG9mIHBhcmFtZXRlclR5cGVzKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgb2xkVHlwZVZhcmlhYmxlID0gY2kudHlwZVZhcmlhYmxlc1tpXTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlIGluc3RhbmNlb2YgSW50ZXJmYWNlKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZTEgPSBvYmplY3RUeXBlLmNsb25lKCk7XHJcbiAgICAgICAgICAgICAgICB0eXBlMS5pbXBsZW1lbnRzLnB1c2godHlwZSk7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gdHlwZTE7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBuZXdUeXBlVmFyaWFibGUgPSB7XHJcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBvbGRUeXBlVmFyaWFibGUuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgIHNjb3BlRnJvbTogb2xkVHlwZVZhcmlhYmxlLnNjb3BlRnJvbSxcclxuICAgICAgICAgICAgICAgIHNjb3BlVG86IG9sZFR5cGVWYXJpYWJsZS5zY29wZVRvLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogdHlwZVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdHlwZVZhcmlhYmxlc09sZFRvTmV3TWFwLnNldChjaS50eXBlVmFyaWFibGVzW2ldLnR5cGUsIG5ld1R5cGVWYXJpYWJsZS50eXBlKVxyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbmV3Q2kgPVxyXG4gICAgICAgICAgICB0aGlzLnByb3BhZ2F0ZVR5cGVQYXJhbWV0ZXJUb0Jhc2VDbGFzc2VzQW5kSW1wbGVtZW50ZWRJbnRlcmZhY2VzKGNpLCB0eXBlVmFyaWFibGVzT2xkVG9OZXdNYXApO1xyXG5cclxuICAgICAgICB0bi50eXBlTm9kZS5yZXNvbHZlZFR5cGUgPSBuZXdDaTtcclxuICAgICAgICB0bi50eXBlTm9kZS5nZW5lcmljUGFyYW1ldGVyVHlwZXNSZXNvbHZlZCA9IHRydWU7XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3BhZ2F0ZVR5cGVQYXJhbWV0ZXJUb0Jhc2VDbGFzc2VzQW5kSW1wbGVtZW50ZWRJbnRlcmZhY2VzKGNsYXNzT3JJbnRlcmZhY2U6IEtsYXNzIHwgSW50ZXJmYWNlLFxyXG4gICAgICAgIHR5cGVWYXJpYWJsZXNPbGRUb05ld01hcDogTWFwPEtsYXNzLCBLbGFzcz4pOiBLbGFzcyB8IEludGVyZmFjZSB7XHJcblxyXG4gICAgICAgIGlmIChjbGFzc09ySW50ZXJmYWNlIGluc3RhbmNlb2YgS2xhc3MpIHtcclxuICAgICAgICAgICAgbGV0IG5ld0NsYXNzOiBLbGFzcyA9IGNsYXNzT3JJbnRlcmZhY2UuY2xvbmUoKTtcclxuXHJcbiAgICAgICAgICAgIG5ld0NsYXNzLnR5cGVWYXJpYWJsZXMgPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgdHYgb2YgY2xhc3NPckludGVyZmFjZS50eXBlVmFyaWFibGVzKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3VHlwZSA9IHR5cGVWYXJpYWJsZXNPbGRUb05ld01hcC5nZXQodHYudHlwZSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgdHYxID0gdHY7XHJcbiAgICAgICAgICAgICAgICBpZiAobmV3VHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHYxID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiB0di5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZUZyb206IHR2LnNjb3BlRnJvbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVUbzogdHYuc2NvcGVUbyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogbmV3VHlwZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG5ld0NsYXNzLnR5cGVWYXJpYWJsZXMucHVzaCh0djEpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgYmFzZUtsYXNzID0gY2xhc3NPckludGVyZmFjZS5iYXNlQ2xhc3M7XHJcbiAgICAgICAgICAgIGlmIChiYXNlS2xhc3MgIT0gbnVsbCAmJiBiYXNlS2xhc3MuaXNHZW5lcmljVmFyaWFudEZyb20gIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgICAgIG5ld0NsYXNzLnNldEJhc2VDbGFzcyg8S2xhc3M+dGhpcy5wcm9wYWdhdGVUeXBlUGFyYW1ldGVyVG9CYXNlQ2xhc3Nlc0FuZEltcGxlbWVudGVkSW50ZXJmYWNlcyhiYXNlS2xhc3MsIHR5cGVWYXJpYWJsZXNPbGRUb05ld01hcCkpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbmV3Q2xhc3MuaW1wbGVtZW50cyA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpbXBsIG9mIGNsYXNzT3JJbnRlcmZhY2UuaW1wbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGltcGwuaXNHZW5lcmljVmFyaWFudEZyb20gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0NsYXNzLmltcGxlbWVudHMucHVzaChpbXBsKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3Q2xhc3MuaW1wbGVtZW50cy5wdXNoKDxJbnRlcmZhY2U+dGhpcy5wcm9wYWdhdGVUeXBlUGFyYW1ldGVyVG9CYXNlQ2xhc3Nlc0FuZEltcGxlbWVudGVkSW50ZXJmYWNlcyhpbXBsLCB0eXBlVmFyaWFibGVzT2xkVG9OZXdNYXApKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG5ld0NsYXNzO1xyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgbmV3SW50ZXJmYWNlOiBJbnRlcmZhY2UgPSBjbGFzc09ySW50ZXJmYWNlLmNsb25lKCk7XHJcblxyXG4gICAgICAgICAgICBuZXdJbnRlcmZhY2UudHlwZVZhcmlhYmxlcyA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCB0diBvZiBjbGFzc09ySW50ZXJmYWNlLnR5cGVWYXJpYWJsZXMpIHtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdUeXBlID0gdHlwZVZhcmlhYmxlc09sZFRvTmV3TWFwLmdldCh0di50eXBlKTtcclxuICAgICAgICAgICAgICAgIGxldCB0djEgPSB0djtcclxuICAgICAgICAgICAgICAgIGlmIChuZXdUeXBlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0djEgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IHR2LmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlRnJvbTogdHYuc2NvcGVGcm9tLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZVRvOiB0di5zY29wZVRvLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBuZXdUeXBlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbmV3SW50ZXJmYWNlLnR5cGVWYXJpYWJsZXMucHVzaCh0djEpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBuZXdJbnRlcmZhY2UuZXh0ZW5kcyA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpbXBsIG9mIGNsYXNzT3JJbnRlcmZhY2UuZXh0ZW5kcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGltcGwuaXNHZW5lcmljVmFyaWFudEZyb20gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0ludGVyZmFjZS5leHRlbmRzLnB1c2goaW1wbCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0ludGVyZmFjZS5leHRlbmRzLnB1c2goPEludGVyZmFjZT50aGlzLnByb3BhZ2F0ZVR5cGVQYXJhbWV0ZXJUb0Jhc2VDbGFzc2VzQW5kSW1wbGVtZW50ZWRJbnRlcmZhY2VzKGltcGwsIHR5cGVWYXJpYWJsZXNPbGRUb05ld01hcCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbmV3SW50ZXJmYWNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNoZWNrRG91YmxlSWRlbnRpZmllckRlZmluaXRpb24oKSB7XHJcbiAgICAgICAgbGV0IGlkZW50aWZpZXJNb2R1bGVNYXA6IE1hcDxzdHJpbmcsIE1vZHVsZT4gPSBuZXcgTWFwKCk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IG1vZHVsZSBvZiB0aGlzLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHR5cGUgb2YgbW9kdWxlLnR5cGVTdG9yZS50eXBlTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG90aGVyTW9kdWxlID0gaWRlbnRpZmllck1vZHVsZU1hcC5nZXQodHlwZS5pZGVudGlmaWVyKTtcclxuICAgICAgICAgICAgICAgIGlmIChvdGhlck1vZHVsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlLmVycm9yc1sxXS5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJEZXIgVHlwYmV6ZWljaG5lciBcIiArIHR5cGUuaWRlbnRpZmllciArIFwiIHd1cmRlIG1laHJmYWNoIGRlZmluaWVydCwgbsOkbWxpY2ggaW4gZGVuIE1vZHVsZW4gXCIgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kdWxlLmZpbGUubmFtZSArIFwiIHVuZCBcIiArIG90aGVyTW9kdWxlLmZpbGUubmFtZSArIFwiLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdHlwZS5kZWNsYXJhdGlvbi5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWw6IFwiZXJyb3JcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBvdGhlclR5cGUgPSBvdGhlck1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZSh0eXBlLmlkZW50aWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvdGhlclR5cGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdGhlck1vZHVsZS5lcnJvcnNbMV0ucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIkRlciBUeXBiZXplaWNobmVyIFwiICsgdHlwZS5pZGVudGlmaWVyICsgXCIgd3VyZGUgbWVocmZhY2ggZGVmaW5pZXJ0LCBuw6RtbGljaCBpbiBkZW4gTW9kdWxlbiBcIiArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJNb2R1bGUuZmlsZS5uYW1lICsgXCIgdW5kIFwiICsgbW9kdWxlLmZpbGUubmFtZSArIFwiLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG90aGVyVHlwZS5kZWNsYXJhdGlvbi5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsOiBcImVycm9yXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyTW9kdWxlTWFwLnNldCh0eXBlLmlkZW50aWZpZXIsIG1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBiYXNlTW9kdWxlID0gdGhpcy5tb2R1bGVTdG9yZS5nZXRCYXNlTW9kdWxlKCk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IHRwIG9mIHRoaXMudHlwZVBhcmFtZXRlckxpc3QpIHtcclxuICAgICAgICAgICAgbGV0IG1vZHVsZSA9IHRwLmNpLm1vZHVsZTtcclxuICAgICAgICAgICAgbGV0IG90aGVyTW9kdWxlID0gaWRlbnRpZmllck1vZHVsZU1hcC5nZXQodHAudHBuLmlkZW50aWZpZXIpO1xyXG4gICAgICAgICAgICBpZiAob3RoZXJNb2R1bGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN5c3RlbVR5cGUgPSBiYXNlTW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKHRwLnRwbi5pZGVudGlmaWVyKTtcclxuICAgICAgICAgICAgICAgIGlmIChzeXN0ZW1UeXBlICE9IG51bGwpIG90aGVyTW9kdWxlID0gYmFzZU1vZHVsZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAob3RoZXJNb2R1bGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbW9kdWxlLmVycm9yc1sxXS5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIkRlciBUeXBiZXplaWNobmVyIFwiICsgdHAudHBuLmlkZW50aWZpZXIgKyBcIiB3dXJkZSBtZWhyZmFjaCBkZWZpbmllcnQsIG7DpG1saWNoIGluIGRlbiBNb2R1bGVuIFwiICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kdWxlLmZpbGUubmFtZSArIFwiIHVuZCBcIiArIG90aGVyTW9kdWxlLmZpbGUubmFtZSArIFwiLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0cC50cG4ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWw6IFwiZXJyb3JcIlxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgb3RoZXJUeXBlID0gb3RoZXJNb2R1bGUudHlwZVN0b3JlLmdldFR5cGUodHAudHBuLmlkZW50aWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG90aGVyVHlwZSAhPSBudWxsICYmIG90aGVyTW9kdWxlICE9IGJhc2VNb2R1bGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBvdGhlck1vZHVsZS5lcnJvcnNbMV0ucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiRGVyIFR5cGJlemVpY2huZXIgXCIgKyB0cC50cG4uaWRlbnRpZmllciArIFwiIHd1cmRlIG1laHJmYWNoIGRlZmluaWVydCwgbsOkbWxpY2ggaW4gZGVuIE1vZHVsZW4gXCIgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJNb2R1bGUuZmlsZS5uYW1lICsgXCIgdW5kIFwiICsgbW9kdWxlLmZpbGUubmFtZSArIFwiLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogb3RoZXJUeXBlLmRlY2xhcmF0aW9uLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmVzb2x2ZVVucmVzb2x2ZWRUeXBlcyhsYXN0UGFzczogYm9vbGVhbikge1xyXG4gICAgICAgIGZvciAobGV0IG1vZHVsZSBvZiB0aGlzLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpKSB7XHJcbiAgICAgICAgICAgIG1vZHVsZS5kZXBlbmRzT25Nb2R1bGVzID0gbmV3IE1hcCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgbW9kdWxlIG9mIHRoaXMubW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSkpIHtcclxuICAgICAgICAgICAgbGV0IHV0ID0gdGhpcy51bnJlc29sdmVkVHlwZXMuZ2V0KG1vZHVsZSk7XHJcbiAgICAgICAgICAgIGxldCB1dE5ldzogVHlwZU5vZGVbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCB0eXBlIG9mIHV0KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMucmVzb2x2ZVR5cGUodHlwZSwgbW9kdWxlLCBsYXN0UGFzcykpIHtcclxuICAgICAgICAgICAgICAgICAgICB1dE5ldy5wdXNoKHR5cGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMudW5yZXNvbHZlZFR5cGVzLnNldChtb2R1bGUsIHV0TmV3KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYWRkRnJvbUpzb25NZXRob2Qoa2xhc3M6IEtsYXNzKSB7XHJcbiAgICAgICAgbGV0IGludGVycHJldGVyID0gdGhpcy5tYWluLmdldEludGVycHJldGVyKCk7XHJcbiAgICAgICAga2xhc3MuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJmcm9tSnNvblwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJqc29uU3RyaW5nXCIsIHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBrbGFzcyxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBqc29uOiBzdHJpbmcgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBKc29uVG9vbCgpLmZyb21Kc29uKGpzb24sIGtsYXNzLCB0aGlzLm1vZHVsZVN0b3JlLCBpbnRlcnByZXRlcik7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCB0cnVlLCBgS29udmVydGllcnQgZWluZSBKc29uLVplaWNoZW5rZXR0ZSBpbiBlaW4gJHtrbGFzcy5pZGVudGlmaWVyfS1PYmpla3QgKFwiZGVzZXJpYWxpc2llcmVuXCIpLiBWb3IgZGVtIERlc2VyaWFsaXNpZXJlbiBlaW5lcyBPYmpla3RzIHdlcmRlbiBkaWUgQXR0cmlidXRpbml0aWFsaXNpZXJlciBhbmdld2FuZHQgdW5kIC0gZmFsbHMgdm9yaGFuZGVuIC0gZWluIHBhcmFtZXRlcmxvc2VyIEtvbnN0cnVrdG9yIGF1c2dlZsO8aHJ0LiBEZXIgQWxnb3JpdGhtdXMga29tbXQgYXVjaCBtaXQgenlrbGlzY2hlbiBPYmpla3RyZWZlcmVuemVuIHp1cmVjaHQuYCwgZmFsc2UpKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgYWRkVG9Kc29uTWV0aG9kKGtsYXNzOiBLbGFzcykge1xyXG4gICAgICAgIGtsYXNzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwidG9Kc29uXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtdKSwgc3RyaW5nUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgSnNvblRvb2woKS50b0pzb24ocGFyYW1ldGVyc1swXSk7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgYEtvbnZlcnRpZXJ0IGVpbiBPYmpla3QgKHJla3Vyc2l2IG1pdHNhbXQgcmVmZXJlbnppZXJ0ZXIgT2JqZWt0ZSkgaW4gZWluZSBKc29uLVplaWNoZW5rZXR0ZS4gTmljaHQga29udmVydGllcnQgd2VyZGVuIFN5c3RlbWtsYXNzZW4gKGF1w59lcjogQXJyYXlMaXN0KSBzb3dpZSBtaXQgZGVtIFNjaGzDvHNzZWx3b3J0IHRyYW5zaWVudCBhdXNnZXplaWNobmV0ZSBBdHRyaWJ1dGUuYCkpO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgc2V0dXBNZXRob2RzQW5kQXR0cmlidXRlcygpIHtcclxuXHJcbiAgICAgICAgbGV0IGNsYXNzZXNPckVudW1zOiAoQ2xhc3NEZWNsYXJhdGlvbk5vZGUgfCBFbnVtRGVjbGFyYXRpb25Ob2RlKVtdID0gW107XHJcbiAgICAgICAgY2xhc3Nlc09yRW51bXMgPSBjbGFzc2VzT3JFbnVtcy5jb25jYXQodGhpcy5jbGFzc2VzKTtcclxuICAgICAgICBjbGFzc2VzT3JFbnVtcyA9IGNsYXNzZXNPckVudW1zLmNvbmNhdCh0aGlzLmVudW1zKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY24gb2YgY2xhc3Nlc09yRW51bXMpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgbW4gb2YgY24ubWV0aG9kcykge1xyXG4gICAgICAgICAgICAgICAgbGV0IG06IE1ldGhvZCA9IHRoaXMuc2V0dXBNZXRob2QobW4sIGNuLnJlc29sdmVkVHlwZS5tb2R1bGUsIGNuLnJlc29sdmVkVHlwZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobW4uY29tbWVudEJlZm9yZSAhPSBudWxsKSBtLmRvY3VtZW50YXRpb24gPSBcIlwiICsgbW4uY29tbWVudEJlZm9yZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBjbi5yZXNvbHZlZFR5cGUuYWRkTWV0aG9kKG0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZEZyb21Kc29uTWV0aG9kKGNuLnJlc29sdmVkVHlwZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkVG9Kc29uTWV0aG9kKGNuLnJlc29sdmVkVHlwZSk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBhdHQgb2YgY24uYXR0cmlidXRlcykge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucmVzb2x2ZVR5cGUoYXR0LmF0dHJpYnV0ZVR5cGUsIGNuLnJlc29sdmVkVHlwZS5tb2R1bGUsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHR5cGUgPSBhdHQuYXR0cmlidXRlVHlwZS5yZXNvbHZlZFR5cGU7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZTogQXR0cmlidXRlID0gbmV3IEF0dHJpYnV0ZShhdHQuaWRlbnRpZmllciwgdHlwZSwgbnVsbCwgYXR0LmlzU3RhdGljLCBhdHQudmlzaWJpbGl0eSwgYXR0LmlzRmluYWwpO1xyXG4gICAgICAgICAgICAgICAgYXR0LnJlc29sdmVkVHlwZSA9IGF0dHJpYnV0ZTtcclxuICAgICAgICAgICAgICAgIGlmKGF0dC5jb21tZW50QmVmb3JlICE9IG51bGwpIGF0dHJpYnV0ZS5kb2N1bWVudGF0aW9uID0gXCJcIiArIGF0dC5jb21tZW50QmVmb3JlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlLmFubm90YXRpb24gPSBhdHQuYW5ub3RhdGlvbjtcclxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZS5pc1RyYW5zaWVudCA9IGF0dC5pc1RyYW5zaWVudDtcclxuICAgICAgICAgICAgICAgIGlmIChjbi5yZXNvbHZlZFR5cGUuYXR0cmlidXRlTWFwLmdldChhdHRyaWJ1dGUuaWRlbnRpZmllcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNuLnJlc29sdmVkVHlwZS5tb2R1bGUuZXJyb3JzWzJdLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIkVzIGRhcmYgbmljaHQgbWVocmVyZSBBdHRyaWJ1dGUgbWl0IGRlbXNlbGJlbiBCZXplaWNobmVyICdcIiArIGF0dHJpYnV0ZS5pZGVudGlmaWVyICsgXCInIGluIGRlcnNlbGJlbiBLbGFzc3NlIGdlYmVuLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogYXR0LnBvc2l0aW9uLCBsZXZlbDogXCJlcnJvclwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjbi5yZXNvbHZlZFR5cGUuYWRkQXR0cmlidXRlKGF0dHJpYnV0ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihjbi5yZXNvbHZlZFR5cGUubW9kdWxlLCBhdHQucG9zaXRpb24sIGF0dHJpYnV0ZSk7XHJcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGUuZGVjbGFyYXRpb24gPSB7IG1vZHVsZTogY24ucmVzb2x2ZWRUeXBlLm1vZHVsZSwgcG9zaXRpb246IGF0dC5wb3NpdGlvbiB9O1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaWMgb2YgdGhpcy5pbnRlcmZhY2VzKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG1uIG9mIGljLm1ldGhvZHMpIHtcclxuICAgICAgICAgICAgICAgIGxldCBtMTogTWV0aG9kID0gdGhpcy5zZXR1cE1ldGhvZChtbiwgaWMucmVzb2x2ZWRUeXBlLm1vZHVsZSwgaWMucmVzb2x2ZWRUeXBlKTtcclxuICAgICAgICAgICAgICAgIGlmIChtMSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWMucmVzb2x2ZWRUeXBlLmFkZE1ldGhvZChtMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldHVwTWV0aG9kKG1uOiBNZXRob2REZWNsYXJhdGlvbk5vZGUsIG06IE1vZHVsZSwgYzogS2xhc3MgfCBJbnRlcmZhY2UpOiBNZXRob2Qge1xyXG5cclxuICAgICAgICBsZXQgdHlwZXNPSyA9IHRydWU7XHJcblxyXG4gICAgICAgIHR5cGVzT0sgPSB0eXBlc09LICYmIHRoaXMucmVzb2x2ZVR5cGUobW4ucmV0dXJuVHlwZSwgbSwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIGxldCBwYXJhbWV0ZXJzOiBWYXJpYWJsZVtdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgcGFyIG9mIG1uLnBhcmFtZXRlcnMpIHtcclxuICAgICAgICAgICAgdHlwZXNPSyA9IHR5cGVzT0sgJiYgdGhpcy5yZXNvbHZlVHlwZShwYXIucGFyYW1ldGVyVHlwZSwgbSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlc09LKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVyID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IHBhci5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBwYXIuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICB1c2FnZVBvc2l0aW9uczogbmV3IE1hcCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHBhci5wYXJhbWV0ZXJUeXBlLnJlc29sdmVkVHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBkZWNsYXJhdGlvbjogeyBtb2R1bGU6IG0sIHBvc2l0aW9uOiBwYXIucG9zaXRpb24gfSxcclxuICAgICAgICAgICAgICAgICAgICBpc0ZpbmFsOiBwYXIuaXNGaW5hbCxcclxuICAgICAgICAgICAgICAgICAgICBpc0VsbGlwc2lzOiBwYXIuaXNFbGxpcHNpc1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlcnMucHVzaChwYXJhbWV0ZXIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihtLCBwYXIucG9zaXRpb24sIHBhcmFtZXRlcik7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHBsOiBQYXJhbWV0ZXJsaXN0ID0gbmV3IFBhcmFtZXRlcmxpc3QocGFyYW1ldGVycyk7XHJcblxyXG4gICAgICAgIGlmICh0eXBlc09LKSB7XHJcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBuZXcgTWV0aG9kKG1uLmlkZW50aWZpZXIsIHBsLCBtbi5yZXR1cm5UeXBlLnJlc29sdmVkVHlwZSwgbnVsbCwgbW4uaXNBYnN0cmFjdCwgbW4uaXNTdGF0aWMpO1xyXG4gICAgICAgICAgICBtZXRob2QuaXNDb25zdHJ1Y3RvciA9IG1uLmlkZW50aWZpZXIgPT0gYy5pZGVudGlmaWVyO1xyXG4gICAgICAgICAgICBtZXRob2QudmlzaWJpbGl0eSA9IG1uLnZpc2liaWxpdHk7XHJcbiAgICAgICAgICAgIG1ldGhvZC5pc0NvbnN0cnVjdG9yID0gbW4uaXNDb25zdHJ1Y3RvcjtcclxuICAgICAgICAgICAgbW4ucmVzb2x2ZWRUeXBlID0gbWV0aG9kO1xyXG4gICAgICAgICAgICBtZXRob2QuYW5ub3RhdGlvbiA9IG1uLmFubm90YXRpb247XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG0sIG1uLnBvc2l0aW9uLCBtZXRob2QpO1xyXG4gICAgICAgICAgICBtZXRob2QuZGVjbGFyYXRpb24gPSB7XHJcbiAgICAgICAgICAgICAgICBtb2R1bGU6IG0sXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbW4ucG9zaXRpb25cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG1ldGhvZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHB1c2hVc2FnZVBvc2l0aW9uKG06IE1vZHVsZSwgcG9zaXRpb246IFRleHRQb3NpdGlvbiwgZWxlbWVudDogVHlwZSB8IE1ldGhvZCB8IEF0dHJpYnV0ZSB8IFZhcmlhYmxlKSB7XHJcblxyXG4gICAgICAgIG0uYWRkSWRlbnRpZmllclBvc2l0aW9uKHBvc2l0aW9uLCBlbGVtZW50KTtcclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBwb3NpdGlvbkxpc3Q6IFRleHRQb3NpdGlvbltdID0gZWxlbWVudC51c2FnZVBvc2l0aW9ucy5nZXQobSk7XHJcbiAgICAgICAgaWYgKHBvc2l0aW9uTGlzdCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uTGlzdCA9IFtdO1xyXG4gICAgICAgICAgICBlbGVtZW50LnVzYWdlUG9zaXRpb25zLnNldChtLCBwb3NpdGlvbkxpc3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcG9zaXRpb25MaXN0LnB1c2gocG9zaXRpb24pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXNvbHZlVHlwZSh0bjogVHlwZU5vZGUsIG06IE1vZHVsZSwgbGFzdFBhc3M6IGJvb2xlYW4pOiBib29sZWFuIHtcclxuICAgICAgICBpZiAodG4ucmVzb2x2ZWRUeXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IHR5cGVNb2R1bGUgPSB0aGlzLm1vZHVsZVN0b3JlLmdldFR5cGUodG4uaWRlbnRpZmllcik7XHJcbiAgICAgICAgICAgIGlmICh0eXBlTW9kdWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCB0eXBlID0gdHlwZU1vZHVsZS50eXBlO1xyXG4gICAgICAgICAgICAgICAgbS5kZXBlbmRzT25Nb2R1bGVzLnNldCh0eXBlTW9kdWxlLm1vZHVsZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG0sIHRuLnBvc2l0aW9uLCB0eXBlKTtcclxuICAgICAgICAgICAgICAgIHR5cGUgPSBnZXRBcnJheVR5cGUodHlwZSwgdG4uYXJyYXlEaW1lbnNpb24pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWdpc3RlckdlbmVyaWNUeXBlKHRuLCBtLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICB0bi5yZXNvbHZlZFR5cGUgPSB0eXBlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCB0eXBlUGFyYW1ldGVyTGlzdCA9IHRoaXMubW9kdWxlVG9UeXBlUGFyYW1ldGVyTGlzdE1hcC5nZXQobSk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlUGFyYW1ldGVyTGlzdCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB0ZyBvZiB0eXBlUGFyYW1ldGVyTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0Zy5pZGVudGlmaWVyID09IHRuLmlkZW50aWZpZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gdG4ucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbi5saW5lID4gdGcuc2NvcGVGcm9tLmxpbmUgfHwgcG9zaXRpb24ubGluZSA9PSB0Zy5zY29wZUZyb20ubGluZSAmJiBwb3NpdGlvbi5jb2x1bW4gPj0gdGcuc2NvcGVGcm9tLmNvbHVtbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uLmxpbmUgPCB0Zy5zY29wZVRvLmxpbmUgfHwgcG9zaXRpb24ubGluZSA9PSB0Zy5zY29wZVRvLmxpbmUgJiYgcG9zaXRpb24uY29sdW1uIDw9IHRnLnNjb3BlVG8uY29sdW1uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihtLCB0bi5wb3NpdGlvbiwgdGcudHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG4ucmVzb2x2ZWRUeXBlID0gdGcudHlwZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGxhc3RQYXNzKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHR5cEtsYXNzZSA9ICh0bi5pZGVudGlmaWVyLmxlbmd0aCA+IDAgJiYgdG4uaWRlbnRpZmllclswXS50b1VwcGVyQ2FzZSgpID09IHRuLmlkZW50aWZpZXJbMF0pID8gXCJEaWUgS2xhc3NlXCIgOiBcIkRlciBUeXBcIjtcclxuXHJcbiAgICAgICAgICAgICAgICBtLmVycm9yc1syXS5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdG4ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogdHlwS2xhc3NlICsgXCIgXCIgKyB0bi5pZGVudGlmaWVyICsgXCIga29ubnRlIG5pY2h0IGdlZnVuZGVuIHdlcmRlbi5cIiArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICh0bi5pZGVudGlmaWVyID09IFwic3RyaW5nXCIgPyBcIiBNZWludGVuIFNpZSBTdHJpbmcgKGdyb8OfZ2VzY2hyaWViZW4pP1wiIDogXCJcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWw6IFwiZXJyb3JcIixcclxuICAgICAgICAgICAgICAgICAgICBxdWlja0ZpeDogKHRuLmlkZW50aWZpZXIgPT0gXCJzdHJpbmdcIikgPyB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlN0cmluZyBncm/DnyBzY2hyZWliZW5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWRpdHNQcm92aWRlcjogKHVyaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiB1cmksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiB7IHN0YXJ0TGluZU51bWJlcjogdG4ucG9zaXRpb24ubGluZSwgc3RhcnRDb2x1bW46IHRuLnBvc2l0aW9uLmNvbHVtbiAtIDEsIGVuZExpbmVOdW1iZXI6IHRuLnBvc2l0aW9uLmxpbmUsIGVuZENvbHVtbjogdG4ucG9zaXRpb24uY29sdW1uICsgNiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJTdHJpbmdcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0gOiBudWxsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0bi5yZXNvbHZlZFR5cGUgPSBudWxsO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXNvbHZlRXh0ZW5kc0ltcGxlbWVudHMoKSB7XHJcbiAgICAgICAgZm9yIChsZXQgY24gb2YgdGhpcy5jbGFzc2VzKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgYyA9IGNuLnJlc29sdmVkVHlwZTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaU5vZGUgb2YgY24uaW1wbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNvbHZlVHlwZShpTm9kZSwgYy5tb2R1bGUsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGlUeXBlID0gaU5vZGUucmVzb2x2ZWRUeXBlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGlUeXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICghKGlUeXBlIGluc3RhbmNlb2YgSW50ZXJmYWNlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGMubW9kdWxlLmVycm9yc1syXS5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGlOb2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIkRlciBUeXAgXCIgKyBpTm9kZS5pZGVudGlmaWVyICsgXCIgaXN0IGtlaW4gaW50ZXJmYWNlLCBkYXJmIGFsc28gbmljaHQgYmVpIGltcGxlbWVudHMuLi4gc3RlaGVuLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjLmltcGxlbWVudHMucHVzaCg8SW50ZXJmYWNlPmlUeXBlKTtcclxuICAgICAgICAgICAgICAgIGlOb2RlLnJlc29sdmVkVHlwZSA9IGlUeXBlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY24uZXh0ZW5kcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlc29sdmVUeXBlKGNuLmV4dGVuZHMsIGMubW9kdWxlLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIGxldCBlVHlwZSA9IGNuLmV4dGVuZHMucmVzb2x2ZWRUeXBlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVUeXBlID09IG51bGwgfHwgIShlVHlwZSBpbnN0YW5jZW9mIEtsYXNzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGMubW9kdWxlLmVycm9yc1syXS5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGNuLmV4dGVuZHMucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiRGVyIFR5cCBcIiArIGNuLmV4dGVuZHMuaWRlbnRpZmllciArIFwiIGlzdCBrZWluZSBLbGFzc2UsIGRhcmYgYWxzbyBuaWNodCBoaW50ZXIgZXh0ZW5kcyBzdGVoZW4uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsOiBcImVycm9yXCJcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjLnNldEJhc2VDbGFzcyg8S2xhc3M+ZVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgY24uZXh0ZW5kcy5yZXNvbHZlZFR5cGUgPSBlVHlwZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGMuc2V0QmFzZUNsYXNzKDxLbGFzcz50aGlzLm1vZHVsZVN0b3JlLmdldFR5cGUoXCJPYmplY3RcIikudHlwZSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yIChsZXQgaW50ZXJmIG9mIHRoaXMuaW50ZXJmYWNlcykge1xyXG5cclxuICAgICAgICAgICAgbGV0IGMgPSBpbnRlcmYucmVzb2x2ZWRUeXBlO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpTm9kZSBvZiBpbnRlcmYuZXh0ZW5kcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNvbHZlVHlwZShpTm9kZSwgYy5tb2R1bGUsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGlUeXBlID0gaU5vZGUucmVzb2x2ZWRUeXBlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGlUeXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICghKGlUeXBlIGluc3RhbmNlb2YgSW50ZXJmYWNlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGMubW9kdWxlLmVycm9yc1syXS5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGlOb2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIkRlciBUeXAgXCIgKyBpTm9kZS5pZGVudGlmaWVyICsgXCIgaXN0IGtlaW4gaW50ZXJmYWNlLCBkYXJmIGFsc28gbmljaHQgYmVpIGV4dGVuZHMuLi4gc3RlaGVuLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjLmV4dGVuZHMucHVzaCg8SW50ZXJmYWNlPmlUeXBlKTtcclxuICAgICAgICAgICAgICAgIGlOb2RlLnJlc29sdmVkVHlwZSA9IGlUeXBlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZXR1cENsYXNzZXNBbmRJbnRlcmZhY2VzKCkge1xyXG4gICAgICAgIGZvciAobGV0IG0gb2YgdGhpcy5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKSkge1xyXG4gICAgICAgICAgICBpZiAobS5jbGFzc0RlZmluaXRpb25zQVNUICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGNkbiBvZiBtLmNsYXNzRGVmaW5pdGlvbnNBU1QpIHtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNkbi50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRDbGFzczpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xhc3Nlcy5wdXNoKGNkbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYyA9IG5ldyBLbGFzcyhjZG4uaWRlbnRpZmllciwgbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZG4uY29tbWVudEJlZm9yZSAhPSBudWxsKSBjLmRvY3VtZW50YXRpb24gPSBcIlwiICsgY2RuLmNvbW1lbnRCZWZvcmUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZG4ucmVzb2x2ZWRUeXBlID0gYztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMudmlzaWJpbGl0eSA9IGNkbi52aXNpYmlsaXR5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYy5pc0Fic3RyYWN0ID0gY2RuLmlzQWJzdHJhY3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLnR5cGVTdG9yZS5hZGRUeXBlKGMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihtLCBjZG4ucG9zaXRpb24sIGMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYy5kZWNsYXJhdGlvbiA9IHsgbW9kdWxlOiBtLCBwb3NpdGlvbjogY2RuLnBvc2l0aW9uIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZ2lzdGVyVHlwZVZhcmlhYmxlcyhjZG4sIGMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNkbi5leHRlbmRzICE9IG51bGwpIHRoaXMucmVnaXN0ZXJHZW5lcmljVHlwZShjZG4uZXh0ZW5kcywgbSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2RuLmltcGxlbWVudHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGltIG9mIGNkbi5pbXBsZW1lbnRzKSB0aGlzLnJlZ2lzdGVyR2VuZXJpY1R5cGUoaW0sIG0sIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRFbnVtOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbnVtcy5wdXNoKGNkbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZSA9IG5ldyBFbnVtKGNkbi5pZGVudGlmaWVyLCBtLCBjZG4udmFsdWVzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNkbi5jb21tZW50QmVmb3JlICE9IG51bGwpIGUuZG9jdW1lbnRhdGlvbiA9IFwiXCIgKyBjZG4uY29tbWVudEJlZm9yZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNkbi5yZXNvbHZlZFR5cGUgPSBlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS52aXNpYmlsaXR5ID0gY2RuLnZpc2liaWxpdHk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLnR5cGVTdG9yZS5hZGRUeXBlKGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihtLCBjZG4ucG9zaXRpb24sIGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5kZWNsYXJhdGlvbiA9IHsgbW9kdWxlOiBtLCBwb3NpdGlvbjogY2RuLnBvc2l0aW9uIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZEludGVyZmFjZTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW50ZXJmYWNlcy5wdXNoKGNkbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaSA9IG5ldyBJbnRlcmZhY2UoY2RuLmlkZW50aWZpZXIsIG0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2RuLmNvbW1lbnRCZWZvcmUgIT0gbnVsbCkgaS5kb2N1bWVudGF0aW9uID0gXCJcIiArIGNkbi5jb21tZW50QmVmb3JlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2RuLnJlc29sdmVkVHlwZSA9IGk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLnR5cGVTdG9yZS5hZGRUeXBlKGkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihtLCBjZG4ucG9zaXRpb24sIGkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaS5kZWNsYXJhdGlvbiA9IHsgbW9kdWxlOiBtLCBwb3NpdGlvbjogY2RuLnBvc2l0aW9uIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZ2lzdGVyVHlwZVZhcmlhYmxlcyhjZG4sIGkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNkbi5leHRlbmRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpbSBvZiBjZG4uZXh0ZW5kcykgdGhpcy5yZWdpc3RlckdlbmVyaWNUeXBlKGltLCBtLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVzb2x2ZVR5cGVWYXJpYWJsZXMoKTogR2VuZXJpY1R5cGVMaXN0IHtcclxuXHJcbiAgICAgICAgbGV0IHRvZG9MaXN0ID0gdGhpcy50eXBlUGFyYW1ldGVyTGlzdC5zbGljZSgwKTtcclxuICAgICAgICBsZXQgZG9uZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICBsZXQgdW5yZXNvbHZlZEdlbmVyaWNUeXBlczogR2VuZXJpY1R5cGVMaXN0ID0gdGhpcy5nZW5lcmljVHlwZXNJbkNsYXNzRGVmaW5pdGlvbnMuc2xpY2UoMCk7XHJcblxyXG4gICAgICAgIHdoaWxlICghZG9uZSkge1xyXG4gICAgICAgICAgICB0aGlzLnJlc29sdmVVbnJlc29sdmVkVHlwZXMoZmFsc2UpO1xyXG4gICAgICAgICAgICB1bnJlc29sdmVkR2VuZXJpY1R5cGVzID0gdGhpcy5yZXNvbHZlR2VuZXJpY1R5cGVzKHVucmVzb2x2ZWRHZW5lcmljVHlwZXMpO1xyXG5cclxuICAgICAgICAgICAgZG9uZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9kb0xpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCB0diA9IHRvZG9MaXN0W2ldO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlYWR5OiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBleHQ6IFR5cGVOb2RlW10gPSB0di50cG4uZXh0ZW5kcyA9PSBudWxsID8gW10gOiBbdHYudHBuLmV4dGVuZHNdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR2LnRwbi5pbXBsZW1lbnRzICE9IG51bGwpIGV4dCA9IGV4dC5jb25jYXQodHYudHBuLmltcGxlbWVudHMpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZXh0VHlwZSBvZiBleHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0VHlwZS5nZW5lcmljUGFyYW1ldGVyVHlwZXMgIT0gbnVsbCAmJiAhKGV4dFR5cGUuZ2VuZXJpY1BhcmFtZXRlclR5cGVzUmVzb2x2ZWQgPT0gdHJ1ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlYWR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNvbHZlVHlwZVZhcmlhYmxlKHR2KTtcclxuICAgICAgICAgICAgICAgICAgICB0b2RvTGlzdC5zcGxpY2UodG9kb0xpc3QuaW5kZXhPZih0diksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgICAgICAgICBkb25lID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHVucmVzb2x2ZWRHZW5lcmljVHlwZXM7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHJlc29sdmVUeXBlVmFyaWFibGUodHA6IFR5cGVQYXJhbWV0ZXJJbmZvKSB7XHJcblxyXG5cclxuICAgICAgICBsZXQgdHlwZVBhcmFtZXRlcktsYXNzOiBLbGFzcztcclxuICAgICAgICBpZiAodHAudHBuLmV4dGVuZHMgIT0gbnVsbCAmJiB0cC50cG4uZXh0ZW5kcy5yZXNvbHZlZFR5cGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0eXBlUGFyYW1ldGVyS2xhc3MgPSAoPEtsYXNzPnRwLnRwbi5leHRlbmRzLnJlc29sdmVkVHlwZSkuY2xvbmUoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0eXBlUGFyYW1ldGVyS2xhc3MgPSBvYmplY3RUeXBlLmNsb25lKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0eXBlUGFyYW1ldGVyS2xhc3MuaWRlbnRpZmllciA9IHRwLnRwbi5pZGVudGlmaWVyO1xyXG4gICAgICAgIHR5cGVQYXJhbWV0ZXJLbGFzcy5pc1R5cGVWYXJpYWJsZSA9IHRydWU7XHJcblxyXG4gICAgICAgIHR5cGVQYXJhbWV0ZXJLbGFzcy5kZWNsYXJhdGlvbiA9IHtcclxuICAgICAgICAgICAgbW9kdWxlOiB0cC5jaS5tb2R1bGUsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiB0cC50cG4ucG9zaXRpb25cclxuICAgICAgICB9O1xyXG5cclxuXHJcbiAgICAgICAgaWYgKHRwLnRwbi5pbXBsZW1lbnRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaW1wbCBvZiB0cC50cG4uaW1wbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVQYXJhbWV0ZXJLbGFzcy5pbXBsZW1lbnRzLmluZGV4T2YoPEludGVyZmFjZT5pbXBsLnJlc29sdmVkVHlwZSkgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZVBhcmFtZXRlcktsYXNzLmltcGxlbWVudHMucHVzaCg8SW50ZXJmYWNlPmltcGwucmVzb2x2ZWRUeXBlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHRwMTogVHlwZVZhcmlhYmxlID0ge1xyXG4gICAgICAgICAgICBpZGVudGlmaWVyOiB0cC50cG4uaWRlbnRpZmllcixcclxuICAgICAgICAgICAgdHlwZTogdHlwZVBhcmFtZXRlcktsYXNzLFxyXG4gICAgICAgICAgICBzY29wZUZyb206IHRwLmNkbi5wb3NpdGlvbixcclxuICAgICAgICAgICAgc2NvcGVUbzogdHAuY2RuLnNjb3BlVG9cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0cC5jaS50eXBlVmFyaWFibGVzW3RwLmluZGV4XSA9IHRwMTtcclxuICAgICAgICB0cC5jaS50eXBlVmFyaWFibGVzUmVhZHkgPSB0cnVlO1xyXG4gICAgICAgIGZvciAobGV0IHR2IG9mIHRwLmNpLnR5cGVWYXJpYWJsZXMpIGlmICh0diA9PSBudWxsKSB0cC5jaS50eXBlVmFyaWFibGVzUmVhZHkgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgbGV0IHR5cGVQYXJhbWV0ZXJMaXN0ID0gdGhpcy5tb2R1bGVUb1R5cGVQYXJhbWV0ZXJMaXN0TWFwLmdldCh0cC5jaS5tb2R1bGUpO1xyXG4gICAgICAgIGlmICh0eXBlUGFyYW1ldGVyTGlzdCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHR5cGVQYXJhbWV0ZXJMaXN0ID0gW107XHJcbiAgICAgICAgICAgIHRoaXMubW9kdWxlVG9UeXBlUGFyYW1ldGVyTGlzdE1hcC5zZXQodHAuY2kubW9kdWxlLCB0eXBlUGFyYW1ldGVyTGlzdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0eXBlUGFyYW1ldGVyTGlzdC5wdXNoKHRwMSk7XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFVzYWdlUG9zaXRpb24odHAuY2kubW9kdWxlLCB0cC50cG4ucG9zaXRpb24sIHR5cGVQYXJhbWV0ZXJLbGFzcyk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJlZ2lzdGVyVHlwZVZhcmlhYmxlcyhjZG46IENsYXNzRGVjbGFyYXRpb25Ob2RlIHwgSW50ZXJmYWNlRGVjbGFyYXRpb25Ob2RlLCBjbGFzc09ySW50ZXJmYWNlOiBLbGFzcyB8IEludGVyZmFjZSkge1xyXG4gICAgICAgIGxldCBpbmRleCA9IDA7XHJcbiAgICAgICAgZm9yIChsZXQgdHlwZVBhcmFtZXRlciBvZiBjZG4udHlwZVBhcmFtZXRlcnMpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVQYXJhbWV0ZXIuZXh0ZW5kcyAhPSBudWxsKSB0aGlzLnJlZ2lzdGVyR2VuZXJpY1R5cGUodHlwZVBhcmFtZXRlci5leHRlbmRzLCBjbGFzc09ySW50ZXJmYWNlLm1vZHVsZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlUGFyYW1ldGVyLmltcGxlbWVudHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaW0gb2YgdHlwZVBhcmFtZXRlci5pbXBsZW1lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWdpc3RlckdlbmVyaWNUeXBlKGltLCBjbGFzc09ySW50ZXJmYWNlLm1vZHVsZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNsYXNzT3JJbnRlcmZhY2UudHlwZVZhcmlhYmxlc1JlYWR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGNsYXNzT3JJbnRlcmZhY2UudHlwZVZhcmlhYmxlcy5wdXNoKG51bGwpOyAvLyBsZWF2ZSByb29tXHJcblxyXG4gICAgICAgICAgICB0aGlzLnR5cGVQYXJhbWV0ZXJMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgdHBuOiB0eXBlUGFyYW1ldGVyLCB0cDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IHR5cGVQYXJhbWV0ZXIuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlRnJvbTogY2RuLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlVG86IGNkbi5zY29wZVRvXHJcbiAgICAgICAgICAgICAgICB9LCBjaTogY2xhc3NPckludGVyZmFjZSwgY2RuOiBjZG4sXHJcbiAgICAgICAgICAgICAgICBpbmRleDogaW5kZXgrK1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVzb2x2ZVR5cGVzSW5Nb2R1bGVzKCkge1xyXG4gICAgICAgIGZvciAobGV0IG0gb2YgdGhpcy5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKSkge1xyXG4gICAgICAgICAgICBsZXQgdXQ6IFR5cGVOb2RlW10gPSBbXTtcclxuICAgICAgICAgICAgdGhpcy51bnJlc29sdmVkVHlwZXMuc2V0KG0sIHV0KTtcclxuICAgICAgICAgICAgZm9yIChsZXQgdG4gb2YgbS50eXBlTm9kZXMpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0bi5yZXNvbHZlZFR5cGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0eXBlTW9kdWxlID0gdGhpcy5tb2R1bGVTdG9yZS5nZXRUeXBlKHRuLmlkZW50aWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlTW9kdWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHR5cGUgPSB0eXBlTW9kdWxlLnR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFVzYWdlUG9zaXRpb24obSwgdG4ucG9zaXRpb24sIHR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0bi5yZXNvbHZlZFR5cGUgPSBnZXRBcnJheVR5cGUodHlwZSwgdG4uYXJyYXlEaW1lbnNpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZ2lzdGVyR2VuZXJpY1R5cGUodG4sIG0sIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dC5wdXNoKHRuKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVnaXN0ZXJHZW5lcmljVHlwZSh0eXBlTm9kZTogVHlwZU5vZGUsIG1vZHVsZTogTW9kdWxlLCBpc0luQ2xhc3NEZWZpbml0aW9uOiBib29sZWFuKSB7XHJcbiAgICAgICAgaWYgKHR5cGVOb2RlLmdlbmVyaWNQYXJhbWV0ZXJUeXBlcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmIChpc0luQ2xhc3NEZWZpbml0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyaWNUeXBlc0luQ2xhc3NEZWZpbml0aW9ucy5wdXNoKHsgdHlwZU5vZGU6IHR5cGVOb2RlLCBtb2R1bGU6IG1vZHVsZSB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJpY1R5cGVzLnB1c2goeyB0eXBlTm9kZTogdHlwZU5vZGUsIG1vZHVsZTogbW9kdWxlIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gbmV3IEFycmF5TGlzdDw+KCkgKHdpdGhvdXQgdHlwZSBQYXJhbWV0ZXJzISkgc2hvdWxkIGJlIGNhc3RhYmxlIHRvIEFOWSBvdGhlciB0eXBlIHdpdGggc2FtZSBuYW1lIHJlZ2FybGRlc3Mgb2YgaXQncyB0eXBlIHZhcmlhYmxlIHR5cGVzIChKYXZhIDctc3R5bGUhKVxyXG4gICAgICAgICAgICBsZXQgdHlwZSA9IHR5cGVOb2RlLnJlc29sdmVkVHlwZTtcclxuICAgICAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCAmJiB0eXBlIGluc3RhbmNlb2YgS2xhc3MgJiYgdHlwZS50eXBlVmFyaWFibGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCB0eXBlMSA9IDxLbGFzcz50eXBlLmNsb25lKCk7XHJcbiAgICAgICAgICAgICAgICB0eXBlMS50eXBlVmFyaWFibGVzID0gW107IC8vIG5vdyB0aGlzIHR5cGUgY2FuIGNhc3QgdG8gQU5ZIG90aGVyIHR5cGUgd2l0aCBzYW1lIG5hbWUgcmVnYXJkbGVzcyBvZiBpdCdzIHR5cGUgdmFyaWFibGUgdHlwZXMhXHJcbiAgICAgICAgICAgICAgICB0eXBlTm9kZS5yZXNvbHZlZFR5cGUgPSB0eXBlMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRBcnJheVR5cGUodHlwZTogVHlwZSwgYXJyYXlEaW1lbnNpb246IG51bWJlcikge1xyXG4gICAgd2hpbGUgKGFycmF5RGltZW5zaW9uID4gMCkge1xyXG4gICAgICAgIHR5cGUgPSBuZXcgQXJyYXlUeXBlKHR5cGUpO1xyXG4gICAgICAgIGFycmF5RGltZW5zaW9uLS07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdHlwZTtcclxufSJdfQ==