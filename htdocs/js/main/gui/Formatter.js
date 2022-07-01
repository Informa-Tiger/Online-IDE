import { Lexer } from "../../compiler/lexer/Lexer.js";
import { TokenType } from "../../compiler/lexer/Token.js";
export class Formatter {
    constructor(
    // private main: Main
    ) {
        this.autoFormatTriggerCharacters = ['\n'];
        this.displayName = "Java-Autoformat";
    }
    init() {
        monaco.languages.registerDocumentFormattingEditProvider('myJava', this);
        monaco.languages.registerOnTypeFormattingEditProvider('myJava', this);
    }
    provideOnTypeFormattingEdits(model, position, ch, options, token) {
        let edits = this.format(model);
        return Promise.resolve(edits);
    }
    deleteOverlappingRanges(edits) {
        for (let i = 0; i < edits.length - 1; i++) {
            let e = edits[i];
            let e1 = edits[i + 1];
            if (e.range.endLineNumber < e1.range.startLineNumber)
                continue;
            if (e.range.endLineNumber == e1.range.startLineNumber) {
                if (e.range.endColumn >= e1.range.startColumn) {
                    edits.splice(i + 1, 1);
                }
                else {
                    if (e.range.endColumn == 0 && e.text.length > 0 && e1.range.startColumn == 1 && e1.range.endColumn > e1.range.startColumn && e1.text == "") {
                        let delta = e.text.length - (e1.range.endColumn - e1.range.startColumn);
                        if (delta > 0) {
                            e.text = e.text.substr(0, delta);
                            edits.splice(i + 1, 1);
                        }
                        else if (delta < 0) {
                            //@ts-ignore
                            e1.range.endColumn = e1.range.startColumn - delta;
                            edits.splice(i, 1);
                            i--;
                        }
                        else {
                            edits.splice(i, 2);
                            i--;
                        }
                    }
                }
            }
        }
    }
    provideDocumentFormattingEdits(model, options, token) {
        let edits = this.format(model);
        return Promise.resolve(edits);
    }
    format(model) {
        let edits = [];
        // if (this.main.currentWorkspace == null || this.main.currentWorkspace.currentlyOpenModule == null) {
        //     return [];
        // }
        // let text = this.main.monaco_editor.getValue({ preserveBOM: false, lineEnding: "\n" });
        let text = model.getValue(monaco.editor.EndOfLinePreference.LF);
        let tokenlist = new Lexer().lex(text).tokens;
        // let tokenlist = this.main.currentWorkspace.currentlyOpenModule.tokenList;
        if (tokenlist == null)
            return [];
        // TODO:
        // { at the end of line, with one space before; followed only by spaces and \n
        // indent lines according to { and }
        // Beware: int i[] = { ... }
        // exactly one space before/after binary operators
        // no space after ( and no space before )
        // (   ) -> ()
        // (  ()) -> (())
        // (()  ) -> (())
        let lastNonSpaceToken = null;
        let indentLevel = 0;
        let tabSize = 3;
        let curlyBracesOpenAtLines = [];
        let indentLevelAtSwitchStatements = [];
        let switchHappend = false;
        let lastTokenWasNewLine = 0;
        let roundBracketsOpen = 0;
        for (let i = 0; i < tokenlist.length; i++) {
            let t = tokenlist[i];
            lastTokenWasNewLine--;
            switch (t.tt) {
                case TokenType.keywordSwitch:
                    switchHappend = true;
                    break;
                case TokenType.keywordCase:
                case TokenType.keywordDefault:
                    // outdent: line with case:
                    if (t.position.column > 3) {
                        this.deleteSpaces(edits, t.position.line, 1, 3);
                    }
                    break;
                case TokenType.leftCurlyBracket:
                    if (switchHappend) {
                        switchHappend = false;
                        indentLevelAtSwitchStatements.push(indentLevel + 2);
                        indentLevel++;
                    }
                    indentLevel++;
                    curlyBracesOpenAtLines.push(t.position.line);
                    if (lastNonSpaceToken != null) {
                        let tt = lastNonSpaceToken.tt;
                        if (tt == TokenType.rightBracket || tt == TokenType.identifier || tt == TokenType.leftRightSquareBracket) {
                            if (lastNonSpaceToken.position.line == t.position.line) {
                                this.replaceBetween(lastNonSpaceToken, t, edits, " ");
                            }
                        }
                    }
                    if (i < tokenlist.length - 1) {
                        let token1 = tokenlist[i + 1];
                        if (token1.tt != TokenType.newline && token1.tt != TokenType.space) {
                            this.insertSpaces(edits, token1.position.line, token1.position.column, 1);
                        }
                    }
                    break;
                case TokenType.rightCurlyBracket:
                    if (indentLevelAtSwitchStatements[indentLevelAtSwitchStatements.length - 1] == indentLevel) {
                        indentLevelAtSwitchStatements.pop();
                        indentLevel--;
                        // if(t.position.column >= 3){
                        this.deleteSpaces(edits, t.position.line, 1, 3);
                        // }    
                    }
                    indentLevel--;
                    let openedAtLine = curlyBracesOpenAtLines.pop();
                    if (openedAtLine != null && openedAtLine != t.position.line) {
                        if (lastNonSpaceToken != null && lastNonSpaceToken.position.line == t.position.line) {
                            this.replace(edits, t.position, t.position, "\n" + " ".repeat(indentLevel * tabSize));
                        }
                    }
                    else {
                        if (i > 0) {
                            let token1 = tokenlist[i - 1];
                            if (token1.tt != TokenType.space && token1.tt != TokenType.newline) {
                                this.insertSpaces(edits, t.position.line, t.position.column, 1);
                            }
                        }
                    }
                    break;
                case TokenType.leftBracket:
                    roundBracketsOpen++;
                    if (i < tokenlist.length - 2) {
                        let nextToken1 = tokenlist[i + 1];
                        let nextToken2 = tokenlist[i + 2];
                        if (nextToken1.tt == TokenType.space && nextToken2.tt != TokenType.newline) {
                            this.deleteSpaces(edits, nextToken1.position.line, nextToken1.position.column, nextToken1.position.length);
                            i++;
                            if (nextToken2.tt == TokenType.rightBracket) {
                                i++;
                                roundBracketsOpen--;
                            }
                        }
                    }
                    if (i > 1) {
                        let lastToken1 = tokenlist[i - 1];
                        let lastToken2 = tokenlist[i - 2];
                        if (lastToken1.tt == TokenType.space && [TokenType.newline, TokenType.keywordFor, TokenType.keywordWhile].indexOf(lastToken2.tt) < 0 && !this.isBinaryOperator(lastToken2.tt)) {
                            if (lastToken1.position.length == 1) {
                                this.deleteSpaces(edits, lastToken1.position.line, lastToken1.position.column, 1);
                            }
                        }
                    }
                    break;
                case TokenType.rightBracket:
                    roundBracketsOpen--;
                    if (i > 1) {
                        let nextToken1 = tokenlist[i - 1];
                        let nextToken2 = tokenlist[i - 2];
                        if (nextToken1.tt == TokenType.space && nextToken2.tt != TokenType.newline) {
                            this.deleteSpaces(edits, nextToken1.position.line, nextToken1.position.column, nextToken1.position.length);
                        }
                    }
                    break;
                case TokenType.newline:
                    lastTokenWasNewLine = 2;
                    if (i < tokenlist.length - 2) {
                        let nextNonSpaceToken = this.getNextNonSpaceToken(i, tokenlist);
                        // no additional indent after "case 12 :"
                        let lastTokenIsOperator = this.isBinaryOperator(lastNonSpaceToken === null || lastNonSpaceToken === void 0 ? void 0 : lastNonSpaceToken.tt) && (lastNonSpaceToken === null || lastNonSpaceToken === void 0 ? void 0 : lastNonSpaceToken.tt) != TokenType.colon;
                        let nextTokenIsOperator = this.isBinaryOperator(nextNonSpaceToken.tt);
                        let beginNextLine = tokenlist[i + 1];
                        let token2 = tokenlist[i + 2];
                        let currentIndentation = 0;
                        if (beginNextLine.tt == TokenType.newline || nextNonSpaceToken.tt == TokenType.comment) {
                            break;
                        }
                        let delta = 0;
                        if (beginNextLine.tt == TokenType.space) {
                            if (token2.tt == TokenType.newline) {
                                break;
                            }
                            currentIndentation = beginNextLine.position.length;
                            i++;
                            if (token2.tt == TokenType.rightCurlyBracket) {
                                delta = -1;
                            }
                        }
                        if (beginNextLine.tt == TokenType.rightCurlyBracket) {
                            delta = -1;
                            // indentLevel--;
                            // curlyBracesOpenAtLines.pop();
                            // lastNonSpaceToken = beginNextLine;
                            // i++;
                        }
                        if (nextTokenIsOperator || lastTokenIsOperator)
                            delta = 1;
                        let il = indentLevel + delta;
                        if (roundBracketsOpen > 0) {
                            il++;
                        }
                        if (il < 0)
                            il = 0;
                        let correctIndentation = il * tabSize;
                        if (correctIndentation > currentIndentation) {
                            this.insertSpaces(edits, t.position.line + 1, 0, correctIndentation - currentIndentation);
                        }
                        else if (correctIndentation < currentIndentation) {
                            this.deleteSpaces(edits, t.position.line + 1, 0, currentIndentation - correctIndentation);
                        }
                    }
                    break;
                case TokenType.space:
                    if (i < tokenlist.length - 1) {
                        let nextToken = tokenlist[i + 1];
                        if (nextToken.tt != TokenType.comment) {
                            if (i > 0) {
                                let lastToken = tokenlist[i - 1];
                                if (lastToken.tt != TokenType.newline) {
                                    if (t.position.length > 1) {
                                        this.deleteSpaces(edits, t.position.line, t.position.column, t.position.length - 1);
                                    }
                                }
                            }
                        }
                    }
                    break;
                case TokenType.keywordFor:
                case TokenType.keywordWhile:
                    if (i < tokenlist.length - 1) {
                        let nextToken = tokenlist[i + 1];
                        if (nextToken.tt == TokenType.leftBracket) {
                            this.insertSpaces(edits, nextToken.position.line, nextToken.position.column, 1);
                        }
                    }
                    break;
                case TokenType.comma:
                case TokenType.semicolon:
                    if (i > 1) {
                        let lastToken1 = tokenlist[i - 1];
                        let lastToken2 = tokenlist[i - 2];
                        if (lastToken1.tt != TokenType.newline && lastToken2.tt != TokenType.newline && !this.isBinaryOperator(lastToken2.tt)) {
                            if (lastToken1.tt == TokenType.space && lastToken1.position.length == 1) {
                                this.deleteSpaces(edits, lastToken1.position.line, lastToken1.position.column, 1);
                            }
                        }
                    }
                    if (i < tokenlist.length - 1) {
                        let nextToken = tokenlist[i + 1];
                        if (nextToken.tt != TokenType.comment && nextToken.tt != TokenType.space && nextToken.tt != TokenType.newline) {
                            this.insertSpaces(edits, nextToken.position.line, nextToken.position.column, 1);
                        }
                    }
                    break;
                case TokenType.rightSquareBracket:
                    if (lastNonSpaceToken != null && lastNonSpaceToken.tt == TokenType.leftSquareBracket) {
                        this.replaceBetween(lastNonSpaceToken, t, edits, "");
                    }
                    break;
            }
            // binary operator?
            if (this.isBinaryOperator(t.tt)) {
                let lowerGeneric = t.tt == TokenType.lower && this.lowerBelongsToGenericExpression(i, tokenlist);
                let greaterGeneric = t.tt == TokenType.greater && this.greaterBelongsToGenericExpression(i, tokenlist);
                if (lastTokenWasNewLine <= 0 && lastNonSpaceToken != null && [TokenType.leftBracket, TokenType.assignment, TokenType.comma].indexOf(lastNonSpaceToken.tt) < 0) {
                    if (i > 0) {
                        let tokenBefore = tokenlist[i - 1];
                        let spaces = (lowerGeneric || greaterGeneric) ? 0 : 1;
                        if (tokenBefore.tt == TokenType.space) {
                            if (tokenBefore.position.length != spaces) {
                                this.insertSpaces(edits, tokenBefore.position.line, tokenBefore.position.column, spaces - tokenBefore.position.length);
                            }
                        }
                        else {
                            if (spaces == 1)
                                this.insertSpaces(edits, t.position.line, t.position.column, 1);
                        }
                    }
                    if (i < tokenlist.length - 1) {
                        let nextToken = tokenlist[i + 1];
                        let spaces = (lowerGeneric) ? 0 : 1;
                        if (nextToken.tt == TokenType.space) {
                            if (greaterGeneric && i < tokenlist.length - 2 && tokenlist[i + 2].tt == TokenType.leftBracket) {
                                spaces = 0;
                            }
                            if (nextToken.position.length != spaces) {
                                this.insertSpaces(edits, nextToken.position.line, nextToken.position.column, spaces - nextToken.position.length);
                            }
                        }
                        else {
                            if (greaterGeneric && nextToken.tt == TokenType.leftBracket) {
                                spaces = 0;
                            }
                            if (spaces == 1)
                                this.insertSpaces(edits, nextToken.position.line, nextToken.position.column, 1);
                        }
                    }
                }
            }
            if (t.tt != TokenType.space && t.tt != TokenType.newline) {
                lastNonSpaceToken = t;
            }
        }
        this.deleteOverlappingRanges(edits);
        return edits;
    }
    getNextNonSpaceToken(currentIndex, tokenlist) {
        if (currentIndex == tokenlist.length - 1)
            return tokenlist[currentIndex];
        let j = currentIndex + 1;
        while (j < tokenlist.length - 1 && (tokenlist[j].tt == TokenType.space || tokenlist[j].tt == TokenType.return)) {
            j++;
        }
        return tokenlist[j];
    }
    lowerBelongsToGenericExpression(position, tokenlist) {
        let i = position + 1;
        while (i < tokenlist.length) {
            let tt = tokenlist[i].tt;
            if (tt == TokenType.greater) {
                return true;
            }
            if ([TokenType.space, TokenType.comma, TokenType.identifier].indexOf(tt) < 0) {
                return false;
            }
            i++;
        }
        return false;
    }
    greaterBelongsToGenericExpression(position, tokenlist) {
        let i = position - 1;
        while (i >= 0) {
            let tt = tokenlist[i].tt;
            if (tt == TokenType.lower) {
                return true;
            }
            if ([TokenType.space, TokenType.comma, TokenType.identifier].indexOf(tt) < 0) {
                return false;
            }
            i--;
        }
        return false;
    }
    isBinaryOperator(token) {
        return token != null && token >= TokenType.modulo && token <= TokenType.colon;
    }
    replaceBetween(lastNonSpaceToken, t, edits, text) {
        let positionFrom = {
            line: lastNonSpaceToken.position.line,
            column: lastNonSpaceToken.position.column + lastNonSpaceToken.position.length
        };
        let positionTo = {
            line: t.position.line,
            column: t.position.column
        };
        if (positionFrom.line != positionTo.line ||
            positionTo.column - positionFrom.column != text.length) {
            this.replace(edits, positionFrom, positionTo, text);
        }
    }
    deleteSpaces(edits, line, column, numberOfSpaces) {
        edits.push({
            range: {
                startColumn: column,
                startLineNumber: line,
                endColumn: column + numberOfSpaces + (column == 0 ? 1 : 0),
                endLineNumber: line
            },
            text: ""
        });
    }
    insertSpaces(edits, line, column, numberOfSpaces) {
        if (numberOfSpaces < 0) {
            this.deleteSpaces(edits, line, column, -numberOfSpaces);
            return;
        }
        edits.push({
            range: {
                startColumn: column,
                startLineNumber: line,
                endColumn: column,
                endLineNumber: line
            },
            text: " ".repeat(numberOfSpaces)
        });
    }
    replace(edits, positionFrom, positionTo, text) {
        edits.push({
            range: {
                startColumn: positionFrom.column,
                startLineNumber: positionFrom.line,
                endColumn: positionTo.column,
                endLineNumber: positionTo.line
            },
            text: text
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRm9ybWF0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9Gb3JtYXR0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBb0IsU0FBUyxFQUFxQixNQUFNLCtCQUErQixDQUFDO0FBRS9GLE1BQU0sT0FBTyxTQUFTO0lBUWxCO0lBQ0kscUJBQXFCOztRQU56QixnQ0FBMkIsR0FBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9DLGdCQUFXLEdBQVksaUJBQWlCLENBQUM7SUFPekMsQ0FBQztJQUVELElBQUk7UUFDQSxNQUFNLENBQUMsU0FBUyxDQUFDLHNDQUFzQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RSxNQUFNLENBQUMsU0FBUyxDQUFDLG9DQUFvQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQsNEJBQTRCLENBQUMsS0FBK0IsRUFBRSxRQUF5QixFQUFFLEVBQVUsRUFBRSxPQUEyQyxFQUFFLEtBQStCO1FBRTdLLElBQUksS0FBSyxHQUFnQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTVELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FDbEIsS0FBSyxDQUNSLENBQUM7SUFFTixDQUFDO0lBQ0QsdUJBQXVCLENBQUMsS0FBa0M7UUFDdEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxDQUFD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LGFBQWEsRUFBRSxJQUFJO2FBQ3RCO1lBQ0QsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDO1NBQ25DLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCxPQUFPLENBQUMsS0FBa0MsRUFBRSxZQUErQyxFQUFFLFVBQTZDLEVBQUUsSUFBWTtRQUVwSixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1AsS0FBSyxFQUFFO2dCQUNILFdBQVcsRUFBRSxZQUFZLENBQUMsTUFBTTtnQkFDaEMsZUFBZSxFQUFFLFlBQVksQ0FBQyxJQUFJO2dCQUNsQyxTQUFTLEVBQUUsVUFBVSxDQUFDLE1BQU07Z0JBQzVCLGFBQWEsRUFBRSxVQUFVLENBQUMsSUFBSTthQUNqQztZQUNELElBQUksRUFBRSxJQUFJO1NBQ2IsQ0FBQyxDQUFDO0lBRVAsQ0FBQztDQU9KIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGV4ZXIgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvbGV4ZXIvTGV4ZXIuanNcIjtcclxuaW1wb3J0IHsgVG9rZW4sIFRva2VuTGlzdCwgVG9rZW5UeXBlLCB0b2tlbkxpc3RUb1N0cmluZyB9IGZyb20gXCIuLi8uLi9jb21waWxlci9sZXhlci9Ub2tlbi5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEZvcm1hdHRlciBpbXBsZW1lbnRzIG1vbmFjby5sYW5ndWFnZXMuRG9jdW1lbnRGb3JtYXR0aW5nRWRpdFByb3ZpZGVyLFxyXG4gICAgbW9uYWNvLmxhbmd1YWdlcy5PblR5cGVGb3JtYXR0aW5nRWRpdFByb3ZpZGVyIHtcclxuXHJcbiAgICBhdXRvRm9ybWF0VHJpZ2dlckNoYXJhY3RlcnM6IHN0cmluZ1tdID0gWydcXG4nXTtcclxuXHJcbiAgICBkaXNwbGF5TmFtZT86IHN0cmluZyA9IFwiSmF2YS1BdXRvZm9ybWF0XCI7XHJcblxyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIC8vIHByaXZhdGUgbWFpbjogTWFpblxyXG4gICAgKSB7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGluaXQoKSB7XHJcbiAgICAgICAgbW9uYWNvLmxhbmd1YWdlcy5yZWdpc3RlckRvY3VtZW50Rm9ybWF0dGluZ0VkaXRQcm92aWRlcignbXlKYXZhJywgdGhpcyk7XHJcbiAgICAgICAgbW9uYWNvLmxhbmd1YWdlcy5yZWdpc3Rlck9uVHlwZUZvcm1hdHRpbmdFZGl0UHJvdmlkZXIoJ215SmF2YScsIHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3ZpZGVPblR5cGVGb3JtYXR0aW5nRWRpdHMobW9kZWw6IG1vbmFjby5lZGl0b3IuSVRleHRNb2RlbCwgcG9zaXRpb246IG1vbmFjby5Qb3NpdGlvbiwgY2g6IHN0cmluZywgb3B0aW9uczogbW9uYWNvLmxhbmd1YWdlcy5Gb3JtYXR0aW5nT3B0aW9ucywgdG9rZW46IG1vbmFjby5DYW5jZWxsYXRpb25Ub2tlbik6IG1vbmFjby5sYW5ndWFnZXMuUHJvdmlkZXJSZXN1bHQ8bW9uYWNvLmxhbmd1YWdlcy5UZXh0RWRpdFtdPiB7XHJcblxyXG4gICAgICAgIGxldCBlZGl0czogbW9uYWNvLmxhbmd1YWdlcy5UZXh0RWRpdFtdID0gdGhpcy5mb3JtYXQobW9kZWwpO1xyXG5cclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFxyXG4gICAgICAgICAgICBlZGl0c1xyXG4gICAgICAgICk7XHJcblxyXG4gICAgfVxyXG4gICAgZGVsZXRlT3ZlcmxhcHBpbmdSYW5nZXMoZWRpdHM6IG1vbmFjby5sYW5ndWFnZXMuVGV4dEVkaXRbXSkge1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWRpdHMubGVuZ3RoIC0gMTsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxldCBlID0gZWRpdHNbaV07XHJcbiAgICAgICAgICAgIGxldCBlMSA9IGVkaXRzW2kgKyAxXTtcclxuICAgICAgICAgICAgaWYgKGUucmFuZ2UuZW5kTGluZU51bWJlciA8IGUxLnJhbmdlLnN0YXJ0TGluZU51bWJlcikgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChlLnJhbmdlLmVuZExpbmVOdW1iZXIgPT0gZTEucmFuZ2Uuc3RhcnRMaW5lTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZS5yYW5nZS5lbmRDb2x1bW4gPj0gZTEucmFuZ2Uuc3RhcnRDb2x1bW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBlZGl0cy5zcGxpY2UoaSArIDEsIDEpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZS5yYW5nZS5lbmRDb2x1bW4gPT0gMCAmJiBlLnRleHQubGVuZ3RoID4gMCAmJiBlMS5yYW5nZS5zdGFydENvbHVtbiA9PSAxICYmIGUxLnJhbmdlLmVuZENvbHVtbiA+IGUxLnJhbmdlLnN0YXJ0Q29sdW1uICYmIGUxLnRleHQgPT0gXCJcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGVsdGEgPSBlLnRleHQubGVuZ3RoIC0gKGUxLnJhbmdlLmVuZENvbHVtbiAtIGUxLnJhbmdlLnN0YXJ0Q29sdW1uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlbHRhID4gMCkgeyBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUudGV4dCA9IGUudGV4dC5zdWJzdHIoMCwgZGVsdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdHMuc3BsaWNlKGkrMSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZGVsdGEgPCAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlMS5yYW5nZS5lbmRDb2x1bW4gPSBlMS5yYW5nZS5zdGFydENvbHVtbiAtIGRlbHRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdHMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaS0tO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlZGl0cy5zcGxpY2UoaSwgMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHByb3ZpZGVEb2N1bWVudEZvcm1hdHRpbmdFZGl0cyhtb2RlbDogbW9uYWNvLmVkaXRvci5JVGV4dE1vZGVsLFxyXG4gICAgICAgIG9wdGlvbnM6IG1vbmFjby5sYW5ndWFnZXMuRm9ybWF0dGluZ09wdGlvbnMsXHJcbiAgICAgICAgdG9rZW46IG1vbmFjby5DYW5jZWxsYXRpb25Ub2tlbik6IG1vbmFjby5sYW5ndWFnZXMuUHJvdmlkZXJSZXN1bHQ8bW9uYWNvLmxhbmd1YWdlcy5UZXh0RWRpdFtdPiB7XHJcblxyXG4gICAgICAgIGxldCBlZGl0czogbW9uYWNvLmxhbmd1YWdlcy5UZXh0RWRpdFtdID0gdGhpcy5mb3JtYXQobW9kZWwpO1xyXG5cclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFxyXG4gICAgICAgICAgICBlZGl0c1xyXG4gICAgICAgICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZvcm1hdChtb2RlbDogbW9uYWNvLmVkaXRvci5JVGV4dE1vZGVsKTogbW9uYWNvLmxhbmd1YWdlcy5UZXh0RWRpdFtdIHtcclxuXHJcbiAgICAgICAgbGV0IGVkaXRzOiBtb25hY28ubGFuZ3VhZ2VzLlRleHRFZGl0W10gPSBbXTtcclxuXHJcbiAgICAgICAgLy8gaWYgKHRoaXMubWFpbi5jdXJyZW50V29ya3NwYWNlID09IG51bGwgfHwgdGhpcy5tYWluLmN1cnJlbnRXb3Jrc3BhY2UuY3VycmVudGx5T3Blbk1vZHVsZSA9PSBudWxsKSB7XHJcbiAgICAgICAgLy8gICAgIHJldHVybiBbXTtcclxuICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgIC8vIGxldCB0ZXh0ID0gdGhpcy5tYWluLm1vbmFjb19lZGl0b3IuZ2V0VmFsdWUoeyBwcmVzZXJ2ZUJPTTogZmFsc2UsIGxpbmVFbmRpbmc6IFwiXFxuXCIgfSk7XHJcblxyXG4gICAgICAgIGxldCB0ZXh0ID0gbW9kZWwuZ2V0VmFsdWUobW9uYWNvLmVkaXRvci5FbmRPZkxpbmVQcmVmZXJlbmNlLkxGKTtcclxuXHJcbiAgICAgICAgbGV0IHRva2VubGlzdCA9IG5ldyBMZXhlcigpLmxleCh0ZXh0KS50b2tlbnM7XHJcblxyXG4gICAgICAgIC8vIGxldCB0b2tlbmxpc3QgPSB0aGlzLm1haW4uY3VycmVudFdvcmtzcGFjZS5jdXJyZW50bHlPcGVuTW9kdWxlLnRva2VuTGlzdDtcclxuXHJcbiAgICAgICAgaWYgKHRva2VubGlzdCA9PSBudWxsKSByZXR1cm4gW107XHJcblxyXG4gICAgICAgIC8vIFRPRE86XHJcbiAgICAgICAgLy8geyBhdCB0aGUgZW5kIG9mIGxpbmUsIHdpdGggb25lIHNwYWNlIGJlZm9yZTsgZm9sbG93ZWQgb25seSBieSBzcGFjZXMgYW5kIFxcblxyXG4gICAgICAgIC8vIGluZGVudCBsaW5lcyBhY2NvcmRpbmcgdG8geyBhbmQgfVxyXG4gICAgICAgIC8vIEJld2FyZTogaW50IGlbXSA9IHsgLi4uIH1cclxuICAgICAgICAvLyBleGFjdGx5IG9uZSBzcGFjZSBiZWZvcmUvYWZ0ZXIgYmluYXJ5IG9wZXJhdG9yc1xyXG4gICAgICAgIC8vIG5vIHNwYWNlIGFmdGVyICggYW5kIG5vIHNwYWNlIGJlZm9yZSApXHJcbiAgICAgICAgLy8gKCAgICkgLT4gKClcclxuICAgICAgICAvLyAoICAoKSkgLT4gKCgpKVxyXG4gICAgICAgIC8vICgoKSAgKSAtPiAoKCkpXHJcblxyXG4gICAgICAgIGxldCBsYXN0Tm9uU3BhY2VUb2tlbjogVG9rZW4gPSBudWxsO1xyXG4gICAgICAgIGxldCBpbmRlbnRMZXZlbCA9IDA7XHJcbiAgICAgICAgbGV0IHRhYlNpemUgPSAzO1xyXG4gICAgICAgIGxldCBjdXJseUJyYWNlc09wZW5BdExpbmVzOiBudW1iZXJbXSA9IFtdO1xyXG4gICAgICAgIGxldCBpbmRlbnRMZXZlbEF0U3dpdGNoU3RhdGVtZW50czogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBsZXQgc3dpdGNoSGFwcGVuZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBsYXN0VG9rZW5XYXNOZXdMaW5lOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIGxldCByb3VuZEJyYWNrZXRzT3BlbjogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbmxpc3QubGVuZ3RoOyBpKyspIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB0ID0gdG9rZW5saXN0W2ldO1xyXG4gICAgICAgICAgICBsYXN0VG9rZW5XYXNOZXdMaW5lLS07XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHQudHQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkU3dpdGNoOlxyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaEhhcHBlbmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZENhc2U6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkRGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAvLyBvdXRkZW50OiBsaW5lIHdpdGggY2FzZTpcclxuICAgICAgICAgICAgICAgICAgICBpZiAodC5wb3NpdGlvbi5jb2x1bW4gPiAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlU3BhY2VzKGVkaXRzLCB0LnBvc2l0aW9uLmxpbmUsIDEsIDMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmxlZnRDdXJseUJyYWNrZXQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN3aXRjaEhhcHBlbmQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoSGFwcGVuZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRlbnRMZXZlbEF0U3dpdGNoU3RhdGVtZW50cy5wdXNoKGluZGVudExldmVsICsgMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGVudExldmVsKys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGluZGVudExldmVsKys7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VybHlCcmFjZXNPcGVuQXRMaW5lcy5wdXNoKHQucG9zaXRpb24ubGluZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3ROb25TcGFjZVRva2VuICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHR0ID0gbGFzdE5vblNwYWNlVG9rZW4udHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0dCA9PSBUb2tlblR5cGUucmlnaHRCcmFja2V0IHx8IHR0ID09IFRva2VuVHlwZS5pZGVudGlmaWVyIHx8IHR0ID09IFRva2VuVHlwZS5sZWZ0UmlnaHRTcXVhcmVCcmFja2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsYXN0Tm9uU3BhY2VUb2tlbi5wb3NpdGlvbi5saW5lID09IHQucG9zaXRpb24ubGluZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXBsYWNlQmV0d2VlbihsYXN0Tm9uU3BhY2VUb2tlbiwgdCwgZWRpdHMsIFwiIFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA8IHRva2VubGlzdC5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0b2tlbjEgPSB0b2tlbmxpc3RbaSArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4xLnR0ICE9IFRva2VuVHlwZS5uZXdsaW5lICYmIHRva2VuMS50dCAhPSBUb2tlblR5cGUuc3BhY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0U3BhY2VzKGVkaXRzLCB0b2tlbjEucG9zaXRpb24ubGluZSwgdG9rZW4xLnBvc2l0aW9uLmNvbHVtbiwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5yaWdodEN1cmx5QnJhY2tldDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZW50TGV2ZWxBdFN3aXRjaFN0YXRlbWVudHNbaW5kZW50TGV2ZWxBdFN3aXRjaFN0YXRlbWVudHMubGVuZ3RoIC0gMV0gPT0gaW5kZW50TGV2ZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZW50TGV2ZWxBdFN3aXRjaFN0YXRlbWVudHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGVudExldmVsLS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmKHQucG9zaXRpb24uY29sdW1uID49IDMpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZVNwYWNlcyhlZGl0cywgdC5wb3NpdGlvbi5saW5lLCAxLCAzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gfSAgICBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50TGV2ZWwtLTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgb3BlbmVkQXRMaW5lID0gY3VybHlCcmFjZXNPcGVuQXRMaW5lcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BlbmVkQXRMaW5lICE9IG51bGwgJiYgb3BlbmVkQXRMaW5lICE9IHQucG9zaXRpb24ubGluZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdE5vblNwYWNlVG9rZW4gIT0gbnVsbCAmJiBsYXN0Tm9uU3BhY2VUb2tlbi5wb3NpdGlvbi5saW5lID09IHQucG9zaXRpb24ubGluZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXBsYWNlKGVkaXRzLCB0LnBvc2l0aW9uLCB0LnBvc2l0aW9uLCBcIlxcblwiICsgXCIgXCIucmVwZWF0KGluZGVudExldmVsICogdGFiU2l6ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdG9rZW4xID0gdG9rZW5saXN0W2kgLSAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbjEudHQgIT0gVG9rZW5UeXBlLnNwYWNlICYmIHRva2VuMS50dCAhPSBUb2tlblR5cGUubmV3bGluZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0U3BhY2VzKGVkaXRzLCB0LnBvc2l0aW9uLmxpbmUsIHQucG9zaXRpb24uY29sdW1uLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmxlZnRCcmFja2V0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJvdW5kQnJhY2tldHNPcGVuKys7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPCB0b2tlbmxpc3QubGVuZ3RoIC0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV4dFRva2VuMSA9IHRva2VubGlzdFtpICsgMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXh0VG9rZW4yID0gdG9rZW5saXN0W2kgKyAyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRUb2tlbjEudHQgPT0gVG9rZW5UeXBlLnNwYWNlICYmIG5leHRUb2tlbjIudHQgIT0gVG9rZW5UeXBlLm5ld2xpbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlU3BhY2VzKGVkaXRzLCBuZXh0VG9rZW4xLnBvc2l0aW9uLmxpbmUsIG5leHRUb2tlbjEucG9zaXRpb24uY29sdW1uLCBuZXh0VG9rZW4xLnBvc2l0aW9uLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dFRva2VuMi50dCA9PSBUb2tlblR5cGUucmlnaHRCcmFja2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdW5kQnJhY2tldHNPcGVuLS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsYXN0VG9rZW4xID0gdG9rZW5saXN0W2kgLSAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxhc3RUb2tlbjIgPSB0b2tlbmxpc3RbaSAtIDJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdFRva2VuMS50dCA9PSBUb2tlblR5cGUuc3BhY2UgJiYgW1Rva2VuVHlwZS5uZXdsaW5lLCBUb2tlblR5cGUua2V5d29yZEZvciwgVG9rZW5UeXBlLmtleXdvcmRXaGlsZV0uaW5kZXhPZihsYXN0VG9rZW4yLnR0KSA8IDAgJiYgIXRoaXMuaXNCaW5hcnlPcGVyYXRvcihsYXN0VG9rZW4yLnR0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RUb2tlbjEucG9zaXRpb24ubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZVNwYWNlcyhlZGl0cywgbGFzdFRva2VuMS5wb3NpdGlvbi5saW5lLCBsYXN0VG9rZW4xLnBvc2l0aW9uLmNvbHVtbiwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5yaWdodEJyYWNrZXQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcm91bmRCcmFja2V0c09wZW4tLTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5leHRUb2tlbjEgPSB0b2tlbmxpc3RbaSAtIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV4dFRva2VuMiA9IHRva2VubGlzdFtpIC0gMl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0VG9rZW4xLnR0ID09IFRva2VuVHlwZS5zcGFjZSAmJiBuZXh0VG9rZW4yLnR0ICE9IFRva2VuVHlwZS5uZXdsaW5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZVNwYWNlcyhlZGl0cywgbmV4dFRva2VuMS5wb3NpdGlvbi5saW5lLCBuZXh0VG9rZW4xLnBvc2l0aW9uLmNvbHVtbiwgbmV4dFRva2VuMS5wb3NpdGlvbi5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubmV3bGluZTpcclxuICAgICAgICAgICAgICAgICAgICBsYXN0VG9rZW5XYXNOZXdMaW5lID0gMjtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA8IHRva2VubGlzdC5sZW5ndGggLSAyKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV4dE5vblNwYWNlVG9rZW4gPSB0aGlzLmdldE5leHROb25TcGFjZVRva2VuKGksIHRva2VubGlzdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBubyBhZGRpdGlvbmFsIGluZGVudCBhZnRlciBcImNhc2UgMTIgOlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsYXN0VG9rZW5Jc09wZXJhdG9yID0gdGhpcy5pc0JpbmFyeU9wZXJhdG9yKGxhc3ROb25TcGFjZVRva2VuPy50dCkgJiYgbGFzdE5vblNwYWNlVG9rZW4/LnR0ICE9IFRva2VuVHlwZS5jb2xvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5leHRUb2tlbklzT3BlcmF0b3IgPSB0aGlzLmlzQmluYXJ5T3BlcmF0b3IobmV4dE5vblNwYWNlVG9rZW4udHQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJlZ2luTmV4dExpbmUgPSB0b2tlbmxpc3RbaSArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdG9rZW4yID0gdG9rZW5saXN0W2kgKyAyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRJbmRlbnRhdGlvbiA9IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmVnaW5OZXh0TGluZS50dCA9PSBUb2tlblR5cGUubmV3bGluZSB8fCBuZXh0Tm9uU3BhY2VUb2tlbi50dCA9PSBUb2tlblR5cGUuY29tbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkZWx0YTogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJlZ2luTmV4dExpbmUudHQgPT0gVG9rZW5UeXBlLnNwYWNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4yLnR0ID09IFRva2VuVHlwZS5uZXdsaW5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50SW5kZW50YXRpb24gPSBiZWdpbk5leHRMaW5lLnBvc2l0aW9uLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbjIudHQgPT0gVG9rZW5UeXBlLnJpZ2h0Q3VybHlCcmFja2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsdGEgPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJlZ2luTmV4dExpbmUudHQgPT0gVG9rZW5UeXBlLnJpZ2h0Q3VybHlCcmFja2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWx0YSA9IC0xO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW5kZW50TGV2ZWwtLTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGN1cmx5QnJhY2VzT3BlbkF0TGluZXMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsYXN0Tm9uU3BhY2VUb2tlbiA9IGJlZ2luTmV4dExpbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG5leHRUb2tlbklzT3BlcmF0b3IgfHwgbGFzdFRva2VuSXNPcGVyYXRvcikgZGVsdGEgPSAxO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlsID0gaW5kZW50TGV2ZWwgKyBkZWx0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYocm91bmRCcmFja2V0c09wZW4gPiAwKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlsKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlsIDwgMCkgaWwgPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvcnJlY3RJbmRlbnRhdGlvbiA9IGlsICogdGFiU2l6ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb3JyZWN0SW5kZW50YXRpb24gPiBjdXJyZW50SW5kZW50YXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0U3BhY2VzKGVkaXRzLCB0LnBvc2l0aW9uLmxpbmUgKyAxLCAwLCBjb3JyZWN0SW5kZW50YXRpb24gLSBjdXJyZW50SW5kZW50YXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvcnJlY3RJbmRlbnRhdGlvbiA8IGN1cnJlbnRJbmRlbnRhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWxldGVTcGFjZXMoZWRpdHMsIHQucG9zaXRpb24ubGluZSArIDEsIDAsIGN1cnJlbnRJbmRlbnRhdGlvbiAtIGNvcnJlY3RJbmRlbnRhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zcGFjZTpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA8IHRva2VubGlzdC5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXh0VG9rZW4gPSB0b2tlbmxpc3RbaSArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dFRva2VuLnR0ICE9IFRva2VuVHlwZS5jb21tZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdFRva2VuID0gdG9rZW5saXN0W2kgLSAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdFRva2VuLnR0ICE9IFRva2VuVHlwZS5uZXdsaW5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0LnBvc2l0aW9uLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlU3BhY2VzKGVkaXRzLCB0LnBvc2l0aW9uLmxpbmUsIHQucG9zaXRpb24uY29sdW1uLCB0LnBvc2l0aW9uLmxlbmd0aCAtIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZEZvcjpcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRXaGlsZTpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA8IHRva2VubGlzdC5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXh0VG9rZW4gPSB0b2tlbmxpc3RbaSArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dFRva2VuLnR0ID09IFRva2VuVHlwZS5sZWZ0QnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnNlcnRTcGFjZXMoZWRpdHMsIG5leHRUb2tlbi5wb3NpdGlvbi5saW5lLCBuZXh0VG9rZW4ucG9zaXRpb24uY29sdW1uLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmNvbW1hOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2VtaWNvbG9uOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdFRva2VuMSA9IHRva2VubGlzdFtpIC0gMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsYXN0VG9rZW4yID0gdG9rZW5saXN0W2kgLSAyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RUb2tlbjEudHQgIT0gVG9rZW5UeXBlLm5ld2xpbmUgJiYgbGFzdFRva2VuMi50dCAhPSBUb2tlblR5cGUubmV3bGluZSAmJiAhdGhpcy5pc0JpbmFyeU9wZXJhdG9yKGxhc3RUb2tlbjIudHQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdFRva2VuMS50dCA9PSBUb2tlblR5cGUuc3BhY2UgJiYgbGFzdFRva2VuMS5wb3NpdGlvbi5sZW5ndGggPT0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlU3BhY2VzKGVkaXRzLCBsYXN0VG9rZW4xLnBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RUb2tlbjEucG9zaXRpb24uY29sdW1uLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA8IHRva2VubGlzdC5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXh0VG9rZW4gPSB0b2tlbmxpc3RbaSArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dFRva2VuLnR0ICE9IFRva2VuVHlwZS5jb21tZW50ICYmIG5leHRUb2tlbi50dCAhPSBUb2tlblR5cGUuc3BhY2UgJiYgbmV4dFRva2VuLnR0ICE9IFRva2VuVHlwZS5uZXdsaW5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydFNwYWNlcyhlZGl0cywgbmV4dFRva2VuLnBvc2l0aW9uLmxpbmUsIG5leHRUb2tlbi5wb3NpdGlvbi5jb2x1bW4sIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucmlnaHRTcXVhcmVCcmFja2V0OlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsYXN0Tm9uU3BhY2VUb2tlbiAhPSBudWxsICYmIGxhc3ROb25TcGFjZVRva2VuLnR0ID09IFRva2VuVHlwZS5sZWZ0U3F1YXJlQnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlcGxhY2VCZXR3ZWVuKGxhc3ROb25TcGFjZVRva2VuLCB0LCBlZGl0cywgXCJcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGJpbmFyeSBvcGVyYXRvcj9cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNCaW5hcnlPcGVyYXRvcih0LnR0KSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBsb3dlckdlbmVyaWMgPSB0LnR0ID09IFRva2VuVHlwZS5sb3dlciAmJiB0aGlzLmxvd2VyQmVsb25nc1RvR2VuZXJpY0V4cHJlc3Npb24oaSwgdG9rZW5saXN0KTtcclxuICAgICAgICAgICAgICAgIGxldCBncmVhdGVyR2VuZXJpYyA9IHQudHQgPT0gVG9rZW5UeXBlLmdyZWF0ZXIgJiYgdGhpcy5ncmVhdGVyQmVsb25nc1RvR2VuZXJpY0V4cHJlc3Npb24oaSwgdG9rZW5saXN0KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobGFzdFRva2VuV2FzTmV3TGluZSA8PSAwICYmIGxhc3ROb25TcGFjZVRva2VuICE9IG51bGwgJiYgW1Rva2VuVHlwZS5sZWZ0QnJhY2tldCwgVG9rZW5UeXBlLmFzc2lnbm1lbnQsIFRva2VuVHlwZS5jb21tYV0uaW5kZXhPZihsYXN0Tm9uU3BhY2VUb2tlbi50dCkgPCAwKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdG9rZW5CZWZvcmUgPSB0b2tlbmxpc3RbaSAtIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3BhY2VzID0gKGxvd2VyR2VuZXJpYyB8fCBncmVhdGVyR2VuZXJpYykgPyAwIDogMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuQmVmb3JlLnR0ID09IFRva2VuVHlwZS5zcGFjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuQmVmb3JlLnBvc2l0aW9uLmxlbmd0aCAhPSBzcGFjZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydFNwYWNlcyhlZGl0cywgdG9rZW5CZWZvcmUucG9zaXRpb24ubGluZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW5CZWZvcmUucG9zaXRpb24uY29sdW1uLCBzcGFjZXMgLSB0b2tlbkJlZm9yZS5wb3NpdGlvbi5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNwYWNlcyA9PSAxKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0U3BhY2VzKGVkaXRzLCB0LnBvc2l0aW9uLmxpbmUsIHQucG9zaXRpb24uY29sdW1uLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPCB0b2tlbmxpc3QubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV4dFRva2VuID0gdG9rZW5saXN0W2kgKyAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNwYWNlcyA9IChsb3dlckdlbmVyaWMpID8gMCA6IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0VG9rZW4udHQgPT0gVG9rZW5UeXBlLnNwYWNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ3JlYXRlckdlbmVyaWMgJiYgaSA8IHRva2VubGlzdC5sZW5ndGggLSAyICYmIHRva2VubGlzdFtpICsgMl0udHQgPT0gVG9rZW5UeXBlLmxlZnRCcmFja2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhY2VzID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0VG9rZW4ucG9zaXRpb24ubGVuZ3RoICE9IHNwYWNlcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0U3BhY2VzKGVkaXRzLCBuZXh0VG9rZW4ucG9zaXRpb24ubGluZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFRva2VuLnBvc2l0aW9uLmNvbHVtbiwgc3BhY2VzIC0gbmV4dFRva2VuLnBvc2l0aW9uLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ3JlYXRlckdlbmVyaWMgJiYgbmV4dFRva2VuLnR0ID09IFRva2VuVHlwZS5sZWZ0QnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYWNlcyA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3BhY2VzID09IDEpIHRoaXMuaW5zZXJ0U3BhY2VzKGVkaXRzLCBuZXh0VG9rZW4ucG9zaXRpb24ubGluZSwgbmV4dFRva2VuLnBvc2l0aW9uLmNvbHVtbiwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodC50dCAhPSBUb2tlblR5cGUuc3BhY2UgJiYgdC50dCAhPSBUb2tlblR5cGUubmV3bGluZSkge1xyXG4gICAgICAgICAgICAgICAgbGFzdE5vblNwYWNlVG9rZW4gPSB0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kZWxldGVPdmVybGFwcGluZ1JhbmdlcyhlZGl0cyk7XHJcblxyXG4gICAgICAgIHJldHVybiBlZGl0cztcclxuXHJcbiAgICB9XHJcbiAgICBnZXROZXh0Tm9uU3BhY2VUb2tlbihjdXJyZW50SW5kZXg6IG51bWJlciwgdG9rZW5saXN0OiBUb2tlbkxpc3QpOiAgVG9rZW4ge1xyXG5cclxuICAgICAgICBpZihjdXJyZW50SW5kZXggPT0gdG9rZW5saXN0Lmxlbmd0aCAtIDEpIHJldHVybiB0b2tlbmxpc3RbY3VycmVudEluZGV4XTtcclxuXHJcbiAgICAgICAgbGV0IGogPSBjdXJyZW50SW5kZXggKyAxO1xyXG4gICAgICAgIHdoaWxlKGogPCB0b2tlbmxpc3QubGVuZ3RoIC0gMSAmJiAodG9rZW5saXN0W2pdLnR0ID09IFRva2VuVHlwZS5zcGFjZSB8fCB0b2tlbmxpc3Rbal0udHQgPT0gVG9rZW5UeXBlLnJldHVybikpe1xyXG4gICAgICAgICAgICBqKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0b2tlbmxpc3Rbal07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGxvd2VyQmVsb25nc1RvR2VuZXJpY0V4cHJlc3Npb24ocG9zaXRpb246IG51bWJlciwgdG9rZW5saXN0OiBUb2tlbkxpc3QpIHtcclxuICAgICAgICBsZXQgaSA9IHBvc2l0aW9uICsgMTtcclxuICAgICAgICB3aGlsZSAoaSA8IHRva2VubGlzdC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgbGV0IHR0ID0gdG9rZW5saXN0W2ldLnR0O1xyXG4gICAgICAgICAgICBpZiAodHQgPT0gVG9rZW5UeXBlLmdyZWF0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChbVG9rZW5UeXBlLnNwYWNlLCBUb2tlblR5cGUuY29tbWEsIFRva2VuVHlwZS5pZGVudGlmaWVyXS5pbmRleE9mKHR0KSA8IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBncmVhdGVyQmVsb25nc1RvR2VuZXJpY0V4cHJlc3Npb24ocG9zaXRpb246IG51bWJlciwgdG9rZW5saXN0OiBUb2tlbkxpc3QpIHtcclxuICAgICAgICBsZXQgaSA9IHBvc2l0aW9uIC0gMTtcclxuICAgICAgICB3aGlsZSAoaSA+PSAwKSB7XHJcbiAgICAgICAgICAgIGxldCB0dCA9IHRva2VubGlzdFtpXS50dDtcclxuICAgICAgICAgICAgaWYgKHR0ID09IFRva2VuVHlwZS5sb3dlcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKFtUb2tlblR5cGUuc3BhY2UsIFRva2VuVHlwZS5jb21tYSwgVG9rZW5UeXBlLmlkZW50aWZpZXJdLmluZGV4T2YodHQpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGktLTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGlzQmluYXJ5T3BlcmF0b3IodG9rZW46IFRva2VuVHlwZSkge1xyXG4gICAgICAgIHJldHVybiB0b2tlbiAhPSBudWxsICYmIHRva2VuID49IFRva2VuVHlwZS5tb2R1bG8gJiYgdG9rZW4gPD0gVG9rZW5UeXBlLmNvbG9uO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVwbGFjZUJldHdlZW4obGFzdE5vblNwYWNlVG9rZW46IFRva2VuLCB0OiBUb2tlbiwgZWRpdHM6IG1vbmFjby5sYW5ndWFnZXMuVGV4dEVkaXRbXSwgdGV4dDogc3RyaW5nKSB7XHJcbiAgICAgICAgbGV0IHBvc2l0aW9uRnJvbSA9IHtcclxuICAgICAgICAgICAgbGluZTogbGFzdE5vblNwYWNlVG9rZW4ucG9zaXRpb24ubGluZSxcclxuICAgICAgICAgICAgY29sdW1uOiBsYXN0Tm9uU3BhY2VUb2tlbi5wb3NpdGlvbi5jb2x1bW4gKyBsYXN0Tm9uU3BhY2VUb2tlbi5wb3NpdGlvbi5sZW5ndGhcclxuICAgICAgICB9O1xyXG4gICAgICAgIGxldCBwb3NpdGlvblRvID0ge1xyXG4gICAgICAgICAgICBsaW5lOiB0LnBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgIGNvbHVtbjogdC5wb3NpdGlvbi5jb2x1bW5cclxuICAgICAgICB9O1xyXG4gICAgICAgIGlmIChwb3NpdGlvbkZyb20ubGluZSAhPSBwb3NpdGlvblRvLmxpbmUgfHxcclxuICAgICAgICAgICAgcG9zaXRpb25Uby5jb2x1bW4gLSBwb3NpdGlvbkZyb20uY29sdW1uICE9IHRleHQubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVwbGFjZShlZGl0cywgcG9zaXRpb25Gcm9tLCBwb3NpdGlvblRvLCB0ZXh0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZGVsZXRlU3BhY2VzKGVkaXRzOiBtb25hY28ubGFuZ3VhZ2VzLlRleHRFZGl0W10sIGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIsIG51bWJlck9mU3BhY2VzOiBudW1iZXIpIHtcclxuICAgICAgICBlZGl0cy5wdXNoKHtcclxuICAgICAgICAgICAgcmFuZ2U6IHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0Q29sdW1uOiBjb2x1bW4sXHJcbiAgICAgICAgICAgICAgICBzdGFydExpbmVOdW1iZXI6IGxpbmUsXHJcbiAgICAgICAgICAgICAgICBlbmRDb2x1bW46IGNvbHVtbiArIG51bWJlck9mU3BhY2VzICsgKGNvbHVtbiA9PSAwID8gMSA6IDApLFxyXG4gICAgICAgICAgICAgICAgZW5kTGluZU51bWJlcjogbGluZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0ZXh0OiBcIlwiXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5zZXJ0U3BhY2VzKGVkaXRzOiBtb25hY28ubGFuZ3VhZ2VzLlRleHRFZGl0W10sIGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIsIG51bWJlck9mU3BhY2VzOiBudW1iZXIpIHtcclxuXHJcbiAgICAgICAgaWYgKG51bWJlck9mU3BhY2VzIDwgMCkge1xyXG4gICAgICAgICAgICB0aGlzLmRlbGV0ZVNwYWNlcyhlZGl0cywgbGluZSwgY29sdW1uLCAtbnVtYmVyT2ZTcGFjZXMpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlZGl0cy5wdXNoKHtcclxuICAgICAgICAgICAgcmFuZ2U6IHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0Q29sdW1uOiBjb2x1bW4sXHJcbiAgICAgICAgICAgICAgICBzdGFydExpbmVOdW1iZXI6IGxpbmUsXHJcbiAgICAgICAgICAgICAgICBlbmRDb2x1bW46IGNvbHVtbixcclxuICAgICAgICAgICAgICAgIGVuZExpbmVOdW1iZXI6IGxpbmVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGV4dDogXCIgXCIucmVwZWF0KG51bWJlck9mU3BhY2VzKVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJlcGxhY2UoZWRpdHM6IG1vbmFjby5sYW5ndWFnZXMuVGV4dEVkaXRbXSwgcG9zaXRpb25Gcm9tOiB7IGxpbmU6IG51bWJlcjsgY29sdW1uOiBudW1iZXI7IH0sIHBvc2l0aW9uVG86IHsgbGluZTogbnVtYmVyOyBjb2x1bW46IG51bWJlcjsgfSwgdGV4dDogc3RyaW5nKSB7XHJcblxyXG4gICAgICAgIGVkaXRzLnB1c2goe1xyXG4gICAgICAgICAgICByYW5nZToge1xyXG4gICAgICAgICAgICAgICAgc3RhcnRDb2x1bW46IHBvc2l0aW9uRnJvbS5jb2x1bW4sXHJcbiAgICAgICAgICAgICAgICBzdGFydExpbmVOdW1iZXI6IHBvc2l0aW9uRnJvbS5saW5lLFxyXG4gICAgICAgICAgICAgICAgZW5kQ29sdW1uOiBwb3NpdGlvblRvLmNvbHVtbixcclxuICAgICAgICAgICAgICAgIGVuZExpbmVOdW1iZXI6IHBvc2l0aW9uVG8ubGluZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0ZXh0OiB0ZXh0XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG59Il19