var NThreadState;
(function (NThreadState) {
    NThreadState[NThreadState["running"] = 0] = "running";
    NThreadState[NThreadState["paused"] = 1] = "paused";
    NThreadState[NThreadState["exited"] = 2] = "exited";
    NThreadState[NThreadState["exitedWithException"] = 3] = "exitedWithException";
})(NThreadState || (NThreadState = {}));
export var NThreadPoolLstate;
(function (NThreadPoolLstate) {
    NThreadPoolLstate[NThreadPoolLstate["done"] = 0] = "done";
    NThreadPoolLstate[NThreadPoolLstate["running"] = 1] = "running";
    NThreadPoolLstate[NThreadPoolLstate["paused"] = 2] = "paused";
    NThreadPoolLstate[NThreadPoolLstate["not_initialized"] = 3] = "not_initialized";
})(NThreadPoolLstate || (NThreadPoolLstate = {}));
export class NThread {
    constructor(threadPool, initialStack) {
        this.threadPool = threadPool;
        this.programStack = [];
        this.currentlyHeldSemaphors = [];
        this.stack = initialStack;
    }
    /**
     * returns true if Thread exits
     */
    run(maxNumberOfSteps) {
        let numberOfSteps = 0;
        let stack = this.stack; // for performance reasons
        this.state = NThreadState.running;
        //@ts-ignore
        while (numberOfSteps < maxNumberOfSteps && this.state != NThreadState.exited) {
            // For performance reasons: store all necessary data in local variables
            let currentProgramState = this.currentProgramState;
            let stepIndex = currentProgramState.stepIndex;
            let currentStepList = currentProgramState.currentStepList;
            let stackBase = currentProgramState.stackBase;
            let helper = currentProgramState.program.helper;
            if (this.stepEndsWhenProgramstackLengthLowerOrEqual >= 0) {
                while (numberOfSteps < maxNumberOfSteps &&
                    this.state == NThreadState.running && !this.isSingleStepCompleted()) {
                    let step = currentStepList[stepIndex];
                    stepIndex = step.run(stack, stackBase, helper, this);
                    this.currentProgramState.stepIndex = stepIndex;
                    numberOfSteps++;
                }
                if (this.isSingleStepCompleted()) {
                    this.stepCallback();
                    this.state = NThreadState.paused;
                }
            }
            else {
                while (numberOfSteps < maxNumberOfSteps && this.state == NThreadState.running) {
                    let step = currentStepList[stepIndex];
                    stepIndex = step.run(stack, stackBase, helper, this);
                    numberOfSteps++;
                }
            }
            currentProgramState.stepIndex = stepIndex;
            // this currentProgram might by now not be the same as before this inner while-loop
            // because callMethod or returnFromMethod may have been called since from within 
            // step.run
        }
        return this.state;
    }
    isSingleStepCompleted() {
        return this.programStack.length < this.stepEndsWhenProgramstackLengthLowerOrEqual ||
            this.programStack.length == this.stepEndsWhenProgramstackLengthLowerOrEqual &&
                this.currentProgramState.stepIndex > this.stepEndsWhenStepIndexGreater;
    }
    markSingleStepOver(callbackWhenSingleStepOverEnds) {
        this.stepEndsWhenProgramstackLengthLowerOrEqual = this.programStack.length - 1;
        this.stepEndsWhenStepIndexGreater = this.currentProgramState.stepIndex;
        this.stepCallback = () => {
            this.stepEndsWhenProgramstackLengthLowerOrEqual = -1;
            callbackWhenSingleStepOverEnds();
        };
    }
    unmarkStep() {
        this.stepEndsWhenProgramstackLengthLowerOrEqual = -1;
    }
    markStepOut(callbackWhenStepOutEnds) {
        this.stepEndsWhenProgramstackLengthLowerOrEqual = this.programStack.length - 2;
        this.stepEndsWhenStepIndexGreater = -1;
        this.stepCallback = () => {
            this.stepEndsWhenProgramstackLengthLowerOrEqual = -1;
            callbackWhenStepOutEnds();
        };
    }
    throwException(exception) {
        let className = exception.__class.identifier;
        let classNames = exception.__class.allExtendedImplementedTypes;
        let stackTrace = [];
        do {
            let ps = this.programStack[this.programStack.length - 1];
            for (let exInfo of ps.exceptionInfoList) {
                let found = false;
                if (exInfo.types.indexOf(className) >= 0) {
                    found = true;
                }
                else {
                    for (let cn of classNames) {
                        if (exInfo.types.indexOf(cn) >= 0) {
                            found = true;
                            break;
                        }
                    }
                }
                if (found) {
                    stackTrace.push(Object.assign(ps));
                    ps.stepIndex = exInfo.stepIndex;
                    this.stack.splice(exInfo.stackSize, this.stack.length - exInfo.stackSize);
                    this.stack.push(exception);
                    break;
                }
                else {
                    stackTrace.push(ps);
                    this.programStack.pop();
                }
            }
        } while (this.programStack.length > 0);
        if (this.programStack.length == 0) {
            this.stackTrace = stackTrace;
            this.exception = exception;
            this.state = NThreadState.exitedWithException;
        }
    }
    beginCatchExceptions(exceptionInfo) {
        exceptionInfo.stackSize = this.stack.length;
        this.currentProgramState.exceptionInfoList.push(exceptionInfo);
    }
    endCatchExceptions() {
        this.currentProgramState.exceptionInfoList.pop();
    }
    aquireSemaphor(semaphor) {
        if (!semaphor.aquire(this)) {
            this.state = NThreadState.exited;
        }
    }
    returnFromMethod(returnValue) {
        while (this.stack.length > this.currentProgramState.stackBase) {
            this.stack.pop();
        }
        if (returnValue != null)
            this.stack.push(returnValue);
        this.programStack.pop();
        if (this.programStack.length > 0) {
            this.currentProgramState = this.programStack[this.programStack.length - 1];
            if (this.threadPool.executeMode == NExecuteMode.singleSteps && this.currentProgramState.currentStepList == this.currentProgramState.program.stepsMultiple) {
                this.switchFromMultipleToSingleStep(this.currentProgramState);
            }
        }
        else {
            this.state = NThreadState.exited;
        }
    }
    switchFromMultipleToSingleStep(programState) {
        let multiStep = programState.currentStepList[programState.stepIndex];
        let singleStep = multiStep.correspondingStepInOtherStepmode;
        if (singleStep != null) {
            programState.currentStepList = programState.program.stepsSingle;
            programState.stepIndex = programState.currentStepList.indexOf(singleStep);
        }
    }
    /**
     * If a step calls a library method which itself calls thread.callMethod (e.g. to call toString())
     * then this call MUST BE the last statement of this step!
     */
    callCompiledMethod(program, callbackAfterFinished) {
        let state = {
            program: program,
            currentStepList: this.threadPool.executeMode == NExecuteMode.singleSteps ? program.stepsSingle : program.stepsMultiple,
            stackBase: this.stack.length - program.numberOfParameters - program.numberOfLocalVariables,
            stepIndex: 0,
            callbackAfterFinished: callbackAfterFinished,
            exceptionInfoList: []
        };
        for (let i = 0; i < program.numberOfLocalVariables; i++) {
            this.stack.push(null);
        }
        this.programStack.push(state);
        this.currentProgramState = state;
    }
    /**
     * Preconditions:
     * a) all parameters are on the stack
     * b) thread.callVirtualMethod is last statement of step
     */
    callVirtualMethod(runtimeObject, signature, callbackAfterFinished) {
        let method = runtimeObject.__virtualMethods[signature];
        if (method.invoke != null) {
            this.callCompiledMethod(method, (returnValue) => {
                if (callbackAfterFinished != null) {
                    callbackAfterFinished(returnValue);
                }
                else {
                    if (typeof returnValue != "undefined") {
                        this.stack.push(returnValue);
                    }
                }
            });
        }
        else {
            let n = method.numberOfParameters;
            let params = Array(n);
            for (let i = 1; i <= n; i++) {
                params[n - i] = this.stack.pop();
            }
            let returnValue = method.invoke.call(this.stack.pop(), params);
            if (callbackAfterFinished != null) {
                callbackAfterFinished(returnValue);
            }
            else {
                if (typeof returnValue != "undefined") {
                    this.stack.push(returnValue);
                }
            }
        }
    }
}
export var NExecuteMode;
(function (NExecuteMode) {
    NExecuteMode[NExecuteMode["singleSteps"] = 0] = "singleSteps";
    NExecuteMode[NExecuteMode["multipleSteps"] = 1] = "multipleSteps";
})(NExecuteMode || (NExecuteMode = {}));
;
export class NThreadPool {
    constructor(interpreter) {
        this.interpreter = interpreter;
        this.runningThreads = [];
        this.currentThreadIndex = 0;
        this.semaphors = [];
        this.keepThread = false; // for single step mode
        this.setState(NThreadPoolLstate.not_initialized);
    }
    run(numberOfStepsMax) {
        let stepsPerThread = Math.ceil(numberOfStepsMax / this.runningThreads.length);
        let numberOfSteps = 0;
        if (this.runningThreads.length == 0)
            return NThreadState.exited;
        if ([NThreadPoolLstate.done, NThreadPoolLstate.running].indexOf(this.state) < 0) {
            return;
        }
        this.setState(NThreadPoolLstate.running);
        while (numberOfSteps < numberOfStepsMax) {
            let currentThread = this.runningThreads[this.currentThreadIndex];
            let status = currentThread.run(stepsPerThread);
            numberOfSteps += stepsPerThread;
            switch (status) {
                case NThreadState.exited:
                    for (let semaphor of currentThread.currentlyHeldSemaphors) {
                        semaphor.release(currentThread);
                    }
                    this.runningThreads.splice(this.currentThreadIndex, 1);
                    if (this.runningThreads.length == 0) {
                        this.setState(NThreadPoolLstate.done);
                        return;
                    }
                    break;
                case NThreadState.exitedWithException:
                    // TODO: Print Exception
                    this.setState(NThreadPoolLstate.done);
                    return;
                case NThreadState.paused:
                    this.setState(NThreadPoolLstate.paused);
                    return;
            }
            if (!this.keepThread) {
                this.currentThreadIndex++;
                if (this.currentThreadIndex >= this.runningThreads.length) {
                    this.currentThreadIndex = 0;
                }
            }
        }
    }
    setState(newState) {
        this.interpreter.setState(this.state, newState);
        this.state = newState;
    }
    runSingleStepKeepingThread(stepInto, callback) {
        this.keepThread = true;
        if (stepInto) {
            if (this.state <= NThreadPoolLstate.paused) {
                this.run(1);
            }
            this.keepThread = false;
            callback();
        }
        else {
            let thread = this.runningThreads[this.currentThreadIndex];
            if (thread == null)
                return;
            thread.markSingleStepOver(() => {
                this.keepThread = false;
                callback();
            });
        }
    }
    stepOut(callback) {
        this.keepThread = true;
        let thread = this.runningThreads[this.currentThreadIndex];
        if (thread == null)
            return;
        thread.markStepOut(() => {
            this.keepThread = false;
            callback();
        });
    }
    unmarkStep() {
        let thread = this.runningThreads[this.currentThreadIndex];
        thread.unmarkStep();
    }
    switchAllThreadsToSingleStepMode() {
        for (let thread of this.runningThreads) {
            this.switchThreadToSingleStepMode(thread);
        }
        for (let s of this.semaphors) {
            for (let thread of s.waitingThreads) {
                this.switchThreadToSingleStepMode(thread);
            }
        }
    }
    switchThreadToSingleStepMode(thread) {
        let currentState = thread.currentProgramState;
        if (currentState.currentStepList == currentState.program.stepsMultiple) {
            thread.switchFromMultipleToSingleStep(currentState);
        }
    }
    createThread(program, initialStack = [], callbackAfterFinished) {
        let thread = new NThread(this, initialStack);
        thread.callCompiledMethod(program, callbackAfterFinished);
    }
    suspendThread(thread) {
        let index = this.runningThreads.indexOf(thread);
        if (index >= 0) {
            this.runningThreads.splice(index, 1);
            if (this.currentThreadIndex >= index) {
                this.currentThreadIndex--;
            }
        }
    }
    restoreThread(thread) {
        this.runningThreads.push(thread);
    }
    /**
     * for displaying next program position in editor
     */
    getNextStepPosition() {
        let currentThread = this.runningThreads[this.currentThreadIndex];
        let programState = currentThread.currentProgramState;
        let step = programState.currentStepList[programState.stepIndex];
        return {
            module: programState.program.module,
            position: step.position
        };
    }
    init(moduleStore, mainModule) {
        // TODO!!
        // Instantiate enum value-objects; initialize static attributes; call static constructors
        // this.programStack.push({
        //     program: this.mainModule.mainProgram,
        //     programPosition: 0,
        //     textPosition: { line: 1, column: 1, length: 0 },
        //     method: "Hauptprogramm",
        //     callbackAfterReturn: null,
        //     isCalledFromOutside: "Hauptprogramm"
        // })
        // for (let m of this.moduleStore.getModules(false)) {
        //     this.initializeEnums(m);
        //     this.initializeClasses(m);
        // }
        // this.popProgram();
    }
}
export class NSemaphor {
    constructor(threadPool, capacity) {
        this.threadPool = threadPool;
        this.capacity = capacity;
        this.runningThreads = [];
        this.waitingThreads = [];
        this.counter = capacity;
        threadPool.semaphors.push(this);
    }
    aquire(thread) {
        if (this.counter > 0) {
            this.counter--;
            this.runningThreads.push(thread);
            thread.currentlyHeldSemaphors.push(this);
            return true;
        }
        else {
            this.threadPool.suspendThread(thread);
            this.waitingThreads.push(thread);
            return false;
        }
    }
    release(thread) {
        let index = this.runningThreads.indexOf(thread);
        if (index >= 0) {
            this.runningThreads.splice(index, 1);
            if (this.waitingThreads.length > 0) {
                this.threadPool.restoreThread(this.waitingThreads.shift());
            }
            else {
                this.counter++;
            }
        }
        else {
            // Error: Thread had no token!
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTlRocmVhZFBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50L25ld2NvbXBpbGVyL05UaHJlYWRQb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXFCQSxJQUFLLFlBQTZEO0FBQWxFLFdBQUssWUFBWTtJQUFHLHFEQUFPLENBQUE7SUFBRSxtREFBTSxDQUFBO0lBQUUsbURBQU0sQ0FBQTtJQUFFLDZFQUFtQixDQUFBO0FBQUMsQ0FBQyxFQUE3RCxZQUFZLEtBQVosWUFBWSxRQUFpRDtBQUVsRSxNQUFNLENBQU4sSUFBWSxpQkFBNEQ7QUFBeEUsV0FBWSxpQkFBaUI7SUFBRyx5REFBSSxDQUFBO0lBQUUsK0RBQU8sQ0FBQTtJQUFFLDZEQUFNLENBQUE7SUFBRSwrRUFBZSxDQUFBO0FBQUMsQ0FBQyxFQUE1RCxpQkFBaUIsS0FBakIsaUJBQWlCLFFBQTJDO0FBRXhFLE1BQU0sT0FBTyxPQUFPO0lBaUJoQixZQUFtQixVQUF1QixFQUFFLFlBQW1CO1FBQTVDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFmMUMsaUJBQVksR0FBb0IsRUFBRSxDQUFDO1FBSW5DLDJCQUFzQixHQUFnQixFQUFFLENBQUM7UUFZckMsSUFBSSxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUM7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsR0FBRyxDQUFDLGdCQUF3QjtRQUN4QixJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLDBCQUEwQjtRQUNsRCxJQUFJLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUM7UUFFbEMsWUFBWTtRQUNaLE9BQU0sYUFBYSxHQUFHLGdCQUFnQixJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBQztZQUM1RSx1RUFBdUU7WUFDdkUsSUFBSSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUM7WUFDbkQsSUFBSSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxDQUFDO1lBQzlDLElBQUksZUFBZSxHQUFHLG1CQUFtQixDQUFDLGVBQWUsQ0FBQztZQUMxRCxJQUFJLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxTQUFTLENBQUM7WUFDOUMsSUFBSSxNQUFNLEdBQUcsbUJBQW1CLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztZQUU1QyxJQUFHLElBQUksQ0FBQywwQ0FBMEMsSUFBSSxDQUFDLEVBQUM7Z0JBQ3BELE9BQU0sYUFBYSxHQUFHLGdCQUFnQjtvQkFDbEMsSUFBSSxDQUFDLEtBQUssSUFBSSxZQUFZLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEVBQUM7b0JBQ3BFLElBQUksSUFBSSxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDdEMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3JELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO29CQUMvQyxhQUFhLEVBQUUsQ0FBQztpQkFDbkI7Z0JBQ0QsSUFBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsRUFBQztvQkFDNUIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUM7aUJBQ3BDO2FBQ0o7aUJBQU07Z0JBQ0gsT0FBTSxhQUFhLEdBQUcsZ0JBQWdCLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxZQUFZLENBQUMsT0FBTyxFQUFDO29CQUN6RSxJQUFJLElBQUksR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ3RDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNyRCxhQUFhLEVBQUUsQ0FBQztpQkFDbkI7YUFDSjtZQUdELG1CQUFtQixDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7WUFDMUMsbUZBQW1GO1lBQ25GLGlGQUFpRjtZQUNqRixXQUFXO1NBQ2Q7UUFFRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDdEIsQ0FBQztJQUVELHFCQUFxQjtRQUNqQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQywwQ0FBMEM7WUFDN0UsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLDBDQUEwQztnQkFDM0UsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUM7SUFDL0UsQ0FBQztJQUVELGtCQUFrQixDQUFDLDhCQUEwQztRQUV6RCxJQUFJLENBQUMsMENBQTBDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxFQUFFO1lBQ3JCLElBQUksQ0FBQywwQ0FBMEMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyRCw4QkFBOEIsRUFBRSxDQUFDO1FBQ3JDLENBQUMsQ0FBQztJQUVOLENBQUM7SUFFRCxVQUFVO1FBQ04sSUFBSSxDQUFDLDBDQUEwQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxXQUFXLENBQUMsdUJBQW1DO1FBRTNDLElBQUksQ0FBQywwQ0FBMEMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDL0UsSUFBSSxDQUFDLDRCQUE0QixHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxFQUFFO1lBQ3JCLElBQUksQ0FBQywwQ0FBMEMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyRCx1QkFBdUIsRUFBRSxDQUFDO1FBQzlCLENBQUMsQ0FBQztJQUVOLENBQUM7SUFHRCxjQUFjLENBQUMsU0FBeUI7UUFDcEMsSUFBSSxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7UUFDN0MsSUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQztRQUUvRCxJQUFJLFVBQVUsR0FBb0IsRUFBRSxDQUFDO1FBQ3JDLEdBQUc7WUFFQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pELEtBQUksSUFBSSxNQUFNLElBQUksRUFBRSxDQUFDLGlCQUFpQixFQUFDO2dCQUNuQyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBQ2xCLElBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDO29CQUNwQyxLQUFLLEdBQUcsSUFBSSxDQUFDO2lCQUNoQjtxQkFBTTtvQkFDSCxLQUFJLElBQUksRUFBRSxJQUFJLFVBQVUsRUFBQzt3QkFDckIsSUFBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUM7NEJBQzdCLEtBQUssR0FBRyxJQUFJLENBQUM7NEJBQ2IsTUFBTTt5QkFDVDtxQkFDSjtpQkFDSjtnQkFFRCxJQUFHLEtBQUssRUFBQztvQkFDTCxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbkMsRUFBRSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO29CQUNoQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDMUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzNCLE1BQU07aUJBQ1Q7cUJBQU07b0JBQ0gsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDcEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQztpQkFDM0I7YUFDSjtTQUVKLFFBQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO1FBRXJDLElBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFDO1lBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1lBQzdCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1lBQzNCLElBQUksQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDLG1CQUFtQixDQUFDO1NBQ2pEO0lBQ0wsQ0FBQztJQUVELG9CQUFvQixDQUFDLGFBQTZCO1FBQzlDLGFBQWEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDNUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQsa0JBQWtCO1FBQ2QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3JELENBQUM7SUFFRCxjQUFjLENBQUMsUUFBbUI7UUFDOUIsSUFBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUM7WUFDdEIsSUFBSSxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDO1NBQ3BDO0lBQ0wsQ0FBQztJQUVELGdCQUFnQixDQUFDLFdBQWdCO1FBQzdCLE9BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBQztZQUN6RCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1NBQ3BCO1FBRUQsSUFBRyxXQUFXLElBQUksSUFBSTtZQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRXJELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDeEIsSUFBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7WUFDNUIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDM0UsSUFBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsSUFBSSxZQUFZLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUM7Z0JBQ3JKLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQzthQUNqRTtTQUNKO2FBQU07WUFDSCxJQUFJLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUM7U0FDcEM7SUFDTCxDQUFDO0lBRUQsOEJBQThCLENBQUMsWUFBMkI7UUFDdEQsSUFBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDckUsSUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLGdDQUFnQyxDQUFDO1FBQzVELElBQUcsVUFBVSxJQUFJLElBQUksRUFBQztZQUNsQixZQUFZLENBQUMsZUFBZSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO1lBQ2hFLFlBQVksQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDN0U7SUFDTCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsa0JBQWtCLENBQUMsT0FBaUIsRUFBRSxxQkFBNEM7UUFDOUUsSUFBSSxLQUFLLEdBQWtCO1lBQ3ZCLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLGVBQWUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsSUFBSSxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYTtZQUN0SCxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxzQkFBc0I7WUFDMUYsU0FBUyxFQUFFLENBQUM7WUFDWixxQkFBcUIsRUFBRSxxQkFBcUI7WUFDNUMsaUJBQWlCLEVBQUUsRUFBRTtTQUN4QixDQUFBO1FBRUQsS0FBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLEVBQUUsRUFBQztZQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN6QjtRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxLQUFLLENBQUM7SUFDckMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxpQkFBaUIsQ0FBQyxhQUE2QixFQUFFLFNBQWlCLEVBQUUscUJBQTRDO1FBQzVHLElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2RCxJQUFHLE1BQU0sQ0FBQyxNQUFNLElBQUksSUFBSSxFQUFDO1lBQ3JCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDNUMsSUFBRyxxQkFBcUIsSUFBSSxJQUFJLEVBQUM7b0JBQzdCLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2lCQUN0QztxQkFBTTtvQkFDSCxJQUFHLE9BQU8sV0FBVyxJQUFJLFdBQVcsRUFBQzt3QkFDakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7cUJBQ2hDO2lCQUNKO1lBQ0wsQ0FBQyxDQUFDLENBQUM7U0FDTjthQUFNO1lBQ0gsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLGtCQUFrQixDQUFDO1lBQ2xDLElBQUksTUFBTSxHQUFVLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QixLQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFDO2dCQUN2QixNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDcEM7WUFDRCxJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRS9ELElBQUcscUJBQXFCLElBQUksSUFBSSxFQUFDO2dCQUM3QixxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQzthQUN0QztpQkFBTTtnQkFDSCxJQUFHLE9BQU8sV0FBVyxJQUFJLFdBQVcsRUFBQztvQkFDakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7aUJBQ2hDO2FBQ0o7U0FDSjtJQUNMLENBQUM7Q0FJSjtBQUVELE1BQU0sQ0FBTixJQUFZLFlBQTBDO0FBQXRELFdBQVksWUFBWTtJQUFHLDZEQUFXLENBQUE7SUFBRSxpRUFBYSxDQUFBO0FBQUEsQ0FBQyxFQUExQyxZQUFZLEtBQVosWUFBWSxRQUE4QjtBQUFBLENBQUM7QUFFdkQsTUFBTSxPQUFPLFdBQVc7SUFTcEIsWUFBb0IsV0FBeUI7UUFBekIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFSN0MsbUJBQWMsR0FBYyxFQUFFLENBQUM7UUFDL0IsdUJBQWtCLEdBQVcsQ0FBQyxDQUFDO1FBRS9CLGNBQVMsR0FBZ0IsRUFBRSxDQUFDO1FBRzVCLGVBQVUsR0FBWSxLQUFLLENBQUMsQ0FBSSx1QkFBdUI7UUFHbkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQsR0FBRyxDQUFDLGdCQUF3QjtRQUN4QixJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixHQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUUsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLElBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLElBQUksQ0FBQztZQUFFLE9BQU8sWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUUvRCxJQUFHLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFDO1lBQzNFLE9BQU87U0FDVjtRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFekMsT0FBTSxhQUFhLEdBQUcsZ0JBQWdCLEVBQUM7WUFDbkMsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUVqRSxJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQy9DLGFBQWEsSUFBSSxjQUFjLENBQUM7WUFFaEMsUUFBTyxNQUFNLEVBQUM7Z0JBQ1YsS0FBSyxZQUFZLENBQUMsTUFBTTtvQkFFcEIsS0FBSSxJQUFJLFFBQVEsSUFBSSxhQUFhLENBQUMsc0JBQXNCLEVBQUM7d0JBQ3JELFFBQVEsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7cUJBQ25DO29CQUVELElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFFdkQsSUFBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUM7d0JBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3RDLE9BQU87cUJBQ1Y7b0JBRUQsTUFBTTtnQkFDVixLQUFLLFlBQVksQ0FBQyxtQkFBbUI7b0JBQ2pDLHdCQUF3QjtvQkFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDdEMsT0FBTztnQkFDUCxLQUFLLFlBQVksQ0FBQyxNQUFNO29CQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUN4QyxPQUFPO2FBQ2Q7WUFFRCxJQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBQztnQkFDaEIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQzFCLElBQUcsSUFBSSxDQUFDLGtCQUFrQixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFDO29CQUNyRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO2lCQUMvQjthQUNKO1NBQ0o7SUFHTCxDQUFDO0lBRUQsUUFBUSxDQUFDLFFBQTJCO1FBQ2hDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUM7SUFDMUIsQ0FBQztJQUVELDBCQUEwQixDQUFDLFFBQWlCLEVBQUUsUUFBb0I7UUFDOUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBRyxRQUFRLEVBQUM7WUFDUixJQUFHLElBQUksQ0FBQyxLQUFLLElBQUksaUJBQWlCLENBQUMsTUFBTSxFQUFDO2dCQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2Y7WUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztZQUN4QixRQUFRLEVBQUUsQ0FBQztTQUNkO2FBQU07WUFDSCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzFELElBQUcsTUFBTSxJQUFJLElBQUk7Z0JBQUUsT0FBTztZQUMxQixNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFO2dCQUMzQixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztnQkFDeEIsUUFBUSxFQUFFLENBQUM7WUFDZixDQUFDLENBQUMsQ0FBQztTQUNOO0lBQ0wsQ0FBQztJQUVELE9BQU8sQ0FBQyxRQUFvQjtRQUN4QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN2QixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzFELElBQUcsTUFBTSxJQUFJLElBQUk7WUFBRSxPQUFPO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ3BCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1lBQ3hCLFFBQVEsRUFBRSxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsVUFBVTtRQUNOLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxnQ0FBZ0M7UUFDNUIsS0FBSSxJQUFJLE1BQU0sSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFDO1lBQ2xDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUM3QztRQUVELEtBQUksSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBQztZQUN4QixLQUFJLElBQUksTUFBTSxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUM7Z0JBQy9CLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUM3QztTQUNKO0lBQ0wsQ0FBQztJQUVPLDRCQUE0QixDQUFDLE1BQWU7UUFDaEQsSUFBSSxZQUFZLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFDO1FBQzlDLElBQUksWUFBWSxDQUFDLGVBQWUsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRTtZQUNwRSxNQUFNLENBQUMsOEJBQThCLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDdkQ7SUFDTCxDQUFDO0lBRUQsWUFBWSxDQUFDLE9BQWlCLEVBQUUsZUFBc0IsRUFBRSxFQUFFLHFCQUE0QztRQUVsRyxJQUFJLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRCxhQUFhLENBQUMsTUFBZTtRQUN6QixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoRCxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUU7WUFDWixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLElBQUksS0FBSyxFQUFFO2dCQUNsQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQzthQUM3QjtTQUNKO0lBQ0wsQ0FBQztJQUVELGFBQWEsQ0FBQyxNQUFlO1FBQ3pCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRDs7T0FFRztJQUNILG1CQUFtQjtRQUNmLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDakUsSUFBSSxZQUFZLEdBQUcsYUFBYSxDQUFDLG1CQUFtQixDQUFDO1FBQ3JELElBQUksSUFBSSxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hFLE9BQU87WUFDSCxNQUFNLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxNQUFNO1lBQ25DLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtTQUMxQixDQUFBO0lBQ0wsQ0FBQztJQUVELElBQUksQ0FBQyxXQUF3QixFQUFFLFVBQWtCO1FBQzdDLFNBQVM7UUFFVCx5RkFBeUY7UUFFekYsMkJBQTJCO1FBQzNCLDRDQUE0QztRQUM1QywwQkFBMEI7UUFDMUIsdURBQXVEO1FBQ3ZELCtCQUErQjtRQUMvQixpQ0FBaUM7UUFDakMsMkNBQTJDO1FBRTNDLEtBQUs7UUFFTCxzREFBc0Q7UUFDdEQsK0JBQStCO1FBQy9CLGlDQUFpQztRQUNqQyxJQUFJO1FBRUoscUJBQXFCO0lBQ3pCLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxTQUFTO0lBTWxCLFlBQW9CLFVBQXVCLEVBQVUsUUFBZ0I7UUFBakQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUFVLGFBQVEsR0FBUixRQUFRLENBQVE7UUFIckUsbUJBQWMsR0FBYyxFQUFFLENBQUM7UUFDL0IsbUJBQWMsR0FBYyxFQUFFLENBQUM7UUFHM0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUM7UUFDeEIsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFlO1FBQ2xCLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLEVBQUU7WUFDbEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QyxPQUFPLElBQUksQ0FBQztTQUNmO2FBQU07WUFDSCxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqQyxPQUFPLEtBQUssQ0FBQztTQUNoQjtJQUNMLENBQUM7SUFFRCxPQUFPLENBQUMsTUFBZTtRQUNuQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoRCxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUU7WUFDWixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ2hDLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQzthQUM5RDtpQkFBTTtnQkFDSCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDbEI7U0FDSjthQUFNO1lBQ0gsOEJBQThCO1NBQ2pDO0lBQ0wsQ0FBQztDQUVKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTW9kdWxlU3RvcmUsIE1vZHVsZSB9IGZyb20gXCIuLi9jb21waWxlci9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IFRleHRQb3NpdGlvbldpdGhNb2R1bGUgfSBmcm9tIFwiLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgTkludGVycHJldGVyIH0gZnJvbSBcIi4vTkludGVycHJldGVyLmpzXCI7XHJcbmltcG9ydCB7IE5Qcm9ncmFtLCBOU3RlcCB9IGZyb20gXCIuL05Qcm9ncmFtLmpzXCI7XHJcbmltcG9ydCB7IE5SdW50aW1lT2JqZWN0IH0gZnJvbSBcIi4vTlJ1bnRpbWVPYmplY3QuanNcIjtcclxuXHJcbnR5cGUgTkV4Y2VwdGlvbkluZm8gPSB7XHJcbiAgICB0eXBlczogc3RyaW5nW10sXHJcbiAgICBzdGVwSW5kZXg6IG51bWJlciwgXHJcbiAgICBzdGFja1NpemU6IG51bWJlclxyXG59XHJcblxyXG50eXBlIE5Qcm9ncmFtU3RhdGUgPSB7XHJcbiAgICBwcm9ncmFtOiBOUHJvZ3JhbTtcclxuICAgIGN1cnJlbnRTdGVwTGlzdDogTlN0ZXBbXTsgICAvLyBMaW5rIHRvIHByb2dyYW0uc3RlcFNpbmdsZSBvciBwcm9ncmFtLnN0ZXBNdWx0aXBsZVxyXG4gICAgc3RlcEluZGV4OiBudW1iZXI7XHJcbiAgICBzdGFja0Jhc2U6IG51bWJlcjtcclxuICAgIGNhbGxiYWNrQWZ0ZXJGaW5pc2hlZD86ICh2YWx1ZTogYW55KSA9PiB2b2lkO1xyXG4gICAgZXhjZXB0aW9uSW5mb0xpc3Q6IE5FeGNlcHRpb25JbmZvW107XHJcbn1cclxuXHJcbmVudW0gTlRocmVhZFN0YXRlIHsgcnVubmluZywgcGF1c2VkLCBleGl0ZWQsIGV4aXRlZFdpdGhFeGNlcHRpb24gfVxyXG5cclxuZXhwb3J0IGVudW0gTlRocmVhZFBvb2xMc3RhdGUgeyBkb25lLCBydW5uaW5nLCBwYXVzZWQsIG5vdF9pbml0aWFsaXplZCB9XHJcblxyXG5leHBvcnQgY2xhc3MgTlRocmVhZCB7XHJcbiAgICBzdGFjazogYW55W107XHJcbiAgICBwcm9ncmFtU3RhY2s6IE5Qcm9ncmFtU3RhdGVbXSA9IFtdO1xyXG5cclxuICAgIGN1cnJlbnRQcm9ncmFtU3RhdGU6IE5Qcm9ncmFtU3RhdGU7ICAvLyBhbHNvIGxpZXMgb24gdG9wIG9mIHByb2dyYW1TdGFja1xyXG5cclxuICAgIGN1cnJlbnRseUhlbGRTZW1hcGhvcnM6IE5TZW1hcGhvcltdID0gW107XHJcblxyXG4gICAgc3RhdGU6IE5UaHJlYWRTdGF0ZTtcclxuXHJcbiAgICBleGNlcHRpb246IE5SdW50aW1lT2JqZWN0O1xyXG4gICAgc3RhY2tUcmFjZTogTlByb2dyYW1TdGF0ZVtdO1xyXG5cclxuICAgIHN0ZXBFbmRzV2hlblByb2dyYW1zdGFja0xlbmd0aExvd2VyT3JFcXVhbDogbnVtYmVyO1xyXG4gICAgc3RlcEVuZHNXaGVuU3RlcEluZGV4R3JlYXRlcjogbnVtYmVyO1xyXG4gICAgc3RlcENhbGxiYWNrOiAoKSA9PiB2b2lkO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB0aHJlYWRQb29sOiBOVGhyZWFkUG9vbCwgaW5pdGlhbFN0YWNrOiBhbnlbXSkge1xyXG4gICAgICAgIHRoaXMuc3RhY2sgPSBpbml0aWFsU3RhY2s7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIHRydWUgaWYgVGhyZWFkIGV4aXRzXHJcbiAgICAgKi9cclxuICAgIHJ1bihtYXhOdW1iZXJPZlN0ZXBzOiBudW1iZXIpOiBOVGhyZWFkU3RhdGUge1xyXG4gICAgICAgIGxldCBudW1iZXJPZlN0ZXBzID0gMDtcclxuICAgICAgICBsZXQgc3RhY2sgPSB0aGlzLnN0YWNrOyAvLyBmb3IgcGVyZm9ybWFuY2UgcmVhc29uc1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBOVGhyZWFkU3RhdGUucnVubmluZztcclxuICAgICAgICBcclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICB3aGlsZShudW1iZXJPZlN0ZXBzIDwgbWF4TnVtYmVyT2ZTdGVwcyAmJiB0aGlzLnN0YXRlICE9IE5UaHJlYWRTdGF0ZS5leGl0ZWQpe1xyXG4gICAgICAgIC8vIEZvciBwZXJmb3JtYW5jZSByZWFzb25zOiBzdG9yZSBhbGwgbmVjZXNzYXJ5IGRhdGEgaW4gbG9jYWwgdmFyaWFibGVzXHJcbiAgICAgICAgbGV0IGN1cnJlbnRQcm9ncmFtU3RhdGUgPSB0aGlzLmN1cnJlbnRQcm9ncmFtU3RhdGU7XHJcbiAgICAgICAgbGV0IHN0ZXBJbmRleCA9IGN1cnJlbnRQcm9ncmFtU3RhdGUuc3RlcEluZGV4O1xyXG4gICAgICAgIGxldCBjdXJyZW50U3RlcExpc3QgPSBjdXJyZW50UHJvZ3JhbVN0YXRlLmN1cnJlbnRTdGVwTGlzdDtcclxuICAgICAgICBsZXQgc3RhY2tCYXNlID0gY3VycmVudFByb2dyYW1TdGF0ZS5zdGFja0Jhc2U7XHJcbiAgICAgICAgbGV0IGhlbHBlciA9IGN1cnJlbnRQcm9ncmFtU3RhdGUucHJvZ3JhbS5oZWxwZXI7XHJcblxyXG4gICAgICAgICAgICBpZih0aGlzLnN0ZXBFbmRzV2hlblByb2dyYW1zdGFja0xlbmd0aExvd2VyT3JFcXVhbCA+PSAwKXtcclxuICAgICAgICAgICAgICAgIHdoaWxlKG51bWJlck9mU3RlcHMgPCBtYXhOdW1iZXJPZlN0ZXBzICYmIFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPT0gTlRocmVhZFN0YXRlLnJ1bm5pbmcgJiYgIXRoaXMuaXNTaW5nbGVTdGVwQ29tcGxldGVkKCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdGVwID0gY3VycmVudFN0ZXBMaXN0W3N0ZXBJbmRleF07XHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEluZGV4ID0gc3RlcC5ydW4oc3RhY2ssIHN0YWNrQmFzZSwgaGVscGVyLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtU3RhdGUuc3RlcEluZGV4ID0gc3RlcEluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgIG51bWJlck9mU3RlcHMrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKHRoaXMuaXNTaW5nbGVTdGVwQ29tcGxldGVkKCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RlcENhbGxiYWNrKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IE5UaHJlYWRTdGF0ZS5wYXVzZWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB3aGlsZShudW1iZXJPZlN0ZXBzIDwgbWF4TnVtYmVyT2ZTdGVwcyAmJiB0aGlzLnN0YXRlID09IE5UaHJlYWRTdGF0ZS5ydW5uaW5nKXtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3RlcCA9IGN1cnJlbnRTdGVwTGlzdFtzdGVwSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBJbmRleCA9IHN0ZXAucnVuKHN0YWNrLCBzdGFja0Jhc2UsIGhlbHBlciwgdGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyT2ZTdGVwcysrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgY3VycmVudFByb2dyYW1TdGF0ZS5zdGVwSW5kZXggPSBzdGVwSW5kZXg7XHJcbiAgICAgICAgICAgIC8vIHRoaXMgY3VycmVudFByb2dyYW0gbWlnaHQgYnkgbm93IG5vdCBiZSB0aGUgc2FtZSBhcyBiZWZvcmUgdGhpcyBpbm5lciB3aGlsZS1sb29wXHJcbiAgICAgICAgICAgIC8vIGJlY2F1c2UgY2FsbE1ldGhvZCBvciByZXR1cm5Gcm9tTWV0aG9kIG1heSBoYXZlIGJlZW4gY2FsbGVkIHNpbmNlIGZyb20gd2l0aGluIFxyXG4gICAgICAgICAgICAvLyBzdGVwLnJ1blxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdGU7XHJcbiAgICB9XHJcblxyXG4gICAgaXNTaW5nbGVTdGVwQ29tcGxldGVkKCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucHJvZ3JhbVN0YWNrLmxlbmd0aCA8IHRoaXMuc3RlcEVuZHNXaGVuUHJvZ3JhbXN0YWNrTGVuZ3RoTG93ZXJPckVxdWFsIHx8XHJcbiAgICAgICAgICAgIHRoaXMucHJvZ3JhbVN0YWNrLmxlbmd0aCA9PSB0aGlzLnN0ZXBFbmRzV2hlblByb2dyYW1zdGFja0xlbmd0aExvd2VyT3JFcXVhbCAmJlxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtU3RhdGUuc3RlcEluZGV4ID4gdGhpcy5zdGVwRW5kc1doZW5TdGVwSW5kZXhHcmVhdGVyO1xyXG4gICAgfVxyXG5cclxuICAgIG1hcmtTaW5nbGVTdGVwT3ZlcihjYWxsYmFja1doZW5TaW5nbGVTdGVwT3ZlckVuZHM6ICgpID0+IHZvaWQpIHtcclxuXHJcbiAgICAgICAgdGhpcy5zdGVwRW5kc1doZW5Qcm9ncmFtc3RhY2tMZW5ndGhMb3dlck9yRXF1YWwgPSB0aGlzLnByb2dyYW1TdGFjay5sZW5ndGggLSAxO1xyXG4gICAgICAgIHRoaXMuc3RlcEVuZHNXaGVuU3RlcEluZGV4R3JlYXRlciA9IHRoaXMuY3VycmVudFByb2dyYW1TdGF0ZS5zdGVwSW5kZXg7XHJcbiAgICAgICAgdGhpcy5zdGVwQ2FsbGJhY2sgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RlcEVuZHNXaGVuUHJvZ3JhbXN0YWNrTGVuZ3RoTG93ZXJPckVxdWFsID0gLTE7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrV2hlblNpbmdsZVN0ZXBPdmVyRW5kcygpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVubWFya1N0ZXAoKSB7XHJcbiAgICAgICAgdGhpcy5zdGVwRW5kc1doZW5Qcm9ncmFtc3RhY2tMZW5ndGhMb3dlck9yRXF1YWwgPSAtMTtcclxuICAgIH1cclxuXHJcbiAgICBtYXJrU3RlcE91dChjYWxsYmFja1doZW5TdGVwT3V0RW5kczogKCkgPT4gdm9pZCkge1xyXG5cclxuICAgICAgICB0aGlzLnN0ZXBFbmRzV2hlblByb2dyYW1zdGFja0xlbmd0aExvd2VyT3JFcXVhbCA9IHRoaXMucHJvZ3JhbVN0YWNrLmxlbmd0aCAtIDI7XHJcbiAgICAgICAgdGhpcy5zdGVwRW5kc1doZW5TdGVwSW5kZXhHcmVhdGVyID0gLTE7XHJcbiAgICAgICAgdGhpcy5zdGVwQ2FsbGJhY2sgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RlcEVuZHNXaGVuUHJvZ3JhbXN0YWNrTGVuZ3RoTG93ZXJPckVxdWFsID0gLTE7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrV2hlblN0ZXBPdXRFbmRzKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9XHJcbiAgICBcclxuXHJcbiAgICB0aHJvd0V4Y2VwdGlvbihleGNlcHRpb246IE5SdW50aW1lT2JqZWN0KXtcclxuICAgICAgICBsZXQgY2xhc3NOYW1lID0gZXhjZXB0aW9uLl9fY2xhc3MuaWRlbnRpZmllcjtcclxuICAgICAgICBsZXQgY2xhc3NOYW1lcyA9IGV4Y2VwdGlvbi5fX2NsYXNzLmFsbEV4dGVuZGVkSW1wbGVtZW50ZWRUeXBlcztcclxuXHJcbiAgICAgICAgbGV0IHN0YWNrVHJhY2U6IE5Qcm9ncmFtU3RhdGVbXSA9IFtdO1xyXG4gICAgICAgIGRvIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBwcyA9IHRoaXMucHJvZ3JhbVN0YWNrW3RoaXMucHJvZ3JhbVN0YWNrLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICBmb3IobGV0IGV4SW5mbyBvZiBwcy5leGNlcHRpb25JbmZvTGlzdCl7XHJcbiAgICAgICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGlmKGV4SW5mby50eXBlcy5pbmRleE9mKGNsYXNzTmFtZSkgPj0gMCl7XHJcbiAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IobGV0IGNuIG9mIGNsYXNzTmFtZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihleEluZm8udHlwZXMuaW5kZXhPZihjbikgPj0gMCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZihmb3VuZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tUcmFjZS5wdXNoKE9iamVjdC5hc3NpZ24ocHMpKTtcclxuICAgICAgICAgICAgICAgICAgICBwcy5zdGVwSW5kZXggPSBleEluZm8uc3RlcEluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhY2suc3BsaWNlKGV4SW5mby5zdGFja1NpemUsIHRoaXMuc3RhY2subGVuZ3RoIC0gZXhJbmZvLnN0YWNrU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFjay5wdXNoKGV4Y2VwdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrVHJhY2UucHVzaChwcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSB3aGlsZSh0aGlzLnByb2dyYW1TdGFjay5sZW5ndGggPiAwKVxyXG5cclxuICAgICAgICBpZih0aGlzLnByb2dyYW1TdGFjay5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhY2tUcmFjZSA9IHN0YWNrVHJhY2U7XHJcbiAgICAgICAgICAgIHRoaXMuZXhjZXB0aW9uID0gZXhjZXB0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gTlRocmVhZFN0YXRlLmV4aXRlZFdpdGhFeGNlcHRpb247XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGJlZ2luQ2F0Y2hFeGNlcHRpb25zKGV4Y2VwdGlvbkluZm86IE5FeGNlcHRpb25JbmZvKXtcclxuICAgICAgICBleGNlcHRpb25JbmZvLnN0YWNrU2l6ZSA9IHRoaXMuc3RhY2subGVuZ3RoO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1TdGF0ZS5leGNlcHRpb25JbmZvTGlzdC5wdXNoKGV4Y2VwdGlvbkluZm8pO1xyXG4gICAgfVxyXG5cclxuICAgIGVuZENhdGNoRXhjZXB0aW9ucygpe1xyXG4gICAgICAgIHRoaXMuY3VycmVudFByb2dyYW1TdGF0ZS5leGNlcHRpb25JbmZvTGlzdC5wb3AoKTtcclxuICAgIH1cclxuXHJcbiAgICBhcXVpcmVTZW1hcGhvcihzZW1hcGhvcjogTlNlbWFwaG9yKXtcclxuICAgICAgICBpZighc2VtYXBob3IuYXF1aXJlKHRoaXMpKXtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IE5UaHJlYWRTdGF0ZS5leGl0ZWQ7XHJcbiAgICAgICAgfSBcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm5Gcm9tTWV0aG9kKHJldHVyblZhbHVlOiBhbnkpe1xyXG4gICAgICAgIHdoaWxlKHRoaXMuc3RhY2subGVuZ3RoID4gdGhpcy5jdXJyZW50UHJvZ3JhbVN0YXRlLnN0YWNrQmFzZSl7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhY2sucG9wKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKHJldHVyblZhbHVlICE9IG51bGwpIHRoaXMuc3RhY2sucHVzaChyZXR1cm5WYWx1ZSk7XHJcblxyXG4gICAgICAgIHRoaXMucHJvZ3JhbVN0YWNrLnBvcCgpO1xyXG4gICAgICAgIGlmKHRoaXMucHJvZ3JhbVN0YWNrLmxlbmd0aCA+IDApe1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtU3RhdGUgPSB0aGlzLnByb2dyYW1TdGFja1t0aGlzLnByb2dyYW1TdGFjay5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgaWYodGhpcy50aHJlYWRQb29sLmV4ZWN1dGVNb2RlID09IE5FeGVjdXRlTW9kZS5zaW5nbGVTdGVwcyAmJiB0aGlzLmN1cnJlbnRQcm9ncmFtU3RhdGUuY3VycmVudFN0ZXBMaXN0ID09IHRoaXMuY3VycmVudFByb2dyYW1TdGF0ZS5wcm9ncmFtLnN0ZXBzTXVsdGlwbGUpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hGcm9tTXVsdGlwbGVUb1NpbmdsZVN0ZXAodGhpcy5jdXJyZW50UHJvZ3JhbVN0YXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBOVGhyZWFkU3RhdGUuZXhpdGVkO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2hGcm9tTXVsdGlwbGVUb1NpbmdsZVN0ZXAocHJvZ3JhbVN0YXRlOiBOUHJvZ3JhbVN0YXRlKSB7XHJcbiAgICAgICAgbGV0IG11bHRpU3RlcCA9IHByb2dyYW1TdGF0ZS5jdXJyZW50U3RlcExpc3RbcHJvZ3JhbVN0YXRlLnN0ZXBJbmRleF07XHJcbiAgICAgICAgbGV0IHNpbmdsZVN0ZXAgPSBtdWx0aVN0ZXAuY29ycmVzcG9uZGluZ1N0ZXBJbk90aGVyU3RlcG1vZGU7XHJcbiAgICAgICAgaWYoc2luZ2xlU3RlcCAhPSBudWxsKXtcclxuICAgICAgICAgICAgcHJvZ3JhbVN0YXRlLmN1cnJlbnRTdGVwTGlzdCA9IHByb2dyYW1TdGF0ZS5wcm9ncmFtLnN0ZXBzU2luZ2xlO1xyXG4gICAgICAgICAgICBwcm9ncmFtU3RhdGUuc3RlcEluZGV4ID0gcHJvZ3JhbVN0YXRlLmN1cnJlbnRTdGVwTGlzdC5pbmRleE9mKHNpbmdsZVN0ZXApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIElmIGEgc3RlcCBjYWxscyBhIGxpYnJhcnkgbWV0aG9kIHdoaWNoIGl0c2VsZiBjYWxscyB0aHJlYWQuY2FsbE1ldGhvZCAoZS5nLiB0byBjYWxsIHRvU3RyaW5nKCkpXHJcbiAgICAgKiB0aGVuIHRoaXMgY2FsbCBNVVNUIEJFIHRoZSBsYXN0IHN0YXRlbWVudCBvZiB0aGlzIHN0ZXAhXHJcbiAgICAgKi9cclxuICAgIGNhbGxDb21waWxlZE1ldGhvZChwcm9ncmFtOiBOUHJvZ3JhbSwgY2FsbGJhY2tBZnRlckZpbmlzaGVkPzogKHZhbHVlOiBhbnkpID0+IHZvaWQpe1xyXG4gICAgICAgIGxldCBzdGF0ZTogTlByb2dyYW1TdGF0ZSA9IHtcclxuICAgICAgICAgICAgcHJvZ3JhbTogcHJvZ3JhbSxcclxuICAgICAgICAgICAgY3VycmVudFN0ZXBMaXN0OiB0aGlzLnRocmVhZFBvb2wuZXhlY3V0ZU1vZGUgPT0gTkV4ZWN1dGVNb2RlLnNpbmdsZVN0ZXBzID8gcHJvZ3JhbS5zdGVwc1NpbmdsZSA6IHByb2dyYW0uc3RlcHNNdWx0aXBsZSxcclxuICAgICAgICAgICAgc3RhY2tCYXNlOiB0aGlzLnN0YWNrLmxlbmd0aCAtIHByb2dyYW0ubnVtYmVyT2ZQYXJhbWV0ZXJzIC0gcHJvZ3JhbS5udW1iZXJPZkxvY2FsVmFyaWFibGVzLFxyXG4gICAgICAgICAgICBzdGVwSW5kZXg6IDAsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrQWZ0ZXJGaW5pc2hlZDogY2FsbGJhY2tBZnRlckZpbmlzaGVkLFxyXG4gICAgICAgICAgICBleGNlcHRpb25JbmZvTGlzdDogW11cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IHByb2dyYW0ubnVtYmVyT2ZMb2NhbFZhcmlhYmxlczsgaSsrKXtcclxuICAgICAgICAgICAgdGhpcy5zdGFjay5wdXNoKG51bGwpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wcm9ncmFtU3RhY2sucHVzaChzdGF0ZSk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbVN0YXRlID0gc3RhdGU7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQcmVjb25kaXRpb25zOiBcclxuICAgICAqIGEpIGFsbCBwYXJhbWV0ZXJzIGFyZSBvbiB0aGUgc3RhY2tcclxuICAgICAqIGIpIHRocmVhZC5jYWxsVmlydHVhbE1ldGhvZCBpcyBsYXN0IHN0YXRlbWVudCBvZiBzdGVwXHJcbiAgICAgKi9cclxuICAgIGNhbGxWaXJ0dWFsTWV0aG9kKHJ1bnRpbWVPYmplY3Q6IE5SdW50aW1lT2JqZWN0LCBzaWduYXR1cmU6IHN0cmluZywgY2FsbGJhY2tBZnRlckZpbmlzaGVkPzogKHZhbHVlOiBhbnkpID0+IHZvaWQpe1xyXG4gICAgICAgIGxldCBtZXRob2QgPSBydW50aW1lT2JqZWN0Ll9fdmlydHVhbE1ldGhvZHNbc2lnbmF0dXJlXTtcclxuICAgICAgICBpZihtZXRob2QuaW52b2tlICE9IG51bGwpe1xyXG4gICAgICAgICAgICB0aGlzLmNhbGxDb21waWxlZE1ldGhvZChtZXRob2QsIChyZXR1cm5WYWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYoY2FsbGJhY2tBZnRlckZpbmlzaGVkICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrQWZ0ZXJGaW5pc2hlZChyZXR1cm5WYWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiByZXR1cm5WYWx1ZSAhPSBcInVuZGVmaW5lZFwiKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFjay5wdXNoKHJldHVyblZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9ICAgIFxyXG4gICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCBuID0gbWV0aG9kLm51bWJlck9mUGFyYW1ldGVycztcclxuICAgICAgICAgICAgbGV0IHBhcmFtczogYW55W10gPSBBcnJheShuKTtcclxuICAgICAgICAgICAgZm9yKGxldCBpID0gMTsgaSA8PSBuOyBpKyspe1xyXG4gICAgICAgICAgICAgICAgcGFyYW1zW24gLSBpXSA9IHRoaXMuc3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IHJldHVyblZhbHVlID0gbWV0aG9kLmludm9rZS5jYWxsKHRoaXMuc3RhY2sucG9wKCksIHBhcmFtcyk7XHJcblxyXG4gICAgICAgICAgICBpZihjYWxsYmFja0FmdGVyRmluaXNoZWQgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja0FmdGVyRmluaXNoZWQocmV0dXJuVmFsdWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIHJldHVyblZhbHVlICE9IFwidW5kZWZpbmVkXCIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhY2sucHVzaChyZXR1cm5WYWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9ICAgIFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG59XHJcblxyXG5leHBvcnQgZW51bSBORXhlY3V0ZU1vZGUgeyBzaW5nbGVTdGVwcywgbXVsdGlwbGVTdGVwc307XHJcblxyXG5leHBvcnQgY2xhc3MgTlRocmVhZFBvb2wge1xyXG4gICAgcnVubmluZ1RocmVhZHM6IE5UaHJlYWRbXSA9IFtdO1xyXG4gICAgY3VycmVudFRocmVhZEluZGV4OiBudW1iZXIgPSAwO1xyXG4gICAgZXhlY3V0ZU1vZGU6IE5FeGVjdXRlTW9kZTtcclxuICAgIHNlbWFwaG9yczogTlNlbWFwaG9yW10gPSBbXTtcclxuICAgIHN0YXRlOiBOVGhyZWFkUG9vbExzdGF0ZTtcclxuXHJcbiAgICBrZWVwVGhyZWFkOiBib29sZWFuID0gZmFsc2U7ICAgIC8vIGZvciBzaW5nbGUgc3RlcCBtb2RlXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBpbnRlcnByZXRlcjogTkludGVycHJldGVyKXtcclxuICAgICAgICB0aGlzLnNldFN0YXRlKE5UaHJlYWRQb29sTHN0YXRlLm5vdF9pbml0aWFsaXplZCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJ1bihudW1iZXJPZlN0ZXBzTWF4OiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgc3RlcHNQZXJUaHJlYWQgPSBNYXRoLmNlaWwobnVtYmVyT2ZTdGVwc01heC90aGlzLnJ1bm5pbmdUaHJlYWRzLmxlbmd0aCk7XHJcbiAgICAgICAgbGV0IG51bWJlck9mU3RlcHMgPSAwO1xyXG4gICAgICAgIGlmKHRoaXMucnVubmluZ1RocmVhZHMubGVuZ3RoID09IDApIHJldHVybiBOVGhyZWFkU3RhdGUuZXhpdGVkO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKFtOVGhyZWFkUG9vbExzdGF0ZS5kb25lLCBOVGhyZWFkUG9vbExzdGF0ZS5ydW5uaW5nXS5pbmRleE9mKHRoaXMuc3RhdGUpIDwgMCl7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShOVGhyZWFkUG9vbExzdGF0ZS5ydW5uaW5nKTtcclxuXHJcbiAgICAgICAgd2hpbGUobnVtYmVyT2ZTdGVwcyA8IG51bWJlck9mU3RlcHNNYXgpe1xyXG4gICAgICAgICAgICBsZXQgY3VycmVudFRocmVhZCA9IHRoaXMucnVubmluZ1RocmVhZHNbdGhpcy5jdXJyZW50VGhyZWFkSW5kZXhdO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbGV0IHN0YXR1cyA9IGN1cnJlbnRUaHJlYWQucnVuKHN0ZXBzUGVyVGhyZWFkKTtcclxuICAgICAgICAgICAgbnVtYmVyT2ZTdGVwcyArPSBzdGVwc1BlclRocmVhZDtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaChzdGF0dXMpe1xyXG4gICAgICAgICAgICAgICAgY2FzZSBOVGhyZWFkU3RhdGUuZXhpdGVkOlxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGZvcihsZXQgc2VtYXBob3Igb2YgY3VycmVudFRocmVhZC5jdXJyZW50bHlIZWxkU2VtYXBob3JzKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VtYXBob3IucmVsZWFzZShjdXJyZW50VGhyZWFkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ydW5uaW5nVGhyZWFkcy5zcGxpY2UodGhpcy5jdXJyZW50VGhyZWFkSW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmKHRoaXMucnVubmluZ1RocmVhZHMubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKE5UaHJlYWRQb29sTHN0YXRlLmRvbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBOVGhyZWFkU3RhdGUuZXhpdGVkV2l0aEV4Y2VwdGlvbjpcclxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBQcmludCBFeGNlcHRpb25cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKE5UaHJlYWRQb29sTHN0YXRlLmRvbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIE5UaHJlYWRTdGF0ZS5wYXVzZWQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShOVGhyZWFkUG9vbExzdGF0ZS5wYXVzZWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYoIXRoaXMua2VlcFRocmVhZCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUaHJlYWRJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgaWYodGhpcy5jdXJyZW50VGhyZWFkSW5kZXggPj0gdGhpcy5ydW5uaW5nVGhyZWFkcy5sZW5ndGgpe1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRocmVhZEluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldFN0YXRlKG5ld1N0YXRlOiBOVGhyZWFkUG9vbExzdGF0ZSl7XHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlci5zZXRTdGF0ZSh0aGlzLnN0YXRlLCBuZXdTdGF0ZSk7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IG5ld1N0YXRlO1xyXG4gICAgfVxyXG5cclxuICAgIHJ1blNpbmdsZVN0ZXBLZWVwaW5nVGhyZWFkKHN0ZXBJbnRvOiBib29sZWFuLCBjYWxsYmFjazogKCkgPT4gdm9pZCl7XHJcbiAgICAgICAgdGhpcy5rZWVwVGhyZWFkID0gdHJ1ZTtcclxuICAgICAgICBpZihzdGVwSW50byl7XHJcbiAgICAgICAgICAgIGlmKHRoaXMuc3RhdGUgPD0gTlRocmVhZFBvb2xMc3RhdGUucGF1c2VkKXtcclxuICAgICAgICAgICAgICAgIHRoaXMucnVuKDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMua2VlcFRocmVhZCA9IGZhbHNlOyAgICAgICAgXHJcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IHRocmVhZCA9IHRoaXMucnVubmluZ1RocmVhZHNbdGhpcy5jdXJyZW50VGhyZWFkSW5kZXhdO1xyXG4gICAgICAgICAgICBpZih0aHJlYWQgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICB0aHJlYWQubWFya1NpbmdsZVN0ZXBPdmVyKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMua2VlcFRocmVhZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHN0ZXBPdXQoY2FsbGJhY2s6ICgpID0+IHZvaWQpe1xyXG4gICAgICAgIHRoaXMua2VlcFRocmVhZCA9IHRydWU7XHJcbiAgICAgICAgbGV0IHRocmVhZCA9IHRoaXMucnVubmluZ1RocmVhZHNbdGhpcy5jdXJyZW50VGhyZWFkSW5kZXhdO1xyXG4gICAgICAgIGlmKHRocmVhZCA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgdGhyZWFkLm1hcmtTdGVwT3V0KCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5rZWVwVGhyZWFkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHVubWFya1N0ZXAoKXtcclxuICAgICAgICBsZXQgdGhyZWFkID0gdGhpcy5ydW5uaW5nVGhyZWFkc1t0aGlzLmN1cnJlbnRUaHJlYWRJbmRleF07XHJcbiAgICAgICAgdGhyZWFkLnVubWFya1N0ZXAoKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgc3dpdGNoQWxsVGhyZWFkc1RvU2luZ2xlU3RlcE1vZGUoKXtcclxuICAgICAgICBmb3IobGV0IHRocmVhZCBvZiB0aGlzLnJ1bm5pbmdUaHJlYWRzKXtcclxuICAgICAgICAgICAgdGhpcy5zd2l0Y2hUaHJlYWRUb1NpbmdsZVN0ZXBNb2RlKHRocmVhZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGZvcihsZXQgcyBvZiB0aGlzLnNlbWFwaG9ycyl7XHJcbiAgICAgICAgICAgIGZvcihsZXQgdGhyZWFkIG9mIHMud2FpdGluZ1RocmVhZHMpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hUaHJlYWRUb1NpbmdsZVN0ZXBNb2RlKHRocmVhZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzd2l0Y2hUaHJlYWRUb1NpbmdsZVN0ZXBNb2RlKHRocmVhZDogTlRocmVhZCkge1xyXG4gICAgICAgIGxldCBjdXJyZW50U3RhdGUgPSB0aHJlYWQuY3VycmVudFByb2dyYW1TdGF0ZTtcclxuICAgICAgICBpZiAoY3VycmVudFN0YXRlLmN1cnJlbnRTdGVwTGlzdCA9PSBjdXJyZW50U3RhdGUucHJvZ3JhbS5zdGVwc011bHRpcGxlKSB7XHJcbiAgICAgICAgICAgIHRocmVhZC5zd2l0Y2hGcm9tTXVsdGlwbGVUb1NpbmdsZVN0ZXAoY3VycmVudFN0YXRlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlVGhyZWFkKHByb2dyYW06IE5Qcm9ncmFtLCBpbml0aWFsU3RhY2s6IGFueVtdID0gW10sIGNhbGxiYWNrQWZ0ZXJGaW5pc2hlZD86ICh2YWx1ZTogYW55KSA9PiB2b2lkKXtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgdGhyZWFkID0gbmV3IE5UaHJlYWQodGhpcywgaW5pdGlhbFN0YWNrKTtcclxuICAgICAgICB0aHJlYWQuY2FsbENvbXBpbGVkTWV0aG9kKHByb2dyYW0sIGNhbGxiYWNrQWZ0ZXJGaW5pc2hlZCk7ICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICBzdXNwZW5kVGhyZWFkKHRocmVhZDogTlRocmVhZCkge1xyXG4gICAgICAgIGxldCBpbmRleCA9IHRoaXMucnVubmluZ1RocmVhZHMuaW5kZXhPZih0aHJlYWQpO1xyXG4gICAgICAgIGlmIChpbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucnVubmluZ1RocmVhZHMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFRocmVhZEluZGV4ID49IGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUaHJlYWRJbmRleC0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXN0b3JlVGhyZWFkKHRocmVhZDogTlRocmVhZCkge1xyXG4gICAgICAgIHRoaXMucnVubmluZ1RocmVhZHMucHVzaCh0aHJlYWQpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIGZvciBkaXNwbGF5aW5nIG5leHQgcHJvZ3JhbSBwb3NpdGlvbiBpbiBlZGl0b3JcclxuICAgICAqL1xyXG4gICAgZ2V0TmV4dFN0ZXBQb3NpdGlvbigpOiBUZXh0UG9zaXRpb25XaXRoTW9kdWxlIHtcclxuICAgICAgICBsZXQgY3VycmVudFRocmVhZCA9IHRoaXMucnVubmluZ1RocmVhZHNbdGhpcy5jdXJyZW50VGhyZWFkSW5kZXhdO1xyXG4gICAgICAgIGxldCBwcm9ncmFtU3RhdGUgPSBjdXJyZW50VGhyZWFkLmN1cnJlbnRQcm9ncmFtU3RhdGU7XHJcbiAgICAgICAgbGV0IHN0ZXAgPSBwcm9ncmFtU3RhdGUuY3VycmVudFN0ZXBMaXN0W3Byb2dyYW1TdGF0ZS5zdGVwSW5kZXhdO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIG1vZHVsZTogcHJvZ3JhbVN0YXRlLnByb2dyYW0ubW9kdWxlLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogc3RlcC5wb3NpdGlvblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgaW5pdChtb2R1bGVTdG9yZTogTW9kdWxlU3RvcmUsIG1haW5Nb2R1bGU6IE1vZHVsZSkge1xyXG4gICAgICAgIC8vIFRPRE8hIVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEluc3RhbnRpYXRlIGVudW0gdmFsdWUtb2JqZWN0czsgaW5pdGlhbGl6ZSBzdGF0aWMgYXR0cmlidXRlczsgY2FsbCBzdGF0aWMgY29uc3RydWN0b3JzXHJcblxyXG4gICAgICAgIC8vIHRoaXMucHJvZ3JhbVN0YWNrLnB1c2goe1xyXG4gICAgICAgIC8vICAgICBwcm9ncmFtOiB0aGlzLm1haW5Nb2R1bGUubWFpblByb2dyYW0sXHJcbiAgICAgICAgLy8gICAgIHByb2dyYW1Qb3NpdGlvbjogMCxcclxuICAgICAgICAvLyAgICAgdGV4dFBvc2l0aW9uOiB7IGxpbmU6IDEsIGNvbHVtbjogMSwgbGVuZ3RoOiAwIH0sXHJcbiAgICAgICAgLy8gICAgIG1ldGhvZDogXCJIYXVwdHByb2dyYW1tXCIsXHJcbiAgICAgICAgLy8gICAgIGNhbGxiYWNrQWZ0ZXJSZXR1cm46IG51bGwsXHJcbiAgICAgICAgLy8gICAgIGlzQ2FsbGVkRnJvbU91dHNpZGU6IFwiSGF1cHRwcm9ncmFtbVwiXHJcblxyXG4gICAgICAgIC8vIH0pXHJcblxyXG4gICAgICAgIC8vIGZvciAobGV0IG0gb2YgdGhpcy5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKSkge1xyXG4gICAgICAgIC8vICAgICB0aGlzLmluaXRpYWxpemVFbnVtcyhtKTtcclxuICAgICAgICAvLyAgICAgdGhpcy5pbml0aWFsaXplQ2xhc3NlcyhtKTtcclxuICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgIC8vIHRoaXMucG9wUHJvZ3JhbSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTlNlbWFwaG9yIHtcclxuICAgIGNvdW50ZXI6IG51bWJlcjsgICAgICAgIC8vIE51bWJlciBvZiBjdXJyZW50bHkgYXZhaWxhYmxlIHRva2Vuc1xyXG5cclxuICAgIHJ1bm5pbmdUaHJlYWRzOiBOVGhyZWFkW10gPSBbXTtcclxuICAgIHdhaXRpbmdUaHJlYWRzOiBOVGhyZWFkW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRocmVhZFBvb2w6IE5UaHJlYWRQb29sLCBwcml2YXRlIGNhcGFjaXR5OiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLmNvdW50ZXIgPSBjYXBhY2l0eTtcclxuICAgICAgICB0aHJlYWRQb29sLnNlbWFwaG9ycy5wdXNoKHRoaXMpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBhcXVpcmUodGhyZWFkOiBOVGhyZWFkKTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKHRoaXMuY291bnRlciA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5jb3VudGVyLS07XHJcbiAgICAgICAgICAgIHRoaXMucnVubmluZ1RocmVhZHMucHVzaCh0aHJlYWQpO1xyXG4gICAgICAgICAgICB0aHJlYWQuY3VycmVudGx5SGVsZFNlbWFwaG9ycy5wdXNoKHRoaXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnRocmVhZFBvb2wuc3VzcGVuZFRocmVhZCh0aHJlYWQpO1xyXG4gICAgICAgICAgICB0aGlzLndhaXRpbmdUaHJlYWRzLnB1c2godGhyZWFkKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgcmVsZWFzZSh0aHJlYWQ6IE5UaHJlYWQpIHtcclxuICAgICAgICBsZXQgaW5kZXggPSB0aGlzLnJ1bm5pbmdUaHJlYWRzLmluZGV4T2YodGhyZWFkKTtcclxuICAgICAgICBpZiAoaW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnJ1bm5pbmdUaHJlYWRzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLndhaXRpbmdUaHJlYWRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGhyZWFkUG9vbC5yZXN0b3JlVGhyZWFkKHRoaXMud2FpdGluZ1RocmVhZHMuc2hpZnQoKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvdW50ZXIrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIEVycm9yOiBUaHJlYWQgaGFkIG5vIHRva2VuIVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iXX0=