import { Klass } from "../../compiler/types/Class.js";
import { booleanPrimitiveType, doublePrimitiveType, floatPrimitiveType, intPrimitiveType, stringPrimitiveType, voidPrimitiveType } from "../../compiler/types/PrimitiveTypes.js";
import { Method, Parameterlist } from "../../compiler/types/Types.js";
import { RuntimeObject } from "../../interpreter/RuntimeObject.js";
import { ResultsetHelper } from "./ResultSet.js";
export class DatabasePreparedStatementClass extends Klass {
    constructor(module) {
        super("PreparedStatement", module, "Ein PreparedStatement-Objekt repräsentiert eine parametrisierte Anweisung an die Datenbank.");
        let resultSetType = module.typeStore.getType("ResultSet");
        this.setBaseClass(module.typeStore.getType("Object"));
        this.addMethod(new Method("executeQuery", new Parameterlist([]), resultSetType, (parameters) => {
            let o = parameters[0].value;
            let psh = o.intrinsicData["Helper"];
            let interpreter = module.main.getInterpreter();
            if (!psh.query.toLocaleLowerCase().startsWith("select")) {
                module.main.getInterpreter().resumeAfterInput(null);
                interpreter.throwException("Mit der Methode executeQuery können nur select-Anweisungen ausgeführt werden. Benutze für datenverändernde Anweisungen die Methode executeUpdate.");
                return null;
            }
            interpreter.pauseForInput();
            module.main.getBottomDiv().showHideDbBusyIcon(true);
            let error = psh.checkQuery();
            if (error != null) {
                interpreter.throwException(error);
                return null;
            }
            psh.connectionHelper.executeQuery(psh.getQueryWithParameterValuesFilledIn(), (error, result) => {
                module.main.getBottomDiv().showHideDbBusyIcon(false);
                if (error != null) {
                    module.main.getInterpreter().resumeAfterInput(null);
                    interpreter.throwException(error);
                    return;
                }
                let rsh = new ResultsetHelper(result);
                let rs = new RuntimeObject(resultSetType);
                rs.intrinsicData["Helper"] = rsh;
                interpreter.resumeAfterInput({ value: rs, type: resultSetType }, true);
            });
        }, false, false, 'Führt ein SQL-Statement aus, das eine select-Anweisung enthält.', false));
        this.addMethod(new Method("executeUpdate", new Parameterlist([]), intPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let psh = o.intrinsicData["Helper"];
            let interpreter = module.main.getInterpreter();
            if (psh.query.toLocaleLowerCase().startsWith("select")) {
                module.main.getInterpreter().resumeAfterInput(null);
                interpreter.throwException("Mit der Methode execute können nur datenverändernde Anweisungen ausgeführt werden." +
                    "Benutze für select-Anweisungen die Methode executeQuery.");
                return null;
            }
            interpreter.pauseForInput();
            module.main.getBottomDiv().showHideDbBusyIcon(true);
            let error = psh.checkQuery();
            if (error != null) {
                interpreter.resumeAfterInput(null);
                interpreter.throwException(error);
                return null;
            }
            psh.connectionHelper.executeWriteStatement(psh.getQueryWithParameterValuesFilledIn(), (error) => {
                module.main.getBottomDiv().showHideDbBusyIcon(false);
                if (error != null) {
                    module.main.getInterpreter().resumeAfterInput(null);
                    interpreter.resumeAfterInput(null);
                    interpreter.throwException(error);
                    return;
                }
                interpreter.resumeAfterInput({ value: 0, type: intPrimitiveType }, true);
            });
        }, false, false, 'Führt ein SQL-Statement aus, das eine datenverändernde Anweisung enthält.', false));
        let types = [booleanPrimitiveType, intPrimitiveType, floatPrimitiveType, doublePrimitiveType, stringPrimitiveType];
        for (let type of types) {
            let typeIdFirstUppercase = type.identifier.charAt(0).toUpperCase() + type.identifier.substring(1);
            this.addMethod(new Method("set" + typeIdFirstUppercase, new Parameterlist([
                { identifier: "parameterIndex", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
                { identifier: "value", type: type, declaration: null, usagePositions: null, isFinal: true }
            ]), voidPrimitiveType, (parameters) => {
                let o = parameters[0].value;
                let index = parameters[1].value;
                let value = parameters[2].value;
                let psh = o.intrinsicData["Helper"];
                let error = psh.setValue(value, index);
                if (error != null) {
                    module.main.getInterpreter().resumeAfterInput(null);
                    module.main.getInterpreter().throwException(error);
                }
                return;
            }, false, false, 'Setzt im Parameter mit dem angegebenen Index den ' + type.identifier + '-Wert ein.'));
        }
    }
}
export class PreparedStatementHelper {
    constructor(connectionHelper, query) {
        this.connectionHelper = connectionHelper;
        this.query = query.trim();
        this.prepareStatement(this.query);
    }
    prepareStatement(sql) {
        let insideQuotation = false;
        this.parameterPositions = [];
        for (let i = 0; i < sql.length; i++) {
            let c = sql.charAt(i);
            switch (c) {
                case "'":
                    insideQuotation = !insideQuotation;
                    break;
                case "?":
                    if (!insideQuotation) {
                        this.parameterPositions.push(i);
                    }
                    break;
                default:
                    break;
            }
        }
        this.parameterValues = new Array(this.parameterPositions.length);
    }
    setValue(value, position) {
        if (position < 1 || position > this.parameterPositions.length) {
            if (this.parameterPositions.length == 0) {
                return "Es gibt keine Parameter (mit ? besetzte Stellen) in dieser Anweisung.";
            }
            return "Es gibt nur die Parameterpositionen 1 bis " + this.parameterPositions.length + " in der SQL-Anweisung, keine Position " + position + ".";
        }
        if (value == null) {
            this.parameterValues[position - 1] = "null";
        }
        else if (typeof value == "string") {
            value = value.replace(/'/g, "''");
            this.parameterValues[position - 1] = "'" + value + "'";
        }
        else {
            this.parameterValues[position - 1] = "" + value;
        }
        return;
    }
    checkQuery() {
        return null;
    }
    getQueryWithParameterValuesFilledIn() {
        let query = this.query;
        let queryParts = [];
        let pos = 0;
        for (let i = 0; i < this.parameterPositions.length; i++) {
            queryParts.push(query.substring(pos, this.parameterPositions[i]));
            pos = this.parameterPositions[i] + 1;
        }
        if (pos < query.length) {
            queryParts.push(query.substring(pos));
        }
        let queryWithParameterValues = "";
        for (let i = 0; i < this.parameterPositions.length; i++) {
            queryWithParameterValues += queryParts[i] + this.parameterValues[i];
        }
        if (queryParts.length > this.parameterPositions.length) {
            queryWithParameterValues += queryParts[queryParts.length - 1];
        }
        return queryWithParameterValues;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YWJhc2VQcmVwYXJlZFN0YXRlbWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9jbGllbnQvcnVudGltZWxpYnJhcnkvZGF0YWJhc2UvRGF0YWJhc2VQcmVwYXJlZFN0YXRlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakwsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBR2pELE1BQU0sT0FBTyw4QkFBK0IsU0FBUSxLQUFLO0lBRXJELFlBQVksTUFBYztRQUN0QixLQUFLLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLDZGQUE2RixDQUFDLENBQUM7UUFHbEksSUFBSSxhQUFhLEdBQVUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFakUsSUFBSSxDQUFDLFlBQVksQ0FBUSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRTdELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsY0FBYyxFQUFFLElBQUksYUFBYSxDQUFDLEVBQzNELENBQUMsRUFBRSxhQUFhLEVBQ2IsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVYLElBQUksQ0FBQyxHQUFrQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBRTNDLElBQUksR0FBRyxHQUE0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LFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRSxHQUFHLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN4QztRQUVELElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDcEIsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDekM7UUFFRCxJQUFJLHdCQUF3QixHQUFHLEVBQUUsQ0FBQztRQUNsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNyRCx3QkFBd0IsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN2RTtRQUVELElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFO1lBQ3BELHdCQUF3QixJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ2pFO1FBRUQsT0FBTyx3QkFBd0IsQ0FBQztJQUNwQyxDQUFDO0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBLbGFzcyB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBib29sZWFuUHJpbWl0aXZlVHlwZSwgZG91YmxlUHJpbWl0aXZlVHlwZSwgZmxvYXRQcmltaXRpdmVUeXBlLCBpbnRQcmltaXRpdmVUeXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlLCB2b2lkUHJpbWl0aXZlVHlwZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBNZXRob2QsIFBhcmFtZXRlcmxpc3QgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgUnVudGltZU9iamVjdCB9IGZyb20gXCIuLi8uLi9pbnRlcnByZXRlci9SdW50aW1lT2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IENvbm5lY3Rpb25IZWxwZXIgfSBmcm9tIFwiLi9Db25uZWN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IFJlc3VsdHNldEhlbHBlciB9IGZyb20gXCIuL1Jlc3VsdFNldC5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBEYXRhYmFzZVByZXBhcmVkU3RhdGVtZW50Q2xhc3MgZXh0ZW5kcyBLbGFzcyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IobW9kdWxlOiBNb2R1bGUpIHtcclxuICAgICAgICBzdXBlcihcIlByZXBhcmVkU3RhdGVtZW50XCIsIG1vZHVsZSwgXCJFaW4gUHJlcGFyZWRTdGF0ZW1lbnQtT2JqZWt0IHJlcHLDpHNlbnRpZXJ0IGVpbmUgcGFyYW1ldHJpc2llcnRlIEFud2Vpc3VuZyBhbiBkaWUgRGF0ZW5iYW5rLlwiKTtcclxuXHJcblxyXG4gICAgICAgIGxldCByZXN1bHRTZXRUeXBlID0gPEtsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlJlc3VsdFNldFwiKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRCYXNlQ2xhc3MoPEtsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIk9iamVjdFwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJleGVjdXRlUXVlcnlcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCByZXN1bHRTZXRUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcHNoOiBQcmVwYXJlZFN0YXRlbWVudEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkhlbHBlclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaW50ZXJwcmV0ZXIgPSBtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwc2gucXVlcnkudG9Mb2NhbGVMb3dlckNhc2UoKS5zdGFydHNXaXRoKFwic2VsZWN0XCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS5yZXN1bWVBZnRlcklucHV0KG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiTWl0IGRlciBNZXRob2RlIGV4ZWN1dGVRdWVyeSBrw7ZubmVuIG51ciBzZWxlY3QtQW53ZWlzdW5nZW4gYXVzZ2Vmw7xocnQgd2VyZGVuLiBCZW51dHplIGbDvHIgZGF0ZW52ZXLDpG5kZXJuZGUgQW53ZWlzdW5nZW4gZGllIE1ldGhvZGUgZXhlY3V0ZVVwZGF0ZS5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXIucGF1c2VGb3JJbnB1dCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIG1vZHVsZS5tYWluLmdldEJvdHRvbURpdigpLnNob3dIaWRlRGJCdXN5SWNvbih0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgZXJyb3IgPSBwc2guY2hlY2tRdWVyeSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlcnJvciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBwc2guY29ubmVjdGlvbkhlbHBlci5leGVjdXRlUXVlcnkocHNoLmdldFF1ZXJ5V2l0aFBhcmFtZXRlclZhbHVlc0ZpbGxlZEluKCksIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlLm1haW4uZ2V0Qm90dG9tRGl2KCkuc2hvd0hpZGVEYkJ1c3lJY29uKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLnJlc3VtZUFmdGVySW5wdXQobnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVycHJldGVyLnRocm93RXhjZXB0aW9uKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBsZXQgcnNoID0gbmV3IFJlc3VsdHNldEhlbHBlcihyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBycyA9IG5ldyBSdW50aW1lT2JqZWN0KHJlc3VsdFNldFR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJzLmludHJpbnNpY0RhdGFbXCJIZWxwZXJcIl0gPSByc2g7XHJcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXIucmVzdW1lQWZ0ZXJJbnB1dCh7IHZhbHVlOiBycywgdHlwZTogcmVzdWx0U2V0VHlwZSB9LCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdGw7xocnQgZWluIFNRTC1TdGF0ZW1lbnQgYXVzLCBkYXMgZWluZSBzZWxlY3QtQW53ZWlzdW5nIGVudGjDpGx0LicsXHJcbiAgICAgICAgICAgIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJleGVjdXRlVXBkYXRlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHBzaDogUHJlcGFyZWRTdGF0ZW1lbnRIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGludGVycHJldGVyID0gbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKTtcclxuICAgICAgICAgICAgICAgIGlmIChwc2gucXVlcnkudG9Mb2NhbGVMb3dlckNhc2UoKS5zdGFydHNXaXRoKFwic2VsZWN0XCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS5yZXN1bWVBZnRlcklucHV0KG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiTWl0IGRlciBNZXRob2RlIGV4ZWN1dGUga8O2bm5lbiBudXIgZGF0ZW52ZXLDpG5kZXJuZGUgQW53ZWlzdW5nZW4gYXVzZ2Vmw7xocnQgd2VyZGVuLlwiICsgXHJcbiAgICAgICAgICAgICAgICAgICAgXCJCZW51dHplIGbDvHIgc2VsZWN0LUFud2Vpc3VuZ2VuIGRpZSBNZXRob2RlIGV4ZWN1dGVRdWVyeS5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXIucGF1c2VGb3JJbnB1dCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIG1vZHVsZS5tYWluLmdldEJvdHRvbURpdigpLnNob3dIaWRlRGJCdXN5SWNvbih0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgZXJyb3IgPSBwc2guY2hlY2tRdWVyeSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlcnJvciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXIucmVzdW1lQWZ0ZXJJbnB1dChudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHBzaC5jb25uZWN0aW9uSGVscGVyLmV4ZWN1dGVXcml0ZVN0YXRlbWVudChwc2guZ2V0UXVlcnlXaXRoUGFyYW1ldGVyVmFsdWVzRmlsbGVkSW4oKSwgKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlLm1haW4uZ2V0Qm90dG9tRGl2KCkuc2hvd0hpZGVEYkJ1c3lJY29uKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLnJlc3VtZUFmdGVySW5wdXQobnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVycHJldGVyLnJlc3VtZUFmdGVySW5wdXQobnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVycHJldGVyLnRocm93RXhjZXB0aW9uKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRlci5yZXN1bWVBZnRlcklucHV0KHsgdmFsdWU6IDAsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUgfSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnRsO8aHJ0IGVpbiBTUUwtU3RhdGVtZW50IGF1cywgZGFzIGVpbmUgZGF0ZW52ZXLDpG5kZXJuZGUgQW53ZWlzdW5nIGVudGjDpGx0LicsXHJcbiAgICAgICAgICAgIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIGxldCB0eXBlcyA9IFtib29sZWFuUHJpbWl0aXZlVHlwZSwgaW50UHJpbWl0aXZlVHlwZSwgZmxvYXRQcmltaXRpdmVUeXBlLCBkb3VibGVQcmltaXRpdmVUeXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlXTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgdHlwZSBvZiB0eXBlcykge1xyXG5cclxuICAgICAgICAgICAgbGV0IHR5cGVJZEZpcnN0VXBwZXJjYXNlID0gdHlwZS5pZGVudGlmaWVyLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdHlwZS5pZGVudGlmaWVyLnN1YnN0cmluZygxKTtcclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2V0XCIrdHlwZUlkRmlyc3RVcHBlcmNhc2UsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJwYXJhbWV0ZXJJbmRleFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ2YWx1ZVwiLCB0eXBlOiB0eXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZTogYW55ID0gcGFyYW1ldGVyc1syXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcHNoOiBQcmVwYXJlZFN0YXRlbWVudEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIkhlbHBlclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVycm9yID0gcHNoLnNldFZhbHVlKHZhbHVlLCBpbmRleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS5yZXN1bWVBZnRlcklucHV0KG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLnRocm93RXhjZXB0aW9uKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdTZXR6dCBpbSBQYXJhbWV0ZXIgbWl0IGRlbSBhbmdlZ2ViZW5lbiBJbmRleCBkZW4gJyArIHR5cGUuaWRlbnRpZmllciArICctV2VydCBlaW4uJykpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn1cclxuXHJcblxyXG5leHBvcnQgY2xhc3MgUHJlcGFyZWRTdGF0ZW1lbnRIZWxwZXIge1xyXG5cclxuICAgIHBhcmFtZXRlclZhbHVlczogc3RyaW5nW107XHJcbiAgICBwYXJhbWV0ZXJQb3NpdGlvbnM6IG51bWJlcltdO1xyXG4gICAgcXVlcnk6IHN0cmluZztcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY29ubmVjdGlvbkhlbHBlcjogQ29ubmVjdGlvbkhlbHBlciwgcXVlcnk6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMucXVlcnkgPSBxdWVyeS50cmltKCk7XHJcbiAgICAgICAgdGhpcy5wcmVwYXJlU3RhdGVtZW50KHRoaXMucXVlcnkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByZXBhcmVTdGF0ZW1lbnQoc3FsOiBzdHJpbmcpIHtcclxuXHJcbiAgICAgICAgbGV0IGluc2lkZVF1b3RhdGlvbjogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMucGFyYW1ldGVyUG9zaXRpb25zID0gW107XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3FsLmxlbmd0aDsgaSsrKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgYyA9IHNxbC5jaGFyQXQoaSk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoYykge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIidcIjogaW5zaWRlUXVvdGF0aW9uID0gIWluc2lkZVF1b3RhdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCI/XCI6IGlmICghaW5zaWRlUXVvdGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJhbWV0ZXJQb3NpdGlvbnMucHVzaChpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucGFyYW1ldGVyVmFsdWVzID0gbmV3IEFycmF5KHRoaXMucGFyYW1ldGVyUG9zaXRpb25zLmxlbmd0aCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldFZhbHVlKHZhbHVlOiBhbnksIHBvc2l0aW9uOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgICAgIGlmIChwb3NpdGlvbiA8IDEgfHwgcG9zaXRpb24gPiB0aGlzLnBhcmFtZXRlclBvc2l0aW9ucy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucGFyYW1ldGVyUG9zaXRpb25zLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJFcyBnaWJ0IGtlaW5lIFBhcmFtZXRlciAobWl0ID8gYmVzZXR6dGUgU3RlbGxlbikgaW4gZGllc2VyIEFud2Vpc3VuZy5cIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gXCJFcyBnaWJ0IG51ciBkaWUgUGFyYW1ldGVycG9zaXRpb25lbiAxIGJpcyBcIiArIHRoaXMucGFyYW1ldGVyUG9zaXRpb25zLmxlbmd0aCArIFwiIGluIGRlciBTUUwtQW53ZWlzdW5nLCBrZWluZSBQb3NpdGlvbiBcIiArIHBvc2l0aW9uICsgXCIuXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih2YWx1ZSA9PSBudWxsKXtcclxuICAgICAgICAgICAgdGhpcy5wYXJhbWV0ZXJWYWx1ZXNbcG9zaXRpb24gLSAxXSA9IFwibnVsbFwiO1xyXG4gICAgICAgIH0gZWxzZVxyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoLycvZywgXCInJ1wiKTtcclxuICAgICAgICAgICAgdGhpcy5wYXJhbWV0ZXJWYWx1ZXNbcG9zaXRpb24gLSAxXSA9IFwiJ1wiICsgdmFsdWUgKyBcIidcIjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnBhcmFtZXRlclZhbHVlc1twb3NpdGlvbiAtIDFdID0gXCJcIiArIHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY2hlY2tRdWVyeSgpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFF1ZXJ5V2l0aFBhcmFtZXRlclZhbHVlc0ZpbGxlZEluKCk6IHN0cmluZyB7XHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0gdGhpcy5xdWVyeTtcclxuICAgICAgICBsZXQgcXVlcnlQYXJ0czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBsZXQgcG9zID0gMDtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnBhcmFtZXRlclBvc2l0aW9ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBxdWVyeVBhcnRzLnB1c2gocXVlcnkuc3Vic3RyaW5nKHBvcywgdGhpcy5wYXJhbWV0ZXJQb3NpdGlvbnNbaV0pKTtcclxuICAgICAgICAgICAgcG9zID0gdGhpcy5wYXJhbWV0ZXJQb3NpdGlvbnNbaV0gKyAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHBvcyA8IHF1ZXJ5Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICBxdWVyeVBhcnRzLnB1c2gocXVlcnkuc3Vic3RyaW5nKHBvcykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHF1ZXJ5V2l0aFBhcmFtZXRlclZhbHVlcyA9IFwiXCI7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnBhcmFtZXRlclBvc2l0aW9ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBxdWVyeVdpdGhQYXJhbWV0ZXJWYWx1ZXMgKz0gcXVlcnlQYXJ0c1tpXSArIHRoaXMucGFyYW1ldGVyVmFsdWVzW2ldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHF1ZXJ5UGFydHMubGVuZ3RoID4gdGhpcy5wYXJhbWV0ZXJQb3NpdGlvbnMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHF1ZXJ5V2l0aFBhcmFtZXRlclZhbHVlcyArPSBxdWVyeVBhcnRzW3F1ZXJ5UGFydHMubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcXVlcnlXaXRoUGFyYW1ldGVyVmFsdWVzO1xyXG4gICAgfVxyXG5cclxufSJdfQ==