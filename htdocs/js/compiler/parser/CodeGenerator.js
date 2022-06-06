import { TokenType, TokenTypeReadable } from "../lexer/Token.js";
import { ArrayType } from "../types/Array.js";
import { Klass, Interface, StaticClass, Visibility, getVisibilityUpTo, UnboxableKlass } from "../types/Class.js";
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
    ensureAutomaticCasting(typeFrom, typeTo, position, nodeFrom, nullTypeForbidden = false) {
        if (typeFrom == null || typeTo == null)
            return false;
        if (!(typeFrom == nullType && nullTypeForbidden)) {
            if (typeFrom.equals(typeTo)) {
                return true;
            }
            if (!typeFrom.canCastTo(typeTo)) {
                if (typeTo == booleanPrimitiveType && nodeFrom != null) {
                    this.checkIfAssignmentInstedOfEqual(nodeFrom);
                }
                return false;
            }
            if (typeFrom["unboxableAs"] != null && typeFrom["unboxableAs"].indexOf(typeTo) >= 0) {
                this.pushStatements({
                    type: TokenType.castValue,
                    position: position,
                    newType: typeTo
                });
                return true;
            }
        }
        if (typeFrom instanceof PrimitiveType && (typeTo instanceof PrimitiveType || typeTo == stringPrimitiveType)) {
            let castInfo = typeFrom.getCastInformation(typeTo);
            if (!castInfo.automatic) {
                return false;
            }
            // if (castInfo.needsStatement) {
            this.pushStatements({
                type: TokenType.castValue,
                newType: typeTo,
                position: position
            });
            // }
        }
        return true;
    }
    ensureAutomaticToString(typeFrom, codepos = undefined, textposition) {
        if (typeFrom == stringPrimitiveType)
            return true;
        if (typeFrom == voidPrimitiveType)
            return false;
        if (typeFrom instanceof PrimitiveType) {
            let castInfo = typeFrom.getCastInformation(stringPrimitiveType);
            if (!castInfo.automatic)
                return false;
            // if (castInfo.needsStatement) {
            this.insertOrPushStatements({
                type: TokenType.castValue,
                newType: stringPrimitiveType,
                position: textposition
            }, codepos);
            return true;
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
                let automaticToString = new Method(toStringMethod.identifier, toStringMethod.parameterlist, stringPrimitiveType, (parameters) => {
                    let value = parameters[0].value;
                    if (value == null)
                        return "null";
                    return toStringMethod.invoke(parameters);
                }, toStringMethod.isAbstract, true, toStringMethod.documentation, toStringMethod.isConstructor);
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
        }
        return false;
    }
    // getToStringStatement(type: Klass | NullType, position: TextPosition, nullToString: boolean = true): Statement {
    // }
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
                // if ((typeFrom instanceof PrimitiveType) && typeTo instanceof PrimitiveType) {
                //     let castInfo = typeFrom.getCastInformation(typeTo);
                //     if (castInfo.needsStatement) {
                //         this.pushStatements({
                //             type: TokenType.castValue,
                //             position: node.position,
                //             newType: typeTo
                //         });
                // }
                // } else if (typeFrom instanceof Klass && typeTo == stringPrimitiveType) {
                //     let toStringStatement = this.getToStringStatement(typeFrom, node.position, false);
                //     if (toStringStatement != null) {
                //         this.pushStatements(this.getToStringStatement(typeFrom, node.position, false));
                //     } else {
                //         this.pushError("Der Datentyp " + typeFrom.identifier + " kann (zumindest durch casting) nicht in den Datentyp " + typeTo.identifier + " umgewandelt werden.", node.position);
                //         this.pushStatements({ type: TokenType.castValue, position: node.position, newType: typeTo });
                //     }
                // }
                // else if ((typeFrom["unboxableAs"] || []).includes(typeTo)) {
                //     this.pushStatements({
                //         type: TokenType.castValue,
                //         position: node.position,
                //         newType: typeTo
                //     });
                // }
                // else if (typeFrom instanceof NullType) {
                //     this.pushStatements({
                //         type: TokenType.castValue,
                //         position: node.position,
                //         newType: typeTo
                //     });
                // }
                return {
                    isAssignable: typeFrom1.isAssignable,
                    type: typeTo
                };
            }
            if (typeFrom instanceof UnboxableKlass) {
                for (let unboxableAs of typeFrom.unboxableAs) {
                    if (unboxableAs.canCastTo(typeTo)) {
                        this.pushCastToStatement(typeFrom, unboxableAs, node);
                        this.pushCastToStatement(unboxableAs, typeTo, node);
                    }
                }
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
        // if ((typeFrom instanceof PrimitiveType) && typeTo instanceof PrimitiveType) {
        //     let castInfo = typeFrom.getCastInformation(typeTo);
        //     if (!castInfo.needsStatement) needsStatement = false;
        // }
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
            if (!this.ensureAutomaticCasting(rightType.type, leftType.type, node.position, node.firstOperand, true)) {
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
                            // rightType.type = rt;
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
        if (this.ensureAutomaticCasting(leftType.type, booleanPrimitiveType, null, node.firstOperand, true)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29kZUdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9jbGllbnQvY29tcGlsZXIvcGFyc2VyL0NvZGVHZW5lcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFnQixTQUFTLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQVksTUFBTSw0QkFBNEIsQ0FBQztBQUNqTyxPQUFPLEVBQUUsU0FBUyxFQUF5QixhQUFhLEVBQWtCLE1BQU0sRUFBUSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVwSixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFHakQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxJQUFJLEVBQVksTUFBTSxrQkFBa0IsQ0FBQztBQVVsRCxNQUFNLE9BQU8sYUFBYTtJQUExQjtRQWdpQ0ksd0JBQW1CLEdBQThCLEVBQUUsQ0FBQztJQTZ5RXhELENBQUM7SUF0ekdHLHFCQUFxQixDQUFDLE1BQWMsRUFBRSxXQUF3QixFQUFFLFdBQXdCLEVBQUUsSUFBVTtRQUVoRyxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FB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SjtRQUVELElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQ2hDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksb0JBQW9CLENBQUMsRUFBRTtnQkFDMUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQ0FBaUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2xILE9BQU8sUUFBUSxDQUFDO2FBQ25CO1NBRUo7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDO1lBQ2hCLElBQUksRUFBRSxTQUFTLENBQUMsT0FBTztZQUN2QixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1NBQzFCLENBQUMsQ0FBQztRQUVILE9BQU8sUUFBUSxDQUFDO0lBQ3BCLENBQUM7O0FBejBHTSxpQ0FBbUIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsZUFBZTtJQUN2RyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLFdBQVc7SUFDL0csU0FBUyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXJyb3IsIFF1aWNrRml4LCBFcnJvckxldmVsIH0gZnJvbSBcIi4uL2xleGVyL0xleGVyLmpzXCI7XHJcbmltcG9ydCB7IFRleHRQb3NpdGlvbiwgVG9rZW5UeXBlLCBUb2tlblR5cGVSZWFkYWJsZSB9IGZyb20gXCIuLi9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheVR5cGUgfSBmcm9tIFwiLi4vdHlwZXMvQXJyYXkuanNcIjtcclxuaW1wb3J0IHsgS2xhc3MsIEludGVyZmFjZSwgU3RhdGljQ2xhc3MsIFZpc2liaWxpdHksIGdldFZpc2liaWxpdHlVcFRvLCBVbmJveGFibGVLbGFzcyB9IGZyb20gXCIuLi90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBib29sZWFuUHJpbWl0aXZlVHlwZSwgY2hhclByaW1pdGl2ZVR5cGUsIGZsb2F0UHJpbWl0aXZlVHlwZSwgaW50UHJpbWl0aXZlVHlwZSwgc3RyaW5nUHJpbWl0aXZlVHlwZSwgb2JqZWN0VHlwZSwgbnVsbFR5cGUsIHZvaWRQcmltaXRpdmVUeXBlLCB2YXJUeXBlLCBkb3VibGVQcmltaXRpdmVUeXBlLCBOdWxsVHlwZSB9IGZyb20gXCIuLi90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBBdHRyaWJ1dGUsIFR5cGUsIFZhcmlhYmxlLCBWYWx1ZSwgUHJpbWl0aXZlVHlwZSwgVXNhZ2VQb3NpdGlvbnMsIE1ldGhvZCwgSGVhcCwgZ2V0VHlwZUlkZW50aWZpZXIsIFBhcmFtZXRlcmxpc3QgfSBmcm9tIFwiLi4vdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgQVNUTm9kZSwgQXR0cmlidXRlRGVjbGFyYXRpb25Ob2RlLCBCaW5hcnlPcE5vZGUsIENsYXNzRGVjbGFyYXRpb25Ob2RlLCBDb25zdGFudE5vZGUsIERvV2hpbGVOb2RlLCBGb3JOb2RlLCBJZGVudGlmaWVyTm9kZSwgSWZOb2RlLCBJbmNyZW1lbnREZWNyZW1lbnROb2RlLCBNZXRob2RjYWxsTm9kZSwgTWV0aG9kRGVjbGFyYXRpb25Ob2RlLCBOZXdPYmplY3ROb2RlLCBSZXR1cm5Ob2RlLCBTZWxlY3RBcnJheUVsZW1lbnROb2RlLCBTZWxlY3RBcnJpYnV0ZU5vZGUsIFN1cGVyY29uc3RydWN0b3JDYWxsTm9kZSwgU3VwZXJOb2RlLCBUaGlzTm9kZSwgVW5hcnlPcE5vZGUsIFdoaWxlTm9kZSwgTG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uTm9kZSwgQXJyYXlJbml0aWFsaXphdGlvbk5vZGUsIE5ld0FycmF5Tm9kZSwgUHJpbnROb2RlLCBDYXN0TWFudWFsbHlOb2RlLCBFbnVtRGVjbGFyYXRpb25Ob2RlLCBUZXJtTm9kZSwgU3dpdGNoTm9kZSwgU2NvcGVOb2RlLCBQYXJhbWV0ZXJOb2RlLCBGb3JOb2RlT3ZlckNvbGxlY2lvbiwgQ29uc3RydWN0b3JDYWxsTm9kZSB9IGZyb20gXCIuL0FTVC5qc1wiO1xyXG5pbXBvcnQgeyBMYWJlbE1hbmFnZXIgfSBmcm9tIFwiLi9MYWJlbE1hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgTW9kdWxlLCBNb2R1bGVTdG9yZSwgTWV0aG9kQ2FsbFBvc2l0aW9uIH0gZnJvbSBcIi4vTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IEFzc2lnbm1lbnRTdGF0ZW1lbnQsIEluaXRTdGFja2ZyYW1lU3RhdGVtZW50LCBKdW1wQWx3YXlzU3RhdGVtZW50LCBQcm9ncmFtLCBTdGF0ZW1lbnQsIEJlZ2luQXJyYXlTdGF0ZW1lbnQsIE5ld09iamVjdFN0YXRlbWVudCwgSnVtcE9uU3dpdGNoU3RhdGVtZW50LCBCcmVha3BvaW50LCBFeHRlbmRlZEZvckxvb3BDaGVja0NvdW50ZXJBbmRHZXRFbGVtZW50IH0gZnJvbSBcIi4vUHJvZ3JhbS5qc1wiO1xyXG5pbXBvcnQgeyBTeW1ib2xUYWJsZSB9IGZyb20gXCIuL1N5bWJvbFRhYmxlLmpzXCI7XHJcbmltcG9ydCB7IEVudW0sIEVudW1JbmZvIH0gZnJvbSBcIi4uL3R5cGVzL0VudW0uanNcIjtcclxuaW1wb3J0IHsgSW5wdXRDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9JbnB1dC5qc1wiO1xyXG5cclxudHlwZSBTdGFja1R5cGUgPSB7XHJcbiAgICB0eXBlOiBUeXBlLFxyXG4gICAgaXNBc3NpZ25hYmxlOiBib29sZWFuLFxyXG4gICAgaXNTdXBlcj86IGJvb2xlYW4sIC8vIHVzZWQgZm9yIG1ldGhvZCBjYWxscyB3aXRoIHN1cGVyLlxyXG4gICAgd2l0aFJldHVyblN0YXRlbWVudD86IGJvb2xlYW5cclxufTtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb2RlR2VuZXJhdG9yIHtcclxuXHJcbiAgICBzdGF0aWMgYXNzaWdubWVudE9wZXJhdG9ycyA9IFtUb2tlblR5cGUuYXNzaWdubWVudCwgVG9rZW5UeXBlLnBsdXNBc3NpZ25tZW50LCBUb2tlblR5cGUubWludXNBc3NpZ25tZW50LFxyXG4gICAgVG9rZW5UeXBlLm11bHRpcGxpY2F0aW9uQXNzaWdubWVudCwgVG9rZW5UeXBlLmRpdmlzaW9uQXNzaWdubWVudCwgVG9rZW5UeXBlLkFOREFzc2lnbWVudCwgVG9rZW5UeXBlLk9SQXNzaWdtZW50LFxyXG4gICAgVG9rZW5UeXBlLlhPUkFzc2lnbWVudCwgVG9rZW5UeXBlLnNoaWZ0TGVmdEFzc2lnbWVudCwgVG9rZW5UeXBlLnNoaWZ0UmlnaHRBc3NpZ21lbnQsIFRva2VuVHlwZS5zaGlmdFJpZ2h0VW5zaWduZWRBc3NpZ21lbnRdO1xyXG5cclxuICAgIG1vZHVsZVN0b3JlOiBNb2R1bGVTdG9yZTtcclxuICAgIG1vZHVsZTogTW9kdWxlO1xyXG5cclxuICAgIHN5bWJvbFRhYmxlU3RhY2s6IFN5bWJvbFRhYmxlW107XHJcbiAgICBjdXJyZW50U3ltYm9sVGFibGU6IFN5bWJvbFRhYmxlO1xyXG5cclxuICAgIGhlYXA6IEhlYXA7XHJcblxyXG4gICAgY3VycmVudFByb2dyYW06IFByb2dyYW07XHJcblxyXG4gICAgZXJyb3JMaXN0OiBFcnJvcltdO1xyXG5cclxuICAgIG5leHRGcmVlUmVsYXRpdmVTdGFja1BvczogbnVtYmVyO1xyXG5cclxuICAgIGJyZWFrTm9kZVN0YWNrOiBKdW1wQWx3YXlzU3RhdGVtZW50W11bXTtcclxuICAgIGNvbnRpbnVlTm9kZVN0YWNrOiBKdW1wQWx3YXlzU3RhdGVtZW50W11bXTtcclxuXHJcbiAgICBzdGFydEFkaG9jQ29tcGlsYXRpb24obW9kdWxlOiBNb2R1bGUsIG1vZHVsZVN0b3JlOiBNb2R1bGVTdG9yZSwgc3ltYm9sVGFibGU6IFN5bWJvbFRhYmxlLCBoZWFwOiBIZWFwKTogRXJyb3JbXSB7XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlU3RvcmUgPSBtb2R1bGVTdG9yZTtcclxuICAgICAgICB0aGlzLm1vZHVsZSA9IG1vZHVsZTtcclxuXHJcbiAgICAgICAgdGhpcy5zeW1ib2xUYWJsZVN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5zeW1ib2xUYWJsZVN0YWNrLnB1c2goc3ltYm9sVGFibGUpO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlID0gc3ltYm9sVGFibGU7XHJcblxyXG4gICAgICAgIHRoaXMuaGVhcCA9IGhlYXA7XHJcblxyXG4gICAgICAgIGxldCBvbGRTdGFja2ZyYW1lU2l6ZSA9IHN5bWJvbFRhYmxlLnN0YWNrZnJhbWVTaXplO1xyXG4gICAgICAgIHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zID0gb2xkU3RhY2tmcmFtZVNpemU7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBudWxsO1xyXG4gICAgICAgIHRoaXMuZXJyb3JMaXN0ID0gW107XHJcblxyXG4gICAgICAgIHRoaXMuYnJlYWtOb2RlU3RhY2sgPSBbXTtcclxuICAgICAgICB0aGlzLmNvbnRpbnVlTm9kZVN0YWNrID0gW107XHJcblxyXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVNYWluKHRydWUpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5lcnJvckxpc3Q7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHN0YXJ0KG1vZHVsZTogTW9kdWxlLCBtb2R1bGVTdG9yZTogTW9kdWxlU3RvcmUpIHtcclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGVTdG9yZSA9IG1vZHVsZVN0b3JlO1xyXG4gICAgICAgIHRoaXMubW9kdWxlID0gbW9kdWxlO1xyXG5cclxuICAgICAgICB0aGlzLnN5bWJvbFRhYmxlU3RhY2sgPSBbXTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZSA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBudWxsO1xyXG4gICAgICAgIHRoaXMuZXJyb3JMaXN0ID0gW107XHJcblxyXG4gICAgICAgIHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zID0gMDtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubW9kdWxlLnRva2VuTGlzdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGxldCBsYXN0VG9rZW4gPSB0aGlzLm1vZHVsZS50b2tlbkxpc3RbdGhpcy5tb2R1bGUudG9rZW5MaXN0Lmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICB0aGlzLm1vZHVsZS5tYWluU3ltYm9sVGFibGUucG9zaXRpb25UbyA9IHsgbGluZTogbGFzdFRva2VuLnBvc2l0aW9uLmxpbmUsIGNvbHVtbjogbGFzdFRva2VuLnBvc2l0aW9uLmNvbHVtbiArIDEsIGxlbmd0aDogMSB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zeW1ib2xUYWJsZVN0YWNrLnB1c2godGhpcy5tb2R1bGUubWFpblN5bWJvbFRhYmxlKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZSA9IHRoaXMubW9kdWxlLm1haW5TeW1ib2xUYWJsZTtcclxuXHJcbiAgICAgICAgdGhpcy5icmVha05vZGVTdGFjayA9IFtdO1xyXG4gICAgICAgIHRoaXMuY29udGludWVOb2RlU3RhY2sgPSBbXTtcclxuXHJcbiAgICAgICAgdGhpcy5nZW5lcmF0ZU1haW4oKTtcclxuXHJcbiAgICAgICAgdGhpcy5nZW5lcmF0ZUNsYXNzZXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5sb29rRm9yU3RhdGljVm9pZE1haW4oKTtcclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGUuZXJyb3JzWzNdID0gdGhpcy5lcnJvckxpc3Q7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGxvb2tGb3JTdGF0aWNWb2lkTWFpbigpIHtcclxuXHJcbiAgICAgICAgbGV0IG1haW5Qcm9ncmFtID0gdGhpcy5tb2R1bGUubWFpblByb2dyYW07XHJcblxyXG4gICAgICAgIGlmIChtYWluUHJvZ3JhbSAhPSBudWxsICYmIG1haW5Qcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID4gMikgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgbWFpbk1ldGhvZDogTWV0aG9kID0gbnVsbDtcclxuICAgICAgICBsZXQgc3RhdGljQ2xhc3M6IFN0YXRpY0NsYXNzID0gbnVsbDtcclxuICAgICAgICBsZXQgY2xhc3NOb2RlMTogQVNUTm9kZTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY2xhc3NOb2RlIG9mIHRoaXMubW9kdWxlLmNsYXNzRGVmaW5pdGlvbnNBU1QpIHtcclxuICAgICAgICAgICAgaWYgKGNsYXNzTm9kZS50eXBlID09IFRva2VuVHlwZS5rZXl3b3JkQ2xhc3MpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY3QgPSBjbGFzc05vZGUucmVzb2x2ZWRUeXBlO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IG0gb2YgY3Quc3RhdGljQ2xhc3MubWV0aG9kcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtLmlkZW50aWZpZXIgPT0gXCJtYWluXCIgJiYgbS5wYXJhbWV0ZXJsaXN0LnBhcmFtZXRlcnMubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHB0ID0gbS5wYXJhbWV0ZXJsaXN0LnBhcmFtZXRlcnNbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwdC50eXBlIGluc3RhbmNlb2YgQXJyYXlUeXBlICYmIHB0LnR5cGUuYXJyYXlPZlR5cGUgPT0gc3RyaW5nUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1haW5NZXRob2QgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRXMgZXhpc3RpZXJlbiBtZWhyZXJlIEtsYXNzZW4gbWl0IHN0YXRpc2NoZW4gbWFpbi1NZXRob2Rlbi5cIiwgY2xhc3NOb2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFpbk1ldGhvZCA9IG07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGljQ2xhc3MgPSBjdC5zdGF0aWNDbGFzcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05vZGUxID0gY2xhc3NOb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobWFpbk1ldGhvZCAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgcG9zaXRpb246IFRleHRQb3NpdGlvbiA9IG1haW5NZXRob2QudXNhZ2VQb3NpdGlvbnNbMF07XHJcbiAgICAgICAgICAgIGlmIChtYWluTWV0aG9kLnByb2dyYW0gIT0gbnVsbCAmJiBtYWluTWV0aG9kLnByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbiA9IG1haW5NZXRob2QucHJvZ3JhbS5zdGF0ZW1lbnRzWzBdLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmluaXRDdXJyZW50UHJvZ3JhbSgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb2R1bGUubWFpblByb2dyYW0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhbe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhbGxNYWluTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogbWFpbk1ldGhvZCxcclxuICAgICAgICAgICAgICAgIHN0YXRpY0NsYXNzOiBzdGF0aWNDbGFzc1xyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2xvc2VTdGFja2ZyYW1lLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG1haW5NZXRob2QudXNhZ2VQb3NpdGlvbnMuZ2V0KHRoaXMubW9kdWxlKVswXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF0sIGZhbHNlKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZW5lcmF0ZUNsYXNzZXMoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubW9kdWxlLmNsYXNzRGVmaW5pdGlvbnNBU1QgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBjbGFzc05vZGUgb2YgdGhpcy5tb2R1bGUuY2xhc3NEZWZpbml0aW9uc0FTVCkge1xyXG4gICAgICAgICAgICBpZiAoY2xhc3NOb2RlLnR5cGUgPT0gVG9rZW5UeXBlLmtleXdvcmRDbGFzcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZUNsYXNzKGNsYXNzTm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGNsYXNzTm9kZS50eXBlID09IFRva2VuVHlwZS5rZXl3b3JkRW51bSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZUVudW0oY2xhc3NOb2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoY2xhc3NOb2RlLnR5cGUgPT0gVG9rZW5UeXBlLmtleXdvcmRJbnRlcmZhY2UpIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbnRlcmYgPSBjbGFzc05vZGUucmVzb2x2ZWRUeXBlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGludGVyZiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVja0RvdWJsZU1ldGhvZERlY2xhcmF0aW9uKGludGVyZik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZW5lcmF0ZUVudW0oZW51bU5vZGU6IEVudW1EZWNsYXJhdGlvbk5vZGUpIHtcclxuXHJcbiAgICAgICAgaWYgKGVudW1Ob2RlLnJlc29sdmVkVHlwZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIHRoaXMucHVzaE5ld1N5bWJvbFRhYmxlKGZhbHNlLCBlbnVtTm9kZS5zY29wZUZyb20sIGVudW1Ob2RlLnNjb3BlVG8pO1xyXG5cclxuICAgICAgICBsZXQgZW51bUNsYXNzID0gPEVudW0+ZW51bU5vZGUucmVzb2x2ZWRUeXBlO1xyXG5cclxuICAgICAgICAvLyB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKGVudW1Ob2RlLnBvc2l0aW9uLCBlbnVtQ2xhc3MpO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQgPSBlbnVtQ2xhc3M7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IGVudW1DbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW07XHJcblxyXG4gICAgICAgIGZvciAobGV0IGF0dHJpYnV0ZSBvZiBlbnVtTm9kZS5hdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGUgIT0gbnVsbCAmJiAhYXR0cmlidXRlLmlzU3RhdGljICYmIGF0dHJpYnV0ZS5pbml0aWFsaXphdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGVudW1DbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnJldHVybixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmxhc3RTdGF0ZW1lbnQucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBjb3B5UmV0dXJuVmFsdWVUb1N0YWNrZnJhbWVQb3MwOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBsZWF2ZVRoaXNPYmplY3RPblN0YWNrOiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlc29sdmVOb2RlcygpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtZXRob2ROb2RlIG9mIGVudW1Ob2RlLm1ldGhvZHMpIHtcclxuICAgICAgICAgICAgaWYgKG1ldGhvZE5vZGUgIT0gbnVsbCAmJiAhbWV0aG9kTm9kZS5pc0Fic3RyYWN0ICYmICFtZXRob2ROb2RlLmlzU3RhdGljKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbXBpbGVNZXRob2QobWV0aG9kTm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUobnVsbCk7XHJcblxyXG4gICAgICAgIC8vIGNvbnN0cnVjdG9yIGNhbGxzXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIGVudW1Ob2RlLnNjb3BlRnJvbSwgZW51bU5vZGUuc2NvcGVUbyk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGVudW1WYWx1ZU5vZGUgb2YgZW51bU5vZGUudmFsdWVzKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoZW51bVZhbHVlTm9kZS5jb25zdHJ1Y3RvclBhcmFtZXRlcnMgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwOiBQcm9ncmFtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZHVsZTogdGhpcy5tb2R1bGUsXHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWxNYW5hZ2VyOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtdXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHA7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hFbnVtVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGVudW1WYWx1ZU5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgZW51bUNsYXNzOiBlbnVtQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVJZGVudGlmaWVyOiBlbnVtVmFsdWVOb2RlLmlkZW50aWZpZXJcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0VudW1Db25zdHJ1Y3RvckNhbGwoZW51bUNsYXNzLCBlbnVtVmFsdWVOb2RlLmNvbnN0cnVjdG9yUGFyYW1ldGVycyxcclxuICAgICAgICAgICAgICAgICAgICBlbnVtVmFsdWVOb2RlLnBvc2l0aW9uLCBlbnVtVmFsdWVOb2RlLmNvbW1hUG9zaXRpb25zLCBlbnVtVmFsdWVOb2RlLnJpZ2h0QnJhY2tldFBvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHJvZ3JhbUVuZCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogZW51bVZhbHVlTm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBlbnVtSW5mbzogRW51bUluZm8gPSBlbnVtQ2xhc3MuaWRlbnRpZmllclRvSW5mb01hcFtlbnVtVmFsdWVOb2RlLmlkZW50aWZpZXJdO1xyXG4gICAgICAgICAgICAgICAgZW51bUluZm8uY29uc3RydWN0b3JDYWxsUHJvZ3JhbSA9IHA7XHJcbiAgICAgICAgICAgICAgICBlbnVtSW5mby5wb3NpdGlvbiA9IGVudW1WYWx1ZU5vZGUucG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZShudWxsKTtcclxuXHJcblxyXG4gICAgICAgIC8vIHN0YXRpYyBhdHRyaWJ1dGVzL21ldGhvZHNcclxuICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZShmYWxzZSwgZW51bU5vZGUuc2NvcGVGcm9tLCBlbnVtTm9kZS5zY29wZVRvKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0ID0gZW51bUNsYXNzLnN0YXRpY0NsYXNzO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBlbnVtQ2xhc3Muc3RhdGljQ2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgb2YgZW51bU5vZGUuYXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlICE9IG51bGwgJiYgYXR0cmlidXRlLmlzU3RhdGljICYmIGF0dHJpYnV0ZS5pbml0aWFsaXphdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXIucmVzb2x2ZU5vZGVzKCk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IG1ldGhvZE5vZGUgb2YgZW51bU5vZGUubWV0aG9kcykge1xyXG4gICAgICAgICAgICBpZiAobWV0aG9kTm9kZSAhPSBudWxsICYmIG1ldGhvZE5vZGUuaXNTdGF0aWMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29tcGlsZU1ldGhvZChtZXRob2ROb2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNoZWNrRG91YmxlTWV0aG9kRGVjbGFyYXRpb24oZW51bUNsYXNzKTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZShudWxsKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc0VudW1Db25zdHJ1Y3RvckNhbGwoZW51bUNsYXNzOiBFbnVtLCBwYXJhbWV0ZXJOb2RlczogVGVybU5vZGVbXSxcclxuICAgICAgICBwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCBjb21tYVBvc2l0aW9uczogVGV4dFBvc2l0aW9uW10sIHJpZ2h0QnJhY2tldFBvc2l0aW9uOiBUZXh0UG9zaXRpb24pIHtcclxuICAgICAgICBsZXQgcGFyYW1ldGVyVHlwZXM6IFR5cGVbXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBwIG9mIHBhcmFtZXRlck5vZGVzKSB7XHJcbiAgICAgICAgICAgIGxldCB0eXBlTm9kZSA9IHRoaXMucHJvY2Vzc05vZGUocCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlTm9kZSA9PSBudWxsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgcGFyYW1ldGVyVHlwZXMucHVzaCh0eXBlTm9kZS50eXBlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtZXRob2RzID0gZW51bUNsYXNzLmdldE1ldGhvZHNUaGF0Rml0V2l0aENhc3RpbmcoZW51bUNsYXNzLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgIHBhcmFtZXRlclR5cGVzLCB0cnVlLCBWaXNpYmlsaXR5LnByaXZhdGUpO1xyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZS5wdXNoTWV0aG9kQ2FsbFBvc2l0aW9uKHBvc2l0aW9uLCBjb21tYVBvc2l0aW9ucywgZW51bUNsYXNzLmdldE1ldGhvZHMoVmlzaWJpbGl0eS5wcml2YXRlLCBlbnVtQ2xhc3MuaWRlbnRpZmllciksIHJpZ2h0QnJhY2tldFBvc2l0aW9uKTtcclxuXHJcblxyXG4gICAgICAgIGlmIChtZXRob2RzLmVycm9yICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IobWV0aG9kcy5lcnJvciwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07IC8vIHRyeSB0byBjb250aW51ZS4uLlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZCA9IG1ldGhvZHMubWV0aG9kTGlzdFswXTtcclxuXHJcbiAgICAgICAgbGV0IGRlc3RUeXBlOiBUeXBlID0gbnVsbDtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcmFtZXRlclR5cGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChpIDwgbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkpIHsgIC8vIHBvc3NpYmxlIGVsbGlwc2lzIVxyXG4gICAgICAgICAgICAgICAgZGVzdFR5cGUgPSBtZXRob2QuZ2V0UGFyYW1ldGVyVHlwZShpKTtcclxuICAgICAgICAgICAgICAgIGlmIChpID09IG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpIC0gMSAmJiBtZXRob2QuaGFzRWxsaXBzaXMoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc3RUeXBlID0gKDxBcnJheVR5cGU+ZGVzdFR5cGUpLmFycmF5T2ZUeXBlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgc3JjVHlwZSA9IHBhcmFtZXRlclR5cGVzW2ldO1xyXG4gICAgICAgICAgICBpZiAoIXNyY1R5cGUuZXF1YWxzKGRlc3RUeXBlKSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzcmNUeXBlIGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSAmJiBkZXN0VHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3JjVHlwZS5nZXRDYXN0SW5mb3JtYXRpb24oZGVzdFR5cGUpLm5lZWRzU3RhdGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhc3RWYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3VHlwZTogZGVzdFR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1Bvc1JlbGF0aXZlOiAtcGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSArIGlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHN0YWNrZnJhbWVEZWx0YSA9IDA7XHJcbiAgICAgICAgaWYgKG1ldGhvZC5oYXNFbGxpcHNpcygpKSB7XHJcbiAgICAgICAgICAgIGxldCBlbGxpcHNpc1BhcmFtZXRlckNvdW50ID0gcGFyYW1ldGVyVHlwZXMubGVuZ3RoIC0gbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgKyAxOyAvLyBsYXN0IHBhcmFtZXRlciBhbmQgc3Vic2VxdWVudCBvbmVzXHJcbiAgICAgICAgICAgIHN0YWNrZnJhbWVEZWx0YSA9IC0gKGVsbGlwc2lzUGFyYW1ldGVyQ291bnQgLSAxKTtcclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubWFrZUVsbGlwc2lzQXJyYXksXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogcGFyYW1ldGVyTm9kZXNbbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxXS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlckNvdW50OiBlbGxpcHNpc1BhcmFtZXRlckNvdW50LFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGFycmF5VHlwZTogbWV0aG9kLmdldFBhcmFtZXRlcihtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSAtIDEpLnR5cGVcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBpc1N1cGVyQ2FsbDogZmFsc2UsXHJcbiAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLShwYXJhbWV0ZXJUeXBlcy5sZW5ndGggKyAxICsgc3RhY2tmcmFtZURlbHRhKSAvLyB0aGlzLW9iamVjdCBmb2xsb3dlZCBieSBwYXJhbWV0ZXJzXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2VuZXJhdGVDbGFzcyhjbGFzc05vZGU6IENsYXNzRGVjbGFyYXRpb25Ob2RlKSB7XHJcblxyXG4gICAgICAgIGlmIChjbGFzc05vZGUucmVzb2x2ZWRUeXBlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIGNsYXNzTm9kZS5zY29wZUZyb20sIGNsYXNzTm9kZS5zY29wZVRvKTtcclxuXHJcbiAgICAgICAgbGV0IGtsYXNzID0gPEtsYXNzPmNsYXNzTm9kZS5yZXNvbHZlZFR5cGU7XHJcblxyXG4gICAgICAgIC8vdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihjbGFzc05vZGUucG9zaXRpb24sIGtsYXNzKTtcclxuXHJcbiAgICAgICAgbGV0IGluaGVyaXRhbmNlRXJyb3IgPSBrbGFzcy5jaGVja0luaGVyaXRhbmNlKCk7XHJcblxyXG4gICAgICAgIGlmIChpbmhlcml0YW5jZUVycm9yLm1lc3NhZ2UgIT0gXCJcIikge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihpbmhlcml0YW5jZUVycm9yLm1lc3NhZ2UsIGNsYXNzTm9kZS5wb3NpdGlvbiwgXCJlcnJvclwiLCB0aGlzLmdldEluaGVyaXRhbmNlUXVpY2tGaXgoY2xhc3NOb2RlLnNjb3BlVG8sIGluaGVyaXRhbmNlRXJyb3IpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBiYXNlQ2xhc3MgPSBrbGFzcy5iYXNlQ2xhc3M7XHJcbiAgICAgICAgaWYgKGJhc2VDbGFzcyAhPSBudWxsICYmIGJhc2VDbGFzcy5tb2R1bGUgIT0ga2xhc3MubW9kdWxlICYmIGJhc2VDbGFzcy52aXNpYmlsaXR5ID09IFZpc2liaWxpdHkucHJpdmF0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBCYXNpc2tsYXNzZSBcIiArIGJhc2VDbGFzcy5pZGVudGlmaWVyICsgXCIgZGVyIEtsYXNzZSBcIiArIGtsYXNzLmlkZW50aWZpZXIgKyBcIiBpc3QgaGllciBuaWNodCBzaWNodGJhci5cIiwgY2xhc3NOb2RlLnBvc2l0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dCA9IGtsYXNzO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBrbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW07XHJcblxyXG4gICAgICAgIGZvciAobGV0IGF0dHJpYnV0ZSBvZiBjbGFzc05vZGUuYXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlICE9IG51bGwgJiYgIWF0dHJpYnV0ZS5pc1N0YXRpYyAmJiBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplQXR0cmlidXRlKGF0dHJpYnV0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChrbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnJldHVybixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmxhc3RTdGF0ZW1lbnQucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBjb3B5UmV0dXJuVmFsdWVUb1N0YWNrZnJhbWVQb3MwOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBsZWF2ZVRoaXNPYmplY3RPblN0YWNrOiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlc29sdmVOb2RlcygpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtZXRob2ROb2RlIG9mIGNsYXNzTm9kZS5tZXRob2RzKSB7XHJcbiAgICAgICAgICAgIGlmIChtZXRob2ROb2RlICE9IG51bGwgJiYgIW1ldGhvZE5vZGUuaXNBYnN0cmFjdCAmJiAhbWV0aG9kTm9kZS5pc1N0YXRpYykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21waWxlTWV0aG9kKG1ldGhvZE5vZGUpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG06IE1ldGhvZCA9IG1ldGhvZE5vZGUucmVzb2x2ZWRUeXBlO1xyXG4gICAgICAgICAgICAgICAgaWYgKG0gIT0gbnVsbCAmJiBtLmFubm90YXRpb24gPT0gXCJAT3ZlcnJpZGVcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChrbGFzcy5iYXNlQ2xhc3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2xhc3MuYmFzZUNsYXNzLmdldE1ldGhvZEJ5U2lnbmF0dXJlKG0uc2lnbmF0dXJlKSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBNZXRob2RlIFwiICsgbS5zaWduYXR1cmUgKyBcIiBpc3QgbWl0IEBPdmVycmlkZSBhbm5vdGllcnQsIMO8YmVyc2NocmVpYnQgYWJlciBrZWluZSBNZXRob2RlIGdsZWljaGVyIFNpZ25hdHVyIGVpbmVyIE9iZXJrbGFzc2UuXCIsIG1ldGhvZE5vZGUucG9zaXRpb24sIFwid2FybmluZ1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2hlY2tEb3VibGVNZXRob2REZWNsYXJhdGlvbihrbGFzcyk7XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUobnVsbCk7XHJcblxyXG4gICAgICAgIC8vIHN0YXRpYyBhdHRyaWJ1dGVzL21ldGhvZHNcclxuICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZShmYWxzZSwgY2xhc3NOb2RlLnNjb3BlRnJvbSwgY2xhc3NOb2RlLnNjb3BlVG8pO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQgPSBrbGFzcy5zdGF0aWNDbGFzcztcclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0ga2xhc3Muc3RhdGljQ2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgb2YgY2xhc3NOb2RlLmF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZSAhPSBudWxsICYmIGF0dHJpYnV0ZS5pc1N0YXRpYyAmJiBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplQXR0cmlidXRlKGF0dHJpYnV0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChrbGFzcy5zdGF0aWNDbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnJldHVybixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmxhc3RTdGF0ZW1lbnQucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBjb3B5UmV0dXJuVmFsdWVUb1N0YWNrZnJhbWVQb3MwOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBsZWF2ZVRoaXNPYmplY3RPblN0YWNrOiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlc29sdmVOb2RlcygpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtZXRob2ROb2RlIG9mIGNsYXNzTm9kZS5tZXRob2RzKSB7XHJcbiAgICAgICAgICAgIGlmIChtZXRob2ROb2RlICE9IG51bGwgJiYgbWV0aG9kTm9kZS5pc1N0YXRpYykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21waWxlTWV0aG9kKG1ldGhvZE5vZGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnBvcFN5bWJvbFRhYmxlKG51bGwpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjaGVja0RvdWJsZU1ldGhvZERlY2xhcmF0aW9uKGNpZTogS2xhc3MgfCBJbnRlcmZhY2UpIHsgIC8vIE4uQi46IEVudW0gZXh0ZW5kcyBLbGFzc1xyXG5cclxuICAgICAgICBsZXQgc2lnbmF0dXJlTWFwOiB7IFtrZXk6IHN0cmluZ106IE1ldGhvZCB9ID0ge307XHJcblxyXG4gICAgICAgIGZvciAobGV0IG0gb2YgY2llLm1ldGhvZHMpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBzaWduYXR1cmUgPSBtLmdldFNpZ25hdHVyZVdpdGhSZXR1cm5QYXJhbWV0ZXIoKTtcclxuICAgICAgICAgICAgaWYgKHNpZ25hdHVyZU1hcFtzaWduYXR1cmVdICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY2llVHlwZTogU3RyaW5nID0gXCJJbiBkZXIgS2xhc3NlIFwiO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNpZSBpbnN0YW5jZW9mIEludGVyZmFjZSkgY2llVHlwZSA9IFwiSW0gSW50ZXJmYWNlIFwiO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNpZSBpbnN0YW5jZW9mIEVudW0pIGNpZVR5cGUgPSBcIkltIEVudW0gXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoY2llVHlwZSArIGNpZS5pZGVudGlmaWVyICsgXCIgZ2lidCBlcyB6d2VpIE1ldGhvZGVuIG1pdCBkZXJzZWxiZW4gU2lnbmF0dXI6IFwiICsgc2lnbmF0dXJlLCBtLnVzYWdlUG9zaXRpb25zLmdldCh0aGlzLm1vZHVsZSlbMF0sIFwiZXJyb3JcIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihjaWVUeXBlICsgY2llLmlkZW50aWZpZXIgKyBcIiBnaWJ0IGVzIHp3ZWkgTWV0aG9kZW4gbWl0IGRlcnNlbGJlbiBTaWduYXR1cjogXCIgKyBzaWduYXR1cmUsIHNpZ25hdHVyZU1hcFtzaWduYXR1cmVdLnVzYWdlUG9zaXRpb25zLmdldCh0aGlzLm1vZHVsZSlbMF0sIFwiZXJyb3JcIik7XHJcblxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2lnbmF0dXJlTWFwW3NpZ25hdHVyZV0gPSBtO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0SW5oZXJpdGFuY2VRdWlja0ZpeChwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCBpbmhlcml0YW5jZUVycm9yOiB7IG1lc3NhZ2U6IHN0cmluZzsgbWlzc2luZ01ldGhvZHM6IE1ldGhvZFtdOyB9KTogUXVpY2tGaXgge1xyXG5cclxuICAgICAgICBsZXQgczogc3RyaW5nID0gXCJcIjtcclxuICAgICAgICBmb3IgKGxldCBtIG9mIGluaGVyaXRhbmNlRXJyb3IubWlzc2luZ01ldGhvZHMpIHtcclxuICAgICAgICAgICAgcyArPSBcIlxcdHB1YmxpYyBcIiArIChtLnJldHVyblR5cGUgPT0gbnVsbCA/IFwiIHZvaWRcIiA6IGdldFR5cGVJZGVudGlmaWVyKG0ucmV0dXJuVHlwZSkpICsgXCIgXCIgKyBtLmlkZW50aWZpZXIgKyBcIihcIjtcclxuICAgICAgICAgICAgcyArPSBtLnBhcmFtZXRlcmxpc3QucGFyYW1ldGVycy5tYXAocCA9PiBnZXRUeXBlSWRlbnRpZmllcihwLnR5cGUpICsgXCIgXCIgKyBwLmlkZW50aWZpZXIpLmpvaW4oXCIsIFwiKTtcclxuICAgICAgICAgICAgcyArPSBcIikge1xcblxcdFxcdC8vVE9ETzogTWV0aG9kZSBmw7xsbGVuXFxuXFx0fVxcblxcblwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiRmVobGVuZGUgTWV0aG9kZW4gZWluZsO8Z2VuXCIsXHJcbiAgICAgICAgICAgIGVkaXRzUHJvdmlkZXI6ICh1cmkpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZTogdXJpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogeyBzdGFydExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmUsIHN0YXJ0Q29sdW1uOiBwb3NpdGlvbi5jb2x1bW4gLSAxLCBlbmRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lLCBlbmRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiAtIDEgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldFN1cGVyY29uc3RydWN0b3JDYWxscyhub2RlczogQVNUTm9kZVtdLCBzdXBlcmNvbnN0cnVjdG9yQ2FsbHNGb3VuZDogQVNUTm9kZVtdLCBpc0ZpcnN0U3RhdGVtZW50OiBib29sZWFuKTogYm9vbGVhbiB7XHJcbiAgICAgICAgZm9yIChsZXQgbm9kZSBvZiBub2Rlcykge1xyXG4gICAgICAgICAgICBpZiAobm9kZSA9PSBudWxsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBUb2tlblR5cGUuc3VwZXJDb25zdHJ1Y3RvckNhbGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWlzRmlyc3RTdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwZXJjb25zdHJ1Y3RvckNhbGxzRm91bmQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVpbiBLb25zdHJ1a3RvciBkYXJmIG51ciBlaW5lbiBlaW56aWdlbiBBdWZydWYgZGVzIFN1cGVya29uc3RydWt0b3JzIGVudGhhbHRlbi5cIiwgbm9kZS5wb3NpdGlvbiwgXCJlcnJvclwiKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIlZvciBkZW0gQXVmcnVmIGRlcyBTdXBlcmtvbnN0cnVrdG9ycyBkYXJmIGtlaW5lIGFuZGVyZSBBbndlaXN1bmcgc3RlaGVuLlwiLCBub2RlLnBvc2l0aW9uLCBcImVycm9yXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzdXBlcmNvbnN0cnVjdG9yQ2FsbHNGb3VuZC5wdXNoKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgaXNGaXJzdFN0YXRlbWVudCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGUudHlwZSA9PSBUb2tlblR5cGUuc2NvcGVOb2RlICYmIG5vZGUuc3RhdGVtZW50cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpc0ZpcnN0U3RhdGVtZW50ID0gaXNGaXJzdFN0YXRlbWVudCAmJiB0aGlzLmdldFN1cGVyY29uc3RydWN0b3JDYWxscyhub2RlLnN0YXRlbWVudHMsIHN1cGVyY29uc3RydWN0b3JDYWxsc0ZvdW5kLCBpc0ZpcnN0U3RhdGVtZW50KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlzRmlyc3RTdGF0ZW1lbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaXNGaXJzdFN0YXRlbWVudDtcclxuICAgIH1cclxuXHJcblxyXG4gICAgY29tcGlsZU1ldGhvZChtZXRob2ROb2RlOiBNZXRob2REZWNsYXJhdGlvbk5vZGUpIHtcclxuICAgICAgICAvLyBBc3N1bXB0aW9uOiBtZXRob2ROb2RlICE9IG51bGxcclxuICAgICAgICBsZXQgbWV0aG9kID0gbWV0aG9kTm9kZS5yZXNvbHZlZFR5cGU7XHJcblxyXG4gICAgICAgIHRoaXMuY2hlY2tJZk1ldGhvZElzVmlydHVhbChtZXRob2QpO1xyXG5cclxuICAgICAgICBpZiAobWV0aG9kID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgLy8gdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihtZXRob2ROb2RlLnBvc2l0aW9uLCBtZXRob2QpO1xyXG5cclxuICAgICAgICB0aGlzLmluaXRDdXJyZW50UHJvZ3JhbSgpO1xyXG4gICAgICAgIG1ldGhvZC5wcm9ncmFtID0gdGhpcy5jdXJyZW50UHJvZ3JhbTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIG1ldGhvZE5vZGUuc2NvcGVGcm9tLCBtZXRob2ROb2RlLnNjb3BlVG8pO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLm1ldGhvZCA9IG1ldGhvZDtcclxuXHJcbiAgICAgICAgbGV0IHN0YWNrUG9zOiBudW1iZXIgPSAxO1xyXG5cclxuICAgICAgICBmb3IgKGxldCB2IG9mIG1ldGhvZC5nZXRQYXJhbWV0ZXJMaXN0KCkucGFyYW1ldGVycykge1xyXG4gICAgICAgICAgICB2LnN0YWNrUG9zID0gc3RhY2tQb3MrKztcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLnZhcmlhYmxlTWFwLnNldCh2LmlkZW50aWZpZXIsIHYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gXCIgKyAxXCIgaXMgZm9yIFwidGhpc1wiLW9iamVjdFxyXG4gICAgICAgIHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zID0gbWV0aG9kTm9kZS5wYXJhbWV0ZXJzLmxlbmd0aCArIDE7XHJcblxyXG4gICAgICAgIGlmIChtZXRob2QuaXNDb25zdHJ1Y3RvciAmJiB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQgaW5zdGFuY2VvZiBLbGFzcyAmJiBtZXRob2ROb2RlLnN0YXRlbWVudHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgYzogS2xhc3MgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcblxyXG4gICAgICAgICAgICBsZXQgc3VwZXJjb25zdHJ1Y3RvckNhbGxzOiBBU1ROb2RlW10gPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5nZXRTdXBlcmNvbnN0cnVjdG9yQ2FsbHMobWV0aG9kTm9kZS5zdGF0ZW1lbnRzLCBzdXBlcmNvbnN0cnVjdG9yQ2FsbHMsIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHN1cGVyY29uc3RydWN0b3JDYWxsRW5zdXJlZDogYm9vbGVhbiA9IHN1cGVyY29uc3RydWN0b3JDYWxscy5sZW5ndGggPiAwO1xyXG5cclxuICAgICAgICAgICAgLy8gaWYgKG1ldGhvZE5vZGUuc3RhdGVtZW50cy5sZW5ndGggPiAwICYmIG1ldGhvZE5vZGUuc3RhdGVtZW50c1swXS50eXBlID09IFRva2VuVHlwZS5zY29wZU5vZGUpIHtcclxuICAgICAgICAgICAgLy8gICAgIGxldCBzdG0gPSBtZXRob2ROb2RlLnN0YXRlbWVudHNbMF0uc3RhdGVtZW50cztcclxuICAgICAgICAgICAgLy8gICAgIGlmIChzdG0ubGVuZ3RoID4gMCAmJiBbVG9rZW5UeXBlLnN1cGVyQ29uc3RydWN0b3JDYWxsLCBUb2tlblR5cGUuY29uc3RydWN0b3JDYWxsXS5pbmRleE9mKHN0bVswXS50eXBlKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgc3VwZXJjb25zdHJ1Y3RvckNhbGxFbnN1cmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAgICAgLy8gfSBlbHNlIGlmIChbVG9rZW5UeXBlLnN1cGVyQ29uc3RydWN0b3JDYWxsLCBUb2tlblR5cGUuY29uc3RydWN0b3JDYWxsXS5pbmRleE9mKG1ldGhvZE5vZGUuc3RhdGVtZW50c1swXS50eXBlKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIC8vICAgICBzdXBlcmNvbnN0cnVjdG9yQ2FsbEVuc3VyZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYyAhPSBudWxsICYmIGMuYmFzZUNsYXNzPy5oYXNDb25zdHJ1Y3RvcigpICYmICFjLmJhc2VDbGFzcz8uaGFzUGFyYW1ldGVybGVzc0NvbnN0cnVjdG9yKCkpIHtcclxuICAgICAgICAgICAgICAgIGxldCBlcnJvcjogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgaWYgKG1ldGhvZE5vZGUuc3RhdGVtZW50cyA9PSBudWxsIHx8IG1ldGhvZE5vZGUuc3RhdGVtZW50cy5sZW5ndGggPT0gMCkgZXJyb3IgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yID0gIXN1cGVyY29uc3RydWN0b3JDYWxsRW5zdXJlZDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBxdWlja0ZpeDogUXVpY2tGaXggPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBjb25zdHJ1Y3RvcnMgPSBjLmJhc2VDbGFzcy5tZXRob2RzLmZpbHRlcihtID0+IG0uaXNDb25zdHJ1Y3Rvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnN0cnVjdG9ycy5sZW5ndGggPT0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbWV0aG9kQ2FsbCA9IFwic3VwZXIoXCIgKyBjb25zdHJ1Y3RvcnNbMF0ucGFyYW1ldGVybGlzdC5wYXJhbWV0ZXJzLm1hcChwID0+IHAuaWRlbnRpZmllcikuam9pbihcIiwgXCIpICsgXCIpO1wiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb24gPSBtZXRob2ROb2RlLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWlja0ZpeCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQXVmcnVmIGRlcyBLb25zdHJ1a3RvcnMgZGVyIEJhc2lza2xhc3NlIGVpbmbDvGdlbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLzA2LjA2LjIwMjBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRzUHJvdmlkZXI6ICh1cmkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2U6IHVyaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmUgKyAxLCBzdGFydENvbHVtbjogMCwgZW5kTGluZU51bWJlcjogcG9zaXRpb24ubGluZSArIDEsIGVuZENvbHVtbjogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldmVyaXR5OiBtb25hY28uTWFya2VyU2V2ZXJpdHkuRXJyb3JcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIlxcdFxcdFwiICsgbWV0aG9kQ2FsbCArIFwiXFxuXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIEJhc2lza2xhc3NlIGRlciBLbGFzc2UgXCIgKyBjLmlkZW50aWZpZXIgKyBcIiBiZXNpdHp0IGtlaW5lbiBwYXJhbWV0ZXJsb3NlbiBLb25zdHJ1a3RvciwgZGFoZXIgbXVzcyBkaWVzZSBLb25zdHJ1a3RvcmRlZmluaXRpb24gbWl0IGVpbmVtIEF1ZnJ1ZiBlaW5lcyBLb25zdHJ1a3RvcnMgZGVyIEJhc2lza2xhc3NlIChzdXBlciguLi4pKSBiZWdpbm5lbi5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kTm9kZS5wb3NpdGlvbiwgXCJlcnJvclwiLCBxdWlja0ZpeCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIXN1cGVyY29uc3RydWN0b3JDYWxsRW5zdXJlZCAmJiBjLmJhc2VDbGFzcz8uaGFzUGFyYW1ldGVybGVzc0NvbnN0cnVjdG9yKCkpIHtcclxuICAgICAgICAgICAgICAgIC8vIGludm9rZSBwYXJhbWV0ZXJsZXNzIGNvbnN0cnVjdG9yXHJcbiAgICAgICAgICAgICAgICBsZXQgYmFzZUNsYXNzQ29uc3RydWN0b3IgPSBjLmJhc2VDbGFzcy5nZXRQYXJhbWV0ZXJsZXNzQ29uc3RydWN0b3IoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoW1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFB1c2ggdGhpcy1vYmplY3QgdG8gc3RhY2s6XHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbWV0aG9kTm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiAwXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IGJhc2VDbGFzc0NvbnN0cnVjdG9yLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1N1cGVyQ2FsbDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG1ldGhvZE5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLTEgLy8gdGhpcy1vYmplY3QgZm9sbG93ZWQgYnkgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYWN0b3JDbGFzcyA9IDxLbGFzcz50aGlzLm1vZHVsZVN0b3JlLmdldFR5cGUoXCJBY3RvclwiKS50eXBlO1xyXG4gICAgICAgIGxldCBtZXRob2RJZGVudGlmaWVycyA9IFtcImFjdFwiLCBcIm9uS2V5VHlwZWRcIiwgXCJvbktleURvd25cIiwgXCJvbktleVVwXCIsXHJcbiAgICAgICAgICAgIFwib25Nb3VzZURvd25cIiwgXCJvbk1vdXNlVXBcIiwgXCJvbk1vdXNlTW92ZVwiLCBcIm9uTW91c2VFbnRlclwiLCBcIm9uTW91c2VMZWF2ZVwiXTtcclxuICAgICAgICBpZiAobWV0aG9kSWRlbnRpZmllcnMuaW5kZXhPZihtZXRob2QuaWRlbnRpZmllcikgPj0gMCAmJiB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQuaGFzQW5jZXN0b3JPcklzKGFjdG9yQ2xhc3MpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoW1xyXG5cclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucmV0dXJuSWZEZXN0cm95ZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG1ldGhvZE5vZGUucG9zaXRpb25cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSB0aGlzLmdlbmVyYXRlU3RhdGVtZW50cyhtZXRob2ROb2RlLnN0YXRlbWVudHMpLndpdGhSZXR1cm5TdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgIGlmICghd2l0aFJldHVyblN0YXRlbWVudCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5yZXR1cm4sXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbWV0aG9kTm9kZS5zY29wZVRvLFxyXG4gICAgICAgICAgICAgICAgY29weVJldHVyblZhbHVlVG9TdGFja2ZyYW1lUG9zMDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBsZWF2ZVRoaXNPYmplY3RPblN0YWNrOiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxldCBydCA9IG1ldGhvZC5nZXRSZXR1cm5UeXBlKCk7XHJcbiAgICAgICAgICAgIGlmICghbWV0aG9kLmlzQ29uc3RydWN0b3IgJiYgcnQgIT0gbnVsbCAmJiBydCAhPSB2b2lkUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgRGVrbGFyYXRpb24gZGVyIE1ldGhvZGUgdmVybGFuZ3QgZGllIFLDvGNrZ2FiZSBlaW5lcyBXZXJ0ZXMgdm9tIFR5cCBcIiArIHJ0LmlkZW50aWZpZXIgKyBcIi4gRXMgZmVobHQgKG1pbmRlc3RlbnMpIGVpbmUgZW50c3ByZWNoZW5kZSByZXR1cm4tQW53ZWlzdW5nLlwiLCBtZXRob2ROb2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWV0aG9kLnJlc2VydmVTdGFja0ZvckxvY2FsVmFyaWFibGVzID0gdGhpcy5uZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3NcclxuICAgICAgICAgICAgLSBtZXRob2ROb2RlLnBhcmFtZXRlcnMubGVuZ3RoIC0gMTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZSgpO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlc29sdmVOb2RlcygpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNoZWNrcyBpZiBjaGlsZCBjbGFzc2VzIGhhdmUgbWV0aG9kIHdpdGggc2FtZSBzaWduYXR1cmVcclxuICAgICAqL1xyXG4gICAgY2hlY2tJZk1ldGhvZElzVmlydHVhbChtZXRob2Q6IE1ldGhvZCkge1xyXG5cclxuICAgICAgICBsZXQga2xhc3MgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcbiAgICAgICAgaWYgKGtsYXNzICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IG1vIG9mIHRoaXMubW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSkpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgb2YgbW8udHlwZVN0b3JlLnR5cGVMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgaW5zdGFuY2VvZiBLbGFzcyAmJiBjICE9IGtsYXNzICYmIGMuaGFzQW5jZXN0b3JPcklzKGtsYXNzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBtIG9mIGMubWV0aG9kcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG0gIT0gbnVsbCAmJiBtZXRob2QgIT0gbnVsbCAmJiBtLnNpZ25hdHVyZSA9PSBtZXRob2Quc2lnbmF0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kLmlzVmlydHVhbCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgaW5pdGlhbGl6ZUF0dHJpYnV0ZShhdHRyaWJ1dGU6IEF0dHJpYnV0ZURlY2xhcmF0aW9uTm9kZSkge1xyXG5cclxuICAgICAgICBpZiAoYXR0cmlidXRlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgLy8gYXNzdW1wdGlvbjogYXR0cmlidXRlICE9IG51bGxcclxuICAgICAgICBpZiAoYXR0cmlidXRlLmlkZW50aWZpZXIgPT0gbnVsbCB8fCBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24gPT0gbnVsbCB8fCBhdHRyaWJ1dGUucmVzb2x2ZWRUeXBlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKGF0dHJpYnV0ZS5pc1N0YXRpYykge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoU3RhdGljQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlSW5kZXg6IGF0dHJpYnV0ZS5yZXNvbHZlZFR5cGUuaW5kZXgsXHJcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJZGVudGlmaWVyOiBhdHRyaWJ1dGUucmVzb2x2ZWRUeXBlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogYXR0cmlidXRlLmluaXRpYWxpemF0aW9uLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAga2xhc3M6IDxTdGF0aWNDbGFzcz4odGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0KVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlSW5kZXg6IGF0dHJpYnV0ZS5yZXNvbHZlZFR5cGUuaW5kZXgsXHJcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJZGVudGlmaWVyOiBhdHRyaWJ1dGUuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICB1c2VUaGlzT2JqZWN0OiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGxldCBpbml0aWFsaXphdGlvblR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKGF0dHJpYnV0ZS5pbml0aWFsaXphdGlvbik7XHJcblxyXG4gICAgICAgIGlmIChpbml0aWFsaXphdGlvblR5cGUgIT0gbnVsbCAmJiBpbml0aWFsaXphdGlvblR5cGUudHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKGluaXRpYWxpemF0aW9uVHlwZS50eXBlLCBhdHRyaWJ1dGUuYXR0cmlidXRlVHlwZS5yZXNvbHZlZFR5cGUpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZS5hdHRyaWJ1dGVUeXBlLnJlc29sdmVkVHlwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgRGF0ZW50eXAgdm9uIFwiICsgYXR0cmlidXRlLmlkZW50aWZpZXIgKyBcIiBrb25udGUgbmljaHQgZXJtaXR0ZWx0IHdlcmRlbi4gXCIsIGF0dHJpYnV0ZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFdlcnQgZGVzIFRlcm0gdm9tIERhdGVudHlwIFwiICsgaW5pdGlhbGl6YXRpb25UeXBlLnR5cGUgKyBcIiBrYW5uIGRlbSBBdHRyaWJ1dCBcIiArIGF0dHJpYnV0ZS5pZGVudGlmaWVyICsgXCIgdm9tIFR5cCBcIiArIGF0dHJpYnV0ZS5hdHRyaWJ1dGVUeXBlLnJlc29sdmVkVHlwZS5pZGVudGlmaWVyICsgXCIgbmljaHQgenVnZXdpZXNlbiB3ZXJkZW4uXCIsIGF0dHJpYnV0ZS5pbml0aWFsaXphdGlvbi5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuYXNzaWdubWVudCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgbGVhdmVWYWx1ZU9uU3RhY2s6IGZhbHNlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBpbml0Q3VycmVudFByb2dyYW0oKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSB7XHJcbiAgICAgICAgICAgIG1vZHVsZTogdGhpcy5tb2R1bGUsXHJcbiAgICAgICAgICAgIHN0YXRlbWVudHM6IFtdLFxyXG4gICAgICAgICAgICBsYWJlbE1hbmFnZXI6IG51bGxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlciA9IG5ldyBMYWJlbE1hbmFnZXIodGhpcy5jdXJyZW50UHJvZ3JhbSk7XHJcblxyXG4gICAgICAgIHRoaXMubGFzdFN0YXRlbWVudCA9IG51bGw7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdlbmVyYXRlTWFpbihpc0FkaG9jQ29tcGlsYXRpb246IGJvb2xlYW4gPSBmYWxzZSkge1xyXG5cclxuICAgICAgICB0aGlzLmluaXRDdXJyZW50UHJvZ3JhbSgpO1xyXG5cclxuICAgICAgICBsZXQgcG9zaXRpb246IFRleHRQb3NpdGlvbiA9IHsgbGluZTogMSwgY29sdW1uOiAxLCBsZW5ndGg6IDAgfTtcclxuXHJcbiAgICAgICAgbGV0IG1haW5Qcm9ncmFtQXN0ID0gdGhpcy5tb2R1bGUubWFpblByb2dyYW1Bc3Q7XHJcbiAgICAgICAgaWYgKG1haW5Qcm9ncmFtQXN0ICE9IG51bGwgJiYgbWFpblByb2dyYW1Bc3QubGVuZ3RoID4gMCAmJiBtYWluUHJvZ3JhbUFzdFswXSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uID0gdGhpcy5tb2R1bGUubWFpblByb2dyYW1Bc3RbMF0ucG9zaXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWlzQWRob2NDb21waWxhdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZSh0cnVlLCBwb3NpdGlvbiwgeyBsaW5lOiAxMDAwMDAsIGNvbHVtbjogMSwgbGVuZ3RoOiAwIH0sIHRoaXMuY3VycmVudFByb2dyYW0pO1xyXG4gICAgICAgICAgICB0aGlzLmhlYXAgPSB7fTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtID0gdGhpcy5jdXJyZW50UHJvZ3JhbTtcclxuXHJcbiAgICAgICAgbGV0IGhhc01haW5Qcm9ncmFtOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1vZHVsZS5tYWluUHJvZ3JhbUFzdCAhPSBudWxsICYmIHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtQXN0Lmxlbmd0aCA+IDApIHtcclxuXHJcbiAgICAgICAgICAgIGhhc01haW5Qcm9ncmFtID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHModGhpcy5tb2R1bGUubWFpblByb2dyYW1Bc3QpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGlzQWRob2NDb21waWxhdGlvbiAmJiB0aGlzLmxhc3RTdGF0ZW1lbnQgIT0gbnVsbCAmJiB0aGlzLmxhc3RTdGF0ZW1lbnQudHlwZSA9PSBUb2tlblR5cGUuZGVjcmVhc2VTdGFja3BvaW50ZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlTGFzdFN0YXRlbWVudCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxhc3RQb3NpdGlvbiA9IHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtRW5kO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sYXN0UG9zaXRpb24gPT0gbnVsbCkgdGhpcy5sYXN0UG9zaXRpb24gPSB7IGxpbmU6IDEwMDAwMCwgY29sdW1uOiAwLCBsZW5ndGg6IDAgfTtcclxuICAgICAgICAgICAgLy8gaWYodGhpcy5sYXN0UG9zaXRpb24gPT0gbnVsbCkgdGhpcy5sYXN0UG9zaXRpb24gPSB7bGluZTogMTAwMDAwLCBjb2x1bW46IDAsIGxlbmd0aDogMH07XHJcblxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5wb3NpdGlvblRvID0gdGhpcy5sYXN0UG9zaXRpb247XHJcbiAgICAgICAgICAgIGlmICghaXNBZGhvY0NvbXBpbGF0aW9uKSB0aGlzLnBvcFN5bWJvbFRhYmxlKHRoaXMuY3VycmVudFByb2dyYW0sIHRydWUpO1xyXG4gICAgICAgICAgICB0aGlzLmhlYXAgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHJvZ3JhbUVuZCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmxhc3RQb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHBhdXNlQWZ0ZXJQcm9ncmFtRW5kOiB0cnVlXHJcbiAgICAgICAgICAgIH0sIHRydWUpO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlc29sdmVOb2RlcygpO1xyXG5cclxuICAgICAgICBpZiAoIWlzQWRob2NDb21waWxhdGlvbiAmJiAhaGFzTWFpblByb2dyYW0pIHtcclxuICAgICAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZSh0aGlzLmN1cnJlbnRQcm9ncmFtKTtcclxuICAgICAgICAgICAgdGhpcy5oZWFwID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGVuc3VyZUF1dG9tYXRpY0Nhc3RpbmcodHlwZUZyb206IFR5cGUsIHR5cGVUbzogVHlwZSwgcG9zaXRpb24/OiBUZXh0UG9zaXRpb24sIG5vZGVGcm9tPzogQVNUTm9kZSwgbnVsbFR5cGVGb3JiaWRkZW46IGJvb2xlYW4gPSBmYWxzZSk6IGJvb2xlYW4ge1xyXG5cclxuICAgICAgICBpZiAodHlwZUZyb20gPT0gbnVsbCB8fCB0eXBlVG8gPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoISh0eXBlRnJvbSA9PSBudWxsVHlwZSAmJiBudWxsVHlwZUZvcmJpZGRlbikpIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlRnJvbS5lcXVhbHModHlwZVRvKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghdHlwZUZyb20uY2FuQ2FzdFRvKHR5cGVUbykpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZVRvID09IGJvb2xlYW5QcmltaXRpdmVUeXBlICYmIG5vZGVGcm9tICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZUZyb20pO1xyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZUZyb21bXCJ1bmJveGFibGVBc1wiXSAhPSBudWxsICYmIHR5cGVGcm9tW1widW5ib3hhYmxlQXNcIl0uaW5kZXhPZih0eXBlVG8pID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R5cGU6IHR5cGVUb1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBpZiAodHlwZUZyb20gaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlICYmICh0eXBlVG8gaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlIHx8IHR5cGVUbyA9PSBzdHJpbmdQcmltaXRpdmVUeXBlKSkge1xyXG4gICAgICAgICAgICBsZXQgY2FzdEluZm8gPSB0eXBlRnJvbS5nZXRDYXN0SW5mb3JtYXRpb24odHlwZVRvKTtcclxuICAgICAgICAgICAgaWYgKCFjYXN0SW5mby5hdXRvbWF0aWMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBpZiAoY2FzdEluZm8ubmVlZHNTdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FzdFZhbHVlLFxyXG4gICAgICAgICAgICAgICAgbmV3VHlwZTogdHlwZVRvLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZW5zdXJlQXV0b21hdGljVG9TdHJpbmcodHlwZUZyb206IFR5cGUsIGNvZGVwb3M6IG51bWJlciA9IHVuZGVmaW5lZCwgdGV4dHBvc2l0aW9uPzogVGV4dFBvc2l0aW9uKTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKHR5cGVGcm9tID09IHN0cmluZ1ByaW1pdGl2ZVR5cGUpIHJldHVybiB0cnVlO1xyXG4gICAgICAgIGlmICh0eXBlRnJvbSA9PSB2b2lkUHJpbWl0aXZlVHlwZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmICh0eXBlRnJvbSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgbGV0IGNhc3RJbmZvID0gdHlwZUZyb20uZ2V0Q2FzdEluZm9ybWF0aW9uKHN0cmluZ1ByaW1pdGl2ZVR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIWNhc3RJbmZvLmF1dG9tYXRpYykgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAvLyBpZiAoY2FzdEluZm8ubmVlZHNTdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnNlcnRPclB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICBuZXdUeXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHRleHRwb3NpdGlvblxyXG4gICAgICAgICAgICB9LCBjb2RlcG9zKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICgodHlwZUZyb20gaW5zdGFuY2VvZiBLbGFzcykgfHwgKHR5cGVGcm9tID09IG51bGxUeXBlKSkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHRvU3RyaW5nTWV0aG9kOiBNZXRob2Q7XHJcbiAgICAgICAgICAgIGlmICh0eXBlRnJvbSA9PSBudWxsVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgdG9TdHJpbmdNZXRob2QgPSBvYmplY3RUeXBlLmdldE1ldGhvZEJ5U2lnbmF0dXJlKFwidG9TdHJpbmcoKVwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRvU3RyaW5nTWV0aG9kID0gKDxLbGFzcz50eXBlRnJvbSkuZ2V0TWV0aG9kQnlTaWduYXR1cmUoXCJ0b1N0cmluZygpXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0b1N0cmluZ01ldGhvZCAhPSBudWxsICYmIHRvU3RyaW5nTWV0aG9kLmdldFJldHVyblR5cGUoKSA9PSBzdHJpbmdQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYXV0b21hdGljVG9TdHJpbmcgPSBuZXcgTWV0aG9kKHRvU3RyaW5nTWV0aG9kLmlkZW50aWZpZXIsIHRvU3RyaW5nTWV0aG9kLnBhcmFtZXRlcmxpc3QsIHN0cmluZ1ByaW1pdGl2ZVR5cGUsIChwYXJhbWV0ZXJzOiBWYWx1ZVtdKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIFwibnVsbFwiO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0b1N0cmluZ01ldGhvZC5pbnZva2UocGFyYW1ldGVycyk7XHJcbiAgICAgICAgICAgICAgICB9LCB0b1N0cmluZ01ldGhvZC5pc0Fic3RyYWN0LCB0cnVlLCB0b1N0cmluZ01ldGhvZC5kb2N1bWVudGF0aW9uLCB0b1N0cmluZ01ldGhvZC5pc0NvbnN0cnVjdG9yKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmluc2VydE9yUHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0ZXh0cG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBhdXRvbWF0aWNUb1N0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICBpc1N1cGVyQ2FsbDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tmcmFtZUJlZ2luOiAtMSxcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9LCBjb2RlcG9zKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyBnZXRUb1N0cmluZ1N0YXRlbWVudCh0eXBlOiBLbGFzcyB8IE51bGxUeXBlLCBwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCBudWxsVG9TdHJpbmc6IGJvb2xlYW4gPSB0cnVlKTogU3RhdGVtZW50IHtcclxuXHJcbiAgICAvLyB9XHJcblxyXG4gICAgY2hlY2tJZkFzc2lnbm1lbnRJbnN0ZWRPZkVxdWFsKG5vZGVGcm9tOiBBU1ROb2RlLCBjb25kaXRpb25UeXBlPzogVHlwZSkge1xyXG4gICAgICAgIGlmIChub2RlRnJvbSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmIChub2RlRnJvbS50eXBlID09IFRva2VuVHlwZS5iaW5hcnlPcCAmJiBub2RlRnJvbS5vcGVyYXRvciA9PSBUb2tlblR5cGUuYXNzaWdubWVudCkge1xyXG4gICAgICAgICAgICBsZXQgcG9zID0gbm9kZUZyb20ucG9zaXRpb247XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiPSBpc3QgZGVyIFp1d2Vpc3VuZ3NvcGVyYXRvci4gRHUgd2lsbHN0IHNpY2hlciB6d2VpIFdlcnRlIHZlcmdsZWljaGVuLiBEYXp1IGJlbsO2dGlnc3QgRHUgZGVuIFZlcmdsZWljaHNvcGVyYXRvciA9PS5cIixcclxuICAgICAgICAgICAgICAgIHBvcywgY29uZGl0aW9uVHlwZSA9PSBib29sZWFuUHJpbWl0aXZlVHlwZSA/IFwid2FybmluZ1wiIDogXCJlcnJvclwiLCB7XHJcbiAgICAgICAgICAgICAgICB0aXRsZTogJz0gZHVyY2ggPT0gZXJzZXR6ZW4nLFxyXG4gICAgICAgICAgICAgICAgZWRpdHNQcm92aWRlcjogKHVyaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZTogdXJpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0TGluZU51bWJlcjogcG9zLmxpbmUsIHN0YXJ0Q29sdW1uOiBwb3MuY29sdW1uLCBlbmRMaW5lTnVtYmVyOiBwb3MubGluZSwgZW5kQ29sdW1uOiBwb3MuY29sdW1uICsgMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldmVyaXR5OiBtb25hY28uTWFya2VyU2V2ZXJpdHkuRXJyb3JcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIj09XCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdlbmVyYXRlU3RhdGVtZW50cyhub2RlczogQVNUTm9kZVtdKTogeyB3aXRoUmV0dXJuU3RhdGVtZW50OiBib29sZWFuLCBlbmRQb3NpdGlvbj86IFRleHRQb3NpdGlvbiB9IHtcclxuXHJcblxyXG4gICAgICAgIGlmIChub2RlcyA9PSBudWxsIHx8IG5vZGVzLmxlbmd0aCA9PSAwIHx8IG5vZGVzWzBdID09IG51bGwpIHJldHVybiB7IHdpdGhSZXR1cm5TdGF0ZW1lbnQ6IGZhbHNlIH07XHJcblxyXG4gICAgICAgIGxldCB3aXRoUmV0dXJuU3RhdGVtZW50OiBib29sZWFuID0gdGhpcy5wcm9jZXNzU3RhdGVtZW50c0luc2lkZUJsb2NrKG5vZGVzKTtcclxuXHJcbiAgICAgICAgbGV0IGxhc3ROb2RlID0gbm9kZXNbbm9kZXMubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgbGV0IGVuZFBvc2l0aW9uOiBUZXh0UG9zaXRpb247XHJcbiAgICAgICAgaWYgKGxhc3ROb2RlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKGxhc3ROb2RlLnR5cGUgPT0gVG9rZW5UeXBlLnNjb3BlTm9kZSkge1xyXG4gICAgICAgICAgICAgICAgZW5kUG9zaXRpb24gPSBsYXN0Tm9kZS5wb3NpdGlvblRvO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZW5kUG9zaXRpb24gPSBPYmplY3QuYXNzaWduKHt9LCBsYXN0Tm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBpZiAoZW5kUG9zaXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZFBvc2l0aW9uLmNvbHVtbiArPSBlbmRQb3NpdGlvbi5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5kUG9zaXRpb24ubGVuZ3RoID0gMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmxhc3RQb3NpdGlvbiA9IGVuZFBvc2l0aW9uO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVuZFBvc2l0aW9uID0gdGhpcy5sYXN0UG9zaXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4geyB3aXRoUmV0dXJuU3RhdGVtZW50OiB3aXRoUmV0dXJuU3RhdGVtZW50LCBlbmRQb3NpdGlvbjogZW5kUG9zaXRpb24gfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc1N0YXRlbWVudHNJbnNpZGVCbG9jayhub2RlczogQVNUTm9kZVtdKSB7XHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgbm9kZSBvZiBub2Rlcykge1xyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUgPT0gbnVsbCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBsZXQgdHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZSAhPSBudWxsICYmIHR5cGUud2l0aFJldHVyblN0YXRlbWVudCAhPSBudWxsICYmIHR5cGUud2l0aFJldHVyblN0YXRlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgd2l0aFJldHVyblN0YXRlbWVudCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIElmIGxhc3QgU3RhdGVtZW50IGhhcyB2YWx1ZSB3aGljaCBpcyBub3QgdXNlZCBmdXJ0aGVyIHRoZW4gcG9wIHRoaXMgdmFsdWUgZnJvbSBzdGFjay5cclxuICAgICAgICAgICAgLy8gZS5nLiBzdGF0ZW1lbnQgMTIgKyAxNyAtNztcclxuICAgICAgICAgICAgLy8gUGFyc2VyIGlzc3VlcyBhIHdhcm5pbmcgaW4gdGhpcyBjYXNlLCBzZWUgUGFyc2VyLmNoZWNrSWZTdGF0ZW1lbnRIYXNOb0VmZmVrdFxyXG4gICAgICAgICAgICBpZiAodHlwZSAhPSBudWxsICYmIHR5cGUudHlwZSAhPSBudWxsICYmIHR5cGUudHlwZSAhPSB2b2lkUHJpbWl0aXZlVHlwZSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxhc3RTdGF0ZW1lbnQgIT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdFN0YXRlbWVudC50eXBlID09IFRva2VuVHlwZS5hc3NpZ25tZW50ICYmIHRoaXMubGFzdFN0YXRlbWVudC5sZWF2ZVZhbHVlT25TdGFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdFN0YXRlbWVudC5sZWF2ZVZhbHVlT25TdGFjayA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmRlY3JlYXNlU3RhY2twb2ludGVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9wQ291bnQ6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH0sIHRydWUpXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHdpdGhSZXR1cm5TdGF0ZW1lbnQ7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGxhc3RQb3NpdGlvbjogVGV4dFBvc2l0aW9uO1xyXG4gICAgbGFzdFN0YXRlbWVudDogU3RhdGVtZW50O1xyXG5cclxuICAgIGluc2VydFN0YXRlbWVudHMocG9zOiBudW1iZXIsIHN0YXRlbWVudHM6IFN0YXRlbWVudCB8IFN0YXRlbWVudFtdKSB7XHJcbiAgICAgICAgaWYgKHN0YXRlbWVudHMgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShzdGF0ZW1lbnRzKSkgc3RhdGVtZW50cyA9IFtzdGF0ZW1lbnRzXTtcclxuICAgICAgICBmb3IgKGxldCBzdCBvZiBzdGF0ZW1lbnRzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5zcGxpY2UocG9zKyssIDAsIHN0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVzaFN0YXRlbWVudHMoc3RhdGVtZW50OiBTdGF0ZW1lbnQgfCBTdGF0ZW1lbnRbXSwgZGVsZXRlU3RlcEZpbmlzaGVkRmxhZ09uU3RlcEJlZm9yZTogYm9vbGVhbiA9IGZhbHNlKSB7XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZW1lbnQgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAoZGVsZXRlU3RlcEZpbmlzaGVkRmxhZ09uU3RlcEJlZm9yZSAmJiB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBsZXQgc3RlcEJlZm9yZTogU3RhdGVtZW50ID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgc3RlcEJlZm9yZS5zdGVwRmluaXNoZWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHN0YXRlbWVudCkpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgc3Qgb2Ygc3RhdGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMucHVzaChzdCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3QudHlwZSA9PSBUb2tlblR5cGUucmV0dXJuIHx8IHN0LnR5cGUgPT0gVG9rZW5UeXBlLmp1bXBBbHdheXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5sYXN0U3RhdGVtZW50ICE9IG51bGwpIHRoaXMubGFzdFN0YXRlbWVudC5zdGVwRmluaXNoZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChzdC5wb3NpdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0UG9zaXRpb24gPSBzdC5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3QucG9zaXRpb24gPSB0aGlzLmxhc3RQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMubGFzdFN0YXRlbWVudCA9IHN0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2goc3RhdGVtZW50KTtcclxuICAgICAgICAgICAgaWYgKHN0YXRlbWVudC50eXBlID09IFRva2VuVHlwZS5yZXR1cm4gfHwgc3RhdGVtZW50LnR5cGUgPT0gVG9rZW5UeXBlLmp1bXBBbHdheXMpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxhc3RTdGF0ZW1lbnQgIT0gbnVsbCAmJiB0aGlzLmxhc3RTdGF0ZW1lbnQudHlwZSAhPSBUb2tlblR5cGUubm9PcCkgdGhpcy5sYXN0U3RhdGVtZW50LnN0ZXBGaW5pc2hlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzdGF0ZW1lbnQucG9zaXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0UG9zaXRpb24gPSBzdGF0ZW1lbnQucG9zaXRpb247XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnQucG9zaXRpb24gPSB0aGlzLmxhc3RQb3NpdGlvbjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5sYXN0U3RhdGVtZW50ID0gc3RhdGVtZW50O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpbnNlcnRPclB1c2hTdGF0ZW1lbnRzKHN0YXRlbWVudHM6IFN0YXRlbWVudCB8IFN0YXRlbWVudFtdLCBwb3M/OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAocG9zID09IG51bGwgJiYgcG9zID09IHVuZGVmaW5lZCkgdGhpcy5wdXNoU3RhdGVtZW50cyhzdGF0ZW1lbnRzKTtcclxuICAgICAgICBlbHNlIHRoaXMuaW5zZXJ0U3RhdGVtZW50cyhwb3MsIHN0YXRlbWVudHMpO1xyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZUxhc3RTdGF0ZW1lbnQoKSB7XHJcbiAgICAgICAgbGV0IGxzdCA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5wb3AoKTtcclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlci5yZW1vdmVOb2RlKGxzdCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGluaXRTdGFja0ZyYW1lTm9kZXM6IEluaXRTdGFja2ZyYW1lU3RhdGVtZW50W10gPSBbXTtcclxuXHJcblxyXG4gICAgcHVzaE5ld1N5bWJvbFRhYmxlKGJlZ2luTmV3U3RhY2tmcmFtZTogYm9vbGVhbiwgcG9zaXRpb25Gcm9tOiBUZXh0UG9zaXRpb24sIHBvc2l0aW9uVG86IFRleHRQb3NpdGlvbixcclxuICAgICAgICBwcm9ncmFtPzogUHJvZ3JhbSk6IFN5bWJvbFRhYmxlIHtcclxuXHJcbiAgICAgICAgbGV0IHN0ID0gbmV3IFN5bWJvbFRhYmxlKHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLCBwb3NpdGlvbkZyb20sIHBvc2l0aW9uVG8pO1xyXG5cclxuICAgICAgICB0aGlzLnN5bWJvbFRhYmxlU3RhY2sucHVzaCh0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZSk7XHJcblxyXG4gICAgICAgIGlmIChiZWdpbk5ld1N0YWNrZnJhbWUpIHtcclxuICAgICAgICAgICAgc3QuYmVnaW5zTmV3U3RhY2tmcmFtZSA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLnN0YWNrZnJhbWVTaXplID0gdGhpcy5uZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3M7XHJcbiAgICAgICAgICAgIHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zID0gMDtcclxuXHJcbiAgICAgICAgICAgIGlmIChwcm9ncmFtICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbml0U3RhY2tGcmFtZU5vZGU6IEluaXRTdGFja2ZyYW1lU3RhdGVtZW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5pbml0U3RhY2tmcmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb25Gcm9tLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc2VydmVGb3JMb2NhbFZhcmlhYmxlczogMFxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHByb2dyYW0uc3RhdGVtZW50cy5wdXNoKGluaXRTdGFja0ZyYW1lTm9kZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRTdGFja0ZyYW1lTm9kZXMucHVzaChpbml0U3RhY2tGcmFtZU5vZGUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUgPSBzdDtcclxuXHJcbiAgICAgICAgcmV0dXJuIHN0O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwb3BTeW1ib2xUYWJsZShwcm9ncmFtPzogUHJvZ3JhbSwgZGVsZXRlU3RlcEZpbmlzaGVkRmxhZ09uU3RlcEJlZm9yZTogYm9vbGVhbiA9IGZhbHNlKTogdm9pZCB7XHJcblxyXG4gICAgICAgIGxldCBzdCA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlID0gdGhpcy5zeW1ib2xUYWJsZVN0YWNrLnBvcCgpO1xyXG5cclxuICAgICAgICAvLyBpZiB2LmRlY2xhcmF0aW9uRXJyb3IgIT0gbnVsbCB0aGVuIHZhcmlhYmxlIGhhcyBiZWVuIHVzZWQgYmVmb3JlIGluaXRpYWxpemF0aW9uLlxyXG4gICAgICAgIHN0LnZhcmlhYmxlTWFwLmZvckVhY2godiA9PiB7XHJcbiAgICAgICAgICAgIGlmICh2LmRlY2xhcmF0aW9uRXJyb3IgIT0gbnVsbCAmJiB2LnVzZWRCZWZvcmVJbml0aWFsaXphdGlvbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5lcnJvckxpc3QucHVzaCh2LmRlY2xhcmF0aW9uRXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgdi5kZWNsYXJhdGlvbkVycm9yID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBpZiAoIXN0LmJlZ2luc05ld1N0YWNrZnJhbWUgJiYgc3QudmFyaWFibGVNYXAuc2l6ZSA9PSAwICYmIHJlbW92ZUkpIHtcclxuICAgICAgICAvLyAgICAgLy8gZW1wdHkgc3ltYm9sIHRhYmxlID0+IHJlbW92ZSBpdCFcclxuICAgICAgICAvLyAgICAgaWYgKHN0LnBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgLy8gICAgICAgICBzdC5wYXJlbnQuY2hpbGRTeW1ib2xUYWJsZXMucG9wKCk7XHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyB9IGVsc2UgXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBhZGQgbGVuZ3RoIG9mIHRva2VuXHJcblxyXG4gICAgICAgICAgICBpZiAoc3QuYmVnaW5zTmV3U3RhY2tmcmFtZSkge1xyXG5cclxuICAgICAgICAgICAgICAgIHN0LnN0YWNrZnJhbWVTaXplID0gdGhpcy5uZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRGcmVlUmVsYXRpdmVTdGFja1BvcyA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLnN0YWNrZnJhbWVTaXplO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChwcm9ncmFtICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW5pdFN0YWNrZnJhbWVOb2RlID0gdGhpcy5pbml0U3RhY2tGcmFtZU5vZGVzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbml0U3RhY2tmcmFtZU5vZGUgIT0gbnVsbCkgaW5pdFN0YWNrZnJhbWVOb2RlLnJlc2VydmVGb3JMb2NhbFZhcmlhYmxlcyA9IHN0LnN0YWNrZnJhbWVTaXplO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aCA+IDAgJiYgZGVsZXRlU3RlcEZpbmlzaGVkRmxhZ09uU3RlcEJlZm9yZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3RhdGVtZW50ID0gcHJvZ3JhbS5zdGF0ZW1lbnRzW3Byb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggLSAxXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRvbid0IHNldCBzdGVwRmluaXNoZWQgPSBmYWxzZSBpbiBqdW1wLXN0YXRlbWVudHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgdGhpcyBjb3VsZCBsZWFkIHRvIGluZmluaXR5LWxvb3AgaXMgdXNlciBzZXRzIFwid2hpbGUodHJ1ZSk7XCIganVzdCBiZWZvcmUgcHJvZ3JhbSBlbmRcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFtUb2tlblR5cGUuanVtcEFsd2F5cywgVG9rZW5UeXBlLmp1bXBJZlRydWUsIFRva2VuVHlwZS5qdW1wSWZGYWxzZSwgVG9rZW5UeXBlLmp1bXBJZkZhbHNlQW5kTGVhdmVPblN0YWNrLCBUb2tlblR5cGUuanVtcElmVHJ1ZUFuZExlYXZlT25TdGFja10uaW5kZXhPZihzdGF0ZW1lbnQudHlwZSkgPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW0uc3RhdGVtZW50c1twcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoIC0gMV0uc3RlcEZpbmlzaGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHByb2dyYW0uc3RhdGVtZW50cy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNsb3NlU3RhY2tmcmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHN0LnBvc2l0aW9uVG9cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdXNoRXJyb3IodGV4dDogc3RyaW5nLCBwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCBlcnJvckxldmVsOiBFcnJvckxldmVsID0gXCJlcnJvclwiLCBxdWlja0ZpeD86IFF1aWNrRml4KSB7XHJcbiAgICAgICAgdGhpcy5lcnJvckxpc3QucHVzaCh7XHJcbiAgICAgICAgICAgIHRleHQ6IHRleHQsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgcXVpY2tGaXg6IHF1aWNrRml4LFxyXG4gICAgICAgICAgICBsZXZlbDogZXJyb3JMZXZlbFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9wZW5CcmVha1Njb3BlKCkge1xyXG4gICAgICAgIHRoaXMuYnJlYWtOb2RlU3RhY2sucHVzaChbXSk7XHJcbiAgICB9XHJcblxyXG4gICAgb3BlbkNvbnRpbnVlU2NvcGUoKSB7XHJcbiAgICAgICAgdGhpcy5jb250aW51ZU5vZGVTdGFjay5wdXNoKFtdKTtcclxuICAgIH1cclxuXHJcbiAgICBwdXNoQnJlYWtOb2RlKGJyZWFrTm9kZTogSnVtcEFsd2F5c1N0YXRlbWVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmJyZWFrTm9kZVN0YWNrLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRWluZSBicmVhay1BbndlaXN1bmcgaXN0IG51ciBpbm5lcmhhbGIgZWluZXIgdW1nZWJlbmRlbiBTY2hsZWlmZSBvZGVyIHN3aXRjaC1BbndlaXN1bmcgc2lubnZvbGwuXCIsIGJyZWFrTm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5icmVha05vZGVTdGFja1t0aGlzLmJyZWFrTm9kZVN0YWNrLmxlbmd0aCAtIDFdLnB1c2goYnJlYWtOb2RlKTtcclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhicmVha05vZGUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdXNoQ29udGludWVOb2RlKGNvbnRpbnVlTm9kZTogSnVtcEFsd2F5c1N0YXRlbWVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbnRpbnVlTm9kZVN0YWNrLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRWluZSBjb250aW51ZS1BbndlaXN1bmcgaXN0IG51ciBpbm5lcmhhbGIgZWluZXIgdW1nZWJlbmRlbiBTY2hsZWlmZSBvZGVyIHN3aXRjaC1BbndlaXN1bmcgc2lubnZvbGwuXCIsIGNvbnRpbnVlTm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5jb250aW51ZU5vZGVTdGFja1t0aGlzLmNvbnRpbnVlTm9kZVN0YWNrLmxlbmd0aCAtIDFdLnB1c2goY29udGludWVOb2RlKTtcclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhjb250aW51ZU5vZGUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbG9zZUJyZWFrU2NvcGUoYnJlYWtUYXJnZXRMYWJlbDogbnVtYmVyLCBsbTogTGFiZWxNYW5hZ2VyKSB7XHJcbiAgICAgICAgbGV0IGJyZWFrTm9kZXMgPSB0aGlzLmJyZWFrTm9kZVN0YWNrLnBvcCgpO1xyXG4gICAgICAgIGZvciAobGV0IGJuIG9mIGJyZWFrTm9kZXMpIHtcclxuICAgICAgICAgICAgbG0ucmVnaXN0ZXJKdW1wTm9kZShibiwgYnJlYWtUYXJnZXRMYWJlbCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNsb3NlQ29udGludWVTY29wZShjb250aW51ZVRhcmdldExhYmVsOiBudW1iZXIsIGxtOiBMYWJlbE1hbmFnZXIpIHtcclxuICAgICAgICBsZXQgY29udGludWVOb2RlcyA9IHRoaXMuY29udGludWVOb2RlU3RhY2sucG9wKCk7XHJcbiAgICAgICAgZm9yIChsZXQgYm4gb2YgY29udGludWVOb2Rlcykge1xyXG4gICAgICAgICAgICBsbS5yZWdpc3Rlckp1bXBOb2RlKGJuLCBjb250aW51ZVRhcmdldExhYmVsKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYnJlYWtPY2N1cmVkKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJyZWFrTm9kZVN0YWNrLmxlbmd0aCA+IDAgJiYgdGhpcy5icmVha05vZGVTdGFja1t0aGlzLmJyZWFrTm9kZVN0YWNrLmxlbmd0aCAtIDFdLmxlbmd0aCA+IDA7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc05vZGUobm9kZTogQVNUTm9kZSwgaXNMZWZ0U2lkZU9mQXNzaWdubWVudDogYm9vbGVhbiA9IGZhbHNlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5iaW5hcnlPcDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NCaW5hcnlPcChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUudW5hcnlPcDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NVbmFyeU9wKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wdXNoQ29uc3RhbnQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wdXNoQ29uc3RhbnQobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmNhbGxNZXRob2Q6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsTWV0aG9kKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5pZGVudGlmaWVyOlxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdGFja1R5cGUgPSB0aGlzLnJlc29sdmVJZGVudGlmaWVyKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB2ID0gbm9kZS52YXJpYWJsZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0xlZnRTaWRlT2ZBc3NpZ25tZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2LmluaXRpYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdi51c2VkQmVmb3JlSW5pdGlhbGl6YXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2LmRlY2xhcmF0aW9uRXJyb3IgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYuaW5pdGlhbGl6ZWQgIT0gbnVsbCAmJiAhdi5pbml0aWFsaXplZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHYudXNlZEJlZm9yZUluaXRpYWxpemF0aW9uID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBWYXJpYWJsZSBcIiArIHYuaWRlbnRpZmllciArIFwiIHdpcmQgaGllciBiZW51dHp0IGJldm9yIHNpZSBpbml0aWFsaXNpZXJ0IHd1cmRlLlwiLCBub2RlLnBvc2l0aW9uLCBcImluZm9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0YWNrVHlwZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2VsZWN0QXJyYXlFbGVtZW50OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0QXJyYXlFbGVtZW50KG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5pbmNyZW1lbnREZWNyZW1lbnRCZWZvcmU6XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmluY3JlbWVudERlY3JlbWVudEFmdGVyOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5jcmVtZW50RGVjcmVtZW50QmVmb3JlT3JBZnRlcihub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc3VwZXJDb25zdHJ1Y3RvckNhbGw6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zdXBlcmNvbnN0cnVjdG9yQ2FsbChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuY29uc3RydWN0b3JDYWxsOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3VwZXJjb25zdHJ1Y3RvckNhbGwobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRUaGlzOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHVzaFRoaXNPclN1cGVyKG5vZGUsIGZhbHNlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZFN1cGVyOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHVzaFRoaXNPclN1cGVyKG5vZGUsIHRydWUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wdXNoQXR0cmlidXRlOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHVzaEF0dHJpYnV0ZShub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubmV3T2JqZWN0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubmV3T2JqZWN0KG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkV2hpbGU6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzV2hpbGUobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmREbzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NEbyhub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZEZvcjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NGb3Iobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmZvckxvb3BPdmVyQ29sbGVjdGlvbjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NGb3JMb29wT3ZlckNvbGxlY3Rpb24obm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRJZjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NJZihub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZFN3aXRjaDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTd2l0Y2gobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRSZXR1cm46XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzUmV0dXJuKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5sb2NhbFZhcmlhYmxlRGVjbGFyYXRpb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbFZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmFycmF5SW5pdGlhbGl6YXRpb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzQXJyYXlMaXRlcmFsKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5uZXdBcnJheTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NOZXdBcnJheShub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZFByaW50OlxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkUHJpbnRsbjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NQcmludChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuY2FzdFZhbHVlOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc01hbnVhbENhc3Qobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRCcmVhazpcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEJyZWFrTm9kZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmp1bXBBbHdheXMsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb25cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRDb250aW51ZTpcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaENvbnRpbnVlTm9kZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmp1bXBBbHdheXMsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb25cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnJpZ2h0QnJhY2tldDpcclxuICAgICAgICAgICAgICAgIGxldCB0eXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLnRlcm1JbnNpZGVCcmFja2V0cyk7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZSAhPSBudWxsICYmIHR5cGUudHlwZSBpbnN0YW5jZW9mIEtsYXNzKSB0aGlzLnB1c2hUeXBlUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgdHlwZS50eXBlKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zY29wZU5vZGU6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZShmYWxzZSwgbm9kZS5wb3NpdGlvbiwgbm9kZS5wb3NpdGlvblRvKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgd2l0aFJldHVyblN0YXRlbWVudCA9IHRoaXMucHJvY2Vzc1N0YXRlbWVudHNJbnNpZGVCbG9jayhub2RlLnN0YXRlbWVudHMpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBudWxsLCBpc0Fzc2lnbmFibGU6IGZhbHNlLCB3aXRoUmV0dXJuU3RhdGVtZW50OiB3aXRoUmV0dXJuU3RhdGVtZW50IH07XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc01hbnVhbENhc3Qobm9kZTogQ2FzdE1hbnVhbGx5Tm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCB0eXBlRnJvbTEgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUud2hhdFRvQ2FzdCk7XHJcblxyXG4gICAgICAgIGlmICh0eXBlRnJvbTEgPT0gbnVsbCB8fCB0eXBlRnJvbTEudHlwZSA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgbGV0IHR5cGVGcm9tOiBUeXBlID0gdHlwZUZyb20xLnR5cGU7XHJcblxyXG4gICAgICAgIGlmICh0eXBlRnJvbSAhPSBudWxsICYmIG5vZGUuY2FzdFRvVHlwZSAhPSBudWxsICYmIG5vZGUuY2FzdFRvVHlwZS5yZXNvbHZlZFR5cGUgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHR5cGVUbyA9IG5vZGUuY2FzdFRvVHlwZS5yZXNvbHZlZFR5cGU7XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZUZyb20uY2FuQ2FzdFRvKHR5cGVUbykpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hDYXN0VG9TdGF0ZW1lbnQodHlwZUZyb20sIHR5cGVUbywgbm9kZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gaWYgKCh0eXBlRnJvbSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpICYmIHR5cGVUbyBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICBsZXQgY2FzdEluZm8gPSB0eXBlRnJvbS5nZXRDYXN0SW5mb3JtYXRpb24odHlwZVRvKTtcclxuICAgICAgICAgICAgICAgIC8vICAgICBpZiAoY2FzdEluZm8ubmVlZHNTdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FzdFZhbHVlLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICBuZXdUeXBlOiB0eXBlVG9cclxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgICAgICAvLyB9IGVsc2UgaWYgKHR5cGVGcm9tIGluc3RhbmNlb2YgS2xhc3MgJiYgdHlwZVRvID09IHN0cmluZ1ByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICBsZXQgdG9TdHJpbmdTdGF0ZW1lbnQgPSB0aGlzLmdldFRvU3RyaW5nU3RhdGVtZW50KHR5cGVGcm9tLCBub2RlLnBvc2l0aW9uLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgaWYgKHRvU3RyaW5nU3RhdGVtZW50ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh0aGlzLmdldFRvU3RyaW5nU3RhdGVtZW50KHR5cGVGcm9tLCBub2RlLnBvc2l0aW9uLCBmYWxzZSkpO1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIERhdGVudHlwIFwiICsgdHlwZUZyb20uaWRlbnRpZmllciArIFwiIGthbm4gKHp1bWluZGVzdCBkdXJjaCBjYXN0aW5nKSBuaWNodCBpbiBkZW4gRGF0ZW50eXAgXCIgKyB0eXBlVG8uaWRlbnRpZmllciArIFwiIHVtZ2V3YW5kZWx0IHdlcmRlbi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoeyB0eXBlOiBUb2tlblR5cGUuY2FzdFZhbHVlLCBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbiwgbmV3VHlwZTogdHlwZVRvIH0pO1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBlbHNlIGlmICgodHlwZUZyb21bXCJ1bmJveGFibGVBc1wiXSB8fCBbXSkuaW5jbHVkZXModHlwZVRvKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FzdFZhbHVlLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgbmV3VHlwZTogdHlwZVRvXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gZWxzZSBpZiAodHlwZUZyb20gaW5zdGFuY2VvZiBOdWxsVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FzdFZhbHVlLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgbmV3VHlwZTogdHlwZVRvXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IHR5cGVGcm9tMS5pc0Fzc2lnbmFibGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZVRvXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGVGcm9tIGluc3RhbmNlb2YgVW5ib3hhYmxlS2xhc3MpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHVuYm94YWJsZUFzIG9mIHR5cGVGcm9tLnVuYm94YWJsZUFzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVuYm94YWJsZUFzLmNhbkNhc3RUbyh0eXBlVG8pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaENhc3RUb1N0YXRlbWVudCh0eXBlRnJvbSwgdW5ib3hhYmxlQXMsIG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hDYXN0VG9TdGF0ZW1lbnQodW5ib3hhYmxlQXMsIHR5cGVUbywgbm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoKHR5cGVGcm9tIGluc3RhbmNlb2YgS2xhc3MgfHwgdHlwZUZyb20gaW5zdGFuY2VvZiBJbnRlcmZhY2UpICYmICh0eXBlVG8gaW5zdGFuY2VvZiBLbGFzcyB8fCB0eXBlVG8gaW5zdGFuY2VvZiBJbnRlcmZhY2UpKVxyXG5cclxuICAgICAgICAgICAgLy8gaWYgKHR5cGVGcm9tIGluc3RhbmNlb2YgS2xhc3MgJiZcclxuICAgICAgICAgICAgLy8gICAgICh0eXBlVG8gaW5zdGFuY2VvZiBLbGFzcyAmJiAhdHlwZUZyb20uaGFzQW5jZXN0b3JPcklzKHR5cGVUbykgJiYgdHlwZVRvLmhhc0FuY2VzdG9yT3JJcyh0eXBlRnJvbSkpIHx8XHJcbiAgICAgICAgICAgIC8vICAgICAodHlwZVRvIGluc3RhbmNlb2YgSW50ZXJmYWNlICYmICEoPEtsYXNzPnR5cGVGcm9tKS5pbXBsZW1lbnRzSW50ZXJmYWNlKHR5cGVUbykpKSBcclxuICAgICAgICAgICAge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jaGVja0Nhc3QsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHlwZTogdHlwZVRvLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiB0eXBlRnJvbTEuaXNBc3NpZ25hYmxlLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHR5cGVUb1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIERhdGVudHlwIFwiICsgdHlwZUZyb20uaWRlbnRpZmllciArIFwiIGthbm4gKHp1bWluZGVzdCBkdXJjaCBjYXN0aW5nKSBuaWNodCBpbiBkZW4gRGF0ZW50eXAgXCIgKyB0eXBlVG8uaWRlbnRpZmllciArIFwiIHVtZ2V3YW5kZWx0IHdlcmRlbi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdXNoQ2FzdFRvU3RhdGVtZW50KHR5cGVGcm9tOiBUeXBlLCB0eXBlVG86IFR5cGUsIG5vZGU6IENhc3RNYW51YWxseU5vZGUpIHtcclxuICAgICAgICBsZXQgbmVlZHNTdGF0ZW1lbnQ6IGJvb2xlYW4gPSB0eXBlRnJvbSAhPSB0eXBlVG87XHJcblxyXG4gICAgICAgIC8vIGlmICgodHlwZUZyb20gaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSAmJiB0eXBlVG8gaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgLy8gICAgIGxldCBjYXN0SW5mbyA9IHR5cGVGcm9tLmdldENhc3RJbmZvcm1hdGlvbih0eXBlVG8pO1xyXG4gICAgICAgIC8vICAgICBpZiAoIWNhc3RJbmZvLm5lZWRzU3RhdGVtZW50KSBuZWVkc1N0YXRlbWVudCA9IGZhbHNlO1xyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgaWYgKG5lZWRzU3RhdGVtZW50KSB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhc3RWYWx1ZSxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgIG5ld1R5cGU6IHR5cGVUb1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzUHJpbnQobm9kZTogUHJpbnROb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IHR5cGUgPSBub2RlLnR5cGUgPT0gVG9rZW5UeXBlLmtleXdvcmRQcmludCA/IFRva2VuVHlwZS5wcmludCA6IFRva2VuVHlwZS5wcmludGxuO1xyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZS5wdXNoTWV0aG9kQ2FsbFBvc2l0aW9uKG5vZGUucG9zaXRpb24sIG5vZGUuY29tbWFQb3NpdGlvbnMsIFRva2VuVHlwZVJlYWRhYmxlW25vZGUudHlwZV0sIG5vZGUucmlnaHRCcmFja2V0UG9zaXRpb24pO1xyXG5cclxuICAgICAgICBpZiAobm9kZS50ZXh0ICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB0eXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLnRleHQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmVuc3VyZUF1dG9tYXRpY1RvU3RyaW5nKHR5cGUudHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBNZXRob2RlbiBwcmludCB1bmQgcHJpbnRsbiBlcndhcnRlbiBlaW5lbiBQYXJhbWV0ZXIgdm9tIFR5cCBTdHJpbmcuIEdlZnVuZGVuIHd1cmRlIGVpbiBXZXJ0IHZvbSBUeXAgXCIgKyB0eXBlLnR5cGU/LmlkZW50aWZpZXIgKyBcIi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgd2l0aENvbG9yOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmIChub2RlLmNvbG9yICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB0eXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLmNvbG9yKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlLnR5cGUgIT0gc3RyaW5nUHJpbWl0aXZlVHlwZSAmJiB0eXBlLnR5cGUgIT0gaW50UHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKHR5cGUudHlwZSwgc3RyaW5nUHJpbWl0aXZlVHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgTWV0aG9kZW4gcHJpbnQgdW5kIHByaW50bG4gZXJ3YXJ0ZW4gYWxzIEZhcmJlIGVpbmVuIFBhcmFtZXRlciB2b20gVHlwIFN0cmluZyBvZGVyIGludC4gR2VmdW5kZW4gd3VyZGUgZWluIFdlcnQgdm9tIFR5cCBcIiArIHR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgd2l0aENvbG9yID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogdHlwZSxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgIGVtcHR5OiAobm9kZS50ZXh0ID09IG51bGwpLFxyXG4gICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIHdpdGhDb2xvcjogd2l0aENvbG9yXHJcbiAgICAgICAgfSk7XHJcblxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzTmV3QXJyYXkobm9kZTogTmV3QXJyYXlOb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzQXJyYXlMaXRlcmFsKG5vZGUuaW5pdGlhbGl6YXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaW50WzddWzJdW10gYXJlIDcgYXJyYXlzIGVhY2ggd2l0aCBhcnJheXMgb2YgbGVuZ3RoIDIgd2hpY2ggYXJlIGVtcHR5XHJcblxyXG4gICAgICAgIGxldCBkaW1lbnNpb24gPSAwO1xyXG4gICAgICAgIGZvciAobGV0IGVjIG9mIG5vZGUuZWxlbWVudENvdW50KSB7XHJcbiAgICAgICAgICAgIGlmIChlYyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NOb2RlKGVjKTsgLy8gcHVzaCBudW1iZXIgb2YgZWxlbWVudHMgZm9yIHRoaXMgZGltZW5zaW9uIG9uIHN0YWNrXHJcbiAgICAgICAgICAgICAgICBkaW1lbnNpb24rKztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBmb3IgdGhlIGFycmF5IGFib3ZlOiBhcnJheVR5cGUgaXMgYXJyYXkgb2YgYXJyYXkgb2YgaW50OyBkaW1lbnNpb24gaXMgMjsgc3RhY2s6IDcgMlxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEVtcHR5QXJyYXksXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBhcnJheVR5cGU6IG5vZGUuYXJyYXlUeXBlLnJlc29sdmVkVHlwZSxcclxuICAgICAgICAgICAgZGltZW5zaW9uOiBkaW1lbnNpb25cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgdHlwZTogbm9kZS5hcnJheVR5cGUucmVzb2x2ZWRUeXBlXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgcHJvY2Vzc0FycmF5TGl0ZXJhbChub2RlOiBBcnJheUluaXRpYWxpemF0aW9uTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBiZXM6IEJlZ2luQXJyYXlTdGF0ZW1lbnQgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5iZWdpbkFycmF5LFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgYXJyYXlUeXBlOiBub2RlLmFycmF5VHlwZS5yZXNvbHZlZFR5cGVcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKGJlcyk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGFpbiBvZiBub2RlLm5vZGVzKSB7XHJcblxyXG4gICAgICAgICAgICAvLyBEaWQgYW4gZXJyb3Igb2NjdXIgd2hlbiBwYXJzaW5nIGEgY29uc3RhbnQ/XHJcbiAgICAgICAgICAgIGlmIChhaW4gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhaW4udHlwZSA9PSBUb2tlblR5cGUuYXJyYXlJbml0aWFsaXphdGlvbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzQXJyYXlMaXRlcmFsKGFpbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgc1R5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKGFpbik7XHJcbiAgICAgICAgICAgICAgICBpZiAoc1R5cGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCB0YXJnZXRUeXBlID0gKDxBcnJheVR5cGU+bm9kZS5hcnJheVR5cGUucmVzb2x2ZWRUeXBlKS5hcnJheU9mVHlwZTtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKHNUeXBlLnR5cGUsIHRhcmdldFR5cGUsIGFpbi5wb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBEYXRlbnR5cCBkZXMgVGVybXMgKFwiICsgc1R5cGUudHlwZT8uaWRlbnRpZmllciArIFwiKSBrYW5uIG5pY2h0IGluIGRlbiBEYXRlbnR5cCBcIiArIHRhcmdldFR5cGU/LmlkZW50aWZpZXIgKyBcIiBrb252ZXJ0aWVydCB3ZXJkZW4uXCIsIGFpbi5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmFkZFRvQXJyYXksXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBudW1iZXJPZkVsZW1lbnRzVG9BZGQ6IG5vZGUubm9kZXMubGVuZ3RoXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlzQXNzaWduYWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgIHR5cGU6IG5vZGUuYXJyYXlUeXBlLnJlc29sdmVkVHlwZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgbG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGU6IExvY2FsVmFyaWFibGVEZWNsYXJhdGlvbk5vZGUsIGRvbnRXYXJuV2hlbk5vSW5pdGlhbGl6YXRpb246IGJvb2xlYW4gPSBmYWxzZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGlmIChub2RlLnZhcmlhYmxlVHlwZS5yZXNvbHZlZFR5cGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBub2RlLnZhcmlhYmxlVHlwZS5yZXNvbHZlZFR5cGUgPSBudWxsVHlwZTsgLy8gTWFrZSB0aGUgYmVzdCBvdXQgb2YgaXQuLi5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBkZWNsYXJlVmFyaWFibGVPbkhlYXAgPSAodGhpcy5oZWFwICE9IG51bGwgJiYgdGhpcy5zeW1ib2xUYWJsZVN0YWNrLmxlbmd0aCA8PSAyKTtcclxuXHJcbiAgICAgICAgbGV0IHZhcmlhYmxlOiBWYXJpYWJsZSA9IHtcclxuICAgICAgICAgICAgaWRlbnRpZmllcjogbm9kZS5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICBzdGFja1BvczogZGVjbGFyZVZhcmlhYmxlT25IZWFwID8gbnVsbCA6IHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zKyssXHJcbiAgICAgICAgICAgIHR5cGU6IG5vZGUudmFyaWFibGVUeXBlLnJlc29sdmVkVHlwZSxcclxuICAgICAgICAgICAgdXNhZ2VQb3NpdGlvbnM6IG5ldyBNYXAoKSxcclxuICAgICAgICAgICAgZGVjbGFyYXRpb246IHsgbW9kdWxlOiB0aGlzLm1vZHVsZSwgcG9zaXRpb246IG5vZGUucG9zaXRpb24gfSxcclxuICAgICAgICAgICAgaXNGaW5hbDogbm9kZS5pc0ZpbmFsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihub2RlLnBvc2l0aW9uLCB2YXJpYWJsZSk7XHJcblxyXG4gICAgICAgIGlmIChkZWNsYXJlVmFyaWFibGVPbkhlYXApIHtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmhlYXBWYXJpYWJsZURlY2xhcmF0aW9uLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBwdXNoT25Ub3BPZlN0YWNrRm9ySW5pdGlhbGl6YXRpb246IG5vZGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCxcclxuICAgICAgICAgICAgICAgIHZhcmlhYmxlOiB2YXJpYWJsZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogbm9kZS5pbml0aWFsaXphdGlvbiA9PSBudWxsXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaGVhcFt2YXJpYWJsZS5pZGVudGlmaWVyXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgVmFyaWFibGUgXCIgKyBub2RlLmlkZW50aWZpZXIgKyBcIiBkYXJmIGltIHNlbGJlbiBTaWNodGJhcmtlaXRzYmVyZWljaCAoU2NvcGUpIG5pY2h0IG1laHJtYWxzIGRlZmluaWVydCB3ZXJkZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmhlYXBbdmFyaWFibGUuaWRlbnRpZmllcl0gPSB2YXJpYWJsZTtcclxuICAgICAgICAgICAgLy8gb25seSBmb3IgY29kZSBjb21wbGV0aW9uOlxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS52YXJpYWJsZU1hcC5zZXQobm9kZS5pZGVudGlmaWVyLCB2YXJpYWJsZSk7XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50U3ltYm9sVGFibGUudmFyaWFibGVNYXAuZ2V0KG5vZGUuaWRlbnRpZmllcikpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIFZhcmlhYmxlIFwiICsgbm9kZS5pZGVudGlmaWVyICsgXCIgZGFyZiBpbSBzZWxiZW4gU2ljaHRiYXJrZWl0c2JlcmVpY2ggKFNjb3BlKSBuaWNodCBtZWhybWFscyBkZWZpbmllcnQgd2VyZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUudmFyaWFibGVNYXAuc2V0KG5vZGUuaWRlbnRpZmllciwgdmFyaWFibGUpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBwdXNoT25Ub3BPZlN0YWNrRm9ySW5pdGlhbGl6YXRpb246IG5vZGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCxcclxuICAgICAgICAgICAgICAgIHZhcmlhYmxlOiB2YXJpYWJsZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogbm9kZS5pbml0aWFsaXphdGlvbiA9PSBudWxsXHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5vZGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgaW5pdFR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuaW5pdGlhbGl6YXRpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGluaXRUeXBlICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFibGUudHlwZSA9PSB2YXJUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGUudHlwZSA9IGluaXRUeXBlLnR5cGU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGluaXRUeXBlLnR5cGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFR5cCBkZXMgVGVybXMgYXVmIGRlciByZWNodGVuIFNlaXRlIGRlcyBadXdlaXN1bmdzb3BlcmF0b3JzICg9KSBrb25udGUgbmljaHQgYmVzdGltbXQgd2VyZGVuLlwiLCBub2RlLmluaXRpYWxpemF0aW9uLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKGluaXRUeXBlLnR5cGUsIHZhcmlhYmxlLnR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFRlcm0gdm9tIFR5cCBcIiArIGluaXRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIGthbm4gZGVyIFZhcmlhYmxlIHZvbSBUeXAgXCIgKyB2YXJpYWJsZS50eXBlLmlkZW50aWZpZXIgKyBcIiBuaWNodCB6dWdlb3JkbmV0IHdlcmRlbi5cIiwgbm9kZS5pbml0aWFsaXphdGlvbi5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5hc3NpZ25tZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLmluaXRpYWxpemF0aW9uLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBsZWF2ZVZhbHVlT25TdGFjazogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICh2YXJpYWJsZS50eXBlID09IHZhclR5cGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIFZlcndlbmR1bmcgdm9uIHZhciBpc3QgbnVyIGRhbm4genVsw6Rzc2lnLCB3ZW5uIGVpbmUgbG9rYWxlIFZhcmlhYmxlIGluIGVpbmVyIEFud2Vpc3VuZyBkZWtsYXJpZXJ0IHVuZCBpbml0aWFsaXNpZXJ0IHdpcmQsIGFsc28gei5CLiB2YXIgaSA9IDEyO1wiLCBub2RlLnZhcmlhYmxlVHlwZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5pdGlhbGl6ZXI6IHN0cmluZyA9IFwiID0gbnVsbFwiO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlLnR5cGUgPT0gaW50UHJpbWl0aXZlVHlwZSkgaW5pdGlhbGl6ZXIgPSBcIiA9IDBcIjtcclxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS50eXBlID09IGRvdWJsZVByaW1pdGl2ZVR5cGUpIGluaXRpYWxpemVyID0gXCIgPSAwLjBcIjtcclxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS50eXBlID09IGJvb2xlYW5QcmltaXRpdmVUeXBlKSBpbml0aWFsaXplciA9IFwiID0gZmFsc2VcIjtcclxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS50eXBlID09IGNoYXJQcmltaXRpdmVUeXBlKSBpbml0aWFsaXplciA9IFwiID0gJyAnXCI7XHJcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFibGUudHlwZSA9PSBzdHJpbmdQcmltaXRpdmVUeXBlKSBpbml0aWFsaXplciA9ICcgPSBcIlwiJztcclxuXHJcbiAgICAgICAgICAgICAgICB2YXJpYWJsZS5kZWNsYXJhdGlvbkVycm9yID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiSmVkZSBsb2thbGUgVmFyaWFibGUgc29sbHRlIHZvciBpaHJlciBlcnN0ZW4gVmVyd2VuZHVuZyBpbml0aWFsaXNpZXJ0IHdlcmRlbi5cIixcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBxdWlja0ZpeDpcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBpbml0aWFsaXplciArIFwiIGVyZ8OkbnplblwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0c1Byb3ZpZGVyOiAodXJpKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zID0gbm9kZS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZTogdXJpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlZGl0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogeyBzdGFydExpbmVOdW1iZXI6IHBvcy5saW5lLCBzdGFydENvbHVtbjogcG9zLmNvbHVtbiArIHBvcy5sZW5ndGgsIGVuZExpbmVOdW1iZXI6IHBvcy5saW5lLCBlbmRDb2x1bW46IHBvcy5jb2x1bW4gKyBwb3MubGVuZ3RoIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbml0aWFsaXplclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbDogXCJpbmZvXCJcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB2YXJpYWJsZS51c2VkQmVmb3JlSW5pdGlhbGl6YXRpb24gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHZhcmlhYmxlLmluaXRpYWxpemVkID0gZG9udFdhcm5XaGVuTm9Jbml0aWFsaXphdGlvbjtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzUmV0dXJuKG5vZGU6IFJldHVybk5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgbWV0aG9kID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUubWV0aG9kO1xyXG5cclxuICAgICAgICBpZiAobWV0aG9kID09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW5lIHJldHVybi1BbndlaXN1bmcgaXN0IG51ciBpbSBLb250ZXh0IGVpbmVyIE1ldGhvZGUgZXJsYXVidC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5vZGUudGVybSAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAobWV0aG9kLmdldFJldHVyblR5cGUoKSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBNZXRob2RlIFwiICsgbWV0aG9kLmlkZW50aWZpZXIgKyBcIiBlcndhcnRldCBrZWluZW4gUsO8Y2tnYWJld2VydC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUudGVybSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZW5zdXJlQXV0b21hdGljQ2FzdGluZyh0eXBlLnR5cGUsIG1ldGhvZC5nZXRSZXR1cm5UeXBlKCksIG51bGwsIG5vZGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgTWV0aG9kZSBcIiArIG1ldGhvZC5pZGVudGlmaWVyICsgXCIgZXJ3YXJ0ZXQgZWluZW4gUsO8Y2tnYWJld2VydCB2b20gVHlwIFwiICsgbWV0aG9kLmdldFJldHVyblR5cGUoKS5pZGVudGlmaWVyICsgXCIuIEdlZnVuZGVuIHd1cmRlIGVpbiBXZXJ0IHZvbSBUeXAgXCIgKyB0eXBlLnR5cGUuaWRlbnRpZmllciArIFwiLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKG1ldGhvZC5nZXRSZXR1cm5UeXBlKCkgIT0gbnVsbCAmJiBtZXRob2QuZ2V0UmV0dXJuVHlwZSgpICE9IHZvaWRQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBNZXRob2RlIFwiICsgbWV0aG9kLmlkZW50aWZpZXIgKyBcIiBlcndhcnRldCBlaW5lbiBSw7xja2dhYmV3ZXJ0IHZvbSBUeXAgXCIgKyBtZXRob2QuZ2V0UmV0dXJuVHlwZSgpLmlkZW50aWZpZXIgKyBcIiwgZGFoZXIgaXN0IGRpZSBsZWVyZSBSZXR1cm4tQW53ZWlzdW5nIChyZXR1cm47KSBuaWNodCBhdXNyZWljaGVuZC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucmV0dXJuLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgY29weVJldHVyblZhbHVlVG9TdGFja2ZyYW1lUG9zMDogbm9kZS50ZXJtICE9IG51bGwsXHJcbiAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbGVhdmVUaGlzT2JqZWN0T25TdGFjazogZmFsc2VcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgd2l0aFJldHVyblN0YXRlbWVudDogdHJ1ZSB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzU3dpdGNoKG5vZGU6IFN3aXRjaE5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgbG0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlcjtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIG5vZGUuc2NvcGVGcm9tLCBub2RlLnNjb3BlVG8pO1xyXG5cclxuICAgICAgICBsZXQgY3QgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuY29uZGl0aW9uKTtcclxuICAgICAgICBpZiAoY3QgPT0gbnVsbCB8fCBjdC50eXBlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IGNvbmRpdGlvblR5cGUgPSBjdC50eXBlO1xyXG5cclxuICAgICAgICBsZXQgaXNTdHJpbmcgPSBjb25kaXRpb25UeXBlID09IHN0cmluZ1ByaW1pdGl2ZVR5cGUgfHwgY29uZGl0aW9uVHlwZSA9PSBjaGFyUHJpbWl0aXZlVHlwZTtcclxuICAgICAgICBsZXQgaXNJbnRlZ2VyID0gY29uZGl0aW9uVHlwZSA9PSBpbnRQcmltaXRpdmVUeXBlO1xyXG4gICAgICAgIGxldCBpc0VudW0gPSBjb25kaXRpb25UeXBlIGluc3RhbmNlb2YgRW51bTtcclxuXHJcbiAgICAgICAgaWYgKCEoaXNTdHJpbmcgfHwgaXNJbnRlZ2VyIHx8IGlzRW51bSkpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgVW50ZXJzY2hlaWR1bmdzdGVybXMgZWluZXIgc3dpdGNoLUFud2Vpc3VuZyBtdXNzIGRlbiBEYXRlbnR5cCBTdHJpbmcsIGNoYXIsIGludCBvZGVyIGVudW0gYmVzaXR6ZW4uIERpZXNlciBoaWVyIGlzdCB2b20gVHlwIFwiICsgY29uZGl0aW9uVHlwZS5pZGVudGlmaWVyLCBub2RlLmNvbmRpdGlvbi5wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXNFbnVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhc3RWYWx1ZSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLmNvbmRpdGlvbi5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIG5ld1R5cGU6IGludFByaW1pdGl2ZVR5cGVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc3dpdGNoU3RhdGVtZW50OiBKdW1wT25Td2l0Y2hTdGF0ZW1lbnQgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5rZXl3b3JkU3dpdGNoLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgZGVmYXVsdERlc3RpbmF0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICBzd2l0Y2hUeXBlOiBpc1N0cmluZyA/IFwic3RyaW5nXCIgOiBcIm51bWJlclwiLFxyXG4gICAgICAgICAgICBkZXN0aW5hdGlvbkxhYmVsczogW10sXHJcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uTWFwOiB7fVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhzd2l0Y2hTdGF0ZW1lbnQpO1xyXG5cclxuICAgICAgICAvLyBpZiB2YWx1ZSBub3QgaW5jbHVkZWQgaW4gY2FzZS1zdGF0ZW1lbnQgYW5kIG5vIGRlZmF1bHQtc3RhdGVtZW50IHByZXNlbnQ6XHJcbiAgICAgICAgbGV0IGVuZExhYmVsID0gbG0uaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBBbHdheXMsIG5vZGUucG9zaXRpb24sIHRoaXMpO1xyXG5cclxuICAgICAgICBzd2l0Y2hTdGF0ZW1lbnQuc3RlcEZpbmlzaGVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgbG0ucmVnaXN0ZXJTd2l0Y2hTdGF0ZW1lbnQoc3dpdGNoU3RhdGVtZW50KTtcclxuXHJcbiAgICAgICAgdGhpcy5vcGVuQnJlYWtTY29wZSgpO1xyXG5cclxuICAgICAgICBsZXQgd2l0aFJldHVyblN0YXRlbWVudCA9IG5vZGUuY2FzZU5vZGVzLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGNhc2VOb2RlIG9mIG5vZGUuY2FzZU5vZGVzKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgaXNEZWZhdWx0ID0gY2FzZU5vZGUuY2FzZVRlcm0gPT0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGlmICghaXNEZWZhdWx0KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGNvbnN0YW50OiBzdHJpbmcgfCBudW1iZXIgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpc0VudW0gJiYgY2FzZU5vZGUuY2FzZVRlcm0udHlwZSA9PSBUb2tlblR5cGUuaWRlbnRpZmllcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbjogRW51bSA9IDxFbnVtPmNvbmRpdGlvblR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZm8gPSBlbi5pZGVudGlmaWVyVG9JbmZvTWFwW2Nhc2VOb2RlLmNhc2VUZXJtLmlkZW50aWZpZXJdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmZvID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgRW51bS1LbGFzc2UgXCIgKyBjb25kaXRpb25UeXBlLmlkZW50aWZpZXIgKyBcIiBoYXQga2VpbiBFbGVtZW50IG1pdCBkZW0gQmV6ZWljaG5lciBcIiArIGNhc2VOb2RlLmNhc2VUZXJtLmlkZW50aWZpZXIsIGNhc2VOb2RlLnBvc2l0aW9uLCBcImVycm9yXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0YW50ID0gaW5mby5vcmRpbmFsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNhc2VUZXJtID0gdGhpcy5wcm9jZXNzTm9kZShjYXNlTm9kZS5jYXNlVGVybSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBscyA9IHRoaXMubGFzdFN0YXRlbWVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxzLnR5cGUgPT0gVG9rZW5UeXBlLnB1c2hDb25zdGFudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdGFudCA9IGxzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxzLnR5cGUgPT0gVG9rZW5UeXBlLnB1c2hFbnVtVmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RhbnQgPSBscy5lbnVtQ2xhc3MuZ2V0T3JkaW5hbChscy52YWx1ZUlkZW50aWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVMYXN0U3RhdGVtZW50KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNvbnN0YW50ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBUZXJtIGJlaSBjYXNlIG11c3Mga29uc3RhbnQgc2Vpbi5cIiwgY2FzZU5vZGUuY2FzZVRlcm0ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBsYWJlbCA9IGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKGNhc2VOb2RlLnN0YXRlbWVudHMpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdGF0ZW1lbnRzPy53aXRoUmV0dXJuU3RhdGVtZW50ID09IG51bGwgfHwgIXN0YXRlbWVudHMud2l0aFJldHVyblN0YXRlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzd2l0Y2hTdGF0ZW1lbnQuZGVzdGluYXRpb25MYWJlbHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3RhbnQ6IGNvbnN0YW50LFxyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiBsYWJlbFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBkZWZhdWx0IGNhc2VcclxuICAgICAgICAgICAgICAgIGxldCBsYWJlbCA9IGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKGNhc2VOb2RlLnN0YXRlbWVudHMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlbWVudHM/LndpdGhSZXR1cm5TdGF0ZW1lbnQgPT0gbnVsbCB8fCAhc3RhdGVtZW50cy53aXRoUmV0dXJuU3RhdGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2l0aFJldHVyblN0YXRlbWVudCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc3dpdGNoU3RhdGVtZW50LmRlZmF1bHREZXN0aW5hdGlvbiA9IGxhYmVsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN3aXRjaFN0YXRlbWVudC5kZWZhdWx0RGVzdGluYXRpb24gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB3aXRoUmV0dXJuU3RhdGVtZW50ID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEsIGVuZExhYmVsKTtcclxuXHJcbiAgICAgICAgdGhpcy5jbG9zZUJyZWFrU2NvcGUoZW5kTGFiZWwsIGxtKTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZShudWxsKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgd2l0aFJldHVyblN0YXRlbWVudDogd2l0aFJldHVyblN0YXRlbWVudCB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NJZihub2RlOiBJZk5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgbG0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlcjtcclxuXHJcbiAgICAgICAgbGV0IGNvbmRpdGlvblR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuY29uZGl0aW9uKTtcclxuXHJcbiAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZS5jb25kaXRpb24sIGNvbmRpdGlvblR5cGU/LnR5cGUpO1xyXG4gICAgICAgIGlmIChjb25kaXRpb25UeXBlICE9IG51bGwgJiYgY29uZGl0aW9uVHlwZS50eXBlICE9IGJvb2xlYW5QcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFdlcnQgZGVzIFRlcm1zIGluIEtsYW1tZXJuIGhpbnRlciAnaWYnIG11c3MgZGVuIERhdGVudHlwIGJvb2xlYW4gYmVzaXR6ZW4uXCIsIG5vZGUuY29uZGl0aW9uLnBvc2l0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBiZWdpbkVsc2UgPSBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmRmFsc2UsIG51bGwsIHRoaXMpO1xyXG5cclxuICAgICAgICBsZXQgd2l0aFJldHVyblN0YXRlbWVudElmID0gdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMobm9kZS5zdGF0ZW1lbnRzSWZUcnVlKS53aXRoUmV0dXJuU3RhdGVtZW50O1xyXG5cclxuICAgICAgICBsZXQgZW5kT2ZJZjogbnVtYmVyO1xyXG4gICAgICAgIGlmIChub2RlLnN0YXRlbWVudHNJZkZhbHNlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgZW5kT2ZJZiA9IGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wQWx3YXlzLCBudWxsLCB0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSwgYmVnaW5FbHNlKTtcclxuXHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnRFbHNlOiBib29sZWFuO1xyXG4gICAgICAgIGlmIChub2RlLnN0YXRlbWVudHNJZkZhbHNlID09IG51bGwgfHwgbm9kZS5zdGF0ZW1lbnRzSWZGYWxzZS5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB3aXRoUmV0dXJuU3RhdGVtZW50RWxzZSA9IGZhbHNlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHdpdGhSZXR1cm5TdGF0ZW1lbnRFbHNlID0gdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMobm9kZS5zdGF0ZW1lbnRzSWZGYWxzZSkud2l0aFJldHVyblN0YXRlbWVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlbmRPZklmICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxLCBlbmRPZklmKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IG51bGwsIGlzQXNzaWduYWJsZTogZmFsc2UsIHdpdGhSZXR1cm5TdGF0ZW1lbnQ6IHdpdGhSZXR1cm5TdGF0ZW1lbnRJZiAmJiB3aXRoUmV0dXJuU3RhdGVtZW50RWxzZSB9O1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgcHJvY2Vzc0Zvcihub2RlOiBGb3JOb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IGxtID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXI7XHJcblxyXG4gICAgICAgIHRoaXMucHVzaE5ld1N5bWJvbFRhYmxlKGZhbHNlLCBub2RlLnNjb3BlRnJvbSwgbm9kZS5zY29wZVRvKTtcclxuXHJcbiAgICAgICAgdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMobm9kZS5zdGF0ZW1lbnRzQmVmb3JlKTtcclxuXHJcbiAgICAgICAgbGV0IGxhYmVsQmVmb3JlQ29uZGl0aW9uID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuXHJcbiAgICAgICAgbGV0IGNvbmRpdGlvblR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuY29uZGl0aW9uKTtcclxuXHJcbiAgICAgICAgaWYgKGNvbmRpdGlvblR5cGUgIT0gbnVsbCAmJiBjb25kaXRpb25UeXBlLnR5cGUgIT0gYm9vbGVhblByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZS5jb25kaXRpb24pO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBXZXJ0IGRlciBCZWRpbmd1bmcgbXVzcyBkZW4gRGF0ZW50eXAgYm9vbGVhbiBiZXNpdHplbi5cIiwgbm9kZS5jb25kaXRpb24ucG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGxhYmVsQWZ0ZXJGb3JMb29wID0gbG0uaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBJZkZhbHNlLCBudWxsLCB0aGlzKTtcclxuXHJcbiAgICAgICAgdGhpcy5vcGVuQnJlYWtTY29wZSgpO1xyXG4gICAgICAgIHRoaXMub3BlbkNvbnRpbnVlU2NvcGUoKTtcclxuXHJcbiAgICAgICAgbGV0IHN0YXRlbWVudHMgPSB0aGlzLmdlbmVyYXRlU3RhdGVtZW50cyhub2RlLnN0YXRlbWVudHMpO1xyXG4gICAgICAgIGxldCB3aXRoUmV0dXJuU3RhdGVtZW50ID0gc3RhdGVtZW50cy53aXRoUmV0dXJuU3RhdGVtZW50O1xyXG5cclxuICAgICAgICBsZXQgY29udGludWVMYWJlbEluZGV4ID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuICAgICAgICB0aGlzLmNsb3NlQ29udGludWVTY29wZShjb250aW51ZUxhYmVsSW5kZXgsIGxtKTtcclxuICAgICAgICB0aGlzLmdlbmVyYXRlU3RhdGVtZW50cyhub2RlLnN0YXRlbWVudHNBZnRlcik7XHJcblxyXG4gICAgICAgIGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wQWx3YXlzLCBzdGF0ZW1lbnRzLmVuZFBvc2l0aW9uLCB0aGlzLCBsYWJlbEJlZm9yZUNvbmRpdGlvbik7XHJcblxyXG4gICAgICAgIGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSwgbGFiZWxBZnRlckZvckxvb3ApO1xyXG5cclxuICAgICAgICB0aGlzLmNsb3NlQnJlYWtTY29wZShsYWJlbEFmdGVyRm9yTG9vcCwgbG0pO1xyXG5cclxuICAgICAgICB0aGlzLnBvcFN5bWJvbFRhYmxlKCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IG51bGwsIGlzQXNzaWduYWJsZTogZmFsc2UsIHdpdGhSZXR1cm5TdGF0ZW1lbnQ6IHdpdGhSZXR1cm5TdGF0ZW1lbnQgfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc0Zvckxvb3BPdmVyQ29sbGVjdGlvbihub2RlOiBGb3JOb2RlT3ZlckNvbGxlY2lvbik6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBsbSA9IHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyO1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZShmYWxzZSwgbm9kZS5zY29wZUZyb20sIG5vZGUuc2NvcGVUbyk7XHJcblxyXG4gICAgICAgIC8vIHJlc2VydmUgcG9zaXRpb24gb24gc3RhY2sgZm9yIGNvbGxlY3Rpb25cclxuICAgICAgICBsZXQgc3RhY2tQb3NGb3JDb2xsZWN0aW9uID0gdGhpcy5uZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3MrKztcclxuXHJcbiAgICAgICAgLy8gYXNzaWduIHZhbHVlIG9mIGNvbGxlY3Rpb24gdGVybSB0byBjb2xsZWN0aW9uXHJcbiAgICAgICAgbGV0IGN0ID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLmNvbGxlY3Rpb24pO1xyXG4gICAgICAgIGlmIChjdCA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgbGV0IGNvbGxlY3Rpb25UeXBlID0gY3QudHlwZTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wb3BBbmRTdG9yZUludG9WYXJpYWJsZSxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUuY29sbGVjdGlvbi5wb3NpdGlvbixcclxuICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiBzdGFja1Bvc0ZvckNvbGxlY3Rpb24sXHJcbiAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2VcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBsZXQgY29sbGVjdGlvbkVsZW1lbnRUeXBlOiBUeXBlO1xyXG5cclxuICAgICAgICBsZXQga2luZDogXCJhcnJheVwiIHwgXCJpbnRlcm5hbExpc3RcIiB8IFwiZ3JvdXBcIiB8IFwidXNlckRlZmluZWRJdGVyYWJsZVwiID0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKGNvbGxlY3Rpb25UeXBlIGluc3RhbmNlb2YgQXJyYXlUeXBlKSB7XHJcbiAgICAgICAgICAgIGNvbGxlY3Rpb25FbGVtZW50VHlwZSA9IGNvbGxlY3Rpb25UeXBlLmFycmF5T2ZUeXBlO1xyXG4gICAgICAgICAgICBraW5kID0gXCJhcnJheVwiO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoY29sbGVjdGlvblR5cGUgaW5zdGFuY2VvZiBLbGFzcyAmJiBjb2xsZWN0aW9uVHlwZS5nZXRJbXBsZW1lbnRlZEludGVyZmFjZShcIkl0ZXJhYmxlXCIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKGNvbGxlY3Rpb25UeXBlLm1vZHVsZS5pc1N5c3RlbU1vZHVsZSkge1xyXG4gICAgICAgICAgICAgICAga2luZCA9IFwiaW50ZXJuYWxMaXN0XCI7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBraW5kID0gXCJ1c2VyRGVmaW5lZEl0ZXJhYmxlXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IGl0ZXJhYmxlSW50ZXJmYWNlID0gY29sbGVjdGlvblR5cGUuZ2V0SW1wbGVtZW50ZWRJbnRlcmZhY2UoXCJJdGVyYWJsZVwiKTtcclxuICAgICAgICAgICAgaWYgKGNvbGxlY3Rpb25UeXBlLnR5cGVWYXJpYWJsZXMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25FbGVtZW50VHlwZSA9IG9iamVjdFR5cGU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uRWxlbWVudFR5cGUgPSBjb2xsZWN0aW9uVHlwZS50eXBlVmFyaWFibGVzWzBdLnR5cGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGNvbGxlY3Rpb25UeXBlIGluc3RhbmNlb2YgS2xhc3MgJiYgY29sbGVjdGlvblR5cGUuaWRlbnRpZmllciA9PSBcIkdyb3VwXCIpIHtcclxuICAgICAgICAgICAga2luZCA9IFwiZ3JvdXBcIjtcclxuICAgICAgICAgICAgY29sbGVjdGlvbkVsZW1lbnRUeXBlID0gdGhpcy5tb2R1bGVTdG9yZS5nZXRUeXBlKFwiU2hhcGVcIikudHlwZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiTWl0IGRlciB2ZXJlaW5mYWNodGVuIGZvci1TY2hsZWlmZSAoZm9yIGlkZW50aWZpZXIgOiBjb2xsZWN0aW9uT3JBcnJheSkga2FubiBtYW4gbnVyIMO8YmVyIEFycmF5cyBvZGVyIEtsYXNzZW4sIGRpZSBkYXMgSW50ZXJmYWNlIEl0ZXJhYmxlIGltcGxlbWVudGllcmVuLCBpdGVyaWVyZW4uXCIsIG5vZGUuY29sbGVjdGlvbi5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHZhcmlhYmxlVHlwZSA9IG5vZGUudmFyaWFibGVUeXBlLnJlc29sdmVkVHlwZTtcclxuICAgICAgICBpZiAodmFyaWFibGVUeXBlID09IG51bGwpIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICBsZXQgbm9DYXN0aW5nTmVlZGVkID0gdmFyaWFibGVUeXBlID09IHZhclR5cGU7XHJcbiAgICAgICAgaWYgKG5vQ2FzdGluZ05lZWRlZCkge1xyXG4gICAgICAgICAgICB2YXJpYWJsZVR5cGUgPSBjb2xsZWN0aW9uRWxlbWVudFR5cGU7XHJcbiAgICAgICAgICAgIG5vZGUudmFyaWFibGVUeXBlLnJlc29sdmVkVHlwZSA9IGNvbGxlY3Rpb25FbGVtZW50VHlwZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICghY29sbGVjdGlvbkVsZW1lbnRUeXBlLmNhbkNhc3RUbyh2YXJpYWJsZVR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBFbGVtZW50VHlwIFwiICsgY29sbGVjdGlvbkVsZW1lbnRUeXBlLmlkZW50aWZpZXIgKyBcIiBkZXIgQ29sbGVjdGlvbiBrYW5uIG5pY2h0IGluIGRlbiBUeXAgXCIgKyB2YXJpYWJsZVR5cGUuaWRlbnRpZmllciArIFwiIGRlciBJdGVyYXRpb25zdmFyaWFibGUgXCIgKyBub2RlLnZhcmlhYmxlSWRlbnRpZmllciArIFwiIGtvbnZlcnRpZXJ0IHdlcmRlbi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5sb2NhbFZhcmlhYmxlRGVjbGFyYXRpb24oe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uLFxyXG4gICAgICAgICAgICBpZGVudGlmaWVyOiBub2RlLnZhcmlhYmxlSWRlbnRpZmllcixcclxuICAgICAgICAgICAgaW5pdGlhbGl6YXRpb246IG51bGwsXHJcbiAgICAgICAgICAgIGlzRmluYWw6IGZhbHNlLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS52YXJpYWJsZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICB2YXJpYWJsZVR5cGU6IG5vZGUudmFyaWFibGVUeXBlXHJcbiAgICAgICAgfSwgdHJ1ZSlcclxuXHJcbiAgICAgICAgbGV0IHZhcmlhYmxlU3RhY2tQb3MgPSB0aGlzLm5leHRGcmVlUmVsYXRpdmVTdGFja1BvcyAtIDE7XHJcbiAgICAgICAgbGV0IHN0YWNrUG9zT2ZDb3VudGVyVmFyaWFibGVPckl0ZXJhdG9yID0gdGhpcy5uZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3MrKztcclxuXHJcbiAgICAgICAgaWYgKGtpbmQgPT0gXCJhcnJheVwiIHx8IGtpbmQgPT0gXCJpbnRlcm5hbExpc3RcIiB8fCBraW5kID09IFwiZ3JvdXBcIikge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFt7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuZXh0ZW5kZWRGb3JMb29wSW5pdCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0YWNrUG9zT2ZDb2xsZWN0aW9uOiBzdGFja1Bvc0ZvckNvbGxlY3Rpb24sXHJcbiAgICAgICAgICAgICAgICBzdGFja1Bvc09mRWxlbWVudDogdmFyaWFibGVTdGFja1BvcyxcclxuICAgICAgICAgICAgICAgIHR5cGVPZkVsZW1lbnQ6IHZhcmlhYmxlVHlwZSxcclxuICAgICAgICAgICAgICAgIHN0YWNrUG9zT2ZDb3VudGVyOiBzdGFja1Bvc09mQ291bnRlclZhcmlhYmxlT3JJdGVyYXRvclxyXG4gICAgICAgICAgICB9XSwgdHJ1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gZ2V0IEl0ZXJhdG9yIGZyb20gY29sbGVjdGlvblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogc3RhY2tQb3NPZkNvdW50ZXJWYXJpYWJsZU9ySXRlcmF0b3IsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogc3RhY2tQb3NGb3JDb2xsZWN0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhbGxNZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBpc1N1cGVyQ2FsbDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBjb2xsZWN0aW9uVHlwZS5nZXRNZXRob2QoXCJpdGVyYXRvclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXSkpLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLTFcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmFzc2lnbm1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlYXZlVmFsdWVPblN0YWNrOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfV0sIHRydWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGxhYmVsQmVmb3JlQ29uZGl0aW9uID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuICAgICAgICBsZXQgbGFiZWxBZnRlckZvckxvb3A6IG51bWJlcjtcclxuICAgICAgICBsZXQgbGFzdFN0YXRlbWVudEJlZm9yZUNhc3Rpbmc6IFN0YXRlbWVudDtcclxuXHJcbiAgICAgICAgaWYgKGtpbmQgPT0gXCJhcnJheVwiIHx8IGtpbmQgPT0gXCJpbnRlcm5hbExpc3RcIiB8fCBraW5kID09IFwiZ3JvdXBcIikge1xyXG4gICAgICAgICAgICBsZXQganVtcE5vZGU6IEV4dGVuZGVkRm9yTG9vcENoZWNrQ291bnRlckFuZEdldEVsZW1lbnQgPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuZXh0ZW5kZWRGb3JMb29wQ2hlY2tDb3VudGVyQW5kR2V0RWxlbWVudCxcclxuICAgICAgICAgICAgICAgIGtpbmQ6IGtpbmQsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS52YXJpYWJsZVBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tQb3NPZkNvbGxlY3Rpb246IHN0YWNrUG9zRm9yQ29sbGVjdGlvbixcclxuICAgICAgICAgICAgICAgIHN0YWNrUG9zT2ZFbGVtZW50OiB2YXJpYWJsZVN0YWNrUG9zLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tQb3NPZkNvdW50ZXI6IHN0YWNrUG9zT2ZDb3VudGVyVmFyaWFibGVPckl0ZXJhdG9yLFxyXG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb246IDAgLy8gZ2V0cyBmaWxsZWQgaW4gbGF0ZXIsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGxhc3RTdGF0ZW1lbnRCZWZvcmVDYXN0aW5nID0ganVtcE5vZGU7XHJcbiAgICAgICAgICAgIGxhYmVsQWZ0ZXJGb3JMb29wID0gbG0ucmVnaXN0ZXJKdW1wTm9kZShqdW1wTm9kZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFxyXG4gICAgICAgICAgICAgICAganVtcE5vZGVcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gY2FsbCBjb2xsZWN0aW9uLmhhc05leHQoKVxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnZhcmlhYmxlUG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiBzdGFja1Bvc0ZvckNvbGxlY3Rpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzU3VwZXJDYWxsOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IGNvbGxlY3Rpb25UeXBlLmdldE1ldGhvZChcImhhc05leHRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pKSxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0xXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBdKTtcclxuICAgICAgICAgICAgbGFiZWxBZnRlckZvckxvb3AgPSBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmRmFsc2UsIG51bGwsIHRoaXMpO1xyXG4gICAgICAgICAgICAvLyBjYWxsIGNvbGxlY3Rpb24ubmV4dCgpIGFuZCBhc3NpZ24gdG8gbG9vcCB2YXJpYWJsZVxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogdmFyaWFibGVTdGFja1BvcyxcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiBzdGFja1Bvc0ZvckNvbGxlY3Rpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzU3VwZXJDYWxsOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IGNvbGxlY3Rpb25UeXBlLmdldE1ldGhvZChcIm5leHRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pKSxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0xXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5hc3NpZ25tZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBsZWF2ZVZhbHVlT25TdGFjazogZmFsc2VcclxuICAgICAgICAgICAgICAgIH1dKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghbm9DYXN0aW5nTmVlZGVkKSB7XHJcbiAgICAgICAgICAgIGxldCBvbGRTdGF0ZW1lbnRDb3VudCA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGg7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hMb2NhbFZhcmlhYmxlVG9TdGFjayxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiB2YXJpYWJsZVN0YWNrUG9zLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKGNvbGxlY3Rpb25FbGVtZW50VHlwZSwgdmFyaWFibGVUeXBlKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPCBvbGRTdGF0ZW1lbnRDb3VudCArIDIpIHtcclxuICAgICAgICAgICAgICAgIC8vIGNhc3RpbmcgbmVlZGVkIG5vIHN0YXRlbWVudCwgc28gZGVsZXRlIHB1c2hMb2NhbFZhcmlhYmxldG9TdGFjay1TdGF0ZW1lbnRcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5wb3AoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wb3BBbmRTdG9yZUludG9WYXJpYWJsZSxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja3Bvc09mVmFyaWFibGU6IHZhcmlhYmxlU3RhY2tQb3MsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGxhc3RTdGF0ZW1lbnRCZWZvcmVDYXN0aW5nLnN0ZXBGaW5pc2hlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm9wZW5CcmVha1Njb3BlKCk7XHJcbiAgICAgICAgdGhpcy5vcGVuQ29udGludWVTY29wZSgpO1xyXG5cclxuICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKG5vZGUuc3RhdGVtZW50cyk7XHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzLndpdGhSZXR1cm5TdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgIGxldCBjb250aW51ZUxhYmVsSW5kZXggPSBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEpO1xyXG4gICAgICAgIHRoaXMuY2xvc2VDb250aW51ZVNjb3BlKGNvbnRpbnVlTGFiZWxJbmRleCwgbG0pO1xyXG5cclxuICAgICAgICBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcEFsd2F5cywgc3RhdGVtZW50cy5lbmRQb3NpdGlvbiwgdGhpcywgbGFiZWxCZWZvcmVDb25kaXRpb24pO1xyXG5cclxuICAgICAgICBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEsIGxhYmVsQWZ0ZXJGb3JMb29wKTtcclxuXHJcbiAgICAgICAgdGhpcy5jbG9zZUJyZWFrU2NvcGUobGFiZWxBZnRlckZvckxvb3AsIGxtKTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZSgpO1xyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiBudWxsLCBpc0Fzc2lnbmFibGU6IGZhbHNlLCB3aXRoUmV0dXJuU3RhdGVtZW50OiB3aXRoUmV0dXJuU3RhdGVtZW50IH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NXaGlsZShub2RlOiBXaGlsZU5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgbG0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlcjtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIG5vZGUuc2NvcGVGcm9tLCBub2RlLnNjb3BlVG8pO1xyXG5cclxuICAgICAgICBsZXQgY29uZGl0aW9uQmVnaW5MYWJlbCA9IGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSk7XHJcblxyXG4gICAgICAgIGxldCBjb25kaXRpb25UeXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLmNvbmRpdGlvbik7XHJcblxyXG4gICAgICAgIGlmIChjb25kaXRpb25UeXBlICE9IG51bGwgJiYgY29uZGl0aW9uVHlwZS50eXBlICE9IGJvb2xlYW5QcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlY2tJZkFzc2lnbm1lbnRJbnN0ZWRPZkVxdWFsKG5vZGUuY29uZGl0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgV2VydCBkZXMgVGVybXMgaW4gS2xhbW1lcm4gaGludGVyICd3aGlsZScgbXVzcyBkZW4gRGF0ZW50eXAgYm9vbGVhbiBiZXNpdHplbi5cIiwgbm9kZS5jb25kaXRpb24ucG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gbm9kZS5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUuY29uZGl0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgcG9zaXRpb24gPSBub2RlLmNvbmRpdGlvbi5wb3NpdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBhZnRlcldoaWxlU3RhdGVtZW50TGFiZWwgPSBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmRmFsc2UsIHBvc2l0aW9uLCB0aGlzKTtcclxuXHJcbiAgICAgICAgdGhpcy5vcGVuQnJlYWtTY29wZSgpO1xyXG4gICAgICAgIHRoaXMub3BlbkNvbnRpbnVlU2NvcGUoKTtcclxuXHJcbiAgICAgICAgbGV0IHBjID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aDtcclxuICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKG5vZGUuc3RhdGVtZW50cyk7XHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzLndpdGhSZXR1cm5TdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID09IHBjKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zZXJ0Tm9PcChub2RlLnNjb3BlVG8sIGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2xvc2VDb250aW51ZVNjb3BlKGNvbmRpdGlvbkJlZ2luTGFiZWwsIGxtKTtcclxuICAgICAgICBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcEFsd2F5cywgc3RhdGVtZW50cy5lbmRQb3NpdGlvbiwgdGhpcywgY29uZGl0aW9uQmVnaW5MYWJlbCk7XHJcblxyXG4gICAgICAgIGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSwgYWZ0ZXJXaGlsZVN0YXRlbWVudExhYmVsKTtcclxuXHJcbiAgICAgICAgdGhpcy5jbG9zZUJyZWFrU2NvcGUoYWZ0ZXJXaGlsZVN0YXRlbWVudExhYmVsLCBsbSk7XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgd2l0aFJldHVyblN0YXRlbWVudDogd2l0aFJldHVyblN0YXRlbWVudCB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpbnNlcnROb09wKHBvc2l0aW9uOiBUZXh0UG9zaXRpb24sIHN0ZXBGaW5pc2hlZDogYm9vbGVhbikge1xyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubm9PcCxcclxuICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHN0ZXBGaW5pc2hlZFxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc0RvKG5vZGU6IERvV2hpbGVOb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IGxtID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXI7XHJcblxyXG4gICAgICAgIHRoaXMucHVzaE5ld1N5bWJvbFRhYmxlKGZhbHNlLCBub2RlLnNjb3BlRnJvbSwgbm9kZS5zY29wZVRvKTtcclxuXHJcbiAgICAgICAgbGV0IHN0YXRlbWVudHNCZWdpbkxhYmVsID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuXHJcbiAgICAgICAgdGhpcy5vcGVuQnJlYWtTY29wZSgpO1xyXG4gICAgICAgIHRoaXMub3BlbkNvbnRpbnVlU2NvcGUoKTtcclxuXHJcbiAgICAgICAgbGV0IHBjID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aDtcclxuICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKG5vZGUuc3RhdGVtZW50cyk7XHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzLndpdGhSZXR1cm5TdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID09IHBjKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zZXJ0Tm9PcChub2RlLnNjb3BlVG8sIGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBjb250aW51ZUxhYmVsSW5kZXggPSBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEpO1xyXG4gICAgICAgIHRoaXMuY2xvc2VDb250aW51ZVNjb3BlKGNvbnRpbnVlTGFiZWxJbmRleCwgbG0pO1xyXG5cclxuICAgICAgICBsZXQgY29uZGl0aW9uVHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5jb25kaXRpb24pO1xyXG5cclxuICAgICAgICBpZiAoY29uZGl0aW9uVHlwZSAhPSBudWxsICYmIGNvbmRpdGlvblR5cGUudHlwZSAhPSBib29sZWFuUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICB0aGlzLmNoZWNrSWZBc3NpZ25tZW50SW5zdGVkT2ZFcXVhbChub2RlLmNvbmRpdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFdlcnQgZGVzIFRlcm1zIGluIEtsYW1tZXJuIGhpbnRlciAnd2hpbGUnIG11c3MgZGVuIERhdGVudHlwIGJvb2xlYW4gYmVzaXR6ZW4uXCIsIG5vZGUuY29uZGl0aW9uLnBvc2l0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wSWZUcnVlLCBzdGF0ZW1lbnRzLmVuZFBvc2l0aW9uLCB0aGlzLCBzdGF0ZW1lbnRzQmVnaW5MYWJlbCk7XHJcblxyXG4gICAgICAgIGxldCBlbmRMYWJlbCA9IGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSk7XHJcblxyXG4gICAgICAgIHRoaXMuY2xvc2VCcmVha1Njb3BlKGVuZExhYmVsLCBsbSk7XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgd2l0aFJldHVyblN0YXRlbWVudDogd2l0aFJldHVyblN0YXRlbWVudCB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBuZXdPYmplY3Qobm9kZTogTmV3T2JqZWN0Tm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGlmIChub2RlLmNsYXNzVHlwZSA9PSBudWxsIHx8IG5vZGUuY2xhc3NUeXBlLnJlc29sdmVkVHlwZSA9PSBudWxsKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgbGV0IHJlc29sdmVkVHlwZTogS2xhc3MgPSA8S2xhc3M+bm9kZS5jbGFzc1R5cGUucmVzb2x2ZWRUeXBlO1xyXG4gICAgICAgIGlmICghKHJlc29sdmVkVHlwZSBpbnN0YW5jZW9mIEtsYXNzKSkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihub2RlLmNsYXNzVHlwZS5pZGVudGlmaWVyICsgXCIgaXN0IGtlaW5lIEtsYXNzZSwgZGFoZXIga2FubiBkYXZvbiBtaXQgJ25ldycga2VpbiBPYmpla3QgZXJ6ZXVndCB3ZXJkZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyZXNvbHZlZFR5cGUuaXNBYnN0cmFjdCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihgJHtub2RlLmNsYXNzVHlwZS5pZGVudGlmaWVyfSBpc3QgZWluZSBhYnN0cmFrdGUgS2xhc3NlLCBkYWhlciBrYW5uIHZvbiBpaHIgbWl0ICduZXcnIGtlaW4gT2JqZWt0IGluc3RhbnppZXJ0IHdlcmRlbi4gRmFsbHMgJHtub2RlLmNsYXNzVHlwZS5pZGVudGlmaWVyfSBuaWNodC1hYnN0cmFrdGUgS2luZGtsYXNzZW4gYmVzaXR6dCwga8O2bm50ZXN0IER1IHZvbiBERU5FTiBtaXQgbmV3IE9iamVrdGUgaW5zdGFuemllcmVuLi4uYCwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy90aGlzLnB1c2hUeXBlUG9zaXRpb24obm9kZS5yaWdodEJyYWNrZXRQb3NpdGlvbiwgY2xhc3NUeXBlKTtcclxuXHJcbiAgICAgICAgaWYgKHJlc29sdmVkVHlwZS5tb2R1bGUgIT0gdGhpcy5tb2R1bGUgJiYgcmVzb2x2ZWRUeXBlLnZpc2liaWxpdHkgIT0gVmlzaWJpbGl0eS5wdWJsaWMpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgS2xhc3NlIFwiICsgcmVzb2x2ZWRUeXBlLmlkZW50aWZpZXIgKyBcIiBpc3QgaGllciBuaWNodCBzaWNodGJhci5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbmV3U3RhdGVtZW50OiBOZXdPYmplY3RTdGF0ZW1lbnQgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5uZXdPYmplY3QsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjbGFzczogcmVzb2x2ZWRUeXBlLFxyXG4gICAgICAgICAgICBzdWJzZXF1ZW50Q29uc3RydWN0b3JDYWxsOiBmYWxzZSxcclxuICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhuZXdTdGF0ZW1lbnQpO1xyXG4gICAgICAgIHRoaXMucHVzaFR5cGVQb3NpdGlvbihub2RlLnJpZ2h0QnJhY2tldFBvc2l0aW9uLCByZXNvbHZlZFR5cGUpOyAvLyB0byBlbmFibGUgY29kZSBjb21wbGV0aW9uIHdoZW4gdHlwaW5nIGEgcG9pbnQgYWZ0ZXIgdGhlIGNsb3NpbmcgYnJhY2tldFxyXG5cclxuICAgICAgICBsZXQgcGFyYW1ldGVyVHlwZXM6IFR5cGVbXSA9IFtdO1xyXG4gICAgICAgIC8vIGxldCBwYXJhbWV0ZXJTdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXVtdID0gW107XHJcbiAgICAgICAgbGV0IHBvc2l0aW9uc0FmdGVyUGFyYW1ldGVyU3RhdGVtZW50czogbnVtYmVyW10gPSBbXVxyXG4gICAgICAgIGxldCBhbGxTdGF0ZW1lbnRzID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzO1xyXG5cclxuICAgICAgICBpZiAobm9kZS5jb25zdHJ1Y3Rvck9wZXJhbmRzPy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIC8vIGZvciAobGV0IHAgb2Ygbm9kZS5jb25zdHJ1Y3Rvck9wZXJhbmRzKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbm9kZS5jb25zdHJ1Y3Rvck9wZXJhbmRzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcCA9IG5vZGUuY29uc3RydWN0b3JPcGVyYW5kc1tqXTtcclxuICAgICAgICAgICAgICAgIC8vIGxldCBwcm9ncmFtUG9pbnRlciA9IGFsbFN0YXRlbWVudHMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgbGV0IHR5cGVOb2RlID0gdGhpcy5wcm9jZXNzTm9kZShwKTtcclxuICAgICAgICAgICAgICAgIC8vIHBhcmFtZXRlclN0YXRlbWVudHMucHVzaChhbGxTdGF0ZW1lbnRzLnNwbGljZShwcm9ncmFtUG9pbnRlciwgYWxsU3RhdGVtZW50cy5sZW5ndGggLSBwcm9ncmFtUG9pbnRlcikpO1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb25zQWZ0ZXJQYXJhbWV0ZXJTdGF0ZW1lbnRzLnB1c2goYWxsU3RhdGVtZW50cy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVOb2RlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJUeXBlcy5wdXNoKHZvaWRQcmltaXRpdmVUeXBlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyVHlwZXMucHVzaCh0eXBlTm9kZS50eXBlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHVwVG9WaXNpYmlsaXR5ID0gZ2V0VmlzaWJpbGl0eVVwVG8ocmVzb2x2ZWRUeXBlLCB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQpO1xyXG5cclxuICAgICAgICAvLyBsZXQgbWV0aG9kcyA9IHJlc29sdmVkVHlwZS5nZXRNZXRob2RzVGhhdEZpdFdpdGhDYXN0aW5nKHJlc29sdmVkVHlwZS5pZGVudGlmaWVyLFxyXG4gICAgICAgIC8vICAgICBwYXJhbWV0ZXJUeXBlcywgdHJ1ZSwgdXBUb1Zpc2liaWxpdHkpO1xyXG5cclxuICAgICAgICBsZXQgbWV0aG9kcyA9IHJlc29sdmVkVHlwZS5nZXRDb25zdHJ1Y3RvcihwYXJhbWV0ZXJUeXBlcywgdXBUb1Zpc2liaWxpdHkpO1xyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZS5wdXNoTWV0aG9kQ2FsbFBvc2l0aW9uKG5vZGUucG9zaXRpb24sIG5vZGUuY29tbWFQb3NpdGlvbnMsIHJlc29sdmVkVHlwZS5nZXRNZXRob2RzKFZpc2liaWxpdHkucHVibGljLCByZXNvbHZlZFR5cGUuaWRlbnRpZmllciksIG5vZGUucmlnaHRCcmFja2V0UG9zaXRpb24pO1xyXG5cclxuICAgICAgICAvLyBpZiB0aGVyZSdzIG5vIHBhcmFtZXRlcmxlc3MgY29uc3RydWN0b3IgdGhlbiByZXR1cm4gd2l0aG91dCBlcnJvcjpcclxuICAgICAgICBpZiAocGFyYW1ldGVyVHlwZXMubGVuZ3RoID4gMCB8fCByZXNvbHZlZFR5cGUuaGFzQ29uc3RydWN0b3IoKSkge1xyXG5cclxuICAgICAgICAgICAgaWYgKG1ldGhvZHMuZXJyb3IgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IobWV0aG9kcy5lcnJvciwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiByZXNvbHZlZFR5cGUsIGlzQXNzaWduYWJsZTogZmFsc2UgfTsgLy8gdHJ5IHRvIGNvbnRpbnVlLi4uXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBtZXRob2RzLm1ldGhvZExpc3RbMF07XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFVzYWdlUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgbWV0aG9kKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzdGF0aWNDbGFzc0NvbnRleHQgPSBudWxsO1xyXG4gICAgICAgICAgICBsZXQgY2xhc3NDb250ZXh0ID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0O1xyXG4gICAgICAgICAgICBpZiAoY2xhc3NDb250ZXh0ICE9IG51bGwgJiYgY2xhc3NDb250ZXh0IGluc3RhbmNlb2YgS2xhc3MpIHtcclxuICAgICAgICAgICAgICAgIHN0YXRpY0NsYXNzQ29udGV4dCA9IGNsYXNzQ29udGV4dC5zdGF0aWNDbGFzcztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG1ldGhvZC52aXNpYmlsaXR5ID09IFZpc2liaWxpdHkucHJpdmF0ZSAmJiByZXNvbHZlZFR5cGUgIT0gY2xhc3NDb250ZXh0ICYmIHJlc29sdmVkVHlwZSAhPSBzdGF0aWNDbGFzc0NvbnRleHQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBvayA9IChyZXNvbHZlZFR5cGUgPT0gY2xhc3NDb250ZXh0IHx8IHJlc29sdmVkVHlwZSAhPSBzdGF0aWNDbGFzc0NvbnRleHQgfHwgKGNsYXNzQ29udGV4dCBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzICYmIHJlc29sdmVkVHlwZSA9PSBjbGFzc0NvbnRleHQuS2xhc3MpKTtcclxuICAgICAgICAgICAgICAgIGlmICghb2spIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBLb25zdHJ1a3Rvcm1ldGhvZGUgaXN0IHByaXZhdGUgdW5kIGRhaGVyIGhpZXIgbmljaHQgc2ljaHRiYXIuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZGVzdFR5cGU6IFR5cGUgPSBudWxsO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcmFtZXRlclR5cGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA8IG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpKSB7ICAvLyBwb3NzaWJsZSBlbGxpcHNpcyFcclxuICAgICAgICAgICAgICAgICAgICBkZXN0VHlwZSA9IG1ldGhvZC5nZXRQYXJhbWV0ZXJUeXBlKGkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpID09IG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpIC0gMSAmJiBtZXRob2QuaGFzRWxsaXBzaXMoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXN0VHlwZSA9ICg8QXJyYXlUeXBlPmRlc3RUeXBlKS5hcnJheU9mVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHNyY1R5cGUgPSBwYXJhbWV0ZXJUeXBlc1tpXTtcclxuICAgICAgICAgICAgICAgIC8vIGZvciAobGV0IHN0IG9mIHBhcmFtZXRlclN0YXRlbWVudHNbaV0pIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMucHVzaChzdCk7XHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgICAgICBsZXQgcHJvZ3JhbVBvc2l0aW9uID0gYWxsU3RhdGVtZW50cy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZW5zdXJlQXV0b21hdGljQ2FzdGluZyhzcmNUeXBlLCBkZXN0VHlwZSwgbm9kZS5jb25zdHJ1Y3Rvck9wZXJhbmRzW2ldLnBvc2l0aW9uLCBub2RlLmNvbnN0cnVjdG9yT3BlcmFuZHNbaV0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgV2VydCB2b20gRGF0ZW50eXAgXCIgKyBzcmNUeXBlLmlkZW50aWZpZXIgKyBcIiBrYW5uIG5pY2h0IGFscyBQYXJhbWV0ZXIgKERhdGVudHlwIFwiICsgZGVzdFR5cGUuaWRlbnRpZmllciArIFwiKSB2ZXJ3ZW5kZXQgd2VyZGVuLlwiLCBub2RlLmNvbnN0cnVjdG9yT3BlcmFuZHNbaV0ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhbGxTdGF0ZW1lbnRzLmxlbmd0aCA+IHByb2dyYW1Qb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBjYXN0aW5nU3RhdGVtZW50cyA9IGFsbFN0YXRlbWVudHMuc3BsaWNlKHByb2dyYW1Qb3NpdGlvbiwgYWxsU3RhdGVtZW50cy5sZW5ndGggLSBwcm9ncmFtUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGFsbFN0YXRlbWVudHMuc3BsaWNlKHBvc2l0aW9uc0FmdGVyUGFyYW1ldGVyU3RhdGVtZW50c1tpXSwgMCwgLi4uY2FzdGluZ1N0YXRlbWVudHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLmNvcnJlY3RQb3NpdGlvbnNBZnRlckluc2VydChwb3NpdGlvbnNBZnRlclBhcmFtZXRlclN0YXRlbWVudHNbaV0sIGNhc3RpbmdTdGF0ZW1lbnRzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgc3RhY2tmcmFtZURlbHRhID0gMDtcclxuICAgICAgICAgICAgaWYgKG1ldGhvZC5oYXNFbGxpcHNpcygpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCA9IHBhcmFtZXRlclR5cGVzLmxlbmd0aCAtIG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpICsgMTsgLy8gbGFzdCBwYXJhbWV0ZXIgYW5kIHN1YnNlcXVlbnQgb25lc1xyXG4gICAgICAgICAgICAgICAgc3RhY2tmcmFtZURlbHRhID0gLSAoZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCAtIDEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLm1ha2VFbGxpcHNpc0FycmF5LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLmNvbnN0cnVjdG9yT3BlcmFuZHNbbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxXS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJDb3VudDogZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCxcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGFycmF5VHlwZTogbWV0aG9kLmdldFBhcmFtZXRlcihtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSAtIDEpLnR5cGVcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIGlzU3VwZXJDYWxsOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogcmVzb2x2ZWRUeXBlLmdldFBvc3RDb25zdHJ1Y3RvckNhbGxiYWNrcygpID09IG51bGwsXHJcbiAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0ocGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSArIHN0YWNrZnJhbWVEZWx0YSkgLy8gdGhpcy1vYmplY3QgZm9sbG93ZWQgYnkgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgICB9LCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIG5ld1N0YXRlbWVudC5zdWJzZXF1ZW50Q29uc3RydWN0b3JDYWxsID0gdHJ1ZTtcclxuICAgICAgICAgICAgbmV3U3RhdGVtZW50LnN0ZXBGaW5pc2hlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyZXNvbHZlZFR5cGUuZ2V0UG9zdENvbnN0cnVjdG9yQ2FsbGJhY2tzKCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wcm9jZXNzUG9zdENvbnN0cnVjdG9yQ2FsbGJhY2tzLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWVcclxuICAgICAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiByZXNvbHZlZFR5cGUsIGlzQXNzaWduYWJsZTogZmFsc2UgfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVzaEF0dHJpYnV0ZShub2RlOiBTZWxlY3RBcnJpYnV0ZU5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBpZiAobm9kZS5vYmplY3QgPT0gbnVsbCB8fCBub2RlLmlkZW50aWZpZXIgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGxldCBvdCA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5vYmplY3QpO1xyXG4gICAgICAgIGlmIChvdCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKCdMaW5rcyB2b20gUHVua3Qgc3RlaHQga2VpbiBPYmpla3QuJywgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCEob3QudHlwZSBpbnN0YW5jZW9mIEtsYXNzIHx8IG90LnR5cGUgaW5zdGFuY2VvZiBTdGF0aWNDbGFzcyB8fCBvdC50eXBlIGluc3RhbmNlb2YgQXJyYXlUeXBlKSkge1xyXG4gICAgICAgICAgICBpZiAob3QudHlwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcignRGVyIEF1c2RydWNrIGxpbmtzIHZvbSBQdW5rdCBoYXQga2VpbiBBdHRyaWJ1dCAnICsgbm9kZS5pZGVudGlmaWVyICsgXCIuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoJ0xpbmtzIHZvbSBQdW5rdCBzdGVodCBlaW4gQXVzZHJ1Y2sgdm9tIERhdGVudHlwICcgKyBvdC50eXBlLmlkZW50aWZpZXIgKyBcIi4gRGllc2VyIGhhdCBrZWluIEF0dHJpYnV0IFwiICsgbm9kZS5pZGVudGlmaWVyICsgXCIuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG9iamVjdFR5cGU6IEtsYXNzIHwgU3RhdGljQ2xhc3MgfCBBcnJheVR5cGUgPSBvdC50eXBlO1xyXG5cclxuICAgICAgICBpZiAob2JqZWN0VHlwZSBpbnN0YW5jZW9mIEtsYXNzKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgdmlzaWJpbGl0eVVwVG8gPSBnZXRWaXNpYmlsaXR5VXBUbyhvYmplY3RUeXBlLCB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZVdpdGhFcnJvciA9IG9iamVjdFR5cGUuZ2V0QXR0cmlidXRlKG5vZGUuaWRlbnRpZmllciwgdmlzaWJpbGl0eVVwVG8pO1xyXG5cclxuICAgICAgICAgICAgbGV0IHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvcjogeyBhdHRyaWJ1dGU6IEF0dHJpYnV0ZSwgZXJyb3I6IHN0cmluZywgZm91bmRCdXRJbnZpc2libGU6IGJvb2xlYW4sIHN0YXRpY0NsYXNzOiBTdGF0aWNDbGFzcyB9XHJcbiAgICAgICAgICAgICAgICA9IG51bGw7XHJcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvciA9IG9iamVjdFR5cGUuc3RhdGljQ2xhc3MuZ2V0QXR0cmlidXRlKG5vZGUuaWRlbnRpZmllciwgdmlzaWJpbGl0eVVwVG8pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZSA9PSBudWxsICYmIHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZVdpdGhFcnJvci5mb3VuZEJ1dEludmlzaWJsZSB8fCAhc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmZvdW5kQnV0SW52aXNpYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoYXR0cmlidXRlV2l0aEVycm9yLmVycm9yLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3Ioc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmVycm9yLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogb2JqZWN0VHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYXR0cmlidXRlOiBBdHRyaWJ1dGU7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlSW5kZXg6IGF0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUuaW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUlkZW50aWZpZXI6IGF0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlVGhpc09iamVjdDogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGUgPSBhdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5kZWNyZWFzZVN0YWNrcG9pbnRlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcENvdW50OiAxXHJcbiAgICAgICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaFN0YXRpY0F0dHJpYnV0ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGtsYXNzOiAoPEtsYXNzPm9iamVjdFR5cGUpLnN0YXRpY0NsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrbGFzczogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLnN0YXRpY0NsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJbmRleDogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZS5pbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlSWRlbnRpZmllcjogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZS5pZGVudGlmaWVyXHJcbiAgICAgICAgICAgICAgICAgICAgfV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZSA9IHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihub2RlLnBvc2l0aW9uLCBhdHRyaWJ1dGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogYXR0cmlidXRlLnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiAhYXR0cmlidXRlLmlzRmluYWxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IGVsc2UgaWYgKG9iamVjdFR5cGUgaW5zdGFuY2VvZiBTdGF0aWNDbGFzcykge1xyXG4gICAgICAgICAgICAvLyBTdGF0aWMgY2xhc3NcclxuICAgICAgICAgICAgaWYgKG9iamVjdFR5cGUuS2xhc3MgaW5zdGFuY2VvZiBFbnVtKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUxhc3RTdGF0ZW1lbnQoKTsgLy8gcmVtb3ZlIHB1c2ggc3RhdGljIGVudW0gY2xhc3MgdG8gc3RhY2tcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgZW51bUluZm8gPSBvYmplY3RUeXBlLktsYXNzLmVudW1JbmZvTGlzdC5maW5kKGVpID0+IGVpLmlkZW50aWZpZXIgPT0gbm9kZS5pZGVudGlmaWVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZW51bUluZm8gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIGVudW0tS2xhc3NlIFwiICsgb2JqZWN0VHlwZS5pZGVudGlmaWVyICsgXCIgaGF0IGtlaW5lbiBlbnVtLVdlcnQgbWl0IGRlbSBCZXplaWNobmVyIFwiICsgbm9kZS5pZGVudGlmaWVyLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEVudW1WYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBlbnVtQ2xhc3M6IG9iamVjdFR5cGUuS2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVJZGVudGlmaWVyOiBub2RlLmlkZW50aWZpZXJcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogb2JqZWN0VHlwZS5LbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IHVwVG9WaXNpYmlsaXR5ID0gZ2V0VmlzaWJpbGl0eVVwVG8ob2JqZWN0VHlwZSwgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0KTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IgPSBvYmplY3RUeXBlLmdldEF0dHJpYnV0ZShub2RlLmlkZW50aWZpZXIsIHVwVG9WaXNpYmlsaXR5KTtcclxuICAgICAgICAgICAgICAgIGlmIChzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiAoc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZS51cGRhdGVWYWx1ZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5yZW1vdmVMYXN0U3RhdGVtZW50KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hTdGF0aWNBdHRyaWJ1dGVJbnRyaW5zaWMsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIGF0dHJpYnV0ZTogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZVxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAvLyB9IGVsc2UgXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUxhc3RTdGF0ZW1lbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaFN0YXRpY0F0dHJpYnV0ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlSW5kZXg6IHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUuaW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJZGVudGlmaWVyOiBzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrbGFzczogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLnN0YXRpY0NsYXNzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZS50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6ICFzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlLmlzRmluYWxcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5lcnJvciwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogb2JqZWN0VHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUuaWRlbnRpZmllciAhPSBcImxlbmd0aFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcignRGVyIFdlcnQgdm9tIERhdGVudHlwICcgKyBvdC50eXBlLmlkZW50aWZpZXIgKyBcIiBoYXQga2VpbiBBdHRyaWJ1dCBcIiArIG5vZGUuaWRlbnRpZmllciwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEFycmF5TGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb25cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgZWxlbWVudDogQXR0cmlidXRlID0gbmV3IEF0dHJpYnV0ZShcImxlbmd0aFwiLCBpbnRQcmltaXRpdmVUeXBlLCBudWxsLCB0cnVlLCBWaXNpYmlsaXR5LnB1YmxpYywgdHJ1ZSwgXCJMw6RuZ2UgZGVzIEFycmF5c1wiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW9kdWxlLmFkZElkZW50aWZpZXJQb3NpdGlvbihub2RlLnBvc2l0aW9uLCBlbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHB1c2hUaGlzT3JTdXBlcihub2RlOiBUaGlzTm9kZSB8IFN1cGVyTm9kZSwgaXNTdXBlcjogYm9vbGVhbik6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBjbGFzc0NvbnRleHQgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcblxyXG4gICAgICAgIGlmIChpc1N1cGVyICYmIGNsYXNzQ29udGV4dCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNsYXNzQ29udGV4dCA9IGNsYXNzQ29udGV4dC5iYXNlQ2xhc3M7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbWV0aG9kQ29udGV4dCA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLm1ldGhvZDtcclxuXHJcbiAgICAgICAgaWYgKGNsYXNzQ29udGV4dCA9PSBudWxsIHx8IG1ldGhvZENvbnRleHQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRhcyBPYmpla3QgXCIgKyAoaXNTdXBlciA/IFwic3VwZXJcIiA6IFwidGhpc1wiKSArIFwiIGV4aXN0aWVydCBudXIgaW5uZXJoYWxiIGVpbmVyIE1ldGhvZGVuZGVrbGFyYXRpb24uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogMFxyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVHlwZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIGNsYXNzQ29udGV4dCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IGNsYXNzQ29udGV4dCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgaXNTdXBlcjogaXNTdXBlciB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc3VwZXJjb25zdHJ1Y3RvckNhbGwobm9kZTogU3VwZXJjb25zdHJ1Y3RvckNhbGxOb2RlIHwgQ29uc3RydWN0b3JDYWxsTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBjbGFzc0NvbnRleHQgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcblxyXG4gICAgICAgIGxldCBpc1N1cGVyQ29uc3RydWN0b3JDYWxsOiBib29sZWFuID0gbm9kZS50eXBlID09IFRva2VuVHlwZS5zdXBlckNvbnN0cnVjdG9yQ2FsbDtcclxuXHJcbiAgICAgICAgaWYgKGlzU3VwZXJDb25zdHJ1Y3RvckNhbGwpIHtcclxuICAgICAgICAgICAgaWYgKGNsYXNzQ29udGV4dD8uYmFzZUNsYXNzID09IG51bGwgfHwgY2xhc3NDb250ZXh0LmJhc2VDbGFzcy5pZGVudGlmaWVyID09IFwiT2JqZWN0XCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIEtsYXNzZSBpc3QgbnVyIEtpbmRrbGFzc2UgZGVyIEtsYXNzZSBPYmplY3QsIGRhaGVyIGlzdCBkZXIgQXVmcnVmIGRlcyBTdXBlcmtvbnN0cnVrdG9ycyBuaWNodCBtw7ZnbGljaC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtZXRob2RDb250ZXh0ID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUubWV0aG9kO1xyXG5cclxuICAgICAgICBpZiAoY2xhc3NDb250ZXh0ID09IG51bGwgfHwgbWV0aG9kQ29udGV4dCA9PSBudWxsIHx8ICFtZXRob2RDb250ZXh0LmlzQ29uc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW4gQXVmcnVmIGRlcyBLb25zdHJ1a3RvcnMgb2RlciBkZXMgU3VwZXJrb25zdHJ1Y3RvcnMgaXN0IG51ciBpbm5lcmhhbGIgZGVzIEtvbnN0cnVrdG9ycyBlaW5lciBLbGFzc2UgbcO2Z2xpY2guXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsZXQgc3VwZXJjbGFzc1R5cGU6IEtsYXNzIHwgU3RhdGljQ2xhc3M7XHJcblxyXG4gICAgICAgIGlmIChpc1N1cGVyQ29uc3RydWN0b3JDYWxsKSB7XHJcbiAgICAgICAgICAgIHN1cGVyY2xhc3NUeXBlID0gPEtsYXNzPmNsYXNzQ29udGV4dC5iYXNlQ2xhc3M7XHJcbiAgICAgICAgICAgIGlmIChzdXBlcmNsYXNzVHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIlN0YXRpc2NoZSBNZXRob2RlbiBoYWJlbiBrZWluZSBzdXBlci1NZXRob2RlbmF1ZnJ1ZmUuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzdXBlcmNsYXNzVHlwZSA9PSBudWxsKSBzdXBlcmNsYXNzVHlwZSA9IDxLbGFzcz50aGlzLm1vZHVsZVN0b3JlLmdldFR5cGUoXCJPYmplY3RcIikudHlwZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzdXBlcmNsYXNzVHlwZSA9IDxLbGFzcz5jbGFzc0NvbnRleHQ7XHJcbiAgICAgICAgICAgIGlmIChzdXBlcmNsYXNzVHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIlN0YXRpc2NoZSBNZXRob2RlbiBoYWJlbiBrZWluZSB0aGlzLU1ldGhvZGVuYXVmcnVmZS5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBudWxsLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFB1c2ggdGhpcy1vYmplY3QgdG8gc3RhY2s6XHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBzdGFja3Bvc09mVmFyaWFibGU6IDBcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGV0IHBhcmFtZXRlclR5cGVzOiBUeXBlW10gPSBbXTtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUub3BlcmFuZHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgZXJyb3JJbk9wZXJhbmRzOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHAgb2Ygbm9kZS5vcGVyYW5kcykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHB0ID0gdGhpcy5wcm9jZXNzTm9kZShwKTtcclxuICAgICAgICAgICAgICAgIGlmIChwdCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyVHlwZXMucHVzaChwdC50eXBlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JJbk9wZXJhbmRzID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZXJyb3JJbk9wZXJhbmRzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07IC8vIHRyeSB0byBjb250aW51ZS4uLlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbWV0aG9kcyA9IHN1cGVyY2xhc3NUeXBlLmdldENvbnN0cnVjdG9yKHBhcmFtZXRlclR5cGVzLCBWaXNpYmlsaXR5LnByb3RlY3RlZCk7XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlLnB1c2hNZXRob2RDYWxsUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgbm9kZS5jb21tYVBvc2l0aW9ucywgc3VwZXJjbGFzc1R5cGUuZ2V0TWV0aG9kcyhWaXNpYmlsaXR5LnByb3RlY3RlZCwgc3VwZXJjbGFzc1R5cGUuaWRlbnRpZmllciksXHJcbiAgICAgICAgICAgIG5vZGUucmlnaHRCcmFja2V0UG9zaXRpb24pO1xyXG5cclxuICAgICAgICBpZiAobWV0aG9kcy5lcnJvciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKG1ldGhvZHMuZXJyb3IsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07IC8vIHRyeSB0byBjb250aW51ZS4uLlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZCA9IG1ldGhvZHMubWV0aG9kTGlzdFswXTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihub2RlLnBvc2l0aW9uLCBtZXRob2QpO1xyXG5cclxuICAgICAgICBsZXQgc3RhY2tmcmFtZURlbHRhID0gMDtcclxuICAgICAgICBpZiAobWV0aG9kLmhhc0VsbGlwc2lzKCkpIHtcclxuICAgICAgICAgICAgbGV0IGVsbGlwc2lzUGFyYW1ldGVyQ291bnQgPSBwYXJhbWV0ZXJUeXBlcy5sZW5ndGggLSBtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSArIDE7IC8vIGxhc3QgcGFyYW1ldGVyIGFuZCBzdWJzZXF1ZW50IG9uZXNcclxuICAgICAgICAgICAgc3RhY2tmcmFtZURlbHRhID0gLSAoZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCAtIDEpO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5tYWtlRWxsaXBzaXNBcnJheSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLm9wZXJhbmRzW21ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpIC0gMV0ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJDb3VudDogZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBhcnJheVR5cGU6IG1ldGhvZC5nZXRQYXJhbWV0ZXIobWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxKS50eXBlXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhbGxNZXRob2QsXHJcbiAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICAgICAgICBpc1N1cGVyQ2FsbDogaXNTdXBlckNvbnN0cnVjdG9yQ2FsbCxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLShwYXJhbWV0ZXJUeXBlcy5sZW5ndGggKyAxICsgc3RhY2tmcmFtZURlbHRhKSAvLyB0aGlzLW9iamVjdCBmb2xsb3dlZCBieSBwYXJhbWV0ZXJzXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLy8gUGFic3QsIDIxLjEwLjIwMjA6XHJcbiAgICAgICAgLy8gc3VwZXIgbWV0aG9kIGlzIGNvbnN0cnVjdG9yID0+IHJldHVybnMgbm90aGluZyBldmVuIGlmIG1ldGhvZC5nZXRSZXR1cm5UeXBlKCkgaXMgY2xhc3Mgb2JqZWN0XHJcbiAgICAgICAgLy8gcmV0dXJuIHsgdHlwZTogbWV0aG9kLmdldFJldHVyblR5cGUoKSwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9O1xyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IG51bGwsIGlzQXNzaWduYWJsZTogZmFsc2UgfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaW5jcmVtZW50RGVjcmVtZW50QmVmb3JlT3JBZnRlcihub2RlOiBJbmNyZW1lbnREZWNyZW1lbnROb2RlKTogU3RhY2tUeXBlIHtcclxuICAgICAgICBsZXQgdHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5vcGVyYW5kKTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGUgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAoIXR5cGUuaXNBc3NpZ25hYmxlKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIE9wZXJhdG9yZW4gKysgdW5kIC0tIGvDtm5uZW4gbnVyIGF1ZiBWYXJpYWJsZW4gYW5nZXdlbmRldCB3ZXJkZW4sIG5pY2h0IGF1ZiBrb25zdGFudGUgV2VydGUgb2RlciBSw7xja2dhYmV3ZXJ0ZSB2b24gTWV0aG9kZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdHlwZS50eXBlLmNhbkNhc3RUbyhmbG9hdFByaW1pdGl2ZVR5cGUpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIE9wZXJhdG9yZW4gKysgdW5kIC0tIGvDtm5uZW4gbnVyIGF1ZiBaYWhsZW4gYW5nZXdlbmRldCB3ZXJkZW4sIG5pY2h0IGF1ZiBXZXJ0ZSBkZXMgRGF0ZW50eXBzIFwiICsgdHlwZS50eXBlLmlkZW50aWZpZXIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBub2RlLnR5cGUsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBpbmNyZW1lbnREZWNyZW1lbnRCeTogbm9kZS5vcGVyYXRvciA9PSBUb2tlblR5cGUuZG91YmxlTWludXMgPyAtIDEgOiAxXHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gdHlwZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2VsZWN0QXJyYXlFbGVtZW50KG5vZGU6IFNlbGVjdEFycmF5RWxlbWVudE5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgYXJyYXlUeXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLm9iamVjdCk7IC8vIHB1c2ggYXJyYXktb2JqZWN0IFxyXG4gICAgICAgIGxldCBpbmRleFR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuaW5kZXgpOyAvLyBwdXNoIGluZGV4XHJcblxyXG4gICAgICAgIGlmIChhcnJheVR5cGUgPT0gbnVsbCB8fCBpbmRleFR5cGUgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAoIShhcnJheVR5cGUudHlwZSBpbnN0YW5jZW9mIEFycmF5VHlwZSkpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgVHlwIGRlciBWYXJpYWJsZW4gaXN0IGtlaW4gQXJyYXksIGRhaGVyIGlzdCBbXSBuaWNodCB6dWzDpHNzaWcuIFwiLCBub2RlLm9iamVjdC5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGUuYWRkSWRlbnRpZmllclBvc2l0aW9uKHtcclxuICAgICAgICAgICAgbGluZTogbm9kZS5wb3NpdGlvbi5saW5lLFxyXG4gICAgICAgICAgICBjb2x1bW46IG5vZGUucG9zaXRpb24uY29sdW1uICsgbm9kZS5wb3NpdGlvbi5sZW5ndGgsXHJcbiAgICAgICAgICAgIGxlbmd0aDogMCAgLy8gTW9kdWxlLmdldFR5cGVBdFBvc2l0aW9uIG5lZWRzIGxlbmd0aCA9PSAwIGhlcmUgdG8ga25vdyB0aGF0IHRoaXMgdHlwZS1wb3NpdGlvbiBpcyBub3QgaW4gc3RhdGljIGNvbnRleHQgZm9yIGNvZGUgY29tcGxldGlvblxyXG4gICAgICAgIH0sIGFycmF5VHlwZS50eXBlLmFycmF5T2ZUeXBlKTtcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmVuc3VyZUF1dG9tYXRpY0Nhc3RpbmcoaW5kZXhUeXBlLnR5cGUsIGludFByaW1pdGl2ZVR5cGUpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiQWxzIEluZGV4IGVpbmVzIEFycmF5cyB3aXJkIGVpbiBnYW56emFobGlnZXIgV2VydCBlcndhcnRldC4gR2VmdW5kZW4gd3VyZGUgZWluIFdlcnQgdm9tIFR5cCBcIiArIGluZGV4VHlwZS50eXBlLmlkZW50aWZpZXIgKyBcIi5cIiwgbm9kZS5pbmRleC5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6ICg8QXJyYXlUeXBlPmFycmF5VHlwZS50eXBlKS5hcnJheU9mVHlwZSwgaXNBc3NpZ25hYmxlOiBhcnJheVR5cGUuaXNBc3NpZ25hYmxlIH07XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5zZWxlY3RBcnJheUVsZW1lbnQsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogKDxBcnJheVR5cGU+YXJyYXlUeXBlLnR5cGUpLmFycmF5T2ZUeXBlLCBpc0Fzc2lnbmFibGU6IGFycmF5VHlwZS5pc0Fzc2lnbmFibGUgfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVzaFR5cGVQb3NpdGlvbihwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCB0eXBlOiBUeXBlKSB7XHJcbiAgICAgICAgaWYgKHBvc2l0aW9uID09IG51bGwpIHJldHVybjtcclxuICAgICAgICBpZiAocG9zaXRpb24ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgIGxpbmU6IHBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgICAgICBjb2x1bW46IHBvc2l0aW9uLmNvbHVtbiArIHBvc2l0aW9uLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIGxlbmd0aDogMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMubW9kdWxlLmFkZElkZW50aWZpZXJQb3NpdGlvbihwb3NpdGlvbiwgdHlwZSk7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBwdXNoVXNhZ2VQb3NpdGlvbihwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCBlbGVtZW50OiBLbGFzcyB8IEludGVyZmFjZSB8IE1ldGhvZCB8IEF0dHJpYnV0ZSB8IFZhcmlhYmxlKSB7XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlLmFkZElkZW50aWZpZXJQb3NpdGlvbihwb3NpdGlvbiwgZWxlbWVudCk7XHJcblxyXG4gICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcG9zaXRpb25MaXN0OiBUZXh0UG9zaXRpb25bXSA9IGVsZW1lbnQudXNhZ2VQb3NpdGlvbnMuZ2V0KHRoaXMubW9kdWxlKTtcclxuICAgICAgICBpZiAocG9zaXRpb25MaXN0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgcG9zaXRpb25MaXN0ID0gW107XHJcbiAgICAgICAgICAgIGVsZW1lbnQudXNhZ2VQb3NpdGlvbnMuc2V0KHRoaXMubW9kdWxlLCBwb3NpdGlvbkxpc3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcG9zaXRpb25MaXN0LnB1c2gocG9zaXRpb24pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXNvbHZlSWRlbnRpZmllcihub2RlOiBJZGVudGlmaWVyTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGlmIChub2RlLmlkZW50aWZpZXIgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGxldCB2YXJpYWJsZSA9IHRoaXMuZmluZExvY2FsVmFyaWFibGUobm9kZS5pZGVudGlmaWVyKTtcclxuICAgICAgICBpZiAodmFyaWFibGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogdmFyaWFibGUuc3RhY2tQb3NcclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFVzYWdlUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgdmFyaWFibGUpO1xyXG4gICAgICAgICAgICBub2RlLnZhcmlhYmxlID0gdmFyaWFibGU7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiB2YXJpYWJsZS50eXBlLCBpc0Fzc2lnbmFibGU6ICF2YXJpYWJsZS5pc0ZpbmFsIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oZWFwICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IHZhcmlhYmxlID0gdGhpcy5oZWFwW25vZGUuaWRlbnRpZmllcl07XHJcbiAgICAgICAgICAgIGlmICh2YXJpYWJsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEZyb21IZWFwVG9TdGFjayxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBub2RlLmlkZW50aWZpZXJcclxuICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihub2RlLnBvc2l0aW9uLCB2YXJpYWJsZSk7XHJcbiAgICAgICAgICAgICAgICBub2RlLnZhcmlhYmxlID0gdmFyaWFibGU7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHZhcmlhYmxlLnR5cGUsIGlzQXNzaWduYWJsZTogIXZhcmlhYmxlLmlzRmluYWwgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBhdHRyaWJ1dGUgPSB0aGlzLmZpbmRBdHRyaWJ1dGUobm9kZS5pZGVudGlmaWVyLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICBpZiAoYXR0cmlidXRlICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGUuaXNTdGF0aWMpIHtcclxuICAgICAgICAgICAgICAgIGxldCBjYyA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dDtcclxuICAgICAgICAgICAgICAgIGxldCBzY2MgPSAoY2MgaW5zdGFuY2VvZiBTdGF0aWNDbGFzcykgPyBjYyA6IGNjLnN0YXRpY0NsYXNzO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoaWxlIChzY2MgIT0gbnVsbCAmJiBzY2MuYXR0cmlidXRlcy5pbmRleE9mKGF0dHJpYnV0ZSkgPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY2MgPSBzY2MuYmFzZUNsYXNzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoU3RhdGljQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIGtsYXNzOiBzY2MsXHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlSW5kZXg6IGF0dHJpYnV0ZS5pbmRleCxcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJZGVudGlmaWVyOiBhdHRyaWJ1dGUuaWRlbnRpZmllclxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEF0dHJpYnV0ZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJbmRleDogYXR0cmlidXRlLmluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUlkZW50aWZpZXI6IGF0dHJpYnV0ZS5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIHVzZVRoaXNPYmplY3Q6IHRydWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbm9kZS5hdHRyaWJ1dGUgPSBhdHRyaWJ1dGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIGF0dHJpYnV0ZSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiBhdHRyaWJ1dGUudHlwZSwgaXNBc3NpZ25hYmxlOiAhYXR0cmlidXRlLmlzRmluYWwgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBrbGFzc01vZHVsZSA9IHRoaXMubW9kdWxlU3RvcmUuZ2V0VHlwZShub2RlLmlkZW50aWZpZXIpO1xyXG4gICAgICAgIGlmIChrbGFzc01vZHVsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCBrbGFzcyA9IGtsYXNzTW9kdWxlLnR5cGU7XHJcbiAgICAgICAgICAgIGlmICghKGtsYXNzIGluc3RhbmNlb2YgS2xhc3MgfHwga2xhc3MgaW5zdGFuY2VvZiBJbnRlcmZhY2UpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBUeXAgXCIgKyBrbGFzcy5pZGVudGlmaWVyICsgXCIgaGF0IGtlaW5lIHN0YXRpc2NoZW4gQXR0cmlidXRlL01ldGhvZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoU3RhdGljQ2xhc3NPYmplY3QsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAga2xhc3M6IGtsYXNzXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIGtsYXNzKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGtsYXNzIGluc3RhbmNlb2YgS2xhc3MgPyBrbGFzcy5zdGF0aWNDbGFzcyA6IGtsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzQXNzaWduYWJsZTogZmFsc2VcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IGtsYXNzLFxyXG4gICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBCZXplaWNobmVyIFwiICsgbm9kZS5pZGVudGlmaWVyICsgXCIgaXN0IGhpZXIgbmljaHQgYmVrYW5udC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZpbmRMb2NhbFZhcmlhYmxlKGlkZW50aWZpZXI6IHN0cmluZyk6IFZhcmlhYmxlIHtcclxuICAgICAgICBsZXQgc3QgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZTtcclxuXHJcbiAgICAgICAgd2hpbGUgKHN0ICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB2YXJpYWJsZSA9IHN0LnZhcmlhYmxlTWFwLmdldChpZGVudGlmaWVyKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh2YXJpYWJsZSAhPSBudWxsICYmIHZhcmlhYmxlLnN0YWNrUG9zICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YXJpYWJsZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc3QgPSBzdC5wYXJlbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZmluZEF0dHJpYnV0ZShpZGVudGlmaWVyOiBzdHJpbmcsIHBvc2l0aW9uOiBUZXh0UG9zaXRpb24pOiBBdHRyaWJ1dGUge1xyXG4gICAgICAgIGxldCBjbGFzc0NvbnRleHQgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcbiAgICAgICAgaWYgKGNsYXNzQ29udGV4dCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGF0dHJpYnV0ZSA9IGNsYXNzQ29udGV4dC5nZXRBdHRyaWJ1dGUoaWRlbnRpZmllciwgVmlzaWJpbGl0eS5wcml2YXRlKTtcclxuICAgICAgICBpZiAoYXR0cmlidXRlLmF0dHJpYnV0ZSAhPSBudWxsKSByZXR1cm4gYXR0cmlidXRlLmF0dHJpYnV0ZTtcclxuXHJcbiAgICAgICAgaWYgKGNsYXNzQ29udGV4dCBpbnN0YW5jZW9mIEtsYXNzKSB7XHJcbiAgICAgICAgICAgIGxldCBzdGF0aWNBdHRyaWJ1dGUgPSBjbGFzc0NvbnRleHQuc3RhdGljQ2xhc3MuZ2V0QXR0cmlidXRlKGlkZW50aWZpZXIsIFZpc2liaWxpdHkucHJpdmF0ZSk7XHJcbiAgICAgICAgICAgIGlmIChzdGF0aWNBdHRyaWJ1dGUuYXR0cmlidXRlICE9IG51bGwpIHJldHVybiBzdGF0aWNBdHRyaWJ1dGUuYXR0cmlidXRlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdGhpcy5wdXNoRXJyb3IoYXR0cmlidXRlLmVycm9yLCBwb3NpdGlvbik7XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxNZXRob2Qobm9kZTogTWV0aG9kY2FsbE5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgb2JqZWN0Tm9kZTogU3RhY2tUeXBlID0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUub2JqZWN0ID09IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIC8vIGNhbGwgbWV0aG9kIG9mIHRoaXMtY2xhc3M/XHJcblxyXG4gICAgICAgICAgICBsZXQgdGhpc0NsYXNzID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0O1xyXG4gICAgICAgICAgICBpZiAodGhpc0NsYXNzICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogMFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgb2JqZWN0Tm9kZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0aGlzQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRWluIE1ldGhvZGVuYXVmcnVmIChoaWVyOiBcIiArIG5vZGUuaWRlbnRpZmllciArXHJcbiAgICAgICAgICAgICAgICAgICAgXCIpIG9obmUgUHVua3RzY2hyZWlid2Vpc2UgaXN0IG51ciBpbm5lcmhhbGIgYW5kZXJlciBNZXRob2RlbiBtw7ZnbGljaC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBvYmplY3ROb2RlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLm9iamVjdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob2JqZWN0Tm9kZSA9PSBudWxsKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKCEoXHJcbiAgICAgICAgICAgIChvYmplY3ROb2RlLnR5cGUgaW5zdGFuY2VvZiBLbGFzcykgfHwgKG9iamVjdE5vZGUudHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzKSB8fFxyXG4gICAgICAgICAgICAob2JqZWN0Tm9kZS50eXBlIGluc3RhbmNlb2YgSW50ZXJmYWNlICYmIChub2RlLm9iamVjdFtcInZhcmlhYmxlXCJdICE9IG51bGwgfHwgbm9kZS5vYmplY3RbXCJhdHRyaWJ1dGVcIl0gIT0gbnVsbCB8fCBub2RlLm9iamVjdFtcInRlcm1JbnNpZGVCcmFja2V0c1wiXSAhPSBudWxsKSkgfHwgKG9iamVjdE5vZGUudHlwZSBpbnN0YW5jZW9mIEVudW0pKSkge1xyXG5cclxuICAgICAgICAgICAgaWYgKG9iamVjdE5vZGUudHlwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIldlcnRlIGRpZXNlcyBEYXRlbnR5cHMgYmVzaXR6ZW4ga2VpbmUgTWV0aG9kZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdE5vZGUudHlwZSBpbnN0YW5jZW9mIEludGVyZmFjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKCdNZXRob2RlbmRlZmluaXRpb25lbiBlaW5lcyBJbnRlcmZhY2VzIGvDtm5uZW4gbmljaHQgc3RhdGlzY2ggYXVmZ2VydWZlbiB3ZXJkZW4uJywgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKCdXZXJ0ZSBkZXMgRGF0ZW50eXBzICcgKyBvYmplY3ROb2RlLnR5cGUuaWRlbnRpZmllciArIFwiIGJlc2l0emVuIGtlaW5lIE1ldGhvZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgb2JqZWN0VHlwZTogS2xhc3MgfCBTdGF0aWNDbGFzcyB8IEludGVyZmFjZSA9IDxhbnk+b2JqZWN0Tm9kZS50eXBlO1xyXG5cclxuICAgICAgICBsZXQgcG9zQmVmb3JlUGFyYW1ldGVyRXZhbHVhdGlvbiA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGg7XHJcblxyXG4gICAgICAgIGxldCBwYXJhbWV0ZXJUeXBlczogVHlwZVtdID0gW107XHJcbiAgICAgICAgLy8gbGV0IHBhcmFtZXRlclN0YXRlbWVudHM6IFN0YXRlbWVudFtdW10gPSBbXTtcclxuICAgICAgICBsZXQgcG9zaXRpb25zQWZ0ZXJQYXJhbWV0ZXJTdGF0ZW1lbnRzOiBudW1iZXJbXSA9IFtdXHJcblxyXG4gICAgICAgIGxldCBhbGxTdGF0ZW1lbnRzID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzO1xyXG4gICAgICAgIGlmIChub2RlLm9wZXJhbmRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgLy8gZm9yIChsZXQgcCBvZiBub2RlLm9wZXJhbmRzKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbm9kZS5vcGVyYW5kcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHAgPSBub2RlLm9wZXJhbmRzW2pdO1xyXG4gICAgICAgICAgICAgICAgLy8gbGV0IHByb2dyYW1Qb2ludGVyID0gYWxsU3RhdGVtZW50cy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZU5vZGUgPSB0aGlzLnByb2Nlc3NOb2RlKHApO1xyXG4gICAgICAgICAgICAgICAgLy8gcGFyYW1ldGVyU3RhdGVtZW50cy5wdXNoKGFsbFN0YXRlbWVudHMuc3BsaWNlKHByb2dyYW1Qb2ludGVyLCBhbGxTdGF0ZW1lbnRzLmxlbmd0aCAtIHByb2dyYW1Qb2ludGVyKSk7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbnNBZnRlclBhcmFtZXRlclN0YXRlbWVudHMucHVzaChhbGxTdGF0ZW1lbnRzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZU5vZGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlclR5cGVzLnB1c2godm9pZFByaW1pdGl2ZVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJUeXBlcy5wdXNoKHR5cGVOb2RlLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZHM6IHsgZXJyb3I6IHN0cmluZywgbWV0aG9kTGlzdDogTWV0aG9kW10gfTtcclxuICAgICAgICBpZiAob2JqZWN0VHlwZSBpbnN0YW5jZW9mIEludGVyZmFjZSkge1xyXG4gICAgICAgICAgICBtZXRob2RzID0gb2JqZWN0VHlwZS5nZXRNZXRob2RzVGhhdEZpdFdpdGhDYXN0aW5nKG5vZGUuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlclR5cGVzLCBmYWxzZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IHVwVG9WaXNpYmlsaXR5ID0gZ2V0VmlzaWJpbGl0eVVwVG8ob2JqZWN0VHlwZSwgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0KTtcclxuXHJcbiAgICAgICAgICAgIG1ldGhvZHMgPSBvYmplY3RUeXBlLmdldE1ldGhvZHNUaGF0Rml0V2l0aENhc3Rpbmcobm9kZS5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyVHlwZXMsIGZhbHNlLCB1cFRvVmlzaWJpbGl0eSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGUucHVzaE1ldGhvZENhbGxQb3NpdGlvbihub2RlLnBvc2l0aW9uLCBub2RlLmNvbW1hUG9zaXRpb25zLCBvYmplY3RUeXBlLmdldE1ldGhvZHMoVmlzaWJpbGl0eS5wcml2YXRlLCBub2RlLmlkZW50aWZpZXIpLCBub2RlLnJpZ2h0QnJhY2tldFBvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgaWYgKG1ldGhvZHMuZXJyb3IgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihtZXRob2RzLmVycm9yLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9OyAvLyB0cnkgdG8gY29udGludWUuLi5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtZXRob2QgPSBtZXRob2RzLm1ldGhvZExpc3RbMF07XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFVzYWdlUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgbWV0aG9kKTtcclxuXHJcbiAgICAgICAgLy8gWW91IENBTiBjYWxsIGEgc3RhdGljIG1ldGhvZCBvbiBhIG9iamVjdC4uLiwgc286XHJcbiAgICAgICAgaWYgKG1ldGhvZC5pc1N0YXRpYyAmJiBvYmplY3RUeXBlIGluc3RhbmNlb2YgS2xhc3MgJiYgb2JqZWN0VHlwZS5pZGVudGlmaWVyICE9IFwiUHJpbnRTdHJlYW1cIikge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVzIGlzdCBrZWluIGd1dGVyIFByb2dyYW1taWVyc3RpbCwgc3RhdGlzY2hlIE1ldGhvZGVuIGVpbmVyIEtsYXNzZSBtaXRoaWxmZSBlaW5lcyBPYmpla3RzIGF1Znp1cnVmZW4uIEJlc3NlciB3w6RyZSBoaWVyIFwiICsgb2JqZWN0VHlwZS5pZGVudGlmaWVyICsgXCIuXCIgKyBtZXRob2QuaWRlbnRpZmllciArIFwiKC4uLikuXCIsIG5vZGUucG9zaXRpb24sIFwiaW5mb1wiKTtcclxuICAgICAgICAgICAgdGhpcy5pbnNlcnRTdGF0ZW1lbnRzKHBvc0JlZm9yZVBhcmFtZXRlckV2YWx1YXRpb24sIFt7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuZGVjcmVhc2VTdGFja3BvaW50ZXIsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHBvcENvdW50OiAxXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoU3RhdGljQ2xhc3NPYmplY3QsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIGtsYXNzOiBvYmplY3RUeXBlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZGVzdFR5cGU6IFR5cGUgPSBudWxsO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyYW1ldGVyVHlwZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGkgPCBtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSkgeyAgLy8gcG9zc2libGUgZWxsaXBzaXMhXHJcbiAgICAgICAgICAgICAgICBkZXN0VHlwZSA9IG1ldGhvZC5nZXRQYXJhbWV0ZXJUeXBlKGkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxICYmIG1ldGhvZC5oYXNFbGxpcHNpcygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzdFR5cGUgPSAoPEFycmF5VHlwZT5kZXN0VHlwZSkuYXJyYXlPZlR5cGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE1hcmtlciAxXHJcbiAgICAgICAgICAgIGxldCBzcmNUeXBlID0gcGFyYW1ldGVyVHlwZXNbaV07XHJcbiAgICAgICAgICAgIC8vIGZvciAobGV0IHN0IG9mIHBhcmFtZXRlclN0YXRlbWVudHNbaV0pIHtcclxuICAgICAgICAgICAgLy8gICAgIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5wdXNoKHN0KTtcclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgICAgICBsZXQgcHJvZ3JhbVBvc2l0aW9uID0gYWxsU3RhdGVtZW50cy5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuZW5zdXJlQXV0b21hdGljQ2FzdGluZyhzcmNUeXBlLCBkZXN0VHlwZSwgbm9kZS5vcGVyYW5kc1tpXS5wb3NpdGlvbiwgbm9kZS5vcGVyYW5kc1tpXSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFdlcnQgdm9tIERhdGVudHlwIFwiICsgc3JjVHlwZS5pZGVudGlmaWVyICsgXCIga2FubiBuaWNodCBhbHMgUGFyYW1ldGVyIChEYXRlbnR5cCBcIiArIGRlc3RUeXBlLmlkZW50aWZpZXIgKyBcIikgdmVyd2VuZGV0IHdlcmRlbi5cIiwgbm9kZS5vcGVyYW5kc1tpXS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhbGxTdGF0ZW1lbnRzLmxlbmd0aCA+IHByb2dyYW1Qb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNhc3RpbmdTdGF0ZW1lbnRzID0gYWxsU3RhdGVtZW50cy5zcGxpY2UocHJvZ3JhbVBvc2l0aW9uLCBhbGxTdGF0ZW1lbnRzLmxlbmd0aCAtIHByb2dyYW1Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBhbGxTdGF0ZW1lbnRzLnNwbGljZShwb3NpdGlvbnNBZnRlclBhcmFtZXRlclN0YXRlbWVudHNbaV0sIDAsIC4uLmNhc3RpbmdTdGF0ZW1lbnRzKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLmNvcnJlY3RQb3NpdGlvbnNBZnRlckluc2VydChwb3NpdGlvbnNBZnRlclBhcmFtZXRlclN0YXRlbWVudHNbaV0sIGNhc3RpbmdTdGF0ZW1lbnRzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAvLyBpZiAoc3JjVHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUgJiYgZGVzdFR5cGUgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgIC8vICAgICBpZiAoc3JjVHlwZS5nZXRDYXN0SW5mb3JtYXRpb24oZGVzdFR5cGUpLm5lZWRzU3RhdGVtZW50KSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHBvc2l0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBuZXdUeXBlOiBkZXN0VHlwZSxcclxuICAgICAgICAgICAgLy8gICAgICAgICAgICAgc3RhY2tQb3NSZWxhdGl2ZTogLXBhcmFtZXRlclR5cGVzLmxlbmd0aCArIDEgKyBpXHJcbiAgICAgICAgICAgIC8vICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc3RhY2tmcmFtZURlbHRhID0gMDtcclxuICAgICAgICBpZiAobWV0aG9kLmhhc0VsbGlwc2lzKCkpIHtcclxuICAgICAgICAgICAgbGV0IGVsbGlwc2lzUGFyYW1ldGVyQ291bnQgPSBwYXJhbWV0ZXJUeXBlcy5sZW5ndGggLSBtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSArIDE7IC8vIGxhc3QgcGFyYW1ldGVyIGFuZCBzdWJzZXF1ZW50IG9uZXNcclxuICAgICAgICAgICAgc3RhY2tmcmFtZURlbHRhID0gLSAoZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCAtIDEpO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5tYWtlRWxsaXBzaXNBcnJheSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLm9wZXJhbmRzW21ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpIC0gMV0ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJDb3VudDogZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBhcnJheVR5cGU6IG1ldGhvZC5nZXRQYXJhbWV0ZXIobWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxKS50eXBlXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobWV0aG9kLnZpc2liaWxpdHkgIT0gVmlzaWJpbGl0eS5wdWJsaWMpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB2aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgbGV0IGNsYXNzQ29udGV4dCA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dDtcclxuICAgICAgICAgICAgaWYgKGNsYXNzQ29udGV4dCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB2aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2xhc3NDb250ZXh0ICE9IG9iamVjdFR5cGUgJiZcclxuICAgICAgICAgICAgICAgICAgICAhKGNsYXNzQ29udGV4dCBpbnN0YW5jZW9mIEtsYXNzICYmIGNsYXNzQ29udGV4dC5pbXBsZW1lbnRzLmluZGV4T2YoPEludGVyZmFjZT5vYmplY3RUeXBlKSA+IDApKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGhvZC52aXNpYmlsaXR5ID09IFZpc2liaWxpdHkucHJpdmF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaWJsZSA9IGNsYXNzQ29udGV4dC5oYXNBbmNlc3Rvck9ySXMoPEtsYXNzIHwgU3RhdGljQ2xhc3M+b2JqZWN0VHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdmlzaWJsZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgTWV0aG9kZSBcIiArIG1ldGhvZC5pZGVudGlmaWVyICsgXCIgaXN0IGFuIGRpZXNlciBTdGVsbGUgZGVzIFByb2dyYW1tcyBuaWNodCBzaWNodGJhci5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBpc1N5c3RlbU1ldGhvZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGlmIChtZXRob2QuaXNTdGF0aWMgJiYgb2JqZWN0Tm9kZS50eXBlICE9IG51bGwgJiZcclxuICAgICAgICAgICAgKG9iamVjdE5vZGUudHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzKSkge1xyXG4gICAgICAgICAgICBsZXQgY2xhc3NJZGVudGlmaWVyID0gb2JqZWN0Tm9kZS50eXBlLktsYXNzLmlkZW50aWZpZXI7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKGNsYXNzSWRlbnRpZmllcikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIklucHV0XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsSW5wdXRNZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0ocGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSArIHN0YWNrZnJhbWVEZWx0YSkgLy8gdGhpcy1vYmplY3QgZm9sbG93ZWQgYnkgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGlzU3lzdGVtTWV0aG9kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJTeXN0ZW1Ub29sc1wiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIlJvYm90XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFtcInBhdXNlXCIsIFwid2FydGVuXCJdLmluZGV4T2YobWV0aG9kLmlkZW50aWZpZXIpID49IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnNldFBhdXNlRHVyYXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucGF1c2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1N5c3RlbU1ldGhvZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFpc1N5c3RlbU1ldGhvZCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIGlzU3VwZXJDYWxsOiBvYmplY3ROb2RlLmlzU3VwZXIgPT0gbnVsbCA/IGZhbHNlIDogb2JqZWN0Tm9kZS5pc1N1cGVyLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tmcmFtZUJlZ2luOiAtKHBhcmFtZXRlclR5cGVzLmxlbmd0aCArIDEgKyBzdGFja2ZyYW1lRGVsdGEpIC8vIHRoaXMtb2JqZWN0IGZvbGxvd2VkIGJ5IHBhcmFtZXRlcnNcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIHRoaXMucHVzaFR5cGVQb3NpdGlvbihub2RlLnJpZ2h0QnJhY2tldFBvc2l0aW9uLCBtZXRob2QuZ2V0UmV0dXJuVHlwZSgpKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbWV0aG9kLmdldFJldHVyblR5cGUoKSwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdXNoQ29uc3RhbnQobm9kZTogQ29uc3RhbnROb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IHR5cGU6IFR5cGU7XHJcblxyXG4gICAgICAgIHN3aXRjaCAobm9kZS5jb25zdGFudFR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuaW50ZWdlckNvbnN0YW50OlxyXG4gICAgICAgICAgICAgICAgdHlwZSA9IGludFByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuYm9vbGVhbkNvbnN0YW50OlxyXG4gICAgICAgICAgICAgICAgdHlwZSA9IGJvb2xlYW5QcmltaXRpdmVUeXBlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmZsb2F0aW5nUG9pbnRDb25zdGFudDpcclxuICAgICAgICAgICAgICAgIHR5cGUgPSBmbG9hdFByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc3RyaW5nQ29uc3RhbnQ6XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gc3RyaW5nUHJpbWl0aXZlVHlwZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFR5cGVQb3NpdGlvbihub2RlLnBvc2l0aW9uLCB0eXBlKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jaGFyQ29uc3RhbnQ6XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gY2hhclByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZE51bGw6XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gbnVsbFR5cGVcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQ29uc3RhbnQsXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiB0eXBlLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgdmFsdWU6IG5vZGUuY29uc3RhbnRcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiB0eXBlLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NCaW5hcnlPcChub2RlOiBCaW5hcnlPcE5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgaXNBc3NpZ25tZW50ID0gQ29kZUdlbmVyYXRvci5hc3NpZ25tZW50T3BlcmF0b3JzLmluZGV4T2Yobm9kZS5vcGVyYXRvcikgPj0gMDtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUub3BlcmF0b3IgPT0gVG9rZW5UeXBlLnRlcm5hcnlPcGVyYXRvcikge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzVGVybmFyeU9wZXJhdG9yKG5vZGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGxlZnRUeXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLmZpcnN0T3BlcmFuZCwgaXNBc3NpZ25tZW50KTtcclxuXHJcbiAgICAgICAgbGV0IHByb2dyYW1Qb3NBZnRlckxlZnRPcG9lcmFuZCA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGg7XHJcblxyXG4gICAgICAgIGxldCBsYXp5RXZhbHVhdGlvbkRlc3QgPSBudWxsO1xyXG4gICAgICAgIGlmIChub2RlLm9wZXJhdG9yID09IFRva2VuVHlwZS5hbmQpIHtcclxuICAgICAgICAgICAgbGF6eUV2YWx1YXRpb25EZXN0ID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXIuaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBJZkZhbHNlQW5kTGVhdmVPblN0YWNrLCBub2RlLmZpcnN0T3BlcmFuZC5wb3NpdGlvbiwgdGhpcyk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChub2RlLm9wZXJhdG9yID09IFRva2VuVHlwZS5vcikge1xyXG4gICAgICAgICAgICBsYXp5RXZhbHVhdGlvbkRlc3QgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlci5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmVHJ1ZUFuZExlYXZlT25TdGFjaywgbm9kZS5maXJzdE9wZXJhbmQucG9zaXRpb24sIHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHJpZ2h0VHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5zZWNvbmRPcGVyYW5kKTtcclxuXHJcbiAgICAgICAgaWYgKGxlZnRUeXBlID09IG51bGwgfHwgbGVmdFR5cGUudHlwZSA9PSBudWxsIHx8IHJpZ2h0VHlwZSA9PSBudWxsIHx8IHJpZ2h0VHlwZS50eXBlID09IG51bGwpIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICBsZXQgY29udmVydGVkTGVmdFR5cGUgPSBsZWZ0VHlwZS50eXBlO1xyXG5cclxuICAgICAgICBpZiAoaXNBc3NpZ25tZW50KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKHJpZ2h0VHlwZS50eXBlLCBsZWZ0VHlwZS50eXBlLCBub2RlLnBvc2l0aW9uLCBub2RlLmZpcnN0T3BlcmFuZCwgdHJ1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFdlcnQgdm9tIERhdGVudHlwIFwiICsgcmlnaHRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIGF1ZiBkZXIgcmVjaHRlbiBTZWl0ZSBrYW5uIGRlciBWYXJpYWJsZW4gYXVmIGRlciBsaW5rZW4gU2VpdGUgKERhdGVudHlwIFwiICsgbGVmdFR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIpIG5pY2h0IHp1Z2V3aWVzZW4gd2VyZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0VHlwZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFsZWZ0VHlwZS5pc0Fzc2lnbmFibGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVtIFRlcm0vZGVyIFZhcmlhYmxlbiBhdWYgZGVyIGxpbmtlbiBTZWl0ZSBkZXMgWnV3ZWlzdW5nc29wZXJhdG9ycyAoPSkga2FubiBrZWluIFdlcnQgenVnZXdpZXNlbiB3ZXJkZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgc3RhdGVtZW50OiBBc3NpZ25tZW50U3RhdGVtZW50ID0ge1xyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBub2RlLm9wZXJhdG9yLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBsZWF2ZVZhbHVlT25TdGFjazogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhzdGF0ZW1lbnQpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBsZWZ0VHlwZTtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChub2RlLmZpcnN0T3BlcmFuZC50eXBlID09IFRva2VuVHlwZS5pZGVudGlmaWVyICYmIG5vZGUuZmlyc3RPcGVyYW5kLnZhcmlhYmxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCB2ID0gbm9kZS5maXJzdE9wZXJhbmQudmFyaWFibGU7XHJcbiAgICAgICAgICAgICAgICBpZiAodi5pbml0aWFsaXplZCAhPSBudWxsICYmICF2LmluaXRpYWxpemVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdi51c2VkQmVmb3JlSW5pdGlhbGl6YXRpb24gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIFZhcmlhYmxlIFwiICsgdi5pZGVudGlmaWVyICsgXCIgd2lyZCBoaWVyIGJlbnV0enQgYmV2b3Igc2llIGluaXRpYWxpc2llcnQgd3VyZGUuXCIsIG5vZGUucG9zaXRpb24sIFwiaW5mb1wiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHJlc3VsdFR5cGUgPSBsZWZ0VHlwZS50eXBlLmdldFJlc3VsdFR5cGUobm9kZS5vcGVyYXRvciwgcmlnaHRUeXBlLnR5cGUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHVuYm94YWJsZUxlZnQgPSBsZWZ0VHlwZS50eXBlW1widW5ib3hhYmxlQXNcIl07XHJcbiAgICAgICAgICAgIGxldCB1bmJveGFibGVSaWdodCA9IHJpZ2h0VHlwZS50eXBlW1widW5ib3hhYmxlQXNcIl07XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKHJlc3VsdFR5cGUgPT0gbnVsbCAmJiBub2RlLm9wZXJhdG9yID09IFRva2VuVHlwZS5wbHVzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocmlnaHRUeXBlLnR5cGUgPT0gc3RyaW5nUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmVuc3VyZUF1dG9tYXRpY1RvU3RyaW5nKGxlZnRUeXBlLnR5cGUsIHByb2dyYW1Qb3NBZnRlckxlZnRPcG9lcmFuZCwgbm9kZS5maXJzdE9wZXJhbmQucG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFR5cGUgPSBzdHJpbmdQcmltaXRpdmVUeXBlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb252ZXJ0ZWRMZWZ0VHlwZSA9IHN0cmluZ1ByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsZWZ0VHlwZS50eXBlID09IHN0cmluZ1ByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5lbnN1cmVBdXRvbWF0aWNUb1N0cmluZyhyaWdodFR5cGUudHlwZSwgdW5kZWZpbmVkLCBub2RlLmZpcnN0T3BlcmFuZC5wb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0VHlwZSA9IHN0cmluZ1ByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmVzdWx0VHlwZSA9PSBudWxsICYmICh1bmJveGFibGVMZWZ0ICE9IG51bGwgfHwgdW5ib3hhYmxlUmlnaHQgIT0gbnVsbCkpIHtcclxuICAgICAgICAgICAgICAgIGxldCBsZWZ0VHlwZXM6IFR5cGVbXSA9IHVuYm94YWJsZUxlZnQgPT0gbnVsbCA/IFtsZWZ0VHlwZS50eXBlXSA6IHVuYm94YWJsZUxlZnQ7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmlnaHRUeXBlczogVHlwZVtdID0gdW5ib3hhYmxlUmlnaHQgPT0gbnVsbCA/IFtyaWdodFR5cGUudHlwZV0gOiB1bmJveGFibGVSaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBsdCBvZiBsZWZ0VHlwZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBydCBvZiByaWdodFR5cGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFR5cGUgPSBsdC5nZXRSZXN1bHRUeXBlKG5vZGUub3BlcmF0b3IsIHJ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdFR5cGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnNlcnRTdGF0ZW1lbnRzKHByb2dyYW1Qb3NBZnRlckxlZnRPcG9lcmFuZCwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUuZmlyc3RPcGVyYW5kLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1R5cGU6IGx0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUuc2Vjb25kT3BlcmFuZC5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUeXBlOiBydFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb252ZXJ0ZWRMZWZ0VHlwZSA9IGx0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmlnaHRUeXBlLnR5cGUgPSBydDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHRUeXBlICE9IG51bGwpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUub3BlcmF0b3IgaW4gW1Rva2VuVHlwZS5hbmQsIFRva2VuVHlwZS5vcl0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tJZkFzc2lnbm1lbnRJbnN0ZWRPZkVxdWFsKG5vZGUuZmlyc3RPcGVyYW5kKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tJZkFzc2lnbm1lbnRJbnN0ZWRPZkVxdWFsKG5vZGUuc2Vjb25kT3BlcmFuZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChyZXN1bHRUeXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBiaXRPcGVyYXRvcnMgPSBbVG9rZW5UeXBlLmFtcGVyc2FuZCwgVG9rZW5UeXBlLk9SXTtcclxuICAgICAgICAgICAgICAgIGxldCBib29sZWFuT3BlcmF0b3JzID0gW1wiJiYgKGJvb2xlc2NoZXIgVU5ELU9wZXJhdG9yKVwiLCBcInx8IChib29sZXNjaGVyIE9ERVItT3BlcmF0b3IpXCJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGJldHRlck9wZXJhdG9ycyA9IFtcIiYgJlwiLCBcInx8XCJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IG9wSW5kZXggPSBiaXRPcGVyYXRvcnMuaW5kZXhPZihub2RlLm9wZXJhdG9yKTtcclxuICAgICAgICAgICAgICAgIGlmIChvcEluZGV4ID49IDAgJiYgbGVmdFR5cGUudHlwZSA9PSBib29sZWFuUHJpbWl0aXZlVHlwZSAmJiByaWdodFR5cGUudHlwZSA9PSBib29sZWFuUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIE9wZXJhdGlvbiBcIiArIFRva2VuVHlwZVJlYWRhYmxlW25vZGUub3BlcmF0b3JdICsgXCIgaXN0IGbDvHIgZGllIE9wZXJhbmRlbiBkZXIgVHlwZW4gXCIgKyBsZWZ0VHlwZS50eXBlLmlkZW50aWZpZXIgKyBcIiB1bmQgXCIgKyByaWdodFR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIgbmljaHQgZGVmaW5pZXJ0LiBEdSBtZWludGVzdCB3YWhyc2NoZWlubGljaCBkZW4gT3BlcmF0b3IgXCIgKyBib29sZWFuT3BlcmF0b3JzW29wSW5kZXhdICsgXCIuXCIsIG5vZGUucG9zaXRpb24sIFwiZXJyb3JcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiT3BlcmF0b3IgXCIgKyBiZXR0ZXJPcGVyYXRvcnNbb3BJbmRleF0gKyBcIiB2ZXJ3ZW5kZW4gc3RhdHQgXCIgKyBUb2tlblR5cGVSZWFkYWJsZVtub2RlLm9wZXJhdG9yXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRzUHJvdmlkZXI6ICh1cmkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZTogdXJpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiB7IHN0YXJ0TGluZU51bWJlcjogbm9kZS5wb3NpdGlvbi5saW5lLCBzdGFydENvbHVtbjogbm9kZS5wb3NpdGlvbi5jb2x1bW4sIGVuZExpbmVOdW1iZXI6IG5vZGUucG9zaXRpb24ubGluZSwgZW5kQ29sdW1uOiBub2RlLnBvc2l0aW9uLmNvbHVtbiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IFRva2VuVHlwZVJlYWRhYmxlW25vZGUub3BlcmF0b3JdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgT3BlcmF0aW9uIFwiICsgVG9rZW5UeXBlUmVhZGFibGVbbm9kZS5vcGVyYXRvcl0gKyBcIiBpc3QgZsO8ciBkaWUgT3BlcmFuZGVuIGRlciBUeXBlbiBcIiArIGxlZnRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIHVuZCBcIiArIHJpZ2h0VHlwZS50eXBlLmlkZW50aWZpZXIgKyBcIiBuaWNodCBkZWZpbmllcnQuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRUeXBlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuYmluYXJ5T3AsXHJcbiAgICAgICAgICAgICAgICBsZWZ0VHlwZTogY29udmVydGVkTGVmdFR5cGUsXHJcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbm9kZS5vcGVyYXRvcixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGxhenlFdmFsdWF0aW9uRGVzdCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlci5tYXJrSnVtcERlc3RpbmF0aW9uKDEsIGxhenlFdmFsdWF0aW9uRGVzdCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHJlc3VsdFR5cGUsIGlzQXNzaWduYWJsZTogZmFsc2UgfTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzVGVybmFyeU9wZXJhdG9yKG5vZGU6IEJpbmFyeU9wTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBsZWZ0VHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5maXJzdE9wZXJhbmQpO1xyXG5cclxuICAgICAgICBpZiAobGVmdFR5cGUgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKGxlZnRUeXBlLnR5cGUsIGJvb2xlYW5QcmltaXRpdmVUeXBlLCBudWxsLCBub2RlLmZpcnN0T3BlcmFuZCwgdHJ1ZSkpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBzZWNvbmRPcGVyYW5kID0gbm9kZS5zZWNvbmRPcGVyYW5kO1xyXG4gICAgICAgICAgICBpZiAoc2Vjb25kT3BlcmFuZCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2Vjb25kT3BlcmFuZC50eXBlICE9IFRva2VuVHlwZS5iaW5hcnlPcCB8fCBzZWNvbmRPcGVyYW5kLm9wZXJhdG9yICE9IFRva2VuVHlwZS5jb2xvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiQXVmIGRlbiBGcmFnZXplaWNoZW5vcGVyYXRvciBtw7xzc2VuIC0gbWl0IERvcHBlbHB1bmt0IGdldHJlbm50IC0gendlaSBBbHRlcm5hdGl2dGVybWUgZm9sZ2VuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGxtID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhcmlhbnRGYWxzZUxhYmVsID0gbG0uaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBJZkZhbHNlLCBub2RlLnBvc2l0aW9uLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZmlyc3RUeXBlID0gdGhpcy5wcm9jZXNzTm9kZShzZWNvbmRPcGVyYW5kLmZpcnN0T3BlcmFuZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbmRMYWJlbCA9IGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wQWx3YXlzLCBzZWNvbmRPcGVyYW5kLmZpcnN0T3BlcmFuZC5wb3NpdGlvbiwgdGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxLCB2YXJpYW50RmFsc2VMYWJlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNlY29uZFR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKHNlY29uZE9wZXJhbmQuc2Vjb25kT3BlcmFuZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxLCBlbmRMYWJlbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0eXBlID0gZmlyc3RUeXBlLnR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlY29uZFR5cGUgIT0gbnVsbCAmJiB0eXBlICE9IHNlY29uZFR5cGUudHlwZSAmJiB0eXBlLmNhbkNhc3RUbyhzZWNvbmRUeXBlLnR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgPSBzZWNvbmRUeXBlLnR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NVbmFyeU9wKG5vZGU6IFVuYXJ5T3BOb2RlKTogU3RhY2tUeXBlIHtcclxuICAgICAgICBsZXQgbGVmdFR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUub3BlcmFuZCk7XHJcblxyXG4gICAgICAgIGlmIChsZWZ0VHlwZSA9PSBudWxsIHx8IGxlZnRUeXBlLnR5cGUgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAobm9kZS5vcGVyYXRvciA9PSBUb2tlblR5cGUubWludXMpIHtcclxuICAgICAgICAgICAgaWYgKCFsZWZ0VHlwZS50eXBlLmNhbkNhc3RUbyhmbG9hdFByaW1pdGl2ZVR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBPcGVyYXRvciAtIGlzdCBmw7xyIGRlbiBUeXAgXCIgKyBsZWZ0VHlwZS50eXBlLmlkZW50aWZpZXIgKyBcIiBuaWNodCBkZWZpbmllcnQuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRUeXBlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5vZGUub3BlcmF0b3IgPT0gVG9rZW5UeXBlLm5vdCkge1xyXG4gICAgICAgICAgICBpZiAoIShsZWZ0VHlwZS50eXBlID09IGJvb2xlYW5QcmltaXRpdmVUeXBlKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZS5vcGVyYW5kKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIE9wZXJhdG9yICEgaXN0IGbDvHIgZGVuIFR5cCBcIiArIGxlZnRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIG5pY2h0IGRlZmluaWVydC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFR5cGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnVuYXJ5T3AsXHJcbiAgICAgICAgICAgIG9wZXJhdG9yOiBub2RlLm9wZXJhdG9yLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gbGVmdFR5cGU7XHJcbiAgICB9XHJcblxyXG59Il19