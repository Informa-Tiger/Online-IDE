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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbkVtYmVkZGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudC9lbWJlZGRlZC9NYWluRW1iZWRkZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsTUFBTSxFQUEyQixNQUFNLDhCQUE4QixDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDL0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRW5ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsWUFBWSxFQUFXLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBa0J0RSxNQUFNLE9BQU8sWUFBWTtJQXNGckIsWUFBWSxJQUF5QixFQUFVLFVBQXNCO1FBQXRCLGVBQVUsR0FBVixVQUFV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ZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBpbGVyLCBDb21waWxlclN0YXR1cyB9IGZyb20gXCIuLi9jb21waWxlci9Db21waWxlci5qc1wiO1xyXG5pbXBvcnQgeyBNb2R1bGUsIEZpbGUsIEV4cG9ydGVkV29ya3NwYWNlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3BhcnNlci9Nb2R1bGUuanNcIjtcclxuaW1wb3J0IHsgRGVidWdnZXIgfSBmcm9tIFwiLi4vaW50ZXJwcmV0ZXIvRGVidWdnZXIuanNcIjtcclxuaW1wb3J0IHsgSW50ZXJwcmV0ZXIsIEludGVycHJldGVyU3RhdGUgfSBmcm9tIFwiLi4vaW50ZXJwcmV0ZXIvSW50ZXJwcmV0ZXIuanNcIjtcclxuaW1wb3J0IHsgQWN0aW9uTWFuYWdlciB9IGZyb20gXCIuLi9tYWluL2d1aS9BY3Rpb25NYW5hZ2VyLmpzXCI7XHJcbmltcG9ydCB7IEJvdHRvbURpdiB9IGZyb20gXCIuLi9tYWluL2d1aS9Cb3R0b21EaXYuanNcIjtcclxuaW1wb3J0IHsgRWRpdG9yIH0gZnJvbSBcIi4uL21haW4vZ3VpL0VkaXRvci5qc1wiO1xyXG5pbXBvcnQgeyBQcm9ncmFtQ29udHJvbEJ1dHRvbnMgfSBmcm9tIFwiLi4vbWFpbi9ndWkvUHJvZ3JhbUNvbnRyb2xCdXR0b25zLmpzXCI7XHJcbmltcG9ydCB7IFJpZ2h0RGl2IH0gZnJvbSBcIi4uL21haW4vZ3VpL1JpZ2h0RGl2LmpzXCI7XHJcbmltcG9ydCB7IE1haW5CYXNlIH0gZnJvbSBcIi4uL21haW4vTWFpbkJhc2UuanNcIjtcclxuaW1wb3J0IHsgV29ya3NwYWNlIH0gZnJvbSBcIi4uL3dvcmtzcGFjZS9Xb3Jrc3BhY2UuanNcIjtcclxuaW1wb3J0IHsgSk9TY3JpcHQgfSBmcm9tIFwiLi9FbWJlZGRlZFN0YXJ0ZXIuanNcIjtcclxuaW1wb3J0IHsgZG93bmxvYWRGaWxlLCBtYWtlRGl2LCBtYWtlVGFicywgb3BlbkNvbnRleHRNZW51IH0gZnJvbSBcIi4uL3Rvb2xzL0h0bWxUb29scy5qc1wiO1xyXG5pbXBvcnQgeyBFbWJlZGRlZFNsaWRlciB9IGZyb20gXCIuL0VtYmVkZGVkU2xpZGVyLmpzXCI7XHJcbmltcG9ydCB7IEVtYmVkZGVkRmlsZUV4cGxvcmVyIH0gZnJvbSBcIi4vRW1iZWRkZWRGaWxlRXhwbG9yZXIuanNcIjtcclxuaW1wb3J0IHsgVGV4dFBvc2l0aW9uIH0gZnJvbSBcIi4uL2NvbXBpbGVyL2xleGVyL1Rva2VuLmpzXCI7XHJcbmltcG9ydCB7IEVtYmVkZGVkSW5kZXhlZERCIH0gZnJvbSBcIi4vRW1iZWRkZWRJbmRleGVkREIuanNcIjtcclxuaW1wb3J0IHsgU2VtaWNvbG9uQW5nZWwgfSBmcm9tIFwiLi4vY29tcGlsZXIvcGFyc2VyL1NlbWljb2xvbkFuZ2VsLmpzXCI7XHJcbmltcG9ydCB7IFRleHRQb3NpdGlvbldpdGhNb2R1bGUgfSBmcm9tIFwiLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSGl0UG9seWdvblN0b3JlIH0gZnJvbSBcIi4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1BvbHlnb25TdG9yZS5qc1wiO1xyXG5cclxudHlwZSBKYXZhT25saW5lQ29uZmlnID0ge1xyXG4gICAgd2l0aEZpbGVMaXN0PzogYm9vbGVhbixcclxuICAgIHdpdGhQQ29kZT86IGJvb2xlYW4sXHJcbiAgICB3aXRoQ29uc29sZT86IGJvb2xlYW4sXHJcbiAgICB3aXRoRXJyb3JMaXN0PzogYm9vbGVhbixcclxuICAgIHdpdGhCb3R0b21QYW5lbD86IGJvb2xlYW4sXHJcbiAgICBzcGVlZD86IG51bWJlciB8IFwibWF4XCIsXHJcbiAgICBpZD86IHN0cmluZyxcclxuICAgIGhpZGVTdGFydFBhbmVsPzogYm9vbGVhbixcclxuICAgIGhpZGVFZGl0b3I/OiBib29sZWFuLFxyXG4gICAgbGlicmFyaWVzPzogc3RyaW5nW10sXHJcbiAgICBqc29uRmlsZW5hbWU/OiBzdHJpbmdcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1haW5FbWJlZGRlZCBpbXBsZW1lbnRzIE1haW5CYXNlIHtcclxuXHJcbiAgICBwaXhpQXBwOiBQSVhJLkFwcGxpY2F0aW9uO1xyXG5cclxuICAgIGlzRW1iZWRkZWQoKTogYm9vbGVhbiB7IHJldHVybiB0cnVlOyB9XHJcblxyXG4gICAganVtcFRvRGVjbGFyYXRpb24obW9kdWxlOiBNb2R1bGUsIGRlY2xhcmF0aW9uOiBUZXh0UG9zaXRpb25XaXRoTW9kdWxlKSB7IH07XHJcblxyXG4gICAgZ2V0Q29tcGlsZXIoKTogQ29tcGlsZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVyO1xyXG4gICAgfVxyXG4gICAgZ2V0SW50ZXJwcmV0ZXIoKTogSW50ZXJwcmV0ZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmludGVycHJldGVyO1xyXG4gICAgfVxyXG4gICAgZ2V0Q3VycmVudFdvcmtzcGFjZSgpOiBXb3Jrc3BhY2Uge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRXb3Jrc3BhY2U7XHJcbiAgICB9XHJcbiAgICBnZXREZWJ1Z2dlcigpOiBEZWJ1Z2dlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGVidWdnZXI7XHJcbiAgICB9XHJcbiAgICBnZXRNb25hY29FZGl0b3IoKTogbW9uYWNvLmVkaXRvci5JU3RhbmRhbG9uZUNvZGVFZGl0b3Ige1xyXG4gICAgICAgIHJldHVybiB0aGlzLmVkaXRvci5lZGl0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0UmlnaHREaXYoKTogUmlnaHREaXYge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnJpZ2h0RGl2O1xyXG4gICAgfVxyXG5cclxuICAgIGdldEJvdHRvbURpdigpOiBCb3R0b21EaXYge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvdHRvbURpdjtcclxuICAgIH1cclxuXHJcbiAgICBnZXRBY3Rpb25NYW5hZ2VyKCk6IEFjdGlvbk1hbmFnZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFjdGlvbk1hbmFnZXI7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCk6IE1vZHVsZSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhGaWxlTGlzdCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maWxlRXhwbG9yZXIuY3VycmVudEZpbGU/Lm1vZHVsZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLmdldEZpcnN0TW9kdWxlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbmZpZzogSmF2YU9ubGluZUNvbmZpZztcclxuXHJcbiAgICBlZGl0b3I6IEVkaXRvcjtcclxuICAgIHByb2dyYW1Qb2ludGVyRGVjb3JhdGlvbjogc3RyaW5nW10gPSBbXTtcclxuICAgIHByb2dyYW1Qb2ludGVyTW9kdWxlOiBNb2R1bGU7XHJcblxyXG4gICAgY3VycmVudFdvcmtzcGFjZTogV29ya3NwYWNlO1xyXG4gICAgYWN0aW9uTWFuYWdlcjogQWN0aW9uTWFuYWdlcjtcclxuXHJcbiAgICBjb21waWxlcjogQ29tcGlsZXI7XHJcblxyXG4gICAgaW50ZXJwcmV0ZXI6IEludGVycHJldGVyO1xyXG4gICAgJHJ1bkRpdjogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuXHJcbiAgICBkZWJ1Z2dlcjogRGVidWdnZXI7XHJcbiAgICAkZGVidWdnZXJEaXY6IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcblxyXG4gICAgYm90dG9tRGl2OiBCb3R0b21EaXY7XHJcbiAgICAkZmlsZXNMaXN0RGl2OiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG5cclxuICAgICRoaW50RGl2OiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG4gICAgJG1vbmFjb0RpdjogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuICAgICRyZXNldEJ1dHRvbjogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuXHJcbiAgICBwcm9ncmFtSXNFeGVjdXRhYmxlID0gZmFsc2U7XHJcbiAgICB2ZXJzaW9uOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIHRpbWVySGFuZGxlOiBhbnk7XHJcblxyXG4gICAgcmlnaHREaXY6IFJpZ2h0RGl2O1xyXG4gICAgJHJpZ2h0RGl2SW5uZXI6IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcblxyXG4gICAgZmlsZUV4cGxvcmVyOiBFbWJlZGRlZEZpbGVFeHBsb3JlcjtcclxuXHJcbiAgICBkZWJvdW5jZURpYWdyYW1EcmF3aW5nOiBhbnk7XHJcblxyXG4gICAgaW5kZXhlZERCOiBFbWJlZGRlZEluZGV4ZWREQjtcclxuXHJcbiAgICBjb21waWxlUnVuc0FmdGVyQ29kZVJlc2V0OiBudW1iZXIgPSAwO1xyXG5cclxuICAgIHNlbWljb2xvbkFuZ2VsOiBTZW1pY29sb25BbmdlbDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigkZGl2OiBKUXVlcnk8SFRNTEVsZW1lbnQ+LCBwcml2YXRlIHNjcmlwdExpc3Q6IEpPU2NyaXB0W10pIHtcclxuXHJcbiAgICAgICAgdGhpcy5yZWFkQ29uZmlnKCRkaXYpO1xyXG5cclxuICAgICAgICB0aGlzLmluaXRHVUkoJGRpdik7XHJcblxyXG4gICAgICAgIHRoaXMuaW5pdFNjcmlwdHMoKTtcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbmZpZy5oaWRlU3RhcnRQYW5lbCkge1xyXG4gICAgICAgICAgICB0aGlzLmluZGV4ZWREQiA9IG5ldyBFbWJlZGRlZEluZGV4ZWREQigpO1xyXG4gICAgICAgICAgICB0aGlzLmluZGV4ZWREQi5vcGVuKCgpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcuaWQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZFNjcmlwdHMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZW1pY29sb25BbmdlbCA9IG5ldyBTZW1pY29sb25BbmdlbCh0aGlzKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaW5pdFNjcmlwdHMoKSB7XHJcblxyXG4gICAgICAgIHRoaXMuZmlsZUV4cGxvcmVyPy5yZW1vdmVBbGxGaWxlcygpO1xyXG5cclxuICAgICAgICB0aGlzLmluaXRXb3Jrc3BhY2UodGhpcy5zY3JpcHRMaXN0KTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhGaWxlTGlzdCkge1xyXG4gICAgICAgICAgICB0aGlzLmZpbGVFeHBsb3JlciA9IG5ldyBFbWJlZGRlZEZpbGVFeHBsb3Jlcih0aGlzLmN1cnJlbnRXb3Jrc3BhY2UubW9kdWxlU3RvcmUsIHRoaXMuJGZpbGVzTGlzdERpdiwgdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsZUV4cGxvcmVyLnNldEZpcnN0RmlsZUFjdGl2ZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnNjcmlwdExpc3QuZmlsdGVyKChzY3JpcHQpID0+IHNjcmlwdC50eXBlID09IFwiaGludFwiKS5mb3JFYWNoKChzY3JpcHQpID0+IHRoaXMuZmlsZUV4cGxvcmVyLmFkZEhpbnQoc2NyaXB0KSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRNb2R1bGVBY3RpdmUodGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLmdldEZpcnN0TW9kdWxlKCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHJlYWRDb25maWcoJGRpdjogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG4gICAgICAgIGxldCBjb25maWdKc29uOiBzdHJpbmcgfCBvYmplY3QgPSAkZGl2LmRhdGEoXCJqYXZhLW9ubGluZVwiKTtcclxuICAgICAgICBpZiAoY29uZmlnSnNvbiAhPSBudWxsICYmIHR5cGVvZiBjb25maWdKc29uID09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgdGhpcy5jb25maWcgPSBKU09OLnBhcnNlKGNvbmZpZ0pzb24uc3BsaXQoXCInXCIpLmpvaW4oJ1wiJykpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnID0ge31cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5oaWRlRWRpdG9yID09IG51bGwpIHRoaXMuY29uZmlnLmhpZGVFZGl0b3IgPSBmYWxzZTtcclxuICAgICAgICBpZiAodGhpcy5jb25maWcuaGlkZVN0YXJ0UGFuZWwgPT0gbnVsbCkgdGhpcy5jb25maWcuaGlkZVN0YXJ0UGFuZWwgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhCb3R0b21QYW5lbCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLndpdGhCb3R0b21QYW5lbCA9IHRoaXMuY29uZmlnLndpdGhDb25zb2xlIHx8IHRoaXMuY29uZmlnLndpdGhQQ29kZSB8fCB0aGlzLmNvbmZpZy53aXRoRmlsZUxpc3QgfHwgdGhpcy5jb25maWcud2l0aEVycm9yTGlzdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5oaWRlRWRpdG9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLndpdGhCb3R0b21QYW5lbCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmNvbmZpZy53aXRoRmlsZUxpc3QgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5jb25maWcud2l0aENvbnNvbGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5jb25maWcud2l0aFBDb2RlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLndpdGhFcnJvckxpc3QgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoQm90dG9tUGFuZWwpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhGaWxlTGlzdCA9PSBudWxsKSB0aGlzLmNvbmZpZy53aXRoRmlsZUxpc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcud2l0aFBDb2RlID09IG51bGwpIHRoaXMuY29uZmlnLndpdGhQQ29kZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoQ29uc29sZSA9PSBudWxsKSB0aGlzLmNvbmZpZy53aXRoQ29uc29sZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoRXJyb3JMaXN0ID09IG51bGwpIHRoaXMuY29uZmlnLndpdGhFcnJvckxpc3QgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLnNwZWVkID09IG51bGwpIHRoaXMuY29uZmlnLnNwZWVkID0gOTtcclxuICAgICAgICBpZiAodGhpcy5jb25maWcubGlicmFyaWVzID09IG51bGwpIHRoaXMuY29uZmlnLmxpYnJhcmllcyA9IFtdO1xyXG4gICAgICAgIGlmKHRoaXMuY29uZmlnLmpzb25GaWxlbmFtZSA9PSBudWxsKSB0aGlzLmNvbmZpZy5qc29uRmlsZW5hbWUgPSBcIndvcmtzcGFjZS5qc29uXCI7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldE1vZHVsZUFjdGl2ZShtb2R1bGU6IE1vZHVsZSkge1xyXG5cclxuICAgICAgICBpZihtb2R1bGUgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcud2l0aEZpbGVMaXN0ICYmIHRoaXMuZmlsZUV4cGxvcmVyLmN1cnJlbnRGaWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5maWxlRXhwbG9yZXIuY3VycmVudEZpbGUubW9kdWxlLmVkaXRvclN0YXRlID0gdGhpcy5nZXRNb25hY29FZGl0b3IoKS5zYXZlVmlld1N0YXRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcud2l0aEZpbGVMaXN0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsZUV4cGxvcmVyLm1hcmtGaWxlKG1vZHVsZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBXSUNIVElHOiBEaWUgUmVpaGVuZm9sZ2UgZGVyIGJlaWRlbiBPcGVyYXRpb25lbiBpc3QgZXh0cmVtIHdpY2h0aWcuXHJcbiAgICAgICAgICogRmFsbHMgZGFzIE1vZGVsIGltIHJlYWRvbmx5LVp1c3RhbmQgZ2VzZXR6dCB3aXJkLCBmdW5rdGlvbmllcnQgPFN0cmcgKyAuPiBcclxuICAgICAgICAgKiBuaWNodCB1bmQgZGllIExpZ2h0YnVsYnMgd2VyZGVuIG5pY2h0IGFuZ2V6ZWlndCwgc2VsYnN0IGRhbm4sIHdlbm5cclxuICAgICAgICAgKiBzcMOkdGVyIHJlYWRvbmx5ID0gZmFsc2UgZ2VzZXR6dCB3aXJkLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZ2V0TW9uYWNvRWRpdG9yKCkudXBkYXRlT3B0aW9ucyh7XHJcbiAgICAgICAgICAgIHJlYWRPbmx5OiBmYWxzZSxcclxuICAgICAgICAgICAgbGluZU51bWJlcnNNaW5DaGFyczogNFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuZWRpdG9yLmVkaXRvci5zZXRNb2RlbChtb2R1bGUubW9kZWwpO1xyXG5cclxuXHJcbiAgICAgICAgaWYgKG1vZHVsZS5lZGl0b3JTdGF0ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0TW9uYWNvRWRpdG9yKCkucmVzdG9yZVZpZXdTdGF0ZShtb2R1bGUuZWRpdG9yU3RhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW9kdWxlLnJlbmRlckJyZWFrcG9pbnREZWNvcmF0b3JzKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGVyYXNlRG9rdXdpa2lTZWFyY2hNYXJrdXAodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gdGV4dC5yZXBsYWNlKC88c3BhbiBjbGFzcz1cInNlYXJjaFxcd2hpdFwiPiguKj8pPFxcL3NwYW4+L2csIFwiJDFcIik7XHJcbiAgICB9XHJcblxyXG4gICAgcmVhZFNjcmlwdHMoKSB7XHJcblxyXG4gICAgICAgIGxldCBtb2R1bGVzID0gdGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpO1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIHRoaXMuaW5kZXhlZERCLmdldFNjcmlwdCh0aGlzLmNvbmZpZy5pZCwgKHNjcmlwdExpc3RKU29uKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChzY3JpcHRMaXN0SlNvbiA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zYXZlU2NyaXB0cygpO1xyXG4gICAgICAgICAgICAgICAgfSwgMTAwMCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHNjcmlwdExpc3Q6IHN0cmluZ1tdID0gSlNPTi5wYXJzZShzY3JpcHRMaXN0SlNvbik7XHJcbiAgICAgICAgICAgICAgICBsZXQgY291bnREb3duID0gc2NyaXB0TGlzdC5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbW9kdWxlIG9mIG1vZHVsZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmZpbGVFeHBsb3Jlcj8ucmVtb3ZlTW9kdWxlKG1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5yZW1vdmVNb2R1bGUobW9kdWxlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBuYW1lIG9mIHNjcmlwdExpc3QpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNjcmlwdElkID0gdGhpcy5jb25maWcuaWQgKyBuYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZXhlZERCLmdldFNjcmlwdChzY3JpcHRJZCwgKHNjcmlwdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2NyaXB0ICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JpcHQgPSB0aGlzLmVyYXNlRG9rdXdpa2lTZWFyY2hNYXJrdXAoc2NyaXB0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbW9kdWxlID0gdGhhdC5hZGRNb2R1bGUoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBuYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHNjcmlwdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImphdmFcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5maWxlRXhwbG9yZXI/LmFkZE1vZHVsZShtb2R1bGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC4kcmVzZXRCdXR0b24uZmFkZUluKDEwMDApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiUmV0cmlldmluZyBzY3JpcHQgXCIgKyBzY3JpcHRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnREb3duLS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb3VudERvd24gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuc2F2ZVNjcmlwdHMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5maWxlRXhwbG9yZXI/LnNldEZpcnN0RmlsZUFjdGl2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQuZmlsZUV4cGxvcmVyID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbW9kdWxlcyA9IHRoYXQuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobW9kdWxlcy5sZW5ndGggPiAwKSB0aGF0LnNldE1vZHVsZUFjdGl2ZShtb2R1bGVzWzBdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBzYXZlU2NyaXB0cygpIHtcclxuXHJcbiAgICAgICAgbGV0IG1vZHVsZXMgPSB0aGlzLmN1cnJlbnRXb3Jrc3BhY2UubW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSk7XHJcblxyXG4gICAgICAgIGxldCBzY3JpcHRMaXN0OiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgIGxldCBvbmVOb3RTYXZlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBtb2R1bGVzLmZvckVhY2gobSA9PiBvbmVOb3RTYXZlZCA9IG9uZU5vdFNhdmVkIHx8ICFtLmZpbGUuc2F2ZWQpO1xyXG5cclxuICAgICAgICBpZiAob25lTm90U2F2ZWQpIHtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IG1vZHVsZSBvZiBtb2R1bGVzKSB7XHJcbiAgICAgICAgICAgICAgICBzY3JpcHRMaXN0LnB1c2gobW9kdWxlLmZpbGUubmFtZSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2NyaXB0SWQgPSB0aGlzLmNvbmZpZy5pZCArIG1vZHVsZS5maWxlLm5hbWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ZWREQi53cml0ZVNjcmlwdChzY3JpcHRJZCwgbW9kdWxlLmdldFByb2dyYW1UZXh0RnJvbU1vbmFjb01vZGVsKCkpO1xyXG4gICAgICAgICAgICAgICAgbW9kdWxlLmZpbGUuc2F2ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJTYXZpbmcgc2NyaXB0IFwiICsgc2NyaXB0SWQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmluZGV4ZWREQi53cml0ZVNjcmlwdCh0aGlzLmNvbmZpZy5pZCwgSlNPTi5zdHJpbmdpZnkoc2NyaXB0TGlzdCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZGVsZXRlU2NyaXB0c0luREIoKSB7XHJcbiAgICAgICAgdGhpcy5pbmRleGVkREIuZ2V0U2NyaXB0KHRoaXMuY29uZmlnLmlkLCAoc2NyaXB0TGlzdEpTb24pID0+IHtcclxuICAgICAgICAgICAgaWYgKHNjcmlwdExpc3RKU29uID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgc2NyaXB0TGlzdDogc3RyaW5nW10gPSBKU09OLnBhcnNlKHNjcmlwdExpc3RKU29uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBuYW1lIG9mIHNjcmlwdExpc3QpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNjcmlwdElkID0gdGhpcy5jb25maWcuaWQgKyBuYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZXhlZERCLnJlbW92ZVNjcmlwdChzY3JpcHRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleGVkREIucmVtb3ZlU2NyaXB0KHRoaXMuY29uZmlnLmlkKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpbml0V29ya3NwYWNlKHNjcmlwdExpc3Q6IEpPU2NyaXB0W10pIHtcclxuICAgICAgICB0aGlzLmN1cnJlbnRXb3Jrc3BhY2UgPSBuZXcgV29ya3NwYWNlKFwiRW1iZWRkZWQtV29ya3NwYWNlXCIsIHRoaXMsIDApO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFdvcmtzcGFjZS5zZXR0aW5ncy5saWJyYXJpZXMgPSB0aGlzLmNvbmZpZy5saWJyYXJpZXM7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50V29ya3NwYWNlLmFsdGVyQWRkaXRpb25hbExpYnJhcmllcygpO1xyXG5cclxuICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgZm9yIChsZXQgc2NyaXB0IG9mIHNjcmlwdExpc3QpIHtcclxuICAgICAgICAgICAgaWYgKHNjcmlwdC50eXBlID09IFwiamF2YVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZE1vZHVsZShzY3JpcHQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgYWRkTW9kdWxlKHNjcmlwdDogSk9TY3JpcHQpOiBNb2R1bGUge1xyXG4gICAgICAgIGxldCBtb2R1bGU6IE1vZHVsZSA9IE1vZHVsZS5yZXN0b3JlRnJvbURhdGEoe1xyXG4gICAgICAgICAgICBpZDogdGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLmdldE1vZHVsZXModHJ1ZSkubGVuZ3RoLFxyXG4gICAgICAgICAgICBuYW1lOiBzY3JpcHQudGl0bGUsXHJcbiAgICAgICAgICAgIHRleHQ6IHNjcmlwdC50ZXh0LFxyXG4gICAgICAgICAgICB0ZXh0X2JlZm9yZV9yZXZpc2lvbjogbnVsbCxcclxuICAgICAgICAgICAgc3VibWl0dGVkX2RhdGU6IG51bGwsXHJcbiAgICAgICAgICAgIHN0dWRlbnRfZWRpdGVkX2FmdGVyX3JldmlzaW9uOiBmYWxzZSxcclxuICAgICAgICAgICAgdmVyc2lvbjogMSxcclxuICAgICAgICAgICAgd29ya3NwYWNlX2lkOiAwLFxyXG4gICAgICAgICAgICBmb3JjZVVwZGF0ZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGlkZW50aWNhbF90b19yZXBvc2l0b3J5X3ZlcnNpb246IGZhbHNlLFxyXG4gICAgICAgICAgICBmaWxlX3R5cGU6IDBcclxuICAgICAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLnB1dE1vZHVsZShtb2R1bGUpO1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIG1vZHVsZS5tb2RlbC5vbkRpZENoYW5nZUNvbnRlbnQoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGF0LmNvbnNpZGVyU2hvd2luZ0NvZGVSZXNldEJ1dHRvbigpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gbW9kdWxlO1xyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZU1vZHVsZShtb2R1bGU6IE1vZHVsZSkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5yZW1vdmVNb2R1bGUobW9kdWxlKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgaW5pdEdVSSgkZGl2OiBKUXVlcnk8SFRNTEVsZW1lbnQ+KSB7XHJcblxyXG4gICAgICAgIC8vIGxldCAkbGVmdERpdiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvZV9sZWZ0RGl2XCI+PC9kaXY+Jyk7XHJcblxyXG4gICAgICAgICRkaXYuY3NzKHtcclxuICAgICAgICAgICAgXCJiYWNrZ3JvdW5kLWltYWdlXCI6IFwibm9uZVwiLFxyXG4gICAgICAgICAgICBcImJhY2tncm91bmQtc2l6ZVwiOiBcIjEwMCVcIlxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGxldCAkY2VudGVyRGl2ID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX2NlbnRlckRpdlwiPjwvZGl2PicpO1xyXG4gICAgICAgIGxldCAkcmVzZXRNb2RhbFdpbmRvdyA9IHRoaXMubWFrZUNvZGVSZXNldE1vZGFsV2luZG93KCRkaXYpO1xyXG5cclxuICAgICAgICBsZXQgJHJpZ2h0RGl2ID0gdGhpcy5tYWtlUmlnaHREaXYoKTtcclxuXHJcbiAgICAgICAgbGV0ICRlZGl0b3JEaXYgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfZWRpdG9yRGl2XCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgdGhpcy4kbW9uYWNvRGl2ID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX21vbmFjb0RpdlwiPjwvZGl2PicpO1xyXG4gICAgICAgIHRoaXMuJGhpbnREaXYgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfaGludERpdiBqb19zY3JvbGxhYmxlXCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgdGhpcy4kcmVzZXRCdXR0b24gPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfcmVzZXRCdXR0b24gam9fYnV0dG9uIGpvX2FjdGl2ZVwiIHRpdGxlPVwiQ29kZSBhdWYgQXVzZ2FuZ3N6dXN0YW5kIHp1csO8Y2tzZXR6ZW5cIj5Db2RlIFJlc2V0PC9kaXY+Jyk7XHJcblxyXG4gICAgICAgICRlZGl0b3JEaXYuYXBwZW5kKHRoaXMuJG1vbmFjb0RpdiwgdGhpcy4kaGludERpdiwgdGhpcy4kcmVzZXRCdXR0b24pO1xyXG5cclxuICAgICAgICBsZXQgJGJyYWNrZXRFcnJvckRpdiA9IHRoaXMubWFrZUJyYWNrZXRFcnJvckRpdigpO1xyXG4gICAgICAgICRlZGl0b3JEaXYuYXBwZW5kKCRicmFja2V0RXJyb3JEaXYpO1xyXG5cclxuICAgICAgICB0aGlzLiRyZXNldEJ1dHRvbi5oaWRlKCk7XHJcblxyXG4gICAgICAgIHRoaXMuJHJlc2V0QnV0dG9uLm9uKFwiY2xpY2tcIiwgKCkgPT4geyAkcmVzZXRNb2RhbFdpbmRvdy5zaG93KCk7IH0pXHJcblxyXG4gICAgICAgIHRoaXMuJGhpbnREaXYuaGlkZSgpO1xyXG5cclxuICAgICAgICBsZXQgJGNvbnRyb2xzRGl2ID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX2NvbnRyb2xzRGl2XCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgbGV0ICRib3R0b21EaXZJbm5lciA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvZV9ib3R0b21EaXZJbm5lclwiPjwvZGl2PicpO1xyXG5cclxuICAgICAgICBsZXQgJGJ1dHRvbk9wZW4gPSBqUXVlcnkoJzxsYWJlbCB0eXBlPVwiZmlsZVwiIGNsYXNzPVwiaW1nX29wZW4tZmlsZSBqb19idXR0b24gam9fYWN0aXZlXCInICtcclxuICAgICAgICAgICAgJ3N0eWxlPVwibWFyZ2luLXJpZ2h0OiA4cHg7XCIgdGl0bGU9XCJXb3Jrc3BhY2UgYXVzIERhdGVpIGxhZGVuXCI+PGlucHV0IHR5cGU9XCJmaWxlXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmVcIj48L2xhYmVsPicpO1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgICRidXR0b25PcGVuLmZpbmQoJ2lucHV0Jykub24oJ2NoYW5nZScsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgdmFyIGZpbGVzOiBGaWxlTGlzdCA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQudGFyZ2V0LmZpbGVzO1xyXG4gICAgICAgICAgICB0aGF0LmxvYWRXb3Jrc3BhY2VGcm9tRmlsZShmaWxlc1swXSk7XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgbGV0ICRidXR0b25TYXZlID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiaW1nX3NhdmUtZGFyayBqb19idXR0b24gam9fYWN0aXZlXCInICtcclxuICAgICAgICAgICAgJ3N0eWxlPVwibWFyZ2luLXJpZ2h0OiA4cHg7XCIgdGl0bGU9XCJXb3Jrc3BhY2UgaW4gRGF0ZWkgc3BlaWNoZXJuXCI+PC9kaXY+Jyk7XHJcblxyXG5cclxuICAgICAgICAkYnV0dG9uU2F2ZS5vbignY2xpY2snLCAoKSA9PiB7IHRoYXQuc2F2ZVdvcmtzcGFjZVRvRmlsZSgpIH0pO1xyXG5cclxuICAgICAgICAkY29udHJvbHNEaXYuYXBwZW5kKCRidXR0b25PcGVuLCAkYnV0dG9uU2F2ZSk7XHJcblxyXG5cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhCb3R0b21QYW5lbCkge1xyXG4gICAgICAgICAgICBsZXQgJGJvdHRvbURpdiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvZV9ib3R0b21EaXZcIj48L2Rpdj4nKTtcclxuICAgICAgICAgICAgdGhpcy5tYWtlQm90dG9tRGl2KCRib3R0b21EaXZJbm5lciwgJGNvbnRyb2xzRGl2KTtcclxuICAgICAgICAgICAgJGJvdHRvbURpdi5hcHBlbmQoJGJvdHRvbURpdklubmVyKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhGaWxlTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgbGV0ICRmaWxlc0RpdiA9IHRoaXMubWFrZUZpbGVzRGl2KCk7XHJcbiAgICAgICAgICAgICAgICAkYm90dG9tRGl2LnByZXBlbmQoJGZpbGVzRGl2KTtcclxuICAgICAgICAgICAgICAgIG5ldyBFbWJlZGRlZFNsaWRlcigkZmlsZXNEaXYsIGZhbHNlLCBmYWxzZSwgKCkgPT4geyB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBtYWtlVGFicygkYm90dG9tRGl2SW5uZXIpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICRjZW50ZXJEaXYuYXBwZW5kKCRlZGl0b3JEaXYsICRib3R0b21EaXYpO1xyXG4gICAgICAgICAgICBuZXcgRW1iZWRkZWRTbGlkZXIoJGJvdHRvbURpdiwgdHJ1ZSwgdHJ1ZSwgKCkgPT4geyB0aGlzLmVkaXRvci5lZGl0b3IubGF5b3V0KCk7IH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICRjZW50ZXJEaXYucHJlcGVuZCgkZWRpdG9yRGl2KTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jb25maWcud2l0aEJvdHRvbVBhbmVsKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5oaWRlRWRpdG9yKSB7XHJcbiAgICAgICAgICAgICAgICAkcmlnaHREaXYucHJlcGVuZCgkY29udHJvbHNEaXYpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgJGNlbnRlckRpdi5wcmVwZW5kKCRjb250cm9sc0Rpdik7XHJcbiAgICAgICAgICAgICAgICAkY29udHJvbHNEaXYuYWRkQ2xhc3MoJ2pvZV9jb250cm9sUGFuZWxfdG9wJyk7XHJcbiAgICAgICAgICAgICAgICAkZWRpdG9yRGl2LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ3JlbGF0aXZlJyxcclxuICAgICAgICAgICAgICAgICAgICAnaGVpZ2h0JzogJzFweCdcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAkZGl2LmFkZENsYXNzKCdqb2VfamF2YU9ubGluZURpdicpO1xyXG4gICAgICAgICRkaXYuYXBwZW5kKCRjZW50ZXJEaXYsICRyaWdodERpdik7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jb25maWcuaGlkZUVkaXRvcikge1xyXG4gICAgICAgICAgICBuZXcgRW1iZWRkZWRTbGlkZXIoJHJpZ2h0RGl2LCB0cnVlLCBmYWxzZSwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgalF1ZXJ5KCcuam9fZ3JhcGhpY3MnKS50cmlnZ2VyKCdzaXplQ2hhbmdlZCcpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5lZGl0b3IuZWRpdG9yLmxheW91dCgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZWRpdG9yID0gbmV3IEVkaXRvcih0aGlzLCBmYWxzZSwgdHJ1ZSk7XHJcbiAgICAgICAgdGhpcy5lZGl0b3IuaW5pdEdVSSh0aGlzLiRtb25hY29EaXYpO1xyXG4gICAgICAgIHRoaXMuJG1vbmFjb0Rpdi5maW5kKCcubW9uYWNvLWVkaXRvcicpLmNzcygnei1pbmRleCcsICcxMCcpO1xyXG5cclxuICAgICAgICBpZiAoJGRpdi5hdHRyKCd0YWJpbmRleCcpID09IG51bGwpICRkaXYuYXR0cigndGFiaW5kZXgnLCBcIjBcIik7XHJcbiAgICAgICAgdGhpcy5hY3Rpb25NYW5hZ2VyID0gbmV3IEFjdGlvbk1hbmFnZXIoJGRpdiwgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5hY3Rpb25NYW5hZ2VyLmluaXQoKTtcclxuXHJcbiAgICAgICAgdGhpcy5ib3R0b21EaXYgPSBuZXcgQm90dG9tRGl2KHRoaXMsICRib3R0b21EaXZJbm5lciwgJGRpdik7XHJcbiAgICAgICAgdGhpcy5ib3R0b21EaXYuaW5pdEdVSSgpO1xyXG5cclxuICAgICAgICB0aGlzLnJpZ2h0RGl2ID0gbmV3IFJpZ2h0RGl2KHRoaXMsIHRoaXMuJHJpZ2h0RGl2SW5uZXIpO1xyXG4gICAgICAgIHRoaXMucmlnaHREaXYuaW5pdEdVSSgpO1xyXG5cclxuICAgICAgICBsZXQgJHJpZ2h0U2lkZUNvbnRhaW5lciA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3JpZ2h0ZGl2LXJpZ2h0c2lkZS1jb250YWluZXJcIj4nKTtcclxuICAgICAgICBsZXQgJGNvb3JkaW5hdGVzID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fY29vcmRpbmF0ZXNcIj4oMC8wKTwvZGl2PicpO1xyXG4gICAgICAgIHRoaXMuJHJpZ2h0RGl2SW5uZXIuYXBwZW5kKCRyaWdodFNpZGVDb250YWluZXIpO1xyXG4gICAgICAgICRyaWdodFNpZGVDb250YWluZXIuYXBwZW5kKCRjb29yZGluYXRlcyk7XHJcblxyXG4gICAgICAgIHRoaXMuZGVidWdnZXIgPSBuZXcgRGVidWdnZXIodGhpcywgdGhpcy4kZGVidWdnZXJEaXYsIG51bGwpO1xyXG5cclxuICAgICAgICB0aGlzLmludGVycHJldGVyID0gbmV3IEludGVycHJldGVyKHRoaXMsIHRoaXMuZGVidWdnZXIsXHJcbiAgICAgICAgICAgIG5ldyBQcm9ncmFtQ29udHJvbEJ1dHRvbnMoJGNvbnRyb2xzRGl2LCAkZWRpdG9yRGl2KSxcclxuICAgICAgICAgICAgdGhpcy4kcnVuRGl2KTtcclxuXHJcbiAgICAgICAgbGV0ICRpbmZvQnV0dG9uID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fYnV0dG9uIGpvX2FjdGl2ZSBpbWdfZWxsaXBzaXMtZGFya1wiIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDE2cHhcIj48L2Rpdj4nKTtcclxuICAgICAgICAkY29udHJvbHNEaXYuYXBwZW5kKCRpbmZvQnV0dG9uKTtcclxuXHJcbiAgICAgICAgJGluZm9CdXR0b24ub24oJ21vdXNlZG93bicsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgb3BlbkNvbnRleHRNZW51KFt7XHJcbiAgICAgICAgICAgICAgICBjYXB0aW9uOiBcIsOcYmVyIGRpZSBPbmxpbmUtSURFIC4uLlwiLFxyXG4gICAgICAgICAgICAgICAgbGluazogXCJodHRwczovL3d3dy5vbmxpbmUtaWRlLmRlXCIsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIG5vdGhpbmcgdG8gZG8uXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1dLCBldi5wYWdlWCArIDIsIGV2LnBhZ2VZICsgMik7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLmluaXRHVUkoKTtcclxuICAgICAgICAgICAgdGhpcy5lZGl0b3IuZWRpdG9yLmxheW91dCgpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbXBpbGVyID0gbmV3IENvbXBpbGVyKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLmNvbnRyb2xCdXR0b25zLnNwZWVkQ29udHJvbC5zZXRTcGVlZEluU3RlcHNQZXJTZWNvbmQodGhpcy5jb25maWcuc3BlZWQpO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXJ0VGltZXIoKTtcclxuICAgICAgICB9LCAyMDApO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcuaGlkZUVkaXRvcikge1xyXG4gICAgICAgICAgICAkY2VudGVyRGl2LmhpZGUoKTtcclxuICAgICAgICAgICAgJHJpZ2h0RGl2LmNzcyhcImZsZXhcIiwgXCIxXCIpO1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29uZmlnLmhpZGVTdGFydFBhbmVsKSB7XHJcbiAgICAgICAgICAgICAgICAkZGl2LmZpbmQoXCIuam9lX3JpZ2h0RGl2SW5uZXJcIikuY3NzKCdoZWlnaHQnLCAnY2FsYygxMDAlIC0gMjRweCknKTtcclxuICAgICAgICAgICAgICAgICRkaXYuZmluZChcIi5qb2VfY29udHJvbHNEaXZcIikuY3NzKCdwYWRkaW5nJywgJzJweCcpO1xyXG4gICAgICAgICAgICAgICAgJGRpdi5maW5kKFwiLmpvX3NwZWVkY29udHJvbC1vdXRlclwiKS5jc3MoJ3otaW5kZXgnLCAnMTAnKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICRkaXYuZmluZChcIi5qb2VfY29udHJvbHNEaXZcIikuaGlkZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgbWFrZUJyYWNrZXRFcnJvckRpdigpOiBKUXVlcnk8SFRNTEVsZW1lbnQ+IHtcclxuICAgICAgICByZXR1cm4galF1ZXJ5KGBcclxuICAgICAgICA8ZGl2IGNsYXNzPVwiam9fcGFyZW50aGVzaXNfd2FybmluZ1wiIHRpdGxlPVwiS2xhbW1lcndhcm51bmchXCIgc3R5bGU9XCJib3R0b206IDU1cHhcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiam9fd2FybmluZ19saWdodFwiPjwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJqb19wd19oZWFkaW5nXCI+eyB9PC9kaXY+XHJcbiAgICAgICAgPGRpdiB0aXRsZT1cIkxldHp0ZW4gU2Nocml0dCByw7xja2fDpG5naWdcIiBcclxuICAgICAgICAgICAgY2xhc3M9XCJqb19wd191bmRvIGltZ191bmRvIGpvX2J1dHRvbiBqb19hY3RpdmVcIj48L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICBgKTtcclxuICAgIH1cclxuXHJcbiAgICBtYWtlQ29kZVJlc2V0TW9kYWxXaW5kb3coJHBhcmVudDogSlF1ZXJ5PEhUTUxFbGVtZW50Pik6IEpRdWVyeTxIVE1MRWxlbWVudD4ge1xyXG4gICAgICAgIGxldCAkd2luZG93ID0galF1ZXJ5KFxyXG4gICAgICAgICAgICBgXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb2VfY29kZVJlc2V0TW9kYWxcIj5cclxuICAgICAgICAgICAgPGRpdiBzdHlsZT1cImZsZXg6IDFcIj48L2Rpdj5cclxuICAgICAgICAgICAgPGRpdiBzdHlsZT1cImRpc3BsYXk6IGZsZXhcIj5cclxuICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJmbGV4OiAxXCI+PC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwicGFkZGluZy1sZWZ0OiAzMHB4O1wiPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cImNvbG9yOiByZWQ7IG1hcmdpbi1ib3R0b206IDEwcHg7IGZvbnQtd2VpZ2h0OiBib2xkXCI+V2FybnVuZzo8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDxkaXY+U29sbCBkZXIgQ29kZSB3aXJrbGljaCBhdWYgZGVuIEF1c2dhbmdzenVzdGFuZCB6dXLDvGNrZ2VzZXR6dCB3ZXJkZW4/PC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8ZGl2PkFsbGUgdm9uIERpciBnZW1hY2h0ZW4gw4RuZGVydW5nZW4gd2VyZGVuIGRhbWl0IHZlcndvcmZlbi48L2Rpdj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cImZsZXg6IDFcIj48L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb2VfY29kZVJlc2V0TW9kYWxCdXR0b25zXCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb2VfY29kZVJlc2V0TW9kYWxDYW5jZWwgam9fYnV0dG9uIGpvX2FjdGl2ZVwiPkFiYnJlY2hlbjwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9lX2NvZGVSZXNldE1vZGFsT0sgam9fYnV0dG9uIGpvX2FjdGl2ZVwiPk9LPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IHN0eWxlPVwiZmxleDogMlwiPjwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICBgXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgJHdpbmRvdy5oaWRlKCk7XHJcblxyXG4gICAgICAgICRwYXJlbnQuYXBwZW5kKCR3aW5kb3cpO1xyXG5cclxuICAgICAgICBqUXVlcnkoXCIuam9lX2NvZGVSZXNldE1vZGFsQ2FuY2VsXCIpLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAkd2luZG93LmhpZGUoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgalF1ZXJ5KFwiLmpvZV9jb2RlUmVzZXRNb2RhbE9LXCIpLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgdGhpcy5pbml0U2NyaXB0cygpO1xyXG4gICAgICAgICAgICB0aGlzLmRlbGV0ZVNjcmlwdHNJbkRCKCk7XHJcblxyXG4gICAgICAgICAgICAkd2luZG93LmhpZGUoKTtcclxuICAgICAgICAgICAgdGhpcy4kcmVzZXRCdXR0b24uaGlkZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbXBpbGVSdW5zQWZ0ZXJDb2RlUmVzZXQgPSAxO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuICR3aW5kb3c7XHJcbiAgICB9XHJcblxyXG4gICAgc2hvd1Byb2dyYW1Qb2ludGVyUG9zaXRpb24oZmlsZTogRmlsZSwgcG9zaXRpb246IFRleHRQb3NpdGlvbikge1xyXG5cclxuICAgICAgICBpZiAoZmlsZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoRmlsZUxpc3QpIHtcclxuICAgICAgICAgICAgbGV0IGZpbGVEYXRhID0gdGhpcy5maWxlRXhwbG9yZXIuZmlsZXMuZmluZCgoZmlsZURhdGEpID0+IGZpbGVEYXRhLm1vZHVsZS5maWxlID09IGZpbGUpO1xyXG4gICAgICAgICAgICBpZiAoZmlsZURhdGEgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZmlsZURhdGEubW9kdWxlICE9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0TW9kdWxlQWN0aXZlKGZpbGVEYXRhLm1vZHVsZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMucHJvZ3JhbVBvaW50ZXJNb2R1bGUgPSBmaWxlRGF0YS5tb2R1bGU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9ncmFtUG9pbnRlck1vZHVsZSA9IHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5nZXRGaXJzdE1vZHVsZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHJhbmdlID0ge1xyXG4gICAgICAgICAgICBzdGFydENvbHVtbjogcG9zaXRpb24uY29sdW1uLCBzdGFydExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgIGVuZENvbHVtbjogcG9zaXRpb24uY29sdW1uICsgcG9zaXRpb24ubGVuZ3RoLCBlbmRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRNb25hY29FZGl0b3IoKS5yZXZlYWxSYW5nZUluQ2VudGVySWZPdXRzaWRlVmlld3BvcnQocmFuZ2UpO1xyXG4gICAgICAgIHRoaXMucHJvZ3JhbVBvaW50ZXJEZWNvcmF0aW9uID0gdGhpcy5nZXRNb25hY29FZGl0b3IoKS5kZWx0YURlY29yYXRpb25zKHRoaXMucHJvZ3JhbVBvaW50ZXJEZWNvcmF0aW9uLCBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJhbmdlOiByYW5nZSxcclxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IHsgY2xhc3NOYW1lOiAnam9fcmV2ZWFsUHJvZ3JhbVBvaW50ZXInLCBpc1dob2xlTGluZTogdHJ1ZSB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJhbmdlOiByYW5nZSxcclxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IHsgYmVmb3JlQ29udGVudENsYXNzTmFtZTogJ2pvX3JldmVhbFByb2dyYW1Qb2ludGVyQmVmb3JlJyB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdKTtcclxuXHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBoaWRlUHJvZ3JhbVBvaW50ZXJQb3NpdGlvbigpIHtcclxuICAgICAgICBpZiAodGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKSA9PSB0aGlzLnByb2dyYW1Qb2ludGVyTW9kdWxlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0TW9uYWNvRWRpdG9yKCkuZGVsdGFEZWNvcmF0aW9ucyh0aGlzLnByb2dyYW1Qb2ludGVyRGVjb3JhdGlvbiwgW10pO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnByb2dyYW1Qb2ludGVyTW9kdWxlID0gbnVsbDtcclxuICAgICAgICB0aGlzLnByb2dyYW1Qb2ludGVyRGVjb3JhdGlvbiA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VGaWxlc0RpdigpOiBKUXVlcnk8SFRNTEVsZW1lbnQ+IHtcclxuXHJcblxyXG4gICAgICAgIGxldCAkZmlsZXNEaXYgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfYm90dG9tRGl2RmlsZXMgam9fc2Nyb2xsYWJsZVwiPjwvZGl2PicpO1xyXG5cclxuICAgICAgICBsZXQgJGZpbGVzSGVhZGVyID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX2ZpbGVzSGVhZGVyIGpvX3RhYmhlYWRpbmcgam9fYWN0aXZlXCIgIHN0eWxlPVwibGluZS1oZWlnaHQ6IDI0cHhcIj5Qcm9ncmFtbWRhdGVpZW48L2Rpdj4nKTtcclxuXHJcbiAgICAgICAgdGhpcy4kZmlsZXNMaXN0RGl2ID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX2ZpbGVzTGlzdCBqb19zY3JvbGxhYmxlXCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgLy8gZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IDIwOyBpbmRleCsrKSB7ICAgICAgICAgICAgXHJcbiAgICAgICAgLy8gICAgIGxldCAkZmlsZSA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX2ZpbGUgam9famF2YVwiPjxkaXYgY2xhc3M9XCJqb19maWxlaW1hZ2VcIj48L2Rpdj48ZGl2IGNsYXNzPVwiam9fZmlsZW5hbWVcIj48L2Rpdj48L2Rpdj48L2Rpdj4nKTtcclxuICAgICAgICAvLyAgICAgJGZpbGVzTGlzdC5hcHBlbmQoJGZpbGUpO1xyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgJGZpbGVzRGl2LmFwcGVuZCgkZmlsZXNIZWFkZXIsIHRoaXMuJGZpbGVzTGlzdERpdik7XHJcblxyXG4gICAgICAgIHJldHVybiAkZmlsZXNEaXY7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhcnRUaW1lcigpIHtcclxuICAgICAgICBpZiAodGhpcy50aW1lckhhbmRsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lckhhbmRsZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy50aW1lckhhbmRsZSA9IHNldEludGVydmFsKCgpID0+IHtcclxuXHJcbiAgICAgICAgICAgIHRoYXQuY29tcGlsZUlmRGlydHkoKTtcclxuXHJcbiAgICAgICAgfSwgNTAwKTtcclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbXBpbGVJZkRpcnR5KCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50V29ya3NwYWNlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5pc0RpcnR5KCkgJiZcclxuICAgICAgICAgICAgdGhpcy5jb21waWxlci5jb21waWxlclN0YXR1cyAhPSBDb21waWxlclN0YXR1cy5jb21waWxpbmdcclxuICAgICAgICAgICAgJiYgdGhpcy5pbnRlcnByZXRlci5zdGF0ZSAhPSBJbnRlcnByZXRlclN0YXRlLnJ1bm5pbmdcclxuICAgICAgICAgICAgJiYgdGhpcy5pbnRlcnByZXRlci5zdGF0ZSAhPSBJbnRlcnByZXRlclN0YXRlLnBhdXNlZCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY29tcGlsZXIuY29tcGlsZSh0aGlzLmN1cnJlbnRXb3Jrc3BhY2UubW9kdWxlU3RvcmUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBlcnJvcnMgPSB0aGlzLlxyXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbURpdj8uZXJyb3JNYW5hZ2VyPy5zaG93RXJyb3JzKHRoaXMuY3VycmVudFdvcmtzcGFjZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5lZGl0b3Iub25EaWRDaGFuZ2VDdXJzb3JQb3NpdGlvbihudWxsKTsgLy8gbWFyayBvY2N1cnJlbmNpZXMgb2Ygc3ltYm9sIHVuZGVyIGN1cnNvclxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHJpbnRQcm9ncmFtKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy52ZXJzaW9uKys7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0YWJsZSA9IHRoaXMuaW50ZXJwcmV0ZXIuZ2V0U3RhcnRhYmxlTW9kdWxlKHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZSkgIT0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhcnRhYmxlICYmXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLm5vdF9pbml0aWFsaXplZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29weUV4ZWN1dGFibGVNb2R1bGVTdG9yZVRvSW50ZXJwcmV0ZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUuZG9uZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmhpZGVTdGFydFBhbmVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWN0aW9uTWFuYWdlci50cmlnZ2VyKCdpbnRlcnByZXRlci5zdGFydCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLmludGVycHJldGVyLmluaXQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXN0YXJ0YWJsZSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLmludGVycHJldGVyLnN0YXRlID09IEludGVycHJldGVyU3RhdGUuZG9uZSB8fCB0aGlzLmludGVycHJldGVyLnN0YXRlID09IEludGVycHJldGVyU3RhdGUuZXJyb3IpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLm5vdF9pbml0aWFsaXplZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5kcmF3Q2xhc3NEaWFncmFtcyghdGhpcy5yaWdodERpdi5pc0NsYXNzRGlhZ3JhbUVuYWJsZWQoKSk7XHJcblxyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21waWxlci5jb21waWxlclN0YXR1cyA9IENvbXBpbGVyU3RhdHVzLmVycm9yO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICBjb25zaWRlclNob3dpbmdDb2RlUmVzZXRCdXR0b24oKSB7XHJcbiAgICAgICAgdGhpcy5jb21waWxlUnVuc0FmdGVyQ29kZVJlc2V0Kys7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tcGlsZVJ1bnNBZnRlckNvZGVSZXNldCA9PSAzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJHJlc2V0QnV0dG9uLmZhZGVJbigxMDAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcmludFByb2dyYW0oKSB7XHJcblxyXG4gICAgICAgIHRoaXMuYm90dG9tRGl2LnByaW50TW9kdWxlVG9Cb3R0b21EaXYodGhpcy5jdXJyZW50V29ya3NwYWNlLCB0aGlzLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd0NsYXNzRGlhZ3JhbXMob25seVVwZGF0ZUlkZW50aWZpZXJzOiBib29sZWFuKSB7XHJcbiAgICAgICAgLy8gY2xlYXJUaW1lb3V0KHRoaXMuZGVib3VuY2VEaWFncmFtRHJhd2luZyk7XHJcbiAgICAgICAgLy8gdGhpcy5kZWJvdW5jZURpYWdyYW1EcmF3aW5nID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgLy8gICAgIHRoaXMucmlnaHREaXY/LmNsYXNzRGlhZ3JhbT8uZHJhd0RpYWdyYW0odGhpcy5jdXJyZW50V29ya3NwYWNlLCBvbmx5VXBkYXRlSWRlbnRpZmllcnMpO1xyXG4gICAgICAgIC8vIH0sIDUwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29weUV4ZWN1dGFibGVNb2R1bGVTdG9yZVRvSW50ZXJwcmV0ZXIoKSB7XHJcbiAgICAgICAgbGV0IG1zID0gdGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLmNvcHkoKTtcclxuICAgICAgICB0aGlzLmludGVycHJldGVyLm1vZHVsZVN0b3JlID0gbXM7XHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlci5tb2R1bGVTdG9yZVZlcnNpb24gPSB0aGlzLnZlcnNpb247XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmludGVycHJldGVyLnN0YXRlID09IEludGVycHJldGVyU3RhdGUubm90X2luaXRpYWxpemVkICYmIHRoaXMucHJvZ3JhbUlzRXhlY3V0YWJsZSkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUuZG9uZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgc2F2ZVdvcmtzcGFjZVRvRmlsZSgpIHtcclxuICAgICAgICBsZXQgZmlsZW5hbWU6IHN0cmluZyA9IHByb21wdChcIkJpdHRlIGdlYmVuIFNpZSBkZW4gRGF0ZWluYW1lbiBlaW5cIiwgdGhpcy5jb25maWcuanNvbkZpbGVuYW1lKTtcclxuICAgICAgICBpZiAoZmlsZW5hbWUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBhbGVydChcIkRlciBEYXRlaW5hbWUgaXN0IGxlZXIsIGRhaGVyIHdpcmQgbmljaHRzIGdlc3BlaWNoZXJ0LlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWZpbGVuYW1lLmVuZHNXaXRoKFwiLmpzb25cIikpIGZpbGVuYW1lID0gZmlsZW5hbWUgKyBcIi5qc29uXCI7XHJcbiAgICAgICAgbGV0IHdzID0gdGhpcy5jdXJyZW50V29ya3NwYWNlO1xyXG4gICAgICAgIGxldCBuYW1lOiBzdHJpbmcgPSB3cy5uYW1lLnJlcGxhY2UoL1xcLy9nLCBcIl9cIik7XHJcbiAgICAgICAgZG93bmxvYWRGaWxlKHdzLnRvRXhwb3J0ZWRXb3Jrc3BhY2UoKSwgZmlsZW5hbWUpXHJcbiAgICB9XHJcblxyXG5cclxuICAgIG1ha2VCb3R0b21EaXYoJGJvdHRvbURpdjogSlF1ZXJ5PEhUTUxFbGVtZW50PiwgJGJ1dHRvbkRpdjogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG5cclxuICAgICAgICBsZXQgJHRhYmhlYWRpbmdzID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fdGFiaGVhZGluZ3NcIj48L2Rpdj4nKTtcclxuICAgICAgICAkdGFiaGVhZGluZ3MuY3NzKCdwb3NpdGlvbicsICdyZWxhdGl2ZScpO1xyXG4gICAgICAgIGxldCAkdGhSaWdodFNpZGUgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfdGFiaGVhZGluZy1yaWdodCBqb19ub0hlYWRpbmdcIj48L2Rpdj4nKTtcclxuXHJcbiAgICAgICAgJHRoUmlnaHRTaWRlLmFwcGVuZCgkYnV0dG9uRGl2KTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhDb25zb2xlKSB7XHJcbiAgICAgICAgICAgIGxldCAkdGhDb25zb2xlQ2xlYXIgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJpbWdfY2xlYXItZGFyayBqb19idXR0b24gam9fYWN0aXZlIGpvX2NvbnNvbGUtY2xlYXJcIicgK1xyXG4gICAgICAgICAgICAgICAgJ3N0eWxlPVwiZGlzcGxheTogbm9uZTsgbWFyZ2luLWxlZnQ6IDhweDtcIiB0aXRsZT1cIkNvbnNvbGUgbGVlcmVuXCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgICAgICR0aFJpZ2h0U2lkZS5hcHBlbmQoJHRoQ29uc29sZUNsZWFyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoRXJyb3JMaXN0KSB7XHJcbiAgICAgICAgICAgIGxldCAkdGhFcnJvcnMgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb190YWJoZWFkaW5nIGpvX2FjdGl2ZVwiIGRhdGEtdGFyZ2V0PVwiam9fZXJyb3JzVGFiXCIgc3R5bGU9XCJsaW5lLWhlaWdodDogMjRweFwiPkZlaGxlcjwvZGl2PicpO1xyXG4gICAgICAgICAgICAkdGFiaGVhZGluZ3MuYXBwZW5kKCR0aEVycm9ycyk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhDb25zb2xlKSB7XHJcbiAgICAgICAgICAgIGxldCAkdGhDb25zb2xlID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fdGFiaGVhZGluZyBqb19jb25zb2xlLXRhYlwiIGRhdGEtdGFyZ2V0PVwiam9fY29uc29sZVRhYlwiIHN0eWxlPVwibGluZS1oZWlnaHQ6IDI0cHhcIj5Db25zb2xlPC9kaXY+Jyk7XHJcbiAgICAgICAgICAgICR0YWJoZWFkaW5ncy5hcHBlbmQoJHRoQ29uc29sZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcud2l0aFBDb2RlKSB7XHJcbiAgICAgICAgICAgIGxldCAkdGhQQ29kZSA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3RhYmhlYWRpbmdcIiBkYXRhLXRhcmdldD1cImpvX3Bjb2RlVGFiXCIgc3R5bGU9XCJsaW5lLWhlaWdodDogMjRweFwiPlBDb2RlPC9kaXY+Jyk7XHJcbiAgICAgICAgICAgICR0YWJoZWFkaW5ncy5hcHBlbmQoJHRoUENvZGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgJHRhYmhlYWRpbmdzLmFwcGVuZCgkdGhSaWdodFNpZGUpO1xyXG5cclxuICAgICAgICAkYm90dG9tRGl2LmFwcGVuZCgkdGFiaGVhZGluZ3MpO1xyXG5cclxuICAgICAgICBsZXQgJHRhYnMgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb190YWJzIGpvX3Njcm9sbGFibGVcIj48L2Rpdj4nKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndpdGhFcnJvckxpc3QpIHtcclxuICAgICAgICAgICAgbGV0ICR0YWJFcnJvciA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX2FjdGl2ZSBqb19zY3JvbGxhYmxlIGpvX2Vycm9yc1RhYlwiPjwvZGl2PicpO1xyXG4gICAgICAgICAgICAkdGFicy5hcHBlbmQoJHRhYkVycm9yKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoQ29uc29sZSkge1xyXG4gICAgICAgICAgICBsZXQgJHRhYkNvbnNvbGUgPSBqUXVlcnkoXHJcbiAgICAgICAgICAgICAgICBgXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImpvX2VkaXRvckZvbnRTaXplIGpvX2NvbnNvbGVUYWJcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiam9fY29uc29sZS1pbm5lclwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9fc2Nyb2xsYWJsZSBqb19jb25zb2xlLXRvcFwiPjwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9fY29tbWFuZGxpbmVcIj48L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgIGApO1xyXG5cclxuICAgICAgICAgICAgJHRhYnMuYXBwZW5kKCR0YWJDb25zb2xlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53aXRoUENvZGUpIHtcclxuICAgICAgICAgICAgbGV0ICR0YWJQQ29kZSA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3Njcm9sbGFibGUgam9fcGNvZGVUYWJcIj5QQ29kZTwvZGl2PicpO1xyXG4gICAgICAgICAgICAkdGFicy5hcHBlbmQoJHRhYlBDb2RlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRib3R0b21EaXYuYXBwZW5kKCR0YWJzKTtcclxuXHJcbiAgICB9XHJcbiAgICBsb2FkV29ya3NwYWNlRnJvbUZpbGUoZmlsZTogZ2xvYmFsVGhpcy5GaWxlKSB7XHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIGlmIChmaWxlID09IG51bGwpIHJldHVybjtcclxuICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuICAgICAgICByZWFkZXIub25sb2FkID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCB0ZXh0OiBzdHJpbmcgPSA8c3RyaW5nPmV2ZW50LnRhcmdldC5yZXN1bHQ7XHJcbiAgICAgICAgICAgIGlmICghdGV4dC5zdGFydHNXaXRoKFwie1wiKSkge1xyXG4gICAgICAgICAgICAgICAgYWxlcnQoYDxkaXY+RGFzIEZvcm1hdCBkZXIgRGF0ZWkgJHtmaWxlLm5hbWV9IHBhc3N0IG5pY2h0LjwvZGl2PmApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZXc6IEV4cG9ydGVkV29ya3NwYWNlID0gSlNPTi5wYXJzZSh0ZXh0KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChldy5tb2R1bGVzID09IG51bGwgfHwgZXcubmFtZSA9PSBudWxsIHx8IGV3LnNldHRpbmdzID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGFsZXJ0KGA8ZGl2PkRhcyBGb3JtYXQgZGVyIERhdGVpICR7ZmlsZS5uYW1lfSBwYXNzdCBuaWNodC48L2Rpdj5gKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHdzOiBXb3Jrc3BhY2UgPSBuZXcgV29ya3NwYWNlKGV3Lm5hbWUsIHRoaXMsIDApO1xyXG4gICAgICAgICAgICB3cy5zZXR0aW5ncyA9IGV3LnNldHRpbmdzO1xyXG4gICAgICAgICAgICB3cy5hbHRlckFkZGl0aW9uYWxMaWJyYXJpZXMoKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IG1vIG9mIGV3Lm1vZHVsZXMpIHtcclxuICAgICAgICAgICAgICAgIGxldCBmOiBGaWxlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG1vLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlydHk6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IG1vLnRleHQsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dF9iZWZvcmVfcmV2aXNpb246IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VibWl0dGVkX2RhdGU6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgc3R1ZGVudF9lZGl0ZWRfYWZ0ZXJfcmV2aXNpb246IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHZlcnNpb246IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNfY29weV9vZl9pZDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICByZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbjogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uOiBudWxsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBtID0gbmV3IE1vZHVsZShmLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgIHdzLm1vZHVsZVN0b3JlLnB1dE1vZHVsZShtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGF0LmN1cnJlbnRXb3Jrc3BhY2UgPSB3cztcclxuXHJcbiAgICAgICAgICAgIGlmKHRoYXQuZmlsZUV4cGxvcmVyICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgdGhhdC5maWxlRXhwbG9yZXIucmVtb3ZlQWxsRmlsZXMoKTtcclxuICAgICAgICAgICAgICAgIHdzLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpLmZvckVhY2gobW9kdWxlID0+IHRoYXQuZmlsZUV4cGxvcmVyLmFkZE1vZHVsZShtb2R1bGUpKTtcclxuICAgICAgICAgICAgICAgIHRoYXQuZmlsZUV4cGxvcmVyLnNldEZpcnN0RmlsZUFjdGl2ZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRNb2R1bGVBY3RpdmUodGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLmdldEZpcnN0TW9kdWxlKCkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGF0LnNhdmVTY3JpcHRzKCk7XHJcblxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1ha2VSaWdodERpdigpOiBKUXVlcnk8SFRNTEVsZW1lbnQ+IHtcclxuXHJcbiAgICAgICAgbGV0ICRyaWdodERpdiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvZV9yaWdodERpdlwiPjwvZGl2PicpO1xyXG4gICAgICAgIHRoaXMuJHJpZ2h0RGl2SW5uZXIgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb2VfcmlnaHREaXZJbm5lclwiPjwvZGl2PicpO1xyXG4gICAgICAgICRyaWdodERpdi5hcHBlbmQodGhpcy4kcmlnaHREaXZJbm5lcik7XHJcblxyXG4gICAgICAgIHRoaXMuJGRlYnVnZ2VyRGl2ID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9lX2RlYnVnZ2VyRGl2XCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgdGhpcy4kcnVuRGl2ID0galF1ZXJ5KFxyXG4gICAgICAgICAgICBgXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb190YWIgam9fYWN0aXZlIGpvX3J1blwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9fcnVuLXByb2dyYW1lbmRcIj5Qcm9ncmFtbSBiZWVuZGV0PC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb19ydW4taW5wdXRcIj5cclxuICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiam9fcnVuLWlucHV0LW1lc3NhZ2VcIiBjbGFzcz1cImpvX3JpeFwiPkJpdHRlIGdlYmVuIFNpZSBlaW5lIFphaGwgZWluITwvZGl2PlxyXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cImpvX3J1bi1pbnB1dC1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJqb19yaXhcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiam9fcnVuLWlucHV0LWJ1dHRvbi1vdXRlclwiIGNsYXNzPVwiam9fcml4XCI+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImpvX3J1bi1pbnB1dC1idXR0b25cIiBjbGFzcz1cImpvX3JpeFwiPk9LPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImpvX3J1bi1pbnB1dC1lcnJvclwiIGNsYXNzPVwiam9fcml4XCI+PC9kaXY+XHJcbiAgICA8L2Rpdj5cclxuICAgIDwvZGl2PlxyXG4gICAgPC9kaXY+IFxyXG4gICAgPGRpdiBjbGFzcz1cImpvX3J1bi1pbm5lclwiPlxyXG4gICAgPGRpdiBjbGFzcz1cImpvX2dyYXBoaWNzXCI+PC9kaXY+XHJcbiAgICA8ZGl2IGNsYXNzPVwiam9fb3V0cHV0IGpvX3Njcm9sbGFibGVcIj48L2Rpdj5cclxuICAgIDwvZGl2PlxyXG4gICAgXHJcbiAgICA8L2Rpdj5cclxuICAgIFxyXG4gICAgYCk7XHJcblxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLmhpZGVFZGl0b3IpIHtcclxuICAgICAgICAgICAgbGV0ICR0YWJoZWFkaW5ncyA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3RhYmhlYWRpbmdzXCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgICAgICR0YWJoZWFkaW5ncy5jc3MoJ3Bvc2l0aW9uJywgJ3JlbGF0aXZlJyk7XHJcbiAgICAgICAgICAgIGxldCAkdGhSdW4gPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb190YWJoZWFkaW5nIGpvX2FjdGl2ZVwiIGRhdGEtdGFyZ2V0PVwiam9fcnVuXCIgc3R5bGU9XCJsaW5lLWhlaWdodDogMjRweFwiPkF1c2dhYmU8L2Rpdj4nKTtcclxuICAgICAgICAgICAgbGV0ICR0aFZhcmlhYmxlcyA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3RhYmhlYWRpbmcgam9fY29uc29sZS10YWJcIiBkYXRhLXRhcmdldD1cImpvX3ZhcmlhYmxlc1RhYlwiIHN0eWxlPVwibGluZS1oZWlnaHQ6IDI0cHhcIj5WYXJpYWJsZW48L2Rpdj4nKTtcclxuICAgICAgICAgICAgJHRhYmhlYWRpbmdzLmFwcGVuZCgkdGhSdW4sICR0aFZhcmlhYmxlcyk7XHJcbiAgICAgICAgICAgIHRoaXMuJHJpZ2h0RGl2SW5uZXIuYXBwZW5kKCR0YWJoZWFkaW5ncyk7XHJcbiAgICAgICAgICAgIGxldCAkdmQgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb19zY3JvbGxhYmxlIGpvX2VkaXRvckZvbnRTaXplIGpvX3ZhcmlhYmxlc1RhYlwiPjwvZGl2PicpO1xyXG5cclxuICAgICAgICAgICAgbGV0ICRhbHRlcm5hdGl2ZVRleHQgPSBqUXVlcnkoYFxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9fYWx0ZXJuYXRpdmVUZXh0IGpvX3Njcm9sbGFibGVcIj5cclxuICAgICAgICAgICAgPGRpdiBzdHlsZT1cImZvbnQtd2VpZ2h0OiBib2xkXCI+VGlwcDo8L2Rpdj5cclxuICAgICAgICAgICAgRGllIFZhcmlhYmxlbiBzaW5kIG51ciBkYW5uIHNpY2h0YmFyLCB3ZW5uIGRhcyBQcm9ncmFtbVxyXG4gICAgICAgICAgICA8dWw+XHJcbiAgICAgICAgICAgIDxsaT5pbSBFaW56ZWxzY2hyaXR0bW9kdXMgYXVzZ2Vmw7xocnQgd2lyZChLbGljayBhdWYgPHNwYW4gY2xhc3M9XCJpbWdfc3RlcC1vdmVyLWRhcmsgam9faW5saW5lLWltYWdlXCI+PC9zcGFuPiksPC9saT5cclxuICAgICAgICAgICAgPGxpPmFuIGVpbmVtIEJyZWFrcG9pbnQgaMOkbHQgKFNldHplbiBlaW5lcyBCcmVha3BvaW50cyBtaXQgTWF1c2tsaWNrIGxpbmtzIG5lYmVuIGRlbiBaZWlsZW5udW1tZXJuIHVuZCBhbnNjaGxpZcOfZW5kZXMgU3RhcnRlbiBkZXMgUHJvZ3JhbW1zIG1pdCBcclxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiaW1nX3N0YXJ0LWRhcmsgam9faW5saW5lLWltYWdlXCI+PC9zcGFuPikgb2RlciA8L2xpPlxyXG4gICAgICAgICAgICAgICAgPGxpPmluIHNlaHIgbmllZHJpZ2VyIEdlc2Nod2luZGlna2VpdCBhdXNnZWbDvGhydCB3aXJkICh3ZW5pZ2VyIGFscyAxMCBTY2hyaXR0ZS9zKS5cclxuICAgICAgICAgICAgICAgIDwvdWw+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIGApO1xyXG5cclxuICAgICAgICAgICAgJHZkLmFwcGVuZCh0aGlzLiRkZWJ1Z2dlckRpdiwgJGFsdGVybmF0aXZlVGV4dCk7XHJcbiAgICAgICAgICAgIGxldCAkdGFicyA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3RhYnMgam9fc2Nyb2xsYWJsZVwiPjwvZGl2PicpO1xyXG4gICAgICAgICAgICAkdGFicy5hcHBlbmQodGhpcy4kcnVuRGl2LCAkdmQpO1xyXG4gICAgICAgICAgICB0aGlzLiRyaWdodERpdklubmVyLmFwcGVuZCgkdGFicyk7XHJcbiAgICAgICAgICAgIG1ha2VUYWJzKCRyaWdodERpdik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy4kcmlnaHREaXZJbm5lci5hcHBlbmQodGhpcy4kcnVuRGl2KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAkcmlnaHREaXY7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0U2VtaWNvbG9uQW5nZWwoKTogU2VtaWNvbG9uQW5nZWwge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbWljb2xvbkFuZ2VsO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuXHJcbiJdfQ==