import { RuntimeObject } from "../../../interpreter/RuntimeObject.js";
import { UnboxableKlass } from "../Class.js";
import { booleanPrimitiveType, charPrimitiveType, intPrimitiveType, stringPrimitiveType } from "../PrimitiveTypes.js";
import { Method, Parameterlist } from "../Types.js";
export class CharacterClass extends UnboxableKlass {
    constructor(baseClass) {
        super("Character", null, "Wrapper-Klasse, um char-Werte in Collections verenden zu können.");
        this.baseClass = baseClass;
        this.staticClass.setupAttributeIndicesRecursive();
        this.staticClass.classObject = new RuntimeObject(this.staticClass);
    }
    init() {
        this.unboxableAs = [charPrimitiveType, stringPrimitiveType];
        this.addMethod(new Method("Character", new Parameterlist([
            { identifier: "char-value", type: charPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), null, (parameters) => {
            parameters[0].value = parameters[1].value;
        }, false, false, "Instanziert ein neues Character-Objekt", true));
        this.addMethod(new Method("charValue", new Parameterlist([]), charPrimitiveType, (parameters) => { return parameters[0].value; }, false, false, "Wandelt das Character-Objekt in einen char-Wert um"));
        this.addMethod(new Method("compareTo", new Parameterlist([
            { identifier: "anotherCharacter", type: this, declaration: null, usagePositions: null, isFinal: true }
        ]), intPrimitiveType, (parameters) => {
            let v0 = parameters[0].value;
            let v1 = parameters[1].value;
            if (v0 > v1)
                return 1;
            if (v0 < v1)
                return -1;
            return 0;
        }, false, false, "Ist der Wert größer als der übergebene Wert, so wird +1 zurückgegeben. Ist er kleiner, so wird -1 zurückgegeben. Sind die Werte gleich, so wird 0 zurückgegeben."));
        this.addMethod(new Method("equals", new Parameterlist([
            { identifier: "anotherCharacter", type: this, declaration: null, usagePositions: null, isFinal: true }
        ]), booleanPrimitiveType, (parameters) => {
            return parameters[0].value == parameters[1].value;
        }, false, false, "Gibt genau dann true zurück, wenn der Wert gleich dem übergebenen Wert ist."));
        this.addMethod(new Method("toString", new Parameterlist([]), stringPrimitiveType, (parameters) => {
            return parameters[0].value;
        }, false, false, "Gibt den Wert des Objekts als String-Wert zurück."));
        this.addMethod(new Method("hashCode", new Parameterlist([]), intPrimitiveType, (parameters) => {
            return parameters[0].value.charCodeAt(0);
        }, false, false, "Gibt den hashCode des Objekts zurück."));
        this.addMethod(new Method("charValue", new Parameterlist([]), charPrimitiveType, (parameters) => {
            return parameters[0].value;
        }, false, false, "Gibt den char-Wert des Objekts zurück."));
        this.addMethod(new Method("digit", new Parameterlist([
            { identifier: "char-value", type: charPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "radix", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), intPrimitiveType, (parameters) => {
            return Number.parseInt(parameters[1].value, parameters[2].value);
        }, false, true, "Gibt den numerischen Wert des Zeichens zur Basis radix zurück."));
        this.addMethod(new Method("forDigit", new Parameterlist([
            { identifier: "int-value", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "radix", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), charPrimitiveType, (parameters) => {
            return parameters[1].value.toString(parameters[2].value).charAt(0);
        }, false, true, "Gibt den übergebenen Wert als Ziffer im Zahlensystem zur Basis radix zurück."));
        this.addMethod(new Method("getNumericValue", new Parameterlist([
            { identifier: "char-value", type: charPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), intPrimitiveType, (parameters) => {
            return parameters[1].value.charCodeAt(0);
        }, false, true, "Wandelt das Zeichen in einen numerischen Wert (Unicode-Wert) um."));
        this.addMethod(new Method("isLetter", new Parameterlist([
            { identifier: "char-value", type: charPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            return parameters[1].value.match(/[a-zäöüß]/i) != null;
        }, false, true, "Gibt genau dann true zurück, wenn das Zeichen ein deutsches Alphabet-Zeichen ist."));
        this.addMethod(new Method("isLetterOrDigit", new Parameterlist([
            { identifier: "char-value", type: charPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            return parameters[1].value.match(/[a-zäöüß0-9]/i) != null;
        }, false, true, "Gibt genau dann true zurück, wenn das Zeichen ein deutsches Alphabet-Zeichen oder eine Ziffer ist."));
        this.addMethod(new Method("isDigit", new Parameterlist([
            { identifier: "char-value", type: charPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            return parameters[1].value.match(/[0-9]/i) != null;
        }, false, true, "Gibt genau dann true zurück, wenn das Zeichen eine Ziffer ist."));
        this.addMethod(new Method("isWhitespace", new Parameterlist([
            { identifier: "char-value", type: charPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            return parameters[1].value.match(/[ \r\n\t]/i) != null;
        }, false, true, "Gibt genau dann true zurück, wenn das Zeichen ein Leerzeichen, Tabulatorzeichen oder Zeilenumbruch ist."));
        this.addMethod(new Method("toUpperCase", new Parameterlist([
            { identifier: "char-value", type: charPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), charPrimitiveType, (parameters) => {
            return parameters[1].value.toLocaleUpperCase();
        }, false, true, "Wandelt das Zeichen in Großschreibung um."));
        this.addMethod(new Method("toLowerCase", new Parameterlist([
            { identifier: "char-value", type: charPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), charPrimitiveType, (parameters) => {
            return parameters[1].value.toLocaleLowerCase();
        }, false, true, "Wandelt das Zeichen in Kleinschreibung um."));
        this.addMethod(new Method("valueOf", new Parameterlist([
            { identifier: "char-value", type: charPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), this, (parameters) => {
            return parameters[1].value;
        }, false, true, "Wandelt den char-Wert in ein Character-Objekt um."));
    }
    debugOutput(value) {
        return "" + value.value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhcmFjdGVyQ2xhc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvY2xpZW50L2NvbXBpbGVyL3R5cGVzL2JveGVkVHlwZXMvQ2hhcmFjdGVyQ2xhc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3RFLE9BQU8sRUFBUyxjQUFjLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDcEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdEgsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQWUsTUFBTSxhQUFhLENBQUM7QUFHakUsTUFBTSxPQUFPLGNBQWUsU0FBUSxjQUFjO0lBRTlDLFlBQVksU0FBZ0I7UUFDeEIsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsa0VBQWtFLENBQUMsQ0FBQztRQUM3RixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsV0FBVyxDQUFDLDhCQUE4QixFQUFFLENBQUM7UUFFbEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRXZFLENBQUM7SUFFRCxJQUFJO1FBRUEsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLGlCQUFpQixFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFFNUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDckQsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUNoSCxD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LFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUM3RCxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSw0Q0FBNEMsQ0FBQyxDQUFDLENBQUM7UUFFbkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDbkQsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUNoSCxDQUFDLEVBQUUsSUFBSSxFQUNKLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDWCxPQUFPLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDL0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsbURBQW1ELENBQUMsQ0FBQyxDQUFDO0lBRzlFLENBQUM7SUFFTSxXQUFXLENBQUMsS0FBWTtRQUMzQixPQUFPLEVBQUUsR0FBVyxLQUFLLENBQUMsS0FBSyxDQUFDO0lBQ3BDLENBQUM7Q0FFSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJ1bnRpbWVPYmplY3QgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJwcmV0ZXIvUnVudGltZU9iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBLbGFzcywgVW5ib3hhYmxlS2xhc3MgfSBmcm9tIFwiLi4vQ2xhc3MuanNcIjtcclxuaW1wb3J0IHsgYm9vbGVhblByaW1pdGl2ZVR5cGUsIGNoYXJQcmltaXRpdmVUeXBlLCBpbnRQcmltaXRpdmVUeXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlIH0gZnJvbSBcIi4uL1ByaW1pdGl2ZVR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IE1ldGhvZCwgUGFyYW1ldGVybGlzdCwgVHlwZSwgVmFsdWUgfSBmcm9tIFwiLi4vVHlwZXMuanNcIjtcclxuXHJcblxyXG5leHBvcnQgY2xhc3MgQ2hhcmFjdGVyQ2xhc3MgZXh0ZW5kcyBVbmJveGFibGVLbGFzcyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoYmFzZUNsYXNzOiBLbGFzcykge1xyXG4gICAgICAgIHN1cGVyKFwiQ2hhcmFjdGVyXCIsIG51bGwsIFwiV3JhcHBlci1LbGFzc2UsIHVtIGNoYXItV2VydGUgaW4gQ29sbGVjdGlvbnMgdmVyZW5kZW4genUga8O2bm5lbi5cIik7XHJcbiAgICAgICAgdGhpcy5iYXNlQ2xhc3MgPSBiYXNlQ2xhc3M7XHJcbiAgICAgICAgdGhpcy5zdGF0aWNDbGFzcy5zZXR1cEF0dHJpYnV0ZUluZGljZXNSZWN1cnNpdmUoKTtcclxuXHJcbiAgICAgICAgdGhpcy5zdGF0aWNDbGFzcy5jbGFzc09iamVjdCA9IG5ldyBSdW50aW1lT2JqZWN0KHRoaXMuc3RhdGljQ2xhc3MpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpbml0KCkge1xyXG5cclxuICAgICAgICB0aGlzLnVuYm94YWJsZUFzID0gW2NoYXJQcmltaXRpdmVUeXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlXTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIkNoYXJhY3RlclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJjaGFyLXZhbHVlXCIsIHR5cGU6IGNoYXJQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlcnNbMF0udmFsdWUgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkluc3RhbnppZXJ0IGVpbiBuZXVlcyBDaGFyYWN0ZXItT2JqZWt0XCIsIHRydWUpKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJjaGFyVmFsdWVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pLCBjaGFyUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHsgcmV0dXJuIHBhcmFtZXRlcnNbMF0udmFsdWU7IH0sIGZhbHNlLCBmYWxzZSwgXCJXYW5kZWx0IGRhcyBDaGFyYWN0ZXItT2JqZWt0IGluIGVpbmVuIGNoYXItV2VydCB1bVwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJjb21wYXJlVG9cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiYW5vdGhlckNoYXJhY3RlclwiLCB0eXBlOiB0aGlzLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHYwID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB2MSA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAodjAgPiB2MSkgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgICAgICBpZiAodjAgPCB2MSkgcmV0dXJuIC0xO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJJc3QgZGVyIFdlcnQgZ3LDtsOfZXIgYWxzIGRlciDDvGJlcmdlYmVuZSBXZXJ0LCBzbyB3aXJkICsxIHp1csO8Y2tnZWdlYmVuLiBJc3QgZXIga2xlaW5lciwgc28gd2lyZCAtMSB6dXLDvGNrZ2VnZWJlbi4gU2luZCBkaWUgV2VydGUgZ2xlaWNoLCBzbyB3aXJkIDAgenVyw7xja2dlZ2ViZW4uXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImVxdWFsc1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJhbm90aGVyQ2hhcmFjdGVyXCIsIHR5cGU6IHRoaXMsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9XHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtZXRlcnNbMF0udmFsdWUgPT0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gZGVyIFdlcnQgZ2xlaWNoIGRlbSDDvGJlcmdlYmVuZW4gV2VydCBpc3QuXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInRvU3RyaW5nXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgc3RyaW5nUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBkZW4gV2VydCBkZXMgT2JqZWt0cyBhbHMgU3RyaW5nLVdlcnQgenVyw7xjay5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiaGFzaENvZGVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICg8c3RyaW5nPnBhcmFtZXRlcnNbMF0udmFsdWUpLmNoYXJDb2RlQXQoMCk7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGRlbiBoYXNoQ29kZSBkZXMgT2JqZWt0cyB6dXLDvGNrLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJjaGFyVmFsdWVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBjaGFyUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBkZW4gY2hhci1XZXJ0IGRlcyBPYmpla3RzIHp1csO8Y2suXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImRpZ2l0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImNoYXItdmFsdWVcIiwgdHlwZTogY2hhclByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwicmFkaXhcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIucGFyc2VJbnQocGFyYW1ldGVyc1sxXS52YWx1ZSwgcGFyYW1ldGVyc1syXS52YWx1ZSk7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCB0cnVlLCBcIkdpYnQgZGVuIG51bWVyaXNjaGVuIFdlcnQgZGVzIFplaWNoZW5zIHp1ciBCYXNpcyByYWRpeCB6dXLDvGNrLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJmb3JEaWdpdFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJpbnQtdmFsdWVcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJyYWRpeFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCBjaGFyUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAoPG51bWJlcj5wYXJhbWV0ZXJzWzFdLnZhbHVlKS50b1N0cmluZyhwYXJhbWV0ZXJzWzJdLnZhbHVlKS5jaGFyQXQoMCk7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCB0cnVlLCBcIkdpYnQgZGVuIMO8YmVyZ2ViZW5lbiBXZXJ0IGFscyBaaWZmZXIgaW0gWmFobGVuc3lzdGVtIHp1ciBCYXNpcyByYWRpeCB6dXLDvGNrLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJnZXROdW1lcmljVmFsdWVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY2hhci12YWx1ZVwiLCB0eXBlOiBjaGFyUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGludFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKDxzdHJpbmc+cGFyYW1ldGVyc1sxXS52YWx1ZSkuY2hhckNvZGVBdCgwKTtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsIFwiV2FuZGVsdCBkYXMgWmVpY2hlbiBpbiBlaW5lbiBudW1lcmlzY2hlbiBXZXJ0IChVbmljb2RlLVdlcnQpIHVtLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJpc0xldHRlclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJjaGFyLXZhbHVlXCIsIHR5cGU6IGNoYXJQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKDxzdHJpbmc+cGFyYW1ldGVyc1sxXS52YWx1ZSkubWF0Y2goL1thLXrDpMO2w7zDn10vaSkgIT0gbnVsbDtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsIFwiR2lidCBnZW5hdSBkYW5uIHRydWUgenVyw7xjaywgd2VubiBkYXMgWmVpY2hlbiBlaW4gZGV1dHNjaGVzIEFscGhhYmV0LVplaWNoZW4gaXN0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJpc0xldHRlck9yRGlnaXRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY2hhci12YWx1ZVwiLCB0eXBlOiBjaGFyUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICg8c3RyaW5nPnBhcmFtZXRlcnNbMV0udmFsdWUpLm1hdGNoKC9bYS16w6TDtsO8w58wLTldL2kpICE9IG51bGw7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCB0cnVlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gZGFzIFplaWNoZW4gZWluIGRldXRzY2hlcyBBbHBoYWJldC1aZWljaGVuIG9kZXIgZWluZSBaaWZmZXIgaXN0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJpc0RpZ2l0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImNoYXItdmFsdWVcIiwgdHlwZTogY2hhclByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAoPHN0cmluZz5wYXJhbWV0ZXJzWzFdLnZhbHVlKS5tYXRjaCgvWzAtOV0vaSkgIT0gbnVsbDtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsIFwiR2lidCBnZW5hdSBkYW5uIHRydWUgenVyw7xjaywgd2VubiBkYXMgWmVpY2hlbiBlaW5lIFppZmZlciBpc3QuXCIpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJpc1doaXRlc3BhY2VcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY2hhci12YWx1ZVwiLCB0eXBlOiBjaGFyUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICg8c3RyaW5nPnBhcmFtZXRlcnNbMV0udmFsdWUpLm1hdGNoKC9bIFxcclxcblxcdF0vaSkgIT0gbnVsbDtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsIFwiR2lidCBnZW5hdSBkYW5uIHRydWUgenVyw7xjaywgd2VubiBkYXMgWmVpY2hlbiBlaW4gTGVlcnplaWNoZW4sIFRhYnVsYXRvcnplaWNoZW4gb2RlciBaZWlsZW51bWJydWNoIGlzdC5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwidG9VcHBlckNhc2VcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY2hhci12YWx1ZVwiLCB0eXBlOiBjaGFyUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGNoYXJQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICg8c3RyaW5nPnBhcmFtZXRlcnNbMV0udmFsdWUpLnRvTG9jYWxlVXBwZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCB0cnVlLCBcIldhbmRlbHQgZGFzIFplaWNoZW4gaW4gR3Jvw59zY2hyZWlidW5nIHVtLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJ0b0xvd2VyQ2FzZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJjaGFyLXZhbHVlXCIsIHR5cGU6IGNoYXJQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgY2hhclByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKDxzdHJpbmc+cGFyYW1ldGVyc1sxXS52YWx1ZSkudG9Mb2NhbGVMb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsIFwiV2FuZGVsdCBkYXMgWmVpY2hlbiBpbiBLbGVpbnNjaHJlaWJ1bmcgdW0uXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInZhbHVlT2ZcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY2hhci12YWx1ZVwiLCB0eXBlOiBjaGFyUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHRoaXMsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsIFwiV2FuZGVsdCBkZW4gY2hhci1XZXJ0IGluIGVpbiBDaGFyYWN0ZXItT2JqZWt0IHVtLlwiKSk7XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGVidWdPdXRwdXQodmFsdWU6IFZhbHVlKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gXCJcIiArIDxudW1iZXI+dmFsdWUudmFsdWU7XHJcbiAgICB9XHJcblxyXG59XHJcbiJdfQ==