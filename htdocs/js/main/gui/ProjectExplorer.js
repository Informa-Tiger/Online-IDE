import { Module } from "../../compiler/parser/Module.js";
import { InterpreterState } from "../../interpreter/Interpreter.js";
import { downloadFile } from "../../tools/HtmlTools.js";
import { Workspace } from "../../workspace/Workspace.js";
import { AccordionPanel, Accordion } from "./Accordion.js";
import { Helper } from "./Helper.js";
import { dateToString } from "../../tools/StringTools.js";
import { DistributeToStudentsDialog } from "./DistributeToStudentsDialog.js";
import { WorkspaceSettingsDialog } from "./WorkspaceSettingsDialog.js";
export class ProjectExplorer {
    constructor(main, $projectexplorerDiv) {
        this.main = main;
        this.$projectexplorerDiv = $projectexplorerDiv;
        this.programPointerModule = null;
        this.programPointerDecoration = [];
        this.lastOpenModule = null;
    }
    initGUI() {
        this.accordion = new Accordion(this.main, this.$projectexplorerDiv);
        this.initFilelistPanel();
        this.initWorkspacelistPanel();
    }
    initFilelistPanel() {
        let that = this;
        this.fileListPanel = new AccordionPanel(this.accordion, "Kein Workspace gewählt", "3", "img_add-file-dark", "Neue Datei...", "java", true, false, "file", true, []);
        this.fileListPanel.newElementCallback =
            (accordionElement, successfulNetworkCommunicationCallback) => {
                if (that.main.currentWorkspace == null) {
                    alert('Bitte wählen Sie zuerst einen Workspace aus.');
                    return null;
                }
                let f = {
                    name: accordionElement.name,
                    dirty: false,
                    saved: true,
                    text: "",
                    text_before_revision: null,
                    submitted_date: null,
                    student_edited_after_revision: false,
                    version: 1,
                    panelElement: accordionElement,
                    identical_to_repository_version: false
                };
                let m = new Module(f, that.main);
                let modulStore = that.main.currentWorkspace.moduleStore;
                modulStore.putModule(m);
                that.setModuleActive(m);
                that.main.networkManager.sendCreateFile(m, that.main.currentWorkspace, that.main.workspacesOwnerId, (error) => {
                    if (error == null) {
                        successfulNetworkCommunicationCallback(m);
                    }
                    else {
                        alert('Der Server ist nicht erreichbar!');
                    }
                });
            };
        this.fileListPanel.renameCallback =
            (module, newName) => {
                newName = newName.substr(0, 80);
                let file = module.file;
                file.name = newName;
                file.saved = false;
                that.main.networkManager.sendUpdates();
                return newName;
            };
        this.fileListPanel.deleteCallback =
            (module, callbackIfSuccessful) => {
                that.main.networkManager.sendDeleteWorkspaceOrFile("file", module.file.id, (error) => {
                    if (error == null) {
                        that.main.currentWorkspace.moduleStore.removeModule(module);
                        callbackIfSuccessful();
                    }
                    else {
                        alert('Der Server ist nicht erreichbar!');
                    }
                });
            };
        this.fileListPanel.contextMenuProvider = (accordionElement) => {
            let cmiList = [];
            cmiList.push({
                caption: "Duplizieren",
                callback: (element) => {
                    let module = element.externalElement;
                    let f = {
                        name: module.file.name + " - Kopie",
                        dirty: true,
                        saved: false,
                        text: module.file.text,
                        text_before_revision: null,
                        submitted_date: null,
                        student_edited_after_revision: false,
                        version: module.file.version,
                        panelElement: null,
                        identical_to_repository_version: false
                    };
                    let m = new Module(f, that.main);
                    let workspace = that.main.currentWorkspace;
                    let modulStore = workspace.moduleStore;
                    modulStore.putModule(m);
                    that.main.networkManager.sendCreateFile(m, workspace, that.main.workspacesOwnerId, (error) => {
                        if (error == null) {
                            let element = {
                                isFolder: false,
                                name: f.name,
                                path: [],
                                externalElement: m
                            };
                            f.panelElement = element;
                            that.fileListPanel.addElement(element, true);
                            that.fileListPanel.sortElements();
                            that.setModuleActive(m);
                            that.fileListPanel.renameElement(element);
                        }
                        else {
                            alert('Der Server ist nicht erreichbar!');
                        }
                    });
                }
            });
            if (!(that.main.user.is_teacher || that.main.user.is_admin || that.main.user.is_schooladmin)) {
                let module = accordionElement.externalElement;
                let file = module.file;
                if (file.submitted_date == null) {
                    cmiList.push({
                        caption: "Als Hausaufgabe markieren",
                        callback: (element) => {
                            let file = element.externalElement.file;
                            file.submitted_date = dateToString(new Date());
                            file.saved = false;
                            that.main.networkManager.sendUpdates(null, true);
                            that.renderHomeworkButton(file);
                        }
                    });
                }
                else {
                    cmiList.push({
                        caption: "Hausaufgabenmarkierung entfernen",
                        callback: (element) => {
                            let file = element.externalElement.file;
                            file.submitted_date = null;
                            file.saved = false;
                            that.main.networkManager.sendUpdates(null, true);
                            that.renderHomeworkButton(file);
                        }
                    });
                }
            }
            return cmiList;
        };
        this.fileListPanel.selectCallback =
            (module) => {
                that.setModuleActive(module);
            };
        this.$synchronizeAction = jQuery('<div class="img_open-change jo_button jo_active" style="margin-right: 4px"' +
            ' title="Workspace mit Repository synchronisieren">');
        this.$synchronizeAction.on('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.main.getCurrentWorkspace().synchronizeWithRepository();
        });
        this.fileListPanel.addAction(this.$synchronizeAction);
        this.$synchronizeAction.hide();
    }
    renderHomeworkButton(file) {
        var _a, _b;
        let $buttonDiv = (_b = (_a = file === null || file === void 0 ? void 0 : file.panelElement) === null || _a === void 0 ? void 0 : _a.$htmlFirstLine) === null || _b === void 0 ? void 0 : _b.find('.jo_additionalButtonHomework');
        if ($buttonDiv == null)
            return;
        $buttonDiv.find('.jo_homeworkButton').remove();
        let klass = null;
        let title = "";
        if (file.submitted_date != null) {
            klass = "img_homework";
            title = "Wurde als Hausaufgabe abgegeben: " + file.submitted_date;
            if (file.text_before_revision) {
                klass = "img_homework-corrected";
                title = "Korrektur liegt vor.";
            }
        }
        if (klass != null) {
            let $homeworkButtonDiv = jQuery(`<div class="jo_homeworkButton ${klass}" title="${title}"></div>`);
            $buttonDiv.prepend($homeworkButtonDiv);
            if (klass.indexOf("jo_active") >= 0) {
                $homeworkButtonDiv.on('mousedown', (e) => e.stopPropagation());
                $homeworkButtonDiv.on('click', (e) => {
                    e.stopPropagation();
                    // TODO
                });
            }
        }
    }
    initWorkspacelistPanel() {
        let that = this;
        this.workspaceListPanel = new AccordionPanel(this.accordion, "WORKSPACES", "3", "img_add-workspace-dark", "Neuer Workspace...", "workspace", true, true, "workspace", false, ["file"]);
        this.workspaceListPanel.newElementCallback =
            (accordionElement, successfulNetworkCommunicationCallback) => {
                let owner_id = that.main.user.id;
                if (that.main.workspacesOwnerId != null) {
                    owner_id = that.main.workspacesOwnerId;
                }
                let w = new Workspace(accordionElement.name, that.main, owner_id);
                w.isFolder = false;
                w.path = accordionElement.path.join("/");
                that.main.workspaceList.push(w);
                that.main.networkManager.sendCreateWorkspace(w, that.main.workspacesOwnerId, (error) => {
                    if (error == null) {
                        that.fileListPanel.enableNewButton(true);
                        successfulNetworkCommunicationCallback(w);
                        that.setWorkspaceActive(w);
                        w.renderSynchronizeButton(accordionElement);
                    }
                    else {
                        alert('Der Server ist nicht erreichbar!');
                    }
                });
            };
        this.workspaceListPanel.renameCallback =
            (workspace, newName) => {
                newName = newName.substr(0, 80);
                workspace.name = newName;
                workspace.saved = false;
                that.main.networkManager.sendUpdates();
                return newName;
            };
        this.workspaceListPanel.deleteCallback =
            (workspace, successfulNetworkCommunicationCallback) => {
                that.main.networkManager.sendDeleteWorkspaceOrFile("workspace", workspace.id, (error) => {
                    if (error == null) {
                        that.main.removeWorkspace(workspace);
                        that.fileListPanel.clear();
                        that.fileListPanel.setCaption('Bitte Workspace selektieren');
                        this.$synchronizeAction.hide();
                        that.fileListPanel.enableNewButton(false);
                        successfulNetworkCommunicationCallback();
                    }
                    else {
                        alert('Der Server ist nicht erreichbar!');
                    }
                });
            };
        this.workspaceListPanel.selectCallback =
            (workspace) => {
                if (workspace != null && !workspace.isFolder) {
                    that.main.networkManager.sendUpdates(() => {
                        that.setWorkspaceActive(workspace);
                    });
                }
            };
        this.workspaceListPanel.newFolderCallback = (newElement, successCallback) => {
            let owner_id = that.main.user.id;
            if (that.main.workspacesOwnerId != null) {
                owner_id = that.main.workspacesOwnerId;
            }
            let folder = new Workspace(newElement.name, that.main, owner_id);
            folder.isFolder = true;
            folder.path = newElement.path.join("/");
            folder.panelElement = newElement;
            newElement.externalElement = folder;
            that.main.workspaceList.push(folder);
            that.main.networkManager.sendCreateWorkspace(folder, that.main.workspacesOwnerId, (error) => {
                if (error == null) {
                    successCallback(folder);
                }
                else {
                    alert("Fehler: " + error);
                    that.workspaceListPanel.removeElement(newElement);
                }
            });
        };
        this.workspaceListPanel.moveCallback = (ae) => {
            if (!Array.isArray(ae))
                ae = [ae];
            for (let a of ae) {
                let ws = a.externalElement;
                ws.path = a.path.join("/");
                ws.saved = false;
            }
            this.main.networkManager.sendUpdates();
        };
        this.workspaceListPanel.dropElementCallback = (dest, droppedElement, dropEffekt) => {
            let workspace = dest.externalElement;
            let module = droppedElement.externalElement;
            if (workspace.moduleStore.getModules(false).indexOf(module) >= 0)
                return; // module is already in destination workspace
            let f = {
                name: module.file.name,
                dirty: true,
                saved: false,
                text: module.file.text,
                text_before_revision: null,
                submitted_date: null,
                student_edited_after_revision: false,
                version: module.file.version,
                panelElement: null,
                identical_to_repository_version: false
            };
            if (dropEffekt == "move") {
                // move file
                let oldWorkspace = that.main.currentWorkspace;
                oldWorkspace.moduleStore.removeModule(module);
                that.fileListPanel.removeElement(module);
                that.main.networkManager.sendDeleteWorkspaceOrFile("file", module.file.id, () => { });
            }
            let m = new Module(f, that.main);
            let modulStore = workspace.moduleStore;
            modulStore.putModule(m);
            that.main.networkManager.sendCreateFile(m, workspace, that.main.workspacesOwnerId, (error) => {
                if (error == null) {
                }
                else {
                    alert('Der Server ist nicht erreichbar!');
                }
            });
        };
        this.$homeAction = jQuery('<div class="img_home-dark jo_button jo_active" style="margin-right: 4px"' +
            ' title="Meine eigenen Workspaces anzeigen">');
        this.$homeAction.on('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            that.main.networkManager.sendUpdates(() => {
                that.onHomeButtonClicked();
            });
            that.main.bottomDiv.hideHomeworkTab();
        });
        this.workspaceListPanel.addAction(this.$homeAction);
        this.$homeAction.hide();
        this.workspaceListPanel.contextMenuProvider = (workspaceAccordionElement) => {
            let cmiList = [];
            cmiList.push({
                caption: "Duplizieren",
                callback: (element) => {
                    this.main.networkManager.sendDuplicateWorkspace(element.externalElement, (error, workspaceData) => {
                        if (error == null && workspaceData != null) {
                            let newWorkspace = Workspace.restoreFromData(workspaceData, this.main);
                            this.main.workspaceList.push(newWorkspace);
                            let path = workspaceData.path.split("/");
                            if (path.length == 1 && path[0] == "")
                                path = [];
                            newWorkspace.panelElement = {
                                name: newWorkspace.name,
                                externalElement: newWorkspace,
                                iconClass: newWorkspace.repository_id == null ? 'workspace' : 'repository',
                                isFolder: false,
                                path: path
                            };
                            this.workspaceListPanel.addElement(newWorkspace.panelElement, true);
                            this.workspaceListPanel.sortElements();
                        }
                        if (error != null) {
                            alert(error);
                        }
                    });
                }
            }, {
                caption: "Exportieren",
                callback: (element) => {
                    let ws = element.externalElement;
                    let name = ws.name.replace(/\//g, "_");
                    downloadFile(ws.toExportedWorkspace(), name + ".json");
                }
            });
            if (this.main.user.is_teacher && this.main.teacherExplorer.classPanel.elements.length > 0) {
                cmiList.push({
                    caption: "An Klasse austeilen...",
                    callback: (element) => { },
                    subMenu: this.main.teacherExplorer.classPanel.elements.map((ae) => {
                        return {
                            caption: ae.name,
                            callback: (element) => {
                                let klasse = ae.externalElement;
                                let workspace = element.externalElement;
                                this.main.networkManager.sendDistributeWorkspace(workspace, klasse, null, (error) => {
                                    if (error == null) {
                                        let networkManager = this.main.networkManager;
                                        let dt = networkManager.updateFrequencyInSeconds * networkManager.forcedUpdateEvery;
                                        alert("Der Workspace " + workspace.name + " wurde an die Klasse " + klasse.name + " ausgeteilt. Er wird in maximal " +
                                            dt + " s bei jedem Schüler ankommen.");
                                    }
                                    else {
                                        alert(error);
                                    }
                                });
                            }
                        };
                    })
                }, {
                    caption: "An einzelne Schüler/innen austeilen...",
                    callback: (element) => {
                        let classes = this.main.teacherExplorer.classPanel.elements.map(ae => ae.externalElement);
                        let workspace = element.externalElement;
                        new DistributeToStudentsDialog(classes, workspace, this.main);
                    }
                });
            }
            if (this.main.repositoryOn && this.main.workspacesOwnerId == this.main.user.id) {
                if (workspaceAccordionElement.externalElement.repository_id == null) {
                    cmiList.push({
                        caption: "Repository anlegen...",
                        callback: (element) => {
                            let workspace = element.externalElement;
                            that.main.repositoryCreateManager.show(workspace);
                        },
                        subMenu: null,
                        // [{ n: 0, text: "nur privat sichtbar" }, { n: 1, text: "sichtbar für die Klasse" },
                        // { n: 2, text: "sichtbar für die Schule" }].map((k) => {
                        //     return {
                        //         caption: k.text,
                        //         callback: (element: AccordionElement) => {
                        // this.main.networkManager.sendCreateRepository(workspace, k.n, (error: string, repository_id?: number) => {
                        //     if (error == null) {
                        //         this.workspaceListPanel.setElementClass(element, "repository");
                        //         workspace.renderSynchronizeButton();
                        //         this.showRepositoryButtonIfNeeded(workspace);
                        //     } else {
                        //         alert(error);
                        //     }
                        // });
                        //         }
                        //     }
                        // })
                    });
                }
                else {
                    cmiList.push({
                        caption: "Mit Repository synchronisieren",
                        callback: (element) => {
                            let workspace = element.externalElement;
                            workspace.synchronizeWithRepository();
                        }
                    });
                    cmiList.push({
                        caption: "Vom Repository loslösen",
                        color: "#ff8080",
                        callback: (element) => {
                            let workspace = element.externalElement;
                            workspace.repository_id = null;
                            workspace.saved = false;
                            this.main.networkManager.sendUpdates(() => {
                                that.workspaceListPanel.setElementClass(element, "workspace");
                                workspace.renderSynchronizeButton(element);
                            }, true);
                        }
                    });
                }
            }
            cmiList.push({
                caption: "Einstellungen...",
                callback: (element) => {
                    let workspace = element.externalElement;
                    new WorkspaceSettingsDialog(workspace, this.main).open();
                }
            });
            return cmiList;
        };
    }
    onHomeButtonClicked() {
        this.main.teacherExplorer.restoreOwnWorkspaces();
        this.main.networkManager.updateFrequencyInSeconds = this.main.networkManager.ownUpdateFrequencyInSeconds;
        this.$homeAction.hide();
        this.fileListPanel.enableNewButton(this.main.workspaceList.length > 0);
    }
    renderFiles(workspace) {
        let name = workspace == null ? "Kein Workspace vorhanden" : workspace.name;
        this.fileListPanel.setCaption(name);
        this.fileListPanel.clear();
        if (this.main.getCurrentWorkspace() != null) {
            for (let module of this.main.getCurrentWorkspace().moduleStore.getModules(false)) {
                module.file.panelElement = null;
            }
        }
        if (workspace != null) {
            let moduleList = [];
            for (let m of workspace.moduleStore.getModules(false)) {
                moduleList.push(m);
            }
            moduleList.sort((a, b) => { return a.file.name > b.file.name ? 1 : a.file.name < b.file.name ? -1 : 0; });
            for (let m of moduleList) {
                m.file.panelElement = {
                    name: m.file.name,
                    externalElement: m,
                    isFolder: false,
                    path: []
                };
                this.fileListPanel.addElement(m.file.panelElement, true);
                this.renderHomeworkButton(m.file);
            }
            this.fileListPanel.sortElements();
        }
    }
    renderWorkspaces(workspaceList) {
        this.fileListPanel.clear();
        this.workspaceListPanel.clear();
        for (let w of workspaceList) {
            let path = w.path.split("/");
            if (path.length == 1 && path[0] == "")
                path = [];
            w.panelElement = {
                name: w.name,
                externalElement: w,
                iconClass: w.repository_id == null ? 'workspace' : 'repository',
                isFolder: w.isFolder,
                path: path
            };
            this.workspaceListPanel.addElement(w.panelElement, false);
            w.renderSynchronizeButton(w.panelElement);
        }
        this.workspaceListPanel.sortElements();
        this.fileListPanel.enableNewButton(workspaceList.length > 0);
        // setTimeout(() => {
        //     this.workspaceListPanel.collapseAll();
        // }, 500);
    }
    renderErrorCount(workspace, errorCountMap) {
        if (errorCountMap == null)
            return;
        for (let m of workspace.moduleStore.getModules(false)) {
            let errorCount = errorCountMap.get(m);
            let errorCountS = ((errorCount == null || errorCount == 0) ? "" : "(" + errorCount + ")");
            this.fileListPanel.setTextAfterFilename(m.file.panelElement, errorCountS, 'jo_errorcount');
        }
    }
    showRepositoryButtonIfNeeded(w) {
        if (w.repository_id != null && w.owner_id == this.main.user.id) {
            this.$synchronizeAction.show();
            if (!this.main.user.settings.helperHistory.repositoryButtonDone) {
                Helper.showHelper("repositoryButton", this.main, this.$synchronizeAction);
            }
        }
        else {
            this.$synchronizeAction.hide();
        }
    }
    setWorkspaceActive(w, scrollIntoView = false) {
        this.workspaceListPanel.select(w, false, scrollIntoView);
        if (this.main.interpreter.state == InterpreterState.running) {
            this.main.interpreter.stop();
        }
        this.main.currentWorkspace = w;
        this.renderFiles(w);
        if (w != null) {
            let nonSystemModules = w.moduleStore.getModules(false);
            if (w.currentlyOpenModule != null) {
                this.setModuleActive(w.currentlyOpenModule);
            }
            else if (nonSystemModules.length > 0) {
                this.setModuleActive(nonSystemModules[0]);
            }
            else {
                this.setModuleActive(null);
            }
            for (let m of nonSystemModules) {
                m.file.dirty = true;
            }
            if (nonSystemModules.length == 0 && !this.main.user.settings.helperHistory.newFileHelperDone) {
                Helper.showHelper("newFileHelper", this.main, this.fileListPanel.$captionElement);
            }
            this.showRepositoryButtonIfNeeded(w);
        }
        else {
            this.setModuleActive(null);
        }
    }
    writeEditorTextToFile() {
        let cem = this.getCurrentlyEditedModule();
        if (cem != null)
            cem.file.text = cem.getProgramTextFromMonacoModel(); // 29.03. this.main.monaco.getValue();
    }
    setModuleActive(m) {
        this.main.bottomDiv.homeworkManager.hideRevision();
        if (this.lastOpenModule != null) {
            this.lastOpenModule.getBreakpointPositionsFromEditor();
            this.lastOpenModule.file.text = this.lastOpenModule.getProgramTextFromMonacoModel(); // this.main.monaco.getValue();
            this.lastOpenModule.editorState = this.main.getMonacoEditor().saveViewState();
        }
        if (m == null) {
            this.main.getMonacoEditor().setModel(monaco.editor.createModel("Keine Datei vorhanden.", "text"));
            this.main.getMonacoEditor().updateOptions({ readOnly: true });
            this.fileListPanel.setCaption('Keine Datei vorhanden');
        }
        else {
            this.main.getMonacoEditor().updateOptions({ readOnly: false });
            this.main.getMonacoEditor().setModel(m.model);
            if (this.main.getBottomDiv() != null)
                this.main.getBottomDiv().errorManager.showParenthesisWarning(m.bracketError);
            if (m.file.text_before_revision != null) {
                this.main.bottomDiv.homeworkManager.showHomeWorkRevisionButton();
            }
            else {
                this.main.bottomDiv.homeworkManager.hideHomeworkRevisionButton();
            }
        }
    }
    setActiveAfterExternalModelSet(m) {
        this.fileListPanel.select(m, false);
        this.lastOpenModule = m;
        if (m.editorState != null) {
            this.main.editor.dontPushNextCursorMove++;
            this.main.getMonacoEditor().restoreViewState(m.editorState);
            this.main.editor.dontPushNextCursorMove--;
        }
        m.renderBreakpointDecorators();
        this.setCurrentlyEditedModule(m);
        this.showProgramPointer();
        setTimeout(() => {
            if (!this.main.getMonacoEditor().getOptions().get(monaco.editor.EditorOption.readOnly)) {
                this.main.getMonacoEditor().focus();
            }
        }, 300);
    }
    showProgramPointer() {
        if (this.programPointerModule == this.getCurrentlyEditedModule() && this.getCurrentlyEditedModule() != null) {
            let position = this.programPointerPosition;
            let range = {
                startColumn: position.column, startLineNumber: position.line,
                endColumn: position.column + position.length, endLineNumber: position.line
            };
            this.main.getMonacoEditor().revealRangeInCenterIfOutsideViewport(range);
            this.programPointerDecoration = this.main.getMonacoEditor().deltaDecorations(this.programPointerDecoration, [
                {
                    range: range,
                    options: {
                        className: 'jo_revealProgramPointer', isWholeLine: true,
                        overviewRuler: {
                            color: "#6fd61b",
                            position: monaco.editor.OverviewRulerLane.Center
                        },
                        minimap: {
                            color: "#6fd61b",
                            position: monaco.editor.MinimapPosition.Inline
                        }
                    }
                },
                {
                    range: range,
                    options: { beforeContentClassName: 'jo_revealProgramPointerBefore' }
                }
            ]);
        }
    }
    showProgramPointerPosition(file, position) {
        // console statement execution:
        if (file == null) {
            return;
        }
        let module = this.main.currentWorkspace.moduleStore.findModuleByFile(file);
        if (module == null) {
            return;
        }
        this.programPointerModule = module;
        this.programPointerPosition = position;
        if (module != this.getCurrentlyEditedModule()) {
            this.setModuleActive(module);
        }
        else {
            this.showProgramPointer();
        }
    }
    hideProgramPointerPosition() {
        if (this.getCurrentlyEditedModule() == this.programPointerModule) {
            this.main.getMonacoEditor().deltaDecorations(this.programPointerDecoration, []);
        }
        this.programPointerModule = null;
        this.programPointerDecoration = [];
    }
    getCurrentlyEditedModule() {
        let ws = this.main.currentWorkspace;
        if (ws == null)
            return null;
        return ws.currentlyOpenModule;
    }
    setCurrentlyEditedModule(m) {
        if (m == null)
            return;
        let ws = this.main.currentWorkspace;
        if (ws.currentlyOpenModule != m) {
            ws.currentlyOpenModule = m;
            ws.saved = false;
            m.file.dirty = true;
        }
    }
    setExplorerColor(color) {
        let caption;
        if (color == null) {
            color = "transparent";
            caption = "Meine WORKSPACES";
        }
        else {
            caption = "Schüler-WS";
        }
        this.fileListPanel.$listElement.parent().css('background-color', color);
        this.workspaceListPanel.$listElement.parent().css('background-color', color);
        this.workspaceListPanel.setCaption(caption);
    }
    getNewModule(file) {
        return new Module(file, this.main);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdEV4cGxvcmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9Qcm9qZWN0RXhwbG9yZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFRLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxZQUFZLEVBQWlDLE1BQU0sMEJBQTBCLENBQUM7QUFDdkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXpELE9BQU8sRUFBRSxjQUFjLEVBQUUsU0FBUyxFQUE4QyxNQUFNLGdCQUFnQixDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFHckMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzFELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBR3ZFLE1BQU0sT0FBTyxlQUFlO0lBYXhCLFlBQW9CLElBQVUsRUFBVSxtQkFBd0M7UUFBNUQsU0FBSSxHQUFKLElBQUksQ0FBTTtRQUFVLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFYaEYseUJBQW9CLEdBQVcsSUFBSSxDQUFDO1FBRXBDLDZCQUF3QixHQUFhLEVBQUUsQ0FBQztRQThyQnhDLG1CQUFjLEdBQVcsSUFBSSxDQUFDO0lBbnJCOUIsQ0FBQztJQUVELE9BQU87UUFFSCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFcEUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFekIsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7SUFFbEMsQ0FBQztJQUVELGlCQUFpQjtRQUViLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztRQUVoQixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLEVBQUUsR0FBRyxFQUNqRixtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqRixJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQjtZQUVqQyxDQUFDLGdCQUFnQixFQUFFLHNDQUFzQyxFQUFFLEVBQUU7Z0JBRXpELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxJQUFJLEVBQUU7b0JBQ3BDLEtBQUssQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO29CQUN0RCxPQUFPLElBQUksQ0FBQztpQkFDZjtnQkFFRCxJQUFJLENBQUMsR0FBUztvQkFDVixJQUFJLEVBQUUsZ0JBQWdCLENBQUMsSUFBSTtvQkFDM0IsS0FBSyxFQUFFLEtBQUs7b0JBQ1osS0FBSyxFQUFFLElBQUk7b0JBQ1gsSUFBSSxFQUFFLEVBQUU7b0JBQ1Isb0JBQW9CLEVBQUUsSUFBSTtvQkFDMUIsY0FBYyxFQUFFLElBQUk7b0JBQ3BCLDZCQUE2QixFQUFFLEtBQUs7b0JBQ3BDLE9BQU8sRUFBRSxDQUFDO29CQUNWLFlBQVksRUFBRSxnQkFBZ0I7b0JBQzlCLCtCQUErQixFQUFFLEtBQUs7aUJBQ3pDLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDakMsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUM7Z0JBQ3hELFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUM5RixDQUFDLEtBQWEsRUFBRSxFQUFFO29CQUNkLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTt3QkFDZixzQ0FBc0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDN0M7eUJBQU07d0JBQ0gsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7cUJBRTdDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBRVgsQ0FBQyxDQUFDO1FBRU4sSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjO1lBQzdCLENBQUMsTUFBYyxFQUFFLE9BQWUsRUFBRSxFQUFFO2dCQUNoQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2hDLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBRXZCLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO2dCQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztnQkFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3ZDLE9BQU8sT0FBTyxDQUFDO1lBQ25CLENBQUMsQ0FBQTtRQUVMLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYztZQUM3QixDQUFDLE1BQWMsRUFBRSxvQkFBZ0MsRUFBRSxFQUFFO2dCQUNqRCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFhLEVBQUUsRUFBRTtvQkFDekYsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO3dCQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDNUQsb0JBQW9CLEVBQUUsQ0FBQztxQkFDMUI7eUJBQU07d0JBQ0gsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7cUJBRTdDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQyxDQUFBO1FBSUwsSUFBSSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLGdCQUFrQyxFQUFFLEVBQUU7WUFFNUUsSUFBSSxPQUFPLEdBQStCLEVBQUUsQ0FBQztZQUU3QyxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNULE9BQU8sRUFBRSxhQUFhO2dCQUN0QixRQUFRLEVBQUUsQ0FBQyxPQUF5QixFQUFFLEVBQUU7b0JBRXBDLElBQUksTUFBTSxHQUFXLE9BQU8sQ0FBQyxlQUFlLENBQUM7b0JBRTdDLElBQUksQ0FBQyxHQUFTO3dCQUNWLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxVQUFVO3dCQUNuQyxLQUFLLEVBQUUsSUFBSTt3QkFDWCxLQUFLLEVBQUUsS0FBSzt3QkFDWixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJO3dCQUN0QixvQkFBb0IsRUFBRSxJQUFJO3dCQUMxQixjQUFjLEVBQUUsSUFBSTt3QkFDcEIsNkJBQTZCLEVBQUUsS0FBSzt3QkFDcEMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTzt3QkFDNUIsWUFBWSxFQUFFLElBQUk7d0JBQ2xCLCtCQUErQixFQUFFLEtBQUs7cUJBQ3pDLENBQUM7b0JBRUYsSUFBSSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDakMsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDM0MsSUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQztvQkFDdkMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFDN0UsQ0FBQyxLQUFhLEVBQUUsRUFBRTt3QkFDZCxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7NEJBQ2YsSUFBSSxPQUFPLEdBQXFCO2dDQUM1QixRQUFRLEVBQUUsS0FBSztnQ0FDZixJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7Z0NBQ1osSUFBSSxFQUFFLEVBQUU7Z0NBQ1IsZUFBZSxFQUFFLENBQUM7NkJBQ3JCLENBQUE7NEJBQ0QsQ0FBQyxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUM7NEJBQ3pCLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQzs0QkFDN0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsQ0FBQzs0QkFDbEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDeEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7eUJBQzdDOzZCQUFNOzRCQUNILEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO3lCQUU3QztvQkFDTCxDQUFDLENBQUMsQ0FBQztnQkFHWCxDQUFDO2FBQ0osQ0FBQyxDQUFDO1lBR0gsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRTtnQkFDMUYsSUFBSSxNQUFNLEdBQW1CLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztnQkFDOUQsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFFdkIsSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksRUFBRTtvQkFDN0IsT0FBTyxDQUFDLElBQUksQ0FBQzt3QkFDVCxPQUFPLEVBQUUsMkJBQTJCO3dCQUNwQyxRQUFRLEVBQUUsQ0FBQyxPQUF5QixFQUFFLEVBQUU7NEJBRXBDLElBQUksSUFBSSxHQUFZLE9BQU8sQ0FBQyxlQUFnQixDQUFDLElBQUksQ0FBQzs0QkFDbEQsSUFBSSxDQUFDLGNBQWMsR0FBRyxZQUFZLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDOzRCQUMvQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQzs0QkFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzs0QkFDakQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNwQyxDQUFDO3FCQUNKLENBQUMsQ0FBQztpQkFDTjtxQkFBTTtvQkFDSCxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNULE9BQU8sRUFBRSxrQ0FBa0M7d0JBQzNDLFFBQVEsRUFBRSxDQUFDLE9BQXlCLEVBQUUsRUFBRTs0QkFFcEMsSUFBSSxJQUFJLEdBQVksT0FBTyxDQUFDLGVBQWdCLENBQUMsSUFBSSxDQUFDOzRCQUNsRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQzs0QkFDM0IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7NEJBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7NEJBQ2pELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFFcEMsQ0FBQztxQkFDSixDQUFDLENBQUM7aUJBQ047YUFFSjtZQUVELE9BQU8sT0FBTyxDQUFDO1FBQ25CLENBQUMsQ0FBQTtRQUlELElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYztZQUM3QixDQUFDLE1BQWMsRUFBRSxFQUFFO2dCQUNmLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakMsQ0FBQyxDQUFBO1FBR0wsSUFBSSxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyw0RUFBNEU7WUFDekcsb0RBQW9ELENBQUMsQ0FBQztRQUkxRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzVDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNwQixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7WUFFbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFFaEUsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFbkMsQ0FBQztJQUVELG9CQUFvQixDQUFDLElBQVU7O1FBQzNCLElBQUksVUFBVSxHQUFHLE1BQUEsTUFBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsWUFBWSwwQ0FBRSxjQUFjLDBDQUFFLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQzFGLElBQUksVUFBVSxJQUFJLElBQUk7WUFBRSxPQUFPO1FBRS9CLFVBQVUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUUvQyxJQUFJLEtBQUssR0FBVyxJQUFJLENBQUM7UUFDekIsSUFBSSxLQUFLLEdBQVcsRUFBRSxDQUFDO1FBQ3ZCLElBQUksSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLEVBQUU7WUFDN0IsS0FBSyxHQUFHLGNBQWMsQ0FBQztZQUN2QixLQUFLLEdBQUcsbUNBQW1DLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtZQUNqRSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtnQkFDM0IsS0FBSyxHQUFHLHdCQUF3QixDQUFDO2dCQUNqQyxLQUFLLEdBQUcsc0JBQXNCLENBQUE7YUFDakM7U0FDSjtRQUVELElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtZQUNmLElBQUksa0JBQWtCLEdBQUcsTUFBTSxDQUFDLGlDQUFpQyxLQUFLLFlBQVksS0FBSyxVQUFVLENBQUMsQ0FBQztZQUNuRyxVQUFVLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDdkMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDakMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7Z0JBQy9ELGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDakMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO29CQUNwQixPQUFPO2dCQUNYLENBQUMsQ0FBQyxDQUFDO2FBQ047U0FFSjtJQUNMLENBQUM7SUFJRCxzQkFBc0I7UUFFbEIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWhCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQzFFLHdCQUF3QixFQUFFLG9CQUFvQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRTNHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0I7WUFFdEMsQ0FBQyxnQkFBZ0IsRUFBRSxzQ0FBc0MsRUFBRSxFQUFFO2dCQUV6RCxJQUFJLFFBQVEsR0FBVyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxJQUFJLEVBQUU7b0JBQ3JDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO2lCQUMxQztnQkFFRCxJQUFJLENBQUMsR0FBYyxJQUFJLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDN0UsQ0FBQyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7Z0JBQ25CLENBQUMsQ0FBQyxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDekMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVoQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEtBQWEsRUFBRSxFQUFFO29CQUMzRixJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7d0JBQ2YsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3pDLHNDQUFzQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUMxQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzNCLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO3FCQUMvQzt5QkFBTTt3QkFDSCxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztxQkFFN0M7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUM7UUFFTixJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYztZQUNsQyxDQUFDLFNBQW9CLEVBQUUsT0FBZSxFQUFFLEVBQUU7Z0JBQ3RDLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDaEMsU0FBUyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7Z0JBQ3pCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO2dCQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxPQUFPLENBQUM7WUFDbkIsQ0FBQyxDQUFBO1FBRUwsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWM7WUFDbEMsQ0FBQyxTQUFvQixFQUFFLHNDQUFrRCxFQUFFLEVBQUU7Z0JBQ3pFLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBYSxFQUFFLEVBQUU7b0JBQzVGLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTt3QkFDZixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFDckMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDM0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsNkJBQTZCLENBQUMsQ0FBQzt3QkFDN0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDO3dCQUMvQixJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDMUMsc0NBQXNDLEVBQUUsQ0FBQztxQkFDNUM7eUJBQU07d0JBQ0gsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7cUJBRTdDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQyxDQUFBO1FBRUwsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWM7WUFDbEMsQ0FBQyxTQUFvQixFQUFFLEVBQUU7Z0JBQ3JCLElBQUksU0FBUyxJQUFJLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7b0JBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7d0JBQ3RDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDdkMsQ0FBQyxDQUFDLENBQUM7aUJBQ047WUFFTCxDQUFDLENBQUE7UUFFTCxJQUFJLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxVQUE0QixFQUFFLGVBQWUsRUFBRSxFQUFFO1lBQzFGLElBQUksUUFBUSxHQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN6QyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLElBQUksSUFBSSxFQUFFO2dCQUNyQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQzthQUMxQztZQUVELElBQUksTUFBTSxHQUFjLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM1RSxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztZQUV2QixNQUFNLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3hDLE1BQU0sQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDO1lBQ2pDLFVBQVUsQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVyQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEtBQWEsRUFBRSxFQUFFO2dCQUNoRyxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7b0JBQ2YsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUMzQjtxQkFBTTtvQkFDSCxLQUFLLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxDQUFDO29CQUMxQixJQUFJLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2lCQUNyRDtZQUNMLENBQUMsQ0FBQyxDQUFDO1FBRVAsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksR0FBRyxDQUFDLEVBQXlDLEVBQUUsRUFBRTtZQUNqRixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbEMsS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ2QsSUFBSSxFQUFFLEdBQWMsQ0FBQyxDQUFDLGVBQWUsQ0FBQztnQkFDdEMsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0IsRUFBRSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7YUFDcEI7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzQyxDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxJQUFzQixFQUFFLGNBQWdDLEVBQUUsVUFBMkIsRUFBRSxFQUFFO1lBQ3BJLElBQUksU0FBUyxHQUFjLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDaEQsSUFBSSxNQUFNLEdBQVcsY0FBYyxDQUFDLGVBQWUsQ0FBQztZQUVwRCxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUFFLE9BQU8sQ0FBQyw2Q0FBNkM7WUFFdkgsSUFBSSxDQUFDLEdBQVM7Z0JBQ1YsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFDdEIsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFDdEIsb0JBQW9CLEVBQUUsSUFBSTtnQkFDMUIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLDZCQUE2QixFQUFFLEtBQUs7Z0JBQ3BDLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU87Z0JBQzVCLFlBQVksRUFBRSxJQUFJO2dCQUNsQiwrQkFBK0IsRUFBRSxLQUFLO2FBQ3pDLENBQUM7WUFFRixJQUFJLFVBQVUsSUFBSSxNQUFNLEVBQUU7Z0JBQ3RCLFlBQVk7Z0JBQ1osSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDOUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDekY7WUFFRCxJQUFJLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pDLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUM7WUFDdkMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUM3RSxDQUFDLEtBQWEsRUFBRSxFQUFFO2dCQUNkLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtpQkFDbEI7cUJBQU07b0JBQ0gsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7aUJBRTdDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFWCxDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQywwRUFBMEU7WUFDaEcsNkNBQTZDLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNyQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDcEIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBRW5CLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3RDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQy9CLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFMUMsQ0FBQyxDQUFDLENBQUE7UUFHRixJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRXhCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLHlCQUEyQyxFQUFFLEVBQUU7WUFFMUYsSUFBSSxPQUFPLEdBQStCLEVBQUUsQ0FBQztZQUU3QyxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNULE9BQU8sRUFBRSxhQUFhO2dCQUN0QixRQUFRLEVBQUUsQ0FBQyxPQUF5QixFQUFFLEVBQUU7b0JBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQ25FLENBQUMsS0FBYSxFQUFFLGFBQWEsRUFBRSxFQUFFO3dCQUM3QixJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksYUFBYSxJQUFJLElBQUksRUFBRTs0QkFDeEMsSUFBSSxZQUFZLEdBQWMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNsRixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7NEJBQzNDLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUN6QyxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO2dDQUFFLElBQUksR0FBRyxFQUFFLENBQUM7NEJBQ2pELFlBQVksQ0FBQyxZQUFZLEdBQUc7Z0NBQ3hCLElBQUksRUFBRSxZQUFZLENBQUMsSUFBSTtnQ0FDdkIsZUFBZSxFQUFFLFlBQVk7Z0NBQzdCLFNBQVMsRUFBRSxZQUFZLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxZQUFZO2dDQUMxRSxRQUFRLEVBQUUsS0FBSztnQ0FDZixJQUFJLEVBQUUsSUFBSTs2QkFDYixDQUFDOzRCQUVGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQzs0QkFDcEUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksRUFBRSxDQUFDO3lCQUMxQzt3QkFDRCxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7NEJBQ2YsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO3lCQUNoQjtvQkFDTCxDQUFDLENBQUMsQ0FBQTtnQkFDVixDQUFDO2FBQ0osRUFDRDtnQkFDSSxPQUFPLEVBQUUsYUFBYTtnQkFDdEIsUUFBUSxFQUFFLENBQUMsT0FBeUIsRUFBRSxFQUFFO29CQUNwQyxJQUFJLEVBQUUsR0FBeUIsT0FBTyxDQUFDLGVBQWUsQ0FBQztvQkFDdkQsSUFBSSxJQUFJLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUMvQyxZQUFZLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsSUFBSSxHQUFHLE9BQU8sQ0FBQyxDQUFBO2dCQUMxRCxDQUFDO2FBQ0osQ0FDQSxDQUFDO1lBRUYsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUN2RixPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNULE9BQU8sRUFBRSx3QkFBd0I7b0JBQ2pDLFFBQVEsRUFBRSxDQUFDLE9BQXlCLEVBQUUsRUFBRSxHQUFHLENBQUM7b0JBQzVDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO3dCQUM5RCxPQUFPOzRCQUNILE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSTs0QkFDaEIsUUFBUSxFQUFFLENBQUMsT0FBeUIsRUFBRSxFQUFFO2dDQUNwQyxJQUFJLE1BQU0sR0FBUSxFQUFFLENBQUMsZUFBZSxDQUFDO2dDQUVyQyxJQUFJLFNBQVMsR0FBYyxPQUFPLENBQUMsZUFBZSxDQUFDO2dDQUVuRCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLEtBQWEsRUFBRSxFQUFFO29DQUN4RixJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7d0NBQ2YsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUM7d0NBQzlDLElBQUksRUFBRSxHQUFHLGNBQWMsQ0FBQyx3QkFBd0IsR0FBRyxjQUFjLENBQUMsaUJBQWlCLENBQUM7d0NBQ3BGLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsSUFBSSxHQUFHLHVCQUF1QixHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsa0NBQWtDOzRDQUNoSCxFQUFFLEdBQUcsZ0NBQWdDLENBQUMsQ0FBQztxQ0FDOUM7eUNBQU07d0NBQ0gsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO3FDQUNoQjtnQ0FDTCxDQUFDLENBQUMsQ0FBQzs0QkFFUCxDQUFDO3lCQUNKLENBQUE7b0JBQ0wsQ0FBQyxDQUFDO2lCQUNMLEVBQ0c7b0JBQ0ksT0FBTyxFQUFFLHdDQUF3QztvQkFDakQsUUFBUSxFQUFFLENBQUMsT0FBeUIsRUFBRSxFQUFFO3dCQUNwQyxJQUFJLE9BQU8sR0FBZ0IsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7d0JBQ3ZHLElBQUksU0FBUyxHQUFjLE9BQU8sQ0FBQyxlQUFlLENBQUM7d0JBQ25ELElBQUksMEJBQTBCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2xFLENBQUM7aUJBQ0osQ0FDSixDQUFDO2FBQ0w7WUFFRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFO2dCQUM1RSxJQUFJLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxhQUFhLElBQUksSUFBSSxFQUFFO29CQUNqRSxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNULE9BQU8sRUFBRSx1QkFBdUI7d0JBQ2hDLFFBQVEsRUFBRSxDQUFDLE9BQXlCLEVBQUUsRUFBRTs0QkFDcEMsSUFBSSxTQUFTLEdBQWMsT0FBTyxDQUFDLGVBQWUsQ0FBQzs0QkFFbkQsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7d0JBQ3RELENBQUM7d0JBQ0QsT0FBTyxFQUFFLElBQUk7d0JBQ2IscUZBQXFGO3dCQUNyRiwwREFBMEQ7d0JBQzFELGVBQWU7d0JBQ2YsMkJBQTJCO3dCQUMzQixxREFBcUQ7d0JBR3JELDZHQUE2Rzt3QkFDN0csMkJBQTJCO3dCQUMzQiwwRUFBMEU7d0JBQzFFLCtDQUErQzt3QkFDL0Msd0RBQXdEO3dCQUN4RCxlQUFlO3dCQUNmLHdCQUF3Qjt3QkFDeEIsUUFBUTt3QkFDUixNQUFNO3dCQUVOLFlBQVk7d0JBQ1osUUFBUTt3QkFDUixLQUFLO3FCQUNSLENBQUMsQ0FBQztpQkFDTjtxQkFBTTtvQkFDSCxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNULE9BQU8sRUFBRSxnQ0FBZ0M7d0JBQ3pDLFFBQVEsRUFBRSxDQUFDLE9BQXlCLEVBQUUsRUFBRTs0QkFDcEMsSUFBSSxTQUFTLEdBQWMsT0FBTyxDQUFDLGVBQWUsQ0FBQzs0QkFDbkQsU0FBUyxDQUFDLHlCQUF5QixFQUFFLENBQUM7d0JBQzFDLENBQUM7cUJBQ0osQ0FBQyxDQUFDO29CQUNILE9BQU8sQ0FBQyxJQUFJLENBQUM7d0JBQ1QsT0FBTyxFQUFFLHlCQUF5Qjt3QkFDbEMsS0FBSyxFQUFFLFNBQVM7d0JBQ2hCLFFBQVEsRUFBRSxDQUFDLE9BQXlCLEVBQUUsRUFBRTs0QkFDcEMsSUFBSSxTQUFTLEdBQWMsT0FBTyxDQUFDLGVBQWUsQ0FBQzs0QkFDbkQsU0FBUyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7NEJBQy9CLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDOzRCQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO2dDQUN0QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztnQ0FDOUQsU0FBUyxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDOzRCQUMvQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ2IsQ0FBQztxQkFDSixDQUFDLENBQUM7aUJBQ047YUFDSjtZQUVELE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ1QsT0FBTyxFQUFFLGtCQUFrQjtnQkFDM0IsUUFBUSxFQUFFLENBQUMsT0FBeUIsRUFBRSxFQUFFO29CQUNwQyxJQUFJLFNBQVMsR0FBYyxPQUFPLENBQUMsZUFBZSxDQUFDO29CQUNuRCxJQUFJLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzdELENBQUM7YUFDSixDQUFDLENBQUE7WUFFRixPQUFPLE9BQU8sQ0FBQztRQUNuQixDQUFDLENBQUE7SUFFTCxDQUFDO0lBRUQsbUJBQW1CO1FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUNqRCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQztRQUN6RyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRUQsV0FBVyxDQUFDLFNBQW9CO1FBRTVCLElBQUksSUFBSSxHQUFHLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBRTNFLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFM0IsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3pDLEtBQUssSUFBSSxNQUFNLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzlFLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQzthQUNuQztTQUNKO1FBRUQsSUFBSSxTQUFTLElBQUksSUFBSSxFQUFFO1lBQ25CLElBQUksVUFBVSxHQUFhLEVBQUUsQ0FBQztZQUU5QixLQUFLLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNuRCxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3RCO1lBRUQsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV6RyxLQUFLLElBQUksQ0FBQyxJQUFJLFVBQVUsRUFBRTtnQkFFdEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUc7b0JBQ2xCLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUk7b0JBQ2pCLGVBQWUsRUFBRSxDQUFDO29CQUNsQixRQUFRLEVBQUUsS0FBSztvQkFDZixJQUFJLEVBQUUsRUFBRTtpQkFDWCxDQUFDO2dCQUVGLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3JDO1lBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsQ0FBQztTQUVyQztJQUNMLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxhQUEwQjtRQUV2QyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVoQyxLQUFLLElBQUksQ0FBQyxJQUFJLGFBQWEsRUFBRTtZQUN6QixJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO2dCQUFFLElBQUksR0FBRyxFQUFFLENBQUM7WUFDakQsQ0FBQyxDQUFDLFlBQVksR0FBRztnQkFDYixJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7Z0JBQ1osZUFBZSxFQUFFLENBQUM7Z0JBQ2xCLFNBQVMsRUFBRSxDQUFDLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxZQUFZO2dCQUMvRCxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVE7Z0JBQ3BCLElBQUksRUFBRSxJQUFJO2FBQ2IsQ0FBQztZQUVGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUUxRCxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQzdDO1FBRUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDN0QscUJBQXFCO1FBQ3JCLDZDQUE2QztRQUM3QyxXQUFXO0lBRWYsQ0FBQztJQUVELGdCQUFnQixDQUFDLFNBQW9CLEVBQUUsYUFBa0M7UUFDckUsSUFBSSxhQUFhLElBQUksSUFBSTtZQUFFLE9BQU87UUFDbEMsS0FBSyxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNuRCxJQUFJLFVBQVUsR0FBVyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlDLElBQUksV0FBVyxHQUFXLENBQUMsQ0FBQyxVQUFVLElBQUksSUFBSSxJQUFJLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBRWxHLElBQUksQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1NBQzlGO0lBQ0wsQ0FBQztJQUVELDRCQUE0QixDQUFDLENBQVk7UUFDckMsSUFBSSxDQUFDLENBQUMsYUFBYSxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUM1RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLEVBQUU7Z0JBRTdELE1BQU0sQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQzthQUU3RTtTQUlKO2FBQU07WUFDSCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDbEM7SUFDTCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsQ0FBWSxFQUFFLGlCQUEwQixLQUFLO1FBRTVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQztRQUV6RCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUU7WUFDekQsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDaEM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBCLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRTtZQUNYLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFdkQsSUFBSSxDQUFDLENBQUMsbUJBQW1CLElBQUksSUFBSSxFQUFFO2dCQUMvQixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2FBQy9DO2lCQUFNLElBQUksZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzdDO2lCQUFNO2dCQUNILElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDOUI7WUFFRCxLQUFLLElBQUksQ0FBQyxJQUFJLGdCQUFnQixFQUFFO2dCQUM1QixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7YUFDdkI7WUFFRCxJQUFJLGdCQUFnQixDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGlCQUFpQixFQUFFO2dCQUUxRixNQUFNLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUM7YUFFckY7WUFFRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FFeEM7YUFBTTtZQUNILElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDOUI7SUFHTCxDQUFDO0lBRUQscUJBQXFCO1FBQ2pCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBQzFDLElBQUksR0FBRyxJQUFJLElBQUk7WUFDWCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDLHNDQUFzQztJQUNuRyxDQUFDO0lBSUQsZUFBZSxDQUFDLENBQVM7UUFFckIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRW5ELElBQUksSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLEVBQUU7WUFDN0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDO1lBQ3ZELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLDZCQUE2QixFQUFFLENBQUMsQ0FBQywrQkFBK0I7WUFDcEgsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztTQUNqRjtRQUVELElBQUksQ0FBQyxJQUFJLElBQUksRUFBRTtZQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDbEcsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxhQUFhLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM5RCxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1NBQzFEO2FBQU07WUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQy9ELElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM5QyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksSUFBSTtnQkFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFbkgsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixJQUFJLElBQUksRUFBRTtnQkFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLDBCQUEwQixFQUFFLENBQUM7YUFDcEU7aUJBQU07Z0JBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLDBCQUEwQixFQUFFLENBQUM7YUFDcEU7U0FDSjtJQUdMLENBQUM7SUFFRCw4QkFBOEIsQ0FBQyxDQUFTO1FBQ3BDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVwQyxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsQ0FBQyxXQUFXLElBQUksSUFBSSxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztTQUM3QztRQUVELENBQUMsQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1FBRS9CLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVqQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUUxQixVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsVUFBVSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNwRixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ3ZDO1FBQ0wsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRVosQ0FBQztJQUdPLGtCQUFrQjtRQUV0QixJQUFJLElBQUksQ0FBQyxvQkFBb0IsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDekcsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDO1lBQzNDLElBQUksS0FBSyxHQUFHO2dCQUNSLFdBQVcsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLGVBQWUsRUFBRSxRQUFRLENBQUMsSUFBSTtnQkFDNUQsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLElBQUk7YUFDN0UsQ0FBQztZQUVGLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsb0NBQW9DLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEUsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFO2dCQUN4RztvQkFDSSxLQUFLLEVBQUUsS0FBSztvQkFDWixPQUFPLEVBQUU7d0JBQ0wsU0FBUyxFQUFFLHlCQUF5QixFQUFFLFdBQVcsRUFBRSxJQUFJO3dCQUN2RCxhQUFhLEVBQUU7NEJBQ1gsS0FBSyxFQUFFLFNBQVM7NEJBQ2hCLFFBQVEsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLE1BQU07eUJBQ25EO3dCQUNELE9BQU8sRUFBRTs0QkFDTCxLQUFLLEVBQUUsU0FBUzs0QkFDaEIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU07eUJBQ2pEO3FCQUNKO2lCQUNKO2dCQUNEO29CQUNJLEtBQUssRUFBRSxLQUFLO29CQUNaLE9BQU8sRUFBRSxFQUFFLHNCQUFzQixFQUFFLCtCQUErQixFQUFFO2lCQUN2RTthQUNKLENBQUMsQ0FBQztTQUVOO0lBQ0wsQ0FBQztJQUVELDBCQUEwQixDQUFDLElBQVUsRUFBRSxRQUFzQjtRQUV6RCwrQkFBK0I7UUFDL0IsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO1lBQ2QsT0FBTztTQUNWO1FBRUQsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0UsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ2hCLE9BQU87U0FDVjtRQUVELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxNQUFNLENBQUM7UUFDbkMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLFFBQVEsQ0FBQztRQUV2QyxJQUFJLE1BQU0sSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsRUFBRTtZQUMzQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ2hDO2FBQU07WUFDSCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztTQUM3QjtJQUVMLENBQUM7SUFFRCwwQkFBMEI7UUFDdEIsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUU7WUFDOUQsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDbkY7UUFDRCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO1FBQ2pDLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVELHdCQUF3QjtRQUNwQixJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1FBQ3BDLElBQUksRUFBRSxJQUFJLElBQUk7WUFBRSxPQUFPLElBQUksQ0FBQztRQUU1QixPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQztJQUNsQyxDQUFDO0lBRUQsd0JBQXdCLENBQUMsQ0FBUztRQUM5QixJQUFJLENBQUMsSUFBSSxJQUFJO1lBQUUsT0FBTztRQUN0QixJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1FBQ3BDLElBQUksRUFBRSxDQUFDLG1CQUFtQixJQUFJLENBQUMsRUFBRTtZQUM3QixFQUFFLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLEVBQUUsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ2pCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztTQUN2QjtJQUNMLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxLQUFhO1FBQzFCLElBQUksT0FBZSxDQUFDO1FBRXBCLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtZQUNmLEtBQUssR0FBRyxhQUFhLENBQUM7WUFDdEIsT0FBTyxHQUFHLGtCQUFrQixDQUFDO1NBQ2hDO2FBQU07WUFDSCxPQUFPLEdBQUcsWUFBWSxDQUFDO1NBQzFCO1FBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTdFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELFlBQVksQ0FBQyxJQUFVO1FBQ25CLE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXR3b3JrTWFuYWdlciB9IGZyb20gXCIuLi8uLi9jb21tdW5pY2F0aW9uL05ldHdvcmtNYW5hZ2VyLmpzXCI7XHJcbmltcG9ydCB7IFRleHRQb3NpdGlvbiB9IGZyb20gXCIuLi8uLi9jb21waWxlci9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBGaWxlLCBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBQcm9ncmFtUHJpbnRlciB9IGZyb20gXCIuLi8uLi9jb21waWxlci9wYXJzZXIvUHJvZ3JhbVByaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgSW50ZXJwcmV0ZXJTdGF0ZSB9IGZyb20gXCIuLi8uLi9pbnRlcnByZXRlci9JbnRlcnByZXRlci5qc1wiO1xyXG5pbXBvcnQgeyBkb3dubG9hZEZpbGUsIG1ha2VFZGl0YWJsZSwgb3BlbkNvbnRleHRNZW51IH0gZnJvbSBcIi4uLy4uL3Rvb2xzL0h0bWxUb29scy5qc1wiO1xyXG5pbXBvcnQgeyBXb3Jrc3BhY2UgfSBmcm9tIFwiLi4vLi4vd29ya3NwYWNlL1dvcmtzcGFjZS5qc1wiO1xyXG5pbXBvcnQgeyBNYWluIH0gZnJvbSBcIi4uL01haW4uanNcIjtcclxuaW1wb3J0IHsgQWNjb3JkaW9uUGFuZWwsIEFjY29yZGlvbiwgQWNjb3JkaW9uRWxlbWVudCwgQWNjb3JkaW9uQ29udGV4dE1lbnVJdGVtIH0gZnJvbSBcIi4vQWNjb3JkaW9uLmpzXCI7XHJcbmltcG9ydCB7IEhlbHBlciB9IGZyb20gXCIuL0hlbHBlci5qc1wiO1xyXG5pbXBvcnQgeyB0ZXh0IH0gZnJvbSBcImV4cHJlc3NcIjtcclxuaW1wb3J0IHsgV29ya3NwYWNlRGF0YSwgV29ya3NwYWNlcywgQ2xhc3NEYXRhIH0gZnJvbSBcIi4uLy4uL2NvbW11bmljYXRpb24vRGF0YS5qc1wiO1xyXG5pbXBvcnQgeyBkYXRlVG9TdHJpbmcgfSBmcm9tIFwiLi4vLi4vdG9vbHMvU3RyaW5nVG9vbHMuanNcIjtcclxuaW1wb3J0IHsgRGlzdHJpYnV0ZVRvU3R1ZGVudHNEaWFsb2cgfSBmcm9tIFwiLi9EaXN0cmlidXRlVG9TdHVkZW50c0RpYWxvZy5qc1wiO1xyXG5pbXBvcnQgeyBXb3Jrc3BhY2VTZXR0aW5nc0RpYWxvZyB9IGZyb20gXCIuL1dvcmtzcGFjZVNldHRpbmdzRGlhbG9nLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIFByb2plY3RFeHBsb3JlciB7XHJcblxyXG4gICAgcHJvZ3JhbVBvaW50ZXJNb2R1bGU6IE1vZHVsZSA9IG51bGw7XHJcbiAgICBwcm9ncmFtUG9pbnRlclBvc2l0aW9uOiBUZXh0UG9zaXRpb247XHJcbiAgICBwcm9ncmFtUG9pbnRlckRlY29yYXRpb246IHN0cmluZ1tdID0gW107XHJcblxyXG4gICAgYWNjb3JkaW9uOiBBY2NvcmRpb247XHJcbiAgICBmaWxlTGlzdFBhbmVsOiBBY2NvcmRpb25QYW5lbDtcclxuICAgIHdvcmtzcGFjZUxpc3RQYW5lbDogQWNjb3JkaW9uUGFuZWw7XHJcblxyXG4gICAgJGhvbWVBY3Rpb246IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcbiAgICAkc3luY2hyb25pemVBY3Rpb246IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBtYWluOiBNYWluLCBwcml2YXRlICRwcm9qZWN0ZXhwbG9yZXJEaXY6IEpRdWVyeTxIVE1MRWxlbWVudD4pIHtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaW5pdEdVSSgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5hY2NvcmRpb24gPSBuZXcgQWNjb3JkaW9uKHRoaXMubWFpbiwgdGhpcy4kcHJvamVjdGV4cGxvcmVyRGl2KTtcclxuXHJcbiAgICAgICAgdGhpcy5pbml0RmlsZWxpc3RQYW5lbCgpO1xyXG5cclxuICAgICAgICB0aGlzLmluaXRXb3Jrc3BhY2VsaXN0UGFuZWwoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaW5pdEZpbGVsaXN0UGFuZWwoKSB7XHJcblxyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgdGhpcy5maWxlTGlzdFBhbmVsID0gbmV3IEFjY29yZGlvblBhbmVsKHRoaXMuYWNjb3JkaW9uLCBcIktlaW4gV29ya3NwYWNlIGdld8OkaGx0XCIsIFwiM1wiLFxyXG4gICAgICAgICAgICBcImltZ19hZGQtZmlsZS1kYXJrXCIsIFwiTmV1ZSBEYXRlaS4uLlwiLCBcImphdmFcIiwgdHJ1ZSwgZmFsc2UsIFwiZmlsZVwiLCB0cnVlLCBbXSk7XHJcblxyXG4gICAgICAgIHRoaXMuZmlsZUxpc3RQYW5lbC5uZXdFbGVtZW50Q2FsbGJhY2sgPVxyXG5cclxuICAgICAgICAgICAgKGFjY29yZGlvbkVsZW1lbnQsIHN1Y2Nlc3NmdWxOZXR3b3JrQ29tbXVuaWNhdGlvbkNhbGxiYWNrKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoYXQubWFpbi5jdXJyZW50V29ya3NwYWNlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBhbGVydCgnQml0dGUgd8OkaGxlbiBTaWUgenVlcnN0IGVpbmVuIFdvcmtzcGFjZSBhdXMuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGY6IEZpbGUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYWNjb3JkaW9uRWxlbWVudC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpcnR5OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBzYXZlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHRfYmVmb3JlX3JldmlzaW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Ym1pdHRlZF9kYXRlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0dWRlbnRfZWRpdGVkX2FmdGVyX3JldmlzaW9uOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhbmVsRWxlbWVudDogYWNjb3JkaW9uRWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICBpZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGxldCBtID0gbmV3IE1vZHVsZShmLCB0aGF0Lm1haW4pO1xyXG4gICAgICAgICAgICAgICAgbGV0IG1vZHVsU3RvcmUgPSB0aGF0Lm1haW4uY3VycmVudFdvcmtzcGFjZS5tb2R1bGVTdG9yZTtcclxuICAgICAgICAgICAgICAgIG1vZHVsU3RvcmUucHV0TW9kdWxlKG0pO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5zZXRNb2R1bGVBY3RpdmUobSk7XHJcbiAgICAgICAgICAgICAgICB0aGF0Lm1haW4ubmV0d29ya01hbmFnZXIuc2VuZENyZWF0ZUZpbGUobSwgdGhhdC5tYWluLmN1cnJlbnRXb3Jrc3BhY2UsIHRoYXQubWFpbi53b3Jrc3BhY2VzT3duZXJJZCxcclxuICAgICAgICAgICAgICAgICAgICAoZXJyb3I6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc2Z1bE5ldHdvcmtDb21tdW5pY2F0aW9uQ2FsbGJhY2sobSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnRGVyIFNlcnZlciBpc3QgbmljaHQgZXJyZWljaGJhciEnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZmlsZUxpc3RQYW5lbC5yZW5hbWVDYWxsYmFjayA9XHJcbiAgICAgICAgICAgIChtb2R1bGU6IE1vZHVsZSwgbmV3TmFtZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBuZXdOYW1lID0gbmV3TmFtZS5zdWJzdHIoMCwgODApO1xyXG4gICAgICAgICAgICAgICAgbGV0IGZpbGUgPSBtb2R1bGUuZmlsZTtcclxuXHJcbiAgICAgICAgICAgICAgICBmaWxlLm5hbWUgPSBuZXdOYW1lO1xyXG4gICAgICAgICAgICAgICAgZmlsZS5zYXZlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5tYWluLm5ldHdvcmtNYW5hZ2VyLnNlbmRVcGRhdGVzKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3TmFtZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmZpbGVMaXN0UGFuZWwuZGVsZXRlQ2FsbGJhY2sgPVxyXG4gICAgICAgICAgICAobW9kdWxlOiBNb2R1bGUsIGNhbGxiYWNrSWZTdWNjZXNzZnVsOiAoKSA9PiB2b2lkKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGF0Lm1haW4ubmV0d29ya01hbmFnZXIuc2VuZERlbGV0ZVdvcmtzcGFjZU9yRmlsZShcImZpbGVcIiwgbW9kdWxlLmZpbGUuaWQsIChlcnJvcjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tYWluLmN1cnJlbnRXb3Jrc3BhY2UubW9kdWxlU3RvcmUucmVtb3ZlTW9kdWxlKG1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrSWZTdWNjZXNzZnVsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ0RlciBTZXJ2ZXIgaXN0IG5pY2h0IGVycmVpY2hiYXIhJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5maWxlTGlzdFBhbmVsLmNvbnRleHRNZW51UHJvdmlkZXIgPSAoYWNjb3JkaW9uRWxlbWVudDogQWNjb3JkaW9uRWxlbWVudCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgbGV0IGNtaUxpc3Q6IEFjY29yZGlvbkNvbnRleHRNZW51SXRlbVtdID0gW107XHJcblxyXG4gICAgICAgICAgICBjbWlMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgY2FwdGlvbjogXCJEdXBsaXppZXJlblwiLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IChlbGVtZW50OiBBY2NvcmRpb25FbGVtZW50KSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBtb2R1bGU6IE1vZHVsZSA9IGVsZW1lbnQuZXh0ZXJuYWxFbGVtZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgZjogRmlsZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbW9kdWxlLmZpbGUubmFtZSArIFwiIC0gS29waWVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlydHk6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogbW9kdWxlLmZpbGUudGV4dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dF9iZWZvcmVfcmV2aXNpb246IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Ym1pdHRlZF9kYXRlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdHVkZW50X2VkaXRlZF9hZnRlcl9yZXZpc2lvbjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246IG1vZHVsZS5maWxlLnZlcnNpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhbmVsRWxlbWVudDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbjogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgbSA9IG5ldyBNb2R1bGUoZiwgdGhhdC5tYWluKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgd29ya3NwYWNlID0gdGhhdC5tYWluLmN1cnJlbnRXb3Jrc3BhY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1vZHVsU3RvcmUgPSB3b3Jrc3BhY2UubW9kdWxlU3RvcmU7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxTdG9yZS5wdXRNb2R1bGUobSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5tYWluLm5ldHdvcmtNYW5hZ2VyLnNlbmRDcmVhdGVGaWxlKG0sIHdvcmtzcGFjZSwgdGhhdC5tYWluLndvcmtzcGFjZXNPd25lcklkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoZXJyb3I6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDogQWNjb3JkaW9uRWxlbWVudCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNGb2xkZXI6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBmLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlcm5hbEVsZW1lbnQ6IG1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZi5wYW5lbEVsZW1lbnQgPSBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZmlsZUxpc3RQYW5lbC5hZGRFbGVtZW50KGVsZW1lbnQsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZmlsZUxpc3RQYW5lbC5zb3J0RWxlbWVudHMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNldE1vZHVsZUFjdGl2ZShtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmZpbGVMaXN0UGFuZWwucmVuYW1lRWxlbWVudChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ0RlciBTZXJ2ZXIgaXN0IG5pY2h0IGVycmVpY2hiYXIhJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgICAgICBpZiAoISh0aGF0Lm1haW4udXNlci5pc190ZWFjaGVyIHx8IHRoYXQubWFpbi51c2VyLmlzX2FkbWluIHx8IHRoYXQubWFpbi51c2VyLmlzX3NjaG9vbGFkbWluKSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG1vZHVsZTogTW9kdWxlID0gPE1vZHVsZT5hY2NvcmRpb25FbGVtZW50LmV4dGVybmFsRWxlbWVudDtcclxuICAgICAgICAgICAgICAgIGxldCBmaWxlID0gbW9kdWxlLmZpbGU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGZpbGUuc3VibWl0dGVkX2RhdGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNtaUxpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcHRpb246IFwiQWxzIEhhdXNhdWZnYWJlIG1hcmtpZXJlblwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVsZW1lbnQ6IEFjY29yZGlvbkVsZW1lbnQpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmlsZSA9ICg8TW9kdWxlPmVsZW1lbnQuZXh0ZXJuYWxFbGVtZW50KS5maWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5zdWJtaXR0ZWRfZGF0ZSA9IGRhdGVUb1N0cmluZyhuZXcgRGF0ZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUuc2F2ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubWFpbi5uZXR3b3JrTWFuYWdlci5zZW5kVXBkYXRlcyhudWxsLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucmVuZGVySG9tZXdvcmtCdXR0b24oZmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY21pTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwdGlvbjogXCJIYXVzYXVmZ2FiZW5tYXJraWVydW5nIGVudGZlcm5lblwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVsZW1lbnQ6IEFjY29yZGlvbkVsZW1lbnQpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmlsZSA9ICg8TW9kdWxlPmVsZW1lbnQuZXh0ZXJuYWxFbGVtZW50KS5maWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5zdWJtaXR0ZWRfZGF0ZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnNhdmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1haW4ubmV0d29ya01hbmFnZXIuc2VuZFVwZGF0ZXMobnVsbCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnJlbmRlckhvbWV3b3JrQnV0dG9uKGZpbGUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGNtaUxpc3Q7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIHRoaXMuZmlsZUxpc3RQYW5lbC5zZWxlY3RDYWxsYmFjayA9XHJcbiAgICAgICAgICAgIChtb2R1bGU6IE1vZHVsZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhhdC5zZXRNb2R1bGVBY3RpdmUobW9kdWxlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgdGhpcy4kc3luY2hyb25pemVBY3Rpb24gPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJpbWdfb3Blbi1jaGFuZ2Ugam9fYnV0dG9uIGpvX2FjdGl2ZVwiIHN0eWxlPVwibWFyZ2luLXJpZ2h0OiA0cHhcIicgK1xyXG4gICAgICAgICAgICAnIHRpdGxlPVwiV29ya3NwYWNlIG1pdCBSZXBvc2l0b3J5IHN5bmNocm9uaXNpZXJlblwiPicpO1xyXG5cclxuICAgICAgICBcclxuXHJcbiAgICAgICAgdGhpcy4kc3luY2hyb25pemVBY3Rpb24ub24oJ3BvaW50ZXJkb3duJywgKGUpID0+IHtcclxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tYWluLmdldEN1cnJlbnRXb3Jrc3BhY2UoKS5zeW5jaHJvbml6ZVdpdGhSZXBvc2l0b3J5KCk7XHJcblxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuZmlsZUxpc3RQYW5lbC5hZGRBY3Rpb24odGhpcy4kc3luY2hyb25pemVBY3Rpb24pO1xyXG4gICAgICAgIHRoaXMuJHN5bmNocm9uaXplQWN0aW9uLmhpZGUoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmVuZGVySG9tZXdvcmtCdXR0b24oZmlsZTogRmlsZSkge1xyXG4gICAgICAgIGxldCAkYnV0dG9uRGl2ID0gZmlsZT8ucGFuZWxFbGVtZW50Py4kaHRtbEZpcnN0TGluZT8uZmluZCgnLmpvX2FkZGl0aW9uYWxCdXR0b25Ib21ld29yaycpO1xyXG4gICAgICAgIGlmICgkYnV0dG9uRGl2ID09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgJGJ1dHRvbkRpdi5maW5kKCcuam9faG9tZXdvcmtCdXR0b24nKS5yZW1vdmUoKTtcclxuXHJcbiAgICAgICAgbGV0IGtsYXNzOiBzdHJpbmcgPSBudWxsO1xyXG4gICAgICAgIGxldCB0aXRsZTogc3RyaW5nID0gXCJcIjtcclxuICAgICAgICBpZiAoZmlsZS5zdWJtaXR0ZWRfZGF0ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGtsYXNzID0gXCJpbWdfaG9tZXdvcmtcIjtcclxuICAgICAgICAgICAgdGl0bGUgPSBcIld1cmRlIGFscyBIYXVzYXVmZ2FiZSBhYmdlZ2ViZW46IFwiICsgZmlsZS5zdWJtaXR0ZWRfZGF0ZVxyXG4gICAgICAgICAgICBpZiAoZmlsZS50ZXh0X2JlZm9yZV9yZXZpc2lvbikge1xyXG4gICAgICAgICAgICAgICAga2xhc3MgPSBcImltZ19ob21ld29yay1jb3JyZWN0ZWRcIjtcclxuICAgICAgICAgICAgICAgIHRpdGxlID0gXCJLb3JyZWt0dXIgbGllZ3Qgdm9yLlwiXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChrbGFzcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCAkaG9tZXdvcmtCdXR0b25EaXYgPSBqUXVlcnkoYDxkaXYgY2xhc3M9XCJqb19ob21ld29ya0J1dHRvbiAke2tsYXNzfVwiIHRpdGxlPVwiJHt0aXRsZX1cIj48L2Rpdj5gKTtcclxuICAgICAgICAgICAgJGJ1dHRvbkRpdi5wcmVwZW5kKCRob21ld29ya0J1dHRvbkRpdik7XHJcbiAgICAgICAgICAgIGlmIChrbGFzcy5pbmRleE9mKFwiam9fYWN0aXZlXCIpID49IDApIHtcclxuICAgICAgICAgICAgICAgICRob21ld29ya0J1dHRvbkRpdi5vbignbW91c2Vkb3duJywgKGUpID0+IGUuc3RvcFByb3BhZ2F0aW9uKCkpO1xyXG4gICAgICAgICAgICAgICAgJGhvbWV3b3JrQnV0dG9uRGl2Lm9uKCdjbGljaycsIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBpbml0V29ya3NwYWNlbGlzdFBhbmVsKCkge1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIHRoaXMud29ya3NwYWNlTGlzdFBhbmVsID0gbmV3IEFjY29yZGlvblBhbmVsKHRoaXMuYWNjb3JkaW9uLCBcIldPUktTUEFDRVNcIiwgXCIzXCIsXHJcbiAgICAgICAgICAgIFwiaW1nX2FkZC13b3Jrc3BhY2UtZGFya1wiLCBcIk5ldWVyIFdvcmtzcGFjZS4uLlwiLCBcIndvcmtzcGFjZVwiLCB0cnVlLCB0cnVlLCBcIndvcmtzcGFjZVwiLCBmYWxzZSwgW1wiZmlsZVwiXSk7XHJcblxyXG4gICAgICAgIHRoaXMud29ya3NwYWNlTGlzdFBhbmVsLm5ld0VsZW1lbnRDYWxsYmFjayA9XHJcblxyXG4gICAgICAgICAgICAoYWNjb3JkaW9uRWxlbWVudCwgc3VjY2Vzc2Z1bE5ldHdvcmtDb21tdW5pY2F0aW9uQ2FsbGJhY2spID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgb3duZXJfaWQ6IG51bWJlciA9IHRoYXQubWFpbi51c2VyLmlkO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoYXQubWFpbi53b3Jrc3BhY2VzT3duZXJJZCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3duZXJfaWQgPSB0aGF0Lm1haW4ud29ya3NwYWNlc093bmVySWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHc6IFdvcmtzcGFjZSA9IG5ldyBXb3Jrc3BhY2UoYWNjb3JkaW9uRWxlbWVudC5uYW1lLCB0aGF0Lm1haW4sIG93bmVyX2lkKTtcclxuICAgICAgICAgICAgICAgIHcuaXNGb2xkZXIgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHcucGF0aCA9IGFjY29yZGlvbkVsZW1lbnQucGF0aC5qb2luKFwiL1wiKTtcclxuICAgICAgICAgICAgICAgIHRoYXQubWFpbi53b3Jrc3BhY2VMaXN0LnB1c2godyk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhhdC5tYWluLm5ldHdvcmtNYW5hZ2VyLnNlbmRDcmVhdGVXb3Jrc3BhY2UodywgdGhhdC5tYWluLndvcmtzcGFjZXNPd25lcklkLCAoZXJyb3I6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZmlsZUxpc3RQYW5lbC5lbmFibGVOZXdCdXR0b24odHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NmdWxOZXR3b3JrQ29tbXVuaWNhdGlvbkNhbGxiYWNrKHcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNldFdvcmtzcGFjZUFjdGl2ZSh3KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdy5yZW5kZXJTeW5jaHJvbml6ZUJ1dHRvbihhY2NvcmRpb25FbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnRGVyIFNlcnZlciBpc3QgbmljaHQgZXJyZWljaGJhciEnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMud29ya3NwYWNlTGlzdFBhbmVsLnJlbmFtZUNhbGxiYWNrID1cclxuICAgICAgICAgICAgKHdvcmtzcGFjZTogV29ya3NwYWNlLCBuZXdOYW1lOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgIG5ld05hbWUgPSBuZXdOYW1lLnN1YnN0cigwLCA4MCk7XHJcbiAgICAgICAgICAgICAgICB3b3Jrc3BhY2UubmFtZSA9IG5ld05hbWU7XHJcbiAgICAgICAgICAgICAgICB3b3Jrc3BhY2Uuc2F2ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoYXQubWFpbi5uZXR3b3JrTWFuYWdlci5zZW5kVXBkYXRlcygpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ld05hbWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy53b3Jrc3BhY2VMaXN0UGFuZWwuZGVsZXRlQ2FsbGJhY2sgPVxyXG4gICAgICAgICAgICAod29ya3NwYWNlOiBXb3Jrc3BhY2UsIHN1Y2Nlc3NmdWxOZXR3b3JrQ29tbXVuaWNhdGlvbkNhbGxiYWNrOiAoKSA9PiB2b2lkKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGF0Lm1haW4ubmV0d29ya01hbmFnZXIuc2VuZERlbGV0ZVdvcmtzcGFjZU9yRmlsZShcIndvcmtzcGFjZVwiLCB3b3Jrc3BhY2UuaWQsIChlcnJvcjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tYWluLnJlbW92ZVdvcmtzcGFjZSh3b3Jrc3BhY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmZpbGVMaXN0UGFuZWwuY2xlYXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5maWxlTGlzdFBhbmVsLnNldENhcHRpb24oJ0JpdHRlIFdvcmtzcGFjZSBzZWxla3RpZXJlbicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRzeW5jaHJvbml6ZUFjdGlvbi5oaWRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZmlsZUxpc3RQYW5lbC5lbmFibGVOZXdCdXR0b24oZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzZnVsTmV0d29ya0NvbW11bmljYXRpb25DYWxsYmFjaygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdEZXIgU2VydmVyIGlzdCBuaWNodCBlcnJlaWNoYmFyIScpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLndvcmtzcGFjZUxpc3RQYW5lbC5zZWxlY3RDYWxsYmFjayA9XHJcbiAgICAgICAgICAgICh3b3Jrc3BhY2U6IFdvcmtzcGFjZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHdvcmtzcGFjZSAhPSBudWxsICYmICF3b3Jrc3BhY2UuaXNGb2xkZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm1haW4ubmV0d29ya01hbmFnZXIuc2VuZFVwZGF0ZXMoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNldFdvcmtzcGFjZUFjdGl2ZSh3b3Jrc3BhY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLndvcmtzcGFjZUxpc3RQYW5lbC5uZXdGb2xkZXJDYWxsYmFjayA9IChuZXdFbGVtZW50OiBBY2NvcmRpb25FbGVtZW50LCBzdWNjZXNzQ2FsbGJhY2spID0+IHtcclxuICAgICAgICAgICAgbGV0IG93bmVyX2lkOiBudW1iZXIgPSB0aGF0Lm1haW4udXNlci5pZDtcclxuICAgICAgICAgICAgaWYgKHRoYXQubWFpbi53b3Jrc3BhY2VzT3duZXJJZCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBvd25lcl9pZCA9IHRoYXQubWFpbi53b3Jrc3BhY2VzT3duZXJJZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGZvbGRlcjogV29ya3NwYWNlID0gbmV3IFdvcmtzcGFjZShuZXdFbGVtZW50Lm5hbWUsIHRoYXQubWFpbiwgb3duZXJfaWQpO1xyXG4gICAgICAgICAgICBmb2xkZXIuaXNGb2xkZXIgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgZm9sZGVyLnBhdGggPSBuZXdFbGVtZW50LnBhdGguam9pbihcIi9cIik7XHJcbiAgICAgICAgICAgIGZvbGRlci5wYW5lbEVsZW1lbnQgPSBuZXdFbGVtZW50O1xyXG4gICAgICAgICAgICBuZXdFbGVtZW50LmV4dGVybmFsRWxlbWVudCA9IGZvbGRlcjtcclxuICAgICAgICAgICAgdGhhdC5tYWluLndvcmtzcGFjZUxpc3QucHVzaChmb2xkZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhhdC5tYWluLm5ldHdvcmtNYW5hZ2VyLnNlbmRDcmVhdGVXb3Jrc3BhY2UoZm9sZGVyLCB0aGF0Lm1haW4ud29ya3NwYWNlc093bmVySWQsIChlcnJvcjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NDYWxsYmFjayhmb2xkZXIpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBhbGVydChcIkZlaGxlcjogXCIgKyBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC53b3Jrc3BhY2VMaXN0UGFuZWwucmVtb3ZlRWxlbWVudChuZXdFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy53b3Jrc3BhY2VMaXN0UGFuZWwubW92ZUNhbGxiYWNrID0gKGFlOiBBY2NvcmRpb25FbGVtZW50IHwgQWNjb3JkaW9uRWxlbWVudFtdKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShhZSkpIGFlID0gW2FlXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgYSBvZiBhZSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHdzOiBXb3Jrc3BhY2UgPSBhLmV4dGVybmFsRWxlbWVudDtcclxuICAgICAgICAgICAgICAgIHdzLnBhdGggPSBhLnBhdGguam9pbihcIi9cIik7XHJcbiAgICAgICAgICAgICAgICB3cy5zYXZlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5uZXR3b3JrTWFuYWdlci5zZW5kVXBkYXRlcygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy53b3Jrc3BhY2VMaXN0UGFuZWwuZHJvcEVsZW1lbnRDYWxsYmFjayA9IChkZXN0OiBBY2NvcmRpb25FbGVtZW50LCBkcm9wcGVkRWxlbWVudDogQWNjb3JkaW9uRWxlbWVudCwgZHJvcEVmZmVrdDogXCJjb3B5XCIgfCBcIm1vdmVcIikgPT4ge1xyXG4gICAgICAgICAgICBsZXQgd29ya3NwYWNlOiBXb3Jrc3BhY2UgPSBkZXN0LmV4dGVybmFsRWxlbWVudDtcclxuICAgICAgICAgICAgbGV0IG1vZHVsZTogTW9kdWxlID0gZHJvcHBlZEVsZW1lbnQuZXh0ZXJuYWxFbGVtZW50O1xyXG5cclxuICAgICAgICAgICAgaWYgKHdvcmtzcGFjZS5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKS5pbmRleE9mKG1vZHVsZSkgPj0gMCkgcmV0dXJuOyAvLyBtb2R1bGUgaXMgYWxyZWFkeSBpbiBkZXN0aW5hdGlvbiB3b3Jrc3BhY2VcclxuXHJcbiAgICAgICAgICAgIGxldCBmOiBGaWxlID0ge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogbW9kdWxlLmZpbGUubmFtZSxcclxuICAgICAgICAgICAgICAgIGRpcnR5OiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc2F2ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogbW9kdWxlLmZpbGUudGV4dCxcclxuICAgICAgICAgICAgICAgIHRleHRfYmVmb3JlX3JldmlzaW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgc3VibWl0dGVkX2RhdGU6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBzdHVkZW50X2VkaXRlZF9hZnRlcl9yZXZpc2lvbjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiBtb2R1bGUuZmlsZS52ZXJzaW9uLFxyXG4gICAgICAgICAgICAgICAgcGFuZWxFbGVtZW50OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbjogZmFsc2VcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkcm9wRWZmZWt0ID09IFwibW92ZVwiKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBtb3ZlIGZpbGVcclxuICAgICAgICAgICAgICAgIGxldCBvbGRXb3Jrc3BhY2UgPSB0aGF0Lm1haW4uY3VycmVudFdvcmtzcGFjZTtcclxuICAgICAgICAgICAgICAgIG9sZFdvcmtzcGFjZS5tb2R1bGVTdG9yZS5yZW1vdmVNb2R1bGUobW9kdWxlKTtcclxuICAgICAgICAgICAgICAgIHRoYXQuZmlsZUxpc3RQYW5lbC5yZW1vdmVFbGVtZW50KG1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICB0aGF0Lm1haW4ubmV0d29ya01hbmFnZXIuc2VuZERlbGV0ZVdvcmtzcGFjZU9yRmlsZShcImZpbGVcIiwgbW9kdWxlLmZpbGUuaWQsICgpID0+IHsgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBtID0gbmV3IE1vZHVsZShmLCB0aGF0Lm1haW4pO1xyXG4gICAgICAgICAgICBsZXQgbW9kdWxTdG9yZSA9IHdvcmtzcGFjZS5tb2R1bGVTdG9yZTtcclxuICAgICAgICAgICAgbW9kdWxTdG9yZS5wdXRNb2R1bGUobSk7XHJcbiAgICAgICAgICAgIHRoYXQubWFpbi5uZXR3b3JrTWFuYWdlci5zZW5kQ3JlYXRlRmlsZShtLCB3b3Jrc3BhY2UsIHRoYXQubWFpbi53b3Jrc3BhY2VzT3duZXJJZCxcclxuICAgICAgICAgICAgICAgIChlcnJvcjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnRGVyIFNlcnZlciBpc3QgbmljaHQgZXJyZWljaGJhciEnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy4kaG9tZUFjdGlvbiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImltZ19ob21lLWRhcmsgam9fYnV0dG9uIGpvX2FjdGl2ZVwiIHN0eWxlPVwibWFyZ2luLXJpZ2h0OiA0cHhcIicgK1xyXG4gICAgICAgICAgICAnIHRpdGxlPVwiTWVpbmUgZWlnZW5lbiBXb3Jrc3BhY2VzIGFuemVpZ2VuXCI+Jyk7XHJcbiAgICAgICAgdGhpcy4kaG9tZUFjdGlvbi5vbigncG9pbnRlcmRvd24nLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICB0aGF0Lm1haW4ubmV0d29ya01hbmFnZXIuc2VuZFVwZGF0ZXMoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhhdC5vbkhvbWVCdXR0b25DbGlja2VkKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhhdC5tYWluLmJvdHRvbURpdi5oaWRlSG9tZXdvcmtUYWIoKTtcclxuXHJcbiAgICAgICAgfSlcclxuXHJcblxyXG4gICAgICAgIHRoaXMud29ya3NwYWNlTGlzdFBhbmVsLmFkZEFjdGlvbih0aGlzLiRob21lQWN0aW9uKTtcclxuICAgICAgICB0aGlzLiRob21lQWN0aW9uLmhpZGUoKTtcclxuXHJcbiAgICAgICAgdGhpcy53b3Jrc3BhY2VMaXN0UGFuZWwuY29udGV4dE1lbnVQcm92aWRlciA9ICh3b3Jrc3BhY2VBY2NvcmRpb25FbGVtZW50OiBBY2NvcmRpb25FbGVtZW50KSA9PiB7XHJcblxyXG4gICAgICAgICAgICBsZXQgY21pTGlzdDogQWNjb3JkaW9uQ29udGV4dE1lbnVJdGVtW10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGNtaUxpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBjYXB0aW9uOiBcIkR1cGxpemllcmVuXCIsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVsZW1lbnQ6IEFjY29yZGlvbkVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW4ubmV0d29ya01hbmFnZXIuc2VuZER1cGxpY2F0ZVdvcmtzcGFjZShlbGVtZW50LmV4dGVybmFsRWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGVycm9yOiBzdHJpbmcsIHdvcmtzcGFjZURhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnJvciA9PSBudWxsICYmIHdvcmtzcGFjZURhdGEgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdXb3Jrc3BhY2U6IFdvcmtzcGFjZSA9IFdvcmtzcGFjZS5yZXN0b3JlRnJvbURhdGEod29ya3NwYWNlRGF0YSwgdGhpcy5tYWluKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW4ud29ya3NwYWNlTGlzdC5wdXNoKG5ld1dvcmtzcGFjZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGggPSB3b3Jrc3BhY2VEYXRhLnBhdGguc3BsaXQoXCIvXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXRoLmxlbmd0aCA9PSAxICYmIHBhdGhbMF0gPT0gXCJcIikgcGF0aCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1dvcmtzcGFjZS5wYW5lbEVsZW1lbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5ld1dvcmtzcGFjZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlcm5hbEVsZW1lbnQ6IG5ld1dvcmtzcGFjZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWNvbkNsYXNzOiBuZXdXb3Jrc3BhY2UucmVwb3NpdG9yeV9pZCA9PSBudWxsID8gJ3dvcmtzcGFjZScgOiAncmVwb3NpdG9yeScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzRm9sZGVyOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcGF0aFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud29ya3NwYWNlTGlzdFBhbmVsLmFkZEVsZW1lbnQobmV3V29ya3NwYWNlLnBhbmVsRWxlbWVudCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53b3Jrc3BhY2VMaXN0UGFuZWwuc29ydEVsZW1lbnRzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY2FwdGlvbjogXCJFeHBvcnRpZXJlblwiLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IChlbGVtZW50OiBBY2NvcmRpb25FbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHdzOiBXb3Jrc3BhY2UgPSA8V29ya3NwYWNlPmVsZW1lbnQuZXh0ZXJuYWxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBuYW1lOiBzdHJpbmcgPSB3cy5uYW1lLnJlcGxhY2UoL1xcLy9nLCBcIl9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgZG93bmxvYWRGaWxlKHdzLnRvRXhwb3J0ZWRXb3Jrc3BhY2UoKSwgbmFtZSArIFwiLmpzb25cIilcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm1haW4udXNlci5pc190ZWFjaGVyICYmIHRoaXMubWFpbi50ZWFjaGVyRXhwbG9yZXIuY2xhc3NQYW5lbC5lbGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjbWlMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIGNhcHRpb246IFwiQW4gS2xhc3NlIGF1c3RlaWxlbi4uLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoZWxlbWVudDogQWNjb3JkaW9uRWxlbWVudCkgPT4geyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Yk1lbnU6IHRoaXMubWFpbi50ZWFjaGVyRXhwbG9yZXIuY2xhc3NQYW5lbC5lbGVtZW50cy5tYXAoKGFlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXB0aW9uOiBhZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IChlbGVtZW50OiBBY2NvcmRpb25FbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGtsYXNzZSA9IDxhbnk+YWUuZXh0ZXJuYWxFbGVtZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgd29ya3NwYWNlOiBXb3Jrc3BhY2UgPSBlbGVtZW50LmV4dGVybmFsRWxlbWVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWluLm5ldHdvcmtNYW5hZ2VyLnNlbmREaXN0cmlidXRlV29ya3NwYWNlKHdvcmtzcGFjZSwga2xhc3NlLCBudWxsLCAoZXJyb3I6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ldHdvcmtNYW5hZ2VyID0gdGhpcy5tYWluLm5ldHdvcmtNYW5hZ2VyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGR0ID0gbmV0d29ya01hbmFnZXIudXBkYXRlRnJlcXVlbmN5SW5TZWNvbmRzICogbmV0d29ya01hbmFnZXIuZm9yY2VkVXBkYXRlRXZlcnk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGVydChcIkRlciBXb3Jrc3BhY2UgXCIgKyB3b3Jrc3BhY2UubmFtZSArIFwiIHd1cmRlIGFuIGRpZSBLbGFzc2UgXCIgKyBrbGFzc2UubmFtZSArIFwiIGF1c2dldGVpbHQuIEVyIHdpcmQgaW4gbWF4aW1hbCBcIiArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHQgKyBcIiBzIGJlaSBqZWRlbSBTY2jDvGxlciBhbmtvbW1lbi5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGVydChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcHRpb246IFwiQW4gZWluemVsbmUgU2Now7xsZXIvaW5uZW4gYXVzdGVpbGVuLi4uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoZWxlbWVudDogQWNjb3JkaW9uRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNsYXNzZXM6IENsYXNzRGF0YVtdID0gdGhpcy5tYWluLnRlYWNoZXJFeHBsb3Jlci5jbGFzc1BhbmVsLmVsZW1lbnRzLm1hcChhZSA9PiBhZS5leHRlcm5hbEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHdvcmtzcGFjZTogV29ya3NwYWNlID0gZWxlbWVudC5leHRlcm5hbEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgRGlzdHJpYnV0ZVRvU3R1ZGVudHNEaWFsb2coY2xhc3Nlcywgd29ya3NwYWNlLCB0aGlzLm1haW4pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMubWFpbi5yZXBvc2l0b3J5T24gJiYgdGhpcy5tYWluLndvcmtzcGFjZXNPd25lcklkID09IHRoaXMubWFpbi51c2VyLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAod29ya3NwYWNlQWNjb3JkaW9uRWxlbWVudC5leHRlcm5hbEVsZW1lbnQucmVwb3NpdG9yeV9pZCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY21pTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwdGlvbjogXCJSZXBvc2l0b3J5IGFubGVnZW4uLi5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IChlbGVtZW50OiBBY2NvcmRpb25FbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgd29ya3NwYWNlOiBXb3Jrc3BhY2UgPSBlbGVtZW50LmV4dGVybmFsRWxlbWVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1haW4ucmVwb3NpdG9yeUNyZWF0ZU1hbmFnZXIuc2hvdyh3b3Jrc3BhY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJNZW51OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBbeyBuOiAwLCB0ZXh0OiBcIm51ciBwcml2YXQgc2ljaHRiYXJcIiB9LCB7IG46IDEsIHRleHQ6IFwic2ljaHRiYXIgZsO8ciBkaWUgS2xhc3NlXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8geyBuOiAyLCB0ZXh0OiBcInNpY2h0YmFyIGbDvHIgZGllIFNjaHVsZVwiIH1dLm1hcCgoaykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBjYXB0aW9uOiBrLnRleHQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgY2FsbGJhY2s6IChlbGVtZW50OiBBY2NvcmRpb25FbGVtZW50KSA9PiB7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5tYWluLm5ldHdvcmtNYW5hZ2VyLnNlbmRDcmVhdGVSZXBvc2l0b3J5KHdvcmtzcGFjZSwgay5uLCAoZXJyb3I6IHN0cmluZywgcmVwb3NpdG9yeV9pZD86IG51bWJlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgaWYgKGVycm9yID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICB0aGlzLndvcmtzcGFjZUxpc3RQYW5lbC5zZXRFbGVtZW50Q2xhc3MoZWxlbWVudCwgXCJyZXBvc2l0b3J5XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIHdvcmtzcGFjZS5yZW5kZXJTeW5jaHJvbml6ZUJ1dHRvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIHRoaXMuc2hvd1JlcG9zaXRvcnlCdXR0b25JZk5lZWRlZCh3b3Jrc3BhY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBhbGVydChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNtaUxpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcHRpb246IFwiTWl0IFJlcG9zaXRvcnkgc3luY2hyb25pc2llcmVuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoZWxlbWVudDogQWNjb3JkaW9uRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHdvcmtzcGFjZTogV29ya3NwYWNlID0gZWxlbWVudC5leHRlcm5hbEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3Jrc3BhY2Uuc3luY2hyb25pemVXaXRoUmVwb3NpdG9yeSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY21pTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwdGlvbjogXCJWb20gUmVwb3NpdG9yeSBsb3Nsw7ZzZW5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6IFwiI2ZmODA4MFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVsZW1lbnQ6IEFjY29yZGlvbkVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB3b3Jrc3BhY2U6IFdvcmtzcGFjZSA9IGVsZW1lbnQuZXh0ZXJuYWxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya3NwYWNlLnJlcG9zaXRvcnlfaWQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya3NwYWNlLnNhdmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW4ubmV0d29ya01hbmFnZXIuc2VuZFVwZGF0ZXMoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQud29ya3NwYWNlTGlzdFBhbmVsLnNldEVsZW1lbnRDbGFzcyhlbGVtZW50LCBcIndvcmtzcGFjZVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3Jrc3BhY2UucmVuZGVyU3luY2hyb25pemVCdXR0b24oZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjbWlMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgY2FwdGlvbjogXCJFaW5zdGVsbHVuZ2VuLi4uXCIsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVsZW1lbnQ6IEFjY29yZGlvbkVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgd29ya3NwYWNlOiBXb3Jrc3BhY2UgPSBlbGVtZW50LmV4dGVybmFsRWxlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICBuZXcgV29ya3NwYWNlU2V0dGluZ3NEaWFsb2cod29ya3NwYWNlLCB0aGlzLm1haW4pLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBjbWlMaXN0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgb25Ib21lQnV0dG9uQ2xpY2tlZCgpIHtcclxuICAgICAgICB0aGlzLm1haW4udGVhY2hlckV4cGxvcmVyLnJlc3RvcmVPd25Xb3Jrc3BhY2VzKCk7XHJcbiAgICAgICAgdGhpcy5tYWluLm5ldHdvcmtNYW5hZ2VyLnVwZGF0ZUZyZXF1ZW5jeUluU2Vjb25kcyA9IHRoaXMubWFpbi5uZXR3b3JrTWFuYWdlci5vd25VcGRhdGVGcmVxdWVuY3lJblNlY29uZHM7XHJcbiAgICAgICAgdGhpcy4kaG9tZUFjdGlvbi5oaWRlKCk7XHJcbiAgICAgICAgdGhpcy5maWxlTGlzdFBhbmVsLmVuYWJsZU5ld0J1dHRvbih0aGlzLm1haW4ud29ya3NwYWNlTGlzdC5sZW5ndGggPiAwKTtcclxuICAgIH1cclxuXHJcbiAgICByZW5kZXJGaWxlcyh3b3Jrc3BhY2U6IFdvcmtzcGFjZSkge1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHdvcmtzcGFjZSA9PSBudWxsID8gXCJLZWluIFdvcmtzcGFjZSB2b3JoYW5kZW5cIiA6IHdvcmtzcGFjZS5uYW1lO1xyXG5cclxuICAgICAgICB0aGlzLmZpbGVMaXN0UGFuZWwuc2V0Q2FwdGlvbihuYW1lKTtcclxuICAgICAgICB0aGlzLmZpbGVMaXN0UGFuZWwuY2xlYXIoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubWFpbi5nZXRDdXJyZW50V29ya3NwYWNlKCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBtb2R1bGUgb2YgdGhpcy5tYWluLmdldEN1cnJlbnRXb3Jrc3BhY2UoKS5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKSkge1xyXG4gICAgICAgICAgICAgICAgbW9kdWxlLmZpbGUucGFuZWxFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHdvcmtzcGFjZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCBtb2R1bGVMaXN0OiBNb2R1bGVbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgbSBvZiB3b3Jrc3BhY2UubW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSkpIHtcclxuICAgICAgICAgICAgICAgIG1vZHVsZUxpc3QucHVzaChtKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbW9kdWxlTGlzdC5zb3J0KChhLCBiKSA9PiB7IHJldHVybiBhLmZpbGUubmFtZSA+IGIuZmlsZS5uYW1lID8gMSA6IGEuZmlsZS5uYW1lIDwgYi5maWxlLm5hbWUgPyAtMSA6IDAgfSk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBtIG9mIG1vZHVsZUxpc3QpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBtLmZpbGUucGFuZWxFbGVtZW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG0uZmlsZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4dGVybmFsRWxlbWVudDogbSxcclxuICAgICAgICAgICAgICAgICAgICBpc0ZvbGRlcjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogW11cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5maWxlTGlzdFBhbmVsLmFkZEVsZW1lbnQobS5maWxlLnBhbmVsRWxlbWVudCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckhvbWV3b3JrQnV0dG9uKG0uZmlsZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuZmlsZUxpc3RQYW5lbC5zb3J0RWxlbWVudHMoKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlbmRlcldvcmtzcGFjZXMod29ya3NwYWNlTGlzdDogV29ya3NwYWNlW10pIHtcclxuXHJcbiAgICAgICAgdGhpcy5maWxlTGlzdFBhbmVsLmNsZWFyKCk7XHJcbiAgICAgICAgdGhpcy53b3Jrc3BhY2VMaXN0UGFuZWwuY2xlYXIoKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgdyBvZiB3b3Jrc3BhY2VMaXN0KSB7XHJcbiAgICAgICAgICAgIGxldCBwYXRoID0gdy5wYXRoLnNwbGl0KFwiL1wiKTtcclxuICAgICAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09IDEgJiYgcGF0aFswXSA9PSBcIlwiKSBwYXRoID0gW107XHJcbiAgICAgICAgICAgIHcucGFuZWxFbGVtZW50ID0ge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogdy5uYW1lLFxyXG4gICAgICAgICAgICAgICAgZXh0ZXJuYWxFbGVtZW50OiB3LFxyXG4gICAgICAgICAgICAgICAgaWNvbkNsYXNzOiB3LnJlcG9zaXRvcnlfaWQgPT0gbnVsbCA/ICd3b3Jrc3BhY2UnIDogJ3JlcG9zaXRvcnknLFxyXG4gICAgICAgICAgICAgICAgaXNGb2xkZXI6IHcuaXNGb2xkZXIsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBwYXRoXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB0aGlzLndvcmtzcGFjZUxpc3RQYW5lbC5hZGRFbGVtZW50KHcucGFuZWxFbGVtZW50LCBmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICB3LnJlbmRlclN5bmNocm9uaXplQnV0dG9uKHcucGFuZWxFbGVtZW50KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMud29ya3NwYWNlTGlzdFBhbmVsLnNvcnRFbGVtZW50cygpO1xyXG4gICAgICAgIHRoaXMuZmlsZUxpc3RQYW5lbC5lbmFibGVOZXdCdXR0b24od29ya3NwYWNlTGlzdC5sZW5ndGggPiAwKTtcclxuICAgICAgICAvLyBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAvLyAgICAgdGhpcy53b3Jrc3BhY2VMaXN0UGFuZWwuY29sbGFwc2VBbGwoKTtcclxuICAgICAgICAvLyB9LCA1MDApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByZW5kZXJFcnJvckNvdW50KHdvcmtzcGFjZTogV29ya3NwYWNlLCBlcnJvckNvdW50TWFwOiBNYXA8TW9kdWxlLCBudW1iZXI+KSB7XHJcbiAgICAgICAgaWYgKGVycm9yQ291bnRNYXAgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgIGZvciAobGV0IG0gb2Ygd29ya3NwYWNlLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpKSB7XHJcbiAgICAgICAgICAgIGxldCBlcnJvckNvdW50OiBudW1iZXIgPSBlcnJvckNvdW50TWFwLmdldChtKTtcclxuICAgICAgICAgICAgbGV0IGVycm9yQ291bnRTOiBzdHJpbmcgPSAoKGVycm9yQ291bnQgPT0gbnVsbCB8fCBlcnJvckNvdW50ID09IDApID8gXCJcIiA6IFwiKFwiICsgZXJyb3JDb3VudCArIFwiKVwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZmlsZUxpc3RQYW5lbC5zZXRUZXh0QWZ0ZXJGaWxlbmFtZShtLmZpbGUucGFuZWxFbGVtZW50LCBlcnJvckNvdW50UywgJ2pvX2Vycm9yY291bnQnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2hvd1JlcG9zaXRvcnlCdXR0b25JZk5lZWRlZCh3OiBXb3Jrc3BhY2UpIHtcclxuICAgICAgICBpZiAody5yZXBvc2l0b3J5X2lkICE9IG51bGwgJiYgdy5vd25lcl9pZCA9PSB0aGlzLm1haW4udXNlci5pZCkge1xyXG4gICAgICAgICAgICB0aGlzLiRzeW5jaHJvbml6ZUFjdGlvbi5zaG93KCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMubWFpbi51c2VyLnNldHRpbmdzLmhlbHBlckhpc3RvcnkucmVwb3NpdG9yeUJ1dHRvbkRvbmUpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBIZWxwZXIuc2hvd0hlbHBlcihcInJlcG9zaXRvcnlCdXR0b25cIiwgdGhpcy5tYWluLCB0aGlzLiRzeW5jaHJvbml6ZUFjdGlvbik7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy4kc3luY2hyb25pemVBY3Rpb24uaGlkZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZXRXb3Jrc3BhY2VBY3RpdmUodzogV29ya3NwYWNlLCBzY3JvbGxJbnRvVmlldzogYm9vbGVhbiA9IGZhbHNlKSB7XHJcblxyXG4gICAgICAgIHRoaXMud29ya3NwYWNlTGlzdFBhbmVsLnNlbGVjdCh3LCBmYWxzZSwgc2Nyb2xsSW50b1ZpZXcpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5tYWluLmludGVycHJldGVyLnN0YXRlID09IEludGVycHJldGVyU3RhdGUucnVubmluZykge1xyXG4gICAgICAgICAgICB0aGlzLm1haW4uaW50ZXJwcmV0ZXIuc3RvcCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYWluLmN1cnJlbnRXb3Jrc3BhY2UgPSB3O1xyXG4gICAgICAgIHRoaXMucmVuZGVyRmlsZXModyk7XHJcblxyXG4gICAgICAgIGlmICh3ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0IG5vblN5c3RlbU1vZHVsZXMgPSB3Lm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHcuY3VycmVudGx5T3Blbk1vZHVsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldE1vZHVsZUFjdGl2ZSh3LmN1cnJlbnRseU9wZW5Nb2R1bGUpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5vblN5c3RlbU1vZHVsZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRNb2R1bGVBY3RpdmUobm9uU3lzdGVtTW9kdWxlc1swXSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldE1vZHVsZUFjdGl2ZShudWxsKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgbSBvZiBub25TeXN0ZW1Nb2R1bGVzKSB7XHJcbiAgICAgICAgICAgICAgICBtLmZpbGUuZGlydHkgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobm9uU3lzdGVtTW9kdWxlcy5sZW5ndGggPT0gMCAmJiAhdGhpcy5tYWluLnVzZXIuc2V0dGluZ3MuaGVscGVySGlzdG9yeS5uZXdGaWxlSGVscGVyRG9uZSkge1xyXG5cclxuICAgICAgICAgICAgICAgIEhlbHBlci5zaG93SGVscGVyKFwibmV3RmlsZUhlbHBlclwiLCB0aGlzLm1haW4sIHRoaXMuZmlsZUxpc3RQYW5lbC4kY2FwdGlvbkVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zaG93UmVwb3NpdG9yeUJ1dHRvbklmTmVlZGVkKHcpO1xyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNldE1vZHVsZUFjdGl2ZShudWxsKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICB3cml0ZUVkaXRvclRleHRUb0ZpbGUoKSB7XHJcbiAgICAgICAgbGV0IGNlbSA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCk7XHJcbiAgICAgICAgaWYgKGNlbSAhPSBudWxsKVxyXG4gICAgICAgICAgICBjZW0uZmlsZS50ZXh0ID0gY2VtLmdldFByb2dyYW1UZXh0RnJvbU1vbmFjb01vZGVsKCk7IC8vIDI5LjAzLiB0aGlzLm1haW4ubW9uYWNvLmdldFZhbHVlKCk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGxhc3RPcGVuTW9kdWxlOiBNb2R1bGUgPSBudWxsO1xyXG4gICAgc2V0TW9kdWxlQWN0aXZlKG06IE1vZHVsZSkge1xyXG5cclxuICAgICAgICB0aGlzLm1haW4uYm90dG9tRGl2LmhvbWV3b3JrTWFuYWdlci5oaWRlUmV2aXNpb24oKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubGFzdE9wZW5Nb2R1bGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhc3RPcGVuTW9kdWxlLmdldEJyZWFrcG9pbnRQb3NpdGlvbnNGcm9tRWRpdG9yKCk7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdE9wZW5Nb2R1bGUuZmlsZS50ZXh0ID0gdGhpcy5sYXN0T3Blbk1vZHVsZS5nZXRQcm9ncmFtVGV4dEZyb21Nb25hY29Nb2RlbCgpOyAvLyB0aGlzLm1haW4ubW9uYWNvLmdldFZhbHVlKCk7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdE9wZW5Nb2R1bGUuZWRpdG9yU3RhdGUgPSB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkuc2F2ZVZpZXdTdGF0ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG0gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkuc2V0TW9kZWwobW9uYWNvLmVkaXRvci5jcmVhdGVNb2RlbChcIktlaW5lIERhdGVpIHZvcmhhbmRlbi5cIiwgXCJ0ZXh0XCIpKTtcclxuICAgICAgICAgICAgdGhpcy5tYWluLmdldE1vbmFjb0VkaXRvcigpLnVwZGF0ZU9wdGlvbnMoeyByZWFkT25seTogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgdGhpcy5maWxlTGlzdFBhbmVsLnNldENhcHRpb24oJ0tlaW5lIERhdGVpIHZvcmhhbmRlbicpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5nZXRNb25hY29FZGl0b3IoKS51cGRhdGVPcHRpb25zKHsgcmVhZE9ubHk6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkuc2V0TW9kZWwobS5tb2RlbCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm1haW4uZ2V0Qm90dG9tRGl2KCkgIT0gbnVsbCkgdGhpcy5tYWluLmdldEJvdHRvbURpdigpLmVycm9yTWFuYWdlci5zaG93UGFyZW50aGVzaXNXYXJuaW5nKG0uYnJhY2tldEVycm9yKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChtLmZpbGUudGV4dF9iZWZvcmVfcmV2aXNpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluLmJvdHRvbURpdi5ob21ld29ya01hbmFnZXIuc2hvd0hvbWVXb3JrUmV2aXNpb25CdXR0b24oKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5ib3R0b21EaXYuaG9tZXdvcmtNYW5hZ2VyLmhpZGVIb21ld29ya1JldmlzaW9uQnV0dG9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRBY3RpdmVBZnRlckV4dGVybmFsTW9kZWxTZXQobTogTW9kdWxlKSB7XHJcbiAgICAgICAgdGhpcy5maWxlTGlzdFBhbmVsLnNlbGVjdChtLCBmYWxzZSk7XHJcblxyXG4gICAgICAgIHRoaXMubGFzdE9wZW5Nb2R1bGUgPSBtO1xyXG5cclxuICAgICAgICBpZiAobS5lZGl0b3JTdGF0ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5lZGl0b3IuZG9udFB1c2hOZXh0Q3Vyc29yTW92ZSsrO1xyXG4gICAgICAgICAgICB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkucmVzdG9yZVZpZXdTdGF0ZShtLmVkaXRvclN0YXRlKTtcclxuICAgICAgICAgICAgdGhpcy5tYWluLmVkaXRvci5kb250UHVzaE5leHRDdXJzb3JNb3ZlLS07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtLnJlbmRlckJyZWFrcG9pbnREZWNvcmF0b3JzKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKG0pO1xyXG5cclxuICAgICAgICB0aGlzLnNob3dQcm9ncmFtUG9pbnRlcigpO1xyXG5cclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkuZ2V0T3B0aW9ucygpLmdldChtb25hY28uZWRpdG9yLkVkaXRvck9wdGlvbi5yZWFkT25seSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5nZXRNb25hY29FZGl0b3IoKS5mb2N1cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMzAwKTtcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHByaXZhdGUgc2hvd1Byb2dyYW1Qb2ludGVyKCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5wcm9ncmFtUG9pbnRlck1vZHVsZSA9PSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpICYmIHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgcG9zaXRpb24gPSB0aGlzLnByb2dyYW1Qb2ludGVyUG9zaXRpb247XHJcbiAgICAgICAgICAgIGxldCByYW5nZSA9IHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0Q29sdW1uOiBwb3NpdGlvbi5jb2x1bW4sIHN0YXJ0TGluZU51bWJlcjogcG9zaXRpb24ubGluZSxcclxuICAgICAgICAgICAgICAgIGVuZENvbHVtbjogcG9zaXRpb24uY29sdW1uICsgcG9zaXRpb24ubGVuZ3RoLCBlbmRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkucmV2ZWFsUmFuZ2VJbkNlbnRlcklmT3V0c2lkZVZpZXdwb3J0KHJhbmdlKTtcclxuICAgICAgICAgICAgdGhpcy5wcm9ncmFtUG9pbnRlckRlY29yYXRpb24gPSB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkuZGVsdGFEZWNvcmF0aW9ucyh0aGlzLnByb2dyYW1Qb2ludGVyRGVjb3JhdGlvbiwgW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiByYW5nZSxcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2pvX3JldmVhbFByb2dyYW1Qb2ludGVyJywgaXNXaG9sZUxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJ2aWV3UnVsZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiBcIiM2ZmQ2MWJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBtb25hY28uZWRpdG9yLk92ZXJ2aWV3UnVsZXJMYW5lLkNlbnRlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5pbWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogXCIjNmZkNjFiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbW9uYWNvLmVkaXRvci5NaW5pbWFwUG9zaXRpb24uSW5saW5lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiByYW5nZSxcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiB7IGJlZm9yZUNvbnRlbnRDbGFzc05hbWU6ICdqb19yZXZlYWxQcm9ncmFtUG9pbnRlckJlZm9yZScgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNob3dQcm9ncmFtUG9pbnRlclBvc2l0aW9uKGZpbGU6IEZpbGUsIHBvc2l0aW9uOiBUZXh0UG9zaXRpb24pIHtcclxuXHJcbiAgICAgICAgLy8gY29uc29sZSBzdGF0ZW1lbnQgZXhlY3V0aW9uOlxyXG4gICAgICAgIGlmIChmaWxlID09IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG1vZHVsZSA9IHRoaXMubWFpbi5jdXJyZW50V29ya3NwYWNlLm1vZHVsZVN0b3JlLmZpbmRNb2R1bGVCeUZpbGUoZmlsZSk7XHJcbiAgICAgICAgaWYgKG1vZHVsZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucHJvZ3JhbVBvaW50ZXJNb2R1bGUgPSBtb2R1bGU7XHJcbiAgICAgICAgdGhpcy5wcm9ncmFtUG9pbnRlclBvc2l0aW9uID0gcG9zaXRpb247XHJcblxyXG4gICAgICAgIGlmIChtb2R1bGUgIT0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKSkge1xyXG4gICAgICAgICAgICB0aGlzLnNldE1vZHVsZUFjdGl2ZShtb2R1bGUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvd1Byb2dyYW1Qb2ludGVyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBoaWRlUHJvZ3JhbVBvaW50ZXJQb3NpdGlvbigpIHtcclxuICAgICAgICBpZiAodGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKSA9PSB0aGlzLnByb2dyYW1Qb2ludGVyTW9kdWxlKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5nZXRNb25hY29FZGl0b3IoKS5kZWx0YURlY29yYXRpb25zKHRoaXMucHJvZ3JhbVBvaW50ZXJEZWNvcmF0aW9uLCBbXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMucHJvZ3JhbVBvaW50ZXJNb2R1bGUgPSBudWxsO1xyXG4gICAgICAgIHRoaXMucHJvZ3JhbVBvaW50ZXJEZWNvcmF0aW9uID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q3VycmVudGx5RWRpdGVkTW9kdWxlKCk6IE1vZHVsZSB7XHJcbiAgICAgICAgbGV0IHdzID0gdGhpcy5tYWluLmN1cnJlbnRXb3Jrc3BhY2U7XHJcbiAgICAgICAgaWYgKHdzID09IG51bGwpIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICByZXR1cm4gd3MuY3VycmVudGx5T3Blbk1vZHVsZTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUobTogTW9kdWxlKSB7XHJcbiAgICAgICAgaWYgKG0gPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgIGxldCB3cyA9IHRoaXMubWFpbi5jdXJyZW50V29ya3NwYWNlO1xyXG4gICAgICAgIGlmICh3cy5jdXJyZW50bHlPcGVuTW9kdWxlICE9IG0pIHtcclxuICAgICAgICAgICAgd3MuY3VycmVudGx5T3Blbk1vZHVsZSA9IG07XHJcbiAgICAgICAgICAgIHdzLnNhdmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIG0uZmlsZS5kaXJ0eSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldEV4cGxvcmVyQ29sb3IoY29sb3I6IHN0cmluZykge1xyXG4gICAgICAgIGxldCBjYXB0aW9uOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIGlmIChjb2xvciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNvbG9yID0gXCJ0cmFuc3BhcmVudFwiO1xyXG4gICAgICAgICAgICBjYXB0aW9uID0gXCJNZWluZSBXT1JLU1BBQ0VTXCI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FwdGlvbiA9IFwiU2Now7xsZXItV1NcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZmlsZUxpc3RQYW5lbC4kbGlzdEVsZW1lbnQucGFyZW50KCkuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgY29sb3IpO1xyXG4gICAgICAgIHRoaXMud29ya3NwYWNlTGlzdFBhbmVsLiRsaXN0RWxlbWVudC5wYXJlbnQoKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCBjb2xvcik7XHJcblxyXG4gICAgICAgIHRoaXMud29ya3NwYWNlTGlzdFBhbmVsLnNldENhcHRpb24oY2FwdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV3TW9kdWxlKGZpbGU6IEZpbGUpOiBNb2R1bGUge1xyXG4gICAgICAgIHJldHVybiBuZXcgTW9kdWxlKGZpbGUsIHRoaXMubWFpbik7XHJcbiAgICB9XHJcblxyXG59Il19