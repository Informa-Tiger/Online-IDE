import { Method, Parameterlist, Attribute } from "../compiler/types/Types.js";
import { Klass, Visibility } from "../compiler/types/Class.js";
import { stringPrimitiveType, intPrimitiveType, voidPrimitiveType } from "../compiler/types/PrimitiveTypes.js";
import { RuntimeObject } from "../interpreter/RuntimeObject.js";
export class SystemClass extends Klass {
    constructor(module) {
        super("System", module, "Klasse mit statischen Methoden für Systemfunktionen, z.B. Sound, Löschen der Ausgabe usw.");
        this.deltaTimeMillis = 0; // when using WebSocket then the Server sends time synchronization
        this.printStream = new RuntimeObject(module.typeStore.getType("PrintStream"));
        this.setBaseClass(module.typeStore.getType("Object"));
        this.addAttribute(new Attribute("out", module.typeStore.getType("PrintStream"), (value) => { value.value = this.printStream; }, true, Visibility.public, true, "PrintStream-Objekt, mit dem Text ausgegeben werden kann."));
        this.staticClass.setupAttributeIndicesRecursive();
        this.staticClass.classObject = new RuntimeObject(this.staticClass);
        // this.addMethod(new Method("clearScreen", new Parameterlist([
        // ]), null,
        //     (parameters) => {
        //         module.main.getInterpreter().printManager.clear();
        //     }, false, true, "Löscht den Bildschirm"));
        // this.addMethod(new Method("addKeyListener", new Parameterlist([
        //     { identifier: "keyListener", type: module.typeStore.getType("KeyListener"), declaration: null, usagePositions: null, isFinal: true }
        // ]), null,
        // (parameters) => {
        //     let r: RuntimeObject = parameters[1].value;
        //     let method = (<Klass>r.class).getMethodBySignature("onKeyTyped(String)");
        //     if (method != null) {
        //         module.main.getInterpreter().keyboardTool.keyPressedCallbacks.push((key) => {
        //             let program = method?.program;
        //             let invoke = method?.invoke;
        //             let stackElements: Value[] = [
        //                 {
        //                     type: r.class,
        //                     value: r
        //                 },
        //                 {
        //                     type: stringPrimitiveType,
        //                     value: key
        //                 }
        //             ];
        //             if (program != null) {
        //                 module.main.getInterpreter().runTimer(method, stackElements, null, false);
        //             } else if (invoke != null) {
        //                 invoke([]);
        //             }
        //         });
        //     }
        // }    
        // , false, true, "Fügt einen KeyListener hinzu, dessen Methode keyTyped immer dann aufgerufen wird, wenn eine Taste gedrückt und anschließend losgelassen wird."));
        // this.addMethod(new Method("playSound", new Parameterlist([
        //     { identifier: "sound", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        // ]), null,
        // (parameters) => {
        //     let sound: string = parameters[1].value;
        //     SoundTools.play(sound);
        // }    
        // , false, true, "Spielt einen Sound ab. Die Möglichen Sounds sind als statische Variablen der Klasse Sound hinterlegt. Tippe als Parameter also Sound gefolgt von einem Punkt ein, um eine Auswahl zu sehen!"));
        this.addMethod(new Method("currentTimeMillis", new Parameterlist([]), intPrimitiveType, (parameters) => {
            return Date.now() + this.deltaTimeMillis;
        }, false, true, "Gibt die Anzahl der Millisekunden, die seit dem 01.01.1970 00:00:00 UTC vergangen sind, zurück."));
        this.addMethod(new Method("exit", new Parameterlist([
            { identifier: "status", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), voidPrimitiveType, (parameters) => {
            var _a;
            let console = (_a = module.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console;
            if (console != null) {
                console.writeConsoleEntry("Das Programm wurde angehalten mit Statuswert: " + parameters[1].value, null, "#0000ff");
                console.showTab();
            }
            module.main.getInterpreter().stop();
        }, false, true, "Beendet das Programm und gibt den übergebenen Wert in der Konsole aus."));
    }
}
export class PrintStreamClass extends Klass {
    constructor(module) {
        super("PrintStream", module, "Interne Hilfsklasse, um System.out.println zu ermöglichen. Das Objekt System.out ist von der Klasse PrintStream.");
        this.setBaseClass(module.typeStore.getType("Object"));
        this.addMethod(new Method("print", new Parameterlist([
            { identifier: "text", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), null, (parameters) => {
            module.main.getInterpreter().printManager.print(parameters[1].value);
        }, false, true, "Gibt den Text aus."));
        this.addMethod(new Method("println", new Parameterlist([
            { identifier: "text", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), null, (parameters) => {
            module.main.getInterpreter().printManager.println(parameters[1].value);
        }, false, true, "Gibt den Text aus, gefolgt von einem Zeilensprung."));
        this.addMethod(new Method("println", new Parameterlist([]), null, (parameters) => {
            module.main.getInterpreter().printManager.println("");
        }, false, true, "Setzt den Cursor in die nächste Zeile."));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3lzdGVtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudC9ydW50aW1lbGlicmFyeS9TeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFRLE1BQU0sRUFBRSxhQUFhLEVBQVMsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDM0YsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQWEsTUFBTSw0QkFBNEIsQ0FBQztBQUMxRSxPQUFPLEVBQUUsbUJBQW1CLEVBQTJDLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHeEosT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBSWhFLE1BQU0sT0FBTyxXQUFZLFNBQVEsS0FBSztJQU1sQyxZQUFZLE1BQWM7UUFDdEIsS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsMkZBQTJGLENBQUMsQ0FBQztRQUh6SCxvQkFBZSxHQUFXLENBQUMsQ0FBQyxDQUFDLGtFQUFrRTtRQUszRixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksYUFBYSxDQUFRLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFFckYsSUFBSSxDQUFDLFlBQVksQ0FBUSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRTdELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUMxRSxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSwwREFBMEQsQ0FBQyxDQUFDLENB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bXBvcnQgeyBUeXBlLCBNZXRob2QsIFBhcmFtZXRlcmxpc3QsIFZhbHVlLCBBdHRyaWJ1dGUgfSBmcm9tIFwiLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgS2xhc3MsIFZpc2liaWxpdHksIEludGVyZmFjZSB9IGZyb20gXCIuLi9jb21waWxlci90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBzdHJpbmdQcmltaXRpdmVUeXBlLCBkb3VibGVQcmltaXRpdmVUeXBlLCBmbG9hdFByaW1pdGl2ZVR5cGUsIGludFByaW1pdGl2ZVR5cGUsIHZvaWRQcmltaXRpdmVUeXBlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL1ByaW1pdGl2ZVR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IE1vZHVsZSB9IGZyb20gXCIuLi9jb21waWxlci9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IFByaW50TWFuYWdlciB9IGZyb20gXCIuLi9tYWluL2d1aS9QcmludE1hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgUnVudGltZU9iamVjdCB9IGZyb20gXCIuLi9pbnRlcnByZXRlci9SdW50aW1lT2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IEVudW1SdW50aW1lT2JqZWN0IH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL0VudW0uanNcIjtcclxuaW1wb3J0IHsgU291bmRUb29scyB9IGZyb20gXCIuLi90b29scy9Tb3VuZFRvb2xzLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgU3lzdGVtQ2xhc3MgZXh0ZW5kcyBLbGFzcyB7XHJcblxyXG4gICAgcHJpbnRTdHJlYW06IFJ1bnRpbWVPYmplY3Q7XHJcblxyXG4gICAgZGVsdGFUaW1lTWlsbGlzOiBudW1iZXIgPSAwOyAvLyB3aGVuIHVzaW5nIFdlYlNvY2tldCB0aGVuIHRoZSBTZXJ2ZXIgc2VuZHMgdGltZSBzeW5jaHJvbml6YXRpb25cclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihtb2R1bGU6IE1vZHVsZSkge1xyXG4gICAgICAgIHN1cGVyKFwiU3lzdGVtXCIsIG1vZHVsZSwgXCJLbGFzc2UgbWl0IHN0YXRpc2NoZW4gTWV0aG9kZW4gZsO8ciBTeXN0ZW1mdW5rdGlvbmVuLCB6LkIuIFNvdW5kLCBMw7ZzY2hlbiBkZXIgQXVzZ2FiZSB1c3cuXCIpO1xyXG5cclxuICAgICAgICB0aGlzLnByaW50U3RyZWFtID0gbmV3IFJ1bnRpbWVPYmplY3QoPEtsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlByaW50U3RyZWFtXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRCYXNlQ2xhc3MoPEtsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIk9iamVjdFwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQXR0cmlidXRlKG5ldyBBdHRyaWJ1dGUoXCJvdXRcIiwgbW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiUHJpbnRTdHJlYW1cIiksXHJcbiAgICAgICAgICAgICh2YWx1ZSkgPT4geyB2YWx1ZS52YWx1ZSA9IHRoaXMucHJpbnRTdHJlYW0gfSwgdHJ1ZSwgVmlzaWJpbGl0eS5wdWJsaWMsIHRydWUsIFwiUHJpbnRTdHJlYW0tT2JqZWt0LCBtaXQgZGVtIFRleHQgYXVzZ2VnZWJlbiB3ZXJkZW4ga2Fubi5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLnN0YXRpY0NsYXNzLnNldHVwQXR0cmlidXRlSW5kaWNlc1JlY3Vyc2l2ZSgpO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy5zdGF0aWNDbGFzcy5jbGFzc09iamVjdCA9IG5ldyBSdW50aW1lT2JqZWN0KHRoaXMuc3RhdGljQ2xhc3MpO1xyXG5cclxuICAgICAgICAvLyB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiY2xlYXJTY3JlZW5cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIC8vIF0pLCBudWxsLFxyXG4gICAgICAgIC8vICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgIC8vICAgICAgICAgbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS5wcmludE1hbmFnZXIuY2xlYXIoKTtcclxuICAgICAgICAvLyAgICAgfSwgZmFsc2UsIHRydWUsIFwiTMO2c2NodCBkZW4gQmlsZHNjaGlybVwiKSk7XHJcblxyXG4gICAgICAgIC8vIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJhZGRLZXlMaXN0ZW5lclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgLy8gICAgIHsgaWRlbnRpZmllcjogXCJrZXlMaXN0ZW5lclwiLCB0eXBlOiBtb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJLZXlMaXN0ZW5lclwiKSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICAvLyBdKSwgbnVsbCxcclxuICAgICAgICAvLyAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgIC8vICAgICBsZXQgcjogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgLy8gICAgIGxldCBtZXRob2QgPSAoPEtsYXNzPnIuY2xhc3MpLmdldE1ldGhvZEJ5U2lnbmF0dXJlKFwib25LZXlUeXBlZChTdHJpbmcpXCIpO1xyXG5cclxuICAgICAgICAvLyAgICAgaWYgKG1ldGhvZCAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgIC8vICAgICAgICAgbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS5rZXlib2FyZFRvb2wua2V5UHJlc3NlZENhbGxiYWNrcy5wdXNoKChrZXkpID0+IHtcclxuXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgbGV0IHByb2dyYW0gPSBtZXRob2Q/LnByb2dyYW07XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgbGV0IGludm9rZSA9IG1ldGhvZD8uaW52b2tlO1xyXG5cclxuICAgICAgICAvLyAgICAgICAgICAgICBsZXQgc3RhY2tFbGVtZW50czogVmFsdWVbXSA9IFtcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgdHlwZTogci5jbGFzcyxcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiByXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICB2YWx1ZToga2V5XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgICAgICAgICBdO1xyXG5cclxuICAgICAgICAvLyAgICAgICAgICAgICBpZiAocHJvZ3JhbSAhPSBudWxsKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIG1vZHVsZS5tYWluLmdldEludGVycHJldGVyKCkucnVuVGltZXIobWV0aG9kLCBzdGFja0VsZW1lbnRzLCBudWxsLCBmYWxzZSk7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgfSBlbHNlIGlmIChpbnZva2UgIT0gbnVsbCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBpbnZva2UoW10pO1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIC8vICAgICAgICAgfSk7XHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyB9ICAgIFxyXG4gICAgICAgIC8vICwgZmFsc2UsIHRydWUsIFwiRsO8Z3QgZWluZW4gS2V5TGlzdGVuZXIgaGluenUsIGRlc3NlbiBNZXRob2RlIGtleVR5cGVkIGltbWVyIGRhbm4gYXVmZ2VydWZlbiB3aXJkLCB3ZW5uIGVpbmUgVGFzdGUgZ2VkcsO8Y2t0IHVuZCBhbnNjaGxpZcOfZW5kIGxvc2dlbGFzc2VuIHdpcmQuXCIpKTtcclxuXHJcbiAgICAgICAgLy8gdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInBsYXlTb3VuZFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgLy8gICAgIHsgaWRlbnRpZmllcjogXCJzb3VuZFwiLCB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIC8vIF0pLCBudWxsLFxyXG4gICAgICAgIC8vIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICAgICAgLy8gICAgIGxldCBzb3VuZDogc3RyaW5nID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAvLyAgICAgU291bmRUb29scy5wbGF5KHNvdW5kKTtcclxuICAgICAgICAvLyB9ICAgIFxyXG4gICAgICAgIC8vICwgZmFsc2UsIHRydWUsIFwiU3BpZWx0IGVpbmVuIFNvdW5kIGFiLiBEaWUgTcO2Z2xpY2hlbiBTb3VuZHMgc2luZCBhbHMgc3RhdGlzY2hlIFZhcmlhYmxlbiBkZXIgS2xhc3NlIFNvdW5kIGhpbnRlcmxlZ3QuIFRpcHBlIGFscyBQYXJhbWV0ZXIgYWxzbyBTb3VuZCBnZWZvbGd0IHZvbiBlaW5lbSBQdW5rdCBlaW4sIHVtIGVpbmUgQXVzd2FobCB6dSBzZWhlbiFcIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiY3VycmVudFRpbWVNaWxsaXNcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIERhdGUubm93KCkgKyB0aGlzLmRlbHRhVGltZU1pbGxpcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAsIGZhbHNlLCB0cnVlLCBcIkdpYnQgZGllIEFuemFobCBkZXIgTWlsbGlzZWt1bmRlbiwgZGllIHNlaXQgZGVtIDAxLjAxLjE5NzAgMDA6MDA6MDAgVVRDIHZlcmdhbmdlbiBzaW5kLCB6dXLDvGNrLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJleGl0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInN0YXR1c1wiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBjb25zb2xlID0gbW9kdWxlLm1haW4uZ2V0Qm90dG9tRGl2KCk/LmNvbnNvbGU7XHJcbiAgICAgICAgICAgICAgICBpZihjb25zb2xlICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud3JpdGVDb25zb2xlRW50cnkoXCJEYXMgUHJvZ3JhbW0gd3VyZGUgYW5nZWhhbHRlbiBtaXQgU3RhdHVzd2VydDogXCIgKyBwYXJhbWV0ZXJzWzFdLnZhbHVlLCBudWxsLCBcIiMwMDAwZmZcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5zaG93VGFiKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLnN0b3AoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAsIGZhbHNlLCB0cnVlLCBcIkJlZW5kZXQgZGFzIFByb2dyYW1tIHVuZCBnaWJ0IGRlbiDDvGJlcmdlYmVuZW4gV2VydCBpbiBkZXIgS29uc29sZSBhdXMuXCIpKTtcclxuXHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUHJpbnRTdHJlYW1DbGFzcyBleHRlbmRzIEtsYXNzIHtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihtb2R1bGU6IE1vZHVsZSkge1xyXG4gICAgICAgIHN1cGVyKFwiUHJpbnRTdHJlYW1cIiwgbW9kdWxlLCBcIkludGVybmUgSGlsZnNrbGFzc2UsIHVtIFN5c3RlbS5vdXQucHJpbnRsbiB6dSBlcm3DtmdsaWNoZW4uIERhcyBPYmpla3QgU3lzdGVtLm91dCBpc3Qgdm9uIGRlciBLbGFzc2UgUHJpbnRTdHJlYW0uXCIpO1xyXG5cclxuICAgICAgICB0aGlzLnNldEJhc2VDbGFzcyg8S2xhc3M+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiT2JqZWN0XCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInByaW50XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInRleHRcIiwgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIG1vZHVsZS5tYWluLmdldEludGVycHJldGVyKCkucHJpbnRNYW5hZ2VyLnByaW50KHBhcmFtZXRlcnNbMV0udmFsdWUpO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSwgdHJ1ZSwgXCJHaWJ0IGRlbiBUZXh0IGF1cy5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwicHJpbnRsblwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ0ZXh0XCIsIHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9XHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLnByaW50TWFuYWdlci5wcmludGxuKHBhcmFtZXRlcnNbMV0udmFsdWUpO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSwgdHJ1ZSwgXCJHaWJ0IGRlbiBUZXh0IGF1cywgZ2Vmb2xndCB2b24gZWluZW0gWmVpbGVuc3BydW5nLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJwcmludGxuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIG1vZHVsZS5tYWluLmdldEludGVycHJldGVyKCkucHJpbnRNYW5hZ2VyLnByaW50bG4oXCJcIik7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCB0cnVlLCBcIlNldHp0IGRlbiBDdXJzb3IgaW4gZGllIG7DpGNoc3RlIFplaWxlLlwiKSk7XHJcblxyXG5cclxuICAgIH1cclxuXHJcbn0iXX0=