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
                        if (lastToken1.tt == TokenType.space && [TokenType.newline, TokenType.keywordFor].indexOf(lastToken2.tt) < 0 && !this.isBinaryOperator(lastToken2.tt)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRm9ybWF0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9Gb3JtYXR0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBb0IsU0FBUyxFQUFxQixNQUFNLCtCQUErQixDQUFDO0FBRS9GLE1BQU0sT0FBTyxTQUFTO0lBUWxCO0lBQ0kscUJBQXFCOztRQU56QixnQ0FBMkIsR0FBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9DLGdCQUFXLEdBQVksaUJBQWlCLENBQUM7SUFPekMsQ0FBQztJQUVELElBQUk7UUFDQSxNQUFNLENBQUMsU0FBUyxDQUFDLHNDQUFzQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RSxNQUFNLENBQUMsU0FBUyxDQUFDLG9DQUFvQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQsNEJBQTRCLENBQUMsS0FBK0IsRUFBRSxRQUF5QixFQUFFLEVBQVUsRUFBRSxPQUEyQyxFQUFFLEtBQStCO1FBRTdLLElBQUksS0FBSyxHQUFnQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTVELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FDbEIsS0FBSyxDQUNSLENBQUM7SUFFTixDQUFDO0lBQ0QsdUJBQXVCLENBQUMsS0FBa0M7UUFDdEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxDQUFD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QjtZQUNELElBQUksRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQztTQUNuQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsT0FBTyxDQUFDLEtBQWtDLEVBQUUsWUFBK0MsRUFBRSxVQUE2QyxFQUFFLElBQVk7UUFFcEosS0FBSyxDQUFDLElBQUksQ0FBQztZQUNQLEtBQUssRUFBRTtnQkFDSCxXQUFXLEVBQUUsWUFBWSxDQUFDLE1BQU07Z0JBQ2hDLGVBQWUsRUFBRSxZQUFZLENBQUMsSUFBSTtnQkFDbEMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxNQUFNO2dCQUM1QixhQUFhLEVBQUUsVUFBVSxDQUFDLElBQUk7YUFDakM7WUFDRCxJQUFJLEVBQUUsSUFBSTtTQUNiLENBQUMsQ0FBQztJQUVQLENBQUM7Q0FPSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExleGVyIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL2xleGVyL0xleGVyLmpzXCI7XHJcbmltcG9ydCB7IFRva2VuLCBUb2tlbkxpc3QsIFRva2VuVHlwZSwgdG9rZW5MaXN0VG9TdHJpbmcgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvbGV4ZXIvVG9rZW4uanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBGb3JtYXR0ZXIgaW1wbGVtZW50cyBtb25hY28ubGFuZ3VhZ2VzLkRvY3VtZW50Rm9ybWF0dGluZ0VkaXRQcm92aWRlcixcclxuICAgIG1vbmFjby5sYW5ndWFnZXMuT25UeXBlRm9ybWF0dGluZ0VkaXRQcm92aWRlciB7XHJcblxyXG4gICAgYXV0b0Zvcm1hdFRyaWdnZXJDaGFyYWN0ZXJzOiBzdHJpbmdbXSA9IFsnXFxuJ107XHJcblxyXG4gICAgZGlzcGxheU5hbWU/OiBzdHJpbmcgPSBcIkphdmEtQXV0b2Zvcm1hdFwiO1xyXG5cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAvLyBwcml2YXRlIG1haW46IE1haW5cclxuICAgICkge1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpbml0KCkge1xyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJEb2N1bWVudEZvcm1hdHRpbmdFZGl0UHJvdmlkZXIoJ215SmF2YScsIHRoaXMpO1xyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJPblR5cGVGb3JtYXR0aW5nRWRpdFByb3ZpZGVyKCdteUphdmEnLCB0aGlzKTtcclxuICAgIH1cclxuXHJcbiAgICBwcm92aWRlT25UeXBlRm9ybWF0dGluZ0VkaXRzKG1vZGVsOiBtb25hY28uZWRpdG9yLklUZXh0TW9kZWwsIHBvc2l0aW9uOiBtb25hY28uUG9zaXRpb24sIGNoOiBzdHJpbmcsIG9wdGlvbnM6IG1vbmFjby5sYW5ndWFnZXMuRm9ybWF0dGluZ09wdGlvbnMsIHRva2VuOiBtb25hY28uQ2FuY2VsbGF0aW9uVG9rZW4pOiBtb25hY28ubGFuZ3VhZ2VzLlByb3ZpZGVyUmVzdWx0PG1vbmFjby5sYW5ndWFnZXMuVGV4dEVkaXRbXT4ge1xyXG5cclxuICAgICAgICBsZXQgZWRpdHM6IG1vbmFjby5sYW5ndWFnZXMuVGV4dEVkaXRbXSA9IHRoaXMuZm9ybWF0KG1vZGVsKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShcclxuICAgICAgICAgICAgZWRpdHNcclxuICAgICAgICApO1xyXG5cclxuICAgIH1cclxuICAgIGRlbGV0ZU92ZXJsYXBwaW5nUmFuZ2VzKGVkaXRzOiBtb25hY28ubGFuZ3VhZ2VzLlRleHRFZGl0W10pIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVkaXRzLmxlbmd0aCAtIDE7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgZSA9IGVkaXRzW2ldO1xyXG4gICAgICAgICAgICBsZXQgZTEgPSBlZGl0c1tpICsgMV07XHJcbiAgICAgICAgICAgIGlmIChlLnJhbmdlLmVuZExpbmVOdW1iZXIgPCBlMS5yYW5nZS5zdGFydExpbmVOdW1iZXIpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAoZS5yYW5nZS5lbmRMaW5lTnVtYmVyID09IGUxLnJhbmdlLnN0YXJ0TGluZU51bWJlcikge1xyXG4gICAgICAgICAgICAgICAgaWYgKGUucmFuZ2UuZW5kQ29sdW1uID49IGUxLnJhbmdlLnN0YXJ0Q29sdW1uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWRpdHMuc3BsaWNlKGkgKyAxLCAxKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUucmFuZ2UuZW5kQ29sdW1uID09IDAgJiYgZS50ZXh0Lmxlbmd0aCA+IDAgJiYgZTEucmFuZ2Uuc3RhcnRDb2x1bW4gPT0gMSAmJiBlMS5yYW5nZS5lbmRDb2x1bW4gPiBlMS5yYW5nZS5zdGFydENvbHVtbiAmJiBlMS50ZXh0ID09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRlbHRhID0gZS50ZXh0Lmxlbmd0aCAtIChlMS5yYW5nZS5lbmRDb2x1bW4gLSBlMS5yYW5nZS5zdGFydENvbHVtbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZWx0YSA+IDApIHsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnRleHQgPSBlLnRleHQuc3Vic3RyKDAsIGRlbHRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRzLnNwbGljZShpKzEsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGRlbHRhIDwgMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZTEucmFuZ2UuZW5kQ29sdW1uID0gZTEucmFuZ2Uuc3RhcnRDb2x1bW4gLSBkZWx0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRzLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGktLTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdHMuc3BsaWNlKGksIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaS0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwcm92aWRlRG9jdW1lbnRGb3JtYXR0aW5nRWRpdHMobW9kZWw6IG1vbmFjby5lZGl0b3IuSVRleHRNb2RlbCxcclxuICAgICAgICBvcHRpb25zOiBtb25hY28ubGFuZ3VhZ2VzLkZvcm1hdHRpbmdPcHRpb25zLFxyXG4gICAgICAgIHRva2VuOiBtb25hY28uQ2FuY2VsbGF0aW9uVG9rZW4pOiBtb25hY28ubGFuZ3VhZ2VzLlByb3ZpZGVyUmVzdWx0PG1vbmFjby5sYW5ndWFnZXMuVGV4dEVkaXRbXT4ge1xyXG5cclxuICAgICAgICBsZXQgZWRpdHM6IG1vbmFjby5sYW5ndWFnZXMuVGV4dEVkaXRbXSA9IHRoaXMuZm9ybWF0KG1vZGVsKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShcclxuICAgICAgICAgICAgZWRpdHNcclxuICAgICAgICApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBmb3JtYXQobW9kZWw6IG1vbmFjby5lZGl0b3IuSVRleHRNb2RlbCk6IG1vbmFjby5sYW5ndWFnZXMuVGV4dEVkaXRbXSB7XHJcblxyXG4gICAgICAgIGxldCBlZGl0czogbW9uYWNvLmxhbmd1YWdlcy5UZXh0RWRpdFtdID0gW107XHJcblxyXG4gICAgICAgIC8vIGlmICh0aGlzLm1haW4uY3VycmVudFdvcmtzcGFjZSA9PSBudWxsIHx8IHRoaXMubWFpbi5jdXJyZW50V29ya3NwYWNlLmN1cnJlbnRseU9wZW5Nb2R1bGUgPT0gbnVsbCkge1xyXG4gICAgICAgIC8vICAgICByZXR1cm4gW107XHJcbiAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAvLyBsZXQgdGV4dCA9IHRoaXMubWFpbi5tb25hY29fZWRpdG9yLmdldFZhbHVlKHsgcHJlc2VydmVCT006IGZhbHNlLCBsaW5lRW5kaW5nOiBcIlxcblwiIH0pO1xyXG5cclxuICAgICAgICBsZXQgdGV4dCA9IG1vZGVsLmdldFZhbHVlKG1vbmFjby5lZGl0b3IuRW5kT2ZMaW5lUHJlZmVyZW5jZS5MRik7XHJcblxyXG4gICAgICAgIGxldCB0b2tlbmxpc3QgPSBuZXcgTGV4ZXIoKS5sZXgodGV4dCkudG9rZW5zO1xyXG5cclxuICAgICAgICAvLyBsZXQgdG9rZW5saXN0ID0gdGhpcy5tYWluLmN1cnJlbnRXb3Jrc3BhY2UuY3VycmVudGx5T3Blbk1vZHVsZS50b2tlbkxpc3Q7XHJcblxyXG4gICAgICAgIGlmICh0b2tlbmxpc3QgPT0gbnVsbCkgcmV0dXJuIFtdO1xyXG5cclxuICAgICAgICAvLyBUT0RPOlxyXG4gICAgICAgIC8vIHsgYXQgdGhlIGVuZCBvZiBsaW5lLCB3aXRoIG9uZSBzcGFjZSBiZWZvcmU7IGZvbGxvd2VkIG9ubHkgYnkgc3BhY2VzIGFuZCBcXG5cclxuICAgICAgICAvLyBpbmRlbnQgbGluZXMgYWNjb3JkaW5nIHRvIHsgYW5kIH1cclxuICAgICAgICAvLyBCZXdhcmU6IGludCBpW10gPSB7IC4uLiB9XHJcbiAgICAgICAgLy8gZXhhY3RseSBvbmUgc3BhY2UgYmVmb3JlL2FmdGVyIGJpbmFyeSBvcGVyYXRvcnNcclxuICAgICAgICAvLyBubyBzcGFjZSBhZnRlciAoIGFuZCBubyBzcGFjZSBiZWZvcmUgKVxyXG4gICAgICAgIC8vICggICApIC0+ICgpXHJcbiAgICAgICAgLy8gKCAgKCkpIC0+ICgoKSlcclxuICAgICAgICAvLyAoKCkgICkgLT4gKCgpKVxyXG5cclxuICAgICAgICBsZXQgbGFzdE5vblNwYWNlVG9rZW46IFRva2VuID0gbnVsbDtcclxuICAgICAgICBsZXQgaW5kZW50TGV2ZWwgPSAwO1xyXG4gICAgICAgIGxldCB0YWJTaXplID0gMztcclxuICAgICAgICBsZXQgY3VybHlCcmFjZXNPcGVuQXRMaW5lczogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBsZXQgaW5kZW50TGV2ZWxBdFN3aXRjaFN0YXRlbWVudHM6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgbGV0IHN3aXRjaEhhcHBlbmQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgbGFzdFRva2VuV2FzTmV3TGluZTogbnVtYmVyID0gMDtcclxuICAgICAgICBsZXQgcm91bmRCcmFja2V0c09wZW46IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5saXN0Lmxlbmd0aDsgaSsrKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgdCA9IHRva2VubGlzdFtpXTtcclxuICAgICAgICAgICAgbGFzdFRva2VuV2FzTmV3TGluZS0tO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0LnR0KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZFN3aXRjaDpcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2hIYXBwZW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRDYXNlOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUua2V5d29yZERlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gb3V0ZGVudDogbGluZSB3aXRoIGNhc2U6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQucG9zaXRpb24uY29sdW1uID4gMykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZVNwYWNlcyhlZGl0cywgdC5wb3NpdGlvbi5saW5lLCAxLCAzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5sZWZ0Q3VybHlCcmFja2V0OlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzd2l0Y2hIYXBwZW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaEhhcHBlbmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZW50TGV2ZWxBdFN3aXRjaFN0YXRlbWVudHMucHVzaChpbmRlbnRMZXZlbCArIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRlbnRMZXZlbCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpbmRlbnRMZXZlbCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cmx5QnJhY2VzT3BlbkF0TGluZXMucHVzaCh0LnBvc2l0aW9uLmxpbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsYXN0Tm9uU3BhY2VUb2tlbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0dCA9IGxhc3ROb25TcGFjZVRva2VuLnR0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHQgPT0gVG9rZW5UeXBlLnJpZ2h0QnJhY2tldCB8fCB0dCA9PSBUb2tlblR5cGUuaWRlbnRpZmllciB8fCB0dCA9PSBUb2tlblR5cGUubGVmdFJpZ2h0U3F1YXJlQnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobGFzdE5vblNwYWNlVG9rZW4ucG9zaXRpb24ubGluZSA9PSB0LnBvc2l0aW9uLmxpbmUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVwbGFjZUJldHdlZW4obGFzdE5vblNwYWNlVG9rZW4sIHQsIGVkaXRzLCBcIiBcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPCB0b2tlbmxpc3QubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdG9rZW4xID0gdG9rZW5saXN0W2kgKyAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuMS50dCAhPSBUb2tlblR5cGUubmV3bGluZSAmJiB0b2tlbjEudHQgIT0gVG9rZW5UeXBlLnNwYWNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydFNwYWNlcyhlZGl0cywgdG9rZW4xLnBvc2l0aW9uLmxpbmUsIHRva2VuMS5wb3NpdGlvbi5jb2x1bW4sIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucmlnaHRDdXJseUJyYWNrZXQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGVudExldmVsQXRTd2l0Y2hTdGF0ZW1lbnRzW2luZGVudExldmVsQXRTd2l0Y2hTdGF0ZW1lbnRzLmxlbmd0aCAtIDFdID09IGluZGVudExldmVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGVudExldmVsQXRTd2l0Y2hTdGF0ZW1lbnRzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRlbnRMZXZlbC0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZih0LnBvc2l0aW9uLmNvbHVtbiA+PSAzKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWxldGVTcGFjZXMoZWRpdHMsIHQucG9zaXRpb24ubGluZSwgMSwgMyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0gICAgXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGluZGVudExldmVsLS07XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9wZW5lZEF0TGluZSA9IGN1cmx5QnJhY2VzT3BlbkF0TGluZXMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wZW5lZEF0TGluZSAhPSBudWxsICYmIG9wZW5lZEF0TGluZSAhPSB0LnBvc2l0aW9uLmxpbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3ROb25TcGFjZVRva2VuICE9IG51bGwgJiYgbGFzdE5vblNwYWNlVG9rZW4ucG9zaXRpb24ubGluZSA9PSB0LnBvc2l0aW9uLmxpbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVwbGFjZShlZGl0cywgdC5wb3NpdGlvbiwgdC5wb3NpdGlvbiwgXCJcXG5cIiArIFwiIFwiLnJlcGVhdChpbmRlbnRMZXZlbCAqIHRhYlNpemUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRva2VuMSA9IHRva2VubGlzdFtpIC0gMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4xLnR0ICE9IFRva2VuVHlwZS5zcGFjZSAmJiB0b2tlbjEudHQgIT0gVG9rZW5UeXBlLm5ld2xpbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydFNwYWNlcyhlZGl0cywgdC5wb3NpdGlvbi5saW5lLCB0LnBvc2l0aW9uLmNvbHVtbiwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5sZWZ0QnJhY2tldDpcclxuICAgICAgICAgICAgICAgICAgICByb3VuZEJyYWNrZXRzT3BlbisrO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpIDwgdG9rZW5saXN0Lmxlbmd0aCAtIDIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5leHRUb2tlbjEgPSB0b2tlbmxpc3RbaSArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV4dFRva2VuMiA9IHRva2VubGlzdFtpICsgMl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0VG9rZW4xLnR0ID09IFRva2VuVHlwZS5zcGFjZSAmJiBuZXh0VG9rZW4yLnR0ICE9IFRva2VuVHlwZS5uZXdsaW5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZVNwYWNlcyhlZGl0cywgbmV4dFRva2VuMS5wb3NpdGlvbi5saW5lLCBuZXh0VG9rZW4xLnBvc2l0aW9uLmNvbHVtbiwgbmV4dFRva2VuMS5wb3NpdGlvbi5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRUb2tlbjIudHQgPT0gVG9rZW5UeXBlLnJpZ2h0QnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3VuZEJyYWNrZXRzT3Blbi0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdFRva2VuMSA9IHRva2VubGlzdFtpIC0gMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsYXN0VG9rZW4yID0gdG9rZW5saXN0W2kgLSAyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RUb2tlbjEudHQgPT0gVG9rZW5UeXBlLnNwYWNlICYmIFtUb2tlblR5cGUubmV3bGluZSwgVG9rZW5UeXBlLmtleXdvcmRGb3JdLmluZGV4T2YobGFzdFRva2VuMi50dCkgPCAwICYmICF0aGlzLmlzQmluYXJ5T3BlcmF0b3IobGFzdFRva2VuMi50dCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsYXN0VG9rZW4xLnBvc2l0aW9uLmxlbmd0aCA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWxldGVTcGFjZXMoZWRpdHMsIGxhc3RUb2tlbjEucG9zaXRpb24ubGluZSwgbGFzdFRva2VuMS5wb3NpdGlvbi5jb2x1bW4sIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucmlnaHRCcmFja2V0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJvdW5kQnJhY2tldHNPcGVuLS07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXh0VG9rZW4xID0gdG9rZW5saXN0W2kgLSAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5leHRUb2tlbjIgPSB0b2tlbmxpc3RbaSAtIDJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dFRva2VuMS50dCA9PSBUb2tlblR5cGUuc3BhY2UgJiYgbmV4dFRva2VuMi50dCAhPSBUb2tlblR5cGUubmV3bGluZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWxldGVTcGFjZXMoZWRpdHMsIG5leHRUb2tlbjEucG9zaXRpb24ubGluZSwgbmV4dFRva2VuMS5wb3NpdGlvbi5jb2x1bW4sIG5leHRUb2tlbjEucG9zaXRpb24ubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5ld2xpbmU6XHJcbiAgICAgICAgICAgICAgICAgICAgbGFzdFRva2VuV2FzTmV3TGluZSA9IDI7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPCB0b2tlbmxpc3QubGVuZ3RoIC0gMikge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5leHROb25TcGFjZVRva2VuID0gdGhpcy5nZXROZXh0Tm9uU3BhY2VUb2tlbihpLCB0b2tlbmxpc3QpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm8gYWRkaXRpb25hbCBpbmRlbnQgYWZ0ZXIgXCJjYXNlIDEyIDpcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdFRva2VuSXNPcGVyYXRvciA9IHRoaXMuaXNCaW5hcnlPcGVyYXRvcihsYXN0Tm9uU3BhY2VUb2tlbj8udHQpICYmIGxhc3ROb25TcGFjZVRva2VuPy50dCAhPSBUb2tlblR5cGUuY29sb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXh0VG9rZW5Jc09wZXJhdG9yID0gdGhpcy5pc0JpbmFyeU9wZXJhdG9yKG5leHROb25TcGFjZVRva2VuLnR0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBiZWdpbk5leHRMaW5lID0gdG9rZW5saXN0W2kgKyAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRva2VuMiA9IHRva2VubGlzdFtpICsgMl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50SW5kZW50YXRpb24gPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJlZ2luTmV4dExpbmUudHQgPT0gVG9rZW5UeXBlLm5ld2xpbmUgfHwgbmV4dE5vblNwYWNlVG9rZW4udHQgPT0gVG9rZW5UeXBlLmNvbW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGVsdGE6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiZWdpbk5leHRMaW5lLnR0ID09IFRva2VuVHlwZS5zcGFjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuMi50dCA9PSBUb2tlblR5cGUubmV3bGluZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudEluZGVudGF0aW9uID0gYmVnaW5OZXh0TGluZS5wb3NpdGlvbi5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4yLnR0ID09IFRva2VuVHlwZS5yaWdodEN1cmx5QnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbHRhID0gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiZWdpbk5leHRMaW5lLnR0ID09IFRva2VuVHlwZS5yaWdodEN1cmx5QnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsdGEgPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluZGVudExldmVsLS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjdXJseUJyYWNlc09wZW5BdExpbmVzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGFzdE5vblNwYWNlVG9rZW4gPSBiZWdpbk5leHRMaW5lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaSsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuZXh0VG9rZW5Jc09wZXJhdG9yIHx8IGxhc3RUb2tlbklzT3BlcmF0b3IpIGRlbHRhID0gMTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbCA9IGluZGVudExldmVsICsgZGVsdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJvdW5kQnJhY2tldHNPcGVuID4gMCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbCA8IDApIGlsID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3JyZWN0SW5kZW50YXRpb24gPSBpbCAqIHRhYlNpemU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29ycmVjdEluZGVudGF0aW9uID4gY3VycmVudEluZGVudGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydFNwYWNlcyhlZGl0cywgdC5wb3NpdGlvbi5saW5lICsgMSwgMCwgY29ycmVjdEluZGVudGF0aW9uIC0gY3VycmVudEluZGVudGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb3JyZWN0SW5kZW50YXRpb24gPCBjdXJyZW50SW5kZW50YXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlU3BhY2VzKGVkaXRzLCB0LnBvc2l0aW9uLmxpbmUgKyAxLCAwLCBjdXJyZW50SW5kZW50YXRpb24gLSBjb3JyZWN0SW5kZW50YXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc3BhY2U6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPCB0b2tlbmxpc3QubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV4dFRva2VuID0gdG9rZW5saXN0W2kgKyAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRUb2tlbi50dCAhPSBUb2tlblR5cGUuY29tbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxhc3RUb2tlbiA9IHRva2VubGlzdFtpIC0gMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RUb2tlbi50dCAhPSBUb2tlblR5cGUubmV3bGluZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodC5wb3NpdGlvbi5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZVNwYWNlcyhlZGl0cywgdC5wb3NpdGlvbi5saW5lLCB0LnBvc2l0aW9uLmNvbHVtbiwgdC5wb3NpdGlvbi5sZW5ndGggLSAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRGb3I6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkV2hpbGU6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPCB0b2tlbmxpc3QubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV4dFRva2VuID0gdG9rZW5saXN0W2kgKyAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRUb2tlbi50dCA9PSBUb2tlblR5cGUubGVmdEJyYWNrZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0U3BhY2VzKGVkaXRzLCBuZXh0VG9rZW4ucG9zaXRpb24ubGluZSwgbmV4dFRva2VuLnBvc2l0aW9uLmNvbHVtbiwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jb21tYTpcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnNlbWljb2xvbjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxhc3RUb2tlbjEgPSB0b2tlbmxpc3RbaSAtIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdFRva2VuMiA9IHRva2VubGlzdFtpIC0gMl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsYXN0VG9rZW4xLnR0ICE9IFRva2VuVHlwZS5uZXdsaW5lICYmIGxhc3RUb2tlbjIudHQgIT0gVG9rZW5UeXBlLm5ld2xpbmUgJiYgIXRoaXMuaXNCaW5hcnlPcGVyYXRvcihsYXN0VG9rZW4yLnR0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RUb2tlbjEudHQgPT0gVG9rZW5UeXBlLnNwYWNlICYmIGxhc3RUb2tlbjEucG9zaXRpb24ubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZVNwYWNlcyhlZGl0cywgbGFzdFRva2VuMS5wb3NpdGlvbi5saW5lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0VG9rZW4xLnBvc2l0aW9uLmNvbHVtbiwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPCB0b2tlbmxpc3QubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV4dFRva2VuID0gdG9rZW5saXN0W2kgKyAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRUb2tlbi50dCAhPSBUb2tlblR5cGUuY29tbWVudCAmJiBuZXh0VG9rZW4udHQgIT0gVG9rZW5UeXBlLnNwYWNlICYmIG5leHRUb2tlbi50dCAhPSBUb2tlblR5cGUubmV3bGluZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnNlcnRTcGFjZXMoZWRpdHMsIG5leHRUb2tlbi5wb3NpdGlvbi5saW5lLCBuZXh0VG9rZW4ucG9zaXRpb24uY29sdW1uLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnJpZ2h0U3F1YXJlQnJhY2tldDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAobGFzdE5vblNwYWNlVG9rZW4gIT0gbnVsbCAmJiBsYXN0Tm9uU3BhY2VUb2tlbi50dCA9PSBUb2tlblR5cGUubGVmdFNxdWFyZUJyYWNrZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXBsYWNlQmV0d2VlbihsYXN0Tm9uU3BhY2VUb2tlbiwgdCwgZWRpdHMsIFwiXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBiaW5hcnkgb3BlcmF0b3I/XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQmluYXJ5T3BlcmF0b3IodC50dCkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbG93ZXJHZW5lcmljID0gdC50dCA9PSBUb2tlblR5cGUubG93ZXIgJiYgdGhpcy5sb3dlckJlbG9uZ3NUb0dlbmVyaWNFeHByZXNzaW9uKGksIHRva2VubGlzdCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgZ3JlYXRlckdlbmVyaWMgPSB0LnR0ID09IFRva2VuVHlwZS5ncmVhdGVyICYmIHRoaXMuZ3JlYXRlckJlbG9uZ3NUb0dlbmVyaWNFeHByZXNzaW9uKGksIHRva2VubGlzdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGxhc3RUb2tlbldhc05ld0xpbmUgPD0gMCAmJiBsYXN0Tm9uU3BhY2VUb2tlbiAhPSBudWxsICYmIFtUb2tlblR5cGUubGVmdEJyYWNrZXQsIFRva2VuVHlwZS5hc3NpZ25tZW50LCBUb2tlblR5cGUuY29tbWFdLmluZGV4T2YobGFzdE5vblNwYWNlVG9rZW4udHQpIDwgMCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRva2VuQmVmb3JlID0gdG9rZW5saXN0W2kgLSAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNwYWNlcyA9IChsb3dlckdlbmVyaWMgfHwgZ3JlYXRlckdlbmVyaWMpID8gMCA6IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbkJlZm9yZS50dCA9PSBUb2tlblR5cGUuc3BhY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbkJlZm9yZS5wb3NpdGlvbi5sZW5ndGggIT0gc3BhY2VzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnNlcnRTcGFjZXMoZWRpdHMsIHRva2VuQmVmb3JlLnBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuQmVmb3JlLnBvc2l0aW9uLmNvbHVtbiwgc3BhY2VzIC0gdG9rZW5CZWZvcmUucG9zaXRpb24ubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcGFjZXMgPT0gMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydFNwYWNlcyhlZGl0cywgdC5wb3NpdGlvbi5saW5lLCB0LnBvc2l0aW9uLmNvbHVtbiwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpIDwgdG9rZW5saXN0Lmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5leHRUb2tlbiA9IHRva2VubGlzdFtpICsgMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzcGFjZXMgPSAobG93ZXJHZW5lcmljKSA/IDAgOiAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dFRva2VuLnR0ID09IFRva2VuVHlwZS5zcGFjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdyZWF0ZXJHZW5lcmljICYmIGkgPCB0b2tlbmxpc3QubGVuZ3RoIC0gMiAmJiB0b2tlbmxpc3RbaSArIDJdLnR0ID09IFRva2VuVHlwZS5sZWZ0QnJhY2tldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYWNlcyA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dFRva2VuLnBvc2l0aW9uLmxlbmd0aCAhPSBzcGFjZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydFNwYWNlcyhlZGl0cywgbmV4dFRva2VuLnBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRUb2tlbi5wb3NpdGlvbi5jb2x1bW4sIHNwYWNlcyAtIG5leHRUb2tlbi5wb3NpdGlvbi5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdyZWF0ZXJHZW5lcmljICYmIG5leHRUb2tlbi50dCA9PSBUb2tlblR5cGUubGVmdEJyYWNrZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFjZXMgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNwYWNlcyA9PSAxKSB0aGlzLmluc2VydFNwYWNlcyhlZGl0cywgbmV4dFRva2VuLnBvc2l0aW9uLmxpbmUsIG5leHRUb2tlbi5wb3NpdGlvbi5jb2x1bW4sIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHQudHQgIT0gVG9rZW5UeXBlLnNwYWNlICYmIHQudHQgIT0gVG9rZW5UeXBlLm5ld2xpbmUpIHtcclxuICAgICAgICAgICAgICAgIGxhc3ROb25TcGFjZVRva2VuID0gdDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZGVsZXRlT3ZlcmxhcHBpbmdSYW5nZXMoZWRpdHMpO1xyXG5cclxuICAgICAgICByZXR1cm4gZWRpdHM7XHJcblxyXG4gICAgfVxyXG4gICAgZ2V0TmV4dE5vblNwYWNlVG9rZW4oY3VycmVudEluZGV4OiBudW1iZXIsIHRva2VubGlzdDogVG9rZW5MaXN0KTogIFRva2VuIHtcclxuXHJcbiAgICAgICAgaWYoY3VycmVudEluZGV4ID09IHRva2VubGlzdC5sZW5ndGggLSAxKSByZXR1cm4gdG9rZW5saXN0W2N1cnJlbnRJbmRleF07XHJcblxyXG4gICAgICAgIGxldCBqID0gY3VycmVudEluZGV4ICsgMTtcclxuICAgICAgICB3aGlsZShqIDwgdG9rZW5saXN0Lmxlbmd0aCAtIDEgJiYgKHRva2VubGlzdFtqXS50dCA9PSBUb2tlblR5cGUuc3BhY2UgfHwgdG9rZW5saXN0W2pdLnR0ID09IFRva2VuVHlwZS5yZXR1cm4pKXtcclxuICAgICAgICAgICAgaisrO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdG9rZW5saXN0W2pdO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBsb3dlckJlbG9uZ3NUb0dlbmVyaWNFeHByZXNzaW9uKHBvc2l0aW9uOiBudW1iZXIsIHRva2VubGlzdDogVG9rZW5MaXN0KSB7XHJcbiAgICAgICAgbGV0IGkgPSBwb3NpdGlvbiArIDE7XHJcbiAgICAgICAgd2hpbGUgKGkgPCB0b2tlbmxpc3QubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIGxldCB0dCA9IHRva2VubGlzdFtpXS50dDtcclxuICAgICAgICAgICAgaWYgKHR0ID09IFRva2VuVHlwZS5ncmVhdGVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoW1Rva2VuVHlwZS5zcGFjZSwgVG9rZW5UeXBlLmNvbW1hLCBUb2tlblR5cGUuaWRlbnRpZmllcl0uaW5kZXhPZih0dCkgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgZ3JlYXRlckJlbG9uZ3NUb0dlbmVyaWNFeHByZXNzaW9uKHBvc2l0aW9uOiBudW1iZXIsIHRva2VubGlzdDogVG9rZW5MaXN0KSB7XHJcbiAgICAgICAgbGV0IGkgPSBwb3NpdGlvbiAtIDE7XHJcbiAgICAgICAgd2hpbGUgKGkgPj0gMCkge1xyXG4gICAgICAgICAgICBsZXQgdHQgPSB0b2tlbmxpc3RbaV0udHQ7XHJcbiAgICAgICAgICAgIGlmICh0dCA9PSBUb2tlblR5cGUubG93ZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChbVG9rZW5UeXBlLnNwYWNlLCBUb2tlblR5cGUuY29tbWEsIFRva2VuVHlwZS5pZGVudGlmaWVyXS5pbmRleE9mKHR0KSA8IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpLS07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBpc0JpbmFyeU9wZXJhdG9yKHRva2VuOiBUb2tlblR5cGUpIHtcclxuICAgICAgICByZXR1cm4gdG9rZW4gIT0gbnVsbCAmJiB0b2tlbiA+PSBUb2tlblR5cGUubW9kdWxvICYmIHRva2VuIDw9IFRva2VuVHlwZS5jb2xvbjtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlcGxhY2VCZXR3ZWVuKGxhc3ROb25TcGFjZVRva2VuOiBUb2tlbiwgdDogVG9rZW4sIGVkaXRzOiBtb25hY28ubGFuZ3VhZ2VzLlRleHRFZGl0W10sIHRleHQ6IHN0cmluZykge1xyXG4gICAgICAgIGxldCBwb3NpdGlvbkZyb20gPSB7XHJcbiAgICAgICAgICAgIGxpbmU6IGxhc3ROb25TcGFjZVRva2VuLnBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgIGNvbHVtbjogbGFzdE5vblNwYWNlVG9rZW4ucG9zaXRpb24uY29sdW1uICsgbGFzdE5vblNwYWNlVG9rZW4ucG9zaXRpb24ubGVuZ3RoXHJcbiAgICAgICAgfTtcclxuICAgICAgICBsZXQgcG9zaXRpb25UbyA9IHtcclxuICAgICAgICAgICAgbGluZTogdC5wb3NpdGlvbi5saW5lLFxyXG4gICAgICAgICAgICBjb2x1bW46IHQucG9zaXRpb24uY29sdW1uXHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAocG9zaXRpb25Gcm9tLmxpbmUgIT0gcG9zaXRpb25Uby5saW5lIHx8XHJcbiAgICAgICAgICAgIHBvc2l0aW9uVG8uY29sdW1uIC0gcG9zaXRpb25Gcm9tLmNvbHVtbiAhPSB0ZXh0Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGlzLnJlcGxhY2UoZWRpdHMsIHBvc2l0aW9uRnJvbSwgcG9zaXRpb25UbywgdGV4dCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGRlbGV0ZVNwYWNlcyhlZGl0czogbW9uYWNvLmxhbmd1YWdlcy5UZXh0RWRpdFtdLCBsaW5lOiBudW1iZXIsIGNvbHVtbjogbnVtYmVyLCBudW1iZXJPZlNwYWNlczogbnVtYmVyKSB7XHJcbiAgICAgICAgZWRpdHMucHVzaCh7XHJcbiAgICAgICAgICAgIHJhbmdlOiB7XHJcbiAgICAgICAgICAgICAgICBzdGFydENvbHVtbjogY29sdW1uLFxyXG4gICAgICAgICAgICAgICAgc3RhcnRMaW5lTnVtYmVyOiBsaW5lLFxyXG4gICAgICAgICAgICAgICAgZW5kQ29sdW1uOiBjb2x1bW4gKyBudW1iZXJPZlNwYWNlcyArIChjb2x1bW4gPT0gMCA/IDEgOiAwKSxcclxuICAgICAgICAgICAgICAgIGVuZExpbmVOdW1iZXI6IGxpbmVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGV4dDogXCJcIlxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGluc2VydFNwYWNlcyhlZGl0czogbW9uYWNvLmxhbmd1YWdlcy5UZXh0RWRpdFtdLCBsaW5lOiBudW1iZXIsIGNvbHVtbjogbnVtYmVyLCBudW1iZXJPZlNwYWNlczogbnVtYmVyKSB7XHJcblxyXG4gICAgICAgIGlmIChudW1iZXJPZlNwYWNlcyA8IDApIHtcclxuICAgICAgICAgICAgdGhpcy5kZWxldGVTcGFjZXMoZWRpdHMsIGxpbmUsIGNvbHVtbiwgLW51bWJlck9mU3BhY2VzKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZWRpdHMucHVzaCh7XHJcbiAgICAgICAgICAgIHJhbmdlOiB7XHJcbiAgICAgICAgICAgICAgICBzdGFydENvbHVtbjogY29sdW1uLFxyXG4gICAgICAgICAgICAgICAgc3RhcnRMaW5lTnVtYmVyOiBsaW5lLFxyXG4gICAgICAgICAgICAgICAgZW5kQ29sdW1uOiBjb2x1bW4sXHJcbiAgICAgICAgICAgICAgICBlbmRMaW5lTnVtYmVyOiBsaW5lXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRleHQ6IFwiIFwiLnJlcGVhdChudW1iZXJPZlNwYWNlcylcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXBsYWNlKGVkaXRzOiBtb25hY28ubGFuZ3VhZ2VzLlRleHRFZGl0W10sIHBvc2l0aW9uRnJvbTogeyBsaW5lOiBudW1iZXI7IGNvbHVtbjogbnVtYmVyOyB9LCBwb3NpdGlvblRvOiB7IGxpbmU6IG51bWJlcjsgY29sdW1uOiBudW1iZXI7IH0sIHRleHQ6IHN0cmluZykge1xyXG5cclxuICAgICAgICBlZGl0cy5wdXNoKHtcclxuICAgICAgICAgICAgcmFuZ2U6IHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0Q29sdW1uOiBwb3NpdGlvbkZyb20uY29sdW1uLFxyXG4gICAgICAgICAgICAgICAgc3RhcnRMaW5lTnVtYmVyOiBwb3NpdGlvbkZyb20ubGluZSxcclxuICAgICAgICAgICAgICAgIGVuZENvbHVtbjogcG9zaXRpb25Uby5jb2x1bW4sXHJcbiAgICAgICAgICAgICAgICBlbmRMaW5lTnVtYmVyOiBwb3NpdGlvblRvLmxpbmVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGV4dDogdGV4dFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxufSJdfQ==