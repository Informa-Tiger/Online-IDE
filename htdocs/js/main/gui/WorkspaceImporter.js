import { Module } from "../../compiler/parser/Module.js";
import { Workspace } from "../../workspace/Workspace.js";
import { Dialog } from "./Dialog.js";
export class WorkspaceImporter {
    constructor(main, path = []) {
        this.main = main;
        this.path = path;
        this.dialog = new Dialog();
    }
    show() {
        let that = this;
        this.dialog.init();
        this.dialog.heading("Workspace importieren");
        this.dialog.description("Bitte klicken Sie auf den Button 'Datei auswählen...' oder ziehen Sie eine Datei auf das gestrichelt umrahmte Feld.");
        let pathDescription = "Dieser Workspace wird auf unterster Ordnerebene in der Workspaceliste importiert.";
        if (this.path.length > 0) {
            pathDescription = "Dieser Workspace wird in den Ordner " + this.path.join("/") + " importiert.";
        }
        this.dialog.description(pathDescription);
        let $fileInputButton = jQuery('<input type="file" id="file" name="file" multiple />');
        this.dialog.addDiv($fileInputButton);
        let exportedWorkspaces = [];
        let $errorDiv = this.dialog.description("", "red");
        let $workspacePreviewDiv = jQuery(`<ul></ul>`);
        let registerFiles = (files) => {
            for (let i = 0; i < files.length; i++) {
                let f = files[i];
                var reader = new FileReader();
                reader.onload = (event) => {
                    let text = event.target.result;
                    if (!text.startsWith("{")) {
                        $errorDiv.append(jQuery(`<div>Das Format der Datei ${f.name} passt nicht.</div>`));
                        return;
                    }
                    let ew = JSON.parse(text);
                    if (ew.modules == null || ew.name == null || ew.settings == null) {
                        $errorDiv.append(jQuery(`<div>Das Format der Datei ${f.name} passt nicht.</div>`));
                        return;
                    }
                    exportedWorkspaces.push(ew);
                    $workspacePreviewDiv.append(jQuery(`<li>Workspace ${ew.name} mit ${ew.modules.length} Dateien</li>`));
                };
                reader.readAsText(f);
            }
        };
        $fileInputButton.on('change', (event) => {
            //@ts-ignore
            var files = event.originalEvent.target.files;
            registerFiles(files);
        });
        let $dropZone = jQuery(`<div class="jo_workspaceimport_dropzone">Dateien hierhin ziehen</div>`);
        this.dialog.addDiv($dropZone);
        this.dialog.description('<b>Diese Workspaces werden importiert:</b>');
        $dropZone.on('dragover', (evt) => {
            evt.stopPropagation();
            evt.preventDefault();
            evt.originalEvent.dataTransfer.dropEffect = 'copy';
        });
        $dropZone.on('drop', (evt) => {
            evt.stopPropagation();
            evt.preventDefault();
            var files = evt.originalEvent.dataTransfer.files;
            registerFiles(files);
        });
        this.dialog.addDiv($workspacePreviewDiv);
        let waitDiv = this.dialog.waitMessage("Bitte warten...");
        this.dialog.buttons([
            {
                caption: "Abbrechen",
                color: "#a00000",
                callback: () => { this.dialog.close(); }
            },
            {
                caption: "Importieren",
                color: "green",
                callback: () => {
                    let networkManager = this.main.networkManager;
                    let projectExplorer = this.main.projectExplorer;
                    let owner_id = this.main.user.id;
                    if (this.main.workspacesOwnerId != null) {
                        owner_id = this.main.workspacesOwnerId;
                    }
                    let count = 0;
                    for (let wse of exportedWorkspaces)
                        count += 1 + wse.modules.length;
                    let firstWorkspace;
                    for (let wse of exportedWorkspaces) {
                        let ws = new Workspace(wse.name, this.main, owner_id);
                        if (firstWorkspace == null)
                            firstWorkspace = ws;
                        ws.isFolder = false;
                        ws.path = this.path.join("/");
                        ws.settings = wse.settings;
                        this.main.workspaceList.push(ws);
                        ws.alterAdditionalLibraries();
                        networkManager.sendCreateWorkspace(ws, owner_id, (error) => {
                            count--;
                            if (error == null) {
                                projectExplorer.workspaceListPanel.addElement({
                                    name: ws.name,
                                    externalElement: ws,
                                    iconClass: "workspace",
                                    isFolder: false,
                                    path: that.path
                                }, true);
                                for (let mo of wse.modules) {
                                    let f = {
                                        name: mo.name,
                                        dirty: false,
                                        saved: true,
                                        text: mo.text,
                                        text_before_revision: null,
                                        submitted_date: null,
                                        student_edited_after_revision: false,
                                        version: 1,
                                        is_copy_of_id: null,
                                        repository_file_version: null,
                                        identical_to_repository_version: null
                                    };
                                    let m = new Module(f, this.main);
                                    ws.moduleStore.putModule(m);
                                    networkManager.sendCreateFile(m, ws, owner_id, (error) => {
                                        count--;
                                        if (error == null) {
                                            projectExplorer.workspaceListPanel.sortElements();
                                            this.dialog.close();
                                            if (firstWorkspace != null)
                                                projectExplorer.setWorkspaceActive(firstWorkspace, true);
                                        }
                                        else {
                                            alert('Der Server ist nicht erreichbar!');
                                        }
                                    });
                                }
                            }
                            else {
                                alert('Der Server ist nicht erreichbar!');
                            }
                        });
                    }
                }
            },
        ]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya3NwYWNlSW1wb3J0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L21haW4vZ3VpL1dvcmtzcGFjZUltcG9ydGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBMkIsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXpELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFckMsTUFBTSxPQUFPLGlCQUFpQjtJQUkxQixZQUFvQixJQUFVLEVBQVUsT0FBaUIsRUFBRTtRQUF2QyxTQUFJLEdBQUosSUFBSSxDQUFNO1FBQVUsU0FBSSxHQUFKLElBQUksQ0FBZTtRQUV2RCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7SUFFL0IsQ0FBQztJQUVELElBQUk7UUFDQSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLHFIQUFxSCxDQUFDLENBQUE7UUFDOUksSUFBSSxlQUFlLEdBQUcsbUZBQW1GLENBQUM7UUFDMUcsSUFBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBSSxDQUFDLEVBQUM7WUFDckIsZUFBZSxHQUFHLHNDQUFzQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLGNBQWMsQ0FBQztTQUNuRztRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRXpDLElBQUksZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLHNEQUFzRCxDQUFDLENBQUM7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QUksRUFBRSxFQUFFLENBQUMsSUFBSTt3Q0FDYixvQkFBb0IsRUFBRSxJQUFJO3dDQUMxQixjQUFjLEVBQUUsSUFBSTt3Q0FDcEIsNkJBQTZCLEVBQUUsS0FBSzt3Q0FDcEMsT0FBTyxFQUFFLENBQUM7d0NBQ1YsYUFBYSxFQUFFLElBQUk7d0NBQ25CLHVCQUF1QixFQUFFLElBQUk7d0NBQzdCLCtCQUErQixFQUFFLElBQUk7cUNBQ3hDLENBQUM7b0NBQ0YsSUFBSSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQ0FDakMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7b0NBQzVCLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQ3pDLENBQUMsS0FBYSxFQUFFLEVBQUU7d0NBQ2QsS0FBSyxFQUFFLENBQUM7d0NBQ1IsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFOzRDQUNmLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQzs0Q0FDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQzs0Q0FDcEIsSUFBRyxjQUFjLElBQUksSUFBSTtnREFBRSxlQUFlLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO3lDQUN2Rjs2Q0FBTTs0Q0FDSCxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQzt5Q0FFN0M7b0NBQ0wsQ0FBQyxDQUFDLENBQUM7aUNBQ1Y7NkJBRUo7aUNBQU07Z0NBQ0gsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7NkJBRTdDO3dCQUNMLENBQUMsQ0FBQyxDQUFDO3FCQUlOO2dCQUVMLENBQUM7YUFDSjtTQUNKLENBQUMsQ0FBQTtJQUNOLENBQUM7Q0FFSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEV4cG9ydGVkV29ya3NwYWNlLCBGaWxlLCBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBXb3Jrc3BhY2UgfSBmcm9tIFwiLi4vLi4vd29ya3NwYWNlL1dvcmtzcGFjZS5qc1wiO1xyXG5pbXBvcnQgeyBNYWluIH0gZnJvbSBcIi4uL01haW4uanNcIjtcclxuaW1wb3J0IHsgRGlhbG9nIH0gZnJvbSBcIi4vRGlhbG9nLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgV29ya3NwYWNlSW1wb3J0ZXIge1xyXG5cclxuICAgIGRpYWxvZzogRGlhbG9nO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgbWFpbjogTWFpbiwgcHJpdmF0ZSBwYXRoOiBzdHJpbmdbXSA9IFtdKSB7XHJcblxyXG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IERpYWxvZygpO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuZGlhbG9nLmluaXQoKTtcclxuICAgICAgICB0aGlzLmRpYWxvZy5oZWFkaW5nKFwiV29ya3NwYWNlIGltcG9ydGllcmVuXCIpO1xyXG4gICAgICAgIHRoaXMuZGlhbG9nLmRlc2NyaXB0aW9uKFwiQml0dGUga2xpY2tlbiBTaWUgYXVmIGRlbiBCdXR0b24gJ0RhdGVpIGF1c3fDpGhsZW4uLi4nIG9kZXIgemllaGVuIFNpZSBlaW5lIERhdGVpIGF1ZiBkYXMgZ2VzdHJpY2hlbHQgdW1yYWhtdGUgRmVsZC5cIilcclxuICAgICAgICBsZXQgcGF0aERlc2NyaXB0aW9uID0gXCJEaWVzZXIgV29ya3NwYWNlIHdpcmQgYXVmIHVudGVyc3RlciBPcmRuZXJlYmVuZSBpbiBkZXIgV29ya3NwYWNlbGlzdGUgaW1wb3J0aWVydC5cIjtcclxuICAgICAgICBpZih0aGlzLnBhdGgubGVuZ3RoICA+IDApe1xyXG4gICAgICAgICAgICBwYXRoRGVzY3JpcHRpb24gPSBcIkRpZXNlciBXb3Jrc3BhY2Ugd2lyZCBpbiBkZW4gT3JkbmVyIFwiICsgdGhpcy5wYXRoLmpvaW4oXCIvXCIpICsgXCIgaW1wb3J0aWVydC5cIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5kaWFsb2cuZGVzY3JpcHRpb24ocGF0aERlc2NyaXB0aW9uKTtcclxuXHJcbiAgICAgICAgbGV0ICRmaWxlSW5wdXRCdXR0b24gPSBqUXVlcnkoJzxpbnB1dCB0eXBlPVwiZmlsZVwiIGlkPVwiZmlsZVwiIG5hbWU9XCJmaWxlXCIgbXVsdGlwbGUgLz4nKTtcclxuICAgICAgICB0aGlzLmRpYWxvZy5hZGREaXYoJGZpbGVJbnB1dEJ1dHRvbik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IGV4cG9ydGVkV29ya3NwYWNlczogRXhwb3J0ZWRXb3Jrc3BhY2VbXSA9IFtdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCAkZXJyb3JEaXYgPSB0aGlzLmRpYWxvZy5kZXNjcmlwdGlvbihcIlwiLCBcInJlZFwiKTtcclxuICAgICAgICBsZXQgJHdvcmtzcGFjZVByZXZpZXdEaXYgPSBqUXVlcnkoYDx1bD48L3VsPmApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCByZWdpc3RlckZpbGVzID0gKGZpbGVzOiBGaWxlTGlzdCkgPT4ge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpbGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZiA9IGZpbGVzW2ldO1xyXG4gICAgICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRleHQ6IHN0cmluZyA9IDxzdHJpbmc+ZXZlbnQudGFyZ2V0LnJlc3VsdDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRleHQuc3RhcnRzV2l0aChcIntcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVycm9yRGl2LmFwcGVuZChqUXVlcnkoYDxkaXY+RGFzIEZvcm1hdCBkZXIgRGF0ZWkgJHtmLm5hbWV9IHBhc3N0IG5pY2h0LjwvZGl2PmApKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXc6IEV4cG9ydGVkV29ya3NwYWNlID0gSlNPTi5wYXJzZSh0ZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBpZihldy5tb2R1bGVzID09IG51bGwgfHwgZXcubmFtZSA9PSBudWxsIHx8IGV3LnNldHRpbmdzID09IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZXJyb3JEaXYuYXBwZW5kKGpRdWVyeShgPGRpdj5EYXMgRm9ybWF0IGRlciBEYXRlaSAke2YubmFtZX0gcGFzc3QgbmljaHQuPC9kaXY+YCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBleHBvcnRlZFdvcmtzcGFjZXMucHVzaChldyk7XHJcbiAgICAgICAgICAgICAgICAgICAgJHdvcmtzcGFjZVByZXZpZXdEaXYuYXBwZW5kKGpRdWVyeShgPGxpPldvcmtzcGFjZSAke2V3Lm5hbWV9IG1pdCAke2V3Lm1vZHVsZXMubGVuZ3RofSBEYXRlaWVuPC9saT5gKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGYpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAkZmlsZUlucHV0QnV0dG9uLm9uKCdjaGFuZ2UnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIHZhciBmaWxlczogRmlsZUxpc3QgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRhcmdldC5maWxlcztcclxuICAgICAgICAgICAgcmVnaXN0ZXJGaWxlcyhmaWxlcyk7XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgbGV0ICRkcm9wWm9uZSA9IGpRdWVyeShgPGRpdiBjbGFzcz1cImpvX3dvcmtzcGFjZWltcG9ydF9kcm9wem9uZVwiPkRhdGVpZW4gaGllcmhpbiB6aWVoZW48L2Rpdj5gKTtcclxuICAgICAgICB0aGlzLmRpYWxvZy5hZGREaXYoJGRyb3Bab25lKTtcclxuICAgICAgICB0aGlzLmRpYWxvZy5kZXNjcmlwdGlvbignPGI+RGllc2UgV29ya3NwYWNlcyB3ZXJkZW4gaW1wb3J0aWVydDo8L2I+Jyk7XHJcblxyXG5cclxuXHJcbiAgICAgICAgJGRyb3Bab25lLm9uKCdkcmFnb3ZlcicsIChldnQpID0+IHtcclxuICAgICAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgZXZ0Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSAnY29weSc7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAkZHJvcFpvbmUub24oJ2Ryb3AnLCAoZXZ0KSA9PiB7XHJcbiAgICAgICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZmlsZXMgPSBldnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIuZmlsZXM7XHJcbiAgICAgICAgICAgIHJlZ2lzdGVyRmlsZXMoZmlsZXMpO1xyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHRoaXMuZGlhbG9nLmFkZERpdigkd29ya3NwYWNlUHJldmlld0Rpdik7XHJcblxyXG4gICAgICAgIGxldCB3YWl0RGl2ID0gdGhpcy5kaWFsb2cud2FpdE1lc3NhZ2UoXCJCaXR0ZSB3YXJ0ZW4uLi5cIilcclxuXHJcbiAgICAgICAgdGhpcy5kaWFsb2cuYnV0dG9ucyhbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGNhcHRpb246IFwiQWJicmVjaGVuXCIsXHJcbiAgICAgICAgICAgICAgICBjb2xvcjogXCIjYTAwMDAwXCIsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKCkgPT4geyB0aGlzLmRpYWxvZy5jbG9zZSgpIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY2FwdGlvbjogXCJJbXBvcnRpZXJlblwiLFxyXG4gICAgICAgICAgICAgICAgY29sb3I6IFwiZ3JlZW5cIixcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ldHdvcmtNYW5hZ2VyID0gdGhpcy5tYWluLm5ldHdvcmtNYW5hZ2VyO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwcm9qZWN0RXhwbG9yZXIgPSB0aGlzLm1haW4ucHJvamVjdEV4cGxvcmVyO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgb3duZXJfaWQ6IG51bWJlciA9IHRoaXMubWFpbi51c2VyLmlkO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm1haW4ud29ya3NwYWNlc093bmVySWQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvd25lcl9pZCA9IHRoaXMubWFpbi53b3Jrc3BhY2VzT3duZXJJZDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yKGxldCB3c2Ugb2YgZXhwb3J0ZWRXb3Jrc3BhY2VzKSBjb3VudCArPSAxICsgd3NlLm1vZHVsZXMubGVuZ3RoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgZmlyc3RXb3Jrc3BhY2U6IFdvcmtzcGFjZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yKGxldCB3c2Ugb2YgZXhwb3J0ZWRXb3Jrc3BhY2VzKXtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB3czogV29ya3NwYWNlID0gbmV3IFdvcmtzcGFjZSh3c2UubmFtZSwgdGhpcy5tYWluLCBvd25lcl9pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZpcnN0V29ya3NwYWNlID09IG51bGwpIGZpcnN0V29ya3NwYWNlID0gd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdzLmlzRm9sZGVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdzLnBhdGggPSB0aGlzLnBhdGguam9pbihcIi9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdzLnNldHRpbmdzID0gd3NlLnNldHRpbmdzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW4ud29ya3NwYWNlTGlzdC5wdXNoKHdzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3MuYWx0ZXJBZGRpdGlvbmFsTGlicmFyaWVzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXR3b3JrTWFuYWdlci5zZW5kQ3JlYXRlV29ya3NwYWNlKHdzLCBvd25lcl9pZCwgKGVycm9yOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3RFeHBsb3Jlci53b3Jrc3BhY2VMaXN0UGFuZWwuYWRkRWxlbWVudCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHdzLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVybmFsRWxlbWVudDogd3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGljb25DbGFzczogXCJ3b3Jrc3BhY2VcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNGb2xkZXI6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGF0LnBhdGhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKGxldCBtbyBvZiB3c2UubW9kdWxlcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmOiBGaWxlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbW8ubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcnR5OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogbW8udGV4dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRfYmVmb3JlX3JldmlzaW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VibWl0dGVkX2RhdGU6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHVkZW50X2VkaXRlZF9hZnRlcl9yZXZpc2lvbjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNfY29weV9vZl9pZDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbjogbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbSA9IG5ldyBNb2R1bGUoZiwgdGhpcy5tYWluKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3MubW9kdWxlU3RvcmUucHV0TW9kdWxlKG0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXR3b3JrTWFuYWdlci5zZW5kQ3JlYXRlRmlsZShtLCB3cywgb3duZXJfaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZXJyb3I6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdEV4cGxvcmVyLndvcmtzcGFjZUxpc3RQYW5lbC5zb3J0RWxlbWVudHMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZmlyc3RXb3Jrc3BhY2UgIT0gbnVsbCkgcHJvamVjdEV4cGxvcmVyLnNldFdvcmtzcGFjZUFjdGl2ZShmaXJzdFdvcmtzcGFjZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ0RlciBTZXJ2ZXIgaXN0IG5pY2h0IGVycmVpY2hiYXIhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ0RlciBTZXJ2ZXIgaXN0IG5pY2h0IGVycmVpY2hiYXIhJyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXSlcclxuICAgIH1cclxuXHJcbn0iXX0=