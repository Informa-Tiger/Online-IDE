import { Klass, Visibility } from "../../compiler/types/Class.js";
import { intPrimitiveType, booleanPrimitiveType, voidPrimitiveType } from "../../compiler/types/PrimitiveTypes.js";
import { Method, Parameterlist, Attribute } from "../../compiler/types/Types.js";
import { RuntimeObject } from "../../interpreter/RuntimeObject.js";
import { ShapeHelper } from "./Shape.js";
import { ArrayType } from "../../compiler/types/Array.js";
export class CollisionPairClass extends Klass {
    constructor(module) {
        super("CollisionPair", module, "Speichert die Referenzen auf zwei Figuren, die gerade kollidiert sind. Diese Klasse von den Kollisionsmethden der Klasse Group benutzt.");
        this.setBaseClass(module.typeStore.getType("Object"));
        let shapeType = module.typeStore.getType("Shape");
        this.addAttribute(new Attribute("shapeA", shapeType, (value) => {
            let rto = value.object;
            value.value = rto.intrinsicData["ShapeA"];
        }, false, Visibility.public, true, "Erstes an der Kollision beteiligtes Shape"));
        this.addAttribute(new Attribute("shapeB", shapeType, (value) => {
            let rto = value.object;
            value.value = rto.intrinsicData["ShapeB"];
        }, false, Visibility.public, true, "Zweites an der Kollision beteiligtes Shape"));
        this.setupAttributeIndicesRecursive();
    }
}
export class GroupClass extends Klass {
    constructor(module) {
        super("Group", module, "Klasse zum Gruppieren grafischer Elemente. Die gruppierten Elemente können miteinander verschoben, gedreht, gestreckt sowie ein- und ausgeblendet werden. Zudem besitzt die Klasse Methoden zur schnellen Erkennung von Kollision mit Elementen außerhalb der Gruppe.");
        this.setBaseClass(module.typeStore.getType("Shape"));
        let collisionPairType = module.typeStore.getType("CollisionPair");
        let collisionPairArrayType = new ArrayType(collisionPairType);
        let shapeType = module.typeStore.getType("Shape");
        this.addMethod(new Method("Group", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let rh = new GroupHelper(module.main.getInterpreter(), o);
            o.intrinsicData["Actor"] = rh;
        }, false, false, 'Instanziert eine neue Gruppe. Ihr können mit der Methode add Elemente hinzugefügt werden, die dann mit der Gruppe verschoben, gedreht, ... werden.', true));
        this.addMethod(new Method("Group", new Parameterlist([
            { identifier: "shapes", type: new ArrayType(module.typeStore.getType("Shape")), declaration: null, usagePositions: null, isFinal: true, isEllipsis: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let shapes = parameters[1].value;
            let rh = new GroupHelper(module.main.getInterpreter(), o);
            o.intrinsicData["Actor"] = rh;
            for (let s of shapes) {
                rh.add(s.value);
            }
        }, false, false, 'Instanziert eine neue Gruppe und fügt die übergebenen Grafikobjekte der Gruppe hinzu. Der Gruppe können mit der Methode add weitere Grafikobjekte hinzugefügt werden, die dann mit der Gruppe verschoben, gedreht, ... werden.', true));
        this.addMethod(new Method("add", new Parameterlist([
            { identifier: "shapes", type: new ArrayType(shapeType), declaration: null, usagePositions: null, isFinal: true, isEllipsis: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let shapes = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("add"))
                return;
            for (let s of shapes) {
                sh.add(s.value);
            }
        }, false, false, 'Fügt die Grafikobjekte der Gruppe hinzu.', false));
        this.addMethod(new Method("get", new Parameterlist([
            { identifier: "index", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), shapeType, (parameters) => {
            let o = parameters[0].value;
            let index = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("get"))
                return;
            return sh.getElement(index);
        }, false, false, 'Gibt das Grafikelement der Gruppe mit dem entsprechenden Index zurück. VORSICHT: Das erste Element hat Index 0!', false));
        this.addMethod(new Method("remove", new Parameterlist([
            { identifier: "index", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let index = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            sh.removeElementAt(index);
        }, false, false, 'Entfernt das Grafikelement aus der Gruppe mit dem entsprechenden Index, zerstört es jedoch nicht. VORSICHT: Das erste Element hat Index 0!', false));
        this.addMethod(new Method("remove", new Parameterlist([
            { identifier: "shape", type: shapeType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let shape = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("remove"))
                return;
            sh.remove(shape);
            sh.worldHelper.shapes.push(shape.intrinsicData["Actor"]);
        }, false, false, 'Entfernt das übergebene Grafikelement aus der Gruppe, zerstört es jedoch nicht.', false));
        let shapeArrayType = new ArrayType(shapeType);
        this.addMethod(new Method("getCollidingShapes", new Parameterlist([
            { identifier: "shape", type: module.typeStore.getType("Shape"), declaration: null, usagePositions: null, isFinal: true },
        ]), shapeArrayType, (parameters) => {
            let o = parameters[0].value;
            let shape = parameters[1].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("getCollidingShapes") || shape == null)
                return [];
            let shapes = sh.getCollidingObjects(shape);
            let values = [];
            for (let sh of shapes) {
                values.push({
                    type: shapeType,
                    value: sh
                });
            }
            return values;
        }, false, false, 'Gibt die Objekte der Gruppe zurück, die mit dem übergebenen Shape kollidieren.', false));
        this.addMethod(new Method("getCollisionPairs", new Parameterlist([
            { identifier: "group", type: this, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "maxOneCollisionPerShape", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), collisionPairArrayType, (parameters) => {
            let o = parameters[0].value;
            let group2 = parameters[1].value;
            let maxOneCollisionPerShape = parameters[2].value;
            let sh = o.intrinsicData["Actor"];
            let groupHelper2 = group2.intrinsicData["Actor"];
            if (sh.testdestroyed("getCollidingShapes"))
                return;
            return sh.getCollidingObjects2(groupHelper2, collisionPairType, maxOneCollisionPerShape);
        }, false, false, 'Überprüft, welche Objekte der Gruppe mit welchen der anderen kollidieren.' +
            ' Gibt für jede Kollision ein Collisionpair-Objekt zurück, das die beiden kollidierenden Objekte enthält.' +
            ' Falls maxOneCollisionPerShape == true ist jedes Objekt dabei aber nur in max. einem Collisionpair-Objekt enthalten.', false));
        this.addMethod(new Method("size", new Parameterlist([]), intPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("size"))
                return;
            return sh.shapes.length;
        }, false, false, 'Gibt zurück, wie viele Elemente in der Gruppe enthalten sind.', false));
        this.addMethod(new Method("empty", new Parameterlist([]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("empty"))
                return;
            sh.removeAllChidren();
        }, false, false, 'Entfernt alle Elemente aus der Gruppe, löscht die Elemente aber nicht.', false));
        this.addMethod(new Method("destroyAllChildren", new Parameterlist([]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("destroyAllChildren"))
                return;
            sh.destroyChildren();
        }, false, false, 'Löscht alle Elemente der Gruppe, nicht aber die Gruppe selbst.', false));
        shapeType.addMethod(new Method("getCollidingShapes", new Parameterlist([
            { identifier: "group", type: this, declaration: null, usagePositions: null, isFinal: true },
        ]), shapeArrayType, (parameters) => {
            let o = parameters[0].value;
            let group = parameters[1].value;
            let groupHelper = group.intrinsicData["Actor"];
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("getCollidingShapes"))
                return;
            return sh.getCollidingShapes(groupHelper, shapeType);
        }, false, false, 'Gibt alle Shapes der Gruppe group zurück, die mit dem Shape kollidieren.', false));
        this.addMethod(new Method("copy", new Parameterlist([]), this, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("copy"))
                return;
            return sh.getCopy(o.class);
        }, false, false, 'Erstellt eine Kopie des Group-Objekts (und aller seiner enthaltenen Grafikobjekte!) und git sie zurück.', false));
        this.addMethod(new Method("renderAsStaticBitmap", new Parameterlist([
            { identifier: "renderAsStaticBitmap", type: booleanPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), this, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            let doCache = parameters[1].value;
            if (sh.testdestroyed("renderAsStaticBitmap"))
                return;
            sh.cacheAsBitmap(doCache);
            return;
        }, false, false, 'Zeichnet alle Objekte dieser Group in ein Bild und verwendet fortan nur noch dieses Bild, ohne die Kindelemente der Group erneut zu zeichnen. Mit dieser Methode können komplexe Bilder (z.B. ein Sternenhimmel) aufgebaut und dann statisch gemacht werden. Nach dem Aufbau brauchen sie daher kaum mehr Rechenzeit.', false));
        shapeType.addMethod(new Method("getParentGroup", new Parameterlist([]), this, (parameters) => {
            let o = parameters[0].value;
            let sh = o.intrinsicData["Actor"];
            if (sh.testdestroyed("getParentGroup"))
                return;
            return sh.getParentGroup();
        }, false, false, 'Gibt die Group zurück, in der sich das Grafikobjekt befindet, bzw. null, falls es in keiner Group ist.', false));
    }
}
export class GroupHelper extends ShapeHelper {
    constructor(interpreter, runtimeObject) {
        super(interpreter, runtimeObject);
        this.shapes = [];
        this.displayObject = new PIXI.Container();
        this.worldHelper.stage.addChild(this.displayObject);
        this.addToDefaultGroupAndSetDefaultVisibility();
    }
    setChildIndex(sh, index) {
        let container = this.displayObject;
        container.setChildIndex(sh.displayObject, index);
        let oldIndex = this.shapes.indexOf(sh.runtimeObject);
        this.shapes.splice(oldIndex, 1);
        this.shapes.splice(index, 0, sh.runtimeObject);
    }
    cacheAsBitmap(doCache) {
        let container = this.displayObject;
        // If you set doCache to false and shortly afterwards to true: 
        // make shure there's at least one rendercycle in between.
        if (doCache) {
            setTimeout(() => {
                container.cacheAsBitmap = true;
            }, 300);
        }
        else {
            container.cacheAsBitmap = doCache;
        }
    }
    removeElementAt(index) {
        if (index < 0 || index >= this.shapes.length) {
            this.worldHelper.interpreter.throwException("In der Gruppe gibt es kein Element mit Index " + index + ".");
            return;
        }
        let shape = this.shapes[index];
        this.remove(shape);
    }
    getElement(index) {
        if (index < 0 || index >= this.shapes.length) {
            this.worldHelper.interpreter.throwException("In der Gruppe gibt es kein Element mit Index " + index + ".");
            return;
        }
        return this.shapes[index];
    }
    getCopy(klass) {
        let ro = new RuntimeObject(klass);
        let groupHelperCopy = new GroupHelper(this.worldHelper.interpreter, ro);
        ro.intrinsicData["Actor"] = groupHelperCopy;
        for (let ro of this.shapes) {
            let shapeHelper = ro.intrinsicData["Actor"];
            let roCopy = shapeHelper.getCopy(ro.class);
            let shapeHelperCopy = roCopy.intrinsicData["Actor"];
            groupHelperCopy.shapes.push(roCopy);
            shapeHelperCopy.belongsToGroup = groupHelperCopy;
            groupHelperCopy.displayObject.addChild(shapeHelperCopy.displayObject);
        }
        groupHelperCopy.copyFrom(this);
        groupHelperCopy.render();
        return ro;
    }
    setTimerPaused(tp) {
        this.timerPaused = tp;
        for (let shape of this.shapes) {
            let sh = shape.intrinsicData["Actor"];
            sh.timerPaused = tp;
        }
    }
    add(shape) {
        if (shape == null)
            return;
        let shapeHelper = shape.intrinsicData["Actor"];
        if (shapeHelper.isDestroyed) {
            this.worldHelper.interpreter.throwException("Ein schon zerstörtes Objekt kann keiner Gruppe hinzugefügt werden.");
            return;
        }
        if (this.hasCircularReference(shape)) {
            return;
        }
        this.shapes.push(shape);
        if (shapeHelper.belongsToGroup != null) {
            shapeHelper.belongsToGroup.remove(shape);
        }
        else {
            let index = this.worldHelper.shapes.indexOf(shapeHelper);
            if (index >= 0)
                this.worldHelper.shapes.splice(index, 1);
        }
        shapeHelper.belongsToGroup = this;
        this.displayObject.parent.updateTransform();
        let inverse = new PIXI.Matrix().copyFrom(this.displayObject.transform.worldTransform);
        inverse.invert();
        shapeHelper.displayObject.localTransform.prepend(inverse.prepend(this.worldHelper.stage.localTransform));
        //@ts-ignore
        shapeHelper.displayObject.transform.onChange();
        this.displayObject.addChild(shapeHelper.displayObject);
        shapeHelper.displayObject.updateTransform();
        let xSum = 0;
        let ySum = 0;
        for (let shape of this.shapes) {
            let sh = shape.intrinsicData["Actor"];
            xSum += sh.getCenterX();
            ySum += sh.getCenterY();
        }
        let x = xSum / this.shapes.length;
        let y = ySum / this.shapes.length;
        this.displayObject.updateTransform();
        let p1 = this.displayObject.worldTransform.applyInverse(new PIXI.Point(x, y));
        this.centerXInitial = p1.x;
        this.centerYInitial = p1.y;
    }
    removeAllChidren() {
        let index = 0;
        for (let shape of this.shapes) {
            this.deregister(shape, index++);
        }
        this.shapes = [];
    }
    remove(shape) {
        let index = this.shapes.indexOf(shape);
        if (index >= 0) {
            this.shapes.splice(index, 1);
            this.deregister(shape, index);
        }
    }
    deregister(shape, index) {
        let shapeHelper = shape.intrinsicData['Actor'];
        let transform = new PIXI.Matrix().copyFrom(shapeHelper.displayObject.transform.worldTransform);
        this.displayObject.removeChild(shapeHelper.displayObject);
        let inverseStageTransform = new PIXI.Matrix().copyFrom(this.worldHelper.stage.localTransform);
        inverseStageTransform.invert();
        shapeHelper.displayObject.localTransform.identity();
        shapeHelper.displayObject.localTransform.append(transform.prepend(inverseStageTransform));
        //@ts-ignore
        shapeHelper.displayObject.transform.onChange();
        this.worldHelper.stage.addChild(shapeHelper.displayObject);
        shapeHelper.displayObject.updateTransform();
        shapeHelper.belongsToGroup = null;
    }
    render() {
    }
    destroy() {
        this.destroyChildren();
        super.destroy();
    }
    destroyChildren() {
        for (let shape of this.shapes.slice(0)) {
            let sh = shape.intrinsicData["Actor"];
            sh.destroy();
        }
        this.shapes = [];
    }
    hasOverlappingBoundingBoxWith(shapeHelper) {
        this.displayObject.updateTransform();
        shapeHelper.displayObject.updateTransform();
        let bb = this.displayObject.getBounds();
        let bb1 = shapeHelper.displayObject.getBounds();
        if (bb.left > bb1.right || bb1.left > bb.right)
            return false;
        if (bb.top > bb1.bottom || bb1.top > bb.bottom)
            return false;
        return true;
    }
    collidesWith(shapeHelper) {
        if (!this.hasOverlappingBoundingBoxWith(shapeHelper)) {
            return false;
        }
        for (let shape of this.shapes) {
            let sh = shape.intrinsicData["Actor"];
            if (sh.collidesWith(shapeHelper)) {
                return true;
            }
        }
        return false;
    }
    setHitPolygonDirty(dirty) {
        for (let shape of this.shapes) {
            let sh = shape.intrinsicData["Actor"];
            sh.setHitPolygonDirty(dirty);
        }
    }
    containsPoint(x, y) {
        this.displayObject.updateTransform();
        let bb = this.displayObject.getBounds();
        if (x < bb.left || x > bb.left + bb.width || y < bb.top || y > bb.top + bb.height) {
            return false;
        }
        for (let shape of this.shapes) {
            let sh = shape.intrinsicData["Actor"];
            if (sh.containsPoint(x, y)) {
                return true;
            }
        }
        return false;
    }
    getCollidingObjects(shape) {
        let collidingShapes = [];
        let shapeHelper = shape.intrinsicData["Actor"];
        for (let s of this.shapes) {
            let sh = s.intrinsicData["Actor"];
            if (sh.collidesWith(shapeHelper)) {
                collidingShapes.push(s);
            }
        }
        return collidingShapes;
    }
    getCollidingObjects2(groupHelper2, collisionPairType, maxOneCollisionPerShape) {
        let collisionPairs = [];
        let alreadyCollidedHelpers2 = new Map();
        for (let shape1 of this.shapes) {
            let shapeHelper1 = shape1.intrinsicData["Actor"];
            for (let shape2 of groupHelper2.shapes) {
                let shapeHelper2 = shape2.intrinsicData["Actor"];
                if (shapeHelper1.collidesWith(shapeHelper2)) {
                    if (!maxOneCollisionPerShape || alreadyCollidedHelpers2.get(shapeHelper2) == null) {
                        alreadyCollidedHelpers2.set(shapeHelper2, true);
                        let rto = new RuntimeObject(collisionPairType);
                        rto.intrinsicData["ShapeA"] = shapeHelper1.runtimeObject;
                        rto.intrinsicData["ShapeB"] = shapeHelper2.runtimeObject;
                        collisionPairs.push({
                            type: collisionPairType,
                            value: rto
                        });
                    }
                    if (maxOneCollisionPerShape) {
                        break;
                    }
                }
            }
        }
        return collisionPairs;
    }
    hasCircularReference(shapeToAdd) {
        let gh = shapeToAdd.intrinsicData["Actor"];
        if (gh instanceof GroupHelper) {
            if (gh == this) {
                this.worldHelper.interpreter.throwException("Eine Group darf sich nicht selbst enthalten!");
                return true;
            }
            else {
                for (let shape of gh.shapes) {
                    if (this.hasCircularReference(shape)) {
                        return true;
                    }
                    ;
                }
            }
        }
        return false;
    }
    tint(color) {
        for (let child of this.shapes) {
            child.intrinsicData["Actor"].tint(color);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JvdXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL0dyb3VwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbEUsT0FBTyxFQUF1QixnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hJLE9BQU8sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFTLFNBQVMsRUFBUSxNQUFNLCtCQUErQixDQUFDO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUluRSxPQUFPLEVBQUUsV0FBVyxFQUFjLE1BQU0sWUFBWSxDQUFDO0FBRXJELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUcxRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsS0FBSztJQUV6QyxZQUFZLE1BQWM7UUFFdEIsS0FBSyxDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQUUseUlBQXlJLENBQUMsQ0FBQztRQUUxSyxJQUFJLENBQUMsWUFBWSxDQUFRLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFN0QsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUMvQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBRU4sSUFBSSxHQUFHLEdBQWtCLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDdEMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTlDLENBQUMsRUFBRSxLQUFL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cm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBLbGFzcywgVmlzaWJpbGl0eSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBkb3VibGVQcmltaXRpdmVUeXBlLCBpbnRQcmltaXRpdmVUeXBlLCBib29sZWFuUHJpbWl0aXZlVHlwZSwgdm9pZFByaW1pdGl2ZVR5cGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvUHJpbWl0aXZlVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgTWV0aG9kLCBQYXJhbWV0ZXJsaXN0LCBWYWx1ZSwgQXR0cmlidXRlLCBUeXBlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL1R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IFJ1bnRpbWVPYmplY3QgfSBmcm9tIFwiLi4vLi4vaW50ZXJwcmV0ZXIvUnVudGltZU9iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBGaWxsZWRTaGFwZUhlbHBlciB9IGZyb20gXCIuL0ZpbGxlZFNoYXBlLmpzXCI7XHJcbmltcG9ydCB7IFdvcmxkSGVscGVyIH0gZnJvbSBcIi4vV29ybGQuanNcIjtcclxuaW1wb3J0IHsgRW51bVJ1bnRpbWVPYmplY3QgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvRW51bS5qc1wiO1xyXG5pbXBvcnQgeyBTaGFwZUhlbHBlciwgU2hhcGVDbGFzcyB9IGZyb20gXCIuL1NoYXBlLmpzXCI7XHJcbmltcG9ydCB7IEhpdFBvbHlnb25TdG9yZSB9IGZyb20gXCIuL1BvbHlnb25TdG9yZS5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheVR5cGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvQXJyYXkuanNcIjtcclxuaW1wb3J0IHsgSW50ZXJwcmV0ZXIgfSBmcm9tIFwiLi4vLi4vaW50ZXJwcmV0ZXIvSW50ZXJwcmV0ZXIuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb2xsaXNpb25QYWlyQ2xhc3MgZXh0ZW5kcyBLbGFzcyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IobW9kdWxlOiBNb2R1bGUpIHtcclxuXHJcbiAgICAgICAgc3VwZXIoXCJDb2xsaXNpb25QYWlyXCIsIG1vZHVsZSwgXCJTcGVpY2hlcnQgZGllIFJlZmVyZW56ZW4gYXVmIHp3ZWkgRmlndXJlbiwgZGllIGdlcmFkZSBrb2xsaWRpZXJ0IHNpbmQuIERpZXNlIEtsYXNzZSB2b24gZGVuIEtvbGxpc2lvbnNtZXRoZGVuIGRlciBLbGFzc2UgR3JvdXAgYmVudXR6dC5cIik7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0QmFzZUNsYXNzKDxLbGFzcz5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJPYmplY3RcIikpO1xyXG5cclxuICAgICAgICBsZXQgc2hhcGVUeXBlID0gbW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiU2hhcGVcIik7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQXR0cmlidXRlKG5ldyBBdHRyaWJ1dGUoXCJzaGFwZUFcIiwgc2hhcGVUeXBlLFxyXG4gICAgICAgICAgICAodmFsdWUpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcnRvOiBSdW50aW1lT2JqZWN0ID0gdmFsdWUub2JqZWN0O1xyXG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWUgPSBydG8uaW50cmluc2ljRGF0YVtcIlNoYXBlQVwiXTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBWaXNpYmlsaXR5LnB1YmxpYywgdHJ1ZSwgXCJFcnN0ZXMgYW4gZGVyIEtvbGxpc2lvbiBiZXRlaWxpZ3RlcyBTaGFwZVwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQXR0cmlidXRlKG5ldyBBdHRyaWJ1dGUoXCJzaGFwZUJcIiwgc2hhcGVUeXBlLFxyXG4gICAgICAgICAgICAodmFsdWUpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcnRvOiBSdW50aW1lT2JqZWN0ID0gdmFsdWUub2JqZWN0O1xyXG4gICAgICAgICAgICAgICAgdmFsdWUudmFsdWUgPSBydG8uaW50cmluc2ljRGF0YVtcIlNoYXBlQlwiXTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBWaXNpYmlsaXR5LnB1YmxpYywgdHJ1ZSwgXCJad2VpdGVzIGFuIGRlciBLb2xsaXNpb24gYmV0ZWlsaWd0ZXMgU2hhcGVcIikpO1xyXG5cclxuICAgICAgICB0aGlzLnNldHVwQXR0cmlidXRlSW5kaWNlc1JlY3Vyc2l2ZSgpO1xyXG5cclxuICAgIH1cclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgY2xhc3MgR3JvdXBDbGFzcyBleHRlbmRzIEtsYXNzIHtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihtb2R1bGU6IE1vZHVsZSkge1xyXG5cclxuICAgICAgICBzdXBlcihcIkdyb3VwXCIsIG1vZHVsZSwgXCJLbGFzc2UgenVtIEdydXBwaWVyZW4gZ3JhZmlzY2hlciBFbGVtZW50ZS4gRGllIGdydXBwaWVydGVuIEVsZW1lbnRlIGvDtm5uZW4gbWl0ZWluYW5kZXIgdmVyc2Nob2JlbiwgZ2VkcmVodCwgZ2VzdHJlY2t0IHNvd2llIGVpbi0gdW5kIGF1c2dlYmxlbmRldCB3ZXJkZW4uIFp1ZGVtIGJlc2l0enQgZGllIEtsYXNzZSBNZXRob2RlbiB6dXIgc2NobmVsbGVuIEVya2VubnVuZyB2b24gS29sbGlzaW9uIG1pdCBFbGVtZW50ZW4gYXXDn2VyaGFsYiBkZXIgR3J1cHBlLlwiKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRCYXNlQ2xhc3MoPEtsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlNoYXBlXCIpKTtcclxuXHJcbiAgICAgICAgbGV0IGNvbGxpc2lvblBhaXJUeXBlID0gbW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiQ29sbGlzaW9uUGFpclwiKTtcclxuICAgICAgICBsZXQgY29sbGlzaW9uUGFpckFycmF5VHlwZSA9IG5ldyBBcnJheVR5cGUoY29sbGlzaW9uUGFpclR5cGUpO1xyXG4gICAgICAgIGxldCBzaGFwZVR5cGUgPSBtb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJTaGFwZVwiKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJHcm91cFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCByaCA9IG5ldyBHcm91cEhlbHBlcihtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLCBvKTtcclxuICAgICAgICAgICAgICAgIG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdID0gcmg7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdJbnN0YW56aWVydCBlaW5lIG5ldWUgR3J1cHBlLiBJaHIga8O2bm5lbiBtaXQgZGVyIE1ldGhvZGUgYWRkIEVsZW1lbnRlIGhpbnp1Z2Vmw7xndCB3ZXJkZW4sIGRpZSBkYW5uIG1pdCBkZXIgR3J1cHBlIHZlcnNjaG9iZW4sIGdlZHJlaHQsIC4uLiB3ZXJkZW4uJywgdHJ1ZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiR3JvdXBcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwic2hhcGVzXCIsIHR5cGU6IG5ldyBBcnJheVR5cGUobW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiU2hhcGVcIikpLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUsIGlzRWxsaXBzaXM6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGVzOiBWYWx1ZVtdID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSBuZXcgR3JvdXBIZWxwZXIobW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKSwgbyk7XHJcbiAgICAgICAgICAgICAgICBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXSA9IHJoO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHMgb2Ygc2hhcGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmguYWRkKHMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnSW5zdGFuemllcnQgZWluZSBuZXVlIEdydXBwZSB1bmQgZsO8Z3QgZGllIMO8YmVyZ2ViZW5lbiBHcmFmaWtvYmpla3RlIGRlciBHcnVwcGUgaGluenUuIERlciBHcnVwcGUga8O2bm5lbiBtaXQgZGVyIE1ldGhvZGUgYWRkIHdlaXRlcmUgR3JhZmlrb2JqZWt0ZSBoaW56dWdlZsO8Z3Qgd2VyZGVuLCBkaWUgZGFubiBtaXQgZGVyIEdydXBwZSB2ZXJzY2hvYmVuLCBnZWRyZWh0LCAuLi4gd2VyZGVuLicsIHRydWUpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImFkZFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJzaGFwZXNcIiwgdHlwZTogbmV3IEFycmF5VHlwZShzaGFwZVR5cGUpLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUsIGlzRWxsaXBzaXM6IHRydWUgfSxcclxuXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlczogVmFsdWVbXSA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IEdyb3VwSGVscGVyID0gPEdyb3VwSGVscGVyPm8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiYWRkXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgcyBvZiBzaGFwZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBzaC5hZGQocy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdGw7xndCBkaWUgR3JhZmlrb2JqZWt0ZSBkZXIgR3J1cHBlIGhpbnp1LicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJnZXRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiaW5kZXhcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcblxyXG4gICAgICAgIF0pLCBzaGFwZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGluZGV4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBHcm91cEhlbHBlciA9IDxHcm91cEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImdldFwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5nZXRFbGVtZW50KGluZGV4KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0dpYnQgZGFzIEdyYWZpa2VsZW1lbnQgZGVyIEdydXBwZSBtaXQgZGVtIGVudHNwcmVjaGVuZGVuIEluZGV4IHp1csO8Y2suIFZPUlNJQ0hUOiBEYXMgZXJzdGUgRWxlbWVudCBoYXQgSW5kZXggMCEnLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwicmVtb3ZlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImluZGV4XCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG5cclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IEdyb3VwSGVscGVyID0gPEdyb3VwSGVscGVyPm8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnJlbW92ZUVsZW1lbnRBdChpbmRleCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdFbnRmZXJudCBkYXMgR3JhZmlrZWxlbWVudCBhdXMgZGVyIEdydXBwZSBtaXQgZGVtIGVudHNwcmVjaGVuZGVuIEluZGV4LCB6ZXJzdMO2cnQgZXMgamVkb2NoIG5pY2h0LiBWT1JTSUNIVDogRGFzIGVyc3RlIEVsZW1lbnQgaGF0IEluZGV4IDAhJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInJlbW92ZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJzaGFwZVwiLCB0eXBlOiBzaGFwZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG5cclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGU6IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBHcm91cEhlbHBlciA9IDxHcm91cEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInJlbW92ZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLnJlbW92ZShzaGFwZSk7XHJcbiAgICAgICAgICAgICAgICBzaC53b3JsZEhlbHBlci5zaGFwZXMucHVzaChzaGFwZS5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl0pO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnRW50ZmVybnQgZGFzIMO8YmVyZ2ViZW5lIEdyYWZpa2VsZW1lbnQgYXVzIGRlciBHcnVwcGUsIHplcnN0w7ZydCBlcyBqZWRvY2ggbmljaHQuJywgZmFsc2UpKTtcclxuXHJcblxyXG4gICAgICAgIGxldCBzaGFwZUFycmF5VHlwZSA9IG5ldyBBcnJheVR5cGUoc2hhcGVUeXBlKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImdldENvbGxpZGluZ1NoYXBlc1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJzaGFwZVwiLCB0eXBlOiBtb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJTaGFwZVwiKSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcblxyXG4gICAgICAgIF0pLCBzaGFwZUFycmF5VHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGU6IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBHcm91cEhlbHBlciA9IDxHcm91cEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImdldENvbGxpZGluZ1NoYXBlc1wiKSB8fCBzaGFwZSA9PSBudWxsKSByZXR1cm4gW107XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlczogUnVudGltZU9iamVjdFtdID0gc2guZ2V0Q29sbGlkaW5nT2JqZWN0cyhzaGFwZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlczogVmFsdWVbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgc2ggb2Ygc2hhcGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBzaGFwZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBzaFxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdHaWJ0IGRpZSBPYmpla3RlIGRlciBHcnVwcGUgenVyw7xjaywgZGllIG1pdCBkZW0gw7xiZXJnZWJlbmVuIFNoYXBlIGtvbGxpZGllcmVuLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJnZXRDb2xsaXNpb25QYWlyc1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJncm91cFwiLCB0eXBlOiB0aGlzLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIm1heE9uZUNvbGxpc2lvblBlclNoYXBlXCIsIHR5cGU6IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgY29sbGlzaW9uUGFpckFycmF5VHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZ3JvdXAyOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBtYXhPbmVDb2xsaXNpb25QZXJTaGFwZTogYm9vbGVhbiA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IEdyb3VwSGVscGVyID0gPEdyb3VwSGVscGVyPm8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGdyb3VwSGVscGVyMjogR3JvdXBIZWxwZXIgPSA8R3JvdXBIZWxwZXI+Z3JvdXAyLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImdldENvbGxpZGluZ1NoYXBlc1wiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5nZXRDb2xsaWRpbmdPYmplY3RzMihncm91cEhlbHBlcjIsIGNvbGxpc2lvblBhaXJUeXBlLCBtYXhPbmVDb2xsaXNpb25QZXJTaGFwZSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICfDnGJlcnByw7xmdCwgd2VsY2hlIE9iamVrdGUgZGVyIEdydXBwZSBtaXQgd2VsY2hlbiBkZXIgYW5kZXJlbiBrb2xsaWRpZXJlbi4nICtcclxuICAgICAgICAgICAgJyBHaWJ0IGbDvHIgamVkZSBLb2xsaXNpb24gZWluIENvbGxpc2lvbnBhaXItT2JqZWt0IHp1csO8Y2ssIGRhcyBkaWUgYmVpZGVuIGtvbGxpZGllcmVuZGVuIE9iamVrdGUgZW50aMOkbHQuJyArXHJcbiAgICAgICAgJyBGYWxscyBtYXhPbmVDb2xsaXNpb25QZXJTaGFwZSA9PSB0cnVlIGlzdCBqZWRlcyBPYmpla3QgZGFiZWkgYWJlciBudXIgaW4gbWF4LiBlaW5lbSBDb2xsaXNpb25wYWlyLU9iamVrdCBlbnRoYWx0ZW4uJywgZmFsc2UpKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzaXplXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IEdyb3VwSGVscGVyID0gPEdyb3VwSGVscGVyPm8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwic2l6ZVwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5zaGFwZXMubGVuZ3RoO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnR2lidCB6dXLDvGNrLCB3aWUgdmllbGUgRWxlbWVudGUgaW4gZGVyIEdydXBwZSBlbnRoYWx0ZW4gc2luZC4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZW1wdHlcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IEdyb3VwSGVscGVyID0gPEdyb3VwSGVscGVyPm8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiZW1wdHlcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5yZW1vdmVBbGxDaGlkcmVuKCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdFbnRmZXJudCBhbGxlIEVsZW1lbnRlIGF1cyBkZXIgR3J1cHBlLCBsw7ZzY2h0IGRpZSBFbGVtZW50ZSBhYmVyIG5pY2h0LicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJkZXN0cm95QWxsQ2hpbGRyZW5cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IEdyb3VwSGVscGVyID0gPEdyb3VwSGVscGVyPm8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiZGVzdHJveUFsbENoaWxkcmVuXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2guZGVzdHJveUNoaWxkcmVuKCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdMw7ZzY2h0IGFsbGUgRWxlbWVudGUgZGVyIEdydXBwZSwgbmljaHQgYWJlciBkaWUgR3J1cHBlIHNlbGJzdC4nLCBmYWxzZSkpO1xyXG5cclxuXHJcbiAgICAgICAgKDxLbGFzcz5zaGFwZVR5cGUpLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0Q29sbGlkaW5nU2hhcGVzXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImdyb3VwXCIsIHR5cGU6IHRoaXMsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBzaGFwZUFycmF5VHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZ3JvdXA6IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGdyb3VwSGVscGVyOiBHcm91cEhlbHBlciA9IGdyb3VwLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImdldENvbGxpZGluZ1NoYXBlc1wiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBzaC5nZXRDb2xsaWRpbmdTaGFwZXMoZ3JvdXBIZWxwZXIsIHNoYXBlVHlwZSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdHaWJ0IGFsbGUgU2hhcGVzIGRlciBHcnVwcGUgZ3JvdXAgenVyw7xjaywgZGllIG1pdCBkZW0gU2hhcGUga29sbGlkaWVyZW4uJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImNvcHlcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCB0aGlzLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogR3JvdXBIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImNvcHlcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guZ2V0Q29weSg8S2xhc3M+by5jbGFzcyk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdFcnN0ZWxsdCBlaW5lIEtvcGllIGRlcyBHcm91cC1PYmpla3RzICh1bmQgYWxsZXIgc2VpbmVyIGVudGhhbHRlbmVuIEdyYWZpa29iamVrdGUhKSB1bmQgZ2l0IHNpZSB6dXLDvGNrLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJyZW5kZXJBc1N0YXRpY0JpdG1hcFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJyZW5kZXJBc1N0YXRpY0JpdG1hcFwiLCB0eXBlOiBib29sZWFuUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHRoaXMsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBHcm91cEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGRvQ2FjaGU6IGJvb2xlYW4gPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwicmVuZGVyQXNTdGF0aWNCaXRtYXBcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5jYWNoZUFzQml0bWFwKGRvQ2FjaGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ1plaWNobmV0IGFsbGUgT2JqZWt0ZSBkaWVzZXIgR3JvdXAgaW4gZWluIEJpbGQgdW5kIHZlcndlbmRldCBmb3J0YW4gbnVyIG5vY2ggZGllc2VzIEJpbGQsIG9obmUgZGllIEtpbmRlbGVtZW50ZSBkZXIgR3JvdXAgZXJuZXV0IHp1IHplaWNobmVuLiBNaXQgZGllc2VyIE1ldGhvZGUga8O2bm5lbiBrb21wbGV4ZSBCaWxkZXIgKHouQi4gZWluIFN0ZXJuZW5oaW1tZWwpIGF1ZmdlYmF1dCB1bmQgZGFubiBzdGF0aXNjaCBnZW1hY2h0IHdlcmRlbi4gTmFjaCBkZW0gQXVmYmF1IGJyYXVjaGVuIHNpZSBkYWhlciBrYXVtIG1laHIgUmVjaGVuemVpdC4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICAgICAgKDxLbGFzcz5zaGFwZVR5cGUpLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0UGFyZW50R3JvdXBcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICBdKSwgdGhpcyxcclxuICAgICAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICBcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJnZXRQYXJlbnRHcm91cFwiKSkgcmV0dXJuO1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNoLmdldFBhcmVudEdyb3VwKCk7XHJcbiAgICBcclxuICAgICAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0dpYnQgZGllIEdyb3VwIHp1csO8Y2ssIGluIGRlciBzaWNoIGRhcyBHcmFmaWtvYmpla3QgYmVmaW5kZXQsIGJ6dy4gbnVsbCwgZmFsbHMgZXMgaW4ga2VpbmVyIEdyb3VwIGlzdC4nLCBmYWxzZSkpO1xyXG4gICAgXHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgR3JvdXBIZWxwZXIgZXh0ZW5kcyBTaGFwZUhlbHBlciB7XHJcblxyXG4gICAgc2hhcGVzOiBSdW50aW1lT2JqZWN0W10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbnRlcnByZXRlcjogSW50ZXJwcmV0ZXIsIHJ1bnRpbWVPYmplY3Q6IFJ1bnRpbWVPYmplY3QpIHtcclxuICAgICAgICBzdXBlcihpbnRlcnByZXRlciwgcnVudGltZU9iamVjdCk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0ID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XHJcbiAgICAgICAgdGhpcy53b3JsZEhlbHBlci5zdGFnZS5hZGRDaGlsZCh0aGlzLmRpc3BsYXlPYmplY3QpO1xyXG4gICAgICAgIHRoaXMuYWRkVG9EZWZhdWx0R3JvdXBBbmRTZXREZWZhdWx0VmlzaWJpbGl0eSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRDaGlsZEluZGV4KHNoOiBTaGFwZUhlbHBlciwgaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGxldCBjb250YWluZXI6IFBJWEkuQ29udGFpbmVyID0gPFBJWEkuQ29udGFpbmVyPnRoaXMuZGlzcGxheU9iamVjdDtcclxuICAgICAgICBjb250YWluZXIuc2V0Q2hpbGRJbmRleChzaC5kaXNwbGF5T2JqZWN0LCBpbmRleCk7XHJcblxyXG4gICAgICAgIGxldCBvbGRJbmRleCA9IHRoaXMuc2hhcGVzLmluZGV4T2Yoc2gucnVudGltZU9iamVjdCk7XHJcbiAgICAgICAgdGhpcy5zaGFwZXMuc3BsaWNlKG9sZEluZGV4LCAxKTtcclxuICAgICAgICB0aGlzLnNoYXBlcy5zcGxpY2UoaW5kZXgsIDAsIHNoLnJ1bnRpbWVPYmplY3QpO1xyXG59XHJcblxyXG5cclxuICAgIGNhY2hlQXNCaXRtYXAoZG9DYWNoZTogYm9vbGVhbikge1xyXG4gICAgICAgIGxldCBjb250YWluZXIgPSA8UElYSS5Db250YWluZXI+dGhpcy5kaXNwbGF5T2JqZWN0O1xyXG5cclxuICAgICAgICAvLyBJZiB5b3Ugc2V0IGRvQ2FjaGUgdG8gZmFsc2UgYW5kIHNob3J0bHkgYWZ0ZXJ3YXJkcyB0byB0cnVlOiBcclxuICAgICAgICAvLyBtYWtlIHNodXJlIHRoZXJlJ3MgYXQgbGVhc3Qgb25lIHJlbmRlcmN5Y2xlIGluIGJldHdlZW4uXHJcbiAgICAgICAgaWYgKGRvQ2FjaGUpIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIuY2FjaGVBc0JpdG1hcCA9IHRydWU7XHJcbiAgICAgICAgICAgIH0sIDMwMCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29udGFpbmVyLmNhY2hlQXNCaXRtYXAgPSBkb0NhY2hlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgcmVtb3ZlRWxlbWVudEF0KGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IGluZGV4ID49IHRoaXMuc2hhcGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGlzLndvcmxkSGVscGVyLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiSW4gZGVyIEdydXBwZSBnaWJ0IGVzIGtlaW4gRWxlbWVudCBtaXQgSW5kZXggXCIgKyBpbmRleCArIFwiLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHNoYXBlID0gdGhpcy5zaGFwZXNbaW5kZXhdO1xyXG4gICAgICAgIHRoaXMucmVtb3ZlKHNoYXBlKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRFbGVtZW50KGluZGV4OiBudW1iZXIpOiBSdW50aW1lT2JqZWN0IHtcclxuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IGluZGV4ID49IHRoaXMuc2hhcGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGlzLndvcmxkSGVscGVyLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiSW4gZGVyIEdydXBwZSBnaWJ0IGVzIGtlaW4gRWxlbWVudCBtaXQgSW5kZXggXCIgKyBpbmRleCArIFwiLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5zaGFwZXNbaW5kZXhdO1xyXG4gICAgfVxyXG5cclxuICAgIGdldENvcHkoa2xhc3M6IEtsYXNzKTogUnVudGltZU9iamVjdCB7XHJcblxyXG4gICAgICAgIGxldCBybzogUnVudGltZU9iamVjdCA9IG5ldyBSdW50aW1lT2JqZWN0KGtsYXNzKTtcclxuICAgICAgICBsZXQgZ3JvdXBIZWxwZXJDb3B5OiBHcm91cEhlbHBlciA9IG5ldyBHcm91cEhlbHBlcih0aGlzLndvcmxkSGVscGVyLmludGVycHJldGVyLCBybyk7XHJcbiAgICAgICAgcm8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdID0gZ3JvdXBIZWxwZXJDb3B5O1xyXG5cclxuICAgICAgICBmb3IgKGxldCBybyBvZiB0aGlzLnNoYXBlcykge1xyXG4gICAgICAgICAgICBsZXQgc2hhcGVIZWxwZXI6IFNoYXBlSGVscGVyID0gcm8uaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgbGV0IHJvQ29weTogUnVudGltZU9iamVjdCA9IHNoYXBlSGVscGVyLmdldENvcHkoPEtsYXNzPnJvLmNsYXNzKVxyXG4gICAgICAgICAgICBsZXQgc2hhcGVIZWxwZXJDb3B5OiBTaGFwZUhlbHBlciA9IHJvQ29weS5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICBncm91cEhlbHBlckNvcHkuc2hhcGVzLnB1c2gocm9Db3B5KTtcclxuXHJcbiAgICAgICAgICAgIHNoYXBlSGVscGVyQ29weS5iZWxvbmdzVG9Hcm91cCA9IGdyb3VwSGVscGVyQ29weTtcclxuXHJcbiAgICAgICAgICAgICg8UElYSS5Db250YWluZXI+Z3JvdXBIZWxwZXJDb3B5LmRpc3BsYXlPYmplY3QpLmFkZENoaWxkKHNoYXBlSGVscGVyQ29weS5kaXNwbGF5T2JqZWN0KTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBncm91cEhlbHBlckNvcHkuY29weUZyb20odGhpcyk7XHJcbiAgICAgICAgZ3JvdXBIZWxwZXJDb3B5LnJlbmRlcigpO1xyXG5cclxuICAgICAgICByZXR1cm4gcm87XHJcbiAgICB9XHJcblxyXG4gICAgc2V0VGltZXJQYXVzZWQodHA6IGJvb2xlYW4pIHtcclxuICAgICAgICB0aGlzLnRpbWVyUGF1c2VkID0gdHA7XHJcblxyXG4gICAgICAgIGZvciAobGV0IHNoYXBlIG9mIHRoaXMuc2hhcGVzKSB7XHJcbiAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICBzaC50aW1lclBhdXNlZCA9IHRwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGFkZChzaGFwZTogUnVudGltZU9iamVjdCkge1xyXG5cclxuICAgICAgICBpZihzaGFwZSA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGxldCBzaGFwZUhlbHBlcjogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICBpZiAoc2hhcGVIZWxwZXIuaXNEZXN0cm95ZWQpIHtcclxuICAgICAgICAgICAgdGhpcy53b3JsZEhlbHBlci5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkVpbiBzY2hvbiB6ZXJzdMO2cnRlcyBPYmpla3Qga2FubiBrZWluZXIgR3J1cHBlIGhpbnp1Z2Vmw7xndCB3ZXJkZW4uXCIpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5oYXNDaXJjdWxhclJlZmVyZW5jZShzaGFwZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zaGFwZXMucHVzaChzaGFwZSk7XHJcblxyXG4gICAgICAgIGlmIChzaGFwZUhlbHBlci5iZWxvbmdzVG9Hcm91cCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHNoYXBlSGVscGVyLmJlbG9uZ3NUb0dyb3VwLnJlbW92ZShzaGFwZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IGluZGV4ID0gdGhpcy53b3JsZEhlbHBlci5zaGFwZXMuaW5kZXhPZihzaGFwZUhlbHBlcik7XHJcbiAgICAgICAgICAgIGlmIChpbmRleCA+PSAwKSB0aGlzLndvcmxkSGVscGVyLnNoYXBlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2hhcGVIZWxwZXIuYmVsb25nc1RvR3JvdXAgPSB0aGlzO1xyXG5cclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QucGFyZW50LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG4gICAgICAgIGxldCBpbnZlcnNlID0gbmV3IFBJWEkuTWF0cml4KCkuY29weUZyb20odGhpcy5kaXNwbGF5T2JqZWN0LnRyYW5zZm9ybS53b3JsZFRyYW5zZm9ybSk7XHJcbiAgICAgICAgaW52ZXJzZS5pbnZlcnQoKTtcclxuICAgICAgICBzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLnByZXBlbmQoaW52ZXJzZS5wcmVwZW5kKHRoaXMud29ybGRIZWxwZXIuc3RhZ2UubG9jYWxUcmFuc2Zvcm0pKTtcclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICBzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LnRyYW5zZm9ybS5vbkNoYW5nZSgpO1xyXG5cclxuICAgICAgICAoPFBJWEkuQ29udGFpbmVyPnRoaXMuZGlzcGxheU9iamVjdCkuYWRkQ2hpbGQoc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdCk7XHJcbiAgICAgICAgc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC51cGRhdGVUcmFuc2Zvcm0oKTtcclxuXHJcbiAgICAgICAgbGV0IHhTdW06IG51bWJlciA9IDA7XHJcbiAgICAgICAgbGV0IHlTdW06IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgIGZvciAobGV0IHNoYXBlIG9mIHRoaXMuc2hhcGVzKSB7XHJcbiAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICB4U3VtICs9IHNoLmdldENlbnRlclgoKTtcclxuICAgICAgICAgICAgeVN1bSArPSBzaC5nZXRDZW50ZXJZKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgeCA9IHhTdW0gLyB0aGlzLnNoYXBlcy5sZW5ndGg7XHJcbiAgICAgICAgbGV0IHkgPSB5U3VtIC8gdGhpcy5zaGFwZXMubGVuZ3RoO1xyXG5cclxuICAgICAgICB0aGlzLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcbiAgICAgICAgbGV0IHAxOiBQSVhJLlBvaW50ID0gdGhpcy5kaXNwbGF5T2JqZWN0LndvcmxkVHJhbnNmb3JtLmFwcGx5SW52ZXJzZShuZXcgUElYSS5Qb2ludCh4LCB5KSk7XHJcbiAgICAgICAgdGhpcy5jZW50ZXJYSW5pdGlhbCA9IHAxLng7XHJcbiAgICAgICAgdGhpcy5jZW50ZXJZSW5pdGlhbCA9IHAxLnk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHJlbW92ZUFsbENoaWRyZW4oKSB7XHJcbiAgICAgICAgbGV0IGluZGV4OiBudW1iZXIgPSAwO1xyXG4gICAgICAgIGZvciAobGV0IHNoYXBlIG9mIHRoaXMuc2hhcGVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGVyZWdpc3RlcihzaGFwZSwgaW5kZXgrKyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc2hhcGVzID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHJlbW92ZShzaGFwZTogUnVudGltZU9iamVjdCkge1xyXG4gICAgICAgIGxldCBpbmRleCA9IHRoaXMuc2hhcGVzLmluZGV4T2Yoc2hhcGUpO1xyXG4gICAgICAgIGlmIChpbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hhcGVzLnNwbGljZShpbmRleCwgMSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmRlcmVnaXN0ZXIoc2hhcGUsIGluZGV4KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkZXJlZ2lzdGVyKHNoYXBlOiBSdW50aW1lT2JqZWN0LCBpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciA9IHNoYXBlLmludHJpbnNpY0RhdGFbJ0FjdG9yJ107XHJcblxyXG4gICAgICAgIGxldCB0cmFuc2Zvcm0gPSBuZXcgUElYSS5NYXRyaXgoKS5jb3B5RnJvbShzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LnRyYW5zZm9ybS53b3JsZFRyYW5zZm9ybSk7XHJcblxyXG4gICAgICAgICg8UElYSS5Db250YWluZXI+dGhpcy5kaXNwbGF5T2JqZWN0KS5yZW1vdmVDaGlsZChzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0KTtcclxuXHJcbiAgICAgICAgbGV0IGludmVyc2VTdGFnZVRyYW5zZm9ybSA9IG5ldyBQSVhJLk1hdHJpeCgpLmNvcHlGcm9tKHRoaXMud29ybGRIZWxwZXIuc3RhZ2UubG9jYWxUcmFuc2Zvcm0pO1xyXG4gICAgICAgIGludmVyc2VTdGFnZVRyYW5zZm9ybS5pbnZlcnQoKTtcclxuICAgICAgICBzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLmlkZW50aXR5KCk7XHJcbiAgICAgICAgc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS5hcHBlbmQodHJhbnNmb3JtLnByZXBlbmQoaW52ZXJzZVN0YWdlVHJhbnNmb3JtKSk7XHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ub25DaGFuZ2UoKTtcclxuICAgICAgICB0aGlzLndvcmxkSGVscGVyLnN0YWdlLmFkZENoaWxkKHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QpO1xyXG4gICAgICAgIHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcbiAgICAgICAgc2hhcGVIZWxwZXIuYmVsb25nc1RvR3JvdXAgPSBudWxsO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgcHVibGljIHJlbmRlcigpOiB2b2lkIHtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGVzdHJveSgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmRlc3Ryb3lDaGlsZHJlbigpO1xyXG4gICAgICAgIHN1cGVyLmRlc3Ryb3koKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGVzdHJveUNoaWxkcmVuKCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAobGV0IHNoYXBlIG9mIHRoaXMuc2hhcGVzLnNsaWNlKDApKSB7XHJcbiAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICBzaC5kZXN0cm95KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc2hhcGVzID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgaGFzT3ZlcmxhcHBpbmdCb3VuZGluZ0JveFdpdGgoc2hhcGVIZWxwZXI6IFNoYXBlSGVscGVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG4gICAgICAgIHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgICAgIGxldCBiYiA9IHRoaXMuZGlzcGxheU9iamVjdC5nZXRCb3VuZHMoKTtcclxuICAgICAgICBsZXQgYmIxID0gc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC5nZXRCb3VuZHMoKTtcclxuXHJcbiAgICAgICAgaWYgKGJiLmxlZnQgPiBiYjEucmlnaHQgfHwgYmIxLmxlZnQgPiBiYi5yaWdodCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoYmIudG9wID4gYmIxLmJvdHRvbSB8fCBiYjEudG9wID4gYmIuYm90dG9tKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNvbGxpZGVzV2l0aChzaGFwZUhlbHBlcjogU2hhcGVIZWxwZXIpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaGFzT3ZlcmxhcHBpbmdCb3VuZGluZ0JveFdpdGgoc2hhcGVIZWxwZXIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IHNoYXBlIG9mIHRoaXMuc2hhcGVzKSB7XHJcbiAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICBpZiAoc2guY29sbGlkZXNXaXRoKHNoYXBlSGVscGVyKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHNldEhpdFBvbHlnb25EaXJ0eShkaXJ0eTogYm9vbGVhbikge1xyXG4gICAgICAgIGZvciAobGV0IHNoYXBlIG9mIHRoaXMuc2hhcGVzKSB7XHJcbiAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICBzaC5zZXRIaXRQb2x5Z29uRGlydHkoZGlydHkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb250YWluc1BvaW50KHg6IG51bWJlciwgeTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG5cclxuICAgICAgICBsZXQgYmIgPSB0aGlzLmRpc3BsYXlPYmplY3QuZ2V0Qm91bmRzKCk7XHJcblxyXG4gICAgICAgIGlmICh4IDwgYmIubGVmdCB8fCB4ID4gYmIubGVmdCArIGJiLndpZHRoIHx8IHkgPCBiYi50b3AgfHwgeSA+IGJiLnRvcCArIGJiLmhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBzaGFwZSBvZiB0aGlzLnNoYXBlcykge1xyXG4gICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gPFNoYXBlSGVscGVyPnNoYXBlLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgaWYgKHNoLmNvbnRhaW5zUG9pbnQoeCwgeSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRDb2xsaWRpbmdPYmplY3RzKHNoYXBlOiBSdW50aW1lT2JqZWN0KTogUnVudGltZU9iamVjdFtdIHtcclxuXHJcbiAgICAgICAgbGV0IGNvbGxpZGluZ1NoYXBlczogUnVudGltZU9iamVjdFtdID0gW107XHJcbiAgICAgICAgbGV0IHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciA9IDxTaGFwZUhlbHBlcj5zaGFwZS5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgIGZvciAobGV0IHMgb2YgdGhpcy5zaGFwZXMpIHtcclxuICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IDxTaGFwZUhlbHBlcj5zLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgaWYgKHNoLmNvbGxpZGVzV2l0aChzaGFwZUhlbHBlcikpIHtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGluZ1NoYXBlcy5wdXNoKHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY29sbGlkaW5nU2hhcGVzO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRDb2xsaWRpbmdPYmplY3RzMihncm91cEhlbHBlcjI6IEdyb3VwSGVscGVyLCBjb2xsaXNpb25QYWlyVHlwZTogVHlwZSxcclxuICAgICAgICBtYXhPbmVDb2xsaXNpb25QZXJTaGFwZTogYm9vbGVhbik6IFZhbHVlW10ge1xyXG5cclxuICAgICAgICBsZXQgY29sbGlzaW9uUGFpcnM6IFZhbHVlW10gPSBbXTtcclxuXHJcbiAgICAgICAgbGV0IGFscmVhZHlDb2xsaWRlZEhlbHBlcnMyOiBNYXA8U2hhcGVIZWxwZXIsIGJvb2xlYW4+ID0gbmV3IE1hcCgpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBzaGFwZTEgb2YgdGhpcy5zaGFwZXMpIHtcclxuICAgICAgICAgICAgbGV0IHNoYXBlSGVscGVyMTogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUxLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgc2hhcGUyIG9mIGdyb3VwSGVscGVyMi5zaGFwZXMpIHtcclxuICAgICAgICAgICAgICAgIGxldCBzaGFwZUhlbHBlcjI6IFNoYXBlSGVscGVyID0gPFNoYXBlSGVscGVyPnNoYXBlMi5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBpZiAoc2hhcGVIZWxwZXIxLmNvbGxpZGVzV2l0aChzaGFwZUhlbHBlcjIpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF4T25lQ29sbGlzaW9uUGVyU2hhcGUgfHwgYWxyZWFkeUNvbGxpZGVkSGVscGVyczIuZ2V0KHNoYXBlSGVscGVyMikgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbHJlYWR5Q29sbGlkZWRIZWxwZXJzMi5zZXQoc2hhcGVIZWxwZXIyLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJ0bzogUnVudGltZU9iamVjdCA9IG5ldyBSdW50aW1lT2JqZWN0KDxLbGFzcz5jb2xsaXNpb25QYWlyVHlwZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBydG8uaW50cmluc2ljRGF0YVtcIlNoYXBlQVwiXSA9IHNoYXBlSGVscGVyMS5ydW50aW1lT2JqZWN0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydG8uaW50cmluc2ljRGF0YVtcIlNoYXBlQlwiXSA9IHNoYXBlSGVscGVyMi5ydW50aW1lT2JqZWN0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25QYWlycy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbGxpc2lvblBhaXJUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHJ0b1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXhPbmVDb2xsaXNpb25QZXJTaGFwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb2xsaXNpb25QYWlycztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaGFzQ2lyY3VsYXJSZWZlcmVuY2Uoc2hhcGVUb0FkZDogUnVudGltZU9iamVjdCkge1xyXG4gICAgICAgIGxldCBnaCA9IHNoYXBlVG9BZGQuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgIGlmIChnaCBpbnN0YW5jZW9mIEdyb3VwSGVscGVyKSB7XHJcbiAgICAgICAgICAgIGlmIChnaCA9PSB0aGlzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndvcmxkSGVscGVyLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRWluZSBHcm91cCBkYXJmIHNpY2ggbmljaHQgc2VsYnN0IGVudGhhbHRlbiFcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHNoYXBlIG9mIGdoLnNoYXBlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmhhc0NpcmN1bGFyUmVmZXJlbmNlKHNoYXBlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgdGludChjb2xvcjogc3RyaW5nKSB7XHJcbiAgICAgICAgZm9yIChsZXQgY2hpbGQgb2YgdGhpcy5zaGFwZXMpIHtcclxuICAgICAgICAgICAgKDxTaGFwZUhlbHBlcj5jaGlsZC5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl0pLnRpbnQoY29sb3IpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG59XHJcbiJdfQ==