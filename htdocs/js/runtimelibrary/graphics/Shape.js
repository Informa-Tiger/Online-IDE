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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2hhcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1NoYXBlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFlLE1BQU0sK0JBQStCLENBQUM7QUFDOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUF1QixtQkFBbUIsRUFBWSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVMLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV6QyxPQUFPLEVBQVMsbUJBQW1CLEVBQXlCLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDMUgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBTS9DLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRS9ELE1BQU0sT0FBTyxVQUFXLFNBQVEsS0FBSztJQUVqQyxZQUFZLE1BQWM7UUFFdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsNkZBQTZGLENBQUMsQ0FBQztRQUV0SCxJQUFJLENBQUMsWUFBWSxDQUFRLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFFdkIsdURBQXVEO1FBQ3ZELElBQUksU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELElBQUksYUFBYSxHQUFlLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBRSxDQUFDO1FBQ3ZFLElBQUksY0FBYyxHQUFHLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTlDLElBQUksWUFBWSxHQUFVLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTlELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLG1CQUFtQixFQUN4RCxDQUFDLEtBQUssRUFBRSxFQUFFO1lBRU4sSUFBSSxHQUFHLEdBQWtCLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDdEMsSUFBSSxNQUFNLEdBQWdCLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFckQsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLGFBQWEsSUFBSSxJQUFJLEVBQUU7Z0JBQ3RFLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQixPQUFPO2FBQ1Y7WUFFRCxLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFFL0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBRXZELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsU0FBUyxFQUFFLG1CQUFtQixFQUMxRCxDQUFDLEtBQUssRUFBRSxFQUFFO1lBRU4sSUFBSSxHQUFHLEdBQWtCLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDdEMsSUFBSSxNQUFNLEdBQWdCLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDckQsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLGFBQWEsSUFBSSxJQUFJLEVBQUU7Z0JBQ3RFLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQixPQUFPO2FBQ1Y7WUFFRCxLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUV0QyxDQUFDLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLHNFQUFzRSxDQUFDLENBQUMsQ0FBQztRQUVuSCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsRUFDMUQsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUVOLElBQUksR0FBRyxHQUFrQixLQUFLLENBQUMsTUFBTSxDQUFDO1lBQ3RDLElBQUksTUFBTSxHQUFnQixHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELElBQUksTUFBTSxJQUFJLElBQUksSUFBSSxNQUFNLENBQUMsV0FBVyxJQUFJLE1BQU0sQ0FBQyxhQUFhLElBQUksSUFBSSxFQUFFO2dCQUN0RSxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztnQkFDaEIsT0FBTzthQUNWO1lBRUQsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFdEMsQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxzRUFBc0UsQ0FBQyxDQUFDLENBQUM7UUFFbkgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUM7UUFFdEMsZ0VBQWdFO1FBQ2hFLG1CQUFtQjtRQUVuQixpREFBaUQ7UUFDakQsZ0VBQWdFO1FBQ2hFLGdHQUFnRztRQUNoRyxrQ0FBa0M7UUFDbEMsc0JBQXNCO1FBQ3RCLFlBQVk7UUFFWiwyRUFBMkU7UUFFM0UscUNBQXFDO1FBQ3JDLGdDQUFnQztRQUVoQyxzQ0FBc0M7UUFDdEMscUNBQXFDO1FBQ3JDLGlEQUFpRDtRQUNqRCwrQkFBK0I7UUFDL0Isc0JBQXNCO1FBQ3RCLGdCQUFnQjtRQUNoQixtQkFBbUI7UUFDbkIsaUNBQWlDO1FBQ2pDLHNDQUFzQztRQUN0Qyw4Q0FBOEM7UUFDOUMsZ0JBQWdCO1FBQ2hCLFlBQVk7UUFFWix1RUFBdUU7UUFFdkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDaEQsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUN2RyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQzFHLENBQUMsRUFBRSxpQkFBaUIsRUFDakIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksRUFBRSxHQUFXLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDckMsSUFBSSxFQUFFLEdBQVcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNyQyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO2dCQUFFLE9BQU87WUFFckMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFcEIsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsaUZBQWlGLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVoSCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLGFBQWEsQ0FBQztZQUNsRCxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQy9HLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDNUcsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUMvRyxDQUFDLEVBQUUsaUJBQWlCLEVBQ2pCLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLENBQUMsR0FBa0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxJQUFJLFVBQVUsR0FBVyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzdDLElBQUksT0FBTyxHQUFXLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDMUMsSUFBSSxPQUFPLEdBQVcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMxQyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDO2dCQUFFLE9BQU87WUFFdkMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTVDLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHFGQUFxRixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFcEgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDbEQsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUNsSCxDQUFDLEVBQUUsaUJBQWlCLEVBQ2pCLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLENBQUMsR0FBa0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxJQUFJLFVBQVUsR0FBVyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzdDLElBQUksRUFBRSxHQUFnQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRS9DLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUM7Z0JBQUUsT0FBTztZQUV2QyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTFCLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLCtGQUErRixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFOUgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDakQsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUMzRyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQzVHLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7U0FDL0csQ0FBQyxFQUFFLGlCQUFpQixFQUNqQixDQUFDLFVBQVUsRUFBRSxFQUFFO1lBRVgsSUFBSSxDQUFDLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDM0MsSUFBSSxNQUFNLEdBQVcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUN6QyxJQUFJLE9BQU8sR0FBVyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzFDLElBQUksT0FBTyxHQUFXLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDMUMsSUFBSSxFQUFFLEdBQWdCLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0MsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztnQkFBRSxPQUFPO1lBRXRDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUV2QyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxnSEFBZ0gsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRS9JLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksYUFBYSxDQUFDO1lBQ2pELEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7U0FDOUcsQ0FBQyxFQUFFLGlCQUFpQixFQUNqQixDQUFDLFVBQVUsRUFBRSxFQUFFO1lBRVgsSUFBSSxDQUFDLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDM0MsSUFBSSxNQUFNLEdBQVcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUN6QyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO2dCQUFFLE9BQU87WUFFdEMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVyQixDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxrSEFBa0gsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRWpKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksYUFBYSxDQUFDLEVBQ3RELENBQUMsRUFBRSxpQkFBaUIsRUFDakIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksRUFBRSxHQUFnQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRS9DLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUM7Z0JBQUUsT0FBTztZQUV4QyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXZCLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLG9DQUFvQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFbkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxhQUFhLENBQUMsRUFDdEQsQ0FBQyxFQUFFLGlCQUFpQixFQUNqQixDQUFDLFVBQVUsRUFBRSxFQUFFO1lBRVgsSUFBSSxDQUFDLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDM0MsSUFBSSxFQUFFLEdBQWdCLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0MsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQztnQkFBRSxPQUFPO1lBRXhDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkIsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsb0NBQW9DLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVuRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLGVBQWUsRUFBRSxJQUFJLGFBQWEsQ0FBQyxFQUM1RCxDQUFDLEVBQUUsb0JBQW9CLEVBQ3BCLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLENBQUMsR0FBa0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDO2dCQUFFLE9BQU87WUFFOUMsT0FBTyxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFOUIsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsa0hBQWtILEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVqSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxJQUFJLGFBQWEsQ0FBQyxFQUN6RCxDQUFDLEVBQUUsbUJBQW1CLEVBQ25CLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLENBQUMsR0FBa0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDO2dCQUFFLE9BQU87WUFFM0MsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFM0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsMkpBQTJKLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUUxTCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxJQUFJLGFBQWEsQ0FBQyxFQUN6RCxDQUFDLEVBQUUsbUJBQW1CLEVBQ25CLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLENBQUMsR0FBa0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDO2dCQUFFLE9BQU87WUFFM0MsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFM0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsMkpBQTJKLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUUxTCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRSxJQUFJLGFBQWEsQ0FBQyxFQUN2RCxDQUFDLEVBQUUsbUJBQW1CLEVBQ25CLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLENBQUMsR0FBa0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDO2dCQUFFLE9BQU87WUFFekMsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDO1FBRXBCLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLDBMQUEwTCxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFek4sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxlQUFlLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDekQsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUN0RyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQ3pHLENBQUMsRUFBRSxvQkFBb0IsRUFDcEIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksQ0FBQyxHQUFXLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDcEMsSUFBSSxDQUFDLEdBQVcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNwQyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDO2dCQUFFLE9BQU87WUFFOUMsT0FBTyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVsQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSw4RUFBOEUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsY0FBYyxFQUFFLElBQUksYUFBYSxDQUFDO1lBQ3hELEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQy9GLENBQUMsRUFBRSxvQkFBb0IsRUFDcEIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksS0FBSyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBRS9DLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtnQkFDZixNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLGNBQWMsQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO2FBQy9HO1lBRUQsSUFBSSxFQUFFLEdBQWdCLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDL0MsSUFBSSxHQUFHLEdBQWdCLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFcEQsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQztnQkFBRSxPQUFPO1lBRTdDLElBQUksR0FBRyxDQUFDLFdBQVcsRUFBRTtnQkFDakIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLG1GQUFtRixDQUFDLENBQUM7Z0JBQy9ILE9BQU87YUFDVjtZQUVELE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVoQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSw2RkFBNkYsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTVILElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxhQUFhLENBQUMsRUFDbkUsQ0FBQyxFQUFFLG9CQUFvQixFQUNwQixDQUFDLFVBQVUsRUFBRSxFQUFFO1lBRVgsSUFBSSxDQUFDLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFFM0MsSUFBSSxFQUFFLEdBQWdCLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0MsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLHNCQUFzQixDQUFDO2dCQUFFLE9BQU87WUFFckQsT0FBTyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUVyQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxxR0FBcUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXBJLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsY0FBYyxFQUFFLElBQUksYUFBYSxDQUFDO1lBQ3hELEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQ2hHLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7U0FDdEgsQ0FBQyxFQUFFLGlCQUFpQixFQUNqQixDQUFDLFVBQVUsRUFBRSxFQUFFO1lBRVgsSUFBSSxDQUFDLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDM0MsSUFBSSxLQUFLLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDL0MsSUFBSSxhQUFhLEdBQVksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUVqRCxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7Z0JBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxjQUFjLENBQUMsb0VBQW9FLENBQUMsQ0FBQzthQUNySDtZQUVELElBQUksRUFBRSxHQUFnQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9DLElBQUksR0FBRyxHQUFnQixLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXBELElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUM7Z0JBQUUsT0FBTztZQUU3QyxJQUFJLEdBQUcsQ0FBQyxXQUFXLEVBQUU7Z0JBQ2pCLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxtRkFBbUYsQ0FBQyxDQUFDO2dCQUMvSCxPQUFPO2FBQ1Y7WUFFRCxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUV4QyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSx5TUFBeU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXhPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMscUJBQXFCLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDL0QsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7U0FDbkcsQ0FBQyxFQUFFLGFBQWEsRUFDYixDQUFDLFVBQVUsRUFBRSxFQUFFO1lBRVgsSUFBSSxDQUFDLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDM0MsSUFBSSxLQUFLLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFFL0MsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO2dCQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsY0FBYyxDQUFDLDJFQUEyRSxDQUFDLENBQUM7YUFDNUg7WUFFRCxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQyxJQUFJLEdBQUcsR0FBZ0IsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVwRCxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUM7Z0JBQUUsT0FBTztZQUVwRCxJQUFJLEdBQUcsQ0FBQyxXQUFXLEVBQUU7Z0JBQ2pCLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQywwRkFBMEYsQ0FBQyxDQUFDO2dCQUN0SSxPQUFPO2FBQ1Y7WUFFRCxPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFdEQsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUseUlBQXlJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUV4SyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLGFBQWEsQ0FBQztZQUNsRCxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQ3RHLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7U0FDekcsQ0FBQyxFQUFFLGlCQUFpQixFQUNqQixDQUFDLFVBQVUsRUFBRSxFQUFFO1lBRVgsSUFBSSxDQUFDLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDM0MsSUFBSSxFQUFFLEdBQWdCLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLEdBQVcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNwQyxJQUFJLENBQUMsR0FBVyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBRXBDLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUM7Z0JBQUUsT0FBTztZQUV2QyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRXRELENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHVHQUF1RyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFdEksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxjQUFjLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDeEQsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUN0RyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQ3pHLENBQUMsRUFBRSxpQkFBaUIsRUFDakIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksRUFBRSxHQUFnQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxHQUFXLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDcEMsSUFBSSxDQUFDLEdBQVcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUVwQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDO2dCQUFFLE9BQU87WUFFN0MsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFMUIsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsK0xBQStMLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU5TixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLHNCQUFzQixFQUFFLElBQUksYUFBYSxDQUFDO1lBQ2hFLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDekcsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUM1RyxDQUFDLEVBQUUsaUJBQWlCLEVBQ2pCLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLENBQUMsR0FBa0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQyxJQUFJLENBQUMsR0FBVyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxHQUFXLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFFcEMsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLHNCQUFzQixDQUFDO2dCQUFFLE9BQU87WUFFckQsRUFBRSxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVsQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSx5ZkFBeWYsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXhoQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRSxJQUFJLGFBQWEsQ0FBQztZQUNwRCxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQ2hILENBQUMsRUFBRSxpQkFBaUIsRUFDakIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksRUFBRSxHQUFnQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9DLElBQUksUUFBUSxHQUFXLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFFM0MsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQztnQkFBRSxPQUFPO1lBRXpDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSw0Q0FBNEMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTNFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDaEUsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUNuSCxDQUFDLEVBQUUsaUJBQWlCLEVBQ2pCLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLFVBQVUsR0FBWSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBRTlDLG1CQUFtQixDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXpELENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLHFKQUFxSixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFHbkwsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDdEQsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUNoSCxDQUFDLEVBQUUsaUJBQWlCLEVBQ2pCLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLENBQUMsR0FBa0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQyxJQUFJLE9BQU8sR0FBWSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBRTNDLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUM7Z0JBQUUsT0FBTztZQUUzQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTNCLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHVGQUF1RixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFdEgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDckQsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUNqSCxDQUFDLEVBQUUsaUJBQWlCLEVBQ2pCLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLENBQUMsR0FBa0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQyxJQUFJLFFBQVEsR0FBWSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBRTVDLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUM7Z0JBQUUsT0FBTztZQUUxQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTNCLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLDRIQUE0SCxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFM0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxjQUFjLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDeEQsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUN0RyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQ3pHLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsaUJBQWlCO1FBQy9DLEtBQUssRUFBRSxLQUFLLEVBQUUsc0VBQXNFLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVsRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLGNBQWMsRUFBRSxJQUFJLGFBQWEsQ0FBQztZQUN4RCxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQ3RHLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7U0FDekcsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxpQkFBaUI7UUFDL0MsS0FBSyxFQUFFLEtBQUssRUFBRSxzRUFBc0UsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRWxHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsYUFBYSxFQUFFLElBQUksYUFBYSxDQUFDO1lBQ3ZELEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDdEcsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUN0RyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQ3hHLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsaUJBQWlCO1FBQy9DLEtBQUssRUFBRSxLQUFLLEVBQUUsc0hBQXNILEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVsSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLGFBQWEsQ0FBQztZQUNyRCxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQ3RHLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDdEcsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUN4RyxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLGlCQUFpQjtRQUMvQyxLQUFLLEVBQUUsS0FBSyxFQUFFLDZHQUE2RyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFekksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxhQUFhLEVBQUUsSUFBSSxhQUFhLENBQUM7WUFDdkQsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUN0RyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQ3pHLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsaUJBQWlCO1FBQy9DLEtBQUssRUFBRSxLQUFLLEVBQUUsK0VBQStFLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUUzRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLGFBQWEsQ0FBQztZQUNoRCxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7U0FDekgsQ0FBQyxFQUFFLGlCQUFpQixFQUNqQixDQUFDLFVBQVUsRUFBRSxFQUFFO1lBRVgsSUFBSSxDQUFDLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDM0MsSUFBSSxLQUFLLEdBQVcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUN4QyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO2dCQUFFLE9BQU87WUFFckMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuQixDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxzRUFBc0UsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXJHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksYUFBYSxDQUFDO1lBQ2hELEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7U0FDL0csQ0FBQyxFQUFFLGlCQUFpQixFQUNqQixDQUFDLFVBQVUsRUFBRSxFQUFFO1lBRVgsSUFBSSxDQUFDLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDM0MsSUFBSSxLQUFLLEdBQVcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUN4QyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO2dCQUFFLE9BQU87WUFFckMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuQixDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxxS0FBcUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXBNLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxhQUFhLENBQUMsRUFDOUUsQ0FBQyxFQUFFLGlCQUFpQixFQUNqQixDQUFDLFVBQVUsRUFBRSxFQUFFO1lBRVgsSUFBSSxDQUFDLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDM0MsSUFBSSxFQUFFLEdBQWdCLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0MsRUFBRSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFFN0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsdU9BQXVPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUV0USxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLGdDQUFnQyxFQUFFLElBQUksYUFBYSxDQUFDLEVBQzdFLENBQUMsRUFBRSxpQkFBaUIsRUFDakIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksRUFBRSxHQUFnQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRS9DLEVBQUUsQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO1FBRTlCLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLCtPQUErTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFOVEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxpQ0FBaUMsRUFBRSxJQUFJLGFBQWEsQ0FBQztZQUMzRSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQzlHLENBQUMsRUFBRSxpQkFBaUIsRUFDakIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksS0FBSyxHQUFZLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDekMsSUFBSSxFQUFFLEdBQWdCLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0MsRUFBRSxDQUFDLCtCQUErQixHQUFHLEtBQUssQ0FBQztRQUUvQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSx5R0FBeUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXhJLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksYUFBYSxDQUFDO1lBQ2hELEVBQUUsVUFBVSxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUN6SCxDQUFDLEVBQUUsaUJBQWlCLEVBQ2pCLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLENBQUMsR0FBa0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxJQUFJLEtBQUssR0FBVyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ3hDLElBQUksRUFBRSxHQUFnQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRS9DLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7Z0JBQUUsT0FBTztZQUVyQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRW5CLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHNFQUFzRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFckcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLGFBQWEsQ0FBQztZQUMzRCxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQ2xILENBQUMsRUFBRSxpQkFBaUIsRUFDakIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksU0FBUyxHQUFXLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDNUMsSUFBSSxFQUFFLEdBQWdCLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0MsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDO2dCQUFFLE9BQU87WUFFaEQsRUFBRSxDQUFDLFlBQVksR0FBRyxTQUFTLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7UUFFaEQsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsZ01BQWdNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUUvTixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLGFBQWEsQ0FBQztZQUNuRCxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQ2hILENBQUMsRUFBRSxpQkFBaUIsRUFDakIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksUUFBUSxHQUFXLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDM0MsSUFBSSxFQUFFLEdBQWdCLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0MsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQztnQkFBRSxPQUFPO1lBRXhDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFekIsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsb0pBQW9KLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVuTCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLGFBQWEsQ0FBQyxFQUNuRCxDQUFDLEVBQUUsSUFBSSxFQUNKLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFFWCxJQUFJLENBQUMsR0FBa0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxJQUFJLEVBQUUsR0FBZ0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO2dCQUFFLE9BQU87WUFFckMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV0QyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSwyREFBMkQsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBR3pGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsY0FBYyxFQUFFLElBQUksYUFBYSxDQUFDLEVBQzNELENBQUMsRUFBRSxpQkFBaUIsRUFDakIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksRUFBRSxHQUFnQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRS9DLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUM7Z0JBQUUsT0FBTztZQUU3QyxPQUFPLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUU3QixDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSwwQ0FBMEMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXpFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFLElBQUksYUFBYSxDQUFDLEVBQ3pELENBQUMsRUFBRSxpQkFBaUIsRUFDakIsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksRUFBRSxHQUFnQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRS9DLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUM7Z0JBQUUsT0FBTztZQUUzQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUUzQixDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSw2Q0FBNkMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTVFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsZUFBZSxFQUFFLElBQUksYUFBYSxDQUFDLEVBQzVELENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFDM0IsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNDLElBQUksRUFBRSxHQUFnQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRS9DLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUM7Z0JBQUUsT0FBTztZQUU5QyxPQUFPLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFMUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsbUxBQW1MLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUV0TixDQUFDO0NBRUo7QUFFRCxNQUFNLE9BQWdCLFdBQVksU0FBUSxXQUFXO0lBaURqRCxZQUFZLFdBQXdCLEVBQUUsYUFBNEI7UUFFOUQsS0FBSyxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQztRQTFDdEMsVUFBSyxHQUFXLENBQUMsQ0FBQztRQUVsQixzQkFBaUIsR0FBWSxJQUFJLENBQUM7UUFDbEMsMEJBQXFCLEdBQVksSUFBSSxDQUFDO1FBQ3RDLG9CQUFlLEdBQUcsSUFBSSxDQUFDO1FBRXZCLG9DQUErQixHQUFZLEtBQUssQ0FBQztRQUVqRCw4QkFBeUIsR0FBWSxLQUFLLENBQUM7UUFFM0MsbUJBQWMsR0FBWSxLQUFLLENBQUM7UUFFaEMsZ0JBQVcsR0FBVyxHQUFHLENBQUM7UUFFMUIsaUJBQVksR0FBVyxDQUFDLENBQUM7UUFFekIsZUFBVSxHQUFXLENBQUMsQ0FBQztRQUN2QixlQUFVLEdBQVcsQ0FBQyxDQUFDO1FBMkJuQixJQUFJLGFBQWEsR0FBRztZQUNoQixFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLHVCQUF1QixFQUFFO1lBQzdELEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsdUJBQXVCLEVBQUU7WUFDL0QsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRTtZQUMxRCxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFO1lBQzNELEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUU7U0FDOUQsQ0FBQztRQUVGLElBQUksRUFBRSxHQUEyQixJQUFJLENBQUM7UUFFdEMsS0FBSyxJQUFJLEVBQUUsSUFBSSxhQUFhLEVBQUU7WUFDMUIsSUFBSSxNQUFNLEdBQW1CLGFBQWEsQ0FBQyxLQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTVHLElBQUksQ0FBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsT0FBTyxLQUFJLElBQUksSUFBSSxDQUFBLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxNQUFNLEtBQUksSUFBSSxFQUFFO2dCQUVuRCxJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUU7b0JBQ1osRUFBRSxHQUFHO3dCQUNELFdBQVcsRUFBRSxJQUFJO3dCQUNqQixLQUFLLEVBQUUsRUFBRTt3QkFDVCxPQUFPLEVBQUUsRUFBRTtxQkFDZCxDQUFDO29CQUNGLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUNqRDtnQkFFRCxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzdDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQzthQUVwRDtTQUNKO1FBRUQsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksSUFBSSxJQUFJLEVBQUU7WUFDdkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3RDO0lBR0wsQ0FBQztJQTVERCxRQUFRLENBQUMsV0FBd0I7UUFFN0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxXQUFXLENBQUMsY0FBYyxDQUFDO1FBQ2pELElBQUksQ0FBQyxjQUFjLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQztRQUVqRCxJQUFJLFdBQVcsQ0FBQyxpQkFBaUIsSUFBSSxJQUFJLEVBQUU7WUFDdkMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztZQUM1QixLQUFLLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxpQkFBaUI7Z0JBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2xHO1FBRUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTlCLElBQUksQ0FBQyxlQUFlLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBQztRQUNuRCxJQUFJLENBQUMsK0JBQStCLEdBQUcsV0FBVyxDQUFDLCtCQUErQixDQUFDO1FBQ25GLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxXQUFXLENBQUMseUJBQXlCLENBQUM7UUFFdkUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQy9GLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLENBQUM7SUFFekMsQ0FBQztJQTJDRCxrQkFBa0IsQ0FBQyxLQUFjO1FBQzdCLElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO0lBQ2pDLENBQUM7SUFFRCwyQkFBMkI7UUFDdkIsSUFBSSxTQUFTLEdBQW1DLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1FBQzFFLElBQUksWUFBWSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNqRCxJQUFJLEtBQUssR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN4RCxJQUFJLEtBQUssR0FBRyxZQUFZLEVBQUU7WUFDdEIsU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztTQUMxRDtJQUNMLENBQUM7SUFFRCwwQkFBMEI7UUFDdEIsSUFBSSxTQUFTLEdBQW1DLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1FBQzFFLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3hELElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtZQUNYLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDMUQ7SUFDTCxDQUFDO0lBRUQsWUFBWTtRQUNSLElBQUksU0FBUyxHQUFtQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztRQUMxRSxJQUFJLFlBQVksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFFakQsSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksRUFBRTtZQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDekQ7YUFBTTtZQUNILFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQztTQUM3RDtJQUNMLENBQUM7SUFFRCxVQUFVO1FBQ04sSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksRUFBRTtZQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDOUM7YUFBTTtZQUNILElBQUksU0FBUyxHQUFtQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztZQUMxRSxTQUFTLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDbEQ7SUFDTCxDQUFDO0lBRUQsd0NBQXdDO1FBRXBDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxHQUFHLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDO1FBRW5FLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLElBQUksSUFBSSxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQztZQUNqRCxJQUFJLFdBQVcsR0FBZ0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUM7WUFDN0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDdkM7SUFDTCxDQUFDO0lBRUQsSUFBSSxDQUFDLEtBQXNCO1FBQ3ZCLElBQUksQ0FBUyxDQUFDO1FBQ2QsSUFBSSxPQUFPLEtBQUssSUFBSSxRQUFRLEVBQUU7WUFDMUIsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUM7U0FDbkQ7YUFBTTtZQUNILENBQUMsR0FBRyxLQUFLLENBQUM7U0FDYjtRQUNELFlBQVk7UUFDWixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFO1lBQ3pCLFlBQVk7WUFDWixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7U0FDL0I7UUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDbEIsQ0FBQztJQUVELFVBQVUsQ0FBQyxPQUFnQjtRQUV2QixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDekMsQ0FBQztJQUVELG9CQUFvQjtRQUNoQixJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3JDLElBQUksSUFBSSxDQUFDLGVBQWU7WUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUVyRCxLQUFLLElBQUksV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFO1lBQzdDLElBQUksSUFBSSxJQUFJLFdBQVc7Z0JBQUUsU0FBUztZQUVsQyxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ2hELElBQUksV0FBVyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDaEMsT0FBTyxJQUFJLENBQUM7aUJBQ2Y7cUJBQU07b0JBQ0gsU0FBUztpQkFDWjthQUNKO1lBRUQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ2hCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRTtvQkFDaEMsT0FBTyxJQUFJLENBQUM7aUJBQ2Y7cUJBQU07b0JBQ0gsU0FBUztpQkFDWjthQUNKO1lBRUQsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4QyxJQUFJLEdBQUcsR0FBRyxXQUFXLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBRWhELElBQUksRUFBRSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLEtBQUs7Z0JBQUUsU0FBUztZQUV6RCxJQUFJLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxNQUFNO2dCQUFFLFNBQVM7WUFFekQsMkNBQTJDO1lBQzNDLElBQUksV0FBVyxDQUFDLGVBQWU7Z0JBQUUsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFFbkUsK0ZBQStGO1lBQy9GLElBQUksMEJBQTBCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLFdBQVcsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZHLE9BQU8sSUFBSSxDQUFDO2FBQ2Y7U0FFSjtRQUVELE9BQU8sS0FBSyxDQUFDO0lBRWpCLENBQUM7SUFFRCxZQUFZLENBQUMsV0FBd0I7UUFFakMsZ0ZBQWdGO1FBQ2hGLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRTtZQUN2RSxPQUFPLFdBQVcsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekM7UUFFRCxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN2QixPQUFPLFdBQVcsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekM7UUFFRCxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxJQUFJLFdBQVcsQ0FBQyxhQUFhLElBQUksSUFBSTtZQUFFLE9BQU87UUFFNUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUNyQyxXQUFXLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRTVDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDeEMsSUFBSSxHQUFHLEdBQUcsV0FBVyxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVoRCxJQUFJLEVBQUUsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxLQUFLO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFN0QsSUFBSSxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsTUFBTTtZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRTdELElBQUksSUFBSSxDQUFDLGlCQUFpQixJQUFJLElBQUksSUFBSSxXQUFXLENBQUMsaUJBQWlCLElBQUksSUFBSTtZQUFFLE9BQU8sSUFBSSxDQUFDO1FBRXpGLDJDQUEyQztRQUMzQyxJQUFJLElBQUksQ0FBQyxlQUFlO1lBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDckQsSUFBSSxXQUFXLENBQUMsZUFBZTtZQUFFLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBRW5FLCtGQUErRjtRQUMvRixPQUFPLDBCQUEwQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxXQUFXLENBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRWpILENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxXQUF3QixFQUFFLGFBQW1CO1FBQzdELElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDckMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUU1QyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3hDLElBQUksR0FBRyxHQUFHLFdBQVcsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFaEQsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUUsbUJBQW1CO1FBQ25ELElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFFLG9CQUFvQjtRQUVwRCxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBRSxrQkFBa0I7UUFDbEQsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUUscUJBQXFCO1FBRXJELElBQUksUUFBUSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUM7UUFDMUMsSUFBSSxLQUFLLEdBQXlDLEVBQUUsQ0FBQztRQUVyRCxJQUFJLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFO1lBQ3JCLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2xEO2FBQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRTtZQUM1QixLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNsRDtRQUVELElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUU7WUFDckIsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDbEQ7YUFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFO1lBQzVCLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2xEO1FBRUQsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUNuQixLQUFLLEdBQUc7Z0JBQ0osRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2xDLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNsQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDbEMsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUU7YUFDckMsQ0FBQTtTQUNKO1FBR0QsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUM1QixJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3JCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ25DLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxHQUFHLEVBQUU7Z0JBQ3pCLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUN4QixFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzthQUNwQjtTQUNKO1FBRUQsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDO0lBQ3JCLENBQUM7SUFHRCxZQUFZLENBQUMsR0FBZ0IsRUFBRSxhQUFzQjtRQUVqRCxzRkFBc0Y7UUFDdEYsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUMzQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBRTNCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDbEQsSUFBSSxNQUFNLEdBQUcsS0FBSztZQUFFLE9BQU87UUFFM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDO1lBQUUsT0FBTztRQUVwQyxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBTyxnQ0FBZ0M7UUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXhCLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBRSx1QkFBdUI7UUFFbkQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzNCLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQyxDQUFJLDhCQUE4QjtZQUNsRSxJQUFJLFlBQVksR0FBRyxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7WUFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1lBQzlGLGdCQUFnQixHQUFHLFlBQVksQ0FBQztZQUNoQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFO2dCQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUMxRSxPQUFPO2FBQ1Y7U0FDSjtRQUNELElBQUksWUFBWSxHQUFHLGdCQUFnQixDQUFDO1FBRXBDLElBQUksV0FBVyxHQUFZLEtBQUssQ0FBQztRQUNqQyw2RkFBNkY7UUFDN0YsT0FBTyxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQy9DLElBQUksRUFBRSxHQUFHLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDMUUsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdEMsWUFBWSxHQUFHLEVBQUUsQ0FBQzthQUNyQjtpQkFBTTtnQkFDSCxZQUFZLEdBQUcsRUFBRSxDQUFDO2FBQ3JCO1lBQ0QsZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO1NBQ3pCO1FBRUQsSUFBSSxhQUFhLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1NBQ2pHO2FBQU0sSUFBSSxXQUFXLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1NBQ2pHO1FBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDM0IsQ0FBQztJQUlELGFBQWEsQ0FBQyxDQUFTLEVBQUUsQ0FBUztRQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRWpFLElBQUksSUFBSSxDQUFDLGlCQUFpQixJQUFJLElBQUk7WUFBRSxPQUFPLElBQUksQ0FBQztRQUVoRCxJQUFJLElBQUksQ0FBQyxlQUFlO1lBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDckQsT0FBTyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFFRCxtQkFBbUI7UUFDZixJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUNyQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV4RCxJQUFJLENBQUMscUJBQXFCLEdBQUcsRUFBRSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztRQUNwRCxLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtZQUNsQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO2dCQUM1QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO2dCQUNuQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO2FBQ3RDLENBQUMsQ0FBQztTQUNOO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRW5DLENBQUM7SUFFRCxhQUFhO1FBQ1QsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEQsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUMxQixPQUFPLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsSUFBSSxNQUFNLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDLFlBQVk7ZUFDL0UsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsVUFBVSxJQUFJLE1BQU0sQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDO0lBQzFGLENBQUM7SUFFRCxZQUFZLENBQUMsQ0FBUyxFQUFFLENBQVM7UUFDN0IsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxDQUFTLEVBQUUsQ0FBUztRQUNyQyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFRCxJQUFJLENBQUMsRUFBVSxFQUFFLEVBQVU7UUFFdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7U0FDeEI7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELFlBQVk7UUFDWixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsT0FBTyxDQUFDLFFBQWdCO1FBQ3BCLElBQUksRUFBRSxHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNoRCxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQWtCLEVBQUUsRUFBVyxFQUFFLEVBQVc7UUFFL0MsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ1osSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDVCxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNaO2FBQU07WUFDSCxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQy9CLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBTyxpREFBaUQ7WUFDN0YsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDL0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5QyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNULEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1o7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELFlBQVk7UUFDWixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU5QixJQUFJLENBQUMsS0FBSyxJQUFJLFVBQVUsQ0FBQztRQUN6QixJQUFJLENBQUMsWUFBWSxJQUFJLFVBQVUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNwRCxDQUFDO0lBRUQsUUFBUSxDQUFDLE1BQWMsRUFBRSxNQUFjO1FBQ25DLElBQUksRUFBVSxFQUFFLEVBQVUsQ0FBQztRQUUzQixJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5QyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNULEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRVQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELFlBQVk7UUFDWixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRXJDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVsQyxDQUFDO0lBR0QsS0FBSyxDQUFDLE1BQWMsRUFBRSxFQUFXLEVBQUUsRUFBVztRQUUxQyxJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDWixJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDakUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5QyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNULEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1o7YUFBTTtZQUNILElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDL0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5QyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNULEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1o7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEQsWUFBWTtRQUNaLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFckMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTlCLElBQUksQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDO0lBRS9CLENBQUM7SUFFTSxVQUFVO1FBQ2IsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDckMsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNmLENBQUM7SUFFTSxVQUFVO1FBQ2IsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEQsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2YsQ0FBQztJQUlNLE9BQU87UUFDVixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksRUFBRTtZQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDbEQ7YUFBTTtZQUNILElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsRCxJQUFJLEtBQUssSUFBSSxDQUFDO2dCQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDNUQ7UUFFRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGtDQUFrQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvRSxJQUFJLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDYixJQUFJLENBQUMsV0FBVyxDQUFDLGtDQUFrQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDekU7SUFFTCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsV0FBd0IsRUFBRSxTQUFlO1FBQ3hELElBQUksZUFBZSxHQUFZLEVBQUUsQ0FBQztRQUNsQyxLQUFLLElBQUksS0FBSyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUU7WUFDbEMsSUFBSSxXQUFXLEdBQTZCLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDekUsSUFBSSxXQUFXLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNoQyxlQUFlLENBQUMsSUFBSSxDQUFDO29CQUNqQixJQUFJLEVBQUUsU0FBUztvQkFDZixLQUFLLEVBQUUsS0FBSztpQkFDZixDQUFDLENBQUM7YUFDTjtTQUNKO1FBRUQsT0FBTyxlQUFlLENBQUM7SUFDM0IsQ0FBQztJQUlELGFBQWEsQ0FBQyxZQUFtQjtRQUU3QixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7WUFDdEIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7U0FDOUI7UUFFRCxJQUFJLEdBQUcsR0FBWSxFQUFFLENBQUM7UUFDdEIsS0FBSyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUU7WUFDdEMsSUFBSSxFQUFFLEdBQUcsSUFBSSxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDekMsRUFBRSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQy9DO1FBRUQsT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDO0lBRUQsU0FBUyxDQUFDLFFBQWlCO1FBQ3ZCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsa0NBQWtDLENBQUM7UUFDL0QsSUFBSSxRQUFRLEVBQUU7WUFDVixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ25CO2FBQU07WUFDSCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9CLElBQUksS0FBSyxJQUFJLENBQUMsRUFBRTtnQkFDWixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQzthQUN6QjtTQUNKO0lBQ0wsQ0FBQztJQUVELGNBQWM7O1FBQ1YsT0FBTyxDQUFBLE1BQUEsSUFBSSxDQUFDLGNBQWMsMENBQUUsYUFBYSxLQUFJLElBQUksQ0FBQTtJQUNyRCxDQUFDO0NBSUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBLbGFzcywgVmlzaWJpbGl0eSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBNZXRob2QsIFBhcmFtZXRlcmxpc3QsIEF0dHJpYnV0ZSwgVmFsdWUsIFR5cGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgaW50UHJpbWl0aXZlVHlwZSwgZG91YmxlUHJpbWl0aXZlVHlwZSwgdm9pZFByaW1pdGl2ZVR5cGUsIGJvb2xlYW5QcmltaXRpdmVUeXBlLCBEb3VibGVQcmltaXRpdmVUeXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlLCBudWxsVHlwZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBSdW50aW1lT2JqZWN0IH0gZnJvbSBcIi4uLy4uL2ludGVycHJldGVyL1J1bnRpbWVPYmplY3QuanNcIjtcclxuaW1wb3J0IHsgQXJyYXlUeXBlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL0FycmF5LmpzXCI7XHJcbmltcG9ydCB7IEFjdG9ySGVscGVyIH0gZnJvbSBcIi4vQWN0b3IuanNcIjtcclxuaW1wb3J0IHsgV29ybGRIZWxwZXIsIE1vdXNlTGlzdGVuZXJTaGFwZURhdGEgfSBmcm9tIFwiLi9Xb3JsZC5qc1wiO1xyXG5pbXBvcnQgeyBQdW5rdCwgcG9seWdvbkVudGjDpGx0UHVua3QsIHBvbHlnb25CZXLDvGhydFBvbHlnb24sIHBvbHlnb25CZXLDvGhydFBvbHlnb25FeGFrdCB9IGZyb20gXCIuLi8uLi90b29scy9NYXRoZVRvb2xzLmpzXCI7XHJcbmltcG9ydCB7IENvbG9ySGVscGVyIH0gZnJvbSBcIi4vQ29sb3JIZWxwZXIuanNcIjtcclxuaW1wb3J0IHsgSW50ZXJwcmV0ZXIgfSBmcm9tIFwiLi4vLi4vaW50ZXJwcmV0ZXIvSW50ZXJwcmV0ZXIuanNcIjtcclxuaW1wb3J0IHsgR3JvdXBIZWxwZXIsIEdyb3VwQ2xhc3MgfSBmcm9tIFwiLi9Hcm91cC5qc1wiO1xyXG5pbXBvcnQgeyBDaXJjbGVIZWxwZXIgfSBmcm9tIFwiLi9DaXJjbGUuanNcIjtcclxuaW1wb3J0IHsgVHVydGxlSGVscGVyIH0gZnJvbSBcIi4vVHVydGxlLmpzXCI7XHJcbmltcG9ydCB7IEVudW0sIEVudW1JbmZvIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL0VudW0uanNcIjtcclxuaW1wb3J0IHsgRmlsbGVkU2hhcGVEZWZhdWx0cyB9IGZyb20gXCIuL0ZpbGxlZFNoYXBlRGVmYXVsdHMuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTaGFwZUNsYXNzIGV4dGVuZHMgS2xhc3Mge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG1vZHVsZTogTW9kdWxlKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKFwiU2hhcGVcIiwgbW9kdWxlLCBcIkJhc2lza2xhc3NlIGbDvHIgYWxsZSBncmFwaGlzY2hlbiBPYmpla3RlIGRpZSB2ZXJzY2hvYmVuLCBza2FsaWVydCB1bmQgZ2VkcmVodCB3ZXJkZW4ga8O2bm5lblwiKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRCYXNlQ2xhc3MoPEtsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIkFjdG9yXCIpKTtcclxuICAgICAgICB0aGlzLmlzQWJzdHJhY3QgPSB0cnVlO1xyXG5cclxuICAgICAgICAvLyBsZXQgbWF0cml4VHlwZSA9IG5ldyBBcnJheVR5cGUoZG91YmxlUHJpbWl0aXZlVHlwZSk7XHJcbiAgICAgICAgbGV0IHNoYXBlVHlwZSA9IG1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlNoYXBlXCIpO1xyXG4gICAgICAgIGxldCBkaXJlY3Rpb25UeXBlID0gPEVudW0+KDxhbnk+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiRGlyZWN0aW9uXCIpKTtcclxuICAgICAgICBsZXQgc2hhcGVBcnJheVR5cGUgPSBuZXcgQXJyYXlUeXBlKHNoYXBlVHlwZSk7XHJcblxyXG4gICAgICAgIGxldCB2ZWN0b3IyQ2xhc3MgPSA8S2xhc3M+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiVmVjdG9yMlwiKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRBdHRyaWJ1dGUobmV3IEF0dHJpYnV0ZShcImFuZ2xlXCIsIGRvdWJsZVByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICh2YWx1ZSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBydG86IFJ1bnRpbWVPYmplY3QgPSB2YWx1ZS5vYmplY3Q7XHJcbiAgICAgICAgICAgICAgICBsZXQgaGVscGVyOiBTaGFwZUhlbHBlciA9IHJ0by5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGhlbHBlciA9PSBudWxsIHx8IGhlbHBlci5pc0Rlc3Ryb3llZCB8fCBoZWxwZXIuZGlzcGxheU9iamVjdCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUudmFsdWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IGhlbHBlci5hbmdsZTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBWaXNpYmlsaXR5LnByb3RlY3RlZCwgdHJ1ZSwgXCJSaWNodHVuZ1wiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQXR0cmlidXRlKG5ldyBBdHRyaWJ1dGUoXCJjZW50ZXJYXCIsIGRvdWJsZVByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICh2YWx1ZSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBydG86IFJ1bnRpbWVPYmplY3QgPSB2YWx1ZS5vYmplY3Q7XHJcbiAgICAgICAgICAgICAgICBsZXQgaGVscGVyOiBTaGFwZUhlbHBlciA9IHJ0by5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBpZiAoaGVscGVyID09IG51bGwgfHwgaGVscGVyLmlzRGVzdHJveWVkIHx8IGhlbHBlci5kaXNwbGF5T2JqZWN0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gaGVscGVyLmdldENlbnRlclgoKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBWaXNpYmlsaXR5LnByb3RlY3RlZCwgdHJ1ZSwgXCJYLUtvb3JkaW5hdGUgZGVzIERpYWdvbmFsZW5zY2huaXR0cHVua3RzIGRlciBCb3VuZGluZ0JveCBkZXMgT2JqZWt0c1wiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQXR0cmlidXRlKG5ldyBBdHRyaWJ1dGUoXCJjZW50ZXJZXCIsIGRvdWJsZVByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICh2YWx1ZSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBydG86IFJ1bnRpbWVPYmplY3QgPSB2YWx1ZS5vYmplY3Q7XHJcbiAgICAgICAgICAgICAgICBsZXQgaGVscGVyOiBTaGFwZUhlbHBlciA9IHJ0by5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBpZiAoaGVscGVyID09IG51bGwgfHwgaGVscGVyLmlzRGVzdHJveWVkIHx8IGhlbHBlci5kaXNwbGF5T2JqZWN0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gaGVscGVyLmdldENlbnRlclkoKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBWaXNpYmlsaXR5LnByb3RlY3RlZCwgdHJ1ZSwgXCJZLUtvb3JkaW5hdGUgZGVzIERpYWdvbmFsZW5zY2huaXR0cHVua3RzIGRlciBCb3VuZGluZ0JveCBkZXMgT2JqZWt0c1wiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0dXBBdHRyaWJ1dGVJbmRpY2VzUmVjdXJzaXZlKCk7XHJcblxyXG4gICAgICAgIC8vIHRoaXMuYWRkQXR0cmlidXRlKG5ldyBBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1hdGlvblwiLCBtYXRyaXhUeXBlLFxyXG4gICAgICAgIC8vICAgICAodmFsdWUpID0+IHtcclxuXHJcbiAgICAgICAgLy8gICAgICAgICBsZXQgcnRvOiBSdW50aW1lT2JqZWN0ID0gdmFsdWUub2JqZWN0O1xyXG4gICAgICAgIC8vICAgICAgICAgbGV0IGhlbHBlcjogU2hhcGVIZWxwZXIgPSBydG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgIC8vICAgICAgICAgaWYgKGhlbHBlciA9PSBudWxsIHx8IGhlbHBlci5pc0Rlc3Ryb3llZCB8fCBoZWxwZXIuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0gPT0gbnVsbCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gbnVsbDtcclxuICAgICAgICAvLyAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vICAgICAgICAgbGV0IG1hdHJpeCA9IGhlbHBlci5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLnRvQXJyYXkoZmFsc2UpO1xyXG5cclxuICAgICAgICAvLyAgICAgICAgIGlmICh2YWx1ZS52YWx1ZSA9PSBudWxsKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgdmFsdWUudmFsdWUgPSBbXTtcclxuXHJcbiAgICAgICAgLy8gICAgICAgICAgICAgZm9yIChsZXQgbiBvZiBtYXRyaXgpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgdmFsdWUudmFsdWUucHVzaCh7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG5cclxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBsZXQgaTogbnVtYmVyID0gMDtcclxuICAgICAgICAvLyAgICAgICAgICAgICBmb3IgKGxldCBuIG9mIG1hdHJpeCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICB2YWx1ZS52YWx1ZVtpKytdLnZhbHVlID0gbjtcclxuICAgICAgICAvLyAgICAgICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vICAgICB9LCBmYWxzZSwgVmlzaWJpbGl0eS5wcm90ZWN0ZWQsIHRydWUsIFwiVHJhbnNmb3JtYXRpb25zbWF0cml4XCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm1vdmVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiZHhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJkeVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGR4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGR5OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwibW92ZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLm1vdmUoZHgsIGR5KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJWZXJzY2hpZWJ0IGRhcyBHcmFmaWtvYmpla3QgdW0gZHggUGl4ZWwgbmFjaCByZWNodHMgdW5kIHVtIGR5IFBpeGVsIG5hY2ggdW50ZW4uXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJyb3RhdGVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiYW5nbGVJbkRlZ1wiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImNlbnRlclhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJjZW50ZXJZXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYW5nbGVJbkRlZzogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBjZW50ZXJYOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNlbnRlclk6IG51bWJlciA9IHBhcmFtZXRlcnNbM10udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJyb3RhdGVcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5yb3RhdGUoYW5nbGVJbkRlZywgY2VudGVyWCwgY2VudGVyWSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiRHJlaHQgZGFzIEdyYWZpa29iamVrdCB1bSBkZW4gYW5nZWdlYmVuZW4gV2lua2VsLiBEcmVocHVua3QgaXN0IChjZW50ZXJYLCBjZW50ZXJZKS5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInJvdGF0ZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJhbmdsZUluRGVnXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYW5nbGVJbkRlZzogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInJvdGF0ZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnJvdGF0ZShhbmdsZUluRGVnKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJEcmVodCBkYXMgR3JhZmlrb2JqZWt0IHVtIGRlbiBhbmdlZ2ViZW5lbiBXaW5rZWwuIERyZWhwdW5rdCBpc3QgZGVyICdNaXR0ZWxwdW5rdCcgZGVzIE9iamVrdHNcIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNjYWxlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImZhY3RvclwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImNlbnRlclhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJjZW50ZXJZXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZmFjdG9yOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNlbnRlclg6IG51bWJlciA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgY2VudGVyWTogbnVtYmVyID0gcGFyYW1ldGVyc1szXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInNjYWxlXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2guc2NhbGUoZmFjdG9yLCBjZW50ZXJYLCBjZW50ZXJZKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJTdHJlY2t0IGRhcyBHcmFmaWtvYmpla3QgdW0gZGVuIGFuZ2VnZWJlbmVuIEZha3Rvci4gRGFzIFplbnRydW0gZGVyIFN0cmVja3VuZyBpc3QgZGVyIFB1bmt0IChjZW50ZXJYLCBjZW50ZXJZKVwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2NhbGVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiZmFjdG9yXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZmFjdG9yOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwic2NhbGVcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5zY2FsZShmYWN0b3IpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIlN0cmVja3QgZGFzIEdyYWZpa29iamVrdCB1bSBkZW4gYW5nZWdlYmVuZW4gRmFrdG9yLiBEYXMgWmVudHJ1bSBkZXIgU3RyZWNrdW5nIGlzdCBkZXIgJ01pdHRlbHB1bmt0JyBkZXMgT2JqZWt0cy5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm1pcnJvclhcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJtaXJyb3JYXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2gubWlycm9yWFkoLTEsIDEpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIlNwaWVnZWx0IGRhcyBPYmpla3QgaW4gWC1SaWNodHVuZy5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm1pcnJvcllcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJtaXJyb3JYXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2gubWlycm9yWFkoMSwgLTEpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIlNwaWVnZWx0IGRhcyBPYmpla3QgaW4gWS1SaWNodHVuZy5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImlzT3V0c2lkZVZpZXdcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJpc091dHNpZGVWaWV3XCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLmlzT3V0c2lkZVZpZXcoKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIHNpY2ggZGllIEJvdW5kaW5nIEJveCBkZXMgT2JqZWt0cyBhdcOfZXJoYWxiIGRlcyBzaWNodGJhcmVuIEJlcmVpY2hzIGJlZmluZGV0LiBcIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImdldENlbnRlclhcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBkb3VibGVQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImdldENlbnRlclhcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guZ2V0Q2VudGVyWCgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZGllIHgtS29vcmRpbmF0ZSBkZXMgJ01pdHRlbHB1bmt0cycgenVyw7xjay4gRGVyICdNaXR0ZWxwdW5rdCcgZGVzIEdyYWZpa29iamVrdHMgaXN0IGRlciBEaWFnb25hbGVuc2Nobml0dHB1bmt0IHNlaW5lciBhY2hzZW5wYXJhbGxlbGVuIEJvdW5kaW5nLUJveC5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImdldENlbnRlcllcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBkb3VibGVQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImdldENlbnRlcllcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guZ2V0Q2VudGVyWSgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZGllIHktS29vcmRpbmF0ZSBkZXMgJ01pdHRlbHB1bmt0cycgenVyw7xjay4gRGVyICdNaXR0ZWxwdW5rdCcgZGVzIEdyYWZpa29iamVrdHMgaXN0IGRlciBEaWFnb25hbGVuc2Nobml0dHB1bmt0IHNlaW5lciBhY2hzZW5wYXJhbGxlbGVuIEJvdW5kaW5nLUJveC5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImdldEFuZ2xlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgZG91YmxlUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJnZXRBbmdsZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5hbmdsZTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGRlbiBXaW5rZWwgZGVzIEdyYWZpa29iamVrdHMgaW4gR3JhZCB6dXLDvGNrLiBXaW5rZWwgPT0gMCBiZWRldXRldDogZGllc2VsYmUgUmljaHR1bmcgd2llIHp1bSBaZWlwdW5rdCBkZXIgSW5zdGFuemllcnVuZyBkZXMgT2JqZWt0cy4gUG9zaXRpdmUgV2lua2VsenVuYWhtZSBiZWRldXRldCBSZWNodHNkcmVodW5nLlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiY29udGFpbnNQb2ludFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ4XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeTogbnVtYmVyID0gcGFyYW1ldGVyc1syXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImNvbnRhaW5zUG9pbnRcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guY29udGFpbnNQb2ludCh4LCB5KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIGRhcyBHcmFmaWtvYmpla3QgZGVuIFB1bmt0ICh4LCB5KSBlbnRow6RsdC5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImNvbGxpZGVzV2l0aFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJvYmplY3RcIiwgdHlwZTogdGhpcywgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaGFwZTogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoYXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLnRocm93RXhjZXB0aW9uKFwiRGVyIFBhcmFtZXRlciBkZXIgTWV0aG9kZSBjb2xsaWRlc1dpdGggZGFyZiBuaWNodCBudWxsIHNlaW4uXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDE6IFNoYXBlSGVscGVyID0gc2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiY29sbGlkZXNXaXRoXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoMS5pc0Rlc3Ryb3llZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNoLndvcmxkSGVscGVyLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGllIGRlciBNZXRob2RlIGNvbGxpZGVzV2l0aCBhbHMgUGFyYW1ldGVyIMO8YmVyZ2ViZW5lIEZpZ3VyIGlzdCBiZXJlaXRzIHplcnN0w7ZydC5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5jb2xsaWRlc1dpdGgoc2gxKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIGRhcyBHcmFmaWtvYmpla3QgdW5kIGRhcyBhbmRlcmUgR3JhZmlrb2JqZWt0IGtvbGxpZGllcmVuLlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiY29sbGlkZXNXaXRoQW55U2hhcGVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiY29sbGlkZXNXaXRoQW55U2hhcGVcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guY29sbGlkZXNXaXRoQW55U2hhcGUoKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIGRhcyBHcmFmaWtvYmpla3QgbWl0IGlyZ2VuZGVpbmVtIGFuZGVyZW4gR3JhZmlrb2JqZWt0IGtvbGxpZGllcnQuXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJtb3ZlQmFja0Zyb21cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwib3RoZXJTaGFwZVwiLCB0eXBlOiB0aGlzLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImtlZXBDb2xsaWRpbmdcIiwgdHlwZTogYm9vbGVhblByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGU6IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGtlZXBDb2xsaWRpbmc6IGJvb2xlYW4gPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaGFwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS50aHJvd0V4Y2VwdGlvbihcIkRlciBlcnN0ZSBQYXJhbWV0ZXIgZGVyIE1ldGhvZGUgbW92ZUJhY2tGcm9tIGRhcmYgbmljaHQgbnVsbCBzZWluLlwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgc2gxOiBTaGFwZUhlbHBlciA9IHNoYXBlLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcIm1vdmVCYWNrRnJvbVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaDEuaXNEZXN0cm95ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBzaC53b3JsZEhlbHBlci5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkRpZSBkZXIgTWV0aG9kZSBtb3ZlQmFja0Zyb20gYWxzIFBhcmFtZXRlciDDvGJlcmdlYmVuZSBGaWd1ciBpc3QgYmVyZWl0cyB6ZXJzdMO2cnQuXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzaC5tb3ZlQmFja0Zyb20oc2gxLCBrZWVwQ29sbGlkaW5nKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJSw7xja3QgZGFzIE9iamVrdCBlbnRsYW5nIGRlciBsZXR6dGVuIGR1cmNoIG1vdmUgdm9yZ2VnZWJlbmVuIFJpY2h0dW5nIHp1csO8Y2ssIGJpcyBlcyBkYXMgw7xiZXJnZWJlbmUgT2JqZWt0IGdlcmFkZSBub2NoIChrZWVwQ29sbGlkaW5nID09IHRydWUpIGJ6dy4gZ2VyYWRlIG5pY2h0IG1laHIgKGtlZXBDb2xsaWRpbmcgPT0gZmFsc2UpIGJlcsO8aHJ0LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZGlyZWN0aW9uUmVsYXRpdmVUb1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJvdGhlclNoYXBlXCIsIHR5cGU6IHRoaXMsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBkaXJlY3Rpb25UeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaGFwZTogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoYXBlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLnRocm93RXhjZXB0aW9uKFwiRGVyIGVyc3RlIFBhcmFtZXRlciBkZXIgTWV0aG9kZSBkaXJlY3Rpb25SZWxhdGl2ZVRvIGRhcmYgbmljaHQgbnVsbCBzZWluLlwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgc2gxOiBTaGFwZUhlbHBlciA9IHNoYXBlLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImRpcmVjdGlvblJlbGF0aXZlVG9cIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gxLmlzRGVzdHJveWVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2gud29ybGRIZWxwZXIuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJEaWUgZGVyIE1ldGhvZGUgZGlyZWN0aW9uUmVsYXRpdmVUbyBhbHMgUGFyYW1ldGVyIMO8YmVyZ2ViZW5lIEZpZ3VyIGlzdCBiZXJlaXRzIHplcnN0w7ZydC5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5kaXJlY3Rpb25SZWxhdGl2ZVRvKHNoMSwgZGlyZWN0aW9uVHlwZSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBkaWUgUmljaHR1bmcgKHRvcCwgcmlnaHQsIGJvdHRvbSBvZGVyIGxlZnQpIHp1csO8Y2ssIGluIGRlciBkYXMgZ3JhcGhpc2NoZSBPYmpla3QgcmVsYXRpdiB6dW0gw7xiZXJnZWJlbmVuIGdyYXBoaXNjaGVuIE9iamVrdCBzdGVodC5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm1vdmVUb1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ4XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IHg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeTogbnVtYmVyID0gcGFyYW1ldGVyc1syXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcIm1vdmVUb1wiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLm1vdmUoeCAtIHNoLmdldENlbnRlclgoKSwgeSAtIHNoLmdldENlbnRlclkoKSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiVmVyc2NoaWVidCBkYXMgR3JhZmlrb2JqZWt0IHNvLCBkYXNzIHNpY2ggc2VpbiAnTWl0dGVscHVua3QnIGFuIGRlbiBhbmdlZ2ViZW5lbiBLb29yZGluYXRlbiBiZWZpbmRldC5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImRlZmluZUNlbnRlclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ4XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IHg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeTogbnVtYmVyID0gcGFyYW1ldGVyc1syXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImRlZmluZUNlbnRlclwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLmRlZmluZUNlbnRlcih4LCB5KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJTZXR6dCBmZXN0LCB3byBkZXIgJ01pdHRlbHB1bmt0JyBkZXMgT2JqZWt0cyBsaWVnZW4gc29sbC4gRGllc2VyIFB1bmt0IHdpcmQgYWxzIERyZWhwdW5rdCBkZXIgTWV0aG9kZSByb3RhdGUsIGFscyBaZW50cnVtIGRlciBNZXRob2RlIFNjYWxlIHVuZCBhbHMgUmVmZXJlbnpwdW5rdCBkZXIgTWV0aG9kZSBtb3ZlVG8gYmVudXR6dC5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImRlZmluZUNlbnRlclJlbGF0aXZlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInhSZWxcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ5UmVsXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgeDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB5OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiZGVmaW5lQ2VudGVyUmVsYXRpdmVcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5kZWZpbmVDZW50ZXJSZWxhdGl2ZSh4LCB5KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJTZXR6dCBmZXN0LCB3byBkZXIgJ01pdHRlbHB1bmt0JyBkZXMgT2JqZWt0cyBsaWVnZW4gc29sbC4gRGFiZWkgYmVkZXV0ZXQgKFhSZWwvWVJlbCkgPSAoMC8wKSBkaWUgbGlua2Ugb2JlcmUgRWNrZSBkZXIgQm91bmRpbmcgQm94IGRlcyBPYmpla3RzLCAoWFJlbC9ZUmVsKSA9ICgxLzEpIGRpZSByZWNodGUgdW50ZXJlIEVja2UuIERlZmF1bHR3ZXJ0IGlzdCAoWFJlbC9ZUmVsKSA9ICgwLjUvMC41KSwgYWxzbyBkZXIgRGlhZ29uYWxlbnNjaG5pdHRwdW5rdCBkZXIgQm91bmRpbmcgQm94LiBEaWVzZXIgUHVua3Qgd2lyZCBhbHMgRHJlaHB1bmt0IGRlciBNZXRob2RlIHJvdGF0ZSwgYWxzIFplbnRydW0gZGVyIE1ldGhvZGUgU2NhbGUgdW5kIGFscyBSZWZlcmVuenB1bmt0IGRlciBNZXRob2RlIG1vdmVUbyBiZW51dHp0LlxcblxcblZPUlNJQ0hUOiBEaWVzZSBNZXRob2RlIGFyYmVpdGV0IG5pY2h0IG1laHIga29ycmVrdCwgd2VubiBkYXMgT2JqZWt0IHNjaG9uIGdlZHJlaHQgd3VyZGUhXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzZXRBbmdsZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJhbmdsZURlZ1wiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFuZ2xlRGVnOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwic2V0QW5nbGVcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5yb3RhdGUoYW5nbGVEZWcgLSBzaC5hbmdsZSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiRHJlaHQgZGFzIE9iamVrdCB6dXIgYW5nZWdlYmVuZW4gUmljaHR1bmcuXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzZXREZWZhdWx0VmlzaWJpbGl0eVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ2aXNpYmlsaXR5XCIsIHR5cGU6IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHZpc2liaWxpdHk6IGJvb2xlYW4gPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIEZpbGxlZFNoYXBlRGVmYXVsdHMuc2V0RGVmYXVsdFZpc2liaWxpdHkodmlzaWJpbGl0eSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgdHJ1ZSwgJ1NldHp0IGRlbiBTdGFuZGFyZHdlcnQgZsO8ciBkYXMgQXR0cmlidXQgXCJ2aXNpYmxlXCIuIERpZXNlciB3aXJkIG5hY2hmb2xnZW5kIGltbWVyIGRhbm4gdmVyd2VuZGV0LCB3ZW5uIGVpbiBuZXVlcyBncmFmaXNjaGVzIE9iamVrdCBpbnN0YW56aWVydCB3aXJkLicsIGZhbHNlKSk7XHJcblxyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2V0VmlzaWJsZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ2aXNpYmxlXCIsIHR5cGU6IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IHZpc2libGU6IGJvb2xlYW4gPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwic2V0VmlzaWJsZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnNldFZpc2libGUodmlzaWJsZSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiTWFjaHQgZGFzIEdyYWZpa29iamVrdCBzaWNodGJhciAodmlzaWJsZSA9PSB0cnVlKSBiencuIHVuc2ljaHRiYXIgKHZpc2libGUgPT0gZmFsc2UpLlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2V0U3RhdGljXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImlzU3RhdGljXCIsIHR5cGU6IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGlzU3RhdGljOiBib29sZWFuID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInNldFN0YXRpY1wiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnNldFN0YXRpYyhpc1N0YXRpYyk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwic2V0U3RhdGljKHRydWUpIGhhdCB6dXIgRm9sZ2UsIGRhc3MgZGllIEFuc2ljaHQgZGVzIE9iamVrdHMgZHVyY2ggVHJhbnNmb3JtYXRpb25lbiBkZXMgV29ybGQtT2JqZWt0cyBuaWNodCB2ZXLDpG5kZXJ0IHdpcmQuXCIsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJvbk1vdXNlRW50ZXJcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInlcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLCAoKSA9PiB7IH0sIC8vIG5vIHN0YXRlbWVudHMhXHJcbiAgICAgICAgICAgIGZhbHNlLCBmYWxzZSwgXCJXaXJkIGF1ZmdlcnVmZW4sIHdlbm4gc2ljaCBkZXIgTWF1c3BmZWlsIGluIGRhcyBPYmpla3QgaGluZWluYmV3ZWd0LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwib25Nb3VzZUxlYXZlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ5XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSwgKCkgPT4geyB9LCAvLyBubyBzdGF0ZW1lbnRzIVxyXG4gICAgICAgICAgICBmYWxzZSwgZmFsc2UsIFwiV2lyZCBhdWZnZXJ1ZmVuLCB3ZW5uIHNpY2ggZGVyIE1hdXNwZmVpbCBpbiBkYXMgT2JqZWt0IGhpbmVpbmJld2VndC5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm9uTW91c2VEb3duXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ5XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwia2V5XCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSwgKCkgPT4geyB9LCAvLyBubyBzdGF0ZW1lbnRzIVxyXG4gICAgICAgICAgICBmYWxzZSwgZmFsc2UsIFwiV2lyZCBhdWZnZXJ1ZmVuLCB3ZW5uIHNpY2ggZGVyIE1hdXNwZmVpbCDDvGJlciBkZW0gT2JqZWt0IGJlZmluZGV0IHVuZCBkZXIgQmVudXR6ZXIgZWluZSBNYXVzdGFzdGUgbmFjaCB1bnRlbiBkcsO8Y2t0LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwib25Nb3VzZVVwXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ5XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwia2V5XCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSwgKCkgPT4geyB9LCAvLyBubyBzdGF0ZW1lbnRzIVxyXG4gICAgICAgICAgICBmYWxzZSwgZmFsc2UsIFwiV2lyZCBhdWZnZXJ1ZmVuLCB3ZW5uIHNpY2ggZGVyIE1hdXNwZmVpbCDDvGJlciBkZW0gT2JqZWt0IGJlZmluZGV0IHVuZCBkZXIgQmVudXR6ZXIgZWluZSBNYXVzdGFzdGUgbG9zbMOkc3N0LlwiLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwib25Nb3VzZU1vdmVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInlcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLCAoKSA9PiB7IH0sIC8vIG5vIHN0YXRlbWVudHMhXHJcbiAgICAgICAgICAgIGZhbHNlLCBmYWxzZSwgXCJXaXJkIGF1ZmdlcnVmZW4sIHdlbm4gc2ljaCBkZXIgTWF1c3BmZWlsIMO8YmVyIGRlbSBPYmpla3QgYmVmaW5kZXQgdW5kIGJld2VndC5cIiwgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInRpbnRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY29sb3JBc1JHQkFTdHJpbmdcIiwgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBjb2xvcjogc3RyaW5nID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInRpbnRcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC50aW50KGNvbG9yKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ8OcYmVyemllaHQgZGFzIEdyYWZpa29iamVrdCBtaXQgZWluZXIgaGFsYmR1cmNoc2ljaHRpZ2VuIEZhcmJzY2hpY2h0LicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJ0aW50XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImNvbG9yQXNJbnRcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBjb2xvcjogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInRpbnRcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC50aW50KGNvbG9yKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ8OcYmVyemllaHQgZGFzIEdyYWZpa29iamVrdCBtaXQgZWluZXIgaGFsYmR1cmNoc2ljaHRpZ2VuIEZhcmJzY2hpY2h0LiBEaWUgRmFyYmUgd2lyZCBhbHMgaW50LVdlcnQgYW5nZWdlYmVuLCBwcmFrdGlzY2hlcndlaXNlIGhleGFkZXppbWFsLCBhbHNvIHouQi4gdGludCgweDMwMzAzMCkuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInN0YXJ0VHJhY2tpbmdFdmVyeU1vdXNlTW92ZW1lbnRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgc2gudHJhY2tNb3VzZU1vdmUgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnU29yZ3QgZGFmw7xyLCBkYXNzIGFiIGpldHp0IEpFREUgQmV3ZWd1bmcgZGVzIE1hdXN6ZWlnZXJzIChhdWNoIHdlbm4gc2ljaCBkaWVzZXIgYXXDn2VyaGFsYiBkZXMgT2JqZWt0cyBiZWZpbmRldCkgZWluIE1vdXNlTW92ZS1FcmVpZ25pcyBmw7xyIGRpZXNlcyBPYmpla3QgYXVzbMO2c3QuIC0+IFByYWt0aXNjaCB6dXIgVW1zZXR6dW5nIGRlcyBcIlppZWhlbnNcIiB2b24gT2JqZWt0ZW4gbWl0IGRlciBNYXVzIScsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzdG9wVHJhY2tpbmdFdmVyeU1vdXNlTW92ZW1lbnRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgc2gudHJhY2tNb3VzZU1vdmUgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ1Nvcmd0IGRhZsO8ciwgZGFzcyBhYiBqZXR6dCBudXIgbm9jaCBkYW5uIEJld2VndW5nZW4gZGVzIE1hdXN6ZWlnZXJzIGVpbiBNb3VzZU1vdmUtRXJlaWduaXMgZsO8ciBkaWVzZXMgT2JqZWt0IGF1c2zDtnNlbiwgd2VubiBzaWNoIGRlciBNYXVzemVpZ2VyIMO8YmVyIGRlbSBPYmpla3QgYmVmaW5kZXQuIC0+IFByYWt0aXNjaCB6dXIgVW1zZXR6dW5nIGRlcyBcIlppZWhlbnNcIiB2b24gT2JqZWt0ZW4gbWl0IGRlciBNYXVzIScsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJyZWFjdFRvTW91c2VFdmVudHNXaGVuSW52aXNpYmxlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInJlYWN0XCIsIHR5cGU6IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlYWN0OiBib29sZWFuID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5yZWFjdFRvTW91c2VFdmVudHNXaGVuSW52aXNpYmxlID0gcmVhY3Q7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdMZWd0IGZlc3QsIG9iIGRhcyBPYmpla3QgYXVmIE1hdXNldmVudHMgKGJ1dHRvbmRvd24sIG1vdXNlIG1vdmUsIC4uLikgcmVhZ2llcnQsIHdlbm4gZXMgdW5zaWNodGJhciBpc3QuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInRpbnRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY29sb3JBc1JHQkFTdHJpbmdcIiwgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBjb2xvcjogc3RyaW5nID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInRpbnRcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC50aW50KGNvbG9yKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ8OcYmVyemllaHQgZGFzIEdyYWZpa29iamVrdCBtaXQgZWluZXIgaGFsYmR1cmNoc2ljaHRpZ2VuIEZhcmJzY2hpY2h0LicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJkZWZpbmVEaXJlY3Rpb25cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiYW5nbGVJbkRlZ1wiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImRlZmluZURpcmVjdGlvblwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLmRpcmVjdGlvblJhZCA9IGRpcmVjdGlvbiAvIDE4MCAqIE1hdGguUEk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdTZXR6dCBkaWUgQmxpY2tyaWNodHVuZyBkZXMgZ3JhcGhpc2NoZW4gT2JqZWt0cy4gRGllcyBpc3QgZGllIFJpY2h0dW5nLCBpbiBkaWUgZXMgZHVyY2ggQXVmcnVmIGRlciBNZXRob2RlIGZvcndhcmQgYmV3ZWd0IHdpcmQuIFxcbkJlbWVya3VuZzogZGllIE1ldGhvZGUgcm90YXRlIMOkbmRlcnQgYXVjaCBkaWUgQmxpY2tyaWNodHVuZyEnLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZm9yd2FyZFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJkaXN0YW5jZVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiZm9yd2FyZFwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLmZvcndhcmQoZGlzdGFuY2UpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnQmV3ZWd0IGRhcyBPYmpla3QgdW0gZGllIGFuZ2VnZWJlbmUgTMOkbmdlIGluIFJpY2h0dW5nIHNlaW5lciBCbGlja3JpY2h0dW5nLlxcbkJlbWVya3VuZzogRGllIEJsaWNrcmljaHR1bmcga2FubiBtaXQgZGVmaW5lRGlyZWN0aW9uIGdlc2V0enQgd2VyZGVuLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJjb3B5XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgdGhpcyxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJjb3B5XCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLmdldENvcHkoPEtsYXNzPm8uY2xhc3MpO1xyXG5cclxuICAgICAgICAgICAgfSwgdHJ1ZSwgZmFsc2UsICdFcnN0ZWxsdCBlaW5lIEtvcGllIGRlcyBHcmFmaWtvYmpla3RzIHVuZCBnaXQgc2llIHp1csO8Y2suJywgZmFsc2UpKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJicmluZ1RvRnJvbnRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJicmluZ1RvRnJvbnRcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guYnJpbmdUb0Zyb250KCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdTZXR6dCBkYXMgR3JhZmlrb2JqZWt0IHZvciBhbGxlIGFuZGVyZW4uJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNlbmRUb0JhY2tcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJzZW5kVG9CYWNrXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLnNlbmRUb0JhY2soKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ1NldHp0IGRhcyBHcmFmaWtvYmpla3QgaGludGVyIGFsbGUgYW5kZXJlbi4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0SGl0UG9seWdvblwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIG5ldyBBcnJheVR5cGUodmVjdG9yMkNsYXNzKSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJnZXRIaXRQb2x5Z29uXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLmdldEhpdFBvbHlnb24odmVjdG9yMkNsYXNzKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGVpbiBBcnJheSB6dXLDvGNrLCBkYXMgZGllIHZpZXIgRWNrcHVua3RlIGRlcyBIaXQtUG9seWdvbnMgaW4gRm9ybSB2b24gVmVjdG9yMi1PcnRzdmVrdG9yZW4gZW50aMOkbHQuIEJlaSBkZW4gS2xhc3NlbiBSZWN0YW5nbGUsIFRyaWFuZ2xlIHVuZCBQb2x5Z29uIHNpbmQgZGllcyBkaWUgRWNrcHVua3RlLlwiLCBmYWxzZSkpO1xyXG5cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTaGFwZUhlbHBlciBleHRlbmRzIEFjdG9ySGVscGVyIHtcclxuXHJcbiAgICBkaXNwbGF5T2JqZWN0OiBQSVhJLkRpc3BsYXlPYmplY3Q7XHJcblxyXG4gICAgYmVsb25nc1RvR3JvdXA6IEdyb3VwSGVscGVyO1xyXG5cclxuICAgIGNlbnRlclhJbml0aWFsOiBudW1iZXI7XHJcbiAgICBjZW50ZXJZSW5pdGlhbDogbnVtYmVyO1xyXG5cclxuICAgIGFuZ2xlOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGhpdFBvbHlnb25Jbml0aWFsOiBQdW5rdFtdID0gbnVsbDtcclxuICAgIGhpdFBvbHlnb25UcmFuc2Zvcm1lZDogUHVua3RbXSA9IG51bGw7XHJcbiAgICBoaXRQb2x5Z29uRGlydHkgPSB0cnVlO1xyXG5cclxuICAgIHJlYWN0VG9Nb3VzZUV2ZW50c1doZW5JbnZpc2libGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBtb3VzZUxhc3RTZWVuSW5zaWRlT2JqZWN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgdHJhY2tNb3VzZU1vdmU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBzY2FsZUZhY3RvcjogbnVtYmVyID0gMS4wO1xyXG5cclxuICAgIGRpcmVjdGlvblJhZDogbnVtYmVyID0gMDtcclxuXHJcbiAgICBsYXN0TW92ZUR4OiBudW1iZXIgPSAwO1xyXG4gICAgbGFzdE1vdmVEeTogbnVtYmVyID0gMDtcclxuXHJcbiAgICBjb3B5RnJvbShzaGFwZUhlbHBlcjogU2hhcGVIZWxwZXIpIHtcclxuXHJcbiAgICAgICAgdGhpcy5jZW50ZXJYSW5pdGlhbCA9IHNoYXBlSGVscGVyLmNlbnRlclhJbml0aWFsO1xyXG4gICAgICAgIHRoaXMuY2VudGVyWUluaXRpYWwgPSBzaGFwZUhlbHBlci5jZW50ZXJZSW5pdGlhbDtcclxuXHJcbiAgICAgICAgaWYgKHNoYXBlSGVscGVyLmhpdFBvbHlnb25Jbml0aWFsICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2x5Z29uSW5pdGlhbCA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBwIG9mIHNoYXBlSGVscGVyLmhpdFBvbHlnb25Jbml0aWFsKSB0aGlzLmhpdFBvbHlnb25Jbml0aWFsLnB1c2goT2JqZWN0LmFzc2lnbih7fSwgcCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXRIaXRQb2x5Z29uRGlydHkodHJ1ZSk7XHJcblxyXG4gICAgICAgIHRoaXMuaGl0UG9seWdvbkRpcnR5ID0gc2hhcGVIZWxwZXIuaGl0UG9seWdvbkRpcnR5O1xyXG4gICAgICAgIHRoaXMucmVhY3RUb01vdXNlRXZlbnRzV2hlbkludmlzaWJsZSA9IHNoYXBlSGVscGVyLnJlYWN0VG9Nb3VzZUV2ZW50c1doZW5JbnZpc2libGU7XHJcbiAgICAgICAgdGhpcy5tb3VzZUxhc3RTZWVuSW5zaWRlT2JqZWN0ID0gc2hhcGVIZWxwZXIubW91c2VMYXN0U2Vlbkluc2lkZU9iamVjdDtcclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLmNvcHlGcm9tKHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QudHJhbnNmb3JtLmxvY2FsVHJhbnNmb3JtKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGludGVycHJldGVyOiBJbnRlcnByZXRlciwgcnVudGltZU9iamVjdDogUnVudGltZU9iamVjdCkge1xyXG5cclxuICAgICAgICBzdXBlcihpbnRlcnByZXRlciwgcnVudGltZU9iamVjdCk7XHJcblxyXG4gICAgICAgIGxldCBsaXN0ZW5lclR5cGVzID0gW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiTW91c2VVcFwiLCBzaWduYXR1cmU6IFwiKGRvdWJsZSwgZG91YmxlLCBpbnQpXCIgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIk1vdXNlRG93blwiLCBzaWduYXR1cmU6IFwiKGRvdWJsZSwgZG91YmxlLCBpbnQpXCIgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIk1vdXNlTW92ZVwiLCBzaWduYXR1cmU6IFwiKGRvdWJsZSwgZG91YmxlKVwiIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJNb3VzZUVudGVyXCIsIHNpZ25hdHVyZTogXCIoZG91YmxlLCBkb3VibGUpXCIgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIk1vdXNlTGVhdmVcIiwgc2lnbmF0dXJlOiBcIihkb3VibGUsIGRvdWJsZSlcIiB9LFxyXG4gICAgICAgIF07XHJcblxyXG4gICAgICAgIGxldCBzZDogTW91c2VMaXN0ZW5lclNoYXBlRGF0YSA9IG51bGw7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGx0IG9mIGxpc3RlbmVyVHlwZXMpIHtcclxuICAgICAgICAgICAgbGV0IG1ldGhvZDogTWV0aG9kID0gKDxLbGFzcz5ydW50aW1lT2JqZWN0LmNsYXNzKS5nZXRNZXRob2RCeVNpZ25hdHVyZShcIm9uXCIgKyBsdC5pZGVudGlmaWVyICsgbHQuc2lnbmF0dXJlKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChtZXRob2Q/LnByb2dyYW0gIT0gbnVsbCB8fCBtZXRob2Q/Lmludm9rZSAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNkID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2hhcGVIZWxwZXI6IHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVzOiB7fSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kczoge31cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMud29ybGRIZWxwZXIubW91c2VMaXN0ZW5lclNoYXBlcy5wdXNoKHNkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzZC50eXBlc1tsdC5pZGVudGlmaWVyLnRvTG93ZXJDYXNlKCldID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHNkLm1ldGhvZHNbbHQuaWRlbnRpZmllci50b0xvd2VyQ2FzZSgpXSA9IG1ldGhvZDtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLndvcmxkSGVscGVyLmRlZmF1bHRHcm91cCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRIZWxwZXIuc2hhcGVzLnB1c2godGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2V0SGl0UG9seWdvbkRpcnR5KGRpcnR5OiBib29sZWFuKSB7XHJcbiAgICAgICAgdGhpcy5oaXRQb2x5Z29uRGlydHkgPSBkaXJ0eTtcclxuICAgIH1cclxuXHJcbiAgICBicmluZ09uZVBsYW5lRnVydGhlclRvRnJvbnQoKSB7XHJcbiAgICAgICAgbGV0IGNvbnRhaW5lcjogUElYSS5Db250YWluZXIgPSA8UElYSS5Db250YWluZXI+dGhpcy5kaXNwbGF5T2JqZWN0LnBhcmVudDtcclxuICAgICAgICBsZXQgaGlnaGVzdEluZGV4ID0gY29udGFpbmVyLmNoaWxkcmVuLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgbGV0IGluZGV4ID0gY29udGFpbmVyLmdldENoaWxkSW5kZXgodGhpcy5kaXNwbGF5T2JqZWN0KTtcclxuICAgICAgICBpZiAoaW5kZXggPCBoaWdoZXN0SW5kZXgpIHtcclxuICAgICAgICAgICAgY29udGFpbmVyLnNldENoaWxkSW5kZXgodGhpcy5kaXNwbGF5T2JqZWN0LCBpbmRleCArIDEpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBicmluZ09uZVBsYW5lRnVydGhlclRvQmFjaygpIHtcclxuICAgICAgICBsZXQgY29udGFpbmVyOiBQSVhJLkNvbnRhaW5lciA9IDxQSVhJLkNvbnRhaW5lcj50aGlzLmRpc3BsYXlPYmplY3QucGFyZW50O1xyXG4gICAgICAgIGxldCBpbmRleCA9IGNvbnRhaW5lci5nZXRDaGlsZEluZGV4KHRoaXMuZGlzcGxheU9iamVjdCk7XHJcbiAgICAgICAgaWYgKGluZGV4ID4gMCkge1xyXG4gICAgICAgICAgICBjb250YWluZXIuc2V0Q2hpbGRJbmRleCh0aGlzLmRpc3BsYXlPYmplY3QsIGluZGV4IC0gMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGJyaW5nVG9Gcm9udCgpIHtcclxuICAgICAgICBsZXQgY29udGFpbmVyOiBQSVhJLkNvbnRhaW5lciA9IDxQSVhJLkNvbnRhaW5lcj50aGlzLmRpc3BsYXlPYmplY3QucGFyZW50O1xyXG4gICAgICAgIGxldCBoaWdoZXN0SW5kZXggPSBjb250YWluZXIuY2hpbGRyZW4ubGVuZ3RoIC0gMTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYmVsb25nc1RvR3JvdXAgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlbG9uZ3NUb0dyb3VwLnNldENoaWxkSW5kZXgodGhpcywgaGlnaGVzdEluZGV4KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb250YWluZXIuc2V0Q2hpbGRJbmRleCh0aGlzLmRpc3BsYXlPYmplY3QsIGhpZ2hlc3RJbmRleCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlbmRUb0JhY2soKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuYmVsb25nc1RvR3JvdXAgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlbG9uZ3NUb0dyb3VwLnNldENoaWxkSW5kZXgodGhpcywgMCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IGNvbnRhaW5lcjogUElYSS5Db250YWluZXIgPSA8UElYSS5Db250YWluZXI+dGhpcy5kaXNwbGF5T2JqZWN0LnBhcmVudDtcclxuICAgICAgICAgICAgY29udGFpbmVyLnNldENoaWxkSW5kZXgodGhpcy5kaXNwbGF5T2JqZWN0LCAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYWRkVG9EZWZhdWx0R3JvdXBBbmRTZXREZWZhdWx0VmlzaWJpbGl0eSgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnZpc2libGUgPSBGaWxsZWRTaGFwZURlZmF1bHRzLmRlZmF1bHRWaXNpYmlsaXR5O1xyXG5cclxuICAgICAgICBpZiAodGhpcy53b3JsZEhlbHBlci5kZWZhdWx0R3JvdXAgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnJ1bnRpbWVPYmplY3QuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdID0gdGhpcztcclxuICAgICAgICAgICAgbGV0IGdyb3VwSGVscGVyID0gPEdyb3VwSGVscGVyPnRoaXMud29ybGRIZWxwZXIuZGVmYXVsdEdyb3VwO1xyXG4gICAgICAgICAgICBncm91cEhlbHBlci5hZGQodGhpcy5ydW50aW1lT2JqZWN0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGludChjb2xvcjogc3RyaW5nIHwgbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IGM6IG51bWJlcjtcclxuICAgICAgICBpZiAodHlwZW9mIGNvbG9yID09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgIGMgPSBDb2xvckhlbHBlci5wYXJzZUNvbG9yVG9PcGVuR0woY29sb3IpLmNvbG9yO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGMgPSBjb2xvcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgaWYgKHRoaXMuZGlzcGxheU9iamVjdC50aW50KSB7XHJcbiAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudGludCA9IGM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0VmlzaWJsZSh2aXNpYmxlOiBib29sZWFuKSB7XHJcblxyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC52aXNpYmxlID0gdmlzaWJsZTtcclxuICAgIH1cclxuXHJcbiAgICBjb2xsaWRlc1dpdGhBbnlTaGFwZSgpOiBib29sZWFuIHtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcbiAgICAgICAgaWYgKHRoaXMuaGl0UG9seWdvbkRpcnR5KSB0aGlzLnRyYW5zZm9ybUhpdFBvbHlnb24oKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgc2hhcGVIZWxwZXIgb2YgdGhpcy53b3JsZEhlbHBlci5zaGFwZXMpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMgPT0gc2hhcGVIZWxwZXIpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgaWYgKHNoYXBlSGVscGVyW1wic2hhcGVzXCJdIHx8IHNoYXBlSGVscGVyW1widHVydGxlXCJdKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2hhcGVIZWxwZXIuY29sbGlkZXNXaXRoKHRoaXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpc1tcInR1cnRsZVwiXSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXNXaXRoKHNoYXBlSGVscGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGJiID0gdGhpcy5kaXNwbGF5T2JqZWN0LmdldEJvdW5kcygpO1xyXG4gICAgICAgICAgICBsZXQgYmIxID0gc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC5nZXRCb3VuZHMoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChiYi5sZWZ0ID4gYmIxLnJpZ2h0IHx8IGJiMS5sZWZ0ID4gYmIucmlnaHQpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGJiLnRvcCA+IGJiMS5ib3R0b20gfHwgYmIxLnRvcCA+IGJiLmJvdHRvbSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAvLyBib3VuZGlnIGJveGVzIGNvbGxpZGUsIHNvIGNoZWNrIGZ1cnRoZXI6XHJcbiAgICAgICAgICAgIGlmIChzaGFwZUhlbHBlci5oaXRQb2x5Z29uRGlydHkpIHNoYXBlSGVscGVyLnRyYW5zZm9ybUhpdFBvbHlnb24oKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHJldHVybiBwb2x5Z29uQmVyw7xocnRQb2x5Z29uKHRoaXMuaGl0UG9seWdvblRyYW5zZm9ybWVkLCBzaGFwZUhlbHBlci5oaXRQb2x5Z29uVHJhbnNmb3JtZWQpO1xyXG4gICAgICAgICAgICBpZiAocG9seWdvbkJlcsO8aHJ0UG9seWdvbkV4YWt0KHRoaXMuaGl0UG9seWdvblRyYW5zZm9ybWVkLCBzaGFwZUhlbHBlci5oaXRQb2x5Z29uVHJhbnNmb3JtZWQsIHRydWUsIHRydWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY29sbGlkZXNXaXRoKHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlcikge1xyXG5cclxuICAgICAgICAvLyBpZighKHRoaXMgaW5zdGFuY2VvZiBUdXJ0bGVIZWxwZXIpICYmIChzaGFwZUhlbHBlciBpbnN0YW5jZW9mIFR1cnRsZUhlbHBlcikpe1xyXG4gICAgICAgIGlmICh0aGlzW1wibGluZUVsZW1lbnRzXCJdID09IG51bGwgJiYgKHNoYXBlSGVscGVyW1wibGluZUVsZW1lbnRzXCJdICE9IG51bGwpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzaGFwZUhlbHBlci5jb2xsaWRlc1dpdGgodGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2hhcGVIZWxwZXJbXCJzaGFwZXNcIl0pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHNoYXBlSGVscGVyLmNvbGxpZGVzV2l0aCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmRpc3BsYXlPYmplY3QgPT0gbnVsbCB8fCBzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0ID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG4gICAgICAgIHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgICAgIGxldCBiYiA9IHRoaXMuZGlzcGxheU9iamVjdC5nZXRCb3VuZHMoKTtcclxuICAgICAgICBsZXQgYmIxID0gc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC5nZXRCb3VuZHMoKTtcclxuXHJcbiAgICAgICAgaWYgKGJiLmxlZnQgPiBiYjEucmlnaHQgfHwgYmIxLmxlZnQgPiBiYi5yaWdodCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoYmIudG9wID4gYmIxLmJvdHRvbSB8fCBiYjEudG9wID4gYmIuYm90dG9tKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhpdFBvbHlnb25Jbml0aWFsID09IG51bGwgfHwgc2hhcGVIZWxwZXIuaGl0UG9seWdvbkluaXRpYWwgPT0gbnVsbCkgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIC8vIGJvdW5kaWcgYm94ZXMgY29sbGlkZSwgc28gY2hlY2sgZnVydGhlcjpcclxuICAgICAgICBpZiAodGhpcy5oaXRQb2x5Z29uRGlydHkpIHRoaXMudHJhbnNmb3JtSGl0UG9seWdvbigpO1xyXG4gICAgICAgIGlmIChzaGFwZUhlbHBlci5oaXRQb2x5Z29uRGlydHkpIHNoYXBlSGVscGVyLnRyYW5zZm9ybUhpdFBvbHlnb24oKTtcclxuXHJcbiAgICAgICAgLy8gcmV0dXJuIHBvbHlnb25CZXLDvGhydFBvbHlnb24odGhpcy5oaXRQb2x5Z29uVHJhbnNmb3JtZWQsIHNoYXBlSGVscGVyLmhpdFBvbHlnb25UcmFuc2Zvcm1lZCk7XHJcbiAgICAgICAgcmV0dXJuIHBvbHlnb25CZXLDvGhydFBvbHlnb25FeGFrdCh0aGlzLmhpdFBvbHlnb25UcmFuc2Zvcm1lZCwgc2hhcGVIZWxwZXIuaGl0UG9seWdvblRyYW5zZm9ybWVkLCB0cnVlLCB0cnVlKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZGlyZWN0aW9uUmVsYXRpdmVUbyhzaGFwZUhlbHBlcjogU2hhcGVIZWxwZXIsIGRpcmVjdGlvblR5cGU6IEVudW0pIHtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcbiAgICAgICAgc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC51cGRhdGVUcmFuc2Zvcm0oKTtcclxuXHJcbiAgICAgICAgbGV0IGJiID0gdGhpcy5kaXNwbGF5T2JqZWN0LmdldEJvdW5kcygpO1xyXG4gICAgICAgIGxldCBiYjEgPSBzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LmdldEJvdW5kcygpO1xyXG5cclxuICAgICAgICBsZXQgZHgxID0gYmIxLmxlZnQgLSBiYi5yaWdodDsgIC8vIHBvc2l0aXZlIGlmIGxlZnRcclxuICAgICAgICBsZXQgZHgyID0gYmIubGVmdCAtIGJiMS5yaWdodDsgIC8vIHBvc2l0aXZlIGlmIHJpZ2h0XHJcblxyXG4gICAgICAgIGxldCBkeTEgPSBiYjEudG9wIC0gYmIuYm90dG9tOyAgLy8gcG9zaXRpdmUgaWYgdG9wXHJcbiAgICAgICAgbGV0IGR5MiA9IGJiLnRvcCAtIGJiMS5ib3R0b207ICAvLyBwb3NpdGl2ZSBpZiBib3R0b21cclxuXHJcbiAgICAgICAgbGV0IGVudW1pbmZvID0gZGlyZWN0aW9uVHlwZS5lbnVtSW5mb0xpc3Q7XHJcbiAgICAgICAgbGV0IHBhaXJzOiB7IGRpc3RhbmNlOiBudW1iZXIsIGVpOiBFbnVtSW5mbyB9W10gPSBbXTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubGFzdE1vdmVEeCA+IDApIHtcclxuICAgICAgICAgICAgcGFpcnMucHVzaCh7IGRpc3RhbmNlOiBkeDEsIGVpOiBlbnVtaW5mb1szXSB9KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubGFzdE1vdmVEeCA8IDApIHtcclxuICAgICAgICAgICAgcGFpcnMucHVzaCh7IGRpc3RhbmNlOiBkeDIsIGVpOiBlbnVtaW5mb1sxXSB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmxhc3RNb3ZlRHkgPiAwKSB7XHJcbiAgICAgICAgICAgIHBhaXJzLnB1c2goeyBkaXN0YW5jZTogZHkxLCBlaTogZW51bWluZm9bMF0gfSk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmxhc3RNb3ZlRHkgPCAwKSB7XHJcbiAgICAgICAgICAgIHBhaXJzLnB1c2goeyBkaXN0YW5jZTogZHkyLCBlaTogZW51bWluZm9bMl0gfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocGFpcnMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgcGFpcnMgPSBbXHJcbiAgICAgICAgICAgICAgICB7IGRpc3RhbmNlOiBkeDEsIGVpOiBlbnVtaW5mb1szXSB9LFxyXG4gICAgICAgICAgICAgICAgeyBkaXN0YW5jZTogZHgyLCBlaTogZW51bWluZm9bMV0gfSxcclxuICAgICAgICAgICAgICAgIHsgZGlzdGFuY2U6IGR5MSwgZWk6IGVudW1pbmZvWzBdIH0sXHJcbiAgICAgICAgICAgICAgICB7IGRpc3RhbmNlOiBkeTIsIGVpOiBlbnVtaW5mb1syXSB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsZXQgbWF4ID0gcGFpcnNbMF0uZGlzdGFuY2U7XHJcbiAgICAgICAgbGV0IGVpID0gcGFpcnNbMF0uZWk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBwYWlycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAocGFpcnNbaV0uZGlzdGFuY2UgPiBtYXgpIHtcclxuICAgICAgICAgICAgICAgIG1heCA9IHBhaXJzW2ldLmRpc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgZWkgPSBwYWlyc1tpXS5laTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGVpLm9iamVjdDtcclxuICAgIH1cclxuXHJcblxyXG4gICAgbW92ZUJhY2tGcm9tKHNoMTogU2hhcGVIZWxwZXIsIGtlZXBDb2xsaWRpbmc6IGJvb2xlYW4pIHtcclxuXHJcbiAgICAgICAgLy8gc3Vic2VxdWVudCBjYWxscyB0byBtb3ZlIGRlc3Ryb3kgdmFsdWVzIGluIHRoaXMubGFzdE1vdmVEeCBhbmQgdGhpcy5sYXN0TW92ZUR5LCBzbzpcclxuICAgICAgICBsZXQgbG1keCA9IHRoaXMubGFzdE1vdmVEeDtcclxuICAgICAgICBsZXQgbG1keSA9IHRoaXMubGFzdE1vdmVEeTtcclxuXHJcbiAgICAgICAgbGV0IGxlbmd0aCA9IE1hdGguc3FydChsbWR4ICogbG1keCArIGxtZHkgKiBsbWR5KTtcclxuICAgICAgICBpZiAobGVuZ3RoIDwgMC4wMDEpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbGxpZGVzV2l0aChzaDEpKSByZXR1cm47XHJcblxyXG4gICAgICAgIGxldCBwYXJhbWV0ZXJNYXggPSAwOyAgICAgICAvLyBjb2xsaXNpb24gd2l0aCB0aGlzIHBhcmFtZXRlclxyXG4gICAgICAgIHRoaXMubW92ZSgtbG1keCwgLWxtZHkpO1xyXG5cclxuICAgICAgICBsZXQgY3VycmVudFBhcmFtZXRlciA9IC0xOyAgLy8gbW92ZSB0byBwYXJhbWV0ZXJNaW5cclxuXHJcbiAgICAgICAgd2hpbGUgKHRoaXMuY29sbGlkZXNXaXRoKHNoMSkpIHtcclxuICAgICAgICAgICAgcGFyYW1ldGVyTWF4ID0gY3VycmVudFBhcmFtZXRlcjsgICAgLy8gY29sbGlzaW9uIGF0IHRoaXMgcGFyYW1ldGVyXHJcbiAgICAgICAgICAgIGxldCBuZXdQYXJhbWV0ZXIgPSBjdXJyZW50UGFyYW1ldGVyICogMjtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlKGxtZHggKiAobmV3UGFyYW1ldGVyIC0gY3VycmVudFBhcmFtZXRlciksIGxtZHkgKiAobmV3UGFyYW1ldGVyIC0gY3VycmVudFBhcmFtZXRlcikpO1xyXG4gICAgICAgICAgICBjdXJyZW50UGFyYW1ldGVyID0gbmV3UGFyYW1ldGVyO1xyXG4gICAgICAgICAgICBpZiAoKGN1cnJlbnRQYXJhbWV0ZXIgKyAxKSAqIGxlbmd0aCA8IC0xMDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZShsbWR4ICogKC0xIC0gY3VycmVudFBhcmFtZXRlciksIGxtZHkgKiAoLTEgLSBjdXJyZW50UGFyYW1ldGVyKSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHBhcmFtZXRlck1pbiA9IGN1cnJlbnRQYXJhbWV0ZXI7XHJcblxyXG4gICAgICAgIGxldCBpc0NvbGxpZGluZzogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIC8vIFNpdHVhdGlvbiBub3c6IG5vIGNvbGxpc2lvbiBhdCBwYXJhbWV0ZXJNaW4gPT0gY3VycmVudFBhcmFtZXRlciwgY29sbGlzaW9uIGF0IHBhcmFtZXRlck1heFxyXG4gICAgICAgIHdoaWxlICgocGFyYW1ldGVyTWF4IC0gcGFyYW1ldGVyTWluKSAqIGxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgbGV0IG5wID0gKHBhcmFtZXRlck1heCArIHBhcmFtZXRlck1pbikgLyAyO1xyXG4gICAgICAgICAgICB0aGlzLm1vdmUobG1keCAqIChucCAtIGN1cnJlbnRQYXJhbWV0ZXIpLCBsbWR5ICogKG5wIC0gY3VycmVudFBhcmFtZXRlcikpO1xyXG4gICAgICAgICAgICBpZiAoaXNDb2xsaWRpbmcgPSB0aGlzLmNvbGxpZGVzV2l0aChzaDEpKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJNYXggPSBucDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlck1pbiA9IG5wO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGN1cnJlbnRQYXJhbWV0ZXIgPSBucDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChrZWVwQ29sbGlkaW5nICYmICFpc0NvbGxpZGluZykge1xyXG4gICAgICAgICAgICB0aGlzLm1vdmUobG1keCAqIChwYXJhbWV0ZXJNYXggLSBjdXJyZW50UGFyYW1ldGVyKSwgbG1keSAqIChwYXJhbWV0ZXJNYXggLSBjdXJyZW50UGFyYW1ldGVyKSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChpc0NvbGxpZGluZyAmJiAha2VlcENvbGxpZGluZykge1xyXG4gICAgICAgICAgICB0aGlzLm1vdmUobG1keCAqIChwYXJhbWV0ZXJNaW4gLSBjdXJyZW50UGFyYW1ldGVyKSwgbG1keSAqIChwYXJhbWV0ZXJNaW4gLSBjdXJyZW50UGFyYW1ldGVyKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxhc3RNb3ZlRHggPSBsbWR4O1xyXG4gICAgICAgIHRoaXMubGFzdE1vdmVEeSA9IGxtZHk7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBjb250YWluc1BvaW50KHg6IG51bWJlciwgeTogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmRpc3BsYXlPYmplY3QuZ2V0Qm91bmRzKCkuY29udGFpbnMoeCwgeSkpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGl0UG9seWdvbkluaXRpYWwgPT0gbnVsbCkgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmhpdFBvbHlnb25EaXJ0eSkgdGhpcy50cmFuc2Zvcm1IaXRQb2x5Z29uKCk7XHJcbiAgICAgICAgcmV0dXJuIHBvbHlnb25FbnRow6RsdFB1bmt0KHRoaXMuaGl0UG9seWdvblRyYW5zZm9ybWVkLCB7IHg6IHgsIHk6IHkgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdHJhbnNmb3JtSGl0UG9seWdvbigpIHtcclxuICAgICAgICBsZXQgcCA9IG5ldyBQSVhJLlBvaW50KHRoaXMuY2VudGVyWEluaXRpYWwsIHRoaXMuY2VudGVyWUluaXRpYWwpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC51cGRhdGVUcmFuc2Zvcm0oKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudHJhbnNmb3JtLndvcmxkVHJhbnNmb3JtLmFwcGx5KHAsIHApO1xyXG5cclxuICAgICAgICB0aGlzLmhpdFBvbHlnb25UcmFuc2Zvcm1lZCA9IFtdO1xyXG4gICAgICAgIGxldCBtID0gdGhpcy5kaXNwbGF5T2JqZWN0LnRyYW5zZm9ybS53b3JsZFRyYW5zZm9ybTtcclxuICAgICAgICBmb3IgKGxldCBwIG9mIHRoaXMuaGl0UG9seWdvbkluaXRpYWwpIHtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2x5Z29uVHJhbnNmb3JtZWQucHVzaCh7XHJcbiAgICAgICAgICAgICAgICB4OiAobS5hICogcC54KSArIChtLmMgKiBwLnkpICsgbS50eCxcclxuICAgICAgICAgICAgICAgIHk6IChtLmIgKiBwLngpICsgKG0uZCAqIHAueSkgKyBtLnR5XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnNldEhpdFBvbHlnb25EaXJ0eShmYWxzZSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGlzT3V0c2lkZVZpZXcoKSB7XHJcbiAgICAgICAgbGV0IGJvdW5kcyA9IHRoaXMuZGlzcGxheU9iamVjdC5nZXRCb3VuZHModHJ1ZSk7XHJcbiAgICAgICAgbGV0IHdoID0gdGhpcy53b3JsZEhlbHBlcjtcclxuICAgICAgICByZXR1cm4gYm91bmRzLnJpZ2h0IDwgd2guY3VycmVudExlZnQgfHwgYm91bmRzLmxlZnQgPiB3aC5jdXJyZW50TGVmdCArIHdoLmN1cnJlbnRXaWR0aFxyXG4gICAgICAgICAgICB8fCBib3VuZHMuYm90dG9tIDwgd2guY3VycmVudFRvcCB8fCBib3VuZHMudG9wID4gd2guY3VycmVudFRvcCArIHdoLmN1cnJlbnRIZWlnaHQ7XHJcbiAgICB9XHJcblxyXG4gICAgZGVmaW5lQ2VudGVyKHg6IG51bWJlciwgeTogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IHAgPSBuZXcgUElYSS5Qb2ludCh4LCB5KTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudHJhbnNmb3JtLndvcmxkVHJhbnNmb3JtLmFwcGx5SW52ZXJzZShwLCBwKTtcclxuICAgICAgICB0aGlzLmNlbnRlclhJbml0aWFsID0gcC54O1xyXG4gICAgICAgIHRoaXMuY2VudGVyWUluaXRpYWwgPSBwLnk7XHJcbiAgICB9XHJcblxyXG4gICAgZGVmaW5lQ2VudGVyUmVsYXRpdmUoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgYm91bmRzID0gdGhpcy5kaXNwbGF5T2JqZWN0LmdldEJvdW5kcyhmYWxzZSk7XHJcbiAgICAgICAgdGhpcy5kZWZpbmVDZW50ZXIoYm91bmRzLmxlZnQgKyBib3VuZHMud2lkdGggKiB4LCBib3VuZHMudG9wICsgYm91bmRzLmhlaWdodCAqIHkpO1xyXG4gICAgfVxyXG5cclxuICAgIG1vdmUoZHg6IG51bWJlciwgZHk6IG51bWJlcikge1xyXG5cclxuICAgICAgICBpZiAoZHggIT0gMCB8fCBkeSAhPSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdE1vdmVEeCA9IGR4O1xyXG4gICAgICAgICAgICB0aGlzLmxhc3RNb3ZlRHkgPSBkeTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS50cmFuc2xhdGUoZHgsIGR5KTtcclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudHJhbnNmb3JtLm9uQ2hhbmdlKCk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG4gICAgICAgIHRoaXMuc2V0SGl0UG9seWdvbkRpcnR5KHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZvcndhcmQoZGlzdGFuY2U6IG51bWJlcikge1xyXG4gICAgICAgIGxldCBkeCA9IGRpc3RhbmNlICogTWF0aC5jb3ModGhpcy5kaXJlY3Rpb25SYWQpO1xyXG4gICAgICAgIGxldCBkeSA9IC1kaXN0YW5jZSAqIE1hdGguc2luKHRoaXMuZGlyZWN0aW9uUmFkKTtcclxuICAgICAgICB0aGlzLm1vdmUoZHgsIGR5KTtcclxuICAgIH1cclxuXHJcbiAgICByb3RhdGUoYW5nbGVJbkRlZzogbnVtYmVyLCBjWD86IG51bWJlciwgY1k/OiBudW1iZXIpIHtcclxuXHJcbiAgICAgICAgaWYgKGNYID09IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IHAgPSBuZXcgUElYSS5Qb2ludCh0aGlzLmNlbnRlclhJbml0aWFsLCB0aGlzLmNlbnRlcllJbml0aWFsKTtcclxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLmFwcGx5KHAsIHApO1xyXG4gICAgICAgICAgICBjWCA9IHAueDtcclxuICAgICAgICAgICAgY1kgPSBwLnk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IHAgPSBuZXcgUElYSS5Qb2ludChjWCwgY1kpO1xyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7ICAgICAgIC8vIG5lY2Vzc2FyeSBpZiB3b3JsZCBjb29yZGluYXRlIHN5c3RlbSBpcyBzY2FsZWRcclxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnRyYW5zZm9ybS53b3JsZFRyYW5zZm9ybS5hcHBseUludmVyc2UocCwgcCk7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS5hcHBseShwLCBwKTtcclxuICAgICAgICAgICAgY1ggPSBwLng7XHJcbiAgICAgICAgICAgIGNZID0gcC55O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLnRyYW5zbGF0ZSgtY1gsIC1jWSk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLnJvdGF0ZSgtYW5nbGVJbkRlZyAvIDE4MCAqIE1hdGguUEkpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS50cmFuc2xhdGUoY1gsIGNZKTtcclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudHJhbnNmb3JtLm9uQ2hhbmdlKCk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG4gICAgICAgIHRoaXMuc2V0SGl0UG9seWdvbkRpcnR5KHRydWUpO1xyXG5cclxuICAgICAgICB0aGlzLmFuZ2xlICs9IGFuZ2xlSW5EZWc7XHJcbiAgICAgICAgdGhpcy5kaXJlY3Rpb25SYWQgKz0gYW5nbGVJbkRlZyAvIDE4MCAqIE1hdGguUEk7XHJcbiAgICB9XHJcblxyXG4gICAgbWlycm9yWFkoc2NhbGVYOiBudW1iZXIsIHNjYWxlWTogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IGNYOiBudW1iZXIsIGNZOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGxldCBwID0gbmV3IFBJWEkuUG9pbnQodGhpcy5jZW50ZXJYSW5pdGlhbCwgdGhpcy5jZW50ZXJZSW5pdGlhbCk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLmFwcGx5KHAsIHApO1xyXG4gICAgICAgIGNYID0gcC54O1xyXG4gICAgICAgIGNZID0gcC55O1xyXG5cclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0udHJhbnNsYXRlKC1jWCwgLWNZKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0uc2NhbGUoc2NhbGVYLCBzY2FsZVkpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS50cmFuc2xhdGUoY1gsIGNZKTtcclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudHJhbnNmb3JtLm9uQ2hhbmdlKCk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG5cclxuICAgICAgICB0aGlzLnNldEhpdFBvbHlnb25EaXJ0eSh0cnVlKTtcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHNjYWxlKGZhY3RvcjogbnVtYmVyLCBjWD86IG51bWJlciwgY1k/OiBudW1iZXIpIHtcclxuXHJcbiAgICAgICAgaWYgKGNYID09IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IHAgPSBuZXcgUElYSS5Qb2ludCh0aGlzLmNlbnRlclhJbml0aWFsLCB0aGlzLmNlbnRlcllJbml0aWFsKTtcclxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLmFwcGx5KHAsIHApO1xyXG4gICAgICAgICAgICBjWCA9IHAueDtcclxuICAgICAgICAgICAgY1kgPSBwLnk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IHAgPSBuZXcgUElYSS5Qb2ludChjWCwgY1kpO1xyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudHJhbnNmb3JtLndvcmxkVHJhbnNmb3JtLmFwcGx5SW52ZXJzZShwLCBwKTtcclxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLmFwcGx5KHAsIHApO1xyXG4gICAgICAgICAgICBjWCA9IHAueDtcclxuICAgICAgICAgICAgY1kgPSBwLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0udHJhbnNsYXRlKC1jWCwgLWNZKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QubG9jYWxUcmFuc2Zvcm0uc2NhbGUoZmFjdG9yLCBmYWN0b3IpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS50cmFuc2xhdGUoY1gsIGNZKTtcclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudHJhbnNmb3JtLm9uQ2hhbmdlKCk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG5cclxuICAgICAgICB0aGlzLnNldEhpdFBvbHlnb25EaXJ0eSh0cnVlKTtcclxuXHJcbiAgICAgICAgdGhpcy5zY2FsZUZhY3RvciAqPSBmYWN0b3I7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRDZW50ZXJYKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHAgPSBuZXcgUElYSS5Qb2ludCh0aGlzLmNlbnRlclhJbml0aWFsLCB0aGlzLmNlbnRlcllJbml0aWFsKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcbiAgICAgICAgLy8gdGhpcy5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLmFwcGx5KHAsIHApO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ud29ybGRUcmFuc2Zvcm0uYXBwbHkocCwgcCk7XHJcbiAgICAgICAgcmV0dXJuIHAueDtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0Q2VudGVyWSgpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBwID0gbmV3IFBJWEkuUG9pbnQodGhpcy5jZW50ZXJYSW5pdGlhbCwgdGhpcy5jZW50ZXJZSW5pdGlhbCk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ud29ybGRUcmFuc2Zvcm0uYXBwbHkocCwgcCk7XHJcbiAgICAgICAgcmV0dXJuIHAueTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYWJzdHJhY3QgcmVuZGVyKCk6IHZvaWQ7XHJcblxyXG4gICAgcHVibGljIGRlc3Ryb3koKTogdm9pZCB7XHJcbiAgICAgICAgc3VwZXIuZGVzdHJveSgpO1xyXG4gICAgICAgIGlmICh0aGlzLmJlbG9uZ3NUb0dyb3VwICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5iZWxvbmdzVG9Hcm91cC5yZW1vdmUodGhpcy5ydW50aW1lT2JqZWN0KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgaW5kZXggPSB0aGlzLndvcmxkSGVscGVyLnNoYXBlcy5pbmRleE9mKHRoaXMpO1xyXG4gICAgICAgICAgICBpZiAoaW5kZXggPj0gMCkgdGhpcy53b3JsZEhlbHBlci5zaGFwZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBpbmRleDEgPSB0aGlzLndvcmxkSGVscGVyLnNoYXBlc05vdEFmZmVjdGVkQnlXb3JsZFRyYW5zZm9ybXMuaW5kZXhPZih0aGlzKTtcclxuICAgICAgICBpZiAoaW5kZXgxID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy53b3JsZEhlbHBlci5zaGFwZXNOb3RBZmZlY3RlZEJ5V29ybGRUcmFuc2Zvcm1zLnNwbGljZShpbmRleDEsIDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29sbGlkaW5nU2hhcGVzKGdyb3VwSGVscGVyOiBHcm91cEhlbHBlciwgc2hhcGVUeXBlOiBUeXBlKTogYW55IHtcclxuICAgICAgICBsZXQgY29sbGlkaW5nU2hhcGVzOiBWYWx1ZVtdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgc2hhcGUgb2YgZ3JvdXBIZWxwZXIuc2hhcGVzKSB7XHJcbiAgICAgICAgICAgIGxldCBzaGFwZUhlbHBlcjogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICBpZiAoc2hhcGVIZWxwZXIuY29sbGlkZXNXaXRoKHRoaXMpKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRpbmdTaGFwZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogc2hhcGVUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBzaGFwZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb2xsaWRpbmdTaGFwZXM7XHJcbiAgICB9XHJcblxyXG4gICAgYWJzdHJhY3QgZ2V0Q29weShrbGFzczogS2xhc3MpOiBSdW50aW1lT2JqZWN0O1xyXG5cclxuICAgIGdldEhpdFBvbHlnb24odmVjdG9yMkNsYXNzOiBLbGFzcyk6IFZhbHVlW10ge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5oaXRQb2x5Z29uRGlydHkpIHtcclxuICAgICAgICAgICAgdGhpcy50cmFuc2Zvcm1IaXRQb2x5Z29uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcmV0OiBWYWx1ZVtdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgcCBvZiB0aGlzLmhpdFBvbHlnb25UcmFuc2Zvcm1lZCkge1xyXG4gICAgICAgICAgICBsZXQgcm8gPSBuZXcgUnVudGltZU9iamVjdCh2ZWN0b3IyQ2xhc3MpO1xyXG4gICAgICAgICAgICByby5hdHRyaWJ1dGVzID0gW3sgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgdmFsdWU6IHAueCB9LCB7IHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIHZhbHVlOiBwLnkgfV07XHJcbiAgICAgICAgICAgIHJldC5wdXNoKHsgdHlwZTogdmVjdG9yMkNsYXNzLCB2YWx1ZTogcm8gfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgfVxyXG5cclxuICAgIHNldFN0YXRpYyhpc1N0YXRpYzogYm9vbGVhbikge1xyXG4gICAgICAgIGxldCBsaXN0ID0gdGhpcy53b3JsZEhlbHBlci5zaGFwZXNOb3RBZmZlY3RlZEJ5V29ybGRUcmFuc2Zvcm1zO1xyXG4gICAgICAgIGlmIChpc1N0YXRpYykge1xyXG4gICAgICAgICAgICBsaXN0LnB1c2godGhpcyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IGluZGV4ID0gbGlzdC5pbmRleE9mKHRoaXMpO1xyXG4gICAgICAgICAgICBpZiAoaW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgbGlzdC5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldFBhcmVudEdyb3VwKCk6IFJ1bnRpbWVPYmplY3Qge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJlbG9uZ3NUb0dyb3VwPy5ydW50aW1lT2JqZWN0IHx8IG51bGxcclxuICAgIH1cclxuXHJcblxyXG5cclxufVxyXG4iXX0=