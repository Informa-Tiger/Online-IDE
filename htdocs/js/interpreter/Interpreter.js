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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW50ZXJwcmV0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50L2ludGVycHJldGVyL0ludGVycHJldGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBZ0IsU0FBUyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFHeEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQXFCLE1BQU0sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUczRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbkQsT0FBTyxFQUFFLGdCQUFnQixFQUEyQixtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVqRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFL0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBU3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUd0RCxNQUFNLENBQU4sSUFBWSxnQkFFWDtBQUZELFdBQVksZ0JBQWdCO0lBQ3hCLDZFQUFlLENBQUE7SUFBRSw2REFBTyxDQUFBO0lBQUUsMkRBQU0sQ0FBQTtJQUFFLHlEQUFLLENBQUE7SUFBRSx1REFBSSxDQUFBO0lBQUUsNkVBQWUsQ0FBQTtJQUFFLHlGQUFxQixDQUFBO0FBQ3pGLENBQUMsRUFGVyxnQkFBZ0IsS0FBaEIs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WUFDckcsS0FBSztZQUNMLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUN4RTtRQUVELE9BQU8sTUFBTSxDQUFDO0lBRWxCLENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxFQUFvQjtRQUMzQyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FHSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRleHRQb3NpdGlvbiwgVG9rZW5UeXBlLCBUb2tlblR5cGVSZWFkYWJsZSB9IGZyb20gXCIuLi9jb21waWxlci9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBNb2R1bGUsIE1vZHVsZVN0b3JlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3BhcnNlci9Nb2R1bGUuanNcIjtcclxuaW1wb3J0IHsgUHJvZ3JhbSwgU3RhdGVtZW50LCBSZXR1cm5TdGF0ZW1lbnQgfSBmcm9tIFwiLi4vY29tcGlsZXIvcGFyc2VyL1Byb2dyYW0uanNcIjtcclxuaW1wb3J0IHsgQXJyYXlUeXBlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL0FycmF5LmpzXCI7XHJcbmltcG9ydCB7IEtsYXNzLCBJbnRlcmZhY2UgfSBmcm9tIFwiLi4vY29tcGlsZXIvdHlwZXMvQ2xhc3MuanNcIjtcclxuaW1wb3J0IHsgRW51bSwgRW51bVJ1bnRpbWVPYmplY3QgfSBmcm9tIFwiLi4vY29tcGlsZXIvdHlwZXMvRW51bS5qc1wiO1xyXG5pbXBvcnQgeyBQcmltaXRpdmVUeXBlLCBUeXBlLCBWYWx1ZSwgSGVhcCwgTWV0aG9kIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL1R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IFByaW50TWFuYWdlciB9IGZyb20gXCIuLi9tYWluL2d1aS9QcmludE1hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgTWFpbiB9IGZyb20gXCIuLi9tYWluL01haW4uanNcIjtcclxuaW1wb3J0IHsgRGVidWdnZXIgfSBmcm9tIFwiLi9EZWJ1Z2dlci5qc1wiO1xyXG5pbXBvcnQgeyBSdW50aW1lT2JqZWN0IH0gZnJvbSBcIi4vUnVudGltZU9iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBpbnRQcmltaXRpdmVUeXBlLCBudWxsVHlwZSwgT3BlcmFuZElzTnVsbCwgc3RyaW5nUHJpbWl0aXZlVHlwZSB9IGZyb20gXCIuLi9jb21waWxlci90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnB1dE1hbmFnZXIgfSBmcm9tIFwiLi9JbnB1dE1hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgV29ybGRIZWxwZXIgfSBmcm9tIFwiLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvV29ybGQuanNcIjtcclxuaW1wb3J0IHsgSGVscGVyIH0gZnJvbSBcIi4uL21haW4vZ3VpL0hlbHBlci5qc1wiO1xyXG5pbXBvcnQgeyBUaW1lckNsYXNzIH0gZnJvbSBcIi4uL3J1bnRpbWVsaWJyYXJ5L1RpbWVyLmpzXCI7XHJcbmltcG9ydCB7IEtleWJvYXJkVG9vbCB9IGZyb20gXCIuLi90b29scy9LZXlib2FyZFRvb2wuanNcIjtcclxuaW1wb3J0IHsgUHJvZ3JhbUNvbnRyb2xCdXR0b25zIH0gZnJvbSBcIi4uL21haW4vZ3VpL1Byb2dyYW1Db250cm9sQnV0dG9ucy5qc1wiO1xyXG5pbXBvcnQgeyBNYWluQmFzZSB9IGZyb20gXCIuLi9tYWluL01haW5CYXNlLmpzXCI7XHJcbmltcG9ydCB7IExpc3RIZWxwZXIgfSBmcm9tIFwiLi4vcnVudGltZWxpYnJhcnkvY29sbGVjdGlvbnMvQXJyYXlMaXN0LmpzXCI7XHJcbmltcG9ydCB7IEdyb3VwSGVscGVyIH0gZnJvbSBcIi4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL0dyb3VwLmpzXCI7XHJcbmltcG9ydCB7IFdlYlNvY2tldFJlcXVlc3RLZWVwQWxpdmUgfSBmcm9tIFwiLi4vY29tbXVuaWNhdGlvbi9EYXRhLmpzXCI7XHJcbmltcG9ydCB7IE1haW5FbWJlZGRlZCB9IGZyb20gXCIuLi9lbWJlZGRlZC9NYWluRW1iZWRkZWQuanNcIjtcclxuaW1wb3J0IHsgUHJvY2Vzc2luZ0hlbHBlciB9IGZyb20gXCIuLi9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9Qcm9jZXNzaW5nLmpzXCI7XHJcbmltcG9ydCB7IEdOR0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlciB9IGZyb20gXCIuLi9ydW50aW1lbGlicmFyeS9nbmcvR05HRXJlaWduaXNiZWhhbmRsdW5nLmpzXCI7XHJcbmltcG9ydCB7IEdhbWVwYWRUb29sIH0gZnJvbSBcIi4uL3Rvb2xzL0dhbWVwYWRUb29sLmpzXCI7XHJcbmltcG9ydCB7IENvbm5lY3Rpb25IZWxwZXIgfSBmcm9tIFwiLi4vcnVudGltZWxpYnJhcnkvZGF0YWJhc2UvQ29ubmVjdGlvbi5qc1wiO1xyXG5cclxuZXhwb3J0IGVudW0gSW50ZXJwcmV0ZXJTdGF0ZSB7XHJcbiAgICBub3RfaW5pdGlhbGl6ZWQsIHJ1bm5pbmcsIHBhdXNlZCwgZXJyb3IsIGRvbmUsIHdhaXRpbmdGb3JJbnB1dCwgd2FpdGluZ0ZvclRpbWVyc1RvRW5kXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIFByb2dyYW1TdGFja0VsZW1lbnQgPSB7XHJcbiAgICBwcm9ncmFtOiBQcm9ncmFtLFxyXG4gICAgcHJvZ3JhbVBvc2l0aW9uOiBudW1iZXIsICAvLyBuZXh0IHBvc2l0aW9uIHRvIGV4ZWN1dGUgYWZ0ZXIgcmV0dXJuXHJcbiAgICB0ZXh0UG9zaXRpb246IFRleHRQb3NpdGlvbiwgLy8gdGV4dHBvc2l0aW9uIG9mIG1ldGhvZCBjYWxsXHJcbiAgICBtZXRob2Q6IE1ldGhvZCB8IHN0cmluZyxcclxuICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IChpbnRlcnByZXRlcjogSW50ZXJwcmV0ZXIpID0+IHZvaWQsXHJcbiAgICBpc0NhbGxlZEZyb21PdXRzaWRlOiBzdHJpbmcsXHJcbiAgICBzdGFja0VsZW1lbnRzVG9QdXNoQmVmb3JlRmlyc3RFeGVjdXRpbmc/OiBWYWx1ZVtdXHJcbn07XHJcblxyXG5leHBvcnQgY2xhc3MgSW50ZXJwcmV0ZXIge1xyXG5cclxuICAgIGRlYnVnZ2VyOiBEZWJ1Z2dlcjtcclxuXHJcbiAgICBtYWluTW9kdWxlOiBNb2R1bGU7XHJcbiAgICBtb2R1bGVTdG9yZTogTW9kdWxlU3RvcmU7XHJcbiAgICBtb2R1bGVTdG9yZVZlcnNpb246IG51bWJlciA9IC0xMDA7XHJcblxyXG4gICAgcHJpbnRNYW5hZ2VyOiBQcmludE1hbmFnZXI7XHJcbiAgICBpbnB1dE1hbmFnZXI6IElucHV0TWFuYWdlcjtcclxuXHJcbiAgICBzdGVwc1BlclNlY29uZCA9IDI7XHJcbiAgICBtYXhTdGVwc1BlclNlY29uZCA9IDEwMDAwMDA7XHJcbiAgICB0aW1lckRlbGF5TXMgPSAxMDtcclxuXHJcbiAgICB0aW1lcklkOiBhbnk7XHJcbiAgICBzdGF0ZTogSW50ZXJwcmV0ZXJTdGF0ZTtcclxuXHJcbiAgICBjdXJyZW50UHJvZ3JhbTogUHJvZ3JhbTtcclxuICAgIGN1cnJlbnRQcm9ncmFtUG9zaXRpb246IG51bWJlcjtcclxuICAgIGN1cnJlbnRNZXRob2Q6IE1ldGhvZCB8IHN0cmluZztcclxuICAgIGN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuOiAoaW50ZXJwcmV0ZXI6IEludGVycHJldGVyKSA9PiB2b2lkO1xyXG4gICAgY3VycmVudElzQ2FsbGVkRnJvbU91dHNpZGU6IHN0cmluZ1xyXG5cclxuICAgIHByb2dyYW1TdGFjazogUHJvZ3JhbVN0YWNrRWxlbWVudFtdID0gW107XHJcblxyXG4gICAgc3RhY2s6IFZhbHVlW10gPSBbXTtcclxuICAgIHN0YWNrZnJhbWVzOiBudW1iZXJbXSA9IFtdO1xyXG4gICAgY3VycmVudFN0YWNrZnJhbWU6IG51bWJlcjtcclxuXHJcbiAgICBoZWFwOiBIZWFwID0ge307XHJcblxyXG4gICAgdGltZXJTdG9wcGVkOiBib29sZWFuID0gdHJ1ZTtcclxuICAgIHRpbWVyRXh0ZXJuOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgc3RlcHM6IG51bWJlciA9IDA7XHJcbiAgICB0aW1lTmV0dG86IG51bWJlciA9IDA7XHJcbiAgICB0aW1lV2hlblByb2dyYW1TdGFydGVkOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIHN0ZXBPdmVyTmVzdGluZ0xldmVsOiBudW1iZXIgPSAwO1xyXG4gICAgbGVhdmVMaW5lOiBudW1iZXIgPSAtMTtcclxuICAgIGFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgaXNGaXJzdFN0YXRlbWVudDogYm9vbGVhbiA9IHRydWU7XHJcblxyXG4gICAgc2hvd1Byb2dyYW1wb2ludGVyVXB0b1N0ZXBzUGVyU2Vjb25kID0gMTU7XHJcblxyXG4gICAgd29ybGRIZWxwZXI6IFdvcmxkSGVscGVyO1xyXG4gICAgZ25nRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyOiBHTkdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXI7XHJcbiAgICBwcm9jZXNzaW5nSGVscGVyOiBQcm9jZXNzaW5nSGVscGVyO1xyXG4gICAgZGF0YWJhc2VDb25uZWN0aW9uSGVscGVyczogQ29ubmVjdGlvbkhlbHBlcltdID0gW107XHJcblxyXG4gICAga2V5Ym9hcmRUb29sOiBLZXlib2FyZFRvb2w7XHJcbiAgICBnYW1lcGFkVG9vbDogR2FtZXBhZFRvb2w7XHJcblxyXG4gICAgd2ViU29ja2V0c1RvQ2xvc2VBZnRlclByb2dyYW1IYWx0OiBXZWJTb2NrZXRbXSA9IFtdO1xyXG5cclxuICAgIHBhdXNlVW50aWw/OiBudW1iZXI7XHJcblxyXG4gICAgYWN0aW9uczogc3RyaW5nW10gPSBbXCJzdGFydFwiLCBcInBhdXNlXCIsIFwic3RvcFwiLCBcInN0ZXBPdmVyXCIsXHJcbiAgICAgICAgXCJzdGVwSW50b1wiLCBcInN0ZXBPdXRcIiwgXCJyZXN0YXJ0XCJdO1xyXG5cclxuICAgIC8vIGJ1dHRvbkFjdGl2ZU1hdHJpeFtidXR0b25dW2ldIHRlbGxzIGlmIGJ1dHRvbiBpcyBhY3RpdmUgYXQgXHJcbiAgICAvLyBJbnRlcnByZXRlclN0YXRlIGlcclxuICAgIGJ1dHRvbkFjdGl2ZU1hdHJpeDogeyBbYnV0dG9uTmFtZTogc3RyaW5nXTogYm9vbGVhbltdIH0gPSB7XHJcbiAgICAgICAgXCJzdGFydFwiOiBbZmFsc2UsIGZhbHNlLCB0cnVlLCB0cnVlLCB0cnVlLCBmYWxzZV0sXHJcbiAgICAgICAgXCJwYXVzZVwiOiBbZmFsc2UsIHRydWUsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIGZhbHNlXSxcclxuICAgICAgICBcInN0b3BcIjogW2ZhbHNlLCB0cnVlLCB0cnVlLCBmYWxzZSwgZmFsc2UsIHRydWVdLFxyXG4gICAgICAgIFwic3RlcE92ZXJcIjogW2ZhbHNlLCBmYWxzZSwgdHJ1ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2VdLFxyXG4gICAgICAgIFwic3RlcEludG9cIjogW2ZhbHNlLCBmYWxzZSwgdHJ1ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2VdLFxyXG4gICAgICAgIFwic3RlcE91dFwiOiBbZmFsc2UsIGZhbHNlLCB0cnVlLCBmYWxzZSwgZmFsc2UsIGZhbHNlXSxcclxuICAgICAgICBcInJlc3RhcnRcIjogW2ZhbHNlLCB0cnVlLCB0cnVlLCB0cnVlLCB0cnVlLCB0cnVlXVxyXG4gICAgfVxyXG5cclxuICAgIGNhbGxiYWNrQWZ0ZXJFeGVjdXRpb246ICgpID0+IHZvaWQ7XHJcblxyXG4gICAgY29uc3RydWN0b3IocHVibGljIG1haW46IE1haW5CYXNlLCBwdWJsaWMgZGVidWdnZXJfOiBEZWJ1Z2dlciwgcHVibGljIGNvbnRyb2xCdXR0b25zOiBQcm9ncmFtQ29udHJvbEJ1dHRvbnMsXHJcbiAgICAgICAgJHJ1bkRpdjogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG4gICAgICAgIHRoaXMucHJpbnRNYW5hZ2VyID0gbmV3IFByaW50TWFuYWdlcigkcnVuRGl2LCB0aGlzLm1haW4pO1xyXG4gICAgICAgIHRoaXMuaW5wdXRNYW5hZ2VyID0gbmV3IElucHV0TWFuYWdlcigkcnVuRGl2LCB0aGlzLm1haW4pO1xyXG4gICAgICAgIGlmIChtYWluLmlzRW1iZWRkZWQoKSkge1xyXG4gICAgICAgICAgICB0aGlzLmtleWJvYXJkVG9vbCA9IG5ldyBLZXlib2FyZFRvb2woalF1ZXJ5KCdodG1sJyksIG1haW4pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMua2V5Ym9hcmRUb29sID0gbmV3IEtleWJvYXJkVG9vbChqUXVlcnkod2luZG93KSwgbWFpbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdhbWVwYWRUb29sID0gbmV3IEdhbWVwYWRUb29sKCk7XHJcblxyXG4gICAgICAgIHRoaXMuZGVidWdnZXIgPSBkZWJ1Z2dlcl87XHJcblxyXG4gICAgICAgIGNvbnRyb2xCdXR0b25zLnNldEludGVycHJldGVyKHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLnRpbWVXaGVuUHJvZ3JhbVN0YXJ0ZWQgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuICAgICAgICB0aGlzLnN0ZXBzID0gMDtcclxuICAgICAgICB0aGlzLnRpbWVOZXR0byA9IDA7XHJcbiAgICAgICAgdGhpcy50aW1lckV2ZW50cyA9IDA7XHJcblxyXG4gICAgICAgIHRoaXMudGltZXJEZWxheU1zID0gNztcclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICBsZXQgcGVyaW9kaWNGdW5jdGlvbiA9ICgpID0+IHtcclxuXHJcbiAgICAgICAgICAgIGlmICghdGhhdC50aW1lckV4dGVybikge1xyXG4gICAgICAgICAgICAgICAgdGhhdC50aW1lckZ1bmN0aW9uKHRoYXQudGltZXJEZWxheU1zLCBmYWxzZSwgMC43KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudGltZXJJZCA9IHNldEludGVydmFsKHBlcmlvZGljRnVuY3Rpb24sIHRoaXMudGltZXJEZWxheU1zKTtcclxuXHJcbiAgICAgICAgbGV0IGtlZXBBbGl2ZVJlcXVlc3Q6IFdlYlNvY2tldFJlcXVlc3RLZWVwQWxpdmUgPSB7IGNvbW1hbmQ6IDUgfTtcclxuICAgICAgICBsZXQgcmVxID0gSlNPTi5zdHJpbmdpZnkoa2VlcEFsaXZlUmVxdWVzdCk7XHJcbiAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGF0LndlYlNvY2tldHNUb0Nsb3NlQWZ0ZXJQcm9ncmFtSGFsdC5mb3JFYWNoKHdzID0+IHdzLnNlbmQocmVxKSk7XHJcbiAgICAgICAgfSwgMzAwMDApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpbml0R1VJKCkge1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIGxldCBhbSA9IHRoaXMubWFpbi5nZXRBY3Rpb25NYW5hZ2VyKCk7XHJcblxyXG4gICAgICAgIGxldCBzdGFydEZ1bmN0aW9uID0gKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGF0LnN0ZXBPdmVyTmVzdGluZ0xldmVsID0gMTAwMDAwMDtcclxuICAgICAgICAgICAgdGhhdC5zdGFydCgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCBwYXVzZUZ1bmN0aW9uID0gKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGF0LnBhdXNlKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgYW0ucmVnaXN0ZXJBY3Rpb24oXCJpbnRlcnByZXRlci5zdGFydFwiLCBbJ0Y0J10sXHJcbiAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChhbS5pc0FjdGl2ZShcImludGVycHJldGVyLnN0YXJ0XCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRGdW5jdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBwYXVzZUZ1bmN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9LCBcIlByb2dyYW1tIHN0YXJ0ZW5cIiwgdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uU3RhcnQpO1xyXG5cclxuICAgICAgICBhbS5yZWdpc3RlckFjdGlvbihcImludGVycHJldGVyLnBhdXNlXCIsIFsnRjQnXSxcclxuICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGFtLmlzQWN0aXZlKFwiaW50ZXJwcmV0ZXIuc3RhcnRcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFydEZ1bmN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhdXNlRnVuY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0sIFwiUGF1c2VcIiwgdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uUGF1c2UpO1xyXG5cclxuICAgICAgICBhbS5yZWdpc3RlckFjdGlvbihcImludGVycHJldGVyLnN0b3BcIiwgW10sXHJcbiAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoYXQuc3RvcChmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICB0aGF0LnN0ZXBzID0gMDtcclxuICAgICAgICAgICAgfSwgXCJQcm9ncmFtbSBhbmhhbHRlblwiLCB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25TdG9wKTtcclxuXHJcbiAgICAgICAgLy8gdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uRWRpdC5vbignY2xpY2snLCAoZSkgPT4ge1xyXG4gICAgICAgIC8vICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIC8vICAgICBhbS50cmlnZ2VyKCdpbnRlcnByZXRlci5zdG9wJyk7XHJcbiAgICAgICAgLy8gfSk7XHJcblxyXG4gICAgICAgIGFtLnJlZ2lzdGVyQWN0aW9uKFwiaW50ZXJwcmV0ZXIuc3RlcE92ZXJcIiwgWydGNiddLFxyXG4gICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uZVN0ZXAoZmFsc2UpO1xyXG4gICAgICAgICAgICB9LCBcIkVpbnplbHNjaHJpdHQgKFN0ZXAgb3ZlcilcIiwgdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uU3RlcE92ZXIpO1xyXG5cclxuICAgICAgICBhbS5yZWdpc3RlckFjdGlvbihcImludGVycHJldGVyLnN0ZXBJbnRvXCIsIFsnRjcnXSxcclxuICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbmVTdGVwKHRydWUpO1xyXG4gICAgICAgICAgICB9LCBcIkVpbnplbHNjaHJpdHQgKFN0ZXAgaW50bylcIiwgdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uU3RlcEludG8pO1xyXG5cclxuICAgICAgICBhbS5yZWdpc3RlckFjdGlvbihcImludGVycHJldGVyLnN0ZXBPdXRcIiwgW10sXHJcbiAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RlcE91dCgpO1xyXG4gICAgICAgICAgICB9LCBcIlN0ZXAgb3V0XCIsIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblN0ZXBPdXQpO1xyXG5cclxuICAgICAgICBhbS5yZWdpc3RlckFjdGlvbihcImludGVycHJldGVyLnJlc3RhcnRcIiwgW10sXHJcbiAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoYXQuc3RvcCh0cnVlKTtcclxuICAgICAgICAgICAgfSwgXCJOZXUgc3RhcnRlblwiLCB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25SZXN0YXJ0KTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLm5vdF9pbml0aWFsaXplZCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldFN0YXJ0YWJsZU1vZHVsZShtb2R1bGVTdG9yZTogTW9kdWxlU3RvcmUpOiBNb2R1bGUge1xyXG5cclxuICAgICAgICBsZXQgY2VtOiBNb2R1bGU7XHJcbiAgICAgICAgY2VtID0gdGhpcy5tYWluLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpO1xyXG5cclxuICAgICAgICBsZXQgY3VycmVudGx5RWRpdGVkTW9kdWxlSXNDbGFzc09ubHkgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgLy8gZGVjaWRlIHdoaWNoIG1vZHVsZSB0byBzdGFydFxyXG5cclxuICAgICAgICAvLyBmaXJzdCBhdHRlbXB0OiBpcyBjdXJyZW50bHkgZWRpdGVkIE1vZHVsZSBzdGFydGFibGU/XHJcbiAgICAgICAgaWYgKGNlbSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCBjdXJyZW50bHlFZGl0ZWRNb2R1bGUgPSBtb2R1bGVTdG9yZS5maW5kTW9kdWxlQnlGaWxlKGNlbS5maWxlKTtcclxuICAgICAgICAgICAgaWYgKGN1cnJlbnRseUVkaXRlZE1vZHVsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50bHlFZGl0ZWRNb2R1bGVJc0NsYXNzT25seSA9ICFjZW0uaGFzRXJyb3JzKClcclxuICAgICAgICAgICAgICAgICAgICAmJiAhY3VycmVudGx5RWRpdGVkTW9kdWxlLmlzU3RhcnRhYmxlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRseUVkaXRlZE1vZHVsZS5pc1N0YXJ0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50bHlFZGl0ZWRNb2R1bGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNlY29uZCBhdHRlbXB0OiB3aGljaCBtb2R1bGUgaGFzIGJlZW4gc3RhcnRlZCBsYXN0IHRpbWU/XHJcbiAgICAgICAgaWYgKHRoaXMubWFpbk1vZHVsZSAhPSBudWxsICYmIGN1cnJlbnRseUVkaXRlZE1vZHVsZUlzQ2xhc3NPbmx5KSB7XHJcbiAgICAgICAgICAgIGxldCBsYXN0TWFpbk1vZHVsZSA9IG1vZHVsZVN0b3JlLmZpbmRNb2R1bGVCeUZpbGUodGhpcy5tYWluTW9kdWxlLmZpbGUpO1xyXG4gICAgICAgICAgICBpZiAobGFzdE1haW5Nb2R1bGUgIT0gbnVsbCAmJiBsYXN0TWFpbk1vZHVsZS5pc1N0YXJ0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxhc3RNYWluTW9kdWxlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0aGlyZCBhdHRlbXB0OiBwaWNrIGZpcnN0IHN0YXJ0YWJsZSBtb2R1bGUgb2YgY3VycmVudCB3b3Jrc3BhY2VcclxuICAgICAgICBpZiAoY3VycmVudGx5RWRpdGVkTW9kdWxlSXNDbGFzc09ubHkpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgbSBvZiBtb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG0uaXNTdGFydGFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgICAgICBBZnRlciB1c2VyIGNsaWNrcyBzdGFydCBidXR0b24gKG9yIHN0ZXBvdmVyL3N0ZXBJbnRvLUJ1dHRvbiB3aGVuIG5vIHByb2dyYW0gaXMgcnVubmluZykgdGhpc1xyXG4gICAgICAgIG1ldGhvZCBpc3QgY2FsbGVkLlxyXG4gICAgKi9cclxuICAgIGluaXQoKSB7XHJcblxyXG4gICAgICAgIHRoaXMudGltZXJTdG9wcGVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgbGV0IGNlbSA9IHRoaXMubWFpbi5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKTtcclxuXHJcbiAgICAgICAgY2VtLmdldEJyZWFrcG9pbnRQb3NpdGlvbnNGcm9tRWRpdG9yKCk7XHJcblxyXG4gICAgICAgIHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKT8uY29uc29sZT8uY2xlYXJFeGNlcHRpb25zKCk7XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgICAgIEFzIGxvbmcgYXMgdGhlcmUgaXMgbm8gc3RhcnRhYmxlIG5ldyBWZXJzaW9uIG9mIGN1cnJlbnQgd29ya3NwYWNlIHdlIGtlZXAgY3VycmVudCBjb21waWxlZCBtb2R1bGVzIHNvXHJcbiAgICAgICAgICAgIHRoYXQgdmFyaWFibGVzIGFuZCBvYmplY3RzIGRlZmluZWQvaW5zdGFudGlhdGVkIHZpYSBjb25zb2xlIGNhbiBiZSBrZXB0LCB0b28uIFxyXG4gICAgICAgICovXHJcbiAgICAgICAgaWYgKHRoaXMubW9kdWxlU3RvcmVWZXJzaW9uICE9IHRoaXMubWFpbi52ZXJzaW9uICYmIHRoaXMubWFpbi5nZXRDb21waWxlcigpLmF0TGVhc3RPbmVNb2R1bGVJc1N0YXJ0YWJsZSkge1xyXG4gICAgICAgICAgICB0aGlzLm1haW4uY29weUV4ZWN1dGFibGVNb2R1bGVTdG9yZVRvSW50ZXJwcmV0ZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5oZWFwID0ge307IC8vIGNsZWFyIHZhcmlhYmxlcy9vYmplY3RzIGRlZmluZWQgdmlhIGNvbnNvbGVcclxuICAgICAgICAgICAgdGhpcy5tYWluLmdldEJvdHRvbURpdigpPy5jb25zb2xlPy5kZXRhY2hWYWx1ZXMoKTsgIC8vIGRldGFjaCB2YWx1ZXMgZnJvbSBjb25zb2xlIGVudHJpZXNcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBuZXdNYWluTW9kdWxlID0gdGhpcy5nZXRTdGFydGFibGVNb2R1bGUodGhpcy5tb2R1bGVTdG9yZSk7XHJcblxyXG4gICAgICAgIGlmIChuZXdNYWluTW9kdWxlID09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLm5vdF9pbml0aWFsaXplZCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFpbk1vZHVsZSA9IG5ld01haW5Nb2R1bGU7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IDA7XHJcblxyXG4gICAgICAgIHRoaXMucHJvZ3JhbVN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5zdGFjayA9IFtdO1xyXG4gICAgICAgIHRoaXMuc3RhY2tmcmFtZXMgPSBbXTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lID0gMDtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLmRvbmUpO1xyXG5cclxuICAgICAgICB0aGlzLmlzRmlyc3RTdGF0ZW1lbnQgPSB0cnVlO1xyXG5cclxuICAgICAgICB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsID0gMTAwMDAwMDtcclxuXHJcblxyXG4gICAgICAgIC8vIEluc3RhbnRpYXRlIGVudW0gdmFsdWUtb2JqZWN0czsgaW5pdGlhbGl6ZSBzdGF0aWMgYXR0cmlidXRlczsgY2FsbCBzdGF0aWMgY29uc3RydWN0b3JzXHJcblxyXG4gICAgICAgIHRoaXMucHJvZ3JhbVN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICBwcm9ncmFtOiB0aGlzLm1haW5Nb2R1bGUubWFpblByb2dyYW0sXHJcbiAgICAgICAgICAgIHByb2dyYW1Qb3NpdGlvbjogMCxcclxuICAgICAgICAgICAgdGV4dFBvc2l0aW9uOiB7IGxpbmU6IDEsIGNvbHVtbjogMSwgbGVuZ3RoOiAwIH0sXHJcbiAgICAgICAgICAgIG1ldGhvZDogXCJIYXVwdHByb2dyYW1tXCIsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IG51bGwsXHJcbiAgICAgICAgICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IFwiSGF1cHRwcm9ncmFtbVwiXHJcblxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGZvciAobGV0IG0gb2YgdGhpcy5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKSkge1xyXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVFbnVtcyhtKTtcclxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplQ2xhc3NlcyhtKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucG9wUHJvZ3JhbSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwb3BQcm9ncmFtKCkge1xyXG4gICAgICAgIGxldCBwID0gdGhpcy5wcm9ncmFtU3RhY2sucG9wKCk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHAucHJvZ3JhbTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSBwLnByb2dyYW1Qb3NpdGlvbjtcclxuICAgICAgICB0aGlzLmN1cnJlbnRNZXRob2QgPSBwLm1ldGhvZDtcclxuICAgICAgICB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuID0gcC5jYWxsYmFja0FmdGVyUmV0dXJuO1xyXG4gICAgICAgIHRoaXMuY3VycmVudElzQ2FsbGVkRnJvbU91dHNpZGUgPSBwLmlzQ2FsbGVkRnJvbU91dHNpZGU7XHJcbiAgICAgICAgaWYgKHAuc3RhY2tFbGVtZW50c1RvUHVzaEJlZm9yZUZpcnN0RXhlY3V0aW5nICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3RhY2tmcmFtZXMucHVzaCh0aGlzLmN1cnJlbnRTdGFja2ZyYW1lID09IG51bGwgPyAwIDogdGhpcy5jdXJyZW50U3RhY2tmcmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSB0aGlzLnN0YWNrLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IHNlIG9mIHAuc3RhY2tFbGVtZW50c1RvUHVzaEJlZm9yZUZpcnN0RXhlY3V0aW5nKSB0aGlzLnN0YWNrLnB1c2goc2UpO1xyXG4gICAgICAgICAgICBwLnN0YWNrRWxlbWVudHNUb1B1c2hCZWZvcmVGaXJzdEV4ZWN1dGluZyA9IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGluaXRpYWxpemVDbGFzc2VzKG06IE1vZHVsZSkge1xyXG5cclxuICAgICAgICBmb3IgKGxldCBrbGFzcyBvZiBtLnR5cGVTdG9yZS50eXBlTGlzdCkge1xyXG4gICAgICAgICAgICBpZiAoa2xhc3MgaW5zdGFuY2VvZiBLbGFzcykge1xyXG4gICAgICAgICAgICAgICAga2xhc3Muc3RhdGljQ2xhc3MuY2xhc3NPYmplY3QgPSBuZXcgUnVudGltZU9iamVjdChrbGFzcy5zdGF0aWNDbGFzcyk7XHJcbiAgICAgICAgICAgICAgICBrbGFzcy5wdXNoU3RhdGljSW5pdGlhbGl6YXRpb25Qcm9ncmFtcyh0aGlzLnByb2dyYW1TdGFjayk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrbGFzcyBpbnN0YW5jZW9mIEVudW0pIHtcclxuICAgICAgICAgICAgICAgIC8vIGxldCBzdGF0aWNWYWx1ZU1hcCA9IGtsYXNzLnN0YXRpY0NsYXNzLmNsYXNzT2JqZWN0LmF0dHJpYnV0ZVZhbHVlcy5nZXQoa2xhc3MuaWRlbnRpZmllcik7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGljVmFsdWVMaXN0ID0ga2xhc3Muc3RhdGljQ2xhc3MuY2xhc3NPYmplY3QuYXR0cmlidXRlcztcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGVudW1JbmZvIG9mIGtsYXNzLmVudW1JbmZvTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHN0YXRpY1ZhbHVlTWFwLmdldChlbnVtSW5mby5pZGVudGlmaWVyKS52YWx1ZSA9IGVudW1JbmZvLm9iamVjdDtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0aWNWYWx1ZUxpc3RbZW51bUluZm8ub3JkaW5hbF0udmFsdWUgPSBlbnVtSW5mby5vYmplY3Q7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGluaXRpYWxpemVFbnVtcyhtOiBNb2R1bGUpIHtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgZW51bUNsYXNzIG9mIG0udHlwZVN0b3JlLnR5cGVMaXN0KSB7XHJcbiAgICAgICAgICAgIGlmIChlbnVtQ2xhc3MgaW5zdGFuY2VvZiBFbnVtKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgZW51bUNsYXNzLnB1c2hTdGF0aWNJbml0aWFsaXphdGlvblByb2dyYW1zKHRoaXMucHJvZ3JhbVN0YWNrKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWVMaXN0OiBWYWx1ZVtdID0gW107XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlSW5pdGlhbGl6YXRpb25Qcm9ncmFtOiBQcm9ncmFtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZHVsZTogZW51bUNsYXNzLm1vZHVsZSxcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbE1hbmFnZXI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogW11cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGhhc0F0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbSA9IGVudW1DbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAwO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChoYXNBdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2dyYW1TdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbTogdmFsdWVJbml0aWFsaXphdGlvblByb2dyYW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW1Qb3NpdGlvbjogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dFBvc2l0aW9uOiB7IGxpbmU6IDEsIGNvbHVtbjogMSwgbGVuZ3RoOiAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogXCJBdHRyaWJ1dC1Jbml0aWFsaXNpZXJ1bmcgZGVyIEtsYXNzZSBcIiArIGVudW1DbGFzcy5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja0FmdGVyUmV0dXJuOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0NhbGxlZEZyb21PdXRzaWRlOiBcIkluaXRpYWxpc2llcnVuZyBlaW5lcyBFbnVtc1wiXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBlbnVtSW5mbyBvZiBlbnVtQ2xhc3MuZW51bUluZm9MaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW51bUluZm8ub2JqZWN0ID0gbmV3IEVudW1SdW50aW1lT2JqZWN0KGVudW1DbGFzcywgZW51bUluZm8pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZUxpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGVudW1DbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGVudW1JbmZvLm9iamVjdFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZW51bUluZm8uY29uc3RydWN0b3JDYWxsUHJvZ3JhbSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvZ3JhbVN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbTogZW51bUluZm8uY29uc3RydWN0b3JDYWxsUHJvZ3JhbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW1Qb3NpdGlvbjogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRQb3NpdGlvbjogeyBsaW5lOiAxLCBjb2x1bW46IDEsIGxlbmd0aDogMCB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBcIktvbnN0cnVrdG9yIHZvbiBcIiArIGVudW1DbGFzcy5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tBZnRlclJldHVybjogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IFwiSW5pdGlhbGlzaWVydW5nIGVpbmVzIEVudW1zXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0F0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZUluaXRpYWxpemF0aW9uUHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmluaXRpYWxpemVFbnVtVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogZW51bUluZm8ucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtQ2xhc3M6IGVudW1DbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlSWRlbnRpZmllcjogZW51bUluZm8uaWRlbnRpZmllclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGhhc0F0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlSW5pdGlhbGl6YXRpb25Qcm9ncmFtLnN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wcm9ncmFtRW5kLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogeyBsaW5lOiAwLCBjb2x1bW46IDAsIGxlbmd0aDogMSB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBlbnVtQ2xhc3MudmFsdWVMaXN0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG5ldyBBcnJheVR5cGUoZW51bUNsYXNzKSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVMaXN0XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICB0aW1lckV2ZW50czogbnVtYmVyID0gMDtcclxuICAgIHN0YXJ0KGNhbGxiYWNrPzogKCkgPT4gdm9pZCkge1xyXG5cclxuICAgICAgICB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCk/LmNvbnNvbGU/LmNsZWFyRXJyb3JzKCk7XHJcblxyXG4gICAgICAgIHRoaXMuY2FsbGJhY2tBZnRlckV4ZWN1dGlvbiA9IGNhbGxiYWNrO1xyXG5cclxuICAgICAgICB0aGlzLmlzRmlyc3RTdGF0ZW1lbnQgPSB0cnVlO1xyXG5cclxuICAgICAgICB0aGlzLnBhdXNlVW50aWwgPSBudWxsO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLmVycm9yIHx8IHRoaXMuc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5kb25lKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgICAgICAgICB0aGlzLnJlc2V0UnVudGltZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLnJ1bm5pbmcpO1xyXG5cclxuICAgICAgICB0aGlzLmhpZGVQcm9ncmFtcG9pbnRlclBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgIHRoaXMudGltZVdoZW5Qcm9ncmFtU3RhcnRlZCA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG4gICAgICAgIHRoaXMudGltZXJTdG9wcGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0VGltZXJDbGFzcygpLnN0YXJ0VGltZXIoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0VGltZXJDbGFzcygpOiBUaW1lckNsYXNzIHtcclxuICAgICAgICBsZXQgYmFzZU1vZHVsZSA9IHRoaXMubWFpbi5nZXRDdXJyZW50V29ya3NwYWNlKCkubW9kdWxlU3RvcmUuZ2V0TW9kdWxlKFwiQmFzZSBNb2R1bGVcIik7XHJcbiAgICAgICAgcmV0dXJuIDxUaW1lckNsYXNzPmJhc2VNb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJUaW1lclwiKTtcclxuICAgIH1cclxuXHJcbiAgICBsYXN0U3RlcFRpbWU6IG51bWJlciA9IDA7XHJcbiAgICBsYXN0VGltZUJldHdlZW5FdmVudHM6IG51bWJlciA9IDA7XHJcblxyXG4gICAgdGltZXJGdW5jdGlvbih0aW1lckRlbGF5TXM6IG51bWJlciwgZm9yY2VSdW46IGJvb2xlYW4sIG1heFdvcmtsb2FkRmFjdG9yOiBudW1iZXIpIHtcclxuXHJcbiAgICAgICAgbGV0IHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblxyXG4gICAgICAgIGlmICghZm9yY2VSdW4pIHtcclxuICAgICAgICAgICAgbGV0IHRpbWVCZXR3ZWVuU3RlcHMgPSAxMDAwIC8gdGhpcy5zdGVwc1BlclNlY29uZDtcclxuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJTdG9wcGVkIHx8IHQwIC0gdGhpcy5sYXN0U3RlcFRpbWUgPCB0aW1lQmV0d2VlblN0ZXBzKSByZXR1cm47XHJcbiAgICAgICAgICAgIHRoaXMubGFzdFN0ZXBUaW1lID0gdDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxhc3RUaW1lQmV0d2VlbkV2ZW50cyA9IHQwIC0gdGhpcy5sYXN0U3RlcFRpbWU7XHJcblxyXG4gICAgICAgIGxldCBuX3N0ZXBzUGVyVGltZXJHb2FsID0gZm9yY2VSdW4gPyBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUiA6IHRoaXMuc3RlcHNQZXJTZWNvbmQgKiB0aGlzLnRpbWVyRGVsYXlNcyAvIDEwMDA7XHJcblxyXG4gICAgICAgIHRoaXMudGltZXJFdmVudHMrKztcclxuXHJcbiAgICAgICAgbGV0IGV4Y2VwdGlvbjogc3RyaW5nO1xyXG4gICAgICAgIGxldCBpID0gMDtcclxuXHJcbiAgICAgICAgd2hpbGUgKGkgPCBuX3N0ZXBzUGVyVGltZXJHb2FsICYmICF0aGlzLnRpbWVyU3RvcHBlZCAmJiBleGNlcHRpb24gPT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAocGVyZm9ybWFuY2Uubm93KCkgLSB0MCkgLyB0aW1lckRlbGF5TXMgPCBtYXhXb3JrbG9hZEZhY3RvclxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBleGNlcHRpb24gPSB0aGlzLm5leHRTdGVwKCk7XHJcbiAgICAgICAgICAgIGlmIChleGNlcHRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnN0ZXBzUGVyU2Vjb25kIDw9IHRoaXMuc2hvd1Byb2dyYW1wb2ludGVyVXB0b1N0ZXBzUGVyU2Vjb25kICYmICFmb3JjZVJ1bikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93UHJvZ3JhbVBvaW50ZXJBbmRWYXJpYWJsZXMoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5lcnJvciB8fFxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLmRvbmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGltZXJTdG9wcGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsIDwgMCAmJiAhdGhpcy50aW1lclN0b3BwZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBub2RlID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbl07XHJcbiAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb24gPSBub2RlLnBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IG51bGwgfHwgcG9zaXRpb24ubGluZSAhPSB0aGlzLmxlYXZlTGluZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJTdG9wcGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUucGF1c2VkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29tZXNTdGF0ZW1lbnQoVG9rZW5UeXBlLmNsb3NlU3RhY2tmcmFtZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhjZXB0aW9uID0gdGhpcy5uZXh0U3RlcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhjZXB0aW9uID09IG51bGwgJiYgdGhpcy5jb21lc1N0YXRlbWVudChUb2tlblR5cGUucHJvZ3JhbUVuZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2VwdGlvbiA9IHRoaXMubmV4dFN0ZXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGkrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChleGNlcHRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnRocm93RXhjZXB0aW9uKGV4Y2VwdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy50aW1lclN0b3BwZWQpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5wYXVzZWQgfHwgdGhpcy5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLndhaXRpbmdGb3JJbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93UHJvZ3JhbVBvaW50ZXJBbmRWYXJpYWJsZXMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jYWxsYmFja0FmdGVyRXhlY3V0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBZnRlckV4ZWN1dGlvbigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFja0FmdGVyRXhlY3V0aW9uID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGR0ID0gcGVyZm9ybWFuY2Uubm93KCkgLSB0MDtcclxuICAgICAgICB0aGlzLnRpbWVOZXR0byArPSBkdDtcclxuXHJcbiAgICAgICAgLy8gaWYgKFxyXG4gICAgICAgIC8vICAgICB0aGlzLnRpbWVyRXZlbnRzICUgMzAwID09IDApIHtcclxuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coXCJMYXN0IHRpbWUgYmV0d2VlbiBFdmVudHM6IFwiICsgdGhpcy5sYXN0VGltZUJldHdlZW5FdmVudHMpO1xyXG4gICAgICAgIC8vIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHRocm93RXhjZXB0aW9uKGV4Y2VwdGlvbjogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy50aW1lclN0b3BwZWQgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5lcnJvcik7XHJcblxyXG4gICAgICAgIGxldCAkZXJyb3JEaXYgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb19leGNlcHRpb25cIj48L2Rpdj4nKTtcclxuXHJcbiAgICAgICAgbGV0IGNvbnNvbGVQcmVzZW50OiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBpZiAodGhpcy5tYWluLmlzRW1iZWRkZWQoKSkge1xyXG4gICAgICAgICAgICBsZXQgbWFpbkVtYmVkZGVkOiBNYWluRW1iZWRkZWQgPSA8TWFpbkVtYmVkZGVkPnRoaXMubWFpbjtcclxuICAgICAgICAgICAgbGV0IGNvbmZpZyA9IG1haW5FbWJlZGRlZC5jb25maWc7XHJcbiAgICAgICAgICAgIGlmIChjb25maWcud2l0aEJvdHRvbVBhbmVsICE9IHRydWUgJiYgY29uZmlnLndpdGhDb25zb2xlICE9IHRydWUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGVQcmVzZW50ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb25TdHJpbmcgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRTdGF0ZW1lbnQgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHNbdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uXTtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U3RhdGVtZW50ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdGV4dFBvc2l0aW9uID0gY3VycmVudFN0YXRlbWVudD8ucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25TdHJpbmcgPSBcIiBpbiBaZWlsZSBcIiArIHRleHRQb3NpdGlvbi5saW5lICsgXCIsIFNwYWx0ZSBcIiArIHRleHRQb3NpdGlvbi5jb2x1bW47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKT8uY29uc29sZT8uc2hvd0Vycm9yKHRoaXMuY3VycmVudFByb2dyYW0ubW9kdWxlLCB0ZXh0UG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGFsZXJ0KFwiRmVobGVyXCIgKyBwb3NpdGlvblN0cmluZyArIFwiOiBcIiArIGV4Y2VwdGlvbik7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY29uc29sZVByZXNlbnQpIHtcclxuICAgICAgICAgICAgJGVycm9yRGl2LmFwcGVuZChqUXVlcnkoXCI8c3BhbiBjbGFzcz0nam9fZXJyb3ItY2FwdGlvbic+RmVobGVyOjwvc3Bhbj4mbmJzcDtcIiArIGV4Y2VwdGlvbiArIFwiPGJyPlwiKSk7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaEN1cnJlbnRQcm9ncmFtKCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgZmlyc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5wcm9ncmFtU3RhY2subGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcCA9IHRoaXMucHJvZ3JhbVN0YWNrW2ldO1xyXG4gICAgICAgICAgICAgICAgbGV0IG0gPSAocC5tZXRob2QgaW5zdGFuY2VvZiBNZXRob2QpID8gcC5tZXRob2QuaWRlbnRpZmllciA6IHAubWV0aG9kO1xyXG4gICAgICAgICAgICAgICAgbGV0IHM6IHN0cmluZyA9IFwiPHNwYW4gY2xhc3M9J2pvX2Vycm9yLWNhcHRpb24nPlwiICsgKGZpcnN0ID8gXCJPcnRcIiA6IFwiYXVmZ2VydWZlbiB2b25cIikgKyBcIjogPC9zcGFuPlwiICsgbTtcclxuICAgICAgICAgICAgICAgIGlmIChwLnRleHRQb3NpdGlvbiAhPSBudWxsKSBzICs9IFwiIDxzcGFuIGNsYXNzPSdqb19ydW50aW1lRXJyb3JQb3NpdGlvbic+KFogXCIgKyBwLnRleHRQb3NpdGlvbi5saW5lICsgXCIsIFMgXCIgKyBwLnRleHRQb3NpdGlvbi5jb2x1bW4gKyBcIik8L3NwYW4+XCI7XHJcbiAgICAgICAgICAgICAgICBzICs9IFwiPGJyPlwiO1xyXG4gICAgICAgICAgICAgICAgbGV0IGVycm9yTGluZSA9IGpRdWVyeShzKTtcclxuICAgICAgICAgICAgICAgIGlmIChwLnRleHRQb3NpdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgICAgICAgICAgICAgIGpRdWVyeShlcnJvckxpbmVbMl0pLm9uKCdtb3VzZWRvd24nLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubWFpbi5nZXRCb3R0b21EaXYoKT8uY29uc29sZT8uc2hvd0Vycm9yKHAucHJvZ3JhbS5tb2R1bGUsIHAudGV4dFBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICRlcnJvckRpdi5hcHBlbmQoZXJyb3JMaW5lKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmaXJzdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHAuaXNDYWxsZWRGcm9tT3V0c2lkZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBjb25zb2xlID0gdGhpcy5tYWluLmdldEJvdHRvbURpdigpPy5jb25zb2xlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbnNvbGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53cml0ZUNvbnNvbGVFbnRyeSgkZXJyb3JEaXYsIG51bGwsICdyZ2JhKDI1NSwgMCwgMCwgMC40Jyk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLnNob3dUYWIoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGhpZGVQcm9ncmFtcG9pbnRlclBvc2l0aW9uKCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLnJ1bm5pbmcpIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnN0ZXBzUGVyU2Vjb25kID4gdGhpcy5zaG93UHJvZ3JhbXBvaW50ZXJVcHRvU3RlcHNQZXJTZWNvbmQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5oaWRlUHJvZ3JhbVBvaW50ZXJQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgY29tZXNTdGF0ZW1lbnQoc3RhdGVtZW50OiBUb2tlblR5cGUpIHtcclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50UHJvZ3JhbSA9PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA+IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggLSAxKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50c1t0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb25dLnR5cGUgPT0gc3RhdGVtZW50O1xyXG4gICAgfVxyXG5cclxuICAgIHJlc2V0UnVudGltZSgpIHtcclxuICAgICAgICB0aGlzLnByaW50TWFuYWdlci5jbGVhcigpO1xyXG4gICAgICAgIHRoaXMud29ybGRIZWxwZXI/LmRlc3Ryb3lXb3JsZCgpO1xyXG4gICAgICAgIHRoaXMucHJvY2Vzc2luZ0hlbHBlcj8uZGVzdHJveVdvcmxkKCk7XHJcbiAgICAgICAgdGhpcy5nbmdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXI/LmRldGFjaEV2ZW50cygpO1xyXG4gICAgICAgIHRoaXMuZ25nRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyID0gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc3RvcChyZXN0YXJ0OiBib29sZWFuID0gZmFsc2UpIHtcclxuICAgICAgICB0aGlzLmlucHV0TWFuYWdlci5oaWRlKCk7XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLnBhdXNlZCk7XHJcbiAgICAgICAgdGhpcy50aW1lclN0b3BwZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICBpZiAodGhpcy53b3JsZEhlbHBlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRIZWxwZXIuc3ByaXRlQW5pbWF0aW9ucyA9IFtdO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlcj8uZGV0YWNoRXZlbnRzKCk7XHJcbiAgICAgICAgdGhpcy5nbmdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXIgPSBudWxsO1xyXG5cclxuICAgICAgICB0aGlzLm1haW4uaGlkZVByb2dyYW1Qb2ludGVyUG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRUaW1lckNsYXNzKCkuc3RvcFRpbWVyKCk7XHJcbiAgICAgICAgaWYgKHRoaXMud29ybGRIZWxwZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLndvcmxkSGVscGVyLmNhY2hlQXNCaXRtYXAoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZGF0YWJhc2VDb25uZWN0aW9uSGVscGVycy5mb3JFYWNoKChjaCkgPT4gY2guY2xvc2UoKSk7XHJcbiAgICAgICAgdGhpcy5kYXRhYmFzZUNvbm5lY3Rpb25IZWxwZXJzID0gW107XHJcblxyXG4gICAgICAgIHRoaXMuaGVhcCA9IHt9O1xyXG4gICAgICAgIHRoaXMucHJvZ3JhbVN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5zdGFjayA9IFtdO1xyXG4gICAgICAgIHRoaXMuc3RhY2tmcmFtZXMgPSBbXTtcclxuXHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUuZG9uZSk7XHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5oaWRlUHJvZ3JhbVBvaW50ZXJQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICBpZiAocmVzdGFydCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgNTAwKTtcclxuICAgIH1cclxuXHJcbiAgICBwYXVzZSgpIHtcclxuICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUucGF1c2VkKTtcclxuICAgICAgICB0aGlzLnNob3dQcm9ncmFtUG9pbnRlckFuZFZhcmlhYmxlcygpO1xyXG4gICAgICAgIHRoaXMudGltZXJTdG9wcGVkID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBsYXN0UHJpbnRlZE1vZHVsZTogTW9kdWxlID0gbnVsbDtcclxuICAgIHNob3dQcm9ncmFtUG9pbnRlckFuZFZhcmlhYmxlcygpIHtcclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50UHJvZ3JhbSA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgbGV0IG5vZGUgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHNbdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uXTtcclxuICAgICAgICBpZiAobm9kZSA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gbm9kZS5wb3NpdGlvbjtcclxuICAgICAgICBpZiAocG9zaXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLm1haW4uc2hvd1Byb2dyYW1Qb2ludGVyUG9zaXRpb24odGhpcy5jdXJyZW50UHJvZ3JhbS5tb2R1bGUuZmlsZSwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICB0aGlzLmRlYnVnZ2VyLnNob3dEYXRhKHRoaXMuY3VycmVudFByb2dyYW0sIHBvc2l0aW9uLCB0aGlzLnN0YWNrLCB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lLCB0aGlzLmhlYXApO1xyXG4gICAgICAgICAgICBsZXQgYm90dG9tRGl2ID0gdGhpcy5tYWluLmdldEJvdHRvbURpdigpO1xyXG4gICAgICAgICAgICBpZiAoYm90dG9tRGl2LnByb2dyYW1QcmludGVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtLm1vZHVsZSAhPSB0aGlzLmxhc3RQcmludGVkTW9kdWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWluLmdldEJvdHRvbURpdigpLnByaW50TW9kdWxlVG9Cb3R0b21EaXYobnVsbCwgdGhpcy5jdXJyZW50UHJvZ3JhbS5tb2R1bGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdFByaW50ZWRNb2R1bGUgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLm1vZHVsZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKS5wcm9ncmFtUHJpbnRlci5zaG93Tm9kZShub2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGVwT3V0KCkge1xyXG4gICAgICAgIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSAwO1xyXG4gICAgICAgIHRoaXMuc3RhcnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBvbmVTdGVwKHN0ZXBJbnRvOiBib29sZWFuKSB7XHJcbiAgICAgICAgdGhpcy5tYWluLmdldEJvdHRvbURpdigpPy5jb25zb2xlPy5jbGVhckVycm9ycygpO1xyXG4gICAgICAgIHRoaXMuaXNGaXJzdFN0YXRlbWVudCA9IHRydWU7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT0gSW50ZXJwcmV0ZXJTdGF0ZS5wYXVzZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlID09IEludGVycHJldGVyU3RhdGUubm90X2luaXRpYWxpemVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5yZXNldFJ1bnRpbWUoKTtcclxuICAgICAgICAgICAgdGhpcy5zaG93UHJvZ3JhbVBvaW50ZXJBbmRWYXJpYWJsZXMoKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLnBhdXNlZCk7XHJcbiAgICAgICAgICAgIC8vIEFyZSB0aGVyZSBzdGF0aWMgVmFyaWFibGVzIHRvIGluaXRpYWxpemU/XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRNZXRob2QgPT0gXCJIYXVwdHByb2dyYW1tXCIpIHtcclxuICAgICAgICAgICAgICAgIC8vIE5vIHN0YXRpYyB2YXJpYWJsZSBpbml0aWFsaXplcnNcclxuICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSAxMDAwMDtcclxuICAgICAgICBsZXQgb2xkU3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsO1xyXG4gICAgICAgIGxldCBub2RlID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbl07XHJcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gbm9kZS5wb3NpdGlvbjtcclxuICAgICAgICBsZXQgZXhjZXB0aW9uID0gdGhpcy5uZXh0U3RlcCgpO1xyXG4gICAgICAgIGlmIChleGNlcHRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnRocm93RXhjZXB0aW9uKGV4Y2VwdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghc3RlcEludG8gJiYgdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCA+IG9sZFN0ZXBPdmVyTmVzdGluZ0xldmVsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSAwO1xyXG4gICAgICAgICAgICBpZiAocG9zaXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZWF2ZUxpbmUgPSBwb3NpdGlvbi5saW5lO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZWF2ZUxpbmUgPSAtMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnN0YXJ0KCk7XHJcbiAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLmRvbmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5oaWRlUHJvZ3JhbVBvaW50ZXJQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93UHJvZ3JhbVBvaW50ZXJBbmRWYXJpYWJsZXMoKTtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT0gSW50ZXJwcmV0ZXJTdGF0ZS53YWl0aW5nRm9ySW5wdXQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUucGF1c2VkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBzdGVwRmluaXNoZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBuZXh0U3RlcCgpOiBzdHJpbmcge1xyXG5cclxuICAgICAgICB0aGlzLnN0ZXBGaW5pc2hlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBsZXQgbm9kZTogU3RhdGVtZW50O1xyXG5cclxuICAgICAgICBsZXQgZXhjZXB0aW9uOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIHdoaWxlICghdGhpcy5zdGVwRmluaXNoZWQgJiYgIXRoaXMuYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWcgJiYgZXhjZXB0aW9uID09IG51bGwpIHtcclxuXHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuY3VycmVudFByb2dyYW0gPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgICAgICAgZGVidWdnZXI7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPiB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLmRvbmUpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG5vZGUgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHNbdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChub2RlLnN0ZXBGaW5pc2hlZCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0ZXBGaW5pc2hlZCA9IG5vZGUuc3RlcEZpbmlzaGVkO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBleGNlcHRpb24gPSB0aGlzLmV4ZWN1dGVOb2RlKG5vZGUpO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy5zdGVwcysrO1xyXG5cclxuICAgICAgICByZXR1cm4gZXhjZXB0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGVOb2RlKG5vZGU6IFN0YXRlbWVudCk6IHN0cmluZyB7XHJcblxyXG4gICAgICAgIGlmIChub2RlLmJyZWFrcG9pbnQgIT0gbnVsbCAmJiAhdGhpcy5pc0ZpcnN0U3RhdGVtZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWcgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLnBhdXNlKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuaXNGaXJzdFN0YXRlbWVudCA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBzdGFja1RvcCA9IHRoaXMuc3RhY2subGVuZ3RoIC0gMTtcclxuICAgICAgICBsZXQgc3RhY2tmcmFtZUJlZ2luID0gdGhpcy5jdXJyZW50U3RhY2tmcmFtZTtcclxuICAgICAgICBsZXQgc3RhY2sgPSB0aGlzLnN0YWNrO1xyXG4gICAgICAgIGxldCB2YWx1ZTogVmFsdWU7XHJcblxyXG4gICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmNhc3RWYWx1ZTpcclxuICAgICAgICAgICAgICAgIGxldCByZWxQb3MgPSBub2RlLnN0YWNrUG9zUmVsYXRpdmUgPT0gbnVsbCA/IDAgOiBub2RlLnN0YWNrUG9zUmVsYXRpdmU7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrW3N0YWNrVG9wICsgcmVsUG9zXTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNhc3RlZCA9IHZhbHVlLnR5cGUuY2FzdFRvKHZhbHVlLCBub2RlLm5ld1R5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXN0ZWQgPT0gdW5kZWZpbmVkKSBjYXN0ZWQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZS52YWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogbm9kZS5uZXdUeXBlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wICsgcmVsUG9zXSA9IGNhc3RlZDtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIubWVzc2FnZSkgcmV0dXJuIGVyci5tZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgcmV0dXJuIFwiQmVpIGRlbSBDYXN0ZW4gdm9uIFwiICsgdmFsdWUudHlwZS5pZGVudGlmaWVyICsgXCIgenUgXCIgKyBub2RlLm5ld1R5cGUuaWRlbnRpZmllciArIFwiIHRyYXQgZWluIEZlaGxlciBhdWY6IFwiICsgZXJyLm5hbWUgKyBcIi5cIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jaGVja0Nhc3Q6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrW3N0YWNrVG9wXTtcclxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS52YWx1ZSA9PSBudWxsKSBicmVhaztcclxuICAgICAgICAgICAgICAgIGxldCBydG8gPSA8UnVudGltZU9iamVjdD52YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLm5ld1R5cGUgaW5zdGFuY2VvZiBLbGFzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcnRvID09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFydG8uY2xhc3MuaGFzQW5jZXN0b3JPcklzKG5vZGUubmV3VHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXCJEYXMgT2JqZWt0IGRlciBLbGFzc2UgXCIgKyBydG8uY2xhc3MuaWRlbnRpZmllciArIFwiIGthbm4gbmljaHQgbmFjaCBcIiArIG5vZGUubmV3VHlwZS5pZGVudGlmaWVyICsgXCIgZ2VjYXN0ZXQgd2VyZGVuLlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcnRvID09IFwibnVtYmVyXCIgJiYgW1wiSW50ZWdlclwiLCBcIkRvdWJsZVwiLCBcIkZsb2F0XCJdLmluZGV4T2Yobm9kZS5uZXdUeXBlLmlkZW50aWZpZXIpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcIkVpbmUgWmFobCBrYW5uIG5pY2h0IG5hY2ggXCIgKyBub2RlLm5ld1R5cGUuaWRlbnRpZmllciArIFwiIGdlY2FzdGV0IHdlcmRlbi5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHJ0byA9PSBcInN0cmluZ1wiICYmIFtcIlN0cmluZ1wiLCBcIkNoYXJhY3RlclwiXS5pbmRleE9mKG5vZGUubmV3VHlwZS5pZGVudGlmaWVyKSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXCJFaW5lIFplaWNoZW5rZXR0ZSBrYW5uIG5pY2h0IG5hY2ggXCIgKyBub2RlLm5ld1R5cGUuaWRlbnRpZmllciArIFwiIGdlY2FzdGV0IHdlcmRlbi5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHJ0byA9PSBcImJvb2xlYW5cIiAmJiBub2RlLm5ld1R5cGUuaWRlbnRpZmllciAhPSBcIkJvb2xlYW5cIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcIkVpbiBib29sZXNjaGVyIFdlcnQga2FubiBuaWNodCBuYWNoIFwiICsgbm9kZS5uZXdUeXBlLmlkZW50aWZpZXIgKyBcIiBnZWNhc3RldCB3ZXJkZW4uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlLm5ld1R5cGUgaW5zdGFuY2VvZiBJbnRlcmZhY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISg8S2xhc3M+cnRvLmNsYXNzKS5pbXBsZW1lbnRzSW50ZXJmYWNlKG5vZGUubmV3VHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcIkRhcyBPYmpla3QgZGVyIEtsYXNzZSBcIiArIHJ0by5jbGFzcy5pZGVudGlmaWVyICsgXCIgaW1wbGVtZW50aWVydCBuaWNodCBkYXMgSW50ZXJmYWNlIFwiICsgbm9kZS5uZXdUeXBlLmlkZW50aWZpZXIgKyBcIi5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmxvY2FsVmFyaWFibGVEZWNsYXJhdGlvbjpcclxuICAgICAgICAgICAgICAgIGxldCB2YXJpYWJsZSA9IG5vZGUudmFyaWFibGU7XHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZSA9IHZhcmlhYmxlLnR5cGU7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBudWxsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUudmFsdWUgPSB0eXBlLmluaXRpYWxWYWx1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHN0YWNrW3ZhcmlhYmxlLnN0YWNrUG9zICsgc3RhY2tmcmFtZUJlZ2luXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUucHVzaE9uVG9wT2ZTdGFja0ZvckluaXRpYWxpemF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaExvY2FsVmFyaWFibGVUb1N0YWNrOlxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaChzdGFja1tub2RlLnN0YWNrcG9zT2ZWYXJpYWJsZSArIHN0YWNrZnJhbWVCZWdpbl0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnBvcEFuZFN0b3JlSW50b1ZhcmlhYmxlOlxyXG4gICAgICAgICAgICAgICAgc3RhY2tbbm9kZS5zdGFja3Bvc09mVmFyaWFibGUgKyBzdGFja2ZyYW1lQmVnaW5dID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaEF0dHJpYnV0ZTpcclxuICAgICAgICAgICAgICAgIGxldCBvYmplY3QxID0gbm9kZS51c2VUaGlzT2JqZWN0ID8gc3RhY2tbc3RhY2tmcmFtZUJlZ2luXS52YWx1ZSA6IHN0YWNrLnBvcCgpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdDEgPT0gbnVsbCkgcmV0dXJuIFwiWnVncmlmZiBhdWYgZWluIEF0dHJpYnV0IChcIiArIG5vZGUuYXR0cmlidXRlSWRlbnRpZmllciArIFwiKSBkZXMgbnVsbC1PYmpla3RzXCI7XHJcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWUxID0gKDxSdW50aW1lT2JqZWN0Pm9iamVjdDEpLmdldFZhbHVlKG5vZGUuYXR0cmlidXRlSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlMT8udXBkYXRlVmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlMS51cGRhdGVWYWx1ZSh2YWx1ZTEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZTEpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hBcnJheUxlbmd0aDpcclxuICAgICAgICAgICAgICAgIGxldCBhID0gc3RhY2sucG9wKCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoYSA9PSBudWxsKSByZXR1cm4gXCJadWdyaWZmIGF1ZiBkYXMgbGVuZ3RoLUF0dHJpYnV0IGRlcyBudWxsLU9iamVrdHNcIjtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeyB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCB2YWx1ZTogKDxhbnlbXT5hKS5sZW5ndGggfSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuYXNzaWdubWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlID0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoIShzdGFja1tzdGFja1RvcCAtIDFdLnR5cGUgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udHlwZSA9IHZhbHVlLnR5cGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGUubGVhdmVWYWx1ZU9uU3RhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wbHVzQXNzaWdubWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlICs9IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm1pbnVzQXNzaWdubWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlIC09IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm11bHRpcGxpY2F0aW9uQXNzaWdubWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlICo9IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmRpdmlzaW9uQXNzaWdubWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlIC89IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm1vZHVsb0Fzc2lnbm1lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSAlPSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5BTkRBc3NpZ21lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSAmPSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5PUkFzc2lnbWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlIHw9IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLlhPUkFzc2lnbWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlIF49IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnNoaWZ0TGVmdEFzc2lnbWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlIDw8PSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zaGlmdFJpZ2h0QXNzaWdtZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgPj49IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnNoaWZ0UmlnaHRVbnNpZ25lZEFzc2lnbWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlID4+Pj0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuYmluYXJ5T3A6XHJcbiAgICAgICAgICAgICAgICBsZXQgc2Vjb25kT3BlcmFuZCA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdFZhbHVlID1cclxuICAgICAgICAgICAgICAgICAgICBub2RlLmxlZnRUeXBlLmNvbXB1dGUobm9kZS5vcGVyYXRvciwgc3RhY2tbc3RhY2tUb3AgLSAxXSwgc2Vjb25kT3BlcmFuZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0VmFsdWUgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHRWYWx1ZS5tZXNzYWdlKSByZXR1cm4gcmVzdWx0VmFsdWUubWVzc2FnZTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlIFwiQmVpIGRlciBCZXJlY2hudW5nIHZvbiBcIiArIHN0YWNrW3N0YWNrVG9wIC0gMV0udHlwZS5pZGVudGlmaWVyICsgXCIgXCIgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBUb2tlblR5cGVSZWFkYWJsZVtub2RlLm9wZXJhdG9yXSArIFwiIFwiICsgc2Vjb25kT3BlcmFuZC50eXBlLmlkZW50aWZpZXIgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiB0cmF0IGVpbiBGZWhsZXIgKFwiICsgcmVzdWx0VmFsdWUubmFtZSArIFwiKSBhdWYuXCJcclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0VHlwZSA9IG5vZGUubGVmdFR5cGUuZ2V0UmVzdWx0VHlwZShub2RlLm9wZXJhdG9yLCBzZWNvbmRPcGVyYW5kLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiByZXN1bHRUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiByZXN1bHRWYWx1ZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS51bmFyeU9wOlxyXG4gICAgICAgICAgICAgICAgbGV0IG9sZFZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5vcGVyYXRvciA9PSBUb2tlblR5cGUubWludXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogb2xkVmFsdWUudHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IC1vbGRWYWx1ZS52YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBvbGRWYWx1ZS50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogIW9sZFZhbHVlLnZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wdXNoQ29uc3RhbnQ6XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbm9kZS52YWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBub2RlLmRhdGFUeXBlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wdXNoU3RhdGljQ2xhc3NPYmplY3Q6XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5rbGFzcyBpbnN0YW5jZW9mIEtsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vZGUua2xhc3Muc3RhdGljQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBub2RlLmtsYXNzLnN0YXRpY0NsYXNzLmNsYXNzT2JqZWN0XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgdG8gZW5hYmxlIGluc3RhbmNlb2Ygb3BlcmF0b3Igd2l0aCBpbnRlcmZhY2VzXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vZGUua2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBub2RlLmtsYXNzXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaFN0YXRpY0F0dHJpYnV0ZTpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gbm9kZS5rbGFzcy5jbGFzc09iamVjdC5nZXRWYWx1ZShub2RlLmF0dHJpYnV0ZUluZGV4KTtcclxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS51cGRhdGVWYWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUudXBkYXRlVmFsdWUodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgLy8gY2FzZSBUb2tlblR5cGUucHVzaFN0YXRpY0F0dHJpYnV0ZUludHJpbnNpYzpcclxuICAgICAgICAgICAgLy8gICAgIHZhbHVlID0gbm9kZS5cclxuICAgICAgICAgICAgLy8gICAgIHN0YWNrLnB1c2goeyB0eXBlOiBub2RlLmF0dHJpYnV0ZS50eXBlLCB2YWx1ZTogbm9kZS5hdHRyaWJ1dGUudXBkYXRlVmFsdWUobnVsbCkgfSk7XHJcbiAgICAgICAgICAgIC8vICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2VsZWN0QXJyYXlFbGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgYXJyYXkgPSBzdGFjay5wb3AoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYXJyYXkudmFsdWUgPT0gbnVsbCkgcmV0dXJuIFwiWnVncmlmZiBhdWYgZWluIEVsZW1lbnQgZWluZXMgbnVsbC1GZWxkZXNcIjtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXgudmFsdWUgPj0gYXJyYXkudmFsdWUubGVuZ3RoIHx8IGluZGV4LnZhbHVlIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlp1Z3JpZmYgYXVmIGRhcyBFbGVtZW50IG1pdCBJbmRleCBcIiArIGluZGV4LnZhbHVlICsgXCIgZWluZXMgRmVsZGVzIGRlciBMw6RuZ2UgXCIgKyBhcnJheS52YWx1ZS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKGFycmF5LnZhbHVlW2luZGV4LnZhbHVlXSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmNhbGxNYWluTWV0aG9kOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGFjay5wdXNoKHsgdmFsdWU6IG5vZGUuc3RhdGljQ2xhc3MuY2xhc3NPYmplY3QsIHR5cGU6IG5vZGUuc3RhdGljQ2xhc3MgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHBhcmFtZXRlcjogVmFsdWUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IFt7IHZhbHVlOiBcIlRlc3RcIiwgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSB9XSxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBuZXcgQXJyYXlUeXBlKHN0cmluZ1ByaW1pdGl2ZVR5cGUpXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgbGV0IHBhcmFtZXRlckJlZ2luMiA9IHN0YWNrVG9wICsgMjsgLy8gMSBwYXJhbWV0ZXJcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YWNrLnB1c2gocGFyYW1ldGVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YWNrZnJhbWVzLnB1c2godGhpcy5jdXJyZW50U3RhY2tmcmFtZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2dyYW1TdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBwcm9ncmFtOiB0aGlzLmN1cnJlbnRQcm9ncmFtLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb2dyYW1Qb3NpdGlvbjogdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uICsgMSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0UG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiB0aGlzLmN1cnJlbnRNZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tBZnRlclJldHVybjogdGhpcy5jdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybixcclxuICAgICAgICAgICAgICAgICAgICBpc0NhbGxlZEZyb21PdXRzaWRlOiBudWxsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSBwYXJhbWV0ZXJCZWdpbjI7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IG5vZGUubWV0aG9kLnByb2dyYW07XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRNZXRob2QgPSBub2RlLm1ldGhvZDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IC0xOyAvLyBnZXRzIGluY3JlYXNlZCBhZnRlciBzd2l0Y2ggc3RhdGVtZW50Li4uXHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLm1ldGhvZC5yZXNlcnZlU3RhY2tGb3JMb2NhbFZhcmlhYmxlczsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaChudWxsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsKys7XHJcblxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm1ha2VFbGxpcHNpc0FycmF5OlxyXG4gICAgICAgICAgICAgICAgbGV0IGVsbGlwc2lzQXJyYXk6IFZhbHVlW10gPSBzdGFjay5zcGxpY2Uoc3RhY2subGVuZ3RoIC0gbm9kZS5wYXJhbWV0ZXJDb3VudCwgbm9kZS5wYXJhbWV0ZXJDb3VudCk7XHJcblxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGVsbGlwc2lzQXJyYXksXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogbm9kZS5hcnJheVR5cGVcclxuICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmNhbGxNZXRob2Q6XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gbm9kZS5zdGFja2ZyYW1lYmVnaW4gPSAtKHBhcmFtZXRlcnMucGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSlcclxuICAgICAgICAgICAgICAgIGxldCBtZXRob2QgPSBub2RlLm1ldGhvZDtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVyQmVnaW4gPSBzdGFja1RvcCArIDEgKyBub2RlLnN0YWNrZnJhbWVCZWdpbjtcclxuICAgICAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzMSA9IG1ldGhvZC5wYXJhbWV0ZXJsaXN0LnBhcmFtZXRlcnM7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gcGFyYW1ldGVyQmVnaW4gKyAxOyBpIDw9IHN0YWNrVG9wOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGFja1tpXSAhPSBudWxsICYmIHRoaXMuc3RhY2tbaV0udHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2tbaV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBwYXJhbWV0ZXJzMVtpIC0gcGFyYW1ldGVyQmVnaW4gLSAxXS50eXBlLCAgLy8gY2FzdCB0byBwYXJhbWV0ZXIgdHlwZS4uLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHN0YWNrW2ldLnZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHN0YWNrW3BhcmFtZXRlckJlZ2luXS52YWx1ZSA9PSBudWxsICYmICFtZXRob2QuaXNTdGF0aWMpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJBdWZydWYgZGVyIE1ldGhvZGUgXCIgKyBtZXRob2QuaWRlbnRpZmllciArIFwiIGRlcyBudWxsLU9iamVrdHNcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWV0aG9kLmlzQWJzdHJhY3QgfHwgbWV0aG9kLmlzVmlydHVhbCAmJiAhbm9kZS5pc1N1cGVyQ2FsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBvYmplY3QgPSBzdGFja1twYXJhbWV0ZXJCZWdpbl07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9iamVjdC52YWx1ZSBpbnN0YW5jZW9mIFJ1bnRpbWVPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kID0gKDxLbGFzcz4oPFJ1bnRpbWVPYmplY3Q+b2JqZWN0LnZhbHVlKS5jbGFzcykuZ2V0TWV0aG9kQnlTaWduYXR1cmUobWV0aG9kLnNpZ25hdHVyZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kID0gKDxLbGFzcz5vYmplY3QudHlwZSkuZ2V0TWV0aG9kQnlTaWduYXR1cmUobWV0aG9kLnNpZ25hdHVyZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtZXRob2QgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IHJhaXNlIHJ1bnRpbWUgZXJyb3JcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWV0aG9kLmludm9rZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJ0ID0gbWV0aG9kLmdldFJldHVyblR5cGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHN0YWNrLnNwbGljZShwYXJhbWV0ZXJCZWdpbik7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJldHVyblZhbHVlID0gbWV0aG9kLmludm9rZShwYXJhbWV0ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiAocnQgIT0gbnVsbCAmJiBydC5pZGVudGlmaWVyICE9ICd2b2lkJyAmJiAoISAocnQgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSkgJiYgcmV0dXJuVmFsdWUgPT0gbnVsbCkgcnQgPSBudWxsVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocnQgIT0gbnVsbCAmJiBydC5pZGVudGlmaWVyICE9ICd2b2lkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiByZXR1cm5WYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHJ0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFja2ZyYW1lcy5wdXNoKHRoaXMuY3VycmVudFN0YWNrZnJhbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvZ3JhbVN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtOiB0aGlzLmN1cnJlbnRQcm9ncmFtLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtUG9zaXRpb246IHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiArIDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHRQb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiB0aGlzLmN1cnJlbnRNZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IG51bGxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybiA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9IHBhcmFtZXRlckJlZ2luO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gbWV0aG9kLnByb2dyYW07XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TWV0aG9kID0gbWV0aG9kO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IC0xOyAvLyBnZXRzIGluY3JlYXNlZCBhZnRlciBzd2l0Y2ggc3RhdGVtZW50Li4uXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWV0aG9kLnJlc2VydmVTdGFja0ZvckxvY2FsVmFyaWFibGVzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaChudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwrKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jYWxsSW5wdXRNZXRob2Q6XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gbm9kZS5zdGFja2ZyYW1lYmVnaW4gPSAtKHBhcmFtZXRlcnMucGFyYW1ldGVyVHlwZXMubGVuZ3RoICsgMSlcclxuICAgICAgICAgICAgICAgIGxldCBtZXRob2QxID0gbm9kZS5tZXRob2Q7XHJcbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVyQmVnaW4xID0gc3RhY2tUb3AgKyAxICsgbm9kZS5zdGFja2ZyYW1lQmVnaW47XHJcbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHN0YWNrLnNwbGljZShwYXJhbWV0ZXJCZWdpbjEpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucGF1c2VGb3JJbnB1dCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5wdXRNYW5hZ2VyLnJlYWRJbnB1dChtZXRob2QxLCBwYXJhbWV0ZXJzLCAodmFsdWU6IFZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5yZXN1bWVBZnRlcklucHV0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5yZXR1cm46XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVybihub2RlLCBzdGFjayk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZGVjcmVhc2VTdGFja3BvaW50ZXI6XHJcbiAgICAgICAgICAgICAgICBzdGFjay5zcGxpY2Uoc3RhY2tUb3AgKyAxIC0gbm9kZS5wb3BDb3VudCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuaW5pdFN0YWNrZnJhbWU6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YWNrZnJhbWVzLnB1c2godGhpcy5jdXJyZW50U3RhY2tmcmFtZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lID0gc3RhY2tUb3AgKyAxO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLnJlc2VydmVGb3JMb2NhbFZhcmlhYmxlczsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaChudWxsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5jbG9zZVN0YWNrZnJhbWU6XHJcbiAgICAgICAgICAgICAgICBzdGFjay5zcGxpY2Uoc3RhY2tmcmFtZUJlZ2luKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSB0aGlzLnN0YWNrZnJhbWVzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5ld09iamVjdDpcclxuICAgICAgICAgICAgICAgIGxldCBvYmplY3QgPSBuZXcgUnVudGltZU9iamVjdChub2RlLmNsYXNzKTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogb2JqZWN0LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vZGUuY2xhc3NcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5zdWJzZXF1ZW50Q29uc3RydWN0b3JDYWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tUb3ArKztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQga2xhc3M6IEtsYXNzID0gbm9kZS5jbGFzcztcclxuXHJcbiAgICAgICAgICAgICAgICB3aGlsZSAoa2xhc3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhaXAgPSBrbGFzcy5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFpcC5zdGF0ZW1lbnRzLmxlbmd0aCA+IDApIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhY2tmcmFtZXMucHVzaCh0aGlzLmN1cnJlbnRTdGFja2ZyYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtOiB0aGlzLmN1cnJlbnRQcm9ncmFtLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbVBvc2l0aW9uOiB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gKyAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dFBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiB0aGlzLmN1cnJlbnRNZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja0FmdGVyUmV0dXJuOiB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDYWxsZWRGcm9tT3V0c2lkZTogbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lID0gc3RhY2tUb3AgKyAxO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IGFpcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE1ldGhvZCA9IFwiS29uc3RydWt0b3Igdm9uIFwiICsga2xhc3MuaWRlbnRpZmllcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCsrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBrbGFzcyA9IGtsYXNzLmJhc2VDbGFzcztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBOLkIuOiBjb25zdHJ1Y3RvciBjYWxsIGlzIG5leHQgc3RhdGVtZW50XHJcblxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnByb2Nlc3NQb3N0Q29uc3RydWN0b3JDYWxsYmFja3M6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrW3N0YWNrVG9wXTtcclxuICAgICAgICAgICAgICAgIGxldCBjbGFzc1R5cGUgPSA8S2xhc3M+dmFsdWUudHlwZTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHBjYyBvZiBjbGFzc1R5cGUuZ2V0UG9zdENvbnN0cnVjdG9yQ2FsbGJhY2tzKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBwY2ModmFsdWUudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmV4dGVuZGVkRm9yTG9vcEluaXQ6XHJcbiAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZDb3VudGVyICsgc3RhY2tmcmFtZUJlZ2luXSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZXh0ZW5kZWRGb3JMb29wQ2hlY2tDb3VudGVyQW5kR2V0RWxlbWVudDpcclxuICAgICAgICAgICAgICAgIGxldCBjb3VudGVyOiBudW1iZXIgPSBzdGFja1tub2RlLnN0YWNrUG9zT2ZDb3VudGVyICsgc3RhY2tmcmFtZUJlZ2luXS52YWx1ZSsrO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbGxlY3Rpb24gPSBzdGFja1tub2RlLnN0YWNrUG9zT2ZDb2xsZWN0aW9uICsgc3RhY2tmcmFtZUJlZ2luXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhcnJheVwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY291bnRlciA8ICg8YW55W10+Y29sbGVjdGlvbikubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZFbGVtZW50ICsgc3RhY2tmcmFtZUJlZ2luXS52YWx1ZSA9ICg8YW55W10+Y29sbGVjdGlvbilbY291bnRlcl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZFbGVtZW50ICsgc3RhY2tmcmFtZUJlZ2luXS50eXBlID0gKDxhbnlbXT5jb2xsZWN0aW9uKVtjb3VudGVyXS50eXBlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImludGVybmFsTGlzdFwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGlzdDogYW55W10gPSAoPExpc3RIZWxwZXI+KDxSdW50aW1lT2JqZWN0PmNvbGxlY3Rpb24pLmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdKS52YWx1ZUFycmF5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY291bnRlciA8IGxpc3QubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZFbGVtZW50ICsgc3RhY2tmcmFtZUJlZ2luXS52YWx1ZSA9IGxpc3RbY291bnRlcl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZFbGVtZW50ICsgc3RhY2tmcmFtZUJlZ2luXS50eXBlID0gbGlzdFtjb3VudGVyXS50eXBlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdyb3VwXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsaXN0MTogYW55W10gPSAoPEdyb3VwSGVscGVyPig8UnVudGltZU9iamVjdD5jb2xsZWN0aW9uKS5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl0pLnNoYXBlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvdW50ZXIgPCBsaXN0MS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrW25vZGUuc3RhY2tQb3NPZkVsZW1lbnQgKyBzdGFja2ZyYW1lQmVnaW5dLnZhbHVlID0gbGlzdDFbY291bnRlcl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrUG9zT2ZFbGVtZW50ICsgc3RhY2tmcmFtZUJlZ2luXS50eXBlID0gbGlzdDFbY291bnRlcl0ua2xhc3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSBub2RlLmRlc3RpbmF0aW9uIC0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5pbmNyZW1lbnREZWNyZW1lbnRCZWZvcmU6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrW3N0YWNrVG9wXTtcclxuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlICs9IG5vZGUuaW5jcmVtZW50RGVjcmVtZW50Qnk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuaW5jcmVtZW50RGVjcmVtZW50QWZ0ZXI6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrW3N0YWNrVG9wXTtcclxuICAgICAgICAgICAgICAgIC8vIHJlcGxhY2UgdmFsdWUgYnkgY29weTpcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wXSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUudmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdmFsdWUudHlwZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIC8vIGluY3JlbWVudCB2YWx1ZSB3aGljaCBpcyBub3QgaW52b2x2ZWQgaW4gc3Vic2VxdWVudCBcclxuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlICs9IG5vZGUuaW5jcmVtZW50RGVjcmVtZW50Qnk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuanVtcEFsd2F5czpcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IG5vZGUuZGVzdGluYXRpb24gLSAxO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmp1bXBJZlRydWU6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKDxib29sZWFuPnZhbHVlLnZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuanVtcElmRmFsc2U6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCEoPGJvb2xlYW4+dmFsdWUudmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuanVtcElmVHJ1ZUFuZExlYXZlT25TdGFjazpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2tbc3RhY2tUb3BdO1xyXG4gICAgICAgICAgICAgICAgaWYgKDxib29sZWFuPnZhbHVlLnZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuanVtcElmRmFsc2VBbmRMZWF2ZU9uU3RhY2s6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrW3N0YWNrVG9wXTtcclxuICAgICAgICAgICAgICAgIGlmICghKDxib29sZWFuPnZhbHVlLnZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IG5vZGUuZGVzdGluYXRpb24gLSAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5vT3A6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHJvZ3JhbUVuZDpcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wcm9ncmFtU3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wUHJvZ3JhbSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbi0tOyAvLyBnZXRzIGluY3JlYXNlZCBsYXRlciBvbiBhZnRlciBzd2l0Y2ggZW5kc1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGVhdmVMaW5lID0gLTE7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnBhdXNlQWZ0ZXJQcm9ncmFtRW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICgodGhpcy53b3JsZEhlbHBlciAhPSBudWxsICYmIHRoaXMud29ybGRIZWxwZXIuaGFzQWN0b3JzKCkpIHx8IHRoaXMucHJvY2Vzc2luZ0hlbHBlciAhPSBudWxsXHJcbiAgICAgICAgICAgICAgICAgICAgfHwgKHRoaXMuZ25nRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyICE9IG51bGwgJiYgdGhpcy5nbmdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXIuaGFzQWt0aW9uc0VtcGZhZW5nZXIoKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24tLTtcclxuICAgICAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBiYXNlTW9kdWxlID0gdGhpcy5tYWluLmdldEN1cnJlbnRXb3Jrc3BhY2UoKS5tb2R1bGVTdG9yZS5nZXRNb2R1bGUoXCJCYXNlIE1vZHVsZVwiKTtcclxuICAgICAgICAgICAgICAgIGxldCB0aW1lckNsYXNzOiBUaW1lckNsYXNzID0gPFRpbWVyQ2xhc3M+YmFzZU1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlRpbWVyXCIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRpbWVyQ2xhc3MudGltZXJFbnRyaWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24tLTtcclxuICAgICAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5kb25lKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gLTE7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBIZWxwZXIuc2hvd0hlbHBlcihcInNwZWVkQ29udHJvbEhlbHBlclwiLCB0aGlzLm1haW4pO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHJpbnRNYW5hZ2VyLnNob3dQcm9ncmFtRW5kKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RlcHMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGR0ID0gcGVyZm9ybWFuY2Uubm93KCkgLSB0aGlzLnRpbWVXaGVuUHJvZ3JhbVN0YXJ0ZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSAnRXhlY3V0ZWQgJyArIHRoaXMuc3RlcHMgKyAnIHN0ZXBzIGluICcgKyB0aGlzLnJvdW5kKGR0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICArICcgbXMgKCcgKyB0aGlzLnJvdW5kKHRoaXMuc3RlcHMgLyBkdCAqIDEwMDApICsgJyBzdGVwcy9zKSc7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWluLmdldEJvdHRvbURpdigpPy5jb25zb2xlPy53cml0ZUNvbnNvbGVFbnRyeShtZXNzYWdlLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLnRpbWVyRXZlbnRzICsgXCIgVGltZUV2ZW50cyBpbiBcIiArIGR0ICsgXCIgbXMgZXJnaWJ0IGVpbiBFdmVudCBhbGxlIFwiICsgZHQvdGhpcy50aW1lckV2ZW50cyArIFwiIG1zLlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlZvcmdlZ2ViZW5lIFRpbWVyZnJlcXVlbno6IEFsbGUgXCIgKyB0aGlzLnRpbWVyRGVsYXlNcyArIFwiIG1zXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RlcHMgPSAtMTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBpZiAodGhpcy53b3JsZEhlbHBlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy53b3JsZEhlbHBlci5zcHJpdGVBbmltYXRpb25zID0gW107XHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlcj8uZGV0YWNoRXZlbnRzKCk7XHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlciA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5tYWluLmhpZGVQcm9ncmFtUG9pbnRlclBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gaWYodGhpcy53b3JsZEhlbHBlciAhPSBudWxsKXtcclxuICAgICAgICAgICAgICAgIC8vICAgICB0aGlzLndvcmxkSGVscGVyLmNhY2hlQXNCaXRtYXAoKTtcclxuICAgICAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24tLTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RvcCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnByaW50OlxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wcmludGxuOlxyXG4gICAgICAgICAgICAgICAgbGV0IHRleHQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbG9yID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLndpdGhDb2xvcikgY29sb3IgPSA8c3RyaW5nIHwgbnVtYmVyPnN0YWNrLnBvcCgpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFub2RlLmVtcHR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dCA9IDxzdHJpbmc+c3RhY2sucG9wKCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRleHQgPT0gbnVsbCkgdGV4dCA9IFwibnVsbFwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBUb2tlblR5cGUucHJpbnRsbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRNYW5hZ2VyLnByaW50bG4odGV4dCwgY29sb3IpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50TWFuYWdlci5wcmludCh0ZXh0LCBjb2xvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaEVtcHR5QXJyYXk6XHJcbiAgICAgICAgICAgICAgICBsZXQgY291bnRzOiBudW1iZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmRpbWVuc2lvbjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY291bnRzLnB1c2goPG51bWJlcj5zdGFjay5wb3AoKS52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHRoaXMubWFrZUVtcHR5QXJyYXkoY291bnRzLCBub2RlLmFycmF5VHlwZSkpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmJlZ2luQXJyYXk6XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBub2RlLmFycmF5VHlwZSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogW11cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmFkZFRvQXJyYXk6XHJcbiAgICAgICAgICAgICAgICBzdGFja1RvcCAtPSBub2RlLm51bWJlck9mRWxlbWVudHNUb0FkZDtcclxuICAgICAgICAgICAgICAgIC8vIGxldCB2YWx1ZXM6IFZhbHVlW10gPSBzdGFjay5zcGxpY2Uoc3RhY2tUb3AgKyAxLCBub2RlLm51bWJlck9mRWxlbWVudHNUb0FkZCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWVzOiBWYWx1ZVtdID0gc3RhY2suc3BsaWNlKHN0YWNrVG9wICsgMSwgbm9kZS5udW1iZXJPZkVsZW1lbnRzVG9BZGQpLm1hcCh0dm8gPT4gKHsgdHlwZTogdHZvLnR5cGUsIHZhbHVlOiB0dm8udmFsdWUgfSkpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3BdLnZhbHVlID0gKDxhbnlbXT5zdGFja1tzdGFja1RvcF0udmFsdWUpLmNvbmNhdCh2YWx1ZXMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hFbnVtVmFsdWU6XHJcbiAgICAgICAgICAgICAgICBsZXQgZW51bUluZm8gPSBub2RlLmVudW1DbGFzcy5pZGVudGlmaWVyVG9JbmZvTWFwW25vZGUudmFsdWVJZGVudGlmaWVyXTtcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2gobm9kZS5lbnVtQ2xhc3MudmFsdWVMaXN0LnZhbHVlW2VudW1JbmZvLm9yZGluYWxdKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5rZXl3b3JkU3dpdGNoOlxyXG4gICAgICAgICAgICAgICAgbGV0IHN3aXRjaFZhbHVlID0gc3RhY2sucG9wKCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGVzdGluYXRpb24gPSBub2RlLmRlc3RpbmF0aW9uTWFwW3N3aXRjaFZhbHVlXTtcclxuICAgICAgICAgICAgICAgIGlmIChkZXN0aW5hdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gZGVzdGluYXRpb24gLSAxOyAvLyBpdCB3aWxsIGJlIGluY3JlYXNlZCBhZnRlciB0aGlzIHN3aXRjaC1zdGF0ZW1lbnQhXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmRlZmF1bHREZXN0aW5hdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IG5vZGUuZGVmYXVsdERlc3RpbmF0aW9uIC0gMTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlcmUncyBhIGp1bXBub2RlIGFmdGVyIHRoaXMgbm9kZSB3aGljaCBqdW1wcyByaWdodCBhZnRlciBsYXN0IHN3aXRjaCBjYXNlLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNvIHRoZXJlJ3Mgbm90aGluZyBtb3JlIHRvIGRvIGhlcmUuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuaGVhcFZhcmlhYmxlRGVjbGFyYXRpb246XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHYgPSBub2RlLnZhcmlhYmxlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oZWFwW3YuaWRlbnRpZmllcl0gPSB2O1xyXG4gICAgICAgICAgICAgICAgdi52YWx1ZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB2LnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICh2LnR5cGUgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSA/IHYudHlwZS5pbml0aWFsVmFsdWUgOiBudWxsXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5wdXNoT25Ub3BPZlN0YWNrRm9ySW5pdGlhbGl6YXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YWNrLnB1c2godi52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hGcm9tSGVhcFRvU3RhY2s6XHJcbiAgICAgICAgICAgICAgICBsZXQgdjEgPSB0aGlzLmhlYXBbbm9kZS5pZGVudGlmaWVyXTtcclxuICAgICAgICAgICAgICAgIGlmICh2MSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFjay5wdXNoKHYxLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiRGllIFZhcmlhYmxlIFwiICsgbm9kZS5pZGVudGlmaWVyICsgXCIgaXN0IG5pY2h0IGJla2FubnQuXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucmV0dXJuSWZEZXN0cm95ZWQ6XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGVSdW50aW1lT2JqZWN0OiBSdW50aW1lT2JqZWN0ID0gdGhpcy5zdGFja1tzdGFja2ZyYW1lQmVnaW5dLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNoYXBlUnVudGltZU9iamVjdCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoYXBlID0gc2hhcGVSdW50aW1lT2JqZWN0LmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2hhcGVbXCJpc0Rlc3Ryb3llZFwiXSA9PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuKG51bGwsIHN0YWNrKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2V0UGF1c2VEdXJhdGlvbjpcclxuICAgICAgICAgICAgICAgIGxldCBkdXJhdGlvbiA9IHRoaXMuc3RhY2sucG9wKCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wYXVzZVVudGlsID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhdXNlVW50aWwgPSBwZXJmb3JtYW5jZS5ub3coKSArIGR1cmF0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnBhdXNlOlxyXG4gICAgICAgICAgICAgICAgbm9kZS5zdGVwRmluaXNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucGF1c2VVbnRpbCAhPSBudWxsICYmIHBlcmZvcm1hbmNlLm5vdygpIDwgdGhpcy5wYXVzZVVudGlsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uLS07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGF1c2VVbnRpbCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uKys7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG9sZFN0YXRlOiBJbnRlcnByZXRlclN0YXRlO1xyXG4gICAgcGF1c2VGb3JJbnB1dCgpIHtcclxuICAgICAgICB0aGlzLnRpbWVyU3RvcHBlZCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5vbGRTdGF0ZSA9IHRoaXMuc3RhdGU7XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLndhaXRpbmdGb3JJbnB1dCk7XHJcbiAgICAgICAgdGhpcy5zaG93UHJvZ3JhbVBvaW50ZXJBbmRWYXJpYWJsZXMoKTtcclxuICAgIH1cclxuXHJcbiAgICByZXN1bWVBZnRlcklucHV0KHZhbHVlOiBWYWx1ZSwgcG9wUHJpb3JWYWx1ZTogYm9vbGVhbiA9IGZhbHNlKSB7XHJcbiAgICAgICAgaWYgKHBvcFByaW9yVmFsdWUpIHRoaXMuc3RhY2sucG9wKCk7XHJcbiAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHRoaXMuc3RhY2sucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgdGhpcy5tYWluLmhpZGVQcm9ncmFtUG9pbnRlclBvc2l0aW9uKCk7XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLnBhdXNlZCk7XHJcbiAgICAgICAgaWYgKHRoaXMub2xkU3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5ydW5uaW5nKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhcnQoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNob3dQcm9ncmFtUG9pbnRlckFuZFZhcmlhYmxlcygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHJldHVybihub2RlOiBSZXR1cm5TdGF0ZW1lbnQgfCBudWxsLCBzdGFjazogVmFsdWVbXSkge1xyXG5cclxuICAgICAgICBsZXQgY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4gPSB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAobm9kZSAhPSBudWxsICYmIG5vZGUuY29weVJldHVyblZhbHVlVG9TdGFja2ZyYW1lUG9zMCkge1xyXG4gICAgICAgICAgICBsZXQgcmV0dXJuVmFsdWU6IFZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgIHN0YWNrW3RoaXMuY3VycmVudFN0YWNrZnJhbWVdID0gcmV0dXJuVmFsdWU7XHJcbiAgICAgICAgICAgIHN0YWNrLnNwbGljZSh0aGlzLmN1cnJlbnRTdGFja2ZyYW1lICsgMSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc3RhY2suc3BsaWNlKHRoaXMuY3VycmVudFN0YWNrZnJhbWUgKyAoKG5vZGUgIT0gbnVsbCAmJiBub2RlLmxlYXZlVGhpc09iamVjdE9uU3RhY2spID8gMSA6IDApKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSB0aGlzLnN0YWNrZnJhbWVzLnBvcCgpO1xyXG5cclxuICAgICAgICB0aGlzLnBvcFByb2dyYW0oKTtcclxuICAgICAgICBpZiAobm9kZSAhPSBudWxsICYmIG5vZGUubWV0aG9kV2FzSW5qZWN0ZWQgPT0gdHJ1ZSkgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uKys7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uLS07ICAvLyBwb3NpdGlvbiBnZXRzIGluY3JlYXNlZCBieSBvbmUgYXQgdGhlIGVuZCBvZiB0aGlzIHN3aXRjaC1zdGF0ZW1lbnQsIHNvIC4uLiAtIDFcclxuICAgICAgICB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsLS07XHJcblxyXG4gICAgICAgIGlmIChjdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPCAwICYmIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50c1t0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gKyAxXS50eXBlID09IFRva2VuVHlwZS5qdW1wQWx3YXlzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RlcEZpbmlzaGVkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgbWFrZUVtcHR5QXJyYXkoY291bnRzOiBudW1iZXJbXSwgdHlwZTogVHlwZSk6IFZhbHVlIHtcclxuICAgICAgICBsZXQgdHlwZTEgPSAoPEFycmF5VHlwZT50eXBlKS5hcnJheU9mVHlwZTtcclxuICAgICAgICBpZiAoY291bnRzLmxlbmd0aCA9PSAxKSB7XHJcbiAgICAgICAgICAgIGxldCBhcnJheTogVmFsdWVbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50c1swXTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdiA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlMSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbnVsbFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZTEgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdi52YWx1ZSA9IHR5cGUxLmluaXRpYWxWYWx1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBhcnJheS5wdXNoKHYpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogdHlwZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBhcnJheVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCBhcnJheTogVmFsdWVbXSA9IFtdO1xyXG4gICAgICAgICAgICBsZXQgbiA9IGNvdW50cy5wb3AoKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGFycmF5LnB1c2godGhpcy5tYWtlRW1wdHlBcnJheShjb3VudHMsIHR5cGUxKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogYXJyYXlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHJvdW5kKG46IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIFwiXCIgKyBNYXRoLnJvdW5kKG4gKiAxMDAwMCkgLyAxMDAwMDtcclxuICAgIH1cclxuXHJcbiAgICBydW5uaW5nU3RhdGVzOiBJbnRlcnByZXRlclN0YXRlW10gPSBbSW50ZXJwcmV0ZXJTdGF0ZS5wYXVzZWQsIEludGVycHJldGVyU3RhdGUucnVubmluZywgSW50ZXJwcmV0ZXJTdGF0ZS53YWl0aW5nRm9ySW5wdXRdO1xyXG5cclxuICAgIHNldFN0YXRlKHN0YXRlOiBJbnRlcnByZXRlclN0YXRlKSB7XHJcblxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiU2V0IHN0YXRlIFwiICsgSW50ZXJwcmV0ZXJTdGF0ZVtzdGF0ZV0pO1xyXG5cclxuICAgICAgICBsZXQgb2xkU3RhdGUgPSB0aGlzLnN0YXRlO1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcclxuXHJcbiAgICAgICAgaWYgKHN0YXRlID09IEludGVycHJldGVyU3RhdGUuZXJyb3IgfHwgc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5kb25lKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvc2VBbGxXZWJzb2NrZXRzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYW0gPSB0aGlzLm1haW4uZ2V0QWN0aW9uTWFuYWdlcigpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhY3Rpb25JZCBvZiB0aGlzLmFjdGlvbnMpIHtcclxuICAgICAgICAgICAgYW0uc2V0QWN0aXZlKFwiaW50ZXJwcmV0ZXIuXCIgKyBhY3Rpb25JZCwgdGhpcy5idXR0b25BY3RpdmVNYXRyaXhbYWN0aW9uSWRdW3N0YXRlXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYnV0dG9uU3RhcnRBY3RpdmUgPSB0aGlzLmJ1dHRvbkFjdGl2ZU1hdHJpeFsnc3RhcnQnXVtzdGF0ZV07XHJcblxyXG4gICAgICAgIGlmIChidXR0b25TdGFydEFjdGl2ZSkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25TdGFydC5zaG93KCk7XHJcbiAgICAgICAgICAgIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblBhdXNlLmhpZGUoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25TdGFydC5oaWRlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblBhdXNlLnNob3coKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBidXR0b25TdG9wQWN0aXZlID0gdGhpcy5idXR0b25BY3RpdmVNYXRyaXhbJ3N0b3AnXVtzdGF0ZV07XHJcbiAgICAgICAgaWYgKGJ1dHRvblN0b3BBY3RpdmUpIHtcclxuICAgICAgICAgICAgLy8gdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uRWRpdC5zaG93KCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uRWRpdC5oaWRlKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLndvcmxkSGVscGVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMud29ybGRIZWxwZXIuY2xlYXJBY3Rvckxpc3RzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5nbmdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXI/LmRldGFjaEV2ZW50cygpO1xyXG4gICAgICAgICAgICB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlciA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5ydW5uaW5nU3RhdGVzLmluZGV4T2Yob2xkU3RhdGUpID49IDAgJiYgdGhpcy5ydW5uaW5nU3RhdGVzLmluZGV4T2Yoc3RhdGUpIDwgMCkge1xyXG4gICAgICAgICAgICB0aGlzLmRlYnVnZ2VyLmRpc2FibGUoKTtcclxuICAgICAgICAgICAgLy8gdGhpcy5tYWluLmdldE1vbmFjb0VkaXRvcigpLnVwZGF0ZU9wdGlvbnMoeyByZWFkT25seTogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgIHRoaXMua2V5Ym9hcmRUb29sLnVuc3Vic2NyaWJlQWxsTGlzdGVuZXJzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5ydW5uaW5nU3RhdGVzLmluZGV4T2Yob2xkU3RhdGUpIDwgMCAmJiB0aGlzLnJ1bm5pbmdTdGF0ZXMuaW5kZXhPZihzdGF0ZSkgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmRlYnVnZ2VyLmVuYWJsZSgpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkudXBkYXRlT3B0aW9ucyh7IHJlYWRPbmx5OiB0cnVlIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2xvc2VBbGxXZWJzb2NrZXRzKCkge1xyXG4gICAgICAgIHRoaXMud2ViU29ja2V0c1RvQ2xvc2VBZnRlclByb2dyYW1IYWx0LmZvckVhY2goc29ja2V0ID0+IHNvY2tldC5jbG9zZSgpKTtcclxuICAgICAgICB0aGlzLndlYlNvY2tldHNUb0Nsb3NlQWZ0ZXJQcm9ncmFtSGFsdCA9IFtdO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwdXNoQ3VycmVudFByb2dyYW0oKSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IHRleHRQb3NpdGlvbjogVGV4dFBvc2l0aW9uO1xyXG4gICAgICAgIGxldCBjdXJyZW50U3RhdGVtZW50ID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbl07XHJcbiAgICAgICAgaWYgKGN1cnJlbnRTdGF0ZW1lbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0ZXh0UG9zaXRpb24gPSBjdXJyZW50U3RhdGVtZW50LnBvc2l0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgIHByb2dyYW06IHRoaXMuY3VycmVudFByb2dyYW0sXHJcbiAgICAgICAgICAgIHByb2dyYW1Qb3NpdGlvbjogdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uLFxyXG4gICAgICAgICAgICB0ZXh0UG9zaXRpb246IHRleHRQb3NpdGlvbixcclxuICAgICAgICAgICAgbWV0aG9kOiB0aGlzLmN1cnJlbnRNZXRob2QsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4sXHJcbiAgICAgICAgICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IHRoaXMuY3VycmVudElzQ2FsbGVkRnJvbU91dHNpZGVcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuID0gbnVsbDtcclxuICAgICAgICB0aGlzLmN1cnJlbnRJc0NhbGxlZEZyb21PdXRzaWRlID0gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gcnVuVGltZXIobWV0aG9kOiBNZXRob2QsIHN0YWNrRWxlbWVudHM6IFZhbHVlW10sXHJcbiAgICAvLyAgICAgY2FsbGJhY2tBZnRlclJldHVybjogKGludGVycHJldGVyOiBJbnRlcnByZXRlcikgPT4gdm9pZCkge1xyXG5cclxuICAgIC8vICAgICBpZih0aGlzLnN0YXRlICE9IEludGVycHJldGVyU3RhdGUucnVubmluZyl7XHJcbiAgICAvLyAgICAgICAgIHJldHVybjtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIHRoaXMucHVzaEN1cnJlbnRQcm9ncmFtKCk7XHJcblxyXG4gICAgLy8gICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBtZXRob2QucHJvZ3JhbTtcclxuICAgIC8vICAgICB0aGlzLmN1cnJlbnRNZXRob2QgPSBtZXRob2Q7XHJcbiAgICAvLyAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gMDtcclxuICAgIC8vICAgICB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuID0gY2FsbGJhY2tBZnRlclJldHVybjtcclxuICAgIC8vICAgICB0aGlzLmN1cnJlbnRJc0NhbGxlZEZyb21PdXRzaWRlID0gXCJUaW1lclwiO1xyXG5cclxuICAgIC8vICAgICB0aGlzLnN0YWNrZnJhbWVzLnB1c2godGhpcy5jdXJyZW50U3RhY2tmcmFtZSk7XHJcbiAgICAvLyAgICAgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9IHRoaXMuc3RhY2subGVuZ3RoO1xyXG4gICAgLy8gICAgIGZvciAobGV0IHNlIG9mIHN0YWNrRWxlbWVudHMpIHRoaXMuc3RhY2sucHVzaChzZSk7XHJcbiAgICAvLyAgICAgbGV0IHN0YXRlbWVudHMgPSBtZXRob2QucHJvZ3JhbS5zdGF0ZW1lbnRzO1xyXG5cclxuICAgIC8vICAgICAvLyBpZiBwcm9ncmFtIGVuZHMgd2l0aCByZXR1cm4gdGhlbiB0aGlzIHJldHVybi1zdGF0ZW1lbnQgZGVjcmVhc2VzIHN0ZXBPdmVyTmVzdGluZ0xldmVsLiBTbyB3ZSBpbmNyZWFzZSBpdFxyXG4gICAgLy8gICAgIC8vIGJlZm9yZWhhbmQgdG8gY29tcGVuc2F0ZSB0aGlzIGVmZmVjdC5cclxuICAgIC8vICAgICBpZihzdGF0ZW1lbnRzW3N0YXRlbWVudHMubGVuZ3RoIC0gMV0udHlwZSA9PSBUb2tlblR5cGUucmV0dXJuKSB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsKys7XHJcblxyXG4gICAgLy8gfVxyXG5cclxuICAgIHJ1blRpbWVyKG1ldGhvZDogTWV0aG9kLCBzdGFja0VsZW1lbnRzOiBWYWx1ZVtdLFxyXG4gICAgICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IChpbnRlcnByZXRlcjogSW50ZXJwcmV0ZXIpID0+IHZvaWQsIGlzQWN0b3I6IGJvb2xlYW4pIHtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT0gSW50ZXJwcmV0ZXJTdGF0ZS5ydW5uaW5nKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdGF0ZW1lbnRzID0gbWV0aG9kLnByb2dyYW0uc3RhdGVtZW50cztcclxuXHJcbiAgICAgICAgaWYgKGlzQWN0b3IgfHwgdGhpcy5wcm9ncmFtU3RhY2subGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgLy8gTWFpbiBQcm9ncmFtIGlzIHJ1bm5pbmcgPT4gVGltZXIgaGFzIGhpZ2hlciBwcmVjZWRlbmNlXHJcbiAgICAgICAgICAgIHRoaXMucHVzaEN1cnJlbnRQcm9ncmFtKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gbWV0aG9kLnByb2dyYW07XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudE1ldGhvZCA9IG1ldGhvZDtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gMDtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybiA9IGNhbGxiYWNrQWZ0ZXJSZXR1cm47XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudElzQ2FsbGVkRnJvbU91dHNpZGUgPSBcIlRpbWVyXCI7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnN0YWNrZnJhbWVzLnB1c2godGhpcy5jdXJyZW50U3RhY2tmcmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSB0aGlzLnN0YWNrLmxlbmd0aDtcclxuICAgICAgICAgICAgdGhpcy5zdGFjayA9IHRoaXMuc3RhY2suY29uY2F0KHN0YWNrRWxlbWVudHMpO1xyXG4gICAgICAgICAgICAvLyBmb3IgKGxldCBzZSBvZiBzdGFja0VsZW1lbnRzKSB0aGlzLnN0YWNrLnB1c2goc2UpO1xyXG5cclxuICAgICAgICAgICAgLy8gaWYgcHJvZ3JhbSBlbmRzIHdpdGggcmV0dXJuIHRoZW4gdGhpcyByZXR1cm4tc3RhdGVtZW50IGRlY3JlYXNlcyBzdGVwT3Zlck5lc3RpbmdMZXZlbC4gU28gd2UgaW5jcmVhc2UgaXRcclxuICAgICAgICAgICAgLy8gYmVmb3JlaGFuZCB0byBjb21wZW5zYXRlIHRoaXMgZWZmZWN0LlxyXG4gICAgICAgICAgICBpZiAoc3RhdGVtZW50c1tzdGF0ZW1lbnRzLmxlbmd0aCAtIDFdLnR5cGUgPT0gVG9rZW5UeXBlLnJldHVybikgdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCsrO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGFub3RoZXIgVGltZXIgaXMgcnVubmluZyA9PiBxdWV1ZSB1cFxyXG4gICAgICAgICAgICAvLyBwb3NpdGlvbiAwIGluIHByb2dyYW0gc3RhY2sgaXMgbWFpbiBwcm9ncmFtXHJcbiAgICAgICAgICAgIC8vID0+IGluc2VydCB0aW1lciBpbiBwb3NpdGlvbiAxXHJcblxyXG4gICAgICAgICAgICB0aGlzLnByb2dyYW1TdGFjay5zcGxpY2UoMSwgMCwge1xyXG4gICAgICAgICAgICAgICAgcHJvZ3JhbTogbWV0aG9kLnByb2dyYW0sXHJcbiAgICAgICAgICAgICAgICBwcm9ncmFtUG9zaXRpb246IDAsXHJcbiAgICAgICAgICAgICAgICB0ZXh0UG9zaXRpb246IHsgbGluZTogMCwgY29sdW1uOiAwLCBsZW5ndGg6IDAgfSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tBZnRlclJldHVybjogY2FsbGJhY2tBZnRlclJldHVybixcclxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IFwiVGltZXJcIixcclxuICAgICAgICAgICAgICAgIHN0YWNrRWxlbWVudHNUb1B1c2hCZWZvcmVGaXJzdEV4ZWN1dGluZzogc3RhY2tFbGVtZW50c1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChzdGF0ZW1lbnRzW3N0YXRlbWVudHMubGVuZ3RoIC0gMV0udHlwZSA9PSBUb2tlblR5cGUucmV0dXJuKSB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsKys7XHJcblxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV2YWx1YXRlKHByb2dyYW06IFByb2dyYW0pOiB7IGVycm9yOiBzdHJpbmcsIHZhbHVlOiBWYWx1ZSB9IHtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoQ3VycmVudFByb2dyYW0oKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHByb2dyYW07XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gMDtcclxuXHJcbiAgICAgICAgbGV0IHN0YWNrc2l6ZUJlZm9yZSA9IHRoaXMuc3RhY2subGVuZ3RoO1xyXG5cclxuICAgICAgICBsZXQgb2xkSW50ZXJwcmV0ZXJTdGF0ZSA9IHRoaXMuc3RhdGU7XHJcbiAgICAgICAgbGV0IHN0ZXBPdmVyTmVzdGluZ0xldmVsID0gdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbDtcclxuICAgICAgICBsZXQgYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWcgPSB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnO1xyXG5cclxuICAgICAgICBsZXQgb2xkU3RhY2tmcmFtZSA9IHRoaXMuY3VycmVudFN0YWNrZnJhbWU7XHJcblxyXG4gICAgICAgIGxldCBlcnJvcjogc3RyaW5nO1xyXG4gICAgICAgIGxldCBzdGVwQ291bnQgPSAwO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB3aGlsZSAoZXJyb3IgPT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAgICAgKHRoaXMuY3VycmVudFByb2dyYW0gIT0gcHJvZ3JhbSB8fCB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICAmJiBzdGVwQ291bnQgPCAxMDAwMDBcclxuICAgICAgICAgICAgICAgIC8vICYmIHRoaXMuY3VycmVudFByb2dyYW0gPT0gcHJvZ3JhbVxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGVycm9yID0gdGhpcy5uZXh0U3RlcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RlcENvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGVycm9yID0gXCJGZWhsZXIgYmVpIGRlciBBdXN3ZXJ0dW5nXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50UHJvZ3JhbSA9PSBwcm9ncmFtICYmIHRoaXMucHJvZ3JhbVN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5wb3BQcm9ncmFtKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc3RhY2tUb3A6IFZhbHVlO1xyXG4gICAgICAgIGlmICh0aGlzLnN0YWNrLmxlbmd0aCA+IHN0YWNrc2l6ZUJlZm9yZSkge1xyXG4gICAgICAgICAgICBzdGFja1RvcCA9IHRoaXMuc3RhY2sucG9wKCk7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5zdGFjay5sZW5ndGggPiBzdGFja3NpemVCZWZvcmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsID0gc3RlcE92ZXJOZXN0aW5nTGV2ZWw7XHJcbiAgICAgICAgdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IGFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnO1xyXG4gICAgICAgIHRoaXMuc2V0U3RhdGUob2xkSW50ZXJwcmV0ZXJTdGF0ZSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGVycm9yOiBlcnJvcixcclxuICAgICAgICAgICAgdmFsdWU6IHN0YWNrVG9wXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlSW1tZWRpYXRlbHlJbk5ld1N0YWNrZnJhbWUocHJvZ3JhbTogUHJvZ3JhbSwgdmFsdWVzVG9QdXNoQmVmb3JlRXhlY3V0aW5nOiBWYWx1ZVtdKTogeyBlcnJvcjogc3RyaW5nLCB2YWx1ZTogVmFsdWUgfSB7XHJcblxyXG4gICAgICAgIHRoaXMucHVzaEN1cnJlbnRQcm9ncmFtKCk7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xyXG4gICAgICAgIGxldCBvbGRQcm9ncmFtUG9zaXRpb24gPSB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb247XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gMDtcclxuXHJcbiAgICAgICAgbGV0IG51bWJlck9mU3RhY2tmcmFtZXNCZWZvcmUgPSB0aGlzLnN0YWNrZnJhbWVzLmxlbmd0aDtcclxuICAgICAgICB0aGlzLnN0YWNrZnJhbWVzLnB1c2godGhpcy5jdXJyZW50U3RhY2tmcmFtZSk7XHJcbiAgICAgICAgbGV0IHN0YWNrc2l6ZUJlZm9yZSA9IHRoaXMuc3RhY2subGVuZ3RoO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSBzdGFja3NpemVCZWZvcmU7XHJcblxyXG4gICAgICAgIGZvciAobGV0IHYgb2YgdmFsdWVzVG9QdXNoQmVmb3JlRXhlY3V0aW5nKSB0aGlzLnN0YWNrLnB1c2godik7XHJcblxyXG4gICAgICAgIGxldCBvbGRJbnRlcnByZXRlclN0YXRlID0gdGhpcy5zdGF0ZTtcclxuICAgICAgICBsZXQgc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsO1xyXG4gICAgICAgIGxldCBhZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IHRoaXMuYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWc7XHJcblxyXG5cclxuICAgICAgICBsZXQgc3RlcENvdW50ID0gMDtcclxuICAgICAgICBsZXQgZXJyb3IgPSBudWxsO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5zdGFja2ZyYW1lcy5sZW5ndGggPiBudW1iZXJPZlN0YWNrZnJhbWVzQmVmb3JlXHJcbiAgICAgICAgICAgICAgICAmJiBzdGVwQ291bnQgPCAxMDAwMDAgJiYgZXJyb3IgPT0gbnVsbFxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGxldCBub2RlID0gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbl07XHJcblxyXG4gICAgICAgICAgICAgICAgZXJyb3IgPSB0aGlzLmV4ZWN1dGVOb2RlKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgc3RlcENvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGVycm9yID0gXCJGZWhsZXIgYmVpIGRlciBBdXN3ZXJ0dW5nXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3RlcENvdW50ID09IDEwMDAwMCkgdGhpcy50aHJvd0V4Y2VwdGlvbihcIkRpZSBBdXNmw7xocnVuZyBkZXMgS29uc3RydWt0b3JzIGRhdWVydGUgenUgbGFuZ2UuXCIpO1xyXG5cclxuICAgICAgICBsZXQgc3RhY2tUb3A6IFZhbHVlO1xyXG4gICAgICAgIGlmICh0aGlzLnN0YWNrLmxlbmd0aCA+IHN0YWNrc2l6ZUJlZm9yZSkge1xyXG4gICAgICAgICAgICBzdGFja1RvcCA9IHRoaXMuc3RhY2sucG9wKCk7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5zdGFjay5sZW5ndGggPiBzdGFja3NpemVCZWZvcmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsID0gc3RlcE92ZXJOZXN0aW5nTGV2ZWw7XHJcbiAgICAgICAgdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IGFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnO1xyXG4gICAgICAgIC8vIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbisrO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSBvbGRQcm9ncmFtUG9zaXRpb247XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShvbGRJbnRlcnByZXRlclN0YXRlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZXJyb3I6IGVycm9yLFxyXG4gICAgICAgICAgICB2YWx1ZTogc3RhY2tUb3BcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGluc3RhbnRpYXRlT2JqZWN0SW1tZWRpYXRlbHkoa2xhc3M6IEtsYXNzKTogUnVudGltZU9iamVjdCB7XHJcbiAgICAgICAgbGV0IG9iamVjdCA9IG5ldyBSdW50aW1lT2JqZWN0KGtsYXNzKTtcclxuXHJcbiAgICAgICAgbGV0IHZhbHVlID0ge1xyXG4gICAgICAgICAgICB2YWx1ZTogb2JqZWN0LFxyXG4gICAgICAgICAgICB0eXBlOiBrbGFzc1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCBrbGFzczEgPSBrbGFzcztcclxuXHJcbiAgICAgICAgd2hpbGUgKGtsYXNzMSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCBhaXAgPSBrbGFzczEuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtO1xyXG4gICAgICAgICAgICBpZiAoYWlwLnN0YXRlbWVudHMubGVuZ3RoID4gMCkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuZXhlY3V0ZUltbWVkaWF0ZWx5SW5OZXdTdGFja2ZyYW1lKGFpcCwgW3ZhbHVlXSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGtsYXNzMSA9IGtsYXNzMS5iYXNlQ2xhc3M7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgY29uc3RydWN0b3IgPSBrbGFzcy5nZXRNZXRob2RCeVNpZ25hdHVyZShrbGFzcy5pZGVudGlmaWVyICsgXCIoKVwiKTtcclxuICAgICAgICBpZiAoY29uc3RydWN0b3IgIT0gbnVsbCAmJiBjb25zdHJ1Y3Rvci5wcm9ncmFtICE9IG51bGwpIHtcclxuICAgICAgICAgICAgLy8gbGV0IHByb2dyYW1XaXRob3V0UmV0dXJuU3RhdGVtZW50OiBQcm9ncmFtID0ge1xyXG4gICAgICAgICAgICAvLyAgICAgbGFiZWxNYW5hZ2VyOiBudWxsLFxyXG4gICAgICAgICAgICAvLyAgICAgbW9kdWxlOiBjb25zdHJ1Y3Rvci5wcm9ncmFtLm1vZHVsZSxcclxuICAgICAgICAgICAgLy8gICAgIHN0YXRlbWVudHM6IGNvbnN0cnVjdG9yLnByb2dyYW0uc3RhdGVtZW50cy5zbGljZSgwLCBjb25zdHJ1Y3Rvci5wcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoIC0gMSlcclxuICAgICAgICAgICAgLy8gfTtcclxuICAgICAgICAgICAgdGhpcy5leGVjdXRlSW1tZWRpYXRlbHlJbk5ld1N0YWNrZnJhbWUoY29uc3RydWN0b3IucHJvZ3JhbSwgW3ZhbHVlXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gb2JqZWN0O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByZWdpc3RlckRhdGFiYXNlQ29ubmVjdGlvbihjaDogQ29ubmVjdGlvbkhlbHBlcikge1xyXG4gICAgICAgIHRoaXMuZGF0YWJhc2VDb25uZWN0aW9uSGVscGVycy5wdXNoKGNoKTtcclxuICAgIH1cclxuXHJcblxyXG59Il19