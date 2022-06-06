import { getTypeIdentifier } from "../../compiler/types/DeclarationHelper.js";
export class MySignatureHelpProvider {
    constructor(main) {
        this.main = main;
        this.signatureHelpTriggerCharacters = ['(', ',', ';', '<', '>', '=']; // semicolon, <, >, = for for-loop, if, while, ...
        this.signatureHelpRetriggerCharacters = [];
    }
    provideSignatureHelp(model, position, token, context) {
        var _a, _b, _c;
        let isConsole = (model == ((_c = (_b = (_a = this.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console) === null || _b === void 0 ? void 0 : _b.editor) === null || _c === void 0 ? void 0 : _c.getModel()));
        if (!isConsole && model != this.main.getMonacoEditor().getModel()) {
            return;
        }
        let that = this;
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                var _a, _b;
                if (isConsole) {
                    (_b = (_a = this.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console) === null || _b === void 0 ? void 0 : _b.compileIfDirty();
                }
                else {
                    this.main.compileIfDirty();
                }
                resolve(that.provideSignatureHelpLater(model, position, token, context));
            }, 300);
        });
    }
    provideSignatureHelpLater(model, position, token, context) {
        var _a, _b;
        let isConsole = (model != this.main.getMonacoEditor().getModel());
        let module = isConsole ? (_b = (_a = this.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console) === null || _b === void 0 ? void 0 : _b.compiler.module :
            this.main.getCurrentWorkspace().getModuleByMonacoModel(model);
        if (module == null) {
            return null;
        }
        // let textUntilPosition = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
        // let textAfterPosition = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber + 5, endColumn: 1 });
        let methodCallPositions = module.methodCallPositions[position.lineNumber];
        if (methodCallPositions == null)
            return null;
        let methodCallPosition = null;
        let rightMostPosition = -1;
        for (let i = methodCallPositions.length - 1; i >= 0; i--) {
            let mcp = methodCallPositions[i];
            if (mcp.identifierPosition.column + mcp.identifierPosition.length < position.column
                && mcp.identifierPosition.column > rightMostPosition) {
                if (mcp.rightBracketPosition == null ||
                    (position.lineNumber <= mcp.rightBracketPosition.line && position.column <= mcp.rightBracketPosition.column)
                    || (position.lineNumber < mcp.rightBracketPosition.line)) {
                    methodCallPosition = mcp;
                    rightMostPosition = mcp.identifierPosition.column;
                }
            }
        }
        if (methodCallPosition == null)
            return null;
        return this.getSignatureHelp(methodCallPosition, position);
    }
    getSignatureHelp(methodCallPosition, position) {
        let parameterIndex = 0;
        for (let cp of methodCallPosition.commaPositions) {
            if (cp.line < position.lineNumber || (cp.line == position.lineNumber && cp.column < position.column)) {
                parameterIndex++;
            }
        }
        let signatureInformationList = [];
        if ((typeof methodCallPosition.possibleMethods) == "string") {
            signatureInformationList = signatureInformationList.concat(this.makeIntrinsicSignatureInformation(methodCallPosition.possibleMethods, parameterIndex));
        }
        else {
            for (let method of methodCallPosition.possibleMethods) {
                let m = method;
                if (m.getParameterCount() > parameterIndex) {
                    signatureInformationList = signatureInformationList.concat(this.makeSignatureInformation(m));
                }
            }
        }
        return Promise.resolve({
            value: {
                activeParameter: parameterIndex,
                activeSignature: 0,
                signatures: signatureInformationList
            },
            dispose: () => { }
        });
    }
    makeIntrinsicSignatureInformation(method, parameterIndex) {
        switch (method) {
            case "while":
                return [
                    {
                        label: "while(Bedingung){ Anweisungen }",
                        documentation: "Wiederholung mit Anfangsbedingung (while-loop)",
                        parameters: [
                            { label: "Bedingung", documentation: "Die Bedingung wird vor jeder Wiederholung ausgewertet. Ist sie erfüllt ist (d.h. hat sie den Wert true), so werden die Anweisungen in {} erneut ausgeführt, ansonsten wird mit der nächsten Anweisung nach { } fortgefahren." },
                        ]
                    }
                ];
            case "if":
                return [
                    {
                        label: "if(Bedingung){ Anweisungen1 } else { Anweisungen2 }",
                        documentation: "Bedingung (else... ist optional)",
                        parameters: [
                            { label: "Bedingung", documentation: "Ist die Bedingung erfüllt (d.h. hat sie den Wert true), so werden die Anweisungen1 ausgeführt. Trifft die Bedingung nicht zu (d.h. hat sie den Wert false), so werden die Anweisungen2 ausgeführt." },
                        ]
                    }
                ];
            case "switch":
                return [
                    {
                        label: "switch(Selektor){case Wert_1: Anweisungen1; break; case Wert_2 Anweisungen2; break; default: Defaultanweisungen; break;}",
                        documentation: "Bedingung (else... ist optional)",
                        parameters: [
                            { label: "Selektor", documentation: "Der Wert des Selektor-Terms wird ausgewertet. Hat er den Wert Wert_1, so werden die Anweisungen1 ausgeführt. Hat er den Wert Wert_2, so werden die Anweisungen2 ausgeführt usw. Hat er keinen der bei case... aufgeführten Werte, so werden die Defaultanweisungen ausgeführt." },
                        ]
                    }
                ];
            case "for":
                return [
                    {
                        label: "for(Startanweisung; Bedingung; Anweisung am Ende jeder Wiederholung){ Anweisungen }",
                        documentation: "Wiederholung mit for (for-loop)",
                        parameters: [
                            { label: "Startanweisung", documentation: "Diese Anweisung wird vor der ersten Wiederholung einmal ausgeführt." },
                            { label: "Bedingung", documentation: "Die Bedingung wird vor jeder Wiederholung ausgewertet. Ist sie erfüllt ist (d.h. hat sie den Wert true), so werden die Anweisungen in {} erneut ausgeführt, ansonsten wird mit der nächsten Anweisung nach { } fortgefahren." },
                            { label: "Anweisung am Ende jeder Wiederholung", documentation: "Diese Anweisung wird stets am Ende jeder Wiederholung ausgeführt." },
                        ]
                    }
                ];
            case "print":
                let methods = [
                    {
                        label: "print(text: String, color: String)",
                        documentation: "Gibt Text farbig in der Ausgabe aus",
                        parameters: [
                            { label: "text: String", documentation: "text: Text, der ausgegeben werden soll" },
                            { label: "color: String", documentation: "Farbe (englischer Name oder #ffffff oder rgb(255,255,255)) oder statisches Attribut der Klasse Color, z.B. Color.red" }
                        ]
                    },
                    {
                        label: "print(text: String, color: int)",
                        documentation: "Gibt Text farbig in der Ausgabe aus",
                        parameters: [
                            { label: "text: String", documentation: "text: Text, der ausgegeben werden soll" },
                            { label: "color: String", documentation: "Farbe als int-Wert kodiert, z.B. 0xff00ff" },
                        ]
                    },
                    {
                        label: "print(text: String)",
                        documentation: "Gibt Text in der Ausgabe aus",
                        parameters: [
                            { label: "text: String", documentation: "text: Text, der ausgegeben werden soll" }
                        ]
                    }
                ];
                return methods;
            case "println":
                return [
                    {
                        label: "println(text: String, color: String)",
                        documentation: "Gibt Text farbig in der Ausgabe aus. Der nächste Text landet eine Zeile tiefer.",
                        parameters: [
                            { label: "text: String", documentation: "text: Text, der ausgegeben werden soll" },
                            { label: "color: String", documentation: "Farbe (englischer Name oder #ffffff oder rgb(255,255,255) oder statisches Attribut der Klasse Color, z.B. Color.red)" }
                        ]
                    },
                    {
                        label: "println(text: String, color: int)",
                        documentation: "Gibt Text farbig in der Ausgabe aus. Der nächste Text landet eine Zeile tiefer.",
                        parameters: [
                            { label: "text: String", documentation: "text: Text, der ausgegeben werden soll" },
                            { label: "color: int", documentation: "Farbe als int-kodierter Wert, z.B. 0xffffff" }
                        ]
                    },
                    {
                        label: "println(text: String)",
                        documentation: "Gibt Text farbig in der Ausgabe aus. Der nächste Text landet eine Zeile tiefer.",
                        parameters: [
                            { label: "text: String", documentation: "text: Text, der ausgegeben werden soll" }
                        ]
                    },
                ];
        }
    }
    makeSignatureInformation(method) {
        let label = "";
        if (method.getReturnType() != null && !method.isConstructor) {
            label += getTypeIdentifier(method.getReturnType()) + " ";
        }
        label += method.identifier + "(";
        let parameterInformationList = [];
        let pl = method.getParameterList().parameters;
        for (let i = 0; i < pl.length; i++) {
            let p = pl[i];
            let posFrom = label.length;
            let type = p.type;
            if (p.isEllipsis) {
                type = type.arrayOfType;
            }
            let pLabel = getTypeIdentifier(type) + (p.isEllipsis ? "..." : "") + " " + p.identifier;
            label += pLabel;
            let posTo = label.length;
            if (i < pl.length - 1) {
                label += ", ";
            }
            let pi = {
                label: [posFrom, posTo],
                documentation: "" //Test: Parameter documentation"
            };
            parameterInformationList.push(pi);
        }
        label += ")";
        return [{
                label: label,
                parameters: parameterInformationList,
                documentation: method.documentation == null ? "" : method.documentation
            }];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTXlTaWduYXR1cmVIZWxwUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L21haW4vZ3VpL015U2lnbmF0dXJlSGVscFByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU1BLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBTTlFLE1BQU0sT0FBTyx1QkFBdUI7SUFLaEMsWUFBb0IsSUFBYztRQUFkLFNBQUksR0FBSixJQUFJLENBQVU7UUFIbEMsbUNBQThCLEdBQXVCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLGtEQUFrRDtRQUN2SSxxQ0FBZ0MsR0FBdUIsRUFBRSxDQUFDO0lBRzFELENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxLQUErQixFQUFFLFFBQXlCLEVBQzNFLEtBQStCLEVBQy9CLE9BQThDOztRQUc5QyxJQUFJLFNBQVMsR0FBRyxDQUFDLEtBQUssS0FBSSxNQUFBLE1BQUEsTUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSwwQ0FBRSxPQUFPLDBDQUFFLE1BQU0sMENBQUUsUUFBUSxFQUFFLENBQUEsQ0FBQyxDQUFDO1FBRWpGLElBQUksQ0FBQyxTQUFTLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDL0QsT0FBTztTQUNWO1FBRUQsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWhCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFFbkMsVUFBVSxDQUFDLEdBQUcsRUFBRTs7Z0JBRVosSUFBSSxTQUFTLEVBQUU7b0JBQ1gsTUFBQSxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLDBDQUFFLE9BQU8sMENB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SSxFQUFFLEdBQTBDO2dCQUM1QyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDO2dCQUN2QixhQUFhLEVBQUUsRUFBRSxDQUFDLGdDQUFnQzthQUNyRCxDQUFDO1lBRUYsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBRXJDO1FBSUQsS0FBSyxJQUFJLEdBQUcsQ0FBQztRQUViLE9BQU8sQ0FBQztnQkFDSixLQUFLLEVBQUUsS0FBSztnQkFDWixVQUFVLEVBQUUsd0JBQXdCO2dCQUNwQyxhQUFhLEVBQUUsTUFBTSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWE7YUFDMUUsQ0FBQyxDQUFBO0lBRU4sQ0FBQztDQUVKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTWFpbiB9IGZyb20gXCIuLi9NYWluLmpzXCI7XHJcbmltcG9ydCB7IE1vZHVsZSwgTWV0aG9kQ2FsbFBvc2l0aW9uIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3BhcnNlci9Nb2R1bGUuanNcIjtcclxuaW1wb3J0IHsgTWV0aG9kIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL1R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHNpZ24gfSBmcm9tIFwiY3J5cHRvXCI7XHJcbmltcG9ydCB7IFRleHRQb3NpdGlvbiB9IGZyb20gXCIuLi8uLi9jb21waWxlci9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBNYWluQmFzZSB9IGZyb20gXCIuLi9NYWluQmFzZS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUeXBlSWRlbnRpZmllciB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9EZWNsYXJhdGlvbkhlbHBlci5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheVR5cGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvQXJyYXkuanNcIjtcclxuXHJcblxyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBNeVNpZ25hdHVyZUhlbHBQcm92aWRlciBpbXBsZW1lbnRzIG1vbmFjby5sYW5ndWFnZXMuU2lnbmF0dXJlSGVscFByb3ZpZGVyIHtcclxuXHJcbiAgICBzaWduYXR1cmVIZWxwVHJpZ2dlckNoYXJhY3RlcnM/OiByZWFkb25seSBzdHJpbmdbXSA9IFsnKCcsICcsJywgJzsnLCAnPCcsICc+JywgJz0nXTsgLy8gc2VtaWNvbG9uLCA8LCA+LCA9IGZvciBmb3ItbG9vcCwgaWYsIHdoaWxlLCAuLi5cclxuICAgIHNpZ25hdHVyZUhlbHBSZXRyaWdnZXJDaGFyYWN0ZXJzPzogcmVhZG9ubHkgc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1haW46IE1haW5CYXNlKSB7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdmlkZVNpZ25hdHVyZUhlbHAobW9kZWw6IG1vbmFjby5lZGl0b3IuSVRleHRNb2RlbCwgcG9zaXRpb246IG1vbmFjby5Qb3NpdGlvbixcclxuICAgICAgICB0b2tlbjogbW9uYWNvLkNhbmNlbGxhdGlvblRva2VuLFxyXG4gICAgICAgIGNvbnRleHQ6IG1vbmFjby5sYW5ndWFnZXMuU2lnbmF0dXJlSGVscENvbnRleHQpOlxyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMuUHJvdmlkZXJSZXN1bHQ8bW9uYWNvLmxhbmd1YWdlcy5TaWduYXR1cmVIZWxwUmVzdWx0PiB7XHJcblxyXG4gICAgICAgIGxldCBpc0NvbnNvbGUgPSAobW9kZWwgPT0gdGhpcy5tYWluLmdldEJvdHRvbURpdigpPy5jb25zb2xlPy5lZGl0b3I/LmdldE1vZGVsKCkpO1xyXG5cclxuICAgICAgICBpZiAoIWlzQ29uc29sZSAmJiBtb2RlbCAhPSB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkuZ2V0TW9kZWwoKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblxyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaXNDb25zb2xlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWluLmdldEJvdHRvbURpdigpPy5jb25zb2xlPy5jb21waWxlSWZEaXJ0eSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW4uY29tcGlsZUlmRGlydHkoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRoYXQucHJvdmlkZVNpZ25hdHVyZUhlbHBMYXRlcihtb2RlbCwgcG9zaXRpb24sIHRva2VuLCBjb250ZXh0KSk7XHJcblxyXG4gICAgICAgICAgICB9LCAzMDApO1xyXG5cclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByb3ZpZGVTaWduYXR1cmVIZWxwTGF0ZXIobW9kZWw6IG1vbmFjby5lZGl0b3IuSVRleHRNb2RlbCwgcG9zaXRpb246IG1vbmFjby5Qb3NpdGlvbixcclxuICAgICAgICB0b2tlbjogbW9uYWNvLkNhbmNlbGxhdGlvblRva2VuLFxyXG4gICAgICAgIGNvbnRleHQ6IG1vbmFjby5sYW5ndWFnZXMuU2lnbmF0dXJlSGVscENvbnRleHQpOlxyXG4gICAgICAgIG1vbmFjby5sYW5ndWFnZXMuUHJvdmlkZXJSZXN1bHQ8bW9uYWNvLmxhbmd1YWdlcy5TaWduYXR1cmVIZWxwUmVzdWx0PiB7XHJcblxyXG4gICAgICAgIGxldCBpc0NvbnNvbGUgPSAobW9kZWwgIT0gdGhpcy5tYWluLmdldE1vbmFjb0VkaXRvcigpLmdldE1vZGVsKCkpO1xyXG5cclxuICAgICAgICBsZXQgbW9kdWxlOiBNb2R1bGUgPSBpc0NvbnNvbGUgPyB0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCk/LmNvbnNvbGU/LmNvbXBpbGVyLm1vZHVsZSA6XHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5nZXRDdXJyZW50V29ya3NwYWNlKCkuZ2V0TW9kdWxlQnlNb25hY29Nb2RlbChtb2RlbCk7XHJcblxyXG4gICAgICAgIGlmIChtb2R1bGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGxldCB0ZXh0VW50aWxQb3NpdGlvbiA9IG1vZGVsLmdldFZhbHVlSW5SYW5nZSh7IHN0YXJ0TGluZU51bWJlcjogMSwgc3RhcnRDb2x1bW46IDEsIGVuZExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmVOdW1iZXIsIGVuZENvbHVtbjogcG9zaXRpb24uY29sdW1uIH0pO1xyXG4gICAgICAgIC8vIGxldCB0ZXh0QWZ0ZXJQb3NpdGlvbiA9IG1vZGVsLmdldFZhbHVlSW5SYW5nZSh7IHN0YXJ0TGluZU51bWJlcjogcG9zaXRpb24ubGluZU51bWJlciwgc3RhcnRDb2x1bW46IHBvc2l0aW9uLmNvbHVtbiwgZW5kTGluZU51bWJlcjogcG9zaXRpb24ubGluZU51bWJlciArIDUsIGVuZENvbHVtbjogMSB9KTtcclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZENhbGxQb3NpdGlvbnMgPSBtb2R1bGUubWV0aG9kQ2FsbFBvc2l0aW9uc1twb3NpdGlvbi5saW5lTnVtYmVyXTtcclxuXHJcbiAgICAgICAgaWYgKG1ldGhvZENhbGxQb3NpdGlvbnMgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGxldCBtZXRob2RDYWxsUG9zaXRpb246IE1ldGhvZENhbGxQb3NpdGlvbiA9IG51bGw7XHJcbiAgICAgICAgbGV0IHJpZ2h0TW9zdFBvc2l0aW9uOiBudW1iZXIgPSAtMTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IG1ldGhvZENhbGxQb3NpdGlvbnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICAgICAgbGV0IG1jcCA9IG1ldGhvZENhbGxQb3NpdGlvbnNbaV07XHJcbiAgICAgICAgICAgIGlmIChtY3AuaWRlbnRpZmllclBvc2l0aW9uLmNvbHVtbiArIG1jcC5pZGVudGlmaWVyUG9zaXRpb24ubGVuZ3RoIDwgcG9zaXRpb24uY29sdW1uXHJcbiAgICAgICAgICAgICAgICAmJiBtY3AuaWRlbnRpZmllclBvc2l0aW9uLmNvbHVtbiA+IHJpZ2h0TW9zdFBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobWNwLnJpZ2h0QnJhY2tldFBvc2l0aW9uID09IG51bGwgfHxcclxuICAgICAgICAgICAgICAgICAgICAocG9zaXRpb24ubGluZU51bWJlciA8PSBtY3AucmlnaHRCcmFja2V0UG9zaXRpb24ubGluZSAmJiBwb3NpdGlvbi5jb2x1bW4gPD0gbWNwLnJpZ2h0QnJhY2tldFBvc2l0aW9uLmNvbHVtbilcclxuICAgICAgICAgICAgICAgICAgICB8fCAocG9zaXRpb24ubGluZU51bWJlciA8IG1jcC5yaWdodEJyYWNrZXRQb3NpdGlvbi5saW5lKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZENhbGxQb3NpdGlvbiA9IG1jcDtcclxuICAgICAgICAgICAgICAgICAgICByaWdodE1vc3RQb3NpdGlvbiA9IG1jcC5pZGVudGlmaWVyUG9zaXRpb24uY29sdW1uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobWV0aG9kQ2FsbFBvc2l0aW9uID09IG51bGwpIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5nZXRTaWduYXR1cmVIZWxwKG1ldGhvZENhbGxQb3NpdGlvbiwgcG9zaXRpb24pO1xyXG5cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldFNpZ25hdHVyZUhlbHAobWV0aG9kQ2FsbFBvc2l0aW9uOiBNZXRob2RDYWxsUG9zaXRpb24sXHJcbiAgICAgICAgcG9zaXRpb246IG1vbmFjby5Qb3NpdGlvbik6IG1vbmFjby5sYW5ndWFnZXMuUHJvdmlkZXJSZXN1bHQ8bW9uYWNvLmxhbmd1YWdlcy5TaWduYXR1cmVIZWxwUmVzdWx0PiB7XHJcblxyXG4gICAgICAgIGxldCBwYXJhbWV0ZXJJbmRleDogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY3Agb2YgbWV0aG9kQ2FsbFBvc2l0aW9uLmNvbW1hUG9zaXRpb25zKSB7XHJcbiAgICAgICAgICAgIGlmIChjcC5saW5lIDwgcG9zaXRpb24ubGluZU51bWJlciB8fCAoY3AubGluZSA9PSBwb3NpdGlvbi5saW5lTnVtYmVyICYmIGNwLmNvbHVtbiA8IHBvc2l0aW9uLmNvbHVtbikpIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlckluZGV4Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzaWduYXR1cmVJbmZvcm1hdGlvbkxpc3Q6IG1vbmFjby5sYW5ndWFnZXMuU2lnbmF0dXJlSW5mb3JtYXRpb25bXSA9IFtdO1xyXG5cclxuICAgICAgICBpZiAoKHR5cGVvZiBtZXRob2RDYWxsUG9zaXRpb24ucG9zc2libGVNZXRob2RzKSA9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIHNpZ25hdHVyZUluZm9ybWF0aW9uTGlzdCA9IHNpZ25hdHVyZUluZm9ybWF0aW9uTGlzdC5jb25jYXQodGhpcy5tYWtlSW50cmluc2ljU2lnbmF0dXJlSW5mb3JtYXRpb24oPHN0cmluZz5tZXRob2RDYWxsUG9zaXRpb24ucG9zc2libGVNZXRob2RzLCBwYXJhbWV0ZXJJbmRleCkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG1ldGhvZCBvZiBtZXRob2RDYWxsUG9zaXRpb24ucG9zc2libGVNZXRob2RzKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbSA9IDxNZXRob2Q+bWV0aG9kO1xyXG4gICAgICAgICAgICAgICAgaWYgKG0uZ2V0UGFyYW1ldGVyQ291bnQoKSA+IHBhcmFtZXRlckluZGV4KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHNpZ25hdHVyZUluZm9ybWF0aW9uTGlzdCA9IHNpZ25hdHVyZUluZm9ybWF0aW9uTGlzdC5jb25jYXQodGhpcy5tYWtlU2lnbmF0dXJlSW5mb3JtYXRpb24obSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XHJcbiAgICAgICAgICAgIHZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICBhY3RpdmVQYXJhbWV0ZXI6IHBhcmFtZXRlckluZGV4LFxyXG4gICAgICAgICAgICAgICAgYWN0aXZlU2lnbmF0dXJlOiAwLFxyXG4gICAgICAgICAgICAgICAgc2lnbmF0dXJlczogc2lnbmF0dXJlSW5mb3JtYXRpb25MaXN0XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGRpc3Bvc2U6ICgpID0+IHsgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VJbnRyaW5zaWNTaWduYXR1cmVJbmZvcm1hdGlvbihtZXRob2Q6IHN0cmluZywgcGFyYW1ldGVySW5kZXg6IG51bWJlcik6IG1vbmFjby5sYW5ndWFnZXMuU2lnbmF0dXJlSW5mb3JtYXRpb25bXSB7XHJcblxyXG4gICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJ3aGlsZVwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcIndoaWxlKEJlZGluZ3VuZyl7IEFud2Vpc3VuZ2VuIH1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRhdGlvbjogXCJXaWVkZXJob2x1bmcgbWl0IEFuZmFuZ3NiZWRpbmd1bmcgKHdoaWxlLWxvb3ApXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6IFwiQmVkaW5ndW5nXCIsIGRvY3VtZW50YXRpb246IFwiRGllIEJlZGluZ3VuZyB3aXJkIHZvciBqZWRlciBXaWVkZXJob2x1bmcgYXVzZ2V3ZXJ0ZXQuIElzdCBzaWUgZXJmw7xsbHQgaXN0IChkLmguIGhhdCBzaWUgZGVuIFdlcnQgdHJ1ZSksIHNvIHdlcmRlbiBkaWUgQW53ZWlzdW5nZW4gaW4ge30gZXJuZXV0IGF1c2dlZsO8aHJ0LCBhbnNvbnN0ZW4gd2lyZCBtaXQgZGVyIG7DpGNoc3RlbiBBbndlaXN1bmcgbmFjaCB7IH0gZm9ydGdlZmFocmVuLlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICB9XTtcclxuICAgICAgICAgICAgY2FzZSBcImlmXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IFwiaWYoQmVkaW5ndW5nKXsgQW53ZWlzdW5nZW4xIH0gZWxzZSB7IEFud2Vpc3VuZ2VuMiB9XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50YXRpb246IFwiQmVkaW5ndW5nIChlbHNlLi4uIGlzdCBvcHRpb25hbClcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogXCJCZWRpbmd1bmdcIiwgZG9jdW1lbnRhdGlvbjogXCJJc3QgZGllIEJlZGluZ3VuZyBlcmbDvGxsdCAoZC5oLiBoYXQgc2llIGRlbiBXZXJ0IHRydWUpLCBzbyB3ZXJkZW4gZGllIEFud2Vpc3VuZ2VuMSBhdXNnZWbDvGhydC4gVHJpZmZ0IGRpZSBCZWRpbmd1bmcgbmljaHQgenUgKGQuaC4gaGF0IHNpZSBkZW4gV2VydCBmYWxzZSksIHNvIHdlcmRlbiBkaWUgQW53ZWlzdW5nZW4yIGF1c2dlZsO8aHJ0LlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICB9XTtcclxuICAgICAgICAgICAgY2FzZSBcInN3aXRjaFwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcInN3aXRjaChTZWxla3Rvcil7Y2FzZSBXZXJ0XzE6IEFud2Vpc3VuZ2VuMTsgYnJlYWs7IGNhc2UgV2VydF8yIEFud2Vpc3VuZ2VuMjsgYnJlYWs7IGRlZmF1bHQ6IERlZmF1bHRhbndlaXN1bmdlbjsgYnJlYWs7fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudGF0aW9uOiBcIkJlZGluZ3VuZyAoZWxzZS4uLiBpc3Qgb3B0aW9uYWwpXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6IFwiU2VsZWt0b3JcIiwgZG9jdW1lbnRhdGlvbjogXCJEZXIgV2VydCBkZXMgU2VsZWt0b3ItVGVybXMgd2lyZCBhdXNnZXdlcnRldC4gSGF0IGVyIGRlbiBXZXJ0IFdlcnRfMSwgc28gd2VyZGVuIGRpZSBBbndlaXN1bmdlbjEgYXVzZ2Vmw7xocnQuIEhhdCBlciBkZW4gV2VydCBXZXJ0XzIsIHNvIHdlcmRlbiBkaWUgQW53ZWlzdW5nZW4yIGF1c2dlZsO8aHJ0IHVzdy4gSGF0IGVyIGtlaW5lbiBkZXIgYmVpIGNhc2UuLi4gYXVmZ2Vmw7xocnRlbiBXZXJ0ZSwgc28gd2VyZGVuIGRpZSBEZWZhdWx0YW53ZWlzdW5nZW4gYXVzZ2Vmw7xocnQuXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgIH1dO1xyXG4gICAgICAgICAgICBjYXNlIFwiZm9yXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IFwiZm9yKFN0YXJ0YW53ZWlzdW5nOyBCZWRpbmd1bmc7IEFud2Vpc3VuZyBhbSBFbmRlIGplZGVyIFdpZWRlcmhvbHVuZyl7IEFud2Vpc3VuZ2VuIH1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRhdGlvbjogXCJXaWVkZXJob2x1bmcgbWl0IGZvciAoZm9yLWxvb3ApXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6IFwiU3RhcnRhbndlaXN1bmdcIiwgZG9jdW1lbnRhdGlvbjogXCJEaWVzZSBBbndlaXN1bmcgd2lyZCB2b3IgZGVyIGVyc3RlbiBXaWVkZXJob2x1bmcgZWlubWFsIGF1c2dlZsO8aHJ0LlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiBcIkJlZGluZ3VuZ1wiLCBkb2N1bWVudGF0aW9uOiBcIkRpZSBCZWRpbmd1bmcgd2lyZCB2b3IgamVkZXIgV2llZGVyaG9sdW5nIGF1c2dld2VydGV0LiBJc3Qgc2llIGVyZsO8bGx0IGlzdCAoZC5oLiBoYXQgc2llIGRlbiBXZXJ0IHRydWUpLCBzbyB3ZXJkZW4gZGllIEFud2Vpc3VuZ2VuIGluIHt9IGVybmV1dCBhdXNnZWbDvGhydCwgYW5zb25zdGVuIHdpcmQgbWl0IGRlciBuw6RjaHN0ZW4gQW53ZWlzdW5nIG5hY2ggeyB9IGZvcnRnZWZhaHJlbi5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogXCJBbndlaXN1bmcgYW0gRW5kZSBqZWRlciBXaWVkZXJob2x1bmdcIiwgZG9jdW1lbnRhdGlvbjogXCJEaWVzZSBBbndlaXN1bmcgd2lyZCBzdGV0cyBhbSBFbmRlIGplZGVyIFdpZWRlcmhvbHVuZyBhdXNnZWbDvGhydC5cIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgfV07XHJcbiAgICAgICAgICAgIGNhc2UgXCJwcmludFwiOlxyXG4gICAgICAgICAgICAgICAgbGV0IG1ldGhvZHM6IG1vbmFjby5sYW5ndWFnZXMuU2lnbmF0dXJlSW5mb3JtYXRpb25bXSA9XHJcbiAgICAgICAgICAgICAgICAgICAgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogXCJwcmludCh0ZXh0OiBTdHJpbmcsIGNvbG9yOiBTdHJpbmcpXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudGF0aW9uOiBcIkdpYnQgVGV4dCBmYXJiaWcgaW4gZGVyIEF1c2dhYmUgYXVzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogXCJ0ZXh0OiBTdHJpbmdcIiwgZG9jdW1lbnRhdGlvbjogXCJ0ZXh0OiBUZXh0LCBkZXIgYXVzZ2VnZWJlbiB3ZXJkZW4gc29sbFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogXCJjb2xvcjogU3RyaW5nXCIsIGRvY3VtZW50YXRpb246IFwiRmFyYmUgKGVuZ2xpc2NoZXIgTmFtZSBvZGVyICNmZmZmZmYgb2RlciByZ2IoMjU1LDI1NSwyNTUpKSBvZGVyIHN0YXRpc2NoZXMgQXR0cmlidXQgZGVyIEtsYXNzZSBDb2xvciwgei5CLiBDb2xvci5yZWRcIiB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcInByaW50KHRleHQ6IFN0cmluZywgY29sb3I6IGludClcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50YXRpb246IFwiR2lidCBUZXh0IGZhcmJpZyBpbiBkZXIgQXVzZ2FiZSBhdXNcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiBcInRleHQ6IFN0cmluZ1wiLCBkb2N1bWVudGF0aW9uOiBcInRleHQ6IFRleHQsIGRlciBhdXNnZWdlYmVuIHdlcmRlbiBzb2xsXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiBcImNvbG9yOiBTdHJpbmdcIiwgZG9jdW1lbnRhdGlvbjogXCJGYXJiZSBhbHMgaW50LVdlcnQga29kaWVydCwgei5CLiAweGZmMDBmZlwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcInByaW50KHRleHQ6IFN0cmluZylcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50YXRpb246IFwiR2lidCBUZXh0IGluIGRlciBBdXNnYWJlIGF1c1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6IFwidGV4dDogU3RyaW5nXCIsIGRvY3VtZW50YXRpb246IFwidGV4dDogVGV4dCwgZGVyIGF1c2dlZ2ViZW4gd2VyZGVuIHNvbGxcIiB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZHM7XHJcbiAgICAgICAgICAgIGNhc2UgXCJwcmludGxuXCI6XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcInByaW50bG4odGV4dDogU3RyaW5nLCBjb2xvcjogU3RyaW5nKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudGF0aW9uOiBcIkdpYnQgVGV4dCBmYXJiaWcgaW4gZGVyIEF1c2dhYmUgYXVzLiBEZXIgbsOkY2hzdGUgVGV4dCBsYW5kZXQgZWluZSBaZWlsZSB0aWVmZXIuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6IFwidGV4dDogU3RyaW5nXCIsIGRvY3VtZW50YXRpb246IFwidGV4dDogVGV4dCwgZGVyIGF1c2dlZ2ViZW4gd2VyZGVuIHNvbGxcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogXCJjb2xvcjogU3RyaW5nXCIsIGRvY3VtZW50YXRpb246IFwiRmFyYmUgKGVuZ2xpc2NoZXIgTmFtZSBvZGVyICNmZmZmZmYgb2RlciByZ2IoMjU1LDI1NSwyNTUpIG9kZXIgc3RhdGlzY2hlcyBBdHRyaWJ1dCBkZXIgS2xhc3NlIENvbG9yLCB6LkIuIENvbG9yLnJlZClcIiB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IFwicHJpbnRsbih0ZXh0OiBTdHJpbmcsIGNvbG9yOiBpbnQpXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50YXRpb246IFwiR2lidCBUZXh0IGZhcmJpZyBpbiBkZXIgQXVzZ2FiZSBhdXMuIERlciBuw6RjaHN0ZSBUZXh0IGxhbmRldCBlaW5lIFplaWxlIHRpZWZlci5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogXCJ0ZXh0OiBTdHJpbmdcIiwgZG9jdW1lbnRhdGlvbjogXCJ0ZXh0OiBUZXh0LCBkZXIgYXVzZ2VnZWJlbiB3ZXJkZW4gc29sbFwiIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiBcImNvbG9yOiBpbnRcIiwgZG9jdW1lbnRhdGlvbjogXCJGYXJiZSBhbHMgaW50LWtvZGllcnRlciBXZXJ0LCB6LkIuIDB4ZmZmZmZmXCIgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBcInByaW50bG4odGV4dDogU3RyaW5nKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudGF0aW9uOiBcIkdpYnQgVGV4dCBmYXJiaWcgaW4gZGVyIEF1c2dhYmUgYXVzLiBEZXIgbsOkY2hzdGUgVGV4dCBsYW5kZXQgZWluZSBaZWlsZSB0aWVmZXIuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6IFwidGV4dDogU3RyaW5nXCIsIGRvY3VtZW50YXRpb246IFwidGV4dDogVGV4dCwgZGVyIGF1c2dlZ2ViZW4gd2VyZGVuIHNvbGxcIiB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBtYWtlU2lnbmF0dXJlSW5mb3JtYXRpb24obWV0aG9kOiBNZXRob2QpOiBtb25hY28ubGFuZ3VhZ2VzLlNpZ25hdHVyZUluZm9ybWF0aW9uW10ge1xyXG5cclxuICAgICAgICBsZXQgbGFiZWw6IHN0cmluZyA9IFwiXCI7XHJcblxyXG4gICAgICAgIGlmIChtZXRob2QuZ2V0UmV0dXJuVHlwZSgpICE9IG51bGwgJiYgIW1ldGhvZC5pc0NvbnN0cnVjdG9yKSB7XHJcbiAgICAgICAgICAgIGxhYmVsICs9IGdldFR5cGVJZGVudGlmaWVyKG1ldGhvZC5nZXRSZXR1cm5UeXBlKCkpICsgXCIgXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsYWJlbCArPSBtZXRob2QuaWRlbnRpZmllciArIFwiKFwiO1xyXG5cclxuICAgICAgICBsZXQgcGFyYW1ldGVySW5mb3JtYXRpb25MaXN0OiBtb25hY28ubGFuZ3VhZ2VzLlBhcmFtZXRlckluZm9ybWF0aW9uW10gPSBbXTtcclxuXHJcbiAgICAgICAgbGV0IHBsID0gbWV0aG9kLmdldFBhcmFtZXRlckxpc3QoKS5wYXJhbWV0ZXJzO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBsLmxlbmd0aDsgaSsrKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgcCA9IHBsW2ldO1xyXG4gICAgICAgICAgICBsZXQgcG9zRnJvbSA9IGxhYmVsLmxlbmd0aDtcclxuICAgICAgICAgICAgbGV0IHR5cGUgPSBwLnR5cGU7XHJcbiAgICAgICAgICAgIGlmIChwLmlzRWxsaXBzaXMpIHtcclxuICAgICAgICAgICAgICAgIHR5cGUgPSAoPEFycmF5VHlwZT50eXBlKS5hcnJheU9mVHlwZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHBMYWJlbCA9IGdldFR5cGVJZGVudGlmaWVyKHR5cGUpICsgKHAuaXNFbGxpcHNpcyA/IFwiLi4uXCIgOiBcIlwiKSArIFwiIFwiICsgcC5pZGVudGlmaWVyO1xyXG4gICAgICAgICAgICBsYWJlbCArPSBwTGFiZWw7XHJcbiAgICAgICAgICAgIGxldCBwb3NUbyA9IGxhYmVsLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIGlmIChpIDwgcGwubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgbGFiZWwgKz0gXCIsIFwiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgcGk6IG1vbmFjby5sYW5ndWFnZXMuUGFyYW1ldGVySW5mb3JtYXRpb24gPSB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogW3Bvc0Zyb20sIHBvc1RvXSxcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50YXRpb246IFwiXCIgLy9UZXN0OiBQYXJhbWV0ZXIgZG9jdW1lbnRhdGlvblwiXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBwYXJhbWV0ZXJJbmZvcm1hdGlvbkxpc3QucHVzaChwaSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICBsYWJlbCArPSBcIilcIjtcclxuXHJcbiAgICAgICAgcmV0dXJuIFt7XHJcbiAgICAgICAgICAgIGxhYmVsOiBsYWJlbCxcclxuICAgICAgICAgICAgcGFyYW1ldGVyczogcGFyYW1ldGVySW5mb3JtYXRpb25MaXN0LFxyXG4gICAgICAgICAgICBkb2N1bWVudGF0aW9uOiBtZXRob2QuZG9jdW1lbnRhdGlvbiA9PSBudWxsID8gXCJcIiA6IG1ldGhvZC5kb2N1bWVudGF0aW9uXHJcbiAgICAgICAgfV1cclxuXHJcbiAgICB9XHJcblxyXG59XHJcbiJdfQ==