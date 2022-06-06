import { ajax } from "../../communication/AjaxHelper.js";
import { Module } from "../../compiler/parser/Module.js";
export class SynchroWorkspace {
    constructor(manager) {
        this.manager = manager;
        this.files = [];
        this.isCurrentRepositoryVersion = false;
    }
    hasChanges() {
        for (let file of this.files) {
            if (file.state != "original")
                return true;
        }
        return false;
    }
    isWritable() {
        return this.copiedFromWorkspace != null || (this.isCurrentRepositoryVersion && this.manager.repositoryIsWritable);
    }
    copyFromWorkspace(workspace) {
        this.files = [];
        workspace.moduleStore.getModules(false).forEach(module => {
            let file = module.file;
            if (module.model != null) {
                module.file.text = module.getProgramTextFromMonacoModel();
            }
            this.files.push({
                name: file.name,
                repository_file_version: file.repository_file_version,
                identical_to_repository_version: file.identical_to_repository_version,
                idInsideRepository: file.is_copy_of_id,
                idInsideWorkspace: file.id,
                workspaceFile: file,
                text: file.text.replace(/\r\n/g, "\n"),
                synchroWorkspace: this,
                state: "original",
                markedAsMerged: false,
                originalText: file.text,
                monacoModel: null
            });
        });
        this.name = "Workspace: " + workspace.name;
        this.copiedFromWorkspace = workspace;
        return this;
    }
    copyFromRepository(repository, isCurrentRepositoryVersion) {
        this.isCurrentRepositoryVersion = isCurrentRepositoryVersion;
        this.files = [];
        repository.fileEntries.forEach((fileEntry) => {
            this.files.push({
                name: fileEntry.filename,
                idInsideRepository: fileEntry.id,
                idInsideWorkspace: null,
                workspaceFile: null,
                repository_file_version: fileEntry.version,
                identical_to_repository_version: true,
                text: fileEntry.text.replace(/\r\n/g, "\n"),
                synchroWorkspace: this,
                state: "original",
                markedAsMerged: false,
                monacoModel: null
            });
        });
        this.name = "Repository: " + repository.name + " (V " + repository.version + ")";
        return this;
    }
    copyFromHistoryElement(historyElement) {
        let repo = historyElement.getRepositoryState();
        this.copyFromRepository(repo, false);
        this.name = "History-Version " + repo.version;
        return this;
    }
    commit(workspace, oldRepository, comment, main, callback) {
        let oldIdToFileMap = {};
        let newIdToFileMap = {};
        let newlyVersionedFileIds = [];
        oldRepository.fileEntries.forEach(file => oldIdToFileMap[file.id] = file);
        this.files.forEach(file => {
            if (file.idInsideRepository != null) {
                newIdToFileMap[file.idInsideRepository] = file;
            }
        });
        let repositoryHistoryEntry = {
            comment: comment,
            name: main.user.rufname + " " + main.user.familienname,
            username: main.user.username,
            isIntermediateEntry: false,
            timestamp: new Date().toUTCString(),
            userId: main.user.id,
            version: oldRepository.version + 1,
            historyFiles: []
        };
        for (let file of this.files) {
            if (file.state == "deleted")
                continue;
            let oldFile = oldIdToFileMap[file.idInsideRepository];
            if (oldFile == null) {
                // if file.committedFromFile.
                if (file.idInsideRepository == null) {
                    newlyVersionedFileIds.push(file.committedFromFile.idInsideWorkspace);
                    file.committedFromFile.idInsideRepository = file.committedFromFile.idInsideWorkspace;
                    file.committedFromFile.repository_file_version = 1;
                    file.idInsideRepository = file.committedFromFile.idInsideWorkspace;
                    file.committedFromFile.idInsideRepository = file.committedFromFile.idInsideWorkspace;
                }
                repositoryHistoryEntry.historyFiles.push({
                    id: file.idInsideRepository,
                    type: "create",
                    version: 1,
                    content: file.text,
                    filename: file.name
                });
            }
            else if (oldFile.text != file.text) {
                oldFile.version++;
                let patch = this.getPatch(oldFile.text, file.text);
                if (patch == null) {
                    repositoryHistoryEntry.historyFiles.push({
                        id: oldFile.id,
                        type: "intermediate",
                        version: oldFile.version,
                        content: file.text,
                        filename: file.name
                    });
                }
                else {
                    repositoryHistoryEntry.historyFiles.push({
                        id: oldFile.id,
                        type: "change",
                        version: oldFile.version,
                        content: patch,
                        filename: (oldFile.filename == file.name) ? undefined : file.name
                    });
                }
                let cff = file.committedFromFile;
                if (cff != null) {
                    cff.repository_file_version = oldFile.version;
                    cff.workspaceFile.repository_file_version = oldFile.version;
                    cff.workspaceFile.saved = false;
                }
            }
            else if (oldFile.filename != file.name) {
                repositoryHistoryEntry.historyFiles.push({
                    id: oldFile.id,
                    type: "intermediate",
                    version: oldFile.version,
                    filename: file.name
                });
            }
        }
        for (let oldFile of oldRepository.fileEntries) {
            if (newIdToFileMap[oldFile.id] == null || newIdToFileMap[oldFile.id].state == "deleted") {
                repositoryHistoryEntry.historyFiles.push({
                    id: oldFile.id,
                    type: "delete",
                    version: oldFile.version
                });
            }
        }
        let newFileEntries = this.files.filter(file => file.state != "deleted").map((synchroFile) => {
            return {
                filename: synchroFile.name,
                id: synchroFile.idInsideRepository,
                text: synchroFile.text,
                version: synchroFile.repository_file_version
            };
        });
        let commitFilesRequest = {
            files: newFileEntries,
            repositoryVersionBeforeCommit: oldRepository.version,
            repository_id: oldRepository.id,
            workspace_id: workspace.id,
            repositoryHistoryEntry: repositoryHistoryEntry,
            newlyVersionedFileIds: newlyVersionedFileIds
        };
        let that = this;
        ajax("commitFiles", commitFilesRequest, (cfr) => {
            workspace.moduleStore.getModules(false).map(m => m.file).forEach((file) => {
                if (newlyVersionedFileIds.indexOf(file.id) >= 0) {
                    file.is_copy_of_id = file.id;
                    file.repository_file_version = 1;
                    file.identical_to_repository_version = true;
                    file.saved = false;
                }
            });
            that.manager.currentUserSynchroWorkspace.files.forEach(synchroFile => {
                let workspaceFile = synchroFile.workspaceFile;
                if (workspaceFile != null) {
                    if (synchroFile.text == workspaceFile.text &&
                        (synchroFile.repository_file_version != workspaceFile.repository_file_version || synchroFile.identical_to_repository_version != workspaceFile.identical_to_repository_version)) {
                        workspaceFile.identical_to_repository_version = synchroFile.identical_to_repository_version;
                        workspaceFile.repository_file_version = synchroFile.repository_file_version;
                        workspaceFile.saved = false;
                    }
                }
                if (workspaceFile.is_copy_of_id != null) {
                    synchroFile.idInsideRepository = workspaceFile.is_copy_of_id;
                }
            });
            that.manager.main.networkManager.sendUpdates(() => {
                callback(cfr.repository, null);
            }, true);
        }, (error) => { callback(null, error); });
    }
    getPatch(contentOld, contentNew) {
        //@ts-ignore
        let dmp = new diff_match_patch();
        //@ts-ignore
        let patchObject = dmp.patch_make(contentOld, contentNew);
        let patch = JSON.stringify(patchObject);
        // Test patch and only return it if it is valid!
        let deSerializedPatchObject = JSON.parse(patch);
        let result = dmp.patch_apply(deSerializedPatchObject, contentOld);
        if (result == null || result[0] == null)
            return null;
        if (result[0] == contentNew) {
            return patch;
        }
        else {
            return null;
        }
    }
    writeChangesToWorkspace() {
        let workspace = this.copiedFromWorkspace;
        let oldIdToModuleMap = {};
        let newIdToFileMap = {};
        workspace.moduleStore.getModules(false).forEach(m => {
            if (m.file.is_copy_of_id != null)
                oldIdToModuleMap[m.file.is_copy_of_id] = m;
        });
        this.files.forEach(file => {
            if (file.idInsideWorkspace != null)
                newIdToFileMap[file.idInsideWorkspace] = file;
        });
        let main = this.manager.main;
        for (let module of workspace.moduleStore.getModules(false)) {
            let synchroFile = newIdToFileMap[module.file.id];
            if (synchroFile != null && synchroFile.state != 'deleted') {
                module.file.text = synchroFile.monacoModel.getValue(monaco.editor.EndOfLinePreference.LF, false);
                synchroFile.text = module.file.text;
                module.file.is_copy_of_id = synchroFile.idInsideRepository;
                module.file.repository_file_version = synchroFile.repository_file_version;
                module.model.setValue(synchroFile.text);
                module.file.identical_to_repository_version = synchroFile.identical_to_repository_version;
                module.file.saved = false;
                module.file.dirty = true;
                module.file.name = synchroFile.name;
                if (module.file.panelElement != null) {
                    module.file.panelElement.$htmlFirstLine.find('.jo_filename');
                }
            }
            else {
                main.networkManager.sendDeleteWorkspaceOrFile("file", module.file.id, (error) => {
                    if (error == null) {
                    }
                    else {
                        alert('Der Server ist nicht erreichbar!');
                    }
                });
                this.files.splice(this.files.indexOf(synchroFile), 1);
                workspace.moduleStore.removeModule(module);
                main.projectExplorer.fileListPanel.removeElement(module);
                if (main.currentWorkspace == workspace && main.projectExplorer.getCurrentlyEditedModule() == module) {
                    main.projectExplorer.setModuleActive(null);
                }
            }
        }
        for (let synchroFile of this.files) {
            if (synchroFile.idInsideRepository != null && oldIdToModuleMap[synchroFile.idInsideRepository] == null) {
                let f = {
                    name: synchroFile.name,
                    dirty: true,
                    saved: true,
                    text: synchroFile.text,
                    text_before_revision: null,
                    submitted_date: null,
                    student_edited_after_revision: false,
                    version: 1,
                    is_copy_of_id: synchroFile.idInsideRepository,
                    repository_file_version: synchroFile.repository_file_version,
                    identical_to_repository_version: synchroFile.identical_to_repository_version
                };
                let m = new Module(f, main);
                workspace.moduleStore.putModule(m);
                main.networkManager.sendCreateFile(m, workspace, main.user.id, (error) => {
                    if (error == null) {
                    }
                    else {
                        alert('Der Server ist nicht erreichbar!');
                    }
                });
            }
        }
        main.networkManager.sendUpdates(null, true);
        if (main.currentWorkspace == workspace) {
            let cem = main.getCurrentlyEditedModule();
            main.projectExplorer.setWorkspaceActive(workspace, true);
            // if module hadn't been deleted while synchronizing:
            if (workspace.moduleStore.getModules(false).indexOf(cem) >= 0) {
                main.projectExplorer.setModuleActive(cem);
                main.projectExplorer.fileListPanel.select(cem, false);
            }
        }
        workspace.moduleStore.dirty = true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY2hyb1dvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9jbGllbnQvcmVwb3NpdG9yeS9zeW5jaHJvbml6ZS9TeW5jaHJvV29ya3NwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RCxPQUFPLEVBQVEsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUF5Qi9ELE1BQU0sT0FBTyxnQkFBZ0I7SUFRekIsWUFBb0IsT0FBK0I7UUFBL0IsWUFBTyxHQUFQLE9BQU8sQ0FBd0I7UUFObkQsVUFBSyxHQUFrQixFQUFFLENBQUM7UUFFMUIsK0JBQTBCLEdBQVksS0FBSyxDQUFDO0lBTTVDLENBQUM7SUFFRCxVQUFVO1FBQ04sS0FBSSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFDO1lBQ3ZCLElBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxVQUFVO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1NBQzVDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUdELFVBQVU7UUFDTixPQUFPLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBRSxDQUFDO0lBQ3ZILENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxTQUFvQjtRQUVsQyxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNoQixTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDckQsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztZQUV2QixJQUFJLE1BQU0sQ0FBQyxLQUFLLElBQUksSUFBSSxFQUFFO2dCQUN0QixNQUFNLENBQUMsSUFBSSxDQUFD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QUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV6RCxxREFBcUQ7WUFDckQsSUFBRyxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDO2dCQUN6RCxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUN6RDtTQUVKO1FBRUQsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBRXZDLENBQUM7Q0FFSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJlcG9zaXRvcnkgfSBmcm9tIFwiLi4vLi4vY29tbXVuaWNhdGlvbi9EYXRhLmpzXCI7XHJcbmltcG9ydCB7IE1haW4gfSBmcm9tIFwiLi4vLi4vbWFpbi9NYWluLmpzXCI7XHJcbmltcG9ydCB7IFdvcmtzcGFjZSB9IGZyb20gXCIuLi8uLi93b3Jrc3BhY2UvV29ya3NwYWNlLmpzXCI7XHJcbmltcG9ydCB7IEhpc3RvcnlFbGVtZW50IH0gZnJvbSBcIi4vSGlzdG9yeUVsZW1lbnQuanNcIjtcclxuaW1wb3J0IHsgUmVwb3NpdG9yeUhpc3RvcnlFbnRyeSwgUmVwb3NpdG9yeUZpbGVFbnRyeSwgQ29tbWl0RmlsZXNSZXNwb25zZSwgQ29tbWl0RmlsZXNSZXF1ZXN0IH0gZnJvbSBcIi4uLy4uL2NvbW11bmljYXRpb24vRGF0YS5qc1wiO1xyXG5pbXBvcnQgeyBhamF4IH0gZnJvbSBcIi4uLy4uL2NvbW11bmljYXRpb24vQWpheEhlbHBlci5qc1wiO1xyXG5pbXBvcnQgeyBGaWxlLCBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBTeW5jaHJvbml6YXRpb25NYW5hZ2VyIH0gZnJvbSBcIi4vUmVwb3NpdG9yeVN5bmNocm9uaXphdGlvbk1hbmFnZXIuanNcIjtcclxuXHJcblxyXG5leHBvcnQgdHlwZSBTeW5jaHJvRmlsZVN0YXRlID0gXCJvcmlnaW5hbFwiIHwgXCJjaGFuZ2VkXCIgfCBcIm5ld1wiIHwgXCJkZWxldGVkXCI7XHJcblxyXG5leHBvcnQgdHlwZSBTeW5jaHJvRmlsZSA9IHtcclxuICAgIGlkSW5zaWRlUmVwb3NpdG9yeTogbnVtYmVyLFxyXG4gICAgaWRJbnNpZGVXb3Jrc3BhY2U/OiBudW1iZXIsXHJcbiAgICB3b3Jrc3BhY2VGaWxlOiBGaWxlLFxyXG4gICAgY29tbWl0dGVkRnJvbUZpbGU/OiBTeW5jaHJvRmlsZSxcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIHJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uOiBudW1iZXIsXHJcbiAgICBpZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uOiBib29sZWFuLFxyXG4gICAgdGV4dDogc3RyaW5nLFxyXG4gICAgc3luY2hyb1dvcmtzcGFjZTogU3luY2hyb1dvcmtzcGFjZSxcclxuICAgIFxyXG4gICAgc3RhdGU6IFN5bmNocm9GaWxlU3RhdGUsXHJcbiAgICBtYXJrZWRBc01lcmdlZDogYm9vbGVhbixcclxuXHJcbiAgICBvcmlnaW5hbFRleHQ/OiBzdHJpbmcsXHJcbiAgICBtb25hY29Nb2RlbD86IG1vbmFjby5lZGl0b3IuSVRleHRNb2RlbCxcclxufVxyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBTeW5jaHJvV29ya3NwYWNlIHtcclxuXHJcbiAgICBmaWxlczogU3luY2hyb0ZpbGVbXSA9IFtdO1xyXG4gICAgY29waWVkRnJvbVdvcmtzcGFjZTogV29ya3NwYWNlO1xyXG4gICAgaXNDdXJyZW50UmVwb3NpdG9yeVZlcnNpb246IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBtYW5hZ2VyOiBTeW5jaHJvbml6YXRpb25NYW5hZ2VyKSB7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGhhc0NoYW5nZXMoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgZm9yKGxldCBmaWxlIG9mIHRoaXMuZmlsZXMpe1xyXG4gICAgICAgICAgICBpZihmaWxlLnN0YXRlICE9IFwib3JpZ2luYWxcIikgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgaXNXcml0YWJsZSgpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb3BpZWRGcm9tV29ya3NwYWNlICE9IG51bGwgfHwgKHRoaXMuaXNDdXJyZW50UmVwb3NpdG9yeVZlcnNpb24gJiYgdGhpcy5tYW5hZ2VyLnJlcG9zaXRvcnlJc1dyaXRhYmxlICk7XHJcbiAgICB9XHJcblxyXG4gICAgY29weUZyb21Xb3Jrc3BhY2Uod29ya3NwYWNlOiBXb3Jrc3BhY2UpOlN5bmNocm9Xb3Jrc3BhY2Uge1xyXG5cclxuICAgICAgICB0aGlzLmZpbGVzID0gW107XHJcbiAgICAgICAgd29ya3NwYWNlLm1vZHVsZVN0b3JlLmdldE1vZHVsZXMoZmFsc2UpLmZvckVhY2gobW9kdWxlID0+IHtcclxuICAgICAgICAgICAgbGV0IGZpbGUgPSBtb2R1bGUuZmlsZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChtb2R1bGUubW9kZWwgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbW9kdWxlLmZpbGUudGV4dCA9IG1vZHVsZS5nZXRQcm9ncmFtVGV4dEZyb21Nb25hY29Nb2RlbCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmZpbGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgcmVwb3NpdG9yeV9maWxlX3ZlcnNpb246IGZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb24sXHJcbiAgICAgICAgICAgICAgICBpZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uOiBmaWxlLmlkZW50aWNhbF90b19yZXBvc2l0b3J5X3ZlcnNpb24sXHJcbiAgICAgICAgICAgICAgICBpZEluc2lkZVJlcG9zaXRvcnk6IGZpbGUuaXNfY29weV9vZl9pZCxcclxuICAgICAgICAgICAgICAgIGlkSW5zaWRlV29ya3NwYWNlOiBmaWxlLmlkLFxyXG4gICAgICAgICAgICAgICAgd29ya3NwYWNlRmlsZTogZmlsZSxcclxuICAgICAgICAgICAgICAgIHRleHQ6IGZpbGUudGV4dC5yZXBsYWNlKC9cXHJcXG4vZywgXCJcXG5cIiksXHJcbiAgICAgICAgICAgICAgICBzeW5jaHJvV29ya3NwYWNlOiB0aGlzLFxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBzdGF0ZTogXCJvcmlnaW5hbFwiLFxyXG4gICAgICAgICAgICAgICAgbWFya2VkQXNNZXJnZWQ6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgICAgIG9yaWdpbmFsVGV4dDogZmlsZS50ZXh0LFxyXG4gICAgICAgICAgICAgICAgbW9uYWNvTW9kZWw6IG51bGxcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5uYW1lID0gXCJXb3Jrc3BhY2U6IFwiICsgd29ya3NwYWNlLm5hbWU7XHJcbiAgICAgICAgdGhpcy5jb3BpZWRGcm9tV29ya3NwYWNlID0gd29ya3NwYWNlO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBjb3B5RnJvbVJlcG9zaXRvcnkocmVwb3NpdG9yeTogUmVwb3NpdG9yeSwgaXNDdXJyZW50UmVwb3NpdG9yeVZlcnNpb246IGJvb2xlYW4pOiBTeW5jaHJvV29ya3NwYWNlIHtcclxuICAgICAgICB0aGlzLmlzQ3VycmVudFJlcG9zaXRvcnlWZXJzaW9uID0gaXNDdXJyZW50UmVwb3NpdG9yeVZlcnNpb247XHJcbiAgICAgICAgdGhpcy5maWxlcyA9IFtdO1xyXG4gICAgICAgIHJlcG9zaXRvcnkuZmlsZUVudHJpZXMuZm9yRWFjaCgoZmlsZUVudHJ5KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBmaWxlRW50cnkuZmlsZW5hbWUsXHJcbiAgICAgICAgICAgICAgICBpZEluc2lkZVJlcG9zaXRvcnk6IGZpbGVFbnRyeS5pZCxcclxuICAgICAgICAgICAgICAgIGlkSW5zaWRlV29ya3NwYWNlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgd29ya3NwYWNlRmlsZTogbnVsbCxcclxuICAgICAgICAgICAgICAgIHJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uOiBmaWxlRW50cnkudmVyc2lvbixcclxuICAgICAgICAgICAgICAgIGlkZW50aWNhbF90b19yZXBvc2l0b3J5X3ZlcnNpb246IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiBmaWxlRW50cnkudGV4dC5yZXBsYWNlKC9cXHJcXG4vZywgXCJcXG5cIiksXHJcbiAgICAgICAgICAgICAgICBzeW5jaHJvV29ya3NwYWNlOiB0aGlzLFxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBzdGF0ZTogXCJvcmlnaW5hbFwiLFxyXG4gICAgICAgICAgICAgICAgbWFya2VkQXNNZXJnZWQ6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgICAgIG1vbmFjb01vZGVsOiBudWxsXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgdGhpcy5uYW1lID0gXCJSZXBvc2l0b3J5OiBcIiArIHJlcG9zaXRvcnkubmFtZSArIFwiIChWIFwiICsgcmVwb3NpdG9yeS52ZXJzaW9uICsgXCIpXCI7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGNvcHlGcm9tSGlzdG9yeUVsZW1lbnQoaGlzdG9yeUVsZW1lbnQ6IEhpc3RvcnlFbGVtZW50KTogU3luY2hyb1dvcmtzcGFjZSB7XHJcbiAgICAgICAgbGV0IHJlcG8gPSBoaXN0b3J5RWxlbWVudC5nZXRSZXBvc2l0b3J5U3RhdGUoKTtcclxuICAgICAgICB0aGlzLmNvcHlGcm9tUmVwb3NpdG9yeShyZXBvLCBmYWxzZSk7XHJcbiAgICAgICAgdGhpcy5uYW1lID0gXCJIaXN0b3J5LVZlcnNpb24gXCIgKyByZXBvLnZlcnNpb247XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgY29tbWl0KHdvcmtzcGFjZTogV29ya3NwYWNlLCBvbGRSZXBvc2l0b3J5OiBSZXBvc2l0b3J5LCBjb21tZW50OiBzdHJpbmcsIG1haW46IE1haW4sXHJcbiAgICAgICAgY2FsbGJhY2s6IChyZXBvc2l0b3J5OiBSZXBvc2l0b3J5LCBlcnJvcm1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCkge1xyXG5cclxuICAgICAgICBsZXQgb2xkSWRUb0ZpbGVNYXA6IHsgW2lkOiBudW1iZXJdOiBSZXBvc2l0b3J5RmlsZUVudHJ5IH0gPSB7fTtcclxuICAgICAgICBsZXQgbmV3SWRUb0ZpbGVNYXA6IHsgW2lkOiBudW1iZXJdOiBTeW5jaHJvRmlsZSB9ID0ge307XHJcblxyXG4gICAgICAgIGxldCBuZXdseVZlcnNpb25lZEZpbGVJZHM6IG51bWJlcltdID0gW107XHJcblxyXG4gICAgICAgIG9sZFJlcG9zaXRvcnkuZmlsZUVudHJpZXMuZm9yRWFjaChmaWxlID0+IG9sZElkVG9GaWxlTWFwW2ZpbGUuaWRdID0gZmlsZSk7XHJcbiAgICAgICAgdGhpcy5maWxlcy5mb3JFYWNoKGZpbGUgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZmlsZS5pZEluc2lkZVJlcG9zaXRvcnkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbmV3SWRUb0ZpbGVNYXBbZmlsZS5pZEluc2lkZVJlcG9zaXRvcnldID0gZmlsZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBsZXQgcmVwb3NpdG9yeUhpc3RvcnlFbnRyeTogUmVwb3NpdG9yeUhpc3RvcnlFbnRyeSA9IHtcclxuICAgICAgICAgICAgY29tbWVudDogY29tbWVudCxcclxuICAgICAgICAgICAgbmFtZTogbWFpbi51c2VyLnJ1Zm5hbWUgKyBcIiBcIiArIG1haW4udXNlci5mYW1pbGllbm5hbWUsXHJcbiAgICAgICAgICAgIHVzZXJuYW1lOiBtYWluLnVzZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgIGlzSW50ZXJtZWRpYXRlRW50cnk6IGZhbHNlLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9VVENTdHJpbmcoKSxcclxuICAgICAgICAgICAgdXNlcklkOiBtYWluLnVzZXIuaWQsXHJcbiAgICAgICAgICAgIHZlcnNpb246IG9sZFJlcG9zaXRvcnkudmVyc2lvbiArIDEsXHJcbiAgICAgICAgICAgIGhpc3RvcnlGaWxlczogW11cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGZpbGUgb2YgdGhpcy5maWxlcykge1xyXG4gICAgICAgICAgICBpZihmaWxlLnN0YXRlID09IFwiZGVsZXRlZFwiKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIGxldCBvbGRGaWxlID0gb2xkSWRUb0ZpbGVNYXBbZmlsZS5pZEluc2lkZVJlcG9zaXRvcnldO1xyXG4gICAgICAgICAgICBpZiAob2xkRmlsZSA9PSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gaWYgZmlsZS5jb21taXR0ZWRGcm9tRmlsZS5cclxuICAgICAgICAgICAgICAgIGlmIChmaWxlLmlkSW5zaWRlUmVwb3NpdG9yeSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3bHlWZXJzaW9uZWRGaWxlSWRzLnB1c2goZmlsZS5jb21taXR0ZWRGcm9tRmlsZS5pZEluc2lkZVdvcmtzcGFjZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZS5jb21taXR0ZWRGcm9tRmlsZS5pZEluc2lkZVJlcG9zaXRvcnkgPSBmaWxlLmNvbW1pdHRlZEZyb21GaWxlLmlkSW5zaWRlV29ya3NwYWNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGUuY29tbWl0dGVkRnJvbUZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb24gPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGUuaWRJbnNpZGVSZXBvc2l0b3J5ID0gZmlsZS5jb21taXR0ZWRGcm9tRmlsZS5pZEluc2lkZVdvcmtzcGFjZTtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlLmNvbW1pdHRlZEZyb21GaWxlLmlkSW5zaWRlUmVwb3NpdG9yeSA9IGZpbGUuY29tbWl0dGVkRnJvbUZpbGUuaWRJbnNpZGVXb3Jrc3BhY2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmVwb3NpdG9yeUhpc3RvcnlFbnRyeS5oaXN0b3J5RmlsZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGZpbGUuaWRJbnNpZGVSZXBvc2l0b3J5LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiY3JlYXRlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogMSxcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBmaWxlLnRleHQsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWU6IGZpbGUubmFtZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob2xkRmlsZS50ZXh0ICE9IGZpbGUudGV4dCkge1xyXG4gICAgICAgICAgICAgICAgb2xkRmlsZS52ZXJzaW9uKys7XHJcbiAgICAgICAgICAgICAgICBsZXQgcGF0Y2g6IHN0cmluZyA9IHRoaXMuZ2V0UGF0Y2gob2xkRmlsZS50ZXh0LCBmaWxlLnRleHQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhdGNoID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXBvc2l0b3J5SGlzdG9yeUVudHJ5Lmhpc3RvcnlGaWxlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG9sZEZpbGUuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiaW50ZXJtZWRpYXRlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246IG9sZEZpbGUudmVyc2lvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogZmlsZS50ZXh0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZTogZmlsZS5uYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcG9zaXRvcnlIaXN0b3J5RW50cnkuaGlzdG9yeUZpbGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogb2xkRmlsZS5pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJjaGFuZ2VcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogb2xkRmlsZS52ZXJzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBwYXRjaCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWU6IChvbGRGaWxlLmZpbGVuYW1lID09IGZpbGUubmFtZSkgPyB1bmRlZmluZWQgOiBmaWxlLm5hbWVcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY2ZmID0gZmlsZS5jb21taXR0ZWRGcm9tRmlsZTtcclxuICAgICAgICAgICAgICAgIGlmKGNmZiAhPSBudWxsKXtcclxuICAgICAgICAgICAgICAgICAgICBjZmYucmVwb3NpdG9yeV9maWxlX3ZlcnNpb24gPSBvbGRGaWxlLnZlcnNpb247XHJcbiAgICAgICAgICAgICAgICAgICAgY2ZmLndvcmtzcGFjZUZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb24gPSBvbGRGaWxlLnZlcnNpb247XHJcbiAgICAgICAgICAgICAgICAgICAgY2ZmLndvcmtzcGFjZUZpbGUuc2F2ZWQgPSBmYWxzZTsgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSBlbHNlIGlmIChvbGRGaWxlLmZpbGVuYW1lICE9IGZpbGUubmFtZSkge1xyXG4gICAgICAgICAgICAgICAgcmVwb3NpdG9yeUhpc3RvcnlFbnRyeS5oaXN0b3J5RmlsZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG9sZEZpbGUuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJpbnRlcm1lZGlhdGVcIixcclxuICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBvbGRGaWxlLnZlcnNpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWU6IGZpbGUubmFtZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IG9sZEZpbGUgb2Ygb2xkUmVwb3NpdG9yeS5maWxlRW50cmllcykge1xyXG4gICAgICAgICAgICBpZiAobmV3SWRUb0ZpbGVNYXBbb2xkRmlsZS5pZF0gPT0gbnVsbCB8fCBuZXdJZFRvRmlsZU1hcFtvbGRGaWxlLmlkXS5zdGF0ZSA9PSBcImRlbGV0ZWRcIikge1xyXG4gICAgICAgICAgICAgICAgcmVwb3NpdG9yeUhpc3RvcnlFbnRyeS5oaXN0b3J5RmlsZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG9sZEZpbGUuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJkZWxldGVcIixcclxuICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBvbGRGaWxlLnZlcnNpb25cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG5ld0ZpbGVFbnRyaWVzOiBSZXBvc2l0b3J5RmlsZUVudHJ5W10gPSB0aGlzLmZpbGVzLmZpbHRlcihmaWxlID0+IGZpbGUuc3RhdGUgIT0gXCJkZWxldGVkXCIpLm1hcCgoc3luY2hyb0ZpbGUpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGZpbGVuYW1lOiBzeW5jaHJvRmlsZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgaWQ6IHN5bmNocm9GaWxlLmlkSW5zaWRlUmVwb3NpdG9yeSxcclxuICAgICAgICAgICAgICAgIHRleHQ6IHN5bmNocm9GaWxlLnRleHQsXHJcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiBzeW5jaHJvRmlsZS5yZXBvc2l0b3J5X2ZpbGVfdmVyc2lvblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuXHJcblxyXG4gICAgICAgIGxldCBjb21taXRGaWxlc1JlcXVlc3Q6IENvbW1pdEZpbGVzUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgZmlsZXM6IG5ld0ZpbGVFbnRyaWVzLFxyXG4gICAgICAgICAgICByZXBvc2l0b3J5VmVyc2lvbkJlZm9yZUNvbW1pdDogb2xkUmVwb3NpdG9yeS52ZXJzaW9uLFxyXG4gICAgICAgICAgICByZXBvc2l0b3J5X2lkOiBvbGRSZXBvc2l0b3J5LmlkLFxyXG4gICAgICAgICAgICB3b3Jrc3BhY2VfaWQ6IHdvcmtzcGFjZS5pZCxcclxuICAgICAgICAgICAgcmVwb3NpdG9yeUhpc3RvcnlFbnRyeTogcmVwb3NpdG9yeUhpc3RvcnlFbnRyeSxcclxuICAgICAgICAgICAgbmV3bHlWZXJzaW9uZWRGaWxlSWRzOiBuZXdseVZlcnNpb25lZEZpbGVJZHNcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuICAgICAgICBhamF4KFwiY29tbWl0RmlsZXNcIiwgY29tbWl0RmlsZXNSZXF1ZXN0LCAoY2ZyOiBDb21taXRGaWxlc1Jlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIHdvcmtzcGFjZS5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKS5tYXAobSA9PiBtLmZpbGUpLmZvckVhY2goKGZpbGUpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChuZXdseVZlcnNpb25lZEZpbGVJZHMuaW5kZXhPZihmaWxlLmlkKSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZS5pc19jb3B5X29mX2lkID0gZmlsZS5pZDtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uID0gMTtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlLmlkZW50aWNhbF90b19yZXBvc2l0b3J5X3ZlcnNpb24gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGUuc2F2ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoYXQubWFuYWdlci5jdXJyZW50VXNlclN5bmNocm9Xb3Jrc3BhY2UuZmlsZXMuZm9yRWFjaChzeW5jaHJvRmlsZSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgd29ya3NwYWNlRmlsZSA9IHN5bmNocm9GaWxlLndvcmtzcGFjZUZpbGU7XHJcbiAgICAgICAgICAgICAgICBpZih3b3Jrc3BhY2VGaWxlICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHN5bmNocm9GaWxlLnRleHQgPT0gd29ya3NwYWNlRmlsZS50ZXh0ICYmIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoc3luY2hyb0ZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb24gIT0gd29ya3NwYWNlRmlsZS5yZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbiAgfHwgc3luY2hyb0ZpbGUuaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbiAhPSB3b3Jrc3BhY2VGaWxlLmlkZW50aWNhbF90b19yZXBvc2l0b3J5X3ZlcnNpb24pKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtzcGFjZUZpbGUuaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbiA9IHN5bmNocm9GaWxlLmlkZW50aWNhbF90b19yZXBvc2l0b3J5X3ZlcnNpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3Jrc3BhY2VGaWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uID0gc3luY2hyb0ZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3Jrc3BhY2VGaWxlLnNhdmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYod29ya3NwYWNlRmlsZS5pc19jb3B5X29mX2lkICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgIHN5bmNocm9GaWxlLmlkSW5zaWRlUmVwb3NpdG9yeSA9IHdvcmtzcGFjZUZpbGUuaXNfY29weV9vZl9pZDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoYXQubWFuYWdlci5tYWluLm5ldHdvcmtNYW5hZ2VyLnNlbmRVcGRhdGVzKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGNmci5yZXBvc2l0b3J5LCBudWxsKTtcclxuICAgICAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICAgICAgfSwgKGVycm9yOiBzdHJpbmcpID0+IHsgY2FsbGJhY2soIG51bGwsIGVycm9yKSB9KVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRQYXRjaChjb250ZW50T2xkOiBzdHJpbmcsIGNvbnRlbnROZXc6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgbGV0IGRtcDogZGlmZl9tYXRjaF9wYXRjaCA9IG5ldyBkaWZmX21hdGNoX3BhdGNoKCk7XHJcbiAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgbGV0IHBhdGNoT2JqZWN0OiBwYXRjaF9vYmpbXSA9IGRtcC5wYXRjaF9tYWtlKGNvbnRlbnRPbGQsIGNvbnRlbnROZXcpO1xyXG5cclxuICAgICAgICBsZXQgcGF0Y2g6IHN0cmluZyA9IEpTT04uc3RyaW5naWZ5KHBhdGNoT2JqZWN0KTtcclxuXHJcbiAgICAgICAgLy8gVGVzdCBwYXRjaCBhbmQgb25seSByZXR1cm4gaXQgaWYgaXQgaXMgdmFsaWQhXHJcbiAgICAgICAgbGV0IGRlU2VyaWFsaXplZFBhdGNoT2JqZWN0ID0gSlNPTi5wYXJzZShwYXRjaCk7XHJcblxyXG4gICAgICAgIGxldCByZXN1bHQ6IFtzdHJpbmcsIGJvb2xlYW5bXV0gPSBkbXAucGF0Y2hfYXBwbHkoZGVTZXJpYWxpemVkUGF0Y2hPYmplY3QsIGNvbnRlbnRPbGQpO1xyXG5cclxuICAgICAgICBpZiAocmVzdWx0ID09IG51bGwgfHwgcmVzdWx0WzBdID09IG51bGwpIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICBpZiAocmVzdWx0WzBdID09IGNvbnRlbnROZXcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHBhdGNoO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgd3JpdGVDaGFuZ2VzVG9Xb3Jrc3BhY2UoKSB7XHJcbiAgICAgICAgbGV0IHdvcmtzcGFjZSA9IHRoaXMuY29waWVkRnJvbVdvcmtzcGFjZTtcclxuICAgICAgICBsZXQgb2xkSWRUb01vZHVsZU1hcDogeyBbaWQ6IG51bWJlcl06IE1vZHVsZSB9ID0ge307XHJcbiAgICAgICAgbGV0IG5ld0lkVG9GaWxlTWFwOiB7IFtpZDogbnVtYmVyXTogU3luY2hyb0ZpbGUgfSA9IHt9O1xyXG5cclxuICAgICAgICB3b3Jrc3BhY2UubW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSkuZm9yRWFjaChtID0+IHtcclxuICAgICAgICAgICAgaWYgKG0uZmlsZS5pc19jb3B5X29mX2lkICE9IG51bGwpIG9sZElkVG9Nb2R1bGVNYXBbbS5maWxlLmlzX2NvcHlfb2ZfaWRdID0gbTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5maWxlcy5mb3JFYWNoKGZpbGUgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZmlsZS5pZEluc2lkZVdvcmtzcGFjZSAhPSBudWxsKSBuZXdJZFRvRmlsZU1hcFtmaWxlLmlkSW5zaWRlV29ya3NwYWNlXSA9IGZpbGU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGxldCBtYWluID0gdGhpcy5tYW5hZ2VyLm1haW47XHJcbiAgICAgICAgZm9yIChsZXQgbW9kdWxlIG9mIHdvcmtzcGFjZS5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKSkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHN5bmNocm9GaWxlID0gbmV3SWRUb0ZpbGVNYXBbbW9kdWxlLmZpbGUuaWRdO1xyXG4gICAgICAgICAgICBpZiAoc3luY2hyb0ZpbGUgIT0gbnVsbCAmJiBzeW5jaHJvRmlsZS5zdGF0ZSAhPSAnZGVsZXRlZCcpIHtcclxuICAgICAgICAgICAgICAgIG1vZHVsZS5maWxlLnRleHQgPSBzeW5jaHJvRmlsZS5tb25hY29Nb2RlbC5nZXRWYWx1ZShtb25hY28uZWRpdG9yLkVuZE9mTGluZVByZWZlcmVuY2UuTEYsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIHN5bmNocm9GaWxlLnRleHQgPSBtb2R1bGUuZmlsZS50ZXh0O1xyXG4gICAgICAgICAgICAgICAgbW9kdWxlLmZpbGUuaXNfY29weV9vZl9pZCA9IHN5bmNocm9GaWxlLmlkSW5zaWRlUmVwb3NpdG9yeTtcclxuICAgICAgICAgICAgICAgIG1vZHVsZS5maWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uID0gc3luY2hyb0ZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb247XHJcbiAgICAgICAgICAgICAgICBtb2R1bGUubW9kZWwuc2V0VmFsdWUoc3luY2hyb0ZpbGUudGV4dCk7XHJcbiAgICAgICAgICAgICAgICBtb2R1bGUuZmlsZS5pZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uID0gc3luY2hyb0ZpbGUuaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbjtcclxuICAgICAgICAgICAgICAgIG1vZHVsZS5maWxlLnNhdmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBtb2R1bGUuZmlsZS5kaXJ0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBtb2R1bGUuZmlsZS5uYW1lID0gc3luY2hyb0ZpbGUubmFtZTtcclxuICAgICAgICAgICAgICAgIGlmKG1vZHVsZS5maWxlLnBhbmVsRWxlbWVudCAhPSBudWxsKXtcclxuICAgICAgICAgICAgICAgICAgICBtb2R1bGUuZmlsZS5wYW5lbEVsZW1lbnQuJGh0bWxGaXJzdExpbmUuZmluZCgnLmpvX2ZpbGVuYW1lJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbWFpbi5uZXR3b3JrTWFuYWdlci5zZW5kRGVsZXRlV29ya3NwYWNlT3JGaWxlKFwiZmlsZVwiLCBtb2R1bGUuZmlsZS5pZCwgKGVycm9yOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdEZXIgU2VydmVyIGlzdCBuaWNodCBlcnJlaWNoYmFyIScpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuZmlsZXMuc3BsaWNlKHRoaXMuZmlsZXMuaW5kZXhPZihzeW5jaHJvRmlsZSksIDEpO1xyXG4gICAgICAgICAgICAgICAgd29ya3NwYWNlLm1vZHVsZVN0b3JlLnJlbW92ZU1vZHVsZShtb2R1bGUpO1xyXG4gICAgICAgICAgICAgICAgbWFpbi5wcm9qZWN0RXhwbG9yZXIuZmlsZUxpc3RQYW5lbC5yZW1vdmVFbGVtZW50KG1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobWFpbi5jdXJyZW50V29ya3NwYWNlID09IHdvcmtzcGFjZSAmJiBtYWluLnByb2plY3RFeHBsb3Jlci5nZXRDdXJyZW50bHlFZGl0ZWRNb2R1bGUoKSA9PSBtb2R1bGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBtYWluLnByb2plY3RFeHBsb3Jlci5zZXRNb2R1bGVBY3RpdmUobnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IHN5bmNocm9GaWxlIG9mIHRoaXMuZmlsZXMpIHtcclxuICAgICAgICAgICAgaWYgKHN5bmNocm9GaWxlLmlkSW5zaWRlUmVwb3NpdG9yeSAhPSBudWxsICYmIG9sZElkVG9Nb2R1bGVNYXBbc3luY2hyb0ZpbGUuaWRJbnNpZGVSZXBvc2l0b3J5XSA9PSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGY6IEZpbGUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogc3luY2hyb0ZpbGUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBkaXJ0eTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBzYXZlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBzeW5jaHJvRmlsZS50ZXh0LFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHRfYmVmb3JlX3JldmlzaW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Ym1pdHRlZF9kYXRlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0dWRlbnRfZWRpdGVkX2FmdGVyX3JldmlzaW9uOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzX2NvcHlfb2ZfaWQ6IHN5bmNocm9GaWxlLmlkSW5zaWRlUmVwb3NpdG9yeSxcclxuICAgICAgICAgICAgICAgICAgICByZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbjogc3luY2hyb0ZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbjogc3luY2hyb0ZpbGUuaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvblxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGxldCBtID0gbmV3IE1vZHVsZShmLCBtYWluKTtcclxuICAgICAgICAgICAgICAgIHdvcmtzcGFjZS5tb2R1bGVTdG9yZS5wdXRNb2R1bGUobSk7XHJcbiAgICAgICAgICAgICAgICBtYWluLm5ldHdvcmtNYW5hZ2VyLnNlbmRDcmVhdGVGaWxlKG0sIHdvcmtzcGFjZSwgbWFpbi51c2VyLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgIChlcnJvcjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnJvciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnRGVyIFNlcnZlciBpc3QgbmljaHQgZXJyZWljaGJhciEnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1haW4ubmV0d29ya01hbmFnZXIuc2VuZFVwZGF0ZXMobnVsbCwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIGlmIChtYWluLmN1cnJlbnRXb3Jrc3BhY2UgPT0gd29ya3NwYWNlKSB7XHJcbiAgICAgICAgICAgIGxldCBjZW0gPSBtYWluLmdldEN1cnJlbnRseUVkaXRlZE1vZHVsZSgpO1xyXG4gICAgICAgICAgICBtYWluLnByb2plY3RFeHBsb3Jlci5zZXRXb3Jrc3BhY2VBY3RpdmUod29ya3NwYWNlLCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGlmIG1vZHVsZSBoYWRuJ3QgYmVlbiBkZWxldGVkIHdoaWxlIHN5bmNocm9uaXppbmc6XHJcbiAgICAgICAgICAgIGlmKHdvcmtzcGFjZS5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKS5pbmRleE9mKGNlbSkgPj0gMCl7XHJcbiAgICAgICAgICAgICAgICBtYWluLnByb2plY3RFeHBsb3Jlci5zZXRNb2R1bGVBY3RpdmUoY2VtKTtcclxuICAgICAgICAgICAgICAgIG1haW4ucHJvamVjdEV4cGxvcmVyLmZpbGVMaXN0UGFuZWwuc2VsZWN0KGNlbSwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd29ya3NwYWNlLm1vZHVsZVN0b3JlLmRpcnR5ID0gdHJ1ZTtcclxuXHJcbiAgICB9XHJcblxyXG59Il19