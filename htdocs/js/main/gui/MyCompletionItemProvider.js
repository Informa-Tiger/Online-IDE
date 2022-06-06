import { Klass, getVisibilityUpTo, Interface, Visibility } from "../../compiler/types/Class.js";
import { ArrayType } from "../../compiler/types/Array.js";
import { TokenType } from "../../compiler/lexer/Token.js";
export class MyCompletionItemProvider {
    constructor(main) {
        this.main = main;
        this.triggerCharacters = ['.', 'abcdefghijklmnopqrstuvwxyzäöüß_ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ', ' '];
        this.first = true;
    }
    provideCompletionItems(model, position, context, token) {
        var _a, _b, _c, _d, _e, _f, _g;
        setTimeout(() => {
            var _a;
            //@ts-ignore
            let sw = (_a = this.main.getMonacoEditor()._contentWidgets["editor.widget.suggestWidget"]) === null || _a === void 0 ? void 0 : _a.widget;
            if (sw != null && sw._widget != null && this.first) {
                sw._widget.toggleDetails();
                this.first = false;
            }
            // sw.toggleSuggestionDetails();
            // this.main.monaco.trigger('keyboard', 'editor.action.toggleSuggestionDetails', {});
            // this.main.monaco.trigger('keyboard', 'editor.action.triggerSuggest', {});
            // this.main.monaco.trigger(monaco.KeyMod.CtrlCmd + monaco.KeyCode.Space, 'type', {});
        }, 300);
        let consoleModel = (_c = (_b = (_a = this.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console) === null || _b === void 0 ? void 0 : _b.editor) === null || _c === void 0 ? void 0 : _c.getModel();
        this.isConsole = model == consoleModel;
        let isMainWindow = model == this.main.getMonacoEditor().getModel();
        if (!(this.isConsole || isMainWindow))
            return;
        let module = this.isConsole ? (_e = (_d = this.main.getBottomDiv()) === null || _d === void 0 ? void 0 : _d.console) === null || _e === void 0 ? void 0 : _e.compiler.module :
            this.main.getCurrentWorkspace().getModuleByMonacoModel(model);
        if (module == null) {
            return null;
        }
        if (this.isStringLiteral(module, position))
            return null;
        let textUntilPosition = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
        let textAfterPosition = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber + 5, endColumn: 1 });
        if (context.triggerCharacter == " ") {
            let newMatch = textUntilPosition.match(/.*(new )$/);
            if (newMatch != null) {
                return this.getCompletionItemsAfterNew(module);
            }
            let classMatch = textUntilPosition.match(/.*(class )[\wöäüÖÄÜß<> ,]*[\wöäüÖÄÜß<> ] $/);
            if (classMatch != null) {
                let classIndex = textUntilPosition.lastIndexOf('class');
                let countLower = 0;
                let countGreater = 0;
                for (let i = classIndex; i < textUntilPosition.length; i++) {
                    let c = textUntilPosition.charAt(i);
                    switch (c) {
                        case '<':
                            countLower++;
                            break;
                        case '>':
                            countGreater++;
                            break;
                    }
                }
                return this.getCompletionItemsAfterClass(module, countLower > countGreater, textAfterPosition);
            }
            return null;
        }
        let ibMatch = textAfterPosition.match(/^([\wöäüÖÄÜß]*\(?)/);
        let identifierAndBracketAfterCursor = "";
        if (ibMatch != null && ibMatch.length > 0) {
            identifierAndBracketAfterCursor = ibMatch[0];
        }
        let leftBracketAlreadyThere = identifierAndBracketAfterCursor.endsWith("(");
        // First guess:  dot followed by part of Identifier?
        let dotMatch = textUntilPosition.match(/.*(\.)([\wöäüÖÄÜß]*)$/);
        if (dotMatch != null) {
            if (this.isConsole) {
                (_g = (_f = this.main.getBottomDiv()) === null || _f === void 0 ? void 0 : _f.console) === null || _g === void 0 ? void 0 : _g.compileIfDirty();
            }
            else {
                this.main.compileIfDirty();
            }
        }
        let symbolTable = this.isConsole ? this.main.getDebugger().lastSymboltable : module.findSymbolTableAtPosition(position.lineNumber, position.column);
        let classContext = symbolTable == null ? null : symbolTable.classContext;
        if (dotMatch != null) {
            return this.getCompletionItemsAfterDot(dotMatch, position, module, identifierAndBracketAfterCursor, classContext, leftBracketAlreadyThere);
        }
        let varOrClassMatch = textUntilPosition.match(/.*[^\wöäüÖÄÜß]([\wöäüÖÄÜß]*)$/);
        if (varOrClassMatch == null) {
            varOrClassMatch = textUntilPosition.match(/^([\wöäüÖÄÜß]*)$/);
        }
        if (varOrClassMatch != null) {
            return this.getCompletionItemsInsideIdentifier(varOrClassMatch, position, module, identifierAndBracketAfterCursor, classContext, leftBracketAlreadyThere, symbolTable);
        }
    }
    isStringLiteral(module, position) {
        let tokenList = module.tokenList;
        if (tokenList == null || tokenList.length == 0)
            return false;
        let posMin = 0;
        let posMax = tokenList.length - 1;
        let pos;
        let watchDog = 1000;
        while (true) {
            let posOld = pos;
            pos = Math.round((posMax + posMin) / 2);
            if (posOld == pos)
                return false;
            watchDog--;
            if (watchDog == 0)
                return false;
            let t = tokenList[pos];
            let p = t.position;
            if (p.line < position.lineNumber || p.line == position.lineNumber && p.column + p.length < position.column) {
                posMin = pos;
                continue;
            }
            if (p.line > position.lineNumber || p.line == position.lineNumber && p.column > position.column) {
                posMax = pos;
                continue;
            }
            return t.tt == TokenType.stringConstant;
        }
    }
    getCompletionItemsAfterNew(module) {
        let completionItems = [];
        completionItems = completionItems.concat(this.main.getCurrentWorkspace().moduleStore.getTypeCompletionItems(module, undefined));
        for (let i = 0; i < completionItems.length; i++) {
            let item = completionItems[i];
            if (item.detail.match('Primitiv')) {
                completionItems.splice(i, 1);
                i--;
                continue;
            }
            if (item["generic"]) {
                item.insertText += "<>($0)";
            }
            else {
                item.insertText += "($0)";
            }
            item.insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
            item.command = {
                id: "editor.action.triggerParameterHints",
                title: '123',
                arguments: []
            };
        }
        return Promise.resolve({
            suggestions: completionItems
        });
    }
    getCompletionItemsAfterClass(module, insideGenericParameterDefinition, textAfterPosition) {
        let completionItems = [];
        let startsWithCurlyBrace = textAfterPosition.trimLeft().startsWith("{");
        completionItems = completionItems.concat([
            {
                label: "extends",
                insertText: "extends $1" + (insideGenericParameterDefinition || startsWithCurlyBrace ? "" : " {\n\t$0\n}"),
                detail: "extends-Operator",
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                kind: monaco.languages.CompletionItemKind.Snippet,
                range: undefined,
                command: {
                    id: "editor.action.triggerSuggest",
                    title: '123',
                    arguments: []
                }
            },
            {
                label: "implements",
                insertText: "implements $1" + (insideGenericParameterDefinition || startsWithCurlyBrace ? "" : " {\n\t$0\n}"),
                detail: "implements-Operator",
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                kind: monaco.languages.CompletionItemKind.Snippet,
                range: undefined,
                command: {
                    id: "editor.action.triggerSuggest",
                    title: '123',
                    arguments: []
                }
            },
            {
                label: "{}",
                insertText: "{\n\t$0\n}",
                detail: "Klassenrumpf",
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                kind: monaco.languages.CompletionItemKind.Snippet,
                range: undefined
            },
        ]);
        // completionItems = completionItems.concat(this.main.getCurrentWorkspace().moduleStore.getTypeCompletionItems(module, undefined));
        return Promise.resolve({
            suggestions: completionItems
        });
    }
    getCompletionItemsInsideIdentifier(varOrClassMatch, position, module, identifierAndBracketAfterCursor, classContext, leftBracketAlreadyThere, symbolTable) {
        var _a;
        let text = varOrClassMatch[1];
        let rangeToReplace = {
            startLineNumber: position.lineNumber, startColumn: position.column - text.length,
            endLineNumber: position.lineNumber, endColumn: position.column + identifierAndBracketAfterCursor.length
        };
        let completionItems = [];
        if ((symbolTable === null || symbolTable === void 0 ? void 0 : symbolTable.classContext) != null && (symbolTable === null || symbolTable === void 0 ? void 0 : symbolTable.method) == null && symbolTable.classContext instanceof Klass) {
            completionItems = completionItems.concat(this.getOverridableMethodsCompletion(symbolTable.classContext));
        }
        if (symbolTable != null) {
            completionItems = completionItems.concat(symbolTable.getLocalVariableCompletionItems(rangeToReplace).map(ci => {
                ci.sortText = "aaa" + ci.label;
                return ci;
            }));
        }
        completionItems = completionItems.concat(this.main.getCurrentWorkspace().moduleStore.getTypeCompletionItems(module, rangeToReplace));
        if (classContext != null && (symbolTable === null || symbolTable === void 0 ? void 0 : symbolTable.method) != null) {
            completionItems = completionItems.concat(classContext.getCompletionItems(Visibility.private, leftBracketAlreadyThere, identifierAndBracketAfterCursor, rangeToReplace, symbolTable.method)
                .map(ci => {
                ci.sortText = "aa" + ci.label;
                return ci;
            }));
            completionItems.push({
                label: "super",
                filterText: "super",
                insertText: "super.",
                detail: "Aufruf einer Methode einer Basisklasse",
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                kind: monaco.languages.CompletionItemKind.Snippet,
                range: undefined,
                command: {
                    id: "editor.action.triggerSuggest",
                    title: '123',
                    arguments: []
                }
            });
        }
        else {
            // Use filename to generate completion-item for class ... ?
            let name = (_a = module.file) === null || _a === void 0 ? void 0 : _a.name;
            if (name != null) {
                if (name.endsWith(".java"))
                    name = name.substr(0, name.indexOf(".java"));
                let m = name.match(/([\wöäüÖÄÜß]*)$/);
                if (module.classDefinitionsAST.length == 0 && m != null && m.length > 0 && m[0] == name && name.length > 0) {
                    name = name.charAt(0).toUpperCase() + name.substring(1);
                    completionItems.push({
                        label: "class " + name,
                        filterText: "class",
                        insertText: "class ${1:" + name + "} {\n\t$0\n}\n",
                        detail: "Definition der Klasse " + name,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        range: undefined
                    });
                }
            }
        }
        completionItems = completionItems.concat(this.getKeywordCompletion(symbolTable));
        // console.log("Complete variable/Class/Keyword " + text);
        return Promise.resolve({
            suggestions: completionItems
        });
    }
    getCompletionItemsAfterDot(dotMatch, position, module, identifierAndBracketAfterCursor, classContext, leftBracketAlreadyThere) {
        let textAfterDot = dotMatch[2];
        let dotColumn = position.column - textAfterDot.length - 1;
        let tStatic = module.getTypeAtPosition(position.lineNumber, dotColumn);
        let rangeToReplace = {
            startLineNumber: position.lineNumber, startColumn: position.column - textAfterDot.length,
            endLineNumber: position.lineNumber, endColumn: position.column + identifierAndBracketAfterCursor.length
        };
        if (tStatic == null)
            return null;
        let { type, isStatic } = tStatic;
        // console.log("Complete element.praefix; praefix: " + textAfterDot + ", Type: " + (type == null ? null : type.identifier));
        if (type instanceof Klass) {
            let visibilityUpTo = getVisibilityUpTo(type, classContext);
            if (isStatic) {
                return Promise.resolve({
                    suggestions: type.staticClass.getCompletionItems(visibilityUpTo, leftBracketAlreadyThere, identifierAndBracketAfterCursor, rangeToReplace)
                });
            }
            else {
                return Promise.resolve({
                    suggestions: type.getCompletionItems(visibilityUpTo, leftBracketAlreadyThere, identifierAndBracketAfterCursor, rangeToReplace, null)
                });
            }
        }
        if (type instanceof Interface) {
            return Promise.resolve({
                suggestions: type.getCompletionItems(leftBracketAlreadyThere, identifierAndBracketAfterCursor, rangeToReplace)
            });
        }
        if (type instanceof ArrayType) {
            return Promise.resolve({
                suggestions: [
                    {
                        label: "length",
                        filterText: "length",
                        kind: monaco.languages.CompletionItemKind.Field,
                        insertText: "length",
                        range: rangeToReplace,
                        documentation: {
                            value: "Anzahl der Elemente des Arrays"
                        }
                    }
                ]
            });
        }
        return null;
    }
    getKeywordCompletion(symbolTable) {
        let keywordCompletionItems = [];
        if (!this.isConsole && ((symbolTable === null || symbolTable === void 0 ? void 0 : symbolTable.classContext) == null || (symbolTable === null || symbolTable === void 0 ? void 0 : symbolTable.method) != null))
            keywordCompletionItems = keywordCompletionItems.concat([
                {
                    label: "while(Bedingung){Anweisungen}",
                    detail: "while-Wiederholung",
                    filterText: 'while',
                    // insertText: "while(${1:Bedingung}){\n\t$0\n}",
                    insertText: "while($1){\n\t$0\n}",
                    command: {
                        id: "editor.action.triggerParameterHints",
                        title: '123',
                        arguments: []
                    },
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "for(){}",
                    // insertText: "for(${1:Startanweisung};${2:Solange-Bedingung};${3:Nach_jeder_Wiederholung}){\n\t${0:Anweisungen}\n}",
                    insertText: "for( $1 ; $2 ; $3 ){\n\t$0\n}",
                    detail: "for-Wiederholung",
                    filterText: 'for',
                    // command: {
                    //     id: "editor.action.triggerParameterHints",
                    //     title: '123',
                    //     arguments: []
                    // },    
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "for(int i = 0; i < 10; i++){}",
                    // insertText: "for(${1:Startanweisung};${2:Solange-Bedingung};${3:Nach_jeder_Wiederholung}){\n\t${0:Anweisungen}\n}",
                    insertText: "for(int ${1:i} = 0; ${1:i} < ${2:10}; ${1:i}++){\n\t$0\n}",
                    detail: "Zähl-Wiederholung",
                    filterText: 'for',
                    // command: {
                    //     id: "editor.action.triggerParameterHints",
                    //     title: '123',
                    //     arguments: []
                    // },    
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "switch(){case...}",
                    // insertText: "switch(${1:Selektor}){\n\tcase ${2:Wert_1}: {\n\t\t ${3:Anweisungen}\n\t\t}\n\tcase ${4:Wert_2}: {\n\t\t ${0:Anweisungen}\n\t\t}\n}",
                    insertText: "switch($1){\n\tcase $2:\n\t\t $3\n\t\tbreak;\n\tcase $4:\n\t\t $5\n\t\tbreak;\n\tdefault:\n\t\t $0\n}",
                    detail: "switch-Anweisung",
                    filterText: 'switch',
                    command: {
                        id: "editor.action.triggerParameterHints",
                        title: '123',
                        arguments: []
                    },
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "if(){}",
                    // insertText: "if(${1:Bedingung}){\n\t${0:Anweisungen}\n}",
                    insertText: "if($1){\n\t$0\n}",
                    detail: "Bedingung",
                    filterText: 'if',
                    // command: {
                    //     id: "editor.action.triggerParameterHints",
                    //     title: '123',
                    //     arguments: []
                    // },
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "if(){} else {}",
                    insertText: "if($1){\n\t$2\n}\nelse {\n\t$0\n}",
                    detail: "Zweiseitige Bedingung",
                    filterText: 'if',
                    // command: {
                    //     id: "editor.action.triggerParameterHints",
                    //     title: '123',
                    //     arguments: []
                    // },
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "else {}",
                    insertText: "else {\n\t$0\n}",
                    detail: "else-Zweig",
                    filterText: 'el',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
            ]);
        if ((symbolTable === null || symbolTable === void 0 ? void 0 : symbolTable.classContext) == null || (symbolTable === null || symbolTable === void 0 ? void 0 : symbolTable.method) != null) {
            keywordCompletionItems = keywordCompletionItems.concat([
                {
                    label: "instanceof",
                    insertText: "instanceof $0",
                    detail: "instanceof-Operator",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "print",
                    insertText: "print($1);$0",
                    detail: "Ausgabe (ggf. mit Farbe \nals zweitem Parameter)",
                    command: {
                        id: "editor.action.triggerParameterHints",
                        title: '123',
                        arguments: []
                    },
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "println",
                    insertText: "println($1);$0",
                    detail: "Ausgabe mit Zeilenumbruch (ggf. mit \nFarbe als zweitem Parameter)",
                    command: {
                        id: "editor.action.triggerParameterHints",
                        title: '123',
                        arguments: []
                    },
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
            ]);
        }
        if (!this.isConsole && (symbolTable == null || symbolTable.classContext == null)) {
            keywordCompletionItems = keywordCompletionItems.concat([
                {
                    label: "class",
                    filterText: "class",
                    insertText: "class ${1:Bezeichner} {\n\t$0\n}\n",
                    detail: "Klassendefinition",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "public class",
                    filterText: "public class",
                    insertText: "public class ${1:Bezeichner} {\n\t$0\n}\n",
                    detail: "Öffentliche Klassendefinition",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                }
            ]);
        }
        else if (!this.isConsole && (symbolTable === null || symbolTable === void 0 ? void 0 : symbolTable.method) == null) {
            keywordCompletionItems = keywordCompletionItems.concat([
                {
                    label: "public",
                    filterText: "public",
                    insertText: "public ",
                    detail: "Schlüsselwort public",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "public void method(){}",
                    filterText: "public",
                    insertText: "public ${1:void} ${2:Bezeichner}(${3:Parameter}) {\n\t$0\n}\n",
                    detail: "Methodendefinition",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "protected",
                    filterText: "protected",
                    insertText: "protected ",
                    detail: "Schlüsselwort protected",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "static",
                    filterText: "static",
                    insertText: "static ",
                    detail: "Schlüsselwort static",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "private",
                    filterText: "private",
                    insertText: "private ",
                    detail: "Schlüsselwort private",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                }
            ]);
        }
        if (symbolTable != null && symbolTable.method != null) {
            keywordCompletionItems = keywordCompletionItems.concat([
                {
                    label: "return",
                    filterText: "return",
                    insertText: "return",
                    detail: "Schlüsselwort return",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                }
            ]);
        }
        return keywordCompletionItems;
    }
    getOverridableMethodsCompletion(classContext) {
        let keywordCompletionItems = [];
        let methods = [];
        let c = classContext.baseClass;
        while (c != null) {
            methods = methods.concat(c.methods.filter((m) => {
                if (m.isAbstract || (m.program == null && m.invoke == null) || m.identifier.startsWith('onMouse') || m.identifier.startsWith('onKey')) {
                    return true;
                }
                return false;
            }));
            c = c.baseClass;
        }
        for (let i of classContext.implements) {
            methods = methods.concat(i.getMethods());
        }
        for (let m of methods) {
            let alreadyImplemented = false;
            for (let m1 of classContext.methods) {
                if (m1.signature == m.signature) {
                    alreadyImplemented = true;
                    break;
                }
            }
            if (alreadyImplemented)
                continue;
            let label = (m.isAbstract ? "implement " : "override ") + m.getCompletionLabel();
            let filterText = m.identifier;
            let insertText = Visibility[m.visibility] + " " + (m.getReturnType() == null ? "void" : m.getReturnType().identifier) + " ";
            insertText += m.identifier + "(";
            for (let i = 0; i < m.getParameterList().parameters.length; i++) {
                let p = m.getParameterList().parameters[i];
                insertText += m.getParameterType(i).identifier + " " + p.identifier;
                if (i < m.getParameterCount() - 1) {
                    insertText += ", ";
                }
            }
            insertText += ") {\n\t$0\n}";
            keywordCompletionItems.push({
                label: label,
                detail: (m.isAbstract ? "Implementiere " : "Überschreibe ") + "die Methode " + label + " der Basisklasse.",
                filterText: filterText,
                insertText: insertText,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                kind: monaco.languages.CompletionItemKind.Snippet,
                range: undefined
            });
        }
        return keywordCompletionItems;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTXlDb21wbGV0aW9uSXRlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9NeUNvbXBsZXRpb25JdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFlLE1BQU0sK0JBQStCLENBQUM7QUFJN0csT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTFELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUxRCxNQUFNLE9BQU8sd0JBQXdCO0lBTWpDLFlBQW9CLElBQWM7UUFBZCxTQUFJLEdBQUosSUFBSSxDQUFVO1FBRjNCLHNCQUFpQixHQUFhLENBQUMsR0FBRyxFQUFFLDhEQUE4RCxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBS2hILFVBQUssR0FBWSxJQUFJLENBQUM7SUFGdEIsQ0FBQztJQUdELHNCQUFzQixDQUFDLEtBQStCLEVBQUUsUUFBeUIsRUFBRSxPQUEyQyxFQUFFLEtBQStCOztRQUUzSixVQUFVLENBQUMsR0FBRyxFQUFFOztZQUNaLFlBQVk7WUFDWixJQUFJLEVBQUUsR0FBRyxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsZUFBZSxDQUFDLDZCQUE2QixDQUFDLDBDQUFFLE1BQU0sQ0FBQztZQUM1RixJQUFJLEVBQUUsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDaEQsRUFBRSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7YUFDdEI7WUFDRCxnQ0FBZ0M7WUFDaEMscUZBQXFGO1lBQ3JGLDRFQUE0RTtZQUM1RSxzRkFBc0Y7UUFDMUYsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRVIsSUFBSSxZQUFZLEdBQUcsTUFBQSxNQUFBLE1BQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsMENBQUUsT0FBTywwQ0FBRSxNQUFNLDBDQUFFLFFBQVEsRUFBRSxDQUFDO1FBQ3pFLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxJQUFJLFlBQVksQ0FBQztRQUV2QyxJQUFJLFlBQVksR0FBRyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUVuRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLFlBQVksQ0FBQztZQUFFLE9BQU87UUFFOUMsSUFBSSxNQUFNLEdBQVcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBQSxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLDBDQUFFLE9BQU8sMENBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RGLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVsRSxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFDaEIsT0FBTyxJQUFJLENBQUM7U0FDZjtRQUVELElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFFeEQsSUFBSSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLGFBQWEsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN0SixJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsRUFBRSxlQUFlLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFNUssSUFBSSxPQUFPLENBQUMsZ0JBQWdCLElBQUksR0FBRyxFQUFFO1lBQ2pDLElBQUksUUFBUSxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNwRCxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7Z0JBQ2xCLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ2xEO1lBQ0QsSUFBSSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7WUFDdkYsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO2dCQUVwQixJQUFJLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3hELElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztnQkFDbkIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQixLQUFLLElBQUksQ0FBQyxHQUFHLFVBQVUsRUFBRSxDQUFDLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUN4RCxJQUFJLENBQUMsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3BDLFFBQVEsQ0FBQyxFQUFFO3dCQUNQLEtBQUssR0FBRzs0QkFBRSxVQUFVLEVBQUUsQ0FBQzs0QkFBQyxNQUFNO3dCQUM5QixLQUFLLEdBQUc7NEJBQUUsWUFBWSxFQUFFLENBQUM7NEJBQUMsTUFBTTtxQkFDbkM7aUJBQ0o7Z0JBRUQsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsTUFBTSxFQUFFLFVBQVUsR0FBRyxZQUFZLEVBQUUsaUJBQWlCLENBQUMsQ0FBQzthQUNsRztZQUNELE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFFRCxJQUFJLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUM1RCxJQUFJLCtCQUErQixHQUFHLEVBQUUsQ0FBQztRQUN6QyxJQUFJLE9BQU8sSUFBSSxJQUFJLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDdkMsK0JBQStCLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2hEO1FBRUQsSUFBSSx1QkFBdUIsR0FBRywrQkFBK0IsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFNUUsb0RBQW9EO1FBQ3BELElBQUksUUFBUSxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ2hFLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtZQUNsQixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQ2hCLE1BQUEsTUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSwwQ0FBRSxPQUFPLDBDQUFFLGNBQWMsRUFBRSxDQUFDO2FBQ3ZEO2lCQUFNO2dCQUNILElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7YUFDOUI7U0FDSjtRQUVELElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEosSUFBSSxZQUFZLEdBQUcsV0FBVyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDO1FBR3pFLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtZQUNsQixPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFDN0QsK0JBQStCLEVBQUUsWUFBWSxFQUFFLHVCQUF1QixDQUFDLENBQUM7U0FDL0U7UUFFRCxJQUFJLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUUvRSxJQUFJLGVBQWUsSUFBSSxJQUFJLEVBQUU7WUFDekIsZUFBZSxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1NBQ2pFO1FBRUQsSUFBSSxlQUFlLElBQUksSUFBSSxFQUFFO1lBRXpCLE9BQU8sSUFBSSxDQUFDLGtDQUFrQyxDQUFDLGVBQWUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUM1RSwrQkFBK0IsRUFBRSxZQUFZLEVBQUUsdUJBQXVCLEVBQUUsV0FBVyxDQUFDLENBQUM7U0FFNUY7SUFHTCxDQUFDO0lBRUQsZUFBZSxDQUFDLE1BQWMsRUFBRSxRQUF5QjtRQUVyRCxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQ2pDLElBQUksU0FBUyxJQUFJLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUU3RCxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDZixJQUFJLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLEdBQVcsQ0FBQztRQUVoQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFFcEIsT0FBTyxJQUFJLEVBQUU7WUFDVCxJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUM7WUFDakIsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFeEMsSUFBSSxNQUFNLElBQUksR0FBRztnQkFBRSxPQUFPLEtBQUssQ0FBQztZQUVoQyxRQUFRLEVBQUUsQ0FBQztZQUNYLElBQUksUUFBUSxJQUFJLENBQUM7Z0JBQUUsT0FBTyxLQUFLLENBQUM7WUFFaEMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFFbkIsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxRQUFRLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUN4RyxNQUFNLEdBQUcsR0FBRyxDQUFDO2dCQUNiLFNBQVM7YUFDWjtZQUVELElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQzdGLE1BQU0sR0FBRyxHQUFHLENBQUM7Z0JBQ2IsU0FBUzthQUNaO1lBRUQsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxjQUFjLENBQUM7U0FFM0M7SUFFTCxDQUFDO0lBRUQsMEJBQTBCLENBQUMsTUFBYztRQUNyQyxJQUFJLGVBQWUsR0FBc0MsRUFBRSxDQUFDO1FBRTVELGVBQWUsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFFaEksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDN0MsSUFBSSxJQUFJLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQy9CLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM3QixDQUFDLEVBQUUsQ0FBQztnQkFDSixTQUFTO2FBQ1o7WUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDakIsSUFBSSxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUM7YUFDL0I7aUJBQU07Z0JBQ0gsSUFBSSxDQUFDLFVBQVUsSUFBSSxNQUFNLENBQUM7YUFDN0I7WUFDRCxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsZUFBZSxDQUFDO1lBQ3JGLElBQUksQ0FBQyxPQUFPLEdBQUc7Z0JBQ1gsRUFBRSxFQUFFLHFDQUFxQztnQkFDekMsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osU0FBUyxFQUFFLEVBQUU7YUFDaEIsQ0FBQztTQUVMO1FBRUQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQ25CLFdBQVcsRUFBRSxlQUFlO1NBQy9CLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxNQUFjLEVBQUUsZ0NBQXlDLEVBQUUsaUJBQXlCO1FBQzdHLElBQUksZUFBZSxHQUFzQyxFQUFFLENBQUM7UUFFNUQsSUFBSSxvQkFBb0IsR0FBWSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFakYsZUFBZSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUM7WUFDckM7Z0JBQ0ksS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLFVBQVUsRUFBRSxZQUFZLEdBQUcsQ0FBQyxnQ0FBZ0MsSUFBSSxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7Z0JBQzFHLE1BQU0sRUFBRSxrQkFBa0I7Z0JBQzFCLGVBQWUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLGVBQWU7Z0JBQzlFLElBQUksRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLE9BQU87Z0JBQ2pELEtBQUssRUFBRSxTQUFTO2dCQUNoQixPQUFPLEVBQUU7b0JBQ0wsRUFBRSxFQUFFLDhCQUE4QjtvQkFDbEMsS0FBSyxFQUFFLEtBQUs7b0JBQ1osU0FBUyxFQUFFLEVBQUU7aUJBQ2hCO2FBQ0o7WUFDRDtnQkFDSSxLQUFLLEVBQUUsWUFBWTtnQkFDbkIsVUFBVSxFQUFFLGVBQWUsR0FBRyxDQUFDLGdDQUFnQyxJQUFJLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztnQkFDN0csTUFBTSxFQUFFLHFCQUFxQjtnQkFDN0IsZUFBZSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsZUFBZTtnQkFDOUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsT0FBTztnQkFDakQsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLE9BQU8sRUFBRTtvQkFDTCxFQUFFLEVBQUUsOEJBQThCO29CQUNsQyxLQUFLLEVBQUUsS0FBSztvQkFDWixTQUFTLEVBQUUsRUFBRTtpQkFDaEI7YUFDSjtZQUNEO2dCQUNJLEtBQUssRUFBRSxJQUFJO2dCQUNYLFVBQVUsRUFBRSxZQUFZO2dCQUN4QixNQUFNLEVBQUUsY0FBYztnQkFDdEIsZUFBZSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsZUFBZTtnQkFDOUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsT0FBTztnQkFDakQsS0FBSyxFQUFFLFNBQVM7YUFDbkI7U0FDSixDQUFDLENBQUM7UUFFSCxtSUFBbUk7UUFFbkksT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQ25CLFdBQVcsRUFBRSxlQUFlO1NBQy9CLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCxrQ0FBa0MsQ0FBQyxlQUFpQyxFQUFFLFFBQXlCLEVBQUUsTUFBYyxFQUFFLCtCQUF1QyxFQUFFLFlBQWlDLEVBQ3ZMLHVCQUFnQyxFQUFFLFdBQXdCOztRQUMxRCxJQUFJLElBQUksR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUIsSUFBSSxjQUFjLEdBQ2xCO1lBQ0ksZUFBZSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU07WUFDaEYsYUFBYSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsK0JBQStCLENBQUMsTUFBTTtTQUMxRyxDQUFBO1FBSUQsSUFBSSxlQUFlLEdBQXNDLEVBQUUsQ0FBQztRQUU1RCxJQUFJLENBQUEsV0FBVyxhQUFYLFdBQVcsdUJBQVgsV0FBVyxDQUFFLFlBQVksS0FBSSxJQUFJLElBQUksQ0FBQSxXQUFXLGFBQVgsV0FBVyx1QkFBWCxXQUFXLENBQUUsTUFBTSxLQUFJLElBQUksSUFBSSxXQUFXLENBQUMsWUFBWSxZQUFZLEtBQUssRUFBRTtZQUMvRyxlQUFlLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7U0FDNUc7UUFFRCxJQUFJLFdBQVcsSUFBSSxJQUFJLEVBQUU7WUFDckIsZUFBZSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLCtCQUErQixDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDMUcsRUFBRSxDQUFDLFFBQVEsR0FBRyxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztnQkFDL0IsT0FBTyxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1A7UUFFRCxlQUFlLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBRXJJLElBQUksWUFBWSxJQUFJLElBQUksSUFBSSxDQUFBLFdBQVcsYUFBWCxXQUFXLHVCQUFYLFdBQVcsQ0FBRSxNQUFNLEtBQUksSUFBSSxFQUFFO1lBQ3JELGVBQWUsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUNwQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSwrQkFBK0IsRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQztpQkFDNUksR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUNOLEVBQUUsQ0FBQyxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7Z0JBQzlCLE9BQU8sRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLENBQ1QsQ0FBQztZQUNGLGVBQWUsQ0FBQyxJQUFJLENBQ2hCO2dCQUNJLEtBQUssRUFBRSxPQUFPO2dCQUNkLFVBQVUsRUFBRSxPQUFPO2dCQUNuQixVQUFVLEVBQUUsUUFBUTtnQkFDcEIsTUFBTSxFQUFFLHdDQUF3QztnQkFDaEQsZUFBZSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsZUFBZTtnQkFDOUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsT0FBTztnQkFDakQsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLE9BQU8sRUFBRTtvQkFDTCxFQUFFLEVBQUUsOEJBQThCO29CQUNsQyxLQUFLLEVBQUUsS0FBSztvQkFDWixTQUFTLEVBQUUsRUFBRTtpQkFDaEI7YUFDSixDQUNKLENBQUE7U0FDSjthQUFNO1lBQ0gsMkRBQTJEO1lBQzNELElBQUksSUFBSSxHQUFHLE1BQUEsTUFBTSxDQUFDLElBQUksMENBQUUsSUFBSSxDQUFDO1lBQzdCLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDZCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO29CQUFFLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3pFLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxNQUFNLENBQUMsbUJBQW1CLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQ3hHLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3hELGVBQWUsQ0FBQyxJQUFJLENBQUM7d0JBQ2pCLEtBQUssRUFBRSxRQUFRLEdBQUcsSUFBSTt3QkFDdEIsVUFBVSxFQUFFLE9BQU87d0JBQ25CLFVBQVUsRUFBRSxZQUFZLEdBQUcsSUFBSSxHQUFHLGdCQUFnQjt3QkFDbEQsTUFBTSxFQUFFLHdCQUF3QixHQUFHLElBQUk7d0JBQ3ZDLGVBQWUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLGVBQWU7d0JBQzlFLElBQUksRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLE9BQU87d0JBQ2pELEtBQUssRUFBRSxTQUFTO3FCQUNuQixDQUNBLENBQUE7aUJBQ0o7YUFDSjtTQUNKO1FBRUQsZUFBZSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFHakYsMERBQTBEO1FBRTFELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUNuQixXQUFXLEVBQUUsZUFBZTtTQUMvQixDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsMEJBQTBCLENBQUMsUUFBMEIsRUFBRSxRQUF5QixFQUFFLE1BQWMsRUFDNUYsK0JBQXVDLEVBQUUsWUFBaUMsRUFDMUUsdUJBQWdDO1FBQ2hDLElBQUksWUFBWSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQzFELElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksY0FBYyxHQUNsQjtZQUNJLGVBQWUsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQyxNQUFNO1lBQ3hGLGFBQWEsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsTUFBTSxHQUFHLCtCQUErQixDQUFDLE1BQU07U0FDMUcsQ0FBQTtRQUVELElBQUksT0FBTyxJQUFJLElBQUk7WUFBRSxPQUFPLElBQUksQ0FBQztRQUVqQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUdqQyw0SEFBNEg7UUFHNUgsSUFBSSxJQUFJLFlBQVksS0FBSyxFQUFFO1lBRXZCLElBQUksY0FBYyxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztZQUUzRCxJQUFJLFFBQVEsRUFBRTtnQkFDVixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUM7b0JBQ25CLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSx1QkFBdUIsRUFDcEYsK0JBQStCLEVBQUUsY0FBYyxDQUFDO2lCQUN2RCxDQUFDLENBQUM7YUFDTjtpQkFBTTtnQkFDSCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUM7b0JBQ25CLFdBQVcsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLHVCQUF1QixFQUN4RSwrQkFBK0IsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDO2lCQUM3RCxDQUFDLENBQUM7YUFDTjtTQUNKO1FBRUQsSUFBSSxJQUFJLFlBQVksU0FBUyxFQUFFO1lBQzNCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQztnQkFDbkIsV0FBVyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyx1QkFBdUIsRUFDeEQsK0JBQStCLEVBQUUsY0FBYyxDQUFDO2FBQ3ZELENBQUMsQ0FBQztTQUNOO1FBRUQsSUFBSSxJQUFJLFlBQVksU0FBUyxFQUFFO1lBQzNCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQztnQkFDbkIsV0FBVyxFQUFFO29CQUNUO3dCQUNJLEtBQUssRUFBRSxRQUFRO3dCQUNmLFVBQVUsRUFBRSxRQUFRO3dCQUNwQixJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO3dCQUMvQyxVQUFVLEVBQUUsUUFBUTt3QkFDcEIsS0FBSyxFQUFFLGNBQWM7d0JBQ3JCLGFBQWEsRUFBRTs0QkFDWCxLQUFLLEVBQUUsZ0NBQWdDO3lCQUMxQztxQkFDSjtpQkFDSjthQUNKLENBQUMsQ0FBQztTQUNOO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELG9CQUFvQixDQUFDLFdBQXdCO1FBQ3pDLElBQUksc0JBQXNCLEdBQXNDLEVBQUUsQ0FBQztRQUNuRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUEsV0FBVyxhQUFYLFdBQVcsdUJBQVgsV0FBVyxDQUFFLFlBQVksS0FBSSxJQUFJLElBQUksQ0FBQSxXQUFXLGFBQVgsV0FBVyx1QkFBWCxXQUFXLENBQUUsTUFBTSxLQUFJLElBQUksQ0FBQztZQUNyRixzQkFBc0IsR0FBRyxzQkFBc0IsQ0FBQyxNQUFNLENBQUM7Z0JBQ25EO29CQUNJLEtBQUssRUFBRSwrQkFBK0I7b0JBQ3RDLE1BQU0sRUFBRSxvQkFBb0I7b0JBQzVCLFVBQVUsRUFBRSxPQUFPO29CQUNuQixpREFBaUQ7b0JBQ2pELFVBQVUsRUFBRSxxQkFBcUI7b0JBQ2pDLE9BQU8sRUFBRTt3QkFDTCxFQUFFLEVBQUUscUNBQXFDO3dCQUN6QyxLQUFLLEVBQUUsS0FBSzt3QkFDWixTQUFTLEVBQUUsRUFBRTtxQkFDaEI7b0JBQ0QsZUFBZSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsZUFBZTtvQkFDOUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsT0FBTztvQkFDakQsS0FBSyxFQUFFLFNBQVM7aUJBQ25CO2dCQUNEO29CQUNJLEtBQUssRUFBRSxTQUFTO29CQUNoQixzSEFBc0g7b0JBQ3RILFVBQVUsRUFBRSwrQkFBK0I7b0JBQzNDLE1BQU0sRUFBRSxrQkFBa0I7b0JBQzFCLFVBQVUsRUFBRSxLQUFLO29CQUNqQixhQUFhO29CQUNiLGlEQUFpRDtvQkFDakQsb0JBQW9CO29CQUNwQixvQkFBb0I7b0JBQ3BCLFNBQVM7b0JBQ1QsZUFBZSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsZUFBZTtvQkFDOUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsT0FBTztvQkFDakQsS0FBSyxFQUFFLFNBQVM7aUJBQ25CO2dCQUNEO29CQUNJLEtBQUssRUFBRSwrQkFBK0I7b0JBQ3RDLHNIQUFzSDtvQkFDdEgsVUFBVSxFQUFFLDJEQUEyRDtvQkFDdkUsTUFBTSxFQUFFLG1CQUFtQjtvQkFDM0IsVUFBVSxFQUFFLEtBQUs7b0JBQ2pCLGFBQWE7b0JBQ2IsaURBQWlEO29CQUNqRCxvQkFBb0I7b0JBQ3BCLG9CQUFvQjtvQkFDcEIsU0FBUztvQkFDVCxlQUFlLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxlQUFlO29CQUM5RSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO29CQUNqRCxLQUFLLEVBQUUsU0FBUztpQkFDbkI7Z0JBQ0Q7b0JBQ0ksS0FBSyxFQUFFLG1CQUFtQjtvQkFDMUIscUpBQXFKO29CQUNySixVQUFVLEVBQUUsdUdBQXVHO29CQUNuSCxNQUFNLEVBQUUsa0JBQWtCO29CQUMxQixVQUFVLEVBQUUsUUFBUTtvQkFDcEIsT0FBTyxFQUFFO3dCQUNMLEVBQUUsRUFBRSxxQ0FBcUM7d0JBQ3pDLEtBQUssRUFBRSxLQUFLO3dCQUNaLFNBQVMsRUFBRSxFQUFFO3FCQUNoQjtvQkFDRCxlQUFlLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxlQUFlO29CQUM5RSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO29CQUNqRCxLQUFLLEVBQUUsU0FBUztpQkFDbkI7Z0JBQ0Q7b0JBQ0ksS0FBSyxFQUFFLFFBQVE7b0JBQ2YsNERBQTREO29CQUM1RCxVQUFVLEVBQUUsa0JBQWtCO29CQUM5QixNQUFNLEVBQUUsV0FBVztvQkFDbkIsVUFBVSxFQUFFLElBQUk7b0JBQ2hCLGFBQWE7b0JBQ2IsaURBQWlEO29CQUNqRCxvQkFBb0I7b0JBQ3BCLG9CQUFvQjtvQkFDcEIsS0FBSztvQkFDTCxlQUFlLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxlQUFlO29CQUM5RSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO29CQUNqRCxLQUFLLEVBQUUsU0FBUztpQkFDbkI7Z0JBQ0Q7b0JBQ0ksS0FBSyxFQUFFLGdCQUFnQjtvQkFDdkIsVUFBVSxFQUFFLG1DQUFtQztvQkFDL0MsTUFBTSxFQUFFLHVCQUF1QjtvQkFDL0IsVUFBVSxFQUFFLElBQUk7b0JBQ2hCLGFBQWE7b0JBQ2IsaURBQWlEO29CQUNqRCxvQkFBb0I7b0JBQ3BCLG9CQUFvQjtvQkFDcEIsS0FBSztvQkFDTCxlQUFlLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxlQUFlO29CQUM5RSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO29CQUNqRCxLQUFLLEVBQUUsU0FBUztpQkFDbkI7Z0JBQ0Q7b0JBQ0ksS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLFVBQVUsRUFBRSxpQkFBaUI7b0JBQzdCLE1BQU0sRUFBRSxZQUFZO29CQUNwQixVQUFVLEVBQUUsSUFBSTtvQkFDaEIsZUFBZSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsZUFBZTtvQkFDOUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsT0FBTztvQkFDakQsS0FBSyxFQUFFLFNBQVM7aUJBQ25CO2FBQ0osQ0FBQyxDQUFDO1FBRVAsSUFBSSxDQUFBLFdBQVcsYUFBWCxXQUFXLHVCQUFYLFdBQVcsQ0FBRSxZQUFZLEtBQUksSUFBSSxJQUFJLENBQUEsV0FBVyxhQUFYLFdBQVcsdUJBQVgsV0FBVyxDQUFFLE1BQU0sS0FBSSxJQUFJLEVBQUU7WUFFbEUsc0JBQXNCLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxDQUFDO2dCQUNuRDtvQkFDSSxLQUFLLEVBQUUsWUFBWTtvQkFDbkIsVUFBVSxFQUFFLGVBQWU7b0JBQzNCLE1BQU0sRUFBRSxxQkFBcUI7b0JBQzdCLGVBQWUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLGVBQWU7b0JBQzlFLElBQUksRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLE9BQU87b0JBQ2pELEtBQUssRUFBRSxTQUFTO2lCQUNuQjtnQkFDRDtvQkFDSSxLQUFLLEVBQUUsT0FBTztvQkFDZCxVQUFVLEVBQUUsY0FBYztvQkFDMUIsTUFBTSxFQUFFLGtEQUFrRDtvQkFDMUQsT0FBTyxFQUFFO3dCQUNMLEVBQUUsRUFBRSxxQ0FBcUM7d0JBQ3pDLEtBQUssRUFBRSxLQUFLO3dCQUNaLFNBQVMsRUFBRSxFQUFFO3FCQUNoQjtvQkFDRCxlQUFlLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxlQUFlO29CQUM5RSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO29CQUNqRCxLQUFLLEVBQUUsU0FBUztpQkFDbkI7Z0JBQ0Q7b0JBQ0ksS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLFVBQVUsRUFBRSxnQkFBZ0I7b0JBQzVCLE1BQU0sRUFBRSxvRUFBb0U7b0JBQzVFLE9BQU8sRUFBRTt3QkFDTCxFQUFFLEVBQUUscUNBQXFDO3dCQUN6QyxLQUFLLEVBQUUsS0FBSzt3QkFDWixTQUFTLEVBQUUsRUFBRTtxQkFDaEI7b0JBQ0QsZUFBZSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsZUFBZTtvQkFDOUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsT0FBTztvQkFDakQsS0FBSyxFQUFFLFNBQVM7aUJBQ25CO2FBRUosQ0FBQyxDQUFDO1NBQ047UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLElBQUksV0FBVyxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsRUFBRTtZQUM5RSxzQkFBc0IsR0FBRyxzQkFBc0IsQ0FBQyxNQUFNLENBQUM7Z0JBQ25EO29CQUNJLEtBQUssRUFBRSxPQUFPO29CQUNkLFVBQVUsRUFBRSxPQUFPO29CQUNuQixVQUFVLEVBQUUsb0NBQW9DO29CQUNoRCxNQUFNLEVBQUUsbUJBQW1CO29CQUMzQixlQUFlLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxlQUFlO29CQUM5RSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO29CQUNqRCxLQUFLLEVBQUUsU0FBUztpQkFDbkI7Z0JBQ0Q7b0JBQ0ksS0FBSyxFQUFFLGNBQWM7b0JBQ3JCLFVBQVUsRUFBRSxjQUFjO29CQUMxQixVQUFVLEVBQUUsMkNBQTJDO29CQUN2RCxNQUFNLEVBQUUsK0JBQStCO29CQUN2QyxlQUFlLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxlQUFlO29CQUM5RSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO29CQUNqRCxLQUFLLEVBQUUsU0FBUztpQkFDbkI7YUFFSixDQUFDLENBQUM7U0FDTjthQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUEsV0FBVyxhQUFYLFdBQVcsdUJBQVgsV0FBVyxDQUFFLE1BQU0sS0FBSSxJQUFJLEVBQUU7WUFDdkQsc0JBQXNCLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxDQUFDO2dCQUNuRDtvQkFDSSxLQUFLLEVBQUUsUUFBUTtvQkFDZixVQUFVLEVBQUUsUUFBUTtvQkFDcEIsVUFBVSxFQUFFLFNBQVM7b0JBQ3JCLE1BQU0sRUFBRSxzQkFBc0I7b0JBQzlCLGVBQWUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLGVBQWU7b0JBQzlFLElBQUksRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLE9BQU87b0JBQ2pELEtBQUssRUFBRSxTQUFTO2lCQUNuQjtnQkFDRDtvQkFDSSxLQUFLLEVBQUUsd0JBQXdCO29CQUMvQixVQUFVLEVBQUUsUUFBUTtvQkFDcEIsVUFBVSxFQUFFLCtEQUErRDtvQkFDM0UsTUFBTSxFQUFFLG9CQUFvQjtvQkFDNUIsZUFBZSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsZUFBZTtvQkFDOUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsT0FBTztvQkFDakQsS0FBSyxFQUFFLFNBQVM7aUJBQ25CO2dCQUNEO29CQUNJLEtBQUssRUFBRSxXQUFXO29CQUNsQixVQUFVLEVBQUUsV0FBVztvQkFDdkIsVUFBVSxFQUFFLFlBQVk7b0JBQ3hCLE1BQU0sRUFBRSx5QkFBeUI7b0JBQ2pDLGVBQWUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLGVBQWU7b0JBQzlFLElBQUksRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLE9BQU87b0JBQ2pELEtBQUssRUFBRSxTQUFTO2lCQUNuQjtnQkFDRDtvQkFDSSxLQUFLLEVBQUUsUUFBUTtvQkFDZixVQUFVLEVBQUUsUUFBUTtvQkFDcEIsVUFBVSxFQUFFLFNBQVM7b0JBQ3JCLE1BQU0sRUFBRSxzQkFBc0I7b0JBQzlCLGVBQWUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLGVBQWU7b0JBQzlFLElBQUksRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLE9BQU87b0JBQ2pELEtBQUssRUFBRSxTQUFTO2lCQUNuQjtnQkFDRDtvQkFDSSxLQUFLLEVBQUUsU0FBUztvQkFDaEIsVUFBVSxFQUFFLFNBQVM7b0JBQ3JCLFVBQVUsRUFBRSxVQUFVO29CQUN0QixNQUFNLEVBQUUsdUJBQXVCO29CQUMvQixlQUFlLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxlQUFlO29CQUM5RSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO29CQUNqRCxLQUFLLEVBQUUsU0FBUztpQkFDbkI7YUFDSixDQUFDLENBQUM7U0FDTjtRQUVELElBQUksV0FBVyxJQUFJLElBQUksSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLElBQUksRUFBRTtZQUNuRCxzQkFBc0IsR0FBRyxzQkFBc0IsQ0FBQyxNQUFNLENBQUM7Z0JBQ25EO29CQUNJLEtBQUssRUFBRSxRQUFRO29CQUNmLFVBQVUsRUFBRSxRQUFRO29CQUNwQixVQUFVLEVBQUUsUUFBUTtvQkFDcEIsTUFBTSxFQUFFLHNCQUFzQjtvQkFDOUIsZUFBZSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsZUFBZTtvQkFDOUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsT0FBTztvQkFDakQsS0FBSyxFQUFFLFNBQVM7aUJBQ25CO2FBQ0osQ0FBQyxDQUFDO1NBQ047UUFFRCxPQUFPLHNCQUFzQixDQUFDO0lBRWxDLENBQUM7SUFFRCwrQkFBK0IsQ0FBQyxZQUFtQjtRQUUvQyxJQUFJLHNCQUFzQixHQUFzQyxFQUFFLENBQUM7UUFFbkUsSUFBSSxPQUFPLEdBQWEsRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUM7UUFDL0IsT0FBTyxDQUFDLElBQUksSUFBSSxFQUFFO1lBQ2QsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDNUMsSUFBSSxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDbkksT0FBTyxJQUFJLENBQUM7aUJBQ2Y7Z0JBQ0QsT0FBTyxLQUFLLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO1NBQ25CO1FBRUQsS0FBSyxJQUFJLENBQUMsSUFBSSxZQUFZLENBQUMsVUFBVSxFQUFFO1lBQ25DLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1NBQzVDO1FBRUQsS0FBSyxJQUFJLENBQUMsSUFBSSxPQUFPLEVBQUU7WUFFbkIsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7WUFDL0IsS0FBSyxJQUFJLEVBQUUsSUFBSSxZQUFZLENBQUMsT0FBTyxFQUFFO2dCQUNqQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRTtvQkFDN0Isa0JBQWtCLEdBQUcsSUFBSSxDQUFDO29CQUMxQixNQUFNO2lCQUNUO2FBQ0o7WUFFRCxJQUFJLGtCQUFrQjtnQkFBRSxTQUFTO1lBRWpDLElBQUksS0FBSyxHQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUN6RixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDO1lBQzlCLElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxDQUFDO1lBQzVILFVBQVUsSUFBSSxDQUFDLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztZQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDN0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxVQUFVLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQztnQkFDcEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxFQUFFO29CQUMvQixVQUFVLElBQUksSUFBSSxDQUFDO2lCQUN0QjthQUNKO1lBQ0QsVUFBVSxJQUFJLGNBQWMsQ0FBQztZQUU3QixzQkFBc0IsQ0FBQyxJQUFJLENBQ3ZCO2dCQUNJLEtBQUssRUFBRSxLQUFLO2dCQUNaLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxjQUFjLEdBQUcsS0FBSyxHQUFHLG1CQUFtQjtnQkFDMUcsVUFBVSxFQUFFLFVBQVU7Z0JBQ3RCLFVBQVUsRUFBRSxVQUFVO2dCQUN0QixlQUFlLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxlQUFlO2dCQUM5RSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO2dCQUNqRCxLQUFLLEVBQUUsU0FBUzthQUNuQixDQUNKLENBQUM7U0FFTDtRQUVELE9BQU8sc0JBQXNCLENBQUM7SUFFbEMsQ0FBQztDQUVKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRWRpdG9yIH0gZnJvbSBcIi4vRWRpdG9yLmpzXCI7XHJcbmltcG9ydCB7IE1vZHVsZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IEtsYXNzLCBnZXRWaXNpYmlsaXR5VXBUbywgSW50ZXJmYWNlLCBWaXNpYmlsaXR5LCBTdGF0aWNDbGFzcyB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBTeW1ib2xUYWJsZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci9wYXJzZXIvU3ltYm9sVGFibGUuanNcIjtcclxuaW1wb3J0IHsgTWFpbiB9IGZyb20gXCIuLi9NYWluLmpzXCI7XHJcbmltcG9ydCB7IE1ldGhvZCB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9UeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheVR5cGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvQXJyYXkuanNcIjtcclxuaW1wb3J0IHsgTWFpbkJhc2UgfSBmcm9tIFwiLi4vTWFpbkJhc2UuanNcIjtcclxuaW1wb3J0IHsgVG9rZW5UeXBlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL2xleGVyL1Rva2VuLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgTXlDb21wbGV0aW9uSXRlbVByb3ZpZGVyIGltcGxlbWVudHMgbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbVByb3ZpZGVyIHtcclxuXHJcbiAgICBpc0NvbnNvbGU6IGJvb2xlYW47XHJcblxyXG4gICAgcHVibGljIHRyaWdnZXJDaGFyYWN0ZXJzOiBzdHJpbmdbXSA9IFsnLicsICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5esOkw7bDvMOfX0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaw4TDlsOcJywgJyAnXTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1haW46IE1haW5CYXNlKSB7XHJcbiAgICB9XHJcblxyXG4gICAgZmlyc3Q6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgcHJvdmlkZUNvbXBsZXRpb25JdGVtcyhtb2RlbDogbW9uYWNvLmVkaXRvci5JVGV4dE1vZGVsLCBwb3NpdGlvbjogbW9uYWNvLlBvc2l0aW9uLCBjb250ZXh0OiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25Db250ZXh0LCB0b2tlbjogbW9uYWNvLkNhbmNlbGxhdGlvblRva2VuKTogbW9uYWNvLmxhbmd1YWdlcy5Qcm92aWRlclJlc3VsdDxtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25MaXN0PiB7XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgbGV0IHN3ID0gdGhpcy5tYWluLmdldE1vbmFjb0VkaXRvcigpLl9jb250ZW50V2lkZ2V0c1tcImVkaXRvci53aWRnZXQuc3VnZ2VzdFdpZGdldFwiXT8ud2lkZ2V0O1xyXG4gICAgICAgICAgICBpZiAoc3cgIT0gbnVsbCAmJiBzdy5fd2lkZ2V0ICE9IG51bGwgJiYgdGhpcy5maXJzdCkge1xyXG4gICAgICAgICAgICAgICAgc3cuX3dpZGdldC50b2dnbGVEZXRhaWxzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZpcnN0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gc3cudG9nZ2xlU3VnZ2VzdGlvbkRldGFpbHMoKTtcclxuICAgICAgICAgICAgLy8gdGhpcy5tYWluLm1vbmFjby50cmlnZ2VyKCdrZXlib2FyZCcsICdlZGl0b3IuYWN0aW9uLnRvZ2dsZVN1Z2dlc3Rpb25EZXRhaWxzJywge30pO1xyXG4gICAgICAgICAgICAvLyB0aGlzLm1haW4ubW9uYWNvLnRyaWdnZXIoJ2tleWJvYXJkJywgJ2VkaXRvci5hY3Rpb24udHJpZ2dlclN1Z2dlc3QnLCB7fSk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMubWFpbi5tb25hY28udHJpZ2dlcihtb25hY28uS2V5TW9kLkN0cmxDbWQgKyBtb25hY28uS2V5Q29kZS5TcGFjZSwgJ3R5cGUnLCB7fSk7XHJcbiAgICAgICAgfSwgMzAwKTtcclxuXHJcbiAgICAgICAgbGV0IGNvbnNvbGVNb2RlbCA9IHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKT8uY29uc29sZT8uZWRpdG9yPy5nZXRNb2RlbCgpO1xyXG4gICAgICAgIHRoaXMuaXNDb25zb2xlID0gbW9kZWwgPT0gY29uc29sZU1vZGVsO1xyXG5cclxuICAgICAgICBsZXQgaXNNYWluV2luZG93ID0gbW9kZWwgPT0gdGhpcy5tYWluLmdldE1vbmFjb0VkaXRvcigpLmdldE1vZGVsKCk7XHJcblxyXG4gICAgICAgIGlmICghKHRoaXMuaXNDb25zb2xlIHx8IGlzTWFpbldpbmRvdykpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IG1vZHVsZTogTW9kdWxlID0gdGhpcy5pc0NvbnNvbGUgPyB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCk/LmNvbnNvbGU/LmNvbXBpbGVyLm1vZHVsZSA6XHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5nZXRDdXJyZW50V29ya3NwYWNlKCkuZ2V0TW9kdWxlQnlNb25hY29Nb2RlbChtb2RlbCk7XHJcblxyXG4gICAgICAgIGlmIChtb2R1bGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzU3RyaW5nTGl0ZXJhbChtb2R1bGUsIHBvc2l0aW9uKSkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGxldCB0ZXh0VW50aWxQb3NpdGlvbiA9IG1vZGVsLmdldFZhbHVlSW5SYW5nZSh7IHN0YXJ0TGluZU51bWJlcjogMSwgc3RhcnRDb2x1bW46IDEsIGVuZExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmVOdW1iZXIsIGVuZENvbHVtbjogcG9zaXRpb24uY29sdW1uIH0pO1xyXG4gICAgICAgIGxldCB0ZXh0QWZ0ZXJQb3NpdGlvbiA9IG1vZGVsLmdldFZhbHVlSW5SYW5nZSh7IHN0YXJ0TGluZU51bWJlcjogcG9zaXRpb24ubGluZU51bWJlciwgc3RhcnRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiwgZW5kTGluZU51bWJlcjogcG9zaXRpb24ubGluZU51bWJlciArIDUsIGVuZENvbHVtbjogMSB9KTtcclxuXHJcbiAgICAgICAgaWYgKGNvbnRleHQudHJpZ2dlckNoYXJhY3RlciA9PSBcIiBcIikge1xyXG4gICAgICAgICAgICBsZXQgbmV3TWF0Y2ggPSB0ZXh0VW50aWxQb3NpdGlvbi5tYXRjaCgvLioobmV3ICkkLyk7XHJcbiAgICAgICAgICAgIGlmIChuZXdNYXRjaCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRDb21wbGV0aW9uSXRlbXNBZnRlck5ldyhtb2R1bGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBjbGFzc01hdGNoID0gdGV4dFVudGlsUG9zaXRpb24ubWF0Y2goLy4qKGNsYXNzIClbXFx3w7bDpMO8w5bDhMOcw588PiAsXSpbXFx3w7bDpMO8w5bDhMOcw588PiBdICQvKTtcclxuICAgICAgICAgICAgaWYgKGNsYXNzTWF0Y2ggIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBjbGFzc0luZGV4ID0gdGV4dFVudGlsUG9zaXRpb24ubGFzdEluZGV4T2YoJ2NsYXNzJyk7XHJcbiAgICAgICAgICAgICAgICBsZXQgY291bnRMb3dlciA9IDA7XHJcbiAgICAgICAgICAgICAgICBsZXQgY291bnRHcmVhdGVyID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBjbGFzc0luZGV4OyBpIDwgdGV4dFVudGlsUG9zaXRpb24ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYyA9IHRleHRVbnRpbFBvc2l0aW9uLmNoYXJBdChpKTtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnPCc6IGNvdW50TG93ZXIrKzsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJz4nOiBjb3VudEdyZWF0ZXIrKzsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldENvbXBsZXRpb25JdGVtc0FmdGVyQ2xhc3MobW9kdWxlLCBjb3VudExvd2VyID4gY291bnRHcmVhdGVyLCB0ZXh0QWZ0ZXJQb3NpdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgaWJNYXRjaCA9IHRleHRBZnRlclBvc2l0aW9uLm1hdGNoKC9eKFtcXHfDtsOkw7zDlsOEw5zDn10qXFwoPykvKTtcclxuICAgICAgICBsZXQgaWRlbnRpZmllckFuZEJyYWNrZXRBZnRlckN1cnNvciA9IFwiXCI7XHJcbiAgICAgICAgaWYgKGliTWF0Y2ggIT0gbnVsbCAmJiBpYk1hdGNoLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgaWRlbnRpZmllckFuZEJyYWNrZXRBZnRlckN1cnNvciA9IGliTWF0Y2hbMF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbGVmdEJyYWNrZXRBbHJlYWR5VGhlcmUgPSBpZGVudGlmaWVyQW5kQnJhY2tldEFmdGVyQ3Vyc29yLmVuZHNXaXRoKFwiKFwiKTtcclxuXHJcbiAgICAgICAgLy8gRmlyc3QgZ3Vlc3M6ICBkb3QgZm9sbG93ZWQgYnkgcGFydCBvZiBJZGVudGlmaWVyP1xyXG4gICAgICAgIGxldCBkb3RNYXRjaCA9IHRleHRVbnRpbFBvc2l0aW9uLm1hdGNoKC8uKihcXC4pKFtcXHfDtsOkw7zDlsOEw5zDn10qKSQvKTtcclxuICAgICAgICBpZiAoZG90TWF0Y2ggIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0NvbnNvbGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKT8uY29uc29sZT8uY29tcGlsZUlmRGlydHkoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5jb21waWxlSWZEaXJ0eSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc3ltYm9sVGFibGUgPSB0aGlzLmlzQ29uc29sZSA/IHRoaXMubWFpbi5nZXREZWJ1Z2dlcigpLmxhc3RTeW1ib2x0YWJsZSA6IG1vZHVsZS5maW5kU3ltYm9sVGFibGVBdFBvc2l0aW9uKHBvc2l0aW9uLmxpbmVOdW1iZXIsIHBvc2l0aW9uLmNvbHVtbik7XHJcbiAgICAgICAgbGV0IGNsYXNzQ29udGV4dCA9IHN5bWJvbFRhYmxlID09IG51bGwgPyBudWxsIDogc3ltYm9sVGFibGUuY2xhc3NDb250ZXh0O1xyXG5cclxuXHJcbiAgICAgICAgaWYgKGRvdE1hdGNoICE9IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29tcGxldGlvbkl0ZW1zQWZ0ZXJEb3QoZG90TWF0Y2gsIHBvc2l0aW9uLCBtb2R1bGUsXHJcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyQW5kQnJhY2tldEFmdGVyQ3Vyc29yLCBjbGFzc0NvbnRleHQsIGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB2YXJPckNsYXNzTWF0Y2ggPSB0ZXh0VW50aWxQb3NpdGlvbi5tYXRjaCgvLipbXlxcd8O2w6TDvMOWw4TDnMOfXShbXFx3w7bDpMO8w5bDhMOcw59dKikkLyk7XHJcblxyXG4gICAgICAgIGlmICh2YXJPckNsYXNzTWF0Y2ggPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB2YXJPckNsYXNzTWF0Y2ggPSB0ZXh0VW50aWxQb3NpdGlvbi5tYXRjaCgvXihbXFx3w7bDpMO8w5bDhMOcw59dKikkLyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodmFyT3JDbGFzc01hdGNoICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldENvbXBsZXRpb25JdGVtc0luc2lkZUlkZW50aWZpZXIodmFyT3JDbGFzc01hdGNoLCBwb3NpdGlvbiwgbW9kdWxlLFxyXG4gICAgICAgICAgICAgICAgaWRlbnRpZmllckFuZEJyYWNrZXRBZnRlckN1cnNvciwgY2xhc3NDb250ZXh0LCBsZWZ0QnJhY2tldEFscmVhZHlUaGVyZSwgc3ltYm9sVGFibGUpO1xyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBpc1N0cmluZ0xpdGVyYWwobW9kdWxlOiBNb2R1bGUsIHBvc2l0aW9uOiBtb25hY28uUG9zaXRpb24pIHtcclxuXHJcbiAgICAgICAgbGV0IHRva2VuTGlzdCA9IG1vZHVsZS50b2tlbkxpc3Q7XHJcbiAgICAgICAgaWYgKHRva2VuTGlzdCA9PSBudWxsIHx8IHRva2VuTGlzdC5sZW5ndGggPT0gMCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICBsZXQgcG9zTWluID0gMDtcclxuICAgICAgICBsZXQgcG9zTWF4ID0gdG9rZW5MaXN0Lmxlbmd0aCAtIDE7XHJcbiAgICAgICAgbGV0IHBvczogbnVtYmVyO1xyXG5cclxuICAgICAgICBsZXQgd2F0Y2hEb2cgPSAxMDAwO1xyXG5cclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBsZXQgcG9zT2xkID0gcG9zO1xyXG4gICAgICAgICAgICBwb3MgPSBNYXRoLnJvdW5kKChwb3NNYXggKyBwb3NNaW4pIC8gMik7XHJcblxyXG4gICAgICAgICAgICBpZiAocG9zT2xkID09IHBvcykgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgd2F0Y2hEb2ctLTtcclxuICAgICAgICAgICAgaWYgKHdhdGNoRG9nID09IDApIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIGxldCB0ID0gdG9rZW5MaXN0W3Bvc107XHJcbiAgICAgICAgICAgIGxldCBwID0gdC5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAgIGlmIChwLmxpbmUgPCBwb3NpdGlvbi5saW5lTnVtYmVyIHx8IHAubGluZSA9PSBwb3NpdGlvbi5saW5lTnVtYmVyICYmIHAuY29sdW1uICsgcC5sZW5ndGggPCBwb3NpdGlvbi5jb2x1bW4pIHtcclxuICAgICAgICAgICAgICAgIHBvc01pbiA9IHBvcztcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocC5saW5lID4gcG9zaXRpb24ubGluZU51bWJlciB8fCBwLmxpbmUgPT0gcG9zaXRpb24ubGluZU51bWJlciAmJiBwLmNvbHVtbiA+IHBvc2l0aW9uLmNvbHVtbikge1xyXG4gICAgICAgICAgICAgICAgcG9zTWF4ID0gcG9zO1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0LnR0ID09IFRva2VuVHlwZS5zdHJpbmdDb25zdGFudDtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRDb21wbGV0aW9uSXRlbXNBZnRlck5ldyhtb2R1bGU6IE1vZHVsZSk6IG1vbmFjby5sYW5ndWFnZXMuUHJvdmlkZXJSZXN1bHQ8bW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uTGlzdD4ge1xyXG4gICAgICAgIGxldCBjb21wbGV0aW9uSXRlbXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1bXSA9IFtdO1xyXG5cclxuICAgICAgICBjb21wbGV0aW9uSXRlbXMgPSBjb21wbGV0aW9uSXRlbXMuY29uY2F0KHRoaXMubWFpbi5nZXRDdXJyZW50V29ya3NwYWNlKCkubW9kdWxlU3RvcmUuZ2V0VHlwZUNvbXBsZXRpb25JdGVtcyhtb2R1bGUsIHVuZGVmaW5lZCkpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbXBsZXRpb25JdGVtcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgaXRlbSA9IGNvbXBsZXRpb25JdGVtc1tpXTtcclxuICAgICAgICAgICAgaWYgKGl0ZW0uZGV0YWlsLm1hdGNoKCdQcmltaXRpdicpKSB7XHJcbiAgICAgICAgICAgICAgICBjb21wbGV0aW9uSXRlbXMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgaS0tO1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGl0ZW1bXCJnZW5lcmljXCJdKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLmluc2VydFRleHQgKz0gXCI8PigkMClcIjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uaW5zZXJ0VGV4dCArPSBcIigkMClcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpdGVtLmluc2VydFRleHRSdWxlcyA9IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1JbnNlcnRUZXh0UnVsZS5JbnNlcnRBc1NuaXBwZXQ7XHJcbiAgICAgICAgICAgIGl0ZW0uY29tbWFuZCA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBcImVkaXRvci5hY3Rpb24udHJpZ2dlclBhcmFtZXRlckhpbnRzXCIsXHJcbiAgICAgICAgICAgICAgICB0aXRsZTogJzEyMycsXHJcbiAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtdXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25zOiBjb21wbGV0aW9uSXRlbXNcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRDb21wbGV0aW9uSXRlbXNBZnRlckNsYXNzKG1vZHVsZTogTW9kdWxlLCBpbnNpZGVHZW5lcmljUGFyYW1ldGVyRGVmaW5pdGlvbjogYm9vbGVhbiwgdGV4dEFmdGVyUG9zaXRpb246IHN0cmluZyk6IG1vbmFjby5sYW5ndWFnZXMuUHJvdmlkZXJSZXN1bHQ8bW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uTGlzdD4ge1xyXG4gICAgICAgIGxldCBjb21wbGV0aW9uSXRlbXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1bXSA9IFtdO1xyXG5cclxuICAgICAgICBsZXQgc3RhcnRzV2l0aEN1cmx5QnJhY2U6IGJvb2xlYW4gPSB0ZXh0QWZ0ZXJQb3NpdGlvbi50cmltTGVmdCgpLnN0YXJ0c1dpdGgoXCJ7XCIpO1xyXG5cclxuICAgICAgICBjb21wbGV0aW9uSXRlbXMgPSBjb21wbGV0aW9uSXRlbXMuY29uY2F0KFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6IFwiZXh0ZW5kc1wiLFxyXG4gICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogXCJleHRlbmRzICQxXCIgKyAoaW5zaWRlR2VuZXJpY1BhcmFtZXRlckRlZmluaXRpb24gfHwgc3RhcnRzV2l0aEN1cmx5QnJhY2UgPyBcIlwiIDogXCIge1xcblxcdCQwXFxufVwiKSxcclxuICAgICAgICAgICAgICAgIGRldGFpbDogXCJleHRlbmRzLU9wZXJhdG9yXCIsXHJcbiAgICAgICAgICAgICAgICBpbnNlcnRUZXh0UnVsZXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1JbnNlcnRUZXh0UnVsZS5JbnNlcnRBc1NuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgIGNvbW1hbmQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJlZGl0b3IuYWN0aW9uLnRyaWdnZXJTdWdnZXN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICcxMjMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6IFwiaW1wbGVtZW50c1wiLFxyXG4gICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogXCJpbXBsZW1lbnRzICQxXCIgKyAoaW5zaWRlR2VuZXJpY1BhcmFtZXRlckRlZmluaXRpb24gfHwgc3RhcnRzV2l0aEN1cmx5QnJhY2UgPyBcIlwiIDogXCIge1xcblxcdCQwXFxufVwiKSxcclxuICAgICAgICAgICAgICAgIGRldGFpbDogXCJpbXBsZW1lbnRzLU9wZXJhdG9yXCIsXHJcbiAgICAgICAgICAgICAgICBpbnNlcnRUZXh0UnVsZXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1JbnNlcnRUZXh0UnVsZS5JbnNlcnRBc1NuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgIGNvbW1hbmQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJlZGl0b3IuYWN0aW9uLnRyaWdnZXJTdWdnZXN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICcxMjMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6IFwie31cIixcclxuICAgICAgICAgICAgICAgIGluc2VydFRleHQ6IFwie1xcblxcdCQwXFxufVwiLFxyXG4gICAgICAgICAgICAgICAgZGV0YWlsOiBcIktsYXNzZW5ydW1wZlwiLFxyXG4gICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJ1bGVzOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtSW5zZXJ0VGV4dFJ1bGUuSW5zZXJ0QXNTbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAga2luZDogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUtpbmQuU25pcHBldCxcclxuICAgICAgICAgICAgICAgIHJhbmdlOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdKTtcclxuXHJcbiAgICAgICAgLy8gY29tcGxldGlvbkl0ZW1zID0gY29tcGxldGlvbkl0ZW1zLmNvbmNhdCh0aGlzLm1haW4uZ2V0Q3VycmVudFdvcmtzcGFjZSgpLm1vZHVsZVN0b3JlLmdldFR5cGVDb21wbGV0aW9uSXRlbXMobW9kdWxlLCB1bmRlZmluZWQpKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25zOiBjb21wbGV0aW9uSXRlbXNcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRDb21wbGV0aW9uSXRlbXNJbnNpZGVJZGVudGlmaWVyKHZhck9yQ2xhc3NNYXRjaDogUmVnRXhwTWF0Y2hBcnJheSwgcG9zaXRpb246IG1vbmFjby5Qb3NpdGlvbiwgbW9kdWxlOiBNb2R1bGUsIGlkZW50aWZpZXJBbmRCcmFja2V0QWZ0ZXJDdXJzb3I6IHN0cmluZywgY2xhc3NDb250ZXh0OiBLbGFzcyB8IFN0YXRpY0NsYXNzLFxyXG4gICAgICAgIGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlOiBib29sZWFuLCBzeW1ib2xUYWJsZTogU3ltYm9sVGFibGUpOiBtb25hY28ubGFuZ3VhZ2VzLlByb3ZpZGVyUmVzdWx0PG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkxpc3Q+IHtcclxuICAgICAgICBsZXQgdGV4dCA9IHZhck9yQ2xhc3NNYXRjaFsxXTtcclxuXHJcbiAgICAgICAgbGV0IHJhbmdlVG9SZXBsYWNlOiBtb25hY28uSVJhbmdlID1cclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHN0YXJ0TGluZU51bWJlcjogcG9zaXRpb24ubGluZU51bWJlciwgc3RhcnRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiAtIHRleHQubGVuZ3RoLFxyXG4gICAgICAgICAgICBlbmRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lTnVtYmVyLCBlbmRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiArIGlkZW50aWZpZXJBbmRCcmFja2V0QWZ0ZXJDdXJzb3IubGVuZ3RoXHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIGxldCBjb21wbGV0aW9uSXRlbXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1bXSA9IFtdO1xyXG5cclxuICAgICAgICBpZiAoc3ltYm9sVGFibGU/LmNsYXNzQ29udGV4dCAhPSBudWxsICYmIHN5bWJvbFRhYmxlPy5tZXRob2QgPT0gbnVsbCAmJiBzeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQgaW5zdGFuY2VvZiBLbGFzcykge1xyXG4gICAgICAgICAgICBjb21wbGV0aW9uSXRlbXMgPSBjb21wbGV0aW9uSXRlbXMuY29uY2F0KHRoaXMuZ2V0T3ZlcnJpZGFibGVNZXRob2RzQ29tcGxldGlvbihzeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzeW1ib2xUYWJsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNvbXBsZXRpb25JdGVtcyA9IGNvbXBsZXRpb25JdGVtcy5jb25jYXQoc3ltYm9sVGFibGUuZ2V0TG9jYWxWYXJpYWJsZUNvbXBsZXRpb25JdGVtcyhyYW5nZVRvUmVwbGFjZSkubWFwKGNpID0+IHtcclxuICAgICAgICAgICAgICAgIGNpLnNvcnRUZXh0ID0gXCJhYWFcIiArIGNpLmxhYmVsO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNpO1xyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb21wbGV0aW9uSXRlbXMgPSBjb21wbGV0aW9uSXRlbXMuY29uY2F0KHRoaXMubWFpbi5nZXRDdXJyZW50V29ya3NwYWNlKCkubW9kdWxlU3RvcmUuZ2V0VHlwZUNvbXBsZXRpb25JdGVtcyhtb2R1bGUsIHJhbmdlVG9SZXBsYWNlKSk7XHJcblxyXG4gICAgICAgIGlmIChjbGFzc0NvbnRleHQgIT0gbnVsbCAmJiBzeW1ib2xUYWJsZT8ubWV0aG9kICE9IG51bGwpIHtcclxuICAgICAgICAgICAgY29tcGxldGlvbkl0ZW1zID0gY29tcGxldGlvbkl0ZW1zLmNvbmNhdChcclxuICAgICAgICAgICAgICAgIGNsYXNzQ29udGV4dC5nZXRDb21wbGV0aW9uSXRlbXMoVmlzaWJpbGl0eS5wcml2YXRlLCBsZWZ0QnJhY2tldEFscmVhZHlUaGVyZSwgaWRlbnRpZmllckFuZEJyYWNrZXRBZnRlckN1cnNvciwgcmFuZ2VUb1JlcGxhY2UsIHN5bWJvbFRhYmxlLm1ldGhvZClcclxuICAgICAgICAgICAgICAgICAgICAubWFwKGNpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2kuc29ydFRleHQgPSBcImFhXCIgKyBjaS5sYWJlbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGNvbXBsZXRpb25JdGVtcy5wdXNoKFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcInN1cGVyXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyVGV4dDogXCJzdXBlclwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHQ6IFwic3VwZXIuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcIkF1ZnJ1ZiBlaW5lciBNZXRob2RlIGVpbmVyIEJhc2lza2xhc3NlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJ1bGVzOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtSW5zZXJ0VGV4dFJ1bGUuSW5zZXJ0QXNTbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1LaW5kLlNuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBcImVkaXRvci5hY3Rpb24udHJpZ2dlclN1Z2dlc3RcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICcxMjMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgfSAgICBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIFVzZSBmaWxlbmFtZSB0byBnZW5lcmF0ZSBjb21wbGV0aW9uLWl0ZW0gZm9yIGNsYXNzIC4uLiA/XHJcbiAgICAgICAgICAgIGxldCBuYW1lID0gbW9kdWxlLmZpbGU/Lm5hbWU7XHJcbiAgICAgICAgICAgIGlmIChuYW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmIChuYW1lLmVuZHNXaXRoKFwiLmphdmFcIikpIG5hbWUgPSBuYW1lLnN1YnN0cigwLCBuYW1lLmluZGV4T2YoXCIuamF2YVwiKSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbSA9IG5hbWUubWF0Y2goLyhbXFx3w7bDpMO8w5bDhMOcw59dKikkLyk7XHJcbiAgICAgICAgICAgICAgICBpZiAobW9kdWxlLmNsYXNzRGVmaW5pdGlvbnNBU1QubGVuZ3RoID09IDAgJiYgbSAhPSBudWxsICYmIG0ubGVuZ3RoID4gMCAmJiBtWzBdID09IG5hbWUgJiYgbmFtZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcclxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0aW9uSXRlbXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcImNsYXNzIFwiICsgbmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyVGV4dDogXCJjbGFzc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0OiBcImNsYXNzICR7MTpcIiArIG5hbWUgKyBcIn0ge1xcblxcdCQwXFxufVxcblwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWw6IFwiRGVmaW5pdGlvbiBkZXIgS2xhc3NlIFwiICsgbmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJ1bGVzOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtSW5zZXJ0VGV4dFJ1bGUuSW5zZXJ0QXNTbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbXBsZXRpb25JdGVtcyA9IGNvbXBsZXRpb25JdGVtcy5jb25jYXQodGhpcy5nZXRLZXl3b3JkQ29tcGxldGlvbihzeW1ib2xUYWJsZSkpO1xyXG5cclxuXHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJDb21wbGV0ZSB2YXJpYWJsZS9DbGFzcy9LZXl3b3JkIFwiICsgdGV4dCk7XHJcblxyXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xyXG4gICAgICAgICAgICBzdWdnZXN0aW9uczogY29tcGxldGlvbkl0ZW1zXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29tcGxldGlvbkl0ZW1zQWZ0ZXJEb3QoZG90TWF0Y2g6IFJlZ0V4cE1hdGNoQXJyYXksIHBvc2l0aW9uOiBtb25hY28uUG9zaXRpb24sIG1vZHVsZTogTW9kdWxlLFxyXG4gICAgICAgIGlkZW50aWZpZXJBbmRCcmFja2V0QWZ0ZXJDdXJzb3I6IHN0cmluZywgY2xhc3NDb250ZXh0OiBLbGFzcyB8IFN0YXRpY0NsYXNzLFxyXG4gICAgICAgIGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlOiBib29sZWFuKTogbW9uYWNvLmxhbmd1YWdlcy5Qcm92aWRlclJlc3VsdDxtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25MaXN0PiB7XHJcbiAgICAgICAgbGV0IHRleHRBZnRlckRvdCA9IGRvdE1hdGNoWzJdO1xyXG4gICAgICAgIGxldCBkb3RDb2x1bW4gPSBwb3NpdGlvbi5jb2x1bW4gLSB0ZXh0QWZ0ZXJEb3QubGVuZ3RoIC0gMTtcclxuICAgICAgICBsZXQgdFN0YXRpYyA9IG1vZHVsZS5nZXRUeXBlQXRQb3NpdGlvbihwb3NpdGlvbi5saW5lTnVtYmVyLCBkb3RDb2x1bW4pO1xyXG4gICAgICAgIGxldCByYW5nZVRvUmVwbGFjZTogbW9uYWNvLklSYW5nZSA9XHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBzdGFydExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmVOdW1iZXIsIHN0YXJ0Q29sdW1uOiBwb3NpdGlvbi5jb2x1bW4gLSB0ZXh0QWZ0ZXJEb3QubGVuZ3RoLFxyXG4gICAgICAgICAgICBlbmRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lTnVtYmVyLCBlbmRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiArIGlkZW50aWZpZXJBbmRCcmFja2V0QWZ0ZXJDdXJzb3IubGVuZ3RoXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodFN0YXRpYyA9PSBudWxsKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgbGV0IHsgdHlwZSwgaXNTdGF0aWMgfSA9IHRTdGF0aWM7XHJcblxyXG5cclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkNvbXBsZXRlIGVsZW1lbnQucHJhZWZpeDsgcHJhZWZpeDogXCIgKyB0ZXh0QWZ0ZXJEb3QgKyBcIiwgVHlwZTogXCIgKyAodHlwZSA9PSBudWxsID8gbnVsbCA6IHR5cGUuaWRlbnRpZmllcikpO1xyXG5cclxuXHJcbiAgICAgICAgaWYgKHR5cGUgaW5zdGFuY2VvZiBLbGFzcykge1xyXG5cclxuICAgICAgICAgICAgbGV0IHZpc2liaWxpdHlVcFRvID0gZ2V0VmlzaWJpbGl0eVVwVG8odHlwZSwgY2xhc3NDb250ZXh0KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChpc1N0YXRpYykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdGlvbnM6IHR5cGUuc3RhdGljQ2xhc3MuZ2V0Q29tcGxldGlvbkl0ZW1zKHZpc2liaWxpdHlVcFRvLCBsZWZ0QnJhY2tldEFscmVhZHlUaGVyZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllckFuZEJyYWNrZXRBZnRlckN1cnNvciwgcmFuZ2VUb1JlcGxhY2UpXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb25zOiB0eXBlLmdldENvbXBsZXRpb25JdGVtcyh2aXNpYmlsaXR5VXBUbywgbGVmdEJyYWNrZXRBbHJlYWR5VGhlcmUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXJBbmRCcmFja2V0QWZ0ZXJDdXJzb3IsIHJhbmdlVG9SZXBsYWNlLCBudWxsKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0eXBlIGluc3RhbmNlb2YgSW50ZXJmYWNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgc3VnZ2VzdGlvbnM6IHR5cGUuZ2V0Q29tcGxldGlvbkl0ZW1zKGxlZnRCcmFja2V0QWxyZWFkeVRoZXJlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXJBbmRCcmFja2V0QWZ0ZXJDdXJzb3IsIHJhbmdlVG9SZXBsYWNlKVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0eXBlIGluc3RhbmNlb2YgQXJyYXlUeXBlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgc3VnZ2VzdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcImxlbmd0aFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJUZXh0OiBcImxlbmd0aFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5GaWVsZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogXCJsZW5ndGhcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHJhbmdlVG9SZXBsYWNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudGF0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogXCJBbnphaGwgZGVyIEVsZW1lbnRlIGRlcyBBcnJheXNcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEtleXdvcmRDb21wbGV0aW9uKHN5bWJvbFRhYmxlOiBTeW1ib2xUYWJsZSk6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1bXSB7XHJcbiAgICAgICAgbGV0IGtleXdvcmRDb21wbGV0aW9uSXRlbXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1bXSA9IFtdO1xyXG4gICAgICAgIGlmICghdGhpcy5pc0NvbnNvbGUgJiYgKHN5bWJvbFRhYmxlPy5jbGFzc0NvbnRleHQgPT0gbnVsbCB8fCBzeW1ib2xUYWJsZT8ubWV0aG9kICE9IG51bGwpKVxyXG4gICAgICAgICAgICBrZXl3b3JkQ29tcGxldGlvbkl0ZW1zID0ga2V5d29yZENvbXBsZXRpb25JdGVtcy5jb25jYXQoW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcIndoaWxlKEJlZGluZ3VuZyl7QW53ZWlzdW5nZW59XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcIndoaWxlLVdpZWRlcmhvbHVuZ1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclRleHQ6ICd3aGlsZScsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaW5zZXJ0VGV4dDogXCJ3aGlsZSgkezE6QmVkaW5ndW5nfSl7XFxuXFx0JDBcXG59XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogXCJ3aGlsZSgkMSl7XFxuXFx0JDBcXG59XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogXCJlZGl0b3IuYWN0aW9uLnRyaWdnZXJQYXJhbWV0ZXJIaW50c1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJzEyMycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW11cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHRSdWxlczogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUluc2VydFRleHRSdWxlLkluc2VydEFzU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6IFwiZm9yKCl7fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGluc2VydFRleHQ6IFwiZm9yKCR7MTpTdGFydGFud2Vpc3VuZ307JHsyOlNvbGFuZ2UtQmVkaW5ndW5nfTskezM6TmFjaF9qZWRlcl9XaWVkZXJob2x1bmd9KXtcXG5cXHQkezA6QW53ZWlzdW5nZW59XFxufVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHQ6IFwiZm9yKCAkMSA7ICQyIDsgJDMgKXtcXG5cXHQkMFxcbn1cIixcclxuICAgICAgICAgICAgICAgICAgICBkZXRhaWw6IFwiZm9yLVdpZWRlcmhvbHVuZ1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclRleHQ6ICdmb3InLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbW1hbmQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgaWQ6IFwiZWRpdG9yLmFjdGlvbi50cmlnZ2VyUGFyYW1ldGVySGludHNcIixcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgdGl0bGU6ICcxMjMnLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBhcmd1bWVudHM6IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gfSwgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJ1bGVzOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtSW5zZXJ0VGV4dFJ1bGUuSW5zZXJ0QXNTbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1LaW5kLlNuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogXCJmb3IoaW50IGkgPSAwOyBpIDwgMTA7IGkrKyl7fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGluc2VydFRleHQ6IFwiZm9yKCR7MTpTdGFydGFud2Vpc3VuZ307JHsyOlNvbGFuZ2UtQmVkaW5ndW5nfTskezM6TmFjaF9qZWRlcl9XaWVkZXJob2x1bmd9KXtcXG5cXHQkezA6QW53ZWlzdW5nZW59XFxufVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHQ6IFwiZm9yKGludCAkezE6aX0gPSAwOyAkezE6aX0gPCAkezI6MTB9OyAkezE6aX0rKyl7XFxuXFx0JDBcXG59XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcIlrDpGhsLVdpZWRlcmhvbHVuZ1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclRleHQ6ICdmb3InLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbW1hbmQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgaWQ6IFwiZWRpdG9yLmFjdGlvbi50cmlnZ2VyUGFyYW1ldGVySGludHNcIixcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgdGl0bGU6ICcxMjMnLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBhcmd1bWVudHM6IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gfSwgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJ1bGVzOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtSW5zZXJ0VGV4dFJ1bGUuSW5zZXJ0QXNTbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1LaW5kLlNuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogXCJzd2l0Y2goKXtjYXNlLi4ufVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGluc2VydFRleHQ6IFwic3dpdGNoKCR7MTpTZWxla3Rvcn0pe1xcblxcdGNhc2UgJHsyOldlcnRfMX06IHtcXG5cXHRcXHQgJHszOkFud2Vpc3VuZ2VufVxcblxcdFxcdH1cXG5cXHRjYXNlICR7NDpXZXJ0XzJ9OiB7XFxuXFx0XFx0ICR7MDpBbndlaXN1bmdlbn1cXG5cXHRcXHR9XFxufVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHQ6IFwic3dpdGNoKCQxKXtcXG5cXHRjYXNlICQyOlxcblxcdFxcdCAkM1xcblxcdFxcdGJyZWFrO1xcblxcdGNhc2UgJDQ6XFxuXFx0XFx0ICQ1XFxuXFx0XFx0YnJlYWs7XFxuXFx0ZGVmYXVsdDpcXG5cXHRcXHQgJDBcXG59XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcInN3aXRjaC1BbndlaXN1bmdcIixcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJUZXh0OiAnc3dpdGNoJyxcclxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBcImVkaXRvci5hY3Rpb24udHJpZ2dlclBhcmFtZXRlckhpbnRzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnMTIzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbXVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJ1bGVzOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtSW5zZXJ0VGV4dFJ1bGUuSW5zZXJ0QXNTbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1LaW5kLlNuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogXCJpZigpe31cIixcclxuICAgICAgICAgICAgICAgICAgICAvLyBpbnNlcnRUZXh0OiBcImlmKCR7MTpCZWRpbmd1bmd9KXtcXG5cXHQkezA6QW53ZWlzdW5nZW59XFxufVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHQ6IFwiaWYoJDEpe1xcblxcdCQwXFxufVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogXCJCZWRpbmd1bmdcIixcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJUZXh0OiAnaWYnLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbW1hbmQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgaWQ6IFwiZWRpdG9yLmFjdGlvbi50cmlnZ2VyUGFyYW1ldGVySGludHNcIixcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgdGl0bGU6ICcxMjMnLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBhcmd1bWVudHM6IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gfSxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0UnVsZXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1JbnNlcnRUZXh0UnVsZS5JbnNlcnRBc1NuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAga2luZDogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUtpbmQuU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICByYW5nZTogdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcImlmKCl7fSBlbHNlIHt9XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogXCJpZigkMSl7XFxuXFx0JDJcXG59XFxuZWxzZSB7XFxuXFx0JDBcXG59XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcIlp3ZWlzZWl0aWdlIEJlZGluZ3VuZ1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclRleHQ6ICdpZicsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29tbWFuZDoge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBpZDogXCJlZGl0b3IuYWN0aW9uLnRyaWdnZXJQYXJhbWV0ZXJIaW50c1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICB0aXRsZTogJzEyMycsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIGFyZ3VtZW50czogW11cclxuICAgICAgICAgICAgICAgICAgICAvLyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHRSdWxlczogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUluc2VydFRleHRSdWxlLkluc2VydEFzU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6IFwiZWxzZSB7fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHQ6IFwiZWxzZSB7XFxuXFx0JDBcXG59XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcImVsc2UtWndlaWdcIixcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJUZXh0OiAnZWwnLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHRSdWxlczogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUluc2VydFRleHRSdWxlLkluc2VydEFzU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF0pO1xyXG5cclxuICAgICAgICBpZiAoc3ltYm9sVGFibGU/LmNsYXNzQ29udGV4dCA9PSBudWxsIHx8IHN5bWJvbFRhYmxlPy5tZXRob2QgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAga2V5d29yZENvbXBsZXRpb25JdGVtcyA9IGtleXdvcmRDb21wbGV0aW9uSXRlbXMuY29uY2F0KFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogXCJpbnN0YW5jZW9mXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogXCJpbnN0YW5jZW9mICQwXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcImluc3RhbmNlb2YtT3BlcmF0b3JcIixcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0UnVsZXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1JbnNlcnRUZXh0UnVsZS5JbnNlcnRBc1NuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAga2luZDogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUtpbmQuU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICByYW5nZTogdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcInByaW50XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogXCJwcmludCgkMSk7JDBcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXRhaWw6IFwiQXVzZ2FiZSAoZ2dmLiBtaXQgRmFyYmUgXFxuYWxzIHp3ZWl0ZW0gUGFyYW1ldGVyKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IFwiZWRpdG9yLmFjdGlvbi50cmlnZ2VyUGFyYW1ldGVySGludHNcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICcxMjMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0UnVsZXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1JbnNlcnRUZXh0UnVsZS5JbnNlcnRBc1NuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAga2luZDogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUtpbmQuU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICByYW5nZTogdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcInByaW50bG5cIixcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0OiBcInByaW50bG4oJDEpOyQwXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcIkF1c2dhYmUgbWl0IFplaWxlbnVtYnJ1Y2ggKGdnZi4gbWl0IFxcbkZhcmJlIGFscyB6d2VpdGVtIFBhcmFtZXRlcilcIixcclxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBcImVkaXRvci5hY3Rpb24udHJpZ2dlclBhcmFtZXRlckhpbnRzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnMTIzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbXVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJ1bGVzOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtSW5zZXJ0VGV4dFJ1bGUuSW5zZXJ0QXNTbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1LaW5kLlNuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIF0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmlzQ29uc29sZSAmJiAoc3ltYm9sVGFibGUgPT0gbnVsbCB8fCBzeW1ib2xUYWJsZS5jbGFzc0NvbnRleHQgPT0gbnVsbCkpIHtcclxuICAgICAgICAgICAga2V5d29yZENvbXBsZXRpb25JdGVtcyA9IGtleXdvcmRDb21wbGV0aW9uSXRlbXMuY29uY2F0KFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogXCJjbGFzc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclRleHQ6IFwiY2xhc3NcIixcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0OiBcImNsYXNzICR7MTpCZXplaWNobmVyfSB7XFxuXFx0JDBcXG59XFxuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcIktsYXNzZW5kZWZpbml0aW9uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJ1bGVzOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtSW5zZXJ0VGV4dFJ1bGUuSW5zZXJ0QXNTbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1LaW5kLlNuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogXCJwdWJsaWMgY2xhc3NcIixcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJUZXh0OiBcInB1YmxpYyBjbGFzc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHQ6IFwicHVibGljIGNsYXNzICR7MTpCZXplaWNobmVyfSB7XFxuXFx0JDBcXG59XFxuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcIsOWZmZlbnRsaWNoZSBLbGFzc2VuZGVmaW5pdGlvblwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHRSdWxlczogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUluc2VydFRleHRSdWxlLkluc2VydEFzU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIF0pO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuaXNDb25zb2xlICYmIHN5bWJvbFRhYmxlPy5tZXRob2QgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBrZXl3b3JkQ29tcGxldGlvbkl0ZW1zID0ga2V5d29yZENvbXBsZXRpb25JdGVtcy5jb25jYXQoW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcInB1YmxpY1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclRleHQ6IFwicHVibGljXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogXCJwdWJsaWMgXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcIlNjaGzDvHNzZWx3b3J0IHB1YmxpY1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHRSdWxlczogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUluc2VydFRleHRSdWxlLkluc2VydEFzU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6IFwicHVibGljIHZvaWQgbWV0aG9kKCl7fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclRleHQ6IFwicHVibGljXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogXCJwdWJsaWMgJHsxOnZvaWR9ICR7MjpCZXplaWNobmVyfSgkezM6UGFyYW1ldGVyfSkge1xcblxcdCQwXFxufVxcblwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogXCJNZXRob2RlbmRlZmluaXRpb25cIixcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0UnVsZXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1JbnNlcnRUZXh0UnVsZS5JbnNlcnRBc1NuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAga2luZDogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUtpbmQuU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICByYW5nZTogdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcInByb3RlY3RlZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclRleHQ6IFwicHJvdGVjdGVkXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogXCJwcm90ZWN0ZWQgXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBcIlNjaGzDvHNzZWx3b3J0IHByb3RlY3RlZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHRSdWxlczogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUluc2VydFRleHRSdWxlLkluc2VydEFzU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6IFwic3RhdGljXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyVGV4dDogXCJzdGF0aWNcIixcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0OiBcInN0YXRpYyBcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXRhaWw6IFwiU2NobMO8c3NlbHdvcnQgc3RhdGljXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJ1bGVzOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtSW5zZXJ0VGV4dFJ1bGUuSW5zZXJ0QXNTbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1LaW5kLlNuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogXCJwcml2YXRlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyVGV4dDogXCJwcml2YXRlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dDogXCJwcml2YXRlIFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogXCJTY2hsw7xzc2Vsd29ydCBwcml2YXRlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJ1bGVzOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtSW5zZXJ0VGV4dFJ1bGUuSW5zZXJ0QXNTbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1LaW5kLlNuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzeW1ib2xUYWJsZSAhPSBudWxsICYmIHN5bWJvbFRhYmxlLm1ldGhvZCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGtleXdvcmRDb21wbGV0aW9uSXRlbXMgPSBrZXl3b3JkQ29tcGxldGlvbkl0ZW1zLmNvbmNhdChbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6IFwicmV0dXJuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyVGV4dDogXCJyZXR1cm5cIixcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0OiBcInJldHVyblwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogXCJTY2hsw7xzc2Vsd29ydCByZXR1cm5cIixcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0UnVsZXM6IG1vbmFjby5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1JbnNlcnRUZXh0UnVsZS5JbnNlcnRBc1NuaXBwZXQsXHJcbiAgICAgICAgICAgICAgICAgICAga2luZDogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUtpbmQuU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICByYW5nZTogdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGtleXdvcmRDb21wbGV0aW9uSXRlbXM7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldE92ZXJyaWRhYmxlTWV0aG9kc0NvbXBsZXRpb24oY2xhc3NDb250ZXh0OiBLbGFzcykge1xyXG5cclxuICAgICAgICBsZXQga2V5d29yZENvbXBsZXRpb25JdGVtczogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbVtdID0gW107XHJcblxyXG4gICAgICAgIGxldCBtZXRob2RzOiBNZXRob2RbXSA9IFtdO1xyXG4gICAgICAgIGxldCBjID0gY2xhc3NDb250ZXh0LmJhc2VDbGFzcztcclxuICAgICAgICB3aGlsZSAoYyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIG1ldGhvZHMgPSBtZXRob2RzLmNvbmNhdChjLm1ldGhvZHMuZmlsdGVyKChtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAobS5pc0Fic3RyYWN0IHx8IChtLnByb2dyYW0gPT0gbnVsbCAmJiBtLmludm9rZSA9PSBudWxsKSB8fCBtLmlkZW50aWZpZXIuc3RhcnRzV2l0aCgnb25Nb3VzZScpIHx8IG0uaWRlbnRpZmllci5zdGFydHNXaXRoKCdvbktleScpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgYyA9IGMuYmFzZUNsYXNzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSBvZiBjbGFzc0NvbnRleHQuaW1wbGVtZW50cykge1xyXG4gICAgICAgICAgICBtZXRob2RzID0gbWV0aG9kcy5jb25jYXQoaS5nZXRNZXRob2RzKCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgbSBvZiBtZXRob2RzKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgYWxyZWFkeUltcGxlbWVudGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG0xIG9mIGNsYXNzQ29udGV4dC5tZXRob2RzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobTEuc2lnbmF0dXJlID09IG0uc2lnbmF0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWxyZWFkeUltcGxlbWVudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGFscmVhZHlJbXBsZW1lbnRlZCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBsZXQgbGFiZWw6IHN0cmluZyA9IChtLmlzQWJzdHJhY3QgPyBcImltcGxlbWVudCBcIiA6IFwib3ZlcnJpZGUgXCIpICsgbS5nZXRDb21wbGV0aW9uTGFiZWwoKTtcclxuICAgICAgICAgICAgbGV0IGZpbHRlclRleHQgPSBtLmlkZW50aWZpZXI7XHJcbiAgICAgICAgICAgIGxldCBpbnNlcnRUZXh0ID0gVmlzaWJpbGl0eVttLnZpc2liaWxpdHldICsgXCIgXCIgKyAobS5nZXRSZXR1cm5UeXBlKCkgPT0gbnVsbCA/IFwidm9pZFwiIDogbS5nZXRSZXR1cm5UeXBlKCkuaWRlbnRpZmllcikgKyBcIiBcIjtcclxuICAgICAgICAgICAgaW5zZXJ0VGV4dCArPSBtLmlkZW50aWZpZXIgKyBcIihcIjtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtLmdldFBhcmFtZXRlckxpc3QoKS5wYXJhbWV0ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcCA9IG0uZ2V0UGFyYW1ldGVyTGlzdCgpLnBhcmFtZXRlcnNbaV07XHJcbiAgICAgICAgICAgICAgICBpbnNlcnRUZXh0ICs9IG0uZ2V0UGFyYW1ldGVyVHlwZShpKS5pZGVudGlmaWVyICsgXCIgXCIgKyBwLmlkZW50aWZpZXI7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA8IG0uZ2V0UGFyYW1ldGVyQ291bnQoKSAtIDEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0ICs9IFwiLCBcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpbnNlcnRUZXh0ICs9IFwiKSB7XFxuXFx0JDBcXG59XCI7XHJcblxyXG4gICAgICAgICAgICBrZXl3b3JkQ29tcGxldGlvbkl0ZW1zLnB1c2goXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6IGxhYmVsLFxyXG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogKG0uaXNBYnN0cmFjdCA/IFwiSW1wbGVtZW50aWVyZSBcIiA6IFwiw5xiZXJzY2hyZWliZSBcIikgKyBcImRpZSBNZXRob2RlIFwiICsgbGFiZWwgKyBcIiBkZXIgQmFzaXNrbGFzc2UuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyVGV4dDogZmlsdGVyVGV4dCxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0OiBpbnNlcnRUZXh0LFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHRSdWxlczogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUluc2VydFRleHRSdWxlLkluc2VydEFzU25pcHBldCxcclxuICAgICAgICAgICAgICAgICAgICBraW5kOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ga2V5d29yZENvbXBsZXRpb25JdGVtcztcclxuXHJcbiAgICB9XHJcblxyXG59Il19