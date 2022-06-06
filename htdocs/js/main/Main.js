import { NetworkManager } from "../communication/NetworkManager.js";
import { Compiler, CompilerStatus } from "../compiler/Compiler.js";
import { booleanPrimitiveType, charPrimitiveType, doublePrimitiveType, floatPrimitiveType, intPrimitiveType, stringPrimitiveType, voidPrimitiveType, IntegerType, DoubleType, CharacterType, BooleanType, FloatType, longPrimitiveType, LongType } from "../compiler/types/PrimitiveTypes.js";
import { Debugger } from "../interpreter/Debugger.js";
import { Interpreter, InterpreterState } from "../interpreter/Interpreter.js";
import { Workspace } from "../workspace/Workspace.js";
import { ActionManager } from "./gui/ActionManager.js";
import { BottomDiv } from "./gui/BottomDiv.js";
import { Editor } from "./gui/Editor.js";
import { Formatter } from "./gui/Formatter.js";
import { Helper } from "./gui/Helper.js";
import { MainMenu } from "./gui/MainMenu.js";
import { ProgramControlButtons } from "./gui/ProgramControlButtons.js";
import { ProjectExplorer } from "./gui/ProjectExplorer.js";
import { RightDiv } from "./gui/RightDiv.js";
import { Sliders } from "./gui/Sliders.js";
import { TeacherExplorer } from "./gui/TeacherExplorer.js";
import { ThemeManager } from "./gui/ThemeManager.js";
import { Login } from "./Login.js";
import { ViewModeController } from "./gui/ViewModeController.js";
import { SemicolonAngel } from "../compiler/parser/SemicolonAngel.js";
import { WindowStateManager } from "./gui/WindowStateManager.js";
import { checkIfMousePresent } from "../tools/HtmlTools.js";
import { InconsistencyFixer } from "../workspace/InconsistencyFixer.js";
export class Main {
    constructor() {
        this.repositoryOn = true;
        this.workspaceList = [];
        this.windowStateManager = new WindowStateManager(this);
        this.startupComplete = 2;
        this.programIsExecutable = false;
        this.version = 0;
        this.userDataDirty = false;
    }
    isEmbedded() { return false; }
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
    // VORSICHT: ggf. Module -> any
    getCurrentlyEditedModule() {
        return this.projectExplorer.getCurrentlyEditedModule();
    }
    getActionManager() {
        return this.actionManager;
    }
    showProgramPointerPosition(file, position) {
        this.projectExplorer.showProgramPointerPosition(file, position);
    }
    hideProgramPointerPosition() {
        this.projectExplorer.hideProgramPointerPosition();
    }
    getCompiler() {
        return this.compiler;
    }
    setModuleActive(module) {
        this.projectExplorer.setModuleActive(module);
    }
    getSemicolonAngel() {
        return this.semicolonAngel;
    }
    jumpToDeclaration(module, declaration) {
        this.projectExplorer.setModuleActive(module);
        this.editor.editor.revealLineInCenter(declaration.position.line);
        this.editor.editor.setPosition({ column: declaration.position.column, lineNumber: declaration.position.line });
    }
    initGUI() {
        checkIfMousePresent();
        this.login = new Login(this);
        let hashIndex = window.location.href.indexOf('#');
        if (hashIndex > 0) {
            var ticket = window.location.href.substr(hashIndex + 1);
            window.history.replaceState({}, "Online-IDE", window.location.href.substr(0, hashIndex));
            this.login.initGUI(true);
            this.login.loginWithTicket(ticket);
        }
        else {
            this.login.initGUI(false);
        }
        this.actionManager = new ActionManager(null, this);
        this.actionManager.init();
        this.networkManager = new NetworkManager(this, jQuery('#bottomdiv-outer .jo_updateTimerDiv'));
        let sliders = new Sliders(this);
        sliders.initSliders();
        this.mainMenu = new MainMenu(this);
        this.projectExplorer = new ProjectExplorer(this, jQuery('#leftpanel>.jo_projectexplorer'));
        this.projectExplorer.initGUI();
        this.bottomDiv = new BottomDiv(this, jQuery('#bottomdiv-outer>.jo_bottomdiv-inner'), jQuery('body'));
        this.rightDiv = new RightDiv(this, jQuery('#rightdiv-inner'));
        this.rightDiv.initGUI();
        this.debugger = new Debugger(this, jQuery('#leftpanel>.jo_debugger'), jQuery('#leftpanel>.jo_projectexplorer'));
        this.interpreter = new Interpreter(this, this.debugger, new ProgramControlButtons(jQuery('#controls'), jQuery('#editor')), jQuery('#rightdiv-inner .jo_run'));
        this.interpreter.initGUI();
        this.initTypes();
        this.checkStartupComplete();
        this.correctPIXITransform();
        PIXI.utils.skipHello(); // don't show PIXI-Message in browser console
        this.themeManager = new ThemeManager();
        this.viewModeController = new ViewModeController(jQuery("#view-mode"), this);
        this.semicolonAngel = new SemicolonAngel(this);
    }
    correctPIXITransform() {
        PIXI.Transform.prototype.updateTransform = function (parentTransform) {
            var lt = this.localTransform;
            if (this._localID !== this._currentLocalID) {
                // get the matrix values of the displayobject based on its transform properties..
                // lt.a = this._cx * this.scale.x;
                // lt.b = this._sx * this.scale.x;
                // lt.c = this._cy * this.scale.y;
                // lt.d = this._sy * this.scale.y;
                // lt.tx = this.position.x - ((this.pivot.x * lt.a) + (this.pivot.y * lt.c));
                // lt.ty = this.position.y - ((this.pivot.x * lt.b) + (this.pivot.y * lt.d));
                this._currentLocalID = this._localID;
                // force an update..
                this._parentID = -1;
            }
            //@ts-ignore
            if (this._parentID !== parentTransform._worldID) {
                // concat the parent matrix with the objects transform.
                var pt = parentTransform.worldTransform;
                var wt = this.worldTransform;
                wt.a = (lt.a * pt.a) + (lt.b * pt.c);
                wt.b = (lt.a * pt.b) + (lt.b * pt.d);
                wt.c = (lt.c * pt.a) + (lt.d * pt.c);
                wt.d = (lt.c * pt.b) + (lt.d * pt.d);
                wt.tx = (lt.tx * pt.a) + (lt.ty * pt.c) + pt.tx;
                wt.ty = (lt.tx * pt.b) + (lt.ty * pt.d) + pt.ty;
                //@ts-ignore
                this._parentID = parentTransform._worldID;
                // update the id of the transform..
                this._worldID++;
            }
        };
    }
    initEditor() {
        this.editor = new Editor(this, true, false);
        new Formatter().init();
        // this.monaco_editor = 
        this.editor.initGUI(jQuery('#editor'));
        let that = this;
        jQuery(window).on('resize', (event) => {
            jQuery('#bottomdiv-outer').css('height', '150px');
            jQuery('#editor').css('height', (window.innerHeight - 150 - 30 - 2) + "px");
            that.editor.editor.layout();
            jQuery('#editor').css('height', "");
        });
        jQuery(window).trigger('resize');
        //        this.checkStartupComplete();
    }
    initTeacherExplorer(classdata) {
        this.teacherExplorer = new TeacherExplorer(this, classdata);
        this.teacherExplorer.initGUI();
    }
    // loadWorkspace() {
    //     this.workspaceList.push(getMockupWorkspace(this));
    //     this.projectExplorer.renderWorkspaces(this.workspaceList);
    //     this.projectExplorer.setWorkspaceActive(this.workspaceList[0]);
    //     this.checkStartupComplete();
    // }
    checkStartupComplete() {
        this.startupComplete--;
        if (this.startupComplete == 0) {
            this.start();
        }
    }
    initTypes() {
        voidPrimitiveType.init();
        intPrimitiveType.init();
        longPrimitiveType.init();
        floatPrimitiveType.init();
        doublePrimitiveType.init();
        booleanPrimitiveType.init();
        stringPrimitiveType.init();
        charPrimitiveType.init();
        IntegerType.init();
        LongType.init();
        FloatType.init();
        DoubleType.init();
        CharacterType.init();
        BooleanType.init();
    }
    start() {
        if (this.waitForGUICallback != null) {
            this.waitForGUICallback();
        }
        let that = this;
        setTimeout(() => {
            that.getMonacoEditor().layout();
        }, 200);
        this.compiler = new Compiler(this);
        this.startTimer();
        $(window).on('unload', function () {
            if (navigator.sendBeacon && that.user != null) {
                that.networkManager.sendUpdates(null, false, true);
                that.networkManager.sendUpdateUserSettings(() => { });
                that.interpreter.closeAllWebsockets();
            }
        });
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
                let errors = (_b = (_a = this.bottomDiv) === null || _a === void 0 ? void 0 : _a.errorManager) === null || _b === void 0 ? void 0 : _b.showErrors(this.currentWorkspace);
                this.projectExplorer.renderErrorCount(this.currentWorkspace, errors);
                this.editor.onDidChangeCursorPosition(null); // mark occurrencies of symbol under cursor
                this.printProgram();
                if (this.projectExplorer) {
                    this.version++;
                }
                let startable = this.interpreter.getStartableModule(this.currentWorkspace.moduleStore) != null;
                if (startable &&
                    this.interpreter.state == InterpreterState.not_initialized) {
                    this.copyExecutableModuleStoreToInterpreter();
                    this.interpreter.setState(InterpreterState.done);
                    // this.interpreter.init();
                }
                if (!startable &&
                    (this.interpreter.state == InterpreterState.done || this.interpreter.state == InterpreterState.error)) {
                    this.interpreter.setState(InterpreterState.not_initialized);
                }
                this.drawClassDiagrams(!this.rightDiv.isClassDiagramEnabled());
            }
            catch (e) {
                console.error(e);
                this.compiler.compilerStatus = CompilerStatus.error;
            }
        }
    }
    printProgram() {
        this.bottomDiv.printModuleToBottomDiv(this.currentWorkspace, this.projectExplorer.getCurrentlyEditedModule());
    }
    drawClassDiagrams(onlyUpdateIdentifiers) {
        clearTimeout(this.debounceDiagramDrawing);
        this.debounceDiagramDrawing = setTimeout(() => {
            var _a, _b;
            (_b = (_a = this.rightDiv) === null || _a === void 0 ? void 0 : _a.classDiagram) === null || _b === void 0 ? void 0 : _b.drawDiagram(this.currentWorkspace, onlyUpdateIdentifiers);
        }, 500);
    }
    copyExecutableModuleStoreToInterpreter() {
        let ms = this.currentWorkspace.moduleStore.copy();
        this.interpreter.moduleStore = ms;
        this.interpreter.moduleStoreVersion = this.version;
        if (this.interpreter.state == InterpreterState.not_initialized && this.programIsExecutable) {
            this.interpreter.setState(InterpreterState.done);
        }
    }
    removeWorkspace(w) {
        this.workspaceList.splice(this.workspaceList.indexOf(w), 1);
    }
    restoreWorkspaces(workspaces, fixInconsistencies) {
        this.workspaceList = [];
        this.currentWorkspace = null;
        // this.monaco.setModel(monaco.editor.createModel("Keine Datei vorhanden." , "text"));
        this.getMonacoEditor().updateOptions({ readOnly: true });
        for (let ws of workspaces.workspaces) {
            let workspace = Workspace.restoreFromData(ws, this);
            this.workspaceList.push(workspace);
            if (ws.id == this.user.currentWorkspace_id) {
                this.currentWorkspace = workspace;
            }
        }
        /**
         * Find inconsistencies and fix them
         */
        if (fixInconsistencies) {
            new InconsistencyFixer().start(this.workspaceList, this.networkManager, this);
        }
        this.projectExplorer.renderWorkspaces(this.workspaceList);
        if (this.currentWorkspace == null && this.workspaceList.length > 0) {
            this.currentWorkspace = this.workspaceList[0];
        }
        if (this.currentWorkspace != null) {
            this.projectExplorer.setWorkspaceActive(this.currentWorkspace, true);
        }
        else {
            this.projectExplorer.setModuleActive(null);
        }
        if (this.workspaceList.length == 0) {
            Helper.showHelper("newWorkspaceHelper", this, this.projectExplorer.workspaceListPanel.$captionElement);
        }
    }
    createNewWorkspace(name, owner_id) {
        return new Workspace(name, this, owner_id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGllbnQvbWFpbi9NYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlSLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDOUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMzRCxPQUFPLEVB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SUFBSSxJQUFJLEVBQUU7WUFDL0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDeEU7YUFBTTtZQUNILElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlDO1FBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFFaEMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUUxRztJQUdMLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxJQUFZLEVBQUUsUUFBZ0I7UUFDN0MsT0FBTyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FHSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENsYXNzRGF0YSwgVXNlckRhdGEsIFdvcmtzcGFjZXMgfSBmcm9tIFwiLi4vY29tbXVuaWNhdGlvbi9EYXRhLmpzXCI7XHJcbmltcG9ydCB7IE5ldHdvcmtNYW5hZ2VyIH0gZnJvbSBcIi4uL2NvbW11bmljYXRpb24vTmV0d29ya01hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgQ29tcGlsZXIsIENvbXBpbGVyU3RhdHVzIH0gZnJvbSBcIi4uL2NvbXBpbGVyL0NvbXBpbGVyLmpzXCI7XHJcbmltcG9ydCB7IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBjaGFyUHJpbWl0aXZlVHlwZSwgZG91YmxlUHJpbWl0aXZlVHlwZSwgZmxvYXRQcmltaXRpdmVUeXBlLCBpbnRQcmltaXRpdmVUeXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlLCB2b2lkUHJpbWl0aXZlVHlwZSwgSW50ZWdlclR5cGUsIERvdWJsZVR5cGUsIENoYXJhY3RlclR5cGUsIEJvb2xlYW5UeXBlLCBGbG9hdFR5cGUsIGxvbmdQcmltaXRpdmVUeXBlLCBMb25nVHlwZSB9IGZyb20gXCIuLi9jb21waWxlci90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBEZWJ1Z2dlciB9IGZyb20gXCIuLi9pbnRlcnByZXRlci9EZWJ1Z2dlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnRlcnByZXRlciwgSW50ZXJwcmV0ZXJTdGF0ZSB9IGZyb20gXCIuLi9pbnRlcnByZXRlci9JbnRlcnByZXRlci5qc1wiO1xyXG5pbXBvcnQgeyBXb3Jrc3BhY2UgfSBmcm9tIFwiLi4vd29ya3NwYWNlL1dvcmtzcGFjZS5qc1wiO1xyXG5pbXBvcnQgeyBBY3Rpb25NYW5hZ2VyIH0gZnJvbSBcIi4vZ3VpL0FjdGlvbk1hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgQm90dG9tRGl2IH0gZnJvbSBcIi4vZ3VpL0JvdHRvbURpdi5qc1wiO1xyXG5pbXBvcnQgeyBFZGl0b3IgfSBmcm9tIFwiLi9ndWkvRWRpdG9yLmpzXCI7XHJcbmltcG9ydCB7IEZvcm1hdHRlciB9IGZyb20gXCIuL2d1aS9Gb3JtYXR0ZXIuanNcIjtcclxuaW1wb3J0IHsgSGVscGVyIH0gZnJvbSBcIi4vZ3VpL0hlbHBlci5qc1wiO1xyXG5pbXBvcnQgeyBNYWluTWVudSB9IGZyb20gXCIuL2d1aS9NYWluTWVudS5qc1wiO1xyXG5pbXBvcnQgeyBQcm9ncmFtQ29udHJvbEJ1dHRvbnMgfSBmcm9tIFwiLi9ndWkvUHJvZ3JhbUNvbnRyb2xCdXR0b25zLmpzXCI7XHJcbmltcG9ydCB7IFByb2plY3RFeHBsb3JlciB9IGZyb20gXCIuL2d1aS9Qcm9qZWN0RXhwbG9yZXIuanNcIjtcclxuaW1wb3J0IHsgUmlnaHREaXYgfSBmcm9tIFwiLi9ndWkvUmlnaHREaXYuanNcIjtcclxuaW1wb3J0IHsgU2xpZGVycyB9IGZyb20gXCIuL2d1aS9TbGlkZXJzLmpzXCI7XHJcbmltcG9ydCB7IFRlYWNoZXJFeHBsb3JlciB9IGZyb20gXCIuL2d1aS9UZWFjaGVyRXhwbG9yZXIuanNcIjtcclxuaW1wb3J0IHsgVGhlbWVNYW5hZ2VyIH0gZnJvbSBcIi4vZ3VpL1RoZW1lTWFuYWdlci5qc1wiO1xyXG5pbXBvcnQgeyBMb2dpbiB9IGZyb20gXCIuL0xvZ2luLmpzXCI7XHJcbmltcG9ydCB7IE1haW5CYXNlIH0gZnJvbSBcIi4vTWFpbkJhc2UuanNcIlxyXG5pbXBvcnQgeyBNb2R1bGUsIEZpbGUgfSBmcm9tIFwiLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBUZXh0UG9zaXRpb24gfSBmcm9tIFwiLi4vY29tcGlsZXIvbGV4ZXIvVG9rZW4uanNcIjtcclxuaW1wb3J0IHsgVmlld01vZGVDb250cm9sbGVyIH0gZnJvbSBcIi4vZ3VpL1ZpZXdNb2RlQ29udHJvbGxlci5qc1wiO1xyXG5pbXBvcnQgeyBFcnJvck1hbmFnZXIgfSBmcm9tIFwiLi9ndWkvRXJyb3JNYW5hZ2VyLmpzXCI7XHJcbmltcG9ydCB7IFNlbWljb2xvbkFuZ2VsIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3BhcnNlci9TZW1pY29sb25BbmdlbC5qc1wiO1xyXG5pbXBvcnQgeyBTeW5jaHJvbml6YXRpb25NYW5hZ2VyIH0gZnJvbSBcIi4uL3JlcG9zaXRvcnkvc3luY2hyb25pemUvUmVwb3NpdG9yeVN5bmNocm9uaXphdGlvbk1hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgUmVwb3NpdG9yeUNyZWF0ZU1hbmFnZXIgfSBmcm9tIFwiLi4vcmVwb3NpdG9yeS91cGRhdGUvUmVwb3NpdG9yeUNyZWF0ZU1hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgUmVwb3NpdG9yeVNldHRpbmdzTWFuYWdlciB9IGZyb20gXCIuLi9yZXBvc2l0b3J5L3VwZGF0ZS9SZXBvc2l0b3J5U2V0dGluZ3NNYW5hZ2VyLmpzXCI7XHJcbmltcG9ydCB7IFJlcG9zaXRvcnlDaGVja291dE1hbmFnZXIgfSBmcm9tIFwiLi4vcmVwb3NpdG9yeS91cGRhdGUvUmVwb3NpdG9yeUNoZWNrb3V0TWFuYWdlci5qc1wiO1xyXG5pbXBvcnQgeyBXaW5kb3dTdGF0ZU1hbmFnZXIgfSBmcm9tIFwiLi9ndWkvV2luZG93U3RhdGVNYW5hZ2VyLmpzXCI7XHJcbmltcG9ydCB7IFRleHRQb3NpdGlvbldpdGhNb2R1bGUgfSBmcm9tIFwiLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgY2hlY2tJZk1vdXNlUHJlc2VudCB9IGZyb20gXCIuLi90b29scy9IdG1sVG9vbHMuanNcIjtcclxuaW1wb3J0IHsgSW5jb25zaXN0ZW5jeUZpeGVyIH0gZnJvbSBcIi4uL3dvcmtzcGFjZS9JbmNvbnNpc3RlbmN5Rml4ZXIuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBNYWluIGltcGxlbWVudHMgTWFpbkJhc2Uge1xyXG5cclxuICAgIHBpeGlBcHA6IFBJWEkuQXBwbGljYXRpb247XHJcblxyXG4gICAgcmVwb3NpdG9yeU9uOiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICBpc0VtYmVkZGVkKCk6IGJvb2xlYW4geyByZXR1cm4gZmFsc2U7IH1cclxuXHJcbiAgICBnZXRJbnRlcnByZXRlcigpOiBJbnRlcnByZXRlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaW50ZXJwcmV0ZXI7XHJcbiAgICB9XHJcbiAgICBnZXRDdXJyZW50V29ya3NwYWNlKCk6IFdvcmtzcGFjZSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudFdvcmtzcGFjZTtcclxuICAgIH1cclxuICAgIGdldERlYnVnZ2VyKCk6IERlYnVnZ2VyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kZWJ1Z2dlcjtcclxuICAgIH1cclxuICAgIGdldE1vbmFjb0VkaXRvcigpOiBtb25hY28uZWRpdG9yLklTdGFuZGFsb25lQ29kZUVkaXRvciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZWRpdG9yLmVkaXRvcjtcclxuICAgIH1cclxuXHJcbiAgICBnZXRSaWdodERpdigpOiBSaWdodERpdiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucmlnaHREaXY7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Qm90dG9tRGl2KCk6IEJvdHRvbURpdiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYm90dG9tRGl2O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZPUlNJQ0hUOiBnZ2YuIE1vZHVsZSAtPiBhbnlcclxuICAgIGdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpOiBNb2R1bGUge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnByb2plY3RFeHBsb3Jlci5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRBY3Rpb25NYW5hZ2VyKCk6IEFjdGlvbk1hbmFnZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFjdGlvbk1hbmFnZXI7XHJcbiAgICB9XHJcblxyXG4gICAgc2hvd1Byb2dyYW1Qb2ludGVyUG9zaXRpb24oZmlsZTogRmlsZSwgcG9zaXRpb246IFRleHRQb3NpdGlvbikge1xyXG4gICAgICAgIHRoaXMucHJvamVjdEV4cGxvcmVyLnNob3dQcm9ncmFtUG9pbnRlclBvc2l0aW9uKGZpbGUsIHBvc2l0aW9uKTtcclxuICAgIH1cclxuICAgIGhpZGVQcm9ncmFtUG9pbnRlclBvc2l0aW9uKCkge1xyXG4gICAgICAgIHRoaXMucHJvamVjdEV4cGxvcmVyLmhpZGVQcm9ncmFtUG9pbnRlclBvc2l0aW9uKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29tcGlsZXIoKTogQ29tcGlsZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVyO1xyXG4gICAgfVxyXG5cclxuICAgIHNldE1vZHVsZUFjdGl2ZShtb2R1bGU6IE1vZHVsZSkge1xyXG4gICAgICAgIHRoaXMucHJvamVjdEV4cGxvcmVyLnNldE1vZHVsZUFjdGl2ZShtb2R1bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFNlbWljb2xvbkFuZ2VsKCk6IFNlbWljb2xvbkFuZ2VsIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zZW1pY29sb25BbmdlbDtcclxuICAgIH1cclxuXHJcbiAgICBqdW1wVG9EZWNsYXJhdGlvbihtb2R1bGU6IE1vZHVsZSwgZGVjbGFyYXRpb246IFRleHRQb3NpdGlvbldpdGhNb2R1bGUpIHtcclxuICAgICAgICB0aGlzLnByb2plY3RFeHBsb3Jlci5zZXRNb2R1bGVBY3RpdmUobW9kdWxlKTtcclxuICAgICAgICB0aGlzLmVkaXRvci5lZGl0b3IucmV2ZWFsTGluZUluQ2VudGVyKGRlY2xhcmF0aW9uLnBvc2l0aW9uLmxpbmUpO1xyXG4gICAgICAgIHRoaXMuZWRpdG9yLmVkaXRvci5zZXRQb3NpdGlvbih7Y29sdW1uOiBkZWNsYXJhdGlvbi5wb3NpdGlvbi5jb2x1bW4sIGxpbmVOdW1iZXI6IGRlY2xhcmF0aW9uLnBvc2l0aW9uLmxpbmV9KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgd29ya3NwYWNlTGlzdDogV29ya3NwYWNlW10gPSBbXTtcclxuICAgIHdvcmtzcGFjZXNPd25lcklkOiBudW1iZXI7XHJcblxyXG4gICAgLy8gbW9uYWNvX2VkaXRvcjogbW9uYWNvLmVkaXRvci5JU3RhbmRhbG9uZUNvZGVFZGl0b3I7XHJcbiAgICBlZGl0b3I6IEVkaXRvcjtcclxuICAgIGN1cnJlbnRXb3Jrc3BhY2U6IFdvcmtzcGFjZTtcclxuICAgIHByb2plY3RFeHBsb3JlcjogUHJvamVjdEV4cGxvcmVyO1xyXG4gICAgdGVhY2hlckV4cGxvcmVyOiBUZWFjaGVyRXhwbG9yZXI7XHJcbiAgICBuZXR3b3JrTWFuYWdlcjogTmV0d29ya01hbmFnZXI7XHJcbiAgICBhY3Rpb25NYW5hZ2VyOiBBY3Rpb25NYW5hZ2VyO1xyXG4gICAgbWFpbk1lbnU6IE1haW5NZW51O1xyXG5cclxuICAgIHN5bmNocm9uaXphdGlvbk1hbmFnZXI6IFN5bmNocm9uaXphdGlvbk1hbmFnZXI7XHJcbiAgICByZXBvc2l0b3J5Q3JlYXRlTWFuYWdlcjogUmVwb3NpdG9yeUNyZWF0ZU1hbmFnZXI7XHJcbiAgICByZXBvc2l0b3J5VXBkYXRlTWFuYWdlcjogUmVwb3NpdG9yeVNldHRpbmdzTWFuYWdlcjtcclxuICAgIHJlcG9zaXRvcnlDaGVja291dE1hbmFnZXI6IFJlcG9zaXRvcnlDaGVja291dE1hbmFnZXI7XHJcblxyXG4gICAgd2luZG93U3RhdGVNYW5hZ2VyOiBXaW5kb3dTdGF0ZU1hbmFnZXIgPSBuZXcgV2luZG93U3RhdGVNYW5hZ2VyKHRoaXMpO1xyXG5cclxuICAgIGxvZ2luOiBMb2dpbjtcclxuXHJcbiAgICBjb21waWxlcjogQ29tcGlsZXI7XHJcblxyXG4gICAgaW50ZXJwcmV0ZXI6IEludGVycHJldGVyO1xyXG5cclxuICAgIGRlYnVnZ2VyOiBEZWJ1Z2dlcjtcclxuXHJcbiAgICBzZW1pY29sb25BbmdlbDogU2VtaWNvbG9uQW5nZWw7XHJcblxyXG4gICAgYm90dG9tRGl2OiBCb3R0b21EaXY7XHJcblxyXG4gICAgc3RhcnR1cENvbXBsZXRlID0gMjtcclxuICAgIHdhaXRGb3JHVUlDYWxsYmFjazogKCkgPT4gdm9pZDtcclxuXHJcbiAgICBwcm9ncmFtSXNFeGVjdXRhYmxlID0gZmFsc2U7XHJcbiAgICB2ZXJzaW9uOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIHRpbWVySGFuZGxlOiBhbnk7XHJcblxyXG4gICAgdXNlcjogVXNlckRhdGE7XHJcbiAgICB1c2VyRGF0YURpcnR5OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgdGhlbWVNYW5hZ2VyOiBUaGVtZU1hbmFnZXI7XHJcblxyXG4gICAgcmlnaHREaXY6IFJpZ2h0RGl2O1xyXG5cclxuICAgIGRlYm91bmNlRGlhZ3JhbURyYXdpbmc6IGFueTtcclxuXHJcbiAgICB2aWV3TW9kZUNvbnRyb2xsZXI6IFZpZXdNb2RlQ29udHJvbGxlcjtcclxuXHJcbiAgICBpbml0R1VJKCkge1xyXG5cclxuICAgICAgICBjaGVja0lmTW91c2VQcmVzZW50KCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5sb2dpbiA9IG5ldyBMb2dpbih0aGlzKTtcclxuICAgICAgICBsZXQgaGFzaEluZGV4OiBudW1iZXIgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5pbmRleE9mKCcjJyk7XHJcbiAgICAgICAgaWYoaGFzaEluZGV4ID4gMCl7XHJcbiAgICBcclxuICAgICAgICAgICAgdmFyIHRpY2tldCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnN1YnN0cihoYXNoSW5kZXggKyAxKTtcclxuICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCBcIk9ubGluZS1JREVcIiwgd2luZG93LmxvY2F0aW9uLmhyZWYuc3Vic3RyKDAsIGhhc2hJbmRleCkpO1xyXG4gICAgICAgICAgICB0aGlzLmxvZ2luLmluaXRHVUkodHJ1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMubG9naW4ubG9naW5XaXRoVGlja2V0KHRpY2tldCk7XHJcbiAgICBcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmxvZ2luLmluaXRHVUkoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgIFxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5hY3Rpb25NYW5hZ2VyID0gbmV3IEFjdGlvbk1hbmFnZXIobnVsbCwgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5hY3Rpb25NYW5hZ2VyLmluaXQoKTtcclxuXHJcbiAgICAgICAgdGhpcy5uZXR3b3JrTWFuYWdlciA9IG5ldyBOZXR3b3JrTWFuYWdlcih0aGlzLCBqUXVlcnkoJyNib3R0b21kaXYtb3V0ZXIgLmpvX3VwZGF0ZVRpbWVyRGl2JykpO1xyXG5cclxuICAgICAgICBsZXQgc2xpZGVycyA9IG5ldyBTbGlkZXJzKHRoaXMpO1xyXG4gICAgICAgIHNsaWRlcnMuaW5pdFNsaWRlcnMoKTtcclxuICAgICAgICB0aGlzLm1haW5NZW51ID0gbmV3IE1haW5NZW51KHRoaXMpO1xyXG4gICAgICAgIHRoaXMucHJvamVjdEV4cGxvcmVyID0gbmV3IFByb2plY3RFeHBsb3Jlcih0aGlzLCBqUXVlcnkoJyNsZWZ0cGFuZWw+LmpvX3Byb2plY3RleHBsb3JlcicpKTtcclxuICAgICAgICB0aGlzLnByb2plY3RFeHBsb3Jlci5pbml0R1VJKCk7XHJcblxyXG4gICAgICAgIHRoaXMuYm90dG9tRGl2ID0gbmV3IEJvdHRvbURpdih0aGlzLCBqUXVlcnkoJyNib3R0b21kaXYtb3V0ZXI+LmpvX2JvdHRvbWRpdi1pbm5lcicpLCBqUXVlcnkoJ2JvZHknKSk7XHJcblxyXG4gICAgICAgIHRoaXMucmlnaHREaXYgPSBuZXcgUmlnaHREaXYodGhpcywgalF1ZXJ5KCcjcmlnaHRkaXYtaW5uZXInKSk7XHJcbiAgICAgICAgdGhpcy5yaWdodERpdi5pbml0R1VJKCk7XHJcblxyXG4gICAgICAgIHRoaXMuZGVidWdnZXIgPSBuZXcgRGVidWdnZXIodGhpcywgalF1ZXJ5KCcjbGVmdHBhbmVsPi5qb19kZWJ1Z2dlcicpLCBqUXVlcnkoJyNsZWZ0cGFuZWw+LmpvX3Byb2plY3RleHBsb3JlcicpKTtcclxuXHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlciA9IG5ldyBJbnRlcnByZXRlcih0aGlzLCB0aGlzLmRlYnVnZ2VyLFxyXG4gICAgICAgICAgICBuZXcgUHJvZ3JhbUNvbnRyb2xCdXR0b25zKGpRdWVyeSgnI2NvbnRyb2xzJyksIGpRdWVyeSgnI2VkaXRvcicpKSxcclxuICAgICAgICAgICAgalF1ZXJ5KCcjcmlnaHRkaXYtaW5uZXIgLmpvX3J1bicpKTtcclxuICAgICAgICB0aGlzLmludGVycHJldGVyLmluaXRHVUkoKTtcclxuXHJcbiAgICAgICAgdGhpcy5pbml0VHlwZXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5jaGVja1N0YXJ0dXBDb21wbGV0ZSgpO1xyXG5cclxuICAgICAgICB0aGlzLmNvcnJlY3RQSVhJVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgICAgIFBJWEkudXRpbHMuc2tpcEhlbGxvKCk7IC8vIGRvbid0IHNob3cgUElYSS1NZXNzYWdlIGluIGJyb3dzZXIgY29uc29sZVxyXG5cclxuICAgICAgICB0aGlzLnRoZW1lTWFuYWdlciA9IG5ldyBUaGVtZU1hbmFnZXIoKTtcclxuXHJcbiAgICAgICAgdGhpcy52aWV3TW9kZUNvbnRyb2xsZXIgPSBuZXcgVmlld01vZGVDb250cm9sbGVyKGpRdWVyeShcIiN2aWV3LW1vZGVcIiksIHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLnNlbWljb2xvbkFuZ2VsID0gbmV3IFNlbWljb2xvbkFuZ2VsKHRoaXMpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb3JyZWN0UElYSVRyYW5zZm9ybSgpIHtcclxuXHJcbiAgICAgICAgUElYSS5UcmFuc2Zvcm0ucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybSA9IGZ1bmN0aW9uIChwYXJlbnRUcmFuc2Zvcm0pIHtcclxuICAgICAgICAgICAgdmFyIGx0ID0gdGhpcy5sb2NhbFRyYW5zZm9ybTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX2xvY2FsSUQgIT09IHRoaXMuX2N1cnJlbnRMb2NhbElEKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBnZXQgdGhlIG1hdHJpeCB2YWx1ZXMgb2YgdGhlIGRpc3BsYXlvYmplY3QgYmFzZWQgb24gaXRzIHRyYW5zZm9ybSBwcm9wZXJ0aWVzLi5cclxuICAgICAgICAgICAgICAgIC8vIGx0LmEgPSB0aGlzLl9jeCAqIHRoaXMuc2NhbGUueDtcclxuICAgICAgICAgICAgICAgIC8vIGx0LmIgPSB0aGlzLl9zeCAqIHRoaXMuc2NhbGUueDtcclxuICAgICAgICAgICAgICAgIC8vIGx0LmMgPSB0aGlzLl9jeSAqIHRoaXMuc2NhbGUueTtcclxuICAgICAgICAgICAgICAgIC8vIGx0LmQgPSB0aGlzLl9zeSAqIHRoaXMuc2NhbGUueTtcclxuICAgICAgICAgICAgICAgIC8vIGx0LnR4ID0gdGhpcy5wb3NpdGlvbi54IC0gKCh0aGlzLnBpdm90LnggKiBsdC5hKSArICh0aGlzLnBpdm90LnkgKiBsdC5jKSk7XHJcbiAgICAgICAgICAgICAgICAvLyBsdC50eSA9IHRoaXMucG9zaXRpb24ueSAtICgodGhpcy5waXZvdC54ICogbHQuYikgKyAodGhpcy5waXZvdC55ICogbHQuZCkpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fY3VycmVudExvY2FsSUQgPSB0aGlzLl9sb2NhbElEO1xyXG4gICAgICAgICAgICAgICAgLy8gZm9yY2UgYW4gdXBkYXRlLi5cclxuICAgICAgICAgICAgICAgIHRoaXMuX3BhcmVudElEID0gLTE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9wYXJlbnRJRCAhPT0gcGFyZW50VHJhbnNmb3JtLl93b3JsZElEKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25jYXQgdGhlIHBhcmVudCBtYXRyaXggd2l0aCB0aGUgb2JqZWN0cyB0cmFuc2Zvcm0uXHJcbiAgICAgICAgICAgICAgICB2YXIgcHQgPSBwYXJlbnRUcmFuc2Zvcm0ud29ybGRUcmFuc2Zvcm07XHJcbiAgICAgICAgICAgICAgICB2YXIgd3QgPSB0aGlzLndvcmxkVHJhbnNmb3JtO1xyXG4gICAgICAgICAgICAgICAgd3QuYSA9IChsdC5hICogcHQuYSkgKyAobHQuYiAqIHB0LmMpO1xyXG4gICAgICAgICAgICAgICAgd3QuYiA9IChsdC5hICogcHQuYikgKyAobHQuYiAqIHB0LmQpO1xyXG4gICAgICAgICAgICAgICAgd3QuYyA9IChsdC5jICogcHQuYSkgKyAobHQuZCAqIHB0LmMpO1xyXG4gICAgICAgICAgICAgICAgd3QuZCA9IChsdC5jICogcHQuYikgKyAobHQuZCAqIHB0LmQpO1xyXG4gICAgICAgICAgICAgICAgd3QudHggPSAobHQudHggKiBwdC5hKSArIChsdC50eSAqIHB0LmMpICsgcHQudHg7XHJcbiAgICAgICAgICAgICAgICB3dC50eSA9IChsdC50eCAqIHB0LmIpICsgKGx0LnR5ICogcHQuZCkgKyBwdC50eTtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fcGFyZW50SUQgPSBwYXJlbnRUcmFuc2Zvcm0uX3dvcmxkSUQ7XHJcbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgdGhlIGlkIG9mIHRoZSB0cmFuc2Zvcm0uLlxyXG4gICAgICAgICAgICAgICAgdGhpcy5fd29ybGRJRCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGluaXRFZGl0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5lZGl0b3IgPSBuZXcgRWRpdG9yKHRoaXMsIHRydWUsIGZhbHNlKTtcclxuICAgICAgICBuZXcgRm9ybWF0dGVyKCkuaW5pdCgpO1xyXG4gICAgICAgIC8vIHRoaXMubW9uYWNvX2VkaXRvciA9IFxyXG4gICAgICAgIHRoaXMuZWRpdG9yLmluaXRHVUkoalF1ZXJ5KCcjZWRpdG9yJykpO1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICBqUXVlcnkoJyNib3R0b21kaXYtb3V0ZXInKS5jc3MoJ2hlaWdodCcsICcxNTBweCcpO1xyXG4gICAgICAgICAgICBqUXVlcnkoJyNlZGl0b3InKS5jc3MoJ2hlaWdodCcsICh3aW5kb3cuaW5uZXJIZWlnaHQgLSAxNTAgLSAzMCAtIDIpICsgXCJweFwiKTtcclxuICAgICAgICAgICAgdGhhdC5lZGl0b3IuZWRpdG9yLmxheW91dCgpO1xyXG4gICAgICAgICAgICBqUXVlcnkoJyNlZGl0b3InKS5jc3MoJ2hlaWdodCcsIFwiXCIpO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgalF1ZXJ5KHdpbmRvdykudHJpZ2dlcigncmVzaXplJyk7XHJcblxyXG4vLyAgICAgICAgdGhpcy5jaGVja1N0YXJ0dXBDb21wbGV0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGluaXRUZWFjaGVyRXhwbG9yZXIoY2xhc3NkYXRhOiBDbGFzc0RhdGFbXSkge1xyXG4gICAgICAgIHRoaXMudGVhY2hlckV4cGxvcmVyID0gbmV3IFRlYWNoZXJFeHBsb3Jlcih0aGlzLCBjbGFzc2RhdGEpO1xyXG4gICAgICAgIHRoaXMudGVhY2hlckV4cGxvcmVyLmluaXRHVUkoKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLy8gbG9hZFdvcmtzcGFjZSgpIHtcclxuICAgIC8vICAgICB0aGlzLndvcmtzcGFjZUxpc3QucHVzaChnZXRNb2NrdXBXb3Jrc3BhY2UodGhpcykpO1xyXG4gICAgLy8gICAgIHRoaXMucHJvamVjdEV4cGxvcmVyLnJlbmRlcldvcmtzcGFjZXModGhpcy53b3Jrc3BhY2VMaXN0KTtcclxuICAgIC8vICAgICB0aGlzLnByb2plY3RFeHBsb3Jlci5zZXRXb3Jrc3BhY2VBY3RpdmUodGhpcy53b3Jrc3BhY2VMaXN0WzBdKTtcclxuICAgIC8vICAgICB0aGlzLmNoZWNrU3RhcnR1cENvbXBsZXRlKCk7XHJcblxyXG4gICAgLy8gfVxyXG5cclxuICAgIGNoZWNrU3RhcnR1cENvbXBsZXRlKCkge1xyXG4gICAgICAgIHRoaXMuc3RhcnR1cENvbXBsZXRlLS07XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhcnR1cENvbXBsZXRlID09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5zdGFydCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpbml0VHlwZXMoKSB7XHJcbiAgICAgICAgdm9pZFByaW1pdGl2ZVR5cGUuaW5pdCgpO1xyXG4gICAgICAgIGludFByaW1pdGl2ZVR5cGUuaW5pdCgpO1xyXG4gICAgICAgIGxvbmdQcmltaXRpdmVUeXBlLmluaXQoKTtcclxuICAgICAgICBmbG9hdFByaW1pdGl2ZVR5cGUuaW5pdCgpO1xyXG4gICAgICAgIGRvdWJsZVByaW1pdGl2ZVR5cGUuaW5pdCgpO1xyXG4gICAgICAgIGJvb2xlYW5QcmltaXRpdmVUeXBlLmluaXQoKTtcclxuICAgICAgICBzdHJpbmdQcmltaXRpdmVUeXBlLmluaXQoKTtcclxuICAgICAgICBjaGFyUHJpbWl0aXZlVHlwZS5pbml0KCk7XHJcblxyXG4gICAgICAgIEludGVnZXJUeXBlLmluaXQoKTtcclxuICAgICAgICBMb25nVHlwZS5pbml0KCk7XHJcbiAgICAgICAgRmxvYXRUeXBlLmluaXQoKTtcclxuICAgICAgICBEb3VibGVUeXBlLmluaXQoKTtcclxuICAgICAgICBDaGFyYWN0ZXJUeXBlLmluaXQoKTtcclxuICAgICAgICBCb29sZWFuVHlwZS5pbml0KCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHN0YXJ0KCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy53YWl0Rm9yR1VJQ2FsbGJhY2sgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLndhaXRGb3JHVUlDYWxsYmFjaygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGF0LmdldE1vbmFjb0VkaXRvcigpLmxheW91dCgpO1xyXG4gICAgICAgIH0sIDIwMCk7XHJcblxyXG4gICAgICAgIHRoaXMuY29tcGlsZXIgPSBuZXcgQ29tcGlsZXIodGhpcyk7XHJcblxyXG4gICAgICAgIHRoaXMuc3RhcnRUaW1lcigpO1xyXG5cclxuICAgICAgICAkKHdpbmRvdykub24oJ3VubG9hZCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYobmF2aWdhdG9yLnNlbmRCZWFjb24gJiYgdGhhdC51c2VyICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgdGhhdC5uZXR3b3JrTWFuYWdlci5zZW5kVXBkYXRlcyhudWxsLCBmYWxzZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB0aGF0Lm5ldHdvcmtNYW5hZ2VyLnNlbmRVcGRhdGVVc2VyU2V0dGluZ3MoKCkgPT4ge30pO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5pbnRlcnByZXRlci5jbG9zZUFsbFdlYnNvY2tldHMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc3RhcnRUaW1lcigpIHtcclxuICAgICAgICBpZiAodGhpcy50aW1lckhhbmRsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lckhhbmRsZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy50aW1lckhhbmRsZSA9IHNldEludGVydmFsKCgpID0+IHtcclxuXHJcbiAgICAgICAgICAgIHRoYXQuY29tcGlsZUlmRGlydHkoKTtcclxuXHJcbiAgICAgICAgfSwgNTAwKTtcclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbXBpbGVJZkRpcnR5KCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50V29ya3NwYWNlID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5pc0RpcnR5KCkgJiZcclxuICAgICAgICAgICAgdGhpcy5jb21waWxlci5jb21waWxlclN0YXR1cyAhPSBDb21waWxlclN0YXR1cy5jb21waWxpbmdcclxuICAgICAgICAgICAgJiYgdGhpcy5pbnRlcnByZXRlci5zdGF0ZSAhPSBJbnRlcnByZXRlclN0YXRlLnJ1bm5pbmdcclxuICAgICAgICAgICAgJiYgdGhpcy5pbnRlcnByZXRlci5zdGF0ZSAhPSBJbnRlcnByZXRlclN0YXRlLnBhdXNlZCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY29tcGlsZXIuY29tcGlsZSh0aGlzLmN1cnJlbnRXb3Jrc3BhY2UubW9kdWxlU3RvcmUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBlcnJvcnMgPSB0aGlzLmJvdHRvbURpdj8uZXJyb3JNYW5hZ2VyPy5zaG93RXJyb3JzKHRoaXMuY3VycmVudFdvcmtzcGFjZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2plY3RFeHBsb3Jlci5yZW5kZXJFcnJvckNvdW50KHRoaXMuY3VycmVudFdvcmtzcGFjZSwgZXJyb3JzKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmVkaXRvci5vbkRpZENoYW5nZUN1cnNvclBvc2l0aW9uKG51bGwpOyAvLyBtYXJrIG9jY3VycmVuY2llcyBvZiBzeW1ib2wgdW5kZXIgY3Vyc29yXHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcmludFByb2dyYW0oKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wcm9qZWN0RXhwbG9yZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnZlcnNpb24rKztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnRhYmxlID0gdGhpcy5pbnRlcnByZXRlci5nZXRTdGFydGFibGVNb2R1bGUodGhpcy5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlKSAhPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdGFydGFibGUgJiZcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnN0YXRlID09IEludGVycHJldGVyU3RhdGUubm90X2luaXRpYWxpemVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb3B5RXhlY3V0YWJsZU1vZHVsZVN0b3JlVG9JbnRlcnByZXRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5kb25lKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLmludGVycHJldGVyLmluaXQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXN0YXJ0YWJsZSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLmludGVycHJldGVyLnN0YXRlID09IEludGVycHJldGVyU3RhdGUuZG9uZSB8fCB0aGlzLmludGVycHJldGVyLnN0YXRlID09IEludGVycHJldGVyU3RhdGUuZXJyb3IpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLm5vdF9pbml0aWFsaXplZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5kcmF3Q2xhc3NEaWFncmFtcyghdGhpcy5yaWdodERpdi5pc0NsYXNzRGlhZ3JhbUVuYWJsZWQoKSk7XHJcblxyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21waWxlci5jb21waWxlclN0YXR1cyA9IENvbXBpbGVyU3RhdHVzLmVycm9yO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICBwcmludFByb2dyYW0oKSB7XHJcblxyXG4gICAgICAgIHRoaXMuYm90dG9tRGl2LnByaW50TW9kdWxlVG9Cb3R0b21EaXYodGhpcy5jdXJyZW50V29ya3NwYWNlLCB0aGlzLnByb2plY3RFeHBsb3Jlci5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdDbGFzc0RpYWdyYW1zKG9ubHlVcGRhdGVJZGVudGlmaWVyczogYm9vbGVhbikge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmRlYm91bmNlRGlhZ3JhbURyYXdpbmcpO1xyXG4gICAgICAgIHRoaXMuZGVib3VuY2VEaWFncmFtRHJhd2luZyA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnJpZ2h0RGl2Py5jbGFzc0RpYWdyYW0/LmRyYXdEaWFncmFtKHRoaXMuY3VycmVudFdvcmtzcGFjZSwgb25seVVwZGF0ZUlkZW50aWZpZXJzKTtcclxuICAgICAgICB9LCA1MDApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvcHlFeGVjdXRhYmxlTW9kdWxlU3RvcmVUb0ludGVycHJldGVyKCkge1xyXG4gICAgICAgIGxldCBtcyA9IHRoaXMuY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5jb3B5KCk7XHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlci5tb2R1bGVTdG9yZSA9IG1zO1xyXG4gICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIubW9kdWxlU3RvcmVWZXJzaW9uID0gdGhpcy52ZXJzaW9uO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pbnRlcnByZXRlci5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLm5vdF9pbml0aWFsaXplZCAmJiB0aGlzLnByb2dyYW1Jc0V4ZWN1dGFibGUpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLmRvbmUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlV29ya3NwYWNlKHc6IFdvcmtzcGFjZSkge1xyXG4gICAgICAgIHRoaXMud29ya3NwYWNlTGlzdC5zcGxpY2UodGhpcy53b3Jrc3BhY2VMaXN0LmluZGV4T2YodyksIDEpO1xyXG4gICAgfVxyXG5cclxuICAgIHJlc3RvcmVXb3Jrc3BhY2VzKHdvcmtzcGFjZXM6IFdvcmtzcGFjZXMsIGZpeEluY29uc2lzdGVuY2llczogYm9vbGVhbikge1xyXG5cclxuICAgICAgICB0aGlzLndvcmtzcGFjZUxpc3QgPSBbXTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRXb3Jrc3BhY2UgPSBudWxsO1xyXG4gICAgICAgIC8vIHRoaXMubW9uYWNvLnNldE1vZGVsKG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoXCJLZWluZSBEYXRlaSB2b3JoYW5kZW4uXCIgLCBcInRleHRcIikpO1xyXG4gICAgICAgIHRoaXMuZ2V0TW9uYWNvRWRpdG9yKCkudXBkYXRlT3B0aW9ucyh7IHJlYWRPbmx5OiB0cnVlIH0pO1xyXG5cclxuICAgICAgICBmb3IgKGxldCB3cyBvZiB3b3Jrc3BhY2VzLndvcmtzcGFjZXMpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB3b3Jrc3BhY2U6IFdvcmtzcGFjZSA9IFdvcmtzcGFjZS5yZXN0b3JlRnJvbURhdGEod3MsIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLndvcmtzcGFjZUxpc3QucHVzaCh3b3Jrc3BhY2UpO1xyXG4gICAgICAgICAgICBpZiAod3MuaWQgPT0gdGhpcy51c2VyLmN1cnJlbnRXb3Jrc3BhY2VfaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFdvcmtzcGFjZSA9IHdvcmtzcGFjZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRmluZCBpbmNvbnNpc3RlbmNpZXMgYW5kIGZpeCB0aGVtXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgaWYoZml4SW5jb25zaXN0ZW5jaWVzKXtcclxuICAgICAgICAgICAgbmV3IEluY29uc2lzdGVuY3lGaXhlcigpLnN0YXJ0KHRoaXMud29ya3NwYWNlTGlzdCwgdGhpcy5uZXR3b3JrTWFuYWdlciwgdGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnByb2plY3RFeHBsb3Jlci5yZW5kZXJXb3Jrc3BhY2VzKHRoaXMud29ya3NwYWNlTGlzdCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRXb3Jrc3BhY2UgPT0gbnVsbCAmJiB0aGlzLndvcmtzcGFjZUxpc3QubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRXb3Jrc3BhY2UgPSB0aGlzLndvcmtzcGFjZUxpc3RbMF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50V29ya3NwYWNlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9qZWN0RXhwbG9yZXIuc2V0V29ya3NwYWNlQWN0aXZlKHRoaXMuY3VycmVudFdvcmtzcGFjZSwgdHJ1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5wcm9qZWN0RXhwbG9yZXIuc2V0TW9kdWxlQWN0aXZlKG51bGwpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMud29ya3NwYWNlTGlzdC5sZW5ndGggPT0gMCkge1xyXG5cclxuICAgICAgICAgICAgSGVscGVyLnNob3dIZWxwZXIoXCJuZXdXb3Jrc3BhY2VIZWxwZXJcIiwgdGhpcywgdGhpcy5wcm9qZWN0RXhwbG9yZXIud29ya3NwYWNlTGlzdFBhbmVsLiRjYXB0aW9uRWxlbWVudCk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNyZWF0ZU5ld1dvcmtzcGFjZShuYW1lOiBzdHJpbmcsIG93bmVyX2lkOiBudW1iZXIpOiBXb3Jrc3BhY2Uge1xyXG4gICAgICAgIHJldHVybiBuZXcgV29ya3NwYWNlKG5hbWUsIHRoaXMsIG93bmVyX2lkKTtcclxuICAgIH1cclxuXHJcblxyXG59XHJcblxyXG4iXX0=