import { ajax, PerformanceCollector } from "./AjaxHelper.js";
import { NotifierClient } from "./NotifierClient.js";
import { CacheManager } from "../tools/database/CacheManager.js";
export class NetworkManager {
    constructor(main, $updateTimerDiv) {
        this.main = main;
        this.$updateTimerDiv = $updateTimerDiv;
        // sqlIdeURL = "http://localhost:6500/servlet/";
        this.sqlIdeURL = "https://www.sql-ide.de/servlet/";
        this.ownUpdateFrequencyInSeconds = 25;
        this.teacherUpdateFrequencyInSeconds = 5;
        this.updateFrequencyInSeconds = 25;
        this.forcedUpdateEvery = 25;
        this.forcedUpdatesInARow = 0;
        this.secondsTillNextUpdate = this.updateFrequencyInSeconds;
        this.errorHappened = false;
    }
    initializeTimer() {
        let that = this;
        this.$updateTimerDiv.find('svg').attr('width', that.updateFrequencyInSeconds);
        if (this.interval != null)
            clearInterval(this.interval);
        this.counterTillForcedUpdate = this.forcedUpdateEvery;
        this.interval = setInterval(() => {
            if (that.main.user == null)
                return; // don't call server if no user is logged in
            that.secondsTillNextUpdate--;
            if (that.secondsTillNextUpdate < 0) {
                that.secondsTillNextUpdate = that.updateFrequencyInSeconds;
                that.counterTillForcedUpdate--;
                let doForceUpdate = that.counterTillForcedUpdate == 0;
                if (doForceUpdate) {
                    this.forcedUpdatesInARow++;
                    that.counterTillForcedUpdate = this.forcedUpdateEvery;
                    if (this.forcedUpdatesInARow > 50) {
                        that.counterTillForcedUpdate = this.forcedUpdateEvery * 10;
                    }
                }
                that.sendUpdates(() => { }, doForceUpdate, false);
            }
            let $rect = this.$updateTimerDiv.find('.jo_updateTimerRect');
            $rect.attr('width', that.secondsTillNextUpdate + "px");
            if (that.errorHappened) {
                $rect.css('fill', '#c00000');
                this.$updateTimerDiv.attr('title', "Fehler beim letzten Speichervorgang -> Werd's wieder versuchen");
            }
            else {
                $rect.css('fill', '#008000');
                this.$updateTimerDiv.attr('title', that.secondsTillNextUpdate + " Sekunden bis zum nächsten Speichern");
            }
            PerformanceCollector.sendDataToServer();
        }, 1000);
    }
    initializeNotifierClient() {
        this.notifierClient = new NotifierClient(this.main, this);
    }
    sendUpdates(callback, sendIfNothingIsDirty = false, sendBeacon = false) {
        var _a, _b;
        if (this.main.user == null || this.main.user.is_testuser) {
            if (callback != null)
                callback();
            return;
        }
        this.main.projectExplorer.writeEditorTextToFile();
        let classDiagram = (_a = this.main.rightDiv) === null || _a === void 0 ? void 0 : _a.classDiagram;
        let userSettings = this.main.user.settings;
        if ((classDiagram === null || classDiagram === void 0 ? void 0 : classDiagram.dirty) || this.main.userDataDirty) {
            this.main.userDataDirty = false;
            userSettings.classDiagram = classDiagram === null || classDiagram === void 0 ? void 0 : classDiagram.serialize();
            this.sendUpdateUserSettings(() => { }, sendBeacon);
            this.forcedUpdatesInARow = 0;
        }
        classDiagram.dirty = false;
        let wdList = [];
        let fdList = [];
        for (let ws of this.main.workspaceList) {
            if (!ws.saved) {
                wdList.push(ws.getWorkspaceData(false));
                ws.saved = true;
                this.forcedUpdatesInARow = 0;
            }
            for (let m of ws.moduleStore.getModules(false)) {
                if (!m.file.saved) {
                    this.forcedUpdatesInARow = 0;
                    m.file.text = m.getProgramTextFromMonacoModel();
                    fdList.push(m.getFileData(ws));
                    // console.log("Save file " + m.file.name);
                    m.file.saved = true;
                }
            }
        }
        let request = {
            workspacesWithoutFiles: wdList,
            files: fdList,
            owner_id: this.main.workspacesOwnerId,
            userId: this.main.user.id,
            language: 0,
            currentWorkspaceId: (_b = this.main.currentWorkspace) === null || _b === void 0 ? void 0 : _b.id,
            getModifiedWorkspaces: sendIfNothingIsDirty
        };
        let that = this;
        if (wdList.length > 0 || fdList.length > 0 || sendIfNothingIsDirty || this.errorHappened) {
            if (sendBeacon) {
                navigator.sendBeacon("sendUpdates", JSON.stringify(request));
            }
            else {
                ajax('sendUpdates', request, (response) => {
                    that.errorHappened = !response.success;
                    if (!that.errorHappened) {
                        // if (this.main.workspacesOwnerId == this.main.user.id) {
                        if (response.workspaces != null) {
                            that.updateWorkspaces(request, response);
                        }
                        if (response.filesToForceUpdate != null) {
                            that.updateFiles(response.filesToForceUpdate);
                        }
                        if (callback != null) {
                            callback();
                            return;
                        }
                        // }
                    }
                    else {
                        let message = "Fehler beim Senden der Daten: ";
                        if (response["message"])
                            message += response["message"];
                        console.log(message);
                    }
                }, (message) => {
                    that.errorHappened = true;
                    console.log("Fehler beim Ajax-call: " + message);
                });
            }
        }
        else {
            if (callback != null) {
                callback();
                return;
            }
        }
    }
    sendCreateWorkspace(w, owner_id, callback) {
        if (this.main.user.is_testuser) {
            w.id = Math.round(Math.random() * 10000000);
            callback(null);
            return;
        }
        let wd = w.getWorkspaceData(false);
        let request = {
            type: "create",
            entity: "workspace",
            data: wd,
            owner_id: owner_id,
            userId: this.main.user.id
        };
        ajax("createOrDeleteFileOrWorkspace", request, (response) => {
            w.id = response.id;
            callback(null);
        }, callback);
    }
    sendCreateFile(m, ws, owner_id, callback) {
        if (this.main.user.is_testuser) {
            m.file.id = Math.round(Math.random() * 10000000);
            callback(null);
            return;
        }
        let fd = m.getFileData(ws);
        let request = {
            type: "create",
            entity: "file",
            data: fd,
            owner_id: owner_id,
            userId: this.main.user.id
        };
        ajax("createOrDeleteFileOrWorkspace", request, (response) => {
            m.file.id = response.id;
            callback(null);
        }, callback);
    }
    sendDuplicateWorkspace(ws, callback) {
        if (this.main.user.is_testuser) {
            callback("Diese Aktion ist für den Testuser nicht möglich.", null);
            return;
        }
        let request = {
            workspace_id: ws.id,
            language: 0
        };
        ajax("duplicateWorkspace", request, (response) => {
            callback(response.message, response.workspace);
        }, callback);
    }
    sendDistributeWorkspace(ws, klasse, student_ids, callback) {
        if (this.main.user.is_testuser) {
            callback("Diese Aktion ist für den Testuser nicht möglich.");
            return;
        }
        this.sendUpdates(() => {
            let request = {
                workspace_id: ws.id,
                class_id: klasse === null || klasse === void 0 ? void 0 : klasse.id,
                student_ids: student_ids,
                language: 0
            };
            ajax("distributeWorkspace", request, (response) => {
                callback(response.message);
            }, callback);
        }, false);
    }
    sendSetSecret(repositoryId, read, write, callback) {
        let request = { repository_id: repositoryId, newSecretRead: read, newSecretWrite: write };
        ajax("setRepositorySecret", request, (response) => {
            callback(response);
        }, (message) => { alert(message); });
    }
    sendCreateRepository(ws, publish_to, repoName, repoDescription, callback) {
        if (this.main.user.is_testuser) {
            callback("Diese Aktion ist für den Testuser nicht möglich.");
            return;
        }
        this.sendUpdates(() => {
            let request = {
                workspace_id: ws.id,
                publish_to: publish_to,
                name: repoName,
                description: repoDescription
            };
            ajax("createRepository", request, (response) => {
                ws.moduleStore.getModules(false).forEach(m => {
                    m.file.is_copy_of_id = m.file.id;
                    m.file.repository_file_version = 1;
                });
                ws.repository_id = response.repository_id;
                ws.has_write_permission_to_repository = true;
                callback(response.message, response.repository_id);
            }, callback);
        }, true);
    }
    sendDeleteWorkspaceOrFile(type, id, callback) {
        if (this.main.user.is_testuser) {
            callback(null);
            return;
        }
        let request = {
            type: "delete",
            entity: type,
            id: id,
            userId: this.main.user.id
        };
        ajax("createOrDeleteFileOrWorkspace", request, (response) => {
            if (response.success) {
                callback(null);
            }
            else {
                callback("Netzwerkfehler!");
            }
        }, callback);
    }
    sendUpdateUserSettings(callback, sendBeacon = false) {
        if (this.main.user.is_testuser) {
            callback(null);
            return;
        }
        let request = {
            settings: this.main.user.settings,
            userId: this.main.user.id
        };
        if (sendBeacon) {
            navigator.sendBeacon("updateUserSettings", JSON.stringify(request));
        }
        else {
            ajax("updateUserSettings", request, (response) => {
                if (response.success) {
                    callback(null);
                }
                else {
                    callback("Netzwerkfehler!");
                }
            }, callback);
        }
    }
    updateWorkspaces(sendUpdatesRequest, sendUpdatesResponse) {
        let idToRemoteWorkspaceDataMap = new Map();
        let fileIdsSended = [];
        sendUpdatesRequest.files.forEach(file => fileIdsSended.push(file.id));
        sendUpdatesResponse.workspaces.workspaces.forEach(wd => idToRemoteWorkspaceDataMap.set(wd.id, wd));
        let newWorkspaceNames = [];
        for (let remoteWorkspace of sendUpdatesResponse.workspaces.workspaces) {
            let localWorkspaces = this.main.workspaceList.filter(ws => ws.id == remoteWorkspace.id);
            // Did student get a workspace from his/her teacher?
            if (localWorkspaces.length == 0) {
                newWorkspaceNames.push(remoteWorkspace.name);
                this.createNewWorkspaceFromWorkspaceData(remoteWorkspace);
            }
        }
        for (let workspace of this.main.workspaceList) {
            let remoteWorkspace = idToRemoteWorkspaceDataMap.get(workspace.id);
            if (remoteWorkspace != null) {
                let idToRemoteFileDataMap = new Map();
                remoteWorkspace.files.forEach(fd => idToRemoteFileDataMap.set(fd.id, fd));
                let idToModuleMap = new Map();
                // update/delete files if necessary
                for (let module of workspace.moduleStore.getModules(false)) {
                    let fileId = module.file.id;
                    idToModuleMap.set(fileId, module);
                    let remoteFileData = idToRemoteFileDataMap.get(fileId);
                    if (remoteFileData == null) {
                        this.main.projectExplorer.fileListPanel.removeElement(module);
                        this.main.currentWorkspace.moduleStore.removeModule(module);
                    }
                    else if (fileIdsSended.indexOf(fileId) < 0 && module.file.text != remoteFileData.text) {
                        module.file.text = remoteFileData.text;
                        module.model.setValue(remoteFileData.text);
                        module.file.saved = true;
                        module.lastSavedVersionId = module.model.getAlternativeVersionId();
                    }
                    module.file.version = remoteFileData.version;
                }
                // add files if necessary
                for (let remoteFile of remoteWorkspace.files) {
                    if (idToModuleMap.get(remoteFile.id) == null) {
                        this.createFile(workspace, remoteFile);
                    }
                }
            }
        }
        if (newWorkspaceNames.length > 0) {
            let message = newWorkspaceNames.length > 1 ? "Folgende Workspaces hat Deine Lehrkraft Dir gesendet: " : "Folgenden Workspace hat Deine Lehrkraft Dir gesendet: ";
            message += newWorkspaceNames.join(", ");
            alert(message);
        }
        this.main.projectExplorer.workspaceListPanel.sortElements();
        this.main.projectExplorer.fileListPanel.sortElements();
    }
    updateFiles(filesFromServer) {
        let fileIdToLocalModuleMap = new Map();
        for (let workspace of this.main.workspaceList) {
            for (let module of workspace.moduleStore.getModules(false)) {
                fileIdToLocalModuleMap[module.file.id] = module;
            }
        }
        for (let remoteFile of filesFromServer) {
            let module = fileIdToLocalModuleMap[remoteFile.id];
            if (module != null && module.file.text != remoteFile.text) {
                module.file.text = remoteFile.text;
                module.model.setValue(remoteFile.text);
                module.file.saved = true;
                module.lastSavedVersionId = module.model.getAlternativeVersionId();
                module.file.version = remoteFile.version;
            }
        }
    }
    createNewWorkspaceFromWorkspaceData(remoteWorkspace, withSort = false) {
        let w = this.main.createNewWorkspace(remoteWorkspace.name, remoteWorkspace.owner_id);
        w.id = remoteWorkspace.id;
        w.repository_id = remoteWorkspace.repository_id;
        w.has_write_permission_to_repository = remoteWorkspace.has_write_permission_to_repository;
        w.path = remoteWorkspace.path;
        w.isFolder = remoteWorkspace.isFolder;
        w.moduleStore.dirty = true;
        if (remoteWorkspace.settings != null && remoteWorkspace.settings.startsWith("{")) {
            let remoteWorkspaceSettings = JSON.parse(remoteWorkspace.settings);
            w.settings = remoteWorkspaceSettings;
            w.moduleStore.setAdditionalLibraries(remoteWorkspaceSettings.libraries);
        }
        this.main.workspaceList.push(w);
        let path = remoteWorkspace.path.split("/");
        if (path.length == 1 && path[0] == "")
            path = [];
        let panelElement = {
            name: remoteWorkspace.name,
            externalElement: w,
            iconClass: remoteWorkspace.repository_id == null ? "workspace" : "repository",
            isFolder: remoteWorkspace.isFolder,
            path: path
        };
        this.main.projectExplorer.workspaceListPanel.addElement(panelElement, true);
        w.panelElement = panelElement;
        if (w.repository_id != null) {
            w.renderSynchronizeButton(panelElement);
        }
        for (let fileData of remoteWorkspace.files) {
            this.createFile(w, fileData);
        }
        if (withSort) {
            this.main.projectExplorer.workspaceListPanel.sortElements();
            this.main.projectExplorer.fileListPanel.sortElements();
        }
        return w;
    }
    createFile(workspace, remoteFile) {
        let ae = null; //AccordionElement
        if (workspace == this.main.currentWorkspace) {
            ae = {
                name: remoteFile.name,
                externalElement: null
            };
            this.main.projectExplorer.fileListPanel.addElement(ae, true);
        }
        let f = {
            id: remoteFile.id,
            name: remoteFile.name,
            dirty: true,
            saved: true,
            text: remoteFile.text,
            version: remoteFile.version,
            is_copy_of_id: remoteFile.is_copy_of_id,
            repository_file_version: remoteFile.repository_file_version,
            identical_to_repository_version: true,
            workspace_id: workspace.id,
            panelElement: ae
        };
        let m = this.main.projectExplorer.getNewModule(f); //new Module(f, this.main);
        if (ae != null)
            ae.externalElement = m;
        let modulStore = workspace.moduleStore;
        modulStore.putModule(m);
    }
    fetchDatabaseAndToken(code, callback) {
        let request = { code: code };
        ajax("obtainSqlToken", request, (response) => {
            if (response.success) {
                this.fetchDatabase(response.token, (database, error) => {
                    callback(database, response.token, error);
                });
            }
            else {
                callback(null, null, response.message);
            }
        }, (errormessage) => {
            callback(null, null, errormessage);
        });
    }
    fetchDatabase(token, callback) {
        let cacheManager = new CacheManager();
        let request = {
            token: token
        };
        ajax(this.sqlIdeURL + "jGetDatabase", request, (response) => {
            if (response.success) {
                let database = response.database;
                cacheManager.fetchTemplateFromCache(database.based_on_template_id, (templateDump) => {
                    if (templateDump != null) {
                        //@ts-ignore
                        database.templateDump = pako.inflate(templateDump);
                        callback(database, null);
                        return;
                    }
                    else {
                        if (database.based_on_template_id == null) {
                            callback(database, null);
                            return;
                        }
                        this.fetchTemplate(token, (template) => {
                            if (template != null) {
                                cacheManager.saveTemplateToCache(database.based_on_template_id, template);
                                // @ts-ignore
                                database.templateDump = pako.inflate(template);
                                callback(database, null);
                                return;
                            }
                            else {
                                callback(null, "Konnte das Template nicht laden.");
                                return;
                            }
                        });
                    }
                });
            }
            else {
                callback(null, "Netzwerkfehler!");
            }
        });
    }
    fetchTemplate(token, callback) {
        let request = {
            token: token
        };
        $.ajax({
            type: 'POST',
            async: true,
            data: JSON.stringify(request),
            contentType: 'application/json',
            url: this.sqlIdeURL + "jGetTemplate",
            xhrFields: { responseType: 'arraybuffer' },
            success: function (response) {
                callback(new Uint8Array(response));
            },
            error: function (jqXHR, message) {
                alert("Konnte das Template nicht laden.");
                callback(null);
            }
        });
    }
    addDatabaseStatement(token, version_before, statements, callback) {
        let request = {
            token: token,
            version_before: version_before,
            statements: statements
        };
        ajax(this.sqlIdeURL + "jAddDatabaseStatement", request, (response) => {
            callback(response.statements_before, response.new_version, response.message);
        }, (message) => { callback([], 0, message); });
    }
    rollbackDatabaseStatement(token, current_version, callback) {
        let request = {
            token: token,
            current_version: current_version
        };
        ajax(this.sqlIdeURL + "jRollbackDatabaseStatement", request, (response) => {
            callback(response.message);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTmV0d29ya01hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50L2NvbW11bmljYXRpb24vTmV0d29ya01hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBTTdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFakUsTUFBTSxPQUFPLGNBQWM7SUF1QnZCLFlBQW9CLElBQVUsRUFBVSxlQUFvQztRQUF4RCxTQUFJLEdBQUosSUFBSSxDQUFNO1FBQVUsb0JBQWUsR0FBZixlQUFlLENBQXFCO1FBckI1RSxnREFBZ0Q7UUFDaEQsY0FBUyxHQUFHLGlDQUFpQyxDQUFDO1FBSTlDLGdDQUEyQixHQUFXLEVBQUUsQ0FBQztRQUN6QyxvQ0FBK0IsR0FBVyxDQUFDLENBQUM7UUFFNUMsNkJBQXdCLEdBQVcsRUFBRSxDQUFDO1FBQ3RDLHNCQUFpQixHQUFXLEVBQUUsQ0FBQztRQUMvQix3QkFBbUIsR0FBVyxDQUFDLENBQUM7UUFFaEMsMEJBQXFCLEdBQVcsSUFBSSxDQUFDLHdCQUF3QixDQUFDO1FBQzlELGtCQUFhLEdBQVksS0FBSyxDQUFDO0lBVS9CLENBQUM7SUFFRCxlQUFlO1FBRVgsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFFOUUsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUk7WUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXhELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMs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Q29udGVudCI6WyJpbXBvcnQgeyBNYWluIH0gZnJvbSBcIi4uL21haW4vTWFpbi5qc1wiO1xyXG5pbXBvcnQgeyBhamF4LCBQZXJmb3JtYW5jZUNvbGxlY3RvciB9IGZyb20gXCIuL0FqYXhIZWxwZXIuanNcIjtcclxuaW1wb3J0IHsgV29ya3NwYWNlRGF0YSwgRmlsZURhdGEsIFNlbmRVcGRhdGVzUmVxdWVzdCwgU2VuZFVwZGF0ZXNSZXNwb25zZSwgQ3JlYXRlT3JEZWxldGVGaWxlT3JXb3Jrc3BhY2VSZXF1ZXN0LCBDUlVEUmVzcG9uc2UsIFVwZGF0ZVVzZXJTZXR0aW5nc1JlcXVlc3QsIFVwZGF0ZVVzZXJTZXR0aW5nc1Jlc3BvbnNlLCBEdXBsaWNhdGVXb3Jrc3BhY2VSZXF1ZXN0LCBEdXBsaWNhdGVXb3Jrc3BhY2VSZXNwb25zZSwgQ2xhc3NEYXRhLCBEaXN0cmlidXRlV29ya3NwYWNlUmVxdWVzdCwgRGlzdHJpYnV0ZVdvcmtzcGFjZVJlc3BvbnNlLCBDb2xsZWN0UGVyZm9ybWFuY2VEYXRhUmVxdWVzdCwgU2V0UmVwb3NpdG9yeVNlY3JldFJlcXVlc3QsIFNldFJlcG9zaXRvcnlTZWNyZXRSZXNwb25zZSwgR2V0RGF0YWJhc2VSZXF1ZXN0LCBnZXREYXRhYmFzZVJlc3BvbnNlLCBEYXRhYmFzZURhdGEsIEdldFRlbXBsYXRlUmVxdWVzdCwgT2J0YWluU3FsVG9rZW5SZXF1ZXN0LCBPYnRhaW5TcWxUb2tlblJlc3BvbnNlLCBKQWRkU3RhdGVtZW50UmVxdWVzdCwgSkFkZFN0YXRlbWVudFJlc3BvbnNlLCBKUm9sbGJhY2tTdGF0ZW1lbnRSZXF1ZXN0LCBKUm9sbGJhY2tTdGF0ZW1lbnRSZXNwb25zZSB9IGZyb20gXCIuL0RhdGEuanNcIjtcclxuaW1wb3J0IHsgV29ya3NwYWNlIH0gZnJvbSBcIi4uL3dvcmtzcGFjZS9Xb3Jrc3BhY2UuanNcIjtcclxuaW1wb3J0IHsgTW9kdWxlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3BhcnNlci9Nb2R1bGUuanNcIjtcclxuaW1wb3J0IHsgQWNjb3JkaW9uRWxlbWVudCwgQWNjb3JkaW9uUGFuZWwgfSBmcm9tIFwiLi4vbWFpbi9ndWkvQWNjb3JkaW9uLmpzXCI7XHJcbmltcG9ydCB7V29ya3NwYWNlU2V0dGluZ3MgfSBmcm9tIFwiLi4vY29tbXVuaWNhdGlvbi9EYXRhLmpzXCI7XHJcbmltcG9ydCB7IE5vdGlmaWVyQ2xpZW50IH0gZnJvbSBcIi4vTm90aWZpZXJDbGllbnQuanNcIjtcclxuaW1wb3J0IHsgQ2FjaGVNYW5hZ2VyIH0gZnJvbSBcIi4uL3Rvb2xzL2RhdGFiYXNlL0NhY2hlTWFuYWdlci5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIE5ldHdvcmtNYW5hZ2VyIHtcclxuXHJcbiAgICAvLyBzcWxJZGVVUkwgPSBcImh0dHA6Ly9sb2NhbGhvc3Q6NjUwMC9zZXJ2bGV0L1wiO1xyXG4gICAgc3FsSWRlVVJMID0gXCJodHRwczovL3d3dy5zcWwtaWRlLmRlL3NlcnZsZXQvXCI7XHJcblxyXG4gICAgdGltZXJoYW5kbGU6IGFueTtcclxuXHJcbiAgICBvd25VcGRhdGVGcmVxdWVuY3lJblNlY29uZHM6IG51bWJlciA9IDI1O1xyXG4gICAgdGVhY2hlclVwZGF0ZUZyZXF1ZW5jeUluU2Vjb25kczogbnVtYmVyID0gNTtcclxuXHJcbiAgICB1cGRhdGVGcmVxdWVuY3lJblNlY29uZHM6IG51bWJlciA9IDI1O1xyXG4gICAgZm9yY2VkVXBkYXRlRXZlcnk6IG51bWJlciA9IDI1O1xyXG4gICAgZm9yY2VkVXBkYXRlc0luQVJvdzogbnVtYmVyID0gMDtcclxuXHJcbiAgICBzZWNvbmRzVGlsbE5leHRVcGRhdGU6IG51bWJlciA9IHRoaXMudXBkYXRlRnJlcXVlbmN5SW5TZWNvbmRzO1xyXG4gICAgZXJyb3JIYXBwZW5lZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgIGludGVydmFsOiBhbnk7XHJcblxyXG4gICAgY291bnRlclRpbGxGb3JjZWRVcGRhdGU6IG51bWJlcjtcclxuXHJcbiAgICBub3RpZmllckNsaWVudDogTm90aWZpZXJDbGllbnQ7XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBtYWluOiBNYWluLCBwcml2YXRlICR1cGRhdGVUaW1lckRpdjogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpbml0aWFsaXplVGltZXIoKSB7XHJcblxyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLiR1cGRhdGVUaW1lckRpdi5maW5kKCdzdmcnKS5hdHRyKCd3aWR0aCcsIHRoYXQudXBkYXRlRnJlcXVlbmN5SW5TZWNvbmRzKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW50ZXJ2YWwgIT0gbnVsbCkgY2xlYXJJbnRlcnZhbCh0aGlzLmludGVydmFsKTtcclxuXHJcbiAgICAgICAgdGhpcy5jb3VudGVyVGlsbEZvcmNlZFVwZGF0ZSA9IHRoaXMuZm9yY2VkVXBkYXRlRXZlcnk7XHJcblxyXG4gICAgICAgIHRoaXMuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhhdC5tYWluLnVzZXIgPT0gbnVsbCkgcmV0dXJuOyAvLyBkb24ndCBjYWxsIHNlcnZlciBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpblxyXG5cclxuICAgICAgICAgICAgdGhhdC5zZWNvbmRzVGlsbE5leHRVcGRhdGUtLTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGF0LnNlY29uZHNUaWxsTmV4dFVwZGF0ZSA8IDApIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuc2Vjb25kc1RpbGxOZXh0VXBkYXRlID0gdGhhdC51cGRhdGVGcmVxdWVuY3lJblNlY29uZHM7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmNvdW50ZXJUaWxsRm9yY2VkVXBkYXRlLS07XHJcbiAgICAgICAgICAgICAgICBsZXQgZG9Gb3JjZVVwZGF0ZSA9IHRoYXQuY291bnRlclRpbGxGb3JjZWRVcGRhdGUgPT0gMDtcclxuICAgICAgICAgICAgICAgIGlmIChkb0ZvcmNlVXBkYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JjZWRVcGRhdGVzSW5BUm93Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jb3VudGVyVGlsbEZvcmNlZFVwZGF0ZSA9IHRoaXMuZm9yY2VkVXBkYXRlRXZlcnk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZm9yY2VkVXBkYXRlc0luQVJvdyA+IDUwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuY291bnRlclRpbGxGb3JjZWRVcGRhdGUgPSB0aGlzLmZvcmNlZFVwZGF0ZUV2ZXJ5ICogMTA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICB0aGF0LnNlbmRVcGRhdGVzKCgpID0+IHsgfSwgZG9Gb3JjZVVwZGF0ZSwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0ICRyZWN0ID0gdGhpcy4kdXBkYXRlVGltZXJEaXYuZmluZCgnLmpvX3VwZGF0ZVRpbWVyUmVjdCcpO1xyXG5cclxuICAgICAgICAgICAgJHJlY3QuYXR0cignd2lkdGgnLCB0aGF0LnNlY29uZHNUaWxsTmV4dFVwZGF0ZSArIFwicHhcIik7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhhdC5lcnJvckhhcHBlbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAkcmVjdC5jc3MoJ2ZpbGwnLCAnI2MwMDAwMCcpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kdXBkYXRlVGltZXJEaXYuYXR0cigndGl0bGUnLCBcIkZlaGxlciBiZWltIGxldHp0ZW4gU3BlaWNoZXJ2b3JnYW5nIC0+IFdlcmQncyB3aWVkZXIgdmVyc3VjaGVuXCIpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgJHJlY3QuY3NzKCdmaWxsJywgJyMwMDgwMDAnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHVwZGF0ZVRpbWVyRGl2LmF0dHIoJ3RpdGxlJywgdGhhdC5zZWNvbmRzVGlsbE5leHRVcGRhdGUgKyBcIiBTZWt1bmRlbiBiaXMgenVtIG7DpGNoc3RlbiBTcGVpY2hlcm5cIik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIFBlcmZvcm1hbmNlQ29sbGVjdG9yLnNlbmREYXRhVG9TZXJ2ZXIoKTtcclxuXHJcbiAgICAgICAgfSwgMTAwMCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGluaXRpYWxpemVOb3RpZmllckNsaWVudCgpe1xyXG4gICAgICAgIHRoaXMubm90aWZpZXJDbGllbnQgPSBuZXcgTm90aWZpZXJDbGllbnQodGhpcy5tYWluLCB0aGlzKTtcclxuICAgIH1cclxuXHJcbiAgICBzZW5kVXBkYXRlcyhjYWxsYmFjaz86ICgpID0+IHZvaWQsIHNlbmRJZk5vdGhpbmdJc0RpcnR5OiBib29sZWFuID0gZmFsc2UsIHNlbmRCZWFjb246IGJvb2xlYW4gPSBmYWxzZSkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5tYWluLnVzZXIgPT0gbnVsbCB8fCB0aGlzLm1haW4udXNlci5pc190ZXN0dXNlcikge1xyXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkgY2FsbGJhY2soKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYWluLnByb2plY3RFeHBsb3Jlci53cml0ZUVkaXRvclRleHRUb0ZpbGUoKTtcclxuXHJcbiAgICAgICAgbGV0IGNsYXNzRGlhZ3JhbSA9IHRoaXMubWFpbi5yaWdodERpdj8uY2xhc3NEaWFncmFtO1xyXG4gICAgICAgIGxldCB1c2VyU2V0dGluZ3MgPSB0aGlzLm1haW4udXNlci5zZXR0aW5ncztcclxuXHJcbiAgICAgICAgaWYgKGNsYXNzRGlhZ3JhbT8uZGlydHkgfHwgdGhpcy5tYWluLnVzZXJEYXRhRGlydHkpIHtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubWFpbi51c2VyRGF0YURpcnR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHVzZXJTZXR0aW5ncy5jbGFzc0RpYWdyYW0gPSBjbGFzc0RpYWdyYW0/LnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnNlbmRVcGRhdGVVc2VyU2V0dGluZ3MoKCkgPT4geyB9LCBzZW5kQmVhY29uKTtcclxuICAgICAgICAgICAgdGhpcy5mb3JjZWRVcGRhdGVzSW5BUm93ID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNsYXNzRGlhZ3JhbS5kaXJ0eSA9IGZhbHNlO1xyXG5cclxuICAgICAgICBsZXQgd2RMaXN0OiBXb3Jrc3BhY2VEYXRhW10gPSBbXTtcclxuICAgICAgICBsZXQgZmRMaXN0OiBGaWxlRGF0YVtdID0gW107XHJcblxyXG4gICAgICAgIGZvciAobGV0IHdzIG9mIHRoaXMubWFpbi53b3Jrc3BhY2VMaXN0KSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXdzLnNhdmVkKSB7XHJcbiAgICAgICAgICAgICAgICB3ZExpc3QucHVzaCh3cy5nZXRXb3Jrc3BhY2VEYXRhKGZhbHNlKSk7XHJcbiAgICAgICAgICAgICAgICB3cy5zYXZlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZvcmNlZFVwZGF0ZXNJbkFSb3cgPSAwO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBtIG9mIHdzLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIW0uZmlsZS5zYXZlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZm9yY2VkVXBkYXRlc0luQVJvdyA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgbS5maWxlLnRleHQgPSBtLmdldFByb2dyYW1UZXh0RnJvbU1vbmFjb01vZGVsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmRMaXN0LnB1c2gobS5nZXRGaWxlRGF0YSh3cykpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiU2F2ZSBmaWxlIFwiICsgbS5maWxlLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIG0uZmlsZS5zYXZlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBTZW5kVXBkYXRlc1JlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHdvcmtzcGFjZXNXaXRob3V0RmlsZXM6IHdkTGlzdCxcclxuICAgICAgICAgICAgZmlsZXM6IGZkTGlzdCxcclxuICAgICAgICAgICAgb3duZXJfaWQ6IHRoaXMubWFpbi53b3Jrc3BhY2VzT3duZXJJZCxcclxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLm1haW4udXNlci5pZCxcclxuICAgICAgICAgICAgbGFuZ3VhZ2U6IDAsXHJcbiAgICAgICAgICAgIGN1cnJlbnRXb3Jrc3BhY2VJZDogdGhpcy5tYWluLmN1cnJlbnRXb3Jrc3BhY2U/LmlkLFxyXG4gICAgICAgICAgICBnZXRNb2RpZmllZFdvcmtzcGFjZXM6IHNlbmRJZk5vdGhpbmdJc0RpcnR5XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgaWYgKHdkTGlzdC5sZW5ndGggPiAwIHx8IGZkTGlzdC5sZW5ndGggPiAwIHx8IHNlbmRJZk5vdGhpbmdJc0RpcnR5IHx8IHRoaXMuZXJyb3JIYXBwZW5lZCkge1xyXG5cclxuICAgICAgICAgICAgaWYgKHNlbmRCZWFjb24pIHtcclxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5zZW5kQmVhY29uKFwic2VuZFVwZGF0ZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVxdWVzdCkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgICAgIGFqYXgoJ3NlbmRVcGRhdGVzJywgcmVxdWVzdCwgKHJlc3BvbnNlOiBTZW5kVXBkYXRlc1Jlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5lcnJvckhhcHBlbmVkID0gIXJlc3BvbnNlLnN1Y2Nlc3M7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGF0LmVycm9ySGFwcGVuZWQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmICh0aGlzLm1haW4ud29ya3NwYWNlc093bmVySWQgPT0gdGhpcy5tYWluLnVzZXIuaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS53b3Jrc3BhY2VzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnVwZGF0ZVdvcmtzcGFjZXMocmVxdWVzdCwgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmZpbGVzVG9Gb3JjZVVwZGF0ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC51cGRhdGVGaWxlcyhyZXNwb25zZS5maWxlc1RvRm9yY2VVcGRhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZTogc3RyaW5nID0gXCJGZWhsZXIgYmVpbSBTZW5kZW4gZGVyIERhdGVuOiBcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYocmVzcG9uc2VbXCJtZXNzYWdlXCJdKSBtZXNzYWdlICs9IHJlc3BvbnNlW1wibWVzc2FnZVwiXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgKG1lc3NhZ2U6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZXJyb3JIYXBwZW5lZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGZWhsZXIgYmVpbSBBamF4LWNhbGw6IFwiICsgbWVzc2FnZSlcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2VuZENyZWF0ZVdvcmtzcGFjZSh3OiBXb3Jrc3BhY2UsIG93bmVyX2lkOiBudW1iZXIsIGNhbGxiYWNrOiAoZXJyb3I6IHN0cmluZykgPT4gdm9pZCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5tYWluLnVzZXIuaXNfdGVzdHVzZXIpIHtcclxuICAgICAgICAgICAgdy5pZCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwKTtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB3ZDogV29ya3NwYWNlRGF0YSA9IHcuZ2V0V29ya3NwYWNlRGF0YShmYWxzZSk7XHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IENyZWF0ZU9yRGVsZXRlRmlsZU9yV29ya3NwYWNlUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgdHlwZTogXCJjcmVhdGVcIixcclxuICAgICAgICAgICAgZW50aXR5OiBcIndvcmtzcGFjZVwiLFxyXG4gICAgICAgICAgICBkYXRhOiB3ZCxcclxuICAgICAgICAgICAgb3duZXJfaWQ6IG93bmVyX2lkLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMubWFpbi51c2VyLmlkXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhamF4KFwiY3JlYXRlT3JEZWxldGVGaWxlT3JXb3Jrc3BhY2VcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBDUlVEUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgdy5pZCA9IHJlc3BvbnNlLmlkO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcclxuICAgICAgICB9LCBjYWxsYmFjayk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNlbmRDcmVhdGVGaWxlKG06IE1vZHVsZSwgd3M6IFdvcmtzcGFjZSwgb3duZXJfaWQ6IG51bWJlciwgY2FsbGJhY2s6IChlcnJvcjogc3RyaW5nKSA9PiB2b2lkKSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1haW4udXNlci5pc190ZXN0dXNlcikge1xyXG4gICAgICAgICAgICBtLmZpbGUuaWQgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCk7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgbGV0IGZkOiBGaWxlRGF0YSA9IG0uZ2V0RmlsZURhdGEod3MpO1xyXG4gICAgICAgIGxldCByZXF1ZXN0OiBDcmVhdGVPckRlbGV0ZUZpbGVPcldvcmtzcGFjZVJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFwiY3JlYXRlXCIsXHJcbiAgICAgICAgICAgIGVudGl0eTogXCJmaWxlXCIsXHJcbiAgICAgICAgICAgIGRhdGE6IGZkLFxyXG4gICAgICAgICAgICBvd25lcl9pZDogb3duZXJfaWQsXHJcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5tYWluLnVzZXIuaWRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFqYXgoXCJjcmVhdGVPckRlbGV0ZUZpbGVPcldvcmtzcGFjZVwiLCByZXF1ZXN0LCAocmVzcG9uc2U6IENSVURSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICBtLmZpbGUuaWQgPSByZXNwb25zZS5pZDtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XHJcbiAgICAgICAgfSwgY2FsbGJhY2spO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZW5kRHVwbGljYXRlV29ya3NwYWNlKHdzOiBXb3Jrc3BhY2UsIGNhbGxiYWNrOiAoZXJyb3I6IHN0cmluZywgd29ya3NwYWNlRGF0YT86IFdvcmtzcGFjZURhdGEpID0+IHZvaWQpIHtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubWFpbi51c2VyLmlzX3Rlc3R1c2VyKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKFwiRGllc2UgQWt0aW9uIGlzdCBmw7xyIGRlbiBUZXN0dXNlciBuaWNodCBtw7ZnbGljaC5cIiwgbnVsbCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsZXQgcmVxdWVzdDogRHVwbGljYXRlV29ya3NwYWNlUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgd29ya3NwYWNlX2lkOiB3cy5pZCxcclxuICAgICAgICAgICAgbGFuZ3VhZ2U6IDBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFqYXgoXCJkdXBsaWNhdGVXb3Jrc3BhY2VcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBEdXBsaWNhdGVXb3Jrc3BhY2VSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlLCByZXNwb25zZS53b3Jrc3BhY2UpXHJcbiAgICAgICAgfSwgY2FsbGJhY2spO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZW5kRGlzdHJpYnV0ZVdvcmtzcGFjZSh3czogV29ya3NwYWNlLCBrbGFzc2U6IENsYXNzRGF0YSwgc3R1ZGVudF9pZHM6IG51bWJlcltdLCBjYWxsYmFjazogKGVycm9yOiBzdHJpbmcpID0+IHZvaWQpIHtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubWFpbi51c2VyLmlzX3Rlc3R1c2VyKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKFwiRGllc2UgQWt0aW9uIGlzdCBmw7xyIGRlbiBUZXN0dXNlciBuaWNodCBtw7ZnbGljaC5cIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLnNlbmRVcGRhdGVzKCgpID0+IHtcclxuXHJcbiAgICAgICAgICAgIGxldCByZXF1ZXN0OiBEaXN0cmlidXRlV29ya3NwYWNlUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgICAgIHdvcmtzcGFjZV9pZDogd3MuaWQsXHJcbiAgICAgICAgICAgICAgICBjbGFzc19pZDoga2xhc3NlPy5pZCxcclxuICAgICAgICAgICAgICAgIHN0dWRlbnRfaWRzOiBzdHVkZW50X2lkcyxcclxuICAgICAgICAgICAgICAgIGxhbmd1YWdlOiAwXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGFqYXgoXCJkaXN0cmlidXRlV29ya3NwYWNlXCIsIHJlcXVlc3QsIChyZXNwb25zZTogRGlzdHJpYnV0ZVdvcmtzcGFjZVJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlKVxyXG4gICAgICAgICAgICB9LCBjYWxsYmFjayk7XHJcblxyXG4gICAgICAgIH0sIGZhbHNlKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2VuZFNldFNlY3JldChyZXBvc2l0b3J5SWQ6IG51bWJlciwgcmVhZDogYm9vbGVhbiwgd3JpdGU6IGJvb2xlYW4sIGNhbGxiYWNrOiAocmVzcG9uc2U6IFNldFJlcG9zaXRvcnlTZWNyZXRSZXNwb25zZSkgPT4gdm9pZCl7XHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IFNldFJlcG9zaXRvcnlTZWNyZXRSZXF1ZXN0ID0ge3JlcG9zaXRvcnlfaWQ6IHJlcG9zaXRvcnlJZCwgbmV3U2VjcmV0UmVhZDogcmVhZCwgbmV3U2VjcmV0V3JpdGU6IHdyaXRlfTtcclxuXHJcbiAgICAgICAgYWpheChcInNldFJlcG9zaXRvcnlTZWNyZXRcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBTZXRSZXBvc2l0b3J5U2VjcmV0UmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpXHJcbiAgICAgICAgfSwgKG1lc3NhZ2UpID0+IHthbGVydChtZXNzYWdlKX0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZW5kQ3JlYXRlUmVwb3NpdG9yeSh3czogV29ya3NwYWNlLCBwdWJsaXNoX3RvOiBudW1iZXIsIHJlcG9OYW1lOiBzdHJpbmcsIHJlcG9EZXNjcmlwdGlvbjogc3RyaW5nLCBjYWxsYmFjazogKGVycm9yOiBzdHJpbmcsIHJlcG9zaXRvcnlfaWQ/OiBudW1iZXIpID0+IHZvaWQpIHtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubWFpbi51c2VyLmlzX3Rlc3R1c2VyKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKFwiRGllc2UgQWt0aW9uIGlzdCBmw7xyIGRlbiBUZXN0dXNlciBuaWNodCBtw7ZnbGljaC5cIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLnNlbmRVcGRhdGVzKCgpID0+IHtcclxuXHJcbiAgICAgICAgICAgIGxldCByZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICAgICAgd29ya3NwYWNlX2lkOiB3cy5pZCxcclxuICAgICAgICAgICAgICAgIHB1Ymxpc2hfdG86IHB1Ymxpc2hfdG8sXHJcbiAgICAgICAgICAgICAgICBuYW1lOiByZXBvTmFtZSxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiByZXBvRGVzY3JpcHRpb25cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgYWpheChcImNyZWF0ZVJlcG9zaXRvcnlcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiB7IHN1Y2Nlc3M6IGJvb2xlYW4sIG1lc3NhZ2U/OiBzdHJpbmcsIHJlcG9zaXRvcnlfaWQ/OiBudW1iZXIgfSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgd3MubW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSkuZm9yRWFjaChtID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBtLmZpbGUuaXNfY29weV9vZl9pZCA9IG0uZmlsZS5pZDtcclxuICAgICAgICAgICAgICAgICAgICBtLmZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb24gPSAxO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIHdzLnJlcG9zaXRvcnlfaWQgPSByZXNwb25zZS5yZXBvc2l0b3J5X2lkO1xyXG4gICAgICAgICAgICAgICAgd3MuaGFzX3dyaXRlX3Blcm1pc3Npb25fdG9fcmVwb3NpdG9yeSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlLCByZXNwb25zZS5yZXBvc2l0b3J5X2lkKVxyXG4gICAgICAgICAgICB9LCBjYWxsYmFjayk7XHJcblxyXG4gICAgICAgIH0sIHRydWUpO1xyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2VuZERlbGV0ZVdvcmtzcGFjZU9yRmlsZSh0eXBlOiBcIndvcmtzcGFjZVwiIHwgXCJmaWxlXCIsIGlkOiBudW1iZXIsIGNhbGxiYWNrOiAoZXJyb3I6IHN0cmluZykgPT4gdm9pZCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5tYWluLnVzZXIuaXNfdGVzdHVzZXIpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsZXQgcmVxdWVzdDogQ3JlYXRlT3JEZWxldGVGaWxlT3JXb3Jrc3BhY2VSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBcImRlbGV0ZVwiLFxyXG4gICAgICAgICAgICBlbnRpdHk6IHR5cGUsXHJcbiAgICAgICAgICAgIGlkOiBpZCxcclxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLm1haW4udXNlci5pZFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWpheChcImNyZWF0ZU9yRGVsZXRlRmlsZU9yV29ya3NwYWNlXCIsIHJlcXVlc3QsIChyZXNwb25zZTogQ1JVRFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKFwiTmV0endlcmtmZWhsZXIhXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgY2FsbGJhY2spO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZW5kVXBkYXRlVXNlclNldHRpbmdzKGNhbGxiYWNrOiAoZXJyb3I6IHN0cmluZykgPT4gdm9pZCwgc2VuZEJlYWNvbjogYm9vbGVhbiA9IGZhbHNlKSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1haW4udXNlci5pc190ZXN0dXNlcikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IFVwZGF0ZVVzZXJTZXR0aW5nc1JlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHNldHRpbmdzOiB0aGlzLm1haW4udXNlci5zZXR0aW5ncyxcclxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLm1haW4udXNlci5pZFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNlbmRCZWFjb24pIHtcclxuICAgICAgICAgICAgbmF2aWdhdG9yLnNlbmRCZWFjb24oXCJ1cGRhdGVVc2VyU2V0dGluZ3NcIiwgSlNPTi5zdHJpbmdpZnkocmVxdWVzdCkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGFqYXgoXCJ1cGRhdGVVc2VyU2V0dGluZ3NcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBVcGRhdGVVc2VyU2V0dGluZ3NSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soXCJOZXR6d2Vya2ZlaGxlciFcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIGNhbGxiYWNrKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVXb3Jrc3BhY2VzKHNlbmRVcGRhdGVzUmVxdWVzdDogU2VuZFVwZGF0ZXNSZXF1ZXN0LCBzZW5kVXBkYXRlc1Jlc3BvbnNlOiBTZW5kVXBkYXRlc1Jlc3BvbnNlKSB7XHJcblxyXG4gICAgICAgIGxldCBpZFRvUmVtb3RlV29ya3NwYWNlRGF0YU1hcDogTWFwPG51bWJlciwgV29ya3NwYWNlRGF0YT4gPSBuZXcgTWFwKCk7XHJcblxyXG4gICAgICAgIGxldCBmaWxlSWRzU2VuZGVkID0gW107XHJcbiAgICAgICAgc2VuZFVwZGF0ZXNSZXF1ZXN0LmZpbGVzLmZvckVhY2goZmlsZSA9PiBmaWxlSWRzU2VuZGVkLnB1c2goZmlsZS5pZCkpO1xyXG5cclxuICAgICAgICBzZW5kVXBkYXRlc1Jlc3BvbnNlLndvcmtzcGFjZXMud29ya3NwYWNlcy5mb3JFYWNoKHdkID0+IGlkVG9SZW1vdGVXb3Jrc3BhY2VEYXRhTWFwLnNldCh3ZC5pZCwgd2QpKTtcclxuXHJcbiAgICAgICAgbGV0IG5ld1dvcmtzcGFjZU5hbWVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCByZW1vdGVXb3Jrc3BhY2Ugb2Ygc2VuZFVwZGF0ZXNSZXNwb25zZS53b3Jrc3BhY2VzLndvcmtzcGFjZXMpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBsb2NhbFdvcmtzcGFjZXMgPSB0aGlzLm1haW4ud29ya3NwYWNlTGlzdC5maWx0ZXIod3MgPT4gd3MuaWQgPT0gcmVtb3RlV29ya3NwYWNlLmlkKTtcclxuXHJcbiAgICAgICAgICAgIC8vIERpZCBzdHVkZW50IGdldCBhIHdvcmtzcGFjZSBmcm9tIGhpcy9oZXIgdGVhY2hlcj9cclxuICAgICAgICAgICAgaWYgKGxvY2FsV29ya3NwYWNlcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgbmV3V29ya3NwYWNlTmFtZXMucHVzaChyZW1vdGVXb3Jrc3BhY2UubmFtZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZU5ld1dvcmtzcGFjZUZyb21Xb3Jrc3BhY2VEYXRhKHJlbW90ZVdvcmtzcGFjZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIGZvciAobGV0IHdvcmtzcGFjZSBvZiB0aGlzLm1haW4ud29ya3NwYWNlTGlzdCkge1xyXG4gICAgICAgICAgICBsZXQgcmVtb3RlV29ya3NwYWNlOiBXb3Jrc3BhY2VEYXRhID0gaWRUb1JlbW90ZVdvcmtzcGFjZURhdGFNYXAuZ2V0KHdvcmtzcGFjZS5pZCk7XHJcbiAgICAgICAgICAgIGlmIChyZW1vdGVXb3Jrc3BhY2UgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGlkVG9SZW1vdGVGaWxlRGF0YU1hcDogTWFwPG51bWJlciwgRmlsZURhdGE+ID0gbmV3IE1hcCgpO1xyXG4gICAgICAgICAgICAgICAgcmVtb3RlV29ya3NwYWNlLmZpbGVzLmZvckVhY2goZmQgPT4gaWRUb1JlbW90ZUZpbGVEYXRhTWFwLnNldChmZC5pZCwgZmQpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaWRUb01vZHVsZU1hcDogTWFwPG51bWJlciwgTW9kdWxlPiA9IG5ldyBNYXAoKTtcclxuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZS9kZWxldGUgZmlsZXMgaWYgbmVjZXNzYXJ5XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBtb2R1bGUgb2Ygd29ya3NwYWNlLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpbGVJZCA9IG1vZHVsZS5maWxlLmlkO1xyXG4gICAgICAgICAgICAgICAgICAgIGlkVG9Nb2R1bGVNYXAuc2V0KGZpbGVJZCwgbW9kdWxlKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcmVtb3RlRmlsZURhdGEgPSBpZFRvUmVtb3RlRmlsZURhdGFNYXAuZ2V0KGZpbGVJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbW90ZUZpbGVEYXRhID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWluLnByb2plY3RFeHBsb3Jlci5maWxlTGlzdFBhbmVsLnJlbW92ZUVsZW1lbnQobW9kdWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWluLmN1cnJlbnRXb3Jrc3BhY2UubW9kdWxlU3RvcmUucmVtb3ZlTW9kdWxlKG1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChmaWxlSWRzU2VuZGVkLmluZGV4T2YoZmlsZUlkKSA8IDAgJiYgbW9kdWxlLmZpbGUudGV4dCAhPSByZW1vdGVGaWxlRGF0YS50ZXh0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZS5maWxlLnRleHQgPSByZW1vdGVGaWxlRGF0YS50ZXh0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGUubW9kZWwuc2V0VmFsdWUocmVtb3RlRmlsZURhdGEudGV4dCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGUuZmlsZS5zYXZlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZS5sYXN0U2F2ZWRWZXJzaW9uSWQgPSBtb2R1bGUubW9kZWwuZ2V0QWx0ZXJuYXRpdmVWZXJzaW9uSWQoKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBtb2R1bGUuZmlsZS52ZXJzaW9uID0gcmVtb3RlRmlsZURhdGEudmVyc2lvbjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWRkIGZpbGVzIGlmIG5lY2Vzc2FyeVxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgcmVtb3RlRmlsZSBvZiByZW1vdGVXb3Jrc3BhY2UuZmlsZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaWRUb01vZHVsZU1hcC5nZXQocmVtb3RlRmlsZS5pZCkgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZUZpbGUod29ya3NwYWNlLCByZW1vdGVGaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChuZXdXb3Jrc3BhY2VOYW1lcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGxldCBtZXNzYWdlOiBzdHJpbmcgPSBuZXdXb3Jrc3BhY2VOYW1lcy5sZW5ndGggPiAxID8gXCJGb2xnZW5kZSBXb3Jrc3BhY2VzIGhhdCBEZWluZSBMZWhya3JhZnQgRGlyIGdlc2VuZGV0OiBcIiA6IFwiRm9sZ2VuZGVuIFdvcmtzcGFjZSBoYXQgRGVpbmUgTGVocmtyYWZ0IERpciBnZXNlbmRldDogXCI7XHJcbiAgICAgICAgICAgIG1lc3NhZ2UgKz0gbmV3V29ya3NwYWNlTmFtZXMuam9pbihcIiwgXCIpO1xyXG4gICAgICAgICAgICBhbGVydChtZXNzYWdlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFpbi5wcm9qZWN0RXhwbG9yZXIud29ya3NwYWNlTGlzdFBhbmVsLnNvcnRFbGVtZW50cygpO1xyXG4gICAgICAgIHRoaXMubWFpbi5wcm9qZWN0RXhwbG9yZXIuZmlsZUxpc3RQYW5lbC5zb3J0RWxlbWVudHMoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVGaWxlcyhmaWxlc0Zyb21TZXJ2ZXI6IEZpbGVEYXRhW10pIHtcclxuICAgICAgICBsZXQgZmlsZUlkVG9Mb2NhbE1vZHVsZU1hcDogTWFwPG51bWJlciwgTW9kdWxlPiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgd29ya3NwYWNlIG9mIHRoaXMubWFpbi53b3Jrc3BhY2VMaXN0KSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG1vZHVsZSBvZiB3b3Jrc3BhY2UubW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSkpIHtcclxuICAgICAgICAgICAgICAgIGZpbGVJZFRvTG9jYWxNb2R1bGVNYXBbbW9kdWxlLmZpbGUuaWRdID0gbW9kdWxlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCByZW1vdGVGaWxlIG9mIGZpbGVzRnJvbVNlcnZlcikge1xyXG4gICAgICAgICAgICBsZXQgbW9kdWxlID0gZmlsZUlkVG9Mb2NhbE1vZHVsZU1hcFtyZW1vdGVGaWxlLmlkXTtcclxuICAgICAgICAgICAgaWYgKG1vZHVsZSAhPSBudWxsICYmIG1vZHVsZS5maWxlLnRleHQgIT0gcmVtb3RlRmlsZS50ZXh0KSB7XHJcbiAgICAgICAgICAgICAgICBtb2R1bGUuZmlsZS50ZXh0ID0gcmVtb3RlRmlsZS50ZXh0O1xyXG4gICAgICAgICAgICAgICAgbW9kdWxlLm1vZGVsLnNldFZhbHVlKHJlbW90ZUZpbGUudGV4dCk7XHJcbiAgICAgICAgICAgICAgICBtb2R1bGUuZmlsZS5zYXZlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBtb2R1bGUubGFzdFNhdmVkVmVyc2lvbklkID0gbW9kdWxlLm1vZGVsLmdldEFsdGVybmF0aXZlVmVyc2lvbklkKClcclxuICAgICAgICAgICAgICAgIG1vZHVsZS5maWxlLnZlcnNpb24gPSByZW1vdGVGaWxlLnZlcnNpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNyZWF0ZU5ld1dvcmtzcGFjZUZyb21Xb3Jrc3BhY2VEYXRhKHJlbW90ZVdvcmtzcGFjZTogV29ya3NwYWNlRGF0YSwgd2l0aFNvcnQ6IGJvb2xlYW4gPSBmYWxzZSk6IFdvcmtzcGFjZSB7XHJcbiAgICAgICAgbGV0IHcgPSB0aGlzLm1haW4uY3JlYXRlTmV3V29ya3NwYWNlKHJlbW90ZVdvcmtzcGFjZS5uYW1lLCByZW1vdGVXb3Jrc3BhY2Uub3duZXJfaWQpO1xyXG4gICAgICAgIHcuaWQgPSByZW1vdGVXb3Jrc3BhY2UuaWQ7XHJcbiAgICAgICAgdy5yZXBvc2l0b3J5X2lkID0gcmVtb3RlV29ya3NwYWNlLnJlcG9zaXRvcnlfaWQ7XHJcbiAgICAgICAgdy5oYXNfd3JpdGVfcGVybWlzc2lvbl90b19yZXBvc2l0b3J5ID0gcmVtb3RlV29ya3NwYWNlLmhhc193cml0ZV9wZXJtaXNzaW9uX3RvX3JlcG9zaXRvcnk7XHJcbiAgICAgICAgdy5wYXRoID0gcmVtb3RlV29ya3NwYWNlLnBhdGg7XHJcbiAgICAgICAgdy5pc0ZvbGRlciA9IHJlbW90ZVdvcmtzcGFjZS5pc0ZvbGRlcjtcclxuICAgICAgICB3Lm1vZHVsZVN0b3JlLmRpcnR5ID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgaWYocmVtb3RlV29ya3NwYWNlLnNldHRpbmdzICE9IG51bGwgJiYgcmVtb3RlV29ya3NwYWNlLnNldHRpbmdzLnN0YXJ0c1dpdGgoXCJ7XCIpKXtcclxuICAgICAgICAgICAgbGV0IHJlbW90ZVdvcmtzcGFjZVNldHRpbmdzOldvcmtzcGFjZVNldHRpbmdzID0gSlNPTi5wYXJzZShyZW1vdGVXb3Jrc3BhY2Uuc2V0dGluZ3MpO1xyXG4gICAgICAgICAgICB3LnNldHRpbmdzID0gcmVtb3RlV29ya3NwYWNlU2V0dGluZ3M7XHJcbiAgICAgICAgICAgIHcubW9kdWxlU3RvcmUuc2V0QWRkaXRpb25hbExpYnJhcmllcyhyZW1vdGVXb3Jrc3BhY2VTZXR0aW5ncy5saWJyYXJpZXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYWluLndvcmtzcGFjZUxpc3QucHVzaCh3KTtcclxuICAgICAgICBsZXQgcGF0aCA9IHJlbW90ZVdvcmtzcGFjZS5wYXRoLnNwbGl0KFwiL1wiKTtcclxuICAgICAgICBpZiAocGF0aC5sZW5ndGggPT0gMSAmJiBwYXRoWzBdID09IFwiXCIpIHBhdGggPSBbXTtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgcGFuZWxFbGVtZW50OiBBY2NvcmRpb25FbGVtZW50ID0ge1xyXG4gICAgICAgICAgICBuYW1lOiByZW1vdGVXb3Jrc3BhY2UubmFtZSxcclxuICAgICAgICAgICAgZXh0ZXJuYWxFbGVtZW50OiB3LFxyXG4gICAgICAgICAgICBpY29uQ2xhc3M6IHJlbW90ZVdvcmtzcGFjZS5yZXBvc2l0b3J5X2lkID09IG51bGwgPyBcIndvcmtzcGFjZVwiIDogXCJyZXBvc2l0b3J5XCIsXHJcbiAgICAgICAgICAgIGlzRm9sZGVyOiByZW1vdGVXb3Jrc3BhY2UuaXNGb2xkZXIsXHJcbiAgICAgICAgICAgIHBhdGg6IHBhdGhcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLm1haW4ucHJvamVjdEV4cGxvcmVyLndvcmtzcGFjZUxpc3RQYW5lbC5hZGRFbGVtZW50KHBhbmVsRWxlbWVudCwgdHJ1ZSk7XHJcbiAgICAgICAgdy5wYW5lbEVsZW1lbnQgPSBwYW5lbEVsZW1lbnQ7XHJcblxyXG4gICAgICAgIGlmKHcucmVwb3NpdG9yeV9pZCAhPSBudWxsKXtcclxuICAgICAgICAgICAgdy5yZW5kZXJTeW5jaHJvbml6ZUJ1dHRvbihwYW5lbEVsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgZmlsZURhdGEgb2YgcmVtb3RlV29ya3NwYWNlLmZpbGVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlRmlsZSh3LCBmaWxlRGF0YSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAod2l0aFNvcnQpIHtcclxuICAgICAgICAgICAgdGhpcy5tYWluLnByb2plY3RFeHBsb3Jlci53b3Jrc3BhY2VMaXN0UGFuZWwuc29ydEVsZW1lbnRzKCk7XHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5wcm9qZWN0RXhwbG9yZXIuZmlsZUxpc3RQYW5lbC5zb3J0RWxlbWVudHMoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHc7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjcmVhdGVGaWxlKHdvcmtzcGFjZTogV29ya3NwYWNlLCByZW1vdGVGaWxlOiBGaWxlRGF0YSkge1xyXG4gICAgICAgIGxldCBhZTogYW55ID0gbnVsbDsgLy9BY2NvcmRpb25FbGVtZW50XHJcbiAgICAgICAgaWYgKHdvcmtzcGFjZSA9PSB0aGlzLm1haW4uY3VycmVudFdvcmtzcGFjZSkge1xyXG4gICAgICAgICAgICBhZSA9IHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IHJlbW90ZUZpbGUubmFtZSxcclxuICAgICAgICAgICAgICAgIGV4dGVybmFsRWxlbWVudDogbnVsbFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1haW4ucHJvamVjdEV4cGxvcmVyLmZpbGVMaXN0UGFuZWwuYWRkRWxlbWVudChhZSwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZjogYW55ID0geyAvLyBGaWxlXHJcbiAgICAgICAgICAgIGlkOiByZW1vdGVGaWxlLmlkLFxyXG4gICAgICAgICAgICBuYW1lOiByZW1vdGVGaWxlLm5hbWUsXHJcbiAgICAgICAgICAgIGRpcnR5OiB0cnVlLFxyXG4gICAgICAgICAgICBzYXZlZDogdHJ1ZSxcclxuICAgICAgICAgICAgdGV4dDogcmVtb3RlRmlsZS50ZXh0LFxyXG4gICAgICAgICAgICB2ZXJzaW9uOiByZW1vdGVGaWxlLnZlcnNpb24sXHJcbiAgICAgICAgICAgIGlzX2NvcHlfb2ZfaWQ6IHJlbW90ZUZpbGUuaXNfY29weV9vZl9pZCxcclxuICAgICAgICAgICAgcmVwb3NpdG9yeV9maWxlX3ZlcnNpb246IHJlbW90ZUZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb24sXHJcbiAgICAgICAgICAgIGlkZW50aWNhbF90b19yZXBvc2l0b3J5X3ZlcnNpb246IHRydWUsXHJcbiAgICAgICAgICAgIHdvcmtzcGFjZV9pZDogd29ya3NwYWNlLmlkLFxyXG4gICAgICAgICAgICBwYW5lbEVsZW1lbnQ6IGFlXHJcbiAgICAgICAgfTtcclxuICAgICAgICBsZXQgbSA9IHRoaXMubWFpbi5wcm9qZWN0RXhwbG9yZXIuZ2V0TmV3TW9kdWxlKGYpOyAvL25ldyBNb2R1bGUoZiwgdGhpcy5tYWluKTtcclxuICAgICAgICBpZiAoYWUgIT0gbnVsbCkgYWUuZXh0ZXJuYWxFbGVtZW50ID0gbTtcclxuICAgICAgICBsZXQgbW9kdWxTdG9yZSA9IHdvcmtzcGFjZS5tb2R1bGVTdG9yZTtcclxuICAgICAgICBtb2R1bFN0b3JlLnB1dE1vZHVsZShtKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZmV0Y2hEYXRhYmFzZUFuZFRva2VuKGNvZGU6IHN0cmluZywgY2FsbGJhY2s6KGRhdGFiYXNlOiBEYXRhYmFzZURhdGEsIHRva2VuOiBzdHJpbmcsIGVycm9yOiBzdHJpbmcpID0+IHZvaWQpe1xyXG4gICAgICAgIGxldCByZXF1ZXN0OiBPYnRhaW5TcWxUb2tlblJlcXVlc3QgPSB7Y29kZTogY29kZX07XHJcblxyXG4gICAgICAgIGFqYXgoXCJvYnRhaW5TcWxUb2tlblwiLCByZXF1ZXN0LCAocmVzcG9uc2U6IE9idGFpblNxbFRva2VuUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2hEYXRhYmFzZShyZXNwb25zZS50b2tlbiwgKGRhdGFiYXNlLCBlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGRhdGFiYXNlLCByZXNwb25zZS50b2tlbiwgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSkgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBudWxsLCByZXNwb25zZS5tZXNzYWdlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIChlcnJvcm1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgbnVsbCwgZXJyb3JtZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmV0Y2hEYXRhYmFzZSh0b2tlbjogc3RyaW5nLCBjYWxsYmFjazogKGRhdGFiYXNlOiBEYXRhYmFzZURhdGEsIGVycm9yOiBzdHJpbmcpID0+IHZvaWQpIHtcclxuXHJcbiAgICAgICAgbGV0IGNhY2hlTWFuYWdlcjogQ2FjaGVNYW5hZ2VyID0gbmV3IENhY2hlTWFuYWdlcigpO1xyXG5cclxuICAgICAgICBsZXQgcmVxdWVzdDogR2V0RGF0YWJhc2VSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICB0b2tlbjogdG9rZW5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFqYXgodGhpcy5zcWxJZGVVUkwgKyAgXCJqR2V0RGF0YWJhc2VcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBnZXREYXRhYmFzZVJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGRhdGFiYXNlID0gcmVzcG9uc2UuZGF0YWJhc2U7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNhY2hlTWFuYWdlci5mZXRjaFRlbXBsYXRlRnJvbUNhY2hlKGRhdGFiYXNlLmJhc2VkX29uX3RlbXBsYXRlX2lkLCAodGVtcGxhdGVEdW1wOiBVaW50OEFycmF5KSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZUR1bXAgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YWJhc2UudGVtcGxhdGVEdW1wID0gcGFrby5pbmZsYXRlKHRlbXBsYXRlRHVtcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGRhdGFiYXNlLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhYmFzZS5iYXNlZF9vbl90ZW1wbGF0ZV9pZCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhkYXRhYmFzZSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZldGNoVGVtcGxhdGUodG9rZW4sICh0ZW1wbGF0ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWNoZU1hbmFnZXIuc2F2ZVRlbXBsYXRlVG9DYWNoZShkYXRhYmFzZS5iYXNlZF9vbl90ZW1wbGF0ZV9pZCwgdGVtcGxhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhYmFzZS50ZW1wbGF0ZUR1bXAgPSBwYWtvLmluZmxhdGUodGVtcGxhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGRhdGFiYXNlLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIFwiS29ubnRlIGRhcyBUZW1wbGF0ZSBuaWNodCBsYWRlbi5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBcIk5ldHp3ZXJrZmVobGVyIVwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHByaXZhdGUgZmV0Y2hUZW1wbGF0ZSh0b2tlbjogc3RyaW5nLCBjYWxsYmFjazogKHRlbXBsYXRlOiBVaW50OEFycmF5KSA9PiB2b2lkKSB7XHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IEdldFRlbXBsYXRlUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgdG9rZW46IHRva2VuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICB0eXBlOiAnUE9TVCcsXHJcbiAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShyZXF1ZXN0KSxcclxuICAgICAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgdXJsOiB0aGlzLnNxbElkZVVSTCArIFwiakdldFRlbXBsYXRlXCIsXHJcbiAgICAgICAgICAgIHhockZpZWxkczogeyByZXNwb25zZVR5cGU6ICdhcnJheWJ1ZmZlcicgfSxcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3BvbnNlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBVaW50OEFycmF5KHJlc3BvbnNlKSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbiAoanFYSFIsIG1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgIGFsZXJ0KFwiS29ubnRlIGRhcyBUZW1wbGF0ZSBuaWNodCBsYWRlbi5cIik7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYWRkRGF0YWJhc2VTdGF0ZW1lbnQodG9rZW46IHN0cmluZywgdmVyc2lvbl9iZWZvcmU6IG51bWJlciwgc3RhdGVtZW50czogc3RyaW5nW10sIFxyXG4gICAgICAgIGNhbGxiYWNrOiAoc3RhdGVtZW50c0JlZm9yZTogc3RyaW5nW10sIG5ld192ZXJzaW9uOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl7XHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBKQWRkU3RhdGVtZW50UmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgdG9rZW46IHRva2VuLFxyXG4gICAgICAgICAgICB2ZXJzaW9uX2JlZm9yZTogdmVyc2lvbl9iZWZvcmUsXHJcbiAgICAgICAgICAgIHN0YXRlbWVudHM6IHN0YXRlbWVudHNcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFqYXgodGhpcy5zcWxJZGVVUkwgKyAgXCJqQWRkRGF0YWJhc2VTdGF0ZW1lbnRcIiwgcmVxdWVzdCwgKHJlc3BvbnNlOiBKQWRkU3RhdGVtZW50UmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2Uuc3RhdGVtZW50c19iZWZvcmUsIHJlc3BvbnNlLm5ld192ZXJzaW9uLCByZXNwb25zZS5tZXNzYWdlKTtcclxuICAgICAgICB9LCAobWVzc2FnZSkgPT4ge2NhbGxiYWNrKFtdLCAwLCBtZXNzYWdlKX0pXHJcblxyXG5cclxuICAgIH1cclxuICAgIFxyXG4gICAgcHVibGljIHJvbGxiYWNrRGF0YWJhc2VTdGF0ZW1lbnQodG9rZW46IHN0cmluZywgY3VycmVudF92ZXJzaW9uOiBudW1iZXIsIFxyXG4gICAgICAgIGNhbGxiYWNrOiAobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXtcclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IEpSb2xsYmFja1N0YXRlbWVudFJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHRva2VuOiB0b2tlbixcclxuICAgICAgICAgICAgY3VycmVudF92ZXJzaW9uOiBjdXJyZW50X3ZlcnNpb25cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFqYXgodGhpcy5zcWxJZGVVUkwgKyAgXCJqUm9sbGJhY2tEYXRhYmFzZVN0YXRlbWVudFwiLCByZXF1ZXN0LCAocmVzcG9uc2U6IEpSb2xsYmFja1N0YXRlbWVudFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcblxyXG5cclxuICAgIH1cclxuICAgIFxyXG5cclxuXHJcbn0iXX0=