import { makeDiv } from "../../tools/HtmlTools.js";
export class SynchronizationListElement {
    constructor(manager, leftSynchroFile, rightSynchroFile, leftSynchroWorkspace, rightSynchroWorkspace) {
        this.manager = manager;
        this.leftSynchroFile = leftSynchroFile;
        this.rightSynchroFile = rightSynchroFile;
        this.leftSynchroWorkspace = leftSynchroWorkspace;
        this.rightSynchroWorkspace = rightSynchroWorkspace;
        this.$buttons = [];
        this.pending = false;
        this.$leftFileDiv = makeDiv(null, "jo_synchro_workspaceFileDiv jo_synchro_listDiv");
        this.$buttonLeftDiv = makeDiv(null, "jo_synchro_buttonDiv jo_synchro_listDiv jo_synchro_buttonLeftDiv");
        this.$buttonRightDiv = makeDiv(null, "jo_synchro_buttonDiv jo_synchro_listDiv jo_synchro_buttonRightDiv");
        this.$rightFileDiv = makeDiv(null, "jo_synchro_repositoryFileDiv jo_synchro_listDiv");
        manager.$fileListDivs[0].append(this.$leftFileDiv);
        manager.$fileListDivs[1].append(this.$buttonLeftDiv);
        manager.$fileListDivs[2].append(this.$buttonRightDiv);
        manager.$fileListDivs[3].append(this.$rightFileDiv);
        if (leftSynchroFile != null && leftSynchroFile.state != "original")
            this.$leftFileDiv.addClass('jo_dirty');
        if (rightSynchroFile != null && rightSynchroFile.state != "original")
            this.$rightFileDiv.addClass('jo_dirty');
        let allDivs = [this.$leftFileDiv, this.$buttonLeftDiv, this.$buttonRightDiv, this.$rightFileDiv];
        let that = this;
        for (let $div of allDivs) {
            $div.on("mouseenter", () => {
                for (let $div of allDivs)
                    $div.addClass('jo_synchro_hoverLine');
            });
            $div.on("mouseleave", () => {
                for (let $div of allDivs)
                    $div.removeClass('jo_synchro_hoverLine').removeClass("jo_synchro_hoverActiveLine");
            });
            $div.on("mousedown", () => {
                for (let $div of allDivs)
                    $div.addClass('jo_synchro_hoverActiveLine');
            });
            $div.on("mouseup", () => { for (let $div of allDivs)
                $div.removeClass('jo_synchro_hoverActiveLine'); });
            $div.on("click", () => {
                that.select();
            });
        }
        this.createLeftFileModel();
        this.createRightFileModel();
    }
    select() {
        var _a;
        let allDivs = [this.$leftFileDiv, this.$buttonLeftDiv, this.$buttonRightDiv, this.$rightFileDiv];
        jQuery('#jo_synchro_fileListOuter').find('.jo_synchro_activeLine').removeClass('jo_synchro_activeLine');
        for (let $div of allDivs)
            $div.addClass('jo_synchro_activeLine');
        if (this.manager.lastShownSynchronizationElement != null) {
            this.manager.lastShownSynchronizationElement.editorState = this.manager.diffEditor.saveViewState();
        }
        this.manager.lastShownSynchronizationElement = this;
        this.setEditorModel();
        if (this.editorState != null) {
            this.manager.diffEditor.restoreViewState(this.editorState);
        }
        this.manager.diffEditor.updateOptions({
            originalEditable: ((_a = this.leftSynchroFile) === null || _a === void 0 ? void 0 : _a.originalText) != null
        });
    }
    createRightFileModel() {
        if (this.rightSynchroFile != null) {
            this.rightSynchroFile.monacoModel = monaco.editor.createModel(this.rightSynchroFile.text, "myJava");
        }
    }
    setEditorModel() {
        if (this.manager.lastShownSynchronizationElement == this) {
            this.manager.diffEditor.setModel({
                original: this.leftSynchroFile == null ? this.getEmptyMonacoModel() : this.leftSynchroFile.monacoModel,
                modified: this.rightSynchroFile == null ? this.getEmptyMonacoModel() : this.rightSynchroFile.monacoModel
            });
        }
    }
    getEmptyMonacoModel() {
        return monaco.editor.createModel("", "myJava");
    }
    createLeftFileModel() {
        if (this.leftSynchroFile != null) {
            this.leftSynchroFile.monacoModel = monaco.editor.createModel(this.leftSynchroFile.text, "myJava");
            this.leftSynchroFile.monacoModel.onDidChangeContent((event) => {
                // throttle comparison to avoid editor-slowdown
                if (!this.pending) {
                    this.pending = true;
                    setTimeout(() => {
                        var _a, _b;
                        if (this.leftSynchroFile != null && ((_a = this.leftSynchroFile) === null || _a === void 0 ? void 0 : _a.state) != "deleted") {
                            let newText = this.leftSynchroFile.monacoModel.getValue(monaco.editor.EndOfLinePreference.LF, false);
                            if (((_b = this.leftSynchroFile) === null || _b === void 0 ? void 0 : _b.originalText) != null &&
                                newText == this.leftSynchroFile.originalText) {
                                this.$leftFileDiv.removeClass("jo_dirty");
                                this.leftSynchroFile.state = "original";
                            }
                            else {
                                this.$leftFileDiv.addClass("jo_dirty");
                                this.leftSynchroFile.state = "changed";
                                this.leftSynchroFile.identical_to_repository_version = false;
                            }
                            this.manager.onContentChanged("left");
                            this.leftSynchroFile.text = newText;
                            this.compareFilesAndAdaptGUI();
                        }
                        this.pending = false;
                    }, 700);
                }
            });
        }
    }
    onFileChanged(leftRight) {
        if (leftRight == "left") {
            this.createLeftFileModel();
        }
        else {
            this.createRightFileModel();
        }
        this.setEditorModel();
        this.compareFilesAndAdaptGUI();
        switch (leftRight) {
            case "left":
                if (this.leftSynchroFile != null && this.leftSynchroFile.state != "original") {
                    this.$leftFileDiv.addClass("jo_dirty");
                }
                else {
                    this.$leftFileDiv.removeClass("jo_dirty");
                }
                break;
            case "right":
                if (this.rightSynchroFile != null && this.rightSynchroFile.state != "original") {
                    this.$rightFileDiv.addClass("jo_dirty");
                }
                else {
                    this.$rightFileDiv.removeClass("jo_dirty");
                }
                break;
        }
        this.manager.onContentChanged(leftRight);
    }
    compareFilesAndAdaptGUI() {
        var _a, _b, _c;
        this.emptyGUI();
        let that = this;
        let leftCaption = "---";
        let leftVersionCaption = "";
        let needsMerge = false;
        if (this.leftSynchroFile != null) {
            leftCaption = this.leftSynchroFile.name;
            if (this.leftSynchroFile.repository_file_version == null) {
                leftVersionCaption = "(ohne Version)";
            }
            else {
                leftVersionCaption = "(V " + this.leftSynchroFile.repository_file_version;
                if (!(this.leftSynchroFile.identical_to_repository_version || ((_a = this.leftSynchroFile) === null || _a === void 0 ? void 0 : _a.text) == ((_b = this.rightSynchroFile) === null || _b === void 0 ? void 0 : _b.text))) {
                    leftVersionCaption += '<span class="jo_synchro_withChanges"> mit Änderungen</span>';
                }
                if (this.rightSynchroFile != null && this.leftSynchroFile.synchroWorkspace.isWritable()) {
                    if (this.rightSynchroFile.repository_file_version > this.leftSynchroFile.repository_file_version) {
                        needsMerge = !this.leftSynchroFile.markedAsMerged;
                    }
                }
                leftVersionCaption += ")";
            }
            if (this.leftSynchroFile.state == "deleted") {
                leftCaption += " - GELÖSCHT";
                leftVersionCaption = "";
            }
        }
        let rightCaption = this.rightSynchroFile == null ? "---" : this.rightSynchroFile.name;
        let rightVersionCaption = this.rightSynchroFile == null ? "" : "(V " + this.rightSynchroFile.repository_file_version + ")";
        if (((_c = this.rightSynchroFile) === null || _c === void 0 ? void 0 : _c.state) == "deleted") {
            rightCaption += " - GELÖSCHT";
            rightVersionCaption = "";
        }
        let $spacer1 = makeDiv("", "jo_synchro_5px_spacer");
        let $spacer2 = makeDiv("", "jo_synchro_5px_spacer");
        this.$buttonRightDiv.append($spacer2);
        if (this.leftSynchroFile == null) {
            if (this.leftSynchroWorkspace.isWritable() && that.rightSynchroFile.state != "deleted") {
                this.$buttonLeftDiv.append(SynchronizationListElement.makeButton("create", "left", () => {
                    that.leftSynchroFile = {
                        name: that.rightSynchroFile.name,
                        idInsideRepository: that.rightSynchroFile.idInsideRepository,
                        repository_file_version: that.rightSynchroFile.repository_file_version,
                        identical_to_repository_version: true,
                        state: "new",
                        markedAsMerged: false,
                        text: this.rightSynchroFile.text,
                        synchroWorkspace: that.leftSynchroWorkspace,
                        idInsideWorkspace: null,
                        workspaceFile: null,
                        originalText: null,
                        monacoModel: null
                    };
                    that.leftSynchroWorkspace.files.push(that.leftSynchroFile);
                    that.onFileChanged("left");
                }, false));
            }
            if (that.rightSynchroWorkspace.isWritable() && that.rightSynchroFile.state != "deleted") {
                this.$buttonRightDiv.append(SynchronizationListElement.makeButton("delete", "right", () => {
                    that.rightSynchroFile.state = "deleted";
                    that.onFileChanged("right");
                }, false));
            }
        }
        else if (this.rightSynchroFile == null) {
            if (this.rightSynchroWorkspace.isWritable() && that.leftSynchroFile.state != "deleted") {
                this.$buttonRightDiv.append(SynchronizationListElement.makeButton("create", "right", () => {
                    that.rightSynchroFile = {
                        name: that.leftSynchroFile.name,
                        committedFromFile: that.leftSynchroWorkspace.isWritable() ? that.leftSynchroFile : null,
                        idInsideRepository: that.leftSynchroFile.idInsideRepository,
                        repository_file_version: that.leftSynchroFile.repository_file_version == null ? 1 : that.leftSynchroFile.repository_file_version,
                        identical_to_repository_version: that.leftSynchroFile.identical_to_repository_version,
                        state: "new",
                        markedAsMerged: false,
                        text: this.leftSynchroFile.text,
                        synchroWorkspace: that.rightSynchroWorkspace,
                        idInsideWorkspace: this.leftSynchroFile.idInsideWorkspace,
                        workspaceFile: null,
                        originalText: null,
                        monacoModel: null
                    };
                    that.rightSynchroWorkspace.files.push(that.rightSynchroFile);
                    that.leftSynchroFile.repository_file_version = that.rightSynchroFile.repository_file_version;
                    that.leftSynchroFile.identical_to_repository_version = true;
                    that.onFileChanged("right");
                }, false));
            }
            if (that.leftSynchroWorkspace.isWritable() && that.leftSynchroFile.state != "deleted") {
                this.$buttonLeftDiv.append(SynchronizationListElement.makeButton("delete", "left", () => {
                    that.leftSynchroFile.state = "deleted";
                    that.onFileChanged("left");
                }, false));
            }
        }
        else {
            // Both SynchroFiles != null
            let isSynchronized = true;
            let isRename = this.leftSynchroFile.name != this.rightSynchroFile.name;
            let isUpdateOrCommit = this.leftSynchroFile.text != this.rightSynchroFile.text;
            let onlyRename = isRename && !isUpdateOrCommit;
            if (this.leftSynchroFile.repository_file_version == this.rightSynchroFile.repository_file_version) {
                if (isUpdateOrCommit || isRename) {
                    isSynchronized = false;
                }
            }
            else {
                isSynchronized = false;
            }
            if (isSynchronized) {
                this.$buttonLeftDiv.append(jQuery('<div>synchron - </div>'));
                this.$buttonRightDiv.append(jQuery('<div> - synchron</div>'));
            }
            else {
                if (this.leftSynchroWorkspace.isWritable()) {
                    this.$buttonLeftDiv.append(SynchronizationListElement.makeButton("update", "left", () => {
                        that.leftSynchroFile.text = that.rightSynchroFile.text;
                        that.leftSynchroFile.repository_file_version = that.rightSynchroFile.repository_file_version;
                        that.leftSynchroFile.identical_to_repository_version = true;
                        that.leftSynchroFile.name = that.rightSynchroFile.name;
                        that.leftSynchroFile.state = "changed";
                        that.onFileChanged("left");
                    }, onlyRename));
                }
                if (this.rightSynchroWorkspace.isWritable() && !needsMerge) {
                    this.$buttonRightDiv.append(SynchronizationListElement.makeButton("commit", "right", () => {
                        that.rightSynchroFile.text = that.leftSynchroFile.text;
                        that.rightSynchroFile.name = that.leftSynchroFile.name;
                        that.rightSynchroFile.repository_file_version++;
                        if (that.leftSynchroWorkspace.isWritable())
                            that.rightSynchroFile.committedFromFile = that.leftSynchroFile;
                        if (that.leftSynchroWorkspace.isWritable()) {
                            that.leftSynchroFile.repository_file_version = that.rightSynchroFile.repository_file_version;
                            this.leftSynchroFile.identical_to_repository_version = true;
                        }
                        that.rightSynchroFile.state = "changed";
                        that.onFileChanged("right");
                    }, onlyRename));
                }
            }
        }
        this.$buttonLeftDiv.append($spacer1);
        this.$leftFileDiv.append(jQuery(`<div class="jo_synchro_filename">${leftCaption}<span class="jo_synchro_fileVersion">${leftVersionCaption}</span></div>`));
        this.$rightFileDiv.append(jQuery(`<div class="jo_synchro_filename">${rightCaption}<span class="jo_synchro_fileVersion">${rightVersionCaption}</span></div>`));
        if (needsMerge) {
            this.$markAsMergedButtonDiv = jQuery(`<div class="jo_synchro_button jo_synchro_markAsMergedButton">Als "merged" markieren</div>`);
            this.$leftFileDiv.append(this.$markAsMergedButtonDiv);
            this.$markAsMergedButtonDiv.on("click", (e) => {
                e.stopPropagation();
                this.leftSynchroFile.markedAsMerged = true;
                this.compareFilesAndAdaptGUI();
            });
        }
        if (this.leftSynchroFile != null && this.leftSynchroFile.markedAsMerged) {
            this.showMergedDiv();
        }
        this.manager.updateCenterButtons();
    }
    showMergedDiv() {
        let $mergedDiv = jQuery(`<div class="jo_synchro_mergedDiv">merged</div><div class="img_errorfree"></div>`);
        this.$leftFileDiv.append($mergedDiv);
    }
    emptyGUI() {
        this.$leftFileDiv.empty();
        this.$rightFileDiv.empty();
        this.$buttonLeftDiv.empty();
        this.$buttonRightDiv.empty();
    }
    static makeButton(kind, arrowDirection, callback, onlyRename) {
        let caption = "";
        let klass = "";
        switch (kind) {
            case "commit":
                caption = onlyRename ? "rename" : "commit";
                klass = "jo_synchro_commitButton";
                break;
            case "commitAll":
                caption = "commit all";
                klass = "jo_synchro_commitButton";
                break;
            case "update":
                caption = onlyRename ? "rename" : "update";
                klass = "jo_synchro_updateButton";
                break;
            case "updateAll":
                caption = "update all";
                klass = "jo_synchro_updateButton";
                break;
            case "create":
                caption = "create";
                klass = "jo_synchro_createButton";
                break;
            case "delete":
                caption = "delete";
                klass = "jo_synchro_deleteButton";
                break;
        }
        switch (arrowDirection) {
            case "left":
                klass += " jo_synchro_arrowLeft";
                break;
            case "right":
                klass += " jo_synchro_arrowRight";
                break;
        }
        let div = jQuery(`<div class="jo_synchro_button ${klass}">${caption}</div>`);
        div.on("click", (e) => {
            e.stopPropagation();
            if (callback != null)
                callback();
        });
        div.on("mousedown", (e) => { e.stopPropagation(); });
        return div;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY2hyb25pemF0aW9uTGlzdEVsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L3JlcG9zaXRvcnkvc3luY2hyb25pemUvU3luY2hyb25pemF0aW9uTGlzdEVsZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBUW5ELE1BQU0sT0FBTywwQkFBMEI7SUFjbkMsWUFBb0IsT0FBK0IsRUFBUyxlQUE0QixFQUFTLGdCQUE2QixFQUNuSCxvQkFBc0MsRUFBUyxxQkFBdUM7UUFEN0UsWUFBTyxHQUFQLE9BQU8sQ0FBd0I7UUFBUyxvQkFBZSxHQUFmLGVBQWUsQ0FBYTtRQUFTLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBYTtRQUNuSCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQWtCO1FBQVMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUFrQjtRQUhqRyxhQUFRLEdBQTZCLEVBQUUsQ0FBQztRQXlGeEMsWUFBTyxHQUFZLEtBQUssQ0FBQztRQXBGckIsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLGdEQUFnRCxDQUFDLENBQUM7UUFDcEYsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLGtFQUFrRSxDQUFDLENBQUM7UUFDeEcsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLG1FQUFtRSxDQUFDLENBQUM7UUFDMUcsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLGlEQUFpRCxDQUFDLENBQUM7UUFDdEYsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25ELE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FB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QUFLLEtBQUssT0FBTyxRQUFRLENBQUMsQ0FBQztRQUVyRyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2xCLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNwQixJQUFJLFFBQVEsSUFBSSxJQUFJO2dCQUFFLFFBQVEsRUFBRSxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRW5ELE9BQU8sR0FBRyxDQUFDO0lBRWYsQ0FBQztDQUdKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGVhY2hlcnNXaXRoQ2xhc3Nlc01JIH0gZnJvbSBcIi4uLy4uL2FkbWluaXN0cmF0aW9uL1RlYWNoZXJzV2l0aENsYXNzZXMuanNcIjtcclxuaW1wb3J0IHsgUmVwb3NpdG9yeUZpbGVFbnRyeSB9IGZyb20gXCIuLi8uLi9jb21tdW5pY2F0aW9uL0RhdGEuanNcIjtcclxuaW1wb3J0IHsgRmlsZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IG1ha2VEaXYgfSBmcm9tIFwiLi4vLi4vdG9vbHMvSHRtbFRvb2xzLmpzXCI7XHJcbmltcG9ydCB7IFN5bmNocm9uaXphdGlvbk1hbmFnZXIgfSBmcm9tIFwiLi9SZXBvc2l0b3J5U3luY2hyb25pemF0aW9uTWFuYWdlci5qc1wiO1xyXG5pbXBvcnQgeyBTeW5jaHJvRmlsZSwgU3luY2hyb1dvcmtzcGFjZSB9IGZyb20gXCIuL1N5bmNocm9Xb3Jrc3BhY2UuanNcIjtcclxuXHJcbnR5cGUgQnV0dG9uS2luZCA9IFwiY3JlYXRlXCIgfCBcImRlbGV0ZVwiIHwgXCJ1cGRhdGVcIiB8IFwiY29tbWl0XCIgfCBcInVwZGF0ZUFsbFwiIHwgXCJjb21taXRBbGxcIjtcclxuZXhwb3J0IHR5cGUgTGVmdFJpZ2h0ID0gXCJsZWZ0XCIgfCBcInJpZ2h0XCI7XHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIFN5bmNocm9uaXphdGlvbkxpc3RFbGVtZW50IHtcclxuXHJcbiAgICAkbGVmdEZpbGVEaXY6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47XHJcbiAgICAkcmlnaHRGaWxlRGl2OiBKUXVlcnk8SFRNTERpdkVsZW1lbnQ+O1xyXG4gICAgJGJ1dHRvbkxlZnREaXY6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47XHJcbiAgICAkYnV0dG9uUmlnaHREaXY6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD47XHJcblxyXG4gICAgJG1hcmtBc01lcmdlZEJ1dHRvbkRpdjogSlF1ZXJ5PEhUTUxEaXZFbGVtZW50PjtcclxuICAgICRtZXJnZWRGbGFnOiBKUXVlcnk8SFRNTERpdkVsZW1lbnQ+O1xyXG5cclxuICAgIGVkaXRvclN0YXRlOiBtb25hY28uZWRpdG9yLklEaWZmRWRpdG9yVmlld1N0YXRlO1xyXG5cclxuICAgICRidXR0b25zOiBKUXVlcnk8SFRNTERpdkVsZW1lbnQ+W10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1hbmFnZXI6IFN5bmNocm9uaXphdGlvbk1hbmFnZXIsIHB1YmxpYyBsZWZ0U3luY2hyb0ZpbGU6IFN5bmNocm9GaWxlLCBwdWJsaWMgcmlnaHRTeW5jaHJvRmlsZTogU3luY2hyb0ZpbGUsXHJcbiAgICAgICAgcHVibGljIGxlZnRTeW5jaHJvV29ya3NwYWNlOiBTeW5jaHJvV29ya3NwYWNlLCBwdWJsaWMgcmlnaHRTeW5jaHJvV29ya3NwYWNlOiBTeW5jaHJvV29ya3NwYWNlKSB7XHJcblxyXG4gICAgICAgIHRoaXMuJGxlZnRGaWxlRGl2ID0gbWFrZURpdihudWxsLCBcImpvX3N5bmNocm9fd29ya3NwYWNlRmlsZURpdiBqb19zeW5jaHJvX2xpc3REaXZcIik7XHJcbiAgICAgICAgdGhpcy4kYnV0dG9uTGVmdERpdiA9IG1ha2VEaXYobnVsbCwgXCJqb19zeW5jaHJvX2J1dHRvbkRpdiBqb19zeW5jaHJvX2xpc3REaXYgam9fc3luY2hyb19idXR0b25MZWZ0RGl2XCIpO1xyXG4gICAgICAgIHRoaXMuJGJ1dHRvblJpZ2h0RGl2ID0gbWFrZURpdihudWxsLCBcImpvX3N5bmNocm9fYnV0dG9uRGl2IGpvX3N5bmNocm9fbGlzdERpdiBqb19zeW5jaHJvX2J1dHRvblJpZ2h0RGl2XCIpO1xyXG4gICAgICAgIHRoaXMuJHJpZ2h0RmlsZURpdiA9IG1ha2VEaXYobnVsbCwgXCJqb19zeW5jaHJvX3JlcG9zaXRvcnlGaWxlRGl2IGpvX3N5bmNocm9fbGlzdERpdlwiKTtcclxuICAgICAgICBtYW5hZ2VyLiRmaWxlTGlzdERpdnNbMF0uYXBwZW5kKHRoaXMuJGxlZnRGaWxlRGl2KTtcclxuICAgICAgICBtYW5hZ2VyLiRmaWxlTGlzdERpdnNbMV0uYXBwZW5kKHRoaXMuJGJ1dHRvbkxlZnREaXYpO1xyXG4gICAgICAgIG1hbmFnZXIuJGZpbGVMaXN0RGl2c1syXS5hcHBlbmQodGhpcy4kYnV0dG9uUmlnaHREaXYpO1xyXG4gICAgICAgIG1hbmFnZXIuJGZpbGVMaXN0RGl2c1szXS5hcHBlbmQodGhpcy4kcmlnaHRGaWxlRGl2KTtcclxuXHJcbiAgICAgICAgaWYgKGxlZnRTeW5jaHJvRmlsZSAhPSBudWxsICYmIGxlZnRTeW5jaHJvRmlsZS5zdGF0ZSAhPSBcIm9yaWdpbmFsXCIpIHRoaXMuJGxlZnRGaWxlRGl2LmFkZENsYXNzKCdqb19kaXJ0eScpO1xyXG4gICAgICAgIGlmIChyaWdodFN5bmNocm9GaWxlICE9IG51bGwgJiYgcmlnaHRTeW5jaHJvRmlsZS5zdGF0ZSAhPSBcIm9yaWdpbmFsXCIpIHRoaXMuJHJpZ2h0RmlsZURpdi5hZGRDbGFzcygnam9fZGlydHknKTtcclxuXHJcblxyXG5cclxuICAgICAgICBsZXQgYWxsRGl2czogSlF1ZXJ5PEhUTUxEaXZFbGVtZW50PltdID0gW3RoaXMuJGxlZnRGaWxlRGl2LCB0aGlzLiRidXR0b25MZWZ0RGl2LCB0aGlzLiRidXR0b25SaWdodERpdiwgdGhpcy4kcmlnaHRGaWxlRGl2XTtcclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICBmb3IgKGxldCAkZGl2IG9mIGFsbERpdnMpIHtcclxuICAgICAgICAgICAgJGRpdi5vbihcIm1vdXNlZW50ZXJcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgJGRpdiBvZiBhbGxEaXZzKSAkZGl2LmFkZENsYXNzKCdqb19zeW5jaHJvX2hvdmVyTGluZScpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGRpdi5vbihcIm1vdXNlbGVhdmVcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgJGRpdiBvZiBhbGxEaXZzKSAkZGl2LnJlbW92ZUNsYXNzKCdqb19zeW5jaHJvX2hvdmVyTGluZScpLnJlbW92ZUNsYXNzKFwiam9fc3luY2hyb19ob3ZlckFjdGl2ZUxpbmVcIik7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJGRpdi5vbihcIm1vdXNlZG93blwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCAkZGl2IG9mIGFsbERpdnMpICRkaXYuYWRkQ2xhc3MoJ2pvX3N5bmNocm9faG92ZXJBY3RpdmVMaW5lJylcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRkaXYub24oXCJtb3VzZXVwXCIsICgpID0+IHsgZm9yIChsZXQgJGRpdiBvZiBhbGxEaXZzKSAkZGl2LnJlbW92ZUNsYXNzKCdqb19zeW5jaHJvX2hvdmVyQWN0aXZlTGluZScpIH0pO1xyXG5cclxuICAgICAgICAgICAgJGRpdi5vbihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoYXQuc2VsZWN0KCk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNyZWF0ZUxlZnRGaWxlTW9kZWwoKTtcclxuICAgICAgICB0aGlzLmNyZWF0ZVJpZ2h0RmlsZU1vZGVsKCk7XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBzZWxlY3QoKSB7XHJcbiAgICAgICAgbGV0IGFsbERpdnM6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD5bXSA9IFt0aGlzLiRsZWZ0RmlsZURpdiwgdGhpcy4kYnV0dG9uTGVmdERpdiwgdGhpcy4kYnV0dG9uUmlnaHREaXYsIHRoaXMuJHJpZ2h0RmlsZURpdl07XHJcbiAgICAgICAgalF1ZXJ5KCcjam9fc3luY2hyb19maWxlTGlzdE91dGVyJykuZmluZCgnLmpvX3N5bmNocm9fYWN0aXZlTGluZScpLnJlbW92ZUNsYXNzKCdqb19zeW5jaHJvX2FjdGl2ZUxpbmUnKTtcclxuICAgICAgICBmb3IgKGxldCAkZGl2IG9mIGFsbERpdnMpICRkaXYuYWRkQ2xhc3MoJ2pvX3N5bmNocm9fYWN0aXZlTGluZScpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5tYW5hZ2VyLmxhc3RTaG93blN5bmNocm9uaXphdGlvbkVsZW1lbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLm1hbmFnZXIubGFzdFNob3duU3luY2hyb25pemF0aW9uRWxlbWVudC5lZGl0b3JTdGF0ZSA9IHRoaXMubWFuYWdlci5kaWZmRWRpdG9yLnNhdmVWaWV3U3RhdGUoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYW5hZ2VyLmxhc3RTaG93blN5bmNocm9uaXphdGlvbkVsZW1lbnQgPSB0aGlzO1xyXG5cclxuICAgICAgICB0aGlzLnNldEVkaXRvck1vZGVsKCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmVkaXRvclN0YXRlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5tYW5hZ2VyLmRpZmZFZGl0b3IucmVzdG9yZVZpZXdTdGF0ZSh0aGlzLmVkaXRvclN0YXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFuYWdlci5kaWZmRWRpdG9yLnVwZGF0ZU9wdGlvbnMoe1xyXG4gICAgICAgICAgICBvcmlnaW5hbEVkaXRhYmxlOiB0aGlzLmxlZnRTeW5jaHJvRmlsZT8ub3JpZ2luYWxUZXh0ICE9IG51bGxcclxuICAgICAgICB9KVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBjcmVhdGVSaWdodEZpbGVNb2RlbCgpIHtcclxuICAgICAgICBpZiAodGhpcy5yaWdodFN5bmNocm9GaWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5yaWdodFN5bmNocm9GaWxlLm1vbmFjb01vZGVsID0gbW9uYWNvLmVkaXRvci5jcmVhdGVNb2RlbCh0aGlzLnJpZ2h0U3luY2hyb0ZpbGUudGV4dCwgXCJteUphdmFcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldEVkaXRvck1vZGVsKCkge1xyXG4gICAgICAgIGlmICh0aGlzLm1hbmFnZXIubGFzdFNob3duU3luY2hyb25pemF0aW9uRWxlbWVudCA9PSB0aGlzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFuYWdlci5kaWZmRWRpdG9yLnNldE1vZGVsKHtcclxuICAgICAgICAgICAgICAgIG9yaWdpbmFsOiB0aGlzLmxlZnRTeW5jaHJvRmlsZSA9PSBudWxsID8gdGhpcy5nZXRFbXB0eU1vbmFjb01vZGVsKCkgOiB0aGlzLmxlZnRTeW5jaHJvRmlsZS5tb25hY29Nb2RlbCxcclxuICAgICAgICAgICAgICAgIG1vZGlmaWVkOiB0aGlzLnJpZ2h0U3luY2hyb0ZpbGUgPT0gbnVsbCA/IHRoaXMuZ2V0RW1wdHlNb25hY29Nb2RlbCgpIDogdGhpcy5yaWdodFN5bmNocm9GaWxlLm1vbmFjb01vZGVsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnZXRFbXB0eU1vbmFjb01vZGVsKCk6IG1vbmFjby5lZGl0b3IuSVRleHRNb2RlbCB7XHJcbiAgICAgICAgcmV0dXJuIG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoXCJcIiwgXCJteUphdmFcIilcclxuICAgIH1cclxuXHJcbiAgICBwZW5kaW5nOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBjcmVhdGVMZWZ0RmlsZU1vZGVsKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmxlZnRTeW5jaHJvRmlsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGVmdFN5bmNocm9GaWxlLm1vbmFjb01vZGVsID0gbW9uYWNvLmVkaXRvci5jcmVhdGVNb2RlbCh0aGlzLmxlZnRTeW5jaHJvRmlsZS50ZXh0LCBcIm15SmF2YVwiKTtcclxuICAgICAgICAgICAgdGhpcy5sZWZ0U3luY2hyb0ZpbGUubW9uYWNvTW9kZWwub25EaWRDaGFuZ2VDb250ZW50KChldmVudCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlIGNvbXBhcmlzb24gdG8gYXZvaWQgZWRpdG9yLXNsb3dkb3duXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMucGVuZGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGVuZGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmxlZnRTeW5jaHJvRmlsZSAhPSBudWxsICYmIHRoaXMubGVmdFN5bmNocm9GaWxlPy5zdGF0ZSAhPSBcImRlbGV0ZWRcIikge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdUZXh0OiBzdHJpbmcgPSB0aGlzLmxlZnRTeW5jaHJvRmlsZS5tb25hY29Nb2RlbC5nZXRWYWx1ZShtb25hY28uZWRpdG9yLkVuZE9mTGluZVByZWZlcmVuY2UuTEYsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmxlZnRTeW5jaHJvRmlsZT8ub3JpZ2luYWxUZXh0ICE9IG51bGwgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUZXh0ID09IHRoaXMubGVmdFN5bmNocm9GaWxlLm9yaWdpbmFsVGV4dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGxlZnRGaWxlRGl2LnJlbW92ZUNsYXNzKFwiam9fZGlydHlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sZWZ0U3luY2hyb0ZpbGUuc3RhdGUgPSBcIm9yaWdpbmFsXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGxlZnRGaWxlRGl2LmFkZENsYXNzKFwiam9fZGlydHlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sZWZ0U3luY2hyb0ZpbGUuc3RhdGUgPSBcImNoYW5nZWRcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxlZnRTeW5jaHJvRmlsZS5pZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1hbmFnZXIub25Db250ZW50Q2hhbmdlZChcImxlZnRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxlZnRTeW5jaHJvRmlsZS50ZXh0ID0gbmV3VGV4dDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBhcmVGaWxlc0FuZEFkYXB0R1VJKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wZW5kaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgNzAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBvbkZpbGVDaGFuZ2VkKGxlZnRSaWdodDogTGVmdFJpZ2h0KSB7XHJcbiAgICAgICAgaWYgKGxlZnRSaWdodCA9PSBcImxlZnRcIikge1xyXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUxlZnRGaWxlTW9kZWwoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVJpZ2h0RmlsZU1vZGVsKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc2V0RWRpdG9yTW9kZWwoKTtcclxuICAgICAgICB0aGlzLmNvbXBhcmVGaWxlc0FuZEFkYXB0R1VJKCk7XHJcbiAgICAgICAgc3dpdGNoIChsZWZ0UmlnaHQpIHtcclxuICAgICAgICAgICAgY2FzZSBcImxlZnRcIjpcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxlZnRTeW5jaHJvRmlsZSAhPSBudWxsICYmIHRoaXMubGVmdFN5bmNocm9GaWxlLnN0YXRlICE9IFwib3JpZ2luYWxcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGxlZnRGaWxlRGl2LmFkZENsYXNzKFwiam9fZGlydHlcIik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGxlZnRGaWxlRGl2LnJlbW92ZUNsYXNzKFwiam9fZGlydHlcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInJpZ2h0XCI6XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yaWdodFN5bmNocm9GaWxlICE9IG51bGwgJiYgdGhpcy5yaWdodFN5bmNocm9GaWxlLnN0YXRlICE9IFwib3JpZ2luYWxcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHJpZ2h0RmlsZURpdi5hZGRDbGFzcyhcImpvX2RpcnR5XCIpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRyaWdodEZpbGVEaXYucmVtb3ZlQ2xhc3MoXCJqb19kaXJ0eVwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLm1hbmFnZXIub25Db250ZW50Q2hhbmdlZChsZWZ0UmlnaHQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbXBhcmVGaWxlc0FuZEFkYXB0R1VJKCkge1xyXG5cclxuICAgICAgICB0aGlzLmVtcHR5R1VJKCk7XHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICBsZXQgbGVmdENhcHRpb246IHN0cmluZyA9IFwiLS0tXCI7XHJcbiAgICAgICAgbGV0IGxlZnRWZXJzaW9uQ2FwdGlvbjogc3RyaW5nID0gXCJcIjtcclxuXHJcbiAgICAgICAgbGV0IG5lZWRzTWVyZ2UgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubGVmdFN5bmNocm9GaWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGVmdENhcHRpb24gPSB0aGlzLmxlZnRTeW5jaHJvRmlsZS5uYW1lO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sZWZ0U3luY2hyb0ZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb24gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGVmdFZlcnNpb25DYXB0aW9uID0gXCIob2huZSBWZXJzaW9uKVwiO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGVmdFZlcnNpb25DYXB0aW9uID0gXCIoViBcIiArIHRoaXMubGVmdFN5bmNocm9GaWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uO1xyXG4gICAgICAgICAgICAgICAgaWYgKCEodGhpcy5sZWZ0U3luY2hyb0ZpbGUuaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbiB8fCB0aGlzLmxlZnRTeW5jaHJvRmlsZT8udGV4dCA9PSB0aGlzLnJpZ2h0U3luY2hyb0ZpbGU/LnRleHQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdFZlcnNpb25DYXB0aW9uICs9ICc8c3BhbiBjbGFzcz1cImpvX3N5bmNocm9fd2l0aENoYW5nZXNcIj4gbWl0IMOEbmRlcnVuZ2VuPC9zcGFuPic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yaWdodFN5bmNocm9GaWxlICE9IG51bGwgJiYgdGhpcy5sZWZ0U3luY2hyb0ZpbGUuc3luY2hyb1dvcmtzcGFjZS5pc1dyaXRhYmxlKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5yaWdodFN5bmNocm9GaWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uID4gdGhpcy5sZWZ0U3luY2hyb0ZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVlZHNNZXJnZSA9ICF0aGlzLmxlZnRTeW5jaHJvRmlsZS5tYXJrZWRBc01lcmdlZDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGVmdFZlcnNpb25DYXB0aW9uICs9IFwiKVwiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5sZWZ0U3luY2hyb0ZpbGUuc3RhdGUgPT0gXCJkZWxldGVkXCIpIHtcclxuICAgICAgICAgICAgICAgIGxlZnRDYXB0aW9uICs9IFwiIC0gR0VMw5ZTQ0hUXCI7XHJcbiAgICAgICAgICAgICAgICBsZWZ0VmVyc2lvbkNhcHRpb24gPSBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcmlnaHRDYXB0aW9uID0gdGhpcy5yaWdodFN5bmNocm9GaWxlID09IG51bGwgPyBcIi0tLVwiIDogdGhpcy5yaWdodFN5bmNocm9GaWxlLm5hbWU7XHJcbiAgICAgICAgbGV0IHJpZ2h0VmVyc2lvbkNhcHRpb24gPSB0aGlzLnJpZ2h0U3luY2hyb0ZpbGUgPT0gbnVsbCA/IFwiXCIgOiBcIihWIFwiICsgdGhpcy5yaWdodFN5bmNocm9GaWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uICsgXCIpXCI7XHJcbiAgICAgICAgaWYgKHRoaXMucmlnaHRTeW5jaHJvRmlsZT8uc3RhdGUgPT0gXCJkZWxldGVkXCIpIHtcclxuICAgICAgICAgICAgcmlnaHRDYXB0aW9uICs9IFwiIC0gR0VMw5ZTQ0hUXCI7XHJcbiAgICAgICAgICAgIHJpZ2h0VmVyc2lvbkNhcHRpb24gPSBcIlwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0ICRzcGFjZXIxID0gbWFrZURpdihcIlwiLCBcImpvX3N5bmNocm9fNXB4X3NwYWNlclwiKTtcclxuICAgICAgICBsZXQgJHNwYWNlcjIgPSBtYWtlRGl2KFwiXCIsIFwiam9fc3luY2hyb181cHhfc3BhY2VyXCIpO1xyXG5cclxuICAgICAgICB0aGlzLiRidXR0b25SaWdodERpdi5hcHBlbmQoJHNwYWNlcjIpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5sZWZ0U3luY2hyb0ZpbGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sZWZ0U3luY2hyb1dvcmtzcGFjZS5pc1dyaXRhYmxlKCkgJiYgdGhhdC5yaWdodFN5bmNocm9GaWxlLnN0YXRlICE9IFwiZGVsZXRlZFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRidXR0b25MZWZ0RGl2LmFwcGVuZChTeW5jaHJvbml6YXRpb25MaXN0RWxlbWVudC5tYWtlQnV0dG9uKFwiY3JlYXRlXCIsIFwibGVmdFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5sZWZ0U3luY2hyb0ZpbGUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHRoYXQucmlnaHRTeW5jaHJvRmlsZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZEluc2lkZVJlcG9zaXRvcnk6IHRoYXQucmlnaHRTeW5jaHJvRmlsZS5pZEluc2lkZVJlcG9zaXRvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uOiB0aGF0LnJpZ2h0U3luY2hyb0ZpbGUucmVwb3NpdG9yeV9maWxlX3ZlcnNpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWNhbF90b19yZXBvc2l0b3J5X3ZlcnNpb246IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlOiBcIm5ld1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZWRBc01lcmdlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHRoaXMucmlnaHRTeW5jaHJvRmlsZS50ZXh0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzeW5jaHJvV29ya3NwYWNlOiB0aGF0LmxlZnRTeW5jaHJvV29ya3NwYWNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZEluc2lkZVdvcmtzcGFjZTogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgd29ya3NwYWNlRmlsZTogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxUZXh0OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb25hY29Nb2RlbDogbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5sZWZ0U3luY2hyb1dvcmtzcGFjZS5maWxlcy5wdXNoKHRoYXQubGVmdFN5bmNocm9GaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm9uRmlsZUNoYW5nZWQoXCJsZWZ0XCIpO1xyXG4gICAgICAgICAgICAgICAgfSwgZmFsc2UpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhhdC5yaWdodFN5bmNocm9Xb3Jrc3BhY2UuaXNXcml0YWJsZSgpICYmIHRoYXQucmlnaHRTeW5jaHJvRmlsZS5zdGF0ZSAhPSBcImRlbGV0ZWRcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kYnV0dG9uUmlnaHREaXYuYXBwZW5kKFN5bmNocm9uaXphdGlvbkxpc3RFbGVtZW50Lm1ha2VCdXR0b24oXCJkZWxldGVcIiwgXCJyaWdodFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5yaWdodFN5bmNocm9GaWxlLnN0YXRlID0gXCJkZWxldGVkXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5vbkZpbGVDaGFuZ2VkKFwicmlnaHRcIik7XHJcbiAgICAgICAgICAgICAgICB9LCBmYWxzZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnJpZ2h0U3luY2hyb0ZpbGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5yaWdodFN5bmNocm9Xb3Jrc3BhY2UuaXNXcml0YWJsZSgpICYmIHRoYXQubGVmdFN5bmNocm9GaWxlLnN0YXRlICE9IFwiZGVsZXRlZFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRidXR0b25SaWdodERpdi5hcHBlbmQoU3luY2hyb25pemF0aW9uTGlzdEVsZW1lbnQubWFrZUJ1dHRvbihcImNyZWF0ZVwiLCBcInJpZ2h0XCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LnJpZ2h0U3luY2hyb0ZpbGUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHRoYXQubGVmdFN5bmNocm9GaWxlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1pdHRlZEZyb21GaWxlOiB0aGF0LmxlZnRTeW5jaHJvV29ya3NwYWNlLmlzV3JpdGFibGUoKSA/IHRoYXQubGVmdFN5bmNocm9GaWxlIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWRJbnNpZGVSZXBvc2l0b3J5OiB0aGF0LmxlZnRTeW5jaHJvRmlsZS5pZEluc2lkZVJlcG9zaXRvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uOiB0aGF0LmxlZnRTeW5jaHJvRmlsZS5yZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbiA9PSBudWxsID8gMSA6IHRoYXQubGVmdFN5bmNocm9GaWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uOiB0aGF0LmxlZnRTeW5jaHJvRmlsZS5pZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZTogXCJuZXdcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFya2VkQXNNZXJnZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiB0aGlzLmxlZnRTeW5jaHJvRmlsZS50ZXh0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzeW5jaHJvV29ya3NwYWNlOiB0aGF0LnJpZ2h0U3luY2hyb1dvcmtzcGFjZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWRJbnNpZGVXb3Jrc3BhY2U6IHRoaXMubGVmdFN5bmNocm9GaWxlLmlkSW5zaWRlV29ya3NwYWNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3b3Jrc3BhY2VGaWxlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbFRleHQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vbmFjb01vZGVsOiBudWxsXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQucmlnaHRTeW5jaHJvV29ya3NwYWNlLmZpbGVzLnB1c2godGhhdC5yaWdodFN5bmNocm9GaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmxlZnRTeW5jaHJvRmlsZS5yZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbiA9IHRoYXQucmlnaHRTeW5jaHJvRmlsZS5yZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbjtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmxlZnRTeW5jaHJvRmlsZS5pZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm9uRmlsZUNoYW5nZWQoXCJyaWdodFwiKTtcclxuICAgICAgICAgICAgICAgIH0sIGZhbHNlKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoYXQubGVmdFN5bmNocm9Xb3Jrc3BhY2UuaXNXcml0YWJsZSgpICYmIHRoYXQubGVmdFN5bmNocm9GaWxlLnN0YXRlICE9IFwiZGVsZXRlZFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRidXR0b25MZWZ0RGl2LmFwcGVuZChTeW5jaHJvbml6YXRpb25MaXN0RWxlbWVudC5tYWtlQnV0dG9uKFwiZGVsZXRlXCIsIFwibGVmdFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5sZWZ0U3luY2hyb0ZpbGUuc3RhdGUgPSBcImRlbGV0ZWRcIjtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm9uRmlsZUNoYW5nZWQoXCJsZWZ0XCIpO1xyXG4gICAgICAgICAgICAgICAgfSxmYWxzZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gQm90aCBTeW5jaHJvRmlsZXMgIT0gbnVsbFxyXG4gICAgICAgICAgICBsZXQgaXNTeW5jaHJvbml6ZWQ6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgbGV0IGlzUmVuYW1lOiBib29sZWFuID0gdGhpcy5sZWZ0U3luY2hyb0ZpbGUubmFtZSAhPSB0aGlzLnJpZ2h0U3luY2hyb0ZpbGUubmFtZTtcclxuICAgICAgICAgICAgbGV0IGlzVXBkYXRlT3JDb21taXQ6IGJvb2xlYW4gPSB0aGlzLmxlZnRTeW5jaHJvRmlsZS50ZXh0ICE9IHRoaXMucmlnaHRTeW5jaHJvRmlsZS50ZXh0O1xyXG4gICAgICAgICAgICBsZXQgb25seVJlbmFtZSA9IGlzUmVuYW1lICYmICFpc1VwZGF0ZU9yQ29tbWl0O1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMubGVmdFN5bmNocm9GaWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uID09IHRoaXMucmlnaHRTeW5jaHJvRmlsZS5yZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbikge1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzVXBkYXRlT3JDb21taXQgfHwgaXNSZW5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpc1N5bmNocm9uaXplZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaXNTeW5jaHJvbml6ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGlzU3luY2hyb25pemVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRidXR0b25MZWZ0RGl2LmFwcGVuZChqUXVlcnkoJzxkaXY+c3luY2hyb24gLSA8L2Rpdj4nKSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRidXR0b25SaWdodERpdi5hcHBlbmQoalF1ZXJ5KCc8ZGl2PiAtIHN5bmNocm9uPC9kaXY+JykpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGVmdFN5bmNocm9Xb3Jrc3BhY2UuaXNXcml0YWJsZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kYnV0dG9uTGVmdERpdi5hcHBlbmQoU3luY2hyb25pemF0aW9uTGlzdEVsZW1lbnQubWFrZUJ1dHRvbihcInVwZGF0ZVwiLCBcImxlZnRcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmxlZnRTeW5jaHJvRmlsZS50ZXh0ID0gdGhhdC5yaWdodFN5bmNocm9GaWxlLnRleHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubGVmdFN5bmNocm9GaWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uID0gdGhhdC5yaWdodFN5bmNocm9GaWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmxlZnRTeW5jaHJvRmlsZS5pZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5sZWZ0U3luY2hyb0ZpbGUubmFtZSA9IHRoYXQucmlnaHRTeW5jaHJvRmlsZS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmxlZnRTeW5jaHJvRmlsZS5zdGF0ZSA9IFwiY2hhbmdlZFwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm9uRmlsZUNoYW5nZWQoXCJsZWZ0XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIG9ubHlSZW5hbWUpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJpZ2h0U3luY2hyb1dvcmtzcGFjZS5pc1dyaXRhYmxlKCkgJiYgIW5lZWRzTWVyZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRidXR0b25SaWdodERpdi5hcHBlbmQoU3luY2hyb25pemF0aW9uTGlzdEVsZW1lbnQubWFrZUJ1dHRvbihcImNvbW1pdFwiLCBcInJpZ2h0XCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5yaWdodFN5bmNocm9GaWxlLnRleHQgPSB0aGF0LmxlZnRTeW5jaHJvRmlsZS50ZXh0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnJpZ2h0U3luY2hyb0ZpbGUubmFtZSA9IHRoYXQubGVmdFN5bmNocm9GaWxlLm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucmlnaHRTeW5jaHJvRmlsZS5yZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbisrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5sZWZ0U3luY2hyb1dvcmtzcGFjZS5pc1dyaXRhYmxlKCkpIHRoYXQucmlnaHRTeW5jaHJvRmlsZS5jb21taXR0ZWRGcm9tRmlsZSA9IHRoYXQubGVmdFN5bmNocm9GaWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5sZWZ0U3luY2hyb1dvcmtzcGFjZS5pc1dyaXRhYmxlKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubGVmdFN5bmNocm9GaWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uID0gdGhhdC5yaWdodFN5bmNocm9GaWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sZWZ0U3luY2hyb0ZpbGUuaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbiA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5yaWdodFN5bmNocm9GaWxlLnN0YXRlID0gXCJjaGFuZ2VkXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQub25GaWxlQ2hhbmdlZChcInJpZ2h0XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIG9ubHlSZW5hbWUpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLiRidXR0b25MZWZ0RGl2LmFwcGVuZCgkc3BhY2VyMSk7XHJcblxyXG5cclxuICAgICAgICB0aGlzLiRsZWZ0RmlsZURpdi5hcHBlbmQoalF1ZXJ5KGA8ZGl2IGNsYXNzPVwiam9fc3luY2hyb19maWxlbmFtZVwiPiR7bGVmdENhcHRpb259PHNwYW4gY2xhc3M9XCJqb19zeW5jaHJvX2ZpbGVWZXJzaW9uXCI+JHtsZWZ0VmVyc2lvbkNhcHRpb259PC9zcGFuPjwvZGl2PmApKTtcclxuICAgICAgICB0aGlzLiRyaWdodEZpbGVEaXYuYXBwZW5kKGpRdWVyeShgPGRpdiBjbGFzcz1cImpvX3N5bmNocm9fZmlsZW5hbWVcIj4ke3JpZ2h0Q2FwdGlvbn08c3BhbiBjbGFzcz1cImpvX3N5bmNocm9fZmlsZVZlcnNpb25cIj4ke3JpZ2h0VmVyc2lvbkNhcHRpb259PC9zcGFuPjwvZGl2PmApKTtcclxuXHJcbiAgICAgICAgaWYgKG5lZWRzTWVyZ2UpIHtcclxuICAgICAgICAgICAgdGhpcy4kbWFya0FzTWVyZ2VkQnV0dG9uRGl2ID0galF1ZXJ5KGA8ZGl2IGNsYXNzPVwiam9fc3luY2hyb19idXR0b24gam9fc3luY2hyb19tYXJrQXNNZXJnZWRCdXR0b25cIj5BbHMgXCJtZXJnZWRcIiBtYXJraWVyZW48L2Rpdj5gKTtcclxuICAgICAgICAgICAgdGhpcy4kbGVmdEZpbGVEaXYuYXBwZW5kKHRoaXMuJG1hcmtBc01lcmdlZEJ1dHRvbkRpdik7XHJcbiAgICAgICAgICAgIHRoaXMuJG1hcmtBc01lcmdlZEJ1dHRvbkRpdi5vbihcImNsaWNrXCIsIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sZWZ0U3luY2hyb0ZpbGUubWFya2VkQXNNZXJnZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21wYXJlRmlsZXNBbmRBZGFwdEdVSSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmxlZnRTeW5jaHJvRmlsZSAhPSBudWxsICYmIHRoaXMubGVmdFN5bmNocm9GaWxlLm1hcmtlZEFzTWVyZ2VkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvd01lcmdlZERpdigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYW5hZ2VyLnVwZGF0ZUNlbnRlckJ1dHRvbnMoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2hvd01lcmdlZERpdigpIHtcclxuICAgICAgICBsZXQgJG1lcmdlZERpdiA9IGpRdWVyeShgPGRpdiBjbGFzcz1cImpvX3N5bmNocm9fbWVyZ2VkRGl2XCI+bWVyZ2VkPC9kaXY+PGRpdiBjbGFzcz1cImltZ19lcnJvcmZyZWVcIj48L2Rpdj5gKTtcclxuICAgICAgICB0aGlzLiRsZWZ0RmlsZURpdi5hcHBlbmQoJG1lcmdlZERpdik7XHJcbiAgICB9XHJcblxyXG4gICAgZW1wdHlHVUkoKSB7XHJcbiAgICAgICAgdGhpcy4kbGVmdEZpbGVEaXYuZW1wdHkoKTtcclxuICAgICAgICB0aGlzLiRyaWdodEZpbGVEaXYuZW1wdHkoKTtcclxuICAgICAgICB0aGlzLiRidXR0b25MZWZ0RGl2LmVtcHR5KCk7XHJcbiAgICAgICAgdGhpcy4kYnV0dG9uUmlnaHREaXYuZW1wdHkoKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgbWFrZUJ1dHRvbihraW5kOiBCdXR0b25LaW5kLCBhcnJvd0RpcmVjdGlvbjogTGVmdFJpZ2h0LCBjYWxsYmFjazogKCkgPT4gdm9pZCwgb25seVJlbmFtZTogYm9vbGVhbik6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD4ge1xyXG5cclxuICAgICAgICBsZXQgY2FwdGlvbiA9IFwiXCI7XHJcbiAgICAgICAgbGV0IGtsYXNzID0gXCJcIjtcclxuXHJcbiAgICAgICAgc3dpdGNoIChraW5kKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb21taXRcIjpcclxuICAgICAgICAgICAgICAgIGNhcHRpb24gPSBvbmx5UmVuYW1lID8gXCJyZW5hbWVcIiA6IFwiY29tbWl0XCI7IGtsYXNzID0gXCJqb19zeW5jaHJvX2NvbW1pdEJ1dHRvblwiOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImNvbW1pdEFsbFwiOlxyXG4gICAgICAgICAgICAgICAgY2FwdGlvbiA9IFwiY29tbWl0IGFsbFwiOyBrbGFzcyA9IFwiam9fc3luY2hyb19jb21taXRCdXR0b25cIjsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJ1cGRhdGVcIjpcclxuICAgICAgICAgICAgICAgIGNhcHRpb24gPSBvbmx5UmVuYW1lID8gXCJyZW5hbWVcIiA6IFwidXBkYXRlXCI7IGtsYXNzID0gXCJqb19zeW5jaHJvX3VwZGF0ZUJ1dHRvblwiOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInVwZGF0ZUFsbFwiOlxyXG4gICAgICAgICAgICAgICAgY2FwdGlvbiA9IFwidXBkYXRlIGFsbFwiOyBrbGFzcyA9IFwiam9fc3luY2hyb191cGRhdGVCdXR0b25cIjsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjcmVhdGVcIjogY2FwdGlvbiA9IFwiY3JlYXRlXCI7IGtsYXNzID0gXCJqb19zeW5jaHJvX2NyZWF0ZUJ1dHRvblwiOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImRlbGV0ZVwiOiBjYXB0aW9uID0gXCJkZWxldGVcIjsga2xhc3MgPSBcImpvX3N5bmNocm9fZGVsZXRlQnV0dG9uXCI7IGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3dpdGNoIChhcnJvd0RpcmVjdGlvbikge1xyXG4gICAgICAgICAgICBjYXNlIFwibGVmdFwiOiBrbGFzcyArPSBcIiBqb19zeW5jaHJvX2Fycm93TGVmdFwiOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInJpZ2h0XCI6IGtsYXNzICs9IFwiIGpvX3N5bmNocm9fYXJyb3dSaWdodFwiOyBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBkaXY6IEpRdWVyeTxIVE1MRGl2RWxlbWVudD4gPSBqUXVlcnkoYDxkaXYgY2xhc3M9XCJqb19zeW5jaHJvX2J1dHRvbiAke2tsYXNzfVwiPiR7Y2FwdGlvbn08L2Rpdj5gKTtcclxuXHJcbiAgICAgICAgZGl2Lm9uKFwiY2xpY2tcIiwgKGUpID0+IHtcclxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwpIGNhbGxiYWNrKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGRpdi5vbihcIm1vdXNlZG93blwiLCAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpIH0pXHJcblxyXG4gICAgICAgIHJldHVybiBkaXY7XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbn0iXX0=