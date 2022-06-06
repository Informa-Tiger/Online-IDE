import { Method, Parameterlist } from "../compiler/types/Types.js";
import { Klass, Interface } from "../compiler/types/Class.js";
import { intPrimitiveType, voidPrimitiveType } from "../compiler/types/PrimitiveTypes.js";
import { RuntimeObject } from "../interpreter/RuntimeObject.js";
import { InterpreterState } from "../interpreter/Interpreter.js";
export class Runnable extends Interface {
    constructor(module) {
        super("Runnable", module);
        this.addMethod(new Method("run", new Parameterlist([
        // { identifier: "deltaTimeInMs", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), voidPrimitiveType, null, // no implementation!
        false, false, "Wird vom Timer immer wieder aufgerufen"));
    }
}
export class TimerClass extends Klass {
    constructor(module) {
        super("Timer", module, "Timer Klasse zur periodischen Ausführung von Methoden");
        this.timerEntries = [];
        this.timerRunning = false;
        this.timerStarted = false;
        this.setBaseClass(module.typeStore.getType("Object"));
        this.staticClass.classObject = new RuntimeObject(this.staticClass);
        this.addMethod(new Method("repeat", new Parameterlist([
            {
                identifier: "runnable", type: module.typeStore.getType("Runnable"),
                declaration: null, usagePositions: null, isFinal: true
            },
            {
                identifier: "deltaTimeInMs", type: intPrimitiveType,
                declaration: null, usagePositions: null, isFinal: true
            },
        ]), voidPrimitiveType, (parameters) => {
            let tl = parameters[1].value;
            let dt = parameters[2].value;
            let timerEntry = {
                timerListener: tl,
                dt: dt,
                lastTimeFired: 0,
                running: true,
                method: tl.class.getMethod("run", new Parameterlist([
                // {
                //     identifier: "deltaTimeInMs",
                //     type: intPrimitiveType,
                //     declaration: null,
                //     isFinal: true,
                //     usagePositions: null
                // }
                ]))
            };
            this.timerEntries.push(timerEntry);
            // console.log("TimerListener added with dt = " + dt + " ms.");
        }, false, true, "Fügt ein neues TimerListener-Objekt hinzu und ruft dessen tick-Methode immer wieder auf."));
    }
    startTimer() {
        if (!this.timerStarted) {
            this.timerStarted = true;
            this.processTimerEntries();
        }
    }
    stopTimer() {
        this.timerStarted = false;
    }
    processTimerEntries() {
        var _a, _b;
        if (!this.timerStarted) {
            return;
        }
        if (this.timerEntries.length > 0) {
            let interpreter = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.main) === null || _b === void 0 ? void 0 : _b.getInterpreter();
            if (interpreter != null) {
                if (!this.timerRunning && interpreter.state == InterpreterState.running) {
                    let t = performance.now();
                    for (let timerentry of this.timerEntries) {
                        let dt = t - timerentry.lastTimeFired;
                        if (dt >= timerentry.dt) {
                            this.runEntry(timerentry, interpreter, Math.round(dt));
                            timerentry.lastTimeFired = t;
                        }
                    }
                }
                switch (interpreter.state) {
                    case InterpreterState.done:
                    case InterpreterState.error:
                    case InterpreterState.not_initialized:
                        this.timerEntries = [];
                        this.timerRunning = false;
                        break;
                }
            }
        }
        let that = this;
        setTimeout(() => {
            that.processTimerEntries();
        }, 10);
    }
    runEntry(timerentry, interpreter, dt) {
        let stackElements = [
            {
                type: timerentry.timerListener.class,
                value: timerentry.timerListener
            },
            // {
            //     type: intPrimitiveType,
            //     value: dt
            // }
        ];
        this.timerRunning = true;
        let that = this;
        interpreter.runTimer(timerentry.method, stackElements, (interpreter) => {
            that.timerRunning = false;
        }, false);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGltZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50L3J1bnRpbWVsaWJyYXJ5L1RpbWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBUSxNQUFNLEVBQUUsYUFBYSxFQUFvQixNQUFNLDRCQUE0QixDQUFDO0FBQzNGLE9BQU8sRUFBRSxLQUFLLEVBQWMsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDMUUsT0FBTyxFQUFnRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBR3hKLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQWUsTUFBTSwrQkFBK0IsQ0FBQztBQUk5RSxNQUFNLE9BQU8sUUFBUyxTQUFRLFNBQVM7SUFFbkMsWUFBWSxNQUFjO1FBQ3RCLEtBQUssQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxhQUFhLENBQUM7UUFDL0Msa0hBQWtIO1NBQ3JILENBQUMsRUFBRSxpQkFBaUIsRUFDakIsSUFBSSxFQUFHLHFCQUFxQjtRQUM1QixLQUFLLEVBQUUsS0FBSyxFQUFFLHdDQUF3QyxDQUFDLENBQUMsQ0FBQztJQUNqRSxDQUFDO0NBRUo7QUFVRCxNQUFNLE9BQU8sVUFBVyxTQUFRLEtBQUs7SUFPakMsWUFBWSxNQUFjO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLHVEQUF1RCxDQUFDLENBQUM7UUFOcEYsaUJBQVksR0FBaUIsRUFBRSxDQUFDO1FBQ2hDLGlCQUFZLEdBQVksS0FBSyxDQUFDO1FBRTlCLGlCQUFZLEdBQVksS0FBSyxDQUFDO1FBSzFCLElBQUksQ0FBQyxZQUFZLENBQVEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUU3RCxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsR0FBRyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFbkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDbEQ7Z0JBQ0ksVUFBVSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO2dCQUNsRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUk7YUFDekQ7WUFDRDtnQkFDSSxVQUFVLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ25ELFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSTthQUN6RDtTQUNKLENBQUMsRUFBRSxpQkFBaUIsRUFDakIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksRUFBRSxHQUFpQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNELElBQUksRUFBRSxHQUFtQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBRTdDLElBQUksVUFBVSxHQUFlO2dCQUN6QixhQUFhLEVBQUUsRUFBRTtnQkFDakIsRUFBRSxFQUFFLEVBQUU7Z0JBQ04sYUFBYSxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE1BQU0sRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxhQUFhLENBQUM7Z0JBQ2hELElBQUk7Z0JBQ0osbUNBQW1DO2dCQUNuQyw4QkFBOEI7Z0JBQzlCLHlCQUF5QjtnQkFDekIscUJBQXFCO2dCQUNyQiwyQkFBMkI7Z0JBQzNCLElBQUk7aUJBQ1AsQ0FBQyxDQUFDO2FBQ04sQ0FBQTtZQUVELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRW5DLCtEQUErRDtRQUVuRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSwwRkFBMEYsQ0FBQyxDQUFDLENBQUM7SUFFckgsQ0FBQztJQUVELFVBQVU7UUFDTixJQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBQztZQUNsQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztZQUN6QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztTQUM5QjtJQUNMLENBQUM7SUFFRCxTQUFTO1FBQ0wsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7SUFDOUIsQ0FBQztJQUVELG1CQUFtQjs7UUFFZixJQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBQztZQUNsQixPQUFPO1NBQ1Y7UUFFRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM5QixJQUFJLFdBQVcsR0FBRyxNQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sMENBQUUsSUFBSSwwQ0FBRSxjQUFjLEVBQUUsQ0FBQztZQUV0RCxJQUFJLFdBQVcsSUFBSSxJQUFJLEVBQUU7Z0JBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLFdBQVcsQ0FBQyxLQUFLLElBQUksZ0JBQWdCLENBQUMsT0FBTyxFQUFFO29CQUNyRSxJQUFJLENBQUMsR0FBVyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ2xDLEtBQUssSUFBSSxVQUFVLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTt3QkFDdEMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUM7d0JBQ3RDLElBQUksRUFBRSxJQUFJLFVBQVUsQ0FBQyxFQUFFLEVBQUU7NEJBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ3ZELFVBQVUsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO3lCQUNoQztxQkFDSjtpQkFDSjtnQkFFRCxRQUFRLFdBQVcsQ0FBQyxLQUFLLEVBQUU7b0JBQ3ZCLEtBQUssZ0JBQWdCLENBQUMsSUFBSSxDQUFDO29CQUMzQixLQUFLLGdCQUFnQixDQUFDLEtBQUssQ0FBQztvQkFDNUIsS0FBSyxnQkFBZ0IsQ0FBQyxlQUFlO3dCQUNqQyxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQzt3QkFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7d0JBQzFCLE1BQU07aUJBQ2I7YUFFSjtTQUVKO1FBR0QsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDWixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMvQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFWCxDQUFDO0lBRUQsUUFBUSxDQUFDLFVBQXNCLEVBQUUsV0FBd0IsRUFBRSxFQUFVO1FBQ2pFLElBQUksYUFBYSxHQUFZO1lBQ3pCO2dCQUNJLElBQUksRUFBRSxVQUFVLENBQUMsYUFBYSxDQUFDLEtBQUs7Z0JBQ3BDLEtBQUssRUFBRSxVQUFVLENBQUMsYUFBYTthQUNsQztZQUNELElBQUk7WUFDSiw4QkFBOEI7WUFDOUIsZ0JBQWdCO1lBQ2hCLElBQUk7U0FDUCxDQUFDO1FBRUYsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDekIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWhCLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUNuRSxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztRQUM5QixDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDZCxDQUFDO0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUeXBlLCBNZXRob2QsIFBhcmFtZXRlcmxpc3QsIFZhbHVlLCBBdHRyaWJ1dGUgfSBmcm9tIFwiLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgS2xhc3MsIFZpc2liaWxpdHksIEludGVyZmFjZSB9IGZyb20gXCIuLi9jb21waWxlci90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBzdHJpbmdQcmltaXRpdmVUeXBlLCBkb3VibGVQcmltaXRpdmVUeXBlLCBmbG9hdFByaW1pdGl2ZVR5cGUsIGludFByaW1pdGl2ZVR5cGUsIHZvaWRQcmltaXRpdmVUeXBlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL1ByaW1pdGl2ZVR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IE1vZHVsZSB9IGZyb20gXCIuLi9jb21waWxlci9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IFByaW50TWFuYWdlciB9IGZyb20gXCIuLi9tYWluL2d1aS9QcmludE1hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgUnVudGltZU9iamVjdCB9IGZyb20gXCIuLi9pbnRlcnByZXRlci9SdW50aW1lT2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IEVudW0gfSBmcm9tIFwiLi4vY29tcGlsZXIvdHlwZXMvRW51bS5qc1wiO1xyXG5pbXBvcnQgeyBJbnRlcnByZXRlclN0YXRlLCBJbnRlcnByZXRlciB9IGZyb20gXCIuLi9pbnRlcnByZXRlci9JbnRlcnByZXRlci5qc1wiO1xyXG5pbXBvcnQgeyBQcm9ncmFtIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3BhcnNlci9Qcm9ncmFtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIFJ1bm5hYmxlIGV4dGVuZHMgSW50ZXJmYWNlIHtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihtb2R1bGU6IE1vZHVsZSkge1xyXG4gICAgICAgIHN1cGVyKFwiUnVubmFibGVcIiwgbW9kdWxlKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInJ1blwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIC8vIHsgaWRlbnRpZmllcjogXCJkZWx0YVRpbWVJbk1zXCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9XHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICBudWxsLCAgLy8gbm8gaW1wbGVtZW50YXRpb24hXHJcbiAgICAgICAgICAgIGZhbHNlLCBmYWxzZSwgXCJXaXJkIHZvbSBUaW1lciBpbW1lciB3aWVkZXIgYXVmZ2VydWZlblwiKSk7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG50eXBlIFRpbWVyRW50cnkgPSB7XHJcbiAgICB0aW1lckxpc3RlbmVyOiBSdW50aW1lT2JqZWN0LFxyXG4gICAgZHQ6IG51bWJlcixcclxuICAgIHJ1bm5pbmc6IGJvb2xlYW4sXHJcbiAgICBsYXN0VGltZUZpcmVkOiBudW1iZXIsXHJcbiAgICBtZXRob2Q6IE1ldGhvZFxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGltZXJDbGFzcyBleHRlbmRzIEtsYXNzIHtcclxuXHJcbiAgICB0aW1lckVudHJpZXM6IFRpbWVyRW50cnlbXSA9IFtdO1xyXG4gICAgdGltZXJSdW5uaW5nOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgdGltZXJTdGFydGVkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgY29uc3RydWN0b3IobW9kdWxlOiBNb2R1bGUpIHtcclxuICAgICAgICBzdXBlcihcIlRpbWVyXCIsIG1vZHVsZSwgXCJUaW1lciBLbGFzc2UgenVyIHBlcmlvZGlzY2hlbiBBdXNmw7xocnVuZyB2b24gTWV0aG9kZW5cIik7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0QmFzZUNsYXNzKDxLbGFzcz5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJPYmplY3RcIikpO1xyXG5cclxuICAgICAgICB0aGlzLnN0YXRpY0NsYXNzLmNsYXNzT2JqZWN0ID0gbmV3IFJ1bnRpbWVPYmplY3QodGhpcy5zdGF0aWNDbGFzcyk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJyZXBlYXRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBcInJ1bm5hYmxlXCIsIHR5cGU6IG1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlJ1bm5hYmxlXCIpLFxyXG4gICAgICAgICAgICAgICAgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IFwiZGVsdGFUaW1lSW5Nc1wiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB0bDogUnVudGltZU9iamVjdCA9IDxSdW50aW1lT2JqZWN0PnBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZHQ6IG51bWJlciA9IDxudW1iZXI+cGFyYW1ldGVyc1syXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdGltZXJFbnRyeTogVGltZXJFbnRyeSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0aW1lckxpc3RlbmVyOiB0bCxcclxuICAgICAgICAgICAgICAgICAgICBkdDogZHQsXHJcbiAgICAgICAgICAgICAgICAgICAgbGFzdFRpbWVGaXJlZDogMCxcclxuICAgICAgICAgICAgICAgICAgICBydW5uaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogdGwuY2xhc3MuZ2V0TWV0aG9kKFwicnVuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgaWRlbnRpZmllcjogXCJkZWx0YVRpbWVJbk1zXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgZGVjbGFyYXRpb246IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBpc0ZpbmFsOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdXNhZ2VQb3NpdGlvbnM6IG51bGxcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgICAgICAgICAgICAgIF0pKVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMudGltZXJFbnRyaWVzLnB1c2godGltZXJFbnRyeSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJUaW1lckxpc3RlbmVyIGFkZGVkIHdpdGggZHQgPSBcIiArIGR0ICsgXCIgbXMuXCIpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsIFwiRsO8Z3QgZWluIG5ldWVzIFRpbWVyTGlzdGVuZXItT2JqZWt0IGhpbnp1IHVuZCBydWZ0IGRlc3NlbiB0aWNrLU1ldGhvZGUgaW1tZXIgd2llZGVyIGF1Zi5cIikpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzdGFydFRpbWVyKCl7XHJcbiAgICAgICAgaWYoIXRoaXMudGltZXJTdGFydGVkKXtcclxuICAgICAgICAgICAgdGhpcy50aW1lclN0YXJ0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NUaW1lckVudHJpZXMoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHN0b3BUaW1lcigpe1xyXG4gICAgICAgIHRoaXMudGltZXJTdGFydGVkID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc1RpbWVyRW50cmllcygpIHtcclxuXHJcbiAgICAgICAgaWYoIXRoaXMudGltZXJTdGFydGVkKXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMudGltZXJFbnRyaWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgbGV0IGludGVycHJldGVyID0gdGhpcy5tb2R1bGU/Lm1haW4/LmdldEludGVycHJldGVyKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoaW50ZXJwcmV0ZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRpbWVyUnVubmluZyAmJiBpbnRlcnByZXRlci5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLnJ1bm5pbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdDogbnVtYmVyID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgdGltZXJlbnRyeSBvZiB0aGlzLnRpbWVyRW50cmllcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZHQgPSB0IC0gdGltZXJlbnRyeS5sYXN0VGltZUZpcmVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZHQgPj0gdGltZXJlbnRyeS5kdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ydW5FbnRyeSh0aW1lcmVudHJ5LCBpbnRlcnByZXRlciwgTWF0aC5yb3VuZChkdCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXJlbnRyeS5sYXN0VGltZUZpcmVkID0gdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGludGVycHJldGVyLnN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBJbnRlcnByZXRlclN0YXRlLmRvbmU6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBJbnRlcnByZXRlclN0YXRlLmVycm9yOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgSW50ZXJwcmV0ZXJTdGF0ZS5ub3RfaW5pdGlhbGl6ZWQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJFbnRyaWVzID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJSdW5uaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoYXQucHJvY2Vzc1RpbWVyRW50cmllcygpO1xyXG4gICAgICAgIH0sIDEwKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcnVuRW50cnkodGltZXJlbnRyeTogVGltZXJFbnRyeSwgaW50ZXJwcmV0ZXI6IEludGVycHJldGVyLCBkdDogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IHN0YWNrRWxlbWVudHM6IFZhbHVlW10gPSBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IHRpbWVyZW50cnkudGltZXJMaXN0ZW5lci5jbGFzcyxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB0aW1lcmVudHJ5LnRpbWVyTGlzdGVuZXJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8ge1xyXG4gICAgICAgICAgICAvLyAgICAgdHlwZTogaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgLy8gICAgIHZhbHVlOiBkdFxyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgdGhpcy50aW1lclJ1bm5pbmcgPSB0cnVlO1xyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgaW50ZXJwcmV0ZXIucnVuVGltZXIodGltZXJlbnRyeS5tZXRob2QsIHN0YWNrRWxlbWVudHMsIChpbnRlcnByZXRlcikgPT4ge1xyXG4gICAgICAgICAgICB0aGF0LnRpbWVyUnVubmluZyA9IGZhbHNlO1xyXG4gICAgICAgIH0sIGZhbHNlKTtcclxuICAgIH1cclxuXHJcbn0iXX0=