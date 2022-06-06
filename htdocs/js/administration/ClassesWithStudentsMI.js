import { AdminMenuItem } from "./AdminMenuItem.js";
import { ajax } from "../communication/AjaxHelper.js";
import { PasswordPopup } from "./PasswordPopup.js";
export class ClassesWithStudentsMI extends AdminMenuItem {
    constructor(administration) {
        super(administration);
        this.classesGridName = "classesGrid";
        this.studentGridName = "studentsGrid";
        this.allClassesList = [];
        this.teacherDataList = [];
        this.initChooseClassPopup();
    }
    checkPermission(user) {
        return user.is_teacher;
    }
    getButtonIdentifier() {
        return "Klassen mit Schülern";
    }
    onMenuButtonPressed($mainHeading, $tableLeft, $tableRight, $mainFooter) {
        $tableRight.css('flex', '1');
        let that = this;
        this.loadTablesFromTeacherObject(() => {
            if (w2ui[this.classesGridName] != null) {
                let grid = w2ui[this.classesGridName];
                grid.render();
            }
            else {
                $tableLeft.w2grid({
                    name: this.classesGridName,
                    header: 'Klassen',
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
                    recid: "id",
                    columns: [
                        { field: 'id', caption: 'ID', size: '20px', sortable: true, hidden: true },
                        { field: 'name', caption: 'Bezeichnung', size: '30%', sortable: true, resizable: true, editable: { type: 'text' } },
                        {
                            field: 'numberOfStudents', caption: 'Schüler/innen', size: '30%', sortable: false, resizable: true,
                            render: function (record) {
                                return '<div>' + record.students.length + '</div>';
                            }
                        },
                        {
                            field: 'teacher', caption: 'Lehrkraft', size: '30%', sortable: true, resizable: true,
                            render: function (record) {
                                let teacher = that.teacherDataList.find(td => td.userData.id == record.lehrkraft_id);
                                if (teacher != null) {
                                    return '<div>' + teacher.userData.rufname + " " + teacher.userData.familienname + '</div>';
                                }
                            }
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
                        {
                            field: 'aktiv', caption: 'aktiv', size: '10%', sortable: false, resizable: false, style: 'text-align: center',
                            editable: { type: 'checkbox', style: 'text-align: center' }
                        }
                    ],
                    searches: [
                        { field: 'name', label: 'Bezeichnung', type: 'text' }
                    ],
                    sortData: [{ field: 'name', direction: 'ASC' }],
                    onSelect: (event) => { event.done(() => { that.onSelectClass(event); }); },
                    onUnselect: (event) => { event.done(() => { that.onUnselectClass(event); }); },
                    onAdd: (event) => { that.onAddClass(); },
                    onChange: (event) => { that.onUpdateClass(event); },
                    onDelete: (event) => { that.onDeleteClass(event); },
                });
            }
            this.loadClassDataList(() => {
                if (w2ui[this.studentGridName] != null) {
                    let grid = w2ui[this.studentGridName];
                    grid.clear();
                    grid.render();
                }
                else {
                    $tableRight.w2grid({
                        name: this.studentGridName,
                        header: 'Schüler/innen',
                        // selectType: "cell",
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
                                { type: 'button', id: 'passwordButton', text: 'Passwort ändern...' },
                                { type: 'button', id: 'changeClassButton', text: 'Klasse ändern...' } //, img: 'fa-key' }
                            ],
                            onClick: function (target, data) {
                                if (target == "passwordButton") {
                                    that.changePassword();
                                }
                                else if (target == "changeClassButton") {
                                    that.changeClass();
                                }
                            }
                        },
                        recid: "id",
                        columns: [
                            { field: 'id', caption: 'ID', size: '20px', sortable: true, hidden: true },
                            {
                                field: 'klasse', caption: 'Klasse', size: '10%', sortable: true, resizable: true
                            },
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
                        onAdd: (event) => { that.onAddStudent(); },
                        onChange: (event) => { that.onUpdateStudent(event); },
                        onDelete: (event) => { that.onDeleteStudent(event); },
                        onClick: (event) => {
                            if (event.column == 1) {
                                w2ui[that.studentGridName].editField(event.recid, event.column);
                            }
                        },
                        onSelect: (event) => { event.done(() => { that.onSelectStudent(event); }); },
                        onUnselect: (event) => { event.done(() => { that.onUnselectStudent(event); }); },
                    });
                }
                this.loadTables();
            });
        });
    }
    onUnselectStudent(event) {
        let studentGrid = w2ui[this.studentGridName];
        let selection = studentGrid.getSelection();
        if (selection.length == 0) {
            //@ts-ignore
            studentGrid.toolbar.disable('changeClassButton');
            //@ts-ignore
            studentGrid.toolbar.disable('passwordButton');
        }
    }
    onSelectStudent(event) {
        let studentGrid = w2ui[this.studentGridName];
        let selection = studentGrid.getSelection();
        // let selection = studentGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        if (selection.length > 0) {
            //@ts-ignore
            studentGrid.toolbar.enable('changeClassButton');
        }
        else {
            //@ts-ignore
            studentGrid.toolbar.disable('changeClassButton');
        }
        if (selection.length == 1) {
            //@ts-ignore
            studentGrid.toolbar.enable('passwordButton');
        }
        else {
            //@ts-ignore
            studentGrid.toolbar.disable('passwordButton');
        }
    }
    changeClass() {
        let recIds;
        let that = this;
        let studentGrid = w2ui[this.studentGridName];
        let classesGrid = w2ui[this.classesGridName];
        recIds = studentGrid.getSelection();
        //@ts-ignore
        // recIds = <any>studentGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        let students = recIds.map((id) => studentGrid.get(id + ""));
        this.openChooseClassPopup((newClass) => {
            newClass = that.allClassesList.find((cl) => cl.id == newClass.id);
            let request = {
                student_ids: recIds,
                new_class_id: newClass.id
            };
            ajax("changeClassOfStudents", request, (response) => {
                w2alert("Die Schüler wurden erfolgreich in die Klasse " + newClass.name + " verschoben.");
                for (let klasse of this.allClassesList) {
                    klasse.students = klasse.students.filter((student) => recIds.indexOf(student.id) < 0);
                }
                for (let student of students)
                    newClass.students.push(student);
                for (let rc of classesGrid.records) {
                    let rc1 = rc;
                    rc1.students = this.allClassesList.find((cl) => cl.id == rc1.id).students;
                }
                classesGrid.refresh();
                that.updateStudentTableToSelectedClasses();
            }, (message) => {
                w2alert("Fehler beim versetzen der Schüler: " + message);
            });
        }, this.allClassesList);
    }
    changePassword(recIds = []) {
        let that = this;
        let studentGrid = w2ui[this.studentGridName];
        if (recIds.length == 0) {
            recIds = studentGrid.getSelection();
            //@ts-ignore
            // recIds = <any>studentGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        }
        if (recIds.length != 1) {
            studentGrid.error("Zum Ändern eines Passworts muss genau ein Schüler ausgewählt werden.");
        }
        else {
            let student = studentGrid.get(recIds[0] + "", false);
            let passwordFor = student.rufname + " " + student.familienname + " (" + student.username + ")";
            PasswordPopup.open(passwordFor, () => {
                studentGrid.searchReset();
                that.preparePasswordButtons();
            }, (password) => {
                student.password = password;
                let request = {
                    type: "update",
                    data: student,
                };
                //@ts-ignore
                w2utils.lock(jQuery('body'), "Bitte warten, das Hashen <br> des Passworts kann <br>bis zu 1 Minute<br> dauern...", true);
                ajax("CRUDUser", request, (response) => {
                    //@ts-ignore
                    w2utils.unlock(jQuery('body'));
                    w2alert('Das Passwort für ' + student.rufname + " " + student.familienname + " (" + student.username + ") wurde erfolgreich geändert.");
                    studentGrid.searchReset();
                    that.preparePasswordButtons();
                }, () => {
                    //@ts-ignore
                    w2utils.unlock(jQuery('body'));
                    w2alert('Fehler beim Ändern des Passworts!');
                    studentGrid.searchReset();
                    that.preparePasswordButtons();
                });
            });
        }
    }
    onDeleteClass(event) {
        if (!event.force || event.isStopped)
            return;
        let recIds;
        let classesGrid = w2ui[this.classesGridName];
        recIds = classesGrid.getSelection();
        //@ts-ignore
        // recIds = <any>classesGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        // let selectedClasses: ClassData[] = <ClassData[]>classesGrid.records.filter(
        //     (cd: ClassData) => recIds.indexOf(cd.id) >= 0);
        let request = {
            type: "delete",
            data: null,
            ids: recIds,
        };
        ajax("CRUDClass", request, (response) => {
            recIds.forEach(id => {
                classesGrid.remove("" + id);
                this.allClassesList = this.allClassesList.filter(cd => cd.id != id);
            });
            classesGrid.refresh();
        }, () => {
            classesGrid.refresh();
        });
    }
    onUpdateClass(event) {
        let classesGrid = w2ui[this.classesGridName];
        let data = classesGrid.records[event.index];
        let field = classesGrid.columns[event.column]["field"];
        data[field] = event.value_new;
        if (event.column == 4) {
            let teacher = event.value_new;
            if (teacher == null || typeof teacher == "string") {
                return;
            }
            else {
                event.value_new = teacher.userData.rufname + " " + teacher.userData.familienname;
                data.zweitlehrkraft_id = teacher.userData.id == -1 ? null : teacher.userData.id;
            }
        }
        let request = {
            type: "update",
            data: data,
        };
        ajax("CRUDClass", request, (response) => {
            // console.log(data);
            delete data["w2ui"]["changes"][field];
            classesGrid.refreshCell(data["recid"], field);
            let classData = this.allClassesList.find(c => "" + c.id == data["recid"]);
            if (classData != null) {
                classData[field] = event.value_new;
                if (field == "name") {
                    classData.text = event.value_new;
                }
            }
        }, () => {
            data[field] = event.value_original;
            delete data["w2ui"]["changes"][field];
            classesGrid.refreshCell(data["recid"], field);
        });
    }
    onAddClass() {
        let userData = this.administration.userData;
        let request = {
            type: "create",
            data: {
                id: -1,
                schule_id: userData.schule_id,
                lehrkraft_id: userData.id,
                zweitlehrkraft_id: null,
                name: "Name der Klasse",
                aktiv: true,
                students: []
            },
        };
        ajax("CRUDClass", request, (response) => {
            let classesGrid = w2ui[this.classesGridName];
            let cd = request.data;
            cd.id = response.id;
            classesGrid.add(cd);
            classesGrid.editField(cd.id + "", 1, undefined, { keyCode: 13 });
            this.allClassesList.push({
                id: cd.id,
                lehrkraft_id: userData.id,
                zweitlehrkraft_id: null,
                schule_id: userData.schule_id,
                name: cd.name,
                aktiv: cd.aktiv,
                students: []
            });
            this.selectTextInCell();
        });
    }
    onUnselectClass(event) {
        this.updateStudentTableToSelectedClasses();
        this.preparePasswordButtons();
    }
    onSelectClass(event) {
        this.updateStudentTableToSelectedClasses();
        this.preparePasswordButtons();
    }
    preparePasswordButtons() {
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
    loadTablesFromTeacherObject(callback) {
        let request = { school_id: this.administration.userData.schule_id };
        ajax("getTeacherData", request, (data) => {
            this.teacherDataList = data.teacherData;
            for (let teacher of this.teacherDataList) {
                teacher["id"] = teacher.userData.id;
                teacher["username"] = teacher.userData.username;
                teacher["familienname"] = teacher.userData.familienname;
                teacher["rufname"] = teacher.userData.rufname;
                teacher["text"] = teacher.userData.rufname + " " + teacher.userData.familienname;
            }
            callback();
        }, () => {
            w2alert('Fehler beim Holen der Daten.');
        });
    }
    updateStudentTableToSelectedClasses() {
        let recIds;
        let classesGrid = w2ui[this.classesGridName];
        //@ts-ignore
        // recIds = <any>classesGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        recIds = classesGrid.getSelection();
        let selectedClasses = this.allClassesList.filter((cd) => recIds.indexOf(cd.id) >= 0);
        let studentsGrid = w2ui[this.studentGridName];
        let studentList = [];
        for (let cd of selectedClasses) {
            for (let sd of cd.students) {
                //@ts-ignore
                sd.klasse = cd.name;
                studentList.push(sd);
            }
        }
        // studentsGrid.records = studentList;
        // setTimeout(() => {
        studentsGrid.clear();
        studentsGrid.add(studentList);
        studentsGrid.refresh();
        this.onSelectStudent(null);
        // }, 20);
    }
    loadClassDataList(callback) {
        let request = {
            school_id: this.administration.userData.schule_id
        };
        ajax('getClassesData', request, (response) => {
            this.allClassesList = response.classDataList;
            for (let cd of this.allClassesList) {
                cd.text = cd.name;
            }
            callback();
        });
    }
    loadTables() {
        let classesTable = w2ui[this.classesGridName];
        if (classesTable == null) {
            return;
        }
        classesTable.clear();
        classesTable.add(this.allClassesList);
        classesTable.refresh();
    }
    onDeleteStudent(event) {
        if (!event.force || event.isStopped)
            return;
        let recIds;
        let studentGrid = w2ui[this.studentGridName];
        let classesGrid = w2ui[this.classesGridName];
        //@ts-ignore
        // recIds = <any>studentGrid.getSelection().map((str) => str.recid).filter((value, index, array) => array.indexOf(value) === index);
        recIds = studentGrid.getSelection();
        let request = {
            type: "delete",
            data: null,
            ids: recIds,
        };
        let that = this;
        ajax("CRUDUser", request, (response) => {
            recIds.forEach(id => studentGrid.remove("" + id));
            this.allClassesList.forEach(klass => {
                for (let i = 0; i < klass.students.length; i++) {
                    let student = klass.students[i];
                    if (recIds.indexOf(student.id) >= 0) {
                        klass.students.splice(i, 1);
                        i--;
                    }
                }
            });
            studentGrid.refresh();
            classesGrid.refresh();
        }, (message) => {
            w2alert('Fehler beim Löschen der Schüler: ' + message);
            studentGrid.refresh();
        });
    }
    onUpdateStudent(event) {
        let studentGrid = w2ui[this.studentGridName];
        let data = studentGrid.records[event.index];
        let value_new_presented = event.value_new;
        let value_old_database = data.klasse_id;
        if (event.column == 1) {
            let classData = event.value_new;
            value_new_presented = classData.name;
            if (event.value_new.id == null) {
                event.preventDefault();
                return;
            }
            data.klasse_id = event.value_new.id;
        }
        let field = studentGrid.columns[event.column]["field"];
        data[field] = value_new_presented;
        let request = {
            type: "update",
            data: data,
        };
        ajax("CRUDUser", request, (response) => {
            delete data["w2ui"]["changes"][field];
            studentGrid.refreshCell(data["recid"], field);
        }, (message) => {
            data[field] = event.value_original;
            data.klasse_id = value_old_database;
            delete data["w2ui"]["changes"][field];
            studentGrid.refreshCell(data["recid"], field);
            alert(message);
        });
    }
    onAddStudent() {
        let userData = this.administration.userData;
        let studentGrid = w2ui[this.studentGridName];
        let classesGrid = w2ui[this.classesGridName];
        let selectedClasses = classesGrid.getSelection();
        // let selectedClasses = <number[]>classesGrid.getSelection().filter((value, index, array) => array.indexOf(value) === index).map(cl => (<any>cl).recid);
        if (selectedClasses.length != 1) {
            studentGrid.error("Wenn Sie Schüler hinzufügen möchten muss links genau eine Klasse ausgewählt sein.");
            return;
        }
        let classId = selectedClasses[0];
        let klass = classesGrid.get("" + classId, false);
        let request = {
            type: "create",
            data: {
                id: -1,
                schule_id: userData.schule_id,
                klasse_id: classId,
                username: "Benutzername" + Math.round(Math.random() * 10000000),
                rufname: "Rufname",
                familienname: "Familienname",
                is_admin: false,
                is_schooladmin: false,
                is_teacher: false,
                password: Math.round(Math.random() * 10000000) + "x"
            },
        };
        //@ts-ignore
        w2utils.lock(jQuery('body'), "Bitte warten, das Hashen <br> des Passworts kann <br>bis zu 1 Minute<br> dauern...", true);
        ajax("CRUDUser", request, (response) => {
            let ud = request.data;
            ud.id = response.id;
            ud["klasse"] = klass.name;
            studentGrid.add(ud);
            studentGrid.editField(ud.id + "", 2, undefined, { keyCode: 13 });
            klass.students.push(ud);
            this.selectTextInCell();
            this.preparePasswordButtons();
            classesGrid.refresh();
            // @ts-ignore
            w2utils.unlock(jQuery('body'));
        }, (errormessage) => {
            //@ts-ignore
            w2utils.unlock(jQuery('body'));
            w2alert("Beim Anlegen des Benutzers ist ein Fehler aufgetreten: " + errormessage);
        });
    }
    initChooseClassPopup() {
        let that = this;
        if (!w2ui.chooseClassForm) {
            jQuery().w2form({
                name: 'chooseClassForm',
                style: 'border: 0px; background-color: transparent;',
                formHTML: '<div class="w2ui-page page-0">' +
                    '    <div class="w2ui-field">' +
                    '        <label>Neue Klasse:</label>' +
                    '        <div>' +
                    '           <input name="newClass" type="text" style="width: 150px"/>' +
                    '        </div>' +
                    '    </div>' +
                    '</div>' +
                    '<div class="w2ui-buttons">' +
                    '    <button class="w2ui-btn" name="cancel">Abbrechen</button>' +
                    '    <button class="w2ui-btn" name="OK">OK</button>' +
                    '</div>',
                fields: [
                    {
                        field: 'newClass', type: 'list', required: true,
                        options: { items: [] }
                    },
                ],
                record: {
                    newClass: 'John',
                },
                actions: {
                    "cancel": function () {
                        w2popup.close();
                    },
                    "OK": function () {
                        w2popup.close();
                        this.myCallback(this.record.newClass);
                    }
                }
            });
        }
    }
    openChooseClassPopup(callback, classList) {
        w2ui["chooseClassForm"].myCallback = callback;
        w2ui["chooseClassForm"].fields[0].options.items = classList;
        //@ts-ignore
        jQuery().w2popup('open', {
            title: 'Neue Klasse wählen',
            body: '<div id="form" style="width: 100%; height: 100%;"></div>',
            style: 'padding: 15px 0px 0px 0px',
            width: 500,
            height: 300,
            showMax: true,
            onToggle: function (event) {
                jQuery(w2ui.chooseClassForm.box).hide();
                event.onComplete = function () {
                    jQuery(w2ui.chooseClassForm.box).show();
                    w2ui.chooseClassForm.resize();
                };
            },
            onOpen: function (event) {
                event.onComplete = function () {
                    // specifying an onOpen handler instead is equivalent to specifying an onBeforeOpen handler, which would make this code execute too early and hence not deliver.
                    //@ts-ignore
                    jQuery('#w2ui-popup #form').w2render('chooseClassForm');
                };
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2xhc3Nlc1dpdGhTdHVkZW50c01JLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudC9hZG1pbmlzdHJhdGlvbi9DbGFzc2VzV2l0aFN0dWRlbnRzTUkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRW5ELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUd0RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFLbkQsTUFBTSxPQUFPLHFCQUFzQixTQUFRLGFBQWE7SUFRcEQsWUFBWSxjQUE4QjtRQUN0QyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7UUFQMUIsb0JBQWUsR0FBRyxhQUFhLENBQUM7UUFDaEMsb0JBQWUsR0FBRyxjQUFjLENBQUM7UUFFakMsbUJBQWMsR0FBZ0IsRUFBRSxDQUFDO1FBQ2pDLG9CQUFlLEdBQWtCLEVBQUUsQ0FBQztRQUloQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRUQsZUFBZSxDQUFDLElBQWM7UUFDMUIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQzNCLENBQUM7SUFFRCxtQkFBbUI7UUFDZixPQUFPLHNCQUFzQixDQUFDO0lBQ2xDLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxZQUFpQyxFQUFFLFVBQStCLEVBQ2xGLFdBQWdDLEVBQUUsV0FBZ0M7UUFFbEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFN0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWhCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLEVBQUU7WUFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLElBQUksRUFBRTtnQkFDcEMsSUFBSSxJQUFJLEdBQWdCLElBQUksQ0FBQyxJQUFJ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S0FBSyxHQUFHLFNBQVMsQ0FBQztRQUU1RCxZQUFZO1FBQ1osTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNyQixLQUFLLEVBQUUsb0JBQW9CO1lBQzNCLElBQUksRUFBRSwwREFBMEQ7WUFDaEUsS0FBSyxFQUFFLDJCQUEyQjtZQUNsQyxLQUFLLEVBQUUsR0FBRztZQUNWLE1BQU0sRUFBRSxHQUFHO1lBQ1gsT0FBTyxFQUFFLElBQUk7WUFDYixRQUFRLEVBQUUsVUFBVSxLQUFLO2dCQUNyQixNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDeEMsS0FBSyxDQUFDLFVBQVUsR0FBRztvQkFDZixNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDeEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbEMsQ0FBQyxDQUFBO1lBQ0wsQ0FBQztZQUNELE1BQU0sRUFBRSxVQUFVLEtBQUs7Z0JBQ25CLEtBQUssQ0FBQyxVQUFVLEdBQUc7b0JBQ2YsZ0tBQWdLO29CQUNoSyxZQUFZO29CQUNaLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUM1RCxDQUFDLENBQUE7WUFDTCxDQUFDO1NBQ0osQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUVKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQWRtaW5NZW51SXRlbSB9IGZyb20gXCIuL0FkbWluTWVudUl0ZW0uanNcIjtcclxuaW1wb3J0IHsgR2V0VGVhY2hlckRhdGFSZXF1ZXN0LCBHZXRUZWFjaGVyRGF0YVJlc3BvbnNlLCBUZWFjaGVyRGF0YSwgVXNlckRhdGEsIENsYXNzRGF0YSwgQ1JVRENsYXNzUmVxdWVzdCwgQ1JVRFVzZXJSZXF1ZXN0LCBDUlVEUmVzcG9uc2UsIEdldENsYXNzZXNEYXRhUmVxdWVzdCwgR2V0Q2xhc3Nlc0RhdGFSZXNwb25zZSwgQ2hhbmdlQ2xhc3NPZlN0dWRlbnRzUmVxdWVzdCwgQ2hhbmdlQ2xhc3NPZlN0dWRlbnRzUmVzcG9uc2UgfSBmcm9tIFwiLi4vY29tbXVuaWNhdGlvbi9EYXRhLmpzXCI7XHJcbmltcG9ydCB7IGFqYXggfSBmcm9tIFwiLi4vY29tbXVuaWNhdGlvbi9BamF4SGVscGVyLmpzXCI7XHJcbmltcG9ydCB7IEFkbWluaXN0cmF0aW9uIH0gZnJvbSBcIi4vQWRtaW5pc3RyYXRpb24uanNcIjtcclxuaW1wb3J0IHsgVGVhY2hlcnNXaXRoQ2xhc3Nlc01JIH0gZnJvbSBcIi4vVGVhY2hlcnNXaXRoQ2xhc3Nlcy5qc1wiO1xyXG5pbXBvcnQgeyBQYXNzd29yZFBvcHVwIH0gZnJvbSBcIi4vUGFzc3dvcmRQb3B1cC5qc1wiO1xyXG5cclxuZGVjbGFyZSB2YXIgdzJwcm9tcHQ6IGFueTtcclxuZGVjbGFyZSB2YXIgdzJhbGVydDogYW55O1xyXG5cclxuZXhwb3J0IGNsYXNzIENsYXNzZXNXaXRoU3R1ZGVudHNNSSBleHRlbmRzIEFkbWluTWVudUl0ZW0ge1xyXG5cclxuICAgIGNsYXNzZXNHcmlkTmFtZSA9IFwiY2xhc3Nlc0dyaWRcIjtcclxuICAgIHN0dWRlbnRHcmlkTmFtZSA9IFwic3R1ZGVudHNHcmlkXCI7XHJcblxyXG4gICAgYWxsQ2xhc3Nlc0xpc3Q6IENsYXNzRGF0YVtdID0gW107XHJcbiAgICB0ZWFjaGVyRGF0YUxpc3Q6IFRlYWNoZXJEYXRhW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihhZG1pbmlzdHJhdGlvbjogQWRtaW5pc3RyYXRpb24pIHtcclxuICAgICAgICBzdXBlcihhZG1pbmlzdHJhdGlvbik7XHJcbiAgICAgICAgdGhpcy5pbml0Q2hvb3NlQ2xhc3NQb3B1cCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGNoZWNrUGVybWlzc2lvbih1c2VyOiBVc2VyRGF0YSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB1c2VyLmlzX3RlYWNoZXI7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0QnV0dG9uSWRlbnRpZmllcigpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBcIktsYXNzZW4gbWl0IFNjaMO8bGVyblwiO1xyXG4gICAgfVxyXG5cclxuICAgIG9uTWVudUJ1dHRvblByZXNzZWQoJG1haW5IZWFkaW5nOiBKUXVlcnk8SFRNTEVsZW1lbnQ+LCAkdGFibGVMZWZ0OiBKUXVlcnk8SFRNTEVsZW1lbnQ+LFxyXG4gICAgICAgICR0YWJsZVJpZ2h0OiBKUXVlcnk8SFRNTEVsZW1lbnQ+LCAkbWFpbkZvb3RlcjogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG5cclxuICAgICAgICAkdGFibGVSaWdodC5jc3MoJ2ZsZXgnLCAnMScpO1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIHRoaXMubG9hZFRhYmxlc0Zyb21UZWFjaGVyT2JqZWN0KCgpID0+IHtcclxuICAgICAgICAgICAgaWYgKHcydWlbdGhpcy5jbGFzc2VzR3JpZE5hbWVdICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBncmlkOiBXMlVJLlcyR3JpZCA9IHcydWlbdGhpcy5jbGFzc2VzR3JpZE5hbWVdO1xyXG4gICAgICAgICAgICAgICAgZ3JpZC5yZW5kZXIoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICR0YWJsZUxlZnQudzJncmlkKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmNsYXNzZXNHcmlkTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6ICdLbGFzc2VuJyxcclxuICAgICAgICAgICAgICAgICAgICAvLyBzZWxlY3RUeXBlOiBcImNlbGxcIixcclxuICAgICAgICAgICAgICAgICAgICBzaG93OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJhcjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJhckFkZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJhckRlbGV0ZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9vdGVyOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RDb2x1bW46IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xiYXJTZWFyY2g6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sYmFySW5wdXQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZWNpZDogXCJpZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbHVtbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ2lkJywgY2FwdGlvbjogJ0lEJywgc2l6ZTogJzIwcHgnLCBzb3J0YWJsZTogdHJ1ZSwgaGlkZGVuOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICduYW1lJywgY2FwdGlvbjogJ0JlemVpY2hudW5nJywgc2l6ZTogJzMwJScsIHNvcnRhYmxlOiB0cnVlLCByZXNpemFibGU6IHRydWUsIGVkaXRhYmxlOiB7IHR5cGU6ICd0ZXh0JyB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkOiAnbnVtYmVyT2ZTdHVkZW50cycsIGNhcHRpb246ICdTY2jDvGxlci9pbm5lbicsIHNpemU6ICczMCUnLCBzb3J0YWJsZTogZmFsc2UsIHJlc2l6YWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24gKHJlY29yZDogQ2xhc3NEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICc8ZGl2PicgKyByZWNvcmQuc3R1ZGVudHMubGVuZ3RoICsgJzwvZGl2Pic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkOiAndGVhY2hlcicsIGNhcHRpb246ICdMZWhya3JhZnQnLCBzaXplOiAnMzAlJywgc29ydGFibGU6IHRydWUsIHJlc2l6YWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24gKHJlY29yZDogQ2xhc3NEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRlYWNoZXIgPSB0aGF0LnRlYWNoZXJEYXRhTGlzdC5maW5kKHRkID0+IHRkLnVzZXJEYXRhLmlkID09IHJlY29yZC5sZWhya3JhZnRfaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZWFjaGVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICc8ZGl2PicgKyB0ZWFjaGVyLnVzZXJEYXRhLnJ1Zm5hbWUgKyBcIiBcIiArIHRlYWNoZXIudXNlckRhdGEuZmFtaWxpZW5uYW1lICsgJzwvZGl2Pic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZDogJ3RlYWNoZXIyJywgY2FwdGlvbjogJ1p3ZWl0bGVocmtyYWZ0Jywgc2l6ZTogJzMwJScsIHNvcnRhYmxlOiB0cnVlLCByZXNpemFibGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uIChyZWNvcmQ6IENsYXNzRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZWFjaGVyID0gdGhhdC50ZWFjaGVyRGF0YUxpc3QuZmluZCh0ZCA9PiB0ZC51c2VyRGF0YS5pZCA9PSByZWNvcmQuendlaXRsZWhya3JhZnRfaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZWFjaGVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICc8ZGl2PicgKyB0ZWFjaGVyLnVzZXJEYXRhLnJ1Zm5hbWUgKyBcIiBcIiArIHRlYWNoZXIudXNlckRhdGEuZmFtaWxpZW5uYW1lICsgJzwvZGl2Pic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRhYmxlOiB7IHR5cGU6ICdsaXN0JywgaXRlbXM6IHRoYXQudGVhY2hlckRhdGFMaXN0LnNsaWNlKDApLmNvbmNhdChbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJEYXRhOiB7aWQ6IC0xLCBydWZuYW1lOiBcIktlaW5lIFp3ZWl0bGVocmtyYWZ0XCIsIGZhbWlsaWVubmFtZTogXCJcIn0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IC0xLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiS2VpbmUgWndlaXRsZWhya3JhZnRcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfV0pLCBmaWx0ZXI6IGZhbHNlIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmllbGQ6ICdha3RpdicsIGNhcHRpb246ICdha3RpdicsIHNpemU6ICcxMCUnLCBzb3J0YWJsZTogZmFsc2UsIHJlc2l6YWJsZTogZmFsc2UsIHN0eWxlOiAndGV4dC1hbGlnbjogY2VudGVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRhYmxlOiB7IHR5cGU6ICdjaGVja2JveCcsIHN0eWxlOiAndGV4dC1hbGlnbjogY2VudGVyJyB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGVzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICduYW1lJywgbGFiZWw6ICdCZXplaWNobnVuZycsIHR5cGU6ICd0ZXh0JyB9XHJcbiAgICAgICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgICAgICBzb3J0RGF0YTogW3sgZmllbGQ6ICduYW1lJywgZGlyZWN0aW9uOiAnQVNDJyB9XSxcclxuICAgICAgICAgICAgICAgICAgICBvblNlbGVjdDogKGV2ZW50KSA9PiB7IGV2ZW50LmRvbmUoKCkgPT4geyB0aGF0Lm9uU2VsZWN0Q2xhc3MoZXZlbnQpIH0pIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb25VbnNlbGVjdDogKGV2ZW50KSA9PiB7IGV2ZW50LmRvbmUoKCkgPT4geyB0aGF0Lm9uVW5zZWxlY3RDbGFzcyhldmVudCkgfSkgfSxcclxuICAgICAgICAgICAgICAgICAgICBvbkFkZDogKGV2ZW50KSA9PiB7IHRoYXQub25BZGRDbGFzcygpIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IChldmVudCkgPT4geyB0aGF0Lm9uVXBkYXRlQ2xhc3MoZXZlbnQpIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb25EZWxldGU6IChldmVudCkgPT4geyB0aGF0Lm9uRGVsZXRlQ2xhc3MoZXZlbnQpIH0sXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxvYWRDbGFzc0RhdGFMaXN0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh3MnVpW3RoaXMuc3R1ZGVudEdyaWROYW1lXSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGdyaWQ6IFcyVUkuVzJHcmlkID0gdzJ1aVt0aGlzLnN0dWRlbnRHcmlkTmFtZV07XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZC5jbGVhcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGdyaWQucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICR0YWJsZVJpZ2h0LncyZ3JpZCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuc3R1ZGVudEdyaWROYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXI6ICdTY2jDvGxlci9pbm5lbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNlbGVjdFR5cGU6IFwiY2VsbFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYmFyOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJhckFkZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xiYXJEZWxldGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb290ZXI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RDb2x1bW46IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYmFyU2VhcmNoOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sYmFyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ2JyZWFrJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ2J1dHRvbicsIGlkOiAncGFzc3dvcmRCdXR0b24nLCB0ZXh0OiAnUGFzc3dvcnQgw6RuZGVybi4uLicgfSwgLy8sIGltZzogJ2ZhLWtleScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdidXR0b24nLCBpZDogJ2NoYW5nZUNsYXNzQnV0dG9uJywgdGV4dDogJ0tsYXNzZSDDpG5kZXJuLi4uJyB9IC8vLCBpbWc6ICdmYS1rZXknIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAodGFyZ2V0LCBkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldCA9PSBcInBhc3N3b3JkQnV0dG9uXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jaGFuZ2VQYXNzd29yZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0ID09IFwiY2hhbmdlQ2xhc3NCdXR0b25cIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmNoYW5nZUNsYXNzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNpZDogXCJpZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW5zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGZpZWxkOiAnaWQnLCBjYXB0aW9uOiAnSUQnLCBzaXplOiAnMjBweCcsIHNvcnRhYmxlOiB0cnVlLCBoaWRkZW46IHRydWUgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZDogJ2tsYXNzZScsIGNhcHRpb246ICdLbGFzc2UnLCBzaXplOiAnMTAlJywgc29ydGFibGU6IHRydWUsIHJlc2l6YWJsZTogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICd1c2VybmFtZScsIGNhcHRpb246ICdCZW51dHplcm5hbWUnLCBzaXplOiAnMzAlJywgc29ydGFibGU6IHRydWUsIHJlc2l6YWJsZTogdHJ1ZSwgZWRpdGFibGU6IHsgdHlwZTogJ3RleHQnIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdydWZuYW1lJywgY2FwdGlvbjogJ1J1Zm5hbWUnLCBzaXplOiAnMzAlJywgc29ydGFibGU6IHRydWUsIHJlc2l6YWJsZTogdHJ1ZSwgZWRpdGFibGU6IHsgdHlwZTogJ3RleHQnIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdmYW1pbGllbm5hbWUnLCBjYXB0aW9uOiAnRmFtaWxpZW5uYW1lJywgc2l6ZTogJzMwJScsIHNvcnRhYmxlOiB0cnVlLCByZXNpemFibGU6IHRydWUsIGVkaXRhYmxlOiB7IHR5cGU6ICd0ZXh0JyB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmllbGQ6ICdpZCcsIGNhcHRpb246ICdQVycsIHNpemU6ICc0MHB4Jywgc29ydGFibGU6IGZhbHNlLCByZW5kZXI6IChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz1cInB3X2J1dHRvblwiIHRpdGxlPVwiUGFzc3dvcnQgw6RuZGVyblwiIGRhdGEtcmVjaWQ9XCInICsgZS5yZWNpZCArICdcIiBzdHlsZT1cInZpc2liaWxpdHk6IGhpZGRlblwiPlBXITwvZGl2Pic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2hlczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ3VzZXJuYW1lJywgbGFiZWw6ICdCZW51dHplcm5hbWUnLCB0eXBlOiAndGV4dCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdydWZuYW1lJywgbGFiZWw6ICdSdWZuYW1lJywgdHlwZTogJ3RleHQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGZpZWxkOiAnZmFtaWxpZW5uYW1lJywgbGFiZWw6ICdGYW1pbGllbm5hbWUnLCB0eXBlOiAndGV4dCcgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3J0RGF0YTogW3sgZmllbGQ6ICdrbGFzc2UnLCBkaXJlY3Rpb246ICdhc2MnIH0sIHsgZmllbGQ6ICdmYW1pbGllbm5hbWUnLCBkaXJlY3Rpb246ICdhc2MnIH0sIHsgZmllbGQ6ICdydWZuYW1lJywgZGlyZWN0aW9uOiAnYXNjJyB9XSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25BZGQ6IChldmVudCkgPT4geyB0aGF0Lm9uQWRkU3R1ZGVudCgpIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoZXZlbnQpID0+IHsgdGhhdC5vblVwZGF0ZVN0dWRlbnQoZXZlbnQpIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uRGVsZXRlOiAoZXZlbnQpID0+IHsgdGhhdC5vbkRlbGV0ZVN0dWRlbnQoZXZlbnQpIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LmNvbHVtbiA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdzJ1aVt0aGF0LnN0dWRlbnRHcmlkTmFtZV0uZWRpdEZpZWxkKGV2ZW50LnJlY2lkLCBldmVudC5jb2x1bW4pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvblNlbGVjdDogKGV2ZW50KSA9PiB7IGV2ZW50LmRvbmUoKCkgPT4geyB0aGF0Lm9uU2VsZWN0U3R1ZGVudChldmVudCkgfSkgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25VbnNlbGVjdDogKGV2ZW50KSA9PiB7IGV2ZW50LmRvbmUoKCkgPT4geyB0aGF0Lm9uVW5zZWxlY3RTdHVkZW50KGV2ZW50KSB9KSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkVGFibGVzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9KVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgb25VbnNlbGVjdFN0dWRlbnQoZXZlbnQpIHtcclxuICAgICAgICBsZXQgc3R1ZGVudEdyaWQgPSB3MnVpW3RoaXMuc3R1ZGVudEdyaWROYW1lXTtcclxuICAgICAgICBsZXQgc2VsZWN0aW9uID0gc3R1ZGVudEdyaWQuZ2V0U2VsZWN0aW9uKCk7XHJcblxyXG4gICAgICAgIGlmIChzZWxlY3Rpb24ubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIHN0dWRlbnRHcmlkLnRvb2xiYXIuZGlzYWJsZSgnY2hhbmdlQ2xhc3NCdXR0b24nKTtcclxuXHJcbiAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICBzdHVkZW50R3JpZC50b29sYmFyLmRpc2FibGUoJ3Bhc3N3b3JkQnV0dG9uJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBvblNlbGVjdFN0dWRlbnQoZXZlbnQ6IGFueSkge1xyXG5cclxuICAgICAgICBsZXQgc3R1ZGVudEdyaWQgPSB3MnVpW3RoaXMuc3R1ZGVudEdyaWROYW1lXTtcclxuXHJcbiAgICAgICAgbGV0IHNlbGVjdGlvbiA9IHN0dWRlbnRHcmlkLmdldFNlbGVjdGlvbigpO1xyXG5cclxuICAgICAgICAvLyBsZXQgc2VsZWN0aW9uID0gc3R1ZGVudEdyaWQuZ2V0U2VsZWN0aW9uKCkubWFwKChzdHIpID0+IHN0ci5yZWNpZCkuZmlsdGVyKCh2YWx1ZSwgaW5kZXgsIGFycmF5KSA9PiBhcnJheS5pbmRleE9mKHZhbHVlKSA9PT0gaW5kZXgpO1xyXG5cclxuICAgICAgICBpZiAoc2VsZWN0aW9uLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIHN0dWRlbnRHcmlkLnRvb2xiYXIuZW5hYmxlKCdjaGFuZ2VDbGFzc0J1dHRvbicpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICBzdHVkZW50R3JpZC50b29sYmFyLmRpc2FibGUoJ2NoYW5nZUNsYXNzQnV0dG9uJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2VsZWN0aW9uLmxlbmd0aCA9PSAxKSB7XHJcbiAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICBzdHVkZW50R3JpZC50b29sYmFyLmVuYWJsZSgncGFzc3dvcmRCdXR0b24nKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgc3R1ZGVudEdyaWQudG9vbGJhci5kaXNhYmxlKCdwYXNzd29yZEJ1dHRvbicpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2hhbmdlQ2xhc3MoKSB7XHJcbiAgICAgICAgbGV0IHJlY0lkczogbnVtYmVyW107XHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICBsZXQgc3R1ZGVudEdyaWQ6IFcyVUkuVzJHcmlkID0gdzJ1aVt0aGlzLnN0dWRlbnRHcmlkTmFtZV07XHJcbiAgICAgICAgbGV0IGNsYXNzZXNHcmlkOiBXMlVJLlcyR3JpZCA9IHcydWlbdGhpcy5jbGFzc2VzR3JpZE5hbWVdO1xyXG5cclxuICAgICAgICByZWNJZHMgPSA8bnVtYmVyW10+c3R1ZGVudEdyaWQuZ2V0U2VsZWN0aW9uKCk7XHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgLy8gcmVjSWRzID0gPGFueT5zdHVkZW50R3JpZC5nZXRTZWxlY3Rpb24oKS5tYXAoKHN0cikgPT4gc3RyLnJlY2lkKS5maWx0ZXIoKHZhbHVlLCBpbmRleCwgYXJyYXkpID0+IGFycmF5LmluZGV4T2YodmFsdWUpID09PSBpbmRleCk7XHJcbiAgICAgICAgbGV0IHN0dWRlbnRzOiBVc2VyRGF0YVtdID0gcmVjSWRzLm1hcCgoaWQpID0+IDxVc2VyRGF0YT5zdHVkZW50R3JpZC5nZXQoaWQgKyBcIlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMub3BlbkNob29zZUNsYXNzUG9wdXAoKG5ld0NsYXNzOiBDbGFzc0RhdGEpID0+IHtcclxuXHJcbiAgICAgICAgICAgIG5ld0NsYXNzID0gdGhhdC5hbGxDbGFzc2VzTGlzdC5maW5kKChjbCkgPT4gY2wuaWQgPT0gbmV3Q2xhc3MuaWQpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHJlcXVlc3Q6IENoYW5nZUNsYXNzT2ZTdHVkZW50c1JlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgICAgICBzdHVkZW50X2lkczogcmVjSWRzLFxyXG4gICAgICAgICAgICAgICAgbmV3X2NsYXNzX2lkOiBuZXdDbGFzcy5pZFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhamF4KFwiY2hhbmdlQ2xhc3NPZlN0dWRlbnRzXCIsIHJlcXVlc3QsIChyZXNwb25zZTogQ2hhbmdlQ2xhc3NPZlN0dWRlbnRzUmVzcG9uc2UpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICB3MmFsZXJ0KFwiRGllIFNjaMO8bGVyIHd1cmRlbiBlcmZvbGdyZWljaCBpbiBkaWUgS2xhc3NlIFwiICsgbmV3Q2xhc3MubmFtZSArIFwiIHZlcnNjaG9iZW4uXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtsYXNzZSBvZiB0aGlzLmFsbENsYXNzZXNMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAga2xhc3NlLnN0dWRlbnRzID0ga2xhc3NlLnN0dWRlbnRzLmZpbHRlcigoc3R1ZGVudCkgPT4gcmVjSWRzLmluZGV4T2Yoc3R1ZGVudC5pZCkgPCAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBzdHVkZW50IG9mIHN0dWRlbnRzKSBuZXdDbGFzcy5zdHVkZW50cy5wdXNoKHN0dWRlbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHJjIG9mIGNsYXNzZXNHcmlkLnJlY29yZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcmMxID0gPENsYXNzRGF0YT5yYztcclxuICAgICAgICAgICAgICAgICAgICByYzEuc3R1ZGVudHMgPSB0aGlzLmFsbENsYXNzZXNMaXN0LmZpbmQoKGNsKSA9PiBjbC5pZCA9PSByYzEuaWQpLnN0dWRlbnRzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2xhc3Nlc0dyaWQucmVmcmVzaCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoYXQudXBkYXRlU3R1ZGVudFRhYmxlVG9TZWxlY3RlZENsYXNzZXMoKTtcclxuXHJcbiAgICAgICAgICAgIH0sIChtZXNzYWdlOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgIHcyYWxlcnQoXCJGZWhsZXIgYmVpbSB2ZXJzZXR6ZW4gZGVyIFNjaMO8bGVyOiBcIiArIG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfSwgdGhpcy5hbGxDbGFzc2VzTGlzdCk7XHJcblxyXG5cclxuXHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBjaGFuZ2VQYXNzd29yZChyZWNJZHM6IG51bWJlcltdID0gW10pIHtcclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG5cclxuICAgICAgICBsZXQgc3R1ZGVudEdyaWQ6IFcyVUkuVzJHcmlkID0gdzJ1aVt0aGlzLnN0dWRlbnRHcmlkTmFtZV07XHJcblxyXG5cclxuICAgICAgICBpZiAocmVjSWRzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHJlY0lkcyA9IDxudW1iZXJbXT5zdHVkZW50R3JpZC5nZXRTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIC8vIHJlY0lkcyA9IDxhbnk+c3R1ZGVudEdyaWQuZ2V0U2VsZWN0aW9uKCkubWFwKChzdHIpID0+IHN0ci5yZWNpZCkuZmlsdGVyKCh2YWx1ZSwgaW5kZXgsIGFycmF5KSA9PiBhcnJheS5pbmRleE9mKHZhbHVlKSA9PT0gaW5kZXgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHJlY0lkcy5sZW5ndGggIT0gMSkge1xyXG4gICAgICAgICAgICBzdHVkZW50R3JpZC5lcnJvcihcIlp1bSDDhG5kZXJuIGVpbmVzIFBhc3N3b3J0cyBtdXNzIGdlbmF1IGVpbiBTY2jDvGxlciBhdXNnZXfDpGhsdCB3ZXJkZW4uXCIpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCBzdHVkZW50OiBVc2VyRGF0YSA9IDxVc2VyRGF0YT5zdHVkZW50R3JpZC5nZXQocmVjSWRzWzBdICsgXCJcIiwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHBhc3N3b3JkRm9yOiBzdHJpbmcgPSBzdHVkZW50LnJ1Zm5hbWUgKyBcIiBcIiArIHN0dWRlbnQuZmFtaWxpZW5uYW1lICsgXCIgKFwiICsgc3R1ZGVudC51c2VybmFtZSArIFwiKVwiO1xyXG4gICAgICAgICAgICBQYXNzd29yZFBvcHVwLm9wZW4ocGFzc3dvcmRGb3IsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHN0dWRlbnRHcmlkLnNlYXJjaFJlc2V0KCk7XHJcbiAgICAgICAgICAgICAgICB0aGF0LnByZXBhcmVQYXNzd29yZEJ1dHRvbnMoKTtcclxuICAgICAgICAgICAgfSwgKHBhc3N3b3JkKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgc3R1ZGVudC5wYXNzd29yZCA9IHBhc3N3b3JkO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0OiBDUlVEVXNlclJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJ1cGRhdGVcIixcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBzdHVkZW50LFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICB3MnV0aWxzLmxvY2soalF1ZXJ5KCdib2R5JyksIFwiQml0dGUgd2FydGVuLCBkYXMgSGFzaGVuIDxicj4gZGVzIFBhc3N3b3J0cyBrYW5uIDxicj5iaXMgenUgMSBNaW51dGU8YnI+IGRhdWVybi4uLlwiLCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBhamF4KFwiQ1JVRFVzZXJcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBDUlVEUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICB3MnV0aWxzLnVubG9jayhqUXVlcnkoJ2JvZHknKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHcyYWxlcnQoJ0RhcyBQYXNzd29ydCBmw7xyICcgKyBzdHVkZW50LnJ1Zm5hbWUgKyBcIiBcIiArIHN0dWRlbnQuZmFtaWxpZW5uYW1lICsgXCIgKFwiICsgc3R1ZGVudC51c2VybmFtZSArIFwiKSB3dXJkZSBlcmZvbGdyZWljaCBnZcOkbmRlcnQuXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0dWRlbnRHcmlkLnNlYXJjaFJlc2V0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5wcmVwYXJlUGFzc3dvcmRCdXR0b25zKCk7XHJcbiAgICAgICAgICAgICAgICB9LCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICAgICAgdzJ1dGlscy51bmxvY2soalF1ZXJ5KCdib2R5JykpO1xyXG4gICAgICAgICAgICAgICAgICAgIHcyYWxlcnQoJ0ZlaGxlciBiZWltIMOEbmRlcm4gZGVzIFBhc3N3b3J0cyEnKTtcclxuICAgICAgICAgICAgICAgICAgICBzdHVkZW50R3JpZC5zZWFyY2hSZXNldCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQucHJlcGFyZVBhc3N3b3JkQnV0dG9ucygpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG5cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgb25EZWxldGVDbGFzcyhldmVudDogYW55KSB7XHJcbiAgICAgICAgaWYgKCFldmVudC5mb3JjZSB8fCBldmVudC5pc1N0b3BwZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IHJlY0lkczogbnVtYmVyW107XHJcblxyXG4gICAgICAgIGxldCBjbGFzc2VzR3JpZDogVzJVSS5XMkdyaWQgPSB3MnVpW3RoaXMuY2xhc3Nlc0dyaWROYW1lXTtcclxuXHJcbiAgICAgICAgcmVjSWRzID0gPG51bWJlcltdPmNsYXNzZXNHcmlkLmdldFNlbGVjdGlvbigpO1xyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIC8vIHJlY0lkcyA9IDxhbnk+Y2xhc3Nlc0dyaWQuZ2V0U2VsZWN0aW9uKCkubWFwKChzdHIpID0+IHN0ci5yZWNpZCkuZmlsdGVyKCh2YWx1ZSwgaW5kZXgsIGFycmF5KSA9PiBhcnJheS5pbmRleE9mKHZhbHVlKSA9PT0gaW5kZXgpO1xyXG5cclxuICAgICAgICAvLyBsZXQgc2VsZWN0ZWRDbGFzc2VzOiBDbGFzc0RhdGFbXSA9IDxDbGFzc0RhdGFbXT5jbGFzc2VzR3JpZC5yZWNvcmRzLmZpbHRlcihcclxuICAgICAgICAvLyAgICAgKGNkOiBDbGFzc0RhdGEpID0+IHJlY0lkcy5pbmRleE9mKGNkLmlkKSA+PSAwKTtcclxuXHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBDUlVEQ2xhc3NSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBcImRlbGV0ZVwiLFxyXG4gICAgICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgICAgICBpZHM6IHJlY0lkcyxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFqYXgoXCJDUlVEQ2xhc3NcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBDUlVEUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgcmVjSWRzLmZvckVhY2goaWQgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2xhc3Nlc0dyaWQucmVtb3ZlKFwiXCIgKyBpZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFsbENsYXNzZXNMaXN0ID0gdGhpcy5hbGxDbGFzc2VzTGlzdC5maWx0ZXIoY2QgPT4gY2QuaWQgIT0gaWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICBjbGFzc2VzR3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgfSwgKCkgPT4ge1xyXG4gICAgICAgICAgICBjbGFzc2VzR3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG9uVXBkYXRlQ2xhc3MoZXZlbnQ6IGFueSkge1xyXG4gICAgICAgIGxldCBjbGFzc2VzR3JpZDogVzJVSS5XMkdyaWQgPSB3MnVpW3RoaXMuY2xhc3Nlc0dyaWROYW1lXTtcclxuXHJcbiAgICAgICAgbGV0IGRhdGE6IENsYXNzRGF0YSA9IDxDbGFzc0RhdGE+Y2xhc3Nlc0dyaWQucmVjb3Jkc1tldmVudC5pbmRleF07XHJcblxyXG4gICAgICAgIGxldCBmaWVsZCA9IGNsYXNzZXNHcmlkLmNvbHVtbnNbZXZlbnQuY29sdW1uXVtcImZpZWxkXCJdO1xyXG5cclxuICAgICAgICBkYXRhW2ZpZWxkXSA9IGV2ZW50LnZhbHVlX25ldztcclxuXHJcbiAgICAgICAgaWYgKGV2ZW50LmNvbHVtbiA9PSA0KSB7XHJcbiAgICAgICAgICAgIGxldCB0ZWFjaGVyOiBUZWFjaGVyRGF0YSA9IGV2ZW50LnZhbHVlX25ldztcclxuICAgICAgICAgICAgaWYgKHRlYWNoZXIgPT0gbnVsbCB8fCB0eXBlb2YgdGVhY2hlciA9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBldmVudC52YWx1ZV9uZXcgPSB0ZWFjaGVyLnVzZXJEYXRhLnJ1Zm5hbWUgKyBcIiBcIiArIHRlYWNoZXIudXNlckRhdGEuZmFtaWxpZW5uYW1lO1xyXG4gICAgICAgICAgICAgICAgZGF0YS56d2VpdGxlaHJrcmFmdF9pZCA9IHRlYWNoZXIudXNlckRhdGEuaWQgPT0gLTEgPyBudWxsIDogdGVhY2hlci51c2VyRGF0YS5pZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IENSVURDbGFzc1JlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFwidXBkYXRlXCIsXHJcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhamF4KFwiQ1JVRENsYXNzXCIsIHJlcXVlc3QsIChyZXNwb25zZTogQ1JVRFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICBkZWxldGUgZGF0YVtcIncydWlcIl1bXCJjaGFuZ2VzXCJdW2ZpZWxkXTtcclxuICAgICAgICAgICAgY2xhc3Nlc0dyaWQucmVmcmVzaENlbGwoZGF0YVtcInJlY2lkXCJdLCBmaWVsZCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgY2xhc3NEYXRhID0gdGhpcy5hbGxDbGFzc2VzTGlzdC5maW5kKGMgPT4gXCJcIiArIGMuaWQgPT0gZGF0YVtcInJlY2lkXCJdKTtcclxuICAgICAgICAgICAgaWYgKGNsYXNzRGF0YSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBjbGFzc0RhdGFbZmllbGRdID0gZXZlbnQudmFsdWVfbmV3O1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkID09IFwibmFtZVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NEYXRhLnRleHQgPSBldmVudC52YWx1ZV9uZXc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGRhdGFbZmllbGRdID0gZXZlbnQudmFsdWVfb3JpZ2luYWw7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhW1widzJ1aVwiXVtcImNoYW5nZXNcIl1bZmllbGRdO1xyXG4gICAgICAgICAgICBjbGFzc2VzR3JpZC5yZWZyZXNoQ2VsbChkYXRhW1wicmVjaWRcIl0sIGZpZWxkKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBvbkFkZENsYXNzKCkge1xyXG4gICAgICAgIGxldCB1c2VyRGF0YSA9IHRoaXMuYWRtaW5pc3RyYXRpb24udXNlckRhdGE7XHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBDUlVEQ2xhc3NSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBcImNyZWF0ZVwiLFxyXG4gICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICBpZDogLTEsXHJcbiAgICAgICAgICAgICAgICBzY2h1bGVfaWQ6IHVzZXJEYXRhLnNjaHVsZV9pZCxcclxuICAgICAgICAgICAgICAgIGxlaHJrcmFmdF9pZDogdXNlckRhdGEuaWQsXHJcbiAgICAgICAgICAgICAgICB6d2VpdGxlaHJrcmFmdF9pZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiTmFtZSBkZXIgS2xhc3NlXCIsXHJcbiAgICAgICAgICAgICAgICBha3RpdjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHN0dWRlbnRzOiBbXVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGFqYXgoXCJDUlVEQ2xhc3NcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBDUlVEUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgbGV0IGNsYXNzZXNHcmlkOiBXMlVJLlcyR3JpZCA9IHcydWlbdGhpcy5jbGFzc2VzR3JpZE5hbWVdO1xyXG4gICAgICAgICAgICBsZXQgY2Q6IENsYXNzRGF0YSA9IHJlcXVlc3QuZGF0YTtcclxuICAgICAgICAgICAgY2QuaWQgPSByZXNwb25zZS5pZDtcclxuICAgICAgICAgICAgY2xhc3Nlc0dyaWQuYWRkKGNkKTtcclxuICAgICAgICAgICAgY2xhc3Nlc0dyaWQuZWRpdEZpZWxkKGNkLmlkICsgXCJcIiwgMSwgdW5kZWZpbmVkLCB7IGtleUNvZGU6IDEzIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmFsbENsYXNzZXNMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgaWQ6IGNkLmlkLFxyXG4gICAgICAgICAgICAgICAgbGVocmtyYWZ0X2lkOiB1c2VyRGF0YS5pZCxcclxuICAgICAgICAgICAgICAgIHp3ZWl0bGVocmtyYWZ0X2lkOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgc2NodWxlX2lkOiB1c2VyRGF0YS5zY2h1bGVfaWQsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBjZC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgYWt0aXY6IGNkLmFrdGl2LFxyXG4gICAgICAgICAgICAgICAgc3R1ZGVudHM6IFtdXHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdFRleHRJbkNlbGwoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgb25VbnNlbGVjdENsYXNzKGV2ZW50OiBhbnkpIHtcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVTdHVkZW50VGFibGVUb1NlbGVjdGVkQ2xhc3NlcygpO1xyXG4gICAgICAgIHRoaXMucHJlcGFyZVBhc3N3b3JkQnV0dG9ucygpO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgb25TZWxlY3RDbGFzcyhldmVudDogYW55KSB7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlU3R1ZGVudFRhYmxlVG9TZWxlY3RlZENsYXNzZXMoKTtcclxuICAgICAgICB0aGlzLnByZXBhcmVQYXNzd29yZEJ1dHRvbnMoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJlcGFyZVBhc3N3b3JkQnV0dG9ucygpIHtcclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGpRdWVyeSgnLnB3X2J1dHRvbicpLm9mZignY2xpY2snKTtcclxuICAgICAgICAgICAgalF1ZXJ5KCcucHdfYnV0dG9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCByZWNpZCA9IGpRdWVyeShlLnRhcmdldCkuZGF0YSgncmVjaWQnKTtcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmNoYW5nZVBhc3N3b3JkKFtyZWNpZF0pO1xyXG4gICAgICAgICAgICB9KS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xyXG4gICAgICAgIH0sIDEwMDApO1xyXG4gICAgfVxyXG5cclxuICAgIGxvYWRUYWJsZXNGcm9tVGVhY2hlck9iamVjdChjYWxsYmFjazogKCkgPT4gdm9pZCkge1xyXG5cclxuICAgICAgICBsZXQgcmVxdWVzdDogR2V0VGVhY2hlckRhdGFSZXF1ZXN0ID0geyBzY2hvb2xfaWQ6IHRoaXMuYWRtaW5pc3RyYXRpb24udXNlckRhdGEuc2NodWxlX2lkIH07XHJcblxyXG4gICAgICAgIGFqYXgoXCJnZXRUZWFjaGVyRGF0YVwiLCByZXF1ZXN0LCAoZGF0YTogR2V0VGVhY2hlckRhdGFSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRlYWNoZXJEYXRhTGlzdCA9IGRhdGEudGVhY2hlckRhdGE7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCB0ZWFjaGVyIG9mIHRoaXMudGVhY2hlckRhdGFMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICB0ZWFjaGVyW1wiaWRcIl0gPSB0ZWFjaGVyLnVzZXJEYXRhLmlkO1xyXG4gICAgICAgICAgICAgICAgdGVhY2hlcltcInVzZXJuYW1lXCJdID0gdGVhY2hlci51c2VyRGF0YS51c2VybmFtZTtcclxuICAgICAgICAgICAgICAgIHRlYWNoZXJbXCJmYW1pbGllbm5hbWVcIl0gPSB0ZWFjaGVyLnVzZXJEYXRhLmZhbWlsaWVubmFtZTtcclxuICAgICAgICAgICAgICAgIHRlYWNoZXJbXCJydWZuYW1lXCJdID0gdGVhY2hlci51c2VyRGF0YS5ydWZuYW1lO1xyXG4gICAgICAgICAgICAgICAgdGVhY2hlcltcInRleHRcIl0gPSB0ZWFjaGVyLnVzZXJEYXRhLnJ1Zm5hbWUgKyBcIiBcIiArIHRlYWNoZXIudXNlckRhdGEuZmFtaWxpZW5uYW1lXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XHJcblxyXG4gICAgICAgIH0sICgpID0+IHtcclxuICAgICAgICAgICAgdzJhbGVydCgnRmVobGVyIGJlaW0gSG9sZW4gZGVyIERhdGVuLicpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHVwZGF0ZVN0dWRlbnRUYWJsZVRvU2VsZWN0ZWRDbGFzc2VzKCkge1xyXG4gICAgICAgIGxldCByZWNJZHM6IG51bWJlcltdO1xyXG5cclxuICAgICAgICBsZXQgY2xhc3Nlc0dyaWQ6IFcyVUkuVzJHcmlkID0gdzJ1aVt0aGlzLmNsYXNzZXNHcmlkTmFtZV07XHJcblxyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIC8vIHJlY0lkcyA9IDxhbnk+Y2xhc3Nlc0dyaWQuZ2V0U2VsZWN0aW9uKCkubWFwKChzdHIpID0+IHN0ci5yZWNpZCkuZmlsdGVyKCh2YWx1ZSwgaW5kZXgsIGFycmF5KSA9PiBhcnJheS5pbmRleE9mKHZhbHVlKSA9PT0gaW5kZXgpO1xyXG5cclxuICAgICAgICByZWNJZHMgPSA8bnVtYmVyW10+Y2xhc3Nlc0dyaWQuZ2V0U2VsZWN0aW9uKCk7XHJcblxyXG4gICAgICAgIGxldCBzZWxlY3RlZENsYXNzZXM6IENsYXNzRGF0YVtdID0gdGhpcy5hbGxDbGFzc2VzTGlzdC5maWx0ZXIoXHJcbiAgICAgICAgICAgIChjZDogQ2xhc3NEYXRhKSA9PiByZWNJZHMuaW5kZXhPZihjZC5pZCkgPj0gMCk7XHJcblxyXG4gICAgICAgIGxldCBzdHVkZW50c0dyaWQ6IFcyVUkuVzJHcmlkID0gdzJ1aVt0aGlzLnN0dWRlbnRHcmlkTmFtZV07XHJcblxyXG4gICAgICAgIGxldCBzdHVkZW50TGlzdDogVXNlckRhdGFbXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBjZCBvZiBzZWxlY3RlZENsYXNzZXMpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgc2Qgb2YgY2Quc3R1ZGVudHMpIHtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgc2Qua2xhc3NlID0gY2QubmFtZTtcclxuICAgICAgICAgICAgICAgIHN0dWRlbnRMaXN0LnB1c2goc2QpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzdHVkZW50c0dyaWQucmVjb3JkcyA9IHN0dWRlbnRMaXN0O1xyXG4gICAgICAgIC8vIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgIHN0dWRlbnRzR3JpZC5jbGVhcigpO1xyXG4gICAgICAgIHN0dWRlbnRzR3JpZC5hZGQoc3R1ZGVudExpc3QpO1xyXG4gICAgICAgIHN0dWRlbnRzR3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgdGhpcy5vblNlbGVjdFN0dWRlbnQobnVsbCk7XHJcbiAgICAgICAgLy8gfSwgMjApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBsb2FkQ2xhc3NEYXRhTGlzdChjYWxsYmFjazogKCkgPT4gdm9pZCkge1xyXG5cclxuICAgICAgICBsZXQgcmVxdWVzdDogR2V0Q2xhc3Nlc0RhdGFSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICBzY2hvb2xfaWQ6IHRoaXMuYWRtaW5pc3RyYXRpb24udXNlckRhdGEuc2NodWxlX2lkXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhamF4KCdnZXRDbGFzc2VzRGF0YScsIHJlcXVlc3QsIChyZXNwb25zZTogR2V0Q2xhc3Nlc0RhdGFSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmFsbENsYXNzZXNMaXN0ID0gcmVzcG9uc2UuY2xhc3NEYXRhTGlzdDtcclxuICAgICAgICAgICAgZm9yIChsZXQgY2Qgb2YgdGhpcy5hbGxDbGFzc2VzTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgY2QudGV4dCA9IGNkLm5hbWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGxvYWRUYWJsZXMoKSB7XHJcbiAgICAgICAgbGV0IGNsYXNzZXNUYWJsZSA9IHcydWlbdGhpcy5jbGFzc2VzR3JpZE5hbWVdO1xyXG4gICAgICAgIGlmKGNsYXNzZXNUYWJsZSA9PSBudWxsKXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjbGFzc2VzVGFibGUuY2xlYXIoKTtcclxuXHJcbiAgICAgICAgY2xhc3Nlc1RhYmxlLmFkZCh0aGlzLmFsbENsYXNzZXNMaXN0KTtcclxuICAgICAgICBjbGFzc2VzVGFibGUucmVmcmVzaCgpO1xyXG4gICAgfVxyXG5cclxuICAgIG9uRGVsZXRlU3R1ZGVudChldmVudDogYW55KSB7XHJcbiAgICAgICAgaWYgKCFldmVudC5mb3JjZSB8fCBldmVudC5pc1N0b3BwZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IHJlY0lkczogbnVtYmVyW107XHJcblxyXG4gICAgICAgIGxldCBzdHVkZW50R3JpZDogVzJVSS5XMkdyaWQgPSB3MnVpW3RoaXMuc3R1ZGVudEdyaWROYW1lXTtcclxuICAgICAgICBsZXQgY2xhc3Nlc0dyaWQ6IFcyVUkuVzJHcmlkID0gdzJ1aVt0aGlzLmNsYXNzZXNHcmlkTmFtZV07XHJcblxyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIC8vIHJlY0lkcyA9IDxhbnk+c3R1ZGVudEdyaWQuZ2V0U2VsZWN0aW9uKCkubWFwKChzdHIpID0+IHN0ci5yZWNpZCkuZmlsdGVyKCh2YWx1ZSwgaW5kZXgsIGFycmF5KSA9PiBhcnJheS5pbmRleE9mKHZhbHVlKSA9PT0gaW5kZXgpO1xyXG4gICAgICAgIHJlY0lkcyA9IDxudW1iZXJbXT5zdHVkZW50R3JpZC5nZXRTZWxlY3Rpb24oKTtcclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IENSVURVc2VyUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgdHlwZTogXCJkZWxldGVcIixcclxuICAgICAgICAgICAgZGF0YTogbnVsbCxcclxuICAgICAgICAgICAgaWRzOiByZWNJZHMsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIGFqYXgoXCJDUlVEVXNlclwiLCByZXF1ZXN0LCAocmVzcG9uc2U6IENSVURSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICByZWNJZHMuZm9yRWFjaChpZCA9PiBzdHVkZW50R3JpZC5yZW1vdmUoXCJcIiArIGlkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWxsQ2xhc3Nlc0xpc3QuZm9yRWFjaChrbGFzcyA9PiB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGtsYXNzLnN0dWRlbnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0dWRlbnQgPSBrbGFzcy5zdHVkZW50c1tpXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVjSWRzLmluZGV4T2Yoc3R1ZGVudC5pZCkgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBrbGFzcy5zdHVkZW50cy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICBzdHVkZW50R3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgICAgIGNsYXNzZXNHcmlkLnJlZnJlc2goKTtcclxuICAgICAgICB9LCAobWVzc2FnZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgIHcyYWxlcnQoJ0ZlaGxlciBiZWltIEzDtnNjaGVuIGRlciBTY2jDvGxlcjogJyArIG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICBzdHVkZW50R3JpZC5yZWZyZXNoKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG9uVXBkYXRlU3R1ZGVudChldmVudDogYW55KSB7XHJcbiAgICAgICAgbGV0IHN0dWRlbnRHcmlkOiBXMlVJLlcyR3JpZCA9IHcydWlbdGhpcy5zdHVkZW50R3JpZE5hbWVdO1xyXG5cclxuICAgICAgICBsZXQgZGF0YTogVXNlckRhdGEgPSA8VXNlckRhdGE+c3R1ZGVudEdyaWQucmVjb3Jkc1tldmVudC5pbmRleF07XHJcblxyXG4gICAgICAgIGxldCB2YWx1ZV9uZXdfcHJlc2VudGVkID0gZXZlbnQudmFsdWVfbmV3O1xyXG4gICAgICAgIGxldCB2YWx1ZV9vbGRfZGF0YWJhc2U6IG51bWJlciA9IGRhdGEua2xhc3NlX2lkO1xyXG5cclxuICAgICAgICBpZiAoZXZlbnQuY29sdW1uID09IDEpIHtcclxuICAgICAgICAgICAgbGV0IGNsYXNzRGF0YTogQ2xhc3NEYXRhID0gZXZlbnQudmFsdWVfbmV3O1xyXG4gICAgICAgICAgICB2YWx1ZV9uZXdfcHJlc2VudGVkID0gY2xhc3NEYXRhLm5hbWU7XHJcbiAgICAgICAgICAgIGlmIChldmVudC52YWx1ZV9uZXcuaWQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkYXRhLmtsYXNzZV9pZCA9IGV2ZW50LnZhbHVlX25ldy5pZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBmaWVsZCA9IHN0dWRlbnRHcmlkLmNvbHVtbnNbZXZlbnQuY29sdW1uXVtcImZpZWxkXCJdO1xyXG4gICAgICAgIGRhdGFbZmllbGRdID0gdmFsdWVfbmV3X3ByZXNlbnRlZDtcclxuXHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBDUlVEVXNlclJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFwidXBkYXRlXCIsXHJcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhamF4KFwiQ1JVRFVzZXJcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBDUlVEUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgZGVsZXRlIGRhdGFbXCJ3MnVpXCJdW1wiY2hhbmdlc1wiXVtmaWVsZF07XHJcbiAgICAgICAgICAgIHN0dWRlbnRHcmlkLnJlZnJlc2hDZWxsKGRhdGFbXCJyZWNpZFwiXSwgZmllbGQpO1xyXG4gICAgICAgIH0sIChtZXNzYWdlOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgZGF0YVtmaWVsZF0gPSBldmVudC52YWx1ZV9vcmlnaW5hbDtcclxuICAgICAgICAgICAgZGF0YS5rbGFzc2VfaWQgPSB2YWx1ZV9vbGRfZGF0YWJhc2U7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhW1widzJ1aVwiXVtcImNoYW5nZXNcIl1bZmllbGRdO1xyXG4gICAgICAgICAgICBzdHVkZW50R3JpZC5yZWZyZXNoQ2VsbChkYXRhW1wicmVjaWRcIl0sIGZpZWxkKTtcclxuICAgICAgICAgICAgYWxlcnQobWVzc2FnZSk7XHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgIH1cclxuXHJcbiAgICBvbkFkZFN0dWRlbnQoKSB7XHJcbiAgICAgICAgbGV0IHVzZXJEYXRhID0gdGhpcy5hZG1pbmlzdHJhdGlvbi51c2VyRGF0YTtcclxuICAgICAgICBsZXQgc3R1ZGVudEdyaWQ6IFcyVUkuVzJHcmlkID0gdzJ1aVt0aGlzLnN0dWRlbnRHcmlkTmFtZV07XHJcblxyXG4gICAgICAgIGxldCBjbGFzc2VzR3JpZDogVzJVSS5XMkdyaWQgPSB3MnVpW3RoaXMuY2xhc3Nlc0dyaWROYW1lXTtcclxuXHJcbiAgICAgICAgbGV0IHNlbGVjdGVkQ2xhc3NlcyA9IDxudW1iZXJbXT5jbGFzc2VzR3JpZC5nZXRTZWxlY3Rpb24oKTtcclxuXHJcbiAgICAgICAgLy8gbGV0IHNlbGVjdGVkQ2xhc3NlcyA9IDxudW1iZXJbXT5jbGFzc2VzR3JpZC5nZXRTZWxlY3Rpb24oKS5maWx0ZXIoKHZhbHVlLCBpbmRleCwgYXJyYXkpID0+IGFycmF5LmluZGV4T2YodmFsdWUpID09PSBpbmRleCkubWFwKGNsID0+ICg8YW55PmNsKS5yZWNpZCk7XHJcbiAgICAgICAgaWYgKHNlbGVjdGVkQ2xhc3Nlcy5sZW5ndGggIT0gMSkge1xyXG4gICAgICAgICAgICBzdHVkZW50R3JpZC5lcnJvcihcIldlbm4gU2llIFNjaMO8bGVyIGhpbnp1ZsO8Z2VuIG3DtmNodGVuIG11c3MgbGlua3MgZ2VuYXUgZWluZSBLbGFzc2UgYXVzZ2V3w6RobHQgc2Vpbi5cIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGNsYXNzSWQgPSBzZWxlY3RlZENsYXNzZXNbMF07XHJcbiAgICAgICAgbGV0IGtsYXNzID0gPENsYXNzRGF0YT5jbGFzc2VzR3JpZC5nZXQoXCJcIiArIGNsYXNzSWQsIGZhbHNlKTtcclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IENSVURVc2VyUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgdHlwZTogXCJjcmVhdGVcIixcclxuICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgaWQ6IC0xLFxyXG4gICAgICAgICAgICAgICAgc2NodWxlX2lkOiB1c2VyRGF0YS5zY2h1bGVfaWQsXHJcbiAgICAgICAgICAgICAgICBrbGFzc2VfaWQ6IGNsYXNzSWQsXHJcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogXCJCZW51dHplcm5hbWVcIiArIE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwKSxcclxuICAgICAgICAgICAgICAgIHJ1Zm5hbWU6IFwiUnVmbmFtZVwiLFxyXG4gICAgICAgICAgICAgICAgZmFtaWxpZW5uYW1lOiBcIkZhbWlsaWVubmFtZVwiLFxyXG4gICAgICAgICAgICAgICAgaXNfYWRtaW46IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgaXNfc2Nob29sYWRtaW46IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgaXNfdGVhY2hlcjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBwYXNzd29yZDogTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwMDAwMDApICsgXCJ4XCJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICB3MnV0aWxzLmxvY2soalF1ZXJ5KCdib2R5JyksIFwiQml0dGUgd2FydGVuLCBkYXMgSGFzaGVuIDxicj4gZGVzIFBhc3N3b3J0cyBrYW5uIDxicj5iaXMgenUgMSBNaW51dGU8YnI+IGRhdWVybi4uLlwiLCB0cnVlKTtcclxuXHJcbiAgICAgICAgYWpheChcIkNSVURVc2VyXCIsIHJlcXVlc3QsIChyZXNwb25zZTogQ1JVRFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCB1ZDogVXNlckRhdGEgPSByZXF1ZXN0LmRhdGE7XHJcbiAgICAgICAgICAgIHVkLmlkID0gcmVzcG9uc2UuaWQ7XHJcbiAgICAgICAgICAgIHVkW1wia2xhc3NlXCJdID0ga2xhc3MubmFtZTtcclxuICAgICAgICAgICAgc3R1ZGVudEdyaWQuYWRkKHVkKTtcclxuICAgICAgICAgICAgc3R1ZGVudEdyaWQuZWRpdEZpZWxkKHVkLmlkICsgXCJcIiwgMiwgdW5kZWZpbmVkLCB7IGtleUNvZGU6IDEzIH0pO1xyXG4gICAgICAgICAgICBrbGFzcy5zdHVkZW50cy5wdXNoKHVkKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0VGV4dEluQ2VsbCgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wcmVwYXJlUGFzc3dvcmRCdXR0b25zKCk7XHJcbiAgICAgICAgICAgIGNsYXNzZXNHcmlkLnJlZnJlc2goKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICB3MnV0aWxzLnVubG9jayhqUXVlcnkoJ2JvZHknKSk7XHJcblxyXG4gICAgICAgIH0sIChlcnJvcm1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIHcydXRpbHMudW5sb2NrKGpRdWVyeSgnYm9keScpKTtcclxuICAgICAgICAgICAgdzJhbGVydChcIkJlaW0gQW5sZWdlbiBkZXMgQmVudXR6ZXJzIGlzdCBlaW4gRmVobGVyIGF1ZmdldHJldGVuOiBcIiArIGVycm9ybWVzc2FnZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdENob29zZUNsYXNzUG9wdXAoKSB7XHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIGlmICghdzJ1aS5jaG9vc2VDbGFzc0Zvcm0pIHtcclxuICAgICAgICAgICAgalF1ZXJ5KCkudzJmb3JtKHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdjaG9vc2VDbGFzc0Zvcm0nLFxyXG4gICAgICAgICAgICAgICAgc3R5bGU6ICdib3JkZXI6IDBweDsgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7JyxcclxuICAgICAgICAgICAgICAgIGZvcm1IVE1MOlxyXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwidzJ1aS1wYWdlIHBhZ2UtMFwiPicgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgICAgPGRpdiBjbGFzcz1cIncydWktZmllbGRcIj4nICtcclxuICAgICAgICAgICAgICAgICAgICAnICAgICAgICA8bGFiZWw+TmV1ZSBLbGFzc2U6PC9sYWJlbD4nICtcclxuICAgICAgICAgICAgICAgICAgICAnICAgICAgICA8ZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgICAgICAgICAgIDxpbnB1dCBuYW1lPVwibmV3Q2xhc3NcIiB0eXBlPVwidGV4dFwiIHN0eWxlPVwid2lkdGg6IDE1MHB4XCIvPicgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgICAgICAgIDwvZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgICAgPC9kaXY+JyArXHJcbiAgICAgICAgICAgICAgICAgICAgJzwvZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwidzJ1aS1idXR0b25zXCI+JyArXHJcbiAgICAgICAgICAgICAgICAgICAgJyAgICA8YnV0dG9uIGNsYXNzPVwidzJ1aS1idG5cIiBuYW1lPVwiY2FuY2VsXCI+QWJicmVjaGVuPC9idXR0b24+JyArXHJcbiAgICAgICAgICAgICAgICAgICAgJyAgICA8YnV0dG9uIGNsYXNzPVwidzJ1aS1idG5cIiBuYW1lPVwiT0tcIj5PSzwvYnV0dG9uPicgK1xyXG4gICAgICAgICAgICAgICAgICAgICc8L2Rpdj4nLFxyXG4gICAgICAgICAgICAgICAgZmllbGRzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWVsZDogJ25ld0NsYXNzJywgdHlwZTogJ2xpc3QnLCByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogeyBpdGVtczogW10gfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgcmVjb3JkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3Q2xhc3M6ICdKb2huJyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgXCJjYW5jZWxcIjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3MnBvcHVwLmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBcIk9LXCI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdzJwb3B1cC5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm15Q2FsbGJhY2sodGhpcy5yZWNvcmQubmV3Q2xhc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG9wZW5DaG9vc2VDbGFzc1BvcHVwKGNhbGxiYWNrOiAobmV3Q2xhc3M6IENsYXNzRGF0YSkgPT4gdm9pZCwgY2xhc3NMaXN0OiBhbnkpIHtcclxuXHJcbiAgICAgICAgdzJ1aVtcImNob29zZUNsYXNzRm9ybVwiXS5teUNhbGxiYWNrID0gY2FsbGJhY2s7XHJcbiAgICAgICAgdzJ1aVtcImNob29zZUNsYXNzRm9ybVwiXS5maWVsZHNbMF0ub3B0aW9ucy5pdGVtcyA9IGNsYXNzTGlzdDtcclxuXHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgalF1ZXJ5KCkudzJwb3B1cCgnb3BlbicsIHtcclxuICAgICAgICAgICAgdGl0bGU6ICdOZXVlIEtsYXNzZSB3w6RobGVuJyxcclxuICAgICAgICAgICAgYm9keTogJzxkaXYgaWQ9XCJmb3JtXCIgc3R5bGU9XCJ3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMDAlO1wiPjwvZGl2PicsXHJcbiAgICAgICAgICAgIHN0eWxlOiAncGFkZGluZzogMTVweCAwcHggMHB4IDBweCcsXHJcbiAgICAgICAgICAgIHdpZHRoOiA1MDAsXHJcbiAgICAgICAgICAgIGhlaWdodDogMzAwLFxyXG4gICAgICAgICAgICBzaG93TWF4OiB0cnVlLFxyXG4gICAgICAgICAgICBvblRvZ2dsZTogZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBqUXVlcnkodzJ1aS5jaG9vc2VDbGFzc0Zvcm0uYm94KS5oaWRlKCk7XHJcbiAgICAgICAgICAgICAgICBldmVudC5vbkNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGpRdWVyeSh3MnVpLmNob29zZUNsYXNzRm9ybS5ib3gpLnNob3coKTtcclxuICAgICAgICAgICAgICAgICAgICB3MnVpLmNob29zZUNsYXNzRm9ybS5yZXNpemUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgb25PcGVuOiBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50Lm9uQ29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc3BlY2lmeWluZyBhbiBvbk9wZW4gaGFuZGxlciBpbnN0ZWFkIGlzIGVxdWl2YWxlbnQgdG8gc3BlY2lmeWluZyBhbiBvbkJlZm9yZU9wZW4gaGFuZGxlciwgd2hpY2ggd291bGQgbWFrZSB0aGlzIGNvZGUgZXhlY3V0ZSB0b28gZWFybHkgYW5kIGhlbmNlIG5vdCBkZWxpdmVyLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgICAgIGpRdWVyeSgnI3cydWktcG9wdXAgI2Zvcm0nKS53MnJlbmRlcignY2hvb3NlQ2xhc3NGb3JtJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbn0iXX0=