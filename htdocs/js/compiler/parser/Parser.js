import { TokenType, TokenTypeReadable } from "../lexer/Token.js";
import { Visibility } from "../types/Class.js";
import { intPrimitiveType, TokenTypeToDataTypeMap } from "../types/PrimitiveTypes.js";
export class Parser {
    constructor(isInConsoleMode) {
        this.isInConsoleMode = isInConsoleMode;
        this.lookahead = 4;
        this.endToken = {
            position: { line: 0, column: 0, length: 1 },
            tt: TokenType.endofSourcecode,
            value: "das Ende des Programms"
        };
        this.tokensNotAfterCasting = [TokenType.multiplication, TokenType.division, TokenType.plus,
            TokenType.minus, TokenType.dot, TokenType.modulo, TokenType.semicolon, TokenType.rightBracket];
    }
    parse(m) {
        this.module = m;
        this.tokenList = m.tokenList;
        this.errorList = [];
        if (this.tokenList.length == 0) {
            this.module.mainProgramAst = [];
            this.module.classDefinitionsAST = [];
            this.module.typeNodes = [];
            this.module.errors[1] = this.errorList;
            return;
        }
        this.pos = 0;
        this.initializeLookahead();
        this.typeNodes = [];
        let lastToken = this.tokenList[this.tokenList.length - 1];
        this.endToken.position = { line: lastToken.position.line, column: lastToken.position.column + lastToken.position.length, length: 1 };
        let astNodes = this.parseMain();
        this.module.mainProgramAst = astNodes.mainProgramAST;
        this.module.classDefinitionsAST = astNodes.classDefinitionAST;
        this.module.mainProgramEnd = astNodes.mainProgramEnd;
        this.module.typeNodes = this.typeNodes;
        this.module.errors[1] = this.errorList;
    }
    initializeLookahead() {
        this.ct = [];
        for (let i = 0; i < this.lookahead; i++) {
            let token = this.endToken;
            while (true) {
                if (this.pos >= this.tokenList.length)
                    break;
                let token1 = this.tokenList[this.pos];
                if (token1.tt == TokenType.comment) {
                    this.lastComment = token1;
                }
                if (token1.tt != TokenType.newline && token1.tt != TokenType.space && token1.tt != TokenType.comment) {
                    token = token1;
                    if (this.lastComment != null) {
                        token.commentBefore = this.lastComment;
                        this.lastComment = null;
                    }
                    break;
                }
                this.pos++;
            }
            this.ct.push(token);
            if (i < this.lookahead - 1) {
                this.pos++;
            }
        }
        this.cct = this.ct[0];
        this.tt = this.cct.tt;
        this.position = this.cct.position;
    }
    nextToken() {
        let token;
        this.lastToken = this.cct;
        while (true) {
            this.pos++;
            if (this.pos >= this.tokenList.length) {
                token = this.endToken;
                break;
            }
            token = this.tokenList[this.pos];
            if (token.tt == TokenType.comment) {
                this.lastComment = token;
            }
            if (token.tt != TokenType.newline && token.tt != TokenType.space && token.tt != TokenType.comment) {
                token.commentBefore = this.lastComment;
                this.lastComment = null;
                break;
            }
        }
        for (let i = 0; i < this.lookahead - 1; i++) {
            this.ct[i] = this.ct[i + 1];
        }
        this.ct[this.lookahead - 1] = token;
        this.cct = this.ct[0];
        this.tt = this.cct.tt;
        this.position = this.cct.position;
    }
    pushError(text, errorLevel = "error", position, quickFix) {
        if (position == null)
            position = Object.assign({}, this.position);
        this.errorList.push({
            text: text,
            position: position,
            quickFix: quickFix,
            level: errorLevel
        });
    }
    expect(tt, skip = true, invokeSemicolonAngel = false) {
        if (this.tt != tt) {
            if (tt == TokenType.semicolon && this.tt == TokenType.endofSourcecode) {
                return true;
            }
            let position = this.cct.position;
            if (tt == TokenType.semicolon && this.lastToken != null) {
                if (this.lastToken.position.line < position.line) {
                    position = {
                        line: this.lastToken.position.line,
                        column: this.lastToken.position.column + this.lastToken.position.length,
                        length: 1
                    };
                }
            }
            let quickFix = null;
            if (tt == TokenType.semicolon && this.lastToken.position.line < this.cct.position.line &&
                !this.isOperatorOrDot(this.lastToken.tt)) {
                quickFix = {
                    title: 'Strichpunkt hier einfügen',
                    editsProvider: (uri) => {
                        return [{
                                resource: uri,
                                edit: {
                                    range: {
                                        startLineNumber: position.line, startColumn: position.column, endLineNumber: position.line, endColumn: position.column,
                                        message: "",
                                        severity: monaco.MarkerSeverity.Error
                                    },
                                    text: ";"
                                }
                            }
                        ];
                    }
                };
                if (invokeSemicolonAngel && this.errorList.length < 3) {
                    this.module.main.getSemicolonAngel().register(position, this.module);
                }
            }
            this.pushError("Erwartet wird: " + TokenTypeReadable[tt] + " - Gefunden wurde: " + TokenTypeReadable[this.tt], "error", position, quickFix);
            return false;
        }
        if (skip) {
            this.nextToken();
        }
        return true;
    }
    isOperatorOrDot(tt) {
        if (tt == TokenType.dot)
            return true;
        for (let op of Parser.operatorPrecedence) {
            for (let operator of op) {
                if (tt == operator)
                    return true;
            }
        }
    }
    isEnd() {
        return this.cct == this.endToken;
    }
    comesToken(token) {
        if (!Array.isArray(token)) {
            return this.tt == token;
        }
        return token.indexOf(this.tt) >= 0;
    }
    getCurrentPosition() {
        return Object.assign({}, this.position);
    }
    getEndOfCurrentToken() {
        let position = this.getCurrentPosition();
        position.column = position.column + this.position.length;
        position.length = 0;
        return position;
    }
    parseMain() {
        let mainProgram = [];
        let classDefinitions = [];
        let mainProgramEnd = {
            column: 0,
            line: 10000,
            length: 1
        };
        while (!this.isEnd()) {
            let oldPos = this.pos;
            if (this.comesToken(Parser.BeforeClassDefinitionTokens)) {
                let cd = this.parseClassDefinition();
                if (cd != null)
                    classDefinitions = classDefinitions.concat(cd);
            }
            else {
                let st = this.parseStatement();
                if (st != null) {
                    mainProgram = mainProgram.concat(st);
                }
                mainProgramEnd = this.getCurrentPosition();
            }
            // emergency-forward:
            if (this.pos == oldPos) {
                this.pos++;
                this.initializeLookahead();
            }
        }
        return {
            mainProgramAST: mainProgram,
            classDefinitionAST: classDefinitions,
            mainProgramEnd: mainProgramEnd
        };
    }
    checkIfStatementHasNoEffekt(st) {
        if (this.isInConsoleMode)
            return;
        if ((st.type == TokenType.binaryOp && Parser.assignmentOperators.indexOf(st.operator) < 0)) {
            let s = "dieses Terms";
            switch (st.operator) {
                case TokenType.plus:
                    s = "dieser Summe";
                    break;
                case TokenType.minus:
                    s = "dieser Differenz";
                    break;
                case TokenType.multiplication:
                    s = "dieses Produkts";
                    break;
                case TokenType.division:
                    s = "dieses Quotienten";
                    break;
            }
            s += " (Operator " + TokenTypeReadable[st.operator] + ")";
            this.pushError(`Der Wert ${s} wird zwar berechnet, aber danach verworfen. Möchtest Du ihn vielleicht einer Variablen zuweisen?`, "info", st.position);
        }
        else if ([TokenType.unaryOp, TokenType.pushConstant,
            TokenType.identifier, TokenType.selectArrayElement].indexOf(st.type) >= 0) {
            this.pushError("Der Wert dieses Terms wird zwar berechnet, aber danach verworfen. Möchtest Du ihn vielleicht einer Variablen zuweisen?", "info", st.position);
        }
    }
    parseStatement(expectSemicolon = true) {
        let retStatements = null;
        switch (this.tt) {
            case TokenType.leftBracket:
            case TokenType.identifier:
            case TokenType.keywordThis:
            case TokenType.keywordSuper:
            case TokenType.keywordFinal:
            case TokenType.charConstant:
            case TokenType.integerConstant:
            case TokenType.stringConstant:
            case TokenType.booleanConstant:
            case TokenType.floatingPointConstant:
            case TokenType.keywordNew:
                let ret = this.parseVariableDeclarationOrTerm();
                if (expectSemicolon)
                    this.expect(TokenType.semicolon, true, true);
                retStatements = ret;
                break;
            case TokenType.leftCurlyBracket:
                let statements = [];
                let positionFrom = this.getCurrentPosition();
                this.nextToken();
                //@ts-ignore
                while (this.tt != TokenType.rightCurlyBracket && this.tt != TokenType.endofSourcecode
                    && Parser.BeforeClassDefinitionTokens.indexOf(this.tt) < 0) {
                    statements = statements.concat(this.parseStatement());
                }
                let positionTo = this.getCurrentPosition();
                positionTo.column = positionTo.column + positionTo.length;
                positionTo.length = 0;
                this.expect(TokenType.rightCurlyBracket);
                retStatements = [{
                        type: TokenType.scopeNode,
                        position: positionFrom,
                        positionTo: positionTo,
                        statements: statements
                    }];
                break;
            case TokenType.keywordWhile:
                retStatements = this.parseWhile();
                break;
            case TokenType.keywordFor:
                retStatements = this.parseFor();
                break;
            case TokenType.keywordDo:
                retStatements = this.parseDo();
                break;
            case TokenType.keywordIf:
                retStatements = this.parseIf();
                break;
            case TokenType.keywordReturn:
                retStatements = this.parseReturn();
                break;
            case TokenType.keywordPrint:
            case TokenType.keywordPrintln:
                retStatements = this.parsePrint();
                break;
            case TokenType.keywordSwitch:
                retStatements = this.parseSwitch();
                break;
            case TokenType.keywordBreak:
                let position = this.getCurrentPosition();
                this.nextToken();
                retStatements = [{
                        type: TokenType.keywordBreak,
                        position: position
                    }];
                break;
            case TokenType.keywordContinue:
                let position1 = this.getCurrentPosition();
                this.nextToken();
                retStatements = [{
                        type: TokenType.keywordContinue,
                        position: position1
                    }];
                break;
            case TokenType.semicolon:
                break;
            default:
                let s = TokenTypeReadable[this.tt];
                if (s != this.cct.value)
                    s += "(" + this.cct.value + ")";
                s += " wird hier nicht erwartet.";
                this.pushError(s);
                let dontSkip = Parser.BeforeClassDefinitionTokens.indexOf(this.tt) >= 0;
                if (!dontSkip) {
                    this.nextToken();
                }
                break;
        }
        if (retStatements == null) {
            // skip additional semicolons if present...
            while (this.tt == TokenType.semicolon && expectSemicolon) {
                this.nextToken();
            }
        }
        if (retStatements != null && retStatements.length > 0) {
            let retStmt = retStatements[retStatements.length - 1];
            if (retStmt != null) {
                this.checkIfStatementHasNoEffekt(retStatements[retStatements.length - 1]);
            }
            else {
                retStatements = null;
            }
        }
        return retStatements;
    }
    parseReturn() {
        let position = this.getCurrentPosition();
        this.nextToken();
        let term;
        if (!(this.tt == TokenType.semicolon)) {
            term = this.parseTerm();
            this.expect(TokenType.semicolon, true, true);
        }
        return [{
                type: TokenType.keywordReturn,
                position: position,
                term: term
            }];
    }
    parseWhile() {
        let position = this.getCurrentPosition();
        this.nextToken(); // consume while
        let scopeFrom = this.getCurrentPosition();
        if (this.expect(TokenType.leftBracket, true)) {
            let condition = this.parseTerm();
            let rightBracketPosition = this.getCurrentPosition();
            this.module.pushMethodCallPosition(position, [], "while", rightBracketPosition);
            this.expect(TokenType.rightBracket, true);
            if (this.tt == TokenType.semicolon) {
                this.pushError("Diese while-loop wiederholt nur den Strichpunkt (leere Anweisung).", "warning");
            }
            let statements = this.parseStatement();
            let scopeTo = this.getCurrentPosition();
            scopeTo.length = 0;
            if (statements != null && statements.length > 0 && statements[0].type == TokenType.scopeNode) {
                scopeTo = statements[0].positionTo;
            }
            return [
                {
                    type: TokenType.keywordWhile,
                    position: position,
                    scopeFrom: scopeFrom,
                    scopeTo: scopeTo,
                    condition: condition,
                    statements: statements
                }
            ];
        }
        return [];
    }
    parseFor() {
        let position = this.getCurrentPosition();
        let semicolonPositions = [];
        this.nextToken(); // consume for
        let scopeFrom = this.getCurrentPosition();
        if (this.expect(TokenType.leftBracket, true)) {
            if (this.ct[2].tt == TokenType.colon) {
                return this.parseForLoopOverCollection(position, scopeFrom);
            }
            let statementsBefore = this.parseStatement(false);
            semicolonPositions.push(this.getCurrentPosition());
            this.expect(TokenType.semicolon);
            let condition = this.parseTerm();
            semicolonPositions.push(this.getCurrentPosition());
            this.expect(TokenType.semicolon, true);
            let statementsAfter = this.parseStatement(false);
            let rightBracketPosition = this.getCurrentPosition();
            this.expect(TokenType.rightBracket, true);
            this.module.pushMethodCallPosition(position, semicolonPositions, "for", rightBracketPosition);
            if (this.tt == TokenType.semicolon) {
                this.pushError("Diese for-loop wiederholt nur den Strichpunkt (leere Anweisung).", "warning");
            }
            let statements = this.parseStatement();
            let scopeTo = this.getCurrentPosition();
            scopeTo.length = 0;
            if (statements != null && statements.length > 0 && statements[0].type == TokenType.scopeNode) {
                scopeTo = statements[0].positionTo;
            }
            if (condition == null) {
                condition = {
                    type: TokenType.pushConstant,
                    position: this.getCurrentPosition(),
                    constantType: TokenType.booleanConstant,
                    constant: true
                };
            }
            return [
                {
                    type: TokenType.keywordFor,
                    position: position,
                    scopeFrom: scopeFrom,
                    scopeTo: scopeTo,
                    condition: condition,
                    statementsBefore: statementsBefore,
                    statementsAfter: statementsAfter,
                    statements: statements
                }
            ];
        }
        return [];
    }
    parseForLoopOverCollection(position, scopeFrom) {
        let variableType = this.parseType();
        let variableIdentifier = this.cct.value;
        let variableIdentifierPosition = this.getCurrentPosition();
        this.nextToken();
        this.expect(TokenType.colon, true);
        let collection = this.parseTerm();
        this.expect(TokenType.rightBracket, true);
        if (this.tt == TokenType.semicolon) {
            this.pushError("Diese for-loop wiederholt nur den Strichpunkt (leere Anweisung).", "warning");
        }
        let statements = this.parseStatement();
        let scopeTo = this.getCurrentPosition();
        scopeTo.length = 0;
        if (statements != null && statements.length > 0 && statements[0].type == TokenType.scopeNode) {
            scopeTo = statements[0].positionTo;
        }
        if (collection == null || variableType == null || statements == null)
            return [];
        return [
            {
                type: TokenType.forLoopOverCollection,
                position: position,
                scopeFrom: scopeFrom,
                scopeTo: scopeTo,
                variableIdentifier: variableIdentifier,
                variableType: variableType,
                variablePosition: variableIdentifierPosition,
                collection: collection,
                statements: statements
            }
        ];
    }
    parsePrint() {
        let tt = this.tt;
        let position = this.getCurrentPosition();
        this.nextToken();
        if (this.expect(TokenType.leftBracket, false)) {
            let mcp = this.parseMethodCallParameters();
            let paramenters = mcp.nodes;
            if (paramenters.length > 2) {
                this.pushError("Die Methoden print und println haben maximal zwei Parameter.", "error", position);
            }
            this.expect(TokenType.semicolon, true, true);
            return [{
                    //@ts-ignore
                    type: tt,
                    position: position,
                    text: paramenters.length == 0 ? null : paramenters[0],
                    color: paramenters.length <= 1 ? null : paramenters[1],
                    commaPositions: mcp.commaPositions,
                    rightBracketPosition: mcp.rightBracketPosition
                }];
        }
        return null;
    }
    parseSwitch() {
        let position = this.getCurrentPosition();
        this.nextToken();
        if (this.expect(TokenType.leftBracket, true)) {
            let switchTerm = this.parseTerm();
            this.module.pushMethodCallPosition(position, [], "switch", this.getCurrentPosition());
            this.expect(TokenType.rightBracket);
            let scopeFrom = this.getCurrentPosition();
            this.expect(TokenType.leftCurlyBracket, true);
            let switchNode = {
                type: TokenType.keywordSwitch,
                position: position,
                scopeFrom: scopeFrom,
                scopeTo: null,
                condition: switchTerm,
                caseNodes: []
            };
            let defaultAlreadyThere = false;
            while (this.tt == TokenType.keywordCase || this.tt == TokenType.keywordDefault) {
                let casePosition = this.getCurrentPosition();
                let isDefault = this.tt == TokenType.keywordDefault;
                if (isDefault) {
                    if (defaultAlreadyThere) {
                        this.pushError("Eine switch-Anweisung darf nur maximal einen default-Zweig haben.", "error", casePosition);
                    }
                    else {
                        defaultAlreadyThere = true;
                    }
                }
                this.nextToken();
                let caseTerm = null;
                if (!isDefault) {
                    caseTerm = this.parseUnary();
                }
                this.expect(TokenType.colon, true);
                let statements = [];
                //@ts-ignore
                while (this.tt != TokenType.rightCurlyBracket && this.tt != TokenType.endofSourcecode
                    && this.tt != TokenType.keywordCase && this.tt != TokenType.keywordDefault) {
                    let oldPos = this.pos;
                    let statement = this.parseStatement();
                    if (statement != null) {
                        statements = statements.concat(statement);
                    }
                    if (oldPos == this.pos) {
                        this.pushError(this.cct.value + " wird hier nicht erwartet.");
                        this.nextToken();
                    }
                }
                let switchCaseNode = {
                    type: TokenType.keywordCase,
                    position: casePosition,
                    caseTerm: caseTerm,
                    statements: statements
                };
                switchNode.caseNodes.push(switchCaseNode);
            }
            switchNode.scopeTo = this.getEndOfCurrentToken();
            this.expect(TokenType.rightCurlyBracket, true);
            return [switchNode];
        }
        return null;
    }
    parseIf() {
        let position = this.getCurrentPosition();
        this.nextToken(); // consume if
        if (this.expect(TokenType.leftBracket, true)) {
            let condition = this.parseTerm();
            let rightBracketPosition = this.getCurrentPosition();
            this.module.pushMethodCallPosition(position, [], "if", rightBracketPosition);
            this.expect(TokenType.rightBracket, true);
            if (this.tt == TokenType.semicolon) {
                this.pushError("Falls die Bedingung zutrifft, wird nur der Strichpunkt ausgeführt (leere Anweisung).", "warning");
            }
            let statements = this.parseStatement();
            if (this.tt == TokenType.semicolon) {
                this.nextToken();
            }
            let elseStatements = null;
            if (this.comesToken(TokenType.keywordElse)) {
                this.nextToken();
                elseStatements = this.parseStatement();
            }
            if (condition == null && this.errorList.length == 0) {
                condition = {
                    type: TokenType.pushConstant,
                    position: this.getCurrentPosition(),
                    constantType: TokenType.booleanConstant,
                    constant: true
                };
            }
            return [
                {
                    type: TokenType.keywordIf,
                    position: position,
                    condition: condition,
                    statementsIfTrue: statements,
                    statementsIfFalse: elseStatements
                }
            ];
        }
        return [];
    }
    parseDo() {
        // let i = 10;
        // do {
        //     i = i +7;
        // } while (i < 100);
        let position = this.getCurrentPosition();
        let scopeFrom = this.getCurrentPosition();
        this.nextToken(); // consume do
        let statements = this.parseStatement();
        if (this.expect(TokenType.keywordWhile, true)) {
            if (this.expect(TokenType.leftBracket, true)) {
                let condition = this.parseTerm();
                let scopeTo = this.getEndOfCurrentToken();
                this.expect(TokenType.rightBracket, true);
                return [
                    {
                        type: TokenType.keywordDo,
                        position: position,
                        scopeFrom: scopeFrom,
                        scopeTo: scopeTo,
                        condition: condition,
                        statements: statements
                    }
                ];
            }
        }
        return [];
    }
    comesGenericType() {
        if (this.ct[1].tt != TokenType.lower)
            return false;
        if (this.ct[2].tt != TokenType.identifier)
            return false;
        return this.ct[3].tt == TokenType.greater || this.ct[3].tt == TokenType.comma;
    }
    parseVariableDeclarationOrTerm() {
        // Two identifiers in a row or identifier[]
        if ((this.tt == TokenType.identifier || this.tt == TokenType.keywordFinal) &&
            (this.ct[1].tt == TokenType.identifier
                || this.ct[1].tt == TokenType.leftRightSquareBracket ||
                this.comesGenericType())) {
            let ret = [];
            let type = null;
            do {
                if (type != null)
                    this.expect(TokenType.comma, true);
                let vd = this.parseVariableDeclaration(type);
                ret.push(vd);
                type = vd === null || vd === void 0 ? void 0 : vd.variableType;
                //@ts-ignore
            } while (this.tt == TokenType.comma);
            return ret;
        }
        else {
            return [this.parseTerm()];
        }
    }
    parseTerm() {
        return this.parseTermBinary(0);
    }
    parseTermBinary(precedence) {
        let left;
        if (precedence < Parser.operatorPrecedence.length - 1) {
            left = this.parseTermBinary(precedence + 1);
        }
        else {
            left = this.parsePlusPlusMinusMinus();
        }
        let operators = Parser.operatorPrecedence[precedence];
        if (left == null || operators.indexOf(this.tt) < 0) {
            return left;
        }
        let first = true;
        // 28.05.2021: This broke evalation of ternery operator, so i commented it out.
        // Don't know why it was there in the first place, so i expect some havoc to come...
        // 15 Minutes later:
        // This if-clause was here to make terms aber case possible, e.g. switch(a){ case 7 + 2: println("Here!")}
        // -> Bad idea. I changed this to only parse unary Terms left of the colon so i can comment out this if-clause here
        // and fix the ternary operator.
        //
        // if (this.tt == TokenType.colon) {
        //     return left;
        // }
        while (first || operators.indexOf(this.tt) >= 0) {
            let operator = this.tt;
            first = false;
            let position = this.getCurrentPosition();
            this.nextToken();
            for (let opData of [{ op: TokenType.lower, wrong: "=<", right: "<=", correctOp: TokenType.lowerOrEqual },
                { op: TokenType.greater, wrong: "=>", right: ">=", correctOp: TokenType.greaterOrEqual }]) {
                if (operator == TokenType.assignment && this.tt == opData.op) {
                    let position2 = this.getCurrentPosition();
                    this.pushError(`Den Operator ${opData.wrong} gibt es nicht. Du meintest sicher: ${opData.right}`, "error", Object.assign({}, position, { length: 2 }), {
                        title: `${opData.wrong} durch ${opData.right} ersetzen`,
                        editsProvider: (uri) => {
                            return [
                                {
                                    resource: uri,
                                    edit: {
                                        range: { startLineNumber: position.line, startColumn: position.column, endLineNumber: position.line, endColumn: position2.column + position2.length },
                                        text: opData.right
                                    }
                                }
                            ];
                        }
                    });
                    this.nextToken();
                    operator = opData.correctOp;
                }
            }
            let right;
            if (precedence < Parser.operatorPrecedence.length - 1) {
                right = this.parseTermBinary(precedence + 1);
            }
            else {
                right = this.parsePlusPlusMinusMinus();
            }
            if (right != null) {
                let constantFolding = false;
                if (this.isConstant(left) && this.isConstant(right)) {
                    let pcLeft = left;
                    let pcRight = right;
                    let typeLeft = TokenTypeToDataTypeMap[pcLeft.constantType];
                    let typeRight = TokenTypeToDataTypeMap[pcRight.constantType];
                    let resultType = typeLeft.getResultType(operator, typeRight);
                    if (resultType != null) {
                        constantFolding = true;
                        let result = typeLeft.compute(operator, { type: typeLeft, value: pcLeft.constant }, { type: typeRight, value: pcRight.constant });
                        this.considerIntDivisionWarning(operator, typeLeft, pcLeft.constant, typeRight, pcRight.constant, position);
                        pcLeft.constantType = resultType.toTokenType();
                        pcLeft.constant = result;
                        pcLeft.position.length = pcRight.position.column + pcRight.position.length - pcLeft.position.column;
                    }
                }
                if (!constantFolding)
                    left = {
                        type: TokenType.binaryOp,
                        position: position,
                        operator: operator,
                        firstOperand: left,
                        secondOperand: right
                    };
            }
        }
        return left;
    }
    considerIntDivisionWarning(operator, typeLeft, leftConstant, typeRight, rightConstant, position) {
        if (operator == TokenType.division) {
            if (this.isIntegerType(typeLeft) && this.isIntegerType(typeRight)) {
                if (rightConstant != 0 && leftConstant / rightConstant != Math.floor(leftConstant / rightConstant)) {
                    this.pushError("Da " + leftConstant + " und " + rightConstant + " ganzzahlige Werte sind, wird diese Division als Ganzzahldivision ausgeführt und ergibt den Wert " + Math.floor(leftConstant / rightConstant) + ". Falls das nicht gewünscht ist, hänge '.0' an einen der Operanden.", "info", position);
                }
            }
        }
    }
    isIntegerType(type) {
        return type == intPrimitiveType;
    }
    isConstant(node) {
        return (node != null && node.type == TokenType.pushConstant);
    }
    parsePlusPlusMinusMinus() {
        let incrementDecrementBefore = null;
        let position = null;
        if (this.comesToken([TokenType.doublePlus, TokenType.doubleMinus])) {
            incrementDecrementBefore = this.tt;
            position = this.getCurrentPosition();
            this.nextToken();
        }
        let t = this.parseUnary();
        if (incrementDecrementBefore != null) {
            t = {
                type: TokenType.incrementDecrementBefore,
                position: position,
                operator: incrementDecrementBefore,
                operand: t
            };
        }
        if (this.comesToken([TokenType.doublePlus, TokenType.doubleMinus])) {
            t = {
                type: TokenType.incrementDecrementAfter,
                position: this.getCurrentPosition(),
                operator: this.tt,
                operand: t
            };
            this.nextToken();
        }
        return t;
    }
    // -, not, this, super, a.b.c[][].d, a.b(), b() (== this.b()), super.b(), super()
    parseUnary() {
        let term;
        let position = this.getCurrentPosition();
        switch (this.tt) {
            case TokenType.leftBracket:
                return this.parseDotOrArrayChains(this.bracketOrCasting());
            case TokenType.minus:
            case TokenType.not:
            case TokenType.tilde:
                position = position;
                let tt1 = this.tt;
                this.nextToken();
                term = this.parseUnary();
                if (this.isConstant(term)) {
                    let pcTerm = term;
                    let typeTerm = TokenTypeToDataTypeMap[pcTerm.constantType];
                    let resultType = typeTerm.getResultType(tt1);
                    if (resultType != null) {
                        let result = typeTerm.compute(tt1, { type: typeTerm, value: pcTerm.constant });
                        pcTerm.constantType = resultType.toTokenType();
                        pcTerm.constant = result;
                        position.length = pcTerm.position.column - position.column + 1;
                        return pcTerm;
                    }
                }
                return {
                    type: TokenType.unaryOp,
                    position: position,
                    operand: term,
                    operator: tt1
                };
            case TokenType.keywordSuper:
                if (this.ct[1].tt == TokenType.leftBracket) {
                    this.nextToken(); // skip "super"
                    let parameters = this.parseMethodCallParameters();
                    term = {
                        type: TokenType.superConstructorCall,
                        position: position,
                        operands: parameters.nodes,
                        commaPositions: parameters.commaPositions,
                        rightBracketPosition: parameters.rightBracketPosition
                    };
                    return term;
                }
                else {
                    term = {
                        type: TokenType.keywordSuper,
                        position: position
                    };
                }
                this.nextToken();
                return this.parseDotOrArrayChains(term);
            case TokenType.keywordThis:
                if (this.ct[1].tt == TokenType.leftBracket) {
                    this.nextToken(); // skip "super"
                    let parameters = this.parseMethodCallParameters();
                    term = {
                        type: TokenType.constructorCall,
                        position: position,
                        operands: parameters.nodes,
                        commaPositions: parameters.commaPositions,
                        rightBracketPosition: parameters.rightBracketPosition
                    };
                    return term;
                }
                else {
                    term = {
                        type: TokenType.keywordThis,
                        position: position
                    };
                }
                this.nextToken();
                return this.parseDotOrArrayChains(term);
            case TokenType.keywordNew:
                return this.parseDotOrArrayChains(this.parseNew());
            case TokenType.integerConstant:
            case TokenType.charConstant:
            case TokenType.floatingPointConstant:
            case TokenType.stringConstant:
            case TokenType.booleanConstant:
                term = {
                    type: TokenType.pushConstant,
                    position: this.getCurrentPosition(),
                    constantType: this.tt,
                    constant: this.cct.value
                };
                let isStringConstant = this.tt == TokenType.stringConstant;
                this.nextToken();
                if (isStringConstant)
                    return this.parseDotOrArrayChains(term);
                return term;
            case TokenType.keywordNull:
                term = {
                    type: TokenType.pushConstant,
                    position: this.getCurrentPosition(),
                    constantType: TokenType.keywordNull,
                    constant: null
                };
                this.nextToken();
                return term;
            case TokenType.identifier: // attribute of current class or local variable
                let identifier1 = this.cct.value;
                let position1 = this.getCurrentPosition();
                this.nextToken();
                //@ts-ignore
                if (this.tt == TokenType.leftBracket) {
                    let parameters = this.parseMethodCallParameters();
                    let rightBracketPosition = parameters.rightBracketPosition;
                    term = {
                        type: TokenType.callMethod,
                        position: position1,
                        rightBracketPosition: rightBracketPosition,
                        operands: parameters.nodes,
                        object: term,
                        identifier: identifier1,
                        commaPositions: parameters.commaPositions
                    };
                }
                else {
                    term = {
                        type: TokenType.identifier,
                        identifier: identifier1,
                        position: position
                    };
                }
                return this.parseDotOrArrayChains(term);
            default:
                this.pushError("Erwartet wird eine Variable, ein Methodenaufruf oder this oder super. Gefunden wurde: " + this.cct.value);
                return null;
        }
    }
    bracketOrCasting() {
        let position = this.getCurrentPosition();
        this.nextToken(); // consume (
        if (this.tt == TokenType.identifier && this.ct[1].tt == TokenType.rightBracket &&
            this.tokensNotAfterCasting.indexOf(this.ct[2].tt) < 0) {
            let castToType = this.parseType();
            let position1 = this.getCurrentPosition(); // Position of )
            position.length = position1.column - position.column + 1;
            this.expect(TokenType.rightBracket, true);
            let whatToCast = this.parsePlusPlusMinusMinus();
            return {
                type: TokenType.castValue,
                position: position,
                castToType: castToType,
                whatToCast: whatToCast
            };
        }
        else {
            let term = this.parseTerm();
            let rightBracketPosition = this.getCurrentPosition();
            this.expect(TokenType.rightBracket, true);
            if (this.isConstant(term)) {
                return term;
            }
            let bracketsNode = {
                position: rightBracketPosition,
                type: TokenType.rightBracket,
                termInsideBrackets: term
            };
            return bracketsNode;
        }
    }
    parseNew() {
        this.nextToken();
        let position = this.getCurrentPosition();
        if (this.expect(TokenType.identifier, false)) {
            let identifier = this.cct.value;
            let identifierPosition = this.getCurrentPosition();
            this.nextToken();
            let genericParameterTypes = null;
            if (this.tt == TokenType.lower) {
                genericParameterTypes = [];
                let first = true;
                this.nextToken();
                //@ts-ignore
                while ((first && this.tt == TokenType.identifier) || (!first && this.tt == TokenType.comma)) {
                    if (!first)
                        this.nextToken(); // consume comma
                    first = false;
                    genericParameterTypes.push(this.parseType());
                }
                this.expect(TokenType.greater);
                if (genericParameterTypes.length == 0)
                    genericParameterTypes = null;
            }
            if (this.tt == TokenType.leftSquareBracket || this.tt == TokenType.leftRightSquareBracket) {
                let typenode = {
                    type: TokenType.type,
                    position: position,
                    arrayDimension: 0,
                    identifier: identifier,
                    genericParameterTypes: genericParameterTypes
                };
                this.typeNodes.push(typenode);
                let elementCount = [];
                while (this.tt == TokenType.leftSquareBracket || this.tt == TokenType.leftRightSquareBracket) {
                    typenode.arrayDimension++;
                    //@ts-ignore
                    if (this.tt == TokenType.leftRightSquareBracket) {
                        elementCount.push(null);
                        this.nextToken();
                    }
                    else {
                        this.nextToken();
                        elementCount.push(this.parseTerm());
                        this.expect(TokenType.rightSquareBracket, true);
                    }
                }
                let initialization = null;
                if (this.tt == TokenType.leftCurlyBracket) {
                    initialization = this.parseArrayLiteral(typenode);
                }
                let newArrayNode = {
                    type: TokenType.newArray,
                    position: position,
                    arrayType: typenode,
                    elementCount: elementCount,
                    initialization: initialization
                };
                return newArrayNode;
            }
            else if (this.tt == TokenType.leftBracket) {
                let parameters = this.parseMethodCallParameters();
                let classType = {
                    type: TokenType.type,
                    position: identifierPosition,
                    arrayDimension: 0,
                    identifier: identifier,
                    genericParameterTypes: genericParameterTypes
                };
                this.typeNodes.push(classType);
                return {
                    type: TokenType.newObject,
                    position: position,
                    classType: classType,
                    constructorOperands: parameters.nodes,
                    rightBracketPosition: parameters.rightBracketPosition,
                    commaPositions: parameters.commaPositions
                };
            }
            else {
                this.pushError("Konstruktoraufruf (also runde Klammer auf) oder Array-Intanzierung (eckige Klammer auf) erwartet.", "error", this.getCurrentPosition());
            }
        }
        return null;
    }
    parseArrayLiteral(arrayType) {
        // expects { as next token
        let nodes = [];
        let position = this.getCurrentPosition();
        let dimension = null;
        this.expect(TokenType.leftCurlyBracket, true);
        if (this.tt != TokenType.rightCurlyBracket) {
            let first = true;
            while (first || this.tt == TokenType.comma) {
                let position1 = this.getCurrentPosition();
                if (!first) {
                    this.nextToken(); // consume comma
                }
                first = false;
                let newDimension;
                if (this.tt == TokenType.leftCurlyBracket) {
                    let newType = {
                        type: TokenType.type,
                        position: this.getCurrentPosition(),
                        arrayDimension: arrayType.arrayDimension - 1,
                        identifier: arrayType.identifier
                    };
                    this.typeNodes.push(newType);
                    let al = this.parseArrayLiteral(newType);
                    newDimension = al.dimension + 1;
                    nodes.push(al);
                }
                else {
                    nodes.push(this.parseTerm());
                    newDimension = 1;
                }
                if (dimension != null) {
                    if (dimension != newDimension) {
                        this.pushError("Die Dimension dieses Array-Literals (" + (newDimension - 1) + " ist ungleich derjenigen der vorangegangenen Array-Literale (" + (dimension - 1) + ").", "error", position1);
                    }
                }
                dimension = newDimension;
            }
        }
        this.expect(TokenType.rightCurlyBracket, true);
        let ain = {
            type: TokenType.arrayInitialization,
            position: position,
            arrayType: arrayType,
            dimension: dimension,
            nodes: nodes
        };
        return ain;
    }
    parseMethodCallParameters() {
        // Assumption: current token is (        
        this.nextToken();
        if (this.tt == TokenType.rightBracket) {
            let rightBracketPosition = this.getCurrentPosition();
            this.nextToken();
            return { rightBracketPosition: rightBracketPosition, nodes: [], commaPositions: [] };
        }
        let parameters = [];
        let commaPositions = [];
        while (true) {
            let pos = this.pos;
            let parameter = this.parseTerm();
            if (parameter != null) {
                parameters.push(parameter);
            }
            if (this.tt != TokenType.comma) {
                break;
            }
            else {
                commaPositions.push(this.getCurrentPosition());
                this.nextToken(); // consume comma
            }
            // emergency-step:
            if (this.pos == pos) {
                this.nextToken();
            }
        }
        let position = this.getCurrentPosition();
        let rightBracketFound = this.expect(TokenType.rightBracket, true);
        return { rightBracketPosition: rightBracketFound ? position : null, nodes: parameters, commaPositions: commaPositions };
    }
    parseDotOrArrayChains(term) {
        if (term == null)
            return null;
        while (this.comesToken([TokenType.dot, TokenType.leftSquareBracket])) {
            if (this.tt == TokenType.dot) {
                this.nextToken();
                //@ts-ignore
                if (this.tt != TokenType.identifier) {
                    this.pushError("Erwartet wird der Bezeichner eines Attributs oder einer Methode, gefunden wurde: " + this.cct.value);
                    return term;
                }
                let identifier = this.cct.value;
                let position = this.getCurrentPosition();
                this.nextToken();
                //@ts-ignore
                if (this.tt == TokenType.leftBracket) {
                    let parameters = this.parseMethodCallParameters();
                    term = {
                        type: TokenType.callMethod,
                        position: position,
                        rightBracketPosition: parameters.rightBracketPosition,
                        operands: parameters.nodes,
                        object: term,
                        identifier: identifier,
                        commaPositions: parameters.commaPositions
                    };
                }
                else {
                    term = {
                        type: TokenType.pushAttribute,
                        position: position,
                        identifier: identifier,
                        object: term
                    };
                }
            }
            else {
                // let position = this.getCurrentPosition();
                let position = term.position;
                this.nextToken();
                let index = this.parseTerm();
                let positionEnd = this.getCurrentPosition();
                let position1 = Object.assign({}, position);
                this.expect(TokenType.rightSquareBracket, true);
                if (positionEnd.line == position.line) {
                    position1.length = positionEnd.column + positionEnd.length - position1.column;
                }
                else {
                    position1 = positionEnd;
                }
                term = {
                    type: TokenType.selectArrayElement,
                    position: position1,
                    index: index,
                    object: term
                };
            }
        }
        return term;
    }
    parseVariableDeclaration(type) {
        let isFinal = false;
        if (this.tt == TokenType.keywordFinal) {
            isFinal = true;
            this.nextToken();
        }
        if (type == null) {
            type = this.parseType();
        }
        if (this.tt != TokenType.identifier) {
            this.pushError("Hier wird ein Bezeichner (Name) einer Variable erwartet.", "error", this.getCurrentPosition());
            return null;
        }
        let identifier = this.cct.value;
        let position = this.getCurrentPosition();
        this.nextToken();
        let initialization = null;
        //@ts-ignore
        if (this.tt == TokenType.assignment) {
            this.nextToken();
            //@ts-ignore
            if (type.arrayDimension > 0 && this.tt == TokenType.leftCurlyBracket) {
                initialization = this.parseArrayLiteral(type);
            }
            else {
                initialization = this.parseTerm();
            }
        }
        //@ts-ignore
        if (this.tt == TokenType.endofSourcecode && type == null && identifier == null)
            return null;
        return {
            type: TokenType.localVariableDeclaration,
            position: position,
            identifier: identifier,
            variableType: type,
            initialization: initialization,
            isFinal: isFinal
        };
    }
    parseType() {
        /**
         * e.g. int, int[][], Integer, ArrayList<Integer> ,HashMap<Integer, ArrayList<String>>[][]
         */
        if (this.tt != TokenType.identifier && this.tt != TokenType.keywordVoid) {
            this.pushError("Erwartet wird ein Datentyp. Dieser muss mit einem Bezeichner beginnen. Gefunden wurde: " + this.cct.value, "error", this.getCurrentPosition());
            this.nextToken();
            return {
                type: TokenType.type,
                position: this.getCurrentPosition(),
                arrayDimension: 0,
                identifier: "int",
                genericParameterTypes: []
            };
        }
        let identifier = this.cct.value;
        let position = this.getCurrentPosition();
        this.nextToken();
        let genericParameterTypes = null;
        //@ts-ignore
        if (this.tt == TokenType.lower) {
            genericParameterTypes = [];
            let first = true;
            this.nextToken();
            //@ts-ignore
            while ((first && this.tt == TokenType.identifier) || (!first && this.tt == TokenType.comma)) {
                if (!first)
                    this.nextToken(); // consume comma
                first = false;
                genericParameterTypes.push(this.parseType());
            }
            this.expect(TokenType.greater);
        }
        let arrayDimension = 0;
        //@ts-ignore
        while (this.tt == TokenType.leftRightSquareBracket) {
            arrayDimension++;
            position.length += 2;
            this.nextToken();
        }
        let typenode = {
            type: TokenType.type,
            position: position,
            arrayDimension: arrayDimension,
            identifier: identifier,
            genericParameterTypes: genericParameterTypes
        };
        this.typeNodes.push(typenode);
        return typenode;
    }
    parseClassDefinition() {
        let commentBefore = this.cct.commentBefore;
        let modifiers = this.collectModifiers();
        if (!this.comesToken(Parser.ClassTokens)) {
            this.pushError("Erwartet wird class, interface oder enum. Gefunden wurde: " + this.cct.value);
            return null;
        }
        let classType = this.tt;
        this.nextToken();
        if (this.expect(TokenType.identifier, false)) {
            let identifier = this.cct.value;
            let position = this.getCurrentPosition();
            this.nextToken();
            let typeParameters = [];
            // For Generics: parse expression like <E, F extends Test implements Comparable<Test>>
            if (this.tt == TokenType.lower) {
                typeParameters = this.parseTypeParameterDefinition();
            }
            let extendsImplements = this.parseExtendsImplements(classType == TokenType.keywordInterface);
            if (classType == TokenType.keywordEnum) {
                return this.parseEnum(identifier, extendsImplements, position, modifiers.visibility, commentBefore);
            }
            let scopeFrom = this.getCurrentPosition();
            if (this.expect(TokenType.leftCurlyBracket, true)) {
                let methodsAndAttributes = this.parseClassBody(classType, identifier);
                let scopeTo = this.getEndOfCurrentToken();
                this.expect(TokenType.rightCurlyBracket, true);
                switch (classType) {
                    case TokenType.keywordClass: return {
                        type: TokenType.keywordClass,
                        position: position,
                        scopeFrom: scopeFrom,
                        scopeTo: scopeTo,
                        identifier: identifier,
                        attributes: methodsAndAttributes.attributes,
                        methods: methodsAndAttributes.methods,
                        isAbstract: modifiers.isAbstract,
                        visibility: modifiers.visibility,
                        extends: extendsImplements.extends,
                        implements: extendsImplements.implements,
                        typeParameters: typeParameters,
                        commentBefore: commentBefore
                    };
                    case TokenType.keywordInterface: return {
                        type: TokenType.keywordInterface,
                        position: position,
                        identifier: identifier,
                        scopeFrom: scopeFrom,
                        scopeTo: scopeTo,
                        methods: methodsAndAttributes.methods,
                        typeParameters: typeParameters,
                        extends: extendsImplements.implements,
                        commentBefore: commentBefore
                    };
                }
            }
        }
    }
    parseTypeParameterDefinition() {
        let typeParameters = [];
        let identifierMap = {};
        this.expect(TokenType.lower, true);
        let first = true;
        while ((first && this.tt == TokenType.identifier) || (!first && this.tt == TokenType.comma)) {
            if (!first)
                this.expect(TokenType.comma, true);
            let tp = {
                type: TokenType.typeParameter,
                position: this.getCurrentPosition(),
                identifier: this.cct.value,
                extends: null,
                implements: null
            };
            if (identifierMap[tp.identifier] != null) {
                this.pushError("Zwei Typparameter dürfe nicht denselben Bezeichner tragen.");
            }
            identifierMap[tp.identifier] = true;
            this.nextToken();
            let extendsImplements = this.parseTypeParameterBounds();
            tp.extends = extendsImplements.extends;
            if (tp.extends != null && tp.extends.arrayDimension > 0) {
                this.pushError("Der Datentyp des Typparameters " + tp.identifier + " darf kein Array sein.");
            }
            tp.implements = extendsImplements.implements;
            tp.implements.forEach((im) => {
                if (im.arrayDimension > 0) {
                    this.pushError("Der Datentyp des Typparameters " + tp.identifier + " darf kein Array sein.");
                }
            });
            first = false;
            typeParameters.push(tp);
        }
        this.expect(TokenType.greater, true);
        return typeParameters;
    }
    parseEnum(identifier, extendsImplements, position, visibility, commentBefore) {
        if (extendsImplements.extends != null) {
            this.pushError("Ein enum kann nicht mit extends erweitert werden.");
        }
        if (extendsImplements.implements.length > 0) {
            this.pushError("Ein enum kann kein Interface implementieren.");
        }
        let scopeFrom = this.getCurrentPosition();
        if (this.expect(TokenType.leftCurlyBracket, true)) {
            let values = this.parseEnumValues();
            let methodsAndAttributes = this.parseClassBody(TokenType.keywordEnum, identifier);
            let scopeTo = this.getEndOfCurrentToken();
            this.expect(TokenType.rightCurlyBracket, true);
            return {
                type: TokenType.keywordEnum,
                position: position,
                scopeFrom: scopeFrom,
                scopeTo: scopeTo,
                attributes: methodsAndAttributes.attributes,
                methods: methodsAndAttributes.methods,
                identifier: identifier,
                values: values,
                visibility: visibility,
                commentBefore: commentBefore
            };
        }
        return null;
    }
    parseEnumValues() {
        let values = [];
        let pos = 0;
        let first = true;
        while ((first && this.tt == TokenType.identifier) || this.tt == TokenType.comma) {
            pos = this.pos;
            if (!first)
                this.nextToken(); // skip comma
            first = false;
            if (this.expect(TokenType.identifier, false)) {
                let identifier = this.cct.value;
                let position = this.getCurrentPosition();
                this.nextToken();
                let constructorParameters = null;
                let commaPositions = [];
                let rightBracketPosition = null;
                //@ts-ignore
                if (this.tt == TokenType.leftBracket) {
                    let mcp = this.parseMethodCallParameters();
                    constructorParameters = mcp.nodes;
                    commaPositions = mcp.commaPositions;
                    rightBracketPosition = mcp.rightBracketPosition;
                }
                values.push({
                    type: TokenType.pushEnumValue,
                    constructorParameters: constructorParameters,
                    identifier: identifier,
                    position: position,
                    commaPositions: commaPositions,
                    rightBracketPosition: rightBracketPosition
                });
            }
            ;
            if (this.pos == pos) {
                this.nextToken(); // in case of parsing-emergency
            }
        }
        if (this.tt == TokenType.semicolon) {
            this.nextToken();
        }
        return values;
    }
    parseClassBody(classType, className) {
        // Assumption: { is already consumed
        let methods = [];
        let attributes = [];
        while (true) {
            if (this.tt == TokenType.rightCurlyBracket || this.tt == TokenType.endofSourcecode) {
                break;
            }
            let commentBefore = this.cct.commentBefore;
            let annotation = null;
            if (this.tt == TokenType.at) {
                annotation = this.cct.value;
                this.nextToken();
            }
            let modifiers = this.collectModifiers();
            let isConstructor = false;
            let position = this.getCurrentPosition();
            if (this.tt == TokenType.identifier && this.cct.value == className && this.ct[1].tt == TokenType.leftBracket) {
                isConstructor = true;
            }
            let type = this.parseType();
            if (isConstructor) {
                type = {
                    identifier: "void",
                    arrayDimension: 0,
                    position: type.position,
                    type: TokenType.type
                };
            }
            if (isConstructor || this.expect(TokenType.identifier, false)) {
                let identifier = className;
                if (!isConstructor) {
                    position = this.getCurrentPosition();
                    identifier = this.cct.value;
                    this.nextToken();
                }
                if (this.tt == TokenType.leftBracket) {
                    if (isConstructor && classType == TokenType.keywordEnum && modifiers.visibility != Visibility.private) {
                        this.pushError("Konstruktoren in enums müssen private sein.", "error", position);
                    }
                    let parameters = this.parseMethodDeclarationParameters();
                    let statements;
                    let scopeFrom = this.getCurrentPosition();
                    let scopeTo = scopeFrom;
                    if (modifiers.isAbstract) {
                        this.expect(TokenType.semicolon, true);
                        if (isConstructor) {
                            this.pushError("Ein Konstruktor kann nicht abstrakt sein.", "error", position);
                        }
                        statements = [];
                    }
                    else {
                        scopeFrom = this.getCurrentPosition();
                        statements = this.parseStatement();
                        scopeTo = this.getEndOfCurrentToken();
                        if (statements != null && statements.length > 0 && statements[0].type == TokenType.scopeNode) {
                            let scopeNode = statements[0];
                            scopeFrom = scopeNode.position;
                            scopeTo = scopeNode.positionTo;
                        }
                    }
                    methods.push({
                        type: TokenType.methodDeclaration,
                        identifier: identifier,
                        position: position,
                        scopeFrom: scopeFrom,
                        scopeTo: scopeTo,
                        parameters: parameters,
                        statements: statements,
                        visibility: modifiers.visibility,
                        isAbstract: modifiers.isAbstract || classType == TokenType.keywordInterface,
                        isStatic: modifiers.isStatic,
                        isConstructor: isConstructor,
                        returnType: type,
                        annotation: annotation,
                        isTransient: modifiers.isTransient,
                        commentBefore: commentBefore
                    });
                }
                else {
                    if (identifier == className) {
                        this.pushError("Das Attribut " + className + " darf nicht denselben Bezeichner haben wie die Klasse.", "error", position);
                    }
                    let initialization = null;
                    if (this.tt == TokenType.assignment) {
                        this.nextToken();
                        //@ts-ignore
                        if (type.arrayDimension > 0 && this.tt == TokenType.leftCurlyBracket) {
                            initialization = this.parseArrayLiteral(type);
                        }
                        else {
                            initialization = this.parseTerm();
                        }
                    }
                    this.expect(TokenType.semicolon);
                    attributes.push({
                        type: TokenType.attributeDeclaration,
                        identifier: identifier,
                        position: position,
                        attributeType: type,
                        isStatic: modifiers.isStatic,
                        isFinal: modifiers.isFinal,
                        visibility: modifiers.visibility,
                        initialization: initialization,
                        annotation: annotation,
                        isTransient: modifiers.isTransient,
                        commentBefore: commentBefore
                    });
                    if (classType == TokenType.keywordInterface) {
                        this.pushError("Interfaces dürfen keine Attribute enthalten.", "error", position);
                    }
                }
            }
        }
        return { methods: methods, attributes: attributes };
    }
    parseMethodDeclarationParameters() {
        // Assumption: next token is (
        let parameters = [];
        this.nextToken();
        if (this.tt == TokenType.rightBracket) {
            this.nextToken();
            return [];
        }
        let ellipsis = false;
        while (true) {
            if (ellipsis) {
                this.pushError("Nur der letzte Parameter darf als Ellipsis (...) definiert werden.");
            }
            let isFinal = this.tt == TokenType.keywordFinal;
            if (isFinal)
                this.nextToken();
            let type = this.parseType();
            ellipsis = this.tt == TokenType.ellipsis;
            if (ellipsis) {
                this.nextToken();
                type.arrayDimension++;
            }
            if (this.expect(TokenType.identifier, false)) {
                let identifier = this.cct.value;
                parameters.push({
                    type: TokenType.parameterDeclaration,
                    position: this.getCurrentPosition(),
                    identifier: identifier,
                    parameterType: type,
                    isFinal: isFinal,
                    isEllipsis: ellipsis
                });
                this.nextToken();
            }
            if (this.tt != TokenType.comma) {
                break;
            }
            this.nextToken(); // consume comma
        }
        this.expect(TokenType.rightBracket, true);
        return parameters;
    }
    parseExtendsImplements(isInterface) {
        let sextends = null;
        let simplements = [];
        while (this.comesToken([TokenType.keywordExtends, TokenType.keywordImplements])) {
            if (this.comesToken(TokenType.keywordExtends) && !isInterface) {
                if (sextends != null) {
                    this.pushError("Eine Klasse kann nicht Unterklasse von zwei anderen Klassen sein, es darf also hier nur ein Mal 'extends...' stehen.", "error", sextends.position);
                }
                this.nextToken(); // skip extends
                sextends = this.parseType();
                if (sextends != null && sextends.arrayDimension > 0) {
                    this.pushError("Der Datentyp der Basisklasse darf kein Array sein.", "error", sextends.position);
                }
            }
            if ((!isInterface && this.comesToken(TokenType.keywordImplements)) || (isInterface && this.comesToken(TokenType.keywordExtends))) {
                if (simplements.length > 0) {
                    this.pushError("Es darf hier nur ein Mal 'implements' stehen, hinter 'implements' ist aber eine kommaseparierte Liste von Interfaces erlaubt.", "warning");
                }
                this.nextToken(); // Skip implements/extends
                let first = true;
                while ((first && this.tt == TokenType.identifier) || (!first && this.tt == TokenType.comma)) {
                    if (!first)
                        this.nextToken(); // skip comma
                    first = false;
                    simplements.push(this.parseType());
                }
            }
        }
        simplements.forEach((im) => {
            if (im.arrayDimension > 0) {
                this.pushError(im.identifier + "[] ist kein Interface, sondern ein Array. Array-Datentypen sind hier nicht erlaubt.");
            }
        });
        return {
            extends: sextends, implements: simplements
        };
    }
    parseTypeParameterBounds() {
        let sextends = null;
        let simplements = [];
        if (this.comesToken(TokenType.keywordExtends)) {
            this.nextToken(); // skip extends
            sextends = this.parseType();
        }
        while (this.comesToken(TokenType.ampersand)) {
            this.nextToken(); // Skip ampersand
            simplements.push(this.parseType());
        }
        return {
            extends: sextends, implements: simplements
        };
    }
    collectModifiers() {
        let visibility = Visibility.public;
        let isAbstract = false;
        let isStatic = false;
        let isFinal = false;
        let isTransient = false;
        let done = false;
        let asError = false;
        while (!done) {
            switch (this.tt) {
                case TokenType.keywordPublic:
                    visibility = Visibility.public;
                    this.nextToken();
                    break;
                case TokenType.keywordPrivate:
                    visibility = Visibility.private;
                    this.nextToken();
                    break;
                case TokenType.keywordProtected:
                    visibility = Visibility.protected;
                    this.nextToken();
                    break;
                case TokenType.keywordStatic:
                    isStatic = true;
                    if (isAbstract && !asError) {
                        this.pushError("Die Modifier 'abstract' und 'static' können nicht kombiniert werden.");
                        asError = true;
                    }
                    this.nextToken();
                    break;
                case TokenType.keywordAbstract:
                    isAbstract = true;
                    if (isStatic && !asError) {
                        this.pushError("Die Modifier 'abstract' und 'static' können nicht kombiniert werden.");
                        asError = true;
                    }
                    this.nextToken();
                    break;
                case TokenType.keywordFinal:
                    isFinal = true;
                    this.nextToken();
                    break;
                case TokenType.keywordTransient:
                    isTransient = true;
                    this.nextToken();
                    break;
                default: done = true;
            }
        }
        return { isAbstract: isAbstract, isStatic: isStatic, visibility: visibility, isFinal: isFinal, isTransient: isTransient };
    }
}
Parser.assignmentOperators = [TokenType.assignment, TokenType.plusAssignment, TokenType.minusAssignment,
    TokenType.multiplicationAssignment, TokenType.divisionAssignment, TokenType.moduloAssignment,
    TokenType.ANDAssigment, TokenType.XORAssigment, TokenType.ORAssigment,
    TokenType.shiftLeftAssigment, TokenType.shiftRightAssigment, TokenType.shiftRightUnsignedAssigment];
Parser.operatorPrecedence = [Parser.assignmentOperators,
    [TokenType.ternaryOperator], [TokenType.colon],
    [TokenType.or], [TokenType.and], [TokenType.OR], [TokenType.XOR], [TokenType.ampersand],
    [TokenType.equal, TokenType.notEqual],
    [TokenType.keywordInstanceof, TokenType.lower, TokenType.lowerOrEqual, TokenType.greater, TokenType.greaterOrEqual],
    [TokenType.shiftLeft, TokenType.shiftRight, TokenType.shiftRightUnsigned],
    // [TokenType.or], [TokenType.and],
    // [TokenType.keywordInstanceof, TokenType.lower, TokenType.lowerOrEqual, TokenType.greater, TokenType.greaterOrEqual, TokenType.equal, TokenType.notEqual],
    [TokenType.plus, TokenType.minus], [TokenType.multiplication, TokenType.division, TokenType.modulo]
];
Parser.TokenTypeToVisibilityMap = {
    [TokenType.keywordPublic]: Visibility.public,
    [TokenType.keywordPrivate]: Visibility.private,
    [TokenType.keywordProtected]: Visibility.protected
};
Parser.forwardToInsideClass = [TokenType.keywordPublic, TokenType.keywordPrivate, TokenType.keywordProtected, TokenType.keywordVoid,
    TokenType.identifier, TokenType.rightCurlyBracket, TokenType.keywordStatic, TokenType.keywordAbstract,
    TokenType.keywordClass, TokenType.keywordEnum, TokenType.keywordInterface];
Parser.ClassTokens = [TokenType.keywordClass, TokenType.keywordEnum, TokenType.keywordInterface];
Parser.VisibilityTokens = [TokenType.keywordPrivate, TokenType.keywordProtected, TokenType.keywordPublic];
Parser.BeforeClassDefinitionTokens = Parser.ClassTokens.concat(Parser.VisibilityTokens).concat(TokenType.keywordAbstract).concat(Parser.ClassTokens);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9jb21waWxlci9wYXJzZXIvUGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBa0MsU0FBUyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDakcsT0FBTyxFQUFFLFVBQVUsRUFBUyxNQUFNLG1CQUFtQixDQUFDO0FBR3RELE9BQU8sRUFBdUIsZ0JBQWdCLEVBQXFCLHNCQUFzQixFQUFxQixNQUFNLDRCQUE0QixDQUFDO0FBTWpKLE1BQU0sT0FBTyxNQUFNO0lBc0RmLFlBQW9CLGVBQXdCO1FBQXhCLG9CQUFlLEdBQWYsZUFBZSxDQUFTO1FBZjVDLGNBQVMsR0FBRyxDQUFDLENBQUM7UUFRZCxhQUFRLEdBQVU7WUFDZCxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtZQUMzQyxFQUFFLEVBQUUsU0FBUyxDQUFDLGVBQWU7WUFDN0IsS0FBSyxFQUFFLHdCQUF3QjtTQUNsQyxDQUFDO1FBa25DRiwwQkFBcUIsR0FBZ0IsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLElBQUk7WUFDbEcsU0FBUyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7SUE5bUMvRixDQUFDO0lBRUQsS0FBSyxDQUFDLENBQVM7UUFFWCxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUVoQixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFFcEIsSUFBSSxJQUFJ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LENBQUM7QUFFSywyQkFBb0IsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLFdBQVc7SUFDbkksU0FBUyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsZUFBZTtJQUNyRyxTQUFTLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUF1UHBFLGtCQUFXLEdBQWdCLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3ZHLHVCQUFnQixHQUFnQixDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNoSCxrQ0FBMkIsR0FBZ0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXJyb3IsIFF1aWNrRml4LCBFcnJvckxldmVsIH0gZnJvbSBcIi4uL2xleGVyL0xleGVyLmpzXCI7XHJcbmltcG9ydCB7IFRleHRQb3NpdGlvbiwgVG9rZW4sIFRva2VuTGlzdCwgVG9rZW5UeXBlLCBUb2tlblR5cGVSZWFkYWJsZSB9IGZyb20gXCIuLi9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBWaXNpYmlsaXR5LCBLbGFzcyB9IGZyb20gXCIuLi90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheUluaXRpYWxpemF0aW9uTm9kZSwgQVNUTm9kZSwgQXR0cmlidXRlRGVjbGFyYXRpb25Ob2RlLCBNZXRob2REZWNsYXJhdGlvbk5vZGUsIE5ld0FycmF5Tm9kZSwgUGFyYW1ldGVyTm9kZSwgVGVybU5vZGUsIFR5cGVOb2RlLCBFbnVtVmFsdWVOb2RlLCBTd2l0Y2hOb2RlLCBTd2l0Y2hDYXNlTm9kZSwgQ29uc3RhbnROb2RlLCBCcmFja2V0c05vZGUsIFNjb3BlTm9kZSwgVHlwZVBhcmFtZXRlck5vZGUsIExvY2FsVmFyaWFibGVEZWNsYXJhdGlvbk5vZGUgfSBmcm9tIFwiLi9BU1QuanNcIjtcclxuaW1wb3J0IHsgTW9kdWxlIH0gZnJvbSBcIi4vTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IHN0cmluZ1ByaW1pdGl2ZVR5cGUsIGludFByaW1pdGl2ZVR5cGUsIGNoYXJQcmltaXRpdmVUeXBlLCBUb2tlblR5cGVUb0RhdGFUeXBlTWFwLCB2b2lkUHJpbWl0aXZlVHlwZSB9IGZyb20gXCIuLi90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBFbnVtIH0gZnJvbSBcIi4uL3R5cGVzL0VudW0uanNcIjtcclxuaW1wb3J0IHsgUHJpbWl0aXZlVHlwZSwgVHlwZSB9IGZyb20gXCIuLi90eXBlcy9UeXBlcy5qc1wiO1xyXG5cclxudHlwZSBBU1ROb2RlcyA9IEFTVE5vZGVbXTtcclxuXHJcbmV4cG9ydCBjbGFzcyBQYXJzZXIge1xyXG5cclxuICAgIHN0YXRpYyBhc3NpZ25tZW50T3BlcmF0b3JzID0gW1Rva2VuVHlwZS5hc3NpZ25tZW50LCBUb2tlblR5cGUucGx1c0Fzc2lnbm1lbnQsIFRva2VuVHlwZS5taW51c0Fzc2lnbm1lbnQsIFxyXG4gICAgICAgIFRva2VuVHlwZS5tdWx0aXBsaWNhdGlvbkFzc2lnbm1lbnQsIFRva2VuVHlwZS5kaXZpc2lvbkFzc2lnbm1lbnQsIFRva2VuVHlwZS5tb2R1bG9Bc3NpZ25tZW50LCBcclxuICAgICAgICBUb2tlblR5cGUuQU5EQXNzaWdtZW50LCBUb2tlblR5cGUuWE9SQXNzaWdtZW50LCBUb2tlblR5cGUuT1JBc3NpZ21lbnQsIFxyXG4gICAgICAgIFRva2VuVHlwZS5zaGlmdExlZnRBc3NpZ21lbnQsIFRva2VuVHlwZS5zaGlmdFJpZ2h0QXNzaWdtZW50LCBUb2tlblR5cGUuc2hpZnRSaWdodFVuc2lnbmVkQXNzaWdtZW50XTtcclxuXHJcbiAgICBzdGF0aWMgb3BlcmF0b3JQcmVjZWRlbmNlOiBUb2tlblR5cGVbXVtdID0gW1BhcnNlci5hc3NpZ25tZW50T3BlcmF0b3JzLFxyXG4gICAgW1Rva2VuVHlwZS50ZXJuYXJ5T3BlcmF0b3JdLCBbVG9rZW5UeXBlLmNvbG9uXSxcclxuXHJcbiAgICBbVG9rZW5UeXBlLm9yXSwgW1Rva2VuVHlwZS5hbmRdLCBbVG9rZW5UeXBlLk9SXSwgW1Rva2VuVHlwZS5YT1JdLCBbVG9rZW5UeXBlLmFtcGVyc2FuZF0sXHJcbiAgICBbVG9rZW5UeXBlLmVxdWFsLCBUb2tlblR5cGUubm90RXF1YWxdLFxyXG4gICAgW1Rva2VuVHlwZS5rZXl3b3JkSW5zdGFuY2VvZiwgVG9rZW5UeXBlLmxvd2VyLCBUb2tlblR5cGUubG93ZXJPckVxdWFsLCBUb2tlblR5cGUuZ3JlYXRlciwgVG9rZW5UeXBlLmdyZWF0ZXJPckVxdWFsXSxcclxuICAgIFtUb2tlblR5cGUuc2hpZnRMZWZ0LCBUb2tlblR5cGUuc2hpZnRSaWdodCwgVG9rZW5UeXBlLnNoaWZ0UmlnaHRVbnNpZ25lZF0sXHJcblxyXG4gICAgLy8gW1Rva2VuVHlwZS5vcl0sIFtUb2tlblR5cGUuYW5kXSxcclxuICAgIC8vIFtUb2tlblR5cGUua2V5d29yZEluc3RhbmNlb2YsIFRva2VuVHlwZS5sb3dlciwgVG9rZW5UeXBlLmxvd2VyT3JFcXVhbCwgVG9rZW5UeXBlLmdyZWF0ZXIsIFRva2VuVHlwZS5ncmVhdGVyT3JFcXVhbCwgVG9rZW5UeXBlLmVxdWFsLCBUb2tlblR5cGUubm90RXF1YWxdLFxyXG4gICAgXHJcbiAgICBbVG9rZW5UeXBlLnBsdXMsIFRva2VuVHlwZS5taW51c10sIFtUb2tlblR5cGUubXVsdGlwbGljYXRpb24sIFRva2VuVHlwZS5kaXZpc2lvbiwgVG9rZW5UeXBlLm1vZHVsb11cclxuICAgIF07XHJcblxyXG4gICAgc3RhdGljIFRva2VuVHlwZVRvVmlzaWJpbGl0eU1hcCA9IHtcclxuICAgICAgICBbVG9rZW5UeXBlLmtleXdvcmRQdWJsaWNdOiBWaXNpYmlsaXR5LnB1YmxpYyxcclxuICAgICAgICBbVG9rZW5UeXBlLmtleXdvcmRQcml2YXRlXTogVmlzaWJpbGl0eS5wcml2YXRlLFxyXG4gICAgICAgIFtUb2tlblR5cGUua2V5d29yZFByb3RlY3RlZF06IFZpc2liaWxpdHkucHJvdGVjdGVkXHJcbiAgICB9O1xyXG5cclxuICAgIHN0YXRpYyBmb3J3YXJkVG9JbnNpZGVDbGFzcyA9IFtUb2tlblR5cGUua2V5d29yZFB1YmxpYywgVG9rZW5UeXBlLmtleXdvcmRQcml2YXRlLCBUb2tlblR5cGUua2V5d29yZFByb3RlY3RlZCwgVG9rZW5UeXBlLmtleXdvcmRWb2lkLFxyXG4gICAgVG9rZW5UeXBlLmlkZW50aWZpZXIsIFRva2VuVHlwZS5yaWdodEN1cmx5QnJhY2tldCwgVG9rZW5UeXBlLmtleXdvcmRTdGF0aWMsIFRva2VuVHlwZS5rZXl3b3JkQWJzdHJhY3QsXHJcbiAgICBUb2tlblR5cGUua2V5d29yZENsYXNzLCBUb2tlblR5cGUua2V5d29yZEVudW0sIFRva2VuVHlwZS5rZXl3b3JkSW50ZXJmYWNlXTtcclxuXHJcbiAgICBtb2R1bGU6IE1vZHVsZTtcclxuXHJcbiAgICBwb3M6IG51bWJlcjtcclxuICAgIHRva2VuTGlzdDogVG9rZW5MaXN0O1xyXG5cclxuICAgIGVycm9yTGlzdDogRXJyb3JbXTtcclxuICAgIHR5cGVOb2RlczogVHlwZU5vZGVbXTtcclxuXHJcbiAgICBsb29rYWhlYWQgPSA0O1xyXG4gICAgY3Q6IFRva2VuW107XHJcbiAgICBsYXN0VG9rZW46IFRva2VuO1xyXG4gICAgY2N0OiBUb2tlbjtcclxuICAgIHR0OiBUb2tlblR5cGU7XHJcbiAgICBwb3NpdGlvbjogVGV4dFBvc2l0aW9uO1xyXG4gICAgbGFzdENvbW1lbnQ6IFRva2VuO1xyXG5cclxuICAgIGVuZFRva2VuOiBUb2tlbiA9IHtcclxuICAgICAgICBwb3NpdGlvbjogeyBsaW5lOiAwLCBjb2x1bW46IDAsIGxlbmd0aDogMSB9LFxyXG4gICAgICAgIHR0OiBUb2tlblR5cGUuZW5kb2ZTb3VyY2Vjb2RlLFxyXG4gICAgICAgIHZhbHVlOiBcImRhcyBFbmRlIGRlcyBQcm9ncmFtbXNcIlxyXG4gICAgfTtcclxuXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBpc0luQ29uc29sZU1vZGU6IGJvb2xlYW4pe1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwYXJzZShtOiBNb2R1bGUpIHtcclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGUgPSBtO1xyXG5cclxuICAgICAgICB0aGlzLnRva2VuTGlzdCA9IG0udG9rZW5MaXN0O1xyXG4gICAgICAgIHRoaXMuZXJyb3JMaXN0ID0gW107XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnRva2VuTGlzdC5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLm1vZHVsZS5tYWluUHJvZ3JhbUFzdCA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLm1vZHVsZS5jbGFzc0RlZmluaXRpb25zQVNUID0gW107XHJcbiAgICAgICAgICAgIHRoaXMubW9kdWxlLnR5cGVOb2RlcyA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLm1vZHVsZS5lcnJvcnNbMV0gPSB0aGlzLmVycm9yTGlzdDtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wb3MgPSAwO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUxvb2thaGVhZCgpO1xyXG5cclxuICAgICAgICB0aGlzLnR5cGVOb2RlcyA9IFtdO1xyXG5cclxuICAgICAgICBsZXQgbGFzdFRva2VuID0gdGhpcy50b2tlbkxpc3RbdGhpcy50b2tlbkxpc3QubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgdGhpcy5lbmRUb2tlbi5wb3NpdGlvbiA9IHsgbGluZTogbGFzdFRva2VuLnBvc2l0aW9uLmxpbmUsIGNvbHVtbjogbGFzdFRva2VuLnBvc2l0aW9uLmNvbHVtbiArIGxhc3RUb2tlbi5wb3NpdGlvbi5sZW5ndGgsIGxlbmd0aDogMSB9O1xyXG5cclxuICAgICAgICBsZXQgYXN0Tm9kZXMgPSB0aGlzLnBhcnNlTWFpbigpO1xyXG4gICAgICAgIHRoaXMubW9kdWxlLm1haW5Qcm9ncmFtQXN0ID0gYXN0Tm9kZXMubWFpblByb2dyYW1BU1Q7XHJcbiAgICAgICAgdGhpcy5tb2R1bGUuY2xhc3NEZWZpbml0aW9uc0FTVCA9IGFzdE5vZGVzLmNsYXNzRGVmaW5pdGlvbkFTVDtcclxuICAgICAgICB0aGlzLm1vZHVsZS5tYWluUHJvZ3JhbUVuZCA9IGFzdE5vZGVzLm1haW5Qcm9ncmFtRW5kO1xyXG4gICAgICAgIHRoaXMubW9kdWxlLnR5cGVOb2RlcyA9IHRoaXMudHlwZU5vZGVzO1xyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZS5lcnJvcnNbMV0gPSB0aGlzLmVycm9yTGlzdDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaW5pdGlhbGl6ZUxvb2thaGVhZCgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5jdCA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubG9va2FoZWFkOyBpKyspIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB0b2tlbjogVG9rZW4gPSB0aGlzLmVuZFRva2VuO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb3MgPj0gdGhpcy50b2tlbkxpc3QubGVuZ3RoKSBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdG9rZW4xID0gdGhpcy50b2tlbkxpc3RbdGhpcy5wb3NdXHJcbiAgICAgICAgICAgICAgICBpZih0b2tlbjEudHQgPT0gVG9rZW5UeXBlLmNvbW1lbnQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdENvbW1lbnQgPSB0b2tlbjE7XHJcbiAgICAgICAgICAgICAgICB9IFxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0b2tlbjEudHQgIT0gVG9rZW5UeXBlLm5ld2xpbmUgJiYgdG9rZW4xLnR0ICE9IFRva2VuVHlwZS5zcGFjZSAmJiB0b2tlbjEudHQgIT0gVG9rZW5UeXBlLmNvbW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0b2tlbiA9IHRva2VuMTtcclxuICAgICAgICAgICAgICAgICAgICBpZih0aGlzLmxhc3RDb21tZW50ICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5jb21tZW50QmVmb3JlID0gdGhpcy5sYXN0Q29tbWVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0Q29tbWVudCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmN0LnB1c2godG9rZW4pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGkgPCB0aGlzLmxvb2thaGVhZCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNjdCA9IHRoaXMuY3RbMF07XHJcbiAgICAgICAgdGhpcy50dCA9IHRoaXMuY2N0LnR0O1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLmNjdC5wb3NpdGlvbjtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbmV4dFRva2VuKCkge1xyXG5cclxuICAgICAgICBsZXQgdG9rZW46IFRva2VuO1xyXG4gICAgICAgIHRoaXMubGFzdFRva2VuID0gdGhpcy5jY3Q7XHJcblxyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnBvcysrO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMudG9rZW5MaXN0Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgdG9rZW4gPSB0aGlzLmVuZFRva2VuO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRva2VuID0gdGhpcy50b2tlbkxpc3RbdGhpcy5wb3NdXHJcbiAgICAgICAgICAgIGlmKHRva2VuLnR0ID09IFRva2VuVHlwZS5jb21tZW50KXtcclxuICAgICAgICAgICAgICAgIHRoaXMubGFzdENvbW1lbnQgPSB0b2tlbjtcclxuICAgICAgICAgICAgfSBcclxuXHJcbiAgICAgICAgICAgIGlmICh0b2tlbi50dCAhPSBUb2tlblR5cGUubmV3bGluZSAmJiB0b2tlbi50dCAhPSBUb2tlblR5cGUuc3BhY2UgJiYgdG9rZW4udHQgIT0gVG9rZW5UeXBlLmNvbW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIHRva2VuLmNvbW1lbnRCZWZvcmUgPSB0aGlzLmxhc3RDb21tZW50O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0Q29tbWVudCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sb29rYWhlYWQgLSAxOyBpKyspIHtcclxuICAgICAgICAgICAgdGhpcy5jdFtpXSA9IHRoaXMuY3RbaSArIDFdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jdFt0aGlzLmxvb2thaGVhZCAtIDFdID0gdG9rZW47XHJcblxyXG4gICAgICAgIHRoaXMuY2N0ID0gdGhpcy5jdFswXTtcclxuICAgICAgICB0aGlzLnR0ID0gdGhpcy5jY3QudHQ7XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMuY2N0LnBvc2l0aW9uO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdXNoRXJyb3IodGV4dDogc3RyaW5nLCBlcnJvckxldmVsOiBFcnJvckxldmVsID0gXCJlcnJvclwiLCBwb3NpdGlvbj86IFRleHRQb3NpdGlvbiwgcXVpY2tGaXg/OiBRdWlja0ZpeCkge1xyXG4gICAgICAgIGlmIChwb3NpdGlvbiA9PSBudWxsKSBwb3NpdGlvbiA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMucG9zaXRpb24pO1xyXG4gICAgICAgIHRoaXMuZXJyb3JMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICB0ZXh0OiB0ZXh0LFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgIHF1aWNrRml4OiBxdWlja0ZpeCxcclxuICAgICAgICAgICAgbGV2ZWw6IGVycm9yTGV2ZWxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBlY3QodHQ6IFRva2VuVHlwZSwgc2tpcDogYm9vbGVhbiA9IHRydWUsIGludm9rZVNlbWljb2xvbkFuZ2VsOiBib29sZWFuID0gZmFsc2UpOiBib29sZWFuIHtcclxuICAgICAgICBpZiAodGhpcy50dCAhPSB0dCkge1xyXG4gICAgICAgICAgICBpZiAodHQgPT0gVG9rZW5UeXBlLnNlbWljb2xvbiAmJiB0aGlzLnR0ID09IFRva2VuVHlwZS5lbmRvZlNvdXJjZWNvZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgcG9zaXRpb246IFRleHRQb3NpdGlvbiA9IHRoaXMuY2N0LnBvc2l0aW9uO1xyXG4gICAgICAgICAgICBpZiAodHQgPT0gVG9rZW5UeXBlLnNlbWljb2xvbiAmJiB0aGlzLmxhc3RUb2tlbiAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGFzdFRva2VuLnBvc2l0aW9uLmxpbmUgPCBwb3NpdGlvbi5saW5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMubGFzdFRva2VuLnBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sYXN0VG9rZW4ucG9zaXRpb24uY29sdW1uICsgdGhpcy5sYXN0VG9rZW4ucG9zaXRpb24ubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZW5ndGg6IDFcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBxdWlja0ZpeDogUXVpY2tGaXggPSBudWxsO1xyXG4gICAgICAgICAgICBpZiAodHQgPT0gVG9rZW5UeXBlLnNlbWljb2xvbiAmJiB0aGlzLmxhc3RUb2tlbi5wb3NpdGlvbi5saW5lIDwgdGhpcy5jY3QucG9zaXRpb24ubGluZSAmJlxyXG4gICAgICAgICAgICAgICAgIXRoaXMuaXNPcGVyYXRvck9yRG90KHRoaXMubGFzdFRva2VuLnR0KSBcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBxdWlja0ZpeCA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1N0cmljaHB1bmt0IGhpZXIgZWluZsO8Z2VuJyxcclxuICAgICAgICAgICAgICAgICAgICBlZGl0c1Byb3ZpZGVyOiAodXJpKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2U6IHVyaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmUsIHN0YXJ0Q29sdW1uOiBwb3NpdGlvbi5jb2x1bW4sIGVuZExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmUsIGVuZENvbHVtbjogcG9zaXRpb24uY29sdW1uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXZlcml0eTogbW9uYWNvLk1hcmtlclNldmVyaXR5LkVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIjtcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpbnZva2VTZW1pY29sb25BbmdlbCAmJiB0aGlzLmVycm9yTGlzdC5sZW5ndGggPCAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2R1bGUubWFpbi5nZXRTZW1pY29sb25BbmdlbCgpLnJlZ2lzdGVyKHBvc2l0aW9uLCB0aGlzLm1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVyd2FydGV0IHdpcmQ6IFwiICsgVG9rZW5UeXBlUmVhZGFibGVbdHRdICsgXCIgLSBHZWZ1bmRlbiB3dXJkZTogXCIgKyBUb2tlblR5cGVSZWFkYWJsZVt0aGlzLnR0XSwgXCJlcnJvclwiLCBwb3NpdGlvbiwgcXVpY2tGaXgpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2tpcCkge1xyXG4gICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICBpc09wZXJhdG9yT3JEb3QodHQ6IFRva2VuVHlwZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmICh0dCA9PSBUb2tlblR5cGUuZG90KSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICBmb3IgKGxldCBvcCBvZiBQYXJzZXIub3BlcmF0b3JQcmVjZWRlbmNlKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG9wZXJhdG9yIG9mIG9wKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHQgPT0gb3BlcmF0b3IpIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlzRW5kKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNjdCA9PSB0aGlzLmVuZFRva2VuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbWVzVG9rZW4odG9rZW46IFRva2VuVHlwZSB8IFRva2VuVHlwZVtdKTogYm9vbGVhbiB7XHJcblxyXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh0b2tlbikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHQgPT0gdG9rZW47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdG9rZW4uaW5kZXhPZih0aGlzLnR0KSA+PSAwO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRDdXJyZW50UG9zaXRpb24oKTogVGV4dFBvc2l0aW9uIHtcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5wb3NpdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0RW5kT2ZDdXJyZW50VG9rZW4oKTogVGV4dFBvc2l0aW9uIHtcclxuXHJcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICBwb3NpdGlvbi5jb2x1bW4gPSBwb3NpdGlvbi5jb2x1bW4gKyB0aGlzLnBvc2l0aW9uLmxlbmd0aDtcclxuICAgICAgICBwb3NpdGlvbi5sZW5ndGggPSAwO1xyXG5cclxuICAgICAgICByZXR1cm4gcG9zaXRpb247XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIENsYXNzVG9rZW5zOiBUb2tlblR5cGVbXSA9IFtUb2tlblR5cGUua2V5d29yZENsYXNzLCBUb2tlblR5cGUua2V5d29yZEVudW0sIFRva2VuVHlwZS5rZXl3b3JkSW50ZXJmYWNlXTtcclxuICAgIHN0YXRpYyBWaXNpYmlsaXR5VG9rZW5zOiBUb2tlblR5cGVbXSA9IFtUb2tlblR5cGUua2V5d29yZFByaXZhdGUsIFRva2VuVHlwZS5rZXl3b3JkUHJvdGVjdGVkLCBUb2tlblR5cGUua2V5d29yZFB1YmxpY107XHJcbiAgICBzdGF0aWMgQmVmb3JlQ2xhc3NEZWZpbml0aW9uVG9rZW5zOiBUb2tlblR5cGVbXSA9IFBhcnNlci5DbGFzc1Rva2Vucy5jb25jYXQoUGFyc2VyLlZpc2liaWxpdHlUb2tlbnMpLmNvbmNhdChUb2tlblR5cGUua2V5d29yZEFic3RyYWN0KS5jb25jYXQoUGFyc2VyLkNsYXNzVG9rZW5zKTtcclxuXHJcbiAgICBwYXJzZU1haW4oKTogeyBtYWluUHJvZ3JhbUFTVDogQVNUTm9kZXMsIG1haW5Qcm9ncmFtRW5kOiBUZXh0UG9zaXRpb24sIGNsYXNzRGVmaW5pdGlvbkFTVDogQVNUTm9kZXMgfSB7XHJcblxyXG4gICAgICAgIGxldCBtYWluUHJvZ3JhbTogQVNUTm9kZXMgPSBbXTtcclxuICAgICAgICBsZXQgY2xhc3NEZWZpbml0aW9uczogQVNUTm9kZXMgPSBbXTtcclxuXHJcbiAgICAgICAgbGV0IG1haW5Qcm9ncmFtRW5kOiBUZXh0UG9zaXRpb24gPSB7XHJcbiAgICAgICAgICAgIGNvbHVtbjogMCxcclxuICAgICAgICAgICAgbGluZTogMTAwMDAsXHJcbiAgICAgICAgICAgIGxlbmd0aDogMVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2hpbGUgKCF0aGlzLmlzRW5kKCkpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBvbGRQb3MgPSB0aGlzLnBvcztcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbWVzVG9rZW4oUGFyc2VyLkJlZm9yZUNsYXNzRGVmaW5pdGlvblRva2VucykpIHtcclxuICAgICAgICAgICAgICAgIGxldCBjZCA9IHRoaXMucGFyc2VDbGFzc0RlZmluaXRpb24oKTtcclxuICAgICAgICAgICAgICAgIGlmIChjZCAhPSBudWxsKSBjbGFzc0RlZmluaXRpb25zID0gY2xhc3NEZWZpbml0aW9ucy5jb25jYXQoY2QpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN0ID0gdGhpcy5wYXJzZVN0YXRlbWVudCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFpblByb2dyYW0gPSBtYWluUHJvZ3JhbS5jb25jYXQoc3QpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbWFpblByb2dyYW1FbmQgPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBlbWVyZ2VuY3ktZm9yd2FyZDpcclxuICAgICAgICAgICAgaWYgKHRoaXMucG9zID09IG9sZFBvcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wb3MrKztcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUxvb2thaGVhZCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbWFpblByb2dyYW1BU1Q6IG1haW5Qcm9ncmFtLFxyXG4gICAgICAgICAgICBjbGFzc0RlZmluaXRpb25BU1Q6IGNsYXNzRGVmaW5pdGlvbnMsXHJcbiAgICAgICAgICAgIG1haW5Qcm9ncmFtRW5kOiBtYWluUHJvZ3JhbUVuZFxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNoZWNrSWZTdGF0ZW1lbnRIYXNOb0VmZmVrdChzdDogQVNUTm9kZSkge1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKHRoaXMuaXNJbkNvbnNvbGVNb2RlKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmICgoc3QudHlwZSA9PSBUb2tlblR5cGUuYmluYXJ5T3AgJiYgUGFyc2VyLmFzc2lnbm1lbnRPcGVyYXRvcnMuaW5kZXhPZihzdC5vcGVyYXRvcikgPCAwKSkge1xyXG4gICAgICAgICAgICBsZXQgcyA9IFwiZGllc2VzIFRlcm1zXCI7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoc3Qub3BlcmF0b3IpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnBsdXM6IHMgPSBcImRpZXNlciBTdW1tZVwiOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm1pbnVzOiBzID0gXCJkaWVzZXIgRGlmZmVyZW56XCI7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubXVsdGlwbGljYXRpb246IHMgPSBcImRpZXNlcyBQcm9kdWt0c1wiOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmRpdmlzaW9uOiBzID0gXCJkaWVzZXMgUXVvdGllbnRlblwiOyBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzICs9IFwiIChPcGVyYXRvciBcIiArIFRva2VuVHlwZVJlYWRhYmxlW3N0Lm9wZXJhdG9yXSArIFwiKVwiXHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKGBEZXIgV2VydCAke3N9IHdpcmQgendhciBiZXJlY2huZXQsIGFiZXIgZGFuYWNoIHZlcndvcmZlbi4gTcO2Y2h0ZXN0IER1IGlobiB2aWVsbGVpY2h0IGVpbmVyIFZhcmlhYmxlbiB6dXdlaXNlbj9gLFxyXG4gICAgICAgICAgICAgICAgXCJpbmZvXCIsIHN0LnBvc2l0aW9uKTtcclxuICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLnVuYXJ5T3AsIFRva2VuVHlwZS5wdXNoQ29uc3RhbnQsXHJcbiAgICAgICAgICAgIFRva2VuVHlwZS5pZGVudGlmaWVyLCBUb2tlblR5cGUuc2VsZWN0QXJyYXlFbGVtZW50XS5pbmRleE9mKHN0LnR5cGUpID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgV2VydCBkaWVzZXMgVGVybXMgd2lyZCB6d2FyIGJlcmVjaG5ldCwgYWJlciBkYW5hY2ggdmVyd29yZmVuLiBNw7ZjaHRlc3QgRHUgaWhuIHZpZWxsZWljaHQgZWluZXIgVmFyaWFibGVuIHp1d2Vpc2VuP1wiLFxyXG4gICAgICAgICAgICAgICAgXCJpbmZvXCIsIHN0LnBvc2l0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VTdGF0ZW1lbnQoZXhwZWN0U2VtaWNvbG9uOiBib29sZWFuID0gdHJ1ZSk6IEFTVE5vZGVbXSB7XHJcblxyXG4gICAgICAgIGxldCByZXRTdGF0ZW1lbnRzOiBBU1ROb2RlW10gPSBudWxsO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKHRoaXMudHQpIHtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubGVmdEJyYWNrZXQ6XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmlkZW50aWZpZXI6XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRUaGlzOlxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkU3VwZXI6XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRGaW5hbDpcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuY2hhckNvbnN0YW50OlxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5pbnRlZ2VyQ29uc3RhbnQ6XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnN0cmluZ0NvbnN0YW50OlxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5ib29sZWFuQ29uc3RhbnQ6XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmZsb2F0aW5nUG9pbnRDb25zdGFudDpcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZE5ldzpcclxuICAgICAgICAgICAgICAgIGxldCByZXQgPSB0aGlzLnBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbk9yVGVybSgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGV4cGVjdFNlbWljb2xvbikgdGhpcy5leHBlY3QoVG9rZW5UeXBlLnNlbWljb2xvbiwgdHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICByZXRTdGF0ZW1lbnRzID0gcmV0O1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmxlZnRDdXJseUJyYWNrZXQ6XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGVtZW50czogQVNUTm9kZVtdID0gW107XHJcbiAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb25Gcm9tID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgIHdoaWxlICh0aGlzLnR0ICE9IFRva2VuVHlwZS5yaWdodEN1cmx5QnJhY2tldCAmJiB0aGlzLnR0ICE9IFRva2VuVHlwZS5lbmRvZlNvdXJjZWNvZGVcclxuICAgICAgICAgICAgICAgICAgICAmJiBQYXJzZXIuQmVmb3JlQ2xhc3NEZWZpbml0aW9uVG9rZW5zLmluZGV4T2YodGhpcy50dCkgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KHRoaXMucGFyc2VTdGF0ZW1lbnQoKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb25UbyA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvblRvLmNvbHVtbiA9IHBvc2l0aW9uVG8uY29sdW1uICsgcG9zaXRpb25Uby5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvblRvLmxlbmd0aCA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUucmlnaHRDdXJseUJyYWNrZXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldFN0YXRlbWVudHMgPSBbe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5zY29wZU5vZGUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uRnJvbSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvblRvOiBwb3NpdGlvblRvLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IHN0YXRlbWVudHNcclxuICAgICAgICAgICAgICAgIH1dO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkV2hpbGU6XHJcbiAgICAgICAgICAgICAgICByZXRTdGF0ZW1lbnRzID0gdGhpcy5wYXJzZVdoaWxlKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZEZvcjpcclxuICAgICAgICAgICAgICAgIHJldFN0YXRlbWVudHMgPSB0aGlzLnBhcnNlRm9yKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZERvOlxyXG4gICAgICAgICAgICAgICAgcmV0U3RhdGVtZW50cyA9IHRoaXMucGFyc2VEbygpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRJZjpcclxuICAgICAgICAgICAgICAgIHJldFN0YXRlbWVudHMgPSB0aGlzLnBhcnNlSWYoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkUmV0dXJuOlxyXG4gICAgICAgICAgICAgICAgcmV0U3RhdGVtZW50cyA9IHRoaXMucGFyc2VSZXR1cm4oKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkUHJpbnQ6XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRQcmludGxuOlxyXG4gICAgICAgICAgICAgICAgcmV0U3RhdGVtZW50cyA9IHRoaXMucGFyc2VQcmludCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRTd2l0Y2g6XHJcbiAgICAgICAgICAgICAgICByZXRTdGF0ZW1lbnRzID0gdGhpcy5wYXJzZVN3aXRjaCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRCcmVhazpcclxuICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICAgICAgcmV0U3RhdGVtZW50cyA9IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmtleXdvcmRCcmVhayxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb25cclxuICAgICAgICAgICAgICAgIH1dO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRDb250aW51ZTpcclxuICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjEgPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgICAgIHJldFN0YXRlbWVudHMgPSBbe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5rZXl3b3JkQ29udGludWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uMVxyXG4gICAgICAgICAgICAgICAgfV07XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2VtaWNvbG9uOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICBsZXQgcyA9IFRva2VuVHlwZVJlYWRhYmxlW3RoaXMudHRdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHMgIT0gdGhpcy5jY3QudmFsdWUpIHMgKz0gXCIoXCIgKyB0aGlzLmNjdC52YWx1ZSArIFwiKVwiO1xyXG4gICAgICAgICAgICAgICAgcyArPSBcIiB3aXJkIGhpZXIgbmljaHQgZXJ3YXJ0ZXQuXCI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihzKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgZG9udFNraXAgPSBQYXJzZXIuQmVmb3JlQ2xhc3NEZWZpbml0aW9uVG9rZW5zLmluZGV4T2YodGhpcy50dCkgPj0gMDtcclxuICAgICAgICAgICAgICAgIGlmICghZG9udFNraXApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihyZXRTdGF0ZW1lbnRzID09IG51bGwpe1xyXG4gICAgICAgICAgICAvLyBza2lwIGFkZGl0aW9uYWwgc2VtaWNvbG9ucyBpZiBwcmVzZW50Li4uXHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnR0ID09IFRva2VuVHlwZS5zZW1pY29sb24gJiYgZXhwZWN0U2VtaWNvbG9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihyZXRTdGF0ZW1lbnRzICE9IG51bGwgJiYgcmV0U3RhdGVtZW50cy5sZW5ndGggPiAwKXtcclxuICAgICAgICAgICAgbGV0IHJldFN0bXQgPSByZXRTdGF0ZW1lbnRzW3JldFN0YXRlbWVudHMubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgIGlmKHJldFN0bXQgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrSWZTdGF0ZW1lbnRIYXNOb0VmZmVrdChyZXRTdGF0ZW1lbnRzW3JldFN0YXRlbWVudHMubGVuZ3RoIC0gMV0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0U3RhdGVtZW50cyA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXRTdGF0ZW1lbnRzO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwYXJzZVJldHVybigpOiBBU1ROb2RlW10ge1xyXG5cclxuICAgICAgICBsZXQgcG9zaXRpb24gPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG5cclxuICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG5cclxuICAgICAgICBsZXQgdGVybTogVGVybU5vZGU7XHJcblxyXG4gICAgICAgIGlmICghKHRoaXMudHQgPT0gVG9rZW5UeXBlLnNlbWljb2xvbikpIHtcclxuICAgICAgICAgICAgdGVybSA9IHRoaXMucGFyc2VUZXJtKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5zZW1pY29sb24sIHRydWUsIHRydWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFt7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5rZXl3b3JkUmV0dXJuLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgIHRlcm06IHRlcm1cclxuICAgICAgICB9XTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VXaGlsZSgpOiBBU1ROb2RlW10ge1xyXG5cclxuICAgICAgICBsZXQgcG9zaXRpb24gPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG5cclxuICAgICAgICB0aGlzLm5leHRUb2tlbigpOyAvLyBjb25zdW1lIHdoaWxlXHJcbiAgICAgICAgbGV0IHNjb3BlRnJvbSA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmV4cGVjdChUb2tlblR5cGUubGVmdEJyYWNrZXQsIHRydWUpKSB7XHJcbiAgICAgICAgICAgIGxldCBjb25kaXRpb24gPSB0aGlzLnBhcnNlVGVybSgpO1xyXG4gICAgICAgICAgICBsZXQgcmlnaHRCcmFja2V0UG9zaXRpb24gID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW9kdWxlLnB1c2hNZXRob2RDYWxsUG9zaXRpb24ocG9zaXRpb24sIFtdLCBcIndoaWxlXCIsIHJpZ2h0QnJhY2tldFBvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5yaWdodEJyYWNrZXQsIHRydWUpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUuc2VtaWNvbG9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZXNlIHdoaWxlLWxvb3Agd2llZGVyaG9sdCBudXIgZGVuIFN0cmljaHB1bmt0IChsZWVyZSBBbndlaXN1bmcpLlwiLCBcIndhcm5pbmdcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IHN0YXRlbWVudHMgPSB0aGlzLnBhcnNlU3RhdGVtZW50KCk7XHJcbiAgICAgICAgICAgIGxldCBzY29wZVRvID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgc2NvcGVUby5sZW5ndGggPSAwO1xyXG5cclxuICAgICAgICAgICAgaWYgKHN0YXRlbWVudHMgIT0gbnVsbCAmJiBzdGF0ZW1lbnRzLmxlbmd0aCA+IDAgJiYgc3RhdGVtZW50c1swXS50eXBlID09IFRva2VuVHlwZS5zY29wZU5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlVG8gPSAoPFNjb3BlTm9kZT5zdGF0ZW1lbnRzWzBdKS5wb3NpdGlvblRvO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5rZXl3b3JkV2hpbGUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlRnJvbTogc2NvcGVGcm9tLFxyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlVG86IHNjb3BlVG8sXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZGl0aW9uOiBjb25kaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogc3RhdGVtZW50c1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBbXTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VGb3IoKTogQVNUTm9kZVtdIHtcclxuXHJcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgbGV0IHNlbWljb2xvblBvc2l0aW9uczogVGV4dFBvc2l0aW9uW10gPSBbXTtcclxuXHJcbiAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTsgLy8gY29uc3VtZSBmb3JcclxuXHJcbiAgICAgICAgbGV0IHNjb3BlRnJvbSA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmV4cGVjdChUb2tlblR5cGUubGVmdEJyYWNrZXQsIHRydWUpKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jdFsyXS50dCA9PSBUb2tlblR5cGUuY29sb24pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlRm9yTG9vcE92ZXJDb2xsZWN0aW9uKHBvc2l0aW9uLCBzY29wZUZyb20pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgc3RhdGVtZW50c0JlZm9yZSA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoZmFsc2UpO1xyXG4gICAgICAgICAgICBzZW1pY29sb25Qb3NpdGlvbnMucHVzaCh0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpKTtcclxuICAgICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLnNlbWljb2xvbik7XHJcbiAgICAgICAgICAgIGxldCBjb25kaXRpb24gPSB0aGlzLnBhcnNlVGVybSgpO1xyXG4gICAgICAgICAgICBzZW1pY29sb25Qb3NpdGlvbnMucHVzaCh0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpKTtcclxuICAgICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLnNlbWljb2xvbiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIGxldCBzdGF0ZW1lbnRzQWZ0ZXIgPSB0aGlzLnBhcnNlU3RhdGVtZW50KGZhbHNlKTtcclxuXHJcbiAgICAgICAgICAgIGxldCByaWdodEJyYWNrZXRQb3NpdGlvbiA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5yaWdodEJyYWNrZXQsIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb2R1bGUucHVzaE1ldGhvZENhbGxQb3NpdGlvbihwb3NpdGlvbiwgc2VtaWNvbG9uUG9zaXRpb25zLCBcImZvclwiLCByaWdodEJyYWNrZXRQb3NpdGlvbik7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUuc2VtaWNvbG9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZXNlIGZvci1sb29wIHdpZWRlcmhvbHQgbnVyIGRlbiBTdHJpY2hwdW5rdCAobGVlcmUgQW53ZWlzdW5nKS5cIiwgXCJ3YXJuaW5nXCIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgbGV0IHN0YXRlbWVudHMgPSB0aGlzLnBhcnNlU3RhdGVtZW50KCk7XHJcbiAgICAgICAgICAgIGxldCBzY29wZVRvID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgc2NvcGVUby5sZW5ndGggPSAwO1xyXG5cclxuICAgICAgICAgICAgaWYgKHN0YXRlbWVudHMgIT0gbnVsbCAmJiBzdGF0ZW1lbnRzLmxlbmd0aCA+IDAgJiYgc3RhdGVtZW50c1swXS50eXBlID09IFRva2VuVHlwZS5zY29wZU5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlVG8gPSAoPFNjb3BlTm9kZT5zdGF0ZW1lbnRzWzBdKS5wb3NpdGlvblRvO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY29uZGl0aW9uID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGNvbmRpdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaENvbnN0YW50LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0YW50VHlwZTogVG9rZW5UeXBlLmJvb2xlYW5Db25zdGFudCxcclxuICAgICAgICAgICAgICAgICAgICBjb25zdGFudDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5rZXl3b3JkRm9yLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzY29wZUZyb206IHNjb3BlRnJvbSxcclxuICAgICAgICAgICAgICAgICAgICBzY29wZVRvOiBzY29wZVRvLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmRpdGlvbjogY29uZGl0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHNCZWZvcmU6IHN0YXRlbWVudHNCZWZvcmUsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50c0FmdGVyOiBzdGF0ZW1lbnRzQWZ0ZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogc3RhdGVtZW50c1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBbXTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VGb3JMb29wT3ZlckNvbGxlY3Rpb24ocG9zaXRpb246IFRleHRQb3NpdGlvbiwgc2NvcGVGcm9tOiBUZXh0UG9zaXRpb24pOiBBU1ROb2RlW10ge1xyXG5cclxuICAgICAgICBsZXQgdmFyaWFibGVUeXBlID0gdGhpcy5wYXJzZVR5cGUoKTtcclxuXHJcbiAgICAgICAgbGV0IHZhcmlhYmxlSWRlbnRpZmllciA9IDxzdHJpbmc+dGhpcy5jY3QudmFsdWU7XHJcbiAgICAgICAgbGV0IHZhcmlhYmxlSWRlbnRpZmllclBvc2l0aW9uID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG5cclxuICAgICAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuY29sb24sIHRydWUpO1xyXG5cclxuICAgICAgICBsZXQgY29sbGVjdGlvbiA9IHRoaXMucGFyc2VUZXJtKCk7XHJcblxyXG4gICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5yaWdodEJyYWNrZXQsIHRydWUpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUuc2VtaWNvbG9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllc2UgZm9yLWxvb3Agd2llZGVyaG9sdCBudXIgZGVuIFN0cmljaHB1bmt0IChsZWVyZSBBbndlaXN1bmcpLlwiLCBcIndhcm5pbmdcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoKTtcclxuICAgICAgICBsZXQgc2NvcGVUbyA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcbiAgICAgICAgc2NvcGVUby5sZW5ndGggPSAwO1xyXG5cclxuICAgICAgICBpZiAoc3RhdGVtZW50cyAhPSBudWxsICYmIHN0YXRlbWVudHMubGVuZ3RoID4gMCAmJiBzdGF0ZW1lbnRzWzBdLnR5cGUgPT0gVG9rZW5UeXBlLnNjb3BlTm9kZSkge1xyXG4gICAgICAgICAgICBzY29wZVRvID0gKDxTY29wZU5vZGU+c3RhdGVtZW50c1swXSkucG9zaXRpb25UbztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChjb2xsZWN0aW9uID09IG51bGwgfHwgdmFyaWFibGVUeXBlID09IG51bGwgfHwgc3RhdGVtZW50cyA9PSBudWxsKSByZXR1cm4gW107XHJcblxyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5mb3JMb29wT3ZlckNvbGxlY3Rpb24sXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzY29wZUZyb206IHNjb3BlRnJvbSxcclxuICAgICAgICAgICAgICAgIHNjb3BlVG86IHNjb3BlVG8sXHJcbiAgICAgICAgICAgICAgICB2YXJpYWJsZUlkZW50aWZpZXI6IHZhcmlhYmxlSWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgIHZhcmlhYmxlVHlwZTogdmFyaWFibGVUeXBlLFxyXG4gICAgICAgICAgICAgICAgdmFyaWFibGVQb3NpdGlvbjogdmFyaWFibGVJZGVudGlmaWVyUG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RhdGVtZW50czogc3RhdGVtZW50c1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VQcmludCgpOiBBU1ROb2RlW10ge1xyXG5cclxuICAgICAgICBsZXQgdHQgPSB0aGlzLnR0O1xyXG4gICAgICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmV4cGVjdChUb2tlblR5cGUubGVmdEJyYWNrZXQsIGZhbHNlKSkge1xyXG4gICAgICAgICAgICBsZXQgbWNwID0gdGhpcy5wYXJzZU1ldGhvZENhbGxQYXJhbWV0ZXJzKCk7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWVudGVycyA9IG1jcC5ub2RlcztcclxuICAgICAgICAgICAgaWYgKHBhcmFtZW50ZXJzLmxlbmd0aCA+IDIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIE1ldGhvZGVuIHByaW50IHVuZCBwcmludGxuIGhhYmVuIG1heGltYWwgendlaSBQYXJhbWV0ZXIuXCIsIFwiZXJyb3JcIiwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuc2VtaWNvbG9uLCB0cnVlLCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBbe1xyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICB0eXBlOiB0dCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHRleHQ6IHBhcmFtZW50ZXJzLmxlbmd0aCA9PSAwID8gbnVsbCA6IHBhcmFtZW50ZXJzWzBdLFxyXG4gICAgICAgICAgICAgICAgY29sb3I6IHBhcmFtZW50ZXJzLmxlbmd0aCA8PSAxID8gbnVsbCA6IHBhcmFtZW50ZXJzWzFdLFxyXG4gICAgICAgICAgICAgICAgY29tbWFQb3NpdGlvbnM6IG1jcC5jb21tYVBvc2l0aW9ucyxcclxuICAgICAgICAgICAgICAgIHJpZ2h0QnJhY2tldFBvc2l0aW9uOiBtY3AucmlnaHRCcmFja2V0UG9zaXRpb25cclxuICAgICAgICAgICAgfV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VTd2l0Y2goKTogQVNUTm9kZVtdIHtcclxuXHJcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgIGlmICh0aGlzLmV4cGVjdChUb2tlblR5cGUubGVmdEJyYWNrZXQsIHRydWUpKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgc3dpdGNoVGVybSA9IHRoaXMucGFyc2VUZXJtKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1vZHVsZS5wdXNoTWV0aG9kQ2FsbFBvc2l0aW9uKHBvc2l0aW9uLCBbXSwgXCJzd2l0Y2hcIiwgdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUucmlnaHRCcmFja2V0KTtcclxuICAgICAgICAgICAgbGV0IHNjb3BlRnJvbSA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUubGVmdEN1cmx5QnJhY2tldCwgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgc3dpdGNoTm9kZTogU3dpdGNoTm9kZSA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5rZXl3b3JkU3dpdGNoLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc2NvcGVGcm9tOiBzY29wZUZyb20sXHJcbiAgICAgICAgICAgICAgICBzY29wZVRvOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgY29uZGl0aW9uOiBzd2l0Y2hUZXJtLFxyXG4gICAgICAgICAgICAgICAgY2FzZU5vZGVzOiBbXVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZGVmYXVsdEFscmVhZHlUaGVyZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudHQgPT0gVG9rZW5UeXBlLmtleXdvcmRDYXNlIHx8IHRoaXMudHQgPT0gVG9rZW5UeXBlLmtleXdvcmREZWZhdWx0KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgY2FzZVBvc2l0aW9uID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaXNEZWZhdWx0ID0gdGhpcy50dCA9PSBUb2tlblR5cGUua2V5d29yZERlZmF1bHQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNEZWZhdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlZmF1bHRBbHJlYWR5VGhlcmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW5lIHN3aXRjaC1BbndlaXN1bmcgZGFyZiBudXIgbWF4aW1hbCBlaW5lbiBkZWZhdWx0LVp3ZWlnIGhhYmVuLlwiLCBcImVycm9yXCIsIGNhc2VQb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdEFscmVhZHlUaGVyZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGNhc2VUZXJtID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIGlmICghaXNEZWZhdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZVRlcm0gPSB0aGlzLnBhcnNlVW5hcnkoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuY29sb24sIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZW1lbnRzOiBBU1ROb2RlW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMudHQgIT0gVG9rZW5UeXBlLnJpZ2h0Q3VybHlCcmFja2V0ICYmIHRoaXMudHQgIT0gVG9rZW5UeXBlLmVuZG9mU291cmNlY29kZVxyXG4gICAgICAgICAgICAgICAgICAgICYmIHRoaXMudHQgIT0gVG9rZW5UeXBlLmtleXdvcmRDYXNlICYmIHRoaXMudHQgIT0gVG9rZW5UeXBlLmtleXdvcmREZWZhdWx0XHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgb2xkUG9zID0gdGhpcy5wb3M7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXRlbWVudCA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGVtZW50ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KHN0YXRlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmKG9sZFBvcyA9PSB0aGlzLnBvcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKHRoaXMuY2N0LnZhbHVlICsgXCIgd2lyZCBoaWVyIG5pY2h0IGVyd2FydGV0LlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHN3aXRjaENhc2VOb2RlOiBTd2l0Y2hDYXNlTm9kZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUua2V5d29yZENhc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGNhc2VQb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBjYXNlVGVybTogY2FzZVRlcm0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogc3RhdGVtZW50c1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHN3aXRjaE5vZGUuY2FzZU5vZGVzLnB1c2goc3dpdGNoQ2FzZU5vZGUpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc3dpdGNoTm9kZS5zY29wZVRvID0gdGhpcy5nZXRFbmRPZkN1cnJlbnRUb2tlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUucmlnaHRDdXJseUJyYWNrZXQsIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIFtzd2l0Y2hOb2RlXTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VJZigpOiBBU1ROb2RlW10ge1xyXG5cclxuICAgICAgICBsZXQgcG9zaXRpb24gPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG5cclxuICAgICAgICB0aGlzLm5leHRUb2tlbigpOyAvLyBjb25zdW1lIGlmXHJcbiAgICAgICAgaWYgKHRoaXMuZXhwZWN0KFRva2VuVHlwZS5sZWZ0QnJhY2tldCwgdHJ1ZSkpIHtcclxuICAgICAgICAgICAgbGV0IGNvbmRpdGlvbiA9IHRoaXMucGFyc2VUZXJtKCk7XHJcbiAgICAgICAgICAgIGxldCByaWdodEJyYWNrZXRQb3NpdGlvbiA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgIHRoaXMubW9kdWxlLnB1c2hNZXRob2RDYWxsUG9zaXRpb24ocG9zaXRpb24sIFtdLCBcImlmXCIsIHJpZ2h0QnJhY2tldFBvc2l0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLnJpZ2h0QnJhY2tldCwgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUuc2VtaWNvbG9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkZhbGxzIGRpZSBCZWRpbmd1bmcgenV0cmlmZnQsIHdpcmQgbnVyIGRlciBTdHJpY2hwdW5rdCBhdXNnZWbDvGhydCAobGVlcmUgQW53ZWlzdW5nKS5cIiwgXCJ3YXJuaW5nXCIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgc3RhdGVtZW50cyA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnR0ID09IFRva2VuVHlwZS5zZW1pY29sb24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBlbHNlU3RhdGVtZW50czogQVNUTm9kZVtdID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbWVzVG9rZW4oVG9rZW5UeXBlLmtleXdvcmRFbHNlKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgICAgIGVsc2VTdGF0ZW1lbnRzID0gdGhpcy5wYXJzZVN0YXRlbWVudCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY29uZGl0aW9uID09IG51bGwgJiYgdGhpcy5lcnJvckxpc3QubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbmRpdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaENvbnN0YW50LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0YW50VHlwZTogVG9rZW5UeXBlLmJvb2xlYW5Db25zdGFudCxcclxuICAgICAgICAgICAgICAgICAgICBjb25zdGFudDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5rZXl3b3JkSWYsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmRpdGlvbjogY29uZGl0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHNJZlRydWU6IHN0YXRlbWVudHMsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50c0lmRmFsc2U6IGVsc2VTdGF0ZW1lbnRzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF07XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwYXJzZURvKCk6IEFTVE5vZGVbXSB7XHJcblxyXG4gICAgICAgIC8vIGxldCBpID0gMTA7XHJcbiAgICAgICAgLy8gZG8ge1xyXG4gICAgICAgIC8vICAgICBpID0gaSArNztcclxuICAgICAgICAvLyB9IHdoaWxlIChpIDwgMTAwKTtcclxuXHJcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgbGV0IHNjb3BlRnJvbSA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcbiAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTsgLy8gY29uc3VtZSBkb1xyXG4gICAgICAgIGxldCBzdGF0ZW1lbnRzID0gdGhpcy5wYXJzZVN0YXRlbWVudCgpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5leHBlY3QoVG9rZW5UeXBlLmtleXdvcmRXaGlsZSwgdHJ1ZSkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhwZWN0KFRva2VuVHlwZS5sZWZ0QnJhY2tldCwgdHJ1ZSkpIHtcclxuICAgICAgICAgICAgICAgIGxldCBjb25kaXRpb24gPSB0aGlzLnBhcnNlVGVybSgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNjb3BlVG8gPSB0aGlzLmdldEVuZE9mQ3VycmVudFRva2VuKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLnJpZ2h0QnJhY2tldCwgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5rZXl3b3JkRG8sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVGcm9tOiBzY29wZUZyb20sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlVG86IHNjb3BlVG8sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmRpdGlvbjogY29uZGl0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBzdGF0ZW1lbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb21lc0dlbmVyaWNUeXBlKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmICh0aGlzLmN0WzFdLnR0ICE9IFRva2VuVHlwZS5sb3dlcikgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmICh0aGlzLmN0WzJdLnR0ICE9IFRva2VuVHlwZS5pZGVudGlmaWVyKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY3RbM10udHQgPT0gVG9rZW5UeXBlLmdyZWF0ZXIgfHwgdGhpcy5jdFszXS50dCA9PSBUb2tlblR5cGUuY29tbWE7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbk9yVGVybSgpOiBBU1ROb2RlW10ge1xyXG5cclxuICAgICAgICAvLyBUd28gaWRlbnRpZmllcnMgaW4gYSByb3cgb3IgaWRlbnRpZmllcltdXHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAodGhpcy50dCA9PSBUb2tlblR5cGUuaWRlbnRpZmllciB8fCB0aGlzLnR0ID09IFRva2VuVHlwZS5rZXl3b3JkRmluYWwpICYmXHJcbiAgICAgICAgICAgICh0aGlzLmN0WzFdLnR0ID09IFRva2VuVHlwZS5pZGVudGlmaWVyXHJcbiAgICAgICAgICAgICAgICB8fCB0aGlzLmN0WzFdLnR0ID09IFRva2VuVHlwZS5sZWZ0UmlnaHRTcXVhcmVCcmFja2V0IHx8XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbWVzR2VuZXJpY1R5cGUoKSBcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBsZXQgcmV0OiBBU1ROb2RlW10gPSBbXTtcclxuICAgICAgICAgICAgbGV0IHR5cGU6IFR5cGVOb2RlID0gbnVsbDtcclxuICAgICAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCkgdGhpcy5leHBlY3QoVG9rZW5UeXBlLmNvbW1hLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIGxldCB2ZCA9IHRoaXMucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uKHR5cGUpO1xyXG4gICAgICAgICAgICAgICAgcmV0LnB1c2godmQpO1xyXG4gICAgICAgICAgICAgICAgdHlwZSA9IHZkPy52YXJpYWJsZVR5cGU7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgfSB3aGlsZSAodGhpcy50dCA9PSBUb2tlblR5cGUuY29tbWEpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHJldDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gW3RoaXMucGFyc2VUZXJtKCldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VUZXJtKCk6IFRlcm1Ob2RlIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5wYXJzZVRlcm1CaW5hcnkoMCk7XHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VUZXJtQmluYXJ5KHByZWNlZGVuY2U6IG51bWJlcik6IFRlcm1Ob2RlIHtcclxuXHJcbiAgICAgICAgbGV0IGxlZnQ6IFRlcm1Ob2RlO1xyXG4gICAgICAgIGlmIChwcmVjZWRlbmNlIDwgUGFyc2VyLm9wZXJhdG9yUHJlY2VkZW5jZS5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgIGxlZnQgPSB0aGlzLnBhcnNlVGVybUJpbmFyeShwcmVjZWRlbmNlICsgMSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGVmdCA9IHRoaXMucGFyc2VQbHVzUGx1c01pbnVzTWludXMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBvcGVyYXRvcnMgPSBQYXJzZXIub3BlcmF0b3JQcmVjZWRlbmNlW3ByZWNlZGVuY2VdO1xyXG5cclxuICAgICAgICBpZiAobGVmdCA9PSBudWxsIHx8IG9wZXJhdG9ycy5pbmRleE9mKHRoaXMudHQpIDwgMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbGVmdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBmaXJzdCA9IHRydWU7XHJcblxyXG4gICAgICAgIC8vIDI4LjA1LjIwMjE6IFRoaXMgYnJva2UgZXZhbGF0aW9uIG9mIHRlcm5lcnkgb3BlcmF0b3IsIHNvIGkgY29tbWVudGVkIGl0IG91dC5cclxuICAgICAgICAvLyBEb24ndCBrbm93IHdoeSBpdCB3YXMgdGhlcmUgaW4gdGhlIGZpcnN0IHBsYWNlLCBzbyBpIGV4cGVjdCBzb21lIGhhdm9jIHRvIGNvbWUuLi5cclxuICAgICAgICAvLyAxNSBNaW51dGVzIGxhdGVyOlxyXG4gICAgICAgIC8vIFRoaXMgaWYtY2xhdXNlIHdhcyBoZXJlIHRvIG1ha2UgdGVybXMgYWJlciBjYXNlIHBvc3NpYmxlLCBlLmcuIHN3aXRjaChhKXsgY2FzZSA3ICsgMjogcHJpbnRsbihcIkhlcmUhXCIpfVxyXG4gICAgICAgIC8vIC0+IEJhZCBpZGVhLiBJIGNoYW5nZWQgdGhpcyB0byBvbmx5IHBhcnNlIHVuYXJ5IFRlcm1zIGxlZnQgb2YgdGhlIGNvbG9uIHNvIGkgY2FuIGNvbW1lbnQgb3V0IHRoaXMgaWYtY2xhdXNlIGhlcmVcclxuICAgICAgICAvLyBhbmQgZml4IHRoZSB0ZXJuYXJ5IG9wZXJhdG9yLlxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gaWYgKHRoaXMudHQgPT0gVG9rZW5UeXBlLmNvbG9uKSB7XHJcbiAgICAgICAgLy8gICAgIHJldHVybiBsZWZ0O1xyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgd2hpbGUgKGZpcnN0IHx8IG9wZXJhdG9ycy5pbmRleE9mKHRoaXMudHQpID49IDApIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBvcGVyYXRvcjogVG9rZW5UeXBlID0gdGhpcy50dDtcclxuXHJcbiAgICAgICAgICAgIGZpcnN0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgb3BEYXRhIG9mIFt7IG9wOiBUb2tlblR5cGUubG93ZXIsIHdyb25nOiBcIj08XCIsIHJpZ2h0OiBcIjw9XCIsIGNvcnJlY3RPcDogVG9rZW5UeXBlLmxvd2VyT3JFcXVhbCB9LCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IG9wOiBUb2tlblR5cGUuZ3JlYXRlciwgd3Jvbmc6IFwiPT5cIiwgcmlnaHQ6IFwiPj1cIiwgY29ycmVjdE9wOiBUb2tlblR5cGUuZ3JlYXRlck9yRXF1YWwgfV0pIHtcclxuICAgICAgICAgICAgICAgIGlmIChvcGVyYXRvciA9PSBUb2tlblR5cGUuYXNzaWdubWVudCAmJiB0aGlzLnR0ID09IG9wRGF0YS5vcCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjIgPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKGBEZW4gT3BlcmF0b3IgJHtvcERhdGEud3Jvbmd9IGdpYnQgZXMgbmljaHQuIER1IG1laW50ZXN0IHNpY2hlcjogJHtvcERhdGEucmlnaHR9YCwgXCJlcnJvclwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHt9LCBwb3NpdGlvbiwgeyBsZW5ndGg6IDIgfSksIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGAke29wRGF0YS53cm9uZ30gZHVyY2ggJHtvcERhdGEucmlnaHR9IGVyc2V0emVuYCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWRpdHNQcm92aWRlcjogKHVyaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiB1cmksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiB7IHN0YXJ0TGluZU51bWJlcjogcG9zaXRpb24ubGluZSwgc3RhcnRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiwgZW5kTGluZU51bWJlcjogcG9zaXRpb24ubGluZSwgZW5kQ29sdW1uOiBwb3NpdGlvbjIuY29sdW1uICsgcG9zaXRpb24yLmxlbmd0aCB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogb3BEYXRhLnJpZ2h0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yID0gb3BEYXRhLmNvcnJlY3RPcDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHJpZ2h0OiBUZXJtTm9kZTtcclxuICAgICAgICAgICAgaWYgKHByZWNlZGVuY2UgPCBQYXJzZXIub3BlcmF0b3JQcmVjZWRlbmNlLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gdGhpcy5wYXJzZVRlcm1CaW5hcnkocHJlY2VkZW5jZSArIDEpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSB0aGlzLnBhcnNlUGx1c1BsdXNNaW51c01pbnVzKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChyaWdodCAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGNvbnN0YW50Rm9sZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNDb25zdGFudChsZWZ0KSAmJiB0aGlzLmlzQ29uc3RhbnQocmlnaHQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBjTGVmdCA9IDxDb25zdGFudE5vZGU+bGVmdDtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcGNSaWdodCA9IDxDb25zdGFudE5vZGU+cmlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHR5cGVMZWZ0ID0gVG9rZW5UeXBlVG9EYXRhVHlwZU1hcFtwY0xlZnQuY29uc3RhbnRUeXBlXTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdHlwZVJpZ2h0ID0gVG9rZW5UeXBlVG9EYXRhVHlwZU1hcFtwY1JpZ2h0LmNvbnN0YW50VHlwZV07XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdFR5cGUgPSB0eXBlTGVmdC5nZXRSZXN1bHRUeXBlKG9wZXJhdG9yLCB0eXBlUmlnaHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHRUeXBlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RhbnRGb2xkaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IHR5cGVMZWZ0LmNvbXB1dGUob3BlcmF0b3IsIHsgdHlwZTogdHlwZUxlZnQsIHZhbHVlOiBwY0xlZnQuY29uc3RhbnQgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogdHlwZVJpZ2h0LCB2YWx1ZTogcGNSaWdodC5jb25zdGFudCB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uc2lkZXJJbnREaXZpc2lvbldhcm5pbmcob3BlcmF0b3IsIHR5cGVMZWZ0LCBwY0xlZnQuY29uc3RhbnQsIHR5cGVSaWdodCwgcGNSaWdodC5jb25zdGFudCwgcG9zaXRpb24pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcGNMZWZ0LmNvbnN0YW50VHlwZSA9ICg8UHJpbWl0aXZlVHlwZT5yZXN1bHRUeXBlKS50b1Rva2VuVHlwZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwY0xlZnQuY29uc3RhbnQgPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBjTGVmdC5wb3NpdGlvbi5sZW5ndGggPSBwY1JpZ2h0LnBvc2l0aW9uLmNvbHVtbiArIHBjUmlnaHQucG9zaXRpb24ubGVuZ3RoIC0gcGNMZWZ0LnBvc2l0aW9uLmNvbHVtbjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFjb25zdGFudEZvbGRpbmcpXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmJpbmFyeU9wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBvcGVyYXRvcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RPcGVyYW5kOiBsZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmRPcGVyYW5kOiByaWdodFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBsZWZ0O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb25zaWRlckludERpdmlzaW9uV2FybmluZyhvcGVyYXRvcjogVG9rZW5UeXBlLCB0eXBlTGVmdDogVHlwZSwgbGVmdENvbnN0YW50OiBhbnksIHR5cGVSaWdodDogVHlwZSwgcmlnaHRDb25zdGFudDogYW55LCBwb3NpdGlvbjogVGV4dFBvc2l0aW9uKSB7XHJcbiAgICBcclxuICAgICAgICBpZihvcGVyYXRvciA9PSBUb2tlblR5cGUuZGl2aXNpb24pe1xyXG4gICAgICAgICAgICBpZih0aGlzLmlzSW50ZWdlclR5cGUodHlwZUxlZnQpICYmIHRoaXMuaXNJbnRlZ2VyVHlwZSh0eXBlUmlnaHQpKXtcclxuICAgICAgICAgICAgICAgIGlmKHJpZ2h0Q29uc3RhbnQgIT0gMCAmJiBsZWZ0Q29uc3RhbnQvcmlnaHRDb25zdGFudCAhPSBNYXRoLmZsb29yKGxlZnRDb25zdGFudC9yaWdodENvbnN0YW50KSl7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEYSBcIiArIGxlZnRDb25zdGFudCArIFwiIHVuZCBcIiArIHJpZ2h0Q29uc3RhbnQgKyBcIiBnYW56emFobGlnZSBXZXJ0ZSBzaW5kLCB3aXJkIGRpZXNlIERpdmlzaW9uIGFscyBHYW56emFobGRpdmlzaW9uIGF1c2dlZsO8aHJ0IHVuZCBlcmdpYnQgZGVuIFdlcnQgXCIgKyBNYXRoLmZsb29yKGxlZnRDb25zdGFudC9yaWdodENvbnN0YW50KSArIFwiLiBGYWxscyBkYXMgbmljaHQgZ2V3w7xuc2NodCBpc3QsIGjDpG5nZSAnLjAnIGFuIGVpbmVuIGRlciBPcGVyYW5kZW4uXCIsIFwiaW5mb1wiLCBwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICBcclxuICAgIH1cclxuXHJcbiAgICBpc0ludGVnZXJUeXBlKHR5cGU6IFR5cGUpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdHlwZSA9PSBpbnRQcmltaXRpdmVUeXBlO1xyXG4gICAgfVxyXG5cclxuICAgIGlzQ29uc3RhbnQobm9kZTogVGVybU5vZGUpIHtcclxuXHJcbiAgICAgICAgcmV0dXJuIChub2RlICE9IG51bGwgJiYgbm9kZS50eXBlID09IFRva2VuVHlwZS5wdXNoQ29uc3RhbnQpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwYXJzZVBsdXNQbHVzTWludXNNaW51cygpOiBUZXJtTm9kZSB7XHJcblxyXG4gICAgICAgIGxldCBpbmNyZW1lbnREZWNyZW1lbnRCZWZvcmU6IFRva2VuVHlwZSA9IG51bGw7XHJcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29tZXNUb2tlbihbVG9rZW5UeXBlLmRvdWJsZVBsdXMsIFRva2VuVHlwZS5kb3VibGVNaW51c10pKSB7XHJcbiAgICAgICAgICAgIGluY3JlbWVudERlY3JlbWVudEJlZm9yZSA9IHRoaXMudHQ7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB0OiBUZXJtTm9kZSA9IHRoaXMucGFyc2VVbmFyeSgpO1xyXG5cclxuICAgICAgICBpZiAoaW5jcmVtZW50RGVjcmVtZW50QmVmb3JlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdCA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5pbmNyZW1lbnREZWNyZW1lbnRCZWZvcmUsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogaW5jcmVtZW50RGVjcmVtZW50QmVmb3JlLFxyXG4gICAgICAgICAgICAgICAgb3BlcmFuZDogdFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb21lc1Rva2VuKFtUb2tlblR5cGUuZG91YmxlUGx1cywgVG9rZW5UeXBlLmRvdWJsZU1pbnVzXSkpIHtcclxuICAgICAgICAgICAgdCA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5pbmNyZW1lbnREZWNyZW1lbnRBZnRlcixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpLFxyXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IHRoaXMudHQsXHJcbiAgICAgICAgICAgICAgICBvcGVyYW5kOiB0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLCBub3QsIHRoaXMsIHN1cGVyLCBhLmIuY1tdW10uZCwgYS5iKCksIGIoKSAoPT0gdGhpcy5iKCkpLCBzdXBlci5iKCksIHN1cGVyKClcclxuICAgIHBhcnNlVW5hcnkoKTogVGVybU5vZGUge1xyXG5cclxuICAgICAgICBsZXQgdGVybTogVGVybU5vZGU7XHJcbiAgICAgICAgbGV0IHBvc2l0aW9uOiBUZXh0UG9zaXRpb24gPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKHRoaXMudHQpIHtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubGVmdEJyYWNrZXQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZURvdE9yQXJyYXlDaGFpbnModGhpcy5icmFja2V0T3JDYXN0aW5nKCkpO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5taW51czpcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubm90OlxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS50aWxkZTpcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gcG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICBsZXQgdHQxID0gdGhpcy50dDtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgICAgICB0ZXJtID0gdGhpcy5wYXJzZVVuYXJ5KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNDb25zdGFudCh0ZXJtKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwY1Rlcm0gPSA8Q29uc3RhbnROb2RlPnRlcm07XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHR5cGVUZXJtID0gVG9rZW5UeXBlVG9EYXRhVHlwZU1hcFtwY1Rlcm0uY29uc3RhbnRUeXBlXTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcmVzdWx0VHlwZSA9IHR5cGVUZXJtLmdldFJlc3VsdFR5cGUodHQxKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0VHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZXN1bHQgPSB0eXBlVGVybS5jb21wdXRlKHR0MSwgeyB0eXBlOiB0eXBlVGVybSwgdmFsdWU6IHBjVGVybS5jb25zdGFudCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGNUZXJtLmNvbnN0YW50VHlwZSA9ICg8UHJpbWl0aXZlVHlwZT5yZXN1bHRUeXBlKS50b1Rva2VuVHlwZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwY1Rlcm0uY29uc3RhbnQgPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uLmxlbmd0aCA9IHBjVGVybS5wb3NpdGlvbi5jb2x1bW4gLSBwb3NpdGlvbi5jb2x1bW4gKyAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGNUZXJtO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS51bmFyeU9wLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBvcGVyYW5kOiB0ZXJtLFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiB0dDFcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRTdXBlcjpcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN0WzFdLnR0ID09IFRva2VuVHlwZS5sZWZ0QnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7IC8vIHNraXAgXCJzdXBlclwiXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB0aGlzLnBhcnNlTWV0aG9kQ2FsbFBhcmFtZXRlcnMoKTtcclxuICAgICAgICAgICAgICAgICAgICB0ZXJtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuc3VwZXJDb25zdHJ1Y3RvckNhbGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlcmFuZHM6IHBhcmFtZXRlcnMubm9kZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hUG9zaXRpb25zOiBwYXJhbWV0ZXJzLmNvbW1hUG9zaXRpb25zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodEJyYWNrZXRQb3NpdGlvbjogcGFyYW1ldGVycy5yaWdodEJyYWNrZXRQb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRlcm07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRlcm0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5rZXl3b3JkU3VwZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VEb3RPckFycmF5Q2hhaW5zKHRlcm0pO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkVGhpczpcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN0WzFdLnR0ID09IFRva2VuVHlwZS5sZWZ0QnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7IC8vIHNraXAgXCJzdXBlclwiXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB0aGlzLnBhcnNlTWV0aG9kQ2FsbFBhcmFtZXRlcnMoKTtcclxuICAgICAgICAgICAgICAgICAgICB0ZXJtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY29uc3RydWN0b3JDYWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhbmRzOiBwYXJhbWV0ZXJzLm5vZGVzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tYVBvc2l0aW9uczogcGFyYW1ldGVycy5jb21tYVBvc2l0aW9ucyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHRCcmFja2V0UG9zaXRpb246IHBhcmFtZXRlcnMucmlnaHRCcmFja2V0UG9zaXRpb25cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0ZXJtO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0ZXJtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUua2V5d29yZFRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VEb3RPckFycmF5Q2hhaW5zKHRlcm0pO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkTmV3OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VEb3RPckFycmF5Q2hhaW5zKHRoaXMucGFyc2VOZXcoKSk7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmludGVnZXJDb25zdGFudDpcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuY2hhckNvbnN0YW50OlxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5mbG9hdGluZ1BvaW50Q29uc3RhbnQ6XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnN0cmluZ0NvbnN0YW50OlxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5ib29sZWFuQ29uc3RhbnQ6XHJcbiAgICAgICAgICAgICAgICB0ZXJtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQ29uc3RhbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCksXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3RhbnRUeXBlOiB0aGlzLnR0LFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0YW50OiB0aGlzLmNjdC52YWx1ZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGxldCBpc1N0cmluZ0NvbnN0YW50ID0gdGhpcy50dCA9PSBUb2tlblR5cGUuc3RyaW5nQ29uc3RhbnQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpc1N0cmluZ0NvbnN0YW50KSByZXR1cm4gdGhpcy5wYXJzZURvdE9yQXJyYXlDaGFpbnModGVybSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRlcm07XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmROdWxsOlxyXG4gICAgICAgICAgICAgICAgdGVybSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaENvbnN0YW50LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0YW50VHlwZTogVG9rZW5UeXBlLmtleXdvcmROdWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0YW50OiBudWxsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0ZXJtO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5pZGVudGlmaWVyOiAvLyBhdHRyaWJ1dGUgb2YgY3VycmVudCBjbGFzcyBvciBsb2NhbCB2YXJpYWJsZVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBpZGVudGlmaWVyMSA9IDxzdHJpbmc+dGhpcy5jY3QudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb24xID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUubGVmdEJyYWNrZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHRoaXMucGFyc2VNZXRob2RDYWxsUGFyYW1ldGVycygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCByaWdodEJyYWNrZXRQb3NpdGlvbiA9IHBhcmFtZXRlcnMucmlnaHRCcmFja2V0UG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRlcm0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYWxsTWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24xLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodEJyYWNrZXRQb3NpdGlvbjogcmlnaHRCcmFja2V0UG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhbmRzOiBwYXJhbWV0ZXJzLm5vZGVzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IHRlcm0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tYVBvc2l0aW9uczogcGFyYW1ldGVycy5jb21tYVBvc2l0aW9uc1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGVybSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb25cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VEb3RPckFycmF5Q2hhaW5zKHRlcm0pO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFcndhcnRldCB3aXJkIGVpbmUgVmFyaWFibGUsIGVpbiBNZXRob2RlbmF1ZnJ1ZiBvZGVyIHRoaXMgb2RlciBzdXBlci4gR2VmdW5kZW4gd3VyZGU6IFwiICsgdGhpcy5jY3QudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICB0b2tlbnNOb3RBZnRlckNhc3Rpbmc6IFRva2VuVHlwZVtdID0gW1Rva2VuVHlwZS5tdWx0aXBsaWNhdGlvbiwgVG9rZW5UeXBlLmRpdmlzaW9uLCBUb2tlblR5cGUucGx1cyxcclxuICAgIFRva2VuVHlwZS5taW51cywgVG9rZW5UeXBlLmRvdCwgVG9rZW5UeXBlLm1vZHVsbywgVG9rZW5UeXBlLnNlbWljb2xvbiwgVG9rZW5UeXBlLnJpZ2h0QnJhY2tldF07XHJcblxyXG4gICAgYnJhY2tldE9yQ2FzdGluZygpOiBUZXJtTm9kZSB7XHJcblxyXG4gICAgICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgIHRoaXMubmV4dFRva2VuKCk7IC8vIGNvbnN1bWUgKFxyXG5cclxuICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUuaWRlbnRpZmllciAmJiB0aGlzLmN0WzFdLnR0ID09IFRva2VuVHlwZS5yaWdodEJyYWNrZXQgJiZcclxuICAgICAgICAgICAgdGhpcy50b2tlbnNOb3RBZnRlckNhc3RpbmcuaW5kZXhPZih0aGlzLmN0WzJdLnR0KSA8IDApIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBjYXN0VG9UeXBlID0gdGhpcy5wYXJzZVR5cGUoKTtcclxuICAgICAgICAgICAgbGV0IHBvc2l0aW9uMSA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7IC8vIFBvc2l0aW9uIG9mIClcclxuICAgICAgICAgICAgcG9zaXRpb24ubGVuZ3RoID0gcG9zaXRpb24xLmNvbHVtbiAtIHBvc2l0aW9uLmNvbHVtbiArIDE7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUucmlnaHRCcmFja2V0LCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIGxldCB3aGF0VG9DYXN0ID0gdGhpcy5wYXJzZVBsdXNQbHVzTWludXNNaW51cygpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5jYXN0VmFsdWUsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBjYXN0VG9UeXBlOiBjYXN0VG9UeXBlLFxyXG4gICAgICAgICAgICAgICAgd2hhdFRvQ2FzdDogd2hhdFRvQ2FzdFxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgbGV0IHRlcm0gPSB0aGlzLnBhcnNlVGVybSgpO1xyXG4gICAgICAgICAgICBsZXQgcmlnaHRCcmFja2V0UG9zaXRpb24gPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUucmlnaHRCcmFja2V0LCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQ29uc3RhbnQodGVybSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0ZXJtO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgYnJhY2tldHNOb2RlOiBCcmFja2V0c05vZGUgPSB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogcmlnaHRCcmFja2V0UG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucmlnaHRCcmFja2V0LFxyXG4gICAgICAgICAgICAgICAgdGVybUluc2lkZUJyYWNrZXRzOiB0ZXJtXHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYnJhY2tldHNOb2RlO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHBhcnNlTmV3KCk6IFRlcm1Ob2RlIHtcclxuXHJcbiAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICBsZXQgcG9zaXRpb24gPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5leHBlY3QoVG9rZW5UeXBlLmlkZW50aWZpZXIsIGZhbHNlKSkge1xyXG4gICAgICAgICAgICBsZXQgaWRlbnRpZmllciA9IDxzdHJpbmc+dGhpcy5jY3QudmFsdWU7XHJcbiAgICAgICAgICAgIGxldCBpZGVudGlmaWVyUG9zaXRpb24gPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGxldCBnZW5lcmljUGFyYW1ldGVyVHlwZXM6IFR5cGVOb2RlW10gPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMudHQgPT0gVG9rZW5UeXBlLmxvd2VyKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgZ2VuZXJpY1BhcmFtZXRlclR5cGVzID0gW107XHJcbiAgICAgICAgICAgICAgICBsZXQgZmlyc3Q6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgIHdoaWxlICgoZmlyc3QgJiYgdGhpcy50dCA9PSBUb2tlblR5cGUuaWRlbnRpZmllcikgfHwgKCFmaXJzdCAmJiB0aGlzLnR0ID09IFRva2VuVHlwZS5jb21tYSkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmaXJzdCkgdGhpcy5uZXh0VG9rZW4oKTsgLy8gY29uc3VtZSBjb21tYVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmaXJzdCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBnZW5lcmljUGFyYW1ldGVyVHlwZXMucHVzaCh0aGlzLnBhcnNlVHlwZSgpKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLmdyZWF0ZXIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGdlbmVyaWNQYXJhbWV0ZXJUeXBlcy5sZW5ndGggPT0gMCkgZ2VuZXJpY1BhcmFtZXRlclR5cGVzID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMudHQgPT0gVG9rZW5UeXBlLmxlZnRTcXVhcmVCcmFja2V0IHx8IHRoaXMudHQgPT0gVG9rZW5UeXBlLmxlZnRSaWdodFNxdWFyZUJyYWNrZXQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZW5vZGU6IFR5cGVOb2RlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBhcnJheURpbWVuc2lvbjogMCxcclxuICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyaWNQYXJhbWV0ZXJUeXBlczogZ2VuZXJpY1BhcmFtZXRlclR5cGVzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLnR5cGVOb2Rlcy5wdXNoKHR5cGVub2RlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudENvdW50OiBUZXJtTm9kZVtdID0gW107XHJcblxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMudHQgPT0gVG9rZW5UeXBlLmxlZnRTcXVhcmVCcmFja2V0IHx8IHRoaXMudHQgPT0gVG9rZW5UeXBlLmxlZnRSaWdodFNxdWFyZUJyYWNrZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlbm9kZS5hcnJheURpbWVuc2lvbisrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUubGVmdFJpZ2h0U3F1YXJlQnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Q291bnQucHVzaChudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Q291bnQucHVzaCh0aGlzLnBhcnNlVGVybSgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLnJpZ2h0U3F1YXJlQnJhY2tldCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaW5pdGlhbGl6YXRpb24gPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnR0ID09IFRva2VuVHlwZS5sZWZ0Q3VybHlCcmFja2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5pdGlhbGl6YXRpb24gPSB0aGlzLnBhcnNlQXJyYXlMaXRlcmFsKHR5cGVub2RlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3QXJyYXlOb2RlOiBOZXdBcnJheU5vZGUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLm5ld0FycmF5LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBhcnJheVR5cGU6IHR5cGVub2RlLFxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRDb3VudDogZWxlbWVudENvdW50LFxyXG4gICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemF0aW9uOiBpbml0aWFsaXphdGlvblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXdBcnJheU5vZGU7XHJcblxyXG5cclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnR0ID09IFRva2VuVHlwZS5sZWZ0QnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB0aGlzLnBhcnNlTWV0aG9kQ2FsbFBhcmFtZXRlcnMoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY2xhc3NUeXBlOiBUeXBlTm9kZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUudHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogaWRlbnRpZmllclBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIGFycmF5RGltZW5zaW9uOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJpY1BhcmFtZXRlclR5cGVzOiBnZW5lcmljUGFyYW1ldGVyVHlwZXNcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnR5cGVOb2Rlcy5wdXNoKGNsYXNzVHlwZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubmV3T2JqZWN0LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc1R5cGU6IGNsYXNzVHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck9wZXJhbmRzOiBwYXJhbWV0ZXJzLm5vZGVzLFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0QnJhY2tldFBvc2l0aW9uOiBwYXJhbWV0ZXJzLnJpZ2h0QnJhY2tldFBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hUG9zaXRpb25zOiBwYXJhbWV0ZXJzLmNvbW1hUG9zaXRpb25zXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIktvbnN0cnVrdG9yYXVmcnVmIChhbHNvIHJ1bmRlIEtsYW1tZXIgYXVmKSBvZGVyIEFycmF5LUludGFuemllcnVuZyAoZWNraWdlIEtsYW1tZXIgYXVmKSBlcndhcnRldC5cIiwgXCJlcnJvclwiLCB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VBcnJheUxpdGVyYWwoYXJyYXlUeXBlOiBUeXBlTm9kZSk6IEFycmF5SW5pdGlhbGl6YXRpb25Ob2RlIHtcclxuICAgICAgICAvLyBleHBlY3RzIHsgYXMgbmV4dCB0b2tlblxyXG5cclxuICAgICAgICBsZXQgbm9kZXM6IChBcnJheUluaXRpYWxpemF0aW9uTm9kZSB8IFRlcm1Ob2RlKVtdID0gW107XHJcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICBsZXQgZGltZW5zaW9uID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLmxlZnRDdXJseUJyYWNrZXQsIHRydWUpO1xyXG4gICAgICAgIGlmICh0aGlzLnR0ICE9IFRva2VuVHlwZS5yaWdodEN1cmx5QnJhY2tldCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IGZpcnN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgd2hpbGUgKGZpcnN0IHx8IHRoaXMudHQgPT0gVG9rZW5UeXBlLmNvbW1hKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb24xID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWZpcnN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTsgLy8gY29uc3VtZSBjb21tYVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZmlyc3QgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3RGltZW5zaW9uOiBudW1iZXI7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUubGVmdEN1cmx5QnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXdUeXBlOiBUeXBlTm9kZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcnJheURpbWVuc2lvbjogYXJyYXlUeXBlLmFycmF5RGltZW5zaW9uIC0gMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogYXJyYXlUeXBlLmlkZW50aWZpZXJcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50eXBlTm9kZXMucHVzaChuZXdUeXBlKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYWwgPSB0aGlzLnBhcnNlQXJyYXlMaXRlcmFsKG5ld1R5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0RpbWVuc2lvbiA9IGFsLmRpbWVuc2lvbiArIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZXMucHVzaChhbCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVzLnB1c2godGhpcy5wYXJzZVRlcm0oKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3RGltZW5zaW9uID0gMTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZGltZW5zaW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGltZW5zaW9uICE9IG5ld0RpbWVuc2lvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkRpZSBEaW1lbnNpb24gZGllc2VzIEFycmF5LUxpdGVyYWxzIChcIiArIChuZXdEaW1lbnNpb24gLSAxKSArIFwiIGlzdCB1bmdsZWljaCBkZXJqZW5pZ2VuIGRlciB2b3JhbmdlZ2FuZ2VuZW4gQXJyYXktTGl0ZXJhbGUgKFwiICsgKGRpbWVuc2lvbiAtIDEpICsgXCIpLlwiLCBcImVycm9yXCIsIHBvc2l0aW9uMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uID0gbmV3RGltZW5zaW9uO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5yaWdodEN1cmx5QnJhY2tldCwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIGxldCBhaW46IEFycmF5SW5pdGlhbGl6YXRpb25Ob2RlID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuYXJyYXlJbml0aWFsaXphdGlvbixcclxuICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICBhcnJheVR5cGU6IGFycmF5VHlwZSxcclxuICAgICAgICAgICAgZGltZW5zaW9uOiBkaW1lbnNpb24sXHJcbiAgICAgICAgICAgIG5vZGVzOiBub2Rlc1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGFpbjtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VNZXRob2RDYWxsUGFyYW1ldGVycygpOiB7IHJpZ2h0QnJhY2tldFBvc2l0aW9uOiBUZXh0UG9zaXRpb24sIG5vZGVzOiBUZXJtTm9kZVtdLCBjb21tYVBvc2l0aW9uczogVGV4dFBvc2l0aW9uW10gfSB7XHJcbiAgICAgICAgLy8gQXNzdW1wdGlvbjogY3VycmVudCB0b2tlbiBpcyAoICAgICAgICBcclxuICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgIGlmICh0aGlzLnR0ID09IFRva2VuVHlwZS5yaWdodEJyYWNrZXQpIHtcclxuICAgICAgICAgICAgbGV0IHJpZ2h0QnJhY2tldFBvc2l0aW9uID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgcmlnaHRCcmFja2V0UG9zaXRpb246IHJpZ2h0QnJhY2tldFBvc2l0aW9uLCBub2RlczogW10sIGNvbW1hUG9zaXRpb25zOiBbXSB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHBhcmFtZXRlcnM6IFRlcm1Ob2RlW10gPSBbXTtcclxuICAgICAgICBsZXQgY29tbWFQb3NpdGlvbnM6IFRleHRQb3NpdGlvbltdID0gW107XHJcblxyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIGxldCBwb3MgPSB0aGlzLnBvcztcclxuXHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXIgPSB0aGlzLnBhcnNlVGVybSgpO1xyXG4gICAgICAgICAgICBpZiAocGFyYW1ldGVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlcnMucHVzaChwYXJhbWV0ZXIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy50dCAhPSBUb2tlblR5cGUuY29tbWEpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29tbWFQb3NpdGlvbnMucHVzaCh0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7IC8vIGNvbnN1bWUgY29tbWFcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gZW1lcmdlbmN5LXN0ZXA6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBvcyA9PSBwb3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcG9zaXRpb24gPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG4gICAgICAgIGxldCByaWdodEJyYWNrZXRGb3VuZCA9IHRoaXMuZXhwZWN0KFRva2VuVHlwZS5yaWdodEJyYWNrZXQsIHRydWUpO1xyXG5cclxuICAgICAgICByZXR1cm4geyByaWdodEJyYWNrZXRQb3NpdGlvbjogcmlnaHRCcmFja2V0Rm91bmQgPyBwb3NpdGlvbiA6IG51bGwsIG5vZGVzOiBwYXJhbWV0ZXJzLCBjb21tYVBvc2l0aW9uczogY29tbWFQb3NpdGlvbnMgfTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VEb3RPckFycmF5Q2hhaW5zKHRlcm06IFRlcm1Ob2RlKTogVGVybU5vZGUge1xyXG5cclxuICAgICAgICBpZiAodGVybSA9PSBudWxsKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgd2hpbGUgKHRoaXMuY29tZXNUb2tlbihbVG9rZW5UeXBlLmRvdCwgVG9rZW5UeXBlLmxlZnRTcXVhcmVCcmFja2V0XSkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudHQgPT0gVG9rZW5UeXBlLmRvdCkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnR0ICE9IFRva2VuVHlwZS5pZGVudGlmaWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFcndhcnRldCB3aXJkIGRlciBCZXplaWNobmVyIGVpbmVzIEF0dHJpYnV0cyBvZGVyIGVpbmVyIE1ldGhvZGUsIGdlZnVuZGVuIHd1cmRlOiBcIiArIHRoaXMuY2N0LnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGVybTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaWRlbnRpZmllciA9IDxzdHJpbmc+dGhpcy5jY3QudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb24gPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHQgPT0gVG9rZW5UeXBlLmxlZnRCcmFja2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB0aGlzLnBhcnNlTWV0aG9kQ2FsbFBhcmFtZXRlcnMoKTtcclxuICAgICAgICAgICAgICAgICAgICB0ZXJtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodEJyYWNrZXRQb3NpdGlvbjogcGFyYW1ldGVycy5yaWdodEJyYWNrZXRQb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlcmFuZHM6IHBhcmFtZXRlcnMubm9kZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogdGVybSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWFQb3NpdGlvbnM6IHBhcmFtZXRlcnMuY29tbWFQb3NpdGlvbnNcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRlcm0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQXR0cmlidXRlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogdGVybVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBsZXQgcG9zaXRpb24gPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gdGVybS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5kZXggPSB0aGlzLnBhcnNlVGVybSgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uRW5kID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjE6IFRleHRQb3NpdGlvbiA9IE9iamVjdC5hc3NpZ24oe30sIHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5yaWdodFNxdWFyZUJyYWNrZXQsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uRW5kLmxpbmUgPT0gcG9zaXRpb24ubGluZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uMS5sZW5ndGggPSBwb3NpdGlvbkVuZC5jb2x1bW4gKyBwb3NpdGlvbkVuZC5sZW5ndGggLSBwb3NpdGlvbjEuY29sdW1uO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjEgPSBwb3NpdGlvbkVuZDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRlcm0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnNlbGVjdEFycmF5RWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24xLFxyXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OiBpbmRleCxcclxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IHRlcm1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0ZXJtO1xyXG4gICAgfVxyXG5cclxuICAgIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbih0eXBlOiBUeXBlTm9kZSk6IExvY2FsVmFyaWFibGVEZWNsYXJhdGlvbk5vZGUge1xyXG5cclxuICAgICAgICBsZXQgaXNGaW5hbCA9IGZhbHNlO1xyXG4gICAgICAgIGlmICh0aGlzLnR0ID09IFRva2VuVHlwZS5rZXl3b3JkRmluYWwpIHtcclxuICAgICAgICAgICAgaXNGaW5hbCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodHlwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHR5cGUgPSB0aGlzLnBhcnNlVHlwZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYodGhpcy50dCAhPSBUb2tlblR5cGUuaWRlbnRpZmllcil7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiSGllciB3aXJkIGVpbiBCZXplaWNobmVyIChOYW1lKSBlaW5lciBWYXJpYWJsZSBlcndhcnRldC5cIiwgXCJlcnJvclwiLCB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgaWRlbnRpZmllciA9IDxzdHJpbmc+dGhpcy5jY3QudmFsdWU7XHJcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG5cclxuICAgICAgICBsZXQgaW5pdGlhbGl6YXRpb246IFRlcm1Ob2RlID0gbnVsbDtcclxuXHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgaWYgKHRoaXMudHQgPT0gVG9rZW5UeXBlLmFzc2lnbm1lbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIGlmICh0eXBlLmFycmF5RGltZW5zaW9uID4gMCAmJiB0aGlzLnR0ID09IFRva2VuVHlwZS5sZWZ0Q3VybHlCcmFja2V0KSB7XHJcbiAgICAgICAgICAgICAgICBpbml0aWFsaXphdGlvbiA9IHRoaXMucGFyc2VBcnJheUxpdGVyYWwodHlwZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpbml0aWFsaXphdGlvbiA9IHRoaXMucGFyc2VUZXJtKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIGlmICh0aGlzLnR0ID09IFRva2VuVHlwZS5lbmRvZlNvdXJjZWNvZGUgJiYgdHlwZSA9PSBudWxsICYmIGlkZW50aWZpZXIgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5sb2NhbFZhcmlhYmxlRGVjbGFyYXRpb24sXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgaWRlbnRpZmllcjogaWRlbnRpZmllcixcclxuICAgICAgICAgICAgdmFyaWFibGVUeXBlOiB0eXBlLFxyXG4gICAgICAgICAgICBpbml0aWFsaXphdGlvbjogaW5pdGlhbGl6YXRpb24sXHJcbiAgICAgICAgICAgIGlzRmluYWw6IGlzRmluYWxcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHBhcnNlVHlwZSgpOiBUeXBlTm9kZSB7XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIGUuZy4gaW50LCBpbnRbXVtdLCBJbnRlZ2VyLCBBcnJheUxpc3Q8SW50ZWdlcj4gLEhhc2hNYXA8SW50ZWdlciwgQXJyYXlMaXN0PFN0cmluZz4+W11bXVxyXG4gICAgICAgICAqL1xyXG5cclxuXHJcbiAgICAgICAgaWYodGhpcy50dCAhPSBUb2tlblR5cGUuaWRlbnRpZmllciAmJiB0aGlzLnR0ICE9IFRva2VuVHlwZS5rZXl3b3JkVm9pZCl7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRXJ3YXJ0ZXQgd2lyZCBlaW4gRGF0ZW50eXAuIERpZXNlciBtdXNzIG1pdCBlaW5lbSBCZXplaWNobmVyIGJlZ2lubmVuLiBHZWZ1bmRlbiB3dXJkZTogXCIgKyB0aGlzLmNjdC52YWx1ZSwgXCJlcnJvclwiLCB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUudHlwZSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpLFxyXG4gICAgICAgICAgICAgICAgYXJyYXlEaW1lbnNpb246IDAsXHJcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBcImludFwiLFxyXG4gICAgICAgICAgICAgICAgZ2VuZXJpY1BhcmFtZXRlclR5cGVzOiBbXVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGlkZW50aWZpZXIgPSA8c3RyaW5nPnRoaXMuY2N0LnZhbHVlO1xyXG4gICAgICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcbiAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuXHJcbiAgICAgICAgbGV0IGdlbmVyaWNQYXJhbWV0ZXJUeXBlczogVHlwZU5vZGVbXSA9IG51bGw7XHJcblxyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIGlmICh0aGlzLnR0ID09IFRva2VuVHlwZS5sb3dlcikge1xyXG5cclxuICAgICAgICAgICAgZ2VuZXJpY1BhcmFtZXRlclR5cGVzID0gW107XHJcbiAgICAgICAgICAgIGxldCBmaXJzdDogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcblxyXG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgd2hpbGUgKChmaXJzdCAmJiB0aGlzLnR0ID09IFRva2VuVHlwZS5pZGVudGlmaWVyKSB8fCAoIWZpcnN0ICYmIHRoaXMudHQgPT0gVG9rZW5UeXBlLmNvbW1hKSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghZmlyc3QpIHRoaXMubmV4dFRva2VuKCk7IC8vIGNvbnN1bWUgY29tbWFcclxuXHJcbiAgICAgICAgICAgICAgICBmaXJzdCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIGdlbmVyaWNQYXJhbWV0ZXJUeXBlcy5wdXNoKHRoaXMucGFyc2VUeXBlKCkpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLmdyZWF0ZXIpO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBhcnJheURpbWVuc2lvbiA9IDA7XHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgd2hpbGUgKHRoaXMudHQgPT0gVG9rZW5UeXBlLmxlZnRSaWdodFNxdWFyZUJyYWNrZXQpIHtcclxuICAgICAgICAgICAgYXJyYXlEaW1lbnNpb24rKztcclxuICAgICAgICAgICAgcG9zaXRpb24ubGVuZ3RoICs9IDI7XHJcbiAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdHlwZW5vZGU6IFR5cGVOb2RlID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUudHlwZSxcclxuICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICBhcnJheURpbWVuc2lvbjogYXJyYXlEaW1lbnNpb24sXHJcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgIGdlbmVyaWNQYXJhbWV0ZXJUeXBlczogZ2VuZXJpY1BhcmFtZXRlclR5cGVzXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnR5cGVOb2Rlcy5wdXNoKHR5cGVub2RlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHR5cGVub2RlO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgcGFyc2VDbGFzc0RlZmluaXRpb24oKTogQVNUTm9kZSB7XHJcblxyXG4gICAgICAgIGxldCBjb21tZW50QmVmb3JlID0gdGhpcy5jY3QuY29tbWVudEJlZm9yZTtcclxuICAgICAgICBsZXQgbW9kaWZpZXJzID0gdGhpcy5jb2xsZWN0TW9kaWZpZXJzKCk7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jb21lc1Rva2VuKFBhcnNlci5DbGFzc1Rva2VucykpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFcndhcnRldCB3aXJkIGNsYXNzLCBpbnRlcmZhY2Ugb2RlciBlbnVtLiBHZWZ1bmRlbiB3dXJkZTogXCIgKyB0aGlzLmNjdC52YWx1ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGNsYXNzVHlwZSA9IHRoaXMudHQ7XHJcbiAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuZXhwZWN0KFRva2VuVHlwZS5pZGVudGlmaWVyLCBmYWxzZSkpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBpZGVudGlmaWVyID0gPHN0cmluZz50aGlzLmNjdC52YWx1ZTtcclxuICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuXHJcbiAgICAgICAgICAgIGxldCB0eXBlUGFyYW1ldGVyczogVHlwZVBhcmFtZXRlck5vZGVbXSA9IFtdO1xyXG4gICAgICAgICAgICAvLyBGb3IgR2VuZXJpY3M6IHBhcnNlIGV4cHJlc3Npb24gbGlrZSA8RSwgRiBleHRlbmRzIFRlc3QgaW1wbGVtZW50cyBDb21wYXJhYmxlPFRlc3Q+PlxyXG4gICAgICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUubG93ZXIpIHtcclxuICAgICAgICAgICAgICAgIHR5cGVQYXJhbWV0ZXJzID0gdGhpcy5wYXJzZVR5cGVQYXJhbWV0ZXJEZWZpbml0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBleHRlbmRzSW1wbGVtZW50cyA9IHRoaXMucGFyc2VFeHRlbmRzSW1wbGVtZW50cyhjbGFzc1R5cGUgPT0gVG9rZW5UeXBlLmtleXdvcmRJbnRlcmZhY2UpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNsYXNzVHlwZSA9PSBUb2tlblR5cGUua2V5d29yZEVudW0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlRW51bShpZGVudGlmaWVyLCBleHRlbmRzSW1wbGVtZW50cywgcG9zaXRpb24sIG1vZGlmaWVycy52aXNpYmlsaXR5LCBjb21tZW50QmVmb3JlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHNjb3BlRnJvbSA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4cGVjdChUb2tlblR5cGUubGVmdEN1cmx5QnJhY2tldCwgdHJ1ZSkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbWV0aG9kc0FuZEF0dHJpYnV0ZXMgPSB0aGlzLnBhcnNlQ2xhc3NCb2R5KGNsYXNzVHlwZSwgaWRlbnRpZmllcik7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2NvcGVUbyA9IHRoaXMuZ2V0RW5kT2ZDdXJyZW50VG9rZW4oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5yaWdodEN1cmx5QnJhY2tldCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGNsYXNzVHlwZSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkQ2xhc3M6IHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5rZXl3b3JkQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVGcm9tOiBzY29wZUZyb20sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlVG86IHNjb3BlVG8sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IG1ldGhvZHNBbmRBdHRyaWJ1dGVzLmF0dHJpYnV0ZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZHM6IG1ldGhvZHNBbmRBdHRyaWJ1dGVzLm1ldGhvZHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQWJzdHJhY3Q6IG1vZGlmaWVycy5pc0Fic3RyYWN0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiBtb2RpZmllcnMudmlzaWJpbGl0eSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5kczogZXh0ZW5kc0ltcGxlbWVudHMuZXh0ZW5kcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1wbGVtZW50czogZXh0ZW5kc0ltcGxlbWVudHMuaW1wbGVtZW50cyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZVBhcmFtZXRlcnM6IHR5cGVQYXJhbWV0ZXJzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50QmVmb3JlOiBjb21tZW50QmVmb3JlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkSW50ZXJmYWNlOiByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUua2V5d29yZEludGVyZmFjZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZUZyb206IHNjb3BlRnJvbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVUbzogc2NvcGVUbyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kczogbWV0aG9kc0FuZEF0dHJpYnV0ZXMubWV0aG9kcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZVBhcmFtZXRlcnM6IHR5cGVQYXJhbWV0ZXJzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbmRzOiBleHRlbmRzSW1wbGVtZW50cy5pbXBsZW1lbnRzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50QmVmb3JlOiBjb21tZW50QmVmb3JlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBwYXJzZVR5cGVQYXJhbWV0ZXJEZWZpbml0aW9uKCk6IFR5cGVQYXJhbWV0ZXJOb2RlW10ge1xyXG5cclxuICAgICAgICBsZXQgdHlwZVBhcmFtZXRlcnM6IFR5cGVQYXJhbWV0ZXJOb2RlW10gPSBbXTtcclxuXHJcbiAgICAgICAgbGV0IGlkZW50aWZpZXJNYXAgPSB7fTtcclxuXHJcbiAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLmxvd2VyLCB0cnVlKTtcclxuICAgICAgICBsZXQgZmlyc3Q6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgICAgICB3aGlsZSAoKGZpcnN0ICYmIHRoaXMudHQgPT0gVG9rZW5UeXBlLmlkZW50aWZpZXIpIHx8ICghZmlyc3QgJiYgdGhpcy50dCA9PSBUb2tlblR5cGUuY29tbWEpKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWZpcnN0KSB0aGlzLmV4cGVjdChUb2tlblR5cGUuY29tbWEsIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHRwOiBUeXBlUGFyYW1ldGVyTm9kZSA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS50eXBlUGFyYW1ldGVyLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCksXHJcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiA8c3RyaW5nPnRoaXMuY2N0LnZhbHVlLFxyXG4gICAgICAgICAgICAgICAgZXh0ZW5kczogbnVsbCxcclxuICAgICAgICAgICAgICAgIGltcGxlbWVudHM6IG51bGxcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGlmIChpZGVudGlmaWVyTWFwW3RwLmlkZW50aWZpZXJdICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiWndlaSBUeXBwYXJhbWV0ZXIgZMO8cmZlIG5pY2h0IGRlbnNlbGJlbiBCZXplaWNobmVyIHRyYWdlbi5cIik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlkZW50aWZpZXJNYXBbdHAuaWRlbnRpZmllcl0gPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBleHRlbmRzSW1wbGVtZW50cyA9IHRoaXMucGFyc2VUeXBlUGFyYW1ldGVyQm91bmRzKCk7XHJcblxyXG4gICAgICAgICAgICB0cC5leHRlbmRzID0gZXh0ZW5kc0ltcGxlbWVudHMuZXh0ZW5kcztcclxuXHJcbiAgICAgICAgICAgIGlmICh0cC5leHRlbmRzICE9IG51bGwgJiYgdHAuZXh0ZW5kcy5hcnJheURpbWVuc2lvbiA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIERhdGVudHlwIGRlcyBUeXBwYXJhbWV0ZXJzIFwiICsgdHAuaWRlbnRpZmllciArIFwiIGRhcmYga2VpbiBBcnJheSBzZWluLlwiKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdHAuaW1wbGVtZW50cyA9IGV4dGVuZHNJbXBsZW1lbnRzLmltcGxlbWVudHM7XHJcblxyXG4gICAgICAgICAgICB0cC5pbXBsZW1lbnRzLmZvckVhY2goKGltKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW0uYXJyYXlEaW1lbnNpb24gPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEZXIgRGF0ZW50eXAgZGVzIFR5cHBhcmFtZXRlcnMgXCIgKyB0cC5pZGVudGlmaWVyICsgXCIgZGFyZiBrZWluIEFycmF5IHNlaW4uXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGZpcnN0ID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICB0eXBlUGFyYW1ldGVycy5wdXNoKHRwKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuZ3JlYXRlciwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0eXBlUGFyYW1ldGVycztcclxuICAgIH1cclxuXHJcbiAgICBwYXJzZUVudW0oaWRlbnRpZmllcjogc3RyaW5nLCBleHRlbmRzSW1wbGVtZW50czoge1xyXG4gICAgICAgIGV4dGVuZHM6IFR5cGVOb2RlO1xyXG4gICAgICAgIGltcGxlbWVudHM6IFR5cGVOb2RlW107XHJcbiAgICB9LCBwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCB2aXNpYmlsaXR5OiBWaXNpYmlsaXR5LCBjb21tZW50QmVmb3JlOiBUb2tlbik6IEFTVE5vZGUge1xyXG5cclxuICAgICAgICBpZiAoZXh0ZW5kc0ltcGxlbWVudHMuZXh0ZW5kcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRWluIGVudW0ga2FubiBuaWNodCBtaXQgZXh0ZW5kcyBlcndlaXRlcnQgd2VyZGVuLlwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGV4dGVuZHNJbXBsZW1lbnRzLmltcGxlbWVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVpbiBlbnVtIGthbm4ga2VpbiBJbnRlcmZhY2UgaW1wbGVtZW50aWVyZW4uXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHNjb3BlRnJvbSA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcbiAgICAgICAgaWYgKHRoaXMuZXhwZWN0KFRva2VuVHlwZS5sZWZ0Q3VybHlCcmFja2V0LCB0cnVlKSkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHZhbHVlczogRW51bVZhbHVlTm9kZVtdID0gdGhpcy5wYXJzZUVudW1WYWx1ZXMoKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBtZXRob2RzQW5kQXR0cmlidXRlcyA9IHRoaXMucGFyc2VDbGFzc0JvZHkoVG9rZW5UeXBlLmtleXdvcmRFbnVtLCBpZGVudGlmaWVyKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzY29wZVRvID0gdGhpcy5nZXRFbmRPZkN1cnJlbnRUb2tlbigpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLnJpZ2h0Q3VybHlCcmFja2V0LCB0cnVlKTtcclxuXHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmtleXdvcmRFbnVtLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc2NvcGVGcm9tOiBzY29wZUZyb20sXHJcbiAgICAgICAgICAgICAgICBzY29wZVRvOiBzY29wZVRvLFxyXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczogbWV0aG9kc0FuZEF0dHJpYnV0ZXMuYXR0cmlidXRlcyxcclxuICAgICAgICAgICAgICAgIG1ldGhvZHM6IG1ldGhvZHNBbmRBdHRyaWJ1dGVzLm1ldGhvZHMsXHJcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgdmFsdWVzOiB2YWx1ZXMsXHJcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiB2aXNpYmlsaXR5LFxyXG4gICAgICAgICAgICAgICAgY29tbWVudEJlZm9yZTogY29tbWVudEJlZm9yZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHBhcnNlRW51bVZhbHVlcygpOiBFbnVtVmFsdWVOb2RlW10ge1xyXG5cclxuICAgICAgICBsZXQgdmFsdWVzOiBFbnVtVmFsdWVOb2RlW10gPSBbXTtcclxuXHJcbiAgICAgICAgbGV0IHBvczogbnVtYmVyID0gMDtcclxuICAgICAgICBsZXQgZmlyc3Q6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgICAgICB3aGlsZSAoKGZpcnN0ICYmIHRoaXMudHQgPT0gVG9rZW5UeXBlLmlkZW50aWZpZXIpIHx8IHRoaXMudHQgPT0gVG9rZW5UeXBlLmNvbW1hKSB7XHJcbiAgICAgICAgICAgIHBvcyA9IHRoaXMucG9zO1xyXG4gICAgICAgICAgICBpZiAoIWZpcnN0KSB0aGlzLm5leHRUb2tlbigpOyAvLyBza2lwIGNvbW1hXHJcbiAgICAgICAgICAgIGZpcnN0ID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5leHBlY3QoVG9rZW5UeXBlLmlkZW50aWZpZXIsIGZhbHNlKSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBpZGVudGlmaWVyID0gPHN0cmluZz50aGlzLmNjdC52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbnN0cnVjdG9yUGFyYW1ldGVyczogVGVybU5vZGVbXSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGNvbW1hUG9zaXRpb25zOiBUZXh0UG9zaXRpb25bXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJpZ2h0QnJhY2tldFBvc2l0aW9uOiBUZXh0UG9zaXRpb24gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUubGVmdEJyYWNrZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbWNwID0gdGhpcy5wYXJzZU1ldGhvZENhbGxQYXJhbWV0ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JQYXJhbWV0ZXJzID0gbWNwLm5vZGVzO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hUG9zaXRpb25zID0gbWNwLmNvbW1hUG9zaXRpb25zO1xyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0QnJhY2tldFBvc2l0aW9uID0gbWNwLnJpZ2h0QnJhY2tldFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHZhbHVlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEVudW1WYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3RvclBhcmFtZXRlcnM6IGNvbnN0cnVjdG9yUGFyYW1ldGVycyxcclxuICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBjb21tYVBvc2l0aW9uczogY29tbWFQb3NpdGlvbnMsXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHRCcmFja2V0UG9zaXRpb246IHJpZ2h0QnJhY2tldFBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5wb3MgPT0gcG9zKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpOyAvLyBpbiBjYXNlIG9mIHBhcnNpbmctZW1lcmdlbmN5XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnR0ID09IFRva2VuVHlwZS5zZW1pY29sb24pIHtcclxuICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHBhcnNlQ2xhc3NCb2R5KGNsYXNzVHlwZTogVG9rZW5UeXBlLCBjbGFzc05hbWU6IHN0cmluZyk6IHsgbWV0aG9kczogTWV0aG9kRGVjbGFyYXRpb25Ob2RlW10sIGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZURlY2xhcmF0aW9uTm9kZVtdIH0ge1xyXG5cclxuICAgICAgICAvLyBBc3N1bXB0aW9uOiB7IGlzIGFscmVhZHkgY29uc3VtZWRcclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZHM6IE1ldGhvZERlY2xhcmF0aW9uTm9kZVtdID0gW107XHJcbiAgICAgICAgbGV0IGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZURlY2xhcmF0aW9uTm9kZVtdID0gW107XHJcblxyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUucmlnaHRDdXJseUJyYWNrZXQgfHwgdGhpcy50dCA9PSBUb2tlblR5cGUuZW5kb2ZTb3VyY2Vjb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGNvbW1lbnRCZWZvcmU6IFRva2VuID0gdGhpcy5jY3QuY29tbWVudEJlZm9yZTtcclxuXHJcbiAgICAgICAgICAgIGxldCBhbm5vdGF0aW9uID0gbnVsbDtcclxuICAgICAgICAgICAgaWYodGhpcy50dCA9PSBUb2tlblR5cGUuYXQpe1xyXG4gICAgICAgICAgICAgICAgYW5ub3RhdGlvbiA9IHRoaXMuY2N0LnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgbW9kaWZpZXJzID0gdGhpcy5jb2xsZWN0TW9kaWZpZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgaXNDb25zdHJ1Y3RvciA9IGZhbHNlO1xyXG4gICAgICAgICAgICBsZXQgcG9zaXRpb24gPSB0aGlzLmdldEN1cnJlbnRQb3NpdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMudHQgPT0gVG9rZW5UeXBlLmlkZW50aWZpZXIgJiYgPHN0cmluZz50aGlzLmNjdC52YWx1ZSA9PSBjbGFzc05hbWUgJiYgdGhpcy5jdFsxXS50dCA9PSBUb2tlblR5cGUubGVmdEJyYWNrZXQpIHtcclxuICAgICAgICAgICAgICAgIGlzQ29uc3RydWN0b3IgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgdHlwZSA9IHRoaXMucGFyc2VUeXBlKCk7XHJcblxyXG4gICAgICAgICAgICBpZihpc0NvbnN0cnVjdG9yKSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IFwidm9pZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFycmF5RGltZW5zaW9uOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0eXBlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS50eXBlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpc0NvbnN0cnVjdG9yIHx8IHRoaXMuZXhwZWN0KFRva2VuVHlwZS5pZGVudGlmaWVyLCBmYWxzZSkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaWRlbnRpZmllciA9IGNsYXNzTmFtZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWlzQ29uc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbiA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXIgPSA8c3RyaW5nPnRoaXMuY2N0LnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHQgPT0gVG9rZW5UeXBlLmxlZnRCcmFja2V0KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbnN0cnVjdG9yICYmIGNsYXNzVHlwZSA9PSBUb2tlblR5cGUua2V5d29yZEVudW0gJiYgbW9kaWZpZXJzLnZpc2liaWxpdHkgIT0gVmlzaWJpbGl0eS5wcml2YXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiS29uc3RydWt0b3JlbiBpbiBlbnVtcyBtw7xzc2VuIHByaXZhdGUgc2Vpbi5cIiwgXCJlcnJvclwiLCBwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVyczogUGFyYW1ldGVyTm9kZVtdID0gdGhpcy5wYXJzZU1ldGhvZERlY2xhcmF0aW9uUGFyYW1ldGVycygpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3RhdGVtZW50czogQVNUTm9kZVtdO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzY29wZUZyb206IFRleHRQb3NpdGlvbiA9IHRoaXMuZ2V0Q3VycmVudFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNjb3BlVG86IFRleHRQb3NpdGlvbiA9IHNjb3BlRnJvbTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vZGlmaWVycy5pc0Fic3RyYWN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5zZW1pY29sb24sIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb25zdHJ1Y3Rvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW4gS29uc3RydWt0b3Iga2FubiBuaWNodCBhYnN0cmFrdCBzZWluLlwiLCBcImVycm9yXCIsIHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVGcm9tID0gdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cyA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVUbyA9IHRoaXMuZ2V0RW5kT2ZDdXJyZW50VG9rZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlbWVudHMgIT0gbnVsbCAmJiBzdGF0ZW1lbnRzLmxlbmd0aCA+IDAgJiYgc3RhdGVtZW50c1swXS50eXBlID09IFRva2VuVHlwZS5zY29wZU5vZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzY29wZU5vZGUgPSA8U2NvcGVOb2RlPnN0YXRlbWVudHNbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZUZyb20gPSBzY29wZU5vZGUucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZVRvID0gc2NvcGVOb2RlLnBvc2l0aW9uVG87XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBtZXRob2RzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubWV0aG9kRGVjbGFyYXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVGcm9tOiBzY29wZUZyb20sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlVG86IHNjb3BlVG8sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnM6IHBhcmFtZXRlcnMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IHN0YXRlbWVudHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6IG1vZGlmaWVycy52aXNpYmlsaXR5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0Fic3RyYWN0OiBtb2RpZmllcnMuaXNBYnN0cmFjdCB8fCBjbGFzc1R5cGUgPT0gVG9rZW5UeXBlLmtleXdvcmRJbnRlcmZhY2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzU3RhdGljOiBtb2RpZmllcnMuaXNTdGF0aWMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29uc3RydWN0b3I6IGlzQ29uc3RydWN0b3IsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFubm90YXRpb246IGFubm90YXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzVHJhbnNpZW50OiBtb2RpZmllcnMuaXNUcmFuc2llbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnRCZWZvcmU6IGNvbW1lbnRCZWZvcmVcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaWRlbnRpZmllciA9PSBjbGFzc05hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJEYXMgQXR0cmlidXQgXCIgKyBjbGFzc05hbWUgKyBcIiBkYXJmIG5pY2h0IGRlbnNlbGJlbiBCZXplaWNobmVyIGhhYmVuIHdpZSBkaWUgS2xhc3NlLlwiLCBcImVycm9yXCIsIHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbml0aWFsaXphdGlvbjogVGVybU5vZGUgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50dCA9PSBUb2tlblR5cGUuYXNzaWdubWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUuYXJyYXlEaW1lbnNpb24gPiAwICYmIHRoaXMudHQgPT0gVG9rZW5UeXBlLmxlZnRDdXJseUJyYWNrZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemF0aW9uID0gdGhpcy5wYXJzZUFycmF5TGl0ZXJhbCh0eXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemF0aW9uID0gdGhpcy5wYXJzZVRlcm0oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLnNlbWljb2xvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5hdHRyaWJ1dGVEZWNsYXJhdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVUeXBlOiB0eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1N0YXRpYzogbW9kaWZpZXJzLmlzU3RhdGljLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0ZpbmFsOiBtb2RpZmllcnMuaXNGaW5hbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogbW9kaWZpZXJzLnZpc2liaWxpdHksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemF0aW9uOiBpbml0aWFsaXphdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYW5ub3RhdGlvbjogYW5ub3RhdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNUcmFuc2llbnQ6IG1vZGlmaWVycy5pc1RyYW5zaWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudEJlZm9yZTogY29tbWVudEJlZm9yZVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2xhc3NUeXBlID09IFRva2VuVHlwZS5rZXl3b3JkSW50ZXJmYWNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiSW50ZXJmYWNlcyBkw7xyZmVuIGtlaW5lIEF0dHJpYnV0ZSBlbnRoYWx0ZW4uXCIsIFwiZXJyb3JcIiwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4geyBtZXRob2RzOiBtZXRob2RzLCBhdHRyaWJ1dGVzOiBhdHRyaWJ1dGVzIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VNZXRob2REZWNsYXJhdGlvblBhcmFtZXRlcnMoKTogUGFyYW1ldGVyTm9kZVtdIHtcclxuXHJcbiAgICAgICAgLy8gQXNzdW1wdGlvbjogbmV4dCB0b2tlbiBpcyAoXHJcbiAgICAgICAgbGV0IHBhcmFtZXRlcnM6IFBhcmFtZXRlck5vZGVbXSA9IFtdO1xyXG4gICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnR0ID09IFRva2VuVHlwZS5yaWdodEJyYWNrZXQpIHtcclxuICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGVsbGlwc2lzID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIGlmIChlbGxpcHNpcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJOdXIgZGVyIGxldHp0ZSBQYXJhbWV0ZXIgZGFyZiBhbHMgRWxsaXBzaXMgKC4uLikgZGVmaW5pZXJ0IHdlcmRlbi5cIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IGlzRmluYWwgPSB0aGlzLnR0ID09IFRva2VuVHlwZS5rZXl3b3JkRmluYWw7XHJcblxyXG4gICAgICAgICAgICBpZiAoaXNGaW5hbCkgdGhpcy5uZXh0VG9rZW4oKTtcclxuXHJcbiAgICAgICAgICAgIGxldCB0eXBlOiBUeXBlTm9kZSA9IHRoaXMucGFyc2VUeXBlKCk7XHJcblxyXG4gICAgICAgICAgICBlbGxpcHNpcyA9IHRoaXMudHQgPT0gVG9rZW5UeXBlLmVsbGlwc2lzO1xyXG4gICAgICAgICAgICBpZiAoZWxsaXBzaXMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgICAgICB0eXBlLmFycmF5RGltZW5zaW9uKys7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4cGVjdChUb2tlblR5cGUuaWRlbnRpZmllciwgZmFsc2UpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaWRlbnRpZmllciA9IDxzdHJpbmc+dGhpcy5jY3QudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wYXJhbWV0ZXJEZWNsYXJhdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5nZXRDdXJyZW50UG9zaXRpb24oKSxcclxuICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlclR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNGaW5hbDogaXNGaW5hbCxcclxuICAgICAgICAgICAgICAgICAgICBpc0VsbGlwc2lzOiBlbGxpcHNpc1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnR0ICE9IFRva2VuVHlwZS5jb21tYSkge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTsgLy8gY29uc3VtZSBjb21tYVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLnJpZ2h0QnJhY2tldCwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIHJldHVybiBwYXJhbWV0ZXJzO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwYXJzZUV4dGVuZHNJbXBsZW1lbnRzKGlzSW50ZXJmYWNlOiBib29sZWFuKTogeyBleHRlbmRzOiBUeXBlTm9kZSwgaW1wbGVtZW50czogVHlwZU5vZGVbXSB9IHtcclxuXHJcbiAgICAgICAgbGV0IHNleHRlbmRzOiBUeXBlTm9kZSA9IG51bGw7XHJcbiAgICAgICAgbGV0IHNpbXBsZW1lbnRzOiBUeXBlTm9kZVtdID0gW107XHJcblxyXG4gICAgICAgIHdoaWxlKHRoaXMuY29tZXNUb2tlbihbVG9rZW5UeXBlLmtleXdvcmRFeHRlbmRzLCBUb2tlblR5cGUua2V5d29yZEltcGxlbWVudHNdKSl7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbWVzVG9rZW4oVG9rZW5UeXBlLmtleXdvcmRFeHRlbmRzKSAmJiAhaXNJbnRlcmZhY2UpIHtcclxuICAgICAgICAgICAgICAgIGlmKHNleHRlbmRzICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRWluZSBLbGFzc2Uga2FubiBuaWNodCBVbnRlcmtsYXNzZSB2b24gendlaSBhbmRlcmVuIEtsYXNzZW4gc2VpbiwgZXMgZGFyZiBhbHNvIGhpZXIgbnVyIGVpbiBNYWwgJ2V4dGVuZHMuLi4nIHN0ZWhlbi5cIiwgXCJlcnJvclwiLCBzZXh0ZW5kcy5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpOyAvLyBza2lwIGV4dGVuZHNcclxuICAgICAgICAgICAgICAgIHNleHRlbmRzID0gdGhpcy5wYXJzZVR5cGUoKTtcclxuICAgICAgICAgICAgICAgIGlmIChzZXh0ZW5kcyAhPSBudWxsICYmIHNleHRlbmRzLmFycmF5RGltZW5zaW9uID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGVyIERhdGVudHlwIGRlciBCYXNpc2tsYXNzZSBkYXJmIGtlaW4gQXJyYXkgc2Vpbi5cIiwgXCJlcnJvclwiLCBzZXh0ZW5kcy5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgIFxyXG4gICAgICAgICAgICBpZiAoKCFpc0ludGVyZmFjZSAmJiB0aGlzLmNvbWVzVG9rZW4oVG9rZW5UeXBlLmtleXdvcmRJbXBsZW1lbnRzKSkgfHwgKGlzSW50ZXJmYWNlICYmIHRoaXMuY29tZXNUb2tlbihUb2tlblR5cGUua2V5d29yZEV4dGVuZHMpKSkge1xyXG4gICAgICAgICAgICAgICAgaWYoc2ltcGxlbWVudHMubGVuZ3RoID4gMCl7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFcyBkYXJmIGhpZXIgbnVyIGVpbiBNYWwgJ2ltcGxlbWVudHMnIHN0ZWhlbiwgaGludGVyICdpbXBsZW1lbnRzJyBpc3QgYWJlciBlaW5lIGtvbW1hc2VwYXJpZXJ0ZSBMaXN0ZSB2b24gSW50ZXJmYWNlcyBlcmxhdWJ0LlwiLCBcIndhcm5pbmdcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpOyAvLyBTa2lwIGltcGxlbWVudHMvZXh0ZW5kc1xyXG4gICAgICAgICAgICAgICAgbGV0IGZpcnN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHdoaWxlICgoZmlyc3QgJiYgdGhpcy50dCA9PSBUb2tlblR5cGUuaWRlbnRpZmllcikgfHwgKCFmaXJzdCAmJiB0aGlzLnR0ID09IFRva2VuVHlwZS5jb21tYSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWZpcnN0KSB0aGlzLm5leHRUb2tlbigpOyAvLyBza2lwIGNvbW1hXHJcbiAgICAgICAgICAgICAgICAgICAgZmlyc3QgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBzaW1wbGVtZW50cy5wdXNoKHRoaXMucGFyc2VUeXBlKCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzaW1wbGVtZW50cy5mb3JFYWNoKChpbSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoaW0uYXJyYXlEaW1lbnNpb24gPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihpbS5pZGVudGlmaWVyICsgXCJbXSBpc3Qga2VpbiBJbnRlcmZhY2UsIHNvbmRlcm4gZWluIEFycmF5LiBBcnJheS1EYXRlbnR5cGVuIHNpbmQgaGllciBuaWNodCBlcmxhdWJ0LlwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBleHRlbmRzOiBzZXh0ZW5kcywgaW1wbGVtZW50czogc2ltcGxlbWVudHNcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VUeXBlUGFyYW1ldGVyQm91bmRzKCk6IHsgZXh0ZW5kczogVHlwZU5vZGUsIGltcGxlbWVudHM6IFR5cGVOb2RlW10gfSB7XHJcblxyXG4gICAgICAgIGxldCBzZXh0ZW5kczogVHlwZU5vZGUgPSBudWxsO1xyXG4gICAgICAgIGxldCBzaW1wbGVtZW50czogVHlwZU5vZGVbXSA9IFtdO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5jb21lc1Rva2VuKFRva2VuVHlwZS5rZXl3b3JkRXh0ZW5kcykpIHtcclxuICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTsgLy8gc2tpcCBleHRlbmRzXHJcbiAgICAgICAgICAgIHNleHRlbmRzID0gdGhpcy5wYXJzZVR5cGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdoaWxlICh0aGlzLmNvbWVzVG9rZW4oVG9rZW5UeXBlLmFtcGVyc2FuZCkpIHtcclxuICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTsgLy8gU2tpcCBhbXBlcnNhbmRcclxuICAgICAgICAgICAgc2ltcGxlbWVudHMucHVzaCh0aGlzLnBhcnNlVHlwZSgpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGV4dGVuZHM6IHNleHRlbmRzLCBpbXBsZW1lbnRzOiBzaW1wbGVtZW50c1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgY29sbGVjdE1vZGlmaWVycygpOiB7IGlzQWJzdHJhY3Q6IGJvb2xlYW4sIGlzU3RhdGljOiBib29sZWFuLCB2aXNpYmlsaXR5OiBWaXNpYmlsaXR5LCBpc0ZpbmFsOiBib29sZWFuLCBpc1RyYW5zaWVudDogYm9vbGVhbiB9IHtcclxuXHJcbiAgICAgICAgbGV0IHZpc2liaWxpdHkgPSBWaXNpYmlsaXR5LnB1YmxpYztcclxuICAgICAgICBsZXQgaXNBYnN0cmFjdCA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBpc1N0YXRpYyA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBpc0ZpbmFsID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGlzVHJhbnNpZW50ID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGxldCBkb25lID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGFzRXJyb3I6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgd2hpbGUgKCFkb25lKSB7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMudHQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRQdWJsaWM6XHJcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJpbGl0eSA9IFZpc2liaWxpdHkucHVibGljO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkUHJpdmF0ZTpcclxuICAgICAgICAgICAgICAgICAgICB2aXNpYmlsaXR5ID0gVmlzaWJpbGl0eS5wcml2YXRlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dFRva2VuKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkUHJvdGVjdGVkOlxyXG4gICAgICAgICAgICAgICAgICAgIHZpc2liaWxpdHkgPSBWaXNpYmlsaXR5LnByb3RlY3RlZDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZFN0YXRpYzpcclxuICAgICAgICAgICAgICAgICAgICBpc1N0YXRpYyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoaXNBYnN0cmFjdCAmJiAhYXNFcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIE1vZGlmaWVyICdhYnN0cmFjdCcgdW5kICdzdGF0aWMnIGvDtm5uZW4gbmljaHQga29tYmluaWVydCB3ZXJkZW4uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhc0Vycm9yID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRBYnN0cmFjdDpcclxuICAgICAgICAgICAgICAgICAgICBpc0Fic3RyYWN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBpZihpc1N0YXRpYyAmJiAhYXNFcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGllIE1vZGlmaWVyICdhYnN0cmFjdCcgdW5kICdzdGF0aWMnIGvDtm5uZW4gbmljaHQga29tYmluaWVydCB3ZXJkZW4uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhc0Vycm9yID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRGaW5hbDpcclxuICAgICAgICAgICAgICAgICAgICBpc0ZpbmFsID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHRUb2tlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZFRyYW5zaWVudDpcclxuICAgICAgICAgICAgICAgICAgICBpc1RyYW5zaWVudCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0VG9rZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGRvbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHJldHVybiB7IGlzQWJzdHJhY3Q6IGlzQWJzdHJhY3QsIGlzU3RhdGljOiBpc1N0YXRpYywgdmlzaWJpbGl0eTogdmlzaWJpbGl0eSwgaXNGaW5hbDogaXNGaW5hbCwgaXNUcmFuc2llbnQ6IGlzVHJhbnNpZW50IH07XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbn0iXX0=