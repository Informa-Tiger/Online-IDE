import { Klass, Visibility } from "../../compiler/types/Class.js";
import { Method, Parameterlist, Attribute } from "../../compiler/types/Types.js";
import { intPrimitiveType, doublePrimitiveType, voidPrimitiveType, booleanPrimitiveType, stringPrimitiveType } from "../../compiler/types/PrimitiveTypes.js";
import { RuntimeObject } from "../../interpreter/RuntimeObject.js";
import { ArrayType } from "../../compiler/types/Array.js";
import { ActorHelper } from "./Actor.js";
import { polygonEnthältPunkt, polygonBerührtPolygonExakt } from "../../tools/MatheTools.js";
import { ColorHelper } from "./ColorHelper.js";
import { FilledShapeDefaults } from "./FilledShapeDefaults.js";
export class ShapeClass extends Klass {
    constructor(module) {
        super("Shape", module, "Basisklasse für alle graphischen Objekte die verschoben, skaliert und gedreht werden können");
        this.setBaseClass(module.typeStore.getType("Actor"));
        this.isAbstract = true;
        // let matrixType = new ArrayType(doublePrimitiveType);
        let shapeType = module.typeStore.getType("Shape");
        let directionType = module.typeStore.getType("Direction");
        let shapeArrayType = new ArrayType(shapeType);
        let colorType = this.module.typeStore.getType("Color");
        let vector2Class = module.typeStore.getType("Vector2");
        this.addAttribute(new Attribute("angle", doublePrimitiveType, (value) => {
            let rto = value.object;
            let helper = rto.intrinsicData["Actor"];
            if (helper == null || helper.isDestroyed || helper.displayObject == null) {
                value.value = 0;
                return;
            }
            value.value = helper.angle;
        }, false, Visibility.protected, true, "Richtung"));
        this.addAttribute(new Attribute("centerX", doublePrimitiveType, (value) => {
            let rto = value.object;
            let helper = rto.intrinsicData["Actor"];
            if (helper == null || helper.isDestroyed || helper.displayObject == null) {
                value.value = 0;
                return;
            }
            value.value = helper.getCenterX();
        }, false, Visibility.protected, true, "X-Koordinate des Diagonalenschnittpunkts der BoundingBox des Objekts"));
        this.addAttribute(new Attribute("centerY", doublePrimitiveType, (value) => {
            let rto = value.object;
            let helper = rto.intrinsicData["Actor"];
            if (helper == null || helper.isDestroyed || helper.displayObject == null) {
                value.value = 0;
                return;
            }
            value.value = helper.getCenterY();
        }, false, Visibility.protected, true, "Y-Koordinate des Diagonalenschnittpunkts der BoundingBox des Objekts"));
        this.setupAttributeIndicesRecursive();
        // this.addAttribute(new Attribute("transformation", matrixType,
        //     (value) => {
        //         let rto: RuntimeObject = value.object;
        //         let helper: ShapeHelper = rto.intrinsicData["Actor"];
        //         if (helper == null || helper.isDestroyed || helper.displayObject.transform == null) {
        //             value.value = null;
        //             return;
        //         }
        //         let matrix = helper.displayObject.localTransform.toArray(false);
        //         if (value.value == null) {
        //             value.value = [];
        //             for (let n of matrix) {
        //                 value.value.push({
        //                     type: doublePrimitiveType,
        //                     value: n
        //                 });
        //             }
        //         } else {
        //             let i: number = 0;
        //             for (let n of matrix) {
        //                 value.value[i++].value = n;
        //             }
        //         }
        //     }, false, Visibility.protected, true, "Transformationsmatrix"));
        this.addMethod(new Method("move", new Parameterlist([
            { identifier: "dx", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "dy", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let dx = parameters[1].value;
            let dy = parameters[2].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("move"))
                return;
            sh.move(dx, dy);
        }, false, false, "Verschiebt das Grafikobjekt um dx Pixel nach rechts und um dy Pixel nach unten.", false));
        this.addMethod(new Method("rotate", new Parameterlist([
            { identifier: "angleInDeg", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "centerX", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "centerY", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let angleInDeg = parameters[1].value;
            let centerX = parameters[2].value;
            let centerY = parameters[3].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("rotate"))
                return;
            sh.rotate(angleInDeg, centerX, centerY);
        }, false, false, "Dreht das Grafikobjekt um den angegebenen Winkel. Drehpunkt ist (centerX, centerY).", false));
        this.addMethod(new Method("rotate", new Parameterlist([
            { identifier: "angleInDeg", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let angleInDeg = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("rotate"))
                return;
            sh.rotate(angleInDeg);
        }, false, false, "Dreht das Grafikobjekt um den angegebenen Winkel. Drehpunkt ist der 'Mittelpunkt' des Objekts", false));
        this.addMethod(new Method("scale", new Parameterlist([
            { identifier: "factor", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "centerX", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "centerY", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let factor = parameters[1].value;
            let centerX = parameters[2].value;
            let centerY = parameters[3].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("scale"))
                return;
            sh.scale(factor, centerX, centerY);
        }, false, false, "Streckt das Grafikobjekt um den angegebenen Faktor. Das Zentrum der Streckung ist der Punkt (centerX, centerY)", false));
        this.addMethod(new Method("scale", new Parameterlist([
            { identifier: "factor", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let factor = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("scale"))
                return;
            sh.scale(factor);
        }, false, false, "Streckt das Grafikobjekt um den angegebenen Faktor. Das Zentrum der Streckung ist der 'Mittelpunkt' des Objekts.", false));
        this.addMethod(new Method("mirrorX", new Parameterlist([]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("mirrorX"))
                return;
            sh.mirrorXY(-1, 1);
        }, false, false, "Spiegelt das Objekt in X-Richtung.", false));
        this.addMethod(new Method("mirrorY", new Parameterlist([]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("mirrorX"))
                return;
            sh.mirrorXY(1, -1);
        }, false, false, "Spiegelt das Objekt in Y-Richtung.", false));
        this.addMethod(new Method("isOutsideView", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("isOutsideView"))
                return;
            return sh.isOutsideView();
        }, false, false, "Gibt genau dann true zurück, wenn sich die Bounding Box des Objekts außerhalb des sichtbaren Bereichs befindet. ", false));
        this.addMethod(new Method("getCenterX", new Parameterlist([]), doublePrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("getCenterX"))
                return;
            return sh.getCenterX();
        }, false, false, "Gibt die x-Koordinate des 'Mittelpunkts' zurück. Der 'Mittelpunkt' des Grafikobjekts ist der Diagonalenschnittpunkt seiner achsenparallelen Bounding-Box.", false));
        this.addMethod(new Method("getCenterY", new Parameterlist([]), doublePrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("getCenterY"))
                return;
            return sh.getCenterY();
        }, false, false, "Gibt die y-Koordinate des 'Mittelpunkts' zurück. Der 'Mittelpunkt' des Grafikobjekts ist der Diagonalenschnittpunkt seiner achsenparallelen Bounding-Box.", false));
        this.addMethod(new Method("getAngle", new Parameterlist([]), doublePrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("getAngle"))
                return;
            return sh.angle;
        }, false, false, "Gibt den Winkel des Grafikobjekts in Grad zurück. Winkel == 0 bedeutet: dieselbe Richtung wie zum Zeipunkt der Instanzierung des Objekts. Positive Winkelzunahme bedeutet Rechtsdrehung.", false));
        this.addMethod(new Method("containsPoint", new Parameterlist([
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let x = parameters[1].value;
            let y = parameters[2].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("containsPoint"))
                return;
            return sh.containsPoint(x, y);
        }, false, false, "Gibt genau dann true zurück, wenn das Grafikobjekt den Punkt (x, y) enthält.", false));
        this.addMethod(new Method("collidesWith", new Parameterlist([
            { identifier: "object", type: this, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let shape = parameters[1].value;
            if (shape == null) {
                module.main.getInterpreter().throwException("Der Parameter der Methode collidesWith darf nicht null sein.");
            }
            let sh = o.intrinsicData["Actor"];
            let sh1 = shape.intrinsicData["Actor"];
            if (sh.testdestroyed("collidesWith"))
                return;
            if (sh1.isDestroyed) {
                sh.worldHelper.interpreter.throwException("Die der Methode collidesWith als Parameter übergebene Figur ist bereits zerstört.");
                return;
            }
            return sh.collidesWith(sh1);
        }, false, false, "Gibt genau dann true zurück, wenn das Grafikobjekt und das andere Grafikobjekt kollidieren.", false));
        this.addMethod(new Method("collidesWithAnyShape", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("collidesWithAnyShape"))
                return;
            return sh.collidesWithAnyShape();
        }, false, false, "Gibt genau dann true zurück, wenn das Grafikobjekt mit irgendeinem anderen Grafikobjekt kollidiert.", false));
        this.addMethod(new Method("moveBackFrom", new Parameterlist([
            { identifier: "otherShape", type: this, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "keepColliding", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let shape = parameters[1].value;
            let keepColliding = parameters[2].value;
            if (shape == null) {
                module.main.getInterpreter().throwException("Der erste Parameter der Methode moveBackFrom darf nicht null sein.");
            }
            let sh = o.intrinsicData["Actor"];
            let sh1 = shape.intrinsicData["Actor"];
            if (sh.testdestroyed("moveBackFrom"))
                return;
            if (sh1.isDestroyed) {
                sh.worldHelper.interpreter.throwException("Die der Methode moveBackFrom als Parameter übergebene Figur ist bereits zerstört.");
                return;
            }
            sh.moveBackFrom(sh1, keepColliding);
        }, false, false, "Rückt das Objekt entlang der letzten durch move vorgegebenen Richtung zurück, bis es das übergebene Objekt gerade noch (keepColliding == true) bzw. gerade nicht mehr (keepColliding == false) berührt.", false));
        this.addMethod(new Method("directionRelativeTo", new Parameterlist([
            { identifier: "otherShape", type: this, declaration: null, usagePositions: null, isFinal: true },
        ]), directionType, (parameters) => {
            let o = parameters[0].value;
            let shape = parameters[1].value;
            if (shape == null) {
                module.main.getInterpreter().throwException("Der erste Parameter der Methode directionRelativeTo darf nicht null sein.");
            }
            let sh = o.intrinsicData["Actor"];
            let sh1 = shape.intrinsicData["Actor"];
            if (sh.testdestroyed("directionRelativeTo"))
                return;
            if (sh1.isDestroyed) {
                sh.worldHelper.interpreter.throwException("Die der Methode directionRelativeTo als Parameter übergebene Figur ist bereits zerstört.");
                return;
            }
            return sh.directionRelativeTo(sh1, directionType);
        }, false, false, "Gibt die Richtung (top, right, bottom oder left) zurück, in der das graphische Objekt relativ zum übergebenen graphischen Objekt steht.", false));
        this.addMethod(new Method("moveTo", new Parameterlist([
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            let x = parameters[1].value;
            let y = parameters[2].value;
            if (sh.testdestroyed("moveTo"))
                return;
            sh.move(x - sh.getCenterX(), y - sh.getCenterY());
        }, false, false, "Verschiebt das Grafikobjekt so, dass sich sein 'Mittelpunkt' an den angegebenen Koordinaten befindet.", false));
        this.addMethod(new Method("defineCenter", new Parameterlist([
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            let x = parameters[1].value;
            let y = parameters[2].value;
            if (sh.testdestroyed("defineCenter"))
                return;
            sh.defineCenter(x, y);
        }, false, false, "Setzt fest, wo der 'Mittelpunkt' des Objekts liegen soll. Dieser Punkt wird als Drehpunkt der Methode rotate, als Zentrum der Methode Scale und als Referenzpunkt der Methode moveTo benutzt.", false));
        this.addMethod(new Method("defineCenterRelative", new Parameterlist([
            { identifier: "xRel", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "yRel", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            let x = parameters[1].value;
            let y = parameters[2].value;
            if (sh.testdestroyed("defineCenterRelative"))
                return;
            sh.defineCenterRelative(x, y);
        }, false, false, "Setzt fest, wo der 'Mittelpunkt' des Objekts liegen soll. Dabei bedeutet (XRel/YRel) = (0/0) die linke obere Ecke der Bounding Box des Objekts, (XRel/YRel) = (1/1) die rechte untere Ecke. Defaultwert ist (XRel/YRel) = (0.5/0.5), also der Diagonalenschnittpunkt der Bounding Box. Dieser Punkt wird als Drehpunkt der Methode rotate, als Zentrum der Methode Scale und als Referenzpunkt der Methode moveTo benutzt.\n\nVORSICHT: Diese Methode arbeitet nicht mehr korrekt, wenn das Objekt schon gedreht wurde!", false));
        this.addMethod(new Method("setAngle", new Parameterlist([
            { identifier: "angleDeg", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            let angleDeg = parameters[1].value;
            if (sh.testdestroyed("setAngle"))
                return;
            sh.rotate(angleDeg - sh.angle);
        }, false, false, "Dreht das Objekt zur angegebenen Richtung.", false));
        this.addMethod(new Method("setDefaultVisibility", new Parameterlist([
            { identifier: "visibility", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let visibility = parameters[1].value;
            FilledShapeDefaults.setDefaultVisibility(visibility);
        }, false, true, 'Setzt den Standardwert für das Attribut "visible". Dieser wird nachfolgend immer dann verwendet, wenn ein neues grafisches Objekt instanziert wird.', false));
        this.addMethod(new Method("setVisible", new Parameterlist([
            { identifier: "visible", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            let visible = parameters[1].value;
            if (sh.testdestroyed("setVisible"))
                return;
            sh.setVisible(visible);
        }, false, false, "Macht das Grafikobjekt sichtbar (visible == true) bzw. unsichtbar (visible == false).", false));
        this.addMethod(new Method("setStatic", new Parameterlist([
            { identifier: "isStatic", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            let isStatic = parameters[1].value;
            if (sh.testdestroyed("setStatic"))
                return;
            sh.setStatic(isStatic);
        }, false, false, "setStatic(true) hat zur Folge, dass die Ansicht des Objekts durch Transformationen des World-Objekts nicht verändert wird.", false));
        this.addMethod(new Method("onMouseEnter", new Parameterlist([
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, () => { }, // no statements!
        false, false, "Wird aufgerufen, wenn sich der Mauspfeil in das Objekt hineinbewegt.", false));
        this.addMethod(new Method("onMouseLeave", new Parameterlist([
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, () => { }, // no statements!
        false, false, "Wird aufgerufen, wenn sich der Mauspfeil in das Objekt hineinbewegt.", false));
        this.addMethod(new Method("onMouseDown", new Parameterlist([
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "key", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, () => { }, // no statements!
        false, false, "Wird aufgerufen, wenn sich der Mauspfeil über dem Objekt befindet und der Benutzer eine Maustaste nach unten drückt.", false));
        this.addMethod(new Method("onMouseUp", new Parameterlist([
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "key", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, () => { }, // no statements!
        false, false, "Wird aufgerufen, wenn sich der Mauspfeil über dem Objekt befindet und der Benutzer eine Maustaste loslässt.", false));
        this.addMethod(new Method("onMouseMove", new Parameterlist([
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, () => { }, // no statements!
        false, false, "Wird aufgerufen, wenn sich der Mauspfeil über dem Objekt befindet und bewegt.", false));
        this.addMethod(new Method("tint", new Parameterlist([
            { identifier: "colorAsRGBAString", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let color = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("tint"))
                return;
            sh.tint(color);
        }, false, false, 'Überzieht das Grafikobjekt mit einer halbdurchsichtigen Farbschicht.', false));
        this.addMethod(new Method("tint", new Parameterlist([
            { identifier: "colorAsInt", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let color = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("tint"))
                return;
            sh.tint(color);
        }, false, false, 'Überzieht das Grafikobjekt mit einer halbdurchsichtigen Farbschicht. Die Farbe wird als int-Wert angegeben, praktischerweise hexadezimal, also z.B. tint(0x303030).', false));
        this.addMethod(new Method("tint", new Parameterlist([
            { identifier: "color", type: colorType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let color = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("tint"))
                return;
            sh.tint(color);
        }, false, false, 'Überzieht das Grafikobjekt mit einer halbdurchsichtigen Farbschicht. Die Farbe wird als int-Wert angegeben, praktischerweise hexadezimal, also z.B. tint(0x303030).', false));
        this.addMethod(new Method("startTrackingEveryMouseMovement", new Parameterlist([]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            sh.trackMouseMove = true;
        }, false, false, 'Sorgt dafür, dass ab jetzt JEDE Bewegung des Mauszeigers (auch wenn sich dieser außerhalb des Objekts befindet) ein MouseMove-Ereignis für dieses Objekt auslöst. -> Praktisch zur Umsetzung des "Ziehens" von Objekten mit der Maus!', false));
        this.addMethod(new Method("stopTrackingEveryMouseMovement", new Parameterlist([]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            sh.trackMouseMove = false;
        }, false, false, 'Sorgt dafür, dass ab jetzt nur noch dann Bewegungen des Mauszeigers ein MouseMove-Ereignis für dieses Objekt auslösen, wenn sich der Mauszeiger über dem Objekt befindet. -> Praktisch zur Umsetzung des "Ziehens" von Objekten mit der Maus!', false));
        this.addMethod(new Method("reactToMouseEventsWhenInvisible", new Parameterlist([
            { identifier: "react", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let react = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            sh.reactToMouseEventsWhenInvisible = react;
        }, false, false, 'Legt fest, ob das Objekt auf Mausevents (buttondown, mouse move, ...) reagiert, wenn es unsichtbar ist.', false));
        this.addMethod(new Method("tint", new Parameterlist([
            { identifier: "colorAsRGBAString", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let color = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("tint"))
                return;
            sh.tint(color);
        }, false, false, 'Überzieht das Grafikobjekt mit einer halbdurchsichtigen Farbschicht.', false));
        this.addMethod(new Method("defineDirection", new Parameterlist([
            { identifier: "angleInDeg", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let direction = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("defineDirection"))
                return;
            sh.directionRad = direction / 180 * Math.PI;
        }, false, false, 'Setzt die Blickrichtung des graphischen Objekts. Dies ist die Richtung, in die es durch Aufruf der Methode forward bewegt wird. \nBemerkung: die Methode rotate ändert auch die Blickrichtung!', false));
        this.addMethod(new Method("forward", new Parameterlist([
            { identifier: "distance", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let distance = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("forward"))
                return;
            sh.forward(distance);
        }, false, false, 'Bewegt das Objekt um die angegebene Länge in Richtung seiner Blickrichtung.\nBemerkung: Die Blickrichtung kann mit defineDirection gesetzt werden.', false));
        this.addMethod(new Method("copy", new Parameterlist([]), this, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("copy"))
                return;
            return sh.getCopy(o.class);
        }, true, false, 'Erstellt eine Kopie des Grafikobjekts und git sie zurück.', false));
        this.addMethod(new Method("bringToFront", new Parameterlist([]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("bringToFront"))
                return;
            return sh.bringToFront();
        }, false, false, 'Setzt das Grafikobjekt vor alle anderen.', false));
        this.addMethod(new Method("sendToBack", new Parameterlist([]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("sendToBack"))
                return;
            return sh.sendToBack();
        }, false, false, 'Setzt das Grafikobjekt hinter alle anderen.', false));
        this.addMethod(new Method("getHitPolygon", new Parameterlist([]), new ArrayType(vector2Class), (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("getHitPolygon"))
                return;
            return sh.getHitPolygon(vector2Class);
        }, false, false, "Gibt ein Array zurück, das die vier Eckpunkte des Hit-Polygons in Form von Vector2-Ortsvektoren enthält. Bei den Klassen Rectangle, Triangle und Polygon sind dies die Eckpunkte.", false));
    }
}
export class ShapeHelper extends ActorHelper {
    constructor(interpreter, runtimeObject) {
        super(interpreter, runtimeObject);
        this.angle = 0;
        this.hitPolygonInitial = null;
        this.hitPolygonTransformed = null;
        this.hitPolygonDirty = true;
        this.reactToMouseEventsWhenInvisible = false;
        this.mouseLastSeenInsideObject = false;
        this.trackMouseMove = false;
        this.scaleFactor = 1.0;
        this.directionRad = 0;
        this.lastMoveDx = 0;
        this.lastMoveDy = 0;
        let listenerTypes = [
            { identifier: "MouseUp", signature: "(double, double, int)" },
            { identifier: "MouseDown", signature: "(double, double, int)" },
            { identifier: "MouseMove", signature: "(double, double)" },
            { identifier: "MouseEnter", signature: "(double, double)" },
            { identifier: "MouseLeave", signature: "(double, double)" },
        ];
        let sd = null;
        for (let lt of listenerTypes) {
            let method = runtimeObject.class.getMethodBySignature("on" + lt.identifier + lt.signature);
            if ((method === null || method === void 0 ? void 0 : method.program) != null || (method === null || method === void 0 ? void 0 : method.invoke) != null) {
                if (sd == null) {
                    sd = {
                        shapeHelper: this,
                        types: {},
                        methods: {}
                    };
                    this.worldHelper.mouseListenerShapes.push(sd);
                }
                sd.types[lt.identifier.toLowerCase()] = true;
                sd.methods[lt.identifier.toLowerCase()] = method;
            }
        }
        if (this.worldHelper.defaultGroup == null) {
            this.worldHelper.shapes.push(this);
        }
    }
    copyFrom(shapeHelper) {
        this.centerXInitial = shapeHelper.centerXInitial;
        this.centerYInitial = shapeHelper.centerYInitial;
        if (shapeHelper.hitPolygonInitial != null) {
            this.hitPolygonInitial = [];
            for (let p of shapeHelper.hitPolygonInitial)
                this.hitPolygonInitial.push(Object.assign({}, p));
        }
        this.setHitPolygonDirty(true);
        this.hitPolygonDirty = shapeHelper.hitPolygonDirty;
        this.reactToMouseEventsWhenInvisible = shapeHelper.reactToMouseEventsWhenInvisible;
        this.mouseLastSeenInsideObject = shapeHelper.mouseLastSeenInsideObject;
        this.displayObject.localTransform.copyFrom(shapeHelper.displayObject.transform.localTransform);
        this.displayObject.updateTransform();
    }
    setHitPolygonDirty(dirty) {
        this.hitPolygonDirty = dirty;
    }
    bringOnePlaneFurtherToFront() {
        let container = this.displayObject.parent;
        let highestIndex = container.children.length - 1;
        let index = container.getChildIndex(this.displayObject);
        if (index < highestIndex) {
            container.setChildIndex(this.displayObject, index + 1);
        }
    }
    bringOnePlaneFurtherToBack() {
        let container = this.displayObject.parent;
        let index = container.getChildIndex(this.displayObject);
        if (index > 0) {
            container.setChildIndex(this.displayObject, index - 1);
        }
    }
    bringToFront() {
        let container = this.displayObject.parent;
        let highestIndex = container.children.length - 1;
        if (this.belongsToGroup != null) {
            this.belongsToGroup.setChildIndex(this, highestIndex);
        }
        else {
            container.setChildIndex(this.displayObject, highestIndex);
        }
    }
    sendToBack() {
        if (this.belongsToGroup != null) {
            this.belongsToGroup.setChildIndex(this, 0);
        }
        else {
            let container = this.displayObject.parent;
            container.setChildIndex(this.displayObject, 0);
        }
    }
    addToDefaultGroupAndSetDefaultVisibility() {
        this.displayObject.visible = FilledShapeDefaults.defaultVisibility;
        if (this.worldHelper.defaultGroup != null) {
            this.runtimeObject.intrinsicData["Actor"] = this;
            let groupHelper = this.worldHelper.defaultGroup;
            groupHelper.add(this.runtimeObject);
        }
    }
    tint(color) {
        let c;
        if (color instanceof RuntimeObject) {
            color = (color.intrinsicData).hex;
        }
        if (typeof color == 'string') {
            c = ColorHelper.parseColorToOpenGL(color).color;
        }
        else {
            c = color;
        }
        //@ts-ignore
        if (this.displayObject.tint) {
            //@ts-ignore
            this.displayObject.tint = c;
        }
        this.render();
    }
    setVisible(visible) {
        this.displayObject.visible = visible;
    }
    collidesWithAnyShape() {
        this.displayObject.updateTransform();
        if (this.hitPolygonDirty)
            this.transformHitPolygon();
        for (let shapeHelper of this.worldHelper.shapes) {
            if (this == shapeHelper)
                continue;
            if (shapeHelper["shapes"] || shapeHelper["turtle"]) {
                if (shapeHelper.collidesWith(this)) {
                    return true;
                }
                else {
                    continue;
                }
            }
            if (this["turtle"]) {
                if (this.collidesWith(shapeHelper)) {
                    return true;
                }
                else {
                    continue;
                }
            }
            let bb = this.displayObject.getBounds();
            let bb1 = shapeHelper.displayObject.getBounds();
            if (bb.left > bb1.right || bb1.left > bb.right)
                continue;
            if (bb.top > bb1.bottom || bb1.top > bb.bottom)
                continue;
            // boundig boxes collide, so check further:
            if (shapeHelper.hitPolygonDirty)
                shapeHelper.transformHitPolygon();
            // return polygonBerührtPolygon(this.hitPolygonTransformed, shapeHelper.hitPolygonTransformed);
            if (polygonBerührtPolygonExakt(this.hitPolygonTransformed, shapeHelper.hitPolygonTransformed, true, true)) {
                return true;
            }
        }
        return false;
    }
    collidesWith(shapeHelper) {
        // if(!(this instanceof TurtleHelper) && (shapeHelper instanceof TurtleHelper)){
        if (this["lineElements"] == null && (shapeHelper["lineElements"] != null)) {
            return shapeHelper.collidesWith(this);
        }
        if (shapeHelper["shapes"]) {
            return shapeHelper.collidesWith(this);
        }
        if (this.displayObject == null || shapeHelper.displayObject == null)
            return;
        this.displayObject.updateTransform();
        shapeHelper.displayObject.updateTransform();
        let bb = this.displayObject.getBounds();
        let bb1 = shapeHelper.displayObject.getBounds();
        if (bb.left > bb1.right || bb1.left > bb.right)
            return false;
        if (bb.top > bb1.bottom || bb1.top > bb.bottom)
            return false;
        if (this.hitPolygonInitial == null || shapeHelper.hitPolygonInitial == null)
            return true;
        // boundig boxes collide, so check further:
        if (this.hitPolygonDirty)
            this.transformHitPolygon();
        if (shapeHelper.hitPolygonDirty)
            shapeHelper.transformHitPolygon();
        // return polygonBerührtPolygon(this.hitPolygonTransformed, shapeHelper.hitPolygonTransformed);
        return polygonBerührtPolygonExakt(this.hitPolygonTransformed, shapeHelper.hitPolygonTransformed, true, true);
    }
    directionRelativeTo(shapeHelper, directionType) {
        this.displayObject.updateTransform();
        shapeHelper.displayObject.updateTransform();
        let bb = this.displayObject.getBounds();
        let bb1 = shapeHelper.displayObject.getBounds();
        let dx1 = bb1.left - bb.right; // positive if left
        let dx2 = bb.left - bb1.right; // positive if right
        let dy1 = bb1.top - bb.bottom; // positive if top
        let dy2 = bb.top - bb1.bottom; // positive if bottom
        let enuminfo = directionType.enumInfoList;
        let pairs = [];
        if (this.lastMoveDx > 0) {
            pairs.push({ distance: dx1, ei: enuminfo[3] });
        }
        else if (this.lastMoveDx < 0) {
            pairs.push({ distance: dx2, ei: enuminfo[1] });
        }
        if (this.lastMoveDy > 0) {
            pairs.push({ distance: dy1, ei: enuminfo[0] });
        }
        else if (this.lastMoveDy < 0) {
            pairs.push({ distance: dy2, ei: enuminfo[2] });
        }
        if (pairs.length == 0) {
            pairs = [
                { distance: dx1, ei: enuminfo[3] },
                { distance: dx2, ei: enuminfo[1] },
                { distance: dy1, ei: enuminfo[0] },
                { distance: dy2, ei: enuminfo[2] }
            ];
        }
        let max = pairs[0].distance;
        let ei = pairs[0].ei;
        for (let i = 1; i < pairs.length; i++) {
            if (pairs[i].distance > max) {
                max = pairs[i].distance;
                ei = pairs[i].ei;
            }
        }
        return ei.object;
    }
    moveBackFrom(sh1, keepColliding) {
        // subsequent calls to move destroy values in this.lastMoveDx and this.lastMoveDy, so:
        let lmdx = this.lastMoveDx;
        let lmdy = this.lastMoveDy;
        let length = Math.sqrt(lmdx * lmdx + lmdy * lmdy);
        if (length < 0.001)
            return;
        if (!this.collidesWith(sh1))
            return;
        let parameterMax = 0; // collision with this parameter
        this.move(-lmdx, -lmdy);
        let currentParameter = -1; // move to parameterMin
        while (this.collidesWith(sh1)) {
            parameterMax = currentParameter; // collision at this parameter
            let newParameter = currentParameter * 2;
            this.move(lmdx * (newParameter - currentParameter), lmdy * (newParameter - currentParameter));
            currentParameter = newParameter;
            if ((currentParameter + 1) * length < -100) {
                this.move(lmdx * (-1 - currentParameter), lmdy * (-1 - currentParameter));
                return;
            }
        }
        let parameterMin = currentParameter;
        let isColliding = false;
        // Situation now: no collision at parameterMin == currentParameter, collision at parameterMax
        while ((parameterMax - parameterMin) * length > 1) {
            let np = (parameterMax + parameterMin) / 2;
            this.move(lmdx * (np - currentParameter), lmdy * (np - currentParameter));
            if (isColliding = this.collidesWith(sh1)) {
                parameterMax = np;
            }
            else {
                parameterMin = np;
            }
            currentParameter = np;
        }
        if (keepColliding && !isColliding) {
            this.move(lmdx * (parameterMax - currentParameter), lmdy * (parameterMax - currentParameter));
        }
        else if (isColliding && !keepColliding) {
            this.move(lmdx * (parameterMin - currentParameter), lmdy * (parameterMin - currentParameter));
        }
        this.lastMoveDx = lmdx;
        this.lastMoveDy = lmdy;
    }
    containsPoint(x, y) {
        if (!this.displayObject.getBounds().contains(x, y))
            return false;
        if (this.hitPolygonInitial == null)
            return true;
        if (this.hitPolygonDirty)
            this.transformHitPolygon();
        return polygonEnthältPunkt(this.hitPolygonTransformed, { x: x, y: y });
    }
    transformHitPolygon() {
        let p = new PIXI.Point(this.centerXInitial, this.centerYInitial);
        this.displayObject.updateTransform();
        this.displayObject.transform.worldTransform.apply(p, p);
        this.hitPolygonTransformed = [];
        let m = this.displayObject.transform.worldTransform;
        for (let p of this.hitPolygonInitial) {
            this.hitPolygonTransformed.push({
                x: (m.a * p.x) + (m.c * p.y) + m.tx,
                y: (m.b * p.x) + (m.d * p.y) + m.ty
            });
        }
        this.setHitPolygonDirty(false);
    }
    isOutsideView() {
        let bounds = this.displayObject.getBounds(true);
        let wh = this.worldHelper;
        return bounds.right < wh.currentLeft || bounds.left > wh.currentLeft + wh.currentWidth
            || bounds.bottom < wh.currentTop || bounds.top > wh.currentTop + wh.currentHeight;
    }
    defineCenter(x, y) {
        let p = new PIXI.Point(x, y);
        this.displayObject.transform.worldTransform.applyInverse(p, p);
        this.centerXInitial = p.x;
        this.centerYInitial = p.y;
    }
    defineCenterRelative(x, y) {
        let bounds = this.displayObject.getBounds(false);
        this.defineCenter(bounds.left + bounds.width * x, bounds.top + bounds.height * y);
    }
    move(dx, dy) {
        if (dx != 0 || dy != 0) {
            this.lastMoveDx = dx;
            this.lastMoveDy = dy;
        }
        this.displayObject.localTransform.translate(dx, dy);
        //@ts-ignore
        this.displayObject.transform.onChange();
        this.displayObject.updateTransform();
        this.setHitPolygonDirty(true);
    }
    forward(distance) {
        let dx = distance * Math.cos(this.directionRad);
        let dy = -distance * Math.sin(this.directionRad);
        this.move(dx, dy);
    }
    rotate(angleInDeg, cX, cY) {
        if (cX == null) {
            let p = new PIXI.Point(this.centerXInitial, this.centerYInitial);
            this.displayObject.localTransform.apply(p, p);
            cX = p.x;
            cY = p.y;
        }
        else {
            let p = new PIXI.Point(cX, cY);
            this.displayObject.updateTransform(); // necessary if world coordinate system is scaled
            this.displayObject.transform.worldTransform.applyInverse(p, p);
            this.displayObject.localTransform.apply(p, p);
            cX = p.x;
            cY = p.y;
        }
        this.displayObject.localTransform.translate(-cX, -cY);
        this.displayObject.localTransform.rotate(-angleInDeg / 180 * Math.PI);
        this.displayObject.localTransform.translate(cX, cY);
        //@ts-ignore
        this.displayObject.transform.onChange();
        this.displayObject.updateTransform();
        this.setHitPolygonDirty(true);
        this.angle += angleInDeg;
        this.directionRad += angleInDeg / 180 * Math.PI;
    }
    mirrorXY(scaleX, scaleY) {
        let cX, cY;
        let p = new PIXI.Point(this.centerXInitial, this.centerYInitial);
        this.displayObject.localTransform.apply(p, p);
        cX = p.x;
        cY = p.y;
        this.displayObject.localTransform.translate(-cX, -cY);
        this.displayObject.localTransform.scale(scaleX, scaleY);
        this.displayObject.localTransform.translate(cX, cY);
        //@ts-ignore
        this.displayObject.transform.onChange();
        this.displayObject.updateTransform();
        this.setHitPolygonDirty(true);
    }
    scale(factor, cX, cY) {
        if (cX == null) {
            let p = new PIXI.Point(this.centerXInitial, this.centerYInitial);
            this.displayObject.localTransform.apply(p, p);
            cX = p.x;
            cY = p.y;
        }
        else {
            let p = new PIXI.Point(cX, cY);
            this.displayObject.transform.worldTransform.applyInverse(p, p);
            this.displayObject.localTransform.apply(p, p);
            cX = p.x;
            cY = p.y;
        }
        this.displayObject.localTransform.translate(-cX, -cY);
        this.displayObject.localTransform.scale(factor, factor);
        this.displayObject.localTransform.translate(cX, cY);
        //@ts-ignore
        this.displayObject.transform.onChange();
        this.displayObject.updateTransform();
        this.setHitPolygonDirty(true);
        this.scaleFactor *= factor;
    }
    getCenterX() {
        let p = new PIXI.Point(this.centerXInitial, this.centerYInitial);
        this.displayObject.updateTransform();
        // this.displayObject.localTransform.apply(p, p);
        this.displayObject.transform.worldTransform.apply(p, p);
        return p.x;
    }
    getCenterY() {
        let p = new PIXI.Point(this.centerXInitial, this.centerYInitial);
        this.displayObject.updateTransform();
        this.displayObject.transform.worldTransform.apply(p, p);
        return p.y;
    }
    destroy() {
        super.destroy();
        if (this.belongsToGroup != null) {
            this.belongsToGroup.remove(this.runtimeObject);
        }
        else {
            let index = this.worldHelper.shapes.indexOf(this);
            if (index >= 0)
                this.worldHelper.shapes.splice(index, 1);
        }
        let index1 = this.worldHelper.shapesNotAffectedByWorldTransforms.indexOf(this);
        if (index1 >= 0) {
            this.worldHelper.shapesNotAffectedByWorldTransforms.splice(index1, 1);
        }
    }
    getCollidingShapes(groupHelper, shapeType) {
        let collidingShapes = [];
        for (let shape of groupHelper.shapes) {
            let shapeHelper = shape.intrinsicData["Actor"];
            if (shapeHelper.collidesWith(this)) {
                collidingShapes.push({
                    type: shapeType,
                    value: shape
                });
            }
        }
        return collidingShapes;
    }
    getHitPolygon(vector2Class) {
        if (this.hitPolygonDirty) {
            this.transformHitPolygon();
        }
        let ret = [];
        for (let p of this.hitPolygonTransformed) {
            let ro = new RuntimeObject(vector2Class);
            ro.attributes = [{ type: doublePrimitiveType, value: p.x }, { type: doublePrimitiveType, value: p.y }];
            ret.push({ type: vector2Class, value: ro });
        }
        return ret;
    }
    setStatic(isStatic) {
        let list = this.worldHelper.shapesNotAffectedByWorldTransforms;
        if (isStatic) {
            list.push(this);
        }
        else {
            let index = list.indexOf(this);
            if (index >= 0) {
                list.splice(index, 1);
            }
        }
    }
    getParentGroup() {
        var _a;
        return ((_a = this.belongsToGroup) === null || _a === void 0 ? void 0 : _a.runtimeObject) || null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2hhcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1NoYXBlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFlLE1BQU0sK0JBQStCLENBQUM7QUFDOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUF1QixtQkFBbUIsRUFBWSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVMLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV6QyxPQUFPLEVBQVMsbUJBQW1CLEVBQXlCLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDMUgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBTS9DLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRy9ELE1BQU0sT0FBTyxVQUFXLFNBQVEsS0FBSztJQUVqQyxZQUFZLE1BQWM7UUFFdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsNkZBQTZGLENBQUMsQ0FBQztRQUV0SCxJQUFJLENBQUMsWUFBWSxDQUFRLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFFdkIsdURBQXVEO1FBQ3ZELElBQUksU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9B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SUFDckQsQ0FBQztDQUlKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgS2xhc3MsIFZpc2liaWxpdHkgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvQ2xhc3MuanNcIjtcclxuaW1wb3J0IHsgTW9kdWxlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3BhcnNlci9Nb2R1bGUuanNcIjtcclxuaW1wb3J0IHsgTWV0aG9kLCBQYXJhbWV0ZXJsaXN0LCBBdHRyaWJ1dGUsIFZhbHVlLCBUeXBlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL1R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IGludFByaW1pdGl2ZVR5cGUsIGRvdWJsZVByaW1pdGl2ZVR5cGUsIHZvaWRQcmltaXRpdmVUeXBlLCBib29sZWFuUHJpbWl0aXZlVHlwZSwgRG91YmxlUHJpbWl0aXZlVHlwZSwgc3RyaW5nUHJpbWl0aXZlVHlwZSwgbnVsbFR5cGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvUHJpbWl0aXZlVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgUnVudGltZU9iamVjdCB9IGZyb20gXCIuLi8uLi9pbnRlcnByZXRlci9SdW50aW1lT2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IEFycmF5VHlwZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9BcnJheS5qc1wiO1xyXG5pbXBvcnQgeyBBY3RvckhlbHBlciB9IGZyb20gXCIuL0FjdG9yLmpzXCI7XHJcbmltcG9ydCB7IFdvcmxkSGVscGVyLCBNb3VzZUxpc3RlbmVyU2hhcGVEYXRhIH0gZnJvbSBcIi4vV29ybGQuanNcIjtcclxuaW1wb3J0IHsgUHVua3QsIHBvbHlnb25FbnRow6RsdFB1bmt0LCBwb2x5Z29uQmVyw7xocnRQb2x5Z29uLCBwb2x5Z29uQmVyw7xocnRQb2x5Z29uRXhha3QgfSBmcm9tIFwiLi4vLi4vdG9vbHMvTWF0aGVUb29scy5qc1wiO1xyXG5pbXBvcnQgeyBDb2xvckhlbHBlciB9IGZyb20gXCIuL0NvbG9ySGVscGVyLmpzXCI7XHJcbmltcG9ydCB7IEludGVycHJldGVyIH0gZnJvbSBcIi4uLy4uL2ludGVycHJldGVyL0ludGVycHJldGVyLmpzXCI7XHJcbmltcG9ydCB7IEdyb3VwSGVscGVyLCBHcm91cENsYXNzIH0gZnJvbSBcIi4vR3JvdXAuanNcIjtcclxuaW1wb3J0IHsgQ2lyY2xlSGVscGVyIH0gZnJvbSBcIi4vQ2lyY2xlLmpzXCI7XHJcbmltcG9ydCB7IFR1cnRsZUhlbHBlciB9IGZyb20gXCIuL1R1cnRsZS5qc1wiO1xyXG5pbXBvcnQgeyBFbnVtLCBFbnVtSW5mbyB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9FbnVtLmpzXCI7XHJcbmltcG9ydCB7IEZpbGxlZFNoYXBlRGVmYXVsdHMgfSBmcm9tIFwiLi9GaWxsZWRTaGFwZURlZmF1bHRzLmpzXCI7XHJcbmltcG9ydCB7IENvbG9yQ2xhc3NJbnRyaW5zaWNEYXRhIH0gZnJvbSBcIi4vQ29sb3IuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTaGFwZUNsYXNzIGV4dGVuZHMgS2xhc3Mge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG1vZHVsZTogTW9kdWxlKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKFwiU2hhcGVcIiwgbW9kdWxlLCBcIkJhc2lza2xhc3NlIGbDvHIgYWxsZSBncmFwaGlzY2hlbiBPYmpla3RlIGRpZSB2ZXJzY2hvYmVuLCBza2FsaWVydCB1bmQgZ2VkcmVodCB3ZXJkZW4ga8O2bm5lblwiKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRCYXNlQ2xhc3MoPEtsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIkFjdG9yXCIpKTtcclxuICAgICAgICB0aGlzLmlzQWJzdHJhY3QgPSB0cnVlO1xyXG5cclxuICAgICAgICAvLyBsZXQgbWF0cml4VHlwZSA9IG5ldyBBcnJheVR5cGUoZG91YmxlUHJpbWl0aXZlVHlwZSk7XHJcbiAgICAgICAgbGV0IHNoYXBlVHlwZSA9IG1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlNoYXBlXCIpO1xyXG4gICAgICAgIGxldCBkaXJlY3Rpb25UeXBlID0gPEVudW0+KDxhbnk+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiRGlyZWN0aW9uXCIpKTtcclxuICAgICAgICBsZXQgc2hhcGVBcnJheVR5cGUgPSBuZXcgQXJyYXlUeXBlKHNoYXBlVHlwZSk7XHJcbiAgICAgICAgbGV0IGNvbG9yVHlwZTogS2xhc3MgPSA8S2xhc3M+dGhpcy5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJDb2xvclwiKTtcclxuXHJcbiAgICAgICAgbGV0IHZlY3RvcjJDbGFzcyA9IDxLbGFzcz5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJWZWN0b3IyXCIpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZEF0dHJpYnV0ZShuZXcgQXR0cmlidXRlKFwiYW5nbGVcIiwgZG91YmxlUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHZhbHVlKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHJ0bzogUnVudGltZU9iamVjdCA9IHZhbHVlLm9iamVjdDtcclxuICAgICAgICAgICAgICAgIGxldCBoZWxwZXI6IFNoYXBlSGVscGVyID0gcnRvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaGVscGVyID09IG51bGwgfHwgaGVscGVyLmlzRGVzdHJveWVkIHx8IGhlbHBlci5kaXNwbGF5T2JqZWN0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gaGVscGVyLmFuZ2xlO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIFZpc2liaWxpdHkucHJvdGVjdGVkLCB0cnVlLCBcIlJpY2h0dW5nXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRBdHRyaWJ1dGUobmV3IEF0dHJpYnV0ZShcImNlbnRlclhcIiwgZG91YmxlUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHZhbHVlKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHJ0bzogUnVudGltZU9iamVjdCA9IHZhbHVlLm9iamVjdDtcclxuICAgICAgICAgICAgICAgIGxldCBoZWxwZXI6IFNoYXBlSGVscGVyID0gcnRvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgICAgIGlmIChoZWxwZXIgPT0gbnVsbCB8fCBoZWxwZXIuaXNEZXN0cm95ZWQgfHwgaGVscGVyLmRpc3BsYXlPYmplY3QgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gMDtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWUgPSBoZWxwZXIuZ2V0Q2VudGVyWCgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIFZpc2liaWxpdHkucHJvdGVjdGVkLCB0cnVlLCBcIlgtS29vcmRpbmF0ZSBkZXMgRGlhZ29uYWxlbnNjaG5pdHRwdW5rdHMgZGVyIEJvdW5kaW5nQm94IGRlcyBPYmpla3RzXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRBdHRyaWJ1dGUobmV3IEF0dHJpYnV0ZShcImNlbnRlcllcIiwgZG91YmxlUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHZhbHVlKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHJ0bzogUnVudGltZU9iamVjdCA9IHZhbHVlLm9iamVjdDtcclxuICAgICAgICAgICAgICAgIGxldCBoZWxwZXI6IFNoYXBlSGVscGVyID0gcnRvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgICAgIGlmIChoZWxwZXIgPT0gbnVsbCB8fCBoZWxwZXIuaXNEZXN0cm95ZWQgfHwgaGVscGVyLmRpc3BsYXlPYmplY3QgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gMDtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWUgPSBoZWxwZXIuZ2V0Q2VudGVyWSgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIFZpc2liaWxpdHkucHJvdGVjdGVkLCB0cnVlLCBcIlktS29vcmRpbmF0ZSBkZXMgRGlhZ29uYWxlbnNjaG5pdHRwdW5rdHMgZGVyIEJvdW5kaW5nQm94IGRlcyBPYmpla3RzXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXR1cEF0dHJpYnV0ZUluZGljZXNSZWN1cnNpdmUoKTtcclxuXHJcbiAgICAgICAgLy8gdGhpcy5hZGRBdHRyaWJ1dGUobmV3IEF0dHJpYnV0ZShcInRyYW5zZm9ybWF0aW9uXCIsIG1hdHJpeFR5cGUsXHJcbiAgICAgICAgLy8gICAgICh2YWx1ZSkgPT4ge1xyXG5cclxuICAgICAgICAvLyAgICAgICAgIGxldCBydG86IFJ1bnRpbWVPYmplY3QgPSB2YWx1ZS5vYmplY3Q7XHJcbiAgICAgICAgLy8gICAgICAgICBsZXQgaGVscGVyOiBTaGFwZUhlbHBlciA9IHJ0by5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgLy8gICAgICAgICBpZiAoaGVscGVyID09IG51bGwgfHwgaGVscGVyLmlzRGVzdHJveWVkIHx8IGhlbHBlci5kaXNwbGF5T2JqZWN0LnRyYW5zZm9ybSA9PSBudWxsKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgdmFsdWUudmFsdWUgPSBudWxsO1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAvLyAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gICAgICAgICBsZXQgbWF0cml4ID0gaGVscGVyLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0udG9BcnJheShmYWxzZSk7XHJcblxyXG4gICAgICAgIC8vICAgICAgICAgaWYgKHZhbHVlLnZhbHVlID09IG51bGwpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IFtdO1xyXG5cclxuICAgICAgICAvLyAgICAgICAgICAgICBmb3IgKGxldCBuIG9mIG1hdHJpeCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICB2YWx1ZS52YWx1ZS5wdXNoKHtcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICB2YWx1ZTogblxyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAvLyAgICAgICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGxldCBpOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGZvciAobGV0IG4gb2YgbWF0cml4KSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlW2krK10udmFsdWUgPSBuO1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gICAgIH0sIGZhbHNlLCBWaXNpYmlsaXR5LnByb3RlY3RlZCwgdHJ1ZSwgXCJUcmFuc2Zvcm1hdGlvbnNtYXRyaXhcIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwibW92ZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJkeFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImR5XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZHg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZHk6IG51bWJlciA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJtb3ZlXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2gubW92ZShkeCwgZHkpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIlZlcnNjaGllYnQgZGFzIEdyYWZpa29iamVrdCB1bSBkeCBQaXhlbCBuYWNoIHJlY2h0cyB1bmQgdW0gZHkgUGl4ZWwgbmFjaCB1bnRlbi5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInJvdGF0ZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJhbmdsZUluRGVnXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY2VudGVyWFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImNlbnRlcllcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhbmdsZUluRGVnOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNlbnRlclg6IG51bWJlciA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgY2VudGVyWTogbnVtYmVyID0gcGFyYW1ldGVyc1szXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInJvdGF0ZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnJvdGF0ZShhbmdsZUluRGVnLCBjZW50ZXJYLCBjZW50ZXJZKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJEcmVodCBkYXMgR3JhZmlrb2JqZWt0IHVtIGRlbiBhbmdlZ2ViZW5lbiBXaW5rZWwuIERyZWhwdW5rdCBpc3QgKGNlbnRlclgsIGNlbnRlclkpLlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwicm90YXRlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImFuZ2xlSW5EZWdcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhbmdsZUluRGVnOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwicm90YXRlXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2gucm90YXRlKGFuZ2xlSW5EZWcpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkRyZWh0IGRhcyBHcmFmaWtvYmpla3QgdW0gZGVuIGFuZ2VnZWJlbmVuIFdpbmtlbC4gRHJlaHB1bmt0IGlzdCBkZXIgJ01pdHRlbHB1bmt0JyBkZXMgT2JqZWt0c1wiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2NhbGVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiZmFjdG9yXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY2VudGVyWFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImNlbnRlcllcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBmYWN0b3I6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgY2VudGVyWDogbnVtYmVyID0gcGFyYW1ldGVyc1syXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBjZW50ZXJZOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzNdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwic2NhbGVcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5zY2FsZShmYWN0b3IsIGNlbnRlclgsIGNlbnRlclkpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIlN0cmVja3QgZGFzIEdyYWZpa29iamVrdCB1bSBkZW4gYW5nZWdlYmVuZW4gRmFrdG9yLiBEYXMgWmVudHJ1bSBkZXIgU3RyZWNrdW5nIGlzdCBkZXIgUHVua3QgKGNlbnRlclgsIGNlbnRlclkpXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzY2FsZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJmYWN0b3JcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBmYWN0b3I6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJzY2FsZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnNjYWxlKGZhY3Rvcik7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiU3RyZWNrdCBkYXMgR3JhZmlrb2JqZWt0IHVtIGRlbiBhbmdlZ2ViZW5lbiBGYWt0b3IuIERhcyBaZW50cnVtIGRlciBTdHJlY2t1bmcgaXN0IGRlciAnTWl0dGVscHVua3QnIGRlcyBPYmpla3RzLlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwibWlycm9yWFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcIm1pcnJvclhcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5taXJyb3JYWSgtMSwgMSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiU3BpZWdlbHQgZGFzIE9iamVrdCBpbiBYLVJpY2h0dW5nLlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwibWlycm9yWVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcIm1pcnJvclhcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5taXJyb3JYWSgxLCAtMSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiU3BpZWdlbHQgZGFzIE9iamVrdCBpbiBZLVJpY2h0dW5nLlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiaXNPdXRzaWRlVmlld1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImlzT3V0c2lkZVZpZXdcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guaXNPdXRzaWRlVmlldygpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gc2ljaCBkaWUgQm91bmRpbmcgQm94IGRlcyBPYmpla3RzIGF1w59lcmhhbGIgZGVzIHNpY2h0YmFyZW4gQmVyZWljaHMgYmVmaW5kZXQuIFwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0Q2VudGVyWFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGRvdWJsZVByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiZ2V0Q2VudGVyWFwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5nZXRDZW50ZXJYKCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBkaWUgeC1Lb29yZGluYXRlIGRlcyAnTWl0dGVscHVua3RzJyB6dXLDvGNrLiBEZXIgJ01pdHRlbHB1bmt0JyBkZXMgR3JhZmlrb2JqZWt0cyBpc3QgZGVyIERpYWdvbmFsZW5zY2huaXR0cHVua3Qgc2VpbmVyIGFjaHNlbnBhcmFsbGVsZW4gQm91bmRpbmctQm94LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0Q2VudGVyWVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGRvdWJsZVByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiZ2V0Q2VudGVyWVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5nZXRDZW50ZXJZKCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBkaWUgeS1Lb29yZGluYXRlIGRlcyAnTWl0dGVscHVua3RzJyB6dXLDvGNrLiBEZXIgJ01pdHRlbHB1bmt0JyBkZXMgR3JhZmlrb2JqZWt0cyBpc3QgZGVyIERpYWdvbmFsZW5zY2huaXR0cHVua3Qgc2VpbmVyIGFjaHNlbnBhcmFsbGVsZW4gQm91bmRpbmctQm94LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0QW5nbGVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBkb3VibGVQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImdldEFuZ2xlXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLmFuZ2xlO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZGVuIFdpbmtlbCBkZXMgR3JhZmlrb2JqZWt0cyBpbiBHcmFkIHp1csO8Y2suIFdpbmtlbCA9PSAwIGJlZGV1dGV0OiBkaWVzZWxiZSBSaWNodHVuZyB3aWUgenVtIFplaXB1bmt0IGRlciBJbnN0YW56aWVydW5nIGRlcyBPYmpla3RzLiBQb3NpdGl2ZSBXaW5rZWx6dW5haG1lIGJlZGV1dGV0IFJlY2h0c2RyZWh1bmcuXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJjb250YWluc1BvaW50XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ5XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB5OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiY29udGFpbnNQb2ludFwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5jb250YWluc1BvaW50KHgsIHkpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gZGFzIEdyYWZpa29iamVrdCBkZW4gUHVua3QgKHgsIHkpIGVudGjDpGx0LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiY29sbGlkZXNXaXRoXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIm9iamVjdFwiLCB0eXBlOiB0aGlzLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2hhcGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZHVsZS5tYWluLmdldEludGVycHJldGVyKCkudGhyb3dFeGNlcHRpb24oXCJEZXIgUGFyYW1ldGVyIGRlciBNZXRob2RlIGNvbGxpZGVzV2l0aCBkYXJmIG5pY2h0IG51bGwgc2Vpbi5cIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoMTogU2hhcGVIZWxwZXIgPSBzaGFwZS5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJjb2xsaWRlc1dpdGhcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gxLmlzRGVzdHJveWVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2gud29ybGRIZWxwZXIuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJEaWUgZGVyIE1ldGhvZGUgY29sbGlkZXNXaXRoIGFscyBQYXJhbWV0ZXIgw7xiZXJnZWJlbmUgRmlndXIgaXN0IGJlcmVpdHMgemVyc3TDtnJ0LlwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLmNvbGxpZGVzV2l0aChzaDEpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gZGFzIEdyYWZpa29iamVrdCB1bmQgZGFzIGFuZGVyZSBHcmFmaWtvYmpla3Qga29sbGlkaWVyZW4uXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJjb2xsaWRlc1dpdGhBbnlTaGFwZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJjb2xsaWRlc1dpdGhBbnlTaGFwZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5jb2xsaWRlc1dpdGhBbnlTaGFwZSgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gZGFzIEdyYWZpa29iamVrdCBtaXQgaXJnZW5kZWluZW0gYW5kZXJlbiBHcmFmaWtvYmpla3Qga29sbGlkaWVydC5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm1vdmVCYWNrRnJvbVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJvdGhlclNoYXBlXCIsIHR5cGU6IHRoaXMsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwia2VlcENvbGxpZGluZ1wiLCB0eXBlOiBib29sZWFuUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaGFwZTogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQga2VlcENvbGxpZGluZzogYm9vbGVhbiA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoYXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLnRocm93RXhjZXB0aW9uKFwiRGVyIGVyc3RlIFBhcmFtZXRlciBkZXIgTWV0aG9kZSBtb3ZlQmFja0Zyb20gZGFyZiBuaWNodCBudWxsIHNlaW4uXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDE6IFNoYXBlSGVscGVyID0gc2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwibW92ZUJhY2tGcm9tXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoMS5pc0Rlc3Ryb3llZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNoLndvcmxkSGVscGVyLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGllIGRlciBNZXRob2RlIG1vdmVCYWNrRnJvbSBhbHMgUGFyYW1ldGVyIMO8YmVyZ2ViZW5lIEZpZ3VyIGlzdCBiZXJlaXRzIHplcnN0w7ZydC5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNoLm1vdmVCYWNrRnJvbShzaDEsIGtlZXBDb2xsaWRpbmcpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIlLDvGNrdCBkYXMgT2JqZWt0IGVudGxhbmcgZGVyIGxldHp0ZW4gZHVyY2ggbW92ZSB2b3JnZWdlYmVuZW4gUmljaHR1bmcgenVyw7xjaywgYmlzIGVzIGRhcyDDvGJlcmdlYmVuZSBPYmpla3QgZ2VyYWRlIG5vY2ggKGtlZXBDb2xsaWRpbmcgPT0gdHJ1ZSkgYnp3LiBnZXJhZGUgbmljaHQgbWVociAoa2VlcENvbGxpZGluZyA9PSBmYWxzZSkgYmVyw7xocnQuXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJkaXJlY3Rpb25SZWxhdGl2ZVRvXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIm90aGVyU2hhcGVcIiwgdHlwZTogdGhpcywgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGRpcmVjdGlvblR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2hhcGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZHVsZS5tYWluLmdldEludGVycHJldGVyKCkudGhyb3dFeGNlcHRpb24oXCJEZXIgZXJzdGUgUGFyYW1ldGVyIGRlciBNZXRob2RlIGRpcmVjdGlvblJlbGF0aXZlVG8gZGFyZiBuaWNodCBudWxsIHNlaW4uXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDE6IFNoYXBlSGVscGVyID0gc2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiZGlyZWN0aW9uUmVsYXRpdmVUb1wiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaDEuaXNEZXN0cm95ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBzaC53b3JsZEhlbHBlci5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkRpZSBkZXIgTWV0aG9kZSBkaXJlY3Rpb25SZWxhdGl2ZVRvIGFscyBQYXJhbWV0ZXIgw7xiZXJnZWJlbmUgRmlndXIgaXN0IGJlcmVpdHMgemVyc3TDtnJ0LlwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLmRpcmVjdGlvblJlbGF0aXZlVG8oc2gxLCBkaXJlY3Rpb25UeXBlKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGRpZSBSaWNodHVuZyAodG9wLCByaWdodCwgYm90dG9tIG9kZXIgbGVmdCkgenVyw7xjaywgaW4gZGVyIGRhcyBncmFwaGlzY2hlIE9iamVrdCByZWxhdGl2IHp1bSDDvGJlcmdlYmVuZW4gZ3JhcGhpc2NoZW4gT2JqZWt0IHN0ZWh0LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwibW92ZVRvXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ5XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgeDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB5OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwibW92ZVRvXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2gubW92ZSh4IC0gc2guZ2V0Q2VudGVyWCgpLCB5IC0gc2guZ2V0Q2VudGVyWSgpKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJWZXJzY2hpZWJ0IGRhcyBHcmFmaWtvYmpla3Qgc28sIGRhc3Mgc2ljaCBzZWluICdNaXR0ZWxwdW5rdCcgYW4gZGVuIGFuZ2VnZWJlbmVuIEtvb3JkaW5hdGVuIGJlZmluZGV0LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZGVmaW5lQ2VudGVyXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ5XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgeDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB5OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiZGVmaW5lQ2VudGVyXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2guZGVmaW5lQ2VudGVyKHgsIHkpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIlNldHp0IGZlc3QsIHdvIGRlciAnTWl0dGVscHVua3QnIGRlcyBPYmpla3RzIGxpZWdlbiBzb2xsLiBEaWVzZXIgUHVua3Qgd2lyZCBhbHMgRHJlaHB1bmt0IGRlciBNZXRob2RlIHJvdGF0ZSwgYWxzIFplbnRydW0gZGVyIE1ldGhvZGUgU2NhbGUgdW5kIGFscyBSZWZlcmVuenB1bmt0IGRlciBNZXRob2RlIG1vdmVUbyBiZW51dHp0LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZGVmaW5lQ2VudGVyUmVsYXRpdmVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieFJlbFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInlSZWxcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgICAgIGxldCB4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHk6IG51bWJlciA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJkZWZpbmVDZW50ZXJSZWxhdGl2ZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLmRlZmluZUNlbnRlclJlbGF0aXZlKHgsIHkpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIlNldHp0IGZlc3QsIHdvIGRlciAnTWl0dGVscHVua3QnIGRlcyBPYmpla3RzIGxpZWdlbiBzb2xsLiBEYWJlaSBiZWRldXRldCAoWFJlbC9ZUmVsKSA9ICgwLzApIGRpZSBsaW5rZSBvYmVyZSBFY2tlIGRlciBCb3VuZGluZyBCb3ggZGVzIE9iamVrdHMsIChYUmVsL1lSZWwpID0gKDEvMSkgZGllIHJlY2h0ZSB1bnRlcmUgRWNrZS4gRGVmYXVsdHdlcnQgaXN0IChYUmVsL1lSZWwpID0gKDAuNS8wLjUpLCBhbHNvIGRlciBEaWFnb25hbGVuc2Nobml0dHB1bmt0IGRlciBCb3VuZGluZyBCb3guIERpZXNlciBQdW5rdCB3aXJkIGFscyBEcmVocHVua3QgZGVyIE1ldGhvZGUgcm90YXRlLCBhbHMgWmVudHJ1bSBkZXIgTWV0aG9kZSBTY2FsZSB1bmQgYWxzIFJlZmVyZW56cHVua3QgZGVyIE1ldGhvZGUgbW92ZVRvIGJlbnV0enQuXFxuXFxuVk9SU0lDSFQ6IERpZXNlIE1ldGhvZGUgYXJiZWl0ZXQgbmljaHQgbWVociBrb3JyZWt0LCB3ZW5uIGRhcyBPYmpla3Qgc2Nob24gZ2VkcmVodCB3dXJkZSFcIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNldEFuZ2xlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImFuZ2xlRGVnXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgYW5nbGVEZWc6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJzZXRBbmdsZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnJvdGF0ZShhbmdsZURlZyAtIHNoLmFuZ2xlKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJEcmVodCBkYXMgT2JqZWt0IHp1ciBhbmdlZ2ViZW5lbiBSaWNodHVuZy5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNldERlZmF1bHRWaXNpYmlsaXR5XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInZpc2liaWxpdHlcIiwgdHlwZTogYm9vbGVhblByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdmlzaWJpbGl0eTogYm9vbGVhbiA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgRmlsbGVkU2hhcGVEZWZhdWx0cy5zZXREZWZhdWx0VmlzaWJpbGl0eSh2aXNpYmlsaXR5KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCB0cnVlLCAnU2V0enQgZGVuIFN0YW5kYXJkd2VydCBmw7xyIGRhcyBBdHRyaWJ1dCBcInZpc2libGVcIi4gRGllc2VyIHdpcmQgbmFjaGZvbGdlbmQgaW1tZXIgZGFubiB2ZXJ3ZW5kZXQsIHdlbm4gZWluIG5ldWVzIGdyYWZpc2NoZXMgT2JqZWt0IGluc3RhbnppZXJ0IHdpcmQuJywgZmFsc2UpKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzZXRWaXNpYmxlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInZpc2libGVcIiwgdHlwZTogYm9vbGVhblByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgdmlzaWJsZTogYm9vbGVhbiA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJzZXRWaXNpYmxlXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2guc2V0VmlzaWJsZSh2aXNpYmxlKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJNYWNodCBkYXMgR3JhZmlrb2JqZWt0IHNpY2h0YmFyICh2aXNpYmxlID09IHRydWUpIGJ6dy4gdW5zaWNodGJhciAodmlzaWJsZSA9PSBmYWxzZSkuXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzZXRTdGF0aWNcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiaXNTdGF0aWNcIiwgdHlwZTogYm9vbGVhblByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgaXNTdGF0aWM6IGJvb2xlYW4gPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwic2V0U3RhdGljXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2guc2V0U3RhdGljKGlzU3RhdGljKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJzZXRTdGF0aWModHJ1ZSkgaGF0IHp1ciBGb2xnZSwgZGFzcyBkaWUgQW5zaWNodCBkZXMgT2JqZWt0cyBkdXJjaCBUcmFuc2Zvcm1hdGlvbmVuIGRlcyBXb3JsZC1PYmpla3RzIG5pY2h0IHZlcsOkbmRlcnQgd2lyZC5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm9uTW91c2VFbnRlclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ4XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsICgpID0+IHsgfSwgLy8gbm8gc3RhdGVtZW50cyFcclxuICAgICAgICAgICAgZmFsc2UsIGZhbHNlLCBcIldpcmQgYXVmZ2VydWZlbiwgd2VubiBzaWNoIGRlciBNYXVzcGZlaWwgaW4gZGFzIE9iamVrdCBoaW5laW5iZXdlZ3QuXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJvbk1vdXNlTGVhdmVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInlcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLCAoKSA9PiB7IH0sIC8vIG5vIHN0YXRlbWVudHMhXHJcbiAgICAgICAgICAgIGZhbHNlLCBmYWxzZSwgXCJXaXJkIGF1ZmdlcnVmZW4sIHdlbm4gc2ljaCBkZXIgTWF1c3BmZWlsIGluIGRhcyBPYmpla3QgaGluZWluYmV3ZWd0LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwib25Nb3VzZURvd25cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInlcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJrZXlcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLCAoKSA9PiB7IH0sIC8vIG5vIHN0YXRlbWVudHMhXHJcbiAgICAgICAgICAgIGZhbHNlLCBmYWxzZSwgXCJXaXJkIGF1ZmdlcnVmZW4sIHdlbm4gc2ljaCBkZXIgTWF1c3BmZWlsIMO8YmVyIGRlbSBPYmpla3QgYmVmaW5kZXQgdW5kIGRlciBCZW51dHplciBlaW5lIE1hdXN0YXN0ZSBuYWNoIHVudGVuIGRyw7xja3QuXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJvbk1vdXNlVXBcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInlcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJrZXlcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLCAoKSA9PiB7IH0sIC8vIG5vIHN0YXRlbWVudHMhXHJcbiAgICAgICAgICAgIGZhbHNlLCBmYWxzZSwgXCJXaXJkIGF1ZmdlcnVmZW4sIHdlbm4gc2ljaCBkZXIgTWF1c3BmZWlsIMO8YmVyIGRlbSBPYmpla3QgYmVmaW5kZXQgdW5kIGRlciBCZW51dHplciBlaW5lIE1hdXN0YXN0ZSBsb3Nsw6Rzc3QuXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJvbk1vdXNlTW92ZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ4XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsICgpID0+IHsgfSwgLy8gbm8gc3RhdGVtZW50cyFcclxuICAgICAgICAgICAgZmFsc2UsIGZhbHNlLCBcIldpcmQgYXVmZ2VydWZlbiwgd2VubiBzaWNoIGRlciBNYXVzcGZlaWwgw7xiZXIgZGVtIE9iamVrdCBiZWZpbmRldCB1bmQgYmV3ZWd0LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwidGludFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJjb2xvckFzUkdCQVN0cmluZ1wiLCB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbG9yOiBzdHJpbmcgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwidGludFwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnRpbnQoY29sb3IpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnw5xiZXJ6aWVodCBkYXMgR3JhZmlrb2JqZWt0IG1pdCBlaW5lciBoYWxiZHVyY2hzaWNodGlnZW4gRmFyYnNjaGljaHQuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInRpbnRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY29sb3JBc0ludFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbG9yOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwidGludFwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnRpbnQoY29sb3IpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnw5xiZXJ6aWVodCBkYXMgR3JhZmlrb2JqZWt0IG1pdCBlaW5lciBoYWxiZHVyY2hzaWNodGlnZW4gRmFyYnNjaGljaHQuIERpZSBGYXJiZSB3aXJkIGFscyBpbnQtV2VydCBhbmdlZ2ViZW4sIHByYWt0aXNjaGVyd2Vpc2UgaGV4YWRlemltYWwsIGFsc28gei5CLiB0aW50KDB4MzAzMDMwKS4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwidGludFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJjb2xvclwiLCB0eXBlOiBjb2xvclR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgY29sb3I6IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwidGludFwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnRpbnQoY29sb3IpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnw5xiZXJ6aWVodCBkYXMgR3JhZmlrb2JqZWt0IG1pdCBlaW5lciBoYWxiZHVyY2hzaWNodGlnZW4gRmFyYnNjaGljaHQuIERpZSBGYXJiZSB3aXJkIGFscyBpbnQtV2VydCBhbmdlZ2ViZW4sIHByYWt0aXNjaGVyd2Vpc2UgaGV4YWRlemltYWwsIGFsc28gei5CLiB0aW50KDB4MzAzMDMwKS4nLCBmYWxzZSkpO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInN0YXJ0VHJhY2tpbmdFdmVyeU1vdXNlTW92ZW1lbnRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgc2gudHJhY2tNb3VzZU1vdmUgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnU29yZ3QgZGFmw7xyLCBkYXNzIGFiIGpldHp0IEpFREUgQmV3ZWd1bmcgZGVzIE1hdXN6ZWlnZXJzIChhdWNoIHdlbm4gc2ljaCBkaWVzZXIgYXXDn2VyaGFsYiBkZXMgT2JqZWt0cyBiZWZpbmRldCkgZWluIE1vdXNlTW92ZS1FcmVpZ25pcyBmw7xyIGRpZXNlcyBPYmpla3QgYXVzbMO2c3QuIC0+IFByYWt0aXNjaCB6dXIgVW1zZXR6dW5nIGRlcyBcIlppZWhlbnNcIiB2b24gT2JqZWt0ZW4gbWl0IGRlciBNYXVzIScsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzdG9wVHJhY2tpbmdFdmVyeU1vdXNlTW92ZW1lbnRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgc2gudHJhY2tNb3VzZU1vdmUgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ1Nvcmd0IGRhZsO8ciwgZGFzcyBhYiBqZXR6dCBudXIgbm9jaCBkYW5uIEJld2VndW5nZW4gZGVzIE1hdXN6ZWlnZXJzIGVpbiBNb3VzZU1vdmUtRXJlaWduaXMgZsO8ciBkaWVzZXMgT2JqZWt0IGF1c2zDtnNlbiwgd2VubiBzaWNoIGRlciBNYXVzemVpZ2VyIMO8YmVyIGRlbSBPYmpla3QgYmVmaW5kZXQuIC0+IFByYWt0aXNjaCB6dXIgVW1zZXR6dW5nIGRlcyBcIlppZWhlbnNcIiB2b24gT2JqZWt0ZW4gbWl0IGRlciBNYXVzIScsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJyZWFjdFRvTW91c2VFdmVudHNXaGVuSW52aXNpYmxlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInJlYWN0XCIsIHR5cGU6IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlYWN0OiBib29sZWFuID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5yZWFjdFRvTW91c2VFdmVudHNXaGVuSW52aXNpYmxlID0gcmVhY3Q7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdMZWd0IGZlc3QsIG9iIGRhcyBPYmpla3QgYXVmIE1hdXNldmVudHMgKGJ1dHRvbmRvd24sIG1vdXNlIG1vdmUsIC4uLikgcmVhZ2llcnQsIHdlbm4gZXMgdW5zaWNodGJhciBpc3QuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInRpbnRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY29sb3JBc1JHQkFTdHJpbmdcIiwgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBjb2xvcjogc3RyaW5nID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInRpbnRcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC50aW50KGNvbG9yKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ8OcYmVyemllaHQgZGFzIEdyYWZpa29iamVrdCBtaXQgZWluZXIgaGFsYmR1cmNoc2ljaHRpZ2VuIEZhcmJzY2hpY2h0LicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJkZWZpbmVEaXJlY3Rpb25cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiYW5nbGVJbkRlZ1wiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImRlZmluZURpcmVjdGlvblwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLmRpcmVjdGlvblJhZCA9IGRpcmVjdGlvbiAvIDE4MCAqIE1hdGguUEk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdTZXR6dCBkaWUgQmxpY2tyaWNodHVuZyBkZXMgZ3JhcGhpc2NoZW4gT2JqZWt0cy4gRGllcyBpc3QgZGllIFJpY2h0dW5nLCBpbiBkaWUgZXMgZHVyY2ggQXVmcnVmIGRlciBNZXRob2RlIGZvcndhcmQgYmV3ZWd0IHdpcmQuIFxcbkJlbWVya3VuZzogZGllIE1ldGhvZGUgcm90YXRlIMOkbmRlcnQgYXVjaCBkaWUgQmxpY2tyaWNodHVuZyEnLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZm9yd2FyZFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJkaXN0YW5jZVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiZm9yd2FyZFwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLmZvcndhcmQoZGlzdGFuY2UpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnQmV3ZWd0IGRhcyBPYmpla3QgdW0gZGllIGFuZ2VnZWJlbmUgTMOkbmdlIGluIFJpY2h0dW5nIHNlaW5lciBCbGlja3JpY2h0dW5nLlxcbkJlbWVya3VuZzogRGllIEJsaWNrcmljaHR1bmcga2FubiBtaXQgZGVmaW5lRGlyZWN0aW9uIGdlc2V0enQgd2VyZGVuLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJjb3B5XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgdGhpcyxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJjb3B5XCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLmdldENvcHkoPEtsYXNzPm8uY2xhc3MpO1xyXG5cclxuICAgICAgICAgICAgfSwgdHJ1ZSwgZmFsc2UsICdFcnN0ZWxsdCBlaW5lIEtvcGllIGRlcyBHcmFmaWtvYmpla3RzIHVuZCBnaXQgc2llIHp1csO8Y2suJywgZmFsc2UpKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJicmluZ1RvRnJvbnRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJicmluZ1RvRnJvbnRcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guYnJpbmdUb0Zyb250KCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdTZXR6dCBkYXMgR3JhZmlrb2JqZWt0IHZvciBhbGxlIGFuZGVyZW4uJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNlbmRUb0JhY2tcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJzZW5kVG9CYWNrXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLnNlbmRUb0JhY2soKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ1NldHp0IGRhcyBHcmFmaWtvYmpla3QgaGludGVyIGFsbGUgYW5kZXJlbi4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0SGl0UG9seWdvblwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIG5ldyBBcnJheVR5cGUodmVjdG9yMkNsYXNzKSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJnZXRIaXRQb2x5Z29uXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLmdldEhpdFBvbHlnb24odmVjdG9yMkNsYXNzKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGVpbiBBcnJheSB6dXLDvGNrLCBkYXMgZGllIHZpZXIgRWNrcHVua3RlIGRlcyBIaXQtUG9seWdvbnMgaW4gRm9ybSB2b24gVmVjdG9yMi1PcnRzdmVrdG9yZW4gZW50aMOkbHQuIEJlaSBkZW4gS2xhc3NlbiBSZWN0YW5nbGUsIFRyaWFuZ2xlIHVuZCBQb2x5Z29uIHNpbmQgZGllcyBkaWUgRWNrcHVua3RlLlwiLCBmYWxzZSkpO1xyXG5cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTaGFwZUhlbHBlciBleHRlbmRzIEFjdG9ySGVscGVyIHtcclxuXHJcbiAgICBkaXNwbGF5T2JqZWN0OiBQSVhJLkRpc3BsYXlPYmplY3Q7XHJcblxyXG4gICAgYmVsb25nc1RvR3JvdXA6IEdyb3VwSGVscGVyO1xyXG5cclxuICAgIGNlbnRlclhJbml0aWFsOiBudW1iZXI7XHJcbiAgICBjZW50ZXJZSW5pdGlhbDogbnVtYmVyO1xyXG5cclxuICAgIGFuZ2xlOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGhpdFBvbHlnb25Jbml0aWFsOiBQdW5rdFtdID0gbnVsbDtcclxuICAgIGhpdFBvbHlnb25UcmFuc2Zvcm1lZDogUHVua3RbXSA9IG51bGw7XHJcbiAgICBoaXRQb2x5Z29uRGlydHkgPSB0cnVlO1xyXG5cclxuICAgIHJlYWN0VG9Nb3VzZUV2ZW50c1doZW5JbnZpc2libGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBtb3VzZUxhc3RTZWVuSW5zaWRlT2JqZWN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgdHJhY2tNb3VzZU1vdmU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBzY2FsZUZhY3RvcjogbnVtYmVyID0gMS4wO1xyXG5cclxuICAgIGRpcmVjdGlvblJhZDogbnVtYmVyID0gMDtcclxuXHJcbiAgICBsYXN0TW92ZUR4OiBudW1iZXIgPSAwO1xyXG4gICAgbGFzdE1vdmVEeTogbnVtYmVyID0gMDtcclxuXHJcbiAgICBjb3B5RnJvbShzaGFwZUhlbHBlcjogU2hhcGVIZWxwZXIpIHtcclxuXHJcbiAgICAgICAgdGhpcy5jZW50ZXJYSW5pdGlhbCA9IHNoYXBlSGVscGVyLmNlbnRlclhJbml0aWFsO1xyXG4gICAgICAgIHRoaXMuY2VudGVyWUluaXRpYWwgPSBzaGFwZUhlbHBlci5jZW50ZXJZSW5pdGlhbDtcclxuXHJcbiAgICAgICAgaWYgKHNoYXBlSGVscGVyLmhpdFBvbHlnb25Jbml0aWFsICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2x5Z29uSW5pdGlhbCA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBwIG9mIHNoYXBlSGVscGVyLmhpdFBvbHlnb25Jbml0aWFsKSB0aGlzLmhpdFBvbHlnb25Jbml0aWFsLnB1c2goT2JqZWN0LmFzc2lnbih7fSwgcCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXRIaXRQb2x5Z29uRGlydHkodHJ1ZSk7XHJcblxyXG4gICAgICAgIHRoaXMuaGl0UG9seWdvbkRpcnR5ID0gc2hhcGVIZWxwZXIuaGl0UG9seWdvbkRpcnR5O1xyXG4gICAgICAgIHRoaXMucmVhY3RUb01vdXNlRXZlbnRzV2hlbkludmlzaWJsZSA9IHNoYXBlSGVscGVyLnJlYWN0VG9Nb3VzZUV2ZW50c1doZW5JbnZpc2libGU7XHJcbiAgICAgICAgdGhpcy5tb3VzZUxhc3RTZWVuSW5zaWRlT2JqZWN0ID0gc2hhcGVIZWxwZXIubW91c2VMYXN0U2Vlbkluc2lkZU9iamVjdDtcclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLmNvcHlGcm9tKHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QudHJhbnNmb3JtLmxvY2FsVHJhbnNmb3JtKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGludGVycHJldGVyOiBJbnRlcnByZXRlciwgcnVudGltZU9iamVjdDogUnVudGltZU9iamVjdCkge1xyXG5cclxuICAgICAgICBzdXBlcihpbnRlcnByZXRlciwgcnVudGltZU9iamVjdCk7XHJcblxyXG4gICAgICAgIGxldCBsaXN0ZW5lclR5cGVzID0gW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiTW91c2VVcFwiLCBzaWduYXR1cmU6IFwiKGRvdWJsZSwgZG91YmxlLCBpbnQpXCIgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIk1vdXNlRG93blwiLCBzaWduYXR1cmU6IFwiKGRvdWJsZSwgZG91YmxlLCBpbnQpXCIgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIk1vdXNlTW92ZVwiLCBzaWduYXR1cmU6IFwiKGRvdWJsZSwgZG91YmxlKVwiIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJNb3VzZUVudGVyXCIsIHNpZ25hdHVyZTogXCIoZG91YmxlLCBkb3VibGUpXCIgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIk1vdXNlTGVhdmVcIiwgc2lnbmF0dXJlOiBcIihkb3VibGUsIGRvdWJsZSlcIiB9LFxyXG4gICAgICAgIF07XHJcblxyXG4gICAgICAgIGxldCBzZDogTW91c2VMaXN0ZW5lclNoYXBlRGF0YSA9IG51bGw7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGx0IG9mIGxpc3RlbmVyVHlwZXMpIHtcclxuICAgICAgICAgICAgbGV0IG1ldGhvZDogTWV0aG9kID0gKDxLbGFzcz5ydW50aW1lT2JqZWN0LmNsYXNzKS5nZXRNZXRob2RCeVNpZ25hdHVyZShcIm9uXCIgKyBsdC5pZGVudGlmaWVyICsgbHQuc2lnbmF0dXJlKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChtZXRob2Q/LnByb2dyYW0gIT0gbnVsbCB8fCBtZXRob2Q/Lmludm9rZSAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNkID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2hhcGVIZWxwZXI6IHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVzOiB7fSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kczoge31cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMud29ybGRIZWxwZXIubW91c2VMaXN0ZW5lclNoYXBlcy5wdXNoKHNkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzZC50eXBlc1tsdC5pZGVudGlmaWVyLnRvTG93ZXJDYXNlKCldID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHNkLm1ldGhvZHNbbHQuaWRlbnRpZmllci50b0xvd2VyQ2FzZSgpXSA9IG1ldGhvZDtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLndvcmxkSGVscGVyLmRlZmF1bHRHcm91cCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRIZWxwZXIuc2hhcGVzLnB1c2godGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2V0SGl0UG9seWdvbkRpcnR5KGRpcnR5OiBib29sZWFuKSB7XHJcbiAgICAgICAgdGhpcy5oaXRQb2x5Z29uRGlydHkgPSBkaXJ0eTtcclxuICAgIH1cclxuXHJcbiAgICBicmluZ09uZVBsYW5lRnVydGhlclRvRnJvbnQoKSB7XHJcbiAgICAgICAgbGV0IGNvbnRhaW5lcjogUElYSS5Db250YWluZXIgPSA8UElYSS5Db250YWluZXI+dGhpcy5kaXNwbGF5T2JqZWN0LnBhcmVudDtcclxuICAgICAgICBsZXQgaGlnaGVzdEluZGV4ID0gY29udGFpbmVyLmNoaWxkcmVuLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgbGV0IGluZGV4ID0gY29udGFpbmVyLmdldENoaWxkSW5kZXgodGhpcy5kaXNwbGF5T2JqZWN0KTtcclxuICAgICAgICBpZiAoaW5kZXggPCBoaWdoZXN0SW5kZXgpIHtcclxuICAgICAgICAgICAgY29udGFpbmVyLnNldENoaWxkSW5kZXgodGhpcy5kaXNwbGF5T2JqZWN0LCBpbmRleCArIDEpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBicmluZ09uZVBsYW5lRnVydGhlclRvQmFjaygpIHtcclxuICAgICAgICBsZXQgY29udGFpbmVyOiBQSVhJLkNvbnRhaW5lciA9IDxQSVhJLkNvbnRhaW5lcj50aGlzLmRpc3BsYXlPYmplY3QucGFyZW50O1xyXG4gICAgICAgIGxldCBpbmRleCA9IGNvbnRhaW5lci5nZXRDaGlsZEluZGV4KHRoaXMuZGlzcGxheU9iamVjdCk7XHJcbiAgICAgICAgaWYgKGluZGV4ID4gMCkge1xyXG4gICAgICAgICAgICBjb250YWluZXIuc2V0Q2hpbGRJbmRleCh0aGlzLmRpc3BsYXlPYmplY3QsIGluZGV4IC0gMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGJyaW5nVG9Gcm9udCgpIHtcclxuICAgICAgICBsZXQgY29udGFpbmVyOiBQSVhJLkNvbnRhaW5lciA9IDxQSVhJLkNvbnRhaW5lcj50aGlzLmRpc3BsYXlPYmplY3QucGFyZW50O1xyXG4gICAgICAgIGxldCBoaWdoZXN0SW5kZXggPSBjb250YWluZXIuY2hpbGRyZW4ubGVuZ3RoIC0gMTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYmVsb25nc1RvR3JvdXAgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlbG9uZ3NUb0dyb3VwLnNldENoaWxkSW5kZXgodGhpcywgaGlnaGVzdEluZGV4KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb250YWluZXIuc2V0Q2hpbGRJbmRleCh0aGlzLmRpc3BsYXlPYmplY3QsIGhpZ2hlc3RJbmRleCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlbmRUb0JhY2soKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuYmVsb25nc1RvR3JvdXAgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlbG9uZ3NUb0dyb3VwLnNldENoaWxkSW5kZXgodGhpcywgMCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IGNvbnRhaW5lcjogUElYSS5Db250YWluZXIgPSA8UElYSS5Db250YWluZXI+dGhpcy5kaXNwbGF5T2JqZWN0LnBhcmVudDtcclxuICAgICAgICAgICAgY29udGFpbmVyLnNldENoaWxkSW5kZXgodGhpcy5kaXNwbGF5T2JqZWN0LCAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYWRkVG9EZWZhdWx0R3JvdXBBbmRTZXREZWZhdWx0VmlzaWJpbGl0eSgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnZpc2libGUgPSBGaWxsZWRTaGFwZURlZmF1bHRzLmRlZmF1bHRWaXNpYmlsaXR5O1xyXG5cclxuICAgICAgICBpZiAodGhpcy53b3JsZEhlbHBlci5kZWZhdWx0R3JvdXAgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnJ1bnRpbWVPYmplY3QuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdID0gdGhpcztcclxuICAgICAgICAgICAgbGV0IGdyb3VwSGVscGVyID0gPEdyb3VwSGVscGVyPnRoaXMud29ybGRIZWxwZXIuZGVmYXVsdEdyb3VwO1xyXG4gICAgICAgICAgICBncm91cEhlbHBlci5hZGQodGhpcy5ydW50aW1lT2JqZWN0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGludChjb2xvcjogc3RyaW5nIHwgbnVtYmVyIHwgUnVudGltZU9iamVjdCkge1xyXG4gICAgICAgIGxldCBjOiBudW1iZXI7XHJcbiAgICAgICAgaWYgKGNvbG9yIGluc3RhbmNlb2YgUnVudGltZU9iamVjdCkge1xyXG4gICAgICAgICAgICBjb2xvciA9ICg8Q29sb3JDbGFzc0ludHJpbnNpY0RhdGE+KGNvbG9yLmludHJpbnNpY0RhdGEpKS5oZXg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgY29sb3IgPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgYyA9IENvbG9ySGVscGVyLnBhcnNlQ29sb3JUb09wZW5HTChjb2xvcikuY29sb3I7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYyA9IGNvbG9yO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICBpZiAodGhpcy5kaXNwbGF5T2JqZWN0LnRpbnQpIHtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC50aW50ID0gYztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRWaXNpYmxlKHZpc2libGU6IGJvb2xlYW4pIHtcclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnZpc2libGUgPSB2aXNpYmxlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbGxpZGVzV2l0aEFueVNoYXBlKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC51cGRhdGVUcmFuc2Zvcm0oKTtcclxuICAgICAgICBpZiAodGhpcy5oaXRQb2x5Z29uRGlydHkpIHRoaXMudHJhbnNmb3JtSGl0UG9seWdvbigpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBzaGFwZUhlbHBlciBvZiB0aGlzLndvcmxkSGVscGVyLnNoYXBlcykge1xyXG4gICAgICAgICAgICBpZiAodGhpcyA9PSBzaGFwZUhlbHBlcikgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBpZiAoc2hhcGVIZWxwZXJbXCJzaGFwZXNcIl0gfHwgc2hhcGVIZWxwZXJbXCJ0dXJ0bGVcIl0pIHtcclxuICAgICAgICAgICAgICAgIGlmIChzaGFwZUhlbHBlci5jb2xsaWRlc1dpdGgodGhpcykpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzW1widHVydGxlXCJdKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlc1dpdGgoc2hhcGVIZWxwZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgYmIgPSB0aGlzLmRpc3BsYXlPYmplY3QuZ2V0Qm91bmRzKCk7XHJcbiAgICAgICAgICAgIGxldCBiYjEgPSBzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LmdldEJvdW5kcygpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGJiLmxlZnQgPiBiYjEucmlnaHQgfHwgYmIxLmxlZnQgPiBiYi5yaWdodCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBpZiAoYmIudG9wID4gYmIxLmJvdHRvbSB8fCBiYjEudG9wID4gYmIuYm90dG9tKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIC8vIGJvdW5kaWcgYm94ZXMgY29sbGlkZSwgc28gY2hlY2sgZnVydGhlcjpcclxuICAgICAgICAgICAgaWYgKHNoYXBlSGVscGVyLmhpdFBvbHlnb25EaXJ0eSkgc2hhcGVIZWxwZXIudHJhbnNmb3JtSGl0UG9seWdvbigpO1xyXG5cclxuICAgICAgICAgICAgLy8gcmV0dXJuIHBvbHlnb25CZXLDvGhydFBvbHlnb24odGhpcy5oaXRQb2x5Z29uVHJhbnNmb3JtZWQsIHNoYXBlSGVscGVyLmhpdFBvbHlnb25UcmFuc2Zvcm1lZCk7XHJcbiAgICAgICAgICAgIGlmIChwb2x5Z29uQmVyw7xocnRQb2x5Z29uRXhha3QodGhpcy5oaXRQb2x5Z29uVHJhbnNmb3JtZWQsIHNoYXBlSGVscGVyLmhpdFBvbHlnb25UcmFuc2Zvcm1lZCwgdHJ1ZSwgdHJ1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb2xsaWRlc1dpdGgoc2hhcGVIZWxwZXI6IFNoYXBlSGVscGVyKSB7XHJcblxyXG4gICAgICAgIC8vIGlmKCEodGhpcyBpbnN0YW5jZW9mIFR1cnRsZUhlbHBlcikgJiYgKHNoYXBlSGVscGVyIGluc3RhbmNlb2YgVHVydGxlSGVscGVyKSl7XHJcbiAgICAgICAgaWYgKHRoaXNbXCJsaW5lRWxlbWVudHNcIl0gPT0gbnVsbCAmJiAoc2hhcGVIZWxwZXJbXCJsaW5lRWxlbWVudHNcIl0gIT0gbnVsbCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHNoYXBlSGVscGVyLmNvbGxpZGVzV2l0aCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzaGFwZUhlbHBlcltcInNoYXBlc1wiXSkge1xyXG4gICAgICAgICAgICByZXR1cm4gc2hhcGVIZWxwZXIuY29sbGlkZXNXaXRoKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuZGlzcGxheU9iamVjdCA9PSBudWxsIHx8IHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcbiAgICAgICAgc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC51cGRhdGVUcmFuc2Zvcm0oKTtcclxuXHJcbiAgICAgICAgbGV0IGJiID0gdGhpcy5kaXNwbGF5T2JqZWN0LmdldEJvdW5kcygpO1xyXG4gICAgICAgIGxldCBiYjEgPSBzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LmdldEJvdW5kcygpO1xyXG5cclxuICAgICAgICBpZiAoYmIubGVmdCA+IGJiMS5yaWdodCB8fCBiYjEubGVmdCA+IGJiLnJpZ2h0KSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmIChiYi50b3AgPiBiYjEuYm90dG9tIHx8IGJiMS50b3AgPiBiYi5ib3R0b20pIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGl0UG9seWdvbkluaXRpYWwgPT0gbnVsbCB8fCBzaGFwZUhlbHBlci5oaXRQb2x5Z29uSW5pdGlhbCA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgLy8gYm91bmRpZyBib3hlcyBjb2xsaWRlLCBzbyBjaGVjayBmdXJ0aGVyOlxyXG4gICAgICAgIGlmICh0aGlzLmhpdFBvbHlnb25EaXJ0eSkgdGhpcy50cmFuc2Zvcm1IaXRQb2x5Z29uKCk7XHJcbiAgICAgICAgaWYgKHNoYXBlSGVscGVyLmhpdFBvbHlnb25EaXJ0eSkgc2hhcGVIZWxwZXIudHJhbnNmb3JtSGl0UG9seWdvbigpO1xyXG5cclxuICAgICAgICAvLyByZXR1cm4gcG9seWdvbkJlcsO8aHJ0UG9seWdvbih0aGlzLmhpdFBvbHlnb25UcmFuc2Zvcm1lZCwgc2hhcGVIZWxwZXIuaGl0UG9seWdvblRyYW5zZm9ybWVkKTtcclxuICAgICAgICByZXR1cm4gcG9seWdvbkJlcsO8aHJ0UG9seWdvbkV4YWt0KHRoaXMuaGl0UG9seWdvblRyYW5zZm9ybWVkLCBzaGFwZUhlbHBlci5oaXRQb2x5Z29uVHJhbnNmb3JtZWQsIHRydWUsIHRydWUpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBkaXJlY3Rpb25SZWxhdGl2ZVRvKHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciwgZGlyZWN0aW9uVHlwZTogRW51bSkge1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC51cGRhdGVUcmFuc2Zvcm0oKTtcclxuICAgICAgICBzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG5cclxuICAgICAgICBsZXQgYmIgPSB0aGlzLmRpc3BsYXlPYmplY3QuZ2V0Qm91bmRzKCk7XHJcbiAgICAgICAgbGV0IGJiMSA9IHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QuZ2V0Qm91bmRzKCk7XHJcblxyXG4gICAgICAgIGxldCBkeDEgPSBiYjEubGVmdCAtIGJiLnJpZ2h0OyAgLy8gcG9zaXRpdmUgaWYgbGVmdFxyXG4gICAgICAgIGxldCBkeDIgPSBiYi5sZWZ0IC0gYmIxLnJpZ2h0OyAgLy8gcG9zaXRpdmUgaWYgcmlnaHRcclxuXHJcbiAgICAgICAgbGV0IGR5MSA9IGJiMS50b3AgLSBiYi5ib3R0b207ICAvLyBwb3NpdGl2ZSBpZiB0b3BcclxuICAgICAgICBsZXQgZHkyID0gYmIudG9wIC0gYmIxLmJvdHRvbTsgIC8vIHBvc2l0aXZlIGlmIGJvdHRvbVxyXG5cclxuICAgICAgICBsZXQgZW51bWluZm8gPSBkaXJlY3Rpb25UeXBlLmVudW1JbmZvTGlzdDtcclxuICAgICAgICBsZXQgcGFpcnM6IHsgZGlzdGFuY2U6IG51bWJlciwgZWk6IEVudW1JbmZvIH1bXSA9IFtdO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5sYXN0TW92ZUR4ID4gMCkge1xyXG4gICAgICAgICAgICBwYWlycy5wdXNoKHsgZGlzdGFuY2U6IGR4MSwgZWk6IGVudW1pbmZvWzNdIH0pO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5sYXN0TW92ZUR4IDwgMCkge1xyXG4gICAgICAgICAgICBwYWlycy5wdXNoKHsgZGlzdGFuY2U6IGR4MiwgZWk6IGVudW1pbmZvWzFdIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMubGFzdE1vdmVEeSA+IDApIHtcclxuICAgICAgICAgICAgcGFpcnMucHVzaCh7IGRpc3RhbmNlOiBkeTEsIGVpOiBlbnVtaW5mb1swXSB9KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubGFzdE1vdmVEeSA8IDApIHtcclxuICAgICAgICAgICAgcGFpcnMucHVzaCh7IGRpc3RhbmNlOiBkeTIsIGVpOiBlbnVtaW5mb1syXSB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwYWlycy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICBwYWlycyA9IFtcclxuICAgICAgICAgICAgICAgIHsgZGlzdGFuY2U6IGR4MSwgZWk6IGVudW1pbmZvWzNdIH0sXHJcbiAgICAgICAgICAgICAgICB7IGRpc3RhbmNlOiBkeDIsIGVpOiBlbnVtaW5mb1sxXSB9LFxyXG4gICAgICAgICAgICAgICAgeyBkaXN0YW5jZTogZHkxLCBlaTogZW51bWluZm9bMF0gfSxcclxuICAgICAgICAgICAgICAgIHsgZGlzdGFuY2U6IGR5MiwgZWk6IGVudW1pbmZvWzJdIH1cclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGxldCBtYXggPSBwYWlyc1swXS5kaXN0YW5jZTtcclxuICAgICAgICBsZXQgZWkgPSBwYWlyc1swXS5laTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChwYWlyc1tpXS5kaXN0YW5jZSA+IG1heCkge1xyXG4gICAgICAgICAgICAgICAgbWF4ID0gcGFpcnNbaV0uZGlzdGFuY2U7XHJcbiAgICAgICAgICAgICAgICBlaSA9IHBhaXJzW2ldLmVpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZWkub2JqZWN0O1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBtb3ZlQmFja0Zyb20oc2gxOiBTaGFwZUhlbHBlciwga2VlcENvbGxpZGluZzogYm9vbGVhbikge1xyXG5cclxuICAgICAgICAvLyBzdWJzZXF1ZW50IGNhbGxzIHRvIG1vdmUgZGVzdHJveSB2YWx1ZXMgaW4gdGhpcy5sYXN0TW92ZUR4IGFuZCB0aGlzLmxhc3RNb3ZlRHksIHNvOlxyXG4gICAgICAgIGxldCBsbWR4ID0gdGhpcy5sYXN0TW92ZUR4O1xyXG4gICAgICAgIGxldCBsbWR5ID0gdGhpcy5sYXN0TW92ZUR5O1xyXG5cclxuICAgICAgICBsZXQgbGVuZ3RoID0gTWF0aC5zcXJ0KGxtZHggKiBsbWR4ICsgbG1keSAqIGxtZHkpO1xyXG4gICAgICAgIGlmIChsZW5ndGggPCAwLjAwMSkgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY29sbGlkZXNXaXRoKHNoMSkpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IHBhcmFtZXRlck1heCA9IDA7ICAgICAgIC8vIGNvbGxpc2lvbiB3aXRoIHRoaXMgcGFyYW1ldGVyXHJcbiAgICAgICAgdGhpcy5tb3ZlKC1sbWR4LCAtbG1keSk7XHJcblxyXG4gICAgICAgIGxldCBjdXJyZW50UGFyYW1ldGVyID0gLTE7ICAvLyBtb3ZlIHRvIHBhcmFtZXRlck1pblxyXG5cclxuICAgICAgICB3aGlsZSAodGhpcy5jb2xsaWRlc1dpdGgoc2gxKSkge1xyXG4gICAgICAgICAgICBwYXJhbWV0ZXJNYXggPSBjdXJyZW50UGFyYW1ldGVyOyAgICAvLyBjb2xsaXNpb24gYXQgdGhpcyBwYXJhbWV0ZXJcclxuICAgICAgICAgICAgbGV0IG5ld1BhcmFtZXRlciA9IGN1cnJlbnRQYXJhbWV0ZXIgKiAyO1xyXG4gICAgICAgICAgICB0aGlzLm1vdmUobG1keCAqIChuZXdQYXJhbWV0ZXIgLSBjdXJyZW50UGFyYW1ldGVyKSwgbG1keSAqIChuZXdQYXJhbWV0ZXIgLSBjdXJyZW50UGFyYW1ldGVyKSk7XHJcbiAgICAgICAgICAgIGN1cnJlbnRQYXJhbWV0ZXIgPSBuZXdQYXJhbWV0ZXI7XHJcbiAgICAgICAgICAgIGlmICgoY3VycmVudFBhcmFtZXRlciArIDEpICogbGVuZ3RoIDwgLTEwMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlKGxtZHggKiAoLTEgLSBjdXJyZW50UGFyYW1ldGVyKSwgbG1keSAqICgtMSAtIGN1cnJlbnRQYXJhbWV0ZXIpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgcGFyYW1ldGVyTWluID0gY3VycmVudFBhcmFtZXRlcjtcclxuXHJcbiAgICAgICAgbGV0IGlzQ29sbGlkaW5nOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgLy8gU2l0dWF0aW9uIG5vdzogbm8gY29sbGlzaW9uIGF0IHBhcmFtZXRlck1pbiA9PSBjdXJyZW50UGFyYW1ldGVyLCBjb2xsaXNpb24gYXQgcGFyYW1ldGVyTWF4XHJcbiAgICAgICAgd2hpbGUgKChwYXJhbWV0ZXJNYXggLSBwYXJhbWV0ZXJNaW4pICogbGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICBsZXQgbnAgPSAocGFyYW1ldGVyTWF4ICsgcGFyYW1ldGVyTWluKSAvIDI7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZShsbWR4ICogKG5wIC0gY3VycmVudFBhcmFtZXRlciksIGxtZHkgKiAobnAgLSBjdXJyZW50UGFyYW1ldGVyKSk7XHJcbiAgICAgICAgICAgIGlmIChpc0NvbGxpZGluZyA9IHRoaXMuY29sbGlkZXNXaXRoKHNoMSkpIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlck1heCA9IG5wO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyTWluID0gbnA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY3VycmVudFBhcmFtZXRlciA9IG5wO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGtlZXBDb2xsaWRpbmcgJiYgIWlzQ29sbGlkaW5nKSB7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZShsbWR4ICogKHBhcmFtZXRlck1heCAtIGN1cnJlbnRQYXJhbWV0ZXIpLCBsbWR5ICogKHBhcmFtZXRlck1heCAtIGN1cnJlbnRQYXJhbWV0ZXIpKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGlzQ29sbGlkaW5nICYmICFrZWVwQ29sbGlkaW5nKSB7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZShsbWR4ICogKHBhcmFtZXRlck1pbiAtIGN1cnJlbnRQYXJhbWV0ZXIpLCBsbWR5ICogKHBhcmFtZXRlck1pbiAtIGN1cnJlbnRQYXJhbWV0ZXIpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubGFzdE1vdmVEeCA9IGxtZHg7XHJcbiAgICAgICAgdGhpcy5sYXN0TW92ZUR5ID0gbG1keTtcclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIGNvbnRhaW5zUG9pbnQoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoIXRoaXMuZGlzcGxheU9iamVjdC5nZXRCb3VuZHMoKS5jb250YWlucyh4LCB5KSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5oaXRQb2x5Z29uSW5pdGlhbCA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGl0UG9seWdvbkRpcnR5KSB0aGlzLnRyYW5zZm9ybUhpdFBvbHlnb24oKTtcclxuICAgICAgICByZXR1cm4gcG9seWdvbkVudGjDpGx0UHVua3QodGhpcy5oaXRQb2x5Z29uVHJhbnNmb3JtZWQsIHsgeDogeCwgeTogeSB9KTtcclxuICAgIH1cclxuXHJcbiAgICB0cmFuc2Zvcm1IaXRQb2x5Z29uKCkge1xyXG4gICAgICAgIGxldCBwID0gbmV3IFBJWEkuUG9pbnQodGhpcy5jZW50ZXJYSW5pdGlhbCwgdGhpcy5jZW50ZXJZSW5pdGlhbCk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ud29ybGRUcmFuc2Zvcm0uYXBwbHkocCwgcCk7XHJcblxyXG4gICAgICAgIHRoaXMuaGl0UG9seWdvblRyYW5zZm9ybWVkID0gW107XHJcbiAgICAgICAgbGV0IG0gPSB0aGlzLmRpc3BsYXlPYmplY3QudHJhbnNmb3JtLndvcmxkVHJhbnNmb3JtO1xyXG4gICAgICAgIGZvciAobGV0IHAgb2YgdGhpcy5oaXRQb2x5Z29uSW5pdGlhbCkge1xyXG4gICAgICAgICAgICB0aGlzLmhpdFBvbHlnb25UcmFuc2Zvcm1lZC5wdXNoKHtcclxuICAgICAgICAgICAgICAgIHg6IChtLmEgKiBwLngpICsgKG0uYyAqIHAueSkgKyBtLnR4LFxyXG4gICAgICAgICAgICAgICAgeTogKG0uYiAqIHAueCkgKyAobS5kICogcC55KSArIG0udHlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc2V0SGl0UG9seWdvbkRpcnR5KGZhbHNlKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaXNPdXRzaWRlVmlldygpIHtcclxuICAgICAgICBsZXQgYm91bmRzID0gdGhpcy5kaXNwbGF5T2JqZWN0LmdldEJvdW5kcyh0cnVlKTtcclxuICAgICAgICBsZXQgd2ggPSB0aGlzLndvcmxkSGVscGVyO1xyXG4gICAgICAgIHJldHVybiBib3VuZHMucmlnaHQgPCB3aC5jdXJyZW50TGVmdCB8fCBib3VuZHMubGVmdCA+IHdoLmN1cnJlbnRMZWZ0ICsgd2guY3VycmVudFdpZHRoXHJcbiAgICAgICAgICAgIHx8IGJvdW5kcy5ib3R0b20gPCB3aC5jdXJyZW50VG9wIHx8IGJvdW5kcy50b3AgPiB3aC5jdXJyZW50VG9wICsgd2guY3VycmVudEhlaWdodDtcclxuICAgIH1cclxuXHJcbiAgICBkZWZpbmVDZW50ZXIoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgcCA9IG5ldyBQSVhJLlBvaW50KHgsIHkpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ud29ybGRUcmFuc2Zvcm0uYXBwbHlJbnZlcnNlKHAsIHApO1xyXG4gICAgICAgIHRoaXMuY2VudGVyWEluaXRpYWwgPSBwLng7XHJcbiAgICAgICAgdGhpcy5jZW50ZXJZSW5pdGlhbCA9IHAueTtcclxuICAgIH1cclxuXHJcbiAgICBkZWZpbmVDZW50ZXJSZWxhdGl2ZSh4OiBudW1iZXIsIHk6IG51bWJlcikge1xyXG4gICAgICAgIGxldCBib3VuZHMgPSB0aGlzLmRpc3BsYXlPYmplY3QuZ2V0Qm91bmRzKGZhbHNlKTtcclxuICAgICAgICB0aGlzLmRlZmluZUNlbnRlcihib3VuZHMubGVmdCArIGJvdW5kcy53aWR0aCAqIHgsIGJvdW5kcy50b3AgKyBib3VuZHMuaGVpZ2h0ICogeSk7XHJcbiAgICB9XHJcblxyXG4gICAgbW92ZShkeDogbnVtYmVyLCBkeTogbnVtYmVyKSB7XHJcblxyXG4gICAgICAgIGlmIChkeCAhPSAwIHx8IGR5ICE9IDApIHtcclxuICAgICAgICAgICAgdGhpcy5sYXN0TW92ZUR4ID0gZHg7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdE1vdmVEeSA9IGR5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLnRyYW5zbGF0ZShkeCwgZHkpO1xyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ub25DaGFuZ2UoKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcbiAgICAgICAgdGhpcy5zZXRIaXRQb2x5Z29uRGlydHkodHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZm9yd2FyZChkaXN0YW5jZTogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IGR4ID0gZGlzdGFuY2UgKiBNYXRoLmNvcyh0aGlzLmRpcmVjdGlvblJhZCk7XHJcbiAgICAgICAgbGV0IGR5ID0gLWRpc3RhbmNlICogTWF0aC5zaW4odGhpcy5kaXJlY3Rpb25SYWQpO1xyXG4gICAgICAgIHRoaXMubW92ZShkeCwgZHkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJvdGF0ZShhbmdsZUluRGVnOiBudW1iZXIsIGNYPzogbnVtYmVyLCBjWT86IG51bWJlcikge1xyXG5cclxuICAgICAgICBpZiAoY1ggPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgcCA9IG5ldyBQSVhJLlBvaW50KHRoaXMuY2VudGVyWEluaXRpYWwsIHRoaXMuY2VudGVyWUluaXRpYWwpO1xyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0uYXBwbHkocCwgcCk7XHJcbiAgICAgICAgICAgIGNYID0gcC54O1xyXG4gICAgICAgICAgICBjWSA9IHAueTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgcCA9IG5ldyBQSVhJLlBvaW50KGNYLCBjWSk7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC51cGRhdGVUcmFuc2Zvcm0oKTsgICAgICAgLy8gbmVjZXNzYXJ5IGlmIHdvcmxkIGNvb3JkaW5hdGUgc3lzdGVtIGlzIHNjYWxlZFxyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudHJhbnNmb3JtLndvcmxkVHJhbnNmb3JtLmFwcGx5SW52ZXJzZShwLCBwKTtcclxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLmFwcGx5KHAsIHApO1xyXG4gICAgICAgICAgICBjWCA9IHAueDtcclxuICAgICAgICAgICAgY1kgPSBwLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0udHJhbnNsYXRlKC1jWCwgLWNZKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0ucm90YXRlKC1hbmdsZUluRGVnIC8gMTgwICogTWF0aC5QSSk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLnRyYW5zbGF0ZShjWCwgY1kpO1xyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ub25DaGFuZ2UoKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcbiAgICAgICAgdGhpcy5zZXRIaXRQb2x5Z29uRGlydHkodHJ1ZSk7XHJcblxyXG4gICAgICAgIHRoaXMuYW5nbGUgKz0gYW5nbGVJbkRlZztcclxuICAgICAgICB0aGlzLmRpcmVjdGlvblJhZCArPSBhbmdsZUluRGVnIC8gMTgwICogTWF0aC5QSTtcclxuICAgIH1cclxuXHJcbiAgICBtaXJyb3JYWShzY2FsZVg6IG51bWJlciwgc2NhbGVZOiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgY1g6IG51bWJlciwgY1k6IG51bWJlcjtcclxuXHJcbiAgICAgICAgbGV0IHAgPSBuZXcgUElYSS5Qb2ludCh0aGlzLmNlbnRlclhJbml0aWFsLCB0aGlzLmNlbnRlcllJbml0aWFsKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0uYXBwbHkocCwgcCk7XHJcbiAgICAgICAgY1ggPSBwLng7XHJcbiAgICAgICAgY1kgPSBwLnk7XHJcblxyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS50cmFuc2xhdGUoLWNYLCAtY1kpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS5zY2FsZShzY2FsZVgsIHNjYWxlWSk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLnRyYW5zbGF0ZShjWCwgY1kpO1xyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ub25DaGFuZ2UoKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0SGl0UG9seWdvbkRpcnR5KHRydWUpO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgc2NhbGUoZmFjdG9yOiBudW1iZXIsIGNYPzogbnVtYmVyLCBjWT86IG51bWJlcikge1xyXG5cclxuICAgICAgICBpZiAoY1ggPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgcCA9IG5ldyBQSVhJLlBvaW50KHRoaXMuY2VudGVyWEluaXRpYWwsIHRoaXMuY2VudGVyWUluaXRpYWwpO1xyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0uYXBwbHkocCwgcCk7XHJcbiAgICAgICAgICAgIGNYID0gcC54O1xyXG4gICAgICAgICAgICBjWSA9IHAueTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgcCA9IG5ldyBQSVhJLlBvaW50KGNYLCBjWSk7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ud29ybGRUcmFuc2Zvcm0uYXBwbHlJbnZlcnNlKHAsIHApO1xyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0uYXBwbHkocCwgcCk7XHJcbiAgICAgICAgICAgIGNYID0gcC54O1xyXG4gICAgICAgICAgICBjWSA9IHAueTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS50cmFuc2xhdGUoLWNYLCAtY1kpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS5zY2FsZShmYWN0b3IsIGZhY3Rvcik7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLnRyYW5zbGF0ZShjWCwgY1kpO1xyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ub25DaGFuZ2UoKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0SGl0UG9seWdvbkRpcnR5KHRydWUpO1xyXG5cclxuICAgICAgICB0aGlzLnNjYWxlRmFjdG9yICo9IGZhY3RvcjtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldENlbnRlclgoKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgcCA9IG5ldyBQSVhJLlBvaW50KHRoaXMuY2VudGVyWEluaXRpYWwsIHRoaXMuY2VudGVyWUluaXRpYWwpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC51cGRhdGVUcmFuc2Zvcm0oKTtcclxuICAgICAgICAvLyB0aGlzLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0uYXBwbHkocCwgcCk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnRyYW5zZm9ybS53b3JsZFRyYW5zZm9ybS5hcHBseShwLCBwKTtcclxuICAgICAgICByZXR1cm4gcC54O1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRDZW50ZXJZKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHAgPSBuZXcgUElYSS5Qb2ludCh0aGlzLmNlbnRlclhJbml0aWFsLCB0aGlzLmNlbnRlcllJbml0aWFsKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnRyYW5zZm9ybS53b3JsZFRyYW5zZm9ybS5hcHBseShwLCBwKTtcclxuICAgICAgICByZXR1cm4gcC55O1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhYnN0cmFjdCByZW5kZXIoKTogdm9pZDtcclxuXHJcbiAgICBwdWJsaWMgZGVzdHJveSgpOiB2b2lkIHtcclxuICAgICAgICBzdXBlci5kZXN0cm95KCk7XHJcbiAgICAgICAgaWYgKHRoaXMuYmVsb25nc1RvR3JvdXAgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlbG9uZ3NUb0dyb3VwLnJlbW92ZSh0aGlzLnJ1bnRpbWVPYmplY3QpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCBpbmRleCA9IHRoaXMud29ybGRIZWxwZXIuc2hhcGVzLmluZGV4T2YodGhpcyk7XHJcbiAgICAgICAgICAgIGlmIChpbmRleCA+PSAwKSB0aGlzLndvcmxkSGVscGVyLnNoYXBlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGluZGV4MSA9IHRoaXMud29ybGRIZWxwZXIuc2hhcGVzTm90QWZmZWN0ZWRCeVdvcmxkVHJhbnNmb3Jtcy5pbmRleE9mKHRoaXMpO1xyXG4gICAgICAgIGlmIChpbmRleDEgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLndvcmxkSGVscGVyLnNoYXBlc05vdEFmZmVjdGVkQnlXb3JsZFRyYW5zZm9ybXMuc3BsaWNlKGluZGV4MSwgMSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRDb2xsaWRpbmdTaGFwZXMoZ3JvdXBIZWxwZXI6IEdyb3VwSGVscGVyLCBzaGFwZVR5cGU6IFR5cGUpOiBhbnkge1xyXG4gICAgICAgIGxldCBjb2xsaWRpbmdTaGFwZXM6IFZhbHVlW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBzaGFwZSBvZiBncm91cEhlbHBlci5zaGFwZXMpIHtcclxuICAgICAgICAgICAgbGV0IHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciA9IDxTaGFwZUhlbHBlcj5zaGFwZS5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgIGlmIChzaGFwZUhlbHBlci5jb2xsaWRlc1dpdGgodGhpcykpIHtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGluZ1NoYXBlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBzaGFwZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHNoYXBlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNvbGxpZGluZ1NoYXBlcztcclxuICAgIH1cclxuXHJcbiAgICBhYnN0cmFjdCBnZXRDb3B5KGtsYXNzOiBLbGFzcyk6IFJ1bnRpbWVPYmplY3Q7XHJcblxyXG4gICAgZ2V0SGl0UG9seWdvbih2ZWN0b3IyQ2xhc3M6IEtsYXNzKTogVmFsdWVbXSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhpdFBvbHlnb25EaXJ0eSkge1xyXG4gICAgICAgICAgICB0aGlzLnRyYW5zZm9ybUhpdFBvbHlnb24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCByZXQ6IFZhbHVlW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBwIG9mIHRoaXMuaGl0UG9seWdvblRyYW5zZm9ybWVkKSB7XHJcbiAgICAgICAgICAgIGxldCBybyA9IG5ldyBSdW50aW1lT2JqZWN0KHZlY3RvcjJDbGFzcyk7XHJcbiAgICAgICAgICAgIHJvLmF0dHJpYnV0ZXMgPSBbeyB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCB2YWx1ZTogcC54IH0sIHsgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgdmFsdWU6IHAueSB9XTtcclxuICAgICAgICAgICAgcmV0LnB1c2goeyB0eXBlOiB2ZWN0b3IyQ2xhc3MsIHZhbHVlOiBybyB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0U3RhdGljKGlzU3RhdGljOiBib29sZWFuKSB7XHJcbiAgICAgICAgbGV0IGxpc3QgPSB0aGlzLndvcmxkSGVscGVyLnNoYXBlc05vdEFmZmVjdGVkQnlXb3JsZFRyYW5zZm9ybXM7XHJcbiAgICAgICAgaWYgKGlzU3RhdGljKSB7XHJcbiAgICAgICAgICAgIGxpc3QucHVzaCh0aGlzKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgaW5kZXggPSBsaXN0LmluZGV4T2YodGhpcyk7XHJcbiAgICAgICAgICAgIGlmIChpbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBsaXN0LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0UGFyZW50R3JvdXAoKTogUnVudGltZU9iamVjdCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYmVsb25nc1RvR3JvdXA/LnJ1bnRpbWVPYmplY3QgfHwgbnVsbFxyXG4gICAgfVxyXG5cclxuXHJcblxyXG59XHJcbiJdfQ==