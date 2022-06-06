import { ajax } from "../../communication/AjaxHelper.js";
import { EmbeddedSlider } from "../../embedded/EmbeddedSlider.js";
import { makeDiv } from "../../tools/HtmlTools.js";
import { HistoryElement } from "./HistoryElement.js";
import { RepositoryTool } from "./RepositoryTool.js";
import { SynchronizationListElement } from "./SynchronizationListElement.js";
import { SynchroWorkspace } from "./SynchroWorkspace.js";
export class SynchronizationManager {
    constructor(main) {
        this.main = main;
        this.$fileListHeaderDivs = [];
        this.$fileListDivs = [];
        this.guiReady = false;
        this.synchronizationListElements = [];
        this.historyElements = [];
    }
    synchronizeWithWorkspace(workspace) {
        this.gainRepositoryLock(workspace.repository_id, (success) => {
            if (success) {
                this.repositoryIsWritable = true;
                this.attachToWorkspaceAndRepository(workspace);
                this.show();
                this.timer = setInterval(() => {
                    this.gainRepositoryLock(this.currentRepository.id, (success) => {
                        if (!success) {
                            alert('Der Server ist temporär nicht erreichbar.');
                            window.history.back();
                        }
                    });
                }, 10000);
            }
            else {
                // User has no write permission to repository => no lock needed.
                this.attachToWorkspaceAndRepository(workspace);
                this.repositoryIsWritable = false;
                this.show();
            }
        });
    }
    gainRepositoryLock(repository_id, callback) {
        let request = { repository_id: repository_id };
        ajax('gainRepositoryLock', request, (response) => {
            callback(response.success);
            // console.log("Lock for repository_id " + repository_id + " has been granted.")
        }, (message) => {
            alert(message);
            callback(false);
        });
    }
    attachToWorkspaceAndRepository(workspace) {
        this.currentUserSynchroWorkspace = new SynchroWorkspace(this).copyFromWorkspace(workspace);
        this.leftSynchroWorkspace = this.currentUserSynchroWorkspace;
        let that = this;
        let request = { repository_id: workspace.repository_id, workspace_id: workspace.id };
        ajax("getRepository", request, (response) => {
            that.attachToRepository(response.repository);
        }, (message) => {
            alert(message);
            window.history.back();
        });
    }
    attachToRepository(repository) {
        this.currentRepository = repository;
        RepositoryTool.deserializeRepository(this.currentRepository);
        this.currentRepositorySynchroWorkspace = new SynchroWorkspace(this).copyFromRepository(this.currentRepository, true);
        this.rightSynchroWorkspace = this.currentRepositorySynchroWorkspace;
        this.setupSynchronizationListElements();
        this.setupHistoryElements();
    }
    setupHistoryElements() {
        this.$historyScrollDiv.empty();
        this.historyElements = [];
        this.lastShownHistoryElement = null;
        this.currentRepository.historyEntries.forEach((he, index) => {
            this.historyElements.push(new HistoryElement(this, this.currentRepository, he, index));
        });
    }
    setupSynchronizationListElements() {
        let lastSynchroFileLeft = null;
        let lastSynchroFileRight = null;
        if (this.lastShownSynchronizationElement != null) {
            lastSynchroFileLeft = this.lastShownSynchronizationElement.leftSynchroFile;
            lastSynchroFileRight = this.lastShownSynchronizationElement.rightSynchroFile;
        }
        this.$fileListDivs.forEach($div => $div.empty());
        this.synchronizationListElements.forEach(se => se.emptyGUI());
        this.synchronizationListElements = [];
        this.lastShownSynchronizationElement = null;
        let fileElements = [];
        let synchroFileMap = {};
        this.leftSynchroWorkspace.files.forEach(sfile => {
            let fileElement = {
                id: sfile.idInsideRepository,
                name: sfile.name,
                leftSynchroFile: sfile,
                rightSynchroFile: null
            };
            fileElements.push(fileElement);
            if (sfile.idInsideRepository != null) {
                synchroFileMap["r" + sfile.idInsideRepository] = fileElement;
            }
            else {
                synchroFileMap["w" + sfile.idInsideWorkspace] = fileElement;
            }
        });
        this.rightSynchroWorkspace.files.forEach(sfile => {
            let fileElement = null;
            if (sfile.idInsideRepository != null) {
                fileElement = synchroFileMap["r" + sfile.idInsideRepository];
            }
            else {
                fileElement = synchroFileMap["w" + sfile.idInsideWorkspace];
            }
            if (fileElement == null) {
                fileElement = {
                    id: sfile.idInsideRepository,
                    name: sfile.name,
                    leftSynchroFile: null,
                    rightSynchroFile: sfile
                };
                fileElements.push(fileElement);
            }
            else {
                fileElement.rightSynchroFile = sfile;
            }
        });
        fileElements.sort((fe1, fe2) => fe1.name.localeCompare(fe2.name));
        fileElements.forEach(fe => {
            let synchroListElement = new SynchronizationListElement(this, fe.leftSynchroFile, fe.rightSynchroFile, this.leftSynchroWorkspace, this.rightSynchroWorkspace);
            this.synchronizationListElements.push(synchroListElement);
            synchroListElement.compareFilesAndAdaptGUI();
        });
        this.diffEditor.setModel({
            original: monaco.editor.createModel("Wählen Sie oben eine Datei aus!", "myJava"),
            modified: monaco.editor.createModel("Wählen Sie oben eine Datei aus!", "myJava")
        });
        this.diffEditor.updateOptions({
            originalEditable: false
        });
        if (this.leftSynchroWorkspace == this.currentUserSynchroWorkspace) {
            this.setHeader("left", "Dein Workspace:");
            this.$backToWorkspaceButton.hide();
        }
        else {
            this.setHeader("left", this.leftSynchroWorkspace.name + ":");
            this.$backToWorkspaceButton.show();
            this.$writeWorkspaceChangesButton.hide();
        }
        if (this.rightSynchroWorkspace == this.currentRepositorySynchroWorkspace) {
            let writable = this.repositoryIsWritable ? ", mit Schreibzugriff" : ", ohne Schreibzugriff";
            this.setHeader("right", "Repository (aktuelle Version" + writable + "):");
            this.$backToCurrentRepositoryVersionButton.hide();
        }
        else {
            this.setHeader("right", this.rightSynchroWorkspace.name + ":");
            this.$backToCurrentRepositoryVersionButton.show();
            this.$writeRepositoryChangesButton.hide();
        }
        jQuery('#jo_synchro_main_heading_text').text(`Synchronisieren mit Repository "${this.currentRepository.name}"`);
        let lastFileSelected = false;
        if (lastSynchroFileLeft != null || lastSynchroFileRight != null) {
            for (let sle of this.synchronizationListElements) {
                if (sle.leftSynchroFile != null && sle.leftSynchroFile == lastSynchroFileLeft ||
                    sle.rightSynchroFile != null && sle.rightSynchroFile == lastSynchroFileRight) {
                    sle.select();
                    lastFileSelected = true;
                    break;
                }
            }
        }
        if (!lastFileSelected && this.synchronizationListElements.length > 0) {
            this.synchronizationListElements[0].select();
        }
    }
    show() {
        if (!this.guiReady) {
            this.initGUI();
        }
        let $synchroDiv = jQuery('#synchronize-div');
        $synchroDiv.css('visibility', 'visible');
        let $mainDiv = jQuery('#main');
        $mainDiv.css('visibility', 'hidden');
        this.$writeWorkspaceChangesButton.hide();
        this.$writeRepositoryChangesButton.hide();
        let that = this;
        this.main.windowStateManager.registerOneTimeBackButtonListener(() => {
            that.hide();
        });
    }
    hide() {
        let $synchroDiv = jQuery('#synchronize-div');
        $synchroDiv.css('visibility', 'hidden');
        let $mainDiv = jQuery('#main');
        $mainDiv.css('visibility', 'visible');
        clearInterval(this.timer);
        if (this.currentRepository == null)
            return; // Testuser...
        let request = { repository_id: this.currentRepository.id };
        ajax('leaseRepositoryLock', request, (response) => {
            // console.log("Lock for repository_id " + request.repository_id + " has been released.")
        }, (message) => {
        });
    }
    initGUI() {
        this.guiReady = true;
        let $synchroDiv = jQuery('#synchronize-div');
        let that = this;
        $synchroDiv.append(this.$mainHeadingDiv = jQuery('<div id="jo_synchro_main_heading"><span id="jo_synchro_main_heading_text">Java-Online: Workspace mit Repository synchronisieren</span></div>'), this.$belowMainHeadingDiv = makeDiv("jo_synchro_below_main_heading"));
        let $buttonsTopRightDiv = makeDiv("jo_synchro_buttonsTopRight");
        this.$mainHeadingDiv.append($buttonsTopRightDiv);
        $buttonsTopRightDiv.append(this.$exitButton = jQuery('<div id="jo_synchro_exitButton" class="jo_synchro_button">Zurück zum Programmieren</div>'));
        this.$exitButton.on('click', () => {
            window.history.back();
        });
        this.$leftDiv = makeDiv("jo_synchro_leftDiv");
        this.$historyOuterDiv = makeDiv("jo_synchro_historyOuterDiv");
        this.$historyOuterDiv.append(jQuery('<div id="jo_synchro_historyHeader"><div class="jo_synchro_tabHeading">History:</div></div>)'));
        this.$belowMainHeadingDiv.append(this.$leftDiv, this.$historyOuterDiv);
        new EmbeddedSlider(this.$historyOuterDiv, true, false, () => { this.diffEditor.layout(); }).$sliderDiv.css('left', '-3px');
        this.$historyOuterDiv.find('.joe_slider').css('position', 'absolute');
        this.$historyScrollDiv = makeDiv("historyScrollDiv", "jo_scrollable");
        this.$historyOuterDiv.append(this.$historyScrollDiv);
        this.$leftDiv.append(this.$leftUpperDiv = makeDiv("jo_synchro_leftUpper"), this.$editorDiv = makeDiv("jo_synchro_editor"));
        this.$leftUpperDiv.append(this.$fileListHeaderOuterDiv = makeDiv("jo_synchro_fileListHeaderOuter"), this.$fileListOuterDiv = makeDiv("jo_synchro_fileListOuter", "jo_scrollable"), this.$fileListFooterDiv = makeDiv("jo_synchro_fileListFooter"));
        this.$fileListHeaderContainerRight = makeDiv(null, "jo_synchro_fileListHeaderContainerRight");
        let fileListHeaderRight = makeDiv(null, "jo_synchro_fileListHeader");
        this.$fileListHeaderContainerRight.append(fileListHeaderRight);
        let $fileListHeaderCenter = makeDiv(null, "jo_synchro_fileListHeaderCenter");
        $fileListHeaderCenter.append(this.$updateAllButton = SynchronizationListElement.makeButton("updateAll", "left", () => { that.updateAll(); }, false));
        $fileListHeaderCenter.append(this.$commitAllButton = SynchronizationListElement.makeButton("commitAll", "right", () => { that.commitAll(); }, false));
        this.$fileListHeaderDivs.push(makeDiv(null, "jo_synchro_fileListHeader", "", { "flex": "2 0" }), $fileListHeaderCenter, this.$fileListHeaderContainerRight, makeDiv(null, "jo_synchro_scrollbarPlaceholder"));
        this.$fileListDivs.push(makeDiv(null, "jo_synchro_fileList"), makeDiv(null, "jo_synchro_fileListButtonsLeft"), makeDiv(null, "jo_synchro_fileListButtonsRight"), makeDiv(null, "jo_synchro_fileList"));
        this.$fileListHeaderOuterDiv.append(this.$fileListHeaderDivs);
        this.$fileListOuterDiv.append(this.$fileListDivs);
        this.$fileListHeaderDivs[0].append("<div class='jo_synchro_tabHeading'>Dein Workspace:</div>");
        fileListHeaderRight.append("<div class='jo_synchro_tabHeading'>Repository (aktuelle Version):</div>");
        this.$fileListHeaderDivs[0].append(this.$backToWorkspaceButton = jQuery('<div class="jo_synchro_button jo_synchro_backToButton">Zeige eigenen Workspace</div>'));
        this.$backToWorkspaceButton.on('click', () => {
            that.backToWorkspace();
        });
        this.$backToWorkspaceButton.hide();
        fileListHeaderRight.append(this.$backToCurrentRepositoryVersionButton = jQuery('<div class="jo_synchro_button jo_synchro_backToButton">Zeige aktuelle Repository-Version</div>'));
        this.$backToCurrentRepositoryVersionButton.on('click', () => {
            that.backToCurrentRepositoryVersion();
        });
        this.$backToWorkspaceButton.hide();
        this.$fileListHeaderDivs[0].append(this.$writeWorkspaceChangesButton = jQuery('<div id="jo_synchro_writeChangesButton" class="jo_synchro_button">Änderungen am Workspace (rot!) speichern</div>'));
        this.$writeWorkspaceChangesButton.on('click', () => {
            that.writeWorkspaceChanges();
        });
        this.$writeWorkspaceChangesButton.hide();
        fileListHeaderRight.append(this.$writeRepositoryChangesButton = jQuery('<div id="jo_synchro_writeChangesButton" class="jo_synchro_button">Änderungen am Repository (rot!) speichern</div>'));
        this.$writeRepositoryChangesButton.on('click', () => {
            that.writeRepositoryChanges();
        });
        this.$writeRepositoryChangesButton.hide();
        let horizontalSlider = new EmbeddedSlider(this.$editorDiv, true, true, () => { this.diffEditor.layout(); });
        horizontalSlider.setColor('var(--slider)');
        this.makeDroppable("left", this.$fileListDivs[0]);
        this.makeDroppable("right", this.$fileListDivs[3]);
        this.initEditor();
    }
    backToWorkspace() {
        this.leftSynchroWorkspace = this.currentUserSynchroWorkspace;
        this.setupSynchronizationListElements();
        this.onContentChanged("left");
    }
    backToCurrentRepositoryVersion() {
        this.rightSynchroWorkspace = this.currentRepositorySynchroWorkspace;
        this.setupSynchronizationListElements();
        this.onContentChanged("right");
    }
    makeDroppable(leftRight, $dropZoneDiv) {
        let that = this;
        $dropZoneDiv.on("dragover", (e) => {
            $dropZoneDiv.addClass('jo_synchro_dragZone');
            e.preventDefault();
        });
        $dropZoneDiv.on("dragleave", () => {
            $dropZoneDiv.removeClass('jo_synchro_dragZone');
        });
        $dropZoneDiv.on("drop", (e) => {
            let sw = new SynchroWorkspace(that).copyFromHistoryElement(HistoryElement.currentlyDragged);
            switch (leftRight) {
                case "left":
                    that.leftSynchroWorkspace = sw;
                    break;
                case "right":
                    that.rightSynchroWorkspace = sw;
                    break;
            }
            that.setupSynchronizationListElements();
            $dropZoneDiv.removeClass('jo_synchro_dragZone');
        });
    }
    setHeader(leftRight, caption) {
        let index = leftRight == "left" ? 0 : 2;
        this.$fileListHeaderDivs[index].find('.jo_synchro_tabHeading').text(caption);
    }
    writeRepositoryChanges() {
        let that = this;
        this.$writeRepositoryChangesButton.hide();
        let $dialogDiv = makeDiv("", "jo_synchro_commitDialogDiv");
        $dialogDiv.hide();
        this.$fileListHeaderContainerRight.append($dialogDiv);
        $dialogDiv.append(makeDiv("", "jo_synchro_commitDialogCaption", "Bitte beschreibe kurz die vorgenommenen Änderungen am Repository:"));
        let $dialogTextarea = jQuery('<textarea class="jo_synchro_commitDialogTextarea"></textarea>');
        $dialogDiv.append($dialogTextarea);
        let $dialogButtonDiv = makeDiv("", "jo_synchro_commitDialogButtonDiv");
        $dialogDiv.append($dialogButtonDiv);
        let $buttonCancel = makeDiv("", "jo_synchro_button", "Abbrechen", { "background-color": "var(--updateButtonBackground)", "color": "var(--updateButtonColor)" });
        $dialogButtonDiv.append($buttonCancel);
        $buttonCancel.on("click", () => {
            $dialogDiv.remove();
            that.$writeRepositoryChangesButton.show();
        });
        let $buttonOK = makeDiv("", "jo_synchro_button", "OK", { "background-color": "var(--createButtonBackground)", "color": "var(--createButtonColor)" });
        $dialogButtonDiv.append($buttonOK);
        $dialogDiv.show(600);
        $buttonOK.on("click", () => {
            let comment = $dialogTextarea.val();
            $dialogDiv.remove();
            this.currentRepositorySynchroWorkspace.commit(this.currentUserSynchroWorkspace.copiedFromWorkspace, this.currentRepository, comment, this.main, (repository, errorMessage) => {
                if (errorMessage != null) {
                    alert(errorMessage);
                    this.attachToWorkspaceAndRepository(this.currentRepositorySynchroWorkspace.copiedFromWorkspace);
                }
                else {
                    this.attachToRepository(repository);
                    this.$writeRepositoryChangesButton.hide();
                }
            });
        });
        $dialogTextarea.focus();
    }
    writeWorkspaceChanges() {
        this.currentUserSynchroWorkspace.writeChangesToWorkspace();
        this.currentUserSynchroWorkspace = new SynchroWorkspace(this).copyFromWorkspace(this.currentUserSynchroWorkspace.copiedFromWorkspace);
        this.leftSynchroWorkspace = this.currentUserSynchroWorkspace;
        this.setupSynchronizationListElements();
        this.$writeWorkspaceChangesButton.hide();
    }
    initEditor() {
        this.diffEditor = monaco.editor.createDiffEditor(document.getElementById("jo_synchro_editor"), {
            originalEditable: true,
            readOnly: true,
            automaticLayout: true
        });
    }
    onContentChanged(leftRight) {
        let $button = leftRight == "left" ? this.$writeWorkspaceChangesButton : this.$writeRepositoryChangesButton;
        let synchroWorkspace = leftRight == "left" ? this.currentUserSynchroWorkspace : this.currentRepositorySynchroWorkspace;
        if (synchroWorkspace.hasChanges()) {
            $button.show();
        }
        else {
            $button.hide();
        }
    }
    updateAll() {
        let updateButtons = this.$fileListDivs[1].find('.jo_synchro_updateButton');
        updateButtons.click();
    }
    commitAll() {
        let commitButtons = this.$fileListDivs[2].find('.jo_synchro_commitButton');
        commitButtons.click();
    }
    updateCenterButtons() {
        let updateButtons = this.$fileListDivs[1].find('.jo_synchro_updateButton');
        if (updateButtons.length > 0) {
            this.$updateAllButton.css("visibility", "inherit");
        }
        else {
            this.$updateAllButton.css("visibility", "hidden");
        }
        let commitButtons = this.$fileListDivs[2].find('.jo_synchro_commitButton');
        if (commitButtons.length > 0) {
            this.$commitAllButton.css("visibility", "inherit");
        }
        else {
            this.$commitAllButton.css("visibility", "hidden");
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVwb3NpdG9yeVN5bmNocm9uaXphdGlvbk1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L3JlcG9zaXRvcnkvc3luY2hyb25pemUvUmVwb3NpdG9yeVN5bmNocm9uaXphdGlvbk1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFbkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRCxPQUFPLEVBQWEsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RixPQUFPLEVBQWUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQVd0RSxNQUFNLE9BQU8sc0JBQXNCO0lBd0QvQixZQUFtQixJQUFVO1FBQVYsU0FBSSxHQUFKLElBQUksQ0FBTTtRQW5DN0Isd0JBQW1CLEdBQTZCLEVBQUUsQ0FBQztRQVNuRCxrQkFBYSxHQUE2QixFQUFFLENBQUM7UUFNN0MsYUFBUSxHQUFZLEtBQUssQ0FBQztRQVcxQixnQ0FBMkIsR0FBaUMsRUFBRSxDQUFDO1FBRy9ELG9CQUFlLEdBQXFCLEVBQUUsQ0FBQztJQU92QyxDQUFDO0lBRUQsd0JBQXdCLENBQUMsU0FBb0I7UUFFekMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUN6RCxJQUFJLE9BQU8sRUFBRTtnQkFDVCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsOEJBQThCLENBQUMsU0FBUyxD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O1lBQ0gsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDckQ7SUFDTCxDQUFDO0NBR0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBhamF4IH0gZnJvbSBcIi4uLy4uL2NvbW11bmljYXRpb24vQWpheEhlbHBlci5qc1wiO1xyXG5pbXBvcnQgeyBHZXRSZXBvc2l0b3J5UmVxdWVzdCwgR2V0UmVwb3NpdG9yeVJlc3BvbnNlLCBSZXBvc2l0b3J5LCBHYWluUmVwb3NpdG9yeUxvY2tSZXF1ZXN0LCBHYWluUmVwb3NpdG9yeUxvY2tSZXNwb25zZSwgTGVhc2VSZXBvc2l0b3J5TG9ja1JlcXVlc3QsIExlYXNlUmVwb3NpdG9yeUxvY2tSZXNwb25zZSB9IGZyb20gXCIuLi8uLi9jb21tdW5pY2F0aW9uL0RhdGEuanNcIjtcclxuaW1wb3J0IHsgRW1iZWRkZWRTbGlkZXIgfSBmcm9tIFwiLi4vLi4vZW1iZWRkZWQvRW1iZWRkZWRTbGlkZXIuanNcIjtcclxuaW1wb3J0IHsgTWFpbiB9IGZyb20gXCIuLi8uLi9tYWluL01haW4uanNcIjtcclxuaW1wb3J0IHsgbWFrZURpdiB9IGZyb20gXCIuLi8uLi90b29scy9IdG1sVG9vbHMuanNcIjtcclxuaW1wb3J0IHsgV29ya3NwYWNlIH0gZnJvbSBcIi4uLy4uL3dvcmtzcGFjZS9Xb3Jrc3BhY2UuanNcIjtcclxuaW1wb3J0IHsgSGlzdG9yeUVsZW1lbnQgfSBmcm9tIFwiLi9IaXN0b3J5RWxlbWVudC5qc1wiO1xyXG5pbXBvcnQgeyBSZXBvc2l0b3J5VG9vbCB9IGZyb20gXCIuL1JlcG9zaXRvcnlUb29sLmpzXCI7XHJcbmltcG9ydCB7IExlZnRSaWdodCwgU3luY2hyb25pemF0aW9uTGlzdEVsZW1lbnQgfSBmcm9tIFwiLi9TeW5jaHJvbml6YXRpb25MaXN0RWxlbWVudC5qc1wiO1xyXG5pbXBvcnQgeyBTeW5jaHJvRmlsZSwgU3luY2hyb1dvcmtzcGFjZSB9IGZyb20gXCIuL1N5bmNocm9Xb3Jrc3BhY2UuanNcIjtcclxuaW1wb3J0IHsgRGlhbG9nIH0gZnJvbSBcIi4uLy4uL21haW4vZ3VpL0RpYWxvZy5qc1wiO1xyXG5cclxuXHJcbnR5cGUgRmlsZUVsZW1lbnQgPSB7XHJcbiAgICBpZDogbnVtYmVyLFxyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgbGVmdFN5bmNocm9GaWxlOiBTeW5jaHJvRmlsZSxcclxuICAgIHJpZ2h0U3luY2hyb0ZpbGU6IFN5bmNocm9GaWxlXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTeW5jaHJvbml6YXRpb25NYW5hZ2VyIHtcclxuXHJcbiAgICAkbWFpbkhlYWRpbmdEaXY6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47IC8vIGhlYWRpbmcgXCJKYXZhLU9ubGluZTogU3luY2hyb25pemUgcmVwb3NpdG9yaWVzXCJcclxuXHJcbiAgICAkd3JpdGVXb3Jrc3BhY2VDaGFuZ2VzQnV0dG9uOiBKUXVlcnk8SFRNTERpdkVsZW1lbnQ+O1xyXG4gICAgJHdyaXRlUmVwb3NpdG9yeUNoYW5nZXNCdXR0b246IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47XHJcblxyXG4gICAgJGJhY2tUb1dvcmtzcGFjZUJ1dHRvbjogSlF1ZXJ5PEhUTUxEaXZFbGVtZW50PjtcclxuICAgICRiYWNrVG9DdXJyZW50UmVwb3NpdG9yeVZlcnNpb25CdXR0b246IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47XHJcblxyXG4gICAgJGV4aXRCdXR0b246IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47XHJcblxyXG4gICAgJGJlbG93TWFpbkhlYWRpbmdEaXY6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47IC8vIGNvbnRhaW5zIGFsbCBlbGVtZW50cyBiZWxvdyBtYWluIGhlYWRpbmdcclxuXHJcbiAgICAkbGVmdERpdjogSlF1ZXJ5PEhUTUxEaXZFbGVtZW50PjsgLy8gY29udGFpbnMgaGVhZGluZ3MsIGZpbGUgbGlzdHMgYW5kIGVkaXRvcnNcclxuICAgICRoaXN0b3J5T3V0ZXJEaXY6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47IC8vIGNvbnRhaW5zIGhpc3RvcnlcclxuICAgICRoaXN0b3J5U2Nyb2xsRGl2OiBKUXVlcnk8SFRNTERpdkVsZW1lbnQ+O1xyXG5cclxuICAgICRsZWZ0VXBwZXJEaXY6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47IC8vIGNvbnRhaW5zIGZpbGUgbGlzdCBoZWFkZXIsIGZpbGUgbGlzdCBhbmQgZmlsZSBsaXN0IGZvb3RlclxyXG5cclxuICAgICRmaWxlTGlzdEhlYWRlck91dGVyRGl2OiBKUXVlcnk8SFRNTERpdkVsZW1lbnQ+O1xyXG4gICAgJGZpbGVMaXN0SGVhZGVyRGl2czogSlF1ZXJ5PEhUTUxEaXZFbGVtZW50PltdID0gW107XHJcblxyXG4gICAgJGZpbGVMaXN0SGVhZGVyQ29udGFpbmVyUmlnaHQ6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47XHJcblxyXG4gICAgJHVwZGF0ZUFsbEJ1dHRvbjogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuICAgICRjb21taXRBbGxCdXR0b246IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcblxyXG5cclxuICAgICRmaWxlTGlzdE91dGVyRGl2OiBKUXVlcnk8SFRNTERpdkVsZW1lbnQ+O1xyXG4gICAgJGZpbGVMaXN0RGl2czogSlF1ZXJ5PEhUTUxEaXZFbGVtZW50PltdID0gW107XHJcblxyXG4gICAgJGZpbGVMaXN0Rm9vdGVyRGl2OiBKUXVlcnk8SFRNTERpdkVsZW1lbnQ+O1xyXG5cclxuICAgICRlZGl0b3JEaXY6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47XHJcblxyXG4gICAgZ3VpUmVhZHk6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIGRpZmZFZGl0b3I6IG1vbmFjby5lZGl0b3IuSVN0YW5kYWxvbmVEaWZmRWRpdG9yO1xyXG5cclxuICAgIGN1cnJlbnRVc2VyU3luY2hyb1dvcmtzcGFjZTogU3luY2hyb1dvcmtzcGFjZTtcclxuICAgIGN1cnJlbnRSZXBvc2l0b3J5U3luY2hyb1dvcmtzcGFjZTogU3luY2hyb1dvcmtzcGFjZTtcclxuICAgIGN1cnJlbnRSZXBvc2l0b3J5OiBSZXBvc2l0b3J5O1xyXG5cclxuICAgIGxlZnRTeW5jaHJvV29ya3NwYWNlOiBTeW5jaHJvV29ya3NwYWNlO1xyXG4gICAgcmlnaHRTeW5jaHJvV29ya3NwYWNlOiBTeW5jaHJvV29ya3NwYWNlO1xyXG5cclxuICAgIGxhc3RTaG93blN5bmNocm9uaXphdGlvbkVsZW1lbnQ6IFN5bmNocm9uaXphdGlvbkxpc3RFbGVtZW50O1xyXG4gICAgc3luY2hyb25pemF0aW9uTGlzdEVsZW1lbnRzOiBTeW5jaHJvbml6YXRpb25MaXN0RWxlbWVudFtdID0gW107XHJcblxyXG4gICAgbGFzdFNob3duSGlzdG9yeUVsZW1lbnQ6IEhpc3RvcnlFbGVtZW50O1xyXG4gICAgaGlzdG9yeUVsZW1lbnRzOiBIaXN0b3J5RWxlbWVudFtdID0gW107XHJcblxyXG4gICAgdGltZXI6IGFueTtcclxuXHJcbiAgICByZXBvc2l0b3J5SXNXcml0YWJsZTogYm9vbGVhbjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgbWFpbjogTWFpbikge1xyXG4gICAgfVxyXG5cclxuICAgIHN5bmNocm9uaXplV2l0aFdvcmtzcGFjZSh3b3Jrc3BhY2U6IFdvcmtzcGFjZSkge1xyXG5cclxuICAgICAgICB0aGlzLmdhaW5SZXBvc2l0b3J5TG9jayh3b3Jrc3BhY2UucmVwb3NpdG9yeV9pZCwgKHN1Y2Nlc3MpID0+IHtcclxuICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVwb3NpdG9yeUlzV3JpdGFibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hUb1dvcmtzcGFjZUFuZFJlcG9zaXRvcnkod29ya3NwYWNlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvdygpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2FpblJlcG9zaXRvcnlMb2NrKHRoaXMuY3VycmVudFJlcG9zaXRvcnkuaWQsIChzdWNjZXNzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ0RlciBTZXJ2ZXIgaXN0IHRlbXBvcsOkciBuaWNodCBlcnJlaWNoYmFyLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkuYmFjaygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICB9LCAxMDAwMClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFVzZXIgaGFzIG5vIHdyaXRlIHBlcm1pc3Npb24gdG8gcmVwb3NpdG9yeSA9PiBubyBsb2NrIG5lZWRlZC5cclxuICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoVG9Xb3Jrc3BhY2VBbmRSZXBvc2l0b3J5KHdvcmtzcGFjZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlcG9zaXRvcnlJc1dyaXRhYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3coKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnYWluUmVwb3NpdG9yeUxvY2socmVwb3NpdG9yeV9pZDogbnVtYmVyLCBjYWxsYmFjazogKHN1Y2Nlc3M6IGJvb2xlYW4pID0+IHZvaWQpIHtcclxuICAgICAgICBsZXQgcmVxdWVzdDogR2FpblJlcG9zaXRvcnlMb2NrUmVxdWVzdCA9IHsgcmVwb3NpdG9yeV9pZDogcmVwb3NpdG9yeV9pZCB9O1xyXG4gICAgICAgIGFqYXgoJ2dhaW5SZXBvc2l0b3J5TG9jaycsIHJlcXVlc3QsIChyZXNwb25zZTogR2FpblJlcG9zaXRvcnlMb2NrUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2Uuc3VjY2Vzcyk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiTG9jayBmb3IgcmVwb3NpdG9yeV9pZCBcIiArIHJlcG9zaXRvcnlfaWQgKyBcIiBoYXMgYmVlbiBncmFudGVkLlwiKVxyXG4gICAgICAgIH0sIChtZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgIGFsZXJ0KG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXR0YWNoVG9Xb3Jrc3BhY2VBbmRSZXBvc2l0b3J5KHdvcmtzcGFjZTogV29ya3NwYWNlKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFVzZXJTeW5jaHJvV29ya3NwYWNlID0gbmV3IFN5bmNocm9Xb3Jrc3BhY2UodGhpcykuY29weUZyb21Xb3Jrc3BhY2Uod29ya3NwYWNlKTtcclxuICAgICAgICB0aGlzLmxlZnRTeW5jaHJvV29ya3NwYWNlID0gdGhpcy5jdXJyZW50VXNlclN5bmNocm9Xb3Jrc3BhY2U7XHJcblxyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgbGV0IHJlcXVlc3Q6IEdldFJlcG9zaXRvcnlSZXF1ZXN0ID0geyByZXBvc2l0b3J5X2lkOiB3b3Jrc3BhY2UucmVwb3NpdG9yeV9pZCwgd29ya3NwYWNlX2lkOiB3b3Jrc3BhY2UuaWQgfTtcclxuICAgICAgICBhamF4KFwiZ2V0UmVwb3NpdG9yeVwiLCByZXF1ZXN0LCAocmVzcG9uc2U6IEdldFJlcG9zaXRvcnlSZXNwb25zZSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgdGhhdC5hdHRhY2hUb1JlcG9zaXRvcnkocmVzcG9uc2UucmVwb3NpdG9yeSk7XHJcblxyXG4gICAgICAgIH0sIChtZXNzYWdlOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgYWxlcnQobWVzc2FnZSk7XHJcbiAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LmJhY2soKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBhdHRhY2hUb1JlcG9zaXRvcnkocmVwb3NpdG9yeTogUmVwb3NpdG9yeSkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFJlcG9zaXRvcnkgPSByZXBvc2l0b3J5O1xyXG4gICAgICAgIFJlcG9zaXRvcnlUb29sLmRlc2VyaWFsaXplUmVwb3NpdG9yeSh0aGlzLmN1cnJlbnRSZXBvc2l0b3J5KTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRSZXBvc2l0b3J5U3luY2hyb1dvcmtzcGFjZSA9IG5ldyBTeW5jaHJvV29ya3NwYWNlKHRoaXMpLmNvcHlGcm9tUmVwb3NpdG9yeSh0aGlzLmN1cnJlbnRSZXBvc2l0b3J5LCB0cnVlKTtcclxuXHJcbiAgICAgICAgdGhpcy5yaWdodFN5bmNocm9Xb3Jrc3BhY2UgPSB0aGlzLmN1cnJlbnRSZXBvc2l0b3J5U3luY2hyb1dvcmtzcGFjZTtcclxuICAgICAgICB0aGlzLnNldHVwU3luY2hyb25pemF0aW9uTGlzdEVsZW1lbnRzKCk7XHJcbiAgICAgICAgdGhpcy5zZXR1cEhpc3RvcnlFbGVtZW50cygpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldHVwSGlzdG9yeUVsZW1lbnRzKCkge1xyXG4gICAgICAgIHRoaXMuJGhpc3RvcnlTY3JvbGxEaXYuZW1wdHkoKTtcclxuICAgICAgICB0aGlzLmhpc3RvcnlFbGVtZW50cyA9IFtdO1xyXG4gICAgICAgIHRoaXMubGFzdFNob3duSGlzdG9yeUVsZW1lbnQgPSBudWxsO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRSZXBvc2l0b3J5Lmhpc3RvcnlFbnRyaWVzLmZvckVhY2goKGhlLCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmhpc3RvcnlFbGVtZW50cy5wdXNoKG5ldyBIaXN0b3J5RWxlbWVudCh0aGlzLCB0aGlzLmN1cnJlbnRSZXBvc2l0b3J5LCBoZSwgaW5kZXgpKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZXR1cFN5bmNocm9uaXphdGlvbkxpc3RFbGVtZW50cygpIHtcclxuXHJcbiAgICAgICAgbGV0IGxhc3RTeW5jaHJvRmlsZUxlZnQgPSBudWxsO1xyXG4gICAgICAgIGxldCBsYXN0U3luY2hyb0ZpbGVSaWdodCA9IG51bGw7XHJcbiAgICAgICAgaWYgKHRoaXMubGFzdFNob3duU3luY2hyb25pemF0aW9uRWxlbWVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxhc3RTeW5jaHJvRmlsZUxlZnQgPSB0aGlzLmxhc3RTaG93blN5bmNocm9uaXphdGlvbkVsZW1lbnQubGVmdFN5bmNocm9GaWxlO1xyXG4gICAgICAgICAgICBsYXN0U3luY2hyb0ZpbGVSaWdodCA9IHRoaXMubGFzdFNob3duU3luY2hyb25pemF0aW9uRWxlbWVudC5yaWdodFN5bmNocm9GaWxlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy4kZmlsZUxpc3REaXZzLmZvckVhY2goJGRpdiA9PiAkZGl2LmVtcHR5KCkpO1xyXG5cclxuICAgICAgICB0aGlzLnN5bmNocm9uaXphdGlvbkxpc3RFbGVtZW50cy5mb3JFYWNoKHNlID0+IHNlLmVtcHR5R1VJKCkpO1xyXG4gICAgICAgIHRoaXMuc3luY2hyb25pemF0aW9uTGlzdEVsZW1lbnRzID0gW107XHJcbiAgICAgICAgdGhpcy5sYXN0U2hvd25TeW5jaHJvbml6YXRpb25FbGVtZW50ID0gbnVsbDtcclxuXHJcbiAgICAgICAgbGV0IGZpbGVFbGVtZW50czogRmlsZUVsZW1lbnRbXSA9IFtdO1xyXG4gICAgICAgIGxldCBzeW5jaHJvRmlsZU1hcDogeyBbaWQ6IHN0cmluZ106IEZpbGVFbGVtZW50IH0gPSB7fTtcclxuXHJcbiAgICAgICAgdGhpcy5sZWZ0U3luY2hyb1dvcmtzcGFjZS5maWxlcy5mb3JFYWNoKHNmaWxlID0+IHtcclxuICAgICAgICAgICAgbGV0IGZpbGVFbGVtZW50ID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHNmaWxlLmlkSW5zaWRlUmVwb3NpdG9yeSxcclxuICAgICAgICAgICAgICAgIG5hbWU6IHNmaWxlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICBsZWZ0U3luY2hyb0ZpbGU6IHNmaWxlLFxyXG4gICAgICAgICAgICAgICAgcmlnaHRTeW5jaHJvRmlsZTogbnVsbFxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZmlsZUVsZW1lbnRzLnB1c2goZmlsZUVsZW1lbnQpO1xyXG4gICAgICAgICAgICBpZiAoc2ZpbGUuaWRJbnNpZGVSZXBvc2l0b3J5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHN5bmNocm9GaWxlTWFwW1wiclwiICsgc2ZpbGUuaWRJbnNpZGVSZXBvc2l0b3J5XSA9IGZpbGVFbGVtZW50O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3luY2hyb0ZpbGVNYXBbXCJ3XCIgKyBzZmlsZS5pZEluc2lkZVdvcmtzcGFjZV0gPSBmaWxlRWxlbWVudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLnJpZ2h0U3luY2hyb1dvcmtzcGFjZS5maWxlcy5mb3JFYWNoKHNmaWxlID0+IHtcclxuICAgICAgICAgICAgbGV0IGZpbGVFbGVtZW50OiBGaWxlRWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgICAgIGlmIChzZmlsZS5pZEluc2lkZVJlcG9zaXRvcnkgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICBmaWxlRWxlbWVudCA9IHN5bmNocm9GaWxlTWFwW1wiclwiICsgc2ZpbGUuaWRJbnNpZGVSZXBvc2l0b3J5XTtcclxuICAgICAgICAgICAgfSAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmaWxlRWxlbWVudCA9IHN5bmNocm9GaWxlTWFwW1wid1wiICsgc2ZpbGUuaWRJbnNpZGVXb3Jrc3BhY2VdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChmaWxlRWxlbWVudCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBmaWxlRWxlbWVudCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogc2ZpbGUuaWRJbnNpZGVSZXBvc2l0b3J5LFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHNmaWxlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdFN5bmNocm9GaWxlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0U3luY2hyb0ZpbGU6IHNmaWxlXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgZmlsZUVsZW1lbnRzLnB1c2goZmlsZUVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZmlsZUVsZW1lbnQucmlnaHRTeW5jaHJvRmlsZSA9IHNmaWxlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGZpbGVFbGVtZW50cy5zb3J0KChmZTEsIGZlMikgPT4gZmUxLm5hbWUubG9jYWxlQ29tcGFyZShmZTIubmFtZSkpO1xyXG5cclxuICAgICAgICBmaWxlRWxlbWVudHMuZm9yRWFjaChmZSA9PiB7XHJcblxyXG4gICAgICAgICAgICBsZXQgc3luY2hyb0xpc3RFbGVtZW50ID0gbmV3IFN5bmNocm9uaXphdGlvbkxpc3RFbGVtZW50KHRoaXMsIGZlLmxlZnRTeW5jaHJvRmlsZSwgZmUucmlnaHRTeW5jaHJvRmlsZSwgdGhpcy5sZWZ0U3luY2hyb1dvcmtzcGFjZSwgdGhpcy5yaWdodFN5bmNocm9Xb3Jrc3BhY2UpO1xyXG4gICAgICAgICAgICB0aGlzLnN5bmNocm9uaXphdGlvbkxpc3RFbGVtZW50cy5wdXNoKHN5bmNocm9MaXN0RWxlbWVudCk7XHJcbiAgICAgICAgICAgIHN5bmNocm9MaXN0RWxlbWVudC5jb21wYXJlRmlsZXNBbmRBZGFwdEdVSSgpO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5kaWZmRWRpdG9yLnNldE1vZGVsKHtcclxuICAgICAgICAgICAgb3JpZ2luYWw6IG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoXCJXw6RobGVuIFNpZSBvYmVuIGVpbmUgRGF0ZWkgYXVzIVwiLCBcIm15SmF2YVwiKSxcclxuICAgICAgICAgICAgbW9kaWZpZWQ6IG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoXCJXw6RobGVuIFNpZSBvYmVuIGVpbmUgRGF0ZWkgYXVzIVwiLCBcIm15SmF2YVwiKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmRpZmZFZGl0b3IudXBkYXRlT3B0aW9ucyh7XHJcbiAgICAgICAgICAgIG9yaWdpbmFsRWRpdGFibGU6IGZhbHNlXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubGVmdFN5bmNocm9Xb3Jrc3BhY2UgPT0gdGhpcy5jdXJyZW50VXNlclN5bmNocm9Xb3Jrc3BhY2UpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRIZWFkZXIoXCJsZWZ0XCIsIFwiRGVpbiBXb3Jrc3BhY2U6XCIpO1xyXG4gICAgICAgICAgICB0aGlzLiRiYWNrVG9Xb3Jrc3BhY2VCdXR0b24uaGlkZSgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0SGVhZGVyKFwibGVmdFwiLCB0aGlzLmxlZnRTeW5jaHJvV29ya3NwYWNlLm5hbWUgKyBcIjpcIik7XHJcbiAgICAgICAgICAgIHRoaXMuJGJhY2tUb1dvcmtzcGFjZUJ1dHRvbi5zaG93KCk7XHJcbiAgICAgICAgICAgIHRoaXMuJHdyaXRlV29ya3NwYWNlQ2hhbmdlc0J1dHRvbi5oaWRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yaWdodFN5bmNocm9Xb3Jrc3BhY2UgPT0gdGhpcy5jdXJyZW50UmVwb3NpdG9yeVN5bmNocm9Xb3Jrc3BhY2UpIHtcclxuICAgICAgICAgICAgbGV0IHdyaXRhYmxlOiBzdHJpbmcgPSB0aGlzLnJlcG9zaXRvcnlJc1dyaXRhYmxlID8gXCIsIG1pdCBTY2hyZWlienVncmlmZlwiIDogXCIsIG9obmUgU2NocmVpYnp1Z3JpZmZcIjtcclxuICAgICAgICAgICAgdGhpcy5zZXRIZWFkZXIoXCJyaWdodFwiLCBcIlJlcG9zaXRvcnkgKGFrdHVlbGxlIFZlcnNpb25cIiArIHdyaXRhYmxlICsgXCIpOlwiKTtcclxuICAgICAgICAgICAgdGhpcy4kYmFja1RvQ3VycmVudFJlcG9zaXRvcnlWZXJzaW9uQnV0dG9uLmhpZGUoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNldEhlYWRlcihcInJpZ2h0XCIsIHRoaXMucmlnaHRTeW5jaHJvV29ya3NwYWNlLm5hbWUgKyBcIjpcIik7XHJcbiAgICAgICAgICAgIHRoaXMuJGJhY2tUb0N1cnJlbnRSZXBvc2l0b3J5VmVyc2lvbkJ1dHRvbi5zaG93KCk7XHJcbiAgICAgICAgICAgIHRoaXMuJHdyaXRlUmVwb3NpdG9yeUNoYW5nZXNCdXR0b24uaGlkZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgalF1ZXJ5KCcjam9fc3luY2hyb19tYWluX2hlYWRpbmdfdGV4dCcpLnRleHQoYFN5bmNocm9uaXNpZXJlbiBtaXQgUmVwb3NpdG9yeSBcIiR7dGhpcy5jdXJyZW50UmVwb3NpdG9yeS5uYW1lfVwiYCk7XHJcblxyXG4gICAgICAgIGxldCBsYXN0RmlsZVNlbGVjdGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgaWYgKGxhc3RTeW5jaHJvRmlsZUxlZnQgIT0gbnVsbCB8fCBsYXN0U3luY2hyb0ZpbGVSaWdodCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHNsZSBvZiB0aGlzLnN5bmNocm9uaXphdGlvbkxpc3RFbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgICAgIHNsZS5sZWZ0U3luY2hyb0ZpbGUgIT0gbnVsbCAmJiBzbGUubGVmdFN5bmNocm9GaWxlID09IGxhc3RTeW5jaHJvRmlsZUxlZnQgfHxcclxuICAgICAgICAgICAgICAgICAgICBzbGUucmlnaHRTeW5jaHJvRmlsZSAhPSBudWxsICYmIHNsZS5yaWdodFN5bmNocm9GaWxlID09IGxhc3RTeW5jaHJvRmlsZVJpZ2h0XHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBzbGUuc2VsZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFzdEZpbGVTZWxlY3RlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghbGFzdEZpbGVTZWxlY3RlZCAmJiB0aGlzLnN5bmNocm9uaXphdGlvbkxpc3RFbGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3luY2hyb25pemF0aW9uTGlzdEVsZW1lbnRzWzBdLnNlbGVjdCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICBpZiAoIXRoaXMuZ3VpUmVhZHkpIHtcclxuICAgICAgICAgICAgdGhpcy5pbml0R1VJKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCAkc3luY2hyb0RpdiA9IGpRdWVyeSgnI3N5bmNocm9uaXplLWRpdicpO1xyXG4gICAgICAgICRzeW5jaHJvRGl2LmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XHJcbiAgICAgICAgbGV0ICRtYWluRGl2ID0galF1ZXJ5KCcjbWFpbicpO1xyXG4gICAgICAgICRtYWluRGl2LmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcclxuXHJcbiAgICAgICAgdGhpcy4kd3JpdGVXb3Jrc3BhY2VDaGFuZ2VzQnV0dG9uLmhpZGUoKTtcclxuICAgICAgICB0aGlzLiR3cml0ZVJlcG9zaXRvcnlDaGFuZ2VzQnV0dG9uLmhpZGUoKTtcclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMubWFpbi53aW5kb3dTdGF0ZU1hbmFnZXIucmVnaXN0ZXJPbmVUaW1lQmFja0J1dHRvbkxpc3RlbmVyKCgpID0+IHtcclxuICAgICAgICAgICAgdGhhdC5oaWRlKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaGlkZSgpIHtcclxuICAgICAgICBsZXQgJHN5bmNocm9EaXYgPSBqUXVlcnkoJyNzeW5jaHJvbml6ZS1kaXYnKTtcclxuICAgICAgICAkc3luY2hyb0Rpdi5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XHJcbiAgICAgICAgbGV0ICRtYWluRGl2ID0galF1ZXJ5KCcjbWFpbicpO1xyXG4gICAgICAgICRtYWluRGl2LmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XHJcblxyXG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XHJcblxyXG4gICAgICAgIGlmKHRoaXMuY3VycmVudFJlcG9zaXRvcnkgPT0gbnVsbCkgcmV0dXJuOyAgIC8vIFRlc3R1c2VyLi4uXHJcblxyXG4gICAgICAgIGxldCByZXF1ZXN0OiBMZWFzZVJlcG9zaXRvcnlMb2NrUmVxdWVzdCA9IHsgcmVwb3NpdG9yeV9pZDogdGhpcy5jdXJyZW50UmVwb3NpdG9yeS5pZCB9O1xyXG4gICAgICAgIGFqYXgoJ2xlYXNlUmVwb3NpdG9yeUxvY2snLCByZXF1ZXN0LCAocmVzcG9uc2U6IExlYXNlUmVwb3NpdG9yeUxvY2tSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkxvY2sgZm9yIHJlcG9zaXRvcnlfaWQgXCIgKyByZXF1ZXN0LnJlcG9zaXRvcnlfaWQgKyBcIiBoYXMgYmVlbiByZWxlYXNlZC5cIilcclxuICAgICAgICB9LCAobWVzc2FnZSkgPT4ge1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGluaXRHVUkoKSB7XHJcbiAgICAgICAgdGhpcy5ndWlSZWFkeSA9IHRydWU7XHJcbiAgICAgICAgbGV0ICRzeW5jaHJvRGl2ID0galF1ZXJ5KCcjc3luY2hyb25pemUtZGl2Jyk7XHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICAkc3luY2hyb0Rpdi5hcHBlbmQoXHJcblxyXG4gICAgICAgICAgICB0aGlzLiRtYWluSGVhZGluZ0RpdiA9IGpRdWVyeSgnPGRpdiBpZD1cImpvX3N5bmNocm9fbWFpbl9oZWFkaW5nXCI+PHNwYW4gaWQ9XCJqb19zeW5jaHJvX21haW5faGVhZGluZ190ZXh0XCI+SmF2YS1PbmxpbmU6IFdvcmtzcGFjZSBtaXQgUmVwb3NpdG9yeSBzeW5jaHJvbmlzaWVyZW48L3NwYW4+PC9kaXY+JyksXHJcblxyXG4gICAgICAgICAgICB0aGlzLiRiZWxvd01haW5IZWFkaW5nRGl2ID0gbWFrZURpdihcImpvX3N5bmNocm9fYmVsb3dfbWFpbl9oZWFkaW5nXCIpKTtcclxuXHJcbiAgICAgICAgbGV0ICRidXR0b25zVG9wUmlnaHREaXYgPSBtYWtlRGl2KFwiam9fc3luY2hyb19idXR0b25zVG9wUmlnaHRcIik7XHJcbiAgICAgICAgdGhpcy4kbWFpbkhlYWRpbmdEaXYuYXBwZW5kKCRidXR0b25zVG9wUmlnaHREaXYpO1xyXG5cclxuICAgICAgICAkYnV0dG9uc1RvcFJpZ2h0RGl2LmFwcGVuZCh0aGlzLiRleGl0QnV0dG9uID0galF1ZXJ5KCc8ZGl2IGlkPVwiam9fc3luY2hyb19leGl0QnV0dG9uXCIgY2xhc3M9XCJqb19zeW5jaHJvX2J1dHRvblwiPlp1csO8Y2sgenVtIFByb2dyYW1taWVyZW48L2Rpdj4nKSk7XHJcblxyXG4gICAgICAgIHRoaXMuJGV4aXRCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5iYWNrKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuJGxlZnREaXYgPSBtYWtlRGl2KFwiam9fc3luY2hyb19sZWZ0RGl2XCIpO1xyXG4gICAgICAgIHRoaXMuJGhpc3RvcnlPdXRlckRpdiA9IG1ha2VEaXYoXCJqb19zeW5jaHJvX2hpc3RvcnlPdXRlckRpdlwiKTtcclxuXHJcbiAgICAgICAgdGhpcy4kaGlzdG9yeU91dGVyRGl2LmFwcGVuZChqUXVlcnkoJzxkaXYgaWQ9XCJqb19zeW5jaHJvX2hpc3RvcnlIZWFkZXJcIj48ZGl2IGNsYXNzPVwiam9fc3luY2hyb190YWJIZWFkaW5nXCI+SGlzdG9yeTo8L2Rpdj48L2Rpdj4pJykpO1xyXG5cclxuICAgICAgICB0aGlzLiRiZWxvd01haW5IZWFkaW5nRGl2LmFwcGVuZCh0aGlzLiRsZWZ0RGl2LCB0aGlzLiRoaXN0b3J5T3V0ZXJEaXYpO1xyXG5cclxuICAgICAgICBuZXcgRW1iZWRkZWRTbGlkZXIodGhpcy4kaGlzdG9yeU91dGVyRGl2LCB0cnVlLCBmYWxzZSwgKCkgPT4geyB0aGlzLmRpZmZFZGl0b3IubGF5b3V0KCk7IH0pLiRzbGlkZXJEaXYuY3NzKCdsZWZ0JywgJy0zcHgnKTtcclxuICAgICAgICB0aGlzLiRoaXN0b3J5T3V0ZXJEaXYuZmluZCgnLmpvZV9zbGlkZXInKS5jc3MoJ3Bvc2l0aW9uJywgJ2Fic29sdXRlJyk7XHJcblxyXG4gICAgICAgIHRoaXMuJGhpc3RvcnlTY3JvbGxEaXYgPSBtYWtlRGl2KFwiaGlzdG9yeVNjcm9sbERpdlwiLCBcImpvX3Njcm9sbGFibGVcIik7XHJcbiAgICAgICAgdGhpcy4kaGlzdG9yeU91dGVyRGl2LmFwcGVuZCh0aGlzLiRoaXN0b3J5U2Nyb2xsRGl2KTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuJGxlZnREaXYuYXBwZW5kKFxyXG4gICAgICAgICAgICB0aGlzLiRsZWZ0VXBwZXJEaXYgPSBtYWtlRGl2KFwiam9fc3luY2hyb19sZWZ0VXBwZXJcIiksXHJcbiAgICAgICAgICAgIHRoaXMuJGVkaXRvckRpdiA9IG1ha2VEaXYoXCJqb19zeW5jaHJvX2VkaXRvclwiKVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHRoaXMuJGxlZnRVcHBlckRpdi5hcHBlbmQoXHJcbiAgICAgICAgICAgIHRoaXMuJGZpbGVMaXN0SGVhZGVyT3V0ZXJEaXYgPSBtYWtlRGl2KFwiam9fc3luY2hyb19maWxlTGlzdEhlYWRlck91dGVyXCIpLFxyXG4gICAgICAgICAgICB0aGlzLiRmaWxlTGlzdE91dGVyRGl2ID0gbWFrZURpdihcImpvX3N5bmNocm9fZmlsZUxpc3RPdXRlclwiLCBcImpvX3Njcm9sbGFibGVcIiksXHJcbiAgICAgICAgICAgIHRoaXMuJGZpbGVMaXN0Rm9vdGVyRGl2ID0gbWFrZURpdihcImpvX3N5bmNocm9fZmlsZUxpc3RGb290ZXJcIilcclxuICAgICAgICApXHJcblxyXG4gICAgICAgIHRoaXMuJGZpbGVMaXN0SGVhZGVyQ29udGFpbmVyUmlnaHQgPSBtYWtlRGl2KG51bGwsIFwiam9fc3luY2hyb19maWxlTGlzdEhlYWRlckNvbnRhaW5lclJpZ2h0XCIpO1xyXG4gICAgICAgIGxldCBmaWxlTGlzdEhlYWRlclJpZ2h0ID0gbWFrZURpdihudWxsLCBcImpvX3N5bmNocm9fZmlsZUxpc3RIZWFkZXJcIik7XHJcbiAgICAgICAgdGhpcy4kZmlsZUxpc3RIZWFkZXJDb250YWluZXJSaWdodC5hcHBlbmQoZmlsZUxpc3RIZWFkZXJSaWdodCk7XHJcblxyXG4gICAgICAgIGxldCAkZmlsZUxpc3RIZWFkZXJDZW50ZXIgPSBtYWtlRGl2KG51bGwsIFwiam9fc3luY2hyb19maWxlTGlzdEhlYWRlckNlbnRlclwiKTtcclxuICAgICAgICAkZmlsZUxpc3RIZWFkZXJDZW50ZXIuYXBwZW5kKHRoaXMuJHVwZGF0ZUFsbEJ1dHRvbiA9IFN5bmNocm9uaXphdGlvbkxpc3RFbGVtZW50Lm1ha2VCdXR0b24oXCJ1cGRhdGVBbGxcIiwgXCJsZWZ0XCIsICgpID0+IHsgdGhhdC51cGRhdGVBbGwoKSB9LCBmYWxzZSkpO1xyXG4gICAgICAgICRmaWxlTGlzdEhlYWRlckNlbnRlci5hcHBlbmQodGhpcy4kY29tbWl0QWxsQnV0dG9uID0gU3luY2hyb25pemF0aW9uTGlzdEVsZW1lbnQubWFrZUJ1dHRvbihcImNvbW1pdEFsbFwiLCBcInJpZ2h0XCIsICgpID0+IHsgdGhhdC5jb21taXRBbGwoKSB9LCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLiRmaWxlTGlzdEhlYWRlckRpdnMucHVzaChtYWtlRGl2KG51bGwsIFwiam9fc3luY2hyb19maWxlTGlzdEhlYWRlclwiLCBcIlwiLCB7IFwiZmxleFwiOiBcIjIgMFwiIH0pLCAkZmlsZUxpc3RIZWFkZXJDZW50ZXIsIHRoaXMuJGZpbGVMaXN0SGVhZGVyQ29udGFpbmVyUmlnaHQsIG1ha2VEaXYobnVsbCwgXCJqb19zeW5jaHJvX3Njcm9sbGJhclBsYWNlaG9sZGVyXCIpKTtcclxuICAgICAgICB0aGlzLiRmaWxlTGlzdERpdnMucHVzaChtYWtlRGl2KG51bGwsIFwiam9fc3luY2hyb19maWxlTGlzdFwiKSwgbWFrZURpdihudWxsLCBcImpvX3N5bmNocm9fZmlsZUxpc3RCdXR0b25zTGVmdFwiKSwgbWFrZURpdihudWxsLCBcImpvX3N5bmNocm9fZmlsZUxpc3RCdXR0b25zUmlnaHRcIiksIG1ha2VEaXYobnVsbCwgXCJqb19zeW5jaHJvX2ZpbGVMaXN0XCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy4kZmlsZUxpc3RIZWFkZXJPdXRlckRpdi5hcHBlbmQodGhpcy4kZmlsZUxpc3RIZWFkZXJEaXZzKTtcclxuICAgICAgICB0aGlzLiRmaWxlTGlzdE91dGVyRGl2LmFwcGVuZCh0aGlzLiRmaWxlTGlzdERpdnMpO1xyXG5cclxuICAgICAgICB0aGlzLiRmaWxlTGlzdEhlYWRlckRpdnNbMF0uYXBwZW5kKFwiPGRpdiBjbGFzcz0nam9fc3luY2hyb190YWJIZWFkaW5nJz5EZWluIFdvcmtzcGFjZTo8L2Rpdj5cIik7XHJcbiAgICAgICAgZmlsZUxpc3RIZWFkZXJSaWdodC5hcHBlbmQoXCI8ZGl2IGNsYXNzPSdqb19zeW5jaHJvX3RhYkhlYWRpbmcnPlJlcG9zaXRvcnkgKGFrdHVlbGxlIFZlcnNpb24pOjwvZGl2PlwiKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuJGZpbGVMaXN0SGVhZGVyRGl2c1swXS5hcHBlbmQodGhpcy4kYmFja1RvV29ya3NwYWNlQnV0dG9uID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fc3luY2hyb19idXR0b24gam9fc3luY2hyb19iYWNrVG9CdXR0b25cIj5aZWlnZSBlaWdlbmVuIFdvcmtzcGFjZTwvZGl2PicpKTtcclxuICAgICAgICB0aGlzLiRiYWNrVG9Xb3Jrc3BhY2VCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGF0LmJhY2tUb1dvcmtzcGFjZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuJGJhY2tUb1dvcmtzcGFjZUJ1dHRvbi5oaWRlKCk7XHJcblxyXG5cclxuXHJcblxyXG4gICAgICAgIGZpbGVMaXN0SGVhZGVyUmlnaHQuYXBwZW5kKHRoaXMuJGJhY2tUb0N1cnJlbnRSZXBvc2l0b3J5VmVyc2lvbkJ1dHRvbiA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX3N5bmNocm9fYnV0dG9uIGpvX3N5bmNocm9fYmFja1RvQnV0dG9uXCI+WmVpZ2UgYWt0dWVsbGUgUmVwb3NpdG9yeS1WZXJzaW9uPC9kaXY+JykpO1xyXG4gICAgICAgIHRoaXMuJGJhY2tUb0N1cnJlbnRSZXBvc2l0b3J5VmVyc2lvbkJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoYXQuYmFja1RvQ3VycmVudFJlcG9zaXRvcnlWZXJzaW9uKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy4kYmFja1RvV29ya3NwYWNlQnV0dG9uLmhpZGUoKTtcclxuXHJcbiAgICAgICAgdGhpcy4kZmlsZUxpc3RIZWFkZXJEaXZzWzBdLmFwcGVuZCh0aGlzLiR3cml0ZVdvcmtzcGFjZUNoYW5nZXNCdXR0b24gPSBqUXVlcnkoJzxkaXYgaWQ9XCJqb19zeW5jaHJvX3dyaXRlQ2hhbmdlc0J1dHRvblwiIGNsYXNzPVwiam9fc3luY2hyb19idXR0b25cIj7DhG5kZXJ1bmdlbiBhbSBXb3Jrc3BhY2UgKHJvdCEpIHNwZWljaGVybjwvZGl2PicpKTtcclxuICAgICAgICB0aGlzLiR3cml0ZVdvcmtzcGFjZUNoYW5nZXNCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGF0LndyaXRlV29ya3NwYWNlQ2hhbmdlcygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuJHdyaXRlV29ya3NwYWNlQ2hhbmdlc0J1dHRvbi5oaWRlKCk7XHJcblxyXG4gICAgICAgIGZpbGVMaXN0SGVhZGVyUmlnaHQuYXBwZW5kKHRoaXMuJHdyaXRlUmVwb3NpdG9yeUNoYW5nZXNCdXR0b24gPSBqUXVlcnkoJzxkaXYgaWQ9XCJqb19zeW5jaHJvX3dyaXRlQ2hhbmdlc0J1dHRvblwiIGNsYXNzPVwiam9fc3luY2hyb19idXR0b25cIj7DhG5kZXJ1bmdlbiBhbSBSZXBvc2l0b3J5IChyb3QhKSBzcGVpY2hlcm48L2Rpdj4nKSk7XHJcbiAgICAgICAgdGhpcy4kd3JpdGVSZXBvc2l0b3J5Q2hhbmdlc0J1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoYXQud3JpdGVSZXBvc2l0b3J5Q2hhbmdlcygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuJHdyaXRlUmVwb3NpdG9yeUNoYW5nZXNCdXR0b24uaGlkZSgpO1xyXG5cclxuXHJcblxyXG5cclxuICAgICAgICBsZXQgaG9yaXpvbnRhbFNsaWRlciA9IG5ldyBFbWJlZGRlZFNsaWRlcih0aGlzLiRlZGl0b3JEaXYsIHRydWUsIHRydWUsICgpID0+IHsgdGhpcy5kaWZmRWRpdG9yLmxheW91dCgpOyB9KTtcclxuICAgICAgICBob3Jpem9udGFsU2xpZGVyLnNldENvbG9yKCd2YXIoLS1zbGlkZXIpJyk7XHJcblxyXG4gICAgICAgIHRoaXMubWFrZURyb3BwYWJsZShcImxlZnRcIiwgdGhpcy4kZmlsZUxpc3REaXZzWzBdKTtcclxuICAgICAgICB0aGlzLm1ha2VEcm9wcGFibGUoXCJyaWdodFwiLCB0aGlzLiRmaWxlTGlzdERpdnNbM10pO1xyXG5cclxuICAgICAgICB0aGlzLmluaXRFZGl0b3IoKTtcclxuICAgIH1cclxuXHJcbiAgICBiYWNrVG9Xb3Jrc3BhY2UoKSB7XHJcbiAgICAgICAgdGhpcy5sZWZ0U3luY2hyb1dvcmtzcGFjZSA9IHRoaXMuY3VycmVudFVzZXJTeW5jaHJvV29ya3NwYWNlO1xyXG4gICAgICAgIHRoaXMuc2V0dXBTeW5jaHJvbml6YXRpb25MaXN0RWxlbWVudHMoKTtcclxuICAgICAgICB0aGlzLm9uQ29udGVudENoYW5nZWQoXCJsZWZ0XCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGJhY2tUb0N1cnJlbnRSZXBvc2l0b3J5VmVyc2lvbigpIHtcclxuICAgICAgICB0aGlzLnJpZ2h0U3luY2hyb1dvcmtzcGFjZSA9IHRoaXMuY3VycmVudFJlcG9zaXRvcnlTeW5jaHJvV29ya3NwYWNlO1xyXG4gICAgICAgIHRoaXMuc2V0dXBTeW5jaHJvbml6YXRpb25MaXN0RWxlbWVudHMoKTtcclxuICAgICAgICB0aGlzLm9uQ29udGVudENoYW5nZWQoXCJyaWdodFwiKTtcclxuICAgIH1cclxuXHJcbiAgICBtYWtlRHJvcHBhYmxlKGxlZnRSaWdodDogTGVmdFJpZ2h0LCAkZHJvcFpvbmVEaXY6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD4pIHtcclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgJGRyb3Bab25lRGl2Lm9uKFwiZHJhZ292ZXJcIiwgKGUpID0+IHtcclxuICAgICAgICAgICAgJGRyb3Bab25lRGl2LmFkZENsYXNzKCdqb19zeW5jaHJvX2RyYWdab25lJyk7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAkZHJvcFpvbmVEaXYub24oXCJkcmFnbGVhdmVcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAkZHJvcFpvbmVEaXYucmVtb3ZlQ2xhc3MoJ2pvX3N5bmNocm9fZHJhZ1pvbmUnKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAkZHJvcFpvbmVEaXYub24oXCJkcm9wXCIsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBzdyA9IG5ldyBTeW5jaHJvV29ya3NwYWNlKHRoYXQpLmNvcHlGcm9tSGlzdG9yeUVsZW1lbnQoSGlzdG9yeUVsZW1lbnQuY3VycmVudGx5RHJhZ2dlZCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAobGVmdFJpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwibGVmdFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQubGVmdFN5bmNocm9Xb3Jrc3BhY2UgPSBzdztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJyaWdodFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQucmlnaHRTeW5jaHJvV29ya3NwYWNlID0gc3c7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhhdC5zZXR1cFN5bmNocm9uaXphdGlvbkxpc3RFbGVtZW50cygpO1xyXG4gICAgICAgICAgICAkZHJvcFpvbmVEaXYucmVtb3ZlQ2xhc3MoJ2pvX3N5bmNocm9fZHJhZ1pvbmUnKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRIZWFkZXIobGVmdFJpZ2h0OiBMZWZ0UmlnaHQsIGNhcHRpb246IHN0cmluZykge1xyXG4gICAgICAgIGxldCBpbmRleDogbnVtYmVyID0gbGVmdFJpZ2h0ID09IFwibGVmdFwiID8gMCA6IDI7XHJcbiAgICAgICAgdGhpcy4kZmlsZUxpc3RIZWFkZXJEaXZzW2luZGV4XS5maW5kKCcuam9fc3luY2hyb190YWJIZWFkaW5nJykudGV4dChjYXB0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICB3cml0ZVJlcG9zaXRvcnlDaGFuZ2VzKCkge1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy4kd3JpdGVSZXBvc2l0b3J5Q2hhbmdlc0J1dHRvbi5oaWRlKCk7XHJcblxyXG4gICAgICAgIGxldCAkZGlhbG9nRGl2ID0gbWFrZURpdihcIlwiLCBcImpvX3N5bmNocm9fY29tbWl0RGlhbG9nRGl2XCIpO1xyXG4gICAgICAgICRkaWFsb2dEaXYuaGlkZSgpO1xyXG4gICAgICAgIHRoaXMuJGZpbGVMaXN0SGVhZGVyQ29udGFpbmVyUmlnaHQuYXBwZW5kKCRkaWFsb2dEaXYpO1xyXG5cclxuICAgICAgICAkZGlhbG9nRGl2LmFwcGVuZChtYWtlRGl2KFwiXCIsIFwiam9fc3luY2hyb19jb21taXREaWFsb2dDYXB0aW9uXCIsIFwiQml0dGUgYmVzY2hyZWliZSBrdXJ6IGRpZSB2b3JnZW5vbW1lbmVuIMOEbmRlcnVuZ2VuIGFtIFJlcG9zaXRvcnk6XCIpKTtcclxuICAgICAgICBsZXQgJGRpYWxvZ1RleHRhcmVhOiBKUXVlcnk8SFRNTFRleHRBcmVhRWxlbWVudD4gPSBqUXVlcnkoJzx0ZXh0YXJlYSBjbGFzcz1cImpvX3N5bmNocm9fY29tbWl0RGlhbG9nVGV4dGFyZWFcIj48L3RleHRhcmVhPicpO1xyXG4gICAgICAgICRkaWFsb2dEaXYuYXBwZW5kKCRkaWFsb2dUZXh0YXJlYSk7XHJcblxyXG4gICAgICAgIGxldCAkZGlhbG9nQnV0dG9uRGl2ID0gbWFrZURpdihcIlwiLCBcImpvX3N5bmNocm9fY29tbWl0RGlhbG9nQnV0dG9uRGl2XCIpO1xyXG4gICAgICAgICRkaWFsb2dEaXYuYXBwZW5kKCRkaWFsb2dCdXR0b25EaXYpO1xyXG5cclxuICAgICAgICBsZXQgJGJ1dHRvbkNhbmNlbCA9IG1ha2VEaXYoXCJcIiwgXCJqb19zeW5jaHJvX2J1dHRvblwiLCBcIkFiYnJlY2hlblwiLCB7IFwiYmFja2dyb3VuZC1jb2xvclwiOiBcInZhcigtLXVwZGF0ZUJ1dHRvbkJhY2tncm91bmQpXCIsIFwiY29sb3JcIjogXCJ2YXIoLS11cGRhdGVCdXR0b25Db2xvcilcIiB9KVxyXG4gICAgICAgICRkaWFsb2dCdXR0b25EaXYuYXBwZW5kKCRidXR0b25DYW5jZWwpO1xyXG5cclxuICAgICAgICAkYnV0dG9uQ2FuY2VsLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAkZGlhbG9nRGl2LnJlbW92ZSgpO1xyXG4gICAgICAgICAgICB0aGF0LiR3cml0ZVJlcG9zaXRvcnlDaGFuZ2VzQnV0dG9uLnNob3coKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBsZXQgJGJ1dHRvbk9LID0gbWFrZURpdihcIlwiLCBcImpvX3N5bmNocm9fYnV0dG9uXCIsIFwiT0tcIiwgeyBcImJhY2tncm91bmQtY29sb3JcIjogXCJ2YXIoLS1jcmVhdGVCdXR0b25CYWNrZ3JvdW5kKVwiLCBcImNvbG9yXCI6IFwidmFyKC0tY3JlYXRlQnV0dG9uQ29sb3IpXCIgfSlcclxuICAgICAgICAkZGlhbG9nQnV0dG9uRGl2LmFwcGVuZCgkYnV0dG9uT0spO1xyXG5cclxuICAgICAgICAkZGlhbG9nRGl2LnNob3coNjAwKTtcclxuXHJcbiAgICAgICAgJGJ1dHRvbk9LLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgY29tbWVudCA9IDxzdHJpbmc+JGRpYWxvZ1RleHRhcmVhLnZhbCgpO1xyXG4gICAgICAgICAgICAkZGlhbG9nRGl2LnJlbW92ZSgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50UmVwb3NpdG9yeVN5bmNocm9Xb3Jrc3BhY2UuY29tbWl0KHRoaXMuY3VycmVudFVzZXJTeW5jaHJvV29ya3NwYWNlLmNvcGllZEZyb21Xb3Jrc3BhY2UsIHRoaXMuY3VycmVudFJlcG9zaXRvcnksIGNvbW1lbnQsXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW4sIChyZXBvc2l0b3J5OiBSZXBvc2l0b3J5LCBlcnJvck1lc3NhZ2U6IHN0cmluZykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3JNZXNzYWdlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoZXJyb3JNZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hUb1dvcmtzcGFjZUFuZFJlcG9zaXRvcnkodGhpcy5jdXJyZW50UmVwb3NpdG9yeVN5bmNocm9Xb3Jrc3BhY2UuY29waWVkRnJvbVdvcmtzcGFjZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hUb1JlcG9zaXRvcnkocmVwb3NpdG9yeSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHdyaXRlUmVwb3NpdG9yeUNoYW5nZXNCdXR0b24uaGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgJGRpYWxvZ1RleHRhcmVhLmZvY3VzKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHdyaXRlV29ya3NwYWNlQ2hhbmdlcygpIHtcclxuICAgICAgICB0aGlzLmN1cnJlbnRVc2VyU3luY2hyb1dvcmtzcGFjZS53cml0ZUNoYW5nZXNUb1dvcmtzcGFjZSgpO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFVzZXJTeW5jaHJvV29ya3NwYWNlID0gbmV3IFN5bmNocm9Xb3Jrc3BhY2UodGhpcykuY29weUZyb21Xb3Jrc3BhY2UodGhpcy5jdXJyZW50VXNlclN5bmNocm9Xb3Jrc3BhY2UuY29waWVkRnJvbVdvcmtzcGFjZSk7XHJcbiAgICAgICAgdGhpcy5sZWZ0U3luY2hyb1dvcmtzcGFjZSA9IHRoaXMuY3VycmVudFVzZXJTeW5jaHJvV29ya3NwYWNlO1xyXG4gICAgICAgIHRoaXMuc2V0dXBTeW5jaHJvbml6YXRpb25MaXN0RWxlbWVudHMoKTtcclxuICAgICAgICB0aGlzLiR3cml0ZVdvcmtzcGFjZUNoYW5nZXNCdXR0b24uaGlkZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGluaXRFZGl0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5kaWZmRWRpdG9yID0gbW9uYWNvLmVkaXRvci5jcmVhdGVEaWZmRWRpdG9yKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiam9fc3luY2hyb19lZGl0b3JcIiksIHtcclxuICAgICAgICAgICAgb3JpZ2luYWxFZGl0YWJsZTogdHJ1ZSwgLy8gZm9yIGxlZnQgcGFuZVxyXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSwgICAgICAgICAvLyBmb3IgcmlnaHQgcGFuZVxyXG4gICAgICAgICAgICBhdXRvbWF0aWNMYXlvdXQ6IHRydWVcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBvbkNvbnRlbnRDaGFuZ2VkKGxlZnRSaWdodDogTGVmdFJpZ2h0KSB7XHJcbiAgICAgICAgbGV0ICRidXR0b246IEpRdWVyeTxIVE1MRGl2RWxlbWVudD4gPSBsZWZ0UmlnaHQgPT0gXCJsZWZ0XCIgPyB0aGlzLiR3cml0ZVdvcmtzcGFjZUNoYW5nZXNCdXR0b24gOiB0aGlzLiR3cml0ZVJlcG9zaXRvcnlDaGFuZ2VzQnV0dG9uXHJcbiAgICAgICAgbGV0IHN5bmNocm9Xb3Jrc3BhY2U6IFN5bmNocm9Xb3Jrc3BhY2UgPSBsZWZ0UmlnaHQgPT0gXCJsZWZ0XCIgPyB0aGlzLmN1cnJlbnRVc2VyU3luY2hyb1dvcmtzcGFjZSA6IHRoaXMuY3VycmVudFJlcG9zaXRvcnlTeW5jaHJvV29ya3NwYWNlO1xyXG5cclxuICAgICAgICBpZiAoc3luY2hyb1dvcmtzcGFjZS5oYXNDaGFuZ2VzKCkpIHtcclxuICAgICAgICAgICAgJGJ1dHRvbi5zaG93KCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgJGJ1dHRvbi5oaWRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVBbGwoKSB7XHJcbiAgICAgICAgbGV0IHVwZGF0ZUJ1dHRvbnMgPSB0aGlzLiRmaWxlTGlzdERpdnNbMV0uZmluZCgnLmpvX3N5bmNocm9fdXBkYXRlQnV0dG9uJyk7XHJcbiAgICAgICAgdXBkYXRlQnV0dG9ucy5jbGljaygpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbW1pdEFsbCgpIHtcclxuICAgICAgICBsZXQgY29tbWl0QnV0dG9ucyA9IHRoaXMuJGZpbGVMaXN0RGl2c1syXS5maW5kKCcuam9fc3luY2hyb19jb21taXRCdXR0b24nKTtcclxuICAgICAgICBjb21taXRCdXR0b25zLmNsaWNrKCk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHVwZGF0ZUNlbnRlckJ1dHRvbnMoKSB7XHJcbiAgICAgICAgbGV0IHVwZGF0ZUJ1dHRvbnMgPSB0aGlzLiRmaWxlTGlzdERpdnNbMV0uZmluZCgnLmpvX3N5bmNocm9fdXBkYXRlQnV0dG9uJyk7XHJcbiAgICAgICAgaWYgKHVwZGF0ZUJ1dHRvbnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLiR1cGRhdGVBbGxCdXR0b24uY3NzKFwidmlzaWJpbGl0eVwiLCBcImluaGVyaXRcIik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy4kdXBkYXRlQWxsQnV0dG9uLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgY29tbWl0QnV0dG9ucyA9IHRoaXMuJGZpbGVMaXN0RGl2c1syXS5maW5kKCcuam9fc3luY2hyb19jb21taXRCdXR0b24nKTtcclxuICAgICAgICBpZiAoY29tbWl0QnV0dG9ucy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGNvbW1pdEFsbEJ1dHRvbi5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaW5oZXJpdFwiKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLiRjb21taXRBbGxCdXR0b24uY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxufSJdfQ==