import { Klass } from "../../compiler/types/Class.js";
import { intPrimitiveType, voidPrimitiveType } from "../../compiler/types/PrimitiveTypes.js";
import { Method, Parameterlist } from "../../compiler/types/Types.js";
import { RuntimeObject } from "../../interpreter/RuntimeObject.js";
import { WorldHelper } from "../graphics/World.js";
import { GNGEreignisbehandlung } from "./GNGEreignisbehandlung.js";
export class GNGZeichenfensterClass extends Klass {
    constructor(module, moduleStore) {
        super("Zeichenfenster", module, "Grafische Zeichenfläche mit Koordinatensystem");
        this.module = module;
        this.setBaseClass(moduleStore.getType("Object").type);
        let aktionsempfaengerType = module.typeStore.getType("Aktionsempfaenger");
        // this.addAttribute(new Attribute("PI", doublePrimitiveType, (object) => { return Math.PI }, true, Visibility.public, true, "Die Kreiszahl Pi (3.1415...)"));
        this.addMethod(new Method("MalflächenBreiteGeben", new Parameterlist([]), intPrimitiveType, (parameters) => {
            return Math.round(this.getWorldHelper().width);
        }, false, true, 'Gibt die Breite des Zeichenbereichs in Pixeln zurück.', false));
        this.addMethod(new Method("MalflächenHöheGeben", new Parameterlist([]), intPrimitiveType, (parameters) => {
            return Math.round(this.getWorldHelper().width);
        }, false, true, 'Gibt die Höhe des Zeichenbereichs in Pixeln zurück.', false));
        this.addMethod(new Method("AktionsEmpfängerEintragen", new Parameterlist([
            { identifier: "neu", type: aktionsempfaengerType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let aktionsempfaenger = parameters[1].value;
            let helper = GNGEreignisbehandlung.getHelper(module);
            helper.registerEvents(aktionsempfaenger);
        }, false, true, 'Trägt einen neuen Aktionsempfänger ein.', false));
        this.addMethod(new Method("AktionsEmpfängerEntfernen", new Parameterlist([
            { identifier: "alt", type: aktionsempfaengerType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let aktionsempfaenger = parameters[1].value;
            let helper = GNGEreignisbehandlung.getHelper(module);
            helper.unregisterEvents(aktionsempfaenger);
        }, false, true, 'Löscht einen Aktionsempfänger aus der Liste.', false));
        this.addMethod(new Method("TaktgeberStarten", new Parameterlist([]), voidPrimitiveType, (parameters) => {
            let helper = GNGEreignisbehandlung.getHelper(module);
            helper.startTimer();
        }, false, true, 'Startet den Taktgeber', false));
        this.addMethod(new Method("TaktgeberStoppen", new Parameterlist([]), voidPrimitiveType, (parameters) => {
            let helper = GNGEreignisbehandlung.getHelper(module);
            helper.stopTimer();
        }, false, true, 'Stoppt den Taktgeber', false));
        this.addMethod(new Method("TaktdauerSetzen", new Parameterlist([
            { identifier: "dauer", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let dauer = parameters[1].value;
            let helper = GNGEreignisbehandlung.getHelper(module);
            helper.taktdauer = dauer;
        }, false, true, 'Setzt die Taktdauer des Zeitgebers in Millisekunden', false));
    }
    getWorldHelper(breite = 800, höhe = 600) {
        var _a, _b, _c, _d;
        let wh = (_c = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.main) === null || _b === void 0 ? void 0 : _b.getInterpreter()) === null || _c === void 0 ? void 0 : _c.worldHelper;
        if (wh != null) {
            if (wh.width != breite || wh.height != höhe) {
                let ratio = Math.round(höhe / breite * 100);
                wh.$containerOuter.css('padding-bottom', ratio + "%");
                wh.stage.localTransform.scale(wh.width / breite, wh.height / höhe);
                wh.width = breite;
                wh.height = höhe;
                // this.stage.localTransform.rotate(45/180*Math.PI);
                // this.stage.localTransform.translate(400,300);
                //@ts-ignore
                wh.stage.transform.onChange();
                (_d = this.module.main.getRightDiv()) === null || _d === void 0 ? void 0 : _d.adjustWidthToWorld();
            }
            return wh;
        }
        else {
            let worldObject = new RuntimeObject(this.module.typeStore.getType("World"));
            let wh = new WorldHelper(breite, höhe, this.module, worldObject);
            worldObject.intrinsicData["World"] = wh;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR05HWmVpY2hlbmZlbnN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L3J1bnRpbWVsaWJyYXJ5L2duZy9HTkdaZWljaGVuZmVuc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxxQkFBcUIsRUFBK0IsTUFBTSw0QkFBNEIsQ0FBQztBQUVoRyxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsS0FBSztJQUU3QyxZQUFtQixNQUFjLEVBQUUsV0FBd0I7UUFFdkQsS0FBSyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sRUFBRSwrQ0FBK0MsQ0FBQyxDQUFBO1FBRmpFLFdBQU0sR0FBTixNQUFNLENBQVE7UUFJN0IsSUFBSSxDQUFDLFlBQVksQ0FBUSxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTdELElBQUkscUJBQXFCLEdBQTJCLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFHbEcsOEpBQThKO1FBRzlKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxhQUFhLENBQUMsRUFBRSxDQUFDLEVBQUUsZ0JBQWdCLEVBQ3RGLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFD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LEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDO2dCQUNuRSxFQUFFLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztnQkFDbEIsRUFBRSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0JBQ2pCLG9EQUFvRDtnQkFDcEQsZ0RBQWdEO2dCQUNoRCxZQUFZO2dCQUNaLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUU5QixNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSwwQ0FBRSxrQkFBa0IsRUFBRSxDQUFDO2FBRXhEO1lBRUQsT0FBTyxFQUFFLENBQUM7U0FFYjthQUFNO1lBQ0gsSUFBSSxXQUFXLEdBQWtCLElBQUksYUFBYSxDQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2xHLElBQUksRUFBRSxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNqRSxXQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUMzQztJQUVMLENBQUM7Q0FHSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1vZHVsZSwgTW9kdWxlU3RvcmUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBLbGFzcyB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBpbnRQcmltaXRpdmVUeXBlLCB2b2lkUHJpbWl0aXZlVHlwZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBNZXRob2QsIFBhcmFtZXRlcmxpc3QgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgUnVudGltZU9iamVjdCB9IGZyb20gXCIuLi8uLi9pbnRlcnByZXRlci9SdW50aW1lT2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IFdvcmxkSGVscGVyIH0gZnJvbSBcIi4uL2dyYXBoaWNzL1dvcmxkLmpzXCI7XHJcbmltcG9ydCB7IEdOR0VyZWlnbmlzYmVoYW5kbHVuZywgR05HRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyIH0gZnJvbSBcIi4vR05HRXJlaWduaXNiZWhhbmRsdW5nLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgR05HWmVpY2hlbmZlbnN0ZXJDbGFzcyBleHRlbmRzIEtsYXNzIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgbW9kdWxlOiBNb2R1bGUsIG1vZHVsZVN0b3JlOiBNb2R1bGVTdG9yZSkge1xyXG5cclxuICAgICAgICBzdXBlcihcIlplaWNoZW5mZW5zdGVyXCIsIG1vZHVsZSwgXCJHcmFmaXNjaGUgWmVpY2hlbmZsw6RjaGUgbWl0IEtvb3JkaW5hdGVuc3lzdGVtXCIpXHJcblxyXG4gICAgICAgIHRoaXMuc2V0QmFzZUNsYXNzKDxLbGFzcz5tb2R1bGVTdG9yZS5nZXRUeXBlKFwiT2JqZWN0XCIpLnR5cGUpO1xyXG5cclxuICAgICAgICBsZXQgYWt0aW9uc2VtcGZhZW5nZXJUeXBlID0gPEdOR1plaWNoZW5mZW5zdGVyQ2xhc3M+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiQWt0aW9uc2VtcGZhZW5nZXJcIik7XHJcblxyXG5cclxuICAgICAgICAvLyB0aGlzLmFkZEF0dHJpYnV0ZShuZXcgQXR0cmlidXRlKFwiUElcIiwgZG91YmxlUHJpbWl0aXZlVHlwZSwgKG9iamVjdCkgPT4geyByZXR1cm4gTWF0aC5QSSB9LCB0cnVlLCBWaXNpYmlsaXR5LnB1YmxpYywgdHJ1ZSwgXCJEaWUgS3JlaXN6YWhsIFBpICgzLjE0MTUuLi4pXCIpKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJNYWxmbMOkY2hlbkJyZWl0ZUdlYmVuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtdKSwgaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh0aGlzLmdldFdvcmxkSGVscGVyKCkud2lkdGgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsICdHaWJ0IGRpZSBCcmVpdGUgZGVzIFplaWNoZW5iZXJlaWNocyBpbiBQaXhlbG4genVyw7xjay4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiTWFsZmzDpGNoZW5Iw7ZoZUdlYmVuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtdKSwgaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh0aGlzLmdldFdvcmxkSGVscGVyKCkud2lkdGgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsICdHaWJ0IGRpZSBIw7ZoZSBkZXMgWmVpY2hlbmJlcmVpY2hzIGluIFBpeGVsbiB6dXLDvGNrLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJBa3Rpb25zRW1wZsOkbmdlckVpbnRyYWdlblwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJuZXVcIiwgdHlwZTogYWt0aW9uc2VtcGZhZW5nZXJUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGFrdGlvbnNlbXBmYWVuZ2VyOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaGVscGVyOiBHTkdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXIgPSBHTkdFcmVpZ25pc2JlaGFuZGx1bmcuZ2V0SGVscGVyKG1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICBoZWxwZXIucmVnaXN0ZXJFdmVudHMoYWt0aW9uc2VtcGZhZW5nZXIpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsICdUcsOkZ3QgZWluZW4gbmV1ZW4gQWt0aW9uc2VtcGbDpG5nZXIgZWluLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJBa3Rpb25zRW1wZsOkbmdlckVudGZlcm5lblwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJhbHRcIiwgdHlwZTogYWt0aW9uc2VtcGZhZW5nZXJUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGFrdGlvbnNlbXBmYWVuZ2VyOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaGVscGVyOiBHTkdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXIgPSBHTkdFcmVpZ25pc2JlaGFuZGx1bmcuZ2V0SGVscGVyKG1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICBoZWxwZXIudW5yZWdpc3RlckV2ZW50cyhha3Rpb25zZW1wZmFlbmdlcik7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgdHJ1ZSwgJ0zDtnNjaHQgZWluZW4gQWt0aW9uc2VtcGbDpG5nZXIgYXVzIGRlciBMaXN0ZS4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiVGFrdGdlYmVyU3RhcnRlblwiLCBuZXcgUGFyYW1ldGVybGlzdChbXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBoZWxwZXI6IEdOR0VyZWlnbmlzYmVoYW5kbHVuZ0hlbHBlciA9IEdOR0VyZWlnbmlzYmVoYW5kbHVuZy5nZXRIZWxwZXIobW9kdWxlKTtcclxuICAgICAgICAgICAgICAgIGhlbHBlci5zdGFydFRpbWVyKCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgdHJ1ZSwgJ1N0YXJ0ZXQgZGVuIFRha3RnZWJlcicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJUYWt0Z2ViZXJTdG9wcGVuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGhlbHBlcjogR05HRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyID0gR05HRXJlaWduaXNiZWhhbmRsdW5nLmdldEhlbHBlcihtb2R1bGUpO1xyXG4gICAgICAgICAgICAgICAgaGVscGVyLnN0b3BUaW1lcigpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsICdTdG9wcHQgZGVuIFRha3RnZWJlcicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJUYWt0ZGF1ZXJTZXR6ZW5cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiZGF1ZXJcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBkYXVlcjogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaGVscGVyOiBHTkdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXIgPSBHTkdFcmVpZ25pc2JlaGFuZGx1bmcuZ2V0SGVscGVyKG1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICBoZWxwZXIudGFrdGRhdWVyID0gZGF1ZXI7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgdHJ1ZSwgJ1NldHp0IGRpZSBUYWt0ZGF1ZXIgZGVzIFplaXRnZWJlcnMgaW4gTWlsbGlzZWt1bmRlbicsIGZhbHNlKSk7XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRXb3JsZEhlbHBlcihicmVpdGU6IG51bWJlciA9IDgwMCwgaMO2aGU6IG51bWJlciA9IDYwMCk6IFdvcmxkSGVscGVyIHtcclxuXHJcbiAgICAgICAgbGV0IHdoID0gdGhpcy5tb2R1bGU/Lm1haW4/LmdldEludGVycHJldGVyKCk/LndvcmxkSGVscGVyO1xyXG5cclxuICAgICAgICBpZiAod2ggIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgaWYgKHdoLndpZHRoICE9IGJyZWl0ZSB8fCB3aC5oZWlnaHQgIT0gaMO2aGUpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcmF0aW86IG51bWJlciA9IE1hdGgucm91bmQoaMO2aGUgLyBicmVpdGUgKiAxMDApO1xyXG4gICAgICAgICAgICAgICAgd2guJGNvbnRhaW5lck91dGVyLmNzcygncGFkZGluZy1ib3R0b20nLCByYXRpbyArIFwiJVwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5sb2NhbFRyYW5zZm9ybS5zY2FsZSh3aC53aWR0aCAvIGJyZWl0ZSwgd2guaGVpZ2h0IC8gaMO2aGUpO1xyXG4gICAgICAgICAgICAgICAgd2gud2lkdGggPSBicmVpdGU7XHJcbiAgICAgICAgICAgICAgICB3aC5oZWlnaHQgPSBow7ZoZTtcclxuICAgICAgICAgICAgICAgIC8vIHRoaXMuc3RhZ2UubG9jYWxUcmFuc2Zvcm0ucm90YXRlKDQ1LzE4MCpNYXRoLlBJKTtcclxuICAgICAgICAgICAgICAgIC8vIHRoaXMuc3RhZ2UubG9jYWxUcmFuc2Zvcm0udHJhbnNsYXRlKDQwMCwzMDApO1xyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS50cmFuc2Zvcm0ub25DaGFuZ2UoKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZHVsZS5tYWluLmdldFJpZ2h0RGl2KCk/LmFkanVzdFdpZHRoVG9Xb3JsZCgpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHdoO1xyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgd29ybGRPYmplY3Q6IFJ1bnRpbWVPYmplY3QgPSBuZXcgUnVudGltZU9iamVjdCg8S2xhc3M+dGhpcy5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJXb3JsZFwiKSk7XHJcbiAgICAgICAgICAgIGxldCB3aCA9IG5ldyBXb3JsZEhlbHBlcihicmVpdGUsIGjDtmhlLCB0aGlzLm1vZHVsZSwgd29ybGRPYmplY3QpO1xyXG4gICAgICAgICAgICB3b3JsZE9iamVjdC5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl0gPSB3aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuXHJcbiJdfQ==