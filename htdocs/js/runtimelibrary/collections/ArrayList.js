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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXJyYXlMaXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9ydW50aW1lbGlicmFyeS9jb2xsZWN0aW9ucy9BcnJheUxpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFhLEtBQUssRUFBZ0IsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQWMsbUJBQW1CLEVBQWMsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsSyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBUyxhQUFhLEVBQXFCLE1BQU0sK0JBQStCLENBQUM7QUFJL0csT0FBTyxFQUFFLFNBQVMsRUFBZ0IsTUFBTSwrQkFBK0IsQ0FBQztBQUV4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUU5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUV0RSxNQUFNLE9BQU8sY0FBZSxTQUFRLEtBQUs7SUFFckMsWUFBWSxNQUFjO1FBRXRCLEtBQUssQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLG1IQUFtSCxDQUFDLENBQUM7UUFFaEosSUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFcEQsSUFBSSxDQUFDLFlBQVksQ0FBUSxVQUFVLENBQUMsQ0FBQztRQUVyQyxJQUFJLG1CQUFtQixHQUFlLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBRSxDQUFDO1FBRTlFLElBQUksS0FBSyxHQUFrQixVQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDL0MsS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7UUFDdkIsS0FBSyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFFNUIsSUFBSSxHQUFHLEdBQWlCO1lBQ3BCLFVBQVUs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Q3ZJO2FBQU07WUFDSCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDN0IsT0FBTyxNQUFNLENBQUM7U0FDakI7SUFDTCxDQUFDO0NBR0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBJbnRlcmZhY2UsIEtsYXNzLCBUeXBlVmFyaWFibGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvQ2xhc3MuanNcIjtcclxuaW1wb3J0IHsgYm9vbGVhblByaW1pdGl2ZVR5cGUsIGludFByaW1pdGl2ZVR5cGUsIHN0cmluZ1ByaW1pdGl2ZVR5cGUsIG9iamVjdFR5cGUsIFN0cmluZ1ByaW1pdGl2ZVR5cGUsIERvdWJsZVR5cGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvUHJpbWl0aXZlVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgTWV0aG9kLCBQYXJhbWV0ZXJsaXN0LCBWYWx1ZSwgUHJpbWl0aXZlVHlwZSwgZ2V0VHlwZUlkZW50aWZpZXIgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW50ZXJwcmV0ZXIgfSBmcm9tIFwiLi4vLi4vaW50ZXJwcmV0ZXIvSW50ZXJwcmV0ZXIuanNcIjtcclxuaW1wb3J0IHsgUnVudGltZU9iamVjdCB9IGZyb20gXCIuLi8uLi9pbnRlcnByZXRlci9SdW50aW1lT2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IFByb2dyYW0sIFN0YXRlbWVudCB9IGZyb20gXCIuLi8uLi9jb21waWxlci9wYXJzZXIvUHJvZ3JhbS5qc1wiO1xyXG5pbXBvcnQgeyBUb2tlblR5cGUsIFRleHRQb3NpdGlvbiB9IGZyb20gXCIuLi8uLi9jb21waWxlci9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheVR5cGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvQXJyYXkuanNcIjtcclxuaW1wb3J0IHsgTGlzdEl0ZXJhdG9ySW1wbENsYXNzIH0gZnJvbSBcIi4vTGlzdEl0ZXJhdG9ySW1wbC5qc1wiO1xyXG5pbXBvcnQgeyBFbnVtIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL0VudW0uanNcIjtcclxuaW1wb3J0IHsgZ2V0VHlwZUZyb21WYWx1ZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9UeXBlSGVscGVyLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQXJyYXlMaXN0Q2xhc3MgZXh0ZW5kcyBLbGFzcyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IobW9kdWxlOiBNb2R1bGUpIHtcclxuXHJcbiAgICAgICAgc3VwZXIoXCJBcnJheUxpc3RcIiwgbW9kdWxlLCBcIkxpc3RlIG1pdCBadWdyaWZmIGF1ZiBkYXMgbi10ZSBPYmpla3QgaW4ga29uc3RhbnRlciBaZWl0LCBFaW5mw7xnZW4gaW4ga29uc3RhbnRlciBaZWl0IHVuZCBTdWNoZW4gaW4gbGluZWFyZXIgWmVpdFwiKTtcclxuXHJcbiAgICAgICAgbGV0IG9iamVjdFR5cGUgPSBtb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJPYmplY3RcIik7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0QmFzZUNsYXNzKDxLbGFzcz5vYmplY3RUeXBlKTtcclxuXHJcbiAgICAgICAgbGV0IGNvbGxlY3Rpb25JbnRlcmZhY2UgPSAoPEludGVyZmFjZT5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJDb2xsZWN0aW9uXCIpKTtcclxuXHJcbiAgICAgICAgbGV0IHR5cGVBOiBLbGFzcyA9ICg8S2xhc3M+b2JqZWN0VHlwZSkuY2xvbmUoKTtcclxuICAgICAgICB0eXBlQS5pZGVudGlmaWVyID0gXCJBXCI7XHJcbiAgICAgICAgdHlwZUEuaXNUeXBlVmFyaWFibGUgPSB0cnVlO1xyXG5cclxuICAgICAgICBsZXQgdHZBOiBUeXBlVmFyaWFibGUgPSB7XHJcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IFwiQVwiLFxyXG4gICAgICAgICAgICBzY29wZUZyb206IHsgbGluZTogMSwgY29sdW1uOiAxLCBsZW5ndGg6IDEgfSxcclxuICAgICAgICAgICAgc2NvcGVUbzogeyBsaW5lOiAxLCBjb2x1bW46IDEsIGxlbmd0aDogMSB9LFxyXG4gICAgICAgICAgICB0eXBlOiB0eXBlQVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMudHlwZVZhcmlhYmxlcy5wdXNoKHR2QSk7XHJcblxyXG4gICAgICAgIGxldCBsaXN0SW50ZXJmYWNlID0gKDxJbnRlcmZhY2U+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiTGlzdFwiKSkuY2xvbmUoKTtcclxuICAgICAgICBsaXN0SW50ZXJmYWNlLnR5cGVWYXJpYWJsZXMgPSBbdHZBXTtcclxuXHJcbiAgICAgICAgdGhpcy5pbXBsZW1lbnRzLnB1c2gobGlzdEludGVyZmFjZSk7XHJcblxyXG4gICAgICAgIGxldCBpdGVyYXRvclR5cGUgPSAoPEtsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIkl0ZXJhdG9yXCIpKS5jbG9uZSgpO1xyXG4gICAgICAgIGl0ZXJhdG9yVHlwZS50eXBlVmFyaWFibGVzID0gW3R2QV07XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJBcnJheUxpc3RcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICAvLyB7IGlkZW50aWZpZXI6IFwibXhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBhaCA9IG5ldyBMaXN0SGVscGVyKG8sIG1vZHVsZS5tYWluLmdldEludGVycHJldGVyKCksIG1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICBvLmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdID0gYWg7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdJbnN0YW56aWVydCBlaW5lIG5ldWUgQXJyYXlMaXN0JywgdHJ1ZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiaXRlcmF0b3JcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBpdGVyYXRvclR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFoOiBMaXN0SGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiTGlzdEhlbHBlclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTGlzdEl0ZXJhdG9ySW1wbENsYXNzLmdldEl0ZXJhdG9yKGFoLCBhaC5pbnRlcnByZXRlciwgbW9kdWxlLCBcImFzY2VuZGluZ1wiKS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgIH0sIHRydWUsIGZhbHNlLCBcIkdpYnQgZWluZW4gSXRlcmF0b3Igw7xiZXIgZGllIEVsZW1lbnRlIGRpZXNlciBDb2xsZWN0aW9uIHp1csO8Y2suXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImFkZFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJlbGVtZW50XCIsIHR5cGU6IHR5cGVBLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcjogVmFsdWUgPSBwYXJhbWV0ZXJzWzFdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFoOiBMaXN0SGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiTGlzdEhlbHBlclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWguYWRkKHIpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkbDvGd0IGRlciBMaXN0ZSBlaW4gRWxlbWVudCBoaW56dS4gR2lidCBnZW5hdSBkYW5uIHRydWUgenVyw7xjaywgd2VubiBzaWNoIGRlciBadXN0YW5kIGRlciBMaXN0ZSBkYWR1cmNoIGdlw6RuZGVydCBoYXQuXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImFkZFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJpbmRleFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImVsZW1lbnRcIiwgdHlwZTogdHlwZUEsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9XHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBpbmRleDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByOiBWYWx1ZSA9IHBhcmFtZXRlcnNbMl07XHJcbiAgICAgICAgICAgICAgICBsZXQgYWg6IExpc3RIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBhaC5hZGQociwgaW5kZXgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkbDvGd0IGRhcyBFbGVtZW50IGFuIGRlciBQb3NpdGlvbiBpbmRleCBkZXIgTGlzdGUgZWluLiBUaXBwOiBEYXMgZXJzdGUgRWxlbWVudCBkZXIgTGlzdGUgaGF0IGluZGV4ID09IDAuXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImdldFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJpbmRleFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCB0eXBlQSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWg6IExpc3RIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWguZ2V0KGluZGV4KT8udmFsdWU7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBkYXMgaS10ZSBFbGVtZW50IGRlciBMaXN0ZSB6dXLDvGNrLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJyZW1vdmVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiaW5kZXhcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWg6IExpc3RIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGFoLnJlbW92ZShpbmRleCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICB9LCB0cnVlLCBmYWxzZSwgXCJFbnRmZXJudCBkYXMgRWxlbWVudCBhbiBkZXIgU3RlbGxlIGluZGV4LiBXSUNIVElHOiBEYXMgZXJzdGUgRWxlbWVudCBoYXQgZGVuIEluZGV4IDAuIEVzIGlzdCAwIDw9IGluZGV4IDwgc2l6ZSgpXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImluZGV4T2ZcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwib1wiLCB0eXBlOiB0eXBlQSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgb2JqZWN0OiBWYWx1ZSA9IHBhcmFtZXRlcnNbMV07XHJcbiAgICAgICAgICAgICAgICBsZXQgYWg6IExpc3RIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBhaC5pbmRleE9mKG9iamVjdCk7XHJcblxyXG4gICAgICAgICAgICB9LCB0cnVlLCBmYWxzZSwgXCJHaWJ0IGRlbiBJbmRleCBkZXMgRWxlbWVudHMgbyB6dXLDvGNrLiBHaWJ0IC0xIHp1csO8Y2ssIHdlbm4gZGllIExpc3RlIGRhcyBFbGVtZW50IG8gbmljaHQgZW50aMOkbHQuIFdJQ0hUSUc6IERhcyBlcnN0ZSBFbGVtZW50IGhhdCBkZW4gSW5kZXggMCwgZGFzIGxldHp0ZSBkZW4gSW5kZXggc2l6ZSgpIC0gMS4gXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImFkZEFsbFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJjXCIsIHR5cGU6IGNvbGxlY3Rpb25JbnRlcmZhY2UsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9XHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBvYmplY3Q6IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFoOiBMaXN0SGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiTGlzdEhlbHBlclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWguYWRkQWxsKG9iamVjdCk7XHJcblxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0cnVlLCBmYWxzZSwgXCJGw7xndCBhbGxlIEVsZW1lbnRlIHZvbiBjIGRpZXNlciBDb2xsZWN0aW9uIGhpbnp1LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJjbGVhclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFoOiBMaXN0SGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiTGlzdEhlbHBlclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWguY2xlYXIoKTtcclxuXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRydWUsIGZhbHNlLCBcIkVudGZlcm50IGFsbGUgRWxlbWVudCBhdXMgZGllc2VyIENvbGxlY3Rpb24uXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImNvbnRhaW5zXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIm9cIiwgdHlwZTogdHlwZUEsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9XHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBvYmplY3Q6IFZhbHVlID0gcGFyYW1ldGVyc1sxXTtcclxuICAgICAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFoLmNvbnRhaW5zKG9iamVjdCk7XHJcblxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0cnVlLCBmYWxzZSwgXCJUZXN0ZXQsIG9iIGRpZSBDb2xsZWN0aW9uIGRhcyBFbGVtZW50IGVudGjDpGx0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJyZW1vdmVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwib1wiLCB0eXBlOiB0eXBlQSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IG9iamVjdDogVmFsdWUgPSBwYXJhbWV0ZXJzWzFdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFoOiBMaXN0SGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiTGlzdEhlbHBlclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWgucmVtb3ZlT2JqZWN0KG9iamVjdCk7XHJcblxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0cnVlLCBmYWxzZSwgXCJFbnRmZXJudCBkYXMgRWxlbWVudCBvIGF1cyBkZXIgQ29sbGVjdGlvbi4gR2lidCB0cnVlIHp1csO8Y2ssIHdlbm4gZGllIENvbGxlY3Rpb24gZGFzIEVsZW1lbnQgZW50aGFsdGVuIGhhdHRlLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJpc0VtcHR5XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFoOiBMaXN0SGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiTGlzdEhlbHBlclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWguaXNFbXB0eSgpO1xyXG5cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdHJ1ZSwgZmFsc2UsIFwiVGVzdGV0LCBvYiBkaWUgQ29sbGVjdGlvbiBkYXMgbGVlciBpc3QuXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNpemVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFoLnNpemUoKTtcclxuXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRydWUsIGZhbHNlLCBcIkdpYnQgZGllIEFuemFobCBkZXIgRWxlbWVudGUgZGVyIENvbGxlY3Rpb24genVyw7xjay5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwidG9TdHJpbmdcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pLCBzdHJpbmdQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkxpc3RIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFoLnRvX1N0cmluZygpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlKSk7XHJcblxyXG4gICAgfVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIExpc3RIZWxwZXIge1xyXG5cclxuICAgIHZhbHVlQXJyYXk6IFZhbHVlW10gPSBbXTtcclxuICAgIG9iamVjdEFycmF5OiBhbnlbXSA9IFtdOyAvLyB3aXJkIG1pdGdlZsO8aHJ0LCB1bSBzY2huZWxsZSBpbmRleE9mLU9wZXJhdGlvbmVuIHp1IGVybcO2Z2xpY2hlblxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcnVudGltZU9iamVjdDogUnVudGltZU9iamVjdCwgcHVibGljIGludGVycHJldGVyOiBJbnRlcnByZXRlciwgcHJpdmF0ZSBtb2R1bGU6IE1vZHVsZSkge1xyXG4gICAgfVxyXG5cclxuICAgIGFsbEVsZW1lbnRzUHJpbWl0aXZlKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGZvciAobGV0IHYgb2YgdGhpcy52YWx1ZUFycmF5KSB7XHJcbiAgICAgICAgICAgIGlmICghKHYudHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUgfHwgW1wiU3RyaW5nXCIsIFwiX0RvdWJsZVwiLCBcIkludGVnZXJcIiwgXCJCb29sZWFuXCIgLFwiQ2hhcmFjdGVyXCJdLmluZGV4T2Yodi50eXBlLmlkZW50aWZpZXIpID49IDApKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICB0b19TdHJpbmcoKTogYW55IHtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYWxsRWxlbWVudHNQcmltaXRpdmUoKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJbXCIgKyB0aGlzLm9iamVjdEFycmF5Lm1hcChvID0+IFwiXCIgKyBvKS5qb2luKFwiLCBcIikgKyBcIl1cIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBwb3NpdGlvbjogVGV4dFBvc2l0aW9uID0ge1xyXG4gICAgICAgICAgICBsaW5lOiAxLFxyXG4gICAgICAgICAgICBjb2x1bW46IDEsXHJcbiAgICAgICAgICAgIGxlbmd0aDogMVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHN0YXRlbWVudHM6IFN0YXRlbWVudFtdID0gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUubm9PcCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0ZXBGaW5pc2hlZDogZmFsc2VcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hDb25zdGFudCxcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IFwiW1wiLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcblxyXG4gICAgICAgIGxldCB0b1N0cmluZ1BhcmFtZXRlcnMgPSBuZXcgUGFyYW1ldGVybGlzdChbXSk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52YWx1ZUFycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxldCB2YWx1ZSA9IHRoaXMudmFsdWVBcnJheVtpXTtcclxuICAgICAgICAgICAgaWYgKHZhbHVlLnZhbHVlID09IG51bGwgfHwgdmFsdWUudHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUgfHwgdmFsdWUudHlwZSBpbnN0YW5jZW9mIFN0cmluZ1ByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgIHN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hDb25zdGFudCxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhVHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUudmFsdWUgPT0gbnVsbCA/IFwibnVsbFwiIDogdmFsdWUudHlwZS5jYXN0VG8odmFsdWUsIHN0cmluZ1ByaW1pdGl2ZVR5cGUpLnZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hDb25zdGFudCxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhVHlwZTogdmFsdWUudHlwZSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUudmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb25cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgc3RhdGVtZW50cy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuY2FsbE1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICg8S2xhc3MgfCBJbnRlcmZhY2UgfCBFbnVtPnZhbHVlLnR5cGUpLmdldE1ldGhvZChcInRvU3RyaW5nXCIsIHRvU3RyaW5nUGFyYW1ldGVycyksXHJcbiAgICAgICAgICAgICAgICAgICAgaXNTdXBlckNhbGw6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrZnJhbWVCZWdpbjogLTEsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb25cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc3RhdGVtZW50cy5wdXNoKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5iaW5hcnlPcCxcclxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBUb2tlblR5cGUucGx1cyxcclxuICAgICAgICAgICAgICAgIGxlZnRUeXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChpIDwgdGhpcy52YWx1ZUFycmF5Lmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIHN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hDb25zdGFudCxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhVHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogXCIsIFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLmJpbmFyeU9wLFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBUb2tlblR5cGUucGx1cyxcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0VHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3RhdGVtZW50cy5wdXNoKHtcclxuICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hDb25zdGFudCxcclxuICAgICAgICAgICAgZGF0YVR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIHZhbHVlOiBcIl1cIixcclxuICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5iaW5hcnlPcCxcclxuICAgICAgICAgICAgb3BlcmF0b3I6IFRva2VuVHlwZS5wbHVzLFxyXG4gICAgICAgICAgICBsZWZ0VHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIHN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgLy8gICAgIHR5cGU6IFRva2VuVHlwZS5iaW5hcnlPcCxcclxuICAgICAgICAvLyAgICAgb3BlcmF0b3I6IFRva2VuVHlwZS5wbHVzLFxyXG4gICAgICAgIC8vICAgICBsZWZ0VHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAvLyAgICAgc3RlcEZpbmlzaGVkOiBmYWxzZSxcclxuICAgICAgICAvLyAgICAgcG9zaXRpb246IHBvc2l0aW9uXHJcbiAgICAgICAgLy8gfSk7XHJcblxyXG4gICAgICAgIHN0YXRlbWVudHMucHVzaCh7XHJcbiAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5yZXR1cm4sXHJcbiAgICAgICAgICAgIGNvcHlSZXR1cm5WYWx1ZVRvU3RhY2tmcmFtZVBvczA6IHRydWUsXHJcbiAgICAgICAgICAgIGxlYXZlVGhpc09iamVjdE9uU3RhY2s6IGZhbHNlLFxyXG4gICAgICAgICAgICBzdGVwRmluaXNoZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgIG1ldGhvZFdhc0luamVjdGVkOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGxldCBwcm9ncmFtOiBQcm9ncmFtID0ge1xyXG4gICAgICAgICAgICBtb2R1bGU6IHRoaXMubW9kdWxlLFxyXG4gICAgICAgICAgICBzdGF0ZW1lbnRzOiBzdGF0ZW1lbnRzLFxyXG4gICAgICAgICAgICBsYWJlbE1hbmFnZXI6IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtZXRob2Q6IE1ldGhvZCA9IG5ldyBNZXRob2QoXCJ0b1N0cmluZ1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXSksIHN0cmluZ1ByaW1pdGl2ZVR5cGUsIHByb2dyYW0sIGZhbHNlLCBmYWxzZSk7XHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlci5ydW5UaW1lcihtZXRob2QsIFtdLCAoKSA9PiB7fSwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZEFsbChvYmplY3Q6IFJ1bnRpbWVPYmplY3QpOiBib29sZWFuIHtcclxuXHJcbiAgICAgICAgaWYob2JqZWN0LmludHJpbnNpY0RhdGFbXCJMaXN0SGVscGVyXCJdIGluc3RhbmNlb2YgTGlzdEhlbHBlcil7XHJcbiAgICAgICAgICAgIGxldCBhaDogTGlzdEhlbHBlciA9IG9iamVjdC5pbnRyaW5zaWNEYXRhW1wiTGlzdEhlbHBlclwiXTtcclxuICAgICAgICAgICAgaWYgKGFoICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWVBcnJheSA9IHRoaXMudmFsdWVBcnJheS5jb25jYXQoYWgudmFsdWVBcnJheS5tYXAodiA9PiB7cmV0dXJuIHt0eXBlOiB2LnR5cGUsIHZhbHVlOiB2LnZhbHVlfX0pKTtcclxuICAgICAgICAgICAgICAgIHRoaXMub2JqZWN0QXJyYXkgPSB0aGlzLm9iamVjdEFycmF5LmNvbmNhdChhaC5vYmplY3RBcnJheSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZ2V0SXRlcmF0b3JNZXRob2QgPSBvYmplY3QuY2xhc3MuZ2V0TWV0aG9kKFwiaXRlcmF0b3JcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pKTtcclxuICAgICAgICBpZihnZXRJdGVyYXRvck1ldGhvZCA9PSBudWxsKXtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkRlciBhbiBkaWUgTWV0aG9kZSBhZGRBbGwgw7xiZXJnZWJlbmUgUGFyYW10ZXIgYmVzaXR6dCBrZWluZSBNZXRob2RlIGl0ZXJhdG9yKCkuXCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihnZXRJdGVyYXRvck1ldGhvZC5pbnZva2Upe1xyXG5cclxuICAgICAgICAgICAgbGV0IGl0ZXJhdG9yOiBSdW50aW1lT2JqZWN0ID0gZ2V0SXRlcmF0b3JNZXRob2QuaW52b2tlKFt7dmFsdWU6IG9iamVjdCwgdHlwZTogb2JqZWN0LmNsYXNzfV0pO1xyXG4gICAgICAgICAgICBsZXQgbmV4dE1ldGhvZCA9IGl0ZXJhdG9yLmNsYXNzLmdldE1ldGhvZChcIm5leHRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pKTtcclxuICAgICAgICAgICAgbGV0IGhhc05leHRNZXRob2QgPSBpdGVyYXRvci5jbGFzcy5nZXRNZXRob2QoXCJoYXNOZXh0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtdKSk7XHJcbiAgICAgICAgICAgIGxldCB0eXBlID0gbmV4dE1ldGhvZC5yZXR1cm5UeXBlO1xyXG5cclxuICAgICAgICAgICAgbGV0IGl0ZXJhdG9yQXNWYWx1ZTogVmFsdWUgPSB7dmFsdWU6IGl0ZXJhdG9yLCB0eXBlOiBpdGVyYXRvci5jbGFzc307XHJcblxyXG4gICAgICAgICAgICB3aGlsZShoYXNOZXh0TWV0aG9kLmludm9rZShbaXRlcmF0b3JBc1ZhbHVlXSkpe1xyXG4gICAgICAgICAgICAgICAgbGV0IG9iajogYW55ID0gbmV4dE1ldGhvZC5pbnZva2UoW2l0ZXJhdG9yQXNWYWx1ZV0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vYmplY3RBcnJheS5wdXNoKG9iaik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlQXJyYXkucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG9iaixcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBnZXRUeXBlRnJvbVZhbHVlKG9iailcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgaXRlcmF0b3JXaXRoRXJyb3IgPSB0aGlzLmV4ZWN1dGUoZ2V0SXRlcmF0b3JNZXRob2QsIFt7dmFsdWU6IG9iamVjdCwgdHlwZTogb2JqZWN0LmNsYXNzfV0pOyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZihpdGVyYXRvcldpdGhFcnJvci5lcnJvciAhPSBudWxsKXt0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRmVobGVyIGJlaW0gaG9sZW4gZGVzIEl0ZXJhdG9ycy5cIik7IHJldHVybiBmYWxzZTt9XHJcbiAgICAgICAgICAgIGxldCBpdGVyYXRvciA9IGl0ZXJhdG9yV2l0aEVycm9yLnZhbHVlLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5leHRNZXRob2QgPSBpdGVyYXRvci5jbGFzcy5nZXRNZXRob2QoXCJuZXh0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtdKSk7XHJcbiAgICAgICAgICAgIGxldCBoYXNOZXh0TWV0aG9kID0gaXRlcmF0b3IuY2xhc3MuZ2V0TWV0aG9kKFwiaGFzTmV4dFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXSkpO1xyXG4gICAgICAgICAgICBsZXQgdHlwZSA9IG5leHRNZXRob2QucmV0dXJuVHlwZTtcclxuICAgICAgICAgICAgbGV0IGl0ZXJhdG9yQXNWYWx1ZTogVmFsdWUgPSB7dmFsdWU6IGl0ZXJhdG9yLCB0eXBlOiBpdGVyYXRvci5jbGFzc307XHJcblxyXG4gICAgICAgICAgICB3aGlsZSh0cnVlKXtcclxuICAgICAgICAgICAgICAgIGxldCBoYXNOZXh0ID0gdGhpcy5leGVjdXRlKGhhc05leHRNZXRob2QsIFtpdGVyYXRvckFzVmFsdWVdKTtcclxuICAgICAgICAgICAgICAgIGlmKGhhc05leHQuZXJyb3IgIT0gbnVsbCl7dGhpcy5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkZlaGxlciBiZWltIEF1c2bDvGhyZW4gZGVyIGhhc05leHQtTWV0aG9kZVwiKTsgcmV0dXJuIGZhbHNlO31cclxuICAgICAgICAgICAgICAgIGlmKGhhc05leHQudmFsdWUudmFsdWUgIT0gdHJ1ZSkgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBsZXQgb2JqV2l0aEVycm9yID0gdGhpcy5leGVjdXRlKG5leHRNZXRob2QsIFtpdGVyYXRvckFzVmFsdWVdKTtcclxuICAgICAgICAgICAgICAgIGlmKG9ialdpdGhFcnJvci5lcnJvciAhPSBudWxsKXt0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRmVobGVyIGJlaW0gQXVzZsO8aHJlbiBkZXIgbmV4dC1NZXRob2RlXCIpOyByZXR1cm4gZmFsc2U7fVxyXG4gICAgICAgICAgICAgICAgbGV0IG9iaiA9IG9ialdpdGhFcnJvci52YWx1ZS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMub2JqZWN0QXJyYXkucHVzaChvYmopO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZUFycmF5LnB1c2goe3ZhbHVlOiBvYmosIHR5cGU6IHR5cGV9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShtZXRob2Q6IE1ldGhvZCwgcGFyYW1ldGVyczogVmFsdWVbXSk6IHtlcnJvcjogc3RyaW5nLCB2YWx1ZTogVmFsdWV9IHtcclxuICAgICAgICBpZihtZXRob2QuaW52b2tlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHt2YWx1ZToge3ZhbHVlOiBtZXRob2QuaW52b2tlKFtdKSwgdHlwZTogbWV0aG9kLnJldHVyblR5cGV9LCBlcnJvcjogbnVsbH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW50ZXJwcmV0ZXIuZXhlY3V0ZUltbWVkaWF0ZWx5SW5OZXdTdGFja2ZyYW1lKG1ldGhvZC5wcm9ncmFtLCBwYXJhbWV0ZXJzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0KGluZGV4OiBudW1iZXIpOiBWYWx1ZSB7XHJcbiAgICAgICAgaWYgKGluZGV4ID49IDAgJiYgaW5kZXggPCB0aGlzLnZhbHVlQXJyYXkubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlQXJyYXlbaW5kZXhdO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGVyIEFycmF5TGlzdC1JbmRleCBpc3QgYXXDn2VyaGFsYiBkZXMgSW50ZXJ2YWxscyB2b24gMCBiaXMgXCIgKyAodGhpcy52YWx1ZUFycmF5Lmxlbmd0aCAtIDEpICsgXCIuIFwiKVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZShpbmRleDogbnVtYmVyKTogVmFsdWUge1xyXG5cclxuICAgICAgICBpZiAoaW5kZXggPj0gMCAmJiBpbmRleCA8IHRoaXMudmFsdWVBcnJheS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZUFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgIHRoaXMub2JqZWN0QXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGVyIEFycmF5TGlzdC1JbmRleCBpc3QgYXXDn2VyaGFsYiBkZXMgSW50ZXJ2YWxscyB2b24gMCBiaXMgXCIgKyAodGhpcy52YWx1ZUFycmF5Lmxlbmd0aCAtIDEpICsgXCIuIFwiKVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBhZGQocjogVmFsdWUsIGluZGV4Pyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmKGluZGV4ID09IG51bGwpe1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlQXJyYXkucHVzaCh7dHlwZTogci50eXBlLCB2YWx1ZTogci52YWx1ZX0pO1xyXG4gICAgICAgICAgICB0aGlzLm9iamVjdEFycmF5LnB1c2goci52YWx1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYoaW5kZXggPD0gdGhpcy5vYmplY3RBcnJheS5sZW5ndGggJiYgaW5kZXggPj0gMCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlQXJyYXkuc3BsaWNlKGluZGV4LCAwLCB7dHlwZTogci50eXBlLCB2YWx1ZTogci52YWx1ZX0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vYmplY3RBcnJheS5zcGxpY2UoaW5kZXgsIDAsIHIudmFsdWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkRlciBBcnJheUxpc3QtSW5kZXggaXN0IGF1w59lcmhhbGIgZGVzIEludGVydmFsbHMgdm9uIDAgYmlzIFwiICsgKHRoaXMudmFsdWVBcnJheS5sZW5ndGggLSAxKSArIFwiLiBcIilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBwb3AoKTogYW55IHtcclxuICAgICAgICBpZiAodGhpcy5vYmplY3RBcnJheS5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGVyIEFycmF5TGlzdC1JbmRleCBpc3QgYXXDn2VyaGFsYiBkZXMgSW50ZXJ2YWxscyB2b24gMCBiaXMgXCIgKyAodGhpcy52YWx1ZUFycmF5Lmxlbmd0aCAtIDEpICsgXCIuIFwiKVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlQXJyYXkucG9wKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9iamVjdEFycmF5LnBvcCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwZWVrKCk6IGFueSB7XHJcbiAgICAgICAgaWYgKHRoaXMub2JqZWN0QXJyYXkubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkRlciBBcnJheUxpc3QtSW5kZXggaXN0IGF1w59lcmhhbGIgZGVzIEludGVydmFsbHMgdm9uIDAgYmlzIFwiICsgKHRoaXMudmFsdWVBcnJheS5sZW5ndGggLSAxKSArIFwiLiBcIilcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMub2JqZWN0QXJyYXlbdGhpcy5vYmplY3RBcnJheS5sZW5ndGggLSAxXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaW5kZXhPZihvOiBWYWx1ZSk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMub2JqZWN0QXJyYXkuaW5kZXhPZihvLnZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBzaXplKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMub2JqZWN0QXJyYXkubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIGlzRW1wdHkoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVBcnJheS5sZW5ndGggPT0gMDtcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmVPYmplY3Qob2JqZWN0OiBWYWx1ZSkge1xyXG4gICAgICAgIGxldCBpbmRleCA9IHRoaXMub2JqZWN0QXJyYXkuaW5kZXhPZihvYmplY3QudmFsdWUpO1xyXG4gICAgICAgIGlmIChpbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMub2JqZWN0QXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZUFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnRhaW5zKG9iamVjdDogVmFsdWUpOiBhbnkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm9iamVjdEFycmF5LmluZGV4T2Yob2JqZWN0LnZhbHVlKSA+PSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGNsZWFyKCkge1xyXG4gICAgICAgIHRoaXMudmFsdWVBcnJheSA9IFtdO1xyXG4gICAgICAgIHRoaXMub2JqZWN0QXJyYXkgPSBbXTtcclxuICAgIH1cclxuXHJcbiAgICBwZWVrX2xhc3Rfb3JfbnVsbCgpOiBhbnkge1xyXG4gICAgICAgIGlmICh0aGlzLm9iamVjdEFycmF5Lmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9iamVjdEFycmF5W3RoaXMub2JqZWN0QXJyYXkubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcGVla19maXJzdF9vcl9udWxsKCk6IGFueSB7XHJcbiAgICAgICAgaWYgKHRoaXMub2JqZWN0QXJyYXkubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMub2JqZWN0QXJyYXlbMF07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZW1vdmVMYXN0X29yX2Vycm9yKCl7XHJcbiAgICAgICAgaWYgKHRoaXMub2JqZWN0QXJyYXkubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZUFycmF5LnBvcCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vYmplY3RBcnJheS5wb3AoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGFkZExhc3Qob2JqZWN0OiBWYWx1ZSkge1xyXG4gICAgICAgIHRoaXMudmFsdWVBcnJheS5wdXNoKHt0eXBlOiBvYmplY3QudHlwZSwgdmFsdWU6IG9iamVjdC52YWx1ZX0pO1xyXG4gICAgICAgIHRoaXMub2JqZWN0QXJyYXkucHVzaChvYmplY3QudmFsdWUpO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgYWRkRmlyc3Qob2JqZWN0OiBWYWx1ZSk6IGFueSB7XHJcbiAgICAgICAgdGhpcy52YWx1ZUFycmF5LnNwbGljZSgwLCAwLCB7dHlwZTogb2JqZWN0LnR5cGUsIHZhbHVlOiBvYmplY3QudmFsdWV9KTtcclxuICAgICAgICB0aGlzLm9iamVjdEFycmF5LnNwbGljZSgwLCAwLCBvYmplY3QudmFsdWUpO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgcmVtb3ZlRmlyc3RPY2N1cnJlbmNlKG9iamVjdDogVmFsdWUpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgaW5kZXggPSB0aGlzLm9iamVjdEFycmF5LmluZGV4T2Yob2JqZWN0LnZhbHVlKTtcclxuICAgICAgICBpZihpbmRleCA+PSAwKXtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZUFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgIHRoaXMub2JqZWN0QXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBwZWVrX29yX251bGwoKTogYW55IHtcclxuICAgICAgICBpZiAodGhpcy5vYmplY3RBcnJheS5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vYmplY3RBcnJheVt0aGlzLm9iamVjdEFycmF5Lmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwb2xsX29yX251bGwoKTogYW55IHtcclxuICAgICAgICBpZiAodGhpcy5vYmplY3RBcnJheS5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlQXJyYXkucG9wKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9iamVjdEFycmF5LnBvcCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZW1vdmVGaXJzdF9vcl9lcnJvcigpOiBhbnkge1xyXG4gICAgICAgIGlmKHRoaXMub2JqZWN0QXJyYXkubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGVyIEFycmF5TGlzdC1JbmRleCBpc3QgYXXDn2VyaGFsYiBkZXMgSW50ZXJ2YWxscyB2b24gMCBiaXMgXCIgKyAodGhpcy52YWx1ZUFycmF5Lmxlbmd0aCAtIDEpICsgXCIuIFwiKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCBvYmplY3QgPSB0aGlzLm9iamVjdEFycmF5WzBdO1xyXG4gICAgICAgICAgICB0aGlzLm9iamVjdEFycmF5LnNwbGljZSgwLCAxKTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZUFycmF5LnNwbGljZSgwLCAxKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxufVxyXG4iXX0=