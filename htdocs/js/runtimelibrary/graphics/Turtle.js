import { Klass } from "../../compiler/types/Class.js";
import { doublePrimitiveType, booleanPrimitiveType } from "../../compiler/types/PrimitiveTypes.js";
import { Method, Parameterlist } from "../../compiler/types/Types.js";
import { RuntimeObject } from "../../interpreter/RuntimeObject.js";
import { FilledShapeHelper } from "./FilledShape.js";
import { polygonBerührtPolygon, polygonEnthältPunkt, steckenzugSchneidetStreckenzug, streckenzugEnthältPunkt } from "../../tools/MatheTools.js";
export class TurtleClass extends Klass {
    constructor(module) {
        super("Turtle", module, "Turtle-Klasse zum Zeichnen von Streckenzügen oder gefüllten Figuren. Wichtig sind vor allem die Methoden forward(double length) und turn(double angleDeg), die die Turtle nach vorne bewegen bzw. ihre Blickrichtung ändern.");
        this.setBaseClass(module.typeStore.getType("FilledShape"));
        this.addMethod(new Method("Turtle", new Parameterlist([
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let x = parameters[1].value;
            let y = parameters[2].value;
            let ph = new TurtleHelper(x, y, true, module.main.getInterpreter(), o);
            o.intrinsicData["Actor"] = ph;
        }, false, false, 'Instanziert ein neues Turtle-Objekt ohne Punkte. Die Turtle blickt anfangs nach rechts. Am Ende des Streckenzugs wird eine "Schildkröte" (kleines Dreieck) gezeichnet.', true));
        this.addMethod(new Method("Turtle", new Parameterlist([
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "showTurtle", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let x = parameters[1].value;
            let y = parameters[2].value;
            let showTurtle = parameters[3].value;
            let ph = new TurtleHelper(x, y, showTurtle, module.main.getInterpreter(), o);
            o.intrinsicData["Actor"] = ph;
        }, false, false, 'Instanziert ein neues Turtle-Objekt ohne Punkte. Die Turtle blickt anfangs nach rechts. Falls showTurtle == true, wird am Ende des Streckenzuges eine "Schildkröte" (kleines Dreieck) gezeichnet.', true));
        this.addMethod(new Method("forward", new Parameterlist([
            { identifier: "length", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let length = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("forward"))
                return;
            sh.forward(length);
        }, false, false, 'Weist die Turtle an, die angegebene Länge vorwärts zu gehen. Ihr zurückgelegter Weg wird als gerade Strecke mit der aktuellen BorderColor gezeichnet. Mit setBorderColor(null) bewirkst Du, dass ein Stück ihres Weges nicht gezeichnet wird.', false));
        this.addMethod(new Method("turn", new Parameterlist([
            { identifier: "angleInDeg", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let angle = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("turn"))
                return;
            sh.turn(angle);
        }, false, false, 'Bewirkt, dass sich die Turtle um den angegebenen Winkel (in Grad!) dreht, d.h. ihre Blickrichtung ändert. Ein positiver Winkel bewirkt eine Drehung gegen den Uhrzeigersinn. Diese Methode wirkt sich NICHT auf die bisher gezeichneten Strecken aus. Willst Du alles bisher Gezeichnete inklusive Turtle drehen, so nutze die Methode rotate.', false));
        this.addMethod(new Method("penUp", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("penUp"))
                return;
            sh.penIsDown = false;
        }, false, false, 'Bewirkt, dass die Turtle beim Gehen ab jetzt nicht mehr zeichnet.', false));
        this.addMethod(new Method("penDown", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("penDown"))
                return;
            sh.penIsDown = true;
        }, false, false, 'Bewirkt, dass die Turtle beim Gehen ab jetzt wieder zeichnet.', false));
        this.addMethod(new Method("closeAndFill", new Parameterlist([
            { identifier: "closeAndFill", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let closeAndFill = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("closeAndFill"))
                return;
            sh.closeAndFill(closeAndFill);
        }, false, false, 'closeAndFill == true bewirkt, dass das von der Turtlezeichnung umschlossene Gebiet gefüllt wird.', false));
        this.addMethod(new Method("showTurtle", new Parameterlist([
            { identifier: "showTurtle", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let showTurtle = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("showTurtle"))
                return;
            sh.setShowTurtle(showTurtle);
        }, false, false, 'showTurtle == true bewirkt, dass am Ort der Turtle ein rotes Dreieck gezeichnet wird.', false));
        this.addMethod(new Method("copy", new Parameterlist([]), this, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("copy"))
                return;
            return sh.getCopy(o.class);
        }, false, false, 'Erstellt eine Kopie des Turtle-Objekts und gibt es zurück.', false));
        this.addMethod(new Method("clear", new Parameterlist([]), this, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("clear"))
                return;
            return sh.clear();
        }, false, false, 'Löscht alle bis jetzt mit der Turtle gezeichneten Strecken.', false));
    }
}
export class TurtleHelper extends FilledShapeHelper {
    constructor(xStart, yStart, showTurtle, interpreter, runtimeObject) {
        super(interpreter, runtimeObject);
        this.showTurtle = showTurtle;
        this.lineElements = [];
        this.turtleAngleDeg = 0; // in Rad
        this.isFilled = false;
        this.xSum = 0;
        this.ySum = 0;
        this.initialHitPolygonDirty = true;
        this.turtleSize = 40;
        this.penIsDown = true;
        this.lastLineWidth = 0;
        this.lastColor = 0;
        this.lastAlpha = 0;
        this.lastTurtleAngleDeg = 0; // angle in Rad
        this.renderJobPresent = false;
        this.lineElements.push({
            x: xStart,
            y: yStart,
            color: 0,
            alpha: 1,
            lineWidth: 1
        });
        this.calculateCenter();
        this.borderColor = 0xffffff;
        this.hitPolygonInitial = [];
        let container = new PIXI.Container();
        this.displayObject = container;
        this.lineGraphic = new PIXI.Graphics();
        container.addChild(this.lineGraphic);
        this.lineGraphic.moveTo(xStart, yStart);
        this.turtle = new PIXI.Graphics();
        container.addChild(this.turtle);
        this.turtle.visible = this.showTurtle;
        this.initTurtle(0, 0, this.turtleAngleDeg);
        this.moveTurtleTo(xStart, yStart, this.turtleAngleDeg);
        // let g: PIXI.Graphics = <any>this.displayObject;
        this.worldHelper.stage.addChild(this.displayObject);
        this.addToDefaultGroupAndSetDefaultVisibility();
    }
    calculateCenter() {
        let length = this.lineElements.length;
        let lastLineElement = this.lineElements[length - 1];
        this.xSum += lastLineElement.x;
        this.ySum += lastLineElement.y;
        this.centerXInitial = this.xSum / length;
        this.centerYInitial = this.ySum / length;
    }
    closeAndFill(closeAndFill) {
        if (closeAndFill != this.isFilled) {
            this.isFilled = closeAndFill;
            this.render();
            this.initialHitPolygonDirty = true;
        }
    }
    setShowTurtle(show) {
        this.turtle.visible = show;
    }
    turn(angleDeg) {
        this.turtleAngleDeg -= angleDeg;
        if (Math.abs(this.turtleAngleDeg) > 360) {
            this.turtleAngleDeg -= Math.floor(this.turtleAngleDeg / 360) * 360;
        }
        let lastLineElement = this.lineElements[this.lineElements.length - 1];
        this.moveTurtleTo(lastLineElement.x, lastLineElement.y, this.turtleAngleDeg);
    }
    rotate(angleInDegrees, cx, cy) {
        // this.turn(angleInDegrees);
        super.rotate(angleInDegrees, cx, cy);
    }
    getCopy(klass) {
        let ro = new RuntimeObject(klass);
        let rh = new TurtleHelper(this.lineElements[0].x, this.lineElements[0].y, this.showTurtle, this.worldHelper.interpreter, ro);
        ro.intrinsicData["Actor"] = rh;
        rh.turtleAngleDeg = this.turtleAngleDeg;
        rh.copyFrom(this);
        rh.render();
        return ro;
    }
    forward(length) {
        let lastLineElement = this.lineElements[this.lineElements.length - 1];
        let turtleAngleRad = this.turtleAngleDeg / 180.0 * Math.PI;
        let newLineElement = {
            x: lastLineElement.x + length * Math.cos(turtleAngleRad),
            y: lastLineElement.y + length * Math.sin(turtleAngleRad),
            color: this.penIsDown ? this.borderColor : null,
            alpha: this.borderAlpha,
            lineWidth: this.borderWidth
        };
        this.lineElements.push(newLineElement);
        // if (this.isFilled) {
        //     this.render();
        // } else {
        //     if (this.borderColor != null) {
        //         // this.lineGraphic.moveTo(lastLineElement.x, lastLineElement.y);
        //         this.lineGraphic.lineStyle(this.borderWidth, this.borderColor, this.borderAlpha, 0.5);
        //         this.lineGraphic.lineTo(newLineElement.x, newLineElement.y);
        //         console.log("LineTo: " + newLineElement.x + ", " + newLineElement.y);
        //     } else {
        //         this.lineGraphic.moveTo(newLineElement.x, newLineElement.y);
        //         console.log("MoveTo: " + newLineElement.x + ", " + newLineElement.y);
        //     }
        // }
        this.hitPolygonDirty = true;
        this.initialHitPolygonDirty = true;
        this.calculateCenter();
        this.newTurtleX = newLineElement.x;
        this.newTurtleY = newLineElement.y;
        this.newAngleDeg = this.turtleAngleDeg;
        // don't render more frequent than every 1/100 s
        if (!this.renderJobPresent) {
            this.renderJobPresent = true;
            setTimeout(() => {
                this.renderJobPresent = false;
                this.render();
                this.moveTurtleTo(this.newTurtleX, this.newTurtleY, this.turtleAngleDeg);
            }, 100);
        }
    }
    moveTo(x, y) {
        let newLineElement = {
            x: x,
            y: y,
            color: null,
            alpha: this.borderAlpha,
            lineWidth: this.borderWidth
        };
        this.lineElements.push(newLineElement);
        this.hitPolygonDirty = true;
        this.initialHitPolygonDirty = true;
        this.calculateCenter();
        this.moveTurtleTo(newLineElement.x, newLineElement.y, this.turtleAngleDeg);
    }
    initTurtle(x, y, angleDeg) {
        this.turtle.clear();
        this.turtle.lineStyle(3, 0xff0000, 1, 0.5);
        this.turtle.moveTo(x, y);
        let angleRad = angleDeg / 180.0 * Math.PI;
        let vx = Math.cos(angleRad);
        let vy = Math.sin(angleRad);
        let vxp = -Math.sin(angleRad);
        let vyp = Math.cos(angleRad);
        let lengthForward = this.turtleSize / 2;
        let lengthBackward = this.turtleSize / 4;
        let lengthBackwardP = this.turtleSize / 4;
        this.turtle.moveTo(x + vx * lengthForward, y + vy * lengthForward);
        this.turtle.lineTo(x - vx * lengthBackward + vxp * lengthBackwardP, y - vy * lengthBackward + vyp * lengthBackwardP);
        this.turtle.lineTo(x - vx * lengthBackward - vxp * lengthBackwardP, y - vy * lengthBackward - vyp * lengthBackwardP);
        this.turtle.lineTo(x + vx * lengthForward, y + vy * lengthForward);
    }
    moveTurtleTo(x, y, angleDeg) {
        this.turtle.localTransform.identity();
        this.turtle.localTransform.rotate(angleDeg / 180.0 * Math.PI);
        this.turtle.localTransform.translate(x, y);
        // this.turtle.localTransform.translate(-this.turtleX, -this.turtleY);
        // this.turtle.localTransform.rotate((angleDeg - this.lastTurtleAngleDeg)/180.0*Math.PI);
        // this.turtle.localTransform.translate(x, y);
        //@ts-ignore
        this.turtle.transform.onChange();
        this.turtle.updateTransform();
        this.lastTurtleAngleDeg = this.turtleAngleDeg;
    }
    render() {
        let g = this.lineGraphic;
        this.lastLineWidth = 0;
        this.lastColor = 0;
        this.lastAlpha = 0;
        if (this.displayObject == null) {
            g = new PIXI.Graphics();
            this.displayObject = g;
            this.worldHelper.stage.addChild(g);
        }
        else {
            g.clear();
        }
        if (this.fillColor != null && this.isFilled) {
            g.beginFill(this.fillColor, this.fillAlpha);
        }
        let firstPoint = this.lineElements[0];
        g.moveTo(firstPoint.x, firstPoint.y);
        if (this.isFilled) {
            g.lineStyle(this.borderWidth, this.borderColor, this.borderAlpha, 0.5);
        }
        for (let i = 1; i < this.lineElements.length; i++) {
            let le = this.lineElements[i];
            if (le.color != null) {
                if (!this.isFilled) {
                    if (le.lineWidth != this.lastLineWidth || le.color != this.lastColor || le.alpha != this.lastAlpha) {
                        g.lineStyle(le.lineWidth, le.color, le.alpha, 0.5);
                        this.lastLineWidth = le.lineWidth;
                        this.lastColor = le.color;
                        this.lastAlpha = le.alpha;
                    }
                }
                g.lineTo(le.x, le.y);
                // console.log("LineTo: " + le.x + ", " + le.y);
            }
            else {
                g.moveTo(le.x, le.y);
                // console.log("MoveTo: " + le.x + ", " + le.y);
            }
        }
        if (this.isFilled) {
            g.closePath();
        }
        if (this.fillColor != null && this.isFilled) {
            g.endFill();
        }
    }
    ;
    collidesWith(shapeHelper) {
        if (shapeHelper instanceof TurtleHelper && shapeHelper.initialHitPolygonDirty) {
            shapeHelper.setupInitialHitPolygon();
        }
        if (this.initialHitPolygonDirty) {
            this.setupInitialHitPolygon();
            this.transformHitPolygon();
            this.render();
        }
        let bb = this.displayObject.getBounds();
        let bb1 = shapeHelper.displayObject.getBounds();
        if (bb.left > bb1.right || bb1.left > bb.right)
            return false;
        if (bb.top > bb1.bottom || bb1.top > bb.bottom)
            return false;
        if (shapeHelper["shapes"]) {
            return shapeHelper.collidesWith(this);
        }
        if (this.hitPolygonInitial == null || shapeHelper.hitPolygonInitial == null)
            return true;
        // boundig boxes collide, so check further:
        if (this.hitPolygonDirty)
            this.transformHitPolygon();
        if (shapeHelper.hitPolygonDirty)
            shapeHelper.transformHitPolygon();
        if (shapeHelper.hitPolygonTransformed.length == 2 && !this.isFilled) {
            return steckenzugSchneidetStreckenzug(this.hitPolygonTransformed, shapeHelper.hitPolygonTransformed);
        }
        return polygonBerührtPolygon(this.hitPolygonTransformed, shapeHelper.hitPolygonTransformed);
    }
    setupInitialHitPolygon() {
        this.hitPolygonInitial = this.lineElements.map((le) => { return { x: le.x, y: le.y }; });
    }
    clear(x = null, y = null, angle = null) {
        let lastLineElement = this.lineElements.pop();
        if (x == null)
            x = lastLineElement.x;
        if (y == null)
            y = lastLineElement.y;
        this.lineElements = [];
        this.lineElements.push({
            x: x,
            y: y,
            color: 0,
            alpha: 1,
            lineWidth: 1
        });
        this.calculateCenter();
        this.hitPolygonInitial = [];
        if (angle != null) {
            this.turtleAngleDeg = angle;
            this.lastTurtleAngleDeg = 0;
            this.borderColor = 0;
            this.turtleSize = 40;
        }
        this.render();
        if (angle != null) {
            this.moveTurtleTo(x, y, angle);
        }
    }
    touchesAtLeastOneFigure() {
        let lastLineElement = this.lineElements[this.lineElements.length - 1];
        let x = lastLineElement.x;
        let y = lastLineElement.y;
        for (let sh of this.worldHelper.shapes) {
            if (sh != this && sh.containsPoint(x, y)) {
                return true;
            }
        }
    }
    touchesColor(farbe) {
        let lastLineElement = this.lineElements[this.lineElements.length - 1];
        let x = lastLineElement.x;
        let y = lastLineElement.y;
        for (let sh of this.worldHelper.shapes) {
            if (sh != this && sh.containsPoint(x, y)) {
                if (sh instanceof FilledShapeHelper && sh.fillColor == farbe)
                    return true;
                // if(sh instanceof TurtleHelper) TODO
            }
        }
    }
    touchesShape(shape) {
        let lastLineElement = this.lineElements[this.lineElements.length - 1];
        let x = lastLineElement.x;
        let y = lastLineElement.y;
        return shape.containsPoint(x, y);
    }
    containsPoint(x, y) {
        if (this.initialHitPolygonDirty) {
            this.setupInitialHitPolygon();
            this.transformHitPolygon();
            this.render();
        }
        if (!this.displayObject.getBounds().contains(x, y))
            return false;
        if (this.hitPolygonInitial == null)
            return true;
        if (this.hitPolygonDirty)
            this.transformHitPolygon();
        if (this.isFilled) {
            return polygonEnthältPunkt(this.hitPolygonTransformed, { x: x, y: y });
        }
        else {
            return streckenzugEnthältPunkt(this.hitPolygonTransformed, { x: x, y: y });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHVydGxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9UdXJ0bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxtQkFBbUIsRUFBb0Isb0JBQW9CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNySCxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUVyRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsOEJBQThCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUdoSixNQUFNLE9BQU8sV0FBWSxTQUFRLEtBQUs7SUFFbEMsWUFBWSxNQUFjO1FBRXRCLEtBQUssQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLDhOQUE4TixDQUFDLENBQUM7UUFFeFAsSUFBSSxDQUFDLFlBQVksQ0FBUSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBRWxFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksYUFBYSxDQUFDO1lBQ2xELEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDdEcsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFB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QUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDOUU7SUFDTCxDQUFDO0NBR0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBLbGFzcyB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBkb3VibGVQcmltaXRpdmVUeXBlLCBpbnRQcmltaXRpdmVUeXBlLCBib29sZWFuUHJpbWl0aXZlVHlwZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBNZXRob2QsIFBhcmFtZXRlcmxpc3QsIFZhbHVlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL1R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IFJ1bnRpbWVPYmplY3QgfSBmcm9tIFwiLi4vLi4vaW50ZXJwcmV0ZXIvUnVudGltZU9iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBGaWxsZWRTaGFwZUhlbHBlciB9IGZyb20gXCIuL0ZpbGxlZFNoYXBlLmpzXCI7XHJcbmltcG9ydCB7IEludGVycHJldGVyIH0gZnJvbSBcIi4uLy4uL2ludGVycHJldGVyL0ludGVycHJldGVyLmpzXCI7XHJcbmltcG9ydCB7IHBvbHlnb25CZXLDvGhydFBvbHlnb24sIHBvbHlnb25FbnRow6RsdFB1bmt0LCBzdGVja2VuenVnU2NobmVpZGV0U3RyZWNrZW56dWcsIHN0cmVja2VuenVnRW50aMOkbHRQdW5rdCB9IGZyb20gXCIuLi8uLi90b29scy9NYXRoZVRvb2xzLmpzXCI7XHJcbmltcG9ydCB7IFNoYXBlSGVscGVyIH0gZnJvbSBcIi4vU2hhcGUuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBUdXJ0bGVDbGFzcyBleHRlbmRzIEtsYXNzIHtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihtb2R1bGU6IE1vZHVsZSkge1xyXG5cclxuICAgICAgICBzdXBlcihcIlR1cnRsZVwiLCBtb2R1bGUsIFwiVHVydGxlLUtsYXNzZSB6dW0gWmVpY2huZW4gdm9uIFN0cmVja2VuesO8Z2VuIG9kZXIgZ2Vmw7xsbHRlbiBGaWd1cmVuLiBXaWNodGlnIHNpbmQgdm9yIGFsbGVtIGRpZSBNZXRob2RlbiBmb3J3YXJkKGRvdWJsZSBsZW5ndGgpIHVuZCB0dXJuKGRvdWJsZSBhbmdsZURlZyksIGRpZSBkaWUgVHVydGxlIG5hY2ggdm9ybmUgYmV3ZWdlbiBiencuIGlocmUgQmxpY2tyaWNodHVuZyDDpG5kZXJuLlwiKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRCYXNlQ2xhc3MoPEtsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIkZpbGxlZFNoYXBlXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIlR1cnRsZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ4XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB5OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwaCA9IG5ldyBUdXJ0bGVIZWxwZXIoeCwgeSwgdHJ1ZSwgbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKSwgbyk7XHJcbiAgICAgICAgICAgICAgICBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXSA9IHBoO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnSW5zdGFuemllcnQgZWluIG5ldWVzIFR1cnRsZS1PYmpla3Qgb2huZSBQdW5rdGUuIERpZSBUdXJ0bGUgYmxpY2t0IGFuZmFuZ3MgbmFjaCByZWNodHMuIEFtIEVuZGUgZGVzIFN0cmVja2VuenVncyB3aXJkIGVpbmUgXCJTY2hpbGRrcsO2dGVcIiAoa2xlaW5lcyBEcmVpZWNrKSBnZXplaWNobmV0LicsIHRydWUpKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJUdXJ0bGVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInlcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJzaG93VHVydGxlXCIsIHR5cGU6IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB5OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNob3dUdXJ0bGU6IGJvb2xlYW4gPSBwYXJhbWV0ZXJzWzNdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwaCA9IG5ldyBUdXJ0bGVIZWxwZXIoeCwgeSwgc2hvd1R1cnRsZSwgbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKSwgbyk7XHJcbiAgICAgICAgICAgICAgICBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXSA9IHBoO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnSW5zdGFuemllcnQgZWluIG5ldWVzIFR1cnRsZS1PYmpla3Qgb2huZSBQdW5rdGUuIERpZSBUdXJ0bGUgYmxpY2t0IGFuZmFuZ3MgbmFjaCByZWNodHMuIEZhbGxzIHNob3dUdXJ0bGUgPT0gdHJ1ZSwgd2lyZCBhbSBFbmRlIGRlcyBTdHJlY2tlbnp1Z2VzIGVpbmUgXCJTY2hpbGRrcsO2dGVcIiAoa2xlaW5lcyBEcmVpZWNrKSBnZXplaWNobmV0LicsIHRydWUpKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJmb3J3YXJkXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImxlbmd0aFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgbGVuZ3RoOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBUdXJ0bGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImZvcndhcmRcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5mb3J3YXJkKGxlbmd0aCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdXZWlzdCBkaWUgVHVydGxlIGFuLCBkaWUgYW5nZWdlYmVuZSBMw6RuZ2Ugdm9yd8OkcnRzIHp1IGdlaGVuLiBJaHIgenVyw7xja2dlbGVndGVyIFdlZyB3aXJkIGFscyBnZXJhZGUgU3RyZWNrZSBtaXQgZGVyIGFrdHVlbGxlbiBCb3JkZXJDb2xvciBnZXplaWNobmV0LiBNaXQgc2V0Qm9yZGVyQ29sb3IobnVsbCkgYmV3aXJrc3QgRHUsIGRhc3MgZWluIFN0w7xjayBpaHJlcyBXZWdlcyBuaWNodCBnZXplaWNobmV0IHdpcmQuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInR1cm5cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiYW5nbGVJbkRlZ1wiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYW5nbGU6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFR1cnRsZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwidHVyblwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnR1cm4oYW5nbGUpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnQmV3aXJrdCwgZGFzcyBzaWNoIGRpZSBUdXJ0bGUgdW0gZGVuIGFuZ2VnZWJlbmVuIFdpbmtlbCAoaW4gR3JhZCEpIGRyZWh0LCBkLmguIGlocmUgQmxpY2tyaWNodHVuZyDDpG5kZXJ0LiBFaW4gcG9zaXRpdmVyIFdpbmtlbCBiZXdpcmt0IGVpbmUgRHJlaHVuZyBnZWdlbiBkZW4gVWhyemVpZ2Vyc2lubi4gRGllc2UgTWV0aG9kZSB3aXJrdCBzaWNoIE5JQ0hUIGF1ZiBkaWUgYmlzaGVyIGdlemVpY2huZXRlbiBTdHJlY2tlbiBhdXMuIFdpbGxzdCBEdSBhbGxlcyBiaXNoZXIgR2V6ZWljaG5ldGUgaW5rbHVzaXZlIFR1cnRsZSBkcmVoZW4sIHNvIG51dHplIGRpZSBNZXRob2RlIHJvdGF0ZS4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwicGVuVXBcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogVHVydGxlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJwZW5VcFwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnBlbklzRG93biA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnQmV3aXJrdCwgZGFzcyBkaWUgVHVydGxlIGJlaW0gR2VoZW4gYWIgamV0enQgbmljaHQgbWVociB6ZWljaG5ldC4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwicGVuRG93blwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBUdXJ0bGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInBlbkRvd25cIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5wZW5Jc0Rvd24gPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnQmV3aXJrdCwgZGFzcyBkaWUgVHVydGxlIGJlaW0gR2VoZW4gYWIgamV0enQgd2llZGVyIHplaWNobmV0LicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJjbG9zZUFuZEZpbGxcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY2xvc2VBbmRGaWxsXCIsIHR5cGU6IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgY2xvc2VBbmRGaWxsOiBib29sZWFuID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogVHVydGxlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJjbG9zZUFuZEZpbGxcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5jbG9zZUFuZEZpbGwoY2xvc2VBbmRGaWxsKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ2Nsb3NlQW5kRmlsbCA9PSB0cnVlIGJld2lya3QsIGRhc3MgZGFzIHZvbiBkZXIgVHVydGxlemVpY2hudW5nIHVtc2NobG9zc2VuZSBHZWJpZXQgZ2Vmw7xsbHQgd2lyZC4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2hvd1R1cnRsZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJzaG93VHVydGxlXCIsIHR5cGU6IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hvd1R1cnRsZTogYm9vbGVhbiA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFR1cnRsZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwic2hvd1R1cnRsZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnNldFNob3dUdXJ0bGUoc2hvd1R1cnRsZSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdzaG93VHVydGxlID09IHRydWUgYmV3aXJrdCwgZGFzcyBhbSBPcnQgZGVyIFR1cnRsZSBlaW4gcm90ZXMgRHJlaWVjayBnZXplaWNobmV0IHdpcmQuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImNvcHlcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB0aGlzLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogVHVydGxlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJjb3B5XCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLmdldENvcHkoPEtsYXNzPm8uY2xhc3MpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnRXJzdGVsbHQgZWluZSBLb3BpZSBkZXMgVHVydGxlLU9iamVrdHMgdW5kIGdpYnQgZXMgenVyw7xjay4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiY2xlYXJcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB0aGlzLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogVHVydGxlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJjbGVhclwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5jbGVhcigpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnTMO2c2NodCBhbGxlIGJpcyBqZXR6dCBtaXQgZGVyIFR1cnRsZSBnZXplaWNobmV0ZW4gU3RyZWNrZW4uJywgZmFsc2UpKTtcclxuXHJcblxyXG4gICAgfVxyXG5cclxufVxyXG5cclxudHlwZSBMaW5lRWxlbWVudCA9IHtcclxuICAgIHg6IG51bWJlcixcclxuICAgIHk6IG51bWJlcixcclxuICAgIGNvbG9yOiBudW1iZXIsXHJcbiAgICBhbHBoYTogbnVtYmVyLFxyXG4gICAgbGluZVdpZHRoOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFR1cnRsZUhlbHBlciBleHRlbmRzIEZpbGxlZFNoYXBlSGVscGVyIHtcclxuXHJcbiAgICBsaW5lRWxlbWVudHM6IExpbmVFbGVtZW50W10gPSBbXTtcclxuICAgIHR1cnRsZUFuZ2xlRGVnOiBudW1iZXIgPSAwOyAvLyBpbiBSYWRcclxuXHJcbiAgICBpc0ZpbGxlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgIHR1cnRsZTogUElYSS5HcmFwaGljcztcclxuICAgIGxpbmVHcmFwaGljOiBQSVhJLkdyYXBoaWNzO1xyXG5cclxuICAgIHhTdW06IG51bWJlciA9IDA7XHJcbiAgICB5U3VtOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGluaXRpYWxIaXRQb2x5Z29uRGlydHk6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgIHR1cnRsZVNpemU6IG51bWJlciA9IDQwO1xyXG5cclxuICAgIHBlbklzRG93bjogYm9vbGVhbiA9IHRydWU7XHJcblxyXG4gICAgbGFzdExpbmVXaWR0aDogbnVtYmVyID0gMDtcclxuICAgIGxhc3RDb2xvcjogbnVtYmVyID0gMDtcclxuICAgIGxhc3RBbHBoYTogbnVtYmVyID0gMDtcclxuXHJcbiAgICBsYXN0VHVydGxlQW5nbGVEZWc6IG51bWJlciA9IDA7IC8vIGFuZ2xlIGluIFJhZFxyXG5cclxuICAgIHJlbmRlckpvYlByZXNlbnQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih4U3RhcnQ6IG51bWJlciwgeVN0YXJ0OiBudW1iZXIsIHByaXZhdGUgc2hvd1R1cnRsZTogYm9vbGVhbixcclxuICAgICAgICBpbnRlcnByZXRlcjogSW50ZXJwcmV0ZXIsIHJ1bnRpbWVPYmplY3Q6IFJ1bnRpbWVPYmplY3QpIHtcclxuICAgICAgICBzdXBlcihpbnRlcnByZXRlciwgcnVudGltZU9iamVjdCk7XHJcblxyXG4gICAgICAgIHRoaXMubGluZUVsZW1lbnRzLnB1c2goe1xyXG4gICAgICAgICAgICB4OiB4U3RhcnQsXHJcbiAgICAgICAgICAgIHk6IHlTdGFydCxcclxuICAgICAgICAgICAgY29sb3I6IDAsXHJcbiAgICAgICAgICAgIGFscGhhOiAxLFxyXG4gICAgICAgICAgICBsaW5lV2lkdGg6IDFcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLmNhbGN1bGF0ZUNlbnRlcigpO1xyXG5cclxuICAgICAgICB0aGlzLmJvcmRlckNvbG9yID0gMHhmZmZmZmY7XHJcblxyXG4gICAgICAgIHRoaXMuaGl0UG9seWdvbkluaXRpYWwgPSBbXTtcclxuXHJcbiAgICAgICAgbGV0IGNvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdCA9IGNvbnRhaW5lcjtcclxuXHJcbiAgICAgICAgdGhpcy5saW5lR3JhcGhpYyA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XHJcbiAgICAgICAgY29udGFpbmVyLmFkZENoaWxkKHRoaXMubGluZUdyYXBoaWMpO1xyXG4gICAgICAgIHRoaXMubGluZUdyYXBoaWMubW92ZVRvKHhTdGFydCwgeVN0YXJ0KTtcclxuXHJcbiAgICAgICAgdGhpcy50dXJ0bGUgPSBuZXcgUElYSS5HcmFwaGljcygpO1xyXG4gICAgICAgIGNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnR1cnRsZSk7XHJcbiAgICAgICAgdGhpcy50dXJ0bGUudmlzaWJsZSA9IHRoaXMuc2hvd1R1cnRsZTtcclxuICAgICAgICB0aGlzLmluaXRUdXJ0bGUoMCwgMCwgdGhpcy50dXJ0bGVBbmdsZURlZyk7XHJcbiAgICAgICAgdGhpcy5tb3ZlVHVydGxlVG8oeFN0YXJ0LCB5U3RhcnQsIHRoaXMudHVydGxlQW5nbGVEZWcpO1xyXG5cclxuXHJcbiAgICAgICAgLy8gbGV0IGc6IFBJWEkuR3JhcGhpY3MgPSA8YW55PnRoaXMuZGlzcGxheU9iamVjdDtcclxuXHJcbiAgICAgICAgdGhpcy53b3JsZEhlbHBlci5zdGFnZS5hZGRDaGlsZCh0aGlzLmRpc3BsYXlPYmplY3QpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZFRvRGVmYXVsdEdyb3VwQW5kU2V0RGVmYXVsdFZpc2liaWxpdHkoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2FsY3VsYXRlQ2VudGVyKCkge1xyXG4gICAgICAgIGxldCBsZW5ndGggPSB0aGlzLmxpbmVFbGVtZW50cy5sZW5ndGg7XHJcbiAgICAgICAgbGV0IGxhc3RMaW5lRWxlbWVudCA9IHRoaXMubGluZUVsZW1lbnRzW2xlbmd0aCAtIDFdO1xyXG4gICAgICAgIHRoaXMueFN1bSArPSBsYXN0TGluZUVsZW1lbnQueDtcclxuICAgICAgICB0aGlzLnlTdW0gKz0gbGFzdExpbmVFbGVtZW50Lnk7XHJcbiAgICAgICAgdGhpcy5jZW50ZXJYSW5pdGlhbCA9IHRoaXMueFN1bSAvIGxlbmd0aDtcclxuICAgICAgICB0aGlzLmNlbnRlcllJbml0aWFsID0gdGhpcy55U3VtIC8gbGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIGNsb3NlQW5kRmlsbChjbG9zZUFuZEZpbGw6IGJvb2xlYW4pIHtcclxuICAgICAgICBpZiAoY2xvc2VBbmRGaWxsICE9IHRoaXMuaXNGaWxsZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5pc0ZpbGxlZCA9IGNsb3NlQW5kRmlsbDtcclxuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5pbml0aWFsSGl0UG9seWdvbkRpcnR5ID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2V0U2hvd1R1cnRsZShzaG93OiBib29sZWFuKSB7XHJcbiAgICAgICAgdGhpcy50dXJ0bGUudmlzaWJsZSA9IHNob3c7XHJcbiAgICB9XHJcblxyXG4gICAgdHVybihhbmdsZURlZzogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy50dXJ0bGVBbmdsZURlZyAtPSBhbmdsZURlZztcclxuICAgICAgICBpZihNYXRoLmFicyh0aGlzLnR1cnRsZUFuZ2xlRGVnKSA+IDM2MCl7XHJcbiAgICAgICAgICAgIHRoaXMudHVydGxlQW5nbGVEZWcgLT0gTWF0aC5mbG9vcih0aGlzLnR1cnRsZUFuZ2xlRGVnLzM2MCkqMzYwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgbGFzdExpbmVFbGVtZW50OiBMaW5lRWxlbWVudCA9IHRoaXMubGluZUVsZW1lbnRzW3RoaXMubGluZUVsZW1lbnRzLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIHRoaXMubW92ZVR1cnRsZVRvKGxhc3RMaW5lRWxlbWVudC54LCBsYXN0TGluZUVsZW1lbnQueSwgdGhpcy50dXJ0bGVBbmdsZURlZyk7XHJcbiAgICB9XHJcblxyXG4gICAgcm90YXRlKGFuZ2xlSW5EZWdyZWVzOiBudW1iZXIsIGN4PzogbnVtYmVyLCBjeT86IG51bWJlcikge1xyXG4gICAgICAgIC8vIHRoaXMudHVybihhbmdsZUluRGVncmVlcyk7XHJcbiAgICAgICAgc3VwZXIucm90YXRlKGFuZ2xlSW5EZWdyZWVzLCBjeCwgY3kpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldENvcHkoa2xhc3M6IEtsYXNzKTogUnVudGltZU9iamVjdCB7XHJcblxyXG4gICAgICAgIGxldCBybzogUnVudGltZU9iamVjdCA9IG5ldyBSdW50aW1lT2JqZWN0KGtsYXNzKTtcclxuICAgICAgICBsZXQgcmg6IFR1cnRsZUhlbHBlciA9IG5ldyBUdXJ0bGVIZWxwZXIodGhpcy5saW5lRWxlbWVudHNbMF0ueCwgdGhpcy5saW5lRWxlbWVudHNbMF0ueSxcclxuICAgICAgICAgICAgdGhpcy5zaG93VHVydGxlLCB0aGlzLndvcmxkSGVscGVyLmludGVycHJldGVyLCBybyk7XHJcbiAgICAgICAgcm8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdID0gcmg7XHJcblxyXG4gICAgICAgIHJoLnR1cnRsZUFuZ2xlRGVnID0gdGhpcy50dXJ0bGVBbmdsZURlZztcclxuXHJcbiAgICAgICAgcmguY29weUZyb20odGhpcyk7XHJcbiAgICAgICAgcmgucmVuZGVyKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBybztcclxuICAgIH1cclxuXHJcbiAgICBuZXdUdXJ0bGVYOiBudW1iZXI7XHJcbiAgICBuZXdUdXJ0bGVZOiBudW1iZXI7XHJcbiAgICBuZXdBbmdsZURlZzogbnVtYmVyO1xyXG5cclxuICAgIGZvcndhcmQobGVuZ3RoOiBudW1iZXIpIHtcclxuXHJcbiAgICAgICAgbGV0IGxhc3RMaW5lRWxlbWVudDogTGluZUVsZW1lbnQgPSB0aGlzLmxpbmVFbGVtZW50c1t0aGlzLmxpbmVFbGVtZW50cy5sZW5ndGggLSAxXTtcclxuXHJcbiAgICAgICAgbGV0IHR1cnRsZUFuZ2xlUmFkID0gdGhpcy50dXJ0bGVBbmdsZURlZy8xODAuMCpNYXRoLlBJO1xyXG5cclxuICAgICAgICBsZXQgbmV3TGluZUVsZW1lbnQ6IExpbmVFbGVtZW50ID0ge1xyXG4gICAgICAgICAgICB4OiBsYXN0TGluZUVsZW1lbnQueCArIGxlbmd0aCAqIE1hdGguY29zKHR1cnRsZUFuZ2xlUmFkKSxcclxuICAgICAgICAgICAgeTogbGFzdExpbmVFbGVtZW50LnkgKyBsZW5ndGggKiBNYXRoLnNpbih0dXJ0bGVBbmdsZVJhZCksXHJcbiAgICAgICAgICAgIGNvbG9yOiB0aGlzLnBlbklzRG93biA/IHRoaXMuYm9yZGVyQ29sb3IgOiBudWxsLFxyXG4gICAgICAgICAgICBhbHBoYTogdGhpcy5ib3JkZXJBbHBoYSxcclxuICAgICAgICAgICAgbGluZVdpZHRoOiB0aGlzLmJvcmRlcldpZHRoXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxpbmVFbGVtZW50cy5wdXNoKG5ld0xpbmVFbGVtZW50KTtcclxuXHJcbiAgICAgICAgLy8gaWYgKHRoaXMuaXNGaWxsZWQpIHtcclxuICAgICAgICAvLyAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgICAvLyB9IGVsc2Uge1xyXG4gICAgICAgIC8vICAgICBpZiAodGhpcy5ib3JkZXJDb2xvciAhPSBudWxsKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAvLyB0aGlzLmxpbmVHcmFwaGljLm1vdmVUbyhsYXN0TGluZUVsZW1lbnQueCwgbGFzdExpbmVFbGVtZW50LnkpO1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5saW5lR3JhcGhpYy5saW5lU3R5bGUodGhpcy5ib3JkZXJXaWR0aCwgdGhpcy5ib3JkZXJDb2xvciwgdGhpcy5ib3JkZXJBbHBoYSwgMC41KTtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMubGluZUdyYXBoaWMubGluZVRvKG5ld0xpbmVFbGVtZW50LngsIG5ld0xpbmVFbGVtZW50LnkpO1xyXG4gICAgICAgIC8vICAgICAgICAgY29uc29sZS5sb2coXCJMaW5lVG86IFwiICsgbmV3TGluZUVsZW1lbnQueCArIFwiLCBcIiArIG5ld0xpbmVFbGVtZW50LnkpO1xyXG4gICAgICAgIC8vICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5saW5lR3JhcGhpYy5tb3ZlVG8obmV3TGluZUVsZW1lbnQueCwgbmV3TGluZUVsZW1lbnQueSk7XHJcbiAgICAgICAgLy8gICAgICAgICBjb25zb2xlLmxvZyhcIk1vdmVUbzogXCIgKyBuZXdMaW5lRWxlbWVudC54ICsgXCIsIFwiICsgbmV3TGluZUVsZW1lbnQueSk7XHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgIHRoaXMuaGl0UG9seWdvbkRpcnR5ID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmluaXRpYWxIaXRQb2x5Z29uRGlydHkgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuY2FsY3VsYXRlQ2VudGVyKCk7XHJcblxyXG4gICAgICAgIHRoaXMubmV3VHVydGxlWCA9IG5ld0xpbmVFbGVtZW50Lng7XHJcbiAgICAgICAgdGhpcy5uZXdUdXJ0bGVZID0gbmV3TGluZUVsZW1lbnQueTtcclxuICAgICAgICB0aGlzLm5ld0FuZ2xlRGVnID0gdGhpcy50dXJ0bGVBbmdsZURlZztcclxuXHJcbiAgICAgICAgLy8gZG9uJ3QgcmVuZGVyIG1vcmUgZnJlcXVlbnQgdGhhbiBldmVyeSAxLzEwMCBzXHJcbiAgICAgICAgaWYgKCF0aGlzLnJlbmRlckpvYlByZXNlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5yZW5kZXJKb2JQcmVzZW50ID0gdHJ1ZTtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckpvYlByZXNlbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVUdXJ0bGVUbyh0aGlzLm5ld1R1cnRsZVgsIHRoaXMubmV3VHVydGxlWSwgdGhpcy50dXJ0bGVBbmdsZURlZyk7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3ZlVG8oeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgbmV3TGluZUVsZW1lbnQ6IExpbmVFbGVtZW50ID0ge1xyXG4gICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICB5OiB5LFxyXG4gICAgICAgICAgICBjb2xvcjogbnVsbCxcclxuICAgICAgICAgICAgYWxwaGE6IHRoaXMuYm9yZGVyQWxwaGEsXHJcbiAgICAgICAgICAgIGxpbmVXaWR0aDogdGhpcy5ib3JkZXJXaWR0aFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5saW5lRWxlbWVudHMucHVzaChuZXdMaW5lRWxlbWVudCk7XHJcblxyXG4gICAgICAgIHRoaXMuaGl0UG9seWdvbkRpcnR5ID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmluaXRpYWxIaXRQb2x5Z29uRGlydHkgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuY2FsY3VsYXRlQ2VudGVyKCk7XHJcbiAgICAgICAgdGhpcy5tb3ZlVHVydGxlVG8obmV3TGluZUVsZW1lbnQueCwgbmV3TGluZUVsZW1lbnQueSwgdGhpcy50dXJ0bGVBbmdsZURlZyk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGluaXRUdXJ0bGUoeDogbnVtYmVyLCB5OiBudW1iZXIsIGFuZ2xlRGVnOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnR1cnRsZS5jbGVhcigpO1xyXG4gICAgICAgIHRoaXMudHVydGxlLmxpbmVTdHlsZSgzLCAweGZmMDAwMCwgMSwgMC41KTtcclxuICAgICAgICB0aGlzLnR1cnRsZS5tb3ZlVG8oeCwgeSk7XHJcblxyXG4gICAgICAgIGxldCBhbmdsZVJhZCA9IGFuZ2xlRGVnLzE4MC4wKk1hdGguUEk7XHJcblxyXG4gICAgICAgIGxldCB2eCA9IE1hdGguY29zKGFuZ2xlUmFkKTtcclxuICAgICAgICBsZXQgdnkgPSBNYXRoLnNpbihhbmdsZVJhZCk7XHJcblxyXG4gICAgICAgIGxldCB2eHAgPSAtTWF0aC5zaW4oYW5nbGVSYWQpO1xyXG4gICAgICAgIGxldCB2eXAgPSBNYXRoLmNvcyhhbmdsZVJhZCk7XHJcblxyXG4gICAgICAgIGxldCBsZW5ndGhGb3J3YXJkID0gdGhpcy50dXJ0bGVTaXplIC8gMjtcclxuICAgICAgICBsZXQgbGVuZ3RoQmFja3dhcmQgPSB0aGlzLnR1cnRsZVNpemUgLyA0O1xyXG4gICAgICAgIGxldCBsZW5ndGhCYWNrd2FyZFAgPSB0aGlzLnR1cnRsZVNpemUgLyA0O1xyXG5cclxuICAgICAgICB0aGlzLnR1cnRsZS5tb3ZlVG8oeCArIHZ4ICogbGVuZ3RoRm9yd2FyZCwgeSArIHZ5ICogbGVuZ3RoRm9yd2FyZCk7XHJcbiAgICAgICAgdGhpcy50dXJ0bGUubGluZVRvKHggLSB2eCAqIGxlbmd0aEJhY2t3YXJkICsgdnhwICogbGVuZ3RoQmFja3dhcmRQLCB5IC0gdnkgKiBsZW5ndGhCYWNrd2FyZCArIHZ5cCAqIGxlbmd0aEJhY2t3YXJkUCk7XHJcbiAgICAgICAgdGhpcy50dXJ0bGUubGluZVRvKHggLSB2eCAqIGxlbmd0aEJhY2t3YXJkIC0gdnhwICogbGVuZ3RoQmFja3dhcmRQLCB5IC0gdnkgKiBsZW5ndGhCYWNrd2FyZCAtIHZ5cCAqIGxlbmd0aEJhY2t3YXJkUCk7XHJcbiAgICAgICAgdGhpcy50dXJ0bGUubGluZVRvKHggKyB2eCAqIGxlbmd0aEZvcndhcmQsIHkgKyB2eSAqIGxlbmd0aEZvcndhcmQpO1xyXG4gICAgfVxyXG5cclxuICAgIG1vdmVUdXJ0bGVUbyh4OiBudW1iZXIsIHk6IG51bWJlciwgYW5nbGVEZWc6IG51bWJlcil7XHJcbiAgICAgICAgdGhpcy50dXJ0bGUubG9jYWxUcmFuc2Zvcm0uaWRlbnRpdHkoKTtcclxuICAgICAgICB0aGlzLnR1cnRsZS5sb2NhbFRyYW5zZm9ybS5yb3RhdGUoYW5nbGVEZWcvMTgwLjAqTWF0aC5QSSk7XHJcbiAgICAgICAgdGhpcy50dXJ0bGUubG9jYWxUcmFuc2Zvcm0udHJhbnNsYXRlKHgsIHkpO1xyXG5cclxuICAgICAgICAvLyB0aGlzLnR1cnRsZS5sb2NhbFRyYW5zZm9ybS50cmFuc2xhdGUoLXRoaXMudHVydGxlWCwgLXRoaXMudHVydGxlWSk7XHJcbiAgICAgICAgLy8gdGhpcy50dXJ0bGUubG9jYWxUcmFuc2Zvcm0ucm90YXRlKChhbmdsZURlZyAtIHRoaXMubGFzdFR1cnRsZUFuZ2xlRGVnKS8xODAuMCpNYXRoLlBJKTtcclxuICAgICAgICAvLyB0aGlzLnR1cnRsZS5sb2NhbFRyYW5zZm9ybS50cmFuc2xhdGUoeCwgeSk7XHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgdGhpcy50dXJ0bGUudHJhbnNmb3JtLm9uQ2hhbmdlKCk7XHJcbiAgICAgICAgdGhpcy50dXJ0bGUudXBkYXRlVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgICAgIHRoaXMubGFzdFR1cnRsZUFuZ2xlRGVnID0gdGhpcy50dXJ0bGVBbmdsZURlZztcclxuICAgIH1cclxuXHJcbiAgICByZW5kZXIoKTogdm9pZCB7XHJcblxyXG4gICAgICAgIGxldCBnOiBQSVhJLkdyYXBoaWNzID0gdGhpcy5saW5lR3JhcGhpYztcclxuXHJcbiAgICAgICAgdGhpcy5sYXN0TGluZVdpZHRoID0gMDtcclxuICAgICAgICB0aGlzLmxhc3RDb2xvciA9IDA7XHJcbiAgICAgICAgdGhpcy5sYXN0QWxwaGEgPSAwO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5kaXNwbGF5T2JqZWN0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgZyA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGxheU9iamVjdCA9IGc7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRIZWxwZXIuc3RhZ2UuYWRkQ2hpbGQoZyk7XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGcuY2xlYXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmZpbGxDb2xvciAhPSBudWxsICYmIHRoaXMuaXNGaWxsZWQpIHtcclxuICAgICAgICAgICAgZy5iZWdpbkZpbGwodGhpcy5maWxsQ29sb3IsIHRoaXMuZmlsbEFscGhhKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBmaXJzdFBvaW50ID0gdGhpcy5saW5lRWxlbWVudHNbMF07XHJcbiAgICAgICAgZy5tb3ZlVG8oZmlyc3RQb2ludC54LCBmaXJzdFBvaW50LnkpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pc0ZpbGxlZCkge1xyXG4gICAgICAgICAgICBnLmxpbmVTdHlsZSh0aGlzLmJvcmRlcldpZHRoLCB0aGlzLmJvcmRlckNvbG9yLCB0aGlzLmJvcmRlckFscGhhLCAwLjUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IHRoaXMubGluZUVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxldCBsZTogTGluZUVsZW1lbnQgPSB0aGlzLmxpbmVFbGVtZW50c1tpXTtcclxuICAgICAgICAgICAgaWYgKGxlLmNvbG9yICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc0ZpbGxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsZS5saW5lV2lkdGggIT0gdGhpcy5sYXN0TGluZVdpZHRoIHx8IGxlLmNvbG9yICE9IHRoaXMubGFzdENvbG9yIHx8IGxlLmFscGhhICE9IHRoaXMubGFzdEFscGhhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGcubGluZVN0eWxlKGxlLmxpbmVXaWR0aCwgbGUuY29sb3IsIGxlLmFscGhhLCAwLjUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdExpbmVXaWR0aCA9IGxlLmxpbmVXaWR0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0Q29sb3IgPSBsZS5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0QWxwaGEgPSBsZS5hbHBoYTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBnLmxpbmVUbyhsZS54LCBsZS55KTtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiTGluZVRvOiBcIiArIGxlLnggKyBcIiwgXCIgKyBsZS55KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGcubW92ZVRvKGxlLngsIGxlLnkpO1xyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJNb3ZlVG86IFwiICsgbGUueCArIFwiLCBcIiArIGxlLnkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5pc0ZpbGxlZCkge1xyXG4gICAgICAgICAgICBnLmNsb3NlUGF0aCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuZmlsbENvbG9yICE9IG51bGwgJiYgdGhpcy5pc0ZpbGxlZCkge1xyXG4gICAgICAgICAgICBnLmVuZEZpbGwoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbGxpZGVzV2l0aChzaGFwZUhlbHBlcjogYW55KSB7XHJcblxyXG4gICAgICAgIGlmIChzaGFwZUhlbHBlciBpbnN0YW5jZW9mIFR1cnRsZUhlbHBlciAmJiBzaGFwZUhlbHBlci5pbml0aWFsSGl0UG9seWdvbkRpcnR5KSB7XHJcbiAgICAgICAgICAgIHNoYXBlSGVscGVyLnNldHVwSW5pdGlhbEhpdFBvbHlnb24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmluaXRpYWxIaXRQb2x5Z29uRGlydHkpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXR1cEluaXRpYWxIaXRQb2x5Z29uKCk7XHJcbiAgICAgICAgICAgIHRoaXMudHJhbnNmb3JtSGl0UG9seWdvbigpO1xyXG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGJiID0gdGhpcy5kaXNwbGF5T2JqZWN0LmdldEJvdW5kcygpO1xyXG4gICAgICAgIGxldCBiYjEgPSBzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LmdldEJvdW5kcygpO1xyXG5cclxuICAgICAgICBpZiAoYmIubGVmdCA+IGJiMS5yaWdodCB8fCBiYjEubGVmdCA+IGJiLnJpZ2h0KSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmIChiYi50b3AgPiBiYjEuYm90dG9tIHx8IGJiMS50b3AgPiBiYi5ib3R0b20pIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKHNoYXBlSGVscGVyW1wic2hhcGVzXCJdKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzaGFwZUhlbHBlci5jb2xsaWRlc1dpdGgodGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oaXRQb2x5Z29uSW5pdGlhbCA9PSBudWxsIHx8IHNoYXBlSGVscGVyLmhpdFBvbHlnb25Jbml0aWFsID09IG51bGwpIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICAvLyBib3VuZGlnIGJveGVzIGNvbGxpZGUsIHNvIGNoZWNrIGZ1cnRoZXI6XHJcbiAgICAgICAgaWYgKHRoaXMuaGl0UG9seWdvbkRpcnR5KSB0aGlzLnRyYW5zZm9ybUhpdFBvbHlnb24oKTtcclxuICAgICAgICBpZiAoc2hhcGVIZWxwZXIuaGl0UG9seWdvbkRpcnR5KSBzaGFwZUhlbHBlci50cmFuc2Zvcm1IaXRQb2x5Z29uKCk7XHJcblxyXG4gICAgICAgIGlmKHNoYXBlSGVscGVyLiBoaXRQb2x5Z29uVHJhbnNmb3JtZWQubGVuZ3RoID09IDIgJiYgIXRoaXMuaXNGaWxsZWQpe1xyXG4gICAgICAgICAgICByZXR1cm4gc3RlY2tlbnp1Z1NjaG5laWRldFN0cmVja2VuenVnKHRoaXMuaGl0UG9seWdvblRyYW5zZm9ybWVkLCBzaGFwZUhlbHBlci5oaXRQb2x5Z29uVHJhbnNmb3JtZWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHBvbHlnb25CZXLDvGhydFBvbHlnb24odGhpcy5oaXRQb2x5Z29uVHJhbnNmb3JtZWQsIHNoYXBlSGVscGVyLmhpdFBvbHlnb25UcmFuc2Zvcm1lZCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldHVwSW5pdGlhbEhpdFBvbHlnb24oKSB7XHJcbiAgICAgICAgdGhpcy5oaXRQb2x5Z29uSW5pdGlhbCA9IHRoaXMubGluZUVsZW1lbnRzLm1hcCgobGUpID0+IHsgcmV0dXJuIHsgeDogbGUueCwgeTogbGUueSB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNsZWFyKHg6IG51bWJlciA9IG51bGwsIHk6IG51bWJlciA9IG51bGwsIGFuZ2xlOiBudW1iZXIgPSBudWxsKSB7XHJcbiAgICAgICAgbGV0IGxhc3RMaW5lRWxlbWVudCA9IHRoaXMubGluZUVsZW1lbnRzLnBvcCgpO1xyXG4gICAgICAgIGlmKHggPT0gbnVsbCkgeCA9IGxhc3RMaW5lRWxlbWVudC54O1xyXG4gICAgICAgIGlmKHkgPT0gbnVsbCkgeSA9IGxhc3RMaW5lRWxlbWVudC55O1xyXG5cclxuICAgICAgICB0aGlzLmxpbmVFbGVtZW50cyA9IFtdO1xyXG5cclxuICAgICAgICB0aGlzLmxpbmVFbGVtZW50cy5wdXNoKHtcclxuICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgeTogeSxcclxuICAgICAgICAgICAgY29sb3I6IDAsXHJcbiAgICAgICAgICAgIGFscGhhOiAxLFxyXG4gICAgICAgICAgICBsaW5lV2lkdGg6IDFcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLmNhbGN1bGF0ZUNlbnRlcigpO1xyXG5cclxuICAgICAgICB0aGlzLmhpdFBvbHlnb25Jbml0aWFsID0gW107XHJcbiAgICAgICAgaWYoYW5nbGUgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgIHRoaXMudHVydGxlQW5nbGVEZWcgPSBhbmdsZTtcclxuICAgICAgICAgICAgdGhpcy5sYXN0VHVydGxlQW5nbGVEZWcgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLmJvcmRlckNvbG9yID0gMDtcclxuICAgICAgICAgICAgdGhpcy50dXJ0bGVTaXplID0gNDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgaWYoYW5nbGUgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZVR1cnRsZVRvKHgsIHksIGFuZ2xlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHRvdWNoZXNBdExlYXN0T25lRmlndXJlKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCBsYXN0TGluZUVsZW1lbnQ6IExpbmVFbGVtZW50ID0gdGhpcy5saW5lRWxlbWVudHNbdGhpcy5saW5lRWxlbWVudHMubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgbGV0IHggPSBsYXN0TGluZUVsZW1lbnQueDtcclxuICAgICAgICBsZXQgeSA9IGxhc3RMaW5lRWxlbWVudC55O1xyXG5cclxuICAgICAgICBmb3IgKGxldCBzaCBvZiB0aGlzLndvcmxkSGVscGVyLnNoYXBlcykge1xyXG4gICAgICAgICAgICBpZiAoc2ggIT0gdGhpcyAmJiBzaC5jb250YWluc1BvaW50KHgsIHkpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0b3VjaGVzQ29sb3IoZmFyYmU6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCBsYXN0TGluZUVsZW1lbnQ6IExpbmVFbGVtZW50ID0gdGhpcy5saW5lRWxlbWVudHNbdGhpcy5saW5lRWxlbWVudHMubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgbGV0IHggPSBsYXN0TGluZUVsZW1lbnQueDtcclxuICAgICAgICBsZXQgeSA9IGxhc3RMaW5lRWxlbWVudC55O1xyXG5cclxuICAgICAgICBmb3IgKGxldCBzaCBvZiB0aGlzLndvcmxkSGVscGVyLnNoYXBlcykge1xyXG4gICAgICAgICAgICBpZiAoc2ggIT0gdGhpcyAmJiBzaC5jb250YWluc1BvaW50KHgsIHkpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2ggaW5zdGFuY2VvZiBGaWxsZWRTaGFwZUhlbHBlciAmJiBzaC5maWxsQ29sb3IgPT0gZmFyYmUpIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgLy8gaWYoc2ggaW5zdGFuY2VvZiBUdXJ0bGVIZWxwZXIpIFRPRE9cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0b3VjaGVzU2hhcGUoc2hhcGU6IFNoYXBlSGVscGVyKSB7XHJcbiAgICAgICAgbGV0IGxhc3RMaW5lRWxlbWVudDogTGluZUVsZW1lbnQgPSB0aGlzLmxpbmVFbGVtZW50c1t0aGlzLmxpbmVFbGVtZW50cy5sZW5ndGggLSAxXTtcclxuICAgICAgICBsZXQgeCA9IGxhc3RMaW5lRWxlbWVudC54O1xyXG4gICAgICAgIGxldCB5ID0gbGFzdExpbmVFbGVtZW50Lnk7XHJcbiAgICAgICAgcmV0dXJuIHNoYXBlLmNvbnRhaW5zUG9pbnQoeCwgeSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29udGFpbnNQb2ludCh4OiBudW1iZXIsIHk6IG51bWJlcikge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pbml0aWFsSGl0UG9seWdvbkRpcnR5KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0dXBJbml0aWFsSGl0UG9seWdvbigpO1xyXG4gICAgICAgICAgICB0aGlzLnRyYW5zZm9ybUhpdFBvbHlnb24oKTtcclxuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5kaXNwbGF5T2JqZWN0LmdldEJvdW5kcygpLmNvbnRhaW5zKHgsIHkpKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhpdFBvbHlnb25Jbml0aWFsID09IG51bGwpIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5oaXRQb2x5Z29uRGlydHkpIHRoaXMudHJhbnNmb3JtSGl0UG9seWdvbigpO1xyXG5cclxuICAgICAgICBpZih0aGlzLmlzRmlsbGVkKXtcclxuICAgICAgICAgICAgcmV0dXJuIHBvbHlnb25FbnRow6RsdFB1bmt0KHRoaXMuaGl0UG9seWdvblRyYW5zZm9ybWVkLCB7IHg6IHgsIHk6IHkgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHN0cmVja2VuenVnRW50aMOkbHRQdW5rdCh0aGlzLmhpdFBvbHlnb25UcmFuc2Zvcm1lZCwgeyB4OiB4LCB5OiB5IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG59XHJcbiJdfQ==