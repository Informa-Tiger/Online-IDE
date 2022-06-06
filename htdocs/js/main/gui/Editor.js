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
            autoIndent: "full",
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9FZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNsQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzNDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQWlCLE1BQU0sK0JBQStCLENBQUM7QUFFakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRXZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUdwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFRdkQsTUFBTSxPQUFPLE1BQU07SUFXZixZQUFtQixJQUFjLEVBQVUsV0FBb0IsRUFBVSxVQUFtQjtRQUF6RSxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQVUsZ0JBQVcsR0FBWCxXQUFXLENBQVM7UUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFTO1FBUDVGLDJCQUFzQixHQUFZLElBQUksQ0FBQztRQUV2QyxPQUFFLEdBQWlDLElBQUksQ0FBQztRQUd4QywyQkFBc0IsR0FBVyxDQUFDLENBQUM7UUE2VG5DLGlCQUFZ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QUFJLENBQUMsUUFBUSxDQUFDLE1BQU07YUFDNUY7WUFDRCxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHO1NBQ3ZCLENBQUMsQ0FBQztJQUVQLENBQUM7Q0FFSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1vZHVsZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IEludGVycHJldGVyU3RhdGUgfSBmcm9tIFwiLi4vLi4vaW50ZXJwcmV0ZXIvSW50ZXJwcmV0ZXIuanNcIjtcclxuaW1wb3J0IHsgTWFpbiB9IGZyb20gXCIuLi9NYWluLmpzXCI7XHJcbmltcG9ydCB7IE15Q29tcGxldGlvbkl0ZW1Qcm92aWRlciB9IGZyb20gXCIuL015Q29tcGxldGlvbkl0ZW1Qcm92aWRlci5qc1wiO1xyXG5pbXBvcnQgeyBkZWZpbmVNeUphdmEgfSBmcm9tIFwiLi9NeUphdmEuanNcIjtcclxuaW1wb3J0IHsgTXlTaWduYXR1cmVIZWxwUHJvdmlkZXIgfSBmcm9tIFwiLi9NeVNpZ25hdHVyZUhlbHBQcm92aWRlci5qc1wiO1xyXG5pbXBvcnQgeyBLbGFzcywgSW50ZXJmYWNlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL0NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IE1ldGhvZCwgQXR0cmlidXRlLCBQcmltaXRpdmVUeXBlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL1R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IGdldERlY2xhcmF0aW9uQXNTdHJpbmcgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvRGVjbGFyYXRpb25IZWxwZXIuanNcIjtcclxuaW1wb3J0IHsgTXlIb3ZlclByb3ZpZGVyIH0gZnJvbSBcIi4vTXlIb3ZlclByb3ZpZGVyLmpzXCI7XHJcbmltcG9ydCB7IE1haW5CYXNlIH0gZnJvbSBcIi4uL01haW5CYXNlLmpzXCI7XHJcbmltcG9ydCB7IE15Q29kZUFjdGlvblByb3ZpZGVyIH0gZnJvbSBcIi4vTXlDb2RlQWN0aW9uUHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgTXlSZWZlcmVuY2VQcm92aWRlciB9IGZyb20gXCIuL015UmVmZXJlbmNlUHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgRW51bSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9FbnVtLmpzXCI7XHJcbmltcG9ydCB7IFdvcmtzcGFjZSB9IGZyb20gXCIuLi8uLi93b3Jrc3BhY2UvV29ya3NwYWNlLmpzXCI7XHJcbmltcG9ydCB7IE15U2VtYW50aWNUb2tlblByb3ZpZGVyIH0gZnJvbSBcIi4vTXlTZW1hbnRpY1Rva2VuUHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgTXlDb2xvclByb3ZpZGVyIH0gZnJvbSBcIi4vTXlDb2xvclByb3ZpZGVyLmpzXCI7XHJcblxyXG5leHBvcnQgdHlwZSBIaXN0b3J5RW50cnkgPSB7XHJcbiAgICBtb2R1bGVfaWQ6IG51bWJlcixcclxuICAgIHdvcmtzcGFjZV9pZDogbnVtYmVyLFxyXG4gICAgcG9zaXRpb246IG1vbmFjby5Qb3NpdGlvbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEVkaXRvciBpbXBsZW1lbnRzIG1vbmFjby5sYW5ndWFnZXMuUmVuYW1lUHJvdmlkZXIge1xyXG5cclxuICAgIGVkaXRvcjogbW9uYWNvLmVkaXRvci5JU3RhbmRhbG9uZUNvZGVFZGl0b3I7XHJcblxyXG4gICAgaGlnaGxpZ2h0Q3VycmVudE1ldGhvZDogYm9vbGVhbiA9IHRydWU7XHJcblxyXG4gICAgY3c6IG1vbmFjby5lZGl0b3IuSUNvbnRlbnRXaWRnZXQgPSBudWxsO1xyXG5cclxuICAgIGxhc3RQb3NpdGlvbjogSGlzdG9yeUVudHJ5O1xyXG4gICAgZG9udFB1c2hOZXh0Q3Vyc29yTW92ZTogbnVtYmVyID0gMDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgbWFpbjogTWFpbkJhc2UsIHByaXZhdGUgc2hvd01pbmltYXA6IGJvb2xlYW4sIHByaXZhdGUgaXNFbWJlZGRlZDogYm9vbGVhbikge1xyXG4gICAgfVxyXG5cclxuICAgIGluaXRHVUkoJGVsZW1lbnQ6IEpRdWVyeTxIVE1MRWxlbWVudD4pIHtcclxuXHJcblxyXG5cclxuICAgICAgICBkZWZpbmVNeUphdmEoKTtcclxuXHJcbiAgICAgICAgbW9uYWNvLmVkaXRvci5kZWZpbmVUaGVtZSgnbXlDdXN0b21UaGVtZURhcmsnLCB7XHJcbiAgICAgICAgICAgIGJhc2U6ICd2cy1kYXJrJywgLy8gY2FuIGFsc28gYmUgdnMtZGFyayBvciBoYy1ibGFja1xyXG4gICAgICAgICAgICBpbmhlcml0OiB0cnVlLCAvLyBjYW4gYWxzbyBiZSBmYWxzZSB0byBjb21wbGV0ZWx5IHJlcGxhY2UgdGhlIGJ1aWx0aW4gcnVsZXNcclxuICAgICAgICAgICAgcnVsZXM6IFtcclxuICAgICAgICAgICAgICAgIHsgdG9rZW46ICdtZXRob2QnLCBmb3JlZ3JvdW5kOiAnZGNkY2FhJywgZm9udFN0eWxlOiAnaXRhbGljJyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ3ByaW50JywgZm9yZWdyb3VuZDogJ2RjZGNhYScsIGZvbnRTdHlsZTogJ2l0YWxpYyBib2xkJyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ2NsYXNzJywgZm9yZWdyb3VuZDogJzNEQzlCMCcgfSxcclxuICAgICAgICAgICAgICAgIHsgdG9rZW46ICdudW1iZXInLCBmb3JlZ3JvdW5kOiAnYjVjZWE4JyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ3R5cGUnLCBmb3JlZ3JvdW5kOiAnNDk5Y2Q2JyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ2lkZW50aWZpZXInLCBmb3JlZ3JvdW5kOiAnOWNkY2ZlJyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ3N0YXRlbWVudCcsIGZvcmVncm91bmQ6ICdiYjk2YzAnLCBmb250U3R5bGU6ICdib2xkJyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ2tleXdvcmQnLCBmb3JlZ3JvdW5kOiAnNjhiZWQ0JywgZm9udFN0eWxlOiAnYm9sZCcgfSxcclxuICAgICAgICAgICAgICAgIHsgdG9rZW46ICdzdHJpbmczJywgZm9yZWdyb3VuZDogJ2ZmMDAwMCcgfSxcclxuXHJcbiAgICAgICAgICAgICAgICAvLyB7IHRva2VuOiAnY29tbWVudC5qcycsIGZvcmVncm91bmQ6ICcwMDg4MDAnLCBmb250U3R5bGU6ICdib2xkIGl0YWxpYyB1bmRlcmxpbmUnIH0sXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gc2VtYW50aWMgdG9rZW5zOlxyXG4gICAgICAgICAgICAgICAge3Rva2VuOiAncHJvcGVydHknLCBmb3JlZ3JvdW5kOiAnZmZmZmZmJyAsZm9udFN0eWxlOiAnYm9sZCd9LFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBjb2xvcnM6IHtcclxuICAgICAgICAgICAgICAgIFwiZWRpdG9yLmJhY2tncm91bmRcIjogXCIjMWUxZTFlXCIsXHJcbiAgICAgICAgICAgICAgICBcImpvX2hpZ2hsaWdodE1ldGhvZFwiOiBcIiMyYjJiN2RcIlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIG1vbmFjby5lZGl0b3IuZGVmaW5lVGhlbWUoJ215Q3VzdG9tVGhlbWVMaWdodCcsIHtcclxuICAgICAgICAgICAgYmFzZTogJ3ZzJywgLy8gY2FuIGFsc28gYmUgdnMtZGFyayBvciBoYy1ibGFja1xyXG4gICAgICAgICAgICBpbmhlcml0OiB0cnVlLCAvLyBjYW4gYWxzbyBiZSBmYWxzZSB0byBjb21wbGV0ZWx5IHJlcGxhY2UgdGhlIGJ1aWx0aW4gcnVsZXNcclxuICAgICAgICAgICAgcnVsZXM6IFtcclxuICAgICAgICAgICAgICAgIHsgdG9rZW46ICdtZXRob2QnLCBmb3JlZ3JvdW5kOiAnNjk0RTE2JywgZm9udFN0eWxlOiAnaXRhbGljIGJvbGQnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAncHJpbnQnLCBmb3JlZ3JvdW5kOiAnODExZjNmJywgZm9udFN0eWxlOiAnaXRhbGljIGJvbGQnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAnY2xhc3MnLCBmb3JlZ3JvdW5kOiAnYTAzMDMwJyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ251bWJlcicsIGZvcmVncm91bmQ6ICc0MDQwNDAnIH0sXHJcbiAgICAgICAgICAgICAgICB7IHRva2VuOiAndHlwZScsIGZvcmVncm91bmQ6ICcwMDAwZmYnLCBmb250U3R5bGU6ICdib2xkJyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ2lkZW50aWZpZXInLCBmb3JlZ3JvdW5kOiAnMDAxMDgwJyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ3N0YXRlbWVudCcsIGZvcmVncm91bmQ6ICc4MDAwZTAnLCBmb250U3R5bGU6ICdib2xkJyB9LFxyXG4gICAgICAgICAgICAgICAgeyB0b2tlbjogJ2tleXdvcmQnLCBmb3JlZ3JvdW5kOiAnMDBhMDAwJywgZm9udFN0eWxlOiAnYm9sZCcgfSxcclxuICAgICAgICAgICAgICAgIHsgdG9rZW46ICdjb21tZW50JywgZm9yZWdyb3VuZDogJzgwODA4MCcsIGZvbnRTdHlsZTogJ2l0YWxpYycgfSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgY29sb3JzOiB7XHJcbiAgICAgICAgICAgICAgICBcImVkaXRvci5iYWNrZ3JvdW5kXCI6IFwiI0ZGRkZGRlwiLFxyXG4gICAgICAgICAgICAgICAgXCJlZGl0b3IuZm9yZWdyb3VuZFwiOiBcIiMwMDAwMDBcIixcclxuICAgICAgICAgICAgICAgIFwiZWRpdG9yLmluYWN0aXZlU2VsZWN0aW9uQmFja2dyb3VuZFwiOiBcIiNFNUVCRjFcIixcclxuICAgICAgICAgICAgICAgIFwiZWRpdG9ySW5kZW50R3VpZGUuYmFja2dyb3VuZFwiOiBcIiNEM0QzRDNcIixcclxuICAgICAgICAgICAgICAgIFwiZWRpdG9ySW5kZW50R3VpZGUuYWN0aXZlQmFja2dyb3VuZFwiOiBcIiM5MzkzOTNcIixcclxuICAgICAgICAgICAgICAgIFwiZWRpdG9yLnNlbGVjdGlvbkhpZ2hsaWdodEJhY2tncm91bmRcIjogXCIjQURENkZGODBcIixcclxuICAgICAgICAgICAgICAgIFwiZWRpdG9yU3VnZ2VzdFdpZGdldC5iYWNrZ3JvdW5kXCI6IFwiI0YzRjNGM1wiLFxyXG4gICAgICAgICAgICAgICAgXCJhY3Rpdml0eUJhckJhZGdlLmJhY2tncm91bmRcIjogXCIjMDA3QUNDXCIsXHJcbiAgICAgICAgICAgICAgICBcInNpZGVCYXJUaXRsZS5mb3JlZ3JvdW5kXCI6IFwiIzZGNkY2RlwiLFxyXG4gICAgICAgICAgICAgICAgXCJsaXN0LmhvdmVyQmFja2dyb3VuZFwiOiBcIiNFOEU4RThcIixcclxuICAgICAgICAgICAgICAgIFwiaW5wdXQucGxhY2Vob2xkZXJGb3JlZ3JvdW5kXCI6IFwiIzc2NzY3NlwiLFxyXG4gICAgICAgICAgICAgICAgXCJzZWFyY2hFZGl0b3IudGV4dElucHV0Qm9yZGVyXCI6IFwiI0NFQ0VDRVwiLFxyXG4gICAgICAgICAgICAgICAgXCJzZXR0aW5ncy50ZXh0SW5wdXRCb3JkZXJcIjogXCIjQ0VDRUNFXCIsXHJcbiAgICAgICAgICAgICAgICBcInNldHRpbmdzLm51bWJlcklucHV0Qm9yZGVyXCI6IFwiI0NFQ0VDRVwiLFxyXG4gICAgICAgICAgICAgICAgXCJzdGF0dXNCYXJJdGVtLnJlbW90ZUZvcmVncm91bmRcIjogXCIjRkZGXCIsXHJcbiAgICAgICAgICAgICAgICBcInN0YXR1c0Jhckl0ZW0ucmVtb3RlQmFja2dyb3VuZFwiOiBcIiMxNjgyNURcIixcclxuICAgICAgICAgICAgICAgIFwiam9faGlnaGxpZ2h0TWV0aG9kXCI6IFwiI2JhYmFlY1wiXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuZWRpdG9yID0gbW9uYWNvLmVkaXRvci5jcmVhdGUoJGVsZW1lbnRbMF0sIHtcclxuICAgICAgICAgICAgLy8gdmFsdWU6IFtcclxuICAgICAgICAgICAgLy8gICAgICdmdW5jdGlvbiB4KCkgeycsXHJcbiAgICAgICAgICAgIC8vICAgICAnXFx0Y29uc29sZS5sb2coXCJIZWxsbyB3b3JsZCFcIik7JyxcclxuICAgICAgICAgICAgLy8gICAgICd9J1xyXG4gICAgICAgICAgICAvLyBdLmpvaW4oJ1xcbicpLFxyXG4gICAgICAgICAgICAvLyBsYW5ndWFnZTogJ215SmF2YScsXHJcbiAgICAgICAgICAgIGxhbmd1YWdlOiAnbXlKYXZhJyxcclxuICAgICAgICAgICAgXCJzZW1hbnRpY0hpZ2hsaWdodGluZy5lbmFibGVkXCI6IHRydWUsXHJcbiAgICAgICAgICAgIGxpZ2h0YnVsYjoge1xyXG4gICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyBnb3RvTG9jYXRpb246IHtcclxuICAgICAgICAgICAgLy8gICAgIG11bHRpcGxlUmVmZXJlbmNlczogXCJnb3RvQW5kUGVla1wiXHJcbiAgICAgICAgICAgIC8vIH0sXHJcbiAgICAgICAgICAgIGxpbmVEZWNvcmF0aW9uc1dpZHRoOiAwLFxyXG4gICAgICAgICAgICBwZWVrV2lkZ2V0RGVmYXVsdEZvY3VzOiBcInRyZWVcIixcclxuICAgICAgICAgICAgZml4ZWRPdmVyZmxvd1dpZGdldHM6IHRydWUsXHJcbiAgICAgICAgICAgIHF1aWNrU3VnZ2VzdGlvbnM6IHRydWUsXHJcbiAgICAgICAgICAgIHF1aWNrU3VnZ2VzdGlvbnNEZWxheTogMTAsXHJcbiAgICAgICAgICAgIGZvbnRTaXplOiAxNCxcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIGZvbnRGYW1pbHk6IHdpbmRvdy5qYXZhT25saW5lRm9udCA9PSBudWxsID8gXCJDb25zb2xhcywgUm9ib3RvIE1vbm9cIiA6IHdpbmRvdy5qYXZhT25saW5lRm9udCxcclxuICAgICAgICAgICAgZm9udFdlaWdodDogXCI1MDBcIixcclxuICAgICAgICAgICAgcm91bmRlZFNlbGVjdGlvbjogdHJ1ZSxcclxuICAgICAgICAgICAgc2VsZWN0T25MaW5lTnVtYmVyczogZmFsc2UsXHJcbiAgICAgICAgICAgIC8vIHNlbGVjdGlvbkhpZ2hsaWdodDogZmFsc2UsXHJcbiAgICAgICAgICAgIGF1dG9tYXRpY0xheW91dDogdHJ1ZSxcclxuICAgICAgICAgICAgc2Nyb2xsQmV5b25kTGFzdExpbmU6IGZhbHNlLFxyXG4gICAgICAgICAgICBvY2N1cnJlbmNlc0hpZ2hsaWdodDogZmFsc2UsXHJcbiAgICAgICAgICAgIGF1dG9JbmRlbnQ6IFwiZnVsbFwiLFxyXG4gICAgICAgICAgICBkcmFnQW5kRHJvcDogdHJ1ZSxcclxuICAgICAgICAgICAgZm9ybWF0T25UeXBlOiB0cnVlLFxyXG4gICAgICAgICAgICBmb3JtYXRPblBhc3RlOiB0cnVlLFxyXG4gICAgICAgICAgICBzdWdnZXN0Rm9udFNpemU6IDE2LFxyXG4gICAgICAgICAgICBzdWdnZXN0TGluZUhlaWdodDogMjIsXHJcbiAgICAgICAgICAgIHN1Z2dlc3Q6IHtcclxuICAgICAgICAgICAgICAgIGxvY2FsaXR5Qm9udXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBpbnNlcnRNb2RlOiBcInJlcGxhY2VcIlxyXG4gICAgICAgICAgICAgICAgLy8gc25pcHBldHNQcmV2ZW50UXVpY2tTdWdnZXN0aW9uczogZmFsc2VcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcGFyYW1ldGVySGludHM6IHsgZW5hYmxlZDogdHJ1ZSwgY3ljbGU6IHRydWUgfSxcclxuICAgICAgICAgICAgLy8gLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIC8vIGNvbnRyaWJJbmZvOiB7XHJcbiAgICAgICAgICAgIC8vICAgICBzdWdnZXN0U2VsZWN0aW9uOiAncmVjZW50bHlVc2VkQnlQcmVmaXgnLFxyXG4gICAgICAgICAgICAvLyB9LFxyXG5cclxuICAgICAgICAgICAgbW91c2VXaGVlbFpvb206IHRoaXMuaXNFbWJlZGRlZCxcclxuXHJcbiAgICAgICAgICAgIG1pbmltYXA6IHtcclxuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRoaXMuc2hvd01pbmltYXBcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2Nyb2xsYmFyOiB7XHJcbiAgICAgICAgICAgICAgICB2ZXJ0aWNhbDogJ2F1dG8nLFxyXG4gICAgICAgICAgICAgICAgaG9yaXpvbnRhbDogJ2F1dG8nXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRoZW1lOiBcIm15Q3VzdG9tVGhlbWVEYXJrXCIsXHJcbiAgICAgICAgICAgIC8vIGF1dG9tYXRpY0xheW91dDogdHJ1ZVxyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdGhpcy5lZGl0b3Iub25LZXlEb3duKChlOiBtb25hY28uSUtleWJvYXJkRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgbGV0IHN0YXRlID0gdGhpcy5tYWluLmdldEludGVycHJldGVyKCkuc3RhdGU7XHJcblxyXG4gICAgICAgICAgICBpZiAoW0ludGVycHJldGVyU3RhdGUuZG9uZSwgSW50ZXJwcmV0ZXJTdGF0ZS5lcnJvciwgSW50ZXJwcmV0ZXJTdGF0ZS5ub3RfaW5pdGlhbGl6ZWRdLmluZGV4T2Yoc3RhdGUpIDwgMCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlLmNvZGUuaW5kZXhPZihcIkFycm93XCIpID49IDAgfHwgZS5jb2RlLmluZGV4T2YoXCJQYWdlXCIpID49IDApIHJldHVybjsgLy8gZG9uJ3QgcmVhY3QgdG8gQ3Vyc29yIGtleXNcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW4uZ2V0QWN0aW9uTWFuYWdlcigpLnRyaWdnZXIoXCJpbnRlcnByZXRlci5zdG9wXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIHRoaXMudXJpID0gbW9uYWNvLlVyaS5mcm9tKHsgcGF0aDogJy9maWxlMS5qYXZhJywgc2NoZW1lOiAnZmlsZScgfSlcclxuICAgICAgICAvLyB0aGlzLm1vZGVsSmF2YSA9IG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoXCJcIiwgXCJteUphdmFcIiwgdGhpcy51cmkpO1xyXG4gICAgICAgIC8vIHRoaXMuZWRpdG9yLnNldE1vZGVsKHRoaXMubW9kZWxKYXZhKTtcclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICBsZXQgbW91c2VXaGVlbExpc3RlbmVyID0gKGV2ZW50OiBXaGVlbEV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChldmVudC5jdHJsS2V5ID09PSB0cnVlKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhhdC5jaGFuZ2VFZGl0b3JGb250U2l6ZShNYXRoLnNpZ24oZXZlbnQuZGVsdGFZKSwgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5pc0VtYmVkZGVkKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgX21haW46IE1haW4gPSA8TWFpbj50aGlzLm1haW47XHJcblxyXG4gICAgICAgICAgICBfbWFpbi53aW5kb3dTdGF0ZU1hbmFnZXIucmVnaXN0ZXJCYWNrQnV0dG9uTGlzdGVuZXIoKGV2ZW50OiBQb3BTdGF0ZUV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaGlzdG9yeUVudHJ5OiBIaXN0b3J5RW50cnkgPSA8SGlzdG9yeUVudHJ5PmV2ZW50LnN0YXRlO1xyXG4gICAgICAgICAgICAgICAgaWYoZXZlbnQuc3RhdGUgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdvcmtzcGFjZTogV29ya3NwYWNlID0gX21haW4ud29ya3NwYWNlTGlzdC5maW5kKCh3cykgPT4gd3MuaWQgPT0gaGlzdG9yeUVudHJ5LndvcmtzcGFjZV9pZCk7XHJcbiAgICAgICAgICAgICAgICBpZih3b3Jrc3BhY2UgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgbGV0IG1vZHVsZTogTW9kdWxlID0gd29ya3NwYWNlLm1vZHVsZVN0b3JlLmZpbmRNb2R1bGVCeUlkKGhpc3RvcnlFbnRyeS5tb2R1bGVfaWQpO1xyXG4gICAgICAgICAgICAgICAgaWYobW9kdWxlID09IG51bGwpIHJldHVybjsgXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJQcm9jZXNzaW5nIHBvcCBzdGF0ZSBldmVudCwgcmV0dXJuaW5nIHRvIG1vZHVsZSBcIiArIGhpc3RvcnlFbnRyeS5tb2R1bGVfaWQpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKHdvcmtzcGFjZSAhPSBfbWFpbi5jdXJyZW50V29ya3NwYWNlKSBcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmRvbnRQdXNoTmV4dEN1cnNvck1vdmUrKztcclxuICAgICAgICAgICAgICAgICAgICBfbWFpbi5wcm9qZWN0RXhwbG9yZXIuc2V0V29ya3NwYWNlQWN0aXZlKHdvcmtzcGFjZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5kb250UHVzaE5leHRDdXJzb3JNb3ZlLS07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZihtb2R1bGUgIT0gX21haW4uZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZG9udFB1c2hOZXh0Q3Vyc29yTW92ZSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIF9tYWluLnByb2plY3RFeHBsb3Jlci5zZXRNb2R1bGVBY3RpdmUobW9kdWxlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmRvbnRQdXNoTmV4dEN1cnNvck1vdmUtLTtcclxuICAgICAgICAgICAgICAgIH0gXHJcbiAgICAgICAgICAgICAgICB0aGF0LmRvbnRQdXNoTmV4dEN1cnNvck1vdmUrKztcclxuICAgICAgICAgICAgICAgIHRoYXQuZWRpdG9yLnNldFBvc2l0aW9uKGhpc3RvcnlFbnRyeS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmVkaXRvci5yZXZlYWxQb3NpdGlvbihoaXN0b3J5RW50cnkucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5kb250UHVzaE5leHRDdXJzb3JNb3ZlLS07XHJcbiAgICAgICAgICAgICAgICB0aGF0LnB1c2hIaXN0b3J5U3RhdGUodHJ1ZSwgaGlzdG9yeUVudHJ5KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmVkaXRvci5vbkRpZENoYW5nZUNvbmZpZ3VyYXRpb24oKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChldmVudC5oYXNDaGFuZ2VkKG1vbmFjby5lZGl0b3IuRWRpdG9yT3B0aW9uLmZvbnRJbmZvKSAmJiB0aGlzLmlzRW1iZWRkZWQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCkuZXJyb3JNYW5hZ2VyLnJlZ2lzdGVyTGlnaHRidWxiT25DbGlja0Z1bmN0aW9ucygpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmVkaXRvci5vbkRpZENoYW5nZUN1cnNvclBvc2l0aW9uKChldmVudCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRNb2RlbElkID0gdGhpcy5tYWluLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpPy5maWxlPy5pZDtcclxuICAgICAgICAgICAgaWYoY3VycmVudE1vZGVsSWQgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBsZXQgcHVzaE5lZWRlZCA9IHRoaXMubGFzdFBvc2l0aW9uID09IG51bGxcclxuICAgICAgICAgICAgICAgIHx8IGV2ZW50LnNvdXJjZSA9PSBcImFwaVwiXHJcbiAgICAgICAgICAgICAgICB8fCBjdXJyZW50TW9kZWxJZCAhPSB0aGlzLmxhc3RQb3NpdGlvbi5tb2R1bGVfaWRcclxuICAgICAgICAgICAgICAgIHx8IE1hdGguYWJzKHRoaXMubGFzdFBvc2l0aW9uLnBvc2l0aW9uLmxpbmVOdW1iZXIgLSBldmVudC5wb3NpdGlvbi5saW5lTnVtYmVyKSA+IDIwO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYocHVzaE5lZWRlZCAmJiB0aGlzLmRvbnRQdXNoTmV4dEN1cnNvck1vdmUgPT0gMCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoZmFsc2UsIHRoaXMuZ2V0UG9zaXRpb25Gb3JIaXN0b3J5KCkpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYoY3VycmVudE1vZGVsSWQgPT0gaGlzdG9yeS5zdGF0ZT8ubW9kdWxlX2lkKXtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKHRydWUsIHRoaXMuZ2V0UG9zaXRpb25Gb3JIaXN0b3J5KCkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGF0Lm9uRGlkQ2hhbmdlQ3Vyc29yUG9zaXRpb24oZXZlbnQucG9zaXRpb24pO1xyXG5cclxuICAgICAgICAgICAgdGhhdC5vbkV2YWx1YXRlU2VsZWN0ZWRUZXh0KGV2ZW50KTtcclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFdlIG5lZWQgdGhpcyB0byBzZXQgb3VyIG1vZGVsIGFmdGVyIHVzZXIgdXNlcyBTdHJnK2NsaWNrIG9uIGlkZW50aWZpZXJcclxuICAgICAgICB0aGlzLmVkaXRvci5vbkRpZENoYW5nZU1vZGVsKChldmVudCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgbGV0IGVsZW1lbnQ6IEhUTUxEaXZFbGVtZW50ID0gPGFueT4kZWxlbWVudC5maW5kKCcubW9uYWNvLWVkaXRvcicpWzBdO1xyXG4gICAgICAgICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBtb3VzZVdoZWVsTGlzdGVuZXIpO1xyXG4gICAgICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBtb3VzZVdoZWVsTGlzdGVuZXIsIHsgcGFzc2l2ZTogZmFsc2UgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5tYWluLmdldEN1cnJlbnRXb3Jrc3BhY2UoKSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBsZXQgbW9kdWxlID0gdGhpcy5tYWluLmdldEN1cnJlbnRXb3Jrc3BhY2UoKS5nZXRNb2R1bGVCeU1vbmFjb01vZGVsKHRoaXMuZWRpdG9yLmdldE1vZGVsKCkpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5tYWluIGluc3RhbmNlb2YgTWFpbiAmJiBtb2R1bGUgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGlmKCF0aGlzLmRvbnRQdXNoSGlzdG9yeVN0YXRlT25OZXh0TW9kZWxDaGFuZ2Upe1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIHRoaXMubGFzdFBvc2l0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBwb3NpdGlvbjogdGhpcy5lZGl0b3IuZ2V0UG9zaXRpb24oKSxcclxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgd29ya3NwYWNlX2lkOiB0aGlzLm1haW4uZ2V0Q3VycmVudFdvcmtzcGFjZSgpLmlkLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBtb2R1bGVfaWQ6IG1vZHVsZS5maWxlLmlkXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZShmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzLmRvbnRQdXNoSGlzdG9yeVN0YXRlT25OZXh0TW9kZWxDaGFuZ2UgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW4ucHJvamVjdEV4cGxvcmVyLnNldEFjdGl2ZUFmdGVyRXh0ZXJuYWxNb2RlbFNldChtb2R1bGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwdXNoTmVlZGVkID0gdGhpcy5sYXN0UG9zaXRpb24gPT0gbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgIHx8IG1vZHVsZS5maWxlLmlkICE9IHRoaXMubGFzdFBvc2l0aW9uLm1vZHVsZV9pZDtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYocHVzaE5lZWRlZCAmJiB0aGlzLmRvbnRQdXNoTmV4dEN1cnNvck1vdmUgPT0gMCl7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKGZhbHNlLCB0aGlzLmdldFBvc2l0aW9uRm9ySGlzdG9yeSgpKTtcclxuICAgICAgICAgICAgICAgIH0gICAgXHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuLy8gICAgICAgIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJEb2N1bWVudFJhbmdlU2VtYW50aWNUb2tlbnNQcm92aWRlcignbXlKYXZhJywgbmV3IE15U2VtYW50aWNUb2tlblByb3ZpZGVyKHRoaXMubWFpbikpO1xyXG5cclxuICAgICAgICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVyUmVuYW1lUHJvdmlkZXIoJ215SmF2YScsIHRoaXMpO1xyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJDb2xvclByb3ZpZGVyKCdteUphdmEnLCBuZXcgTXlDb2xvclByb3ZpZGVyKHRoaXMubWFpbikpO1xyXG5cclxuICAgICAgICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVyRGVmaW5pdGlvblByb3ZpZGVyKCdteUphdmEnLCB7XHJcbiAgICAgICAgICAgIHByb3ZpZGVEZWZpbml0aW9uOiAobW9kZWwsIHBvc2l0aW9uLCBjYW5jZWxsYXRpb25Ub2tlbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoYXQucHJvdmlkZURlZmluaXRpb24obW9kZWwsIHBvc2l0aW9uLCBjYW5jZWxsYXRpb25Ub2tlbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbW9uYWNvLmxhbmd1YWdlcy5yZWdpc3RlckhvdmVyUHJvdmlkZXIoJ215SmF2YScsIG5ldyBNeUhvdmVyUHJvdmlkZXIodGhpcykpO1xyXG5cclxuICAgICAgICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVyQ29tcGxldGlvbkl0ZW1Qcm92aWRlcignbXlKYXZhJywgbmV3IE15Q29tcGxldGlvbkl0ZW1Qcm92aWRlcih0aGlzLm1haW4pKTtcclxuICAgICAgICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVyQ29kZUFjdGlvblByb3ZpZGVyKCdteUphdmEnLCBuZXcgTXlDb2RlQWN0aW9uUHJvdmlkZXIodGhpcy5tYWluKSk7XHJcbiAgICAgICAgbW9uYWNvLmxhbmd1YWdlcy5yZWdpc3RlclJlZmVyZW5jZVByb3ZpZGVyKCdteUphdmEnLCBuZXcgTXlSZWZlcmVuY2VQcm92aWRlcih0aGlzLm1haW4pKTtcclxuXHJcblxyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJTaWduYXR1cmVIZWxwUHJvdmlkZXIoJ215SmF2YScsIG5ldyBNeVNpZ25hdHVyZUhlbHBQcm92aWRlcih0aGlzLm1haW4pKTtcclxuXHJcbiAgICAgICAgdGhpcy5lZGl0b3Iub25Nb3VzZURvd24oKGU6IG1vbmFjby5lZGl0b3IuSUVkaXRvck1vdXNlRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGUudGFyZ2V0LmRldGFpbDtcclxuICAgICAgICAgICAgaWYgKGUudGFyZ2V0LnR5cGUgIT09IG1vbmFjby5lZGl0b3IuTW91c2VUYXJnZXRUeXBlLkdVVFRFUl9HTFlQSF9NQVJHSU4gJiZcclxuICAgICAgICAgICAgICAgIGUudGFyZ2V0LnR5cGUgIT09IG1vbmFjby5lZGl0b3IuTW91c2VUYXJnZXRUeXBlLkdVVFRFUl9MSU5FX05VTUJFUlMgfHwgZGF0YS5pc0FmdGVyTGluZXMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGF0Lm9uTWFyZ2luTW91c2VEb3duKGUudGFyZ2V0LnBvc2l0aW9uLmxpbmVOdW1iZXIpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfSk7XHJcblxyXG5cclxuICAgICAgICAvLyBJZiBlZGl0b3IgaXMgaW5zdGFudGlhdGVkIGJlZm9yZSBmb250cyBhcmUgbG9hZGVkIHRoZW4gaW5kZW50YXRpb24tbGluZXNcclxuICAgICAgICAvLyBhcmUgbWlzcGxhY2VkLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9tb25hY28tZWRpdG9yL2lzc3Vlcy8zOTJcclxuICAgICAgICAvLyBzbzpcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgbW9uYWNvLmVkaXRvci5yZW1lYXN1cmVGb250cygpO1xyXG4gICAgICAgIH0sIDIwMDApO1xyXG5cclxuICAgICAgICB0aGlzLmFkZEFjdGlvbnMoKTtcclxuXHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgdGhpcy5lZGl0b3Iub25EaWRUeXBlKCh0ZXh0KSA9PiB7IHRoYXQub25EaWRUeXBlKHRleHQpIH0pO1xyXG5cclxuICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmVkaXRvci5nZXRTdXBwb3J0ZWRBY3Rpb25zKCkubWFwKGEgPT4gYS5pZCkpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5lZGl0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0UG9zaXRpb25Gb3JIaXN0b3J5KCk6IEhpc3RvcnlFbnRyeSB7XHJcbiAgICAgICAgbGV0IG1vZHVsZSA9IHRoaXMubWFpbi5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKTtcclxuICAgICAgICBpZihtb2R1bGUgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmVkaXRvci5nZXRQb3NpdGlvbigpLFxyXG4gICAgICAgICAgICB3b3Jrc3BhY2VfaWQ6IHRoaXMubWFpbi5nZXRDdXJyZW50V29ya3NwYWNlKCkuaWQsXHJcbiAgICAgICAgICAgIG1vZHVsZV9pZDogdGhpcy5tYWluLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpLmZpbGUuaWRcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbGFzdFB1c2hUaW1lOiBudW1iZXIgPSAwO1xyXG4gICAgcHVzaEhpc3RvcnlTdGF0ZShyZXBsYWNlOiBib29sZWFuLCBoaXN0b3J5RW50cnk6IEhpc3RvcnlFbnRyeSl7XHJcblxyXG4gICAgICAgIGlmKHRoaXMubWFpbi5pc0VtYmVkZGVkKCkgfHwgaGlzdG9yeUVudHJ5ID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYocmVwbGFjZSl7XHJcbiAgICAgICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKGhpc3RvcnlFbnRyeSwgXCJcIik7IC8vYEphdmEtT25saW5lLCAke21vZHVsZS5maWxlLm5hbWV9IChaZWlsZSAke3RoaXMubGFzdFBvc2l0aW9uLnBvc2l0aW9uLmxpbmVOdW1iZXJ9LCBTcGFsdGUgJHt0aGlzLmxhc3RQb3NpdGlvbi5wb3NpdGlvbi5jb2x1bW59KWApO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlJlcGxhY2UgSGlzdG9yeSBzdGF0ZSB3aXRoIHdvcmtzcGFjZS1pZDogXCIgKyBoaXN0b3J5RW50cnkud29ya3NwYWNlX2lkICsgXCIsIG1vZHVsZS1pZDogXCIgKyBoaXN0b3J5RW50cnkubW9kdWxlX2lkKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgdGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgICAgICBpZih0aW1lIC0gdGhpcy5sYXN0UHVzaFRpbWUgPiAyMDApe1xyXG4gICAgICAgICAgICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoaGlzdG9yeUVudHJ5LCBcIlwiKTsgLy9gSmF2YS1PbmxpbmUsICR7bW9kdWxlLmZpbGUubmFtZX0gKFplaWxlICR7aGlzdG9yeUVudHJ5LnBvc2l0aW9uLmxpbmVOdW1iZXJ9LCBTcGFsdGUgJHtoaXN0b3J5RW50cnkucG9zaXRpb24uY29sdW1ufSlgKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKGhpc3RvcnlFbnRyeSwgXCJcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5sYXN0UHVzaFRpbWUgPSB0aW1lO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlB1c2hlZCBIaXN0b3J5IHN0YXRlIHdpdGggd29ya3NwYWNlLWlkOiBcIiArIGhpc3RvcnlFbnRyeS53b3Jrc3BhY2VfaWQgKyBcIiwgbW9kdWxlLWlkOiBcIiArIGhpc3RvcnlFbnRyeS5tb2R1bGVfaWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5sYXN0UG9zaXRpb24gPSBoaXN0b3J5RW50cnk7XHJcbiAgICB9XHJcblxyXG4gICAgb25EaWRUeXBlKHRleHQ6IHN0cmluZykge1xyXG4gICAgICAgIC8vICAgICAgICBjb25zdCBlbmRPZkNvbW1lbnRUZXh0ID0gXCIgKiBcXG4gKi9cIjtcclxuXHJcbiAgICAgICAgY29uc3QgaW5zZXJ0VGV4dEFuZFNldEN1cnNvciA9IChwb3MsIGluc2VydFRleHQ6IHN0cmluZywgbmV3TGluZTogbnVtYmVyLCBuZXdDb2x1bW46IG51bWJlcikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCByYW5nZSA9IG5ldyBtb25hY28uUmFuZ2UoXHJcbiAgICAgICAgICAgICAgICBwb3MubGluZU51bWJlcixcclxuICAgICAgICAgICAgICAgIHBvcy5jb2x1bW4sXHJcbiAgICAgICAgICAgICAgICBwb3MubGluZU51bWJlcixcclxuICAgICAgICAgICAgICAgIHBvcy5jb2x1bW5cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgdGhpcy5lZGl0b3IuZXhlY3V0ZUVkaXRzKFwibmV3LWJ1bGxldHNcIiwgW1xyXG4gICAgICAgICAgICAgICAgeyByYW5nZSwgdGV4dDogaW5zZXJ0VGV4dCB9XHJcbiAgICAgICAgICAgIF0pO1xyXG5cclxuICAgICAgICAgICAgLy8gU2V0IHBvc2l0aW9uIGFmdGVyIGJ1bGxldFRleHRcclxuICAgICAgICAgICAgdGhpcy5lZGl0b3Iuc2V0UG9zaXRpb24oe1xyXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbmV3TGluZSxcclxuICAgICAgICAgICAgICAgIGNvbHVtbjogbmV3Q29sdW1uXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICh0ZXh0ID09PSBcIlxcblwiKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1vZGVsID0gdGhpcy5lZGl0b3IuZ2V0TW9kZWwoKTtcclxuICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLmVkaXRvci5nZXRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICBjb25zdCBwcmV2TGluZSA9IG1vZGVsLmdldExpbmVDb250ZW50KHBvc2l0aW9uLmxpbmVOdW1iZXIgLSAxKTtcclxuICAgICAgICAgICAgaWYgKHByZXZMaW5lLnRyaW0oKS5pbmRleE9mKFwiLypcIikgPT09IDAgJiYgIXByZXZMaW5lLnRyaW1SaWdodCgpLmVuZHNXaXRoKFwiKi9cIikpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRMaW5lID0gcG9zaXRpb24ubGluZU51bWJlciA8IG1vZGVsLmdldExpbmVDb3VudCgpID8gbW9kZWwuZ2V0TGluZUNvbnRlbnQocG9zaXRpb24ubGluZU51bWJlciArIDEpIDogXCJcIjtcclxuICAgICAgICAgICAgICAgIGlmKCFuZXh0TGluZS50cmltKCkuc3RhcnRzV2l0aChcIipcIikpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzcGFjZXNBdEJlZ2lubmluZ09mTGluZTogc3RyaW5nID0gcHJldkxpbmUuc3Vic3RyKDAsIHByZXZMaW5lLmxlbmd0aCAtIHByZXZMaW5lLnRyaW1MZWZ0KCkubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldkxpbmUudHJpbSgpLmluZGV4T2YoXCIvKipcIikgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dEFuZFNldEN1cnNvcihwb3NpdGlvbiwgXCJcXG5cIiArIHNwYWNlc0F0QmVnaW5uaW5nT2ZMaW5lICsgXCIgKi9cIiwgcG9zaXRpb24ubGluZU51bWJlciwgcG9zaXRpb24uY29sdW1uICsgMyArIHNwYWNlc0F0QmVnaW5uaW5nT2ZMaW5lLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dEFuZFNldEN1cnNvcihwb3NpdGlvbiwgXCIgKiBcXG5cIiArIHNwYWNlc0F0QmVnaW5uaW5nT2ZMaW5lICsgXCIgKi9cIiwgcG9zaXRpb24ubGluZU51bWJlciwgcG9zaXRpb24uY29sdW1uICsgMyArIHNwYWNlc0F0QmVnaW5uaW5nT2ZMaW5lLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmKHRleHQgPT0gJ1wiJykge1xyXG4gICAgICAgICAgICAvL2E6IHh8IC0+IHhcInxcIlxyXG4gICAgICAgICAgICAvL2Q6IFwifHggLT4gXCJcInx4XHJcbiAgICAgICAgICAgIC8vYzogXCJ8XCIgLT4gXCJcIlwiXFxufFxcblwiXCJcIlxyXG4gICAgICAgICAgICBjb25zdCBtb2RlbCA9IHRoaXMuZWRpdG9yLmdldE1vZGVsKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5lZGl0b3IuZ2V0UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgY29uc3Qgc2VsZWN0aW9uID0gdGhpcy5lZGl0b3IuZ2V0U2VsZWN0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gc2VsZWN0aW9uLnN0YXJ0Q29sdW1uICE9IHNlbGVjdGlvbi5lbmRDb2x1bW4gfHwgc2VsZWN0aW9uLnN0YXJ0TGluZU51bWJlciAhPSBzZWxlY3Rpb24uZW5kTGluZU51bWJlcjtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBtb2RlbC5nZXRMaW5lQ29udGVudChwb3NpdGlvbi5saW5lTnVtYmVyKTtcclxuICAgICAgICAgICAgbGV0IGRvSW5zZXJ0OiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICAgICAgbGV0IGNoYXJCZWZvcmU6IHN0cmluZyA9IFwieFwiO1xyXG4gICAgICAgICAgICBpZihwb3NpdGlvbi5jb2x1bW4gPiAxKXtcclxuICAgICAgICAgICAgICAgIGNoYXJCZWZvcmUgPSBsaW5lLmNoYXJBdChwb3NpdGlvbi5jb2x1bW4gLSAzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgY2hhckFmdGVyOiBzdHJpbmcgPSBcInhcIjtcclxuICAgICAgICAgICAgaWYocG9zaXRpb24uY29sdW1uIC0gMSA8IGxpbmUubGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgIGNoYXJBZnRlciA9IGxpbmUuY2hhckF0KHBvc2l0aW9uLmNvbHVtbiAtIDEpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZighaXNTZWxlY3RlZCl7XHJcbiAgICAgICAgICAgICAgICBpZihjaGFyQmVmb3JlICE9ICdcIicpe1xyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHRBbmRTZXRDdXJzb3IocG9zaXRpb24sICdcIicsIHBvc2l0aW9uLmxpbmVOdW1iZXIsIHBvc2l0aW9uLmNvbHVtbik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoY2hhckFmdGVyID09ICdcIicpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwb3MxID0gey4uLnBvc2l0aW9uLCBjb2x1bW46IHBvc2l0aW9uLmNvbHVtbiArIDF9O1xyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydFRleHRBbmRTZXRDdXJzb3IocG9zMSwgJ1xcblxcblwiXCJcIicsIHBvc2l0aW9uLmxpbmVOdW1iZXIgKyAxLCAxKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgbGFzdFRpbWU6IG51bWJlciA9IDA7XHJcbiAgICBzZXRGb250U2l6ZShmb250U2l6ZVB4OiBudW1iZXIpIHtcclxuXHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJTZXQgZm9udCBzaXplOiBcIiArIGZvbnRTaXplUHgpO1xyXG4gICAgICAgIGxldCB0aW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgaWYgKHRpbWUgLSB0aGlzLmxhc3RUaW1lIDwgMTUwKSByZXR1cm47XHJcbiAgICAgICAgdGhpcy5sYXN0VGltZSA9IHRpbWU7XHJcblxyXG4gICAgICAgIGxldCBlZGl0b3JmcyA9IHRoaXMuZWRpdG9yLmdldE9wdGlvbnMoKS5nZXQobW9uYWNvLmVkaXRvci5FZGl0b3JPcHRpb24uZm9udFNpemUpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5tYWluIGluc3RhbmNlb2YgTWFpbikge1xyXG4gICAgICAgICAgICB0aGlzLm1haW4udmlld01vZGVDb250cm9sbGVyLnNhdmVGb250U2l6ZShmb250U2l6ZVB4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChmb250U2l6ZVB4ICE9IGVkaXRvcmZzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yLnVwZGF0ZU9wdGlvbnMoe1xyXG4gICAgICAgICAgICAgICAgZm9udFNpemU6IGZvbnRTaXplUHhcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBlZGl0b3IgZG9lcyBub3Qgc2V0IGZvbnRTaXplUHgsIGJ1dCBmb250U2l6ZVB4ICogem9vbWZhY3RvciB3aXRoIHVua25vd24gem9vbSBmYWN0b3IsIHNvIFxyXG4gICAgICAgICAgICAvLyB3ZSBoYXZlIHRvIGRvIHRoaXMgZGlydHkgd29ya2Fyb3VuZDpcclxuICAgICAgICAgICAgbGV0IG5ld0VkaXRvcmZzID0gdGhpcy5lZGl0b3IuZ2V0T3B0aW9ucygpLmdldChtb25hY28uZWRpdG9yLkVkaXRvck9wdGlvbi5mb250U2l6ZSk7XHJcbiAgICAgICAgICAgIGxldCBmYWN0b3IgPSBuZXdFZGl0b3JmcyAvIGZvbnRTaXplUHg7XHJcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yLnVwZGF0ZU9wdGlvbnMoe1xyXG4gICAgICAgICAgICAgICAgZm9udFNpemU6IGZvbnRTaXplUHggLyBmYWN0b3JcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgYm90dG9tRGl2MSA9IHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKTtcclxuICAgICAgICAgICAgaWYgKGJvdHRvbURpdjEgIT0gbnVsbCAmJiBib3R0b21EaXYxLmNvbnNvbGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgYm90dG9tRGl2MS5jb25zb2xlLmVkaXRvci51cGRhdGVPcHRpb25zKHtcclxuICAgICAgICAgICAgICAgICAgICBmb250U2l6ZTogZm9udFNpemVQeCAvIGZhY3RvclxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYm90dG9tRGl2ID0gdGhpcy5tYWluLmdldEJvdHRvbURpdigpO1xyXG4gICAgICAgIGlmIChib3R0b21EaXYgIT0gbnVsbCAmJiBib3R0b21EaXYuY29uc29sZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCAkY29tbWFuZExpbmUgPSBib3R0b21EaXYuJGJvdHRvbURpdi5maW5kKCcuam9fY29tbWFuZGxpbmUnKTtcclxuICAgICAgICAgICAgJGNvbW1hbmRMaW5lLmNzcyh7XHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IChmb250U2l6ZVB4ICogMS4xICsgNCkgKyBcInB4XCIsXHJcbiAgICAgICAgICAgICAgICBcImxpbmUtaGVpZ2h0XCI6IChmb250U2l6ZVB4ICogMS4xICsgNCkgKyBcInB4XCJcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgYm90dG9tRGl2LmNvbnNvbGUuZWRpdG9yLmxheW91dCgpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIC8vIGxldCBuZXdFZGl0b3JmcyA9IHRoaXMuZWRpdG9yLmdldE9wdGlvbnMoKS5nZXQobW9uYWNvLmVkaXRvci5FZGl0b3JPcHRpb24uZm9udFNpemUpO1xyXG5cclxuICAgICAgICAvLyBjb25zb2xlLmxvZyh7ZWRpdG9yRlM6IGVkaXRvcmZzLCBuZXdGczogZm9udFNpemVQeCwgbmV3RWRpdG9yRnM6IG5ld0VkaXRvcmZzfSk7XHJcblxyXG5cclxuICAgICAgICBqUXVlcnkoJy5qb19lZGl0b3JGb250U2l6ZScpLmNzcygnZm9udC1zaXplJywgZm9udFNpemVQeCArIFwicHhcIik7XHJcbiAgICAgICAgalF1ZXJ5KCcuam9fZWRpdG9yRm9udFNpemUnKS5jc3MoJ2xpbmUtaGVpZ2h0JywgKGZvbnRTaXplUHggKyAyKSArIFwicHhcIik7XHJcblxyXG4gICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1icmVha3BvaW50LXNpemUnLCBmb250U2l6ZVB4ICsgJ3B4Jyk7XHJcbiAgICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLWJyZWFrcG9pbnQtcmFkaXVzJywgZm9udFNpemVQeCAvIDIgKyAncHgnKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKS5lcnJvck1hbmFnZXIucmVnaXN0ZXJMaWdodGJ1bGJPbkNsaWNrRnVuY3Rpb25zKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNoYW5nZUVkaXRvckZvbnRTaXplKGRlbHRhOiBudW1iZXIsIGR5bmFtaWM6IGJvb2xlYW4gPSB0cnVlKSB7XHJcbiAgICAgICAgbGV0IGVkaXRvcmZzID0gdGhpcy5lZGl0b3IuZ2V0T3B0aW9ucygpLmdldChtb25hY28uZWRpdG9yLkVkaXRvck9wdGlvbi5mb250U2l6ZSk7XHJcblxyXG4gICAgICAgIGlmIChkeW5hbWljKSB7XHJcbiAgICAgICAgICAgIGlmIChlZGl0b3JmcyA8IDEwKSB7XHJcbiAgICAgICAgICAgICAgICBkZWx0YSAqPSAxO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVkaXRvcmZzIDwgMjApIHtcclxuICAgICAgICAgICAgICAgIGRlbHRhICo9IDI7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBkZWx0YSAqPSA0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbmV3RWRpdG9yRnMgPSBlZGl0b3JmcyArIGRlbHRhO1xyXG4gICAgICAgIGlmIChuZXdFZGl0b3JGcyA+PSA2ICYmIG5ld0VkaXRvckZzIDw9IDgwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0Rm9udFNpemUobmV3RWRpdG9yRnMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgYWRkQWN0aW9ucygpIHtcclxuICAgICAgICB0aGlzLmVkaXRvci5hZGRBY3Rpb24oe1xyXG4gICAgICAgICAgICAvLyBBbiB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY29udHJpYnV0ZWQgYWN0aW9uLlxyXG4gICAgICAgICAgICBpZDogJ0ZpbmQgYnJhY2tldCcsXHJcblxyXG4gICAgICAgICAgICAvLyBBIGxhYmVsIG9mIHRoZSBhY3Rpb24gdGhhdCB3aWxsIGJlIHByZXNlbnRlZCB0byB0aGUgdXNlci5cclxuICAgICAgICAgICAgbGFiZWw6ICdGaW5kZSBrb3JyZXNwb25kaWVyZW5kZSBLbGFtbWVyJyxcclxuXHJcbiAgICAgICAgICAgIC8vIEFuIG9wdGlvbmFsIGFycmF5IG9mIGtleWJpbmRpbmdzIGZvciB0aGUgYWN0aW9uLlxyXG4gICAgICAgICAgICBrZXliaW5kaW5nczogW1xyXG4gICAgICAgICAgICAgICAgbW9uYWNvLktleU1vZC5DdHJsQ21kIHwgbW9uYWNvLktleUNvZGUuS0VZX0tdLFxyXG5cclxuICAgICAgICAgICAgLy8gQSBwcmVjb25kaXRpb24gZm9yIHRoaXMgYWN0aW9uLlxyXG4gICAgICAgICAgICBwcmVjb25kaXRpb246IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvLyBBIHJ1bGUgdG8gZXZhbHVhdGUgb24gdG9wIG9mIHRoZSBwcmVjb25kaXRpb24gaW4gb3JkZXIgdG8gZGlzcGF0Y2ggdGhlIGtleWJpbmRpbmdzLlxyXG4gICAgICAgICAgICBrZXliaW5kaW5nQ29udGV4dDogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIGNvbnRleHRNZW51R3JvdXBJZDogJ25hdmlnYXRpb24nLFxyXG5cclxuICAgICAgICAgICAgY29udGV4dE1lbnVPcmRlcjogMS41LFxyXG5cclxuICAgICAgICAgICAgLy8gTWV0aG9kIHRoYXQgd2lsbCBiZSBleGVjdXRlZCB3aGVuIHRoZSBhY3Rpb24gaXMgdHJpZ2dlcmVkLlxyXG4gICAgICAgICAgICAvLyBAcGFyYW0gZWRpdG9yIFRoZSBlZGl0b3IgaW5zdGFuY2UgaXMgcGFzc2VkIGluIGFzIGEgY29udmluaWVuY2VcclxuICAgICAgICAgICAgcnVuOiBmdW5jdGlvbiAoZWQpIHtcclxuICAgICAgICAgICAgICAgIGVkLmdldEFjdGlvbignZWRpdG9yLmFjdGlvbi5qdW1wVG9CcmFja2V0JykucnVuKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBTdHJnICsgIyBmdW5rdGlvbmllcnQgYmVpIEZpcmVmb3ggbmljaHQsIGRhaGVyIGFsdGVybmF0aXYgU3RyZyArICw6XHJcbiAgICAgICAgdGhpcy5lZGl0b3IuYWRkQWN0aW9uKHtcclxuICAgICAgICAgICAgLy8gQW4gdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNvbnRyaWJ1dGVkIGFjdGlvbi5cclxuICAgICAgICAgICAgaWQ6ICdUb2dnbGUgbGluZSBjb21tZW50JyxcclxuXHJcbiAgICAgICAgICAgIC8vIEEgbGFiZWwgb2YgdGhlIGFjdGlvbiB0aGF0IHdpbGwgYmUgcHJlc2VudGVkIHRvIHRoZSB1c2VyLlxyXG4gICAgICAgICAgICBsYWJlbDogJ1plaWxlbmtvbW1lbnRhciBlaW4tL2F1c3NjaGFsdGVuJyxcclxuXHJcbiAgICAgICAgICAgIC8vIEFuIG9wdGlvbmFsIGFycmF5IG9mIGtleWJpbmRpbmdzIGZvciB0aGUgYWN0aW9uLlxyXG4gICAgICAgICAgICBrZXliaW5kaW5nczogW1xyXG4gICAgICAgICAgICAgICAgbW9uYWNvLktleU1vZC5DdHJsQ21kIHwgbW9uYWNvLktleUNvZGUuVVNfQ09NTUEgXSxcclxuXHJcbiAgICAgICAgICAgIC8vIEEgcHJlY29uZGl0aW9uIGZvciB0aGlzIGFjdGlvbi5cclxuICAgICAgICAgICAgcHJlY29uZGl0aW9uOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLy8gQSBydWxlIHRvIGV2YWx1YXRlIG9uIHRvcCBvZiB0aGUgcHJlY29uZGl0aW9uIGluIG9yZGVyIHRvIGRpc3BhdGNoIHRoZSBrZXliaW5kaW5ncy5cclxuICAgICAgICAgICAga2V5YmluZGluZ0NvbnRleHQ6IG51bGwsXHJcblxyXG4gICAgICAgICAgICBjb250ZXh0TWVudUdyb3VwSWQ6ICdpbnNlcnQnLFxyXG5cclxuICAgICAgICAgICAgY29udGV4dE1lbnVPcmRlcjogMS41LFxyXG5cclxuICAgICAgICAgICAgLy8gTWV0aG9kIHRoYXQgd2lsbCBiZSBleGVjdXRlZCB3aGVuIHRoZSBhY3Rpb24gaXMgdHJpZ2dlcmVkLlxyXG4gICAgICAgICAgICAvLyBAcGFyYW0gZWRpdG9yIFRoZSBlZGl0b3IgaW5zdGFuY2UgaXMgcGFzc2VkIGluIGFzIGEgY29udmluaWVuY2VcclxuICAgICAgICAgICAgcnVuOiBmdW5jdGlvbiAoZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdIaWVyIScpO1xyXG4gICAgICAgICAgICAgICAgZWQuZ2V0QWN0aW9uKCdlZGl0b3IuYWN0aW9uLmNvbW1lbnRMaW5lJykucnVuKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmVkaXRvci5nZXRTdXBwb3J0ZWRBY3Rpb25zKCkpO1xyXG4gICAgfVxyXG5cclxuICAgIG9uRXZhbHVhdGVTZWxlY3RlZFRleHQoZXZlbnQ6IG1vbmFjby5lZGl0b3IuSUN1cnNvclBvc2l0aW9uQ2hhbmdlZEV2ZW50KSB7XHJcblxyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgaWYgKHRoYXQuY3cgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGF0LmVkaXRvci5yZW1vdmVDb250ZW50V2lkZ2V0KHRoYXQuY3cpO1xyXG4gICAgICAgICAgICB0aGF0LmN3ID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGF0Lm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLnBhdXNlZCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IG1vZGVsID0gdGhhdC5lZGl0b3IuZ2V0TW9kZWwoKTtcclxuICAgICAgICAgICAgbGV0IHRleHQgPSBtb2RlbC5nZXRWYWx1ZUluUmFuZ2UodGhhdC5lZGl0b3IuZ2V0U2VsZWN0aW9uKCkpO1xyXG4gICAgICAgICAgICBpZiAodGV4dCAhPSBudWxsICYmIHRleHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGV2YWx1YXRvciA9IHRoaXMubWFpbi5nZXRDdXJyZW50V29ya3NwYWNlKCkuZXZhbHVhdG9yO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IGV2YWx1YXRvci5ldmFsdWF0ZSh0ZXh0KTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuZXJyb3IgPT0gbnVsbCAmJiByZXN1bHQudmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB2ID0gcmVzdWx0LnZhbHVlLnR5cGUuZGVidWdPdXRwdXQocmVzdWx0LnZhbHVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbW9uYWNvLmVkaXRvci5jb2xvcml6ZSh0ZXh0ICsgXCI6IFwiLCAnbXlKYXZhJywgeyB0YWJTaXplOiAzIH0pLnRoZW4oKHRleHQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRleHQuZW5kc1dpdGgoXCI8YnIvPlwiKSkgdGV4dCA9IHRleHQuc3Vic3RyKDAsIHRleHQubGVuZ3RoIC0gNSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuY3cgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXRJZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnbXkuY29udGVudC53aWRnZXQnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldERvbU5vZGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZG4gPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb19lZGl0b3JUb29sdGlwIGpvX2NvZGVGb250XCI+JyArIHRleHQgKyB2ICsgJzwvZGl2PicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkblswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXRQb3NpdGlvbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBldmVudC5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmVyZW5jZTogW21vbmFjby5lZGl0b3IuQ29udGVudFdpZGdldFBvc2l0aW9uUHJlZmVyZW5jZS5BQk9WRSwgbW9uYWNvLmVkaXRvci5Db250ZW50V2lkZ2V0UG9zaXRpb25QcmVmZXJlbmNlLkJFTE9XXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZWRpdG9yLmFkZENvbnRlbnRXaWRnZXQodGhhdC5jdyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgb25NYXJnaW5Nb3VzZURvd24obGluZU51bWJlcjogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IG1vZHVsZSA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCk7XHJcbiAgICAgICAgaWYgKG1vZHVsZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vZHVsZS50b2dnbGVCcmVha3BvaW50KGxpbmVOdW1iZXIsIHRydWUpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5tYWluLmdldEludGVycHJldGVyKCkubW9kdWxlU3RvcmUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgcnVubmluZ01vZHVsZSA9IHRoaXMubWFpbi5nZXRJbnRlcnByZXRlcigpLm1vZHVsZVN0b3JlLmZpbmRNb2R1bGVCeUZpbGUobW9kdWxlLmZpbGUpO1xyXG4gICAgICAgICAgICBpZiAocnVubmluZ01vZHVsZSAhPSBudWxsKSBydW5uaW5nTW9kdWxlLnRvZ2dsZUJyZWFrcG9pbnQobGluZU51bWJlciwgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZWxlbWVudERlY29yYXRpb246IHN0cmluZ1tdID0gW107XHJcbiAgICBvbkRpZENoYW5nZUN1cnNvclBvc2l0aW9uKHBvc2l0aW9uOiB7IGxpbmVOdW1iZXI6IG51bWJlciwgY29sdW1uOiBudW1iZXIgfSkge1xyXG5cclxuICAgICAgICBpZiAocG9zaXRpb24gPT0gbnVsbCkgcG9zaXRpb24gPSB0aGlzLmVkaXRvci5nZXRQb3NpdGlvbigpO1xyXG5cclxuICAgICAgICBsZXQgbW9kdWxlID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKTtcclxuICAgICAgICBpZiAobW9kdWxlID09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5lbGVtZW50RGVjb3JhdGlvbiA9IHRoaXMuZWRpdG9yLmRlbHRhRGVjb3JhdGlvbnModGhpcy5lbGVtZW50RGVjb3JhdGlvbiwgW10pO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZWxlbWVudCA9IG1vZHVsZS5nZXRFbGVtZW50QXRQb3NpdGlvbihwb3NpdGlvbi5saW5lTnVtYmVyLCBwb3NpdGlvbi5jb2x1bW4pO1xyXG5cclxuICAgICAgICBsZXQgZGVjb3JhdGlvbnM6IG1vbmFjby5lZGl0b3IuSU1vZGVsRGVsdGFEZWNvcmF0aW9uW10gPSBbXTtcclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgdXNhZ2VQb3NpdGlvbnMgPSBlbGVtZW50LnVzYWdlUG9zaXRpb25zO1xyXG4gICAgICAgICAgICBsZXQgdXBJbkN1cnJlbnRNb2R1bGUgPSB1c2FnZVBvc2l0aW9ucy5nZXQobW9kdWxlKTtcclxuICAgICAgICAgICAgaWYgKHVwSW5DdXJyZW50TW9kdWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHVwIG9mIHVwSW5DdXJyZW50TW9kdWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVjb3JhdGlvbnMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiB7IHN0YXJ0Q29sdW1uOiB1cC5jb2x1bW4sIHN0YXJ0TGluZU51bWJlcjogdXAubGluZSwgZW5kQ29sdW1uOiB1cC5jb2x1bW4gKyB1cC5sZW5ndGgsIGVuZExpbmVOdW1iZXI6IHVwLmxpbmUgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnam9fcmV2ZWFsU3ludGF4RWxlbWVudCcsIGlzV2hvbGVMaW5lOiBmYWxzZSwgb3ZlcnZpZXdSdWxlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiB7IGlkOiBcImVkaXRvckluZGVudEd1aWRlLmJhY2tncm91bmRcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhcmtDb2xvcjogeyBpZDogXCJlZGl0b3JJbmRlbnRHdWlkZS5hY3RpdmVCYWNrZ3JvdW5kXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbW9uYWNvLmVkaXRvci5PdmVydmlld1J1bGVyTGFuZS5MZWZ0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBpZiAodGhpcy5oaWdobGlnaHRDdXJyZW50TWV0aG9kKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgbWV0aG9kID0gbW9kdWxlLmdldE1ldGhvZERlY2xhcmF0aW9uQXRQb3NpdGlvbihwb3NpdGlvbik7XHJcbiAgICAgICAgICAgIGlmIChtZXRob2QgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZGVjb3JhdGlvbnMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHsgc3RhcnRDb2x1bW46IDAsIHN0YXJ0TGluZU51bWJlcjogbWV0aG9kLnBvc2l0aW9uLmxpbmUsIGVuZENvbHVtbjogMTAwLCBlbmRMaW5lTnVtYmVyOiBtZXRob2Quc2NvcGVUby5saW5lIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdqb19oaWdobGlnaHRNZXRob2QnLCBpc1dob2xlTGluZTogdHJ1ZSwgb3ZlcnZpZXdSdWxlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6IHsgaWQ6IFwiam9faGlnaGxpZ2h0TWV0aG9kXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhcmtDb2xvcjogeyBpZDogXCJqb19oaWdobGlnaHRNZXRob2RcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG1vbmFjby5lZGl0b3IuT3ZlcnZpZXdSdWxlckxhbmUuTGVmdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5pbWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogeyBpZDogJ2pvX2hpZ2hsaWdodE1ldGhvZCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBtb25hY28uZWRpdG9yLk1pbmltYXBQb3NpdGlvbi5JbmxpbmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgekluZGV4OiAtMTAwXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZWxlbWVudERlY29yYXRpb24gPSB0aGlzLmVkaXRvci5kZWx0YURlY29yYXRpb25zKHRoaXMuZWxlbWVudERlY29yYXRpb24sIGRlY29yYXRpb25zKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCk6IE1vZHVsZSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFpbi5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKTtcclxuICAgIH1cclxuXHJcbiAgICBkb250RGV0ZWN0TGFzdENoYW5nZSgpIHtcclxuICAgICAgICAvLyB0aGlzLmRvbnREZXRlY3RMYXN0Q2hhbmdpbmcgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJlc29sdmVSZW5hbWVMb2NhdGlvbihtb2RlbDogbW9uYWNvLmVkaXRvci5JVGV4dE1vZGVsLCBwb3NpdGlvbjogbW9uYWNvLlBvc2l0aW9uLFxyXG4gICAgICAgIHRva2VuOiBtb25hY28uQ2FuY2VsbGF0aW9uVG9rZW4pOiBtb25hY28ubGFuZ3VhZ2VzLlByb3ZpZGVyUmVzdWx0PG1vbmFjby5sYW5ndWFnZXMuUmVuYW1lTG9jYXRpb24gJiBtb25hY28ubGFuZ3VhZ2VzLlJlamVjdGlvbj4ge1xyXG5cclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRseUVkaXRlZE1vZHVsZSA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCk7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50bHlFZGl0ZWRNb2R1bGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICByYW5nZTogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIkRpZXNlcyBTeW1ib2wga2FubiBuaWNodCB1bWJlbmFubnQgd2VyZGVuLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdFJlYXNvbjogXCJEaWVzZXMgU3ltYm9sIGthbm4gbmljaHQgdW1iZW5hbm50IHdlcmRlbi5cIlxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbGV0IGVsZW1lbnQgPSBjdXJyZW50bHlFZGl0ZWRNb2R1bGUuZ2V0RWxlbWVudEF0UG9zaXRpb24ocG9zaXRpb24ubGluZU51bWJlciwgcG9zaXRpb24uY29sdW1uKTtcclxuICAgICAgICAgICAgaWYgKGVsZW1lbnQgPT0gbnVsbCB8fCBlbGVtZW50LmRlY2xhcmF0aW9uID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJEaWVzZXMgU3ltYm9sIGthbm4gbmljaHQgdW1iZW5hbm50IHdlcmRlbi5cIixcclxuICAgICAgICAgICAgICAgICAgICByZWplY3RSZWFzb246IFwiRGllc2VzIFN5bWJvbCBrYW5uIG5pY2h0IHVtYmVuYW5udCB3ZXJkZW4uXCJcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgIFxyXG4gICAgICAgICAgICBsZXQgcG9zID0gZWxlbWVudC5kZWNsYXJhdGlvbi5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByYW5nZToge3N0YXJ0Q29sdW1uOiBwb3NpdGlvbi5jb2x1bW4sIHN0YXJ0TGluZU51bWJlcjogcG9zaXRpb24ubGluZU51bWJlciwgZW5kTGluZU51bWJlcjogcG9zaXRpb24ubGluZU51bWJlciwgZW5kQ29sdW1uOiBwb3NpdGlvbi5jb2x1bW4gKyBwb3MubGVuZ3RofSxcclxuICAgICAgICAgICAgICAgIHRleHQ6IGVsZW1lbnQuaWRlbnRpZmllclxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcm92aWRlUmVuYW1lRWRpdHMobW9kZWw6IG1vbmFjby5lZGl0b3IuSVRleHRNb2RlbCwgcG9zaXRpb246IG1vbmFjby5Qb3NpdGlvbixcclxuICAgICAgICBuZXdOYW1lOiBzdHJpbmcsIHRva2VuOiBtb25hY28uQ2FuY2VsbGF0aW9uVG9rZW4pOlxyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMuUHJvdmlkZXJSZXN1bHQ8bW9uYWNvLmxhbmd1YWdlcy5Xb3Jrc3BhY2VFZGl0ICYgbW9uYWNvLmxhbmd1YWdlcy5SZWplY3Rpb24+IHtcclxuXHJcbiAgICAgICAgbGV0IGN1cnJlbnRseUVkaXRlZE1vZHVsZSA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCk7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRseUVkaXRlZE1vZHVsZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGVsZW1lbnQgPSBjdXJyZW50bHlFZGl0ZWRNb2R1bGUuZ2V0RWxlbWVudEF0UG9zaXRpb24ocG9zaXRpb24ubGluZU51bWJlciwgcG9zaXRpb24uY29sdW1uKTtcclxuICAgICAgICBpZiAoZWxlbWVudCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB1c2FnZVBvc2l0aW9ucyA9IGVsZW1lbnQudXNhZ2VQb3NpdGlvbnM7XHJcblxyXG4gICAgICAgIC8vMDYuMDYuMjAyMFxyXG4gICAgICAgIGxldCByZXNvdXJjZUVkaXRzOiBtb25hY28ubGFuZ3VhZ2VzLldvcmtzcGFjZVRleHRFZGl0W10gPSBbXTtcclxuXHJcbiAgICAgICAgdXNhZ2VQb3NpdGlvbnMuZm9yRWFjaCgodXNhZ2VQb3NpdGlvbnNJbk1vZHVsZSwgbW9kdWxlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh1c2FnZVBvc2l0aW9uc0luTW9kdWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBlZGl0czogbW9uYWNvLmxhbmd1YWdlcy5UZXh0RWRpdFtdID0gW107XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB1cCBvZiB1c2FnZVBvc2l0aW9uc0luTW9kdWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VFZGl0cy5wdXNoKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZTogbW9kdWxlLnVyaSwgZWRpdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogeyBzdGFydENvbHVtbjogdXAuY29sdW1uLCBzdGFydExpbmVOdW1iZXI6IHVwLmxpbmUsIGVuZExpbmVOdW1iZXI6IHVwLmxpbmUsIGVuZENvbHVtbjogdXAuY29sdW1uICsgdXAubGVuZ3RoIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogbmV3TmFtZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChlZGl0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlLmZpbGUuZGlydHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZHVsZS5maWxlLnNhdmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlLmZpbGUuaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuXHJcbi8vICAgICAgICBjb25zb2xlLmxvZyhyZXNvdXJjZUVkaXRzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZWRpdHM6IHJlc291cmNlRWRpdHNcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb3ZpZGVEZWZpbml0aW9uKG1vZGVsOiBtb25hY28uZWRpdG9yLklUZXh0TW9kZWwsIHBvc2l0aW9uOiBtb25hY28uUG9zaXRpb24sIGNhbmNlbGxhdGlvblRva2VuOiBtb25hY28uQ2FuY2VsbGF0aW9uVG9rZW4pOlxyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMuUHJvdmlkZXJSZXN1bHQ8bW9uYWNvLmxhbmd1YWdlcy5EZWZpbml0aW9uPiB7XHJcblxyXG4gICAgICAgIGxldCBtb2R1bGU6IE1vZHVsZSA9IHRoaXMubWFpbi5nZXRDdXJyZW50V29ya3NwYWNlKCkuZ2V0TW9kdWxlQnlNb25hY29Nb2RlbChtb2RlbCk7XHJcblxyXG4gICAgICAgIGlmIChtb2R1bGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBlbGVtZW50ID0gbW9kdWxlLmdldEVsZW1lbnRBdFBvc2l0aW9uKHBvc2l0aW9uLmxpbmVOdW1iZXIsIHBvc2l0aW9uLmNvbHVtbik7XHJcbiAgICAgICAgaWYgKGVsZW1lbnQgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGxldCBkZWNsID0gZWxlbWVudC5kZWNsYXJhdGlvbjtcclxuXHJcbiAgICAgICAgaWYgKGRlY2wgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAvLyBjbGFzcyBmcm9tIEJhc2UtTW9kdWxlPyBMZXQgZGVmaW5pdGlvbiBwb2ludCB0byBjdXJyZW50IHBvc2l0aW9uLCBzbyB0aGF0IGN0cmwgKyBjbGljayBvcGVucyBwZWVrIHJlZmVyZW5jZXMgd2lkZ2V0XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgS2xhc3MgfHwgZWxlbWVudCBpbnN0YW5jZW9mIEVudW0gfHwgZWxlbWVudCBpbnN0YW5jZW9mIEludGVyZmFjZSB8fCBlbGVtZW50IGluc3RhbmNlb2YgTWV0aG9kIHx8IGVsZW1lbnQgaW5zdGFuY2VvZiBBdHRyaWJ1dGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0TGluZU51bWJlcjogcG9zaXRpb24ubGluZU51bWJlciwgZW5kTGluZU51bWJlcjogcG9zaXRpb24ubGluZU51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiwgZW5kQ29sdW1uOiBwb3NpdGlvbi5jb2x1bW4gKyBlbGVtZW50LmlkZW50aWZpZXIubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB1cmk6IG1vZHVsZS51cmlcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xyXG4gICAgICAgICAgICByYW5nZToge1xyXG4gICAgICAgICAgICAgICAgc3RhcnRMaW5lTnVtYmVyOiBkZWNsLnBvc2l0aW9uLmxpbmUsIGVuZExpbmVOdW1iZXI6IGRlY2wucG9zaXRpb24ubGluZSxcclxuICAgICAgICAgICAgICAgIHN0YXJ0Q29sdW1uOiBkZWNsLnBvc2l0aW9uLmNvbHVtbiwgZW5kQ29sdW1uOiBkZWNsLnBvc2l0aW9uLmNvbHVtbiArIGRlY2wucG9zaXRpb24ubGVuZ3RoXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHVyaTogZGVjbC5tb2R1bGUudXJpXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxufSJdfQ==