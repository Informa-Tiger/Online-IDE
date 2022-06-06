import { AdminMenuItem } from "./AdminMenuItem.js";
import { ajax } from "../communication/AjaxHelper.js";
import { PasswordPopup } from "./PasswordPopup.js";
export class SchoolsWithAdminsMI extends AdminMenuItem {
    constructor() {
        super(...arguments);
        this.schoolGridName = "schoolsGrid";
        this.adminGridName = "adminsGrid";
        this.schoolDataList = [];
    }
    checkPermission(user) {
        return user.is_admin;
    }
    getButtonIdentifier() {
        return "Schulen mit Administratoren";
    }
    onMenuButtonPressed($mainHeading, $tableLeft, $tableRight, $mainFooter) {
        let that = this;
        if (this.schoolGrid != null) {
            this.schoolGrid.render();
        }
        else {
            $tableLeft.w2grid({
                name: this.schoolGridName,
                header: 'Schulen',
                // selectType: "cell",
                multiSelect: false,
                show: {
                    header: true,
                    toolbar: true,
                    toolbarAdd: true,
                    toolbarDelete: true,
                    footer: true,
                    selectColumn: true,
                    toolbarSearch: false
                },
                recid: "id",
                columns: [
                    { field: 'id', caption: 'ID', size: '20px', sortable: true, hidden: true },
                    { field: 'name', caption: 'Bezeichnung', size: '30%', sortable: true, resizable: true, editable: { type: 'text' } },
                    { field: 'kuerzel', caption: 'Kürzel', size: '10%', sortable: true, resizable: true, editable: { type: 'text', maxlength: "10" } },
                    { field: 'numberOfClasses', caption: 'Klassen', size: '30%', sortable: true, resizable: true },
                    { field: 'numberOfUsers', caption: 'User', size: '30%', sortable: true, resizable: true },
                ],
                searches: [
                    { field: 'name', label: 'Bezeichnung', type: 'text' }
                ],
                sortData: [{ field: 'name', direction: 'asc' }, { field: 'kuerzel', direction: 'asc' },
                    { field: 'numberOfClasses', direction: 'asc' }, { field: 'numberOfUsers', direction: 'asc' }],
                onSelect: (event) => { event.done(() => { that.onSelectSchool(event); }); },
                onUnselect: (event) => { that.onUnSelectSchool(event); },
                onAdd: (event) => { that.onAddSchool(); },
                onChange: (event) => { that.onUpdateSchool(event); },
                onDelete: (event) => { that.onDeleteSchool(event); },
            });
            this.schoolGrid = w2ui[this.schoolGridName];
        }
        this.loadTablesFromSchoolObject();
        if (this.adminGrid != null) {
            this.adminGrid.render();
        }
        else {
            $tableRight.w2grid({
                name: this.adminGridName,
                header: 'Schuladmins',
                // selectType: "cell",
                show: {
                    header: true,
                    toolbar: true,
                    toolbarAdd: true,
                    toolbarDelete: true,
                    footer: true,
                    selectColumn: true,
                    toolbarSearch: false,
                    toolbarInput: false
                },
                toolbar: {
                    items: [
                        { type: 'break' },
                        { type: 'button', id: 'passwordButton', text: 'Passwort ändern...' } //, img: 'fa-key' }
                    ],
                    onClick: function (target, data) {
                        if (target == "passwordButton") {
                            that.changePassword();
                        }
                    }
                },
                recid: "id",
                columns: [
                    { field: 'id', caption: 'ID', size: '20px', sortable: true, hidden: true },
                    { field: 'username', caption: 'Benutzername', size: '30%', sortable: true, resizable: true, editable: { type: 'text' } },
                    { field: 'rufname', caption: 'Rufname', size: '30%', sortable: true, resizable: true, editable: { type: 'text' } },
                    { field: 'familienname', caption: 'Familienname', size: '30%', sortable: true, resizable: true, editable: { type: 'text' } },
                    {
                        field: 'id', caption: 'PW', size: '40px', sortable: false, render: (e) => {
                            return '<div class="pw_button" title="Passwort ändern" data-recid="' + e.recid + '" style="visibility: hidden">PW!</div>';
                        }
                    }
                ],
                searches: [
                    { field: 'username', label: 'Benutzername', type: 'text' },
                    { field: 'rufname', label: 'Rufname', type: 'text' },
                    { field: 'familienname', label: 'Familienname', type: 'text' }
                ],
                sortData: [{ field: 'klasse', direction: 'asc' }, { field: 'familienname', direction: 'asc' }, { field: 'rufname', direction: 'asc' }],
                onAdd: (event) => { that.onAddAdmin(); },
                onChange: (event) => { that.onUpdateAdmin(event); },
                onDelete: (event) => { that.onDeleteAdmin(event); },
                onSelect: (event) => { event.done(() => { that.onSelectAdmin(event); }); },
                onUnselect: (event) => { event.done(() => { that.onSelectAdmin(event); }); },
            });
            this.adminGrid = w2ui[this.adminGridName];
        }
    }
    onSelectAdmin(event) {
        let adminGrid = w2ui[this.adminGridName];
        // let selection = adminGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        if (event != null && adminGrid.getSelection().length == 1) {
            //@ts-ignore
            adminGrid.toolbar.enable('passwordButton');
        }
        else {
            //@ts-ignore
            adminGrid.toolbar.disable('passwordButton');
        }
    }
    changePassword(recIds = []) {
        if (recIds.length == 0) {
            recIds = this.adminGrid.getSelection();
            //@ts-ignore
            // recIds = <any>this.adminGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        }
        if (recIds.length != 1) {
            this.adminGrid.error("Zum Ändern eines Passworts muss genau ein Admin ausgewählt werden.");
        }
        else {
            let admin = this.adminGrid.get(recIds[0] + "", false);
            let passwordFor = admin.rufname + " " + admin.familienname + " (" + admin.username + ")";
            PasswordPopup.open(passwordFor, () => {
            }, (password) => {
                admin.password = password;
                let request = {
                    type: "update",
                    data: admin,
                };
                //@ts-ignore
                w2utils.lock(jQuery('body'), "Bitte warten, das Hashen <br> des Passworts kann <br>bis zu 1 Minute<br> dauern...", true);
                ajax("CRUDUser", request, (response) => {
                    //@ts-ignore
                    w2utils.unlock(jQuery('body'));
                    w2alert('Das Passwort für ' + admin.rufname + " " + admin.familienname + " (" + admin.username + ") wurde erfolgreich geändert.");
                }, () => {
                    //@ts-ignore
                    w2utils.unlock(jQuery('body'));
                    w2alert('Fehler beim Ändern des Passworts!');
                });
            });
        }
    }
    onDeleteSchool(event) {
        if (!event.force || event.isStopped)
            return;
        let recIds = this.schoolGrid.getSelection();
        //@ts-ignore
        // recIds = <any>this.schoolGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        // let selectedSchools: SchoolData[] = <SchoolData[]>this.schoolGrid.records.filter(
        //     (cd: SchoolData) => recIds.indexOf(cd.id) >= 0);
        let request = {
            type: "delete",
            data: null,
            id: recIds[0],
        };
        ajax("CRUDSchool", request, (response) => {
            this.schoolGrid.remove("" + recIds[0]);
            this.schoolGrid.refresh();
        }, () => {
            this.schoolGrid.refresh();
        });
    }
    onUpdateSchool(event) {
        let data = this.schoolGrid.records[event.index];
        let field = this.schoolGrid.columns[event.column]["field"];
        data[field] = event.value_new;
        let request = {
            type: "update",
            data: data,
        };
        ajax("CRUDSchool", request, (response) => {
            // console.log(data);
            delete data["w2ui"]["changes"];
            this.schoolGrid.refreshCell(data["recid"], field);
        }, () => {
            data[field] = event.value_original;
            this.schoolGrid.refresh();
        });
    }
    onAddSchool() {
        let request = {
            type: "create",
            data: {
                id: -1,
                name: "Name der Schule",
                kuerzel: "kuerzel",
                classes: [],
                usersWithoutClass: []
            },
        };
        ajax("CRUDSchool", request, (response) => {
            let cd = request.data;
            cd.id = response.id;
            this.schoolGrid.add(cd);
            this.schoolGrid.editField(cd.id + "", 1, undefined, { keyCode: 13 });
            this.selectTextInCell();
        });
    }
    onSelectSchool(event) {
        let recIds = this.schoolGrid.getSelection();
        if (recIds.length == 0) {
            return;
        }
        jQuery('#jo_exportschools a').attr('href', 'servlet/exportSchools?ids=' + recIds.join(','));
        // event.done(() => {
        // old: for selecttype = "cell"
        //@ts-ignore
        // recIds = <any>this.schoolGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        let selectedSchools = this.schoolGrid.records.filter((cd) => recIds.indexOf(cd.id) >= 0);
        let adminList = [];
        for (let sc of selectedSchools) {
            this.adminGrid.header = "Admins der Schule " + sc.name;
            for (let sd of sc.usersWithoutClass) {
                if (sd.is_schooladmin)
                    adminList.push(sd);
            }
        }
        // setTimeout(() => {
        this.adminGrid.clear();
        this.adminGrid.add(adminList);
        this.adminGrid.refresh();
        this.onSelectAdmin(null); // to disable "change password"-Button
        this.initializePasswordButtons();
        // }, 20);
        // });
    }
    onUnSelectSchool(event) {
        this.adminGrid.clear();
    }
    initializePasswordButtons() {
        let that = this;
        setTimeout(() => {
            jQuery('.pw_button').off('click');
            jQuery('.pw_button').on('click', (e) => {
                let recid = jQuery(e.target).data('recid');
                e.preventDefault();
                e.stopPropagation();
                that.changePassword([recid]);
            }).css('visibility', 'visible');
        }, 1000);
    }
    loadTablesFromSchoolObject() {
        let userData = this.administration.userData;
        let school_id = userData.schule_id;
        if (userData.is_admin)
            school_id = null;
        let request = { school_id: school_id };
        ajax("getSchoolData", request, (data) => {
            this.schoolDataList = data.schoolData;
            this.schoolGrid.clear();
            if (this.adminGrid != null)
                this.adminGrid.clear();
            for (let school of this.schoolDataList) {
                school["numberOfClasses"] = school.classes.length;
                let n = 0;
                school.classes.forEach(c => n += c.students.length);
                n += school.usersWithoutClass.length;
                school["numberOfUsers"] = n;
            }
            this.schoolGrid.add(this.schoolDataList);
            this.schoolGrid.refresh();
        }, (error) => {
            w2alert('Fehler beim Holen der Daten: ' + error);
            debugger;
        });
    }
    onDeleteAdmin(event) {
        if (!event.force || event.isStopped)
            return;
        let recIds = this.adminGrid.getSelection();
        //@ts-ignore
        // recIds = <any>this.adminGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        let selectedadmins = this.adminGrid.records.filter((cd) => recIds.indexOf(cd.id) >= 0 && this.administration.userData.id != cd.id);
        let request = {
            type: "delete",
            data: null,
            ids: recIds,
        };
        ajax("CRUDUser", request, (response) => {
            recIds.forEach(id => this.adminGrid.remove("" + id));
            for (let school of this.schoolDataList) {
                for (let i = 0; i < school.usersWithoutClass.length; i++) {
                    if (recIds.indexOf(school.usersWithoutClass[i].id) >= 0) {
                        school.usersWithoutClass.splice(i, 1);
                        i--;
                        school["numberOfUsers"] -= 1;
                    }
                }
            }
            this.adminGrid.refresh();
            this.schoolGrid.refresh();
        }, () => {
            this.adminGrid.refresh();
        });
    }
    onUpdateAdmin(event) {
        let data = this.adminGrid.records[event.index];
        let field = this.adminGrid.columns[event.column]["field"];
        data[field] = event.value_new;
        let request = {
            type: "update",
            data: data,
        };
        ajax("CRUDUser", request, (response) => {
            // console.log(data);
            for (let key in data["w2ui"]["changes"]) {
                delete data["w2ui"]["changes"][key];
            }
            data["w2ui"]["changes"] = null;
            this.adminGrid.refreshCell(data["recid"], field);
            // //@ts-ignore
            // this.adminGrid.last.inEditMode = false;
        }, () => {
            data[field] = event.value_original;
            // this.adminGrid.refresh();
        });
    }
    onAddAdmin() {
        let selectedSchools = this.schoolGrid.getSelection();
        // let selectedSchools = <number[]>this.schoolGrid.getSelection().map((d: { recid: number }) => d.recid).filter((value, index, array) => array.indexOf(value) === index);
        if (selectedSchools.length != 1) {
            this.adminGrid.error("Wenn Sie Admins hinzufügen möchten muss links genau eine Schule ausgewählt sein.");
            return;
        }
        let schoolId = selectedSchools[0];
        let school = this.schoolGrid.get("" + schoolId, false);
        let request = {
            type: "create",
            data: {
                id: -1,
                schule_id: schoolId,
                klasse_id: null,
                username: "Benutzername" + Math.round(Math.random() * 10000000),
                rufname: "Rufname",
                familienname: "Familienname",
                is_admin: false,
                is_schooladmin: true,
                is_teacher: true,
                password: Math.round(Math.random() * 10000000) + "x"
            },
        };
        ajax("CRUDUser", request, (response) => {
            let ud = request.data;
            ud.id = response.id;
            this.adminGrid.add(ud);
            this.adminGrid.editField(ud.id + "", 1, undefined, { keyCode: 13 });
            school.usersWithoutClass.push(ud);
            this.selectTextInCell();
            this.initializePasswordButtons();
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2Nob29sc1dpdGhBZG1pbnNNSS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGllbnQvYWRtaW5pc3RyYXRpb24vU2Nob29sc1dpdGhBZG1pbnNNSS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFbkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3RELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUtuRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsYUFBYTtJQUF0RDs7UUFFSSxtQkFBYyxHQUFHLGFBQWEsQ0FBQztRQUMvQixrQkFBYSxHQUFHLFlBQVksQ0FBQztRQUs3QixtQkFBYyxHQUFpQixFQUFFLENBQUM7SUE4YnRDLENBQUM7SUE1YkcsZUFBZSxDQUFDLElBQWM7UUFDMUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxtQkFBbUI7UUFDZixPQUFPLDZCQUE2QixDQUFDO0lBQ3pDLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxZQUFpQyxFQUFFLFVBQStCLEVBQ2xGLFdBQWdDLEVBQUUsV0FBZ0M7UUFDbEUsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWhCLElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLEVBQUU7WUFDekIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUM1QjthQUFNO1lBQ0gsVUFBVSxDQUFDLE1BQU0sQ0FBQztnQkFDZCxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWM7Z0JBQ3pCLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixzQkFBc0I7Z0JBQ3RCLFdBQVcsRUFBRSxLQUFLO2dCQUNsQixJQUFJLEVBQUU7b0JBQ0YsTUFBTSxFQUFFLElBQUk7b0JBQ1osT0FBTyxFQUFFLElBQUk7b0JBQ2IsVUFBVSxFQUFFLElBQUk7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RSxLQUFLO2dCQUNmLGNBQWMsRUFBRSxJQUFJO2dCQUNwQixVQUFVLEVBQUUsSUFBSTtnQkFDaEIsUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxHQUFHLEdBQUc7YUFDdkQ7U0FDSixDQUFDO1FBRUYsSUFBSSxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxRQUFzQixFQUFFLEVBQUU7WUFDakQsSUFBSSxFQUFFLEdBQWEsT0FBTyxDQUFDLElBQUksQ0FBQztZQUNoQyxFQUFFLENBQUMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFbEMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0NBR0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBZG1pbk1lbnVJdGVtIH0gZnJvbSBcIi4vQWRtaW5NZW51SXRlbS5qc1wiO1xyXG5pbXBvcnQgeyBVc2VyRGF0YSwgQ1JVRFVzZXJSZXF1ZXN0LCBDUlVEU2Nob29sUmVxdWVzdCwgQ1JVRFJlc3BvbnNlLCBTY2hvb2xEYXRhLCBHZXRTY2hvb2xEYXRhUmVxdWVzdCwgR2V0U2Nob29sRGF0YVJlc3BvbnNlIH0gZnJvbSBcIi4uL2NvbW11bmljYXRpb24vRGF0YS5qc1wiO1xyXG5pbXBvcnQgeyBhamF4IH0gZnJvbSBcIi4uL2NvbW11bmljYXRpb24vQWpheEhlbHBlci5qc1wiO1xyXG5pbXBvcnQgeyBQYXNzd29yZFBvcHVwIH0gZnJvbSBcIi4vUGFzc3dvcmRQb3B1cC5qc1wiO1xyXG5cclxuZGVjbGFyZSB2YXIgdzJwcm9tcHQ6IGFueTtcclxuZGVjbGFyZSB2YXIgdzJhbGVydDogYW55O1xyXG5cclxuZXhwb3J0IGNsYXNzIFNjaG9vbHNXaXRoQWRtaW5zTUkgZXh0ZW5kcyBBZG1pbk1lbnVJdGVtIHtcclxuXHJcbiAgICBzY2hvb2xHcmlkTmFtZSA9IFwic2Nob29sc0dyaWRcIjtcclxuICAgIGFkbWluR3JpZE5hbWUgPSBcImFkbWluc0dyaWRcIjtcclxuXHJcbiAgICBzY2hvb2xHcmlkOiBXMlVJLlcyR3JpZDtcclxuICAgIGFkbWluR3JpZDogVzJVSS5XMkdyaWQ7XHJcblxyXG4gICAgc2Nob29sRGF0YUxpc3Q6IFNjaG9vbERhdGFbXSA9IFtdO1xyXG5cclxuICAgIGNoZWNrUGVybWlzc2lvbih1c2VyOiBVc2VyRGF0YSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB1c2VyLmlzX2FkbWluO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEJ1dHRvbklkZW50aWZpZXIoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gXCJTY2h1bGVuIG1pdCBBZG1pbmlzdHJhdG9yZW5cIjtcclxuICAgIH1cclxuXHJcbiAgICBvbk1lbnVCdXR0b25QcmVzc2VkKCRtYWluSGVhZGluZzogSlF1ZXJ5PEhUTUxFbGVtZW50PiwgJHRhYmxlTGVmdDogSlF1ZXJ5PEhUTUxFbGVtZW50PixcclxuICAgICAgICAkdGFibGVSaWdodDogSlF1ZXJ5PEhUTUxFbGVtZW50PiwgJG1haW5Gb290ZXI6IEpRdWVyeTxIVE1MRWxlbWVudD4pIHtcclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnNjaG9vbEdyaWQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnNjaG9vbEdyaWQucmVuZGVyKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgJHRhYmxlTGVmdC53MmdyaWQoe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy5zY2hvb2xHcmlkTmFtZSxcclxuICAgICAgICAgICAgICAgIGhlYWRlcjogJ1NjaHVsZW4nLFxyXG4gICAgICAgICAgICAgICAgLy8gc2VsZWN0VHlwZTogXCJjZWxsXCIsXHJcbiAgICAgICAgICAgICAgICBtdWx0aVNlbGVjdDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzaG93OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2xiYXI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbGJhckFkZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0b29sYmFyRGVsZXRlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvb3RlcjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RDb2x1bW46IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbGJhclNlYXJjaDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICByZWNpZDogXCJpZFwiLFxyXG4gICAgICAgICAgICAgICAgY29sdW1uczogW1xyXG4gICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdpZCcsIGNhcHRpb246ICdJRCcsIHNpemU6ICcyMHB4Jywgc29ydGFibGU6IHRydWUsIGhpZGRlbjogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICduYW1lJywgY2FwdGlvbjogJ0JlemVpY2hudW5nJywgc2l6ZTogJzMwJScsIHNvcnRhYmxlOiB0cnVlLCByZXNpemFibGU6IHRydWUsIGVkaXRhYmxlOiB7IHR5cGU6ICd0ZXh0JyB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ2t1ZXJ6ZWwnLCBjYXB0aW9uOiAnS8O8cnplbCcsIHNpemU6ICcxMCUnLCBzb3J0YWJsZTogdHJ1ZSwgcmVzaXphYmxlOiB0cnVlLCBlZGl0YWJsZTogeyB0eXBlOiAndGV4dCcsIG1heGxlbmd0aDogXCIxMFwiIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICB7IGZpZWxkOiAnbnVtYmVyT2ZDbGFzc2VzJywgY2FwdGlvbjogJ0tsYXNzZW4nLCBzaXplOiAnMzAlJywgc29ydGFibGU6IHRydWUsIHJlc2l6YWJsZTogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdudW1iZXJPZlVzZXJzJywgY2FwdGlvbjogJ1VzZXInLCBzaXplOiAnMzAlJywgc29ydGFibGU6IHRydWUsIHJlc2l6YWJsZTogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHNlYXJjaGVzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ25hbWUnLCBsYWJlbDogJ0JlemVpY2hudW5nJywgdHlwZTogJ3RleHQnIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICBzb3J0RGF0YTogW3sgZmllbGQ6ICduYW1lJywgZGlyZWN0aW9uOiAnYXNjJyB9LCB7IGZpZWxkOiAna3VlcnplbCcsIGRpcmVjdGlvbjogJ2FzYycgfSxcclxuICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdudW1iZXJPZkNsYXNzZXMnLCBkaXJlY3Rpb246ICdhc2MnIH0sIHsgZmllbGQ6ICdudW1iZXJPZlVzZXJzJywgZGlyZWN0aW9uOiAnYXNjJyB9XSxcclxuICAgICAgICAgICAgICAgIG9uU2VsZWN0OiAoZXZlbnQpID0+IHsgZXZlbnQuZG9uZSgoKSA9PiB7IHRoYXQub25TZWxlY3RTY2hvb2woZXZlbnQpIH0pIH0sXHJcbiAgICAgICAgICAgICAgICBvblVuc2VsZWN0OiAoZXZlbnQpID0+IHsgdGhhdC5vblVuU2VsZWN0U2Nob29sKGV2ZW50KSB9LFxyXG4gICAgICAgICAgICAgICAgb25BZGQ6IChldmVudCkgPT4geyB0aGF0Lm9uQWRkU2Nob29sKCkgfSxcclxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoZXZlbnQpID0+IHsgdGhhdC5vblVwZGF0ZVNjaG9vbChldmVudCkgfSxcclxuICAgICAgICAgICAgICAgIG9uRGVsZXRlOiAoZXZlbnQpID0+IHsgdGhhdC5vbkRlbGV0ZVNjaG9vbChldmVudCkgfSxcclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2Nob29sR3JpZCA9IHcydWlbdGhpcy5zY2hvb2xHcmlkTmFtZV07XHJcblxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHRoaXMubG9hZFRhYmxlc0Zyb21TY2hvb2xPYmplY3QoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYWRtaW5HcmlkICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5hZG1pbkdyaWQucmVuZGVyKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgJHRhYmxlUmlnaHQudzJncmlkKHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuYWRtaW5HcmlkTmFtZSxcclxuICAgICAgICAgICAgICAgIGhlYWRlcjogJ1NjaHVsYWRtaW5zJyxcclxuICAgICAgICAgICAgICAgIC8vIHNlbGVjdFR5cGU6IFwiY2VsbFwiLFxyXG4gICAgICAgICAgICAgICAgc2hvdzoge1xyXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0b29sYmFyOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2xiYXJBZGQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbGJhckRlbGV0ZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBmb290ZXI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0Q29sdW1uOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2xiYXJTZWFyY2g6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2xiYXJJbnB1dDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0b29sYmFyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbXM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnYnJlYWsnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ2J1dHRvbicsIGlkOiAncGFzc3dvcmRCdXR0b24nLCB0ZXh0OiAnUGFzc3dvcnQgw6RuZGVybi4uLicgfSAvLywgaW1nOiAnZmEta2V5JyB9XHJcbiAgICAgICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAodGFyZ2V0LCBkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgPT0gXCJwYXNzd29yZEJ1dHRvblwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmNoYW5nZVBhc3N3b3JkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcmVjaWQ6IFwiaWRcIixcclxuICAgICAgICAgICAgICAgIGNvbHVtbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICB7IGZpZWxkOiAnaWQnLCBjYXB0aW9uOiAnSUQnLCBzaXplOiAnMjBweCcsIHNvcnRhYmxlOiB0cnVlLCBoaWRkZW46IHRydWUgfSxcclxuICAgICAgICAgICAgICAgICAgICB7IGZpZWxkOiAndXNlcm5hbWUnLCBjYXB0aW9uOiAnQmVudXR6ZXJuYW1lJywgc2l6ZTogJzMwJScsIHNvcnRhYmxlOiB0cnVlLCByZXNpemFibGU6IHRydWUsIGVkaXRhYmxlOiB7IHR5cGU6ICd0ZXh0JyB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ3J1Zm5hbWUnLCBjYXB0aW9uOiAnUnVmbmFtZScsIHNpemU6ICczMCUnLCBzb3J0YWJsZTogdHJ1ZSwgcmVzaXphYmxlOiB0cnVlLCBlZGl0YWJsZTogeyB0eXBlOiAndGV4dCcgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdmYW1pbGllbm5hbWUnLCBjYXB0aW9uOiAnRmFtaWxpZW5uYW1lJywgc2l6ZTogJzMwJScsIHNvcnRhYmxlOiB0cnVlLCByZXNpemFibGU6IHRydWUsIGVkaXRhYmxlOiB7IHR5cGU6ICd0ZXh0JyB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWVsZDogJ2lkJywgY2FwdGlvbjogJ1BXJywgc2l6ZTogJzQwcHgnLCBzb3J0YWJsZTogZmFsc2UsIHJlbmRlcjogKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz1cInB3X2J1dHRvblwiIHRpdGxlPVwiUGFzc3dvcnQgw6RuZGVyblwiIGRhdGEtcmVjaWQ9XCInICsgZS5yZWNpZCArICdcIiBzdHlsZT1cInZpc2liaWxpdHk6IGhpZGRlblwiPlBXITwvZGl2Pic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgc2VhcmNoZXM6IFtcclxuICAgICAgICAgICAgICAgICAgICB7IGZpZWxkOiAndXNlcm5hbWUnLCBsYWJlbDogJ0JlbnV0emVybmFtZScsIHR5cGU6ICd0ZXh0JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdydWZuYW1lJywgbGFiZWw6ICdSdWZuYW1lJywgdHlwZTogJ3RleHQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ2ZhbWlsaWVubmFtZScsIGxhYmVsOiAnRmFtaWxpZW5uYW1lJywgdHlwZTogJ3RleHQnIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICBzb3J0RGF0YTogW3sgZmllbGQ6ICdrbGFzc2UnLCBkaXJlY3Rpb246ICdhc2MnIH0sIHsgZmllbGQ6ICdmYW1pbGllbm5hbWUnLCBkaXJlY3Rpb246ICdhc2MnIH0sIHsgZmllbGQ6ICdydWZuYW1lJywgZGlyZWN0aW9uOiAnYXNjJyB9XSxcclxuICAgICAgICAgICAgICAgIG9uQWRkOiAoZXZlbnQpID0+IHsgdGhhdC5vbkFkZEFkbWluKCkgfSxcclxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoZXZlbnQpID0+IHsgdGhhdC5vblVwZGF0ZUFkbWluKGV2ZW50KSB9LFxyXG4gICAgICAgICAgICAgICAgb25EZWxldGU6IChldmVudCkgPT4geyB0aGF0Lm9uRGVsZXRlQWRtaW4oZXZlbnQpIH0sXHJcbiAgICAgICAgICAgICAgICBvblNlbGVjdDogKGV2ZW50KSA9PiB7IGV2ZW50LmRvbmUoKCkgPT4geyB0aGF0Lm9uU2VsZWN0QWRtaW4oZXZlbnQpIH0pIH0sXHJcbiAgICAgICAgICAgICAgICBvblVuc2VsZWN0OiAoZXZlbnQpID0+IHsgZXZlbnQuZG9uZSgoKSA9PiB7IHRoYXQub25TZWxlY3RBZG1pbihldmVudCkgfSkgfSxcclxuXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZG1pbkdyaWQgPSB3MnVpW3RoaXMuYWRtaW5HcmlkTmFtZV07XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgb25TZWxlY3RBZG1pbihldmVudDogYW55KSB7XHJcblxyXG4gICAgICAgIGxldCBhZG1pbkdyaWQgPSB3MnVpW3RoaXMuYWRtaW5HcmlkTmFtZV07XHJcblxyXG4gICAgICAgIC8vIGxldCBzZWxlY3Rpb24gPSBhZG1pbkdyaWQuZ2V0U2VsZWN0aW9uKCkubWFwKChzdHIpID0+IHN0ci5yZWNpZCkuZmlsdGVyKCh2YWx1ZSwgaW5kZXgsIGFycmF5KSA9PiBhcnJheS5pbmRleE9mKHZhbHVlKSA9PT0gaW5kZXgpO1xyXG5cclxuICAgICAgICBpZiAoZXZlbnQgIT0gbnVsbCAmJiBhZG1pbkdyaWQuZ2V0U2VsZWN0aW9uKCkubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIGFkbWluR3JpZC50b29sYmFyLmVuYWJsZSgncGFzc3dvcmRCdXR0b24nKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgYWRtaW5HcmlkLnRvb2xiYXIuZGlzYWJsZSgncGFzc3dvcmRCdXR0b24nKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgY2hhbmdlUGFzc3dvcmQocmVjSWRzOiBudW1iZXJbXSA9IFtdKSB7XHJcblxyXG4gICAgICAgIGlmIChyZWNJZHMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgcmVjSWRzID0gPG51bWJlcltdPnRoaXMuYWRtaW5HcmlkLmdldFNlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgLy8gcmVjSWRzID0gPGFueT50aGlzLmFkbWluR3JpZC5nZXRTZWxlY3Rpb24oKS5tYXAoKHN0cikgPT4gc3RyLnJlY2lkKS5maWx0ZXIoKHZhbHVlLCBpbmRleCwgYXJyYXkpID0+IGFycmF5LmluZGV4T2YodmFsdWUpID09PSBpbmRleCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocmVjSWRzLmxlbmd0aCAhPSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRtaW5HcmlkLmVycm9yKFwiWnVtIMOEbmRlcm4gZWluZXMgUGFzc3dvcnRzIG11c3MgZ2VuYXUgZWluIEFkbWluIGF1c2dld8OkaGx0IHdlcmRlbi5cIik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IGFkbWluOiBVc2VyRGF0YSA9IDxVc2VyRGF0YT50aGlzLmFkbWluR3JpZC5nZXQocmVjSWRzWzBdICsgXCJcIiwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHBhc3N3b3JkRm9yOiBzdHJpbmcgPSBhZG1pbi5ydWZuYW1lICsgXCIgXCIgKyBhZG1pbi5mYW1pbGllbm5hbWUgKyBcIiAoXCIgKyBhZG1pbi51c2VybmFtZSArIFwiKVwiO1xyXG5cclxuICAgICAgICAgICAgUGFzc3dvcmRQb3B1cC5vcGVuKHBhc3N3b3JkRm9yLCAoKSA9PiB7XHJcblxyXG4gICAgICAgICAgICB9LCAocGFzc3dvcmQpID0+IHtcclxuICAgICAgICAgICAgICAgIGFkbWluLnBhc3N3b3JkID0gcGFzc3dvcmQ7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3Q6IENSVURVc2VyUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInVwZGF0ZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGFkbWluLFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICB3MnV0aWxzLmxvY2soalF1ZXJ5KCdib2R5JyksIFwiQml0dGUgd2FydGVuLCBkYXMgSGFzaGVuIDxicj4gZGVzIFBhc3N3b3J0cyBrYW5uIDxicj5iaXMgenUgMSBNaW51dGU8YnI+IGRhdWVybi4uLlwiLCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBhamF4KFwiQ1JVRFVzZXJcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBDUlVEUmVzcG9uc2UpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICAgICAgdzJ1dGlscy51bmxvY2soalF1ZXJ5KCdib2R5JykpO1xyXG4gICAgICAgICAgICAgICAgICAgIHcyYWxlcnQoJ0RhcyBQYXNzd29ydCBmw7xyICcgKyBhZG1pbi5ydWZuYW1lICsgXCIgXCIgKyBhZG1pbi5mYW1pbGllbm5hbWUgKyBcIiAoXCIgKyBhZG1pbi51c2VybmFtZSArIFwiKSB3dXJkZSBlcmZvbGdyZWljaCBnZcOkbmRlcnQuXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIH0sICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICB3MnV0aWxzLnVubG9jayhqUXVlcnkoJ2JvZHknKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdzJhbGVydCgnRmVobGVyIGJlaW0gw4RuZGVybiBkZXMgUGFzc3dvcnRzIScpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG9uRGVsZXRlU2Nob29sKGV2ZW50OiBhbnkpIHtcclxuICAgICAgICBpZiAoIWV2ZW50LmZvcmNlIHx8IGV2ZW50LmlzU3RvcHBlZCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgcmVjSWRzOiBudW1iZXJbXSA9IDxudW1iZXJbXT50aGlzLnNjaG9vbEdyaWQuZ2V0U2VsZWN0aW9uKCk7XHJcblxyXG5cclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAvLyByZWNJZHMgPSA8YW55PnRoaXMuc2Nob29sR3JpZC5nZXRTZWxlY3Rpb24oKS5tYXAoKHN0cikgPT4gc3RyLnJlY2lkKS5maWx0ZXIoKHZhbHVlLCBpbmRleCwgYXJyYXkpID0+IGFycmF5LmluZGV4T2YodmFsdWUpID09PSBpbmRleCk7XHJcblxyXG4gICAgICAgIC8vIGxldCBzZWxlY3RlZFNjaG9vbHM6IFNjaG9vbERhdGFbXSA9IDxTY2hvb2xEYXRhW10+dGhpcy5zY2hvb2xHcmlkLnJlY29yZHMuZmlsdGVyKFxyXG4gICAgICAgIC8vICAgICAoY2Q6IFNjaG9vbERhdGEpID0+IHJlY0lkcy5pbmRleE9mKGNkLmlkKSA+PSAwKTtcclxuXHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBDUlVEU2Nob29sUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgdHlwZTogXCJkZWxldGVcIixcclxuICAgICAgICAgICAgZGF0YTogbnVsbCxcclxuICAgICAgICAgICAgaWQ6IHJlY0lkc1swXSxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFqYXgoXCJDUlVEU2Nob29sXCIsIHJlcXVlc3QsIChyZXNwb25zZTogQ1JVRFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nob29sR3JpZC5yZW1vdmUoXCJcIiArIHJlY0lkc1swXSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nob29sR3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgfSwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnNjaG9vbEdyaWQucmVmcmVzaCgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBvblVwZGF0ZVNjaG9vbChldmVudDogYW55KSB7XHJcblxyXG4gICAgICAgIGxldCBkYXRhOiBTY2hvb2xEYXRhID0gPFNjaG9vbERhdGE+dGhpcy5zY2hvb2xHcmlkLnJlY29yZHNbZXZlbnQuaW5kZXhdO1xyXG4gICAgICAgIGxldCBmaWVsZCA9IHRoaXMuc2Nob29sR3JpZC5jb2x1bW5zW2V2ZW50LmNvbHVtbl1bXCJmaWVsZFwiXTtcclxuICAgICAgICBkYXRhW2ZpZWxkXSA9IGV2ZW50LnZhbHVlX25ldztcclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IENSVURTY2hvb2xSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBcInVwZGF0ZVwiLFxyXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWpheChcIkNSVURTY2hvb2xcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBDUlVEUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhW1widzJ1aVwiXVtcImNoYW5nZXNcIl07XHJcbiAgICAgICAgICAgIHRoaXMuc2Nob29sR3JpZC5yZWZyZXNoQ2VsbChkYXRhW1wicmVjaWRcIl0sIGZpZWxkKTtcclxuICAgICAgICB9LCAoKSA9PiB7ICBcclxuICAgICAgICAgICAgZGF0YVtmaWVsZF0gPSBldmVudC52YWx1ZV9vcmlnaW5hbDtcclxuICAgICAgICAgICAgdGhpcy5zY2hvb2xHcmlkLnJlZnJlc2goKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBvbkFkZFNjaG9vbCgpIHtcclxuICAgICAgICBsZXQgcmVxdWVzdDogQ1JVRFNjaG9vbFJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFwiY3JlYXRlXCIsXHJcbiAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgIGlkOiAtMSxcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiTmFtZSBkZXIgU2NodWxlXCIsXHJcbiAgICAgICAgICAgICAgICBrdWVyemVsOiBcImt1ZXJ6ZWxcIixcclxuICAgICAgICAgICAgICAgIGNsYXNzZXM6IFtdLFxyXG4gICAgICAgICAgICAgICAgdXNlcnNXaXRob3V0Q2xhc3M6IFtdXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgYWpheChcIkNSVURTY2hvb2xcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBDUlVEUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgbGV0IGNkOiBTY2hvb2xEYXRhID0gcmVxdWVzdC5kYXRhO1xyXG4gICAgICAgICAgICBjZC5pZCA9IHJlc3BvbnNlLmlkO1xyXG4gICAgICAgICAgICB0aGlzLnNjaG9vbEdyaWQuYWRkKGNkKTtcclxuICAgICAgICAgICAgdGhpcy5zY2hvb2xHcmlkLmVkaXRGaWVsZChjZC5pZCArIFwiXCIsIDEsIHVuZGVmaW5lZCwgeyBrZXlDb2RlOiAxMyB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0VGV4dEluQ2VsbCgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9uU2VsZWN0U2Nob29sKGV2ZW50OiBhbnkpIHtcclxuXHJcbiAgICAgICAgbGV0IHJlY0lkczogbnVtYmVyW10gPSA8bnVtYmVyW10+dGhpcy5zY2hvb2xHcmlkLmdldFNlbGVjdGlvbigpO1xyXG4gICAgICAgIGlmIChyZWNJZHMubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfSBcclxuXHJcbiAgICAgICAgalF1ZXJ5KCcjam9fZXhwb3J0c2Nob29scyBhJykuYXR0cignaHJlZicsICdzZXJ2bGV0L2V4cG9ydFNjaG9vbHM/aWRzPScgKyByZWNJZHMuam9pbignLCcpKTtcclxuXHJcbiAgICAgICAgLy8gZXZlbnQuZG9uZSgoKSA9PiB7XHJcblxyXG4gICAgICAgIC8vIG9sZDogZm9yIHNlbGVjdHR5cGUgPSBcImNlbGxcIlxyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIC8vIHJlY0lkcyA9IDxhbnk+dGhpcy5zY2hvb2xHcmlkLmdldFNlbGVjdGlvbigpLm1hcCgoc3RyKSA9PiBzdHIucmVjaWQpLmZpbHRlcigodmFsdWUsIGluZGV4LCBhcnJheSkgPT4gYXJyYXkuaW5kZXhPZih2YWx1ZSkgPT09IGluZGV4KTtcclxuXHJcblxyXG4gICAgICAgIGxldCBzZWxlY3RlZFNjaG9vbHM6IFNjaG9vbERhdGFbXSA9IDxTY2hvb2xEYXRhW10+dGhpcy5zY2hvb2xHcmlkLnJlY29yZHMuZmlsdGVyKFxyXG4gICAgICAgICAgICAoY2Q6IFNjaG9vbERhdGEpID0+IHJlY0lkcy5pbmRleE9mKGNkLmlkKSA+PSAwKTtcclxuXHJcbiAgICAgICAgbGV0IGFkbWluTGlzdDogVXNlckRhdGFbXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBzYyBvZiBzZWxlY3RlZFNjaG9vbHMpIHtcclxuICAgICAgICAgICAgdGhpcy5hZG1pbkdyaWQuaGVhZGVyID0gXCJBZG1pbnMgZGVyIFNjaHVsZSBcIiArIHNjLm5hbWU7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHNkIG9mIHNjLnVzZXJzV2l0aG91dENsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2QuaXNfc2Nob29sYWRtaW4pIGFkbWluTGlzdC5wdXNoKHNkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRtaW5HcmlkLmNsZWFyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRtaW5HcmlkLmFkZChhZG1pbkxpc3QpO1xyXG4gICAgICAgICAgICB0aGlzLmFkbWluR3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgICAgIHRoaXMub25TZWxlY3RBZG1pbihudWxsKTsgICAgICAgICAgIC8vIHRvIGRpc2FibGUgXCJjaGFuZ2UgcGFzc3dvcmRcIi1CdXR0b25cclxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplUGFzc3dvcmRCdXR0b25zKCk7XHJcbiAgICAgICAgLy8gfSwgMjApO1xyXG5cclxuXHJcbiAgICAgICAgLy8gfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG9uVW5TZWxlY3RTY2hvb2woZXZlbnQpe1xyXG4gICAgICAgIHRoaXMuYWRtaW5HcmlkLmNsZWFyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkQnV0dG9ucygpIHtcclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGpRdWVyeSgnLnB3X2J1dHRvbicpLm9mZignY2xpY2snKTtcclxuICAgICAgICAgICAgalF1ZXJ5KCcucHdfYnV0dG9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCByZWNpZCA9IGpRdWVyeShlLnRhcmdldCkuZGF0YSgncmVjaWQnKTtcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmNoYW5nZVBhc3N3b3JkKFtyZWNpZF0pO1xyXG4gICAgICAgICAgICB9KS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xyXG4gICAgICAgIH0sIDEwMDApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBsb2FkVGFibGVzRnJvbVNjaG9vbE9iamVjdCgpIHtcclxuXHJcbiAgICAgICAgbGV0IHVzZXJEYXRhID0gdGhpcy5hZG1pbmlzdHJhdGlvbi51c2VyRGF0YTtcclxuICAgICAgICBsZXQgc2Nob29sX2lkID0gdXNlckRhdGEuc2NodWxlX2lkO1xyXG4gICAgICAgIGlmICh1c2VyRGF0YS5pc19hZG1pbikgc2Nob29sX2lkID0gbnVsbDtcclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IEdldFNjaG9vbERhdGFSZXF1ZXN0ID0geyBzY2hvb2xfaWQ6IHNjaG9vbF9pZCB9O1xyXG5cclxuICAgICAgICBhamF4KFwiZ2V0U2Nob29sRGF0YVwiLCByZXF1ZXN0LCAoZGF0YTogR2V0U2Nob29sRGF0YVJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nob29sRGF0YUxpc3QgPSBkYXRhLnNjaG9vbERhdGE7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nob29sR3JpZC5jbGVhcigpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5hZG1pbkdyaWQgIT0gbnVsbCkgdGhpcy5hZG1pbkdyaWQuY2xlYXIoKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IHNjaG9vbCBvZiB0aGlzLnNjaG9vbERhdGFMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICBzY2hvb2xbXCJudW1iZXJPZkNsYXNzZXNcIl0gPSBzY2hvb2wuY2xhc3Nlcy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBsZXQgbiA9IDA7XHJcbiAgICAgICAgICAgICAgICBzY2hvb2wuY2xhc3Nlcy5mb3JFYWNoKGMgPT4gbiArPSBjLnN0dWRlbnRzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBuICs9IHNjaG9vbC51c2Vyc1dpdGhvdXRDbGFzcy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBzY2hvb2xbXCJudW1iZXJPZlVzZXJzXCJdID0gbjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zY2hvb2xHcmlkLmFkZCh0aGlzLnNjaG9vbERhdGFMaXN0KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2Nob29sR3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgfSwgKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgIHcyYWxlcnQoJ0ZlaGxlciBiZWltIEhvbGVuIGRlciBEYXRlbjogJyArIGVycm9yKTtcclxuICAgICAgICAgICAgZGVidWdnZXI7XHJcbiAgICAgICAgfSk7XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBvbkRlbGV0ZUFkbWluKGV2ZW50OiBhbnkpIHtcclxuICAgICAgICBpZiAoIWV2ZW50LmZvcmNlIHx8IGV2ZW50LmlzU3RvcHBlZCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgcmVjSWRzOiBudW1iZXJbXSA9IDxudW1iZXJbXT50aGlzLmFkbWluR3JpZC5nZXRTZWxlY3Rpb24oKTtcclxuXHJcblxyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIC8vIHJlY0lkcyA9IDxhbnk+dGhpcy5hZG1pbkdyaWQuZ2V0U2VsZWN0aW9uKCkubWFwKChzdHIpID0+IHN0ci5yZWNpZCkuZmlsdGVyKCh2YWx1ZSwgaW5kZXgsIGFycmF5KSA9PiBhcnJheS5pbmRleE9mKHZhbHVlKSA9PT0gaW5kZXgpO1xyXG5cclxuICAgICAgICBsZXQgc2VsZWN0ZWRhZG1pbnM6IFVzZXJEYXRhW10gPSA8VXNlckRhdGFbXT50aGlzLmFkbWluR3JpZC5yZWNvcmRzLmZpbHRlcihcclxuICAgICAgICAgICAgKGNkOiBVc2VyRGF0YSkgPT4gcmVjSWRzLmluZGV4T2YoY2QuaWQpID49IDAgJiYgdGhpcy5hZG1pbmlzdHJhdGlvbi51c2VyRGF0YS5pZCAhPSBjZC5pZCk7XHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBDUlVEVXNlclJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFwiZGVsZXRlXCIsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgICAgIGlkczogcmVjSWRzLFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWpheChcIkNSVURVc2VyXCIsIHJlcXVlc3QsIChyZXNwb25zZTogQ1JVRFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIHJlY0lkcy5mb3JFYWNoKGlkID0+IHRoaXMuYWRtaW5HcmlkLnJlbW92ZShcIlwiICsgaWQpKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgc2Nob29sIG9mIHRoaXMuc2Nob29sRGF0YUxpc3QpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2Nob29sLnVzZXJzV2l0aG91dENsYXNzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlY0lkcy5pbmRleE9mKHNjaG9vbC51c2Vyc1dpdGhvdXRDbGFzc1tpXS5pZCkgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2hvb2wudXNlcnNXaXRob3V0Q2xhc3Muc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjaG9vbFtcIm51bWJlck9mVXNlcnNcIl0gLT0gMTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5hZG1pbkdyaWQucmVmcmVzaCgpO1xyXG4gICAgICAgICAgICB0aGlzLnNjaG9vbEdyaWQucmVmcmVzaCgpO1xyXG4gICAgICAgIH0sICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5hZG1pbkdyaWQucmVmcmVzaCgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBvblVwZGF0ZUFkbWluKGV2ZW50OiBhbnkpIHtcclxuXHJcbiAgICAgICAgbGV0IGRhdGE6IFVzZXJEYXRhID0gPFVzZXJEYXRhPnRoaXMuYWRtaW5HcmlkLnJlY29yZHNbZXZlbnQuaW5kZXhdO1xyXG4gICAgICAgIGxldCBmaWVsZDogc3RyaW5nID0gdGhpcy5hZG1pbkdyaWQuY29sdW1uc1tldmVudC5jb2x1bW5dW1wiZmllbGRcIl07XHJcbiAgICAgICAgZGF0YVtmaWVsZF0gPSBldmVudC52YWx1ZV9uZXc7XHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBDUlVEVXNlclJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFwidXBkYXRlXCIsXHJcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhamF4KFwiQ1JVRFVzZXJcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBDUlVEUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiBkYXRhW1widzJ1aVwiXVtcImNoYW5nZXNcIl0pIHtcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhW1widzJ1aVwiXVtcImNoYW5nZXNcIl1ba2V5XTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkYXRhW1widzJ1aVwiXVtcImNoYW5nZXNcIl0gPSBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmFkbWluR3JpZC5yZWZyZXNoQ2VsbChkYXRhW1wicmVjaWRcIl0sIGZpZWxkKVxyXG4gICAgICAgICAgICAvLyAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgLy8gdGhpcy5hZG1pbkdyaWQubGFzdC5pbkVkaXRNb2RlID0gZmFsc2U7XHJcbiAgICAgICAgfSwgKCkgPT4ge1xyXG4gICAgICAgICAgICBkYXRhW2ZpZWxkXSA9IGV2ZW50LnZhbHVlX29yaWdpbmFsO1xyXG4gICAgICAgICAgICAvLyB0aGlzLmFkbWluR3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG9uQWRkQWRtaW4oKSB7XHJcblxyXG4gICAgICAgIGxldCBzZWxlY3RlZFNjaG9vbHMgPSA8bnVtYmVyW10+dGhpcy5zY2hvb2xHcmlkLmdldFNlbGVjdGlvbigpO1xyXG4gICAgICAgIC8vIGxldCBzZWxlY3RlZFNjaG9vbHMgPSA8bnVtYmVyW10+dGhpcy5zY2hvb2xHcmlkLmdldFNlbGVjdGlvbigpLm1hcCgoZDogeyByZWNpZDogbnVtYmVyIH0pID0+IGQucmVjaWQpLmZpbHRlcigodmFsdWUsIGluZGV4LCBhcnJheSkgPT4gYXJyYXkuaW5kZXhPZih2YWx1ZSkgPT09IGluZGV4KTtcclxuICAgICAgICBpZiAoc2VsZWN0ZWRTY2hvb2xzLmxlbmd0aCAhPSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRtaW5HcmlkLmVycm9yKFwiV2VubiBTaWUgQWRtaW5zIGhpbnp1ZsO8Z2VuIG3DtmNodGVuIG11c3MgbGlua3MgZ2VuYXUgZWluZSBTY2h1bGUgYXVzZ2V3w6RobHQgc2Vpbi5cIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHNjaG9vbElkID0gc2VsZWN0ZWRTY2hvb2xzWzBdO1xyXG4gICAgICAgIGxldCBzY2hvb2wgPSA8U2Nob29sRGF0YT50aGlzLnNjaG9vbEdyaWQuZ2V0KFwiXCIgKyBzY2hvb2xJZCwgZmFsc2UpO1xyXG5cclxuICAgICAgICBsZXQgcmVxdWVzdDogQ1JVRFVzZXJSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBcImNyZWF0ZVwiLFxyXG4gICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICBpZDogLTEsXHJcbiAgICAgICAgICAgICAgICBzY2h1bGVfaWQ6IHNjaG9vbElkLFxyXG4gICAgICAgICAgICAgICAga2xhc3NlX2lkOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6IFwiQmVudXR6ZXJuYW1lXCIgKyBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCksXHJcbiAgICAgICAgICAgICAgICBydWZuYW1lOiBcIlJ1Zm5hbWVcIixcclxuICAgICAgICAgICAgICAgIGZhbWlsaWVubmFtZTogXCJGYW1pbGllbm5hbWVcIixcclxuICAgICAgICAgICAgICAgIGlzX2FkbWluOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGlzX3NjaG9vbGFkbWluOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgaXNfdGVhY2hlcjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCkgKyBcInhcIlxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGFqYXgoXCJDUlVEVXNlclwiLCByZXF1ZXN0LCAocmVzcG9uc2U6IENSVURSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgdWQ6IFVzZXJEYXRhID0gcmVxdWVzdC5kYXRhO1xyXG4gICAgICAgICAgICB1ZC5pZCA9IHJlc3BvbnNlLmlkO1xyXG4gICAgICAgICAgICB0aGlzLmFkbWluR3JpZC5hZGQodWQpO1xyXG4gICAgICAgICAgICB0aGlzLmFkbWluR3JpZC5lZGl0RmllbGQodWQuaWQgKyBcIlwiLCAxLCB1bmRlZmluZWQsIHsga2V5Q29kZTogMTMgfSk7XHJcbiAgICAgICAgICAgIHNjaG9vbC51c2Vyc1dpdGhvdXRDbGFzcy5wdXNoKHVkKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0VGV4dEluQ2VsbCgpO1xyXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVQYXNzd29yZEJ1dHRvbnMoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcblxyXG59Il19