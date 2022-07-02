import { TokenType, TokenTypeReadable } from "../lexer/Token.js";
import { ArrayType } from "../types/Array.js";
import { Klass, Interface, StaticClass, Visibility, getVisibilityUpTo } from "../types/Class.js";
import { booleanPrimitiveType, charPrimitiveType, floatPrimitiveType, intPrimitiveType, stringPrimitiveType, objectType, nullType, voidPrimitiveType, varType, doublePrimitiveType } from "../types/PrimitiveTypes.js";
import { Attribute, PrimitiveType, Method, getTypeIdentifier, Parameterlist } from "../types/Types.js";
import { LabelManager } from "./LabelManager.js";
import { SymbolTable } from "./SymbolTable.js";
import { Enum } from "../types/Enum.js";
export class CodeGenerator {
    constructor() {
        this.initStackFrameNodes = [];
    }
    startAdhocCompilation(module, moduleStore, symbolTable, heap) {
        this.moduleStore = moduleStore;
        this.module = module;
        this.symbolTableStack = [];
        this.symbolTableStack.push(symbolTable);
        this.currentSymbolTable = symbolTable;
        this.heap = heap;
        let oldStackframeSize = symbolTable.stackframeSize;
        this.nextFreeRelativeStackPos = oldStackframeSize;
        this.currentProgram = null;
        this.errorList = [];
        this.breakNodeStack = [];
        this.continueNodeStack = [];
        this.generateMain(true);
        return this.errorList;
    }
    start(module, moduleStore) {
        this.moduleStore = moduleStore;
        this.module = module;
        this.symbolTableStack = [];
        this.currentSymbolTable = null;
        this.currentProgram = null;
        this.errorList = [];
        this.nextFreeRelativeStackPos = 0;
        if (this.module.tokenList.length > 0) {
            let lastToken = this.module.tokenList[this.module.tokenList.length - 1];
            this.module.mainSymbolTable.positionTo = { line: lastToken.position.line, column: lastToken.position.column + 1, length: 1 };
        }
        this.symbolTableStack.push(this.module.mainSymbolTable);
        this.currentSymbolTable = this.module.mainSymbolTable;
        this.breakNodeStack = [];
        this.continueNodeStack = [];
        this.generateMain();
        this.generateClasses();
        this.lookForStaticVoidMain();
        this.module.errors[3] = this.errorList;
    }
    lookForStaticVoidMain() {
        let mainProgram = this.module.mainProgram;
        if (mainProgram != null && mainProgram.statements.length > 2)
            return;
        let mainMethod = null;
        let staticClass = null;
        let classNode1;
        for (let classNode of this.module.classDefinitionsAST) {
            if (classNode.type == TokenType.keywordClass) {
                let ct = classNode.resolvedType;
                for (let m of ct.staticClass.methods) {
                    if (m.identifier == "main" && m.parameterlist.parameters.length == 1) {
                        let pt = m.parameterlist.parameters[0];
                        if (pt.type instanceof ArrayType && pt.type.arrayOfType == stringPrimitiveType) {
                            if (mainMethod != null) {
                                this.pushError("Es existieren mehrere Klassen mit statischen main-Methoden.", classNode.position);
                            }
                            else {
                                mainMethod = m;
                                staticClass = ct.staticClass;
                                classNode1 = classNode;
                            }
                        }
                    }
                }
            }
        }
        if (mainMethod != null) {
            let position = mainMethod.usagePositions[0];
            if (mainMethod.program != null && mainMethod.program.statements.length > 0) {
                position = mainMethod.program.statements[0].position;
            }
            this.initCurrentProgram();
            this.module.mainProgram = this.currentProgram;
            this.pushStatements([{
                    type: TokenType.callMainMethod,
                    position: position,
                    stepFinished: false,
                    method: mainMethod,
                    staticClass: staticClass
                }, {
                    type: TokenType.closeStackframe,
                    position: mainMethod.usagePositions.get(this.module)[0]
                }
            ], false);
        }
    }
    generateClasses() {
        if (this.module.classDefinitionsAST == null)
            return;
        for (let classNode of this.module.classDefinitionsAST) {
            if (classNode.type == TokenType.keywordClass) {
                this.generateClass(classNode);
            }
            if (classNode.type == TokenType.keywordEnum) {
                this.generateEnum(classNode);
            }
            if (classNode.type == TokenType.keywordInterface) {
                let interf = classNode.resolvedType;
                if (interf != null) {
                    this.checkDoubleMethodDeclaration(interf);
                }
            }
        }
    }
    generateEnum(enumNode) {
        if (enumNode.resolvedType == null)
            return;
        this.pushNewSymbolTable(false, enumNode.scopeFrom, enumNode.scopeTo);
        let enumClass = enumNode.resolvedType;
        // this.pushUsagePosition(enumNode.position, enumClass);
        this.currentSymbolTable.classContext = enumClass;
        this.currentProgram = enumClass.attributeInitializationProgram;
        for (let attribute of enumNode.attributes) {
            if (attribute != null && !attribute.isStatic && attribute.initialization != null) {
                this.initializeAttribute(attribute);
            }
        }
        if (enumClass.attributeInitializationProgram.statements.length > 0) {
            this.pushStatements({
                type: TokenType.return,
                position: this.lastStatement.position,
                copyReturnValueToStackframePos0: false,
                stepFinished: false,
                leaveThisObjectOnStack: true
            });
        }
        this.currentProgram.labelManager.resolveNodes();
        for (let methodNode of enumNode.methods) {
            if (methodNode != null && !methodNode.isAbstract && !methodNode.isStatic) {
                this.compileMethod(methodNode);
            }
        }
        this.popSymbolTable(null);
        // constructor calls
        this.pushNewSymbolTable(false, enumNode.scopeFrom, enumNode.scopeTo);
        for (let enumValueNode of enumNode.values) {
            if (enumValueNode.constructorParameters != null) {
                let p = {
                    module: this.module,
                    labelManager: null,
                    statements: []
                };
                this.currentProgram = p;
                this.pushStatements({
                    type: TokenType.pushEnumValue,
                    position: enumValueNode.position,
                    enumClass: enumClass,
                    valueIdentifier: enumValueNode.identifier
                });
                this.processEnumConstructorCall(enumClass, enumValueNode.constructorParameters, enumValueNode.position, enumValueNode.commaPositions, enumValueNode.rightBracketPosition);
                this.pushStatements({
                    type: TokenType.programEnd,
                    position: enumValueNode.position,
                    stepFinished: true
                });
                let enumInfo = enumClass.identifierToInfoMap[enumValueNode.identifier];
                enumInfo.constructorCallProgram = p;
                enumInfo.position = enumValueNode.position;
            }
        }
        this.popSymbolTable(null);
        // static attributes/methods
        this.pushNewSymbolTable(false, enumNode.scopeFrom, enumNode.scopeTo);
        this.currentSymbolTable.classContext = enumClass.staticClass;
        this.currentProgram = enumClass.staticClass.attributeInitializationProgram;
        for (let attribute of enumNode.attributes) {
            if (attribute != null && attribute.isStatic && attribute.initialization != null) {
                this.initializeAttribute(attribute);
            }
        }
        this.currentProgram.labelManager.resolveNodes();
        for (let methodNode of enumNode.methods) {
            if (methodNode != null && methodNode.isStatic) {
                this.compileMethod(methodNode);
            }
        }
        this.checkDoubleMethodDeclaration(enumClass);
        this.popSymbolTable(null);
    }
    processEnumConstructorCall(enumClass, parameterNodes, position, commaPositions, rightBracketPosition) {
        let parameterTypes = [];
        for (let p of parameterNodes) {
            let typeNode = this.processNode(p);
            if (typeNode == null)
                continue;
            parameterTypes.push(typeNode.type);
        }
        let methods = enumClass.getMethodsThatFitWithCasting(enumClass.identifier, parameterTypes, true, Visibility.private);
        this.module.pushMethodCallPosition(position, commaPositions, enumClass.getMethods(Visibility.private, enumClass.identifier), rightBracketPosition);
        if (methods.error != null) {
            this.pushError(methods.error, position);
            return { type: stringPrimitiveType, isAssignable: false }; // try to continue...
        }
        let method = methods.methodList[0];
        let destType = null;
        for (let i = 0; i < parameterTypes.length; i++) {
            if (i < method.getParameterCount()) { // possible ellipsis!
                destType = method.getParameterType(i);
                if (i == method.getParameterCount() - 1 && method.hasEllipsis()) {
                    destType = destType.arrayOfType;
                }
            }
            let srcType = parameterTypes[i];
            if (!srcType.equals(destType)) {
                if (srcType instanceof PrimitiveType && destType instanceof PrimitiveType) {
                    if (srcType.getCastInformation(destType).needsStatement) {
                        this.pushStatements({
                            type: TokenType.castValue,
                            position: null,
                            newType: destType,
                            stackPosRelative: -parameterTypes.length + 1 + i
                        });
                    }
                }
            }
        }
        let stackframeDelta = 0;
        if (method.hasEllipsis()) {
            let ellipsisParameterCount = parameterTypes.length - method.getParameterCount() + 1; // last parameter and subsequent ones
            stackframeDelta = -(ellipsisParameterCount - 1);
            this.pushStatements({
                type: TokenType.makeEllipsisArray,
                position: parameterNodes[method.getParameterCount() - 1].position,
                parameterCount: ellipsisParameterCount,
                stepFinished: false,
                arrayType: method.getParameter(method.getParameterCount() - 1).type
            });
        }
        this.pushStatements({
            type: TokenType.callMethod,
            method: method,
            position: position,
            stepFinished: true,
            isSuperCall: false,
            stackframeBegin: -(parameterTypes.length + 1 + stackframeDelta) // this-object followed by parameters
        });
    }
    generateClass(classNode) {
        if (classNode.resolvedType == null)
            return;
        this.pushNewSymbolTable(false, classNode.scopeFrom, classNode.scopeTo);
        let klass = classNode.resolvedType;
        //this.pushUsagePosition(classNode.position, klass);
        let inheritanceError = klass.checkInheritance();
        if (inheritanceError.message != "") {
            this.pushError(inheritanceError.message, classNode.position, "error", this.getInheritanceQuickFix(classNode.scopeTo, inheritanceError));
        }
        let baseClass = klass.baseClass;
        if (baseClass != null && baseClass.module != klass.module && baseClass.visibility == Visibility.private) {
            this.pushError("Die Basisklasse " + baseClass.identifier + " der Klasse " + klass.identifier + " ist hier nicht sichtbar.", classNode.position);
        }
        this.currentSymbolTable.classContext = klass;
        this.currentProgram = klass.attributeInitializationProgram;
        for (let attribute of classNode.attributes) {
            if (attribute != null && !attribute.isStatic && attribute.initialization != null) {
                this.initializeAttribute(attribute);
            }
        }
        if (klass.attributeInitializationProgram.statements.length > 0) {
            this.pushStatements({
                type: TokenType.return,
                position: this.lastStatement.position,
                copyReturnValueToStackframePos0: false,
                stepFinished: false,
                leaveThisObjectOnStack: true
            });
        }
        this.currentProgram.labelManager.resolveNodes();
        for (let methodNode of classNode.methods) {
            if (methodNode != null && !methodNode.isAbstract && !methodNode.isStatic) {
                this.compileMethod(methodNode);
                let m = methodNode.resolvedType;
                if (m != null && m.annotation == "@Override") {
                    if (klass.baseClass != null) {
                        if (klass.baseClass.getMethodBySignature(m.signature) == null) {
                            this.pushError("Die Methode " + m.signature + " ist mit @Override annotiert, überschreibt aber keine Methode gleicher Signatur einer Oberklasse.", methodNode.position, "warning");
                        }
                    }
                }
            }
        }
        this.checkDoubleMethodDeclaration(klass);
        this.popSymbolTable(null);
        // static attributes/methods
        this.pushNewSymbolTable(false, classNode.scopeFrom, classNode.scopeTo);
        this.currentSymbolTable.classContext = klass.staticClass;
        this.currentProgram = klass.staticClass.attributeInitializationProgram;
        for (let attribute of classNode.attributes) {
            if (attribute != null && attribute.isStatic && attribute.initialization != null) {
                this.initializeAttribute(attribute);
            }
        }
        if (klass.staticClass.attributeInitializationProgram.statements.length > 0) {
            this.pushStatements({
                type: TokenType.return,
                position: this.lastStatement.position,
                copyReturnValueToStackframePos0: false,
                stepFinished: false,
                leaveThisObjectOnStack: true
            });
        }
        this.currentProgram.labelManager.resolveNodes();
        for (let methodNode of classNode.methods) {
            if (methodNode != null && methodNode.isStatic) {
                this.compileMethod(methodNode);
            }
        }
        this.popSymbolTable(null);
    }
    checkDoubleMethodDeclaration(cie) {
        let signatureMap = {};
        for (let m of cie.methods) {
            let signature = m.getSignatureWithReturnParameter();
            if (signatureMap[signature] != null) {
                let cieType = "In der Klasse ";
                if (cie instanceof Interface)
                    cieType = "Im Interface ";
                if (cie instanceof Enum)
                    cieType = "Im Enum ";
                this.pushError(cieType + cie.identifier + " gibt es zwei Methoden mit derselben Signatur: " + signature, m.usagePositions.get(this.module)[0], "error");
                this.pushError(cieType + cie.identifier + " gibt es zwei Methoden mit derselben Signatur: " + signature, signatureMap[signature].usagePositions.get(this.module)[0], "error");
            }
            else {
                signatureMap[signature] = m;
            }
        }
    }
    getInheritanceQuickFix(position, inheritanceError) {
        let s = "";
        for (let m of inheritanceError.missingMethods) {
            s += "\tpublic " + (m.returnType == null ? " void" : getTypeIdentifier(m.returnType)) + " " + m.identifier + "(";
            s += m.parameterlist.parameters.map(p => getTypeIdentifier(p.type) + " " + p.identifier).join(", ");
            s += ") {\n\t\t//TODO: Methode füllen\n\t}\n\n";
        }
        return {
            title: "Fehlende Methoden einfügen",
            editsProvider: (uri) => {
                return [
                    {
                        resource: uri,
                        edit: {
                            range: { startLineNumber: position.line, startColumn: position.column - 1, endLineNumber: position.line, endColumn: position.column - 1 },
                            text: s
                        }
                    }
                ];
            }
        };
    }
    getSuperconstructorCalls(nodes, superconstructorCallsFound, isFirstStatement) {
        for (let node of nodes) {
            if (node == null)
                continue;
            if (node.type == TokenType.superConstructorCall) {
                if (!isFirstStatement) {
                    if (superconstructorCallsFound.length > 0) {
                        this.pushError("Ein Konstruktor darf nur einen einzigen Aufruf des Superkonstruktors enthalten.", node.position, "error");
                    }
                    else {
                        this.pushError("Vor dem Aufruf des Superkonstruktors darf keine andere Anweisung stehen.", node.position, "error");
                    }
                }
                superconstructorCallsFound.push(node);
                isFirstStatement = false;
            }
            else if (node.type == TokenType.scopeNode && node.statements != null) {
                isFirstStatement = isFirstStatement && this.getSuperconstructorCalls(node.statements, superconstructorCallsFound, isFirstStatement);
            }
            else {
                isFirstStatement = false;
            }
        }
        return isFirstStatement;
    }
    compileMethod(methodNode) {
        var _a, _b, _c;
        // Assumption: methodNode != null
        let method = methodNode.resolvedType;
        this.checkIfMethodIsVirtual(method);
        if (method == null)
            return;
        // this.pushUsagePosition(methodNode.position, method);
        this.initCurrentProgram();
        method.program = this.currentProgram;
        this.pushNewSymbolTable(false, methodNode.scopeFrom, methodNode.scopeTo);
        this.currentSymbolTable.method = method;
        let stackPos = 1;
        for (let v of method.getParameterList().parameters) {
            v.stackPos = stackPos++;
            this.currentSymbolTable.variableMap.set(v.identifier, v);
        }
        // " + 1" is for "this"-object
        this.nextFreeRelativeStackPos = methodNode.parameters.length + 1;
        if (method.isConstructor && this.currentSymbolTable.classContext instanceof Klass && methodNode.statements != null) {
            let c = this.currentSymbolTable.classContext;
            let superconstructorCalls = [];
            this.getSuperconstructorCalls(methodNode.statements, superconstructorCalls, true);
            let superconstructorCallEnsured = superconstructorCalls.length > 0;
            // if (methodNode.statements.length > 0 && methodNode.statements[0].type == TokenType.scopeNode) {
            //     let stm = methodNode.statements[0].statements;
            //     if (stm.length > 0 && [TokenType.superConstructorCall, TokenType.constructorCall].indexOf(stm[0].type) >= 0) {
            //         superconstructorCallEnsured = true;
            //     }
            // } else if ([TokenType.superConstructorCall, TokenType.constructorCall].indexOf(methodNode.statements[0].type) >= 0) {
            //     superconstructorCallEnsured = true;
            // }
            if (c != null && ((_a = c.baseClass) === null || _a === void 0 ? void 0 : _a.hasConstructor()) && !((_b = c.baseClass) === null || _b === void 0 ? void 0 : _b.hasParameterlessConstructor())) {
                let error = false;
                if (methodNode.statements == null || methodNode.statements.length == 0)
                    error = true;
                if (!error) {
                    error = !superconstructorCallEnsured;
                }
                if (error) {
                    let quickFix = null;
                    let constructors = c.baseClass.methods.filter(m => m.isConstructor);
                    if (constructors.length == 1) {
                        let methodCall = "super(" + constructors[0].parameterlist.parameters.map(p => p.identifier).join(", ") + ");";
                        let position = methodNode.position;
                        quickFix = {
                            title: 'Aufruf des Konstruktors der Basisklasse einfügen',
                            //06.06.2020
                            editsProvider: (uri) => {
                                return [{
                                        resource: uri,
                                        edit: {
                                            range: {
                                                startLineNumber: position.line + 1, startColumn: 0, endLineNumber: position.line + 1, endColumn: 0,
                                                message: "",
                                                severity: monaco.MarkerSeverity.Error
                                            },
                                            text: "\t\t" + methodCall + "\n"
                                        }
                                    }
                                ];
                            }
                        };
                    }
                    this.pushError("Die Basisklasse der Klasse " + c.identifier + " besitzt keinen parameterlosen Konstruktor, daher muss diese Konstruktordefinition mit einem Aufruf eines Konstruktors der Basisklasse (super(...)) beginnen.", methodNode.position, "error", quickFix);
                }
            }
            else if (!superconstructorCallEnsured && ((_c = c.baseClass) === null || _c === void 0 ? void 0 : _c.hasParameterlessConstructor())) {
                // invoke parameterless constructor
                let baseClassConstructor = c.baseClass.getParameterlessConstructor();
                this.pushStatements([
                    // Push this-object to stack:
                    {
                        type: TokenType.pushLocalVariableToStack,
                        position: methodNode.position,
                        stackposOfVariable: 0
                    },
                    {
                        type: TokenType.callMethod,
                        method: baseClassConstructor,
                        isSuperCall: true,
                        position: methodNode.position,
                        stackframeBegin: -1 // this-object followed by parameters
                    }
                ]);
            }
        }
        let actorClass = this.moduleStore.getType("Actor").type;
        let methodIdentifiers = ["act", "onKeyTyped", "onKeyDown", "onKeyUp",
            "onMouseDown", "onMouseUp", "onMouseMove", "onMouseEnter", "onMouseLeave"];
        if (methodIdentifiers.indexOf(method.identifier) >= 0 && this.currentSymbolTable.classContext.hasAncestorOrIs(actorClass)) {
            this.pushStatements([
                {
                    type: TokenType.returnIfDestroyed,
                    position: methodNode.position
                },
            ]);
        }
        let withReturnStatement = this.generateStatements(methodNode.statements).withReturnStatement;
        if (!withReturnStatement) {
            this.pushStatements({
                type: TokenType.return,
                position: methodNode.scopeTo,
                copyReturnValueToStackframePos0: false,
                stepFinished: true,
                leaveThisObjectOnStack: false
            });
            let rt = method.getReturnType();
            if (!method.isConstructor && rt != null && rt != voidPrimitiveType) {
                this.pushError("Die Deklaration der Methode verlangt die Rückgabe eines Wertes vom Typ " + rt.identifier + ". Es fehlt (mindestens) eine entsprechende return-Anweisung.", methodNode.position);
            }
        }
        method.reserveStackForLocalVariables = this.nextFreeRelativeStackPos
            - methodNode.parameters.length - 1;
        this.popSymbolTable();
        this.currentProgram.labelManager.resolveNodes();
    }
    /**
     * checks if child classes have method with same signature
     */
    checkIfMethodIsVirtual(method) {
        let klass = this.currentSymbolTable.classContext;
        if (klass != null) {
            for (let mo of this.moduleStore.getModules(false)) {
                for (let c of mo.typeStore.typeList) {
                    if (c instanceof Klass && c != klass && c.hasAncestorOrIs(klass)) {
                        for (let m of c.methods) {
                            if (m != null && method != null && m.signature == method.signature) {
                                method.isVirtual = true;
                                return;
                            }
                        }
                    }
                }
            }
        }
    }
    initializeAttribute(attribute) {
        if (attribute == null)
            return;
        // assumption: attribute != null
        if (attribute.identifier == null || attribute.initialization == null || attribute.resolvedType == null)
            return;
        if (attribute.isStatic) {
            this.pushStatements({
                type: TokenType.pushStaticAttribute,
                attributeIndex: attribute.resolvedType.index,
                attributeIdentifier: attribute.resolvedType.identifier,
                position: attribute.initialization.position,
                klass: (this.currentSymbolTable.classContext)
            });
        }
        else {
            this.pushStatements({
                type: TokenType.pushAttribute,
                attributeIndex: attribute.resolvedType.index,
                attributeIdentifier: attribute.identifier,
                position: attribute.initialization.position,
                useThisObject: true
            });
        }
        let initializationType = this.processNode(attribute.initialization);
        if (initializationType != null && initializationType.type != null) {
            if (!this.ensureAutomaticCasting(initializationType.type, attribute.attributeType.resolvedType)) {
                if (attribute.attributeType.resolvedType == null) {
                    this.pushError("Der Datentyp von " + attribute.identifier + " konnte nicht ermittelt werden. ", attribute.position);
                }
                else {
                    this.pushError("Der Wert des Term vom Datentyp " + initializationType.type + " kann dem Attribut " + attribute.identifier + " vom Typ " + attribute.attributeType.resolvedType.identifier + " nicht zugewiesen werden.", attribute.initialization.position);
                }
            }
            this.pushStatements({
                type: TokenType.assignment,
                position: attribute.initialization.position,
                stepFinished: false,
                leaveValueOnStack: false
            });
        }
    }
    initCurrentProgram() {
        this.currentProgram = {
            module: this.module,
            statements: [],
            labelManager: null
        };
        this.currentProgram.labelManager = new LabelManager(this.currentProgram);
        this.lastStatement = null;
    }
    generateMain(isAdhocCompilation = false) {
        this.initCurrentProgram();
        let position = { line: 1, column: 1, length: 0 };
        let mainProgramAst = this.module.mainProgramAst;
        if (mainProgramAst != null && mainProgramAst.length > 0 && mainProgramAst[0] != null) {
            position = this.module.mainProgramAst[0].position;
        }
        if (!isAdhocCompilation) {
            this.pushNewSymbolTable(true, position, { line: 100000, column: 1, length: 0 }, this.currentProgram);
            this.heap = {};
        }
        this.module.mainProgram = this.currentProgram;
        let hasMainProgram = false;
        if (this.module.mainProgramAst != null && this.module.mainProgramAst.length > 0) {
            hasMainProgram = true;
            this.generateStatements(this.module.mainProgramAst);
            if (isAdhocCompilation && this.lastStatement != null && this.lastStatement.type == TokenType.decreaseStackpointer) {
                this.removeLastStatement();
            }
            this.lastPosition = this.module.mainProgramEnd;
            if (this.lastPosition == null)
                this.lastPosition = { line: 100000, column: 0, length: 0 };
            // if(this.lastPosition == null) this.lastPosition = {line: 100000, column: 0, length: 0};
            this.currentSymbolTable.positionTo = this.lastPosition;
            if (!isAdhocCompilation)
                this.popSymbolTable(this.currentProgram, true);
            this.heap = null;
            this.pushStatements({
                type: TokenType.programEnd,
                position: this.lastPosition,
                stepFinished: true,
                pauseAfterProgramEnd: true
            }, true);
        }
        this.currentProgram.labelManager.resolveNodes();
        if (!isAdhocCompilation && !hasMainProgram) {
            this.popSymbolTable(this.currentProgram);
            this.heap = null;
        }
    }
    ensureAutomaticCasting(typeFrom, typeTo, position, nodeFrom) {
        if (typeFrom == null || typeTo == null)
            return false;
        if (typeFrom.equals(typeTo)) {
            return true;
        }
        if (typeFrom.canCastTo(typeTo)) {
            if (typeFrom instanceof PrimitiveType && (typeTo instanceof PrimitiveType || typeTo == stringPrimitiveType)) {
                let castInfo = typeFrom.getCastInformation(typeTo);
                if (!castInfo.automatic) {
                    return false;
                }
            }
            this.pushStatements({
                type: TokenType.castValue,
                position: position,
                newType: typeTo
            });
            return true;
        }
        else {
            if (!typeFrom.canCastTo(typeTo)) {
                if (typeTo == booleanPrimitiveType && nodeFrom != null) {
                    this.checkIfAssignmentInstedOfEqual(nodeFrom);
                }
            }
            return false;
        }
    }
    ensureAutomaticToString(typeFrom, codepos = undefined, textposition) {
        if (typeFrom == stringPrimitiveType)
            return true;
        if (typeFrom == voidPrimitiveType)
            return false;
        let automaticToString;
        if (typeFrom instanceof PrimitiveType) {
            automaticToString = new Method("toString", new Parameterlist([]), stringPrimitiveType, (parameters) => {
                let value = parameters[0];
                return (value.type.valueToString(value));
            }, false, true);
        }
        if ((typeFrom instanceof Klass) || (typeFrom == nullType)) {
            let toStringMethod;
            if (typeFrom == nullType) {
                toStringMethod = objectType.getMethodBySignature("toString()");
            }
            else {
                toStringMethod = typeFrom.getMethodBySignature("toString()");
            }
            if (toStringMethod != null && toStringMethod.getReturnType() == stringPrimitiveType) {
                automaticToString = new Method(toStringMethod.identifier, toStringMethod.parameterlist, stringPrimitiveType, (parameters) => {
                    let value = parameters[0].value;
                    if (value == null)
                        return "null";
                    return toStringMethod.invoke(parameters);
                }, toStringMethod.isAbstract, true, toStringMethod.documentation, toStringMethod.isConstructor);
            }
        }
        if (automaticToString != undefined) {
            this.insertOrPushStatements({
                type: TokenType.callMethod,
                position: textposition,
                method: automaticToString,
                isSuperCall: false,
                stackframeBegin: -1,
                stepFinished: false
            }, codepos);
            return true;
        }
        return false;
    }
    checkIfAssignmentInstedOfEqual(nodeFrom, conditionType) {
        if (nodeFrom == null)
            return;
        if (nodeFrom.type == TokenType.binaryOp && nodeFrom.operator == TokenType.assignment) {
            let pos = nodeFrom.position;
            this.pushError("= ist der Zuweisungsoperator. Du willst sicher zwei Werte vergleichen. Dazu benötigst Du den Vergleichsoperator ==.", pos, conditionType == booleanPrimitiveType ? "warning" : "error", {
                title: '= durch == ersetzen',
                editsProvider: (uri) => {
                    return [{
                            resource: uri,
                            edit: {
                                range: {
                                    startLineNumber: pos.line, startColumn: pos.column, endLineNumber: pos.line, endColumn: pos.column + 1,
                                    message: "",
                                    severity: monaco.MarkerSeverity.Error
                                },
                                text: "=="
                            }
                        }
                    ];
                }
            });
        }
    }
    generateStatements(nodes) {
        if (nodes == null || nodes.length == 0 || nodes[0] == null)
            return { withReturnStatement: false };
        let withReturnStatement = this.processStatementsInsideBlock(nodes);
        let lastNode = nodes[nodes.length - 1];
        let endPosition;
        if (lastNode != null) {
            if (lastNode.type == TokenType.scopeNode) {
                endPosition = lastNode.positionTo;
            }
            else {
                endPosition = Object.assign({}, lastNode.position);
                if (endPosition != null) {
                    endPosition.column += endPosition.length;
                    endPosition.length = 1;
                }
            }
            this.lastPosition = endPosition;
        }
        else {
            endPosition = this.lastPosition;
        }
        return { withReturnStatement: withReturnStatement, endPosition: endPosition };
    }
    processStatementsInsideBlock(nodes) {
        let withReturnStatement = false;
        for (let node of nodes) {
            if (node == null)
                continue;
            let type = this.processNode(node);
            if (type != null && type.withReturnStatement != null && type.withReturnStatement) {
                withReturnStatement = true;
            }
            // If last Statement has value which is not used further then pop this value from stack.
            // e.g. statement 12 + 17 -7;
            // Parser issues a warning in this case, see Parser.checkIfStatementHasNoEffekt
            if (type != null && type.type != null && type.type != voidPrimitiveType) {
                if (this.lastStatement != null &&
                    this.lastStatement.type == TokenType.assignment && this.lastStatement.leaveValueOnStack) {
                    this.lastStatement.leaveValueOnStack = false;
                }
                else {
                    this.pushStatements({
                        type: TokenType.decreaseStackpointer,
                        position: null,
                        popCount: 1,
                        stepFinished: true
                    }, true);
                }
            }
        }
        return withReturnStatement;
    }
    insertStatements(pos, statements) {
        if (statements == null)
            return;
        if (!Array.isArray(statements))
            statements = [statements];
        for (let st of statements) {
            this.currentProgram.statements.splice(pos++, 0, st);
        }
    }
    pushStatements(statement, deleteStepFinishedFlagOnStepBefore = false) {
        if (statement == null)
            return;
        if (deleteStepFinishedFlagOnStepBefore && this.currentProgram.statements.length > 0) {
            let stepBefore = this.currentProgram.statements[this.currentProgram.statements.length - 1];
            stepBefore.stepFinished = false;
        }
        if (Array.isArray(statement)) {
            for (let st of statement) {
                this.currentProgram.statements.push(st);
                if (st.type == TokenType.return || st.type == TokenType.jumpAlways) {
                    if (this.lastStatement != null)
                        this.lastStatement.stepFinished = false;
                }
                if (st.position != null) {
                    this.lastPosition = st.position;
                }
                else {
                    st.position = this.lastPosition;
                }
                this.lastStatement = st;
            }
        }
        else {
            this.currentProgram.statements.push(statement);
            if (statement.type == TokenType.return || statement.type == TokenType.jumpAlways) {
                if (this.lastStatement != null && this.lastStatement.type != TokenType.noOp)
                    this.lastStatement.stepFinished = false;
            }
            if (statement.position != null) {
                this.lastPosition = statement.position;
            }
            else {
                statement.position = this.lastPosition;
            }
            this.lastStatement = statement;
        }
    }
    insertOrPushStatements(statements, pos) {
        if (pos == null && pos == undefined)
            this.pushStatements(statements);
        else
            this.insertStatements(pos, statements);
    }
    removeLastStatement() {
        let lst = this.currentProgram.statements.pop();
        if (this.currentProgram.labelManager != null) {
            this.currentProgram.labelManager.removeNode(lst);
        }
    }
    pushNewSymbolTable(beginNewStackframe, positionFrom, positionTo, program) {
        let st = new SymbolTable(this.currentSymbolTable, positionFrom, positionTo);
        this.symbolTableStack.push(this.currentSymbolTable);
        if (beginNewStackframe) {
            st.beginsNewStackframe = true;
            this.currentSymbolTable.stackframeSize = this.nextFreeRelativeStackPos;
            this.nextFreeRelativeStackPos = 0;
            if (program != null) {
                let initStackFrameNode = {
                    type: TokenType.initStackframe,
                    position: positionFrom,
                    reserveForLocalVariables: 0
                };
                program.statements.push(initStackFrameNode);
                this.initStackFrameNodes.push(initStackFrameNode);
            }
        }
        this.currentSymbolTable = st;
        return st;
    }
    popSymbolTable(program, deleteStepFinishedFlagOnStepBefore = false) {
        let st = this.currentSymbolTable;
        this.currentSymbolTable = this.symbolTableStack.pop();
        // if v.declarationError != null then variable has been used before initialization.
        st.variableMap.forEach(v => {
            if (v.declarationError != null && v.usedBeforeInitialization) {
                this.errorList.push(v.declarationError);
                v.declarationError = null;
            }
        });
        // if (!st.beginsNewStackframe && st.variableMap.size == 0 && removeI) {
        //     // empty symbol table => remove it!
        //     if (st.parent != null) {
        //         st.parent.childSymbolTables.pop();
        //     }
        // } else 
        {
            // TODO: add length of token
            if (st.beginsNewStackframe) {
                st.stackframeSize = this.nextFreeRelativeStackPos;
                this.nextFreeRelativeStackPos = this.currentSymbolTable.stackframeSize;
                if (program != null) {
                    let initStackframeNode = this.initStackFrameNodes.pop();
                    if (initStackframeNode != null)
                        initStackframeNode.reserveForLocalVariables = st.stackframeSize;
                    if (program.statements.length > 0 && deleteStepFinishedFlagOnStepBefore) {
                        let statement = program.statements[program.statements.length - 1];
                        // don't set stepFinished = false in jump-statements
                        // as this could lead to infinity-loop is user sets "while(true);" just before program end
                        if ([TokenType.jumpAlways, TokenType.jumpIfTrue, TokenType.jumpIfFalse, TokenType.jumpIfFalseAndLeaveOnStack, TokenType.jumpIfTrueAndLeaveOnStack].indexOf(statement.type) == -1) {
                            program.statements[program.statements.length - 1].stepFinished = false;
                        }
                    }
                    program.statements.push({
                        type: TokenType.closeStackframe,
                        position: st.positionTo
                    });
                }
            }
        }
    }
    pushError(text, position, errorLevel = "error", quickFix) {
        this.errorList.push({
            text: text,
            position: position,
            quickFix: quickFix,
            level: errorLevel
        });
    }
    openBreakScope() {
        this.breakNodeStack.push([]);
    }
    openContinueScope() {
        this.continueNodeStack.push([]);
    }
    pushBreakNode(breakNode) {
        if (this.breakNodeStack.length == 0) {
            this.pushError("Eine break-Anweisung ist nur innerhalb einer umgebenden Schleife oder switch-Anweisung sinnvoll.", breakNode.position);
        }
        else {
            this.breakNodeStack[this.breakNodeStack.length - 1].push(breakNode);
            this.pushStatements(breakNode);
        }
    }
    pushContinueNode(continueNode) {
        if (this.continueNodeStack.length == 0) {
            this.pushError("Eine continue-Anweisung ist nur innerhalb einer umgebenden Schleife oder switch-Anweisung sinnvoll.", continueNode.position);
        }
        else {
            this.continueNodeStack[this.continueNodeStack.length - 1].push(continueNode);
            this.pushStatements(continueNode);
        }
    }
    closeBreakScope(breakTargetLabel, lm) {
        let breakNodes = this.breakNodeStack.pop();
        for (let bn of breakNodes) {
            lm.registerJumpNode(bn, breakTargetLabel);
        }
    }
    closeContinueScope(continueTargetLabel, lm) {
        let continueNodes = this.continueNodeStack.pop();
        for (let bn of continueNodes) {
            lm.registerJumpNode(bn, continueTargetLabel);
        }
    }
    breakOccured() {
        return this.breakNodeStack.length > 0 && this.breakNodeStack[this.breakNodeStack.length - 1].length > 0;
    }
    processNode(node, isLeftSideOfAssignment = false) {
        if (node == null)
            return;
        switch (node.type) {
            case TokenType.binaryOp:
                return this.processBinaryOp(node);
            case TokenType.unaryOp:
                return this.processUnaryOp(node);
            case TokenType.pushConstant:
                return this.pushConstant(node);
            case TokenType.callMethod:
                return this.callMethod(node);
            case TokenType.identifier:
                {
                    let stackType = this.resolveIdentifier(node);
                    let v = node.variable;
                    if (v != null) {
                        if (isLeftSideOfAssignment) {
                            v.initialized = true;
                            if (!v.usedBeforeInitialization) {
                                v.declarationError = null;
                            }
                        }
                        else {
                            if (v.initialized != null && !v.initialized) {
                                v.usedBeforeInitialization = true;
                                this.pushError("Die Variable " + v.identifier + " wird hier benutzt bevor sie initialisiert wurde.", node.position, "info");
                            }
                        }
                    }
                    return stackType;
                }
            case TokenType.selectArrayElement:
                return this.selectArrayElement(node);
            case TokenType.incrementDecrementBefore:
            case TokenType.incrementDecrementAfter:
                return this.incrementDecrementBeforeOrAfter(node);
            case TokenType.superConstructorCall:
                return this.superconstructorCall(node);
            case TokenType.constructorCall:
                return this.superconstructorCall(node);
            case TokenType.keywordThis:
                return this.pushThisOrSuper(node, false);
            case TokenType.keywordSuper:
                return this.pushThisOrSuper(node, true);
            case TokenType.pushAttribute:
                return this.pushAttribute(node);
            case TokenType.newObject:
                return this.newObject(node);
            case TokenType.keywordWhile:
                return this.processWhile(node);
            case TokenType.keywordDo:
                return this.processDo(node);
            case TokenType.keywordFor:
                return this.processFor(node);
            case TokenType.forLoopOverCollection:
                return this.processForLoopOverCollection(node);
            case TokenType.keywordIf:
                return this.processIf(node);
            case TokenType.keywordSwitch:
                return this.processSwitch(node);
            case TokenType.keywordReturn:
                return this.processReturn(node);
            case TokenType.localVariableDeclaration:
                return this.localVariableDeclaration(node);
            case TokenType.arrayInitialization:
                return this.processArrayLiteral(node);
            case TokenType.newArray:
                return this.processNewArray(node);
            case TokenType.keywordPrint:
            case TokenType.keywordPrintln:
                return this.processPrint(node);
            case TokenType.castValue:
                return this.processManualCast(node);
            case TokenType.keywordBreak:
                this.pushBreakNode({
                    type: TokenType.jumpAlways,
                    position: node.position
                });
                return null;
            case TokenType.keywordContinue:
                this.pushContinueNode({
                    type: TokenType.jumpAlways,
                    position: node.position
                });
                return null;
            case TokenType.rightBracket:
                let type = this.processNode(node.termInsideBrackets);
                if (type != null && type.type instanceof Klass)
                    this.pushTypePosition(node.position, type.type);
                return type;
            case TokenType.scopeNode:
                this.pushNewSymbolTable(false, node.position, node.positionTo);
                let withReturnStatement = this.processStatementsInsideBlock(node.statements);
                this.popSymbolTable();
                return { type: null, isAssignable: false, withReturnStatement: withReturnStatement };
        }
    }
    processManualCast(node) {
        let typeFrom1 = this.processNode(node.whatToCast);
        if (typeFrom1 == null || typeFrom1.type == null)
            return;
        let typeFrom = typeFrom1.type;
        if (typeFrom != null && node.castToType != null && node.castToType.resolvedType != null) {
            let typeTo = node.castToType.resolvedType;
            if (typeFrom.canCastTo(typeTo)) {
                this.pushCastToStatement(typeFrom, typeTo, node);
                return {
                    isAssignable: typeFrom1.isAssignable,
                    type: typeTo
                };
            }
            if ((typeFrom instanceof Klass || typeFrom instanceof Interface) && (typeTo instanceof Klass || typeTo instanceof Interface)) 
            // if (typeFrom instanceof Klass &&
            //     (typeTo instanceof Klass && !typeFrom.hasAncestorOrIs(typeTo) && typeTo.hasAncestorOrIs(typeFrom)) ||
            //     (typeTo instanceof Interface && !(<Klass>typeFrom).implementsInterface(typeTo))) 
            {
                this.pushStatements({
                    type: TokenType.checkCast,
                    position: node.position,
                    newType: typeTo,
                    stepFinished: false
                });
                return {
                    isAssignable: typeFrom1.isAssignable,
                    type: typeTo
                };
            }
            else {
                this.pushError("Der Datentyp " + typeFrom.identifier + " kann (zumindest durch casting) nicht in den Datentyp " + typeTo.identifier + " umgewandelt werden.", node.position);
            }
        }
    }
    pushCastToStatement(typeFrom, typeTo, node) {
        let needsStatement = typeFrom != typeTo;
        if (needsStatement)
            this.pushStatements({
                type: TokenType.castValue,
                position: node.position,
                newType: typeTo
            });
    }
    processPrint(node) {
        var _a;
        let type = node.type == TokenType.keywordPrint ? TokenType.print : TokenType.println;
        this.module.pushMethodCallPosition(node.position, node.commaPositions, TokenTypeReadable[node.type], node.rightBracketPosition);
        if (node.text != null) {
            let type = this.processNode(node.text);
            if (type != null) {
                if (!this.ensureAutomaticToString(type.type)) {
                    this.pushError("Die Methoden print und println erwarten einen Parameter vom Typ String. Gefunden wurde ein Wert vom Typ " + ((_a = type.type) === null || _a === void 0 ? void 0 : _a.identifier) + ".", node.position);
                }
            }
        }
        let withColor = false;
        if (node.color != null) {
            let type = this.processNode(node.color);
            if (type != null) {
                if (type.type != stringPrimitiveType && type.type != intPrimitiveType) {
                    if (!this.ensureAutomaticCasting(type.type, stringPrimitiveType)) {
                        this.pushError("Die Methoden print und println erwarten als Farbe einen Parameter vom Typ String oder int. Gefunden wurde ein Wert vom Typ " + type.type.identifier + ".", node.position);
                    }
                }
            }
            withColor = true;
        }
        this.pushStatements({
            type: type,
            position: node.position,
            empty: (node.text == null),
            stepFinished: true,
            withColor: withColor
        });
        return null;
    }
    processNewArray(node) {
        if (node.initialization != null) {
            return this.processArrayLiteral(node.initialization);
        }
        // int[7][2][] are 7 arrays each with arrays of length 2 which are empty
        let dimension = 0;
        for (let ec of node.elementCount) {
            if (ec != null) {
                this.processNode(ec); // push number of elements for this dimension on stack
                dimension++;
            }
            else {
                break;
            }
        }
        // for the array above: arrayType is array of array of int; dimension is 2; stack: 7 2
        this.pushStatements({
            type: TokenType.pushEmptyArray,
            position: node.position,
            arrayType: node.arrayType.resolvedType,
            dimension: dimension
        });
        return {
            isAssignable: false,
            type: node.arrayType.resolvedType
        };
    }
    processArrayLiteral(node) {
        var _a;
        let bes = {
            type: TokenType.beginArray,
            position: node.position,
            arrayType: node.arrayType.resolvedType
        };
        this.pushStatements(bes);
        for (let ain of node.nodes) {
            // Did an error occur when parsing a constant?
            if (ain == null) {
                continue;
            }
            if (ain.type == TokenType.arrayInitialization) {
                this.processArrayLiteral(ain);
            }
            else {
                let sType = this.processNode(ain);
                if (sType == null) {
                    return;
                }
                let targetType = node.arrayType.resolvedType.arrayOfType;
                if (!this.ensureAutomaticCasting(sType.type, targetType, ain.position)) {
                    this.pushError("Der Datentyp des Terms (" + ((_a = sType.type) === null || _a === void 0 ? void 0 : _a.identifier) + ") kann nicht in den Datentyp " + (targetType === null || targetType === void 0 ? void 0 : targetType.identifier) + " konvertiert werden.", ain.position);
                }
            }
        }
        this.pushStatements({
            type: TokenType.addToArray,
            position: node.position,
            numberOfElementsToAdd: node.nodes.length
        });
        return {
            isAssignable: false,
            type: node.arrayType.resolvedType
        };
    }
    localVariableDeclaration(node, dontWarnWhenNoInitialization = false) {
        if (node.variableType.resolvedType == null) {
            node.variableType.resolvedType = nullType; // Make the best out of it...
        }
        let declareVariableOnHeap = (this.heap != null && this.symbolTableStack.length <= 2);
        let variable = {
            identifier: node.identifier,
            stackPos: declareVariableOnHeap ? null : this.nextFreeRelativeStackPos++,
            type: node.variableType.resolvedType,
            usagePositions: new Map(),
            declaration: { module: this.module, position: node.position },
            isFinal: node.isFinal
        };
        this.pushUsagePosition(node.position, variable);
        if (declareVariableOnHeap) {
            this.pushStatements({
                type: TokenType.heapVariableDeclaration,
                position: node.position,
                pushOnTopOfStackForInitialization: node.initialization != null,
                variable: variable,
                stepFinished: node.initialization == null
            });
            if (this.heap[variable.identifier]) {
                this.pushError("Die Variable " + node.identifier + " darf im selben Sichtbarkeitsbereich (Scope) nicht mehrmals definiert werden.", node.position);
            }
            this.heap[variable.identifier] = variable;
            // only for code completion:
            this.currentSymbolTable.variableMap.set(node.identifier, variable);
        }
        else {
            if (this.currentSymbolTable.variableMap.get(node.identifier)) {
                this.pushError("Die Variable " + node.identifier + " darf im selben Sichtbarkeitsbereich (Scope) nicht mehrmals definiert werden.", node.position);
            }
            this.currentSymbolTable.variableMap.set(node.identifier, variable);
            this.pushStatements({
                type: TokenType.localVariableDeclaration,
                position: node.position,
                pushOnTopOfStackForInitialization: node.initialization != null,
                variable: variable,
                stepFinished: node.initialization == null
            });
        }
        if (node.initialization != null) {
            let initType = this.processNode(node.initialization);
            if (initType != null) {
                if (variable.type == varType) {
                    variable.type = initType.type;
                }
                else if (initType.type == null) {
                    this.pushError("Der Typ des Terms auf der rechten Seite des Zuweisungsoperators (=) konnte nicht bestimmt werden.", node.initialization.position);
                }
                else if (!this.ensureAutomaticCasting(initType.type, variable.type)) {
                    this.pushError("Der Term vom Typ " + initType.type.identifier + " kann der Variable vom Typ " + variable.type.identifier + " nicht zugeordnet werden.", node.initialization.position);
                }
                ;
                this.pushStatements({
                    type: TokenType.assignment,
                    position: node.initialization.position,
                    stepFinished: true,
                    leaveValueOnStack: false
                });
            }
        }
        else {
            if (variable.type == varType) {
                this.pushError("Die Verwendung von var ist nur dann zulässig, wenn eine lokale Variable in einer Anweisung deklariert und initialisiert wird, also z.B. var i = 12;", node.variableType.position);
            }
            else {
                let initializer = " = null";
                if (variable.type == intPrimitiveType)
                    initializer = " = 0";
                if (variable.type == doublePrimitiveType)
                    initializer = " = 0.0";
                if (variable.type == booleanPrimitiveType)
                    initializer = " = false";
                if (variable.type == charPrimitiveType)
                    initializer = " = ' '";
                if (variable.type == stringPrimitiveType)
                    initializer = ' = ""';
                variable.declarationError = {
                    text: "Jede lokale Variable sollte vor ihrer ersten Verwendung initialisiert werden.",
                    position: node.position,
                    quickFix: {
                        title: initializer + " ergänzen",
                        editsProvider: (uri) => {
                            let pos = node.position;
                            return [
                                {
                                    resource: uri,
                                    edit: {
                                        range: { startLineNumber: pos.line, startColumn: pos.column + pos.length, endLineNumber: pos.line, endColumn: pos.column + pos.length },
                                        text: initializer
                                    }
                                }
                            ];
                        }
                    },
                    level: "info"
                };
                variable.usedBeforeInitialization = false;
                variable.initialized = dontWarnWhenNoInitialization;
            }
        }
        return null;
    }
    processReturn(node) {
        let method = this.currentSymbolTable.method;
        if (method == null) {
            this.pushError("Eine return-Anweisung ist nur im Kontext einer Methode erlaubt.", node.position);
            return null;
        }
        if (node.term != null) {
            if (method.getReturnType() == null) {
                this.pushError("Die Methode " + method.identifier + " erwartet keinen Rückgabewert.", node.position);
                return null;
            }
            let type = this.processNode(node.term);
            if (type != null) {
                if (!this.ensureAutomaticCasting(type.type, method.getReturnType(), null, node)) {
                    this.pushError("Die Methode " + method.identifier + " erwartet einen Rückgabewert vom Typ " + method.getReturnType().identifier + ". Gefunden wurde ein Wert vom Typ " + type.type.identifier + ".", node.position);
                }
            }
        }
        else {
            if (method.getReturnType() != null && method.getReturnType() != voidPrimitiveType) {
                this.pushError("Die Methode " + method.identifier + " erwartet einen Rückgabewert vom Typ " + method.getReturnType().identifier + ", daher ist die leere Return-Anweisung (return;) nicht ausreichend.", node.position);
            }
        }
        this.pushStatements({
            type: TokenType.return,
            position: node.position,
            copyReturnValueToStackframePos0: node.term != null,
            stepFinished: true,
            leaveThisObjectOnStack: false
        });
        return { type: null, isAssignable: false, withReturnStatement: true };
    }
    processSwitch(node) {
        let lm = this.currentProgram.labelManager;
        this.pushNewSymbolTable(false, node.scopeFrom, node.scopeTo);
        let ct = this.processNode(node.condition);
        if (ct == null || ct.type == null)
            return;
        let conditionType = ct.type;
        let isString = conditionType == stringPrimitiveType || conditionType == charPrimitiveType;
        let isInteger = conditionType == intPrimitiveType;
        let isEnum = conditionType instanceof Enum;
        if (!(isString || isInteger || isEnum)) {
            this.pushError("Der Unterscheidungsterms einer switch-Anweisung muss den Datentyp String, char, int oder enum besitzen. Dieser hier ist vom Typ " + conditionType.identifier, node.condition.position);
        }
        if (isEnum) {
            this.pushStatements({
                type: TokenType.castValue,
                position: node.condition.position,
                newType: intPrimitiveType
            });
        }
        let switchStatement = {
            type: TokenType.keywordSwitch,
            position: node.position,
            defaultDestination: null,
            switchType: isString ? "string" : "number",
            destinationLabels: [],
            destinationMap: {}
        };
        this.pushStatements(switchStatement);
        // if value not included in case-statement and no default-statement present:
        let endLabel = lm.insertJumpNode(TokenType.jumpAlways, node.position, this);
        switchStatement.stepFinished = true;
        lm.registerSwitchStatement(switchStatement);
        this.openBreakScope();
        let withReturnStatement = node.caseNodes.length > 0;
        for (let caseNode of node.caseNodes) {
            let isDefault = caseNode.caseTerm == null;
            if (!isDefault) {
                let constant = null;
                if (isEnum && caseNode.caseTerm.type == TokenType.identifier) {
                    let en = conditionType;
                    let info = en.identifierToInfoMap[caseNode.caseTerm.identifier];
                    if (info == null) {
                        this.pushError("Die Enum-Klasse " + conditionType.identifier + " hat kein Element mit dem Bezeichner " + caseNode.caseTerm.identifier, caseNode.position, "error");
                    }
                    else {
                        constant = info.ordinal;
                    }
                }
                else {
                    let caseTerm = this.processNode(caseNode.caseTerm);
                    let ls = this.lastStatement;
                    if (ls.type == TokenType.pushConstant) {
                        constant = ls.value;
                    }
                    if (ls.type == TokenType.pushEnumValue) {
                        constant = ls.enumClass.getOrdinal(ls.valueIdentifier);
                    }
                    this.removeLastStatement();
                }
                if (constant == null) {
                    this.pushError("Der Term bei case muss konstant sein.", caseNode.caseTerm.position);
                }
                let label = lm.markJumpDestination(1);
                let statements = this.generateStatements(caseNode.statements);
                if ((statements === null || statements === void 0 ? void 0 : statements.withReturnStatement) == null || !statements.withReturnStatement) {
                    withReturnStatement = false;
                }
                switchStatement.destinationLabels.push({
                    constant: constant,
                    label: label
                });
            }
            else {
                // default case
                let label = lm.markJumpDestination(1);
                let statements = this.generateStatements(caseNode.statements);
                if ((statements === null || statements === void 0 ? void 0 : statements.withReturnStatement) == null || !statements.withReturnStatement) {
                    withReturnStatement = false;
                }
                switchStatement.defaultDestination = label;
            }
        }
        if (switchStatement.defaultDestination == null) {
            withReturnStatement = false;
        }
        lm.markJumpDestination(1, endLabel);
        this.closeBreakScope(endLabel, lm);
        this.popSymbolTable(null);
        return { type: null, isAssignable: false, withReturnStatement: withReturnStatement };
    }
    processIf(node) {
        let lm = this.currentProgram.labelManager;
        let conditionType = this.processNode(node.condition);
        this.checkIfAssignmentInstedOfEqual(node.condition, conditionType === null || conditionType === void 0 ? void 0 : conditionType.type);
        if (conditionType != null && conditionType.type != booleanPrimitiveType) {
            this.pushError("Der Wert des Terms in Klammern hinter 'if' muss den Datentyp boolean besitzen.", node.condition.position);
        }
        let beginElse = lm.insertJumpNode(TokenType.jumpIfFalse, null, this);
        let withReturnStatementIf = this.generateStatements(node.statementsIfTrue).withReturnStatement;
        let endOfIf;
        if (node.statementsIfFalse != null) {
            endOfIf = lm.insertJumpNode(TokenType.jumpAlways, null, this);
        }
        lm.markJumpDestination(1, beginElse);
        let withReturnStatementElse;
        if (node.statementsIfFalse == null || node.statementsIfFalse.length == 0) {
            withReturnStatementElse = false;
        }
        else {
            withReturnStatementElse = this.generateStatements(node.statementsIfFalse).withReturnStatement;
        }
        if (endOfIf != null) {
            lm.markJumpDestination(1, endOfIf);
        }
        return { type: null, isAssignable: false, withReturnStatement: withReturnStatementIf && withReturnStatementElse };
    }
    processFor(node) {
        let lm = this.currentProgram.labelManager;
        this.pushNewSymbolTable(false, node.scopeFrom, node.scopeTo);
        this.generateStatements(node.statementsBefore);
        let labelBeforeCondition = lm.markJumpDestination(1);
        let conditionType = this.processNode(node.condition);
        if (conditionType != null && conditionType.type != booleanPrimitiveType) {
            this.checkIfAssignmentInstedOfEqual(node.condition);
            this.pushError("Der Wert der Bedingung muss den Datentyp boolean besitzen.", node.condition.position);
        }
        let labelAfterForLoop = lm.insertJumpNode(TokenType.jumpIfFalse, null, this);
        this.openBreakScope();
        this.openContinueScope();
        let statements = this.generateStatements(node.statements);
        let withReturnStatement = statements.withReturnStatement;
        let continueLabelIndex = lm.markJumpDestination(1);
        this.closeContinueScope(continueLabelIndex, lm);
        this.generateStatements(node.statementsAfter);
        lm.insertJumpNode(TokenType.jumpAlways, statements.endPosition, this, labelBeforeCondition);
        lm.markJumpDestination(1, labelAfterForLoop);
        this.closeBreakScope(labelAfterForLoop, lm);
        this.popSymbolTable();
        return { type: null, isAssignable: false, withReturnStatement: withReturnStatement };
    }
    processForLoopOverCollection(node) {
        let lm = this.currentProgram.labelManager;
        this.pushNewSymbolTable(false, node.scopeFrom, node.scopeTo);
        // reserve position on stack for collection
        let stackPosForCollection = this.nextFreeRelativeStackPos++;
        // assign value of collection term to collection
        let ct = this.processNode(node.collection);
        if (ct == null)
            return;
        let collectionType = ct.type;
        this.pushStatements({
            type: TokenType.popAndStoreIntoVariable,
            position: node.collection.position,
            stackposOfVariable: stackPosForCollection,
            stepFinished: false
        });
        let collectionElementType;
        let kind = null;
        if (collectionType instanceof ArrayType) {
            collectionElementType = collectionType.arrayOfType;
            kind = "array";
        }
        else if (collectionType instanceof Klass && collectionType.getImplementedInterface("Iterable") != null) {
            if (collectionType.module.isSystemModule) {
                kind = "internalList";
            }
            else {
                kind = "userDefinedIterable";
            }
            let iterableInterface = collectionType.getImplementedInterface("Iterable");
            if (collectionType.typeVariables.length == 0) {
                collectionElementType = objectType;
            }
            else {
                collectionElementType = collectionType.typeVariables[0].type;
            }
        }
        else if (collectionType instanceof Klass && collectionType.identifier == "Group") {
            kind = "group";
            collectionElementType = this.moduleStore.getType("Shape").type;
        }
        else {
            this.pushError("Mit der vereinfachten for-Schleife (for identifier : collectionOrArray) kann man nur über Arrays oder Klassen, die das Interface Iterable implementieren, iterieren.", node.collection.position);
            return null;
        }
        let variableType = node.variableType.resolvedType;
        if (variableType == null)
            return null;
        let noCastingNeeded = variableType == varType;
        if (noCastingNeeded) {
            variableType = collectionElementType;
            node.variableType.resolvedType = collectionElementType;
        }
        else {
            if (!collectionElementType.canCastTo(variableType)) {
                this.pushError("Der ElementTyp " + collectionElementType.identifier + " der Collection kann nicht in den Typ " + variableType.identifier + " der Iterationsvariable " + node.variableIdentifier + " konvertiert werden.", node.position);
                return null;
            }
        }
        this.localVariableDeclaration({
            type: TokenType.localVariableDeclaration,
            identifier: node.variableIdentifier,
            initialization: null,
            isFinal: false,
            position: node.variablePosition,
            variableType: node.variableType
        }, true);
        let variableStackPos = this.nextFreeRelativeStackPos - 1;
        let stackPosOfCounterVariableOrIterator = this.nextFreeRelativeStackPos++;
        if (kind == "array" || kind == "internalList" || kind == "group") {
            this.pushStatements([{
                    type: TokenType.extendedForLoopInit,
                    position: node.position,
                    stepFinished: false,
                    stackPosOfCollection: stackPosForCollection,
                    stackPosOfElement: variableStackPos,
                    typeOfElement: variableType,
                    stackPosOfCounter: stackPosOfCounterVariableOrIterator
                }], true);
        }
        else {
            // get Iterator from collection
            this.pushStatements([
                {
                    type: TokenType.pushLocalVariableToStack,
                    position: node.position,
                    stackposOfVariable: stackPosOfCounterVariableOrIterator,
                    stepFinished: false
                },
                {
                    type: TokenType.pushLocalVariableToStack,
                    position: node.position,
                    stackposOfVariable: stackPosForCollection,
                    stepFinished: false
                },
                {
                    type: TokenType.callMethod,
                    position: node.position,
                    stepFinished: false,
                    isSuperCall: false,
                    method: collectionType.getMethod("iterator", new Parameterlist([])),
                    stackframeBegin: -1
                },
                {
                    type: TokenType.assignment,
                    position: node.position,
                    stepFinished: true,
                    leaveValueOnStack: false
                }
            ], true);
        }
        let labelBeforeCondition = lm.markJumpDestination(1);
        let labelAfterForLoop;
        let lastStatementBeforeCasting;
        if (kind == "array" || kind == "internalList" || kind == "group") {
            let jumpNode = {
                type: TokenType.extendedForLoopCheckCounterAndGetElement,
                kind: kind,
                position: node.variablePosition,
                stepFinished: true,
                stackPosOfCollection: stackPosForCollection,
                stackPosOfElement: variableStackPos,
                stackPosOfCounter: stackPosOfCounterVariableOrIterator,
                destination: 0 // gets filled in later,
            };
            lastStatementBeforeCasting = jumpNode;
            labelAfterForLoop = lm.registerJumpNode(jumpNode);
            this.pushStatements(jumpNode);
        }
        else {
            // call collection.hasNext()
            this.pushStatements([
                {
                    type: TokenType.pushLocalVariableToStack,
                    position: node.variablePosition,
                    stackposOfVariable: stackPosForCollection,
                    stepFinished: false
                },
                {
                    type: TokenType.callMethod,
                    position: node.position,
                    stepFinished: false,
                    isSuperCall: false,
                    method: collectionType.getMethod("hasNext", new Parameterlist([])),
                    stackframeBegin: -1
                },
            ]);
            labelAfterForLoop = lm.insertJumpNode(TokenType.jumpIfFalse, null, this);
            // call collection.next() and assign to loop variable
            this.pushStatements([
                {
                    type: TokenType.pushLocalVariableToStack,
                    position: node.position,
                    stackposOfVariable: variableStackPos,
                    stepFinished: false
                },
                {
                    type: TokenType.pushLocalVariableToStack,
                    position: node.position,
                    stackposOfVariable: stackPosForCollection,
                    stepFinished: false
                },
                {
                    type: TokenType.callMethod,
                    position: node.position,
                    stepFinished: false,
                    isSuperCall: false,
                    method: collectionType.getMethod("next", new Parameterlist([])),
                    stackframeBegin: -1
                },
                {
                    type: TokenType.assignment,
                    position: node.position,
                    stepFinished: true,
                    leaveValueOnStack: false
                }
            ]);
        }
        if (!noCastingNeeded) {
            let oldStatementCount = this.currentProgram.statements.length;
            this.pushStatements({
                type: TokenType.pushLocalVariableToStack,
                position: node.position,
                stackposOfVariable: variableStackPos,
                stepFinished: false
            });
            this.ensureAutomaticCasting(collectionElementType, variableType);
            if (this.currentProgram.statements.length < oldStatementCount + 2) {
                // casting needed no statement, so delete pushLocalVariabletoStack-Statement
                this.currentProgram.statements.pop();
            }
            else {
                this.pushStatements({
                    type: TokenType.popAndStoreIntoVariable,
                    stackposOfVariable: variableStackPos,
                    position: node.position,
                    stepFinished: true
                });
                lastStatementBeforeCasting.stepFinished = false;
            }
        }
        this.openBreakScope();
        this.openContinueScope();
        let statements = this.generateStatements(node.statements);
        let withReturnStatement = statements.withReturnStatement;
        let continueLabelIndex = lm.markJumpDestination(1);
        this.closeContinueScope(continueLabelIndex, lm);
        lm.insertJumpNode(TokenType.jumpAlways, statements.endPosition, this, labelBeforeCondition);
        lm.markJumpDestination(1, labelAfterForLoop);
        this.closeBreakScope(labelAfterForLoop, lm);
        this.popSymbolTable();
        return { type: null, isAssignable: false, withReturnStatement: withReturnStatement };
    }
    processWhile(node) {
        let lm = this.currentProgram.labelManager;
        this.pushNewSymbolTable(false, node.scopeFrom, node.scopeTo);
        let conditionBeginLabel = lm.markJumpDestination(1);
        let conditionType = this.processNode(node.condition);
        if (conditionType != null && conditionType.type != booleanPrimitiveType) {
            this.checkIfAssignmentInstedOfEqual(node.condition);
            this.pushError("Der Wert des Terms in Klammern hinter 'while' muss den Datentyp boolean besitzen.", node.condition.position);
        }
        let position = node.position;
        if (node.condition != null) {
            position = node.condition.position;
        }
        let afterWhileStatementLabel = lm.insertJumpNode(TokenType.jumpIfFalse, position, this);
        this.openBreakScope();
        this.openContinueScope();
        let pc = this.currentProgram.statements.length;
        let statements = this.generateStatements(node.statements);
        let withReturnStatement = statements.withReturnStatement;
        if (this.currentProgram.statements.length == pc) {
            this.insertNoOp(node.scopeTo, false);
        }
        this.closeContinueScope(conditionBeginLabel, lm);
        lm.insertJumpNode(TokenType.jumpAlways, statements.endPosition, this, conditionBeginLabel);
        lm.markJumpDestination(1, afterWhileStatementLabel);
        this.closeBreakScope(afterWhileStatementLabel, lm);
        this.popSymbolTable();
        return { type: null, isAssignable: false, withReturnStatement: withReturnStatement };
    }
    insertNoOp(position, stepFinished) {
        this.pushStatements({
            type: TokenType.noOp,
            position: position,
            stepFinished: stepFinished
        });
    }
    processDo(node) {
        let lm = this.currentProgram.labelManager;
        this.pushNewSymbolTable(false, node.scopeFrom, node.scopeTo);
        let statementsBeginLabel = lm.markJumpDestination(1);
        this.openBreakScope();
        this.openContinueScope();
        let pc = this.currentProgram.statements.length;
        let statements = this.generateStatements(node.statements);
        let withReturnStatement = statements.withReturnStatement;
        if (this.currentProgram.statements.length == pc) {
            this.insertNoOp(node.scopeTo, false);
        }
        let continueLabelIndex = lm.markJumpDestination(1);
        this.closeContinueScope(continueLabelIndex, lm);
        let conditionType = this.processNode(node.condition);
        if (conditionType != null && conditionType.type != booleanPrimitiveType) {
            this.checkIfAssignmentInstedOfEqual(node.condition);
            this.pushError("Der Wert des Terms in Klammern hinter 'while' muss den Datentyp boolean besitzen.", node.condition.position);
        }
        lm.insertJumpNode(TokenType.jumpIfTrue, statements.endPosition, this, statementsBeginLabel);
        let endLabel = lm.markJumpDestination(1);
        this.closeBreakScope(endLabel, lm);
        this.popSymbolTable();
        return { type: null, isAssignable: false, withReturnStatement: withReturnStatement };
    }
    newObject(node) {
        var _a;
        if (node.classType == null || node.classType.resolvedType == null)
            return null;
        let resolvedType = node.classType.resolvedType;
        if (!(resolvedType instanceof Klass)) {
            this.pushError(node.classType.identifier + " ist keine Klasse, daher kann davon mit 'new' kein Objekt erzeugt werden.", node.position);
            return null;
        }
        if (resolvedType.isAbstract) {
            this.pushError(`${node.classType.identifier} ist eine abstrakte Klasse, daher kann von ihr mit 'new' kein Objekt instanziert werden. Falls ${node.classType.identifier} nicht-abstrakte Kindklassen besitzt, könntest Du von DENEN mit new Objekte instanzieren...`, node.position);
            return null;
        }
        //this.pushTypePosition(node.rightBracketPosition, classType);
        if (resolvedType.module != this.module && resolvedType.visibility != Visibility.public) {
            this.pushError("Die Klasse " + resolvedType.identifier + " ist hier nicht sichtbar.", node.position);
        }
        let newStatement = {
            type: TokenType.newObject,
            position: node.position,
            class: resolvedType,
            subsequentConstructorCall: false,
            stepFinished: true
        };
        this.pushStatements(newStatement);
        this.pushTypePosition(node.rightBracketPosition, resolvedType); // to enable code completion when typing a point after the closing bracket
        let parameterTypes = [];
        // let parameterStatements: Statement[][] = [];
        let positionsAfterParameterStatements = [];
        let allStatements = this.currentProgram.statements;
        if (((_a = node.constructorOperands) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            // for (let p of node.constructorOperands) {
            for (let j = 0; j < node.constructorOperands.length; j++) {
                let p = node.constructorOperands[j];
                // let programPointer = allStatements.length;
                let typeNode = this.processNode(p);
                // parameterStatements.push(allStatements.splice(programPointer, allStatements.length - programPointer));
                positionsAfterParameterStatements.push(allStatements.length);
                if (typeNode == null) {
                    parameterTypes.push(voidPrimitiveType);
                }
                else {
                    parameterTypes.push(typeNode.type);
                }
            }
        }
        let upToVisibility = getVisibilityUpTo(resolvedType, this.currentSymbolTable.classContext);
        // let methods = resolvedType.getMethodsThatFitWithCasting(resolvedType.identifier,
        //     parameterTypes, true, upToVisibility);
        let methods = resolvedType.getConstructor(parameterTypes, upToVisibility);
        this.module.pushMethodCallPosition(node.position, node.commaPositions, resolvedType.getMethods(Visibility.public, resolvedType.identifier), node.rightBracketPosition);
        // if there's no parameterless constructor then return without error:
        if (parameterTypes.length > 0 || resolvedType.hasConstructor()) {
            if (methods.error != null) {
                this.pushError(methods.error, node.position);
                return { type: resolvedType, isAssignable: false }; // try to continue...
            }
            let method = methods.methodList[0];
            this.pushUsagePosition(node.position, method);
            let staticClassContext = null;
            let classContext = this.currentSymbolTable.classContext;
            if (classContext != null && classContext instanceof Klass) {
                staticClassContext = classContext.staticClass;
            }
            if (method.visibility == Visibility.private && resolvedType != classContext && resolvedType != staticClassContext) {
                let ok = (resolvedType == classContext || resolvedType != staticClassContext || (classContext instanceof StaticClass && resolvedType == classContext.Klass));
                if (!ok) {
                    this.pushError("Die Konstruktormethode ist private und daher hier nicht sichtbar.", node.position);
                }
            }
            let destType = null;
            for (let i = 0; i < parameterTypes.length; i++) {
                if (i < method.getParameterCount()) { // possible ellipsis!
                    destType = method.getParameterType(i);
                    if (i == method.getParameterCount() - 1 && method.hasEllipsis()) {
                        destType = destType.arrayOfType;
                    }
                }
                let srcType = parameterTypes[i];
                // for (let st of parameterStatements[i]) {
                //     this.currentProgram.statements.push(st);
                // }
                let programPosition = allStatements.length;
                if (!this.ensureAutomaticCasting(srcType, destType, node.constructorOperands[i].position, node.constructorOperands[i])) {
                    this.pushError("Der Wert vom Datentyp " + srcType.identifier + " kann nicht als Parameter (Datentyp " + destType.identifier + ") verwendet werden.", node.constructorOperands[i].position);
                }
                if (allStatements.length > programPosition) {
                    let castingStatements = allStatements.splice(programPosition, allStatements.length - programPosition);
                    allStatements.splice(positionsAfterParameterStatements[i], 0, ...castingStatements);
                    this.currentProgram.labelManager.correctPositionsAfterInsert(positionsAfterParameterStatements[i], castingStatements.length);
                }
            }
            let stackframeDelta = 0;
            if (method.hasEllipsis()) {
                let ellipsisParameterCount = parameterTypes.length - method.getParameterCount() + 1; // last parameter and subsequent ones
                stackframeDelta = -(ellipsisParameterCount - 1);
                this.pushStatements({
                    type: TokenType.makeEllipsisArray,
                    position: node.constructorOperands[method.getParameterCount() - 1].position,
                    parameterCount: ellipsisParameterCount,
                    stepFinished: false,
                    arrayType: method.getParameter(method.getParameterCount() - 1).type
                });
            }
            this.pushStatements({
                type: TokenType.callMethod,
                method: method,
                position: node.position,
                isSuperCall: false,
                stepFinished: resolvedType.getPostConstructorCallbacks() == null,
                stackframeBegin: -(parameterTypes.length + 1 + stackframeDelta) // this-object followed by parameters
            }, true);
            newStatement.subsequentConstructorCall = true;
            newStatement.stepFinished = false;
        }
        if (resolvedType.getPostConstructorCallbacks() != null) {
            this.pushStatements({
                type: TokenType.processPostConstructorCallbacks,
                position: node.position,
                stepFinished: true
            }, true);
        }
        return { type: resolvedType, isAssignable: false };
    }
    pushAttribute(node) {
        if (node.object == null || node.identifier == null)
            return null;
        let ot = this.processNode(node.object);
        if (ot == null) {
            this.pushError('Links vom Punkt steht kein Objekt.', node.position);
            return null;
        }
        if (!(ot.type instanceof Klass || ot.type instanceof StaticClass || ot.type instanceof ArrayType)) {
            if (ot.type == null) {
                this.pushError('Der Ausdruck links vom Punkt hat kein Attribut ' + node.identifier + ".", node.position);
            }
            else {
                this.pushError('Links vom Punkt steht ein Ausdruck vom Datentyp ' + ot.type.identifier + ". Dieser hat kein Attribut " + node.identifier + ".", node.position);
            }
            return null;
        }
        let objectType = ot.type;
        if (objectType instanceof Klass) {
            let visibilityUpTo = getVisibilityUpTo(objectType, this.currentSymbolTable.classContext);
            let attributeWithError = objectType.getAttribute(node.identifier, visibilityUpTo);
            let staticAttributeWithError = null;
            if (attributeWithError.attribute == null) {
                staticAttributeWithError = objectType.staticClass.getAttribute(node.identifier, visibilityUpTo);
            }
            if (attributeWithError.attribute == null && staticAttributeWithError.attribute == null) {
                if (attributeWithError.foundButInvisible || !staticAttributeWithError.foundButInvisible) {
                    this.pushError(attributeWithError.error, node.position);
                }
                else {
                    this.pushError(staticAttributeWithError.error, node.position);
                }
                return {
                    type: objectType,
                    isAssignable: false
                };
            }
            else {
                let attribute;
                if (attributeWithError.attribute != null) {
                    this.pushStatements({
                        type: TokenType.pushAttribute,
                        position: node.position,
                        attributeIndex: attributeWithError.attribute.index,
                        attributeIdentifier: attributeWithError.attribute.identifier,
                        useThisObject: false
                    });
                    attribute = attributeWithError.attribute;
                }
                else {
                    this.pushStatements([{
                            type: TokenType.decreaseStackpointer,
                            position: node.position,
                            popCount: 1
                        }, {
                            type: TokenType.pushStaticAttribute,
                            position: node.position,
                            // klass: (<Klass>objectType).staticClass,
                            klass: staticAttributeWithError.staticClass,
                            attributeIndex: staticAttributeWithError.attribute.index,
                            attributeIdentifier: staticAttributeWithError.attribute.identifier
                        }]);
                    attribute = staticAttributeWithError.attribute;
                }
                this.pushUsagePosition(node.position, attribute);
                return {
                    type: attribute.type,
                    isAssignable: !attribute.isFinal
                };
            }
        }
        else if (objectType instanceof StaticClass) {
            // Static class
            if (objectType.Klass instanceof Enum) {
                this.removeLastStatement(); // remove push static enum class to stack
                let enumInfo = objectType.Klass.enumInfoList.find(ei => ei.identifier == node.identifier);
                if (enumInfo == null) {
                    this.pushError("Die enum-Klasse " + objectType.identifier + " hat keinen enum-Wert mit dem Bezeichner " + node.identifier, node.position);
                }
                this.pushStatements({
                    type: TokenType.pushEnumValue,
                    position: node.position,
                    enumClass: objectType.Klass,
                    valueIdentifier: node.identifier
                });
                return {
                    type: objectType.Klass,
                    isAssignable: false
                };
            }
            else {
                let upToVisibility = getVisibilityUpTo(objectType, this.currentSymbolTable.classContext);
                let staticAttributeWithError = objectType.getAttribute(node.identifier, upToVisibility);
                if (staticAttributeWithError.attribute != null) {
                    // if (staticAttributeWithError.attribute.updateValue != undefined) {
                    //     this.removeLastStatement();
                    //     this.pushStatements({
                    //         type: TokenType.pushStaticAttributeIntrinsic,
                    //         position: node.position,
                    //         attribute: staticAttributeWithError.attribute
                    //     });
                    // } else 
                    {
                        this.removeLastStatement();
                        this.pushStatements({
                            type: TokenType.pushStaticAttribute,
                            position: node.position,
                            attributeIndex: staticAttributeWithError.attribute.index,
                            attributeIdentifier: staticAttributeWithError.attribute.identifier,
                            klass: staticAttributeWithError.staticClass
                        });
                        this.pushUsagePosition(node.position, staticAttributeWithError.attribute);
                    }
                    return {
                        type: staticAttributeWithError.attribute.type,
                        isAssignable: !staticAttributeWithError.attribute.isFinal
                    };
                }
                else {
                    this.pushError(staticAttributeWithError.error, node.position);
                    return {
                        type: objectType,
                        isAssignable: false
                    };
                }
            }
        }
        else {
            if (node.identifier != "length") {
                this.pushError('Der Wert vom Datentyp ' + ot.type.identifier + " hat kein Attribut " + node.identifier, node.position);
                return null;
            }
            this.pushStatements({
                type: TokenType.pushArrayLength,
                position: node.position
            });
            let element = new Attribute("length", intPrimitiveType, null, true, Visibility.public, true, "Länge des Arrays");
            this.module.addIdentifierPosition(node.position, element);
            return {
                type: intPrimitiveType,
                isAssignable: false
            };
        }
    }
    pushThisOrSuper(node, isSuper) {
        let classContext = this.currentSymbolTable.classContext;
        if (isSuper && classContext != null) {
            classContext = classContext.baseClass;
        }
        let methodContext = this.currentSymbolTable.method;
        if (classContext == null || methodContext == null) {
            this.pushError("Das Objekt " + (isSuper ? "super" : "this") + " existiert nur innerhalb einer Methodendeklaration.", node.position);
            return null;
        }
        else {
            this.pushStatements({
                type: TokenType.pushLocalVariableToStack,
                position: node.position,
                stackposOfVariable: 0
            });
            this.pushTypePosition(node.position, classContext);
            return { type: classContext, isAssignable: false, isSuper: isSuper };
        }
    }
    superconstructorCall(node) {
        let classContext = this.currentSymbolTable.classContext;
        let isSuperConstructorCall = node.type == TokenType.superConstructorCall;
        if (isSuperConstructorCall) {
            if ((classContext === null || classContext === void 0 ? void 0 : classContext.baseClass) == null || classContext.baseClass.identifier == "Object") {
                this.pushError("Die Klasse ist nur Kindklasse der Klasse Object, daher ist der Aufruf des Superkonstruktors nicht möglich.", node.position);
            }
        }
        let methodContext = this.currentSymbolTable.method;
        if (classContext == null || methodContext == null || !methodContext.isConstructor) {
            this.pushError("Ein Aufruf des Konstruktors oder des Superkonstructors ist nur innerhalb des Konstruktors einer Klasse möglich.", node.position);
            return null;
        }
        let superclassType;
        if (isSuperConstructorCall) {
            superclassType = classContext.baseClass;
            if (superclassType instanceof StaticClass) {
                this.pushError("Statische Methoden haben keine super-Methodenaufrufe.", node.position);
                return { type: null, isAssignable: false };
            }
            if (superclassType == null)
                superclassType = this.moduleStore.getType("Object").type;
        }
        else {
            superclassType = classContext;
            if (superclassType instanceof StaticClass) {
                this.pushError("Statische Methoden haben keine this-Methodenaufrufe.", node.position);
                return { type: null, isAssignable: false };
            }
        }
        // Push this-object to stack:
        this.pushStatements({
            type: TokenType.pushLocalVariableToStack,
            position: node.position,
            stackposOfVariable: 0
        });
        let parameterTypes = [];
        if (node.operands != null) {
            let errorInOperands = false;
            for (let p of node.operands) {
                let pt = this.processNode(p);
                if (pt != null) {
                    parameterTypes.push(pt.type);
                }
                else {
                    errorInOperands = true;
                }
            }
            if (errorInOperands) {
                return { type: stringPrimitiveType, isAssignable: false }; // try to continue...
            }
        }
        let methods = superclassType.getConstructor(parameterTypes, Visibility.protected);
        this.module.pushMethodCallPosition(node.position, node.commaPositions, superclassType.getMethods(Visibility.protected, superclassType.identifier), node.rightBracketPosition);
        if (methods.error != null) {
            this.pushError(methods.error, node.position);
            return { type: stringPrimitiveType, isAssignable: false }; // try to continue...
        }
        let method = methods.methodList[0];
        this.pushUsagePosition(node.position, method);
        let stackframeDelta = 0;
        if (method.hasEllipsis()) {
            let ellipsisParameterCount = parameterTypes.length - method.getParameterCount() + 1; // last parameter and subsequent ones
            stackframeDelta = -(ellipsisParameterCount - 1);
            this.pushStatements({
                type: TokenType.makeEllipsisArray,
                position: node.operands[method.getParameterCount() - 1].position,
                parameterCount: ellipsisParameterCount,
                stepFinished: false,
                arrayType: method.getParameter(method.getParameterCount() - 1).type
            });
        }
        this.pushStatements({
            type: TokenType.callMethod,
            method: method,
            isSuperCall: isSuperConstructorCall,
            position: node.position,
            stackframeBegin: -(parameterTypes.length + 1 + stackframeDelta) // this-object followed by parameters
        });
        // Pabst, 21.10.2020:
        // super method is constructor => returns nothing even if method.getReturnType() is class object
        // return { type: method.getReturnType(), isAssignable: false };
        return { type: null, isAssignable: false };
    }
    incrementDecrementBeforeOrAfter(node) {
        let type = this.processNode(node.operand);
        if (type == null)
            return;
        if (!type.isAssignable) {
            this.pushError("Die Operatoren ++ und -- können nur auf Variablen angewendet werden, nicht auf konstante Werte oder Rückgabewerte von Methoden.", node.position);
            return type;
        }
        if (!type.type.canCastTo(floatPrimitiveType)) {
            this.pushError("Die Operatoren ++ und -- können nur auf Zahlen angewendet werden, nicht auf Werte des Datentyps " + type.type.identifier, node.position);
            return type;
        }
        this.pushStatements({
            type: node.type,
            position: node.position,
            incrementDecrementBy: node.operator == TokenType.doubleMinus ? -1 : 1
        });
        return type;
    }
    selectArrayElement(node) {
        let arrayType = this.processNode(node.object); // push array-object 
        let indexType = this.processNode(node.index); // push index
        if (arrayType == null || indexType == null)
            return;
        if (!(arrayType.type instanceof ArrayType)) {
            this.pushError("Der Typ der Variablen ist kein Array, daher ist [] nicht zulässig. ", node.object.position);
            return null;
        }
        this.module.addIdentifierPosition({
            line: node.position.line,
            column: node.position.column + node.position.length,
            length: 0 // Module.getTypeAtPosition needs length == 0 here to know that this type-position is not in static context for code completion
        }, arrayType.type.arrayOfType);
        if (!this.ensureAutomaticCasting(indexType.type, intPrimitiveType)) {
            this.pushError("Als Index eines Arrays wird ein ganzzahliger Wert erwartet. Gefunden wurde ein Wert vom Typ " + indexType.type.identifier + ".", node.index.position);
            return { type: arrayType.type.arrayOfType, isAssignable: arrayType.isAssignable };
        }
        this.pushStatements({
            type: TokenType.selectArrayElement,
            position: node.position
        });
        return { type: arrayType.type.arrayOfType, isAssignable: arrayType.isAssignable };
    }
    pushTypePosition(position, type) {
        if (position == null)
            return;
        if (position.length > 0) {
            position = {
                line: position.line,
                column: position.column + position.length,
                length: 0
            };
        }
        this.module.addIdentifierPosition(position, type);
    }
    pushUsagePosition(position, element) {
        this.module.addIdentifierPosition(position, element);
        if (element instanceof PrimitiveType) {
            return;
        }
        let positionList = element.usagePositions.get(this.module);
        if (positionList == null) {
            positionList = [];
            element.usagePositions.set(this.module, positionList);
        }
        positionList.push(position);
    }
    resolveIdentifier(node) {
        if (node.identifier == null)
            return null;
        let variable = this.findLocalVariable(node.identifier);
        if (variable != null) {
            this.pushStatements({
                type: TokenType.pushLocalVariableToStack,
                position: node.position,
                stackposOfVariable: variable.stackPos
            });
            this.pushUsagePosition(node.position, variable);
            node.variable = variable;
            return { type: variable.type, isAssignable: !variable.isFinal };
        }
        if (this.heap != null) {
            let variable = this.heap[node.identifier];
            if (variable != null) {
                this.pushStatements({
                    type: TokenType.pushFromHeapToStack,
                    position: node.position,
                    identifier: node.identifier
                });
                this.pushUsagePosition(node.position, variable);
                node.variable = variable;
                return { type: variable.type, isAssignable: !variable.isFinal };
            }
        }
        let attribute = this.findAttribute(node.identifier, node.position);
        if (attribute != null) {
            if (attribute.isStatic) {
                let cc = this.currentSymbolTable.classContext;
                let scc = (cc instanceof StaticClass) ? cc : cc.staticClass;
                while (scc != null && scc.attributes.indexOf(attribute) == -1) {
                    scc = scc.baseClass;
                }
                this.pushStatements({
                    type: TokenType.pushStaticAttribute,
                    position: node.position,
                    klass: scc,
                    attributeIndex: attribute.index,
                    attributeIdentifier: attribute.identifier
                });
            }
            else {
                this.pushStatements({
                    type: TokenType.pushAttribute,
                    position: node.position,
                    attributeIndex: attribute.index,
                    attributeIdentifier: attribute.identifier,
                    useThisObject: true
                });
                node.attribute = attribute;
            }
            this.pushUsagePosition(node.position, attribute);
            return { type: attribute.type, isAssignable: !attribute.isFinal };
        }
        let klassModule = this.moduleStore.getType(node.identifier);
        if (klassModule != null) {
            let klass = klassModule.type;
            if (!(klass instanceof Klass || klass instanceof Interface)) {
                this.pushError("Der Typ " + klass.identifier + " hat keine statischen Attribute/Methoden.", node.position);
            }
            else {
                this.pushStatements({
                    type: TokenType.pushStaticClassObject,
                    position: node.position,
                    klass: klass
                });
                this.pushUsagePosition(node.position, klass);
                return {
                    type: klass instanceof Klass ? klass.staticClass : klass,
                    isAssignable: false
                };
            }
            return {
                type: klass,
                isAssignable: false
            };
        }
        this.pushError("Der Bezeichner " + node.identifier + " ist hier nicht bekannt.", node.position);
    }
    findLocalVariable(identifier) {
        let st = this.currentSymbolTable;
        while (st != null) {
            let variable = st.variableMap.get(identifier);
            if (variable != null && variable.stackPos != null) {
                return variable;
            }
            st = st.parent;
        }
        return null;
    }
    findAttribute(identifier, position) {
        let classContext = this.currentSymbolTable.classContext;
        if (classContext == null) {
            return null;
        }
        let attribute = classContext.getAttribute(identifier, Visibility.private);
        if (attribute.attribute != null)
            return attribute.attribute;
        if (classContext instanceof Klass) {
            let staticAttribute = classContext.staticClass.getAttribute(identifier, Visibility.private);
            if (staticAttribute.attribute != null)
                return staticAttribute.attribute;
        }
        // this.pushError(attribute.error, position);
        return null;
    }
    callMethod(node) {
        let objectNode = null;
        if (node.object == null) {
            // call method of this-class?
            let thisClass = this.currentSymbolTable.classContext;
            if (thisClass != null) {
                this.pushStatements({
                    type: TokenType.pushLocalVariableToStack,
                    position: node.position,
                    stackposOfVariable: 0
                });
                objectNode = {
                    type: thisClass,
                    isAssignable: false
                };
            }
            else {
                this.pushError("Ein Methodenaufruf (hier: " + node.identifier +
                    ") ohne Punktschreibweise ist nur innerhalb anderer Methoden möglich.", node.position);
                return null;
            }
        }
        else {
            objectNode = this.processNode(node.object);
        }
        if (objectNode == null)
            return null;
        if (!((objectNode.type instanceof Klass) || (objectNode.type instanceof StaticClass) ||
            (objectNode.type instanceof Interface && (node.object["variable"] != null || node.object["attribute"] != null || node.object["termInsideBrackets"] != null)) || (objectNode.type instanceof Enum))) {
            if (objectNode.type == null) {
                this.pushError("Werte dieses Datentyps besitzen keine Methoden.", node.position);
            }
            else {
                if (objectNode.type instanceof Interface) {
                    this.pushError('Methodendefinitionen eines Interfaces können nicht statisch aufgerufen werden.', node.position);
                }
                else {
                    this.pushError('Werte des Datentyps ' + objectNode.type.identifier + " besitzen keine Methoden.", node.position);
                }
            }
            return null;
        }
        let objectType = objectNode.type;
        let posBeforeParameterEvaluation = this.currentProgram.statements.length;
        let parameterTypes = [];
        // let parameterStatements: Statement[][] = [];
        let positionsAfterParameterStatements = [];
        let allStatements = this.currentProgram.statements;
        if (node.operands != null) {
            // for (let p of node.operands) {
            for (let j = 0; j < node.operands.length; j++) {
                let p = node.operands[j];
                // let programPointer = allStatements.length;
                let typeNode = this.processNode(p);
                // parameterStatements.push(allStatements.splice(programPointer, allStatements.length - programPointer));
                positionsAfterParameterStatements.push(allStatements.length);
                if (typeNode == null) {
                    parameterTypes.push(voidPrimitiveType);
                }
                else {
                    parameterTypes.push(typeNode.type);
                }
            }
        }
        let methods;
        if (objectType instanceof Interface) {
            methods = objectType.getMethodsThatFitWithCasting(node.identifier, parameterTypes, false);
        }
        else {
            let upToVisibility = getVisibilityUpTo(objectType, this.currentSymbolTable.classContext);
            methods = objectType.getMethodsThatFitWithCasting(node.identifier, parameterTypes, false, upToVisibility);
        }
        this.module.pushMethodCallPosition(node.position, node.commaPositions, objectType.getMethods(Visibility.private, node.identifier), node.rightBracketPosition);
        if (methods.error != null) {
            this.pushError(methods.error, node.position);
            return { type: stringPrimitiveType, isAssignable: false }; // try to continue...
        }
        let method = methods.methodList[0];
        this.pushUsagePosition(node.position, method);
        // You CAN call a static method on a object..., so:
        if (method.isStatic && objectType instanceof Klass && objectType.identifier != "PrintStream") {
            this.pushError("Es ist kein guter Programmierstil, statische Methoden einer Klasse mithilfe eines Objekts aufzurufen. Besser wäre hier " + objectType.identifier + "." + method.identifier + "(...).", node.position, "info");
            this.insertStatements(posBeforeParameterEvaluation, [{
                    type: TokenType.decreaseStackpointer,
                    position: node.position,
                    popCount: 1
                },
                {
                    type: TokenType.pushStaticClassObject,
                    position: node.position,
                    klass: objectType
                }
            ]);
        }
        let destType = null;
        for (let i = 0; i < parameterTypes.length; i++) {
            if (i < method.getParameterCount()) { // possible ellipsis!
                destType = method.getParameterType(i);
                if (i == method.getParameterCount() - 1 && method.hasEllipsis()) {
                    destType = destType.arrayOfType;
                }
            }
            // Marker 1
            let srcType = parameterTypes[i];
            // for (let st of parameterStatements[i]) {
            //     this.currentProgram.statements.push(st);
            // }
            let programPosition = allStatements.length;
            if (!this.ensureAutomaticCasting(srcType, destType, node.operands[i].position, node.operands[i])) {
                this.pushError("Der Wert vom Datentyp " + srcType.identifier + " kann nicht als Parameter (Datentyp " + destType.identifier + ") verwendet werden.", node.operands[i].position);
            }
            if (allStatements.length > programPosition) {
                let castingStatements = allStatements.splice(programPosition, allStatements.length - programPosition);
                allStatements.splice(positionsAfterParameterStatements[i], 0, ...castingStatements);
                this.currentProgram.labelManager.correctPositionsAfterInsert(positionsAfterParameterStatements[i], castingStatements.length);
            }
            // if (srcType instanceof PrimitiveType && destType instanceof PrimitiveType) {
            //     if (srcType.getCastInformation(destType).needsStatement) {
            //         this.pushStatements({
            //             type: TokenType.castValue,
            //             position: null,
            //             newType: destType,
            //             stackPosRelative: -parameterTypes.length + 1 + i
            //         });
            //     }
            // }
        }
        let stackframeDelta = 0;
        if (method.hasEllipsis()) {
            let ellipsisParameterCount = parameterTypes.length - method.getParameterCount() + 1; // last parameter and subsequent ones
            stackframeDelta = -(ellipsisParameterCount - 1);
            this.pushStatements({
                type: TokenType.makeEllipsisArray,
                position: node.operands[method.getParameterCount() - 1].position,
                parameterCount: ellipsisParameterCount,
                stepFinished: false,
                arrayType: method.getParameter(method.getParameterCount() - 1).type
            });
        }
        if (method.visibility != Visibility.public) {
            let visible = true;
            let classContext = this.currentSymbolTable.classContext;
            if (classContext == null) {
                visible = false;
            }
            else {
                if (classContext != objectType &&
                    !(classContext instanceof Klass && classContext.implements.indexOf(objectType) > 0)) {
                    if (method.visibility == Visibility.private) {
                        visible = false;
                    }
                    else {
                        visible = classContext.hasAncestorOrIs(objectType);
                    }
                }
            }
            if (!visible) {
                this.pushError("Die Methode " + method.identifier + " ist an dieser Stelle des Programms nicht sichtbar.", node.position);
            }
        }
        let isSystemMethod = false;
        if (method.isStatic && objectNode.type != null &&
            (objectNode.type instanceof StaticClass)) {
            let classIdentifier = objectNode.type.Klass.identifier;
            switch (classIdentifier) {
                case "Input":
                    this.pushStatements({
                        type: TokenType.callInputMethod,
                        method: method,
                        position: node.position,
                        stepFinished: true,
                        stackframeBegin: -(parameterTypes.length + 1 + stackframeDelta) // this-object followed by parameters
                    });
                    isSystemMethod = true;
                    break;
                case "SystemTools":
                case "Robot":
                    if (["pause", "warten"].indexOf(method.identifier) >= 0) {
                        this.pushStatements([{
                                type: TokenType.setPauseDuration,
                                position: node.position,
                                stepFinished: true
                            }, {
                                type: TokenType.pause,
                                position: node.position,
                                stepFinished: true
                            }
                        ]);
                        isSystemMethod = true;
                    }
                    break;
            }
        }
        if (!isSystemMethod) {
            this.pushStatements({
                type: TokenType.callMethod,
                method: method,
                position: node.position,
                isSuperCall: objectNode.isSuper == null ? false : objectNode.isSuper,
                stepFinished: true,
                stackframeBegin: -(parameterTypes.length + 1 + stackframeDelta) // this-object followed by parameters
            });
        }
        this.pushTypePosition(node.rightBracketPosition, method.getReturnType());
        return { type: method.getReturnType(), isAssignable: false };
    }
    pushConstant(node) {
        let type;
        switch (node.constantType) {
            case TokenType.integerConstant:
                type = intPrimitiveType;
                break;
            case TokenType.booleanConstant:
                type = booleanPrimitiveType;
                break;
            case TokenType.floatingPointConstant:
                type = floatPrimitiveType;
                break;
            case TokenType.stringConstant:
                type = stringPrimitiveType;
                this.pushTypePosition(node.position, type);
                break;
            case TokenType.charConstant:
                type = charPrimitiveType;
                break;
            case TokenType.keywordNull:
                type = nullType;
                break;
        }
        this.pushStatements({
            type: TokenType.pushConstant,
            dataType: type,
            position: node.position,
            value: node.constant
        });
        return { type: type, isAssignable: false };
    }
    processBinaryOp(node) {
        let isAssignment = CodeGenerator.assignmentOperators.indexOf(node.operator) >= 0;
        if (node.operator == TokenType.ternaryOperator) {
            return this.processTernaryOperator(node);
        }
        let leftType = this.processNode(node.firstOperand, isAssignment);
        let programPosAfterLeftOpoerand = this.currentProgram.statements.length;
        let lazyEvaluationDest = null;
        if (node.operator == TokenType.and) {
            lazyEvaluationDest = this.currentProgram.labelManager.insertJumpNode(TokenType.jumpIfFalseAndLeaveOnStack, node.firstOperand.position, this);
        }
        else if (node.operator == TokenType.or) {
            lazyEvaluationDest = this.currentProgram.labelManager.insertJumpNode(TokenType.jumpIfTrueAndLeaveOnStack, node.firstOperand.position, this);
        }
        let rightType = this.processNode(node.secondOperand);
        if (leftType == null || leftType.type == null || rightType == null || rightType.type == null)
            return null;
        let convertedLeftType = leftType.type;
        if (isAssignment) {
            if (!this.ensureAutomaticCasting(rightType.type, leftType.type, node.position, node.firstOperand)) {
                this.pushError("Der Wert vom Datentyp " + rightType.type.identifier + " auf der rechten Seite kann der Variablen auf der linken Seite (Datentyp " + leftType.type.identifier + ") nicht zugewiesen werden.", node.position);
                return leftType;
            }
            if (!leftType.isAssignable) {
                this.pushError("Dem Term/der Variablen auf der linken Seite des Zuweisungsoperators (=) kann kein Wert zugewiesen werden.", node.position);
            }
            let statement = {
                //@ts-ignore
                type: node.operator,
                position: node.position,
                stepFinished: true,
                leaveValueOnStack: true
            };
            this.pushStatements(statement);
            return leftType;
        }
        else {
            if (node.firstOperand.type == TokenType.identifier && node.firstOperand.variable != null) {
                let v = node.firstOperand.variable;
                if (v.initialized != null && !v.initialized) {
                    v.usedBeforeInitialization = true;
                    this.pushError("Die Variable " + v.identifier + " wird hier benutzt bevor sie initialisiert wurde.", node.position, "info");
                }
            }
            let resultType = leftType.type.getResultType(node.operator, rightType.type);
            let unboxableLeft = leftType.type["unboxableAs"];
            let unboxableRight = rightType.type["unboxableAs"];
            if (resultType == null && node.operator == TokenType.plus) {
                if (rightType.type == stringPrimitiveType) {
                    if (this.ensureAutomaticToString(leftType.type, programPosAfterLeftOpoerand, node.firstOperand.position)) {
                        resultType = stringPrimitiveType;
                        convertedLeftType = stringPrimitiveType;
                    }
                }
                else if (leftType.type == stringPrimitiveType) {
                    if (this.ensureAutomaticToString(rightType.type, undefined, node.firstOperand.position)) {
                        resultType = stringPrimitiveType;
                    }
                }
            }
            if (resultType == null && (unboxableLeft != null || unboxableRight != null)) {
                let leftTypes = unboxableLeft == null ? [leftType.type] : unboxableLeft;
                let rightTypes = unboxableRight == null ? [rightType.type] : unboxableRight;
                for (let lt of leftTypes) {
                    for (let rt of rightTypes) {
                        resultType = lt.getResultType(node.operator, rt);
                        if (resultType != null) {
                            this.insertStatements(programPosAfterLeftOpoerand, {
                                type: TokenType.castValue,
                                position: node.firstOperand.position,
                                newType: lt
                            });
                            this.pushStatements({
                                type: TokenType.castValue,
                                position: node.secondOperand.position,
                                newType: rt
                            });
                            convertedLeftType = lt;
                            break;
                        }
                    }
                    if (resultType != null)
                        break;
                }
            }
            if (node.operator in [TokenType.and, TokenType.or]) {
                this.checkIfAssignmentInstedOfEqual(node.firstOperand);
                this.checkIfAssignmentInstedOfEqual(node.secondOperand);
            }
            if (resultType == null) {
                let bitOperators = [TokenType.ampersand, TokenType.OR];
                let booleanOperators = ["&& (boolescher UND-Operator)", "|| (boolescher ODER-Operator)"];
                let betterOperators = ["& &", "||"];
                let opIndex = bitOperators.indexOf(node.operator);
                if (opIndex >= 0 && leftType.type == booleanPrimitiveType && rightType.type == booleanPrimitiveType) {
                    this.pushError("Die Operation " + TokenTypeReadable[node.operator] + " ist für die Operanden der Typen " + leftType.type.identifier + " und " + rightType.type.identifier + " nicht definiert. Du meintest wahrscheinlich den Operator " + booleanOperators[opIndex] + ".", node.position, "error", {
                        title: "Operator " + betterOperators[opIndex] + " verwenden statt " + TokenTypeReadable[node.operator],
                        editsProvider: (uri) => {
                            return [
                                {
                                    resource: uri,
                                    edit: {
                                        range: { startLineNumber: node.position.line, startColumn: node.position.column, endLineNumber: node.position.line, endColumn: node.position.column },
                                        text: TokenTypeReadable[node.operator]
                                    }
                                }
                            ];
                        }
                    });
                }
                else {
                    this.pushError("Die Operation " + TokenTypeReadable[node.operator] + " ist für die Operanden der Typen " + leftType.type.identifier + " und " + rightType.type.identifier + " nicht definiert.", node.position);
                }
                return leftType;
            }
            this.pushStatements({
                type: TokenType.binaryOp,
                leftType: convertedLeftType,
                operator: node.operator,
                position: node.position
            });
            if (lazyEvaluationDest != null) {
                this.currentProgram.labelManager.markJumpDestination(1, lazyEvaluationDest);
            }
            return { type: resultType, isAssignable: false };
        }
    }
    processTernaryOperator(node) {
        let leftType = this.processNode(node.firstOperand);
        if (leftType == null)
            return;
        if (this.ensureAutomaticCasting(leftType.type, booleanPrimitiveType, null, node.firstOperand)) {
            let secondOperand = node.secondOperand;
            if (secondOperand != null) {
                if (secondOperand.type != TokenType.binaryOp || secondOperand.operator != TokenType.colon) {
                    this.pushError("Auf den Fragezeichenoperator müssen - mit Doppelpunkt getrennt - zwei Alternativterme folgen.", node.position);
                }
                else {
                    let lm = this.currentProgram.labelManager;
                    let variantFalseLabel = lm.insertJumpNode(TokenType.jumpIfFalse, node.position, this);
                    let firstType = this.processNode(secondOperand.firstOperand);
                    let endLabel = lm.insertJumpNode(TokenType.jumpAlways, secondOperand.firstOperand.position, this);
                    lm.markJumpDestination(1, variantFalseLabel);
                    let secondType = this.processNode(secondOperand.secondOperand);
                    lm.markJumpDestination(1, endLabel);
                    let type = firstType.type;
                    if (secondType != null && type != secondType.type && type.canCastTo(secondType.type)) {
                        type = secondType.type;
                    }
                    return {
                        type: type,
                        isAssignable: false
                    };
                }
            }
        }
    }
    processUnaryOp(node) {
        let leftType = this.processNode(node.operand);
        if (leftType == null || leftType.type == null)
            return;
        if (node.operator == TokenType.minus) {
            if (!leftType.type.canCastTo(floatPrimitiveType)) {
                this.pushError("Der Operator - ist für den Typ " + leftType.type.identifier + " nicht definiert.", node.position);
                return leftType;
            }
        }
        if (node.operator == TokenType.not) {
            if (!(leftType.type == booleanPrimitiveType)) {
                this.checkIfAssignmentInstedOfEqual(node.operand);
                this.pushError("Der Operator ! ist für den Typ " + leftType.type.identifier + " nicht definiert.", node.position);
                return leftType;
            }
        }
        this.pushStatements({
            type: TokenType.unaryOp,
            operator: node.operator,
            position: node.position
        });
        return leftType;
    }
}
CodeGenerator.assignmentOperators = [TokenType.assignment, TokenType.plusAssignment, TokenType.minusAssignment,
    TokenType.multiplicationAssignment, TokenType.divisionAssignment, TokenType.ANDAssigment, TokenType.ORAssigment,
    TokenType.XORAssigment, TokenType.shiftLeftAssigment, TokenType.shiftRightAssigment, TokenType.shiftRightUnsignedAssigment];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29kZUdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9jbGllbnQvY29tcGlsZXIvcGFyc2VyL0NvZGVHZW5lcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFnQixTQUFTLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxtQkFBbUIsQ0FBQztBQUNqSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN2TixPQUFPLEVBQUUsU0FBUyxFQUF5QixhQUFhLEVBQWtCLE1BQU0sRUFBUSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVwSixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFHakQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxJQUFJLEVBQVksTUFBTSxrQkFBa0IsQ0FBQztBQVNsRCxNQUFNLE9BQU8sYUFBYTtJQUExQjtRQTBnQ0ksd0JBQW1CLEdBQThCLEVBQUUsQ0FBQztJQTJ2RXhELENBQUM7SUE5dUdHLHFCQUFxQixDQUFDLE1BQWMsRUFBRSxXQUF3QixFQUFFLFdBQXdCLEVBQUUsSUFBVTtRQUVoRyxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUVyQixJ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Q0FBQztnQkFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQ0FBaUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2xILE9BQU8sUUFBUSxDQUFDO2FBQ25CO1NBRUo7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDO1lBQ2hCLElBQUksRUFBRSxTQUFTLENBQUMsT0FBTztZQUN2QixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1NBQzFCLENBQUMsQ0FBQztRQUVILE9BQU8sUUFBUSxDQUFDO0lBQ3BCLENBQUM7O0FBandHTSxpQ0FBbUIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsZUFBZTtJQUN2RyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLFdBQVc7SUFDL0csU0FBUyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXJyb3IsIFF1aWNrRml4LCBFcnJvckxldmVsIH0gZnJvbSBcIi4uL2xleGVyL0xleGVyLmpzXCI7XHJcbmltcG9ydCB7IFRleHRQb3NpdGlvbiwgVG9rZW5UeXBlLCBUb2tlblR5cGVSZWFkYWJsZSB9IGZyb20gXCIuLi9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheVR5cGUgfSBmcm9tIFwiLi4vdHlwZXMvQXJyYXkuanNcIjtcclxuaW1wb3J0IHsgS2xhc3MsIEludGVyZmFjZSwgU3RhdGljQ2xhc3MsIFZpc2liaWxpdHksIGdldFZpc2liaWxpdHlVcFRvLCBVbmJveGFibGVLbGFzcyB9IGZyb20gXCIuLi90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBib29sZWFuUHJpbWl0aXZlVHlwZSwgY2hhclByaW1pdGl2ZVR5cGUsIGZsb2F0UHJpbWl0aXZlVHlwZSwgaW50UHJpbWl0aXZlVHlwZSwgc3RyaW5nUHJpbWl0aXZlVHlwZSwgb2JqZWN0VHlwZSwgbnVsbFR5cGUsIHZvaWRQcmltaXRpdmVUeXBlLCB2YXJUeXBlLCBkb3VibGVQcmltaXRpdmVUeXBlIH0gZnJvbSBcIi4uL3R5cGVzL1ByaW1pdGl2ZVR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEF0dHJpYnV0ZSwgVHlwZSwgVmFyaWFibGUsIFZhbHVlLCBQcmltaXRpdmVUeXBlLCBVc2FnZVBvc2l0aW9ucywgTWV0aG9kLCBIZWFwLCBnZXRUeXBlSWRlbnRpZmllciwgUGFyYW1ldGVybGlzdCB9IGZyb20gXCIuLi90eXBlcy9UeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBBU1ROb2RlLCBBdHRyaWJ1dGVEZWNsYXJhdGlvbk5vZGUsIEJpbmFyeU9wTm9kZSwgQ2xhc3NEZWNsYXJhdGlvbk5vZGUsIENvbnN0YW50Tm9kZSwgRG9XaGlsZU5vZGUsIEZvck5vZGUsIElkZW50aWZpZXJOb2RlLCBJZk5vZGUsIEluY3JlbWVudERlY3JlbWVudE5vZGUsIE1ldGhvZGNhbGxOb2RlLCBNZXRob2REZWNsYXJhdGlvbk5vZGUsIE5ld09iamVjdE5vZGUsIFJldHVybk5vZGUsIFNlbGVjdEFycmF5RWxlbWVudE5vZGUsIFNlbGVjdEFycmlidXRlTm9kZSwgU3VwZXJjb25zdHJ1Y3RvckNhbGxOb2RlLCBTdXBlck5vZGUsIFRoaXNOb2RlLCBVbmFyeU9wTm9kZSwgV2hpbGVOb2RlLCBMb2NhbFZhcmlhYmxlRGVjbGFyYXRpb25Ob2RlLCBBcnJheUluaXRpYWxpemF0aW9uTm9kZSwgTmV3QXJyYXlOb2RlLCBQcmludE5vZGUsIENhc3RNYW51YWxseU5vZGUsIEVudW1EZWNsYXJhdGlvbk5vZGUsIFRlcm1Ob2RlLCBTd2l0Y2hOb2RlLCBTY29wZU5vZGUsIFBhcmFtZXRlck5vZGUsIEZvck5vZGVPdmVyQ29sbGVjaW9uLCBDb25zdHJ1Y3RvckNhbGxOb2RlIH0gZnJvbSBcIi4vQVNULmpzXCI7XHJcbmltcG9ydCB7IExhYmVsTWFuYWdlciB9IGZyb20gXCIuL0xhYmVsTWFuYWdlci5qc1wiO1xyXG5pbXBvcnQgeyBNb2R1bGUsIE1vZHVsZVN0b3JlIH0gZnJvbSBcIi4vTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IEFzc2lnbm1lbnRTdGF0ZW1lbnQsIEluaXRTdGFja2ZyYW1lU3RhdGVtZW50LCBKdW1wQWx3YXlzU3RhdGVtZW50LCBQcm9ncmFtLCBTdGF0ZW1lbnQsIEJlZ2luQXJyYXlTdGF0ZW1lbnQsIE5ld09iamVjdFN0YXRlbWVudCwgSnVtcE9uU3dpdGNoU3RhdGVtZW50LCBFeHRlbmRlZEZvckxvb3BDaGVja0NvdW50ZXJBbmRHZXRFbGVtZW50IH0gZnJvbSBcIi4vUHJvZ3JhbS5qc1wiO1xyXG5pbXBvcnQgeyBTeW1ib2xUYWJsZSB9IGZyb20gXCIuL1N5bWJvbFRhYmxlLmpzXCI7XHJcbmltcG9ydCB7IEVudW0sIEVudW1JbmZvIH0gZnJvbSBcIi4uL3R5cGVzL0VudW0uanNcIjtcclxuXHJcbnR5cGUgU3RhY2tUeXBlID0ge1xyXG4gICAgdHlwZTogVHlwZSxcclxuICAgIGlzQXNzaWduYWJsZTogYm9vbGVhbixcclxuICAgIGlzU3VwZXI/OiBib29sZWFuLCAvLyB1c2VkIGZvciBtZXRob2QgY2FsbHMgd2l0aCBzdXBlci5cclxuICAgIHdpdGhSZXR1cm5TdGF0ZW1lbnQ/OiBib29sZWFuXHJcbn07XHJcblxyXG5leHBvcnQgY2xhc3MgQ29kZUdlbmVyYXRvciB7XHJcblxyXG4gICAgc3RhdGljIGFzc2lnbm1lbnRPcGVyYXRvcnMgPSBbVG9rZW5UeXBlLmFzc2lnbm1lbnQsIFRva2VuVHlwZS5wbHVzQXNzaWdubWVudCwgVG9rZW5UeXBlLm1pbnVzQXNzaWdubWVudCxcclxuICAgIFRva2VuVHlwZS5tdWx0aXBsaWNhdGlvbkFzc2lnbm1lbnQsIFRva2VuVHlwZS5kaXZpc2lvbkFzc2lnbm1lbnQsIFRva2VuVHlwZS5BTkRBc3NpZ21lbnQsIFRva2VuVHlwZS5PUkFzc2lnbWVudCxcclxuICAgIFRva2VuVHlwZS5YT1JBc3NpZ21lbnQsIFRva2VuVHlwZS5zaGlmdExlZnRBc3NpZ21lbnQsIFRva2VuVHlwZS5zaGlmdFJpZ2h0QXNzaWdtZW50LCBUb2tlblR5cGUuc2hpZnRSaWdodFVuc2lnbmVkQXNzaWdtZW50XTtcclxuXHJcbiAgICBtb2R1bGVTdG9yZTogTW9kdWxlU3RvcmU7XHJcbiAgICBtb2R1bGU6IE1vZHVsZTtcclxuXHJcbiAgICBzeW1ib2xUYWJsZVN0YWNrOiBTeW1ib2xUYWJsZVtdO1xyXG4gICAgY3VycmVudFN5bWJvbFRhYmxlOiBTeW1ib2xUYWJsZTtcclxuXHJcbiAgICBoZWFwOiBIZWFwO1xyXG5cclxuICAgIGN1cnJlbnRQcm9ncmFtOiBQcm9ncmFtO1xyXG5cclxuICAgIGVycm9yTGlzdDogRXJyb3JbXTtcclxuXHJcbiAgICBuZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3M6IG51bWJlcjtcclxuXHJcbiAgICBicmVha05vZGVTdGFjazogSnVtcEFsd2F5c1N0YXRlbWVudFtdW107XHJcbiAgICBjb250aW51ZU5vZGVTdGFjazogSnVtcEFsd2F5c1N0YXRlbWVudFtdW107XHJcblxyXG4gICAgc3RhcnRBZGhvY0NvbXBpbGF0aW9uKG1vZHVsZTogTW9kdWxlLCBtb2R1bGVTdG9yZTogTW9kdWxlU3RvcmUsIHN5bWJvbFRhYmxlOiBTeW1ib2xUYWJsZSwgaGVhcDogSGVhcCk6IEVycm9yW10ge1xyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZVN0b3JlID0gbW9kdWxlU3RvcmU7XHJcbiAgICAgICAgdGhpcy5tb2R1bGUgPSBtb2R1bGU7XHJcblxyXG4gICAgICAgIHRoaXMuc3ltYm9sVGFibGVTdGFjayA9IFtdO1xyXG4gICAgICAgIHRoaXMuc3ltYm9sVGFibGVTdGFjay5wdXNoKHN5bWJvbFRhYmxlKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZSA9IHN5bWJvbFRhYmxlO1xyXG5cclxuICAgICAgICB0aGlzLmhlYXAgPSBoZWFwO1xyXG5cclxuICAgICAgICBsZXQgb2xkU3RhY2tmcmFtZVNpemUgPSBzeW1ib2xUYWJsZS5zdGFja2ZyYW1lU2l6ZTtcclxuICAgICAgICB0aGlzLm5leHRGcmVlUmVsYXRpdmVTdGFja1BvcyA9IG9sZFN0YWNrZnJhbWVTaXplO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gbnVsbDtcclxuICAgICAgICB0aGlzLmVycm9yTGlzdCA9IFtdO1xyXG5cclxuICAgICAgICB0aGlzLmJyZWFrTm9kZVN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5jb250aW51ZU5vZGVTdGFjayA9IFtdO1xyXG5cclxuICAgICAgICB0aGlzLmdlbmVyYXRlTWFpbih0cnVlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZXJyb3JMaXN0O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzdGFydChtb2R1bGU6IE1vZHVsZSwgbW9kdWxlU3RvcmU6IE1vZHVsZVN0b3JlKSB7XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlU3RvcmUgPSBtb2R1bGVTdG9yZTtcclxuICAgICAgICB0aGlzLm1vZHVsZSA9IG1vZHVsZTtcclxuXHJcbiAgICAgICAgdGhpcy5zeW1ib2xUYWJsZVN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUgPSBudWxsO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gbnVsbDtcclxuICAgICAgICB0aGlzLmVycm9yTGlzdCA9IFtdO1xyXG5cclxuICAgICAgICB0aGlzLm5leHRGcmVlUmVsYXRpdmVTdGFja1BvcyA9IDA7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1vZHVsZS50b2tlbkxpc3QubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBsZXQgbGFzdFRva2VuID0gdGhpcy5tb2R1bGUudG9rZW5MaXN0W3RoaXMubW9kdWxlLnRva2VuTGlzdC5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgdGhpcy5tb2R1bGUubWFpblN5bWJvbFRhYmxlLnBvc2l0aW9uVG8gPSB7IGxpbmU6IGxhc3RUb2tlbi5wb3NpdGlvbi5saW5lLCBjb2x1bW46IGxhc3RUb2tlbi5wb3NpdGlvbi5jb2x1bW4gKyAxLCBsZW5ndGg6IDEgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc3ltYm9sVGFibGVTdGFjay5wdXNoKHRoaXMubW9kdWxlLm1haW5TeW1ib2xUYWJsZSk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUgPSB0aGlzLm1vZHVsZS5tYWluU3ltYm9sVGFibGU7XHJcblxyXG4gICAgICAgIHRoaXMuYnJlYWtOb2RlU3RhY2sgPSBbXTtcclxuICAgICAgICB0aGlzLmNvbnRpbnVlTm9kZVN0YWNrID0gW107XHJcblxyXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVNYWluKCk7XHJcblxyXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVDbGFzc2VzKCk7XHJcblxyXG4gICAgICAgIHRoaXMubG9va0ZvclN0YXRpY1ZvaWRNYWluKCk7XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlLmVycm9yc1szXSA9IHRoaXMuZXJyb3JMaXN0O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBsb29rRm9yU3RhdGljVm9pZE1haW4oKSB7XHJcblxyXG4gICAgICAgIGxldCBtYWluUHJvZ3JhbSA9IHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtO1xyXG5cclxuICAgICAgICBpZiAobWFpblByb2dyYW0gIT0gbnVsbCAmJiBtYWluUHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aCA+IDIpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IG1haW5NZXRob2Q6IE1ldGhvZCA9IG51bGw7XHJcbiAgICAgICAgbGV0IHN0YXRpY0NsYXNzOiBTdGF0aWNDbGFzcyA9IG51bGw7XHJcbiAgICAgICAgbGV0IGNsYXNzTm9kZTE6IEFTVE5vZGU7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGNsYXNzTm9kZSBvZiB0aGlzLm1vZHVsZS5jbGFzc0RlZmluaXRpb25zQVNUKSB7XHJcbiAgICAgICAgICAgIGlmIChjbGFzc05vZGUudHlwZSA9PSBUb2tlblR5cGUua2V5d29yZENsYXNzKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGN0ID0gY2xhc3NOb2RlLnJlc29sdmVkVHlwZTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBtIG9mIGN0LnN0YXRpY0NsYXNzLm1ldGhvZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobS5pZGVudGlmaWVyID09IFwibWFpblwiICYmIG0ucGFyYW1ldGVybGlzdC5wYXJhbWV0ZXJzLmxlbmd0aCA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwdCA9IG0ucGFyYW1ldGVybGlzdC5wYXJhbWV0ZXJzWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHQudHlwZSBpbnN0YW5jZW9mIEFycmF5VHlwZSAmJiBwdC50eXBlLmFycmF5T2ZUeXBlID09IHN0cmluZ1ByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtYWluTWV0aG9kICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVzIGV4aXN0aWVyZW4gbWVocmVyZSBLbGFzc2VuIG1pdCBzdGF0aXNjaGVuIG1haW4tTWV0aG9kZW4uXCIsIGNsYXNzTm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haW5NZXRob2QgPSBtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRpY0NsYXNzID0gY3Quc3RhdGljQ2xhc3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOb2RlMSA9IGNsYXNzTm9kZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG1haW5NZXRob2QgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHBvc2l0aW9uOiBUZXh0UG9zaXRpb24gPSBtYWluTWV0aG9kLnVzYWdlUG9zaXRpb25zWzBdO1xyXG4gICAgICAgICAgICBpZiAobWFpbk1ldGhvZC5wcm9ncmFtICE9IG51bGwgJiYgbWFpbk1ldGhvZC5wcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb24gPSBtYWluTWV0aG9kLnByb2dyYW0uc3RhdGVtZW50c1swXS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5pbml0Q3VycmVudFByb2dyYW0oKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtID0gdGhpcy5jdXJyZW50UHJvZ3JhbTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoW3tcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWFpbk1ldGhvZCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6IG1haW5NZXRob2QsXHJcbiAgICAgICAgICAgICAgICBzdGF0aWNDbGFzczogc3RhdGljQ2xhc3NcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNsb3NlU3RhY2tmcmFtZSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBtYWluTWV0aG9kLnVzYWdlUG9zaXRpb25zLmdldCh0aGlzLm1vZHVsZSlbMF1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdLCBmYWxzZSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2VuZXJhdGVDbGFzc2VzKCkge1xyXG4gICAgICAgIGlmICh0aGlzLm1vZHVsZS5jbGFzc0RlZmluaXRpb25zQVNUID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY2xhc3NOb2RlIG9mIHRoaXMubW9kdWxlLmNsYXNzRGVmaW5pdGlvbnNBU1QpIHtcclxuICAgICAgICAgICAgaWYgKGNsYXNzTm9kZS50eXBlID09IFRva2VuVHlwZS5rZXl3b3JkQ2xhc3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVDbGFzcyhjbGFzc05vZGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjbGFzc05vZGUudHlwZSA9PSBUb2tlblR5cGUua2V5d29yZEVudW0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVFbnVtKGNsYXNzTm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGNsYXNzTm9kZS50eXBlID09IFRva2VuVHlwZS5rZXl3b3JkSW50ZXJmYWNlKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW50ZXJmID0gY2xhc3NOb2RlLnJlc29sdmVkVHlwZTtcclxuICAgICAgICAgICAgICAgIGlmIChpbnRlcmYgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tEb3VibGVNZXRob2REZWNsYXJhdGlvbihpbnRlcmYpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2VuZXJhdGVFbnVtKGVudW1Ob2RlOiBFbnVtRGVjbGFyYXRpb25Ob2RlKSB7XHJcblxyXG4gICAgICAgIGlmIChlbnVtTm9kZS5yZXNvbHZlZFR5cGUgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZShmYWxzZSwgZW51bU5vZGUuc2NvcGVGcm9tLCBlbnVtTm9kZS5zY29wZVRvKTtcclxuXHJcbiAgICAgICAgbGV0IGVudW1DbGFzcyA9IDxFbnVtPmVudW1Ob2RlLnJlc29sdmVkVHlwZTtcclxuXHJcbiAgICAgICAgLy8gdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihlbnVtTm9kZS5wb3NpdGlvbiwgZW51bUNsYXNzKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0ID0gZW51bUNsYXNzO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBlbnVtQ2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgb2YgZW51bU5vZGUuYXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlICE9IG51bGwgJiYgIWF0dHJpYnV0ZS5pc1N0YXRpYyAmJiBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplQXR0cmlidXRlKGF0dHJpYnV0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlbnVtQ2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5yZXR1cm4sXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5sYXN0U3RhdGVtZW50LnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgY29weVJldHVyblZhbHVlVG9TdGFja2ZyYW1lUG9zMDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgbGVhdmVUaGlzT2JqZWN0T25TdGFjazogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlci5yZXNvbHZlTm9kZXMoKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgbWV0aG9kTm9kZSBvZiBlbnVtTm9kZS5tZXRob2RzKSB7XHJcbiAgICAgICAgICAgIGlmIChtZXRob2ROb2RlICE9IG51bGwgJiYgIW1ldGhvZE5vZGUuaXNBYnN0cmFjdCAmJiAhbWV0aG9kTm9kZS5pc1N0YXRpYykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21waWxlTWV0aG9kKG1ldGhvZE5vZGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnBvcFN5bWJvbFRhYmxlKG51bGwpO1xyXG5cclxuICAgICAgICAvLyBjb25zdHJ1Y3RvciBjYWxsc1xyXG4gICAgICAgIHRoaXMucHVzaE5ld1N5bWJvbFRhYmxlKGZhbHNlLCBlbnVtTm9kZS5zY29wZUZyb20sIGVudW1Ob2RlLnNjb3BlVG8pO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBlbnVtVmFsdWVOb2RlIG9mIGVudW1Ob2RlLnZhbHVlcykge1xyXG5cclxuICAgICAgICAgICAgaWYgKGVudW1WYWx1ZU5vZGUuY29uc3RydWN0b3JQYXJhbWV0ZXJzICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcDogUHJvZ3JhbSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBtb2R1bGU6IHRoaXMubW9kdWxlLFxyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsTWFuYWdlcjogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoRW51bVZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBlbnVtVmFsdWVOb2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIGVudW1DbGFzczogZW51bUNsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlSWRlbnRpZmllcjogZW51bVZhbHVlTm9kZS5pZGVudGlmaWVyXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NFbnVtQ29uc3RydWN0b3JDYWxsKGVudW1DbGFzcywgZW51bVZhbHVlTm9kZS5jb25zdHJ1Y3RvclBhcmFtZXRlcnMsXHJcbiAgICAgICAgICAgICAgICAgICAgZW51bVZhbHVlTm9kZS5wb3NpdGlvbiwgZW51bVZhbHVlTm9kZS5jb21tYVBvc2l0aW9ucywgZW51bVZhbHVlTm9kZS5yaWdodEJyYWNrZXRQb3NpdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnByb2dyYW1FbmQsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGVudW1WYWx1ZU5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgZW51bUluZm86IEVudW1JbmZvID0gZW51bUNsYXNzLmlkZW50aWZpZXJUb0luZm9NYXBbZW51bVZhbHVlTm9kZS5pZGVudGlmaWVyXTtcclxuICAgICAgICAgICAgICAgIGVudW1JbmZvLmNvbnN0cnVjdG9yQ2FsbFByb2dyYW0gPSBwO1xyXG4gICAgICAgICAgICAgICAgZW51bUluZm8ucG9zaXRpb24gPSBlbnVtVmFsdWVOb2RlLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUobnVsbCk7XHJcblxyXG5cclxuICAgICAgICAvLyBzdGF0aWMgYXR0cmlidXRlcy9tZXRob2RzXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIGVudW1Ob2RlLnNjb3BlRnJvbSwgZW51bU5vZGUuc2NvcGVUbyk7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dCA9IGVudW1DbGFzcy5zdGF0aWNDbGFzcztcclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gZW51bUNsYXNzLnN0YXRpY0NsYXNzLmF0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgYXR0cmlidXRlIG9mIGVudW1Ob2RlLmF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZSAhPSBudWxsICYmIGF0dHJpYnV0ZS5pc1N0YXRpYyAmJiBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplQXR0cmlidXRlKGF0dHJpYnV0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlc29sdmVOb2RlcygpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtZXRob2ROb2RlIG9mIGVudW1Ob2RlLm1ldGhvZHMpIHtcclxuICAgICAgICAgICAgaWYgKG1ldGhvZE5vZGUgIT0gbnVsbCAmJiBtZXRob2ROb2RlLmlzU3RhdGljKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbXBpbGVNZXRob2QobWV0aG9kTm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jaGVja0RvdWJsZU1ldGhvZERlY2xhcmF0aW9uKGVudW1DbGFzcyk7XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUobnVsbCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NFbnVtQ29uc3RydWN0b3JDYWxsKGVudW1DbGFzczogRW51bSwgcGFyYW1ldGVyTm9kZXM6IFRlcm1Ob2RlW10sXHJcbiAgICAgICAgcG9zaXRpb246IFRleHRQb3NpdGlvbiwgY29tbWFQb3NpdGlvbnM6IFRleHRQb3NpdGlvbltdLCByaWdodEJyYWNrZXRQb3NpdGlvbjogVGV4dFBvc2l0aW9uKSB7XHJcbiAgICAgICAgbGV0IHBhcmFtZXRlclR5cGVzOiBUeXBlW10gPSBbXTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgcCBvZiBwYXJhbWV0ZXJOb2Rlcykge1xyXG4gICAgICAgICAgICBsZXQgdHlwZU5vZGUgPSB0aGlzLnByb2Nlc3NOb2RlKHApO1xyXG4gICAgICAgICAgICBpZiAodHlwZU5vZGUgPT0gbnVsbCkgY29udGludWU7XHJcbiAgICAgICAgICAgIHBhcmFtZXRlclR5cGVzLnB1c2godHlwZU5vZGUudHlwZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbWV0aG9kcyA9IGVudW1DbGFzcy5nZXRNZXRob2RzVGhhdEZpdFdpdGhDYXN0aW5nKGVudW1DbGFzcy5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICBwYXJhbWV0ZXJUeXBlcywgdHJ1ZSwgVmlzaWJpbGl0eS5wcml2YXRlKTtcclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGUucHVzaE1ldGhvZENhbGxQb3NpdGlvbihwb3NpdGlvbiwgY29tbWFQb3NpdGlvbnMsIGVudW1DbGFzcy5nZXRNZXRob2RzKFZpc2liaWxpdHkucHJpdmF0ZSwgZW51bUNsYXNzLmlkZW50aWZpZXIpLCByaWdodEJyYWNrZXRQb3NpdGlvbik7XHJcblxyXG5cclxuICAgICAgICBpZiAobWV0aG9kcy5lcnJvciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKG1ldGhvZHMuZXJyb3IsIHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9OyAvLyB0cnkgdG8gY29udGludWUuLi5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtZXRob2QgPSBtZXRob2RzLm1ldGhvZExpc3RbMF07XHJcblxyXG4gICAgICAgIGxldCBkZXN0VHlwZTogVHlwZSA9IG51bGw7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJhbWV0ZXJUeXBlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoaSA8IG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpKSB7ICAvLyBwb3NzaWJsZSBlbGxpcHNpcyFcclxuICAgICAgICAgICAgICAgIGRlc3RUeXBlID0gbWV0aG9kLmdldFBhcmFtZXRlclR5cGUoaSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSBtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSAtIDEgJiYgbWV0aG9kLmhhc0VsbGlwc2lzKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBkZXN0VHlwZSA9ICg8QXJyYXlUeXBlPmRlc3RUeXBlKS5hcnJheU9mVHlwZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHNyY1R5cGUgPSBwYXJhbWV0ZXJUeXBlc1tpXTtcclxuICAgICAgICAgICAgaWYgKCFzcmNUeXBlLmVxdWFscyhkZXN0VHlwZSkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc3JjVHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUgJiYgZGVzdFR5cGUgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNyY1R5cGUuZ2V0Q2FzdEluZm9ybWF0aW9uKGRlc3RUeXBlKS5uZWVkc1N0YXRlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1R5cGU6IGRlc3RUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2tQb3NSZWxhdGl2ZTogLXBhcmFtZXRlclR5cGVzLmxlbmd0aCArIDEgKyBpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdGFja2ZyYW1lRGVsdGEgPSAwO1xyXG4gICAgICAgIGlmIChtZXRob2QuaGFzRWxsaXBzaXMoKSkge1xyXG4gICAgICAgICAgICBsZXQgZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCA9IHBhcmFtZXRlclR5cGVzLmxlbmd0aCAtIG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpICsgMTsgLy8gbGFzdCBwYXJhbWV0ZXIgYW5kIHN1YnNlcXVlbnQgb25lc1xyXG4gICAgICAgICAgICBzdGFja2ZyYW1lRGVsdGEgPSAtIChlbGxpcHNpc1BhcmFtZXRlckNvdW50IC0gMSk7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLm1ha2VFbGxpcHNpc0FycmF5LFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHBhcmFtZXRlck5vZGVzW21ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpIC0gMV0ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJDb3VudDogZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBhcnJheVR5cGU6IG1ldGhvZC5nZXRQYXJhbWV0ZXIobWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxKS50eXBlXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhbGxNZXRob2QsXHJcbiAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgaXNTdXBlckNhbGw6IGZhbHNlLFxyXG4gICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0ocGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSArIHN0YWNrZnJhbWVEZWx0YSkgLy8gdGhpcy1vYmplY3QgZm9sbG93ZWQgYnkgcGFyYW1ldGVyc1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGdlbmVyYXRlQ2xhc3MoY2xhc3NOb2RlOiBDbGFzc0RlY2xhcmF0aW9uTm9kZSkge1xyXG5cclxuICAgICAgICBpZiAoY2xhc3NOb2RlLnJlc29sdmVkVHlwZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIHRoaXMucHVzaE5ld1N5bWJvbFRhYmxlKGZhbHNlLCBjbGFzc05vZGUuc2NvcGVGcm9tLCBjbGFzc05vZGUuc2NvcGVUbyk7XHJcblxyXG4gICAgICAgIGxldCBrbGFzcyA9IDxLbGFzcz5jbGFzc05vZGUucmVzb2x2ZWRUeXBlO1xyXG5cclxuICAgICAgICAvL3RoaXMucHVzaFVzYWdlUG9zaXRpb24oY2xhc3NOb2RlLnBvc2l0aW9uLCBrbGFzcyk7XHJcblxyXG4gICAgICAgIGxldCBpbmhlcml0YW5jZUVycm9yID0ga2xhc3MuY2hlY2tJbmhlcml0YW5jZSgpO1xyXG5cclxuICAgICAgICBpZiAoaW5oZXJpdGFuY2VFcnJvci5tZXNzYWdlICE9IFwiXCIpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoaW5oZXJpdGFuY2VFcnJvci5tZXNzYWdlLCBjbGFzc05vZGUucG9zaXRpb24sIFwiZXJyb3JcIiwgdGhpcy5nZXRJbmhlcml0YW5jZVF1aWNrRml4KGNsYXNzTm9kZS5zY29wZVRvLCBpbmhlcml0YW5jZUVycm9yKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYmFzZUNsYXNzID0ga2xhc3MuYmFzZUNsYXNzO1xyXG4gICAgICAgIGlmIChiYXNlQ2xhc3MgIT0gbnVsbCAmJiBiYXNlQ2xhc3MubW9kdWxlICE9IGtsYXNzLm1vZHVsZSAmJiBiYXNlQ2xhc3MudmlzaWJpbGl0eSA9PSBWaXNpYmlsaXR5LnByaXZhdGUpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgQmFzaXNrbGFzc2UgXCIgKyBiYXNlQ2xhc3MuaWRlbnRpZmllciArIFwiIGRlciBLbGFzc2UgXCIgKyBrbGFzcy5pZGVudGlmaWVyICsgXCIgaXN0IGhpZXIgbmljaHQgc2ljaHRiYXIuXCIsIGNsYXNzTm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQgPSBrbGFzcztcclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0ga2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgb2YgY2xhc3NOb2RlLmF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZSAhPSBudWxsICYmICFhdHRyaWJ1dGUuaXNTdGF0aWMgJiYgYXR0cmlidXRlLmluaXRpYWxpemF0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoa2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5yZXR1cm4sXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5sYXN0U3RhdGVtZW50LnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgY29weVJldHVyblZhbHVlVG9TdGFja2ZyYW1lUG9zMDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgbGVhdmVUaGlzT2JqZWN0T25TdGFjazogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlci5yZXNvbHZlTm9kZXMoKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgbWV0aG9kTm9kZSBvZiBjbGFzc05vZGUubWV0aG9kcykge1xyXG4gICAgICAgICAgICBpZiAobWV0aG9kTm9kZSAhPSBudWxsICYmICFtZXRob2ROb2RlLmlzQWJzdHJhY3QgJiYgIW1ldGhvZE5vZGUuaXNTdGF0aWMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29tcGlsZU1ldGhvZChtZXRob2ROb2RlKTtcclxuICAgICAgICAgICAgICAgIGxldCBtOiBNZXRob2QgPSBtZXRob2ROb2RlLnJlc29sdmVkVHlwZTtcclxuICAgICAgICAgICAgICAgIGlmIChtICE9IG51bGwgJiYgbS5hbm5vdGF0aW9uID09IFwiQE92ZXJyaWRlXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoa2xhc3MuYmFzZUNsYXNzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtsYXNzLmJhc2VDbGFzcy5nZXRNZXRob2RCeVNpZ25hdHVyZShtLnNpZ25hdHVyZSkgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgTWV0aG9kZSBcIiArIG0uc2lnbmF0dXJlICsgXCIgaXN0IG1pdCBAT3ZlcnJpZGUgYW5ub3RpZXJ0LCDDvGJlcnNjaHJlaWJ0IGFiZXIga2VpbmUgTWV0aG9kZSBnbGVpY2hlciBTaWduYXR1ciBlaW5lciBPYmVya2xhc3NlLlwiLCBtZXRob2ROb2RlLnBvc2l0aW9uLCBcIndhcm5pbmdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNoZWNrRG91YmxlTWV0aG9kRGVjbGFyYXRpb24oa2xhc3MpO1xyXG5cclxuICAgICAgICB0aGlzLnBvcFN5bWJvbFRhYmxlKG51bGwpO1xyXG5cclxuICAgICAgICAvLyBzdGF0aWMgYXR0cmlidXRlcy9tZXRob2RzXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIGNsYXNzTm9kZS5zY29wZUZyb20sIGNsYXNzTm9kZS5zY29wZVRvKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0ID0ga2xhc3Muc3RhdGljQ2xhc3M7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IGtsYXNzLnN0YXRpY0NsYXNzLmF0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgYXR0cmlidXRlIG9mIGNsYXNzTm9kZS5hdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGUgIT0gbnVsbCAmJiBhdHRyaWJ1dGUuaXNTdGF0aWMgJiYgYXR0cmlidXRlLmluaXRpYWxpemF0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoa2xhc3Muc3RhdGljQ2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5yZXR1cm4sXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5sYXN0U3RhdGVtZW50LnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgY29weVJldHVyblZhbHVlVG9TdGFja2ZyYW1lUG9zMDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgbGVhdmVUaGlzT2JqZWN0T25TdGFjazogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlci5yZXNvbHZlTm9kZXMoKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgbWV0aG9kTm9kZSBvZiBjbGFzc05vZGUubWV0aG9kcykge1xyXG4gICAgICAgICAgICBpZiAobWV0aG9kTm9kZSAhPSBudWxsICYmIG1ldGhvZE5vZGUuaXNTdGF0aWMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29tcGlsZU1ldGhvZChtZXRob2ROb2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZShudWxsKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2hlY2tEb3VibGVNZXRob2REZWNsYXJhdGlvbihjaWU6IEtsYXNzIHwgSW50ZXJmYWNlKSB7ICAvLyBOLkIuOiBFbnVtIGV4dGVuZHMgS2xhc3NcclxuXHJcbiAgICAgICAgbGV0IHNpZ25hdHVyZU1hcDogeyBba2V5OiBzdHJpbmddOiBNZXRob2QgfSA9IHt9O1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtIG9mIGNpZS5tZXRob2RzKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgc2lnbmF0dXJlID0gbS5nZXRTaWduYXR1cmVXaXRoUmV0dXJuUGFyYW1ldGVyKCk7XHJcbiAgICAgICAgICAgIGlmIChzaWduYXR1cmVNYXBbc2lnbmF0dXJlXSAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGNpZVR5cGU6IFN0cmluZyA9IFwiSW4gZGVyIEtsYXNzZSBcIjtcclxuICAgICAgICAgICAgICAgIGlmIChjaWUgaW5zdGFuY2VvZiBJbnRlcmZhY2UpIGNpZVR5cGUgPSBcIkltIEludGVyZmFjZSBcIjtcclxuICAgICAgICAgICAgICAgIGlmIChjaWUgaW5zdGFuY2VvZiBFbnVtKSBjaWVUeXBlID0gXCJJbSBFbnVtIFwiO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKGNpZVR5cGUgKyBjaWUuaWRlbnRpZmllciArIFwiIGdpYnQgZXMgendlaSBNZXRob2RlbiBtaXQgZGVyc2VsYmVuIFNpZ25hdHVyOiBcIiArIHNpZ25hdHVyZSwgbS51c2FnZVBvc2l0aW9ucy5nZXQodGhpcy5tb2R1bGUpWzBdLCBcImVycm9yXCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoY2llVHlwZSArIGNpZS5pZGVudGlmaWVyICsgXCIgZ2lidCBlcyB6d2VpIE1ldGhvZGVuIG1pdCBkZXJzZWxiZW4gU2lnbmF0dXI6IFwiICsgc2lnbmF0dXJlLCBzaWduYXR1cmVNYXBbc2lnbmF0dXJlXS51c2FnZVBvc2l0aW9ucy5nZXQodGhpcy5tb2R1bGUpWzBdLCBcImVycm9yXCIpO1xyXG5cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNpZ25hdHVyZU1hcFtzaWduYXR1cmVdID0gbTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldEluaGVyaXRhbmNlUXVpY2tGaXgocG9zaXRpb246IFRleHRQb3NpdGlvbiwgaW5oZXJpdGFuY2VFcnJvcjogeyBtZXNzYWdlOiBzdHJpbmc7IG1pc3NpbmdNZXRob2RzOiBNZXRob2RbXTsgfSk6IFF1aWNrRml4IHtcclxuXHJcbiAgICAgICAgbGV0IHM6IHN0cmluZyA9IFwiXCI7XHJcbiAgICAgICAgZm9yIChsZXQgbSBvZiBpbmhlcml0YW5jZUVycm9yLm1pc3NpbmdNZXRob2RzKSB7XHJcbiAgICAgICAgICAgIHMgKz0gXCJcXHRwdWJsaWMgXCIgKyAobS5yZXR1cm5UeXBlID09IG51bGwgPyBcIiB2b2lkXCIgOiBnZXRUeXBlSWRlbnRpZmllcihtLnJldHVyblR5cGUpKSArIFwiIFwiICsgbS5pZGVudGlmaWVyICsgXCIoXCI7XHJcbiAgICAgICAgICAgIHMgKz0gbS5wYXJhbWV0ZXJsaXN0LnBhcmFtZXRlcnMubWFwKHAgPT4gZ2V0VHlwZUlkZW50aWZpZXIocC50eXBlKSArIFwiIFwiICsgcC5pZGVudGlmaWVyKS5qb2luKFwiLCBcIik7XHJcbiAgICAgICAgICAgIHMgKz0gXCIpIHtcXG5cXHRcXHQvL1RPRE86IE1ldGhvZGUgZsO8bGxlblxcblxcdH1cXG5cXG5cIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcIkZlaGxlbmRlIE1ldGhvZGVuIGVpbmbDvGdlblwiLFxyXG4gICAgICAgICAgICBlZGl0c1Byb3ZpZGVyOiAodXJpKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2U6IHVyaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWRpdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHsgc3RhcnRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lLCBzdGFydENvbHVtbjogcG9zaXRpb24uY29sdW1uIC0gMSwgZW5kTGluZU51bWJlcjogcG9zaXRpb24ubGluZSwgZW5kQ29sdW1uOiBwb3NpdGlvbi5jb2x1bW4gLSAxIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRTdXBlcmNvbnN0cnVjdG9yQ2FsbHMobm9kZXM6IEFTVE5vZGVbXSwgc3VwZXJjb25zdHJ1Y3RvckNhbGxzRm91bmQ6IEFTVE5vZGVbXSwgaXNGaXJzdFN0YXRlbWVudDogYm9vbGVhbik6IGJvb2xlYW4ge1xyXG4gICAgICAgIGZvciAobGV0IG5vZGUgb2Ygbm9kZXMpIHtcclxuICAgICAgICAgICAgaWYgKG5vZGUgPT0gbnVsbCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gVG9rZW5UeXBlLnN1cGVyQ29uc3RydWN0b3JDYWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFpc0ZpcnN0U3RhdGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1cGVyY29uc3RydWN0b3JDYWxsc0ZvdW5kLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW4gS29uc3RydWt0b3IgZGFyZiBudXIgZWluZW4gZWluemlnZW4gQXVmcnVmIGRlcyBTdXBlcmtvbnN0cnVrdG9ycyBlbnRoYWx0ZW4uXCIsIG5vZGUucG9zaXRpb24sIFwiZXJyb3JcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJWb3IgZGVtIEF1ZnJ1ZiBkZXMgU3VwZXJrb25zdHJ1a3RvcnMgZGFyZiBrZWluZSBhbmRlcmUgQW53ZWlzdW5nIHN0ZWhlbi5cIiwgbm9kZS5wb3NpdGlvbiwgXCJlcnJvclwiKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc3VwZXJjb25zdHJ1Y3RvckNhbGxzRm91bmQucHVzaChub2RlKTtcclxuICAgICAgICAgICAgICAgIGlzRmlyc3RTdGF0ZW1lbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlLnR5cGUgPT0gVG9rZW5UeXBlLnNjb3BlTm9kZSAmJiBub2RlLnN0YXRlbWVudHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaXNGaXJzdFN0YXRlbWVudCA9IGlzRmlyc3RTdGF0ZW1lbnQgJiYgdGhpcy5nZXRTdXBlcmNvbnN0cnVjdG9yQ2FsbHMobm9kZS5zdGF0ZW1lbnRzLCBzdXBlcmNvbnN0cnVjdG9yQ2FsbHNGb3VuZCwgaXNGaXJzdFN0YXRlbWVudCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpc0ZpcnN0U3RhdGVtZW50ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGlzRmlyc3RTdGF0ZW1lbnQ7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNvbXBpbGVNZXRob2QobWV0aG9kTm9kZTogTWV0aG9kRGVjbGFyYXRpb25Ob2RlKSB7XHJcbiAgICAgICAgLy8gQXNzdW1wdGlvbjogbWV0aG9kTm9kZSAhPSBudWxsXHJcbiAgICAgICAgbGV0IG1ldGhvZCA9IG1ldGhvZE5vZGUucmVzb2x2ZWRUeXBlO1xyXG5cclxuICAgICAgICB0aGlzLmNoZWNrSWZNZXRob2RJc1ZpcnR1YWwobWV0aG9kKTtcclxuXHJcbiAgICAgICAgaWYgKG1ldGhvZCA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIC8vIHRoaXMucHVzaFVzYWdlUG9zaXRpb24obWV0aG9kTm9kZS5wb3NpdGlvbiwgbWV0aG9kKTtcclxuXHJcbiAgICAgICAgdGhpcy5pbml0Q3VycmVudFByb2dyYW0oKTtcclxuICAgICAgICBtZXRob2QucHJvZ3JhbSA9IHRoaXMuY3VycmVudFByb2dyYW07XHJcblxyXG4gICAgICAgIHRoaXMucHVzaE5ld1N5bWJvbFRhYmxlKGZhbHNlLCBtZXRob2ROb2RlLnNjb3BlRnJvbSwgbWV0aG9kTm9kZS5zY29wZVRvKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5tZXRob2QgPSBtZXRob2Q7XHJcblxyXG4gICAgICAgIGxldCBzdGFja1BvczogbnVtYmVyID0gMTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgdiBvZiBtZXRob2QuZ2V0UGFyYW1ldGVyTGlzdCgpLnBhcmFtZXRlcnMpIHtcclxuICAgICAgICAgICAgdi5zdGFja1BvcyA9IHN0YWNrUG9zKys7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS52YXJpYWJsZU1hcC5zZXQodi5pZGVudGlmaWVyLCB2KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFwiICsgMVwiIGlzIGZvciBcInRoaXNcIi1vYmplY3RcclxuICAgICAgICB0aGlzLm5leHRGcmVlUmVsYXRpdmVTdGFja1BvcyA9IG1ldGhvZE5vZGUucGFyYW1ldGVycy5sZW5ndGggKyAxO1xyXG5cclxuICAgICAgICBpZiAobWV0aG9kLmlzQ29uc3RydWN0b3IgJiYgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0IGluc3RhbmNlb2YgS2xhc3MgJiYgbWV0aG9kTm9kZS5zdGF0ZW1lbnRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IGM6IEtsYXNzID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0O1xyXG5cclxuICAgICAgICAgICAgbGV0IHN1cGVyY29uc3RydWN0b3JDYWxsczogQVNUTm9kZVtdID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0U3VwZXJjb25zdHJ1Y3RvckNhbGxzKG1ldGhvZE5vZGUuc3RhdGVtZW50cywgc3VwZXJjb25zdHJ1Y3RvckNhbGxzLCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzdXBlcmNvbnN0cnVjdG9yQ2FsbEVuc3VyZWQ6IGJvb2xlYW4gPSBzdXBlcmNvbnN0cnVjdG9yQ2FsbHMubGVuZ3RoID4gMDtcclxuXHJcbiAgICAgICAgICAgIC8vIGlmIChtZXRob2ROb2RlLnN0YXRlbWVudHMubGVuZ3RoID4gMCAmJiBtZXRob2ROb2RlLnN0YXRlbWVudHNbMF0udHlwZSA9PSBUb2tlblR5cGUuc2NvcGVOb2RlKSB7XHJcbiAgICAgICAgICAgIC8vICAgICBsZXQgc3RtID0gbWV0aG9kTm9kZS5zdGF0ZW1lbnRzWzBdLnN0YXRlbWVudHM7XHJcbiAgICAgICAgICAgIC8vICAgICBpZiAoc3RtLmxlbmd0aCA+IDAgJiYgW1Rva2VuVHlwZS5zdXBlckNvbnN0cnVjdG9yQ2FsbCwgVG9rZW5UeXBlLmNvbnN0cnVjdG9yQ2FsbF0uaW5kZXhPZihzdG1bMF0udHlwZSkgPj0gMCkge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIHN1cGVyY29uc3RydWN0b3JDYWxsRW5zdXJlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vIH0gZWxzZSBpZiAoW1Rva2VuVHlwZS5zdXBlckNvbnN0cnVjdG9yQ2FsbCwgVG9rZW5UeXBlLmNvbnN0cnVjdG9yQ2FsbF0uaW5kZXhPZihtZXRob2ROb2RlLnN0YXRlbWVudHNbMF0udHlwZSkgPj0gMCkge1xyXG4gICAgICAgICAgICAvLyAgICAgc3VwZXJjb25zdHJ1Y3RvckNhbGxFbnN1cmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAgICAgaWYgKGMgIT0gbnVsbCAmJiBjLmJhc2VDbGFzcz8uaGFzQ29uc3RydWN0b3IoKSAmJiAhYy5iYXNlQ2xhc3M/Lmhhc1BhcmFtZXRlcmxlc3NDb25zdHJ1Y3RvcigpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZXJyb3I6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGlmIChtZXRob2ROb2RlLnN0YXRlbWVudHMgPT0gbnVsbCB8fCBtZXRob2ROb2RlLnN0YXRlbWVudHMubGVuZ3RoID09IDApIGVycm9yID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGlmICghZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvciA9ICFzdXBlcmNvbnN0cnVjdG9yQ2FsbEVuc3VyZWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcXVpY2tGaXg6IFF1aWNrRml4ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY29uc3RydWN0b3JzID0gYy5iYXNlQ2xhc3MubWV0aG9kcy5maWx0ZXIobSA9PiBtLmlzQ29uc3RydWN0b3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25zdHJ1Y3RvcnMubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1ldGhvZENhbGwgPSBcInN1cGVyKFwiICsgY29uc3RydWN0b3JzWzBdLnBhcmFtZXRlcmxpc3QucGFyYW1ldGVycy5tYXAocCA9PiBwLmlkZW50aWZpZXIpLmpvaW4oXCIsIFwiKSArIFwiKTtcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gbWV0aG9kTm9kZS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVpY2tGaXggPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0F1ZnJ1ZiBkZXMgS29uc3RydWt0b3JzIGRlciBCYXNpc2tsYXNzZSBlaW5mw7xnZW4nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8wNi4wNi4yMDIwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlZGl0c1Byb3ZpZGVyOiAodXJpKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiB1cmksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lICsgMSwgc3RhcnRDb2x1bW46IDAsIGVuZExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmUgKyAxLCBlbmRDb2x1bW46IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXZlcml0eTogbW9uYWNvLk1hcmtlclNldmVyaXR5LkVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJcXHRcXHRcIiArIG1ldGhvZENhbGwgKyBcIlxcblwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBCYXNpc2tsYXNzZSBkZXIgS2xhc3NlIFwiICsgYy5pZGVudGlmaWVyICsgXCIgYmVzaXR6dCBrZWluZW4gcGFyYW1ldGVybG9zZW4gS29uc3RydWt0b3IsIGRhaGVyIG11c3MgZGllc2UgS29uc3RydWt0b3JkZWZpbml0aW9uIG1pdCBlaW5lbSBBdWZydWYgZWluZXMgS29uc3RydWt0b3JzIGRlciBCYXNpc2tsYXNzZSAoc3VwZXIoLi4uKSkgYmVnaW5uZW4uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZE5vZGUucG9zaXRpb24sIFwiZXJyb3JcIiwgcXVpY2tGaXgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFzdXBlcmNvbnN0cnVjdG9yQ2FsbEVuc3VyZWQgJiYgYy5iYXNlQ2xhc3M/Lmhhc1BhcmFtZXRlcmxlc3NDb25zdHJ1Y3RvcigpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpbnZva2UgcGFyYW1ldGVybGVzcyBjb25zdHJ1Y3RvclxyXG4gICAgICAgICAgICAgICAgbGV0IGJhc2VDbGFzc0NvbnN0cnVjdG9yID0gYy5iYXNlQ2xhc3MuZ2V0UGFyYW1ldGVybGVzc0NvbnN0cnVjdG9yKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFtcclxuICAgICAgICAgICAgICAgICAgICAvLyBQdXNoIHRoaXMtb2JqZWN0IHRvIHN0YWNrOlxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hMb2NhbFZhcmlhYmxlVG9TdGFjayxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG1ldGhvZE5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogMFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBiYXNlQ2xhc3NDb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNTdXBlckNhbGw6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBtZXRob2ROb2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0xIC8vIHRoaXMtb2JqZWN0IGZvbGxvd2VkIGJ5IHBhcmFtZXRlcnNcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgXSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGFjdG9yQ2xhc3MgPSA8S2xhc3M+dGhpcy5tb2R1bGVTdG9yZS5nZXRUeXBlKFwiQWN0b3JcIikudHlwZTtcclxuICAgICAgICBsZXQgbWV0aG9kSWRlbnRpZmllcnMgPSBbXCJhY3RcIiwgXCJvbktleVR5cGVkXCIsIFwib25LZXlEb3duXCIsIFwib25LZXlVcFwiLFxyXG4gICAgICAgICAgICBcIm9uTW91c2VEb3duXCIsIFwib25Nb3VzZVVwXCIsIFwib25Nb3VzZU1vdmVcIiwgXCJvbk1vdXNlRW50ZXJcIiwgXCJvbk1vdXNlTGVhdmVcIl07XHJcbiAgICAgICAgaWYgKG1ldGhvZElkZW50aWZpZXJzLmluZGV4T2YobWV0aG9kLmlkZW50aWZpZXIpID49IDAgJiYgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0Lmhhc0FuY2VzdG9yT3JJcyhhY3RvckNsYXNzKSkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFtcclxuXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnJldHVybklmRGVzdHJveWVkLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBtZXRob2ROb2RlLnBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB3aXRoUmV0dXJuU3RhdGVtZW50ID0gdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMobWV0aG9kTm9kZS5zdGF0ZW1lbnRzKS53aXRoUmV0dXJuU3RhdGVtZW50O1xyXG5cclxuICAgICAgICBpZiAoIXdpdGhSZXR1cm5TdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucmV0dXJuLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG1ldGhvZE5vZGUuc2NvcGVUbyxcclxuICAgICAgICAgICAgICAgIGNvcHlSZXR1cm5WYWx1ZVRvU3RhY2tmcmFtZVBvczA6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgbGVhdmVUaGlzT2JqZWN0T25TdGFjazogZmFsc2VcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgcnQgPSBtZXRob2QuZ2V0UmV0dXJuVHlwZSgpO1xyXG4gICAgICAgICAgICBpZiAoIW1ldGhvZC5pc0NvbnN0cnVjdG9yICYmIHJ0ICE9IG51bGwgJiYgcnQgIT0gdm9pZFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIERla2xhcmF0aW9uIGRlciBNZXRob2RlIHZlcmxhbmd0IGRpZSBSw7xja2dhYmUgZWluZXMgV2VydGVzIHZvbSBUeXAgXCIgKyBydC5pZGVudGlmaWVyICsgXCIuIEVzIGZlaGx0IChtaW5kZXN0ZW5zKSBlaW5lIGVudHNwcmVjaGVuZGUgcmV0dXJuLUFud2Vpc3VuZy5cIiwgbWV0aG9kTm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1ldGhvZC5yZXNlcnZlU3RhY2tGb3JMb2NhbFZhcmlhYmxlcyA9IHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zXHJcbiAgICAgICAgICAgIC0gbWV0aG9kTm9kZS5wYXJhbWV0ZXJzLmxlbmd0aCAtIDE7XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUoKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlci5yZXNvbHZlTm9kZXMoKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjaGVja3MgaWYgY2hpbGQgY2xhc3NlcyBoYXZlIG1ldGhvZCB3aXRoIHNhbWUgc2lnbmF0dXJlXHJcbiAgICAgKi9cclxuICAgIGNoZWNrSWZNZXRob2RJc1ZpcnR1YWwobWV0aG9kOiBNZXRob2QpIHtcclxuXHJcbiAgICAgICAgbGV0IGtsYXNzID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0O1xyXG4gICAgICAgIGlmIChrbGFzcyAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBtbyBvZiB0aGlzLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjIG9mIG1vLnR5cGVTdG9yZS50eXBlTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjIGluc3RhbmNlb2YgS2xhc3MgJiYgYyAhPSBrbGFzcyAmJiBjLmhhc0FuY2VzdG9yT3JJcyhrbGFzcykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgbSBvZiBjLm1ldGhvZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtICE9IG51bGwgJiYgbWV0aG9kICE9IG51bGwgJiYgbS5zaWduYXR1cmUgPT0gbWV0aG9kLnNpZ25hdHVyZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZC5pc1ZpcnR1YWwgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIGluaXRpYWxpemVBdHRyaWJ1dGUoYXR0cmlidXRlOiBBdHRyaWJ1dGVEZWNsYXJhdGlvbk5vZGUpIHtcclxuXHJcbiAgICAgICAgaWYgKGF0dHJpYnV0ZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIC8vIGFzc3VtcHRpb246IGF0dHJpYnV0ZSAhPSBudWxsXHJcbiAgICAgICAgaWYgKGF0dHJpYnV0ZS5pZGVudGlmaWVyID09IG51bGwgfHwgYXR0cmlidXRlLmluaXRpYWxpemF0aW9uID09IG51bGwgfHwgYXR0cmlidXRlLnJlc29sdmVkVHlwZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmIChhdHRyaWJ1dGUuaXNTdGF0aWMpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaFN0YXRpY0F0dHJpYnV0ZSxcclxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUluZGV4OiBhdHRyaWJ1dGUucmVzb2x2ZWRUeXBlLmluZGV4LFxyXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlSWRlbnRpZmllcjogYXR0cmlidXRlLnJlc29sdmVkVHlwZS5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IGF0dHJpYnV0ZS5pbml0aWFsaXphdGlvbi5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIGtsYXNzOiA8U3RhdGljQ2xhc3M+KHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dClcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEF0dHJpYnV0ZSxcclxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUluZGV4OiBhdHRyaWJ1dGUucmVzb2x2ZWRUeXBlLmluZGV4LFxyXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlSWRlbnRpZmllcjogYXR0cmlidXRlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogYXR0cmlidXRlLmluaXRpYWxpemF0aW9uLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgdXNlVGhpc09iamVjdDogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsZXQgaW5pdGlhbGl6YXRpb25UeXBlID0gdGhpcy5wcm9jZXNzTm9kZShhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24pO1xyXG5cclxuICAgICAgICBpZiAoaW5pdGlhbGl6YXRpb25UeXBlICE9IG51bGwgJiYgaW5pdGlhbGl6YXRpb25UeXBlLnR5cGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuZW5zdXJlQXV0b21hdGljQ2FzdGluZyhpbml0aWFsaXphdGlvblR5cGUudHlwZSwgYXR0cmlidXRlLmF0dHJpYnV0ZVR5cGUucmVzb2x2ZWRUeXBlKSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhdHRyaWJ1dGUuYXR0cmlidXRlVHlwZS5yZXNvbHZlZFR5cGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIERhdGVudHlwIHZvbiBcIiArIGF0dHJpYnV0ZS5pZGVudGlmaWVyICsgXCIga29ubnRlIG5pY2h0IGVybWl0dGVsdCB3ZXJkZW4uIFwiLCBhdHRyaWJ1dGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBXZXJ0IGRlcyBUZXJtIHZvbSBEYXRlbnR5cCBcIiArIGluaXRpYWxpemF0aW9uVHlwZS50eXBlICsgXCIga2FubiBkZW0gQXR0cmlidXQgXCIgKyBhdHRyaWJ1dGUuaWRlbnRpZmllciArIFwiIHZvbSBUeXAgXCIgKyBhdHRyaWJ1dGUuYXR0cmlidXRlVHlwZS5yZXNvbHZlZFR5cGUuaWRlbnRpZmllciArIFwiIG5pY2h0IHp1Z2V3aWVzZW4gd2VyZGVuLlwiLCBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmFzc2lnbm1lbnQsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogYXR0cmlidXRlLmluaXRpYWxpemF0aW9uLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGxlYXZlVmFsdWVPblN0YWNrOiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgaW5pdEN1cnJlbnRQcm9ncmFtKCkge1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0ge1xyXG4gICAgICAgICAgICBtb2R1bGU6IHRoaXMubW9kdWxlLFxyXG4gICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXSxcclxuICAgICAgICAgICAgbGFiZWxNYW5hZ2VyOiBudWxsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXIgPSBuZXcgTGFiZWxNYW5hZ2VyKHRoaXMuY3VycmVudFByb2dyYW0pO1xyXG5cclxuICAgICAgICB0aGlzLmxhc3RTdGF0ZW1lbnQgPSBudWxsO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZW5lcmF0ZU1haW4oaXNBZGhvY0NvbXBpbGF0aW9uOiBib29sZWFuID0gZmFsc2UpIHtcclxuXHJcbiAgICAgICAgdGhpcy5pbml0Q3VycmVudFByb2dyYW0oKTtcclxuXHJcbiAgICAgICAgbGV0IHBvc2l0aW9uOiBUZXh0UG9zaXRpb24gPSB7IGxpbmU6IDEsIGNvbHVtbjogMSwgbGVuZ3RoOiAwIH07XHJcblxyXG4gICAgICAgIGxldCBtYWluUHJvZ3JhbUFzdCA9IHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtQXN0O1xyXG4gICAgICAgIGlmIChtYWluUHJvZ3JhbUFzdCAhPSBudWxsICYmIG1haW5Qcm9ncmFtQXN0Lmxlbmd0aCA+IDAgJiYgbWFpblByb2dyYW1Bc3RbMF0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbiA9IHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtQXN0WzBdLnBvc2l0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFpc0FkaG9jQ29tcGlsYXRpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUodHJ1ZSwgcG9zaXRpb24sIHsgbGluZTogMTAwMDAwLCBjb2x1bW46IDEsIGxlbmd0aDogMCB9LCB0aGlzLmN1cnJlbnRQcm9ncmFtKTtcclxuICAgICAgICAgICAgdGhpcy5oZWFwID0ge307XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZS5tYWluUHJvZ3JhbSA9IHRoaXMuY3VycmVudFByb2dyYW07XHJcblxyXG4gICAgICAgIGxldCBoYXNNYWluUHJvZ3JhbTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5tb2R1bGUubWFpblByb2dyYW1Bc3QgIT0gbnVsbCAmJiB0aGlzLm1vZHVsZS5tYWluUHJvZ3JhbUFzdC5sZW5ndGggPiAwKSB7XHJcblxyXG4gICAgICAgICAgICBoYXNNYWluUHJvZ3JhbSA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtQXN0KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChpc0FkaG9jQ29tcGlsYXRpb24gJiYgdGhpcy5sYXN0U3RhdGVtZW50ICE9IG51bGwgJiYgdGhpcy5sYXN0U3RhdGVtZW50LnR5cGUgPT0gVG9rZW5UeXBlLmRlY3JlYXNlU3RhY2twb2ludGVyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUxhc3RTdGF0ZW1lbnQoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5sYXN0UG9zaXRpb24gPSB0aGlzLm1vZHVsZS5tYWluUHJvZ3JhbUVuZDtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGFzdFBvc2l0aW9uID09IG51bGwpIHRoaXMubGFzdFBvc2l0aW9uID0geyBsaW5lOiAxMDAwMDAsIGNvbHVtbjogMCwgbGVuZ3RoOiAwIH07XHJcbiAgICAgICAgICAgIC8vIGlmKHRoaXMubGFzdFBvc2l0aW9uID09IG51bGwpIHRoaXMubGFzdFBvc2l0aW9uID0ge2xpbmU6IDEwMDAwMCwgY29sdW1uOiAwLCBsZW5ndGg6IDB9O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUucG9zaXRpb25UbyA9IHRoaXMubGFzdFBvc2l0aW9uO1xyXG4gICAgICAgICAgICBpZiAoIWlzQWRob2NDb21waWxhdGlvbikgdGhpcy5wb3BTeW1ib2xUYWJsZSh0aGlzLmN1cnJlbnRQcm9ncmFtLCB0cnVlKTtcclxuICAgICAgICAgICAgdGhpcy5oZWFwID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnByb2dyYW1FbmQsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5sYXN0UG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBwYXVzZUFmdGVyUHJvZ3JhbUVuZDogdHJ1ZVxyXG4gICAgICAgICAgICB9LCB0cnVlKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlci5yZXNvbHZlTm9kZXMoKTtcclxuXHJcbiAgICAgICAgaWYgKCFpc0FkaG9jQ29tcGlsYXRpb24gJiYgIWhhc01haW5Qcm9ncmFtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUodGhpcy5jdXJyZW50UHJvZ3JhbSk7XHJcbiAgICAgICAgICAgIHRoaXMuaGVhcCA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBlbnN1cmVBdXRvbWF0aWNDYXN0aW5nKHR5cGVGcm9tOiBUeXBlLCB0eXBlVG86IFR5cGUsIHBvc2l0aW9uPzogVGV4dFBvc2l0aW9uLCBub2RlRnJvbT86IEFTVE5vZGUpOiBib29sZWFuIHtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVGcm9tID09IG51bGwgfHwgdHlwZVRvID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVGcm9tLmVxdWFscyh0eXBlVG8pKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHR5cGVGcm9tLmNhbkNhc3RUbyh0eXBlVG8pKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlRnJvbSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUgJiYgKHR5cGVUbyBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUgfHwgdHlwZVRvID09IHN0cmluZ1ByaW1pdGl2ZVR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgY2FzdEluZm8gPSB0eXBlRnJvbS5nZXRDYXN0SW5mb3JtYXRpb24odHlwZVRvKTtcclxuICAgICAgICAgICAgICAgIGlmICghY2FzdEluZm8uYXV0b21hdGljKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhc3RWYWx1ZSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIG5ld1R5cGU6IHR5cGVUb1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKCF0eXBlRnJvbS5jYW5DYXN0VG8odHlwZVRvKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVUbyA9PSBib29sZWFuUHJpbWl0aXZlVHlwZSAmJiBub2RlRnJvbSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZUZyb20pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGVuc3VyZUF1dG9tYXRpY1RvU3RyaW5nKHR5cGVGcm9tOiBUeXBlLCBjb2RlcG9zOiBudW1iZXIgPSB1bmRlZmluZWQsIHRleHRwb3NpdGlvbj86IFRleHRQb3NpdGlvbik6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmICh0eXBlRnJvbSA9PSBzdHJpbmdQcmltaXRpdmVUeXBlKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICBpZiAodHlwZUZyb20gPT0gdm9pZFByaW1pdGl2ZVR5cGUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICBsZXQgYXV0b21hdGljVG9TdHJpbmc6IE1ldGhvZDtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVGcm9tIGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICBhdXRvbWF0aWNUb1N0cmluZyA9IG5ldyBNZXRob2QoXCJ0b1N0cmluZ1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXSksIHN0cmluZ1ByaW1pdGl2ZVR5cGUsIChwYXJhbWV0ZXJzOiBWYWx1ZVtdKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSBwYXJhbWV0ZXJzWzBdO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICgoPFByaW1pdGl2ZVR5cGU+dmFsdWUudHlwZSkudmFsdWVUb1N0cmluZyh2YWx1ZSkpO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoKHR5cGVGcm9tIGluc3RhbmNlb2YgS2xhc3MpIHx8ICh0eXBlRnJvbSA9PSBudWxsVHlwZSkpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB0b1N0cmluZ01ldGhvZDogTWV0aG9kO1xyXG4gICAgICAgICAgICBpZiAodHlwZUZyb20gPT0gbnVsbFR5cGUpIHtcclxuICAgICAgICAgICAgICAgIHRvU3RyaW5nTWV0aG9kID0gb2JqZWN0VHlwZS5nZXRNZXRob2RCeVNpZ25hdHVyZShcInRvU3RyaW5nKClcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0b1N0cmluZ01ldGhvZCA9ICg8S2xhc3M+dHlwZUZyb20pLmdldE1ldGhvZEJ5U2lnbmF0dXJlKFwidG9TdHJpbmcoKVwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodG9TdHJpbmdNZXRob2QgIT0gbnVsbCAmJiB0b1N0cmluZ01ldGhvZC5nZXRSZXR1cm5UeXBlKCkgPT0gc3RyaW5nUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgYXV0b21hdGljVG9TdHJpbmcgPSBuZXcgTWV0aG9kKHRvU3RyaW5nTWV0aG9kLmlkZW50aWZpZXIsIHRvU3RyaW5nTWV0aG9kLnBhcmFtZXRlcmxpc3QsIHN0cmluZ1ByaW1pdGl2ZVR5cGUsIChwYXJhbWV0ZXJzOiBWYWx1ZVtdKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIFwibnVsbFwiO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0b1N0cmluZ01ldGhvZC5pbnZva2UocGFyYW1ldGVycyk7XHJcbiAgICAgICAgICAgICAgICB9LCB0b1N0cmluZ01ldGhvZC5pc0Fic3RyYWN0LCB0cnVlLCB0b1N0cmluZ01ldGhvZC5kb2N1bWVudGF0aW9uLCB0b1N0cmluZ01ldGhvZC5pc0NvbnN0cnVjdG9yKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhdXRvbWF0aWNUb1N0cmluZyAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnNlcnRPclB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHRleHRwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogYXV0b21hdGljVG9TdHJpbmcsXHJcbiAgICAgICAgICAgICAgICBpc1N1cGVyQ2FsbDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0xLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICB9LCBjb2RlcG9zKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNoZWNrSWZBc3NpZ25tZW50SW5zdGVkT2ZFcXVhbChub2RlRnJvbTogQVNUTm9kZSwgY29uZGl0aW9uVHlwZT86IFR5cGUpIHtcclxuICAgICAgICBpZiAobm9kZUZyb20gPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAobm9kZUZyb20udHlwZSA9PSBUb2tlblR5cGUuYmluYXJ5T3AgJiYgbm9kZUZyb20ub3BlcmF0b3IgPT0gVG9rZW5UeXBlLmFzc2lnbm1lbnQpIHtcclxuICAgICAgICAgICAgbGV0IHBvcyA9IG5vZGVGcm9tLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIj0gaXN0IGRlciBadXdlaXN1bmdzb3BlcmF0b3IuIER1IHdpbGxzdCBzaWNoZXIgendlaSBXZXJ0ZSB2ZXJnbGVpY2hlbi4gRGF6dSBiZW7DtnRpZ3N0IER1IGRlbiBWZXJnbGVpY2hzb3BlcmF0b3IgPT0uXCIsXHJcbiAgICAgICAgICAgICAgICBwb3MsIGNvbmRpdGlvblR5cGUgPT0gYm9vbGVhblByaW1pdGl2ZVR5cGUgPyBcIndhcm5pbmdcIiA6IFwiZXJyb3JcIiwge1xyXG4gICAgICAgICAgICAgICAgdGl0bGU6ICc9IGR1cmNoID09IGVyc2V0emVuJyxcclxuICAgICAgICAgICAgICAgIGVkaXRzUHJvdmlkZXI6ICh1cmkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2U6IHVyaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWRpdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydExpbmVOdW1iZXI6IHBvcy5saW5lLCBzdGFydENvbHVtbjogcG9zLmNvbHVtbiwgZW5kTGluZU51bWJlcjogcG9zLmxpbmUsIGVuZENvbHVtbjogcG9zLmNvbHVtbiArIDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXZlcml0eTogbW9uYWNvLk1hcmtlclNldmVyaXR5LkVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCI9PVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZW5lcmF0ZVN0YXRlbWVudHMobm9kZXM6IEFTVE5vZGVbXSk6IHsgd2l0aFJldHVyblN0YXRlbWVudDogYm9vbGVhbiwgZW5kUG9zaXRpb24/OiBUZXh0UG9zaXRpb24gfSB7XHJcblxyXG5cclxuICAgICAgICBpZiAobm9kZXMgPT0gbnVsbCB8fCBub2Rlcy5sZW5ndGggPT0gMCB8fCBub2Rlc1swXSA9PSBudWxsKSByZXR1cm4geyB3aXRoUmV0dXJuU3RhdGVtZW50OiBmYWxzZSB9O1xyXG5cclxuICAgICAgICBsZXQgd2l0aFJldHVyblN0YXRlbWVudDogYm9vbGVhbiA9IHRoaXMucHJvY2Vzc1N0YXRlbWVudHNJbnNpZGVCbG9jayhub2Rlcyk7XHJcblxyXG4gICAgICAgIGxldCBsYXN0Tm9kZSA9IG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIGxldCBlbmRQb3NpdGlvbjogVGV4dFBvc2l0aW9uO1xyXG4gICAgICAgIGlmIChsYXN0Tm9kZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmIChsYXN0Tm9kZS50eXBlID09IFRva2VuVHlwZS5zY29wZU5vZGUpIHtcclxuICAgICAgICAgICAgICAgIGVuZFBvc2l0aW9uID0gbGFzdE5vZGUucG9zaXRpb25UbztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGVuZFBvc2l0aW9uID0gT2JqZWN0LmFzc2lnbih7fSwgbGFzdE5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVuZFBvc2l0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmRQb3NpdGlvbi5jb2x1bW4gKz0gZW5kUG9zaXRpb24ubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZFBvc2l0aW9uLmxlbmd0aCA9IDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5sYXN0UG9zaXRpb24gPSBlbmRQb3NpdGlvbjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlbmRQb3NpdGlvbiA9IHRoaXMubGFzdFBvc2l0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHsgd2l0aFJldHVyblN0YXRlbWVudDogd2l0aFJldHVyblN0YXRlbWVudCwgZW5kUG9zaXRpb246IGVuZFBvc2l0aW9uIH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NTdGF0ZW1lbnRzSW5zaWRlQmxvY2sobm9kZXM6IEFTVE5vZGVbXSkge1xyXG4gICAgICAgIGxldCB3aXRoUmV0dXJuU3RhdGVtZW50ID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGZvciAobGV0IG5vZGUgb2Ygbm9kZXMpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChub2RlID09IG51bGwpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgbGV0IHR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCAmJiB0eXBlLndpdGhSZXR1cm5TdGF0ZW1lbnQgIT0gbnVsbCAmJiB0eXBlLndpdGhSZXR1cm5TdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBsYXN0IFN0YXRlbWVudCBoYXMgdmFsdWUgd2hpY2ggaXMgbm90IHVzZWQgZnVydGhlciB0aGVuIHBvcCB0aGlzIHZhbHVlIGZyb20gc3RhY2suXHJcbiAgICAgICAgICAgIC8vIGUuZy4gc3RhdGVtZW50IDEyICsgMTcgLTc7XHJcbiAgICAgICAgICAgIC8vIFBhcnNlciBpc3N1ZXMgYSB3YXJuaW5nIGluIHRoaXMgY2FzZSwgc2VlIFBhcnNlci5jaGVja0lmU3RhdGVtZW50SGFzTm9FZmZla3RcclxuICAgICAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCAmJiB0eXBlLnR5cGUgIT0gbnVsbCAmJiB0eXBlLnR5cGUgIT0gdm9pZFByaW1pdGl2ZVR5cGUpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5sYXN0U3RhdGVtZW50ICE9IG51bGwgJiZcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RTdGF0ZW1lbnQudHlwZSA9PSBUb2tlblR5cGUuYXNzaWdubWVudCAmJiB0aGlzLmxhc3RTdGF0ZW1lbnQubGVhdmVWYWx1ZU9uU3RhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RTdGF0ZW1lbnQubGVhdmVWYWx1ZU9uU3RhY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5kZWNyZWFzZVN0YWNrcG9pbnRlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcENvdW50OiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9LCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB3aXRoUmV0dXJuU3RhdGVtZW50O1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBsYXN0UG9zaXRpb246IFRleHRQb3NpdGlvbjtcclxuICAgIGxhc3RTdGF0ZW1lbnQ6IFN0YXRlbWVudDtcclxuXHJcbiAgICBpbnNlcnRTdGF0ZW1lbnRzKHBvczogbnVtYmVyLCBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnQgfCBTdGF0ZW1lbnRbXSkge1xyXG4gICAgICAgIGlmIChzdGF0ZW1lbnRzID09IG51bGwpIHJldHVybjtcclxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoc3RhdGVtZW50cykpIHN0YXRlbWVudHMgPSBbc3RhdGVtZW50c107XHJcbiAgICAgICAgZm9yIChsZXQgc3Qgb2Ygc3RhdGVtZW50cykge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMuc3BsaWNlKHBvcysrLCAwLCBzdCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1c2hTdGF0ZW1lbnRzKHN0YXRlbWVudDogU3RhdGVtZW50IHwgU3RhdGVtZW50W10sIGRlbGV0ZVN0ZXBGaW5pc2hlZEZsYWdPblN0ZXBCZWZvcmU6IGJvb2xlYW4gPSBmYWxzZSkge1xyXG5cclxuICAgICAgICBpZiAoc3RhdGVtZW50ID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKGRlbGV0ZVN0ZXBGaW5pc2hlZEZsYWdPblN0ZXBCZWZvcmUgJiYgdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgbGV0IHN0ZXBCZWZvcmU6IFN0YXRlbWVudCA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50c1t0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgIHN0ZXBCZWZvcmUuc3RlcEZpbmlzaGVkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzdGF0ZW1lbnQpKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHN0IG9mIHN0YXRlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2goc3QpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHN0LnR5cGUgPT0gVG9rZW5UeXBlLnJldHVybiB8fCBzdC50eXBlID09IFRva2VuVHlwZS5qdW1wQWx3YXlzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubGFzdFN0YXRlbWVudCAhPSBudWxsKSB0aGlzLmxhc3RTdGF0ZW1lbnQuc3RlcEZpbmlzaGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoc3QucG9zaXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdFBvc2l0aW9uID0gc3QucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0LnBvc2l0aW9uID0gdGhpcy5sYXN0UG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxhc3RTdGF0ZW1lbnQgPSBzdDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5wdXNoKHN0YXRlbWVudCk7XHJcbiAgICAgICAgICAgIGlmIChzdGF0ZW1lbnQudHlwZSA9PSBUb2tlblR5cGUucmV0dXJuIHx8IHN0YXRlbWVudC50eXBlID09IFRva2VuVHlwZS5qdW1wQWx3YXlzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5sYXN0U3RhdGVtZW50ICE9IG51bGwgJiYgdGhpcy5sYXN0U3RhdGVtZW50LnR5cGUgIT0gVG9rZW5UeXBlLm5vT3ApIHRoaXMubGFzdFN0YXRlbWVudC5zdGVwRmluaXNoZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc3RhdGVtZW50LnBvc2l0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGFzdFBvc2l0aW9uID0gc3RhdGVtZW50LnBvc2l0aW9uO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3RhdGVtZW50LnBvc2l0aW9uID0gdGhpcy5sYXN0UG9zaXRpb247XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMubGFzdFN0YXRlbWVudCA9IHN0YXRlbWVudDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaW5zZXJ0T3JQdXNoU3RhdGVtZW50cyhzdGF0ZW1lbnRzOiBTdGF0ZW1lbnQgfCBTdGF0ZW1lbnRbXSwgcG9zPzogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKHBvcyA9PSBudWxsICYmIHBvcyA9PSB1bmRlZmluZWQpIHRoaXMucHVzaFN0YXRlbWVudHMoc3RhdGVtZW50cyk7XHJcbiAgICAgICAgZWxzZSB0aGlzLmluc2VydFN0YXRlbWVudHMocG9zLCBzdGF0ZW1lbnRzKTtcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmVMYXN0U3RhdGVtZW50KCkge1xyXG4gICAgICAgIGxldCBsc3QgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMucG9wKCk7XHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXIucmVtb3ZlTm9kZShsc3QpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpbml0U3RhY2tGcmFtZU5vZGVzOiBJbml0U3RhY2tmcmFtZVN0YXRlbWVudFtdID0gW107XHJcblxyXG5cclxuICAgIHB1c2hOZXdTeW1ib2xUYWJsZShiZWdpbk5ld1N0YWNrZnJhbWU6IGJvb2xlYW4sIHBvc2l0aW9uRnJvbTogVGV4dFBvc2l0aW9uLCBwb3NpdGlvblRvOiBUZXh0UG9zaXRpb24sXHJcbiAgICAgICAgcHJvZ3JhbT86IFByb2dyYW0pOiBTeW1ib2xUYWJsZSB7XHJcblxyXG4gICAgICAgIGxldCBzdCA9IG5ldyBTeW1ib2xUYWJsZSh0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZSwgcG9zaXRpb25Gcm9tLCBwb3NpdGlvblRvKTtcclxuXHJcbiAgICAgICAgdGhpcy5zeW1ib2xUYWJsZVN0YWNrLnB1c2godGhpcy5jdXJyZW50U3ltYm9sVGFibGUpO1xyXG5cclxuICAgICAgICBpZiAoYmVnaW5OZXdTdGFja2ZyYW1lKSB7XHJcbiAgICAgICAgICAgIHN0LmJlZ2luc05ld1N0YWNrZnJhbWUgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5zdGFja2ZyYW1lU2l6ZSA9IHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zO1xyXG4gICAgICAgICAgICB0aGlzLm5leHRGcmVlUmVsYXRpdmVTdGFja1BvcyA9IDA7XHJcblxyXG4gICAgICAgICAgICBpZiAocHJvZ3JhbSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5pdFN0YWNrRnJhbWVOb2RlOiBJbml0U3RhY2tmcmFtZVN0YXRlbWVudCA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuaW5pdFN0YWNrZnJhbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uRnJvbSxcclxuICAgICAgICAgICAgICAgICAgICByZXNlcnZlRm9yTG9jYWxWYXJpYWJsZXM6IDBcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBwcm9ncmFtLnN0YXRlbWVudHMucHVzaChpbml0U3RhY2tGcmFtZU5vZGUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0U3RhY2tGcmFtZU5vZGVzLnB1c2goaW5pdFN0YWNrRnJhbWVOb2RlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlID0gc3Q7XHJcblxyXG4gICAgICAgIHJldHVybiBzdDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcG9wU3ltYm9sVGFibGUocHJvZ3JhbT86IFByb2dyYW0sIGRlbGV0ZVN0ZXBGaW5pc2hlZEZsYWdPblN0ZXBCZWZvcmU6IGJvb2xlYW4gPSBmYWxzZSk6IHZvaWQge1xyXG5cclxuICAgICAgICBsZXQgc3QgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZSA9IHRoaXMuc3ltYm9sVGFibGVTdGFjay5wb3AoKTtcclxuXHJcbiAgICAgICAgLy8gaWYgdi5kZWNsYXJhdGlvbkVycm9yICE9IG51bGwgdGhlbiB2YXJpYWJsZSBoYXMgYmVlbiB1c2VkIGJlZm9yZSBpbml0aWFsaXphdGlvbi5cclxuICAgICAgICBzdC52YXJpYWJsZU1hcC5mb3JFYWNoKHYgPT4ge1xyXG4gICAgICAgICAgICBpZiAodi5kZWNsYXJhdGlvbkVycm9yICE9IG51bGwgJiYgdi51c2VkQmVmb3JlSW5pdGlhbGl6YXRpb24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXJyb3JMaXN0LnB1c2godi5kZWNsYXJhdGlvbkVycm9yKTtcclxuICAgICAgICAgICAgICAgIHYuZGVjbGFyYXRpb25FcnJvciA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gaWYgKCFzdC5iZWdpbnNOZXdTdGFja2ZyYW1lICYmIHN0LnZhcmlhYmxlTWFwLnNpemUgPT0gMCAmJiByZW1vdmVJKSB7XHJcbiAgICAgICAgLy8gICAgIC8vIGVtcHR5IHN5bWJvbCB0YWJsZSA9PiByZW1vdmUgaXQhXHJcbiAgICAgICAgLy8gICAgIGlmIChzdC5wYXJlbnQgIT0gbnVsbCkge1xyXG4gICAgICAgIC8vICAgICAgICAgc3QucGFyZW50LmNoaWxkU3ltYm9sVGFibGVzLnBvcCgpO1xyXG4gICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgLy8gfSBlbHNlIFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogYWRkIGxlbmd0aCBvZiB0b2tlblxyXG5cclxuICAgICAgICAgICAgaWYgKHN0LmJlZ2luc05ld1N0YWNrZnJhbWUpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBzdC5zdGFja2ZyYW1lU2l6ZSA9IHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3MgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5zdGFja2ZyYW1lU2l6ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocHJvZ3JhbSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluaXRTdGFja2ZyYW1lTm9kZSA9IHRoaXMuaW5pdFN0YWNrRnJhbWVOb2Rlcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5pdFN0YWNrZnJhbWVOb2RlICE9IG51bGwpIGluaXRTdGFja2ZyYW1lTm9kZS5yZXNlcnZlRm9yTG9jYWxWYXJpYWJsZXMgPSBzdC5zdGFja2ZyYW1lU2l6ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwICYmIGRlbGV0ZVN0ZXBGaW5pc2hlZEZsYWdPblN0ZXBCZWZvcmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXRlbWVudCA9IHByb2dyYW0uc3RhdGVtZW50c1twcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoIC0gMV07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkb24ndCBzZXQgc3RlcEZpbmlzaGVkID0gZmFsc2UgaW4ganVtcC1zdGF0ZW1lbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzIHRoaXMgY291bGQgbGVhZCB0byBpbmZpbml0eS1sb29wIGlzIHVzZXIgc2V0cyBcIndoaWxlKHRydWUpO1wiIGp1c3QgYmVmb3JlIHByb2dyYW0gZW5kXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChbVG9rZW5UeXBlLmp1bXBBbHdheXMsIFRva2VuVHlwZS5qdW1wSWZUcnVlLCBUb2tlblR5cGUuanVtcElmRmFsc2UsIFRva2VuVHlwZS5qdW1wSWZGYWxzZUFuZExlYXZlT25TdGFjaywgVG9rZW5UeXBlLmp1bXBJZlRydWVBbmRMZWF2ZU9uU3RhY2tdLmluZGV4T2Yoc3RhdGVtZW50LnR5cGUpID09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtLnN0YXRlbWVudHNbcHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aCAtIDFdLnN0ZXBGaW5pc2hlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBwcm9ncmFtLnN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jbG9zZVN0YWNrZnJhbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBzdC5wb3NpdGlvblRvXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVzaEVycm9yKHRleHQ6IHN0cmluZywgcG9zaXRpb246IFRleHRQb3NpdGlvbiwgZXJyb3JMZXZlbDogRXJyb3JMZXZlbCA9IFwiZXJyb3JcIiwgcXVpY2tGaXg/OiBRdWlja0ZpeCkge1xyXG4gICAgICAgIHRoaXMuZXJyb3JMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICB0ZXh0OiB0ZXh0LFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgIHF1aWNrRml4OiBxdWlja0ZpeCxcclxuICAgICAgICAgICAgbGV2ZWw6IGVycm9yTGV2ZWxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBvcGVuQnJlYWtTY29wZSgpIHtcclxuICAgICAgICB0aGlzLmJyZWFrTm9kZVN0YWNrLnB1c2goW10pO1xyXG4gICAgfVxyXG5cclxuICAgIG9wZW5Db250aW51ZVNjb3BlKCkge1xyXG4gICAgICAgIHRoaXMuY29udGludWVOb2RlU3RhY2sucHVzaChbXSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVzaEJyZWFrTm9kZShicmVha05vZGU6IEp1bXBBbHdheXNTdGF0ZW1lbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5icmVha05vZGVTdGFjay5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVpbmUgYnJlYWstQW53ZWlzdW5nIGlzdCBudXIgaW5uZXJoYWxiIGVpbmVyIHVtZ2ViZW5kZW4gU2NobGVpZmUgb2RlciBzd2l0Y2gtQW53ZWlzdW5nIHNpbm52b2xsLlwiLCBicmVha05vZGUucG9zaXRpb24pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnJlYWtOb2RlU3RhY2tbdGhpcy5icmVha05vZGVTdGFjay5sZW5ndGggLSAxXS5wdXNoKGJyZWFrTm9kZSk7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoYnJlYWtOb2RlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVzaENvbnRpbnVlTm9kZShjb250aW51ZU5vZGU6IEp1bXBBbHdheXNTdGF0ZW1lbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5jb250aW51ZU5vZGVTdGFjay5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVpbmUgY29udGludWUtQW53ZWlzdW5nIGlzdCBudXIgaW5uZXJoYWxiIGVpbmVyIHVtZ2ViZW5kZW4gU2NobGVpZmUgb2RlciBzd2l0Y2gtQW53ZWlzdW5nIHNpbm52b2xsLlwiLCBjb250aW51ZU5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGludWVOb2RlU3RhY2tbdGhpcy5jb250aW51ZU5vZGVTdGFjay5sZW5ndGggLSAxXS5wdXNoKGNvbnRpbnVlTm9kZSk7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoY29udGludWVOb2RlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvc2VCcmVha1Njb3BlKGJyZWFrVGFyZ2V0TGFiZWw6IG51bWJlciwgbG06IExhYmVsTWFuYWdlcikge1xyXG4gICAgICAgIGxldCBicmVha05vZGVzID0gdGhpcy5icmVha05vZGVTdGFjay5wb3AoKTtcclxuICAgICAgICBmb3IgKGxldCBibiBvZiBicmVha05vZGVzKSB7XHJcbiAgICAgICAgICAgIGxtLnJlZ2lzdGVySnVtcE5vZGUoYm4sIGJyZWFrVGFyZ2V0TGFiZWwpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbG9zZUNvbnRpbnVlU2NvcGUoY29udGludWVUYXJnZXRMYWJlbDogbnVtYmVyLCBsbTogTGFiZWxNYW5hZ2VyKSB7XHJcbiAgICAgICAgbGV0IGNvbnRpbnVlTm9kZXMgPSB0aGlzLmNvbnRpbnVlTm9kZVN0YWNrLnBvcCgpO1xyXG4gICAgICAgIGZvciAobGV0IGJuIG9mIGNvbnRpbnVlTm9kZXMpIHtcclxuICAgICAgICAgICAgbG0ucmVnaXN0ZXJKdW1wTm9kZShibiwgY29udGludWVUYXJnZXRMYWJlbCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGJyZWFrT2NjdXJlZCgpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5icmVha05vZGVTdGFjay5sZW5ndGggPiAwICYmIHRoaXMuYnJlYWtOb2RlU3RhY2tbdGhpcy5icmVha05vZGVTdGFjay5sZW5ndGggLSAxXS5sZW5ndGggPiAwO1xyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NOb2RlKG5vZGU6IEFTVE5vZGUsIGlzTGVmdFNpZGVPZkFzc2lnbm1lbnQ6IGJvb2xlYW4gPSBmYWxzZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGlmIChub2RlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuYmluYXJ5T3A6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzQmluYXJ5T3Aobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnVuYXJ5T3A6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzVW5hcnlPcChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaENvbnN0YW50OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHVzaENvbnN0YW50KG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jYWxsTWV0aG9kOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbE1ldGhvZChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuaWRlbnRpZmllcjpcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3RhY2tUeXBlID0gdGhpcy5yZXNvbHZlSWRlbnRpZmllcihub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdiA9IG5vZGUudmFyaWFibGU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHYgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNMZWZ0U2lkZU9mQXNzaWdubWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdi5pbml0aWFsaXplZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXYudXNlZEJlZm9yZUluaXRpYWxpemF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdi5kZWNsYXJhdGlvbkVycm9yID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2LmluaXRpYWxpemVkICE9IG51bGwgJiYgIXYuaW5pdGlhbGl6ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2LnVzZWRCZWZvcmVJbml0aWFsaXphdGlvbiA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgVmFyaWFibGUgXCIgKyB2LmlkZW50aWZpZXIgKyBcIiB3aXJkIGhpZXIgYmVudXR6dCBiZXZvciBzaWUgaW5pdGlhbGlzaWVydCB3dXJkZS5cIiwgbm9kZS5wb3NpdGlvbiwgXCJpbmZvXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGFja1R5cGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnNlbGVjdEFycmF5RWxlbWVudDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbGVjdEFycmF5RWxlbWVudChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuaW5jcmVtZW50RGVjcmVtZW50QmVmb3JlOlxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5pbmNyZW1lbnREZWNyZW1lbnRBZnRlcjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmluY3JlbWVudERlY3JlbWVudEJlZm9yZU9yQWZ0ZXIobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnN1cGVyQ29uc3RydWN0b3JDYWxsOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3VwZXJjb25zdHJ1Y3RvckNhbGwobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmNvbnN0cnVjdG9yQ2FsbDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN1cGVyY29uc3RydWN0b3JDYWxsKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkVGhpczpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnB1c2hUaGlzT3JTdXBlcihub2RlLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRTdXBlcjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnB1c2hUaGlzT3JTdXBlcihub2RlLCB0cnVlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaEF0dHJpYnV0ZTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnB1c2hBdHRyaWJ1dGUobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5ld09iamVjdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm5ld09iamVjdChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZFdoaWxlOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1doaWxlKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkRG86XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzRG8obm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRGb3I6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzRm9yKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5mb3JMb29wT3ZlckNvbGxlY3Rpb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzRm9yTG9vcE92ZXJDb2xsZWN0aW9uKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkSWY6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzSWYobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRTd2l0Y2g6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzU3dpdGNoKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkUmV0dXJuOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JldHVybihub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5hcnJheUluaXRpYWxpemF0aW9uOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0FycmF5TGl0ZXJhbChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubmV3QXJyYXk6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzTmV3QXJyYXkobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRQcmludDpcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZFByaW50bG46XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzUHJpbnQobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmNhc3RWYWx1ZTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NNYW51YWxDYXN0KG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkQnJlYWs6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hCcmVha05vZGUoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5qdW1wQWx3YXlzLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkQ29udGludWU6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hDb250aW51ZU5vZGUoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5qdW1wQWx3YXlzLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5yaWdodEJyYWNrZXQ6XHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS50ZXJtSW5zaWRlQnJhY2tldHMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCAmJiB0eXBlLnR5cGUgaW5zdGFuY2VvZiBLbGFzcykgdGhpcy5wdXNoVHlwZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIHR5cGUudHlwZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2NvcGVOb2RlOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIG5vZGUucG9zaXRpb24sIG5vZGUucG9zaXRpb25Ubyk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSB0aGlzLnByb2Nlc3NTdGF0ZW1lbnRzSW5zaWRlQmxvY2sobm9kZS5zdGF0ZW1lbnRzKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnBvcFN5bWJvbFRhYmxlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgd2l0aFJldHVyblN0YXRlbWVudDogd2l0aFJldHVyblN0YXRlbWVudCB9O1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NNYW51YWxDYXN0KG5vZGU6IENhc3RNYW51YWxseU5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgdHlwZUZyb20xID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLndoYXRUb0Nhc3QpO1xyXG5cclxuICAgICAgICBpZiAodHlwZUZyb20xID09IG51bGwgfHwgdHlwZUZyb20xLnR5cGUgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgIGxldCB0eXBlRnJvbTogVHlwZSA9IHR5cGVGcm9tMS50eXBlO1xyXG5cclxuICAgICAgICBpZiAodHlwZUZyb20gIT0gbnVsbCAmJiBub2RlLmNhc3RUb1R5cGUgIT0gbnVsbCAmJiBub2RlLmNhc3RUb1R5cGUucmVzb2x2ZWRUeXBlICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB0eXBlVG8gPSBub2RlLmNhc3RUb1R5cGUucmVzb2x2ZWRUeXBlO1xyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGVGcm9tLmNhbkNhc3RUbyh0eXBlVG8pKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoQ2FzdFRvU3RhdGVtZW50KHR5cGVGcm9tLCB0eXBlVG8sIG5vZGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiB0eXBlRnJvbTEuaXNBc3NpZ25hYmxlLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHR5cGVUb1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICgodHlwZUZyb20gaW5zdGFuY2VvZiBLbGFzcyB8fCB0eXBlRnJvbSBpbnN0YW5jZW9mIEludGVyZmFjZSkgJiYgKHR5cGVUbyBpbnN0YW5jZW9mIEtsYXNzIHx8IHR5cGVUbyBpbnN0YW5jZW9mIEludGVyZmFjZSkpXHJcblxyXG4gICAgICAgICAgICAvLyBpZiAodHlwZUZyb20gaW5zdGFuY2VvZiBLbGFzcyAmJlxyXG4gICAgICAgICAgICAvLyAgICAgKHR5cGVUbyBpbnN0YW5jZW9mIEtsYXNzICYmICF0eXBlRnJvbS5oYXNBbmNlc3Rvck9ySXModHlwZVRvKSAmJiB0eXBlVG8uaGFzQW5jZXN0b3JPcklzKHR5cGVGcm9tKSkgfHxcclxuICAgICAgICAgICAgLy8gICAgICh0eXBlVG8gaW5zdGFuY2VvZiBJbnRlcmZhY2UgJiYgISg8S2xhc3M+dHlwZUZyb20pLmltcGxlbWVudHNJbnRlcmZhY2UodHlwZVRvKSkpIFxyXG4gICAgICAgICAgICB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNoZWNrQ2FzdCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeXBlOiB0eXBlVG8sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IHR5cGVGcm9tMS5pc0Fzc2lnbmFibGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZVRvXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgRGF0ZW50eXAgXCIgKyB0eXBlRnJvbS5pZGVudGlmaWVyICsgXCIga2FubiAoenVtaW5kZXN0IGR1cmNoIGNhc3RpbmcpIG5pY2h0IGluIGRlbiBEYXRlbnR5cCBcIiArIHR5cGVUby5pZGVudGlmaWVyICsgXCIgdW1nZXdhbmRlbHQgd2VyZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHB1c2hDYXN0VG9TdGF0ZW1lbnQodHlwZUZyb206IFR5cGUsIHR5cGVUbzogVHlwZSwgbm9kZTogQ2FzdE1hbnVhbGx5Tm9kZSkge1xyXG4gICAgICAgIGxldCBuZWVkc1N0YXRlbWVudDogYm9vbGVhbiA9IHR5cGVGcm9tICE9IHR5cGVUbztcclxuXHJcbiAgICAgICAgaWYgKG5lZWRzU3RhdGVtZW50KSB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhc3RWYWx1ZSxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgIG5ld1R5cGU6IHR5cGVUb1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzUHJpbnQobm9kZTogUHJpbnROb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IHR5cGUgPSBub2RlLnR5cGUgPT0gVG9rZW5UeXBlLmtleXdvcmRQcmludCA/IFRva2VuVHlwZS5wcmludCA6IFRva2VuVHlwZS5wcmludGxuO1xyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZS5wdXNoTWV0aG9kQ2FsbFBvc2l0aW9uKG5vZGUucG9zaXRpb24sIG5vZGUuY29tbWFQb3NpdGlvbnMsIFRva2VuVHlwZVJlYWRhYmxlW25vZGUudHlwZV0sIG5vZGUucmlnaHRCcmFja2V0UG9zaXRpb24pO1xyXG5cclxuICAgICAgICBpZiAobm9kZS50ZXh0ICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB0eXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLnRleHQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmVuc3VyZUF1dG9tYXRpY1RvU3RyaW5nKHR5cGUudHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBNZXRob2RlbiBwcmludCB1bmQgcHJpbnRsbiBlcndhcnRlbiBlaW5lbiBQYXJhbWV0ZXIgdm9tIFR5cCBTdHJpbmcuIEdlZnVuZGVuIHd1cmRlIGVpbiBXZXJ0IHZvbSBUeXAgXCIgKyB0eXBlLnR5cGU/LmlkZW50aWZpZXIgKyBcIi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgd2l0aENvbG9yOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmIChub2RlLmNvbG9yICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB0eXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLmNvbG9yKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlLnR5cGUgIT0gc3RyaW5nUHJpbWl0aXZlVHlwZSAmJiB0eXBlLnR5cGUgIT0gaW50UHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKHR5cGUudHlwZSwgc3RyaW5nUHJpbWl0aXZlVHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgTWV0aG9kZW4gcHJpbnQgdW5kIHByaW50bG4gZXJ3YXJ0ZW4gYWxzIEZhcmJlIGVpbmVuIFBhcmFtZXRlciB2b20gVHlwIFN0cmluZyBvZGVyIGludC4gR2VmdW5kZW4gd3VyZGUgZWluIFdlcnQgdm9tIFR5cCBcIiArIHR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgd2l0aENvbG9yID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogdHlwZSxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgIGVtcHR5OiAobm9kZS50ZXh0ID09IG51bGwpLFxyXG4gICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIHdpdGhDb2xvcjogd2l0aENvbG9yXHJcbiAgICAgICAgfSk7XHJcblxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzTmV3QXJyYXkobm9kZTogTmV3QXJyYXlOb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzQXJyYXlMaXRlcmFsKG5vZGUuaW5pdGlhbGl6YXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaW50WzddWzJdW10gYXJlIDcgYXJyYXlzIGVhY2ggd2l0aCBhcnJheXMgb2YgbGVuZ3RoIDIgd2hpY2ggYXJlIGVtcHR5XHJcblxyXG4gICAgICAgIGxldCBkaW1lbnNpb24gPSAwO1xyXG4gICAgICAgIGZvciAobGV0IGVjIG9mIG5vZGUuZWxlbWVudENvdW50KSB7XHJcbiAgICAgICAgICAgIGlmIChlYyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NOb2RlKGVjKTsgLy8gcHVzaCBudW1iZXIgb2YgZWxlbWVudHMgZm9yIHRoaXMgZGltZW5zaW9uIG9uIHN0YWNrXHJcbiAgICAgICAgICAgICAgICBkaW1lbnNpb24rKztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBmb3IgdGhlIGFycmF5IGFib3ZlOiBhcnJheVR5cGUgaXMgYXJyYXkgb2YgYXJyYXkgb2YgaW50OyBkaW1lbnNpb24gaXMgMjsgc3RhY2s6IDcgMlxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEVtcHR5QXJyYXksXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBhcnJheVR5cGU6IG5vZGUuYXJyYXlUeXBlLnJlc29sdmVkVHlwZSxcclxuICAgICAgICAgICAgZGltZW5zaW9uOiBkaW1lbnNpb25cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgdHlwZTogbm9kZS5hcnJheVR5cGUucmVzb2x2ZWRUeXBlXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgcHJvY2Vzc0FycmF5TGl0ZXJhbChub2RlOiBBcnJheUluaXRpYWxpemF0aW9uTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBiZXM6IEJlZ2luQXJyYXlTdGF0ZW1lbnQgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5iZWdpbkFycmF5LFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgYXJyYXlUeXBlOiBub2RlLmFycmF5VHlwZS5yZXNvbHZlZFR5cGVcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKGJlcyk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGFpbiBvZiBub2RlLm5vZGVzKSB7XHJcblxyXG4gICAgICAgICAgICAvLyBEaWQgYW4gZXJyb3Igb2NjdXIgd2hlbiBwYXJzaW5nIGEgY29uc3RhbnQ/XHJcbiAgICAgICAgICAgIGlmIChhaW4gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhaW4udHlwZSA9PSBUb2tlblR5cGUuYXJyYXlJbml0aWFsaXphdGlvbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzQXJyYXlMaXRlcmFsKGFpbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgc1R5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKGFpbik7XHJcbiAgICAgICAgICAgICAgICBpZiAoc1R5cGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCB0YXJnZXRUeXBlID0gKDxBcnJheVR5cGU+bm9kZS5hcnJheVR5cGUucmVzb2x2ZWRUeXBlKS5hcnJheU9mVHlwZTtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKHNUeXBlLnR5cGUsIHRhcmdldFR5cGUsIGFpbi5wb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBEYXRlbnR5cCBkZXMgVGVybXMgKFwiICsgc1R5cGUudHlwZT8uaWRlbnRpZmllciArIFwiKSBrYW5uIG5pY2h0IGluIGRlbiBEYXRlbnR5cCBcIiArIHRhcmdldFR5cGU/LmlkZW50aWZpZXIgKyBcIiBrb252ZXJ0aWVydCB3ZXJkZW4uXCIsIGFpbi5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmFkZFRvQXJyYXksXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBudW1iZXJPZkVsZW1lbnRzVG9BZGQ6IG5vZGUubm9kZXMubGVuZ3RoXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlzQXNzaWduYWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgIHR5cGU6IG5vZGUuYXJyYXlUeXBlLnJlc29sdmVkVHlwZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgbG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGU6IExvY2FsVmFyaWFibGVEZWNsYXJhdGlvbk5vZGUsIGRvbnRXYXJuV2hlbk5vSW5pdGlhbGl6YXRpb246IGJvb2xlYW4gPSBmYWxzZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGlmIChub2RlLnZhcmlhYmxlVHlwZS5yZXNvbHZlZFR5cGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBub2RlLnZhcmlhYmxlVHlwZS5yZXNvbHZlZFR5cGUgPSBudWxsVHlwZTsgLy8gTWFrZSB0aGUgYmVzdCBvdXQgb2YgaXQuLi5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBkZWNsYXJlVmFyaWFibGVPbkhlYXAgPSAodGhpcy5oZWFwICE9IG51bGwgJiYgdGhpcy5zeW1ib2xUYWJsZVN0YWNrLmxlbmd0aCA8PSAyKTtcclxuXHJcbiAgICAgICAgbGV0IHZhcmlhYmxlOiBWYXJpYWJsZSA9IHtcclxuICAgICAgICAgICAgaWRlbnRpZmllcjogbm9kZS5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICBzdGFja1BvczogZGVjbGFyZVZhcmlhYmxlT25IZWFwID8gbnVsbCA6IHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zKyssXHJcbiAgICAgICAgICAgIHR5cGU6IG5vZGUudmFyaWFibGVUeXBlLnJlc29sdmVkVHlwZSxcclxuICAgICAgICAgICAgdXNhZ2VQb3NpdGlvbnM6IG5ldyBNYXAoKSxcclxuICAgICAgICAgICAgZGVjbGFyYXRpb246IHsgbW9kdWxlOiB0aGlzLm1vZHVsZSwgcG9zaXRpb246IG5vZGUucG9zaXRpb24gfSxcclxuICAgICAgICAgICAgaXNGaW5hbDogbm9kZS5pc0ZpbmFsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihub2RlLnBvc2l0aW9uLCB2YXJpYWJsZSk7XHJcblxyXG4gICAgICAgIGlmIChkZWNsYXJlVmFyaWFibGVPbkhlYXApIHtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmhlYXBWYXJpYWJsZURlY2xhcmF0aW9uLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBwdXNoT25Ub3BPZlN0YWNrRm9ySW5pdGlhbGl6YXRpb246IG5vZGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCxcclxuICAgICAgICAgICAgICAgIHZhcmlhYmxlOiB2YXJpYWJsZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogbm9kZS5pbml0aWFsaXphdGlvbiA9PSBudWxsXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaGVhcFt2YXJpYWJsZS5pZGVudGlmaWVyXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgVmFyaWFibGUgXCIgKyBub2RlLmlkZW50aWZpZXIgKyBcIiBkYXJmIGltIHNlbGJlbiBTaWNodGJhcmtlaXRzYmVyZWljaCAoU2NvcGUpIG5pY2h0IG1laHJtYWxzIGRlZmluaWVydCB3ZXJkZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmhlYXBbdmFyaWFibGUuaWRlbnRpZmllcl0gPSB2YXJpYWJsZTtcclxuICAgICAgICAgICAgLy8gb25seSBmb3IgY29kZSBjb21wbGV0aW9uOlxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS52YXJpYWJsZU1hcC5zZXQobm9kZS5pZGVudGlmaWVyLCB2YXJpYWJsZSk7XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50U3ltYm9sVGFibGUudmFyaWFibGVNYXAuZ2V0KG5vZGUuaWRlbnRpZmllcikpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIFZhcmlhYmxlIFwiICsgbm9kZS5pZGVudGlmaWVyICsgXCIgZGFyZiBpbSBzZWxiZW4gU2ljaHRiYXJrZWl0c2JlcmVpY2ggKFNjb3BlKSBuaWNodCBtZWhybWFscyBkZWZpbmllcnQgd2VyZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUudmFyaWFibGVNYXAuc2V0KG5vZGUuaWRlbnRpZmllciwgdmFyaWFibGUpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBwdXNoT25Ub3BPZlN0YWNrRm9ySW5pdGlhbGl6YXRpb246IG5vZGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCxcclxuICAgICAgICAgICAgICAgIHZhcmlhYmxlOiB2YXJpYWJsZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogbm9kZS5pbml0aWFsaXphdGlvbiA9PSBudWxsXHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5vZGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgaW5pdFR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuaW5pdGlhbGl6YXRpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGluaXRUeXBlICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFibGUudHlwZSA9PSB2YXJUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGUudHlwZSA9IGluaXRUeXBlLnR5cGU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGluaXRUeXBlLnR5cGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFR5cCBkZXMgVGVybXMgYXVmIGRlciByZWNodGVuIFNlaXRlIGRlcyBadXdlaXN1bmdzb3BlcmF0b3JzICg9KSBrb25udGUgbmljaHQgYmVzdGltbXQgd2VyZGVuLlwiLCBub2RlLmluaXRpYWxpemF0aW9uLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKGluaXRUeXBlLnR5cGUsIHZhcmlhYmxlLnR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFRlcm0gdm9tIFR5cCBcIiArIGluaXRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIGthbm4gZGVyIFZhcmlhYmxlIHZvbSBUeXAgXCIgKyB2YXJpYWJsZS50eXBlLmlkZW50aWZpZXIgKyBcIiBuaWNodCB6dWdlb3JkbmV0IHdlcmRlbi5cIiwgbm9kZS5pbml0aWFsaXphdGlvbi5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5hc3NpZ25tZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLmluaXRpYWxpemF0aW9uLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBsZWF2ZVZhbHVlT25TdGFjazogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICh2YXJpYWJsZS50eXBlID09IHZhclR5cGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIFZlcndlbmR1bmcgdm9uIHZhciBpc3QgbnVyIGRhbm4genVsw6Rzc2lnLCB3ZW5uIGVpbmUgbG9rYWxlIFZhcmlhYmxlIGluIGVpbmVyIEFud2Vpc3VuZyBkZWtsYXJpZXJ0IHVuZCBpbml0aWFsaXNpZXJ0IHdpcmQsIGFsc28gei5CLiB2YXIgaSA9IDEyO1wiLCBub2RlLnZhcmlhYmxlVHlwZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5pdGlhbGl6ZXI6IHN0cmluZyA9IFwiID0gbnVsbFwiO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlLnR5cGUgPT0gaW50UHJpbWl0aXZlVHlwZSkgaW5pdGlhbGl6ZXIgPSBcIiA9IDBcIjtcclxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS50eXBlID09IGRvdWJsZVByaW1pdGl2ZVR5cGUpIGluaXRpYWxpemVyID0gXCIgPSAwLjBcIjtcclxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS50eXBlID09IGJvb2xlYW5QcmltaXRpdmVUeXBlKSBpbml0aWFsaXplciA9IFwiID0gZmFsc2VcIjtcclxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS50eXBlID09IGNoYXJQcmltaXRpdmVUeXBlKSBpbml0aWFsaXplciA9IFwiID0gJyAnXCI7XHJcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFibGUudHlwZSA9PSBzdHJpbmdQcmltaXRpdmVUeXBlKSBpbml0aWFsaXplciA9ICcgPSBcIlwiJztcclxuXHJcbiAgICAgICAgICAgICAgICB2YXJpYWJsZS5kZWNsYXJhdGlvbkVycm9yID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiSmVkZSBsb2thbGUgVmFyaWFibGUgc29sbHRlIHZvciBpaHJlciBlcnN0ZW4gVmVyd2VuZHVuZyBpbml0aWFsaXNpZXJ0IHdlcmRlbi5cIixcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBxdWlja0ZpeDpcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBpbml0aWFsaXplciArIFwiIGVyZ8OkbnplblwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0c1Byb3ZpZGVyOiAodXJpKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zID0gbm9kZS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZTogdXJpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlZGl0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogeyBzdGFydExpbmVOdW1iZXI6IHBvcy5saW5lLCBzdGFydENvbHVtbjogcG9zLmNvbHVtbiArIHBvcy5sZW5ndGgsIGVuZExpbmVOdW1iZXI6IHBvcy5saW5lLCBlbmRDb2x1bW46IHBvcy5jb2x1bW4gKyBwb3MubGVuZ3RoIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbml0aWFsaXplclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbDogXCJpbmZvXCJcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB2YXJpYWJsZS51c2VkQmVmb3JlSW5pdGlhbGl6YXRpb24gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHZhcmlhYmxlLmluaXRpYWxpemVkID0gZG9udFdhcm5XaGVuTm9Jbml0aWFsaXphdGlvbjtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzUmV0dXJuKG5vZGU6IFJldHVybk5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgbWV0aG9kID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUubWV0aG9kO1xyXG5cclxuICAgICAgICBpZiAobWV0aG9kID09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW5lIHJldHVybi1BbndlaXN1bmcgaXN0IG51ciBpbSBLb250ZXh0IGVpbmVyIE1ldGhvZGUgZXJsYXVidC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5vZGUudGVybSAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAobWV0aG9kLmdldFJldHVyblR5cGUoKSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBNZXRob2RlIFwiICsgbWV0aG9kLmlkZW50aWZpZXIgKyBcIiBlcndhcnRldCBrZWluZW4gUsO8Y2tnYWJld2VydC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUudGVybSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZW5zdXJlQXV0b21hdGljQ2FzdGluZyh0eXBlLnR5cGUsIG1ldGhvZC5nZXRSZXR1cm5UeXBlKCksIG51bGwsIG5vZGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgTWV0aG9kZSBcIiArIG1ldGhvZC5pZGVudGlmaWVyICsgXCIgZXJ3YXJ0ZXQgZWluZW4gUsO8Y2tnYWJld2VydCB2b20gVHlwIFwiICsgbWV0aG9kLmdldFJldHVyblR5cGUoKS5pZGVudGlmaWVyICsgXCIuIEdlZnVuZGVuIHd1cmRlIGVpbiBXZXJ0IHZvbSBUeXAgXCIgKyB0eXBlLnR5cGUuaWRlbnRpZmllciArIFwiLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKG1ldGhvZC5nZXRSZXR1cm5UeXBlKCkgIT0gbnVsbCAmJiBtZXRob2QuZ2V0UmV0dXJuVHlwZSgpICE9IHZvaWRQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBNZXRob2RlIFwiICsgbWV0aG9kLmlkZW50aWZpZXIgKyBcIiBlcndhcnRldCBlaW5lbiBSw7xja2dhYmV3ZXJ0IHZvbSBUeXAgXCIgKyBtZXRob2QuZ2V0UmV0dXJuVHlwZSgpLmlkZW50aWZpZXIgKyBcIiwgZGFoZXIgaXN0IGRpZSBsZWVyZSBSZXR1cm4tQW53ZWlzdW5nIChyZXR1cm47KSBuaWNodCBhdXNyZWljaGVuZC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucmV0dXJuLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgY29weVJldHVyblZhbHVlVG9TdGFja2ZyYW1lUG9zMDogbm9kZS50ZXJtICE9IG51bGwsXHJcbiAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbGVhdmVUaGlzT2JqZWN0T25TdGFjazogZmFsc2VcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgd2l0aFJldHVyblN0YXRlbWVudDogdHJ1ZSB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzU3dpdGNoKG5vZGU6IFN3aXRjaE5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgbG0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlcjtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIG5vZGUuc2NvcGVGcm9tLCBub2RlLnNjb3BlVG8pO1xyXG5cclxuICAgICAgICBsZXQgY3QgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuY29uZGl0aW9uKTtcclxuICAgICAgICBpZiAoY3QgPT0gbnVsbCB8fCBjdC50eXBlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IGNvbmRpdGlvblR5cGUgPSBjdC50eXBlO1xyXG5cclxuICAgICAgICBsZXQgaXNTdHJpbmcgPSBjb25kaXRpb25UeXBlID09IHN0cmluZ1ByaW1pdGl2ZVR5cGUgfHwgY29uZGl0aW9uVHlwZSA9PSBjaGFyUHJpbWl0aXZlVHlwZTtcclxuICAgICAgICBsZXQgaXNJbnRlZ2VyID0gY29uZGl0aW9uVHlwZSA9PSBpbnRQcmltaXRpdmVUeXBlO1xyXG4gICAgICAgIGxldCBpc0VudW0gPSBjb25kaXRpb25UeXBlIGluc3RhbmNlb2YgRW51bTtcclxuXHJcbiAgICAgICAgaWYgKCEoaXNTdHJpbmcgfHwgaXNJbnRlZ2VyIHx8IGlzRW51bSkpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgVW50ZXJzY2hlaWR1bmdzdGVybXMgZWluZXIgc3dpdGNoLUFud2Vpc3VuZyBtdXNzIGRlbiBEYXRlbnR5cCBTdHJpbmcsIGNoYXIsIGludCBvZGVyIGVudW0gYmVzaXR6ZW4uIERpZXNlciBoaWVyIGlzdCB2b20gVHlwIFwiICsgY29uZGl0aW9uVHlwZS5pZGVudGlmaWVyLCBub2RlLmNvbmRpdGlvbi5wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXNFbnVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhc3RWYWx1ZSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLmNvbmRpdGlvbi5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIG5ld1R5cGU6IGludFByaW1pdGl2ZVR5cGVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc3dpdGNoU3RhdGVtZW50OiBKdW1wT25Td2l0Y2hTdGF0ZW1lbnQgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5rZXl3b3JkU3dpdGNoLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgZGVmYXVsdERlc3RpbmF0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICBzd2l0Y2hUeXBlOiBpc1N0cmluZyA/IFwic3RyaW5nXCIgOiBcIm51bWJlclwiLFxyXG4gICAgICAgICAgICBkZXN0aW5hdGlvbkxhYmVsczogW10sXHJcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uTWFwOiB7fVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhzd2l0Y2hTdGF0ZW1lbnQpO1xyXG5cclxuICAgICAgICAvLyBpZiB2YWx1ZSBub3QgaW5jbHVkZWQgaW4gY2FzZS1zdGF0ZW1lbnQgYW5kIG5vIGRlZmF1bHQtc3RhdGVtZW50IHByZXNlbnQ6XHJcbiAgICAgICAgbGV0IGVuZExhYmVsID0gbG0uaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBBbHdheXMsIG5vZGUucG9zaXRpb24sIHRoaXMpO1xyXG5cclxuICAgICAgICBzd2l0Y2hTdGF0ZW1lbnQuc3RlcEZpbmlzaGVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgbG0ucmVnaXN0ZXJTd2l0Y2hTdGF0ZW1lbnQoc3dpdGNoU3RhdGVtZW50KTtcclxuXHJcbiAgICAgICAgdGhpcy5vcGVuQnJlYWtTY29wZSgpO1xyXG5cclxuICAgICAgICBsZXQgd2l0aFJldHVyblN0YXRlbWVudCA9IG5vZGUuY2FzZU5vZGVzLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGNhc2VOb2RlIG9mIG5vZGUuY2FzZU5vZGVzKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgaXNEZWZhdWx0ID0gY2FzZU5vZGUuY2FzZVRlcm0gPT0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGlmICghaXNEZWZhdWx0KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGNvbnN0YW50OiBzdHJpbmcgfCBudW1iZXIgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpc0VudW0gJiYgY2FzZU5vZGUuY2FzZVRlcm0udHlwZSA9PSBUb2tlblR5cGUuaWRlbnRpZmllcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbjogRW51bSA9IDxFbnVtPmNvbmRpdGlvblR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZm8gPSBlbi5pZGVudGlmaWVyVG9JbmZvTWFwW2Nhc2VOb2RlLmNhc2VUZXJtLmlkZW50aWZpZXJdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmZvID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgRW51bS1LbGFzc2UgXCIgKyBjb25kaXRpb25UeXBlLmlkZW50aWZpZXIgKyBcIiBoYXQga2VpbiBFbGVtZW50IG1pdCBkZW0gQmV6ZWljaG5lciBcIiArIGNhc2VOb2RlLmNhc2VUZXJtLmlkZW50aWZpZXIsIGNhc2VOb2RlLnBvc2l0aW9uLCBcImVycm9yXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0YW50ID0gaW5mby5vcmRpbmFsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNhc2VUZXJtID0gdGhpcy5wcm9jZXNzTm9kZShjYXNlTm9kZS5jYXNlVGVybSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBscyA9IHRoaXMubGFzdFN0YXRlbWVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxzLnR5cGUgPT0gVG9rZW5UeXBlLnB1c2hDb25zdGFudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdGFudCA9IGxzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxzLnR5cGUgPT0gVG9rZW5UeXBlLnB1c2hFbnVtVmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RhbnQgPSBscy5lbnVtQ2xhc3MuZ2V0T3JkaW5hbChscy52YWx1ZUlkZW50aWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVMYXN0U3RhdGVtZW50KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNvbnN0YW50ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBUZXJtIGJlaSBjYXNlIG11c3Mga29uc3RhbnQgc2Vpbi5cIiwgY2FzZU5vZGUuY2FzZVRlcm0ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBsYWJlbCA9IGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKGNhc2VOb2RlLnN0YXRlbWVudHMpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdGF0ZW1lbnRzPy53aXRoUmV0dXJuU3RhdGVtZW50ID09IG51bGwgfHwgIXN0YXRlbWVudHMud2l0aFJldHVyblN0YXRlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzd2l0Y2hTdGF0ZW1lbnQuZGVzdGluYXRpb25MYWJlbHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3RhbnQ6IGNvbnN0YW50LFxyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiBsYWJlbFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBkZWZhdWx0IGNhc2VcclxuICAgICAgICAgICAgICAgIGxldCBsYWJlbCA9IGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKGNhc2VOb2RlLnN0YXRlbWVudHMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlbWVudHM/LndpdGhSZXR1cm5TdGF0ZW1lbnQgPT0gbnVsbCB8fCAhc3RhdGVtZW50cy53aXRoUmV0dXJuU3RhdGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2l0aFJldHVyblN0YXRlbWVudCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc3dpdGNoU3RhdGVtZW50LmRlZmF1bHREZXN0aW5hdGlvbiA9IGxhYmVsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN3aXRjaFN0YXRlbWVudC5kZWZhdWx0RGVzdGluYXRpb24gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB3aXRoUmV0dXJuU3RhdGVtZW50ID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEsIGVuZExhYmVsKTtcclxuXHJcbiAgICAgICAgdGhpcy5jbG9zZUJyZWFrU2NvcGUoZW5kTGFiZWwsIGxtKTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZShudWxsKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgd2l0aFJldHVyblN0YXRlbWVudDogd2l0aFJldHVyblN0YXRlbWVudCB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NJZihub2RlOiBJZk5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgbG0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlcjtcclxuXHJcbiAgICAgICAgbGV0IGNvbmRpdGlvblR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuY29uZGl0aW9uKTtcclxuXHJcbiAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZS5jb25kaXRpb24sIGNvbmRpdGlvblR5cGU/LnR5cGUpO1xyXG4gICAgICAgIGlmIChjb25kaXRpb25UeXBlICE9IG51bGwgJiYgY29uZGl0aW9uVHlwZS50eXBlICE9IGJvb2xlYW5QcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFdlcnQgZGVzIFRlcm1zIGluIEtsYW1tZXJuIGhpbnRlciAnaWYnIG11c3MgZGVuIERhdGVudHlwIGJvb2xlYW4gYmVzaXR6ZW4uXCIsIG5vZGUuY29uZGl0aW9uLnBvc2l0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBiZWdpbkVsc2UgPSBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmRmFsc2UsIG51bGwsIHRoaXMpO1xyXG5cclxuICAgICAgICBsZXQgd2l0aFJldHVyblN0YXRlbWVudElmID0gdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMobm9kZS5zdGF0ZW1lbnRzSWZUcnVlKS53aXRoUmV0dXJuU3RhdGVtZW50O1xyXG5cclxuICAgICAgICBsZXQgZW5kT2ZJZjogbnVtYmVyO1xyXG4gICAgICAgIGlmIChub2RlLnN0YXRlbWVudHNJZkZhbHNlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgZW5kT2ZJZiA9IGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wQWx3YXlzLCBudWxsLCB0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSwgYmVnaW5FbHNlKTtcclxuXHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnRFbHNlOiBib29sZWFuO1xyXG4gICAgICAgIGlmIChub2RlLnN0YXRlbWVudHNJZkZhbHNlID09IG51bGwgfHwgbm9kZS5zdGF0ZW1lbnRzSWZGYWxzZS5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB3aXRoUmV0dXJuU3RhdGVtZW50RWxzZSA9IGZhbHNlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHdpdGhSZXR1cm5TdGF0ZW1lbnRFbHNlID0gdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMobm9kZS5zdGF0ZW1lbnRzSWZGYWxzZSkud2l0aFJldHVyblN0YXRlbWVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlbmRPZklmICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxLCBlbmRPZklmKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IG51bGwsIGlzQXNzaWduYWJsZTogZmFsc2UsIHdpdGhSZXR1cm5TdGF0ZW1lbnQ6IHdpdGhSZXR1cm5TdGF0ZW1lbnRJZiAmJiB3aXRoUmV0dXJuU3RhdGVtZW50RWxzZSB9O1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgcHJvY2Vzc0Zvcihub2RlOiBGb3JOb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IGxtID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXI7XHJcblxyXG4gICAgICAgIHRoaXMucHVzaE5ld1N5bWJvbFRhYmxlKGZhbHNlLCBub2RlLnNjb3BlRnJvbSwgbm9kZS5zY29wZVRvKTtcclxuXHJcbiAgICAgICAgdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMobm9kZS5zdGF0ZW1lbnRzQmVmb3JlKTtcclxuXHJcbiAgICAgICAgbGV0IGxhYmVsQmVmb3JlQ29uZGl0aW9uID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuXHJcbiAgICAgICAgbGV0IGNvbmRpdGlvblR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuY29uZGl0aW9uKTtcclxuXHJcbiAgICAgICAgaWYgKGNvbmRpdGlvblR5cGUgIT0gbnVsbCAmJiBjb25kaXRpb25UeXBlLnR5cGUgIT0gYm9vbGVhblByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZS5jb25kaXRpb24pO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBXZXJ0IGRlciBCZWRpbmd1bmcgbXVzcyBkZW4gRGF0ZW50eXAgYm9vbGVhbiBiZXNpdHplbi5cIiwgbm9kZS5jb25kaXRpb24ucG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGxhYmVsQWZ0ZXJGb3JMb29wID0gbG0uaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBJZkZhbHNlLCBudWxsLCB0aGlzKTtcclxuXHJcbiAgICAgICAgdGhpcy5vcGVuQnJlYWtTY29wZSgpO1xyXG4gICAgICAgIHRoaXMub3BlbkNvbnRpbnVlU2NvcGUoKTtcclxuXHJcbiAgICAgICAgbGV0IHN0YXRlbWVudHMgPSB0aGlzLmdlbmVyYXRlU3RhdGVtZW50cyhub2RlLnN0YXRlbWVudHMpO1xyXG4gICAgICAgIGxldCB3aXRoUmV0dXJuU3RhdGVtZW50ID0gc3RhdGVtZW50cy53aXRoUmV0dXJuU3RhdGVtZW50O1xyXG5cclxuICAgICAgICBsZXQgY29udGludWVMYWJlbEluZGV4ID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuICAgICAgICB0aGlzLmNsb3NlQ29udGludWVTY29wZShjb250aW51ZUxhYmVsSW5kZXgsIGxtKTtcclxuICAgICAgICB0aGlzLmdlbmVyYXRlU3RhdGVtZW50cyhub2RlLnN0YXRlbWVudHNBZnRlcik7XHJcblxyXG4gICAgICAgIGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wQWx3YXlzLCBzdGF0ZW1lbnRzLmVuZFBvc2l0aW9uLCB0aGlzLCBsYWJlbEJlZm9yZUNvbmRpdGlvbik7XHJcblxyXG4gICAgICAgIGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSwgbGFiZWxBZnRlckZvckxvb3ApO1xyXG5cclxuICAgICAgICB0aGlzLmNsb3NlQnJlYWtTY29wZShsYWJlbEFmdGVyRm9yTG9vcCwgbG0pO1xyXG5cclxuICAgICAgICB0aGlzLnBvcFN5bWJvbFRhYmxlKCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IG51bGwsIGlzQXNzaWduYWJsZTogZmFsc2UsIHdpdGhSZXR1cm5TdGF0ZW1lbnQ6IHdpdGhSZXR1cm5TdGF0ZW1lbnQgfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc0Zvckxvb3BPdmVyQ29sbGVjdGlvbihub2RlOiBGb3JOb2RlT3ZlckNvbGxlY2lvbik6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBsbSA9IHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyO1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZShmYWxzZSwgbm9kZS5zY29wZUZyb20sIG5vZGUuc2NvcGVUbyk7XHJcblxyXG4gICAgICAgIC8vIHJlc2VydmUgcG9zaXRpb24gb24gc3RhY2sgZm9yIGNvbGxlY3Rpb25cclxuICAgICAgICBsZXQgc3RhY2tQb3NGb3JDb2xsZWN0aW9uID0gdGhpcy5uZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3MrKztcclxuXHJcbiAgICAgICAgLy8gYXNzaWduIHZhbHVlIG9mIGNvbGxlY3Rpb24gdGVybSB0byBjb2xsZWN0aW9uXHJcbiAgICAgICAgbGV0IGN0ID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLmNvbGxlY3Rpb24pO1xyXG4gICAgICAgIGlmIChjdCA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgbGV0IGNvbGxlY3Rpb25UeXBlID0gY3QudHlwZTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wb3BBbmRTdG9yZUludG9WYXJpYWJsZSxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUuY29sbGVjdGlvbi5wb3NpdGlvbixcclxuICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiBzdGFja1Bvc0ZvckNvbGxlY3Rpb24sXHJcbiAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2VcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBsZXQgY29sbGVjdGlvbkVsZW1lbnRUeXBlOiBUeXBlO1xyXG5cclxuICAgICAgICBsZXQga2luZDogXCJhcnJheVwiIHwgXCJpbnRlcm5hbExpc3RcIiB8IFwiZ3JvdXBcIiB8IFwidXNlckRlZmluZWRJdGVyYWJsZVwiID0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKGNvbGxlY3Rpb25UeXBlIGluc3RhbmNlb2YgQXJyYXlUeXBlKSB7XHJcbiAgICAgICAgICAgIGNvbGxlY3Rpb25FbGVtZW50VHlwZSA9IGNvbGxlY3Rpb25UeXBlLmFycmF5T2ZUeXBlO1xyXG4gICAgICAgICAgICBraW5kID0gXCJhcnJheVwiO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoY29sbGVjdGlvblR5cGUgaW5zdGFuY2VvZiBLbGFzcyAmJiBjb2xsZWN0aW9uVHlwZS5nZXRJbXBsZW1lbnRlZEludGVyZmFjZShcIkl0ZXJhYmxlXCIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKGNvbGxlY3Rpb25UeXBlLm1vZHVsZS5pc1N5c3RlbU1vZHVsZSkge1xyXG4gICAgICAgICAgICAgICAga2luZCA9IFwiaW50ZXJuYWxMaXN0XCI7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBraW5kID0gXCJ1c2VyRGVmaW5lZEl0ZXJhYmxlXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IGl0ZXJhYmxlSW50ZXJmYWNlID0gY29sbGVjdGlvblR5cGUuZ2V0SW1wbGVtZW50ZWRJbnRlcmZhY2UoXCJJdGVyYWJsZVwiKTtcclxuICAgICAgICAgICAgaWYgKGNvbGxlY3Rpb25UeXBlLnR5cGVWYXJpYWJsZXMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25FbGVtZW50VHlwZSA9IG9iamVjdFR5cGU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uRWxlbWVudFR5cGUgPSBjb2xsZWN0aW9uVHlwZS50eXBlVmFyaWFibGVzWzBdLnR5cGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGNvbGxlY3Rpb25UeXBlIGluc3RhbmNlb2YgS2xhc3MgJiYgY29sbGVjdGlvblR5cGUuaWRlbnRpZmllciA9PSBcIkdyb3VwXCIpIHtcclxuICAgICAgICAgICAga2luZCA9IFwiZ3JvdXBcIjtcclxuICAgICAgICAgICAgY29sbGVjdGlvbkVsZW1lbnRUeXBlID0gdGhpcy5tb2R1bGVTdG9yZS5nZXRUeXBlKFwiU2hhcGVcIikudHlwZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiTWl0IGRlciB2ZXJlaW5mYWNodGVuIGZvci1TY2hsZWlmZSAoZm9yIGlkZW50aWZpZXIgOiBjb2xsZWN0aW9uT3JBcnJheSkga2FubiBtYW4gbnVyIMO8YmVyIEFycmF5cyBvZGVyIEtsYXNzZW4sIGRpZSBkYXMgSW50ZXJmYWNlIEl0ZXJhYmxlIGltcGxlbWVudGllcmVuLCBpdGVyaWVyZW4uXCIsIG5vZGUuY29sbGVjdGlvbi5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHZhcmlhYmxlVHlwZSA9IG5vZGUudmFyaWFibGVUeXBlLnJlc29sdmVkVHlwZTtcclxuICAgICAgICBpZiAodmFyaWFibGVUeXBlID09IG51bGwpIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICBsZXQgbm9DYXN0aW5nTmVlZGVkID0gdmFyaWFibGVUeXBlID09IHZhclR5cGU7XHJcbiAgICAgICAgaWYgKG5vQ2FzdGluZ05lZWRlZCkge1xyXG4gICAgICAgICAgICB2YXJpYWJsZVR5cGUgPSBjb2xsZWN0aW9uRWxlbWVudFR5cGU7XHJcbiAgICAgICAgICAgIG5vZGUudmFyaWFibGVUeXBlLnJlc29sdmVkVHlwZSA9IGNvbGxlY3Rpb25FbGVtZW50VHlwZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICghY29sbGVjdGlvbkVsZW1lbnRUeXBlLmNhbkNhc3RUbyh2YXJpYWJsZVR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBFbGVtZW50VHlwIFwiICsgY29sbGVjdGlvbkVsZW1lbnRUeXBlLmlkZW50aWZpZXIgKyBcIiBkZXIgQ29sbGVjdGlvbiBrYW5uIG5pY2h0IGluIGRlbiBUeXAgXCIgKyB2YXJpYWJsZVR5cGUuaWRlbnRpZmllciArIFwiIGRlciBJdGVyYXRpb25zdmFyaWFibGUgXCIgKyBub2RlLnZhcmlhYmxlSWRlbnRpZmllciArIFwiIGtvbnZlcnRpZXJ0IHdlcmRlbi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5sb2NhbFZhcmlhYmxlRGVjbGFyYXRpb24oe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uLFxyXG4gICAgICAgICAgICBpZGVudGlmaWVyOiBub2RlLnZhcmlhYmxlSWRlbnRpZmllcixcclxuICAgICAgICAgICAgaW5pdGlhbGl6YXRpb246IG51bGwsXHJcbiAgICAgICAgICAgIGlzRmluYWw6IGZhbHNlLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS52YXJpYWJsZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICB2YXJpYWJsZVR5cGU6IG5vZGUudmFyaWFibGVUeXBlXHJcbiAgICAgICAgfSwgdHJ1ZSlcclxuXHJcbiAgICAgICAgbGV0IHZhcmlhYmxlU3RhY2tQb3MgPSB0aGlzLm5leHRGcmVlUmVsYXRpdmVTdGFja1BvcyAtIDE7XHJcbiAgICAgICAgbGV0IHN0YWNrUG9zT2ZDb3VudGVyVmFyaWFibGVPckl0ZXJhdG9yID0gdGhpcy5uZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3MrKztcclxuXHJcbiAgICAgICAgaWYgKGtpbmQgPT0gXCJhcnJheVwiIHx8IGtpbmQgPT0gXCJpbnRlcm5hbExpc3RcIiB8fCBraW5kID09IFwiZ3JvdXBcIikge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFt7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuZXh0ZW5kZWRGb3JMb29wSW5pdCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0YWNrUG9zT2ZDb2xsZWN0aW9uOiBzdGFja1Bvc0ZvckNvbGxlY3Rpb24sXHJcbiAgICAgICAgICAgICAgICBzdGFja1Bvc09mRWxlbWVudDogdmFyaWFibGVTdGFja1BvcyxcclxuICAgICAgICAgICAgICAgIHR5cGVPZkVsZW1lbnQ6IHZhcmlhYmxlVHlwZSxcclxuICAgICAgICAgICAgICAgIHN0YWNrUG9zT2ZDb3VudGVyOiBzdGFja1Bvc09mQ291bnRlclZhcmlhYmxlT3JJdGVyYXRvclxyXG4gICAgICAgICAgICB9XSwgdHJ1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gZ2V0IEl0ZXJhdG9yIGZyb20gY29sbGVjdGlvblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogc3RhY2tQb3NPZkNvdW50ZXJWYXJpYWJsZU9ySXRlcmF0b3IsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogc3RhY2tQb3NGb3JDb2xsZWN0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhbGxNZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBpc1N1cGVyQ2FsbDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBjb2xsZWN0aW9uVHlwZS5nZXRNZXRob2QoXCJpdGVyYXRvclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXSkpLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLTFcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmFzc2lnbm1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlYXZlVmFsdWVPblN0YWNrOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfV0sIHRydWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGxhYmVsQmVmb3JlQ29uZGl0aW9uID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuICAgICAgICBsZXQgbGFiZWxBZnRlckZvckxvb3A6IG51bWJlcjtcclxuICAgICAgICBsZXQgbGFzdFN0YXRlbWVudEJlZm9yZUNhc3Rpbmc6IFN0YXRlbWVudDtcclxuXHJcbiAgICAgICAgaWYgKGtpbmQgPT0gXCJhcnJheVwiIHx8IGtpbmQgPT0gXCJpbnRlcm5hbExpc3RcIiB8fCBraW5kID09IFwiZ3JvdXBcIikge1xyXG4gICAgICAgICAgICBsZXQganVtcE5vZGU6IEV4dGVuZGVkRm9yTG9vcENoZWNrQ291bnRlckFuZEdldEVsZW1lbnQgPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuZXh0ZW5kZWRGb3JMb29wQ2hlY2tDb3VudGVyQW5kR2V0RWxlbWVudCxcclxuICAgICAgICAgICAgICAgIGtpbmQ6IGtpbmQsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS52YXJpYWJsZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tQb3NPZkNvbGxlY3Rpb246IHN0YWNrUG9zRm9yQ29sbGVjdGlvbixcclxuICAgICAgICAgICAgICAgIHN0YWNrUG9zT2ZFbGVtZW50OiB2YXJpYWJsZVN0YWNrUG9zLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tQb3NPZkNvdW50ZXI6IHN0YWNrUG9zT2ZDb3VudGVyVmFyaWFibGVPckl0ZXJhdG9yLFxyXG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb246IDAgLy8gZ2V0cyBmaWxsZWQgaW4gbGF0ZXIsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGxhc3RTdGF0ZW1lbnRCZWZvcmVDYXN0aW5nID0ganVtcE5vZGU7XHJcbiAgICAgICAgICAgIGxhYmVsQWZ0ZXJGb3JMb29wID0gbG0ucmVnaXN0ZXJKdW1wTm9kZShqdW1wTm9kZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFxyXG4gICAgICAgICAgICAgICAganVtcE5vZGVcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gY2FsbCBjb2xsZWN0aW9uLmhhc05leHQoKVxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnZhcmlhYmxlUG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiBzdGFja1Bvc0ZvckNvbGxlY3Rpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzU3VwZXJDYWxsOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IGNvbGxlY3Rpb25UeXBlLmdldE1ldGhvZChcImhhc05leHRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pKSxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0xXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBdKTtcclxuICAgICAgICAgICAgbGFiZWxBZnRlckZvckxvb3AgPSBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmRmFsc2UsIG51bGwsIHRoaXMpO1xyXG4gICAgICAgICAgICAvLyBjYWxsIGNvbGxlY3Rpb24ubmV4dCgpIGFuZCBhc3NpZ24gdG8gbG9vcCB2YXJpYWJsZVxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogdmFyaWFibGVTdGFja1BvcyxcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiBzdGFja1Bvc0ZvckNvbGxlY3Rpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzU3VwZXJDYWxsOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IGNvbGxlY3Rpb25UeXBlLmdldE1ldGhvZChcIm5leHRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pKSxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0xXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5hc3NpZ25tZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBsZWF2ZVZhbHVlT25TdGFjazogZmFsc2VcclxuICAgICAgICAgICAgICAgIH1dKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghbm9DYXN0aW5nTmVlZGVkKSB7XHJcbiAgICAgICAgICAgIGxldCBvbGRTdGF0ZW1lbnRDb3VudCA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGg7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hMb2NhbFZhcmlhYmxlVG9TdGFjayxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiB2YXJpYWJsZVN0YWNrUG9zLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKGNvbGxlY3Rpb25FbGVtZW50VHlwZSwgdmFyaWFibGVUeXBlKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPCBvbGRTdGF0ZW1lbnRDb3VudCArIDIpIHtcclxuICAgICAgICAgICAgICAgIC8vIGNhc3RpbmcgbmVlZGVkIG5vIHN0YXRlbWVudCwgc28gZGVsZXRlIHB1c2hMb2NhbFZhcmlhYmxldG9TdGFjay1TdGF0ZW1lbnRcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5wb3AoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wb3BBbmRTdG9yZUludG9WYXJpYWJsZSxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja3Bvc09mVmFyaWFibGU6IHZhcmlhYmxlU3RhY2tQb3MsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGxhc3RTdGF0ZW1lbnRCZWZvcmVDYXN0aW5nLnN0ZXBGaW5pc2hlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm9wZW5CcmVha1Njb3BlKCk7XHJcbiAgICAgICAgdGhpcy5vcGVuQ29udGludWVTY29wZSgpO1xyXG5cclxuICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKG5vZGUuc3RhdGVtZW50cyk7XHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzLndpdGhSZXR1cm5TdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgIGxldCBjb250aW51ZUxhYmVsSW5kZXggPSBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEpO1xyXG4gICAgICAgIHRoaXMuY2xvc2VDb250aW51ZVNjb3BlKGNvbnRpbnVlTGFiZWxJbmRleCwgbG0pO1xyXG5cclxuICAgICAgICBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcEFsd2F5cywgc3RhdGVtZW50cy5lbmRQb3NpdGlvbiwgdGhpcywgbGFiZWxCZWZvcmVDb25kaXRpb24pO1xyXG5cclxuICAgICAgICBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEsIGxhYmVsQWZ0ZXJGb3JMb29wKTtcclxuXHJcbiAgICAgICAgdGhpcy5jbG9zZUJyZWFrU2NvcGUobGFiZWxBZnRlckZvckxvb3AsIGxtKTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZSgpO1xyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiBudWxsLCBpc0Fzc2lnbmFibGU6IGZhbHNlLCB3aXRoUmV0dXJuU3RhdGVtZW50OiB3aXRoUmV0dXJuU3RhdGVtZW50IH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NXaGlsZShub2RlOiBXaGlsZU5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgbG0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlcjtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIG5vZGUuc2NvcGVGcm9tLCBub2RlLnNjb3BlVG8pO1xyXG5cclxuICAgICAgICBsZXQgY29uZGl0aW9uQmVnaW5MYWJlbCA9IGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSk7XHJcblxyXG4gICAgICAgIGxldCBjb25kaXRpb25UeXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLmNvbmRpdGlvbik7XHJcblxyXG4gICAgICAgIGlmIChjb25kaXRpb25UeXBlICE9IG51bGwgJiYgY29uZGl0aW9uVHlwZS50eXBlICE9IGJvb2xlYW5QcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlY2tJZkFzc2lnbm1lbnRJbnN0ZWRPZkVxdWFsKG5vZGUuY29uZGl0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgV2VydCBkZXMgVGVybXMgaW4gS2xhbW1lcm4gaGludGVyICd3aGlsZScgbXVzcyBkZW4gRGF0ZW50eXAgYm9vbGVhbiBiZXNpdHplbi5cIiwgbm9kZS5jb25kaXRpb24ucG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gbm9kZS5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUuY29uZGl0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24gPSBub2RlLmNvbmRpdGlvbi5wb3NpdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBhZnRlcldoaWxlU3RhdGVtZW50TGFiZWwgPSBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmRmFsc2UsIHBvc2l0aW9uLCB0aGlzKTtcclxuXHJcbiAgICAgICAgdGhpcy5vcGVuQnJlYWtTY29wZSgpO1xyXG4gICAgICAgIHRoaXMub3BlbkNvbnRpbnVlU2NvcGUoKTtcclxuXHJcbiAgICAgICAgbGV0IHBjID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aDtcclxuICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKG5vZGUuc3RhdGVtZW50cyk7XHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzLndpdGhSZXR1cm5TdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID09IHBjKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zZXJ0Tm9PcChub2RlLnNjb3BlVG8sIGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2xvc2VDb250aW51ZVNjb3BlKGNvbmRpdGlvbkJlZ2luTGFiZWwsIGxtKTtcclxuICAgICAgICBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcEFsd2F5cywgc3RhdGVtZW50cy5lbmRQb3NpdGlvbiwgdGhpcywgY29uZGl0aW9uQmVnaW5MYWJlbCk7XHJcblxyXG4gICAgICAgIGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSwgYWZ0ZXJXaGlsZVN0YXRlbWVudExhYmVsKTtcclxuXHJcbiAgICAgICAgdGhpcy5jbG9zZUJyZWFrU2NvcGUoYWZ0ZXJXaGlsZVN0YXRlbWVudExhYmVsLCBsbSk7XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgd2l0aFJldHVyblN0YXRlbWVudDogd2l0aFJldHVyblN0YXRlbWVudCB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpbnNlcnROb09wKHBvc2l0aW9uOiBUZXh0UG9zaXRpb24sIHN0ZXBGaW5pc2hlZDogYm9vbGVhbikge1xyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubm9PcCxcclxuICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHN0ZXBGaW5pc2hlZFxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc0RvKG5vZGU6IERvV2hpbGVOb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IGxtID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXI7XHJcblxyXG4gICAgICAgIHRoaXMucHVzaE5ld1N5bWJvbFRhYmxlKGZhbHNlLCBub2RlLnNjb3BlRnJvbSwgbm9kZS5zY29wZVRvKTtcclxuXHJcbiAgICAgICAgbGV0IHN0YXRlbWVudHNCZWdpbkxhYmVsID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuXHJcbiAgICAgICAgdGhpcy5vcGVuQnJlYWtTY29wZSgpO1xyXG4gICAgICAgIHRoaXMub3BlbkNvbnRpbnVlU2NvcGUoKTtcclxuXHJcbiAgICAgICAgbGV0IHBjID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aDtcclxuICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKG5vZGUuc3RhdGVtZW50cyk7XHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzLndpdGhSZXR1cm5TdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID09IHBjKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zZXJ0Tm9PcChub2RlLnNjb3BlVG8sIGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBjb250aW51ZUxhYmVsSW5kZXggPSBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEpO1xyXG4gICAgICAgIHRoaXMuY2xvc2VDb250aW51ZVNjb3BlKGNvbnRpbnVlTGFiZWxJbmRleCwgbG0pO1xyXG5cclxuICAgICAgICBsZXQgY29uZGl0aW9uVHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5jb25kaXRpb24pO1xyXG5cclxuICAgICAgICBpZiAoY29uZGl0aW9uVHlwZSAhPSBudWxsICYmIGNvbmRpdGlvblR5cGUudHlwZSAhPSBib29sZWFuUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICB0aGlzLmNoZWNrSWZBc3NpZ25tZW50SW5zdGVkT2ZFcXVhbChub2RlLmNvbmRpdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFdlcnQgZGVzIFRlcm1zIGluIEtsYW1tZXJuIGhpbnRlciAnd2hpbGUnIG11c3MgZGVuIERhdGVudHlwIGJvb2xlYW4gYmVzaXR6ZW4uXCIsIG5vZGUuY29uZGl0aW9uLnBvc2l0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wSWZUcnVlLCBzdGF0ZW1lbnRzLmVuZFBvc2l0aW9uLCB0aGlzLCBzdGF0ZW1lbnRzQmVnaW5MYWJlbCk7XHJcblxyXG4gICAgICAgIGxldCBlbmRMYWJlbCA9IGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSk7XHJcblxyXG4gICAgICAgIHRoaXMuY2xvc2VCcmVha1Njb3BlKGVuZExhYmVsLCBsbSk7XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgd2l0aFJldHVyblN0YXRlbWVudDogd2l0aFJldHVyblN0YXRlbWVudCB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBuZXdPYmplY3Qobm9kZTogTmV3T2JqZWN0Tm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGlmIChub2RlLmNsYXNzVHlwZSA9PSBudWxsIHx8IG5vZGUuY2xhc3NUeXBlLnJlc29sdmVkVHlwZSA9PSBudWxsKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgbGV0IHJlc29sdmVkVHlwZTogS2xhc3MgPSA8S2xhc3M+bm9kZS5jbGFzc1R5cGUucmVzb2x2ZWRUeXBlO1xyXG4gICAgICAgIGlmICghKHJlc29sdmVkVHlwZSBpbnN0YW5jZW9mIEtsYXNzKSkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihub2RlLmNsYXNzVHlwZS5pZGVudGlmaWVyICsgXCIgaXN0IGtlaW5lIEtsYXNzZSwgZGFoZXIga2FubiBkYXZvbiBtaXQgJ25ldycga2VpbiBPYmpla3QgZXJ6ZXVndCB3ZXJkZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyZXNvbHZlZFR5cGUuaXNBYnN0cmFjdCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihgJHtub2RlLmNsYXNzVHlwZS5pZGVudGlmaWVyfSBpc3QgZWluZSBhYnN0cmFrdGUgS2xhc3NlLCBkYWhlciBrYW5uIHZvbiBpaHIgbWl0ICduZXcnIGtlaW4gT2JqZWt0IGluc3RhbnppZXJ0IHdlcmRlbi4gRmFsbHMgJHtub2RlLmNsYXNzVHlwZS5pZGVudGlmaWVyfSBuaWNodC1hYnN0cmFrdGUgS2luZGtsYXNzZW4gYmVzaXR6dCwga8O2bm50ZXN0IER1IHZvbiBERU5FTiBtaXQgbmV3IE9iamVrdGUgaW5zdGFuemllcmVuLi4uYCwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy90aGlzLnB1c2hUeXBlUG9zaXRpb24obm9kZS5yaWdodEJyYWNrZXRQb3NpdGlvbiwgY2xhc3NUeXBlKTtcclxuXHJcbiAgICAgICAgaWYgKHJlc29sdmVkVHlwZS5tb2R1bGUgIT0gdGhpcy5tb2R1bGUgJiYgcmVzb2x2ZWRUeXBlLnZpc2liaWxpdHkgIT0gVmlzaWJpbGl0eS5wdWJsaWMpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgS2xhc3NlIFwiICsgcmVzb2x2ZWRUeXBlLmlkZW50aWZpZXIgKyBcIiBpc3QgaGllciBuaWNodCBzaWNodGJhci5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbmV3U3RhdGVtZW50OiBOZXdPYmplY3RTdGF0ZW1lbnQgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5uZXdPYmplY3QsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjbGFzczogcmVzb2x2ZWRUeXBlLFxyXG4gICAgICAgICAgICBzdWJzZXF1ZW50Q29uc3RydWN0b3JDYWxsOiBmYWxzZSxcclxuICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhuZXdTdGF0ZW1lbnQpO1xyXG4gICAgICAgIHRoaXMucHVzaFR5cGVQb3NpdGlvbihub2RlLnJpZ2h0QnJhY2tldFBvc2l0aW9uLCByZXNvbHZlZFR5cGUpOyAvLyB0byBlbmFibGUgY29kZSBjb21wbGV0aW9uIHdoZW4gdHlwaW5nIGEgcG9pbnQgYWZ0ZXIgdGhlIGNsb3NpbmcgYnJhY2tldFxyXG5cclxuICAgICAgICBsZXQgcGFyYW1ldGVyVHlwZXM6IFR5cGVbXSA9IFtdO1xyXG4gICAgICAgIC8vIGxldCBwYXJhbWV0ZXJTdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXVtdID0gW107XHJcbiAgICAgICAgbGV0IHBvc2l0aW9uc0FmdGVyUGFyYW1ldGVyU3RhdGVtZW50czogbnVtYmVyW10gPSBbXVxyXG4gICAgICAgIGxldCBhbGxTdGF0ZW1lbnRzID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzO1xyXG5cclxuICAgICAgICBpZiAobm9kZS5jb25zdHJ1Y3Rvck9wZXJhbmRzPy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIC8vIGZvciAobGV0IHAgb2Ygbm9kZS5jb25zdHJ1Y3Rvck9wZXJhbmRzKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbm9kZS5jb25zdHJ1Y3Rvck9wZXJhbmRzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcCA9IG5vZGUuY29uc3RydWN0b3JPcGVyYW5kc1tqXTtcclxuICAgICAgICAgICAgICAgIC8vIGxldCBwcm9ncmFtUG9pbnRlciA9IGFsbFN0YXRlbWVudHMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgbGV0IHR5cGVOb2RlID0gdGhpcy5wcm9jZXNzTm9kZShwKTtcclxuICAgICAgICAgICAgICAgIC8vIHBhcmFtZXRlclN0YXRlbWVudHMucHVzaChhbGxTdGF0ZW1lbnRzLnNwbGljZShwcm9ncmFtUG9pbnRlciwgYWxsU3RhdGVtZW50cy5sZW5ndGggLSBwcm9ncmFtUG9pbnRlcikpO1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb25zQWZ0ZXJQYXJhbWV0ZXJTdGF0ZW1lbnRzLnB1c2goYWxsU3RhdGVtZW50cy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVOb2RlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJUeXBlcy5wdXNoKHZvaWRQcmltaXRpdmVUeXBlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyVHlwZXMucHVzaCh0eXBlTm9kZS50eXBlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHVwVG9WaXNpYmlsaXR5ID0gZ2V0VmlzaWJpbGl0eVVwVG8ocmVzb2x2ZWRUeXBlLCB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQpO1xyXG5cclxuICAgICAgICAvLyBsZXQgbWV0aG9kcyA9IHJlc29sdmVkVHlwZS5nZXRNZXRob2RzVGhhdEZpdFdpdGhDYXN0aW5nKHJlc29sdmVkVHlwZS5pZGVudGlmaWVyLFxyXG4gICAgICAgIC8vICAgICBwYXJhbWV0ZXJUeXBlcywgdHJ1ZSwgdXBUb1Zpc2liaWxpdHkpO1xyXG5cclxuICAgICAgICBsZXQgbWV0aG9kcyA9IHJlc29sdmVkVHlwZS5nZXRDb25zdHJ1Y3RvcihwYXJhbWV0ZXJUeXBlcywgdXBUb1Zpc2liaWxpdHkpO1xyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZS5wdXNoTWV0aG9kQ2FsbFBvc2l0aW9uKG5vZGUucG9zaXRpb24sIG5vZGUuY29tbWFQb3NpdGlvbnMsIHJlc29sdmVkVHlwZS5nZXRNZXRob2RzKFZpc2liaWxpdHkucHVibGljLCByZXNvbHZlZFR5cGUuaWRlbnRpZmllciksIG5vZGUucmlnaHRCcmFja2V0UG9zaXRpb24pO1xyXG5cclxuICAgICAgICAvLyBpZiB0aGVyZSdzIG5vIHBhcmFtZXRlcmxlc3MgY29uc3RydWN0b3IgdGhlbiByZXR1cm4gd2l0aG91dCBlcnJvcjpcclxuICAgICAgICBpZiAocGFyYW1ldGVyVHlwZXMubGVuZ3RoID4gMCB8fCByZXNvbHZlZFR5cGUuaGFzQ29uc3RydWN0b3IoKSkge1xyXG5cclxuICAgICAgICAgICAgaWYgKG1ldGhvZHMuZXJyb3IgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IobWV0aG9kcy5lcnJvciwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiByZXNvbHZlZFR5cGUsIGlzQXNzaWduYWJsZTogZmFsc2UgfTsgLy8gdHJ5IHRvIGNvbnRpbnVlLi4uXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBtZXRob2RzLm1ldGhvZExpc3RbMF07XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFVzYWdlUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgbWV0aG9kKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzdGF0aWNDbGFzc0NvbnRleHQgPSBudWxsO1xyXG4gICAgICAgICAgICBsZXQgY2xhc3NDb250ZXh0ID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0O1xyXG4gICAgICAgICAgICBpZiAoY2xhc3NDb250ZXh0ICE9IG51bGwgJiYgY2xhc3NDb250ZXh0IGluc3RhbmNlb2YgS2xhc3MpIHtcclxuICAgICAgICAgICAgICAgIHN0YXRpY0NsYXNzQ29udGV4dCA9IGNsYXNzQ29udGV4dC5zdGF0aWNDbGFzcztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG1ldGhvZC52aXNpYmlsaXR5ID09IFZpc2liaWxpdHkucHJpdmF0ZSAmJiByZXNvbHZlZFR5cGUgIT0gY2xhc3NDb250ZXh0ICYmIHJlc29sdmVkVHlwZSAhPSBzdGF0aWNDbGFzc0NvbnRleHQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBvayA9IChyZXNvbHZlZFR5cGUgPT0gY2xhc3NDb250ZXh0IHx8IHJlc29sdmVkVHlwZSAhPSBzdGF0aWNDbGFzc0NvbnRleHQgfHwgKGNsYXNzQ29udGV4dCBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzICYmIHJlc29sdmVkVHlwZSA9PSBjbGFzc0NvbnRleHQuS2xhc3MpKTtcclxuICAgICAgICAgICAgICAgIGlmICghb2spIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBLb25zdHJ1a3Rvcm1ldGhvZGUgaXN0IHByaXZhdGUgdW5kIGRhaGVyIGhpZXIgbmljaHQgc2ljaHRiYXIuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZGVzdFR5cGU6IFR5cGUgPSBudWxsO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcmFtZXRlclR5cGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA8IG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpKSB7ICAvLyBwb3NzaWJsZSBlbGxpcHNpcyFcclxuICAgICAgICAgICAgICAgICAgICBkZXN0VHlwZSA9IG1ldGhvZC5nZXRQYXJhbWV0ZXJUeXBlKGkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpID09IG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpIC0gMSAmJiBtZXRob2QuaGFzRWxsaXBzaXMoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXN0VHlwZSA9ICg8QXJyYXlUeXBlPmRlc3RUeXBlKS5hcnJheU9mVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHNyY1R5cGUgPSBwYXJhbWV0ZXJUeXBlc1tpXTtcclxuICAgICAgICAgICAgICAgIC8vIGZvciAobGV0IHN0IG9mIHBhcmFtZXRlclN0YXRlbWVudHNbaV0pIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMucHVzaChzdCk7XHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgICAgICBsZXQgcHJvZ3JhbVBvc2l0aW9uID0gYWxsU3RhdGVtZW50cy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZW5zdXJlQXV0b21hdGljQ2FzdGluZyhzcmNUeXBlLCBkZXN0VHlwZSwgbm9kZS5jb25zdHJ1Y3Rvck9wZXJhbmRzW2ldLnBvc2l0aW9uLCBub2RlLmNvbnN0cnVjdG9yT3BlcmFuZHNbaV0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgV2VydCB2b20gRGF0ZW50eXAgXCIgKyBzcmNUeXBlLmlkZW50aWZpZXIgKyBcIiBrYW5uIG5pY2h0IGFscyBQYXJhbWV0ZXIgKERhdGVudHlwIFwiICsgZGVzdFR5cGUuaWRlbnRpZmllciArIFwiKSB2ZXJ3ZW5kZXQgd2VyZGVuLlwiLCBub2RlLmNvbnN0cnVjdG9yT3BlcmFuZHNbaV0ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhbGxTdGF0ZW1lbnRzLmxlbmd0aCA+IHByb2dyYW1Qb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBjYXN0aW5nU3RhdGVtZW50cyA9IGFsbFN0YXRlbWVudHMuc3BsaWNlKHByb2dyYW1Qb3NpdGlvbiwgYWxsU3RhdGVtZW50cy5sZW5ndGggLSBwcm9ncmFtUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGFsbFN0YXRlbWVudHMuc3BsaWNlKHBvc2l0aW9uc0FmdGVyUGFyYW1ldGVyU3RhdGVtZW50c1tpXSwgMCwgLi4uY2FzdGluZ1N0YXRlbWVudHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLmNvcnJlY3RQb3NpdGlvbnNBZnRlckluc2VydChwb3NpdGlvbnNBZnRlclBhcmFtZXRlclN0YXRlbWVudHNbaV0sIGNhc3RpbmdTdGF0ZW1lbnRzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgc3RhY2tmcmFtZURlbHRhID0gMDtcclxuICAgICAgICAgICAgaWYgKG1ldGhvZC5oYXNFbGxpcHNpcygpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCA9IHBhcmFtZXRlclR5cGVzLmxlbmd0aCAtIG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpICsgMTsgLy8gbGFzdCBwYXJhbWV0ZXIgYW5kIHN1YnNlcXVlbnQgb25lc1xyXG4gICAgICAgICAgICAgICAgc3RhY2tmcmFtZURlbHRhID0gLSAoZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCAtIDEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLm1ha2VFbGxpcHNpc0FycmF5LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLmNvbnN0cnVjdG9yT3BlcmFuZHNbbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxXS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJDb3VudDogZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCxcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGFycmF5VHlwZTogbWV0aG9kLmdldFBhcmFtZXRlcihtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSAtIDEpLnR5cGVcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIGlzU3VwZXJDYWxsOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogcmVzb2x2ZWRUeXBlLmdldFBvc3RDb25zdHJ1Y3RvckNhbGxiYWNrcygpID09IG51bGwsXHJcbiAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0ocGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSArIHN0YWNrZnJhbWVEZWx0YSkgLy8gdGhpcy1vYmplY3QgZm9sbG93ZWQgYnkgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgICB9LCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIG5ld1N0YXRlbWVudC5zdWJzZXF1ZW50Q29uc3RydWN0b3JDYWxsID0gdHJ1ZTtcclxuICAgICAgICAgICAgbmV3U3RhdGVtZW50LnN0ZXBGaW5pc2hlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyZXNvbHZlZFR5cGUuZ2V0UG9zdENvbnN0cnVjdG9yQ2FsbGJhY2tzKCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wcm9jZXNzUG9zdENvbnN0cnVjdG9yQ2FsbGJhY2tzLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWVcclxuICAgICAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiByZXNvbHZlZFR5cGUsIGlzQXNzaWduYWJsZTogZmFsc2UgfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVzaEF0dHJpYnV0ZShub2RlOiBTZWxlY3RBcnJpYnV0ZU5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBpZiAobm9kZS5vYmplY3QgPT0gbnVsbCB8fCBub2RlLmlkZW50aWZpZXIgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGxldCBvdCA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5vYmplY3QpO1xyXG4gICAgICAgIGlmIChvdCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKCdMaW5rcyB2b20gUHVua3Qgc3RlaHQga2VpbiBPYmpla3QuJywgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCEob3QudHlwZSBpbnN0YW5jZW9mIEtsYXNzIHx8IG90LnR5cGUgaW5zdGFuY2VvZiBTdGF0aWNDbGFzcyB8fCBvdC50eXBlIGluc3RhbmNlb2YgQXJyYXlUeXBlKSkge1xyXG4gICAgICAgICAgICBpZiAob3QudHlwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcignRGVyIEF1c2RydWNrIGxpbmtzIHZvbSBQdW5rdCBoYXQga2VpbiBBdHRyaWJ1dCAnICsgbm9kZS5pZGVudGlmaWVyICsgXCIuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoJ0xpbmtzIHZvbSBQdW5rdCBzdGVodCBlaW4gQXVzZHJ1Y2sgdm9tIERhdGVudHlwICcgKyBvdC50eXBlLmlkZW50aWZpZXIgKyBcIi4gRGllc2VyIGhhdCBrZWluIEF0dHJpYnV0IFwiICsgbm9kZS5pZGVudGlmaWVyICsgXCIuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG9iamVjdFR5cGU6IEtsYXNzIHwgU3RhdGljQ2xhc3MgfCBBcnJheVR5cGUgPSBvdC50eXBlO1xyXG5cclxuICAgICAgICBpZiAob2JqZWN0VHlwZSBpbnN0YW5jZW9mIEtsYXNzKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgdmlzaWJpbGl0eVVwVG8gPSBnZXRWaXNpYmlsaXR5VXBUbyhvYmplY3RUeXBlLCB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZVdpdGhFcnJvciA9IG9iamVjdFR5cGUuZ2V0QXR0cmlidXRlKG5vZGUuaWRlbnRpZmllciwgdmlzaWJpbGl0eVVwVG8pO1xyXG5cclxuICAgICAgICAgICAgbGV0IHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvcjogeyBhdHRyaWJ1dGU6IEF0dHJpYnV0ZSwgZXJyb3I6IHN0cmluZywgZm91bmRCdXRJbnZpc2libGU6IGJvb2xlYW4sIHN0YXRpY0NsYXNzOiBTdGF0aWNDbGFzcyB9XHJcbiAgICAgICAgICAgICAgICA9IG51bGw7XHJcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvciA9IG9iamVjdFR5cGUuc3RhdGljQ2xhc3MuZ2V0QXR0cmlidXRlKG5vZGUuaWRlbnRpZmllciwgdmlzaWJpbGl0eVVwVG8pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZSA9PSBudWxsICYmIHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZVdpdGhFcnJvci5mb3VuZEJ1dEludmlzaWJsZSB8fCAhc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmZvdW5kQnV0SW52aXNpYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoYXR0cmlidXRlV2l0aEVycm9yLmVycm9yLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3Ioc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmVycm9yLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogb2JqZWN0VHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYXR0cmlidXRlOiBBdHRyaWJ1dGU7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlSW5kZXg6IGF0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUuaW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUlkZW50aWZpZXI6IGF0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlVGhpc09iamVjdDogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGUgPSBhdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5kZWNyZWFzZVN0YWNrcG9pbnRlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcENvdW50OiAxXHJcbiAgICAgICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaFN0YXRpY0F0dHJpYnV0ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGtsYXNzOiAoPEtsYXNzPm9iamVjdFR5cGUpLnN0YXRpY0NsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrbGFzczogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLnN0YXRpY0NsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJbmRleDogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZS5pbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlSWRlbnRpZmllcjogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZS5pZGVudGlmaWVyXHJcbiAgICAgICAgICAgICAgICAgICAgfV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZSA9IHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihub2RlLnBvc2l0aW9uLCBhdHRyaWJ1dGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogYXR0cmlidXRlLnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiAhYXR0cmlidXRlLmlzRmluYWxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IGVsc2UgaWYgKG9iamVjdFR5cGUgaW5zdGFuY2VvZiBTdGF0aWNDbGFzcykge1xyXG4gICAgICAgICAgICAvLyBTdGF0aWMgY2xhc3NcclxuICAgICAgICAgICAgaWYgKG9iamVjdFR5cGUuS2xhc3MgaW5zdGFuY2VvZiBFbnVtKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUxhc3RTdGF0ZW1lbnQoKTsgLy8gcmVtb3ZlIHB1c2ggc3RhdGljIGVudW0gY2xhc3MgdG8gc3RhY2tcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgZW51bUluZm8gPSBvYmplY3RUeXBlLktsYXNzLmVudW1JbmZvTGlzdC5maW5kKGVpID0+IGVpLmlkZW50aWZpZXIgPT0gbm9kZS5pZGVudGlmaWVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZW51bUluZm8gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIGVudW0tS2xhc3NlIFwiICsgb2JqZWN0VHlwZS5pZGVudGlmaWVyICsgXCIgaGF0IGtlaW5lbiBlbnVtLVdlcnQgbWl0IGRlbSBCZXplaWNobmVyIFwiICsgbm9kZS5pZGVudGlmaWVyLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEVudW1WYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBlbnVtQ2xhc3M6IG9iamVjdFR5cGUuS2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVJZGVudGlmaWVyOiBub2RlLmlkZW50aWZpZXJcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogb2JqZWN0VHlwZS5LbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IHVwVG9WaXNpYmlsaXR5ID0gZ2V0VmlzaWJpbGl0eVVwVG8ob2JqZWN0VHlwZSwgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0KTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IgPSBvYmplY3RUeXBlLmdldEF0dHJpYnV0ZShub2RlLmlkZW50aWZpZXIsIHVwVG9WaXNpYmlsaXR5KTtcclxuICAgICAgICAgICAgICAgIGlmIChzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiAoc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZS51cGRhdGVWYWx1ZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5yZW1vdmVMYXN0U3RhdGVtZW50KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hTdGF0aWNBdHRyaWJ1dGVJbnRyaW5zaWMsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIGF0dHJpYnV0ZTogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZVxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAvLyB9IGVsc2UgXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUxhc3RTdGF0ZW1lbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaFN0YXRpY0F0dHJpYnV0ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlSW5kZXg6IHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUuaW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJZGVudGlmaWVyOiBzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrbGFzczogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLnN0YXRpY0NsYXNzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZS50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6ICFzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlLmlzRmluYWxcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5lcnJvciwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogb2JqZWN0VHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUuaWRlbnRpZmllciAhPSBcImxlbmd0aFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcignRGVyIFdlcnQgdm9tIERhdGVudHlwICcgKyBvdC50eXBlLmlkZW50aWZpZXIgKyBcIiBoYXQga2VpbiBBdHRyaWJ1dCBcIiArIG5vZGUuaWRlbnRpZmllciwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEFycmF5TGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb25cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgZWxlbWVudDogQXR0cmlidXRlID0gbmV3IEF0dHJpYnV0ZShcImxlbmd0aFwiLCBpbnRQcmltaXRpdmVUeXBlLCBudWxsLCB0cnVlLCBWaXNpYmlsaXR5LnB1YmxpYywgdHJ1ZSwgXCJMw6RuZ2UgZGVzIEFycmF5c1wiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW9kdWxlLmFkZElkZW50aWZpZXJQb3NpdGlvbihub2RlLnBvc2l0aW9uLCBlbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHB1c2hUaGlzT3JTdXBlcihub2RlOiBUaGlzTm9kZSB8IFN1cGVyTm9kZSwgaXNTdXBlcjogYm9vbGVhbik6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBjbGFzc0NvbnRleHQgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcblxyXG4gICAgICAgIGlmIChpc1N1cGVyICYmIGNsYXNzQ29udGV4dCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNsYXNzQ29udGV4dCA9IGNsYXNzQ29udGV4dC5iYXNlQ2xhc3M7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbWV0aG9kQ29udGV4dCA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLm1ldGhvZDtcclxuXHJcbiAgICAgICAgaWYgKGNsYXNzQ29udGV4dCA9PSBudWxsIHx8IG1ldGhvZENvbnRleHQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRhcyBPYmpla3QgXCIgKyAoaXNTdXBlciA/IFwic3VwZXJcIiA6IFwidGhpc1wiKSArIFwiIGV4aXN0aWVydCBudXIgaW5uZXJoYWxiIGVpbmVyIE1ldGhvZGVuZGVrbGFyYXRpb24uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogMFxyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVHlwZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIGNsYXNzQ29udGV4dCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IGNsYXNzQ29udGV4dCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgaXNTdXBlcjogaXNTdXBlciB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc3VwZXJjb25zdHJ1Y3RvckNhbGwobm9kZTogU3VwZXJjb25zdHJ1Y3RvckNhbGxOb2RlIHwgQ29uc3RydWN0b3JDYWxsTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBjbGFzc0NvbnRleHQgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcblxyXG4gICAgICAgIGxldCBpc1N1cGVyQ29uc3RydWN0b3JDYWxsOiBib29sZWFuID0gbm9kZS50eXBlID09IFRva2VuVHlwZS5zdXBlckNvbnN0cnVjdG9yQ2FsbDtcclxuXHJcbiAgICAgICAgaWYgKGlzU3VwZXJDb25zdHJ1Y3RvckNhbGwpIHtcclxuICAgICAgICAgICAgaWYgKGNsYXNzQ29udGV4dD8uYmFzZUNsYXNzID09IG51bGwgfHwgY2xhc3NDb250ZXh0LmJhc2VDbGFzcy5pZGVudGlmaWVyID09IFwiT2JqZWN0XCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIEtsYXNzZSBpc3QgbnVyIEtpbmRrbGFzc2UgZGVyIEtsYXNzZSBPYmplY3QsIGRhaGVyIGlzdCBkZXIgQXVmcnVmIGRlcyBTdXBlcmtvbnN0cnVrdG9ycyBuaWNodCBtw7ZnbGljaC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtZXRob2RDb250ZXh0ID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUubWV0aG9kO1xyXG5cclxuICAgICAgICBpZiAoY2xhc3NDb250ZXh0ID09IG51bGwgfHwgbWV0aG9kQ29udGV4dCA9PSBudWxsIHx8ICFtZXRob2RDb250ZXh0LmlzQ29uc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW4gQXVmcnVmIGRlcyBLb25zdHJ1a3RvcnMgb2RlciBkZXMgU3VwZXJrb25zdHJ1Y3RvcnMgaXN0IG51ciBpbm5lcmhhbGIgZGVzIEtvbnN0cnVrdG9ycyBlaW5lciBLbGFzc2UgbcO2Z2xpY2guXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsZXQgc3VwZXJjbGFzc1R5cGU6IEtsYXNzIHwgU3RhdGljQ2xhc3M7XHJcblxyXG4gICAgICAgIGlmIChpc1N1cGVyQ29uc3RydWN0b3JDYWxsKSB7XHJcbiAgICAgICAgICAgIHN1cGVyY2xhc3NUeXBlID0gPEtsYXNzPmNsYXNzQ29udGV4dC5iYXNlQ2xhc3M7XHJcbiAgICAgICAgICAgIGlmIChzdXBlcmNsYXNzVHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIlN0YXRpc2NoZSBNZXRob2RlbiBoYWJlbiBrZWluZSBzdXBlci1NZXRob2RlbmF1ZnJ1ZmUuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzdXBlcmNsYXNzVHlwZSA9PSBudWxsKSBzdXBlcmNsYXNzVHlwZSA9IDxLbGFzcz50aGlzLm1vZHVsZVN0b3JlLmdldFR5cGUoXCJPYmplY3RcIikudHlwZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzdXBlcmNsYXNzVHlwZSA9IDxLbGFzcz5jbGFzc0NvbnRleHQ7XHJcbiAgICAgICAgICAgIGlmIChzdXBlcmNsYXNzVHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIlN0YXRpc2NoZSBNZXRob2RlbiBoYWJlbiBrZWluZSB0aGlzLU1ldGhvZGVuYXVmcnVmZS5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBudWxsLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFB1c2ggdGhpcy1vYmplY3QgdG8gc3RhY2s6XHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBzdGFja3Bvc09mVmFyaWFibGU6IDBcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGV0IHBhcmFtZXRlclR5cGVzOiBUeXBlW10gPSBbXTtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUub3BlcmFuZHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgZXJyb3JJbk9wZXJhbmRzOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHAgb2Ygbm9kZS5vcGVyYW5kcykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHB0ID0gdGhpcy5wcm9jZXNzTm9kZShwKTtcclxuICAgICAgICAgICAgICAgIGlmIChwdCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyVHlwZXMucHVzaChwdC50eXBlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JJbk9wZXJhbmRzID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZXJyb3JJbk9wZXJhbmRzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07IC8vIHRyeSB0byBjb250aW51ZS4uLlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbWV0aG9kcyA9IHN1cGVyY2xhc3NUeXBlLmdldENvbnN0cnVjdG9yKHBhcmFtZXRlclR5cGVzLCBWaXNpYmlsaXR5LnByb3RlY3RlZCk7XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlLnB1c2hNZXRob2RDYWxsUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgbm9kZS5jb21tYVBvc2l0aW9ucywgc3VwZXJjbGFzc1R5cGUuZ2V0TWV0aG9kcyhWaXNpYmlsaXR5LnByb3RlY3RlZCwgc3VwZXJjbGFzc1R5cGUuaWRlbnRpZmllciksXHJcbiAgICAgICAgICAgIG5vZGUucmlnaHRCcmFja2V0UG9zaXRpb24pO1xyXG5cclxuICAgICAgICBpZiAobWV0aG9kcy5lcnJvciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKG1ldGhvZHMuZXJyb3IsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07IC8vIHRyeSB0byBjb250aW51ZS4uLlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZCA9IG1ldGhvZHMubWV0aG9kTGlzdFswXTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihub2RlLnBvc2l0aW9uLCBtZXRob2QpO1xyXG5cclxuICAgICAgICBsZXQgc3RhY2tmcmFtZURlbHRhID0gMDtcclxuICAgICAgICBpZiAobWV0aG9kLmhhc0VsbGlwc2lzKCkpIHtcclxuICAgICAgICAgICAgbGV0IGVsbGlwc2lzUGFyYW1ldGVyQ291bnQgPSBwYXJhbWV0ZXJUeXBlcy5sZW5ndGggLSBtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSArIDE7IC8vIGxhc3QgcGFyYW1ldGVyIGFuZCBzdWJzZXF1ZW50IG9uZXNcclxuICAgICAgICAgICAgc3RhY2tmcmFtZURlbHRhID0gLSAoZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCAtIDEpO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5tYWtlRWxsaXBzaXNBcnJheSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLm9wZXJhbmRzW21ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpIC0gMV0ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJDb3VudDogZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBhcnJheVR5cGU6IG1ldGhvZC5nZXRQYXJhbWV0ZXIobWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxKS50eXBlXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhbGxNZXRob2QsXHJcbiAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICAgICAgICBpc1N1cGVyQ2FsbDogaXNTdXBlckNvbnN0cnVjdG9yQ2FsbCxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLShwYXJhbWV0ZXJUeXBlcy5sZW5ndGggKyAxICsgc3RhY2tmcmFtZURlbHRhKSAvLyB0aGlzLW9iamVjdCBmb2xsb3dlZCBieSBwYXJhbWV0ZXJzXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLy8gUGFic3QsIDIxLjEwLjIwMjA6XHJcbiAgICAgICAgLy8gc3VwZXIgbWV0aG9kIGlzIGNvbnN0cnVjdG9yID0+IHJldHVybnMgbm90aGluZyBldmVuIGlmIG1ldGhvZC5nZXRSZXR1cm5UeXBlKCkgaXMgY2xhc3Mgb2JqZWN0XHJcbiAgICAgICAgLy8gcmV0dXJuIHsgdHlwZTogbWV0aG9kLmdldFJldHVyblR5cGUoKSwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9O1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IG51bGwsIGlzQXNzaWduYWJsZTogZmFsc2UgfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaW5jcmVtZW50RGVjcmVtZW50QmVmb3JlT3JBZnRlcihub2RlOiBJbmNyZW1lbnREZWNyZW1lbnROb2RlKTogU3RhY2tUeXBlIHtcclxuICAgICAgICBsZXQgdHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5vcGVyYW5kKTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGUgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAoIXR5cGUuaXNBc3NpZ25hYmxlKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIE9wZXJhdG9yZW4gKysgdW5kIC0tIGvDtm5uZW4gbnVyIGF1ZiBWYXJpYWJsZW4gYW5nZXdlbmRldCB3ZXJkZW4sIG5pY2h0IGF1ZiBrb25zdGFudGUgV2VydGUgb2RlciBSw7xja2dhYmV3ZXJ0ZSB2b24gTWV0aG9kZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdHlwZS50eXBlLmNhbkNhc3RUbyhmbG9hdFByaW1pdGl2ZVR5cGUpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIE9wZXJhdG9yZW4gKysgdW5kIC0tIGvDtm5uZW4gbnVyIGF1ZiBaYWhsZW4gYW5nZXdlbmRldCB3ZXJkZW4sIG5pY2h0IGF1ZiBXZXJ0ZSBkZXMgRGF0ZW50eXBzIFwiICsgdHlwZS50eXBlLmlkZW50aWZpZXIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBub2RlLnR5cGUsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBpbmNyZW1lbnREZWNyZW1lbnRCeTogbm9kZS5vcGVyYXRvciA9PSBUb2tlblR5cGUuZG91YmxlTWludXMgPyAtIDEgOiAxXHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gdHlwZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2VsZWN0QXJyYXlFbGVtZW50KG5vZGU6IFNlbGVjdEFycmF5RWxlbWVudE5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgYXJyYXlUeXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLm9iamVjdCk7IC8vIHB1c2ggYXJyYXktb2JqZWN0IFxyXG4gICAgICAgIGxldCBpbmRleFR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuaW5kZXgpOyAvLyBwdXNoIGluZGV4XHJcblxyXG4gICAgICAgIGlmIChhcnJheVR5cGUgPT0gbnVsbCB8fCBpbmRleFR5cGUgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAoIShhcnJheVR5cGUudHlwZSBpbnN0YW5jZW9mIEFycmF5VHlwZSkpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgVHlwIGRlciBWYXJpYWJsZW4gaXN0IGtlaW4gQXJyYXksIGRhaGVyIGlzdCBbXSBuaWNodCB6dWzDpHNzaWcuIFwiLCBub2RlLm9iamVjdC5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGUuYWRkSWRlbnRpZmllclBvc2l0aW9uKHtcclxuICAgICAgICAgICAgbGluZTogbm9kZS5wb3NpdGlvbi5saW5lLFxyXG4gICAgICAgICAgICBjb2x1bW46IG5vZGUucG9zaXRpb24uY29sdW1uICsgbm9kZS5wb3NpdGlvbi5sZW5ndGgsXHJcbiAgICAgICAgICAgIGxlbmd0aDogMCAgLy8gTW9kdWxlLmdldFR5cGVBdFBvc2l0aW9uIG5lZWRzIGxlbmd0aCA9PSAwIGhlcmUgdG8ga25vdyB0aGF0IHRoaXMgdHlwZS1wb3NpdGlvbiBpcyBub3QgaW4gc3RhdGljIGNvbnRleHQgZm9yIGNvZGUgY29tcGxldGlvblxyXG4gICAgICAgIH0sIGFycmF5VHlwZS50eXBlLmFycmF5T2ZUeXBlKTtcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmVuc3VyZUF1dG9tYXRpY0Nhc3RpbmcoaW5kZXhUeXBlLnR5cGUsIGludFByaW1pdGl2ZVR5cGUpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiQWxzIEluZGV4IGVpbmVzIEFycmF5cyB3aXJkIGVpbiBnYW56emFobGlnZXIgV2VydCBlcndhcnRldC4gR2VmdW5kZW4gd3VyZGUgZWluIFdlcnQgdm9tIFR5cCBcIiArIGluZGV4VHlwZS50eXBlLmlkZW50aWZpZXIgKyBcIi5cIiwgbm9kZS5pbmRleC5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6ICg8QXJyYXlUeXBlPmFycmF5VHlwZS50eXBlKS5hcnJheU9mVHlwZSwgaXNBc3NpZ25hYmxlOiBhcnJheVR5cGUuaXNBc3NpZ25hYmxlIH07XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5zZWxlY3RBcnJheUVsZW1lbnQsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogKDxBcnJheVR5cGU+YXJyYXlUeXBlLnR5cGUpLmFycmF5T2ZUeXBlLCBpc0Fzc2lnbmFibGU6IGFycmF5VHlwZS5pc0Fzc2lnbmFibGUgfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVzaFR5cGVQb3NpdGlvbihwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCB0eXBlOiBUeXBlKSB7XHJcbiAgICAgICAgaWYgKHBvc2l0aW9uID09IG51bGwpIHJldHVybjtcclxuICAgICAgICBpZiAocG9zaXRpb24ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgIGxpbmU6IHBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgICAgICBjb2x1bW46IHBvc2l0aW9uLmNvbHVtbiArIHBvc2l0aW9uLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIGxlbmd0aDogMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMubW9kdWxlLmFkZElkZW50aWZpZXJQb3NpdGlvbihwb3NpdGlvbiwgdHlwZSk7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBwdXNoVXNhZ2VQb3NpdGlvbihwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCBlbGVtZW50OiBLbGFzcyB8IEludGVyZmFjZSB8IE1ldGhvZCB8IEF0dHJpYnV0ZSB8IFZhcmlhYmxlKSB7XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlLmFkZElkZW50aWZpZXJQb3NpdGlvbihwb3NpdGlvbiwgZWxlbWVudCk7XHJcblxyXG4gICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcG9zaXRpb25MaXN0OiBUZXh0UG9zaXRpb25bXSA9IGVsZW1lbnQudXNhZ2VQb3NpdGlvbnMuZ2V0KHRoaXMubW9kdWxlKTtcclxuICAgICAgICBpZiAocG9zaXRpb25MaXN0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgcG9zaXRpb25MaXN0ID0gW107XHJcbiAgICAgICAgICAgIGVsZW1lbnQudXNhZ2VQb3NpdGlvbnMuc2V0KHRoaXMubW9kdWxlLCBwb3NpdGlvbkxpc3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcG9zaXRpb25MaXN0LnB1c2gocG9zaXRpb24pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXNvbHZlSWRlbnRpZmllcihub2RlOiBJZGVudGlmaWVyTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGlmIChub2RlLmlkZW50aWZpZXIgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGxldCB2YXJpYWJsZSA9IHRoaXMuZmluZExvY2FsVmFyaWFibGUobm9kZS5pZGVudGlmaWVyKTtcclxuICAgICAgICBpZiAodmFyaWFibGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogdmFyaWFibGUuc3RhY2tQb3NcclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFVzYWdlUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgdmFyaWFibGUpO1xyXG4gICAgICAgICAgICBub2RlLnZhcmlhYmxlID0gdmFyaWFibGU7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiB2YXJpYWJsZS50eXBlLCBpc0Fzc2lnbmFibGU6ICF2YXJpYWJsZS5pc0ZpbmFsIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oZWFwICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IHZhcmlhYmxlID0gdGhpcy5oZWFwW25vZGUuaWRlbnRpZmllcl07XHJcbiAgICAgICAgICAgIGlmICh2YXJpYWJsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEZyb21IZWFwVG9TdGFjayxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBub2RlLmlkZW50aWZpZXJcclxuICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihub2RlLnBvc2l0aW9uLCB2YXJpYWJsZSk7XHJcbiAgICAgICAgICAgICAgICBub2RlLnZhcmlhYmxlID0gdmFyaWFibGU7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHZhcmlhYmxlLnR5cGUsIGlzQXNzaWduYWJsZTogIXZhcmlhYmxlLmlzRmluYWwgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBhdHRyaWJ1dGUgPSB0aGlzLmZpbmRBdHRyaWJ1dGUobm9kZS5pZGVudGlmaWVyLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICBpZiAoYXR0cmlidXRlICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGUuaXNTdGF0aWMpIHtcclxuICAgICAgICAgICAgICAgIGxldCBjYyA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dDtcclxuICAgICAgICAgICAgICAgIGxldCBzY2MgPSAoY2MgaW5zdGFuY2VvZiBTdGF0aWNDbGFzcykgPyBjYyA6IGNjLnN0YXRpY0NsYXNzO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoaWxlIChzY2MgIT0gbnVsbCAmJiBzY2MuYXR0cmlidXRlcy5pbmRleE9mKGF0dHJpYnV0ZSkgPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY2MgPSBzY2MuYmFzZUNsYXNzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoU3RhdGljQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIGtsYXNzOiBzY2MsXHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlSW5kZXg6IGF0dHJpYnV0ZS5pbmRleCxcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJZGVudGlmaWVyOiBhdHRyaWJ1dGUuaWRlbnRpZmllclxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEF0dHJpYnV0ZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJbmRleDogYXR0cmlidXRlLmluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUlkZW50aWZpZXI6IGF0dHJpYnV0ZS5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIHVzZVRoaXNPYmplY3Q6IHRydWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbm9kZS5hdHRyaWJ1dGUgPSBhdHRyaWJ1dGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIGF0dHJpYnV0ZSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiBhdHRyaWJ1dGUudHlwZSwgaXNBc3NpZ25hYmxlOiAhYXR0cmlidXRlLmlzRmluYWwgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBrbGFzc01vZHVsZSA9IHRoaXMubW9kdWxlU3RvcmUuZ2V0VHlwZShub2RlLmlkZW50aWZpZXIpO1xyXG4gICAgICAgIGlmIChrbGFzc01vZHVsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCBrbGFzcyA9IGtsYXNzTW9kdWxlLnR5cGU7XHJcbiAgICAgICAgICAgIGlmICghKGtsYXNzIGluc3RhbmNlb2YgS2xhc3MgfHwga2xhc3MgaW5zdGFuY2VvZiBJbnRlcmZhY2UpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBUeXAgXCIgKyBrbGFzcy5pZGVudGlmaWVyICsgXCIgaGF0IGtlaW5lIHN0YXRpc2NoZW4gQXR0cmlidXRlL01ldGhvZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoU3RhdGljQ2xhc3NPYmplY3QsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAga2xhc3M6IGtsYXNzXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIGtsYXNzKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGtsYXNzIGluc3RhbmNlb2YgS2xhc3MgPyBrbGFzcy5zdGF0aWNDbGFzcyA6IGtsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzQXNzaWduYWJsZTogZmFsc2VcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IGtsYXNzLFxyXG4gICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBCZXplaWNobmVyIFwiICsgbm9kZS5pZGVudGlmaWVyICsgXCIgaXN0IGhpZXIgbmljaHQgYmVrYW5udC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZpbmRMb2NhbFZhcmlhYmxlKGlkZW50aWZpZXI6IHN0cmluZyk6IFZhcmlhYmxlIHtcclxuICAgICAgICBsZXQgc3QgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZTtcclxuXHJcbiAgICAgICAgd2hpbGUgKHN0ICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB2YXJpYWJsZSA9IHN0LnZhcmlhYmxlTWFwLmdldChpZGVudGlmaWVyKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh2YXJpYWJsZSAhPSBudWxsICYmIHZhcmlhYmxlLnN0YWNrUG9zICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YXJpYWJsZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc3QgPSBzdC5wYXJlbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZmluZEF0dHJpYnV0ZShpZGVudGlmaWVyOiBzdHJpbmcsIHBvc2l0aW9uOiBUZXh0UG9zaXRpb24pOiBBdHRyaWJ1dGUge1xyXG4gICAgICAgIGxldCBjbGFzc0NvbnRleHQgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcbiAgICAgICAgaWYgKGNsYXNzQ29udGV4dCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGF0dHJpYnV0ZSA9IGNsYXNzQ29udGV4dC5nZXRBdHRyaWJ1dGUoaWRlbnRpZmllciwgVmlzaWJpbGl0eS5wcml2YXRlKTtcclxuICAgICAgICBpZiAoYXR0cmlidXRlLmF0dHJpYnV0ZSAhPSBudWxsKSByZXR1cm4gYXR0cmlidXRlLmF0dHJpYnV0ZTtcclxuXHJcbiAgICAgICAgaWYgKGNsYXNzQ29udGV4dCBpbnN0YW5jZW9mIEtsYXNzKSB7XHJcbiAgICAgICAgICAgIGxldCBzdGF0aWNBdHRyaWJ1dGUgPSBjbGFzc0NvbnRleHQuc3RhdGljQ2xhc3MuZ2V0QXR0cmlidXRlKGlkZW50aWZpZXIsIFZpc2liaWxpdHkucHJpdmF0ZSk7XHJcbiAgICAgICAgICAgIGlmIChzdGF0aWNBdHRyaWJ1dGUuYXR0cmlidXRlICE9IG51bGwpIHJldHVybiBzdGF0aWNBdHRyaWJ1dGUuYXR0cmlidXRlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdGhpcy5wdXNoRXJyb3IoYXR0cmlidXRlLmVycm9yLCBwb3NpdGlvbik7XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxNZXRob2Qobm9kZTogTWV0aG9kY2FsbE5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgb2JqZWN0Tm9kZTogU3RhY2tUeXBlID0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUub2JqZWN0ID09IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIC8vIGNhbGwgbWV0aG9kIG9mIHRoaXMtY2xhc3M/XHJcblxyXG4gICAgICAgICAgICBsZXQgdGhpc0NsYXNzID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0O1xyXG4gICAgICAgICAgICBpZiAodGhpc0NsYXNzICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogMFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgb2JqZWN0Tm9kZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0aGlzQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRWluIE1ldGhvZGVuYXVmcnVmIChoaWVyOiBcIiArIG5vZGUuaWRlbnRpZmllciArXHJcbiAgICAgICAgICAgICAgICAgICAgXCIpIG9obmUgUHVua3RzY2hyZWlid2Vpc2UgaXN0IG51ciBpbm5lcmhhbGIgYW5kZXJlciBNZXRob2RlbiBtw7ZnbGljaC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBvYmplY3ROb2RlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLm9iamVjdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob2JqZWN0Tm9kZSA9PSBudWxsKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKCEoXHJcbiAgICAgICAgICAgIChvYmplY3ROb2RlLnR5cGUgaW5zdGFuY2VvZiBLbGFzcykgfHwgKG9iamVjdE5vZGUudHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzKSB8fFxyXG4gICAgICAgICAgICAob2JqZWN0Tm9kZS50eXBlIGluc3RhbmNlb2YgSW50ZXJmYWNlICYmIChub2RlLm9iamVjdFtcInZhcmlhYmxlXCJdICE9IG51bGwgfHwgbm9kZS5vYmplY3RbXCJhdHRyaWJ1dGVcIl0gIT0gbnVsbCB8fCBub2RlLm9iamVjdFtcInRlcm1JbnNpZGVCcmFja2V0c1wiXSAhPSBudWxsKSkgfHwgKG9iamVjdE5vZGUudHlwZSBpbnN0YW5jZW9mIEVudW0pKSkge1xyXG5cclxuICAgICAgICAgICAgaWYgKG9iamVjdE5vZGUudHlwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIldlcnRlIGRpZXNlcyBEYXRlbnR5cHMgYmVzaXR6ZW4ga2VpbmUgTWV0aG9kZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdE5vZGUudHlwZSBpbnN0YW5jZW9mIEludGVyZmFjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKCdNZXRob2RlbmRlZmluaXRpb25lbiBlaW5lcyBJbnRlcmZhY2VzIGvDtm5uZW4gbmljaHQgc3RhdGlzY2ggYXVmZ2VydWZlbiB3ZXJkZW4uJywgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKCdXZXJ0ZSBkZXMgRGF0ZW50eXBzICcgKyBvYmplY3ROb2RlLnR5cGUuaWRlbnRpZmllciArIFwiIGJlc2l0emVuIGtlaW5lIE1ldGhvZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgb2JqZWN0VHlwZTogS2xhc3MgfCBTdGF0aWNDbGFzcyB8IEludGVyZmFjZSA9IDxhbnk+b2JqZWN0Tm9kZS50eXBlO1xyXG5cclxuICAgICAgICBsZXQgcG9zQmVmb3JlUGFyYW1ldGVyRXZhbHVhdGlvbiA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGg7XHJcblxyXG4gICAgICAgIGxldCBwYXJhbWV0ZXJUeXBlczogVHlwZVtdID0gW107XHJcbiAgICAgICAgLy8gbGV0IHBhcmFtZXRlclN0YXRlbWVudHM6IFN0YXRlbWVudFtdW10gPSBbXTtcclxuICAgICAgICBsZXQgcG9zaXRpb25zQWZ0ZXJQYXJhbWV0ZXJTdGF0ZW1lbnRzOiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgICAgIGxldCBhbGxTdGF0ZW1lbnRzID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzO1xyXG4gICAgICAgIGlmIChub2RlLm9wZXJhbmRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgLy8gZm9yIChsZXQgcCBvZiBub2RlLm9wZXJhbmRzKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbm9kZS5vcGVyYW5kcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHAgPSBub2RlLm9wZXJhbmRzW2pdO1xyXG4gICAgICAgICAgICAgICAgLy8gbGV0IHByb2dyYW1Qb2ludGVyID0gYWxsU3RhdGVtZW50cy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZU5vZGUgPSB0aGlzLnByb2Nlc3NOb2RlKHApO1xyXG4gICAgICAgICAgICAgICAgLy8gcGFyYW1ldGVyU3RhdGVtZW50cy5wdXNoKGFsbFN0YXRlbWVudHMuc3BsaWNlKHByb2dyYW1Qb2ludGVyLCBhbGxTdGF0ZW1lbnRzLmxlbmd0aCAtIHByb2dyYW1Qb2ludGVyKSk7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbnNBZnRlclBhcmFtZXRlclN0YXRlbWVudHMucHVzaChhbGxTdGF0ZW1lbnRzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZU5vZGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlclR5cGVzLnB1c2godm9pZFByaW1pdGl2ZVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJUeXBlcy5wdXNoKHR5cGVOb2RlLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZHM6IHsgZXJyb3I6IHN0cmluZywgbWV0aG9kTGlzdDogTWV0aG9kW10gfTtcclxuICAgICAgICBpZiAob2JqZWN0VHlwZSBpbnN0YW5jZW9mIEludGVyZmFjZSkge1xyXG4gICAgICAgICAgICBtZXRob2RzID0gb2JqZWN0VHlwZS5nZXRNZXRob2RzVGhhdEZpdFdpdGhDYXN0aW5nKG5vZGUuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlclR5cGVzLCBmYWxzZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IHVwVG9WaXNpYmlsaXR5ID0gZ2V0VmlzaWJpbGl0eVVwVG8ob2JqZWN0VHlwZSwgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0KTtcclxuXHJcbiAgICAgICAgICAgIG1ldGhvZHMgPSBvYmplY3RUeXBlLmdldE1ldGhvZHNUaGF0Rml0V2l0aENhc3Rpbmcobm9kZS5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyVHlwZXMsIGZhbHNlLCB1cFRvVmlzaWJpbGl0eSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGUucHVzaE1ldGhvZENhbGxQb3NpdGlvbihub2RlLnBvc2l0aW9uLCBub2RlLmNvbW1hUG9zaXRpb25zLCBvYmplY3RUeXBlLmdldE1ldGhvZHMoVmlzaWJpbGl0eS5wcml2YXRlLCBub2RlLmlkZW50aWZpZXIpLCBub2RlLnJpZ2h0QnJhY2tldFBvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgaWYgKG1ldGhvZHMuZXJyb3IgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihtZXRob2RzLmVycm9yLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9OyAvLyB0cnkgdG8gY29udGludWUuLi5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtZXRob2QgPSBtZXRob2RzLm1ldGhvZExpc3RbMF07XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFVzYWdlUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgbWV0aG9kKTtcclxuXHJcbiAgICAgICAgLy8gWW91IENBTiBjYWxsIGEgc3RhdGljIG1ldGhvZCBvbiBhIG9iamVjdC4uLiwgc286XHJcbiAgICAgICAgaWYgKG1ldGhvZC5pc1N0YXRpYyAmJiBvYmplY3RUeXBlIGluc3RhbmNlb2YgS2xhc3MgJiYgb2JqZWN0VHlwZS5pZGVudGlmaWVyICE9IFwiUHJpbnRTdHJlYW1cIikge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVzIGlzdCBrZWluIGd1dGVyIFByb2dyYW1taWVyc3RpbCwgc3RhdGlzY2hlIE1ldGhvZGVuIGVpbmVyIEtsYXNzZSBtaXRoaWxmZSBlaW5lcyBPYmpla3RzIGF1Znp1cnVmZW4uIEJlc3NlciB3w6RyZSBoaWVyIFwiICsgb2JqZWN0VHlwZS5pZGVudGlmaWVyICsgXCIuXCIgKyBtZXRob2QuaWRlbnRpZmllciArIFwiKC4uLikuXCIsIG5vZGUucG9zaXRpb24sIFwiaW5mb1wiKTtcclxuICAgICAgICAgICAgdGhpcy5pbnNlcnRTdGF0ZW1lbnRzKHBvc0JlZm9yZVBhcmFtZXRlckV2YWx1YXRpb24sIFt7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuZGVjcmVhc2VTdGFja3BvaW50ZXIsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHBvcENvdW50OiAxXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoU3RhdGljQ2xhc3NPYmplY3QsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIGtsYXNzOiBvYmplY3RUeXBlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZGVzdFR5cGU6IFR5cGUgPSBudWxsO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyYW1ldGVyVHlwZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGkgPCBtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSkgeyAgLy8gcG9zc2libGUgZWxsaXBzaXMhXHJcbiAgICAgICAgICAgICAgICBkZXN0VHlwZSA9IG1ldGhvZC5nZXRQYXJhbWV0ZXJUeXBlKGkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxICYmIG1ldGhvZC5oYXNFbGxpcHNpcygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzdFR5cGUgPSAoPEFycmF5VHlwZT5kZXN0VHlwZSkuYXJyYXlPZlR5cGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE1hcmtlciAxXHJcbiAgICAgICAgICAgIGxldCBzcmNUeXBlID0gcGFyYW1ldGVyVHlwZXNbaV07XHJcbiAgICAgICAgICAgIC8vIGZvciAobGV0IHN0IG9mIHBhcmFtZXRlclN0YXRlbWVudHNbaV0pIHtcclxuICAgICAgICAgICAgLy8gICAgIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5wdXNoKHN0KTtcclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgICAgICBsZXQgcHJvZ3JhbVBvc2l0aW9uID0gYWxsU3RhdGVtZW50cy5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuZW5zdXJlQXV0b21hdGljQ2FzdGluZyhzcmNUeXBlLCBkZXN0VHlwZSwgbm9kZS5vcGVyYW5kc1tpXS5wb3NpdGlvbiwgbm9kZS5vcGVyYW5kc1tpXSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFdlcnQgdm9tIERhdGVudHlwIFwiICsgc3JjVHlwZS5pZGVudGlmaWVyICsgXCIga2FubiBuaWNodCBhbHMgUGFyYW1ldGVyIChEYXRlbnR5cCBcIiArIGRlc3RUeXBlLmlkZW50aWZpZXIgKyBcIikgdmVyd2VuZGV0IHdlcmRlbi5cIiwgbm9kZS5vcGVyYW5kc1tpXS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhbGxTdGF0ZW1lbnRzLmxlbmd0aCA+IHByb2dyYW1Qb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNhc3RpbmdTdGF0ZW1lbnRzID0gYWxsU3RhdGVtZW50cy5zcGxpY2UocHJvZ3JhbVBvc2l0aW9uLCBhbGxTdGF0ZW1lbnRzLmxlbmd0aCAtIHByb2dyYW1Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBhbGxTdGF0ZW1lbnRzLnNwbGljZShwb3NpdGlvbnNBZnRlclBhcmFtZXRlclN0YXRlbWVudHNbaV0sIDAsIC4uLmNhc3RpbmdTdGF0ZW1lbnRzKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLmNvcnJlY3RQb3NpdGlvbnNBZnRlckluc2VydChwb3NpdGlvbnNBZnRlclBhcmFtZXRlclN0YXRlbWVudHNbaV0sIGNhc3RpbmdTdGF0ZW1lbnRzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAvLyBpZiAoc3JjVHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUgJiYgZGVzdFR5cGUgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgIC8vICAgICBpZiAoc3JjVHlwZS5nZXRDYXN0SW5mb3JtYXRpb24oZGVzdFR5cGUpLm5lZWRzU3RhdGVtZW50KSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHBvc2l0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBuZXdUeXBlOiBkZXN0VHlwZSxcclxuICAgICAgICAgICAgLy8gICAgICAgICAgICAgc3RhY2tQb3NSZWxhdGl2ZTogLXBhcmFtZXRlclR5cGVzLmxlbmd0aCArIDEgKyBpXHJcbiAgICAgICAgICAgIC8vICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc3RhY2tmcmFtZURlbHRhID0gMDtcclxuICAgICAgICBpZiAobWV0aG9kLmhhc0VsbGlwc2lzKCkpIHtcclxuICAgICAgICAgICAgbGV0IGVsbGlwc2lzUGFyYW1ldGVyQ291bnQgPSBwYXJhbWV0ZXJUeXBlcy5sZW5ndGggLSBtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSArIDE7IC8vIGxhc3QgcGFyYW1ldGVyIGFuZCBzdWJzZXF1ZW50IG9uZXNcclxuICAgICAgICAgICAgc3RhY2tmcmFtZURlbHRhID0gLSAoZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCAtIDEpO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5tYWtlRWxsaXBzaXNBcnJheSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLm9wZXJhbmRzW21ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpIC0gMV0ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJDb3VudDogZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBhcnJheVR5cGU6IG1ldGhvZC5nZXRQYXJhbWV0ZXIobWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxKS50eXBlXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobWV0aG9kLnZpc2liaWxpdHkgIT0gVmlzaWJpbGl0eS5wdWJsaWMpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB2aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgbGV0IGNsYXNzQ29udGV4dCA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dDtcclxuICAgICAgICAgICAgaWYgKGNsYXNzQ29udGV4dCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB2aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2xhc3NDb250ZXh0ICE9IG9iamVjdFR5cGUgJiZcclxuICAgICAgICAgICAgICAgICAgICAhKGNsYXNzQ29udGV4dCBpbnN0YW5jZW9mIEtsYXNzICYmIGNsYXNzQ29udGV4dC5pbXBsZW1lbnRzLmluZGV4T2YoPEludGVyZmFjZT5vYmplY3RUeXBlKSA+IDApKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGhvZC52aXNpYmlsaXR5ID09IFZpc2liaWxpdHkucHJpdmF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaWJsZSA9IGNsYXNzQ29udGV4dC5oYXNBbmNlc3Rvck9ySXMoPEtsYXNzIHwgU3RhdGljQ2xhc3M+b2JqZWN0VHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdmlzaWJsZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgTWV0aG9kZSBcIiArIG1ldGhvZC5pZGVudGlmaWVyICsgXCIgaXN0IGFuIGRpZXNlciBTdGVsbGUgZGVzIFByb2dyYW1tcyBuaWNodCBzaWNodGJhci5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBpc1N5c3RlbU1ldGhvZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGlmIChtZXRob2QuaXNTdGF0aWMgJiYgb2JqZWN0Tm9kZS50eXBlICE9IG51bGwgJiZcclxuICAgICAgICAgICAgKG9iamVjdE5vZGUudHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzKSkge1xyXG4gICAgICAgICAgICBsZXQgY2xhc3NJZGVudGlmaWVyID0gb2JqZWN0Tm9kZS50eXBlLktsYXNzLmlkZW50aWZpZXI7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKGNsYXNzSWRlbnRpZmllcikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIklucHV0XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsSW5wdXRNZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0ocGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSArIHN0YWNrZnJhbWVEZWx0YSkgLy8gdGhpcy1vYmplY3QgZm9sbG93ZWQgYnkgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGlzU3lzdGVtTWV0aG9kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJTeXN0ZW1Ub29sc1wiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIlJvYm90XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFtcInBhdXNlXCIsIFwid2FydGVuXCJdLmluZGV4T2YobWV0aG9kLmlkZW50aWZpZXIpID49IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnNldFBhdXNlRHVyYXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucGF1c2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1N5c3RlbU1ldGhvZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFpc1N5c3RlbU1ldGhvZCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIGlzU3VwZXJDYWxsOiBvYmplY3ROb2RlLmlzU3VwZXIgPT0gbnVsbCA/IGZhbHNlIDogb2JqZWN0Tm9kZS5pc1N1cGVyLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tmcmFtZUJlZ2luOiAtKHBhcmFtZXRlclR5cGVzLmxlbmd0aCArIDEgKyBzdGFja2ZyYW1lRGVsdGEpIC8vIHRoaXMtb2JqZWN0IGZvbGxvd2VkIGJ5IHBhcmFtZXRlcnNcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIHRoaXMucHVzaFR5cGVQb3NpdGlvbihub2RlLnJpZ2h0QnJhY2tldFBvc2l0aW9uLCBtZXRob2QuZ2V0UmV0dXJuVHlwZSgpKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbWV0aG9kLmdldFJldHVyblR5cGUoKSwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdXNoQ29uc3RhbnQobm9kZTogQ29uc3RhbnROb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IHR5cGU6IFR5cGU7XHJcblxyXG4gICAgICAgIHN3aXRjaCAobm9kZS5jb25zdGFudFR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuaW50ZWdlckNvbnN0YW50OlxyXG4gICAgICAgICAgICAgICAgdHlwZSA9IGludFByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuYm9vbGVhbkNvbnN0YW50OlxyXG4gICAgICAgICAgICAgICAgdHlwZSA9IGJvb2xlYW5QcmltaXRpdmVUeXBlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmZsb2F0aW5nUG9pbnRDb25zdGFudDpcclxuICAgICAgICAgICAgICAgIHR5cGUgPSBmbG9hdFByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc3RyaW5nQ29uc3RhbnQ6XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gc3RyaW5nUHJpbWl0aXZlVHlwZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFR5cGVQb3NpdGlvbihub2RlLnBvc2l0aW9uLCB0eXBlKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jaGFyQ29uc3RhbnQ6XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gY2hhclByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZE51bGw6XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gbnVsbFR5cGVcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQ29uc3RhbnQsXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiB0eXBlLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgdmFsdWU6IG5vZGUuY29uc3RhbnRcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiB0eXBlLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NCaW5hcnlPcChub2RlOiBCaW5hcnlPcE5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgaXNBc3NpZ25tZW50ID0gQ29kZUdlbmVyYXRvci5hc3NpZ25tZW50T3BlcmF0b3JzLmluZGV4T2Yobm9kZS5vcGVyYXRvcikgPj0gMDtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUub3BlcmF0b3IgPT0gVG9rZW5UeXBlLnRlcm5hcnlPcGVyYXRvcikge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzVGVybmFyeU9wZXJhdG9yKG5vZGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGxlZnRUeXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLmZpcnN0T3BlcmFuZCwgaXNBc3NpZ25tZW50KTtcclxuXHJcbiAgICAgICAgbGV0IHByb2dyYW1Qb3NBZnRlckxlZnRPcG9lcmFuZCA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGg7XHJcblxyXG4gICAgICAgIGxldCBsYXp5RXZhbHVhdGlvbkRlc3QgPSBudWxsO1xyXG4gICAgICAgIGlmIChub2RlLm9wZXJhdG9yID09IFRva2VuVHlwZS5hbmQpIHtcclxuICAgICAgICAgICAgbGF6eUV2YWx1YXRpb25EZXN0ID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXIuaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBJZkZhbHNlQW5kTGVhdmVPblN0YWNrLCBub2RlLmZpcnN0T3BlcmFuZC5wb3NpdGlvbiwgdGhpcyk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChub2RlLm9wZXJhdG9yID09IFRva2VuVHlwZS5vcikge1xyXG4gICAgICAgICAgICBsYXp5RXZhbHVhdGlvbkRlc3QgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlci5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmVHJ1ZUFuZExlYXZlT25TdGFjaywgbm9kZS5maXJzdE9wZXJhbmQucG9zaXRpb24sIHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHJpZ2h0VHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5zZWNvbmRPcGVyYW5kKTtcclxuXHJcbiAgICAgICAgaWYgKGxlZnRUeXBlID09IG51bGwgfHwgbGVmdFR5cGUudHlwZSA9PSBudWxsIHx8IHJpZ2h0VHlwZSA9PSBudWxsIHx8IHJpZ2h0VHlwZS50eXBlID09IG51bGwpIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICBsZXQgY29udmVydGVkTGVmdFR5cGUgPSBsZWZ0VHlwZS50eXBlO1xyXG5cclxuICAgICAgICBpZiAoaXNBc3NpZ25tZW50KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKHJpZ2h0VHlwZS50eXBlLCBsZWZ0VHlwZS50eXBlLCBub2RlLnBvc2l0aW9uLCBub2RlLmZpcnN0T3BlcmFuZCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFdlcnQgdm9tIERhdGVudHlwIFwiICsgcmlnaHRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIGF1ZiBkZXIgcmVjaHRlbiBTZWl0ZSBrYW5uIGRlciBWYXJpYWJsZW4gYXVmIGRlciBsaW5rZW4gU2VpdGUgKERhdGVudHlwIFwiICsgbGVmdFR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIpIG5pY2h0IHp1Z2V3aWVzZW4gd2VyZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0VHlwZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFsZWZ0VHlwZS5pc0Fzc2lnbmFibGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVtIFRlcm0vZGVyIFZhcmlhYmxlbiBhdWYgZGVyIGxpbmtlbiBTZWl0ZSBkZXMgWnV3ZWlzdW5nc29wZXJhdG9ycyAoPSkga2FubiBrZWluIFdlcnQgenVnZXdpZXNlbiB3ZXJkZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgc3RhdGVtZW50OiBBc3NpZ25tZW50U3RhdGVtZW50ID0ge1xyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBub2RlLm9wZXJhdG9yLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBsZWF2ZVZhbHVlT25TdGFjazogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhzdGF0ZW1lbnQpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBsZWZ0VHlwZTtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChub2RlLmZpcnN0T3BlcmFuZC50eXBlID09IFRva2VuVHlwZS5pZGVudGlmaWVyICYmIG5vZGUuZmlyc3RPcGVyYW5kLnZhcmlhYmxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCB2ID0gbm9kZS5maXJzdE9wZXJhbmQudmFyaWFibGU7XHJcbiAgICAgICAgICAgICAgICBpZiAodi5pbml0aWFsaXplZCAhPSBudWxsICYmICF2LmluaXRpYWxpemVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdi51c2VkQmVmb3JlSW5pdGlhbGl6YXRpb24gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIFZhcmlhYmxlIFwiICsgdi5pZGVudGlmaWVyICsgXCIgd2lyZCBoaWVyIGJlbnV0enQgYmV2b3Igc2llIGluaXRpYWxpc2llcnQgd3VyZGUuXCIsIG5vZGUucG9zaXRpb24sIFwiaW5mb1wiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHJlc3VsdFR5cGUgPSBsZWZ0VHlwZS50eXBlLmdldFJlc3VsdFR5cGUobm9kZS5vcGVyYXRvciwgcmlnaHRUeXBlLnR5cGUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHVuYm94YWJsZUxlZnQgPSBsZWZ0VHlwZS50eXBlW1widW5ib3hhYmxlQXNcIl07XHJcbiAgICAgICAgICAgIGxldCB1bmJveGFibGVSaWdodCA9IHJpZ2h0VHlwZS50eXBlW1widW5ib3hhYmxlQXNcIl07XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKHJlc3VsdFR5cGUgPT0gbnVsbCAmJiBub2RlLm9wZXJhdG9yID09IFRva2VuVHlwZS5wbHVzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocmlnaHRUeXBlLnR5cGUgPT0gc3RyaW5nUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmVuc3VyZUF1dG9tYXRpY1RvU3RyaW5nKGxlZnRUeXBlLnR5cGUsIHByb2dyYW1Qb3NBZnRlckxlZnRPcG9lcmFuZCwgbm9kZS5maXJzdE9wZXJhbmQucG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFR5cGUgPSBzdHJpbmdQcmltaXRpdmVUeXBlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb252ZXJ0ZWRMZWZ0VHlwZSA9IHN0cmluZ1ByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsZWZ0VHlwZS50eXBlID09IHN0cmluZ1ByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5lbnN1cmVBdXRvbWF0aWNUb1N0cmluZyhyaWdodFR5cGUudHlwZSwgdW5kZWZpbmVkLCBub2RlLmZpcnN0T3BlcmFuZC5wb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0VHlwZSA9IHN0cmluZ1ByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmVzdWx0VHlwZSA9PSBudWxsICYmICh1bmJveGFibGVMZWZ0ICE9IG51bGwgfHwgdW5ib3hhYmxlUmlnaHQgIT0gbnVsbCkpIHtcclxuICAgICAgICAgICAgICAgIGxldCBsZWZ0VHlwZXM6IFR5cGVbXSA9IHVuYm94YWJsZUxlZnQgPT0gbnVsbCA/IFtsZWZ0VHlwZS50eXBlXSA6IHVuYm94YWJsZUxlZnQ7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmlnaHRUeXBlczogVHlwZVtdID0gdW5ib3hhYmxlUmlnaHQgPT0gbnVsbCA/IFtyaWdodFR5cGUudHlwZV0gOiB1bmJveGFibGVSaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBsdCBvZiBsZWZ0VHlwZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBydCBvZiByaWdodFR5cGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFR5cGUgPSBsdC5nZXRSZXN1bHRUeXBlKG5vZGUub3BlcmF0b3IsIHJ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdFR5cGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnNlcnRTdGF0ZW1lbnRzKHByb2dyYW1Qb3NBZnRlckxlZnRPcG9lcmFuZCwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUuZmlyc3RPcGVyYW5kLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1R5cGU6IGx0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUuc2Vjb25kT3BlcmFuZC5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUeXBlOiBydFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb252ZXJ0ZWRMZWZ0VHlwZSA9IGx0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdFR5cGUgIT0gbnVsbCkgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICBpZiAobm9kZS5vcGVyYXRvciBpbiBbVG9rZW5UeXBlLmFuZCwgVG9rZW5UeXBlLm9yXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZS5maXJzdE9wZXJhbmQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZS5zZWNvbmRPcGVyYW5kKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHJlc3VsdFR5cGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGJpdE9wZXJhdG9ycyA9IFtUb2tlblR5cGUuYW1wZXJzYW5kLCBUb2tlblR5cGUuT1JdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGJvb2xlYW5PcGVyYXRvcnMgPSBbXCImJiAoYm9vbGVzY2hlciBVTkQtT3BlcmF0b3IpXCIsIFwifHwgKGJvb2xlc2NoZXIgT0RFUi1PcGVyYXRvcilcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgYmV0dGVyT3BlcmF0b3JzID0gW1wiJiAmXCIsIFwifHxcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgb3BJbmRleCA9IGJpdE9wZXJhdG9ycy5pbmRleE9mKG5vZGUub3BlcmF0b3IpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG9wSW5kZXggPj0gMCAmJiBsZWZ0VHlwZS50eXBlID09IGJvb2xlYW5QcmltaXRpdmVUeXBlICYmIHJpZ2h0VHlwZS50eXBlID09IGJvb2xlYW5QcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgT3BlcmF0aW9uIFwiICsgVG9rZW5UeXBlUmVhZGFibGVbbm9kZS5vcGVyYXRvcl0gKyBcIiBpc3QgZsO8ciBkaWUgT3BlcmFuZGVuIGRlciBUeXBlbiBcIiArIGxlZnRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIHVuZCBcIiArIHJpZ2h0VHlwZS50eXBlLmlkZW50aWZpZXIgKyBcIiBuaWNodCBkZWZpbmllcnQuIER1IG1laW50ZXN0IHdhaHJzY2hlaW5saWNoIGRlbiBPcGVyYXRvciBcIiArIGJvb2xlYW5PcGVyYXRvcnNbb3BJbmRleF0gKyBcIi5cIiwgbm9kZS5wb3NpdGlvbiwgXCJlcnJvclwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJPcGVyYXRvciBcIiArIGJldHRlck9wZXJhdG9yc1tvcEluZGV4XSArIFwiIHZlcndlbmRlbiBzdGF0dCBcIiArIFRva2VuVHlwZVJlYWRhYmxlW25vZGUub3BlcmF0b3JdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdHNQcm92aWRlcjogKHVyaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiB1cmksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlZGl0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHsgc3RhcnRMaW5lTnVtYmVyOiBub2RlLnBvc2l0aW9uLmxpbmUsIHN0YXJ0Q29sdW1uOiBub2RlLnBvc2l0aW9uLmNvbHVtbiwgZW5kTGluZU51bWJlcjogbm9kZS5wb3NpdGlvbi5saW5lLCBlbmRDb2x1bW46IG5vZGUucG9zaXRpb24uY29sdW1uIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogVG9rZW5UeXBlUmVhZGFibGVbbm9kZS5vcGVyYXRvcl1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBPcGVyYXRpb24gXCIgKyBUb2tlblR5cGVSZWFkYWJsZVtub2RlLm9wZXJhdG9yXSArIFwiIGlzdCBmw7xyIGRpZSBPcGVyYW5kZW4gZGVyIFR5cGVuIFwiICsgbGVmdFR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIgdW5kIFwiICsgcmlnaHRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIG5pY2h0IGRlZmluaWVydC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFR5cGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5iaW5hcnlPcCxcclxuICAgICAgICAgICAgICAgIGxlZnRUeXBlOiBjb252ZXJ0ZWRMZWZ0VHlwZSxcclxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBub2RlLm9wZXJhdG9yLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb25cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAobGF6eUV2YWx1YXRpb25EZXN0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLm1hcmtKdW1wRGVzdGluYXRpb24oMSwgbGF6eUV2YWx1YXRpb25EZXN0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogcmVzdWx0VHlwZSwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9O1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NUZXJuYXJ5T3BlcmF0b3Iobm9kZTogQmluYXJ5T3BOb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IGxlZnRUeXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLmZpcnN0T3BlcmFuZCk7XHJcblxyXG4gICAgICAgIGlmIChsZWZ0VHlwZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmVuc3VyZUF1dG9tYXRpY0Nhc3RpbmcobGVmdFR5cGUudHlwZSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsIG51bGwsIG5vZGUuZmlyc3RPcGVyYW5kKSkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHNlY29uZE9wZXJhbmQgPSBub2RlLnNlY29uZE9wZXJhbmQ7XHJcbiAgICAgICAgICAgIGlmIChzZWNvbmRPcGVyYW5kICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmIChzZWNvbmRPcGVyYW5kLnR5cGUgIT0gVG9rZW5UeXBlLmJpbmFyeU9wIHx8IHNlY29uZE9wZXJhbmQub3BlcmF0b3IgIT0gVG9rZW5UeXBlLmNvbG9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJBdWYgZGVuIEZyYWdlemVpY2hlbm9wZXJhdG9yIG3DvHNzZW4gLSBtaXQgRG9wcGVscHVua3QgZ2V0cmVubnQgLSB6d2VpIEFsdGVybmF0aXZ0ZXJtZSBmb2xnZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbG0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlcjtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdmFyaWFudEZhbHNlTGFiZWwgPSBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmRmFsc2UsIG5vZGUucG9zaXRpb24sIHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBmaXJzdFR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKHNlY29uZE9wZXJhbmQuZmlyc3RPcGVyYW5kKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVuZExhYmVsID0gbG0uaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBBbHdheXMsIHNlY29uZE9wZXJhbmQuZmlyc3RPcGVyYW5kLnBvc2l0aW9uLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEsIHZhcmlhbnRGYWxzZUxhYmVsKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc2Vjb25kVHlwZSA9IHRoaXMucHJvY2Vzc05vZGUoc2Vjb25kT3BlcmFuZC5zZWNvbmRPcGVyYW5kKTtcclxuICAgICAgICAgICAgICAgICAgICBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEsIGVuZExhYmVsKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHR5cGUgPSBmaXJzdFR5cGUudHlwZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vjb25kVHlwZSAhPSBudWxsICYmIHR5cGUgIT0gc2Vjb25kVHlwZS50eXBlICYmIHR5cGUuY2FuQ2FzdFRvKHNlY29uZFR5cGUudHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9IHNlY29uZFR5cGUudHlwZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQXNzaWduYWJsZTogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc1VuYXJ5T3Aobm9kZTogVW5hcnlPcE5vZGUpOiBTdGFja1R5cGUge1xyXG4gICAgICAgIGxldCBsZWZ0VHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5vcGVyYW5kKTtcclxuXHJcbiAgICAgICAgaWYgKGxlZnRUeXBlID09IG51bGwgfHwgbGVmdFR5cGUudHlwZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmIChub2RlLm9wZXJhdG9yID09IFRva2VuVHlwZS5taW51cykge1xyXG4gICAgICAgICAgICBpZiAoIWxlZnRUeXBlLnR5cGUuY2FuQ2FzdFRvKGZsb2F0UHJpbWl0aXZlVHlwZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIE9wZXJhdG9yIC0gaXN0IGbDvHIgZGVuIFR5cCBcIiArIGxlZnRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIG5pY2h0IGRlZmluaWVydC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFR5cGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobm9kZS5vcGVyYXRvciA9PSBUb2tlblR5cGUubm90KSB7XHJcbiAgICAgICAgICAgIGlmICghKGxlZnRUeXBlLnR5cGUgPT0gYm9vbGVhblByaW1pdGl2ZVR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrSWZBc3NpZ25tZW50SW5zdGVkT2ZFcXVhbChub2RlLm9wZXJhbmQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgT3BlcmF0b3IgISBpc3QgZsO8ciBkZW4gVHlwIFwiICsgbGVmdFR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIgbmljaHQgZGVmaW5pZXJ0LlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0VHlwZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUudW5hcnlPcCxcclxuICAgICAgICAgICAgb3BlcmF0b3I6IG5vZGUub3BlcmF0b3IsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBsZWZ0VHlwZTtcclxuICAgIH1cclxuXHJcbn0iXX0=