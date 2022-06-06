import { TokenType, TokenTypeReadable } from "../compiler/lexer/Token.js";
import { ArrayType } from "../compiler/types/Array.js";
import { Klass, Interface } from "../compiler/types/Class.js";
import { Enum, EnumRuntimeObject } from "../compiler/types/Enum.js";
import { PrimitiveType, Method } from "../compiler/types/Types.js";
import { PrintManager } from "../main/gui/PrintManager.js";
import { RuntimeObject } from "./RuntimeObject.js";
import { intPrimitiveType, stringPrimitiveType } from "../compiler/types/PrimitiveTypes.js";
import { InputManager } from "./InputManager.js";
import { Helper } from "../main/gui/Helper.js";
import { KeyboardTool } from "../tools/KeyboardTool.js";
import { GamepadTool } from "../tools/GamepadTool.js";
export var InterpreterState;
(function (InterpreterState) {
    InterpreterState[InterpreterState["not_initialized"] = 0] = "not_initialized";
    InterpreterState[InterpreterState["running"] = 1] = "running";
    InterpreterState[InterpreterState["paused"] = 2] = "paused";
    InterpreterState[InterpreterState["error"] = 3] = "error";
    InterpreterState[InterpreterState["done"] = 4] = "done";
    InterpreterState[InterpreterState["waitingForInput"] = 5] = "waitingForInput";
    InterpreterState[InterpreterState["waitingForTimersToEnd"] = 6] = "waitingForTimersToEnd";
})(InterpreterState || (InterpreterState = {}));
export class Interpreter {
    constructor(main, debugger_, controlButtons, $runDiv) {
        this.main = main;
        this.debugger_ = debugger_;
        this.controlButtons = controlButtons;
        this.moduleStoreVersion = -100;
        this.stepsPerSecond = 2;
        this.maxStepsPerSecond = 1000000;
        this.timerDelayMs = 10;
        this.programStack = [];
        this.stack = [];
        this.stackframes = [];
        this.heap = {};
        this.timerStopped = true;
        this.timerExtern = false;
        this.steps = 0;
        this.timeNetto = 0;
        this.timeWhenProgramStarted = 0;
        this.stepOverNestingLevel = 0;
        this.leaveLine = -1;
        this.additionalStepFinishedFlag = false;
        this.isFirstStatement = true;
        this.showProgrampointerUptoStepsPerSecond = 15;
        this.databaseConnectionHelpers = [];
        this.webSocketsToCloseAfterProgramHalt = [];
        this.actions = ["start", "pause", "stop", "stepOver",
            "stepInto", "stepOut", "restart"];
        // buttonActiveMatrix[button][i] tells if button is active at 
        // InterpreterState i
        this.buttonActiveMatrix = {
            "start": [false, false, true, true, true, false],
            "pause": [false, true, false, false, false, false],
            "stop": [false, true, true, false, false, true],
            "stepOver": [false, false, true, true, true, false],
            "stepInto": [false, false, true, true, true, false],
            "stepOut": [false, false, true, false, false, false],
            "restart": [false, true, true, true, true, true]
        };
        this.timerEvents = 0;
        this.lastStepTime = 0;
        this.lastTimeBetweenEvents = 0;
        this.lastPrintedModule = null;
        this.stepFinished = false;
        this.runningStates = [InterpreterState.paused, InterpreterState.running, InterpreterState.waitingForInput];
        this.printManager = new PrintManager($runDiv, this.main);
        this.inputManager = new InputManager($runDiv, this.main);
        if (main.isEmbedded()) {
            this.keyboardTool = new KeyboardTool(jQuery('html'), main);
        }
        else {
            this.keyboardTool = new KeyboardTool(jQuery(window), main);
        }
        this.gamepadTool = new GamepadTool();
        this.debugger = debugger_;
        controlButtons.setInterpreter(this);
        this.timeWhenProgramStarted = performance.now();
        this.steps = 0;
        this.timeNetto = 0;
        this.timerEvents = 0;
        this.timerDelayMs = 7;
        let that = this;
        let periodicFunction = () => {
            if (!that.timerExtern) {
                that.timerFunction(that.timerDelayMs, false, 0.7);
            }
        };
        this.timerId = setInterval(periodicFunction, this.timerDelayMs);
        let keepAliveRequest = { command: 5 };
        let req = JSON.stringify(keepAliveRequest);
        setInterval(() => {
            that.webSocketsToCloseAfterProgramHalt.forEach(ws => ws.send(req));
        }, 30000);
    }
    initGUI() {
        let that = this;
        let am = this.main.getActionManager();
        let startFunction = () => {
            that.stepOverNestingLevel = 1000000;
            that.start();
        };
        let pauseFunction = () => {
            that.pause();
        };
        am.registerAction("interpreter.start", ['F4'], () => {
            if (am.isActive("interpreter.start")) {
                startFunction();
            }
            else {
                pauseFunction();
            }
        }, "Programm starten", this.controlButtons.$buttonStart);
        am.registerAction("interpreter.pause", ['F4'], () => {
            if (am.isActive("interpreter.start")) {
                startFunction();
            }
            else {
                pauseFunction();
            }
        }, "Pause", this.controlButtons.$buttonPause);
        am.registerAction("interpreter.stop", [], () => {
            that.stop(false);
            that.steps = 0;
        }, "Programm anhalten", this.controlButtons.$buttonStop);
        // this.controlButtons.$buttonEdit.on('click', (e) => {
        //     e.stopPropagation();
        //     am.trigger('interpreter.stop');
        // });
        am.registerAction("interpreter.stepOver", ['F6'], () => {
            this.oneStep(false);
        }, "Einzelschritt (Step over)", this.controlButtons.$buttonStepOver);
        am.registerAction("interpreter.stepInto", ['F7'], () => {
            this.oneStep(true);
        }, "Einzelschritt (Step into)", this.controlButtons.$buttonStepInto);
        am.registerAction("interpreter.stepOut", [], () => {
            this.stepOut();
        }, "Step out", this.controlButtons.$buttonStepOut);
        am.registerAction("interpreter.restart", [], () => {
            that.stop(true);
        }, "Neu starten", this.controlButtons.$buttonRestart);
        this.setState(InterpreterState.not_initialized);
    }
    getStartableModule(moduleStore) {
        let cem;
        cem = this.main.getCurrentlyEditedModule();
        let currentlyEditedModuleIsClassOnly = false;
        // decide which module to start
        // first attempt: is currently edited Module startable?
        if (cem != null) {
            let currentlyEditedModule = moduleStore.findModuleByFile(cem.file);
            if (currentlyEditedModule != null) {
                currentlyEditedModuleIsClassOnly = !cem.hasErrors()
                    && !currentlyEditedModule.isStartable;
                if (currentlyEditedModule.isStartable) {
                    return currentlyEditedModule;
                }
            }
        }
        // second attempt: which module has been started last time?
        if (this.mainModule != null && currentlyEditedModuleIsClassOnly) {
            let lastMainModule = moduleStore.findModuleByFile(this.mainModule.file);
            if (lastMainModule != null && lastMainModule.isStartable) {
                return lastMainModule;
            }
        }
        // third attempt: pick first startable module of current workspace
        if (currentlyEditedModuleIsClassOnly) {
            for (let m of moduleStore.getModules(false)) {
                if (m.isStartable) {
                    return m;
                }
            }
        }
        return null;
    }
    /*
        After user clicks start button (or stepover/stepInto-Button when no program is running) this
        method ist called.
    */
    init() {
        var _a, _b, _c, _d;
        this.timerStopped = true;
        let cem = this.main.getCurrentlyEditedModule();
        cem.getBreakpointPositionsFromEditor();
        (_b = (_a = this.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console) === null || _b === void 0 ? void 0 : _b.clearExceptions();
        /*
            As long as there is no startable new Version of current workspace we keep current compiled modules so
            that variables and objects defined/instantiated via console can be kept, too.
        */
        if (this.moduleStoreVersion != this.main.version && this.main.getCompiler().atLeastOneModuleIsStartable) {
            this.main.copyExecutableModuleStoreToInterpreter();
            this.heap = {}; // clear variables/objects defined via console
            (_d = (_c = this.main.getBottomDiv()) === null || _c === void 0 ? void 0 : _c.console) === null || _d === void 0 ? void 0 : _d.detachValues(); // detach values from console entries
        }
        let newMainModule = this.getStartableModule(this.moduleStore);
        if (newMainModule == null) {
            this.setState(InterpreterState.not_initialized);
            return;
        }
        this.mainModule = newMainModule;
        this.currentProgramPosition = 0;
        this.programStack = [];
        this.stack = [];
        this.stackframes = [];
        this.currentStackframe = 0;
        this.setState(InterpreterState.done);
        this.isFirstStatement = true;
        this.stepOverNestingLevel = 1000000;
        // Instantiate enum value-objects; initialize static attributes; call static constructors
        this.programStack.push({
            program: this.mainModule.mainProgram,
            programPosition: 0,
            textPosition: { line: 1, column: 1, length: 0 },
            method: "Hauptprogramm",
            callbackAfterReturn: null,
            isCalledFromOutside: "Hauptprogramm"
        });
        for (let m of this.moduleStore.getModules(false)) {
            this.initializeEnums(m);
            this.initializeClasses(m);
        }
        this.popProgram();
    }
    popProgram() {
        let p = this.programStack.pop();
        this.currentProgram = p.program;
        this.currentProgramPosition = p.programPosition;
        this.currentMethod = p.method;
        this.currentCallbackAfterReturn = p.callbackAfterReturn;
        this.currentIsCalledFromOutside = p.isCalledFromOutside;
        if (p.stackElementsToPushBeforeFirstExecuting != null) {
            this.stackframes.push(this.currentStackframe == null ? 0 : this.currentStackframe);
            this.currentStackframe = this.stack.length;
            for (let se of p.stackElementsToPushBeforeFirstExecuting)
                this.stack.push(se);
            p.stackElementsToPushBeforeFirstExecuting = null;
        }
    }
    initializeClasses(m) {
        for (let klass of m.typeStore.typeList) {
            if (klass instanceof Klass) {
                klass.staticClass.classObject = new RuntimeObject(klass.staticClass);
                klass.pushStaticInitializationPrograms(this.programStack);
            }
            if (klass instanceof Enum) {
                // let staticValueMap = klass.staticClass.classObject.attributeValues.get(klass.identifier);
                let staticValueList = klass.staticClass.classObject.attributes;
                for (let enumInfo of klass.enumInfoList) {
                    // staticValueMap.get(enumInfo.identifier).value = enumInfo.object;
                    staticValueList[enumInfo.ordinal].value = enumInfo.object;
                }
            }
        }
    }
    initializeEnums(m) {
        for (let enumClass of m.typeStore.typeList) {
            if (enumClass instanceof Enum) {
                enumClass.pushStaticInitializationPrograms(this.programStack);
                let valueList = [];
                let valueInitializationProgram = {
                    module: enumClass.module,
                    labelManager: null,
                    statements: []
                };
                let hasAttributeInitializationProgram = enumClass.attributeInitializationProgram.statements.length > 0;
                if (hasAttributeInitializationProgram) {
                    this.programStack.push({
                        program: valueInitializationProgram,
                        programPosition: 0,
                        textPosition: { line: 1, column: 1, length: 0 },
                        method: "Attribut-Initialisierung der Klasse " + enumClass.identifier,
                        callbackAfterReturn: null,
                        isCalledFromOutside: "Initialisierung eines Enums"
                    });
                }
                for (let enumInfo of enumClass.enumInfoList) {
                    enumInfo.object = new EnumRuntimeObject(enumClass, enumInfo);
                    valueList.push({
                        type: enumClass,
                        value: enumInfo.object
                    });
                    if (enumInfo.constructorCallProgram != null) {
                        this.programStack.push({
                            program: enumInfo.constructorCallProgram,
                            programPosition: 0,
                            textPosition: { line: 1, column: 1, length: 0 },
                            method: "Konstruktor von " + enumClass.identifier,
                            callbackAfterReturn: null,
                            isCalledFromOutside: "Initialisierung eines Enums"
                        });
                    }
                    if (hasAttributeInitializationProgram) {
                        valueInitializationProgram.statements.push({
                            type: TokenType.initializeEnumValue,
                            position: enumInfo.position,
                            enumClass: enumClass,
                            valueIdentifier: enumInfo.identifier
                        });
                    }
                }
                if (hasAttributeInitializationProgram) {
                    valueInitializationProgram.statements.push({
                        type: TokenType.programEnd,
                        position: { line: 0, column: 0, length: 1 }
                    });
                }
                enumClass.valueList = {
                    type: new ArrayType(enumClass),
                    value: valueList
                };
            }
        }
    }
    start(callback) {
        var _a, _b;
        (_b = (_a = this.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console) === null || _b === void 0 ? void 0 : _b.clearErrors();
        this.callbackAfterExecution = callback;
        this.isFirstStatement = true;
        this.pauseUntil = null;
        if (this.state == InterpreterState.error || this.state == InterpreterState.done) {
            this.init();
            this.resetRuntime();
        }
        this.setState(InterpreterState.running);
        this.hideProgrampointerPosition();
        this.timeWhenProgramStarted = performance.now();
        this.timerStopped = false;
        this.getTimerClass().startTimer();
    }
    getTimerClass() {
        let baseModule = this.main.getCurrentWorkspace().moduleStore.getModule("Base Module");
        return baseModule.typeStore.getType("Timer");
    }
    timerFunction(timerDelayMs, forceRun, maxWorkloadFactor) {
        let t0 = performance.now();
        if (!forceRun) {
            let timeBetweenSteps = 1000 / this.stepsPerSecond;
            if (this.timerStopped || t0 - this.lastStepTime < timeBetweenSteps)
                return;
            this.lastStepTime = t0;
        }
        this.lastTimeBetweenEvents = t0 - this.lastStepTime;
        let n_stepsPerTimerGoal = forceRun ? Number.MAX_SAFE_INTEGER : this.stepsPerSecond * this.timerDelayMs / 1000;
        this.timerEvents++;
        let exception;
        let i = 0;
        while (i < n_stepsPerTimerGoal && !this.timerStopped && exception == null &&
            (performance.now() - t0) / timerDelayMs < maxWorkloadFactor) {
            exception = this.nextStep();
            if (exception != null) {
                break;
            }
            if (this.stepsPerSecond <= this.showProgrampointerUptoStepsPerSecond && !forceRun) {
                this.showProgramPointerAndVariables();
            }
            if (this.state == InterpreterState.error ||
                this.state == InterpreterState.done) {
                this.timerStopped = true;
            }
            if (this.stepOverNestingLevel < 0 && !this.timerStopped) {
                let node = this.currentProgram.statements[this.currentProgramPosition];
                let position = node.position;
                if (position == null || position.line != this.leaveLine) {
                    this.timerStopped = true;
                    this.setState(InterpreterState.paused);
                    if (this.comesStatement(TokenType.closeStackframe)) {
                        exception = this.nextStep();
                        if (exception == null && this.comesStatement(TokenType.programEnd)) {
                            exception = this.nextStep();
                        }
                    }
                }
            }
            i++;
        }
        if (exception != null) {
            this.throwException(exception);
        }
        if (this.timerStopped) {
            if (this.state == InterpreterState.paused || this.state == InterpreterState.waitingForInput) {
                this.showProgramPointerAndVariables();
            }
            if (this.callbackAfterExecution != null) {
                this.callbackAfterExecution();
                this.callbackAfterExecution = null;
            }
        }
        let dt = performance.now() - t0;
        this.timeNetto += dt;
        // if (
        //     this.timerEvents % 300 == 0) {
        //     console.log("Last time between Events: " + this.lastTimeBetweenEvents);
        // }
    }
    throwException(exception) {
        var _a, _b, _c;
        this.timerStopped = true;
        this.setState(InterpreterState.error);
        let $errorDiv = jQuery('<div class="jo_exception"></div>');
        let consolePresent = true;
        if (this.main.isEmbedded()) {
            let mainEmbedded = this.main;
            let config = mainEmbedded.config;
            if (config.withBottomPanel != true && config.withConsole != true) {
                consolePresent = false;
                let positionString = "";
                let currentStatement = this.currentProgram.statements[this.currentProgramPosition];
                if (currentStatement != null) {
                    let textPosition = currentStatement === null || currentStatement === void 0 ? void 0 : currentStatement.position;
                    positionString = " in Zeile " + textPosition.line + ", Spalte " + textPosition.column;
                    (_b = (_a = this.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console) === null || _b === void 0 ? void 0 : _b.showError(this.currentProgram.module, textPosition);
                }
                alert("Fehler" + positionString + ": " + exception);
            }
        }
        if (consolePresent) {
            $errorDiv.append(jQuery("<span class='jo_error-caption'>Fehler:</span>&nbsp;" + exception + "<br>"));
            this.pushCurrentProgram();
            let first = true;
            for (let i = this.programStack.length - 1; i >= 0; i--) {
                let p = this.programStack[i];
                let m = (p.method instanceof Method) ? p.method.identifier : p.method;
                let s = "<span class='jo_error-caption'>" + (first ? "Ort" : "aufgerufen von") + ": </span>" + m;
                if (p.textPosition != null)
                    s += " <span class='jo_runtimeErrorPosition'>(Z " + p.textPosition.line + ", S " + p.textPosition.column + ")</span>";
                s += "<br>";
                let errorLine = jQuery(s);
                if (p.textPosition != null) {
                    let that = this;
                    jQuery(errorLine[2]).on('mousedown', () => {
                        var _a, _b;
                        (_b = (_a = that.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console) === null || _b === void 0 ? void 0 : _b.showError(p.program.module, p.textPosition);
                    });
                }
                $errorDiv.append(errorLine);
                first = false;
                if (p.isCalledFromOutside != null) {
                    break;
                }
            }
            let console = (_c = this.main.getBottomDiv()) === null || _c === void 0 ? void 0 : _c.console;
            if (console != null) {
                console.writeConsoleEntry($errorDiv, null, 'rgba(255, 0, 0, 0.4');
                console.showTab();
            }
        }
    }
    hideProgrampointerPosition() {
        if (this.state == InterpreterState.running) {
            if (this.stepsPerSecond > this.showProgrampointerUptoStepsPerSecond) {
                this.main.hideProgramPointerPosition();
            }
        }
    }
    comesStatement(statement) {
        if (this.currentProgram == null)
            return false;
        if (this.currentProgramPosition > this.currentProgram.statements.length - 1)
            return false;
        return this.currentProgram.statements[this.currentProgramPosition].type == statement;
    }
    resetRuntime() {
        var _a, _b, _c;
        this.printManager.clear();
        (_a = this.worldHelper) === null || _a === void 0 ? void 0 : _a.destroyWorld();
        (_b = this.processingHelper) === null || _b === void 0 ? void 0 : _b.destroyWorld();
        (_c = this.gngEreignisbehandlungHelper) === null || _c === void 0 ? void 0 : _c.detachEvents();
        this.gngEreignisbehandlungHelper = null;
    }
    stop(restart = false) {
        var _a;
        this.inputManager.hide();
        this.setState(InterpreterState.paused);
        this.timerStopped = true;
        if (this.worldHelper != null) {
            this.worldHelper.spriteAnimations = [];
        }
        (_a = this.gngEreignisbehandlungHelper) === null || _a === void 0 ? void 0 : _a.detachEvents();
        this.gngEreignisbehandlungHelper = null;
        this.main.hideProgramPointerPosition();
        this.getTimerClass().stopTimer();
        if (this.worldHelper != null) {
            this.worldHelper.cacheAsBitmap();
        }
        this.databaseConnectionHelpers.forEach((ch) => ch.close());
        this.databaseConnectionHelpers = [];
        this.heap = {};
        this.programStack = [];
        this.stack = [];
        this.stackframes = [];
        setTimeout(() => {
            this.setState(InterpreterState.done);
            this.main.hideProgramPointerPosition();
            if (restart) {
                this.start();
            }
        }, 500);
    }
    pause() {
        this.setState(InterpreterState.paused);
        this.showProgramPointerAndVariables();
        this.timerStopped = true;
    }
    showProgramPointerAndVariables() {
        if (this.currentProgram == null)
            return;
        let node = this.currentProgram.statements[this.currentProgramPosition];
        if (node == null)
            return;
        let position = node.position;
        if (position != null) {
            this.main.showProgramPointerPosition(this.currentProgram.module.file, position);
            this.debugger.showData(this.currentProgram, position, this.stack, this.currentStackframe, this.heap);
            let bottomDiv = this.main.getBottomDiv();
            if (bottomDiv.programPrinter != null) {
                if (this.currentProgram.module != this.lastPrintedModule) {
                    this.main.getBottomDiv().printModuleToBottomDiv(null, this.currentProgram.module);
                    this.lastPrintedModule = this.currentProgram.module;
                }
                this.main.getBottomDiv().programPrinter.showNode(node);
            }
        }
    }
    stepOut() {
        this.stepOverNestingLevel = 0;
        this.start();
    }
    oneStep(stepInto) {
        var _a, _b;
        (_b = (_a = this.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console) === null || _b === void 0 ? void 0 : _b.clearErrors();
        this.isFirstStatement = true;
        if (this.state != InterpreterState.paused) {
            this.init();
            if (this.state == InterpreterState.not_initialized) {
                return;
            }
            this.resetRuntime();
            this.showProgramPointerAndVariables();
            this.setState(InterpreterState.paused);
            // Are there static Variables to initialize?
            if (this.currentMethod == "Hauptprogramm") {
                // No static variable initializers
                this.return;
            }
        }
        this.stepOverNestingLevel = 10000;
        let oldStepOverNestingLevel = this.stepOverNestingLevel;
        let node = this.currentProgram.statements[this.currentProgramPosition];
        let position = node.position;
        let exception = this.nextStep();
        if (exception != null) {
            this.throwException(exception);
            return;
        }
        if (!stepInto && this.stepOverNestingLevel > oldStepOverNestingLevel) {
            this.stepOverNestingLevel = 0;
            if (position != null) {
                this.leaveLine = position.line;
            }
            else {
                this.leaveLine = -1;
            }
            this.start();
        }
        else 
        //@ts-ignore
        if (this.state == InterpreterState.done) {
            this.main.hideProgramPointerPosition();
        }
        else {
            this.showProgramPointerAndVariables();
            //@ts-ignore
            if (this.state != InterpreterState.waitingForInput) {
                this.setState(InterpreterState.paused);
            }
        }
    }
    nextStep() {
        this.stepFinished = false;
        let node;
        let exception;
        while (!this.stepFinished && !this.additionalStepFinishedFlag && exception == null) {
            if (typeof this.currentProgram == "undefined") {
                debugger;
            }
            if (this.currentProgramPosition > this.currentProgram.statements.length - 1) {
                this.setState(InterpreterState.done);
                break;
            }
            node = this.currentProgram.statements[this.currentProgramPosition];
            if (node.stepFinished != null) {
                this.stepFinished = node.stepFinished;
            }
            exception = this.executeNode(node);
        }
        this.additionalStepFinishedFlag = false;
        this.steps++;
        return exception;
    }
    executeNode(node) {
        var _a, _b;
        if (node.breakpoint != null && !this.isFirstStatement) {
            this.additionalStepFinishedFlag = true;
            this.pause();
            return;
        }
        this.isFirstStatement = false;
        let stackTop = this.stack.length - 1;
        let stackframeBegin = this.currentStackframe;
        let stack = this.stack;
        let value;
        switch (node.type) {
            case TokenType.castValue:
                let relPos = node.stackPosRelative == null ? 0 : node.stackPosRelative;
                value = stack[stackTop + relPos];
                try {
                    let casted = value.type.castTo(value, node.newType);
                    if (casted == undefined)
                        casted = {
                            value: value.value,
                            type: node.newType
                        };
                    stack[stackTop + relPos] = casted;
                }
                catch (err) {
                    if (err.message)
                        return err.message;
                    else
                        return "Bei dem Casten von " + value.type.identifier + " zu " + node.newType.identifier + " trat ein Fehler auf: " + err.name + ".";
                }
                break;
            case TokenType.checkCast:
                value = stack[stackTop];
                if (value.value == null)
                    break;
                let rto = value.value;
                if (node.newType instanceof Klass) {
                    if (typeof rto == "object") {
                        if (!rto.class.hasAncestorOrIs(node.newType)) {
                            return ("Das Objekt der Klasse " + rto.class.identifier + " kann nicht nach " + node.newType.identifier + " gecastet werden.");
                        }
                    }
                    else {
                        if (typeof rto == "number" && ["Integer", "Double", "Float"].indexOf(node.newType.identifier) < 0) {
                            return ("Eine Zahl kann nicht nach " + node.newType.identifier + " gecastet werden.");
                        }
                        else if (typeof rto == "string" && ["String", "Character"].indexOf(node.newType.identifier) < 0) {
                            return ("Eine Zeichenkette kann nicht nach " + node.newType.identifier + " gecastet werden.");
                        }
                        else if (typeof rto == "boolean" && node.newType.identifier != "Boolean") {
                            return ("Ein boolescher Wert kann nicht nach " + node.newType.identifier + " gecastet werden.");
                        }
                    }
                }
                else if (node.newType instanceof Interface) {
                    if (!rto.class.implementsInterface(node.newType)) {
                        return ("Das Objekt der Klasse " + rto.class.identifier + " implementiert nicht das Interface " + node.newType.identifier + ".");
                    }
                }
                break;
            case TokenType.localVariableDeclaration:
                let variable = node.variable;
                let type = variable.type;
                value = {
                    type: type,
                    value: null
                };
                if (type instanceof PrimitiveType) {
                    value.value = type.initialValue;
                }
                stack[variable.stackPos + stackframeBegin] = value;
                if (node.pushOnTopOfStackForInitialization) {
                    stack.push(value);
                }
                break;
            case TokenType.pushLocalVariableToStack:
                stack.push(stack[node.stackposOfVariable + stackframeBegin]);
                break;
            case TokenType.popAndStoreIntoVariable:
                stack[node.stackposOfVariable + stackframeBegin] = stack.pop();
                break;
            case TokenType.pushAttribute:
                let object1 = node.useThisObject ? stack[stackframeBegin].value : stack.pop().value;
                if (object1 == null)
                    return "Zugriff auf ein Attribut (" + node.attributeIdentifier + ") des null-Objekts";
                let value1 = object1.getValue(node.attributeIndex);
                if ((value1 === null || value1 === void 0 ? void 0 : value1.updateValue) != null) {
                    value1.updateValue(value1);
                }
                stack.push(value1);
                break;
            case TokenType.pushArrayLength:
                let a = stack.pop().value;
                if (a == null)
                    return "Zugriff auf das length-Attribut des null-Objekts";
                stack.push({ type: intPrimitiveType, value: a.length });
                break;
            case TokenType.assignment:
                value = stack.pop();
                stack[stackTop - 1].value = value.value;
                if (!(stack[stackTop - 1].type instanceof PrimitiveType)) {
                    stack[stackTop - 1].type = value.type;
                }
                if (!node.leaveValueOnStack) {
                    stack.pop();
                }
                break;
            case TokenType.plusAssignment:
                value = stack.pop();
                stack[stackTop - 1].value += value.value;
                break;
            case TokenType.minusAssignment:
                value = stack.pop();
                stack[stackTop - 1].value -= value.value;
                break;
            case TokenType.multiplicationAssignment:
                value = stack.pop();
                stack[stackTop - 1].value *= value.value;
                break;
            case TokenType.divisionAssignment:
                value = stack.pop();
                stack[stackTop - 1].value /= value.value;
                break;
            case TokenType.moduloAssignment:
                value = stack.pop();
                stack[stackTop - 1].value %= value.value;
                break;
            case TokenType.ANDAssigment:
                value = stack.pop();
                stack[stackTop - 1].value &= value.value;
                break;
            case TokenType.ORAssigment:
                value = stack.pop();
                stack[stackTop - 1].value |= value.value;
                break;
            case TokenType.XORAssigment:
                value = stack.pop();
                stack[stackTop - 1].value ^= value.value;
                break;
            case TokenType.shiftLeftAssigment:
                value = stack.pop();
                stack[stackTop - 1].value <<= value.value;
                break;
            case TokenType.shiftRightAssigment:
                value = stack.pop();
                stack[stackTop - 1].value >>= value.value;
                break;
            case TokenType.shiftRightUnsignedAssigment:
                value = stack.pop();
                stack[stackTop - 1].value >>>= value.value;
                break;
            case TokenType.binaryOp:
                let secondOperand = stack.pop();
                let resultValue = node.leftType.compute(node.operator, stack[stackTop - 1], secondOperand);
                if (resultValue instanceof Error) {
                    if (resultValue.message)
                        return resultValue.message;
                    else
                        "Bei der Berechnung von " + stack[stackTop - 1].type.identifier + " " +
                            TokenTypeReadable[node.operator] + " " + secondOperand.type.identifier +
                            " trat ein Fehler (" + resultValue.name + ") auf.";
                }
                let resultType = node.leftType.getResultType(node.operator, secondOperand.type);
                stack[stackTop - 1] = {
                    type: resultType,
                    value: resultValue
                };
                break;
            case TokenType.unaryOp:
                let oldValue = stack.pop();
                if (node.operator == TokenType.minus) {
                    stack.push({
                        type: oldValue.type,
                        value: -oldValue.value
                    });
                }
                else {
                    stack.push({
                        type: oldValue.type,
                        value: !oldValue.value
                    });
                }
                break;
            case TokenType.pushConstant:
                stack.push({
                    value: node.value,
                    type: node.dataType
                });
                break;
            case TokenType.pushStaticClassObject:
                if (node.klass instanceof Klass) {
                    stack.push({
                        type: node.klass.staticClass,
                        value: node.klass.staticClass.classObject
                    });
                }
                else {
                    // This is to enable instanceof operator with interfaces
                    stack.push({
                        type: node.klass,
                        value: node.klass
                    });
                }
                break;
            case TokenType.pushStaticAttribute:
                value = node.klass.classObject.getValue(node.attributeIndex);
                if (value.updateValue != null) {
                    value.updateValue(value);
                }
                stack.push(value);
                break;
            // case TokenType.pushStaticAttributeIntrinsic:
            //     value = node.
            //     stack.push({ type: node.attribute.type, value: node.attribute.updateValue(null) });
            //     break;
            case TokenType.selectArrayElement:
                let index = stack.pop();
                let array = stack.pop();
                if (array.value == null)
                    return "Zugriff auf ein Element eines null-Feldes";
                if (index.value >= array.value.length || index.value < 0) {
                    return "Zugriff auf das Element mit Index " + index.value + " eines Feldes der Länge " + array.value.length;
                }
                stack.push(array.value[index.value]);
                break;
            case TokenType.callMainMethod:
                this.stack.push({ value: node.staticClass.classObject, type: node.staticClass });
                let parameter = {
                    value: [{ value: "Test", type: stringPrimitiveType }],
                    type: new ArrayType(stringPrimitiveType)
                };
                let parameterBegin2 = stackTop + 2; // 1 parameter
                this.stack.push(parameter);
                this.stackframes.push(this.currentStackframe);
                this.programStack.push({
                    program: this.currentProgram,
                    programPosition: this.currentProgramPosition + 1,
                    textPosition: node.position,
                    method: this.currentMethod,
                    callbackAfterReturn: this.currentCallbackAfterReturn,
                    isCalledFromOutside: null
                });
                this.currentCallbackAfterReturn = null;
                this.currentStackframe = parameterBegin2;
                this.currentProgram = node.method.program;
                this.currentMethod = node.method;
                this.currentProgramPosition = -1; // gets increased after switch statement...
                for (let i = 0; i < node.method.reserveStackForLocalVariables; i++) {
                    stack.push(null);
                }
                // this.stepOverNestingLevel++;
                break;
            case TokenType.makeEllipsisArray:
                let ellipsisArray = stack.splice(stack.length - node.parameterCount, node.parameterCount);
                stack.push({
                    value: ellipsisArray,
                    type: node.arrayType
                });
                break;
            case TokenType.callMethod:
                // node.stackframebegin = -(parameters.parameterTypes.length + 1)
                let method = node.method;
                let parameterBegin = stackTop + 1 + node.stackframeBegin;
                let parameters1 = method.parameterlist.parameters;
                for (let i = parameterBegin + 1; i <= stackTop; i++) {
                    if (this.stack[i] != null && this.stack[i].type instanceof PrimitiveType) {
                        stack[i] = {
                            type: parameters1[i - parameterBegin - 1].type,
                            value: stack[i].value
                        };
                    }
                }
                if (stack[parameterBegin].value == null && !method.isStatic) {
                    return "Aufruf der Methode " + method.identifier + " des null-Objekts";
                }
                if (method.isAbstract || method.isVirtual && !node.isSuperCall) {
                    let object = stack[parameterBegin];
                    if (object.value instanceof RuntimeObject) {
                        method = object.value.class.getMethodBySignature(method.signature);
                    }
                    else {
                        method = object.type.getMethodBySignature(method.signature);
                    }
                }
                if (method == null) {
                    // TODO: raise runtime error
                    break;
                }
                if (method.invoke != null) {
                    let rt = method.getReturnType();
                    let parameters = stack.splice(parameterBegin);
                    let returnValue = method.invoke(parameters);
                    console.log("invoking method", method, rt, returnValue, (rt != null && rt.identifier != 'void' && (!(rt instanceof PrimitiveType)) && returnValue == null));
                    // if (rt != null && rt.identifier != 'void' && (! (rt instanceof PrimitiveType)) && returnValue == null) rt = nullType;
                    if (rt != null && rt.identifier != 'void') {
                        stack.push({
                            value: returnValue,
                            type: rt
                        });
                    }
                }
                else {
                    this.stackframes.push(this.currentStackframe);
                    this.programStack.push({
                        program: this.currentProgram,
                        programPosition: this.currentProgramPosition + 1,
                        textPosition: node.position,
                        method: this.currentMethod,
                        callbackAfterReturn: this.currentCallbackAfterReturn,
                        isCalledFromOutside: null
                    });
                    this.currentCallbackAfterReturn = null;
                    this.currentStackframe = parameterBegin;
                    this.currentProgram = method.program;
                    this.currentMethod = method;
                    this.currentProgramPosition = -1; // gets increased after switch statement...
                    for (let i = 0; i < method.reserveStackForLocalVariables; i++) {
                        stack.push(null);
                    }
                    this.stepOverNestingLevel++;
                    this.additionalStepFinishedFlag = true;
                }
                break;
            case TokenType.callInputMethod:
                // node.stackframebegin = -(parameters.parameterTypes.length + 1)
                let method1 = node.method;
                let parameterBegin1 = stackTop + 1 + node.stackframeBegin;
                let parameters = stack.splice(parameterBegin1);
                this.pauseForInput();
                let that = this;
                this.inputManager.readInput(method1, parameters, (value) => {
                    that.resumeAfterInput(value);
                });
                break;
            case TokenType.return:
                this.return(node, stack);
                break;
            case TokenType.decreaseStackpointer:
                stack.splice(stackTop + 1 - node.popCount);
                break;
            case TokenType.initStackframe:
                this.stackframes.push(this.currentStackframe);
                this.currentStackframe = stackTop + 1;
                for (let i = 0; i < node.reserveForLocalVariables; i++) {
                    stack.push(null);
                }
                break;
            case TokenType.closeStackframe:
                stack.splice(stackframeBegin);
                this.currentStackframe = this.stackframes.pop();
                break;
            case TokenType.newObject:
                let object = new RuntimeObject(node.class);
                value = {
                    value: object,
                    type: node.class
                };
                stack.push(value);
                if (node.subsequentConstructorCall) {
                    stack.push(value);
                    stackTop++;
                }
                let klass = node.class;
                while (klass != null) {
                    let aip = klass.attributeInitializationProgram;
                    if (aip.statements.length > 0) {
                        this.stackframes.push(this.currentStackframe);
                        this.programStack.push({
                            program: this.currentProgram,
                            programPosition: this.currentProgramPosition + 1,
                            textPosition: node.position,
                            method: this.currentMethod,
                            callbackAfterReturn: this.currentCallbackAfterReturn,
                            isCalledFromOutside: null
                        });
                        this.currentCallbackAfterReturn = null;
                        this.currentStackframe = stackTop + 1;
                        this.currentProgram = aip;
                        this.currentProgramPosition = -1;
                        this.currentMethod = "Konstruktor von " + klass.identifier;
                        this.stepOverNestingLevel++;
                        this.additionalStepFinishedFlag = true;
                    }
                    klass = klass.baseClass;
                }
                // N.B.: constructor call is next statement
                break;
            case TokenType.processPostConstructorCallbacks:
                value = stack[stackTop];
                let classType = value.type;
                for (let pcc of classType.getPostConstructorCallbacks()) {
                    pcc(value.value);
                }
                break;
            case TokenType.extendedForLoopInit:
                stack[node.stackPosOfCounter + stackframeBegin] = {
                    type: intPrimitiveType,
                    value: 0
                };
                break;
            case TokenType.extendedForLoopCheckCounterAndGetElement:
                let counter = stack[node.stackPosOfCounter + stackframeBegin].value++;
                let collection = stack[node.stackPosOfCollection + stackframeBegin].value;
                switch (node.kind) {
                    case "array":
                        if (counter < collection.length) {
                            stack[node.stackPosOfElement + stackframeBegin].value = collection[counter].value;
                            stack[node.stackPosOfElement + stackframeBegin].type = collection[counter].type;
                        }
                        else {
                            this.currentProgramPosition = node.destination - 1;
                        }
                        break;
                    case "internalList":
                        let list = collection.intrinsicData["ListHelper"].valueArray;
                        if (counter < list.length) {
                            stack[node.stackPosOfElement + stackframeBegin].value = list[counter].value;
                            stack[node.stackPosOfElement + stackframeBegin].type = list[counter].type;
                        }
                        else {
                            this.currentProgramPosition = node.destination - 1;
                        }
                        break;
                    case "group":
                        let list1 = collection.intrinsicData["Actor"].shapes;
                        if (counter < list1.length) {
                            stack[node.stackPosOfElement + stackframeBegin].value = list1[counter];
                            stack[node.stackPosOfElement + stackframeBegin].type = list1[counter].klass;
                        }
                        else {
                            this.currentProgramPosition = node.destination - 1;
                        }
                        break;
                }
                break;
            case TokenType.incrementDecrementBefore:
                value = stack[stackTop];
                value.value += node.incrementDecrementBy;
                break;
            case TokenType.incrementDecrementAfter:
                value = stack[stackTop];
                // replace value by copy:
                stack[stackTop] = {
                    value: value.value,
                    type: value.type
                };
                // increment value which is not involved in subsequent 
                value.value += node.incrementDecrementBy;
                break;
            case TokenType.jumpAlways:
                this.currentProgramPosition = node.destination - 1;
                break;
            case TokenType.jumpIfTrue:
                value = stack.pop();
                if (value.value) {
                    this.currentProgramPosition = node.destination - 1;
                }
                break;
            case TokenType.jumpIfFalse:
                value = stack.pop();
                if (!value.value) {
                    this.currentProgramPosition = node.destination - 1;
                }
                break;
            case TokenType.jumpIfTrueAndLeaveOnStack:
                value = stack[stackTop];
                if (value.value) {
                    this.currentProgramPosition = node.destination - 1;
                }
                break;
            case TokenType.jumpIfFalseAndLeaveOnStack:
                value = stack[stackTop];
                if (!value.value) {
                    this.currentProgramPosition = node.destination - 1;
                }
                break;
            case TokenType.noOp:
                break;
            case TokenType.programEnd:
                if (this.programStack.length > 0) {
                    this.popProgram();
                    this.currentProgramPosition--; // gets increased later on after switch ends
                    this.additionalStepFinishedFlag = true;
                    this.leaveLine = -1;
                    if (node.pauseAfterProgramEnd) {
                        this.stepOverNestingLevel = -1;
                    }
                    break;
                }
                if ((this.worldHelper != null && this.worldHelper.hasActors()) || this.processingHelper != null
                    || (this.gngEreignisbehandlungHelper != null && this.gngEreignisbehandlungHelper.hasAktionsEmpfaenger())) {
                    this.currentProgramPosition--;
                    break;
                }
                let baseModule = this.main.getCurrentWorkspace().moduleStore.getModule("Base Module");
                let timerClass = baseModule.typeStore.getType("Timer");
                if (timerClass.timerEntries.length > 0) {
                    this.currentProgramPosition--;
                    break;
                }
                // this.setState(InterpreterState.done);
                this.currentProgram = null;
                this.currentProgramPosition = -1;
                this.additionalStepFinishedFlag = true;
                Helper.showHelper("speedControlHelper", this.main);
                this.printManager.showProgramEnd();
                if (this.steps > 0) {
                    let dt = performance.now() - this.timeWhenProgramStarted;
                    let message = 'Executed ' + this.steps + ' steps in ' + this.round(dt)
                        + ' ms (' + this.round(this.steps / dt * 1000) + ' steps/s)';
                    (_b = (_a = this.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console) === null || _b === void 0 ? void 0 : _b.writeConsoleEntry(message, null);
                    // console.log(this.timerEvents + " TimeEvents in " + dt + " ms ergibt ein Event alle " + dt/this.timerEvents + " ms.");
                    // console.log("Vorgegebene Timerfrequenz: Alle " + this.timerDelayMs + " ms");
                    this.steps = -1;
                }
                // if (this.worldHelper != null) {
                //     this.worldHelper.spriteAnimations = [];
                // }
                // this.gngEreignisbehandlungHelper?.detachEvents();
                // this.gngEreignisbehandlungHelper = null;
                // this.main.hideProgramPointerPosition();
                // if(this.worldHelper != null){
                //     this.worldHelper.cacheAsBitmap();
                // }
                this.currentProgramPosition--;
                this.stop();
                break;
            case TokenType.print:
            case TokenType.println:
                let text = null;
                let color = null;
                if (node.withColor)
                    color = stack.pop().value;
                if (!node.empty) {
                    text = stack.pop().value;
                    if (text == null)
                        text = "null";
                }
                if (node.type == TokenType.println) {
                    this.printManager.println(text, color);
                }
                else {
                    this.printManager.print(text, color);
                }
                break;
            case TokenType.pushEmptyArray:
                let counts = [];
                for (let i = 0; i < node.dimension; i++) {
                    counts.push(stack.pop().value);
                }
                stack.push(this.makeEmptyArray(counts, node.arrayType));
                break;
            case TokenType.beginArray:
                stack.push({
                    type: node.arrayType,
                    value: []
                });
                break;
            case TokenType.addToArray:
                stackTop -= node.numberOfElementsToAdd;
                // let values: Value[] = stack.splice(stackTop + 1, node.numberOfElementsToAdd);
                let values = stack.splice(stackTop + 1, node.numberOfElementsToAdd).map(tvo => ({ type: tvo.type, value: tvo.value }));
                stack[stackTop].value = stack[stackTop].value.concat(values);
                break;
            case TokenType.pushEnumValue:
                let enumInfo = node.enumClass.identifierToInfoMap[node.valueIdentifier];
                stack.push(node.enumClass.valueList.value[enumInfo.ordinal]);
                break;
            case TokenType.keywordSwitch:
                let switchValue = stack.pop().value;
                let destination = node.destinationMap[switchValue];
                if (destination != null) {
                    this.currentProgramPosition = destination - 1; // it will be increased after this switch-statement!
                }
                else {
                    if (node.defaultDestination != null) {
                        this.currentProgramPosition = node.defaultDestination - 1;
                    }
                    // there's a jumpnode after this node which jumps right after last switch case,
                    // so there's nothing more to do here.
                }
                break;
            case TokenType.heapVariableDeclaration:
                let v = node.variable;
                this.heap[v.identifier] = v;
                v.value = {
                    type: v.type,
                    value: (v.type instanceof PrimitiveType) ? v.type.initialValue : null
                };
                if (node.pushOnTopOfStackForInitialization) {
                    this.stack.push(v.value);
                }
                break;
            case TokenType.pushFromHeapToStack:
                let v1 = this.heap[node.identifier];
                if (v1 != null) {
                    this.stack.push(v1.value);
                }
                else {
                    return "Die Variable " + node.identifier + " ist nicht bekannt.";
                }
                break;
            case TokenType.returnIfDestroyed:
                let shapeRuntimeObject = this.stack[stackframeBegin].value;
                if (shapeRuntimeObject != null) {
                    let shape = shapeRuntimeObject.intrinsicData["Actor"];
                    if (shape["isDestroyed"] == true) {
                        this.return(null, stack);
                    }
                }
                break;
            case TokenType.setPauseDuration:
                let duration = this.stack.pop().value;
                if (this.pauseUntil == null) {
                    this.pauseUntil = performance.now() + duration;
                }
                break;
            case TokenType.pause:
                node.stepFinished = true;
                if (this.pauseUntil != null && performance.now() < this.pauseUntil) {
                    this.currentProgramPosition--;
                }
                else {
                    this.pauseUntil = null;
                }
                break;
        }
        this.currentProgramPosition++;
    }
    pauseForInput() {
        this.timerStopped = true;
        this.additionalStepFinishedFlag = true;
        this.oldState = this.state;
        this.setState(InterpreterState.waitingForInput);
        this.showProgramPointerAndVariables();
    }
    resumeAfterInput(value, popPriorValue = false) {
        if (popPriorValue)
            this.stack.pop();
        if (value != null)
            this.stack.push(value);
        this.main.hideProgramPointerPosition();
        this.setState(InterpreterState.paused);
        if (this.oldState == InterpreterState.running) {
            this.start();
        }
        else {
            this.showProgramPointerAndVariables();
        }
    }
    return(node, stack) {
        let currentCallbackAfterReturn = this.currentCallbackAfterReturn;
        if (node != null && node.copyReturnValueToStackframePos0) {
            let returnValue = stack.pop();
            stack[this.currentStackframe] = returnValue;
            stack.splice(this.currentStackframe + 1);
        }
        else {
            stack.splice(this.currentStackframe + ((node != null && node.leaveThisObjectOnStack) ? 1 : 0));
        }
        this.currentStackframe = this.stackframes.pop();
        this.popProgram();
        if (node != null && node.methodWasInjected == true)
            this.currentProgramPosition++;
        this.currentProgramPosition--; // position gets increased by one at the end of this switch-statement, so ... - 1
        this.stepOverNestingLevel--;
        if (currentCallbackAfterReturn != null) {
            currentCallbackAfterReturn(this);
        }
        if (this.stepOverNestingLevel < 0 && this.currentProgram.statements[this.currentProgramPosition + 1].type == TokenType.jumpAlways) {
            this.stepFinished = false;
        }
    }
    makeEmptyArray(counts, type) {
        let type1 = type.arrayOfType;
        if (counts.length == 1) {
            let array = [];
            for (let i = 0; i < counts[0]; i++) {
                let v = {
                    type: type1,
                    value: null
                };
                if (type1 instanceof PrimitiveType) {
                    v.value = type1.initialValue;
                }
                array.push(v);
            }
            return {
                type: type,
                value: array
            };
        }
        else {
            let array = [];
            let n = counts.pop();
            for (let i = 0; i < n; i++) {
                array.push(this.makeEmptyArray(counts, type1));
            }
            return {
                type: type,
                value: array
            };
        }
    }
    round(n) {
        return "" + Math.round(n * 10000) / 10000;
    }
    setState(state) {
        // console.log("Set state " + InterpreterState[state]);
        var _a;
        let oldState = this.state;
        this.state = state;
        if (state == InterpreterState.error || state == InterpreterState.done) {
            this.closeAllWebsockets();
        }
        let am = this.main.getActionManager();
        for (let actionId of this.actions) {
            am.setActive("interpreter." + actionId, this.buttonActiveMatrix[actionId][state]);
        }
        let buttonStartActive = this.buttonActiveMatrix['start'][state];
        if (buttonStartActive) {
            this.controlButtons.$buttonStart.show();
            this.controlButtons.$buttonPause.hide();
        }
        else {
            this.controlButtons.$buttonStart.hide();
            this.controlButtons.$buttonPause.show();
        }
        let buttonStopActive = this.buttonActiveMatrix['stop'][state];
        if (buttonStopActive) {
            // this.controlButtons.$buttonEdit.show();
        }
        else {
            // this.controlButtons.$buttonEdit.hide();
            if (this.worldHelper != null) {
                this.worldHelper.clearActorLists();
            }
            (_a = this.gngEreignisbehandlungHelper) === null || _a === void 0 ? void 0 : _a.detachEvents();
            this.gngEreignisbehandlungHelper = null;
        }
        if (this.runningStates.indexOf(oldState) >= 0 && this.runningStates.indexOf(state) < 0) {
            this.debugger.disable();
            // this.main.getMonacoEditor().updateOptions({ readOnly: false });
            this.keyboardTool.unsubscribeAllListeners();
        }
        if (this.runningStates.indexOf(oldState) < 0 && this.runningStates.indexOf(state) >= 0) {
            this.debugger.enable();
            // this.main.getMonacoEditor().updateOptions({ readOnly: true });
        }
    }
    closeAllWebsockets() {
        this.webSocketsToCloseAfterProgramHalt.forEach(socket => socket.close());
        this.webSocketsToCloseAfterProgramHalt = [];
    }
    pushCurrentProgram() {
        if (this.currentProgram == null)
            return;
        let textPosition;
        let currentStatement = this.currentProgram.statements[this.currentProgramPosition];
        if (currentStatement != null) {
            textPosition = currentStatement.position;
        }
        this.programStack.push({
            program: this.currentProgram,
            programPosition: this.currentProgramPosition,
            textPosition: textPosition,
            method: this.currentMethod,
            callbackAfterReturn: this.currentCallbackAfterReturn,
            isCalledFromOutside: this.currentIsCalledFromOutside
        });
        this.currentCallbackAfterReturn = null;
        this.currentIsCalledFromOutside = null;
    }
    // runTimer(method: Method, stackElements: Value[],
    //     callbackAfterReturn: (interpreter: Interpreter) => void) {
    //     if(this.state != InterpreterState.running){
    //         return;
    //     }
    //     this.pushCurrentProgram();
    //     this.currentProgram = method.program;
    //     this.currentMethod = method;
    //     this.currentProgramPosition = 0;
    //     this.currentCallbackAfterReturn = callbackAfterReturn;
    //     this.currentIsCalledFromOutside = "Timer";
    //     this.stackframes.push(this.currentStackframe);
    //     this.currentStackframe = this.stack.length;
    //     for (let se of stackElements) this.stack.push(se);
    //     let statements = method.program.statements;
    //     // if program ends with return then this return-statement decreases stepOverNestingLevel. So we increase it
    //     // beforehand to compensate this effect.
    //     if(statements[statements.length - 1].type == TokenType.return) this.stepOverNestingLevel++;
    // }
    runTimer(method, stackElements, callbackAfterReturn, isActor) {
        if (this.state != InterpreterState.running) {
            return;
        }
        let statements = method.program.statements;
        if (isActor || this.programStack.length == 0) {
            // Main Program is running => Timer has higher precedence
            this.pushCurrentProgram();
            this.currentProgram = method.program;
            this.currentMethod = method;
            this.currentProgramPosition = 0;
            this.currentCallbackAfterReturn = callbackAfterReturn;
            this.currentIsCalledFromOutside = "Timer";
            this.stackframes.push(this.currentStackframe);
            this.currentStackframe = this.stack.length;
            this.stack = this.stack.concat(stackElements);
            // for (let se of stackElements) this.stack.push(se);
            // if program ends with return then this return-statement decreases stepOverNestingLevel. So we increase it
            // beforehand to compensate this effect.
            if (statements[statements.length - 1].type == TokenType.return)
                this.stepOverNestingLevel++;
        }
        else {
            // another Timer is running => queue up
            // position 0 in program stack is main program
            // => insert timer in position 1
            this.programStack.splice(1, 0, {
                program: method.program,
                programPosition: 0,
                textPosition: { line: 0, column: 0, length: 0 },
                method: method,
                callbackAfterReturn: callbackAfterReturn,
                isCalledFromOutside: "Timer",
                stackElementsToPushBeforeFirstExecuting: stackElements
            });
            if (statements[statements.length - 1].type == TokenType.return)
                this.stepOverNestingLevel++;
        }
    }
    evaluate(program) {
        this.pushCurrentProgram();
        this.currentProgram = program;
        this.currentProgramPosition = 0;
        let stacksizeBefore = this.stack.length;
        let oldInterpreterState = this.state;
        let stepOverNestingLevel = this.stepOverNestingLevel;
        let additionalStepFinishedFlag = this.additionalStepFinishedFlag;
        let oldStackframe = this.currentStackframe;
        let error;
        let stepCount = 0;
        try {
            while (error == null &&
                (this.currentProgram != program || this.currentProgramPosition <
                    this.currentProgram.statements.length)
                && stepCount < 100000
            // && this.currentProgram == program
            ) {
                error = this.nextStep();
                stepCount++;
            }
        }
        catch (e) {
            error = "Fehler bei der Auswertung";
        }
        if (this.currentProgram == program && this.programStack.length > 0) {
            this.popProgram();
        }
        let stackTop;
        if (this.stack.length > stacksizeBefore) {
            stackTop = this.stack.pop();
            while (this.stack.length > stacksizeBefore) {
                this.stack.pop();
            }
        }
        this.stepOverNestingLevel = stepOverNestingLevel;
        this.additionalStepFinishedFlag = additionalStepFinishedFlag;
        this.setState(oldInterpreterState);
        return {
            error: error,
            value: stackTop
        };
    }
    executeImmediatelyInNewStackframe(program, valuesToPushBeforeExecuting) {
        this.pushCurrentProgram();
        this.currentProgram = program;
        let oldProgramPosition = this.currentProgramPosition;
        this.currentProgramPosition = 0;
        let numberOfStackframesBefore = this.stackframes.length;
        this.stackframes.push(this.currentStackframe);
        let stacksizeBefore = this.stack.length;
        this.currentStackframe = stacksizeBefore;
        for (let v of valuesToPushBeforeExecuting)
            this.stack.push(v);
        let oldInterpreterState = this.state;
        let stepOverNestingLevel = this.stepOverNestingLevel;
        let additionalStepFinishedFlag = this.additionalStepFinishedFlag;
        let stepCount = 0;
        let error = null;
        try {
            while (this.stackframes.length > numberOfStackframesBefore
                && stepCount < 100000 && error == null) {
                let node = this.currentProgram.statements[this.currentProgramPosition];
                error = this.executeNode(node);
                stepCount++;
            }
        }
        catch (e) {
            error = "Fehler bei der Auswertung";
        }
        if (stepCount == 100000)
            this.throwException("Die Ausführung des Konstruktors dauerte zu lange.");
        let stackTop;
        if (this.stack.length > stacksizeBefore) {
            stackTop = this.stack.pop();
            while (this.stack.length > stacksizeBefore) {
                this.stack.pop();
            }
        }
        this.stepOverNestingLevel = stepOverNestingLevel;
        this.additionalStepFinishedFlag = additionalStepFinishedFlag;
        // this.currentProgramPosition++;
        this.currentProgramPosition = oldProgramPosition;
        this.setState(oldInterpreterState);
        return {
            error: error,
            value: stackTop
        };
    }
    instantiateObjectImmediately(klass) {
        let object = new RuntimeObject(klass);
        let value = {
            value: object,
            type: klass
        };
        let klass1 = klass;
        while (klass1 != null) {
            let aip = klass1.attributeInitializationProgram;
            if (aip.statements.length > 0) {
                this.executeImmediatelyInNewStackframe(aip, [value]);
            }
            klass1 = klass1.baseClass;
        }
        let constructor = klass.getMethodBySignature(klass.identifier + "()");
        if (constructor != null && constructor.program != null) {
            // let programWithoutReturnStatement: Program = {
            //     labelManager: null,
            //     module: constructor.program.module,
            //     statements: constructor.program.statements.slice(0, constructor.program.statements.length - 1)
            // };
            this.executeImmediatelyInNewStackframe(constructor.program, [value]);
        }
        return object;
    }
    registerDatabaseConnection(ch) {
        this.databaseConnectionHelpers.push(ch);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW50ZXJwcmV0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50L2ludGVycHJldGVyL0ludGVycHJldGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBZ0IsU0FBUyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFHeEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQXFCLE1BQU0sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUczRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbkQsT0FBTyxFQUFFLGdCQUFnQixFQUEyQixtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVqRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFL0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBU3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUd0RCxNQUFNLENBQU4sSUFBWSxnQkFFWDtBQUZELFdBQVksZ0JBQWdCO0lBQ3hCLDZFQUFlLENBQUE7SUFBRSw2REFBTyxDQUFBO0lBQUUsMkRBQU0sQ0FBQTtJQUFFLHlEQUFLLENBQUE7SUFBRSx1REFBSSxDQUFBO0lBQUUsNkVBQWUsQ0FBQTtJQUFFLHlGQUFxQixDQUFBO0FBQ3pGLENBQUMsRUFGVyxnQkFBZ0IsS0FBaEIs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QUM7U0FDN0I7UUFFRCxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUN0RSxJQUFJLFdBQVcsSUFBSSxJQUFJLElBQUksV0FBVyxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDcEQsaURBQWlEO1lBQ2pELDBCQUEwQjtZQUMxQiwwQ0FBMEM7WUFDMUMscUdBQXFHO1lBQ3JHLEtBQUs7WUFDTCxJQUFJLENBQUMsaUNBQWlDLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDeEU7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUVsQixDQUFDO0lBRUQsMEJBQTBCLENBQUMsRUFBb0I7UUFDM0MsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1QyxDQUFDO0NBR0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUZXh0UG9zaXRpb24sIFRva2VuVHlwZSwgVG9rZW5UeXBlUmVhZGFibGUgfSBmcm9tIFwiLi4vY29tcGlsZXIvbGV4ZXIvVG9rZW4uanNcIjtcclxuaW1wb3J0IHsgTW9kdWxlLCBNb2R1bGVTdG9yZSB9IGZyb20gXCIuLi9jb21waWxlci9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IFByb2dyYW0sIFN0YXRlbWVudCwgUmV0dXJuU3RhdGVtZW50IH0gZnJvbSBcIi4uL2NvbXBpbGVyL3BhcnNlci9Qcm9ncmFtLmpzXCI7XHJcbmltcG9ydCB7IEFycmF5VHlwZSB9IGZyb20gXCIuLi9jb21waWxlci90eXBlcy9BcnJheS5qc1wiO1xyXG5pbXBvcnQgeyBLbGFzcywgSW50ZXJmYWNlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL0NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IEVudW0sIEVudW1SdW50aW1lT2JqZWN0IH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL0VudW0uanNcIjtcclxuaW1wb3J0IHsgUHJpbWl0aXZlVHlwZSwgVHlwZSwgVmFsdWUsIEhlYXAsIE1ldGhvZCB9IGZyb20gXCIuLi9jb21waWxlci90eXBlcy9UeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBQcmludE1hbmFnZXIgfSBmcm9tIFwiLi4vbWFpbi9ndWkvUHJpbnRNYW5hZ2VyLmpzXCI7XHJcbmltcG9ydCB7IE1haW4gfSBmcm9tIFwiLi4vbWFpbi9NYWluLmpzXCI7XHJcbmltcG9ydCB7IERlYnVnZ2VyIH0gZnJvbSBcIi4vRGVidWdnZXIuanNcIjtcclxuaW1wb3J0IHsgUnVudGltZU9iamVjdCB9IGZyb20gXCIuL1J1bnRpbWVPYmplY3QuanNcIjtcclxuaW1wb3J0IHsgaW50UHJpbWl0aXZlVHlwZSwgbnVsbFR5cGUsIE9wZXJhbmRJc051bGwsIHN0cmluZ1ByaW1pdGl2ZVR5cGUgfSBmcm9tIFwiLi4vY29tcGlsZXIvdHlwZXMvUHJpbWl0aXZlVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW5wdXRNYW5hZ2VyIH0gZnJvbSBcIi4vSW5wdXRNYW5hZ2VyLmpzXCI7XHJcbmltcG9ydCB7IFdvcmxkSGVscGVyIH0gZnJvbSBcIi4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1dvcmxkLmpzXCI7XHJcbmltcG9ydCB7IEhlbHBlciB9IGZyb20gXCIuLi9tYWluL2d1aS9IZWxwZXIuanNcIjtcclxuaW1wb3J0IHsgVGltZXJDbGFzcyB9IGZyb20gXCIuLi9ydW50aW1lbGlicmFyeS9UaW1lci5qc1wiO1xyXG5pbXBvcnQgeyBLZXlib2FyZFRvb2wgfSBmcm9tIFwiLi4vdG9vbHMvS2V5Ym9hcmRUb29sLmpzXCI7XHJcbmltcG9ydCB7IFByb2dyYW1Db250cm9sQnV0dG9ucyB9IGZyb20gXCIuLi9tYWluL2d1aS9Qcm9ncmFtQ29udHJvbEJ1dHRvbnMuanNcIjtcclxuaW1wb3J0IHsgTWFpbkJhc2UgfSBmcm9tIFwiLi4vbWFpbi9NYWluQmFzZS5qc1wiO1xyXG5pbXBvcnQgeyBMaXN0SGVscGVyIH0gZnJvbSBcIi4uL3J1bnRpbWVsaWJyYXJ5L2NvbGxlY3Rpb25zL0FycmF5TGlzdC5qc1wiO1xyXG5pbXBvcnQgeyBHcm91cEhlbHBlciB9IGZyb20gXCIuLi9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9Hcm91cC5qc1wiO1xyXG5pbXBvcnQgeyBXZWJTb2NrZXRSZXF1ZXN0S2VlcEFsaXZlIH0gZnJvbSBcIi4uL2NvbW11bmljYXRpb24vRGF0YS5qc1wiO1xyXG5pbXBvcnQgeyBNYWluRW1iZWRkZWQgfSBmcm9tIFwiLi4vZW1iZWRkZWQvTWFpbkVtYmVkZGVkLmpzXCI7XHJcbmltcG9ydCB7IFByb2Nlc3NpbmdIZWxwZXIgfSBmcm9tIFwiLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvUHJvY2Vzc2luZy5qc1wiO1xyXG5pbXBvcnQgeyBHTkdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXIgfSBmcm9tIFwiLi4vcnVudGltZWxpYnJhcnkvZ25nL0dOR0VyZWlnbmlzYmVoYW5kbHVuZy5qc1wiO1xyXG5pbXBvcnQgeyBHYW1lcGFkVG9vbCB9IGZyb20gXCIuLi90b29scy9HYW1lcGFkVG9vbC5qc1wiO1xyXG5pbXBvcnQgeyBDb25uZWN0aW9uSGVscGVyIH0gZnJvbSBcIi4uL3J1bnRpbWVsaWJyYXJ5L2RhdGFiYXNlL0Nvbm5lY3Rpb24uanNcIjtcclxuXHJcbmV4cG9ydCBlbnVtIEludGVycHJldGVyU3RhdGUge1xyXG4gICAgbm90X2luaXRpYWxpemVkLCBydW5uaW5nLCBwYXVzZWQsIGVycm9yLCBkb25lLCB3YWl0aW5nRm9ySW5wdXQsIHdhaXRpbmdGb3JUaW1lcnNUb0VuZFxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBQcm9ncmFtU3RhY2tFbGVtZW50ID0ge1xyXG4gICAgcHJvZ3JhbTogUHJvZ3JhbSxcclxuICAgIHByb2dyYW1Qb3NpdGlvbjogbnVtYmVyLCAgLy8gbmV4dCBwb3NpdGlvbiB0byBleGVjdXRlIGFmdGVyIHJldHVyblxyXG4gICAgdGV4dFBvc2l0aW9uOiBUZXh0UG9zaXRpb24sIC8vIHRleHRwb3NpdGlvbiBvZiBtZXRob2QgY2FsbFxyXG4gICAgbWV0aG9kOiBNZXRob2QgfCBzdHJpbmcsXHJcbiAgICBjYWxsYmFja0FmdGVyUmV0dXJuOiAoaW50ZXJwcmV0ZXI6IEludGVycHJldGVyKSA9PiB2b2lkLFxyXG4gICAgaXNDYWxsZWRGcm9tT3V0c2lkZTogc3RyaW5nLFxyXG4gICAgc3RhY2tFbGVtZW50c1RvUHVzaEJlZm9yZUZpcnN0RXhlY3V0aW5nPzogVmFsdWVbXVxyXG59O1xyXG5cclxuZXhwb3J0IGNsYXNzIEludGVycHJldGVyIHtcclxuXHJcbiAgICBkZWJ1Z2dlcjogRGVidWdnZXI7XHJcblxyXG4gICAgbWFpbk1vZHVsZTogTW9kdWxlO1xyXG4gICAgbW9kdWxlU3RvcmU6IE1vZHVsZVN0b3JlO1xyXG4gICAgbW9kdWxlU3RvcmVWZXJzaW9uOiBudW1iZXIgPSAtMTAwO1xyXG5cclxuICAgIHByaW50TWFuYWdlcjogUHJpbnRNYW5hZ2VyO1xyXG4gICAgaW5wdXRNYW5hZ2VyOiBJbnB1dE1hbmFnZXI7XHJcblxyXG4gICAgc3RlcHNQZXJTZWNvbmQgPSAyO1xyXG4gICAgbWF4U3RlcHNQZXJTZWNvbmQgPSAxMDAwMDAwO1xyXG4gICAgdGltZXJEZWxheU1zID0gMTA7XHJcblxyXG4gICAgdGltZXJJZDogYW55O1xyXG4gICAgc3RhdGU6IEludGVycHJldGVyU3RhdGU7XHJcblxyXG4gICAgY3VycmVudFByb2dyYW06IFByb2dyYW07XHJcbiAgICBjdXJyZW50UHJvZ3JhbVBvc2l0aW9uOiBudW1iZXI7XHJcbiAgICBjdXJyZW50TWV0aG9kOiBNZXRob2QgfCBzdHJpbmc7XHJcbiAgICBjdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybjogKGludGVycHJldGVyOiBJbnRlcnByZXRlcikgPT4gdm9pZDtcclxuICAgIGN1cnJlbnRJc0NhbGxlZEZyb21PdXRzaWRlOiBzdHJpbmdcclxuXHJcbiAgICBwcm9ncmFtU3RhY2s6IFByb2dyYW1TdGFja0VsZW1lbnRbXSA9IFtdO1xyXG5cclxuICAgIHN0YWNrOiBWYWx1ZVtdID0gW107XHJcbiAgICBzdGFja2ZyYW1lczogbnVtYmVyW10gPSBbXTtcclxuICAgIGN1cnJlbnRTdGFja2ZyYW1lOiBudW1iZXI7XHJcblxyXG4gICAgaGVhcDogSGVhcCA9IHt9O1xyXG5cclxuICAgIHRpbWVyU3RvcHBlZDogYm9vbGVhbiA9IHRydWU7XHJcbiAgICB0aW1lckV4dGVybjogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgIHN0ZXBzOiBudW1iZXIgPSAwO1xyXG4gICAgdGltZU5ldHRvOiBudW1iZXIgPSAwO1xyXG4gICAgdGltZVdoZW5Qcm9ncmFtU3RhcnRlZDogbnVtYmVyID0gMDtcclxuXHJcbiAgICBzdGVwT3Zlck5lc3RpbmdMZXZlbDogbnVtYmVyID0gMDtcclxuICAgIGxlYXZlTGluZTogbnVtYmVyID0gLTE7XHJcbiAgICBhZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZzogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgIGlzRmlyc3RTdGF0ZW1lbnQ6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgIHNob3dQcm9ncmFtcG9pbnRlclVwdG9TdGVwc1BlclNlY29uZCA9IDE1O1xyXG5cclxuICAgIHdvcmxkSGVscGVyOiBXb3JsZEhlbHBlcjtcclxuICAgIGduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlcjogR05HRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyO1xyXG4gICAgcHJvY2Vzc2luZ0hlbHBlcjogUHJvY2Vzc2luZ0hlbHBlcjtcclxuICAgIGRhdGFiYXNlQ29ubmVjdGlvbkhlbHBlcnM6IENvbm5lY3Rpb25IZWxwZXJbXSA9IFtdO1xyXG5cclxuICAgIGtleWJvYXJkVG9vbDogS2V5Ym9hcmRUb29sO1xyXG4gICAgZ2FtZXBhZFRvb2w6IEdhbWVwYWRUb29sO1xyXG5cclxuICAgIHdlYlNvY2tldHNUb0Nsb3NlQWZ0ZXJQcm9ncmFtSGFsdDogV2ViU29ja2V0W10gPSBbXTtcclxuXHJcbiAgICBwYXVzZVVudGlsPzogbnVtYmVyO1xyXG5cclxuICAgIGFjdGlvbnM6IHN0cmluZ1tdID0gW1wic3RhcnRcIiwgXCJwYXVzZVwiLCBcInN0b3BcIiwgXCJzdGVwT3ZlclwiLFxyXG4gICAgICAgIFwic3RlcEludG9cIiwgXCJzdGVwT3V0XCIsIFwicmVzdGFydFwiXTtcclxuXHJcbiAgICAvLyBidXR0b25BY3RpdmVNYXRyaXhbYnV0dG9uXVtpXSB0ZWxscyBpZiBidXR0b24gaXMgYWN0aXZlIGF0IFxyXG4gICAgLy8gSW50ZXJwcmV0ZXJTdGF0ZSBpXHJcbiAgICBidXR0b25BY3RpdmVNYXRyaXg6IHsgW2J1dHRvbk5hbWU6IHN0cmluZ106IGJvb2xlYW5bXSB9ID0ge1xyXG4gICAgICAgIFwic3RhcnRcIjogW2ZhbHNlLCBmYWxzZSwgdHJ1ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2VdLFxyXG4gICAgICAgIFwicGF1c2VcIjogW2ZhbHNlLCB0cnVlLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZV0sXHJcbiAgICAgICAgXCJzdG9wXCI6IFtmYWxzZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2UsIGZhbHNlLCB0cnVlXSxcclxuICAgICAgICBcInN0ZXBPdmVyXCI6IFtmYWxzZSwgZmFsc2UsIHRydWUsIHRydWUsIHRydWUsIGZhbHNlXSxcclxuICAgICAgICBcInN0ZXBJbnRvXCI6IFtmYWxzZSwgZmFsc2UsIHRydWUsIHRydWUsIHRydWUsIGZhbHNlXSxcclxuICAgICAgICBcInN0ZXBPdXRcIjogW2ZhbHNlLCBmYWxzZSwgdHJ1ZSwgZmFsc2UsIGZhbHNlLCBmYWxzZV0sXHJcbiAgICAgICAgXCJyZXN0YXJ0XCI6IFtmYWxzZSwgdHJ1ZSwgdHJ1ZSwgdHJ1ZSwgdHJ1ZSwgdHJ1ZV1cclxuICAgIH1cclxuXHJcbiAgICBjYWxsYmFja0FmdGVyRXhlY3V0aW9uOiAoKSA9PiB2b2lkO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBtYWluOiBNYWluQmFzZSwgcHVibGljIGRlYnVnZ2VyXzogRGVidWdnZXIsIHB1YmxpYyBjb250cm9sQnV0dG9uczogUHJvZ3JhbUNvbnRyb2xCdXR0b25zLFxyXG4gICAgICAgICRydW5EaXY6IEpRdWVyeTxIVE1MRWxlbWVudD4pIHtcclxuICAgICAgICB0aGlzLnByaW50TWFuYWdlciA9IG5ldyBQcmludE1hbmFnZXIoJHJ1bkRpdiwgdGhpcy5tYWluKTtcclxuICAgICAgICB0aGlzLmlucHV0TWFuYWdlciA9IG5ldyBJbnB1dE1hbmFnZXIoJHJ1bkRpdiwgdGhpcy5tYWluKTtcclxuICAgICAgICBpZiAobWFpbi5pc0VtYmVkZGVkKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5rZXlib2FyZFRvb2wgPSBuZXcgS2V5Ym9hcmRUb29sKGpRdWVyeSgnaHRtbCcpLCBtYWluKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmtleWJvYXJkVG9vbCA9IG5ldyBLZXlib2FyZFRvb2woalF1ZXJ5KHdpbmRvdyksIG1haW4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5nYW1lcGFkVG9vbCA9IG5ldyBHYW1lcGFkVG9vbCgpO1xyXG5cclxuICAgICAgICB0aGlzLmRlYnVnZ2VyID0gZGVidWdnZXJfO1xyXG5cclxuICAgICAgICBjb250cm9sQnV0dG9ucy5zZXRJbnRlcnByZXRlcih0aGlzKTtcclxuXHJcbiAgICAgICAgdGhpcy50aW1lV2hlblByb2dyYW1TdGFydGVkID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcbiAgICAgICAgdGhpcy5zdGVwcyA9IDA7XHJcbiAgICAgICAgdGhpcy50aW1lTmV0dG8gPSAwO1xyXG4gICAgICAgIHRoaXMudGltZXJFdmVudHMgPSAwO1xyXG5cclxuICAgICAgICB0aGlzLnRpbWVyRGVsYXlNcyA9IDc7XHJcblxyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgbGV0IHBlcmlvZGljRnVuY3Rpb24gPSAoKSA9PiB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoYXQudGltZXJFeHRlcm4pIHtcclxuICAgICAgICAgICAgICAgIHRoYXQudGltZXJGdW5jdGlvbih0aGF0LnRpbWVyRGVsYXlNcywgZmFsc2UsIDAuNyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRpbWVySWQgPSBzZXRJbnRlcnZhbChwZXJpb2RpY0Z1bmN0aW9uLCB0aGlzLnRpbWVyRGVsYXlNcyk7XHJcblxyXG4gICAgICAgIGxldCBrZWVwQWxpdmVSZXF1ZXN0OiBXZWJTb2NrZXRSZXF1ZXN0S2VlcEFsaXZlID0geyBjb21tYW5kOiA1IH07XHJcbiAgICAgICAgbGV0IHJlcSA9IEpTT04uc3RyaW5naWZ5KGtlZXBBbGl2ZVJlcXVlc3QpO1xyXG4gICAgICAgIHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgICAgICAgdGhhdC53ZWJTb2NrZXRzVG9DbG9zZUFmdGVyUHJvZ3JhbUhhbHQuZm9yRWFjaCh3cyA9PiB3cy5zZW5kKHJlcSkpO1xyXG4gICAgICAgIH0sIDMwMDAwKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaW5pdEdVSSgpIHtcclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICBsZXQgYW0gPSB0aGlzLm1haW4uZ2V0QWN0aW9uTWFuYWdlcigpO1xyXG5cclxuICAgICAgICBsZXQgc3RhcnRGdW5jdGlvbiA9ICgpID0+IHtcclxuICAgICAgICAgICAgdGhhdC5zdGVwT3Zlck5lc3RpbmdMZXZlbCA9IDEwMDAwMDA7XHJcbiAgICAgICAgICAgIHRoYXQuc3RhcnQoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsZXQgcGF1c2VGdW5jdGlvbiA9ICgpID0+IHtcclxuICAgICAgICAgICAgdGhhdC5wYXVzZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGFtLnJlZ2lzdGVyQWN0aW9uKFwiaW50ZXJwcmV0ZXIuc3RhcnRcIiwgWydGNCddLFxyXG4gICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYW0uaXNBY3RpdmUoXCJpbnRlcnByZXRlci5zdGFydFwiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0RnVuY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGF1c2VGdW5jdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSwgXCJQcm9ncmFtbSBzdGFydGVuXCIsIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblN0YXJ0KTtcclxuXHJcbiAgICAgICAgYW0ucmVnaXN0ZXJBY3Rpb24oXCJpbnRlcnByZXRlci5wYXVzZVwiLCBbJ0Y0J10sXHJcbiAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChhbS5pc0FjdGl2ZShcImludGVycHJldGVyLnN0YXJ0XCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRGdW5jdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBwYXVzZUZ1bmN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9LCBcIlBhdXNlXCIsIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblBhdXNlKTtcclxuXHJcbiAgICAgICAgYW0ucmVnaXN0ZXJBY3Rpb24oXCJpbnRlcnByZXRlci5zdG9wXCIsIFtdLFxyXG4gICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGF0LnN0b3AoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5zdGVwcyA9IDA7XHJcbiAgICAgICAgICAgIH0sIFwiUHJvZ3JhbW0gYW5oYWx0ZW5cIiwgdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uU3RvcCk7XHJcblxyXG4gICAgICAgIC8vIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvbkVkaXQub24oJ2NsaWNrJywgKGUpID0+IHtcclxuICAgICAgICAvLyAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAvLyAgICAgYW0udHJpZ2dlcignaW50ZXJwcmV0ZXIuc3RvcCcpO1xyXG4gICAgICAgIC8vIH0pO1xyXG5cclxuICAgICAgICBhbS5yZWdpc3RlckFjdGlvbihcImludGVycHJldGVyLnN0ZXBPdmVyXCIsIFsnRjYnXSxcclxuICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbmVTdGVwKGZhbHNlKTtcclxuICAgICAgICAgICAgfSwgXCJFaW56ZWxzY2hyaXR0IChTdGVwIG92ZXIpXCIsIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblN0ZXBPdmVyKTtcclxuXHJcbiAgICAgICAgYW0ucmVnaXN0ZXJBY3Rpb24oXCJpbnRlcnByZXRlci5zdGVwSW50b1wiLCBbJ0Y3J10sXHJcbiAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25lU3RlcCh0cnVlKTtcclxuICAgICAgICAgICAgfSwgXCJFaW56ZWxzY2hyaXR0IChTdGVwIGludG8pXCIsIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblN0ZXBJbnRvKTtcclxuXHJcbiAgICAgICAgYW0ucmVnaXN0ZXJBY3Rpb24oXCJpbnRlcnByZXRlci5zdGVwT3V0XCIsIFtdLFxyXG4gICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0ZXBPdXQoKTtcclxuICAgICAgICAgICAgfSwgXCJTdGVwIG91dFwiLCB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25TdGVwT3V0KTtcclxuXHJcbiAgICAgICAgYW0ucmVnaXN0ZXJBY3Rpb24oXCJpbnRlcnByZXRlci5yZXN0YXJ0XCIsIFtdLFxyXG4gICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGF0LnN0b3AodHJ1ZSk7XHJcbiAgICAgICAgICAgIH0sIFwiTmV1IHN0YXJ0ZW5cIiwgdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uUmVzdGFydCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5ub3RfaW5pdGlhbGl6ZWQpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRTdGFydGFibGVNb2R1bGUobW9kdWxlU3RvcmU6IE1vZHVsZVN0b3JlKTogTW9kdWxlIHtcclxuXHJcbiAgICAgICAgbGV0IGNlbTogTW9kdWxlO1xyXG4gICAgICAgIGNlbSA9IHRoaXMubWFpbi5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKTtcclxuXHJcbiAgICAgICAgbGV0IGN1cnJlbnRseUVkaXRlZE1vZHVsZUlzQ2xhc3NPbmx5ID0gZmFsc2U7XHJcblxyXG4gICAgICAgIC8vIGRlY2lkZSB3aGljaCBtb2R1bGUgdG8gc3RhcnRcclxuXHJcbiAgICAgICAgLy8gZmlyc3QgYXR0ZW1wdDogaXMgY3VycmVudGx5IGVkaXRlZCBNb2R1bGUgc3RhcnRhYmxlP1xyXG4gICAgICAgIGlmIChjZW0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgY3VycmVudGx5RWRpdGVkTW9kdWxlID0gbW9kdWxlU3RvcmUuZmluZE1vZHVsZUJ5RmlsZShjZW0uZmlsZSk7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50bHlFZGl0ZWRNb2R1bGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudGx5RWRpdGVkTW9kdWxlSXNDbGFzc09ubHkgPSAhY2VtLmhhc0Vycm9ycygpXHJcbiAgICAgICAgICAgICAgICAgICAgJiYgIWN1cnJlbnRseUVkaXRlZE1vZHVsZS5pc1N0YXJ0YWJsZTtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50bHlFZGl0ZWRNb2R1bGUuaXNTdGFydGFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudGx5RWRpdGVkTW9kdWxlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzZWNvbmQgYXR0ZW1wdDogd2hpY2ggbW9kdWxlIGhhcyBiZWVuIHN0YXJ0ZWQgbGFzdCB0aW1lP1xyXG4gICAgICAgIGlmICh0aGlzLm1haW5Nb2R1bGUgIT0gbnVsbCAmJiBjdXJyZW50bHlFZGl0ZWRNb2R1bGVJc0NsYXNzT25seSkge1xyXG4gICAgICAgICAgICBsZXQgbGFzdE1haW5Nb2R1bGUgPSBtb2R1bGVTdG9yZS5maW5kTW9kdWxlQnlGaWxlKHRoaXMubWFpbk1vZHVsZS5maWxlKTtcclxuICAgICAgICAgICAgaWYgKGxhc3RNYWluTW9kdWxlICE9IG51bGwgJiYgbGFzdE1haW5Nb2R1bGUuaXNTdGFydGFibGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsYXN0TWFpbk1vZHVsZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdGhpcmQgYXR0ZW1wdDogcGljayBmaXJzdCBzdGFydGFibGUgbW9kdWxlIG9mIGN1cnJlbnQgd29ya3NwYWNlXHJcbiAgICAgICAgaWYgKGN1cnJlbnRseUVkaXRlZE1vZHVsZUlzQ2xhc3NPbmx5KSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG0gb2YgbW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSkpIHtcclxuICAgICAgICAgICAgICAgIGlmIChtLmlzU3RhcnRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICAgICAgQWZ0ZXIgdXNlciBjbGlja3Mgc3RhcnQgYnV0dG9uIChvciBzdGVwb3Zlci9zdGVwSW50by1CdXR0b24gd2hlbiBubyBwcm9ncmFtIGlzIHJ1bm5pbmcpIHRoaXNcclxuICAgICAgICBtZXRob2QgaXN0IGNhbGxlZC5cclxuICAgICovXHJcbiAgICBpbml0KCkge1xyXG5cclxuICAgICAgICB0aGlzLnRpbWVyU3RvcHBlZCA9IHRydWU7XHJcblxyXG4gICAgICAgIGxldCBjZW0gPSB0aGlzLm1haW4uZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCk7XHJcblxyXG4gICAgICAgIGNlbS5nZXRCcmVha3BvaW50UG9zaXRpb25zRnJvbUVkaXRvcigpO1xyXG5cclxuICAgICAgICB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCk/LmNvbnNvbGU/LmNsZWFyRXhjZXB0aW9ucygpO1xyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgICAgICBBcyBsb25nIGFzIHRoZXJlIGlzIG5vIHN0YXJ0YWJsZSBuZXcgVmVyc2lvbiBvZiBjdXJyZW50IHdvcmtzcGFjZSB3ZSBrZWVwIGN1cnJlbnQgY29tcGlsZWQgbW9kdWxlcyBzb1xyXG4gICAgICAgICAgICB0aGF0IHZhcmlhYmxlcyBhbmQgb2JqZWN0cyBkZWZpbmVkL2luc3RhbnRpYXRlZCB2aWEgY29uc29sZSBjYW4gYmUga2VwdCwgdG9vLiBcclxuICAgICAgICAqL1xyXG4gICAgICAgIGlmICh0aGlzLm1vZHVsZVN0b3JlVmVyc2lvbiAhPSB0aGlzLm1haW4udmVyc2lvbiAmJiB0aGlzLm1haW4uZ2V0Q29tcGlsZXIoKS5hdExlYXN0T25lTW9kdWxlSXNTdGFydGFibGUpIHtcclxuICAgICAgICAgICAgdGhpcy5tYWluLmNvcHlFeGVjdXRhYmxlTW9kdWxlU3RvcmVUb0ludGVycHJldGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuaGVhcCA9IHt9OyAvLyBjbGVhciB2YXJpYWJsZXMvb2JqZWN0cyBkZWZpbmVkIHZpYSBjb25zb2xlXHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKT8uY29uc29sZT8uZGV0YWNoVmFsdWVzKCk7ICAvLyBkZXRhY2ggdmFsdWVzIGZyb20gY29uc29sZSBlbnRyaWVzXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbmV3TWFpbk1vZHVsZSA9IHRoaXMuZ2V0U3RhcnRhYmxlTW9kdWxlKHRoaXMubW9kdWxlU3RvcmUpO1xyXG5cclxuICAgICAgICBpZiAobmV3TWFpbk1vZHVsZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5ub3RfaW5pdGlhbGl6ZWQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1haW5Nb2R1bGUgPSBuZXdNYWluTW9kdWxlO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSAwO1xyXG5cclxuICAgICAgICB0aGlzLnByb2dyYW1TdGFjayA9IFtdO1xyXG4gICAgICAgIHRoaXMuc3RhY2sgPSBbXTtcclxuICAgICAgICB0aGlzLnN0YWNrZnJhbWVzID0gW107XHJcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9IDA7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5kb25lKTtcclxuXHJcbiAgICAgICAgdGhpcy5pc0ZpcnN0U3RhdGVtZW50ID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCA9IDEwMDAwMDA7XHJcblxyXG5cclxuICAgICAgICAvLyBJbnN0YW50aWF0ZSBlbnVtIHZhbHVlLW9iamVjdHM7IGluaXRpYWxpemUgc3RhdGljIGF0dHJpYnV0ZXM7IGNhbGwgc3RhdGljIGNvbnN0cnVjdG9yc1xyXG5cclxuICAgICAgICB0aGlzLnByb2dyYW1TdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgcHJvZ3JhbTogdGhpcy5tYWluTW9kdWxlLm1haW5Qcm9ncmFtLFxyXG4gICAgICAgICAgICBwcm9ncmFtUG9zaXRpb246IDAsXHJcbiAgICAgICAgICAgIHRleHRQb3NpdGlvbjogeyBsaW5lOiAxLCBjb2x1bW46IDEsIGxlbmd0aDogMCB9LFxyXG4gICAgICAgICAgICBtZXRob2Q6IFwiSGF1cHRwcm9ncmFtbVwiLFxyXG4gICAgICAgICAgICBjYWxsYmFja0FmdGVyUmV0dXJuOiBudWxsLFxyXG4gICAgICAgICAgICBpc0NhbGxlZEZyb21PdXRzaWRlOiBcIkhhdXB0cHJvZ3JhbW1cIlxyXG5cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBmb3IgKGxldCBtIG9mIHRoaXMubW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSkpIHtcclxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRW51bXMobSk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNsYXNzZXMobSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnBvcFByb2dyYW0oKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcG9wUHJvZ3JhbSgpIHtcclxuICAgICAgICBsZXQgcCA9IHRoaXMucHJvZ3JhbVN0YWNrLnBvcCgpO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwLnByb2dyYW07XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gcC5wcm9ncmFtUG9zaXRpb247XHJcbiAgICAgICAgdGhpcy5jdXJyZW50TWV0aG9kID0gcC5tZXRob2Q7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybiA9IHAuY2FsbGJhY2tBZnRlclJldHVybjtcclxuICAgICAgICB0aGlzLmN1cnJlbnRJc0NhbGxlZEZyb21PdXRzaWRlID0gcC5pc0NhbGxlZEZyb21PdXRzaWRlO1xyXG4gICAgICAgIGlmIChwLnN0YWNrRWxlbWVudHNUb1B1c2hCZWZvcmVGaXJzdEV4ZWN1dGluZyAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnN0YWNrZnJhbWVzLnB1c2godGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9PSBudWxsID8gMCA6IHRoaXMuY3VycmVudFN0YWNrZnJhbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lID0gdGhpcy5zdGFjay5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBzZSBvZiBwLnN0YWNrRWxlbWVudHNUb1B1c2hCZWZvcmVGaXJzdEV4ZWN1dGluZykgdGhpcy5zdGFjay5wdXNoKHNlKTtcclxuICAgICAgICAgICAgcC5zdGFja0VsZW1lbnRzVG9QdXNoQmVmb3JlRmlyc3RFeGVjdXRpbmcgPSBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpbml0aWFsaXplQ2xhc3NlcyhtOiBNb2R1bGUpIHtcclxuXHJcbiAgICAgICAgZm9yIChsZXQga2xhc3Mgb2YgbS50eXBlU3RvcmUudHlwZUxpc3QpIHtcclxuICAgICAgICAgICAgaWYgKGtsYXNzIGluc3RhbmNlb2YgS2xhc3MpIHtcclxuICAgICAgICAgICAgICAgIGtsYXNzLnN0YXRpY0NsYXNzLmNsYXNzT2JqZWN0ID0gbmV3IFJ1bnRpbWVPYmplY3Qoa2xhc3Muc3RhdGljQ2xhc3MpO1xyXG4gICAgICAgICAgICAgICAga2xhc3MucHVzaFN0YXRpY0luaXRpYWxpemF0aW9uUHJvZ3JhbXModGhpcy5wcm9ncmFtU3RhY2spO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoa2xhc3MgaW5zdGFuY2VvZiBFbnVtKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBsZXQgc3RhdGljVmFsdWVNYXAgPSBrbGFzcy5zdGF0aWNDbGFzcy5jbGFzc09iamVjdC5hdHRyaWJ1dGVWYWx1ZXMuZ2V0KGtsYXNzLmlkZW50aWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHN0YXRpY1ZhbHVlTGlzdCA9IGtsYXNzLnN0YXRpY0NsYXNzLmNsYXNzT2JqZWN0LmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBlbnVtSW5mbyBvZiBrbGFzcy5lbnVtSW5mb0xpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBzdGF0aWNWYWx1ZU1hcC5nZXQoZW51bUluZm8uaWRlbnRpZmllcikudmFsdWUgPSBlbnVtSW5mby5vYmplY3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGljVmFsdWVMaXN0W2VudW1JbmZvLm9yZGluYWxdLnZhbHVlID0gZW51bUluZm8ub2JqZWN0O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBpbml0aWFsaXplRW51bXMobTogTW9kdWxlKSB7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGVudW1DbGFzcyBvZiBtLnR5cGVTdG9yZS50eXBlTGlzdCkge1xyXG4gICAgICAgICAgICBpZiAoZW51bUNsYXNzIGluc3RhbmNlb2YgRW51bSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGVudW1DbGFzcy5wdXNoU3RhdGljSW5pdGlhbGl6YXRpb25Qcm9ncmFtcyh0aGlzLnByb2dyYW1TdGFjayk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlTGlzdDogVmFsdWVbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZUluaXRpYWxpemF0aW9uUHJvZ3JhbTogUHJvZ3JhbSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBtb2R1bGU6IGVudW1DbGFzcy5tb2R1bGUsXHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWxNYW5hZ2VyOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtdXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBoYXNBdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0gPSBlbnVtQ2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID4gMDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaGFzQXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW06IHZhbHVlSW5pdGlhbGl6YXRpb25Qcm9ncmFtLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtUG9zaXRpb246IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHRQb3NpdGlvbjogeyBsaW5lOiAxLCBjb2x1bW46IDEsIGxlbmd0aDogMCB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IFwiQXR0cmlidXQtSW5pdGlhbGlzaWVydW5nIGRlciBLbGFzc2UgXCIgKyBlbnVtQ2xhc3MuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tBZnRlclJldHVybjogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNDYWxsZWRGcm9tT3V0c2lkZTogXCJJbml0aWFsaXNpZXJ1bmcgZWluZXMgRW51bXNcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZW51bUluZm8gb2YgZW51bUNsYXNzLmVudW1JbmZvTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVudW1JbmZvLm9iamVjdCA9IG5ldyBFbnVtUnVudGltZU9iamVjdChlbnVtQ2xhc3MsIGVudW1JbmZvKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBlbnVtQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBlbnVtSW5mby5vYmplY3RcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVudW1JbmZvLmNvbnN0cnVjdG9yQ2FsbFByb2dyYW0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2dyYW1TdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW06IGVudW1JbmZvLmNvbnN0cnVjdG9yQ2FsbFByb2dyYW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtUG9zaXRpb246IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0UG9zaXRpb246IHsgbGluZTogMSwgY29sdW1uOiAxLCBsZW5ndGg6IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogXCJLb25zdHJ1a3RvciB2b24gXCIgKyBlbnVtQ2xhc3MuaWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NhbGxlZEZyb21PdXRzaWRlOiBcIkluaXRpYWxpc2llcnVuZyBlaW5lcyBFbnVtc1wiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNBdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVJbml0aWFsaXphdGlvblByb2dyYW0uc3RhdGVtZW50cy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5pbml0aWFsaXplRW51bVZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGVudW1JbmZvLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bUNsYXNzOiBlbnVtQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZUlkZW50aWZpZXI6IGVudW1JbmZvLmlkZW50aWZpZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChoYXNBdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0pIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZUluaXRpYWxpemF0aW9uUHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHJvZ3JhbUVuZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHsgbGluZTogMCwgY29sdW1uOiAwLCBsZW5ndGg6IDEgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZW51bUNsYXNzLnZhbHVlTGlzdCA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBuZXcgQXJyYXlUeXBlKGVudW1DbGFzcyksXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlTGlzdFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgdGltZXJFdmVudHM6IG51bWJlciA9IDA7XHJcbiAgICBzdGFydChjYWxsYmFjaz86ICgpID0+IHZvaWQpIHtcclxuXHJcbiAgICAgICAgdGhpcy5tYWluLmdldEJvdHRvbURpdigpPy5jb25zb2xlPy5jbGVhckVycm9ycygpO1xyXG5cclxuICAgICAgICB0aGlzLmNhbGxiYWNrQWZ0ZXJFeGVjdXRpb24gPSBjYWxsYmFjaztcclxuXHJcbiAgICAgICAgdGhpcy5pc0ZpcnN0U3RhdGVtZW50ID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgdGhpcy5wYXVzZVVudGlsID0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5lcnJvciB8fCB0aGlzLnN0YXRlID09IEludGVycHJldGVyU3RhdGUuZG9uZSkge1xyXG4gICAgICAgICAgICB0aGlzLmluaXQoKTtcclxuICAgICAgICAgICAgdGhpcy5yZXNldFJ1bnRpbWUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5ydW5uaW5nKTtcclxuXHJcbiAgICAgICAgdGhpcy5oaWRlUHJvZ3JhbXBvaW50ZXJQb3NpdGlvbigpO1xyXG5cclxuICAgICAgICB0aGlzLnRpbWVXaGVuUHJvZ3JhbVN0YXJ0ZWQgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuICAgICAgICB0aGlzLnRpbWVyU3RvcHBlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLmdldFRpbWVyQ2xhc3MoKS5zdGFydFRpbWVyKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldFRpbWVyQ2xhc3MoKTogVGltZXJDbGFzcyB7XHJcbiAgICAgICAgbGV0IGJhc2VNb2R1bGUgPSB0aGlzLm1haW4uZ2V0Q3VycmVudFdvcmtzcGFjZSgpLm1vZHVsZVN0b3JlLmdldE1vZHVsZShcIkJhc2UgTW9kdWxlXCIpO1xyXG4gICAgICAgIHJldHVybiA8VGltZXJDbGFzcz5iYXNlTW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiVGltZXJcIik7XHJcbiAgICB9XHJcblxyXG4gICAgbGFzdFN0ZXBUaW1lOiBudW1iZXIgPSAwO1xyXG4gICAgbGFzdFRpbWVCZXR3ZWVuRXZlbnRzOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIHRpbWVyRnVuY3Rpb24odGltZXJEZWxheU1zOiBudW1iZXIsIGZvcmNlUnVuOiBib29sZWFuLCBtYXhXb3JrbG9hZEZhY3RvcjogbnVtYmVyKSB7XHJcblxyXG4gICAgICAgIGxldCB0MCA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cclxuICAgICAgICBpZiAoIWZvcmNlUnVuKSB7XHJcbiAgICAgICAgICAgIGxldCB0aW1lQmV0d2VlblN0ZXBzID0gMTAwMCAvIHRoaXMuc3RlcHNQZXJTZWNvbmQ7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVyU3RvcHBlZCB8fCB0MCAtIHRoaXMubGFzdFN0ZXBUaW1lIDwgdGltZUJldHdlZW5TdGVwcykgcmV0dXJuO1xyXG4gICAgICAgICAgICB0aGlzLmxhc3RTdGVwVGltZSA9IHQwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5sYXN0VGltZUJldHdlZW5FdmVudHMgPSB0MCAtIHRoaXMubGFzdFN0ZXBUaW1lO1xyXG5cclxuICAgICAgICBsZXQgbl9zdGVwc1BlclRpbWVyR29hbCA9IGZvcmNlUnVuID8gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIgOiB0aGlzLnN0ZXBzUGVyU2Vjb25kICogdGhpcy50aW1lckRlbGF5TXMgLyAxMDAwO1xyXG5cclxuICAgICAgICB0aGlzLnRpbWVyRXZlbnRzKys7XHJcblxyXG4gICAgICAgIGxldCBleGNlcHRpb246IHN0cmluZztcclxuICAgICAgICBsZXQgaSA9IDA7XHJcblxyXG4gICAgICAgIHdoaWxlIChpIDwgbl9zdGVwc1BlclRpbWVyR29hbCAmJiAhdGhpcy50aW1lclN0b3BwZWQgJiYgZXhjZXB0aW9uID09IG51bGwgJiZcclxuICAgICAgICAgICAgKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApIC8gdGltZXJEZWxheU1zIDwgbWF4V29ya2xvYWRGYWN0b3JcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgZXhjZXB0aW9uID0gdGhpcy5uZXh0U3RlcCgpO1xyXG4gICAgICAgICAgICBpZiAoZXhjZXB0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5zdGVwc1BlclNlY29uZCA8PSB0aGlzLnNob3dQcm9ncmFtcG9pbnRlclVwdG9TdGVwc1BlclNlY29uZCAmJiAhZm9yY2VSdW4pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1Byb2dyYW1Qb2ludGVyQW5kVmFyaWFibGVzKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlID09IEludGVycHJldGVyU3RhdGUuZXJyb3IgfHxcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5kb25lKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyU3RvcHBlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCA8IDAgJiYgIXRoaXMudGltZXJTdG9wcGVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbm9kZSA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50c1t0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb25dO1xyXG4gICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gbm9kZS5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBudWxsIHx8IHBvc2l0aW9uLmxpbmUgIT0gdGhpcy5sZWF2ZUxpbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVyU3RvcHBlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLnBhdXNlZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbWVzU3RhdGVtZW50KFRva2VuVHlwZS5jbG9zZVN0YWNrZnJhbWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2VwdGlvbiA9IHRoaXMubmV4dFN0ZXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4Y2VwdGlvbiA9PSBudWxsICYmIHRoaXMuY29tZXNTdGF0ZW1lbnQoVG9rZW5UeXBlLnByb2dyYW1FbmQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGNlcHRpb24gPSB0aGlzLm5leHRTdGVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZXhjZXB0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy50aHJvd0V4Y2VwdGlvbihleGNlcHRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMudGltZXJTdG9wcGVkKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlID09IEludGVycHJldGVyU3RhdGUucGF1c2VkIHx8IHRoaXMuc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS53YWl0aW5nRm9ySW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1Byb2dyYW1Qb2ludGVyQW5kVmFyaWFibGVzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuY2FsbGJhY2tBZnRlckV4ZWN1dGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrQWZ0ZXJFeGVjdXRpb24oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBZnRlckV4ZWN1dGlvbiA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBkdCA9IHBlcmZvcm1hbmNlLm5vdygpIC0gdDA7XHJcbiAgICAgICAgdGhpcy50aW1lTmV0dG8gKz0gZHQ7XHJcblxyXG4gICAgICAgIC8vIGlmIChcclxuICAgICAgICAvLyAgICAgdGhpcy50aW1lckV2ZW50cyAlIDMwMCA9PSAwKSB7XHJcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiTGFzdCB0aW1lIGJldHdlZW4gRXZlbnRzOiBcIiArIHRoaXMubGFzdFRpbWVCZXR3ZWVuRXZlbnRzKTtcclxuICAgICAgICAvLyB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICB0aHJvd0V4Y2VwdGlvbihleGNlcHRpb246IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMudGltZXJTdG9wcGVkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUuZXJyb3IpO1xyXG5cclxuICAgICAgICBsZXQgJGVycm9yRGl2ID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fZXhjZXB0aW9uXCI+PC9kaXY+Jyk7XHJcblxyXG4gICAgICAgIGxldCBjb25zb2xlUHJlc2VudDogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgaWYgKHRoaXMubWFpbi5pc0VtYmVkZGVkKCkpIHtcclxuICAgICAgICAgICAgbGV0IG1haW5FbWJlZGRlZDogTWFpbkVtYmVkZGVkID0gPE1haW5FbWJlZGRlZD50aGlzLm1haW47XHJcbiAgICAgICAgICAgIGxldCBjb25maWcgPSBtYWluRW1iZWRkZWQuY29uZmlnO1xyXG4gICAgICAgICAgICBpZiAoY29uZmlnLndpdGhCb3R0b21QYW5lbCAhPSB0cnVlICYmIGNvbmZpZy53aXRoQ29uc29sZSAhPSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlUHJlc2VudCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uU3RyaW5nID0gXCJcIjtcclxuICAgICAgICAgICAgICAgIGxldCBjdXJyZW50U3RhdGVtZW50ID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbl07XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFN0YXRlbWVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRleHRQb3NpdGlvbiA9IGN1cnJlbnRTdGF0ZW1lbnQ/LnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uU3RyaW5nID0gXCIgaW4gWmVpbGUgXCIgKyB0ZXh0UG9zaXRpb24ubGluZSArIFwiLCBTcGFsdGUgXCIgKyB0ZXh0UG9zaXRpb24uY29sdW1uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCk/LmNvbnNvbGU/LnNob3dFcnJvcih0aGlzLmN1cnJlbnRQcm9ncmFtLm1vZHVsZSwgdGV4dFBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBhbGVydChcIkZlaGxlclwiICsgcG9zaXRpb25TdHJpbmcgKyBcIjogXCIgKyBleGNlcHRpb24pO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNvbnNvbGVQcmVzZW50KSB7XHJcbiAgICAgICAgICAgICRlcnJvckRpdi5hcHBlbmQoalF1ZXJ5KFwiPHNwYW4gY2xhc3M9J2pvX2Vycm9yLWNhcHRpb24nPkZlaGxlcjo8L3NwYW4+Jm5ic3A7XCIgKyBleGNlcHRpb24gKyBcIjxicj5cIikpO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hDdXJyZW50UHJvZ3JhbSgpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGZpcnN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMucHJvZ3JhbVN0YWNrLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHAgPSB0aGlzLnByb2dyYW1TdGFja1tpXTtcclxuICAgICAgICAgICAgICAgIGxldCBtID0gKHAubWV0aG9kIGluc3RhbmNlb2YgTWV0aG9kKSA/IHAubWV0aG9kLmlkZW50aWZpZXIgOiBwLm1ldGhvZDtcclxuICAgICAgICAgICAgICAgIGxldCBzOiBzdHJpbmcgPSBcIjxzcGFuIGNsYXNzPSdqb19lcnJvci1jYXB0aW9uJz5cIiArIChmaXJzdCA/IFwiT3J0XCIgOiBcImF1ZmdlcnVmZW4gdm9uXCIpICsgXCI6IDwvc3Bhbj5cIiArIG07XHJcbiAgICAgICAgICAgICAgICBpZiAocC50ZXh0UG9zaXRpb24gIT0gbnVsbCkgcyArPSBcIiA8c3BhbiBjbGFzcz0nam9fcnVudGltZUVycm9yUG9zaXRpb24nPihaIFwiICsgcC50ZXh0UG9zaXRpb24ubGluZSArIFwiLCBTIFwiICsgcC50ZXh0UG9zaXRpb24uY29sdW1uICsgXCIpPC9zcGFuPlwiO1xyXG4gICAgICAgICAgICAgICAgcyArPSBcIjxicj5cIjtcclxuICAgICAgICAgICAgICAgIGxldCBlcnJvckxpbmUgPSBqUXVlcnkocyk7XHJcbiAgICAgICAgICAgICAgICBpZiAocC50ZXh0UG9zaXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuICAgICAgICAgICAgICAgICAgICBqUXVlcnkoZXJyb3JMaW5lWzJdKS5vbignbW91c2Vkb3duJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1haW4uZ2V0Qm90dG9tRGl2KCk/LmNvbnNvbGU/LnNob3dFcnJvcihwLnByb2dyYW0ubW9kdWxlLCBwLnRleHRQb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAkZXJyb3JEaXYuYXBwZW5kKGVycm9yTGluZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZmlyc3QgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGlmIChwLmlzQ2FsbGVkRnJvbU91dHNpZGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgY29uc29sZSA9IHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKT8uY29uc29sZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb25zb2xlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud3JpdGVDb25zb2xlRW50cnkoJGVycm9yRGl2LCBudWxsLCAncmdiYSgyNTUsIDAsIDAsIDAuNCcpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5zaG93VGFiKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBoaWRlUHJvZ3JhbXBvaW50ZXJQb3NpdGlvbigpIHtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5ydW5uaW5nKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5zdGVwc1BlclNlY29uZCA+IHRoaXMuc2hvd1Byb2dyYW1wb2ludGVyVXB0b1N0ZXBzUGVyU2Vjb25kKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW4uaGlkZVByb2dyYW1Qb2ludGVyUG9zaXRpb24oKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbWVzU3RhdGVtZW50KHN0YXRlbWVudDogVG9rZW5UeXBlKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2dyYW0gPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPiB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoIC0gMSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHNbdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uXS50eXBlID09IHN0YXRlbWVudDtcclxuICAgIH1cclxuXHJcbiAgICByZXNldFJ1bnRpbWUoKSB7XHJcbiAgICAgICAgdGhpcy5wcmludE1hbmFnZXIuY2xlYXIoKTtcclxuICAgICAgICB0aGlzLndvcmxkSGVscGVyPy5kZXN0cm95V29ybGQoKTtcclxuICAgICAgICB0aGlzLnByb2Nlc3NpbmdIZWxwZXI/LmRlc3Ryb3lXb3JsZCgpO1xyXG4gICAgICAgIHRoaXMuZ25nRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyPy5kZXRhY2hFdmVudHMoKTtcclxuICAgICAgICB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlciA9IG51bGw7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHN0b3AocmVzdGFydDogYm9vbGVhbiA9IGZhbHNlKSB7XHJcbiAgICAgICAgdGhpcy5pbnB1dE1hbmFnZXIuaGlkZSgpO1xyXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5wYXVzZWQpO1xyXG4gICAgICAgIHRoaXMudGltZXJTdG9wcGVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMud29ybGRIZWxwZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLndvcmxkSGVscGVyLnNwcml0ZUFuaW1hdGlvbnMgPSBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5nbmdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXI/LmRldGFjaEV2ZW50cygpO1xyXG4gICAgICAgIHRoaXMuZ25nRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5tYWluLmhpZGVQcm9ncmFtUG9pbnRlclBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0VGltZXJDbGFzcygpLnN0b3BUaW1lcigpO1xyXG4gICAgICAgIGlmICh0aGlzLndvcmxkSGVscGVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy53b3JsZEhlbHBlci5jYWNoZUFzQml0bWFwKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRhdGFiYXNlQ29ubmVjdGlvbkhlbHBlcnMuZm9yRWFjaCgoY2gpID0+IGNoLmNsb3NlKCkpO1xyXG4gICAgICAgIHRoaXMuZGF0YWJhc2VDb25uZWN0aW9uSGVscGVycyA9IFtdO1xyXG5cclxuICAgICAgICB0aGlzLmhlYXAgPSB7fTtcclxuICAgICAgICB0aGlzLnByb2dyYW1TdGFjayA9IFtdO1xyXG4gICAgICAgIHRoaXMuc3RhY2sgPSBbXTtcclxuICAgICAgICB0aGlzLnN0YWNrZnJhbWVzID0gW107XHJcblxyXG5cclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLmRvbmUpO1xyXG4gICAgICAgICAgICB0aGlzLm1haW4uaGlkZVByb2dyYW1Qb2ludGVyUG9zaXRpb24oKTtcclxuICAgICAgICAgICAgaWYgKHJlc3RhcnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDUwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgcGF1c2UoKSB7XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLnBhdXNlZCk7XHJcbiAgICAgICAgdGhpcy5zaG93UHJvZ3JhbVBvaW50ZXJBbmRWYXJpYWJsZXMoKTtcclxuICAgICAgICB0aGlzLnRpbWVyU3RvcHBlZCA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgbGFzdFByaW50ZWRNb2R1bGU6IE1vZHVsZSA9IG51bGw7XHJcbiAgICBzaG93UHJvZ3JhbVBvaW50ZXJBbmRWYXJpYWJsZXMoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2dyYW0gPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgIGxldCBub2RlID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbl07XHJcbiAgICAgICAgaWYgKG5vZGUgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgIGxldCBwb3NpdGlvbiA9IG5vZGUucG9zaXRpb247XHJcbiAgICAgICAgaWYgKHBvc2l0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5tYWluLnNob3dQcm9ncmFtUG9pbnRlclBvc2l0aW9uKHRoaXMuY3VycmVudFByb2dyYW0ubW9kdWxlLmZpbGUsIHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5kZWJ1Z2dlci5zaG93RGF0YSh0aGlzLmN1cnJlbnRQcm9ncmFtLCBwb3NpdGlvbiwgdGhpcy5zdGFjaywgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSwgdGhpcy5oZWFwKTtcclxuICAgICAgICAgICAgbGV0IGJvdHRvbURpdiA9IHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKTtcclxuICAgICAgICAgICAgaWYgKGJvdHRvbURpdi5wcm9ncmFtUHJpbnRlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50UHJvZ3JhbS5tb2R1bGUgIT0gdGhpcy5sYXN0UHJpbnRlZE1vZHVsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKS5wcmludE1vZHVsZVRvQm90dG9tRGl2KG51bGwsIHRoaXMuY3VycmVudFByb2dyYW0ubW9kdWxlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RQcmludGVkTW9kdWxlID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5tb2R1bGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCkucHJvZ3JhbVByaW50ZXIuc2hvd05vZGUobm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc3RlcE91dCgpIHtcclxuICAgICAgICB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsID0gMDtcclxuICAgICAgICB0aGlzLnN0YXJ0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgb25lU3RlcChzdGVwSW50bzogYm9vbGVhbikge1xyXG4gICAgICAgIHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKT8uY29uc29sZT8uY2xlYXJFcnJvcnMoKTtcclxuICAgICAgICB0aGlzLmlzRmlyc3RTdGF0ZW1lbnQgPSB0cnVlO1xyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlICE9IEludGVycHJldGVyU3RhdGUucGF1c2VkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLm5vdF9pbml0aWFsaXplZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMucmVzZXRSdW50aW1lKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvd1Byb2dyYW1Qb2ludGVyQW5kVmFyaWFibGVzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5wYXVzZWQpO1xyXG4gICAgICAgICAgICAvLyBBcmUgdGhlcmUgc3RhdGljIFZhcmlhYmxlcyB0byBpbml0aWFsaXplP1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50TWV0aG9kID09IFwiSGF1cHRwcm9ncmFtbVwiKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBObyBzdGF0aWMgdmFyaWFibGUgaW5pdGlhbGl6ZXJzXHJcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsID0gMTAwMDA7XHJcbiAgICAgICAgbGV0IG9sZFN0ZXBPdmVyTmVzdGluZ0xldmVsID0gdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbDtcclxuICAgICAgICBsZXQgbm9kZSA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50c1t0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb25dO1xyXG4gICAgICAgIGxldCBwb3NpdGlvbiA9IG5vZGUucG9zaXRpb247XHJcbiAgICAgICAgbGV0IGV4Y2VwdGlvbiA9IHRoaXMubmV4dFN0ZXAoKTtcclxuICAgICAgICBpZiAoZXhjZXB0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy50aHJvd0V4Y2VwdGlvbihleGNlcHRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXN0ZXBJbnRvICYmIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPiBvbGRTdGVwT3Zlck5lc3RpbmdMZXZlbCkge1xyXG4gICAgICAgICAgICB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsID0gMDtcclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGVhdmVMaW5lID0gcG9zaXRpb24ubGluZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGVhdmVMaW5lID0gLTE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zdGFydCgpO1xyXG4gICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5kb25lKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW4uaGlkZVByb2dyYW1Qb2ludGVyUG9zaXRpb24oKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1Byb2dyYW1Qb2ludGVyQW5kVmFyaWFibGVzKCk7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlICE9IEludGVycHJldGVyU3RhdGUud2FpdGluZ0ZvcklucHV0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLnBhdXNlZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc3RlcEZpbmlzaGVkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgbmV4dFN0ZXAoKTogc3RyaW5nIHtcclxuXHJcbiAgICAgICAgdGhpcy5zdGVwRmluaXNoZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgbGV0IG5vZGU6IFN0YXRlbWVudDtcclxuXHJcbiAgICAgICAgbGV0IGV4Y2VwdGlvbjogc3RyaW5nO1xyXG5cclxuICAgICAgICB3aGlsZSAoIXRoaXMuc3RlcEZpbmlzaGVkICYmICF0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnICYmIGV4Y2VwdGlvbiA9PSBudWxsKSB7XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmN1cnJlbnRQcm9ncmFtID09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID4gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5kb25lKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBub2RlID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbl07XHJcblxyXG4gICAgICAgICAgICBpZiAobm9kZS5zdGVwRmluaXNoZWQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGVwRmluaXNoZWQgPSBub2RlLnN0ZXBGaW5pc2hlZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZXhjZXB0aW9uID0gdGhpcy5leGVjdXRlTm9kZShub2RlKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHRoaXMuc3RlcHMrKztcclxuXHJcbiAgICAgICAgcmV0dXJuIGV4Y2VwdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlTm9kZShub2RlOiBTdGF0ZW1lbnQpOiBzdHJpbmcge1xyXG5cclxuICAgICAgICBpZiAobm9kZS5icmVha3BvaW50ICE9IG51bGwgJiYgIXRoaXMuaXNGaXJzdFN0YXRlbWVudCkge1xyXG4gICAgICAgICAgICB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5wYXVzZSgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmlzRmlyc3RTdGF0ZW1lbnQgPSBmYWxzZTtcclxuICAgICAgICBsZXQgc3RhY2tUb3AgPSB0aGlzLnN0YWNrLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgbGV0IHN0YWNrZnJhbWVCZWdpbiA9IHRoaXMuY3VycmVudFN0YWNrZnJhbWU7XHJcbiAgICAgICAgbGV0IHN0YWNrID0gdGhpcy5zdGFjaztcclxuICAgICAgICBsZXQgdmFsdWU6IFZhbHVlO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jYXN0VmFsdWU6XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVsUG9zID0gbm9kZS5zdGFja1Bvc1JlbGF0aXZlID09IG51bGwgPyAwIDogbm9kZS5zdGFja1Bvc1JlbGF0aXZlO1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFja1tzdGFja1RvcCArIHJlbFBvc107XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBjYXN0ZWQgPSB2YWx1ZS50eXBlLmNhc3RUbyh2YWx1ZSwgbm9kZS5uZXdUeXBlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2FzdGVkID09IHVuZGVmaW5lZCkgY2FzdGVkID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUudmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vZGUubmV3VHlwZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCArIHJlbFBvc10gPSBjYXN0ZWQ7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyLm1lc3NhZ2UpIHJldHVybiBlcnIubWVzc2FnZTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHJldHVybiBcIkJlaSBkZW0gQ2FzdGVuIHZvbiBcIiArIHZhbHVlLnR5cGUuaWRlbnRpZmllciArIFwiIHp1IFwiICsgbm9kZS5uZXdUeXBlLmlkZW50aWZpZXIgKyBcIiB0cmF0IGVpbiBGZWhsZXIgYXVmOiBcIiArIGVyci5uYW1lICsgXCIuXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuY2hlY2tDYXN0OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFja1tzdGFja1RvcF07XHJcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUudmFsdWUgPT0gbnVsbCkgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBsZXQgcnRvID0gPFJ1bnRpbWVPYmplY3Q+dmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5uZXdUeXBlIGluc3RhbmNlb2YgS2xhc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJ0byA9PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcnRvLmNsYXNzLmhhc0FuY2VzdG9yT3JJcyhub2RlLm5ld1R5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFwiRGFzIE9iamVrdCBkZXIgS2xhc3NlIFwiICsgcnRvLmNsYXNzLmlkZW50aWZpZXIgKyBcIiBrYW5uIG5pY2h0IG5hY2ggXCIgKyBub2RlLm5ld1R5cGUuaWRlbnRpZmllciArIFwiIGdlY2FzdGV0IHdlcmRlbi5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJ0byA9PSBcIm51bWJlclwiICYmIFtcIkludGVnZXJcIiwgXCJEb3VibGVcIiwgXCJGbG9hdFwiXS5pbmRleE9mKG5vZGUubmV3VHlwZS5pZGVudGlmaWVyKSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXCJFaW5lIFphaGwga2FubiBuaWNodCBuYWNoIFwiICsgbm9kZS5uZXdUeXBlLmlkZW50aWZpZXIgKyBcIiBnZWNhc3RldCB3ZXJkZW4uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBydG8gPT0gXCJzdHJpbmdcIiAmJiBbXCJTdHJpbmdcIiwgXCJDaGFyYWN0ZXJcIl0uaW5kZXhPZihub2RlLm5ld1R5cGUuaWRlbnRpZmllcikgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFwiRWluZSBaZWljaGVua2V0dGUga2FubiBuaWNodCBuYWNoIFwiICsgbm9kZS5uZXdUeXBlLmlkZW50aWZpZXIgKyBcIiBnZWNhc3RldCB3ZXJkZW4uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBydG8gPT0gXCJib29sZWFuXCIgJiYgbm9kZS5uZXdUeXBlLmlkZW50aWZpZXIgIT0gXCJCb29sZWFuXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXCJFaW4gYm9vbGVzY2hlciBXZXJ0IGthbm4gbmljaHQgbmFjaCBcIiArIG5vZGUubmV3VHlwZS5pZGVudGlmaWVyICsgXCIgZ2VjYXN0ZXQgd2VyZGVuLlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZS5uZXdUeXBlIGluc3RhbmNlb2YgSW50ZXJmYWNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEoPEtsYXNzPnJ0by5jbGFzcykuaW1wbGVtZW50c0ludGVyZmFjZShub2RlLm5ld1R5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXCJEYXMgT2JqZWt0IGRlciBLbGFzc2UgXCIgKyBydG8uY2xhc3MuaWRlbnRpZmllciArIFwiIGltcGxlbWVudGllcnQgbmljaHQgZGFzIEludGVyZmFjZSBcIiArIG5vZGUubmV3VHlwZS5pZGVudGlmaWVyICsgXCIuXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5sb2NhbFZhcmlhYmxlRGVjbGFyYXRpb246XHJcbiAgICAgICAgICAgICAgICBsZXQgdmFyaWFibGUgPSBub2RlLnZhcmlhYmxlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHR5cGUgPSB2YXJpYWJsZS50eXBlO1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbnVsbFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlIGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdHlwZS5pbml0aWFsVmFsdWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzdGFja1t2YXJpYWJsZS5zdGFja1BvcyArIHN0YWNrZnJhbWVCZWdpbl0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLnB1c2hPblRvcE9mU3RhY2tGb3JJbml0aWFsaXphdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2godmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hMb2NhbFZhcmlhYmxlVG9TdGFjazpcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goc3RhY2tbbm9kZS5zdGFja3Bvc09mVmFyaWFibGUgKyBzdGFja2ZyYW1lQmVnaW5dKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wb3BBbmRTdG9yZUludG9WYXJpYWJsZTpcclxuICAgICAgICAgICAgICAgIHN0YWNrW25vZGUuc3RhY2twb3NPZlZhcmlhYmxlICsgc3RhY2tmcmFtZUJlZ2luXSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hBdHRyaWJ1dGU6XHJcbiAgICAgICAgICAgICAgICBsZXQgb2JqZWN0MSA9IG5vZGUudXNlVGhpc09iamVjdCA/IHN0YWNrW3N0YWNrZnJhbWVCZWdpbl0udmFsdWUgOiBzdGFjay5wb3AoKS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGlmIChvYmplY3QxID09IG51bGwpIHJldHVybiBcIlp1Z3JpZmYgYXVmIGVpbiBBdHRyaWJ1dCAoXCIgKyBub2RlLmF0dHJpYnV0ZUlkZW50aWZpZXIgKyBcIikgZGVzIG51bGwtT2JqZWt0c1wiO1xyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlMSA9ICg8UnVudGltZU9iamVjdD5vYmplY3QxKS5nZXRWYWx1ZShub2RlLmF0dHJpYnV0ZUluZGV4KTtcclxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZTE/LnVwZGF0ZVZhbHVlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTEudXBkYXRlVmFsdWUodmFsdWUxKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2godmFsdWUxKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wdXNoQXJyYXlMZW5ndGg6XHJcbiAgICAgICAgICAgICAgICBsZXQgYSA9IHN0YWNrLnBvcCgpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGEgPT0gbnVsbCkgcmV0dXJuIFwiWnVncmlmZiBhdWYgZGFzIGxlbmd0aC1BdHRyaWJ1dCBkZXMgbnVsbC1PYmpla3RzXCI7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHsgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgdmFsdWU6ICg8YW55W10+YSkubGVuZ3RoIH0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmFzc2lnbm1lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSA9IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKCEoc3RhY2tbc3RhY2tUb3AgLSAxXS50eXBlIGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnR5cGUgPSB2YWx1ZS50eXBlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCFub2RlLmxlYXZlVmFsdWVPblN0YWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucGx1c0Fzc2lnbm1lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSArPSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5taW51c0Fzc2lnbm1lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSAtPSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5tdWx0aXBsaWNhdGlvbkFzc2lnbm1lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSAqPSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5kaXZpc2lvbkFzc2lnbm1lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSAvPSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5tb2R1bG9Bc3NpZ25tZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgJT0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuQU5EQXNzaWdtZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgJj0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuT1JBc3NpZ21lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSB8PSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5YT1JBc3NpZ21lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSBePSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zaGlmdExlZnRBc3NpZ21lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSA8PD0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2hpZnRSaWdodEFzc2lnbWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlID4+PSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zaGlmdFJpZ2h0VW5zaWduZWRBc3NpZ21lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSA+Pj49IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmJpbmFyeU9wOlxyXG4gICAgICAgICAgICAgICAgbGV0IHNlY29uZE9wZXJhbmQgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIGxldCByZXN1bHRWYWx1ZSA9XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5sZWZ0VHlwZS5jb21wdXRlKG5vZGUub3BlcmF0b3IsIHN0YWNrW3N0YWNrVG9wIC0gMV0sIHNlY29uZE9wZXJhbmQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdFZhbHVlIGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0VmFsdWUubWVzc2FnZSkgcmV0dXJuIHJlc3VsdFZhbHVlLm1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBcIkJlaSBkZXIgQmVyZWNobnVuZyB2b24gXCIgKyBzdGFja1tzdGFja1RvcCAtIDFdLnR5cGUuaWRlbnRpZmllciArIFwiIFwiICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVG9rZW5UeXBlUmVhZGFibGVbbm9kZS5vcGVyYXRvcl0gKyBcIiBcIiArIHNlY29uZE9wZXJhbmQudHlwZS5pZGVudGlmaWVyICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCIgdHJhdCBlaW4gRmVobGVyIChcIiArIHJlc3VsdFZhbHVlLm5hbWUgKyBcIikgYXVmLlwiXHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdFR5cGUgPSBub2RlLmxlZnRUeXBlLmdldFJlc3VsdFR5cGUobm9kZS5vcGVyYXRvciwgc2Vjb25kT3BlcmFuZC50eXBlKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogcmVzdWx0VHlwZSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcmVzdWx0VmFsdWVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUudW5hcnlPcDpcclxuICAgICAgICAgICAgICAgIGxldCBvbGRWYWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUub3BlcmF0b3IgPT0gVG9rZW5UeXBlLm1pbnVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IG9sZFZhbHVlLnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAtb2xkVmFsdWUudmFsdWVcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogb2xkVmFsdWUudHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICFvbGRWYWx1ZS52YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaENvbnN0YW50OlxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG5vZGUudmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogbm9kZS5kYXRhVHlwZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaFN0YXRpY0NsYXNzT2JqZWN0OlxyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUua2xhc3MgaW5zdGFuY2VvZiBLbGFzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBub2RlLmtsYXNzLnN0YXRpY0NsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbm9kZS5rbGFzcy5zdGF0aWNDbGFzcy5jbGFzc09iamVjdFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIHRvIGVuYWJsZSBpbnN0YW5jZW9mIG9wZXJhdG9yIHdpdGggaW50ZXJmYWNlc1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBub2RlLmtsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbm9kZS5rbGFzc1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hTdGF0aWNBdHRyaWJ1dGU6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IG5vZGUua2xhc3MuY2xhc3NPYmplY3QuZ2V0VmFsdWUobm9kZS5hdHRyaWJ1dGVJbmRleCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUudXBkYXRlVmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLnVwZGF0ZVZhbHVlKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2godmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIC8vIGNhc2UgVG9rZW5UeXBlLnB1c2hTdGF0aWNBdHRyaWJ1dGVJbnRyaW5zaWM6XHJcbiAgICAgICAgICAgIC8vICAgICB2YWx1ZSA9IG5vZGUuXHJcbiAgICAgICAgICAgIC8vICAgICBzdGFjay5wdXNoKHsgdHlwZTogbm9kZS5hdHRyaWJ1dGUudHlwZSwgdmFsdWU6IG5vZGUuYXR0cmlidXRlLnVwZGF0ZVZhbHVlKG51bGwpIH0pO1xyXG4gICAgICAgICAgICAvLyAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnNlbGVjdEFycmF5RWxlbWVudDpcclxuICAgICAgICAgICAgICAgIGxldCBpbmRleCA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFycmF5ID0gc3RhY2sucG9wKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFycmF5LnZhbHVlID09IG51bGwpIHJldHVybiBcIlp1Z3JpZmYgYXVmIGVpbiBFbGVtZW50IGVpbmVzIG51bGwtRmVsZGVzXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4LnZhbHVlID49IGFycmF5LnZhbHVlLmxlbmd0aCB8fCBpbmRleC52YWx1ZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJadWdyaWZmIGF1ZiBkYXMgRWxlbWVudCBtaXQgSW5kZXggXCIgKyBpbmRleC52YWx1ZSArIFwiIGVpbmVzIEZlbGRlcyBkZXIgTMOkbmdlIFwiICsgYXJyYXkudmFsdWUubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaChhcnJheS52YWx1ZVtpbmRleC52YWx1ZV0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jYWxsTWFpbk1ldGhvZDpcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhY2sucHVzaCh7IHZhbHVlOiBub2RlLnN0YXRpY0NsYXNzLmNsYXNzT2JqZWN0LCB0eXBlOiBub2RlLnN0YXRpY0NsYXNzIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwYXJhbWV0ZXI6IFZhbHVlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBbeyB2YWx1ZTogXCJUZXN0XCIsIHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUgfV0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogbmV3IEFycmF5VHlwZShzdHJpbmdQcmltaXRpdmVUeXBlKVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJCZWdpbjIgPSBzdGFja1RvcCArIDI7IC8vIDEgcGFyYW1ldGVyXHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGFjay5wdXNoKHBhcmFtZXRlcik7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGFja2ZyYW1lcy5wdXNoKHRoaXMuY3VycmVudFN0YWNrZnJhbWUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbTogdGhpcy5jdXJyZW50UHJvZ3JhbSxcclxuICAgICAgICAgICAgICAgICAgICBwcm9ncmFtUG9zaXRpb246IHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiArIDEsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dFBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogdGhpcy5jdXJyZW50TWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4sXHJcbiAgICAgICAgICAgICAgICAgICAgaXNDYWxsZWRGcm9tT3V0c2lkZTogbnVsbFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybiA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lID0gcGFyYW1ldGVyQmVnaW4yO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBub2RlLm1ldGhvZC5wcm9ncmFtO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TWV0aG9kID0gbm9kZS5tZXRob2Q7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSAtMTsgLy8gZ2V0cyBpbmNyZWFzZWQgYWZ0ZXIgc3dpdGNoIHN0YXRlbWVudC4uLlxyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5tZXRob2QucmVzZXJ2ZVN0YWNrRm9yTG9jYWxWYXJpYWJsZXM7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2gobnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCsrO1xyXG5cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5tYWtlRWxsaXBzaXNBcnJheTpcclxuICAgICAgICAgICAgICAgIGxldCBlbGxpcHNpc0FycmF5OiBWYWx1ZVtdID0gc3RhY2suc3BsaWNlKHN0YWNrLmxlbmd0aCAtIG5vZGUucGFyYW1ldGVyQ291bnQsIG5vZGUucGFyYW1ldGVyQ291bnQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBlbGxpcHNpc0FycmF5LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vZGUuYXJyYXlUeXBlXHJcbiAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jYWxsTWV0aG9kOlxyXG5cclxuICAgICAgICAgICAgICAgIC8vIG5vZGUuc3RhY2tmcmFtZWJlZ2luID0gLShwYXJhbWV0ZXJzLnBhcmFtZXRlclR5cGVzLmxlbmd0aCArIDEpXHJcbiAgICAgICAgICAgICAgICBsZXQgbWV0aG9kID0gbm9kZS5tZXRob2Q7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHBhcmFtZXRlckJlZ2luID0gc3RhY2tUb3AgKyAxICsgbm9kZS5zdGFja2ZyYW1lQmVnaW47XHJcbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVyczEgPSBtZXRob2QucGFyYW1ldGVybGlzdC5wYXJhbWV0ZXJzO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHBhcmFtZXRlckJlZ2luICsgMTsgaSA8PSBzdGFja1RvcDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhY2tbaV0gIT0gbnVsbCAmJiB0aGlzLnN0YWNrW2ldLnR5cGUgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrW2ldID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogcGFyYW1ldGVyczFbaSAtIHBhcmFtZXRlckJlZ2luIC0gMV0udHlwZSwgIC8vIGNhc3QgdG8gcGFyYW1ldGVyIHR5cGUuLi5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBzdGFja1tpXS52YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdGFja1twYXJhbWV0ZXJCZWdpbl0udmFsdWUgPT0gbnVsbCAmJiAhbWV0aG9kLmlzU3RhdGljKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiQXVmcnVmIGRlciBNZXRob2RlIFwiICsgbWV0aG9kLmlkZW50aWZpZXIgKyBcIiBkZXMgbnVsbC1PYmpla3RzXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG1ldGhvZC5pc0Fic3RyYWN0IHx8IG1ldGhvZC5pc1ZpcnR1YWwgJiYgIW5vZGUuaXNTdXBlckNhbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgb2JqZWN0ID0gc3RhY2tbcGFyYW1ldGVyQmVnaW5dO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvYmplY3QudmFsdWUgaW5zdGFuY2VvZiBSdW50aW1lT2JqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZCA9ICg8S2xhc3M+KDxSdW50aW1lT2JqZWN0Pm9iamVjdC52YWx1ZSkuY2xhc3MpLmdldE1ldGhvZEJ5U2lnbmF0dXJlKG1ldGhvZC5zaWduYXR1cmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZCA9ICg8S2xhc3M+b2JqZWN0LnR5cGUpLmdldE1ldGhvZEJ5U2lnbmF0dXJlKG1ldGhvZC5zaWduYXR1cmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWV0aG9kID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiByYWlzZSBydW50aW1lIGVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG1ldGhvZC5pbnZva2UgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBydCA9IG1ldGhvZC5nZXRSZXR1cm5UeXBlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSBzdGFjay5zcGxpY2UocGFyYW1ldGVyQmVnaW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCByZXR1cm5WYWx1ZSA9IG1ldGhvZC5pbnZva2UocGFyYW1ldGVycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJpbnZva2luZyBtZXRob2RcIiwgbWV0aG9kLCBydCwgcmV0dXJuVmFsdWUsIChydCAhPSBudWxsICYmIHJ0LmlkZW50aWZpZXIgIT0gJ3ZvaWQnICYmICghKHJ0IGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSkpICYmIHJldHVyblZhbHVlID09IG51bGwpKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiAocnQgIT0gbnVsbCAmJiBydC5pZGVudGlmaWVyICE9ICd2b2lkJyAmJiAoISAocnQgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSkgJiYgcmV0dXJuVmFsdWUgPT0gbnVsbCkgcnQgPSBudWxsVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocnQgIT0gbnVsbCAmJiBydC5pZGVudGlmaWVyICE9ICd2b2lkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiByZXR1cm5WYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHJ0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFja2ZyYW1lcy5wdXNoKHRoaXMuY3VycmVudFN0YWNrZnJhbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvZ3JhbVN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtOiB0aGlzLmN1cnJlbnRQcm9ncmFtLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtUG9zaXRpb246IHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiArIDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHRQb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiB0aGlzLmN1cnJlbnRNZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IG51bGxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybiA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9IHBhcmFtZXRlckJlZ2luO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gbWV0aG9kLnByb2dyYW07XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TWV0aG9kID0gbWV0aG9kO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IC0xOyAvLyBnZXRzIGluY3JlYXNlZCBhZnRlciBzd2l0Y2ggc3RhdGVtZW50Li4uXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWV0aG9kLnJlc2VydmVTdGFja0ZvckxvY2FsVmFyaWFibGVzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaChudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwrKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jYWxsSW5wdXRNZXRob2Q6XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gbm9kZS5zdGFja2ZyYW1lYmVnaW4gPSAtKHBhcmFtZXRlcnMucGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSlcclxuICAgICAgICAgICAgICAgIGxldCBtZXRob2QxID0gbm9kZS5tZXRob2Q7XHJcbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVyQmVnaW4xID0gc3RhY2tUb3AgKyAxICsgbm9kZS5zdGFja2ZyYW1lQmVnaW47XHJcbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHN0YWNrLnNwbGljZShwYXJhbWV0ZXJCZWdpbjEpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucGF1c2VGb3JJbnB1dCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5wdXRNYW5hZ2VyLnJlYWRJbnB1dChtZXRob2QxLCBwYXJhbWV0ZXJzLCAodmFsdWU6IFZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5yZXN1bWVBZnRlcklucHV0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5yZXR1cm46XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVybihub2RlLCBzdGFjayk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZGVjcmVhc2VTdGFja3BvaW50ZXI6XHJcbiAgICAgICAgICAgICAgICBzdGFjay5zcGxpY2Uoc3RhY2tUb3AgKyAxIC0gbm9kZS5wb3BDb3VudCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuaW5pdFN0YWNrZnJhbWU6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YWNrZnJhbWVzLnB1c2godGhpcy5jdXJyZW50U3RhY2tmcmFtZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lID0gc3RhY2tUb3AgKyAxO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLnJlc2VydmVGb3JMb2NhbFZhcmlhYmxlczsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaChudWxsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jbG9zZVN0YWNrZnJhbWU6XHJcbiAgICAgICAgICAgICAgICBzdGFjay5zcGxpY2Uoc3RhY2tmcmFtZUJlZ2luKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSB0aGlzLnN0YWNrZnJhbWVzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5ld09iamVjdDpcclxuICAgICAgICAgICAgICAgIGxldCBvYmplY3QgPSBuZXcgUnVudGltZU9iamVjdChub2RlLmNsYXNzKTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogb2JqZWN0LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vZGUuY2xhc3NcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5zdWJzZXF1ZW50Q29uc3RydWN0b3JDYWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tUb3ArKztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQga2xhc3M6IEtsYXNzID0gbm9kZS5jbGFzcztcclxuXHJcbiAgICAgICAgICAgICAgICB3aGlsZSAoa2xhc3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhaXAgPSBrbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFpcC5zdGF0ZW1lbnRzLmxlbmd0aCA+IDApIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhY2tmcmFtZXMucHVzaCh0aGlzLmN1cnJlbnRTdGFja2ZyYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtOiB0aGlzLmN1cnJlbnRQcm9ncmFtLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbVBvc2l0aW9uOiB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gKyAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dFBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiB0aGlzLmN1cnJlbnRNZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja0FmdGVyUmV0dXJuOiB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDYWxsZWRGcm9tT3V0c2lkZTogbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lID0gc3RhY2tUb3AgKyAxO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IGFpcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE1ldGhvZCA9IFwiS29uc3RydWt0b3Igdm9uIFwiICsga2xhc3MuaWRlbnRpZmllcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCsrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBrbGFzcyA9IGtsYXNzLmJhc2VDbGFzcztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBOLkIuOiBjb25zdHJ1Y3RvciBjYWxsIGlzIG5leHQgc3RhdGVtZW50XHJcblxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnByb2Nlc3NQb3N0Q29uc3RydWN0b3JDYWxsYmFja3M6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrW3N0YWNrVG9wXTtcclxuICAgICAgICAgICAgICAgIGxldCBjbGFzc1R5cGUgPSA8S2xhc3M+dmFsdWUudHlwZTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHBjYyBvZiBjbGFzc1R5cGUuZ2V0UG9zdENvbnN0cnVjdG9yQ2FsbGJhY2tzKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBwY2ModmFsdWUudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmV4dGVuZGVkRm9yTG9vcEluaXQ6XHJcbiAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZDb3VudGVyICsgc3RhY2tmcmFtZUJlZ2luXSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZXh0ZW5kZWRGb3JMb29wQ2hlY2tDb3VudGVyQW5kR2V0RWxlbWVudDpcclxuICAgICAgICAgICAgICAgIGxldCBjb3VudGVyOiBudW1iZXIgPSBzdGFja1tub2RlLnN0YWNrUG9zT2ZDb3VudGVyICsgc3RhY2tmcmFtZUJlZ2luXS52YWx1ZSsrO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbGxlY3Rpb24gPSBzdGFja1tub2RlLnN0YWNrUG9zT2ZDb2xsZWN0aW9uICsgc3RhY2tmcmFtZUJlZ2luXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhcnJheVwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY291bnRlciA8ICg8YW55W10+Y29sbGVjdGlvbikubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZFbGVtZW50ICsgc3RhY2tmcmFtZUJlZ2luXS52YWx1ZSA9ICg8YW55W10+Y29sbGVjdGlvbilbY291bnRlcl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZFbGVtZW50ICsgc3RhY2tmcmFtZUJlZ2luXS50eXBlID0gKDxhbnlbXT5jb2xsZWN0aW9uKVtjb3VudGVyXS50eXBlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImludGVybmFsTGlzdFwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGlzdDogYW55W10gPSAoPExpc3RIZWxwZXI+KDxSdW50aW1lT2JqZWN0PmNvbGxlY3Rpb24pLmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdKS52YWx1ZUFycmF5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY291bnRlciA8IGxpc3QubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZFbGVtZW50ICsgc3RhY2tmcmFtZUJlZ2luXS52YWx1ZSA9IGxpc3RbY291bnRlcl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZFbGVtZW50ICsgc3RhY2tmcmFtZUJlZ2luXS50eXBlID0gbGlzdFtjb3VudGVyXS50eXBlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdyb3VwXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsaXN0MTogYW55W10gPSAoPEdyb3VwSGVscGVyPig8UnVudGltZU9iamVjdD5jb2xsZWN0aW9uKS5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl0pLnNoYXBlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvdW50ZXIgPCBsaXN0MS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrW25vZGUuc3RhY2tQb3NPZkVsZW1lbnQgKyBzdGFja2ZyYW1lQmVnaW5dLnZhbHVlID0gbGlzdDFbY291bnRlcl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZFbGVtZW50ICsgc3RhY2tmcmFtZUJlZ2luXS50eXBlID0gbGlzdDFbY291bnRlcl0ua2xhc3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSBub2RlLmRlc3RpbmF0aW9uIC0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5pbmNyZW1lbnREZWNyZW1lbnRCZWZvcmU6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrW3N0YWNrVG9wXTtcclxuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlICs9IG5vZGUuaW5jcmVtZW50RGVjcmVtZW50Qnk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuaW5jcmVtZW50RGVjcmVtZW50QWZ0ZXI6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrW3N0YWNrVG9wXTtcclxuICAgICAgICAgICAgICAgIC8vIHJlcGxhY2UgdmFsdWUgYnkgY29weTpcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wXSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUudmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdmFsdWUudHlwZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIC8vIGluY3JlbWVudCB2YWx1ZSB3aGljaCBpcyBub3QgaW52b2x2ZWQgaW4gc3Vic2VxdWVudCBcclxuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlICs9IG5vZGUuaW5jcmVtZW50RGVjcmVtZW50Qnk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuanVtcEFsd2F5czpcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IG5vZGUuZGVzdGluYXRpb24gLSAxO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmp1bXBJZlRydWU6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKDxib29sZWFuPnZhbHVlLnZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuanVtcElmRmFsc2U6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCEoPGJvb2xlYW4+dmFsdWUudmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuanVtcElmVHJ1ZUFuZExlYXZlT25TdGFjazpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2tbc3RhY2tUb3BdO1xyXG4gICAgICAgICAgICAgICAgaWYgKDxib29sZWFuPnZhbHVlLnZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuanVtcElmRmFsc2VBbmRMZWF2ZU9uU3RhY2s6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrW3N0YWNrVG9wXTtcclxuICAgICAgICAgICAgICAgIGlmICghKDxib29sZWFuPnZhbHVlLnZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IG5vZGUuZGVzdGluYXRpb24gLSAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5vT3A6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHJvZ3JhbUVuZDpcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wcm9ncmFtU3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wUHJvZ3JhbSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbi0tOyAvLyBnZXRzIGluY3JlYXNlZCBsYXRlciBvbiBhZnRlciBzd2l0Y2ggZW5kc1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGVhdmVMaW5lID0gLTE7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnBhdXNlQWZ0ZXJQcm9ncmFtRW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICgodGhpcy53b3JsZEhlbHBlciAhPSBudWxsICYmIHRoaXMud29ybGRIZWxwZXIuaGFzQWN0b3JzKCkpIHx8IHRoaXMucHJvY2Vzc2luZ0hlbHBlciAhPSBudWxsXHJcbiAgICAgICAgICAgICAgICAgICAgfHwgKHRoaXMuZ25nRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyICE9IG51bGwgJiYgdGhpcy5nbmdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXIuaGFzQWt0aW9uc0VtcGZhZW5nZXIoKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24tLTtcclxuICAgICAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBiYXNlTW9kdWxlID0gdGhpcy5tYWluLmdldEN1cnJlbnRXb3Jrc3BhY2UoKS5tb2R1bGVTdG9yZS5nZXRNb2R1bGUoXCJCYXNlIE1vZHVsZVwiKTtcclxuICAgICAgICAgICAgICAgIGxldCB0aW1lckNsYXNzOiBUaW1lckNsYXNzID0gPFRpbWVyQ2xhc3M+YmFzZU1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlRpbWVyXCIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRpbWVyQ2xhc3MudGltZXJFbnRyaWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24tLTtcclxuICAgICAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5kb25lKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gLTE7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBIZWxwZXIuc2hvd0hlbHBlcihcInNwZWVkQ29udHJvbEhlbHBlclwiLCB0aGlzLm1haW4pO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHJpbnRNYW5hZ2VyLnNob3dQcm9ncmFtRW5kKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RlcHMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGR0ID0gcGVyZm9ybWFuY2Uubm93KCkgLSB0aGlzLnRpbWVXaGVuUHJvZ3JhbVN0YXJ0ZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSAnRXhlY3V0ZWQgJyArIHRoaXMuc3RlcHMgKyAnIHN0ZXBzIGluICcgKyB0aGlzLnJvdW5kKGR0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICArICcgbXMgKCcgKyB0aGlzLnJvdW5kKHRoaXMuc3RlcHMgLyBkdCAqIDEwMDApICsgJyBzdGVwcy9zKSc7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWluLmdldEJvdHRvbURpdigpPy5jb25zb2xlPy53cml0ZUNvbnNvbGVFbnRyeShtZXNzYWdlLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLnRpbWVyRXZlbnRzICsgXCIgVGltZUV2ZW50cyBpbiBcIiArIGR0ICsgXCIgbXMgZXJnaWJ0IGVpbiBFdmVudCBhbGxlIFwiICsgZHQvdGhpcy50aW1lckV2ZW50cyArIFwiIG1zLlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlZvcmdlZ2ViZW5lIFRpbWVyZnJlcXVlbno6IEFsbGUgXCIgKyB0aGlzLnRpbWVyRGVsYXlNcyArIFwiIG1zXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RlcHMgPSAtMTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBpZiAodGhpcy53b3JsZEhlbHBlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy53b3JsZEhlbHBlci5zcHJpdGVBbmltYXRpb25zID0gW107XHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlcj8uZGV0YWNoRXZlbnRzKCk7XHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlciA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5tYWluLmhpZGVQcm9ncmFtUG9pbnRlclBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gaWYodGhpcy53b3JsZEhlbHBlciAhPSBudWxsKXtcclxuICAgICAgICAgICAgICAgIC8vICAgICB0aGlzLndvcmxkSGVscGVyLmNhY2hlQXNCaXRtYXAoKTtcclxuICAgICAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24tLTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RvcCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnByaW50OlxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wcmludGxuOlxyXG4gICAgICAgICAgICAgICAgbGV0IHRleHQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbG9yID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLndpdGhDb2xvcikgY29sb3IgPSA8c3RyaW5nIHwgbnVtYmVyPnN0YWNrLnBvcCgpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFub2RlLmVtcHR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dCA9IDxzdHJpbmc+c3RhY2sucG9wKCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRleHQgPT0gbnVsbCkgdGV4dCA9IFwibnVsbFwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBUb2tlblR5cGUucHJpbnRsbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRNYW5hZ2VyLnByaW50bG4odGV4dCwgY29sb3IpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50TWFuYWdlci5wcmludCh0ZXh0LCBjb2xvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaEVtcHR5QXJyYXk6XHJcbiAgICAgICAgICAgICAgICBsZXQgY291bnRzOiBudW1iZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmRpbWVuc2lvbjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY291bnRzLnB1c2goPG51bWJlcj5zdGFjay5wb3AoKS52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHRoaXMubWFrZUVtcHR5QXJyYXkoY291bnRzLCBub2RlLmFycmF5VHlwZSkpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmJlZ2luQXJyYXk6XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBub2RlLmFycmF5VHlwZSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogW11cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmFkZFRvQXJyYXk6XHJcbiAgICAgICAgICAgICAgICBzdGFja1RvcCAtPSBub2RlLm51bWJlck9mRWxlbWVudHNUb0FkZDtcclxuICAgICAgICAgICAgICAgIC8vIGxldCB2YWx1ZXM6IFZhbHVlW10gPSBzdGFjay5zcGxpY2Uoc3RhY2tUb3AgKyAxLCBub2RlLm51bWJlck9mRWxlbWVudHNUb0FkZCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWVzOiBWYWx1ZVtdID0gc3RhY2suc3BsaWNlKHN0YWNrVG9wICsgMSwgbm9kZS5udW1iZXJPZkVsZW1lbnRzVG9BZGQpLm1hcCh0dm8gPT4gKHsgdHlwZTogdHZvLnR5cGUsIHZhbHVlOiB0dm8udmFsdWUgfSkpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3BdLnZhbHVlID0gKDxhbnlbXT5zdGFja1tzdGFja1RvcF0udmFsdWUpLmNvbmNhdCh2YWx1ZXMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hFbnVtVmFsdWU6XHJcbiAgICAgICAgICAgICAgICBsZXQgZW51bUluZm8gPSBub2RlLmVudW1DbGFzcy5pZGVudGlmaWVyVG9JbmZvTWFwW25vZGUudmFsdWVJZGVudGlmaWVyXTtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2gobm9kZS5lbnVtQ2xhc3MudmFsdWVMaXN0LnZhbHVlW2VudW1JbmZvLm9yZGluYWxdKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkU3dpdGNoOlxyXG4gICAgICAgICAgICAgICAgbGV0IHN3aXRjaFZhbHVlID0gc3RhY2sucG9wKCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGVzdGluYXRpb24gPSBub2RlLmRlc3RpbmF0aW9uTWFwW3N3aXRjaFZhbHVlXTtcclxuICAgICAgICAgICAgICAgIGlmIChkZXN0aW5hdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gZGVzdGluYXRpb24gLSAxOyAvLyBpdCB3aWxsIGJlIGluY3JlYXNlZCBhZnRlciB0aGlzIHN3aXRjaC1zdGF0ZW1lbnQhXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmRlZmF1bHREZXN0aW5hdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IG5vZGUuZGVmYXVsdERlc3RpbmF0aW9uIC0gMTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlcmUncyBhIGp1bXBub2RlIGFmdGVyIHRoaXMgbm9kZSB3aGljaCBqdW1wcyByaWdodCBhZnRlciBsYXN0IHN3aXRjaCBjYXNlLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNvIHRoZXJlJ3Mgbm90aGluZyBtb3JlIHRvIGRvIGhlcmUuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuaGVhcFZhcmlhYmxlRGVjbGFyYXRpb246XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHYgPSBub2RlLnZhcmlhYmxlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oZWFwW3YuaWRlbnRpZmllcl0gPSB2O1xyXG4gICAgICAgICAgICAgICAgdi52YWx1ZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB2LnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICh2LnR5cGUgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSA/IHYudHlwZS5pbml0aWFsVmFsdWUgOiBudWxsXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5wdXNoT25Ub3BPZlN0YWNrRm9ySW5pdGlhbGl6YXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YWNrLnB1c2godi52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hGcm9tSGVhcFRvU3RhY2s6XHJcbiAgICAgICAgICAgICAgICBsZXQgdjEgPSB0aGlzLmhlYXBbbm9kZS5pZGVudGlmaWVyXTtcclxuICAgICAgICAgICAgICAgIGlmICh2MSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFjay5wdXNoKHYxLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiRGllIFZhcmlhYmxlIFwiICsgbm9kZS5pZGVudGlmaWVyICsgXCIgaXN0IG5pY2h0IGJla2FubnQuXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucmV0dXJuSWZEZXN0cm95ZWQ6XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGVSdW50aW1lT2JqZWN0OiBSdW50aW1lT2JqZWN0ID0gdGhpcy5zdGFja1tzdGFja2ZyYW1lQmVnaW5dLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNoYXBlUnVudGltZU9iamVjdCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoYXBlID0gc2hhcGVSdW50aW1lT2JqZWN0LmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2hhcGVbXCJpc0Rlc3Ryb3llZFwiXSA9PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuKG51bGwsIHN0YWNrKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2V0UGF1c2VEdXJhdGlvbjpcclxuICAgICAgICAgICAgICAgIGxldCBkdXJhdGlvbiA9IHRoaXMuc3RhY2sucG9wKCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wYXVzZVVudGlsID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhdXNlVW50aWwgPSBwZXJmb3JtYW5jZS5ub3coKSArIGR1cmF0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnBhdXNlOlxyXG4gICAgICAgICAgICAgICAgbm9kZS5zdGVwRmluaXNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucGF1c2VVbnRpbCAhPSBudWxsICYmIHBlcmZvcm1hbmNlLm5vdygpIDwgdGhpcy5wYXVzZVVudGlsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uLS07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGF1c2VVbnRpbCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uKys7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG9sZFN0YXRlOiBJbnRlcnByZXRlclN0YXRlO1xyXG4gICAgcGF1c2VGb3JJbnB1dCgpIHtcclxuICAgICAgICB0aGlzLnRpbWVyU3RvcHBlZCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5vbGRTdGF0ZSA9IHRoaXMuc3RhdGU7XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLndhaXRpbmdGb3JJbnB1dCk7XHJcbiAgICAgICAgdGhpcy5zaG93UHJvZ3JhbVBvaW50ZXJBbmRWYXJpYWJsZXMoKTtcclxuICAgIH1cclxuXHJcbiAgICByZXN1bWVBZnRlcklucHV0KHZhbHVlOiBWYWx1ZSwgcG9wUHJpb3JWYWx1ZTogYm9vbGVhbiA9IGZhbHNlKSB7XHJcbiAgICAgICAgaWYgKHBvcFByaW9yVmFsdWUpIHRoaXMuc3RhY2sucG9wKCk7XHJcbiAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHRoaXMuc3RhY2sucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgdGhpcy5tYWluLmhpZGVQcm9ncmFtUG9pbnRlclBvc2l0aW9uKCk7XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLnBhdXNlZCk7XHJcbiAgICAgICAgaWYgKHRoaXMub2xkU3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5ydW5uaW5nKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhcnQoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNob3dQcm9ncmFtUG9pbnRlckFuZFZhcmlhYmxlcygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHJldHVybihub2RlOiBSZXR1cm5TdGF0ZW1lbnQgfCBudWxsLCBzdGFjazogVmFsdWVbXSkge1xyXG5cclxuICAgICAgICBsZXQgY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4gPSB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAobm9kZSAhPSBudWxsICYmIG5vZGUuY29weVJldHVyblZhbHVlVG9TdGFja2ZyYW1lUG9zMCkge1xyXG4gICAgICAgICAgICBsZXQgcmV0dXJuVmFsdWU6IFZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgIHN0YWNrW3RoaXMuY3VycmVudFN0YWNrZnJhbWVdID0gcmV0dXJuVmFsdWU7XHJcbiAgICAgICAgICAgIHN0YWNrLnNwbGljZSh0aGlzLmN1cnJlbnRTdGFja2ZyYW1lICsgMSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc3RhY2suc3BsaWNlKHRoaXMuY3VycmVudFN0YWNrZnJhbWUgKyAoKG5vZGUgIT0gbnVsbCAmJiBub2RlLmxlYXZlVGhpc09iamVjdE9uU3RhY2spID8gMSA6IDApKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSB0aGlzLnN0YWNrZnJhbWVzLnBvcCgpO1xyXG5cclxuICAgICAgICB0aGlzLnBvcFByb2dyYW0oKTtcclxuICAgICAgICBpZiAobm9kZSAhPSBudWxsICYmIG5vZGUubWV0aG9kV2FzSW5qZWN0ZWQgPT0gdHJ1ZSkgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uKys7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uLS07ICAvLyBwb3NpdGlvbiBnZXRzIGluY3JlYXNlZCBieSBvbmUgYXQgdGhlIGVuZCBvZiB0aGlzIHN3aXRjaC1zdGF0ZW1lbnQsIHNvIC4uLiAtIDFcclxuICAgICAgICB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsLS07XHJcblxyXG4gICAgICAgIGlmIChjdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPCAwICYmIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50c1t0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gKyAxXS50eXBlID09IFRva2VuVHlwZS5qdW1wQWx3YXlzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RlcEZpbmlzaGVkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgbWFrZUVtcHR5QXJyYXkoY291bnRzOiBudW1iZXJbXSwgdHlwZTogVHlwZSk6IFZhbHVlIHtcclxuICAgICAgICBsZXQgdHlwZTEgPSAoPEFycmF5VHlwZT50eXBlKS5hcnJheU9mVHlwZTtcclxuICAgICAgICBpZiAoY291bnRzLmxlbmd0aCA9PSAxKSB7XHJcbiAgICAgICAgICAgIGxldCBhcnJheTogVmFsdWVbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50c1swXTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdiA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlMSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbnVsbFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZTEgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdi52YWx1ZSA9IHR5cGUxLmluaXRpYWxWYWx1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBhcnJheS5wdXNoKHYpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogdHlwZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBhcnJheVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCBhcnJheTogVmFsdWVbXSA9IFtdO1xyXG4gICAgICAgICAgICBsZXQgbiA9IGNvdW50cy5wb3AoKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGFycmF5LnB1c2godGhpcy5tYWtlRW1wdHlBcnJheShjb3VudHMsIHR5cGUxKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogYXJyYXlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHJvdW5kKG46IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIFwiXCIgKyBNYXRoLnJvdW5kKG4gKiAxMDAwMCkgLyAxMDAwMDtcclxuICAgIH1cclxuXHJcbiAgICBydW5uaW5nU3RhdGVzOiBJbnRlcnByZXRlclN0YXRlW10gPSBbSW50ZXJwcmV0ZXJTdGF0ZS5wYXVzZWQsIEludGVycHJldGVyU3RhdGUucnVubmluZywgSW50ZXJwcmV0ZXJTdGF0ZS53YWl0aW5nRm9ySW5wdXRdO1xyXG5cclxuICAgIHNldFN0YXRlKHN0YXRlOiBJbnRlcnByZXRlclN0YXRlKSB7XHJcblxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiU2V0IHN0YXRlIFwiICsgSW50ZXJwcmV0ZXJTdGF0ZVtzdGF0ZV0pO1xyXG5cclxuICAgICAgICBsZXQgb2xkU3RhdGUgPSB0aGlzLnN0YXRlO1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcclxuXHJcbiAgICAgICAgaWYgKHN0YXRlID09IEludGVycHJldGVyU3RhdGUuZXJyb3IgfHwgc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5kb25lKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvc2VBbGxXZWJzb2NrZXRzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYW0gPSB0aGlzLm1haW4uZ2V0QWN0aW9uTWFuYWdlcigpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhY3Rpb25JZCBvZiB0aGlzLmFjdGlvbnMpIHtcclxuICAgICAgICAgICAgYW0uc2V0QWN0aXZlKFwiaW50ZXJwcmV0ZXIuXCIgKyBhY3Rpb25JZCwgdGhpcy5idXR0b25BY3RpdmVNYXRyaXhbYWN0aW9uSWRdW3N0YXRlXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYnV0dG9uU3RhcnRBY3RpdmUgPSB0aGlzLmJ1dHRvbkFjdGl2ZU1hdHJpeFsnc3RhcnQnXVtzdGF0ZV07XHJcblxyXG4gICAgICAgIGlmIChidXR0b25TdGFydEFjdGl2ZSkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25TdGFydC5zaG93KCk7XHJcbiAgICAgICAgICAgIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblBhdXNlLmhpZGUoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25TdGFydC5oaWRlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblBhdXNlLnNob3coKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBidXR0b25TdG9wQWN0aXZlID0gdGhpcy5idXR0b25BY3RpdmVNYXRyaXhbJ3N0b3AnXVtzdGF0ZV07XHJcbiAgICAgICAgaWYgKGJ1dHRvblN0b3BBY3RpdmUpIHtcclxuICAgICAgICAgICAgLy8gdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uRWRpdC5zaG93KCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uRWRpdC5oaWRlKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLndvcmxkSGVscGVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMud29ybGRIZWxwZXIuY2xlYXJBY3Rvckxpc3RzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5nbmdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXI/LmRldGFjaEV2ZW50cygpO1xyXG4gICAgICAgICAgICB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlciA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5ydW5uaW5nU3RhdGVzLmluZGV4T2Yob2xkU3RhdGUpID49IDAgJiYgdGhpcy5ydW5uaW5nU3RhdGVzLmluZGV4T2Yoc3RhdGUpIDwgMCkge1xyXG4gICAgICAgICAgICB0aGlzLmRlYnVnZ2VyLmRpc2FibGUoKTtcclxuICAgICAgICAgICAgLy8gdGhpcy5tYWluLmdldE1vbmFjb0VkaXRvcigpLnVwZGF0ZU9wdGlvbnMoeyByZWFkT25seTogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgIHRoaXMua2V5Ym9hcmRUb29sLnVuc3Vic2NyaWJlQWxsTGlzdGVuZXJzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5ydW5uaW5nU3RhdGVzLmluZGV4T2Yob2xkU3RhdGUpIDwgMCAmJiB0aGlzLnJ1bm5pbmdTdGF0ZXMuaW5kZXhPZihzdGF0ZSkgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmRlYnVnZ2VyLmVuYWJsZSgpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkudXBkYXRlT3B0aW9ucyh7IHJlYWRPbmx5OiB0cnVlIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2xvc2VBbGxXZWJzb2NrZXRzKCkge1xyXG4gICAgICAgIHRoaXMud2ViU29ja2V0c1RvQ2xvc2VBZnRlclByb2dyYW1IYWx0LmZvckVhY2goc29ja2V0ID0+IHNvY2tldC5jbG9zZSgpKTtcclxuICAgICAgICB0aGlzLndlYlNvY2tldHNUb0Nsb3NlQWZ0ZXJQcm9ncmFtSGFsdCA9IFtdO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwdXNoQ3VycmVudFByb2dyYW0oKSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IHRleHRQb3NpdGlvbjogVGV4dFBvc2l0aW9uO1xyXG4gICAgICAgIGxldCBjdXJyZW50U3RhdGVtZW50ID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbl07XHJcbiAgICAgICAgaWYgKGN1cnJlbnRTdGF0ZW1lbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0ZXh0UG9zaXRpb24gPSBjdXJyZW50U3RhdGVtZW50LnBvc2l0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgIHByb2dyYW06IHRoaXMuY3VycmVudFByb2dyYW0sXHJcbiAgICAgICAgICAgIHByb2dyYW1Qb3NpdGlvbjogdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uLFxyXG4gICAgICAgICAgICB0ZXh0UG9zaXRpb246IHRleHRQb3NpdGlvbixcclxuICAgICAgICAgICAgbWV0aG9kOiB0aGlzLmN1cnJlbnRNZXRob2QsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4sXHJcbiAgICAgICAgICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IHRoaXMuY3VycmVudElzQ2FsbGVkRnJvbU91dHNpZGVcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuID0gbnVsbDtcclxuICAgICAgICB0aGlzLmN1cnJlbnRJc0NhbGxlZEZyb21PdXRzaWRlID0gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gcnVuVGltZXIobWV0aG9kOiBNZXRob2QsIHN0YWNrRWxlbWVudHM6IFZhbHVlW10sXHJcbiAgICAvLyAgICAgY2FsbGJhY2tBZnRlclJldHVybjogKGludGVycHJldGVyOiBJbnRlcnByZXRlcikgPT4gdm9pZCkge1xyXG5cclxuICAgIC8vICAgICBpZih0aGlzLnN0YXRlICE9IEludGVycHJldGVyU3RhdGUucnVubmluZyl7XHJcbiAgICAvLyAgICAgICAgIHJldHVybjtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIHRoaXMucHVzaEN1cnJlbnRQcm9ncmFtKCk7XHJcblxyXG4gICAgLy8gICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBtZXRob2QucHJvZ3JhbTtcclxuICAgIC8vICAgICB0aGlzLmN1cnJlbnRNZXRob2QgPSBtZXRob2Q7XHJcbiAgICAvLyAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gMDtcclxuICAgIC8vICAgICB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuID0gY2FsbGJhY2tBZnRlclJldHVybjtcclxuICAgIC8vICAgICB0aGlzLmN1cnJlbnRJc0NhbGxlZEZyb21PdXRzaWRlID0gXCJUaW1lclwiO1xyXG5cclxuICAgIC8vICAgICB0aGlzLnN0YWNrZnJhbWVzLnB1c2godGhpcy5jdXJyZW50U3RhY2tmcmFtZSk7XHJcbiAgICAvLyAgICAgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9IHRoaXMuc3RhY2subGVuZ3RoO1xyXG4gICAgLy8gICAgIGZvciAobGV0IHNlIG9mIHN0YWNrRWxlbWVudHMpIHRoaXMuc3RhY2sucHVzaChzZSk7XHJcbiAgICAvLyAgICAgbGV0IHN0YXRlbWVudHMgPSBtZXRob2QucHJvZ3JhbS5zdGF0ZW1lbnRzO1xyXG5cclxuICAgIC8vICAgICAvLyBpZiBwcm9ncmFtIGVuZHMgd2l0aCByZXR1cm4gdGhlbiB0aGlzIHJldHVybi1zdGF0ZW1lbnQgZGVjcmVhc2VzIHN0ZXBPdmVyTmVzdGluZ0xldmVsLiBTbyB3ZSBpbmNyZWFzZSBpdFxyXG4gICAgLy8gICAgIC8vIGJlZm9yZWhhbmQgdG8gY29tcGVuc2F0ZSB0aGlzIGVmZmVjdC5cclxuICAgIC8vICAgICBpZihzdGF0ZW1lbnRzW3N0YXRlbWVudHMubGVuZ3RoIC0gMV0udHlwZSA9PSBUb2tlblR5cGUucmV0dXJuKSB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsKys7XHJcblxyXG4gICAgLy8gfVxyXG5cclxuICAgIHJ1blRpbWVyKG1ldGhvZDogTWV0aG9kLCBzdGFja0VsZW1lbnRzOiBWYWx1ZVtdLFxyXG4gICAgICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IChpbnRlcnByZXRlcjogSW50ZXJwcmV0ZXIpID0+IHZvaWQsIGlzQWN0b3I6IGJvb2xlYW4pIHtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT0gSW50ZXJwcmV0ZXJTdGF0ZS5ydW5uaW5nKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdGF0ZW1lbnRzID0gbWV0aG9kLnByb2dyYW0uc3RhdGVtZW50cztcclxuXHJcbiAgICAgICAgaWYgKGlzQWN0b3IgfHwgdGhpcy5wcm9ncmFtU3RhY2subGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgLy8gTWFpbiBQcm9ncmFtIGlzIHJ1bm5pbmcgPT4gVGltZXIgaGFzIGhpZ2hlciBwcmVjZWRlbmNlXHJcbiAgICAgICAgICAgIHRoaXMucHVzaEN1cnJlbnRQcm9ncmFtKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gbWV0aG9kLnByb2dyYW07XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudE1ldGhvZCA9IG1ldGhvZDtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gMDtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybiA9IGNhbGxiYWNrQWZ0ZXJSZXR1cm47XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudElzQ2FsbGVkRnJvbU91dHNpZGUgPSBcIlRpbWVyXCI7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnN0YWNrZnJhbWVzLnB1c2godGhpcy5jdXJyZW50U3RhY2tmcmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSB0aGlzLnN0YWNrLmxlbmd0aDtcclxuICAgICAgICAgICAgdGhpcy5zdGFjayA9IHRoaXMuc3RhY2suY29uY2F0KHN0YWNrRWxlbWVudHMpO1xyXG4gICAgICAgICAgICAvLyBmb3IgKGxldCBzZSBvZiBzdGFja0VsZW1lbnRzKSB0aGlzLnN0YWNrLnB1c2goc2UpO1xyXG5cclxuICAgICAgICAgICAgLy8gaWYgcHJvZ3JhbSBlbmRzIHdpdGggcmV0dXJuIHRoZW4gdGhpcyByZXR1cm4tc3RhdGVtZW50IGRlY3JlYXNlcyBzdGVwT3Zlck5lc3RpbmdMZXZlbC4gU28gd2UgaW5jcmVhc2UgaXRcclxuICAgICAgICAgICAgLy8gYmVmb3JlaGFuZCB0byBjb21wZW5zYXRlIHRoaXMgZWZmZWN0LlxyXG4gICAgICAgICAgICBpZiAoc3RhdGVtZW50c1tzdGF0ZW1lbnRzLmxlbmd0aCAtIDFdLnR5cGUgPT0gVG9rZW5UeXBlLnJldHVybikgdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCsrO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGFub3RoZXIgVGltZXIgaXMgcnVubmluZyA9PiBxdWV1ZSB1cFxyXG4gICAgICAgICAgICAvLyBwb3NpdGlvbiAwIGluIHByb2dyYW0gc3RhY2sgaXMgbWFpbiBwcm9ncmFtXHJcbiAgICAgICAgICAgIC8vID0+IGluc2VydCB0aW1lciBpbiBwb3NpdGlvbiAxXHJcblxyXG4gICAgICAgICAgICB0aGlzLnByb2dyYW1TdGFjay5zcGxpY2UoMSwgMCwge1xyXG4gICAgICAgICAgICAgICAgcHJvZ3JhbTogbWV0aG9kLnByb2dyYW0sXHJcbiAgICAgICAgICAgICAgICBwcm9ncmFtUG9zaXRpb246IDAsXHJcbiAgICAgICAgICAgICAgICB0ZXh0UG9zaXRpb246IHsgbGluZTogMCwgY29sdW1uOiAwLCBsZW5ndGg6IDAgfSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tBZnRlclJldHVybjogY2FsbGJhY2tBZnRlclJldHVybixcclxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IFwiVGltZXJcIixcclxuICAgICAgICAgICAgICAgIHN0YWNrRWxlbWVudHNUb1B1c2hCZWZvcmVGaXJzdEV4ZWN1dGluZzogc3RhY2tFbGVtZW50c1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChzdGF0ZW1lbnRzW3N0YXRlbWVudHMubGVuZ3RoIC0gMV0udHlwZSA9PSBUb2tlblR5cGUucmV0dXJuKSB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsKys7XHJcblxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV2YWx1YXRlKHByb2dyYW06IFByb2dyYW0pOiB7IGVycm9yOiBzdHJpbmcsIHZhbHVlOiBWYWx1ZSB9IHtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoQ3VycmVudFByb2dyYW0oKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHByb2dyYW07XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gMDtcclxuXHJcbiAgICAgICAgbGV0IHN0YWNrc2l6ZUJlZm9yZSA9IHRoaXMuc3RhY2subGVuZ3RoO1xyXG5cclxuICAgICAgICBsZXQgb2xkSW50ZXJwcmV0ZXJTdGF0ZSA9IHRoaXMuc3RhdGU7XHJcbiAgICAgICAgbGV0IHN0ZXBPdmVyTmVzdGluZ0xldmVsID0gdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbDtcclxuICAgICAgICBsZXQgYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWcgPSB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnO1xyXG5cclxuICAgICAgICBsZXQgb2xkU3RhY2tmcmFtZSA9IHRoaXMuY3VycmVudFN0YWNrZnJhbWU7XHJcblxyXG4gICAgICAgIGxldCBlcnJvcjogc3RyaW5nO1xyXG4gICAgICAgIGxldCBzdGVwQ291bnQgPSAwO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB3aGlsZSAoZXJyb3IgPT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAgICAgKHRoaXMuY3VycmVudFByb2dyYW0gIT0gcHJvZ3JhbSB8fCB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICAmJiBzdGVwQ291bnQgPCAxMDAwMDBcclxuICAgICAgICAgICAgICAgIC8vICYmIHRoaXMuY3VycmVudFByb2dyYW0gPT0gcHJvZ3JhbVxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGVycm9yID0gdGhpcy5uZXh0U3RlcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RlcENvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGVycm9yID0gXCJGZWhsZXIgYmVpIGRlciBBdXN3ZXJ0dW5nXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50UHJvZ3JhbSA9PSBwcm9ncmFtICYmIHRoaXMucHJvZ3JhbVN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5wb3BQcm9ncmFtKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc3RhY2tUb3A6IFZhbHVlO1xyXG4gICAgICAgIGlmICh0aGlzLnN0YWNrLmxlbmd0aCA+IHN0YWNrc2l6ZUJlZm9yZSkge1xyXG4gICAgICAgICAgICBzdGFja1RvcCA9IHRoaXMuc3RhY2sucG9wKCk7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5zdGFjay5sZW5ndGggPiBzdGFja3NpemVCZWZvcmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsID0gc3RlcE92ZXJOZXN0aW5nTGV2ZWw7XHJcbiAgICAgICAgdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IGFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnO1xyXG4gICAgICAgIHRoaXMuc2V0U3RhdGUob2xkSW50ZXJwcmV0ZXJTdGF0ZSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGVycm9yOiBlcnJvcixcclxuICAgICAgICAgICAgdmFsdWU6IHN0YWNrVG9wXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlSW1tZWRpYXRlbHlJbk5ld1N0YWNrZnJhbWUocHJvZ3JhbTogUHJvZ3JhbSwgdmFsdWVzVG9QdXNoQmVmb3JlRXhlY3V0aW5nOiBWYWx1ZVtdKTogeyBlcnJvcjogc3RyaW5nLCB2YWx1ZTogVmFsdWUgfSB7XHJcblxyXG4gICAgICAgIHRoaXMucHVzaEN1cnJlbnRQcm9ncmFtKCk7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xyXG4gICAgICAgIGxldCBvbGRQcm9ncmFtUG9zaXRpb24gPSB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb247XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gMDtcclxuXHJcbiAgICAgICAgbGV0IG51bWJlck9mU3RhY2tmcmFtZXNCZWZvcmUgPSB0aGlzLnN0YWNrZnJhbWVzLmxlbmd0aDtcclxuICAgICAgICB0aGlzLnN0YWNrZnJhbWVzLnB1c2godGhpcy5jdXJyZW50U3RhY2tmcmFtZSk7XHJcbiAgICAgICAgbGV0IHN0YWNrc2l6ZUJlZm9yZSA9IHRoaXMuc3RhY2subGVuZ3RoO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSBzdGFja3NpemVCZWZvcmU7XHJcblxyXG4gICAgICAgIGZvciAobGV0IHYgb2YgdmFsdWVzVG9QdXNoQmVmb3JlRXhlY3V0aW5nKSB0aGlzLnN0YWNrLnB1c2godik7XHJcblxyXG4gICAgICAgIGxldCBvbGRJbnRlcnByZXRlclN0YXRlID0gdGhpcy5zdGF0ZTtcclxuICAgICAgICBsZXQgc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsO1xyXG4gICAgICAgIGxldCBhZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IHRoaXMuYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWc7XHJcblxyXG5cclxuICAgICAgICBsZXQgc3RlcENvdW50ID0gMDtcclxuICAgICAgICBsZXQgZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5zdGFja2ZyYW1lcy5sZW5ndGggPiBudW1iZXJPZlN0YWNrZnJhbWVzQmVmb3JlXHJcbiAgICAgICAgICAgICAgICAmJiBzdGVwQ291bnQgPCAxMDAwMDAgJiYgZXJyb3IgPT0gbnVsbFxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGxldCBub2RlID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbl07XHJcblxyXG4gICAgICAgICAgICAgICAgZXJyb3IgPSB0aGlzLmV4ZWN1dGVOb2RlKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgc3RlcENvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGVycm9yID0gXCJGZWhsZXIgYmVpIGRlciBBdXN3ZXJ0dW5nXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3RlcENvdW50ID09IDEwMDAwMCkgdGhpcy50aHJvd0V4Y2VwdGlvbihcIkRpZSBBdXNmw7xocnVuZyBkZXMgS29uc3RydWt0b3JzIGRhdWVydGUgenUgbGFuZ2UuXCIpO1xyXG5cclxuICAgICAgICBsZXQgc3RhY2tUb3A6IFZhbHVlO1xyXG4gICAgICAgIGlmICh0aGlzLnN0YWNrLmxlbmd0aCA+IHN0YWNrc2l6ZUJlZm9yZSkge1xyXG4gICAgICAgICAgICBzdGFja1RvcCA9IHRoaXMuc3RhY2sucG9wKCk7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5zdGFjay5sZW5ndGggPiBzdGFja3NpemVCZWZvcmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsID0gc3RlcE92ZXJOZXN0aW5nTGV2ZWw7XHJcbiAgICAgICAgdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IGFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnO1xyXG4gICAgICAgIC8vIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbisrO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSBvbGRQcm9ncmFtUG9zaXRpb247XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShvbGRJbnRlcnByZXRlclN0YXRlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZXJyb3I6IGVycm9yLFxyXG4gICAgICAgICAgICB2YWx1ZTogc3RhY2tUb3BcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGluc3RhbnRpYXRlT2JqZWN0SW1tZWRpYXRlbHkoa2xhc3M6IEtsYXNzKTogUnVudGltZU9iamVjdCB7XHJcbiAgICAgICAgbGV0IG9iamVjdCA9IG5ldyBSdW50aW1lT2JqZWN0KGtsYXNzKTtcclxuXHJcbiAgICAgICAgbGV0IHZhbHVlID0ge1xyXG4gICAgICAgICAgICB2YWx1ZTogb2JqZWN0LFxyXG4gICAgICAgICAgICB0eXBlOiBrbGFzc1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCBrbGFzczEgPSBrbGFzcztcclxuXHJcbiAgICAgICAgd2hpbGUgKGtsYXNzMSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCBhaXAgPSBrbGFzczEuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtO1xyXG4gICAgICAgICAgICBpZiAoYWlwLnN0YXRlbWVudHMubGVuZ3RoID4gMCkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuZXhlY3V0ZUltbWVkaWF0ZWx5SW5OZXdTdGFja2ZyYW1lKGFpcCwgW3ZhbHVlXSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGtsYXNzMSA9IGtsYXNzMS5iYXNlQ2xhc3M7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgY29uc3RydWN0b3IgPSBrbGFzcy5nZXRNZXRob2RCeVNpZ25hdHVyZShrbGFzcy5pZGVudGlmaWVyICsgXCIoKVwiKTtcclxuICAgICAgICBpZiAoY29uc3RydWN0b3IgIT0gbnVsbCAmJiBjb25zdHJ1Y3Rvci5wcm9ncmFtICE9IG51bGwpIHtcclxuICAgICAgICAgICAgLy8gbGV0IHByb2dyYW1XaXRob3V0UmV0dXJuU3RhdGVtZW50OiBQcm9ncmFtID0ge1xyXG4gICAgICAgICAgICAvLyAgICAgbGFiZWxNYW5hZ2VyOiBudWxsLFxyXG4gICAgICAgICAgICAvLyAgICAgbW9kdWxlOiBjb25zdHJ1Y3Rvci5wcm9ncmFtLm1vZHVsZSxcclxuICAgICAgICAgICAgLy8gICAgIHN0YXRlbWVudHM6IGNvbnN0cnVjdG9yLnByb2dyYW0uc3RhdGVtZW50cy5zbGljZSgwLCBjb25zdHJ1Y3Rvci5wcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoIC0gMSlcclxuICAgICAgICAgICAgLy8gfTtcclxuICAgICAgICAgICAgdGhpcy5leGVjdXRlSW1tZWRpYXRlbHlJbk5ld1N0YWNrZnJhbWUoY29uc3RydWN0b3IucHJvZ3JhbSwgW3ZhbHVlXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gb2JqZWN0O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByZWdpc3RlckRhdGFiYXNlQ29ubmVjdGlvbihjaDogQ29ubmVjdGlvbkhlbHBlcikge1xyXG4gICAgICAgIHRoaXMuZGF0YWJhc2VDb25uZWN0aW9uSGVscGVycy5wdXNoKGNoKTtcclxuICAgIH1cclxuXHJcblxyXG59Il19