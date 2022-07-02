import { RuntimeObject } from "../../interpreter/RuntimeObject.js";
import { TokenType } from "../lexer/Token.js";
import { LabelManager } from "../parser/LabelManager.js";
import { ArrayType } from "./Array.js";
import { nullType, stringPrimitiveType } from "./PrimitiveTypes.js";
import { PrimitiveType, Type } from "./Types.js";
export var Visibility;
(function (Visibility) {
    Visibility[Visibility["public"] = 0] = "public";
    Visibility[Visibility["protected"] = 1] = "protected";
    Visibility[Visibility["private"] = 2] = "private";
})(Visibility || (Visibility = {}));
;
var booleanPrimitiveTypeCopy;
export function setBooleanPrimitiveTypeCopy(bpt) {
    booleanPrimitiveTypeCopy = bpt;
}
export class Klass extends Type {
    constructor(identifier, module, documentation) {
        super();
        // for Generics:
        this.typeVariables = [];
        this.isTypeVariable = false;
        this.typeVariablesReady = true;
        this.implements = [];
        this.firstPassImplements = [];
        this.isAbstract = false;
        this.postConstructorCallbacks = null;
        this.methods = [];
        this.methodMap = new Map();
        this.attributes = [];
        this.attributeMap = new Map();
        this.numberOfAttributesIncludingBaseClass = null;
        this.documentation = documentation;
        this.identifier = identifier;
        this.module = module;
        this.visibility = Visibility.public;
        this.staticClass = new StaticClass(this);
        this.attributeInitializationProgram = {
            method: null,
            module: this.module,
            statements: [],
            labelManager: null
        };
        this.attributeInitializationProgram.labelManager = new LabelManager(this.attributeInitializationProgram);
    }
    setupAttributeIndicesRecursive() {
        if (this.baseClass != null && this.baseClass.numberOfAttributesIncludingBaseClass == null) {
            this.baseClass.setupAttributeIndicesRecursive();
        }
        let numberOfAttributesInBaseClasses = this.baseClass == null ? 0 : this.baseClass.numberOfAttributesIncludingBaseClass;
        for (let a of this.attributes) {
            a.index = numberOfAttributesInBaseClasses++;
            // console.log(this.identifier + "." + a.identifier+ ": " + a.index);
        }
        this.numberOfAttributesIncludingBaseClass = numberOfAttributesInBaseClasses;
    }
    getNonGenericClass() {
        let k = this;
        while (k.isGenericVariantFrom != null)
            k = k.isGenericVariantFrom;
        return k;
    }
    getNonGenericIdentifier() {
        let k = this;
        while (k.isGenericVariantFrom != null)
            k = k.isGenericVariantFrom;
        return k.identifier;
    }
    implementsInterface(i) {
        let klass = this;
        while (klass != null) {
            for (let i1 of klass.implements) {
                if (i1.getThisOrExtendedInterface(i.getNonGenericIdentifier()) != null)
                    return true;
            }
            klass = klass.baseClass;
        }
        return false;
    }
    getImplementedInterface(identifier) {
        let klass = this;
        while (klass != null) {
            for (let i1 of klass.implements) {
                let i2 = i1.getThisOrExtendedInterface(identifier);
                if (i2 != null)
                    return i2;
            }
            klass = klass.baseClass;
        }
        return null;
    }
    registerUsedSystemClasses(usedSystemClasses) {
        if (this.baseClass != null && this.baseClass.module != null && this.baseClass.module.isSystemModule &&
            usedSystemClasses.indexOf(this.baseClass) < 0) {
            usedSystemClasses.push(this.baseClass);
        }
        for (let cd of this.getCompositeData()) {
            if (cd.klass != null && cd.klass.module != null && cd.klass.module.isSystemModule &&
                usedSystemClasses.indexOf(cd.klass) < 0) {
                usedSystemClasses.push(cd.klass);
            }
        }
        for (let interf of this.implements) {
            if (interf != null && interf.module.isSystemModule &&
                usedSystemClasses.indexOf(interf) < 0) {
                usedSystemClasses.push(interf);
            }
        }
    }
    getCompositeData() {
        let cd = [];
        let cdMap = new Map();
        for (let a of this.attributes) {
            if (a.type instanceof Klass || a.type instanceof Interface) {
                let cda = cdMap.get(a.type);
                if (cda == null) {
                    cda = {
                        klass: a.type,
                        multiples: false,
                        identifier: a.identifier
                    };
                    cdMap.set(a.type, cda);
                    cd.push(cda);
                }
                else {
                    cda.identifier += ", " + a.identifier;
                }
            }
            else {
                let type = a.type;
                while (type instanceof ArrayType) {
                    type = type.arrayOfType;
                }
                if (type instanceof Klass || type instanceof Interface) {
                    let cda = cdMap.get(type);
                    if (cda == null) {
                        cda = {
                            klass: type,
                            multiples: true,
                            identifier: a.identifier
                        };
                        cdMap.set(type, cda);
                        cd.push(cda);
                    }
                    else {
                        cda.identifier += ", " + a.identifier;
                        cda.multiples = true;
                    }
                }
            }
        }
        return cd;
    }
    clearUsagePositions() {
        super.clearUsagePositions();
        for (let m of this.methods) {
            m.clearUsagePositions();
        }
        for (let a of this.attributes) {
            a.usagePositions = new Map();
        }
        if (this.staticClass != null) {
            this.staticClass.clearUsagePositions();
        }
    }
    getPostConstructorCallbacks() {
        let c = this;
        let callbacks = null;
        while (c != null) {
            if (c.postConstructorCallbacks != null) {
                if (callbacks == null) {
                    callbacks = c.postConstructorCallbacks;
                }
                else {
                    callbacks = callbacks.concat(c.postConstructorCallbacks);
                }
            }
            c = c.baseClass;
        }
        return callbacks;
    }
    getCompletionItems(visibilityUpTo, leftBracketAlreadyThere, identifierAndBracketAfterCursor, rangeToReplace, currentMethod) {
        let itemList = [];
        for (let attribute of this.getAttributes(visibilityUpTo)) {
            itemList.push({
                label: attribute.identifier + "",
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: attribute.identifier,
                range: rangeToReplace,
                documentation: attribute.documentation == null ? undefined : {
                    value: attribute.documentation
                }
            });
        }
        for (let method of this.getMethods(visibilityUpTo)) {
            if (method.isConstructor) {
                if ((currentMethod === null || currentMethod === void 0 ? void 0 : currentMethod.isConstructor) && currentMethod != method && this.baseClass.methods.indexOf(method) >= 0) {
                    this.pushSuperCompletionItem(itemList, method, leftBracketAlreadyThere, rangeToReplace);
                    continue;
                }
                else {
                    continue;
                }
            }
            itemList.push({
                label: method.getCompletionLabel(),
                filterText: method.identifier,
                command: {
                    id: "editor.action.triggerParameterHints",
                    title: '123',
                    arguments: []
                },
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: method.getCompletionSnippet(leftBracketAlreadyThere),
                range: rangeToReplace,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: method.documentation == null ? undefined : {
                    value: method.documentation
                }
            });
        }
        itemList = itemList.concat(this.staticClass.getCompletionItems(visibilityUpTo, leftBracketAlreadyThere, identifierAndBracketAfterCursor, rangeToReplace));
        return itemList;
    }
    pushSuperCompletionItem(itemList, method, leftBracketAlreadyThere, rangeToReplace) {
        itemList.push({
            label: method.getCompletionLabel().replace(method.identifier, "super"),
            filterText: "super",
            command: {
                id: "editor.action.triggerParameterHints",
                title: '123',
                arguments: []
            },
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: method.getCompletionSnippet(leftBracketAlreadyThere).replace(method.identifier, "super"),
            range: rangeToReplace,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: method.documentation == null ? undefined : {
                value: method.documentation
            }
        });
    }
    pushStaticInitializationPrograms(programStack) {
        if (this.staticClass.attributeInitializationProgram.statements.length > 0) {
            programStack.push({
                program: this.staticClass.attributeInitializationProgram,
                programPosition: 0,
                textPosition: { line: 1, column: 1, length: 0 },
                method: "Initialisierung statischer Variablen der Klasse " + this.staticClass.identifier,
                callbackAfterReturn: null,
                isCalledFromOutside: "Initialisierung statischer Attribute"
            });
        }
    }
    getMethodBySignature(signature) {
        let c = this;
        while (c != null) {
            let method = c.methodMap.get(signature);
            if (method != null)
                return method;
            c = c.baseClass;
        }
        return null;
    }
    equals(type) {
        return type == this;
    }
    setBaseClass(baseClass) {
        this.baseClass = baseClass;
        this.staticClass.baseClass = baseClass.staticClass;
    }
    addMethod(method) {
        if (method.isConstructor) {
            method.returnType = null;
        }
        if (method.isStatic) {
            this.staticClass.addMethod(method);
        }
        else {
            this.methods.push(method);
            this.methodMap.set(method.signature, method);
        }
    }
    addAttribute(attribute) {
        if (attribute.isStatic) {
            this.staticClass.addAttribute(attribute);
        }
        else {
            this.attributes.push(attribute);
            this.attributeMap.set(attribute.identifier, attribute);
        }
    }
    getResultType(operation, secondOperandType) {
        if (operation == TokenType.equal || operation == TokenType.notEqual) {
            if (secondOperandType instanceof Klass || secondOperandType == nullType) {
                return booleanPrimitiveTypeCopy;
            }
        }
        if (operation == TokenType.keywordInstanceof) {
            if (secondOperandType instanceof StaticClass || secondOperandType instanceof Interface) {
                return booleanPrimitiveTypeCopy;
            }
        }
        return null;
    }
    compute(operation, firstOperand, secondOperand) {
        var _a;
        if (operation == TokenType.equal) {
            return firstOperand.value == secondOperand.value;
        }
        if (operation == TokenType.notEqual) {
            return firstOperand.value != secondOperand.value;
        }
        if (operation == TokenType.keywordInstanceof) {
            let firstOpClass = (_a = firstOperand === null || firstOperand === void 0 ? void 0 : firstOperand.value) === null || _a === void 0 ? void 0 : _a.class;
            if (firstOpClass == null)
                return false;
            let typeLeft = firstOpClass;
            let typeRight = secondOperand.type;
            if (typeRight instanceof StaticClass) {
                while (typeLeft != null) {
                    if (typeLeft === typeRight.Klass)
                        return true;
                    typeLeft = typeLeft.baseClass;
                }
                return false;
            }
            if (typeRight instanceof Interface) {
                while (typeLeft != null) {
                    for (let i of typeLeft.implements) {
                        if (i === typeRight)
                            return true;
                    }
                    typeLeft = typeLeft.baseClass;
                }
            }
            return false;
        }
        return null;
    }
    /**
     * returns all visible methods of this class and all of its base classes
     */
    getMethods(upToVisibility, identifier) {
        let methods = this.methods.filter((method) => {
            return method.visibility <= upToVisibility && (identifier == null || method.identifier == identifier);
        });
        if (this.baseClass != null && (identifier == null || identifier != this.identifier || methods.length == 0)) {
            let baseClassUptoVisibility = upToVisibility == Visibility.public ? upToVisibility : Visibility.protected;
            for (let m of this.baseClass.getMethods(baseClassUptoVisibility, identifier == this.identifier ? this.baseClass.identifier : identifier)) {
                let found = false;
                for (let m1 of methods) {
                    if (m1.signature == m.signature) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    methods.push(m);
                }
            }
        }
        return methods;
    }
    /**
     * returns all visible attributes of this class and all of its base classes
     */
    getAttributes(upToVisibility) {
        let attributes = [];
        for (let a of this.attributes) {
            if (a.visibility <= upToVisibility) {
                attributes.push(a);
            }
        }
        if (this.baseClass != null) {
            let upToVisibilityInBaseClass = upToVisibility == Visibility.public ? upToVisibility : Visibility.protected;
            for (let a of this.baseClass.getAttributes(upToVisibilityInBaseClass)) {
                let found = false;
                if (a.visibility > upToVisibilityInBaseClass)
                    continue;
                for (let a1 of attributes) {
                    if (a1.identifier == a.identifier) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    attributes.push(a);
                }
            }
        }
        return attributes;
    }
    hasConstructor() {
        for (let m of this.methods) {
            if (m.isConstructor)
                return true;
        }
        if (this.baseClass != null)
            return this.baseClass.hasConstructor();
        return false;
    }
    hasParameterlessConstructor() {
        let hasConstructorWithParameters = false;
        for (let m of this.methods) {
            if (m.isConstructor) {
                if (m.parameterlist.parameters.length == 0) {
                    return true;
                }
                else {
                    hasConstructorWithParameters = true;
                }
            }
        }
        if (!hasConstructorWithParameters && this.baseClass != null) {
            return this.baseClass.hasParameterlessConstructor();
        }
        return false;
    }
    getParameterlessConstructor() {
        for (let m of this.methods) {
            if (m.isConstructor && m.parameterlist.parameters.length == 0)
                return m;
        }
        if (this.baseClass != null) {
            return this.baseClass.getParameterlessConstructor();
        }
        return null;
    }
    getConstructor(parameterTypes, upToVisibility, classIdentifier = this.identifier) {
        let constructors = this.methods.filter((m) => {
            return m.isConstructor;
        });
        if (constructors.length == 0 && this.baseClass != null) {
            return this.baseClass.getConstructor(parameterTypes, upToVisibility, classIdentifier);
        }
        else {
            return findSuitableMethods(constructors, this.identifier, parameterTypes, classIdentifier, true);
        }
    }
    getMethodsThatFitWithCasting(identifier, parameterTypes, searchConstructor, upToVisibility) {
        let allMethods = this.getMethods(upToVisibility);
        let methods = findSuitableMethods(allMethods, identifier, parameterTypes, this.identifier, searchConstructor);
        if (methods.methodList.length == 0 && !searchConstructor) {
            let staticMethods = this.staticClass.getMethodsThatFitWithCasting(identifier, parameterTypes, false, upToVisibility);
            if (staticMethods.error == null) {
                return staticMethods;
            }
            return methods;
        }
        return methods;
    }
    getMethod(identifier, parameterlist) {
        let method = this.methodMap.get(identifier + parameterlist.id);
        if (method == null && this.baseClass != null) {
            return this.baseClass.getMethod(identifier, parameterlist);
        }
        return method;
    }
    getAttribute(identifier, upToVisibility) {
        let error = null;
        let foundButInvisible = false;
        let attribute = this.attributeMap.get(identifier);
        let attributeNotFound = attribute == null;
        if (attribute == null) {
            error = "Das Attribut " + identifier + " kann nicht gefunden werden.";
        }
        else if (attribute.visibility > upToVisibility) {
            error = "Das Attribut " + identifier + " hat die Sichtbarkeit " + Visibility[attribute.visibility] + " und ist daher hier nicht sichtbar.";
            attribute = null;
            foundButInvisible = true;
        }
        if (attribute == null && this.baseClass != null) {
            let upToVisibilityInBaseClass = upToVisibility == Visibility.public ? upToVisibility : Visibility.protected;
            let baseClassAttribute = this.baseClass.getAttribute(identifier, upToVisibilityInBaseClass);
            if (baseClassAttribute.attribute != null || attributeNotFound) {
                return baseClassAttribute;
            }
        }
        return { attribute: attribute, error: error, foundButInvisible: foundButInvisible };
    }
    canCastTo(type) {
        // casting something to a String by calling toString() is neither possible in Java nor makes sense in my opinion
        if (type instanceof Klass) {
            let baseClass = this;
            while (baseClass != null) {
                if (type.getNonGenericIdentifier() == baseClass.getNonGenericIdentifier()) {
                    if (type.typeVariables.length > 0) {
                        let n = Math.min(type.typeVariables.length, baseClass.typeVariables.length);
                        for (let i = 0; i < n; i++) {
                            if (!baseClass.typeVariables[i].type.canCastTo(type.typeVariables[i].type))
                                return false;
                        }
                        return true;
                    }
                    return true;
                }
                baseClass = baseClass.baseClass;
            }
        }
        if (type instanceof Interface) {
            let klass = this;
            while (klass != null) {
                for (let i of klass.implements) {
                    let shouldImplement = type.getNonGenericIdentifier();
                    // look recursively into interface inheritance chain:                    
                    if (i.getThisOrExtendedInterface(shouldImplement) != null) {
                        return true;
                    }
                }
                klass = klass.baseClass;
            }
        }
        return false;
    }
    castTo(value, type) {
        return value;
    }
    checkInheritance() {
        if (this.baseClass != null && Klass.dontInheritFrom.indexOf(this.baseClass.identifier) >= 0) {
            return { message: "Aus Performancegründen ist es leider nicht möglich, Unterklassen der Klassen String, Boolean, Character, Integer, Float und Double zu bilden.", missingMethods: [] };
        }
        let message = "";
        let missingAbstractMethods = [];
        let implementedMethods = [];
        let missingInterfaceMethods = [];
        let klass = this;
        let hierarchy = [klass.identifier];
        while (klass.baseClass != null) {
            klass = klass.baseClass;
            if (hierarchy.indexOf(klass.identifier) >= 0) {
                klass.baseClass = null; // This is necessary to avoid infinite loops in further compilation
                hierarchy = [klass.identifier].concat(hierarchy);
                message = "Die Klasse " + klass.identifier + " erbt von sich selbst: ";
                message += "(" + hierarchy.join(" extends ") + ")";
                break;
            }
            hierarchy = [klass.identifier].concat(hierarchy);
        }
        if (message == "") {
            if (this.baseClass != null) {
                let abstractMethods = [];
                let klass = this;
                // collect abstract Methods
                while (klass != null) {
                    for (let m of klass.methods) {
                        if (m.isAbstract) {
                            abstractMethods.push(m);
                            let isImplemented = false;
                            for (let m1 of implementedMethods) {
                                if (m1.implements(m)) {
                                    isImplemented = true;
                                    break;
                                }
                            }
                            if (!isImplemented) {
                                missingAbstractMethods.push(m);
                            }
                        }
                        else {
                            implementedMethods.push(m);
                        }
                    }
                    klass = klass.baseClass;
                }
            }
            if (missingAbstractMethods.length > 0 && !this.isAbstract) {
                message = "Die Klasse " + this.identifier + " muss noch folgende Methoden ihrer abstrakten Basisklassen implementieren: ";
                message += missingAbstractMethods.map((m) => m.getSignatureWithReturnParameter()).join(", ");
            }
            for (let i of this.implements) {
                for (let m of i.getMethods()) {
                    let isImplemented = false;
                    for (let m1 of implementedMethods) {
                        if (m1.implements(m)) {
                            isImplemented = true;
                            break;
                        }
                    }
                    if (!isImplemented) {
                        missingInterfaceMethods.push(m);
                    }
                }
            }
            if (missingInterfaceMethods.length > 0) {
                if (message != "")
                    message += "\n";
                message += "Die Klasse " + this.identifier + " muss noch folgende Methoden der von ihr implementierten Interfaces implementieren: ";
                message += missingInterfaceMethods.map((m) => m.signature).join(", ");
            }
        }
        return { message: message, missingMethods: missingAbstractMethods.concat(missingInterfaceMethods) };
    }
    hasAncestorOrIs(a) {
        let c = this;
        let id = a.identifier;
        if (a instanceof Klass)
            id = a.getNonGenericIdentifier();
        while (c != null) {
            if (c.getNonGenericIdentifier() == id)
                return true;
            c = c.baseClass;
        }
        return false;
    }
    debugOutput(value, maxLength = 40) {
        let s = "{";
        let attributes = this.getAttributes(Visibility.private);
        let object = value.value;
        if (object == null) {
            return "null";
        }
        for (let i = 0; i < attributes.length; i++) {
            let attribute = attributes[i];
            let v = object.getValue(attribute.index);
            if (attribute.type instanceof PrimitiveType) {
                s += attribute.identifier + ":&nbsp;" + attribute.type.debugOutput(v, maxLength / 2);
            }
            else {
                s += attribute.identifier + ":&nbsp; {...}";
            }
            if (i < attributes.length - 1) {
                s += ",&nbsp;";
            }
        }
        return s + "}";
    }
    // static count: number = 0;
    clone() {
        // Klass.count++;
        let newKlass = Object.create(this);
        newKlass.implements = this.implements.slice(0);
        newKlass.usagePositions = new Map();
        newKlass.isGenericVariantFrom = this;
        return newKlass;
    }
}
Klass.dontInheritFrom = ["Integer", "Float", "Double", "Boolean", "Character", "String", "Shape", "FilledShape"];
export class StaticClass extends Type {
    constructor(klass) {
        super();
        this.methods = [];
        this.methodMap = new Map();
        this.attributes = [];
        this.attributeMap = new Map();
        this.numberOfAttributesIncludingBaseClass = null;
        this.Klass = klass;
        this.identifier = klass.identifier;
        if (klass.baseClass != null) {
            this.baseClass = klass.baseClass.staticClass;
        }
        this.attributeInitializationProgram = {
            method: null,
            module: this.Klass.module,
            statements: [],
            labelManager: null
        };
        this.attributeInitializationProgram.labelManager = new LabelManager(this.attributeInitializationProgram);
    }
    setupAttributeIndicesRecursive() {
        if (this.baseClass != null && this.baseClass.numberOfAttributesIncludingBaseClass == null) {
            this.baseClass.setupAttributeIndicesRecursive();
        }
        let numberOfAttributesInBaseClasses = this.baseClass == null ? 0 : this.baseClass.numberOfAttributesIncludingBaseClass;
        for (let a of this.attributes) {
            a.index = numberOfAttributesInBaseClasses++;
            // console.log(this.identifier + "." + a.identifier+ ": " + a.index);
        }
        this.numberOfAttributesIncludingBaseClass = numberOfAttributesInBaseClasses;
    }
    clearUsagePositions() {
        super.clearUsagePositions();
        for (let m of this.methods) {
            m.clearUsagePositions();
        }
        for (let a of this.attributes) {
            a.usagePositions = new Map();
        }
    }
    debugOutput(value, maxLength = 40) {
        var _a;
        let s = "{";
        let attributes = this.getAttributes(Visibility.private);
        let object = this.classObject;
        if (attributes == null)
            return "{}";
        for (let i = 0; i < attributes.length; i++) {
            let attribute = attributes[i];
            s += attribute.identifier + ": " + object == null ? '---' : (_a = attribute.type) === null || _a === void 0 ? void 0 : _a.debugOutput(object.getValue(attribute.index), maxLength / 2);
            if (i < attributes.length - 1) {
                s += ", ";
            }
        }
        return s + "}";
    }
    getCompletionItems(visibilityUpTo, leftBracketAlreadyThere, identifierAndBracketAfterCursor, rangeToReplace) {
        let itemList = [];
        for (let attribute of this.getAttributes(visibilityUpTo)) {
            itemList.push({
                label: attribute.identifier,
                //@ts-ignore
                detail: attribute.color ? attribute.color : undefined,
                //@ts-ignore
                kind: attribute.color ? monaco.languages.CompletionItemKind.Color : monaco.languages.CompletionItemKind.Field,
                insertText: attribute.identifier,
                range: rangeToReplace,
                documentation: attribute.documentation == null ? undefined : {
                    value: attribute.documentation
                }
            });
        }
        for (let method of this.getMethods(visibilityUpTo)) {
            itemList.push({
                label: method.getCompletionLabel(),
                filterText: method.identifier,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: method.getCompletionSnippet(leftBracketAlreadyThere),
                range: rangeToReplace,
                command: {
                    id: "editor.action.triggerParameterHints",
                    title: '123',
                    arguments: []
                },
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: method.documentation == null ? undefined : {
                    value: method.documentation
                }
            });
        }
        return itemList;
    }
    equals(type) {
        return type == this;
    }
    addMethod(method) {
        this.methods.push(method);
        this.methodMap.set(method.signature, method);
    }
    addAttribute(attribute) {
        this.attributes.push(attribute);
        this.attributeMap.set(attribute.identifier, attribute);
    }
    getResultType(operation, secondOperandType) {
        return null;
    }
    compute(operation, firstOperand, secondOperand) {
        return null;
    }
    getMethodsThatFitWithCasting(identifier, parameterTypes, searchConstructor, upToVisibility) {
        return findSuitableMethods(this.getMethods(upToVisibility), identifier, parameterTypes, this.Klass.identifier, searchConstructor);
    }
    /**
     * returns all methods of this class and all of its base classes
     * @param isStatic returns only static methods if true
     */
    getMethods(upToVisibility, identifier) {
        let methods = this.methods.slice().filter((method) => {
            return method.visibility <= upToVisibility && (identifier == null || identifier == method.identifier);
        });
        if (this.baseClass != null) {
            let baseClassUptoVisibility = upToVisibility == Visibility.public ? Visibility.public : Visibility.protected;
            for (let m of this.baseClass.getMethods(baseClassUptoVisibility, identifier)) {
                let found = false;
                for (let m1 of methods) {
                    if (m1.signature == m.signature) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    methods.push(m);
                }
            }
        }
        return methods;
    }
    /**
     * returns all attributes of this class and all of its base classes
     * @param isStatic return only static attributes if true
     */
    getAttributes(visibilityUpTo) {
        let attributes = this.attributes.filter((attribute) => {
            return attribute.visibility <= visibilityUpTo;
        });
        if (this.baseClass != null) {
            let visibilityUpToBaseClass = visibilityUpTo == Visibility.public ? visibilityUpTo : Visibility.protected;
            for (let a of this.baseClass.getAttributes(visibilityUpToBaseClass)) {
                let found = false;
                for (let a1 of attributes) {
                    if (a1.identifier == a.identifier) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    attributes.push(a);
                }
            }
        }
        return attributes;
    }
    getMethod(identifier, parameterlist) {
        let method = this.methodMap.get(identifier + parameterlist.id);
        if (method == null && this.baseClass != null) {
            return this.baseClass.getMethod(identifier, parameterlist);
        }
        return method;
    }
    getAttribute(identifier, upToVisibility) {
        let error = "";
        let notFound = false;
        let attribute = this.attributeMap.get(identifier);
        if (attribute == null) {
            notFound = true;
            error = "Das Attribut " + identifier + " konnte nicht gefunden werden.";
        }
        else if (attribute.visibility > upToVisibility) {
            error = "Das Attribut " + identifier + " hat die Sichtbarkeit " + Visibility[attribute.visibility] + " und ist hier daher nicht sichtbar.";
            attribute = null;
        }
        if (attribute == null && this.baseClass != null) {
            let upToVisibilityInBaseClass = upToVisibility == Visibility.public ? upToVisibility : Visibility.protected;
            let baseClassAttributeWithError = this.baseClass.getAttribute(identifier, upToVisibilityInBaseClass);
            if (notFound) {
                return baseClassAttributeWithError;
            }
        }
        return { attribute: attribute, error: error, foundButInvisible: !notFound, staticClass: this };
    }
    canCastTo(type) {
        return false;
    }
    castTo(value, type) {
        return value;
    }
    hasAncestorOrIs(a) {
        let c = this;
        while (c != null) {
            if (c == a)
                return true;
            c = c.baseClass;
        }
        return false;
    }
}
export class Interface extends Type {
    constructor(identifier, module, documentation) {
        super();
        // for Generics:
        this.typeVariables = [];
        this.typeVariablesReady = true;
        this.extends = [];
        this.methods = [];
        this.methodMap = new Map();
        this.documentation = documentation;
        this.identifier = identifier;
        this.module = module;
    }
    getNonGenericIdentifier() {
        let k = this;
        while (k.isGenericVariantFrom != null)
            k = k.isGenericVariantFrom;
        return k.identifier;
    }
    getThisOrExtendedInterface(identifier) {
        if (this.getNonGenericIdentifier() == identifier)
            return this;
        for (let if1 of this.extends) {
            let if2 = if1.getThisOrExtendedInterface(identifier);
            if (if2 != null)
                return if2;
        }
        return null;
    }
    // static count: number = 0;
    clone() {
        // Interface.count++;
        let newInterface = Object.create(this);
        newInterface.usagePositions = new Map();
        newInterface.isGenericVariantFrom = this;
        return newInterface;
    }
    clearUsagePositions() {
        super.clearUsagePositions();
        for (let m of this.methods) {
            m.clearUsagePositions();
        }
    }
    getCompletionItems(leftBracketAlreadyThere, identifierAndBracketAfterCursor, rangeToReplace) {
        let itemList = [];
        for (let method of this.getMethods()) {
            itemList.push({
                label: method.getCompletionLabel(),
                filterText: method.identifier,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: method.getCompletionSnippet(leftBracketAlreadyThere),
                range: rangeToReplace,
                command: {
                    id: "editor.action.triggerParameterHints",
                    title: '123',
                    arguments: []
                },
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: method.documentation == null ? undefined : {
                    value: method.documentation
                }
            });
        }
        return itemList;
    }
    debugOutput(value, maxLength = 40) {
        if (value.value == null) {
            return "null";
        }
        else {
            if (value.value instanceof RuntimeObject) {
                return value.value.class.debugOutput(value);
            }
            else {
                return "{...}";
            }
        }
    }
    equals(type) {
        return type == this;
    }
    addMethod(method) {
        method.isAbstract = true;
        this.methods.push(method);
        this.methodMap.set(method.signature, method);
    }
    getResultType(operation, secondOperandType) {
        if (operation == TokenType.equal || operation == TokenType.notEqual) {
            return booleanPrimitiveTypeCopy;
        }
        if (operation == TokenType.keywordInstanceof) {
            if (secondOperandType instanceof StaticClass || secondOperandType instanceof Interface) {
                return booleanPrimitiveTypeCopy;
            }
        }
        return null;
    }
    compute(operation, firstOperand, secondOperand) {
        if (operation == TokenType.equal) {
            return firstOperand.value == secondOperand.value;
        }
        if (operation == TokenType.notEqual) {
            return firstOperand.value != secondOperand.value;
        }
        return null;
    }
    /**
     * returns all methods of this interface
     * @param isStatic is not used in interfaces
     */
    getMethods() {
        if (this.extends.length == 0)
            return this.methods;
        if (this.methodsWithSubInterfaces != null)
            return this.methodsWithSubInterfaces;
        let visitedInterfaces = {};
        let visitedMethods = {};
        this.methodsWithSubInterfaces = this.methods.slice(0);
        for (let m of this.methods)
            visitedMethods[m.signature] = true;
        visitedInterfaces[this.identifier] = true;
        let todo = this.extends.slice(0);
        while (todo.length > 0) {
            let interf = todo.pop();
            for (let m of interf.methods) {
                if (!visitedMethods[m.signature]) {
                    this.methodsWithSubInterfaces.push(m);
                    visitedMethods[m.signature] = true;
                }
            }
            for (let i of interf.extends) {
                if (!visitedInterfaces[i.identifier]) {
                    todo.push(i);
                    visitedInterfaces[i.identifier] = true;
                }
            }
        }
        return this.methodsWithSubInterfaces;
    }
    getMethod(identifier, parameterlist) {
        return this.methodMap.get(identifier + parameterlist.id);
    }
    canCastTo(type) {
        if (type instanceof Interface) {
            let nonGenericCastable = false;
            if (type.getNonGenericIdentifier() == this.getNonGenericIdentifier()) {
                nonGenericCastable = true;
                if (this.typeVariables.length == 0)
                    return true;
                let type2 = type;
                if (this.typeVariables.length != type2.typeVariables.length)
                    return false;
                for (let i = 0; i < this.typeVariables.length; i++) {
                    let tv = this.typeVariables[i];
                    let tvOther = type2.typeVariables[i];
                    if (!tvOther.type.canCastTo(tv.type))
                        return false;
                }
                return false;
            }
            else {
                for (let type1 of this.extends) {
                    if (type1.canCastTo(type)) {
                        return true;
                    }
                }
            }
            return false;
        }
        else {
            if (type instanceof Klass && type.getNonGenericIdentifier() == "Object") {
                return true;
            }
            return false;
        }
        // return (type instanceof Klass) || (type instanceof Interface);
    }
    castTo(value, type) {
        return value;
    }
    getMethodsThatFitWithCasting(identifier, parameterTypes, searchConstructor) {
        return findSuitableMethods(this.getMethods(), identifier, parameterTypes, this.identifier, searchConstructor);
    }
}
function findSuitableMethods(methodList, identifier, parameterTypes, classIdentifier, searchConstructor) {
    let suitableMethods = [];
    let howManyCastingsMax = 10000;
    let error = null;
    let oneWithCorrectIdentifierFound = false;
    for (let m of methodList) {
        let howManyCastings = 0;
        if (m.identifier == identifier || m.isConstructor && searchConstructor) {
            oneWithCorrectIdentifierFound = true;
            let isEllipsis = m.hasEllipsis();
            if (m.getParameterCount() == parameterTypes.length || (isEllipsis && m.getParameterCount() <= parameterTypes.length)) {
                let suits = true;
                let i = 0;
                for (i = 0; i < m.getParameterCount() - (isEllipsis ? 1 : 0); i++) {
                    let mParameterType = m.getParameterType(i);
                    let givenType = parameterTypes[i];
                    if (givenType == null) {
                        suits = false;
                        break;
                    }
                    if (mParameterType == givenType) {
                        continue;
                    }
                    if (givenType.canCastTo(mParameterType)) {
                        howManyCastings++;
                        /**
                         * Rechteck r;
                         * GNGFigur f;
                         * Bei f.berührt(r) gibt es eine Variante mit Parametertyp String (schlecht!) und
                         * eine mit Parametertyp Object. Letztere soll genommen werden, also:
                         */
                        if (mParameterType == stringPrimitiveType)
                            howManyCastings += 0.5;
                        continue;
                    }
                    suits = false;
                    break;
                }
                // Ellipsis!
                if (suits && isEllipsis) {
                    let mParameterEllipsis = m.getParameter(i);
                    let mParameterTypeEllispsis = mParameterEllipsis.type.arrayOfType;
                    for (let j = i; j < parameterTypes.length; j++) {
                        let givenType = parameterTypes[i];
                        if (givenType == null) {
                            suits = false;
                            break;
                        }
                        if (mParameterTypeEllispsis == givenType) {
                            continue;
                        }
                        if (givenType.canCastTo(mParameterTypeEllispsis)) {
                            howManyCastings++;
                            /**
                             * Rechteck r;
                             * GNGFigur f;
                             * Bei f.berührt(r) gibt es eine Variante mit Parametertyp String (schlecht!) und
                             * eine mit Parametertyp Object. Letztere soll genommen werden, also:
                             */
                            if (mParameterTypeEllispsis == stringPrimitiveType)
                                howManyCastings += 0.5;
                            continue;
                        }
                        suits = false;
                        break;
                    }
                }
                if (suits && howManyCastings <= howManyCastingsMax) {
                    if (howManyCastings < howManyCastingsMax) {
                        suitableMethods = [];
                    }
                    suitableMethods.push(m);
                    howManyCastingsMax = howManyCastings;
                }
            }
        }
    }
    if (suitableMethods.length == 0) {
        if (oneWithCorrectIdentifierFound) {
            if (parameterTypes.length == 0) {
                error = searchConstructor ? "Es gibt keinen parameterlosen Konstruktor der Klasse " + classIdentifier : "Die vorhandenen Methoden mit dem Bezeichner " + identifier + " haben alle mindestens einen Parameter. Hier wird aber kein Parameterwert übergeben.";
            }
            else {
                let typeString = parameterTypes.map(type => type === null || type === void 0 ? void 0 : type.identifier).join(", ");
                error = searchConstructor ? `Die Parametertypen (${typeString}) passen zu keinem Konstruktor der Klasse ${classIdentifier}` : `Die Parametertypen (${typeString}) passen zu keiner der vorhandenen Methoden mit dem Bezeichner ${identifier}.`;
            }
        }
        else {
            error = "Der Typ " + classIdentifier + " besitzt keine Methode mit dem Bezeichner " + identifier + ".";
            if (identifier == 'setCenter') {
                error += ' Tipp: Die Methode setCenter der Klasse Shape wurde umbenannt in "moveTo".';
            }
        }
    }
    if (suitableMethods.length > 1) {
        suitableMethods = suitableMethods.slice(0, 1);
        // error = "Zu den gegebenen Parametern hat der Typ " + classIdentifier + " mehrere passende Methoden.";
    }
    return {
        error: error,
        methodList: suitableMethods
    };
}
export function getVisibilityUpTo(objectType, currentClassContext) {
    if (currentClassContext == null) {
        return Visibility.public;
    }
    if (objectType instanceof StaticClass)
        objectType = objectType.Klass;
    if (currentClassContext instanceof StaticClass)
        currentClassContext = currentClassContext.Klass;
    if (objectType == currentClassContext) {
        return Visibility.private;
    }
    if (currentClassContext.hasAncestorOrIs(objectType)) {
        return Visibility.protected;
    }
    return Visibility.public;
}
export class UnboxableKlass extends Klass {
    constructor() {
        super(...arguments);
        this.unboxableAs = [];
    }
    castTo(value, type) {
        if (!(type instanceof PrimitiveType))
            return null;
        if (this.unboxableAs.includes(type)) {
            if (value.value == null && !type.allowsNull())
                throw Error("null kann nicht in einen primitiven " + type.identifier + " umgewandelt werden.");
            else
                return {
                    value: value.value,
                    type: type
                };
        }
        return null;
    }
    canCastTo(type) {
        return this.unboxableAs.indexOf(type) >= 0 || super.canCastTo(type);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2xhc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L2NvbXBpbGVyL3R5cGVzL0NsYXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRSxPQUFPLEVBQWdCLFNBQVMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzVELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUl6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEVBQXFCLE1BQU0scUJBQXFCLENBQUM7QUFDdkYsT0FBTyxFQUFvQyxhQUFhLEVBQUUsSUFBSSxFQUFTLE1BQU0sWUFBWSxDQUFDO0FBRzFGLE1BQU0sQ0FBTixJQUFZLFVBQXlDO0FBQXJELFdBQVksVUFBVTtJQUFHLCtDQUFNLENBQUE7SUFBRSxxREFBUyxDQUFBO0lBQUUsaURBQU8sQ0FBQTtBQUFDLENBQUMsRUFBekMsVUFBVSxLQUFWLFVBQVUsUUFBK0I7QUFBQSxDQUFDO0FBRXRELElBQUksd0JBQTZCLENBQUM7QUFDbEMsTUFBTSxVQUFVLDJCQUEyQixDQUFDLEdBQVM7SUFDakQsd0JBQXdCLEdBQUcsR0FBRyxDQUFDO0FBQ25DLENBQUM7QUFnQkQsTUFBTSxPQUFPLEtBQU0sU0FBUSxJQUFJO0lBcUMzQixZQUFZLFVBQWtCLEVBQUUsTUFBYyxFQUFFLGFBQXNCO1FBQ2xFLEtBQUssRUFBRSxDQUFDO1FBcENaLGdCQUFnQjtRQUNoQixrQkFBYSxHQUFtQixFQUFFLENBQUM7UUFFbkMsbUJBQWMsR0FBWSxLQUFLLENBQUM7UUFDaEMsdUJBQWtCLEdBQVksSUFBSSxDQUFDO1FBYW5DLGVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQzdCLHdCQUFtQixHQUFhLEVBQUUsQ0FBQztRQUVuQyxlQUFVLEdBQVks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Q0FBQyxVQUFVLEdBQUcsc0JBQXNCLENBQUMsQ0FBQzs7Z0JBQ3pJLE9BQU87b0JBQ1IsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO29CQUNsQixJQUFJLEVBQUUsSUFBSTtpQkFDYixDQUFBO1NBQ0o7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRUQsU0FBUyxDQUFDLElBQVU7UUFDaEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4RSxDQUFDO0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQcm9ncmFtU3RhY2tFbGVtZW50IH0gZnJvbSBcIi4uLy4uL2ludGVycHJldGVyL0ludGVycHJldGVyLmpzXCI7XHJcbmltcG9ydCB7IFJ1bnRpbWVPYmplY3QgfSBmcm9tIFwiLi4vLi4vaW50ZXJwcmV0ZXIvUnVudGltZU9iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBUZXh0UG9zaXRpb24sIFRva2VuVHlwZSB9IGZyb20gXCIuLi9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBMYWJlbE1hbmFnZXIgfSBmcm9tIFwiLi4vcGFyc2VyL0xhYmVsTWFuYWdlci5qc1wiO1xyXG5pbXBvcnQgeyBNb2R1bGUgfSBmcm9tIFwiLi4vcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBQcm9ncmFtIH0gZnJvbSBcIi4uL3BhcnNlci9Qcm9ncmFtLmpzXCI7XHJcbmltcG9ydCB7IFN5bWJvbFRhYmxlIH0gZnJvbSBcIi4uL3BhcnNlci9TeW1ib2xUYWJsZS5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheVR5cGUgfSBmcm9tIFwiLi9BcnJheS5qc1wiO1xyXG5pbXBvcnQgeyBudWxsVHlwZSwgc3RyaW5nUHJpbWl0aXZlVHlwZSwgdm9pZFByaW1pdGl2ZVR5cGUgfSBmcm9tIFwiLi9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBBdHRyaWJ1dGUsIE1ldGhvZCwgUGFyYW1ldGVybGlzdCwgUHJpbWl0aXZlVHlwZSwgVHlwZSwgVmFsdWUgfSBmcm9tIFwiLi9UeXBlcy5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBlbnVtIFZpc2liaWxpdHkgeyBwdWJsaWMsIHByb3RlY3RlZCwgcHJpdmF0ZSB9O1xyXG5cclxudmFyIGJvb2xlYW5QcmltaXRpdmVUeXBlQ29weTogYW55O1xyXG5leHBvcnQgZnVuY3Rpb24gc2V0Qm9vbGVhblByaW1pdGl2ZVR5cGVDb3B5KGJwdDogVHlwZSkge1xyXG4gICAgYm9vbGVhblByaW1pdGl2ZVR5cGVDb3B5ID0gYnB0O1xyXG59XHJcblxyXG4vLyBVc2VkIGZvciBjbGFzcyBkaWFncmFtczpcclxuZXhwb3J0IHR5cGUgQ29tcG9zdGlvbkRhdGEgPSB7IGtsYXNzOiBLbGFzcyB8IEludGVyZmFjZSwgbXVsdGlwbGVzOiBib29sZWFuLCBpZGVudGlmaWVyOiBzdHJpbmcgfTtcclxuXHJcbi8qKlxyXG4gKiBGb3IgR2VuZXJpYyB0eXBlc1xyXG4gKi9cclxuZXhwb3J0IHR5cGUgVHlwZVZhcmlhYmxlID0ge1xyXG4gICAgaWRlbnRpZmllcjogc3RyaW5nO1xyXG4gICAgdHlwZTogS2xhc3M7XHJcbiAgICBzY29wZUZyb206IFRleHRQb3NpdGlvbjtcclxuICAgIHNjb3BlVG86IFRleHRQb3NpdGlvbjtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBLbGFzcyBleHRlbmRzIFR5cGUge1xyXG5cclxuICAgIC8vIGZvciBHZW5lcmljczpcclxuICAgIHR5cGVWYXJpYWJsZXM6IFR5cGVWYXJpYWJsZVtdID0gW107XHJcbiAgICBpc0dlbmVyaWNWYXJpYW50RnJvbTogS2xhc3M7XHJcbiAgICBpc1R5cGVWYXJpYWJsZTogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgdHlwZVZhcmlhYmxlc1JlYWR5OiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBkb250SW5oZXJpdEZyb206IHN0cmluZ1tdID0gW1wiSW50ZWdlclwiLCBcIkZsb2F0XCIsIFwiRG91YmxlXCIsIFwiQm9vbGVhblwiLCBcIkNoYXJhY3RlclwiLCBcIlN0cmluZ1wiLCBcIlNoYXBlXCIsIFwiRmlsbGVkU2hhcGVcIl07XHJcblxyXG4gICAgYmFzZUNsYXNzOiBLbGFzcztcclxuICAgIGZpcnN0UGFzc0Jhc2VDbGFzczogc3RyaW5nO1xyXG5cclxuICAgIHN0YXRpY0NsYXNzOiBTdGF0aWNDbGFzcztcclxuXHJcbiAgICBtb2R1bGU6IE1vZHVsZTtcclxuXHJcbiAgICB2aXNpYmlsaXR5OiBWaXNpYmlsaXR5O1xyXG5cclxuICAgIGltcGxlbWVudHM6IEludGVyZmFjZVtdID0gW107XHJcbiAgICBmaXJzdFBhc3NJbXBsZW1lbnRzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgIGlzQWJzdHJhY3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBhdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW06IFByb2dyYW07XHJcblxyXG4gICAgcG9zdENvbnN0cnVjdG9yQ2FsbGJhY2tzOiAoKHI6IFJ1bnRpbWVPYmplY3QpID0+IHZvaWQpW10gPSBudWxsO1xyXG5cclxuICAgIHB1YmxpYyBtZXRob2RzOiBNZXRob2RbXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBtZXRob2RNYXA6IE1hcDxzdHJpbmcsIE1ldGhvZD4gPSBuZXcgTWFwKCk7XHJcblxyXG4gICAgcHVibGljIGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZVtdID0gW107XHJcbiAgICBwdWJsaWMgYXR0cmlidXRlTWFwOiBNYXA8c3RyaW5nLCBBdHRyaWJ1dGU+ID0gbmV3IE1hcCgpO1xyXG4gICAgcHVibGljIG51bWJlck9mQXR0cmlidXRlc0luY2x1ZGluZ0Jhc2VDbGFzczogbnVtYmVyID0gbnVsbDtcclxuXHJcbiAgICBwdWJsaWMgc3ltYm9sVGFibGU6IFN5bWJvbFRhYmxlO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGlkZW50aWZpZXI6IHN0cmluZywgbW9kdWxlOiBNb2R1bGUsIGRvY3VtZW50YXRpb24/OiBzdHJpbmcpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG5cclxuICAgICAgICB0aGlzLmRvY3VtZW50YXRpb24gPSBkb2N1bWVudGF0aW9uO1xyXG5cclxuICAgICAgICB0aGlzLmlkZW50aWZpZXIgPSBpZGVudGlmaWVyO1xyXG4gICAgICAgIHRoaXMubW9kdWxlID0gbW9kdWxlO1xyXG4gICAgICAgIHRoaXMudmlzaWJpbGl0eSA9IFZpc2liaWxpdHkucHVibGljO1xyXG5cclxuICAgICAgICB0aGlzLnN0YXRpY0NsYXNzID0gbmV3IFN0YXRpY0NsYXNzKHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLmF0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbSA9IHtcclxuICAgICAgICAgICAgbWV0aG9kOiBudWxsLFxyXG4gICAgICAgICAgICBtb2R1bGU6IHRoaXMubW9kdWxlLFxyXG4gICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXSxcclxuICAgICAgICAgICAgbGFiZWxNYW5hZ2VyOiBudWxsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0ubGFiZWxNYW5hZ2VyID0gbmV3IExhYmVsTWFuYWdlcih0aGlzLmF0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldHVwQXR0cmlidXRlSW5kaWNlc1JlY3Vyc2l2ZSgpIHtcclxuICAgICAgICBpZiAodGhpcy5iYXNlQ2xhc3MgIT0gbnVsbCAmJiB0aGlzLmJhc2VDbGFzcy5udW1iZXJPZkF0dHJpYnV0ZXNJbmNsdWRpbmdCYXNlQ2xhc3MgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmJhc2VDbGFzcy5zZXR1cEF0dHJpYnV0ZUluZGljZXNSZWN1cnNpdmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IG51bWJlck9mQXR0cmlidXRlc0luQmFzZUNsYXNzZXMgPSB0aGlzLmJhc2VDbGFzcyA9PSBudWxsID8gMCA6IHRoaXMuYmFzZUNsYXNzLm51bWJlck9mQXR0cmlidXRlc0luY2x1ZGluZ0Jhc2VDbGFzcztcclxuXHJcbiAgICAgICAgZm9yIChsZXQgYSBvZiB0aGlzLmF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgYS5pbmRleCA9IG51bWJlck9mQXR0cmlidXRlc0luQmFzZUNsYXNzZXMrKztcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2codGhpcy5pZGVudGlmaWVyICsgXCIuXCIgKyBhLmlkZW50aWZpZXIrIFwiOiBcIiArIGEuaW5kZXgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5udW1iZXJPZkF0dHJpYnV0ZXNJbmNsdWRpbmdCYXNlQ2xhc3MgPSBudW1iZXJPZkF0dHJpYnV0ZXNJbkJhc2VDbGFzc2VzO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgZ2V0Tm9uR2VuZXJpY0NsYXNzKCk6IEtsYXNzIHtcclxuICAgICAgICBsZXQgazogS2xhc3MgPSB0aGlzO1xyXG4gICAgICAgIHdoaWxlIChrLmlzR2VuZXJpY1ZhcmlhbnRGcm9tICE9IG51bGwpIGsgPSBrLmlzR2VuZXJpY1ZhcmlhbnRGcm9tO1xyXG4gICAgICAgIHJldHVybiBrO1xyXG4gICAgfVxyXG5cclxuICAgIGdldE5vbkdlbmVyaWNJZGVudGlmaWVyKCk6IHN0cmluZyB7XHJcbiAgICAgICAgbGV0IGs6IEtsYXNzID0gdGhpcztcclxuICAgICAgICB3aGlsZSAoay5pc0dlbmVyaWNWYXJpYW50RnJvbSAhPSBudWxsKSBrID0gay5pc0dlbmVyaWNWYXJpYW50RnJvbTtcclxuICAgICAgICByZXR1cm4gay5pZGVudGlmaWVyO1xyXG4gICAgfVxyXG5cclxuICAgIGltcGxlbWVudHNJbnRlcmZhY2UoaTogSW50ZXJmYWNlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IGtsYXNzOiBLbGFzcyA9IHRoaXM7XHJcbiAgICAgICAgd2hpbGUgKGtsYXNzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaTEgb2Yga2xhc3MuaW1wbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGkxLmdldFRoaXNPckV4dGVuZGVkSW50ZXJmYWNlKGkuZ2V0Tm9uR2VuZXJpY0lkZW50aWZpZXIoKSkgIT0gbnVsbCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAga2xhc3MgPSBrbGFzcy5iYXNlQ2xhc3M7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldEltcGxlbWVudGVkSW50ZXJmYWNlKGlkZW50aWZpZXI6IHN0cmluZyk6IEludGVyZmFjZSB7XHJcbiAgICAgICAgbGV0IGtsYXNzOiBLbGFzcyA9IHRoaXM7XHJcbiAgICAgICAgd2hpbGUgKGtsYXNzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaTEgb2Yga2xhc3MuaW1wbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGkyOiBJbnRlcmZhY2UgPSBpMS5nZXRUaGlzT3JFeHRlbmRlZEludGVyZmFjZShpZGVudGlmaWVyKTtcclxuICAgICAgICAgICAgICAgIGlmIChpMiAhPSBudWxsKSByZXR1cm4gaTI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAga2xhc3MgPSBrbGFzcy5iYXNlQ2xhc3M7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIHJlZ2lzdGVyVXNlZFN5c3RlbUNsYXNzZXModXNlZFN5c3RlbUNsYXNzZXM6IChLbGFzcyB8IEludGVyZmFjZSlbXSkge1xyXG4gICAgICAgIGlmICh0aGlzLmJhc2VDbGFzcyAhPSBudWxsICYmIHRoaXMuYmFzZUNsYXNzLm1vZHVsZSAhPSBudWxsICYmIHRoaXMuYmFzZUNsYXNzLm1vZHVsZS5pc1N5c3RlbU1vZHVsZSAmJlxyXG4gICAgICAgICAgICB1c2VkU3lzdGVtQ2xhc3Nlcy5pbmRleE9mKHRoaXMuYmFzZUNsYXNzKSA8IDApIHtcclxuICAgICAgICAgICAgdXNlZFN5c3RlbUNsYXNzZXMucHVzaCh0aGlzLmJhc2VDbGFzcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAobGV0IGNkIG9mIHRoaXMuZ2V0Q29tcG9zaXRlRGF0YSgpKSB7XHJcbiAgICAgICAgICAgIGlmIChjZC5rbGFzcyAhPSBudWxsICYmIGNkLmtsYXNzLm1vZHVsZSAhPSBudWxsICYmIGNkLmtsYXNzLm1vZHVsZS5pc1N5c3RlbU1vZHVsZSAmJlxyXG4gICAgICAgICAgICAgICAgdXNlZFN5c3RlbUNsYXNzZXMuaW5kZXhPZihjZC5rbGFzcykgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICB1c2VkU3lzdGVtQ2xhc3Nlcy5wdXNoKGNkLmtsYXNzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKGxldCBpbnRlcmYgb2YgdGhpcy5pbXBsZW1lbnRzKSB7XHJcbiAgICAgICAgICAgIGlmIChpbnRlcmYgIT0gbnVsbCAmJiBpbnRlcmYubW9kdWxlLmlzU3lzdGVtTW9kdWxlICYmXHJcbiAgICAgICAgICAgICAgICB1c2VkU3lzdGVtQ2xhc3Nlcy5pbmRleE9mKGludGVyZikgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICB1c2VkU3lzdGVtQ2xhc3Nlcy5wdXNoKGludGVyZik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29tcG9zaXRlRGF0YSgpOiBDb21wb3N0aW9uRGF0YVtdIHtcclxuXHJcbiAgICAgICAgbGV0IGNkOiBDb21wb3N0aW9uRGF0YVtdID0gW107XHJcbiAgICAgICAgbGV0IGNkTWFwOiBNYXA8S2xhc3MgfCBJbnRlcmZhY2UsIENvbXBvc3Rpb25EYXRhPiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgYSBvZiB0aGlzLmF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgaWYgKGEudHlwZSBpbnN0YW5jZW9mIEtsYXNzIHx8IGEudHlwZSBpbnN0YW5jZW9mIEludGVyZmFjZSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNkYSA9IGNkTWFwLmdldChhLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNkYSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2RhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBrbGFzczogYS50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBhLmlkZW50aWZpZXJcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGNkTWFwLnNldChhLnR5cGUsIGNkYSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2QucHVzaChjZGEpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjZGEuaWRlbnRpZmllciArPSBcIiwgXCIgKyBhLmlkZW50aWZpZXI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZTogVHlwZSA9IGEudHlwZTtcclxuICAgICAgICAgICAgICAgIHdoaWxlICh0eXBlIGluc3RhbmNlb2YgQXJyYXlUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IHR5cGUuYXJyYXlPZlR5cGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZSBpbnN0YW5jZW9mIEtsYXNzIHx8IHR5cGUgaW5zdGFuY2VvZiBJbnRlcmZhY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY2RhID0gY2RNYXAuZ2V0KHR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZGEgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjZGEgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrbGFzczogdHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpcGxlczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGEuaWRlbnRpZmllclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjZE1hcC5zZXQodHlwZSwgY2RhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2QucHVzaChjZGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNkYS5pZGVudGlmaWVyICs9IFwiLCBcIiArIGEuaWRlbnRpZmllcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2RhLm11bHRpcGxlcyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY2Q7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNsZWFyVXNhZ2VQb3NpdGlvbnMoKSB7XHJcbiAgICAgICAgc3VwZXIuY2xlYXJVc2FnZVBvc2l0aW9ucygpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtIG9mIHRoaXMubWV0aG9kcykge1xyXG4gICAgICAgICAgICBtLmNsZWFyVXNhZ2VQb3NpdGlvbnMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGEgb2YgdGhpcy5hdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIGEudXNhZ2VQb3NpdGlvbnMgPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5zdGF0aWNDbGFzcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGljQ2xhc3MuY2xlYXJVc2FnZVBvc2l0aW9ucygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGdldFBvc3RDb25zdHJ1Y3RvckNhbGxiYWNrcygpOiAoKHI6IFJ1bnRpbWVPYmplY3QpID0+IHZvaWQpW10ge1xyXG4gICAgICAgIGxldCBjOiBLbGFzcyA9IHRoaXM7XHJcbiAgICAgICAgbGV0IGNhbGxiYWNrczogKChyOiBSdW50aW1lT2JqZWN0KSA9PiB2b2lkKVtdID0gbnVsbDtcclxuXHJcbiAgICAgICAgd2hpbGUgKGMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpZiAoYy5wb3N0Q29uc3RydWN0b3JDYWxsYmFja3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrcyA9PSBudWxsKSB7IGNhbGxiYWNrcyA9IGMucG9zdENvbnN0cnVjdG9yQ2FsbGJhY2tzOyB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3MgPSBjYWxsYmFja3MuY29uY2F0KGMucG9zdENvbnN0cnVjdG9yQ2FsbGJhY2tzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjID0gYy5iYXNlQ2xhc3M7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjYWxsYmFja3M7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29tcGxldGlvbkl0ZW1zKHZpc2liaWxpdHlVcFRvOiBWaXNpYmlsaXR5LFxyXG4gICAgICAgIGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlOiBib29sZWFuLCBpZGVudGlmaWVyQW5kQnJhY2tldEFmdGVyQ3Vyc29yOiBzdHJpbmcsXHJcbiAgICAgICAgcmFuZ2VUb1JlcGxhY2U6IG1vbmFjby5JUmFuZ2UsIGN1cnJlbnRNZXRob2Q/OiBNZXRob2QpOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtW10ge1xyXG5cclxuICAgICAgICBsZXQgaXRlbUxpc3Q6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1bXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgb2YgdGhpcy5nZXRBdHRyaWJ1dGVzKHZpc2liaWxpdHlVcFRvKSkge1xyXG4gICAgICAgICAgICBpdGVtTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiBhdHRyaWJ1dGUuaWRlbnRpZmllciArIFwiXCIsXHJcbiAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5GaWVsZCxcclxuICAgICAgICAgICAgICAgIGluc2VydFRleHQ6IGF0dHJpYnV0ZS5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHJhbmdlVG9SZXBsYWNlLFxyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnRhdGlvbjogYXR0cmlidXRlLmRvY3VtZW50YXRpb24gPT0gbnVsbCA/IHVuZGVmaW5lZCA6IHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogYXR0cmlidXRlLmRvY3VtZW50YXRpb25cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBtZXRob2Qgb2YgdGhpcy5nZXRNZXRob2RzKHZpc2liaWxpdHlVcFRvKSkge1xyXG4gICAgICAgICAgICBpZiAobWV0aG9kLmlzQ29uc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50TWV0aG9kPy5pc0NvbnN0cnVjdG9yICYmIGN1cnJlbnRNZXRob2QgIT0gbWV0aG9kICYmIHRoaXMuYmFzZUNsYXNzLm1ldGhvZHMuaW5kZXhPZihtZXRob2QpID49IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdXBlckNvbXBsZXRpb25JdGVtKGl0ZW1MaXN0LCBtZXRob2QsIGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlLCByYW5nZVRvUmVwbGFjZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpdGVtTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiBtZXRob2QuZ2V0Q29tcGxldGlvbkxhYmVsKCksXHJcbiAgICAgICAgICAgICAgICBmaWx0ZXJUZXh0OiBtZXRob2QuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgIGNvbW1hbmQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJlZGl0b3IuYWN0aW9uLnRyaWdnZXJQYXJhbWV0ZXJIaW50c1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnMTIzJyxcclxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtdXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAga2luZDogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUtpbmQuTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogbWV0aG9kLmdldENvbXBsZXRpb25TbmlwcGV0KGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlKSxcclxuICAgICAgICAgICAgICAgIHJhbmdlOiByYW5nZVRvUmVwbGFjZSxcclxuICAgICAgICAgICAgICAgIGluc2VydFRleHRSdWxlczogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUluc2VydFRleHRSdWxlLkluc2VydEFzU25pcHBldCxcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50YXRpb246IG1ldGhvZC5kb2N1bWVudGF0aW9uID09IG51bGwgPyB1bmRlZmluZWQgOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG1ldGhvZC5kb2N1bWVudGF0aW9uXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaXRlbUxpc3QgPSBpdGVtTGlzdC5jb25jYXQodGhpcy5zdGF0aWNDbGFzcy5nZXRDb21wbGV0aW9uSXRlbXModmlzaWJpbGl0eVVwVG8sXHJcbiAgICAgICAgICAgIGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlLCBpZGVudGlmaWVyQW5kQnJhY2tldEFmdGVyQ3Vyc29yLFxyXG4gICAgICAgICAgICByYW5nZVRvUmVwbGFjZSkpO1xyXG5cclxuICAgICAgICByZXR1cm4gaXRlbUxpc3Q7XHJcbiAgICB9XHJcblxyXG4gICAgcHVzaFN1cGVyQ29tcGxldGlvbkl0ZW0oaXRlbUxpc3Q6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1bXSwgbWV0aG9kOiBNZXRob2QsIGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlOiBib29sZWFuLFxyXG4gICAgICAgIHJhbmdlVG9SZXBsYWNlOiBtb25hY28uSVJhbmdlKSB7XHJcbiAgICAgICAgaXRlbUxpc3QucHVzaCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiBtZXRob2QuZ2V0Q29tcGxldGlvbkxhYmVsKCkucmVwbGFjZShtZXRob2QuaWRlbnRpZmllciwgXCJzdXBlclwiKSxcclxuICAgICAgICAgICAgZmlsdGVyVGV4dDogXCJzdXBlclwiLFxyXG4gICAgICAgICAgICBjb21tYW5kOiB7XHJcbiAgICAgICAgICAgICAgICBpZDogXCJlZGl0b3IuYWN0aW9uLnRyaWdnZXJQYXJhbWV0ZXJIaW50c1wiLFxyXG4gICAgICAgICAgICAgICAgdGl0bGU6ICcxMjMnLFxyXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbXVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5NZXRob2QsXHJcbiAgICAgICAgICAgIGluc2VydFRleHQ6IG1ldGhvZC5nZXRDb21wbGV0aW9uU25pcHBldChsZWZ0QnJhY2tldEFscmVhZHlUaGVyZSkucmVwbGFjZShtZXRob2QuaWRlbnRpZmllciwgXCJzdXBlclwiKSxcclxuICAgICAgICAgICAgcmFuZ2U6IHJhbmdlVG9SZXBsYWNlLFxyXG4gICAgICAgICAgICBpbnNlcnRUZXh0UnVsZXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1JbnNlcnRUZXh0UnVsZS5JbnNlcnRBc1NuaXBwZXQsXHJcbiAgICAgICAgICAgIGRvY3VtZW50YXRpb246IG1ldGhvZC5kb2N1bWVudGF0aW9uID09IG51bGwgPyB1bmRlZmluZWQgOiB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogbWV0aG9kLmRvY3VtZW50YXRpb25cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdXNoU3RhdGljSW5pdGlhbGl6YXRpb25Qcm9ncmFtcyhwcm9ncmFtU3RhY2s6IFByb2dyYW1TdGFja0VsZW1lbnRbXSkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5zdGF0aWNDbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHByb2dyYW1TdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgIHByb2dyYW06IHRoaXMuc3RhdGljQ2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtLFxyXG4gICAgICAgICAgICAgICAgcHJvZ3JhbVBvc2l0aW9uOiAwLFxyXG4gICAgICAgICAgICAgICAgdGV4dFBvc2l0aW9uOiB7IGxpbmU6IDEsIGNvbHVtbjogMSwgbGVuZ3RoOiAwIH0sXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6IFwiSW5pdGlhbGlzaWVydW5nIHN0YXRpc2NoZXIgVmFyaWFibGVuIGRlciBLbGFzc2UgXCIgKyB0aGlzLnN0YXRpY0NsYXNzLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja0FmdGVyUmV0dXJuOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgaXNDYWxsZWRGcm9tT3V0c2lkZTogXCJJbml0aWFsaXNpZXJ1bmcgc3RhdGlzY2hlciBBdHRyaWJ1dGVcIlxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldE1ldGhvZEJ5U2lnbmF0dXJlKHNpZ25hdHVyZTogc3RyaW5nKTogTWV0aG9kIHtcclxuXHJcbiAgICAgICAgbGV0IGM6IEtsYXNzID0gdGhpcztcclxuICAgICAgICB3aGlsZSAoYyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBjLm1ldGhvZE1hcC5nZXQoc2lnbmF0dXJlKTtcclxuICAgICAgICAgICAgaWYgKG1ldGhvZCAhPSBudWxsKSByZXR1cm4gbWV0aG9kO1xyXG4gICAgICAgICAgICBjID0gYy5iYXNlQ2xhc3M7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGVxdWFscyh0eXBlOiBUeXBlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHR5cGUgPT0gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBzZXRCYXNlQ2xhc3MoYmFzZUNsYXNzOiBLbGFzcykge1xyXG4gICAgICAgIHRoaXMuYmFzZUNsYXNzID0gYmFzZUNsYXNzO1xyXG4gICAgICAgIHRoaXMuc3RhdGljQ2xhc3MuYmFzZUNsYXNzID0gYmFzZUNsYXNzLnN0YXRpY0NsYXNzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhZGRNZXRob2QobWV0aG9kOiBNZXRob2QpIHtcclxuICAgICAgICBpZiAobWV0aG9kLmlzQ29uc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgbWV0aG9kLnJldHVyblR5cGUgPSBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobWV0aG9kLmlzU3RhdGljKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGljQ2xhc3MuYWRkTWV0aG9kKG1ldGhvZCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5tZXRob2RzLnB1c2gobWV0aG9kKTtcclxuICAgICAgICAgICAgdGhpcy5tZXRob2RNYXAuc2V0KG1ldGhvZC5zaWduYXR1cmUsIG1ldGhvZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhZGRBdHRyaWJ1dGUoYXR0cmlidXRlOiBBdHRyaWJ1dGUpIHtcclxuICAgICAgICBpZiAoYXR0cmlidXRlLmlzU3RhdGljKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGljQ2xhc3MuYWRkQXR0cmlidXRlKGF0dHJpYnV0ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLnB1c2goYXR0cmlidXRlKTtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVNYXAuc2V0KGF0dHJpYnV0ZS5pZGVudGlmaWVyLCBhdHRyaWJ1dGUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0UmVzdWx0VHlwZShvcGVyYXRpb246IFRva2VuVHlwZSwgc2Vjb25kT3BlcmFuZFR5cGU/OiBUeXBlKTogVHlwZSB7XHJcblxyXG4gICAgICAgIGlmIChvcGVyYXRpb24gPT0gVG9rZW5UeXBlLmVxdWFsIHx8IG9wZXJhdGlvbiA9PSBUb2tlblR5cGUubm90RXF1YWwpIHtcclxuICAgICAgICAgICAgaWYgKHNlY29uZE9wZXJhbmRUeXBlIGluc3RhbmNlb2YgS2xhc3MgfHwgc2Vjb25kT3BlcmFuZFR5cGUgPT0gbnVsbFR5cGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBib29sZWFuUHJpbWl0aXZlVHlwZUNvcHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcGVyYXRpb24gPT0gVG9rZW5UeXBlLmtleXdvcmRJbnN0YW5jZW9mKSB7XHJcbiAgICAgICAgICAgIGlmIChzZWNvbmRPcGVyYW5kVHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzIHx8IHNlY29uZE9wZXJhbmRUeXBlIGluc3RhbmNlb2YgSW50ZXJmYWNlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYm9vbGVhblByaW1pdGl2ZVR5cGVDb3B5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNvbXB1dGUob3BlcmF0aW9uOiBUb2tlblR5cGUsIGZpcnN0T3BlcmFuZDogVmFsdWUsIHNlY29uZE9wZXJhbmQ/OiBWYWx1ZSkge1xyXG4gICAgICAgIGlmIChvcGVyYXRpb24gPT0gVG9rZW5UeXBlLmVxdWFsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmaXJzdE9wZXJhbmQudmFsdWUgPT0gc2Vjb25kT3BlcmFuZC52YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcGVyYXRpb24gPT0gVG9rZW5UeXBlLm5vdEVxdWFsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmaXJzdE9wZXJhbmQudmFsdWUgIT0gc2Vjb25kT3BlcmFuZC52YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcGVyYXRpb24gPT0gVG9rZW5UeXBlLmtleXdvcmRJbnN0YW5jZW9mKSB7XHJcbiAgICAgICAgICAgIGxldCBmaXJzdE9wQ2xhc3MgPSBmaXJzdE9wZXJhbmQ/LnZhbHVlPy5jbGFzcztcclxuICAgICAgICAgICAgaWYgKGZpcnN0T3BDbGFzcyA9PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGxldCB0eXBlTGVmdDogS2xhc3MgPSA8S2xhc3M+Zmlyc3RPcENsYXNzO1xyXG4gICAgICAgICAgICBsZXQgdHlwZVJpZ2h0ID0gc2Vjb25kT3BlcmFuZC50eXBlO1xyXG4gICAgICAgICAgICBpZiAodHlwZVJpZ2h0IGluc3RhbmNlb2YgU3RhdGljQ2xhc3MpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB3aGlsZSAodHlwZUxlZnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlTGVmdCA9PT0gdHlwZVJpZ2h0LktsYXNzKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlTGVmdCA9IHR5cGVMZWZ0LmJhc2VDbGFzcztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodHlwZVJpZ2h0IGluc3RhbmNlb2YgSW50ZXJmYWNlKSB7XHJcbiAgICAgICAgICAgICAgICB3aGlsZSAodHlwZUxlZnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgb2YgdHlwZUxlZnQuaW1wbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gdHlwZVJpZ2h0KSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZUxlZnQgPSB0eXBlTGVmdC5iYXNlQ2xhc3M7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIGFsbCB2aXNpYmxlIG1ldGhvZHMgb2YgdGhpcyBjbGFzcyBhbmQgYWxsIG9mIGl0cyBiYXNlIGNsYXNzZXNcclxuICAgICAqL1xyXG4gICAgcHVibGljIGdldE1ldGhvZHModXBUb1Zpc2liaWxpdHk6IFZpc2liaWxpdHksIGlkZW50aWZpZXI/OiBzdHJpbmcpOiBNZXRob2RbXSB7XHJcblxyXG4gICAgICAgIGxldCBtZXRob2RzOiBNZXRob2RbXSA9IHRoaXMubWV0aG9kcy5maWx0ZXIoKG1ldGhvZCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gbWV0aG9kLnZpc2liaWxpdHkgPD0gdXBUb1Zpc2liaWxpdHkgJiYgKGlkZW50aWZpZXIgPT0gbnVsbCB8fCBtZXRob2QuaWRlbnRpZmllciA9PSBpZGVudGlmaWVyKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYmFzZUNsYXNzICE9IG51bGwgJiYgKGlkZW50aWZpZXIgPT0gbnVsbCB8fCBpZGVudGlmaWVyICE9IHRoaXMuaWRlbnRpZmllciB8fCBtZXRob2RzLmxlbmd0aCA9PSAwKSkge1xyXG4gICAgICAgICAgICBsZXQgYmFzZUNsYXNzVXB0b1Zpc2liaWxpdHkgPSB1cFRvVmlzaWJpbGl0eSA9PSBWaXNpYmlsaXR5LnB1YmxpYyA/IHVwVG9WaXNpYmlsaXR5IDogVmlzaWJpbGl0eS5wcm90ZWN0ZWQ7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBtIG9mIHRoaXMuYmFzZUNsYXNzLmdldE1ldGhvZHMoYmFzZUNsYXNzVXB0b1Zpc2liaWxpdHksIGlkZW50aWZpZXIgPT0gdGhpcy5pZGVudGlmaWVyID8gdGhpcy5iYXNlQ2xhc3MuaWRlbnRpZmllciA6IGlkZW50aWZpZXIpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBtMSBvZiBtZXRob2RzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG0xLnNpZ25hdHVyZSA9PSBtLnNpZ25hdHVyZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kcy5wdXNoKG0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1ldGhvZHM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIGFsbCB2aXNpYmxlIGF0dHJpYnV0ZXMgb2YgdGhpcyBjbGFzcyBhbmQgYWxsIG9mIGl0cyBiYXNlIGNsYXNzZXNcclxuICAgICAqL1xyXG4gICAgcHVibGljIGdldEF0dHJpYnV0ZXModXBUb1Zpc2liaWxpdHk6IFZpc2liaWxpdHkpOiBBdHRyaWJ1dGVbXSB7XHJcblxyXG4gICAgICAgIGxldCBhdHRyaWJ1dGVzOiBBdHRyaWJ1dGVbXSA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGEgb2YgdGhpcy5hdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIGlmIChhLnZpc2liaWxpdHkgPD0gdXBUb1Zpc2liaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXMucHVzaChhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYmFzZUNsYXNzICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB1cFRvVmlzaWJpbGl0eUluQmFzZUNsYXNzID0gdXBUb1Zpc2liaWxpdHkgPT0gVmlzaWJpbGl0eS5wdWJsaWMgPyB1cFRvVmlzaWJpbGl0eSA6IFZpc2liaWxpdHkucHJvdGVjdGVkO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgYSBvZiB0aGlzLmJhc2VDbGFzcy5nZXRBdHRyaWJ1dGVzKHVwVG9WaXNpYmlsaXR5SW5CYXNlQ2xhc3MpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGEudmlzaWJpbGl0eSA+IHVwVG9WaXNpYmlsaXR5SW5CYXNlQ2xhc3MpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGExIG9mIGF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYTEuaWRlbnRpZmllciA9PSBhLmlkZW50aWZpZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXMucHVzaChhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBhdHRyaWJ1dGVzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoYXNDb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBmb3IgKGxldCBtIG9mIHRoaXMubWV0aG9kcykge1xyXG4gICAgICAgICAgICBpZiAobS5pc0NvbnN0cnVjdG9yKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmJhc2VDbGFzcyAhPSBudWxsKSByZXR1cm4gdGhpcy5iYXNlQ2xhc3MuaGFzQ29uc3RydWN0b3IoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBoYXNQYXJhbWV0ZXJsZXNzQ29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgbGV0IGhhc0NvbnN0cnVjdG9yV2l0aFBhcmFtZXRlcnM6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBmb3IgKGxldCBtIG9mIHRoaXMubWV0aG9kcykge1xyXG4gICAgICAgICAgICBpZiAobS5pc0NvbnN0cnVjdG9yKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobS5wYXJhbWV0ZXJsaXN0LnBhcmFtZXRlcnMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFzQ29uc3RydWN0b3JXaXRoUGFyYW1ldGVycyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWhhc0NvbnN0cnVjdG9yV2l0aFBhcmFtZXRlcnMgJiYgdGhpcy5iYXNlQ2xhc3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5iYXNlQ2xhc3MuaGFzUGFyYW1ldGVybGVzc0NvbnN0cnVjdG9yKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldFBhcmFtZXRlcmxlc3NDb25zdHJ1Y3RvcigpOiBNZXRob2Qge1xyXG4gICAgICAgIGZvciAobGV0IG0gb2YgdGhpcy5tZXRob2RzKSB7XHJcbiAgICAgICAgICAgIGlmIChtLmlzQ29uc3RydWN0b3IgJiYgbS5wYXJhbWV0ZXJsaXN0LnBhcmFtZXRlcnMubGVuZ3RoID09IDApIHJldHVybiBtO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYmFzZUNsYXNzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYmFzZUNsYXNzLmdldFBhcmFtZXRlcmxlc3NDb25zdHJ1Y3RvcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHB1YmxpYyBnZXRDb25zdHJ1Y3RvcihwYXJhbWV0ZXJUeXBlczogVHlwZVtdLCB1cFRvVmlzaWJpbGl0eTogVmlzaWJpbGl0eSwgY2xhc3NJZGVudGlmaWVyOiBzdHJpbmcgPSB0aGlzLmlkZW50aWZpZXIpOiB7IGVycm9yOiBzdHJpbmcsIG1ldGhvZExpc3Q6IE1ldGhvZFtdIH0ge1xyXG5cclxuICAgICAgICBsZXQgY29uc3RydWN0b3JzOiBNZXRob2RbXSA9IHRoaXMubWV0aG9kcy5maWx0ZXIoKG0pID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIG0uaXNDb25zdHJ1Y3RvcjtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYgKGNvbnN0cnVjdG9ycy5sZW5ndGggPT0gMCAmJiB0aGlzLmJhc2VDbGFzcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmJhc2VDbGFzcy5nZXRDb25zdHJ1Y3RvcihwYXJhbWV0ZXJUeXBlcywgdXBUb1Zpc2liaWxpdHksIGNsYXNzSWRlbnRpZmllcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZpbmRTdWl0YWJsZU1ldGhvZHMoY29uc3RydWN0b3JzLCB0aGlzLmlkZW50aWZpZXIsIHBhcmFtZXRlclR5cGVzLCBjbGFzc0lkZW50aWZpZXIsIHRydWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldE1ldGhvZHNUaGF0Rml0V2l0aENhc3RpbmcoaWRlbnRpZmllcjogc3RyaW5nLCBwYXJhbWV0ZXJUeXBlczogVHlwZVtdLFxyXG4gICAgICAgIHNlYXJjaENvbnN0cnVjdG9yOiBib29sZWFuLCB1cFRvVmlzaWJpbGl0eTogVmlzaWJpbGl0eSk6IHsgZXJyb3I6IHN0cmluZywgbWV0aG9kTGlzdDogTWV0aG9kW10gfSB7XHJcblxyXG4gICAgICAgIGxldCBhbGxNZXRob2RzID0gdGhpcy5nZXRNZXRob2RzKHVwVG9WaXNpYmlsaXR5KTtcclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZHMgPSBmaW5kU3VpdGFibGVNZXRob2RzKGFsbE1ldGhvZHMsIGlkZW50aWZpZXIsIHBhcmFtZXRlclR5cGVzLCB0aGlzLmlkZW50aWZpZXIsIHNlYXJjaENvbnN0cnVjdG9yKTtcclxuXHJcbiAgICAgICAgaWYgKG1ldGhvZHMubWV0aG9kTGlzdC5sZW5ndGggPT0gMCAmJiAhc2VhcmNoQ29uc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgbGV0IHN0YXRpY01ldGhvZHMgPSB0aGlzLnN0YXRpY0NsYXNzLmdldE1ldGhvZHNUaGF0Rml0V2l0aENhc3RpbmcoaWRlbnRpZmllciwgcGFyYW1ldGVyVHlwZXMsIGZhbHNlLCB1cFRvVmlzaWJpbGl0eSk7XHJcbiAgICAgICAgICAgIGlmIChzdGF0aWNNZXRob2RzLmVycm9yID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzdGF0aWNNZXRob2RzO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbWV0aG9kcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtZXRob2RzO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0TWV0aG9kKGlkZW50aWZpZXI6IHN0cmluZywgcGFyYW1ldGVybGlzdDogUGFyYW1ldGVybGlzdCk6IE1ldGhvZCB7XHJcblxyXG4gICAgICAgIGxldCBtZXRob2QgPSB0aGlzLm1ldGhvZE1hcC5nZXQoaWRlbnRpZmllciArIHBhcmFtZXRlcmxpc3QuaWQpO1xyXG5cclxuICAgICAgICBpZiAobWV0aG9kID09IG51bGwgJiYgdGhpcy5iYXNlQ2xhc3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5iYXNlQ2xhc3MuZ2V0TWV0aG9kKGlkZW50aWZpZXIsIHBhcmFtZXRlcmxpc3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1ldGhvZDtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0QXR0cmlidXRlKGlkZW50aWZpZXI6IHN0cmluZywgdXBUb1Zpc2liaWxpdHk6IFZpc2liaWxpdHkpOiB7IGF0dHJpYnV0ZTogQXR0cmlidXRlLCBlcnJvcjogc3RyaW5nLCBmb3VuZEJ1dEludmlzaWJsZTogYm9vbGVhbiB9IHtcclxuXHJcbiAgICAgICAgbGV0IGVycm9yID0gbnVsbDtcclxuICAgICAgICBsZXQgZm91bmRCdXRJbnZpc2libGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgbGV0IGF0dHJpYnV0ZSA9IHRoaXMuYXR0cmlidXRlTWFwLmdldChpZGVudGlmaWVyKTtcclxuICAgICAgICBsZXQgYXR0cmlidXRlTm90Rm91bmQgPSBhdHRyaWJ1dGUgPT0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKGF0dHJpYnV0ZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGVycm9yID0gXCJEYXMgQXR0cmlidXQgXCIgKyBpZGVudGlmaWVyICsgXCIga2FubiBuaWNodCBnZWZ1bmRlbiB3ZXJkZW4uXCI7XHJcbiAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGUudmlzaWJpbGl0eSA+IHVwVG9WaXNpYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICBlcnJvciA9IFwiRGFzIEF0dHJpYnV0IFwiICsgaWRlbnRpZmllciArIFwiIGhhdCBkaWUgU2ljaHRiYXJrZWl0IFwiICsgVmlzaWJpbGl0eVthdHRyaWJ1dGUudmlzaWJpbGl0eV0gKyBcIiB1bmQgaXN0IGRhaGVyIGhpZXIgbmljaHQgc2ljaHRiYXIuXCI7XHJcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGUgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgZm91bmRCdXRJbnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhdHRyaWJ1dGUgPT0gbnVsbCAmJiB0aGlzLmJhc2VDbGFzcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCB1cFRvVmlzaWJpbGl0eUluQmFzZUNsYXNzID0gdXBUb1Zpc2liaWxpdHkgPT0gVmlzaWJpbGl0eS5wdWJsaWMgPyB1cFRvVmlzaWJpbGl0eSA6IFZpc2liaWxpdHkucHJvdGVjdGVkO1xyXG5cclxuICAgICAgICAgICAgbGV0IGJhc2VDbGFzc0F0dHJpYnV0ZSA9IHRoaXMuYmFzZUNsYXNzLmdldEF0dHJpYnV0ZShpZGVudGlmaWVyLCB1cFRvVmlzaWJpbGl0eUluQmFzZUNsYXNzKTtcclxuICAgICAgICAgICAgaWYgKGJhc2VDbGFzc0F0dHJpYnV0ZS5hdHRyaWJ1dGUgIT0gbnVsbCB8fCBhdHRyaWJ1dGVOb3RGb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VDbGFzc0F0dHJpYnV0ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IGF0dHJpYnV0ZTogYXR0cmlidXRlLCBlcnJvcjogZXJyb3IsIGZvdW5kQnV0SW52aXNpYmxlOiBmb3VuZEJ1dEludmlzaWJsZSB9O1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBjYW5DYXN0VG8odHlwZTogVHlwZSk6IGJvb2xlYW4ge1xyXG5cclxuICAgICAgICAvLyBjYXN0aW5nIHNvbWV0aGluZyB0byBhIFN0cmluZyBieSBjYWxsaW5nIHRvU3RyaW5nKCkgaXMgbmVpdGhlciBwb3NzaWJsZSBpbiBKYXZhIG5vciBtYWtlcyBzZW5zZSBpbiBteSBvcGluaW9uXHJcblxyXG4gICAgICAgIGlmICh0eXBlIGluc3RhbmNlb2YgS2xhc3MpIHtcclxuICAgICAgICAgICAgbGV0IGJhc2VDbGFzczogS2xhc3MgPSB0aGlzO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKGJhc2VDbGFzcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZS5nZXROb25HZW5lcmljSWRlbnRpZmllcigpID09IGJhc2VDbGFzcy5nZXROb25HZW5lcmljSWRlbnRpZmllcigpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUudHlwZVZhcmlhYmxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuOiBudW1iZXIgPSBNYXRoLm1pbih0eXBlLnR5cGVWYXJpYWJsZXMubGVuZ3RoLCBiYXNlQ2xhc3MudHlwZVZhcmlhYmxlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFiYXNlQ2xhc3MudHlwZVZhcmlhYmxlc1tpXS50eXBlLmNhbkNhc3RUbyh0eXBlLnR5cGVWYXJpYWJsZXNbaV0udHlwZSkpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBiYXNlQ2xhc3MgPSBiYXNlQ2xhc3MuYmFzZUNsYXNzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodHlwZSBpbnN0YW5jZW9mIEludGVyZmFjZSkge1xyXG5cclxuICAgICAgICAgICAgbGV0IGtsYXNzOiBLbGFzcyA9IHRoaXM7XHJcbiAgICAgICAgICAgIHdoaWxlIChrbGFzcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpIG9mIGtsYXNzLmltcGxlbWVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc2hvdWxkSW1wbGVtZW50ID0gdHlwZS5nZXROb25HZW5lcmljSWRlbnRpZmllcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGxvb2sgcmVjdXJzaXZlbHkgaW50byBpbnRlcmZhY2UgaW5oZXJpdGFuY2UgY2hhaW46ICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaS5nZXRUaGlzT3JFeHRlbmRlZEludGVyZmFjZShzaG91bGRJbXBsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAga2xhc3MgPSBrbGFzcy5iYXNlQ2xhc3M7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNhc3RUbyh2YWx1ZTogVmFsdWUsIHR5cGU6IFR5cGUpOiBWYWx1ZSB7XHJcblxyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2hlY2tJbmhlcml0YW5jZSgpOiB7IG1lc3NhZ2U6IHN0cmluZywgbWlzc2luZ01ldGhvZHM6IE1ldGhvZFtdIH0ge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5iYXNlQ2xhc3MgIT0gbnVsbCAmJiBLbGFzcy5kb250SW5oZXJpdEZyb20uaW5kZXhPZih0aGlzLmJhc2VDbGFzcy5pZGVudGlmaWVyKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IG1lc3NhZ2U6IFwiQXVzIFBlcmZvcm1hbmNlZ3LDvG5kZW4gaXN0IGVzIGxlaWRlciBuaWNodCBtw7ZnbGljaCwgVW50ZXJrbGFzc2VuIGRlciBLbGFzc2VuIFN0cmluZywgQm9vbGVhbiwgQ2hhcmFjdGVyLCBJbnRlZ2VyLCBGbG9hdCB1bmQgRG91YmxlIHp1IGJpbGRlbi5cIiwgbWlzc2luZ01ldGhvZHM6IFtdIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbWVzc2FnZSA9IFwiXCI7XHJcbiAgICAgICAgbGV0IG1pc3NpbmdBYnN0cmFjdE1ldGhvZHM6IE1ldGhvZFtdID0gW107XHJcbiAgICAgICAgbGV0IGltcGxlbWVudGVkTWV0aG9kczogTWV0aG9kW10gPSBbXTtcclxuXHJcbiAgICAgICAgbGV0IG1pc3NpbmdJbnRlcmZhY2VNZXRob2RzOiBNZXRob2RbXSA9IFtdO1xyXG5cclxuICAgICAgICBsZXQga2xhc3M6IEtsYXNzID0gdGhpcztcclxuICAgICAgICBsZXQgaGllcmFyY2h5OiBzdHJpbmdbXSA9IFtrbGFzcy5pZGVudGlmaWVyXTtcclxuICAgICAgICB3aGlsZSAoa2xhc3MuYmFzZUNsYXNzICE9IG51bGwpIHtcclxuICAgICAgICAgICAga2xhc3MgPSBrbGFzcy5iYXNlQ2xhc3M7XHJcbiAgICAgICAgICAgIGlmIChoaWVyYXJjaHkuaW5kZXhPZihrbGFzcy5pZGVudGlmaWVyKSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBrbGFzcy5iYXNlQ2xhc3MgPSBudWxsOyAgLy8gVGhpcyBpcyBuZWNlc3NhcnkgdG8gYXZvaWQgaW5maW5pdGUgbG9vcHMgaW4gZnVydGhlciBjb21waWxhdGlvblxyXG4gICAgICAgICAgICAgICAgaGllcmFyY2h5ID0gW2tsYXNzLmlkZW50aWZpZXJdLmNvbmNhdChoaWVyYXJjaHkpO1xyXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiRGllIEtsYXNzZSBcIiArIGtsYXNzLmlkZW50aWZpZXIgKyBcIiBlcmJ0IHZvbiBzaWNoIHNlbGJzdDogXCI7XHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlICs9IFwiKFwiICsgaGllcmFyY2h5LmpvaW4oXCIgZXh0ZW5kcyBcIikgKyBcIilcIjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGhpZXJhcmNoeSA9IFtrbGFzcy5pZGVudGlmaWVyXS5jb25jYXQoaGllcmFyY2h5KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtZXNzYWdlID09IFwiXCIpIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJhc2VDbGFzcyAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGFic3RyYWN0TWV0aG9kczogTWV0aG9kW10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQga2xhc3M6IEtsYXNzID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBjb2xsZWN0IGFic3RyYWN0IE1ldGhvZHNcclxuICAgICAgICAgICAgICAgIHdoaWxlIChrbGFzcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgbSBvZiBrbGFzcy5tZXRob2RzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtLmlzQWJzdHJhY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFic3RyYWN0TWV0aG9kcy5wdXNoKG0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlzSW1wbGVtZW50ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IG0xIG9mIGltcGxlbWVudGVkTWV0aG9kcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtMS5pbXBsZW1lbnRzKG0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzSW1wbGVtZW50ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzSW1wbGVtZW50ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW5nQWJzdHJhY3RNZXRob2RzLnB1c2gobSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbXBsZW1lbnRlZE1ldGhvZHMucHVzaChtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBrbGFzcyA9IGtsYXNzLmJhc2VDbGFzcztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChtaXNzaW5nQWJzdHJhY3RNZXRob2RzLmxlbmd0aCA+IDAgJiYgIXRoaXMuaXNBYnN0cmFjdCkge1xyXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiRGllIEtsYXNzZSBcIiArIHRoaXMuaWRlbnRpZmllciArIFwiIG11c3Mgbm9jaCBmb2xnZW5kZSBNZXRob2RlbiBpaHJlciBhYnN0cmFrdGVuIEJhc2lza2xhc3NlbiBpbXBsZW1lbnRpZXJlbjogXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZSArPSBtaXNzaW5nQWJzdHJhY3RNZXRob2RzLm1hcCgobSkgPT4gbS5nZXRTaWduYXR1cmVXaXRoUmV0dXJuUGFyYW1ldGVyKCkpLmpvaW4oXCIsIFwiKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgb2YgdGhpcy5pbXBsZW1lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBtIG9mIGkuZ2V0TWV0aG9kcygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGlzSW1wbGVtZW50ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBtMSBvZiBpbXBsZW1lbnRlZE1ldGhvZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG0xLmltcGxlbWVudHMobSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzSW1wbGVtZW50ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0ltcGxlbWVudGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3NpbmdJbnRlcmZhY2VNZXRob2RzLnB1c2gobSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobWlzc2luZ0ludGVyZmFjZU1ldGhvZHMubGVuZ3RoID4gMCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlICE9IFwiXCIpIG1lc3NhZ2UgKz0gXCJcXG5cIjtcclxuXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlICs9IFwiRGllIEtsYXNzZSBcIiArIHRoaXMuaWRlbnRpZmllciArIFwiIG11c3Mgbm9jaCBmb2xnZW5kZSBNZXRob2RlbiBkZXIgdm9uIGlociBpbXBsZW1lbnRpZXJ0ZW4gSW50ZXJmYWNlcyBpbXBsZW1lbnRpZXJlbjogXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZSArPSBtaXNzaW5nSW50ZXJmYWNlTWV0aG9kcy5tYXAoKG0pID0+IG0uc2lnbmF0dXJlKS5qb2luKFwiLCBcIik7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHsgbWVzc2FnZTogbWVzc2FnZSwgbWlzc2luZ01ldGhvZHM6IG1pc3NpbmdBYnN0cmFjdE1ldGhvZHMuY29uY2F0KG1pc3NpbmdJbnRlcmZhY2VNZXRob2RzKSB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBoYXNBbmNlc3Rvck9ySXMoYTogS2xhc3MgfCBTdGF0aWNDbGFzcykge1xyXG4gICAgICAgIGxldCBjOiBLbGFzcyB8IFN0YXRpY0NsYXNzID0gdGhpcztcclxuICAgICAgICBsZXQgaWQgPSBhLmlkZW50aWZpZXI7XHJcbiAgICAgICAgaWYgKGEgaW5zdGFuY2VvZiBLbGFzcykgaWQgPSBhLmdldE5vbkdlbmVyaWNJZGVudGlmaWVyKCk7XHJcblxyXG4gICAgICAgIHdoaWxlIChjICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKGMuZ2V0Tm9uR2VuZXJpY0lkZW50aWZpZXIoKSA9PSBpZCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIGMgPSBjLmJhc2VDbGFzcztcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBkZWJ1Z091dHB1dCh2YWx1ZTogVmFsdWUsIG1heExlbmd0aDogbnVtYmVyID0gNDApOiBzdHJpbmcge1xyXG5cclxuICAgICAgICBsZXQgczogc3RyaW5nID0gXCJ7XCI7XHJcbiAgICAgICAgbGV0IGF0dHJpYnV0ZXMgPSB0aGlzLmdldEF0dHJpYnV0ZXMoVmlzaWJpbGl0eS5wcml2YXRlKTtcclxuICAgICAgICBsZXQgb2JqZWN0ID0gPFJ1bnRpbWVPYmplY3Q+dmFsdWUudmFsdWU7XHJcblxyXG4gICAgICAgIGlmIChvYmplY3QgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJudWxsXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBhdHRyaWJ1dGUgPSBhdHRyaWJ1dGVzW2ldO1xyXG4gICAgICAgICAgICBsZXQgdiA9IG9iamVjdC5nZXRWYWx1ZShhdHRyaWJ1dGUuaW5kZXgpO1xyXG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlLnR5cGUgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBzICs9IGF0dHJpYnV0ZS5pZGVudGlmaWVyICsgXCI6Jm5ic3A7XCIgKyBhdHRyaWJ1dGUudHlwZS5kZWJ1Z091dHB1dCh2LCBtYXhMZW5ndGggLyAyKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHMgKz0gYXR0cmlidXRlLmlkZW50aWZpZXIgKyBcIjombmJzcDsgey4uLn1cIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaSA8IGF0dHJpYnV0ZXMubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgcyArPSBcIiwmbmJzcDtcIjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBzICsgXCJ9XCI7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gc3RhdGljIGNvdW50OiBudW1iZXIgPSAwO1xyXG4gICAgY2xvbmUoKTogS2xhc3Mge1xyXG4gICAgICAgIC8vIEtsYXNzLmNvdW50Kys7XHJcblxyXG4gICAgICAgIGxldCBuZXdLbGFzczogS2xhc3MgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xyXG5cclxuICAgICAgICBuZXdLbGFzcy5pbXBsZW1lbnRzID0gdGhpcy5pbXBsZW1lbnRzLnNsaWNlKDApO1xyXG4gICAgICAgIG5ld0tsYXNzLnVzYWdlUG9zaXRpb25zID0gbmV3IE1hcCgpO1xyXG4gICAgICAgIG5ld0tsYXNzLmlzR2VuZXJpY1ZhcmlhbnRGcm9tID0gdGhpcztcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ld0tsYXNzO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFN0YXRpY0NsYXNzIGV4dGVuZHMgVHlwZSB7XHJcblxyXG4gICAgYmFzZUNsYXNzOiBTdGF0aWNDbGFzcztcclxuICAgIEtsYXNzOiBLbGFzcztcclxuICAgIC8vIFRPRE86IEluaXRpYWxpemVcclxuICAgIGNsYXNzT2JqZWN0OiBSdW50aW1lT2JqZWN0O1xyXG5cclxuICAgIGF0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbTogUHJvZ3JhbTtcclxuXHJcbiAgICBwdWJsaWMgbWV0aG9kczogTWV0aG9kW10gPSBbXTtcclxuICAgIHByaXZhdGUgbWV0aG9kTWFwOiBNYXA8c3RyaW5nLCBNZXRob2Q+ID0gbmV3IE1hcCgpO1xyXG5cclxuICAgIHB1YmxpYyBhdHRyaWJ1dGVzOiBBdHRyaWJ1dGVbXSA9IFtdO1xyXG4gICAgcHVibGljIGF0dHJpYnV0ZU1hcDogTWFwPHN0cmluZywgQXR0cmlidXRlPiA9IG5ldyBNYXAoKTtcclxuICAgIHB1YmxpYyBudW1iZXJPZkF0dHJpYnV0ZXNJbmNsdWRpbmdCYXNlQ2xhc3M6IG51bWJlciA9IG51bGw7XHJcblxyXG4gICAgY29uc3RydWN0b3Ioa2xhc3M6IEtsYXNzKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuXHJcbiAgICAgICAgdGhpcy5LbGFzcyA9IGtsYXNzO1xyXG4gICAgICAgIHRoaXMuaWRlbnRpZmllciA9IGtsYXNzLmlkZW50aWZpZXI7XHJcblxyXG4gICAgICAgIGlmIChrbGFzcy5iYXNlQ2xhc3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmJhc2VDbGFzcyA9IGtsYXNzLmJhc2VDbGFzcy5zdGF0aWNDbGFzcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtID0ge1xyXG4gICAgICAgICAgICBtZXRob2Q6IG51bGwsXHJcbiAgICAgICAgICAgIG1vZHVsZTogdGhpcy5LbGFzcy5tb2R1bGUsXHJcbiAgICAgICAgICAgIHN0YXRlbWVudHM6IFtdLFxyXG4gICAgICAgICAgICBsYWJlbE1hbmFnZXI6IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtLmxhYmVsTWFuYWdlciA9IG5ldyBMYWJlbE1hbmFnZXIodGhpcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXR1cEF0dHJpYnV0ZUluZGljZXNSZWN1cnNpdmUoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuYmFzZUNsYXNzICE9IG51bGwgJiYgdGhpcy5iYXNlQ2xhc3MubnVtYmVyT2ZBdHRyaWJ1dGVzSW5jbHVkaW5nQmFzZUNsYXNzID09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5iYXNlQ2xhc3Muc2V0dXBBdHRyaWJ1dGVJbmRpY2VzUmVjdXJzaXZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBudW1iZXJPZkF0dHJpYnV0ZXNJbkJhc2VDbGFzc2VzID0gdGhpcy5iYXNlQ2xhc3MgPT0gbnVsbCA/IDAgOiB0aGlzLmJhc2VDbGFzcy5udW1iZXJPZkF0dHJpYnV0ZXNJbmNsdWRpbmdCYXNlQ2xhc3M7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGEgb2YgdGhpcy5hdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIGEuaW5kZXggPSBudW1iZXJPZkF0dHJpYnV0ZXNJbkJhc2VDbGFzc2VzKys7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuaWRlbnRpZmllciArIFwiLlwiICsgYS5pZGVudGlmaWVyKyBcIjogXCIgKyBhLmluZGV4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubnVtYmVyT2ZBdHRyaWJ1dGVzSW5jbHVkaW5nQmFzZUNsYXNzID0gbnVtYmVyT2ZBdHRyaWJ1dGVzSW5CYXNlQ2xhc3NlcztcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNsZWFyVXNhZ2VQb3NpdGlvbnMoKSB7XHJcbiAgICAgICAgc3VwZXIuY2xlYXJVc2FnZVBvc2l0aW9ucygpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtIG9mIHRoaXMubWV0aG9kcykge1xyXG4gICAgICAgICAgICBtLmNsZWFyVXNhZ2VQb3NpdGlvbnMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGEgb2YgdGhpcy5hdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIGEudXNhZ2VQb3NpdGlvbnMgPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGVidWdPdXRwdXQodmFsdWU6IFZhbHVlLCBtYXhMZW5ndGg6IG51bWJlciA9IDQwKTogc3RyaW5nIHtcclxuXHJcbiAgICAgICAgbGV0IHM6IHN0cmluZyA9IFwie1wiO1xyXG4gICAgICAgIGxldCBhdHRyaWJ1dGVzID0gdGhpcy5nZXRBdHRyaWJ1dGVzKFZpc2liaWxpdHkucHJpdmF0ZSk7XHJcbiAgICAgICAgbGV0IG9iamVjdCA9IHRoaXMuY2xhc3NPYmplY3Q7XHJcblxyXG4gICAgICAgIGlmIChhdHRyaWJ1dGVzID09IG51bGwpIHJldHVybiBcInt9XCI7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xyXG5cclxuICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZSA9IGF0dHJpYnV0ZXNbaV07XHJcbiAgICAgICAgICAgIHMgKz0gYXR0cmlidXRlLmlkZW50aWZpZXIgKyBcIjogXCIgKyBvYmplY3QgPT0gbnVsbCA/ICctLS0nIDogYXR0cmlidXRlLnR5cGU/LmRlYnVnT3V0cHV0KG9iamVjdC5nZXRWYWx1ZShhdHRyaWJ1dGUuaW5kZXgpLCBtYXhMZW5ndGggLyAyKTtcclxuICAgICAgICAgICAgaWYgKGkgPCBhdHRyaWJ1dGVzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIHMgKz0gXCIsIFwiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHMgKyBcIn1cIjtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZ2V0Q29tcGxldGlvbkl0ZW1zKHZpc2liaWxpdHlVcFRvOiBWaXNpYmlsaXR5LFxyXG4gICAgICAgIGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlOiBib29sZWFuLCBpZGVudGlmaWVyQW5kQnJhY2tldEFmdGVyQ3Vyc29yOiBzdHJpbmcsXHJcbiAgICAgICAgcmFuZ2VUb1JlcGxhY2U6IG1vbmFjby5JUmFuZ2UpOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtW10ge1xyXG5cclxuICAgICAgICBsZXQgaXRlbUxpc3Q6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1bXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgb2YgdGhpcy5nZXRBdHRyaWJ1dGVzKHZpc2liaWxpdHlVcFRvKSkge1xyXG5cclxuICAgICAgICAgICAgaXRlbUxpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogYXR0cmlidXRlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgIGRldGFpbDogYXR0cmlidXRlLmNvbG9yID8gYXR0cmlidXRlLmNvbG9yIDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICBraW5kOiBhdHRyaWJ1dGUuY29sb3IgPyBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5Db2xvciA6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1LaW5kLkZpZWxkLFxyXG4gICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogYXR0cmlidXRlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICByYW5nZTogcmFuZ2VUb1JlcGxhY2UsXHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudGF0aW9uOiBhdHRyaWJ1dGUuZG9jdW1lbnRhdGlvbiA9PSBudWxsID8gdW5kZWZpbmVkIDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBhdHRyaWJ1dGUuZG9jdW1lbnRhdGlvblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IG1ldGhvZCBvZiB0aGlzLmdldE1ldGhvZHModmlzaWJpbGl0eVVwVG8pKSB7XHJcbiAgICAgICAgICAgIGl0ZW1MaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6IG1ldGhvZC5nZXRDb21wbGV0aW9uTGFiZWwoKSxcclxuICAgICAgICAgICAgICAgIGZpbHRlclRleHQ6IG1ldGhvZC5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAga2luZDogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUtpbmQuTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogbWV0aG9kLmdldENvbXBsZXRpb25TbmlwcGV0KGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlKSxcclxuICAgICAgICAgICAgICAgIHJhbmdlOiByYW5nZVRvUmVwbGFjZSxcclxuICAgICAgICAgICAgICAgIGNvbW1hbmQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJlZGl0b3IuYWN0aW9uLnRyaWdnZXJQYXJhbWV0ZXJIaW50c1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnMTIzJyxcclxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtdXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJ1bGVzOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtSW5zZXJ0VGV4dFJ1bGUuSW5zZXJ0QXNTbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnRhdGlvbjogbWV0aG9kLmRvY3VtZW50YXRpb24gPT0gbnVsbCA/IHVuZGVmaW5lZCA6IHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbWV0aG9kLmRvY3VtZW50YXRpb25cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaXRlbUxpc3Q7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGVxdWFscyh0eXBlOiBUeXBlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHR5cGUgPT0gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYWRkTWV0aG9kKG1ldGhvZDogTWV0aG9kKSB7XHJcbiAgICAgICAgdGhpcy5tZXRob2RzLnB1c2gobWV0aG9kKTtcclxuICAgICAgICB0aGlzLm1ldGhvZE1hcC5zZXQobWV0aG9kLnNpZ25hdHVyZSwgbWV0aG9kKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYWRkQXR0cmlidXRlKGF0dHJpYnV0ZTogQXR0cmlidXRlKSB7XHJcbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLnB1c2goYXR0cmlidXRlKTtcclxuICAgICAgICB0aGlzLmF0dHJpYnV0ZU1hcC5zZXQoYXR0cmlidXRlLmlkZW50aWZpZXIsIGF0dHJpYnV0ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldFJlc3VsdFR5cGUob3BlcmF0aW9uOiBUb2tlblR5cGUsIHNlY29uZE9wZXJhbmRUeXBlPzogVHlwZSk6IFR5cGUge1xyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNvbXB1dGUob3BlcmF0aW9uOiBUb2tlblR5cGUsIGZpcnN0T3BlcmFuZDogVmFsdWUsIHNlY29uZE9wZXJhbmQ/OiBWYWx1ZSkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRNZXRob2RzVGhhdEZpdFdpdGhDYXN0aW5nKGlkZW50aWZpZXI6IHN0cmluZywgcGFyYW1ldGVyVHlwZXM6IFR5cGVbXSxcclxuICAgICAgICBzZWFyY2hDb25zdHJ1Y3RvcjogYm9vbGVhbiwgdXBUb1Zpc2liaWxpdHk6IFZpc2liaWxpdHkpOiB7IGVycm9yOiBzdHJpbmcsIG1ldGhvZExpc3Q6IE1ldGhvZFtdIH0ge1xyXG5cclxuICAgICAgICByZXR1cm4gZmluZFN1aXRhYmxlTWV0aG9kcyh0aGlzLmdldE1ldGhvZHModXBUb1Zpc2liaWxpdHkpLCBpZGVudGlmaWVyLCBwYXJhbWV0ZXJUeXBlcyxcclxuICAgICAgICAgICAgdGhpcy5LbGFzcy5pZGVudGlmaWVyLCBzZWFyY2hDb25zdHJ1Y3Rvcik7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmV0dXJucyBhbGwgbWV0aG9kcyBvZiB0aGlzIGNsYXNzIGFuZCBhbGwgb2YgaXRzIGJhc2UgY2xhc3Nlc1xyXG4gICAgICogQHBhcmFtIGlzU3RhdGljIHJldHVybnMgb25seSBzdGF0aWMgbWV0aG9kcyBpZiB0cnVlXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBnZXRNZXRob2RzKHVwVG9WaXNpYmlsaXR5OiBWaXNpYmlsaXR5LCBpZGVudGlmaWVyPzogc3RyaW5nKTogTWV0aG9kW10ge1xyXG5cclxuICAgICAgICBsZXQgbWV0aG9kczogTWV0aG9kW10gPSB0aGlzLm1ldGhvZHMuc2xpY2UoKS5maWx0ZXIoKG1ldGhvZCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gbWV0aG9kLnZpc2liaWxpdHkgPD0gdXBUb1Zpc2liaWxpdHkgJiYgKGlkZW50aWZpZXIgPT0gbnVsbCB8fCBpZGVudGlmaWVyID09IG1ldGhvZC5pZGVudGlmaWVyKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYmFzZUNsYXNzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IGJhc2VDbGFzc1VwdG9WaXNpYmlsaXR5ID0gdXBUb1Zpc2liaWxpdHkgPT0gVmlzaWJpbGl0eS5wdWJsaWMgPyBWaXNpYmlsaXR5LnB1YmxpYyA6IFZpc2liaWxpdHkucHJvdGVjdGVkO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBtIG9mIHRoaXMuYmFzZUNsYXNzLmdldE1ldGhvZHMoYmFzZUNsYXNzVXB0b1Zpc2liaWxpdHksIGlkZW50aWZpZXIpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBtMSBvZiBtZXRob2RzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG0xLnNpZ25hdHVyZSA9PSBtLnNpZ25hdHVyZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kcy5wdXNoKG0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1ldGhvZHM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIGFsbCBhdHRyaWJ1dGVzIG9mIHRoaXMgY2xhc3MgYW5kIGFsbCBvZiBpdHMgYmFzZSBjbGFzc2VzXHJcbiAgICAgKiBAcGFyYW0gaXNTdGF0aWMgcmV0dXJuIG9ubHkgc3RhdGljIGF0dHJpYnV0ZXMgaWYgdHJ1ZVxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgZ2V0QXR0cmlidXRlcyh2aXNpYmlsaXR5VXBUbzogVmlzaWJpbGl0eSk6IEF0dHJpYnV0ZVtdIHtcclxuXHJcbiAgICAgICAgbGV0IGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZVtdID0gdGhpcy5hdHRyaWJ1dGVzLmZpbHRlcigoYXR0cmlidXRlKSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBhdHRyaWJ1dGUudmlzaWJpbGl0eSA8PSB2aXNpYmlsaXR5VXBUbztcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYmFzZUNsYXNzICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB2aXNpYmlsaXR5VXBUb0Jhc2VDbGFzcyA9IHZpc2liaWxpdHlVcFRvID09IFZpc2liaWxpdHkucHVibGljID8gdmlzaWJpbGl0eVVwVG8gOiBWaXNpYmlsaXR5LnByb3RlY3RlZDtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGEgb2YgdGhpcy5iYXNlQ2xhc3MuZ2V0QXR0cmlidXRlcyh2aXNpYmlsaXR5VXBUb0Jhc2VDbGFzcykpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhMSBvZiBhdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGExLmlkZW50aWZpZXIgPT0gYS5pZGVudGlmaWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICghZm91bmQpIHtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzLnB1c2goYSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gYXR0cmlidXRlcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0TWV0aG9kKGlkZW50aWZpZXI6IHN0cmluZywgcGFyYW1ldGVybGlzdDogUGFyYW1ldGVybGlzdCk6IE1ldGhvZCB7XHJcblxyXG4gICAgICAgIGxldCBtZXRob2QgPSB0aGlzLm1ldGhvZE1hcC5nZXQoaWRlbnRpZmllciArIHBhcmFtZXRlcmxpc3QuaWQpO1xyXG5cclxuICAgICAgICBpZiAobWV0aG9kID09IG51bGwgJiYgdGhpcy5iYXNlQ2xhc3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5iYXNlQ2xhc3MuZ2V0TWV0aG9kKGlkZW50aWZpZXIsIHBhcmFtZXRlcmxpc3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1ldGhvZDtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0QXR0cmlidXRlKGlkZW50aWZpZXI6IHN0cmluZywgdXBUb1Zpc2liaWxpdHk6IFZpc2liaWxpdHkpOiB7IGF0dHJpYnV0ZTogQXR0cmlidXRlLCBlcnJvcjogc3RyaW5nLCBmb3VuZEJ1dEludmlzaWJsZTogYm9vbGVhbiwgc3RhdGljQ2xhc3M6IFN0YXRpY0NsYXNzIH0ge1xyXG5cclxuICAgICAgICBsZXQgZXJyb3IgPSBcIlwiO1xyXG4gICAgICAgIGxldCBub3RGb3VuZCA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBhdHRyaWJ1dGUgPSB0aGlzLmF0dHJpYnV0ZU1hcC5nZXQoaWRlbnRpZmllcik7XHJcblxyXG4gICAgICAgIGlmIChhdHRyaWJ1dGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBub3RGb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgIGVycm9yID0gXCJEYXMgQXR0cmlidXQgXCIgKyBpZGVudGlmaWVyICsgXCIga29ubnRlIG5pY2h0IGdlZnVuZGVuIHdlcmRlbi5cIjtcclxuICAgICAgICB9IGVsc2UgaWYgKGF0dHJpYnV0ZS52aXNpYmlsaXR5ID4gdXBUb1Zpc2liaWxpdHkpIHtcclxuICAgICAgICAgICAgZXJyb3IgPSBcIkRhcyBBdHRyaWJ1dCBcIiArIGlkZW50aWZpZXIgKyBcIiBoYXQgZGllIFNpY2h0YmFya2VpdCBcIiArIFZpc2liaWxpdHlbYXR0cmlidXRlLnZpc2liaWxpdHldICsgXCIgdW5kIGlzdCBoaWVyIGRhaGVyIG5pY2h0IHNpY2h0YmFyLlwiO1xyXG4gICAgICAgICAgICBhdHRyaWJ1dGUgPSBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGF0dHJpYnV0ZSA9PSBudWxsICYmIHRoaXMuYmFzZUNsYXNzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IHVwVG9WaXNpYmlsaXR5SW5CYXNlQ2xhc3MgPSB1cFRvVmlzaWJpbGl0eSA9PSBWaXNpYmlsaXR5LnB1YmxpYyA/IHVwVG9WaXNpYmlsaXR5IDogVmlzaWJpbGl0eS5wcm90ZWN0ZWQ7XHJcblxyXG4gICAgICAgICAgICBsZXQgYmFzZUNsYXNzQXR0cmlidXRlV2l0aEVycm9yID0gdGhpcy5iYXNlQ2xhc3MuZ2V0QXR0cmlidXRlKGlkZW50aWZpZXIsIHVwVG9WaXNpYmlsaXR5SW5CYXNlQ2xhc3MpO1xyXG4gICAgICAgICAgICBpZiAobm90Rm91bmQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBiYXNlQ2xhc3NBdHRyaWJ1dGVXaXRoRXJyb3I7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IGF0dHJpYnV0ZTogYXR0cmlidXRlLCBlcnJvcjogZXJyb3IsIGZvdW5kQnV0SW52aXNpYmxlOiAhbm90Rm91bmQsIHN0YXRpY0NsYXNzOiB0aGlzIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNhbkNhc3RUbyh0eXBlOiBUeXBlKTogYm9vbGVhbiB7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNhc3RUbyh2YWx1ZTogVmFsdWUsIHR5cGU6IFR5cGUpOiBWYWx1ZSB7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIGhhc0FuY2VzdG9yT3JJcyhhOiBLbGFzcyB8IFN0YXRpY0NsYXNzKSB7XHJcbiAgICAgICAgbGV0IGM6IEtsYXNzIHwgU3RhdGljQ2xhc3MgPSB0aGlzO1xyXG4gICAgICAgIHdoaWxlIChjICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKGMgPT0gYSkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIGMgPSBjLmJhc2VDbGFzcztcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEludGVyZmFjZSBleHRlbmRzIFR5cGUge1xyXG5cclxuICAgIC8vIGZvciBHZW5lcmljczpcclxuICAgIHR5cGVWYXJpYWJsZXM6IFR5cGVWYXJpYWJsZVtdID0gW107XHJcbiAgICBpc0dlbmVyaWNWYXJpYW50RnJvbTogSW50ZXJmYWNlO1xyXG4gICAgdHlwZVZhcmlhYmxlc1JlYWR5OiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICBwdWJsaWMgbW9kdWxlOiBNb2R1bGU7XHJcblxyXG4gICAgcHVibGljIGV4dGVuZHM6IEludGVyZmFjZVtdID0gW107XHJcblxyXG4gICAgcHVibGljIG1ldGhvZHM6IE1ldGhvZFtdID0gW107XHJcbiAgICBwcml2YXRlIG1ldGhvZE1hcDogTWFwPHN0cmluZywgTWV0aG9kPiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpZGVudGlmaWVyOiBzdHJpbmcsIG1vZHVsZTogTW9kdWxlLCBkb2N1bWVudGF0aW9uPzogc3RyaW5nKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLmRvY3VtZW50YXRpb24gPSBkb2N1bWVudGF0aW9uO1xyXG4gICAgICAgIHRoaXMuaWRlbnRpZmllciA9IGlkZW50aWZpZXI7XHJcbiAgICAgICAgdGhpcy5tb2R1bGUgPSBtb2R1bGU7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Tm9uR2VuZXJpY0lkZW50aWZpZXIoKTogc3RyaW5nIHtcclxuICAgICAgICBsZXQgazogSW50ZXJmYWNlID0gdGhpcztcclxuICAgICAgICB3aGlsZSAoay5pc0dlbmVyaWNWYXJpYW50RnJvbSAhPSBudWxsKSBrID0gay5pc0dlbmVyaWNWYXJpYW50RnJvbTtcclxuICAgICAgICByZXR1cm4gay5pZGVudGlmaWVyO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFRoaXNPckV4dGVuZGVkSW50ZXJmYWNlKGlkZW50aWZpZXI6IFN0cmluZyk6IEludGVyZmFjZSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZ2V0Tm9uR2VuZXJpY0lkZW50aWZpZXIoKSA9PSBpZGVudGlmaWVyKSByZXR1cm4gdGhpcztcclxuICAgICAgICBmb3IgKGxldCBpZjEgb2YgdGhpcy5leHRlbmRzKSB7XHJcbiAgICAgICAgICAgIGxldCBpZjIgPSBpZjEuZ2V0VGhpc09yRXh0ZW5kZWRJbnRlcmZhY2UoaWRlbnRpZmllcik7XHJcbiAgICAgICAgICAgIGlmIChpZjIgIT0gbnVsbCkgcmV0dXJuIGlmMjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gc3RhdGljIGNvdW50OiBudW1iZXIgPSAwO1xyXG4gICAgY2xvbmUoKTogSW50ZXJmYWNlIHtcclxuICAgICAgICAvLyBJbnRlcmZhY2UuY291bnQrKztcclxuICAgICAgICBsZXQgbmV3SW50ZXJmYWNlOiBJbnRlcmZhY2UgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xyXG5cclxuICAgICAgICBuZXdJbnRlcmZhY2UudXNhZ2VQb3NpdGlvbnMgPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgbmV3SW50ZXJmYWNlLmlzR2VuZXJpY1ZhcmlhbnRGcm9tID0gdGhpcztcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ld0ludGVyZmFjZTtcclxuICAgIH1cclxuXHJcbiAgICBjbGVhclVzYWdlUG9zaXRpb25zKCkge1xyXG4gICAgICAgIHN1cGVyLmNsZWFyVXNhZ2VQb3NpdGlvbnMoKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgbSBvZiB0aGlzLm1ldGhvZHMpIHtcclxuICAgICAgICAgICAgbS5jbGVhclVzYWdlUG9zaXRpb25zKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgZ2V0Q29tcGxldGlvbkl0ZW1zKGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlOiBib29sZWFuLCBpZGVudGlmaWVyQW5kQnJhY2tldEFmdGVyQ3Vyc29yOiBzdHJpbmcsXHJcbiAgICAgICAgcmFuZ2VUb1JlcGxhY2U6IG1vbmFjby5JUmFuZ2UpOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtW10ge1xyXG5cclxuICAgICAgICBsZXQgaXRlbUxpc3Q6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1bXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtZXRob2Qgb2YgdGhpcy5nZXRNZXRob2RzKCkpIHtcclxuICAgICAgICAgICAgaXRlbUxpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogbWV0aG9kLmdldENvbXBsZXRpb25MYWJlbCgpLFxyXG4gICAgICAgICAgICAgICAgZmlsdGVyVGV4dDogbWV0aG9kLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5NZXRob2QsXHJcbiAgICAgICAgICAgICAgICBpbnNlcnRUZXh0OiBtZXRob2QuZ2V0Q29tcGxldGlvblNuaXBwZXQobGVmdEJyYWNrZXRBbHJlYWR5VGhlcmUpLFxyXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHJhbmdlVG9SZXBsYWNlLFxyXG4gICAgICAgICAgICAgICAgY29tbWFuZDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBcImVkaXRvci5hY3Rpb24udHJpZ2dlclBhcmFtZXRlckhpbnRzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICcxMjMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW11cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBpbnNlcnRUZXh0UnVsZXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1JbnNlcnRUZXh0UnVsZS5JbnNlcnRBc1NuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudGF0aW9uOiBtZXRob2QuZG9jdW1lbnRhdGlvbiA9PSBudWxsID8gdW5kZWZpbmVkIDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBtZXRob2QuZG9jdW1lbnRhdGlvblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpdGVtTGlzdDtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGVidWdPdXRwdXQodmFsdWU6IFZhbHVlLCBtYXhMZW5ndGg6IG51bWJlciA9IDQwKTogc3RyaW5nIHtcclxuICAgICAgICBpZiAodmFsdWUudmFsdWUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJudWxsXCI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHZhbHVlLnZhbHVlIGluc3RhbmNlb2YgUnVudGltZU9iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnZhbHVlLmNsYXNzLmRlYnVnT3V0cHV0KHZhbHVlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInsuLi59XCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGVxdWFscyh0eXBlOiBUeXBlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHR5cGUgPT0gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYWRkTWV0aG9kKG1ldGhvZDogTWV0aG9kKSB7XHJcbiAgICAgICAgbWV0aG9kLmlzQWJzdHJhY3QgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMubWV0aG9kcy5wdXNoKG1ldGhvZCk7XHJcbiAgICAgICAgdGhpcy5tZXRob2RNYXAuc2V0KG1ldGhvZC5zaWduYXR1cmUsIG1ldGhvZCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldFJlc3VsdFR5cGUob3BlcmF0aW9uOiBUb2tlblR5cGUsIHNlY29uZE9wZXJhbmRUeXBlPzogVHlwZSk6IFR5cGUge1xyXG5cclxuICAgICAgICBpZiAob3BlcmF0aW9uID09IFRva2VuVHlwZS5lcXVhbCB8fCBvcGVyYXRpb24gPT0gVG9rZW5UeXBlLm5vdEVxdWFsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBib29sZWFuUHJpbWl0aXZlVHlwZUNvcHk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3BlcmF0aW9uID09IFRva2VuVHlwZS5rZXl3b3JkSW5zdGFuY2VvZikge1xyXG4gICAgICAgICAgICBpZiAoc2Vjb25kT3BlcmFuZFR5cGUgaW5zdGFuY2VvZiBTdGF0aWNDbGFzcyB8fCBzZWNvbmRPcGVyYW5kVHlwZSBpbnN0YW5jZW9mIEludGVyZmFjZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJvb2xlYW5QcmltaXRpdmVUeXBlQ29weTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBjb21wdXRlKG9wZXJhdGlvbjogVG9rZW5UeXBlLCBmaXJzdE9wZXJhbmQ6IFZhbHVlLCBzZWNvbmRPcGVyYW5kPzogVmFsdWUpIHtcclxuXHJcbiAgICAgICAgaWYgKG9wZXJhdGlvbiA9PSBUb2tlblR5cGUuZXF1YWwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZpcnN0T3BlcmFuZC52YWx1ZSA9PSBzZWNvbmRPcGVyYW5kLnZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wZXJhdGlvbiA9PSBUb2tlblR5cGUubm90RXF1YWwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZpcnN0T3BlcmFuZC52YWx1ZSAhPSBzZWNvbmRPcGVyYW5kLnZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1ldGhvZHNXaXRoU3ViSW50ZXJmYWNlczogTWV0aG9kW107XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIGFsbCBtZXRob2RzIG9mIHRoaXMgaW50ZXJmYWNlXHJcbiAgICAgKiBAcGFyYW0gaXNTdGF0aWMgaXMgbm90IHVzZWQgaW4gaW50ZXJmYWNlc1xyXG4gICAgICovXHJcbiAgICBwdWJsaWMgZ2V0TWV0aG9kcygpOiBNZXRob2RbXSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmV4dGVuZHMubGVuZ3RoID09IDApIHJldHVybiB0aGlzLm1ldGhvZHM7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1ldGhvZHNXaXRoU3ViSW50ZXJmYWNlcyAhPSBudWxsKSByZXR1cm4gdGhpcy5tZXRob2RzV2l0aFN1YkludGVyZmFjZXM7XHJcblxyXG4gICAgICAgIGxldCB2aXNpdGVkSW50ZXJmYWNlczogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0gPSB7fTtcclxuICAgICAgICBsZXQgdmlzaXRlZE1ldGhvZHM6IHsgW3NpZ25hdHVyZTogc3RyaW5nXTogYm9vbGVhbiB9ID0ge307XHJcblxyXG4gICAgICAgIHRoaXMubWV0aG9kc1dpdGhTdWJJbnRlcmZhY2VzID0gdGhpcy5tZXRob2RzLnNsaWNlKDApO1xyXG4gICAgICAgIGZvciAobGV0IG0gb2YgdGhpcy5tZXRob2RzKSB2aXNpdGVkTWV0aG9kc1ttLnNpZ25hdHVyZV0gPSB0cnVlO1xyXG4gICAgICAgIHZpc2l0ZWRJbnRlcmZhY2VzW3RoaXMuaWRlbnRpZmllcl0gPSB0cnVlO1xyXG5cclxuICAgICAgICBsZXQgdG9kbzogSW50ZXJmYWNlW10gPSB0aGlzLmV4dGVuZHMuc2xpY2UoMCk7XHJcblxyXG4gICAgICAgIHdoaWxlICh0b2RvLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgbGV0IGludGVyZiA9IHRvZG8ucG9wKCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG0gb2YgaW50ZXJmLm1ldGhvZHMpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdmlzaXRlZE1ldGhvZHNbbS5zaWduYXR1cmVdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tZXRob2RzV2l0aFN1YkludGVyZmFjZXMucHVzaChtKTtcclxuICAgICAgICAgICAgICAgICAgICB2aXNpdGVkTWV0aG9kc1ttLnNpZ25hdHVyZV0gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgb2YgaW50ZXJmLmV4dGVuZHMpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdmlzaXRlZEludGVyZmFjZXNbaS5pZGVudGlmaWVyXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvZG8ucHVzaChpKTtcclxuICAgICAgICAgICAgICAgICAgICB2aXNpdGVkSW50ZXJmYWNlc1tpLmlkZW50aWZpZXJdID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWV0aG9kc1dpdGhTdWJJbnRlcmZhY2VzO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0TWV0aG9kKGlkZW50aWZpZXI6IHN0cmluZywgcGFyYW1ldGVybGlzdDogUGFyYW1ldGVybGlzdCk6IE1ldGhvZCB7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLm1ldGhvZE1hcC5nZXQoaWRlbnRpZmllciArIHBhcmFtZXRlcmxpc3QuaWQpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgY2FuQ2FzdFRvKHR5cGU6IFR5cGUpOiBib29sZWFuIHtcclxuXHJcbiAgICAgICAgaWYgKHR5cGUgaW5zdGFuY2VvZiBJbnRlcmZhY2UpIHtcclxuICAgICAgICAgICAgbGV0IG5vbkdlbmVyaWNDYXN0YWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodHlwZS5nZXROb25HZW5lcmljSWRlbnRpZmllcigpID09IHRoaXMuZ2V0Tm9uR2VuZXJpY0lkZW50aWZpZXIoKSkge1xyXG4gICAgICAgICAgICAgICAgbm9uR2VuZXJpY0Nhc3RhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnR5cGVWYXJpYWJsZXMubGVuZ3RoID09IDApIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHR5cGUyID0gPEludGVyZmFjZT50eXBlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHlwZVZhcmlhYmxlcy5sZW5ndGggIT0gdHlwZTIudHlwZVZhcmlhYmxlcy5sZW5ndGgpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50eXBlVmFyaWFibGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHR2ID0gdGhpcy50eXBlVmFyaWFibGVzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0dk90aGVyID0gdHlwZTIudHlwZVZhcmlhYmxlc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXR2T3RoZXIudHlwZS5jYW5DYXN0VG8odHYudHlwZSkpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHR5cGUxIG9mIHRoaXMuZXh0ZW5kcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlMS5jYW5DYXN0VG8odHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAodHlwZSBpbnN0YW5jZW9mIEtsYXNzICYmIHR5cGUuZ2V0Tm9uR2VuZXJpY0lkZW50aWZpZXIoKSA9PSBcIk9iamVjdFwiKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyByZXR1cm4gKHR5cGUgaW5zdGFuY2VvZiBLbGFzcykgfHwgKHR5cGUgaW5zdGFuY2VvZiBJbnRlcmZhY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBjYXN0VG8odmFsdWU6IFZhbHVlLCB0eXBlOiBUeXBlKTogVmFsdWUge1xyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0TWV0aG9kc1RoYXRGaXRXaXRoQ2FzdGluZyhpZGVudGlmaWVyOiBzdHJpbmcsIHBhcmFtZXRlclR5cGVzOiBUeXBlW10sIHNlYXJjaENvbnN0cnVjdG9yOiBib29sZWFuKTogeyBlcnJvcjogc3RyaW5nLCBtZXRob2RMaXN0OiBNZXRob2RbXSB9IHtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZpbmRTdWl0YWJsZU1ldGhvZHModGhpcy5nZXRNZXRob2RzKCksIGlkZW50aWZpZXIsIHBhcmFtZXRlclR5cGVzLCB0aGlzLmlkZW50aWZpZXIsIHNlYXJjaENvbnN0cnVjdG9yKTtcclxuXHJcbiAgICB9XHJcblxyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gZmluZFN1aXRhYmxlTWV0aG9kcyhtZXRob2RMaXN0OiBNZXRob2RbXSwgaWRlbnRpZmllcjogc3RyaW5nLCBwYXJhbWV0ZXJUeXBlczogVHlwZVtdLFxyXG4gICAgY2xhc3NJZGVudGlmaWVyOiBzdHJpbmcsXHJcbiAgICBzZWFyY2hDb25zdHJ1Y3RvcjogYm9vbGVhbik6IHsgZXJyb3I6IHN0cmluZywgbWV0aG9kTGlzdDogTWV0aG9kW10gfSB7XHJcblxyXG4gICAgbGV0IHN1aXRhYmxlTWV0aG9kczogTWV0aG9kW10gPSBbXTtcclxuICAgIGxldCBob3dNYW55Q2FzdGluZ3NNYXg6IG51bWJlciA9IDEwMDAwO1xyXG4gICAgbGV0IGVycm9yID0gbnVsbDtcclxuXHJcbiAgICBsZXQgb25lV2l0aENvcnJlY3RJZGVudGlmaWVyRm91bmQgPSBmYWxzZTtcclxuXHJcbiAgICBmb3IgKGxldCBtIG9mIG1ldGhvZExpc3QpIHtcclxuXHJcbiAgICAgICAgbGV0IGhvd01hbnlDYXN0aW5ncyA9IDA7XHJcbiAgICAgICAgaWYgKG0uaWRlbnRpZmllciA9PSBpZGVudGlmaWVyIHx8IG0uaXNDb25zdHJ1Y3RvciAmJiBzZWFyY2hDb25zdHJ1Y3Rvcikge1xyXG5cclxuICAgICAgICAgICAgb25lV2l0aENvcnJlY3RJZGVudGlmaWVyRm91bmQgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgbGV0IGlzRWxsaXBzaXMgPSBtLmhhc0VsbGlwc2lzKCk7XHJcbiAgICAgICAgICAgIGlmIChtLmdldFBhcmFtZXRlckNvdW50KCkgPT0gcGFyYW1ldGVyVHlwZXMubGVuZ3RoIHx8IChpc0VsbGlwc2lzICYmIG0uZ2V0UGFyYW1ldGVyQ291bnQoKSA8PSBwYXJhbWV0ZXJUeXBlcy5sZW5ndGgpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHN1aXRzID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaSA9IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IG0uZ2V0UGFyYW1ldGVyQ291bnQoKSAtIChpc0VsbGlwc2lzID8gMSA6IDApOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbVBhcmFtZXRlclR5cGUgPSBtLmdldFBhcmFtZXRlclR5cGUoaSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGdpdmVuVHlwZSA9IHBhcmFtZXRlclR5cGVzW2ldO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZ2l2ZW5UeXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VpdHMgPSBmYWxzZTsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobVBhcmFtZXRlclR5cGUgPT0gZ2l2ZW5UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdpdmVuVHlwZS5jYW5DYXN0VG8obVBhcmFtZXRlclR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvd01hbnlDYXN0aW5ncysrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICAgICAgICAgICAgICogUmVjaHRlY2sgcjsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAqIEdOR0ZpZ3VyIGY7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAqIEJlaSBmLmJlcsO8aHJ0KHIpIGdpYnQgZXMgZWluZSBWYXJpYW50ZSBtaXQgUGFyYW1ldGVydHlwIFN0cmluZyAoc2NobGVjaHQhKSB1bmRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICogZWluZSBtaXQgUGFyYW1ldGVydHlwIE9iamVjdC4gTGV0enRlcmUgc29sbCBnZW5vbW1lbiB3ZXJkZW4sIGFsc286XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobVBhcmFtZXRlclR5cGUgPT0gc3RyaW5nUHJpbWl0aXZlVHlwZSkgaG93TWFueUNhc3RpbmdzICs9IDAuNTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBzdWl0cyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIEVsbGlwc2lzIVxyXG4gICAgICAgICAgICAgICAgaWYgKHN1aXRzICYmIGlzRWxsaXBzaXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbVBhcmFtZXRlckVsbGlwc2lzID0gbS5nZXRQYXJhbWV0ZXIoaSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1QYXJhbWV0ZXJUeXBlRWxsaXNwc2lzID0gKDxBcnJheVR5cGU+bVBhcmFtZXRlckVsbGlwc2lzLnR5cGUpLmFycmF5T2ZUeXBlO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IGk7IGogPCBwYXJhbWV0ZXJUeXBlcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZ2l2ZW5UeXBlID0gcGFyYW1ldGVyVHlwZXNbaV07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2l2ZW5UeXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1aXRzID0gZmFsc2U7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobVBhcmFtZXRlclR5cGVFbGxpc3BzaXMgPT0gZ2l2ZW5UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdpdmVuVHlwZS5jYW5DYXN0VG8obVBhcmFtZXRlclR5cGVFbGxpc3BzaXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3dNYW55Q2FzdGluZ3MrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICogUmVjaHRlY2sgcjsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBHTkdGaWd1ciBmO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICogQmVpIGYuYmVyw7xocnQocikgZ2lidCBlcyBlaW5lIFZhcmlhbnRlIG1pdCBQYXJhbWV0ZXJ0eXAgU3RyaW5nIChzY2hsZWNodCEpIHVuZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICogZWluZSBtaXQgUGFyYW1ldGVydHlwIE9iamVjdC4gTGV0enRlcmUgc29sbCBnZW5vbW1lbiB3ZXJkZW4sIGFsc286XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtUGFyYW1ldGVyVHlwZUVsbGlzcHNpcyA9PSBzdHJpbmdQcmltaXRpdmVUeXBlKSBob3dNYW55Q2FzdGluZ3MgKz0gMC41O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1aXRzID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHN1aXRzICYmIGhvd01hbnlDYXN0aW5ncyA8PSBob3dNYW55Q2FzdGluZ3NNYXgpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaG93TWFueUNhc3RpbmdzIDwgaG93TWFueUNhc3RpbmdzTWF4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1aXRhYmxlTWV0aG9kcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBzdWl0YWJsZU1ldGhvZHMucHVzaChtKTtcclxuICAgICAgICAgICAgICAgICAgICBob3dNYW55Q2FzdGluZ3NNYXggPSBob3dNYW55Q2FzdGluZ3M7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoc3VpdGFibGVNZXRob2RzLmxlbmd0aCA9PSAwKSB7XHJcblxyXG4gICAgICAgIGlmIChvbmVXaXRoQ29ycmVjdElkZW50aWZpZXJGb3VuZCkge1xyXG4gICAgICAgICAgICBpZiAocGFyYW1ldGVyVHlwZXMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgIGVycm9yID0gc2VhcmNoQ29uc3RydWN0b3IgPyBcIkVzIGdpYnQga2VpbmVuIHBhcmFtZXRlcmxvc2VuIEtvbnN0cnVrdG9yIGRlciBLbGFzc2UgXCIgKyBjbGFzc0lkZW50aWZpZXIgOiBcIkRpZSB2b3JoYW5kZW5lbiBNZXRob2RlbiBtaXQgZGVtIEJlemVpY2huZXIgXCIgKyBpZGVudGlmaWVyICsgXCIgaGFiZW4gYWxsZSBtaW5kZXN0ZW5zIGVpbmVuIFBhcmFtZXRlci4gSGllciB3aXJkIGFiZXIga2VpbiBQYXJhbWV0ZXJ3ZXJ0IMO8YmVyZ2ViZW4uXCI7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZVN0cmluZyA9IHBhcmFtZXRlclR5cGVzLm1hcCh0eXBlID0+IHR5cGU/LmlkZW50aWZpZXIpLmpvaW4oXCIsIFwiKTtcclxuICAgICAgICAgICAgICAgIGVycm9yID0gc2VhcmNoQ29uc3RydWN0b3IgPyBgRGllIFBhcmFtZXRlcnR5cGVuICgke3R5cGVTdHJpbmd9KSBwYXNzZW4genUga2VpbmVtIEtvbnN0cnVrdG9yIGRlciBLbGFzc2UgJHtjbGFzc0lkZW50aWZpZXJ9YCA6IGBEaWUgUGFyYW1ldGVydHlwZW4gKCR7dHlwZVN0cmluZ30pIHBhc3NlbiB6dSBrZWluZXIgZGVyIHZvcmhhbmRlbmVuIE1ldGhvZGVuIG1pdCBkZW0gQmV6ZWljaG5lciAke2lkZW50aWZpZXJ9LmA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlcnJvciA9IFwiRGVyIFR5cCBcIiArIGNsYXNzSWRlbnRpZmllciArIFwiIGJlc2l0enQga2VpbmUgTWV0aG9kZSBtaXQgZGVtIEJlemVpY2huZXIgXCIgKyBpZGVudGlmaWVyICsgXCIuXCI7XHJcbiAgICAgICAgICAgIGlmIChpZGVudGlmaWVyID09ICdzZXRDZW50ZXInKSB7XHJcbiAgICAgICAgICAgICAgICBlcnJvciArPSAnIFRpcHA6IERpZSBNZXRob2RlIHNldENlbnRlciBkZXIgS2xhc3NlIFNoYXBlIHd1cmRlIHVtYmVuYW5udCBpbiBcIm1vdmVUb1wiLidcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHN1aXRhYmxlTWV0aG9kcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgc3VpdGFibGVNZXRob2RzID0gc3VpdGFibGVNZXRob2RzLnNsaWNlKDAsIDEpO1xyXG4gICAgICAgIC8vIGVycm9yID0gXCJadSBkZW4gZ2VnZWJlbmVuIFBhcmFtZXRlcm4gaGF0IGRlciBUeXAgXCIgKyBjbGFzc0lkZW50aWZpZXIgKyBcIiBtZWhyZXJlIHBhc3NlbmRlIE1ldGhvZGVuLlwiO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgZXJyb3I6IGVycm9yLFxyXG4gICAgICAgIG1ldGhvZExpc3Q6IHN1aXRhYmxlTWV0aG9kc1xyXG4gICAgfTtcclxuXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRWaXNpYmlsaXR5VXBUbyhvYmplY3RUeXBlOiBLbGFzcyB8IFN0YXRpY0NsYXNzLCBjdXJyZW50Q2xhc3NDb250ZXh0OiBLbGFzcyB8IFN0YXRpY0NsYXNzKTogVmlzaWJpbGl0eSB7XHJcblxyXG4gICAgaWYgKGN1cnJlbnRDbGFzc0NvbnRleHQgPT0gbnVsbCkge1xyXG4gICAgICAgIHJldHVybiBWaXNpYmlsaXR5LnB1YmxpYztcclxuICAgIH1cclxuXHJcbiAgICBpZiAob2JqZWN0VHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzKSBvYmplY3RUeXBlID0gb2JqZWN0VHlwZS5LbGFzcztcclxuICAgIGlmIChjdXJyZW50Q2xhc3NDb250ZXh0IGluc3RhbmNlb2YgU3RhdGljQ2xhc3MpIGN1cnJlbnRDbGFzc0NvbnRleHQgPSBjdXJyZW50Q2xhc3NDb250ZXh0LktsYXNzO1xyXG5cclxuICAgIGlmIChvYmplY3RUeXBlID09IGN1cnJlbnRDbGFzc0NvbnRleHQpIHtcclxuICAgICAgICByZXR1cm4gVmlzaWJpbGl0eS5wcml2YXRlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjdXJyZW50Q2xhc3NDb250ZXh0Lmhhc0FuY2VzdG9yT3JJcyhvYmplY3RUeXBlKSkge1xyXG4gICAgICAgIHJldHVybiBWaXNpYmlsaXR5LnByb3RlY3RlZDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gVmlzaWJpbGl0eS5wdWJsaWM7XHJcblxyXG59XHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIFVuYm94YWJsZUtsYXNzIGV4dGVuZHMgS2xhc3Mge1xyXG5cclxuICAgIHB1YmxpYyB1bmJveGFibGVBczogVHlwZVtdID0gW107XHJcblxyXG4gICAgcHVibGljIGNhc3RUbyh2YWx1ZTogVmFsdWUsIHR5cGU6IFR5cGUpOiBWYWx1ZSB7XHJcbiAgICAgICAgaWYgKCEodHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpKSByZXR1cm4gbnVsbDtcclxuICAgICAgICBpZiAodGhpcy51bmJveGFibGVBcy5pbmNsdWRlcyh0eXBlKSkge1xyXG4gICAgICAgICAgICBpZiAodmFsdWUudmFsdWUgPT0gbnVsbCAmJiAhdHlwZS5hbGxvd3NOdWxsKCkpIHRocm93IEVycm9yKFwibnVsbCBrYW5uIG5pY2h0IGluIGVpbmVuIHByaW1pdGl2ZW4gXCIgKyB0eXBlLmlkZW50aWZpZXIgKyBcIiB1bWdld2FuZGVsdCB3ZXJkZW4uXCIpO1xyXG4gICAgICAgICAgICBlbHNlIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUudmFsdWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiB0eXBlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgY2FuQ2FzdFRvKHR5cGU6IFR5cGUpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy51bmJveGFibGVBcy5pbmRleE9mKHR5cGUpID49IDAgfHwgc3VwZXIuY2FuQ2FzdFRvKHR5cGUpO1xyXG4gICAgfVxyXG5cclxufSJdfQ==