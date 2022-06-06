import { Main } from "../Main.js";
export class ErrorManager {
    constructor(main, $bottomDiv, $mainDiv) {
        this.main = main;
        this.$bottomDiv = $bottomDiv;
        this.$mainDiv = $mainDiv;
        this.oldDecorations = [];
        this.oldErrorDecorations = [];
        this.minimapColor = {};
        this.lightBulbOnClickFunctionList = [];
        this.minimapColor["error"] = "#bc1616";
        this.minimapColor["warning"] = "#cca700";
        this.minimapColor["info"] = "#75beff";
        this.$bracket_warning = $mainDiv.find(".jo_parenthesis_warning");
        this.$bracket_warning.attr('title', 'Klammeralarm!');
        this.$bracket_warning.children().attr('title', 'Klammeralarm!');
        let that = this;
        $mainDiv.find(".jo_pw_undo").on("click", () => {
            let editor = that.main.getMonacoEditor();
            editor.trigger(".", "undo", {});
        }).attr('title', 'Undo');
    }
    showParenthesisWarning(error) {
        if (error != null) {
            this.$bracket_warning.css("visibility", "visible");
            this.$bracket_warning.find(".jo_pw_heading").text(error);
        }
        else {
            this.$bracket_warning.css("visibility", "hidden");
        }
    }
    showErrors(workspace) {
        this.lightBulbOnClickFunctionList = [];
        let errorCountMap = new Map();
        this.$errorDiv = this.$bottomDiv.find('.jo_tabs>.jo_errorsTab');
        this.$errorDiv.empty();
        let hasErrors = false;
        let ms = workspace.moduleStore;
        let editor = this.main.getMonacoEditor();
        for (let m of ms.getModules(false)) {
            let markers = [];
            let decorations = [];
            let $errorList = [];
            let errors = m.getSortedAndFilteredErrors();
            errorCountMap.set(m, m.getErrorCount());
            for (let error of errors) {
                let linesDecorationsClassName;
                let borderLeftClass;
                let minimapColor = this.minimapColor[error.level];
                switch (error.level) {
                    case "error":
                        linesDecorationsClassName = 'jo_revealErrorLine';
                        borderLeftClass = "jo_borderLeftError";
                        break;
                    case "warning":
                        linesDecorationsClassName = 'jo_revealWarningLine';
                        borderLeftClass = "jo_borderLeftWarning";
                        break;
                    case "info":
                        linesDecorationsClassName = 'jo_revealInfoLine';
                        borderLeftClass = "jo_borderLeftInfo";
                        break;
                }
                if (error.quickFix != null) {
                    let quickFix = error.quickFix;
                    let lightBulbClass = "lb_" + Math.trunc(Math.random() * 1000000);
                    linesDecorationsClassName = 'jo_yellowLightBulb ' + borderLeftClass + " " + lightBulbClass;
                    this.lightBulbOnClickFunctionList.push({ class: '.' + lightBulbClass,
                        onClickFunction: () => {
                            let edits = quickFix.editsProvider(m.model.uri);
                            editor.executeEdits("", edits.map((edit) => {
                                let r = edit.edit.range;
                                return {
                                    range: new monaco.Range(r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn),
                                    text: edit.edit.text,
                                    forceMoveMarkers: true
                                };
                            }));
                        },
                        title: quickFix.title
                    });
                }
                this.processError(error, m, $errorList);
                let severity;
                switch (error.level) {
                    case "error":
                        severity = monaco.MarkerSeverity.Error;
                        break;
                    case "warning":
                        severity = monaco.MarkerSeverity.Warning;
                        break;
                    case "info":
                        severity = monaco.MarkerSeverity.Info;
                        break;
                }
                markers.push({
                    startLineNumber: error.position.line,
                    startColumn: error.position.column,
                    endLineNumber: error.position.line,
                    endColumn: error.position.column + error.position.length,
                    message: error.text,
                    severity: severity,
                    //@ts-ignore
                    relatedInformation: error.quickFix
                });
                decorations.push({
                    range: {
                        startLineNumber: error.position.line,
                        startColumn: error.position.column,
                        endLineNumber: error.position.line,
                        endColumn: error.position.column + error.position.length
                    },
                    options: {
                        linesDecorationsClassName: linesDecorationsClassName,
                        minimap: {
                            position: monaco.editor.MinimapPosition.Inline,
                            color: minimapColor
                        }
                    }
                });
            }
            monaco.editor.setModelMarkers(m.model, 'test', markers);
            m.oldErrorDecorations = m.model.deltaDecorations(m.oldErrorDecorations, decorations);
            // decorations used when user clicks on error in error-list:
            this.oldDecorations = this.main.getMonacoEditor().deltaDecorations(this.oldDecorations, []);
            if ($errorList.length > 0 && this.$errorDiv.length > 0) {
                hasErrors = true;
                let $file = jQuery('<div class="jo_error-filename">' + m.file.name + '&nbsp;</div>');
                this.$errorDiv.append($file);
                for (let $error of $errorList) {
                    this.$errorDiv.append($error);
                }
            }
        }
        if (!hasErrors && this.$errorDiv.length > 0) {
            this.$errorDiv.append(jQuery('<div class="jo_noErrorMessage">Keine Fehler gefunden :-)</div>'));
        }
        this.registerLightbulbOnClickFunctions();
        return errorCountMap;
    }
    registerLightbulbOnClickFunctions() {
        let that = this;
        setTimeout(() => {
            for (let locf of that.lightBulbOnClickFunctionList) {
                jQuery(locf.class).off('click', locf.onClickFunction);
                jQuery(locf.class).on('click', locf.onClickFunction).attr('title', locf.title);
            }
        }, 800);
    }
    processError(error, m, $errorDivs) {
        let $div = jQuery('<div class="jo_error-line"></div>');
        let $lineColumn = jQuery('<span class="jo_error-position">[Z&nbsp;<span class="jo_linecolumn">' + error.position.line + '</span>' +
            ' Sp&nbsp;<span class="jo_linecolumn">' + error.position.column + '</span>]</span>:&nbsp;');
        let category = "";
        switch (error.level) {
            case "error": break;
            case "warning":
                category = '<span class="jo_warning_category">Warnung: </span>';
                break;
            case "info":
                category = '<span class="jo_info_category">Info: </span>';
                break;
        }
        let $message = jQuery('<div class="jo_error-text">' + category + error.text + "</div>");
        $div.append($lineColumn).append($message);
        let that = this;
        $div.on("mousedown", (ev) => {
            this.$errorDiv.find('.jo_error-line').removeClass('jo_active');
            $div.addClass('jo_active');
            that.showError(m, error);
        });
        $errorDivs.push($div);
    }
    showError(m, error) {
        if (this.main instanceof Main) {
            if (m != this.main.projectExplorer.getCurrentlyEditedModule()) {
                this.main.editor.dontDetectLastChange();
                this.main.projectExplorer.setModuleActive(m);
            }
        }
        let position = error.position;
        let range = {
            startColumn: position.column, startLineNumber: position.line,
            endColumn: position.column + position.length, endLineNumber: position.line
        };
        this.main.getMonacoEditor().revealRangeInCenter(range);
        let className = "";
        switch (error.level) {
            case "error":
                className = "jo_revealError";
                break;
            case "warning":
                className = "jo_revealWarning";
                break;
            case "info":
                className = "jo_revealInfo";
                break;
        }
        this.oldDecorations = this.main.getMonacoEditor().deltaDecorations(this.oldDecorations, [
            {
                range: range,
                options: { className: className }
            }
        ]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXJyb3JNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9FcnJvck1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFlBQVksQ0FBQztBQUdsQyxNQUFNLE9BQU8sWUFBWTtJQVlyQixZQUFvQixJQUFjLEVBQVUsVUFBK0IsRUFBVSxRQUE2QjtRQUE5RixTQUFJLEdBQUosSUFBSSxDQUFVO1FBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBcUI7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFxQjtRQVZsSCxtQkFBYyxHQUFhLEVBQUUsQ0FBQztRQUM5Qix3QkFBbUIsR0FBYSxFQUFFLENBQUM7UUFLbkMsaUJBQVksR0FBNEIsRUFBRSxDQUFDO1FBRTNDLGlDQUE0QixHQUFrRSxFQUFFLENBQUM7UUFHN0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxTQUFTLENBQUM7UUFDdkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxTQUFTLENBQUM7UUFDekMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUM7UUFFdEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUVqRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUVoRSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFDaEIsUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUMxQyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxLQUFhO1FBQ2hDLElBQUcsS0FBSyxJQUFJLElBQUksRUFBQztZQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDNUQ7YUFBTTtZQUNILElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3JEO0lBQ0wsQ0FBQztJQUVELFVBQVUsQ0FBQyxTQUFvQjtRQUUzQixJQUFJLENBQUMsNEJBQTRCLEdBQUcsRUFBRSxDQUFDO1FBRXZDLElBQUksYUFBYSxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRW5ELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXZCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztRQUV0QixJQUFJLEVBQUUsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDO1FBQy9CLElBQUksTUFBTSxHQUF3QyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRTlFLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNoQyxJQUFJLE9BQU8sR0FBZ0MsRUFBRSxDQUFDO1lBQzlDLElBQUksV0FBVyxHQUEwQyxFQUFFLENBQUM7WUFDNUQsSUFBSSxVQUFVLEdBQTBCLEVBQUUsQ0FBQztZQUUzQyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUM1QyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztZQUV4QyxLQUFLLElBQUksS0FBSyxJQUFJLE1BQU0sRUFBRTtnQkFFdEIsSUFBSSx5QkFBaUMsQ0FBQztnQkFDdEMsSUFBSSxlQUF1QixDQUFDO2dCQUM1QixJQUFJLFlBQVksR0FBVyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFFMUQsUUFBUSxLQUFLLENBQUMsS0FBSyxFQUFFO29CQUNqQixLQUFLLE9BQU87d0JBQUUseUJBQXlCLEdBQUcsb0JBQW9CLENBQUM7d0JBQUMsZUFBZSxHQUFHLG9CQUFvQixDQUFDO3dCQUFDLE1BQU07b0JBQzlHLEtBQUssU0FBUzt3QkFBRSx5QkFBeUIsR0FBRyxzQkFBc0IsQ0FBQzt3QkFBQyxlQUFlLEdBQUcsc0JBQXNCLENBQUM7d0JBQUMsTUFBTTtvQkFDcEgsS0FBSyxNQUFNO3dCQUFFLHlCQUF5QixHQUFHLG1CQUFtQixDQUFDO3dCQUFDLGVBQWUsR0FBRyxtQkFBbUIsQ0FBQzt3QkFBQyxNQUFNO2lCQUM5RztnQkFFRCxJQUFJLEtBQUssQ0FBQyxRQUFRLElBQUksSUFBSSxFQUFFO29CQUN4QixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO29CQUM5QixJQUFJLGNBQWMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUM7b0JBQ2pFLHlCQUF5QixHQUFHLHFCQUFxQixHQUFHLGVBQWUsR0FBRyxHQUFHLEdBQUcsY0FBYyxDQUFDO29CQUUzRixJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLEdBQUcsR0FBRyxjQUFjO3dCQUNuRSxlQUFlLEVBQUUsR0FBRyxFQUFFOzRCQUVsQixJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQ2hELE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQ0FDdkMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7Z0NBQ3hCLE9BQU87b0NBQ0gsS0FBSyxFQUFFLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDO29DQUN2RixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO29DQUNwQixnQkFBZ0IsRUFBRSxJQUFJO2lDQUN6QixDQUFBOzRCQUNMLENBQUMsQ0FDQSxDQUFDLENBQUM7d0JBRVAsQ0FBQzt3QkFDRCxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7cUJBQ3hCLENBQUMsQ0FBQTtpQkFHRDtnQkFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBRXhDLElBQUksUUFBK0IsQ0FBQztnQkFDcEMsUUFBUSxLQUFLLENBQUMsS0FBSyxFQUFFO29CQUNqQixLQUFLLE9BQU87d0JBQUUsUUFBUSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO3dCQUFDLE1BQU07b0JBQzVELEtBQUssU0FBUzt3QkFBRSxRQUFRLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUM7d0JBQUMsTUFBTTtvQkFDaEUsS0FBSyxNQUFNO3dCQUFFLFFBQVEsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQzt3QkFBQyxNQUFNO2lCQUM3RDtnQkFFRCxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNULGVBQWUsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUk7b0JBQ3BDLFdBQVcsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU07b0JBQ2xDLGFBQWEsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUk7b0JBQ2xDLFNBQVMsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU07b0JBQ3hELE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSTtvQkFDbkIsUUFBUSxFQUFFLFFBQVE7b0JBQ2xCLFlBQVk7b0JBQ1osa0JBQWtCLEVBQUUsS0FBSyxDQUFDLFFBQVE7aUJBQ3JDLENBQUMsQ0FBQztnQkFFSCxXQUFXLENBQUMsSUFBSSxDQUFDO29CQUNiLEtBQUssRUFBRTt3QkFDSCxlQUFlLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJO3dCQUNwQyxXQUFXLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNO3dCQUNsQyxhQUFhLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJO3dCQUNsQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNO3FCQUMzRDtvQkFDRCxPQUFPLEVBQUU7d0JBQ0wseUJBQXlCLEVBQUUseUJBQXlCO3dCQUNwRCxPQUFPLEVBQUU7NEJBQ0wsUUFBUSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU07NEJBQzlDLEtBQUssRUFBRSxZQUFZO3lCQUN0QjtxQkFDSjtpQkFFSixDQUFDLENBQUM7YUFHTjtZQUVELE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3hELENBQUMsQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUVyRiw0REFBNEQ7WUFDNUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFHNUYsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3BELFNBQVMsR0FBRyxJQUFJLENBQUM7Z0JBQ2pCLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxpQ0FBaUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxjQUFjLENBQUMsQ0FBQztnQkFDckYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzdCLEtBQUssSUFBSSxNQUFNLElBQUksVUFBVSxFQUFFO29CQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDakM7YUFDSjtTQUVKO1FBRUQsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGdFQUFnRSxDQUFDLENBQUMsQ0FBQztTQUNuRztRQUVELElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDO1FBRXpDLE9BQU8sYUFBYSxDQUFDO0lBRXpCLENBQUM7SUFFRCxpQ0FBaUM7UUFFN0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDWixLQUFJLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyw0QkFBNEIsRUFBQztnQkFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDdEQsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN0RjtRQUNMLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUdaLENBQUM7SUFFRCxZQUFZLENBQUMsS0FBWSxFQUFFLENBQVMsRUFBRSxVQUFpQztRQUVuRSxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUN2RCxJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUMsc0VBQXNFLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsU0FBUztZQUM3SCx1Q0FBdUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2hHLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNsQixRQUFRLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDakIsS0FBSyxPQUFPLENBQUMsQ0FBQyxNQUFNO1lBQ3BCLEtBQUssU0FBUztnQkFBRSxRQUFRLEdBQUcsb0RBQW9ELENBQUM7Z0JBQUMsTUFBTTtZQUN2RixLQUFLLE1BQU07Z0JBQUUsUUFBUSxHQUFHLDhDQUE4QyxDQUFDO2dCQUFDLE1BQU07U0FDakY7UUFDRCxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsNkJBQTZCLEdBQUcsUUFBUSxHQUFHLEtBQUssQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUM7UUFFeEYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFMUMsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUU7WUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDL0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztRQUVILFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELFNBQVMsQ0FBQyxDQUFTLEVBQUUsS0FBWTtRQUU3QixJQUFJLElBQUksQ0FBQyxJQUFJLFlBQVksSUFBSSxFQUFFO1lBQzNCLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLHdCQUF3QixFQUFFLEVBQUU7Z0JBQzNELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNoRDtTQUNKO1FBQ0QsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQztRQUM5QixJQUFJLEtBQUssR0FBRztZQUNSLFdBQVcsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLGVBQWUsRUFBRSxRQUFRLENBQUMsSUFBSTtZQUM1RCxTQUFTLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxRQUFRLENBQUMsSUFBSTtTQUM3RSxDQUFDO1FBRUYsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV2RCxJQUFJLFNBQVMsR0FBVyxFQUFFLENBQUM7UUFDM0IsUUFBUSxLQUFLLENBQUMsS0FBSyxFQUFFO1lBQ2pCLEtBQUssT0FBTztnQkFBRSxTQUFTLEdBQUcsZ0JBQWdCLENBQUM7Z0JBQUMsTUFBTTtZQUNsRCxLQUFLLFNBQVM7Z0JBQUUsU0FBUyxHQUFHLGtCQUFrQixDQUFDO2dCQUFDLE1BQU07WUFDdEQsS0FBSyxNQUFNO2dCQUFFLFNBQVMsR0FBRyxlQUFlLENBQUM7Z0JBQUMsTUFBTTtTQUNuRDtRQUdELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ3BGO2dCQUNJLEtBQUssRUFBRSxLQUFLO2dCQUNaLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7YUFFcEM7U0FDSixDQUFDLENBQUM7SUFHUCxDQUFDO0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBXb3Jrc3BhY2UgfSBmcm9tIFwiLi4vLi4vd29ya3NwYWNlL1dvcmtzcGFjZS5qc1wiO1xyXG5pbXBvcnQgeyBFcnJvciB9IGZyb20gXCIuLi8uLi9jb21waWxlci9sZXhlci9MZXhlci5qc1wiO1xyXG5pbXBvcnQgeyBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBNYWluIH0gZnJvbSBcIi4uL01haW4uanNcIjtcclxuaW1wb3J0IHsgTWFpbkJhc2UgfSBmcm9tIFwiLi4vTWFpbkJhc2UuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBFcnJvck1hbmFnZXIge1xyXG5cclxuICAgIG9sZERlY29yYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgb2xkRXJyb3JEZWNvcmF0aW9uczogc3RyaW5nW10gPSBbXTtcclxuICAgICRlcnJvckRpdjogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuXHJcbiAgICAkYnJhY2tldF93YXJuaW5nOiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG5cclxuICAgIG1pbmltYXBDb2xvcjoge1trZXk6IHN0cmluZ106c3RyaW5nIH0gPSB7fTtcclxuXHJcbiAgICBsaWdodEJ1bGJPbkNsaWNrRnVuY3Rpb25MaXN0OiB7Y2xhc3M6IHN0cmluZywgb25DbGlja0Z1bmN0aW9uOiAoKSA9PiB2b2lkLCB0aXRsZTogc3RyaW5nfVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBtYWluOiBNYWluQmFzZSwgcHJpdmF0ZSAkYm90dG9tRGl2OiBKUXVlcnk8SFRNTEVsZW1lbnQ+LCBwcml2YXRlICRtYWluRGl2OiBKUXVlcnk8SFRNTEVsZW1lbnQ+KSB7XHJcbiAgICAgICAgdGhpcy5taW5pbWFwQ29sb3JbXCJlcnJvclwiXSA9IFwiI2JjMTYxNlwiO1xyXG4gICAgICAgIHRoaXMubWluaW1hcENvbG9yW1wid2FybmluZ1wiXSA9IFwiI2NjYTcwMFwiO1xyXG4gICAgICAgIHRoaXMubWluaW1hcENvbG9yW1wiaW5mb1wiXSA9IFwiIzc1YmVmZlwiO1xyXG5cclxuICAgICAgICB0aGlzLiRicmFja2V0X3dhcm5pbmcgPSAkbWFpbkRpdi5maW5kKFwiLmpvX3BhcmVudGhlc2lzX3dhcm5pbmdcIik7XHJcblxyXG4gICAgICAgIHRoaXMuJGJyYWNrZXRfd2FybmluZy5hdHRyKCd0aXRsZScsICdLbGFtbWVyYWxhcm0hJyk7XHJcbiAgICAgICAgdGhpcy4kYnJhY2tldF93YXJuaW5nLmNoaWxkcmVuKCkuYXR0cigndGl0bGUnLCAnS2xhbW1lcmFsYXJtIScpO1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgJG1haW5EaXYuZmluZChcIi5qb19wd191bmRvXCIpLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZWRpdG9yID0gdGhhdC5tYWluLmdldE1vbmFjb0VkaXRvcigpO1xyXG4gICAgICAgICAgICBlZGl0b3IudHJpZ2dlcihcIi5cIiwgXCJ1bmRvXCIsIHt9KTtcclxuICAgICAgICB9KS5hdHRyKCd0aXRsZScsICdVbmRvJyk7XHJcbiAgICB9XHJcblxyXG4gICAgc2hvd1BhcmVudGhlc2lzV2FybmluZyhlcnJvcjogc3RyaW5nKXtcclxuICAgICAgICBpZihlcnJvciAhPSBudWxsKXtcclxuICAgICAgICAgICAgdGhpcy4kYnJhY2tldF93YXJuaW5nLmNzcyhcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xyXG4gICAgICAgICAgICB0aGlzLiRicmFja2V0X3dhcm5pbmcuZmluZChcIi5qb19wd19oZWFkaW5nXCIpLnRleHQoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGJyYWNrZXRfd2FybmluZy5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzaG93RXJyb3JzKHdvcmtzcGFjZTogV29ya3NwYWNlKTogTWFwPE1vZHVsZSwgbnVtYmVyPiB7XHJcblxyXG4gICAgICAgIHRoaXMubGlnaHRCdWxiT25DbGlja0Z1bmN0aW9uTGlzdCA9IFtdO1xyXG5cclxuICAgICAgICBsZXQgZXJyb3JDb3VudE1hcDogTWFwPE1vZHVsZSwgbnVtYmVyPiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICAgICAgdGhpcy4kZXJyb3JEaXYgPSB0aGlzLiRib3R0b21EaXYuZmluZCgnLmpvX3RhYnM+LmpvX2Vycm9yc1RhYicpO1xyXG4gICAgICAgIHRoaXMuJGVycm9yRGl2LmVtcHR5KCk7XHJcblxyXG4gICAgICAgIGxldCBoYXNFcnJvcnMgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgbGV0IG1zID0gd29ya3NwYWNlLm1vZHVsZVN0b3JlO1xyXG4gICAgICAgIGxldCBlZGl0b3I6IG1vbmFjby5lZGl0b3IuSVN0YW5kYWxvbmVDb2RlRWRpdG9yID0gdGhpcy5tYWluLmdldE1vbmFjb0VkaXRvcigpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtIG9mIG1zLmdldE1vZHVsZXMoZmFsc2UpKSB7XHJcbiAgICAgICAgICAgIGxldCBtYXJrZXJzOiBtb25hY28uZWRpdG9yLklNYXJrZXJEYXRhW10gPSBbXTtcclxuICAgICAgICAgICAgbGV0IGRlY29yYXRpb25zOiBtb25hY28uZWRpdG9yLklNb2RlbERlbHRhRGVjb3JhdGlvbltdID0gW107XHJcbiAgICAgICAgICAgIGxldCAkZXJyb3JMaXN0OiBKUXVlcnk8SFRNTEVsZW1lbnQ+W10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGxldCBlcnJvcnMgPSBtLmdldFNvcnRlZEFuZEZpbHRlcmVkRXJyb3JzKCk7XHJcbiAgICAgICAgICAgIGVycm9yQ291bnRNYXAuc2V0KG0sIG0uZ2V0RXJyb3JDb3VudCgpKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGVycm9yIG9mIGVycm9ycykge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBsaW5lc0RlY29yYXRpb25zQ2xhc3NOYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgICAgICAgICBsZXQgYm9yZGVyTGVmdENsYXNzOiBzdHJpbmc7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWluaW1hcENvbG9yOiBzdHJpbmcgPSB0aGlzLm1pbmltYXBDb2xvcltlcnJvci5sZXZlbF07XHJcblxyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChlcnJvci5sZXZlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJlcnJvclwiOiBsaW5lc0RlY29yYXRpb25zQ2xhc3NOYW1lID0gJ2pvX3JldmVhbEVycm9yTGluZSc7IGJvcmRlckxlZnRDbGFzcyA9IFwiam9fYm9yZGVyTGVmdEVycm9yXCI7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ3YXJuaW5nXCI6IGxpbmVzRGVjb3JhdGlvbnNDbGFzc05hbWUgPSAnam9fcmV2ZWFsV2FybmluZ0xpbmUnOyBib3JkZXJMZWZ0Q2xhc3MgPSBcImpvX2JvcmRlckxlZnRXYXJuaW5nXCI7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJpbmZvXCI6IGxpbmVzRGVjb3JhdGlvbnNDbGFzc05hbWUgPSAnam9fcmV2ZWFsSW5mb0xpbmUnOyBib3JkZXJMZWZ0Q2xhc3MgPSBcImpvX2JvcmRlckxlZnRJbmZvXCI7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlcnJvci5xdWlja0ZpeCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHF1aWNrRml4ID0gZXJyb3IucXVpY2tGaXg7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGxpZ2h0QnVsYkNsYXNzID0gXCJsYl9cIiArIE1hdGgudHJ1bmMoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVzRGVjb3JhdGlvbnNDbGFzc05hbWUgPSAnam9feWVsbG93TGlnaHRCdWxiICcgKyBib3JkZXJMZWZ0Q2xhc3MgKyBcIiBcIiArIGxpZ2h0QnVsYkNsYXNzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZ2h0QnVsYk9uQ2xpY2tGdW5jdGlvbkxpc3QucHVzaCh7Y2xhc3M6ICcuJyArIGxpZ2h0QnVsYkNsYXNzLCBcclxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246ICgpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlZGl0cyA9IHF1aWNrRml4LmVkaXRzUHJvdmlkZXIobS5tb2RlbC51cmkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0b3IuZXhlY3V0ZUVkaXRzKFwiXCIsIGVkaXRzLm1hcCgoZWRpdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHIgPSBlZGl0LmVkaXQucmFuZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiBuZXcgbW9uYWNvLlJhbmdlKHIuc3RhcnRMaW5lTnVtYmVyLCByLnN0YXJ0Q29sdW1uLCByLmVuZExpbmVOdW1iZXIsIHIuZW5kQ29sdW1uKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBlZGl0LmVkaXQudGV4dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JjZU1vdmVNYXJrZXJzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHF1aWNrRml4LnRpdGxlXHJcbiAgICAgICAgICAgICAgICB9KVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzRXJyb3IoZXJyb3IsIG0sICRlcnJvckxpc3QpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBzZXZlcml0eTogbW9uYWNvLk1hcmtlclNldmVyaXR5O1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChlcnJvci5sZXZlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJlcnJvclwiOiBzZXZlcml0eSA9IG1vbmFjby5NYXJrZXJTZXZlcml0eS5FcnJvcjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIndhcm5pbmdcIjogc2V2ZXJpdHkgPSBtb25hY28uTWFya2VyU2V2ZXJpdHkuV2FybmluZzsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImluZm9cIjogc2V2ZXJpdHkgPSBtb25hY28uTWFya2VyU2V2ZXJpdHkuSW5mbzsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbWFya2Vycy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFydExpbmVOdW1iZXI6IGVycm9yLnBvc2l0aW9uLmxpbmUsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRDb2x1bW46IGVycm9yLnBvc2l0aW9uLmNvbHVtbixcclxuICAgICAgICAgICAgICAgICAgICBlbmRMaW5lTnVtYmVyOiBlcnJvci5wb3NpdGlvbi5saW5lLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuZENvbHVtbjogZXJyb3IucG9zaXRpb24uY29sdW1uICsgZXJyb3IucG9zaXRpb24ubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLnRleHQsXHJcbiAgICAgICAgICAgICAgICAgICAgc2V2ZXJpdHk6IHNldmVyaXR5LFxyXG4gICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgICAgIHJlbGF0ZWRJbmZvcm1hdGlvbjogZXJyb3IucXVpY2tGaXhcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlY29yYXRpb25zLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0TGluZU51bWJlcjogZXJyb3IucG9zaXRpb24ubGluZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRDb2x1bW46IGVycm9yLnBvc2l0aW9uLmNvbHVtbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kTGluZU51bWJlcjogZXJyb3IucG9zaXRpb24ubGluZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kQ29sdW1uOiBlcnJvci5wb3NpdGlvbi5jb2x1bW4gKyBlcnJvci5wb3NpdGlvbi5sZW5ndGhcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZXNEZWNvcmF0aW9uc0NsYXNzTmFtZTogbGluZXNEZWNvcmF0aW9uc0NsYXNzTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWluaW1hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG1vbmFjby5lZGl0b3IuTWluaW1hcFBvc2l0aW9uLklubGluZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiBtaW5pbWFwQ29sb3JcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBtb25hY28uZWRpdG9yLnNldE1vZGVsTWFya2VycyhtLm1vZGVsLCAndGVzdCcsIG1hcmtlcnMpO1xyXG4gICAgICAgICAgICBtLm9sZEVycm9yRGVjb3JhdGlvbnMgPSBtLm1vZGVsLmRlbHRhRGVjb3JhdGlvbnMobS5vbGRFcnJvckRlY29yYXRpb25zLCBkZWNvcmF0aW9ucyk7XHJcblxyXG4gICAgICAgICAgICAvLyBkZWNvcmF0aW9ucyB1c2VkIHdoZW4gdXNlciBjbGlja3Mgb24gZXJyb3IgaW4gZXJyb3ItbGlzdDpcclxuICAgICAgICAgICAgdGhpcy5vbGREZWNvcmF0aW9ucyA9IHRoaXMubWFpbi5nZXRNb25hY29FZGl0b3IoKS5kZWx0YURlY29yYXRpb25zKHRoaXMub2xkRGVjb3JhdGlvbnMsIFtdKTtcclxuXHJcblxyXG4gICAgICAgICAgICBpZiAoJGVycm9yTGlzdC5sZW5ndGggPiAwICYmIHRoaXMuJGVycm9yRGl2Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGhhc0Vycm9ycyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgJGZpbGUgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb19lcnJvci1maWxlbmFtZVwiPicgKyBtLmZpbGUubmFtZSArICcmbmJzcDs8L2Rpdj4nKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVycm9yRGl2LmFwcGVuZCgkZmlsZSk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCAkZXJyb3Igb2YgJGVycm9yTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGVycm9yRGl2LmFwcGVuZCgkZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFoYXNFcnJvcnMgJiYgdGhpcy4kZXJyb3JEaXYubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLiRlcnJvckRpdi5hcHBlbmQoalF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fbm9FcnJvck1lc3NhZ2VcIj5LZWluZSBGZWhsZXIgZ2VmdW5kZW4gOi0pPC9kaXY+JykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yZWdpc3RlckxpZ2h0YnVsYk9uQ2xpY2tGdW5jdGlvbnMoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGVycm9yQ291bnRNYXA7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJlZ2lzdGVyTGlnaHRidWxiT25DbGlja0Z1bmN0aW9ucygpIHtcclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBmb3IobGV0IGxvY2Ygb2YgdGhhdC5saWdodEJ1bGJPbkNsaWNrRnVuY3Rpb25MaXN0KXtcclxuICAgICAgICAgICAgICAgICAgICBqUXVlcnkobG9jZi5jbGFzcykub2ZmKCdjbGljaycsIGxvY2Yub25DbGlja0Z1bmN0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBqUXVlcnkobG9jZi5jbGFzcykub24oJ2NsaWNrJywgbG9jZi5vbkNsaWNrRnVuY3Rpb24pLmF0dHIoJ3RpdGxlJywgbG9jZi50aXRsZSk7XHJcbiAgICAgICAgICAgIH0gICAgICAgICAgICBcclxuICAgICAgICB9LCA4MDApO1xyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc0Vycm9yKGVycm9yOiBFcnJvciwgbTogTW9kdWxlLCAkZXJyb3JEaXZzOiBKUXVlcnk8SFRNTEVsZW1lbnQ+W10pIHtcclxuXHJcbiAgICAgICAgbGV0ICRkaXYgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb19lcnJvci1saW5lXCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgbGV0ICRsaW5lQ29sdW1uID0galF1ZXJ5KCc8c3BhbiBjbGFzcz1cImpvX2Vycm9yLXBvc2l0aW9uXCI+W1ombmJzcDs8c3BhbiBjbGFzcz1cImpvX2xpbmVjb2x1bW5cIj4nICsgZXJyb3IucG9zaXRpb24ubGluZSArICc8L3NwYW4+JyArXHJcbiAgICAgICAgICAgICcgU3AmbmJzcDs8c3BhbiBjbGFzcz1cImpvX2xpbmVjb2x1bW5cIj4nICsgZXJyb3IucG9zaXRpb24uY29sdW1uICsgJzwvc3Bhbj5dPC9zcGFuPjombmJzcDsnKTtcclxuICAgICAgICBsZXQgY2F0ZWdvcnkgPSBcIlwiO1xyXG4gICAgICAgIHN3aXRjaCAoZXJyb3IubGV2ZWwpIHtcclxuICAgICAgICAgICAgY2FzZSBcImVycm9yXCI6IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwid2FybmluZ1wiOiBjYXRlZ29yeSA9ICc8c3BhbiBjbGFzcz1cImpvX3dhcm5pbmdfY2F0ZWdvcnlcIj5XYXJudW5nOiA8L3NwYW4+JzsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJpbmZvXCI6IGNhdGVnb3J5ID0gJzxzcGFuIGNsYXNzPVwiam9faW5mb19jYXRlZ29yeVwiPkluZm86IDwvc3Bhbj4nOyBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0ICRtZXNzYWdlID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fZXJyb3ItdGV4dFwiPicgKyBjYXRlZ29yeSArIGVycm9yLnRleHQgKyBcIjwvZGl2PlwiKTtcclxuXHJcbiAgICAgICAgJGRpdi5hcHBlbmQoJGxpbmVDb2x1bW4pLmFwcGVuZCgkbWVzc2FnZSk7XHJcblxyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuICAgICAgICAkZGl2Lm9uKFwibW91c2Vkb3duXCIsIChldikgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLiRlcnJvckRpdi5maW5kKCcuam9fZXJyb3ItbGluZScpLnJlbW92ZUNsYXNzKCdqb19hY3RpdmUnKTtcclxuICAgICAgICAgICAgJGRpdi5hZGRDbGFzcygnam9fYWN0aXZlJyk7XHJcbiAgICAgICAgICAgIHRoYXQuc2hvd0Vycm9yKG0sIGVycm9yKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJGVycm9yRGl2cy5wdXNoKCRkaXYpO1xyXG4gICAgfVxyXG5cclxuICAgIHNob3dFcnJvcihtOiBNb2R1bGUsIGVycm9yOiBFcnJvcikge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5tYWluIGluc3RhbmNlb2YgTWFpbikge1xyXG4gICAgICAgICAgICBpZiAobSAhPSB0aGlzLm1haW4ucHJvamVjdEV4cGxvcmVyLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW4uZWRpdG9yLmRvbnREZXRlY3RMYXN0Q2hhbmdlKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW4ucHJvamVjdEV4cGxvcmVyLnNldE1vZHVsZUFjdGl2ZShtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgcG9zaXRpb24gPSBlcnJvci5wb3NpdGlvbjtcclxuICAgICAgICBsZXQgcmFuZ2UgPSB7XHJcbiAgICAgICAgICAgIHN0YXJ0Q29sdW1uOiBwb3NpdGlvbi5jb2x1bW4sIHN0YXJ0TGluZU51bWJlcjogcG9zaXRpb24ubGluZSxcclxuICAgICAgICAgICAgZW5kQ29sdW1uOiBwb3NpdGlvbi5jb2x1bW4gKyBwb3NpdGlvbi5sZW5ndGgsIGVuZExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmVcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkucmV2ZWFsUmFuZ2VJbkNlbnRlcihyYW5nZSk7XHJcblxyXG4gICAgICAgIGxldCBjbGFzc05hbWU6IHN0cmluZyA9IFwiXCI7XHJcbiAgICAgICAgc3dpdGNoIChlcnJvci5sZXZlbCkge1xyXG4gICAgICAgICAgICBjYXNlIFwiZXJyb3JcIjogY2xhc3NOYW1lID0gXCJqb19yZXZlYWxFcnJvclwiOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcIndhcm5pbmdcIjogY2xhc3NOYW1lID0gXCJqb19yZXZlYWxXYXJuaW5nXCI7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiaW5mb1wiOiBjbGFzc05hbWUgPSBcImpvX3JldmVhbEluZm9cIjsgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5vbGREZWNvcmF0aW9ucyA9IHRoaXMubWFpbi5nZXRNb25hY29FZGl0b3IoKS5kZWx0YURlY29yYXRpb25zKHRoaXMub2xkRGVjb3JhdGlvbnMsIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHJhbmdlLFxyXG4gICAgICAgICAgICAgICAgb3B0aW9uczogeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXSk7XHJcblxyXG5cclxuICAgIH1cclxuXHJcbn0iXX0=