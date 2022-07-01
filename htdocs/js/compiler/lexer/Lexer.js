import { specialCharList, TokenType, EscapeSequenceList, keywordList, TokenTypeReadable } from "./Token.js";
import { ColorLexer } from "./ColorLexer.js";
import { ColorHelper } from "../../runtimelibrary/graphics/ColorHelper.js";
var LexerState;
(function (LexerState) {
    LexerState[LexerState["number"] = 0] = "number";
    LexerState[LexerState["identifier"] = 1] = "identifier";
    LexerState[LexerState["stringConstant"] = 2] = "stringConstant";
    LexerState[LexerState["characterConstant"] = 3] = "characterConstant";
    LexerState[LexerState["multilineComment"] = 4] = "multilineComment";
    LexerState[LexerState["EndoflineComment"] = 5] = "EndoflineComment";
})(LexerState || (LexerState = {}));
var endChar = "►"; // \u10000
export class Lexer {
    constructor() {
        this.colorLexer = new ColorLexer();
        this.spaceTokens = [
            TokenType.space, TokenType.tab, TokenType.newline
        ];
        this.correspondingBracket = {};
        this.correspondingBracket[TokenType.leftBracket] = TokenType.rightBracket;
        this.correspondingBracket[TokenType.leftCurlyBracket] = TokenType.rightCurlyBracket;
        this.correspondingBracket[TokenType.leftSquareBracket] = TokenType.rightSquareBracket;
        this.correspondingBracket[TokenType.rightBracket] = TokenType.leftBracket;
        this.correspondingBracket[TokenType.rightCurlyBracket] = TokenType.leftCurlyBracket;
        this.correspondingBracket[TokenType.rightSquareBracket] = TokenType.leftSquareBracket;
    }
    lex(input) {
        this.input = input.replace("\uc2a0", " ");
        this.input = input.replace("\u00a0", " ");
        this.tokenList = [];
        this.errorList = [];
        this.bracketError = null;
        this.bracketStack = [];
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.nonSpaceLastTokenType = null;
        this.colorInformation = [];
        this.colorIndices = []; // indices of identifier 'Color' inside tokenList
        if (input.length == 0) {
            return { tokens: this.tokenList, errors: this.errorList, bracketError: null, colorInformation: [] };
        }
        this.currentChar = input.charAt(0);
        this.nextChar = input.length > 1 ? input.charAt(1) : endChar;
        while (this.currentChar != endChar) {
            this.mainState();
        }
        if (this.bracketStack.length > 0) {
            let bracketOpen = this.bracketStack.pop();
            let bracketClosed = this.correspondingBracket[bracketOpen];
            this.setBracketError(TokenTypeReadable[bracketOpen] + " " + TokenTypeReadable[bracketClosed]);
        }
        this.processColorIndices();
        return {
            tokens: this.tokenList,
            errors: this.errorList,
            bracketError: this.bracketError,
            colorInformation: this.colorInformation
        };
    }
    processColorIndices() {
        for (let colorIndex of this.colorIndices) {
            // new Color(100, 100, 100, 0.1)
            // new Color(100, 100, 100)
            // Color.red
            let colorToken = this.tokenList[colorIndex];
            let previousToken = this.getLastNonSpaceToken(colorIndex);
            if ((previousToken === null || previousToken === void 0 ? void 0 : previousToken.tt) == TokenType.keywordNew) {
                let nextTokens = this.getNextNonSpaceTokens(colorIndex, 7);
                if (this.compareTokenTypes(nextTokens, [TokenType.leftBracket, TokenType.integerConstant, TokenType.comma,
                    TokenType.integerConstant, TokenType.comma, TokenType.integerConstant,
                    TokenType.rightBracket])) {
                    this.colorInformation.push({
                        color: {
                            red: nextTokens[1].value / 255,
                            green: nextTokens[3].value / 255,
                            blue: nextTokens[5].value / 255,
                            alpha: 1
                        },
                        range: {
                            startLineNumber: previousToken.position.line, startColumn: previousToken.position.column,
                            endLineNumber: nextTokens[6].position.line, endColumn: nextTokens[6].position.column + 1
                        }
                    });
                }
            }
            else {
                let nextTokens = this.getNextNonSpaceTokens(colorIndex, 2);
                if (this.compareTokenTypes(nextTokens, [TokenType.dot, TokenType.identifier])) {
                    let colorIdentifier = nextTokens[1].value;
                    let colorValue = ColorHelper.predefinedColors[colorIdentifier];
                    if (colorValue != null) {
                        this.colorInformation.push({
                            color: {
                                red: (colorValue >> 16) / 255,
                                green: ((colorValue >> 8) & 0xff) / 255,
                                blue: (colorValue & 0xff) / 255,
                                alpha: 1
                            }, range: {
                                startLineNumber: colorToken.position.line, startColumn: colorToken.position.column,
                                endLineNumber: nextTokens[1].position.line, endColumn: nextTokens[1].position.column + colorIdentifier.length
                            }
                        });
                    }
                }
            }
        }
    }
    compareTokenTypes(tokenList, tokenTypeList) {
        if (tokenList.length != tokenTypeList.length)
            return false;
        for (let i = 0; i < tokenList.length; i++) {
            if (tokenList[i].tt != tokenTypeList[i])
                return false;
        }
        return true;
    }
    getNextNonSpaceTokens(tokenIndex, count) {
        let tokens = [];
        let d = tokenIndex;
        while (tokens.length < count && d + 1 < this.tokenList.length) {
            let foundToken = this.tokenList[d + 1];
            if ([TokenType.space, TokenType.newline].indexOf(foundToken.tt) < 0) {
                tokens.push(foundToken);
            }
            d++;
        }
        return tokens;
    }
    getLastNonSpaceToken(tokenIndex) {
        let d = tokenIndex;
        while (d - 1 > 0) {
            let foundToken = this.tokenList[d - 1];
            if ([TokenType.space, TokenType.newline].indexOf(foundToken.tt) < 0) {
                return foundToken;
            }
            d--;
        }
        return null;
    }
    checkClosingBracket(tt) {
        if (this.bracketStack.length == 0) {
            let bracketOpen = this.correspondingBracket[tt];
            this.setBracketError(TokenTypeReadable[bracketOpen] + " " + TokenTypeReadable[tt]);
            return;
        }
        let openBracket = this.bracketStack.pop();
        let correspondingBracket = this.correspondingBracket[openBracket];
        if (tt != correspondingBracket) {
            this.setBracketError(TokenTypeReadable[openBracket] + " " + TokenTypeReadable[correspondingBracket]);
        }
    }
    setBracketError(error) {
        if (this.bracketError == null)
            this.bracketError = error;
    }
    next() {
        this.pos++;
        this.currentChar = this.nextChar;
        if (this.pos + 1 < this.input.length) {
            this.nextChar = this.input.charAt(this.pos + 1);
        }
        else {
            this.nextChar = endChar;
        }
        this.column++; // column of current char
    }
    mainState() {
        let char = this.currentChar;
        let specialCharToken = specialCharList[char];
        if (specialCharToken != null) {
            switch (specialCharToken) {
                case TokenType.leftSquareBracket:
                    if (this.nextChar == "]") {
                        this.pushToken(TokenType.leftRightSquareBracket, "[]");
                        this.next();
                        this.next();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.leftSquareBracket, "[");
                        this.bracketStack.push(specialCharToken);
                        this.next();
                        return;
                    }
                case TokenType.rightSquareBracket:
                    this.checkClosingBracket(specialCharToken);
                    break;
                case TokenType.leftBracket:
                    this.bracketStack.push(specialCharToken);
                    break;
                case TokenType.rightBracket:
                    this.checkClosingBracket(specialCharToken);
                    break;
                case TokenType.leftCurlyBracket:
                    this.bracketStack.push(specialCharToken);
                    break;
                case TokenType.rightCurlyBracket:
                    this.checkClosingBracket(specialCharToken);
                    break;
                case TokenType.and:
                    if (this.nextChar == "&") {
                        this.pushToken(TokenType.and, "&&");
                        this.next();
                        this.next();
                        return;
                    }
                    else if (this.nextChar == "=") {
                        this.pushToken(TokenType.ANDAssigment, "&=");
                        this.next();
                        this.next();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.ampersand, "&");
                        this.next();
                        return;
                    }
                case TokenType.or:
                    if (this.nextChar == "|") {
                        this.pushToken(TokenType.or, "||");
                        this.next();
                        this.next();
                        return;
                    }
                    else if (this.nextChar == "=") {
                        this.pushToken(TokenType.ORAssigment, "&=");
                        this.next();
                        this.next();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.OR, "|");
                        this.next();
                        return;
                    }
                case TokenType.XOR:
                    if (this.nextChar == "=") {
                        this.pushToken(TokenType.XORAssigment, "^=");
                        this.next();
                        this.next();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.XOR, "^");
                        this.next();
                        return;
                    }
                case TokenType.multiplication:
                    if (this.nextChar == "=") {
                        this.pushToken(TokenType.multiplicationAssignment, "*=");
                        this.next();
                        this.next();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.multiplication, "*");
                        this.next();
                        return;
                    }
                case TokenType.not:
                    if (this.nextChar == "=") {
                        this.pushToken(TokenType.notEqual, "!=");
                        this.next();
                        this.next();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.not, "!");
                        this.next();
                        return;
                    }
                case TokenType.division:
                    if (this.nextChar == "=") {
                        this.pushToken(TokenType.divisionAssignment, "/=");
                        this.next();
                        this.next();
                        return;
                    }
                    else if (this.nextChar == '*') {
                        this.lexMultilineComment();
                        return;
                    }
                    else if (this.nextChar == '/') {
                        this.lexEndofLineComment();
                        return;
                    }
                    this.pushToken(TokenType.division, '/');
                    this.next();
                    return;
                case TokenType.modulo:
                    if (this.nextChar == "=") {
                        this.pushToken(TokenType.moduloAssignment, "%=");
                        this.next();
                        this.next();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.modulo, "/");
                        this.next();
                        return;
                    }
                case TokenType.plus:
                    if (this.nextChar == '+') {
                        this.pushToken(TokenType.doublePlus, '++');
                        this.next();
                        this.next();
                        return;
                    }
                    else if (this.isDigit(this.nextChar, 10) && !([TokenType.identifier, TokenType.integerConstant, TokenType.floatingPointConstant, TokenType.rightBracket, TokenType.rightSquareBracket].indexOf(this.nonSpaceLastTokenType) >= 0)) {
                        this.lexNumber();
                        return;
                    }
                    else if (this.nextChar == '=') {
                        this.pushToken(TokenType.plusAssignment, '+=');
                        this.next();
                        this.next();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.plus, '+');
                        this.next();
                        return;
                    }
                case TokenType.lower:
                    if (this.nextChar == '=') {
                        this.pushToken(TokenType.lowerOrEqual, '<=');
                        this.next();
                        this.next();
                        return;
                    }
                    else if (this.nextChar == '<') {
                        this.lexShiftLeft();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.lower, '<');
                        this.next();
                        return;
                    }
                case TokenType.greater:
                    if (this.nextChar == '=') {
                        this.pushToken(TokenType.greaterOrEqual, '>=');
                        this.next();
                        this.next();
                        return;
                    }
                    else if (this.nextChar == '>') {
                        this.lexShiftRight();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.greater, '>');
                        this.next();
                        return;
                    }
                case TokenType.dot:
                    if (this.nextChar == '.' && this.pos + 2 < this.input.length && this.input[this.pos + 2] == ".") {
                        this.pushToken(TokenType.ellipsis, '...');
                        this.next();
                        this.next();
                        this.next();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.dot, '.');
                        this.next();
                        return;
                    }
                case TokenType.assignment:
                    if (this.nextChar == '=') {
                        this.pushToken(TokenType.equal, '==');
                        this.next();
                        this.next();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.assignment, '=');
                        this.next();
                        return;
                    }
                case TokenType.minus:
                    if (this.nextChar == '-') {
                        this.pushToken(TokenType.doubleMinus, '--');
                        this.next();
                        this.next();
                        return;
                    }
                    else if (this.isDigit(this.nextChar, 10) && !([TokenType.identifier, TokenType.integerConstant, TokenType.floatingPointConstant, TokenType.stringConstant, TokenType.rightBracket, TokenType.rightSquareBracket].indexOf(this.nonSpaceLastTokenType) >= 0)) {
                        this.lexNumber();
                        return;
                    }
                    else if (this.nextChar == '=') {
                        this.pushToken(TokenType.minusAssignment, '-=');
                        this.next();
                        this.next();
                        return;
                    }
                    else {
                        this.pushToken(TokenType.minus, '-');
                        this.next();
                        return;
                    }
                case TokenType.singleQuote:
                    this.lexCharacterConstant();
                    return;
                case TokenType.doubleQuote:
                    // triple double quote?
                    if (this.nextChar == "\"" && this.pos + 3 < this.input.length && this.input[this.pos + 2] == "\"") {
                        this.lexTripleQuoteStringConstant();
                    }
                    else {
                        this.lexStringConstant();
                    }
                    return;
                case TokenType.newline:
                    this.pushToken(TokenType.newline, '\n');
                    this.line++;
                    this.column = 0;
                    this.next();
                    return;
                case TokenType.space:
                case TokenType.tab:
                    this.lexSpace();
                    return;
                case TokenType.linefeed:
                    this.next();
                    return;
                case TokenType.at:
                    this.lexAnnotation();
                    return;
            }
            this.pushToken(specialCharToken, char);
            this.next();
            return;
        }
        // no special char. Number?
        if (this.isDigit(char, 10)) {
            this.lexNumber();
            return;
        }
        this.lexIdentifierOrKeyword();
    }
    lexShiftRight() {
        this.next(); // Consume first > of >>
        if (this.nextChar == ">") {
            this.lexShiftRightUnsigned();
        }
        else if (this.nextChar == "=") {
            this.pushToken(TokenType.shiftRightAssigment, ">>=");
            this.next(); // Consume second >
            this.next(); // Consume =
        }
        else {
            this.pushToken(TokenType.shiftRight, ">>");
            this.next(); // Consume second >
        }
        return;
    }
    lexShiftRightUnsigned() {
        this.next(); // Consume second > of >>>
        if (this.nextChar == "=") {
            this.pushToken(TokenType.shiftRightUnsignedAssigment, ">>>=");
            this.next(); // Consume second >
            this.next(); // Consume =
        }
        else {
            this.pushToken(TokenType.shiftRightUnsigned, ">>>");
            this.next(); // Consume next
        }
        return;
    }
    lexShiftLeft() {
        this.next(); // Consume first < of <<
        if (this.nextChar == '=') {
            this.pushToken(TokenType.shiftLeftAssigment, "<<=");
            this.next(); // Consume second <
            this.next(); // Consume =
        }
        else {
            this.pushToken(TokenType.shiftLeft, "<<");
            this.next(); // Consume second <
        }
        return;
    }
    pushToken(tt, text, line = this.line, column = this.column, length = ("" + text).length) {
        let t = {
            tt: tt,
            value: text,
            position: {
                column: column,
                line: line,
                length: length
            }
        };
        if (!(this.spaceTokens.indexOf(tt) >= 0)) {
            this.nonSpaceLastTokenType = tt;
        }
        this.tokenList.push(t);
    }
    pushError(text, length, errorLevel = "error", line = this.line, column = this.column) {
        this.errorList.push({
            text: text,
            position: {
                line: line,
                column: column,
                length: length
            },
            level: errorLevel
        });
    }
    isDigit(a, base) {
        var charCode = a.charCodeAt(0);
        if (base == 10)
            return (charCode >= 48 && charCode <= 57); // 0 - 9
        if (base == 2)
            return (charCode >= 48 && charCode <= 49); // 0, 1
        if (base == 8)
            return (charCode >= 48 && charCode <= 55); // 0 - 7
        if (base == 16)
            return (charCode >= 48 && charCode <= 57) || (charCode >= 97 && charCode <= 102) ||
                (charCode >= 65 && charCode <= 70); // 0 - 9 || a - f || A - F
    }
    lexSpace() {
        let column = this.column;
        let line = this.line;
        let posStart = this.pos;
        while (this.currentChar == " " || this.currentChar == "\t") {
            this.next();
        }
        let posEnd = this.pos;
        this.pushToken(TokenType.space, this.input.substring(posStart, posEnd), line, column);
        return;
    }
    lexCharacterConstant() {
        let column = this.column;
        let line = this.line;
        this.next();
        let char = this.currentChar;
        if (char == "\\") {
            let escapeChar = EscapeSequenceList[this.nextChar];
            if (escapeChar == null) {
                this.pushError('Die Escape-Sequenz \\' + this.nextChar + ' gibt es nicht.', 2);
                if (this.nextChar != "'") {
                    char = this.nextChar;
                    this.next();
                }
            }
            else {
                char = escapeChar;
                this.next();
            }
        }
        this.next();
        if (this.currentChar != "'") {
            this.pushError("Das Ende der char-Konstante wird erwartet (').", 1);
        }
        else {
            this.next();
        }
        this.pushToken(TokenType.charConstant, char, line, column);
    }
    lexStringConstant() {
        let line = this.line;
        let column = this.column;
        let text = "";
        this.next();
        while (true) {
            let char = this.currentChar;
            if (char == "\\") {
                char = this.parseStringLiteralEscapeCharacter();
                text += char;
                continue;
            }
            else if (char == '"') {
                this.next();
                break;
            }
            else if (char == "\n" || char == endChar) {
                this.pushError('Innerhalb einer String-Konstante wurde das Zeilenende erreicht.', text.length + 1, "error", line, column);
                break;
            }
            text += char;
            this.next();
        }
        this.pushToken(TokenType.stringConstant, text, line, column, text.length + 2);
        let color = this.colorLexer.getColorInfo(text);
        if (color != null) {
            this.colorInformation.push({
                color: color,
                range: { startLineNumber: line, endLineNumber: line, startColumn: column + 1, endColumn: this.column - 1 }
            });
        }
    }
    lexTripleQuoteStringConstant() {
        let line = this.line;
        let column = this.column;
        let StringLines = [];
        // skip """ and all characters in same line
        this.next(); // skip "
        this.next(); // skip "
        this.next(); // skip "
        let restOfLine = "";
        while (["\n", "\r"].indexOf(this.currentChar) < 0 && this.currentChar != endChar) {
            restOfLine += this.currentChar;
            this.next();
        }
        restOfLine = restOfLine.trim();
        if (restOfLine.length > 0 && !restOfLine.startsWith("//") && !restOfLine.startsWith("/*")) {
            this.pushError('Eine Java-Multiline-Stringkonstante beginnt immer mit """ und einem nachfolgenden Zeilenumbruch. Alle nach """ folgenden Zeichen werden überlesen!', restOfLine.length + 3);
        }
        if (this.currentChar == '\r') {
            this.next();
        }
        if (this.currentChar == '\n') {
            this.next();
            this.line++;
            this.column = 1;
        }
        let currentStringLine = "";
        while (true) {
            let char = this.currentChar;
            if (char == "\\") {
                currentStringLine += this.parseStringLiteralEscapeCharacter();
            }
            else if (char == '"' && this.nextChar == '"' && this.pos + 2 < this.input.length && this.input[this.pos + 2] == '"') {
                this.next();
                this.next();
                this.next();
                StringLines.push(currentStringLine);
                break;
            }
            else if (char == endChar) {
                let length = 0;
                for (let s of StringLines)
                    length += s.length;
                this.pushError('Innerhalb einer String-Konstante wurde das Textende erreicht.', length, "error", line, column);
                StringLines.push(currentStringLine);
                break;
            }
            else if (char == "\r") {
                this.next();
            }
            else if (char == "\n") {
                StringLines.push(currentStringLine);
                currentStringLine = "";
                this.line++;
                this.column = 1;
                this.next();
                continue;
            }
            else {
                currentStringLine += char;
            }
            this.next();
        }
        if (StringLines.length == 0)
            return;
        let lastLine = StringLines.pop();
        let indent = 0;
        while (lastLine.length > indent && lastLine.charAt(indent) == " ") {
            indent++;
        }
        let text = "";
        text = StringLines.map(s => s.substring(indent)).join("\n");
        this.pushToken(TokenType.stringConstant, text, this.line, this.column, text.length + 2);
    }
    parseStringLiteralEscapeCharacter() {
        this.next(); // skip \
        if (this.currentChar == "u") {
            let hex = "";
            this.next();
            while ("abcdef0123456789".indexOf(this.currentChar) >= 0 && hex.length < 4) {
                hex += this.currentChar;
                this.next();
            }
            if (hex.length < 4) {
                this.pushError('Die Escape-Sequenz \\u' + hex + ' gibt es nicht.', 1 + hex.length);
                return "";
            }
            else {
                return String.fromCodePoint(parseInt(hex, 16));
            }
        }
        else if (EscapeSequenceList[this.currentChar] != null) {
            let c = EscapeSequenceList[this.currentChar];
            this.next();
            return c;
        }
        else {
            this.pushError('Die Escape-Sequenz \\' + this.currentChar + ' gibt es nicht.', 2);
            this.next();
            return "";
        }
    }
    lexMultilineComment() {
        let line = this.line;
        let column = this.column;
        let lastCharWasNewline = false;
        let text = "/*";
        this.next();
        this.next();
        while (true) {
            let char = this.currentChar;
            if (char == "*" && this.nextChar == "/") {
                this.next();
                this.next();
                text += "*/";
                break;
            }
            if (char == endChar) {
                this.pushError("Innerhalb eines Mehrzeilenkommentars (/*... */) wurde das Dateiende erreicht.", 1);
                break;
            }
            if (char == "\n") {
                this.line++;
                this.column = 0;
                lastCharWasNewline = true;
                text += char;
            }
            else if (!(lastCharWasNewline && char == " ")) {
                text += char;
                lastCharWasNewline = false;
            }
            this.next();
        }
        this.pushToken(TokenType.comment, text, line, column);
    }
    lexEndofLineComment() {
        let line = this.line;
        let column = this.column;
        let text = "//";
        this.next();
        this.next();
        while (true) {
            let char = this.currentChar;
            if (char == "\n") {
                break;
            }
            if (char == endChar) {
                // this.pushError("Innerhalb eines Einzeilenkommentars (//... ) wurde das Dateiende erreicht.", 1);
                break;
            }
            text += char;
            this.next();
        }
        this.pushToken(TokenType.comment, text, line, column);
    }
    lexNumber() {
        let line = this.line;
        let column = this.column;
        let sign = 1;
        if (this.currentChar == '-') {
            sign = -1;
            this.next();
        }
        else if (this.currentChar == '+') {
            this.next();
        }
        let posStart = this.pos;
        let firstChar = this.currentChar;
        this.next();
        let radix = 10;
        if (firstChar == '0' && (['b', 'x', '0', '1', '2', '3', '4', '5', '6', '7'].indexOf(this.currentChar) >= 0)) {
            if (this.currentChar == 'x') {
                radix = 16;
                this.next();
            }
            else if (this.currentChar == 'b') {
                radix = 2;
                this.next();
            }
            else
                radix = 8;
            posStart = this.pos;
        }
        while (this.isDigit(this.currentChar, radix)) {
            this.next();
        }
        let tt = TokenType.integerConstant;
        if (this.currentChar == ".") {
            tt = TokenType.floatingPointConstant;
            this.next();
            while (this.isDigit(this.currentChar, 10)) {
                this.next();
            }
            if (radix != 10) {
                this.pushError("Eine float/double-Konstante darf nicht mit 0, 0b oder 0x beginnen.", this.pos - posStart, "error", this.line, this.column - (this.pos - posStart));
            }
        }
        let base = this.input.substring(posStart, this.pos);
        posStart = this.pos;
        let exponent = 0;
        let hasExponential = false;
        //@ts-ignore
        if (this.currentChar == "e") {
            hasExponential = true;
            this.next();
            let posExponentStart = this.pos;
            //@ts-ignore
            if (this.currentChar == '-') {
                this.next();
            }
            while (this.isDigit(this.currentChar, 10)) {
                this.next();
            }
            if (radix != 10) {
                this.pushError("Eine float/double-Konstante darf nicht mit 0, 0b oder 0x beginnen.", this.pos - posStart, "error", this.line, this.column - (this.pos - posStart));
            }
            let exponentString = this.input.substring(posExponentStart, this.pos);
            exponent = Number.parseInt(exponentString);
        }
        if (this.currentChar == 'd' || this.currentChar == 'f') {
            tt = TokenType.floatingPointConstant;
            this.next();
            if (radix != 10) {
                this.pushError("Eine float/double-Konstante darf nicht mit 0, 0b oder 0x beginnen.", this.pos - posStart, "error", this.line, this.column - (this.pos - posStart));
            }
        }
        let value = (tt == TokenType.integerConstant) ? Number.parseInt(base, radix) : Number.parseFloat(base);
        value *= sign;
        if (exponent != 0)
            value *= Math.pow(10, exponent);
        this.pushToken(tt, value, line, column);
        if (radix == 16 && this.column - column == 8) {
            this.colorInformation.push({
                color: {
                    red: (value >> 16) / 255,
                    green: ((value >> 8) & 0xff) / 255,
                    blue: (value & 0xff) / 255,
                    alpha: 1
                },
                range: {
                    startLineNumber: line, endLineNumber: line, startColumn: column, endColumn: this.column
                }
            });
        }
    }
    lexAnnotation() {
        let line = this.line;
        let column = this.column - 1;
        let posStart = this.pos;
        this.next(); // consume @
        let char = this.currentChar;
        while (specialCharList[char] == null && !this.isSpace(char) && !(char == endChar)) {
            this.next();
            char = this.currentChar;
        }
        let posEnd = this.pos;
        let text = this.input.substring(posStart, posEnd);
        this.pushToken(TokenType.at, text, line, column, text.length + 1);
    }
    lexIdentifierOrKeyword() {
        let line = this.line;
        let column = this.column;
        let posStart = this.pos;
        let char = this.currentChar;
        while (specialCharList[char] == null && !this.isSpace(char) && !(char == endChar)) {
            this.next();
            char = this.currentChar;
        }
        let posEnd = this.pos;
        let text = this.input.substring(posStart, posEnd);
        let tt = keywordList[text];
        if (tt != null && typeof tt == "number") {
            switch (tt) {
                case TokenType.true:
                    this.pushToken(TokenType.booleanConstant, true, line, column);
                    break;
                case TokenType.false:
                    this.pushToken(TokenType.booleanConstant, false, line, column);
                    break;
                case TokenType.keywordPrint:
                case TokenType.keywordPrintln:
                    if (this.nonSpaceLastTokenType == TokenType.dot) {
                        this.pushToken(TokenType.identifier, text, line, column);
                    }
                    else {
                        this.pushToken(tt, text, line, column);
                    }
                    break;
                default:
                    this.pushToken(tt, text, line, column);
                    break;
            }
            return;
        }
        if (text == 'Color') {
            this.colorIndices.push(this.tokenList.length);
        }
        this.pushToken(TokenType.identifier, text, line, column);
    }
    isSpace(char) {
        return char == " " || char == "\n";
    }
}
export function errorListToString(errorList) {
    let s = "";
    for (let error of errorList) {
        s += "Z " + error.position.line + ", S " + error.position.column + ": ";
        s += error.text + "<br>";
    }
    return s;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGV4ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L2NvbXBpbGVyL2xleGVyL0xleGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBYSxlQUFlLEVBQUUsU0FBUyxFQUFTLGtCQUFrQixFQUFFLFdBQVcsRUFBZ0IsaUJBQWlCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFNUksT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUUzRSxJQUFLLFVBRUo7QUFGRCxXQUFLLFVBQVU7SUFDWCwrQ0FBTSxDQUFBO0lBQUUsdURBQVUsQ0FBQTtJQUFFLCtEQUFjLENBQUE7SUFBRSxxRUFBaUIsQ0FBQTtJQUFFLG1FQUFnQixDQUFBO0lBQUUsbUVBQWdCLENBQUE7QUFDN0YsQ0FBQyxFQUZJLFVBQVUsS0FBVixVQUFVLFFBRWQ7QUFFRCxJQUFJLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxVQUFVO0FBZ0I3QixNQUFNLE9BQU8sS0FBSztJQTJCZDtRQXBCQSxlQUFVLEdBQWUsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQVcxQyxnQkFBVyxHQUFnQjtZQUN2QixTQUFTLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLE9BQU87U0FDcEQsQ0FBQztRQUlGLHlCQUFvQixHQUFpQyxFQUFFLENBQUM7UUFJcEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDO1FBQzFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUM7UUFDcEYsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLFNBQVMs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bENoYXJMaXN0LCBUb2tlblR5cGUsIFRva2VuLCBFc2NhcGVTZXF1ZW5jZUxpc3QsIGtleXdvcmRMaXN0LCBUZXh0UG9zaXRpb24sIFRva2VuVHlwZVJlYWRhYmxlIH0gZnJvbSBcIi4vVG9rZW4uanNcIjtcclxuaW1wb3J0IHsgdGV4dCB9IGZyb20gXCJleHByZXNzXCI7XHJcbmltcG9ydCB7IENvbG9yTGV4ZXIgfSBmcm9tIFwiLi9Db2xvckxleGVyLmpzXCI7XHJcbmltcG9ydCB7IENvbG9ySGVscGVyIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL0NvbG9ySGVscGVyLmpzXCI7XHJcblxyXG5lbnVtIExleGVyU3RhdGUge1xyXG4gICAgbnVtYmVyLCBpZGVudGlmaWVyLCBzdHJpbmdDb25zdGFudCwgY2hhcmFjdGVyQ29uc3RhbnQsIG11bHRpbGluZUNvbW1lbnQsIEVuZG9mbGluZUNvbW1lbnRcclxufVxyXG5cclxudmFyIGVuZENoYXIgPSBcIuKWulwiOyAvLyBcXHUxMDAwMFxyXG5cclxuZXhwb3J0IHR5cGUgUXVpY2tGaXggPSB7XHJcbiAgICB0aXRsZTogc3RyaW5nLFxyXG4gICAgZWRpdHNQcm92aWRlcjogKHVyaTogbW9uYWNvLlVyaSkgPT4gbW9uYWNvLmxhbmd1YWdlcy5Xb3Jrc3BhY2VUZXh0RWRpdFtdXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIEVycm9yTGV2ZWwgPSBcImluZm9cIiB8IFwiZXJyb3JcIiB8IFwid2FybmluZ1wiO1xyXG5cclxuZXhwb3J0IHR5cGUgRXJyb3IgPSB7XHJcbiAgICBwb3NpdGlvbjogVGV4dFBvc2l0aW9uLFxyXG4gICAgdGV4dDogc3RyaW5nLFxyXG4gICAgcXVpY2tGaXg/OiBRdWlja0ZpeCxcclxuICAgIGxldmVsOiBFcnJvckxldmVsXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBMZXhlciB7XHJcblxyXG4gICAgdG9rZW5MaXN0OiBUb2tlbkxpc3Q7XHJcbiAgICBub25TcGFjZUxhc3RUb2tlblR5cGU6IFRva2VuVHlwZTtcclxuXHJcbiAgICBlcnJvckxpc3Q6IEVycm9yW107XHJcbiAgICBjb2xvckluZm9ybWF0aW9uOiBtb25hY28ubGFuZ3VhZ2VzLklDb2xvckluZm9ybWF0aW9uW107XHJcbiAgICBjb2xvckxleGVyOiBDb2xvckxleGVyID0gbmV3IENvbG9yTGV4ZXIoKTtcclxuXHJcbiAgICBwb3M6IG51bWJlcjtcclxuICAgIGxpbmU6IG51bWJlcjtcclxuICAgIGNvbHVtbjogbnVtYmVyO1xyXG5cclxuICAgIGN1cnJlbnRDaGFyOiBzdHJpbmc7XHJcbiAgICBuZXh0Q2hhcjogc3RyaW5nO1xyXG5cclxuICAgIGlucHV0OiBzdHJpbmc7XHJcblxyXG4gICAgc3BhY2VUb2tlbnM6IFRva2VuVHlwZVtdID0gW1xyXG4gICAgICAgIFRva2VuVHlwZS5zcGFjZSwgVG9rZW5UeXBlLnRhYiwgVG9rZW5UeXBlLm5ld2xpbmVcclxuICAgIF07XHJcblxyXG4gICAgYnJhY2tldFN0YWNrOiBUb2tlblR5cGVbXTtcclxuICAgIGJyYWNrZXRFcnJvcjogc3RyaW5nO1xyXG4gICAgY29ycmVzcG9uZGluZ0JyYWNrZXQ6IHsgW2tleTogbnVtYmVyXTogVG9rZW5UeXBlIH0gPSB7fTtcclxuICAgIGNvbG9ySW5kaWNlczogbnVtYmVyW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jb3JyZXNwb25kaW5nQnJhY2tldFtUb2tlblR5cGUubGVmdEJyYWNrZXRdID0gVG9rZW5UeXBlLnJpZ2h0QnJhY2tldDtcclxuICAgICAgICB0aGlzLmNvcnJlc3BvbmRpbmdCcmFja2V0W1Rva2VuVHlwZS5sZWZ0Q3VybHlCcmFja2V0XSA9IFRva2VuVHlwZS5yaWdodEN1cmx5QnJhY2tldDtcclxuICAgICAgICB0aGlzLmNvcnJlc3BvbmRpbmdCcmFja2V0W1Rva2VuVHlwZS5sZWZ0U3F1YXJlQnJhY2tldF0gPSBUb2tlblR5cGUucmlnaHRTcXVhcmVCcmFja2V0O1xyXG4gICAgICAgIHRoaXMuY29ycmVzcG9uZGluZ0JyYWNrZXRbVG9rZW5UeXBlLnJpZ2h0QnJhY2tldF0gPSBUb2tlblR5cGUubGVmdEJyYWNrZXQ7XHJcbiAgICAgICAgdGhpcy5jb3JyZXNwb25kaW5nQnJhY2tldFtUb2tlblR5cGUucmlnaHRDdXJseUJyYWNrZXRdID0gVG9rZW5UeXBlLmxlZnRDdXJseUJyYWNrZXQ7XHJcbiAgICAgICAgdGhpcy5jb3JyZXNwb25kaW5nQnJhY2tldFtUb2tlblR5cGUucmlnaHRTcXVhcmVCcmFja2V0XSA9IFRva2VuVHlwZS5sZWZ0U3F1YXJlQnJhY2tldDtcclxuICAgIH1cclxuXHJcbiAgICBsZXgoaW5wdXQ6IHN0cmluZyk6IHsgdG9rZW5zOiBUb2tlbkxpc3QsIGVycm9yczogRXJyb3JbXSwgYnJhY2tldEVycm9yOiBzdHJpbmcsIGNvbG9ySW5mb3JtYXRpb246IG1vbmFjby5sYW5ndWFnZXMuSUNvbG9ySW5mb3JtYXRpb25bXSB9IHtcclxuXHJcbiAgICAgICAgdGhpcy5pbnB1dCA9IGlucHV0LnJlcGxhY2UoXCJcXHVjMmEwXCIsIFwiIFwiKTtcclxuICAgICAgICB0aGlzLmlucHV0ID0gaW5wdXQucmVwbGFjZShcIlxcdTAwYTBcIiwgXCIgXCIpO1xyXG4gICAgICAgIHRoaXMudG9rZW5MaXN0ID0gW107XHJcbiAgICAgICAgdGhpcy5lcnJvckxpc3QgPSBbXTtcclxuICAgICAgICB0aGlzLmJyYWNrZXRFcnJvciA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5icmFja2V0U3RhY2sgPSBbXTtcclxuICAgICAgICB0aGlzLnBvcyA9IDA7XHJcbiAgICAgICAgdGhpcy5saW5lID0gMTtcclxuICAgICAgICB0aGlzLmNvbHVtbiA9IDE7XHJcbiAgICAgICAgdGhpcy5ub25TcGFjZUxhc3RUb2tlblR5cGUgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY29sb3JJbmZvcm1hdGlvbiA9IFtdO1xyXG4gICAgICAgIHRoaXMuY29sb3JJbmRpY2VzID0gW107IC8vIGluZGljZXMgb2YgaWRlbnRpZmllciAnQ29sb3InIGluc2lkZSB0b2tlbkxpc3RcclxuXHJcblxyXG4gICAgICAgIGlmIChpbnB1dC5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4geyB0b2tlbnM6IHRoaXMudG9rZW5MaXN0LCBlcnJvcnM6IHRoaXMuZXJyb3JMaXN0LCBicmFja2V0RXJyb3I6IG51bGwsIGNvbG9ySW5mb3JtYXRpb246IFtdIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRDaGFyID0gaW5wdXQuY2hhckF0KDApO1xyXG5cclxuICAgICAgICB0aGlzLm5leHRDaGFyID0gaW5wdXQubGVuZ3RoID4gMSA/IGlucHV0LmNoYXJBdCgxKSA6IGVuZENoYXI7XHJcblxyXG5cclxuICAgICAgICB3aGlsZSAodGhpcy5jdXJyZW50Q2hhciAhPSBlbmRDaGFyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFpblN0YXRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5icmFja2V0U3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBsZXQgYnJhY2tldE9wZW4gPSB0aGlzLmJyYWNrZXRTdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgbGV0IGJyYWNrZXRDbG9zZWQgPSB0aGlzLmNvcnJlc3BvbmRpbmdCcmFja2V0W2JyYWNrZXRPcGVuXTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0QnJhY2tldEVycm9yKFRva2VuVHlwZVJlYWRhYmxlW2JyYWNrZXRPcGVuXSArIFwiIFwiICsgVG9rZW5UeXBlUmVhZGFibGVbYnJhY2tldENsb3NlZF0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wcm9jZXNzQ29sb3JJbmRpY2VzKCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHRva2VuczogdGhpcy50b2tlbkxpc3QsXHJcbiAgICAgICAgICAgIGVycm9yczogdGhpcy5lcnJvckxpc3QsXHJcbiAgICAgICAgICAgIGJyYWNrZXRFcnJvcjogdGhpcy5icmFja2V0RXJyb3IsXHJcbiAgICAgICAgICAgIGNvbG9ySW5mb3JtYXRpb246IHRoaXMuY29sb3JJbmZvcm1hdGlvblxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NDb2xvckluZGljZXMoKSB7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGNvbG9ySW5kZXggb2YgdGhpcy5jb2xvckluZGljZXMpIHtcclxuXHJcbiAgICAgICAgICAgIC8vIG5ldyBDb2xvcigxMDAsIDEwMCwgMTAwLCAwLjEpXHJcbiAgICAgICAgICAgIC8vIG5ldyBDb2xvcigxMDAsIDEwMCwgMTAwKVxyXG4gICAgICAgICAgICAvLyBDb2xvci5yZWRcclxuXHJcbiAgICAgICAgICAgIGxldCBjb2xvclRva2VuID0gdGhpcy50b2tlbkxpc3RbY29sb3JJbmRleF07XHJcbiAgICAgICAgICAgIGxldCBwcmV2aW91c1Rva2VuID0gdGhpcy5nZXRMYXN0Tm9uU3BhY2VUb2tlbihjb2xvckluZGV4KVxyXG5cclxuICAgICAgICAgICAgaWYgKHByZXZpb3VzVG9rZW4/LnR0ID09IFRva2VuVHlwZS5rZXl3b3JkTmV3KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV4dFRva2VucyA9IHRoaXMuZ2V0TmV4dE5vblNwYWNlVG9rZW5zKGNvbG9ySW5kZXgsIDcpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29tcGFyZVRva2VuVHlwZXMobmV4dFRva2VucywgW1Rva2VuVHlwZS5sZWZ0QnJhY2tldCwgVG9rZW5UeXBlLmludGVnZXJDb25zdGFudCwgVG9rZW5UeXBlLmNvbW1hLFxyXG4gICAgICAgICAgICAgICAgVG9rZW5UeXBlLmludGVnZXJDb25zdGFudCwgVG9rZW5UeXBlLmNvbW1hLCBUb2tlblR5cGUuaW50ZWdlckNvbnN0YW50LFxyXG4gICAgICAgICAgICAgICAgVG9rZW5UeXBlLnJpZ2h0QnJhY2tldF0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xvckluZm9ybWF0aW9uLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVkOiA8bnVtYmVyPm5leHRUb2tlbnNbMV0udmFsdWUgLyAyNTUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBncmVlbjogPG51bWJlcj5uZXh0VG9rZW5zWzNdLnZhbHVlIC8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmx1ZTogPG51bWJlcj5uZXh0VG9rZW5zWzVdLnZhbHVlIC8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxwaGE6IDFcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0TGluZU51bWJlcjogcHJldmlvdXNUb2tlbi5wb3NpdGlvbi5saW5lLCBzdGFydENvbHVtbjogcHJldmlvdXNUb2tlbi5wb3NpdGlvbi5jb2x1bW4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRMaW5lTnVtYmVyOiBuZXh0VG9rZW5zWzZdLnBvc2l0aW9uLmxpbmUsIGVuZENvbHVtbjogbmV4dFRva2Vuc1s2XS5wb3NpdGlvbi5jb2x1bW4gKyAxXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5leHRUb2tlbnMgPSB0aGlzLmdldE5leHROb25TcGFjZVRva2Vucyhjb2xvckluZGV4LCAyKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbXBhcmVUb2tlblR5cGVzKG5leHRUb2tlbnMsIFtUb2tlblR5cGUuZG90LCBUb2tlblR5cGUuaWRlbnRpZmllcl0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbG9ySWRlbnRpZmllciA9IDxzdHJpbmc+bmV4dFRva2Vuc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY29sb3JWYWx1ZSA9IENvbG9ySGVscGVyLnByZWRlZmluZWRDb2xvcnNbY29sb3JJZGVudGlmaWVyXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY29sb3JWYWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sb3JJbmZvcm1hdGlvbi5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVkOiAoY29sb3JWYWx1ZSA+PiAxNikgLyAyNTUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3JlZW46ICgoY29sb3JWYWx1ZSA+PiA4KSAmIDB4ZmYpIC8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsdWU6IChjb2xvclZhbHVlICYgMHhmZikgLyAyNTUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxwaGE6IDFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIHJhbmdlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRMaW5lTnVtYmVyOiBjb2xvclRva2VuLnBvc2l0aW9uLmxpbmUsIHN0YXJ0Q29sdW1uOiBjb2xvclRva2VuLnBvc2l0aW9uLmNvbHVtbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRMaW5lTnVtYmVyOiBuZXh0VG9rZW5zWzFdLnBvc2l0aW9uLmxpbmUsIGVuZENvbHVtbjogbmV4dFRva2Vuc1sxXS5wb3NpdGlvbi5jb2x1bW4gKyBjb2xvcklkZW50aWZpZXIubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbXBhcmVUb2tlblR5cGVzKHRva2VuTGlzdDogVG9rZW5bXSwgdG9rZW5UeXBlTGlzdDogVG9rZW5UeXBlW10pIHtcclxuICAgICAgICBpZiAodG9rZW5MaXN0Lmxlbmd0aCAhPSB0b2tlblR5cGVMaXN0Lmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5MaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmICh0b2tlbkxpc3RbaV0udHQgIT0gdG9rZW5UeXBlTGlzdFtpXSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXROZXh0Tm9uU3BhY2VUb2tlbnModG9rZW5JbmRleDogbnVtYmVyLCBjb3VudDogbnVtYmVyKTogVG9rZW5bXSB7XHJcbiAgICAgICAgbGV0IHRva2VuczogVG9rZW5bXSA9IFtdO1xyXG4gICAgICAgIGxldCBkID0gdG9rZW5JbmRleDtcclxuICAgICAgICB3aGlsZSAodG9rZW5zLmxlbmd0aCA8IGNvdW50ICYmIGQgKyAxIDwgdGhpcy50b2tlbkxpc3QubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIGxldCBmb3VuZFRva2VuID0gdGhpcy50b2tlbkxpc3RbZCArIDFdO1xyXG4gICAgICAgICAgICBpZiAoW1Rva2VuVHlwZS5zcGFjZSwgVG9rZW5UeXBlLm5ld2xpbmVdLmluZGV4T2YoZm91bmRUb2tlbi50dCkgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChmb3VuZFRva2VuKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdG9rZW5zO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRMYXN0Tm9uU3BhY2VUb2tlbih0b2tlbkluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgZCA9IHRva2VuSW5kZXg7XHJcbiAgICAgICAgd2hpbGUgKGQgLSAxID4gMCkge1xyXG4gICAgICAgICAgICBsZXQgZm91bmRUb2tlbiA9IHRoaXMudG9rZW5MaXN0W2QgLSAxXTtcclxuICAgICAgICAgICAgaWYgKFtUb2tlblR5cGUuc3BhY2UsIFRva2VuVHlwZS5uZXdsaW5lXS5pbmRleE9mKGZvdW5kVG9rZW4udHQpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvdW5kVG9rZW47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZC0tO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBjaGVja0Nsb3NpbmdCcmFja2V0KHR0OiBUb2tlblR5cGUpIHtcclxuICAgICAgICBpZiAodGhpcy5icmFja2V0U3RhY2subGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgbGV0IGJyYWNrZXRPcGVuID0gdGhpcy5jb3JyZXNwb25kaW5nQnJhY2tldFt0dF07XHJcbiAgICAgICAgICAgIHRoaXMuc2V0QnJhY2tldEVycm9yKFRva2VuVHlwZVJlYWRhYmxlW2JyYWNrZXRPcGVuXSArIFwiIFwiICsgVG9rZW5UeXBlUmVhZGFibGVbdHRdKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgb3BlbkJyYWNrZXQgPSB0aGlzLmJyYWNrZXRTdGFjay5wb3AoKTtcclxuICAgICAgICBsZXQgY29ycmVzcG9uZGluZ0JyYWNrZXQgPSB0aGlzLmNvcnJlc3BvbmRpbmdCcmFja2V0W29wZW5CcmFja2V0XTtcclxuICAgICAgICBpZiAodHQgIT0gY29ycmVzcG9uZGluZ0JyYWNrZXQpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRCcmFja2V0RXJyb3IoVG9rZW5UeXBlUmVhZGFibGVbb3BlbkJyYWNrZXRdICsgXCIgXCIgKyBUb2tlblR5cGVSZWFkYWJsZVtjb3JyZXNwb25kaW5nQnJhY2tldF0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZXRCcmFja2V0RXJyb3IoZXJyb3I6IHN0cmluZykge1xyXG4gICAgICAgIGlmICh0aGlzLmJyYWNrZXRFcnJvciA9PSBudWxsKSB0aGlzLmJyYWNrZXRFcnJvciA9IGVycm9yO1xyXG4gICAgfVxyXG5cclxuICAgIG5leHQoKSB7XHJcbiAgICAgICAgdGhpcy5wb3MrKztcclxuICAgICAgICB0aGlzLmN1cnJlbnRDaGFyID0gdGhpcy5uZXh0Q2hhcjtcclxuICAgICAgICBpZiAodGhpcy5wb3MgKyAxIDwgdGhpcy5pbnB1dC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhpcy5uZXh0Q2hhciA9IHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zICsgMSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5uZXh0Q2hhciA9IGVuZENoYXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY29sdW1uKys7IC8vIGNvbHVtbiBvZiBjdXJyZW50IGNoYXJcclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIG1haW5TdGF0ZSgpIHtcclxuXHJcbiAgICAgICAgbGV0IGNoYXIgPSB0aGlzLmN1cnJlbnRDaGFyO1xyXG5cclxuICAgICAgICBsZXQgc3BlY2lhbENoYXJUb2tlbiA9IHNwZWNpYWxDaGFyTGlzdFtjaGFyXTtcclxuXHJcbiAgICAgICAgaWYgKHNwZWNpYWxDaGFyVG9rZW4gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHNwZWNpYWxDaGFyVG9rZW4pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmxlZnRTcXVhcmVCcmFja2V0OlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm5leHRDaGFyID09IFwiXVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5sZWZ0UmlnaHRTcXVhcmVCcmFja2V0LCBcIltdXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUubGVmdFNxdWFyZUJyYWNrZXQsIFwiW1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icmFja2V0U3RhY2sucHVzaChzcGVjaWFsQ2hhclRva2VuKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5yaWdodFNxdWFyZUJyYWNrZXQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVja0Nsb3NpbmdCcmFja2V0KHNwZWNpYWxDaGFyVG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubGVmdEJyYWNrZXQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5icmFja2V0U3RhY2sucHVzaChzcGVjaWFsQ2hhclRva2VuKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnJpZ2h0QnJhY2tldDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoZWNrQ2xvc2luZ0JyYWNrZXQoc3BlY2lhbENoYXJUb2tlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5sZWZ0Q3VybHlCcmFja2V0OlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnJhY2tldFN0YWNrLnB1c2goc3BlY2lhbENoYXJUb2tlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5yaWdodEN1cmx5QnJhY2tldDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoZWNrQ2xvc2luZ0JyYWNrZXQoc3BlY2lhbENoYXJUb2tlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5hbmQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubmV4dENoYXIgPT0gXCImXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLmFuZCwgXCImJlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLm5leHRDaGFyID09IFwiPVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5BTkRBc3NpZ21lbnQsIFwiJj1cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5hbXBlcnNhbmQsIFwiJlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5vcjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5uZXh0Q2hhciA9PSBcInxcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUub3IsIFwifHxcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5uZXh0Q2hhciA9PSBcIj1cIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuT1JBc3NpZ21lbnQsIFwiJj1cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5PUiwgXCJ8XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLlhPUjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5uZXh0Q2hhciA9PSBcIj1cIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuWE9SQXNzaWdtZW50LCBcIl49XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuWE9SLCBcIl5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubXVsdGlwbGljYXRpb246XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubmV4dENoYXIgPT0gXCI9XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLm11bHRpcGxpY2F0aW9uQXNzaWdubWVudCwgXCIqPVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLm11bHRpcGxpY2F0aW9uLCBcIipcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubm90OlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm5leHRDaGFyID09IFwiPVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5ub3RFcXVhbCwgXCIhPVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLm5vdCwgXCIhXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmRpdmlzaW9uOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm5leHRDaGFyID09IFwiPVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5kaXZpc2lvbkFzc2lnbm1lbnQsIFwiLz1cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5uZXh0Q2hhciA9PSAnKicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sZXhNdWx0aWxpbmVDb21tZW50KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMubmV4dENoYXIgPT0gJy8nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGV4RW5kb2ZMaW5lQ29tbWVudCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5kaXZpc2lvbiwgJy8nKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5tb2R1bG86XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubmV4dENoYXIgPT0gXCI9XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLm1vZHVsb0Fzc2lnbm1lbnQsIFwiJT1cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5tb2R1bG8sIFwiL1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wbHVzOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm5leHRDaGFyID09ICcrJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuZG91YmxlUGx1cywgJysrJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0RpZ2l0KHRoaXMubmV4dENoYXIsIDEwKSAmJiAhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChbVG9rZW5UeXBlLmlkZW50aWZpZXIsIFRva2VuVHlwZS5pbnRlZ2VyQ29uc3RhbnQsIFRva2VuVHlwZS5mbG9hdGluZ1BvaW50Q29uc3RhbnQsIFRva2VuVHlwZS5yaWdodEJyYWNrZXQsIFRva2VuVHlwZS5yaWdodFNxdWFyZUJyYWNrZXRdLmluZGV4T2YodGhpcy5ub25TcGFjZUxhc3RUb2tlblR5cGUpID49IDApXHJcbiAgICAgICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGV4TnVtYmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMubmV4dENoYXIgPT0gJz0nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5wbHVzQXNzaWdubWVudCwgJys9Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5wbHVzLCAnKycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmxvd2VyOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm5leHRDaGFyID09ICc9Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUubG93ZXJPckVxdWFsLCAnPD0nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLm5leHRDaGFyID09ICc8Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxleFNoaWZ0TGVmdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLmxvd2VyLCAnPCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmdyZWF0ZXI6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubmV4dENoYXIgPT0gJz0nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5ncmVhdGVyT3JFcXVhbCwgJz49Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5uZXh0Q2hhciA9PSAnPicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sZXhTaGlmdFJpZ2h0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuZ3JlYXRlciwgJz4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5kb3Q6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubmV4dENoYXIgPT0gJy4nICYmIHRoaXMucG9zICsgMiA8IHRoaXMuaW5wdXQubGVuZ3RoICYmIHRoaXMuaW5wdXRbdGhpcy5wb3MgKyAyXSA9PSBcIi5cIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuZWxsaXBzaXMsICcuLi4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5kb3QsICcuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmFzc2lnbm1lbnQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubmV4dENoYXIgPT0gJz0nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5lcXVhbCwgJz09Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5hc3NpZ25tZW50LCAnPScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm1pbnVzOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm5leHRDaGFyID09ICctJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuZG91YmxlTWludXMsICctLScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5pc0RpZ2l0KHRoaXMubmV4dENoYXIsIDEwKSAmJiAhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChbVG9rZW5UeXBlLmlkZW50aWZpZXIsIFRva2VuVHlwZS5pbnRlZ2VyQ29uc3RhbnQsIFRva2VuVHlwZS5mbG9hdGluZ1BvaW50Q29uc3RhbnQsIFRva2VuVHlwZS5zdHJpbmdDb25zdGFudCwgVG9rZW5UeXBlLnJpZ2h0QnJhY2tldCwgVG9rZW5UeXBlLnJpZ2h0U3F1YXJlQnJhY2tldF0uaW5kZXhPZih0aGlzLm5vblNwYWNlTGFzdFRva2VuVHlwZSkgPj0gMClcclxuICAgICAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sZXhOdW1iZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLm5leHRDaGFyID09ICc9Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUubWludXNBc3NpZ25tZW50LCAnLT0nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLm1pbnVzLCAnLScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnNpbmdsZVF1b3RlOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGV4Q2hhcmFjdGVyQ29uc3RhbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5kb3VibGVRdW90ZTpcclxuICAgICAgICAgICAgICAgICAgICAvLyB0cmlwbGUgZG91YmxlIHF1b3RlP1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm5leHRDaGFyID09IFwiXFxcIlwiICYmIHRoaXMucG9zICsgMyA8IHRoaXMuaW5wdXQubGVuZ3RoICYmIHRoaXMuaW5wdXRbdGhpcy5wb3MgKyAyXSA9PSBcIlxcXCJcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxleFRyaXBsZVF1b3RlU3RyaW5nQ29uc3RhbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxleFN0cmluZ0NvbnN0YW50KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5ld2xpbmU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLm5ld2xpbmUsICdcXG4nKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmUrKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbHVtbiA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc3BhY2U6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS50YWI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sZXhTcGFjZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmxpbmVmZWVkOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmF0OlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGV4QW5ub3RhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oc3BlY2lhbENoYXJUb2tlbiwgY2hhcik7XHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbm8gc3BlY2lhbCBjaGFyLiBOdW1iZXI/XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzRGlnaXQoY2hhciwgMTApKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGV4TnVtYmVyKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubGV4SWRlbnRpZmllck9yS2V5d29yZCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBsZXhTaGlmdFJpZ2h0KCkge1xyXG4gICAgICAgIHRoaXMubmV4dCgpOyAvLyBDb25zdW1lIGZpcnN0ID4gb2YgPj5cclxuXHJcbiAgICAgICAgaWYgKHRoaXMubmV4dENoYXIgPT0gXCI+XCIpIHtcclxuICAgICAgICAgICAgdGhpcy5sZXhTaGlmdFJpZ2h0VW5zaWduZWQoKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubmV4dENoYXIgPT0gXCI9XCIpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLnNoaWZ0UmlnaHRBc3NpZ21lbnQsIFwiPj49XCIpXHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpOyAvLyBDb25zdW1lIHNlY29uZCA+XHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpOyAvLyBDb25zdW1lID1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuc2hpZnRSaWdodCwgXCI+PlwiKTtcclxuICAgICAgICAgICAgdGhpcy5uZXh0KCk7IC8vIENvbnN1bWUgc2Vjb25kID5cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGxleFNoaWZ0UmlnaHRVbnNpZ25lZCgpIHtcclxuICAgICAgICB0aGlzLm5leHQoKTsgLy8gQ29uc3VtZSBzZWNvbmQgPiBvZiA+Pj5cclxuXHJcbiAgICAgICAgaWYgKHRoaXMubmV4dENoYXIgPT0gXCI9XCIpIHtcclxuICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLnNoaWZ0UmlnaHRVbnNpZ25lZEFzc2lnbWVudCwgXCI+Pj49XCIpXHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpOyAvLyBDb25zdW1lIHNlY29uZCA+XHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpOyAvLyBDb25zdW1lID1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuc2hpZnRSaWdodFVuc2lnbmVkLCBcIj4+PlwiKTtcclxuICAgICAgICAgICAgdGhpcy5uZXh0KCk7IC8vIENvbnN1bWUgbmV4dFxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgbGV4U2hpZnRMZWZ0KCkge1xyXG4gICAgICAgIHRoaXMubmV4dCgpOyAvLyBDb25zdW1lIGZpcnN0IDwgb2YgPDxcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubmV4dENoYXIgPT0gJz0nKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5zaGlmdExlZnRBc3NpZ21lbnQsIFwiPDw9XCIpXHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpOyAvLyBDb25zdW1lIHNlY29uZCA8XHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpOyAvLyBDb25zdW1lID1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuc2hpZnRMZWZ0LCBcIjw8XCIpXHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpOyAvLyBDb25zdW1lIHNlY29uZCA8XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcblxyXG4gICAgcHVzaFRva2VuKHR0OiBUb2tlblR5cGUsIHRleHQ6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4sIGxpbmU6IG51bWJlciA9IHRoaXMubGluZSwgY29sdW1uOiBudW1iZXIgPSB0aGlzLmNvbHVtbiwgbGVuZ3RoOiBudW1iZXIgPSAoXCJcIiArIHRleHQpLmxlbmd0aCkge1xyXG4gICAgICAgIGxldCB0OiBUb2tlbiA9IHtcclxuICAgICAgICAgICAgdHQ6IHR0LFxyXG4gICAgICAgICAgICB2YWx1ZTogdGV4dCxcclxuICAgICAgICAgICAgcG9zaXRpb246IHtcclxuICAgICAgICAgICAgICAgIGNvbHVtbjogY29sdW1uLFxyXG4gICAgICAgICAgICAgICAgbGluZTogbGluZSxcclxuICAgICAgICAgICAgICAgIGxlbmd0aDogbGVuZ3RoXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghKHRoaXMuc3BhY2VUb2tlbnMuaW5kZXhPZih0dCkgPj0gMCkpIHtcclxuICAgICAgICAgICAgdGhpcy5ub25TcGFjZUxhc3RUb2tlblR5cGUgPSB0dDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudG9rZW5MaXN0LnB1c2godCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVzaEVycm9yKHRleHQ6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIsIGVycm9yTGV2ZWw6IEVycm9yTGV2ZWwgPSBcImVycm9yXCIsIGxpbmU6IG51bWJlciA9IHRoaXMubGluZSwgY29sdW1uOiBudW1iZXIgPSB0aGlzLmNvbHVtbikge1xyXG4gICAgICAgIHRoaXMuZXJyb3JMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICB0ZXh0OiB0ZXh0LFxyXG4gICAgICAgICAgICBwb3NpdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgbGluZTogbGluZSxcclxuICAgICAgICAgICAgICAgIGNvbHVtbjogY29sdW1uLFxyXG4gICAgICAgICAgICAgICAgbGVuZ3RoOiBsZW5ndGhcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGV2ZWw6IGVycm9yTGV2ZWxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIGlzRGlnaXQoYTogc3RyaW5nLCBiYXNlOiBudW1iZXIpIHtcclxuICAgICAgICB2YXIgY2hhckNvZGUgPSBhLmNoYXJDb2RlQXQoMCk7XHJcblxyXG4gICAgICAgIGlmIChiYXNlID09IDEwKSByZXR1cm4gKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgLy8gMCAtIDlcclxuICAgICAgICBpZiAoYmFzZSA9PSAyKSByZXR1cm4gKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDQ5KTsgLy8gMCwgMVxyXG4gICAgICAgIGlmIChiYXNlID09IDgpIHJldHVybiAoY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTUpOyAvLyAwIC0gN1xyXG4gICAgICAgIGlmIChiYXNlID09IDE2KSByZXR1cm4gKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSB8fCAoY2hhckNvZGUgPj0gOTcgJiYgY2hhckNvZGUgPD0gMTAyKSB8fFxyXG4gICAgICAgICAgICAoY2hhckNvZGUgPj0gNjUgJiYgY2hhckNvZGUgPD0gNzApOyAvLyAwIC0gOSB8fCBhIC0gZiB8fCBBIC0gRlxyXG4gICAgfVxyXG5cclxuICAgIGxleFNwYWNlKCkge1xyXG4gICAgICAgIGxldCBjb2x1bW4gPSB0aGlzLmNvbHVtbjtcclxuICAgICAgICBsZXQgbGluZSA9IHRoaXMubGluZTtcclxuXHJcbiAgICAgICAgbGV0IHBvc1N0YXJ0ID0gdGhpcy5wb3M7XHJcbiAgICAgICAgd2hpbGUgKHRoaXMuY3VycmVudENoYXIgPT0gXCIgXCIgfHwgdGhpcy5jdXJyZW50Q2hhciA9PSBcIlxcdFwiKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHBvc0VuZCA9IHRoaXMucG9zO1xyXG4gICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5zcGFjZSwgdGhpcy5pbnB1dC5zdWJzdHJpbmcocG9zU3RhcnQsIHBvc0VuZCksIGxpbmUsIGNvbHVtbik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBsZXhDaGFyYWN0ZXJDb25zdGFudCgpIHtcclxuICAgICAgICBsZXQgY29sdW1uID0gdGhpcy5jb2x1bW47XHJcbiAgICAgICAgbGV0IGxpbmUgPSB0aGlzLmxpbmU7XHJcbiAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgbGV0IGNoYXIgPSB0aGlzLmN1cnJlbnRDaGFyO1xyXG4gICAgICAgIGlmIChjaGFyID09IFwiXFxcXFwiKSB7XHJcbiAgICAgICAgICAgIGxldCBlc2NhcGVDaGFyID0gRXNjYXBlU2VxdWVuY2VMaXN0W3RoaXMubmV4dENoYXJdO1xyXG4gICAgICAgICAgICBpZiAoZXNjYXBlQ2hhciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcignRGllIEVzY2FwZS1TZXF1ZW56IFxcXFwnICsgdGhpcy5uZXh0Q2hhciArICcgZ2lidCBlcyBuaWNodC4nLCAyKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm5leHRDaGFyICE9IFwiJ1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhciA9IHRoaXMubmV4dENoYXI7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjaGFyID0gZXNjYXBlQ2hhcjtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRDaGFyICE9IFwiJ1wiKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiRGFzIEVuZGUgZGVyIGNoYXItS29uc3RhbnRlIHdpcmQgZXJ3YXJ0ZXQgKCcpLlwiLCAxKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5jaGFyQ29uc3RhbnQsIGNoYXIsIGxpbmUsIGNvbHVtbik7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGxleFN0cmluZ0NvbnN0YW50KCkge1xyXG4gICAgICAgIGxldCBsaW5lID0gdGhpcy5saW5lO1xyXG4gICAgICAgIGxldCBjb2x1bW4gPSB0aGlzLmNvbHVtbjtcclxuICAgICAgICBsZXQgdGV4dCA9IFwiXCI7XHJcblxyXG4gICAgICAgIHRoaXMubmV4dCgpO1xyXG5cclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBsZXQgY2hhciA9IHRoaXMuY3VycmVudENoYXI7XHJcbiAgICAgICAgICAgIGlmIChjaGFyID09IFwiXFxcXFwiKSB7XHJcbiAgICAgICAgICAgICAgICBjaGFyID0gdGhpcy5wYXJzZVN0cmluZ0xpdGVyYWxFc2NhcGVDaGFyYWN0ZXIoKTsgICBcclxuICAgICAgICAgICAgICAgIHRleHQgKz0gY2hhcjtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlOyAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFyID09ICdcIicpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhciA9PSBcIlxcblwiIHx8IGNoYXIgPT0gZW5kQ2hhcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoJ0lubmVyaGFsYiBlaW5lciBTdHJpbmctS29uc3RhbnRlIHd1cmRlIGRhcyBaZWlsZW5lbmRlIGVycmVpY2h0LicsIHRleHQubGVuZ3RoICsgMSwgXCJlcnJvclwiLCBsaW5lLCBjb2x1bW4pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGV4dCArPSBjaGFyO1xyXG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5zdHJpbmdDb25zdGFudCwgdGV4dCwgbGluZSwgY29sdW1uLCB0ZXh0Lmxlbmd0aCArIDIpO1xyXG5cclxuICAgICAgICBsZXQgY29sb3IgPSB0aGlzLmNvbG9yTGV4ZXIuZ2V0Q29sb3JJbmZvKHRleHQpO1xyXG5cclxuICAgICAgICBpZiAoY29sb3IgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9ySW5mb3JtYXRpb24ucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBjb2xvcjogY29sb3IsXHJcbiAgICAgICAgICAgICAgICByYW5nZTogeyBzdGFydExpbmVOdW1iZXI6IGxpbmUsIGVuZExpbmVOdW1iZXI6IGxpbmUsIHN0YXJ0Q29sdW1uOiBjb2x1bW4gKyAxLCBlbmRDb2x1bW46IHRoaXMuY29sdW1uIC0gMSB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgbGV4VHJpcGxlUXVvdGVTdHJpbmdDb25zdGFudCgpIHtcclxuICAgICAgICBsZXQgbGluZSA9IHRoaXMubGluZTtcclxuICAgICAgICBsZXQgY29sdW1uID0gdGhpcy5jb2x1bW47XHJcbiAgICAgICAgbGV0IFN0cmluZ0xpbmVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICAvLyBza2lwIFwiXCJcIiBhbmQgYWxsIGNoYXJhY3RlcnMgaW4gc2FtZSBsaW5lXHJcblxyXG4gICAgICAgIHRoaXMubmV4dCgpOyAvLyBza2lwIFwiXHJcbiAgICAgICAgdGhpcy5uZXh0KCk7IC8vIHNraXAgXCJcclxuICAgICAgICB0aGlzLm5leHQoKTsgLy8gc2tpcCBcIlxyXG5cclxuICAgICAgICBsZXQgcmVzdE9mTGluZTogc3RyaW5nID0gXCJcIjtcclxuICAgICAgICB3aGlsZSAoW1wiXFxuXCIsIFwiXFxyXCJdLmluZGV4T2YodGhpcy5jdXJyZW50Q2hhcikgPCAwICYmIHRoaXMuY3VycmVudENoYXIgIT0gZW5kQ2hhcikge1xyXG4gICAgICAgICAgICByZXN0T2ZMaW5lICs9IHRoaXMuY3VycmVudENoYXI7XHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzdE9mTGluZSA9IHJlc3RPZkxpbmUudHJpbSgpO1xyXG4gICAgICAgIGlmKHJlc3RPZkxpbmUubGVuZ3RoID4gMCAmJiAhcmVzdE9mTGluZS5zdGFydHNXaXRoKFwiLy9cIikgJiYgIXJlc3RPZkxpbmUuc3RhcnRzV2l0aChcIi8qXCIpKXtcclxuICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoJ0VpbmUgSmF2YS1NdWx0aWxpbmUtU3RyaW5na29uc3RhbnRlIGJlZ2lubnQgaW1tZXIgbWl0IFwiXCJcIiB1bmQgZWluZW0gbmFjaGZvbGdlbmRlbiBaZWlsZW51bWJydWNoLiBBbGxlIG5hY2ggXCJcIlwiIGZvbGdlbmRlbiBaZWljaGVuIHdlcmRlbiDDvGJlcmxlc2VuIScsIHJlc3RPZkxpbmUubGVuZ3RoICsgMyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0aGlzLmN1cnJlbnRDaGFyID09ICdcXHInKXtcclxuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0aGlzLmN1cnJlbnRDaGFyID09ICdcXG4nKXtcclxuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgIHRoaXMubGluZSsrO1xyXG4gICAgICAgICAgICB0aGlzLmNvbHVtbiA9IDE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgY3VycmVudFN0cmluZ0xpbmU6IHN0cmluZyA9IFwiXCI7XHJcblxyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIGxldCBjaGFyID0gdGhpcy5jdXJyZW50Q2hhcjtcclxuICAgICAgICAgICAgaWYgKGNoYXIgPT0gXCJcXFxcXCIpIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRTdHJpbmdMaW5lICs9IHRoaXMucGFyc2VTdHJpbmdMaXRlcmFsRXNjYXBlQ2hhcmFjdGVyKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhciA9PSAnXCInICYmIHRoaXMubmV4dENoYXIgPT0gJ1wiJyAmJiB0aGlzLnBvcyArIDIgPCB0aGlzLmlucHV0Lmxlbmd0aCAmJiB0aGlzLmlucHV0W3RoaXMucG9zICsgMl0gPT0gJ1wiJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgU3RyaW5nTGluZXMucHVzaChjdXJyZW50U3RyaW5nTGluZSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFyID09IGVuZENoYXIpIHtcclxuICAgICAgICAgICAgICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yKGxldCBzIG9mIFN0cmluZ0xpbmVzKSBsZW5ndGggKz0gcy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcignSW5uZXJoYWxiIGVpbmVyIFN0cmluZy1Lb25zdGFudGUgd3VyZGUgZGFzIFRleHRlbmRlIGVycmVpY2h0LicsbGVuZ3RoLCBcImVycm9yXCIsIGxpbmUsIGNvbHVtbik7XHJcbiAgICAgICAgICAgICAgICBTdHJpbmdMaW5lcy5wdXNoKGN1cnJlbnRTdHJpbmdMaW5lKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9IGVsc2UgXHJcbiAgICAgICAgICAgIGlmKGNoYXIgPT0gXCJcXHJcIil7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgIGlmIChjaGFyID09IFwiXFxuXCIpe1xyXG4gICAgICAgICAgICAgICAgU3RyaW5nTGluZXMucHVzaChjdXJyZW50U3RyaW5nTGluZSk7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50U3RyaW5nTGluZSA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpbmUrKztcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sdW1uID0gMTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50U3RyaW5nTGluZSArPSBjaGFyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoU3RyaW5nTGluZXMubGVuZ3RoID09IDApIHJldHVybjtcclxuICAgICAgICBsZXQgbGFzdExpbmUgPSBTdHJpbmdMaW5lcy5wb3AoKTtcclxuICAgICAgICBsZXQgaW5kZW50ID0gMDtcclxuICAgICAgICB3aGlsZShsYXN0TGluZS5sZW5ndGggPiBpbmRlbnQgJiYgbGFzdExpbmUuY2hhckF0KGluZGVudCkgPT0gXCIgXCIpe1xyXG4gICAgICAgICAgICBpbmRlbnQrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB0ZXh0OiBzdHJpbmcgPSBcIlwiOyBcclxuICAgICAgICB0ZXh0ID0gU3RyaW5nTGluZXMubWFwKHMgPT4gcy5zdWJzdHJpbmcoaW5kZW50KSkuam9pbihcIlxcblwiKTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLnN0cmluZ0NvbnN0YW50LCB0ZXh0LCB0aGlzLmxpbmUsIHRoaXMuY29sdW1uLCB0ZXh0Lmxlbmd0aCArIDIpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwYXJzZVN0cmluZ0xpdGVyYWxFc2NhcGVDaGFyYWN0ZXIoKTogc3RyaW5nIHtcclxuICAgICAgICB0aGlzLm5leHQoKTsgLy8gc2tpcCBcXFxyXG4gICAgICAgIGlmKHRoaXMuY3VycmVudENoYXIgPT0gXCJ1XCIpe1xyXG4gICAgICAgICAgICBsZXQgaGV4OiBzdHJpbmcgPSBcIlwiO1xyXG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgd2hpbGUoXCJhYmNkZWYwMTIzNDU2Nzg5XCIuaW5kZXhPZih0aGlzLmN1cnJlbnRDaGFyKSA+PSAwICYmIGhleC5sZW5ndGggPCA0KXtcclxuICAgICAgICAgICAgICAgIGhleCArPSB0aGlzLmN1cnJlbnRDaGFyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYoaGV4Lmxlbmd0aCA8IDQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoJ0RpZSBFc2NhcGUtU2VxdWVueiBcXFxcdScgKyBoZXggKyAnIGdpYnQgZXMgbmljaHQuJywgMSArIGhleC5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21Db2RlUG9pbnQocGFyc2VJbnQoaGV4LDE2KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYoRXNjYXBlU2VxdWVuY2VMaXN0W3RoaXMuY3VycmVudENoYXJdICE9IG51bGwpe1xyXG4gICAgICAgICAgICBsZXQgYyA9IEVzY2FwZVNlcXVlbmNlTGlzdFt0aGlzLmN1cnJlbnRDaGFyXTtcclxuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgIHJldHVybiBjO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKCdEaWUgRXNjYXBlLVNlcXVlbnogXFxcXCcgKyB0aGlzLmN1cnJlbnRDaGFyICsgJyBnaWJ0IGVzIG5pY2h0LicsIDIpO1xyXG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBsZXhNdWx0aWxpbmVDb21tZW50KCkge1xyXG4gICAgICAgIGxldCBsaW5lID0gdGhpcy5saW5lO1xyXG4gICAgICAgIGxldCBjb2x1bW4gPSB0aGlzLmNvbHVtbjtcclxuICAgICAgICBsZXQgbGFzdENoYXJXYXNOZXdsaW5lOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGxldCB0ZXh0ID0gXCIvKlwiO1xyXG4gICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgIHRoaXMubmV4dCgpO1xyXG5cclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBsZXQgY2hhciA9IHRoaXMuY3VycmVudENoYXI7XHJcbiAgICAgICAgICAgIGlmIChjaGFyID09IFwiKlwiICYmIHRoaXMubmV4dENoYXIgPT0gXCIvXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IFwiKi9cIjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjaGFyID09IGVuZENoYXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEVycm9yKFwiSW5uZXJoYWxiIGVpbmVzIE1laHJ6ZWlsZW5rb21tZW50YXJzICgvKi4uLiAqLykgd3VyZGUgZGFzIERhdGVpZW5kZSBlcnJlaWNodC5cIiwgMSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoY2hhciA9PSBcIlxcblwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpbmUrKztcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sdW1uID0gMDtcclxuICAgICAgICAgICAgICAgIGxhc3RDaGFyV2FzTmV3bGluZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IGNoYXI7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIShsYXN0Q2hhcldhc05ld2xpbmUgJiYgY2hhciA9PSBcIiBcIikpIHtcclxuICAgICAgICAgICAgICAgIHRleHQgKz0gY2hhcjtcclxuICAgICAgICAgICAgICAgIGxhc3RDaGFyV2FzTmV3bGluZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5jb21tZW50LCB0ZXh0LCBsaW5lLCBjb2x1bW4pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBsZXhFbmRvZkxpbmVDb21tZW50KCkge1xyXG4gICAgICAgIGxldCBsaW5lID0gdGhpcy5saW5lO1xyXG4gICAgICAgIGxldCBjb2x1bW4gPSB0aGlzLmNvbHVtbjtcclxuXHJcbiAgICAgICAgbGV0IHRleHQgPSBcIi8vXCI7XHJcbiAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgdGhpcy5uZXh0KCk7XHJcblxyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIGxldCBjaGFyID0gdGhpcy5jdXJyZW50Q2hhcjtcclxuICAgICAgICAgICAgaWYgKGNoYXIgPT0gXCJcXG5cIikge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGNoYXIgPT0gZW5kQ2hhcikge1xyXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5wdXNoRXJyb3IoXCJJbm5lcmhhbGIgZWluZXMgRWluemVpbGVua29tbWVudGFycyAoLy8uLi4gKSB3dXJkZSBkYXMgRGF0ZWllbmRlIGVycmVpY2h0LlwiLCAxKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRleHQgKz0gY2hhcjtcclxuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuY29tbWVudCwgdGV4dCwgbGluZSwgY29sdW1uKTtcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGxleE51bWJlcigpIHtcclxuICAgICAgICBsZXQgbGluZSA9IHRoaXMubGluZTtcclxuICAgICAgICBsZXQgY29sdW1uID0gdGhpcy5jb2x1bW47XHJcblxyXG4gICAgICAgIGxldCBzaWduOiBudW1iZXIgPSAxO1xyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRDaGFyID09ICctJykge1xyXG4gICAgICAgICAgICBzaWduID0gLTE7XHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5jdXJyZW50Q2hhciA9PSAnKycpIHtcclxuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcG9zU3RhcnQgPSB0aGlzLnBvcztcclxuXHJcbiAgICAgICAgbGV0IGZpcnN0Q2hhciA9IHRoaXMuY3VycmVudENoYXI7XHJcblxyXG4gICAgICAgIHRoaXMubmV4dCgpO1xyXG5cclxuICAgICAgICBsZXQgcmFkaXg6IG51bWJlciA9IDEwO1xyXG5cclxuICAgICAgICBpZiAoZmlyc3RDaGFyID09ICcwJyAmJiAoWydiJywgJ3gnLCAnMCcsICcxJywgJzInLCAnMycsICc0JywgJzUnLCAnNicsICc3J10uaW5kZXhPZih0aGlzLmN1cnJlbnRDaGFyKSA+PSAwKSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Q2hhciA9PSAneCcpIHtcclxuICAgICAgICAgICAgICAgIHJhZGl4ID0gMTY7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmN1cnJlbnRDaGFyID09ICdiJykge1xyXG4gICAgICAgICAgICAgICAgcmFkaXggPSAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSByYWRpeCA9IDg7XHJcbiAgICAgICAgICAgIHBvc1N0YXJ0ID0gdGhpcy5wb3M7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3aGlsZSAodGhpcy5pc0RpZ2l0KHRoaXMuY3VycmVudENoYXIsIHJhZGl4KSkge1xyXG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB0dCA9IFRva2VuVHlwZS5pbnRlZ2VyQ29uc3RhbnQ7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRDaGFyID09IFwiLlwiKSB7XHJcbiAgICAgICAgICAgIHR0ID0gVG9rZW5UeXBlLmZsb2F0aW5nUG9pbnRDb25zdGFudDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5pc0RpZ2l0KHRoaXMuY3VycmVudENoYXIsIDEwKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChyYWRpeCAhPSAxMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW5lIGZsb2F0L2RvdWJsZS1Lb25zdGFudGUgZGFyZiBuaWNodCBtaXQgMCwgMGIgb2RlciAweCBiZWdpbm5lbi5cIiwgdGhpcy5wb3MgLSBwb3NTdGFydCwgXCJlcnJvclwiLCB0aGlzLmxpbmUsIHRoaXMuY29sdW1uIC0gKHRoaXMucG9zIC0gcG9zU3RhcnQpKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBiYXNlID0gdGhpcy5pbnB1dC5zdWJzdHJpbmcocG9zU3RhcnQsIHRoaXMucG9zKTtcclxuXHJcbiAgICAgICAgcG9zU3RhcnQgPSB0aGlzLnBvcztcclxuICAgICAgICBsZXQgZXhwb25lbnQ6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgIGxldCBoYXNFeHBvbmVudGlhbDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRDaGFyID09IFwiZVwiKSB7XHJcbiAgICAgICAgICAgIGhhc0V4cG9uZW50aWFsID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgIGxldCBwb3NFeHBvbmVudFN0YXJ0OiBudW1iZXIgPSB0aGlzLnBvcztcclxuXHJcbiAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Q2hhciA9PSAnLScpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5pc0RpZ2l0KHRoaXMuY3VycmVudENoYXIsIDEwKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJhZGl4ICE9IDEwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hFcnJvcihcIkVpbmUgZmxvYXQvZG91YmxlLUtvbnN0YW50ZSBkYXJmIG5pY2h0IG1pdCAwLCAwYiBvZGVyIDB4IGJlZ2lubmVuLlwiLCB0aGlzLnBvcyAtIHBvc1N0YXJ0LCBcImVycm9yXCIsIHRoaXMubGluZSwgdGhpcy5jb2x1bW4gLSAodGhpcy5wb3MgLSBwb3NTdGFydCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBleHBvbmVudFN0cmluZyA9IHRoaXMuaW5wdXQuc3Vic3RyaW5nKHBvc0V4cG9uZW50U3RhcnQsIHRoaXMucG9zKTtcclxuICAgICAgICAgICAgZXhwb25lbnQgPSBOdW1iZXIucGFyc2VJbnQoZXhwb25lbnRTdHJpbmcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudENoYXIgPT0gJ2QnIHx8IHRoaXMuY3VycmVudENoYXIgPT0gJ2YnKSB7XHJcbiAgICAgICAgICAgIHR0ID0gVG9rZW5UeXBlLmZsb2F0aW5nUG9pbnRDb25zdGFudDtcclxuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgIGlmIChyYWRpeCAhPSAxMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoRXJyb3IoXCJFaW5lIGZsb2F0L2RvdWJsZS1Lb25zdGFudGUgZGFyZiBuaWNodCBtaXQgMCwgMGIgb2RlciAweCBiZWdpbm5lbi5cIiwgdGhpcy5wb3MgLSBwb3NTdGFydCwgXCJlcnJvclwiLCB0aGlzLmxpbmUsIHRoaXMuY29sdW1uIC0gKHRoaXMucG9zIC0gcG9zU3RhcnQpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHZhbHVlOiBudW1iZXIgPSAodHQgPT0gVG9rZW5UeXBlLmludGVnZXJDb25zdGFudCkgPyBOdW1iZXIucGFyc2VJbnQoYmFzZSwgcmFkaXgpIDogTnVtYmVyLnBhcnNlRmxvYXQoYmFzZSk7XHJcbiAgICAgICAgdmFsdWUgKj0gc2lnbjtcclxuICAgICAgICBpZiAoZXhwb25lbnQgIT0gMCkgdmFsdWUgKj0gTWF0aC5wb3coMTAsIGV4cG9uZW50KTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoVG9rZW4odHQsIHZhbHVlLCBsaW5lLCBjb2x1bW4pO1xyXG5cclxuICAgICAgICBpZiAocmFkaXggPT0gMTYgJiYgdGhpcy5jb2x1bW4gLSBjb2x1bW4gPT0gOCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbG9ySW5mb3JtYXRpb24ucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBjb2xvcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlZDogKHZhbHVlID4+IDE2KSAvIDI1NSxcclxuICAgICAgICAgICAgICAgICAgICBncmVlbjogKCh2YWx1ZSA+PiA4KSAmIDB4ZmYpIC8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgIGJsdWU6ICh2YWx1ZSAmIDB4ZmYpIC8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgIGFscGhhOiAxXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFydExpbmVOdW1iZXI6IGxpbmUsIGVuZExpbmVOdW1iZXI6IGxpbmUsIHN0YXJ0Q29sdW1uOiBjb2x1bW4sIGVuZENvbHVtbjogdGhpcy5jb2x1bW5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGxleEFubm90YXRpb24oKSB7XHJcbiAgICAgICAgbGV0IGxpbmUgPSB0aGlzLmxpbmU7XHJcbiAgICAgICAgbGV0IGNvbHVtbiA9IHRoaXMuY29sdW1uIC0gMTtcclxuICAgICAgICBsZXQgcG9zU3RhcnQgPSB0aGlzLnBvcztcclxuXHJcbiAgICAgICAgdGhpcy5uZXh0KCk7IC8vIGNvbnN1bWUgQFxyXG4gICAgICAgIGxldCBjaGFyID0gdGhpcy5jdXJyZW50Q2hhcjtcclxuXHJcbiAgICAgICAgd2hpbGUgKHNwZWNpYWxDaGFyTGlzdFtjaGFyXSA9PSBudWxsICYmICF0aGlzLmlzU3BhY2UoY2hhcikgJiYgIShjaGFyID09IGVuZENoYXIpKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICAgICAgICBjaGFyID0gdGhpcy5jdXJyZW50Q2hhcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBwb3NFbmQgPSB0aGlzLnBvcztcclxuXHJcbiAgICAgICAgbGV0IHRleHQgPSB0aGlzLmlucHV0LnN1YnN0cmluZyhwb3NTdGFydCwgcG9zRW5kKTtcclxuICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuYXQsIHRleHQsIGxpbmUsIGNvbHVtbiwgdGV4dC5sZW5ndGggKyAxKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXhJZGVudGlmaWVyT3JLZXl3b3JkKCkge1xyXG4gICAgICAgIGxldCBsaW5lID0gdGhpcy5saW5lO1xyXG4gICAgICAgIGxldCBjb2x1bW4gPSB0aGlzLmNvbHVtbjtcclxuXHJcbiAgICAgICAgbGV0IHBvc1N0YXJ0ID0gdGhpcy5wb3M7XHJcbiAgICAgICAgbGV0IGNoYXIgPSB0aGlzLmN1cnJlbnRDaGFyO1xyXG5cclxuICAgICAgICB3aGlsZSAoc3BlY2lhbENoYXJMaXN0W2NoYXJdID09IG51bGwgJiYgIXRoaXMuaXNTcGFjZShjaGFyKSAmJiAhKGNoYXIgPT0gZW5kQ2hhcikpIHtcclxuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XHJcbiAgICAgICAgICAgIGNoYXIgPSB0aGlzLmN1cnJlbnRDaGFyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHBvc0VuZCA9IHRoaXMucG9zO1xyXG5cclxuICAgICAgICBsZXQgdGV4dCA9IHRoaXMuaW5wdXQuc3Vic3RyaW5nKHBvc1N0YXJ0LCBwb3NFbmQpO1xyXG5cclxuICAgICAgICBsZXQgdHQgPSBrZXl3b3JkTGlzdFt0ZXh0XTtcclxuICAgICAgICBpZiAodHQgIT0gbnVsbCAmJiB0eXBlb2YgdHQgPT0gXCJudW1iZXJcIikge1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0dCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUudHJ1ZTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuYm9vbGVhbkNvbnN0YW50LCB0cnVlLCBsaW5lLCBjb2x1bW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZmFsc2U6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoVG9rZW4oVG9rZW5UeXBlLmJvb2xlYW5Db25zdGFudCwgZmFsc2UsIGxpbmUsIGNvbHVtbik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkUHJpbnQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkUHJpbnRsbjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5ub25TcGFjZUxhc3RUb2tlblR5cGUgPT0gVG9rZW5UeXBlLmRvdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbihUb2tlblR5cGUuaWRlbnRpZmllciwgdGV4dCwgbGluZSwgY29sdW1uKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hUb2tlbih0dCwgdGV4dCwgbGluZSwgY29sdW1uKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFRva2VuKHR0LCB0ZXh0LCBsaW5lLCBjb2x1bW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGV4dCA9PSAnQ29sb3InKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sb3JJbmRpY2VzLnB1c2godGhpcy50b2tlbkxpc3QubGVuZ3RoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHVzaFRva2VuKFRva2VuVHlwZS5pZGVudGlmaWVyLCB0ZXh0LCBsaW5lLCBjb2x1bW4pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpc1NwYWNlKGNoYXI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiBjaGFyID09IFwiIFwiIHx8IGNoYXIgPT0gXCJcXG5cIjtcclxuICAgIH1cclxuXHJcblxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXJyb3JMaXN0VG9TdHJpbmcoZXJyb3JMaXN0OiBFcnJvcltdKTogc3RyaW5nIHtcclxuICAgIGxldCBzID0gXCJcIjtcclxuXHJcbiAgICBmb3IgKGxldCBlcnJvciBvZiBlcnJvckxpc3QpIHtcclxuXHJcbiAgICAgICAgcyArPSBcIlogXCIgKyBlcnJvci5wb3NpdGlvbi5saW5lICsgXCIsIFMgXCIgKyBlcnJvci5wb3NpdGlvbi5jb2x1bW4gKyBcIjogXCI7XHJcbiAgICAgICAgcyArPSBlcnJvci50ZXh0ICsgXCI8YnI+XCI7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzO1xyXG59Il19