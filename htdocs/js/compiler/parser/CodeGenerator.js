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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29kZUdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9jbGllbnQvY29tcGlsZXIvcGFyc2VyL0NvZGVHZW5lcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFnQixTQUFTLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQVksTUFBTSw0QkFBNEIsQ0FBQztBQUNqTyxPQUFPLEVBQUUsU0FBUyxFQUF5QixhQUFhLEVBQWtCLE1BQU0sRUFBUSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVwSixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFHakQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxJQUFJLEVBQVksTUFBTSxrQkFBa0IsQ0FBQztBQVVsRCxNQUFNLE9BQU8sYUFBYTtJQUExQjtRQStoQ0ksd0JBQW1CLEdBQThCLEVBQUUsQ0FBQztJQTZ5RXhELENBQUM7SUFyekdHLHFCQUFxQixDQUFDLE1BQWMsRUFBRSxXQUF3QixFQUFFLFdBQXdCLEVBQUUsSUFBVTtRQUVoRyxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FB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QUMsQ0FBQztnQkFDbEgsT0FBTyxRQUFRLENBQUM7YUFDbkI7U0FFSjtRQUVELElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQ2hDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksb0JBQW9CLENBQUMsRUFBRTtnQkFDMUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQ0FBaUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2xILE9BQU8sUUFBUSxDQUFDO2FBQ25CO1NBRUo7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDO1lBQ2hCLElBQUksRUFBRSxTQUFTLENBQUMsT0FBTztZQUN2QixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1NBQzFCLENBQUMsQ0FBQztRQUVILE9BQU8sUUFBUSxDQUFDO0lBQ3BCLENBQUM7O0FBeDBHTSxpQ0FBbUIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsZUFBZTtJQUN2RyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLFdBQVc7SUFDL0csU0FBUyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXJyb3IsIFF1aWNrRml4LCBFcnJvckxldmVsIH0gZnJvbSBcIi4uL2xleGVyL0xleGVyLmpzXCI7XHJcbmltcG9ydCB7IFRleHRQb3NpdGlvbiwgVG9rZW5UeXBlLCBUb2tlblR5cGVSZWFkYWJsZSB9IGZyb20gXCIuLi9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheVR5cGUgfSBmcm9tIFwiLi4vdHlwZXMvQXJyYXkuanNcIjtcclxuaW1wb3J0IHsgS2xhc3MsIEludGVyZmFjZSwgU3RhdGljQ2xhc3MsIFZpc2liaWxpdHksIGdldFZpc2liaWxpdHlVcFRvLCBVbmJveGFibGVLbGFzcyB9IGZyb20gXCIuLi90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBib29sZWFuUHJpbWl0aXZlVHlwZSwgY2hhclByaW1pdGl2ZVR5cGUsIGZsb2F0UHJpbWl0aXZlVHlwZSwgaW50UHJpbWl0aXZlVHlwZSwgc3RyaW5nUHJpbWl0aXZlVHlwZSwgb2JqZWN0VHlwZSwgbnVsbFR5cGUsIHZvaWRQcmltaXRpdmVUeXBlLCB2YXJUeXBlLCBkb3VibGVQcmltaXRpdmVUeXBlLCBOdWxsVHlwZSB9IGZyb20gXCIuLi90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBBdHRyaWJ1dGUsIFR5cGUsIFZhcmlhYmxlLCBWYWx1ZSwgUHJpbWl0aXZlVHlwZSwgVXNhZ2VQb3NpdGlvbnMsIE1ldGhvZCwgSGVhcCwgZ2V0VHlwZUlkZW50aWZpZXIsIFBhcmFtZXRlcmxpc3QgfSBmcm9tIFwiLi4vdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgQVNUTm9kZSwgQXR0cmlidXRlRGVjbGFyYXRpb25Ob2RlLCBCaW5hcnlPcE5vZGUsIENsYXNzRGVjbGFyYXRpb25Ob2RlLCBDb25zdGFudE5vZGUsIERvV2hpbGVOb2RlLCBGb3JOb2RlLCBJZGVudGlmaWVyTm9kZSwgSWZOb2RlLCBJbmNyZW1lbnREZWNyZW1lbnROb2RlLCBNZXRob2RjYWxsTm9kZSwgTWV0aG9kRGVjbGFyYXRpb25Ob2RlLCBOZXdPYmplY3ROb2RlLCBSZXR1cm5Ob2RlLCBTZWxlY3RBcnJheUVsZW1lbnROb2RlLCBTZWxlY3RBcnJpYnV0ZU5vZGUsIFN1cGVyY29uc3RydWN0b3JDYWxsTm9kZSwgU3VwZXJOb2RlLCBUaGlzTm9kZSwgVW5hcnlPcE5vZGUsIFdoaWxlTm9kZSwgTG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uTm9kZSwgQXJyYXlJbml0aWFsaXphdGlvbk5vZGUsIE5ld0FycmF5Tm9kZSwgUHJpbnROb2RlLCBDYXN0TWFudWFsbHlOb2RlLCBFbnVtRGVjbGFyYXRpb25Ob2RlLCBUZXJtTm9kZSwgU3dpdGNoTm9kZSwgU2NvcGVOb2RlLCBQYXJhbWV0ZXJOb2RlLCBGb3JOb2RlT3ZlckNvbGxlY2lvbiwgQ29uc3RydWN0b3JDYWxsTm9kZSB9IGZyb20gXCIuL0FTVC5qc1wiO1xyXG5pbXBvcnQgeyBMYWJlbE1hbmFnZXIgfSBmcm9tIFwiLi9MYWJlbE1hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgTW9kdWxlLCBNb2R1bGVTdG9yZSwgTWV0aG9kQ2FsbFBvc2l0aW9uIH0gZnJvbSBcIi4vTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IEFzc2lnbm1lbnRTdGF0ZW1lbnQsIEluaXRTdGFja2ZyYW1lU3RhdGVtZW50LCBKdW1wQWx3YXlzU3RhdGVtZW50LCBQcm9ncmFtLCBTdGF0ZW1lbnQsIEJlZ2luQXJyYXlTdGF0ZW1lbnQsIE5ld09iamVjdFN0YXRlbWVudCwgSnVtcE9uU3dpdGNoU3RhdGVtZW50LCBCcmVha3BvaW50LCBFeHRlbmRlZEZvckxvb3BDaGVja0NvdW50ZXJBbmRHZXRFbGVtZW50IH0gZnJvbSBcIi4vUHJvZ3JhbS5qc1wiO1xyXG5pbXBvcnQgeyBTeW1ib2xUYWJsZSB9IGZyb20gXCIuL1N5bWJvbFRhYmxlLmpzXCI7XHJcbmltcG9ydCB7IEVudW0sIEVudW1JbmZvIH0gZnJvbSBcIi4uL3R5cGVzL0VudW0uanNcIjtcclxuaW1wb3J0IHsgSW5wdXRDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9JbnB1dC5qc1wiO1xyXG5cclxudHlwZSBTdGFja1R5cGUgPSB7XHJcbiAgICB0eXBlOiBUeXBlLFxyXG4gICAgaXNBc3NpZ25hYmxlOiBib29sZWFuLFxyXG4gICAgaXNTdXBlcj86IGJvb2xlYW4sIC8vIHVzZWQgZm9yIG1ldGhvZCBjYWxscyB3aXRoIHN1cGVyLlxyXG4gICAgd2l0aFJldHVyblN0YXRlbWVudD86IGJvb2xlYW5cclxufTtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb2RlR2VuZXJhdG9yIHtcclxuXHJcbiAgICBzdGF0aWMgYXNzaWdubWVudE9wZXJhdG9ycyA9IFtUb2tlblR5cGUuYXNzaWdubWVudCwgVG9rZW5UeXBlLnBsdXNBc3NpZ25tZW50LCBUb2tlblR5cGUubWludXNBc3NpZ25tZW50LFxyXG4gICAgVG9rZW5UeXBlLm11bHRpcGxpY2F0aW9uQXNzaWdubWVudCwgVG9rZW5UeXBlLmRpdmlzaW9uQXNzaWdubWVudCwgVG9rZW5UeXBlLkFOREFzc2lnbWVudCwgVG9rZW5UeXBlLk9SQXNzaWdtZW50LFxyXG4gICAgVG9rZW5UeXBlLlhPUkFzc2lnbWVudCwgVG9rZW5UeXBlLnNoaWZ0TGVmdEFzc2lnbWVudCwgVG9rZW5UeXBlLnNoaWZ0UmlnaHRBc3NpZ21lbnQsIFRva2VuVHlwZS5zaGlmdFJpZ2h0VW5zaWduZWRBc3NpZ21lbnRdO1xyXG5cclxuICAgIG1vZHVsZVN0b3JlOiBNb2R1bGVTdG9yZTtcclxuICAgIG1vZHVsZTogTW9kdWxlO1xyXG5cclxuICAgIHN5bWJvbFRhYmxlU3RhY2s6IFN5bWJvbFRhYmxlW107XHJcbiAgICBjdXJyZW50U3ltYm9sVGFibGU6IFN5bWJvbFRhYmxlO1xyXG5cclxuICAgIGhlYXA6IEhlYXA7XHJcblxyXG4gICAgY3VycmVudFByb2dyYW06IFByb2dyYW07XHJcblxyXG4gICAgZXJyb3JMaXN0OiBFcnJvcltdO1xyXG5cclxuICAgIG5leHRGcmVlUmVsYXRpdmVTdGFja1BvczogbnVtYmVyO1xyXG5cclxuICAgIGJyZWFrTm9kZVN0YWNrOiBKdW1wQWx3YXlzU3RhdGVtZW50W11bXTtcclxuICAgIGNvbnRpbnVlTm9kZVN0YWNrOiBKdW1wQWx3YXlzU3RhdGVtZW50W11bXTtcclxuXHJcbiAgICBzdGFydEFkaG9jQ29tcGlsYXRpb24obW9kdWxlOiBNb2R1bGUsIG1vZHVsZVN0b3JlOiBNb2R1bGVTdG9yZSwgc3ltYm9sVGFibGU6IFN5bWJvbFRhYmxlLCBoZWFwOiBIZWFwKTogRXJyb3JbXSB7XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlU3RvcmUgPSBtb2R1bGVTdG9yZTtcclxuICAgICAgICB0aGlzLm1vZHVsZSA9IG1vZHVsZTtcclxuXHJcbiAgICAgICAgdGhpcy5zeW1ib2xUYWJsZVN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5zeW1ib2xUYWJsZVN0YWNrLnB1c2goc3ltYm9sVGFibGUpO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlID0gc3ltYm9sVGFibGU7XHJcblxyXG4gICAgICAgIHRoaXMuaGVhcCA9IGhlYXA7XHJcblxyXG4gICAgICAgIGxldCBvbGRTdGFja2ZyYW1lU2l6ZSA9IHN5bWJvbFRhYmxlLnN0YWNrZnJhbWVTaXplO1xyXG4gICAgICAgIHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zID0gb2xkU3RhY2tmcmFtZVNpemU7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBudWxsO1xyXG4gICAgICAgIHRoaXMuZXJyb3JMaXN0ID0gW107XHJcblxyXG4gICAgICAgIHRoaXMuYnJlYWtOb2RlU3RhY2sgPSBbXTtcclxuICAgICAgICB0aGlzLmNvbnRpbnVlTm9kZVN0YWNrID0gW107XHJcblxyXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVNYWluKHRydWUpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5lcnJvckxpc3Q7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHN0YXJ0KG1vZHVsZTogTW9kdWxlLCBtb2R1bGVTdG9yZTogTW9kdWxlU3RvcmUpIHtcclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGVTdG9yZSA9IG1vZHVsZVN0b3JlO1xyXG4gICAgICAgIHRoaXMubW9kdWxlID0gbW9kdWxlO1xyXG5cclxuICAgICAgICB0aGlzLnN5bWJvbFRhYmxlU3RhY2sgPSBbXTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZSA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBudWxsO1xyXG4gICAgICAgIHRoaXMuZXJyb3JMaXN0ID0gW107XHJcblxyXG4gICAgICAgIHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zID0gMDtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubW9kdWxlLnRva2VuTGlzdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGxldCBsYXN0VG9rZW4gPSB0aGlzLm1vZHVsZS50b2tlbkxpc3RbdGhpcy5tb2R1bGUudG9rZW5MaXN0Lmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICB0aGlzLm1vZHVsZS5tYWluU3ltYm9sVGFibGUucG9zaXRpb25UbyA9IHsgbGluZTogbGFzdFRva2VuLnBvc2l0aW9uLmxpbmUsIGNvbHVtbjogbGFzdFRva2VuLnBvc2l0aW9uLmNvbHVtbiArIDEsIGxlbmd0aDogMSB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zeW1ib2xUYWJsZVN0YWNrLnB1c2godGhpcy5tb2R1bGUubWFpblN5bWJvbFRhYmxlKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZSA9IHRoaXMubW9kdWxlLm1haW5TeW1ib2xUYWJsZTtcclxuXHJcbiAgICAgICAgdGhpcy5icmVha05vZGVTdGFjayA9IFtdO1xyXG4gICAgICAgIHRoaXMuY29udGludWVOb2RlU3RhY2sgPSBbXTtcclxuXHJcbiAgICAgICAgdGhpcy5nZW5lcmF0ZU1haW4oKTtcclxuXHJcbiAgICAgICAgdGhpcy5nZW5lcmF0ZUNsYXNzZXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5sb29rRm9yU3RhdGljVm9pZE1haW4oKTtcclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGUuZXJyb3JzWzNdID0gdGhpcy5lcnJvckxpc3Q7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGxvb2tGb3JTdGF0aWNWb2lkTWFpbigpIHtcclxuXHJcbiAgICAgICAgbGV0IG1haW5Qcm9ncmFtID0gdGhpcy5tb2R1bGUubWFpblByb2dyYW07XHJcblxyXG4gICAgICAgIGlmIChtYWluUHJvZ3JhbSAhPSBudWxsICYmIG1haW5Qcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID4gMikgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgbWFpbk1ldGhvZDogTWV0aG9kID0gbnVsbDtcclxuICAgICAgICBsZXQgc3RhdGljQ2xhc3M6IFN0YXRpY0NsYXNzID0gbnVsbDtcclxuICAgICAgICBsZXQgY2xhc3NOb2RlMTogQVNUTm9kZTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY2xhc3NOb2RlIG9mIHRoaXMubW9kdWxlLmNsYXNzRGVmaW5pdGlvbnNBU1QpIHtcclxuICAgICAgICAgICAgaWYgKGNsYXNzTm9kZS50eXBlID09IFRva2VuVHlwZS5rZXl3b3JkQ2xhc3MpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY3QgPSBjbGFzc05vZGUucmVzb2x2ZWRUeXBlO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IG0gb2YgY3Quc3RhdGljQ2xhc3MubWV0aG9kcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtLmlkZW50aWZpZXIgPT0gXCJtYWluXCIgJiYgbS5wYXJhbWV0ZXJsaXN0LnBhcmFtZXRlcnMubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHB0ID0gbS5wYXJhbWV0ZXJsaXN0LnBhcmFtZXRlcnNbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwdC50eXBlIGluc3RhbmNlb2YgQXJyYXlUeXBlICYmIHB0LnR5cGUuYXJyYXlPZlR5cGUgPT0gc3RyaW5nUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1haW5NZXRob2QgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRXMgZXhpc3RpZXJlbiBtZWhyZXJlIEtsYXNzZW4gbWl0IHN0YXRpc2NoZW4gbWFpbi1NZXRob2Rlbi5cIiwgY2xhc3NOb2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFpbk1ldGhvZCA9IG07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGljQ2xhc3MgPSBjdC5zdGF0aWNDbGFzcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05vZGUxID0gY2xhc3NOb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobWFpbk1ldGhvZCAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgcG9zaXRpb246IFRleHRQb3NpdGlvbiA9IG1haW5NZXRob2QudXNhZ2VQb3NpdGlvbnNbMF07XHJcbiAgICAgICAgICAgIGlmIChtYWluTWV0aG9kLnByb2dyYW0gIT0gbnVsbCAmJiBtYWluTWV0aG9kLnByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbiA9IG1haW5NZXRob2QucHJvZ3JhbS5zdGF0ZW1lbnRzWzBdLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmluaXRDdXJyZW50UHJvZ3JhbSgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb2R1bGUubWFpblByb2dyYW0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyhbe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhbGxNYWluTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogbWFpbk1ldGhvZCxcclxuICAgICAgICAgICAgICAgIHN0YXRpY0NsYXNzOiBzdGF0aWNDbGFzc1xyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2xvc2VTdGFja2ZyYW1lLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG1haW5NZXRob2QudXNhZ2VQb3NpdGlvbnMuZ2V0KHRoaXMubW9kdWxlKVswXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF0sIGZhbHNlKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZW5lcmF0ZUNsYXNzZXMoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubW9kdWxlLmNsYXNzRGVmaW5pdGlvbnNBU1QgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBjbGFzc05vZGUgb2YgdGhpcy5tb2R1bGUuY2xhc3NEZWZpbml0aW9uc0FTVCkge1xyXG4gICAgICAgICAgICBpZiAoY2xhc3NOb2RlLnR5cGUgPT0gVG9rZW5UeXBlLmtleXdvcmRDbGFzcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZUNsYXNzKGNsYXNzTm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGNsYXNzTm9kZS50eXBlID09IFRva2VuVHlwZS5rZXl3b3JkRW51bSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZUVudW0oY2xhc3NOb2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoY2xhc3NOb2RlLnR5cGUgPT0gVG9rZW5UeXBlLmtleXdvcmRJbnRlcmZhY2UpIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbnRlcmYgPSBjbGFzc05vZGUucmVzb2x2ZWRUeXBlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGludGVyZiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVja0RvdWJsZU1ldGhvZERlY2xhcmF0aW9uKGludGVyZik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZW5lcmF0ZUVudW0oZW51bU5vZGU6IEVudW1EZWNsYXJhdGlvbk5vZGUpIHtcclxuXHJcbiAgICAgICAgaWYgKGVudW1Ob2RlLnJlc29sdmVkVHlwZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIHRoaXMucHVzaE5ld1N5bWJvbFRhYmxlKGZhbHNlLCBlbnVtTm9kZS5zY29wZUZyb20sIGVudW1Ob2RlLnNjb3BlVG8pO1xyXG5cclxuICAgICAgICBsZXQgZW51bUNsYXNzID0gPEVudW0+ZW51bU5vZGUucmVzb2x2ZWRUeXBlO1xyXG5cclxuICAgICAgICAvLyB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKGVudW1Ob2RlLnBvc2l0aW9uLCBlbnVtQ2xhc3MpO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQgPSBlbnVtQ2xhc3M7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IGVudW1DbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW07XHJcblxyXG4gICAgICAgIGZvciAobGV0IGF0dHJpYnV0ZSBvZiBlbnVtTm9kZS5hdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGUgIT0gbnVsbCAmJiAhYXR0cmlidXRlLmlzU3RhdGljICYmIGF0dHJpYnV0ZS5pbml0aWFsaXphdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGVudW1DbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnJldHVybixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmxhc3RTdGF0ZW1lbnQucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBjb3B5UmV0dXJuVmFsdWVUb1N0YWNrZnJhbWVQb3MwOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBsZWF2ZVRoaXNPYmplY3RPblN0YWNrOiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlc29sdmVOb2RlcygpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtZXRob2ROb2RlIG9mIGVudW1Ob2RlLm1ldGhvZHMpIHtcclxuICAgICAgICAgICAgaWYgKG1ldGhvZE5vZGUgIT0gbnVsbCAmJiAhbWV0aG9kTm9kZS5pc0Fic3RyYWN0ICYmICFtZXRob2ROb2RlLmlzU3RhdGljKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbXBpbGVNZXRob2QobWV0aG9kTm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUobnVsbCk7XHJcblxyXG4gICAgICAgIC8vIGNvbnN0cnVjdG9yIGNhbGxzXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIGVudW1Ob2RlLnNjb3BlRnJvbSwgZW51bU5vZGUuc2NvcGVUbyk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGVudW1WYWx1ZU5vZGUgb2YgZW51bU5vZGUudmFsdWVzKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoZW51bVZhbHVlTm9kZS5jb25zdHJ1Y3RvclBhcmFtZXRlcnMgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwOiBQcm9ncmFtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZHVsZTogdGhpcy5tb2R1bGUsXHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWxNYW5hZ2VyOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtdXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHA7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hFbnVtVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGVudW1WYWx1ZU5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgZW51bUNsYXNzOiBlbnVtQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVJZGVudGlmaWVyOiBlbnVtVmFsdWVOb2RlLmlkZW50aWZpZXJcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0VudW1Db25zdHJ1Y3RvckNhbGwoZW51bUNsYXNzLCBlbnVtVmFsdWVOb2RlLmNvbnN0cnVjdG9yUGFyYW1ldGVycyxcclxuICAgICAgICAgICAgICAgICAgICBlbnVtVmFsdWVOb2RlLnBvc2l0aW9uLCBlbnVtVmFsdWVOb2RlLmNvbW1hUG9zaXRpb25zLCBlbnVtVmFsdWVOb2RlLnJpZ2h0QnJhY2tldFBvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHJvZ3JhbUVuZCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogZW51bVZhbHVlTm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBlbnVtSW5mbzogRW51bUluZm8gPSBlbnVtQ2xhc3MuaWRlbnRpZmllclRvSW5mb01hcFtlbnVtVmFsdWVOb2RlLmlkZW50aWZpZXJdO1xyXG4gICAgICAgICAgICAgICAgZW51bUluZm8uY29uc3RydWN0b3JDYWxsUHJvZ3JhbSA9IHA7XHJcbiAgICAgICAgICAgICAgICBlbnVtSW5mby5wb3NpdGlvbiA9IGVudW1WYWx1ZU5vZGUucG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZShudWxsKTtcclxuXHJcblxyXG4gICAgICAgIC8vIHN0YXRpYyBhdHRyaWJ1dGVzL21ldGhvZHNcclxuICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZShmYWxzZSwgZW51bU5vZGUuc2NvcGVGcm9tLCBlbnVtTm9kZS5zY29wZVRvKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0ID0gZW51bUNsYXNzLnN0YXRpY0NsYXNzO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBlbnVtQ2xhc3Muc3RhdGljQ2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgb2YgZW51bU5vZGUuYXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlICE9IG51bGwgJiYgYXR0cmlidXRlLmlzU3RhdGljICYmIGF0dHJpYnV0ZS5pbml0aWFsaXphdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXIucmVzb2x2ZU5vZGVzKCk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IG1ldGhvZE5vZGUgb2YgZW51bU5vZGUubWV0aG9kcykge1xyXG4gICAgICAgICAgICBpZiAobWV0aG9kTm9kZSAhPSBudWxsICYmIG1ldGhvZE5vZGUuaXNTdGF0aWMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29tcGlsZU1ldGhvZChtZXRob2ROb2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNoZWNrRG91YmxlTWV0aG9kRGVjbGFyYXRpb24oZW51bUNsYXNzKTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZShudWxsKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc0VudW1Db25zdHJ1Y3RvckNhbGwoZW51bUNsYXNzOiBFbnVtLCBwYXJhbWV0ZXJOb2RlczogVGVybU5vZGVbXSxcclxuICAgICAgICBwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCBjb21tYVBvc2l0aW9uczogVGV4dFBvc2l0aW9uW10sIHJpZ2h0QnJhY2tldFBvc2l0aW9uOiBUZXh0UG9zaXRpb24pIHtcclxuICAgICAgICBsZXQgcGFyYW1ldGVyVHlwZXM6IFR5cGVbXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBwIG9mIHBhcmFtZXRlck5vZGVzKSB7XHJcbiAgICAgICAgICAgIGxldCB0eXBlTm9kZSA9IHRoaXMucHJvY2Vzc05vZGUocCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlTm9kZSA9PSBudWxsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgcGFyYW1ldGVyVHlwZXMucHVzaCh0eXBlTm9kZS50eXBlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtZXRob2RzID0gZW51bUNsYXNzLmdldE1ldGhvZHNUaGF0Rml0V2l0aENhc3RpbmcoZW51bUNsYXNzLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgIHBhcmFtZXRlclR5cGVzLCB0cnVlLCBWaXNpYmlsaXR5LnByaXZhdGUpO1xyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZS5wdXNoTWV0aG9kQ2FsbFBvc2l0aW9uKHBvc2l0aW9uLCBjb21tYVBvc2l0aW9ucywgZW51bUNsYXNzLmdldE1ldGhvZHMoVmlzaWJpbGl0eS5wcml2YXRlLCBlbnVtQ2xhc3MuaWRlbnRpZmllciksIHJpZ2h0QnJhY2tldFBvc2l0aW9uKTtcclxuXHJcblxyXG4gICAgICAgIGlmIChtZXRob2RzLmVycm9yICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IobWV0aG9kcy5lcnJvciwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07IC8vIHRyeSB0byBjb250aW51ZS4uLlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZCA9IG1ldGhvZHMubWV0aG9kTGlzdFswXTtcclxuXHJcbiAgICAgICAgbGV0IGRlc3RUeXBlOiBUeXBlID0gbnVsbDtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcmFtZXRlclR5cGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChpIDwgbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkpIHsgIC8vIHBvc3NpYmxlIGVsbGlwc2lzIVxyXG4gICAgICAgICAgICAgICAgZGVzdFR5cGUgPSBtZXRob2QuZ2V0UGFyYW1ldGVyVHlwZShpKTtcclxuICAgICAgICAgICAgICAgIGlmIChpID09IG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpIC0gMSAmJiBtZXRob2QuaGFzRWxsaXBzaXMoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc3RUeXBlID0gKDxBcnJheVR5cGU+ZGVzdFR5cGUpLmFycmF5T2ZUeXBlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgc3JjVHlwZSA9IHBhcmFtZXRlclR5cGVzW2ldO1xyXG4gICAgICAgICAgICBpZiAoIXNyY1R5cGUuZXF1YWxzKGRlc3RUeXBlKSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzcmNUeXBlIGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSAmJiBkZXN0VHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3JjVHlwZS5nZXRDYXN0SW5mb3JtYXRpb24oZGVzdFR5cGUpLm5lZWRzU3RhdGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhc3RWYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3VHlwZTogZGVzdFR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1Bvc1JlbGF0aXZlOiAtcGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSArIGlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHN0YWNrZnJhbWVEZWx0YSA9IDA7XHJcbiAgICAgICAgaWYgKG1ldGhvZC5oYXNFbGxpcHNpcygpKSB7XHJcbiAgICAgICAgICAgIGxldCBlbGxpcHNpc1BhcmFtZXRlckNvdW50ID0gcGFyYW1ldGVyVHlwZXMubGVuZ3RoIC0gbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgKyAxOyAvLyBsYXN0IHBhcmFtZXRlciBhbmQgc3Vic2VxdWVudCBvbmVzXHJcbiAgICAgICAgICAgIHN0YWNrZnJhbWVEZWx0YSA9IC0gKGVsbGlwc2lzUGFyYW1ldGVyQ291bnQgLSAxKTtcclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubWFrZUVsbGlwc2lzQXJyYXksXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogcGFyYW1ldGVyTm9kZXNbbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxXS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlckNvdW50OiBlbGxpcHNpc1BhcmFtZXRlckNvdW50LFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGFycmF5VHlwZTogbWV0aG9kLmdldFBhcmFtZXRlcihtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSAtIDEpLnR5cGVcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBpc1N1cGVyQ2FsbDogZmFsc2UsXHJcbiAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLShwYXJhbWV0ZXJUeXBlcy5sZW5ndGggKyAxICsgc3RhY2tmcmFtZURlbHRhKSAvLyB0aGlzLW9iamVjdCBmb2xsb3dlZCBieSBwYXJhbWV0ZXJzXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2VuZXJhdGVDbGFzcyhjbGFzc05vZGU6IENsYXNzRGVjbGFyYXRpb25Ob2RlKSB7XHJcblxyXG4gICAgICAgIGlmIChjbGFzc05vZGUucmVzb2x2ZWRUeXBlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIGNsYXNzTm9kZS5zY29wZUZyb20sIGNsYXNzTm9kZS5zY29wZVRvKTtcclxuXHJcbiAgICAgICAgbGV0IGtsYXNzID0gPEtsYXNzPmNsYXNzTm9kZS5yZXNvbHZlZFR5cGU7XHJcblxyXG4gICAgICAgIC8vdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihjbGFzc05vZGUucG9zaXRpb24sIGtsYXNzKTtcclxuXHJcbiAgICAgICAgbGV0IGluaGVyaXRhbmNlRXJyb3IgPSBrbGFzcy5jaGVja0luaGVyaXRhbmNlKCk7XHJcblxyXG4gICAgICAgIGlmIChpbmhlcml0YW5jZUVycm9yLm1lc3NhZ2UgIT0gXCJcIikge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihpbmhlcml0YW5jZUVycm9yLm1lc3NhZ2UsIGNsYXNzTm9kZS5wb3NpdGlvbiwgXCJlcnJvclwiLCB0aGlzLmdldEluaGVyaXRhbmNlUXVpY2tGaXgoY2xhc3NOb2RlLnNjb3BlVG8sIGluaGVyaXRhbmNlRXJyb3IpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBiYXNlQ2xhc3MgPSBrbGFzcy5iYXNlQ2xhc3M7XHJcbiAgICAgICAgaWYgKGJhc2VDbGFzcyAhPSBudWxsICYmIGJhc2VDbGFzcy5tb2R1bGUgIT0ga2xhc3MubW9kdWxlICYmIGJhc2VDbGFzcy52aXNpYmlsaXR5ID09IFZpc2liaWxpdHkucHJpdmF0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBCYXNpc2tsYXNzZSBcIiArIGJhc2VDbGFzcy5pZGVudGlmaWVyICsgXCIgZGVyIEtsYXNzZSBcIiArIGtsYXNzLmlkZW50aWZpZXIgKyBcIiBpc3QgaGllciBuaWNodCBzaWNodGJhci5cIiwgY2xhc3NOb2RlLnBvc2l0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dCA9IGtsYXNzO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBrbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW07XHJcblxyXG4gICAgICAgIGZvciAobGV0IGF0dHJpYnV0ZSBvZiBjbGFzc05vZGUuYXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlICE9IG51bGwgJiYgIWF0dHJpYnV0ZS5pc1N0YXRpYyAmJiBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplQXR0cmlidXRlKGF0dHJpYnV0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChrbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnJldHVybixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmxhc3RTdGF0ZW1lbnQucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBjb3B5UmV0dXJuVmFsdWVUb1N0YWNrZnJhbWVQb3MwOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBsZWF2ZVRoaXNPYmplY3RPblN0YWNrOiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlc29sdmVOb2RlcygpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtZXRob2ROb2RlIG9mIGNsYXNzTm9kZS5tZXRob2RzKSB7XHJcbiAgICAgICAgICAgIGlmIChtZXRob2ROb2RlICE9IG51bGwgJiYgIW1ldGhvZE5vZGUuaXNBYnN0cmFjdCAmJiAhbWV0aG9kTm9kZS5pc1N0YXRpYykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21waWxlTWV0aG9kKG1ldGhvZE5vZGUpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG06IE1ldGhvZCA9IG1ldGhvZE5vZGUucmVzb2x2ZWRUeXBlO1xyXG4gICAgICAgICAgICAgICAgaWYgKG0gIT0gbnVsbCAmJiBtLmFubm90YXRpb24gPT0gXCJAT3ZlcnJpZGVcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChrbGFzcy5iYXNlQ2xhc3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2xhc3MuYmFzZUNsYXNzLmdldE1ldGhvZEJ5U2lnbmF0dXJlKG0uc2lnbmF0dXJlKSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBNZXRob2RlIFwiICsgbS5zaWduYXR1cmUgKyBcIiBpc3QgbWl0IEBPdmVycmlkZSBhbm5vdGllcnQsIMO8YmVyc2NocmVpYnQgYWJlciBrZWluZSBNZXRob2RlIGdsZWljaGVyIFNpZ25hdHVyIGVpbmVyIE9iZXJrbGFzc2UuXCIsIG1ldGhvZE5vZGUucG9zaXRpb24sIFwid2FybmluZ1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2hlY2tEb3VibGVNZXRob2REZWNsYXJhdGlvbihrbGFzcyk7XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUobnVsbCk7XHJcblxyXG4gICAgICAgIC8vIHN0YXRpYyBhdHRyaWJ1dGVzL21ldGhvZHNcclxuICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZShmYWxzZSwgY2xhc3NOb2RlLnNjb3BlRnJvbSwgY2xhc3NOb2RlLnNjb3BlVG8pO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQgPSBrbGFzcy5zdGF0aWNDbGFzcztcclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0ga2xhc3Muc3RhdGljQ2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgb2YgY2xhc3NOb2RlLmF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZSAhPSBudWxsICYmIGF0dHJpYnV0ZS5pc1N0YXRpYyAmJiBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplQXR0cmlidXRlKGF0dHJpYnV0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChrbGFzcy5zdGF0aWNDbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnJldHVybixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmxhc3RTdGF0ZW1lbnQucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBjb3B5UmV0dXJuVmFsdWVUb1N0YWNrZnJhbWVQb3MwOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBsZWF2ZVRoaXNPYmplY3RPblN0YWNrOiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlc29sdmVOb2RlcygpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtZXRob2ROb2RlIG9mIGNsYXNzTm9kZS5tZXRob2RzKSB7XHJcbiAgICAgICAgICAgIGlmIChtZXRob2ROb2RlICE9IG51bGwgJiYgbWV0aG9kTm9kZS5pc1N0YXRpYykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21waWxlTWV0aG9kKG1ldGhvZE5vZGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnBvcFN5bWJvbFRhYmxlKG51bGwpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjaGVja0RvdWJsZU1ldGhvZERlY2xhcmF0aW9uKGNpZTogS2xhc3MgfCBJbnRlcmZhY2UpIHsgIC8vIE4uQi46IEVudW0gZXh0ZW5kcyBLbGFzc1xyXG5cclxuICAgICAgICBsZXQgc2lnbmF0dXJlTWFwOiB7IFtrZXk6IHN0cmluZ106IE1ldGhvZCB9ID0ge307XHJcblxyXG4gICAgICAgIGZvciAobGV0IG0gb2YgY2llLm1ldGhvZHMpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBzaWduYXR1cmUgPSBtLmdldFNpZ25hdHVyZVdpdGhSZXR1cm5QYXJhbWV0ZXIoKTtcclxuICAgICAgICAgICAgaWYgKHNpZ25hdHVyZU1hcFtzaWduYXR1cmVdICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY2llVHlwZTogU3RyaW5nID0gXCJJbiBkZXIgS2xhc3NlIFwiO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNpZSBpbnN0YW5jZW9mIEludGVyZmFjZSkgY2llVHlwZSA9IFwiSW0gSW50ZXJmYWNlIFwiO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNpZSBpbnN0YW5jZW9mIEVudW0pIGNpZVR5cGUgPSBcIkltIEVudW0gXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoY2llVHlwZSArIGNpZS5pZGVudGlmaWVyICsgXCIgZ2lidCBlcyB6d2VpIE1ldGhvZGVuIG1pdCBkZXJzZWxiZW4gU2lnbmF0dXI6IFwiICsgc2lnbmF0dXJlLCBtLnVzYWdlUG9zaXRpb25zLmdldCh0aGlzLm1vZHVsZSlbMF0sIFwiZXJyb3JcIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihjaWVUeXBlICsgY2llLmlkZW50aWZpZXIgKyBcIiBnaWJ0IGVzIHp3ZWkgTWV0aG9kZW4gbWl0IGRlcnNlbGJlbiBTaWduYXR1cjogXCIgKyBzaWduYXR1cmUsIHNpZ25hdHVyZU1hcFtzaWduYXR1cmVdLnVzYWdlUG9zaXRpb25zLmdldCh0aGlzLm1vZHVsZSlbMF0sIFwiZXJyb3JcIik7XHJcblxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2lnbmF0dXJlTWFwW3NpZ25hdHVyZV0gPSBtO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0SW5oZXJpdGFuY2VRdWlja0ZpeChwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCBpbmhlcml0YW5jZUVycm9yOiB7IG1lc3NhZ2U6IHN0cmluZzsgbWlzc2luZ01ldGhvZHM6IE1ldGhvZFtdOyB9KTogUXVpY2tGaXgge1xyXG5cclxuICAgICAgICBsZXQgczogc3RyaW5nID0gXCJcIjtcclxuICAgICAgICBmb3IgKGxldCBtIG9mIGluaGVyaXRhbmNlRXJyb3IubWlzc2luZ01ldGhvZHMpIHtcclxuICAgICAgICAgICAgcyArPSBcIlxcdHB1YmxpYyBcIiArIChtLnJldHVyblR5cGUgPT0gbnVsbCA/IFwiIHZvaWRcIiA6IGdldFR5cGVJZGVudGlmaWVyKG0ucmV0dXJuVHlwZSkpICsgXCIgXCIgKyBtLmlkZW50aWZpZXIgKyBcIihcIjtcclxuICAgICAgICAgICAgcyArPSBtLnBhcmFtZXRlcmxpc3QucGFyYW1ldGVycy5tYXAocCA9PiBnZXRUeXBlSWRlbnRpZmllcihwLnR5cGUpICsgXCIgXCIgKyBwLmlkZW50aWZpZXIpLmpvaW4oXCIsIFwiKTtcclxuICAgICAgICAgICAgcyArPSBcIikge1xcblxcdFxcdC8vVE9ETzogTWV0aG9kZSBmw7xsbGVuXFxuXFx0fVxcblxcblwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiRmVobGVuZGUgTWV0aG9kZW4gZWluZsO8Z2VuXCIsXHJcbiAgICAgICAgICAgIGVkaXRzUHJvdmlkZXI6ICh1cmkpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZTogdXJpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogeyBzdGFydExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmUsIHN0YXJ0Q29sdW1uOiBwb3NpdGlvbi5jb2x1bW4gLSAxLCBlbmRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lLCBlbmRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiAtIDEgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldFN1cGVyY29uc3RydWN0b3JDYWxscyhub2RlczogQVNUTm9kZVtdLCBzdXBlcmNvbnN0cnVjdG9yQ2FsbHNGb3VuZDogQVNUTm9kZVtdLCBpc0ZpcnN0U3RhdGVtZW50OiBib29sZWFuKTogYm9vbGVhbiB7XHJcbiAgICAgICAgZm9yIChsZXQgbm9kZSBvZiBub2Rlcykge1xyXG4gICAgICAgICAgICBpZiAobm9kZSA9PSBudWxsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBUb2tlblR5cGUuc3VwZXJDb25zdHJ1Y3RvckNhbGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWlzRmlyc3RTdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwZXJjb25zdHJ1Y3RvckNhbGxzRm91bmQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVpbiBLb25zdHJ1a3RvciBkYXJmIG51ciBlaW5lbiBlaW56aWdlbiBBdWZydWYgZGVzIFN1cGVya29uc3RydWt0b3JzIGVudGhhbHRlbi5cIiwgbm9kZS5wb3NpdGlvbiwgXCJlcnJvclwiKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIlZvciBkZW0gQXVmcnVmIGRlcyBTdXBlcmtvbnN0cnVrdG9ycyBkYXJmIGtlaW5lIGFuZGVyZSBBbndlaXN1bmcgc3RlaGVuLlwiLCBub2RlLnBvc2l0aW9uLCBcImVycm9yXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzdXBlcmNvbnN0cnVjdG9yQ2FsbHNGb3VuZC5wdXNoKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgaXNGaXJzdFN0YXRlbWVudCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGUudHlwZSA9PSBUb2tlblR5cGUuc2NvcGVOb2RlICYmIG5vZGUuc3RhdGVtZW50cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpc0ZpcnN0U3RhdGVtZW50ID0gaXNGaXJzdFN0YXRlbWVudCAmJiB0aGlzLmdldFN1cGVyY29uc3RydWN0b3JDYWxscyhub2RlLnN0YXRlbWVudHMsIHN1cGVyY29uc3RydWN0b3JDYWxsc0ZvdW5kLCBpc0ZpcnN0U3RhdGVtZW50KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlzRmlyc3RTdGF0ZW1lbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaXNGaXJzdFN0YXRlbWVudDtcclxuICAgIH1cclxuXHJcblxyXG4gICAgY29tcGlsZU1ldGhvZChtZXRob2ROb2RlOiBNZXRob2REZWNsYXJhdGlvbk5vZGUpIHtcclxuICAgICAgICAvLyBBc3N1bXB0aW9uOiBtZXRob2ROb2RlICE9IG51bGxcclxuICAgICAgICBsZXQgbWV0aG9kID0gbWV0aG9kTm9kZS5yZXNvbHZlZFR5cGU7XHJcblxyXG4gICAgICAgIHRoaXMuY2hlY2tJZk1ldGhvZElzVmlydHVhbChtZXRob2QpO1xyXG5cclxuICAgICAgICBpZiAobWV0aG9kID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgLy8gdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihtZXRob2ROb2RlLnBvc2l0aW9uLCBtZXRob2QpO1xyXG5cclxuICAgICAgICB0aGlzLmluaXRDdXJyZW50UHJvZ3JhbSgpO1xyXG4gICAgICAgIG1ldGhvZC5wcm9ncmFtID0gdGhpcy5jdXJyZW50UHJvZ3JhbTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIG1ldGhvZE5vZGUuc2NvcGVGcm9tLCBtZXRob2ROb2RlLnNjb3BlVG8pO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLm1ldGhvZCA9IG1ldGhvZDtcclxuXHJcbiAgICAgICAgbGV0IHN0YWNrUG9zOiBudW1iZXIgPSAxO1xyXG5cclxuICAgICAgICBmb3IgKGxldCB2IG9mIG1ldGhvZC5nZXRQYXJhbWV0ZXJMaXN0KCkucGFyYW1ldGVycykge1xyXG4gICAgICAgICAgICB2LnN0YWNrUG9zID0gc3RhY2tQb3MrKztcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLnZhcmlhYmxlTWFwLnNldCh2LmlkZW50aWZpZXIsIHYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gXCIgKyAxXCIgaXMgZm9yIFwidGhpc1wiLW9iamVjdFxyXG4gICAgICAgIHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zID0gbWV0aG9kTm9kZS5wYXJhbWV0ZXJzLmxlbmd0aCArIDE7XHJcblxyXG4gICAgICAgIGlmIChtZXRob2QuaXNDb25zdHJ1Y3RvciAmJiB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQgaW5zdGFuY2VvZiBLbGFzcyAmJiBtZXRob2ROb2RlLnN0YXRlbWVudHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgYzogS2xhc3MgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcblxyXG4gICAgICAgICAgICBsZXQgc3VwZXJjb25zdHJ1Y3RvckNhbGxzOiBBU1ROb2RlW10gPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5nZXRTdXBlcmNvbnN0cnVjdG9yQ2FsbHMobWV0aG9kTm9kZS5zdGF0ZW1lbnRzLCBzdXBlcmNvbnN0cnVjdG9yQ2FsbHMsIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHN1cGVyY29uc3RydWN0b3JDYWxsRW5zdXJlZDogYm9vbGVhbiA9IHN1cGVyY29uc3RydWN0b3JDYWxscy5sZW5ndGggPiAwO1xyXG5cclxuICAgICAgICAgICAgLy8gaWYgKG1ldGhvZE5vZGUuc3RhdGVtZW50cy5sZW5ndGggPiAwICYmIG1ldGhvZE5vZGUuc3RhdGVtZW50c1swXS50eXBlID09IFRva2VuVHlwZS5zY29wZU5vZGUpIHtcclxuICAgICAgICAgICAgLy8gICAgIGxldCBzdG0gPSBtZXRob2ROb2RlLnN0YXRlbWVudHNbMF0uc3RhdGVtZW50cztcclxuICAgICAgICAgICAgLy8gICAgIGlmIChzdG0ubGVuZ3RoID4gMCAmJiBbVG9rZW5UeXBlLnN1cGVyQ29uc3RydWN0b3JDYWxsLCBUb2tlblR5cGUuY29uc3RydWN0b3JDYWxsXS5pbmRleE9mKHN0bVswXS50eXBlKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgc3VwZXJjb25zdHJ1Y3RvckNhbGxFbnN1cmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAgICAgLy8gfSBlbHNlIGlmIChbVG9rZW5UeXBlLnN1cGVyQ29uc3RydWN0b3JDYWxsLCBUb2tlblR5cGUuY29uc3RydWN0b3JDYWxsXS5pbmRleE9mKG1ldGhvZE5vZGUuc3RhdGVtZW50c1swXS50eXBlKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIC8vICAgICBzdXBlcmNvbnN0cnVjdG9yQ2FsbEVuc3VyZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYyAhPSBudWxsICYmIGMuYmFzZUNsYXNzPy5oYXNDb25zdHJ1Y3RvcigpICYmICFjLmJhc2VDbGFzcz8uaGFzUGFyYW1ldGVybGVzc0NvbnN0cnVjdG9yKCkpIHtcclxuICAgICAgICAgICAgICAgIGxldCBlcnJvcjogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgaWYgKG1ldGhvZE5vZGUuc3RhdGVtZW50cyA9PSBudWxsIHx8IG1ldGhvZE5vZGUuc3RhdGVtZW50cy5sZW5ndGggPT0gMCkgZXJyb3IgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yID0gIXN1cGVyY29uc3RydWN0b3JDYWxsRW5zdXJlZDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBxdWlja0ZpeDogUXVpY2tGaXggPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBjb25zdHJ1Y3RvcnMgPSBjLmJhc2VDbGFzcy5tZXRob2RzLmZpbHRlcihtID0+IG0uaXNDb25zdHJ1Y3Rvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnN0cnVjdG9ycy5sZW5ndGggPT0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbWV0aG9kQ2FsbCA9IFwic3VwZXIoXCIgKyBjb25zdHJ1Y3RvcnNbMF0ucGFyYW1ldGVybGlzdC5wYXJhbWV0ZXJzLm1hcChwID0+IHAuaWRlbnRpZmllcikuam9pbihcIiwgXCIpICsgXCIpO1wiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb24gPSBtZXRob2ROb2RlLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWlja0ZpeCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQXVmcnVmIGRlcyBLb25zdHJ1a3RvcnMgZGVyIEJhc2lza2xhc3NlIGVpbmbDvGdlbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLzA2LjA2LjIwMjBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRzUHJvdmlkZXI6ICh1cmkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2U6IHVyaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmUgKyAxLCBzdGFydENvbHVtbjogMCwgZW5kTGluZU51bWJlcjogcG9zaXRpb24ubGluZSArIDEsIGVuZENvbHVtbjogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldmVyaXR5OiBtb25hY28uTWFya2VyU2V2ZXJpdHkuRXJyb3JcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIlxcdFxcdFwiICsgbWV0aG9kQ2FsbCArIFwiXFxuXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIEJhc2lza2xhc3NlIGRlciBLbGFzc2UgXCIgKyBjLmlkZW50aWZpZXIgKyBcIiBiZXNpdHp0IGtlaW5lbiBwYXJhbWV0ZXJsb3NlbiBLb25zdHJ1a3RvciwgZGFoZXIgbXVzcyBkaWVzZSBLb25zdHJ1a3RvcmRlZmluaXRpb24gbWl0IGVpbmVtIEF1ZnJ1ZiBlaW5lcyBLb25zdHJ1a3RvcnMgZGVyIEJhc2lza2xhc3NlIChzdXBlciguLi4pKSBiZWdpbm5lbi5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kTm9kZS5wb3NpdGlvbiwgXCJlcnJvclwiLCBxdWlja0ZpeCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIXN1cGVyY29uc3RydWN0b3JDYWxsRW5zdXJlZCAmJiBjLmJhc2VDbGFzcz8uaGFzUGFyYW1ldGVybGVzc0NvbnN0cnVjdG9yKCkpIHtcclxuICAgICAgICAgICAgICAgIC8vIGludm9rZSBwYXJhbWV0ZXJsZXNzIGNvbnN0cnVjdG9yXHJcbiAgICAgICAgICAgICAgICBsZXQgYmFzZUNsYXNzQ29uc3RydWN0b3IgPSBjLmJhc2VDbGFzcy5nZXRQYXJhbWV0ZXJsZXNzQ29uc3RydWN0b3IoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoW1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFB1c2ggdGhpcy1vYmplY3QgdG8gc3RhY2s6XHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbWV0aG9kTm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiAwXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IGJhc2VDbGFzc0NvbnN0cnVjdG9yLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1N1cGVyQ2FsbDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG1ldGhvZE5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLTEgLy8gdGhpcy1vYmplY3QgZm9sbG93ZWQgYnkgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYWN0b3JDbGFzcyA9IDxLbGFzcz50aGlzLm1vZHVsZVN0b3JlLmdldFR5cGUoXCJBY3RvclwiKS50eXBlO1xyXG4gICAgICAgIGxldCBtZXRob2RJZGVudGlmaWVycyA9IFtcImFjdFwiLCBcIm9uS2V5VHlwZWRcIiwgXCJvbktleURvd25cIiwgXCJvbktleVVwXCIsXHJcbiAgICAgICAgICAgIFwib25Nb3VzZURvd25cIiwgXCJvbk1vdXNlVXBcIiwgXCJvbk1vdXNlTW92ZVwiLCBcIm9uTW91c2VFbnRlclwiLCBcIm9uTW91c2VMZWF2ZVwiXTtcclxuICAgICAgICBpZiAobWV0aG9kSWRlbnRpZmllcnMuaW5kZXhPZihtZXRob2QuaWRlbnRpZmllcikgPj0gMCAmJiB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQuaGFzQW5jZXN0b3JPcklzKGFjdG9yQ2xhc3MpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoW1xyXG5cclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucmV0dXJuSWZEZXN0cm95ZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG1ldGhvZE5vZGUucG9zaXRpb25cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSB0aGlzLmdlbmVyYXRlU3RhdGVtZW50cyhtZXRob2ROb2RlLnN0YXRlbWVudHMpLndpdGhSZXR1cm5TdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgIGlmICghd2l0aFJldHVyblN0YXRlbWVudCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5yZXR1cm4sXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbWV0aG9kTm9kZS5zY29wZVRvLFxyXG4gICAgICAgICAgICAgICAgY29weVJldHVyblZhbHVlVG9TdGFja2ZyYW1lUG9zMDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBsZWF2ZVRoaXNPYmplY3RPblN0YWNrOiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxldCBydCA9IG1ldGhvZC5nZXRSZXR1cm5UeXBlKCk7XHJcbiAgICAgICAgICAgIGlmICghbWV0aG9kLmlzQ29uc3RydWN0b3IgJiYgcnQgIT0gbnVsbCAmJiBydCAhPSB2b2lkUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgRGVrbGFyYXRpb24gZGVyIE1ldGhvZGUgdmVybGFuZ3QgZGllIFLDvGNrZ2FiZSBlaW5lcyBXZXJ0ZXMgdm9tIFR5cCBcIiArIHJ0LmlkZW50aWZpZXIgKyBcIi4gRXMgZmVobHQgKG1pbmRlc3RlbnMpIGVpbmUgZW50c3ByZWNoZW5kZSByZXR1cm4tQW53ZWlzdW5nLlwiLCBtZXRob2ROb2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWV0aG9kLnJlc2VydmVTdGFja0ZvckxvY2FsVmFyaWFibGVzID0gdGhpcy5uZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3NcclxuICAgICAgICAgICAgLSBtZXRob2ROb2RlLnBhcmFtZXRlcnMubGVuZ3RoIC0gMTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZSgpO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlc29sdmVOb2RlcygpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNoZWNrcyBpZiBjaGlsZCBjbGFzc2VzIGhhdmUgbWV0aG9kIHdpdGggc2FtZSBzaWduYXR1cmVcclxuICAgICAqL1xyXG4gICAgY2hlY2tJZk1ldGhvZElzVmlydHVhbChtZXRob2Q6IE1ldGhvZCkge1xyXG5cclxuICAgICAgICBsZXQga2xhc3MgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcbiAgICAgICAgaWYgKGtsYXNzICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IG1vIG9mIHRoaXMubW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSkpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgb2YgbW8udHlwZVN0b3JlLnR5cGVMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgaW5zdGFuY2VvZiBLbGFzcyAmJiBjICE9IGtsYXNzICYmIGMuaGFzQW5jZXN0b3JPcklzKGtsYXNzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBtIG9mIGMubWV0aG9kcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG0gIT0gbnVsbCAmJiBtZXRob2QgIT0gbnVsbCAmJiBtLnNpZ25hdHVyZSA9PSBtZXRob2Quc2lnbmF0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kLmlzVmlydHVhbCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgaW5pdGlhbGl6ZUF0dHJpYnV0ZShhdHRyaWJ1dGU6IEF0dHJpYnV0ZURlY2xhcmF0aW9uTm9kZSkge1xyXG5cclxuICAgICAgICBpZiAoYXR0cmlidXRlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgLy8gYXNzdW1wdGlvbjogYXR0cmlidXRlICE9IG51bGxcclxuICAgICAgICBpZiAoYXR0cmlidXRlLmlkZW50aWZpZXIgPT0gbnVsbCB8fCBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24gPT0gbnVsbCB8fCBhdHRyaWJ1dGUucmVzb2x2ZWRUeXBlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKGF0dHJpYnV0ZS5pc1N0YXRpYykge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoU3RhdGljQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlSW5kZXg6IGF0dHJpYnV0ZS5yZXNvbHZlZFR5cGUuaW5kZXgsXHJcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJZGVudGlmaWVyOiBhdHRyaWJ1dGUucmVzb2x2ZWRUeXBlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogYXR0cmlidXRlLmluaXRpYWxpemF0aW9uLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAga2xhc3M6IDxTdGF0aWNDbGFzcz4odGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0KVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlSW5kZXg6IGF0dHJpYnV0ZS5yZXNvbHZlZFR5cGUuaW5kZXgsXHJcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJZGVudGlmaWVyOiBhdHRyaWJ1dGUuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICB1c2VUaGlzT2JqZWN0OiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGxldCBpbml0aWFsaXphdGlvblR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKGF0dHJpYnV0ZS5pbml0aWFsaXphdGlvbik7XHJcblxyXG4gICAgICAgIGlmIChpbml0aWFsaXphdGlvblR5cGUgIT0gbnVsbCAmJiBpbml0aWFsaXphdGlvblR5cGUudHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKGluaXRpYWxpemF0aW9uVHlwZS50eXBlLCBhdHRyaWJ1dGUuYXR0cmlidXRlVHlwZS5yZXNvbHZlZFR5cGUpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZS5hdHRyaWJ1dGVUeXBlLnJlc29sdmVkVHlwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgRGF0ZW50eXAgdm9uIFwiICsgYXR0cmlidXRlLmlkZW50aWZpZXIgKyBcIiBrb25udGUgbmljaHQgZXJtaXR0ZWx0IHdlcmRlbi4gXCIsIGF0dHJpYnV0ZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFdlcnQgZGVzIFRlcm0gdm9tIERhdGVudHlwIFwiICsgaW5pdGlhbGl6YXRpb25UeXBlLnR5cGUgKyBcIiBrYW5uIGRlbSBBdHRyaWJ1dCBcIiArIGF0dHJpYnV0ZS5pZGVudGlmaWVyICsgXCIgdm9tIFR5cCBcIiArIGF0dHJpYnV0ZS5hdHRyaWJ1dGVUeXBlLnJlc29sdmVkVHlwZS5pZGVudGlmaWVyICsgXCIgbmljaHQgenVnZXdpZXNlbiB3ZXJkZW4uXCIsIGF0dHJpYnV0ZS5pbml0aWFsaXphdGlvbi5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuYXNzaWdubWVudCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBhdHRyaWJ1dGUuaW5pdGlhbGl6YXRpb24ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgbGVhdmVWYWx1ZU9uU3RhY2s6IGZhbHNlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBpbml0Q3VycmVudFByb2dyYW0oKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSB7XHJcbiAgICAgICAgICAgIG1vZHVsZTogdGhpcy5tb2R1bGUsXHJcbiAgICAgICAgICAgIHN0YXRlbWVudHM6IFtdLFxyXG4gICAgICAgICAgICBsYWJlbE1hbmFnZXI6IG51bGxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlciA9IG5ldyBMYWJlbE1hbmFnZXIodGhpcy5jdXJyZW50UHJvZ3JhbSk7XHJcblxyXG4gICAgICAgIHRoaXMubGFzdFN0YXRlbWVudCA9IG51bGw7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdlbmVyYXRlTWFpbihpc0FkaG9jQ29tcGlsYXRpb246IGJvb2xlYW4gPSBmYWxzZSkge1xyXG5cclxuICAgICAgICB0aGlzLmluaXRDdXJyZW50UHJvZ3JhbSgpO1xyXG5cclxuICAgICAgICBsZXQgcG9zaXRpb246IFRleHRQb3NpdGlvbiA9IHsgbGluZTogMSwgY29sdW1uOiAxLCBsZW5ndGg6IDAgfTtcclxuXHJcbiAgICAgICAgbGV0IG1haW5Qcm9ncmFtQXN0ID0gdGhpcy5tb2R1bGUubWFpblByb2dyYW1Bc3Q7XHJcbiAgICAgICAgaWYgKG1haW5Qcm9ncmFtQXN0ICE9IG51bGwgJiYgbWFpblByb2dyYW1Bc3QubGVuZ3RoID4gMCAmJiBtYWluUHJvZ3JhbUFzdFswXSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uID0gdGhpcy5tb2R1bGUubWFpblByb2dyYW1Bc3RbMF0ucG9zaXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWlzQWRob2NDb21waWxhdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZSh0cnVlLCBwb3NpdGlvbiwgeyBsaW5lOiAxMDAwMDAsIGNvbHVtbjogMSwgbGVuZ3RoOiAwIH0sIHRoaXMuY3VycmVudFByb2dyYW0pO1xyXG4gICAgICAgICAgICB0aGlzLmhlYXAgPSB7fTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtID0gdGhpcy5jdXJyZW50UHJvZ3JhbTtcclxuXHJcbiAgICAgICAgbGV0IGhhc01haW5Qcm9ncmFtOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1vZHVsZS5tYWluUHJvZ3JhbUFzdCAhPSBudWxsICYmIHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtQXN0Lmxlbmd0aCA+IDApIHtcclxuXHJcbiAgICAgICAgICAgIGhhc01haW5Qcm9ncmFtID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHModGhpcy5tb2R1bGUubWFpblByb2dyYW1Bc3QpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGlzQWRob2NDb21waWxhdGlvbiAmJiB0aGlzLmxhc3RTdGF0ZW1lbnQgIT0gbnVsbCAmJiB0aGlzLmxhc3RTdGF0ZW1lbnQudHlwZSA9PSBUb2tlblR5cGUuZGVjcmVhc2VTdGFja3BvaW50ZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlTGFzdFN0YXRlbWVudCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxhc3RQb3NpdGlvbiA9IHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtRW5kO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sYXN0UG9zaXRpb24gPT0gbnVsbCkgdGhpcy5sYXN0UG9zaXRpb24gPSB7IGxpbmU6IDEwMDAwMCwgY29sdW1uOiAwLCBsZW5ndGg6IDAgfTtcclxuICAgICAgICAgICAgLy8gaWYodGhpcy5sYXN0UG9zaXRpb24gPT0gbnVsbCkgdGhpcy5sYXN0UG9zaXRpb24gPSB7bGluZTogMTAwMDAwLCBjb2x1bW46IDAsIGxlbmd0aDogMH07XHJcblxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5wb3NpdGlvblRvID0gdGhpcy5sYXN0UG9zaXRpb247XHJcbiAgICAgICAgICAgIGlmICghaXNBZGhvY0NvbXBpbGF0aW9uKSB0aGlzLnBvcFN5bWJvbFRhYmxlKHRoaXMuY3VycmVudFByb2dyYW0sIHRydWUpO1xyXG4gICAgICAgICAgICB0aGlzLmhlYXAgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHJvZ3JhbUVuZCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmxhc3RQb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHBhdXNlQWZ0ZXJQcm9ncmFtRW5kOiB0cnVlXHJcbiAgICAgICAgICAgIH0sIHRydWUpO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlc29sdmVOb2RlcygpO1xyXG5cclxuICAgICAgICBpZiAoIWlzQWRob2NDb21waWxhdGlvbiAmJiAhaGFzTWFpblByb2dyYW0pIHtcclxuICAgICAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZSh0aGlzLmN1cnJlbnRQcm9ncmFtKTtcclxuICAgICAgICAgICAgdGhpcy5oZWFwID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGVuc3VyZUF1dG9tYXRpY0Nhc3RpbmcodHlwZUZyb206IFR5cGUsIHR5cGVUbzogVHlwZSwgcG9zaXRpb24/OiBUZXh0UG9zaXRpb24sIG5vZGVGcm9tPzogQVNUTm9kZSwgbnVsbFR5cGVGb3JiaWRkZW46IGJvb2xlYW4gPSBmYWxzZSk6IGJvb2xlYW4ge1xyXG5cclxuICAgICAgICBpZiAodHlwZUZyb20gPT0gbnVsbCB8fCB0eXBlVG8gPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoISh0eXBlRnJvbSA9PSBudWxsVHlwZSAmJiBudWxsVHlwZUZvcmJpZGRlbikpIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlRnJvbS5lcXVhbHModHlwZVRvKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghdHlwZUZyb20uY2FuQ2FzdFRvKHR5cGVUbykpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZVRvID09IGJvb2xlYW5QcmltaXRpdmVUeXBlICYmIG5vZGVGcm9tICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZUZyb20pO1xyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZUZyb21bXCJ1bmJveGFibGVBc1wiXSAhPSBudWxsICYmIHR5cGVGcm9tW1widW5ib3hhYmxlQXNcIl0uaW5kZXhPZih0eXBlVG8pID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R5cGU6IHR5cGVUb1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBpZiAodHlwZUZyb20gaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlICYmICh0eXBlVG8gaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlIHx8IHR5cGVUbyA9PSBzdHJpbmdQcmltaXRpdmVUeXBlKSkge1xyXG4gICAgICAgICAgICBsZXQgY2FzdEluZm8gPSB0eXBlRnJvbS5nZXRDYXN0SW5mb3JtYXRpb24odHlwZVRvKTtcclxuICAgICAgICAgICAgaWYgKCFjYXN0SW5mby5hdXRvbWF0aWMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBpZiAoY2FzdEluZm8ubmVlZHNTdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FzdFZhbHVlLFxyXG4gICAgICAgICAgICAgICAgbmV3VHlwZTogdHlwZVRvLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZW5zdXJlQXV0b21hdGljVG9TdHJpbmcodHlwZUZyb206IFR5cGUsIGNvZGVwb3M6IG51bWJlciA9IHVuZGVmaW5lZCwgdGV4dHBvc2l0aW9uPzogVGV4dFBvc2l0aW9uKTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKHR5cGVGcm9tID09IHN0cmluZ1ByaW1pdGl2ZVR5cGUpIHJldHVybiB0cnVlO1xyXG4gICAgICAgIGlmICh0eXBlRnJvbSA9PSB2b2lkUHJpbWl0aXZlVHlwZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGxldCBhdXRvbWF0aWNUb1N0cmluZzogTWV0aG9kO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh0eXBlRnJvbSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgYXV0b21hdGljVG9TdHJpbmcgPSBuZXcgTWV0aG9kKFwidG9TdHJpbmdcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pLCBzdHJpbmdQcmltaXRpdmVUeXBlLCAocGFyYW1ldGVyczogVmFsdWVbXSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gcGFyYW1ldGVyc1swXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAoKDxQcmltaXRpdmVUeXBlPnZhbHVlLnR5cGUpLnZhbHVlVG9TdHJpbmcodmFsdWUpKTtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUpO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCh0eXBlRnJvbSBpbnN0YW5jZW9mIEtsYXNzKSB8fCAodHlwZUZyb20gPT0gbnVsbFR5cGUpKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgdG9TdHJpbmdNZXRob2Q6IE1ldGhvZDtcclxuICAgICAgICAgICAgaWYgKHR5cGVGcm9tID09IG51bGxUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICB0b1N0cmluZ01ldGhvZCA9IG9iamVjdFR5cGUuZ2V0TWV0aG9kQnlTaWduYXR1cmUoXCJ0b1N0cmluZygpXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdG9TdHJpbmdNZXRob2QgPSAoPEtsYXNzPnR5cGVGcm9tKS5nZXRNZXRob2RCeVNpZ25hdHVyZShcInRvU3RyaW5nKClcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRvU3RyaW5nTWV0aG9kICE9IG51bGwgJiYgdG9TdHJpbmdNZXRob2QuZ2V0UmV0dXJuVHlwZSgpID09IHN0cmluZ1ByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGF1dG9tYXRpY1RvU3RyaW5nID0gbmV3IE1ldGhvZCh0b1N0cmluZ01ldGhvZC5pZGVudGlmaWVyLCB0b1N0cmluZ01ldGhvZC5wYXJhbWV0ZXJsaXN0LCBzdHJpbmdQcmltaXRpdmVUeXBlLCAocGFyYW1ldGVyczogVmFsdWVbXSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBcIm51bGxcIjtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9TdHJpbmdNZXRob2QuaW52b2tlKHBhcmFtZXRlcnMpO1xyXG4gICAgICAgICAgICAgICAgfSwgdG9TdHJpbmdNZXRob2QuaXNBYnN0cmFjdCwgdHJ1ZSwgdG9TdHJpbmdNZXRob2QuZG9jdW1lbnRhdGlvbiwgdG9TdHJpbmdNZXRob2QuaXNDb25zdHJ1Y3Rvcik7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYXV0b21hdGljVG9TdHJpbmcgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zZXJ0T3JQdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0ZXh0cG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6IGF1dG9tYXRpY1RvU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgaXNTdXBlckNhbGw6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tmcmFtZUJlZ2luOiAtMSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2VcclxuICAgICAgICAgICAgfSwgY29kZXBvcyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIGdldFRvU3RyaW5nU3RhdGVtZW50KHR5cGU6IEtsYXNzIHwgTnVsbFR5cGUsIHBvc2l0aW9uOiBUZXh0UG9zaXRpb24sIG51bGxUb1N0cmluZzogYm9vbGVhbiA9IHRydWUpOiBTdGF0ZW1lbnQge1xyXG5cclxuICAgIC8vIH1cclxuXHJcbiAgICBjaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZUZyb206IEFTVE5vZGUsIGNvbmRpdGlvblR5cGU/OiBUeXBlKSB7XHJcbiAgICAgICAgaWYgKG5vZGVGcm9tID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKG5vZGVGcm9tLnR5cGUgPT0gVG9rZW5UeXBlLmJpbmFyeU9wICYmIG5vZGVGcm9tLm9wZXJhdG9yID09IFRva2VuVHlwZS5hc3NpZ25tZW50KSB7XHJcbiAgICAgICAgICAgIGxldCBwb3MgPSBub2RlRnJvbS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCI9IGlzdCBkZXIgWnV3ZWlzdW5nc29wZXJhdG9yLiBEdSB3aWxsc3Qgc2ljaGVyIHp3ZWkgV2VydGUgdmVyZ2xlaWNoZW4uIERhenUgYmVuw7Z0aWdzdCBEdSBkZW4gVmVyZ2xlaWNoc29wZXJhdG9yID09LlwiLFxyXG4gICAgICAgICAgICAgICAgcG9zLCBjb25kaXRpb25UeXBlID09IGJvb2xlYW5QcmltaXRpdmVUeXBlID8gXCJ3YXJuaW5nXCIgOiBcImVycm9yXCIsIHtcclxuICAgICAgICAgICAgICAgIHRpdGxlOiAnPSBkdXJjaCA9PSBlcnNldHplbicsXHJcbiAgICAgICAgICAgICAgICBlZGl0c1Byb3ZpZGVyOiAodXJpKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiB1cmksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkaXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRMaW5lTnVtYmVyOiBwb3MubGluZSwgc3RhcnRDb2x1bW46IHBvcy5jb2x1bW4sIGVuZExpbmVOdW1iZXI6IHBvcy5saW5lLCBlbmRDb2x1bW46IHBvcy5jb2x1bW4gKyAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V2ZXJpdHk6IG1vbmFjby5NYXJrZXJTZXZlcml0eS5FcnJvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiPT1cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2VuZXJhdGVTdGF0ZW1lbnRzKG5vZGVzOiBBU1ROb2RlW10pOiB7IHdpdGhSZXR1cm5TdGF0ZW1lbnQ6IGJvb2xlYW4sIGVuZFBvc2l0aW9uPzogVGV4dFBvc2l0aW9uIH0ge1xyXG5cclxuXHJcbiAgICAgICAgaWYgKG5vZGVzID09IG51bGwgfHwgbm9kZXMubGVuZ3RoID09IDAgfHwgbm9kZXNbMF0gPT0gbnVsbCkgcmV0dXJuIHsgd2l0aFJldHVyblN0YXRlbWVudDogZmFsc2UgfTtcclxuXHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQ6IGJvb2xlYW4gPSB0aGlzLnByb2Nlc3NTdGF0ZW1lbnRzSW5zaWRlQmxvY2sobm9kZXMpO1xyXG5cclxuICAgICAgICBsZXQgbGFzdE5vZGUgPSBub2Rlc1tub2Rlcy5sZW5ndGggLSAxXTtcclxuICAgICAgICBsZXQgZW5kUG9zaXRpb246IFRleHRQb3NpdGlvbjtcclxuICAgICAgICBpZiAobGFzdE5vZGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpZiAobGFzdE5vZGUudHlwZSA9PSBUb2tlblR5cGUuc2NvcGVOb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBlbmRQb3NpdGlvbiA9IGxhc3ROb2RlLnBvc2l0aW9uVG87XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBlbmRQb3NpdGlvbiA9IE9iamVjdC5hc3NpZ24oe30sIGxhc3ROb2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGlmIChlbmRQb3NpdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5kUG9zaXRpb24uY29sdW1uICs9IGVuZFBvc2l0aW9uLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBlbmRQb3NpdGlvbi5sZW5ndGggPSAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMubGFzdFBvc2l0aW9uID0gZW5kUG9zaXRpb247XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZW5kUG9zaXRpb24gPSB0aGlzLmxhc3RQb3NpdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IHdpdGhSZXR1cm5TdGF0ZW1lbnQ6IHdpdGhSZXR1cm5TdGF0ZW1lbnQsIGVuZFBvc2l0aW9uOiBlbmRQb3NpdGlvbiB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzU3RhdGVtZW50c0luc2lkZUJsb2NrKG5vZGVzOiBBU1ROb2RlW10pIHtcclxuICAgICAgICBsZXQgd2l0aFJldHVyblN0YXRlbWVudCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBub2RlIG9mIG5vZGVzKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAobm9kZSA9PSBudWxsKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIGxldCB0eXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlICE9IG51bGwgJiYgdHlwZS53aXRoUmV0dXJuU3RhdGVtZW50ICE9IG51bGwgJiYgdHlwZS53aXRoUmV0dXJuU3RhdGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICB3aXRoUmV0dXJuU3RhdGVtZW50ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gSWYgbGFzdCBTdGF0ZW1lbnQgaGFzIHZhbHVlIHdoaWNoIGlzIG5vdCB1c2VkIGZ1cnRoZXIgdGhlbiBwb3AgdGhpcyB2YWx1ZSBmcm9tIHN0YWNrLlxyXG4gICAgICAgICAgICAvLyBlLmcuIHN0YXRlbWVudCAxMiArIDE3IC03O1xyXG4gICAgICAgICAgICAvLyBQYXJzZXIgaXNzdWVzIGEgd2FybmluZyBpbiB0aGlzIGNhc2UsIHNlZSBQYXJzZXIuY2hlY2tJZlN0YXRlbWVudEhhc05vRWZmZWt0XHJcbiAgICAgICAgICAgIGlmICh0eXBlICE9IG51bGwgJiYgdHlwZS50eXBlICE9IG51bGwgJiYgdHlwZS50eXBlICE9IHZvaWRQcmltaXRpdmVUeXBlKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGFzdFN0YXRlbWVudCAhPSBudWxsICYmXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0U3RhdGVtZW50LnR5cGUgPT0gVG9rZW5UeXBlLmFzc2lnbm1lbnQgJiYgdGhpcy5sYXN0U3RhdGVtZW50LmxlYXZlVmFsdWVPblN0YWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0U3RhdGVtZW50LmxlYXZlVmFsdWVPblN0YWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuZGVjcmVhc2VTdGFja3BvaW50ZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3BDb3VudDogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfSwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gd2l0aFJldHVyblN0YXRlbWVudDtcclxuICAgIH1cclxuXHJcblxyXG4gICAgbGFzdFBvc2l0aW9uOiBUZXh0UG9zaXRpb247XHJcbiAgICBsYXN0U3RhdGVtZW50OiBTdGF0ZW1lbnQ7XHJcblxyXG4gICAgaW5zZXJ0U3RhdGVtZW50cyhwb3M6IG51bWJlciwgc3RhdGVtZW50czogU3RhdGVtZW50IHwgU3RhdGVtZW50W10pIHtcclxuICAgICAgICBpZiAoc3RhdGVtZW50cyA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHN0YXRlbWVudHMpKSBzdGF0ZW1lbnRzID0gW3N0YXRlbWVudHNdO1xyXG4gICAgICAgIGZvciAobGV0IHN0IG9mIHN0YXRlbWVudHMpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLnNwbGljZShwb3MrKywgMCwgc3QpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdXNoU3RhdGVtZW50cyhzdGF0ZW1lbnQ6IFN0YXRlbWVudCB8IFN0YXRlbWVudFtdLCBkZWxldGVTdGVwRmluaXNoZWRGbGFnT25TdGVwQmVmb3JlOiBib29sZWFuID0gZmFsc2UpIHtcclxuXHJcbiAgICAgICAgaWYgKHN0YXRlbWVudCA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmIChkZWxldGVTdGVwRmluaXNoZWRGbGFnT25TdGVwQmVmb3JlICYmIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGxldCBzdGVwQmVmb3JlOiBTdGF0ZW1lbnQgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHNbdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICBzdGVwQmVmb3JlLnN0ZXBGaW5pc2hlZCA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3RhdGVtZW50KSkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBzdCBvZiBzdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5wdXNoKHN0KTtcclxuICAgICAgICAgICAgICAgIGlmIChzdC50eXBlID09IFRva2VuVHlwZS5yZXR1cm4gfHwgc3QudHlwZSA9PSBUb2tlblR5cGUuanVtcEFsd2F5cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmxhc3RTdGF0ZW1lbnQgIT0gbnVsbCkgdGhpcy5sYXN0U3RhdGVtZW50LnN0ZXBGaW5pc2hlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHN0LnBvc2l0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RQb3NpdGlvbiA9IHN0LnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzdC5wb3NpdGlvbiA9IHRoaXMubGFzdFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0U3RhdGVtZW50ID0gc3Q7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMucHVzaChzdGF0ZW1lbnQpO1xyXG4gICAgICAgICAgICBpZiAoc3RhdGVtZW50LnR5cGUgPT0gVG9rZW5UeXBlLnJldHVybiB8fCBzdGF0ZW1lbnQudHlwZSA9PSBUb2tlblR5cGUuanVtcEFsd2F5cykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGFzdFN0YXRlbWVudCAhPSBudWxsICYmIHRoaXMubGFzdFN0YXRlbWVudC50eXBlICE9IFRva2VuVHlwZS5ub09wKSB0aGlzLmxhc3RTdGF0ZW1lbnQuc3RlcEZpbmlzaGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHN0YXRlbWVudC5wb3NpdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxhc3RQb3NpdGlvbiA9IHN0YXRlbWVudC5wb3NpdGlvbjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN0YXRlbWVudC5wb3NpdGlvbiA9IHRoaXMubGFzdFBvc2l0aW9uO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxhc3RTdGF0ZW1lbnQgPSBzdGF0ZW1lbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGluc2VydE9yUHVzaFN0YXRlbWVudHMoc3RhdGVtZW50czogU3RhdGVtZW50IHwgU3RhdGVtZW50W10sIHBvcz86IG51bWJlcikge1xyXG4gICAgICAgIGlmIChwb3MgPT0gbnVsbCAmJiBwb3MgPT0gdW5kZWZpbmVkKSB0aGlzLnB1c2hTdGF0ZW1lbnRzKHN0YXRlbWVudHMpO1xyXG4gICAgICAgIGVsc2UgdGhpcy5pbnNlcnRTdGF0ZW1lbnRzKHBvcywgc3RhdGVtZW50cyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlTGFzdFN0YXRlbWVudCgpIHtcclxuICAgICAgICBsZXQgbHN0ID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLnBvcCgpO1xyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLnJlbW92ZU5vZGUobHN0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdFN0YWNrRnJhbWVOb2RlczogSW5pdFN0YWNrZnJhbWVTdGF0ZW1lbnRbXSA9IFtdO1xyXG5cclxuXHJcbiAgICBwdXNoTmV3U3ltYm9sVGFibGUoYmVnaW5OZXdTdGFja2ZyYW1lOiBib29sZWFuLCBwb3NpdGlvbkZyb206IFRleHRQb3NpdGlvbiwgcG9zaXRpb25UbzogVGV4dFBvc2l0aW9uLFxyXG4gICAgICAgIHByb2dyYW0/OiBQcm9ncmFtKTogU3ltYm9sVGFibGUge1xyXG5cclxuICAgICAgICBsZXQgc3QgPSBuZXcgU3ltYm9sVGFibGUodGhpcy5jdXJyZW50U3ltYm9sVGFibGUsIHBvc2l0aW9uRnJvbSwgcG9zaXRpb25Ubyk7XHJcblxyXG4gICAgICAgIHRoaXMuc3ltYm9sVGFibGVTdGFjay5wdXNoKHRoaXMuY3VycmVudFN5bWJvbFRhYmxlKTtcclxuXHJcbiAgICAgICAgaWYgKGJlZ2luTmV3U3RhY2tmcmFtZSkge1xyXG4gICAgICAgICAgICBzdC5iZWdpbnNOZXdTdGFja2ZyYW1lID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuc3RhY2tmcmFtZVNpemUgPSB0aGlzLm5leHRGcmVlUmVsYXRpdmVTdGFja1BvcztcclxuICAgICAgICAgICAgdGhpcy5uZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3MgPSAwO1xyXG5cclxuICAgICAgICAgICAgaWYgKHByb2dyYW0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGluaXRTdGFja0ZyYW1lTm9kZTogSW5pdFN0YWNrZnJhbWVTdGF0ZW1lbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmluaXRTdGFja2ZyYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbkZyb20sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzZXJ2ZUZvckxvY2FsVmFyaWFibGVzOiAwXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2goaW5pdFN0YWNrRnJhbWVOb2RlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5pdFN0YWNrRnJhbWVOb2Rlcy5wdXNoKGluaXRTdGFja0ZyYW1lTm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZSA9IHN0O1xyXG5cclxuICAgICAgICByZXR1cm4gc3Q7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHBvcFN5bWJvbFRhYmxlKHByb2dyYW0/OiBQcm9ncmFtLCBkZWxldGVTdGVwRmluaXNoZWRGbGFnT25TdGVwQmVmb3JlOiBib29sZWFuID0gZmFsc2UpOiB2b2lkIHtcclxuXHJcbiAgICAgICAgbGV0IHN0ID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGU7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50U3ltYm9sVGFibGUgPSB0aGlzLnN5bWJvbFRhYmxlU3RhY2sucG9wKCk7XHJcblxyXG4gICAgICAgIC8vIGlmIHYuZGVjbGFyYXRpb25FcnJvciAhPSBudWxsIHRoZW4gdmFyaWFibGUgaGFzIGJlZW4gdXNlZCBiZWZvcmUgaW5pdGlhbGl6YXRpb24uXHJcbiAgICAgICAgc3QudmFyaWFibGVNYXAuZm9yRWFjaCh2ID0+IHtcclxuICAgICAgICAgICAgaWYgKHYuZGVjbGFyYXRpb25FcnJvciAhPSBudWxsICYmIHYudXNlZEJlZm9yZUluaXRpYWxpemF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmVycm9yTGlzdC5wdXNoKHYuZGVjbGFyYXRpb25FcnJvcik7XHJcbiAgICAgICAgICAgICAgICB2LmRlY2xhcmF0aW9uRXJyb3IgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIGlmICghc3QuYmVnaW5zTmV3U3RhY2tmcmFtZSAmJiBzdC52YXJpYWJsZU1hcC5zaXplID09IDAgJiYgcmVtb3ZlSSkge1xyXG4gICAgICAgIC8vICAgICAvLyBlbXB0eSBzeW1ib2wgdGFibGUgPT4gcmVtb3ZlIGl0IVxyXG4gICAgICAgIC8vICAgICBpZiAoc3QucGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgICAvLyAgICAgICAgIHN0LnBhcmVudC5jaGlsZFN5bWJvbFRhYmxlcy5wb3AoKTtcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vIH0gZWxzZSBcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGFkZCBsZW5ndGggb2YgdG9rZW5cclxuXHJcbiAgICAgICAgICAgIGlmIChzdC5iZWdpbnNOZXdTdGFja2ZyYW1lKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgc3Quc3RhY2tmcmFtZVNpemUgPSB0aGlzLm5leHRGcmVlUmVsYXRpdmVTdGFja1BvcztcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuc3RhY2tmcmFtZVNpemU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHByb2dyYW0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbml0U3RhY2tmcmFtZU5vZGUgPSB0aGlzLmluaXRTdGFja0ZyYW1lTm9kZXMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluaXRTdGFja2ZyYW1lTm9kZSAhPSBudWxsKSBpbml0U3RhY2tmcmFtZU5vZGUucmVzZXJ2ZUZvckxvY2FsVmFyaWFibGVzID0gc3Quc3RhY2tmcmFtZVNpemU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID4gMCAmJiBkZWxldGVTdGVwRmluaXNoZWRGbGFnT25TdGVwQmVmb3JlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzdGF0ZW1lbnQgPSBwcm9ncmFtLnN0YXRlbWVudHNbcHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aCAtIDFdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZG9uJ3Qgc2V0IHN0ZXBGaW5pc2hlZCA9IGZhbHNlIGluIGp1bXAtc3RhdGVtZW50c1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhcyB0aGlzIGNvdWxkIGxlYWQgdG8gaW5maW5pdHktbG9vcCBpcyB1c2VyIHNldHMgXCJ3aGlsZSh0cnVlKTtcIiBqdXN0IGJlZm9yZSBwcm9ncmFtIGVuZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoW1Rva2VuVHlwZS5qdW1wQWx3YXlzLCBUb2tlblR5cGUuanVtcElmVHJ1ZSwgVG9rZW5UeXBlLmp1bXBJZkZhbHNlLCBUb2tlblR5cGUuanVtcElmRmFsc2VBbmRMZWF2ZU9uU3RhY2ssIFRva2VuVHlwZS5qdW1wSWZUcnVlQW5kTGVhdmVPblN0YWNrXS5pbmRleE9mKHN0YXRlbWVudC50eXBlKSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbS5zdGF0ZW1lbnRzW3Byb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggLSAxXS5zdGVwRmluaXNoZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2xvc2VTdGFja2ZyYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogc3QucG9zaXRpb25Ub1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHB1c2hFcnJvcih0ZXh0OiBzdHJpbmcsIHBvc2l0aW9uOiBUZXh0UG9zaXRpb24sIGVycm9yTGV2ZWw6IEVycm9yTGV2ZWwgPSBcImVycm9yXCIsIHF1aWNrRml4PzogUXVpY2tGaXgpIHtcclxuICAgICAgICB0aGlzLmVycm9yTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgdGV4dDogdGV4dCxcclxuICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICBxdWlja0ZpeDogcXVpY2tGaXgsXHJcbiAgICAgICAgICAgIGxldmVsOiBlcnJvckxldmVsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgb3BlbkJyZWFrU2NvcGUoKSB7XHJcbiAgICAgICAgdGhpcy5icmVha05vZGVTdGFjay5wdXNoKFtdKTtcclxuICAgIH1cclxuXHJcbiAgICBvcGVuQ29udGludWVTY29wZSgpIHtcclxuICAgICAgICB0aGlzLmNvbnRpbnVlTm9kZVN0YWNrLnB1c2goW10pO1xyXG4gICAgfVxyXG5cclxuICAgIHB1c2hCcmVha05vZGUoYnJlYWtOb2RlOiBKdW1wQWx3YXlzU3RhdGVtZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuYnJlYWtOb2RlU3RhY2subGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW5lIGJyZWFrLUFud2Vpc3VuZyBpc3QgbnVyIGlubmVyaGFsYiBlaW5lciB1bWdlYmVuZGVuIFNjaGxlaWZlIG9kZXIgc3dpdGNoLUFud2Vpc3VuZyBzaW5udm9sbC5cIiwgYnJlYWtOb2RlLnBvc2l0aW9uKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmJyZWFrTm9kZVN0YWNrW3RoaXMuYnJlYWtOb2RlU3RhY2subGVuZ3RoIC0gMV0ucHVzaChicmVha05vZGUpO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKGJyZWFrTm9kZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1c2hDb250aW51ZU5vZGUoY29udGludWVOb2RlOiBKdW1wQWx3YXlzU3RhdGVtZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29udGludWVOb2RlU3RhY2subGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW5lIGNvbnRpbnVlLUFud2Vpc3VuZyBpc3QgbnVyIGlubmVyaGFsYiBlaW5lciB1bWdlYmVuZGVuIFNjaGxlaWZlIG9kZXIgc3dpdGNoLUFud2Vpc3VuZyBzaW5udm9sbC5cIiwgY29udGludWVOb2RlLnBvc2l0aW9uKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRpbnVlTm9kZVN0YWNrW3RoaXMuY29udGludWVOb2RlU3RhY2subGVuZ3RoIC0gMV0ucHVzaChjb250aW51ZU5vZGUpO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKGNvbnRpbnVlTm9kZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNsb3NlQnJlYWtTY29wZShicmVha1RhcmdldExhYmVsOiBudW1iZXIsIGxtOiBMYWJlbE1hbmFnZXIpIHtcclxuICAgICAgICBsZXQgYnJlYWtOb2RlcyA9IHRoaXMuYnJlYWtOb2RlU3RhY2sucG9wKCk7XHJcbiAgICAgICAgZm9yIChsZXQgYm4gb2YgYnJlYWtOb2Rlcykge1xyXG4gICAgICAgICAgICBsbS5yZWdpc3Rlckp1bXBOb2RlKGJuLCBicmVha1RhcmdldExhYmVsKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xvc2VDb250aW51ZVNjb3BlKGNvbnRpbnVlVGFyZ2V0TGFiZWw6IG51bWJlciwgbG06IExhYmVsTWFuYWdlcikge1xyXG4gICAgICAgIGxldCBjb250aW51ZU5vZGVzID0gdGhpcy5jb250aW51ZU5vZGVTdGFjay5wb3AoKTtcclxuICAgICAgICBmb3IgKGxldCBibiBvZiBjb250aW51ZU5vZGVzKSB7XHJcbiAgICAgICAgICAgIGxtLnJlZ2lzdGVySnVtcE5vZGUoYm4sIGNvbnRpbnVlVGFyZ2V0TGFiZWwpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBicmVha09jY3VyZWQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYnJlYWtOb2RlU3RhY2subGVuZ3RoID4gMCAmJiB0aGlzLmJyZWFrTm9kZVN0YWNrW3RoaXMuYnJlYWtOb2RlU3RhY2subGVuZ3RoIC0gMV0ubGVuZ3RoID4gMDtcclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzTm9kZShub2RlOiBBU1ROb2RlLCBpc0xlZnRTaWRlT2ZBc3NpZ25tZW50OiBib29sZWFuID0gZmFsc2UpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBpZiAobm9kZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmJpbmFyeU9wOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0JpbmFyeU9wKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS51bmFyeU9wOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1VuYXJ5T3Aobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hDb25zdGFudDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnB1c2hDb25zdGFudChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuY2FsbE1ldGhvZDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxNZXRob2Qobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmlkZW50aWZpZXI6XHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0YWNrVHlwZSA9IHRoaXMucmVzb2x2ZUlkZW50aWZpZXIobm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHYgPSBub2RlLnZhcmlhYmxlO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzTGVmdFNpZGVPZkFzc2lnbm1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHYuaW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2LnVzZWRCZWZvcmVJbml0aWFsaXphdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHYuZGVjbGFyYXRpb25FcnJvciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodi5pbml0aWFsaXplZCAhPSBudWxsICYmICF2LmluaXRpYWxpemVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdi51c2VkQmVmb3JlSW5pdGlhbGl6YXRpb24gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIFZhcmlhYmxlIFwiICsgdi5pZGVudGlmaWVyICsgXCIgd2lyZCBoaWVyIGJlbnV0enQgYmV2b3Igc2llIGluaXRpYWxpc2llcnQgd3VyZGUuXCIsIG5vZGUucG9zaXRpb24sIFwiaW5mb1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RhY2tUeXBlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zZWxlY3RBcnJheUVsZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RBcnJheUVsZW1lbnQobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmluY3JlbWVudERlY3JlbWVudEJlZm9yZTpcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuaW5jcmVtZW50RGVjcmVtZW50QWZ0ZXI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbmNyZW1lbnREZWNyZW1lbnRCZWZvcmVPckFmdGVyKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zdXBlckNvbnN0cnVjdG9yQ2FsbDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN1cGVyY29uc3RydWN0b3JDYWxsKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jb25zdHJ1Y3RvckNhbGw6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zdXBlcmNvbnN0cnVjdG9yQ2FsbChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZFRoaXM6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wdXNoVGhpc09yU3VwZXIobm9kZSwgZmFsc2UpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkU3VwZXI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wdXNoVGhpc09yU3VwZXIobm9kZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hBdHRyaWJ1dGU6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wdXNoQXR0cmlidXRlKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5uZXdPYmplY3Q6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5uZXdPYmplY3Qobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRXaGlsZTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NXaGlsZShub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZERvOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0RvKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkRm9yOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0Zvcihub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZm9yTG9vcE92ZXJDb2xsZWN0aW9uOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0Zvckxvb3BPdmVyQ29sbGVjdGlvbihub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZElmOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0lmKG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkU3dpdGNoOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1N3aXRjaChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZFJldHVybjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NSZXR1cm4obm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmxvY2FsVmFyaWFibGVEZWNsYXJhdGlvbjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuYXJyYXlJbml0aWFsaXphdGlvbjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NBcnJheUxpdGVyYWwobm9kZSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5ld0FycmF5OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc05ld0FycmF5KG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkUHJpbnQ6XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRQcmludGxuOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1ByaW50KG5vZGUpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jYXN0VmFsdWU6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzTWFudWFsQ2FzdChub2RlKTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZEJyZWFrOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoQnJlYWtOb2RlKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuanVtcEFsd2F5cyxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZENvbnRpbnVlOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoQ29udGludWVOb2RlKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuanVtcEFsd2F5cyxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucmlnaHRCcmFja2V0OlxyXG4gICAgICAgICAgICAgICAgbGV0IHR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUudGVybUluc2lkZUJyYWNrZXRzKTtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlICE9IG51bGwgJiYgdHlwZS50eXBlIGluc3RhbmNlb2YgS2xhc3MpIHRoaXMucHVzaFR5cGVQb3NpdGlvbihub2RlLnBvc2l0aW9uLCB0eXBlLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGU7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnNjb3BlTm9kZTpcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaE5ld1N5bWJvbFRhYmxlKGZhbHNlLCBub2RlLnBvc2l0aW9uLCBub2RlLnBvc2l0aW9uVG8pO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB3aXRoUmV0dXJuU3RhdGVtZW50ID0gdGhpcy5wcm9jZXNzU3RhdGVtZW50c0luc2lkZUJsb2NrKG5vZGUuc3RhdGVtZW50cyk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IG51bGwsIGlzQXNzaWduYWJsZTogZmFsc2UsIHdpdGhSZXR1cm5TdGF0ZW1lbnQ6IHdpdGhSZXR1cm5TdGF0ZW1lbnQgfTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzTWFudWFsQ2FzdChub2RlOiBDYXN0TWFudWFsbHlOb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IHR5cGVGcm9tMSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS53aGF0VG9DYXN0KTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVGcm9tMSA9PSBudWxsIHx8IHR5cGVGcm9tMS50eXBlID09IG51bGwpIHJldHVybjtcclxuICAgICAgICBsZXQgdHlwZUZyb206IFR5cGUgPSB0eXBlRnJvbTEudHlwZTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVGcm9tICE9IG51bGwgJiYgbm9kZS5jYXN0VG9UeXBlICE9IG51bGwgJiYgbm9kZS5jYXN0VG9UeXBlLnJlc29sdmVkVHlwZSAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgdHlwZVRvID0gbm9kZS5jYXN0VG9UeXBlLnJlc29sdmVkVHlwZTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlRnJvbS5jYW5DYXN0VG8odHlwZVRvKSkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaENhc3RUb1N0YXRlbWVudCh0eXBlRnJvbSwgdHlwZVRvLCBub2RlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBpZiAoKHR5cGVGcm9tIGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSkgJiYgdHlwZVRvIGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIGxldCBjYXN0SW5mbyA9IHR5cGVGcm9tLmdldENhc3RJbmZvcm1hdGlvbih0eXBlVG8pO1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIGlmIChjYXN0SW5mby5uZWVkc1N0YXRlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgIG5ld1R5cGU6IHR5cGVUb1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgIC8vIH0gZWxzZSBpZiAodHlwZUZyb20gaW5zdGFuY2VvZiBLbGFzcyAmJiB0eXBlVG8gPT0gc3RyaW5nUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIGxldCB0b1N0cmluZ1N0YXRlbWVudCA9IHRoaXMuZ2V0VG9TdHJpbmdTdGF0ZW1lbnQodHlwZUZyb20sIG5vZGUucG9zaXRpb24sIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIC8vICAgICBpZiAodG9TdHJpbmdTdGF0ZW1lbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHRoaXMuZ2V0VG9TdHJpbmdTdGF0ZW1lbnQodHlwZUZyb20sIG5vZGUucG9zaXRpb24sIGZhbHNlKSk7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgRGF0ZW50eXAgXCIgKyB0eXBlRnJvbS5pZGVudGlmaWVyICsgXCIga2FubiAoenVtaW5kZXN0IGR1cmNoIGNhc3RpbmcpIG5pY2h0IGluIGRlbiBEYXRlbnR5cCBcIiArIHR5cGVUby5pZGVudGlmaWVyICsgXCIgdW1nZXdhbmRlbHQgd2VyZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7IHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLCBuZXdUeXBlOiB0eXBlVG8gfSk7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIGVsc2UgaWYgKCh0eXBlRnJvbVtcInVuYm94YWJsZUFzXCJdIHx8IFtdKS5pbmNsdWRlcyh0eXBlVG8pKSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBuZXdUeXBlOiB0eXBlVG9cclxuICAgICAgICAgICAgICAgIC8vICAgICB9KTtcclxuICAgICAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBlbHNlIGlmICh0eXBlRnJvbSBpbnN0YW5jZW9mIE51bGxUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBuZXdUeXBlOiB0eXBlVG9cclxuICAgICAgICAgICAgICAgIC8vICAgICB9KTtcclxuICAgICAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlzQXNzaWduYWJsZTogdHlwZUZyb20xLmlzQXNzaWduYWJsZSxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlVG9cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZUZyb20gaW5zdGFuY2VvZiBVbmJveGFibGVLbGFzcykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgdW5ib3hhYmxlQXMgb2YgdHlwZUZyb20udW5ib3hhYmxlQXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodW5ib3hhYmxlQXMuY2FuQ2FzdFRvKHR5cGVUbykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoQ2FzdFRvU3RhdGVtZW50KHR5cGVGcm9tLCB1bmJveGFibGVBcywgbm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaENhc3RUb1N0YXRlbWVudCh1bmJveGFibGVBcywgdHlwZVRvLCBub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICgodHlwZUZyb20gaW5zdGFuY2VvZiBLbGFzcyB8fCB0eXBlRnJvbSBpbnN0YW5jZW9mIEludGVyZmFjZSkgJiYgKHR5cGVUbyBpbnN0YW5jZW9mIEtsYXNzIHx8IHR5cGVUbyBpbnN0YW5jZW9mIEludGVyZmFjZSkpXHJcblxyXG4gICAgICAgICAgICAvLyBpZiAodHlwZUZyb20gaW5zdGFuY2VvZiBLbGFzcyAmJlxyXG4gICAgICAgICAgICAvLyAgICAgKHR5cGVUbyBpbnN0YW5jZW9mIEtsYXNzICYmICF0eXBlRnJvbS5oYXNBbmNlc3Rvck9ySXModHlwZVRvKSAmJiB0eXBlVG8uaGFzQW5jZXN0b3JPcklzKHR5cGVGcm9tKSkgfHxcclxuICAgICAgICAgICAgLy8gICAgICh0eXBlVG8gaW5zdGFuY2VvZiBJbnRlcmZhY2UgJiYgISg8S2xhc3M+dHlwZUZyb20pLmltcGxlbWVudHNJbnRlcmZhY2UodHlwZVRvKSkpIFxyXG4gICAgICAgICAgICB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNoZWNrQ2FzdCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeXBlOiB0eXBlVG8sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IHR5cGVGcm9tMS5pc0Fzc2lnbmFibGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZVRvXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgRGF0ZW50eXAgXCIgKyB0eXBlRnJvbS5pZGVudGlmaWVyICsgXCIga2FubiAoenVtaW5kZXN0IGR1cmNoIGNhc3RpbmcpIG5pY2h0IGluIGRlbiBEYXRlbnR5cCBcIiArIHR5cGVUby5pZGVudGlmaWVyICsgXCIgdW1nZXdhbmRlbHQgd2VyZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHB1c2hDYXN0VG9TdGF0ZW1lbnQodHlwZUZyb206IFR5cGUsIHR5cGVUbzogVHlwZSwgbm9kZTogQ2FzdE1hbnVhbGx5Tm9kZSkge1xyXG4gICAgICAgIGxldCBuZWVkc1N0YXRlbWVudDogYm9vbGVhbiA9IHR5cGVGcm9tICE9IHR5cGVUbztcclxuXHJcbiAgICAgICAgLy8gaWYgKCh0eXBlRnJvbSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpICYmIHR5cGVUbyBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAvLyAgICAgbGV0IGNhc3RJbmZvID0gdHlwZUZyb20uZ2V0Q2FzdEluZm9ybWF0aW9uKHR5cGVUbyk7XHJcbiAgICAgICAgLy8gICAgIGlmICghY2FzdEluZm8ubmVlZHNTdGF0ZW1lbnQpIG5lZWRzU3RhdGVtZW50ID0gZmFsc2U7XHJcbiAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICBpZiAobmVlZHNTdGF0ZW1lbnQpIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FzdFZhbHVlLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgbmV3VHlwZTogdHlwZVRvXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NQcmludChub2RlOiBQcmludE5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgdHlwZSA9IG5vZGUudHlwZSA9PSBUb2tlblR5cGUua2V5d29yZFByaW50ID8gVG9rZW5UeXBlLnByaW50IDogVG9rZW5UeXBlLnByaW50bG47XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlLnB1c2hNZXRob2RDYWxsUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgbm9kZS5jb21tYVBvc2l0aW9ucywgVG9rZW5UeXBlUmVhZGFibGVbbm9kZS50eXBlXSwgbm9kZS5yaWdodEJyYWNrZXRQb3NpdGlvbik7XHJcblxyXG4gICAgICAgIGlmIChub2RlLnRleHQgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUudGV4dCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZW5zdXJlQXV0b21hdGljVG9TdHJpbmcodHlwZS50eXBlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIE1ldGhvZGVuIHByaW50IHVuZCBwcmludGxuIGVyd2FydGVuIGVpbmVuIFBhcmFtZXRlciB2b20gVHlwIFN0cmluZy4gR2VmdW5kZW4gd3VyZGUgZWluIFdlcnQgdm9tIFR5cCBcIiArIHR5cGUudHlwZT8uaWRlbnRpZmllciArIFwiLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB3aXRoQ29sb3I6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUuY29sb3IgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuY29sb3IpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGUudHlwZSAhPSBzdHJpbmdQcmltaXRpdmVUeXBlICYmIHR5cGUudHlwZSAhPSBpbnRQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmVuc3VyZUF1dG9tYXRpY0Nhc3RpbmcodHlwZS50eXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBNZXRob2RlbiBwcmludCB1bmQgcHJpbnRsbiBlcndhcnRlbiBhbHMgRmFyYmUgZWluZW4gUGFyYW1ldGVyIHZvbSBUeXAgU3RyaW5nIG9kZXIgaW50LiBHZWZ1bmRlbiB3dXJkZSBlaW4gV2VydCB2b20gVHlwIFwiICsgdHlwZS50eXBlLmlkZW50aWZpZXIgKyBcIi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB3aXRoQ29sb3IgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgZW1wdHk6IChub2RlLnRleHQgPT0gbnVsbCksXHJcbiAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgd2l0aENvbG9yOiB3aXRoQ29sb3JcclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NOZXdBcnJheShub2RlOiBOZXdBcnJheU5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBpZiAobm9kZS5pbml0aWFsaXphdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NBcnJheUxpdGVyYWwobm9kZS5pbml0aWFsaXphdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpbnRbN11bMl1bXSBhcmUgNyBhcnJheXMgZWFjaCB3aXRoIGFycmF5cyBvZiBsZW5ndGggMiB3aGljaCBhcmUgZW1wdHlcclxuXHJcbiAgICAgICAgbGV0IGRpbWVuc2lvbiA9IDA7XHJcbiAgICAgICAgZm9yIChsZXQgZWMgb2Ygbm9kZS5lbGVtZW50Q291bnQpIHtcclxuICAgICAgICAgICAgaWYgKGVjICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc05vZGUoZWMpOyAvLyBwdXNoIG51bWJlciBvZiBlbGVtZW50cyBmb3IgdGhpcyBkaW1lbnNpb24gb24gc3RhY2tcclxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbisrO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGZvciB0aGUgYXJyYXkgYWJvdmU6IGFycmF5VHlwZSBpcyBhcnJheSBvZiBhcnJheSBvZiBpbnQ7IGRpbWVuc2lvbiBpcyAyOyBzdGFjazogNyAyXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoRW1wdHlBcnJheSxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgIGFycmF5VHlwZTogbm9kZS5hcnJheVR5cGUucmVzb2x2ZWRUeXBlLFxyXG4gICAgICAgICAgICBkaW1lbnNpb246IGRpbWVuc2lvblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpc0Fzc2lnbmFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICB0eXBlOiBub2RlLmFycmF5VHlwZS5yZXNvbHZlZFR5cGVcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwcm9jZXNzQXJyYXlMaXRlcmFsKG5vZGU6IEFycmF5SW5pdGlhbGl6YXRpb25Ob2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IGJlczogQmVnaW5BcnJheVN0YXRlbWVudCA9IHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmJlZ2luQXJyYXksXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBhcnJheVR5cGU6IG5vZGUuYXJyYXlUeXBlLnJlc29sdmVkVHlwZVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoYmVzKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgYWluIG9mIG5vZGUubm9kZXMpIHtcclxuXHJcbiAgICAgICAgICAgIC8vIERpZCBhbiBlcnJvciBvY2N1ciB3aGVuIHBhcnNpbmcgYSBjb25zdGFudD9cclxuICAgICAgICAgICAgaWYgKGFpbiA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGFpbi50eXBlID09IFRva2VuVHlwZS5hcnJheUluaXRpYWxpemF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NBcnJheUxpdGVyYWwoYWluKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCBzVHlwZSA9IHRoaXMucHJvY2Vzc05vZGUoYWluKTtcclxuICAgICAgICAgICAgICAgIGlmIChzVHlwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IHRhcmdldFR5cGUgPSAoPEFycmF5VHlwZT5ub2RlLmFycmF5VHlwZS5yZXNvbHZlZFR5cGUpLmFycmF5T2ZUeXBlO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmVuc3VyZUF1dG9tYXRpY0Nhc3Rpbmcoc1R5cGUudHlwZSwgdGFyZ2V0VHlwZSwgYWluLnBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIERhdGVudHlwIGRlcyBUZXJtcyAoXCIgKyBzVHlwZS50eXBlPy5pZGVudGlmaWVyICsgXCIpIGthbm4gbmljaHQgaW4gZGVuIERhdGVudHlwIFwiICsgdGFyZ2V0VHlwZT8uaWRlbnRpZmllciArIFwiIGtvbnZlcnRpZXJ0IHdlcmRlbi5cIiwgYWluLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuYWRkVG9BcnJheSxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgIG51bWJlck9mRWxlbWVudHNUb0FkZDogbm9kZS5ub2Rlcy5sZW5ndGhcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgdHlwZTogbm9kZS5hcnJheVR5cGUucmVzb2x2ZWRUeXBlXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBsb2NhbFZhcmlhYmxlRGVjbGFyYXRpb24obm9kZTogTG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uTm9kZSwgZG9udFdhcm5XaGVuTm9Jbml0aWFsaXphdGlvbjogYm9vbGVhbiA9IGZhbHNlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUudmFyaWFibGVUeXBlLnJlc29sdmVkVHlwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIG5vZGUudmFyaWFibGVUeXBlLnJlc29sdmVkVHlwZSA9IG51bGxUeXBlOyAvLyBNYWtlIHRoZSBiZXN0IG91dCBvZiBpdC4uLlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGRlY2xhcmVWYXJpYWJsZU9uSGVhcCA9ICh0aGlzLmhlYXAgIT0gbnVsbCAmJiB0aGlzLnN5bWJvbFRhYmxlU3RhY2subGVuZ3RoIDw9IDIpO1xyXG5cclxuICAgICAgICBsZXQgdmFyaWFibGU6IFZhcmlhYmxlID0ge1xyXG4gICAgICAgICAgICBpZGVudGlmaWVyOiBub2RlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgIHN0YWNrUG9zOiBkZWNsYXJlVmFyaWFibGVPbkhlYXAgPyBudWxsIDogdGhpcy5uZXh0RnJlZVJlbGF0aXZlU3RhY2tQb3MrKyxcclxuICAgICAgICAgICAgdHlwZTogbm9kZS52YXJpYWJsZVR5cGUucmVzb2x2ZWRUeXBlLFxyXG4gICAgICAgICAgICB1c2FnZVBvc2l0aW9uczogbmV3IE1hcCgpLFxyXG4gICAgICAgICAgICBkZWNsYXJhdGlvbjogeyBtb2R1bGU6IHRoaXMubW9kdWxlLCBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbiB9LFxyXG4gICAgICAgICAgICBpc0ZpbmFsOiBub2RlLmlzRmluYWxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIHZhcmlhYmxlKTtcclxuXHJcbiAgICAgICAgaWYgKGRlY2xhcmVWYXJpYWJsZU9uSGVhcCkge1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuaGVhcFZhcmlhYmxlRGVjbGFyYXRpb24sXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHB1c2hPblRvcE9mU3RhY2tGb3JJbml0aWFsaXphdGlvbjogbm9kZS5pbml0aWFsaXphdGlvbiAhPSBudWxsLFxyXG4gICAgICAgICAgICAgICAgdmFyaWFibGU6IHZhcmlhYmxlLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBub2RlLmluaXRpYWxpemF0aW9uID09IG51bGxcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5oZWFwW3ZhcmlhYmxlLmlkZW50aWZpZXJdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBWYXJpYWJsZSBcIiArIG5vZGUuaWRlbnRpZmllciArIFwiIGRhcmYgaW0gc2VsYmVuIFNpY2h0YmFya2VpdHNiZXJlaWNoIChTY29wZSkgbmljaHQgbWVocm1hbHMgZGVmaW5pZXJ0IHdlcmRlbi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuaGVhcFt2YXJpYWJsZS5pZGVudGlmaWVyXSA9IHZhcmlhYmxlO1xyXG4gICAgICAgICAgICAvLyBvbmx5IGZvciBjb2RlIGNvbXBsZXRpb246XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLnZhcmlhYmxlTWFwLnNldChub2RlLmlkZW50aWZpZXIsIHZhcmlhYmxlKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS52YXJpYWJsZU1hcC5nZXQobm9kZS5pZGVudGlmaWVyKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgVmFyaWFibGUgXCIgKyBub2RlLmlkZW50aWZpZXIgKyBcIiBkYXJmIGltIHNlbGJlbiBTaWNodGJhcmtlaXRzYmVyZWljaCAoU2NvcGUpIG5pY2h0IG1laHJtYWxzIGRlZmluaWVydCB3ZXJkZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS52YXJpYWJsZU1hcC5zZXQobm9kZS5pZGVudGlmaWVyLCB2YXJpYWJsZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5sb2NhbFZhcmlhYmxlRGVjbGFyYXRpb24sXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHB1c2hPblRvcE9mU3RhY2tGb3JJbml0aWFsaXphdGlvbjogbm9kZS5pbml0aWFsaXphdGlvbiAhPSBudWxsLFxyXG4gICAgICAgICAgICAgICAgdmFyaWFibGU6IHZhcmlhYmxlLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBub2RlLmluaXRpYWxpemF0aW9uID09IG51bGxcclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobm9kZS5pbml0aWFsaXphdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCBpbml0VHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5pbml0aWFsaXphdGlvbik7XHJcblxyXG4gICAgICAgICAgICBpZiAoaW5pdFR5cGUgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS50eXBlID09IHZhclR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZS50eXBlID0gaW5pdFR5cGUudHlwZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5pdFR5cGUudHlwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgVHlwIGRlcyBUZXJtcyBhdWYgZGVyIHJlY2h0ZW4gU2VpdGUgZGVzIFp1d2Vpc3VuZ3NvcGVyYXRvcnMgKD0pIGtvbm50ZSBuaWNodCBiZXN0aW1tdCB3ZXJkZW4uXCIsIG5vZGUuaW5pdGlhbGl6YXRpb24ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmVuc3VyZUF1dG9tYXRpY0Nhc3RpbmcoaW5pdFR5cGUudHlwZSwgdmFyaWFibGUudHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgVGVybSB2b20gVHlwIFwiICsgaW5pdFR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIga2FubiBkZXIgVmFyaWFibGUgdm9tIFR5cCBcIiArIHZhcmlhYmxlLnR5cGUuaWRlbnRpZmllciArIFwiIG5pY2h0IHp1Z2VvcmRuZXQgd2VyZGVuLlwiLCBub2RlLmluaXRpYWxpemF0aW9uLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmFzc2lnbm1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUuaW5pdGlhbGl6YXRpb24ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlYXZlVmFsdWVPblN0YWNrOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHZhcmlhYmxlLnR5cGUgPT0gdmFyVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgVmVyd2VuZHVuZyB2b24gdmFyIGlzdCBudXIgZGFubiB6dWzDpHNzaWcsIHdlbm4gZWluZSBsb2thbGUgVmFyaWFibGUgaW4gZWluZXIgQW53ZWlzdW5nIGRla2xhcmllcnQgdW5kIGluaXRpYWxpc2llcnQgd2lyZCwgYWxzbyB6LkIuIHZhciBpID0gMTI7XCIsIG5vZGUudmFyaWFibGVUeXBlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbml0aWFsaXplcjogc3RyaW5nID0gXCIgPSBudWxsXCI7XHJcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFibGUudHlwZSA9PSBpbnRQcmltaXRpdmVUeXBlKSBpbml0aWFsaXplciA9IFwiID0gMFwiO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlLnR5cGUgPT0gZG91YmxlUHJpbWl0aXZlVHlwZSkgaW5pdGlhbGl6ZXIgPSBcIiA9IDAuMFwiO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlLnR5cGUgPT0gYm9vbGVhblByaW1pdGl2ZVR5cGUpIGluaXRpYWxpemVyID0gXCIgPSBmYWxzZVwiO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlLnR5cGUgPT0gY2hhclByaW1pdGl2ZVR5cGUpIGluaXRpYWxpemVyID0gXCIgPSAnICdcIjtcclxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS50eXBlID09IHN0cmluZ1ByaW1pdGl2ZVR5cGUpIGluaXRpYWxpemVyID0gJyA9IFwiXCInO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhcmlhYmxlLmRlY2xhcmF0aW9uRXJyb3IgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJKZWRlIGxva2FsZSBWYXJpYWJsZSBzb2xsdGUgdm9yIGlocmVyIGVyc3RlbiBWZXJ3ZW5kdW5nIGluaXRpYWxpc2llcnQgd2VyZGVuLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1aWNrRml4OlxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGluaXRpYWxpemVyICsgXCIgZXJnw6RuemVuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRzUHJvdmlkZXI6ICh1cmkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3MgPSBub2RlLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiB1cmksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiB7IHN0YXJ0TGluZU51bWJlcjogcG9zLmxpbmUsIHN0YXJ0Q29sdW1uOiBwb3MuY29sdW1uICsgcG9zLmxlbmd0aCwgZW5kTGluZU51bWJlcjogcG9zLmxpbmUsIGVuZENvbHVtbjogcG9zLmNvbHVtbiArIHBvcy5sZW5ndGggfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGluaXRpYWxpemVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGxldmVsOiBcImluZm9cIlxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHZhcmlhYmxlLnVzZWRCZWZvcmVJbml0aWFsaXphdGlvbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdmFyaWFibGUuaW5pdGlhbGl6ZWQgPSBkb250V2FybldoZW5Ob0luaXRpYWxpemF0aW9uO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NSZXR1cm4obm9kZTogUmV0dXJuTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBtZXRob2QgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5tZXRob2Q7XHJcblxyXG4gICAgICAgIGlmIChtZXRob2QgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVpbmUgcmV0dXJuLUFud2Vpc3VuZyBpc3QgbnVyIGltIEtvbnRleHQgZWluZXIgTWV0aG9kZSBlcmxhdWJ0LlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobm9kZS50ZXJtICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChtZXRob2QuZ2V0UmV0dXJuVHlwZSgpID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIE1ldGhvZGUgXCIgKyBtZXRob2QuaWRlbnRpZmllciArIFwiIGVyd2FydGV0IGtlaW5lbiBSw7xja2dhYmV3ZXJ0LlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgdHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS50ZXJtKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKHR5cGUudHlwZSwgbWV0aG9kLmdldFJldHVyblR5cGUoKSwgbnVsbCwgbm9kZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBNZXRob2RlIFwiICsgbWV0aG9kLmlkZW50aWZpZXIgKyBcIiBlcndhcnRldCBlaW5lbiBSw7xja2dhYmV3ZXJ0IHZvbSBUeXAgXCIgKyBtZXRob2QuZ2V0UmV0dXJuVHlwZSgpLmlkZW50aWZpZXIgKyBcIi4gR2VmdW5kZW4gd3VyZGUgZWluIFdlcnQgdm9tIFR5cCBcIiArIHR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIuXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAobWV0aG9kLmdldFJldHVyblR5cGUoKSAhPSBudWxsICYmIG1ldGhvZC5nZXRSZXR1cm5UeXBlKCkgIT0gdm9pZFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIE1ldGhvZGUgXCIgKyBtZXRob2QuaWRlbnRpZmllciArIFwiIGVyd2FydGV0IGVpbmVuIFLDvGNrZ2FiZXdlcnQgdm9tIFR5cCBcIiArIG1ldGhvZC5nZXRSZXR1cm5UeXBlKCkuaWRlbnRpZmllciArIFwiLCBkYWhlciBpc3QgZGllIGxlZXJlIFJldHVybi1BbndlaXN1bmcgKHJldHVybjspIG5pY2h0IGF1c3JlaWNoZW5kLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5yZXR1cm4sXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb3B5UmV0dXJuVmFsdWVUb1N0YWNrZnJhbWVQb3MwOiBub2RlLnRlcm0gIT0gbnVsbCxcclxuICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBsZWF2ZVRoaXNPYmplY3RPblN0YWNrOiBmYWxzZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiBudWxsLCBpc0Fzc2lnbmFibGU6IGZhbHNlLCB3aXRoUmV0dXJuU3RhdGVtZW50OiB0cnVlIH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NTd2l0Y2gobm9kZTogU3dpdGNoTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBsbSA9IHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyO1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZShmYWxzZSwgbm9kZS5zY29wZUZyb20sIG5vZGUuc2NvcGVUbyk7XHJcblxyXG4gICAgICAgIGxldCBjdCA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5jb25kaXRpb24pO1xyXG4gICAgICAgIGlmIChjdCA9PSBudWxsIHx8IGN0LnR5cGUgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgY29uZGl0aW9uVHlwZSA9IGN0LnR5cGU7XHJcblxyXG4gICAgICAgIGxldCBpc1N0cmluZyA9IGNvbmRpdGlvblR5cGUgPT0gc3RyaW5nUHJpbWl0aXZlVHlwZSB8fCBjb25kaXRpb25UeXBlID09IGNoYXJQcmltaXRpdmVUeXBlO1xyXG4gICAgICAgIGxldCBpc0ludGVnZXIgPSBjb25kaXRpb25UeXBlID09IGludFByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgbGV0IGlzRW51bSA9IGNvbmRpdGlvblR5cGUgaW5zdGFuY2VvZiBFbnVtO1xyXG5cclxuICAgICAgICBpZiAoIShpc1N0cmluZyB8fCBpc0ludGVnZXIgfHwgaXNFbnVtKSkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBVbnRlcnNjaGVpZHVuZ3N0ZXJtcyBlaW5lciBzd2l0Y2gtQW53ZWlzdW5nIG11c3MgZGVuIERhdGVudHlwIFN0cmluZywgY2hhciwgaW50IG9kZXIgZW51bSBiZXNpdHplbi4gRGllc2VyIGhpZXIgaXN0IHZvbSBUeXAgXCIgKyBjb25kaXRpb25UeXBlLmlkZW50aWZpZXIsIG5vZGUuY29uZGl0aW9uLnBvc2l0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpc0VudW0pIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FzdFZhbHVlLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUuY29uZGl0aW9uLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgbmV3VHlwZTogaW50UHJpbWl0aXZlVHlwZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzd2l0Y2hTdGF0ZW1lbnQ6IEp1bXBPblN3aXRjaFN0YXRlbWVudCA9IHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmtleXdvcmRTd2l0Y2gsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBkZWZhdWx0RGVzdGluYXRpb246IG51bGwsXHJcbiAgICAgICAgICAgIHN3aXRjaFR5cGU6IGlzU3RyaW5nID8gXCJzdHJpbmdcIiA6IFwibnVtYmVyXCIsXHJcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uTGFiZWxzOiBbXSxcclxuICAgICAgICAgICAgZGVzdGluYXRpb25NYXA6IHt9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHN3aXRjaFN0YXRlbWVudCk7XHJcblxyXG4gICAgICAgIC8vIGlmIHZhbHVlIG5vdCBpbmNsdWRlZCBpbiBjYXNlLXN0YXRlbWVudCBhbmQgbm8gZGVmYXVsdC1zdGF0ZW1lbnQgcHJlc2VudDpcclxuICAgICAgICBsZXQgZW5kTGFiZWwgPSBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcEFsd2F5cywgbm9kZS5wb3NpdGlvbiwgdGhpcyk7XHJcblxyXG4gICAgICAgIHN3aXRjaFN0YXRlbWVudC5zdGVwRmluaXNoZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICBsbS5yZWdpc3RlclN3aXRjaFN0YXRlbWVudChzd2l0Y2hTdGF0ZW1lbnQpO1xyXG5cclxuICAgICAgICB0aGlzLm9wZW5CcmVha1Njb3BlKCk7XHJcblxyXG4gICAgICAgIGxldCB3aXRoUmV0dXJuU3RhdGVtZW50ID0gbm9kZS5jYXNlTm9kZXMubGVuZ3RoID4gMDtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY2FzZU5vZGUgb2Ygbm9kZS5jYXNlTm9kZXMpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBpc0RlZmF1bHQgPSBjYXNlTm9kZS5jYXNlVGVybSA9PSBudWxsO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFpc0RlZmF1bHQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY29uc3RhbnQ6IHN0cmluZyB8IG51bWJlciA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGlzRW51bSAmJiBjYXNlTm9kZS5jYXNlVGVybS50eXBlID09IFRva2VuVHlwZS5pZGVudGlmaWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVuOiBFbnVtID0gPEVudW0+Y29uZGl0aW9uVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW5mbyA9IGVuLmlkZW50aWZpZXJUb0luZm9NYXBbY2FzZU5vZGUuY2FzZVRlcm0uaWRlbnRpZmllcl07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZm8gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBFbnVtLUtsYXNzZSBcIiArIGNvbmRpdGlvblR5cGUuaWRlbnRpZmllciArIFwiIGhhdCBrZWluIEVsZW1lbnQgbWl0IGRlbSBCZXplaWNobmVyIFwiICsgY2FzZU5vZGUuY2FzZVRlcm0uaWRlbnRpZmllciwgY2FzZU5vZGUucG9zaXRpb24sIFwiZXJyb3JcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RhbnQgPSBpbmZvLm9yZGluYWw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY2FzZVRlcm0gPSB0aGlzLnByb2Nlc3NOb2RlKGNhc2VOb2RlLmNhc2VUZXJtKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGxzID0gdGhpcy5sYXN0U3RhdGVtZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobHMudHlwZSA9PSBUb2tlblR5cGUucHVzaENvbnN0YW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0YW50ID0gbHMudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobHMudHlwZSA9PSBUb2tlblR5cGUucHVzaEVudW1WYWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdGFudCA9IGxzLmVudW1DbGFzcy5nZXRPcmRpbmFsKGxzLnZhbHVlSWRlbnRpZmllcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUxhc3RTdGF0ZW1lbnQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoY29uc3RhbnQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFRlcm0gYmVpIGNhc2UgbXVzcyBrb25zdGFudCBzZWluLlwiLCBjYXNlTm9kZS5jYXNlVGVybS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGxhYmVsID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZW1lbnRzID0gdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMoY2FzZU5vZGUuc3RhdGVtZW50cyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlbWVudHM/LndpdGhSZXR1cm5TdGF0ZW1lbnQgPT0gbnVsbCB8fCAhc3RhdGVtZW50cy53aXRoUmV0dXJuU3RhdGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2l0aFJldHVyblN0YXRlbWVudCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHN3aXRjaFN0YXRlbWVudC5kZXN0aW5hdGlvbkxhYmVscy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdGFudDogY29uc3RhbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6IGxhYmVsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQgY2FzZVxyXG4gICAgICAgICAgICAgICAgbGV0IGxhYmVsID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZW1lbnRzID0gdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMoY2FzZU5vZGUuc3RhdGVtZW50cyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGVtZW50cz8ud2l0aFJldHVyblN0YXRlbWVudCA9PSBudWxsIHx8ICFzdGF0ZW1lbnRzLndpdGhSZXR1cm5TdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB3aXRoUmV0dXJuU3RhdGVtZW50ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2hTdGF0ZW1lbnQuZGVmYXVsdERlc3RpbmF0aW9uID0gbGFiZWw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3dpdGNoU3RhdGVtZW50LmRlZmF1bHREZXN0aW5hdGlvbiA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSwgZW5kTGFiZWwpO1xyXG5cclxuICAgICAgICB0aGlzLmNsb3NlQnJlYWtTY29wZShlbmRMYWJlbCwgbG0pO1xyXG5cclxuICAgICAgICB0aGlzLnBvcFN5bWJvbFRhYmxlKG51bGwpO1xyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiBudWxsLCBpc0Fzc2lnbmFibGU6IGZhbHNlLCB3aXRoUmV0dXJuU3RhdGVtZW50OiB3aXRoUmV0dXJuU3RhdGVtZW50IH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc0lmKG5vZGU6IElmTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBsbSA9IHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyO1xyXG5cclxuICAgICAgICBsZXQgY29uZGl0aW9uVHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5jb25kaXRpb24pO1xyXG5cclxuICAgICAgICB0aGlzLmNoZWNrSWZBc3NpZ25tZW50SW5zdGVkT2ZFcXVhbChub2RlLmNvbmRpdGlvbiwgY29uZGl0aW9uVHlwZT8udHlwZSk7XHJcbiAgICAgICAgaWYgKGNvbmRpdGlvblR5cGUgIT0gbnVsbCAmJiBjb25kaXRpb25UeXBlLnR5cGUgIT0gYm9vbGVhblByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgV2VydCBkZXMgVGVybXMgaW4gS2xhbW1lcm4gaGludGVyICdpZicgbXVzcyBkZW4gRGF0ZW50eXAgYm9vbGVhbiBiZXNpdHplbi5cIiwgbm9kZS5jb25kaXRpb24ucG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGJlZ2luRWxzZSA9IGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wSWZGYWxzZSwgbnVsbCwgdGhpcyk7XHJcblxyXG4gICAgICAgIGxldCB3aXRoUmV0dXJuU3RhdGVtZW50SWYgPSB0aGlzLmdlbmVyYXRlU3RhdGVtZW50cyhub2RlLnN0YXRlbWVudHNJZlRydWUpLndpdGhSZXR1cm5TdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgIGxldCBlbmRPZklmOiBudW1iZXI7XHJcbiAgICAgICAgaWYgKG5vZGUuc3RhdGVtZW50c0lmRmFsc2UgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBlbmRPZklmID0gbG0uaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBBbHdheXMsIG51bGwsIHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxLCBiZWdpbkVsc2UpO1xyXG5cclxuICAgICAgICBsZXQgd2l0aFJldHVyblN0YXRlbWVudEVsc2U6IGJvb2xlYW47XHJcbiAgICAgICAgaWYgKG5vZGUuc3RhdGVtZW50c0lmRmFsc2UgPT0gbnVsbCB8fCBub2RlLnN0YXRlbWVudHNJZkZhbHNlLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHdpdGhSZXR1cm5TdGF0ZW1lbnRFbHNlID0gZmFsc2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgd2l0aFJldHVyblN0YXRlbWVudEVsc2UgPSB0aGlzLmdlbmVyYXRlU3RhdGVtZW50cyhub2RlLnN0YXRlbWVudHNJZkZhbHNlKS53aXRoUmV0dXJuU3RhdGVtZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGVuZE9mSWYgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEsIGVuZE9mSWYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgd2l0aFJldHVyblN0YXRlbWVudDogd2l0aFJldHVyblN0YXRlbWVudElmICYmIHdpdGhSZXR1cm5TdGF0ZW1lbnRFbHNlIH07XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwcm9jZXNzRm9yKG5vZGU6IEZvck5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgbG0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlcjtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIG5vZGUuc2NvcGVGcm9tLCBub2RlLnNjb3BlVG8pO1xyXG5cclxuICAgICAgICB0aGlzLmdlbmVyYXRlU3RhdGVtZW50cyhub2RlLnN0YXRlbWVudHNCZWZvcmUpO1xyXG5cclxuICAgICAgICBsZXQgbGFiZWxCZWZvcmVDb25kaXRpb24gPSBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEpO1xyXG5cclxuICAgICAgICBsZXQgY29uZGl0aW9uVHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5jb25kaXRpb24pO1xyXG5cclxuICAgICAgICBpZiAoY29uZGl0aW9uVHlwZSAhPSBudWxsICYmIGNvbmRpdGlvblR5cGUudHlwZSAhPSBib29sZWFuUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICB0aGlzLmNoZWNrSWZBc3NpZ25tZW50SW5zdGVkT2ZFcXVhbChub2RlLmNvbmRpdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFdlcnQgZGVyIEJlZGluZ3VuZyBtdXNzIGRlbiBEYXRlbnR5cCBib29sZWFuIGJlc2l0emVuLlwiLCBub2RlLmNvbmRpdGlvbi5wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbGFiZWxBZnRlckZvckxvb3AgPSBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmRmFsc2UsIG51bGwsIHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLm9wZW5CcmVha1Njb3BlKCk7XHJcbiAgICAgICAgdGhpcy5vcGVuQ29udGludWVTY29wZSgpO1xyXG5cclxuICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKG5vZGUuc3RhdGVtZW50cyk7XHJcbiAgICAgICAgbGV0IHdpdGhSZXR1cm5TdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzLndpdGhSZXR1cm5TdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgIGxldCBjb250aW51ZUxhYmVsSW5kZXggPSBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEpO1xyXG4gICAgICAgIHRoaXMuY2xvc2VDb250aW51ZVNjb3BlKGNvbnRpbnVlTGFiZWxJbmRleCwgbG0pO1xyXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVTdGF0ZW1lbnRzKG5vZGUuc3RhdGVtZW50c0FmdGVyKTtcclxuXHJcbiAgICAgICAgbG0uaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBBbHdheXMsIHN0YXRlbWVudHMuZW5kUG9zaXRpb24sIHRoaXMsIGxhYmVsQmVmb3JlQ29uZGl0aW9uKTtcclxuXHJcbiAgICAgICAgbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxLCBsYWJlbEFmdGVyRm9yTG9vcCk7XHJcblxyXG4gICAgICAgIHRoaXMuY2xvc2VCcmVha1Njb3BlKGxhYmVsQWZ0ZXJGb3JMb29wLCBsbSk7XHJcblxyXG4gICAgICAgIHRoaXMucG9wU3ltYm9sVGFibGUoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSwgd2l0aFJldHVyblN0YXRlbWVudDogd2l0aFJldHVyblN0YXRlbWVudCB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzRm9yTG9vcE92ZXJDb2xsZWN0aW9uKG5vZGU6IEZvck5vZGVPdmVyQ29sbGVjaW9uKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IGxtID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXI7XHJcblxyXG4gICAgICAgIHRoaXMucHVzaE5ld1N5bWJvbFRhYmxlKGZhbHNlLCBub2RlLnNjb3BlRnJvbSwgbm9kZS5zY29wZVRvKTtcclxuXHJcbiAgICAgICAgLy8gcmVzZXJ2ZSBwb3NpdGlvbiBvbiBzdGFjayBmb3IgY29sbGVjdGlvblxyXG4gICAgICAgIGxldCBzdGFja1Bvc0ZvckNvbGxlY3Rpb24gPSB0aGlzLm5leHRGcmVlUmVsYXRpdmVTdGFja1BvcysrO1xyXG5cclxuICAgICAgICAvLyBhc3NpZ24gdmFsdWUgb2YgY29sbGVjdGlvbiB0ZXJtIHRvIGNvbGxlY3Rpb25cclxuICAgICAgICBsZXQgY3QgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuY29sbGVjdGlvbik7XHJcbiAgICAgICAgaWYgKGN0ID09IG51bGwpIHJldHVybjtcclxuICAgICAgICBsZXQgY29sbGVjdGlvblR5cGUgPSBjdC50eXBlO1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnBvcEFuZFN0b3JlSW50b1ZhcmlhYmxlLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5jb2xsZWN0aW9uLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICBzdGFja3Bvc09mVmFyaWFibGU6IHN0YWNrUG9zRm9yQ29sbGVjdGlvbixcclxuICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGxldCBjb2xsZWN0aW9uRWxlbWVudFR5cGU6IFR5cGU7XHJcblxyXG4gICAgICAgIGxldCBraW5kOiBcImFycmF5XCIgfCBcImludGVybmFsTGlzdFwiIHwgXCJncm91cFwiIHwgXCJ1c2VyRGVmaW5lZEl0ZXJhYmxlXCIgPSBudWxsO1xyXG5cclxuICAgICAgICBpZiAoY29sbGVjdGlvblR5cGUgaW5zdGFuY2VvZiBBcnJheVR5cGUpIHtcclxuICAgICAgICAgICAgY29sbGVjdGlvbkVsZW1lbnRUeXBlID0gY29sbGVjdGlvblR5cGUuYXJyYXlPZlR5cGU7XHJcbiAgICAgICAgICAgIGtpbmQgPSBcImFycmF5XCI7XHJcbiAgICAgICAgfSBlbHNlIGlmIChjb2xsZWN0aW9uVHlwZSBpbnN0YW5jZW9mIEtsYXNzICYmIGNvbGxlY3Rpb25UeXBlLmdldEltcGxlbWVudGVkSW50ZXJmYWNlKFwiSXRlcmFibGVcIikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpZiAoY29sbGVjdGlvblR5cGUubW9kdWxlLmlzU3lzdGVtTW9kdWxlKSB7XHJcbiAgICAgICAgICAgICAgICBraW5kID0gXCJpbnRlcm5hbExpc3RcIjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGtpbmQgPSBcInVzZXJEZWZpbmVkSXRlcmFibGVcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgaXRlcmFibGVJbnRlcmZhY2UgPSBjb2xsZWN0aW9uVHlwZS5nZXRJbXBsZW1lbnRlZEludGVyZmFjZShcIkl0ZXJhYmxlXCIpO1xyXG4gICAgICAgICAgICBpZiAoY29sbGVjdGlvblR5cGUudHlwZVZhcmlhYmxlcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbkVsZW1lbnRUeXBlID0gb2JqZWN0VHlwZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb25FbGVtZW50VHlwZSA9IGNvbGxlY3Rpb25UeXBlLnR5cGVWYXJpYWJsZXNbMF0udHlwZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoY29sbGVjdGlvblR5cGUgaW5zdGFuY2VvZiBLbGFzcyAmJiBjb2xsZWN0aW9uVHlwZS5pZGVudGlmaWVyID09IFwiR3JvdXBcIikge1xyXG4gICAgICAgICAgICBraW5kID0gXCJncm91cFwiO1xyXG4gICAgICAgICAgICBjb2xsZWN0aW9uRWxlbWVudFR5cGUgPSB0aGlzLm1vZHVsZVN0b3JlLmdldFR5cGUoXCJTaGFwZVwiKS50eXBlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJNaXQgZGVyIHZlcmVpbmZhY2h0ZW4gZm9yLVNjaGxlaWZlIChmb3IgaWRlbnRpZmllciA6IGNvbGxlY3Rpb25PckFycmF5KSBrYW5uIG1hbiBudXIgw7xiZXIgQXJyYXlzIG9kZXIgS2xhc3NlbiwgZGllIGRhcyBJbnRlcmZhY2UgSXRlcmFibGUgaW1wbGVtZW50aWVyZW4sIGl0ZXJpZXJlbi5cIiwgbm9kZS5jb2xsZWN0aW9uLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdmFyaWFibGVUeXBlID0gbm9kZS52YXJpYWJsZVR5cGUucmVzb2x2ZWRUeXBlO1xyXG4gICAgICAgIGlmICh2YXJpYWJsZVR5cGUgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGxldCBub0Nhc3RpbmdOZWVkZWQgPSB2YXJpYWJsZVR5cGUgPT0gdmFyVHlwZTtcclxuICAgICAgICBpZiAobm9DYXN0aW5nTmVlZGVkKSB7XHJcbiAgICAgICAgICAgIHZhcmlhYmxlVHlwZSA9IGNvbGxlY3Rpb25FbGVtZW50VHlwZTtcclxuICAgICAgICAgICAgbm9kZS52YXJpYWJsZVR5cGUucmVzb2x2ZWRUeXBlID0gY29sbGVjdGlvbkVsZW1lbnRUeXBlXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKCFjb2xsZWN0aW9uRWxlbWVudFR5cGUuY2FuQ2FzdFRvKHZhcmlhYmxlVHlwZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIEVsZW1lbnRUeXAgXCIgKyBjb2xsZWN0aW9uRWxlbWVudFR5cGUuaWRlbnRpZmllciArIFwiIGRlciBDb2xsZWN0aW9uIGthbm4gbmljaHQgaW4gZGVuIFR5cCBcIiArIHZhcmlhYmxlVHlwZS5pZGVudGlmaWVyICsgXCIgZGVyIEl0ZXJhdGlvbnN2YXJpYWJsZSBcIiArIG5vZGUudmFyaWFibGVJZGVudGlmaWVyICsgXCIga29udmVydGllcnQgd2VyZGVuLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxvY2FsVmFyaWFibGVEZWNsYXJhdGlvbih7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5sb2NhbFZhcmlhYmxlRGVjbGFyYXRpb24sXHJcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IG5vZGUudmFyaWFibGVJZGVudGlmaWVyLFxyXG4gICAgICAgICAgICBpbml0aWFsaXphdGlvbjogbnVsbCxcclxuICAgICAgICAgICAgaXNGaW5hbDogZmFsc2UsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnZhcmlhYmxlUG9zaXRpb24sXHJcbiAgICAgICAgICAgIHZhcmlhYmxlVHlwZTogbm9kZS52YXJpYWJsZVR5cGVcclxuICAgICAgICB9LCB0cnVlKVxyXG5cclxuICAgICAgICBsZXQgdmFyaWFibGVTdGFja1BvcyA9IHRoaXMubmV4dEZyZWVSZWxhdGl2ZVN0YWNrUG9zIC0gMTtcclxuICAgICAgICBsZXQgc3RhY2tQb3NPZkNvdW50ZXJWYXJpYWJsZU9ySXRlcmF0b3IgPSB0aGlzLm5leHRGcmVlUmVsYXRpdmVTdGFja1BvcysrO1xyXG5cclxuICAgICAgICBpZiAoa2luZCA9PSBcImFycmF5XCIgfHwga2luZCA9PSBcImludGVybmFsTGlzdFwiIHx8IGtpbmQgPT0gXCJncm91cFwiKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoW3tcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5leHRlbmRlZEZvckxvb3BJbml0LFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tQb3NPZkNvbGxlY3Rpb246IHN0YWNrUG9zRm9yQ29sbGVjdGlvbixcclxuICAgICAgICAgICAgICAgIHN0YWNrUG9zT2ZFbGVtZW50OiB2YXJpYWJsZVN0YWNrUG9zLFxyXG4gICAgICAgICAgICAgICAgdHlwZU9mRWxlbWVudDogdmFyaWFibGVUeXBlLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tQb3NPZkNvdW50ZXI6IHN0YWNrUG9zT2ZDb3VudGVyVmFyaWFibGVPckl0ZXJhdG9yXHJcbiAgICAgICAgICAgIH1dLCB0cnVlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBnZXQgSXRlcmF0b3IgZnJvbSBjb2xsZWN0aW9uXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiBzdGFja1Bvc09mQ291bnRlclZhcmlhYmxlT3JJdGVyYXRvcixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiBzdGFja1Bvc0ZvckNvbGxlY3Rpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzU3VwZXJDYWxsOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IGNvbGxlY3Rpb25UeXBlLmdldE1ldGhvZChcIml0ZXJhdG9yXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtdKSksXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tmcmFtZUJlZ2luOiAtMVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuYXNzaWdubWVudCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVhdmVWYWx1ZU9uU3RhY2s6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XSwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbGFiZWxCZWZvcmVDb25kaXRpb24gPSBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEpO1xyXG4gICAgICAgIGxldCBsYWJlbEFmdGVyRm9yTG9vcDogbnVtYmVyO1xyXG4gICAgICAgIGxldCBsYXN0U3RhdGVtZW50QmVmb3JlQ2FzdGluZzogU3RhdGVtZW50O1xyXG5cclxuICAgICAgICBpZiAoa2luZCA9PSBcImFycmF5XCIgfHwga2luZCA9PSBcImludGVybmFsTGlzdFwiIHx8IGtpbmQgPT0gXCJncm91cFwiKSB7XHJcbiAgICAgICAgICAgIGxldCBqdW1wTm9kZTogRXh0ZW5kZWRGb3JMb29wQ2hlY2tDb3VudGVyQW5kR2V0RWxlbWVudCA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5leHRlbmRlZEZvckxvb3BDaGVja0NvdW50ZXJBbmRHZXRFbGVtZW50LFxyXG4gICAgICAgICAgICAgICAga2luZDoga2luZCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnZhcmlhYmxlUG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzdGFja1Bvc09mQ29sbGVjdGlvbjogc3RhY2tQb3NGb3JDb2xsZWN0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tQb3NPZkVsZW1lbnQ6IHZhcmlhYmxlU3RhY2tQb3MsXHJcbiAgICAgICAgICAgICAgICBzdGFja1Bvc09mQ291bnRlcjogc3RhY2tQb3NPZkNvdW50ZXJWYXJpYWJsZU9ySXRlcmF0b3IsXHJcbiAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbjogMCAvLyBnZXRzIGZpbGxlZCBpbiBsYXRlcixcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgbGFzdFN0YXRlbWVudEJlZm9yZUNhc3RpbmcgPSBqdW1wTm9kZTtcclxuICAgICAgICAgICAgbGFiZWxBZnRlckZvckxvb3AgPSBsbS5yZWdpc3Rlckp1bXBOb2RlKGp1bXBOb2RlKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoXHJcbiAgICAgICAgICAgICAgICBqdW1wTm9kZVxyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBjYWxsIGNvbGxlY3Rpb24uaGFzTmV4dCgpXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUudmFyaWFibGVQb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGFja3Bvc09mVmFyaWFibGU6IHN0YWNrUG9zRm9yQ29sbGVjdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNTdXBlckNhbGw6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogY29sbGVjdGlvblR5cGUuZ2V0TWV0aG9kKFwiaGFzTmV4dFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXSkpLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLTFcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF0pO1xyXG4gICAgICAgICAgICBsYWJlbEFmdGVyRm9yTG9vcCA9IGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wSWZGYWxzZSwgbnVsbCwgdGhpcyk7XHJcbiAgICAgICAgICAgIC8vIGNhbGwgY29sbGVjdGlvbi5uZXh0KCkgYW5kIGFzc2lnbiB0byBsb29wIHZhcmlhYmxlXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiB2YXJpYWJsZVN0YWNrUG9zLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hMb2NhbFZhcmlhYmxlVG9TdGFjayxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGFja3Bvc09mVmFyaWFibGU6IHN0YWNrUG9zRm9yQ29sbGVjdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNTdXBlckNhbGw6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogY29sbGVjdGlvblR5cGUuZ2V0TWV0aG9kKFwibmV4dFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXSkpLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLTFcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmFzc2lnbm1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlYXZlVmFsdWVPblN0YWNrOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfV0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFub0Nhc3RpbmdOZWVkZWQpIHtcclxuICAgICAgICAgICAgbGV0IG9sZFN0YXRlbWVudENvdW50ID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aDtcclxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzdGFja3Bvc09mVmFyaWFibGU6IHZhcmlhYmxlU3RhY2tQb3MsXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmVuc3VyZUF1dG9tYXRpY0Nhc3RpbmcoY29sbGVjdGlvbkVsZW1lbnRUeXBlLCB2YXJpYWJsZVR5cGUpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aCA8IG9sZFN0YXRlbWVudENvdW50ICsgMikge1xyXG4gICAgICAgICAgICAgICAgLy8gY2FzdGluZyBuZWVkZWQgbm8gc3RhdGVtZW50LCBzbyBkZWxldGUgcHVzaExvY2FsVmFyaWFibGV0b1N0YWNrLVN0YXRlbWVudFxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLnBvcCgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnBvcEFuZFN0b3JlSW50b1ZhcmlhYmxlLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogdmFyaWFibGVTdGFja1BvcyxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbGFzdFN0YXRlbWVudEJlZm9yZUNhc3Rpbmcuc3RlcEZpbmlzaGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMub3BlbkJyZWFrU2NvcGUoKTtcclxuICAgICAgICB0aGlzLm9wZW5Db250aW51ZVNjb3BlKCk7XHJcblxyXG4gICAgICAgIGxldCBzdGF0ZW1lbnRzID0gdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMobm9kZS5zdGF0ZW1lbnRzKTtcclxuICAgICAgICBsZXQgd2l0aFJldHVyblN0YXRlbWVudCA9IHN0YXRlbWVudHMud2l0aFJldHVyblN0YXRlbWVudDtcclxuXHJcbiAgICAgICAgbGV0IGNvbnRpbnVlTGFiZWxJbmRleCA9IGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSk7XHJcbiAgICAgICAgdGhpcy5jbG9zZUNvbnRpbnVlU2NvcGUoY29udGludWVMYWJlbEluZGV4LCBsbSk7XHJcblxyXG4gICAgICAgIGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wQWx3YXlzLCBzdGF0ZW1lbnRzLmVuZFBvc2l0aW9uLCB0aGlzLCBsYWJlbEJlZm9yZUNvbmRpdGlvbik7XHJcblxyXG4gICAgICAgIGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSwgbGFiZWxBZnRlckZvckxvb3ApO1xyXG5cclxuICAgICAgICB0aGlzLmNsb3NlQnJlYWtTY29wZShsYWJlbEFmdGVyRm9yTG9vcCwgbG0pO1xyXG5cclxuICAgICAgICB0aGlzLnBvcFN5bWJvbFRhYmxlKCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IG51bGwsIGlzQXNzaWduYWJsZTogZmFsc2UsIHdpdGhSZXR1cm5TdGF0ZW1lbnQ6IHdpdGhSZXR1cm5TdGF0ZW1lbnQgfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc1doaWxlKG5vZGU6IFdoaWxlTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBsbSA9IHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyO1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hOZXdTeW1ib2xUYWJsZShmYWxzZSwgbm9kZS5zY29wZUZyb20sIG5vZGUuc2NvcGVUbyk7XHJcblxyXG4gICAgICAgIGxldCBjb25kaXRpb25CZWdpbkxhYmVsID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuXHJcbiAgICAgICAgbGV0IGNvbmRpdGlvblR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuY29uZGl0aW9uKTtcclxuXHJcbiAgICAgICAgaWYgKGNvbmRpdGlvblR5cGUgIT0gbnVsbCAmJiBjb25kaXRpb25UeXBlLnR5cGUgIT0gYm9vbGVhblByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZS5jb25kaXRpb24pO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBXZXJ0IGRlcyBUZXJtcyBpbiBLbGFtbWVybiBoaW50ZXIgJ3doaWxlJyBtdXNzIGRlbiBEYXRlbnR5cCBib29sZWFuIGJlc2l0emVuLlwiLCBub2RlLmNvbmRpdGlvbi5wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcG9zaXRpb24gPSBub2RlLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICBpZiAobm9kZS5jb25kaXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbiA9IG5vZGUuY29uZGl0aW9uLnBvc2l0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGFmdGVyV2hpbGVTdGF0ZW1lbnRMYWJlbCA9IGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wSWZGYWxzZSwgcG9zaXRpb24sIHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLm9wZW5CcmVha1Njb3BlKCk7XHJcbiAgICAgICAgdGhpcy5vcGVuQ29udGludWVTY29wZSgpO1xyXG5cclxuICAgICAgICBsZXQgcGMgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoO1xyXG4gICAgICAgIGxldCBzdGF0ZW1lbnRzID0gdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMobm9kZS5zdGF0ZW1lbnRzKTtcclxuICAgICAgICBsZXQgd2l0aFJldHVyblN0YXRlbWVudCA9IHN0YXRlbWVudHMud2l0aFJldHVyblN0YXRlbWVudDtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPT0gcGMpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnNlcnROb09wKG5vZGUuc2NvcGVUbywgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jbG9zZUNvbnRpbnVlU2NvcGUoY29uZGl0aW9uQmVnaW5MYWJlbCwgbG0pO1xyXG4gICAgICAgIGxtLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wQWx3YXlzLCBzdGF0ZW1lbnRzLmVuZFBvc2l0aW9uLCB0aGlzLCBjb25kaXRpb25CZWdpbkxhYmVsKTtcclxuXHJcbiAgICAgICAgbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxLCBhZnRlcldoaWxlU3RhdGVtZW50TGFiZWwpO1xyXG5cclxuICAgICAgICB0aGlzLmNsb3NlQnJlYWtTY29wZShhZnRlcldoaWxlU3RhdGVtZW50TGFiZWwsIGxtKTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZSgpO1xyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiBudWxsLCBpc0Fzc2lnbmFibGU6IGZhbHNlLCB3aXRoUmV0dXJuU3RhdGVtZW50OiB3aXRoUmV0dXJuU3RhdGVtZW50IH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGluc2VydE5vT3AocG9zaXRpb246IFRleHRQb3NpdGlvbiwgc3RlcEZpbmlzaGVkOiBib29sZWFuKSB7XHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5ub09wLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogc3RlcEZpbmlzaGVkXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzRG8obm9kZTogRG9XaGlsZU5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgbG0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlcjtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoTmV3U3ltYm9sVGFibGUoZmFsc2UsIG5vZGUuc2NvcGVGcm9tLCBub2RlLnNjb3BlVG8pO1xyXG5cclxuICAgICAgICBsZXQgc3RhdGVtZW50c0JlZ2luTGFiZWwgPSBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEpO1xyXG5cclxuICAgICAgICB0aGlzLm9wZW5CcmVha1Njb3BlKCk7XHJcbiAgICAgICAgdGhpcy5vcGVuQ29udGludWVTY29wZSgpO1xyXG5cclxuICAgICAgICBsZXQgcGMgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoO1xyXG4gICAgICAgIGxldCBzdGF0ZW1lbnRzID0gdGhpcy5nZW5lcmF0ZVN0YXRlbWVudHMobm9kZS5zdGF0ZW1lbnRzKTtcclxuICAgICAgICBsZXQgd2l0aFJldHVyblN0YXRlbWVudCA9IHN0YXRlbWVudHMud2l0aFJldHVyblN0YXRlbWVudDtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPT0gcGMpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnNlcnROb09wKG5vZGUuc2NvcGVUbywgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGNvbnRpbnVlTGFiZWxJbmRleCA9IGxtLm1hcmtKdW1wRGVzdGluYXRpb24oMSk7XHJcbiAgICAgICAgdGhpcy5jbG9zZUNvbnRpbnVlU2NvcGUoY29udGludWVMYWJlbEluZGV4LCBsbSk7XHJcblxyXG4gICAgICAgIGxldCBjb25kaXRpb25UeXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLmNvbmRpdGlvbik7XHJcblxyXG4gICAgICAgIGlmIChjb25kaXRpb25UeXBlICE9IG51bGwgJiYgY29uZGl0aW9uVHlwZS50eXBlICE9IGJvb2xlYW5QcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlY2tJZkFzc2lnbm1lbnRJbnN0ZWRPZkVxdWFsKG5vZGUuY29uZGl0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgV2VydCBkZXMgVGVybXMgaW4gS2xhbW1lcm4gaGludGVyICd3aGlsZScgbXVzcyBkZW4gRGF0ZW50eXAgYm9vbGVhbiBiZXNpdHplbi5cIiwgbm9kZS5jb25kaXRpb24ucG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG0uaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBJZlRydWUsIHN0YXRlbWVudHMuZW5kUG9zaXRpb24sIHRoaXMsIHN0YXRlbWVudHNCZWdpbkxhYmVsKTtcclxuXHJcbiAgICAgICAgbGV0IGVuZExhYmVsID0gbG0ubWFya0p1bXBEZXN0aW5hdGlvbigxKTtcclxuXHJcbiAgICAgICAgdGhpcy5jbG9zZUJyZWFrU2NvcGUoZW5kTGFiZWwsIGxtKTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3BTeW1ib2xUYWJsZSgpO1xyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiBudWxsLCBpc0Fzc2lnbmFibGU6IGZhbHNlLCB3aXRoUmV0dXJuU3RhdGVtZW50OiB3aXRoUmV0dXJuU3RhdGVtZW50IH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG5ld09iamVjdChub2RlOiBOZXdPYmplY3ROb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUuY2xhc3NUeXBlID09IG51bGwgfHwgbm9kZS5jbGFzc1R5cGUucmVzb2x2ZWRUeXBlID09IG51bGwpIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICBsZXQgcmVzb2x2ZWRUeXBlOiBLbGFzcyA9IDxLbGFzcz5ub2RlLmNsYXNzVHlwZS5yZXNvbHZlZFR5cGU7XHJcbiAgICAgICAgaWYgKCEocmVzb2x2ZWRUeXBlIGluc3RhbmNlb2YgS2xhc3MpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKG5vZGUuY2xhc3NUeXBlLmlkZW50aWZpZXIgKyBcIiBpc3Qga2VpbmUgS2xhc3NlLCBkYWhlciBrYW5uIGRhdm9uIG1pdCAnbmV3JyBrZWluIE9iamVrdCBlcnpldWd0IHdlcmRlbi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHJlc29sdmVkVHlwZS5pc0Fic3RyYWN0KSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKGAke25vZGUuY2xhc3NUeXBlLmlkZW50aWZpZXJ9IGlzdCBlaW5lIGFic3RyYWt0ZSBLbGFzc2UsIGRhaGVyIGthbm4gdm9uIGlociBtaXQgJ25ldycga2VpbiBPYmpla3QgaW5zdGFuemllcnQgd2VyZGVuLiBGYWxscyAke25vZGUuY2xhc3NUeXBlLmlkZW50aWZpZXJ9IG5pY2h0LWFic3RyYWt0ZSBLaW5ka2xhc3NlbiBiZXNpdHp0LCBrw7ZubnRlc3QgRHUgdm9uIERFTkVOIG1pdCBuZXcgT2JqZWt0ZSBpbnN0YW56aWVyZW4uLi5gLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL3RoaXMucHVzaFR5cGVQb3NpdGlvbihub2RlLnJpZ2h0QnJhY2tldFBvc2l0aW9uLCBjbGFzc1R5cGUpO1xyXG5cclxuICAgICAgICBpZiAocmVzb2x2ZWRUeXBlLm1vZHVsZSAhPSB0aGlzLm1vZHVsZSAmJiByZXNvbHZlZFR5cGUudmlzaWJpbGl0eSAhPSBWaXNpYmlsaXR5LnB1YmxpYykge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBLbGFzc2UgXCIgKyByZXNvbHZlZFR5cGUuaWRlbnRpZmllciArIFwiIGlzdCBoaWVyIG5pY2h0IHNpY2h0YmFyLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBuZXdTdGF0ZW1lbnQ6IE5ld09iamVjdFN0YXRlbWVudCA9IHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLm5ld09iamVjdCxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgIGNsYXNzOiByZXNvbHZlZFR5cGUsXHJcbiAgICAgICAgICAgIHN1YnNlcXVlbnRDb25zdHJ1Y3RvckNhbGw6IGZhbHNlLFxyXG4gICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWVcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKG5ld1N0YXRlbWVudCk7XHJcbiAgICAgICAgdGhpcy5wdXNoVHlwZVBvc2l0aW9uKG5vZGUucmlnaHRCcmFja2V0UG9zaXRpb24sIHJlc29sdmVkVHlwZSk7IC8vIHRvIGVuYWJsZSBjb2RlIGNvbXBsZXRpb24gd2hlbiB0eXBpbmcgYSBwb2ludCBhZnRlciB0aGUgY2xvc2luZyBicmFja2V0XHJcblxyXG4gICAgICAgIGxldCBwYXJhbWV0ZXJUeXBlczogVHlwZVtdID0gW107XHJcbiAgICAgICAgLy8gbGV0IHBhcmFtZXRlclN0YXRlbWVudHM6IFN0YXRlbWVudFtdW10gPSBbXTtcclxuICAgICAgICBsZXQgcG9zaXRpb25zQWZ0ZXJQYXJhbWV0ZXJTdGF0ZW1lbnRzOiBudW1iZXJbXSA9IFtdXHJcbiAgICAgICAgbGV0IGFsbFN0YXRlbWVudHMgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHM7XHJcblxyXG4gICAgICAgIGlmIChub2RlLmNvbnN0cnVjdG9yT3BlcmFuZHM/Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgLy8gZm9yIChsZXQgcCBvZiBub2RlLmNvbnN0cnVjdG9yT3BlcmFuZHMpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBub2RlLmNvbnN0cnVjdG9yT3BlcmFuZHMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBwID0gbm9kZS5jb25zdHJ1Y3Rvck9wZXJhbmRzW2pdO1xyXG4gICAgICAgICAgICAgICAgLy8gbGV0IHByb2dyYW1Qb2ludGVyID0gYWxsU3RhdGVtZW50cy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZU5vZGUgPSB0aGlzLnByb2Nlc3NOb2RlKHApO1xyXG4gICAgICAgICAgICAgICAgLy8gcGFyYW1ldGVyU3RhdGVtZW50cy5wdXNoKGFsbFN0YXRlbWVudHMuc3BsaWNlKHByb2dyYW1Qb2ludGVyLCBhbGxTdGF0ZW1lbnRzLmxlbmd0aCAtIHByb2dyYW1Qb2ludGVyKSk7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbnNBZnRlclBhcmFtZXRlclN0YXRlbWVudHMucHVzaChhbGxTdGF0ZW1lbnRzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZU5vZGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlclR5cGVzLnB1c2godm9pZFByaW1pdGl2ZVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJUeXBlcy5wdXNoKHR5cGVOb2RlLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdXBUb1Zpc2liaWxpdHkgPSBnZXRWaXNpYmlsaXR5VXBUbyhyZXNvbHZlZFR5cGUsIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dCk7XHJcblxyXG4gICAgICAgIC8vIGxldCBtZXRob2RzID0gcmVzb2x2ZWRUeXBlLmdldE1ldGhvZHNUaGF0Rml0V2l0aENhc3RpbmcocmVzb2x2ZWRUeXBlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgLy8gICAgIHBhcmFtZXRlclR5cGVzLCB0cnVlLCB1cFRvVmlzaWJpbGl0eSk7XHJcblxyXG4gICAgICAgIGxldCBtZXRob2RzID0gcmVzb2x2ZWRUeXBlLmdldENvbnN0cnVjdG9yKHBhcmFtZXRlclR5cGVzLCB1cFRvVmlzaWJpbGl0eSk7XHJcblxyXG4gICAgICAgIHRoaXMubW9kdWxlLnB1c2hNZXRob2RDYWxsUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgbm9kZS5jb21tYVBvc2l0aW9ucywgcmVzb2x2ZWRUeXBlLmdldE1ldGhvZHMoVmlzaWJpbGl0eS5wdWJsaWMsIHJlc29sdmVkVHlwZS5pZGVudGlmaWVyKSwgbm9kZS5yaWdodEJyYWNrZXRQb3NpdGlvbik7XHJcblxyXG4gICAgICAgIC8vIGlmIHRoZXJlJ3Mgbm8gcGFyYW1ldGVybGVzcyBjb25zdHJ1Y3RvciB0aGVuIHJldHVybiB3aXRob3V0IGVycm9yOlxyXG4gICAgICAgIGlmIChwYXJhbWV0ZXJUeXBlcy5sZW5ndGggPiAwIHx8IHJlc29sdmVkVHlwZS5oYXNDb25zdHJ1Y3RvcigpKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAobWV0aG9kcy5lcnJvciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihtZXRob2RzLmVycm9yLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHJlc29sdmVkVHlwZSwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9OyAvLyB0cnkgdG8gY29udGludWUuLi5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IG1ldGhvZCA9IG1ldGhvZHMubWV0aG9kTGlzdFswXTtcclxuICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihub2RlLnBvc2l0aW9uLCBtZXRob2QpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHN0YXRpY0NsYXNzQ29udGV4dCA9IG51bGw7XHJcbiAgICAgICAgICAgIGxldCBjbGFzc0NvbnRleHQgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcbiAgICAgICAgICAgIGlmIChjbGFzc0NvbnRleHQgIT0gbnVsbCAmJiBjbGFzc0NvbnRleHQgaW5zdGFuY2VvZiBLbGFzcykge1xyXG4gICAgICAgICAgICAgICAgc3RhdGljQ2xhc3NDb250ZXh0ID0gY2xhc3NDb250ZXh0LnN0YXRpY0NsYXNzO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobWV0aG9kLnZpc2liaWxpdHkgPT0gVmlzaWJpbGl0eS5wcml2YXRlICYmIHJlc29sdmVkVHlwZSAhPSBjbGFzc0NvbnRleHQgJiYgcmVzb2x2ZWRUeXBlICE9IHN0YXRpY0NsYXNzQ29udGV4dCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG9rID0gKHJlc29sdmVkVHlwZSA9PSBjbGFzc0NvbnRleHQgfHwgcmVzb2x2ZWRUeXBlICE9IHN0YXRpY0NsYXNzQ29udGV4dCB8fCAoY2xhc3NDb250ZXh0IGluc3RhbmNlb2YgU3RhdGljQ2xhc3MgJiYgcmVzb2x2ZWRUeXBlID09IGNsYXNzQ29udGV4dC5LbGFzcykpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFvaykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIEtvbnN0cnVrdG9ybWV0aG9kZSBpc3QgcHJpdmF0ZSB1bmQgZGFoZXIgaGllciBuaWNodCBzaWNodGJhci5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBkZXN0VHlwZTogVHlwZSA9IG51bGw7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyYW1ldGVyVHlwZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChpIDwgbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkpIHsgIC8vIHBvc3NpYmxlIGVsbGlwc2lzIVxyXG4gICAgICAgICAgICAgICAgICAgIGRlc3RUeXBlID0gbWV0aG9kLmdldFBhcmFtZXRlclR5cGUoaSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT0gbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxICYmIG1ldGhvZC5oYXNFbGxpcHNpcygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc3RUeXBlID0gKDxBcnJheVR5cGU+ZGVzdFR5cGUpLmFycmF5T2ZUeXBlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgc3JjVHlwZSA9IHBhcmFtZXRlclR5cGVzW2ldO1xyXG4gICAgICAgICAgICAgICAgLy8gZm9yIChsZXQgc3Qgb2YgcGFyYW1ldGVyU3RhdGVtZW50c1tpXSkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5wdXNoKHN0KTtcclxuICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgIGxldCBwcm9ncmFtUG9zaXRpb24gPSBhbGxTdGF0ZW1lbnRzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKHNyY1R5cGUsIGRlc3RUeXBlLCBub2RlLmNvbnN0cnVjdG9yT3BlcmFuZHNbaV0ucG9zaXRpb24sIG5vZGUuY29uc3RydWN0b3JPcGVyYW5kc1tpXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBXZXJ0IHZvbSBEYXRlbnR5cCBcIiArIHNyY1R5cGUuaWRlbnRpZmllciArIFwiIGthbm4gbmljaHQgYWxzIFBhcmFtZXRlciAoRGF0ZW50eXAgXCIgKyBkZXN0VHlwZS5pZGVudGlmaWVyICsgXCIpIHZlcndlbmRldCB3ZXJkZW4uXCIsIG5vZGUuY29uc3RydWN0b3JPcGVyYW5kc1tpXS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFsbFN0YXRlbWVudHMubGVuZ3RoID4gcHJvZ3JhbVBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNhc3RpbmdTdGF0ZW1lbnRzID0gYWxsU3RhdGVtZW50cy5zcGxpY2UocHJvZ3JhbVBvc2l0aW9uLCBhbGxTdGF0ZW1lbnRzLmxlbmd0aCAtIHByb2dyYW1Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgYWxsU3RhdGVtZW50cy5zcGxpY2UocG9zaXRpb25zQWZ0ZXJQYXJhbWV0ZXJTdGF0ZW1lbnRzW2ldLCAwLCAuLi5jYXN0aW5nU3RhdGVtZW50cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXIuY29ycmVjdFBvc2l0aW9uc0FmdGVySW5zZXJ0KHBvc2l0aW9uc0FmdGVyUGFyYW1ldGVyU3RhdGVtZW50c1tpXSwgY2FzdGluZ1N0YXRlbWVudHMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBzdGFja2ZyYW1lRGVsdGEgPSAwO1xyXG4gICAgICAgICAgICBpZiAobWV0aG9kLmhhc0VsbGlwc2lzKCkpIHtcclxuICAgICAgICAgICAgICAgIGxldCBlbGxpcHNpc1BhcmFtZXRlckNvdW50ID0gcGFyYW1ldGVyVHlwZXMubGVuZ3RoIC0gbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgKyAxOyAvLyBsYXN0IHBhcmFtZXRlciBhbmQgc3Vic2VxdWVudCBvbmVzXHJcbiAgICAgICAgICAgICAgICBzdGFja2ZyYW1lRGVsdGEgPSAtIChlbGxpcHNpc1BhcmFtZXRlckNvdW50IC0gMSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubWFrZUVsbGlwc2lzQXJyYXksXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUuY29uc3RydWN0b3JPcGVyYW5kc1ttZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSAtIDFdLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlckNvdW50OiBlbGxpcHNpc1BhcmFtZXRlckNvdW50LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJyYXlUeXBlOiBtZXRob2QuZ2V0UGFyYW1ldGVyKG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpIC0gMSkudHlwZVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhbGxNZXRob2QsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgaXNTdXBlckNhbGw6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiByZXNvbHZlZFR5cGUuZ2V0UG9zdENvbnN0cnVjdG9yQ2FsbGJhY2tzKCkgPT0gbnVsbCxcclxuICAgICAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLShwYXJhbWV0ZXJUeXBlcy5sZW5ndGggKyAxICsgc3RhY2tmcmFtZURlbHRhKSAvLyB0aGlzLW9iamVjdCBmb2xsb3dlZCBieSBwYXJhbWV0ZXJzXHJcbiAgICAgICAgICAgIH0sIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgbmV3U3RhdGVtZW50LnN1YnNlcXVlbnRDb25zdHJ1Y3RvckNhbGwgPSB0cnVlO1xyXG4gICAgICAgICAgICBuZXdTdGF0ZW1lbnQuc3RlcEZpbmlzaGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHJlc29sdmVkVHlwZS5nZXRQb3N0Q29uc3RydWN0b3JDYWxsYmFja3MoKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnByb2Nlc3NQb3N0Q29uc3RydWN0b3JDYWxsYmFja3MsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZVxyXG4gICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IHJlc29sdmVkVHlwZSwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdXNoQXR0cmlidXRlKG5vZGU6IFNlbGVjdEFycmlidXRlTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGlmIChub2RlLm9iamVjdCA9PSBudWxsIHx8IG5vZGUuaWRlbnRpZmllciA9PSBudWxsKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgbGV0IG90ID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLm9iamVjdCk7XHJcbiAgICAgICAgaWYgKG90ID09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoJ0xpbmtzIHZvbSBQdW5rdCBzdGVodCBrZWluIE9iamVrdC4nLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIShvdC50eXBlIGluc3RhbmNlb2YgS2xhc3MgfHwgb3QudHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzIHx8IG90LnR5cGUgaW5zdGFuY2VvZiBBcnJheVR5cGUpKSB7XHJcbiAgICAgICAgICAgIGlmIChvdC50eXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKCdEZXIgQXVzZHJ1Y2sgbGlua3Mgdm9tIFB1bmt0IGhhdCBrZWluIEF0dHJpYnV0ICcgKyBub2RlLmlkZW50aWZpZXIgKyBcIi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcignTGlua3Mgdm9tIFB1bmt0IHN0ZWh0IGVpbiBBdXNkcnVjayB2b20gRGF0ZW50eXAgJyArIG90LnR5cGUuaWRlbnRpZmllciArIFwiLiBEaWVzZXIgaGF0IGtlaW4gQXR0cmlidXQgXCIgKyBub2RlLmlkZW50aWZpZXIgKyBcIi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgb2JqZWN0VHlwZTogS2xhc3MgfCBTdGF0aWNDbGFzcyB8IEFycmF5VHlwZSA9IG90LnR5cGU7XHJcblxyXG4gICAgICAgIGlmIChvYmplY3RUeXBlIGluc3RhbmNlb2YgS2xhc3MpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB2aXNpYmlsaXR5VXBUbyA9IGdldFZpc2liaWxpdHlVcFRvKG9iamVjdFR5cGUsIHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgYXR0cmlidXRlV2l0aEVycm9yID0gb2JqZWN0VHlwZS5nZXRBdHRyaWJ1dGUobm9kZS5pZGVudGlmaWVyLCB2aXNpYmlsaXR5VXBUbyk7XHJcblxyXG4gICAgICAgICAgICBsZXQgc3RhdGljQXR0cmlidXRlV2l0aEVycm9yOiB7IGF0dHJpYnV0ZTogQXR0cmlidXRlLCBlcnJvcjogc3RyaW5nLCBmb3VuZEJ1dEludmlzaWJsZTogYm9vbGVhbiwgc3RhdGljQ2xhc3M6IFN0YXRpY0NsYXNzIH1cclxuICAgICAgICAgICAgICAgID0gbnVsbDtcclxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgc3RhdGljQXR0cmlidXRlV2l0aEVycm9yID0gb2JqZWN0VHlwZS5zdGF0aWNDbGFzcy5nZXRBdHRyaWJ1dGUobm9kZS5pZGVudGlmaWVyLCB2aXNpYmlsaXR5VXBUbyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlID09IG51bGwgJiYgc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXR0cmlidXRlV2l0aEVycm9yLmZvdW5kQnV0SW52aXNpYmxlIHx8ICFzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuZm91bmRCdXRJbnZpc2libGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihhdHRyaWJ1dGVXaXRoRXJyb3IuZXJyb3IsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuZXJyb3IsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBvYmplY3RUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzQXNzaWduYWJsZTogZmFsc2VcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCBhdHRyaWJ1dGU6IEF0dHJpYnV0ZTtcclxuICAgICAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hBdHRyaWJ1dGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJbmRleDogYXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZS5pbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlSWRlbnRpZmllcjogYXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZS5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VUaGlzT2JqZWN0OiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZSA9IGF0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmRlY3JlYXNlU3RhY2twb2ludGVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9wQ291bnQ6IDFcclxuICAgICAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoU3RhdGljQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8ga2xhc3M6ICg8S2xhc3M+b2JqZWN0VHlwZSkuc3RhdGljQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtsYXNzOiBzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3Iuc3RhdGljQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUluZGV4OiBzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlLmluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJZGVudGlmaWVyOiBzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlLmlkZW50aWZpZXJcclxuICAgICAgICAgICAgICAgICAgICB9XSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlID0gc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIGF0dHJpYnV0ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBhdHRyaWJ1dGUudHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6ICFhdHRyaWJ1dGUuaXNGaW5hbFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAob2JqZWN0VHlwZSBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzKSB7XHJcbiAgICAgICAgICAgIC8vIFN0YXRpYyBjbGFzc1xyXG4gICAgICAgICAgICBpZiAob2JqZWN0VHlwZS5LbGFzcyBpbnN0YW5jZW9mIEVudW0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlTGFzdFN0YXRlbWVudCgpOyAvLyByZW1vdmUgcHVzaCBzdGF0aWMgZW51bSBjbGFzcyB0byBzdGFja1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBlbnVtSW5mbyA9IG9iamVjdFR5cGUuS2xhc3MuZW51bUluZm9MaXN0LmZpbmQoZWkgPT4gZWkuaWRlbnRpZmllciA9PSBub2RlLmlkZW50aWZpZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlbnVtSW5mbyA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgZW51bS1LbGFzc2UgXCIgKyBvYmplY3RUeXBlLmlkZW50aWZpZXIgKyBcIiBoYXQga2VpbmVuIGVudW0tV2VydCBtaXQgZGVtIEJlemVpY2huZXIgXCIgKyBub2RlLmlkZW50aWZpZXIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoRW51bVZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIGVudW1DbGFzczogb2JqZWN0VHlwZS5LbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZUlkZW50aWZpZXI6IG5vZGUuaWRlbnRpZmllclxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBvYmplY3RUeXBlLktsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzQXNzaWduYWJsZTogZmFsc2VcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdXBUb1Zpc2liaWxpdHkgPSBnZXRWaXNpYmlsaXR5VXBUbyhvYmplY3RUeXBlLCB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvciA9IG9iamVjdFR5cGUuZ2V0QXR0cmlidXRlKG5vZGUuaWRlbnRpZmllciwgdXBUb1Zpc2liaWxpdHkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIChzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlLnVwZGF0ZVZhbHVlICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICB0aGlzLnJlbW92ZUxhc3RTdGF0ZW1lbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaFN0YXRpY0F0dHJpYnV0ZUludHJpbnNpYyxcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgYXR0cmlidXRlOiBzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIH0gZWxzZSBcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlTGFzdFN0YXRlbWVudCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoU3RhdGljQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJbmRleDogc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZS5pbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUlkZW50aWZpZXI6IHN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtsYXNzOiBzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3Iuc3RhdGljQ2xhc3NcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFVzYWdlUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmF0dHJpYnV0ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBzdGF0aWNBdHRyaWJ1dGVXaXRoRXJyb3IuYXR0cmlidXRlLnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQXNzaWduYWJsZTogIXN0YXRpY0F0dHJpYnV0ZVdpdGhFcnJvci5hdHRyaWJ1dGUuaXNGaW5hbFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3Ioc3RhdGljQXR0cmlidXRlV2l0aEVycm9yLmVycm9yLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBvYmplY3RUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICBpZiAobm9kZS5pZGVudGlmaWVyICE9IFwibGVuZ3RoXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKCdEZXIgV2VydCB2b20gRGF0ZW50eXAgJyArIG90LnR5cGUuaWRlbnRpZmllciArIFwiIGhhdCBrZWluIEF0dHJpYnV0IFwiICsgbm9kZS5pZGVudGlmaWVyLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQXJyYXlMZW5ndGgsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvblxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxldCBlbGVtZW50OiBBdHRyaWJ1dGUgPSBuZXcgQXR0cmlidXRlKFwibGVuZ3RoXCIsIGludFByaW1pdGl2ZVR5cGUsIG51bGwsIHRydWUsIFZpc2liaWxpdHkucHVibGljLCB0cnVlLCBcIkzDpG5nZSBkZXMgQXJyYXlzXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb2R1bGUuYWRkSWRlbnRpZmllclBvc2l0aW9uKG5vZGUucG9zaXRpb24sIGVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVzaFRoaXNPclN1cGVyKG5vZGU6IFRoaXNOb2RlIHwgU3VwZXJOb2RlLCBpc1N1cGVyOiBib29sZWFuKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IGNsYXNzQ29udGV4dCA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dDtcclxuXHJcbiAgICAgICAgaWYgKGlzU3VwZXIgJiYgY2xhc3NDb250ZXh0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgY2xhc3NDb250ZXh0ID0gY2xhc3NDb250ZXh0LmJhc2VDbGFzcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtZXRob2RDb250ZXh0ID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUubWV0aG9kO1xyXG5cclxuICAgICAgICBpZiAoY2xhc3NDb250ZXh0ID09IG51bGwgfHwgbWV0aG9kQ29udGV4dCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGFzIE9iamVrdCBcIiArIChpc1N1cGVyID8gXCJzdXBlclwiIDogXCJ0aGlzXCIpICsgXCIgZXhpc3RpZXJ0IG51ciBpbm5lcmhhbGIgZWluZXIgTWV0aG9kZW5kZWtsYXJhdGlvbi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hMb2NhbFZhcmlhYmxlVG9TdGFjayxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiAwXHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hUeXBlUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgY2xhc3NDb250ZXh0KTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogY2xhc3NDb250ZXh0LCBpc0Fzc2lnbmFibGU6IGZhbHNlLCBpc1N1cGVyOiBpc1N1cGVyIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBzdXBlcmNvbnN0cnVjdG9yQ2FsbChub2RlOiBTdXBlcmNvbnN0cnVjdG9yQ2FsbE5vZGUgfCBDb25zdHJ1Y3RvckNhbGxOb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IGNsYXNzQ29udGV4dCA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dDtcclxuXHJcbiAgICAgICAgbGV0IGlzU3VwZXJDb25zdHJ1Y3RvckNhbGw6IGJvb2xlYW4gPSBub2RlLnR5cGUgPT0gVG9rZW5UeXBlLnN1cGVyQ29uc3RydWN0b3JDYWxsO1xyXG5cclxuICAgICAgICBpZiAoaXNTdXBlckNvbnN0cnVjdG9yQ2FsbCkge1xyXG4gICAgICAgICAgICBpZiAoY2xhc3NDb250ZXh0Py5iYXNlQ2xhc3MgPT0gbnVsbCB8fCBjbGFzc0NvbnRleHQuYmFzZUNsYXNzLmlkZW50aWZpZXIgPT0gXCJPYmplY3RcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgS2xhc3NlIGlzdCBudXIgS2luZGtsYXNzZSBkZXIgS2xhc3NlIE9iamVjdCwgZGFoZXIgaXN0IGRlciBBdWZydWYgZGVzIFN1cGVya29uc3RydWt0b3JzIG5pY2h0IG3DtmdsaWNoLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZENvbnRleHQgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5tZXRob2Q7XHJcblxyXG4gICAgICAgIGlmIChjbGFzc0NvbnRleHQgPT0gbnVsbCB8fCBtZXRob2RDb250ZXh0ID09IG51bGwgfHwgIW1ldGhvZENvbnRleHQuaXNDb25zdHJ1Y3Rvcikge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVpbiBBdWZydWYgZGVzIEtvbnN0cnVrdG9ycyBvZGVyIGRlcyBTdXBlcmtvbnN0cnVjdG9ycyBpc3QgbnVyIGlubmVyaGFsYiBkZXMgS29uc3RydWt0b3JzIGVpbmVyIEtsYXNzZSBtw7ZnbGljaC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGxldCBzdXBlcmNsYXNzVHlwZTogS2xhc3MgfCBTdGF0aWNDbGFzcztcclxuXHJcbiAgICAgICAgaWYgKGlzU3VwZXJDb25zdHJ1Y3RvckNhbGwpIHtcclxuICAgICAgICAgICAgc3VwZXJjbGFzc1R5cGUgPSA8S2xhc3M+Y2xhc3NDb250ZXh0LmJhc2VDbGFzcztcclxuICAgICAgICAgICAgaWYgKHN1cGVyY2xhc3NUeXBlIGluc3RhbmNlb2YgU3RhdGljQ2xhc3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiU3RhdGlzY2hlIE1ldGhvZGVuIGhhYmVuIGtlaW5lIHN1cGVyLU1ldGhvZGVuYXVmcnVmZS5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBudWxsLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHN1cGVyY2xhc3NUeXBlID09IG51bGwpIHN1cGVyY2xhc3NUeXBlID0gPEtsYXNzPnRoaXMubW9kdWxlU3RvcmUuZ2V0VHlwZShcIk9iamVjdFwiKS50eXBlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHN1cGVyY2xhc3NUeXBlID0gPEtsYXNzPmNsYXNzQ29udGV4dDtcclxuICAgICAgICAgICAgaWYgKHN1cGVyY2xhc3NUeXBlIGluc3RhbmNlb2YgU3RhdGljQ2xhc3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiU3RhdGlzY2hlIE1ldGhvZGVuIGhhYmVuIGtlaW5lIHRoaXMtTWV0aG9kZW5hdWZydWZlLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IG51bGwsIGlzQXNzaWduYWJsZTogZmFsc2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUHVzaCB0aGlzLW9iamVjdCB0byBzdGFjazpcclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hMb2NhbFZhcmlhYmxlVG9TdGFjayxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgIHN0YWNrcG9zT2ZWYXJpYWJsZTogMFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBsZXQgcGFyYW1ldGVyVHlwZXM6IFR5cGVbXSA9IFtdO1xyXG5cclxuICAgICAgICBpZiAobm9kZS5vcGVyYW5kcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCBlcnJvckluT3BlcmFuZHM6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICAgICAgZm9yIChsZXQgcCBvZiBub2RlLm9wZXJhbmRzKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcHQgPSB0aGlzLnByb2Nlc3NOb2RlKHApO1xyXG4gICAgICAgICAgICAgICAgaWYgKHB0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJUeXBlcy5wdXNoKHB0LnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvckluT3BlcmFuZHMgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChlcnJvckluT3BlcmFuZHMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsIGlzQXNzaWduYWJsZTogZmFsc2UgfTsgLy8gdHJ5IHRvIGNvbnRpbnVlLi4uXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtZXRob2RzID0gc3VwZXJjbGFzc1R5cGUuZ2V0Q29uc3RydWN0b3IocGFyYW1ldGVyVHlwZXMsIFZpc2liaWxpdHkucHJvdGVjdGVkKTtcclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGUucHVzaE1ldGhvZENhbGxQb3NpdGlvbihub2RlLnBvc2l0aW9uLCBub2RlLmNvbW1hUG9zaXRpb25zLCBzdXBlcmNsYXNzVHlwZS5nZXRNZXRob2RzKFZpc2liaWxpdHkucHJvdGVjdGVkLCBzdXBlcmNsYXNzVHlwZS5pZGVudGlmaWVyKSxcclxuICAgICAgICAgICAgbm9kZS5yaWdodEJyYWNrZXRQb3NpdGlvbik7XHJcblxyXG4gICAgICAgIGlmIChtZXRob2RzLmVycm9yICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IobWV0aG9kcy5lcnJvciwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsIGlzQXNzaWduYWJsZTogZmFsc2UgfTsgLy8gdHJ5IHRvIGNvbnRpbnVlLi4uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbWV0aG9kID0gbWV0aG9kcy5tZXRob2RMaXN0WzBdO1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIG1ldGhvZCk7XHJcblxyXG4gICAgICAgIGxldCBzdGFja2ZyYW1lRGVsdGEgPSAwO1xyXG4gICAgICAgIGlmIChtZXRob2QuaGFzRWxsaXBzaXMoKSkge1xyXG4gICAgICAgICAgICBsZXQgZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCA9IHBhcmFtZXRlclR5cGVzLmxlbmd0aCAtIG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpICsgMTsgLy8gbGFzdCBwYXJhbWV0ZXIgYW5kIHN1YnNlcXVlbnQgb25lc1xyXG4gICAgICAgICAgICBzdGFja2ZyYW1lRGVsdGEgPSAtIChlbGxpcHNpc1BhcmFtZXRlckNvdW50IC0gMSk7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLm1ha2VFbGxpcHNpc0FycmF5LFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUub3BlcmFuZHNbbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxXS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlckNvdW50OiBlbGxpcHNpc1BhcmFtZXRlckNvdW50LFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGFycmF5VHlwZTogbWV0aG9kLmdldFBhcmFtZXRlcihtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSAtIDEpLnR5cGVcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgICAgICAgIGlzU3VwZXJDYWxsOiBpc1N1cGVyQ29uc3RydWN0b3JDYWxsLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgc3RhY2tmcmFtZUJlZ2luOiAtKHBhcmFtZXRlclR5cGVzLmxlbmd0aCArIDEgKyBzdGFja2ZyYW1lRGVsdGEpIC8vIHRoaXMtb2JqZWN0IGZvbGxvd2VkIGJ5IHBhcmFtZXRlcnNcclxuICAgICAgICB9KTtcclxuICAgICAgICAvLyBQYWJzdCwgMjEuMTAuMjAyMDpcclxuICAgICAgICAvLyBzdXBlciBtZXRob2QgaXMgY29uc3RydWN0b3IgPT4gcmV0dXJucyBub3RoaW5nIGV2ZW4gaWYgbWV0aG9kLmdldFJldHVyblR5cGUoKSBpcyBjbGFzcyBvYmplY3RcclxuICAgICAgICAvLyByZXR1cm4geyB0eXBlOiBtZXRob2QuZ2V0UmV0dXJuVHlwZSgpLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogbnVsbCwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpbmNyZW1lbnREZWNyZW1lbnRCZWZvcmVPckFmdGVyKG5vZGU6IEluY3JlbWVudERlY3JlbWVudE5vZGUpOiBTdGFja1R5cGUge1xyXG4gICAgICAgIGxldCB0eXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLm9wZXJhbmQpO1xyXG5cclxuICAgICAgICBpZiAodHlwZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmICghdHlwZS5pc0Fzc2lnbmFibGUpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgT3BlcmF0b3JlbiArKyB1bmQgLS0ga8O2bm5lbiBudXIgYXVmIFZhcmlhYmxlbiBhbmdld2VuZGV0IHdlcmRlbiwgbmljaHQgYXVmIGtvbnN0YW50ZSBXZXJ0ZSBvZGVyIFLDvGNrZ2FiZXdlcnRlIHZvbiBNZXRob2Rlbi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0eXBlLnR5cGUuY2FuQ2FzdFRvKGZsb2F0UHJpbWl0aXZlVHlwZSkpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgT3BlcmF0b3JlbiArKyB1bmQgLS0ga8O2bm5lbiBudXIgYXVmIFphaGxlbiBhbmdld2VuZGV0IHdlcmRlbiwgbmljaHQgYXVmIFdlcnRlIGRlcyBEYXRlbnR5cHMgXCIgKyB0eXBlLnR5cGUuaWRlbnRpZmllciwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgIHR5cGU6IG5vZGUudHlwZSxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgIGluY3JlbWVudERlY3JlbWVudEJ5OiBub2RlLm9wZXJhdG9yID09IFRva2VuVHlwZS5kb3VibGVNaW51cyA/IC0gMSA6IDFcclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0eXBlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZWxlY3RBcnJheUVsZW1lbnQobm9kZTogU2VsZWN0QXJyYXlFbGVtZW50Tm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBhcnJheVR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUub2JqZWN0KTsgLy8gcHVzaCBhcnJheS1vYmplY3QgXHJcbiAgICAgICAgbGV0IGluZGV4VHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5pbmRleCk7IC8vIHB1c2ggaW5kZXhcclxuXHJcbiAgICAgICAgaWYgKGFycmF5VHlwZSA9PSBudWxsIHx8IGluZGV4VHlwZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmICghKGFycmF5VHlwZS50eXBlIGluc3RhbmNlb2YgQXJyYXlUeXBlKSkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRlciBUeXAgZGVyIFZhcmlhYmxlbiBpc3Qga2VpbiBBcnJheSwgZGFoZXIgaXN0IFtdIG5pY2h0IHp1bMOkc3NpZy4gXCIsIG5vZGUub2JqZWN0LnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZS5hZGRJZGVudGlmaWVyUG9zaXRpb24oe1xyXG4gICAgICAgICAgICBsaW5lOiBub2RlLnBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgIGNvbHVtbjogbm9kZS5wb3NpdGlvbi5jb2x1bW4gKyBub2RlLnBvc2l0aW9uLmxlbmd0aCxcclxuICAgICAgICAgICAgbGVuZ3RoOiAwICAvLyBNb2R1bGUuZ2V0VHlwZUF0UG9zaXRpb24gbmVlZHMgbGVuZ3RoID09IDAgaGVyZSB0byBrbm93IHRoYXQgdGhpcyB0eXBlLXBvc2l0aW9uIGlzIG5vdCBpbiBzdGF0aWMgY29udGV4dCBmb3IgY29kZSBjb21wbGV0aW9uXHJcbiAgICAgICAgfSwgYXJyYXlUeXBlLnR5cGUuYXJyYXlPZlR5cGUpO1xyXG5cclxuICAgICAgICBpZiAoIXRoaXMuZW5zdXJlQXV0b21hdGljQ2FzdGluZyhpbmRleFR5cGUudHlwZSwgaW50UHJpbWl0aXZlVHlwZSkpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJBbHMgSW5kZXggZWluZXMgQXJyYXlzIHdpcmQgZWluIGdhbnp6YWhsaWdlciBXZXJ0IGVyd2FydGV0LiBHZWZ1bmRlbiB3dXJkZSBlaW4gV2VydCB2b20gVHlwIFwiICsgaW5kZXhUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiLlwiLCBub2RlLmluZGV4LnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogKDxBcnJheVR5cGU+YXJyYXlUeXBlLnR5cGUpLmFycmF5T2ZUeXBlLCBpc0Fzc2lnbmFibGU6IGFycmF5VHlwZS5pc0Fzc2lnbmFibGUgfTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnNlbGVjdEFycmF5RWxlbWVudCxcclxuICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb25cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiAoPEFycmF5VHlwZT5hcnJheVR5cGUudHlwZSkuYXJyYXlPZlR5cGUsIGlzQXNzaWduYWJsZTogYXJyYXlUeXBlLmlzQXNzaWduYWJsZSB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdXNoVHlwZVBvc2l0aW9uKHBvc2l0aW9uOiBUZXh0UG9zaXRpb24sIHR5cGU6IFR5cGUpIHtcclxuICAgICAgICBpZiAocG9zaXRpb24gPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgIGlmIChwb3NpdGlvbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgbGluZTogcG9zaXRpb24ubGluZSxcclxuICAgICAgICAgICAgICAgIGNvbHVtbjogcG9zaXRpb24uY29sdW1uICsgcG9zaXRpb24ubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgbGVuZ3RoOiAwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5tb2R1bGUuYWRkSWRlbnRpZmllclBvc2l0aW9uKHBvc2l0aW9uLCB0eXBlKTtcclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIHB1c2hVc2FnZVBvc2l0aW9uKHBvc2l0aW9uOiBUZXh0UG9zaXRpb24sIGVsZW1lbnQ6IEtsYXNzIHwgSW50ZXJmYWNlIHwgTWV0aG9kIHwgQXR0cmlidXRlIHwgVmFyaWFibGUpIHtcclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGUuYWRkSWRlbnRpZmllclBvc2l0aW9uKHBvc2l0aW9uLCBlbGVtZW50KTtcclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBwb3NpdGlvbkxpc3Q6IFRleHRQb3NpdGlvbltdID0gZWxlbWVudC51c2FnZVBvc2l0aW9ucy5nZXQodGhpcy5tb2R1bGUpO1xyXG4gICAgICAgIGlmIChwb3NpdGlvbkxpc3QgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbkxpc3QgPSBbXTtcclxuICAgICAgICAgICAgZWxlbWVudC51c2FnZVBvc2l0aW9ucy5zZXQodGhpcy5tb2R1bGUsIHBvc2l0aW9uTGlzdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwb3NpdGlvbkxpc3QucHVzaChwb3NpdGlvbik7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJlc29sdmVJZGVudGlmaWVyKG5vZGU6IElkZW50aWZpZXJOb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUuaWRlbnRpZmllciA9PSBudWxsKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgbGV0IHZhcmlhYmxlID0gdGhpcy5maW5kTG9jYWxWYXJpYWJsZShub2RlLmlkZW50aWZpZXIpO1xyXG4gICAgICAgIGlmICh2YXJpYWJsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hMb2NhbFZhcmlhYmxlVG9TdGFjayxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiB2YXJpYWJsZS5zdGFja1Bvc1xyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihub2RlLnBvc2l0aW9uLCB2YXJpYWJsZSk7XHJcbiAgICAgICAgICAgIG5vZGUudmFyaWFibGUgPSB2YXJpYWJsZTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHZhcmlhYmxlLnR5cGUsIGlzQXNzaWduYWJsZTogIXZhcmlhYmxlLmlzRmluYWwgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhlYXAgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgdmFyaWFibGUgPSB0aGlzLmhlYXBbbm9kZS5pZGVudGlmaWVyXTtcclxuICAgICAgICAgICAgaWYgKHZhcmlhYmxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoRnJvbUhlYXBUb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IG5vZGUuaWRlbnRpZmllclxyXG4gICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hVc2FnZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIHZhcmlhYmxlKTtcclxuICAgICAgICAgICAgICAgIG5vZGUudmFyaWFibGUgPSB2YXJpYWJsZTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogdmFyaWFibGUudHlwZSwgaXNBc3NpZ25hYmxlOiAhdmFyaWFibGUuaXNGaW5hbCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGF0dHJpYnV0ZSA9IHRoaXMuZmluZEF0dHJpYnV0ZShub2RlLmlkZW50aWZpZXIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgIGlmIChhdHRyaWJ1dGUgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZS5pc1N0YXRpYykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNjID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0O1xyXG4gICAgICAgICAgICAgICAgbGV0IHNjYyA9IChjYyBpbnN0YW5jZW9mIFN0YXRpY0NsYXNzKSA/IGNjIDogY2Muc3RhdGljQ2xhc3M7XHJcblxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHNjYyAhPSBudWxsICYmIHNjYy5hdHRyaWJ1dGVzLmluZGV4T2YoYXR0cmlidXRlKSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjYyA9IHNjYy5iYXNlQ2xhc3M7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hTdGF0aWNBdHRyaWJ1dGUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAga2xhc3M6IHNjYyxcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVJbmRleDogYXR0cmlidXRlLmluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUlkZW50aWZpZXI6IGF0dHJpYnV0ZS5pZGVudGlmaWVyXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUluZGV4OiBhdHRyaWJ1dGUuaW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlSWRlbnRpZmllcjogYXR0cmlidXRlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgdXNlVGhpc09iamVjdDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBub2RlLmF0dHJpYnV0ZSA9IGF0dHJpYnV0ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIHRoaXMucHVzaFVzYWdlUG9zaXRpb24obm9kZS5wb3NpdGlvbiwgYXR0cmlidXRlKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IGF0dHJpYnV0ZS50eXBlLCBpc0Fzc2lnbmFibGU6ICFhdHRyaWJ1dGUuaXNGaW5hbCB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGtsYXNzTW9kdWxlID0gdGhpcy5tb2R1bGVTdG9yZS5nZXRUeXBlKG5vZGUuaWRlbnRpZmllcik7XHJcbiAgICAgICAgaWYgKGtsYXNzTW9kdWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IGtsYXNzID0ga2xhc3NNb2R1bGUudHlwZTtcclxuICAgICAgICAgICAgaWYgKCEoa2xhc3MgaW5zdGFuY2VvZiBLbGFzcyB8fCBrbGFzcyBpbnN0YW5jZW9mIEludGVyZmFjZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIFR5cCBcIiArIGtsYXNzLmlkZW50aWZpZXIgKyBcIiBoYXQga2VpbmUgc3RhdGlzY2hlbiBBdHRyaWJ1dGUvTWV0aG9kZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hTdGF0aWNDbGFzc09iamVjdCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBrbGFzczoga2xhc3NcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFVzYWdlUG9zaXRpb24obm9kZS5wb3NpdGlvbiwga2xhc3MpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZToga2xhc3MgaW5zdGFuY2VvZiBLbGFzcyA/IGtsYXNzLnN0YXRpY0NsYXNzIDoga2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNBc3NpZ25hYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgdHlwZToga2xhc3MsXHJcbiAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIEJlemVpY2huZXIgXCIgKyBub2RlLmlkZW50aWZpZXIgKyBcIiBpc3QgaGllciBuaWNodCBiZWthbm50LlwiLCBub2RlLnBvc2l0aW9uKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZmluZExvY2FsVmFyaWFibGUoaWRlbnRpZmllcjogc3RyaW5nKTogVmFyaWFibGUge1xyXG4gICAgICAgIGxldCBzdCA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlO1xyXG5cclxuICAgICAgICB3aGlsZSAoc3QgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHZhcmlhYmxlID0gc3QudmFyaWFibGVNYXAuZ2V0KGlkZW50aWZpZXIpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHZhcmlhYmxlICE9IG51bGwgJiYgdmFyaWFibGUuc3RhY2tQb3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhcmlhYmxlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzdCA9IHN0LnBhcmVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBmaW5kQXR0cmlidXRlKGlkZW50aWZpZXI6IHN0cmluZywgcG9zaXRpb246IFRleHRQb3NpdGlvbik6IEF0dHJpYnV0ZSB7XHJcbiAgICAgICAgbGV0IGNsYXNzQ29udGV4dCA9IHRoaXMuY3VycmVudFN5bWJvbFRhYmxlLmNsYXNzQ29udGV4dDtcclxuICAgICAgICBpZiAoY2xhc3NDb250ZXh0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYXR0cmlidXRlID0gY2xhc3NDb250ZXh0LmdldEF0dHJpYnV0ZShpZGVudGlmaWVyLCBWaXNpYmlsaXR5LnByaXZhdGUpO1xyXG4gICAgICAgIGlmIChhdHRyaWJ1dGUuYXR0cmlidXRlICE9IG51bGwpIHJldHVybiBhdHRyaWJ1dGUuYXR0cmlidXRlO1xyXG5cclxuICAgICAgICBpZiAoY2xhc3NDb250ZXh0IGluc3RhbmNlb2YgS2xhc3MpIHtcclxuICAgICAgICAgICAgbGV0IHN0YXRpY0F0dHJpYnV0ZSA9IGNsYXNzQ29udGV4dC5zdGF0aWNDbGFzcy5nZXRBdHRyaWJ1dGUoaWRlbnRpZmllciwgVmlzaWJpbGl0eS5wcml2YXRlKTtcclxuICAgICAgICAgICAgaWYgKHN0YXRpY0F0dHJpYnV0ZS5hdHRyaWJ1dGUgIT0gbnVsbCkgcmV0dXJuIHN0YXRpY0F0dHJpYnV0ZS5hdHRyaWJ1dGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0aGlzLnB1c2hFcnJvcihhdHRyaWJ1dGUuZXJyb3IsIHBvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbE1ldGhvZChub2RlOiBNZXRob2RjYWxsTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBvYmplY3ROb2RlOiBTdGFja1R5cGUgPSBudWxsO1xyXG5cclxuICAgICAgICBpZiAobm9kZS5vYmplY3QgPT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgLy8gY2FsbCBtZXRob2Qgb2YgdGhpcy1jbGFzcz9cclxuXHJcbiAgICAgICAgICAgIGxldCB0aGlzQ2xhc3MgPSB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQ7XHJcbiAgICAgICAgICAgIGlmICh0aGlzQ2xhc3MgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2twb3NPZlZhcmlhYmxlOiAwXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBvYmplY3ROb2RlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHRoaXNDbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICBpc0Fzc2lnbmFibGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW4gTWV0aG9kZW5hdWZydWYgKGhpZXI6IFwiICsgbm9kZS5pZGVudGlmaWVyICtcclxuICAgICAgICAgICAgICAgICAgICBcIikgb2huZSBQdW5rdHNjaHJlaWJ3ZWlzZSBpc3QgbnVyIGlubmVyaGFsYiBhbmRlcmVyIE1ldGhvZGVuIG3DtmdsaWNoLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG9iamVjdE5vZGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUub2JqZWN0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvYmplY3ROb2RlID09IG51bGwpIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICBpZiAoIShcclxuICAgICAgICAgICAgKG9iamVjdE5vZGUudHlwZSBpbnN0YW5jZW9mIEtsYXNzKSB8fCAob2JqZWN0Tm9kZS50eXBlIGluc3RhbmNlb2YgU3RhdGljQ2xhc3MpIHx8XHJcbiAgICAgICAgICAgIChvYmplY3ROb2RlLnR5cGUgaW5zdGFuY2VvZiBJbnRlcmZhY2UgJiYgKG5vZGUub2JqZWN0W1widmFyaWFibGVcIl0gIT0gbnVsbCB8fCBub2RlLm9iamVjdFtcImF0dHJpYnV0ZVwiXSAhPSBudWxsIHx8IG5vZGUub2JqZWN0W1widGVybUluc2lkZUJyYWNrZXRzXCJdICE9IG51bGwpKSB8fCAob2JqZWN0Tm9kZS50eXBlIGluc3RhbmNlb2YgRW51bSkpKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAob2JqZWN0Tm9kZS50eXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiV2VydGUgZGllc2VzIERhdGVudHlwcyBiZXNpdHplbiBrZWluZSBNZXRob2Rlbi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0Tm9kZS50eXBlIGluc3RhbmNlb2YgSW50ZXJmYWNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoJ01ldGhvZGVuZGVmaW5pdGlvbmVuIGVpbmVzIEludGVyZmFjZXMga8O2bm5lbiBuaWNodCBzdGF0aXNjaCBhdWZnZXJ1ZmVuIHdlcmRlbi4nLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoJ1dlcnRlIGRlcyBEYXRlbnR5cHMgJyArIG9iamVjdE5vZGUudHlwZS5pZGVudGlmaWVyICsgXCIgYmVzaXR6ZW4ga2VpbmUgTWV0aG9kZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBvYmplY3RUeXBlOiBLbGFzcyB8IFN0YXRpY0NsYXNzIHwgSW50ZXJmYWNlID0gPGFueT5vYmplY3ROb2RlLnR5cGU7XHJcblxyXG4gICAgICAgIGxldCBwb3NCZWZvcmVQYXJhbWV0ZXJFdmFsdWF0aW9uID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgbGV0IHBhcmFtZXRlclR5cGVzOiBUeXBlW10gPSBbXTtcclxuICAgICAgICAvLyBsZXQgcGFyYW1ldGVyU3RhdGVtZW50czogU3RhdGVtZW50W11bXSA9IFtdO1xyXG4gICAgICAgIGxldCBwb3NpdGlvbnNBZnRlclBhcmFtZXRlclN0YXRlbWVudHM6IG51bWJlcltdID0gW11cclxuXHJcbiAgICAgICAgbGV0IGFsbFN0YXRlbWVudHMgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHM7XHJcbiAgICAgICAgaWYgKG5vZGUub3BlcmFuZHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAvLyBmb3IgKGxldCBwIG9mIG5vZGUub3BlcmFuZHMpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBub2RlLm9wZXJhbmRzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcCA9IG5vZGUub3BlcmFuZHNbal07XHJcbiAgICAgICAgICAgICAgICAvLyBsZXQgcHJvZ3JhbVBvaW50ZXIgPSBhbGxTdGF0ZW1lbnRzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIGxldCB0eXBlTm9kZSA9IHRoaXMucHJvY2Vzc05vZGUocCk7XHJcbiAgICAgICAgICAgICAgICAvLyBwYXJhbWV0ZXJTdGF0ZW1lbnRzLnB1c2goYWxsU3RhdGVtZW50cy5zcGxpY2UocHJvZ3JhbVBvaW50ZXIsIGFsbFN0YXRlbWVudHMubGVuZ3RoIC0gcHJvZ3JhbVBvaW50ZXIpKTtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uc0FmdGVyUGFyYW1ldGVyU3RhdGVtZW50cy5wdXNoKGFsbFN0YXRlbWVudHMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlTm9kZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyVHlwZXMucHVzaCh2b2lkUHJpbWl0aXZlVHlwZSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlclR5cGVzLnB1c2godHlwZU5vZGUudHlwZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsZXQgbWV0aG9kczogeyBlcnJvcjogc3RyaW5nLCBtZXRob2RMaXN0OiBNZXRob2RbXSB9O1xyXG4gICAgICAgIGlmIChvYmplY3RUeXBlIGluc3RhbmNlb2YgSW50ZXJmYWNlKSB7XHJcbiAgICAgICAgICAgIG1ldGhvZHMgPSBvYmplY3RUeXBlLmdldE1ldGhvZHNUaGF0Rml0V2l0aENhc3Rpbmcobm9kZS5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyVHlwZXMsIGZhbHNlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgdXBUb1Zpc2liaWxpdHkgPSBnZXRWaXNpYmlsaXR5VXBUbyhvYmplY3RUeXBlLCB0aGlzLmN1cnJlbnRTeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQpO1xyXG5cclxuICAgICAgICAgICAgbWV0aG9kcyA9IG9iamVjdFR5cGUuZ2V0TWV0aG9kc1RoYXRGaXRXaXRoQ2FzdGluZyhub2RlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJUeXBlcywgZmFsc2UsIHVwVG9WaXNpYmlsaXR5KTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZS5wdXNoTWV0aG9kQ2FsbFBvc2l0aW9uKG5vZGUucG9zaXRpb24sIG5vZGUuY29tbWFQb3NpdGlvbnMsIG9iamVjdFR5cGUuZ2V0TWV0aG9kcyhWaXNpYmlsaXR5LnByaXZhdGUsIG5vZGUuaWRlbnRpZmllciksIG5vZGUucmlnaHRCcmFja2V0UG9zaXRpb24pO1xyXG5cclxuICAgICAgICBpZiAobWV0aG9kcy5lcnJvciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKG1ldGhvZHMuZXJyb3IsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07IC8vIHRyeSB0byBjb250aW51ZS4uLlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZCA9IG1ldGhvZHMubWV0aG9kTGlzdFswXTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoVXNhZ2VQb3NpdGlvbihub2RlLnBvc2l0aW9uLCBtZXRob2QpO1xyXG5cclxuICAgICAgICAvLyBZb3UgQ0FOIGNhbGwgYSBzdGF0aWMgbWV0aG9kIG9uIGEgb2JqZWN0Li4uLCBzbzpcclxuICAgICAgICBpZiAobWV0aG9kLmlzU3RhdGljICYmIG9iamVjdFR5cGUgaW5zdGFuY2VvZiBLbGFzcyAmJiBvYmplY3RUeXBlLmlkZW50aWZpZXIgIT0gXCJQcmludFN0cmVhbVwiKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRXMgaXN0IGtlaW4gZ3V0ZXIgUHJvZ3JhbW1pZXJzdGlsLCBzdGF0aXNjaGUgTWV0aG9kZW4gZWluZXIgS2xhc3NlIG1pdGhpbGZlIGVpbmVzIE9iamVrdHMgYXVmenVydWZlbi4gQmVzc2VyIHfDpHJlIGhpZXIgXCIgKyBvYmplY3RUeXBlLmlkZW50aWZpZXIgKyBcIi5cIiArIG1ldGhvZC5pZGVudGlmaWVyICsgXCIoLi4uKS5cIiwgbm9kZS5wb3NpdGlvbiwgXCJpbmZvXCIpO1xyXG4gICAgICAgICAgICB0aGlzLmluc2VydFN0YXRlbWVudHMocG9zQmVmb3JlUGFyYW1ldGVyRXZhbHVhdGlvbiwgW3tcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5kZWNyZWFzZVN0YWNrcG9pbnRlcixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgcG9wQ291bnQ6IDFcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hTdGF0aWNDbGFzc09iamVjdCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAga2xhc3M6IG9iamVjdFR5cGVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBkZXN0VHlwZTogVHlwZSA9IG51bGw7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJhbWV0ZXJUeXBlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoaSA8IG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpKSB7ICAvLyBwb3NzaWJsZSBlbGxpcHNpcyFcclxuICAgICAgICAgICAgICAgIGRlc3RUeXBlID0gbWV0aG9kLmdldFBhcmFtZXRlclR5cGUoaSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSBtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSAtIDEgJiYgbWV0aG9kLmhhc0VsbGlwc2lzKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBkZXN0VHlwZSA9ICg8QXJyYXlUeXBlPmRlc3RUeXBlKS5hcnJheU9mVHlwZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gTWFya2VyIDFcclxuICAgICAgICAgICAgbGV0IHNyY1R5cGUgPSBwYXJhbWV0ZXJUeXBlc1tpXTtcclxuICAgICAgICAgICAgLy8gZm9yIChsZXQgc3Qgb2YgcGFyYW1ldGVyU3RhdGVtZW50c1tpXSkge1xyXG4gICAgICAgICAgICAvLyAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2goc3QpO1xyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgIGxldCBwcm9ncmFtUG9zaXRpb24gPSBhbGxTdGF0ZW1lbnRzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIGlmICghdGhpcy5lbnN1cmVBdXRvbWF0aWNDYXN0aW5nKHNyY1R5cGUsIGRlc3RUeXBlLCBub2RlLm9wZXJhbmRzW2ldLnBvc2l0aW9uLCBub2RlLm9wZXJhbmRzW2ldKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgV2VydCB2b20gRGF0ZW50eXAgXCIgKyBzcmNUeXBlLmlkZW50aWZpZXIgKyBcIiBrYW5uIG5pY2h0IGFscyBQYXJhbWV0ZXIgKERhdGVudHlwIFwiICsgZGVzdFR5cGUuaWRlbnRpZmllciArIFwiKSB2ZXJ3ZW5kZXQgd2VyZGVuLlwiLCBub2RlLm9wZXJhbmRzW2ldLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGFsbFN0YXRlbWVudHMubGVuZ3RoID4gcHJvZ3JhbVBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgY2FzdGluZ1N0YXRlbWVudHMgPSBhbGxTdGF0ZW1lbnRzLnNwbGljZShwcm9ncmFtUG9zaXRpb24sIGFsbFN0YXRlbWVudHMubGVuZ3RoIC0gcHJvZ3JhbVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGFsbFN0YXRlbWVudHMuc3BsaWNlKHBvc2l0aW9uc0FmdGVyUGFyYW1ldGVyU3RhdGVtZW50c1tpXSwgMCwgLi4uY2FzdGluZ1N0YXRlbWVudHMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5sYWJlbE1hbmFnZXIuY29ycmVjdFBvc2l0aW9uc0FmdGVySW5zZXJ0KHBvc2l0aW9uc0FmdGVyUGFyYW1ldGVyU3RhdGVtZW50c1tpXSwgY2FzdGluZ1N0YXRlbWVudHMubGVuZ3RoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIC8vIGlmIChzcmNUeXBlIGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSAmJiBkZXN0VHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgLy8gICAgIGlmIChzcmNUeXBlLmdldENhc3RJbmZvcm1hdGlvbihkZXN0VHlwZSkubmVlZHNTdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgLy8gICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgLy8gICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhc3RWYWx1ZSxcclxuICAgICAgICAgICAgLy8gICAgICAgICAgICAgcG9zaXRpb246IG51bGwsXHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIG5ld1R5cGU6IGRlc3RUeXBlLFxyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBzdGFja1Bvc1JlbGF0aXZlOiAtcGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSArIGlcclxuICAgICAgICAgICAgLy8gICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdGFja2ZyYW1lRGVsdGEgPSAwO1xyXG4gICAgICAgIGlmIChtZXRob2QuaGFzRWxsaXBzaXMoKSkge1xyXG4gICAgICAgICAgICBsZXQgZWxsaXBzaXNQYXJhbWV0ZXJDb3VudCA9IHBhcmFtZXRlclR5cGVzLmxlbmd0aCAtIG1ldGhvZC5nZXRQYXJhbWV0ZXJDb3VudCgpICsgMTsgLy8gbGFzdCBwYXJhbWV0ZXIgYW5kIHN1YnNlcXVlbnQgb25lc1xyXG4gICAgICAgICAgICBzdGFja2ZyYW1lRGVsdGEgPSAtIChlbGxpcHNpc1BhcmFtZXRlckNvdW50IC0gMSk7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLm1ha2VFbGxpcHNpc0FycmF5LFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUub3BlcmFuZHNbbWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgLSAxXS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlckNvdW50OiBlbGxpcHNpc1BhcmFtZXRlckNvdW50LFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGFycmF5VHlwZTogbWV0aG9kLmdldFBhcmFtZXRlcihtZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSAtIDEpLnR5cGVcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChtZXRob2QudmlzaWJpbGl0eSAhPSBWaXNpYmlsaXR5LnB1YmxpYykge1xyXG5cclxuICAgICAgICAgICAgbGV0IHZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgY2xhc3NDb250ZXh0ID0gdGhpcy5jdXJyZW50U3ltYm9sVGFibGUuY2xhc3NDb250ZXh0O1xyXG4gICAgICAgICAgICBpZiAoY2xhc3NDb250ZXh0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChjbGFzc0NvbnRleHQgIT0gb2JqZWN0VHlwZSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICEoY2xhc3NDb250ZXh0IGluc3RhbmNlb2YgS2xhc3MgJiYgY2xhc3NDb250ZXh0LmltcGxlbWVudHMuaW5kZXhPZig8SW50ZXJmYWNlPm9iamVjdFR5cGUpID4gMCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWV0aG9kLnZpc2liaWxpdHkgPT0gVmlzaWJpbGl0eS5wcml2YXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmxlID0gY2xhc3NDb250ZXh0Lmhhc0FuY2VzdG9yT3JJcyg8S2xhc3MgfCBTdGF0aWNDbGFzcz5vYmplY3RUeXBlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCF2aXNpYmxlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBNZXRob2RlIFwiICsgbWV0aG9kLmlkZW50aWZpZXIgKyBcIiBpc3QgYW4gZGllc2VyIFN0ZWxsZSBkZXMgUHJvZ3JhbW1zIG5pY2h0IHNpY2h0YmFyLlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGlzU3lzdGVtTWV0aG9kOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgaWYgKG1ldGhvZC5pc1N0YXRpYyAmJiBvYmplY3ROb2RlLnR5cGUgIT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAob2JqZWN0Tm9kZS50eXBlIGluc3RhbmNlb2YgU3RhdGljQ2xhc3MpKSB7XHJcbiAgICAgICAgICAgIGxldCBjbGFzc0lkZW50aWZpZXIgPSBvYmplY3ROb2RlLnR5cGUuS2xhc3MuaWRlbnRpZmllcjtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAoY2xhc3NJZGVudGlmaWVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiSW5wdXRcIjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhbGxJbnB1dE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLShwYXJhbWV0ZXJUeXBlcy5sZW5ndGggKyAxICsgc3RhY2tmcmFtZURlbHRhKSAvLyB0aGlzLW9iamVjdCBmb2xsb3dlZCBieSBwYXJhbWV0ZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaXNTeXN0ZW1NZXRob2QgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIlN5c3RlbVRvb2xzXCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiUm9ib3RcIjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoW1wicGF1c2VcIiwgXCJ3YXJ0ZW5cIl0uaW5kZXhPZihtZXRob2QuaWRlbnRpZmllcikgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuc2V0UGF1c2VEdXJhdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wYXVzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzU3lzdGVtTWV0aG9kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWlzU3lzdGVtTWV0aG9kKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhbGxNZXRob2QsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgaXNTdXBlckNhbGw6IG9iamVjdE5vZGUuaXNTdXBlciA9PSBudWxsID8gZmFsc2UgOiBvYmplY3ROb2RlLmlzU3VwZXIsXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0ocGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSArIHN0YWNrZnJhbWVEZWx0YSkgLy8gdGhpcy1vYmplY3QgZm9sbG93ZWQgYnkgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5wdXNoVHlwZVBvc2l0aW9uKG5vZGUucmlnaHRCcmFja2V0UG9zaXRpb24sIG1ldGhvZC5nZXRSZXR1cm5UeXBlKCkpO1xyXG5cclxuICAgICAgICByZXR1cm4geyB0eXBlOiBtZXRob2QuZ2V0UmV0dXJuVHlwZSgpLCBpc0Fzc2lnbmFibGU6IGZhbHNlIH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHB1c2hDb25zdGFudChub2RlOiBDb25zdGFudE5vZGUpOiBTdGFja1R5cGUge1xyXG5cclxuICAgICAgICBsZXQgdHlwZTogVHlwZTtcclxuXHJcbiAgICAgICAgc3dpdGNoIChub2RlLmNvbnN0YW50VHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5pbnRlZ2VyQ29uc3RhbnQ6XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gaW50UHJpbWl0aXZlVHlwZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5ib29sZWFuQ29uc3RhbnQ6XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gYm9vbGVhblByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZmxvYXRpbmdQb2ludENvbnN0YW50OlxyXG4gICAgICAgICAgICAgICAgdHlwZSA9IGZsb2F0UHJpbWl0aXZlVHlwZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zdHJpbmdDb25zdGFudDpcclxuICAgICAgICAgICAgICAgIHR5cGUgPSBzdHJpbmdQcmltaXRpdmVUeXBlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoVHlwZVBvc2l0aW9uKG5vZGUucG9zaXRpb24sIHR5cGUpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmNoYXJDb25zdGFudDpcclxuICAgICAgICAgICAgICAgIHR5cGUgPSBjaGFyUHJpbWl0aXZlVHlwZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkTnVsbDpcclxuICAgICAgICAgICAgICAgIHR5cGUgPSBudWxsVHlwZVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hDb25zdGFudCxcclxuICAgICAgICAgICAgZGF0YVR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICB2YWx1ZTogbm9kZS5jb25zdGFudFxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHJldHVybiB7IHR5cGU6IHR5cGUsIGlzQXNzaWduYWJsZTogZmFsc2UgfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc0JpbmFyeU9wKG5vZGU6IEJpbmFyeU9wTm9kZSk6IFN0YWNrVHlwZSB7XHJcblxyXG4gICAgICAgIGxldCBpc0Fzc2lnbm1lbnQgPSBDb2RlR2VuZXJhdG9yLmFzc2lnbm1lbnRPcGVyYXRvcnMuaW5kZXhPZihub2RlLm9wZXJhdG9yKSA+PSAwO1xyXG5cclxuICAgICAgICBpZiAobm9kZS5vcGVyYXRvciA9PSBUb2tlblR5cGUudGVybmFyeU9wZXJhdG9yKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NUZXJuYXJ5T3BlcmF0b3Iobm9kZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbGVmdFR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKG5vZGUuZmlyc3RPcGVyYW5kLCBpc0Fzc2lnbm1lbnQpO1xyXG5cclxuICAgICAgICBsZXQgcHJvZ3JhbVBvc0FmdGVyTGVmdE9wb2VyYW5kID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgbGV0IGxhenlFdmFsdWF0aW9uRGVzdCA9IG51bGw7XHJcbiAgICAgICAgaWYgKG5vZGUub3BlcmF0b3IgPT0gVG9rZW5UeXBlLmFuZCkge1xyXG4gICAgICAgICAgICBsYXp5RXZhbHVhdGlvbkRlc3QgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlci5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmRmFsc2VBbmRMZWF2ZU9uU3RhY2ssIG5vZGUuZmlyc3RPcGVyYW5kLnBvc2l0aW9uLCB0aGlzKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG5vZGUub3BlcmF0b3IgPT0gVG9rZW5UeXBlLm9yKSB7XHJcbiAgICAgICAgICAgIGxhenlFdmFsdWF0aW9uRGVzdCA9IHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLmluc2VydEp1bXBOb2RlKFRva2VuVHlwZS5qdW1wSWZUcnVlQW5kTGVhdmVPblN0YWNrLCBub2RlLmZpcnN0T3BlcmFuZC5wb3NpdGlvbiwgdGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcmlnaHRUeXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLnNlY29uZE9wZXJhbmQpO1xyXG5cclxuICAgICAgICBpZiAobGVmdFR5cGUgPT0gbnVsbCB8fCBsZWZ0VHlwZS50eXBlID09IG51bGwgfHwgcmlnaHRUeXBlID09IG51bGwgfHwgcmlnaHRUeXBlLnR5cGUgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGxldCBjb252ZXJ0ZWRMZWZ0VHlwZSA9IGxlZnRUeXBlLnR5cGU7XHJcblxyXG4gICAgICAgIGlmIChpc0Fzc2lnbm1lbnQpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmVuc3VyZUF1dG9tYXRpY0Nhc3RpbmcocmlnaHRUeXBlLnR5cGUsIGxlZnRUeXBlLnR5cGUsIG5vZGUucG9zaXRpb24sIG5vZGUuZmlyc3RPcGVyYW5kLCB0cnVlKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgV2VydCB2b20gRGF0ZW50eXAgXCIgKyByaWdodFR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIgYXVmIGRlciByZWNodGVuIFNlaXRlIGthbm4gZGVyIFZhcmlhYmxlbiBhdWYgZGVyIGxpbmtlbiBTZWl0ZSAoRGF0ZW50eXAgXCIgKyBsZWZ0VHlwZS50eXBlLmlkZW50aWZpZXIgKyBcIikgbmljaHQgenVnZXdpZXNlbiB3ZXJkZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRUeXBlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIWxlZnRUeXBlLmlzQXNzaWduYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZW0gVGVybS9kZXIgVmFyaWFibGVuIGF1ZiBkZXIgbGlua2VuIFNlaXRlIGRlcyBadXdlaXN1bmdzb3BlcmF0b3JzICg9KSBrYW5uIGtlaW4gV2VydCB6dWdld2llc2VuIHdlcmRlbi5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBzdGF0ZW1lbnQ6IEFzc2lnbm1lbnRTdGF0ZW1lbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgIHR5cGU6IG5vZGUub3BlcmF0b3IsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGxlYXZlVmFsdWVPblN0YWNrOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHN0YXRlbWVudCk7XHJcblxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGxlZnRUeXBlO1xyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUuZmlyc3RPcGVyYW5kLnR5cGUgPT0gVG9rZW5UeXBlLmlkZW50aWZpZXIgJiYgbm9kZS5maXJzdE9wZXJhbmQudmFyaWFibGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHYgPSBub2RlLmZpcnN0T3BlcmFuZC52YXJpYWJsZTtcclxuICAgICAgICAgICAgICAgIGlmICh2LmluaXRpYWxpemVkICE9IG51bGwgJiYgIXYuaW5pdGlhbGl6ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2LnVzZWRCZWZvcmVJbml0aWFsaXphdGlvbiA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgVmFyaWFibGUgXCIgKyB2LmlkZW50aWZpZXIgKyBcIiB3aXJkIGhpZXIgYmVudXR6dCBiZXZvciBzaWUgaW5pdGlhbGlzaWVydCB3dXJkZS5cIiwgbm9kZS5wb3NpdGlvbiwgXCJpbmZvXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgcmVzdWx0VHlwZSA9IGxlZnRUeXBlLnR5cGUuZ2V0UmVzdWx0VHlwZShub2RlLm9wZXJhdG9yLCByaWdodFR5cGUudHlwZSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgdW5ib3hhYmxlTGVmdCA9IGxlZnRUeXBlLnR5cGVbXCJ1bmJveGFibGVBc1wiXTtcclxuICAgICAgICAgICAgbGV0IHVuYm94YWJsZVJpZ2h0ID0gcmlnaHRUeXBlLnR5cGVbXCJ1bmJveGFibGVBc1wiXTtcclxuXHJcblxyXG4gICAgICAgICAgICBpZiAocmVzdWx0VHlwZSA9PSBudWxsICYmIG5vZGUub3BlcmF0b3IgPT0gVG9rZW5UeXBlLnBsdXMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChyaWdodFR5cGUudHlwZSA9PSBzdHJpbmdQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZW5zdXJlQXV0b21hdGljVG9TdHJpbmcobGVmdFR5cGUudHlwZSwgcHJvZ3JhbVBvc0FmdGVyTGVmdE9wb2VyYW5kLCBub2RlLmZpcnN0T3BlcmFuZC5wb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0VHlwZSA9IHN0cmluZ1ByaW1pdGl2ZVR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZlcnRlZExlZnRUeXBlID0gc3RyaW5nUHJpbWl0aXZlVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxlZnRUeXBlLnR5cGUgPT0gc3RyaW5nUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmVuc3VyZUF1dG9tYXRpY1RvU3RyaW5nKHJpZ2h0VHlwZS50eXBlLCB1bmRlZmluZWQsIG5vZGUuZmlyc3RPcGVyYW5kLnBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRUeXBlID0gc3RyaW5nUHJpbWl0aXZlVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChyZXN1bHRUeXBlID09IG51bGwgJiYgKHVuYm94YWJsZUxlZnQgIT0gbnVsbCB8fCB1bmJveGFibGVSaWdodCAhPSBudWxsKSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGxlZnRUeXBlczogVHlwZVtdID0gdW5ib3hhYmxlTGVmdCA9PSBudWxsID8gW2xlZnRUeXBlLnR5cGVdIDogdW5ib3hhYmxlTGVmdDtcclxuICAgICAgICAgICAgICAgIGxldCByaWdodFR5cGVzOiBUeXBlW10gPSB1bmJveGFibGVSaWdodCA9PSBudWxsID8gW3JpZ2h0VHlwZS50eXBlXSA6IHVuYm94YWJsZVJpZ2h0O1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGx0IG9mIGxlZnRUeXBlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHJ0IG9mIHJpZ2h0VHlwZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0VHlwZSA9IGx0LmdldFJlc3VsdFR5cGUobm9kZS5vcGVyYXRvciwgcnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0VHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydFN0YXRlbWVudHMocHJvZ3JhbVBvc0FmdGVyTGVmdE9wb2VyYW5kLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhc3RWYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5maXJzdE9wZXJhbmQucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3VHlwZTogbHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50cyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhc3RWYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5zZWNvbmRPcGVyYW5kLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1R5cGU6IHJ0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZlcnRlZExlZnRUeXBlID0gbHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByaWdodFR5cGUudHlwZSA9IHJ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdFR5cGUgIT0gbnVsbCkgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICBpZiAobm9kZS5vcGVyYXRvciBpbiBbVG9rZW5UeXBlLmFuZCwgVG9rZW5UeXBlLm9yXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZS5maXJzdE9wZXJhbmQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja0lmQXNzaWdubWVudEluc3RlZE9mRXF1YWwobm9kZS5zZWNvbmRPcGVyYW5kKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHJlc3VsdFR5cGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGJpdE9wZXJhdG9ycyA9IFtUb2tlblR5cGUuYW1wZXJzYW5kLCBUb2tlblR5cGUuT1JdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGJvb2xlYW5PcGVyYXRvcnMgPSBbXCImJiAoYm9vbGVzY2hlciBVTkQtT3BlcmF0b3IpXCIsIFwifHwgKGJvb2xlc2NoZXIgT0RFUi1PcGVyYXRvcilcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgYmV0dGVyT3BlcmF0b3JzID0gW1wiJiAmXCIsIFwifHxcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgb3BJbmRleCA9IGJpdE9wZXJhdG9ycy5pbmRleE9mKG5vZGUub3BlcmF0b3IpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG9wSW5kZXggPj0gMCAmJiBsZWZ0VHlwZS50eXBlID09IGJvb2xlYW5QcmltaXRpdmVUeXBlICYmIHJpZ2h0VHlwZS50eXBlID09IGJvb2xlYW5QcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEaWUgT3BlcmF0aW9uIFwiICsgVG9rZW5UeXBlUmVhZGFibGVbbm9kZS5vcGVyYXRvcl0gKyBcIiBpc3QgZsO8ciBkaWUgT3BlcmFuZGVuIGRlciBUeXBlbiBcIiArIGxlZnRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIHVuZCBcIiArIHJpZ2h0VHlwZS50eXBlLmlkZW50aWZpZXIgKyBcIiBuaWNodCBkZWZpbmllcnQuIER1IG1laW50ZXN0IHdhaHJzY2hlaW5saWNoIGRlbiBPcGVyYXRvciBcIiArIGJvb2xlYW5PcGVyYXRvcnNbb3BJbmRleF0gKyBcIi5cIiwgbm9kZS5wb3NpdGlvbiwgXCJlcnJvclwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJPcGVyYXRvciBcIiArIGJldHRlck9wZXJhdG9yc1tvcEluZGV4XSArIFwiIHZlcndlbmRlbiBzdGF0dCBcIiArIFRva2VuVHlwZVJlYWRhYmxlW25vZGUub3BlcmF0b3JdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdHNQcm92aWRlcjogKHVyaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiB1cmksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlZGl0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHsgc3RhcnRMaW5lTnVtYmVyOiBub2RlLnBvc2l0aW9uLmxpbmUsIHN0YXJ0Q29sdW1uOiBub2RlLnBvc2l0aW9uLmNvbHVtbiwgZW5kTGluZU51bWJlcjogbm9kZS5wb3NpdGlvbi5saW5lLCBlbmRDb2x1bW46IG5vZGUucG9zaXRpb24uY29sdW1uIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogVG9rZW5UeXBlUmVhZGFibGVbbm9kZS5vcGVyYXRvcl1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBPcGVyYXRpb24gXCIgKyBUb2tlblR5cGVSZWFkYWJsZVtub2RlLm9wZXJhdG9yXSArIFwiIGlzdCBmw7xyIGRpZSBPcGVyYW5kZW4gZGVyIFR5cGVuIFwiICsgbGVmdFR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIgdW5kIFwiICsgcmlnaHRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIG5pY2h0IGRlZmluaWVydC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFR5cGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hTdGF0ZW1lbnRzKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5iaW5hcnlPcCxcclxuICAgICAgICAgICAgICAgIGxlZnRUeXBlOiBjb252ZXJ0ZWRMZWZ0VHlwZSxcclxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBub2RlLm9wZXJhdG9yLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb25cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAobGF6eUV2YWx1YXRpb25EZXN0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0ubGFiZWxNYW5hZ2VyLm1hcmtKdW1wRGVzdGluYXRpb24oMSwgbGF6eUV2YWx1YXRpb25EZXN0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogcmVzdWx0VHlwZSwgaXNBc3NpZ25hYmxlOiBmYWxzZSB9O1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NUZXJuYXJ5T3BlcmF0b3Iobm9kZTogQmluYXJ5T3BOb2RlKTogU3RhY2tUeXBlIHtcclxuXHJcbiAgICAgICAgbGV0IGxlZnRUeXBlID0gdGhpcy5wcm9jZXNzTm9kZShub2RlLmZpcnN0T3BlcmFuZCk7XHJcblxyXG4gICAgICAgIGlmIChsZWZ0VHlwZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmVuc3VyZUF1dG9tYXRpY0Nhc3RpbmcobGVmdFR5cGUudHlwZSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsIG51bGwsIG5vZGUuZmlyc3RPcGVyYW5kLCB0cnVlKSkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHNlY29uZE9wZXJhbmQgPSBub2RlLnNlY29uZE9wZXJhbmQ7XHJcbiAgICAgICAgICAgIGlmIChzZWNvbmRPcGVyYW5kICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmIChzZWNvbmRPcGVyYW5kLnR5cGUgIT0gVG9rZW5UeXBlLmJpbmFyeU9wIHx8IHNlY29uZE9wZXJhbmQub3BlcmF0b3IgIT0gVG9rZW5UeXBlLmNvbG9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJBdWYgZGVuIEZyYWdlemVpY2hlbm9wZXJhdG9yIG3DvHNzZW4gLSBtaXQgRG9wcGVscHVua3QgZ2V0cmVubnQgLSB6d2VpIEFsdGVybmF0aXZ0ZXJtZSBmb2xnZW4uXCIsIG5vZGUucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbG0gPSB0aGlzLmN1cnJlbnRQcm9ncmFtLmxhYmVsTWFuYWdlcjtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdmFyaWFudEZhbHNlTGFiZWwgPSBsbS5pbnNlcnRKdW1wTm9kZShUb2tlblR5cGUuanVtcElmRmFsc2UsIG5vZGUucG9zaXRpb24sIHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBmaXJzdFR5cGUgPSB0aGlzLnByb2Nlc3NOb2RlKHNlY29uZE9wZXJhbmQuZmlyc3RPcGVyYW5kKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVuZExhYmVsID0gbG0uaW5zZXJ0SnVtcE5vZGUoVG9rZW5UeXBlLmp1bXBBbHdheXMsIHNlY29uZE9wZXJhbmQuZmlyc3RPcGVyYW5kLnBvc2l0aW9uLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEsIHZhcmlhbnRGYWxzZUxhYmVsKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc2Vjb25kVHlwZSA9IHRoaXMucHJvY2Vzc05vZGUoc2Vjb25kT3BlcmFuZC5zZWNvbmRPcGVyYW5kKTtcclxuICAgICAgICAgICAgICAgICAgICBsbS5tYXJrSnVtcERlc3RpbmF0aW9uKDEsIGVuZExhYmVsKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHR5cGUgPSBmaXJzdFR5cGUudHlwZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vjb25kVHlwZSAhPSBudWxsICYmIHR5cGUgIT0gc2Vjb25kVHlwZS50eXBlICYmIHR5cGUuY2FuQ2FzdFRvKHNlY29uZFR5cGUudHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9IHNlY29uZFR5cGUudHlwZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQXNzaWduYWJsZTogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc1VuYXJ5T3Aobm9kZTogVW5hcnlPcE5vZGUpOiBTdGFja1R5cGUge1xyXG4gICAgICAgIGxldCBsZWZ0VHlwZSA9IHRoaXMucHJvY2Vzc05vZGUobm9kZS5vcGVyYW5kKTtcclxuXHJcbiAgICAgICAgaWYgKGxlZnRUeXBlID09IG51bGwgfHwgbGVmdFR5cGUudHlwZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmIChub2RlLm9wZXJhdG9yID09IFRva2VuVHlwZS5taW51cykge1xyXG4gICAgICAgICAgICBpZiAoIWxlZnRUeXBlLnR5cGUuY2FuQ2FzdFRvKGZsb2F0UHJpbWl0aXZlVHlwZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIE9wZXJhdG9yIC0gaXN0IGbDvHIgZGVuIFR5cCBcIiArIGxlZnRUeXBlLnR5cGUuaWRlbnRpZmllciArIFwiIG5pY2h0IGRlZmluaWVydC5cIiwgbm9kZS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFR5cGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobm9kZS5vcGVyYXRvciA9PSBUb2tlblR5cGUubm90KSB7XHJcbiAgICAgICAgICAgIGlmICghKGxlZnRUeXBlLnR5cGUgPT0gYm9vbGVhblByaW1pdGl2ZVR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrSWZBc3NpZ25tZW50SW5zdGVkT2ZFcXVhbChub2RlLm9wZXJhbmQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgT3BlcmF0b3IgISBpc3QgZsO8ciBkZW4gVHlwIFwiICsgbGVmdFR5cGUudHlwZS5pZGVudGlmaWVyICsgXCIgbmljaHQgZGVmaW5pZXJ0LlwiLCBub2RlLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0VHlwZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFN0YXRlbWVudHMoe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUudW5hcnlPcCxcclxuICAgICAgICAgICAgb3BlcmF0b3I6IG5vZGUub3BlcmF0b3IsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBsZWZ0VHlwZTtcclxuICAgIH1cclxuXHJcbn0iXX0=