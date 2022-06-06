import { TokenType } from "../compiler/lexer/Token.js";
import { NType } from "./NewType.js";
export class NullType extends NType {
    getCastExpression(otherType) {
        return { e: "$1" };
    }
    castTo(otherType, value) {
        return value;
    }
    getOperatorExpression(operator, otherType) {
        return { e: "$1" };
    }
    getOperatorResultType(operator, otherType) {
        return this;
    }
    compute(operator, otherType, value1, value2) {
        return null;
    }
    equals(otherType) {
        return otherType == this;
    }
    debugOutput(value, maxLength) {
        return "null";
    }
}
export class NPrimitiveType extends NType {
    constructor() {
        super(...arguments);
        this.initialValue = null;
    }
    isPrimitive() {
        return true;
    }
    equals(type) {
        return type == this;
    }
    getCastExpression(otherType) {
        let expr = this.canCastToMap[otherType.identifier].expression;
        return { e: expr == null ? "$1" : expr };
    }
    castTo(otherType, value) {
        let castInfo = this.canCastToMap[otherType.identifier];
        return castInfo.expression == null ? value : castInfo.castFunction(value);
    }
    getOperatorResultType(operator, otherType) {
        return this.resultTypeTable[operator][otherType.identifier];
    }
    debugOutput(value, maxLength) {
        let str = (value + "");
        return str.length > length ?
            str.substring(0, length - 3) + "..." :
            str;
    }
    getStandardOperatorExpression(operator, otherType) {
        let expression;
        let condition = null;
        let errormessage = null;
        switch (operator) {
            case TokenType.plus:
                if (otherType.identifier == "String") {
                    expression = '"" + $1 + $2';
                }
                else {
                    expression = "$1 + $2";
                }
            case TokenType.minus:
                if (otherType == null)
                    expression = "-$1";
                expression = "$1 - $2";
            case TokenType.multiplication:
                expression = "$1*$2";
            case TokenType.doublePlus:
                expression = "$1++";
            case TokenType.doubleMinus:
                expression = "$1--";
            case TokenType.negation:
                expression = "-$1";
            case TokenType.tilde:
                expression = "~$1";
            case TokenType.lower:
                expression = "$1 < $2";
            case TokenType.greater:
                expression = "$1 > $2";
            case TokenType.lowerOrEqual:
                expression = "$1 <= $2";
            case TokenType.greaterOrEqual:
                expression = "$1 <= $2";
            case TokenType.equal:
                expression = "$1 == $2";
            case TokenType.notEqual:
                expression = "$1 != $2";
            case TokenType.OR:
                expression = "$1 | $2";
            case TokenType.XOR:
                expression = "$1 ^ $2";
            case TokenType.ampersand:
                expression = "$1 & $2";
            case TokenType.shiftLeft:
                expression = "$1 << $2";
            case TokenType.shiftRight:
                expression = "$1 >> $2";
            case TokenType.shiftRightUnsigned:
                expression = "$1 >>> $2";
        }
        return { e: expression, condition: condition, errormessage: errormessage };
    }
    standardCompute(operator, otherType, value1, value2) {
        switch (operator) {
            case TokenType.plus:
                if (otherType.identifier == "String") {
                    return value1 + (value2);
                }
                else {
                    return value1 + (value2);
                }
            case TokenType.minus:
                if (value2 == null)
                    return -value1;
                return value1 - (value2);
            case TokenType.multiplication:
                return value1 * (value2);
            case TokenType.doublePlus:
                return value1++;
            case TokenType.doubleMinus:
                return value1--;
            case TokenType.negation:
                return -value1;
            case TokenType.tilde:
                return ~value1;
            case TokenType.lower:
                return value1 < (value2);
            case TokenType.greater:
                return value1 > (value2);
            case TokenType.lowerOrEqual:
                return value1 <= (value2);
            case TokenType.greaterOrEqual:
                return value1 >= (value2);
            case TokenType.equal:
                return value1 == (value2);
            case TokenType.notEqual:
                return value1 != (value2);
            case TokenType.OR:
                return value1 | (value2);
            case TokenType.XOR:
                return value1 ^ (value2);
            case TokenType.ampersand:
                return value1 & (value2);
            case TokenType.shiftLeft:
                return value1 << (value2);
            case TokenType.shiftRight:
                return value1 >> (value2);
            case TokenType.shiftRightUnsigned:
                return value1 >>> (value2);
        }
    }
}
export class NIntPrimitiveType extends NPrimitiveType {
    constructor() {
        super();
        this.identifier = "int";
        this.canCastToMap = {
            "double": { expression: null }, "float": { expression: null },
            "char": { expression: "String.fromCharCode($1)", castFunction: (v) => { return String.fromCharCode(v); } },
            "String": { expression: '("" + $1)', castFunction: (v) => { return "" + v; } }
        };
        this.resultTypeStringTable = {
            [TokenType.plus]: { "int": "int", "Integer": "int", "float": "float", "Float": "float", "double": "double", "Double": "double", "String": "String" },
            [TokenType.minus]: { "none": "int", "int": "int", "Integer": "int", "float": "float", "Float": "float", "double": "double", "Double": "double" },
            [TokenType.multiplication]: { "int": "int", "Integer": "int", "float": "float", "Float": "float", "double": "double", "Double": "double" },
            [TokenType.modulo]: { "int": "int", "Integer": "int" },
            [TokenType.division]: { "int": "int", "Integer": "int", "float": "float", "Float": "float", "double": "double", "Double": "double" },
            [TokenType.doublePlus]: { "none": "int" },
            [TokenType.doubleMinus]: { "none": "int" },
            [TokenType.negation]: { "none": "int" },
            [TokenType.tilde]: { "none": "int" },
            [TokenType.lower]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.greater]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.lowerOrEqual]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.greaterOrEqual]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.equal]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.notEqual]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            // binary ops
            [TokenType.OR]: { "int": "int", "Integer": "int" },
            [TokenType.XOR]: { "int": "int", "Integer": "int" },
            [TokenType.ampersand]: { "int": "int", "Integer": "int" },
            [TokenType.shiftLeft]: { "int": "int", "Integer": "int" },
            [TokenType.shiftRight]: { "int": "int", "Integer": "int" },
            [TokenType.shiftRightUnsigned]: { "int": "int", "Integer": "int" }
        };
    }
    getOperatorExpression(operator, otherType) {
        let expression;
        switch (operator) {
            case TokenType.division:
                if (otherType.identifier == "int") {
                    expression = "Math.trunc($1/$2)";
                }
                else {
                    expression = "$1/$2";
                }
                return { e: expression, condition: "$2 != 0", errormessage: "Division durch 0 ist nicht erlaubt." };
            case TokenType.modulo:
                if (otherType.identifier == "int") {
                    expression = "Math.trunc($1 % $2)";
                }
                else {
                    expression = "1";
                }
                return { e: expression, condition: "$2 != 0", errormessage: "Modulo 0 ist nicht erlaubt." };
            default:
                return this.getStandardOperatorExpression(operator, otherType);
        }
    }
    compute(operator, otherType, value1, value2) {
        switch (operator) {
            case TokenType.division:
                if (otherType.identifier == "int") {
                    return Math.trunc(value1 / (value2));
                }
                return value1 / (value2);
            case TokenType.modulo:
                if (otherType.identifier == "int") {
                    return Math.trunc(value1 % (value2));
                }
                return 1;
            default: return this.standardCompute(operator, otherType, value1, value2);
        }
    }
}
export class NFloatPrimitiveType extends NPrimitiveType {
    constructor() {
        super();
        this.identifier = "float";
        this.canCastToMap = {
            "double": { expression: null }, "float": { expression: null },
            "String": { expression: '("" + $1)', castFunction: (v) => { return "" + v; } }
        };
        this.resultTypeStringTable = {
            [TokenType.plus]: { "int": "float", "Integer": "float", "float": "float", "Float": "float", "double": "double", "Double": "double", "String": "String" },
            [TokenType.minus]: { "none": "int", "int": "float", "Integer": "float", "float": "float", "Float": "float", "double": "double", "Double": "double" },
            [TokenType.multiplication]: { "int": "float", "Integer": "float", "float": "float", "Float": "float", "double": "double", "Double": "double" },
            [TokenType.division]: { "int": "float", "Integer": "float", "float": "float", "Float": "float", "double": "double", "Double": "double" },
            [TokenType.doublePlus]: { "none": "float" },
            [TokenType.doubleMinus]: { "none": "float" },
            [TokenType.negation]: { "none": "float" },
            [TokenType.lower]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.greater]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.lowerOrEqual]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.greaterOrEqual]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.equal]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.notEqual]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
        };
    }
    getOperatorExpression(operator, otherType) {
        let expression;
        switch (operator) {
            case TokenType.division:
                expression = "$1/$2";
                return { e: expression, condition: "$2 != 0", errormessage: "Division durch 0 ist nicht erlaubt." };
            default:
                return this.getStandardOperatorExpression(operator, otherType);
        }
    }
    compute(operator, otherType, value1, value2) {
        switch (operator) {
            case TokenType.division:
                return value1 / (value2);
            default: return this.standardCompute(operator, otherType, value1, value2);
        }
    }
}
export class NDoublePrimitiveType extends NPrimitiveType {
    constructor() {
        super();
        this.identifier = "float";
        this.canCastToMap = {
            "double": { expression: null }, "float": { expression: null },
            "String": { expression: '("" + $1)', castFunction: (v) => { return "" + v; } }
        };
        this.resultTypeStringTable = {
            [TokenType.plus]: { "int": "double", "Integer": "double", "float": "double", "Float": "double", "double": "double", "Double": "double", "String": "String" },
            [TokenType.minus]: { "none": "int", "int": "double", "Integer": "double", "float": "double", "Float": "double", "double": "double", "Double": "double" },
            [TokenType.multiplication]: { "int": "double", "Integer": "double", "float": "double", "Float": "double", "double": "double", "Double": "double" },
            [TokenType.division]: { "int": "double", "Integer": "double", "float": "double", "Float": "double", "double": "double", "Double": "double" },
            [TokenType.doublePlus]: { "none": "double" },
            [TokenType.doubleMinus]: { "none": "double" },
            [TokenType.negation]: { "none": "double" },
            [TokenType.lower]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.greater]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.lowerOrEqual]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.greaterOrEqual]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.equal]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
            [TokenType.notEqual]: { "int": "boolean", "float": "boolean", "double": "boolean", "Integer": "boolean", "Float": "boolean", "Double": "boolean" },
        };
    }
    getOperatorExpression(operator, otherType) {
        let expression;
        switch (operator) {
            case TokenType.division:
                expression = "$1/$2";
                return { e: expression, condition: "$2 != 0", errormessage: "Division durch 0 ist nicht erlaubt." };
            default:
                return this.getStandardOperatorExpression(operator, otherType);
        }
    }
    compute(operator, otherType, value1, value2) {
        switch (operator) {
            case TokenType.division:
                return value1 / (value2);
            default: return this.standardCompute(operator, otherType, value1, value2);
        }
    }
}
export class NBooleanPrimitiveType extends NPrimitiveType {
    constructor() {
        super();
        this.identifier = "boolean";
        this.initialValue = false;
        this.canCastToMap = {
            "String": { expression: '$1 ? "true" : "false"', castFunction: (v) => { return v ? "true" : "false"; } }
        };
        this.resultTypeStringTable = {
            [TokenType.plus]: { "String": "String" },
            [TokenType.and]: { "boolean": "boolean" },
            [TokenType.or]: { "boolean": "boolean" },
            [TokenType.not]: { "none": "boolean" },
            [TokenType.equal]: { "boolean": "boolean" },
            [TokenType.notEqual]: { "boolean": "boolean" },
        };
    }
    getOperatorExpression(operator, otherType) {
        switch (operator) {
            case TokenType.plus:
                return { e: '(($1 ? "true" : "false") + $2)' };
            case TokenType.and:
                return { e: '$1 && $2' };
            case TokenType.or:
                return { e: '$1 || $2' };
            case TokenType.not:
                return { e: '!$1' };
            case TokenType.equal:
                return { e: '$1 == $2' };
            case TokenType.notEqual:
                return { e: '$1 != $2' };
            default:
                break;
        }
    }
    compute(operator, otherType, value1, value2) {
        switch (operator) {
            case TokenType.plus:
                return (value1 ? "true" : "false") + value2;
            case TokenType.and: return value1 && value2;
            case TokenType.or: return value1 || value2;
            case TokenType.not: return !value1;
            case TokenType.equal: return value1 == value2;
            case TokenType.notEqual: return value1 != value2;
            default:
                break;
        }
    }
}
export class NCharPrimitiveType extends NPrimitiveType {
    constructor() {
        super();
        this.identifier = "char";
        this.initialValue = "\u0000";
        this.canCastToMap = {
            "String": { expression: '$1', castFunction: (v) => { return v; } }
        };
        this.resultTypeStringTable = {
            [TokenType.plus]: { "char": "String", "String": "String" },
            [TokenType.lower]: { "char": "boolean" },
            [TokenType.greater]: { "char": "boolean" },
            [TokenType.lowerOrEqual]: { "char": "boolean" },
            [TokenType.greaterOrEqual]: { "char": "boolean" },
            [TokenType.equal]: { "char": "boolean" },
            [TokenType.notEqual]: { "char": "boolean" },
        };
    }
    getOperatorExpression(operator, otherType) {
        return this.getStandardOperatorExpression(operator, otherType);
    }
    compute(operator, otherType, value1, value2) {
        return this.standardCompute(operator, otherType, value1, value2);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTmV3UHJpbWl0aXZlVHlwZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGllbnQvbmV3Y29tcGlsZXIvTmV3UHJpbWl0aXZlVHlwZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdkQsT0FBTyxFQUFlLEtBQUssRUFBRSxNQUFNLGNBQWMsQ0FBQztBQVNsRCxNQUFNLE9BQU8sUUFBUyxTQUFRLEtBQUs7SUFDL0IsaUJBQWlCLENBQUMsU0FBZ0I7UUFDOUIsT0FBTyxFQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQztJQUNwQixDQUFDO0lBQ0QsTUFBTSxDQUFDLFNBQWdCLEVBQUUsS0FBVTtRQUMvQixPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBQ0QscUJBQXFCLENBQUMsUUFBbUIsRUFBRSxTQUFpQjtRQUN4RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxxQkFBcUIsQ0FBQyxRQUFtQixFQUFFLFNBQWdCO1FBQ3ZELE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFDRCxPQUFPLENBQUMsUUFBbUIsRUFBRSxTQUFnQixFQUFFLE1BQVcsRUFBRSxNQUFZO1FBQ3BFLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFDRCxNQUFNLENBQUMsU0FBZ0I7UUFDbkIsT0FBTyxTQUFTLElBQUksSUFBSSxDQUFDO0lBQzdCLENBQUM7SUFDTSxXQUFXLENBQUMsS0FBVSxFQUFFLFNBQWtCO1FBQzdDLE9BQU8sTUFBTSxDQUFDO0lBQ2xCLENBQUM7Q0FFSjtBQUVELE1BQU0sT0FBZ0IsY0FBZSxTQUFRLEtBQUs7SUFBbEQ7O1FBRVcsaUJBQVksR0FBUSxJQUFJLENBQUM7SUFnTHBDLENBQUM7SUF6S1UsV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFTSxNQUFNLENBQUMs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USxFQUFFLFFBQVEsRUFBRTtZQUNoSixDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFO1lBQzFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFO1lBQ3RELENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7WUFDcEksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO1lBQ3pDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtZQUMxQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7WUFDdkMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO1lBQ3BDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUU7WUFDL0ksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRTtZQUNqSixDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFO1lBQ3RKLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUU7WUFDeEosQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRTtZQUMvSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFO1lBRWxKLGFBQWE7WUFDYixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRTtZQUNsRCxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFB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TyxFQUFFO1lBQ3pDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUU7WUFDL0ksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRTtZQUNqSixDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFO1lBQ3RKLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUU7WUFDeEosQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRTtZQUMvSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVB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QUM3QyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7WUFDMUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRTtZQUMvSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFO1lBQ2pKLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUU7WUFDdEosQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRTtZQUN4SixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFO1lBQy9JLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUU7U0FDckosQ0FBQTtJQUNMLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxRQUFtQixFQUFFLFNBQWlCO1FBQ3hELElBQUksVUFBa0IsQ0FBQztRQUV2QixRQUFRLFFBQVEsRUFBRTtZQUNkLEtBQUssU0FBUyxDQUFDLFFBQVE7Z0JBQ25CLFVBQVUsR0FBRyxPQUFPLENBQUE7Z0JBQ3BCLE9BQU8sRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLHFDQUFxQyxFQUFFLENBQUM7WUFDeEc7Z0JBQ0ksT0FBTyxJQUFJLENBQUMsNkJBQTZCLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1NBQ3RFO0lBQ0wsQ0FBQztJQUVELE9BQU8sQ0FBQyxRQUFtQixFQUFFLFNBQWdCLEVBQUUsTUFBVyxFQUFFLE1BQVk7UUFFcEUsUUFBUSxRQUFRLEVBQUU7WUFDZCxLQUFLLFNBQVMsQ0FBQyxRQUFRO2dCQUNuQixPQUFPLE1BQU0sR0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXJDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztTQUM3RTtJQUVMLENBQUM7Q0FFSjtBQUVELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxjQUFjO0lBQ3JEO1FBQ0ksS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUM1QixJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztRQUUxQixJQUFJLENBQUMsWUFBWSxHQUFHO1lBQ2hCLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSx1QkFBdUIsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQSxDQUFDLENBQUMsRUFBRTtTQUMxRyxDQUFDO1FBRUYsSUFBSSxDQUFDLHFCQUFxQixHQUFHO1lBQ3pCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRTtZQUN4QyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7WUFDekMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1lBQ3hDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRTtZQUN0QyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7WUFDM0MsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1NBQ2pELENBQUE7SUFDTCxDQUFDO0lBRUQscUJBQXFCLENBQUMsUUFBbUIsRUFBRSxTQUFpQjtRQUV4RCxRQUFRLFFBQVEsRUFBRTtZQUNkLEtBQUssU0FBUyxDQUFDLElBQUk7Z0JBQ2YsT0FBTyxFQUFFLENBQUMsRUFBRSxnQ0FBZ0MsRUFBQyxDQUFBO1lBQ2pELEtBQUssU0FBUyxDQUFDLEdBQUc7Z0JBQ2QsT0FBTyxFQUFDLENBQUMsRUFBRSxVQUFVLEVBQUMsQ0FBQTtZQUMxQixLQUFLLFNBQVMsQ0FBQyxFQUFFO2dCQUNiLE9BQU8sRUFBQyxDQUFDLEVBQUUsVUFBVSxFQUFDLENBQUE7WUFDMUIsS0FBSyxTQUFTLENBQUMsR0FBRztnQkFDZCxPQUFPLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBQyxDQUFBO1lBQ3JCLEtBQUssU0FBUyxDQUFDLEtBQUs7Z0JBQ2hCLE9BQU8sRUFBQyxDQUFDLEVBQUUsVUFBVSxFQUFDLENBQUE7WUFDMUIsS0FBSyxTQUFTLENBQUMsUUFBUTtnQkFDbkIsT0FBTyxFQUFDLENBQUMsRUFBRSxVQUFVLEVBQUMsQ0FBQTtZQUMxQjtnQkFDSSxNQUFNO1NBQ2I7SUFHTCxDQUFDO0lBRUQsT0FBTyxDQUFDLFFBQW1CLEVBQUUsU0FBZ0IsRUFBRSxNQUFXLEVBQUUsTUFBWTtRQUVwRSxRQUFRLFFBQVEsRUFBRTtZQUNkLEtBQUssU0FBUyxDQUFDLElBQUk7Z0JBQ2YsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxNQUFNLENBQUM7WUFDaEQsS0FBSyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxNQUFNLElBQUksTUFBTSxDQUFDO1lBQzVDLEtBQUssU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sTUFBTSxJQUFJLE1BQU0sQ0FBQztZQUMzQyxLQUFLLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1lBQ25DLEtBQUssU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sTUFBTSxJQUFJLE1BQU0sQ0FBQztZQUM5QyxLQUFLLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLE1BQU0sSUFBSSxNQUFNLENBQUM7WUFDakQ7Z0JBQ0ksTUFBTTtTQUNiO0lBRUwsQ0FBQztDQUVKO0FBRUQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLGNBQWM7SUFDbEQ7UUFDSSxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDO1FBRTdCLElBQUksQ0FBQyxZQUFZLEdBQUc7WUFDaEIsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFBLENBQUMsQ0FBQyxFQUFFO1NBQ3BFLENBQUM7UUFDRixJQUFJLENBQUMscUJBQXFCLEdBQUc7WUFDekIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7WUFDMUQsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFO1lBQ3hDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRTtZQUMxQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUU7WUFDL0MsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFO1lBQ2pELENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRTtZQUN4QyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUU7U0FDOUMsQ0FBQTtJQUNMLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxRQUFtQixFQUFFLFNBQWlCO1FBRXhELE9BQU8sSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQsT0FBTyxDQUFDLFFBQW1CLEVBQUUsU0FBZ0IsRUFBRSxNQUFXLEVBQUUsTUFBWTtRQUVwRSxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFFckUsQ0FBQztDQUVKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9rZW5UeXBlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL2xleGVyL1Rva2VuLmpzXCI7XHJcbmltcG9ydCB7IE5FeHByZXNzaW9uLCBOVHlwZSB9IGZyb20gXCIuL05ld1R5cGUuanNcIjtcclxuXHJcblxyXG5leHBvcnQgdHlwZSBOQ2FzdFByaW1pdGl2ZUluZm9ybWF0aW9uID0ge1xyXG4gICAgZXhwcmVzc2lvbj86IHN0cmluZzsgLy8gZS5nLiBcIiQxIC0gJDElMFwiIGZvciBjYXN0aW5nIGZsb2F0IHRvIGludFxyXG4gICAgY2FzdEZ1bmN0aW9uPzogKHZhbHVlOiBhbnkpID0+IGFueTtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBOdWxsVHlwZSBleHRlbmRzIE5UeXBlIHtcclxuICAgIGdldENhc3RFeHByZXNzaW9uKG90aGVyVHlwZTogTlR5cGUpOiBORXhwcmVzc2lvbiB7XHJcbiAgICAgICAgcmV0dXJuIHtlOlwiJDFcIn07XHJcbiAgICB9XHJcbiAgICBjYXN0VG8ob3RoZXJUeXBlOiBOVHlwZSwgdmFsdWU6IGFueSkge1xyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuICAgIGdldE9wZXJhdG9yRXhwcmVzc2lvbihvcGVyYXRvcjogVG9rZW5UeXBlLCBvdGhlclR5cGU/OiBOVHlwZSk6IE5FeHByZXNzaW9uIHtcclxuICAgICAgICByZXR1cm4geyBlOiBcIiQxXCIgfTtcclxuICAgIH1cclxuICAgIGdldE9wZXJhdG9yUmVzdWx0VHlwZShvcGVyYXRvcjogVG9rZW5UeXBlLCBvdGhlclR5cGU6IE5UeXBlKTogTlR5cGUge1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgY29tcHV0ZShvcGVyYXRvcjogVG9rZW5UeXBlLCBvdGhlclR5cGU6IE5UeXBlLCB2YWx1ZTE6IGFueSwgdmFsdWUyPzogYW55KSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICBlcXVhbHMob3RoZXJUeXBlOiBOVHlwZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiBvdGhlclR5cGUgPT0gdGhpcztcclxuICAgIH1cclxuICAgIHB1YmxpYyBkZWJ1Z091dHB1dCh2YWx1ZTogYW55LCBtYXhMZW5ndGg/OiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBcIm51bGxcIjtcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBOUHJpbWl0aXZlVHlwZSBleHRlbmRzIE5UeXBlIHtcclxuXHJcbiAgICBwdWJsaWMgaW5pdGlhbFZhbHVlOiBhbnkgPSBudWxsO1xyXG5cclxuICAgIHByb3RlY3RlZCByZXN1bHRUeXBlU3RyaW5nVGFibGU6IHsgW29wZXJhdGlvbjogbnVtYmVyXTogeyBbdHlwZW5hbWU6IHN0cmluZ106IHN0cmluZyB9IH1cclxuICAgIHByb3RlY3RlZCByZXN1bHRUeXBlVGFibGU6IHsgW29wZXJhdGlvbjogbnVtYmVyXTogeyBbdHlwZW5hbWU6IHN0cmluZ106IE5UeXBlIH0gfVxyXG5cclxuICAgIHByb3RlY3RlZCBjYW5DYXN0VG9NYXA6IHsgW3R5cGU6IHN0cmluZ106IE5DYXN0UHJpbWl0aXZlSW5mb3JtYXRpb24gfTtcclxuXHJcbiAgICBwdWJsaWMgaXNQcmltaXRpdmUoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGVxdWFscyh0eXBlOiBOVHlwZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0eXBlID09IHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q2FzdEV4cHJlc3Npb24ob3RoZXJUeXBlOiBOVHlwZSk6IE5FeHByZXNzaW9uIHtcclxuICAgICAgICBsZXQgZXhwciA9IHRoaXMuY2FuQ2FzdFRvTWFwW290aGVyVHlwZS5pZGVudGlmaWVyXS5leHByZXNzaW9uO1xyXG4gICAgICAgIHJldHVybiB7ZTogZXhwciA9PSBudWxsID8gXCIkMVwiIDogZXhwcn07XHJcbiAgICB9XHJcblxyXG4gICAgY2FzdFRvKG90aGVyVHlwZTogTlR5cGUsIHZhbHVlOiBhbnkpOiBhbnkge1xyXG4gICAgICAgIGxldCBjYXN0SW5mbyA9IHRoaXMuY2FuQ2FzdFRvTWFwW290aGVyVHlwZS5pZGVudGlmaWVyXTtcclxuICAgICAgICByZXR1cm4gY2FzdEluZm8uZXhwcmVzc2lvbiA9PSBudWxsID8gdmFsdWUgOiBjYXN0SW5mby5jYXN0RnVuY3Rpb24odmFsdWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldE9wZXJhdG9yUmVzdWx0VHlwZShvcGVyYXRvcjogVG9rZW5UeXBlLCBvdGhlclR5cGU6IE5UeXBlKTogTlR5cGUge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnJlc3VsdFR5cGVUYWJsZVtvcGVyYXRvcl1bb3RoZXJUeXBlLmlkZW50aWZpZXJdO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwdWJsaWMgZGVidWdPdXRwdXQodmFsdWU6IGFueSwgbWF4TGVuZ3RoPzogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgICAgICBsZXQgc3RyID0gKHZhbHVlICsgXCJcIik7XHJcbiAgICAgICAgcmV0dXJuIHN0ci5sZW5ndGggPiBsZW5ndGggP1xyXG4gICAgICAgICAgICBzdHIuc3Vic3RyaW5nKDAsIGxlbmd0aCAtIDMpICsgXCIuLi5cIiA6XHJcbiAgICAgICAgICAgIHN0cjtcclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgZ2V0U3RhbmRhcmRPcGVyYXRvckV4cHJlc3Npb24ob3BlcmF0b3I6IFRva2VuVHlwZSwgb3RoZXJUeXBlPzogTlR5cGUpOiBORXhwcmVzc2lvbiB7XHJcbiAgICAgICAgbGV0IGV4cHJlc3Npb246IHN0cmluZztcclxuICAgICAgICBsZXQgY29uZGl0aW9uOiBzdHJpbmcgPSBudWxsO1xyXG4gICAgICAgIGxldCBlcnJvcm1lc3NhZ2U6IHN0cmluZyA9IG51bGw7XHJcbiAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5wbHVzOlxyXG4gICAgICAgICAgICAgICAgaWYgKG90aGVyVHlwZS5pZGVudGlmaWVyID09IFwiU3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gJ1wiXCIgKyAkMSArICQyJztcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXhwcmVzc2lvbiA9IFwiJDEgKyAkMlwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubWludXM6XHJcbiAgICAgICAgICAgICAgICBpZiAob3RoZXJUeXBlID09IG51bGwpIGV4cHJlc3Npb24gPSBcIi0kMVwiO1xyXG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbiA9IFwiJDEgLSAkMlwiO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubXVsdGlwbGljYXRpb246XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMSokMlwiO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZG91YmxlUGx1czpcclxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb24gPSBcIiQxKytcIjtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmRvdWJsZU1pbnVzOlxyXG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbiA9IFwiJDEtLVwiO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubmVnYXRpb246XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCItJDFcIjtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnRpbGRlOlxyXG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbiA9IFwifiQxXCI7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5sb3dlcjpcclxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb24gPSBcIiQxIDwgJDJcIjtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmdyZWF0ZXI6XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMSA+ICQyXCI7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5sb3dlck9yRXF1YWw6XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMSA8PSAkMlwiO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZ3JlYXRlck9yRXF1YWw6XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMSA8PSAkMlwiO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZXF1YWw6XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMSA9PSAkMlwiO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubm90RXF1YWw6XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMSAhPSAkMlwiO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuT1I6XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMSB8ICQyXCI7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5YT1I6XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMSBeICQyXCI7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5hbXBlcnNhbmQ6XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMSAmICQyXCI7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zaGlmdExlZnQ6XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMSA8PCAkMlwiO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2hpZnRSaWdodDpcclxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb24gPSBcIiQxID4+ICQyXCI7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zaGlmdFJpZ2h0VW5zaWduZWQ6XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMSA+Pj4gJDJcIjtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4geyBlOiBleHByZXNzaW9uLCBjb25kaXRpb246IGNvbmRpdGlvbiwgZXJyb3JtZXNzYWdlOiBlcnJvcm1lc3NhZ2UgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgc3RhbmRhcmRDb21wdXRlKG9wZXJhdG9yOiBUb2tlblR5cGUsIG90aGVyVHlwZTogTlR5cGUsIHZhbHVlMTogYW55LCB2YWx1ZTI/OiBhbnkpOiBhbnkge1xyXG5cclxuICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnBsdXM6XHJcbiAgICAgICAgICAgICAgICBpZiAob3RoZXJUeXBlLmlkZW50aWZpZXIgPT0gXCJTdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTEgKyA8c3RyaW5nPih2YWx1ZTIpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUxICsgPG51bWJlcj4odmFsdWUyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm1pbnVzOlxyXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlMiA9PSBudWxsKSByZXR1cm4gLXZhbHVlMTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTEgLSA8bnVtYmVyPih2YWx1ZTIpO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubXVsdGlwbGljYXRpb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUxICogPG51bWJlcj4odmFsdWUyKTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmRvdWJsZVBsdXM6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUxKys7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5kb3VibGVNaW51czpcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTEtLTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5lZ2F0aW9uOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIC12YWx1ZTE7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS50aWxkZTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB+dmFsdWUxO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubG93ZXI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUxIDwgKDxudW1iZXI+KHZhbHVlMikpO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZ3JlYXRlcjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTEgPiA8bnVtYmVyPih2YWx1ZTIpO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubG93ZXJPckVxdWFsOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlMSA8PSA8bnVtYmVyPih2YWx1ZTIpO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZ3JlYXRlck9yRXF1YWw6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUxID49IDxudW1iZXI+KHZhbHVlMik7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5lcXVhbDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTEgPT0gPG51bWJlcj4odmFsdWUyKTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5vdEVxdWFsOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlMSAhPSA8bnVtYmVyPih2YWx1ZTIpO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuT1I6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUxIHwgPG51bWJlcj4odmFsdWUyKTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLlhPUjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTEgXiA8bnVtYmVyPih2YWx1ZTIpO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuYW1wZXJzYW5kOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlMSAmIDxudW1iZXI+KHZhbHVlMik7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zaGlmdExlZnQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUxIDw8IDxudW1iZXI+KHZhbHVlMik7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5zaGlmdFJpZ2h0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlMSA+PiA8bnVtYmVyPih2YWx1ZTIpO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuc2hpZnRSaWdodFVuc2lnbmVkOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlMSA+Pj4gPG51bWJlcj4odmFsdWUyKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTkludFByaW1pdGl2ZVR5cGUgZXh0ZW5kcyBOUHJpbWl0aXZlVHlwZSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuaWRlbnRpZmllciA9IFwiaW50XCI7XHJcbiAgICAgICAgdGhpcy5jYW5DYXN0VG9NYXAgPSB7XHJcbiAgICAgICAgICAgIFwiZG91YmxlXCI6IHsgZXhwcmVzc2lvbjogbnVsbCB9LCBcImZsb2F0XCI6IHsgZXhwcmVzc2lvbjogbnVsbCB9LFxyXG4gICAgICAgICAgICBcImNoYXJcIjogeyBleHByZXNzaW9uOiBcIlN0cmluZy5mcm9tQ2hhckNvZGUoJDEpXCIsIGNhc3RGdW5jdGlvbjogKHYpID0+IHsgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUodikgfSB9LFxyXG4gICAgICAgICAgICBcIlN0cmluZ1wiOiB7IGV4cHJlc3Npb246ICcoXCJcIiArICQxKScsIGNhc3RGdW5jdGlvbjogKHYpID0+IHsgcmV0dXJuIFwiXCIgKyB2IH0gfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5yZXN1bHRUeXBlU3RyaW5nVGFibGUgPSB7XHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUucGx1c106IHsgXCJpbnRcIjogXCJpbnRcIiwgXCJJbnRlZ2VyXCI6IFwiaW50XCIsIFwiZmxvYXRcIjogXCJmbG9hdFwiLCBcIkZsb2F0XCI6IFwiZmxvYXRcIiwgXCJkb3VibGVcIjogXCJkb3VibGVcIiwgXCJEb3VibGVcIjogXCJkb3VibGVcIiwgXCJTdHJpbmdcIjogXCJTdHJpbmdcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLm1pbnVzXTogeyBcIm5vbmVcIjogXCJpbnRcIiwgXCJpbnRcIjogXCJpbnRcIiwgXCJJbnRlZ2VyXCI6IFwiaW50XCIsIFwiZmxvYXRcIjogXCJmbG9hdFwiLCBcIkZsb2F0XCI6IFwiZmxvYXRcIiwgXCJkb3VibGVcIjogXCJkb3VibGVcIiwgXCJEb3VibGVcIjogXCJkb3VibGVcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLm11bHRpcGxpY2F0aW9uXTogeyBcImludFwiOiBcImludFwiLCBcIkludGVnZXJcIjogXCJpbnRcIiwgXCJmbG9hdFwiOiBcImZsb2F0XCIsIFwiRmxvYXRcIjogXCJmbG9hdFwiLCBcImRvdWJsZVwiOiBcImRvdWJsZVwiLCBcIkRvdWJsZVwiOiBcImRvdWJsZVwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUubW9kdWxvXTogeyBcImludFwiOiBcImludFwiLCBcIkludGVnZXJcIjogXCJpbnRcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLmRpdmlzaW9uXTogeyBcImludFwiOiBcImludFwiLCBcIkludGVnZXJcIjogXCJpbnRcIiwgXCJmbG9hdFwiOiBcImZsb2F0XCIsIFwiRmxvYXRcIjogXCJmbG9hdFwiLCBcImRvdWJsZVwiOiBcImRvdWJsZVwiLCBcIkRvdWJsZVwiOiBcImRvdWJsZVwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUuZG91YmxlUGx1c106IHsgXCJub25lXCI6IFwiaW50XCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5kb3VibGVNaW51c106IHsgXCJub25lXCI6IFwiaW50XCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5uZWdhdGlvbl06IHsgXCJub25lXCI6IFwiaW50XCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS50aWxkZV06IHsgXCJub25lXCI6IFwiaW50XCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5sb3dlcl06IHsgXCJpbnRcIjogXCJib29sZWFuXCIsIFwiZmxvYXRcIjogXCJib29sZWFuXCIsIFwiZG91YmxlXCI6IFwiYm9vbGVhblwiLCBcIkludGVnZXJcIjogXCJib29sZWFuXCIsIFwiRmxvYXRcIjogXCJib29sZWFuXCIsIFwiRG91YmxlXCI6IFwiYm9vbGVhblwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUuZ3JlYXRlcl06IHsgXCJpbnRcIjogXCJib29sZWFuXCIsIFwiZmxvYXRcIjogXCJib29sZWFuXCIsIFwiZG91YmxlXCI6IFwiYm9vbGVhblwiLCBcIkludGVnZXJcIjogXCJib29sZWFuXCIsIFwiRmxvYXRcIjogXCJib29sZWFuXCIsIFwiRG91YmxlXCI6IFwiYm9vbGVhblwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUubG93ZXJPckVxdWFsXTogeyBcImludFwiOiBcImJvb2xlYW5cIiwgXCJmbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJkb3VibGVcIjogXCJib29sZWFuXCIsIFwiSW50ZWdlclwiOiBcImJvb2xlYW5cIiwgXCJGbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJEb3VibGVcIjogXCJib29sZWFuXCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5ncmVhdGVyT3JFcXVhbF06IHsgXCJpbnRcIjogXCJib29sZWFuXCIsIFwiZmxvYXRcIjogXCJib29sZWFuXCIsIFwiZG91YmxlXCI6IFwiYm9vbGVhblwiLCBcIkludGVnZXJcIjogXCJib29sZWFuXCIsIFwiRmxvYXRcIjogXCJib29sZWFuXCIsIFwiRG91YmxlXCI6IFwiYm9vbGVhblwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUuZXF1YWxdOiB7IFwiaW50XCI6IFwiYm9vbGVhblwiLCBcImZsb2F0XCI6IFwiYm9vbGVhblwiLCBcImRvdWJsZVwiOiBcImJvb2xlYW5cIiwgXCJJbnRlZ2VyXCI6IFwiYm9vbGVhblwiLCBcIkZsb2F0XCI6IFwiYm9vbGVhblwiLCBcIkRvdWJsZVwiOiBcImJvb2xlYW5cIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLm5vdEVxdWFsXTogeyBcImludFwiOiBcImJvb2xlYW5cIiwgXCJmbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJkb3VibGVcIjogXCJib29sZWFuXCIsIFwiSW50ZWdlclwiOiBcImJvb2xlYW5cIiwgXCJGbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJEb3VibGVcIjogXCJib29sZWFuXCIgfSxcclxuXHJcbiAgICAgICAgICAgIC8vIGJpbmFyeSBvcHNcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5PUl06IHsgXCJpbnRcIjogXCJpbnRcIiwgXCJJbnRlZ2VyXCI6IFwiaW50XCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5YT1JdOiB7IFwiaW50XCI6IFwiaW50XCIsIFwiSW50ZWdlclwiOiBcImludFwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUuYW1wZXJzYW5kXTogeyBcImludFwiOiBcImludFwiLCBcIkludGVnZXJcIjogXCJpbnRcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLnNoaWZ0TGVmdF06IHsgXCJpbnRcIjogXCJpbnRcIiwgXCJJbnRlZ2VyXCI6IFwiaW50XCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5zaGlmdFJpZ2h0XTogeyBcImludFwiOiBcImludFwiLCBcIkludGVnZXJcIjogXCJpbnRcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLnNoaWZ0UmlnaHRVbnNpZ25lZF06IHsgXCJpbnRcIjogXCJpbnRcIiwgXCJJbnRlZ2VyXCI6IFwiaW50XCIgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0T3BlcmF0b3JFeHByZXNzaW9uKG9wZXJhdG9yOiBUb2tlblR5cGUsIG90aGVyVHlwZT86IE5UeXBlKTogTkV4cHJlc3Npb24ge1xyXG4gICAgICAgIGxldCBleHByZXNzaW9uOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZGl2aXNpb246XHJcbiAgICAgICAgICAgICAgICBpZiAob3RoZXJUeXBlLmlkZW50aWZpZXIgPT0gXCJpbnRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGV4cHJlc3Npb24gPSBcIk1hdGgudHJ1bmMoJDEvJDIpXCJcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXhwcmVzc2lvbiA9IFwiJDEvJDJcIlxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZTogZXhwcmVzc2lvbiwgY29uZGl0aW9uOiBcIiQyICE9IDBcIiwgZXJyb3JtZXNzYWdlOiBcIkRpdmlzaW9uIGR1cmNoIDAgaXN0IG5pY2h0IGVybGF1YnQuXCIgfTtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubW9kdWxvOlxyXG4gICAgICAgICAgICAgICAgaWYgKG90aGVyVHlwZS5pZGVudGlmaWVyID09IFwiaW50XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCJNYXRoLnRydW5jKCQxICUgJDIpXCJcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXhwcmVzc2lvbiA9IFwiMVwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZTogZXhwcmVzc2lvbiwgY29uZGl0aW9uOiBcIiQyICE9IDBcIiwgZXJyb3JtZXNzYWdlOiBcIk1vZHVsbyAwIGlzdCBuaWNodCBlcmxhdWJ0LlwiIH07XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRTdGFuZGFyZE9wZXJhdG9yRXhwcmVzc2lvbihvcGVyYXRvciwgb3RoZXJUeXBlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29tcHV0ZShvcGVyYXRvcjogVG9rZW5UeXBlLCBvdGhlclR5cGU6IE5UeXBlLCB2YWx1ZTE6IGFueSwgdmFsdWUyPzogYW55KTogYW55IHtcclxuXHJcbiAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5kaXZpc2lvbjpcclxuICAgICAgICAgICAgICAgIGlmIChvdGhlclR5cGUuaWRlbnRpZmllciA9PSBcImludFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgudHJ1bmModmFsdWUxIC8gPG51bWJlcj4odmFsdWUyKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUxIC8gPG51bWJlcj4odmFsdWUyKTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm1vZHVsbzpcclxuICAgICAgICAgICAgICAgIGlmIChvdGhlclR5cGUuaWRlbnRpZmllciA9PSBcImludFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgudHJ1bmModmFsdWUxICUgPG51bWJlcj4odmFsdWUyKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcclxuXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB0aGlzLnN0YW5kYXJkQ29tcHV0ZShvcGVyYXRvciwgb3RoZXJUeXBlLCB2YWx1ZTEsIHZhbHVlMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBORmxvYXRQcmltaXRpdmVUeXBlIGV4dGVuZHMgTlByaW1pdGl2ZVR5cGUge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLmlkZW50aWZpZXIgPSBcImZsb2F0XCI7XHJcbiAgICAgICAgdGhpcy5jYW5DYXN0VG9NYXAgPSB7XHJcbiAgICAgICAgICAgIFwiZG91YmxlXCI6IHsgZXhwcmVzc2lvbjogbnVsbCB9LCBcImZsb2F0XCI6IHsgZXhwcmVzc2lvbjogbnVsbCB9LFxyXG4gICAgICAgICAgICBcIlN0cmluZ1wiOiB7IGV4cHJlc3Npb246ICcoXCJcIiArICQxKScsIGNhc3RGdW5jdGlvbjogKHYpID0+IHsgcmV0dXJuIFwiXCIgKyB2IH0gfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5yZXN1bHRUeXBlU3RyaW5nVGFibGUgPSB7XHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUucGx1c106IHsgXCJpbnRcIjogXCJmbG9hdFwiLCBcIkludGVnZXJcIjogXCJmbG9hdFwiLCBcImZsb2F0XCI6IFwiZmxvYXRcIiwgXCJGbG9hdFwiOiBcImZsb2F0XCIsIFwiZG91YmxlXCI6IFwiZG91YmxlXCIsIFwiRG91YmxlXCI6IFwiZG91YmxlXCIsIFwiU3RyaW5nXCI6IFwiU3RyaW5nXCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5taW51c106IHsgXCJub25lXCI6IFwiaW50XCIsIFwiaW50XCI6IFwiZmxvYXRcIiwgXCJJbnRlZ2VyXCI6IFwiZmxvYXRcIiwgXCJmbG9hdFwiOiBcImZsb2F0XCIsIFwiRmxvYXRcIjogXCJmbG9hdFwiLCBcImRvdWJsZVwiOiBcImRvdWJsZVwiLCBcIkRvdWJsZVwiOiBcImRvdWJsZVwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUubXVsdGlwbGljYXRpb25dOiB7IFwiaW50XCI6IFwiZmxvYXRcIiwgXCJJbnRlZ2VyXCI6IFwiZmxvYXRcIiwgXCJmbG9hdFwiOiBcImZsb2F0XCIsIFwiRmxvYXRcIjogXCJmbG9hdFwiLCBcImRvdWJsZVwiOiBcImRvdWJsZVwiLCBcIkRvdWJsZVwiOiBcImRvdWJsZVwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUuZGl2aXNpb25dOiB7IFwiaW50XCI6IFwiZmxvYXRcIiwgXCJJbnRlZ2VyXCI6IFwiZmxvYXRcIiwgXCJmbG9hdFwiOiBcImZsb2F0XCIsIFwiRmxvYXRcIjogXCJmbG9hdFwiLCBcImRvdWJsZVwiOiBcImRvdWJsZVwiLCBcIkRvdWJsZVwiOiBcImRvdWJsZVwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUuZG91YmxlUGx1c106IHsgXCJub25lXCI6IFwiZmxvYXRcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLmRvdWJsZU1pbnVzXTogeyBcIm5vbmVcIjogXCJmbG9hdFwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUubmVnYXRpb25dOiB7IFwibm9uZVwiOiBcImZsb2F0XCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5sb3dlcl06IHsgXCJpbnRcIjogXCJib29sZWFuXCIsIFwiZmxvYXRcIjogXCJib29sZWFuXCIsIFwiZG91YmxlXCI6IFwiYm9vbGVhblwiLCBcIkludGVnZXJcIjogXCJib29sZWFuXCIsIFwiRmxvYXRcIjogXCJib29sZWFuXCIsIFwiRG91YmxlXCI6IFwiYm9vbGVhblwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUuZ3JlYXRlcl06IHsgXCJpbnRcIjogXCJib29sZWFuXCIsIFwiZmxvYXRcIjogXCJib29sZWFuXCIsIFwiZG91YmxlXCI6IFwiYm9vbGVhblwiLCBcIkludGVnZXJcIjogXCJib29sZWFuXCIsIFwiRmxvYXRcIjogXCJib29sZWFuXCIsIFwiRG91YmxlXCI6IFwiYm9vbGVhblwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUubG93ZXJPckVxdWFsXTogeyBcImludFwiOiBcImJvb2xlYW5cIiwgXCJmbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJkb3VibGVcIjogXCJib29sZWFuXCIsIFwiSW50ZWdlclwiOiBcImJvb2xlYW5cIiwgXCJGbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJEb3VibGVcIjogXCJib29sZWFuXCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5ncmVhdGVyT3JFcXVhbF06IHsgXCJpbnRcIjogXCJib29sZWFuXCIsIFwiZmxvYXRcIjogXCJib29sZWFuXCIsIFwiZG91YmxlXCI6IFwiYm9vbGVhblwiLCBcIkludGVnZXJcIjogXCJib29sZWFuXCIsIFwiRmxvYXRcIjogXCJib29sZWFuXCIsIFwiRG91YmxlXCI6IFwiYm9vbGVhblwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUuZXF1YWxdOiB7IFwiaW50XCI6IFwiYm9vbGVhblwiLCBcImZsb2F0XCI6IFwiYm9vbGVhblwiLCBcImRvdWJsZVwiOiBcImJvb2xlYW5cIiwgXCJJbnRlZ2VyXCI6IFwiYm9vbGVhblwiLCBcIkZsb2F0XCI6IFwiYm9vbGVhblwiLCBcIkRvdWJsZVwiOiBcImJvb2xlYW5cIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLm5vdEVxdWFsXTogeyBcImludFwiOiBcImJvb2xlYW5cIiwgXCJmbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJkb3VibGVcIjogXCJib29sZWFuXCIsIFwiSW50ZWdlclwiOiBcImJvb2xlYW5cIiwgXCJGbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJEb3VibGVcIjogXCJib29sZWFuXCIgfSxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0T3BlcmF0b3JFeHByZXNzaW9uKG9wZXJhdG9yOiBUb2tlblR5cGUsIG90aGVyVHlwZT86IE5UeXBlKTogTkV4cHJlc3Npb24ge1xyXG4gICAgICAgIGxldCBleHByZXNzaW9uOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZGl2aXNpb246XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIkMS8kMlwiXHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBlOiBleHByZXNzaW9uLCBjb25kaXRpb246IFwiJDIgIT0gMFwiLCBlcnJvcm1lc3NhZ2U6IFwiRGl2aXNpb24gZHVyY2ggMCBpc3QgbmljaHQgZXJsYXVidC5cIiB9O1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0U3RhbmRhcmRPcGVyYXRvckV4cHJlc3Npb24ob3BlcmF0b3IsIG90aGVyVHlwZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbXB1dGUob3BlcmF0b3I6IFRva2VuVHlwZSwgb3RoZXJUeXBlOiBOVHlwZSwgdmFsdWUxOiBhbnksIHZhbHVlMj86IGFueSk6IGFueSB7XHJcblxyXG4gICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuZGl2aXNpb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUxIC8gPG51bWJlcj4odmFsdWUyKTtcclxuXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB0aGlzLnN0YW5kYXJkQ29tcHV0ZShvcGVyYXRvciwgb3RoZXJUeXBlLCB2YWx1ZTEsIHZhbHVlMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBORG91YmxlUHJpbWl0aXZlVHlwZSBleHRlbmRzIE5QcmltaXRpdmVUeXBlIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5pZGVudGlmaWVyID0gXCJmbG9hdFwiO1xyXG4gICAgICAgIHRoaXMuY2FuQ2FzdFRvTWFwID0ge1xyXG4gICAgICAgICAgICBcImRvdWJsZVwiOiB7IGV4cHJlc3Npb246IG51bGwgfSwgXCJmbG9hdFwiOiB7IGV4cHJlc3Npb246IG51bGwgfSxcclxuICAgICAgICAgICAgXCJTdHJpbmdcIjogeyBleHByZXNzaW9uOiAnKFwiXCIgKyAkMSknLCBjYXN0RnVuY3Rpb246ICh2KSA9PiB7IHJldHVybiBcIlwiICsgdiB9IH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMucmVzdWx0VHlwZVN0cmluZ1RhYmxlID0ge1xyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLnBsdXNdOiB7IFwiaW50XCI6IFwiZG91YmxlXCIsIFwiSW50ZWdlclwiOiBcImRvdWJsZVwiLCBcImZsb2F0XCI6IFwiZG91YmxlXCIsIFwiRmxvYXRcIjogXCJkb3VibGVcIiwgXCJkb3VibGVcIjogXCJkb3VibGVcIiwgXCJEb3VibGVcIjogXCJkb3VibGVcIiwgXCJTdHJpbmdcIjogXCJTdHJpbmdcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLm1pbnVzXTogeyBcIm5vbmVcIjogXCJpbnRcIiwgXCJpbnRcIjogXCJkb3VibGVcIiwgXCJJbnRlZ2VyXCI6IFwiZG91YmxlXCIsIFwiZmxvYXRcIjogXCJkb3VibGVcIiwgXCJGbG9hdFwiOiBcImRvdWJsZVwiLCBcImRvdWJsZVwiOiBcImRvdWJsZVwiLCBcIkRvdWJsZVwiOiBcImRvdWJsZVwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUubXVsdGlwbGljYXRpb25dOiB7IFwiaW50XCI6IFwiZG91YmxlXCIsIFwiSW50ZWdlclwiOiBcImRvdWJsZVwiLCBcImZsb2F0XCI6IFwiZG91YmxlXCIsIFwiRmxvYXRcIjogXCJkb3VibGVcIiwgXCJkb3VibGVcIjogXCJkb3VibGVcIiwgXCJEb3VibGVcIjogXCJkb3VibGVcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLmRpdmlzaW9uXTogeyBcImludFwiOiBcImRvdWJsZVwiLCBcIkludGVnZXJcIjogXCJkb3VibGVcIiwgXCJmbG9hdFwiOiBcImRvdWJsZVwiLCBcIkZsb2F0XCI6IFwiZG91YmxlXCIsIFwiZG91YmxlXCI6IFwiZG91YmxlXCIsIFwiRG91YmxlXCI6IFwiZG91YmxlXCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5kb3VibGVQbHVzXTogeyBcIm5vbmVcIjogXCJkb3VibGVcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLmRvdWJsZU1pbnVzXTogeyBcIm5vbmVcIjogXCJkb3VibGVcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLm5lZ2F0aW9uXTogeyBcIm5vbmVcIjogXCJkb3VibGVcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLmxvd2VyXTogeyBcImludFwiOiBcImJvb2xlYW5cIiwgXCJmbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJkb3VibGVcIjogXCJib29sZWFuXCIsIFwiSW50ZWdlclwiOiBcImJvb2xlYW5cIiwgXCJGbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJEb3VibGVcIjogXCJib29sZWFuXCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5ncmVhdGVyXTogeyBcImludFwiOiBcImJvb2xlYW5cIiwgXCJmbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJkb3VibGVcIjogXCJib29sZWFuXCIsIFwiSW50ZWdlclwiOiBcImJvb2xlYW5cIiwgXCJGbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJEb3VibGVcIjogXCJib29sZWFuXCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5sb3dlck9yRXF1YWxdOiB7IFwiaW50XCI6IFwiYm9vbGVhblwiLCBcImZsb2F0XCI6IFwiYm9vbGVhblwiLCBcImRvdWJsZVwiOiBcImJvb2xlYW5cIiwgXCJJbnRlZ2VyXCI6IFwiYm9vbGVhblwiLCBcIkZsb2F0XCI6IFwiYm9vbGVhblwiLCBcIkRvdWJsZVwiOiBcImJvb2xlYW5cIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLmdyZWF0ZXJPckVxdWFsXTogeyBcImludFwiOiBcImJvb2xlYW5cIiwgXCJmbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJkb3VibGVcIjogXCJib29sZWFuXCIsIFwiSW50ZWdlclwiOiBcImJvb2xlYW5cIiwgXCJGbG9hdFwiOiBcImJvb2xlYW5cIiwgXCJEb3VibGVcIjogXCJib29sZWFuXCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5lcXVhbF06IHsgXCJpbnRcIjogXCJib29sZWFuXCIsIFwiZmxvYXRcIjogXCJib29sZWFuXCIsIFwiZG91YmxlXCI6IFwiYm9vbGVhblwiLCBcIkludGVnZXJcIjogXCJib29sZWFuXCIsIFwiRmxvYXRcIjogXCJib29sZWFuXCIsIFwiRG91YmxlXCI6IFwiYm9vbGVhblwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUubm90RXF1YWxdOiB7IFwiaW50XCI6IFwiYm9vbGVhblwiLCBcImZsb2F0XCI6IFwiYm9vbGVhblwiLCBcImRvdWJsZVwiOiBcImJvb2xlYW5cIiwgXCJJbnRlZ2VyXCI6IFwiYm9vbGVhblwiLCBcIkZsb2F0XCI6IFwiYm9vbGVhblwiLCBcIkRvdWJsZVwiOiBcImJvb2xlYW5cIiB9LFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnZXRPcGVyYXRvckV4cHJlc3Npb24ob3BlcmF0b3I6IFRva2VuVHlwZSwgb3RoZXJUeXBlPzogTlR5cGUpOiBORXhwcmVzc2lvbiB7XHJcbiAgICAgICAgbGV0IGV4cHJlc3Npb246IHN0cmluZztcclxuXHJcbiAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5kaXZpc2lvbjpcclxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb24gPSBcIiQxLyQyXCJcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IGU6IGV4cHJlc3Npb24sIGNvbmRpdGlvbjogXCIkMiAhPSAwXCIsIGVycm9ybWVzc2FnZTogXCJEaXZpc2lvbiBkdXJjaCAwIGlzdCBuaWNodCBlcmxhdWJ0LlwiIH07XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRTdGFuZGFyZE9wZXJhdG9yRXhwcmVzc2lvbihvcGVyYXRvciwgb3RoZXJUeXBlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29tcHV0ZShvcGVyYXRvcjogVG9rZW5UeXBlLCBvdGhlclR5cGU6IE5UeXBlLCB2YWx1ZTE6IGFueSwgdmFsdWUyPzogYW55KTogYW55IHtcclxuXHJcbiAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5kaXZpc2lvbjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTEgLyA8bnVtYmVyPih2YWx1ZTIpO1xyXG5cclxuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuIHRoaXMuc3RhbmRhcmRDb21wdXRlKG9wZXJhdG9yLCBvdGhlclR5cGUsIHZhbHVlMSwgdmFsdWUyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE5Cb29sZWFuUHJpbWl0aXZlVHlwZSBleHRlbmRzIE5QcmltaXRpdmVUeXBlIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5pZGVudGlmaWVyID0gXCJib29sZWFuXCI7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsVmFsdWUgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy5jYW5DYXN0VG9NYXAgPSB7XHJcbiAgICAgICAgICAgIFwiU3RyaW5nXCI6IHsgZXhwcmVzc2lvbjogJyQxID8gXCJ0cnVlXCIgOiBcImZhbHNlXCInLCBjYXN0RnVuY3Rpb246ICh2KSA9PiB7IHJldHVybiB2ID8gXCJ0cnVlXCIgOiBcImZhbHNlXCIgfSB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5yZXN1bHRUeXBlU3RyaW5nVGFibGUgPSB7XHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUucGx1c106IHsgXCJTdHJpbmdcIjogXCJTdHJpbmdcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLmFuZF06IHsgXCJib29sZWFuXCI6IFwiYm9vbGVhblwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUub3JdOiB7IFwiYm9vbGVhblwiOiBcImJvb2xlYW5cIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLm5vdF06IHsgXCJub25lXCI6IFwiYm9vbGVhblwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUuZXF1YWxdOiB7IFwiYm9vbGVhblwiOiBcImJvb2xlYW5cIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLm5vdEVxdWFsXTogeyBcImJvb2xlYW5cIjogXCJib29sZWFuXCIgfSxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0T3BlcmF0b3JFeHByZXNzaW9uKG9wZXJhdG9yOiBUb2tlblR5cGUsIG90aGVyVHlwZT86IE5UeXBlKTogTkV4cHJlc3Npb24ge1xyXG5cclxuICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLnBsdXM6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBlOiAnKCgkMSA/IFwidHJ1ZVwiIDogXCJmYWxzZVwiKSArICQyKSd9XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmFuZDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ZTogJyQxICYmICQyJ31cclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUub3I6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge2U6ICckMSB8fCAkMid9XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5vdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ZTogJyEkMSd9XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmVxdWFsOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtlOiAnJDEgPT0gJDInfVxyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5ub3RFcXVhbDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ZTogJyQxICE9ICQyJ31cclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbXB1dGUob3BlcmF0b3I6IFRva2VuVHlwZSwgb3RoZXJUeXBlOiBOVHlwZSwgdmFsdWUxOiBhbnksIHZhbHVlMj86IGFueSk6IGFueSB7XHJcblxyXG4gICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUucGx1czpcclxuICAgICAgICAgICAgICAgIHJldHVybiAodmFsdWUxID8gXCJ0cnVlXCIgOiBcImZhbHNlXCIpICsgdmFsdWUyO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5hbmQ6IHJldHVybiB2YWx1ZTEgJiYgdmFsdWUyO1xyXG4gICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5vcjogcmV0dXJuIHZhbHVlMSB8fCB2YWx1ZTI7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLm5vdDogcmV0dXJuICF2YWx1ZTE7XHJcbiAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLmVxdWFsOiByZXR1cm4gdmFsdWUxID09IHZhbHVlMjtcclxuICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUubm90RXF1YWw6IHJldHVybiB2YWx1ZTEgIT0gdmFsdWUyO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBOQ2hhclByaW1pdGl2ZVR5cGUgZXh0ZW5kcyBOUHJpbWl0aXZlVHlwZSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuaWRlbnRpZmllciA9IFwiY2hhclwiO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbFZhbHVlID0gXCJcXHUwMDAwXCI7XHJcblxyXG4gICAgICAgIHRoaXMuY2FuQ2FzdFRvTWFwID0ge1xyXG4gICAgICAgICAgICBcIlN0cmluZ1wiOiB7IGV4cHJlc3Npb246ICckMScsIGNhc3RGdW5jdGlvbjogKHYpID0+IHsgcmV0dXJuIHYgfSB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLnJlc3VsdFR5cGVTdHJpbmdUYWJsZSA9IHtcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5wbHVzXTogeyBcImNoYXJcIjogXCJTdHJpbmdcIiwgXCJTdHJpbmdcIjogXCJTdHJpbmdcIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLmxvd2VyXTogeyBcImNoYXJcIjogXCJib29sZWFuXCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5ncmVhdGVyXTogeyBcImNoYXJcIjogXCJib29sZWFuXCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5sb3dlck9yRXF1YWxdOiB7IFwiY2hhclwiOiBcImJvb2xlYW5cIiB9LFxyXG4gICAgICAgICAgICBbVG9rZW5UeXBlLmdyZWF0ZXJPckVxdWFsXTogeyBcImNoYXJcIjogXCJib29sZWFuXCIgfSxcclxuICAgICAgICAgICAgW1Rva2VuVHlwZS5lcXVhbF06IHsgXCJjaGFyXCI6IFwiYm9vbGVhblwiIH0sXHJcbiAgICAgICAgICAgIFtUb2tlblR5cGUubm90RXF1YWxdOiB7IFwiY2hhclwiOiBcImJvb2xlYW5cIiB9LFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnZXRPcGVyYXRvckV4cHJlc3Npb24ob3BlcmF0b3I6IFRva2VuVHlwZSwgb3RoZXJUeXBlPzogTlR5cGUpOiBORXhwcmVzc2lvbiB7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLmdldFN0YW5kYXJkT3BlcmF0b3JFeHByZXNzaW9uKG9wZXJhdG9yLCBvdGhlclR5cGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbXB1dGUob3BlcmF0b3I6IFRva2VuVHlwZSwgb3RoZXJUeXBlOiBOVHlwZSwgdmFsdWUxOiBhbnksIHZhbHVlMj86IGFueSk6IGFueSB7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLnN0YW5kYXJkQ29tcHV0ZShvcGVyYXRvciwgb3RoZXJUeXBlLCB2YWx1ZTEsIHZhbHVlMik7XHJcblxyXG4gICAgfVxyXG5cclxufSJdfQ==