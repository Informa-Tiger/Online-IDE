import { Compiler, CompilerStatus } from "../compiler/Compiler.js";
import { Module } from "../compiler/parser/Module.js";
import { Debugger } from "../interpreter/Debugger.js";
import { Interpreter, InterpreterState } from "../interpreter/Interpreter.js";
import { ActionManager } from "../main/gui/ActionManager.js";
import { BottomDiv } from "../main/gui/BottomDiv.js";
import { Editor } from "../main/gui/Editor.js";
import { ProgramControlButtons } from "../main/gui/ProgramControlButtons.js";
import { RightDiv } from "../main/gui/RightDiv.js";
import { Workspace } from "../workspace/Workspace.js";
import { downloadFile, makeTabs, openContextMenu } from "../tools/HtmlTools.js";
import { EmbeddedSlider } from "./EmbeddedSlider.js";
import { EmbeddedFileExplorer } from "./EmbeddedFileExplorer.js";
import { EmbeddedIndexedDB } from "./EmbeddedIndexedDB.js";
import { SemicolonAngel } from "../compiler/parser/SemicolonAngel.js";
export class MainEmbedded {
    constructor($div, scriptList) {
        this.scriptList = scriptList;
        this.programPointerDecoration = [];
        this.programIsExecutable = false;
        this.version = 0;
        this.compileRunsAfterCodeReset = 0;
        this.readConfig($div);
        this.initGUI($div);
        this.initScripts();
        if (!this.config.hideStartPanel) {
            this.indexedDB = new EmbeddedIndexedDB();
            this.indexedDB.open(() => {
                if (this.config.id != null) {
                    this.readScripts();
                }
            });
        }
        this.semicolonAngel = new SemicolonAngel(this);
    }
    isEmbedded() { return true; }
    jumpToDeclaration(module, declaration) { }
    ;
    getCompiler() {
        return this.compiler;
    }
    getInterpreter() {
        return this.interpreter;
    }
    getCurrentWorkspace() {
        return this.currentWorkspace;
    }
    getDebugger() {
        return this.debugger;
    }
    getMonacoEditor() {
        return this.editor.editor;
    }
    getRightDiv() {
        return this.rightDiv;
    }
    getBottomDiv() {
        return this.bottomDiv;
    }
    getActionManager() {
        return this.actionManager;
    }
    getCurrentlyEditedModule() {
        var _a;
        if (this.config.withFileList) {
            return (_a = this.fileExplorer.currentFile) === null || _a === void 0 ? void 0 : _a.module;
        }
        else {
            return this.currentWorkspace.moduleStore.getFirstModule();
        }
    }
    initScripts() {
        var _a;
        (_a = this.fileExplorer) === null || _a === void 0 ? void 0 : _a.removeAllFiles();
        this.initWorkspace(this.scriptList);
        if (this.config.withFileList) {
            this.fileExplorer = new EmbeddedFileExplorer(this.currentWorkspace.moduleStore, this.$filesListDiv, this);
            this.fileExplorer.setFirstFileActive();
            this.scriptList.filter((script) => script.type == "hint").forEach((script) => this.fileExplorer.addHint(script));
        }
        else {
            this.setModuleActive(this.currentWorkspace.moduleStore.getFirstModule());
        }
    }
    readConfig($div) {
        let configJson = $div.data("java-online");
        if (configJson != null && typeof configJson == "string") {
            this.config = JSON.parse(configJson.split("'").join('"'));
        }
        else {
            this.config = {};
        }
        if (this.config.hideEditor == null)
            this.config.hideEditor = false;
        if (this.config.hideStartPanel == null)
            this.config.hideStartPanel = false;
        if (this.config.withBottomPanel == null) {
            this.config.withBottomPanel = this.config.withConsole || this.config.withPCode || this.config.withFileList || this.config.withErrorList;
        }
        if (this.config.hideEditor) {
            this.config.withBottomPanel = false;
            this.config.withFileList = false;
            this.config.withConsole = false;
            this.config.withPCode = false;
            this.config.withErrorList = false;
        }
        if (this.config.withBottomPanel) {
            if (this.config.withFileList == null)
                this.config.withFileList = true;
            if (this.config.withPCode == null)
                this.config.withPCode = true;
            if (this.config.withConsole == null)
                this.config.withConsole = true;
            if (this.config.withErrorList == null)
                this.config.withErrorList = true;
        }
        if (this.config.speed == null)
            this.config.speed = 9;
        if (this.config.libraries == null)
            this.config.libraries = [];
        if (this.config.jsonFilename == null)
            this.config.jsonFilename = "workspace.json";
    }
    setModuleActive(module) {
        if (module == null)
            return;
        if (this.config.withFileList && this.fileExplorer.currentFile != null) {
            this.fileExplorer.currentFile.module.editorState = this.getMonacoEditor().saveViewState();
        }
        if (this.config.withFileList) {
            this.fileExplorer.markFile(module);
        }
        /**
         * WICHTIG: Die Reihenfolge der beiden Operationen ist extrem wichtig.
         * Falls das Model im readonly-Zustand gesetzt wird, funktioniert <Strg + .>
         * nicht und die Lightbulbs werden nicht angezeigt, selbst dann, wenn
         * später readonly = false gesetzt wird.
         */
        this.getMonacoEditor().updateOptions({
            readOnly: false,
            lineNumbersMinChars: 4
        });
        this.editor.editor.setModel(module.model);
        if (module.editorState != null) {
            this.getMonacoEditor().restoreViewState(module.editorState);
        }
        module.renderBreakpointDecorators();
    }
    eraseDokuwikiSearchMarkup(text) {
        return text.replace(/<span class="search\whit">(.*?)<\/span>/g, "$1");
    }
    readScripts() {
        let modules = this.currentWorkspace.moduleStore.getModules(false);
        let that = this;
        this.indexedDB.getScript(this.config.id, (scriptListJSon) => {
            var _a;
            if (scriptListJSon == null) {
                setInterval(() => {
                    that.saveScripts();
                }, 1000);
            }
            else {
                let scriptList = JSON.parse(scriptListJSon);
                let countDown = scriptList.length;
                for (let module of modules) {
                    (_a = that.fileExplorer) === null || _a === void 0 ? void 0 : _a.removeModule(module);
                    that.removeModule(module);
                }
                for (let name of scriptList) {
                    let scriptId = this.config.id + name;
                    this.indexedDB.getScript(scriptId, (script) => {
                        var _a, _b;
                        if (script != null) {
                            script = this.eraseDokuwikiSearchMarkup(script);
                            let module = that.addModule({
                                title: name,
                                text: script,
                                type: "java"
                            });
                            (_a = that.fileExplorer) === null || _a === void 0 ? void 0 : _a.addModule(module);
                            that.$resetButton.fadeIn(1000);
                            // console.log("Retrieving script " + scriptId);
                        }
                        countDown--;
                        if (countDown == 0) {
                            setInterval(() => {
                                that.saveScripts();
                            }, 1000);
                            (_b = that.fileExplorer) === null || _b === void 0 ? void 0 : _b.setFirstFileActive();
                            if (that.fileExplorer == null) {
                                let modules = that.currentWorkspace.moduleStore.getModules(false);
                                if (modules.length > 0)
                                    that.setModuleActive(modules[0]);
                            }
                        }
                    });
                }
            }
        });
    }
    saveScripts() {
        let modules = this.currentWorkspace.moduleStore.getModules(false);
        let scriptList = [];
        let oneNotSaved = false;
        modules.forEach(m => oneNotSaved = oneNotSaved || !m.file.saved);
        if (oneNotSaved) {
            for (let module of modules) {
                scriptList.push(module.file.name);
                let scriptId = this.config.id + module.file.name;
                this.indexedDB.writeScript(scriptId, module.getProgramTextFromMonacoModel());
                module.file.saved = true;
                // console.log("Saving script " + scriptId);
            }
            this.indexedDB.writeScript(this.config.id, JSON.stringify(scriptList));
        }
    }
    deleteScriptsInDB() {
        this.indexedDB.getScript(this.config.id, (scriptListJSon) => {
            if (scriptListJSon == null) {
                return;
            }
            else {
                let scriptList = JSON.parse(scriptListJSon);
                for (let name of scriptList) {
                    let scriptId = this.config.id + name;
                    this.indexedDB.removeScript(scriptId);
                }
                this.indexedDB.removeScript(this.config.id);
            }
        });
    }
    initWorkspace(scriptList) {
        this.currentWorkspace = new Workspace("Embedded-Workspace", this, 0);
        this.currentWorkspace.settings.libraries = this.config.libraries;
        this.currentWorkspace.alterAdditionalLibraries();
        let i = 0;
        for (let script of scriptList) {
            if (script.type == "java") {
                this.addModule(script);
            }
        }
    }
    addModule(script) {
        let module = Module.restoreFromData({
            id: this.currentWorkspace.moduleStore.getModules(true).length,
            name: script.title,
            text: script.text,
            text_before_revision: null,
            submitted_date: null,
            student_edited_after_revision: false,
            version: 1,
            workspace_id: 0,
            forceUpdate: false,
            identical_to_repository_version: false,
            file_type: 0
        }, this);
        this.currentWorkspace.moduleStore.putModule(module);
        let that = this;
        module.model.onDidChangeContent(() => {
            that.considerShowingCodeResetButton();
        });
        return module;
    }
    removeModule(module) {
        this.currentWorkspace.moduleStore.removeModule(module);
    }
    initGUI($div) {
        // let $leftDiv = jQuery('<div class="joe_leftDiv"></div>');
        $div.css({
            "background-image": "none",
            "background-size": "100%"
        });
        let $centerDiv = jQuery('<div class="joe_centerDiv"></div>');
        let $resetModalWindow = this.makeCodeResetModalWindow($div);
        let $rightDiv = this.makeRightDiv();
        let $editorDiv = jQuery('<div class="joe_editorDiv"></div>');
        this.$monacoDiv = jQuery('<div class="joe_monacoDiv"></div>');
        this.$hintDiv = jQuery('<div class="joe_hintDiv jo_scrollable"></div>');
        this.$resetButton = jQuery('<div class="joe_resetButton jo_button jo_active" title="Code auf Ausgangszustand zurücksetzen">Code Reset</div>');
        $editorDiv.append(this.$monacoDiv, this.$hintDiv, this.$resetButton);
        let $bracketErrorDiv = this.makeBracketErrorDiv();
        $editorDiv.append($bracketErrorDiv);
        this.$resetButton.hide();
        this.$resetButton.on("click", () => { $resetModalWindow.show(); });
        this.$hintDiv.hide();
        let $controlsDiv = jQuery('<div class="joe_controlsDiv"></div>');
        let $bottomDivInner = jQuery('<div class="joe_bottomDivInner"></div>');
        let $buttonOpen = jQuery('<label type="file" class="img_open-file jo_button jo_active"' +
            'style="margin-right: 8px;" title="Workspace aus Datei laden"><input type="file" style="display:none"></label>');
        let that = this;
        $buttonOpen.find('input').on('change', (event) => {
            //@ts-ignore
            var files = event.originalEvent.target.files;
            that.loadWorkspaceFromFile(files[0]);
        });
        let $buttonSave = jQuery('<div class="img_save-dark jo_button jo_active"' +
            'style="margin-right: 8px;" title="Workspace in Datei speichern"></div>');
        $buttonSave.on('click', () => { that.saveWorkspaceToFile(); });
        $controlsDiv.append($buttonOpen, $buttonSave);
        if (this.config.withBottomPanel) {
            let $bottomDiv = jQuery('<div class="joe_bottomDiv"></div>');
            this.makeBottomDiv($bottomDivInner, $controlsDiv);
            $bottomDiv.append($bottomDivInner);
            if (this.config.withFileList) {
                let $filesDiv = this.makeFilesDiv();
                $bottomDiv.prepend($filesDiv);
                new EmbeddedSlider($filesDiv, false, false, () => { });
            }
            makeTabs($bottomDivInner);
            $centerDiv.append($editorDiv, $bottomDiv);
            new EmbeddedSlider($bottomDiv, true, true, () => { this.editor.editor.layout(); });
        }
        else {
            $centerDiv.prepend($editorDiv);
        }
        if (!this.config.withBottomPanel) {
            if (this.config.hideEditor) {
                $rightDiv.prepend($controlsDiv);
            }
            else {
                $centerDiv.prepend($controlsDiv);
                $controlsDiv.addClass('joe_controlPanel_top');
                $editorDiv.css({
                    'position': 'relative',
                    'height': '1px'
                });
            }
        }
        $div.addClass('joe_javaOnlineDiv');
        $div.append($centerDiv, $rightDiv);
        if (!this.config.hideEditor) {
            new EmbeddedSlider($rightDiv, true, false, () => {
                jQuery('.jo_graphics').trigger('sizeChanged');
                this.editor.editor.layout();
            });
        }
        this.editor = new Editor(this, false, true);
        this.editor.initGUI(this.$monacoDiv);
        this.$monacoDiv.find('.monaco-editor').css('z-index', '10');
        if ($div.attr('tabindex') == null)
            $div.attr('tabindex', "0");
        this.actionManager = new ActionManager($div, this);
        this.actionManager.init();
        this.bottomDiv = new BottomDiv(this, $bottomDivInner, $div);
        this.bottomDiv.initGUI();
        this.rightDiv = new RightDiv(this, this.$rightDivInner);
        this.rightDiv.initGUI();
        let $rightSideContainer = jQuery('<div class="jo_rightdiv-rightside-container">');
        let $coordinates = jQuery('<div class="jo_coordinates">(0/0)</div>');
        this.$rightDivInner.append($rightSideContainer);
        $rightSideContainer.append($coordinates);
        this.debugger = new Debugger(this, this.$debuggerDiv, null);
        this.interpreter = new Interpreter(this, this.debugger, new ProgramControlButtons($controlsDiv, $editorDiv), this.$runDiv);
        let $infoButton = jQuery('<div class="jo_button jo_active img_ellipsis-dark" style="margin-left: 16px"></div>');
        $controlsDiv.append($infoButton);
        $infoButton.on('mousedown', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            openContextMenu([{
                    caption: "Über die Online-IDE ...",
                    link: "https://www.online-ide.de",
                    callback: () => {
                        // nothing to do.
                    }
                }, {
                    caption: "Zum Original-Repo",
                    link: "https://github.com/martin-pabst/Online-IDE",
                    callback: () => {
                        // nothing to do.
                    }
                }, {
                    caption: "Zum Fork von @Informa-Tiger",
                    link: "https://github.com/Informa-Tiger/Online-IDE",
                    callback: () => {
                        // nothing to do.
                    }
                }], ev.pageX + 2, ev.pageY + 2);
        });
        setTimeout(() => {
            this.interpreter.initGUI();
            this.editor.editor.layout();
            this.compiler = new Compiler(this);
            this.interpreter.controlButtons.speedControl.setSpeedInStepsPerSecond(this.config.speed);
            this.startTimer();
        }, 200);
        if (this.config.hideEditor) {
            $centerDiv.hide();
            $rightDiv.css("flex", "1");
            if (!this.config.hideStartPanel) {
                $div.find(".joe_rightDivInner").css('height', 'calc(100% - 24px)');
                $div.find(".joe_controlsDiv").css('padding', '2px');
                $div.find(".jo_speedcontrol-outer").css('z-index', '10');
            }
            else {
                $div.find(".joe_controlsDiv").hide();
            }
        }
    }
    makeBracketErrorDiv() {
        return jQuery(`
        <div class="jo_parenthesis_warning" title="Klammerwarnung!" style="bottom: 55px">
        <div class="jo_warning_light"></div>
        <div class="jo_pw_heading">{ }</div>
        <div title="Letzten Schritt rückgängig" 
            class="jo_pw_undo img_undo jo_button jo_active"></div>
        </div>
        `);
    }
    makeCodeResetModalWindow($parent) {
        let $window = jQuery(`
            <div class="joe_codeResetModal">
            <div style="flex: 1"></div>
            <div style="display: flex">
                <div style="flex: 1"></div>
                <div style="padding-left: 30px;">
                <div style="color: red; margin-bottom: 10px; font-weight: bold">Warnung:</div>
                <div>Soll der Code wirklich auf den Ausgangszustand zurückgesetzt werden?</div>
                <div>Alle von Dir gemachten Änderungen werden damit verworfen.</div>
                </div>
                <div style="flex: 1"></div>
            </div>
            <div class="joe_codeResetModalButtons">
            <div class="joe_codeResetModalCancel jo_button jo_active">Abbrechen</div>
            <div class="joe_codeResetModalOK jo_button jo_active">OK</div>
            </div>
            <div style="flex: 2"></div>
            </div>
        `);
        $window.hide();
        $parent.append($window);
        jQuery(".joe_codeResetModalCancel").on("click", () => {
            $window.hide();
        });
        jQuery(".joe_codeResetModalOK").on("click", () => {
            this.initScripts();
            this.deleteScriptsInDB();
            $window.hide();
            this.$resetButton.hide();
            this.compileRunsAfterCodeReset = 1;
        });
        return $window;
    }
    showProgramPointerPosition(file, position) {
        if (file == null) {
            return;
        }
        if (this.config.withFileList) {
            let fileData = this.fileExplorer.files.find((fileData) => fileData.module.file == file);
            if (fileData == null) {
                return;
            }
            if (fileData.module != this.getCurrentlyEditedModule()) {
                this.setModuleActive(fileData.module);
            }
            this.programPointerModule = fileData.module;
        }
        else {
            this.programPointerModule = this.currentWorkspace.moduleStore.getFirstModule();
        }
        let range = {
            startColumn: position.column, startLineNumber: position.line,
            endColumn: position.column + position.length, endLineNumber: position.line
        };
        this.getMonacoEditor().revealRangeInCenterIfOutsideViewport(range);
        this.programPointerDecoration = this.getMonacoEditor().deltaDecorations(this.programPointerDecoration, [
            {
                range: range,
                options: { className: 'jo_revealProgramPointer', isWholeLine: true }
            },
            {
                range: range,
                options: { beforeContentClassName: 'jo_revealProgramPointerBefore' }
            }
        ]);
    }
    hideProgramPointerPosition() {
        if (this.getCurrentlyEditedModule() == this.programPointerModule) {
            this.getMonacoEditor().deltaDecorations(this.programPointerDecoration, []);
        }
        this.programPointerModule = null;
        this.programPointerDecoration = [];
    }
    makeFilesDiv() {
        let $filesDiv = jQuery('<div class="joe_bottomDivFiles jo_scrollable"></div>');
        let $filesHeader = jQuery('<div class="joe_filesHeader jo_tabheading jo_active"  style="line-height: 24px">Programmdateien</div>');
        this.$filesListDiv = jQuery('<div class="joe_filesList jo_scrollable"></div>');
        // for (let index = 0; index < 20; index++) {            
        //     let $file = jQuery('<div class="jo_file jo_java"><div class="jo_fileimage"></div><div class="jo_filename"></div></div></div>');
        //     $filesList.append($file);
        // }
        $filesDiv.append($filesHeader, this.$filesListDiv);
        return $filesDiv;
    }
    startTimer() {
        if (this.timerHandle != null) {
            clearInterval(this.timerHandle);
        }
        let that = this;
        this.timerHandle = setInterval(() => {
            that.compileIfDirty();
        }, 500);
    }
    compileIfDirty() {
        var _a, _b;
        if (this.currentWorkspace == null)
            return;
        if (this.currentWorkspace.moduleStore.isDirty() &&
            this.compiler.compilerStatus != CompilerStatus.compiling
            && this.interpreter.state != InterpreterState.running
            && this.interpreter.state != InterpreterState.paused) {
            try {
                this.compiler.compile(this.currentWorkspace.moduleStore);
                let errors = (_b = (_a = this.
                    bottomDiv) === null || _a === void 0 ? void 0 : _a.errorManager) === null || _b === void 0 ? void 0 : _b.showErrors(this.currentWorkspace);
                this.editor.onDidChangeCursorPosition(null); // mark occurrencies of symbol under cursor
                this.printProgram();
                this.version++;
                let startable = this.interpreter.getStartableModule(this.currentWorkspace.moduleStore) != null;
                if (startable &&
                    this.interpreter.state == InterpreterState.not_initialized) {
                    this.copyExecutableModuleStoreToInterpreter();
                    this.interpreter.setState(InterpreterState.done);
                    if (this.config.hideStartPanel) {
                        this.actionManager.trigger('interpreter.start');
                    }
                    // this.interpreter.init();
                }
                if (!startable &&
                    (this.interpreter.state == InterpreterState.done || this.interpreter.state == InterpreterState.error)) {
                    this.interpreter.setState(InterpreterState.not_initialized);
                }
                // this.drawClassDiagrams(!this.rightDiv.isClassDiagramEnabled());
            }
            catch (e) {
                console.error(e);
                this.compiler.compilerStatus = CompilerStatus.error;
            }
        }
    }
    considerShowingCodeResetButton() {
        this.compileRunsAfterCodeReset++;
        if (this.compileRunsAfterCodeReset == 3) {
            this.$resetButton.fadeIn(1000);
        }
    }
    printProgram() {
        this.bottomDiv.printModuleToBottomDiv(this.currentWorkspace, this.getCurrentlyEditedModule());
    }
    drawClassDiagrams(onlyUpdateIdentifiers) {
        // clearTimeout(this.debounceDiagramDrawing);
        // this.debounceDiagramDrawing = setTimeout(() => {
        //     this.rightDiv?.classDiagram?.drawDiagram(this.currentWorkspace, onlyUpdateIdentifiers);
        // }, 500);
    }
    copyExecutableModuleStoreToInterpreter() {
        let ms = this.currentWorkspace.moduleStore.copy();
        this.interpreter.moduleStore = ms;
        this.interpreter.moduleStoreVersion = this.version;
        if (this.interpreter.state == InterpreterState.not_initialized && this.programIsExecutable) {
            this.interpreter.setState(InterpreterState.done);
        }
    }
    saveWorkspaceToFile() {
        let filename = prompt("Bitte geben Sie den Dateinamen ein", this.config.jsonFilename);
        if (filename == null) {
            alert("Der Dateiname ist leer, daher wird nichts gespeichert.");
            return;
        }
        if (!filename.endsWith(".json"))
            filename = filename + ".json";
        let ws = this.currentWorkspace;
        let name = ws.name.replace(/\//g, "_");
        downloadFile(ws.toExportedWorkspace(), filename);
    }
    makeBottomDiv($bottomDiv, $buttonDiv) {
        let $tabheadings = jQuery('<div class="jo_tabheadings"></div>');
        $tabheadings.css('position', 'relative');
        let $thRightSide = jQuery('<div class="joe_tabheading-right jo_noHeading"></div>');
        $thRightSide.append($buttonDiv);
        if (this.config.withConsole) {
            let $thConsoleClear = jQuery('<div class="img_clear-dark jo_button jo_active jo_console-clear"' +
                'style="display: none; margin-left: 8px;" title="Console leeren"></div>');
            $thRightSide.append($thConsoleClear);
        }
        if (this.config.withErrorList) {
            let $thErrors = jQuery('<div class="jo_tabheading jo_active" data-target="jo_errorsTab" style="line-height: 24px">Fehler</div>');
            $tabheadings.append($thErrors);
        }
        if (this.config.withConsole) {
            let $thConsole = jQuery('<div class="jo_tabheading jo_console-tab" data-target="jo_consoleTab" style="line-height: 24px">Console</div>');
            $tabheadings.append($thConsole);
        }
        if (this.config.withPCode) {
            let $thPCode = jQuery('<div class="jo_tabheading" data-target="jo_pcodeTab" style="line-height: 24px">PCode</div>');
            $tabheadings.append($thPCode);
        }
        $tabheadings.append($thRightSide);
        $bottomDiv.append($tabheadings);
        let $tabs = jQuery('<div class="jo_tabs jo_scrollable"></div>');
        if (this.config.withErrorList) {
            let $tabError = jQuery('<div class="jo_active jo_scrollable jo_errorsTab"></div>');
            $tabs.append($tabError);
        }
        if (this.config.withConsole) {
            let $tabConsole = jQuery(`
        <div class="jo_editorFontSize jo_consoleTab">
        <div class="jo_console-inner">
            <div class="jo_scrollable jo_console-top"></div>
            <div class="jo_commandline"></div>
        </div>
        </div>
    `);
            $tabs.append($tabConsole);
        }
        if (this.config.withPCode) {
            let $tabPCode = jQuery('<div class="jo_scrollable jo_pcodeTab">PCode</div>');
            $tabs.append($tabPCode);
        }
        $bottomDiv.append($tabs);
    }
    loadWorkspaceFromFile(file) {
        let that = this;
        if (file == null)
            return;
        var reader = new FileReader();
        reader.onload = (event) => {
            let text = event.target.result;
            if (!text.startsWith("{")) {
                alert(`<div>Das Format der Datei ${file.name} passt nicht.</div>`);
                return;
            }
            let ew = JSON.parse(text);
            if (ew.modules == null || ew.name == null || ew.settings == null) {
                alert(`<div>Das Format der Datei ${file.name} passt nicht.</div>`);
                return;
            }
            let ws = new Workspace(ew.name, this, 0);
            ws.settings = ew.settings;
            ws.alterAdditionalLibraries();
            for (let mo of ew.modules) {
                let f = {
                    name: mo.name,
                    dirty: false,
                    saved: true,
                    text: mo.text,
                    text_before_revision: null,
                    submitted_date: null,
                    student_edited_after_revision: false,
                    version: 1,
                    is_copy_of_id: null,
                    repository_file_version: null,
                    identical_to_repository_version: null
                };
                let m = new Module(f, this);
                ws.moduleStore.putModule(m);
            }
            that.currentWorkspace = ws;
            if (that.fileExplorer != null) {
                that.fileExplorer.removeAllFiles();
                ws.moduleStore.getModules(false).forEach(module => that.fileExplorer.addModule(module));
                that.fileExplorer.setFirstFileActive();
            }
            else {
                this.setModuleActive(this.currentWorkspace.moduleStore.getFirstModule());
            }
            that.saveScripts();
        };
        reader.readAsText(file);
    }
    makeRightDiv() {
        let $rightDiv = jQuery('<div class="joe_rightDiv"></div>');
        this.$rightDivInner = jQuery('<div class="joe_rightDivInner"></div>');
        $rightDiv.append(this.$rightDivInner);
        this.$debuggerDiv = jQuery('<div class="joe_debuggerDiv"></div>');
        this.$runDiv = jQuery(`
            <div class="jo_tab jo_active jo_run">
            <div class="jo_run-programend">Programm beendet</div>
            <div class="jo_run-input">
            <div>
            <div>
        <div class="jo_run-input-message" class="jo_rix">Bitte geben Sie eine Zahl ein!</div>
        <input class="jo_run-input-input" type="text" class="jo_rix">
        <div class="jo_run-input-button-outer" class="jo_rix">
        <div class="jo_run-input-button" class="jo_rix">OK</div>
        </div>
        
        <div class="jo_run-input-error" class="jo_rix"></div>
    </div>
    </div>
    </div> 
    <div class="jo_run-inner">
    <div class="jo_graphics"></div>
    <div class="jo_output jo_scrollable"></div>
    </div>
    
    </div>
    
    `);
        if (!this.config.hideEditor) {
            let $tabheadings = jQuery('<div class="jo_tabheadings"></div>');
            $tabheadings.css('position', 'relative');
            let $thRun = jQuery('<div class="jo_tabheading jo_active" data-target="jo_run" style="line-height: 24px">Ausgabe</div>');
            let $thVariables = jQuery('<div class="jo_tabheading jo_console-tab" data-target="jo_variablesTab" style="line-height: 24px">Variablen</div>');
            $tabheadings.append($thRun, $thVariables);
            this.$rightDivInner.append($tabheadings);
            let $vd = jQuery('<div class="jo_scrollable jo_editorFontSize jo_variablesTab"></div>');
            let $alternativeText = jQuery(`
            <div class="jo_alternativeText jo_scrollable">
            <div style="font-weight: bold">Tipp:</div>
            Die Variablen sind nur dann sichtbar, wenn das Programm
            <ul>
            <li>im Einzelschrittmodus ausgeführt wird(Klick auf <span class="img_step-over-dark jo_inline-image"></span>),</li>
            <li>an einem Breakpoint hält (Setzen eines Breakpoints mit Mausklick links neben den Zeilennummern und anschließendes Starten des Programms mit 
                <span class="img_start-dark jo_inline-image"></span>) oder </li>
                <li>in sehr niedriger Geschwindigkeit ausgeführt wird (weniger als 10 Schritte/s).
                </ul>
                </div>
                `);
            $vd.append(this.$debuggerDiv, $alternativeText);
            let $tabs = jQuery('<div class="jo_tabs jo_scrollable"></div>');
            $tabs.append(this.$runDiv, $vd);
            this.$rightDivInner.append($tabs);
            makeTabs($rightDiv);
        }
        else {
            this.$rightDivInner.append(this.$runDiv);
        }
        return $rightDiv;
    }
    getSemicolonAngel() {
        return this.semicolonAngel;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbkVtYmVkZGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudC9lbWJlZGRlZC9NYWluRW1iZWRkZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsTUFBTSxFQUEyQixNQUFNLDhCQUE4QixDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDL0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRW5ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsWUFBWSxFQUFXLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBa0J0RSxNQUFNLE9BQU8sWUFBWTtJQXNGckIsWUFBWSxJQUF5QixFQUFVLFVBQXNCO1FBQXRCLGVBQVUsR0FBVixVQUFV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LEtBQUssQ0FBQyxDQUFDO1lBQ2xDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUN2QjthQUFNO1lBQ0gsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQzVDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDckIsQ0FBQztJQUVELGlCQUFpQjtRQUNiLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUMvQixDQUFDO0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21waWxlciwgQ29tcGlsZXJTdGF0dXMgfSBmcm9tIFwiLi4vY29tcGlsZXIvQ29tcGlsZXIuanNcIjtcclxuaW1wb3J0IHsgTW9kdWxlLCBGaWxlLCBFeHBvcnRlZFdvcmtzcGFjZSB9IGZyb20gXCIuLi9jb21waWxlci9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IERlYnVnZ2VyIH0gZnJvbSBcIi4uL2ludGVycHJldGVyL0RlYnVnZ2VyLmpzXCI7XHJcbmltcG9ydCB7IEludGVycHJldGVyLCBJbnRlcnByZXRlclN0YXRlIH0gZnJvbSBcIi4uL2ludGVycHJldGVyL0ludGVycHJldGVyLmpzXCI7XHJcbmltcG9ydCB7IEFjdGlvbk1hbmFnZXIgfSBmcm9tIFwiLi4vbWFpbi9ndWkvQWN0aW9uTWFuYWdlci5qc1wiO1xyXG5pbXBvcnQgeyBCb3R0b21EaXYgfSBmcm9tIFwiLi4vbWFpbi9ndWkvQm90dG9tRGl2LmpzXCI7XHJcbmltcG9ydCB7IEVkaXRvciB9IGZyb20gXCIuLi9tYWluL2d1aS9FZGl0b3IuanNcIjtcclxuaW1wb3J0IHsgUHJvZ3JhbUNvbnRyb2xCdXR0b25zIH0gZnJvbSBcIi4uL21haW4vZ3VpL1Byb2dyYW1Db250cm9sQnV0dG9ucy5qc1wiO1xyXG5pbXBvcnQgeyBSaWdodERpdiB9IGZyb20gXCIuLi9tYWluL2d1aS9SaWdodERpdi5qc1wiO1xyXG5pbXBvcnQgeyBNYWluQmFzZSB9IGZyb20gXCIuLi9tYWluL01haW5CYXNlLmpzXCI7XHJcbmltcG9ydCB7IFdvcmtzcGFjZSB9IGZyb20gXCIuLi93b3Jrc3BhY2UvV29ya3NwYWNlLmpzXCI7XHJcbmltcG9ydCB7IEpPU2NyaXB0IH0gZnJvbSBcIi4vRW1iZWRkZWRTdGFydGVyLmpzXCI7XHJcbmltcG9ydCB7IGRvd25sb2FkRmlsZSwgbWFrZURpdiwgbWFrZVRhYnMsIG9wZW5Db250ZXh0TWVudSB9IGZyb20gXCIuLi90b29scy9IdG1sVG9vbHMuanNcIjtcclxuaW1wb3J0IHsgRW1iZWRkZWRTbGlkZXIgfSBmcm9tIFwiLi9FbWJlZGRlZFNsaWRlci5qc1wiO1xyXG5pbXBvcnQgeyBFbWJlZGRlZEZpbGVFeHBsb3JlciB9IGZyb20gXCIuL0VtYmVkZGVkRmlsZUV4cGxvcmVyLmpzXCI7XHJcbmltcG9ydCB7IFRleHRQb3NpdGlvbiB9IGZyb20gXCIuLi9jb21waWxlci9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBFbWJlZGRlZEluZGV4ZWREQiB9IGZyb20gXCIuL0VtYmVkZGVkSW5kZXhlZERCLmpzXCI7XHJcbmltcG9ydCB7IFNlbWljb2xvbkFuZ2VsIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3BhcnNlci9TZW1pY29sb25BbmdlbC5qc1wiO1xyXG5pbXBvcnQgeyBUZXh0UG9zaXRpb25XaXRoTW9kdWxlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL1R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEhpdFBvbHlnb25TdG9yZSB9IGZyb20gXCIuLi9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9Qb2x5Z29uU3RvcmUuanNcIjtcclxuXHJcbnR5cGUgSmF2YU9ubGluZUNvbmZpZyA9IHtcclxuICAgIHdpdGhGaWxlTGlzdD86IGJvb2xlYW4sXHJcbiAgICB3aXRoUENvZGU/OiBib29sZWFuLFxyXG4gICAgd2l0aENvbnNvbGU/OiBib29sZWFuLFxyXG4gICAgd2l0aEVycm9yTGlzdD86IGJvb2xlYW4sXHJcbiAgICB3aXRoQm90dG9tUGFuZWw/OiBib29sZWFuLFxyXG4gICAgc3BlZWQ/OiBudW1iZXIgfCBcIm1heFwiLFxyXG4gICAgaWQ/OiBzdHJpbmcsXHJcbiAgICBoaWRlU3RhcnRQYW5lbD86IGJvb2xlYW4sXHJcbiAgICBoaWRlRWRpdG9yPzogYm9vbGVhbixcclxuICAgIGxpYnJhcmllcz86IHN0cmluZ1tdLFxyXG4gICAganNvbkZpbGVuYW1lPzogc3RyaW5nXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYWluRW1iZWRkZWQgaW1wbGVtZW50cyBNYWluQmFzZSB7XHJcblxyXG4gICAgcGl4aUFwcDogUElYSS5BcHBsaWNhdGlvbjtcclxuXHJcbiAgICBpc0VtYmVkZGVkKCk6IGJvb2xlYW4geyByZXR1cm4gdHJ1ZTsgfVxyXG5cclxuICAgIGp1bXBUb0RlY2xhcmF0aW9uKG1vZHVsZTogTW9kdWxlLCBkZWNsYXJhdGlvbjogVGV4dFBvc2l0aW9uV2l0aE1vZHVsZSkgeyB9O1xyXG5cclxuICAgIGdldENvbXBpbGVyKCk6IENvbXBpbGVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlcjtcclxuICAgIH1cclxuICAgIGdldEludGVycHJldGVyKCk6IEludGVycHJldGVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5pbnRlcnByZXRlcjtcclxuICAgIH1cclxuICAgIGdldEN1cnJlbnRXb3Jrc3BhY2UoKTogV29ya3NwYWNlIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50V29ya3NwYWNlO1xyXG4gICAgfVxyXG4gICAgZ2V0RGVidWdnZXIoKTogRGVidWdnZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRlYnVnZ2VyO1xyXG4gICAgfVxyXG4gICAgZ2V0TW9uYWNvRWRpdG9yKCk6IG1vbmFjby5lZGl0b3IuSVN0YW5kYWxvbmVDb2RlRWRpdG9yIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5lZGl0b3IuZWRpdG9yO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFJpZ2h0RGl2KCk6IFJpZ2h0RGl2IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5yaWdodERpdjtcclxuICAgIH1cclxuXHJcbiAgICBnZXRCb3R0b21EaXYoKTogQm90dG9tRGl2IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ib3R0b21EaXY7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0QWN0aW9uTWFuYWdlcigpOiBBY3Rpb25NYW5hZ2VyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hY3Rpb25NYW5hZ2VyO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpOiBNb2R1bGUge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoRmlsZUxpc3QpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmlsZUV4cGxvcmVyLmN1cnJlbnRGaWxlPy5tb2R1bGU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5nZXRGaXJzdE1vZHVsZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25maWc6IEphdmFPbmxpbmVDb25maWc7XHJcblxyXG4gICAgZWRpdG9yOiBFZGl0b3I7XHJcbiAgICBwcm9ncmFtUG9pbnRlckRlY29yYXRpb246IHN0cmluZ1tdID0gW107XHJcbiAgICBwcm9ncmFtUG9pbnRlck1vZHVsZTogTW9kdWxlO1xyXG5cclxuICAgIGN1cnJlbnRXb3Jrc3BhY2U6IFdvcmtzcGFjZTtcclxuICAgIGFjdGlvbk1hbmFnZXI6IEFjdGlvbk1hbmFnZXI7XHJcblxyXG4gICAgY29tcGlsZXI6IENvbXBpbGVyO1xyXG5cclxuICAgIGludGVycHJldGVyOiBJbnRlcnByZXRlcjtcclxuICAgICRydW5EaXY6IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcblxyXG4gICAgZGVidWdnZXI6IERlYnVnZ2VyO1xyXG4gICAgJGRlYnVnZ2VyRGl2OiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG5cclxuICAgIGJvdHRvbURpdjogQm90dG9tRGl2O1xyXG4gICAgJGZpbGVzTGlzdERpdjogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuXHJcbiAgICAkaGludERpdjogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuICAgICRtb25hY29EaXY6IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcbiAgICAkcmVzZXRCdXR0b246IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcblxyXG4gICAgcHJvZ3JhbUlzRXhlY3V0YWJsZSA9IGZhbHNlO1xyXG4gICAgdmVyc2lvbjogbnVtYmVyID0gMDtcclxuXHJcbiAgICB0aW1lckhhbmRsZTogYW55O1xyXG5cclxuICAgIHJpZ2h0RGl2OiBSaWdodERpdjtcclxuICAgICRyaWdodERpdklubmVyOiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG5cclxuICAgIGZpbGVFeHBsb3JlcjogRW1iZWRkZWRGaWxlRXhwbG9yZXI7XHJcblxyXG4gICAgZGVib3VuY2VEaWFncmFtRHJhd2luZzogYW55O1xyXG5cclxuICAgIGluZGV4ZWREQjogRW1iZWRkZWRJbmRleGVkREI7XHJcblxyXG4gICAgY29tcGlsZVJ1bnNBZnRlckNvZGVSZXNldDogbnVtYmVyID0gMDtcclxuXHJcbiAgICBzZW1pY29sb25BbmdlbDogU2VtaWNvbG9uQW5nZWw7XHJcblxyXG4gICAgY29uc3RydWN0b3IoJGRpdjogSlF1ZXJ5PEhUTUxFbGVtZW50PiwgcHJpdmF0ZSBzY3JpcHRMaXN0OiBKT1NjcmlwdFtdKSB7XHJcblxyXG4gICAgICAgIHRoaXMucmVhZENvbmZpZygkZGl2KTtcclxuXHJcbiAgICAgICAgdGhpcy5pbml0R1VJKCRkaXYpO1xyXG5cclxuICAgICAgICB0aGlzLmluaXRTY3JpcHRzKCk7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jb25maWcuaGlkZVN0YXJ0UGFuZWwpIHtcclxuICAgICAgICAgICAgdGhpcy5pbmRleGVkREIgPSBuZXcgRW1iZWRkZWRJbmRleGVkREIoKTtcclxuICAgICAgICAgICAgdGhpcy5pbmRleGVkREIub3BlbigoKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmlkICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlYWRTY3JpcHRzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2VtaWNvbG9uQW5nZWwgPSBuZXcgU2VtaWNvbG9uQW5nZWwodGhpcyk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGluaXRTY3JpcHRzKCkge1xyXG5cclxuICAgICAgICB0aGlzLmZpbGVFeHBsb3Jlcj8ucmVtb3ZlQWxsRmlsZXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5pbml0V29ya3NwYWNlKHRoaXMuc2NyaXB0TGlzdCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoRmlsZUxpc3QpIHtcclxuICAgICAgICAgICAgdGhpcy5maWxlRXhwbG9yZXIgPSBuZXcgRW1iZWRkZWRGaWxlRXhwbG9yZXIodGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLCB0aGlzLiRmaWxlc0xpc3REaXYsIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLmZpbGVFeHBsb3Jlci5zZXRGaXJzdEZpbGVBY3RpdmUoKTtcclxuICAgICAgICAgICAgdGhpcy5zY3JpcHRMaXN0LmZpbHRlcigoc2NyaXB0KSA9PiBzY3JpcHQudHlwZSA9PSBcImhpbnRcIikuZm9yRWFjaCgoc2NyaXB0KSA9PiB0aGlzLmZpbGVFeHBsb3Jlci5hZGRIaW50KHNjcmlwdCkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TW9kdWxlQWN0aXZlKHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5nZXRGaXJzdE1vZHVsZSgpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICByZWFkQ29uZmlnKCRkaXY6IEpRdWVyeTxIVE1MRWxlbWVudD4pIHtcclxuICAgICAgICBsZXQgY29uZmlnSnNvbjogc3RyaW5nIHwgb2JqZWN0ID0gJGRpdi5kYXRhKFwiamF2YS1vbmxpbmVcIik7XHJcbiAgICAgICAgaWYgKGNvbmZpZ0pzb24gIT0gbnVsbCAmJiB0eXBlb2YgY29uZmlnSnNvbiA9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnID0gSlNPTi5wYXJzZShjb25maWdKc29uLnNwbGl0KFwiJ1wiKS5qb2luKCdcIicpKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNvbmZpZyA9IHt9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcuaGlkZUVkaXRvciA9PSBudWxsKSB0aGlzLmNvbmZpZy5oaWRlRWRpdG9yID0gZmFsc2U7XHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmhpZGVTdGFydFBhbmVsID09IG51bGwpIHRoaXMuY29uZmlnLmhpZGVTdGFydFBhbmVsID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoQm90dG9tUGFuZWwgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbmZpZy53aXRoQm90dG9tUGFuZWwgPSB0aGlzLmNvbmZpZy53aXRoQ29uc29sZSB8fCB0aGlzLmNvbmZpZy53aXRoUENvZGUgfHwgdGhpcy5jb25maWcud2l0aEZpbGVMaXN0IHx8IHRoaXMuY29uZmlnLndpdGhFcnJvckxpc3Q7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcuaGlkZUVkaXRvcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbmZpZy53aXRoQm90dG9tUGFuZWwgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5jb25maWcud2l0aEZpbGVMaXN0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLndpdGhDb25zb2xlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLndpdGhQQ29kZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmNvbmZpZy53aXRoRXJyb3JMaXN0ID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcud2l0aEJvdHRvbVBhbmVsKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoRmlsZUxpc3QgPT0gbnVsbCkgdGhpcy5jb25maWcud2l0aEZpbGVMaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhQQ29kZSA9PSBudWxsKSB0aGlzLmNvbmZpZy53aXRoUENvZGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcud2l0aENvbnNvbGUgPT0gbnVsbCkgdGhpcy5jb25maWcud2l0aENvbnNvbGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcud2l0aEVycm9yTGlzdCA9PSBudWxsKSB0aGlzLmNvbmZpZy53aXRoRXJyb3JMaXN0ID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5zcGVlZCA9PSBudWxsKSB0aGlzLmNvbmZpZy5zcGVlZCA9IDk7XHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmxpYnJhcmllcyA9PSBudWxsKSB0aGlzLmNvbmZpZy5saWJyYXJpZXMgPSBbXTtcclxuICAgICAgICBpZih0aGlzLmNvbmZpZy5qc29uRmlsZW5hbWUgPT0gbnVsbCkgdGhpcy5jb25maWcuanNvbkZpbGVuYW1lID0gXCJ3b3Jrc3BhY2UuanNvblwiO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRNb2R1bGVBY3RpdmUobW9kdWxlOiBNb2R1bGUpIHtcclxuXHJcbiAgICAgICAgaWYobW9kdWxlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhGaWxlTGlzdCAmJiB0aGlzLmZpbGVFeHBsb3Jlci5jdXJyZW50RmlsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsZUV4cGxvcmVyLmN1cnJlbnRGaWxlLm1vZHVsZS5lZGl0b3JTdGF0ZSA9IHRoaXMuZ2V0TW9uYWNvRWRpdG9yKCkuc2F2ZVZpZXdTdGF0ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhGaWxlTGlzdCkge1xyXG4gICAgICAgICAgICB0aGlzLmZpbGVFeHBsb3Jlci5tYXJrRmlsZShtb2R1bGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogV0lDSFRJRzogRGllIFJlaWhlbmZvbGdlIGRlciBiZWlkZW4gT3BlcmF0aW9uZW4gaXN0IGV4dHJlbSB3aWNodGlnLlxyXG4gICAgICAgICAqIEZhbGxzIGRhcyBNb2RlbCBpbSByZWFkb25seS1adXN0YW5kIGdlc2V0enQgd2lyZCwgZnVua3Rpb25pZXJ0IDxTdHJnICsgLj4gXHJcbiAgICAgICAgICogbmljaHQgdW5kIGRpZSBMaWdodGJ1bGJzIHdlcmRlbiBuaWNodCBhbmdlemVpZ3QsIHNlbGJzdCBkYW5uLCB3ZW5uXHJcbiAgICAgICAgICogc3DDpHRlciByZWFkb25seSA9IGZhbHNlIGdlc2V0enQgd2lyZC5cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmdldE1vbmFjb0VkaXRvcigpLnVwZGF0ZU9wdGlvbnMoe1xyXG4gICAgICAgICAgICByZWFkT25seTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbmVOdW1iZXJzTWluQ2hhcnM6IDRcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLmVkaXRvci5lZGl0b3Iuc2V0TW9kZWwobW9kdWxlLm1vZGVsKTtcclxuXHJcblxyXG4gICAgICAgIGlmIChtb2R1bGUuZWRpdG9yU3RhdGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmdldE1vbmFjb0VkaXRvcigpLnJlc3RvcmVWaWV3U3RhdGUobW9kdWxlLmVkaXRvclN0YXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vZHVsZS5yZW5kZXJCcmVha3BvaW50RGVjb3JhdG9ycygpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBlcmFzZURva3V3aWtpU2VhcmNoTWFya3VwKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZSgvPHNwYW4gY2xhc3M9XCJzZWFyY2hcXHdoaXRcIj4oLio/KTxcXC9zcGFuPi9nLCBcIiQxXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHJlYWRTY3JpcHRzKCkge1xyXG5cclxuICAgICAgICBsZXQgbW9kdWxlcyA9IHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKTtcclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICB0aGlzLmluZGV4ZWREQi5nZXRTY3JpcHQodGhpcy5jb25maWcuaWQsIChzY3JpcHRMaXN0SlNvbikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoc2NyaXB0TGlzdEpTb24gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuc2F2ZVNjcmlwdHMoKTtcclxuICAgICAgICAgICAgICAgIH0sIDEwMDApO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBzY3JpcHRMaXN0OiBzdHJpbmdbXSA9IEpTT04ucGFyc2Uoc2NyaXB0TGlzdEpTb24pO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvdW50RG93biA9IHNjcmlwdExpc3QubGVuZ3RoO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IG1vZHVsZSBvZiBtb2R1bGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5maWxlRXhwbG9yZXI/LnJlbW92ZU1vZHVsZShtb2R1bGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQucmVtb3ZlTW9kdWxlKG1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbmFtZSBvZiBzY3JpcHRMaXN0KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzY3JpcHRJZCA9IHRoaXMuY29uZmlnLmlkICsgbmFtZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGV4ZWREQi5nZXRTY3JpcHQoc2NyaXB0SWQsIChzY3JpcHQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcmlwdCAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyaXB0ID0gdGhpcy5lcmFzZURva3V3aWtpU2VhcmNoTWFya3VwKHNjcmlwdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1vZHVsZSA9IHRoYXQuYWRkTW9kdWxlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogbmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBzY3JpcHQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJqYXZhXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZmlsZUV4cGxvcmVyPy5hZGRNb2R1bGUobW9kdWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuJHJlc2V0QnV0dG9uLmZhZGVJbigxMDAwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlJldHJpZXZpbmcgc2NyaXB0IFwiICsgc2NyaXB0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50RG93bi0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY291bnREb3duID09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNhdmVTY3JpcHRzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZmlsZUV4cGxvcmVyPy5zZXRGaXJzdEZpbGVBY3RpdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LmZpbGVFeHBsb3JlciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1vZHVsZXMgPSB0aGF0LmN1cnJlbnRXb3Jrc3BhY2UubW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1vZHVsZXMubGVuZ3RoID4gMCkgdGhhdC5zZXRNb2R1bGVBY3RpdmUobW9kdWxlc1swXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2F2ZVNjcmlwdHMoKSB7XHJcblxyXG4gICAgICAgIGxldCBtb2R1bGVzID0gdGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpO1xyXG5cclxuICAgICAgICBsZXQgc2NyaXB0TGlzdDogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBsZXQgb25lTm90U2F2ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgbW9kdWxlcy5mb3JFYWNoKG0gPT4gb25lTm90U2F2ZWQgPSBvbmVOb3RTYXZlZCB8fCAhbS5maWxlLnNhdmVkKTtcclxuXHJcbiAgICAgICAgaWYgKG9uZU5vdFNhdmVkKSB7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBtb2R1bGUgb2YgbW9kdWxlcykge1xyXG4gICAgICAgICAgICAgICAgc2NyaXB0TGlzdC5wdXNoKG1vZHVsZS5maWxlLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNjcmlwdElkID0gdGhpcy5jb25maWcuaWQgKyBtb2R1bGUuZmlsZS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleGVkREIud3JpdGVTY3JpcHQoc2NyaXB0SWQsIG1vZHVsZS5nZXRQcm9ncmFtVGV4dEZyb21Nb25hY29Nb2RlbCgpKTtcclxuICAgICAgICAgICAgICAgIG1vZHVsZS5maWxlLnNhdmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiU2F2aW5nIHNjcmlwdCBcIiArIHNjcmlwdElkKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5pbmRleGVkREIud3JpdGVTY3JpcHQodGhpcy5jb25maWcuaWQsIEpTT04uc3RyaW5naWZ5KHNjcmlwdExpc3QpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGRlbGV0ZVNjcmlwdHNJbkRCKCkge1xyXG4gICAgICAgIHRoaXMuaW5kZXhlZERCLmdldFNjcmlwdCh0aGlzLmNvbmZpZy5pZCwgKHNjcmlwdExpc3RKU29uKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChzY3JpcHRMaXN0SlNvbiA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHNjcmlwdExpc3Q6IHN0cmluZ1tdID0gSlNPTi5wYXJzZShzY3JpcHRMaXN0SlNvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbmFtZSBvZiBzY3JpcHRMaXN0KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzY3JpcHRJZCA9IHRoaXMuY29uZmlnLmlkICsgbmFtZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGV4ZWREQi5yZW1vdmVTY3JpcHQoc2NyaXB0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXhlZERCLnJlbW92ZVNjcmlwdCh0aGlzLmNvbmZpZy5pZCk7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaW5pdFdvcmtzcGFjZShzY3JpcHRMaXN0OiBKT1NjcmlwdFtdKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50V29ya3NwYWNlID0gbmV3IFdvcmtzcGFjZShcIkVtYmVkZGVkLVdvcmtzcGFjZVwiLCB0aGlzLCAwKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRXb3Jrc3BhY2Uuc2V0dGluZ3MubGlicmFyaWVzID0gdGhpcy5jb25maWcubGlicmFyaWVzO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFdvcmtzcGFjZS5hbHRlckFkZGl0aW9uYWxMaWJyYXJpZXMoKTtcclxuXHJcbiAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgIGZvciAobGV0IHNjcmlwdCBvZiBzY3JpcHRMaXN0KSB7XHJcbiAgICAgICAgICAgIGlmIChzY3JpcHQudHlwZSA9PSBcImphdmFcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRNb2R1bGUoc2NyaXB0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGFkZE1vZHVsZShzY3JpcHQ6IEpPU2NyaXB0KTogTW9kdWxlIHtcclxuICAgICAgICBsZXQgbW9kdWxlOiBNb2R1bGUgPSBNb2R1bGUucmVzdG9yZUZyb21EYXRhKHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKHRydWUpLmxlbmd0aCxcclxuICAgICAgICAgICAgbmFtZTogc2NyaXB0LnRpdGxlLFxyXG4gICAgICAgICAgICB0ZXh0OiBzY3JpcHQudGV4dCxcclxuICAgICAgICAgICAgdGV4dF9iZWZvcmVfcmV2aXNpb246IG51bGwsXHJcbiAgICAgICAgICAgIHN1Ym1pdHRlZF9kYXRlOiBudWxsLFxyXG4gICAgICAgICAgICBzdHVkZW50X2VkaXRlZF9hZnRlcl9yZXZpc2lvbjogZmFsc2UsXHJcbiAgICAgICAgICAgIHZlcnNpb246IDEsXHJcbiAgICAgICAgICAgIHdvcmtzcGFjZV9pZDogMCxcclxuICAgICAgICAgICAgZm9yY2VVcGRhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBpZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uOiBmYWxzZSxcclxuICAgICAgICAgICAgZmlsZV90eXBlOiAwXHJcbiAgICAgICAgfSwgdGhpcyk7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5wdXRNb2R1bGUobW9kdWxlKTtcclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICBtb2R1bGUubW9kZWwub25EaWRDaGFuZ2VDb250ZW50KCgpID0+IHtcclxuICAgICAgICAgICAgdGhhdC5jb25zaWRlclNob3dpbmdDb2RlUmVzZXRCdXR0b24oKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG1vZHVsZTtcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmVNb2R1bGUobW9kdWxlOiBNb2R1bGUpIHtcclxuICAgICAgICB0aGlzLmN1cnJlbnRXb3Jrc3BhY2UubW9kdWxlU3RvcmUucmVtb3ZlTW9kdWxlKG1vZHVsZSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGluaXRHVUkoJGRpdjogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG5cclxuICAgICAgICAvLyBsZXQgJGxlZnREaXYgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfbGVmdERpdlwiPjwvZGl2PicpO1xyXG5cclxuICAgICAgICAkZGl2LmNzcyh7XHJcbiAgICAgICAgICAgIFwiYmFja2dyb3VuZC1pbWFnZVwiOiBcIm5vbmVcIixcclxuICAgICAgICAgICAgXCJiYWNrZ3JvdW5kLXNpemVcIjogXCIxMDAlXCJcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBsZXQgJGNlbnRlckRpdiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvZV9jZW50ZXJEaXZcIj48L2Rpdj4nKTtcclxuICAgICAgICBsZXQgJHJlc2V0TW9kYWxXaW5kb3cgPSB0aGlzLm1ha2VDb2RlUmVzZXRNb2RhbFdpbmRvdygkZGl2KTtcclxuXHJcbiAgICAgICAgbGV0ICRyaWdodERpdiA9IHRoaXMubWFrZVJpZ2h0RGl2KCk7XHJcblxyXG4gICAgICAgIGxldCAkZWRpdG9yRGl2ID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX2VkaXRvckRpdlwiPjwvZGl2PicpO1xyXG4gICAgICAgIHRoaXMuJG1vbmFjb0RpdiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvZV9tb25hY29EaXZcIj48L2Rpdj4nKTtcclxuICAgICAgICB0aGlzLiRoaW50RGl2ID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX2hpbnREaXYgam9fc2Nyb2xsYWJsZVwiPjwvZGl2PicpO1xyXG4gICAgICAgIHRoaXMuJHJlc2V0QnV0dG9uID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX3Jlc2V0QnV0dG9uIGpvX2J1dHRvbiBqb19hY3RpdmVcIiB0aXRsZT1cIkNvZGUgYXVmIEF1c2dhbmdzenVzdGFuZCB6dXLDvGNrc2V0emVuXCI+Q29kZSBSZXNldDwvZGl2PicpO1xyXG5cclxuICAgICAgICAkZWRpdG9yRGl2LmFwcGVuZCh0aGlzLiRtb25hY29EaXYsIHRoaXMuJGhpbnREaXYsIHRoaXMuJHJlc2V0QnV0dG9uKTtcclxuXHJcbiAgICAgICAgbGV0ICRicmFja2V0RXJyb3JEaXYgPSB0aGlzLm1ha2VCcmFja2V0RXJyb3JEaXYoKTtcclxuICAgICAgICAkZWRpdG9yRGl2LmFwcGVuZCgkYnJhY2tldEVycm9yRGl2KTtcclxuXHJcbiAgICAgICAgdGhpcy4kcmVzZXRCdXR0b24uaGlkZSgpO1xyXG5cclxuICAgICAgICB0aGlzLiRyZXNldEJ1dHRvbi5vbihcImNsaWNrXCIsICgpID0+IHsgJHJlc2V0TW9kYWxXaW5kb3cuc2hvdygpOyB9KVxyXG5cclxuICAgICAgICB0aGlzLiRoaW50RGl2LmhpZGUoKTtcclxuXHJcbiAgICAgICAgbGV0ICRjb250cm9sc0RpdiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvZV9jb250cm9sc0RpdlwiPjwvZGl2PicpO1xyXG4gICAgICAgIGxldCAkYm90dG9tRGl2SW5uZXIgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfYm90dG9tRGl2SW5uZXJcIj48L2Rpdj4nKTtcclxuXHJcbiAgICAgICAgbGV0ICRidXR0b25PcGVuID0galF1ZXJ5KCc8bGFiZWwgdHlwZT1cImZpbGVcIiBjbGFzcz1cImltZ19vcGVuLWZpbGUgam9fYnV0dG9uIGpvX2FjdGl2ZVwiJyArXHJcbiAgICAgICAgICAgICdzdHlsZT1cIm1hcmdpbi1yaWdodDogOHB4O1wiIHRpdGxlPVwiV29ya3NwYWNlIGF1cyBEYXRlaSBsYWRlblwiPjxpbnB1dCB0eXBlPVwiZmlsZVwiIHN0eWxlPVwiZGlzcGxheTpub25lXCI+PC9sYWJlbD4nKTtcclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICAkYnV0dG9uT3Blbi5maW5kKCdpbnB1dCcpLm9uKCdjaGFuZ2UnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIHZhciBmaWxlczogRmlsZUxpc3QgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRhcmdldC5maWxlcztcclxuICAgICAgICAgICAgdGhhdC5sb2FkV29ya3NwYWNlRnJvbUZpbGUoZmlsZXNbMF0pO1xyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGxldCAkYnV0dG9uU2F2ZSA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImltZ19zYXZlLWRhcmsgam9fYnV0dG9uIGpvX2FjdGl2ZVwiJyArXHJcbiAgICAgICAgICAgICdzdHlsZT1cIm1hcmdpbi1yaWdodDogOHB4O1wiIHRpdGxlPVwiV29ya3NwYWNlIGluIERhdGVpIHNwZWljaGVyblwiPjwvZGl2PicpO1xyXG5cclxuXHJcbiAgICAgICAgJGJ1dHRvblNhdmUub24oJ2NsaWNrJywgKCkgPT4geyB0aGF0LnNhdmVXb3Jrc3BhY2VUb0ZpbGUoKSB9KTtcclxuXHJcbiAgICAgICAgJGNvbnRyb2xzRGl2LmFwcGVuZCgkYnV0dG9uT3BlbiwgJGJ1dHRvblNhdmUpO1xyXG5cclxuXHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoQm90dG9tUGFuZWwpIHtcclxuICAgICAgICAgICAgbGV0ICRib3R0b21EaXYgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfYm90dG9tRGl2XCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgICAgIHRoaXMubWFrZUJvdHRvbURpdigkYm90dG9tRGl2SW5uZXIsICRjb250cm9sc0Rpdik7XHJcbiAgICAgICAgICAgICRib3R0b21EaXYuYXBwZW5kKCRib3R0b21EaXZJbm5lcik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoRmlsZUxpc3QpIHtcclxuICAgICAgICAgICAgICAgIGxldCAkZmlsZXNEaXYgPSB0aGlzLm1ha2VGaWxlc0RpdigpO1xyXG4gICAgICAgICAgICAgICAgJGJvdHRvbURpdi5wcmVwZW5kKCRmaWxlc0Rpdik7XHJcbiAgICAgICAgICAgICAgICBuZXcgRW1iZWRkZWRTbGlkZXIoJGZpbGVzRGl2LCBmYWxzZSwgZmFsc2UsICgpID0+IHsgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbWFrZVRhYnMoJGJvdHRvbURpdklubmVyKTtcclxuXHJcblxyXG4gICAgICAgICAgICAkY2VudGVyRGl2LmFwcGVuZCgkZWRpdG9yRGl2LCAkYm90dG9tRGl2KTtcclxuICAgICAgICAgICAgbmV3IEVtYmVkZGVkU2xpZGVyKCRib3R0b21EaXYsIHRydWUsIHRydWUsICgpID0+IHsgdGhpcy5lZGl0b3IuZWRpdG9yLmxheW91dCgpOyB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAkY2VudGVyRGl2LnByZXBlbmQoJGVkaXRvckRpdik7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLndpdGhCb3R0b21QYW5lbCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuaGlkZUVkaXRvcikge1xyXG4gICAgICAgICAgICAgICAgJHJpZ2h0RGl2LnByZXBlbmQoJGNvbnRyb2xzRGl2KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICRjZW50ZXJEaXYucHJlcGVuZCgkY29udHJvbHNEaXYpO1xyXG4gICAgICAgICAgICAgICAgJGNvbnRyb2xzRGl2LmFkZENsYXNzKCdqb2VfY29udHJvbFBhbmVsX3RvcCcpO1xyXG4gICAgICAgICAgICAgICAgJGVkaXRvckRpdi5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICdwb3NpdGlvbic6ICdyZWxhdGl2ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2hlaWdodCc6ICcxcHgnXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgJGRpdi5hZGRDbGFzcygnam9lX2phdmFPbmxpbmVEaXYnKTtcclxuICAgICAgICAkZGl2LmFwcGVuZCgkY2VudGVyRGl2LCAkcmlnaHREaXYpO1xyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLmhpZGVFZGl0b3IpIHtcclxuICAgICAgICAgICAgbmV3IEVtYmVkZGVkU2xpZGVyKCRyaWdodERpdiwgdHJ1ZSwgZmFsc2UsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnLmpvX2dyYXBoaWNzJykudHJpZ2dlcignc2l6ZUNoYW5nZWQnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZWRpdG9yLmVkaXRvci5sYXlvdXQoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmVkaXRvciA9IG5ldyBFZGl0b3IodGhpcywgZmFsc2UsIHRydWUpO1xyXG4gICAgICAgIHRoaXMuZWRpdG9yLmluaXRHVUkodGhpcy4kbW9uYWNvRGl2KTtcclxuICAgICAgICB0aGlzLiRtb25hY29EaXYuZmluZCgnLm1vbmFjby1lZGl0b3InKS5jc3MoJ3otaW5kZXgnLCAnMTAnKTtcclxuXHJcbiAgICAgICAgaWYgKCRkaXYuYXR0cigndGFiaW5kZXgnKSA9PSBudWxsKSAkZGl2LmF0dHIoJ3RhYmluZGV4JywgXCIwXCIpO1xyXG4gICAgICAgIHRoaXMuYWN0aW9uTWFuYWdlciA9IG5ldyBBY3Rpb25NYW5hZ2VyKCRkaXYsIHRoaXMpO1xyXG4gICAgICAgIHRoaXMuYWN0aW9uTWFuYWdlci5pbml0KCk7XHJcblxyXG4gICAgICAgIHRoaXMuYm90dG9tRGl2ID0gbmV3IEJvdHRvbURpdih0aGlzLCAkYm90dG9tRGl2SW5uZXIsICRkaXYpO1xyXG4gICAgICAgIHRoaXMuYm90dG9tRGl2LmluaXRHVUkoKTtcclxuXHJcbiAgICAgICAgdGhpcy5yaWdodERpdiA9IG5ldyBSaWdodERpdih0aGlzLCB0aGlzLiRyaWdodERpdklubmVyKTtcclxuICAgICAgICB0aGlzLnJpZ2h0RGl2LmluaXRHVUkoKTtcclxuXHJcbiAgICAgICAgbGV0ICRyaWdodFNpZGVDb250YWluZXIgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb19yaWdodGRpdi1yaWdodHNpZGUtY29udGFpbmVyXCI+Jyk7XHJcbiAgICAgICAgbGV0ICRjb29yZGluYXRlcyA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX2Nvb3JkaW5hdGVzXCI+KDAvMCk8L2Rpdj4nKTtcclxuICAgICAgICB0aGlzLiRyaWdodERpdklubmVyLmFwcGVuZCgkcmlnaHRTaWRlQ29udGFpbmVyKTtcclxuICAgICAgICAkcmlnaHRTaWRlQ29udGFpbmVyLmFwcGVuZCgkY29vcmRpbmF0ZXMpO1xyXG5cclxuICAgICAgICB0aGlzLmRlYnVnZ2VyID0gbmV3IERlYnVnZ2VyKHRoaXMsIHRoaXMuJGRlYnVnZ2VyRGl2LCBudWxsKTtcclxuXHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlciA9IG5ldyBJbnRlcnByZXRlcih0aGlzLCB0aGlzLmRlYnVnZ2VyLFxyXG4gICAgICAgICAgICBuZXcgUHJvZ3JhbUNvbnRyb2xCdXR0b25zKCRjb250cm9sc0RpdiwgJGVkaXRvckRpdiksXHJcbiAgICAgICAgICAgIHRoaXMuJHJ1bkRpdik7XHJcblxyXG4gICAgICAgIGxldCAkaW5mb0J1dHRvbiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX2J1dHRvbiBqb19hY3RpdmUgaW1nX2VsbGlwc2lzLWRhcmtcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiAxNnB4XCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgJGNvbnRyb2xzRGl2LmFwcGVuZCgkaW5mb0J1dHRvbik7XHJcblxyXG4gICAgICAgICRpbmZvQnV0dG9uLm9uKCdtb3VzZWRvd24nLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgIG9wZW5Db250ZXh0TWVudShbe1xyXG4gICAgICAgICAgICAgICAgY2FwdGlvbjogXCLDnGJlciBkaWUgT25saW5lLUlERSAuLi5cIixcclxuICAgICAgICAgICAgICAgIGxpbms6IFwiaHR0cHM6Ly93d3cub25saW5lLWlkZS5kZVwiLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBub3RoaW5nIHRvIGRvLlxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBjYXB0aW9uOiBcIlp1bSBPcmlnaW5hbC1SZXBvXCIsXHJcbiAgICAgICAgICAgICAgICBsaW5rOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9tYXJ0aW4tcGFic3QvT25saW5lLUlERVwiLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBub3RoaW5nIHRvIGRvLlxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBjYXB0aW9uOiBcIlp1bSBGb3JrIHZvbiBASW5mb3JtYS1UaWdlclwiLFxyXG4gICAgICAgICAgICAgICAgbGluazogXCJodHRwczovL2dpdGh1Yi5jb20vSW5mb3JtYS1UaWdlci9PbmxpbmUtSURFXCIsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIG5vdGhpbmcgdG8gZG8uXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1dLCBldi5wYWdlWCArIDIsIGV2LnBhZ2VZICsgMik7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLmluaXRHVUkoKTtcclxuICAgICAgICAgICAgdGhpcy5lZGl0b3IuZWRpdG9yLmxheW91dCgpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbXBpbGVyID0gbmV3IENvbXBpbGVyKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLmNvbnRyb2xCdXR0b25zLnNwZWVkQ29udHJvbC5zZXRTcGVlZEluU3RlcHNQZXJTZWNvbmQodGhpcy5jb25maWcuc3BlZWQpO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXJ0VGltZXIoKTtcclxuICAgICAgICB9LCAyMDApO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcuaGlkZUVkaXRvcikge1xyXG4gICAgICAgICAgICAkY2VudGVyRGl2LmhpZGUoKTtcclxuICAgICAgICAgICAgJHJpZ2h0RGl2LmNzcyhcImZsZXhcIiwgXCIxXCIpO1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29uZmlnLmhpZGVTdGFydFBhbmVsKSB7XHJcbiAgICAgICAgICAgICAgICAkZGl2LmZpbmQoXCIuam9lX3JpZ2h0RGl2SW5uZXJcIikuY3NzKCdoZWlnaHQnLCAnY2FsYygxMDAlIC0gMjRweCknKTtcclxuICAgICAgICAgICAgICAgICRkaXYuZmluZChcIi5qb2VfY29udHJvbHNEaXZcIikuY3NzKCdwYWRkaW5nJywgJzJweCcpO1xyXG4gICAgICAgICAgICAgICAgJGRpdi5maW5kKFwiLmpvX3NwZWVkY29udHJvbC1vdXRlclwiKS5jc3MoJ3otaW5kZXgnLCAnMTAnKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICRkaXYuZmluZChcIi5qb2VfY29udHJvbHNEaXZcIikuaGlkZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgbWFrZUJyYWNrZXRFcnJvckRpdigpOiBKUXVlcnk8SFRNTEVsZW1lbnQ+IHtcclxuICAgICAgICByZXR1cm4galF1ZXJ5KGBcclxuICAgICAgICA8ZGl2IGNsYXNzPVwiam9fcGFyZW50aGVzaXNfd2FybmluZ1wiIHRpdGxlPVwiS2xhbW1lcndhcm51bmchXCIgc3R5bGU9XCJib3R0b206IDU1cHhcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiam9fd2FybmluZ19saWdodFwiPjwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJqb19wd19oZWFkaW5nXCI+eyB9PC9kaXY+XHJcbiAgICAgICAgPGRpdiB0aXRsZT1cIkxldHp0ZW4gU2Nocml0dCByw7xja2fDpG5naWdcIiBcclxuICAgICAgICAgICAgY2xhc3M9XCJqb19wd191bmRvIGltZ191bmRvIGpvX2J1dHRvbiBqb19hY3RpdmVcIj48L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICBgKTtcclxuICAgIH1cclxuXHJcbiAgICBtYWtlQ29kZVJlc2V0TW9kYWxXaW5kb3coJHBhcmVudDogSlF1ZXJ5PEhUTUxFbGVtZW50Pik6IEpRdWVyeTxIVE1MRWxlbWVudD4ge1xyXG4gICAgICAgIGxldCAkd2luZG93ID0galF1ZXJ5KFxyXG4gICAgICAgICAgICBgXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb2VfY29kZVJlc2V0TW9kYWxcIj5cclxuICAgICAgICAgICAgPGRpdiBzdHlsZT1cImZsZXg6IDFcIj48L2Rpdj5cclxuICAgICAgICAgICAgPGRpdiBzdHlsZT1cImRpc3BsYXk6IGZsZXhcIj5cclxuICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJmbGV4OiAxXCI+PC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwicGFkZGluZy1sZWZ0OiAzMHB4O1wiPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cImNvbG9yOiByZWQ7IG1hcmdpbi1ib3R0b206IDEwcHg7IGZvbnQtd2VpZ2h0OiBib2xkXCI+V2FybnVuZzo8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDxkaXY+U29sbCBkZXIgQ29kZSB3aXJrbGljaCBhdWYgZGVuIEF1c2dhbmdzenVzdGFuZCB6dXLDvGNrZ2VzZXR6dCB3ZXJkZW4/PC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8ZGl2PkFsbGUgdm9uIERpciBnZW1hY2h0ZW4gw4RuZGVydW5nZW4gd2VyZGVuIGRhbWl0IHZlcndvcmZlbi48L2Rpdj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cImZsZXg6IDFcIj48L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb2VfY29kZVJlc2V0TW9kYWxCdXR0b25zXCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb2VfY29kZVJlc2V0TW9kYWxDYW5jZWwgam9fYnV0dG9uIGpvX2FjdGl2ZVwiPkFiYnJlY2hlbjwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9lX2NvZGVSZXNldE1vZGFsT0sgam9fYnV0dG9uIGpvX2FjdGl2ZVwiPk9LPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IHN0eWxlPVwiZmxleDogMlwiPjwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICBgXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgJHdpbmRvdy5oaWRlKCk7XHJcblxyXG4gICAgICAgICRwYXJlbnQuYXBwZW5kKCR3aW5kb3cpO1xyXG5cclxuICAgICAgICBqUXVlcnkoXCIuam9lX2NvZGVSZXNldE1vZGFsQ2FuY2VsXCIpLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAkd2luZG93LmhpZGUoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgalF1ZXJ5KFwiLmpvZV9jb2RlUmVzZXRNb2RhbE9LXCIpLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgdGhpcy5pbml0U2NyaXB0cygpO1xyXG4gICAgICAgICAgICB0aGlzLmRlbGV0ZVNjcmlwdHNJbkRCKCk7XHJcblxyXG4gICAgICAgICAgICAkd2luZG93LmhpZGUoKTtcclxuICAgICAgICAgICAgdGhpcy4kcmVzZXRCdXR0b24uaGlkZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbXBpbGVSdW5zQWZ0ZXJDb2RlUmVzZXQgPSAxO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuICR3aW5kb3c7XHJcbiAgICB9XHJcblxyXG4gICAgc2hvd1Byb2dyYW1Qb2ludGVyUG9zaXRpb24oZmlsZTogRmlsZSwgcG9zaXRpb246IFRleHRQb3NpdGlvbikge1xyXG5cclxuICAgICAgICBpZiAoZmlsZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoRmlsZUxpc3QpIHtcclxuICAgICAgICAgICAgbGV0IGZpbGVEYXRhID0gdGhpcy5maWxlRXhwbG9yZXIuZmlsZXMuZmluZCgoZmlsZURhdGEpID0+IGZpbGVEYXRhLm1vZHVsZS5maWxlID09IGZpbGUpO1xyXG4gICAgICAgICAgICBpZiAoZmlsZURhdGEgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZmlsZURhdGEubW9kdWxlICE9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0TW9kdWxlQWN0aXZlKGZpbGVEYXRhLm1vZHVsZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMucHJvZ3JhbVBvaW50ZXJNb2R1bGUgPSBmaWxlRGF0YS5tb2R1bGU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9ncmFtUG9pbnRlck1vZHVsZSA9IHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5nZXRGaXJzdE1vZHVsZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHJhbmdlID0ge1xyXG4gICAgICAgICAgICBzdGFydENvbHVtbjogcG9zaXRpb24uY29sdW1uLCBzdGFydExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgIGVuZENvbHVtbjogcG9zaXRpb24uY29sdW1uICsgcG9zaXRpb24ubGVuZ3RoLCBlbmRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRNb25hY29FZGl0b3IoKS5yZXZlYWxSYW5nZUluQ2VudGVySWZPdXRzaWRlVmlld3BvcnQocmFuZ2UpO1xyXG4gICAgICAgIHRoaXMucHJvZ3JhbVBvaW50ZXJEZWNvcmF0aW9uID0gdGhpcy5nZXRNb25hY29FZGl0b3IoKS5kZWx0YURlY29yYXRpb25zKHRoaXMucHJvZ3JhbVBvaW50ZXJEZWNvcmF0aW9uLCBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJhbmdlOiByYW5nZSxcclxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IHsgY2xhc3NOYW1lOiAnam9fcmV2ZWFsUHJvZ3JhbVBvaW50ZXInLCBpc1dob2xlTGluZTogdHJ1ZSB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJhbmdlOiByYW5nZSxcclxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IHsgYmVmb3JlQ29udGVudENsYXNzTmFtZTogJ2pvX3JldmVhbFByb2dyYW1Qb2ludGVyQmVmb3JlJyB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdKTtcclxuXHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBoaWRlUHJvZ3JhbVBvaW50ZXJQb3NpdGlvbigpIHtcclxuICAgICAgICBpZiAodGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKSA9PSB0aGlzLnByb2dyYW1Qb2ludGVyTW9kdWxlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0TW9uYWNvRWRpdG9yKCkuZGVsdGFEZWNvcmF0aW9ucyh0aGlzLnByb2dyYW1Qb2ludGVyRGVjb3JhdGlvbiwgW10pO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnByb2dyYW1Qb2ludGVyTW9kdWxlID0gbnVsbDtcclxuICAgICAgICB0aGlzLnByb2dyYW1Qb2ludGVyRGVjb3JhdGlvbiA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VGaWxlc0RpdigpOiBKUXVlcnk8SFRNTEVsZW1lbnQ+IHtcclxuXHJcblxyXG4gICAgICAgIGxldCAkZmlsZXNEaXYgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfYm90dG9tRGl2RmlsZXMgam9fc2Nyb2xsYWJsZVwiPjwvZGl2PicpO1xyXG5cclxuICAgICAgICBsZXQgJGZpbGVzSGVhZGVyID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX2ZpbGVzSGVhZGVyIGpvX3RhYmhlYWRpbmcgam9fYWN0aXZlXCIgIHN0eWxlPVwibGluZS1oZWlnaHQ6IDI0cHhcIj5Qcm9ncmFtbWRhdGVpZW48L2Rpdj4nKTtcclxuXHJcbiAgICAgICAgdGhpcy4kZmlsZXNMaXN0RGl2ID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX2ZpbGVzTGlzdCBqb19zY3JvbGxhYmxlXCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgLy8gZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IDIwOyBpbmRleCsrKSB7ICAgICAgICAgICAgXHJcbiAgICAgICAgLy8gICAgIGxldCAkZmlsZSA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX2ZpbGUgam9famF2YVwiPjxkaXYgY2xhc3M9XCJqb19maWxlaW1hZ2VcIj48L2Rpdj48ZGl2IGNsYXNzPVwiam9fZmlsZW5hbWVcIj48L2Rpdj48L2Rpdj48L2Rpdj4nKTtcclxuICAgICAgICAvLyAgICAgJGZpbGVzTGlzdC5hcHBlbmQoJGZpbGUpO1xyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgJGZpbGVzRGl2LmFwcGVuZCgkZmlsZXNIZWFkZXIsIHRoaXMuJGZpbGVzTGlzdERpdik7XHJcblxyXG4gICAgICAgIHJldHVybiAkZmlsZXNEaXY7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhcnRUaW1lcigpIHtcclxuICAgICAgICBpZiAodGhpcy50aW1lckhhbmRsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lckhhbmRsZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy50aW1lckhhbmRsZSA9IHNldEludGVydmFsKCgpID0+IHtcclxuXHJcbiAgICAgICAgICAgIHRoYXQuY29tcGlsZUlmRGlydHkoKTtcclxuXHJcbiAgICAgICAgfSwgNTAwKTtcclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbXBpbGVJZkRpcnR5KCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50V29ya3NwYWNlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5pc0RpcnR5KCkgJiZcclxuICAgICAgICAgICAgdGhpcy5jb21waWxlci5jb21waWxlclN0YXR1cyAhPSBDb21waWxlclN0YXR1cy5jb21waWxpbmdcclxuICAgICAgICAgICAgJiYgdGhpcy5pbnRlcnByZXRlci5zdGF0ZSAhPSBJbnRlcnByZXRlclN0YXRlLnJ1bm5pbmdcclxuICAgICAgICAgICAgJiYgdGhpcy5pbnRlcnByZXRlci5zdGF0ZSAhPSBJbnRlcnByZXRlclN0YXRlLnBhdXNlZCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY29tcGlsZXIuY29tcGlsZSh0aGlzLmN1cnJlbnRXb3Jrc3BhY2UubW9kdWxlU3RvcmUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBlcnJvcnMgPSB0aGlzLlxyXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbURpdj8uZXJyb3JNYW5hZ2VyPy5zaG93RXJyb3JzKHRoaXMuY3VycmVudFdvcmtzcGFjZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5lZGl0b3Iub25EaWRDaGFuZ2VDdXJzb3JQb3NpdGlvbihudWxsKTsgLy8gbWFyayBvY2N1cnJlbmNpZXMgb2Ygc3ltYm9sIHVuZGVyIGN1cnNvclxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHJpbnRQcm9ncmFtKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy52ZXJzaW9uKys7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0YWJsZSA9IHRoaXMuaW50ZXJwcmV0ZXIuZ2V0U3RhcnRhYmxlTW9kdWxlKHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZSkgIT0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhcnRhYmxlICYmXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLm5vdF9pbml0aWFsaXplZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29weUV4ZWN1dGFibGVNb2R1bGVTdG9yZVRvSW50ZXJwcmV0ZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUuZG9uZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmhpZGVTdGFydFBhbmVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWN0aW9uTWFuYWdlci50cmlnZ2VyKCdpbnRlcnByZXRlci5zdGFydCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLmludGVycHJldGVyLmluaXQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXN0YXJ0YWJsZSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLmludGVycHJldGVyLnN0YXRlID09IEludGVycHJldGVyU3RhdGUuZG9uZSB8fCB0aGlzLmludGVycHJldGVyLnN0YXRlID09IEludGVycHJldGVyU3RhdGUuZXJyb3IpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLm5vdF9pbml0aWFsaXplZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5kcmF3Q2xhc3NEaWFncmFtcyghdGhpcy5yaWdodERpdi5pc0NsYXNzRGlhZ3JhbUVuYWJsZWQoKSk7XHJcblxyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21waWxlci5jb21waWxlclN0YXR1cyA9IENvbXBpbGVyU3RhdHVzLmVycm9yO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICBjb25zaWRlclNob3dpbmdDb2RlUmVzZXRCdXR0b24oKSB7XHJcbiAgICAgICAgdGhpcy5jb21waWxlUnVuc0FmdGVyQ29kZVJlc2V0Kys7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGlsZVJ1bnNBZnRlckNvZGVSZXNldCA9PSAzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJHJlc2V0QnV0dG9uLmZhZGVJbigxMDAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcmludFByb2dyYW0oKSB7XHJcblxyXG4gICAgICAgIHRoaXMuYm90dG9tRGl2LnByaW50TW9kdWxlVG9Cb3R0b21EaXYodGhpcy5jdXJyZW50V29ya3NwYWNlLCB0aGlzLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd0NsYXNzRGlhZ3JhbXMob25seVVwZGF0ZUlkZW50aWZpZXJzOiBib29sZWFuKSB7XHJcbiAgICAgICAgLy8gY2xlYXJUaW1lb3V0KHRoaXMuZGVib3VuY2VEaWFncmFtRHJhd2luZyk7XHJcbiAgICAgICAgLy8gdGhpcy5kZWJvdW5jZURpYWdyYW1EcmF3aW5nID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgLy8gICAgIHRoaXMucmlnaHREaXY/LmNsYXNzRGlhZ3JhbT8uZHJhd0RpYWdyYW0odGhpcy5jdXJyZW50V29ya3NwYWNlLCBvbmx5VXBkYXRlSWRlbnRpZmllcnMpO1xyXG4gICAgICAgIC8vIH0sIDUwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29weUV4ZWN1dGFibGVNb2R1bGVTdG9yZVRvSW50ZXJwcmV0ZXIoKSB7XHJcbiAgICAgICAgbGV0IG1zID0gdGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLmNvcHkoKTtcclxuICAgICAgICB0aGlzLmludGVycHJldGVyLm1vZHVsZVN0b3JlID0gbXM7XHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlci5tb2R1bGVTdG9yZVZlcnNpb24gPSB0aGlzLnZlcnNpb247XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmludGVycHJldGVyLnN0YXRlID09IEludGVycHJldGVyU3RhdGUubm90X2luaXRpYWxpemVkICYmIHRoaXMucHJvZ3JhbUlzRXhlY3V0YWJsZSkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUuZG9uZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgc2F2ZVdvcmtzcGFjZVRvRmlsZSgpIHtcclxuICAgICAgICBsZXQgZmlsZW5hbWU6IHN0cmluZyA9IHByb21wdChcIkJpdHRlIGdlYmVuIFNpZSBkZW4gRGF0ZWluYW1lbiBlaW5cIiwgdGhpcy5jb25maWcuanNvbkZpbGVuYW1lKTtcclxuICAgICAgICBpZiAoZmlsZW5hbWUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBhbGVydChcIkRlciBEYXRlaW5hbWUgaXN0IGxlZXIsIGRhaGVyIHdpcmQgbmljaHRzIGdlc3BlaWNoZXJ0LlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWZpbGVuYW1lLmVuZHNXaXRoKFwiLmpzb25cIikpIGZpbGVuYW1lID0gZmlsZW5hbWUgKyBcIi5qc29uXCI7XHJcbiAgICAgICAgbGV0IHdzID0gdGhpcy5jdXJyZW50V29ya3NwYWNlO1xyXG4gICAgICAgIGxldCBuYW1lOiBzdHJpbmcgPSB3cy5uYW1lLnJlcGxhY2UoL1xcLy9nLCBcIl9cIik7XHJcbiAgICAgICAgZG93bmxvYWRGaWxlKHdzLnRvRXhwb3J0ZWRXb3Jrc3BhY2UoKSwgZmlsZW5hbWUpXHJcbiAgICB9XHJcblxyXG5cclxuICAgIG1ha2VCb3R0b21EaXYoJGJvdHRvbURpdjogSlF1ZXJ5PEhUTUxFbGVtZW50PiwgJGJ1dHRvbkRpdjogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG5cclxuICAgICAgICBsZXQgJHRhYmhlYWRpbmdzID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fdGFiaGVhZGluZ3NcIj48L2Rpdj4nKTtcclxuICAgICAgICAkdGFiaGVhZGluZ3MuY3NzKCdwb3NpdGlvbicsICdyZWxhdGl2ZScpO1xyXG4gICAgICAgIGxldCAkdGhSaWdodFNpZGUgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfdGFiaGVhZGluZy1yaWdodCBqb19ub0hlYWRpbmdcIj48L2Rpdj4nKTtcclxuXHJcbiAgICAgICAgJHRoUmlnaHRTaWRlLmFwcGVuZCgkYnV0dG9uRGl2KTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhDb25zb2xlKSB7XHJcbiAgICAgICAgICAgIGxldCAkdGhDb25zb2xlQ2xlYXIgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJpbWdfY2xlYXItZGFyayBqb19idXR0b24gam9fYWN0aXZlIGpvX2NvbnNvbGUtY2xlYXJcIicgK1xyXG4gICAgICAgICAgICAgICAgJ3N0eWxlPVwiZGlzcGxheTogbm9uZTsgbWFyZ2luLWxlZnQ6IDhweDtcIiB0aXRsZT1cIkNvbnNvbGUgbGVlcmVuXCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgICAgICR0aFJpZ2h0U2lkZS5hcHBlbmQoJHRoQ29uc29sZUNsZWFyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoRXJyb3JMaXN0KSB7XHJcbiAgICAgICAgICAgIGxldCAkdGhFcnJvcnMgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb190YWJoZWFkaW5nIGpvX2FjdGl2ZVwiIGRhdGEtdGFyZ2V0PVwiam9fZXJyb3JzVGFiXCIgc3R5bGU9XCJsaW5lLWhlaWdodDogMjRweFwiPkZlaGxlcjwvZGl2PicpO1xyXG4gICAgICAgICAgICAkdGFiaGVhZGluZ3MuYXBwZW5kKCR0aEVycm9ycyk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhDb25zb2xlKSB7XHJcbiAgICAgICAgICAgIGxldCAkdGhDb25zb2xlID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fdGFiaGVhZGluZyBqb19jb25zb2xlLXRhYlwiIGRhdGEtdGFyZ2V0PVwiam9fY29uc29sZVRhYlwiIHN0eWxlPVwibGluZS1oZWlnaHQ6IDI0cHhcIj5Db25zb2xlPC9kaXY+Jyk7XHJcbiAgICAgICAgICAgICR0YWJoZWFkaW5ncy5hcHBlbmQoJHRoQ29uc29sZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcud2l0aFBDb2RlKSB7XHJcbiAgICAgICAgICAgIGxldCAkdGhQQ29kZSA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3RhYmhlYWRpbmdcIiBkYXRhLXRhcmdldD1cImpvX3Bjb2RlVGFiXCIgc3R5bGU9XCJsaW5lLWhlaWdodDogMjRweFwiPlBDb2RlPC9kaXY+Jyk7XHJcbiAgICAgICAgICAgICR0YWJoZWFkaW5ncy5hcHBlbmQoJHRoUENvZGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgJHRhYmhlYWRpbmdzLmFwcGVuZCgkdGhSaWdodFNpZGUpO1xyXG5cclxuICAgICAgICAkYm90dG9tRGl2LmFwcGVuZCgkdGFiaGVhZGluZ3MpO1xyXG5cclxuICAgICAgICBsZXQgJHRhYnMgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb190YWJzIGpvX3Njcm9sbGFibGVcIj48L2Rpdj4nKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhFcnJvckxpc3QpIHtcclxuICAgICAgICAgICAgbGV0ICR0YWJFcnJvciA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX2FjdGl2ZSBqb19zY3JvbGxhYmxlIGpvX2Vycm9yc1RhYlwiPjwvZGl2PicpO1xyXG4gICAgICAgICAgICAkdGFicy5hcHBlbmQoJHRhYkVycm9yKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoQ29uc29sZSkge1xyXG4gICAgICAgICAgICBsZXQgJHRhYkNvbnNvbGUgPSBqUXVlcnkoXHJcbiAgICAgICAgICAgICAgICBgXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImpvX2VkaXRvckZvbnRTaXplIGpvX2NvbnNvbGVUYWJcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiam9fY29uc29sZS1pbm5lclwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9fc2Nyb2xsYWJsZSBqb19jb25zb2xlLXRvcFwiPjwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9fY29tbWFuZGxpbmVcIj48L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgIGApO1xyXG5cclxuICAgICAgICAgICAgJHRhYnMuYXBwZW5kKCR0YWJDb25zb2xlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoUENvZGUpIHtcclxuICAgICAgICAgICAgbGV0ICR0YWJQQ29kZSA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3Njcm9sbGFibGUgam9fcGNvZGVUYWJcIj5QQ29kZTwvZGl2PicpO1xyXG4gICAgICAgICAgICAkdGFicy5hcHBlbmQoJHRhYlBDb2RlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRib3R0b21EaXYuYXBwZW5kKCR0YWJzKTtcclxuXHJcbiAgICB9XHJcbiAgICBsb2FkV29ya3NwYWNlRnJvbUZpbGUoZmlsZTogZ2xvYmFsVGhpcy5GaWxlKSB7XHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIGlmIChmaWxlID09IG51bGwpIHJldHVybjtcclxuICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuICAgICAgICByZWFkZXIub25sb2FkID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCB0ZXh0OiBzdHJpbmcgPSA8c3RyaW5nPmV2ZW50LnRhcmdldC5yZXN1bHQ7XHJcbiAgICAgICAgICAgIGlmICghdGV4dC5zdGFydHNXaXRoKFwie1wiKSkge1xyXG4gICAgICAgICAgICAgICAgYWxlcnQoYDxkaXY+RGFzIEZvcm1hdCBkZXIgRGF0ZWkgJHtmaWxlLm5hbWV9IHBhc3N0IG5pY2h0LjwvZGl2PmApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZXc6IEV4cG9ydGVkV29ya3NwYWNlID0gSlNPTi5wYXJzZSh0ZXh0KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChldy5tb2R1bGVzID09IG51bGwgfHwgZXcubmFtZSA9PSBudWxsIHx8IGV3LnNldHRpbmdzID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGFsZXJ0KGA8ZGl2PkRhcyBGb3JtYXQgZGVyIERhdGVpICR7ZmlsZS5uYW1lfSBwYXNzdCBuaWNodC48L2Rpdj5gKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHdzOiBXb3Jrc3BhY2UgPSBuZXcgV29ya3NwYWNlKGV3Lm5hbWUsIHRoaXMsIDApO1xyXG4gICAgICAgICAgICB3cy5zZXR0aW5ncyA9IGV3LnNldHRpbmdzO1xyXG4gICAgICAgICAgICB3cy5hbHRlckFkZGl0aW9uYWxMaWJyYXJpZXMoKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IG1vIG9mIGV3Lm1vZHVsZXMpIHtcclxuICAgICAgICAgICAgICAgIGxldCBmOiBGaWxlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG1vLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlydHk6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IG1vLnRleHQsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dF9iZWZvcmVfcmV2aXNpb246IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VibWl0dGVkX2RhdGU6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgc3R1ZGVudF9lZGl0ZWRfYWZ0ZXJfcmV2aXNpb246IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHZlcnNpb246IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNfY29weV9vZl9pZDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICByZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbjogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uOiBudWxsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBtID0gbmV3IE1vZHVsZShmLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgIHdzLm1vZHVsZVN0b3JlLnB1dE1vZHVsZShtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGF0LmN1cnJlbnRXb3Jrc3BhY2UgPSB3cztcclxuXHJcbiAgICAgICAgICAgIGlmKHRoYXQuZmlsZUV4cGxvcmVyICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgdGhhdC5maWxlRXhwbG9yZXIucmVtb3ZlQWxsRmlsZXMoKTtcclxuICAgICAgICAgICAgICAgIHdzLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpLmZvckVhY2gobW9kdWxlID0+IHRoYXQuZmlsZUV4cGxvcmVyLmFkZE1vZHVsZShtb2R1bGUpKTtcclxuICAgICAgICAgICAgICAgIHRoYXQuZmlsZUV4cGxvcmVyLnNldEZpcnN0RmlsZUFjdGl2ZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRNb2R1bGVBY3RpdmUodGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLmdldEZpcnN0TW9kdWxlKCkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGF0LnNhdmVTY3JpcHRzKCk7XHJcblxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1ha2VSaWdodERpdigpOiBKUXVlcnk8SFRNTEVsZW1lbnQ+IHtcclxuXHJcbiAgICAgICAgbGV0ICRyaWdodERpdiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvZV9yaWdodERpdlwiPjwvZGl2PicpO1xyXG4gICAgICAgIHRoaXMuJHJpZ2h0RGl2SW5uZXIgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfcmlnaHREaXZJbm5lclwiPjwvZGl2PicpO1xyXG4gICAgICAgICRyaWdodERpdi5hcHBlbmQodGhpcy4kcmlnaHREaXZJbm5lcik7XHJcblxyXG4gICAgICAgIHRoaXMuJGRlYnVnZ2VyRGl2ID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX2RlYnVnZ2VyRGl2XCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgdGhpcy4kcnVuRGl2ID0galF1ZXJ5KFxyXG4gICAgICAgICAgICBgXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb190YWIgam9fYWN0aXZlIGpvX3J1blwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9fcnVuLXByb2dyYW1lbmRcIj5Qcm9ncmFtbSBiZWVuZGV0PC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb19ydW4taW5wdXRcIj5cclxuICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiam9fcnVuLWlucHV0LW1lc3NhZ2VcIiBjbGFzcz1cImpvX3JpeFwiPkJpdHRlIGdlYmVuIFNpZSBlaW5lIFphaGwgZWluITwvZGl2PlxyXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cImpvX3J1bi1pbnB1dC1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJqb19yaXhcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiam9fcnVuLWlucHV0LWJ1dHRvbi1vdXRlclwiIGNsYXNzPVwiam9fcml4XCI+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImpvX3J1bi1pbnB1dC1idXR0b25cIiBjbGFzcz1cImpvX3JpeFwiPk9LPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImpvX3J1bi1pbnB1dC1lcnJvclwiIGNsYXNzPVwiam9fcml4XCI+PC9kaXY+XHJcbiAgICA8L2Rpdj5cclxuICAgIDwvZGl2PlxyXG4gICAgPC9kaXY+IFxyXG4gICAgPGRpdiBjbGFzcz1cImpvX3J1bi1pbm5lclwiPlxyXG4gICAgPGRpdiBjbGFzcz1cImpvX2dyYXBoaWNzXCI+PC9kaXY+XHJcbiAgICA8ZGl2IGNsYXNzPVwiam9fb3V0cHV0IGpvX3Njcm9sbGFibGVcIj48L2Rpdj5cclxuICAgIDwvZGl2PlxyXG4gICAgXHJcbiAgICA8L2Rpdj5cclxuICAgIFxyXG4gICAgYCk7XHJcblxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLmhpZGVFZGl0b3IpIHtcclxuICAgICAgICAgICAgbGV0ICR0YWJoZWFkaW5ncyA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3RhYmhlYWRpbmdzXCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgICAgICR0YWJoZWFkaW5ncy5jc3MoJ3Bvc2l0aW9uJywgJ3JlbGF0aXZlJyk7XHJcbiAgICAgICAgICAgIGxldCAkdGhSdW4gPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb190YWJoZWFkaW5nIGpvX2FjdGl2ZVwiIGRhdGEtdGFyZ2V0PVwiam9fcnVuXCIgc3R5bGU9XCJsaW5lLWhlaWdodDogMjRweFwiPkF1c2dhYmU8L2Rpdj4nKTtcclxuICAgICAgICAgICAgbGV0ICR0aFZhcmlhYmxlcyA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3RhYmhlYWRpbmcgam9fY29uc29sZS10YWJcIiBkYXRhLXRhcmdldD1cImpvX3ZhcmlhYmxlc1RhYlwiIHN0eWxlPVwibGluZS1oZWlnaHQ6IDI0cHhcIj5WYXJpYWJsZW48L2Rpdj4nKTtcclxuICAgICAgICAgICAgJHRhYmhlYWRpbmdzLmFwcGVuZCgkdGhSdW4sICR0aFZhcmlhYmxlcyk7XHJcbiAgICAgICAgICAgIHRoaXMuJHJpZ2h0RGl2SW5uZXIuYXBwZW5kKCR0YWJoZWFkaW5ncyk7XHJcbiAgICAgICAgICAgIGxldCAkdmQgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb19zY3JvbGxhYmxlIGpvX2VkaXRvckZvbnRTaXplIGpvX3ZhcmlhYmxlc1RhYlwiPjwvZGl2PicpO1xyXG5cclxuICAgICAgICAgICAgbGV0ICRhbHRlcm5hdGl2ZVRleHQgPSBqUXVlcnkoYFxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9fYWx0ZXJuYXRpdmVUZXh0IGpvX3Njcm9sbGFibGVcIj5cclxuICAgICAgICAgICAgPGRpdiBzdHlsZT1cImZvbnQtd2VpZ2h0OiBib2xkXCI+VGlwcDo8L2Rpdj5cclxuICAgICAgICAgICAgRGllIFZhcmlhYmxlbiBzaW5kIG51ciBkYW5uIHNpY2h0YmFyLCB3ZW5uIGRhcyBQcm9ncmFtbVxyXG4gICAgICAgICAgICA8dWw+XHJcbiAgICAgICAgICAgIDxsaT5pbSBFaW56ZWxzY2hyaXR0bW9kdXMgYXVzZ2Vmw7xocnQgd2lyZChLbGljayBhdWYgPHNwYW4gY2xhc3M9XCJpbWdfc3RlcC1vdmVyLWRhcmsgam9faW5saW5lLWltYWdlXCI+PC9zcGFuPiksPC9saT5cclxuICAgICAgICAgICAgPGxpPmFuIGVpbmVtIEJyZWFrcG9pbnQgaMOkbHQgKFNldHplbiBlaW5lcyBCcmVha3BvaW50cyBtaXQgTWF1c2tsaWNrIGxpbmtzIG5lYmVuIGRlbiBaZWlsZW5udW1tZXJuIHVuZCBhbnNjaGxpZcOfZW5kZXMgU3RhcnRlbiBkZXMgUHJvZ3JhbW1zIG1pdCBcclxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiaW1nX3N0YXJ0LWRhcmsgam9faW5saW5lLWltYWdlXCI+PC9zcGFuPikgb2RlciA8L2xpPlxyXG4gICAgICAgICAgICAgICAgPGxpPmluIHNlaHIgbmllZHJpZ2VyIEdlc2Nod2luZGlna2VpdCBhdXNnZWbDvGhydCB3aXJkICh3ZW5pZ2VyIGFscyAxMCBTY2hyaXR0ZS9zKS5cclxuICAgICAgICAgICAgICAgIDwvdWw+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIGApO1xyXG5cclxuICAgICAgICAgICAgJHZkLmFwcGVuZCh0aGlzLiRkZWJ1Z2dlckRpdiwgJGFsdGVybmF0aXZlVGV4dCk7XHJcbiAgICAgICAgICAgIGxldCAkdGFicyA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3RhYnMgam9fc2Nyb2xsYWJsZVwiPjwvZGl2PicpO1xyXG4gICAgICAgICAgICAkdGFicy5hcHBlbmQodGhpcy4kcnVuRGl2LCAkdmQpO1xyXG4gICAgICAgICAgICB0aGlzLiRyaWdodERpdklubmVyLmFwcGVuZCgkdGFicyk7XHJcbiAgICAgICAgICAgIG1ha2VUYWJzKCRyaWdodERpdik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy4kcmlnaHREaXZJbm5lci5hcHBlbmQodGhpcy4kcnVuRGl2KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAkcmlnaHREaXY7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0U2VtaWNvbG9uQW5nZWwoKTogU2VtaWNvbG9uQW5nZWwge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbWljb2xvbkFuZ2VsO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuXHJcbiJdfQ==