import { InterpreterState } from "../../interpreter/Interpreter.js";
import { Main } from "../Main.js";
import { MyCompletionItemProvider } from "./MyCompletionItemProvider.js";
import { defineMyJava } from "./MyJava.js";
import { MySignatureHelpProvider } from "./MySignatureHelpProvider.js";
import { Klass, Interface } from "../../compiler/types/Class.js";
import { Method, Attribute } from "../../compiler/types/Types.js";
import { MyHoverProvider } from "./MyHoverProvider.js";
import { MyCodeActionProvider } from "./MyCodeActionProvider.js";
import { MyReferenceProvider } from "./MyReferenceProvider.js";
import { Enum } from "../../compiler/types/Enum.js";
import { MyColorProvider } from "./MyColorProvider.js";
export class Editor {
    constructor(main, showMinimap, isEmbedded) {
        this.main = main;
        this.showMinimap = showMinimap;
        this.isEmbedded = isEmbedded;
        this.highlightCurrentMethod = true;
        this.cw = null;
        this.dontPushNextCursorMove = 0;
        this.lastPushTime = 0;
        this.lastTime = 0;
        this.elementDecoration = [];
    }
    initGUI($element) {
        defineMyJava();
        monaco.editor.defineTheme('myCustomThemeDark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'method', foreground: 'dcdcaa', fontStyle: 'italic' },
                { token: 'print', foreground: 'dcdcaa', fontStyle: 'italic bold' },
                { token: 'class', foreground: '3DC9B0' },
                { token: 'number', foreground: 'b5cea8' },
                { token: 'type', foreground: '499cd6' },
                { token: 'identifier', foreground: '9cdcfe' },
                { token: 'statement', foreground: 'bb96c0', fontStyle: 'bold' },
                { token: 'keyword', foreground: '68bed4', fontStyle: 'bold' },
                { token: 'string3', foreground: 'ff0000' },
                // { token: 'comment.js', foreground: '008800', fontStyle: 'bold italic underline' },
                // semantic tokens:
                { token: 'property', foreground: 'ffffff', fontStyle: 'bold' },
            ],
            colors: {
                "editor.background": "#1e1e1e",
                "jo_highlightMethod": "#2b2b7d"
            }
        });
        monaco.editor.defineTheme('myCustomThemeLight', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'method', foreground: '694E16', fontStyle: 'italic bold' },
                { token: 'print', foreground: '811f3f', fontStyle: 'italic bold' },
                { token: 'class', foreground: 'a03030' },
                { token: 'number', foreground: '404040' },
                { token: 'type', foreground: '0000ff', fontStyle: 'bold' },
                { token: 'identifier', foreground: '001080' },
                { token: 'statement', foreground: '8000e0', fontStyle: 'bold' },
                { token: 'keyword', foreground: '00a000', fontStyle: 'bold' },
                { token: 'comment', foreground: '808080', fontStyle: 'italic' },
            ],
            colors: {
                "editor.background": "#FFFFFF",
                "editor.foreground": "#000000",
                "editor.inactiveSelectionBackground": "#E5EBF1",
                "editorIndentGuide.background": "#D3D3D3",
                "editorIndentGuide.activeBackground": "#939393",
                "editor.selectionHighlightBackground": "#ADD6FF80",
                "editorSuggestWidget.background": "#F3F3F3",
                "activityBarBadge.background": "#007ACC",
                "sideBarTitle.foreground": "#6F6F6F",
                "list.hoverBackground": "#E8E8E8",
                "input.placeholderForeground": "#767676",
                "searchEditor.textInputBorder": "#CECECE",
                "settings.textInputBorder": "#CECECE",
                "settings.numberInputBorder": "#CECECE",
                "statusBarItem.remoteForeground": "#FFF",
                "statusBarItem.remoteBackground": "#16825D",
                "jo_highlightMethod": "#babaec"
            }
        });
        this.editor = monaco.editor.create($element[0], {
            // value: [
            //     'function x() {',
            //     '\tconsole.log("Hello world!");',
            //     '}'
            // ].join('\n'),
            // language: 'myJava',
            language: 'myJava',
            "semanticHighlighting.enabled": true,
            lightbulb: {
                enabled: true
            },
            // gotoLocation: {
            //     multipleReferences: "gotoAndPeek"
            // },
            lineDecorationsWidth: 0,
            peekWidgetDefaultFocus: "tree",
            fixedOverflowWidgets: true,
            quickSuggestions: true,
            quickSuggestionsDelay: 10,
            fontSize: 14,
            //@ts-ignore
            fontFamily: window.javaOnlineFont == null ? "Consolas, Roboto Mono" : window.javaOnlineFont,
            fontWeight: "500",
            roundedSelection: true,
            selectOnLineNumbers: false,
            // selectionHighlight: false,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            occurrencesHighlight: false,
            autoIndent: "advanced",
            // renderWhitespace: "boundary",
            dragAndDrop: true,
            formatOnType: true,
            formatOnPaste: true,
            suggestFontSize: 16,
            suggestLineHeight: 22,
            suggest: {
                localityBonus: true,
                insertMode: "replace"
                // snippetsPreventQuickSuggestions: false
            },
            parameterHints: { enabled: true, cycle: true },
            // //@ts-ignore
            // contribInfo: {
            //     suggestSelection: 'recentlyUsedByPrefix',
            // },
            mouseWheelZoom: this.isEmbedded,
            tabSize: 3,
            insertSpaces: true,
            detectIndentation: false,
            minimap: {
                enabled: this.showMinimap
            },
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto'
            },
            theme: "myCustomThemeDark",
            // automaticLayout: true
        });
        this.editor.onKeyDown((e) => {
            let state = this.main.getInterpreter().state;
            if ([InterpreterState.done, InterpreterState.error, InterpreterState.not_initialized].indexOf(state) < 0) {
                if (e.code.indexOf("Arrow") >= 0 || e.code.indexOf("Page") >= 0)
                    return; // don't react to Cursor keys
                this.main.getActionManager().trigger("interpreter.stop");
            }
        });
        // this.uri = monaco.Uri.from({ path: '/file1.java', scheme: 'file' })
        // this.modelJava = monaco.editor.createModel("", "myJava", this.uri);
        // this.editor.setModel(this.modelJava);
        let that = this;
        let mouseWheelListener = (event) => {
            if (event.ctrlKey === true) {
                that.changeEditorFontSize(Math.sign(event.deltaY), true);
                event.preventDefault();
            }
        };
        if (!this.isEmbedded) {
            let _main = this.main;
            _main.windowStateManager.registerBackButtonListener((event) => {
                let historyEntry = event.state;
                if (event.state == null)
                    return;
                let workspace = _main.workspaceList.find((ws) => ws.id == historyEntry.workspace_id);
                if (workspace == null)
                    return;
                let module = workspace.moduleStore.findModuleById(historyEntry.module_id);
                if (module == null)
                    return;
                // console.log("Processing pop state event, returning to module " + historyEntry.module_id);
                if (workspace != _main.currentWorkspace) {
                    that.dontPushNextCursorMove++;
                    _main.projectExplorer.setWorkspaceActive(workspace);
                    that.dontPushNextCursorMove--;
                }
                if (module != _main.getCurrentlyEditedModule()) {
                    that.dontPushNextCursorMove++;
                    _main.projectExplorer.setModuleActive(module);
                    that.dontPushNextCursorMove--;
                }
                that.dontPushNextCursorMove++;
                that.editor.setPosition(historyEntry.position);
                that.editor.revealPosition(historyEntry.position);
                that.dontPushNextCursorMove--;
                that.pushHistoryState(true, historyEntry);
            });
        }
        this.editor.onDidChangeConfiguration((event) => {
            if (event.hasChanged(monaco.editor.EditorOption.fontInfo) && this.isEmbedded) {
                this.main.getBottomDiv().errorManager.registerLightbulbOnClickFunctions();
            }
        });
        this.editor.onDidChangeCursorPosition((event) => {
            var _a, _b, _c;
            let currentModelId = (_b = (_a = this.main.getCurrentlyEditedModule()) === null || _a === void 0 ? void 0 : _a.file) === null || _b === void 0 ? void 0 : _b.id;
            if (currentModelId == null)
                return;
            let pushNeeded = this.lastPosition == null
                || event.source == "api"
                || currentModelId != this.lastPosition.module_id
                || Math.abs(this.lastPosition.position.lineNumber - event.position.lineNumber) > 20;
            if (pushNeeded && this.dontPushNextCursorMove == 0) {
                this.pushHistoryState(false, this.getPositionForHistory());
            }
            else if (currentModelId == ((_c = history.state) === null || _c === void 0 ? void 0 : _c.module_id)) {
                this.pushHistoryState(true, this.getPositionForHistory());
            }
            that.onDidChangeCursorPosition(event.position);
            that.onEvaluateSelectedText(event);
        });
        // We need this to set our model after user uses Strg+click on identifier
        this.editor.onDidChangeModel((event) => {
            let element = $element.find('.monaco-editor')[0];
            element.removeEventListener("wheel", mouseWheelListener);
            element.addEventListener("wheel", mouseWheelListener, { passive: false });
            if (this.main.getCurrentWorkspace() == null)
                return;
            let module = this.main.getCurrentWorkspace().getModuleByMonacoModel(this.editor.getModel());
            if (this.main instanceof Main && module != null) {
                // if(!this.dontPushHistoryStateOnNextModelChange){
                //     this.lastPosition = {
                //         position: this.editor.getPosition(),
                //         workspace_id: this.main.getCurrentWorkspace().id,
                //         module_id: module.file.id
                //     }
                //     this.pushHistoryState(false);
                // }
                // this.dontPushHistoryStateOnNextModelChange = false;
                this.main.projectExplorer.setActiveAfterExternalModelSet(module);
                let pushNeeded = this.lastPosition == null
                    || module.file.id != this.lastPosition.module_id;
                if (pushNeeded && this.dontPushNextCursorMove == 0) {
                    this.pushHistoryState(false, this.getPositionForHistory());
                }
            }
        });
        //        monaco.languages.registerDocumentRangeSemanticTokensProvider('myJava', new MySemanticTokenProvider(this.main));
        monaco.languages.registerRenameProvider('myJava', this);
        monaco.languages.registerColorProvider('myJava', new MyColorProvider(this.main));
        monaco.languages.registerDefinitionProvider('myJava', {
            provideDefinition: (model, position, cancellationToken) => {
                return that.provideDefinition(model, position, cancellationToken);
            }
        });
        monaco.languages.registerHoverProvider('myJava', new MyHoverProvider(this));
        monaco.languages.registerCompletionItemProvider('myJava', new MyCompletionItemProvider(this.main));
        monaco.languages.registerCodeActionProvider('myJava', new MyCodeActionProvider(this.main));
        monaco.languages.registerReferenceProvider('myJava', new MyReferenceProvider(this.main));
        monaco.languages.registerSignatureHelpProvider('myJava', new MySignatureHelpProvider(this.main));
        this.editor.onMouseDown((e) => {
            const data = e.target.detail;
            if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
                e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS || data.isAfterLines) {
                return;
            }
            that.onMarginMouseDown(e.target.position.lineNumber);
            return;
        });
        // If editor is instantiated before fonts are loaded then indentation-lines
        // are misplaced, see https://github.com/Microsoft/monaco-editor/issues/392
        // so:
        setTimeout(() => {
            monaco.editor.remeasureFonts();
        }, 2000);
        this.addActions();
        //@ts-ignore
        this.editor.onDidType((text) => { that.onDidType(text); });
        // console.log(this.editor.getSupportedActions().map(a => a.id));
        return this.editor;
    }
    getPositionForHistory() {
        let module = this.main.getCurrentlyEditedModule();
        if (module == null)
            return;
        return {
            position: this.editor.getPosition(),
            workspace_id: this.main.getCurrentWorkspace().id,
            module_id: this.main.getCurrentlyEditedModule().file.id
        };
    }
    pushHistoryState(replace, historyEntry) {
        if (this.main.isEmbedded() || historyEntry == null)
            return;
        if (replace) {
            history.replaceState(historyEntry, ""); //`Java-Online, ${module.file.name} (Zeile ${this.lastPosition.position.lineNumber}, Spalte ${this.lastPosition.position.column})`);
            // console.log("Replace History state with workspace-id: " + historyEntry.workspace_id + ", module-id: " + historyEntry.module_id);
        }
        else {
            let time = new Date().getTime();
            if (time - this.lastPushTime > 200) {
                history.pushState(historyEntry, ""); //`Java-Online, ${module.file.name} (Zeile ${historyEntry.position.lineNumber}, Spalte ${historyEntry.position.column})`);
            }
            else {
                history.replaceState(historyEntry, "");
            }
            this.lastPushTime = time;
            // console.log("Pushed History state with workspace-id: " + historyEntry.workspace_id + ", module-id: " + historyEntry.module_id);
        }
        this.lastPosition = historyEntry;
    }
    onDidType(text) {
        //        const endOfCommentText = " * \n */";
        const insertTextAndSetCursor = (pos, insertText, newLine, newColumn) => {
            const range = new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
            this.editor.executeEdits("new-bullets", [
                { range, text: insertText }
            ]);
            // Set position after bulletText
            this.editor.setPosition({
                lineNumber: newLine,
                column: newColumn
            });
        };
        if (text === "\n") {
            const model = this.editor.getModel();
            const position = this.editor.getPosition();
            const prevLine = model.getLineContent(position.lineNumber - 1);
            if (prevLine.trim().indexOf("/*") === 0 && !prevLine.trimRight().endsWith("*/")) {
                const nextLine = position.lineNumber < model.getLineCount() ? model.getLineContent(position.lineNumber + 1) : "";
                if (!nextLine.trim().startsWith("*")) {
                    let spacesAtBeginningOfLine = prevLine.substr(0, prevLine.length - prevLine.trimLeft().length);
                    if (prevLine.trim().indexOf("/**") === 0) {
                        insertTextAndSetCursor(position, "\n" + spacesAtBeginningOfLine + " */", position.lineNumber, position.column + 3 + spacesAtBeginningOfLine.length);
                    }
                    else {
                        insertTextAndSetCursor(position, " * \n" + spacesAtBeginningOfLine + " */", position.lineNumber, position.column + 3 + spacesAtBeginningOfLine.length);
                    }
                }
            }
        }
        else if (text == '"') {
            //a: x| -> x"|"
            //d: "|x -> ""|x
            //c: "|" -> """\n|\n"""
            const model = this.editor.getModel();
            const position = this.editor.getPosition();
            const selection = this.editor.getSelection();
            const isSelected = selection.startColumn != selection.endColumn || selection.startLineNumber != selection.endLineNumber;
            const line = model.getLineContent(position.lineNumber);
            let doInsert = true;
            let charBefore = "x";
            if (position.column > 1) {
                charBefore = line.charAt(position.column - 3);
            }
            let charAfter = "x";
            if (position.column - 1 < line.length) {
                charAfter = line.charAt(position.column - 1);
            }
            if (!isSelected) {
                if (charBefore != '"') {
                    insertTextAndSetCursor(position, '"', position.lineNumber, position.column);
                }
                else if (charAfter == '"') {
                    let pos1 = Object.assign(Object.assign({}, position), { column: position.column + 1 });
                    insertTextAndSetCursor(pos1, '\n\n"""', position.lineNumber + 1, 1);
                }
            }
        }
    }
    setFontSize(fontSizePx) {
        // console.log("Set font size: " + fontSizePx);
        let time = new Date().getTime();
        if (time - this.lastTime < 150)
            return;
        this.lastTime = time;
        let editorfs = this.editor.getOptions().get(monaco.editor.EditorOption.fontSize);
        if (this.main instanceof Main) {
            this.main.viewModeController.saveFontSize(fontSizePx);
        }
        if (fontSizePx != editorfs) {
            this.editor.updateOptions({
                fontSize: fontSizePx
            });
            // editor does not set fontSizePx, but fontSizePx * zoomfactor with unknown zoom factor, so 
            // we have to do this dirty workaround:
            let newEditorfs = this.editor.getOptions().get(monaco.editor.EditorOption.fontSize);
            let factor = newEditorfs / fontSizePx;
            this.editor.updateOptions({
                fontSize: fontSizePx / factor
            });
            let bottomDiv1 = this.main.getBottomDiv();
            if (bottomDiv1 != null && bottomDiv1.console != null) {
                bottomDiv1.console.editor.updateOptions({
                    fontSize: fontSizePx / factor
                });
            }
        }
        let bottomDiv = this.main.getBottomDiv();
        if (bottomDiv != null && bottomDiv.console != null) {
            let $commandLine = bottomDiv.$bottomDiv.find('.jo_commandline');
            $commandLine.css({
                height: (fontSizePx * 1.1 + 4) + "px",
                "line-height": (fontSizePx * 1.1 + 4) + "px"
            });
            bottomDiv.console.editor.layout();
        }
        // let newEditorfs = this.editor.getOptions().get(monaco.editor.EditorOption.fontSize);
        // console.log({editorFS: editorfs, newFs: fontSizePx, newEditorFs: newEditorfs});
        jQuery('.jo_editorFontSize').css('font-size', fontSizePx + "px");
        jQuery('.jo_editorFontSize').css('line-height', (fontSizePx + 2) + "px");
        document.documentElement.style.setProperty('--breakpoint-size', fontSizePx + 'px');
        document.documentElement.style.setProperty('--breakpoint-radius', fontSizePx / 2 + 'px');
        this.main.getBottomDiv().errorManager.registerLightbulbOnClickFunctions();
    }
    changeEditorFontSize(delta, dynamic = true) {
        let editorfs = this.editor.getOptions().get(monaco.editor.EditorOption.fontSize);
        if (dynamic) {
            if (editorfs < 10) {
                delta *= 1;
            }
            else if (editorfs < 20) {
                delta *= 2;
            }
            else {
                delta *= 4;
            }
        }
        let newEditorFs = editorfs + delta;
        if (newEditorFs >= 6 && newEditorFs <= 80) {
            this.setFontSize(newEditorFs);
        }
    }
    addActions() {
        this.editor.addAction({
            // An unique identifier of the contributed action.
            id: 'Find bracket',
            // A label of the action that will be presented to the user.
            label: 'Finde korrespondierende Klammer',
            // An optional array of keybindings for the action.
            keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_K
            ],
            // A precondition for this action.
            precondition: null,
            // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
            keybindingContext: null,
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.5,
            // Method that will be executed when the action is triggered.
            // @param editor The editor instance is passed in as a convinience
            run: function (ed) {
                ed.getAction('editor.action.jumpToBracket').run();
                return null;
            }
        });
        // Strg + # funktioniert bei Firefox nicht, daher alternativ Strg + ,:
        this.editor.addAction({
            // An unique identifier of the contributed action.
            id: 'Toggle line comment',
            // A label of the action that will be presented to the user.
            label: 'Zeilenkommentar ein-/ausschalten',
            // An optional array of keybindings for the action.
            keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_COMMA
            ],
            // A precondition for this action.
            precondition: null,
            // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
            keybindingContext: null,
            contextMenuGroupId: 'insert',
            contextMenuOrder: 1.5,
            // Method that will be executed when the action is triggered.
            // @param editor The editor instance is passed in as a convinience
            run: function (ed) {
                console.log('Hier!');
                ed.getAction('editor.action.commentLine').run();
                return null;
            }
        });
        // console.log(this.editor.getSupportedActions());
    }
    onEvaluateSelectedText(event) {
        let that = this;
        if (that.cw != null) {
            that.editor.removeContentWidget(that.cw);
            that.cw = null;
        }
        if (that.main.getInterpreter().state == InterpreterState.paused) {
            let model = that.editor.getModel();
            let text = model.getValueInRange(that.editor.getSelection());
            if (text != null && text.length > 0) {
                let evaluator = this.main.getCurrentWorkspace().evaluator;
                let result = evaluator.evaluate(text);
                if (result.error == null && result.value != null) {
                    let v = result.value.type.debugOutput(result.value);
                    monaco.editor.colorize(text + ": ", 'myJava', { tabSize: 3 }).then((text) => {
                        if (text.endsWith("<br/>"))
                            text = text.substr(0, text.length - 5);
                        that.cw = {
                            getId: function () {
                                return 'my.content.widget';
                            },
                            getDomNode: function () {
                                let dn = jQuery('<div class="jo_editorTooltip jo_codeFont">' + text + v + '</div>');
                                return dn[0];
                            },
                            getPosition: function () {
                                return {
                                    position: event.position,
                                    preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE, monaco.editor.ContentWidgetPositionPreference.BELOW]
                                };
                            }
                        };
                        that.editor.addContentWidget(that.cw);
                    });
                }
            }
        }
    }
    onMarginMouseDown(lineNumber) {
        let module = this.getCurrentlyEditedModule();
        if (module == null) {
            return;
        }
        module.toggleBreakpoint(lineNumber, true);
        if (this.main.getInterpreter().moduleStore != null) {
            let runningModule = this.main.getInterpreter().moduleStore.findModuleByFile(module.file);
            if (runningModule != null)
                runningModule.toggleBreakpoint(lineNumber, false);
        }
    }
    onDidChangeCursorPosition(position) {
        if (position == null)
            position = this.editor.getPosition();
        let module = this.getCurrentlyEditedModule();
        if (module == null) {
            this.elementDecoration = this.editor.deltaDecorations(this.elementDecoration, []);
            return;
        }
        let element = module.getElementAtPosition(position.lineNumber, position.column);
        let decorations = [];
        if (element != null) {
            let usagePositions = element.usagePositions;
            let upInCurrentModule = usagePositions.get(module);
            if (upInCurrentModule != null) {
                for (let up of upInCurrentModule) {
                    decorations.push({
                        range: { startColumn: up.column, startLineNumber: up.line, endColumn: up.column + up.length, endLineNumber: up.line },
                        options: {
                            className: 'jo_revealSyntaxElement', isWholeLine: false, overviewRuler: {
                                color: { id: "editorIndentGuide.background" },
                                darkColor: { id: "editorIndentGuide.activeBackground" },
                                position: monaco.editor.OverviewRulerLane.Left
                            }
                        }
                    });
                }
            }
        }
        if (this.highlightCurrentMethod) {
            let method = module.getMethodDeclarationAtPosition(position);
            if (method != null) {
                decorations.push({
                    range: { startColumn: 0, startLineNumber: method.position.line, endColumn: 100, endLineNumber: method.scopeTo.line },
                    options: {
                        className: 'jo_highlightMethod', isWholeLine: true, overviewRuler: {
                            color: { id: "jo_highlightMethod" },
                            darkColor: { id: "jo_highlightMethod" },
                            position: monaco.editor.OverviewRulerLane.Left
                        },
                        minimap: {
                            color: { id: 'jo_highlightMethod' },
                            position: monaco.editor.MinimapPosition.Inline
                        },
                        zIndex: -100
                    }
                });
            }
        }
        this.elementDecoration = this.editor.deltaDecorations(this.elementDecoration, decorations);
    }
    getCurrentlyEditedModule() {
        return this.main.getCurrentlyEditedModule();
    }
    dontDetectLastChange() {
        // this.dontDetectLastChanging = true;
    }
    resolveRenameLocation(model, position, token) {
        let currentlyEditedModule = this.getCurrentlyEditedModule();
        if (currentlyEditedModule == null) {
            return {
                range: null,
                text: "Dieses Symbol kann nicht umbenannt werden.",
                rejectReason: "Dieses Symbol kann nicht umbenannt werden."
            };
        }
        let element = currentlyEditedModule.getElementAtPosition(position.lineNumber, position.column);
        if (element == null || element.declaration == null) {
            return {
                range: null,
                text: "Dieses Symbol kann nicht umbenannt werden.",
                rejectReason: "Dieses Symbol kann nicht umbenannt werden."
            };
        }
        let pos = element.declaration.position;
        return {
            range: { startColumn: position.column, startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, endColumn: position.column + pos.length },
            text: element.identifier
        };
    }
    provideRenameEdits(model, position, newName, token) {
        let currentlyEditedModule = this.getCurrentlyEditedModule();
        if (currentlyEditedModule == null) {
            return null;
        }
        let element = currentlyEditedModule.getElementAtPosition(position.lineNumber, position.column);
        if (element == null) {
            return;
        }
        let usagePositions = element.usagePositions;
        //06.06.2020
        let resourceEdits = [];
        usagePositions.forEach((usagePositionsInModule, module) => {
            if (usagePositionsInModule != null) {
                let edits = [];
                for (let up of usagePositionsInModule) {
                    resourceEdits.push({
                        resource: module.uri, edit: {
                            range: { startColumn: up.column, startLineNumber: up.line, endLineNumber: up.line, endColumn: up.column + up.length },
                            text: newName
                        }
                    });
                }
                if (edits.length > 0) {
                    module.file.dirty = true;
                    module.file.saved = false;
                    module.file.identical_to_repository_version = false;
                }
            }
        });
        //        console.log(resourceEdits);
        return {
            edits: resourceEdits
        };
    }
    provideDefinition(model, position, cancellationToken) {
        let module = this.main.getCurrentWorkspace().getModuleByMonacoModel(model);
        if (module == null) {
            return null;
        }
        let element = module.getElementAtPosition(position.lineNumber, position.column);
        if (element == null)
            return null;
        let decl = element.declaration;
        if (decl == null) {
            // class from Base-Module? Let definition point to current position, so that ctrl + click opens peek references widget
            if (element instanceof Klass || element instanceof Enum || element instanceof Interface || element instanceof Method || element instanceof Attribute) {
                return Promise.resolve({
                    range: {
                        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
                        startColumn: position.column, endColumn: position.column + element.identifier.length
                    },
                    uri: module.uri
                });
            }
            else {
                return null;
            }
        }
        return Promise.resolve({
            range: {
                startLineNumber: decl.position.line, endLineNumber: decl.position.line,
                startColumn: decl.position.column, endColumn: decl.position.column + decl.position.length
            },
            uri: decl.module.uri
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9FZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNsQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzNDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQWlCLE1BQU0sK0JBQStCLENBQUM7QUFFakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRXZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUdwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFRdkQsTUFBTSxPQUFPLE1BQU07SUFXZixZQUFtQixJQUFjLEVBQVUsV0FBb0IsRUFBVSxVQUFtQjtRQUF6RSxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQVUsZ0JBQVcsR0FBWCxXQUFXLENBQVM7UUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFTO1FBUDVGLDJCQUFzQixHQUFZLElBQUksQ0FBQztRQUV2QyxPQUFFLEdBQWlDLElBQUksQ0FBQztRQUd4QywyQkFBc0IsR0FBVyxDQUFDLENBQUM7UUFnVW5DLGlCQUFZ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LEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTthQUM1RjtZQUNELEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUc7U0FDdkIsQ0FBQyxDQUFDO0lBRVAsQ0FBQztDQUVKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTW9kdWxlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3BhcnNlci9Nb2R1bGUuanNcIjtcclxuaW1wb3J0IHsgSW50ZXJwcmV0ZXJTdGF0ZSB9IGZyb20gXCIuLi8uLi9pbnRlcnByZXRlci9JbnRlcnByZXRlci5qc1wiO1xyXG5pbXBvcnQgeyBNYWluIH0gZnJvbSBcIi4uL01haW4uanNcIjtcclxuaW1wb3J0IHsgTXlDb21wbGV0aW9uSXRlbVByb3ZpZGVyIH0gZnJvbSBcIi4vTXlDb21wbGV0aW9uSXRlbVByb3ZpZGVyLmpzXCI7XHJcbmltcG9ydCB7IGRlZmluZU15SmF2YSB9IGZyb20gXCIuL015SmF2YS5qc1wiO1xyXG5pbXBvcnQgeyBNeVNpZ25hdHVyZUhlbHBQcm92aWRlciB9IGZyb20gXCIuL015U2lnbmF0dXJlSGVscFByb3ZpZGVyLmpzXCI7XHJcbmltcG9ydCB7IEtsYXNzLCBJbnRlcmZhY2UgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvQ2xhc3MuanNcIjtcclxuaW1wb3J0IHsgTWV0aG9kLCBBdHRyaWJ1dGUsIFByaW1pdGl2ZVR5cGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgZ2V0RGVjbGFyYXRpb25Bc1N0cmluZyB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9EZWNsYXJhdGlvbkhlbHBlci5qc1wiO1xyXG5pbXBvcnQgeyBNeUhvdmVyUHJvdmlkZXIgfSBmcm9tIFwiLi9NeUhvdmVyUHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgTWFpbkJhc2UgfSBmcm9tIFwiLi4vTWFpbkJhc2UuanNcIjtcclxuaW1wb3J0IHsgTXlDb2RlQWN0aW9uUHJvdmlkZXIgfSBmcm9tIFwiLi9NeUNvZGVBY3Rpb25Qcm92aWRlci5qc1wiO1xyXG5pbXBvcnQgeyBNeVJlZmVyZW5jZVByb3ZpZGVyIH0gZnJvbSBcIi4vTXlSZWZlcmVuY2VQcm92aWRlci5qc1wiO1xyXG5pbXBvcnQgeyBFbnVtIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL0VudW0uanNcIjtcclxuaW1wb3J0IHsgV29ya3NwYWNlIH0gZnJvbSBcIi4uLy4uL3dvcmtzcGFjZS9Xb3Jrc3BhY2UuanNcIjtcclxuaW1wb3J0IHsgTXlTZW1hbnRpY1Rva2VuUHJvdmlkZXIgfSBmcm9tIFwiLi9NeVNlbWFudGljVG9rZW5Qcm92aWRlci5qc1wiO1xyXG5pbXBvcnQgeyBNeUNvbG9yUHJvdmlkZXIgfSBmcm9tIFwiLi9NeUNvbG9yUHJvdmlkZXIuanNcIjtcclxuXHJcbmV4cG9ydCB0eXBlIEhpc3RvcnlFbnRyeSA9IHtcclxuICAgIG1vZHVsZV9pZDogbnVtYmVyLFxyXG4gICAgd29ya3NwYWNlX2lkOiBudW1iZXIsXHJcbiAgICBwb3NpdGlvbjogbW9uYWNvLlBvc2l0aW9uO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRWRpdG9yIGltcGxlbWVudHMgbW9uYWNvLmxhbmd1YWdlcy5SZW5hbWVQcm92aWRlciB7XHJcblxyXG4gICAgZWRpdG9yOiBtb25hY28uZWRpdG9yLklTdGFuZGFsb25lQ29kZUVkaXRvcjtcclxuXHJcbiAgICBoaWdobGlnaHRDdXJyZW50TWV0aG9kOiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICBjdzogbW9uYWNvLmVkaXRvci5JQ29udGVudFdpZGdldCA9IG51bGw7XHJcblxyXG4gICAgbGFzdFBvc2l0aW9uOiBIaXN0b3J5RW50cnk7XHJcbiAgICBkb250UHVzaE5leHRDdXJzb3JNb3ZlOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBtYWluOiBNYWluQmFzZSwgcHJpdmF0ZSBzaG93TWluaW1hcDogYm9vbGVhbiwgcHJpdmF0ZSBpc0VtYmVkZGVkOiBib29sZWFuKSB7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdEdVSSgkZWxlbWVudDogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG5cclxuXHJcblxyXG4gICAgICAgIGRlZmluZU15SmF2YSgpO1xyXG5cclxuICAgICAgICBtb25hY28uZWRpdG9yLmRlZmluZVRoZW1lKCdteUN1c3RvbVRoZW1lRGFyaycsIHtcclxuICAgICAgICAgICAgYmFzZTogJ3ZzLWRhcmsnLCAvLyBjYW4gYWxzbyBiZSB2cy1kYXJrIG9yIGhjLWJsYWNrXHJcbiAgICAgICAgICAgIGluaGVyaXQ6IHRydWUsIC8vIGNhbiBhbHNvIGJlIGZhbHNlIHRvIGNvbXBsZXRlbHkgcmVwbGFjZSB0aGUgYnVpbHRpbiBydWxlc1xyXG4gICAgICAgICAgICBydWxlczogW1xyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ21ldGhvZCcsIGZvcmVncm91bmQ6ICdkY2RjYWEnLCBmb250U3R5bGU6ICdpdGFsaWMnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAncHJpbnQnLCBmb3JlZ3JvdW5kOiAnZGNkY2FhJywgZm9udFN0eWxlOiAnaXRhbGljIGJvbGQnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAnY2xhc3MnLCBmb3JlZ3JvdW5kOiAnM0RDOUIwJyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ251bWJlcicsIGZvcmVncm91bmQ6ICdiNWNlYTgnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAndHlwZScsIGZvcmVncm91bmQ6ICc0OTljZDYnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAnaWRlbnRpZmllcicsIGZvcmVncm91bmQ6ICc5Y2RjZmUnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAnc3RhdGVtZW50JywgZm9yZWdyb3VuZDogJ2JiOTZjMCcsIGZvbnRTdHlsZTogJ2JvbGQnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAna2V5d29yZCcsIGZvcmVncm91bmQ6ICc2OGJlZDQnLCBmb250U3R5bGU6ICdib2xkJyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ3N0cmluZzMnLCBmb3JlZ3JvdW5kOiAnZmYwMDAwJyB9LFxyXG5cclxuICAgICAgICAgICAgICAgIC8vIHsgdG9rZW46ICdjb21tZW50LmpzJywgZm9yZWdyb3VuZDogJzAwODgwMCcsIGZvbnRTdHlsZTogJ2JvbGQgaXRhbGljIHVuZGVybGluZScgfSxcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBzZW1hbnRpYyB0b2tlbnM6XHJcbiAgICAgICAgICAgICAgICB7dG9rZW46ICdwcm9wZXJ0eScsIGZvcmVncm91bmQ6ICdmZmZmZmYnICxmb250U3R5bGU6ICdib2xkJ30sXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGNvbG9yczoge1xyXG4gICAgICAgICAgICAgICAgXCJlZGl0b3IuYmFja2dyb3VuZFwiOiBcIiMxZTFlMWVcIixcclxuICAgICAgICAgICAgICAgIFwiam9faGlnaGxpZ2h0TWV0aG9kXCI6IFwiIzJiMmI3ZFwiXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbW9uYWNvLmVkaXRvci5kZWZpbmVUaGVtZSgnbXlDdXN0b21UaGVtZUxpZ2h0Jywge1xyXG4gICAgICAgICAgICBiYXNlOiAndnMnLCAvLyBjYW4gYWxzbyBiZSB2cy1kYXJrIG9yIGhjLWJsYWNrXHJcbiAgICAgICAgICAgIGluaGVyaXQ6IHRydWUsIC8vIGNhbiBhbHNvIGJlIGZhbHNlIHRvIGNvbXBsZXRlbHkgcmVwbGFjZSB0aGUgYnVpbHRpbiBydWxlc1xyXG4gICAgICAgICAgICBydWxlczogW1xyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ21ldGhvZCcsIGZvcmVncm91bmQ6ICc2OTRFMTYnLCBmb250U3R5bGU6ICdpdGFsaWMgYm9sZCcgfSxcclxuICAgICAgICAgICAgICAgIHsgdG9rZW46ICdwcmludCcsIGZvcmVncm91bmQ6ICc4MTFmM2YnLCBmb250U3R5bGU6ICdpdGFsaWMgYm9sZCcgfSxcclxuICAgICAgICAgICAgICAgIHsgdG9rZW46ICdjbGFzcycsIGZvcmVncm91bmQ6ICdhMDMwMzAnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAnbnVtYmVyJywgZm9yZWdyb3VuZDogJzQwNDA0MCcgfSxcclxuICAgICAgICAgICAgICAgIHsgdG9rZW46ICd0eXBlJywgZm9yZWdyb3VuZDogJzAwMDBmZicsIGZvbnRTdHlsZTogJ2JvbGQnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAnaWRlbnRpZmllcicsIGZvcmVncm91bmQ6ICcwMDEwODAnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAnc3RhdGVtZW50JywgZm9yZWdyb3VuZDogJzgwMDBlMCcsIGZvbnRTdHlsZTogJ2JvbGQnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAna2V5d29yZCcsIGZvcmVncm91bmQ6ICcwMGEwMDAnLCBmb250U3R5bGU6ICdib2xkJyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ2NvbW1lbnQnLCBmb3JlZ3JvdW5kOiAnODA4MDgwJywgZm9udFN0eWxlOiAnaXRhbGljJyB9LFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBjb2xvcnM6IHtcclxuICAgICAgICAgICAgICAgIFwiZWRpdG9yLmJhY2tncm91bmRcIjogXCIjRkZGRkZGXCIsXHJcbiAgICAgICAgICAgICAgICBcImVkaXRvci5mb3JlZ3JvdW5kXCI6IFwiIzAwMDAwMFwiLFxyXG4gICAgICAgICAgICAgICAgXCJlZGl0b3IuaW5hY3RpdmVTZWxlY3Rpb25CYWNrZ3JvdW5kXCI6IFwiI0U1RUJGMVwiLFxyXG4gICAgICAgICAgICAgICAgXCJlZGl0b3JJbmRlbnRHdWlkZS5iYWNrZ3JvdW5kXCI6IFwiI0QzRDNEM1wiLFxyXG4gICAgICAgICAgICAgICAgXCJlZGl0b3JJbmRlbnRHdWlkZS5hY3RpdmVCYWNrZ3JvdW5kXCI6IFwiIzkzOTM5M1wiLFxyXG4gICAgICAgICAgICAgICAgXCJlZGl0b3Iuc2VsZWN0aW9uSGlnaGxpZ2h0QmFja2dyb3VuZFwiOiBcIiNBREQ2RkY4MFwiLFxyXG4gICAgICAgICAgICAgICAgXCJlZGl0b3JTdWdnZXN0V2lkZ2V0LmJhY2tncm91bmRcIjogXCIjRjNGM0YzXCIsXHJcbiAgICAgICAgICAgICAgICBcImFjdGl2aXR5QmFyQmFkZ2UuYmFja2dyb3VuZFwiOiBcIiMwMDdBQ0NcIixcclxuICAgICAgICAgICAgICAgIFwic2lkZUJhclRpdGxlLmZvcmVncm91bmRcIjogXCIjNkY2RjZGXCIsXHJcbiAgICAgICAgICAgICAgICBcImxpc3QuaG92ZXJCYWNrZ3JvdW5kXCI6IFwiI0U4RThFOFwiLFxyXG4gICAgICAgICAgICAgICAgXCJpbnB1dC5wbGFjZWhvbGRlckZvcmVncm91bmRcIjogXCIjNzY3Njc2XCIsXHJcbiAgICAgICAgICAgICAgICBcInNlYXJjaEVkaXRvci50ZXh0SW5wdXRCb3JkZXJcIjogXCIjQ0VDRUNFXCIsXHJcbiAgICAgICAgICAgICAgICBcInNldHRpbmdzLnRleHRJbnB1dEJvcmRlclwiOiBcIiNDRUNFQ0VcIixcclxuICAgICAgICAgICAgICAgIFwic2V0dGluZ3MubnVtYmVySW5wdXRCb3JkZXJcIjogXCIjQ0VDRUNFXCIsXHJcbiAgICAgICAgICAgICAgICBcInN0YXR1c0Jhckl0ZW0ucmVtb3RlRm9yZWdyb3VuZFwiOiBcIiNGRkZcIixcclxuICAgICAgICAgICAgICAgIFwic3RhdHVzQmFySXRlbS5yZW1vdGVCYWNrZ3JvdW5kXCI6IFwiIzE2ODI1RFwiLFxyXG4gICAgICAgICAgICAgICAgXCJqb19oaWdobGlnaHRNZXRob2RcIjogXCIjYmFiYWVjXCJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy5lZGl0b3IgPSBtb25hY28uZWRpdG9yLmNyZWF0ZSgkZWxlbWVudFswXSwge1xyXG4gICAgICAgICAgICAvLyB2YWx1ZTogW1xyXG4gICAgICAgICAgICAvLyAgICAgJ2Z1bmN0aW9uIHgoKSB7JyxcclxuICAgICAgICAgICAgLy8gICAgICdcXHRjb25zb2xlLmxvZyhcIkhlbGxvIHdvcmxkIVwiKTsnLFxyXG4gICAgICAgICAgICAvLyAgICAgJ30nXHJcbiAgICAgICAgICAgIC8vIF0uam9pbignXFxuJyksXHJcbiAgICAgICAgICAgIC8vIGxhbmd1YWdlOiAnbXlKYXZhJyxcclxuICAgICAgICAgICAgbGFuZ3VhZ2U6ICdteUphdmEnLFxyXG4gICAgICAgICAgICBcInNlbWFudGljSGlnaGxpZ2h0aW5nLmVuYWJsZWRcIjogdHJ1ZSxcclxuICAgICAgICAgICAgbGlnaHRidWxiOiB7XHJcbiAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIGdvdG9Mb2NhdGlvbjoge1xyXG4gICAgICAgICAgICAvLyAgICAgbXVsdGlwbGVSZWZlcmVuY2VzOiBcImdvdG9BbmRQZWVrXCJcclxuICAgICAgICAgICAgLy8gfSxcclxuICAgICAgICAgICAgbGluZURlY29yYXRpb25zV2lkdGg6IDAsXHJcbiAgICAgICAgICAgIHBlZWtXaWRnZXREZWZhdWx0Rm9jdXM6IFwidHJlZVwiLFxyXG4gICAgICAgICAgICBmaXhlZE92ZXJmbG93V2lkZ2V0czogdHJ1ZSxcclxuICAgICAgICAgICAgcXVpY2tTdWdnZXN0aW9uczogdHJ1ZSxcclxuICAgICAgICAgICAgcXVpY2tTdWdnZXN0aW9uc0RlbGF5OiAxMCxcclxuICAgICAgICAgICAgZm9udFNpemU6IDE0LFxyXG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgZm9udEZhbWlseTogd2luZG93LmphdmFPbmxpbmVGb250ID09IG51bGwgPyBcIkNvbnNvbGFzLCBSb2JvdG8gTW9ub1wiIDogd2luZG93LmphdmFPbmxpbmVGb250LFxyXG4gICAgICAgICAgICBmb250V2VpZ2h0OiBcIjUwMFwiLFxyXG4gICAgICAgICAgICByb3VuZGVkU2VsZWN0aW9uOiB0cnVlLFxyXG4gICAgICAgICAgICBzZWxlY3RPbkxpbmVOdW1iZXJzOiBmYWxzZSxcclxuICAgICAgICAgICAgLy8gc2VsZWN0aW9uSGlnaGxpZ2h0OiBmYWxzZSxcclxuICAgICAgICAgICAgYXV0b21hdGljTGF5b3V0OiB0cnVlLFxyXG4gICAgICAgICAgICBzY3JvbGxCZXlvbmRMYXN0TGluZTogZmFsc2UsXHJcbiAgICAgICAgICAgIG9jY3VycmVuY2VzSGlnaGxpZ2h0OiBmYWxzZSxcclxuICAgICAgICAgICAgYXV0b0luZGVudDogXCJhZHZhbmNlZFwiLFxyXG4gICAgICAgICAgICAvLyByZW5kZXJXaGl0ZXNwYWNlOiBcImJvdW5kYXJ5XCIsXHJcbiAgICAgICAgICAgIGRyYWdBbmREcm9wOiB0cnVlLFxyXG4gICAgICAgICAgICBmb3JtYXRPblR5cGU6IHRydWUsXHJcbiAgICAgICAgICAgIGZvcm1hdE9uUGFzdGU6IHRydWUsXHJcbiAgICAgICAgICAgIHN1Z2dlc3RGb250U2l6ZTogMTYsXHJcbiAgICAgICAgICAgIHN1Z2dlc3RMaW5lSGVpZ2h0OiAyMixcclxuICAgICAgICAgICAgc3VnZ2VzdDoge1xyXG4gICAgICAgICAgICAgICAgbG9jYWxpdHlCb251czogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGluc2VydE1vZGU6IFwicmVwbGFjZVwiXHJcbiAgICAgICAgICAgICAgICAvLyBzbmlwcGV0c1ByZXZlbnRRdWlja1N1Z2dlc3Rpb25zOiBmYWxzZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBwYXJhbWV0ZXJIaW50czogeyBlbmFibGVkOiB0cnVlLCBjeWNsZTogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAvLyAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgLy8gY29udHJpYkluZm86IHtcclxuICAgICAgICAgICAgLy8gICAgIHN1Z2dlc3RTZWxlY3Rpb246ICdyZWNlbnRseVVzZWRCeVByZWZpeCcsXHJcbiAgICAgICAgICAgIC8vIH0sXHJcblxyXG4gICAgICAgICAgICBtb3VzZVdoZWVsWm9vbTogdGhpcy5pc0VtYmVkZGVkLFxyXG4gICAgICAgICAgICB0YWJTaXplOiAzLFxyXG4gICAgICAgICAgICBpbnNlcnRTcGFjZXM6IHRydWUsXHJcbiAgICAgICAgICAgIGRldGVjdEluZGVudGF0aW9uOiBmYWxzZSxcclxuICAgICAgICAgICAgbWluaW1hcDoge1xyXG4gICAgICAgICAgICAgICAgZW5hYmxlZDogdGhpcy5zaG93TWluaW1hcFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzY3JvbGxiYXI6IHtcclxuICAgICAgICAgICAgICAgIHZlcnRpY2FsOiAnYXV0bycsXHJcbiAgICAgICAgICAgICAgICBob3Jpem9udGFsOiAnYXV0bydcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGhlbWU6IFwibXlDdXN0b21UaGVtZURhcmtcIixcclxuICAgICAgICAgICAgLy8gYXV0b21hdGljTGF5b3V0OiB0cnVlXHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICApO1xyXG5cclxuICAgICAgICB0aGlzLmVkaXRvci5vbktleURvd24oKGU6IG1vbmFjby5JS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgc3RhdGUgPSB0aGlzLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS5zdGF0ZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChbSW50ZXJwcmV0ZXJTdGF0ZS5kb25lLCBJbnRlcnByZXRlclN0YXRlLmVycm9yLCBJbnRlcnByZXRlclN0YXRlLm5vdF9pbml0aWFsaXplZF0uaW5kZXhPZihzdGF0ZSkgPCAwKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGUuY29kZS5pbmRleE9mKFwiQXJyb3dcIikgPj0gMCB8fCBlLmNvZGUuaW5kZXhPZihcIlBhZ2VcIikgPj0gMCkgcmV0dXJuOyAvLyBkb24ndCByZWFjdCB0byBDdXJzb3Iga2V5c1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5nZXRBY3Rpb25NYW5hZ2VyKCkudHJpZ2dlcihcImludGVycHJldGVyLnN0b3BcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gdGhpcy51cmkgPSBtb25hY28uVXJpLmZyb20oeyBwYXRoOiAnL2ZpbGUxLmphdmEnLCBzY2hlbWU6ICdmaWxlJyB9KVxyXG4gICAgICAgIC8vIHRoaXMubW9kZWxKYXZhID0gbW9uYWNvLmVkaXRvci5jcmVhdGVNb2RlbChcIlwiLCBcIm15SmF2YVwiLCB0aGlzLnVyaSk7XHJcbiAgICAgICAgLy8gdGhpcy5lZGl0b3Iuc2V0TW9kZWwodGhpcy5tb2RlbEphdmEpO1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIGxldCBtb3VzZVdoZWVsTGlzdGVuZXIgPSAoZXZlbnQ6IFdoZWVsRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYgKGV2ZW50LmN0cmxLZXkgPT09IHRydWUpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGF0LmNoYW5nZUVkaXRvckZvbnRTaXplKE1hdGguc2lnbihldmVudC5kZWx0YVkpLCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmlzRW1iZWRkZWQpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBfbWFpbjogTWFpbiA9IDxNYWluPnRoaXMubWFpbjtcclxuXHJcbiAgICAgICAgICAgIF9tYWluLndpbmRvd1N0YXRlTWFuYWdlci5yZWdpc3RlckJhY2tCdXR0b25MaXN0ZW5lcigoZXZlbnQ6IFBvcFN0YXRlRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBoaXN0b3J5RW50cnk6IEhpc3RvcnlFbnRyeSA9IDxIaXN0b3J5RW50cnk+ZXZlbnQuc3RhdGU7XHJcbiAgICAgICAgICAgICAgICBpZihldmVudC5zdGF0ZSA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBsZXQgd29ya3NwYWNlOiBXb3Jrc3BhY2UgPSBfbWFpbi53b3Jrc3BhY2VMaXN0LmZpbmQoKHdzKSA9PiB3cy5pZCA9PSBoaXN0b3J5RW50cnkud29ya3NwYWNlX2lkKTtcclxuICAgICAgICAgICAgICAgIGlmKHdvcmtzcGFjZSA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBsZXQgbW9kdWxlOiBNb2R1bGUgPSB3b3Jrc3BhY2UubW9kdWxlU3RvcmUuZmluZE1vZHVsZUJ5SWQoaGlzdG9yeUVudHJ5Lm1vZHVsZV9pZCk7XHJcbiAgICAgICAgICAgICAgICBpZihtb2R1bGUgPT0gbnVsbCkgcmV0dXJuOyBcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlByb2Nlc3NpbmcgcG9wIHN0YXRlIGV2ZW50LCByZXR1cm5pbmcgdG8gbW9kdWxlIFwiICsgaGlzdG9yeUVudHJ5Lm1vZHVsZV9pZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYod29ya3NwYWNlICE9IF9tYWluLmN1cnJlbnRXb3Jrc3BhY2UpIFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZG9udFB1c2hOZXh0Q3Vyc29yTW92ZSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIF9tYWluLnByb2plY3RFeHBsb3Jlci5zZXRXb3Jrc3BhY2VBY3RpdmUod29ya3NwYWNlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmRvbnRQdXNoTmV4dEN1cnNvck1vdmUtLTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKG1vZHVsZSAhPSBfbWFpbi5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5kb250UHVzaE5leHRDdXJzb3JNb3ZlKys7XHJcbiAgICAgICAgICAgICAgICAgICAgX21haW4ucHJvamVjdEV4cGxvcmVyLnNldE1vZHVsZUFjdGl2ZShtb2R1bGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZG9udFB1c2hOZXh0Q3Vyc29yTW92ZS0tO1xyXG4gICAgICAgICAgICAgICAgfSBcclxuICAgICAgICAgICAgICAgIHRoYXQuZG9udFB1c2hOZXh0Q3Vyc29yTW92ZSsrO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5lZGl0b3Iuc2V0UG9zaXRpb24oaGlzdG9yeUVudHJ5LnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIHRoYXQuZWRpdG9yLnJldmVhbFBvc2l0aW9uKGhpc3RvcnlFbnRyeS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmRvbnRQdXNoTmV4dEN1cnNvck1vdmUtLTtcclxuICAgICAgICAgICAgICAgIHRoYXQucHVzaEhpc3RvcnlTdGF0ZSh0cnVlLCBoaXN0b3J5RW50cnkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZWRpdG9yLm9uRGlkQ2hhbmdlQ29uZmlndXJhdGlvbigoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYgKGV2ZW50Lmhhc0NoYW5nZWQobW9uYWNvLmVkaXRvci5FZGl0b3JPcHRpb24uZm9udEluZm8pICYmIHRoaXMuaXNFbWJlZGRlZCkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKS5lcnJvck1hbmFnZXIucmVnaXN0ZXJMaWdodGJ1bGJPbkNsaWNrRnVuY3Rpb25zKCk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuZWRpdG9yLm9uRGlkQ2hhbmdlQ3Vyc29yUG9zaXRpb24oKGV2ZW50KSA9PiB7XHJcblxyXG4gICAgICAgICAgICBsZXQgY3VycmVudE1vZGVsSWQgPSB0aGlzLm1haW4uZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCk/LmZpbGU/LmlkO1xyXG4gICAgICAgICAgICBpZihjdXJyZW50TW9kZWxJZCA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgICAgIGxldCBwdXNoTmVlZGVkID0gdGhpcy5sYXN0UG9zaXRpb24gPT0gbnVsbFxyXG4gICAgICAgICAgICAgICAgfHwgZXZlbnQuc291cmNlID09IFwiYXBpXCJcclxuICAgICAgICAgICAgICAgIHx8IGN1cnJlbnRNb2RlbElkICE9IHRoaXMubGFzdFBvc2l0aW9uLm1vZHVsZV9pZFxyXG4gICAgICAgICAgICAgICAgfHwgTWF0aC5hYnModGhpcy5sYXN0UG9zaXRpb24ucG9zaXRpb24ubGluZU51bWJlciAtIGV2ZW50LnBvc2l0aW9uLmxpbmVOdW1iZXIpID4gMjA7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZihwdXNoTmVlZGVkICYmIHRoaXMuZG9udFB1c2hOZXh0Q3Vyc29yTW92ZSA9PSAwKXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZShmYWxzZSwgdGhpcy5nZXRQb3NpdGlvbkZvckhpc3RvcnkoKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZihjdXJyZW50TW9kZWxJZCA9PSBoaXN0b3J5LnN0YXRlPy5tb2R1bGVfaWQpe1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUodHJ1ZSwgdGhpcy5nZXRQb3NpdGlvbkZvckhpc3RvcnkoKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoYXQub25EaWRDaGFuZ2VDdXJzb3JQb3NpdGlvbihldmVudC5wb3NpdGlvbik7XHJcblxyXG4gICAgICAgICAgICB0aGF0Lm9uRXZhbHVhdGVTZWxlY3RlZFRleHQoZXZlbnQpO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gV2UgbmVlZCB0aGlzIHRvIHNldCBvdXIgbW9kZWwgYWZ0ZXIgdXNlciB1c2VzIFN0cmcrY2xpY2sgb24gaWRlbnRpZmllclxyXG4gICAgICAgIHRoaXMuZWRpdG9yLm9uRGlkQ2hhbmdlTW9kZWwoKGV2ZW50KSA9PiB7XHJcblxyXG4gICAgICAgICAgICBsZXQgZWxlbWVudDogSFRNTERpdkVsZW1lbnQgPSA8YW55PiRlbGVtZW50LmZpbmQoJy5tb25hY28tZWRpdG9yJylbMF07XHJcbiAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIG1vdXNlV2hlZWxMaXN0ZW5lcik7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIG1vdXNlV2hlZWxMaXN0ZW5lciwgeyBwYXNzaXZlOiBmYWxzZSB9KTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm1haW4uZ2V0Q3VycmVudFdvcmtzcGFjZSgpID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGxldCBtb2R1bGUgPSB0aGlzLm1haW4uZ2V0Q3VycmVudFdvcmtzcGFjZSgpLmdldE1vZHVsZUJ5TW9uYWNvTW9kZWwodGhpcy5lZGl0b3IuZ2V0TW9kZWwoKSk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm1haW4gaW5zdGFuY2VvZiBNYWluICYmIG1vZHVsZSAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gaWYoIXRoaXMuZG9udFB1c2hIaXN0b3J5U3RhdGVPbk5leHRNb2RlbENoYW5nZSl7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5sYXN0UG9zaXRpb24gPSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmVkaXRvci5nZXRQb3NpdGlvbigpLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB3b3Jrc3BhY2VfaWQ6IHRoaXMubWFpbi5nZXRDdXJyZW50V29ya3NwYWNlKCkuaWQsXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIG1vZHVsZV9pZDogbW9kdWxlLmZpbGUuaWRcclxuICAgICAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgIC8vIHRoaXMuZG9udFB1c2hIaXN0b3J5U3RhdGVPbk5leHRNb2RlbENoYW5nZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5wcm9qZWN0RXhwbG9yZXIuc2V0QWN0aXZlQWZ0ZXJFeHRlcm5hbE1vZGVsU2V0KG1vZHVsZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHB1c2hOZWVkZWQgPSB0aGlzLmxhc3RQb3NpdGlvbiA9PSBudWxsXHJcbiAgICAgICAgICAgICAgICAgICAgfHwgbW9kdWxlLmZpbGUuaWQgIT0gdGhpcy5sYXN0UG9zaXRpb24ubW9kdWxlX2lkO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZihwdXNoTmVlZGVkICYmIHRoaXMuZG9udFB1c2hOZXh0Q3Vyc29yTW92ZSA9PSAwKXtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoZmFsc2UsIHRoaXMuZ2V0UG9zaXRpb25Gb3JIaXN0b3J5KCkpO1xyXG4gICAgICAgICAgICAgICAgfSAgICBcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4vLyAgICAgICAgbW9uYWNvLmxhbmd1YWdlcy5yZWdpc3RlckRvY3VtZW50UmFuZ2VTZW1hbnRpY1Rva2Vuc1Byb3ZpZGVyKCdteUphdmEnLCBuZXcgTXlTZW1hbnRpY1Rva2VuUHJvdmlkZXIodGhpcy5tYWluKSk7XHJcblxyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJSZW5hbWVQcm92aWRlcignbXlKYXZhJywgdGhpcyk7XHJcbiAgICAgICAgbW9uYWNvLmxhbmd1YWdlcy5yZWdpc3RlckNvbG9yUHJvdmlkZXIoJ215SmF2YScsIG5ldyBNeUNvbG9yUHJvdmlkZXIodGhpcy5tYWluKSk7XHJcblxyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJEZWZpbml0aW9uUHJvdmlkZXIoJ215SmF2YScsIHtcclxuICAgICAgICAgICAgcHJvdmlkZURlZmluaXRpb246IChtb2RlbCwgcG9zaXRpb24sIGNhbmNlbGxhdGlvblRva2VuKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhhdC5wcm92aWRlRGVmaW5pdGlvbihtb2RlbCwgcG9zaXRpb24sIGNhbmNlbGxhdGlvblRva2VuKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVySG92ZXJQcm92aWRlcignbXlKYXZhJywgbmV3IE15SG92ZXJQcm92aWRlcih0aGlzKSk7XHJcblxyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJDb21wbGV0aW9uSXRlbVByb3ZpZGVyKCdteUphdmEnLCBuZXcgTXlDb21wbGV0aW9uSXRlbVByb3ZpZGVyKHRoaXMubWFpbikpO1xyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJDb2RlQWN0aW9uUHJvdmlkZXIoJ215SmF2YScsIG5ldyBNeUNvZGVBY3Rpb25Qcm92aWRlcih0aGlzLm1haW4pKTtcclxuICAgICAgICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVyUmVmZXJlbmNlUHJvdmlkZXIoJ215SmF2YScsIG5ldyBNeVJlZmVyZW5jZVByb3ZpZGVyKHRoaXMubWFpbikpO1xyXG5cclxuXHJcbiAgICAgICAgbW9uYWNvLmxhbmd1YWdlcy5yZWdpc3RlclNpZ25hdHVyZUhlbHBQcm92aWRlcignbXlKYXZhJywgbmV3IE15U2lnbmF0dXJlSGVscFByb3ZpZGVyKHRoaXMubWFpbikpO1xyXG5cclxuICAgICAgICB0aGlzLmVkaXRvci5vbk1vdXNlRG93bigoZTogbW9uYWNvLmVkaXRvci5JRWRpdG9yTW91c2VFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gZS50YXJnZXQuZGV0YWlsO1xyXG4gICAgICAgICAgICBpZiAoZS50YXJnZXQudHlwZSAhPT0gbW9uYWNvLmVkaXRvci5Nb3VzZVRhcmdldFR5cGUuR1VUVEVSX0dMWVBIX01BUkdJTiAmJlxyXG4gICAgICAgICAgICAgICAgZS50YXJnZXQudHlwZSAhPT0gbW9uYWNvLmVkaXRvci5Nb3VzZVRhcmdldFR5cGUuR1VUVEVSX0xJTkVfTlVNQkVSUyB8fCBkYXRhLmlzQWZ0ZXJMaW5lcykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoYXQub25NYXJnaW5Nb3VzZURvd24oZS50YXJnZXQucG9zaXRpb24ubGluZU51bWJlcik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgIC8vIElmIGVkaXRvciBpcyBpbnN0YW50aWF0ZWQgYmVmb3JlIGZvbnRzIGFyZSBsb2FkZWQgdGhlbiBpbmRlbnRhdGlvbi1saW5lc1xyXG4gICAgICAgIC8vIGFyZSBtaXNwbGFjZWQsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L21vbmFjby1lZGl0b3IvaXNzdWVzLzM5MlxyXG4gICAgICAgIC8vIHNvOlxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBtb25hY28uZWRpdG9yLnJlbWVhc3VyZUZvbnRzKCk7XHJcbiAgICAgICAgfSwgMjAwMCk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQWN0aW9ucygpO1xyXG5cclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICB0aGlzLmVkaXRvci5vbkRpZFR5cGUoKHRleHQpID0+IHsgdGhhdC5vbkRpZFR5cGUodGV4dCkgfSk7XHJcblxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuZWRpdG9yLmdldFN1cHBvcnRlZEFjdGlvbnMoKS5tYXAoYSA9PiBhLmlkKSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLmVkaXRvcjtcclxuICAgIH1cclxuXHJcbiAgICBnZXRQb3NpdGlvbkZvckhpc3RvcnkoKTogSGlzdG9yeUVudHJ5IHtcclxuICAgICAgICBsZXQgbW9kdWxlID0gdGhpcy5tYWluLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpO1xyXG4gICAgICAgIGlmKG1vZHVsZSA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHRoaXMuZWRpdG9yLmdldFBvc2l0aW9uKCksXHJcbiAgICAgICAgICAgIHdvcmtzcGFjZV9pZDogdGhpcy5tYWluLmdldEN1cnJlbnRXb3Jrc3BhY2UoKS5pZCxcclxuICAgICAgICAgICAgbW9kdWxlX2lkOiB0aGlzLm1haW4uZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCkuZmlsZS5pZFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBsYXN0UHVzaFRpbWU6IG51bWJlciA9IDA7XHJcbiAgICBwdXNoSGlzdG9yeVN0YXRlKHJlcGxhY2U6IGJvb2xlYW4sIGhpc3RvcnlFbnRyeTogSGlzdG9yeUVudHJ5KXtcclxuXHJcbiAgICAgICAgaWYodGhpcy5tYWluLmlzRW1iZWRkZWQoKSB8fCBoaXN0b3J5RW50cnkgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZihyZXBsYWNlKXtcclxuICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoaGlzdG9yeUVudHJ5LCBcIlwiKTsgLy9gSmF2YS1PbmxpbmUsICR7bW9kdWxlLmZpbGUubmFtZX0gKFplaWxlICR7dGhpcy5sYXN0UG9zaXRpb24ucG9zaXRpb24ubGluZU51bWJlcn0sIFNwYWx0ZSAke3RoaXMubGFzdFBvc2l0aW9uLnBvc2l0aW9uLmNvbHVtbn0pYCk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiUmVwbGFjZSBIaXN0b3J5IHN0YXRlIHdpdGggd29ya3NwYWNlLWlkOiBcIiArIGhpc3RvcnlFbnRyeS53b3Jrc3BhY2VfaWQgKyBcIiwgbW9kdWxlLWlkOiBcIiArIGhpc3RvcnlFbnRyeS5tb2R1bGVfaWQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCB0aW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgICAgIGlmKHRpbWUgLSB0aGlzLmxhc3RQdXNoVGltZSA+IDIwMCl7XHJcbiAgICAgICAgICAgICAgICBoaXN0b3J5LnB1c2hTdGF0ZShoaXN0b3J5RW50cnksIFwiXCIpOyAvL2BKYXZhLU9ubGluZSwgJHttb2R1bGUuZmlsZS5uYW1lfSAoWmVpbGUgJHtoaXN0b3J5RW50cnkucG9zaXRpb24ubGluZU51bWJlcn0sIFNwYWx0ZSAke2hpc3RvcnlFbnRyeS5wb3NpdGlvbi5jb2x1bW59KWApO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoaGlzdG9yeUVudHJ5LCBcIlwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmxhc3RQdXNoVGltZSA9IHRpbWU7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiUHVzaGVkIEhpc3Rvcnkgc3RhdGUgd2l0aCB3b3Jrc3BhY2UtaWQ6IFwiICsgaGlzdG9yeUVudHJ5LndvcmtzcGFjZV9pZCArIFwiLCBtb2R1bGUtaWQ6IFwiICsgaGlzdG9yeUVudHJ5Lm1vZHVsZV9pZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxhc3RQb3NpdGlvbiA9IGhpc3RvcnlFbnRyeTtcclxuICAgIH1cclxuXHJcbiAgICBvbkRpZFR5cGUodGV4dDogc3RyaW5nKSB7XHJcbiAgICAgICAgLy8gICAgICAgIGNvbnN0IGVuZE9mQ29tbWVudFRleHQgPSBcIiAqIFxcbiAqL1wiO1xyXG5cclxuICAgICAgICBjb25zdCBpbnNlcnRUZXh0QW5kU2V0Q3Vyc29yID0gKHBvcywgaW5zZXJ0VGV4dDogc3RyaW5nLCBuZXdMaW5lOiBudW1iZXIsIG5ld0NvbHVtbjogbnVtYmVyKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlID0gbmV3IG1vbmFjby5SYW5nZShcclxuICAgICAgICAgICAgICAgIHBvcy5saW5lTnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgcG9zLmNvbHVtbixcclxuICAgICAgICAgICAgICAgIHBvcy5saW5lTnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgcG9zLmNvbHVtblxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB0aGlzLmVkaXRvci5leGVjdXRlRWRpdHMoXCJuZXctYnVsbGV0c1wiLCBbXHJcbiAgICAgICAgICAgICAgICB7IHJhbmdlLCB0ZXh0OiBpbnNlcnRUZXh0IH1cclxuICAgICAgICAgICAgXSk7XHJcblxyXG4gICAgICAgICAgICAvLyBTZXQgcG9zaXRpb24gYWZ0ZXIgYnVsbGV0VGV4dFxyXG4gICAgICAgICAgICB0aGlzLmVkaXRvci5zZXRQb3NpdGlvbih7XHJcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBuZXdMaW5lLFxyXG4gICAgICAgICAgICAgICAgY29sdW1uOiBuZXdDb2x1bW5cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKHRleHQgPT09IFwiXFxuXCIpIHtcclxuICAgICAgICAgICAgY29uc3QgbW9kZWwgPSB0aGlzLmVkaXRvci5nZXRNb2RlbCgpO1xyXG4gICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMuZWRpdG9yLmdldFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHByZXZMaW5lID0gbW9kZWwuZ2V0TGluZUNvbnRlbnQocG9zaXRpb24ubGluZU51bWJlciAtIDEpO1xyXG4gICAgICAgICAgICBpZiAocHJldkxpbmUudHJpbSgpLmluZGV4T2YoXCIvKlwiKSA9PT0gMCAmJiAhcHJldkxpbmUudHJpbVJpZ2h0KCkuZW5kc1dpdGgoXCIqL1wiKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbmV4dExpbmUgPSBwb3NpdGlvbi5saW5lTnVtYmVyIDwgbW9kZWwuZ2V0TGluZUNvdW50KCkgPyBtb2RlbC5nZXRMaW5lQ29udGVudChwb3NpdGlvbi5saW5lTnVtYmVyICsgMSkgOiBcIlwiO1xyXG4gICAgICAgICAgICAgICAgaWYoIW5leHRMaW5lLnRyaW0oKS5zdGFydHNXaXRoKFwiKlwiKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNwYWNlc0F0QmVnaW5uaW5nT2ZMaW5lOiBzdHJpbmcgPSBwcmV2TGluZS5zdWJzdHIoMCwgcHJldkxpbmUubGVuZ3RoIC0gcHJldkxpbmUudHJpbUxlZnQoKS5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2TGluZS50cmltKCkuaW5kZXhPZihcIi8qKlwiKSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0QW5kU2V0Q3Vyc29yKHBvc2l0aW9uLCBcIlxcblwiICsgc3BhY2VzQXRCZWdpbm5pbmdPZkxpbmUgKyBcIiAqL1wiLCBwb3NpdGlvbi5saW5lTnVtYmVyLCBwb3NpdGlvbi5jb2x1bW4gKyAzICsgc3BhY2VzQXRCZWdpbm5pbmdPZkxpbmUubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0QW5kU2V0Q3Vyc29yKHBvc2l0aW9uLCBcIiAqIFxcblwiICsgc3BhY2VzQXRCZWdpbm5pbmdPZkxpbmUgKyBcIiAqL1wiLCBwb3NpdGlvbi5saW5lTnVtYmVyLCBwb3NpdGlvbi5jb2x1bW4gKyAzICsgc3BhY2VzQXRCZWdpbm5pbmdPZkxpbmUubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYodGV4dCA9PSAnXCInKSB7XHJcbiAgICAgICAgICAgIC8vYTogeHwgLT4geFwifFwiXHJcbiAgICAgICAgICAgIC8vZDogXCJ8eCAtPiBcIlwifHhcclxuICAgICAgICAgICAgLy9jOiBcInxcIiAtPiBcIlwiXCJcXG58XFxuXCJcIlwiXHJcbiAgICAgICAgICAgIGNvbnN0IG1vZGVsID0gdGhpcy5lZGl0b3IuZ2V0TW9kZWwoKTtcclxuICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLmVkaXRvci5nZXRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICBjb25zdCBzZWxlY3Rpb24gPSB0aGlzLmVkaXRvci5nZXRTZWxlY3Rpb24oKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBzZWxlY3Rpb24uc3RhcnRDb2x1bW4gIT0gc2VsZWN0aW9uLmVuZENvbHVtbiB8fCBzZWxlY3Rpb24uc3RhcnRMaW5lTnVtYmVyICE9IHNlbGVjdGlvbi5lbmRMaW5lTnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgbGluZSA9IG1vZGVsLmdldExpbmVDb250ZW50KHBvc2l0aW9uLmxpbmVOdW1iZXIpO1xyXG4gICAgICAgICAgICBsZXQgZG9JbnNlcnQ6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgY2hhckJlZm9yZTogc3RyaW5nID0gXCJ4XCI7XHJcbiAgICAgICAgICAgIGlmKHBvc2l0aW9uLmNvbHVtbiA+IDEpe1xyXG4gICAgICAgICAgICAgICAgY2hhckJlZm9yZSA9IGxpbmUuY2hhckF0KHBvc2l0aW9uLmNvbHVtbiAtIDMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBjaGFyQWZ0ZXI6IHN0cmluZyA9IFwieFwiO1xyXG4gICAgICAgICAgICBpZihwb3NpdGlvbi5jb2x1bW4gLSAxIDwgbGluZS5sZW5ndGgpe1xyXG4gICAgICAgICAgICAgICAgY2hhckFmdGVyID0gbGluZS5jaGFyQXQocG9zaXRpb24uY29sdW1uIC0gMSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmKCFpc1NlbGVjdGVkKXtcclxuICAgICAgICAgICAgICAgIGlmKGNoYXJCZWZvcmUgIT0gJ1wiJyl7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dEFuZFNldEN1cnNvcihwb3NpdGlvbiwgJ1wiJywgcG9zaXRpb24ubGluZU51bWJlciwgcG9zaXRpb24uY29sdW1uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZihjaGFyQWZ0ZXIgPT0gJ1wiJyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBvczEgPSB7Li4ucG9zaXRpb24sIGNvbHVtbjogcG9zaXRpb24uY29sdW1uICsgMX07XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dEFuZFNldEN1cnNvcihwb3MxLCAnXFxuXFxuXCJcIlwiJywgcG9zaXRpb24ubGluZU51bWJlciArIDEsIDEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBsYXN0VGltZTogbnVtYmVyID0gMDtcclxuICAgIHNldEZvbnRTaXplKGZvbnRTaXplUHg6IG51bWJlcikge1xyXG5cclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlNldCBmb250IHNpemU6IFwiICsgZm9udFNpemVQeCk7XHJcbiAgICAgICAgbGV0IHRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICBpZiAodGltZSAtIHRoaXMubGFzdFRpbWUgPCAxNTApIHJldHVybjtcclxuICAgICAgICB0aGlzLmxhc3RUaW1lID0gdGltZTtcclxuXHJcbiAgICAgICAgbGV0IGVkaXRvcmZzID0gdGhpcy5lZGl0b3IuZ2V0T3B0aW9ucygpLmdldChtb25hY28uZWRpdG9yLkVkaXRvck9wdGlvbi5mb250U2l6ZSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1haW4gaW5zdGFuY2VvZiBNYWluKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFpbi52aWV3TW9kZUNvbnRyb2xsZXIuc2F2ZUZvbnRTaXplKGZvbnRTaXplUHgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGZvbnRTaXplUHggIT0gZWRpdG9yZnMpIHtcclxuICAgICAgICAgICAgdGhpcy5lZGl0b3IudXBkYXRlT3B0aW9ucyh7XHJcbiAgICAgICAgICAgICAgICBmb250U2l6ZTogZm9udFNpemVQeFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIGVkaXRvciBkb2VzIG5vdCBzZXQgZm9udFNpemVQeCwgYnV0IGZvbnRTaXplUHggKiB6b29tZmFjdG9yIHdpdGggdW5rbm93biB6b29tIGZhY3Rvciwgc28gXHJcbiAgICAgICAgICAgIC8vIHdlIGhhdmUgdG8gZG8gdGhpcyBkaXJ0eSB3b3JrYXJvdW5kOlxyXG4gICAgICAgICAgICBsZXQgbmV3RWRpdG9yZnMgPSB0aGlzLmVkaXRvci5nZXRPcHRpb25zKCkuZ2V0KG1vbmFjby5lZGl0b3IuRWRpdG9yT3B0aW9uLmZvbnRTaXplKTtcclxuICAgICAgICAgICAgbGV0IGZhY3RvciA9IG5ld0VkaXRvcmZzIC8gZm9udFNpemVQeDtcclxuICAgICAgICAgICAgdGhpcy5lZGl0b3IudXBkYXRlT3B0aW9ucyh7XHJcbiAgICAgICAgICAgICAgICBmb250U2l6ZTogZm9udFNpemVQeCAvIGZhY3RvclxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxldCBib3R0b21EaXYxID0gdGhpcy5tYWluLmdldEJvdHRvbURpdigpO1xyXG4gICAgICAgICAgICBpZiAoYm90dG9tRGl2MSAhPSBudWxsICYmIGJvdHRvbURpdjEuY29uc29sZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBib3R0b21EaXYxLmNvbnNvbGUuZWRpdG9yLnVwZGF0ZU9wdGlvbnMoe1xyXG4gICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOiBmb250U2l6ZVB4IC8gZmFjdG9yXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBib3R0b21EaXYgPSB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCk7XHJcbiAgICAgICAgaWYgKGJvdHRvbURpdiAhPSBudWxsICYmIGJvdHRvbURpdi5jb25zb2xlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0ICRjb21tYW5kTGluZSA9IGJvdHRvbURpdi4kYm90dG9tRGl2LmZpbmQoJy5qb19jb21tYW5kbGluZScpO1xyXG4gICAgICAgICAgICAkY29tbWFuZExpbmUuY3NzKHtcclxuICAgICAgICAgICAgICAgIGhlaWdodDogKGZvbnRTaXplUHggKiAxLjEgKyA0KSArIFwicHhcIixcclxuICAgICAgICAgICAgICAgIFwibGluZS1oZWlnaHRcIjogKGZvbnRTaXplUHggKiAxLjEgKyA0KSArIFwicHhcIlxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICBib3R0b21EaXYuY29uc29sZS5lZGl0b3IubGF5b3V0KCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgLy8gbGV0IG5ld0VkaXRvcmZzID0gdGhpcy5lZGl0b3IuZ2V0T3B0aW9ucygpLmdldChtb25hY28uZWRpdG9yLkVkaXRvck9wdGlvbi5mb250U2l6ZSk7XHJcblxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHtlZGl0b3JGUzogZWRpdG9yZnMsIG5ld0ZzOiBmb250U2l6ZVB4LCBuZXdFZGl0b3JGczogbmV3RWRpdG9yZnN9KTtcclxuXHJcblxyXG4gICAgICAgIGpRdWVyeSgnLmpvX2VkaXRvckZvbnRTaXplJykuY3NzKCdmb250LXNpemUnLCBmb250U2l6ZVB4ICsgXCJweFwiKTtcclxuICAgICAgICBqUXVlcnkoJy5qb19lZGl0b3JGb250U2l6ZScpLmNzcygnbGluZS1oZWlnaHQnLCAoZm9udFNpemVQeCArIDIpICsgXCJweFwiKTtcclxuXHJcbiAgICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLWJyZWFrcG9pbnQtc2l6ZScsIGZvbnRTaXplUHggKyAncHgnKTtcclxuICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tYnJlYWtwb2ludC1yYWRpdXMnLCBmb250U2l6ZVB4IC8gMiArICdweCcpO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy5tYWluLmdldEJvdHRvbURpdigpLmVycm9yTWFuYWdlci5yZWdpc3RlckxpZ2h0YnVsYk9uQ2xpY2tGdW5jdGlvbnMoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2hhbmdlRWRpdG9yRm9udFNpemUoZGVsdGE6IG51bWJlciwgZHluYW1pYzogYm9vbGVhbiA9IHRydWUpIHtcclxuICAgICAgICBsZXQgZWRpdG9yZnMgPSB0aGlzLmVkaXRvci5nZXRPcHRpb25zKCkuZ2V0KG1vbmFjby5lZGl0b3IuRWRpdG9yT3B0aW9uLmZvbnRTaXplKTtcclxuXHJcbiAgICAgICAgaWYgKGR5bmFtaWMpIHtcclxuICAgICAgICAgICAgaWYgKGVkaXRvcmZzIDwgMTApIHtcclxuICAgICAgICAgICAgICAgIGRlbHRhICo9IDE7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZWRpdG9yZnMgPCAyMCkge1xyXG4gICAgICAgICAgICAgICAgZGVsdGEgKj0gMjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGRlbHRhICo9IDQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBuZXdFZGl0b3JGcyA9IGVkaXRvcmZzICsgZGVsdGE7XHJcbiAgICAgICAgaWYgKG5ld0VkaXRvckZzID49IDYgJiYgbmV3RWRpdG9yRnMgPD0gODApIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRGb250U2l6ZShuZXdFZGl0b3JGcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhZGRBY3Rpb25zKCkge1xyXG4gICAgICAgIHRoaXMuZWRpdG9yLmFkZEFjdGlvbih7XHJcbiAgICAgICAgICAgIC8vIEFuIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjb250cmlidXRlZCBhY3Rpb24uXHJcbiAgICAgICAgICAgIGlkOiAnRmluZCBicmFja2V0JyxcclxuXHJcbiAgICAgICAgICAgIC8vIEEgbGFiZWwgb2YgdGhlIGFjdGlvbiB0aGF0IHdpbGwgYmUgcHJlc2VudGVkIHRvIHRoZSB1c2VyLlxyXG4gICAgICAgICAgICBsYWJlbDogJ0ZpbmRlIGtvcnJlc3BvbmRpZXJlbmRlIEtsYW1tZXInLFxyXG5cclxuICAgICAgICAgICAgLy8gQW4gb3B0aW9uYWwgYXJyYXkgb2Yga2V5YmluZGluZ3MgZm9yIHRoZSBhY3Rpb24uXHJcbiAgICAgICAgICAgIGtleWJpbmRpbmdzOiBbXHJcbiAgICAgICAgICAgICAgICBtb25hY28uS2V5TW9kLkN0cmxDbWQgfCBtb25hY28uS2V5Q29kZS5LRVlfS10sXHJcblxyXG4gICAgICAgICAgICAvLyBBIHByZWNvbmRpdGlvbiBmb3IgdGhpcyBhY3Rpb24uXHJcbiAgICAgICAgICAgIHByZWNvbmRpdGlvbjogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8vIEEgcnVsZSB0byBldmFsdWF0ZSBvbiB0b3Agb2YgdGhlIHByZWNvbmRpdGlvbiBpbiBvcmRlciB0byBkaXNwYXRjaCB0aGUga2V5YmluZGluZ3MuXHJcbiAgICAgICAgICAgIGtleWJpbmRpbmdDb250ZXh0OiBudWxsLFxyXG5cclxuICAgICAgICAgICAgY29udGV4dE1lbnVHcm91cElkOiAnbmF2aWdhdGlvbicsXHJcblxyXG4gICAgICAgICAgICBjb250ZXh0TWVudU9yZGVyOiAxLjUsXHJcblxyXG4gICAgICAgICAgICAvLyBNZXRob2QgdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIHdoZW4gdGhlIGFjdGlvbiBpcyB0cmlnZ2VyZWQuXHJcbiAgICAgICAgICAgIC8vIEBwYXJhbSBlZGl0b3IgVGhlIGVkaXRvciBpbnN0YW5jZSBpcyBwYXNzZWQgaW4gYXMgYSBjb252aW5pZW5jZVxyXG4gICAgICAgICAgICBydW46IGZ1bmN0aW9uIChlZCkge1xyXG4gICAgICAgICAgICAgICAgZWQuZ2V0QWN0aW9uKCdlZGl0b3IuYWN0aW9uLmp1bXBUb0JyYWNrZXQnKS5ydW4oKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFN0cmcgKyAjIGZ1bmt0aW9uaWVydCBiZWkgRmlyZWZveCBuaWNodCwgZGFoZXIgYWx0ZXJuYXRpdiBTdHJnICsgLDpcclxuICAgICAgICB0aGlzLmVkaXRvci5hZGRBY3Rpb24oe1xyXG4gICAgICAgICAgICAvLyBBbiB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY29udHJpYnV0ZWQgYWN0aW9uLlxyXG4gICAgICAgICAgICBpZDogJ1RvZ2dsZSBsaW5lIGNvbW1lbnQnLFxyXG5cclxuICAgICAgICAgICAgLy8gQSBsYWJlbCBvZiB0aGUgYWN0aW9uIHRoYXQgd2lsbCBiZSBwcmVzZW50ZWQgdG8gdGhlIHVzZXIuXHJcbiAgICAgICAgICAgIGxhYmVsOiAnWmVpbGVua29tbWVudGFyIGVpbi0vYXVzc2NoYWx0ZW4nLFxyXG5cclxuICAgICAgICAgICAgLy8gQW4gb3B0aW9uYWwgYXJyYXkgb2Yga2V5YmluZGluZ3MgZm9yIHRoZSBhY3Rpb24uXHJcbiAgICAgICAgICAgIGtleWJpbmRpbmdzOiBbXHJcbiAgICAgICAgICAgICAgICBtb25hY28uS2V5TW9kLkN0cmxDbWQgfCBtb25hY28uS2V5Q29kZS5VU19DT01NQSBdLFxyXG5cclxuICAgICAgICAgICAgLy8gQSBwcmVjb25kaXRpb24gZm9yIHRoaXMgYWN0aW9uLlxyXG4gICAgICAgICAgICBwcmVjb25kaXRpb246IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvLyBBIHJ1bGUgdG8gZXZhbHVhdGUgb24gdG9wIG9mIHRoZSBwcmVjb25kaXRpb24gaW4gb3JkZXIgdG8gZGlzcGF0Y2ggdGhlIGtleWJpbmRpbmdzLlxyXG4gICAgICAgICAgICBrZXliaW5kaW5nQ29udGV4dDogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIGNvbnRleHRNZW51R3JvdXBJZDogJ2luc2VydCcsXHJcblxyXG4gICAgICAgICAgICBjb250ZXh0TWVudU9yZGVyOiAxLjUsXHJcblxyXG4gICAgICAgICAgICAvLyBNZXRob2QgdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIHdoZW4gdGhlIGFjdGlvbiBpcyB0cmlnZ2VyZWQuXHJcbiAgICAgICAgICAgIC8vIEBwYXJhbSBlZGl0b3IgVGhlIGVkaXRvciBpbnN0YW5jZSBpcyBwYXNzZWQgaW4gYXMgYSBjb252aW5pZW5jZVxyXG4gICAgICAgICAgICBydW46IGZ1bmN0aW9uIChlZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0hpZXIhJyk7XHJcbiAgICAgICAgICAgICAgICBlZC5nZXRBY3Rpb24oJ2VkaXRvci5hY3Rpb24uY29tbWVudExpbmUnKS5ydW4oKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuZWRpdG9yLmdldFN1cHBvcnRlZEFjdGlvbnMoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgb25FdmFsdWF0ZVNlbGVjdGVkVGV4dChldmVudDogbW9uYWNvLmVkaXRvci5JQ3Vyc29yUG9zaXRpb25DaGFuZ2VkRXZlbnQpIHtcclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICBpZiAodGhhdC5jdyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoYXQuZWRpdG9yLnJlbW92ZUNvbnRlbnRXaWRnZXQodGhhdC5jdyk7XHJcbiAgICAgICAgICAgIHRoYXQuY3cgPSBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoYXQubWFpbi5nZXRJbnRlcnByZXRlcigpLnN0YXRlID09IEludGVycHJldGVyU3RhdGUucGF1c2VkKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgbW9kZWwgPSB0aGF0LmVkaXRvci5nZXRNb2RlbCgpO1xyXG4gICAgICAgICAgICBsZXQgdGV4dCA9IG1vZGVsLmdldFZhbHVlSW5SYW5nZSh0aGF0LmVkaXRvci5nZXRTZWxlY3Rpb24oKSk7XHJcbiAgICAgICAgICAgIGlmICh0ZXh0ICE9IG51bGwgJiYgdGV4dC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZXZhbHVhdG9yID0gdGhpcy5tYWluLmdldEN1cnJlbnRXb3Jrc3BhY2UoKS5ldmFsdWF0b3I7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0gZXZhbHVhdG9yLmV2YWx1YXRlKHRleHQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5lcnJvciA9PSBudWxsICYmIHJlc3VsdC52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHYgPSByZXN1bHQudmFsdWUudHlwZS5kZWJ1Z091dHB1dChyZXN1bHQudmFsdWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBtb25hY28uZWRpdG9yLmNvbG9yaXplKHRleHQgKyBcIjogXCIsICdteUphdmEnLCB7IHRhYlNpemU6IDMgfSkudGhlbigodGV4dCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGV4dC5lbmRzV2l0aChcIjxici8+XCIpKSB0ZXh0ID0gdGV4dC5zdWJzdHIoMCwgdGV4dC5sZW5ndGggLSA1KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jdyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldElkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdteS5jb250ZW50LndpZGdldCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0RG9tTm9kZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkbiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX2VkaXRvclRvb2x0aXAgam9fY29kZUZvbnRcIj4nICsgdGV4dCArIHYgKyAnPC9kaXY+Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRuWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldFBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGV2ZW50LnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVmZXJlbmNlOiBbbW9uYWNvLmVkaXRvci5Db250ZW50V2lkZ2V0UG9zaXRpb25QcmVmZXJlbmNlLkFCT1ZFLCBtb25hY28uZWRpdG9yLkNvbnRlbnRXaWRnZXRQb3NpdGlvblByZWZlcmVuY2UuQkVMT1ddXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5lZGl0b3IuYWRkQ29udGVudFdpZGdldCh0aGF0LmN3KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBvbk1hcmdpbk1vdXNlRG93bihsaW5lTnVtYmVyOiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgbW9kdWxlID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKTtcclxuICAgICAgICBpZiAobW9kdWxlID09IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW9kdWxlLnRvZ2dsZUJyZWFrcG9pbnQobGluZU51bWJlciwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS5tb2R1bGVTdG9yZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCBydW5uaW5nTW9kdWxlID0gdGhpcy5tYWluLmdldEludGVycHJldGVyKCkubW9kdWxlU3RvcmUuZmluZE1vZHVsZUJ5RmlsZShtb2R1bGUuZmlsZSk7XHJcbiAgICAgICAgICAgIGlmIChydW5uaW5nTW9kdWxlICE9IG51bGwpIHJ1bm5pbmdNb2R1bGUudG9nZ2xlQnJlYWtwb2ludChsaW5lTnVtYmVyLCBmYWxzZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBlbGVtZW50RGVjb3JhdGlvbjogc3RyaW5nW10gPSBbXTtcclxuICAgIG9uRGlkQ2hhbmdlQ3Vyc29yUG9zaXRpb24ocG9zaXRpb246IHsgbGluZU51bWJlcjogbnVtYmVyLCBjb2x1bW46IG51bWJlciB9KSB7XHJcblxyXG4gICAgICAgIGlmIChwb3NpdGlvbiA9PSBudWxsKSBwb3NpdGlvbiA9IHRoaXMuZWRpdG9yLmdldFBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgIGxldCBtb2R1bGUgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpO1xyXG4gICAgICAgIGlmIChtb2R1bGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnREZWNvcmF0aW9uID0gdGhpcy5lZGl0b3IuZGVsdGFEZWNvcmF0aW9ucyh0aGlzLmVsZW1lbnREZWNvcmF0aW9uLCBbXSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBlbGVtZW50ID0gbW9kdWxlLmdldEVsZW1lbnRBdFBvc2l0aW9uKHBvc2l0aW9uLmxpbmVOdW1iZXIsIHBvc2l0aW9uLmNvbHVtbik7XHJcblxyXG4gICAgICAgIGxldCBkZWNvcmF0aW9uczogbW9uYWNvLmVkaXRvci5JTW9kZWxEZWx0YURlY29yYXRpb25bXSA9IFtdO1xyXG5cclxuICAgICAgICBpZiAoZWxlbWVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCB1c2FnZVBvc2l0aW9ucyA9IGVsZW1lbnQudXNhZ2VQb3NpdGlvbnM7XHJcbiAgICAgICAgICAgIGxldCB1cEluQ3VycmVudE1vZHVsZSA9IHVzYWdlUG9zaXRpb25zLmdldChtb2R1bGUpO1xyXG4gICAgICAgICAgICBpZiAodXBJbkN1cnJlbnRNb2R1bGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgdXAgb2YgdXBJbkN1cnJlbnRNb2R1bGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWNvcmF0aW9ucy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHsgc3RhcnRDb2x1bW46IHVwLmNvbHVtbiwgc3RhcnRMaW5lTnVtYmVyOiB1cC5saW5lLCBlbmRDb2x1bW46IHVwLmNvbHVtbiArIHVwLmxlbmd0aCwgZW5kTGluZU51bWJlcjogdXAubGluZSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdqb19yZXZlYWxTeW50YXhFbGVtZW50JywgaXNXaG9sZUxpbmU6IGZhbHNlLCBvdmVydmlld1J1bGVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6IHsgaWQ6IFwiZWRpdG9ySW5kZW50R3VpZGUuYmFja2dyb3VuZFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGFya0NvbG9yOiB7IGlkOiBcImVkaXRvckluZGVudEd1aWRlLmFjdGl2ZUJhY2tncm91bmRcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBtb25hY28uZWRpdG9yLk92ZXJ2aWV3UnVsZXJMYW5lLkxlZnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhpZ2hsaWdodEN1cnJlbnRNZXRob2QpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBtb2R1bGUuZ2V0TWV0aG9kRGVjbGFyYXRpb25BdFBvc2l0aW9uKHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgaWYgKG1ldGhvZCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBkZWNvcmF0aW9ucy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICByYW5nZTogeyBzdGFydENvbHVtbjogMCwgc3RhcnRMaW5lTnVtYmVyOiBtZXRob2QucG9zaXRpb24ubGluZSwgZW5kQ29sdW1uOiAxMDAsIGVuZExpbmVOdW1iZXI6IG1ldGhvZC5zY29wZVRvLmxpbmUgfSxcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2pvX2hpZ2hsaWdodE1ldGhvZCcsIGlzV2hvbGVMaW5lOiB0cnVlLCBvdmVydmlld1J1bGVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogeyBpZDogXCJqb19oaWdobGlnaHRNZXRob2RcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGFya0NvbG9yOiB7IGlkOiBcImpvX2hpZ2hsaWdodE1ldGhvZFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbW9uYWNvLmVkaXRvci5PdmVydmlld1J1bGVyTGFuZS5MZWZ0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiB7IGlkOiAnam9faGlnaGxpZ2h0TWV0aG9kJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG1vbmFjby5lZGl0b3IuTWluaW1hcFBvc2l0aW9uLklubGluZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB6SW5kZXg6IC0xMDBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5lbGVtZW50RGVjb3JhdGlvbiA9IHRoaXMuZWRpdG9yLmRlbHRhRGVjb3JhdGlvbnModGhpcy5lbGVtZW50RGVjb3JhdGlvbiwgZGVjb3JhdGlvbnMpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKTogTW9kdWxlIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYWluLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGRvbnREZXRlY3RMYXN0Q2hhbmdlKCkge1xyXG4gICAgICAgIC8vIHRoaXMuZG9udERldGVjdExhc3RDaGFuZ2luZyA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmVzb2x2ZVJlbmFtZUxvY2F0aW9uKG1vZGVsOiBtb25hY28uZWRpdG9yLklUZXh0TW9kZWwsIHBvc2l0aW9uOiBtb25hY28uUG9zaXRpb24sXHJcbiAgICAgICAgdG9rZW46IG1vbmFjby5DYW5jZWxsYXRpb25Ub2tlbik6IG1vbmFjby5sYW5ndWFnZXMuUHJvdmlkZXJSZXN1bHQ8bW9uYWNvLmxhbmd1YWdlcy5SZW5hbWVMb2NhdGlvbiAmIG1vbmFjby5sYW5ndWFnZXMuUmVqZWN0aW9uPiB7XHJcblxyXG4gICAgICAgICAgICBsZXQgY3VycmVudGx5RWRpdGVkTW9kdWxlID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKTtcclxuICAgICAgICAgICAgaWYgKGN1cnJlbnRseUVkaXRlZE1vZHVsZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiRGllc2VzIFN5bWJvbCBrYW5uIG5pY2h0IHVtYmVuYW5udCB3ZXJkZW4uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0UmVhc29uOiBcIkRpZXNlcyBTeW1ib2wga2FubiBuaWNodCB1bWJlbmFubnQgd2VyZGVuLlwiXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBsZXQgZWxlbWVudCA9IGN1cnJlbnRseUVkaXRlZE1vZHVsZS5nZXRFbGVtZW50QXRQb3NpdGlvbihwb3NpdGlvbi5saW5lTnVtYmVyLCBwb3NpdGlvbi5jb2x1bW4pO1xyXG4gICAgICAgICAgICBpZiAoZWxlbWVudCA9PSBudWxsIHx8IGVsZW1lbnQuZGVjbGFyYXRpb24gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICByYW5nZTogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIkRpZXNlcyBTeW1ib2wga2FubiBuaWNodCB1bWJlbmFubnQgd2VyZGVuLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdFJlYXNvbjogXCJEaWVzZXMgU3ltYm9sIGthbm4gbmljaHQgdW1iZW5hbm50IHdlcmRlbi5cIlxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgXHJcbiAgICAgICAgICAgIGxldCBwb3MgPSBlbGVtZW50LmRlY2xhcmF0aW9uLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHJhbmdlOiB7c3RhcnRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiwgc3RhcnRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lTnVtYmVyLCBlbmRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lTnVtYmVyLCBlbmRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiArIHBvcy5sZW5ndGh9LFxyXG4gICAgICAgICAgICAgICAgdGV4dDogZWxlbWVudC5pZGVudGlmaWVyXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb3ZpZGVSZW5hbWVFZGl0cyhtb2RlbDogbW9uYWNvLmVkaXRvci5JVGV4dE1vZGVsLCBwb3NpdGlvbjogbW9uYWNvLlBvc2l0aW9uLFxyXG4gICAgICAgIG5ld05hbWU6IHN0cmluZywgdG9rZW46IG1vbmFjby5DYW5jZWxsYXRpb25Ub2tlbik6XHJcbiAgICAgICAgbW9uYWNvLmxhbmd1YWdlcy5Qcm92aWRlclJlc3VsdDxtb25hY28ubGFuZ3VhZ2VzLldvcmtzcGFjZUVkaXQgJiBtb25hY28ubGFuZ3VhZ2VzLlJlamVjdGlvbj4ge1xyXG5cclxuICAgICAgICBsZXQgY3VycmVudGx5RWRpdGVkTW9kdWxlID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKTtcclxuICAgICAgICBpZiAoY3VycmVudGx5RWRpdGVkTW9kdWxlID09IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZWxlbWVudCA9IGN1cnJlbnRseUVkaXRlZE1vZHVsZS5nZXRFbGVtZW50QXRQb3NpdGlvbihwb3NpdGlvbi5saW5lTnVtYmVyLCBwb3NpdGlvbi5jb2x1bW4pO1xyXG4gICAgICAgIGlmIChlbGVtZW50ID09IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHVzYWdlUG9zaXRpb25zID0gZWxlbWVudC51c2FnZVBvc2l0aW9ucztcclxuXHJcbiAgICAgICAgLy8wNi4wNi4yMDIwXHJcbiAgICAgICAgbGV0IHJlc291cmNlRWRpdHM6IG1vbmFjby5sYW5ndWFnZXMuV29ya3NwYWNlVGV4dEVkaXRbXSA9IFtdO1xyXG5cclxuICAgICAgICB1c2FnZVBvc2l0aW9ucy5mb3JFYWNoKCh1c2FnZVBvc2l0aW9uc0luTW9kdWxlLCBtb2R1bGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKHVzYWdlUG9zaXRpb25zSW5Nb2R1bGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVkaXRzOiBtb25hY28ubGFuZ3VhZ2VzLlRleHRFZGl0W10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHVwIG9mIHVzYWdlUG9zaXRpb25zSW5Nb2R1bGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZUVkaXRzLnB1c2goXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiBtb2R1bGUudXJpLCBlZGl0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiB7IHN0YXJ0Q29sdW1uOiB1cC5jb2x1bW4sIHN0YXJ0TGluZU51bWJlcjogdXAubGluZSwgZW5kTGluZU51bWJlcjogdXAubGluZSwgZW5kQ29sdW1uOiB1cC5jb2x1bW4gKyB1cC5sZW5ndGggfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBuZXdOYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGVkaXRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBtb2R1bGUuZmlsZS5kaXJ0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlLmZpbGUuc2F2ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBtb2R1bGUuZmlsZS5pZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuLy8gICAgICAgIGNvbnNvbGUubG9nKHJlc291cmNlRWRpdHMpO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBlZGl0czogcmVzb3VyY2VFZGl0c1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvdmlkZURlZmluaXRpb24obW9kZWw6IG1vbmFjby5lZGl0b3IuSVRleHRNb2RlbCwgcG9zaXRpb246IG1vbmFjby5Qb3NpdGlvbiwgY2FuY2VsbGF0aW9uVG9rZW46IG1vbmFjby5DYW5jZWxsYXRpb25Ub2tlbik6XHJcbiAgICAgICAgbW9uYWNvLmxhbmd1YWdlcy5Qcm92aWRlclJlc3VsdDxtb25hY28ubGFuZ3VhZ2VzLkRlZmluaXRpb24+IHtcclxuXHJcbiAgICAgICAgbGV0IG1vZHVsZTogTW9kdWxlID0gdGhpcy5tYWluLmdldEN1cnJlbnRXb3Jrc3BhY2UoKS5nZXRNb2R1bGVCeU1vbmFjb01vZGVsKG1vZGVsKTtcclxuXHJcbiAgICAgICAgaWYgKG1vZHVsZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGVsZW1lbnQgPSBtb2R1bGUuZ2V0RWxlbWVudEF0UG9zaXRpb24ocG9zaXRpb24ubGluZU51bWJlciwgcG9zaXRpb24uY29sdW1uKTtcclxuICAgICAgICBpZiAoZWxlbWVudCA9PSBudWxsKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgbGV0IGRlY2wgPSBlbGVtZW50LmRlY2xhcmF0aW9uO1xyXG5cclxuICAgICAgICBpZiAoZGVjbCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIC8vIGNsYXNzIGZyb20gQmFzZS1Nb2R1bGU/IExldCBkZWZpbml0aW9uIHBvaW50IHRvIGN1cnJlbnQgcG9zaXRpb24sIHNvIHRoYXQgY3RybCArIGNsaWNrIG9wZW5zIHBlZWsgcmVmZXJlbmNlcyB3aWRnZXRcclxuICAgICAgICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBLbGFzcyB8fCBlbGVtZW50IGluc3RhbmNlb2YgRW51bSB8fCBlbGVtZW50IGluc3RhbmNlb2YgSW50ZXJmYWNlIHx8IGVsZW1lbnQgaW5zdGFuY2VvZiBNZXRob2QgfHwgZWxlbWVudCBpbnN0YW5jZW9mIEF0dHJpYnV0ZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lTnVtYmVyLCBlbmRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lTnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydENvbHVtbjogcG9zaXRpb24uY29sdW1uLCBlbmRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiArIGVsZW1lbnQuaWRlbnRpZmllci5sZW5ndGhcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHVyaTogbW9kdWxlLnVyaVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XHJcbiAgICAgICAgICAgIHJhbmdlOiB7XHJcbiAgICAgICAgICAgICAgICBzdGFydExpbmVOdW1iZXI6IGRlY2wucG9zaXRpb24ubGluZSwgZW5kTGluZU51bWJlcjogZGVjbC5wb3NpdGlvbi5saW5lLFxyXG4gICAgICAgICAgICAgICAgc3RhcnRDb2x1bW46IGRlY2wucG9zaXRpb24uY29sdW1uLCBlbmRDb2x1bW46IGRlY2wucG9zaXRpb24uY29sdW1uICsgZGVjbC5wb3NpdGlvbi5sZW5ndGhcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdXJpOiBkZWNsLm1vZHVsZS51cmlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG59Il19