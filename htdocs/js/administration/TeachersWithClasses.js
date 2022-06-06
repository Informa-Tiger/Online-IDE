import { AdminMenuItem } from "./AdminMenuItem.js";
import { ajax } from "../communication/AjaxHelper.js";
import { PasswordPopup } from "./PasswordPopup.js";
export class TeachersWithClassesMI extends AdminMenuItem {
    constructor() {
        super(...arguments);
        this.classesGridName = "tgClassesGrid";
        this.teachersGridName = "TgTeachersGrid";
        this.teacherDataList = [];
    }
    checkPermission(user) {
        return user.is_schooladmin;
    }
    getButtonIdentifier() {
        return "Lehrkräfte mit Klassen";
    }
    onMenuButtonPressed($mainHeading, $tableLeft, $tableRight, $mainFooter) {
        let that = this;
        if (this.teachersGrid != null) {
            this.teachersGrid.render();
        }
        else {
            $tableLeft.w2grid({
                name: this.teachersGridName,
                header: 'Lehrkräfte',
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
                        field: 'numberOfClasses', caption: 'Klassen', size: '30%', sortable: true, resizable: true,
                        render: function (record) {
                            return '<div>' + record.classes.length + '</div>';
                        }
                    },
                    {
                        field: 'id', caption: 'PW', size: '40px', sortable: false, render: (e) => {
                            return '<div class="pw_button" title="Passwort ändern" style="visibility: hidden" data-recid="' + e.recid + '">PW!</div>';
                        }
                    }
                ],
                searches: [
                    { field: 'username', label: 'Benutzername', type: 'text' },
                    { field: 'rufname', label: 'Rufname', type: 'text' },
                    { field: 'familienname', label: 'Familienname', type: 'text' }
                ],
                sortData: [{ field: 'familienname', direction: 'asc' }, { field: 'rufname', direction: 'asc' }],
                onSelect: (event) => { event.done(() => { that.onSelectTeacher(event); }); },
                onUnselect: (event) => { that.onUnSelectTeacher(event); },
                onAdd: (event) => { that.onAddTeacher(); },
                onChange: (event) => { that.onUpdateTeacher(event); },
                onDelete: (event) => { that.onDeleteTeacher(event); },
            });
            this.teachersGrid = w2ui[this.teachersGridName];
        }
        this.loadTablesFromTeacherObject();
        this.initializePasswordButtons();
        if (this.classesGrid != null) {
            this.classesGrid.render();
        }
        else {
            $tableRight.w2grid({
                name: this.classesGridName,
                header: 'Klassen',
                // selectType: "cell",
                multiSelect: true,
                show: {
                    header: true,
                    toolbar: true,
                    toolbarAdd: true,
                    toolbarDelete: true,
                    footer: true,
                    selectColumn: true
                },
                recid: "id",
                columns: [
                    { field: 'id', caption: 'ID', size: '20px', sortable: true, hidden: true },
                    { field: 'name', caption: 'Name', size: '30%', sortable: true, resizable: true, editable: { type: 'text' } },
                    {
                        field: 'teacher', caption: 'Lehrkraft', size: '30%', sortable: true, resizable: true,
                        editable: { type: 'list', items: that.teacherDataList, filter: false }
                    },
                    {
                        field: 'teacher2', caption: 'Zweitlehrkraft', size: '30%', sortable: true, resizable: true,
                        render: function (record) {
                            let teacher = that.teacherDataList.find(td => td.userData.id == record.zweitlehrkraft_id);
                            if (teacher != null) {
                                return '<div>' + teacher.userData.rufname + " " + teacher.userData.familienname + '</div>';
                            }
                        },
                        editable: { type: 'list', items: that.teacherDataList.slice(0).concat([{
                                    //@ts-ignore
                                    userData: { id: -1, rufname: "Keine Zweitlehrkraft", familienname: "" },
                                    classes: [],
                                    id: -1,
                                    text: "Keine Zweitlehrkraft"
                                }]), filter: false }
                    },
                ],
                searches: [
                    { field: 'name', label: 'Name', type: 'text' },
                ],
                sortData: [{ field: 'name', direction: 'asc' }],
                onAdd: (event) => { that.onAddClass(); },
                onChange: (event) => { that.onUpdateClass(event); },
                onDelete: (event) => { that.onDeleteClass(event); },
            });
            this.classesGrid = w2ui[this.classesGridName];
        }
    }
    initializePasswordButtons() {
        setTimeout(() => {
            jQuery('.pw_button').off('click');
            let that = this;
            jQuery('.pw_button').on('click', (e) => {
                let recid = jQuery(e.target).data('recid');
                e.preventDefault();
                e.stopPropagation();
                that.changePassword([recid]);
            }).css('visibility', 'visible');
        }, 1000);
    }
    changePassword(recIds = []) {
        if (recIds.length == 0) {
            recIds = this.teachersGrid.getSelection();
            //@ts-ignore
            //recIds = <any>this.teachersGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        }
        if (recIds.length != 1) {
            this.teachersGrid.error("Zum Ändern eines Passworts muss genau eine Lehrkraft ausgewählt werden.");
        }
        else {
            let teacher = (this.teachersGrid.get(recIds[0] + "", false)["userData"]);
            let passwordFor = teacher.rufname + " " + teacher.familienname + " (" + teacher.username + ")";
            PasswordPopup.open(passwordFor, () => { }, (password) => {
                teacher.password = password;
                let request = {
                    type: "update",
                    data: teacher,
                };
                //@ts-ignore
                w2utils.lock(jQuery('body'), "Bitte warten, das Hashen <br> des Passworts kann <br>bis zu 1 Minute<br> dauern...", true);
                ajax("CRUDUser", request, (response) => {
                    //@ts-ignore
                    w2utils.unlock(jQuery('body'));
                    w2alert('Das Passwort für ' + teacher.rufname + " " + teacher.familienname + " (" + teacher.username + ") wurde erfolgreich geändert.");
                }, () => {
                    //@ts-ignore
                    w2utils.unlock(jQuery('body'));
                    w2alert('Fehler beim Ändern des Passworts!');
                });
            });
        }
    }
    onAddTeacher() {
        let schoolId = this.administration.userData.schule_id;
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
                is_schooladmin: false,
                is_teacher: true,
                password: Math.round(Math.random() * 10000000) + "x"
            },
        };
        ajax("CRUDUser", request, (response) => {
            let ud = request.data;
            ud.id = response.id;
            let teacherData = {
                userData: ud,
                classes: [],
                username: ud.username,
                familienname: ud.familienname,
                rufname: ud.rufname,
                id: ud.id,
                text: ud.rufname + " " + ud.familienname
            };
            this.teachersGrid.add(teacherData);
            this.teachersGrid.editField(ud.id + "", 1, undefined, { keyCode: 13 });
            this.teacherDataList.push(teacherData);
            this.selectTextInCell();
            this.initializePasswordButtons();
        });
    }
    onUnSelectTeacher(event) {
        this.classesGrid.clear();
    }
    onSelectTeacher(event) {
        let recIds = this.teachersGrid.getSelection();
        if (recIds.length != 1)
            return;
        // //@ts-ignore
        // recIds = <any>this.teachersGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        if (recIds.length == 1) {
            //@ts-ignore
            this.teachersGrid.toolbar.enable('passwordButton');
        }
        else {
            //@ts-ignore
            this.teachersGrid.toolbar.disable('passwordButton');
        }
        let selectedTeachers = this.teacherDataList.filter((cd) => recIds.indexOf(cd.userData.id) >= 0);
        let classesList = [];
        for (let sc of selectedTeachers) {
            for (let sd of sc.classes) {
                sd["teacher"] = sc.userData.rufname + " " + sc.userData.familienname;
                let teacher2 = this.teacherDataList.find(td => td.userData.id == sd.zweitlehrkraft_id);
                if (teacher2 != null) {
                    sd["teacher2"] = sc.userData.rufname + " " + sc.userData.familienname;
                }
                classesList.push(sd);
            }
        }
        this.classesGrid.clear();
        this.classesGrid.add(classesList);
        this.classesGrid.refresh();
    }
    loadTablesFromTeacherObject() {
        let request = { school_id: this.administration.userData.schule_id };
        ajax("getTeacherData", request, (data) => {
            this.teacherDataList = data.teacherData;
            this.teachersGrid.clear();
            for (let teacher of this.teacherDataList) {
                teacher["id"] = teacher.userData.id;
                teacher["username"] = teacher.userData.username;
                teacher["familienname"] = teacher.userData.familienname;
                teacher["rufname"] = teacher.userData.rufname;
                teacher["text"] = teacher.userData.rufname + " " + teacher.userData.familienname;
            }
            this.teachersGrid.add(this.teacherDataList);
            this.teachersGrid.refresh();
            if (this.classesGrid != null) {
                this.classesGrid.columns[2]["editable"].items = this.teacherDataList;
                this.classesGrid.columns[3]["editable"].items = this.teacherDataList;
                this.classesGrid.clear();
            }
        }, () => {
            w2alert('Fehler beim Holen der Daten.');
        });
    }
    onDeleteTeacher(event) {
        if (!event.force || event.isStopped)
            return;
        let recIds;
        recIds = this.teachersGrid.getSelection();
        //@ts-ignore
        // recIds = <any>this.teachersGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        // let selectedteachers: TeacherData[] = <TeacherData[]>this.teachersGrid.records.filter(
        //     (cd: TeacherData) => recIds.indexOf(cd.userData.id) >= 0 && this.administration.userData.id != cd.userData.id);
        let request = {
            type: "delete",
            data: null,
            ids: recIds,
        };
        ajax("CRUDUser", request, (response) => {
            recIds.forEach(id => this.teachersGrid.remove("" + id));
            for (let i = 0; i < this.teacherDataList.length; i++) {
                if (recIds.indexOf(this.teacherDataList[i].userData.id) >= 0) {
                    this.teacherDataList.splice(i, 1);
                    i--;
                }
            }
            this.teachersGrid.refresh();
            this.classesGrid.clear();
        }, () => {
            this.teachersGrid.refresh();
        });
    }
    onUpdateTeacher(event) {
        let data = this.teachersGrid.records[event.index];
        let field = this.teachersGrid.columns[event.column]["field"];
        data.userData[field] = event.value_new;
        data[field] = event.value_new;
        data.userData.password = null;
        let request = {
            type: "update",
            data: data.userData,
        };
        ajax("CRUDUser", request, (response) => {
            // console.log(data);
            // for (let key in data["w2ui"]["changes"]) {
            delete data["w2ui"]["changes"][field];
            // }
            this.teachersGrid.refreshCell(data["recid"], field);
        }, () => {
            data.userData[field] = event.value_original;
            data[field] = event.value_original;
            delete data["w2ui"]["changes"][field];
            this.teachersGrid.refreshCell(data["recid"], field);
        });
    }
    onAddClass() {
        let selectedTeachers = this.teachersGrid.getSelection();
        // let selectedTeachers = <number[]>this.teachersGrid.getSelection().map((d: { recid: number }) => d.recid).filter((value, index, array) => array.indexOf(value) === index);
        if (selectedTeachers.length != 1) {
            this.classesGrid.error("Wenn Sie Klassen hinzufügen möchten muss links genau eine Lehrkraft ausgewählt sein.");
            return;
        }
        let teacherId = selectedTeachers[0];
        let teacherData = this.teachersGrid.get("" + teacherId, false);
        let request = {
            type: "create",
            data: {
                id: -1,
                name: "Name",
                lehrkraft_id: teacherId,
                zweitlehrkraft_id: null,
                schule_id: teacherData.userData.schule_id,
                aktiv: true,
                students: []
            },
        };
        ajax("CRUDClass", request, (response) => {
            let cd = request.data;
            cd.id = response.id;
            cd["teacher"] = teacherData.userData.rufname + " " + teacherData.userData.familienname;
            this.classesGrid.add(cd);
            this.classesGrid.editField(cd.id + "", 1, undefined, { keyCode: 13 });
            teacherData.classes.push(cd);
            this.selectTextInCell();
        });
    }
    onDeleteClass(event) {
        if (!event.force || event.isStopped)
            return;
        let recIds = this.classesGrid.getSelection();
        //@ts-ignore
        // recIds = <any>this.classesGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        // let selectedClasss: ClassData[] = <ClassData[]>this.classesGrid.records.filter(
        //     (cd: ClassData) => recIds.indexOf(cd.id) >= 0);
        let request = {
            type: "delete",
            data: null,
            ids: recIds,
        };
        ajax("CRUDClass", request, (response) => {
            recIds.forEach(id => {
                let cd = this.classesGrid.get(id + "");
                this.classesGrid.remove("" + id);
                let ld = this.teachersGrid.get(cd.lehrkraft_id + "");
                if (ld != null) {
                    ld.classes = ld.classes.filter((cl) => cl.id != cd.id);
                }
            });
            this.classesGrid.refresh();
        }, () => {
            this.classesGrid.refresh();
        });
    }
    onUpdateClass(event) {
        let data = this.classesGrid.records[event.index];
        if (event.column == 2) {
            let teacher = event.value_new;
            if (teacher == null || typeof teacher == "string") {
                this.classesGrid.refresh();
                return;
            }
            else {
                let teacherOld1 = this.teacherDataList.find((td) => td.userData.id == data.lehrkraft_id);
                if (teacherOld1 != null)
                    teacherOld1.classes = teacherOld1.classes.filter(cd => cd.id != data.id);
                // let teacherOld2 = this.teachersGrid.get(data.lehrkraft_id + "");
                // if (teacherOld2 != null) teacherOld1.classes = teacherOld1.classes.filter(cd => cd.id != data.id);
                data.lehrkraft_id = teacher.userData.id;
                teacher.classes.push(data);
                let teacherNew2 = this.teachersGrid.get(teacher.userData.id + "");
                if (teacherNew2 != null)
                    teacherNew2.classes.push(data);
                event.value_new = teacher.userData.rufname + " " + teacher.userData.familienname;
            }
        }
        if (event.column == 3) {
            let teacher = event.value_new;
            if (teacher == null || typeof teacher == "string") {
                this.classesGrid.refresh();
                return;
            }
            else {
                let teacherOld1 = this.teacherDataList.find((td) => td.userData.id == data.zweitlehrkraft_id);
                if (teacherOld1 != null)
                    teacherOld1.classes = teacherOld1.classes.filter(cd => cd.id != data.id);
                // let teacherOld2 = this.teachersGrid.get(data.zweitlehrkraft_id + "");
                // if (teacherOld2 != null) teacherOld1.classes = teacherOld1.classes.filter(cd => cd.id != data.id);
                data.zweitlehrkraft_id = teacher.userData.id == -1 ? null : teacher.userData.id;
                teacher.classes.push(data);
                let teacherNew2 = this.teachersGrid.get(teacher.userData.id + "");
                if (teacherNew2 != null)
                    teacherNew2.classes.push(data);
                event.value_new = teacher.userData.rufname + " " + teacher.userData.familienname;
            }
        }
        let field = this.classesGrid.columns[event.column]["field"];
        data[field] = event.value_new;
        let request = {
            type: "update",
            data: data,
        };
        ajax("CRUDClass", request, (response) => {
            if (data["w2ui"]["changes"][field] != null) {
                delete data["w2ui"]["changes"][field];
            }
            this.classesGrid.refreshCell(data["recid"], field);
        }, () => {
            data[field] = event.value_original;
            delete data["w2ui"]["changes"][field];
            this.classesGrid.refreshCell(data["recid"], field);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGVhY2hlcnNXaXRoQ2xhc3Nlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGllbnQvYWRtaW5pc3RyYXRpb24vVGVhY2hlcnNXaXRoQ2xhc3Nlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFbkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3RELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUtuRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsYUFBYTtJQUF4RDs7UUFFSSxvQkFBZSxHQUFHLGVBQWUsQ0FBQztRQUNsQyxxQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQztRQUtwQyxvQkFBZSxHQUFrQixFQUFFLENBQUM7SUFrZ0J4QyxDQUFDO0lBaGdCRyxlQUFlLENBQUMsSUFBYztRQUMxQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDL0IsQ0FBQztJQUVELG1CQUFtQjtRQUNmLE9BQU8sd0JBQXdCLENBQUM7SUFDcEMsQ0FBQztJQUVELG1CQUFtQixDQUFDLFlBQWlDLEVBQUUsVUFBK0IsRUFDbEYsV0FBZ0MsRUFBRSxXQUFnQztRQUNsRSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFFaEIsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksRUFBRTtZQUMzQixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQzlCO2FBQU07WUFDSCxVQUFVLENBQUMsTUFBTSxDQUFDO2dCQUNkLElBQUksRUFBRSxJQUFJLENBQUMsZ0JBQWdCO2dCQUMzQixNQUFNLEVBQUUsWUFBWTtnQkFDcEIsc0JBQXNCO2dCQUN0QixXQUFXLEVBQUUsS0FBSztnQkFDbEIsSUFBSSxFQUFFO29CQUNGLE1BQU0sRUFBRSxJQUFJO29CQUNaLE9BQU8sRUFBRSxJQUFJO29CQUNiLFVBQVUsRUFB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QUFLLENBQUMsQ0FBQztRQUN2RCxDQUFDLEVBQUUsR0FBRyxFQUFFO1lBQ0osSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUM7WUFDbkMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUdKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQWRtaW5NZW51SXRlbSB9IGZyb20gXCIuL0FkbWluTWVudUl0ZW0uanNcIjtcclxuaW1wb3J0IHsgVXNlckRhdGEsIENSVURVc2VyUmVxdWVzdCwgQ1JVRFNjaG9vbFJlcXVlc3QsIENSVURSZXNwb25zZSwgU2Nob29sRGF0YSwgR2V0U2Nob29sRGF0YVJlcXVlc3QsIEdldFNjaG9vbERhdGFSZXNwb25zZSwgVGVhY2hlckRhdGEsIENsYXNzRGF0YSwgQ1JVRENsYXNzUmVxdWVzdCwgR2V0VGVhY2hlckRhdGFSZXF1ZXN0LCBHZXRUZWFjaGVyRGF0YVJlc3BvbnNlIH0gZnJvbSBcIi4uL2NvbW11bmljYXRpb24vRGF0YS5qc1wiO1xyXG5pbXBvcnQgeyBhamF4IH0gZnJvbSBcIi4uL2NvbW11bmljYXRpb24vQWpheEhlbHBlci5qc1wiO1xyXG5pbXBvcnQgeyBQYXNzd29yZFBvcHVwIH0gZnJvbSBcIi4vUGFzc3dvcmRQb3B1cC5qc1wiO1xyXG5cclxuZGVjbGFyZSB2YXIgdzJwcm9tcHQ6IGFueTtcclxuZGVjbGFyZSB2YXIgdzJhbGVydDogYW55O1xyXG5cclxuZXhwb3J0IGNsYXNzIFRlYWNoZXJzV2l0aENsYXNzZXNNSSBleHRlbmRzIEFkbWluTWVudUl0ZW0ge1xyXG5cclxuICAgIGNsYXNzZXNHcmlkTmFtZSA9IFwidGdDbGFzc2VzR3JpZFwiO1xyXG4gICAgdGVhY2hlcnNHcmlkTmFtZSA9IFwiVGdUZWFjaGVyc0dyaWRcIjtcclxuXHJcbiAgICBjbGFzc2VzR3JpZDogVzJVSS5XMkdyaWQ7XHJcbiAgICB0ZWFjaGVyc0dyaWQ6IFcyVUkuVzJHcmlkO1xyXG5cclxuICAgIHRlYWNoZXJEYXRhTGlzdDogVGVhY2hlckRhdGFbXSA9IFtdO1xyXG5cclxuICAgIGNoZWNrUGVybWlzc2lvbih1c2VyOiBVc2VyRGF0YSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB1c2VyLmlzX3NjaG9vbGFkbWluO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEJ1dHRvbklkZW50aWZpZXIoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gXCJMZWhya3LDpGZ0ZSBtaXQgS2xhc3NlblwiO1xyXG4gICAgfVxyXG5cclxuICAgIG9uTWVudUJ1dHRvblByZXNzZWQoJG1haW5IZWFkaW5nOiBKUXVlcnk8SFRNTEVsZW1lbnQ+LCAkdGFibGVMZWZ0OiBKUXVlcnk8SFRNTEVsZW1lbnQ+LFxyXG4gICAgICAgICR0YWJsZVJpZ2h0OiBKUXVlcnk8SFRNTEVsZW1lbnQ+LCAkbWFpbkZvb3RlcjogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgaWYgKHRoaXMudGVhY2hlcnNHcmlkICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy50ZWFjaGVyc0dyaWQucmVuZGVyKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgJHRhYmxlTGVmdC53MmdyaWQoe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy50ZWFjaGVyc0dyaWROYW1lLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyOiAnTGVocmtyw6RmdGUnLFxyXG4gICAgICAgICAgICAgICAgLy8gc2VsZWN0VHlwZTogXCJjZWxsXCIsXHJcbiAgICAgICAgICAgICAgICBtdWx0aVNlbGVjdDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzaG93OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2xiYXI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbGJhckFkZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0b29sYmFyRGVsZXRlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvb3RlcjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RDb2x1bW46IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbGJhclNlYXJjaDogZmFsc2VcclxuXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgdG9vbGJhcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ2JyZWFrJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdidXR0b24nLCBpZDogJ3Bhc3N3b3JkQnV0dG9uJywgdGV4dDogJ1Bhc3N3b3J0IMOkbmRlcm4uLi4nIH0gLy8sIGltZzogJ2ZhLWtleScgfVxyXG4gICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKHRhcmdldCwgZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0ID09IFwicGFzc3dvcmRCdXR0b25cIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jaGFuZ2VQYXNzd29yZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHJlY2lkOiBcImlkXCIsXHJcbiAgICAgICAgICAgICAgICBjb2x1bW5zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ2lkJywgY2FwdGlvbjogJ0lEJywgc2l6ZTogJzIwcHgnLCBzb3J0YWJsZTogdHJ1ZSwgaGlkZGVuOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ3VzZXJuYW1lJywgY2FwdGlvbjogJ0JlbnV0emVybmFtZScsIHNpemU6ICczMCUnLCBzb3J0YWJsZTogdHJ1ZSwgcmVzaXphYmxlOiB0cnVlLCBlZGl0YWJsZTogeyB0eXBlOiAndGV4dCcgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdydWZuYW1lJywgY2FwdGlvbjogJ1J1Zm5hbWUnLCBzaXplOiAnMzAlJywgc29ydGFibGU6IHRydWUsIHJlc2l6YWJsZTogdHJ1ZSwgZWRpdGFibGU6IHsgdHlwZTogJ3RleHQnIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICB7IGZpZWxkOiAnZmFtaWxpZW5uYW1lJywgY2FwdGlvbjogJ0ZhbWlsaWVubmFtZScsIHNpemU6ICczMCUnLCBzb3J0YWJsZTogdHJ1ZSwgcmVzaXphYmxlOiB0cnVlLCBlZGl0YWJsZTogeyB0eXBlOiAndGV4dCcgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmllbGQ6ICdudW1iZXJPZkNsYXNzZXMnLCBjYXB0aW9uOiAnS2xhc3NlbicsIHNpemU6ICczMCUnLCBzb3J0YWJsZTogdHJ1ZSwgcmVzaXphYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uIChyZWNvcmQ6IFRlYWNoZXJEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJzxkaXY+JyArIHJlY29yZC5jbGFzc2VzLmxlbmd0aCArICc8L2Rpdj4nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkOiAnaWQnLCBjYXB0aW9uOiAnUFcnLCBzaXplOiAnNDBweCcsIHNvcnRhYmxlOiBmYWxzZSwgcmVuZGVyOiAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwicHdfYnV0dG9uXCIgdGl0bGU9XCJQYXNzd29ydCDDpG5kZXJuXCIgc3R5bGU9XCJ2aXNpYmlsaXR5OiBoaWRkZW5cIiBkYXRhLXJlY2lkPVwiJyArIGUucmVjaWQgKyAnXCI+UFchPC9kaXY+JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICBzZWFyY2hlczogW1xyXG4gICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICd1c2VybmFtZScsIGxhYmVsOiAnQmVudXR6ZXJuYW1lJywgdHlwZTogJ3RleHQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ3J1Zm5hbWUnLCBsYWJlbDogJ1J1Zm5hbWUnLCB0eXBlOiAndGV4dCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB7IGZpZWxkOiAnZmFtaWxpZW5uYW1lJywgbGFiZWw6ICdGYW1pbGllbm5hbWUnLCB0eXBlOiAndGV4dCcgfVxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHNvcnREYXRhOiBbeyBmaWVsZDogJ2ZhbWlsaWVubmFtZScsIGRpcmVjdGlvbjogJ2FzYycgfSwgeyBmaWVsZDogJ3J1Zm5hbWUnLCBkaXJlY3Rpb246ICdhc2MnIH1dLFxyXG4gICAgICAgICAgICAgICAgb25TZWxlY3Q6IChldmVudCkgPT4geyBldmVudC5kb25lKCgpID0+IHsgdGhhdC5vblNlbGVjdFRlYWNoZXIoZXZlbnQpIH0pIH0sXHJcbiAgICAgICAgICAgICAgICBvblVuc2VsZWN0OiAoZXZlbnQpID0+IHsgdGhhdC5vblVuU2VsZWN0VGVhY2hlcihldmVudCkgfSxcclxuICAgICAgICAgICAgICAgIG9uQWRkOiAoZXZlbnQpID0+IHsgdGhhdC5vbkFkZFRlYWNoZXIoKSB9LFxyXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IChldmVudCkgPT4geyB0aGF0Lm9uVXBkYXRlVGVhY2hlcihldmVudCkgfSxcclxuICAgICAgICAgICAgICAgIG9uRGVsZXRlOiAoZXZlbnQpID0+IHsgdGhhdC5vbkRlbGV0ZVRlYWNoZXIoZXZlbnQpIH0sXHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICB0aGlzLnRlYWNoZXJzR3JpZCA9IHcydWlbdGhpcy50ZWFjaGVyc0dyaWROYW1lXTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxvYWRUYWJsZXNGcm9tVGVhY2hlck9iamVjdCgpO1xyXG5cclxuICAgICAgICB0aGlzLmluaXRpYWxpemVQYXNzd29yZEJ1dHRvbnMoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY2xhc3Nlc0dyaWQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmNsYXNzZXNHcmlkLnJlbmRlcigpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICR0YWJsZVJpZ2h0LncyZ3JpZCh7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmNsYXNzZXNHcmlkTmFtZSxcclxuICAgICAgICAgICAgICAgIGhlYWRlcjogJ0tsYXNzZW4nLFxyXG4gICAgICAgICAgICAgICAgLy8gc2VsZWN0VHlwZTogXCJjZWxsXCIsXHJcbiAgICAgICAgICAgICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHNob3c6IHtcclxuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbGJhcjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0b29sYmFyQWRkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2xiYXJEZWxldGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZm9vdGVyOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdENvbHVtbjogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHJlY2lkOiBcImlkXCIsXHJcbiAgICAgICAgICAgICAgICBjb2x1bW5zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ2lkJywgY2FwdGlvbjogJ0lEJywgc2l6ZTogJzIwcHgnLCBzb3J0YWJsZTogdHJ1ZSwgaGlkZGVuOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ25hbWUnLCBjYXB0aW9uOiAnTmFtZScsIHNpemU6ICczMCUnLCBzb3J0YWJsZTogdHJ1ZSwgcmVzaXphYmxlOiB0cnVlLCBlZGl0YWJsZTogeyB0eXBlOiAndGV4dCcgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmllbGQ6ICd0ZWFjaGVyJywgY2FwdGlvbjogJ0xlaHJrcmFmdCcsIHNpemU6ICczMCUnLCBzb3J0YWJsZTogdHJ1ZSwgcmVzaXphYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0YWJsZTogeyB0eXBlOiAnbGlzdCcsIGl0ZW1zOiB0aGF0LnRlYWNoZXJEYXRhTGlzdCwgZmlsdGVyOiBmYWxzZSB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkOiAndGVhY2hlcjInLCBjYXB0aW9uOiAnWndlaXRsZWhya3JhZnQnLCBzaXplOiAnMzAlJywgc29ydGFibGU6IHRydWUsIHJlc2l6YWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbiAocmVjb3JkOiBDbGFzc0RhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZWFjaGVyID0gdGhhdC50ZWFjaGVyRGF0YUxpc3QuZmluZCh0ZCA9PiB0ZC51c2VyRGF0YS5pZCA9PSByZWNvcmQuendlaXRsZWhya3JhZnRfaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRlYWNoZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnPGRpdj4nICsgdGVhY2hlci51c2VyRGF0YS5ydWZuYW1lICsgXCIgXCIgKyB0ZWFjaGVyLnVzZXJEYXRhLmZhbWlsaWVubmFtZSArICc8L2Rpdj4nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0YWJsZTogeyB0eXBlOiAnbGlzdCcsIGl0ZW1zOiB0aGF0LnRlYWNoZXJEYXRhTGlzdC5zbGljZSgwKS5jb25jYXQoW3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlckRhdGE6IHtpZDogLTEsIHJ1Zm5hbWU6IFwiS2VpbmUgWndlaXRsZWhya3JhZnRcIiwgZmFtaWxpZW5uYW1lOiBcIlwifSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzZXM6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IC0xLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJLZWluZSBad2VpdGxlaHJrcmFmdFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dKSwgZmlsdGVyOiBmYWxzZSB9ICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHNlYXJjaGVzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ25hbWUnLCBsYWJlbDogJ05hbWUnLCB0eXBlOiAndGV4dCcgfSxcclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICBzb3J0RGF0YTogW3sgZmllbGQ6ICduYW1lJywgZGlyZWN0aW9uOiAnYXNjJyB9XSxcclxuICAgICAgICAgICAgICAgIG9uQWRkOiAoZXZlbnQpID0+IHsgdGhhdC5vbkFkZENsYXNzKCkgfSxcclxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoZXZlbnQpID0+IHsgdGhhdC5vblVwZGF0ZUNsYXNzKGV2ZW50KSB9LFxyXG4gICAgICAgICAgICAgICAgb25EZWxldGU6IChldmVudCkgPT4geyB0aGF0Lm9uRGVsZXRlQ2xhc3MoZXZlbnQpIH0sXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jbGFzc2VzR3JpZCA9IHcydWlbdGhpcy5jbGFzc2VzR3JpZE5hbWVdO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGluaXRpYWxpemVQYXNzd29yZEJ1dHRvbnMoKSB7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGpRdWVyeSgnLnB3X2J1dHRvbicpLm9mZignY2xpY2snKTtcclxuICAgICAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgICAgICBqUXVlcnkoJy5wd19idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlY2lkID0galF1ZXJ5KGUudGFyZ2V0KS5kYXRhKCdyZWNpZCcpO1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgIHRoYXQuY2hhbmdlUGFzc3dvcmQoW3JlY2lkXSk7XHJcbiAgICAgICAgICAgIH0pLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XHJcbiAgICAgICAgfSwgMTAwMCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNoYW5nZVBhc3N3b3JkKHJlY0lkczogbnVtYmVyW10gPSBbXSkge1xyXG5cclxuICAgICAgICBpZiAocmVjSWRzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHJlY0lkcyA9IDxudW1iZXJbXT50aGlzLnRlYWNoZXJzR3JpZC5nZXRTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIC8vcmVjSWRzID0gPGFueT50aGlzLnRlYWNoZXJzR3JpZC5nZXRTZWxlY3Rpb24oKS5tYXAoKHN0cikgPT4gc3RyLnJlY2lkKS5maWx0ZXIoKHZhbHVlLCBpbmRleCwgYXJyYXkpID0+IGFycmF5LmluZGV4T2YodmFsdWUpID09PSBpbmRleCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocmVjSWRzLmxlbmd0aCAhPSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGVhY2hlcnNHcmlkLmVycm9yKFwiWnVtIMOEbmRlcm4gZWluZXMgUGFzc3dvcnRzIG11c3MgZ2VuYXUgZWluZSBMZWhya3JhZnQgYXVzZ2V3w6RobHQgd2VyZGVuLlwiKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgdGVhY2hlcjogVXNlckRhdGEgPSA8VXNlckRhdGE+KHRoaXMudGVhY2hlcnNHcmlkLmdldChyZWNJZHNbMF0gKyBcIlwiLCBmYWxzZSlbXCJ1c2VyRGF0YVwiXSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgcGFzc3dvcmRGb3I6IHN0cmluZyA9IHRlYWNoZXIucnVmbmFtZSArIFwiIFwiICsgdGVhY2hlci5mYW1pbGllbm5hbWUgKyBcIiAoXCIgKyB0ZWFjaGVyLnVzZXJuYW1lICsgXCIpXCI7XHJcbiAgICAgICAgICAgIFBhc3N3b3JkUG9wdXAub3BlbihwYXNzd29yZEZvciwgKCkgPT4geyB9LCAocGFzc3dvcmQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRlYWNoZXIucGFzc3dvcmQgPSBwYXNzd29yZDtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdDogQ1JVRFVzZXJSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwidXBkYXRlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogdGVhY2hlcixcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgdzJ1dGlscy5sb2NrKGpRdWVyeSgnYm9keScpLCBcIkJpdHRlIHdhcnRlbiwgZGFzIEhhc2hlbiA8YnI+IGRlcyBQYXNzd29ydHMga2FubiA8YnI+YmlzIHp1IDEgTWludXRlPGJyPiBkYXVlcm4uLi5cIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgYWpheChcIkNSVURVc2VyXCIsIHJlcXVlc3QsIChyZXNwb25zZTogQ1JVRFJlc3BvbnNlKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgICAgIHcydXRpbHMudW5sb2NrKGpRdWVyeSgnYm9keScpKTtcclxuICAgICAgICAgICAgICAgICAgICB3MmFsZXJ0KCdEYXMgUGFzc3dvcnQgZsO8ciAnICsgdGVhY2hlci5ydWZuYW1lICsgXCIgXCIgKyB0ZWFjaGVyLmZhbWlsaWVubmFtZSArIFwiIChcIiArIHRlYWNoZXIudXNlcm5hbWUgKyBcIikgd3VyZGUgZXJmb2xncmVpY2ggZ2XDpG5kZXJ0LlwiKTtcclxuICAgICAgICAgICAgICAgIH0sICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICB3MnV0aWxzLnVubG9jayhqUXVlcnkoJ2JvZHknKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdzJhbGVydCgnRmVobGVyIGJlaW0gw4RuZGVybiBkZXMgUGFzc3dvcnRzIScpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG9uQWRkVGVhY2hlcigpIHtcclxuICAgICAgICBsZXQgc2Nob29sSWQgPSB0aGlzLmFkbWluaXN0cmF0aW9uLnVzZXJEYXRhLnNjaHVsZV9pZDtcclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IENSVURVc2VyUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgdHlwZTogXCJjcmVhdGVcIixcclxuICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgaWQ6IC0xLFxyXG4gICAgICAgICAgICAgICAgc2NodWxlX2lkOiBzY2hvb2xJZCxcclxuICAgICAgICAgICAgICAgIGtsYXNzZV9pZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBcIkJlbnV0emVybmFtZVwiICsgTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwMDAwMDApLFxyXG4gICAgICAgICAgICAgICAgcnVmbmFtZTogXCJSdWZuYW1lXCIsXHJcbiAgICAgICAgICAgICAgICBmYW1pbGllbm5hbWU6IFwiRmFtaWxpZW5uYW1lXCIsXHJcbiAgICAgICAgICAgICAgICBpc19hZG1pbjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBpc19zY2hvb2xhZG1pbjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBpc190ZWFjaGVyOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgcGFzc3dvcmQ6IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwKSArIFwieFwiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgYWpheChcIkNSVURVc2VyXCIsIHJlcXVlc3QsIChyZXNwb25zZTogQ1JVRFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCB1ZDogVXNlckRhdGEgPSByZXF1ZXN0LmRhdGE7XHJcbiAgICAgICAgICAgIHVkLmlkID0gcmVzcG9uc2UuaWQ7XHJcblxyXG4gICAgICAgICAgICBsZXQgdGVhY2hlckRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICB1c2VyRGF0YTogdWQsXHJcbiAgICAgICAgICAgICAgICBjbGFzc2VzOiBbXSxcclxuICAgICAgICAgICAgICAgIHVzZXJuYW1lOiB1ZC51c2VybmFtZSxcclxuICAgICAgICAgICAgICAgIGZhbWlsaWVubmFtZTogdWQuZmFtaWxpZW5uYW1lLFxyXG4gICAgICAgICAgICAgICAgcnVmbmFtZTogdWQucnVmbmFtZSxcclxuICAgICAgICAgICAgICAgIGlkOiB1ZC5pZCxcclxuICAgICAgICAgICAgICAgIHRleHQ6IHVkLnJ1Zm5hbWUgKyBcIiBcIiArIHVkLmZhbWlsaWVubmFtZVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdGhpcy50ZWFjaGVyc0dyaWQuYWRkKHRlYWNoZXJEYXRhKTtcclxuICAgICAgICAgICAgdGhpcy50ZWFjaGVyc0dyaWQuZWRpdEZpZWxkKHVkLmlkICsgXCJcIiwgMSwgdW5kZWZpbmVkLCB7IGtleUNvZGU6IDEzIH0pO1xyXG4gICAgICAgICAgICB0aGlzLnRlYWNoZXJEYXRhTGlzdC5wdXNoKHRlYWNoZXJEYXRhKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0VGV4dEluQ2VsbCgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplUGFzc3dvcmRCdXR0b25zKCk7XHJcblxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9uVW5TZWxlY3RUZWFjaGVyKGV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5jbGFzc2VzR3JpZC5jbGVhcigpO1xyXG4gICAgfVxyXG5cclxuICAgIG9uU2VsZWN0VGVhY2hlcihldmVudDogYW55KSB7XHJcblxyXG4gICAgICAgIGxldCByZWNJZHM6IG51bWJlcltdID0gPG51bWJlcltdPnRoaXMudGVhY2hlcnNHcmlkLmdldFNlbGVjdGlvbigpO1xyXG5cclxuICAgICAgICBpZihyZWNJZHMubGVuZ3RoICE9IDEpIHJldHVybjtcclxuXHJcbiAgICAgICAgLy8gLy9AdHMtaWdub3JlXHJcbiAgICAgICAgLy8gcmVjSWRzID0gPGFueT50aGlzLnRlYWNoZXJzR3JpZC5nZXRTZWxlY3Rpb24oKS5tYXAoKHN0cikgPT4gc3RyLnJlY2lkKS5maWx0ZXIoKHZhbHVlLCBpbmRleCwgYXJyYXkpID0+IGFycmF5LmluZGV4T2YodmFsdWUpID09PSBpbmRleCk7XHJcblxyXG4gICAgICAgIGlmIChyZWNJZHMubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIHRoaXMudGVhY2hlcnNHcmlkLnRvb2xiYXIuZW5hYmxlKCdwYXNzd29yZEJ1dHRvbicpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICB0aGlzLnRlYWNoZXJzR3JpZC50b29sYmFyLmRpc2FibGUoJ3Bhc3N3b3JkQnV0dG9uJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc2VsZWN0ZWRUZWFjaGVyczogVGVhY2hlckRhdGFbXSA9IDxUZWFjaGVyRGF0YVtdPnRoaXMudGVhY2hlckRhdGFMaXN0LmZpbHRlcihcclxuICAgICAgICAgICAgKGNkOiBUZWFjaGVyRGF0YSkgPT4gcmVjSWRzLmluZGV4T2YoY2QudXNlckRhdGEuaWQpID49IDApO1xyXG5cclxuXHJcbiAgICAgICAgbGV0IGNsYXNzZXNMaXN0OiBDbGFzc0RhdGFbXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBzYyBvZiBzZWxlY3RlZFRlYWNoZXJzKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHNkIG9mIHNjLmNsYXNzZXMpIHtcclxuICAgICAgICAgICAgICAgIHNkW1widGVhY2hlclwiXSA9IHNjLnVzZXJEYXRhLnJ1Zm5hbWUgKyBcIiBcIiArIHNjLnVzZXJEYXRhLmZhbWlsaWVubmFtZTtcclxuICAgICAgICAgICAgICAgIGxldCB0ZWFjaGVyMiA9IHRoaXMudGVhY2hlckRhdGFMaXN0LmZpbmQodGQgPT4gdGQudXNlckRhdGEuaWQgPT0gc2QuendlaXRsZWhya3JhZnRfaWQpO1xyXG4gICAgICAgICAgICAgICAgaWYodGVhY2hlcjIgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgc2RbXCJ0ZWFjaGVyMlwiXSA9IHNjLnVzZXJEYXRhLnJ1Zm5hbWUgKyBcIiBcIiArIHNjLnVzZXJEYXRhLmZhbWlsaWVubmFtZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNsYXNzZXNMaXN0LnB1c2goc2QpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5jbGFzc2VzR3JpZC5jbGVhcigpO1xyXG4gICAgICAgIHRoaXMuY2xhc3Nlc0dyaWQuYWRkKGNsYXNzZXNMaXN0KTtcclxuICAgICAgICB0aGlzLmNsYXNzZXNHcmlkLnJlZnJlc2goKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbG9hZFRhYmxlc0Zyb21UZWFjaGVyT2JqZWN0KCkge1xyXG5cclxuICAgICAgICBsZXQgcmVxdWVzdDogR2V0VGVhY2hlckRhdGFSZXF1ZXN0ID0geyBzY2hvb2xfaWQ6IHRoaXMuYWRtaW5pc3RyYXRpb24udXNlckRhdGEuc2NodWxlX2lkIH07XHJcblxyXG4gICAgICAgIGFqYXgoXCJnZXRUZWFjaGVyRGF0YVwiLCByZXF1ZXN0LCAoZGF0YTogR2V0VGVhY2hlckRhdGFSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRlYWNoZXJEYXRhTGlzdCA9IGRhdGEudGVhY2hlckRhdGE7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRlYWNoZXJzR3JpZC5jbGVhcigpO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgdGVhY2hlciBvZiB0aGlzLnRlYWNoZXJEYXRhTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgdGVhY2hlcltcImlkXCJdID0gdGVhY2hlci51c2VyRGF0YS5pZDtcclxuICAgICAgICAgICAgICAgIHRlYWNoZXJbXCJ1c2VybmFtZVwiXSA9IHRlYWNoZXIudXNlckRhdGEudXNlcm5hbWU7XHJcbiAgICAgICAgICAgICAgICB0ZWFjaGVyW1wiZmFtaWxpZW5uYW1lXCJdID0gdGVhY2hlci51c2VyRGF0YS5mYW1pbGllbm5hbWU7XHJcbiAgICAgICAgICAgICAgICB0ZWFjaGVyW1wicnVmbmFtZVwiXSA9IHRlYWNoZXIudXNlckRhdGEucnVmbmFtZTtcclxuICAgICAgICAgICAgICAgIHRlYWNoZXJbXCJ0ZXh0XCJdID0gdGVhY2hlci51c2VyRGF0YS5ydWZuYW1lICsgXCIgXCIgKyB0ZWFjaGVyLnVzZXJEYXRhLmZhbWlsaWVubmFtZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRlYWNoZXJzR3JpZC5hZGQodGhpcy50ZWFjaGVyRGF0YUxpc3QpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy50ZWFjaGVyc0dyaWQucmVmcmVzaCgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuY2xhc3Nlc0dyaWQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGFzc2VzR3JpZC5jb2x1bW5zWzJdW1wiZWRpdGFibGVcIl0uaXRlbXMgPSB0aGlzLnRlYWNoZXJEYXRhTGlzdDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3Nlc0dyaWQuY29sdW1uc1szXVtcImVkaXRhYmxlXCJdLml0ZW1zID0gdGhpcy50ZWFjaGVyRGF0YUxpc3Q7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsYXNzZXNHcmlkLmNsZWFyKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIH0sICgpID0+IHtcclxuICAgICAgICAgICAgdzJhbGVydCgnRmVobGVyIGJlaW0gSG9sZW4gZGVyIERhdGVuLicpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgb25EZWxldGVUZWFjaGVyKGV2ZW50OiBhbnkpIHtcclxuICAgICAgICBpZiAoIWV2ZW50LmZvcmNlIHx8IGV2ZW50LmlzU3RvcHBlZCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgcmVjSWRzOiBudW1iZXJbXTtcclxuXHJcbiAgICAgICAgcmVjSWRzID0gPG51bWJlcltdPnRoaXMudGVhY2hlcnNHcmlkLmdldFNlbGVjdGlvbigpO1xyXG5cclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAvLyByZWNJZHMgPSA8YW55PnRoaXMudGVhY2hlcnNHcmlkLmdldFNlbGVjdGlvbigpLm1hcCgoc3RyKSA9PiBzdHIucmVjaWQpLmZpbHRlcigodmFsdWUsIGluZGV4LCBhcnJheSkgPT4gYXJyYXkuaW5kZXhPZih2YWx1ZSkgPT09IGluZGV4KTtcclxuXHJcbiAgICAgICAgLy8gbGV0IHNlbGVjdGVkdGVhY2hlcnM6IFRlYWNoZXJEYXRhW10gPSA8VGVhY2hlckRhdGFbXT50aGlzLnRlYWNoZXJzR3JpZC5yZWNvcmRzLmZpbHRlcihcclxuICAgICAgICAvLyAgICAgKGNkOiBUZWFjaGVyRGF0YSkgPT4gcmVjSWRzLmluZGV4T2YoY2QudXNlckRhdGEuaWQpID49IDAgJiYgdGhpcy5hZG1pbmlzdHJhdGlvbi51c2VyRGF0YS5pZCAhPSBjZC51c2VyRGF0YS5pZCk7XHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBDUlVEVXNlclJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFwiZGVsZXRlXCIsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgICAgIGlkczogcmVjSWRzLFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWpheChcIkNSVURVc2VyXCIsIHJlcXVlc3QsIChyZXNwb25zZTogQ1JVRFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIHJlY0lkcy5mb3JFYWNoKGlkID0+IHRoaXMudGVhY2hlcnNHcmlkLnJlbW92ZShcIlwiICsgaWQpKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlYWNoZXJEYXRhTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlY0lkcy5pbmRleE9mKHRoaXMudGVhY2hlckRhdGFMaXN0W2ldLnVzZXJEYXRhLmlkKSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50ZWFjaGVyRGF0YUxpc3Quc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnRlYWNoZXJzR3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2xhc3Nlc0dyaWQuY2xlYXIoKTtcclxuICAgICAgICB9LCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudGVhY2hlcnNHcmlkLnJlZnJlc2goKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgb25VcGRhdGVUZWFjaGVyKGV2ZW50OiBhbnkpIHtcclxuXHJcbiAgICAgICAgbGV0IGRhdGE6IFRlYWNoZXJEYXRhID0gPFRlYWNoZXJEYXRhPnRoaXMudGVhY2hlcnNHcmlkLnJlY29yZHNbZXZlbnQuaW5kZXhdO1xyXG5cclxuICAgICAgICBsZXQgZmllbGQgPSB0aGlzLnRlYWNoZXJzR3JpZC5jb2x1bW5zW2V2ZW50LmNvbHVtbl1bXCJmaWVsZFwiXTsgICAgICAgXHJcblxyXG4gICAgICAgIGRhdGEudXNlckRhdGFbZmllbGRdID0gZXZlbnQudmFsdWVfbmV3O1xyXG4gICAgICAgIGRhdGFbZmllbGRdID0gZXZlbnQudmFsdWVfbmV3O1xyXG5cclxuICAgICAgICBkYXRhLnVzZXJEYXRhLnBhc3N3b3JkID0gbnVsbDtcclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IENSVURVc2VyUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgdHlwZTogXCJ1cGRhdGVcIixcclxuICAgICAgICAgICAgZGF0YTogZGF0YS51c2VyRGF0YSxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFqYXgoXCJDUlVEVXNlclwiLCByZXF1ZXN0LCAocmVzcG9uc2U6IENSVURSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgLy8gZm9yIChsZXQga2V5IGluIGRhdGFbXCJ3MnVpXCJdW1wiY2hhbmdlc1wiXSkge1xyXG4gICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFbXCJ3MnVpXCJdW1wiY2hhbmdlc1wiXVtmaWVsZF07XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgdGhpcy50ZWFjaGVyc0dyaWQucmVmcmVzaENlbGwoZGF0YVtcInJlY2lkXCJdLCBmaWVsZCk7XHJcbiAgICAgICAgfSwgKCkgPT4ge1xyXG4gICAgICAgICAgICBkYXRhLnVzZXJEYXRhW2ZpZWxkXSA9IGV2ZW50LnZhbHVlX29yaWdpbmFsO1xyXG4gICAgICAgICAgICBkYXRhW2ZpZWxkXSA9IGV2ZW50LnZhbHVlX29yaWdpbmFsO1xyXG4gICAgICAgICAgICBkZWxldGUgZGF0YVtcIncydWlcIl1bXCJjaGFuZ2VzXCJdW2ZpZWxkXTtcclxuICAgICAgICAgICAgdGhpcy50ZWFjaGVyc0dyaWQucmVmcmVzaENlbGwoZGF0YVtcInJlY2lkXCJdLCBmaWVsZCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG9uQWRkQ2xhc3MoKSB7XHJcblxyXG4gICAgICAgIGxldCBzZWxlY3RlZFRlYWNoZXJzID0gPG51bWJlcltdPnRoaXMudGVhY2hlcnNHcmlkLmdldFNlbGVjdGlvbigpO1xyXG5cclxuICAgICAgICAvLyBsZXQgc2VsZWN0ZWRUZWFjaGVycyA9IDxudW1iZXJbXT50aGlzLnRlYWNoZXJzR3JpZC5nZXRTZWxlY3Rpb24oKS5tYXAoKGQ6IHsgcmVjaWQ6IG51bWJlciB9KSA9PiBkLnJlY2lkKS5maWx0ZXIoKHZhbHVlLCBpbmRleCwgYXJyYXkpID0+IGFycmF5LmluZGV4T2YodmFsdWUpID09PSBpbmRleCk7XHJcbiAgICAgICAgaWYgKHNlbGVjdGVkVGVhY2hlcnMubGVuZ3RoICE9IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5jbGFzc2VzR3JpZC5lcnJvcihcIldlbm4gU2llIEtsYXNzZW4gaGluenVmw7xnZW4gbcO2Y2h0ZW4gbXVzcyBsaW5rcyBnZW5hdSBlaW5lIExlaHJrcmFmdCBhdXNnZXfDpGhsdCBzZWluLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgdGVhY2hlcklkID0gc2VsZWN0ZWRUZWFjaGVyc1swXTtcclxuICAgICAgICBsZXQgdGVhY2hlckRhdGEgPSA8VGVhY2hlckRhdGE+dGhpcy50ZWFjaGVyc0dyaWQuZ2V0KFwiXCIgKyB0ZWFjaGVySWQsIGZhbHNlKTtcclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IENSVURDbGFzc1JlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFwiY3JlYXRlXCIsXHJcbiAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgIGlkOiAtMSxcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiTmFtZVwiLFxyXG4gICAgICAgICAgICAgICAgbGVocmtyYWZ0X2lkOiB0ZWFjaGVySWQsXHJcbiAgICAgICAgICAgICAgICB6d2VpdGxlaHJrcmFmdF9pZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIHNjaHVsZV9pZDogdGVhY2hlckRhdGEudXNlckRhdGEuc2NodWxlX2lkLFxyXG4gICAgICAgICAgICAgICAgYWt0aXY6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzdHVkZW50czogW11cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBhamF4KFwiQ1JVRENsYXNzXCIsIHJlcXVlc3QsIChyZXNwb25zZTogQ1JVRFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBjZDogQ2xhc3NEYXRhID0gcmVxdWVzdC5kYXRhO1xyXG4gICAgICAgICAgICBjZC5pZCA9IHJlc3BvbnNlLmlkO1xyXG4gICAgICAgICAgICBjZFtcInRlYWNoZXJcIl0gPSB0ZWFjaGVyRGF0YS51c2VyRGF0YS5ydWZuYW1lICsgXCIgXCIgKyB0ZWFjaGVyRGF0YS51c2VyRGF0YS5mYW1pbGllbm5hbWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2xhc3Nlc0dyaWQuYWRkKGNkKTtcclxuICAgICAgICAgICAgdGhpcy5jbGFzc2VzR3JpZC5lZGl0RmllbGQoY2QuaWQgKyBcIlwiLCAxLCB1bmRlZmluZWQsIHsga2V5Q29kZTogMTMgfSk7XHJcbiAgICAgICAgICAgIHRlYWNoZXJEYXRhLmNsYXNzZXMucHVzaChjZCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdFRleHRJbkNlbGwoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBvbkRlbGV0ZUNsYXNzKGV2ZW50OiBhbnkpIHtcclxuICAgICAgICBpZiAoIWV2ZW50LmZvcmNlIHx8IGV2ZW50LmlzU3RvcHBlZCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgcmVjSWRzOiBudW1iZXJbXSA9IDxudW1iZXJbXT50aGlzLmNsYXNzZXNHcmlkLmdldFNlbGVjdGlvbigpO1xyXG5cclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAvLyByZWNJZHMgPSA8YW55PnRoaXMuY2xhc3Nlc0dyaWQuZ2V0U2VsZWN0aW9uKCkubWFwKChzdHIpID0+IHN0ci5yZWNpZCkuZmlsdGVyKCh2YWx1ZSwgaW5kZXgsIGFycmF5KSA9PiBhcnJheS5pbmRleE9mKHZhbHVlKSA9PT0gaW5kZXgpO1xyXG5cclxuICAgICAgICAvLyBsZXQgc2VsZWN0ZWRDbGFzc3M6IENsYXNzRGF0YVtdID0gPENsYXNzRGF0YVtdPnRoaXMuY2xhc3Nlc0dyaWQucmVjb3Jkcy5maWx0ZXIoXHJcbiAgICAgICAgLy8gICAgIChjZDogQ2xhc3NEYXRhKSA9PiByZWNJZHMuaW5kZXhPZihjZC5pZCkgPj0gMCk7XHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBDUlVEQ2xhc3NSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBcImRlbGV0ZVwiLFxyXG4gICAgICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgICAgICBpZHM6IHJlY0lkcyxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFqYXgoXCJDUlVEQ2xhc3NcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBDUlVEUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgcmVjSWRzLmZvckVhY2goaWQgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNkOiBDbGFzc0RhdGEgPSA8Q2xhc3NEYXRhPnRoaXMuY2xhc3Nlc0dyaWQuZ2V0KGlkICsgXCJcIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsYXNzZXNHcmlkLnJlbW92ZShcIlwiICsgaWQpXHJcbiAgICAgICAgICAgICAgICBsZXQgbGQ6IFRlYWNoZXJEYXRhID0gPFRlYWNoZXJEYXRhPnRoaXMudGVhY2hlcnNHcmlkLmdldChjZC5sZWhya3JhZnRfaWQgKyBcIlwiKTtcclxuICAgICAgICAgICAgICAgIGlmIChsZCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGQuY2xhc3NlcyA9IGxkLmNsYXNzZXMuZmlsdGVyKChjbCkgPT4gY2wuaWQgIT0gY2QuaWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5jbGFzc2VzR3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgfSwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmNsYXNzZXNHcmlkLnJlZnJlc2goKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgb25VcGRhdGVDbGFzcyhldmVudDogYW55KSB7XHJcblxyXG4gICAgICAgIGxldCBkYXRhOiBDbGFzc0RhdGEgPSA8Q2xhc3NEYXRhPnRoaXMuY2xhc3Nlc0dyaWQucmVjb3Jkc1tldmVudC5pbmRleF07XHJcblxyXG4gICAgICAgIGlmIChldmVudC5jb2x1bW4gPT0gMikge1xyXG4gICAgICAgICAgICBsZXQgdGVhY2hlcjogVGVhY2hlckRhdGEgPSBldmVudC52YWx1ZV9uZXc7XHJcbiAgICAgICAgICAgIGlmICh0ZWFjaGVyID09IG51bGwgfHwgdHlwZW9mIHRlYWNoZXIgPT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGFzc2VzR3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdGVhY2hlck9sZDEgPSB0aGlzLnRlYWNoZXJEYXRhTGlzdC5maW5kKCh0ZCkgPT4gdGQudXNlckRhdGEuaWQgPT0gZGF0YS5sZWhya3JhZnRfaWQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRlYWNoZXJPbGQxICE9IG51bGwpIHRlYWNoZXJPbGQxLmNsYXNzZXMgPSB0ZWFjaGVyT2xkMS5jbGFzc2VzLmZpbHRlcihjZCA9PiBjZC5pZCAhPSBkYXRhLmlkKTtcclxuICAgICAgICAgICAgICAgIC8vIGxldCB0ZWFjaGVyT2xkMiA9IHRoaXMudGVhY2hlcnNHcmlkLmdldChkYXRhLmxlaHJrcmFmdF9pZCArIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgLy8gaWYgKHRlYWNoZXJPbGQyICE9IG51bGwpIHRlYWNoZXJPbGQxLmNsYXNzZXMgPSB0ZWFjaGVyT2xkMS5jbGFzc2VzLmZpbHRlcihjZCA9PiBjZC5pZCAhPSBkYXRhLmlkKTtcclxuICAgICAgICAgICAgICAgIGRhdGEubGVocmtyYWZ0X2lkID0gdGVhY2hlci51c2VyRGF0YS5pZDtcclxuICAgICAgICAgICAgICAgIHRlYWNoZXIuY2xhc3Nlcy5wdXNoKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHRlYWNoZXJOZXcyOiBUZWFjaGVyRGF0YSA9IDxhbnk+dGhpcy50ZWFjaGVyc0dyaWQuZ2V0KHRlYWNoZXIudXNlckRhdGEuaWQgKyBcIlwiKTtcclxuICAgICAgICAgICAgICAgIGlmICh0ZWFjaGVyTmV3MiAhPSBudWxsKSB0ZWFjaGVyTmV3Mi5jbGFzc2VzLnB1c2goZGF0YSk7XHJcbiAgICAgICAgICAgICAgICBldmVudC52YWx1ZV9uZXcgPSB0ZWFjaGVyLnVzZXJEYXRhLnJ1Zm5hbWUgKyBcIiBcIiArIHRlYWNoZXIudXNlckRhdGEuZmFtaWxpZW5uYW1lO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZXZlbnQuY29sdW1uID09IDMpIHtcclxuICAgICAgICAgICAgbGV0IHRlYWNoZXI6IFRlYWNoZXJEYXRhID0gZXZlbnQudmFsdWVfbmV3O1xyXG4gICAgICAgICAgICBpZiAodGVhY2hlciA9PSBudWxsIHx8IHR5cGVvZiB0ZWFjaGVyID09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3Nlc0dyaWQucmVmcmVzaCgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IHRlYWNoZXJPbGQxID0gdGhpcy50ZWFjaGVyRGF0YUxpc3QuZmluZCgodGQpID0+IHRkLnVzZXJEYXRhLmlkID09IGRhdGEuendlaXRsZWhya3JhZnRfaWQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRlYWNoZXJPbGQxICE9IG51bGwpIHRlYWNoZXJPbGQxLmNsYXNzZXMgPSB0ZWFjaGVyT2xkMS5jbGFzc2VzLmZpbHRlcihjZCA9PiBjZC5pZCAhPSBkYXRhLmlkKTtcclxuICAgICAgICAgICAgICAgIC8vIGxldCB0ZWFjaGVyT2xkMiA9IHRoaXMudGVhY2hlcnNHcmlkLmdldChkYXRhLnp3ZWl0bGVocmtyYWZ0X2lkICsgXCJcIik7XHJcbiAgICAgICAgICAgICAgICAvLyBpZiAodGVhY2hlck9sZDIgIT0gbnVsbCkgdGVhY2hlck9sZDEuY2xhc3NlcyA9IHRlYWNoZXJPbGQxLmNsYXNzZXMuZmlsdGVyKGNkID0+IGNkLmlkICE9IGRhdGEuaWQpO1xyXG4gICAgICAgICAgICAgICAgZGF0YS56d2VpdGxlaHJrcmFmdF9pZCA9IHRlYWNoZXIudXNlckRhdGEuaWQgPT0gLTEgPyBudWxsIDogdGVhY2hlci51c2VyRGF0YS5pZDtcclxuICAgICAgICAgICAgICAgIHRlYWNoZXIuY2xhc3Nlcy5wdXNoKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHRlYWNoZXJOZXcyOiBUZWFjaGVyRGF0YSA9IDxhbnk+dGhpcy50ZWFjaGVyc0dyaWQuZ2V0KHRlYWNoZXIudXNlckRhdGEuaWQgKyBcIlwiKTtcclxuICAgICAgICAgICAgICAgIGlmICh0ZWFjaGVyTmV3MiAhPSBudWxsKSB0ZWFjaGVyTmV3Mi5jbGFzc2VzLnB1c2goZGF0YSk7XHJcbiAgICAgICAgICAgICAgICBldmVudC52YWx1ZV9uZXcgPSB0ZWFjaGVyLnVzZXJEYXRhLnJ1Zm5hbWUgKyBcIiBcIiArIHRlYWNoZXIudXNlckRhdGEuZmFtaWxpZW5uYW1lO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIGxldCBmaWVsZCA9IHRoaXMuY2xhc3Nlc0dyaWQuY29sdW1uc1tldmVudC5jb2x1bW5dW1wiZmllbGRcIl07XHJcbiAgICAgICAgZGF0YVtmaWVsZF0gPSBldmVudC52YWx1ZV9uZXc7XHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBDUlVEQ2xhc3NSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBcInVwZGF0ZVwiLFxyXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWpheChcIkNSVURDbGFzc1wiLCByZXF1ZXN0LCAocmVzcG9uc2U6IENSVURSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICBpZihkYXRhW1widzJ1aVwiXVtcImNoYW5nZXNcIl1bZmllbGRdICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFbXCJ3MnVpXCJdW1wiY2hhbmdlc1wiXVtmaWVsZF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5jbGFzc2VzR3JpZC5yZWZyZXNoQ2VsbChkYXRhW1wicmVjaWRcIl0sIGZpZWxkKTtcclxuICAgICAgICB9LCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGRhdGFbZmllbGRdID0gZXZlbnQudmFsdWVfb3JpZ2luYWw7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhW1widzJ1aVwiXVtcImNoYW5nZXNcIl1bZmllbGRdO1xyXG4gICAgICAgICAgICB0aGlzLmNsYXNzZXNHcmlkLnJlZnJlc2hDZWxsKGRhdGFbXCJyZWNpZFwiXSwgZmllbGQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuXHJcbn0iXX0=