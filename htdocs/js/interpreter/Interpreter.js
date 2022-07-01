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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW50ZXJwcmV0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50L2ludGVycHJldGVyL0ludGVycHJldGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBZ0IsU0FBUyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFHeEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQXFCLE1BQU0sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUczRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRWpELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUvQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFTeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBR3RELE1BQU0sQ0FBTixJQUFZLGdCQUVYO0FBRkQsV0FBWSxnQkFBZ0I7SUFDeEIsNkVBQWUsQ0FBQTtJQUFFLDZEQUFPLENBQUE7SUFBRSwyREFBTSxDQUFBO0lBQUUseURBQUssQ0FBQTtJQUFFLHVEQUFJLENBQUE7SUFBRSw2RUFBZSxDQUFBO0lBQUUseUZBQXFCLENBQUE7QUFDekYsQ0FBQyxFQUZXLGdCQUFnQixLQUFoQixn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LElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUN4RTtRQUVELE9BQU8sTUFBTSxDQUFDO0lBRWxCLENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxFQUFvQjtRQUMzQyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FHSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRleHRQb3NpdGlvbiwgVG9rZW5UeXBlLCBUb2tlblR5cGVSZWFkYWJsZSB9IGZyb20gXCIuLi9jb21waWxlci9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBNb2R1bGUsIE1vZHVsZVN0b3JlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3BhcnNlci9Nb2R1bGUuanNcIjtcclxuaW1wb3J0IHsgUHJvZ3JhbSwgU3RhdGVtZW50LCBSZXR1cm5TdGF0ZW1lbnQgfSBmcm9tIFwiLi4vY29tcGlsZXIvcGFyc2VyL1Byb2dyYW0uanNcIjtcclxuaW1wb3J0IHsgQXJyYXlUeXBlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL0FycmF5LmpzXCI7XHJcbmltcG9ydCB7IEtsYXNzLCBJbnRlcmZhY2UgfSBmcm9tIFwiLi4vY29tcGlsZXIvdHlwZXMvQ2xhc3MuanNcIjtcclxuaW1wb3J0IHsgRW51bSwgRW51bVJ1bnRpbWVPYmplY3QgfSBmcm9tIFwiLi4vY29tcGlsZXIvdHlwZXMvRW51bS5qc1wiO1xyXG5pbXBvcnQgeyBQcmltaXRpdmVUeXBlLCBUeXBlLCBWYWx1ZSwgSGVhcCwgTWV0aG9kIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL1R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IFByaW50TWFuYWdlciB9IGZyb20gXCIuLi9tYWluL2d1aS9QcmludE1hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgTWFpbiB9IGZyb20gXCIuLi9tYWluL01haW4uanNcIjtcclxuaW1wb3J0IHsgRGVidWdnZXIgfSBmcm9tIFwiLi9EZWJ1Z2dlci5qc1wiO1xyXG5pbXBvcnQgeyBSdW50aW1lT2JqZWN0IH0gZnJvbSBcIi4vUnVudGltZU9iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBpbnRQcmltaXRpdmVUeXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL1ByaW1pdGl2ZVR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IElucHV0TWFuYWdlciB9IGZyb20gXCIuL0lucHV0TWFuYWdlci5qc1wiO1xyXG5pbXBvcnQgeyBXb3JsZEhlbHBlciB9IGZyb20gXCIuLi9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9Xb3JsZC5qc1wiO1xyXG5pbXBvcnQgeyBIZWxwZXIgfSBmcm9tIFwiLi4vbWFpbi9ndWkvSGVscGVyLmpzXCI7XHJcbmltcG9ydCB7IFRpbWVyQ2xhc3MgfSBmcm9tIFwiLi4vcnVudGltZWxpYnJhcnkvVGltZXIuanNcIjtcclxuaW1wb3J0IHsgS2V5Ym9hcmRUb29sIH0gZnJvbSBcIi4uL3Rvb2xzL0tleWJvYXJkVG9vbC5qc1wiO1xyXG5pbXBvcnQgeyBQcm9ncmFtQ29udHJvbEJ1dHRvbnMgfSBmcm9tIFwiLi4vbWFpbi9ndWkvUHJvZ3JhbUNvbnRyb2xCdXR0b25zLmpzXCI7XHJcbmltcG9ydCB7IE1haW5CYXNlIH0gZnJvbSBcIi4uL21haW4vTWFpbkJhc2UuanNcIjtcclxuaW1wb3J0IHsgTGlzdEhlbHBlciB9IGZyb20gXCIuLi9ydW50aW1lbGlicmFyeS9jb2xsZWN0aW9ucy9BcnJheUxpc3QuanNcIjtcclxuaW1wb3J0IHsgR3JvdXBIZWxwZXIgfSBmcm9tIFwiLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvR3JvdXAuanNcIjtcclxuaW1wb3J0IHsgV2ViU29ja2V0UmVxdWVzdEtlZXBBbGl2ZSB9IGZyb20gXCIuLi9jb21tdW5pY2F0aW9uL0RhdGEuanNcIjtcclxuaW1wb3J0IHsgTWFpbkVtYmVkZGVkIH0gZnJvbSBcIi4uL2VtYmVkZGVkL01haW5FbWJlZGRlZC5qc1wiO1xyXG5pbXBvcnQgeyBQcm9jZXNzaW5nSGVscGVyIH0gZnJvbSBcIi4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1Byb2Nlc3NpbmcuanNcIjtcclxuaW1wb3J0IHsgR05HRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyIH0gZnJvbSBcIi4uL3J1bnRpbWVsaWJyYXJ5L2duZy9HTkdFcmVpZ25pc2JlaGFuZGx1bmcuanNcIjtcclxuaW1wb3J0IHsgR2FtZXBhZFRvb2wgfSBmcm9tIFwiLi4vdG9vbHMvR2FtZXBhZFRvb2wuanNcIjtcclxuaW1wb3J0IHsgQ29ubmVjdGlvbkhlbHBlciB9IGZyb20gXCIuLi9ydW50aW1lbGlicmFyeS9kYXRhYmFzZS9Db25uZWN0aW9uLmpzXCI7XHJcblxyXG5leHBvcnQgZW51bSBJbnRlcnByZXRlclN0YXRlIHtcclxuICAgIG5vdF9pbml0aWFsaXplZCwgcnVubmluZywgcGF1c2VkLCBlcnJvciwgZG9uZSwgd2FpdGluZ0ZvcklucHV0LCB3YWl0aW5nRm9yVGltZXJzVG9FbmRcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgUHJvZ3JhbVN0YWNrRWxlbWVudCA9IHtcclxuICAgIHByb2dyYW06IFByb2dyYW0sXHJcbiAgICBwcm9ncmFtUG9zaXRpb246IG51bWJlciwgIC8vIG5leHQgcG9zaXRpb24gdG8gZXhlY3V0ZSBhZnRlciByZXR1cm5cclxuICAgIHRleHRQb3NpdGlvbjogVGV4dFBvc2l0aW9uLCAvLyB0ZXh0cG9zaXRpb24gb2YgbWV0aG9kIGNhbGxcclxuICAgIG1ldGhvZDogTWV0aG9kIHwgc3RyaW5nLFxyXG4gICAgY2FsbGJhY2tBZnRlclJldHVybjogKGludGVycHJldGVyOiBJbnRlcnByZXRlcikgPT4gdm9pZCxcclxuICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IHN0cmluZyxcclxuICAgIHN0YWNrRWxlbWVudHNUb1B1c2hCZWZvcmVGaXJzdEV4ZWN1dGluZz86IFZhbHVlW11cclxufTtcclxuXHJcbmV4cG9ydCBjbGFzcyBJbnRlcnByZXRlciB7XHJcblxyXG4gICAgZGVidWdnZXI6IERlYnVnZ2VyO1xyXG5cclxuICAgIG1haW5Nb2R1bGU6IE1vZHVsZTtcclxuICAgIG1vZHVsZVN0b3JlOiBNb2R1bGVTdG9yZTtcclxuICAgIG1vZHVsZVN0b3JlVmVyc2lvbjogbnVtYmVyID0gLTEwMDtcclxuXHJcbiAgICBwcmludE1hbmFnZXI6IFByaW50TWFuYWdlcjtcclxuICAgIGlucHV0TWFuYWdlcjogSW5wdXRNYW5hZ2VyO1xyXG5cclxuICAgIHN0ZXBzUGVyU2Vjb25kID0gMjtcclxuICAgIG1heFN0ZXBzUGVyU2Vjb25kID0gMTAwMDAwMDtcclxuICAgIHRpbWVyRGVsYXlNcyA9IDEwO1xyXG5cclxuICAgIHRpbWVySWQ6IGFueTtcclxuICAgIHN0YXRlOiBJbnRlcnByZXRlclN0YXRlO1xyXG5cclxuICAgIGN1cnJlbnRQcm9ncmFtOiBQcm9ncmFtO1xyXG4gICAgY3VycmVudFByb2dyYW1Qb3NpdGlvbjogbnVtYmVyO1xyXG4gICAgY3VycmVudE1ldGhvZDogTWV0aG9kIHwgc3RyaW5nO1xyXG4gICAgY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm46IChpbnRlcnByZXRlcjogSW50ZXJwcmV0ZXIpID0+IHZvaWQ7XHJcbiAgICBjdXJyZW50SXNDYWxsZWRGcm9tT3V0c2lkZTogc3RyaW5nXHJcblxyXG4gICAgcHJvZ3JhbVN0YWNrOiBQcm9ncmFtU3RhY2tFbGVtZW50W10gPSBbXTtcclxuXHJcbiAgICBzdGFjazogVmFsdWVbXSA9IFtdO1xyXG4gICAgc3RhY2tmcmFtZXM6IG51bWJlcltdID0gW107XHJcbiAgICBjdXJyZW50U3RhY2tmcmFtZTogbnVtYmVyO1xyXG5cclxuICAgIGhlYXA6IEhlYXAgPSB7fTtcclxuXHJcbiAgICB0aW1lclN0b3BwZWQ6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgdGltZXJFeHRlcm46IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBzdGVwczogbnVtYmVyID0gMDtcclxuICAgIHRpbWVOZXR0bzogbnVtYmVyID0gMDtcclxuICAgIHRpbWVXaGVuUHJvZ3JhbVN0YXJ0ZWQ6IG51bWJlciA9IDA7XHJcblxyXG4gICAgc3RlcE92ZXJOZXN0aW5nTGV2ZWw6IG51bWJlciA9IDA7XHJcbiAgICBsZWF2ZUxpbmU6IG51bWJlciA9IC0xO1xyXG4gICAgYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBpc0ZpcnN0U3RhdGVtZW50OiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICBzaG93UHJvZ3JhbXBvaW50ZXJVcHRvU3RlcHNQZXJTZWNvbmQgPSAxNTtcclxuXHJcbiAgICB3b3JsZEhlbHBlcjogV29ybGRIZWxwZXI7XHJcbiAgICBnbmdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXI6IEdOR0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlcjtcclxuICAgIHByb2Nlc3NpbmdIZWxwZXI6IFByb2Nlc3NpbmdIZWxwZXI7XHJcbiAgICBkYXRhYmFzZUNvbm5lY3Rpb25IZWxwZXJzOiBDb25uZWN0aW9uSGVscGVyW10gPSBbXTtcclxuXHJcbiAgICBrZXlib2FyZFRvb2w6IEtleWJvYXJkVG9vbDtcclxuICAgIGdhbWVwYWRUb29sOiBHYW1lcGFkVG9vbDtcclxuXHJcbiAgICB3ZWJTb2NrZXRzVG9DbG9zZUFmdGVyUHJvZ3JhbUhhbHQ6IFdlYlNvY2tldFtdID0gW107XHJcblxyXG4gICAgcGF1c2VVbnRpbD86IG51bWJlcjtcclxuXHJcbiAgICBhY3Rpb25zOiBzdHJpbmdbXSA9IFtcInN0YXJ0XCIsIFwicGF1c2VcIiwgXCJzdG9wXCIsIFwic3RlcE92ZXJcIixcclxuICAgICAgICBcInN0ZXBJbnRvXCIsIFwic3RlcE91dFwiLCBcInJlc3RhcnRcIl07XHJcblxyXG4gICAgLy8gYnV0dG9uQWN0aXZlTWF0cml4W2J1dHRvbl1baV0gdGVsbHMgaWYgYnV0dG9uIGlzIGFjdGl2ZSBhdCBcclxuICAgIC8vIEludGVycHJldGVyU3RhdGUgaVxyXG4gICAgYnV0dG9uQWN0aXZlTWF0cml4OiB7IFtidXR0b25OYW1lOiBzdHJpbmddOiBib29sZWFuW10gfSA9IHtcclxuICAgICAgICBcInN0YXJ0XCI6IFtmYWxzZSwgZmFsc2UsIHRydWUsIHRydWUsIHRydWUsIGZhbHNlXSxcclxuICAgICAgICBcInBhdXNlXCI6IFtmYWxzZSwgdHJ1ZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2VdLFxyXG4gICAgICAgIFwic3RvcFwiOiBbZmFsc2UsIHRydWUsIHRydWUsIGZhbHNlLCBmYWxzZSwgdHJ1ZV0sXHJcbiAgICAgICAgXCJzdGVwT3ZlclwiOiBbZmFsc2UsIGZhbHNlLCB0cnVlLCB0cnVlLCB0cnVlLCBmYWxzZV0sXHJcbiAgICAgICAgXCJzdGVwSW50b1wiOiBbZmFsc2UsIGZhbHNlLCB0cnVlLCB0cnVlLCB0cnVlLCBmYWxzZV0sXHJcbiAgICAgICAgXCJzdGVwT3V0XCI6IFtmYWxzZSwgZmFsc2UsIHRydWUsIGZhbHNlLCBmYWxzZSwgZmFsc2VdLFxyXG4gICAgICAgIFwicmVzdGFydFwiOiBbZmFsc2UsIHRydWUsIHRydWUsIHRydWUsIHRydWUsIHRydWVdXHJcbiAgICB9XHJcblxyXG4gICAgY2FsbGJhY2tBZnRlckV4ZWN1dGlvbjogKCkgPT4gdm9pZDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgbWFpbjogTWFpbkJhc2UsIHB1YmxpYyBkZWJ1Z2dlcl86IERlYnVnZ2VyLCBwdWJsaWMgY29udHJvbEJ1dHRvbnM6IFByb2dyYW1Db250cm9sQnV0dG9ucyxcclxuICAgICAgICAkcnVuRGl2OiBKUXVlcnk8SFRNTEVsZW1lbnQ+KSB7XHJcbiAgICAgICAgdGhpcy5wcmludE1hbmFnZXIgPSBuZXcgUHJpbnRNYW5hZ2VyKCRydW5EaXYsIHRoaXMubWFpbik7XHJcbiAgICAgICAgdGhpcy5pbnB1dE1hbmFnZXIgPSBuZXcgSW5wdXRNYW5hZ2VyKCRydW5EaXYsIHRoaXMubWFpbik7XHJcbiAgICAgICAgaWYgKG1haW4uaXNFbWJlZGRlZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMua2V5Ym9hcmRUb29sID0gbmV3IEtleWJvYXJkVG9vbChqUXVlcnkoJ2h0bWwnKSwgbWFpbik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5rZXlib2FyZFRvb2wgPSBuZXcgS2V5Ym9hcmRUb29sKGpRdWVyeSh3aW5kb3cpLCBtYWluKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZ2FtZXBhZFRvb2wgPSBuZXcgR2FtZXBhZFRvb2woKTtcclxuXHJcbiAgICAgICAgdGhpcy5kZWJ1Z2dlciA9IGRlYnVnZ2VyXztcclxuXHJcbiAgICAgICAgY29udHJvbEJ1dHRvbnMuc2V0SW50ZXJwcmV0ZXIodGhpcyk7XHJcblxyXG4gICAgICAgIHRoaXMudGltZVdoZW5Qcm9ncmFtU3RhcnRlZCA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG4gICAgICAgIHRoaXMuc3RlcHMgPSAwO1xyXG4gICAgICAgIHRoaXMudGltZU5ldHRvID0gMDtcclxuICAgICAgICB0aGlzLnRpbWVyRXZlbnRzID0gMDtcclxuXHJcbiAgICAgICAgdGhpcy50aW1lckRlbGF5TXMgPSA3O1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIGxldCBwZXJpb2RpY0Z1bmN0aW9uID0gKCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGF0LnRpbWVyRXh0ZXJuKSB7XHJcbiAgICAgICAgICAgICAgICB0aGF0LnRpbWVyRnVuY3Rpb24odGhhdC50aW1lckRlbGF5TXMsIGZhbHNlLCAwLjcpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy50aW1lcklkID0gc2V0SW50ZXJ2YWwocGVyaW9kaWNGdW5jdGlvbiwgdGhpcy50aW1lckRlbGF5TXMpO1xyXG5cclxuICAgICAgICBsZXQga2VlcEFsaXZlUmVxdWVzdDogV2ViU29ja2V0UmVxdWVzdEtlZXBBbGl2ZSA9IHsgY29tbWFuZDogNSB9O1xyXG4gICAgICAgIGxldCByZXEgPSBKU09OLnN0cmluZ2lmeShrZWVwQWxpdmVSZXF1ZXN0KTtcclxuICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoYXQud2ViU29ja2V0c1RvQ2xvc2VBZnRlclByb2dyYW1IYWx0LmZvckVhY2god3MgPT4gd3Muc2VuZChyZXEpKTtcclxuICAgICAgICB9LCAzMDAwMCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGluaXRHVUkoKSB7XHJcblxyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgbGV0IGFtID0gdGhpcy5tYWluLmdldEFjdGlvbk1hbmFnZXIoKTtcclxuXHJcbiAgICAgICAgbGV0IHN0YXJ0RnVuY3Rpb24gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoYXQuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSAxMDAwMDAwO1xyXG4gICAgICAgICAgICB0aGF0LnN0YXJ0KCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbGV0IHBhdXNlRnVuY3Rpb24gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoYXQucGF1c2UoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBhbS5yZWdpc3RlckFjdGlvbihcImludGVycHJldGVyLnN0YXJ0XCIsIFsnRjQnXSxcclxuICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGFtLmlzQWN0aXZlKFwiaW50ZXJwcmV0ZXIuc3RhcnRcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFydEZ1bmN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhdXNlRnVuY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0sIFwiUHJvZ3JhbW0gc3RhcnRlblwiLCB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25TdGFydCk7XHJcblxyXG4gICAgICAgIGFtLnJlZ2lzdGVyQWN0aW9uKFwiaW50ZXJwcmV0ZXIucGF1c2VcIiwgWydGNCddLFxyXG4gICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYW0uaXNBY3RpdmUoXCJpbnRlcnByZXRlci5zdGFydFwiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0RnVuY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGF1c2VGdW5jdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSwgXCJQYXVzZVwiLCB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25QYXVzZSk7XHJcblxyXG4gICAgICAgIGFtLnJlZ2lzdGVyQWN0aW9uKFwiaW50ZXJwcmV0ZXIuc3RvcFwiLCBbXSxcclxuICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhhdC5zdG9wKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIHRoYXQuc3RlcHMgPSAwO1xyXG4gICAgICAgICAgICB9LCBcIlByb2dyYW1tIGFuaGFsdGVuXCIsIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblN0b3ApO1xyXG5cclxuICAgICAgICAvLyB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25FZGl0Lm9uKCdjbGljaycsIChlKSA9PiB7XHJcbiAgICAgICAgLy8gICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgLy8gICAgIGFtLnRyaWdnZXIoJ2ludGVycHJldGVyLnN0b3AnKTtcclxuICAgICAgICAvLyB9KTtcclxuXHJcbiAgICAgICAgYW0ucmVnaXN0ZXJBY3Rpb24oXCJpbnRlcnByZXRlci5zdGVwT3ZlclwiLCBbJ0Y2J10sXHJcbiAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25lU3RlcChmYWxzZSk7XHJcbiAgICAgICAgICAgIH0sIFwiRWluemVsc2Nocml0dCAoU3RlcCBvdmVyKVwiLCB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25TdGVwT3Zlcik7XHJcblxyXG4gICAgICAgIGFtLnJlZ2lzdGVyQWN0aW9uKFwiaW50ZXJwcmV0ZXIuc3RlcEludG9cIiwgWydGNyddLFxyXG4gICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uZVN0ZXAodHJ1ZSk7XHJcbiAgICAgICAgICAgIH0sIFwiRWluemVsc2Nocml0dCAoU3RlcCBpbnRvKVwiLCB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25TdGVwSW50byk7XHJcblxyXG4gICAgICAgIGFtLnJlZ2lzdGVyQWN0aW9uKFwiaW50ZXJwcmV0ZXIuc3RlcE91dFwiLCBbXSxcclxuICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGVwT3V0KCk7XHJcbiAgICAgICAgICAgIH0sIFwiU3RlcCBvdXRcIiwgdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uU3RlcE91dCk7XHJcblxyXG4gICAgICAgIGFtLnJlZ2lzdGVyQWN0aW9uKFwiaW50ZXJwcmV0ZXIucmVzdGFydFwiLCBbXSxcclxuICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhhdC5zdG9wKHRydWUpO1xyXG4gICAgICAgICAgICB9LCBcIk5ldSBzdGFydGVuXCIsIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblJlc3RhcnQpO1xyXG5cclxuICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUubm90X2luaXRpYWxpemVkKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0U3RhcnRhYmxlTW9kdWxlKG1vZHVsZVN0b3JlOiBNb2R1bGVTdG9yZSk6IE1vZHVsZSB7XHJcblxyXG4gICAgICAgIGxldCBjZW06IE1vZHVsZTtcclxuICAgICAgICBjZW0gPSB0aGlzLm1haW4uZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCk7XHJcblxyXG4gICAgICAgIGxldCBjdXJyZW50bHlFZGl0ZWRNb2R1bGVJc0NsYXNzT25seSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAvLyBkZWNpZGUgd2hpY2ggbW9kdWxlIHRvIHN0YXJ0XHJcblxyXG4gICAgICAgIC8vIGZpcnN0IGF0dGVtcHQ6IGlzIGN1cnJlbnRseSBlZGl0ZWQgTW9kdWxlIHN0YXJ0YWJsZT9cclxuICAgICAgICBpZiAoY2VtICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRseUVkaXRlZE1vZHVsZSA9IG1vZHVsZVN0b3JlLmZpbmRNb2R1bGVCeUZpbGUoY2VtLmZpbGUpO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudGx5RWRpdGVkTW9kdWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRseUVkaXRlZE1vZHVsZUlzQ2xhc3NPbmx5ID0gIWNlbS5oYXNFcnJvcnMoKVxyXG4gICAgICAgICAgICAgICAgICAgICYmICFjdXJyZW50bHlFZGl0ZWRNb2R1bGUuaXNTdGFydGFibGU7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudGx5RWRpdGVkTW9kdWxlLmlzU3RhcnRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRseUVkaXRlZE1vZHVsZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc2Vjb25kIGF0dGVtcHQ6IHdoaWNoIG1vZHVsZSBoYXMgYmVlbiBzdGFydGVkIGxhc3QgdGltZT9cclxuICAgICAgICBpZiAodGhpcy5tYWluTW9kdWxlICE9IG51bGwgJiYgY3VycmVudGx5RWRpdGVkTW9kdWxlSXNDbGFzc09ubHkpIHtcclxuICAgICAgICAgICAgbGV0IGxhc3RNYWluTW9kdWxlID0gbW9kdWxlU3RvcmUuZmluZE1vZHVsZUJ5RmlsZSh0aGlzLm1haW5Nb2R1bGUuZmlsZSk7XHJcbiAgICAgICAgICAgIGlmIChsYXN0TWFpbk1vZHVsZSAhPSBudWxsICYmIGxhc3RNYWluTW9kdWxlLmlzU3RhcnRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGFzdE1haW5Nb2R1bGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHRoaXJkIGF0dGVtcHQ6IHBpY2sgZmlyc3Qgc3RhcnRhYmxlIG1vZHVsZSBvZiBjdXJyZW50IHdvcmtzcGFjZVxyXG4gICAgICAgIGlmIChjdXJyZW50bHlFZGl0ZWRNb2R1bGVJc0NsYXNzT25seSkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBtIG9mIG1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobS5pc1N0YXJ0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgICAgIEFmdGVyIHVzZXIgY2xpY2tzIHN0YXJ0IGJ1dHRvbiAob3Igc3RlcG92ZXIvc3RlcEludG8tQnV0dG9uIHdoZW4gbm8gcHJvZ3JhbSBpcyBydW5uaW5nKSB0aGlzXHJcbiAgICAgICAgbWV0aG9kIGlzdCBjYWxsZWQuXHJcbiAgICAqL1xyXG4gICAgaW5pdCgpIHtcclxuXHJcbiAgICAgICAgdGhpcy50aW1lclN0b3BwZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICBsZXQgY2VtID0gdGhpcy5tYWluLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpO1xyXG5cclxuICAgICAgICBjZW0uZ2V0QnJlYWtwb2ludFBvc2l0aW9uc0Zyb21FZGl0b3IoKTtcclxuXHJcbiAgICAgICAgdGhpcy5tYWluLmdldEJvdHRvbURpdigpPy5jb25zb2xlPy5jbGVhckV4Y2VwdGlvbnMoKTtcclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICAgICAgQXMgbG9uZyBhcyB0aGVyZSBpcyBubyBzdGFydGFibGUgbmV3IFZlcnNpb24gb2YgY3VycmVudCB3b3Jrc3BhY2Ugd2Uga2VlcCBjdXJyZW50IGNvbXBpbGVkIG1vZHVsZXMgc29cclxuICAgICAgICAgICAgdGhhdCB2YXJpYWJsZXMgYW5kIG9iamVjdHMgZGVmaW5lZC9pbnN0YW50aWF0ZWQgdmlhIGNvbnNvbGUgY2FuIGJlIGtlcHQsIHRvby4gXHJcbiAgICAgICAgKi9cclxuICAgICAgICBpZiAodGhpcy5tb2R1bGVTdG9yZVZlcnNpb24gIT0gdGhpcy5tYWluLnZlcnNpb24gJiYgdGhpcy5tYWluLmdldENvbXBpbGVyKCkuYXRMZWFzdE9uZU1vZHVsZUlzU3RhcnRhYmxlKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5jb3B5RXhlY3V0YWJsZU1vZHVsZVN0b3JlVG9JbnRlcnByZXRlcigpO1xyXG4gICAgICAgICAgICB0aGlzLmhlYXAgPSB7fTsgLy8gY2xlYXIgdmFyaWFibGVzL29iamVjdHMgZGVmaW5lZCB2aWEgY29uc29sZVxyXG4gICAgICAgICAgICB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCk/LmNvbnNvbGU/LmRldGFjaFZhbHVlcygpOyAgLy8gZGV0YWNoIHZhbHVlcyBmcm9tIGNvbnNvbGUgZW50cmllc1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG5ld01haW5Nb2R1bGUgPSB0aGlzLmdldFN0YXJ0YWJsZU1vZHVsZSh0aGlzLm1vZHVsZVN0b3JlKTtcclxuXHJcbiAgICAgICAgaWYgKG5ld01haW5Nb2R1bGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUubm90X2luaXRpYWxpemVkKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYWluTW9kdWxlID0gbmV3TWFpbk1vZHVsZTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gMDtcclxuXHJcbiAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sgPSBbXTtcclxuICAgICAgICB0aGlzLnN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5zdGFja2ZyYW1lcyA9IFtdO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSAwO1xyXG5cclxuICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUuZG9uZSk7XHJcblxyXG4gICAgICAgIHRoaXMuaXNGaXJzdFN0YXRlbWVudCA9IHRydWU7XHJcblxyXG4gICAgICAgIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSAxMDAwMDAwO1xyXG5cclxuXHJcbiAgICAgICAgLy8gSW5zdGFudGlhdGUgZW51bSB2YWx1ZS1vYmplY3RzOyBpbml0aWFsaXplIHN0YXRpYyBhdHRyaWJ1dGVzOyBjYWxsIHN0YXRpYyBjb25zdHJ1Y3RvcnNcclxuXHJcbiAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgIHByb2dyYW06IHRoaXMubWFpbk1vZHVsZS5tYWluUHJvZ3JhbSxcclxuICAgICAgICAgICAgcHJvZ3JhbVBvc2l0aW9uOiAwLFxyXG4gICAgICAgICAgICB0ZXh0UG9zaXRpb246IHsgbGluZTogMSwgY29sdW1uOiAxLCBsZW5ndGg6IDAgfSxcclxuICAgICAgICAgICAgbWV0aG9kOiBcIkhhdXB0cHJvZ3JhbW1cIixcclxuICAgICAgICAgICAgY2FsbGJhY2tBZnRlclJldHVybjogbnVsbCxcclxuICAgICAgICAgICAgaXNDYWxsZWRGcm9tT3V0c2lkZTogXCJIYXVwdHByb2dyYW1tXCJcclxuXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgZm9yIChsZXQgbSBvZiB0aGlzLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUVudW1zKG0pO1xyXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVDbGFzc2VzKG0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wb3BQcm9ncmFtKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHBvcFByb2dyYW0oKSB7XHJcbiAgICAgICAgbGV0IHAgPSB0aGlzLnByb2dyYW1TdGFjay5wb3AoKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gcC5wcm9ncmFtO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IHAucHJvZ3JhbVBvc2l0aW9uO1xyXG4gICAgICAgIHRoaXMuY3VycmVudE1ldGhvZCA9IHAubWV0aG9kO1xyXG4gICAgICAgIHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4gPSBwLmNhbGxiYWNrQWZ0ZXJSZXR1cm47XHJcbiAgICAgICAgdGhpcy5jdXJyZW50SXNDYWxsZWRGcm9tT3V0c2lkZSA9IHAuaXNDYWxsZWRGcm9tT3V0c2lkZTtcclxuICAgICAgICBpZiAocC5zdGFja0VsZW1lbnRzVG9QdXNoQmVmb3JlRmlyc3RFeGVjdXRpbmcgIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zdGFja2ZyYW1lcy5wdXNoKHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPT0gbnVsbCA/IDAgOiB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9IHRoaXMuc3RhY2subGVuZ3RoO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgc2Ugb2YgcC5zdGFja0VsZW1lbnRzVG9QdXNoQmVmb3JlRmlyc3RFeGVjdXRpbmcpIHRoaXMuc3RhY2sucHVzaChzZSk7XHJcbiAgICAgICAgICAgIHAuc3RhY2tFbGVtZW50c1RvUHVzaEJlZm9yZUZpcnN0RXhlY3V0aW5nID0gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdGlhbGl6ZUNsYXNzZXMobTogTW9kdWxlKSB7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGtsYXNzIG9mIG0udHlwZVN0b3JlLnR5cGVMaXN0KSB7XHJcbiAgICAgICAgICAgIGlmIChrbGFzcyBpbnN0YW5jZW9mIEtsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICBrbGFzcy5zdGF0aWNDbGFzcy5jbGFzc09iamVjdCA9IG5ldyBSdW50aW1lT2JqZWN0KGtsYXNzLnN0YXRpY0NsYXNzKTtcclxuICAgICAgICAgICAgICAgIGtsYXNzLnB1c2hTdGF0aWNJbml0aWFsaXphdGlvblByb2dyYW1zKHRoaXMucHJvZ3JhbVN0YWNrKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGtsYXNzIGluc3RhbmNlb2YgRW51bSkge1xyXG4gICAgICAgICAgICAgICAgLy8gbGV0IHN0YXRpY1ZhbHVlTWFwID0ga2xhc3Muc3RhdGljQ2xhc3MuY2xhc3NPYmplY3QuYXR0cmlidXRlVmFsdWVzLmdldChrbGFzcy5pZGVudGlmaWVyKTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0aWNWYWx1ZUxpc3QgPSBrbGFzcy5zdGF0aWNDbGFzcy5jbGFzc09iamVjdC5hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZW51bUluZm8gb2Yga2xhc3MuZW51bUluZm9MaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc3RhdGljVmFsdWVNYXAuZ2V0KGVudW1JbmZvLmlkZW50aWZpZXIpLnZhbHVlID0gZW51bUluZm8ub2JqZWN0O1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRpY1ZhbHVlTGlzdFtlbnVtSW5mby5vcmRpbmFsXS52YWx1ZSA9IGVudW1JbmZvLm9iamVjdDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgaW5pdGlhbGl6ZUVudW1zKG06IE1vZHVsZSkge1xyXG5cclxuICAgICAgICBmb3IgKGxldCBlbnVtQ2xhc3Mgb2YgbS50eXBlU3RvcmUudHlwZUxpc3QpIHtcclxuICAgICAgICAgICAgaWYgKGVudW1DbGFzcyBpbnN0YW5jZW9mIEVudW0pIHtcclxuXHJcbiAgICAgICAgICAgICAgICBlbnVtQ2xhc3MucHVzaFN0YXRpY0luaXRpYWxpemF0aW9uUHJvZ3JhbXModGhpcy5wcm9ncmFtU3RhY2spO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZUxpc3Q6IFZhbHVlW10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWVJbml0aWFsaXphdGlvblByb2dyYW06IFByb2dyYW0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlOiBlbnVtQ2xhc3MubW9kdWxlLFxyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsTWFuYWdlcjogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaGFzQXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtID0gZW51bUNsYXNzLmF0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGhhc0F0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvZ3JhbVN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtOiB2YWx1ZUluaXRpYWxpemF0aW9uUHJvZ3JhbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbVBvc2l0aW9uOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0UG9zaXRpb246IHsgbGluZTogMSwgY29sdW1uOiAxLCBsZW5ndGg6IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBcIkF0dHJpYnV0LUluaXRpYWxpc2llcnVuZyBkZXIgS2xhc3NlIFwiICsgZW51bUNsYXNzLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IFwiSW5pdGlhbGlzaWVydW5nIGVpbmVzIEVudW1zXCJcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGVudW1JbmZvIG9mIGVudW1DbGFzcy5lbnVtSW5mb0xpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbnVtSW5mby5vYmplY3QgPSBuZXcgRW51bVJ1bnRpbWVPYmplY3QoZW51bUNsYXNzLCBlbnVtSW5mbyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogZW51bUNsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZW51bUluZm8ub2JqZWN0XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbnVtSW5mby5jb25zdHJ1Y3RvckNhbGxQcm9ncmFtICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtOiBlbnVtSW5mby5jb25zdHJ1Y3RvckNhbGxQcm9ncmFtLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbVBvc2l0aW9uOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dFBvc2l0aW9uOiB7IGxpbmU6IDEsIGNvbHVtbjogMSwgbGVuZ3RoOiAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IFwiS29uc3RydWt0b3Igdm9uIFwiICsgZW51bUNsYXNzLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja0FmdGVyUmV0dXJuOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDYWxsZWRGcm9tT3V0c2lkZTogXCJJbml0aWFsaXNpZXJ1bmcgZWluZXMgRW51bXNcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzQXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlSW5pdGlhbGl6YXRpb25Qcm9ncmFtLnN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuaW5pdGlhbGl6ZUVudW1WYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBlbnVtSW5mby5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW1DbGFzczogZW51bUNsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVJZGVudGlmaWVyOiBlbnVtSW5mby5pZGVudGlmaWVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaGFzQXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVJbml0aWFsaXphdGlvblByb2dyYW0uc3RhdGVtZW50cy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnByb2dyYW1FbmQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7IGxpbmU6IDAsIGNvbHVtbjogMCwgbGVuZ3RoOiAxIH1cclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGVudW1DbGFzcy52YWx1ZUxpc3QgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogbmV3IEFycmF5VHlwZShlbnVtQ2xhc3MpLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZUxpc3RcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHRpbWVyRXZlbnRzOiBudW1iZXIgPSAwO1xyXG4gICAgc3RhcnQoY2FsbGJhY2s/OiAoKSA9PiB2b2lkKSB7XHJcblxyXG4gICAgICAgIHRoaXMubWFpbi5nZXRCb3R0b21EaXYoKT8uY29uc29sZT8uY2xlYXJFcnJvcnMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5jYWxsYmFja0FmdGVyRXhlY3V0aW9uID0gY2FsbGJhY2s7XHJcblxyXG4gICAgICAgIHRoaXMuaXNGaXJzdFN0YXRlbWVudCA9IHRydWU7XHJcblxyXG4gICAgICAgIHRoaXMucGF1c2VVbnRpbCA9IG51bGw7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09IEludGVycHJldGVyU3RhdGUuZXJyb3IgfHwgdGhpcy5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLmRvbmUpIHtcclxuICAgICAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICAgICAgICAgIHRoaXMucmVzZXRSdW50aW1lKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUucnVubmluZyk7XHJcblxyXG4gICAgICAgIHRoaXMuaGlkZVByb2dyYW1wb2ludGVyUG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgdGhpcy50aW1lV2hlblByb2dyYW1TdGFydGVkID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcbiAgICAgICAgdGhpcy50aW1lclN0b3BwZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRUaW1lckNsYXNzKCkuc3RhcnRUaW1lcigpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRUaW1lckNsYXNzKCk6IFRpbWVyQ2xhc3Mge1xyXG4gICAgICAgIGxldCBiYXNlTW9kdWxlID0gdGhpcy5tYWluLmdldEN1cnJlbnRXb3Jrc3BhY2UoKS5tb2R1bGVTdG9yZS5nZXRNb2R1bGUoXCJCYXNlIE1vZHVsZVwiKTtcclxuICAgICAgICByZXR1cm4gPFRpbWVyQ2xhc3M+YmFzZU1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlRpbWVyXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGxhc3RTdGVwVGltZTogbnVtYmVyID0gMDtcclxuICAgIGxhc3RUaW1lQmV0d2VlbkV2ZW50czogbnVtYmVyID0gMDtcclxuXHJcbiAgICB0aW1lckZ1bmN0aW9uKHRpbWVyRGVsYXlNczogbnVtYmVyLCBmb3JjZVJ1bjogYm9vbGVhbiwgbWF4V29ya2xvYWRGYWN0b3I6IG51bWJlcikge1xyXG5cclxuICAgICAgICBsZXQgdDAgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHJcbiAgICAgICAgaWYgKCFmb3JjZVJ1bikge1xyXG4gICAgICAgICAgICBsZXQgdGltZUJldHdlZW5TdGVwcyA9IDEwMDAgLyB0aGlzLnN0ZXBzUGVyU2Vjb25kO1xyXG4gICAgICAgICAgICBpZiAodGhpcy50aW1lclN0b3BwZWQgfHwgdDAgLSB0aGlzLmxhc3RTdGVwVGltZSA8IHRpbWVCZXR3ZWVuU3RlcHMpIHJldHVybjtcclxuICAgICAgICAgICAgdGhpcy5sYXN0U3RlcFRpbWUgPSB0MDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubGFzdFRpbWVCZXR3ZWVuRXZlbnRzID0gdDAgLSB0aGlzLmxhc3RTdGVwVGltZTtcclxuXHJcbiAgICAgICAgbGV0IG5fc3RlcHNQZXJUaW1lckdvYWwgPSBmb3JjZVJ1biA/IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSIDogdGhpcy5zdGVwc1BlclNlY29uZCAqIHRoaXMudGltZXJEZWxheU1zIC8gMTAwMDtcclxuXHJcbiAgICAgICAgdGhpcy50aW1lckV2ZW50cysrO1xyXG5cclxuICAgICAgICBsZXQgZXhjZXB0aW9uOiBzdHJpbmc7XHJcbiAgICAgICAgbGV0IGkgPSAwO1xyXG5cclxuICAgICAgICB3aGlsZSAoaSA8IG5fc3RlcHNQZXJUaW1lckdvYWwgJiYgIXRoaXMudGltZXJTdG9wcGVkICYmIGV4Y2VwdGlvbiA9PSBudWxsICYmXHJcbiAgICAgICAgICAgIChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKSAvIHRpbWVyRGVsYXlNcyA8IG1heFdvcmtsb2FkRmFjdG9yXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGV4Y2VwdGlvbiA9IHRoaXMubmV4dFN0ZXAoKTtcclxuICAgICAgICAgICAgaWYgKGV4Y2VwdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuc3RlcHNQZXJTZWNvbmQgPD0gdGhpcy5zaG93UHJvZ3JhbXBvaW50ZXJVcHRvU3RlcHNQZXJTZWNvbmQgJiYgIWZvcmNlUnVuKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dQcm9ncmFtUG9pbnRlckFuZFZhcmlhYmxlcygpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLmVycm9yIHx8XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID09IEludGVycHJldGVyU3RhdGUuZG9uZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lclN0b3BwZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPCAwICYmICF0aGlzLnRpbWVyU3RvcHBlZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5vZGUgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHNbdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uXTtcclxuICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IG5vZGUucG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT0gbnVsbCB8fCBwb3NpdGlvbi5saW5lICE9IHRoaXMubGVhdmVMaW5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lclN0b3BwZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5wYXVzZWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb21lc1N0YXRlbWVudChUb2tlblR5cGUuY2xvc2VTdGFja2ZyYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBleGNlcHRpb24gPSB0aGlzLm5leHRTdGVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChleGNlcHRpb24gPT0gbnVsbCAmJiB0aGlzLmNvbWVzU3RhdGVtZW50KFRva2VuVHlwZS5wcm9ncmFtRW5kKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhjZXB0aW9uID0gdGhpcy5uZXh0U3RlcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGV4Y2VwdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGhyb3dFeGNlcHRpb24oZXhjZXB0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnRpbWVyU3RvcHBlZCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLnBhdXNlZCB8fCB0aGlzLnN0YXRlID09IEludGVycHJldGVyU3RhdGUud2FpdGluZ0ZvcklucHV0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dQcm9ncmFtUG9pbnRlckFuZFZhcmlhYmxlcygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNhbGxiYWNrQWZ0ZXJFeGVjdXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFja0FmdGVyRXhlY3V0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrQWZ0ZXJFeGVjdXRpb24gPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZHQgPSBwZXJmb3JtYW5jZS5ub3coKSAtIHQwO1xyXG4gICAgICAgIHRoaXMudGltZU5ldHRvICs9IGR0O1xyXG5cclxuICAgICAgICAvLyBpZiAoXHJcbiAgICAgICAgLy8gICAgIHRoaXMudGltZXJFdmVudHMgJSAzMDAgPT0gMCkge1xyXG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcIkxhc3QgdGltZSBiZXR3ZWVuIEV2ZW50czogXCIgKyB0aGlzLmxhc3RUaW1lQmV0d2VlbkV2ZW50cyk7XHJcbiAgICAgICAgLy8gfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3dFeGNlcHRpb24oZXhjZXB0aW9uOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLnRpbWVyU3RvcHBlZCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLmVycm9yKTtcclxuXHJcbiAgICAgICAgbGV0ICRlcnJvckRpdiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX2V4Y2VwdGlvblwiPjwvZGl2PicpO1xyXG5cclxuICAgICAgICBsZXQgY29uc29sZVByZXNlbnQ6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgIGlmICh0aGlzLm1haW4uaXNFbWJlZGRlZCgpKSB7XHJcbiAgICAgICAgICAgIGxldCBtYWluRW1iZWRkZWQ6IE1haW5FbWJlZGRlZCA9IDxNYWluRW1iZWRkZWQ+dGhpcy5tYWluO1xyXG4gICAgICAgICAgICBsZXQgY29uZmlnID0gbWFpbkVtYmVkZGVkLmNvbmZpZztcclxuICAgICAgICAgICAgaWYgKGNvbmZpZy53aXRoQm90dG9tUGFuZWwgIT0gdHJ1ZSAmJiBjb25maWcud2l0aENvbnNvbGUgIT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZVByZXNlbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvblN0cmluZyA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudFN0YXRlbWVudCA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50c1t0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb25dO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRTdGF0ZW1lbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0ZXh0UG9zaXRpb24gPSBjdXJyZW50U3RhdGVtZW50Py5wb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvblN0cmluZyA9IFwiIGluIFplaWxlIFwiICsgdGV4dFBvc2l0aW9uLmxpbmUgKyBcIiwgU3BhbHRlIFwiICsgdGV4dFBvc2l0aW9uLmNvbHVtbjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWluLmdldEJvdHRvbURpdigpPy5jb25zb2xlPy5zaG93RXJyb3IodGhpcy5jdXJyZW50UHJvZ3JhbS5tb2R1bGUsIHRleHRQb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgYWxlcnQoXCJGZWhsZXJcIiArIHBvc2l0aW9uU3RyaW5nICsgXCI6IFwiICsgZXhjZXB0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChjb25zb2xlUHJlc2VudCkge1xyXG4gICAgICAgICAgICAkZXJyb3JEaXYuYXBwZW5kKGpRdWVyeShcIjxzcGFuIGNsYXNzPSdqb19lcnJvci1jYXB0aW9uJz5GZWhsZXI6PC9zcGFuPiZuYnNwO1wiICsgZXhjZXB0aW9uICsgXCI8YnI+XCIpKTtcclxuICAgICAgICAgICAgdGhpcy5wdXNoQ3VycmVudFByb2dyYW0oKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBmaXJzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnByb2dyYW1TdGFjay5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwID0gdGhpcy5wcm9ncmFtU3RhY2tbaV07XHJcbiAgICAgICAgICAgICAgICBsZXQgbSA9IChwLm1ldGhvZCBpbnN0YW5jZW9mIE1ldGhvZCkgPyBwLm1ldGhvZC5pZGVudGlmaWVyIDogcC5tZXRob2Q7XHJcbiAgICAgICAgICAgICAgICBsZXQgczogc3RyaW5nID0gXCI8c3BhbiBjbGFzcz0nam9fZXJyb3ItY2FwdGlvbic+XCIgKyAoZmlyc3QgPyBcIk9ydFwiIDogXCJhdWZnZXJ1ZmVuIHZvblwiKSArIFwiOiA8L3NwYW4+XCIgKyBtO1xyXG4gICAgICAgICAgICAgICAgaWYgKHAudGV4dFBvc2l0aW9uICE9IG51bGwpIHMgKz0gXCIgPHNwYW4gY2xhc3M9J2pvX3J1bnRpbWVFcnJvclBvc2l0aW9uJz4oWiBcIiArIHAudGV4dFBvc2l0aW9uLmxpbmUgKyBcIiwgUyBcIiArIHAudGV4dFBvc2l0aW9uLmNvbHVtbiArIFwiKTwvc3Bhbj5cIjtcclxuICAgICAgICAgICAgICAgIHMgKz0gXCI8YnI+XCI7XHJcbiAgICAgICAgICAgICAgICBsZXQgZXJyb3JMaW5lID0galF1ZXJ5KHMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHAudGV4dFBvc2l0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgICAgICAgICAgICAgalF1ZXJ5KGVycm9yTGluZVsyXSkub24oJ21vdXNlZG93bicsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tYWluLmdldEJvdHRvbURpdigpPy5jb25zb2xlPy5zaG93RXJyb3IocC5wcm9ncmFtLm1vZHVsZSwgcC50ZXh0UG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgJGVycm9yRGl2LmFwcGVuZChlcnJvckxpbmUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGZpcnN0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpZiAocC5pc0NhbGxlZEZyb21PdXRzaWRlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGNvbnNvbGUgPSB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCk/LmNvbnNvbGU7XHJcblxyXG4gICAgICAgICAgICBpZiAoY29uc29sZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndyaXRlQ29uc29sZUVudHJ5KCRlcnJvckRpdiwgbnVsbCwgJ3JnYmEoMjU1LCAwLCAwLCAwLjQnKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuc2hvd1RhYigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgaGlkZVByb2dyYW1wb2ludGVyUG9zaXRpb24oKSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09IEludGVycHJldGVyU3RhdGUucnVubmluZykge1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuc3RlcHNQZXJTZWNvbmQgPiB0aGlzLnNob3dQcm9ncmFtcG9pbnRlclVwdG9TdGVwc1BlclNlY29uZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluLmhpZGVQcm9ncmFtUG9pbnRlclBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb21lc1N0YXRlbWVudChzdGF0ZW1lbnQ6IFRva2VuVHlwZSkge1xyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID4gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aCAtIDEpIHJldHVybiBmYWxzZTtcclxuICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbl0udHlwZSA9PSBzdGF0ZW1lbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXRSdW50aW1lKCkge1xyXG4gICAgICAgIHRoaXMucHJpbnRNYW5hZ2VyLmNsZWFyKCk7XHJcbiAgICAgICAgdGhpcy53b3JsZEhlbHBlcj8uZGVzdHJveVdvcmxkKCk7XHJcbiAgICAgICAgdGhpcy5wcm9jZXNzaW5nSGVscGVyPy5kZXN0cm95V29ybGQoKTtcclxuICAgICAgICB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlcj8uZGV0YWNoRXZlbnRzKCk7XHJcbiAgICAgICAgdGhpcy5nbmdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXIgPSBudWxsO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzdG9wKHJlc3RhcnQ6IGJvb2xlYW4gPSBmYWxzZSkge1xyXG4gICAgICAgIHRoaXMuaW5wdXRNYW5hZ2VyLmhpZGUoKTtcclxuICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUucGF1c2VkKTtcclxuICAgICAgICB0aGlzLnRpbWVyU3RvcHBlZCA9IHRydWU7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLndvcmxkSGVscGVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy53b3JsZEhlbHBlci5zcHJpdGVBbmltYXRpb25zID0gW107XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZ25nRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyPy5kZXRhY2hFdmVudHMoKTtcclxuICAgICAgICB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlciA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMubWFpbi5oaWRlUHJvZ3JhbVBvaW50ZXJQb3NpdGlvbigpO1xyXG5cclxuICAgICAgICB0aGlzLmdldFRpbWVyQ2xhc3MoKS5zdG9wVGltZXIoKTtcclxuICAgICAgICBpZiAodGhpcy53b3JsZEhlbHBlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRIZWxwZXIuY2FjaGVBc0JpdG1hcCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kYXRhYmFzZUNvbm5lY3Rpb25IZWxwZXJzLmZvckVhY2goKGNoKSA9PiBjaC5jbG9zZSgpKTtcclxuICAgICAgICB0aGlzLmRhdGFiYXNlQ29ubmVjdGlvbkhlbHBlcnMgPSBbXTtcclxuXHJcbiAgICAgICAgdGhpcy5oZWFwID0ge307XHJcbiAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sgPSBbXTtcclxuICAgICAgICB0aGlzLnN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5zdGFja2ZyYW1lcyA9IFtdO1xyXG5cclxuXHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5kb25lKTtcclxuICAgICAgICAgICAgdGhpcy5tYWluLmhpZGVQcm9ncmFtUG9pbnRlclBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgIGlmIChyZXN0YXJ0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCA1MDApO1xyXG4gICAgfVxyXG5cclxuICAgIHBhdXNlKCkge1xyXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5wYXVzZWQpO1xyXG4gICAgICAgIHRoaXMuc2hvd1Byb2dyYW1Qb2ludGVyQW5kVmFyaWFibGVzKCk7XHJcbiAgICAgICAgdGhpcy50aW1lclN0b3BwZWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGxhc3RQcmludGVkTW9kdWxlOiBNb2R1bGUgPSBudWxsO1xyXG4gICAgc2hvd1Byb2dyYW1Qb2ludGVyQW5kVmFyaWFibGVzKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtID09IG51bGwpIHJldHVybjtcclxuICAgICAgICBsZXQgbm9kZSA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50c1t0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb25dO1xyXG4gICAgICAgIGlmIChub2RlID09IG51bGwpIHJldHVybjtcclxuICAgICAgICBsZXQgcG9zaXRpb24gPSBub2RlLnBvc2l0aW9uO1xyXG4gICAgICAgIGlmIChwb3NpdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5zaG93UHJvZ3JhbVBvaW50ZXJQb3NpdGlvbih0aGlzLmN1cnJlbnRQcm9ncmFtLm1vZHVsZS5maWxlLCBwb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuZGVidWdnZXIuc2hvd0RhdGEodGhpcy5jdXJyZW50UHJvZ3JhbSwgcG9zaXRpb24sIHRoaXMuc3RhY2ssIHRoaXMuY3VycmVudFN0YWNrZnJhbWUsIHRoaXMuaGVhcCk7XHJcbiAgICAgICAgICAgIGxldCBib3R0b21EaXYgPSB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCk7XHJcbiAgICAgICAgICAgIGlmIChib3R0b21EaXYucHJvZ3JhbVByaW50ZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2dyYW0ubW9kdWxlICE9IHRoaXMubGFzdFByaW50ZWRNb2R1bGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCkucHJpbnRNb2R1bGVUb0JvdHRvbURpdihudWxsLCB0aGlzLmN1cnJlbnRQcm9ncmFtLm1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0UHJpbnRlZE1vZHVsZSA9IHRoaXMuY3VycmVudFByb2dyYW0ubW9kdWxlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluLmdldEJvdHRvbURpdigpLnByb2dyYW1QcmludGVyLnNob3dOb2RlKG5vZGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHN0ZXBPdXQoKSB7XHJcbiAgICAgICAgdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCA9IDA7XHJcbiAgICAgICAgdGhpcy5zdGFydCgpO1xyXG4gICAgfVxyXG5cclxuICAgIG9uZVN0ZXAoc3RlcEludG86IGJvb2xlYW4pIHtcclxuICAgICAgICB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCk/LmNvbnNvbGU/LmNsZWFyRXJyb3JzKCk7XHJcbiAgICAgICAgdGhpcy5pc0ZpcnN0U3RhdGVtZW50ID0gdHJ1ZTtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPSBJbnRlcnByZXRlclN0YXRlLnBhdXNlZCkge1xyXG4gICAgICAgICAgICB0aGlzLmluaXQoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5ub3RfaW5pdGlhbGl6ZWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnJlc2V0UnVudGltZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnNob3dQcm9ncmFtUG9pbnRlckFuZFZhcmlhYmxlcygpO1xyXG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUucGF1c2VkKTtcclxuICAgICAgICAgICAgLy8gQXJlIHRoZXJlIHN0YXRpYyBWYXJpYWJsZXMgdG8gaW5pdGlhbGl6ZT9cclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudE1ldGhvZCA9PSBcIkhhdXB0cHJvZ3JhbW1cIikge1xyXG4gICAgICAgICAgICAgICAgLy8gTm8gc3RhdGljIHZhcmlhYmxlIGluaXRpYWxpemVyc1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCA9IDEwMDAwO1xyXG4gICAgICAgIGxldCBvbGRTdGVwT3Zlck5lc3RpbmdMZXZlbCA9IHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWw7XHJcbiAgICAgICAgbGV0IG5vZGUgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHNbdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uXTtcclxuICAgICAgICBsZXQgcG9zaXRpb24gPSBub2RlLnBvc2l0aW9uO1xyXG4gICAgICAgIGxldCBleGNlcHRpb24gPSB0aGlzLm5leHRTdGVwKCk7XHJcbiAgICAgICAgaWYgKGV4Y2VwdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGhyb3dFeGNlcHRpb24oZXhjZXB0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFzdGVwSW50byAmJiB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsID4gb2xkU3RlcE92ZXJOZXN0aW5nTGV2ZWwpIHtcclxuICAgICAgICAgICAgdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCA9IDA7XHJcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxlYXZlTGluZSA9IHBvc2l0aW9uLmxpbmU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxlYXZlTGluZSA9IC0xO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuc3RhcnQoKTtcclxuICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlID09IEludGVycHJldGVyU3RhdGUuZG9uZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluLmhpZGVQcm9ncmFtUG9pbnRlclBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dQcm9ncmFtUG9pbnRlckFuZFZhcmlhYmxlcygpO1xyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPSBJbnRlcnByZXRlclN0YXRlLndhaXRpbmdGb3JJbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5wYXVzZWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHN0ZXBGaW5pc2hlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgIG5leHRTdGVwKCk6IHN0cmluZyB7XHJcblxyXG4gICAgICAgIHRoaXMuc3RlcEZpbmlzaGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGxldCBub2RlOiBTdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgIGxldCBleGNlcHRpb246IHN0cmluZztcclxuXHJcbiAgICAgICAgd2hpbGUgKCF0aGlzLnN0ZXBGaW5pc2hlZCAmJiAhdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyAmJiBleGNlcHRpb24gPT0gbnVsbCkge1xyXG5cclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5jdXJyZW50UHJvZ3JhbSA9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA+IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUuZG9uZSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbm9kZSA9IHRoaXMuY3VycmVudFByb2dyYW0uc3RhdGVtZW50c1t0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb25dO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUuc3RlcEZpbmlzaGVkICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RlcEZpbmlzaGVkID0gbm9kZS5zdGVwRmluaXNoZWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGV4Y2VwdGlvbiA9IHRoaXMuZXhlY3V0ZU5vZGUobm9kZSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLnN0ZXBzKys7XHJcblxyXG4gICAgICAgIHJldHVybiBleGNlcHRpb247XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZU5vZGUobm9kZTogU3RhdGVtZW50KTogc3RyaW5nIHtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUuYnJlYWtwb2ludCAhPSBudWxsICYmICF0aGlzLmlzRmlyc3RTdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMucGF1c2UoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pc0ZpcnN0U3RhdGVtZW50ID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IHN0YWNrVG9wID0gdGhpcy5zdGFjay5sZW5ndGggLSAxO1xyXG4gICAgICAgIGxldCBzdGFja2ZyYW1lQmVnaW4gPSB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lO1xyXG4gICAgICAgIGxldCBzdGFjayA9IHRoaXMuc3RhY2s7XHJcbiAgICAgICAgbGV0IHZhbHVlOiBWYWx1ZTtcclxuXHJcbiAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuY2FzdFZhbHVlOlxyXG4gICAgICAgICAgICAgICAgbGV0IHJlbFBvcyA9IG5vZGUuc3RhY2tQb3NSZWxhdGl2ZSA9PSBudWxsID8gMCA6IG5vZGUuc3RhY2tQb3NSZWxhdGl2ZTtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2tbc3RhY2tUb3AgKyByZWxQb3NdO1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY2FzdGVkID0gdmFsdWUudHlwZS5jYXN0VG8odmFsdWUsIG5vZGUubmV3VHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhc3RlZCA9PSB1bmRlZmluZWQpIGNhc3RlZCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLnZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBub2RlLm5ld1R5cGVcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgKyByZWxQb3NdID0gY2FzdGVkO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5tZXNzYWdlKSByZXR1cm4gZXJyLm1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSByZXR1cm4gXCJCZWkgZGVtIENhc3RlbiB2b24gXCIgKyB2YWx1ZS50eXBlLmlkZW50aWZpZXIgKyBcIiB6dSBcIiArIG5vZGUubmV3VHlwZS5pZGVudGlmaWVyICsgXCIgdHJhdCBlaW4gRmVobGVyIGF1ZjogXCIgKyBlcnIubmFtZSArIFwiLlwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmNoZWNrQ2FzdDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2tbc3RhY2tUb3BdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLnZhbHVlID09IG51bGwpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJ0byA9IDxSdW50aW1lT2JqZWN0PnZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUubmV3VHlwZSBpbnN0YW5jZW9mIEtsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBydG8gPT0gXCJvYmplY3RcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJ0by5jbGFzcy5oYXNBbmNlc3Rvck9ySXMobm9kZS5uZXdUeXBlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcIkRhcyBPYmpla3QgZGVyIEtsYXNzZSBcIiArIHJ0by5jbGFzcy5pZGVudGlmaWVyICsgXCIga2FubiBuaWNodCBuYWNoIFwiICsgbm9kZS5uZXdUeXBlLmlkZW50aWZpZXIgKyBcIiBnZWNhc3RldCB3ZXJkZW4uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBydG8gPT0gXCJudW1iZXJcIiAmJiBbXCJJbnRlZ2VyXCIsIFwiRG91YmxlXCIsIFwiRmxvYXRcIl0uaW5kZXhPZihub2RlLm5ld1R5cGUuaWRlbnRpZmllcikgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFwiRWluZSBaYWhsIGthbm4gbmljaHQgbmFjaCBcIiArIG5vZGUubmV3VHlwZS5pZGVudGlmaWVyICsgXCIgZ2VjYXN0ZXQgd2VyZGVuLlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcnRvID09IFwic3RyaW5nXCIgJiYgW1wiU3RyaW5nXCIsIFwiQ2hhcmFjdGVyXCJdLmluZGV4T2Yobm9kZS5uZXdUeXBlLmlkZW50aWZpZXIpIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcIkVpbmUgWmVpY2hlbmtldHRlIGthbm4gbmljaHQgbmFjaCBcIiArIG5vZGUubmV3VHlwZS5pZGVudGlmaWVyICsgXCIgZ2VjYXN0ZXQgd2VyZGVuLlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcnRvID09IFwiYm9vbGVhblwiICYmIG5vZGUubmV3VHlwZS5pZGVudGlmaWVyICE9IFwiQm9vbGVhblwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFwiRWluIGJvb2xlc2NoZXIgV2VydCBrYW5uIG5pY2h0IG5hY2ggXCIgKyBub2RlLm5ld1R5cGUuaWRlbnRpZmllciArIFwiIGdlY2FzdGV0IHdlcmRlbi5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGUubmV3VHlwZSBpbnN0YW5jZW9mIEludGVyZmFjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghKDxLbGFzcz5ydG8uY2xhc3MpLmltcGxlbWVudHNJbnRlcmZhY2Uobm9kZS5uZXdUeXBlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFwiRGFzIE9iamVrdCBkZXIgS2xhc3NlIFwiICsgcnRvLmNsYXNzLmlkZW50aWZpZXIgKyBcIiBpbXBsZW1lbnRpZXJ0IG5pY2h0IGRhcyBJbnRlcmZhY2UgXCIgKyBub2RlLm5ld1R5cGUuaWRlbnRpZmllciArIFwiLlwiKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubG9jYWxWYXJpYWJsZURlY2xhcmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgbGV0IHZhcmlhYmxlID0gbm9kZS52YXJpYWJsZTtcclxuICAgICAgICAgICAgICAgIGxldCB0eXBlID0gdmFyaWFibGUudHlwZTtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG51bGxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHR5cGUuaW5pdGlhbFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc3RhY2tbdmFyaWFibGUuc3RhY2tQb3MgKyBzdGFja2ZyYW1lQmVnaW5dID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5wdXNoT25Ub3BPZlN0YWNrRm9ySW5pdGlhbGl6YXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wdXNoTG9jYWxWYXJpYWJsZVRvU3RhY2s6XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHN0YWNrW25vZGUuc3RhY2twb3NPZlZhcmlhYmxlICsgc3RhY2tmcmFtZUJlZ2luXSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucG9wQW5kU3RvcmVJbnRvVmFyaWFibGU6XHJcbiAgICAgICAgICAgICAgICBzdGFja1tub2RlLnN0YWNrcG9zT2ZWYXJpYWJsZSArIHN0YWNrZnJhbWVCZWdpbl0gPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wdXNoQXR0cmlidXRlOlxyXG4gICAgICAgICAgICAgICAgbGV0IG9iamVjdDEgPSBub2RlLnVzZVRoaXNPYmplY3QgPyBzdGFja1tzdGFja2ZyYW1lQmVnaW5dLnZhbHVlIDogc3RhY2sucG9wKCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0MSA9PSBudWxsKSByZXR1cm4gXCJadWdyaWZmIGF1ZiBlaW4gQXR0cmlidXQgKFwiICsgbm9kZS5hdHRyaWJ1dGVJZGVudGlmaWVyICsgXCIpIGRlcyBudWxsLU9iamVrdHNcIjtcclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZTEgPSAoPFJ1bnRpbWVPYmplY3Q+b2JqZWN0MSkuZ2V0VmFsdWUobm9kZS5hdHRyaWJ1dGVJbmRleCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUxPy51cGRhdGVWYWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUxLnVwZGF0ZVZhbHVlKHZhbHVlMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHZhbHVlMSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaEFycmF5TGVuZ3RoOlxyXG4gICAgICAgICAgICAgICAgbGV0IGEgPSBzdGFjay5wb3AoKS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGlmIChhID09IG51bGwpIHJldHVybiBcIlp1Z3JpZmYgYXVmIGRhcyBsZW5ndGgtQXR0cmlidXQgZGVzIG51bGwtT2JqZWt0c1wiO1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh7IHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIHZhbHVlOiAoPGFueVtdPmEpLmxlbmd0aCB9KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5hc3NpZ25tZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgPSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGlmICghKHN0YWNrW3N0YWNrVG9wIC0gMV0udHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS50eXBlID0gdmFsdWUudHlwZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICghbm9kZS5sZWF2ZVZhbHVlT25TdGFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnBsdXNBc3NpZ25tZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgKz0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubWludXNBc3NpZ25tZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgLT0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubXVsdGlwbGljYXRpb25Bc3NpZ25tZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgKj0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZGl2aXNpb25Bc3NpZ25tZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgLz0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubW9kdWxvQXNzaWdubWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlICU9IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLkFOREFzc2lnbWVudDpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdLnZhbHVlICY9IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLk9SQXNzaWdtZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgfD0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuWE9SQXNzaWdtZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgXj0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2hpZnRMZWZ0QXNzaWdtZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgPDw9IHZhbHVlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnNoaWZ0UmlnaHRBc3NpZ21lbnQ6XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3AgLSAxXS52YWx1ZSA+Pj0gdmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2hpZnRSaWdodFVuc2lnbmVkQXNzaWdtZW50OlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHN0YWNrW3N0YWNrVG9wIC0gMV0udmFsdWUgPj4+PSB2YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5iaW5hcnlPcDpcclxuICAgICAgICAgICAgICAgIGxldCBzZWNvbmRPcGVyYW5kID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0VmFsdWUgPVxyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUubGVmdFR5cGUuY29tcHV0ZShub2RlLm9wZXJhdG9yLCBzdGFja1tzdGFja1RvcCAtIDFdLCBzZWNvbmRPcGVyYW5kKTtcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHRWYWx1ZSBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdFZhbHVlLm1lc3NhZ2UpIHJldHVybiByZXN1bHRWYWx1ZS5tZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgXCJCZWkgZGVyIEJlcmVjaG51bmcgdm9uIFwiICsgc3RhY2tbc3RhY2tUb3AgLSAxXS50eXBlLmlkZW50aWZpZXIgKyBcIiBcIiArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFRva2VuVHlwZVJlYWRhYmxlW25vZGUub3BlcmF0b3JdICsgXCIgXCIgKyBzZWNvbmRPcGVyYW5kLnR5cGUuaWRlbnRpZmllciArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiIHRyYXQgZWluIEZlaGxlciAoXCIgKyByZXN1bHRWYWx1ZS5uYW1lICsgXCIpIGF1Zi5cIlxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCByZXN1bHRUeXBlID0gbm9kZS5sZWZ0VHlwZS5nZXRSZXN1bHRUeXBlKG5vZGUub3BlcmF0b3IsIHNlY29uZE9wZXJhbmQudHlwZSk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcCAtIDFdID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHJlc3VsdFR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHJlc3VsdFZhbHVlXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnVuYXJ5T3A6XHJcbiAgICAgICAgICAgICAgICBsZXQgb2xkVmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLm9wZXJhdG9yID09IFRva2VuVHlwZS5taW51cykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBvbGRWYWx1ZS50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogLW9sZFZhbHVlLnZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IG9sZFZhbHVlLnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAhb2xkVmFsdWUudmFsdWVcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hDb25zdGFudDpcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBub2RlLnZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vZGUuZGF0YVR5cGVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnB1c2hTdGF0aWNDbGFzc09iamVjdDpcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmtsYXNzIGluc3RhbmNlb2YgS2xhc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogbm9kZS5rbGFzcy5zdGF0aWNDbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG5vZGUua2xhc3Muc3RhdGljQ2xhc3MuY2xhc3NPYmplY3RcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyB0byBlbmFibGUgaW5zdGFuY2VvZiBvcGVyYXRvciB3aXRoIGludGVyZmFjZXNcclxuICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogbm9kZS5rbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG5vZGUua2xhc3NcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wdXNoU3RhdGljQXR0cmlidXRlOlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBub2RlLmtsYXNzLmNsYXNzT2JqZWN0LmdldFZhbHVlKG5vZGUuYXR0cmlidXRlSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLnVwZGF0ZVZhbHVlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZS51cGRhdGVWYWx1ZSh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAvLyBjYXNlIFRva2VuVHlwZS5wdXNoU3RhdGljQXR0cmlidXRlSW50cmluc2ljOlxyXG4gICAgICAgICAgICAvLyAgICAgdmFsdWUgPSBub2RlLlxyXG4gICAgICAgICAgICAvLyAgICAgc3RhY2sucHVzaCh7IHR5cGU6IG5vZGUuYXR0cmlidXRlLnR5cGUsIHZhbHVlOiBub2RlLmF0dHJpYnV0ZS51cGRhdGVWYWx1ZShudWxsKSB9KTtcclxuICAgICAgICAgICAgLy8gICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zZWxlY3RBcnJheUVsZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5kZXggPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIGxldCBhcnJheSA9IHN0YWNrLnBvcCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhcnJheS52YWx1ZSA9PSBudWxsKSByZXR1cm4gXCJadWdyaWZmIGF1ZiBlaW4gRWxlbWVudCBlaW5lcyBudWxsLUZlbGRlc1wiO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpbmRleC52YWx1ZSA+PSBhcnJheS52YWx1ZS5sZW5ndGggfHwgaW5kZXgudmFsdWUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiWnVncmlmZiBhdWYgZGFzIEVsZW1lbnQgbWl0IEluZGV4IFwiICsgaW5kZXgudmFsdWUgKyBcIiBlaW5lcyBGZWxkZXMgZGVyIEzDpG5nZSBcIiArIGFycmF5LnZhbHVlLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goYXJyYXkudmFsdWVbaW5kZXgudmFsdWVdKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuY2FsbE1haW5NZXRob2Q6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YWNrLnB1c2goeyB2YWx1ZTogbm9kZS5zdGF0aWNDbGFzcy5jbGFzc09iamVjdCwgdHlwZTogbm9kZS5zdGF0aWNDbGFzcyB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVyOiBWYWx1ZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogW3sgdmFsdWU6IFwiVGVzdFwiLCB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlIH1dLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG5ldyBBcnJheVR5cGUoc3RyaW5nUHJpbWl0aXZlVHlwZSlcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1ldGVyQmVnaW4yID0gc3RhY2tUb3AgKyAyOyAvLyAxIHBhcmFtZXRlclxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhY2sucHVzaChwYXJhbWV0ZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhY2tmcmFtZXMucHVzaCh0aGlzLmN1cnJlbnRTdGFja2ZyYW1lKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvZ3JhbVN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHByb2dyYW06IHRoaXMuY3VycmVudFByb2dyYW0sXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbVBvc2l0aW9uOiB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gKyAxLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHRQb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IHRoaXMuY3VycmVudE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFja0FmdGVyUmV0dXJuOiB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IG51bGxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9IHBhcmFtZXRlckJlZ2luMjtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gbm9kZS5tZXRob2QucHJvZ3JhbTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE1ldGhvZCA9IG5vZGUubWV0aG9kO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gLTE7IC8vIGdldHMgaW5jcmVhc2VkIGFmdGVyIHN3aXRjaCBzdGF0ZW1lbnQuLi5cclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUubWV0aG9kLnJlc2VydmVTdGFja0ZvckxvY2FsVmFyaWFibGVzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwrKztcclxuXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubWFrZUVsbGlwc2lzQXJyYXk6XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxsaXBzaXNBcnJheTogVmFsdWVbXSA9IHN0YWNrLnNwbGljZShzdGFjay5sZW5ndGggLSBub2RlLnBhcmFtZXRlckNvdW50LCBub2RlLnBhcmFtZXRlckNvdW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZWxsaXBzaXNBcnJheSxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBub2RlLmFycmF5VHlwZVxyXG4gICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuY2FsbE1ldGhvZDpcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBub2RlLnN0YWNrZnJhbWViZWdpbiA9IC0ocGFyYW1ldGVycy5wYXJhbWV0ZXJUeXBlcy5sZW5ndGggKyAxKVxyXG4gICAgICAgICAgICAgICAgbGV0IG1ldGhvZCA9IG5vZGUubWV0aG9kO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJCZWdpbiA9IHN0YWNrVG9wICsgMSArIG5vZGUuc3RhY2tmcmFtZUJlZ2luO1xyXG4gICAgICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMxID0gbWV0aG9kLnBhcmFtZXRlcmxpc3QucGFyYW1ldGVycztcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBwYXJhbWV0ZXJCZWdpbiArIDE7IGkgPD0gc3RhY2tUb3A7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YWNrW2ldICE9IG51bGwgJiYgdGhpcy5zdGFja1tpXS50eXBlIGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFja1tpXSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHBhcmFtZXRlcnMxW2kgLSBwYXJhbWV0ZXJCZWdpbiAtIDFdLnR5cGUsICAvLyBjYXN0IHRvIHBhcmFtZXRlciB0eXBlLi4uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogc3RhY2tbaV0udmFsdWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhY2tbcGFyYW1ldGVyQmVnaW5dLnZhbHVlID09IG51bGwgJiYgIW1ldGhvZC5pc1N0YXRpYykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIkF1ZnJ1ZiBkZXIgTWV0aG9kZSBcIiArIG1ldGhvZC5pZGVudGlmaWVyICsgXCIgZGVzIG51bGwtT2JqZWt0c1wiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtZXRob2QuaXNBYnN0cmFjdCB8fCBtZXRob2QuaXNWaXJ0dWFsICYmICFub2RlLmlzU3VwZXJDYWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9iamVjdCA9IHN0YWNrW3BhcmFtZXRlckJlZ2luXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAob2JqZWN0LnZhbHVlIGluc3RhbmNlb2YgUnVudGltZU9iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2QgPSAoPEtsYXNzPig8UnVudGltZU9iamVjdD5vYmplY3QudmFsdWUpLmNsYXNzKS5nZXRNZXRob2RCeVNpZ25hdHVyZShtZXRob2Quc2lnbmF0dXJlKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2QgPSAoPEtsYXNzPm9iamVjdC50eXBlKS5nZXRNZXRob2RCeVNpZ25hdHVyZShtZXRob2Quc2lnbmF0dXJlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG1ldGhvZCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogcmFpc2UgcnVudGltZSBlcnJvclxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtZXRob2QuaW52b2tlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcnQgPSBtZXRob2QuZ2V0UmV0dXJuVHlwZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0gc3RhY2suc3BsaWNlKHBhcmFtZXRlckJlZ2luKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcmV0dXJuVmFsdWUgPSBtZXRob2QuaW52b2tlKHBhcmFtZXRlcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChydCAhPSBudWxsICYmIHJ0LmlkZW50aWZpZXIgIT0gJ3ZvaWQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHJldHVyblZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogcnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YWNrZnJhbWVzLnB1c2godGhpcy5jdXJyZW50U3RhY2tmcmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW06IHRoaXMuY3VycmVudFByb2dyYW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW1Qb3NpdGlvbjogdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uICsgMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dFBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IHRoaXMuY3VycmVudE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tBZnRlclJldHVybjogdGhpcy5jdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNDYWxsZWRGcm9tT3V0c2lkZTogbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lID0gcGFyYW1ldGVyQmVnaW47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBtZXRob2QucHJvZ3JhbTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRNZXRob2QgPSBtZXRob2Q7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gLTE7IC8vIGdldHMgaW5jcmVhc2VkIGFmdGVyIHN3aXRjaCBzdGF0ZW1lbnQuLi5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtZXRob2QucmVzZXJ2ZVN0YWNrRm9yTG9jYWxWYXJpYWJsZXM7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmNhbGxJbnB1dE1ldGhvZDpcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBub2RlLnN0YWNrZnJhbWViZWdpbiA9IC0ocGFyYW1ldGVycy5wYXJhbWV0ZXJUeXBlcy5sZW5ndGggKyAxKVxyXG4gICAgICAgICAgICAgICAgbGV0IG1ldGhvZDEgPSBub2RlLm1ldGhvZDtcclxuICAgICAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJCZWdpbjEgPSBzdGFja1RvcCArIDEgKyBub2RlLnN0YWNrZnJhbWVCZWdpbjtcclxuICAgICAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0gc3RhY2suc3BsaWNlKHBhcmFtZXRlckJlZ2luMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wYXVzZUZvcklucHV0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbnB1dE1hbmFnZXIucmVhZElucHV0KG1ldGhvZDEsIHBhcmFtZXRlcnMsICh2YWx1ZTogVmFsdWUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LnJlc3VtZUFmdGVySW5wdXQodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnJldHVybjpcclxuICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuKG5vZGUsIHN0YWNrKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5kZWNyZWFzZVN0YWNrcG9pbnRlcjpcclxuICAgICAgICAgICAgICAgIHN0YWNrLnNwbGljZShzdGFja1RvcCArIDEgLSBub2RlLnBvcENvdW50KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5pbml0U3RhY2tmcmFtZTpcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhY2tmcmFtZXMucHVzaCh0aGlzLmN1cnJlbnRTdGFja2ZyYW1lKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSBzdGFja1RvcCArIDE7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUucmVzZXJ2ZUZvckxvY2FsVmFyaWFibGVzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmNsb3NlU3RhY2tmcmFtZTpcclxuICAgICAgICAgICAgICAgIHN0YWNrLnNwbGljZShzdGFja2ZyYW1lQmVnaW4pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9IHRoaXMuc3RhY2tmcmFtZXMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubmV3T2JqZWN0OlxyXG4gICAgICAgICAgICAgICAgbGV0IG9iamVjdCA9IG5ldyBSdW50aW1lT2JqZWN0KG5vZGUuY2xhc3MpO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhbHVlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBvYmplY3QsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogbm9kZS5jbGFzc1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLnN1YnNlcXVlbnRDb25zdHJ1Y3RvckNhbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBzdGFja1RvcCsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBrbGFzczogS2xhc3MgPSBub2RlLmNsYXNzO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoaWxlIChrbGFzcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFpcCA9IGtsYXNzLmF0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYWlwLnN0YXRlbWVudHMubGVuZ3RoID4gMCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFja2ZyYW1lcy5wdXNoKHRoaXMuY3VycmVudFN0YWNrZnJhbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2dyYW1TdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW06IHRoaXMuY3VycmVudFByb2dyYW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtUG9zaXRpb246IHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiArIDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0UG9zaXRpb246IG5vZGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IHRoaXMuY3VycmVudE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NhbGxlZEZyb21PdXRzaWRlOiBudWxsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybiA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YWNrZnJhbWUgPSBzdGFja1RvcCArIDE7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gYWlwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TWV0aG9kID0gXCJLb25zdHJ1a3RvciB2b24gXCIgKyBrbGFzcy5pZGVudGlmaWVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsKys7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGtsYXNzID0ga2xhc3MuYmFzZUNsYXNzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIE4uQi46IGNvbnN0cnVjdG9yIGNhbGwgaXMgbmV4dCBzdGF0ZW1lbnRcclxuXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHJvY2Vzc1Bvc3RDb25zdHJ1Y3RvckNhbGxiYWNrczpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2tbc3RhY2tUb3BdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNsYXNzVHlwZSA9IDxLbGFzcz52YWx1ZS50eXBlO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgcGNjIG9mIGNsYXNzVHlwZS5nZXRQb3N0Q29uc3RydWN0b3JDYWxsYmFja3MoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBjYyh2YWx1ZS52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZXh0ZW5kZWRGb3JMb29wSW5pdDpcclxuICAgICAgICAgICAgICAgIHN0YWNrW25vZGUuc3RhY2tQb3NPZkNvdW50ZXIgKyBzdGFja2ZyYW1lQmVnaW5dID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5leHRlbmRlZEZvckxvb3BDaGVja0NvdW50ZXJBbmRHZXRFbGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbGV0IGNvdW50ZXI6IG51bWJlciA9IHN0YWNrW25vZGUuc3RhY2tQb3NPZkNvdW50ZXIgKyBzdGFja2ZyYW1lQmVnaW5dLnZhbHVlKys7XHJcbiAgICAgICAgICAgICAgICBsZXQgY29sbGVjdGlvbiA9IHN0YWNrW25vZGUuc3RhY2tQb3NPZkNvbGxlY3Rpb24gKyBzdGFja2ZyYW1lQmVnaW5dLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIHN3aXRjaCAobm9kZS5raW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFycmF5XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb3VudGVyIDwgKDxhbnlbXT5jb2xsZWN0aW9uKS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrW25vZGUuc3RhY2tQb3NPZkVsZW1lbnQgKyBzdGFja2ZyYW1lQmVnaW5dLnZhbHVlID0gKDxhbnlbXT5jb2xsZWN0aW9uKVtjb3VudGVyXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrW25vZGUuc3RhY2tQb3NPZkVsZW1lbnQgKyBzdGFja2ZyYW1lQmVnaW5dLnR5cGUgPSAoPGFueVtdPmNvbGxlY3Rpb24pW2NvdW50ZXJdLnR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSBub2RlLmRlc3RpbmF0aW9uIC0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaW50ZXJuYWxMaXN0XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsaXN0OiBhbnlbXSA9ICg8TGlzdEhlbHBlcj4oPFJ1bnRpbWVPYmplY3Q+Y29sbGVjdGlvbikuaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl0pLnZhbHVlQXJyYXk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb3VudGVyIDwgbGlzdC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrW25vZGUuc3RhY2tQb3NPZkVsZW1lbnQgKyBzdGFja2ZyYW1lQmVnaW5dLnZhbHVlID0gbGlzdFtjb3VudGVyXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrW25vZGUuc3RhY2tQb3NPZkVsZW1lbnQgKyBzdGFja2ZyYW1lQmVnaW5dLnR5cGUgPSBsaXN0W2NvdW50ZXJdLnR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSBub2RlLmRlc3RpbmF0aW9uIC0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZ3JvdXBcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxpc3QxOiBhbnlbXSA9ICg8R3JvdXBIZWxwZXI+KDxSdW50aW1lT2JqZWN0PmNvbGxlY3Rpb24pLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXSkuc2hhcGVzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY291bnRlciA8IGxpc3QxLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2tbbm9kZS5zdGFja1Bvc09mRWxlbWVudCArIHN0YWNrZnJhbWVCZWdpbl0udmFsdWUgPSBsaXN0MVtjb3VudGVyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrW25vZGUuc3RhY2tQb3NPZkVsZW1lbnQgKyBzdGFja2ZyYW1lQmVnaW5dLnR5cGUgPSBsaXN0MVtjb3VudGVyXS5rbGFzcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IG5vZGUuZGVzdGluYXRpb24gLSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmluY3JlbWVudERlY3JlbWVudEJlZm9yZTpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2tbc3RhY2tUb3BdO1xyXG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWUgKz0gbm9kZS5pbmNyZW1lbnREZWNyZW1lbnRCeTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5pbmNyZW1lbnREZWNyZW1lbnRBZnRlcjpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2tbc3RhY2tUb3BdO1xyXG4gICAgICAgICAgICAgICAgLy8gcmVwbGFjZSB2YWx1ZSBieSBjb3B5OlxyXG4gICAgICAgICAgICAgICAgc3RhY2tbc3RhY2tUb3BdID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZS52YWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB2YWx1ZS50eXBlXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgLy8gaW5jcmVtZW50IHZhbHVlIHdoaWNoIGlzIG5vdCBpbnZvbHZlZCBpbiBzdWJzZXF1ZW50IFxyXG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWUgKz0gbm9kZS5pbmNyZW1lbnREZWNyZW1lbnRCeTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5qdW1wQWx3YXlzOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuanVtcElmVHJ1ZTpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoPGJvb2xlYW4+dmFsdWUudmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSBub2RlLmRlc3RpbmF0aW9uIC0gMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5qdW1wSWZGYWxzZTpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoISg8Ym9vbGVhbj52YWx1ZS52YWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSBub2RlLmRlc3RpbmF0aW9uIC0gMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5qdW1wSWZUcnVlQW5kTGVhdmVPblN0YWNrOlxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGFja1tzdGFja1RvcF07XHJcbiAgICAgICAgICAgICAgICBpZiAoPGJvb2xlYW4+dmFsdWUudmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSBub2RlLmRlc3RpbmF0aW9uIC0gMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5qdW1wSWZGYWxzZUFuZExlYXZlT25TdGFjazpcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhY2tbc3RhY2tUb3BdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCEoPGJvb2xlYW4+dmFsdWUudmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZXN0aW5hdGlvbiAtIDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubm9PcDpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wcm9ncmFtRW5kOlxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnByb2dyYW1TdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3BQcm9ncmFtKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uLS07IC8vIGdldHMgaW5jcmVhc2VkIGxhdGVyIG9uIGFmdGVyIHN3aXRjaCBlbmRzXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sZWF2ZUxpbmUgPSAtMTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUucGF1c2VBZnRlclByb2dyYW1FbmQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCA9IC0xO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCh0aGlzLndvcmxkSGVscGVyICE9IG51bGwgJiYgdGhpcy53b3JsZEhlbHBlci5oYXNBY3RvcnMoKSkgfHwgdGhpcy5wcm9jZXNzaW5nSGVscGVyICE9IG51bGxcclxuICAgICAgICAgICAgICAgICAgICB8fCAodGhpcy5nbmdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXIgIT0gbnVsbCAmJiB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlci5oYXNBa3Rpb25zRW1wZmFlbmdlcigpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbi0tO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGJhc2VNb2R1bGUgPSB0aGlzLm1haW4uZ2V0Q3VycmVudFdvcmtzcGFjZSgpLm1vZHVsZVN0b3JlLmdldE1vZHVsZShcIkJhc2UgTW9kdWxlXCIpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHRpbWVyQ2xhc3M6IFRpbWVyQ2xhc3MgPSA8VGltZXJDbGFzcz5iYXNlTW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiVGltZXJcIik7XHJcbiAgICAgICAgICAgICAgICBpZiAodGltZXJDbGFzcy50aW1lckVudHJpZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbi0tO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5zZXRTdGF0ZShJbnRlcnByZXRlclN0YXRlLmRvbmUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSAtMTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWcgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIEhlbHBlci5zaG93SGVscGVyKFwic3BlZWRDb250cm9sSGVscGVyXCIsIHRoaXMubWFpbik7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcmludE1hbmFnZXIuc2hvd1Byb2dyYW1FbmQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGVwcyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZHQgPSBwZXJmb3JtYW5jZS5ub3coKSAtIHRoaXMudGltZVdoZW5Qcm9ncmFtU3RhcnRlZDtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZSA9ICdFeGVjdXRlZCAnICsgdGhpcy5zdGVwcyArICcgc3RlcHMgaW4gJyArIHRoaXMucm91bmQoZHQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJyBtcyAoJyArIHRoaXMucm91bmQodGhpcy5zdGVwcyAvIGR0ICogMTAwMCkgKyAnIHN0ZXBzL3MpJztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCk/LmNvbnNvbGU/LndyaXRlQ29uc29sZUVudHJ5KG1lc3NhZ2UsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMudGltZXJFdmVudHMgKyBcIiBUaW1lRXZlbnRzIGluIFwiICsgZHQgKyBcIiBtcyBlcmdpYnQgZWluIEV2ZW50IGFsbGUgXCIgKyBkdC90aGlzLnRpbWVyRXZlbnRzICsgXCIgbXMuXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiVm9yZ2VnZWJlbmUgVGltZXJmcmVxdWVuejogQWxsZSBcIiArIHRoaXMudGltZXJEZWxheU1zICsgXCIgbXNcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGVwcyA9IC0xO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIGlmICh0aGlzLndvcmxkSGVscGVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICB0aGlzLndvcmxkSGVscGVyLnNwcml0ZUFuaW1hdGlvbnMgPSBbXTtcclxuICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgIC8vIHRoaXMuZ25nRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyPy5kZXRhY2hFdmVudHMoKTtcclxuICAgICAgICAgICAgICAgIC8vIHRoaXMuZ25nRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzLm1haW4uaGlkZVByb2dyYW1Qb2ludGVyUG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBpZih0aGlzLndvcmxkSGVscGVyICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIHRoaXMud29ybGRIZWxwZXIuY2FjaGVBc0JpdG1hcCgpO1xyXG4gICAgICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbi0tO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHJpbnQ6XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnByaW50bG46XHJcbiAgICAgICAgICAgICAgICBsZXQgdGV4dCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBsZXQgY29sb3IgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUud2l0aENvbG9yKSBjb2xvciA9IDxzdHJpbmcgfCBudW1iZXI+c3RhY2sucG9wKCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGUuZW1wdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0ID0gPHN0cmluZz5zdGFjay5wb3AoKS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGV4dCA9PSBudWxsKSB0ZXh0ID0gXCJudWxsXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFRva2VuVHlwZS5wcmludGxuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludE1hbmFnZXIucHJpbnRsbih0ZXh0LCBjb2xvcik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRNYW5hZ2VyLnByaW50KHRleHQsIGNvbG9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wdXNoRW1wdHlBcnJheTpcclxuICAgICAgICAgICAgICAgIGxldCBjb3VudHM6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUuZGltZW5zaW9uOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb3VudHMucHVzaCg8bnVtYmVyPnN0YWNrLnBvcCgpLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2godGhpcy5tYWtlRW1wdHlBcnJheShjb3VudHMsIG5vZGUuYXJyYXlUeXBlKSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuYmVnaW5BcnJheTpcclxuICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vZGUuYXJyYXlUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBbXVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuYWRkVG9BcnJheTpcclxuICAgICAgICAgICAgICAgIHN0YWNrVG9wIC09IG5vZGUubnVtYmVyT2ZFbGVtZW50c1RvQWRkO1xyXG4gICAgICAgICAgICAgICAgLy8gbGV0IHZhbHVlczogVmFsdWVbXSA9IHN0YWNrLnNwbGljZShzdGFja1RvcCArIDEsIG5vZGUubnVtYmVyT2ZFbGVtZW50c1RvQWRkKTtcclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZXM6IFZhbHVlW10gPSBzdGFjay5zcGxpY2Uoc3RhY2tUb3AgKyAxLCBub2RlLm51bWJlck9mRWxlbWVudHNUb0FkZCkubWFwKHR2byA9PiAoeyB0eXBlOiB0dm8udHlwZSwgdmFsdWU6IHR2by52YWx1ZSB9KSk7XHJcbiAgICAgICAgICAgICAgICBzdGFja1tzdGFja1RvcF0udmFsdWUgPSAoPGFueVtdPnN0YWNrW3N0YWNrVG9wXS52YWx1ZSkuY29uY2F0KHZhbHVlcyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaEVudW1WYWx1ZTpcclxuICAgICAgICAgICAgICAgIGxldCBlbnVtSW5mbyA9IG5vZGUuZW51bUNsYXNzLmlkZW50aWZpZXJUb0luZm9NYXBbbm9kZS52YWx1ZUlkZW50aWZpZXJdO1xyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaChub2RlLmVudW1DbGFzcy52YWx1ZUxpc3QudmFsdWVbZW51bUluZm8ub3JkaW5hbF0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmtleXdvcmRTd2l0Y2g6XHJcbiAgICAgICAgICAgICAgICBsZXQgc3dpdGNoVmFsdWUgPSBzdGFjay5wb3AoKS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBkZXN0aW5hdGlvbiA9IG5vZGUuZGVzdGluYXRpb25NYXBbc3dpdGNoVmFsdWVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlc3RpbmF0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSBkZXN0aW5hdGlvbiAtIDE7IC8vIGl0IHdpbGwgYmUgaW5jcmVhc2VkIGFmdGVyIHRoaXMgc3dpdGNoLXN0YXRlbWVudCFcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuZGVmYXVsdERlc3RpbmF0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uID0gbm9kZS5kZWZhdWx0RGVzdGluYXRpb24gLSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGVyZSdzIGEganVtcG5vZGUgYWZ0ZXIgdGhpcyBub2RlIHdoaWNoIGp1bXBzIHJpZ2h0IGFmdGVyIGxhc3Qgc3dpdGNoIGNhc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc28gdGhlcmUncyBub3RoaW5nIG1vcmUgdG8gZG8gaGVyZS5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5oZWFwVmFyaWFibGVEZWNsYXJhdGlvbjpcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdiA9IG5vZGUudmFyaWFibGU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhlYXBbdi5pZGVudGlmaWVyXSA9IHY7XHJcbiAgICAgICAgICAgICAgICB2LnZhbHVlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHYudHlwZSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogKHYudHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpID8gdi50eXBlLmluaXRpYWxWYWx1ZSA6IG51bGxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChub2RlLnB1c2hPblRvcE9mU3RhY2tGb3JJbml0aWFsaXphdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhY2sucHVzaCh2LnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucHVzaEZyb21IZWFwVG9TdGFjazpcclxuICAgICAgICAgICAgICAgIGxldCB2MSA9IHRoaXMuaGVhcFtub2RlLmlkZW50aWZpZXJdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHYxICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YWNrLnB1c2godjEudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJEaWUgVmFyaWFibGUgXCIgKyBub2RlLmlkZW50aWZpZXIgKyBcIiBpc3QgbmljaHQgYmVrYW5udC5cIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5yZXR1cm5JZkRlc3Ryb3llZDpcclxuICAgICAgICAgICAgICAgIGxldCBzaGFwZVJ1bnRpbWVPYmplY3Q6IFJ1bnRpbWVPYmplY3QgPSB0aGlzLnN0YWNrW3N0YWNrZnJhbWVCZWdpbl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2hhcGVSdW50aW1lT2JqZWN0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc2hhcGUgPSBzaGFwZVJ1bnRpbWVPYmplY3QuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzaGFwZVtcImlzRGVzdHJveWVkXCJdID09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXR1cm4obnVsbCwgc3RhY2spO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zZXRQYXVzZUR1cmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgbGV0IGR1cmF0aW9uID0gdGhpcy5zdGFjay5wb3AoKS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBhdXNlVW50aWwgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGF1c2VVbnRpbCA9IHBlcmZvcm1hbmNlLm5vdygpICsgZHVyYXRpb247XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucGF1c2U6XHJcbiAgICAgICAgICAgICAgICBub2RlLnN0ZXBGaW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wYXVzZVVudGlsICE9IG51bGwgJiYgcGVyZm9ybWFuY2Uubm93KCkgPCB0aGlzLnBhdXNlVW50aWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24tLTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXVzZVVudGlsID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24rKztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgb2xkU3RhdGU6IEludGVycHJldGVyU3RhdGU7XHJcbiAgICBwYXVzZUZvcklucHV0KCkge1xyXG4gICAgICAgIHRoaXMudGltZXJTdG9wcGVkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLm9sZFN0YXRlID0gdGhpcy5zdGF0ZTtcclxuICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUud2FpdGluZ0ZvcklucHV0KTtcclxuICAgICAgICB0aGlzLnNob3dQcm9ncmFtUG9pbnRlckFuZFZhcmlhYmxlcygpO1xyXG4gICAgfVxyXG5cclxuICAgIHJlc3VtZUFmdGVySW5wdXQodmFsdWU6IFZhbHVlLCBwb3BQcmlvclZhbHVlOiBib29sZWFuID0gZmFsc2UpIHtcclxuICAgICAgICBpZiAocG9wUHJpb3JWYWx1ZSkgdGhpcy5zdGFjay5wb3AoKTtcclxuICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkgdGhpcy5zdGFjay5wdXNoKHZhbHVlKTtcclxuICAgICAgICB0aGlzLm1haW4uaGlkZVByb2dyYW1Qb2ludGVyUG9zaXRpb24oKTtcclxuICAgICAgICB0aGlzLnNldFN0YXRlKEludGVycHJldGVyU3RhdGUucGF1c2VkKTtcclxuICAgICAgICBpZiAodGhpcy5vbGRTdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLnJ1bm5pbmcpIHtcclxuICAgICAgICAgICAgdGhpcy5zdGFydCgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvd1Byb2dyYW1Qb2ludGVyQW5kVmFyaWFibGVzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgcmV0dXJuKG5vZGU6IFJldHVyblN0YXRlbWVudCB8IG51bGwsIHN0YWNrOiBWYWx1ZVtdKSB7XHJcblxyXG4gICAgICAgIGxldCBjdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybiA9IHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm47XHJcblxyXG4gICAgICAgIGlmIChub2RlICE9IG51bGwgJiYgbm9kZS5jb3B5UmV0dXJuVmFsdWVUb1N0YWNrZnJhbWVQb3MwKSB7XHJcbiAgICAgICAgICAgIGxldCByZXR1cm5WYWx1ZTogVmFsdWUgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgc3RhY2tbdGhpcy5jdXJyZW50U3RhY2tmcmFtZV0gPSByZXR1cm5WYWx1ZTtcclxuICAgICAgICAgICAgc3RhY2suc3BsaWNlKHRoaXMuY3VycmVudFN0YWNrZnJhbWUgKyAxKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzdGFjay5zcGxpY2UodGhpcy5jdXJyZW50U3RhY2tmcmFtZSArICgobm9kZSAhPSBudWxsICYmIG5vZGUubGVhdmVUaGlzT2JqZWN0T25TdGFjaykgPyAxIDogMCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9IHRoaXMuc3RhY2tmcmFtZXMucG9wKCk7XHJcblxyXG4gICAgICAgIHRoaXMucG9wUHJvZ3JhbSgpO1xyXG4gICAgICAgIGlmIChub2RlICE9IG51bGwgJiYgbm9kZS5tZXRob2RXYXNJbmplY3RlZCA9PSB0cnVlKSB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24rKztcclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24tLTsgIC8vIHBvc2l0aW9uIGdldHMgaW5jcmVhc2VkIGJ5IG9uZSBhdCB0aGUgZW5kIG9mIHRoaXMgc3dpdGNoLXN0YXRlbWVudCwgc28gLi4uIC0gMVxyXG4gICAgICAgIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwtLTtcclxuXHJcbiAgICAgICAgaWYgKGN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuICE9IG51bGwpIHtcclxuICAgICAgICAgICAgY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4odGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5zdGVwT3Zlck5lc3RpbmdMZXZlbCA8IDAgJiYgdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzW3RoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiArIDFdLnR5cGUgPT0gVG9rZW5UeXBlLmp1bXBBbHdheXMpIHtcclxuICAgICAgICAgICAgdGhpcy5zdGVwRmluaXNoZWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBtYWtlRW1wdHlBcnJheShjb3VudHM6IG51bWJlcltdLCB0eXBlOiBUeXBlKTogVmFsdWUge1xyXG4gICAgICAgIGxldCB0eXBlMSA9ICg8QXJyYXlUeXBlPnR5cGUpLmFycmF5T2ZUeXBlO1xyXG4gICAgICAgIGlmIChjb3VudHMubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgbGV0IGFycmF5OiBWYWx1ZVtdID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnRzWzBdOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCB2ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUxLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBudWxsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0eXBlMSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB2LnZhbHVlID0gdHlwZTEuaW5pdGlhbFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGFycmF5LnB1c2godik7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IGFycmF5XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IGFycmF5OiBWYWx1ZVtdID0gW107XHJcbiAgICAgICAgICAgIGxldCBuID0gY291bnRzLnBvcCgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgYXJyYXkucHVzaCh0aGlzLm1ha2VFbXB0eUFycmF5KGNvdW50cywgdHlwZTEpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogdHlwZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBhcnJheVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgcm91bmQobjogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gXCJcIiArIE1hdGgucm91bmQobiAqIDEwMDAwKSAvIDEwMDAwO1xyXG4gICAgfVxyXG5cclxuICAgIHJ1bm5pbmdTdGF0ZXM6IEludGVycHJldGVyU3RhdGVbXSA9IFtJbnRlcnByZXRlclN0YXRlLnBhdXNlZCwgSW50ZXJwcmV0ZXJTdGF0ZS5ydW5uaW5nLCBJbnRlcnByZXRlclN0YXRlLndhaXRpbmdGb3JJbnB1dF07XHJcblxyXG4gICAgc2V0U3RhdGUoc3RhdGU6IEludGVycHJldGVyU3RhdGUpIHtcclxuXHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJTZXQgc3RhdGUgXCIgKyBJbnRlcnByZXRlclN0YXRlW3N0YXRlXSk7XHJcblxyXG4gICAgICAgIGxldCBvbGRTdGF0ZSA9IHRoaXMuc3RhdGU7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xyXG5cclxuICAgICAgICBpZiAoc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5lcnJvciB8fCBzdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLmRvbmUpIHtcclxuICAgICAgICAgICAgdGhpcy5jbG9zZUFsbFdlYnNvY2tldHMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBhbSA9IHRoaXMubWFpbi5nZXRBY3Rpb25NYW5hZ2VyKCk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGFjdGlvbklkIG9mIHRoaXMuYWN0aW9ucykge1xyXG4gICAgICAgICAgICBhbS5zZXRBY3RpdmUoXCJpbnRlcnByZXRlci5cIiArIGFjdGlvbklkLCB0aGlzLmJ1dHRvbkFjdGl2ZU1hdHJpeFthY3Rpb25JZF1bc3RhdGVdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBidXR0b25TdGFydEFjdGl2ZSA9IHRoaXMuYnV0dG9uQWN0aXZlTWF0cml4WydzdGFydCddW3N0YXRlXTtcclxuXHJcbiAgICAgICAgaWYgKGJ1dHRvblN0YXJ0QWN0aXZlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblN0YXJ0LnNob3coKTtcclxuICAgICAgICAgICAgdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uUGF1c2UuaGlkZSgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udHJvbEJ1dHRvbnMuJGJ1dHRvblN0YXJ0LmhpZGUoKTtcclxuICAgICAgICAgICAgdGhpcy5jb250cm9sQnV0dG9ucy4kYnV0dG9uUGF1c2Uuc2hvdygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGJ1dHRvblN0b3BBY3RpdmUgPSB0aGlzLmJ1dHRvbkFjdGl2ZU1hdHJpeFsnc3RvcCddW3N0YXRlXTtcclxuICAgICAgICBpZiAoYnV0dG9uU3RvcEFjdGl2ZSkge1xyXG4gICAgICAgICAgICAvLyB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25FZGl0LnNob3coKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyB0aGlzLmNvbnRyb2xCdXR0b25zLiRidXR0b25FZGl0LmhpZGUoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMud29ybGRIZWxwZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53b3JsZEhlbHBlci5jbGVhckFjdG9yTGlzdHMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmduZ0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlcj8uZGV0YWNoRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZ25nRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJ1bm5pbmdTdGF0ZXMuaW5kZXhPZihvbGRTdGF0ZSkgPj0gMCAmJiB0aGlzLnJ1bm5pbmdTdGF0ZXMuaW5kZXhPZihzdGF0ZSkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGVidWdnZXIuZGlzYWJsZSgpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkudXBkYXRlT3B0aW9ucyh7IHJlYWRPbmx5OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgdGhpcy5rZXlib2FyZFRvb2wudW5zdWJzY3JpYmVBbGxMaXN0ZW5lcnMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJ1bm5pbmdTdGF0ZXMuaW5kZXhPZihvbGRTdGF0ZSkgPCAwICYmIHRoaXMucnVubmluZ1N0YXRlcy5pbmRleE9mKHN0YXRlKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGVidWdnZXIuZW5hYmxlKCk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMubWFpbi5nZXRNb25hY29FZGl0b3IoKS51cGRhdGVPcHRpb25zKHsgcmVhZE9ubHk6IHRydWUgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBjbG9zZUFsbFdlYnNvY2tldHMoKSB7XHJcbiAgICAgICAgdGhpcy53ZWJTb2NrZXRzVG9DbG9zZUFmdGVyUHJvZ3JhbUhhbHQuZm9yRWFjaChzb2NrZXQgPT4gc29ja2V0LmNsb3NlKCkpO1xyXG4gICAgICAgIHRoaXMud2ViU29ja2V0c1RvQ2xvc2VBZnRlclByb2dyYW1IYWx0ID0gW107XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHB1c2hDdXJyZW50UHJvZ3JhbSgpIHtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2dyYW0gPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgdGV4dFBvc2l0aW9uOiBUZXh0UG9zaXRpb247XHJcbiAgICAgICAgbGV0IGN1cnJlbnRTdGF0ZW1lbnQgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHNbdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uXTtcclxuICAgICAgICBpZiAoY3VycmVudFN0YXRlbWVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRleHRQb3NpdGlvbiA9IGN1cnJlbnRTdGF0ZW1lbnQucG9zaXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnByb2dyYW1TdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgcHJvZ3JhbTogdGhpcy5jdXJyZW50UHJvZ3JhbSxcclxuICAgICAgICAgICAgcHJvZ3JhbVBvc2l0aW9uOiB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24sXHJcbiAgICAgICAgICAgIHRleHRQb3NpdGlvbjogdGV4dFBvc2l0aW9uLFxyXG4gICAgICAgICAgICBtZXRob2Q6IHRoaXMuY3VycmVudE1ldGhvZCxcclxuICAgICAgICAgICAgY2FsbGJhY2tBZnRlclJldHVybjogdGhpcy5jdXJyZW50Q2FsbGJhY2tBZnRlclJldHVybixcclxuICAgICAgICAgICAgaXNDYWxsZWRGcm9tT3V0c2lkZTogdGhpcy5jdXJyZW50SXNDYWxsZWRGcm9tT3V0c2lkZVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4gPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY3VycmVudElzQ2FsbGVkRnJvbU91dHNpZGUgPSBudWxsO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyBydW5UaW1lcihtZXRob2Q6IE1ldGhvZCwgc3RhY2tFbGVtZW50czogVmFsdWVbXSxcclxuICAgIC8vICAgICBjYWxsYmFja0FmdGVyUmV0dXJuOiAoaW50ZXJwcmV0ZXI6IEludGVycHJldGVyKSA9PiB2b2lkKSB7XHJcblxyXG4gICAgLy8gICAgIGlmKHRoaXMuc3RhdGUgIT0gSW50ZXJwcmV0ZXJTdGF0ZS5ydW5uaW5nKXtcclxuICAgIC8vICAgICAgICAgcmV0dXJuO1xyXG4gICAgLy8gICAgIH1cclxuXHJcbiAgICAvLyAgICAgdGhpcy5wdXNoQ3VycmVudFByb2dyYW0oKTtcclxuXHJcbiAgICAvLyAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IG1ldGhvZC5wcm9ncmFtO1xyXG4gICAgLy8gICAgIHRoaXMuY3VycmVudE1ldGhvZCA9IG1ldGhvZDtcclxuICAgIC8vICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSAwO1xyXG4gICAgLy8gICAgIHRoaXMuY3VycmVudENhbGxiYWNrQWZ0ZXJSZXR1cm4gPSBjYWxsYmFja0FmdGVyUmV0dXJuO1xyXG4gICAgLy8gICAgIHRoaXMuY3VycmVudElzQ2FsbGVkRnJvbU91dHNpZGUgPSBcIlRpbWVyXCI7XHJcblxyXG4gICAgLy8gICAgIHRoaXMuc3RhY2tmcmFtZXMucHVzaCh0aGlzLmN1cnJlbnRTdGFja2ZyYW1lKTtcclxuICAgIC8vICAgICB0aGlzLmN1cnJlbnRTdGFja2ZyYW1lID0gdGhpcy5zdGFjay5sZW5ndGg7XHJcbiAgICAvLyAgICAgZm9yIChsZXQgc2Ugb2Ygc3RhY2tFbGVtZW50cykgdGhpcy5zdGFjay5wdXNoKHNlKTtcclxuICAgIC8vICAgICBsZXQgc3RhdGVtZW50cyA9IG1ldGhvZC5wcm9ncmFtLnN0YXRlbWVudHM7XHJcblxyXG4gICAgLy8gICAgIC8vIGlmIHByb2dyYW0gZW5kcyB3aXRoIHJldHVybiB0aGVuIHRoaXMgcmV0dXJuLXN0YXRlbWVudCBkZWNyZWFzZXMgc3RlcE92ZXJOZXN0aW5nTGV2ZWwuIFNvIHdlIGluY3JlYXNlIGl0XHJcbiAgICAvLyAgICAgLy8gYmVmb3JlaGFuZCB0byBjb21wZW5zYXRlIHRoaXMgZWZmZWN0LlxyXG4gICAgLy8gICAgIGlmKHN0YXRlbWVudHNbc3RhdGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IFRva2VuVHlwZS5yZXR1cm4pIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwrKztcclxuXHJcbiAgICAvLyB9XHJcblxyXG4gICAgcnVuVGltZXIobWV0aG9kOiBNZXRob2QsIHN0YWNrRWxlbWVudHM6IFZhbHVlW10sXHJcbiAgICAgICAgY2FsbGJhY2tBZnRlclJldHVybjogKGludGVycHJldGVyOiBJbnRlcnByZXRlcikgPT4gdm9pZCwgaXNBY3RvcjogYm9vbGVhbikge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPSBJbnRlcnByZXRlclN0YXRlLnJ1bm5pbmcpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHN0YXRlbWVudHMgPSBtZXRob2QucHJvZ3JhbS5zdGF0ZW1lbnRzO1xyXG5cclxuICAgICAgICBpZiAoaXNBY3RvciB8fCB0aGlzLnByb2dyYW1TdGFjay5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICAvLyBNYWluIFByb2dyYW0gaXMgcnVubmluZyA9PiBUaW1lciBoYXMgaGlnaGVyIHByZWNlZGVuY2VcclxuICAgICAgICAgICAgdGhpcy5wdXNoQ3VycmVudFByb2dyYW0oKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBtZXRob2QucHJvZ3JhbTtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50TWV0aG9kID0gbWV0aG9kO1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSAwO1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRDYWxsYmFja0FmdGVyUmV0dXJuID0gY2FsbGJhY2tBZnRlclJldHVybjtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50SXNDYWxsZWRGcm9tT3V0c2lkZSA9IFwiVGltZXJcIjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3RhY2tmcmFtZXMucHVzaCh0aGlzLmN1cnJlbnRTdGFja2ZyYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9IHRoaXMuc3RhY2subGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLnN0YWNrID0gdGhpcy5zdGFjay5jb25jYXQoc3RhY2tFbGVtZW50cyk7XHJcbiAgICAgICAgICAgIC8vIGZvciAobGV0IHNlIG9mIHN0YWNrRWxlbWVudHMpIHRoaXMuc3RhY2sucHVzaChzZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBpZiBwcm9ncmFtIGVuZHMgd2l0aCByZXR1cm4gdGhlbiB0aGlzIHJldHVybi1zdGF0ZW1lbnQgZGVjcmVhc2VzIHN0ZXBPdmVyTmVzdGluZ0xldmVsLiBTbyB3ZSBpbmNyZWFzZSBpdFxyXG4gICAgICAgICAgICAvLyBiZWZvcmVoYW5kIHRvIGNvbXBlbnNhdGUgdGhpcyBlZmZlY3QuXHJcbiAgICAgICAgICAgIGlmIChzdGF0ZW1lbnRzW3N0YXRlbWVudHMubGVuZ3RoIC0gMV0udHlwZSA9PSBUb2tlblR5cGUucmV0dXJuKSB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsKys7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gYW5vdGhlciBUaW1lciBpcyBydW5uaW5nID0+IHF1ZXVlIHVwXHJcbiAgICAgICAgICAgIC8vIHBvc2l0aW9uIDAgaW4gcHJvZ3JhbSBzdGFjayBpcyBtYWluIHByb2dyYW1cclxuICAgICAgICAgICAgLy8gPT4gaW5zZXJ0IHRpbWVyIGluIHBvc2l0aW9uIDFcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHJvZ3JhbVN0YWNrLnNwbGljZSgxLCAwLCB7XHJcbiAgICAgICAgICAgICAgICBwcm9ncmFtOiBtZXRob2QucHJvZ3JhbSxcclxuICAgICAgICAgICAgICAgIHByb2dyYW1Qb3NpdGlvbjogMCxcclxuICAgICAgICAgICAgICAgIHRleHRQb3NpdGlvbjogeyBsaW5lOiAwLCBjb2x1bW46IDAsIGxlbmd0aDogMCB9LFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja0FmdGVyUmV0dXJuOiBjYWxsYmFja0FmdGVyUmV0dXJuLFxyXG4gICAgICAgICAgICAgICAgaXNDYWxsZWRGcm9tT3V0c2lkZTogXCJUaW1lclwiLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tFbGVtZW50c1RvUHVzaEJlZm9yZUZpcnN0RXhlY3V0aW5nOiBzdGFja0VsZW1lbnRzXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHN0YXRlbWVudHNbc3RhdGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IFRva2VuVHlwZS5yZXR1cm4pIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwrKztcclxuXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXZhbHVhdGUocHJvZ3JhbTogUHJvZ3JhbSk6IHsgZXJyb3I6IHN0cmluZywgdmFsdWU6IFZhbHVlIH0ge1xyXG5cclxuICAgICAgICB0aGlzLnB1c2hDdXJyZW50UHJvZ3JhbSgpO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gcHJvZ3JhbTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSAwO1xyXG5cclxuICAgICAgICBsZXQgc3RhY2tzaXplQmVmb3JlID0gdGhpcy5zdGFjay5sZW5ndGg7XHJcblxyXG4gICAgICAgIGxldCBvbGRJbnRlcnByZXRlclN0YXRlID0gdGhpcy5zdGF0ZTtcclxuICAgICAgICBsZXQgc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSB0aGlzLnN0ZXBPdmVyTmVzdGluZ0xldmVsO1xyXG4gICAgICAgIGxldCBhZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZyA9IHRoaXMuYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWc7XHJcblxyXG4gICAgICAgIGxldCBvbGRTdGFja2ZyYW1lID0gdGhpcy5jdXJyZW50U3RhY2tmcmFtZTtcclxuXHJcbiAgICAgICAgbGV0IGVycm9yOiBzdHJpbmc7XHJcbiAgICAgICAgbGV0IHN0ZXBDb3VudCA9IDA7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHdoaWxlIChlcnJvciA9PSBudWxsICYmXHJcbiAgICAgICAgICAgICAgICAodGhpcy5jdXJyZW50UHJvZ3JhbSAhPSBwcm9ncmFtIHx8IHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA8XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbS5zdGF0ZW1lbnRzLmxlbmd0aClcclxuICAgICAgICAgICAgICAgICYmIHN0ZXBDb3VudCA8IDEwMDAwMFxyXG4gICAgICAgICAgICAgICAgLy8gJiYgdGhpcy5jdXJyZW50UHJvZ3JhbSA9PSBwcm9ncmFtXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgZXJyb3IgPSB0aGlzLm5leHRTdGVwKCk7XHJcbiAgICAgICAgICAgICAgICBzdGVwQ291bnQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgZXJyb3IgPSBcIkZlaGxlciBiZWkgZGVyIEF1c3dlcnR1bmdcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQcm9ncmFtID09IHByb2dyYW0gJiYgdGhpcy5wcm9ncmFtU3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnBvcFByb2dyYW0oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdGFja1RvcDogVmFsdWU7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhY2subGVuZ3RoID4gc3RhY2tzaXplQmVmb3JlKSB7XHJcbiAgICAgICAgICAgIHN0YWNrVG9wID0gdGhpcy5zdGFjay5wb3AoKTtcclxuXHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnN0YWNrLmxlbmd0aCA+IHN0YWNrc2l6ZUJlZm9yZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSBzdGVwT3Zlck5lc3RpbmdMZXZlbDtcclxuICAgICAgICB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnID0gYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWc7XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShvbGRJbnRlcnByZXRlclN0YXRlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZXJyb3I6IGVycm9yLFxyXG4gICAgICAgICAgICB2YWx1ZTogc3RhY2tUb3BcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGVJbW1lZGlhdGVseUluTmV3U3RhY2tmcmFtZShwcm9ncmFtOiBQcm9ncmFtLCB2YWx1ZXNUb1B1c2hCZWZvcmVFeGVjdXRpbmc6IFZhbHVlW10pOiB7IGVycm9yOiBzdHJpbmcsIHZhbHVlOiBWYWx1ZSB9IHtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoQ3VycmVudFByb2dyYW0oKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHByb2dyYW07XHJcbiAgICAgICAgbGV0IG9sZFByb2dyYW1Qb3NpdGlvbiA9IHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbjtcclxuICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtUG9zaXRpb24gPSAwO1xyXG5cclxuICAgICAgICBsZXQgbnVtYmVyT2ZTdGFja2ZyYW1lc0JlZm9yZSA9IHRoaXMuc3RhY2tmcmFtZXMubGVuZ3RoO1xyXG4gICAgICAgIHRoaXMuc3RhY2tmcmFtZXMucHVzaCh0aGlzLmN1cnJlbnRTdGFja2ZyYW1lKTtcclxuICAgICAgICBsZXQgc3RhY2tzaXplQmVmb3JlID0gdGhpcy5zdGFjay5sZW5ndGg7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhY2tmcmFtZSA9IHN0YWNrc2l6ZUJlZm9yZTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgdiBvZiB2YWx1ZXNUb1B1c2hCZWZvcmVFeGVjdXRpbmcpIHRoaXMuc3RhY2sucHVzaCh2KTtcclxuXHJcbiAgICAgICAgbGV0IG9sZEludGVycHJldGVyU3RhdGUgPSB0aGlzLnN0YXRlO1xyXG4gICAgICAgIGxldCBzdGVwT3Zlck5lc3RpbmdMZXZlbCA9IHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWw7XHJcbiAgICAgICAgbGV0IGFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnID0gdGhpcy5hZGRpdGlvbmFsU3RlcEZpbmlzaGVkRmxhZztcclxuXHJcblxyXG4gICAgICAgIGxldCBzdGVwQ291bnQgPSAwO1xyXG4gICAgICAgIGxldCBlcnJvciA9IG51bGw7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnN0YWNrZnJhbWVzLmxlbmd0aCA+IG51bWJlck9mU3RhY2tmcmFtZXNCZWZvcmVcclxuICAgICAgICAgICAgICAgICYmIHN0ZXBDb3VudCA8IDEwMDAwMCAmJiBlcnJvciA9PSBudWxsXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5vZGUgPSB0aGlzLmN1cnJlbnRQcm9ncmFtLnN0YXRlbWVudHNbdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uXTtcclxuXHJcbiAgICAgICAgICAgICAgICBlcnJvciA9IHRoaXMuZXhlY3V0ZU5vZGUobm9kZSk7XHJcbiAgICAgICAgICAgICAgICBzdGVwQ291bnQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgZXJyb3IgPSBcIkZlaGxlciBiZWkgZGVyIEF1c3dlcnR1bmdcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdGVwQ291bnQgPT0gMTAwMDAwKSB0aGlzLnRocm93RXhjZXB0aW9uKFwiRGllIEF1c2bDvGhydW5nIGRlcyBLb25zdHJ1a3RvcnMgZGF1ZXJ0ZSB6dSBsYW5nZS5cIik7XHJcblxyXG4gICAgICAgIGxldCBzdGFja1RvcDogVmFsdWU7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhY2subGVuZ3RoID4gc3RhY2tzaXplQmVmb3JlKSB7XHJcbiAgICAgICAgICAgIHN0YWNrVG9wID0gdGhpcy5zdGFjay5wb3AoKTtcclxuXHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnN0YWNrLmxlbmd0aCA+IHN0YWNrc2l6ZUJlZm9yZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc3RlcE92ZXJOZXN0aW5nTGV2ZWwgPSBzdGVwT3Zlck5lc3RpbmdMZXZlbDtcclxuICAgICAgICB0aGlzLmFkZGl0aW9uYWxTdGVwRmluaXNoZWRGbGFnID0gYWRkaXRpb25hbFN0ZXBGaW5pc2hlZEZsYWc7XHJcbiAgICAgICAgLy8gdGhpcy5jdXJyZW50UHJvZ3JhbVBvc2l0aW9uKys7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1Qb3NpdGlvbiA9IG9sZFByb2dyYW1Qb3NpdGlvbjtcclxuICAgICAgICB0aGlzLnNldFN0YXRlKG9sZEludGVycHJldGVyU3RhdGUpO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBlcnJvcjogZXJyb3IsXHJcbiAgICAgICAgICAgIHZhbHVlOiBzdGFja1RvcFxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgaW5zdGFudGlhdGVPYmplY3RJbW1lZGlhdGVseShrbGFzczogS2xhc3MpOiBSdW50aW1lT2JqZWN0IHtcclxuICAgICAgICBsZXQgb2JqZWN0ID0gbmV3IFJ1bnRpbWVPYmplY3Qoa2xhc3MpO1xyXG5cclxuICAgICAgICBsZXQgdmFsdWUgPSB7XHJcbiAgICAgICAgICAgIHZhbHVlOiBvYmplY3QsXHJcbiAgICAgICAgICAgIHR5cGU6IGtsYXNzXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbGV0IGtsYXNzMSA9IGtsYXNzO1xyXG5cclxuICAgICAgICB3aGlsZSAoa2xhc3MxICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IGFpcCA9IGtsYXNzMS5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW07XHJcbiAgICAgICAgICAgIGlmIChhaXAuc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5leGVjdXRlSW1tZWRpYXRlbHlJbk5ld1N0YWNrZnJhbWUoYWlwLCBbdmFsdWVdKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAga2xhc3MxID0ga2xhc3MxLmJhc2VDbGFzcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBjb25zdHJ1Y3RvciA9IGtsYXNzLmdldE1ldGhvZEJ5U2lnbmF0dXJlKGtsYXNzLmlkZW50aWZpZXIgKyBcIigpXCIpO1xyXG4gICAgICAgIGlmIChjb25zdHJ1Y3RvciAhPSBudWxsICYmIGNvbnN0cnVjdG9yLnByb2dyYW0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAvLyBsZXQgcHJvZ3JhbVdpdGhvdXRSZXR1cm5TdGF0ZW1lbnQ6IFByb2dyYW0gPSB7XHJcbiAgICAgICAgICAgIC8vICAgICBsYWJlbE1hbmFnZXI6IG51bGwsXHJcbiAgICAgICAgICAgIC8vICAgICBtb2R1bGU6IGNvbnN0cnVjdG9yLnByb2dyYW0ubW9kdWxlLFxyXG4gICAgICAgICAgICAvLyAgICAgc3RhdGVtZW50czogY29uc3RydWN0b3IucHJvZ3JhbS5zdGF0ZW1lbnRzLnNsaWNlKDAsIGNvbnN0cnVjdG9yLnByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggLSAxKVxyXG4gICAgICAgICAgICAvLyB9O1xyXG4gICAgICAgICAgICB0aGlzLmV4ZWN1dGVJbW1lZGlhdGVseUluTmV3U3RhY2tmcmFtZShjb25zdHJ1Y3Rvci5wcm9ncmFtLCBbdmFsdWVdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBvYmplY3Q7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJlZ2lzdGVyRGF0YWJhc2VDb25uZWN0aW9uKGNoOiBDb25uZWN0aW9uSGVscGVyKSB7XHJcbiAgICAgICAgdGhpcy5kYXRhYmFzZUNvbm5lY3Rpb25IZWxwZXJzLnB1c2goY2gpO1xyXG4gICAgfVxyXG5cclxuXHJcbn0iXX0=