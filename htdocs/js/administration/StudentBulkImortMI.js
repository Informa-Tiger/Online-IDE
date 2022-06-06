import { AdminMenuItem } from "./AdminMenuItem.js";
import { ajax } from "../communication/AjaxHelper.js";
import { setSelectItems, getSelectedObject } from "../tools/HtmlTools.js";
export class StudentBulkImportMI extends AdminMenuItem {
    constructor(administration) {
        super(administration);
        this.studentGridName = "bulkImportStudentsGrid";
    }
    checkPermission(user) {
        return user.is_teacher;
    }
    getButtonIdentifier() {
        return "Schülerdatenimport";
    }
    onMenuButtonPressed($mainHeading, $tableLeft, $tableRight, $mainFooter) {
        this.$tableLeft = $tableLeft;
        this.$tableRight = $tableRight;
        $tableRight.css('flex', '2');
        let that = this;
        if (w2ui[this.studentGridName] != null) {
            let grid = w2ui[this.studentGridName];
            grid.render();
        }
        else {
            $tableRight.w2grid({
                name: this.studentGridName,
                header: 'Schüler/innen',
                selectType: "cell",
                show: {
                    header: true,
                    toolbar: true,
                    toolbarDelete: true,
                    footer: true,
                    selectColumn: true,
                    toolbarSearch: false
                },
                toolbar: {
                    items: []
                },
                recid: "id",
                columns: [
                    { field: 'id', caption: 'ID', size: '20px', sortable: true, hidden: true },
                    { field: 'rufname', caption: 'Rufname', size: '25%', sortable: true, resizable: true, editable: { type: 'text' } },
                    { field: 'familienname', caption: 'Familienname', size: '25%', sortable: true, resizable: true, editable: { type: 'text' } },
                    { field: 'username', caption: 'Benutzername', size: '25%', sortable: true, resizable: true, editable: { type: 'text' } },
                    { field: 'password', caption: 'Passwort', size: '25%', sortable: false, editable: { type: 'text' } }
                ],
                searches: [
                    { field: 'username', label: 'Benutzername', type: 'text' },
                    { field: 'rufname', label: 'Rufname', type: 'text' },
                    { field: 'familienname', label: 'Familienname', type: 'text' }
                ],
                sortData: [{ field: 'klasse', direction: 'asc' }, { field: 'familienname', direction: 'asc' }, { field: 'rufname', direction: 'asc' }],
                onDelete: function (event) {
                    if (!event.force || event.isStopped)
                        return;
                    let studentsGrid = w2ui[that.studentGridName];
                    let recIds = studentsGrid.getSelection().map((sel) => sel["recid"]).filter((value, index, array) => array.indexOf(value) === index);
                    event.onComplete = () => {
                        recIds.forEach((id) => studentsGrid.remove(id + ""));
                    };
                }
            });
        }
        this.showStep("Step 1 Paste");
    }
    showStep(step) {
        this.$tableLeft.empty();
        switch (step) {
            case "Step 1 Paste":
                this.enableGrid(false);
                this.showStep1Paste();
                break;
            case "Step 2 check":
                this.enableGrid(true);
                this.showStep2Check();
                break;
            case "Step 3 import":
                this.enableGrid(false);
                this.showStep3Import();
                break;
            case "Step 4 print":
                this.enableGrid(false);
                this.showStep4Print();
                break;
        }
        this.step = step;
    }
    showStep4Print() {
        let description = `Die Schüler/innen wurden erfolgreich angelegt und der Klasse ${this.selectedClass.name} zugeordnet.
        Eine Liste der Zugangsdaten zum Ausdrucken erhalten Sie durch Klick auf den Button "Drucken...".
        `;
        this.$tableLeft.append($('<div class="jo_bulk_heading">Schritt 4: Fertig!</div>'));
        let $description = $(`<div class="jo_bulk_description"></div>`);
        $description.html(description);
        this.$tableLeft.append($description);
        let $buttondiv = $(`<div class="jo_bulk_buttondiv" style="justify-content: space-between"></div>`);
        this.$tableLeft.append($buttondiv);
        let $buttonPrint = $(`<div class="jo_buttonContinue jo_button jo_active">Drucken...</div>`);
        $buttondiv.append($buttonPrint);
        let $buttonWriteUsers = $(`<div class="jo_buttonContinue jo_button jo_active">OK</div>`);
        $buttondiv.append($buttonWriteUsers);
        let $printDiv = $('#print');
        $printDiv.empty();
        this.usersToWrite.forEach((user) => {
            $printDiv.append(`<div style="page-break-inside: avoid;">
            <div><b>URL:</b> https://www.online-ide.de</div>
            <div><b>Name:</b> ${user.rufname} ${user.familienname}</div>
            <div><b>Klasse:</b> ${this.selectedClass.name}</div>
            <div><b>Benutzername:</b> ${user.username}</div>
            <div style="margin-bottom: 3em"><b>Passwort:</b> ${user.password}</div>
            </div>`);
        });
        $buttonPrint.on('click', () => {
            $('#outer').css('display', 'none');
            window.print();
            $('#outer').css('display', '');
        });
        $buttonWriteUsers.on('click', () => {
            let studentGrid = w2ui[this.studentGridName];
            studentGrid.clear();
            this.showStep("Step 1 Paste");
        });
    }
    showStep3Import() {
        let description = `Die Schüler/innen können jetzt angelegt und der Klasse ${this.selectedClass.name} zugeordnet werden.`;
        this.$tableLeft.append($('<div class="jo_bulk_heading">Schritt 3: Benutzer anlegen</div>'));
        let $description = $(`<div class="jo_bulk_description"></div>`);
        $description.html(description);
        this.$tableLeft.append($description);
        let $buttondiv = $(`<div class="jo_bulk_buttondiv" style="justify-content: space-between"></div>`);
        this.$tableLeft.append($buttondiv);
        let $buttonBack = $(`<div class="jo_buttonContinue jo_button jo_active">Zurück</div>`);
        $buttondiv.append($buttonBack);
        let $buttonWriteUsers = $(`<div class="jo_buttonWriteUsers jo_button jo_active">Benutzer anlegen</div>`);
        $buttondiv.append($buttonWriteUsers);
        this.$protocol = $('<div class="jo_bulk_protocol"></div>');
        this.$tableLeft.append(this.$protocol);
        this.$protocol.hide();
        $buttonBack.on('click', () => {
            this.showStep("Step 2 check");
        });
        $buttonWriteUsers.on('click', () => {
            $buttonWriteUsers.removeClass('jo_active');
            this.$protocol.show();
            this.$protocol.html("<div>Die Benutzer werden angelegt. Bitte warten...</div>");
            let request = {
                onlyCheckUsernames: false,
                schule_id: this.administration.userData.schule_id,
                users: this.usersToWrite
            };
            ajax('bulkCreateUsers', request, (response) => {
                this.showStep("Step 4 print");
            }, (message) => {
                alert("Fehler: " + message);
                this.showStep("Step 2 check");
            });
        });
    }
    showStep2Check() {
        let description = `Bitte wählen Sie im Auswahlfeld die Klasse aus, in die die Schülerdaten importiert werden sollen. Sie können die Daten in der Tabelle noch bearbeiten, bevor Sie sie zur Überprüfung (noch kein Import!) absenden.`;
        this.$tableLeft.append($('<div class="jo_bulk_heading">Schritt 2: Daten überprüfen</div>'));
        let $description = $(`<div class="jo_bulk_description"></div>`);
        $description.html(description);
        this.$tableLeft.append($description);
        let request = {
            school_id: this.administration.userData.schule_id
        };
        let $select = $('<select class="jo_bulk_chooseClass"></select>');
        this.$tableLeft.append($select);
        ajax('getClassesData', request, (response) => {
            // cd.id, cd.name
            setSelectItems($select, response.classDataList.map((cd) => {
                return {
                    caption: cd.name,
                    value: cd.id,
                    object: cd
                };
            }));
        });
        let $buttondiv = $(`<div class="jo_bulk_buttondiv" style="justify-content: space-between"></div>`);
        this.$tableLeft.append($buttondiv);
        let $buttonBack = $(`<div class="jo_buttonContinue jo_button jo_active">Zurück</div>`);
        $buttondiv.append($buttonBack);
        let $buttonContinue = $(`<div class="jo_buttonContinue jo_button jo_active">Daten überprüfen...</div>`);
        $buttondiv.append($buttonContinue);
        this.$tableLeft.append($('<div class="jo_bulk_heading_protocol">Fehlerprotokoll</div>'));
        this.$protocol = $('<div class="jo_bulk_protocol"></div>');
        this.$tableLeft.append(this.$protocol);
        $buttonBack.on('click', () => {
            this.showStep("Step 1 Paste");
        });
        $buttonContinue.on('click', () => {
            this.selectedClass = getSelectedObject($select);
            this.checkData(this.selectedClass);
        });
    }
    checkData(classData) {
        let studentGrid = w2ui[this.studentGridName];
        studentGrid.mergeChanges();
        this.usersToWrite = studentGrid.records;
        let request = {
            onlyCheckUsernames: true,
            schule_id: this.administration.userData.schule_id,
            users: this.usersToWrite
        };
        ajax('bulkCreateUsers', request, (response) => {
            if (response.namesAlreadyUsed.length == 0) {
                for (let user of this.usersToWrite) {
                    user.schule_id = this.administration.userData.schule_id;
                    user.klasse_id = classData.id;
                    user.is_admin = false;
                    user.is_schooladmin = false;
                    user.is_teacher = false;
                }
                this.showStep("Step 3 import");
            }
            else {
                this.$protocol.html('Diese Benutzernamen sind schon anderen Benutzern zugeordnet und können daher nicht verwendet werden: <br>' + response.namesAlreadyUsed.join(", "));
            }
        }, (message) => {
            alert("Fehler: " + message);
        });
        return false;
    }
    showStep1Paste() {
        let description = `
        Zum Importieren wird eine Tabelle mit den Spalten Rufname, Familienname, Username und Passwort benötigt, 
        wobei die Daten in den Zellen jeweils mit Tab-Zeichen getrennt sind. Sie erhalten dieses Format beispielsweise, 
        indem Sie eine Tabelle in Excel in die Zwischenablage kopieren. <br> Falls die erste Zeile Spaltenköpfe mit
        den korrekten Bezeichnern (Rufname, Familienname, Username, Passwort) enthält, kümmert sich der Import-Algorithmus
        um die richtige Reihenfolge und blendet ggf. auch überflüssige Spalten aus. <br>
        Bitte fügen Sie den Inhalt der Tabelle per Copy-Paste in dieses Eingabefeld ein:`;
        this.$tableLeft.append($('<div class="jo_bulk_heading">Schritt 1: Daten einlesen</div>'));
        let $description = $(`<div class="jo_bulk_description"></div>`);
        this.$tableLeft.append($description);
        // this.$tableLeft.append(description);
        this.$importTextArea = $(`<textarea class="jo_bulk_importarea"></textarea>`);
        this.$tableLeft.append(this.$importTextArea);
        this.$importTextArea.html('');
        let $buttondiv = $(`<div class="jo_bulk_buttondiv" style="justify-content: flex-end"></div>`);
        this.$tableLeft.append($buttondiv);
        let $buttonContinue = $(`<div class="jo_buttonContinue jo_button jo_active">Weiter</div>`);
        $buttondiv.append($buttonContinue);
        $buttonContinue.on('click', () => {
            this.parseText(this.$importTextArea.val());
            this.showStep("Step 2 check");
        });
        // this.$tableLeft.append($('<div class="jo_bulk_heading_protocol">Importprotokoll</div>'));
        // this.$protocol = $('<div class="jo_bulk_protocol"></div>');
        // this.$tableLeft.append(this.$protocol);
        $description.html(description);
    }
    parseText(text) {
        // this.$protocol.empty();
        let lines1 = text.split(/\r?\n/);
        let lines = [];
        for (let line1 of lines1) {
            if (line1.length > 6) {
                let columns = line1.split(/\t/);
                lines.push(columns);
            }
        }
        let cm = this.getColumnMapping(lines);
        let columnMapping = cm.columnMapping;
        let userData = this.makeUserData(lines, columnMapping);
        if (userData.length > 0) {
            let studentsGrid = w2ui[this.studentGridName];
            studentsGrid.clear();
            studentsGrid.add(userData);
            studentsGrid.refresh();
        }
    }
    makeUserData(lines, columnMapping) {
        let userData = [];
        let id = 1;
        for (let line of lines) {
            userData.push({
                id: id++,
                familienname: line[columnMapping["familienname"]],
                rufname: line[columnMapping["rufname"]],
                username: line[columnMapping["username"]].trim(),
                password: line[columnMapping["passwort"]].trim(),
                is_admin: false,
                is_schooladmin: false,
                is_teacher: false,
                klasse_id: -1,
                schule_id: -1
            });
        }
        return userData;
    }
    getColumnMapping(lines) {
        let columnHeaders = ["rufname", "familienname", "username", "passwort"];
        let columnMapping = {
            "rufname": 0,
            "familienname": 1,
            "username": 2,
            "passwort": 3
        };
        if (lines.length < 2) {
            // this.$protocol.append($(`<div>In den Daten sind weniger als zwei Zeilen zu finden. Es wird daher nicht nach einer Kopfzeile gesucht.</div>`))
            return { columnMapping: columnMapping, line1HasHeaders: false };
        }
        let missingHeaders = [];
        let headersFound = [];
        let maxColumnIndex = 0;
        for (let header of columnHeaders) {
            let index = lines[0].findIndex(column => column.toLocaleLowerCase() == header.toLocaleLowerCase());
            if (index == -1 && header.toLocaleLowerCase() == "passwort") {
                index = lines[0].findIndex(column => column.toLocaleLowerCase() == "password");
            }
            if (index == -1) {
                missingHeaders.push(header);
            }
            else {
                columnMapping[header] = index;
                if (index > maxColumnIndex)
                    maxColumnIndex = index;
                headersFound.push(header);
            }
        }
        // this.$protocol.append($(`<div>In der 1. Zeile wurden folgende Spaltenköpfe gefunden: ${headersFound.join(", ")}</div>`));
        // if (missingHeaders.length > 0)
        //     this.$protocol.append($(`<div class="jo_bulk_error">Nicht gefunden wurden: ${missingHeaders.join(", ")}</div>`));
        let line1HasHeaders = missingHeaders.length < 2;
        let lineNumber = 1;
        if (line1HasHeaders) {
            lines.splice(0, 1);
            lineNumber++;
        }
        for (let line of lines) {
            if (line.length < maxColumnIndex + 1) {
                // this.$protocol.append($(`<div class="jo_bulk_error">In Zeile ${lineNumber} gibt es nur ${line.length} Spalten. Benötigt werden aber ${maxColumnIndex + 1} Spalten.</div>`));
            }
            lineNumber++;
        }
        return { columnMapping: columnMapping, line1HasHeaders: line1HasHeaders };
    }
    enableGrid(enabled) {
        let studentGrid = w2ui[this.studentGridName];
        if (enabled) {
            studentGrid.unlock();
        }
        else {
            studentGrid.lock("", false);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3R1ZGVudEJ1bGtJbW9ydE1JLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudC9hZG1pbmlzdHJhdGlvbi9TdHVkZW50QnVsa0ltb3J0TUkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRW5ELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUt0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFVMUUsTUFBTSxPQUFPLG1CQUFvQixTQUFRLGFBQWE7SUFjbEQsWUFBWSxjQUE4QjtRQUN0QyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7UUFOMUIsb0JBQWUsR0FBRyx3QkFBd0IsQ0FBQztJQU8zQyxDQUFDO0lBRUQsZUFBZSxDQUFDLElBQWM7UUFDMUIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQzNCLENBQUM7SUFFRCxtQkFBbUI7UUFDZixPQUFPLG9CQUFvQixDQUFDO0lBQ2hDLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxZQUFpQyxFQUFFLFVBQStCLEVBQ2xGLFdBQWdDLEVBQUUsV0FBZ0M7UUFHbEUsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFHL0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFN0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFDcEMsSUFBSSxJQUFJLEdBQWdCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDbkQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ2pCO2FBQU07WUFDSCxXQUFXLENB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QUssR0FBRyxjQUFjO29CQUFFLGNBQWMsR0FBRyxLQUFLLENBQUM7Z0JBQ25ELFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDN0I7U0FDSjtRQUVELDRIQUE0SDtRQUM1SCxpQ0FBaUM7UUFDakMsd0hBQXdIO1FBRXhILElBQUksZUFBZSxHQUFHLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBRWhELElBQUksVUFBVSxHQUFXLENBQUMsQ0FBQztRQUMzQixJQUFJLGVBQWUsRUFBRTtZQUNqQixLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNuQixVQUFVLEVBQUUsQ0FBQztTQUNoQjtRQUVELEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3BCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLEdBQUcsQ0FBQyxFQUFFO2dCQUNsQywrS0FBK0s7YUFDbEw7WUFDRCxVQUFVLEVBQUUsQ0FBQztTQUNoQjtRQUVELE9BQU8sRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsQ0FBQTtJQUU3RSxDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQWdCO1FBQ3ZCLElBQUksV0FBVyxHQUFnQixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzFELElBQUksT0FBTyxFQUFFO1lBQ1QsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ3hCO2FBQU07WUFDSCxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUMvQjtJQUNMLENBQUM7Q0FHSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFkbWluTWVudUl0ZW0gfSBmcm9tIFwiLi9BZG1pbk1lbnVJdGVtLmpzXCI7XHJcbmltcG9ydCB7IFVzZXJEYXRhLCBDbGFzc0RhdGEsIENSVURDbGFzc1JlcXVlc3QsIENSVURVc2VyUmVxdWVzdCwgQ1JVRFJlc3BvbnNlLCBHZXRDbGFzc2VzRGF0YVJlcXVlc3QsIEdldENsYXNzZXNEYXRhUmVzcG9uc2UsIENoYW5nZUNsYXNzT2ZTdHVkZW50c1JlcXVlc3QsIENoYW5nZUNsYXNzT2ZTdHVkZW50c1Jlc3BvbnNlLCBCdWxrQ3JlYXRlVXNlcnNSZXF1ZXN0LCBCdWxrQ3JlYXRlVXNlcnNSZXNwb25zZSB9IGZyb20gXCIuLi9jb21tdW5pY2F0aW9uL0RhdGEuanNcIjtcclxuaW1wb3J0IHsgYWpheCB9IGZyb20gXCIuLi9jb21tdW5pY2F0aW9uL0FqYXhIZWxwZXIuanNcIjtcclxuaW1wb3J0IHsgQWRtaW5pc3RyYXRpb24gfSBmcm9tIFwiLi9BZG1pbmlzdHJhdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBUZWFjaGVyc1dpdGhDbGFzc2VzTUkgfSBmcm9tIFwiLi9UZWFjaGVyc1dpdGhDbGFzc2VzLmpzXCI7XHJcbmltcG9ydCB7IFBhc3N3b3JkUG9wdXAgfSBmcm9tIFwiLi9QYXNzd29yZFBvcHVwLmpzXCI7XHJcbmltcG9ydCB7IFVzZXJNZW51IH0gZnJvbSBcIi4uL21haW4vZ3VpL1VzZXJNZW51LmpzXCI7XHJcbmltcG9ydCB7IHNldFNlbGVjdEl0ZW1zLCBnZXRTZWxlY3RlZE9iamVjdCB9IGZyb20gXCIuLi90b29scy9IdG1sVG9vbHMuanNcIjtcclxuXHJcbmRlY2xhcmUgdmFyIHcycHJvbXB0OiBhbnk7XHJcbmRlY2xhcmUgdmFyIHcyYWxlcnQ6IGFueTtcclxuXHJcbnR5cGUgU3RlcCA9IFwiU3RlcCAxIFBhc3RlXCIgfCBcIlN0ZXAgMiBjaGVja1wiIHwgXCJTdGVwIDMgaW1wb3J0XCIgfCBcIlN0ZXAgNCBwcmludFwiO1xyXG5cclxudHlwZSBDb2x1bW4gPSBcInJ1Zm5hbWVcIiB8IFwiZmFtaWxpZW5uYW1lXCIgfCBcInVzZXJuYW1lXCIgfCBcInBhc3N3b3J0XCI7XHJcbnR5cGUgQ29sdW1uTWFwcGluZyA9IHsgW2NvbHVtbjogc3RyaW5nXTogbnVtYmVyIH07XHJcblxyXG5leHBvcnQgY2xhc3MgU3R1ZGVudEJ1bGtJbXBvcnRNSSBleHRlbmRzIEFkbWluTWVudUl0ZW0ge1xyXG5cclxuICAgIHN0ZXA6IFN0ZXA7XHJcbiAgICAkdGFibGVMZWZ0OiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG4gICAgJHRhYmxlUmlnaHQ6IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcblxyXG4gICAgJGltcG9ydFRleHRBcmVhOiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG4gICAgJHByb3RvY29sOiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG5cclxuICAgIHN0dWRlbnRHcmlkTmFtZSA9IFwiYnVsa0ltcG9ydFN0dWRlbnRzR3JpZFwiO1xyXG5cclxuICAgIHNlbGVjdGVkQ2xhc3M6IENsYXNzRGF0YTtcclxuICAgIHVzZXJzVG9Xcml0ZTogVXNlckRhdGFbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihhZG1pbmlzdHJhdGlvbjogQWRtaW5pc3RyYXRpb24pIHtcclxuICAgICAgICBzdXBlcihhZG1pbmlzdHJhdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgY2hlY2tQZXJtaXNzaW9uKHVzZXI6IFVzZXJEYXRhKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHVzZXIuaXNfdGVhY2hlcjtcclxuICAgIH1cclxuXHJcbiAgICBnZXRCdXR0b25JZGVudGlmaWVyKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIFwiU2Now7xsZXJkYXRlbmltcG9ydFwiO1xyXG4gICAgfVxyXG5cclxuICAgIG9uTWVudUJ1dHRvblByZXNzZWQoJG1haW5IZWFkaW5nOiBKUXVlcnk8SFRNTEVsZW1lbnQ+LCAkdGFibGVMZWZ0OiBKUXVlcnk8SFRNTEVsZW1lbnQ+LFxyXG4gICAgICAgICR0YWJsZVJpZ2h0OiBKUXVlcnk8SFRNTEVsZW1lbnQ+LCAkbWFpbkZvb3RlcjogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy4kdGFibGVMZWZ0ID0gJHRhYmxlTGVmdDtcclxuICAgICAgICB0aGlzLiR0YWJsZVJpZ2h0ID0gJHRhYmxlUmlnaHQ7XHJcblxyXG5cclxuICAgICAgICAkdGFibGVSaWdodC5jc3MoJ2ZsZXgnLCAnMicpO1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgaWYgKHcydWlbdGhpcy5zdHVkZW50R3JpZE5hbWVdICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IGdyaWQ6IFcyVUkuVzJHcmlkID0gdzJ1aVt0aGlzLnN0dWRlbnRHcmlkTmFtZV07XHJcbiAgICAgICAgICAgIGdyaWQucmVuZGVyKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgJHRhYmxlUmlnaHQudzJncmlkKHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuc3R1ZGVudEdyaWROYW1lLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyOiAnU2Now7xsZXIvaW5uZW4nLFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0VHlwZTogXCJjZWxsXCIsXHJcbiAgICAgICAgICAgICAgICBzaG93OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2xiYXI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbGJhckRlbGV0ZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBmb290ZXI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0Q29sdW1uOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2xiYXJTZWFyY2g6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgdG9vbGJhcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHJlY2lkOiBcImlkXCIsXHJcbiAgICAgICAgICAgICAgICBjb2x1bW5zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ2lkJywgY2FwdGlvbjogJ0lEJywgc2l6ZTogJzIwcHgnLCBzb3J0YWJsZTogdHJ1ZSwgaGlkZGVuOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ3J1Zm5hbWUnLCBjYXB0aW9uOiAnUnVmbmFtZScsIHNpemU6ICcyNSUnLCBzb3J0YWJsZTogdHJ1ZSwgcmVzaXphYmxlOiB0cnVlLCBlZGl0YWJsZTogeyB0eXBlOiAndGV4dCcgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdmYW1pbGllbm5hbWUnLCBjYXB0aW9uOiAnRmFtaWxpZW5uYW1lJywgc2l6ZTogJzI1JScsIHNvcnRhYmxlOiB0cnVlLCByZXNpemFibGU6IHRydWUsIGVkaXRhYmxlOiB7IHR5cGU6ICd0ZXh0JyB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ3VzZXJuYW1lJywgY2FwdGlvbjogJ0JlbnV0emVybmFtZScsIHNpemU6ICcyNSUnLCBzb3J0YWJsZTogdHJ1ZSwgcmVzaXphYmxlOiB0cnVlLCBlZGl0YWJsZTogeyB0eXBlOiAndGV4dCcgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdwYXNzd29yZCcsIGNhcHRpb246ICdQYXNzd29ydCcsIHNpemU6ICcyNSUnLCBzb3J0YWJsZTogZmFsc2UsIGVkaXRhYmxlOiB7IHR5cGU6ICd0ZXh0JyB9IH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICBzZWFyY2hlczogW1xyXG4gICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICd1c2VybmFtZScsIGxhYmVsOiAnQmVudXR6ZXJuYW1lJywgdHlwZTogJ3RleHQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ3J1Zm5hbWUnLCBsYWJlbDogJ1J1Zm5hbWUnLCB0eXBlOiAndGV4dCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB7IGZpZWxkOiAnZmFtaWxpZW5uYW1lJywgbGFiZWw6ICdGYW1pbGllbm5hbWUnLCB0eXBlOiAndGV4dCcgfVxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHNvcnREYXRhOiBbeyBmaWVsZDogJ2tsYXNzZScsIGRpcmVjdGlvbjogJ2FzYycgfSwgeyBmaWVsZDogJ2ZhbWlsaWVubmFtZScsIGRpcmVjdGlvbjogJ2FzYycgfSwgeyBmaWVsZDogJ3J1Zm5hbWUnLCBkaXJlY3Rpb246ICdhc2MnIH1dLFxyXG4gICAgICAgICAgICAgICAgb25EZWxldGU6IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZXZlbnQuZm9yY2UgfHwgZXZlbnQuaXNTdG9wcGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0dWRlbnRzR3JpZDogVzJVSS5XMkdyaWQgPSB3MnVpW3RoYXQuc3R1ZGVudEdyaWROYW1lXTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcmVjSWRzOiBudW1iZXJbXSA9IHN0dWRlbnRzR3JpZC5nZXRTZWxlY3Rpb24oKS5tYXAoKHNlbCkgPT4gc2VsW1wicmVjaWRcIl0pLmZpbHRlcigodmFsdWUsIGluZGV4LCBhcnJheSkgPT4gYXJyYXkuaW5kZXhPZih2YWx1ZSkgPT09IGluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICBldmVudC5vbkNvbXBsZXRlID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNJZHMuZm9yRWFjaCgoaWQpID0+IHN0dWRlbnRzR3JpZC5yZW1vdmUoaWQgKyBcIlwiKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLnNob3dTdGVwKFwiU3RlcCAxIFBhc3RlXCIpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzaG93U3RlcChzdGVwOiBTdGVwKSB7XHJcblxyXG4gICAgICAgIHRoaXMuJHRhYmxlTGVmdC5lbXB0eSgpO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKHN0ZXApIHtcclxuICAgICAgICAgICAgY2FzZSBcIlN0ZXAgMSBQYXN0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5lbmFibGVHcmlkKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1N0ZXAxUGFzdGUoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiU3RlcCAyIGNoZWNrXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmVuYWJsZUdyaWQodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dTdGVwMkNoZWNrKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcIlN0ZXAgMyBpbXBvcnRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuZW5hYmxlR3JpZChmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dTdGVwM0ltcG9ydCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJTdGVwIDQgcHJpbnRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuZW5hYmxlR3JpZChmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dTdGVwNFByaW50KCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc3RlcCA9IHN0ZXA7XHJcbiAgICB9XHJcblxyXG4gICAgc2hvd1N0ZXA0UHJpbnQoKSB7XHJcblxyXG4gICAgICAgIGxldCBkZXNjcmlwdGlvbjogc3RyaW5nID0gYERpZSBTY2jDvGxlci9pbm5lbiB3dXJkZW4gZXJmb2xncmVpY2ggYW5nZWxlZ3QgdW5kIGRlciBLbGFzc2UgJHt0aGlzLnNlbGVjdGVkQ2xhc3MubmFtZX0genVnZW9yZG5ldC5cclxuICAgICAgICBFaW5lIExpc3RlIGRlciBadWdhbmdzZGF0ZW4genVtIEF1c2RydWNrZW4gZXJoYWx0ZW4gU2llIGR1cmNoIEtsaWNrIGF1ZiBkZW4gQnV0dG9uIFwiRHJ1Y2tlbi4uLlwiLlxyXG4gICAgICAgIGBcclxuXHJcbiAgICAgICAgdGhpcy4kdGFibGVMZWZ0LmFwcGVuZCgkKCc8ZGl2IGNsYXNzPVwiam9fYnVsa19oZWFkaW5nXCI+U2Nocml0dCA0OiBGZXJ0aWchPC9kaXY+JykpO1xyXG4gICAgICAgIGxldCAkZGVzY3JpcHRpb24gPSAkKGA8ZGl2IGNsYXNzPVwiam9fYnVsa19kZXNjcmlwdGlvblwiPjwvZGl2PmApO1xyXG4gICAgICAgICRkZXNjcmlwdGlvbi5odG1sKGRlc2NyaXB0aW9uKTtcclxuICAgICAgICB0aGlzLiR0YWJsZUxlZnQuYXBwZW5kKCRkZXNjcmlwdGlvbik7XHJcblxyXG4gICAgICAgIGxldCAkYnV0dG9uZGl2ID0gJChgPGRpdiBjbGFzcz1cImpvX2J1bGtfYnV0dG9uZGl2XCIgc3R5bGU9XCJqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW5cIj48L2Rpdj5gKTtcclxuICAgICAgICB0aGlzLiR0YWJsZUxlZnQuYXBwZW5kKCRidXR0b25kaXYpO1xyXG4gICAgICAgIGxldCAkYnV0dG9uUHJpbnQgPSAkKGA8ZGl2IGNsYXNzPVwiam9fYnV0dG9uQ29udGludWUgam9fYnV0dG9uIGpvX2FjdGl2ZVwiPkRydWNrZW4uLi48L2Rpdj5gKTtcclxuICAgICAgICAkYnV0dG9uZGl2LmFwcGVuZCgkYnV0dG9uUHJpbnQpO1xyXG5cclxuICAgICAgICBsZXQgJGJ1dHRvbldyaXRlVXNlcnMgPSAkKGA8ZGl2IGNsYXNzPVwiam9fYnV0dG9uQ29udGludWUgam9fYnV0dG9uIGpvX2FjdGl2ZVwiPk9LPC9kaXY+YCk7XHJcbiAgICAgICAgJGJ1dHRvbmRpdi5hcHBlbmQoJGJ1dHRvbldyaXRlVXNlcnMpO1xyXG5cclxuICAgICAgICBsZXQgJHByaW50RGl2ID0gJCgnI3ByaW50Jyk7XHJcbiAgICAgICAgJHByaW50RGl2LmVtcHR5KCk7XHJcbiAgICAgICAgdGhpcy51c2Vyc1RvV3JpdGUuZm9yRWFjaCgodXNlcikgPT4ge1xyXG4gICAgICAgICAgICAkcHJpbnREaXYuYXBwZW5kKGA8ZGl2IHN0eWxlPVwicGFnZS1icmVhay1pbnNpZGU6IGF2b2lkO1wiPlxyXG4gICAgICAgICAgICA8ZGl2PjxiPlVSTDo8L2I+IGh0dHBzOi8vd3d3Lm9ubGluZS1pZGUuZGU8L2Rpdj5cclxuICAgICAgICAgICAgPGRpdj48Yj5OYW1lOjwvYj4gJHt1c2VyLnJ1Zm5hbWV9ICR7dXNlci5mYW1pbGllbm5hbWV9PC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXY+PGI+S2xhc3NlOjwvYj4gJHt0aGlzLnNlbGVjdGVkQ2xhc3MubmFtZX08L2Rpdj5cclxuICAgICAgICAgICAgPGRpdj48Yj5CZW51dHplcm5hbWU6PC9iPiAke3VzZXIudXNlcm5hbWV9PC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJtYXJnaW4tYm90dG9tOiAzZW1cIj48Yj5QYXNzd29ydDo8L2I+ICR7dXNlci5wYXNzd29yZH08L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+YCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRidXR0b25QcmludC5vbignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICQoJyNvdXRlcicpLmNzcygnZGlzcGxheScsICdub25lJyk7XHJcbiAgICAgICAgICAgIHdpbmRvdy5wcmludCgpO1xyXG4gICAgICAgICAgICAkKCcjb3V0ZXInKS5jc3MoJ2Rpc3BsYXknLCAnJyk7XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgJGJ1dHRvbldyaXRlVXNlcnMub24oJ2NsaWNrJywgKCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgbGV0IHN0dWRlbnRHcmlkOiBXMlVJLlcyR3JpZCA9IHcydWlbdGhpcy5zdHVkZW50R3JpZE5hbWVdO1xyXG4gICAgICAgICAgICBzdHVkZW50R3JpZC5jbGVhcigpO1xyXG4gICAgICAgICAgICB0aGlzLnNob3dTdGVwKFwiU3RlcCAxIFBhc3RlXCIpO1xyXG5cclxuICAgICAgICB9KVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2hvd1N0ZXAzSW1wb3J0KCkge1xyXG5cclxuICAgICAgICBsZXQgZGVzY3JpcHRpb246IHN0cmluZyA9IGBEaWUgU2Now7xsZXIvaW5uZW4ga8O2bm5lbiBqZXR6dCBhbmdlbGVndCB1bmQgZGVyIEtsYXNzZSAke3RoaXMuc2VsZWN0ZWRDbGFzcy5uYW1lfSB6dWdlb3JkbmV0IHdlcmRlbi5gXHJcblxyXG4gICAgICAgIHRoaXMuJHRhYmxlTGVmdC5hcHBlbmQoJCgnPGRpdiBjbGFzcz1cImpvX2J1bGtfaGVhZGluZ1wiPlNjaHJpdHQgMzogQmVudXR6ZXIgYW5sZWdlbjwvZGl2PicpKTtcclxuICAgICAgICBsZXQgJGRlc2NyaXB0aW9uID0gJChgPGRpdiBjbGFzcz1cImpvX2J1bGtfZGVzY3JpcHRpb25cIj48L2Rpdj5gKTtcclxuICAgICAgICAkZGVzY3JpcHRpb24uaHRtbChkZXNjcmlwdGlvbik7XHJcbiAgICAgICAgdGhpcy4kdGFibGVMZWZ0LmFwcGVuZCgkZGVzY3JpcHRpb24pO1xyXG5cclxuICAgICAgICBsZXQgJGJ1dHRvbmRpdiA9ICQoYDxkaXYgY2xhc3M9XCJqb19idWxrX2J1dHRvbmRpdlwiIHN0eWxlPVwianVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuXCI+PC9kaXY+YCk7XHJcbiAgICAgICAgdGhpcy4kdGFibGVMZWZ0LmFwcGVuZCgkYnV0dG9uZGl2KTtcclxuICAgICAgICBsZXQgJGJ1dHRvbkJhY2sgPSAkKGA8ZGl2IGNsYXNzPVwiam9fYnV0dG9uQ29udGludWUgam9fYnV0dG9uIGpvX2FjdGl2ZVwiPlp1csO8Y2s8L2Rpdj5gKTtcclxuICAgICAgICAkYnV0dG9uZGl2LmFwcGVuZCgkYnV0dG9uQmFjayk7XHJcbiAgICAgICAgbGV0ICRidXR0b25Xcml0ZVVzZXJzID0gJChgPGRpdiBjbGFzcz1cImpvX2J1dHRvbldyaXRlVXNlcnMgam9fYnV0dG9uIGpvX2FjdGl2ZVwiPkJlbnV0emVyIGFubGVnZW48L2Rpdj5gKTtcclxuICAgICAgICAkYnV0dG9uZGl2LmFwcGVuZCgkYnV0dG9uV3JpdGVVc2Vycyk7XHJcblxyXG4gICAgICAgIHRoaXMuJHByb3RvY29sID0gJCgnPGRpdiBjbGFzcz1cImpvX2J1bGtfcHJvdG9jb2xcIj48L2Rpdj4nKTtcclxuICAgICAgICB0aGlzLiR0YWJsZUxlZnQuYXBwZW5kKHRoaXMuJHByb3RvY29sKTtcclxuICAgICAgICB0aGlzLiRwcm90b2NvbC5oaWRlKCk7XHJcblxyXG4gICAgICAgICRidXR0b25CYWNrLm9uKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5zaG93U3RlcChcIlN0ZXAgMiBjaGVja1wiKTtcclxuICAgICAgICB9KVxyXG5cclxuXHJcbiAgICAgICAgJGJ1dHRvbldyaXRlVXNlcnMub24oJ2NsaWNrJywgKCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgJGJ1dHRvbldyaXRlVXNlcnMucmVtb3ZlQ2xhc3MoJ2pvX2FjdGl2ZScpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kcHJvdG9jb2wuc2hvdygpO1xyXG4gICAgICAgICAgICB0aGlzLiRwcm90b2NvbC5odG1sKFwiPGRpdj5EaWUgQmVudXR6ZXIgd2VyZGVuIGFuZ2VsZWd0LiBCaXR0ZSB3YXJ0ZW4uLi48L2Rpdj5cIik7XHJcblxyXG4gICAgICAgICAgICBsZXQgcmVxdWVzdDogQnVsa0NyZWF0ZVVzZXJzUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgICAgIG9ubHlDaGVja1VzZXJuYW1lczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzY2h1bGVfaWQ6IHRoaXMuYWRtaW5pc3RyYXRpb24udXNlckRhdGEuc2NodWxlX2lkLFxyXG4gICAgICAgICAgICAgICAgdXNlcnM6IHRoaXMudXNlcnNUb1dyaXRlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGFqYXgoJ2J1bGtDcmVhdGVVc2VycycsIHJlcXVlc3QsIChyZXNwb25zZTogQnVsa0NyZWF0ZVVzZXJzUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1N0ZXAoXCJTdGVwIDQgcHJpbnRcIik7XHJcbiAgICAgICAgICAgIH0sIChtZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBhbGVydChcIkZlaGxlcjogXCIgKyBtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1N0ZXAoXCJTdGVwIDIgY2hlY2tcIik7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9KVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2hvd1N0ZXAyQ2hlY2soKSB7XHJcblxyXG4gICAgICAgIGxldCBkZXNjcmlwdGlvbjogc3RyaW5nID0gYEJpdHRlIHfDpGhsZW4gU2llIGltIEF1c3dhaGxmZWxkIGRpZSBLbGFzc2UgYXVzLCBpbiBkaWUgZGllIFNjaMO8bGVyZGF0ZW4gaW1wb3J0aWVydCB3ZXJkZW4gc29sbGVuLiBTaWUga8O2bm5lbiBkaWUgRGF0ZW4gaW4gZGVyIFRhYmVsbGUgbm9jaCBiZWFyYmVpdGVuLCBiZXZvciBTaWUgc2llIHp1ciDDnGJlcnByw7xmdW5nIChub2NoIGtlaW4gSW1wb3J0ISkgYWJzZW5kZW4uYFxyXG5cclxuICAgICAgICB0aGlzLiR0YWJsZUxlZnQuYXBwZW5kKCQoJzxkaXYgY2xhc3M9XCJqb19idWxrX2hlYWRpbmdcIj5TY2hyaXR0IDI6IERhdGVuIMO8YmVycHLDvGZlbjwvZGl2PicpKTtcclxuICAgICAgICBsZXQgJGRlc2NyaXB0aW9uID0gJChgPGRpdiBjbGFzcz1cImpvX2J1bGtfZGVzY3JpcHRpb25cIj48L2Rpdj5gKTtcclxuICAgICAgICAkZGVzY3JpcHRpb24uaHRtbChkZXNjcmlwdGlvbik7XHJcbiAgICAgICAgdGhpcy4kdGFibGVMZWZ0LmFwcGVuZCgkZGVzY3JpcHRpb24pO1xyXG5cclxuICAgICAgICBsZXQgcmVxdWVzdDogR2V0Q2xhc3Nlc0RhdGFSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICBzY2hvb2xfaWQ6IHRoaXMuYWRtaW5pc3RyYXRpb24udXNlckRhdGEuc2NodWxlX2lkXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgJHNlbGVjdCA9IDxKUXVlcnk8SFRNTFNlbGVjdEVsZW1lbnQ+PiQoJzxzZWxlY3QgY2xhc3M9XCJqb19idWxrX2Nob29zZUNsYXNzXCI+PC9zZWxlY3Q+Jyk7XHJcbiAgICAgICAgdGhpcy4kdGFibGVMZWZ0LmFwcGVuZCgkc2VsZWN0KTtcclxuXHJcbiAgICAgICAgYWpheCgnZ2V0Q2xhc3Nlc0RhdGEnLCByZXF1ZXN0LCAocmVzcG9uc2U6IEdldENsYXNzZXNEYXRhUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgLy8gY2QuaWQsIGNkLm5hbWVcclxuICAgICAgICAgICAgc2V0U2VsZWN0SXRlbXMoJHNlbGVjdCwgcmVzcG9uc2UuY2xhc3NEYXRhTGlzdC5tYXAoKGNkKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhcHRpb246IGNkLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNkLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogY2RcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICAgICAgbGV0ICRidXR0b25kaXYgPSAkKGA8ZGl2IGNsYXNzPVwiam9fYnVsa19idXR0b25kaXZcIiBzdHlsZT1cImp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlblwiPjwvZGl2PmApO1xyXG4gICAgICAgIHRoaXMuJHRhYmxlTGVmdC5hcHBlbmQoJGJ1dHRvbmRpdik7XHJcbiAgICAgICAgbGV0ICRidXR0b25CYWNrID0gJChgPGRpdiBjbGFzcz1cImpvX2J1dHRvbkNvbnRpbnVlIGpvX2J1dHRvbiBqb19hY3RpdmVcIj5adXLDvGNrPC9kaXY+YCk7XHJcbiAgICAgICAgJGJ1dHRvbmRpdi5hcHBlbmQoJGJ1dHRvbkJhY2spO1xyXG4gICAgICAgIGxldCAkYnV0dG9uQ29udGludWUgPSAkKGA8ZGl2IGNsYXNzPVwiam9fYnV0dG9uQ29udGludWUgam9fYnV0dG9uIGpvX2FjdGl2ZVwiPkRhdGVuIMO8YmVycHLDvGZlbi4uLjwvZGl2PmApO1xyXG4gICAgICAgICRidXR0b25kaXYuYXBwZW5kKCRidXR0b25Db250aW51ZSk7XHJcblxyXG4gICAgICAgIHRoaXMuJHRhYmxlTGVmdC5hcHBlbmQoJCgnPGRpdiBjbGFzcz1cImpvX2J1bGtfaGVhZGluZ19wcm90b2NvbFwiPkZlaGxlcnByb3Rva29sbDwvZGl2PicpKTtcclxuICAgICAgICB0aGlzLiRwcm90b2NvbCA9ICQoJzxkaXYgY2xhc3M9XCJqb19idWxrX3Byb3RvY29sXCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgdGhpcy4kdGFibGVMZWZ0LmFwcGVuZCh0aGlzLiRwcm90b2NvbCk7XHJcblxyXG4gICAgICAgICRidXR0b25CYWNrLm9uKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5zaG93U3RlcChcIlN0ZXAgMSBQYXN0ZVwiKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICAkYnV0dG9uQ29udGludWUub24oJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkQ2xhc3MgPSBnZXRTZWxlY3RlZE9iamVjdCgkc2VsZWN0KTtcclxuICAgICAgICAgICAgdGhpcy5jaGVja0RhdGEodGhpcy5zZWxlY3RlZENsYXNzKTtcclxuICAgICAgICB9KVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2hlY2tEYXRhKGNsYXNzRGF0YTogQ2xhc3NEYXRhKSB7XHJcbiAgICAgICAgbGV0IHN0dWRlbnRHcmlkOiBXMlVJLlcyR3JpZCA9IHcydWlbdGhpcy5zdHVkZW50R3JpZE5hbWVdO1xyXG4gICAgICAgIHN0dWRlbnRHcmlkLm1lcmdlQ2hhbmdlcygpO1xyXG5cclxuICAgICAgICB0aGlzLnVzZXJzVG9Xcml0ZSA9IDxVc2VyRGF0YVtdPnN0dWRlbnRHcmlkLnJlY29yZHNcclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IEJ1bGtDcmVhdGVVc2Vyc1JlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIG9ubHlDaGVja1VzZXJuYW1lczogdHJ1ZSxcclxuICAgICAgICAgICAgc2NodWxlX2lkOiB0aGlzLmFkbWluaXN0cmF0aW9uLnVzZXJEYXRhLnNjaHVsZV9pZCxcclxuICAgICAgICAgICAgdXNlcnM6IHRoaXMudXNlcnNUb1dyaXRlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhamF4KCdidWxrQ3JlYXRlVXNlcnMnLCByZXF1ZXN0LCAocmVzcG9uc2U6IEJ1bGtDcmVhdGVVc2Vyc1Jlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5uYW1lc0FscmVhZHlVc2VkLmxlbmd0aCA9PSAwKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgdXNlciBvZiB0aGlzLnVzZXJzVG9Xcml0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHVzZXIuc2NodWxlX2lkID0gdGhpcy5hZG1pbmlzdHJhdGlvbi51c2VyRGF0YS5zY2h1bGVfaWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdXNlci5rbGFzc2VfaWQgPSBjbGFzc0RhdGEuaWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdXNlci5pc19hZG1pbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHVzZXIuaXNfc2Nob29sYWRtaW4gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB1c2VyLmlzX3RlYWNoZXIgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dTdGVwKFwiU3RlcCAzIGltcG9ydFwiKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHByb3RvY29sLmh0bWwoJ0RpZXNlIEJlbnV0emVybmFtZW4gc2luZCBzY2hvbiBhbmRlcmVuIEJlbnV0emVybiB6dWdlb3JkbmV0IHVuZCBrw7ZubmVuIGRhaGVyIG5pY2h0IHZlcndlbmRldCB3ZXJkZW46IDxicj4nICsgcmVzcG9uc2UubmFtZXNBbHJlYWR5VXNlZC5qb2luKFwiLCBcIikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgKG1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgYWxlcnQoXCJGZWhsZXI6IFwiICsgbWVzc2FnZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBzaG93U3RlcDFQYXN0ZSgpIHtcclxuXHJcbiAgICAgICAgbGV0IGRlc2NyaXB0aW9uOiBzdHJpbmcgPSBgXHJcbiAgICAgICAgWnVtIEltcG9ydGllcmVuIHdpcmQgZWluZSBUYWJlbGxlIG1pdCBkZW4gU3BhbHRlbiBSdWZuYW1lLCBGYW1pbGllbm5hbWUsIFVzZXJuYW1lIHVuZCBQYXNzd29ydCBiZW7DtnRpZ3QsIFxyXG4gICAgICAgIHdvYmVpIGRpZSBEYXRlbiBpbiBkZW4gWmVsbGVuIGpld2VpbHMgbWl0IFRhYi1aZWljaGVuIGdldHJlbm50IHNpbmQuIFNpZSBlcmhhbHRlbiBkaWVzZXMgRm9ybWF0IGJlaXNwaWVsc3dlaXNlLCBcclxuICAgICAgICBpbmRlbSBTaWUgZWluZSBUYWJlbGxlIGluIEV4Y2VsIGluIGRpZSBad2lzY2hlbmFibGFnZSBrb3BpZXJlbi4gPGJyPiBGYWxscyBkaWUgZXJzdGUgWmVpbGUgU3BhbHRlbmvDtnBmZSBtaXRcclxuICAgICAgICBkZW4ga29ycmVrdGVuIEJlemVpY2huZXJuIChSdWZuYW1lLCBGYW1pbGllbm5hbWUsIFVzZXJuYW1lLCBQYXNzd29ydCkgZW50aMOkbHQsIGvDvG1tZXJ0IHNpY2ggZGVyIEltcG9ydC1BbGdvcml0aG11c1xyXG4gICAgICAgIHVtIGRpZSByaWNodGlnZSBSZWloZW5mb2xnZSB1bmQgYmxlbmRldCBnZ2YuIGF1Y2ggw7xiZXJmbMO8c3NpZ2UgU3BhbHRlbiBhdXMuIDxicj5cclxuICAgICAgICBCaXR0ZSBmw7xnZW4gU2llIGRlbiBJbmhhbHQgZGVyIFRhYmVsbGUgcGVyIENvcHktUGFzdGUgaW4gZGllc2VzIEVpbmdhYmVmZWxkIGVpbjpgXHJcblxyXG4gICAgICAgIHRoaXMuJHRhYmxlTGVmdC5hcHBlbmQoJCgnPGRpdiBjbGFzcz1cImpvX2J1bGtfaGVhZGluZ1wiPlNjaHJpdHQgMTogRGF0ZW4gZWlubGVzZW48L2Rpdj4nKSk7XHJcbiAgICAgICAgbGV0ICRkZXNjcmlwdGlvbiA9ICQoYDxkaXYgY2xhc3M9XCJqb19idWxrX2Rlc2NyaXB0aW9uXCI+PC9kaXY+YCk7XHJcbiAgICAgICAgdGhpcy4kdGFibGVMZWZ0LmFwcGVuZCgkZGVzY3JpcHRpb24pO1xyXG4gICAgICAgIC8vIHRoaXMuJHRhYmxlTGVmdC5hcHBlbmQoZGVzY3JpcHRpb24pO1xyXG5cclxuICAgICAgICB0aGlzLiRpbXBvcnRUZXh0QXJlYSA9ICQoYDx0ZXh0YXJlYSBjbGFzcz1cImpvX2J1bGtfaW1wb3J0YXJlYVwiPjwvdGV4dGFyZWE+YCk7XHJcbiAgICAgICAgdGhpcy4kdGFibGVMZWZ0LmFwcGVuZCh0aGlzLiRpbXBvcnRUZXh0QXJlYSk7XHJcbiAgICAgICAgdGhpcy4kaW1wb3J0VGV4dEFyZWEuaHRtbCgnJyk7XHJcblxyXG4gICAgICAgIGxldCAkYnV0dG9uZGl2ID0gJChgPGRpdiBjbGFzcz1cImpvX2J1bGtfYnV0dG9uZGl2XCIgc3R5bGU9XCJqdXN0aWZ5LWNvbnRlbnQ6IGZsZXgtZW5kXCI+PC9kaXY+YCk7XHJcbiAgICAgICAgdGhpcy4kdGFibGVMZWZ0LmFwcGVuZCgkYnV0dG9uZGl2KTtcclxuICAgICAgICBsZXQgJGJ1dHRvbkNvbnRpbnVlID0gJChgPGRpdiBjbGFzcz1cImpvX2J1dHRvbkNvbnRpbnVlIGpvX2J1dHRvbiBqb19hY3RpdmVcIj5XZWl0ZXI8L2Rpdj5gKTtcclxuICAgICAgICAkYnV0dG9uZGl2LmFwcGVuZCgkYnV0dG9uQ29udGludWUpO1xyXG5cclxuICAgICAgICAkYnV0dG9uQ29udGludWUub24oJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBhcnNlVGV4dCg8c3RyaW5nPnRoaXMuJGltcG9ydFRleHRBcmVhLnZhbCgpKTtcclxuICAgICAgICAgICAgdGhpcy5zaG93U3RlcChcIlN0ZXAgMiBjaGVja1wiKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICAvLyB0aGlzLiR0YWJsZUxlZnQuYXBwZW5kKCQoJzxkaXYgY2xhc3M9XCJqb19idWxrX2hlYWRpbmdfcHJvdG9jb2xcIj5JbXBvcnRwcm90b2tvbGw8L2Rpdj4nKSk7XHJcbiAgICAgICAgLy8gdGhpcy4kcHJvdG9jb2wgPSAkKCc8ZGl2IGNsYXNzPVwiam9fYnVsa19wcm90b2NvbFwiPjwvZGl2PicpO1xyXG4gICAgICAgIC8vIHRoaXMuJHRhYmxlTGVmdC5hcHBlbmQodGhpcy4kcHJvdG9jb2wpO1xyXG5cclxuICAgICAgICAkZGVzY3JpcHRpb24uaHRtbChkZXNjcmlwdGlvbik7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHBhcnNlVGV4dCh0ZXh0OiBzdHJpbmcpIHtcclxuXHJcbiAgICAgICAgLy8gdGhpcy4kcHJvdG9jb2wuZW1wdHkoKTtcclxuXHJcbiAgICAgICAgbGV0IGxpbmVzMTogc3RyaW5nW10gPSB0ZXh0LnNwbGl0KC9cXHI/XFxuLyk7XHJcblxyXG4gICAgICAgIGxldCBsaW5lczogc3RyaW5nW11bXSA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGxpbmUxIG9mIGxpbmVzMSkge1xyXG4gICAgICAgICAgICBpZiAobGluZTEubGVuZ3RoID4gNikge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbHVtbnM6IHN0cmluZ1tdID0gbGluZTEuc3BsaXQoL1xcdC8pO1xyXG4gICAgICAgICAgICAgICAgbGluZXMucHVzaChjb2x1bW5zKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGNtID0gdGhpcy5nZXRDb2x1bW5NYXBwaW5nKGxpbmVzKTtcclxuICAgICAgICBsZXQgY29sdW1uTWFwcGluZzogQ29sdW1uTWFwcGluZyA9IGNtLmNvbHVtbk1hcHBpbmc7XHJcblxyXG4gICAgICAgIGxldCB1c2VyRGF0YTogVXNlckRhdGFbXSA9IHRoaXMubWFrZVVzZXJEYXRhKGxpbmVzLCBjb2x1bW5NYXBwaW5nKTtcclxuICAgICAgICBpZiAodXNlckRhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBsZXQgc3R1ZGVudHNHcmlkOiBXMlVJLlcyR3JpZCA9IHcydWlbdGhpcy5zdHVkZW50R3JpZE5hbWVdO1xyXG4gICAgICAgICAgICBzdHVkZW50c0dyaWQuY2xlYXIoKTtcclxuICAgICAgICAgICAgc3R1ZGVudHNHcmlkLmFkZCh1c2VyRGF0YSk7XHJcbiAgICAgICAgICAgIHN0dWRlbnRzR3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG1ha2VVc2VyRGF0YShsaW5lczogc3RyaW5nW11bXSwgY29sdW1uTWFwcGluZzogQ29sdW1uTWFwcGluZyk6IFVzZXJEYXRhW10ge1xyXG5cclxuICAgICAgICBsZXQgdXNlckRhdGE6IFVzZXJEYXRhW10gPSBbXTtcclxuICAgICAgICBsZXQgaWQ6IG51bWJlciA9IDE7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICAgICAgdXNlckRhdGEucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBpZDogaWQrKyxcclxuICAgICAgICAgICAgICAgIGZhbWlsaWVubmFtZTogbGluZVtjb2x1bW5NYXBwaW5nW1wiZmFtaWxpZW5uYW1lXCJdXSxcclxuICAgICAgICAgICAgICAgIHJ1Zm5hbWU6IGxpbmVbY29sdW1uTWFwcGluZ1tcInJ1Zm5hbWVcIl1dLFxyXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6IGxpbmVbY29sdW1uTWFwcGluZ1tcInVzZXJuYW1lXCJdXS50cmltKCksXHJcbiAgICAgICAgICAgICAgICBwYXNzd29yZDogbGluZVtjb2x1bW5NYXBwaW5nW1wicGFzc3dvcnRcIl1dLnRyaW0oKSxcclxuICAgICAgICAgICAgICAgIGlzX2FkbWluOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGlzX3NjaG9vbGFkbWluOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGlzX3RlYWNoZXI6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAga2xhc3NlX2lkOiAtMSxcclxuICAgICAgICAgICAgICAgIHNjaHVsZV9pZDogLTFcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdXNlckRhdGE7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldENvbHVtbk1hcHBpbmcobGluZXM6IHN0cmluZ1tdW10pOiB7IGNvbHVtbk1hcHBpbmc6IENvbHVtbk1hcHBpbmcsIGxpbmUxSGFzSGVhZGVyczogYm9vbGVhbiB9IHtcclxuXHJcbiAgICAgICAgbGV0IGNvbHVtbkhlYWRlcnM6IHN0cmluZ1tdID0gW1wicnVmbmFtZVwiLCBcImZhbWlsaWVubmFtZVwiLCBcInVzZXJuYW1lXCIsIFwicGFzc3dvcnRcIl07XHJcblxyXG4gICAgICAgIGxldCBjb2x1bW5NYXBwaW5nOiBDb2x1bW5NYXBwaW5nID0ge1xyXG4gICAgICAgICAgICBcInJ1Zm5hbWVcIjogMCxcclxuICAgICAgICAgICAgXCJmYW1pbGllbm5hbWVcIjogMSxcclxuICAgICAgICAgICAgXCJ1c2VybmFtZVwiOiAyLFxyXG4gICAgICAgICAgICBcInBhc3N3b3J0XCI6IDNcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChsaW5lcy5sZW5ndGggPCAyKSB7XHJcbiAgICAgICAgICAgIC8vIHRoaXMuJHByb3RvY29sLmFwcGVuZCgkKGA8ZGl2PkluIGRlbiBEYXRlbiBzaW5kIHdlbmlnZXIgYWxzIHp3ZWkgWmVpbGVuIHp1IGZpbmRlbi4gRXMgd2lyZCBkYWhlciBuaWNodCBuYWNoIGVpbmVyIEtvcGZ6ZWlsZSBnZXN1Y2h0LjwvZGl2PmApKVxyXG4gICAgICAgICAgICByZXR1cm4geyBjb2x1bW5NYXBwaW5nOiBjb2x1bW5NYXBwaW5nLCBsaW5lMUhhc0hlYWRlcnM6IGZhbHNlIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbWlzc2luZ0hlYWRlcnM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgbGV0IGhlYWRlcnNGb3VuZDogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBsZXQgbWF4Q29sdW1uSW5kZXg6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGhlYWRlciBvZiBjb2x1bW5IZWFkZXJzKSB7XHJcbiAgICAgICAgICAgIGxldCBpbmRleCA9IGxpbmVzWzBdLmZpbmRJbmRleChjb2x1bW4gPT4gY29sdW1uLnRvTG9jYWxlTG93ZXJDYXNlKCkgPT0gaGVhZGVyLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGluZGV4ID09IC0xICYmIGhlYWRlci50b0xvY2FsZUxvd2VyQ2FzZSgpID09IFwicGFzc3dvcnRcIikge1xyXG4gICAgICAgICAgICAgICAgaW5kZXggPSBsaW5lc1swXS5maW5kSW5kZXgoY29sdW1uID0+IGNvbHVtbi50b0xvY2FsZUxvd2VyQ2FzZSgpID09IFwicGFzc3dvcmRcIik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgbWlzc2luZ0hlYWRlcnMucHVzaChoZWFkZXIpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29sdW1uTWFwcGluZ1toZWFkZXJdID0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiBtYXhDb2x1bW5JbmRleCkgbWF4Q29sdW1uSW5kZXggPSBpbmRleDtcclxuICAgICAgICAgICAgICAgIGhlYWRlcnNGb3VuZC5wdXNoKGhlYWRlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHRoaXMuJHByb3RvY29sLmFwcGVuZCgkKGA8ZGl2PkluIGRlciAxLiBaZWlsZSB3dXJkZW4gZm9sZ2VuZGUgU3BhbHRlbmvDtnBmZSBnZWZ1bmRlbjogJHtoZWFkZXJzRm91bmQuam9pbihcIiwgXCIpfTwvZGl2PmApKTtcclxuICAgICAgICAvLyBpZiAobWlzc2luZ0hlYWRlcnMubGVuZ3RoID4gMClcclxuICAgICAgICAvLyAgICAgdGhpcy4kcHJvdG9jb2wuYXBwZW5kKCQoYDxkaXYgY2xhc3M9XCJqb19idWxrX2Vycm9yXCI+TmljaHQgZ2VmdW5kZW4gd3VyZGVuOiAke21pc3NpbmdIZWFkZXJzLmpvaW4oXCIsIFwiKX08L2Rpdj5gKSk7XHJcblxyXG4gICAgICAgIGxldCBsaW5lMUhhc0hlYWRlcnMgPSBtaXNzaW5nSGVhZGVycy5sZW5ndGggPCAyO1xyXG5cclxuICAgICAgICBsZXQgbGluZU51bWJlcjogbnVtYmVyID0gMTtcclxuICAgICAgICBpZiAobGluZTFIYXNIZWFkZXJzKSB7XHJcbiAgICAgICAgICAgIGxpbmVzLnNwbGljZSgwLCAxKTtcclxuICAgICAgICAgICAgbGluZU51bWJlcisrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgICAgICBpZiAobGluZS5sZW5ndGggPCBtYXhDb2x1bW5JbmRleCArIDEpIHtcclxuICAgICAgICAgICAgICAgIC8vIHRoaXMuJHByb3RvY29sLmFwcGVuZCgkKGA8ZGl2IGNsYXNzPVwiam9fYnVsa19lcnJvclwiPkluIFplaWxlICR7bGluZU51bWJlcn0gZ2lidCBlcyBudXIgJHtsaW5lLmxlbmd0aH0gU3BhbHRlbi4gQmVuw7Z0aWd0IHdlcmRlbiBhYmVyICR7bWF4Q29sdW1uSW5kZXggKyAxfSBTcGFsdGVuLjwvZGl2PmApKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsaW5lTnVtYmVyKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4geyBjb2x1bW5NYXBwaW5nOiBjb2x1bW5NYXBwaW5nLCBsaW5lMUhhc0hlYWRlcnM6IGxpbmUxSGFzSGVhZGVycyB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGVuYWJsZUdyaWQoZW5hYmxlZDogYm9vbGVhbikge1xyXG4gICAgICAgIGxldCBzdHVkZW50R3JpZDogVzJVSS5XMkdyaWQgPSB3MnVpW3RoaXMuc3R1ZGVudEdyaWROYW1lXTtcclxuICAgICAgICBpZiAoZW5hYmxlZCkge1xyXG4gICAgICAgICAgICBzdHVkZW50R3JpZC51bmxvY2soKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzdHVkZW50R3JpZC5sb2NrKFwiXCIsIGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxufSJdfQ==