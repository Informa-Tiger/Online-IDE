import { Klass } from "../../compiler/types/Class.js";
import { booleanPrimitiveType, intPrimitiveType, stringPrimitiveType, StringPrimitiveType } from "../../compiler/types/PrimitiveTypes.js";
import { Method, Parameterlist, PrimitiveType } from "../../compiler/types/Types.js";
import { TokenType } from "../../compiler/lexer/Token.js";
import { ListIteratorImplClass } from "./ListIteratorImpl.js";
import { getTypeFromValue } from "../../compiler/types/TypeHelper.js";
export class ArrayListClass extends Klass {
    constructor(module) {
        super("ArrayList", module, "Liste mit Zugriff auf das n-te Objekt in konstanter Zeit, Einfügen in konstanter Zeit und Suchen in linearer Zeit");
        let objectType = module.typeStore.getType("Object");
        this.setBaseClass(objectType);
        let collectionInterface = module.typeStore.getType("Collection");
        let typeA = objectType.clone();
        typeA.identifier = "A";
        typeA.isTypeVariable = true;
        let tvA = {
            identifier: "A",
            scopeFrom: { line: 1, column: 1, length: 1 },
            scopeTo: { line: 1, column: 1, length: 1 },
            type: typeA
        };
        this.typeVariables.push(tvA);
        let listInterface = module.typeStore.getType("List").clone();
        listInterface.typeVariables = [tvA];
        this.implements.push(listInterface);
        let iteratorType = module.typeStore.getType("Iterator").clone();
        iteratorType.typeVariables = [tvA];
        this.addMethod(new Method("ArrayList", new Parameterlist([
        // { identifier: "mx", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let ah = new ListHelper(o, module.main.getInterpreter(), module);
            o.intrinsicData["ListHelper"] = ah;
        }, false, false, 'Instanziert eine neue ArrayList', true));
        this.addMethod(new Method("iterator", new Parameterlist([]), iteratorType, (parameters) => {
            let o = parameters[0].value;
            let ah = o.intrinsicData["ListHelper"];
            return ListIteratorImplClass.getIterator(ah, ah.interpreter, module, "ascending").value;
        }, true, false, "Gibt einen Iterator über die Elemente dieser Collection zurück."));
        this.addMethod(new Method("add", new Parameterlist([
            { identifier: "element", type: typeA, declaration: null, usagePositions: null, isFinal: true }
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let r = parameters[1];
            let ah = o.intrinsicData["ListHelper"];
            return ah.add(r);
        }, false, false, "Fügt der Liste ein Element hinzu. Gibt genau dann true zurück, wenn sich der Zustand der Liste dadurch geändert hat."));
        this.addMethod(new Method("set", new Parameterlist([
            { identifier: "index", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "element", type: typeA, declaration: null, usagePositions: null, isFinal: true }
        ]), typeA, (parameters) => {
            let o = parameters[0].value;
            let index = parameters[1].value;
            let element = parameters[2];
            let ah = o.intrinsicData["ListHelper"];
            return ah.set(index, element);
        }, false, false, "Ersetzt das Element an Position index der Liste durch das übergebene Element; gibt das vorherige Element zurück."));
        this.addMethod(new Method("add", new Parameterlist([
            { identifier: "index", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "element", type: typeA, declaration: null, usagePositions: null, isFinal: true }
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let index = parameters[1].value;
            let r = parameters[2];
            let ah = o.intrinsicData["ListHelper"];
            return ah.add(r, index);
        }, false, false, "Fügt das Element an der Position index der Liste ein. Tipp: Das erste Element der Liste hat index == 0."));
        this.addMethod(new Method("get", new Parameterlist([
            { identifier: "index", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), typeA, (parameters) => {
            var _a;
            let o = parameters[0].value;
            let index = parameters[1].value;
            let ah = o.intrinsicData["ListHelper"];
            return (_a = ah.get(index)) === null || _a === void 0 ? void 0 : _a.value;
        }, false, false, "Gibt das i-te Element der Liste zurück."));
        this.addMethod(new Method("remove", new Parameterlist([
            { identifier: "index", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let index = parameters[1].value;
            let ah = o.intrinsicData["ListHelper"];
            ah.remove(index);
            return null;
        }, true, false, "Entfernt das Element an der Stelle index. WICHTIG: Das erste Element hat den Index 0. Es ist 0 <= index < size()"));
        this.addMethod(new Method("indexOf", new Parameterlist([
            { identifier: "o", type: typeA, declaration: null, usagePositions: null, isFinal: true }
        ]), intPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let object = parameters[1];
            let ah = o.intrinsicData["ListHelper"];
            return ah.indexOf(object);
        }, true, false, "Gibt den Index des Elements o zurück. Gibt -1 zurück, wenn die Liste das Element o nicht enthält. WICHTIG: Das erste Element hat den Index 0, das letzte den Index size() - 1. "));
        this.addMethod(new Method("addAll", new Parameterlist([
            { identifier: "c", type: collectionInterface, declaration: null, usagePositions: null, isFinal: true }
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let object = parameters[1].value;
            let ah = o.intrinsicData["ListHelper"];
            return ah.addAll(object);
        }, true, false, "Fügt alle Elemente von c dieser Collection hinzu."));
        this.addMethod(new Method("clear", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let ah = o.intrinsicData["ListHelper"];
            return ah.clear();
        }, true, false, "Entfernt alle Element aus dieser Collection."));
        this.addMethod(new Method("contains", new Parameterlist([
            { identifier: "o", type: typeA, declaration: null, usagePositions: null, isFinal: true }
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let object = parameters[1];
            let ah = o.intrinsicData["ListHelper"];
            return ah.contains(object);
        }, true, false, "Testet, ob die Collection das Element enthält."));
        this.addMethod(new Method("remove", new Parameterlist([
            { identifier: "o", type: typeA, declaration: null, usagePositions: null, isFinal: true }
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let object = parameters[1];
            let ah = o.intrinsicData["ListHelper"];
            return ah.removeObject(object);
        }, true, false, "Entfernt das Element o aus der Collection. Gibt true zurück, wenn die Collection das Element enthalten hatte."));
        this.addMethod(new Method("isEmpty", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let ah = o.intrinsicData["ListHelper"];
            return ah.isEmpty();
        }, true, false, "Testet, ob die Collection das leer ist."));
        this.addMethod(new Method("size", new Parameterlist([]), intPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let ah = o.intrinsicData["ListHelper"];
            return ah.size();
        }, true, false, "Gibt die Anzahl der Elemente der Collection zurück."));
        this.addMethod(new Method("toString", new Parameterlist([]), stringPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let ah = o.intrinsicData["ListHelper"];
            return ah.to_String();
        }, false, false));
    }
}
export class ListHelper {
    constructor(runtimeObject, interpreter, module) {
        this.runtimeObject = runtimeObject;
        this.interpreter = interpreter;
        this.module = module;
        this.valueArray = [];
        this.objectArray = []; // wird mitgeführt, um schnelle indexOf-Operationen zu ermöglichen
    }
    allElementsPrimitive() {
        for (let v of this.valueArray) {
            if (!(v.type instanceof PrimitiveType || ["String", "_Double", "Integer", "Boolean", "Character"].indexOf(v.type.identifier) >= 0)) {
                return false;
                break;
            }
        }
        return true;
    }
    to_String() {
        if (this.allElementsPrimitive()) {
            return "[" + this.objectArray.map(o => "" + o).join(", ") + "]";
        }
        let position = {
            line: 1,
            column: 1,
            length: 1
        };
        let statements = [
            {
                type: TokenType.noOp,
                position: position,
                stepFinished: false
            },
            {
                type: TokenType.pushConstant,
                dataType: stringPrimitiveType,
                value: "[",
                position: position,
                stepFinished: false
            },
        ];
        let toStringParameters = new Parameterlist([]);
        for (let i = 0; i < this.valueArray.length; i++) {
            let value = this.valueArray[i];
            if (value.value == null || value.type instanceof PrimitiveType || value.type instanceof StringPrimitiveType) {
                statements.push({
                    type: TokenType.pushConstant,
                    dataType: stringPrimitiveType,
                    value: value.value == null ? "null" : value.type.castTo(value, stringPrimitiveType).value,
                    position: position,
                    stepFinished: false
                });
            }
            else {
                statements.push({
                    type: TokenType.pushConstant,
                    dataType: value.type,
                    value: value.value,
                    stepFinished: false,
                    position: position
                });
                statements.push({
                    type: TokenType.callMethod,
                    method: value.type.getMethod("toString", toStringParameters),
                    isSuperCall: false,
                    stackframeBegin: -1,
                    stepFinished: false,
                    position: position
                });
            }
            statements.push({
                type: TokenType.binaryOp,
                operator: TokenType.plus,
                leftType: stringPrimitiveType,
                stepFinished: false,
                position: position
            });
            if (i < this.valueArray.length - 1) {
                statements.push({
                    type: TokenType.pushConstant,
                    dataType: stringPrimitiveType,
                    value: ", ",
                    position: position,
                    stepFinished: false
                });
                statements.push({
                    type: TokenType.binaryOp,
                    operator: TokenType.plus,
                    leftType: stringPrimitiveType,
                    stepFinished: false,
                    position: position
                });
            }
        }
        statements.push({
            type: TokenType.pushConstant,
            dataType: stringPrimitiveType,
            value: "]",
            position: position,
            stepFinished: false
        });
        statements.push({
            type: TokenType.binaryOp,
            operator: TokenType.plus,
            leftType: stringPrimitiveType,
            stepFinished: false,
            position: position
        });
        // statements.push({
        //     type: TokenType.binaryOp,
        //     operator: TokenType.plus,
        //     leftType: stringPrimitiveType,
        //     stepFinished: false,
        //     position: position
        // });
        statements.push({
            type: TokenType.return,
            copyReturnValueToStackframePos0: true,
            leaveThisObjectOnStack: false,
            stepFinished: false,
            position: position,
            methodWasInjected: true
        });
        let program = {
            module: this.module,
            statements: statements,
            labelManager: null
        };
        let method = new Method("toString", new Parameterlist([]), stringPrimitiveType, program, false, false);
        this.interpreter.runTimer(method, [], () => { }, true);
        return "";
    }
    addAll(object) {
        if (object.intrinsicData["ListHelper"] instanceof ListHelper) {
            let ah = object.intrinsicData["ListHelper"];
            if (ah != null) {
                this.valueArray = this.valueArray.concat(ah.valueArray.map(v => { return { type: v.type, value: v.value }; }));
                this.objectArray = this.objectArray.concat(ah.objectArray);
            }
            return true;
        }
        let getIteratorMethod = object.class.getMethod("iterator", new Parameterlist([]));
        if (getIteratorMethod == null) {
            this.interpreter.throwException("Der an die Methode addAll übergebene Paramter besitzt keine Methode iterator().");
            return false;
        }
        if (getIteratorMethod.invoke) {
            let iterator = getIteratorMethod.invoke([{ value: object, type: object.class }]);
            let nextMethod = iterator.class.getMethod("next", new Parameterlist([]));
            let hasNextMethod = iterator.class.getMethod("hasNext", new Parameterlist([]));
            let type = nextMethod.returnType;
            let iteratorAsValue = { value: iterator, type: iterator.class };
            while (hasNextMethod.invoke([iteratorAsValue])) {
                let obj = nextMethod.invoke([iteratorAsValue]);
                this.objectArray.push(obj);
                this.valueArray.push({
                    value: obj,
                    type: getTypeFromValue(obj)
                });
            }
            return;
        }
        else {
            let iteratorWithError = this.execute(getIteratorMethod, [{ value: object, type: object.class }]);
            if (iteratorWithError.error != null) {
                this.interpreter.throwException("Fehler beim holen des Iterators.");
                return false;
            }
            let iterator = iteratorWithError.value.value;
            let nextMethod = iterator.class.getMethod("next", new Parameterlist([]));
            let hasNextMethod = iterator.class.getMethod("hasNext", new Parameterlist([]));
            let type = nextMethod.returnType;
            let iteratorAsValue = { value: iterator, type: iterator.class };
            while (true) {
                let hasNext = this.execute(hasNextMethod, [iteratorAsValue]);
                if (hasNext.error != null) {
                    this.interpreter.throwException("Fehler beim Ausführen der hasNext-Methode");
                    return false;
                }
                if (hasNext.value.value != true)
                    break;
                let objWithError = this.execute(nextMethod, [iteratorAsValue]);
                if (objWithError.error != null) {
                    this.interpreter.throwException("Fehler beim Ausführen der next-Methode");
                    return false;
                }
                let obj = objWithError.value.value;
                this.objectArray.push(obj);
                this.valueArray.push({ value: obj, type: type });
            }
            return true;
        }
    }
    execute(method, parameters) {
        if (method.invoke) {
            return { value: { value: method.invoke([]), type: method.returnType }, error: null };
        }
        else {
            return this.interpreter.executeImmediatelyInNewStackframe(method.program, parameters);
        }
    }
    get(index) {
        if (index >= 0 && index < this.valueArray.length) {
            return this.valueArray[index];
        }
        this.interpreter.throwException("Der ArrayList-Index ist außerhalb des Intervalls von 0 bis " + (this.valueArray.length - 1) + ". ");
        return null;
    }
    remove(index) {
        if (index >= 0 && index < this.valueArray.length) {
            this.valueArray.splice(index, 1);
            this.objectArray.splice(index, 1);
            return null;
        }
        this.interpreter.throwException("Der ArrayList-Index ist außerhalb des Intervalls von 0 bis " + (this.valueArray.length - 1) + ". ");
        return null;
    }
    add(r, index) {
        if (index == null) {
            this.valueArray.push({ type: r.type, value: r.value });
            this.objectArray.push(r.value);
        }
        else {
            if (index <= this.objectArray.length && index >= 0) {
                this.valueArray.splice(index, 0, { type: r.type, value: r.value });
                this.objectArray.splice(index, 0, r.value);
            }
            else {
                this.interpreter.throwException("Der ArrayList-Index ist außerhalb des Intervalls von 0 bis " + (this.valueArray.length - 1) + ". ");
            }
        }
        return true;
    }
    set(index, r) {
        if (index < this.objectArray.length && index >= 0) {
            let oldValue = this.objectArray[index];
            this.valueArray[index] = { type: r.type, value: r.value };
            this.objectArray[index] = r.value;
            return oldValue;
        }
        else {
            this.interpreter.throwException("Der ArrayList-Index ist außerhalb des Intervalls von 0 bis " + (this.valueArray.length - 1) + ". ");
        }
        return true;
    }
    pop() {
        if (this.objectArray.length == 0) {
            this.interpreter.throwException("Der ArrayList-Index ist außerhalb des Intervalls von 0 bis " + (this.valueArray.length - 1) + ". ");
            return null;
        }
        else {
            this.valueArray.pop();
            return this.objectArray.pop();
        }
    }
    peek() {
        if (this.objectArray.length == 0) {
            this.interpreter.throwException("Der ArrayList-Index ist außerhalb des Intervalls von 0 bis " + (this.valueArray.length - 1) + ". ");
            return null;
        }
        else {
            return this.objectArray[this.objectArray.length - 1];
        }
    }
    indexOf(o) {
        return this.objectArray.indexOf(o.value);
    }
    size() {
        return this.objectArray.length;
    }
    isEmpty() {
        return this.valueArray.length == 0;
    }
    removeObject(object) {
        let index = this.objectArray.indexOf(object.value);
        if (index >= 0) {
            this.objectArray.splice(index, 1);
            this.valueArray.splice(index, 1);
        }
    }
    contains(object) {
        return this.objectArray.indexOf(object.value) >= 0;
    }
    clear() {
        this.valueArray = [];
        this.objectArray = [];
    }
    peek_last_or_null() {
        if (this.objectArray.length == 0) {
            return null;
        }
        else {
            return this.objectArray[this.objectArray.length - 1];
        }
    }
    peek_first_or_null() {
        if (this.objectArray.length == 0) {
            return null;
        }
        else {
            return this.objectArray[0];
        }
    }
    removeLast_or_error() {
        if (this.objectArray.length == 0) {
            return null;
        }
        else {
            this.valueArray.pop();
            return this.objectArray.pop();
        }
    }
    ;
    addLast(object) {
        this.valueArray.push({ type: object.type, value: object.value });
        this.objectArray.push(object.value);
        return true;
    }
    addFirst(object) {
        this.valueArray.splice(0, 0, { type: object.type, value: object.value });
        this.objectArray.splice(0, 0, object.value);
        return true;
    }
    removeFirstOccurrence(object) {
        let index = this.objectArray.indexOf(object.value);
        if (index >= 0) {
            this.valueArray.splice(index, 1);
            this.objectArray.splice(index, 1);
            return true;
        }
        return false;
    }
    peek_or_null() {
        if (this.objectArray.length == 0) {
            return null;
        }
        else {
            return this.objectArray[this.objectArray.length - 1];
        }
    }
    poll_or_null() {
        if (this.objectArray.length == 0) {
            return null;
        }
        else {
            this.valueArray.pop();
            return this.objectArray.pop();
        }
    }
    removeFirst_or_error() {
        if (this.objectArray.length == 0) {
            this.interpreter.throwException("Der ArrayList-Index ist außerhalb des Intervalls von 0 bis " + (this.valueArray.length - 1) + ". ");
        }
        else {
            let object = this.objectArray[0];
            this.objectArray.splice(0, 1);
            this.valueArray.splice(0, 1);
            return object;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXJyYXlMaXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9ydW50aW1lbGlicmFyeS9jb2xsZWN0aW9ucy9BcnJheUxpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFhLEtBQUssRUFBZ0IsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQWMsbUJBQW1CLEVBQWMsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsSyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBUyxhQUFhLEVBQXFCLE1BQU0sK0JBQStCLENBQUM7QUFJL0csT0FBTyxFQUFFLFNBQVMsRUFBZ0IsTUFBTSwrQkFBK0IsQ0FBQztBQUV4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUU5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUV0RSxNQUFNLE9BQU8sY0FBZSxTQUFRLEtBQUs7SUFFckMsWUFBWSxNQUFjO1FBRXRCLEtBQUssQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLG1IQUFtSCxDQUFDLENBQUM7UUFFaEosSUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFcEQsSUFBSSxDQUFDLFlBQVksQ0FBUSxVQUFVLENBQUMsQ0FBQztRQUVyQyxJQUFJLG1CQUFtQixHQUFlLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBRSxDQUFDO1FBRTlFLElBQUksS0FBSyxHQUFrQixVQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDL0MsS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7UUFDdkIsS0FBSyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFFNUIsSUFBSSxHQUFHLEdBQWlCO1lBQ3BCLFVBQVUs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QUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNqQztJQUNMLENBQUM7SUFFRCxvQkFBb0I7UUFDaEIsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDOUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsNkRBQTZELEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQTtTQUN2STthQUFNO1lBQ0gsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdCLE9BQU8sTUFBTSxDQUFDO1NBQ2pCO0lBQ0wsQ0FBQztDQUdKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTW9kdWxlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3BhcnNlci9Nb2R1bGUuanNcIjtcclxuaW1wb3J0IHsgSW50ZXJmYWNlLCBLbGFzcywgVHlwZVZhcmlhYmxlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL0NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBpbnRQcmltaXRpdmVUeXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlLCBvYmplY3RUeXBlLCBTdHJpbmdQcmltaXRpdmVUeXBlLCBEb3VibGVUeXBlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL1ByaW1pdGl2ZVR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IE1ldGhvZCwgUGFyYW1ldGVybGlzdCwgVmFsdWUsIFByaW1pdGl2ZVR5cGUsIGdldFR5cGVJZGVudGlmaWVyIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL1R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEludGVycHJldGVyIH0gZnJvbSBcIi4uLy4uL2ludGVycHJldGVyL0ludGVycHJldGVyLmpzXCI7XHJcbmltcG9ydCB7IFJ1bnRpbWVPYmplY3QgfSBmcm9tIFwiLi4vLi4vaW50ZXJwcmV0ZXIvUnVudGltZU9iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBQcm9ncmFtLCBTdGF0ZW1lbnQgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL1Byb2dyYW0uanNcIjtcclxuaW1wb3J0IHsgVG9rZW5UeXBlLCBUZXh0UG9zaXRpb24gfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvbGV4ZXIvVG9rZW4uanNcIjtcclxuaW1wb3J0IHsgQXJyYXlUeXBlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL0FycmF5LmpzXCI7XHJcbmltcG9ydCB7IExpc3RJdGVyYXRvckltcGxDbGFzcyB9IGZyb20gXCIuL0xpc3RJdGVyYXRvckltcGwuanNcIjtcclxuaW1wb3J0IHsgRW51bSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9FbnVtLmpzXCI7XHJcbmltcG9ydCB7IGdldFR5cGVGcm9tVmFsdWUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvVHlwZUhlbHBlci5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFycmF5TGlzdENsYXNzIGV4dGVuZHMgS2xhc3Mge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG1vZHVsZTogTW9kdWxlKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKFwiQXJyYXlMaXN0XCIsIG1vZHVsZSwgXCJMaXN0ZSBtaXQgWnVncmlmZiBhdWYgZGFzIG4tdGUgT2JqZWt0IGluIGtvbnN0YW50ZXIgWmVpdCwgRWluZsO8Z2VuIGluIGtvbnN0YW50ZXIgWmVpdCB1bmQgU3VjaGVuIGluIGxpbmVhcmVyIFplaXRcIik7XHJcblxyXG4gICAgICAgIGxldCBvYmplY3RUeXBlID0gbW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiT2JqZWN0XCIpO1xyXG5cclxuICAgICAgICB0aGlzLnNldEJhc2VDbGFzcyg8S2xhc3M+b2JqZWN0VHlwZSk7XHJcblxyXG4gICAgICAgIGxldCBjb2xsZWN0aW9uSW50ZXJmYWNlID0gKDxJbnRlcmZhY2U+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiQ29sbGVjdGlvblwiKSk7XHJcblxyXG4gICAgICAgIGxldCB0eXBlQTogS2xhc3MgPSAoPEtsYXNzPm9iamVjdFR5cGUpLmNsb25lKCk7XHJcbiAgICAgICAgdHlwZUEuaWRlbnRpZmllciA9IFwiQVwiO1xyXG4gICAgICAgIHR5cGVBLmlzVHlwZVZhcmlhYmxlID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgbGV0IHR2QTogVHlwZVZhcmlhYmxlID0ge1xyXG4gICAgICAgICAgICBpZGVudGlmaWVyOiBcIkFcIixcclxuICAgICAgICAgICAgc2NvcGVGcm9tOiB7IGxpbmU6IDEsIGNvbHVtbjogMSwgbGVuZ3RoOiAxIH0sXHJcbiAgICAgICAgICAgIHNjb3BlVG86IHsgbGluZTogMSwgY29sdW1uOiAxLCBsZW5ndGg6IDEgfSxcclxuICAgICAgICAgICAgdHlwZTogdHlwZUFcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLnR5cGVWYXJpYWJsZXMucHVzaCh0dkEpO1xyXG5cclxuICAgICAgICBsZXQgbGlzdEludGVyZmFjZSA9ICg8SW50ZXJmYWNlPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIkxpc3RcIikpLmNsb25lKCk7XHJcbiAgICAgICAgbGlzdEludGVyZmFjZS50eXBlVmFyaWFibGVzID0gW3R2QV07XHJcblxyXG4gICAgICAgIHRoaXMuaW1wbGVtZW50cy5wdXNoKGxpc3RJbnRlcmZhY2UpO1xyXG5cclxuICAgICAgICBsZXQgaXRlcmF0b3JUeXBlID0gKDxLbGFzcz5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJJdGVyYXRvclwiKSkuY2xvbmUoKTtcclxuICAgICAgICBpdGVyYXRvclR5cGUudHlwZVZhcmlhYmxlcyA9IFt0dkFdO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiQXJyYXlMaXN0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgLy8geyBpZGVudGlmaWVyOiBcIm14XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYWggPSBuZXcgTGlzdEhlbHBlcihvLCBtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLCBtb2R1bGUpO1xyXG4gICAgICAgICAgICAgICAgby5pbnRyaW5zaWNEYXRhW1wiTGlzdEhlbHBlclwiXSA9IGFoO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnSW5zdGFuemllcnQgZWluZSBuZXVlIEFycmF5TGlzdCcsIHRydWUpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIml0ZXJhdG9yXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgaXRlcmF0b3JUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIExpc3RJdGVyYXRvckltcGxDbGFzcy5nZXRJdGVyYXRvcihhaCwgYWguaW50ZXJwcmV0ZXIsIG1vZHVsZSwgXCJhc2NlbmRpbmdcIikudmFsdWU7XHJcblxyXG4gICAgICAgICAgICB9LCB0cnVlLCBmYWxzZSwgXCJHaWJ0IGVpbmVuIEl0ZXJhdG9yIMO8YmVyIGRpZSBFbGVtZW50ZSBkaWVzZXIgQ29sbGVjdGlvbiB6dXLDvGNrLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJhZGRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiZWxlbWVudFwiLCB0eXBlOiB0eXBlQSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHI6IFZhbHVlID0gcGFyYW1ldGVyc1sxXTtcclxuICAgICAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFoLmFkZChyKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJGw7xndCBkZXIgTGlzdGUgZWluIEVsZW1lbnQgaGluenUuIEdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gc2ljaCBkZXIgWnVzdGFuZCBkZXIgTGlzdGUgZGFkdXJjaCBnZcOkbmRlcnQgaGF0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzZXRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiaW5kZXhcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJlbGVtZW50XCIsIHR5cGU6IHR5cGVBLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCB0eXBlQSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDogVmFsdWUgPSBwYXJhbWV0ZXJzWzJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFoOiBMaXN0SGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiTGlzdEhlbHBlclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWguc2V0KGluZGV4LCBlbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJFcnNldHp0IGRhcyBFbGVtZW50IGFuIFBvc2l0aW9uIGluZGV4IGRlciBMaXN0ZSBkdXJjaCBkYXMgw7xiZXJnZWJlbmUgRWxlbWVudDsgZ2lidCBkYXMgdm9yaGVyaWdlIEVsZW1lbnQgenVyw7xjay5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiYWRkXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImluZGV4XCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiZWxlbWVudFwiLCB0eXBlOiB0eXBlQSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGluZGV4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHI6IFZhbHVlID0gcGFyYW1ldGVyc1syXTtcclxuICAgICAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFoLmFkZChyLCBpbmRleCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiRsO8Z3QgZGFzIEVsZW1lbnQgYW4gZGVyIFBvc2l0aW9uIGluZGV4IGRlciBMaXN0ZSBlaW4uIFRpcHA6IERhcyBlcnN0ZSBFbGVtZW50IGRlciBMaXN0ZSBoYXQgaW5kZXggPT0gMC5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImluZGV4XCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9XHJcbiAgICAgICAgXSksIHR5cGVBLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBpbmRleDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFoLmdldChpbmRleCk/LnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZGFzIGktdGUgRWxlbWVudCBkZXIgTGlzdGUgenVyw7xjay5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwicmVtb3ZlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImluZGV4XCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9XHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGluZGV4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFoOiBMaXN0SGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiTGlzdEhlbHBlclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBhaC5yZW1vdmUoaW5kZXgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgfSwgdHJ1ZSwgZmFsc2UsIFwiRW50ZmVybnQgZGFzIEVsZW1lbnQgYW4gZGVyIFN0ZWxsZSBpbmRleC4gV0lDSFRJRzogRGFzIGVyc3RlIEVsZW1lbnQgaGF0IGRlbiBJbmRleCAwLiBFcyBpc3QgMCA8PSBpbmRleCA8IHNpemUoKVwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJpbmRleE9mXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIm9cIiwgdHlwZTogdHlwZUEsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9XHJcbiAgICAgICAgXSksIGludFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IG9iamVjdDogVmFsdWUgPSBwYXJhbWV0ZXJzWzFdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFoOiBMaXN0SGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiTGlzdEhlbHBlclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWguaW5kZXhPZihvYmplY3QpO1xyXG5cclxuICAgICAgICAgICAgfSwgdHJ1ZSwgZmFsc2UsIFwiR2lidCBkZW4gSW5kZXggZGVzIEVsZW1lbnRzIG8genVyw7xjay4gR2lidCAtMSB6dXLDvGNrLCB3ZW5uIGRpZSBMaXN0ZSBkYXMgRWxlbWVudCBvIG5pY2h0IGVudGjDpGx0LiBXSUNIVElHOiBEYXMgZXJzdGUgRWxlbWVudCBoYXQgZGVuIEluZGV4IDAsIGRhcyBsZXR6dGUgZGVuIEluZGV4IHNpemUoKSAtIDEuIFwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJhZGRBbGxcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY1wiLCB0eXBlOiBjb2xsZWN0aW9uSW50ZXJmYWNlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgb2JqZWN0OiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFoLmFkZEFsbChvYmplY3QpO1xyXG5cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdHJ1ZSwgZmFsc2UsIFwiRsO8Z3QgYWxsZSBFbGVtZW50ZSB2b24gYyBkaWVzZXIgQ29sbGVjdGlvbiBoaW56dS5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiY2xlYXJcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFoLmNsZWFyKCk7XHJcblxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0cnVlLCBmYWxzZSwgXCJFbnRmZXJudCBhbGxlIEVsZW1lbnQgYXVzIGRpZXNlciBDb2xsZWN0aW9uLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJjb250YWluc1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJvXCIsIHR5cGU6IHR5cGVBLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgb2JqZWN0OiBWYWx1ZSA9IHBhcmFtZXRlcnNbMV07XHJcbiAgICAgICAgICAgICAgICBsZXQgYWg6IExpc3RIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBhaC5jb250YWlucyhvYmplY3QpO1xyXG5cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdHJ1ZSwgZmFsc2UsIFwiVGVzdGV0LCBvYiBkaWUgQ29sbGVjdGlvbiBkYXMgRWxlbWVudCBlbnRow6RsdC5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwicmVtb3ZlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIm9cIiwgdHlwZTogdHlwZUEsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9XHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBvYmplY3Q6IFZhbHVlID0gcGFyYW1ldGVyc1sxXTtcclxuICAgICAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFoLnJlbW92ZU9iamVjdChvYmplY3QpO1xyXG5cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdHJ1ZSwgZmFsc2UsIFwiRW50ZmVybnQgZGFzIEVsZW1lbnQgbyBhdXMgZGVyIENvbGxlY3Rpb24uIEdpYnQgdHJ1ZSB6dXLDvGNrLCB3ZW5uIGRpZSBDb2xsZWN0aW9uIGRhcyBFbGVtZW50IGVudGhhbHRlbiBoYXR0ZS5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiaXNFbXB0eVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFoLmlzRW1wdHkoKTtcclxuXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRydWUsIGZhbHNlLCBcIlRlc3RldCwgb2IgZGllIENvbGxlY3Rpb24gZGFzIGxlZXIgaXN0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzaXplXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWg6IExpc3RIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBhaC5zaXplKCk7XHJcblxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0cnVlLCBmYWxzZSwgXCJHaWJ0IGRpZSBBbnphaGwgZGVyIEVsZW1lbnRlIGRlciBDb2xsZWN0aW9uIHp1csO8Y2suXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInRvU3RyaW5nXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtdKSwgc3RyaW5nUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWg6IExpc3RIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBhaC50b19TdHJpbmcoKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSkpO1xyXG5cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBMaXN0SGVscGVyIHtcclxuXHJcbiAgICB2YWx1ZUFycmF5OiBWYWx1ZVtdID0gW107XHJcbiAgICBvYmplY3RBcnJheTogYW55W10gPSBbXTsgLy8gd2lyZCBtaXRnZWbDvGhydCwgdW0gc2NobmVsbGUgaW5kZXhPZi1PcGVyYXRpb25lbiB6dSBlcm3DtmdsaWNoZW5cclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJ1bnRpbWVPYmplY3Q6IFJ1bnRpbWVPYmplY3QsIHB1YmxpYyBpbnRlcnByZXRlcjogSW50ZXJwcmV0ZXIsIHByaXZhdGUgbW9kdWxlOiBNb2R1bGUpIHtcclxuICAgIH1cclxuXHJcbiAgICBhbGxFbGVtZW50c1ByaW1pdGl2ZSgpOiBib29sZWFuIHtcclxuICAgICAgICBmb3IgKGxldCB2IG9mIHRoaXMudmFsdWVBcnJheSkge1xyXG4gICAgICAgICAgICBpZiAoISh2LnR5cGUgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlIHx8IFtcIlN0cmluZ1wiLCBcIl9Eb3VibGVcIiwgXCJJbnRlZ2VyXCIsIFwiQm9vbGVhblwiLCBcIkNoYXJhY3RlclwiXS5pbmRleE9mKHYudHlwZS5pZGVudGlmaWVyKSA+PSAwKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgdG9fU3RyaW5nKCk6IGFueSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmFsbEVsZW1lbnRzUHJpbWl0aXZlKCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwiW1wiICsgdGhpcy5vYmplY3RBcnJheS5tYXAobyA9PiBcIlwiICsgbykuam9pbihcIiwgXCIpICsgXCJdXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcG9zaXRpb246IFRleHRQb3NpdGlvbiA9IHtcclxuICAgICAgICAgICAgbGluZTogMSxcclxuICAgICAgICAgICAgY29sdW1uOiAxLFxyXG4gICAgICAgICAgICBsZW5ndGg6IDFcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSA9IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLm5vT3AsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQ29uc3RhbnQsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBcIltcIixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2VcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdO1xyXG5cclxuICAgICAgICBsZXQgdG9TdHJpbmdQYXJhbWV0ZXJzID0gbmV3IFBhcmFtZXRlcmxpc3QoW10pO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudmFsdWVBcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgdmFsdWUgPSB0aGlzLnZhbHVlQXJyYXlbaV07XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZS52YWx1ZSA9PSBudWxsIHx8IHZhbHVlLnR5cGUgaW5zdGFuY2VvZiBQcmltaXRpdmVUeXBlIHx8IHZhbHVlLnR5cGUgaW5zdGFuY2VvZiBTdHJpbmdQcmltaXRpdmVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQ29uc3RhbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YVR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLnZhbHVlID09IG51bGwgPyBcIm51bGxcIiA6IHZhbHVlLnR5cGUuY2FzdFRvKHZhbHVlLCBzdHJpbmdQcmltaXRpdmVUeXBlKS52YWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQ29uc3RhbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YVR5cGU6IHZhbHVlLnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLnZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmNhbGxNZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAoPEtsYXNzIHwgSW50ZXJmYWNlIHwgRW51bT52YWx1ZS50eXBlKS5nZXRNZXRob2QoXCJ0b1N0cmluZ1wiLCB0b1N0cmluZ1BhcmFtZXRlcnMpLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzU3VwZXJDYWxsOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja2ZyYW1lQmVnaW46IC0xLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuYmluYXJ5T3AsXHJcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogVG9rZW5UeXBlLnBsdXMsXHJcbiAgICAgICAgICAgICAgICBsZWZ0VHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb25cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoaSA8IHRoaXMudmFsdWVBcnJheS5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQ29uc3RhbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YVR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IFwiLCBcIixcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5iaW5hcnlPcCxcclxuICAgICAgICAgICAgICAgICAgICBvcGVyYXRvcjogVG9rZW5UeXBlLnBsdXMsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdFR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb25cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoQ29uc3RhbnQsXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICB2YWx1ZTogXCJdXCIsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzdGF0ZW1lbnRzLnB1c2goe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuYmluYXJ5T3AsXHJcbiAgICAgICAgICAgIG9wZXJhdG9yOiBUb2tlblR5cGUucGx1cyxcclxuICAgICAgICAgICAgbGVmdFR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBzdGF0ZW1lbnRzLnB1c2goe1xyXG4gICAgICAgIC8vICAgICB0eXBlOiBUb2tlblR5cGUuYmluYXJ5T3AsXHJcbiAgICAgICAgLy8gICAgIG9wZXJhdG9yOiBUb2tlblR5cGUucGx1cyxcclxuICAgICAgICAvLyAgICAgbGVmdFR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgLy8gICAgIHN0ZXBGaW5pc2hlZDogZmFsc2UsXHJcbiAgICAgICAgLy8gICAgIHBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgIC8vIH0pO1xyXG5cclxuICAgICAgICBzdGF0ZW1lbnRzLnB1c2goe1xyXG4gICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucmV0dXJuLFxyXG4gICAgICAgICAgICBjb3B5UmV0dXJuVmFsdWVUb1N0YWNrZnJhbWVQb3MwOiB0cnVlLFxyXG4gICAgICAgICAgICBsZWF2ZVRoaXNPYmplY3RPblN0YWNrOiBmYWxzZSxcclxuICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICBtZXRob2RXYXNJbmplY3RlZDogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBsZXQgcHJvZ3JhbTogUHJvZ3JhbSA9IHtcclxuICAgICAgICAgICAgbW9kdWxlOiB0aGlzLm1vZHVsZSxcclxuICAgICAgICAgICAgc3RhdGVtZW50czogc3RhdGVtZW50cyxcclxuICAgICAgICAgICAgbGFiZWxNYW5hZ2VyOiBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbWV0aG9kOiBNZXRob2QgPSBuZXcgTWV0aG9kKFwidG9TdHJpbmdcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pLCBzdHJpbmdQcmltaXRpdmVUeXBlLCBwcm9ncmFtLCBmYWxzZSwgZmFsc2UpO1xyXG4gICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIucnVuVGltZXIobWV0aG9kLCBbXSwgKCkgPT4geyB9LCB0cnVlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkQWxsKG9iamVjdDogUnVudGltZU9iamVjdCk6IGJvb2xlYW4ge1xyXG5cclxuICAgICAgICBpZiAob2JqZWN0LmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdIGluc3RhbmNlb2YgTGlzdEhlbHBlcikge1xyXG4gICAgICAgICAgICBsZXQgYWg6IExpc3RIZWxwZXIgPSBvYmplY3QuaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcbiAgICAgICAgICAgIGlmIChhaCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlQXJyYXkgPSB0aGlzLnZhbHVlQXJyYXkuY29uY2F0KGFoLnZhbHVlQXJyYXkubWFwKHYgPT4geyByZXR1cm4geyB0eXBlOiB2LnR5cGUsIHZhbHVlOiB2LnZhbHVlIH0gfSkpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vYmplY3RBcnJheSA9IHRoaXMub2JqZWN0QXJyYXkuY29uY2F0KGFoLm9iamVjdEFycmF5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBnZXRJdGVyYXRvck1ldGhvZCA9IG9iamVjdC5jbGFzcy5nZXRNZXRob2QoXCJpdGVyYXRvclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXSkpO1xyXG4gICAgICAgIGlmIChnZXRJdGVyYXRvck1ldGhvZCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJEZXIgYW4gZGllIE1ldGhvZGUgYWRkQWxsIMO8YmVyZ2ViZW5lIFBhcmFtdGVyIGJlc2l0enQga2VpbmUgTWV0aG9kZSBpdGVyYXRvcigpLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGdldEl0ZXJhdG9yTWV0aG9kLmludm9rZSkge1xyXG5cclxuICAgICAgICAgICAgbGV0IGl0ZXJhdG9yOiBSdW50aW1lT2JqZWN0ID0gZ2V0SXRlcmF0b3JNZXRob2QuaW52b2tlKFt7IHZhbHVlOiBvYmplY3QsIHR5cGU6IG9iamVjdC5jbGFzcyB9XSk7XHJcbiAgICAgICAgICAgIGxldCBuZXh0TWV0aG9kID0gaXRlcmF0b3IuY2xhc3MuZ2V0TWV0aG9kKFwibmV4dFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXSkpO1xyXG4gICAgICAgICAgICBsZXQgaGFzTmV4dE1ldGhvZCA9IGl0ZXJhdG9yLmNsYXNzLmdldE1ldGhvZChcImhhc05leHRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pKTtcclxuICAgICAgICAgICAgbGV0IHR5cGUgPSBuZXh0TWV0aG9kLnJldHVyblR5cGU7XHJcblxyXG4gICAgICAgICAgICBsZXQgaXRlcmF0b3JBc1ZhbHVlOiBWYWx1ZSA9IHsgdmFsdWU6IGl0ZXJhdG9yLCB0eXBlOiBpdGVyYXRvci5jbGFzcyB9O1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKGhhc05leHRNZXRob2QuaW52b2tlKFtpdGVyYXRvckFzVmFsdWVdKSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG9iajogYW55ID0gbmV4dE1ldGhvZC5pbnZva2UoW2l0ZXJhdG9yQXNWYWx1ZV0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vYmplY3RBcnJheS5wdXNoKG9iaik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlQXJyYXkucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG9iaixcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBnZXRUeXBlRnJvbVZhbHVlKG9iailcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgaXRlcmF0b3JXaXRoRXJyb3IgPSB0aGlzLmV4ZWN1dGUoZ2V0SXRlcmF0b3JNZXRob2QsIFt7IHZhbHVlOiBvYmplY3QsIHR5cGU6IG9iamVjdC5jbGFzcyB9XSk7XHJcbiAgICAgICAgICAgIGlmIChpdGVyYXRvcldpdGhFcnJvci5lcnJvciAhPSBudWxsKSB7IHRoaXMuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJGZWhsZXIgYmVpbSBob2xlbiBkZXMgSXRlcmF0b3JzLlwiKTsgcmV0dXJuIGZhbHNlOyB9XHJcbiAgICAgICAgICAgIGxldCBpdGVyYXRvciA9IGl0ZXJhdG9yV2l0aEVycm9yLnZhbHVlLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5leHRNZXRob2QgPSBpdGVyYXRvci5jbGFzcy5nZXRNZXRob2QoXCJuZXh0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtdKSk7XHJcbiAgICAgICAgICAgIGxldCBoYXNOZXh0TWV0aG9kID0gaXRlcmF0b3IuY2xhc3MuZ2V0TWV0aG9kKFwiaGFzTmV4dFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXSkpO1xyXG4gICAgICAgICAgICBsZXQgdHlwZSA9IG5leHRNZXRob2QucmV0dXJuVHlwZTtcclxuICAgICAgICAgICAgbGV0IGl0ZXJhdG9yQXNWYWx1ZTogVmFsdWUgPSB7IHZhbHVlOiBpdGVyYXRvciwgdHlwZTogaXRlcmF0b3IuY2xhc3MgfTtcclxuXHJcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaGFzTmV4dCA9IHRoaXMuZXhlY3V0ZShoYXNOZXh0TWV0aG9kLCBbaXRlcmF0b3JBc1ZhbHVlXSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaGFzTmV4dC5lcnJvciAhPSBudWxsKSB7IHRoaXMuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJGZWhsZXIgYmVpbSBBdXNmw7xocmVuIGRlciBoYXNOZXh0LU1ldGhvZGVcIik7IHJldHVybiBmYWxzZTsgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGhhc05leHQudmFsdWUudmFsdWUgIT0gdHJ1ZSkgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBsZXQgb2JqV2l0aEVycm9yID0gdGhpcy5leGVjdXRlKG5leHRNZXRob2QsIFtpdGVyYXRvckFzVmFsdWVdKTtcclxuICAgICAgICAgICAgICAgIGlmIChvYmpXaXRoRXJyb3IuZXJyb3IgIT0gbnVsbCkgeyB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRmVobGVyIGJlaW0gQXVzZsO8aHJlbiBkZXIgbmV4dC1NZXRob2RlXCIpOyByZXR1cm4gZmFsc2U7IH1cclxuICAgICAgICAgICAgICAgIGxldCBvYmogPSBvYmpXaXRoRXJyb3IudmFsdWUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9iamVjdEFycmF5LnB1c2gob2JqKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWVBcnJheS5wdXNoKHsgdmFsdWU6IG9iaiwgdHlwZTogdHlwZSB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShtZXRob2Q6IE1ldGhvZCwgcGFyYW1ldGVyczogVmFsdWVbXSk6IHsgZXJyb3I6IHN0cmluZywgdmFsdWU6IFZhbHVlIH0ge1xyXG4gICAgICAgIGlmIChtZXRob2QuaW52b2tlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB7IHZhbHVlOiBtZXRob2QuaW52b2tlKFtdKSwgdHlwZTogbWV0aG9kLnJldHVyblR5cGUgfSwgZXJyb3I6IG51bGwgfTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnRlcnByZXRlci5leGVjdXRlSW1tZWRpYXRlbHlJbk5ld1N0YWNrZnJhbWUobWV0aG9kLnByb2dyYW0sIHBhcmFtZXRlcnMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnZXQoaW5kZXg6IG51bWJlcik6IFZhbHVlIHtcclxuICAgICAgICBpZiAoaW5kZXggPj0gMCAmJiBpbmRleCA8IHRoaXMudmFsdWVBcnJheS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVBcnJheVtpbmRleF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJEZXIgQXJyYXlMaXN0LUluZGV4IGlzdCBhdcOfZXJoYWxiIGRlcyBJbnRlcnZhbGxzIHZvbiAwIGJpcyBcIiArICh0aGlzLnZhbHVlQXJyYXkubGVuZ3RoIC0gMSkgKyBcIi4gXCIpXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlKGluZGV4OiBudW1iZXIpOiBWYWx1ZSB7XHJcblxyXG4gICAgICAgIGlmIChpbmRleCA+PSAwICYmIGluZGV4IDwgdGhpcy52YWx1ZUFycmF5Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlQXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgdGhpcy5vYmplY3RBcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJEZXIgQXJyYXlMaXN0LUluZGV4IGlzdCBhdcOfZXJoYWxiIGRlcyBJbnRlcnZhbGxzIHZvbiAwIGJpcyBcIiArICh0aGlzLnZhbHVlQXJyYXkubGVuZ3RoIC0gMSkgKyBcIi4gXCIpXHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZChyOiBWYWx1ZSwgaW5kZXg/KTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKGluZGV4ID09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZUFycmF5LnB1c2goeyB0eXBlOiByLnR5cGUsIHZhbHVlOiByLnZhbHVlIH0pO1xyXG4gICAgICAgICAgICB0aGlzLm9iamVjdEFycmF5LnB1c2goci52YWx1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKGluZGV4IDw9IHRoaXMub2JqZWN0QXJyYXkubGVuZ3RoICYmIGluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWVBcnJheS5zcGxpY2UoaW5kZXgsIDAsIHsgdHlwZTogci50eXBlLCB2YWx1ZTogci52YWx1ZSB9KTtcclxuICAgICAgICAgICAgICAgIHRoaXMub2JqZWN0QXJyYXkuc3BsaWNlKGluZGV4LCAwLCByLnZhbHVlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJEZXIgQXJyYXlMaXN0LUluZGV4IGlzdCBhdcOfZXJoYWxiIGRlcyBJbnRlcnZhbGxzIHZvbiAwIGJpcyBcIiArICh0aGlzLnZhbHVlQXJyYXkubGVuZ3RoIC0gMSkgKyBcIi4gXCIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0KGluZGV4OiBudW1iZXIsIHI6IFZhbHVlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKGluZGV4IDwgdGhpcy5vYmplY3RBcnJheS5sZW5ndGggJiYgaW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICBsZXQgb2xkVmFsdWUgPSB0aGlzLm9iamVjdEFycmF5W2luZGV4XTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZUFycmF5W2luZGV4XSA9IHsgdHlwZTogci50eXBlLCB2YWx1ZTogci52YWx1ZSB9O1xyXG4gICAgICAgICAgICB0aGlzLm9iamVjdEFycmF5W2luZGV4XSA9IHIudmFsdWU7XHJcbiAgICAgICAgICAgIHJldHVybiBvbGRWYWx1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGVyIEFycmF5TGlzdC1JbmRleCBpc3QgYXXDn2VyaGFsYiBkZXMgSW50ZXJ2YWxscyB2b24gMCBiaXMgXCIgKyAodGhpcy52YWx1ZUFycmF5Lmxlbmd0aCAtIDEpICsgXCIuIFwiKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBwb3AoKTogYW55IHtcclxuICAgICAgICBpZiAodGhpcy5vYmplY3RBcnJheS5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGVyIEFycmF5TGlzdC1JbmRleCBpc3QgYXXDn2VyaGFsYiBkZXMgSW50ZXJ2YWxscyB2b24gMCBiaXMgXCIgKyAodGhpcy52YWx1ZUFycmF5Lmxlbmd0aCAtIDEpICsgXCIuIFwiKVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlQXJyYXkucG9wKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9iamVjdEFycmF5LnBvcCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwZWVrKCk6IGFueSB7XHJcbiAgICAgICAgaWYgKHRoaXMub2JqZWN0QXJyYXkubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkRlciBBcnJheUxpc3QtSW5kZXggaXN0IGF1w59lcmhhbGIgZGVzIEludGVydmFsbHMgdm9uIDAgYmlzIFwiICsgKHRoaXMudmFsdWVBcnJheS5sZW5ndGggLSAxKSArIFwiLiBcIilcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMub2JqZWN0QXJyYXlbdGhpcy5vYmplY3RBcnJheS5sZW5ndGggLSAxXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaW5kZXhPZihvOiBWYWx1ZSk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMub2JqZWN0QXJyYXkuaW5kZXhPZihvLnZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBzaXplKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMub2JqZWN0QXJyYXkubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIGlzRW1wdHkoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVBcnJheS5sZW5ndGggPT0gMDtcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmVPYmplY3Qob2JqZWN0OiBWYWx1ZSkge1xyXG4gICAgICAgIGxldCBpbmRleCA9IHRoaXMub2JqZWN0QXJyYXkuaW5kZXhPZihvYmplY3QudmFsdWUpO1xyXG4gICAgICAgIGlmIChpbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMub2JqZWN0QXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZUFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnRhaW5zKG9iamVjdDogVmFsdWUpOiBhbnkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm9iamVjdEFycmF5LmluZGV4T2Yob2JqZWN0LnZhbHVlKSA+PSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGNsZWFyKCkge1xyXG4gICAgICAgIHRoaXMudmFsdWVBcnJheSA9IFtdO1xyXG4gICAgICAgIHRoaXMub2JqZWN0QXJyYXkgPSBbXTtcclxuICAgIH1cclxuXHJcbiAgICBwZWVrX2xhc3Rfb3JfbnVsbCgpOiBhbnkge1xyXG4gICAgICAgIGlmICh0aGlzLm9iamVjdEFycmF5Lmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9iamVjdEFycmF5W3RoaXMub2JqZWN0QXJyYXkubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcGVla19maXJzdF9vcl9udWxsKCk6IGFueSB7XHJcbiAgICAgICAgaWYgKHRoaXMub2JqZWN0QXJyYXkubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMub2JqZWN0QXJyYXlbMF07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZUxhc3Rfb3JfZXJyb3IoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMub2JqZWN0QXJyYXkubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZUFycmF5LnBvcCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vYmplY3RBcnJheS5wb3AoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGFkZExhc3Qob2JqZWN0OiBWYWx1ZSkge1xyXG4gICAgICAgIHRoaXMudmFsdWVBcnJheS5wdXNoKHsgdHlwZTogb2JqZWN0LnR5cGUsIHZhbHVlOiBvYmplY3QudmFsdWUgfSk7XHJcbiAgICAgICAgdGhpcy5vYmplY3RBcnJheS5wdXNoKG9iamVjdC52YWx1ZSk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICBhZGRGaXJzdChvYmplY3Q6IFZhbHVlKTogYW55IHtcclxuICAgICAgICB0aGlzLnZhbHVlQXJyYXkuc3BsaWNlKDAsIDAsIHsgdHlwZTogb2JqZWN0LnR5cGUsIHZhbHVlOiBvYmplY3QudmFsdWUgfSk7XHJcbiAgICAgICAgdGhpcy5vYmplY3RBcnJheS5zcGxpY2UoMCwgMCwgb2JqZWN0LnZhbHVlKTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJlbW92ZUZpcnN0T2NjdXJyZW5jZShvYmplY3Q6IFZhbHVlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IGluZGV4ID0gdGhpcy5vYmplY3RBcnJheS5pbmRleE9mKG9iamVjdC52YWx1ZSk7XHJcbiAgICAgICAgaWYgKGluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZUFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgIHRoaXMub2JqZWN0QXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBwZWVrX29yX251bGwoKTogYW55IHtcclxuICAgICAgICBpZiAodGhpcy5vYmplY3RBcnJheS5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vYmplY3RBcnJheVt0aGlzLm9iamVjdEFycmF5Lmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwb2xsX29yX251bGwoKTogYW55IHtcclxuICAgICAgICBpZiAodGhpcy5vYmplY3RBcnJheS5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlQXJyYXkucG9wKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9iamVjdEFycmF5LnBvcCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZW1vdmVGaXJzdF9vcl9lcnJvcigpOiBhbnkge1xyXG4gICAgICAgIGlmICh0aGlzLm9iamVjdEFycmF5Lmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJEZXIgQXJyYXlMaXN0LUluZGV4IGlzdCBhdcOfZXJoYWxiIGRlcyBJbnRlcnZhbGxzIHZvbiAwIGJpcyBcIiArICh0aGlzLnZhbHVlQXJyYXkubGVuZ3RoIC0gMSkgKyBcIi4gXCIpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IG9iamVjdCA9IHRoaXMub2JqZWN0QXJyYXlbMF07XHJcbiAgICAgICAgICAgIHRoaXMub2JqZWN0QXJyYXkuc3BsaWNlKDAsIDEpO1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlQXJyYXkuc3BsaWNlKDAsIDEpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG59XHJcbiJdfQ==