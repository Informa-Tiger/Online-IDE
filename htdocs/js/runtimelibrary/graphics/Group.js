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
            groupHelperCopy.add(roCopy);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JvdXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL0dyb3VwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbEUsT0FBTyxFQUF1QixnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hJLE9BQU8sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFTLFNBQVMsRUFBUSxNQUFNLCtCQUErQixDQUFDO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUluRSxPQUFPLEVBQUUsV0FBVyxFQUFjLE1BQU0sWUFBWSxDQUFDO0FBRXJELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUcxRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsS0FBSztJQUV6QyxZQUFZLE1BQWM7UUFFdEIsS0FBSyxDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQUUseUlBQXlJLENBQUMsQ0FBQztRQUUxSyxJQUFJLENBQUMsWUFBWSxDQUFRLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFN0QsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUMvQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBRU4sSUFBSSxHQUFHLEdBQWtCLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDdEMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTlDLENBQUMsRUFBRSxLQUFL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Qzt3QkFDekQsY0FBYyxDQUFDLElBQUksQ0FBQzs0QkFDaEIsSUFBSSxFQUFFLGlCQUFpQjs0QkFDdkIsS0FBSyxFQUFFLEdBQUc7eUJBQ2IsQ0FBQyxDQUFDO3FCQUNOO29CQUVELElBQUksdUJBQXVCLEVBQUU7d0JBQ3pCLE1BQU07cUJBQ1Q7aUJBQ0o7YUFDSjtTQUNKO1FBRUQsT0FBTyxjQUFjLENBQUM7SUFFMUIsQ0FBQztJQUVELG9CQUFvQixDQUFDLFVBQXlCO1FBQzFDLElBQUksRUFBRSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0MsSUFBSSxFQUFFLFlBQVksV0FBVyxFQUFFO1lBQzNCLElBQUksRUFBRSxJQUFJLElBQUksRUFBRTtnQkFDWixJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsOENBQThDLENBQUMsQ0FBQztnQkFDNUYsT0FBTyxJQUFJLENBQUM7YUFDZjtpQkFBTTtnQkFDSCxLQUFLLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUU7b0JBQ3pCLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxFQUFFO3dCQUNsQyxPQUFPLElBQUksQ0FBQztxQkFDZjtvQkFBQSxDQUFDO2lCQUNMO2FBQ0o7U0FDSjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFHRCxJQUFJLENBQUMsS0FBYTtRQUNkLEtBQUssSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNiLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzNEO0lBQ0wsQ0FBQztDQUdKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTW9kdWxlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3BhcnNlci9Nb2R1bGUuanNcIjtcclxuaW1wb3J0IHsgS2xhc3MsIFZpc2liaWxpdHkgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvQ2xhc3MuanNcIjtcclxuaW1wb3J0IHsgZG91YmxlUHJpbWl0aXZlVHlwZSwgaW50UHJpbWl0aXZlVHlwZSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsIHZvaWRQcmltaXRpdmVUeXBlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL1ByaW1pdGl2ZVR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IE1ldGhvZCwgUGFyYW1ldGVybGlzdCwgVmFsdWUsIEF0dHJpYnV0ZSwgVHlwZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9UeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBSdW50aW1lT2JqZWN0IH0gZnJvbSBcIi4uLy4uL2ludGVycHJldGVyL1J1bnRpbWVPYmplY3QuanNcIjtcclxuaW1wb3J0IHsgRmlsbGVkU2hhcGVIZWxwZXIgfSBmcm9tIFwiLi9GaWxsZWRTaGFwZS5qc1wiO1xyXG5pbXBvcnQgeyBXb3JsZEhlbHBlciB9IGZyb20gXCIuL1dvcmxkLmpzXCI7XHJcbmltcG9ydCB7IEVudW1SdW50aW1lT2JqZWN0IH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL0VudW0uanNcIjtcclxuaW1wb3J0IHsgU2hhcGVIZWxwZXIsIFNoYXBlQ2xhc3MgfSBmcm9tIFwiLi9TaGFwZS5qc1wiO1xyXG5pbXBvcnQgeyBIaXRQb2x5Z29uU3RvcmUgfSBmcm9tIFwiLi9Qb2x5Z29uU3RvcmUuanNcIjtcclxuaW1wb3J0IHsgQXJyYXlUeXBlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL0FycmF5LmpzXCI7XHJcbmltcG9ydCB7IEludGVycHJldGVyIH0gZnJvbSBcIi4uLy4uL2ludGVycHJldGVyL0ludGVycHJldGVyLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQ29sbGlzaW9uUGFpckNsYXNzIGV4dGVuZHMgS2xhc3Mge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG1vZHVsZTogTW9kdWxlKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKFwiQ29sbGlzaW9uUGFpclwiLCBtb2R1bGUsIFwiU3BlaWNoZXJ0IGRpZSBSZWZlcmVuemVuIGF1ZiB6d2VpIEZpZ3VyZW4sIGRpZSBnZXJhZGUga29sbGlkaWVydCBzaW5kLiBEaWVzZSBLbGFzc2Ugdm9uIGRlbiBLb2xsaXNpb25zbWV0aGRlbiBkZXIgS2xhc3NlIEdyb3VwIGJlbnV0enQuXCIpO1xyXG5cclxuICAgICAgICB0aGlzLnNldEJhc2VDbGFzcyg8S2xhc3M+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiT2JqZWN0XCIpKTtcclxuXHJcbiAgICAgICAgbGV0IHNoYXBlVHlwZSA9IG1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlNoYXBlXCIpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZEF0dHJpYnV0ZShuZXcgQXR0cmlidXRlKFwic2hhcGVBXCIsIHNoYXBlVHlwZSxcclxuICAgICAgICAgICAgKHZhbHVlKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHJ0bzogUnVudGltZU9iamVjdCA9IHZhbHVlLm9iamVjdDtcclxuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gcnRvLmludHJpbnNpY0RhdGFbXCJTaGFwZUFcIl07XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgVmlzaWJpbGl0eS5wdWJsaWMsIHRydWUsIFwiRXJzdGVzIGFuIGRlciBLb2xsaXNpb24gYmV0ZWlsaWd0ZXMgU2hhcGVcIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZEF0dHJpYnV0ZShuZXcgQXR0cmlidXRlKFwic2hhcGVCXCIsIHNoYXBlVHlwZSxcclxuICAgICAgICAgICAgKHZhbHVlKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHJ0bzogUnVudGltZU9iamVjdCA9IHZhbHVlLm9iamVjdDtcclxuICAgICAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gcnRvLmludHJpbnNpY0RhdGFbXCJTaGFwZUJcIl07XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgVmlzaWJpbGl0eS5wdWJsaWMsIHRydWUsIFwiWndlaXRlcyBhbiBkZXIgS29sbGlzaW9uIGJldGVpbGlndGVzIFNoYXBlXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXR1cEF0dHJpYnV0ZUluZGljZXNSZWN1cnNpdmUoKTtcclxuXHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIEdyb3VwQ2xhc3MgZXh0ZW5kcyBLbGFzcyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IobW9kdWxlOiBNb2R1bGUpIHtcclxuXHJcbiAgICAgICAgc3VwZXIoXCJHcm91cFwiLCBtb2R1bGUsIFwiS2xhc3NlIHp1bSBHcnVwcGllcmVuIGdyYWZpc2NoZXIgRWxlbWVudGUuIERpZSBncnVwcGllcnRlbiBFbGVtZW50ZSBrw7ZubmVuIG1pdGVpbmFuZGVyIHZlcnNjaG9iZW4sIGdlZHJlaHQsIGdlc3RyZWNrdCBzb3dpZSBlaW4tIHVuZCBhdXNnZWJsZW5kZXQgd2VyZGVuLiBadWRlbSBiZXNpdHp0IGRpZSBLbGFzc2UgTWV0aG9kZW4genVyIHNjaG5lbGxlbiBFcmtlbm51bmcgdm9uIEtvbGxpc2lvbiBtaXQgRWxlbWVudGVuIGF1w59lcmhhbGIgZGVyIEdydXBwZS5cIik7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0QmFzZUNsYXNzKDxLbGFzcz5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJTaGFwZVwiKSk7XHJcblxyXG4gICAgICAgIGxldCBjb2xsaXNpb25QYWlyVHlwZSA9IG1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIkNvbGxpc2lvblBhaXJcIik7XHJcbiAgICAgICAgbGV0IGNvbGxpc2lvblBhaXJBcnJheVR5cGUgPSBuZXcgQXJyYXlUeXBlKGNvbGxpc2lvblBhaXJUeXBlKTtcclxuICAgICAgICBsZXQgc2hhcGVUeXBlID0gbW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiU2hhcGVcIik7XHJcblxyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiR3JvdXBcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSBuZXcgR3JvdXBIZWxwZXIobW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKSwgbyk7XHJcbiAgICAgICAgICAgICAgICBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXSA9IHJoO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnSW5zdGFuemllcnQgZWluZSBuZXVlIEdydXBwZS4gSWhyIGvDtm5uZW4gbWl0IGRlciBNZXRob2RlIGFkZCBFbGVtZW50ZSBoaW56dWdlZsO8Z3Qgd2VyZGVuLCBkaWUgZGFubiBtaXQgZGVyIEdydXBwZSB2ZXJzY2hvYmVuLCBnZWRyZWh0LCAuLi4gd2VyZGVuLicsIHRydWUpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIkdyb3VwXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInNoYXBlc1wiLCB0eXBlOiBuZXcgQXJyYXlUeXBlKG1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlNoYXBlXCIpKSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlLCBpc0VsbGlwc2lzOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlczogVmFsdWVbXSA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHJoID0gbmV3IEdyb3VwSGVscGVyKG1vZHVsZS5tYWluLmdldEludGVycHJldGVyKCksIG8pO1xyXG4gICAgICAgICAgICAgICAgby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl0gPSByaDtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBzIG9mIHNoYXBlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJoLmFkZChzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0luc3RhbnppZXJ0IGVpbmUgbmV1ZSBHcnVwcGUgdW5kIGbDvGd0IGRpZSDDvGJlcmdlYmVuZW4gR3JhZmlrb2JqZWt0ZSBkZXIgR3J1cHBlIGhpbnp1LiBEZXIgR3J1cHBlIGvDtm5uZW4gbWl0IGRlciBNZXRob2RlIGFkZCB3ZWl0ZXJlIEdyYWZpa29iamVrdGUgaGluenVnZWbDvGd0IHdlcmRlbiwgZGllIGRhbm4gbWl0IGRlciBHcnVwcGUgdmVyc2Nob2JlbiwgZ2VkcmVodCwgLi4uIHdlcmRlbi4nLCB0cnVlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJhZGRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwic2hhcGVzXCIsIHR5cGU6IG5ldyBBcnJheVR5cGUoc2hhcGVUeXBlKSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlLCBpc0VsbGlwc2lzOiB0cnVlIH0sXHJcblxyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaGFwZXM6IFZhbHVlW10gPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBHcm91cEhlbHBlciA9IDxHcm91cEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImFkZFwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHMgb2Ygc2hhcGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2guYWRkKHMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnRsO8Z3QgZGllIEdyYWZpa29iamVrdGUgZGVyIEdydXBwZSBoaW56dS4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImluZGV4XCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG5cclxuICAgICAgICBdKSwgc2hhcGVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBpbmRleDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogR3JvdXBIZWxwZXIgPSA8R3JvdXBIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJnZXRcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guZ2V0RWxlbWVudChpbmRleCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdHaWJ0IGRhcyBHcmFmaWtlbGVtZW50IGRlciBHcnVwcGUgbWl0IGRlbSBlbnRzcHJlY2hlbmRlbiBJbmRleCB6dXLDvGNrLiBWT1JTSUNIVDogRGFzIGVyc3RlIEVsZW1lbnQgaGF0IEluZGV4IDAhJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInJlbW92ZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJpbmRleFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGluZGV4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBHcm91cEhlbHBlciA9IDxHcm91cEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5yZW1vdmVFbGVtZW50QXQoaW5kZXgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnRW50ZmVybnQgZGFzIEdyYWZpa2VsZW1lbnQgYXVzIGRlciBHcnVwcGUgbWl0IGRlbSBlbnRzcHJlY2hlbmRlbiBJbmRleCwgemVyc3TDtnJ0IGVzIGplZG9jaCBuaWNodC4gVk9SU0lDSFQ6IERhcyBlcnN0ZSBFbGVtZW50IGhhdCBJbmRleCAwIScsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJyZW1vdmVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwic2hhcGVcIiwgdHlwZTogc2hhcGVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogR3JvdXBIZWxwZXIgPSA8R3JvdXBIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJyZW1vdmVcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBzaC5yZW1vdmUoc2hhcGUpO1xyXG4gICAgICAgICAgICAgICAgc2gud29ybGRIZWxwZXIuc2hhcGVzLnB1c2goc2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0VudGZlcm50IGRhcyDDvGJlcmdlYmVuZSBHcmFmaWtlbGVtZW50IGF1cyBkZXIgR3J1cHBlLCB6ZXJzdMO2cnQgZXMgamVkb2NoIG5pY2h0LicsIGZhbHNlKSk7XHJcblxyXG5cclxuICAgICAgICBsZXQgc2hhcGVBcnJheVR5cGUgPSBuZXcgQXJyYXlUeXBlKHNoYXBlVHlwZSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJnZXRDb2xsaWRpbmdTaGFwZXNcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwic2hhcGVcIiwgdHlwZTogbW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiU2hhcGVcIiksIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG5cclxuICAgICAgICBdKSwgc2hhcGVBcnJheVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogR3JvdXBIZWxwZXIgPSA8R3JvdXBIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJnZXRDb2xsaWRpbmdTaGFwZXNcIikgfHwgc2hhcGUgPT0gbnVsbCkgcmV0dXJuIFtdO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBzaGFwZXM6IFJ1bnRpbWVPYmplY3RbXSA9IHNoLmdldENvbGxpZGluZ09iamVjdHMoc2hhcGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZXM6IFZhbHVlW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHNoIG9mIHNoYXBlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogc2hhcGVUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogc2hcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnR2lidCBkaWUgT2JqZWt0ZSBkZXIgR3J1cHBlIHp1csO8Y2ssIGRpZSBtaXQgZGVtIMO8YmVyZ2ViZW5lbiBTaGFwZSBrb2xsaWRpZXJlbi4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0Q29sbGlzaW9uUGFpcnNcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiZ3JvdXBcIiwgdHlwZTogdGhpcywgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJtYXhPbmVDb2xsaXNpb25QZXJTaGFwZVwiLCB0eXBlOiBib29sZWFuUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGNvbGxpc2lvblBhaXJBcnJheVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGdyb3VwMjogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWF4T25lQ29sbGlzaW9uUGVyU2hhcGU6IGJvb2xlYW4gPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBHcm91cEhlbHBlciA9IDxHcm91cEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgICAgIGxldCBncm91cEhlbHBlcjI6IEdyb3VwSGVscGVyID0gPEdyb3VwSGVscGVyPmdyb3VwMi5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJnZXRDb2xsaWRpbmdTaGFwZXNcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guZ2V0Q29sbGlkaW5nT2JqZWN0czIoZ3JvdXBIZWxwZXIyLCBjb2xsaXNpb25QYWlyVHlwZSwgbWF4T25lQ29sbGlzaW9uUGVyU2hhcGUpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnw5xiZXJwcsO8ZnQsIHdlbGNoZSBPYmpla3RlIGRlciBHcnVwcGUgbWl0IHdlbGNoZW4gZGVyIGFuZGVyZW4ga29sbGlkaWVyZW4uJyArXHJcbiAgICAgICAgICAgICcgR2lidCBmw7xyIGplZGUgS29sbGlzaW9uIGVpbiBDb2xsaXNpb25wYWlyLU9iamVrdCB6dXLDvGNrLCBkYXMgZGllIGJlaWRlbiBrb2xsaWRpZXJlbmRlbiBPYmpla3RlIGVudGjDpGx0LicgK1xyXG4gICAgICAgICcgRmFsbHMgbWF4T25lQ29sbGlzaW9uUGVyU2hhcGUgPT0gdHJ1ZSBpc3QgamVkZXMgT2JqZWt0IGRhYmVpIGFiZXIgbnVyIGluIG1heC4gZWluZW0gQ29sbGlzaW9ucGFpci1PYmpla3QgZW50aGFsdGVuLicsIGZhbHNlKSk7XHJcblxyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2l6ZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGludFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBHcm91cEhlbHBlciA9IDxHcm91cEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInNpemVcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guc2hhcGVzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0dpYnQgenVyw7xjaywgd2llIHZpZWxlIEVsZW1lbnRlIGluIGRlciBHcnVwcGUgZW50aGFsdGVuIHNpbmQuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImVtcHR5XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBHcm91cEhlbHBlciA9IDxHcm91cEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImVtcHR5XCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2gucmVtb3ZlQWxsQ2hpZHJlbigpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnRW50ZmVybnQgYWxsZSBFbGVtZW50ZSBhdXMgZGVyIEdydXBwZSwgbMO2c2NodCBkaWUgRWxlbWVudGUgYWJlciBuaWNodC4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZGVzdHJveUFsbENoaWxkcmVuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoOiBHcm91cEhlbHBlciA9IDxHcm91cEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcImRlc3Ryb3lBbGxDaGlsZHJlblwiKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHNoLmRlc3Ryb3lDaGlsZHJlbigpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnTMO2c2NodCBhbGxlIEVsZW1lbnRlIGRlciBHcnVwcGUsIG5pY2h0IGFiZXIgZGllIEdydXBwZSBzZWxic3QuJywgZmFsc2UpKTtcclxuXHJcblxyXG4gICAgICAgICg8S2xhc3M+c2hhcGVUeXBlKS5hZGRNZXRob2QobmV3IE1ldGhvZChcImdldENvbGxpZGluZ1NoYXBlc1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJncm91cFwiLCB0eXBlOiB0aGlzLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgc2hhcGVBcnJheVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGdyb3VwOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBncm91cEhlbHBlcjogR3JvdXBIZWxwZXIgPSBncm91cC5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJnZXRDb2xsaWRpbmdTaGFwZXNcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2guZ2V0Q29sbGlkaW5nU2hhcGVzKGdyb3VwSGVscGVyLCBzaGFwZVR5cGUpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnR2lidCBhbGxlIFNoYXBlcyBkZXIgR3J1cHBlIGdyb3VwIHp1csO8Y2ssIGRpZSBtaXQgZGVtIFNoYXBlIGtvbGxpZGllcmVuLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJjb3B5XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgdGhpcyxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2g6IEdyb3VwSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNoLnRlc3RkZXN0cm95ZWQoXCJjb3B5XCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoLmdldENvcHkoPEtsYXNzPm8uY2xhc3MpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnRXJzdGVsbHQgZWluZSBLb3BpZSBkZXMgR3JvdXAtT2JqZWt0cyAodW5kIGFsbGVyIHNlaW5lciBlbnRoYWx0ZW5lbiBHcmFmaWtvYmpla3RlISkgdW5kIGdpdCBzaWUgenVyw7xjay4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwicmVuZGVyQXNTdGF0aWNCaXRtYXBcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwicmVuZGVyQXNTdGF0aWNCaXRtYXBcIiwgdHlwZTogYm9vbGVhblByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB0aGlzLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzaDogR3JvdXBIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgICAgIGxldCBkb0NhY2hlOiBib29sZWFuID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2gudGVzdGRlc3Ryb3llZChcInJlbmRlckFzU3RhdGljQml0bWFwXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgc2guY2FjaGVBc0JpdG1hcChkb0NhY2hlKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdaZWljaG5ldCBhbGxlIE9iamVrdGUgZGllc2VyIEdyb3VwIGluIGVpbiBCaWxkIHVuZCB2ZXJ3ZW5kZXQgZm9ydGFuIG51ciBub2NoIGRpZXNlcyBCaWxkLCBvaG5lIGRpZSBLaW5kZWxlbWVudGUgZGVyIEdyb3VwIGVybmV1dCB6dSB6ZWljaG5lbi4gTWl0IGRpZXNlciBNZXRob2RlIGvDtm5uZW4ga29tcGxleGUgQmlsZGVyICh6LkIuIGVpbiBTdGVybmVuaGltbWVsKSBhdWZnZWJhdXQgdW5kIGRhbm4gc3RhdGlzY2ggZ2VtYWNodCB3ZXJkZW4uIE5hY2ggZGVtIEF1ZmJhdSBicmF1Y2hlbiBzaWUgZGFoZXIga2F1bSBtZWhyIFJlY2hlbnplaXQuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgICAgICg8S2xhc3M+c2hhcGVUeXBlKS5hZGRNZXRob2QobmV3IE1ldGhvZChcImdldFBhcmVudEdyb3VwXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgXSksIHRoaXMsXHJcbiAgICAgICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzaC50ZXN0ZGVzdHJveWVkKFwiZ2V0UGFyZW50R3JvdXBcIikpIHJldHVybjtcclxuICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaC5nZXRQYXJlbnRHcm91cCgpO1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdHaWJ0IGRpZSBHcm91cCB6dXLDvGNrLCBpbiBkZXIgc2ljaCBkYXMgR3JhZmlrb2JqZWt0IGJlZmluZGV0LCBiencuIG51bGwsIGZhbGxzIGVzIGluIGtlaW5lciBHcm91cCBpc3QuJywgZmFsc2UpKTtcclxuICAgIFxyXG4gICAgfVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEdyb3VwSGVscGVyIGV4dGVuZHMgU2hhcGVIZWxwZXIge1xyXG5cclxuICAgIHNoYXBlczogUnVudGltZU9iamVjdFtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW50ZXJwcmV0ZXI6IEludGVycHJldGVyLCBydW50aW1lT2JqZWN0OiBSdW50aW1lT2JqZWN0KSB7XHJcbiAgICAgICAgc3VwZXIoaW50ZXJwcmV0ZXIsIHJ1bnRpbWVPYmplY3QpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheU9iamVjdCA9IG5ldyBQSVhJLkNvbnRhaW5lcigpO1xyXG4gICAgICAgIHRoaXMud29ybGRIZWxwZXIuc3RhZ2UuYWRkQ2hpbGQodGhpcy5kaXNwbGF5T2JqZWN0KTtcclxuICAgICAgICB0aGlzLmFkZFRvRGVmYXVsdEdyb3VwQW5kU2V0RGVmYXVsdFZpc2liaWxpdHkoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2V0Q2hpbGRJbmRleChzaDogU2hhcGVIZWxwZXIsIGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgY29udGFpbmVyOiBQSVhJLkNvbnRhaW5lciA9IDxQSVhJLkNvbnRhaW5lcj50aGlzLmRpc3BsYXlPYmplY3Q7XHJcbiAgICAgICAgY29udGFpbmVyLnNldENoaWxkSW5kZXgoc2guZGlzcGxheU9iamVjdCwgaW5kZXgpO1xyXG5cclxuICAgICAgICBsZXQgb2xkSW5kZXggPSB0aGlzLnNoYXBlcy5pbmRleE9mKHNoLnJ1bnRpbWVPYmplY3QpO1xyXG4gICAgICAgIHRoaXMuc2hhcGVzLnNwbGljZShvbGRJbmRleCwgMSk7XHJcbiAgICAgICAgdGhpcy5zaGFwZXMuc3BsaWNlKGluZGV4LCAwLCBzaC5ydW50aW1lT2JqZWN0KTtcclxufVxyXG5cclxuXHJcbiAgICBjYWNoZUFzQml0bWFwKGRvQ2FjaGU6IGJvb2xlYW4pIHtcclxuICAgICAgICBsZXQgY29udGFpbmVyID0gPFBJWEkuQ29udGFpbmVyPnRoaXMuZGlzcGxheU9iamVjdDtcclxuXHJcbiAgICAgICAgLy8gSWYgeW91IHNldCBkb0NhY2hlIHRvIGZhbHNlIGFuZCBzaG9ydGx5IGFmdGVyd2FyZHMgdG8gdHJ1ZTogXHJcbiAgICAgICAgLy8gbWFrZSBzaHVyZSB0aGVyZSdzIGF0IGxlYXN0IG9uZSByZW5kZXJjeWNsZSBpbiBiZXR3ZWVuLlxyXG4gICAgICAgIGlmIChkb0NhY2hlKSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmNhY2hlQXNCaXRtYXAgPSB0cnVlO1xyXG4gICAgICAgICAgICB9LCAzMDApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnRhaW5lci5jYWNoZUFzQml0bWFwID0gZG9DYWNoZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHJlbW92ZUVsZW1lbnRBdChpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSB0aGlzLnNoYXBlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhpcy53b3JsZEhlbHBlci5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkluIGRlciBHcnVwcGUgZ2lidCBlcyBrZWluIEVsZW1lbnQgbWl0IEluZGV4IFwiICsgaW5kZXggKyBcIi5cIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzaGFwZSA9IHRoaXMuc2hhcGVzW2luZGV4XTtcclxuICAgICAgICB0aGlzLnJlbW92ZShzaGFwZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0RWxlbWVudChpbmRleDogbnVtYmVyKTogUnVudGltZU9iamVjdCB7XHJcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSB0aGlzLnNoYXBlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhpcy53b3JsZEhlbHBlci5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkluIGRlciBHcnVwcGUgZ2lidCBlcyBrZWluIEVsZW1lbnQgbWl0IEluZGV4IFwiICsgaW5kZXggKyBcIi5cIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2hhcGVzW2luZGV4XTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRDb3B5KGtsYXNzOiBLbGFzcyk6IFJ1bnRpbWVPYmplY3Qge1xyXG5cclxuICAgICAgICBsZXQgcm86IFJ1bnRpbWVPYmplY3QgPSBuZXcgUnVudGltZU9iamVjdChrbGFzcyk7XHJcbiAgICAgICAgbGV0IGdyb3VwSGVscGVyQ29weTogR3JvdXBIZWxwZXIgPSBuZXcgR3JvdXBIZWxwZXIodGhpcy53b3JsZEhlbHBlci5pbnRlcnByZXRlciwgcm8pO1xyXG4gICAgICAgIHJvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXSA9IGdyb3VwSGVscGVyQ29weTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgcm8gb2YgdGhpcy5zaGFwZXMpIHtcclxuICAgICAgICAgICAgbGV0IHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciA9IHJvLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgIGxldCByb0NvcHk6IFJ1bnRpbWVPYmplY3QgPSBzaGFwZUhlbHBlci5nZXRDb3B5KDxLbGFzcz5yby5jbGFzcylcclxuICAgICAgICAgICAgbGV0IHNoYXBlSGVscGVyQ29weTogU2hhcGVIZWxwZXIgPSByb0NvcHkuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgZ3JvdXBIZWxwZXJDb3B5LmFkZChyb0NvcHkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ3JvdXBIZWxwZXJDb3B5LmNvcHlGcm9tKHRoaXMpO1xyXG4gICAgICAgIGdyb3VwSGVscGVyQ29weS5yZW5kZXIoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHJvO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFRpbWVyUGF1c2VkKHRwOiBib29sZWFuKSB7XHJcbiAgICAgICAgdGhpcy50aW1lclBhdXNlZCA9IHRwO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBzaGFwZSBvZiB0aGlzLnNoYXBlcykge1xyXG4gICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gPFNoYXBlSGVscGVyPnNoYXBlLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgc2gudGltZXJQYXVzZWQgPSB0cDtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhZGQoc2hhcGU6IFJ1bnRpbWVPYmplY3QpIHtcclxuXHJcbiAgICAgICAgaWYoc2hhcGUgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgc2hhcGVIZWxwZXI6IFNoYXBlSGVscGVyID0gPFNoYXBlSGVscGVyPnNoYXBlLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgaWYgKHNoYXBlSGVscGVyLmlzRGVzdHJveWVkKSB7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRIZWxwZXIuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJFaW4gc2Nob24gemVyc3TDtnJ0ZXMgT2JqZWt0IGthbm4ga2VpbmVyIEdydXBwZSBoaW56dWdlZsO8Z3Qgd2VyZGVuLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGFzQ2lyY3VsYXJSZWZlcmVuY2Uoc2hhcGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2hhcGVzLnB1c2goc2hhcGUpO1xyXG5cclxuICAgICAgICBpZiAoc2hhcGVIZWxwZXIuYmVsb25nc1RvR3JvdXAgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBzaGFwZUhlbHBlci5iZWxvbmdzVG9Hcm91cC5yZW1vdmUoc2hhcGUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCBpbmRleCA9IHRoaXMud29ybGRIZWxwZXIuc2hhcGVzLmluZGV4T2Yoc2hhcGVIZWxwZXIpO1xyXG4gICAgICAgICAgICBpZiAoaW5kZXggPj0gMCkgdGhpcy53b3JsZEhlbHBlci5zaGFwZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNoYXBlSGVscGVyLmJlbG9uZ3NUb0dyb3VwID0gdGhpcztcclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnBhcmVudC51cGRhdGVUcmFuc2Zvcm0oKTtcclxuICAgICAgICBsZXQgaW52ZXJzZSA9IG5ldyBQSVhJLk1hdHJpeCgpLmNvcHlGcm9tKHRoaXMuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ud29ybGRUcmFuc2Zvcm0pO1xyXG4gICAgICAgIGludmVyc2UuaW52ZXJ0KCk7XHJcbiAgICAgICAgc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS5wcmVwZW5kKGludmVyc2UucHJlcGVuZCh0aGlzLndvcmxkSGVscGVyLnN0YWdlLmxvY2FsVHJhbnNmb3JtKSk7XHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ub25DaGFuZ2UoKTtcclxuXHJcbiAgICAgICAgKDxQSVhJLkNvbnRhaW5lcj50aGlzLmRpc3BsYXlPYmplY3QpLmFkZENoaWxkKHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QpO1xyXG4gICAgICAgIHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgICAgIGxldCB4U3VtOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIGxldCB5U3VtOiBudW1iZXIgPSAwO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBzaGFwZSBvZiB0aGlzLnNoYXBlcykge1xyXG4gICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gPFNoYXBlSGVscGVyPnNoYXBlLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgeFN1bSArPSBzaC5nZXRDZW50ZXJYKCk7XHJcbiAgICAgICAgICAgIHlTdW0gKz0gc2guZ2V0Q2VudGVyWSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHggPSB4U3VtIC8gdGhpcy5zaGFwZXMubGVuZ3RoO1xyXG4gICAgICAgIGxldCB5ID0geVN1bSAvIHRoaXMuc2hhcGVzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG4gICAgICAgIGxldCBwMTogUElYSS5Qb2ludCA9IHRoaXMuZGlzcGxheU9iamVjdC53b3JsZFRyYW5zZm9ybS5hcHBseUludmVyc2UobmV3IFBJWEkuUG9pbnQoeCwgeSkpO1xyXG4gICAgICAgIHRoaXMuY2VudGVyWEluaXRpYWwgPSBwMS54O1xyXG4gICAgICAgIHRoaXMuY2VudGVyWUluaXRpYWwgPSBwMS55O1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyByZW1vdmVBbGxDaGlkcmVuKCkge1xyXG4gICAgICAgIGxldCBpbmRleDogbnVtYmVyID0gMDtcclxuICAgICAgICBmb3IgKGxldCBzaGFwZSBvZiB0aGlzLnNoYXBlcykge1xyXG4gICAgICAgICAgICB0aGlzLmRlcmVnaXN0ZXIoc2hhcGUsIGluZGV4KyspO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnNoYXBlcyA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyByZW1vdmUoc2hhcGU6IFJ1bnRpbWVPYmplY3QpIHtcclxuICAgICAgICBsZXQgaW5kZXggPSB0aGlzLnNoYXBlcy5pbmRleE9mKHNoYXBlKTtcclxuICAgICAgICBpZiAoaW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnNoYXBlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICB0aGlzLmRlcmVnaXN0ZXIoc2hhcGUsIGluZGV4KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkZXJlZ2lzdGVyKHNoYXBlOiBSdW50aW1lT2JqZWN0LCBpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciA9IHNoYXBlLmludHJpbnNpY0RhdGFbJ0FjdG9yJ107XHJcblxyXG4gICAgICAgIGxldCB0cmFuc2Zvcm0gPSBuZXcgUElYSS5NYXRyaXgoKS5jb3B5RnJvbShzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LnRyYW5zZm9ybS53b3JsZFRyYW5zZm9ybSk7XHJcblxyXG4gICAgICAgICg8UElYSS5Db250YWluZXI+dGhpcy5kaXNwbGF5T2JqZWN0KS5yZW1vdmVDaGlsZChzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0KTtcclxuXHJcbiAgICAgICAgbGV0IGludmVyc2VTdGFnZVRyYW5zZm9ybSA9IG5ldyBQSVhJLk1hdHJpeCgpLmNvcHlGcm9tKHRoaXMud29ybGRIZWxwZXIuc3RhZ2UubG9jYWxUcmFuc2Zvcm0pO1xyXG4gICAgICAgIGludmVyc2VTdGFnZVRyYW5zZm9ybS5pbnZlcnQoKTtcclxuICAgICAgICBzaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LmxvY2FsVHJhbnNmb3JtLmlkZW50aXR5KCk7XHJcbiAgICAgICAgc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC5sb2NhbFRyYW5zZm9ybS5hcHBlbmQodHJhbnNmb3JtLnByZXBlbmQoaW52ZXJzZVN0YWdlVHJhbnNmb3JtKSk7XHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC50cmFuc2Zvcm0ub25DaGFuZ2UoKTtcclxuICAgICAgICB0aGlzLndvcmxkSGVscGVyLnN0YWdlLmFkZENoaWxkKHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QpO1xyXG4gICAgICAgIHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcbiAgICAgICAgc2hhcGVIZWxwZXIuYmVsb25nc1RvR3JvdXAgPSBudWxsO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgcHVibGljIHJlbmRlcigpOiB2b2lkIHtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGVzdHJveSgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmRlc3Ryb3lDaGlsZHJlbigpO1xyXG4gICAgICAgIHN1cGVyLmRlc3Ryb3koKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGVzdHJveUNoaWxkcmVuKCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAobGV0IHNoYXBlIG9mIHRoaXMuc2hhcGVzLnNsaWNlKDApKSB7XHJcbiAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICBzaC5kZXN0cm95KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc2hhcGVzID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgaGFzT3ZlcmxhcHBpbmdCb3VuZGluZ0JveFdpdGgoc2hhcGVIZWxwZXI6IFNoYXBlSGVscGVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG4gICAgICAgIHNoYXBlSGVscGVyLmRpc3BsYXlPYmplY3QudXBkYXRlVHJhbnNmb3JtKCk7XHJcblxyXG4gICAgICAgIGxldCBiYiA9IHRoaXMuZGlzcGxheU9iamVjdC5nZXRCb3VuZHMoKTtcclxuICAgICAgICBsZXQgYmIxID0gc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC5nZXRCb3VuZHMoKTtcclxuXHJcbiAgICAgICAgaWYgKGJiLmxlZnQgPiBiYjEucmlnaHQgfHwgYmIxLmxlZnQgPiBiYi5yaWdodCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoYmIudG9wID4gYmIxLmJvdHRvbSB8fCBiYjEudG9wID4gYmIuYm90dG9tKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNvbGxpZGVzV2l0aChzaGFwZUhlbHBlcjogU2hhcGVIZWxwZXIpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaGFzT3ZlcmxhcHBpbmdCb3VuZGluZ0JveFdpdGgoc2hhcGVIZWxwZXIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IHNoYXBlIG9mIHRoaXMuc2hhcGVzKSB7XHJcbiAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICBpZiAoc2guY29sbGlkZXNXaXRoKHNoYXBlSGVscGVyKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHNldEhpdFBvbHlnb25EaXJ0eShkaXJ0eTogYm9vbGVhbikge1xyXG4gICAgICAgIGZvciAobGV0IHNoYXBlIG9mIHRoaXMuc2hhcGVzKSB7XHJcbiAgICAgICAgICAgIGxldCBzaDogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgICAgICBzaC5zZXRIaXRQb2x5Z29uRGlydHkoZGlydHkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb250YWluc1BvaW50KHg6IG51bWJlciwgeTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0LnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG5cclxuICAgICAgICBsZXQgYmIgPSB0aGlzLmRpc3BsYXlPYmplY3QuZ2V0Qm91bmRzKCk7XHJcblxyXG4gICAgICAgIGlmICh4IDwgYmIubGVmdCB8fCB4ID4gYmIubGVmdCArIGJiLndpZHRoIHx8IHkgPCBiYi50b3AgfHwgeSA+IGJiLnRvcCArIGJiLmhlaWdodCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBzaGFwZSBvZiB0aGlzLnNoYXBlcykge1xyXG4gICAgICAgICAgICBsZXQgc2g6IFNoYXBlSGVscGVyID0gPFNoYXBlSGVscGVyPnNoYXBlLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgaWYgKHNoLmNvbnRhaW5zUG9pbnQoeCwgeSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRDb2xsaWRpbmdPYmplY3RzKHNoYXBlOiBSdW50aW1lT2JqZWN0KTogUnVudGltZU9iamVjdFtdIHtcclxuXHJcbiAgICAgICAgbGV0IGNvbGxpZGluZ1NoYXBlczogUnVudGltZU9iamVjdFtdID0gW107XHJcbiAgICAgICAgbGV0IHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciA9IDxTaGFwZUhlbHBlcj5zaGFwZS5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgIGZvciAobGV0IHMgb2YgdGhpcy5zaGFwZXMpIHtcclxuICAgICAgICAgICAgbGV0IHNoOiBTaGFwZUhlbHBlciA9IDxTaGFwZUhlbHBlcj5zLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgaWYgKHNoLmNvbGxpZGVzV2l0aChzaGFwZUhlbHBlcikpIHtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGluZ1NoYXBlcy5wdXNoKHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY29sbGlkaW5nU2hhcGVzO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRDb2xsaWRpbmdPYmplY3RzMihncm91cEhlbHBlcjI6IEdyb3VwSGVscGVyLCBjb2xsaXNpb25QYWlyVHlwZTogVHlwZSxcclxuICAgICAgICBtYXhPbmVDb2xsaXNpb25QZXJTaGFwZTogYm9vbGVhbik6IFZhbHVlW10ge1xyXG5cclxuICAgICAgICBsZXQgY29sbGlzaW9uUGFpcnM6IFZhbHVlW10gPSBbXTtcclxuXHJcbiAgICAgICAgbGV0IGFscmVhZHlDb2xsaWRlZEhlbHBlcnMyOiBNYXA8U2hhcGVIZWxwZXIsIGJvb2xlYW4+ID0gbmV3IE1hcCgpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBzaGFwZTEgb2YgdGhpcy5zaGFwZXMpIHtcclxuICAgICAgICAgICAgbGV0IHNoYXBlSGVscGVyMTogU2hhcGVIZWxwZXIgPSA8U2hhcGVIZWxwZXI+c2hhcGUxLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgc2hhcGUyIG9mIGdyb3VwSGVscGVyMi5zaGFwZXMpIHtcclxuICAgICAgICAgICAgICAgIGxldCBzaGFwZUhlbHBlcjI6IFNoYXBlSGVscGVyID0gPFNoYXBlSGVscGVyPnNoYXBlMi5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcbiAgICAgICAgICAgICAgICBpZiAoc2hhcGVIZWxwZXIxLmNvbGxpZGVzV2l0aChzaGFwZUhlbHBlcjIpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF4T25lQ29sbGlzaW9uUGVyU2hhcGUgfHwgYWxyZWFkeUNvbGxpZGVkSGVscGVyczIuZ2V0KHNoYXBlSGVscGVyMikgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbHJlYWR5Q29sbGlkZWRIZWxwZXJzMi5zZXQoc2hhcGVIZWxwZXIyLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJ0bzogUnVudGltZU9iamVjdCA9IG5ldyBSdW50aW1lT2JqZWN0KDxLbGFzcz5jb2xsaXNpb25QYWlyVHlwZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBydG8uaW50cmluc2ljRGF0YVtcIlNoYXBlQVwiXSA9IHNoYXBlSGVscGVyMS5ydW50aW1lT2JqZWN0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydG8uaW50cmluc2ljRGF0YVtcIlNoYXBlQlwiXSA9IHNoYXBlSGVscGVyMi5ydW50aW1lT2JqZWN0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25QYWlycy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbGxpc2lvblBhaXJUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHJ0b1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXhPbmVDb2xsaXNpb25QZXJTaGFwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb2xsaXNpb25QYWlycztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaGFzQ2lyY3VsYXJSZWZlcmVuY2Uoc2hhcGVUb0FkZDogUnVudGltZU9iamVjdCkge1xyXG4gICAgICAgIGxldCBnaCA9IHNoYXBlVG9BZGQuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG4gICAgICAgIGlmIChnaCBpbnN0YW5jZW9mIEdyb3VwSGVscGVyKSB7XHJcbiAgICAgICAgICAgIGlmIChnaCA9PSB0aGlzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndvcmxkSGVscGVyLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRWluZSBHcm91cCBkYXJmIHNpY2ggbmljaHQgc2VsYnN0IGVudGhhbHRlbiFcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHNoYXBlIG9mIGdoLnNoYXBlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmhhc0NpcmN1bGFyUmVmZXJlbmNlKHNoYXBlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgdGludChjb2xvcjogc3RyaW5nKSB7XHJcbiAgICAgICAgZm9yIChsZXQgY2hpbGQgb2YgdGhpcy5zaGFwZXMpIHtcclxuICAgICAgICAgICAgKDxTaGFwZUhlbHBlcj5jaGlsZC5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl0pLnRpbnQoY29sb3IpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG59XHJcbiJdfQ==