import { Method, Parameterlist } from "../compiler/types/Types.js";
import { Klass } from "../compiler/types/Class.js";
import { doublePrimitiveType, booleanPrimitiveType } from "../compiler/types/PrimitiveTypes.js";
import { RuntimeObject } from "../interpreter/RuntimeObject.js";
import { ArrayType } from "../compiler/types/Array.js";
import { abstandPunktZuGerade, abstandPunktZuStrecke, polygonEnthältPunkt, schnittpunkteKreisStrecke, streckeSchneidetStrecke } from "../tools/MatheTools.js";
export class MathToolsClass extends Klass {
    constructor(module) {
        super("MathTools", module, "Klasse mit mathematischen Hilfsfunktionen als statische Methoden");
        this.setBaseClass(module.typeStore.getType("Object"));
        this.staticClass.setupAttributeIndicesRecursive();
        this.staticClass.classObject = new RuntimeObject(this.staticClass);
        let vector2Class = module.typeStore.getType("Vector2");
        let vectorArrayClass = new ArrayType(vector2Class);
        let xIndex = vector2Class.attributeMap.get("x").index;
        let yIndex = vector2Class.attributeMap.get("y").index;
        this.addMethod(new Method("intersectCircleWithPolygon", new Parameterlist([
            { identifier: "mx", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "my", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "r", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "points", type: vectorArrayClass, declaration: null, usagePositions: null, isFinal: true },
        ]), vectorArrayClass, (parameters) => {
            let mx = parameters[1].value;
            let my = parameters[2].value;
            let r = parameters[3].value;
            let points = parameters[4].value;
            let punkte = [];
            for (let p of points) {
                punkte.push({ x: p.value.attributes[xIndex].value, y: p.value.attributes[yIndex].value });
            }
            let schnittpunkte = [];
            let m = { x: mx, y: my };
            for (let i = 0; i < punkte.length; i++) {
                let p1 = punkte[i];
                let p2 = punkte[(i + 1) % punkte.length];
                schnittpunkteKreisStrecke(m, r, p1, p2, schnittpunkte);
            }
            let returnArray = [];
            for (let p of schnittpunkte) {
                let pVector = new RuntimeObject(vector2Class);
                pVector.attributes[xIndex] = { type: doublePrimitiveType, value: p.x };
                pVector.attributes[yIndex] = { type: doublePrimitiveType, value: p.y };
                returnArray.push({ type: vector2Class, value: pVector });
            }
            return returnArray;
        }, false, true, "Zu einem gegebenen Kreis werden die Punkte berechnet, die auf den Seiten eines gegebenen Polygons liegen."));
        this.addMethod(new Method("intersectLineSegments", new Parameterlist([
            { identifier: "p0", type: vector2Class, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "p1", type: vector2Class, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "p2", type: vector2Class, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "p3", type: vector2Class, declaration: null, usagePositions: null, isFinal: true },
        ]), vector2Class, (parameters) => {
            let p = [];
            for (let i = 0; i < 4; i++) {
                let att = parameters[i].value.attributes;
                p.push({ x: att[xIndex].value, y: att[yIndex].value });
            }
            let ps = { x: 0, y: 0 };
            if (streckeSchneidetStrecke(p[0], p[1], p[2], p[3], ps)) {
                let pVector = new RuntimeObject(vector2Class);
                pVector.attributes[xIndex] = { type: doublePrimitiveType, value: ps.x };
                pVector.attributes[yIndex] = { type: doublePrimitiveType, value: ps.y };
                return pVector;
            }
            else {
                return null;
            }
        }, false, true, "Berechnet den Schnittpunkt der Strecken [p0, p1] und [p2, p3]. Gibt null zurück, wenn sich die Strecken nicht schneiden oder wenn sie parallel sind und teilweise aufeinander liegen."));
        this.addMethod(new Method("polygonContainsPoint", new Parameterlist([
            { identifier: "polygonPoints", type: vectorArrayClass, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "p", type: vector2Class, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let points = parameters[1].value;
            let punkte = [];
            for (let p of points) {
                punkte.push({ x: p.value.attributes[xIndex].value, y: p.value.attributes[yIndex].value });
            }
            let att = parameters[2].value.attributes;
            let p = { x: att[xIndex].value, y: att[yIndex].value };
            return polygonEnthältPunkt(punkte, p);
        }, false, true, "Gibt genau dann true zurück, wenn das Polygon den Punkt enthält."));
        this.addMethod(new Method("distancePointToLine", new Parameterlist([
            { identifier: "p", type: vector2Class, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "a", type: vector2Class, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "b", type: vector2Class, declaration: null, usagePositions: null, isFinal: true },
        ]), doublePrimitiveType, (parameters) => {
            let p = [];
            for (let i = 0; i < 3; i++) {
                let att = parameters[i].value.attributes;
                p.push({ x: att[xIndex].value, y: att[yIndex].value });
            }
            return abstandPunktZuGerade(p[1], p[2], p[0]);
        }, false, true, "Berechnet den Abstand des Punktes P zur Gerade AB."));
        this.addMethod(new Method("distancePointToLineSegment", new Parameterlist([
            { identifier: "p", type: vector2Class, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "a", type: vector2Class, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "b", type: vector2Class, declaration: null, usagePositions: null, isFinal: true },
        ]), doublePrimitiveType, (parameters) => {
            let p = [];
            for (let i = 0; i < 3; i++) {
                let att = parameters[i].value.attributes;
                p.push({ x: att[xIndex].value, y: att[yIndex].value });
            }
            return abstandPunktZuStrecke(p[1], p[2], p[0]);
        }, false, true, "Berechnet den Abstand des Punktes P zur Strecke [AB]."));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWF0aFRvb2xzQ2xhc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50L3J1bnRpbWVsaWJyYXJ5L01hdGhUb29sc0NsYXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBUSxNQUFNLEVBQUUsYUFBYSxFQUFvQixNQUFNLDRCQUE0QixDQUFDO0FBQzNGLE9BQU8sRUFBRSxLQUFLLEVBQWMsTUFBTSw0QkFBNEIsQ0FBQztBQUMvRCxPQUFPLEVBQXVCLG1CQUFtQixFQUF3QyxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRzNKLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFTLHlCQUF5QixFQUFFLHVCQUF1QixFQUE2QixNQUFNLHdCQUF3QixDQUFDO0FBR2hNLE1BQU0sT0FBTyxjQUFlLFNBQVEsS0FBSztJQUVyQyxZQUFZLE1BQWM7UUFDdEIsS0FBSyxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsa0VBQWtFLENBQUMsQ0FBQztRQUUvRixJQUFJLENBQUMsWUFBWSxDQUFRLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFN0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO1FBRWxELElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxHQUFHLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUVuRSxJQUFJLFlBQVksR0FBVSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5RCxJQUFJLGdCQUFnQixHQUFHLElBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRW5E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SiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFR5cGUsIE1ldGhvZCwgUGFyYW1ldGVybGlzdCwgVmFsdWUsIEF0dHJpYnV0ZSB9IGZyb20gXCIuLi9jb21waWxlci90eXBlcy9UeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBLbGFzcywgVmlzaWJpbGl0eSB9IGZyb20gXCIuLi9jb21waWxlci90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBzdHJpbmdQcmltaXRpdmVUeXBlLCBkb3VibGVQcmltaXRpdmVUeXBlLCBmbG9hdFByaW1pdGl2ZVR5cGUsIGludFByaW1pdGl2ZVR5cGUsIGJvb2xlYW5QcmltaXRpdmVUeXBlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3R5cGVzL1ByaW1pdGl2ZVR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IE1vZHVsZSB9IGZyb20gXCIuLi9jb21waWxlci9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IFByaW50TWFuYWdlciB9IGZyb20gXCIuLi9tYWluL2d1aS9QcmludE1hbmFnZXIuanNcIjtcclxuaW1wb3J0IHsgUnVudGltZU9iamVjdCB9IGZyb20gXCIuLi9pbnRlcnByZXRlci9SdW50aW1lT2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IEFycmF5VHlwZSB9IGZyb20gXCIuLi9jb21waWxlci90eXBlcy9BcnJheS5qc1wiO1xyXG5pbXBvcnQgeyBhYnN0YW5kUHVua3RadUdlcmFkZSwgYWJzdGFuZFB1bmt0WnVTdHJlY2tlLCBwb2x5Z29uRW50aMOkbHRQdW5rdCwgUHVua3QsIHNjaG5pdHRwdW5rdGVLcmVpc1N0cmVja2UsIHN0cmVja2VTY2huZWlkZXRTdHJlY2tlLCB2ZWt0b3JWb25Qb2xhcmtvb3JkaW5hdGVuIH0gZnJvbSBcIi4uL3Rvb2xzL01hdGhlVG9vbHMuanNcIjtcclxuaW1wb3J0IHsgcGFyYW0gfSBmcm9tIFwianF1ZXJ5XCI7XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0aFRvb2xzQ2xhc3MgZXh0ZW5kcyBLbGFzcyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IobW9kdWxlOiBNb2R1bGUpIHtcclxuICAgICAgICBzdXBlcihcIk1hdGhUb29sc1wiLCBtb2R1bGUsIFwiS2xhc3NlIG1pdCBtYXRoZW1hdGlzY2hlbiBIaWxmc2Z1bmt0aW9uZW4gYWxzIHN0YXRpc2NoZSBNZXRob2RlblwiKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRCYXNlQ2xhc3MoPEtsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIk9iamVjdFwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuc3RhdGljQ2xhc3Muc2V0dXBBdHRyaWJ1dGVJbmRpY2VzUmVjdXJzaXZlKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc3RhdGljQ2xhc3MuY2xhc3NPYmplY3QgPSBuZXcgUnVudGltZU9iamVjdCh0aGlzLnN0YXRpY0NsYXNzKTtcclxuXHJcbiAgICAgICAgbGV0IHZlY3RvcjJDbGFzcyA9IDxLbGFzcz5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJWZWN0b3IyXCIpO1xyXG4gICAgICAgIGxldCB2ZWN0b3JBcnJheUNsYXNzID0gbmV3IEFycmF5VHlwZSh2ZWN0b3IyQ2xhc3MpO1xyXG5cclxuICAgICAgICBsZXQgeEluZGV4ID0gdmVjdG9yMkNsYXNzLmF0dHJpYnV0ZU1hcC5nZXQoXCJ4XCIpLmluZGV4O1xyXG4gICAgICAgIGxldCB5SW5kZXggPSB2ZWN0b3IyQ2xhc3MuYXR0cmlidXRlTWFwLmdldChcInlcIikuaW5kZXg7XHJcblxyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiaW50ZXJzZWN0Q2lyY2xlV2l0aFBvbHlnb25cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwibXhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJteVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInJcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJwb2ludHNcIiwgdHlwZTogdmVjdG9yQXJyYXlDbGFzcywgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZlY3RvckFycmF5Q2xhc3MsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG14OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IG15OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHI6IG51bWJlciA9IHBhcmFtZXRlcnNbM10udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcG9pbnRzOiBWYWx1ZVtdID0gcGFyYW1ldGVyc1s0XS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcHVua3RlOiBQdW5rdFtdID0gW107XHJcbiAgICAgICAgICAgICAgICBmb3IobGV0IHAgb2YgcG9pbnRzKXtcclxuICAgICAgICAgICAgICAgICAgICBwdW5rdGUucHVzaCh7eDogcC52YWx1ZS5hdHRyaWJ1dGVzW3hJbmRleF0udmFsdWUsIHk6IHAudmFsdWUuYXR0cmlidXRlc1t5SW5kZXhdLnZhbHVlfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHNjaG5pdHRwdW5rdGU6IFB1bmt0W10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGxldCBtOiBQdW5rdCA9IHt4OiBteCwgeTogbXl9O1xyXG4gICAgICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IHB1bmt0ZS5sZW5ndGg7IGkrKyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHAxID0gcHVua3RlW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwMiA9IHB1bmt0ZVsoaSsxKSVwdW5rdGUubGVuZ3RoXTtcclxuICAgICAgICAgICAgICAgICAgICBzY2huaXR0cHVua3RlS3JlaXNTdHJlY2tlKG0sIHIsIHAxLCBwMiwgc2Nobml0dHB1bmt0ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHJldHVybkFycmF5OiBWYWx1ZVtdID0gW11cclxuXHJcbiAgICAgICAgICAgICAgICBmb3IobGV0IHAgb2Ygc2Nobml0dHB1bmt0ZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBWZWN0b3IgPSBuZXcgUnVudGltZU9iamVjdCh2ZWN0b3IyQ2xhc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBWZWN0b3IuYXR0cmlidXRlc1t4SW5kZXhdID0ge3R5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIHZhbHVlOiBwLnh9O1xyXG4gICAgICAgICAgICAgICAgICAgIHBWZWN0b3IuYXR0cmlidXRlc1t5SW5kZXhdID0ge3R5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIHZhbHVlOiBwLnl9O1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybkFycmF5LnB1c2goe3R5cGU6IHZlY3RvcjJDbGFzcywgdmFsdWU6cFZlY3Rvcn0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiByZXR1cm5BcnJheTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCB0cnVlLCBcIlp1IGVpbmVtIGdlZ2ViZW5lbiBLcmVpcyB3ZXJkZW4gZGllIFB1bmt0ZSBiZXJlY2huZXQsIGRpZSBhdWYgZGVuIFNlaXRlbiBlaW5lcyBnZWdlYmVuZW4gUG9seWdvbnMgbGllZ2VuLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJpbnRlcnNlY3RMaW5lU2VnbWVudHNcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwicDBcIiwgdHlwZTogdmVjdG9yMkNsYXNzLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInAxXCIsIHR5cGU6IHZlY3RvcjJDbGFzcywgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJwMlwiLCB0eXBlOiB2ZWN0b3IyQ2xhc3MsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwicDNcIiwgdHlwZTogdmVjdG9yMkNsYXNzLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdmVjdG9yMkNsYXNzLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwOiBQdW5rdFtdID0gW107XHJcbiAgICAgICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgNDsgaSsrKXtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0ID0gcGFyYW1ldGVyc1tpXS52YWx1ZS5hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICAgICAgICAgIHAucHVzaCh7eDogYXR0W3hJbmRleF0udmFsdWUsIHk6IGF0dFt5SW5kZXhdLnZhbHVlfSlcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcHM6IFB1bmt0ID0ge3g6IDAsIHk6IDB9O1xyXG4gICAgICAgICAgICAgICAgaWYoc3RyZWNrZVNjaG5laWRldFN0cmVja2UocFswXSwgcFsxXSwgcFsyXSwgcFszXSwgcHMpKXtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcFZlY3RvciA9IG5ldyBSdW50aW1lT2JqZWN0KHZlY3RvcjJDbGFzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcFZlY3Rvci5hdHRyaWJ1dGVzW3hJbmRleF0gPSB7dHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgdmFsdWU6IHBzLnh9O1xyXG4gICAgICAgICAgICAgICAgICAgIHBWZWN0b3IuYXR0cmlidXRlc1t5SW5kZXhdID0ge3R5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIHZhbHVlOiBwcy55fTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcFZlY3RvcjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7ICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCB0cnVlLCBcIkJlcmVjaG5ldCBkZW4gU2Nobml0dHB1bmt0IGRlciBTdHJlY2tlbiBbcDAsIHAxXSB1bmQgW3AyLCBwM10uIEdpYnQgbnVsbCB6dXLDvGNrLCB3ZW5uIHNpY2ggZGllIFN0cmVja2VuIG5pY2h0IHNjaG5laWRlbiBvZGVyIHdlbm4gc2llIHBhcmFsbGVsIHNpbmQgdW5kIHRlaWx3ZWlzZSBhdWZlaW5hbmRlciBsaWVnZW4uXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInBvbHlnb25Db250YWluc1BvaW50XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInBvbHlnb25Qb2ludHNcIiwgdHlwZTogdmVjdG9yQXJyYXlDbGFzcywgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJwXCIsIHR5cGU6IHZlY3RvcjJDbGFzcywgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwb2ludHMgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHB1bmt0ZTogUHVua3RbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yKGxldCBwIG9mIHBvaW50cyl7XHJcbiAgICAgICAgICAgICAgICAgICAgcHVua3RlLnB1c2goe3g6IHAudmFsdWUuYXR0cmlidXRlc1t4SW5kZXhdLnZhbHVlLCB5OiBwLnZhbHVlLmF0dHJpYnV0ZXNbeUluZGV4XS52YWx1ZX0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBhdHQgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlLmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgICAgICBsZXQgcDogUHVua3QgPSB7eDogYXR0W3hJbmRleF0udmFsdWUsIHk6IGF0dFt5SW5kZXhdLnZhbHVlfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBwb2x5Z29uRW50aMOkbHRQdW5rdChwdW5rdGUsIHApO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsIFwiR2lidCBnZW5hdSBkYW5uIHRydWUgenVyw7xjaywgd2VubiBkYXMgUG9seWdvbiBkZW4gUHVua3QgZW50aMOkbHQuXCIpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJkaXN0YW5jZVBvaW50VG9MaW5lXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJwXCIsIHR5cGU6IHZlY3RvcjJDbGFzcywgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiYVwiLCB0eXBlOiB2ZWN0b3IyQ2xhc3MsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImJcIiwgdHlwZTogdmVjdG9yMkNsYXNzLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgXSksIGRvdWJsZVByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHA6IFB1bmt0W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgMzsgaSsrKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGF0dCA9IHBhcmFtZXRlcnNbaV0udmFsdWUuYXR0cmlidXRlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgcC5wdXNoKHt4OiBhdHRbeEluZGV4XS52YWx1ZSwgeTogYXR0W3lJbmRleF0udmFsdWV9KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhYnN0YW5kUHVua3RadUdlcmFkZShwWzFdLCBwWzJdLCBwWzBdKTtcclxuICAgIFxyXG4gICAgICAgICAgICAgICAgfSwgZmFsc2UsIHRydWUsIFwiQmVyZWNobmV0IGRlbiBBYnN0YW5kIGRlcyBQdW5rdGVzIFAgenVyIEdlcmFkZSBBQi5cIikpO1xyXG4gICAgXHJcbiAgICAgICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJkaXN0YW5jZVBvaW50VG9MaW5lU2VnbWVudFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwicFwiLCB0eXBlOiB2ZWN0b3IyQ2xhc3MsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImFcIiwgdHlwZTogdmVjdG9yMkNsYXNzLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJiXCIsIHR5cGU6IHZlY3RvcjJDbGFzcywgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIF0pLCBkb3VibGVQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwOiBQdW5rdFtdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IDM7IGkrKyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhdHQgPSBwYXJhbWV0ZXJzW2ldLnZhbHVlLmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHAucHVzaCh7eDogYXR0W3hJbmRleF0udmFsdWUsIHk6IGF0dFt5SW5kZXhdLnZhbHVlfSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICBcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYWJzdGFuZFB1bmt0WnVTdHJlY2tlKHBbMV0sIHBbMl0sIHBbMF0pO1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICB9LCBmYWxzZSwgdHJ1ZSwgXCJCZXJlY2huZXQgZGVuIEFic3RhbmQgZGVzIFB1bmt0ZXMgUCB6dXIgU3RyZWNrZSBbQUJdLlwiKSk7XHJcbiAgICBcclxuICAgIFxyXG5cclxuXHJcbiAgICB9XHJcbn0iXX0=