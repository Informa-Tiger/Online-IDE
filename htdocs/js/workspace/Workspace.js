import { Module, ModuleStore } from "../compiler/parser/Module.js";
import { Evaluator } from "../interpreter/Evaluator.js";
export class Workspace {
    constructor(name, main, owner_id) {
        this.main = main;
        this.saved = true;
        this.settings = {
            libraries: []
        };
        this.name = name;
        this.owner_id = owner_id;
        this.moduleStore = new ModuleStore(main, true, this.settings.libraries);
        this.evaluator = new Evaluator(this, main);
    }
    toExportedWorkspace() {
        return {
            name: this.name,
            modules: this.moduleStore.getModules(false).map(m => m.toExportedModule()),
            settings: this.settings
        };
    }
    alterAdditionalLibraries() {
        this.moduleStore.setAdditionalLibraries(this.settings.libraries);
        this.moduleStore.dirty = true;
    }
    getWorkspaceData(withFiles) {
        let wd = {
            name: this.name,
            path: this.path,
            isFolder: this.isFolder,
            id: this.id,
            owner_id: this.owner_id,
            currentFileId: this.currentlyOpenModule == null ? null : this.currentlyOpenModule.file.id,
            files: [],
            version: this.version,
            repository_id: this.repository_id,
            has_write_permission_to_repository: this.has_write_permission_to_repository,
            language: 0,
            sql_baseDatabase: "",
            sql_history: "",
            sql_manipulateDatabaseStatements: "",
            settings: JSON.stringify(this.settings)
        };
        if (withFiles) {
            for (let m of this.moduleStore.getModules(false)) {
                wd.files.push(m.getFileData(this));
            }
        }
        return wd;
    }
    renderSynchronizeButton(panelElement) {
        var _a;
        let $buttonDiv = (_a = panelElement === null || panelElement === void 0 ? void 0 : panelElement.$htmlFirstLine) === null || _a === void 0 ? void 0 : _a.find('.jo_additionalButtonRepository');
        if ($buttonDiv == null)
            return;
        let that = this;
        let myMain = this.main;
        if (this.repository_id != null && this.owner_id == myMain.user.id) {
            let $button = jQuery('<div class="jo_startButton img_open-change jo_button jo_active" title="Workspace mit Repository synchronisieren"></div>');
            $buttonDiv.append($button);
            let that = this;
            $button.on('mousedown', (e) => e.stopPropagation());
            $button.on('click', (e) => {
                e.stopPropagation();
                that.synchronizeWithRepository();
            });
        }
        else {
            $buttonDiv.find('.jo_startButton').remove();
        }
    }
    synchronizeWithRepository() {
        let myMain = this.main;
        if (this.repository_id != null && this.owner_id == myMain.user.id) {
            myMain.networkManager.sendUpdates(() => {
                myMain.synchronizationManager.synchronizeWithWorkspace(this);
            }, true);
        }
    }
    static restoreFromData(ws, main) {
        let settings = (ws.settings != null && ws.settings.startsWith("{")) ? JSON.parse(ws.settings) : { libraries: [] };
        //@ts-ignore
        if (settings.libaries) {
            //@ts-ignore
            settings.libraries = settings.libaries;
        }
        let w = new Workspace(ws.name, main, ws.owner_id);
        w.id = ws.id;
        w.path = ws.path;
        w.isFolder = ws.isFolder;
        w.owner_id = ws.owner_id;
        w.version = ws.version;
        w.repository_id = ws.repository_id;
        w.has_write_permission_to_repository = ws.has_write_permission_to_repository;
        w.settings = settings;
        if (w.settings.libraries == null) {
            w.settings.libraries = [];
        }
        if (w.settings.libraries.length > 0) {
            w.moduleStore.setAdditionalLibraries(w.settings.libraries);
        }
        for (let f of ws.files) {
            let m = Module.restoreFromData(f, main);
            w.moduleStore.putModule(m);
            if (f.id == ws.currentFileId) {
                w.currentlyOpenModule = m;
            }
        }
        return w;
    }
    hasErrors() {
        return this.moduleStore.hasErrors();
    }
    getModuleByMonacoModel(model) {
        for (let m of this.moduleStore.getModules(false)) {
            if (m.model == model) {
                return m;
            }
        }
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya3NwYWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudC93b3Jrc3BhY2UvV29ya3NwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBcUIsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQU14RCxNQUFNLE9BQU8sU0FBUztJQTRCbEIsWUFBWSxJQUFZLEVBQVUsSUFBYyxFQUFFLFFBQWdCO1FBQWhDLFNBQUksR0FBSixJQUFJLENBQVU7UUFWaEQsVUFBSyxHQUFZLElBQUksQ0FBQztRQU10QixhQUFRLEdBQXNCO1lBQzFCLFNBQVMsRUFBRSxFQUFFO1NBQ2hCLENBQUM7UUFHRSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsbUJBQW1CO1FBQ2YsT0FBTztZQUNILElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMxRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7U0FDMUIsQ0FBQTtJQUNMLENBQUM7SUFHRCx3QkFBd0I7UUFDcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FB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IFwiLi4vY29tbXVuaWNhdGlvbi9EYXRhLmpzXCI7XHJcbmltcG9ydCB7IEV4cG9ydGVkV29ya3NwYWNlLCBNb2R1bGUsIE1vZHVsZVN0b3JlIH0gZnJvbSBcIi4uL2NvbXBpbGVyL3BhcnNlci9Nb2R1bGUuanNcIjtcclxuaW1wb3J0IHsgRXZhbHVhdG9yIH0gZnJvbSBcIi4uL2ludGVycHJldGVyL0V2YWx1YXRvci5qc1wiO1xyXG5pbXBvcnQgeyBBY2NvcmRpb25FbGVtZW50IH0gZnJvbSBcIi4uL21haW4vZ3VpL0FjY29yZGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBNYWluIH0gZnJvbSBcIi4uL21haW4vTWFpbi5qc1wiO1xyXG5pbXBvcnQgeyBNYWluQmFzZSB9IGZyb20gXCIuLi9tYWluL01haW5CYXNlLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIFdvcmtzcGFjZSB7XHJcbiAgICBcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIHBhdGg6IHN0cmluZztcclxuICAgIGlzRm9sZGVyOiBib29sZWFuO1xyXG4gICAgaWQ6IG51bWJlcjtcclxuICAgIG93bmVyX2lkOiBudW1iZXI7XHJcblxyXG4gICAgdmVyc2lvbjogbnVtYmVyO1xyXG4gICAgLy8gcHVibGlzaGVkX3RvIDA6IG5vbmU7IDE6IGNsYXNzOyAyOiBzY2hvb2w7IDM6IGFsbFxyXG4gICAgcHVibGlzaGVkX3RvOiBudW1iZXI7XHJcbiAgICBcclxuICAgIHJlcG9zaXRvcnlfaWQ6IG51bWJlcjsgICAgLy8gaWQgb2YgcmVwb3NpdG9yeS13b3Jrc3BhY2VcclxuICAgIGhhc193cml0ZV9wZXJtaXNzaW9uX3RvX3JlcG9zaXRvcnk6IGJvb2xlYW47IC8vIHRydWUgaWYgb3duZXIgb2YgdGhpcyB3b3JraW5nIGNvcHkgaGFzIHdyaXRlIHBlcm1pc3Npb24gdG8gcmVwb3NpdG9yeSB3b3Jrc3BhY2VcclxuXHJcbiAgICBtb2R1bGVTdG9yZTogTW9kdWxlU3RvcmU7XHJcbiAgICBwYW5lbEVsZW1lbnQ6IEFjY29yZGlvbkVsZW1lbnQ7XHJcbiAgICBjdXJyZW50bHlPcGVuTW9kdWxlOiBNb2R1bGU7XHJcbiAgICBzYXZlZDogYm9vbGVhbiA9IHRydWU7XHJcblxyXG4gICAgY29tcGlsZXJNZXNzYWdlOiBzdHJpbmc7XHJcblxyXG4gICAgZXZhbHVhdG9yOiBFdmFsdWF0b3I7XHJcblxyXG4gICAgc2V0dGluZ3M6IFdvcmtzcGFjZVNldHRpbmdzID0ge1xyXG4gICAgICAgIGxpYnJhcmllczogW11cclxuICAgIH07XHJcbiAgICBcclxuICAgIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgcHJpdmF0ZSBtYWluOiBNYWluQmFzZSwgb3duZXJfaWQ6IG51bWJlcil7XHJcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgICAgICB0aGlzLm93bmVyX2lkID0gb3duZXJfaWQ7XHJcbiAgICAgICAgdGhpcy5tb2R1bGVTdG9yZSA9IG5ldyBNb2R1bGVTdG9yZShtYWluLCB0cnVlLCB0aGlzLnNldHRpbmdzLmxpYnJhcmllcyk7XHJcbiAgICAgICAgdGhpcy5ldmFsdWF0b3IgPSBuZXcgRXZhbHVhdG9yKHRoaXMsIG1haW4pO1xyXG4gICAgfVxyXG5cclxuICAgIHRvRXhwb3J0ZWRXb3Jrc3BhY2UoKTogRXhwb3J0ZWRXb3Jrc3BhY2Uge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIG5hbWU6IHRoaXMubmFtZSxcclxuICAgICAgICAgICAgbW9kdWxlczogdGhpcy5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKS5tYXAobSA9PiBtLnRvRXhwb3J0ZWRNb2R1bGUoKSksXHJcbiAgICAgICAgICAgIHNldHRpbmdzOiB0aGlzLnNldHRpbmdzXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhbHRlckFkZGl0aW9uYWxMaWJyYXJpZXMoKSB7XHJcbiAgICAgICAgdGhpcy5tb2R1bGVTdG9yZS5zZXRBZGRpdGlvbmFsTGlicmFyaWVzKHRoaXMuc2V0dGluZ3MubGlicmFyaWVzKTtcclxuICAgICAgICB0aGlzLm1vZHVsZVN0b3JlLmRpcnR5ID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRXb3Jrc3BhY2VEYXRhKHdpdGhGaWxlczogYm9vbGVhbik6IFdvcmtzcGFjZURhdGEge1xyXG4gICAgICAgIGxldCB3ZDogV29ya3NwYWNlRGF0YSA9IHtcclxuICAgICAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxyXG4gICAgICAgICAgICBwYXRoOiB0aGlzLnBhdGgsXHJcbiAgICAgICAgICAgIGlzRm9sZGVyOiB0aGlzLmlzRm9sZGVyLFxyXG4gICAgICAgICAgICBpZDogdGhpcy5pZCxcclxuICAgICAgICAgICAgb3duZXJfaWQ6IHRoaXMub3duZXJfaWQsXHJcbiAgICAgICAgICAgIGN1cnJlbnRGaWxlSWQ6IHRoaXMuY3VycmVudGx5T3Blbk1vZHVsZSA9PSBudWxsID8gbnVsbCA6IHRoaXMuY3VycmVudGx5T3Blbk1vZHVsZS5maWxlLmlkLFxyXG4gICAgICAgICAgICBmaWxlczogW10sXHJcbiAgICAgICAgICAgIHZlcnNpb246IHRoaXMudmVyc2lvbixcclxuICAgICAgICAgICAgcmVwb3NpdG9yeV9pZDogdGhpcy5yZXBvc2l0b3J5X2lkLFxyXG4gICAgICAgICAgICBoYXNfd3JpdGVfcGVybWlzc2lvbl90b19yZXBvc2l0b3J5OiB0aGlzLmhhc193cml0ZV9wZXJtaXNzaW9uX3RvX3JlcG9zaXRvcnksXHJcbiAgICAgICAgICAgIGxhbmd1YWdlOiAwLFxyXG4gICAgICAgICAgICBzcWxfYmFzZURhdGFiYXNlOiBcIlwiLFxyXG4gICAgICAgICAgICBzcWxfaGlzdG9yeTogXCJcIixcclxuICAgICAgICAgICAgc3FsX21hbmlwdWxhdGVEYXRhYmFzZVN0YXRlbWVudHM6IFwiXCIsXHJcbiAgICAgICAgICAgIHNldHRpbmdzOiBKU09OLnN0cmluZ2lmeSh0aGlzLnNldHRpbmdzKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYod2l0aEZpbGVzKXtcclxuICAgICAgICAgICAgZm9yKGxldCBtIG9mIHRoaXMubW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSkpe1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICB3ZC5maWxlcy5wdXNoKG0uZ2V0RmlsZURhdGEodGhpcykpO1xyXG4gICAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB3ZDtcclxuICAgIH1cclxuXHJcblxyXG4gICAgcmVuZGVyU3luY2hyb25pemVCdXR0b24ocGFuZWxFbGVtZW50OiBBY2NvcmRpb25FbGVtZW50KSB7XHJcbiAgICAgICAgbGV0ICRidXR0b25EaXYgPSBwYW5lbEVsZW1lbnQ/LiRodG1sRmlyc3RMaW5lPy5maW5kKCcuam9fYWRkaXRpb25hbEJ1dHRvblJlcG9zaXRvcnknKTtcclxuICAgICAgICBpZiAoJGJ1dHRvbkRpdiA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIGxldCBteU1haW46IE1haW4gPSA8TWFpbj50aGlzLm1haW47XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJlcG9zaXRvcnlfaWQgIT0gbnVsbCAmJiB0aGlzLm93bmVyX2lkID09IG15TWFpbi51c2VyLmlkKSB7XHJcbiAgICAgICAgICAgIGxldCAkYnV0dG9uID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fc3RhcnRCdXR0b24gaW1nX29wZW4tY2hhbmdlIGpvX2J1dHRvbiBqb19hY3RpdmVcIiB0aXRsZT1cIldvcmtzcGFjZSBtaXQgUmVwb3NpdG9yeSBzeW5jaHJvbmlzaWVyZW5cIj48L2Rpdj4nKTtcclxuICAgICAgICAgICAgJGJ1dHRvbkRpdi5hcHBlbmQoJGJ1dHRvbik7XHJcbiAgICAgICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuICAgICAgICAgICAgJGJ1dHRvbi5vbignbW91c2Vkb3duJywgKGUpID0+IGUuc3RvcFByb3BhZ2F0aW9uKCkpO1xyXG4gICAgICAgICAgICAkYnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoYXQuc3luY2hyb25pemVXaXRoUmVwb3NpdG9yeSgpO1xyXG5cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICRidXR0b25EaXYuZmluZCgnLmpvX3N0YXJ0QnV0dG9uJykucmVtb3ZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHN5bmNocm9uaXplV2l0aFJlcG9zaXRvcnkoKXtcclxuICAgICAgICBsZXQgbXlNYWluOiBNYWluID0gPE1haW4+dGhpcy5tYWluO1xyXG4gICAgICAgIGlmKHRoaXMucmVwb3NpdG9yeV9pZCAhPSBudWxsICYmIHRoaXMub3duZXJfaWQgPT0gbXlNYWluLnVzZXIuaWQpe1xyXG4gICAgICAgICAgICBteU1haW4ubmV0d29ya01hbmFnZXIuc2VuZFVwZGF0ZXMoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbXlNYWluLnN5bmNocm9uaXphdGlvbk1hbmFnZXIuc3luY2hyb25pemVXaXRoV29ya3NwYWNlKHRoaXMpO1xyXG4gICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJlc3RvcmVGcm9tRGF0YSh3czogV29ya3NwYWNlRGF0YSwgbWFpbjogTWFpbik6IFdvcmtzcGFjZSB7XHJcblxyXG4gICAgICAgIGxldCBzZXR0aW5nczogV29ya3NwYWNlU2V0dGluZ3MgPSAod3Muc2V0dGluZ3MgIT0gbnVsbCAmJiB3cy5zZXR0aW5ncy5zdGFydHNXaXRoKFwie1wiKSkgPyBKU09OLnBhcnNlKHdzLnNldHRpbmdzKSA6IHtsaWJyYXJpZXM6IFtdfTsgXHJcblxyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIGlmKHNldHRpbmdzLmxpYmFyaWVzKXtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIHNldHRpbmdzLmxpYnJhcmllcyA9IHNldHRpbmdzLmxpYmFyaWVzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHcgPSBuZXcgV29ya3NwYWNlKHdzLm5hbWUsIG1haW4sIHdzLm93bmVyX2lkKTtcclxuICAgICAgICB3LmlkID0gd3MuaWQ7XHJcbiAgICAgICAgdy5wYXRoID0gd3MucGF0aDtcclxuICAgICAgICB3LmlzRm9sZGVyID0gd3MuaXNGb2xkZXI7XHJcbiAgICAgICAgdy5vd25lcl9pZCA9IHdzLm93bmVyX2lkO1xyXG4gICAgICAgIHcudmVyc2lvbiA9IHdzLnZlcnNpb247XHJcbiAgICAgICAgdy5yZXBvc2l0b3J5X2lkID0gd3MucmVwb3NpdG9yeV9pZDtcclxuICAgICAgICB3Lmhhc193cml0ZV9wZXJtaXNzaW9uX3RvX3JlcG9zaXRvcnkgPSB3cy5oYXNfd3JpdGVfcGVybWlzc2lvbl90b19yZXBvc2l0b3J5O1xyXG4gICAgICAgIHcuc2V0dGluZ3MgPSBzZXR0aW5ncztcclxuXHJcbiAgICAgICAgaWYody5zZXR0aW5ncy5saWJyYXJpZXMgPT0gbnVsbCl7XHJcbiAgICAgICAgICAgIHcuc2V0dGluZ3MubGlicmFyaWVzID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih3LnNldHRpbmdzLmxpYnJhcmllcy5sZW5ndGggPiAwKXtcclxuICAgICAgICAgICAgdy5tb2R1bGVTdG9yZS5zZXRBZGRpdGlvbmFsTGlicmFyaWVzKHcuc2V0dGluZ3MubGlicmFyaWVzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvcihsZXQgZiBvZiB3cy5maWxlcyl7XHJcblxyXG4gICAgICAgICAgICBsZXQgbTogTW9kdWxlID0gTW9kdWxlLnJlc3RvcmVGcm9tRGF0YShmLCBtYWluKTtcclxuICAgICAgICAgICAgdy5tb2R1bGVTdG9yZS5wdXRNb2R1bGUobSk7XHJcblxyXG4gICAgICAgICAgICBpZihmLmlkID09IHdzLmN1cnJlbnRGaWxlSWQpe1xyXG4gICAgICAgICAgICAgICAgdy5jdXJyZW50bHlPcGVuTW9kdWxlID0gbTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB3O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBoYXNFcnJvcnMoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kdWxlU3RvcmUuaGFzRXJyb3JzKCk7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TW9kdWxlQnlNb25hY29Nb2RlbChtb2RlbDogbW9uYWNvLmVkaXRvci5JVGV4dE1vZGVsKTogTW9kdWxlIHtcclxuICAgICAgICBmb3IobGV0IG0gb2YgdGhpcy5tb2R1bGVTdG9yZS5nZXRNb2R1bGVzKGZhbHNlKSl7XHJcbiAgICAgICAgICAgIGlmKG0ubW9kZWwgPT0gbW9kZWwpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbn1cclxuXHJcbiJdfQ==