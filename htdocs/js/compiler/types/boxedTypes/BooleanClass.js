import { RuntimeObject } from "../../../interpreter/RuntimeObject.js";
import { UnboxableKlass, Visibility } from "../Class.js";
import { booleanPrimitiveType, intPrimitiveType, stringPrimitiveType } from "../PrimitiveTypes.js";
import { Method, Parameterlist, Attribute } from "../Types.js";
export class BooleanClass extends UnboxableKlass {
    constructor(baseClass) {
        super("Boolean", null, "Wrapper-Klasse, um boolean-Werte in Collections verenden zu können.");
        this.baseClass = baseClass;
        this.addAttribute(new Attribute("TRUE", this, (value) => { value.value = true; }, true, Visibility.public, true, "das Boolean-Objekt, das TRUE repräsentiert"));
        this.addAttribute(new Attribute("FALSE", this, (value) => { value.value = false; }, true, Visibility.public, true, "das Boolean-Objekt, das FALSE repräsentiert"));
        this.staticClass.setupAttributeIndicesRecursive();
        this.staticClass.classObject = new RuntimeObject(this.staticClass);
    }
    init() {
        this.unboxableAs = [booleanPrimitiveType];
        this.addMethod(new Method("Boolean", new Parameterlist([
            { identifier: "boolean-value", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), null, (parameters) => {
            parameters[0].value = parameters[1].value;
        }, false, false, "Instanziert ein neues Boolean-Objekt", true));
        this.addMethod(new Method("Boolean", new Parameterlist([
            { identifier: "string-value", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), null, (parameters) => {
            parameters[0].value = parameters[1] != null && parameters[1].value.toLowerCase() == "true";
        }, false, false, "Instanziert ein neues Boolean-Objekt: Es nimmt genau dann den Wert true an, wenn die übergebene Zeichenkette ohne Berücksichtigung von Klein-/Großschreibung den Wert \"true\" hat.", true));
        this.addMethod(new Method("booleanValue", new Parameterlist([]), booleanPrimitiveType, (parameters) => { return parameters[0].value; }, false, false, "Wandelt das Boolean-Objekt in einen boolean-Wert um"));
        this.addMethod(new Method("compareTo", new Parameterlist([
            { identifier: "anotherBoolean", type: this, declaration: null, usagePositions: null, isFinal: true }
        ]), intPrimitiveType, (parameters) => {
            let v0 = parameters[0].value;
            let v1 = parameters[1].value;
            return v0 == v1 ? 0 : 1;
        }, false, false, "Gibt genau dann 0 zurück, wenn der Wert des Objekts gleich dem übergebenen Wert ist, ansonsten 1."));
        this.addMethod(new Method("equals", new Parameterlist([
            { identifier: "anotherBoolean", type: this, declaration: null, usagePositions: null, isFinal: true }
        ]), booleanPrimitiveType, (parameters) => {
            return parameters[0].value == parameters[1].value;
        }, false, false, "Gibt genau dann true zurück, wenn der Wert gleich dem übergebenen Wert ist."));
        this.addMethod(new Method("toString", new Parameterlist([]), stringPrimitiveType, (parameters) => {
            return "" + parameters[0].value;
        }, false, false, "Gibt den Wert des Objekts als String-Wert zurück."));
        this.addMethod(new Method("hashCode", new Parameterlist([]), intPrimitiveType, (parameters) => {
            return parameters[0].value ? 0 : 1;
        }, false, false, "Gibt den hashCode des Objekts zurück."));
        this.addMethod(new Method("booleanValue", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            return parameters[0].value;
        }, false, false, "Gibt den boolean-Wert des Objekts zurück."));
        this.addMethod(new Method("valueOf", new Parameterlist([
            { identifier: "boolean-value", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), this, (parameters) => {
            return parameters[1].value;
        }, false, true, "Wandelt den boolean-Wert in ein Boolean-Objekt um."));
        this.addMethod(new Method("valueOf", new Parameterlist([
            { identifier: "string-value", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            return parameters[1].value != null && parameters[1].value.toLowerCase() == "true";
        }, false, true, "Wandelt die Zeichenkette in einen boolean-Wert um. Er ergibt true genau dann, wenn die Zeichenkette != null ist und - ohne Berücksichtigung von Klein-/Großschreibung - den Wert \"true\" hat."));
        this.addMethod(new Method("parseBoolean", new Parameterlist([
            { identifier: "string-value", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            return parameters[1].value != null && parameters[1].value.toLowerCase() == "true";
        }, false, true, "Wandelt die Zeichenkette in einen boolean-Wert um. Er ergibt true genau dann, wenn die Zeichenkette != null ist und - ohne Berücksichtigung von Klein-/Großschreibung - den Wert \"true\" hat."));
    }
    debugOutput(value) {
        return "" + value.value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQm9vbGVhbkNsYXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9jb21waWxlci90eXBlcy9ib3hlZFR5cGVzL0Jvb2xlYW5DbGFzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEUsT0FBTyxFQUFTLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFxQixnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3RILE9BQU8sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFlLFNBQVMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUc1RSxNQUFNLE9BQU8sWUFBYSxTQUFRLGNBQWM7SUFFNUMsWUFBWSxTQUFnQjtRQUN4QixLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxxRUFBcUUsQ0FBQyxDQUFDO1FBQzlGLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBRTNCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLDRDQUE0QyxDQUFDLENBQUMsQ0FBQztRQUMvSixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSw2Q0FBNkMsQ0FBQyxDQUFD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RSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQ3BILENBQUMsRUFBRSxvQkFBb0IsRUFDcEIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUNYLE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLElBQWEsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxNQUFNLENBQUM7UUFDaEcsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsZ01BQWdNLENBQUMsQ0FBQyxDQUFDO0lBRzNOLENBQUM7SUFFTSxXQUFXLENBQUMsS0FBWTtRQUMzQixPQUFPLEVBQUUsR0FBVyxLQUFLLENBQUMsS0FBSyxDQUFDO0lBQ3BDLENBQUM7Q0FHSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJ1bnRpbWVPYmplY3QgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJwcmV0ZXIvUnVudGltZU9iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBLbGFzcywgVW5ib3hhYmxlS2xhc3MsIFZpc2liaWxpdHkgfSBmcm9tIFwiLi4vQ2xhc3MuanNcIjtcclxuaW1wb3J0IHsgYm9vbGVhblByaW1pdGl2ZVR5cGUsIGNoYXJQcmltaXRpdmVUeXBlLCBpbnRQcmltaXRpdmVUeXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlIH0gZnJvbSBcIi4uL1ByaW1pdGl2ZVR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IE1ldGhvZCwgUGFyYW1ldGVybGlzdCwgVHlwZSwgVmFsdWUsIEF0dHJpYnV0ZSB9IGZyb20gXCIuLi9UeXBlcy5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBCb29sZWFuQ2xhc3MgZXh0ZW5kcyBVbmJveGFibGVLbGFzcyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoYmFzZUNsYXNzOiBLbGFzcykge1xyXG4gICAgICAgIHN1cGVyKFwiQm9vbGVhblwiLCBudWxsLCBcIldyYXBwZXItS2xhc3NlLCB1bSBib29sZWFuLVdlcnRlIGluIENvbGxlY3Rpb25zIHZlcmVuZGVuIHp1IGvDtm5uZW4uXCIpO1xyXG4gICAgICAgIHRoaXMuYmFzZUNsYXNzID0gYmFzZUNsYXNzO1xyXG5cclxuICAgICAgICB0aGlzLmFkZEF0dHJpYnV0ZShuZXcgQXR0cmlidXRlKFwiVFJVRVwiLCB0aGlzLCAodmFsdWUpID0+IHsgdmFsdWUudmFsdWUgPSB0cnVlIH0sIHRydWUsIFZpc2liaWxpdHkucHVibGljLCB0cnVlLCBcImRhcyBCb29sZWFuLU9iamVrdCwgZGFzIFRSVUUgcmVwcsOkc2VudGllcnRcIikpO1xyXG4gICAgICAgIHRoaXMuYWRkQXR0cmlidXRlKG5ldyBBdHRyaWJ1dGUoXCJGQUxTRVwiLCB0aGlzLCAodmFsdWUpID0+IHsgdmFsdWUudmFsdWUgPSBmYWxzZSB9LCB0cnVlLCBWaXNpYmlsaXR5LnB1YmxpYywgdHJ1ZSwgXCJkYXMgQm9vbGVhbi1PYmpla3QsIGRhcyBGQUxTRSByZXByw6RzZW50aWVydFwiKSk7XHJcbiAgICAgICAgdGhpcy5zdGF0aWNDbGFzcy5zZXR1cEF0dHJpYnV0ZUluZGljZXNSZWN1cnNpdmUoKTtcclxuXHJcbiAgICAgICAgdGhpcy5zdGF0aWNDbGFzcy5jbGFzc09iamVjdCA9IG5ldyBSdW50aW1lT2JqZWN0KHRoaXMuc3RhdGljQ2xhc3MpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpbml0KCkge1xyXG5cclxuICAgICAgICB0aGlzLnVuYm94YWJsZUFzID0gW2Jvb2xlYW5QcmltaXRpdmVUeXBlXTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIkJvb2xlYW5cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiYm9vbGVhbi12YWx1ZVwiLCB0eXBlOiBib29sZWFuUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzWzBdLnZhbHVlID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJJbnN0YW56aWVydCBlaW4gbmV1ZXMgQm9vbGVhbi1PYmpla3RcIiwgdHJ1ZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiQm9vbGVhblwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJzdHJpbmctdmFsdWVcIiwgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzWzBdLnZhbHVlID0gcGFyYW1ldGVyc1sxXSAhPSBudWxsICYmIHBhcmFtZXRlcnNbMV0udmFsdWUudG9Mb3dlckNhc2UoKSA9PSBcInRydWVcIjtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJJbnN0YW56aWVydCBlaW4gbmV1ZXMgQm9vbGVhbi1PYmpla3Q6IEVzIG5pbW10IGdlbmF1IGRhbm4gZGVuIFdlcnQgdHJ1ZSBhbiwgd2VubiBkaWUgw7xiZXJnZWJlbmUgWmVpY2hlbmtldHRlIG9obmUgQmVyw7xja3NpY2h0aWd1bmcgdm9uIEtsZWluLS9Hcm/Dn3NjaHJlaWJ1bmcgZGVuIFdlcnQgXFxcInRydWVcXFwiIGhhdC5cIiwgdHJ1ZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiYm9vbGVhblZhbHVlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7IHJldHVybiBwYXJhbWV0ZXJzWzBdLnZhbHVlOyB9LCBmYWxzZSwgZmFsc2UsIFwiV2FuZGVsdCBkYXMgQm9vbGVhbi1PYmpla3QgaW4gZWluZW4gYm9vbGVhbi1XZXJ0IHVtXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImNvbXBhcmVUb1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJhbm90aGVyQm9vbGVhblwiLCB0eXBlOiB0aGlzLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHYwID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB2MSA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdjAgPT0gdjEgPyAwIDogMTtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiAwIHp1csO8Y2ssIHdlbm4gZGVyIFdlcnQgZGVzIE9iamVrdHMgZ2xlaWNoIGRlbSDDvGJlcmdlYmVuZW4gV2VydCBpc3QsIGFuc29uc3RlbiAxLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJlcXVhbHNcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiYW5vdGhlckJvb2xlYW5cIiwgdHlwZTogdGhpcywgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1ldGVyc1swXS52YWx1ZSA9PSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBnZW5hdSBkYW5uIHRydWUgenVyw7xjaywgd2VubiBkZXIgV2VydCBnbGVpY2ggZGVtIMO8YmVyZ2ViZW5lbiBXZXJ0IGlzdC5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwidG9TdHJpbmdcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBzdHJpbmdQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCIgKyBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBkZW4gV2VydCBkZXMgT2JqZWt0cyBhbHMgU3RyaW5nLVdlcnQgenVyw7xjay5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiaGFzaENvZGVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICg8Ym9vbGVhbj5wYXJhbWV0ZXJzWzBdLnZhbHVlKSA/IDAgOiAxO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBkZW4gaGFzaENvZGUgZGVzIE9iamVrdHMgenVyw7xjay5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiYm9vbGVhblZhbHVlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZGVuIGJvb2xlYW4tV2VydCBkZXMgT2JqZWt0cyB6dXLDvGNrLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJ2YWx1ZU9mXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImJvb2xlYW4tdmFsdWVcIiwgdHlwZTogYm9vbGVhblByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB0aGlzLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCB0cnVlLCBcIldhbmRlbHQgZGVuIGJvb2xlYW4tV2VydCBpbiBlaW4gQm9vbGVhbi1PYmpla3QgdW0uXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInZhbHVlT2ZcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwic3RyaW5nLXZhbHVlXCIsIHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbWV0ZXJzWzFdLnZhbHVlICE9IG51bGwgJiYgKDxzdHJpbmc+cGFyYW1ldGVyc1sxXS52YWx1ZSkudG9Mb3dlckNhc2UoKSA9PSBcInRydWVcIjtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsIFwiV2FuZGVsdCBkaWUgWmVpY2hlbmtldHRlIGluIGVpbmVuIGJvb2xlYW4tV2VydCB1bS4gRXIgZXJnaWJ0IHRydWUgZ2VuYXUgZGFubiwgd2VubiBkaWUgWmVpY2hlbmtldHRlICE9IG51bGwgaXN0IHVuZCAtIG9obmUgQmVyw7xja3NpY2h0aWd1bmcgdm9uIEtsZWluLS9Hcm/Dn3NjaHJlaWJ1bmcgLSBkZW4gV2VydCBcXFwidHJ1ZVxcXCIgaGF0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJwYXJzZUJvb2xlYW5cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwic3RyaW5nLXZhbHVlXCIsIHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbWV0ZXJzWzFdLnZhbHVlICE9IG51bGwgJiYgKDxzdHJpbmc+cGFyYW1ldGVyc1sxXS52YWx1ZSkudG9Mb3dlckNhc2UoKSA9PSBcInRydWVcIjtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsIFwiV2FuZGVsdCBkaWUgWmVpY2hlbmtldHRlIGluIGVpbmVuIGJvb2xlYW4tV2VydCB1bS4gRXIgZXJnaWJ0IHRydWUgZ2VuYXUgZGFubiwgd2VubiBkaWUgWmVpY2hlbmtldHRlICE9IG51bGwgaXN0IHVuZCAtIG9obmUgQmVyw7xja3NpY2h0aWd1bmcgdm9uIEtsZWluLS9Hcm/Dn3NjaHJlaWJ1bmcgLSBkZW4gV2VydCBcXFwidHJ1ZVxcXCIgaGF0LlwiKSk7XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGVidWdPdXRwdXQodmFsdWU6IFZhbHVlKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gXCJcIiArIDxudW1iZXI+dmFsdWUudmFsdWU7XHJcbiAgICB9XHJcblxyXG5cclxufVxyXG4iXX0=