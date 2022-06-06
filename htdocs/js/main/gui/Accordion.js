import { openContextMenu, makeEditable, jo_mouseDetected, animateToTransparent } from "../../tools/HtmlTools.js";
import { Helper } from "./Helper.js";
import { escapeHtml } from "../../tools/StringTools.js";
import { WorkspaceImporter } from "./WorkspaceImporter.js";
export class AccordionPanel {
    constructor(accordion, caption, flexWeight, newButtonClass, buttonNewTitle, defaultIconClass, withDeleteButton, withFolders, kind, enableDrag, acceptDropKinds) {
        this.accordion = accordion;
        this.caption = caption;
        this.flexWeight = flexWeight;
        this.newButtonClass = newButtonClass;
        this.buttonNewTitle = buttonNewTitle;
        this.defaultIconClass = defaultIconClass;
        this.withDeleteButton = withDeleteButton;
        this.withFolders = withFolders;
        this.kind = kind;
        this.enableDrag = enableDrag;
        this.acceptDropKinds = acceptDropKinds;
        this.elements = [];
        this.dontSortElements = false;
        accordion.addPanel(this);
        let mousePointer = window.PointerEvent ? "pointer" : "mouse";
        if (withFolders) {
            let that = this;
            this.$newFolderAction = jQuery('<div class="img_add-folder-dark jo_button jo_active" style="margin-right: 4px"' +
                ' title="Neuen Ordner auf oberster Ebene anlegen">');
            this.$newFolderAction.on(mousePointer + 'down', (e) => {
                e.stopPropagation();
                e.preventDefault();
                let pathArray = [];
                this.addFolder("Neuer Ordner", pathArray, (newElement) => {
                    this.newFolderCallback(newElement, () => {
                        this.sortElements();
                        newElement.$htmlFirstLine[0].scrollIntoView();
                        animateToTransparent(newElement.$htmlFirstLine.find('.jo_filename'), 'background-color', [0, 255, 0], 2000);
                    });
                });
            });
            this.addAction(this.$newFolderAction);
            let $collapseAllAction = jQuery('<div class="img_collapse-all-dark jo_button jo_active" style="margin-right: 4px"' +
                ' title="Alle Ordner zusammenfalten">');
            $collapseAllAction.on(mousePointer + 'down', (e) => {
                e.stopPropagation();
                e.preventDefault();
                that.collapseAll();
            });
            this.addAction($collapseAllAction);
        }
    }
    collapseAll() {
        for (let element of this.elements) {
            if (element.isFolder) {
                if (element.$htmlFirstLine.hasClass('jo_expanded')) {
                    element.$htmlFirstLine.removeClass('jo_expanded');
                    element.$htmlFirstLine.addClass('jo_collapsed');
                }
            }
            if (element.path.length > 0) {
                element.$htmlFirstLine.slideUp(200);
            }
        }
    }
    remove() {
        this.$captionElement.remove();
        this.$listElement.remove();
    }
    setFixed(fixed) {
        this.fixed = fixed;
        if (this.fixed) {
            this.grow();
            this.$captionElement.addClass('jo_fixed');
        }
        else {
            this.$captionElement.removeClass('jo_fixed');
        }
    }
    //     <div class="jo_leftpanelcaption expanded" id="workspace" data-panel="filelistouter">
    //     <span>WORKSPACE</span>
    //     <div class="jo_actions"><img id="buttonNewFile" title="Neue Datei hinzufügen"
    //             src="assets/projectexplorer/add-file-dark.svg"></div>
    // </div>
    // <div id="filelistouter" class="jo_projectexplorerdiv scrollable" data-grow="3"
    //     style="flex-grow: 3">
    //     <div id="filelist"></div>
    // </div>
    enableNewButton(enabled) {
        if (this.$buttonNew != null) {
            if (enabled) {
                this.$buttonNew.show();
            }
            else {
                this.$buttonNew.hide();
            }
        }
    }
    getCurrentlySelectedPath() {
        let pathArray = [];
        let selectedElement = this.getSelectedElement();
        if (selectedElement != null) {
            pathArray = selectedElement.path.slice(0);
            if (selectedElement.isFolder)
                pathArray.push(selectedElement.name);
        }
        return pathArray;
    }
    compareWithPath(name1, path1, isFolder1, name2, path2, isFolder2) {
        path1 = path1.slice();
        path1.push(name1);
        name1 = "";
        path2 = path2.slice();
        path2.push(name2);
        name2 = "";
        let i = 0;
        while (i < path1.length && i < path2.length) {
            let cmp = path1[i].localeCompare(path2[i]);
            if (cmp != 0)
                return cmp;
            i++;
        }
        if (path1.length < path2.length)
            return -1;
        if (path1.length > path2.length)
            return 1;
        return name1.localeCompare(name2);
        // let nameWithPath1 = path1.join("/");
        // if (nameWithPath1 != "" && name1 != "") nameWithPath1 += "/";
        // nameWithPath1 += name1;
        // let nameWithPath2 = path2.join("/");
        // if (nameWithPath2 != "" && name2 != "") nameWithPath2 += "/";
        // nameWithPath2 += name2;
        // return nameWithPath1.localeCompare(nameWithPath2);
    }
    getElementIndex(name, path, isFolder) {
        for (let i = 0; i < this.elements.length; i++) {
            let element = this.elements[i];
            if (this.compareWithPath(name, path, isFolder, element.name, element.path, element.isFolder) < 0)
                return i;
        }
        return this.elements.length;
    }
    insertElement(ae) {
        let insertIndex = this.getElementIndex(ae.name, ae.path, ae.isFolder);
        // if (ae.path.length == 0) insertIndex = this.elements.length;
        this.elements.splice(insertIndex, 0, ae);
        let $elements = this.$listElement.find('.jo_file');
        if (insertIndex == 0) {
            this.$listElement.prepend(ae.$htmlFirstLine);
        }
        else if (insertIndex == $elements.length) {
            this.$listElement.append(ae.$htmlFirstLine);
        }
        else {
            let elementAtIndex = $elements.get(insertIndex);
            jQuery(elementAtIndex).before(ae.$htmlFirstLine);
        }
    }
    addFolder(name, path, callback) {
        let ae = {
            name: name,
            isFolder: true,
            path: path
        };
        let $element = this.renderElement(ae, true);
        this.insertElement(ae);
        $element[0].scrollIntoView();
        this.renameElement(ae, () => {
            callback(ae);
        });
    }
    renderOuterHtmlElements($accordionDiv) {
        let that = this;
        this.$captionElement = jQuery(`<div class="jo_leftpanelcaption jo_expanded">
        <div class="jo_captiontext">` + this.caption + `</div><div class="jo_actions"></div></div>`);
        if (this.newButtonClass != null) {
            this.$buttonNew = jQuery('<div class="jo_button jo_active ' + this.newButtonClass + '" title="' + this.buttonNewTitle + '">');
            this.$captionElement.find('.jo_actions').append(this.$buttonNew);
            let mousePointer = window.PointerEvent ? "pointer" : "mouse";
            this.$buttonNew.on(mousePointer + 'down', (ev) => {
                Helper.close();
                ev.stopPropagation();
                let path = that.getCurrentlySelectedPath();
                let ae = {
                    name: "Neu",
                    isFolder: false,
                    path: path
                };
                let insertIndex = this.getElementIndex("", path, false);
                this.elements.splice(insertIndex, 0, ae);
                let $element = this.renderElement(ae, true);
                if (insertIndex == 0) {
                    this.$listElement.prepend($element);
                }
                else {
                    let elementAtIndex = this.$listElement.find('.jo_file').get(insertIndex - 1);
                    jQuery(elementAtIndex).after($element);
                }
                $element[0].scrollIntoView();
                that.renameElement(ae, () => {
                    that.newElementCallback(ae, (externalElement) => {
                        ae.externalElement = externalElement;
                        if (ae.$htmlSecondLine != null) {
                            ae.$htmlSecondLine.insertAfter($element);
                        }
                        if (that.selectCallback != null)
                            that.select(ae.externalElement);
                    });
                });
            });
        }
        let $listOuter = jQuery('<div id="filelistouter" class="jo_projectexplorerdiv jo_scrollable" data-grow="'
            + this.flexWeight + '" style="flex-grow: ' + this.flexWeight + '"></div>');
        this.$listElement = jQuery('<div class="jo_filelist"></div>');
        $listOuter.append(this.$listElement);
        $accordionDiv.append(this.$captionElement);
        $accordionDiv.append($listOuter);
        let $ce = this.$captionElement;
        let $li = this.$listElement.parent();
        let mousePointer = window.PointerEvent ? "pointer" : "mouse";
        $ce.on(mousePointer + 'down', (ev) => {
            if (ev.button != 0) {
                return;
            }
            if (!this.fixed) {
                let targetGrow = $li.data('grow');
                if ($ce.hasClass('jo_expanded')) {
                    if (that.accordion.parts.length > 1) {
                        $li.animate({
                            'flex-grow': 0.001
                        }, 1000, () => { $ce.toggleClass('jo_expanded'); });
                    }
                }
                else {
                    $ce.toggleClass('jo_expanded');
                    $li.animate({
                        'flex-grow': targetGrow
                    }, 1000);
                }
            }
        });
        $ce.on('dragover', (event) => {
            if (AccordionPanel.currentlyDraggedElementKind == that.kind) {
                $ce.addClass('jo_file_dragover');
                event.preventDefault();
            }
        });
        $ce.on('dragleave', (event) => {
            $ce.removeClass('jo_file_dragover');
        });
        $ce.on('drop', (event) => {
            if (AccordionPanel.currentlyDraggedElementKind == that.kind) {
                event.preventDefault();
                $ce.removeClass('jo_file_dragover');
                let element1 = AccordionPanel.currentlyDraggedElement;
                if (element1 != null) {
                    that.moveElement(element1, null);
                }
            }
        });
    }
    grow() {
        let $li = this.$listElement.parent();
        let targetGrow = $li.data('grow');
        $li.css('flex-grow', targetGrow);
        this.$captionElement.addClass('jo_expanded');
    }
    addElement(element, expanded) {
        // this.elements.push(element);
        // element.$htmlFirstLine = this.renderElement(element, expanded);
        // this.$listElement.prepend(element.$htmlFirstLine);
        element.$htmlFirstLine = this.renderElement(element, expanded);
        this.insertElement(element);
    }
    sortElements() {
        if (this.dontSortElements)
            return;
        this.elements.sort((a, b) => {
            let aName = a.sortName ? a.sortName : a.name;
            let bName = b.sortName ? b.sortName : b.name;
            return this.compareWithPath(aName, a.path, a.isFolder, bName, b.path, b.isFolder);
        });
        this.elements.forEach((element) => { this.$listElement.append(element.$htmlFirstLine); });
    }
    setTextAfterFilename(element, text, cssClass) {
        let $div = element.$htmlFirstLine.find('.jo_textAfterName');
        $div.addClass(cssClass);
        $div.html(text);
    }
    addAction($element) {
        this.$captionElement.find('.jo_actions').prepend($element);
    }
    renderElement(element, expanded) {
        let mousePointer = window.PointerEvent ? "pointer" : "mouse";
        let that = this;
        let expandedCollapsed = "";
        if (element.iconClass == null)
            element.iconClass = this.defaultIconClass;
        if (element.isFolder) {
            element.iconClass = "folder";
            expandedCollapsed = expanded ? " jo_expanded" : " jo_collapsed";
        }
        let pathHtml = "";
        if (element.path == null)
            element.path = [];
        for (let i = 0; i < element.path.length; i++) {
            pathHtml += '<div class="jo_folderline"></div>';
        }
        element.$htmlFirstLine = jQuery(`<div class="jo_file jo_${element.iconClass} ${expandedCollapsed}">
        <div class="jo_folderlines">${pathHtml}</div>
           <div class="jo_fileimage"></div>
           <div class="jo_filename">${escapeHtml(element.name)}</div>
           <div class="jo_textAfterName"></div>
           <div class="jo_additionalButtonHomework"></div>
           <div class="jo_additionalButtonStart"></div>
           <div class="jo_additionalButtonRepository"></div>
           ${this.withDeleteButton ? '<div class="jo_delete img_delete jo_button jo_active' + (false ? " jo_delete_always" : "") + '"></div>' : ""}
           ${!jo_mouseDetected ? '<div class="jo_settings_button img_ellipsis-dark jo_button jo_active"></div>' : ""}
           </div>`);
        if (!expanded && element.path.length > 0) {
            element.$htmlFirstLine.hide();
        }
        if (this.addElementActionCallback != null) {
            let $elementAction = this.addElementActionCallback(element);
            element.$htmlFirstLine.append($elementAction);
        }
        if (this.withFolders) {
            if (element.isFolder) {
                element.$htmlFirstLine.on('dragover', (event) => {
                    if (AccordionPanel.currentlyDraggedElementKind == that.kind) {
                        element.$htmlFirstLine.addClass('jo_file_dragover');
                        event.preventDefault();
                    }
                });
                element.$htmlFirstLine.on('dragleave', (event) => {
                    element.$htmlFirstLine.removeClass('jo_file_dragover');
                });
                element.$htmlFirstLine.on('drop', (event) => {
                    if (AccordionPanel.currentlyDraggedElementKind == that.kind) {
                        event.preventDefault();
                        element.$htmlFirstLine.removeClass('jo_file_dragover');
                        let element1 = AccordionPanel.currentlyDraggedElement;
                        AccordionPanel.currentlyDraggedElement = null;
                        if (element1 != null) {
                            that.moveElement(element1, element);
                        }
                    }
                });
            }
        }
        if (this.withFolders || this.enableDrag) {
            let $filedragpart = element.$htmlFirstLine.find('.jo_filename');
            $filedragpart.attr('draggable', 'true');
            $filedragpart.on('dragstart', (event) => {
                AccordionPanel.currentlyDraggedElement = element;
                AccordionPanel.currentlyDraggedElementKind = that.kind;
                event.originalEvent.dataTransfer.effectAllowed = element.isFolder ? "move" : "copyMove";
            });
        }
        if (this.acceptDropKinds != null && this.acceptDropKinds.length > 0) {
            if (!element.isFolder) {
                element.$htmlFirstLine.on('dragover', (event) => {
                    if (this.acceptDropKinds.indexOf(AccordionPanel.currentlyDraggedElementKind) >= 0) {
                        element.$htmlFirstLine.addClass('jo_file_dragover');
                        if (event.ctrlKey) {
                            event.originalEvent.dataTransfer.dropEffect = "copy";
                        }
                        else {
                            event.originalEvent.dataTransfer.dropEffect = "move";
                        }
                        event.preventDefault();
                    }
                });
                element.$htmlFirstLine.on('dragleave', (event) => {
                    element.$htmlFirstLine.removeClass('jo_file_dragover');
                });
                element.$htmlFirstLine.on('drop', (event) => {
                    if (this.acceptDropKinds.indexOf(AccordionPanel.currentlyDraggedElementKind) >= 0) {
                        event.preventDefault();
                        element.$htmlFirstLine.removeClass('jo_file_dragover');
                        let element1 = AccordionPanel.currentlyDraggedElement;
                        AccordionPanel.currentlyDraggedElement = null;
                        if (element1 != null) {
                            if (that.dropElementCallback != null)
                                that.dropElementCallback(element, element1, event.ctrlKey ? "copy" : "move");
                        }
                    }
                });
            }
        }
        element.$htmlFirstLine.on(mousePointer + 'up', (ev) => {
            if (ev.button == 0 && that.selectCallback != null) {
                that.selectCallback(element.externalElement);
                for (let ae of that.elements) {
                    if (ae != element && ae.$htmlFirstLine.hasClass('jo_active')) {
                        ae.$htmlFirstLine.removeClass('jo_active');
                    }
                }
                element.$htmlFirstLine.addClass('jo_active');
                if (element.isFolder) {
                    if (element.$htmlFirstLine.hasClass('jo_expanded')) {
                        element.$htmlFirstLine.removeClass('jo_expanded');
                        element.$htmlFirstLine.addClass('jo_collapsed');
                    }
                    else {
                        element.$htmlFirstLine.addClass('jo_expanded');
                        element.$htmlFirstLine.removeClass('jo_collapsed');
                    }
                    let pathIsCollapsed = {};
                    for (let e of this.elements) {
                        if (e.isFolder) {
                            let path = e.path.join("/");
                            if (path != "")
                                path += "/";
                            path += e.name;
                            pathIsCollapsed[path] = e.$htmlFirstLine.hasClass('jo_collapsed');
                            if (pathIsCollapsed[e.path.join("/")])
                                pathIsCollapsed[path] = true;
                        }
                    }
                    pathIsCollapsed[""] = false;
                    for (let e of this.elements) {
                        if (pathIsCollapsed[e.path.join("/")]) {
                            e.$htmlFirstLine.slideUp(200);
                        }
                        else {
                            e.$htmlFirstLine.slideDown(200);
                        }
                    }
                }
            }
        });
        let contextmenuHandler = function (event) {
            let contextMenuItems = [];
            if (that.renameCallback != null) {
                contextMenuItems.push({
                    caption: "Umbenennen",
                    callback: () => {
                        that.renameElement(element);
                    }
                });
            }
            let mousePointer = window.PointerEvent ? "pointer" : "mouse";
            if (element.isFolder) {
                contextMenuItems = contextMenuItems.concat([
                    {
                        caption: "Neuen Unterordner anlegen (unterhalb '" + element.name + "')...",
                        callback: () => {
                            that.select(element.externalElement);
                            // that.$newFolderAction.trigger(mousePointer + 'down');
                            let pathArray = that.getCurrentlySelectedPath();
                            that.addFolder("Neuer Ordner", pathArray, (newElement) => {
                                that.newFolderCallback(newElement, () => {
                                    that.sortElements();
                                    newElement.$htmlFirstLine[0].scrollIntoView();
                                    animateToTransparent(newElement.$htmlFirstLine.find('.jo_filename'), 'background-color', [0, 255, 0], 2000);
                                });
                            });
                        }
                    }, {
                        caption: "Neuer Workspace...",
                        callback: () => {
                            that.select(element.externalElement);
                            that.$buttonNew.trigger(mousePointer + 'down');
                        }
                    }, {
                        caption: "Workspace importieren...",
                        callback: () => {
                            new WorkspaceImporter(that.accordion.main, element.path.concat([element.name])).show();
                        }
                    }
                ]);
            }
            if (that.contextMenuProvider != null && !element.isFolder) {
                for (let cmi of that.contextMenuProvider(element)) {
                    contextMenuItems.push({
                        caption: cmi.caption,
                        callback: () => {
                            cmi.callback(element);
                        },
                        color: cmi.color,
                        subMenu: cmi.subMenu == null ? null : cmi.subMenu.map((mi) => {
                            return {
                                caption: mi.caption,
                                callback: () => {
                                    mi.callback(element);
                                },
                                color: mi.color
                            };
                        })
                    });
                }
            }
            if (contextMenuItems.length > 0) {
                event.preventDefault();
                event.stopPropagation();
                openContextMenu(contextMenuItems, event.pageX, event.pageY);
            }
        };
        element.$htmlFirstLine[0].addEventListener("contextmenu", contextmenuHandler, false);
        // long press for touch devices
        let pressTimer;
        if (!jo_mouseDetected) {
            element.$htmlFirstLine.on('pointerup', () => {
                clearTimeout(pressTimer);
                return false;
            }).on('pointerdown', (event) => {
                pressTimer = window.setTimeout(() => {
                    contextmenuHandler(event);
                }, 500);
                return false;
            });
        }
        if (!jo_mouseDetected) {
            element.$htmlFirstLine.find('.jo_settings_button').on('pointerdown', (e) => {
                contextmenuHandler(e);
            });
            element.$htmlFirstLine.find('.jo_settings_button').on('mousedown click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }
        if (that.withDeleteButton) {
            element.$htmlFirstLine.find('.jo_delete').on(mousePointer + 'down', (ev) => {
                ev.preventDefault();
                openContextMenu([{
                        caption: "Abbrechen",
                        callback: () => {
                            // nothing to do.
                        }
                    }, {
                        caption: "Ich bin mir sicher: löschen!",
                        color: "#ff6060",
                        callback: () => {
                            if (element.isFolder) {
                                if (that.getChildElements(element).length > 0) {
                                    alert('Dieser Ordner kann nicht gelöscht werden, da er nicht leer ist.');
                                    return;
                                }
                            }
                            that.deleteCallback(element.externalElement, () => {
                                element.$htmlFirstLine.remove();
                                if (element.$htmlSecondLine != null)
                                    element.$htmlSecondLine.remove();
                                that.elements.splice(that.elements.indexOf(element), 1);
                                if (that.selectCallback != null) {
                                    if (that.elements.length > 0) {
                                        that.select(that.elements[0].externalElement);
                                    }
                                    else {
                                        that.select(null);
                                    }
                                }
                            });
                        }
                    }], ev.pageX + 2, ev.pageY + 2);
                ev.stopPropagation();
            });
        }
        return element.$htmlFirstLine;
    }
    moveElement(elementToMove, destinationFolder) {
        let destinationPath = destinationFolder == null ? [] : destinationFolder.path.slice(0).concat([destinationFolder.name]);
        if (elementToMove.isFolder) {
            let movedElements = [elementToMove];
            let sourcePath = elementToMove.path.concat([elementToMove.name]).join("/");
            if (destinationPath.join('/').indexOf(sourcePath) == 0)
                return;
            let oldPathLength = elementToMove.path.length;
            elementToMove.path = destinationPath.slice(0);
            for (let element of this.elements) {
                if (element.path.join("/").startsWith(sourcePath)) {
                    element.path.splice(0, oldPathLength);
                    element.path = destinationPath.concat(element.path);
                    movedElements.push(element);
                }
            }
            for (let el of movedElements) {
                el.$htmlFirstLine.remove();
                this.elements.splice(this.elements.indexOf(el), 1);
            }
            for (let el of movedElements) {
                this.renderElement(el, true);
                this.insertElement(el);
            }
            this.moveCallback(movedElements);
        }
        else {
            elementToMove.path = destinationPath;
            elementToMove.$htmlFirstLine.remove();
            this.elements.splice(this.elements.indexOf(elementToMove), 1);
            this.renderElement(elementToMove, true);
            this.insertElement(elementToMove);
            this.select(elementToMove.externalElement);
            elementToMove.$htmlFirstLine[0].scrollIntoView();
            this.moveCallback(elementToMove);
        }
    }
    getChildElements(folder) {
        let path = folder.path.slice(0).concat(folder.name).join("/");
        return this.elements.filter((element) => element.path.join("/").startsWith(path));
    }
    renameElement(element, callback) {
        let that = this;
        let $div = element.$htmlFirstLine.find('.jo_filename');
        let pointPos = element.name.indexOf('.');
        let selection = pointPos == null ? null : { start: 0, end: pointPos };
        this.dontSortElements = true;
        makeEditable($div, $div, (newText) => {
            if (element.externalElement != null)
                newText = that.renameCallback(element.externalElement, newText);
            element.name = newText;
            $div.html(element.name);
            if (callback != null)
                callback();
            that.sortElements();
            $div[0].scrollIntoView();
            this.dontSortElements = false;
        }, selection);
    }
    select(externalElement, invokeCallback = true, scrollIntoView = false) {
        if (externalElement == null) {
            for (let ae1 of this.elements) {
                if (ae1.$htmlFirstLine.hasClass('jo_active'))
                    ae1.$htmlFirstLine.removeClass('jo_active');
            }
        }
        else {
            let ae = this.findElement(externalElement);
            if (ae != null) {
                for (let ae1 of this.elements) {
                    if (ae1.$htmlFirstLine.hasClass('jo_active'))
                        ae1.$htmlFirstLine.removeClass('jo_active');
                }
                ae.$htmlFirstLine.addClass('jo_active');
                if (scrollIntoView) {
                    let pathString = ae.path.join("/");
                    for (let el of this.elements) {
                        let elPath = el.path.slice(0);
                        if (pathString.startsWith(elPath.join("/"))) {
                            if (el.isFolder) {
                                elPath.push(el.name);
                                if (pathString.startsWith(elPath.join("/"))) {
                                    el.$htmlFirstLine.removeClass("jo_collapsed");
                                    el.$htmlFirstLine.addClass("jo_expanded");
                                }
                            }
                            el.$htmlFirstLine.show();
                        }
                    }
                    ae.$htmlFirstLine[0].scrollIntoView();
                }
            }
        }
        if (invokeCallback && this.selectCallback != null)
            this.selectCallback(externalElement);
    }
    getPathString(ae) {
        let ps = ae.path.join("/");
        if (ae.isFolder) {
            if (ps != "")
                ps += "/";
            ps += ae.name;
        }
        return ps;
    }
    setElementClass(element, iconClass) {
        var _a;
        if (element != null) {
            (_a = element.$htmlFirstLine) === null || _a === void 0 ? void 0 : _a.removeClass("jo_" + element.iconClass).addClass("jo_" + iconClass);
            element.iconClass = iconClass;
        }
    }
    findElement(externalElement) {
        for (let ae of this.elements) {
            if (ae.externalElement == externalElement) {
                return ae;
            }
        }
        return null;
    }
    removeElement(externalElement) {
        for (let ae of this.elements) {
            if (ae.externalElement == externalElement) {
                ae.$htmlFirstLine.remove();
                if (ae.$htmlSecondLine != null)
                    ae.$htmlSecondLine.remove();
                this.elements.splice(this.elements.indexOf(ae), 1);
                if (this.selectCallback != null) {
                    if (this.elements.length > 0) {
                        this.select(this.elements[0].externalElement);
                    }
                    else {
                        this.select(null);
                    }
                }
                return;
            }
        }
    }
    clear() {
        this.$listElement.empty();
        this.elements = [];
    }
    setCaption(text) {
        this.$captionElement.find('.jo_captiontext').html(text);
    }
    getSelectedElement() {
        for (let ae of this.elements) {
            if (ae.$htmlFirstLine.hasClass('jo_active')) {
                return ae;
            }
        }
        return null;
    }
}
export class Accordion {
    constructor(main, $html) {
        this.main = main;
        this.parts = [];
        this.$html = $html;
        $html.addClass('jo_leftpanelinner');
    }
    addPanel(panel) {
        panel.renderOuterHtmlElements(this.$html);
        this.parts.push(panel);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWNjb3JkaW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9BY2NvcmRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQW1CLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbEksT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNyQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUF1QjNELE1BQU0sT0FBTyxjQUFjO0lBMkJ2QixZQUFvQixTQUFvQixFQUFVLE9BQWUsRUFBVSxVQUFrQixFQUNqRixjQUFzQixFQUFVLGNBQXNCLEVBQ3RELGdCQUF3QixFQUFVLGdCQUF5QixFQUFVLFdBQW9CLEVBQ3pGLElBQWdELEVBQVUsVUFBbUIsRUFBVSxlQUF5QjtRQUh4RyxjQUFTLEdBQVQsU0FBUyxDQUFXO1FBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUFVLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDakYsbUJBQWMsR0FBZCxjQUFjLENBQVE7UUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBUTtRQUN0RCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVE7UUFBVSxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVM7UUFBVSxnQkFBVyxHQUFYLFdBQVcsQ0FBUztRQUN6RixTQUFJLEdBQUosSUFBSSxDQUE0QztRQUFVLGVBQVUsR0FBVixVQUFVLENBQVM7UUFBVSxvQkFBZSxHQUFmLGVBQWUsQ0FBVTtRQTVCNUgsYUFBUSxHQUF1QixFQUFFLENBQUM7UUFRbEMscUJBQWdCLEdBQVksS0FBSyxDQUFDO1FBc0I5QixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXpCLElBQUksWUFB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QixDQUFDO0NBSUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBvcGVuQ29udGV4dE1lbnUsIG1ha2VFZGl0YWJsZSwgQ29udGV4dE1lbnVJdGVtLCBqb19tb3VzZURldGVjdGVkLCBhbmltYXRlVG9UcmFuc3BhcmVudCB9IGZyb20gXCIuLi8uLi90b29scy9IdG1sVG9vbHMuanNcIjtcclxuaW1wb3J0IHsgSGVscGVyIH0gZnJvbSBcIi4vSGVscGVyLmpzXCI7XHJcbmltcG9ydCB7IGVzY2FwZUh0bWwgfSBmcm9tIFwiLi4vLi4vdG9vbHMvU3RyaW5nVG9vbHMuanNcIjtcclxuaW1wb3J0IHsgaXNKU0RvY1RoaXNUYWcsIGlzVGhpc1R5cGVOb2RlIH0gZnJvbSBcInR5cGVzY3JpcHRcIjtcclxuaW1wb3J0IHsgV29ya3NwYWNlSW1wb3J0ZXIgfSBmcm9tIFwiLi9Xb3Jrc3BhY2VJbXBvcnRlci5qc1wiO1xyXG5pbXBvcnQgeyBNYWluIH0gZnJvbSBcIi4uL01haW4uanNcIjtcclxuaW1wb3J0IHsgTWFpbkJhc2UgfSBmcm9tIFwiLi4vTWFpbkJhc2UuanNcIjtcclxuXHJcbmV4cG9ydCB0eXBlIEFjY29yZGlvbkVsZW1lbnQgPSB7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBzb3J0TmFtZT86IHN0cmluZzsgICAgICAvLyBpZiBzb3J0TmFtZSA9PSBudWxsLCB0aGVuIG5hbWUgd2lsbCBiZSB1c2VkIHdoZW4gc29ydGluZ1xyXG4gICAgZXh0ZXJuYWxFbGVtZW50PzogYW55O1xyXG4gICAgaWNvbkNsYXNzPzogc3RyaW5nO1xyXG4gICAgJGh0bWxGaXJzdExpbmU/OiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG4gICAgJGh0bWxTZWNvbmRMaW5lPzogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuXHJcbiAgICBpc0ZvbGRlcjogYm9vbGVhbjtcclxuICAgIHBhdGg6IHN0cmluZ1tdO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBBY2NvcmRpb25Db250ZXh0TWVudUl0ZW0gPSB7XHJcbiAgICBjYXB0aW9uOiBzdHJpbmc7XHJcbiAgICBjb2xvcj86IHN0cmluZztcclxuICAgIGNhbGxiYWNrOiAocGFuZWw6IEFjY29yZGlvbkVsZW1lbnQpID0+IHZvaWQ7XHJcbiAgICBzdWJNZW51PzogQWNjb3JkaW9uQ29udGV4dE1lbnVJdGVtW11cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFjY29yZGlvblBhbmVsIHtcclxuXHJcbiAgICBlbGVtZW50czogQWNjb3JkaW9uRWxlbWVudFtdID0gW107XHJcblxyXG4gICAgJGNhcHRpb25FbGVtZW50OiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG4gICAgJGJ1dHRvbk5ldzogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuICAgICRsaXN0RWxlbWVudDogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuXHJcbiAgICBwcml2YXRlIGZpeGVkOiBib29sZWFuO1xyXG5cclxuICAgIGRvbnRTb3J0RWxlbWVudHM6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBzdGF0aWMgY3VycmVudGx5RHJhZ2dlZEVsZW1lbnQ6IEFjY29yZGlvbkVsZW1lbnQ7XHJcbiAgICBzdGF0aWMgY3VycmVudGx5RHJhZ2dlZEVsZW1lbnRLaW5kOiBzdHJpbmc7XHJcblxyXG4gICAgbmV3RWxlbWVudENhbGxiYWNrOiAoYWU6IEFjY29yZGlvbkVsZW1lbnQsIGNhbGxiYWNrSWZTdWNjZXNzZnVsOiAoZXh0ZXJuYWxFbGVtZW50OiBhbnkpID0+IHZvaWQpID0+IHZvaWQ7XHJcbiAgICBuZXdGb2xkZXJDYWxsYmFjazogKGFlOiBBY2NvcmRpb25FbGVtZW50LCBjYWxsYmFja0lmU3VjY2Vzc2Z1bDogKGV4dGVybmFsRWxlbWVudDogYW55KSA9PiB2b2lkKSA9PiB2b2lkO1xyXG4gICAgcmVuYW1lQ2FsbGJhY2s6IChleHRlcm5hbEVsZW1lbnQ6IGFueSwgbmV3TmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XHJcbiAgICBkZWxldGVDYWxsYmFjazogKGV4dGVybmFsRWxlbWVudDogYW55LCBjYWxsYmFja0lmU3VjY2Vzc2Z1bDogKCkgPT4gdm9pZCkgPT4gdm9pZDtcclxuICAgIHNlbGVjdENhbGxiYWNrOiAoZXh0ZXJuYWxFbGVtZW50OiBhbnkpID0+IHZvaWQ7XHJcbiAgICBhZGRFbGVtZW50QWN0aW9uQ2FsbGJhY2s6IChhY2NvcmRpb25FbGVtZW50OiBBY2NvcmRpb25FbGVtZW50KSA9PiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG4gICAgY29udGV4dE1lbnVQcm92aWRlcjogKGV4dGVybmFsRWxlbWVudDogYW55KSA9PiBBY2NvcmRpb25Db250ZXh0TWVudUl0ZW1bXTtcclxuICAgIG1vdmVDYWxsYmFjazogKGFlOiBBY2NvcmRpb25FbGVtZW50IHwgQWNjb3JkaW9uRWxlbWVudFtdKSA9PiB2b2lkO1xyXG4gICAgZHJvcEVsZW1lbnRDYWxsYmFjazogKGRlc3Q6IEFjY29yZGlvbkVsZW1lbnQsIGRyb3BwZWRFbGVtZW50OiBBY2NvcmRpb25FbGVtZW50LCBkcm9wRWZmZWt0OiBcImNvcHlcIiB8IFwibW92ZVwiKSA9PiB2b2lkO1xyXG5cclxuICAgICRuZXdGb2xkZXJBY3Rpb246IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBhY2NvcmRpb246IEFjY29yZGlvbiwgcHJpdmF0ZSBjYXB0aW9uOiBzdHJpbmcsIHByaXZhdGUgZmxleFdlaWdodDogc3RyaW5nLFxyXG4gICAgICAgIHByaXZhdGUgbmV3QnV0dG9uQ2xhc3M6IHN0cmluZywgcHJpdmF0ZSBidXR0b25OZXdUaXRsZTogc3RyaW5nLFxyXG4gICAgICAgIHByaXZhdGUgZGVmYXVsdEljb25DbGFzczogc3RyaW5nLCBwcml2YXRlIHdpdGhEZWxldGVCdXR0b246IGJvb2xlYW4sIHByaXZhdGUgd2l0aEZvbGRlcnM6IGJvb2xlYW4sXHJcbiAgICAgICAgcHJpdmF0ZSBraW5kOiBcIndvcmtzcGFjZVwiIHwgXCJmaWxlXCIgfCBcImNsYXNzXCIgfCBcInN0dWRlbnRcIiwgcHJpdmF0ZSBlbmFibGVEcmFnOiBib29sZWFuLCBwcml2YXRlIGFjY2VwdERyb3BLaW5kczogc3RyaW5nW10pIHtcclxuXHJcbiAgICAgICAgYWNjb3JkaW9uLmFkZFBhbmVsKHRoaXMpO1xyXG5cclxuICAgICAgICBsZXQgbW91c2VQb2ludGVyID0gd2luZG93LlBvaW50ZXJFdmVudCA/IFwicG9pbnRlclwiIDogXCJtb3VzZVwiO1xyXG5cclxuICAgICAgICBpZiAod2l0aEZvbGRlcnMpIHtcclxuICAgICAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgICAgICB0aGlzLiRuZXdGb2xkZXJBY3Rpb24gPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJpbWdfYWRkLWZvbGRlci1kYXJrIGpvX2J1dHRvbiBqb19hY3RpdmVcIiBzdHlsZT1cIm1hcmdpbi1yaWdodDogNHB4XCInICtcclxuICAgICAgICAgICAgICAgICcgdGl0bGU9XCJOZXVlbiBPcmRuZXIgYXVmIG9iZXJzdGVyIEViZW5lIGFubGVnZW5cIj4nKTtcclxuICAgICAgICAgICAgdGhpcy4kbmV3Rm9sZGVyQWN0aW9uLm9uKG1vdXNlUG9pbnRlciArICdkb3duJywgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHBhdGhBcnJheTogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEZvbGRlcihcIk5ldWVyIE9yZG5lclwiLCBwYXRoQXJyYXksIChuZXdFbGVtZW50OiBBY2NvcmRpb25FbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXdGb2xkZXJDYWxsYmFjayhuZXdFbGVtZW50LCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc29ydEVsZW1lbnRzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0VsZW1lbnQuJGh0bWxGaXJzdExpbmVbMF0uc2Nyb2xsSW50b1ZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZVRvVHJhbnNwYXJlbnQobmV3RWxlbWVudC4kaHRtbEZpcnN0TGluZS5maW5kKCcuam9fZmlsZW5hbWUnKSwgJ2JhY2tncm91bmQtY29sb3InLCBbMCwgMjU1LCAwXSwgMjAwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZEFjdGlvbih0aGlzLiRuZXdGb2xkZXJBY3Rpb24pO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGxldCAkY29sbGFwc2VBbGxBY3Rpb24gPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJpbWdfY29sbGFwc2UtYWxsLWRhcmsgam9fYnV0dG9uIGpvX2FjdGl2ZVwiIHN0eWxlPVwibWFyZ2luLXJpZ2h0OiA0cHhcIicgK1xyXG4gICAgICAgICAgICAgICAgJyB0aXRsZT1cIkFsbGUgT3JkbmVyIHp1c2FtbWVuZmFsdGVuXCI+Jyk7XHJcbiAgICAgICAgICAgICRjb2xsYXBzZUFsbEFjdGlvbi5vbihtb3VzZVBvaW50ZXIgKyAnZG93bicsIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoYXQuY29sbGFwc2VBbGwoKTtcclxuXHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZEFjdGlvbigkY29sbGFwc2VBbGxBY3Rpb24pO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbGxhcHNlQWxsKCkge1xyXG4gICAgICAgIGZvciAobGV0IGVsZW1lbnQgb2YgdGhpcy5lbGVtZW50cykge1xyXG4gICAgICAgICAgICBpZiAoZWxlbWVudC5pc0ZvbGRlcikge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuJGh0bWxGaXJzdExpbmUuaGFzQ2xhc3MoJ2pvX2V4cGFuZGVkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LiRodG1sRmlyc3RMaW5lLnJlbW92ZUNsYXNzKCdqb19leHBhbmRlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUuYWRkQ2xhc3MoJ2pvX2NvbGxhcHNlZCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50LnBhdGgubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZS5zbGlkZVVwKDIwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlKCkge1xyXG4gICAgICAgIHRoaXMuJGNhcHRpb25FbGVtZW50LnJlbW92ZSgpO1xyXG4gICAgICAgIHRoaXMuJGxpc3RFbGVtZW50LnJlbW92ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldEZpeGVkKGZpeGVkOiBib29sZWFuKSB7XHJcbiAgICAgICAgdGhpcy5maXhlZCA9IGZpeGVkO1xyXG4gICAgICAgIGlmICh0aGlzLmZpeGVkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JvdygpO1xyXG4gICAgICAgICAgICB0aGlzLiRjYXB0aW9uRWxlbWVudC5hZGRDbGFzcygnam9fZml4ZWQnKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLiRjYXB0aW9uRWxlbWVudC5yZW1vdmVDbGFzcygnam9fZml4ZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vICAgICA8ZGl2IGNsYXNzPVwiam9fbGVmdHBhbmVsY2FwdGlvbiBleHBhbmRlZFwiIGlkPVwid29ya3NwYWNlXCIgZGF0YS1wYW5lbD1cImZpbGVsaXN0b3V0ZXJcIj5cclxuICAgIC8vICAgICA8c3Bhbj5XT1JLU1BBQ0U8L3NwYW4+XHJcbiAgICAvLyAgICAgPGRpdiBjbGFzcz1cImpvX2FjdGlvbnNcIj48aW1nIGlkPVwiYnV0dG9uTmV3RmlsZVwiIHRpdGxlPVwiTmV1ZSBEYXRlaSBoaW56dWbDvGdlblwiXHJcbiAgICAvLyAgICAgICAgICAgICBzcmM9XCJhc3NldHMvcHJvamVjdGV4cGxvcmVyL2FkZC1maWxlLWRhcmsuc3ZnXCI+PC9kaXY+XHJcbiAgICAvLyA8L2Rpdj5cclxuICAgIC8vIDxkaXYgaWQ9XCJmaWxlbGlzdG91dGVyXCIgY2xhc3M9XCJqb19wcm9qZWN0ZXhwbG9yZXJkaXYgc2Nyb2xsYWJsZVwiIGRhdGEtZ3Jvdz1cIjNcIlxyXG4gICAgLy8gICAgIHN0eWxlPVwiZmxleC1ncm93OiAzXCI+XHJcbiAgICAvLyAgICAgPGRpdiBpZD1cImZpbGVsaXN0XCI+PC9kaXY+XHJcbiAgICAvLyA8L2Rpdj5cclxuXHJcblxyXG4gICAgZW5hYmxlTmV3QnV0dG9uKGVuYWJsZWQ6IGJvb2xlYW4pIHtcclxuICAgICAgICBpZiAodGhpcy4kYnV0dG9uTmV3ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKGVuYWJsZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGJ1dHRvbk5ldy5zaG93KCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRidXR0b25OZXcuaGlkZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldEN1cnJlbnRseVNlbGVjdGVkUGF0aCgpOiBzdHJpbmdbXSB7XHJcbiAgICAgICAgbGV0IHBhdGhBcnJheTogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gdGhpcy5nZXRTZWxlY3RlZEVsZW1lbnQoKTtcclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgcGF0aEFycmF5ID0gc2VsZWN0ZWRFbGVtZW50LnBhdGguc2xpY2UoMCk7XHJcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXNGb2xkZXIpIHBhdGhBcnJheS5wdXNoKHNlbGVjdGVkRWxlbWVudC5uYW1lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHBhdGhBcnJheTtcclxuICAgIH1cclxuXHJcbiAgICBjb21wYXJlV2l0aFBhdGgobmFtZTE6IHN0cmluZywgcGF0aDE6IHN0cmluZ1tdLCBpc0ZvbGRlcjE6IGJvb2xlYW4sIG5hbWUyOiBzdHJpbmcsIHBhdGgyOiBzdHJpbmdbXSwgaXNGb2xkZXIyOiBib29sZWFuKSB7XHJcblxyXG4gICAgICAgIHBhdGgxID0gcGF0aDEuc2xpY2UoKTtcclxuICAgICAgICBwYXRoMS5wdXNoKG5hbWUxKTtcclxuICAgICAgICBuYW1lMSA9IFwiXCI7XHJcblxyXG4gICAgICAgIHBhdGgyID0gcGF0aDIuc2xpY2UoKTtcclxuICAgICAgICBwYXRoMi5wdXNoKG5hbWUyKTtcclxuICAgICAgICBuYW1lMiA9IFwiXCI7XHJcblxyXG4gICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICB3aGlsZSAoaSA8IHBhdGgxLmxlbmd0aCAmJiBpIDwgcGF0aDIubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIGxldCBjbXAgPSBwYXRoMVtpXS5sb2NhbGVDb21wYXJlKHBhdGgyW2ldKTtcclxuICAgICAgICAgICAgaWYgKGNtcCAhPSAwKSByZXR1cm4gY21wO1xyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocGF0aDEubGVuZ3RoIDwgcGF0aDIubGVuZ3RoKSByZXR1cm4gLTE7XHJcbiAgICAgICAgaWYgKHBhdGgxLmxlbmd0aCA+IHBhdGgyLmxlbmd0aCkgcmV0dXJuIDE7XHJcblxyXG4gICAgICAgIHJldHVybiBuYW1lMS5sb2NhbGVDb21wYXJlKG5hbWUyKTtcclxuXHJcblxyXG4gICAgICAgIC8vIGxldCBuYW1lV2l0aFBhdGgxID0gcGF0aDEuam9pbihcIi9cIik7XHJcbiAgICAgICAgLy8gaWYgKG5hbWVXaXRoUGF0aDEgIT0gXCJcIiAmJiBuYW1lMSAhPSBcIlwiKSBuYW1lV2l0aFBhdGgxICs9IFwiL1wiO1xyXG4gICAgICAgIC8vIG5hbWVXaXRoUGF0aDEgKz0gbmFtZTE7XHJcblxyXG4gICAgICAgIC8vIGxldCBuYW1lV2l0aFBhdGgyID0gcGF0aDIuam9pbihcIi9cIik7XHJcbiAgICAgICAgLy8gaWYgKG5hbWVXaXRoUGF0aDIgIT0gXCJcIiAmJiBuYW1lMiAhPSBcIlwiKSBuYW1lV2l0aFBhdGgyICs9IFwiL1wiO1xyXG4gICAgICAgIC8vIG5hbWVXaXRoUGF0aDIgKz0gbmFtZTI7XHJcblxyXG4gICAgICAgIC8vIHJldHVybiBuYW1lV2l0aFBhdGgxLmxvY2FsZUNvbXBhcmUobmFtZVdpdGhQYXRoMik7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGdldEVsZW1lbnRJbmRleChuYW1lOiBzdHJpbmcsIHBhdGg6IHN0cmluZ1tdLCBpc0ZvbGRlcjogYm9vbGVhbik6IG51bWJlciB7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5lbGVtZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgZWxlbWVudCA9IHRoaXMuZWxlbWVudHNbaV07XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jb21wYXJlV2l0aFBhdGgobmFtZSwgcGF0aCwgaXNGb2xkZXIsIGVsZW1lbnQubmFtZSwgZWxlbWVudC5wYXRoLCBlbGVtZW50LmlzRm9sZGVyKSA8IDApIHJldHVybiBpO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZWxlbWVudHMubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIGluc2VydEVsZW1lbnQoYWU6IEFjY29yZGlvbkVsZW1lbnQpIHtcclxuICAgICAgICBsZXQgaW5zZXJ0SW5kZXggPSB0aGlzLmdldEVsZW1lbnRJbmRleChhZS5uYW1lLCBhZS5wYXRoLCBhZS5pc0ZvbGRlcik7XHJcbiAgICAgICAgLy8gaWYgKGFlLnBhdGgubGVuZ3RoID09IDApIGluc2VydEluZGV4ID0gdGhpcy5lbGVtZW50cy5sZW5ndGg7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zcGxpY2UoaW5zZXJ0SW5kZXgsIDAsIGFlKTtcclxuXHJcbiAgICAgICAgbGV0ICRlbGVtZW50cyA9IHRoaXMuJGxpc3RFbGVtZW50LmZpbmQoJy5qb19maWxlJyk7XHJcblxyXG4gICAgICAgIGlmIChpbnNlcnRJbmRleCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGxpc3RFbGVtZW50LnByZXBlbmQoYWUuJGh0bWxGaXJzdExpbmUpO1xyXG4gICAgICAgIH0gZWxzZSBpZihpbnNlcnRJbmRleCA9PSAkZWxlbWVudHMubGVuZ3RoKXtcclxuICAgICAgICAgICAgdGhpcy4kbGlzdEVsZW1lbnQuYXBwZW5kKGFlLiRodG1sRmlyc3RMaW5lKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgZWxlbWVudEF0SW5kZXggPSAkZWxlbWVudHMuZ2V0KGluc2VydEluZGV4KTtcclxuICAgICAgICAgICAgalF1ZXJ5KGVsZW1lbnRBdEluZGV4KS5iZWZvcmUoYWUuJGh0bWxGaXJzdExpbmUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgYWRkRm9sZGVyKG5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nW10sIGNhbGxiYWNrOiAobmV3UGFuZWw6IEFjY29yZGlvbkVsZW1lbnQpID0+IHZvaWQpIHtcclxuXHJcbiAgICAgICAgbGV0IGFlOiBBY2NvcmRpb25FbGVtZW50ID0ge1xyXG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICBpc0ZvbGRlcjogdHJ1ZSxcclxuICAgICAgICAgICAgcGF0aDogcGF0aFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0ICRlbGVtZW50ID0gdGhpcy5yZW5kZXJFbGVtZW50KGFlLCB0cnVlKTtcclxuXHJcbiAgICAgICAgdGhpcy5pbnNlcnRFbGVtZW50KGFlKTtcclxuXHJcbiAgICAgICAgJGVsZW1lbnRbMF0uc2Nyb2xsSW50b1ZpZXcoKTtcclxuXHJcbiAgICAgICAgdGhpcy5yZW5hbWVFbGVtZW50KGFlLCAoKSA9PiB7XHJcblxyXG4gICAgICAgICAgICBjYWxsYmFjayhhZSk7XHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuICAgIHJlbmRlck91dGVySHRtbEVsZW1lbnRzKCRhY2NvcmRpb25EaXY6IEpRdWVyeTxIVE1MRWxlbWVudD4pIHtcclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIHRoaXMuJGNhcHRpb25FbGVtZW50ID0galF1ZXJ5KGA8ZGl2IGNsYXNzPVwiam9fbGVmdHBhbmVsY2FwdGlvbiBqb19leHBhbmRlZFwiPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJqb19jYXB0aW9udGV4dFwiPmAgKyB0aGlzLmNhcHRpb24gKyBgPC9kaXY+PGRpdiBjbGFzcz1cImpvX2FjdGlvbnNcIj48L2Rpdj48L2Rpdj5gKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubmV3QnV0dG9uQ2xhc3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLiRidXR0b25OZXcgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb19idXR0b24gam9fYWN0aXZlICcgKyB0aGlzLm5ld0J1dHRvbkNsYXNzICsgJ1wiIHRpdGxlPVwiJyArIHRoaXMuYnV0dG9uTmV3VGl0bGUgKyAnXCI+Jyk7XHJcbiAgICAgICAgICAgIHRoaXMuJGNhcHRpb25FbGVtZW50LmZpbmQoJy5qb19hY3Rpb25zJykuYXBwZW5kKHRoaXMuJGJ1dHRvbk5ldyk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbW91c2VQb2ludGVyID0gd2luZG93LlBvaW50ZXJFdmVudCA/IFwicG9pbnRlclwiIDogXCJtb3VzZVwiO1xyXG4gICAgICAgICAgICB0aGlzLiRidXR0b25OZXcub24obW91c2VQb2ludGVyICsgJ2Rvd24nLCAoZXYpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBIZWxwZXIuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwYXRoID0gdGhhdC5nZXRDdXJyZW50bHlTZWxlY3RlZFBhdGgoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYWU6IEFjY29yZGlvbkVsZW1lbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJOZXVcIixcclxuICAgICAgICAgICAgICAgICAgICBpc0ZvbGRlcjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogcGF0aFxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBpbnNlcnRJbmRleCA9IHRoaXMuZ2V0RWxlbWVudEluZGV4KFwiXCIsIHBhdGgsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudHMuc3BsaWNlKGluc2VydEluZGV4LCAwLCBhZSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgJGVsZW1lbnQgPSB0aGlzLnJlbmRlckVsZW1lbnQoYWUsIHRydWUpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaW5zZXJ0SW5kZXggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGxpc3RFbGVtZW50LnByZXBlbmQoJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudEF0SW5kZXggPSB0aGlzLiRsaXN0RWxlbWVudC5maW5kKCcuam9fZmlsZScpLmdldChpbnNlcnRJbmRleCAtIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGpRdWVyeShlbGVtZW50QXRJbmRleCkuYWZ0ZXIoJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICRlbGVtZW50WzBdLnNjcm9sbEludG9WaWV3KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhhdC5yZW5hbWVFbGVtZW50KGFlLCAoKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQubmV3RWxlbWVudENhbGxiYWNrKGFlLCAoZXh0ZXJuYWxFbGVtZW50OiBhbnkpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFlLmV4dGVybmFsRWxlbWVudCA9IGV4dGVybmFsRWxlbWVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhZS4kaHRtbFNlY29uZExpbmUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWUuJGh0bWxTZWNvbmRMaW5lLmluc2VydEFmdGVyKCRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQuc2VsZWN0Q2FsbGJhY2sgIT0gbnVsbCkgdGhhdC5zZWxlY3QoYWUuZXh0ZXJuYWxFbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgJGxpc3RPdXRlciA9IGpRdWVyeSgnPGRpdiBpZD1cImZpbGVsaXN0b3V0ZXJcIiBjbGFzcz1cImpvX3Byb2plY3RleHBsb3JlcmRpdiBqb19zY3JvbGxhYmxlXCIgZGF0YS1ncm93PVwiJ1xyXG4gICAgICAgICAgICArIHRoaXMuZmxleFdlaWdodCArICdcIiBzdHlsZT1cImZsZXgtZ3JvdzogJyArIHRoaXMuZmxleFdlaWdodCArICdcIj48L2Rpdj4nKTtcclxuICAgICAgICB0aGlzLiRsaXN0RWxlbWVudCA9IGpRdWVyeSgnPGRpdiBjbGFzcz1cImpvX2ZpbGVsaXN0XCI+PC9kaXY+JylcclxuXHJcbiAgICAgICAgJGxpc3RPdXRlci5hcHBlbmQodGhpcy4kbGlzdEVsZW1lbnQpO1xyXG5cclxuICAgICAgICAkYWNjb3JkaW9uRGl2LmFwcGVuZCh0aGlzLiRjYXB0aW9uRWxlbWVudCk7XHJcbiAgICAgICAgJGFjY29yZGlvbkRpdi5hcHBlbmQoJGxpc3RPdXRlcik7XHJcblxyXG4gICAgICAgIGxldCAkY2UgPSB0aGlzLiRjYXB0aW9uRWxlbWVudDtcclxuICAgICAgICBsZXQgJGxpID0gdGhpcy4kbGlzdEVsZW1lbnQucGFyZW50KCk7XHJcbiAgICAgICAgbGV0IG1vdXNlUG9pbnRlciA9IHdpbmRvdy5Qb2ludGVyRXZlbnQgPyBcInBvaW50ZXJcIiA6IFwibW91c2VcIjtcclxuXHJcbiAgICAgICAgJGNlLm9uKG1vdXNlUG9pbnRlciArICdkb3duJywgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChldi5idXR0b24gIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuZml4ZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCB0YXJnZXRHcm93ID0gJGxpLmRhdGEoJ2dyb3cnKTtcclxuICAgICAgICAgICAgICAgIGlmICgkY2UuaGFzQ2xhc3MoJ2pvX2V4cGFuZGVkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5hY2NvcmRpb24ucGFydHMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkbGkuYW5pbWF0ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmxleC1ncm93JzogMC4wMDFcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCwgKCkgPT4geyAkY2UudG9nZ2xlQ2xhc3MoJ2pvX2V4cGFuZGVkJyk7IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGNlLnRvZ2dsZUNsYXNzKCdqb19leHBhbmRlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICRsaS5hbmltYXRlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJ2ZsZXgtZ3Jvdyc6IHRhcmdldEdyb3dcclxuICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkY2Uub24oJ2RyYWdvdmVyJywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChBY2NvcmRpb25QYW5lbC5jdXJyZW50bHlEcmFnZ2VkRWxlbWVudEtpbmQgPT0gdGhhdC5raW5kKSB7XHJcbiAgICAgICAgICAgICAgICAkY2UuYWRkQ2xhc3MoJ2pvX2ZpbGVfZHJhZ292ZXInKTtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICAkY2Uub24oJ2RyYWdsZWF2ZScsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAkY2UucmVtb3ZlQ2xhc3MoJ2pvX2ZpbGVfZHJhZ292ZXInKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICAkY2Uub24oJ2Ryb3AnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYgKEFjY29yZGlvblBhbmVsLmN1cnJlbnRseURyYWdnZWRFbGVtZW50S2luZCA9PSB0aGF0LmtpbmQpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAkY2UucmVtb3ZlQ2xhc3MoJ2pvX2ZpbGVfZHJhZ292ZXInKTtcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50MSA9IEFjY29yZGlvblBhbmVsLmN1cnJlbnRseURyYWdnZWRFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQxICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vdmVFbGVtZW50KGVsZW1lbnQxLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdyb3coKSB7XHJcbiAgICAgICAgbGV0ICRsaSA9IHRoaXMuJGxpc3RFbGVtZW50LnBhcmVudCgpO1xyXG4gICAgICAgIGxldCB0YXJnZXRHcm93ID0gJGxpLmRhdGEoJ2dyb3cnKTtcclxuICAgICAgICAkbGkuY3NzKCdmbGV4LWdyb3cnLCB0YXJnZXRHcm93KTtcclxuICAgICAgICB0aGlzLiRjYXB0aW9uRWxlbWVudC5hZGRDbGFzcygnam9fZXhwYW5kZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRFbGVtZW50KGVsZW1lbnQ6IEFjY29yZGlvbkVsZW1lbnQsIGV4cGFuZGVkOiBib29sZWFuKSB7XHJcbiAgICAgICAgLy8gdGhpcy5lbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xyXG4gICAgICAgIC8vIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUgPSB0aGlzLnJlbmRlckVsZW1lbnQoZWxlbWVudCwgZXhwYW5kZWQpO1xyXG4gICAgICAgIC8vIHRoaXMuJGxpc3RFbGVtZW50LnByZXBlbmQoZWxlbWVudC4kaHRtbEZpcnN0TGluZSk7XHJcbiAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZSA9IHRoaXMucmVuZGVyRWxlbWVudChlbGVtZW50LCBleHBhbmRlZCk7XHJcbiAgICAgICAgdGhpcy5pbnNlcnRFbGVtZW50KGVsZW1lbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIHNvcnRFbGVtZW50cygpIHtcclxuICAgICAgICBpZiAodGhpcy5kb250U29ydEVsZW1lbnRzKSByZXR1cm47XHJcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBhTmFtZSA9IGEuc29ydE5hbWUgPyBhLnNvcnROYW1lIDogYS5uYW1lO1xyXG4gICAgICAgICAgICBsZXQgYk5hbWUgPSBiLnNvcnROYW1lID8gYi5zb3J0TmFtZSA6IGIubmFtZTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBhcmVXaXRoUGF0aChhTmFtZSwgYS5wYXRoLCBhLmlzRm9sZGVyLCBiTmFtZSwgYi5wYXRoLCBiLmlzRm9sZGVyKTtcclxuXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50cy5mb3JFYWNoKChlbGVtZW50KSA9PiB7IHRoaXMuJGxpc3RFbGVtZW50LmFwcGVuZChlbGVtZW50LiRodG1sRmlyc3RMaW5lKSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRUZXh0QWZ0ZXJGaWxlbmFtZShlbGVtZW50OiBBY2NvcmRpb25FbGVtZW50LCB0ZXh0OiBzdHJpbmcsIGNzc0NsYXNzOiBzdHJpbmcpIHtcclxuICAgICAgICBsZXQgJGRpdiA9IGVsZW1lbnQuJGh0bWxGaXJzdExpbmUuZmluZCgnLmpvX3RleHRBZnRlck5hbWUnKTtcclxuICAgICAgICAkZGl2LmFkZENsYXNzKGNzc0NsYXNzKTtcclxuICAgICAgICAkZGl2Lmh0bWwodGV4dCk7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkQWN0aW9uKCRlbGVtZW50OiBKUXVlcnk8SFRNTEVsZW1lbnQ+KSB7XHJcbiAgICAgICAgdGhpcy4kY2FwdGlvbkVsZW1lbnQuZmluZCgnLmpvX2FjdGlvbnMnKS5wcmVwZW5kKCRlbGVtZW50KTtcclxuICAgIH1cclxuXHJcbiAgICByZW5kZXJFbGVtZW50KGVsZW1lbnQ6IEFjY29yZGlvbkVsZW1lbnQsIGV4cGFuZGVkOiBib29sZWFuKTogSlF1ZXJ5PEhUTUxFbGVtZW50PiB7XHJcblxyXG4gICAgICAgIGxldCBtb3VzZVBvaW50ZXIgPSB3aW5kb3cuUG9pbnRlckV2ZW50ID8gXCJwb2ludGVyXCIgOiBcIm1vdXNlXCI7XHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICBsZXQgZXhwYW5kZWRDb2xsYXBzZWQgPSBcIlwiO1xyXG5cclxuICAgICAgICBpZiAoZWxlbWVudC5pY29uQ2xhc3MgPT0gbnVsbCkgZWxlbWVudC5pY29uQ2xhc3MgPSB0aGlzLmRlZmF1bHRJY29uQ2xhc3M7XHJcbiAgICAgICAgaWYgKGVsZW1lbnQuaXNGb2xkZXIpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5pY29uQ2xhc3MgPSBcImZvbGRlclwiO1xyXG4gICAgICAgICAgICBleHBhbmRlZENvbGxhcHNlZCA9IGV4cGFuZGVkID8gXCIgam9fZXhwYW5kZWRcIiA6IFwiIGpvX2NvbGxhcHNlZFwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHBhdGhIdG1sID0gXCJcIjtcclxuICAgICAgICBpZiAoZWxlbWVudC5wYXRoID09IG51bGwpIGVsZW1lbnQucGF0aCA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWxlbWVudC5wYXRoLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHBhdGhIdG1sICs9ICc8ZGl2IGNsYXNzPVwiam9fZm9sZGVybGluZVwiPjwvZGl2Pic7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlbGVtZW50LiRodG1sRmlyc3RMaW5lID0galF1ZXJ5KGA8ZGl2IGNsYXNzPVwiam9fZmlsZSBqb18ke2VsZW1lbnQuaWNvbkNsYXNzfSAke2V4cGFuZGVkQ29sbGFwc2VkfVwiPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJqb19mb2xkZXJsaW5lc1wiPiR7cGF0aEh0bWx9PC9kaXY+XHJcbiAgICAgICAgICAgPGRpdiBjbGFzcz1cImpvX2ZpbGVpbWFnZVwiPjwvZGl2PlxyXG4gICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb19maWxlbmFtZVwiPiR7ZXNjYXBlSHRtbChlbGVtZW50Lm5hbWUpfTwvZGl2PlxyXG4gICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb190ZXh0QWZ0ZXJOYW1lXCI+PC9kaXY+XHJcbiAgICAgICAgICAgPGRpdiBjbGFzcz1cImpvX2FkZGl0aW9uYWxCdXR0b25Ib21ld29ya1wiPjwvZGl2PlxyXG4gICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb19hZGRpdGlvbmFsQnV0dG9uU3RhcnRcIj48L2Rpdj5cclxuICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9fYWRkaXRpb25hbEJ1dHRvblJlcG9zaXRvcnlcIj48L2Rpdj5cclxuICAgICAgICAgICAke3RoaXMud2l0aERlbGV0ZUJ1dHRvbiA/ICc8ZGl2IGNsYXNzPVwiam9fZGVsZXRlIGltZ19kZWxldGUgam9fYnV0dG9uIGpvX2FjdGl2ZScgKyAoZmFsc2UgPyBcIiBqb19kZWxldGVfYWx3YXlzXCIgOiBcIlwiKSArICdcIj48L2Rpdj4nIDogXCJcIn1cclxuICAgICAgICAgICAkeyFqb19tb3VzZURldGVjdGVkID8gJzxkaXYgY2xhc3M9XCJqb19zZXR0aW5nc19idXR0b24gaW1nX2VsbGlwc2lzLWRhcmsgam9fYnV0dG9uIGpvX2FjdGl2ZVwiPjwvZGl2PicgOiBcIlwifVxyXG4gICAgICAgICAgIDwvZGl2PmApO1xyXG5cclxuICAgICAgICBpZiAoIWV4cGFuZGVkICYmIGVsZW1lbnQucGF0aC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUuaGlkZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYWRkRWxlbWVudEFjdGlvbkNhbGxiYWNrICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbGV0ICRlbGVtZW50QWN0aW9uID0gdGhpcy5hZGRFbGVtZW50QWN0aW9uQ2FsbGJhY2soZWxlbWVudCk7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUuYXBwZW5kKCRlbGVtZW50QWN0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLndpdGhGb2xkZXJzKSB7XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmlzRm9sZGVyKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LiRodG1sRmlyc3RMaW5lLm9uKCdkcmFnb3ZlcicsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChBY2NvcmRpb25QYW5lbC5jdXJyZW50bHlEcmFnZ2VkRWxlbWVudEtpbmQgPT0gdGhhdC5raW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUuYWRkQ2xhc3MoJ2pvX2ZpbGVfZHJhZ292ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUub24oJ2RyYWdsZWF2ZScsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUucmVtb3ZlQ2xhc3MoJ2pvX2ZpbGVfZHJhZ292ZXInKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZS5vbignZHJvcCcsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChBY2NvcmRpb25QYW5lbC5jdXJyZW50bHlEcmFnZ2VkRWxlbWVudEtpbmQgPT0gdGhhdC5raW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUucmVtb3ZlQ2xhc3MoJ2pvX2ZpbGVfZHJhZ292ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQxID0gQWNjb3JkaW9uUGFuZWwuY3VycmVudGx5RHJhZ2dlZEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFjY29yZGlvblBhbmVsLmN1cnJlbnRseURyYWdnZWRFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQxICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW92ZUVsZW1lbnQoZWxlbWVudDEsIGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLndpdGhGb2xkZXJzIHx8IHRoaXMuZW5hYmxlRHJhZykge1xyXG4gICAgICAgICAgICBsZXQgJGZpbGVkcmFncGFydCA9IGVsZW1lbnQuJGh0bWxGaXJzdExpbmUuZmluZCgnLmpvX2ZpbGVuYW1lJyk7XHJcbiAgICAgICAgICAgICRmaWxlZHJhZ3BhcnQuYXR0cignZHJhZ2dhYmxlJywgJ3RydWUnKTtcclxuICAgICAgICAgICAgJGZpbGVkcmFncGFydC5vbignZHJhZ3N0YXJ0JywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBBY2NvcmRpb25QYW5lbC5jdXJyZW50bHlEcmFnZ2VkRWxlbWVudCA9IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICBBY2NvcmRpb25QYW5lbC5jdXJyZW50bHlEcmFnZ2VkRWxlbWVudEtpbmQgPSB0aGF0LmtpbmQ7XHJcbiAgICAgICAgICAgICAgICBldmVudC5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gZWxlbWVudC5pc0ZvbGRlciA/IFwibW92ZVwiIDogXCJjb3B5TW92ZVwiO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYWNjZXB0RHJvcEtpbmRzICE9IG51bGwgJiYgdGhpcy5hY2NlcHREcm9wS2luZHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBpZiAoIWVsZW1lbnQuaXNGb2xkZXIpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUub24oJ2RyYWdvdmVyJywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuYWNjZXB0RHJvcEtpbmRzLmluZGV4T2YoQWNjb3JkaW9uUGFuZWwuY3VycmVudGx5RHJhZ2dlZEVsZW1lbnRLaW5kKSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUuYWRkQ2xhc3MoJ2pvX2ZpbGVfZHJhZ292ZXInKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5jdHJsS2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gXCJjb3B5XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gXCJtb3ZlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LiRodG1sRmlyc3RMaW5lLm9uKCdkcmFnbGVhdmUnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LiRodG1sRmlyc3RMaW5lLnJlbW92ZUNsYXNzKCdqb19maWxlX2RyYWdvdmVyJyk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUub24oJ2Ryb3AnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5hY2NlcHREcm9wS2luZHMuaW5kZXhPZihBY2NvcmRpb25QYW5lbC5jdXJyZW50bHlEcmFnZ2VkRWxlbWVudEtpbmQpID49IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZS5yZW1vdmVDbGFzcygnam9fZmlsZV9kcmFnb3ZlcicpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQxID0gQWNjb3JkaW9uUGFuZWwuY3VycmVudGx5RHJhZ2dlZEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFjY29yZGlvblBhbmVsLmN1cnJlbnRseURyYWdnZWRFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQxICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LmRyb3BFbGVtZW50Q2FsbGJhY2sgIT0gbnVsbCkgdGhhdC5kcm9wRWxlbWVudENhbGxiYWNrKGVsZW1lbnQsIGVsZW1lbnQxLCBldmVudC5jdHJsS2V5ID8gXCJjb3B5XCIgOiBcIm1vdmVcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUub24obW91c2VQb2ludGVyICsgJ3VwJywgKGV2KSA9PiB7XHJcblxyXG4gICAgICAgICAgICBpZiAoZXYuYnV0dG9uID09IDAgJiYgdGhhdC5zZWxlY3RDYWxsYmFjayAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGF0LnNlbGVjdENhbGxiYWNrKGVsZW1lbnQuZXh0ZXJuYWxFbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhZSBvZiB0aGF0LmVsZW1lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFlICE9IGVsZW1lbnQgJiYgYWUuJGh0bWxGaXJzdExpbmUuaGFzQ2xhc3MoJ2pvX2FjdGl2ZScpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFlLiRodG1sRmlyc3RMaW5lLnJlbW92ZUNsYXNzKCdqb19hY3RpdmUnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZS5hZGRDbGFzcygnam9fYWN0aXZlJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuaXNGb2xkZXIpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuJGh0bWxGaXJzdExpbmUuaGFzQ2xhc3MoJ2pvX2V4cGFuZGVkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZS5yZW1vdmVDbGFzcygnam9fZXhwYW5kZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZS5hZGRDbGFzcygnam9fY29sbGFwc2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZS5hZGRDbGFzcygnam9fZXhwYW5kZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZS5yZW1vdmVDbGFzcygnam9fY29sbGFwc2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aElzQ29sbGFwc2VkOiB7IFtwYXRoOiBzdHJpbmddOiBib29sZWFuIH0gPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBlIG9mIHRoaXMuZWxlbWVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUuaXNGb2xkZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYXRoID0gZS5wYXRoLmpvaW4oXCIvXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhdGggIT0gXCJcIikgcGF0aCArPSBcIi9cIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggKz0gZS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aElzQ29sbGFwc2VkW3BhdGhdID0gZS4kaHRtbEZpcnN0TGluZS5oYXNDbGFzcygnam9fY29sbGFwc2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGF0aElzQ29sbGFwc2VkW2UucGF0aC5qb2luKFwiL1wiKV0pIHBhdGhJc0NvbGxhcHNlZFtwYXRoXSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aElzQ29sbGFwc2VkW1wiXCJdID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGUgb2YgdGhpcy5lbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGF0aElzQ29sbGFwc2VkW2UucGF0aC5qb2luKFwiL1wiKV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUuJGh0bWxGaXJzdExpbmUuc2xpZGVVcCgyMDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS4kaHRtbEZpcnN0TGluZS5zbGlkZURvd24oMjAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBsZXQgY29udGV4dG1lbnVIYW5kbGVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgY29udGV4dE1lbnVJdGVtczogQ29udGV4dE1lbnVJdGVtW10gPSBbXTtcclxuICAgICAgICAgICAgaWYgKHRoYXQucmVuYW1lQ2FsbGJhY2sgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29udGV4dE1lbnVJdGVtcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBjYXB0aW9uOiBcIlVtYmVuZW5uZW5cIixcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnJlbmFtZUVsZW1lbnQoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IG1vdXNlUG9pbnRlciA9IHdpbmRvdy5Qb2ludGVyRXZlbnQgPyBcInBvaW50ZXJcIiA6IFwibW91c2VcIjtcclxuXHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmlzRm9sZGVyKSB7XHJcbiAgICAgICAgICAgICAgICBjb250ZXh0TWVudUl0ZW1zID0gY29udGV4dE1lbnVJdGVtcy5jb25jYXQoW1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwdGlvbjogXCJOZXVlbiBVbnRlcm9yZG5lciBhbmxlZ2VuICh1bnRlcmhhbGIgJ1wiICsgZWxlbWVudC5uYW1lICsgXCInKS4uLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zZWxlY3QoZWxlbWVudC5leHRlcm5hbEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhhdC4kbmV3Rm9sZGVyQWN0aW9uLnRyaWdnZXIobW91c2VQb2ludGVyICsgJ2Rvd24nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYXRoQXJyYXkgPSB0aGF0LmdldEN1cnJlbnRseVNlbGVjdGVkUGF0aCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuYWRkRm9sZGVyKFwiTmV1ZXIgT3JkbmVyXCIsIHBhdGhBcnJheSwgKG5ld0VsZW1lbnQ6IEFjY29yZGlvbkVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm5ld0ZvbGRlckNhbGxiYWNrKG5ld0VsZW1lbnQsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zb3J0RWxlbWVudHMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RWxlbWVudC4kaHRtbEZpcnN0TGluZVswXS5zY3JvbGxJbnRvVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlVG9UcmFuc3BhcmVudChuZXdFbGVtZW50LiRodG1sRmlyc3RMaW5lLmZpbmQoJy5qb19maWxlbmFtZScpLCAnYmFja2dyb3VuZC1jb2xvcicsIFswLCAyNTUsIDBdLCAyMDAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwdGlvbjogXCJOZXVlciBXb3Jrc3BhY2UuLi5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuc2VsZWN0KGVsZW1lbnQuZXh0ZXJuYWxFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuJGJ1dHRvbk5ldy50cmlnZ2VyKG1vdXNlUG9pbnRlciArICdkb3duJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcHRpb246IFwiV29ya3NwYWNlIGltcG9ydGllcmVuLi4uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgV29ya3NwYWNlSW1wb3J0ZXIoPE1haW4+dGhhdC5hY2NvcmRpb24ubWFpbiwgZWxlbWVudC5wYXRoLmNvbmNhdChbZWxlbWVudC5uYW1lXSkpLnNob3coKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICBpZiAodGhhdC5jb250ZXh0TWVudVByb3ZpZGVyICE9IG51bGwgJiYgIWVsZW1lbnQuaXNGb2xkZXIpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjbWkgb2YgdGhhdC5jb250ZXh0TWVudVByb3ZpZGVyKGVsZW1lbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dE1lbnVJdGVtcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwdGlvbjogY21pLmNhcHRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbWkuY2FsbGJhY2soZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiBjbWkuY29sb3IsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Yk1lbnU6IGNtaS5zdWJNZW51ID09IG51bGwgPyBudWxsIDogY21pLnN1Yk1lbnUubWFwKChtaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXB0aW9uOiBtaS5jYXB0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pLmNhbGxiYWNrKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6IG1pLmNvbG9yXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGNvbnRleHRNZW51SXRlbXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgb3BlbkNvbnRleHRNZW51KGNvbnRleHRNZW51SXRlbXMsIGV2ZW50LnBhZ2VYLCBldmVudC5wYWdlWSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBlbGVtZW50LiRodG1sRmlyc3RMaW5lWzBdLmFkZEV2ZW50TGlzdGVuZXIoXCJjb250ZXh0bWVudVwiLCBjb250ZXh0bWVudUhhbmRsZXIsIGZhbHNlKTtcclxuXHJcbiAgICAgICAgLy8gbG9uZyBwcmVzcyBmb3IgdG91Y2ggZGV2aWNlc1xyXG4gICAgICAgIGxldCBwcmVzc1RpbWVyOiBudW1iZXI7XHJcbiAgICAgICAgaWYgKCFqb19tb3VzZURldGVjdGVkKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmUub24oJ3BvaW50ZXJ1cCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChwcmVzc1RpbWVyKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfSkub24oJ3BvaW50ZXJkb3duJywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBwcmVzc1RpbWVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHRtZW51SGFuZGxlcihldmVudCk7XHJcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICgham9fbW91c2VEZXRlY3RlZCkge1xyXG4gICAgICAgICAgICBlbGVtZW50LiRodG1sRmlyc3RMaW5lLmZpbmQoJy5qb19zZXR0aW5nc19idXR0b24nKS5vbigncG9pbnRlcmRvd24nLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29udGV4dG1lbnVIYW5kbGVyKGUpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZS5maW5kKCcuam9fc2V0dGluZ3NfYnV0dG9uJykub24oJ21vdXNlZG93biBjbGljaycsIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGF0LndpdGhEZWxldGVCdXR0b24pIHtcclxuICAgICAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZS5maW5kKCcuam9fZGVsZXRlJykub24obW91c2VQb2ludGVyICsgJ2Rvd24nLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBvcGVuQ29udGV4dE1lbnUoW3tcclxuICAgICAgICAgICAgICAgICAgICBjYXB0aW9uOiBcIkFiYnJlY2hlblwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vdGhpbmcgdG8gZG8uXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhcHRpb246IFwiSWNoIGJpbiBtaXIgc2ljaGVyOiBsw7ZzY2hlbiFcIixcclxuICAgICAgICAgICAgICAgICAgICBjb2xvcjogXCIjZmY2MDYwXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmlzRm9sZGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5nZXRDaGlsZEVsZW1lbnRzKGVsZW1lbnQpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnRGllc2VyIE9yZG5lciBrYW5uIG5pY2h0IGdlbMO2c2NodCB3ZXJkZW4sIGRhIGVyIG5pY2h0IGxlZXIgaXN0LicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5kZWxldGVDYWxsYmFjayhlbGVtZW50LmV4dGVybmFsRWxlbWVudCwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC4kaHRtbEZpcnN0TGluZS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LiRodG1sU2Vjb25kTGluZSAhPSBudWxsKSBlbGVtZW50LiRodG1sU2Vjb25kTGluZS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZWxlbWVudHMuc3BsaWNlKHRoYXQuZWxlbWVudHMuaW5kZXhPZihlbGVtZW50KSwgMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQuc2VsZWN0Q2FsbGJhY2sgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LmVsZW1lbnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zZWxlY3QodGhhdC5lbGVtZW50c1swXS5leHRlcm5hbEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuc2VsZWN0KG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfV0sIGV2LnBhZ2VYICsgMiwgZXYucGFnZVkgKyAyKTtcclxuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBlbGVtZW50LiRodG1sRmlyc3RMaW5lO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3ZlRWxlbWVudChlbGVtZW50VG9Nb3ZlOiBBY2NvcmRpb25FbGVtZW50LCBkZXN0aW5hdGlvbkZvbGRlcjogQWNjb3JkaW9uRWxlbWVudCkge1xyXG4gICAgICAgIGxldCBkZXN0aW5hdGlvblBhdGg6IHN0cmluZ1tdID0gZGVzdGluYXRpb25Gb2xkZXIgPT0gbnVsbCA/IFtdIDogZGVzdGluYXRpb25Gb2xkZXIucGF0aC5zbGljZSgwKS5jb25jYXQoW2Rlc3RpbmF0aW9uRm9sZGVyLm5hbWVdKTtcclxuICAgICAgICBpZiAoZWxlbWVudFRvTW92ZS5pc0ZvbGRlcikge1xyXG4gICAgICAgICAgICBsZXQgbW92ZWRFbGVtZW50czogQWNjb3JkaW9uRWxlbWVudFtdID0gW2VsZW1lbnRUb01vdmVdO1xyXG5cclxuICAgICAgICAgICAgbGV0IHNvdXJjZVBhdGggPSBlbGVtZW50VG9Nb3ZlLnBhdGguY29uY2F0KFtlbGVtZW50VG9Nb3ZlLm5hbWVdKS5qb2luKFwiL1wiKTtcclxuXHJcbiAgICAgICAgICAgIGlmKGRlc3RpbmF0aW9uUGF0aC5qb2luKCcvJykuaW5kZXhPZihzb3VyY2VQYXRoKSA9PSAwKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBsZXQgb2xkUGF0aExlbmd0aCA9IGVsZW1lbnRUb01vdmUucGF0aC5sZW5ndGg7XHJcbiAgICAgICAgICAgIGVsZW1lbnRUb01vdmUucGF0aCA9IGRlc3RpbmF0aW9uUGF0aC5zbGljZSgwKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGVsZW1lbnQgb2YgdGhpcy5lbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQucGF0aC5qb2luKFwiL1wiKS5zdGFydHNXaXRoKHNvdXJjZVBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXRoLnNwbGljZSgwLCBvbGRQYXRoTGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnBhdGggPSBkZXN0aW5hdGlvblBhdGguY29uY2F0KGVsZW1lbnQucGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbW92ZWRFbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBlbCBvZiBtb3ZlZEVsZW1lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICBlbC4kaHRtbEZpcnN0TGluZS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudHMuc3BsaWNlKHRoaXMuZWxlbWVudHMuaW5kZXhPZihlbCksIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvciAobGV0IGVsIG9mIG1vdmVkRWxlbWVudHMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyRWxlbWVudChlbCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluc2VydEVsZW1lbnQoZWwpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1vdmVDYWxsYmFjayhtb3ZlZEVsZW1lbnRzKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlbGVtZW50VG9Nb3ZlLnBhdGggPSBkZXN0aW5hdGlvblBhdGg7XHJcbiAgICAgICAgICAgIGVsZW1lbnRUb01vdmUuJGh0bWxGaXJzdExpbmUucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMuc3BsaWNlKHRoaXMuZWxlbWVudHMuaW5kZXhPZihlbGVtZW50VG9Nb3ZlKSwgMSk7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyRWxlbWVudChlbGVtZW50VG9Nb3ZlLCB0cnVlKTtcclxuICAgICAgICAgICAgdGhpcy5pbnNlcnRFbGVtZW50KGVsZW1lbnRUb01vdmUpO1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdChlbGVtZW50VG9Nb3ZlLmV4dGVybmFsRWxlbWVudCk7XHJcbiAgICAgICAgICAgIGVsZW1lbnRUb01vdmUuJGh0bWxGaXJzdExpbmVbMF0uc2Nyb2xsSW50b1ZpZXcoKTtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlQ2FsbGJhY2soZWxlbWVudFRvTW92ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldENoaWxkRWxlbWVudHMoZm9sZGVyOiBBY2NvcmRpb25FbGVtZW50KTogQWNjb3JkaW9uRWxlbWVudFtdIHtcclxuICAgICAgICBsZXQgcGF0aCA9IGZvbGRlci5wYXRoLnNsaWNlKDApLmNvbmNhdChmb2xkZXIubmFtZSkuam9pbihcIi9cIik7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZWxlbWVudHMuZmlsdGVyKChlbGVtZW50KSA9PiBlbGVtZW50LnBhdGguam9pbihcIi9cIikuc3RhcnRzV2l0aChwYXRoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVuYW1lRWxlbWVudChlbGVtZW50OiBBY2NvcmRpb25FbGVtZW50LCBjYWxsYmFjaz86ICgpID0+IHZvaWQpIHtcclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgbGV0ICRkaXYgPSBlbGVtZW50LiRodG1sRmlyc3RMaW5lLmZpbmQoJy5qb19maWxlbmFtZScpO1xyXG4gICAgICAgIGxldCBwb2ludFBvcyA9IGVsZW1lbnQubmFtZS5pbmRleE9mKCcuJyk7XHJcbiAgICAgICAgbGV0IHNlbGVjdGlvbiA9IHBvaW50UG9zID09IG51bGwgPyBudWxsIDogeyBzdGFydDogMCwgZW5kOiBwb2ludFBvcyB9O1xyXG4gICAgICAgIHRoaXMuZG9udFNvcnRFbGVtZW50cyA9IHRydWU7XHJcbiAgICAgICAgbWFrZUVkaXRhYmxlKCRkaXYsICRkaXYsIChuZXdUZXh0OiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgaWYgKGVsZW1lbnQuZXh0ZXJuYWxFbGVtZW50ICE9IG51bGwpIG5ld1RleHQgPSB0aGF0LnJlbmFtZUNhbGxiYWNrKGVsZW1lbnQuZXh0ZXJuYWxFbGVtZW50LCBuZXdUZXh0KTtcclxuICAgICAgICAgICAgZWxlbWVudC5uYW1lID0gbmV3VGV4dDtcclxuICAgICAgICAgICAgJGRpdi5odG1sKGVsZW1lbnQubmFtZSk7XHJcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSBjYWxsYmFjaygpO1xyXG4gICAgICAgICAgICB0aGF0LnNvcnRFbGVtZW50cygpO1xyXG4gICAgICAgICAgICAkZGl2WzBdLnNjcm9sbEludG9WaWV3KCk7XHJcbiAgICAgICAgICAgIHRoaXMuZG9udFNvcnRFbGVtZW50cyA9IGZhbHNlO1xyXG4gICAgICAgIH0sIHNlbGVjdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZWN0KGV4dGVybmFsRWxlbWVudDogYW55LCBpbnZva2VDYWxsYmFjazogYm9vbGVhbiA9IHRydWUsIHNjcm9sbEludG9WaWV3OiBib29sZWFuID0gZmFsc2UpIHtcclxuXHJcbiAgICAgICAgaWYgKGV4dGVybmFsRWxlbWVudCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGFlMSBvZiB0aGlzLmVsZW1lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYWUxLiRodG1sRmlyc3RMaW5lLmhhc0NsYXNzKCdqb19hY3RpdmUnKSkgYWUxLiRodG1sRmlyc3RMaW5lLnJlbW92ZUNsYXNzKCdqb19hY3RpdmUnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCBhZSA9IHRoaXMuZmluZEVsZW1lbnQoZXh0ZXJuYWxFbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChhZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhZTEgb2YgdGhpcy5lbGVtZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhZTEuJGh0bWxGaXJzdExpbmUuaGFzQ2xhc3MoJ2pvX2FjdGl2ZScpKSBhZTEuJGh0bWxGaXJzdExpbmUucmVtb3ZlQ2xhc3MoJ2pvX2FjdGl2ZScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGFlLiRodG1sRmlyc3RMaW5lLmFkZENsYXNzKCdqb19hY3RpdmUnKTtcclxuICAgICAgICAgICAgICAgIGlmIChzY3JvbGxJbnRvVmlldykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXRoU3RyaW5nID0gYWUucGF0aC5qb2luKFwiL1wiKTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBlbCBvZiB0aGlzLmVsZW1lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbFBhdGggPSBlbC5wYXRoLnNsaWNlKDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGF0aFN0cmluZy5zdGFydHNXaXRoKGVsUGF0aC5qb2luKFwiL1wiKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbC5pc0ZvbGRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsUGF0aC5wdXNoKGVsLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXRoU3RyaW5nLnN0YXJ0c1dpdGgoZWxQYXRoLmpvaW4oXCIvXCIpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC4kaHRtbEZpcnN0TGluZS5yZW1vdmVDbGFzcyhcImpvX2NvbGxhcHNlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuJGh0bWxGaXJzdExpbmUuYWRkQ2xhc3MoXCJqb19leHBhbmRlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC4kaHRtbEZpcnN0TGluZS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBhZS4kaHRtbEZpcnN0TGluZVswXS5zY3JvbGxJbnRvVmlldygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGludm9rZUNhbGxiYWNrICYmIHRoaXMuc2VsZWN0Q2FsbGJhY2sgIT0gbnVsbCkgdGhpcy5zZWxlY3RDYWxsYmFjayhleHRlcm5hbEVsZW1lbnQpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRQYXRoU3RyaW5nKGFlOiBBY2NvcmRpb25FbGVtZW50KSB7XHJcbiAgICAgICAgbGV0IHBzOiBzdHJpbmcgPSBhZS5wYXRoLmpvaW4oXCIvXCIpO1xyXG4gICAgICAgIGlmIChhZS5pc0ZvbGRlcikge1xyXG4gICAgICAgICAgICBpZiAocHMgIT0gXCJcIikgcHMgKz0gXCIvXCI7XHJcbiAgICAgICAgICAgIHBzICs9IGFlLm5hbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwcztcclxuICAgIH1cclxuXHJcbiAgICBzZXRFbGVtZW50Q2xhc3MoZWxlbWVudDogQWNjb3JkaW9uRWxlbWVudCwgaWNvbkNsYXNzOiBzdHJpbmcpIHtcclxuICAgICAgICBpZiAoZWxlbWVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuJGh0bWxGaXJzdExpbmU/LnJlbW92ZUNsYXNzKFwiam9fXCIgKyBlbGVtZW50Lmljb25DbGFzcykuYWRkQ2xhc3MoXCJqb19cIiArIGljb25DbGFzcyk7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuaWNvbkNsYXNzID0gaWNvbkNsYXNzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZmluZEVsZW1lbnQoZXh0ZXJuYWxFbGVtZW50OiBhbnkpOiBBY2NvcmRpb25FbGVtZW50IHtcclxuICAgICAgICBmb3IgKGxldCBhZSBvZiB0aGlzLmVsZW1lbnRzKSB7XHJcbiAgICAgICAgICAgIGlmIChhZS5leHRlcm5hbEVsZW1lbnQgPT0gZXh0ZXJuYWxFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByZW1vdmVFbGVtZW50KGV4dGVybmFsRWxlbWVudDogYW55KSB7XHJcbiAgICAgICAgZm9yIChsZXQgYWUgb2YgdGhpcy5lbGVtZW50cykge1xyXG4gICAgICAgICAgICBpZiAoYWUuZXh0ZXJuYWxFbGVtZW50ID09IGV4dGVybmFsRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgYWUuJGh0bWxGaXJzdExpbmUucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYWUuJGh0bWxTZWNvbmRMaW5lICE9IG51bGwpIGFlLiRodG1sU2Vjb25kTGluZS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudHMuc3BsaWNlKHRoaXMuZWxlbWVudHMuaW5kZXhPZihhZSksIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdENhbGxiYWNrICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5lbGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0KHRoaXMuZWxlbWVudHNbMF0uZXh0ZXJuYWxFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdChudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xlYXIoKSB7XHJcbiAgICAgICAgdGhpcy4kbGlzdEVsZW1lbnQuZW1wdHkoKTtcclxuICAgICAgICB0aGlzLmVsZW1lbnRzID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgc2V0Q2FwdGlvbih0ZXh0OiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLiRjYXB0aW9uRWxlbWVudC5maW5kKCcuam9fY2FwdGlvbnRleHQnKS5odG1sKHRleHQpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFNlbGVjdGVkRWxlbWVudCgpOiBBY2NvcmRpb25FbGVtZW50IHtcclxuICAgICAgICBmb3IgKGxldCBhZSBvZiB0aGlzLmVsZW1lbnRzKSB7XHJcbiAgICAgICAgICAgIGlmIChhZS4kaHRtbEZpcnN0TGluZS5oYXNDbGFzcygnam9fYWN0aXZlJykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbn1cclxuXHJcblxyXG5leHBvcnQgY2xhc3MgQWNjb3JkaW9uIHtcclxuXHJcbiAgICBwYXJ0czogQWNjb3JkaW9uUGFuZWxbXSA9IFtdO1xyXG4gICAgJGh0bWw6IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcblxyXG4gICAgY29uc3RydWN0b3IocHVibGljIG1haW46IE1haW5CYXNlLCAkaHRtbDogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG4gICAgICAgIHRoaXMuJGh0bWwgPSAkaHRtbDtcclxuICAgICAgICAkaHRtbC5hZGRDbGFzcygnam9fbGVmdHBhbmVsaW5uZXInKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRQYW5lbChwYW5lbDogQWNjb3JkaW9uUGFuZWwpIHtcclxuICAgICAgICBwYW5lbC5yZW5kZXJPdXRlckh0bWxFbGVtZW50cyh0aGlzLiRodG1sKTtcclxuICAgICAgICB0aGlzLnBhcnRzLnB1c2gocGFuZWwpO1xyXG4gICAgfVxyXG5cclxuXHJcblxyXG59Il19