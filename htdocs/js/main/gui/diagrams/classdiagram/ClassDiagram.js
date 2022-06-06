import { Interface, Klass } from "../../../../compiler/types/Class.js";
import { Diagram, DiagramUnitCm } from "../Diagram.js";
import { ClassBox } from "./ClassBox.js";
import { DiagramArrow } from "./DiagramArrow.js";
import { openContextMenu } from "../../../../tools/HtmlTools.js";
export class ClassDiagram extends Diagram {
    constructor($htmlElement, main) {
        super($htmlElement, main);
        this.$htmlElement = $htmlElement;
        this.classBoxesRepository = {};
        this.arrows = [];
        this.currentWorkspaceId = null;
        this.version = 0;
        this.straightArrowSectionAfterRectangle = 2;
        this.distanceFromRectangles = 2;
        this.slotDistance = 2;
        this.dirty = false;
        let that = this;
        this.$menuButton.on('click', (ev) => {
            ev.preventDefault();
            let displaysSystemClasses = that.currentClassBoxes.displaySystemClasses == true;
            let parametersWithTypes = that.currentClassBoxes.parametersWithTypes == true;
            openContextMenu([
                {
                    caption: displaysSystemClasses ? "Systemklassen ausblenden" : "Systemklassen einblenden",
                    callback: () => {
                        that.currentClassBoxes.displaySystemClasses = !displaysSystemClasses;
                        that.drawDiagram(that.currentWorkspace, false);
                    }
                },
                {
                    caption: parametersWithTypes ? "Parameter ausblenden" : "Parameter einblenden",
                    callback: () => {
                        that.currentClassBoxes.parametersWithTypes = !parametersWithTypes;
                        that.currentClassBoxes.active.forEach((cb) => { cb.hashedSignature = -1; });
                        that.drawDiagram(that.currentWorkspace, false);
                    }
                },
            ], ev.pageX + 2, ev.pageY + 2);
            ev.stopPropagation();
        });
    }
    clearAfterLogout() {
        this.classBoxesRepository = {};
        this.arrows.forEach((arrow) => { arrow.remove(); });
        $(this.svgElement).empty();
    }
    serialize() {
        if (this.currentClassBoxes == null)
            return;
        let scd = {
            classBoxes: [],
            displaySystemClasses: this.currentClassBoxes.displaySystemClasses,
            parametersWithTypes: this.currentClassBoxes.parametersWithTypes
        };
        for (let workspaceId in this.classBoxesRepository) {
            let classBox = this.classBoxesRepository[workspaceId];
            for (let cb of classBox.active) {
                let cbs = cb.serialize();
                cbs.workspaceId = Number.parseInt(workspaceId);
                scd.classBoxes.push(cbs);
            }
        }
        return scd;
    }
    deserialize(serializedClassDiagram) {
        for (let cb of serializedClassDiagram.classBoxes) {
            let classBoxes = this.classBoxesRepository[cb.workspaceId];
            if (classBoxes == null) {
                classBoxes = {
                    active: [],
                    inactive: [],
                    displaySystemClasses: false,
                    parametersWithTypes: false
                };
                this.classBoxesRepository[cb.workspaceId] = classBoxes;
            }
            classBoxes.inactive.push(ClassBox.deserialize(this, cb));
            classBoxes.displaySystemClasses = serializedClassDiagram.displaySystemClasses;
            classBoxes.parametersWithTypes = serializedClassDiagram.parametersWithTypes;
        }
    }
    adjustClassDiagramSize() {
        let classBoxes = this.classBoxesRepository[this.currentWorkspaceId];
        this.adjustSizeAndElements(classBoxes.active);
    }
    getClassBoxes(workspace) {
        let cb = this.classBoxesRepository[workspace.id];
        if (cb == null) {
            cb = {
                active: [],
                inactive: [],
                displaySystemClasses: false,
                parametersWithTypes: false
            };
            this.classBoxesRepository[workspace.id] = cb;
        }
        return cb;
    }
    switchToWorkspace(workspace) {
        let cbs1 = this.getClassBoxes(workspace);
        if (this.currentWorkspaceId != workspace.id) {
            if (this.currentWorkspaceId != null) {
                let cbs = this.classBoxesRepository[this.currentWorkspaceId];
                if (cbs != null) {
                    for (let cb of cbs.active) {
                        cb.detach();
                    }
                    for (let cb of cbs.inactive) {
                        cb.detach();
                    }
                }
            }
            for (let cb of cbs1.active) {
                this.svgElement.appendChild(cb.$element[0]);
            }
            for (let cb of cbs1.inactive) {
                if (cb.$element != null) {
                    this.svgElement.appendChild(cb.$element[0]);
                }
            }
            this.adjustSizeAndElements(cbs1.active);
        }
        this.currentWorkspaceId = workspace.id;
        return cbs1;
    }
    drawDiagram(workspace, onlyUpdateIdentifiers) {
        var _a;
        if (workspace == null)
            return;
        this.currentWorkspace = workspace;
        this.currentClassBoxes = this.switchToWorkspace(workspace);
        let moduleStore = workspace.moduleStore;
        let newClassBoxes = [];
        let anyTypelistThere = false;
        let newClassesToDraw = [];
        let usedSystemClasses = [];
        for (let module of moduleStore.getModules(false)) {
            let typeList = (_a = module === null || module === void 0 ? void 0 : module.typeStore) === null || _a === void 0 ? void 0 : _a.typeList;
            if (typeList == null)
                continue;
            anyTypelistThere = true;
            typeList.filter((type) => {
                return type instanceof Klass ||
                    type instanceof Interface;
            }).forEach((klass) => {
                let cb = this.findAndEnableClass(klass, this.currentClassBoxes, newClassesToDraw);
                if (cb != null)
                    newClassBoxes.push(cb);
                if (klass instanceof Klass) {
                    klass.registerUsedSystemClasses(usedSystemClasses);
                }
            });
        }
        // recursively register system classes that are used by other system classes
        let uscList1 = [];
        while (uscList1.length < usedSystemClasses.length) {
            uscList1 = usedSystemClasses.slice(0);
            for (let usc of uscList1) {
                if (usc instanceof Klass) {
                    usc.registerUsedSystemClasses(usedSystemClasses);
                }
            }
        }
        if (this.currentClassBoxes.displaySystemClasses) {
            for (let usc of usedSystemClasses) {
                let cb = this.findAndEnableClass(usc, this.currentClassBoxes, newClassesToDraw);
                if (cb != null)
                    newClassBoxes.push(cb);
            }
        }
        this.dirty = this.dirty || newClassesToDraw.length > 0;
        for (let klass of newClassesToDraw) {
            let cb = new ClassBox(this, Math.random() * 10 * DiagramUnitCm, Math.random() * 10 * DiagramUnitCm, klass);
            cb.renderLines();
            let freePos = this.findFreeSpace(newClassBoxes, cb.widthCm, cb.heightCm, this.minDistance);
            cb.moveTo(freePos.x, freePos.y, true);
            newClassBoxes.push(cb);
        }
        if (newClassesToDraw.length > 0) {
            this.adjustSizeAndElements(newClassBoxes);
        }
        if (!anyTypelistThere)
            return;
        for (let cb of this.currentClassBoxes.active) {
            cb.hide();
            cb.active = false;
            this.currentClassBoxes.inactive.push(cb);
        }
        this.currentClassBoxes.active = newClassBoxes;
        if (!onlyUpdateIdentifiers) {
            this.adjustClassDiagramSize();
            this.updateArrows();
        }
    }
    updateArrows() {
        this.$htmlElement.find('.jo_classdiagram-spinner').hide();
        // return;
        let colors = ["#0075dc", "#993f00", "#005c31", "#ff5005", "#2bce48",
            "#0000ff", "#ffa405", '#ffa8bb', '#740aff', '#990000', '#ff0000'];
        let colorIndex = 0;
        let routingInput = this.drawArrows();
        this.version++;
        routingInput.version = this.version;
        if (this.routingWorker != null) {
            this.routingWorker.terminate();
        }
        this.routingWorker = new Worker('js/main/gui/diagrams/classdiagram/Router.js');
        let that = this;
        this.routingWorker.onmessage = function (e) {
            // when worker finished:
            let ro = e.data;
            if (ro.version == that.version) {
                that.$htmlElement.find('.jo_classdiagram-spinner').hide();
                that.arrows.forEach((arrow) => { arrow.remove(); });
                let arrowIdentifierToColorMap = {};
                let arrowsWithoutColor = ro.arrows.length + 1;
                let arrowsWithoutColorLast;
                do {
                    arrowsWithoutColorLast = arrowsWithoutColor;
                    arrowsWithoutColor = 0;
                    ro.arrows.forEach((arrow) => {
                        if (arrow.color == null) {
                            arrowsWithoutColor++;
                            if (arrow.endsOnArrowWithIdentifier == null) {
                                arrow.color = colors[colorIndex];
                                arrowIdentifierToColorMap[arrow.identifier] = arrow.color;
                                colorIndex++;
                                if (colorIndex > colors.length - 1)
                                    colorIndex = 0;
                            }
                            else {
                                arrow.color = arrowIdentifierToColorMap[arrow.endsOnArrowWithIdentifier];
                            }
                        }
                    });
                } while (arrowsWithoutColor < arrowsWithoutColorLast);
                ro.arrows.forEach((arrow) => {
                    if (arrow.color == null) {
                        arrow.color = "#ff0000";
                    }
                });
                ro.arrows.forEach((arrow) => {
                    let da = new DiagramArrow(that.svgElement, arrow, arrow.color);
                    da.render();
                    that.arrows.push(da);
                });
            }
        };
        this.routingWorker.postMessage(routingInput); // start worker!
        this.$htmlElement.find('.jo_classdiagram-spinner').show();
    }
    drawArrows() {
        let routingInput = {
            rectangles: [],
            arrows: [],
            xMax: Math.ceil(this.widthCm / DiagramUnitCm),
            yMax: Math.ceil(this.heightCm / DiagramUnitCm),
            straightArrowSectionAfterRectangle: this.straightArrowSectionAfterRectangle,
            distanceFromRectangles: this.distanceFromRectangles,
            slotDistance: this.slotDistance
        };
        let classBoxes = this.classBoxesRepository[this.currentWorkspaceId];
        classBoxes.active.forEach((cb) => {
            routingInput.rectangles.push(cb.getRoutingRectangle());
        });
        classBoxes.active.forEach((cb) => {
            if (cb.klass instanceof Klass) {
                if (cb.klass.baseClass != null) {
                    let cb1 = this.findClassbox(cb.klass.baseClass, classBoxes.active);
                    if (cb1 != null) {
                        this.drawArrwow(cb, cb1, "inheritance", routingInput);
                    }
                }
                for (let intf of cb.klass.implements) {
                    let cb1 = this.findClassbox(intf, classBoxes.active);
                    if (cb1 != null) {
                        this.drawArrwow(cb, cb1, "realization", routingInput);
                    }
                }
                for (let cd of cb.klass.getCompositeData()) {
                    let cb1 = this.findClassbox(cd.klass, classBoxes.active);
                    if (cb1 != null) {
                        this.drawArrwow(cb1, cb, "composition", routingInput);
                    }
                }
            }
        });
        return routingInput;
    }
    drawArrwow(cb1, cb2, arrowType, routingInput) {
        let rect1 = cb1.getRoutingRectangle();
        let rect2 = cb2.getRoutingRectangle();
        let classBoxes = this.classBoxesRepository[this.currentWorkspaceId];
        routingInput.arrows.push({
            arrowType: arrowType,
            destRectangleIndex: classBoxes.active.indexOf(cb2),
            sourceRectangleIndex: classBoxes.active.indexOf(cb1),
            destinationIdentifier: cb2.className,
            identifier: cb1.className + "(extends)" + cb2.className
        });
    }
    findClassbox(klass, classBoxes) {
        for (let cb of classBoxes) {
            if (cb.klass == klass)
                return cb;
        }
        return null;
    }
    findAndEnableClass(klass, classBoxes, newClassesToDraw) {
        let i = 0;
        while (i < classBoxes.active.length) {
            let k = classBoxes.active[i];
            if (k.className == klass.identifier || k.hasSignatureAndFileOf(klass)) {
                k.attachToClass(klass);
                classBoxes.active.splice(i, 1);
                return k;
            }
            i++;
        }
        i = 0;
        while (i < classBoxes.inactive.length) {
            let k = classBoxes.inactive[i];
            if (k.className == klass.identifier || k.hasSignatureAndFileOf(klass)) {
                classBoxes.inactive.splice(i, 1);
                k.klass = klass;
                k.renderLines();
                k.show();
                k.active = true;
                this.dirty = true;
                return k;
            }
            i++;
        }
        newClassesToDraw.push(klass);
        return null;
    }
    clear() {
        let cb = this.classBoxesRepository[this.currentWorkspaceId];
        if (cb != null) {
            for (let c of cb.active) {
                c.detach();
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2xhc3NEaWFncmFtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9kaWFncmFtcy9jbGFzc2RpYWdyYW0vQ2xhc3NEaWFncmFtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBc0IsTUFBTSxlQUFlLENBQUM7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBR2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQWdCakUsTUFBTSxPQUFPLFlBQWEsU0FBUSxPQUFPO0lBbUJyQyxZQUFvQixZQUFpQyxFQUFFLElBQWM7UUFDakUsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztRQURWLGlCQUFZLEdBQVosWUFBWSxDQUFxQjtRQWpCckQseUJBQW9CLEdBQTBDLEVBQUUsQ0FBQztRQUVqRSxXQUFNLEdBQW1CLEVBQUUsQ0FBQztRQUU1Qix1QkFBa0IsR0FBVyxJQUFJLENBQUM7UUFJbEMsWUFBTyxHQUFXLENBQUMsQ0FBQztRQUVwQix1Q0FBa0MsR0FBRyxDQUFDLENBQUM7UUFDdkMsMkJBQXNCLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLGlCQUFZLEdBQUcsQ0FBQyxDQUFDO1FBRWpCLFVBQUssR0FBWSxLQUFLLENBQUM7UUFNbkIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFO1lBQ2hDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNwQixJQUFJLHFCQUFxQixHQUFHLElB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Ly4uLy4uLy4uL2NvbXBpbGVyL3R5cGVzL0NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IFdvcmtzcGFjZSB9IGZyb20gXCIuLi8uLi8uLi8uLi93b3Jrc3BhY2UvV29ya3NwYWNlLmpzXCI7XHJcbmltcG9ydCB7IE1haW4gfSBmcm9tIFwiLi4vLi4vLi4vTWFpbi5qc1wiO1xyXG5pbXBvcnQgeyBEaWFncmFtLCBEaWFncmFtVW5pdENtIH0gZnJvbSBcIi4uL0RpYWdyYW0uanNcIjtcclxuaW1wb3J0IHsgQ2xhc3NCb3gsIFNlcmlhbGl6ZWRDbGFzc0JveCB9IGZyb20gXCIuL0NsYXNzQm94LmpzXCI7XHJcbmltcG9ydCB7IERpYWdyYW1BcnJvdyB9IGZyb20gXCIuL0RpYWdyYW1BcnJvdy5qc1wiO1xyXG5pbXBvcnQgeyBSb3V0aW5nSW5wdXQsIFJvdXRpbmdPdXRwdXQgfSBmcm9tIFwiLi9Sb3V0ZXIuanNcIjtcclxuaW1wb3J0IHsgTWFpbkJhc2UgfSBmcm9tIFwiLi4vLi4vLi4vTWFpbkJhc2UuanNcIjtcclxuaW1wb3J0IHsgb3BlbkNvbnRleHRNZW51IH0gZnJvbSBcIi4uLy4uLy4uLy4uL3Rvb2xzL0h0bWxUb29scy5qc1wiO1xyXG5pbXBvcnQgeyBUZWFjaGVyc1dpdGhDbGFzc2VzTUkgfSBmcm9tIFwiLi4vLi4vLi4vLi4vYWRtaW5pc3RyYXRpb24vVGVhY2hlcnNXaXRoQ2xhc3Nlcy5qc1wiO1xyXG5cclxudHlwZSBDbGFzc0JveGVzID0ge1xyXG4gICAgYWN0aXZlOiBDbGFzc0JveFtdLFxyXG4gICAgaW5hY3RpdmU6IENsYXNzQm94W10sXHJcbiAgICBkaXNwbGF5U3lzdGVtQ2xhc3NlczogYm9vbGVhbixcclxuICAgIHBhcmFtZXRlcnNXaXRoVHlwZXM6IGJvb2xlYW5cclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIFNlcmlhbGl6ZWRDbGFzc0RpYWdyYW0gPSB7XHJcbiAgICBjbGFzc0JveGVzOiBTZXJpYWxpemVkQ2xhc3NCb3hbXSxcclxuICAgIGRpc3BsYXlTeXN0ZW1DbGFzc2VzOiBib29sZWFuLFxyXG4gICAgcGFyYW1ldGVyc1dpdGhUeXBlczogYm9vbGVhblxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ2xhc3NEaWFncmFtIGV4dGVuZHMgRGlhZ3JhbSB7XHJcblxyXG4gICAgY2xhc3NCb3hlc1JlcG9zaXRvcnk6IHsgW3dvcmtzcGFjZUlkOiBudW1iZXJdOiBDbGFzc0JveGVzIH0gPSB7fTtcclxuXHJcbiAgICBhcnJvd3M6IERpYWdyYW1BcnJvd1tdID0gW107XHJcblxyXG4gICAgY3VycmVudFdvcmtzcGFjZUlkOiBudW1iZXIgPSBudWxsO1xyXG4gICAgY3VycmVudFdvcmtzcGFjZTogV29ya3NwYWNlO1xyXG4gICAgY3VycmVudENsYXNzQm94ZXM6IENsYXNzQm94ZXM7XHJcblxyXG4gICAgdmVyc2lvbjogbnVtYmVyID0gMDtcclxuXHJcbiAgICBzdHJhaWdodEFycm93U2VjdGlvbkFmdGVyUmVjdGFuZ2xlID0gMjtcclxuICAgIGRpc3RhbmNlRnJvbVJlY3RhbmdsZXMgPSAyO1xyXG4gICAgc2xvdERpc3RhbmNlID0gMjtcclxuXHJcbiAgICBkaXJ0eTogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgcm91dGluZ1dvcmtlcjogV29ya2VyO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgJGh0bWxFbGVtZW50OiBKUXVlcnk8SFRNTEVsZW1lbnQ+LCBtYWluOiBNYWluQmFzZSkge1xyXG4gICAgICAgIHN1cGVyKCRodG1sRWxlbWVudCwgbWFpbik7XHJcblxyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLiRtZW51QnV0dG9uLm9uKCdjbGljaycsIChldikgPT4ge1xyXG4gICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBsZXQgZGlzcGxheXNTeXN0ZW1DbGFzc2VzID0gdGhhdC5jdXJyZW50Q2xhc3NCb3hlcy5kaXNwbGF5U3lzdGVtQ2xhc3NlcyA9PSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVyc1dpdGhUeXBlcyA9IHRoYXQuY3VycmVudENsYXNzQm94ZXMucGFyYW1ldGVyc1dpdGhUeXBlcyA9PSB0cnVlO1xyXG4gICAgICAgICAgICBvcGVuQ29udGV4dE1lbnUoW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhcHRpb246IGRpc3BsYXlzU3lzdGVtQ2xhc3NlcyA/IFwiU3lzdGVta2xhc3NlbiBhdXNibGVuZGVuXCIgOiBcIlN5c3RlbWtsYXNzZW4gZWluYmxlbmRlblwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuY3VycmVudENsYXNzQm94ZXMuZGlzcGxheVN5c3RlbUNsYXNzZXMgPSAhZGlzcGxheXNTeXN0ZW1DbGFzc2VzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmRyYXdEaWFncmFtKHRoYXQuY3VycmVudFdvcmtzcGFjZSwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FwdGlvbjogcGFyYW1ldGVyc1dpdGhUeXBlcyA/IFwiUGFyYW1ldGVyIGF1c2JsZW5kZW5cIiA6IFwiUGFyYW1ldGVyIGVpbmJsZW5kZW5cIixcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmN1cnJlbnRDbGFzc0JveGVzLnBhcmFtZXRlcnNXaXRoVHlwZXMgPSAhcGFyYW1ldGVyc1dpdGhUeXBlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jdXJyZW50Q2xhc3NCb3hlcy5hY3RpdmUuZm9yRWFjaCgoY2IpID0+IHtjYi5oYXNoZWRTaWduYXR1cmUgPSAtMX0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmRyYXdEaWFncmFtKHRoYXQuY3VycmVudFdvcmtzcGFjZSwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF0sIGV2LnBhZ2VYICsgMiwgZXYucGFnZVkgKyAyKTtcclxuICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xlYXJBZnRlckxvZ291dCgpIHtcclxuICAgICAgICB0aGlzLmNsYXNzQm94ZXNSZXBvc2l0b3J5ID0ge307XHJcbiAgICAgICAgdGhpcy5hcnJvd3MuZm9yRWFjaCgoYXJyb3cpID0+IHsgYXJyb3cucmVtb3ZlKCk7IH0pO1xyXG4gICAgICAgICQodGhpcy5zdmdFbGVtZW50KS5lbXB0eSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemVkQ2xhc3NEaWFncmFtIHtcclxuXHJcbiAgICAgICAgaWYodGhpcy5jdXJyZW50Q2xhc3NCb3hlcyA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGxldCBzY2Q6IFNlcmlhbGl6ZWRDbGFzc0RpYWdyYW0gPSB7XHJcbiAgICAgICAgICAgIGNsYXNzQm94ZXM6IFtdLFxyXG4gICAgICAgICAgICBkaXNwbGF5U3lzdGVtQ2xhc3NlczogdGhpcy5jdXJyZW50Q2xhc3NCb3hlcy5kaXNwbGF5U3lzdGVtQ2xhc3NlcyxcclxuICAgICAgICAgICAgcGFyYW1ldGVyc1dpdGhUeXBlczogdGhpcy5jdXJyZW50Q2xhc3NCb3hlcy5wYXJhbWV0ZXJzV2l0aFR5cGVzXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCB3b3Jrc3BhY2VJZCBpbiB0aGlzLmNsYXNzQm94ZXNSZXBvc2l0b3J5KSB7XHJcbiAgICAgICAgICAgIGxldCBjbGFzc0JveCA9IHRoaXMuY2xhc3NCb3hlc1JlcG9zaXRvcnlbd29ya3NwYWNlSWRdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjYiBvZiBjbGFzc0JveC5hY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgIGxldCBjYnMgPSBjYi5zZXJpYWxpemUoKTtcclxuICAgICAgICAgICAgICAgIGNicy53b3Jrc3BhY2VJZCA9IE51bWJlci5wYXJzZUludCh3b3Jrc3BhY2VJZCk7XHJcbiAgICAgICAgICAgICAgICBzY2QuY2xhc3NCb3hlcy5wdXNoKGNicyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBzY2Q7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGRlc2VyaWFsaXplKHNlcmlhbGl6ZWRDbGFzc0RpYWdyYW06IFNlcmlhbGl6ZWRDbGFzc0RpYWdyYW0pIHtcclxuICAgICAgICBmb3IgKGxldCBjYiBvZiBzZXJpYWxpemVkQ2xhc3NEaWFncmFtLmNsYXNzQm94ZXMpIHtcclxuICAgICAgICAgICAgbGV0IGNsYXNzQm94ZXM6IENsYXNzQm94ZXMgPSB0aGlzLmNsYXNzQm94ZXNSZXBvc2l0b3J5W2NiLndvcmtzcGFjZUlkXTtcclxuICAgICAgICAgICAgaWYgKGNsYXNzQm94ZXMgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY2xhc3NCb3hlcyA9IHtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIGluYWN0aXZlOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5U3lzdGVtQ2xhc3NlczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyc1dpdGhUeXBlczogZmFsc2VcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NCb3hlc1JlcG9zaXRvcnlbY2Iud29ya3NwYWNlSWRdID0gY2xhc3NCb3hlcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjbGFzc0JveGVzLmluYWN0aXZlLnB1c2goQ2xhc3NCb3guZGVzZXJpYWxpemUodGhpcywgY2IpKTtcclxuICAgICAgICAgICAgY2xhc3NCb3hlcy5kaXNwbGF5U3lzdGVtQ2xhc3NlcyA9IHNlcmlhbGl6ZWRDbGFzc0RpYWdyYW0uZGlzcGxheVN5c3RlbUNsYXNzZXM7XHJcbiAgICAgICAgICAgIGNsYXNzQm94ZXMucGFyYW1ldGVyc1dpdGhUeXBlcyA9IHNlcmlhbGl6ZWRDbGFzc0RpYWdyYW0ucGFyYW1ldGVyc1dpdGhUeXBlcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGFkanVzdENsYXNzRGlhZ3JhbVNpemUoKSB7XHJcbiAgICAgICAgbGV0IGNsYXNzQm94ZXMgPSB0aGlzLmNsYXNzQm94ZXNSZXBvc2l0b3J5W3RoaXMuY3VycmVudFdvcmtzcGFjZUlkXTtcclxuICAgICAgICB0aGlzLmFkanVzdFNpemVBbmRFbGVtZW50cyhjbGFzc0JveGVzLmFjdGl2ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q2xhc3NCb3hlcyh3b3Jrc3BhY2U6IFdvcmtzcGFjZSk6IENsYXNzQm94ZXMge1xyXG4gICAgICAgIGxldCBjYjogQ2xhc3NCb3hlcyA9IHRoaXMuY2xhc3NCb3hlc1JlcG9zaXRvcnlbd29ya3NwYWNlLmlkXTtcclxuICAgICAgICBpZiAoY2IgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBjYiA9IHtcclxuICAgICAgICAgICAgICAgIGFjdGl2ZTogW10sXHJcbiAgICAgICAgICAgICAgICBpbmFjdGl2ZTogW10sXHJcbiAgICAgICAgICAgICAgICBkaXNwbGF5U3lzdGVtQ2xhc3NlczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzV2l0aFR5cGVzOiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY2xhc3NCb3hlc1JlcG9zaXRvcnlbd29ya3NwYWNlLmlkXSA9IGNiO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY2I7XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoVG9Xb3Jrc3BhY2Uod29ya3NwYWNlOiBXb3Jrc3BhY2UpOiBDbGFzc0JveGVzIHtcclxuICAgICAgICBsZXQgY2JzMSA9IHRoaXMuZ2V0Q2xhc3NCb3hlcyh3b3Jrc3BhY2UpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50V29ya3NwYWNlSWQgIT0gd29ya3NwYWNlLmlkKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRXb3Jrc3BhY2VJZCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgY2JzID0gdGhpcy5jbGFzc0JveGVzUmVwb3NpdG9yeVt0aGlzLmN1cnJlbnRXb3Jrc3BhY2VJZF07XHJcbiAgICAgICAgICAgICAgICBpZiAoY2JzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjYiBvZiBjYnMuYWN0aXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNiLmRldGFjaCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjYiBvZiBjYnMuaW5hY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2IuZGV0YWNoKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBjYiBvZiBjYnMxLmFjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdmdFbGVtZW50LmFwcGVuZENoaWxkKGNiLiRlbGVtZW50WzBdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKGxldCBjYiBvZiBjYnMxLmluYWN0aXZlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2IuJGVsZW1lbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ZnRWxlbWVudC5hcHBlbmRDaGlsZChjYi4kZWxlbWVudFswXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRqdXN0U2l6ZUFuZEVsZW1lbnRzKGNiczEuYWN0aXZlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFdvcmtzcGFjZUlkID0gd29ya3NwYWNlLmlkO1xyXG5cclxuICAgICAgICByZXR1cm4gY2JzMTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd0RpYWdyYW0od29ya3NwYWNlOiBXb3Jrc3BhY2UsIG9ubHlVcGRhdGVJZGVudGlmaWVyczogYm9vbGVhbikge1xyXG5cclxuICAgICAgICBpZiAod29ya3NwYWNlID09IG51bGwpIHJldHVybjtcclxuICAgICAgICB0aGlzLmN1cnJlbnRXb3Jrc3BhY2UgPSB3b3Jrc3BhY2U7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50Q2xhc3NCb3hlcyA9IHRoaXMuc3dpdGNoVG9Xb3Jrc3BhY2Uod29ya3NwYWNlKTtcclxuXHJcbiAgICAgICAgbGV0IG1vZHVsZVN0b3JlID0gd29ya3NwYWNlLm1vZHVsZVN0b3JlO1xyXG5cclxuICAgICAgICBsZXQgbmV3Q2xhc3NCb3hlczogQ2xhc3NCb3hbXSA9IFtdO1xyXG5cclxuICAgICAgICBsZXQgYW55VHlwZWxpc3RUaGVyZTogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBuZXdDbGFzc2VzVG9EcmF3OiAoS2xhc3MgfCBJbnRlcmZhY2UpW10gPSBbXTtcclxuICAgICAgICBsZXQgdXNlZFN5c3RlbUNsYXNzZXM6IChLbGFzcyB8IEludGVyZmFjZSlbXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtb2R1bGUgb2YgbW9kdWxlU3RvcmUuZ2V0TW9kdWxlcyhmYWxzZSkpIHtcclxuICAgICAgICAgICAgbGV0IHR5cGVMaXN0ID0gbW9kdWxlPy50eXBlU3RvcmU/LnR5cGVMaXN0O1xyXG4gICAgICAgICAgICBpZiAodHlwZUxpc3QgPT0gbnVsbCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGFueVR5cGVsaXN0VGhlcmUgPSB0cnVlO1xyXG5cclxuXHJcbiAgICAgICAgICAgIHR5cGVMaXN0LmZpbHRlcigodHlwZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGUgaW5zdGFuY2VvZiBLbGFzcyB8fFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgaW5zdGFuY2VvZiBJbnRlcmZhY2VcclxuICAgICAgICAgICAgfSkuZm9yRWFjaCgoa2xhc3M6IEtsYXNzIHwgSW50ZXJmYWNlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgY2I6IENsYXNzQm94ID0gdGhpcy5maW5kQW5kRW5hYmxlQ2xhc3Moa2xhc3MsIHRoaXMuY3VycmVudENsYXNzQm94ZXMsIG5ld0NsYXNzZXNUb0RyYXcpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNiICE9IG51bGwpIG5ld0NsYXNzQm94ZXMucHVzaChjYik7XHJcbiAgICAgICAgICAgICAgICBpZiAoa2xhc3MgaW5zdGFuY2VvZiBLbGFzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGtsYXNzLnJlZ2lzdGVyVXNlZFN5c3RlbUNsYXNzZXModXNlZFN5c3RlbUNsYXNzZXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHJlY3Vyc2l2ZWx5IHJlZ2lzdGVyIHN5c3RlbSBjbGFzc2VzIHRoYXQgYXJlIHVzZWQgYnkgb3RoZXIgc3lzdGVtIGNsYXNzZXNcclxuICAgICAgICBsZXQgdXNjTGlzdDE6IChLbGFzcyB8IEludGVyZmFjZSlbXSA9IFtdO1xyXG4gICAgICAgIHdoaWxlICh1c2NMaXN0MS5sZW5ndGggPCB1c2VkU3lzdGVtQ2xhc3Nlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdXNjTGlzdDEgPSB1c2VkU3lzdGVtQ2xhc3Nlcy5zbGljZSgwKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgdXNjIG9mIHVzY0xpc3QxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodXNjIGluc3RhbmNlb2YgS2xhc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICB1c2MucmVnaXN0ZXJVc2VkU3lzdGVtQ2xhc3Nlcyh1c2VkU3lzdGVtQ2xhc3Nlcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRDbGFzc0JveGVzLmRpc3BsYXlTeXN0ZW1DbGFzc2VzKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHVzYyBvZiB1c2VkU3lzdGVtQ2xhc3Nlcykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNiOiBDbGFzc0JveCA9IHRoaXMuZmluZEFuZEVuYWJsZUNsYXNzKHVzYywgdGhpcy5jdXJyZW50Q2xhc3NCb3hlcywgbmV3Q2xhc3Nlc1RvRHJhdyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2IgIT0gbnVsbCkgbmV3Q2xhc3NCb3hlcy5wdXNoKGNiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kaXJ0eSA9IHRoaXMuZGlydHkgfHwgbmV3Q2xhc3Nlc1RvRHJhdy5sZW5ndGggPiAwO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBrbGFzcyBvZiBuZXdDbGFzc2VzVG9EcmF3KSB7XHJcbiAgICAgICAgICAgIGxldCBjYiA9IG5ldyBDbGFzc0JveCh0aGlzLCBNYXRoLnJhbmRvbSgpICogMTAgKiBEaWFncmFtVW5pdENtLCBNYXRoLnJhbmRvbSgpICogMTAgKiBEaWFncmFtVW5pdENtLCBrbGFzcyk7XHJcblxyXG4gICAgICAgICAgICBjYi5yZW5kZXJMaW5lcygpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGZyZWVQb3MgPSB0aGlzLmZpbmRGcmVlU3BhY2UobmV3Q2xhc3NCb3hlcywgY2Iud2lkdGhDbSwgY2IuaGVpZ2h0Q20sIHRoaXMubWluRGlzdGFuY2UpO1xyXG5cclxuICAgICAgICAgICAgY2IubW92ZVRvKGZyZWVQb3MueCwgZnJlZVBvcy55LCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIG5ld0NsYXNzQm94ZXMucHVzaChjYik7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5ld0NsYXNzZXNUb0RyYXcubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmFkanVzdFNpemVBbmRFbGVtZW50cyhuZXdDbGFzc0JveGVzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghYW55VHlwZWxpc3RUaGVyZSkgcmV0dXJuO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBjYiBvZiB0aGlzLmN1cnJlbnRDbGFzc0JveGVzLmFjdGl2ZSkge1xyXG4gICAgICAgICAgICBjYi5oaWRlKCk7XHJcbiAgICAgICAgICAgIGNiLmFjdGl2ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRDbGFzc0JveGVzLmluYWN0aXZlLnB1c2goY2IpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50Q2xhc3NCb3hlcy5hY3RpdmUgPSBuZXdDbGFzc0JveGVzO1xyXG5cclxuICAgICAgICBpZiAoIW9ubHlVcGRhdGVJZGVudGlmaWVycykge1xyXG4gICAgICAgICAgICB0aGlzLmFkanVzdENsYXNzRGlhZ3JhbVNpemUoKTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVBcnJvd3MoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUFycm93cygpIHtcclxuICAgICAgICB0aGlzLiRodG1sRWxlbWVudC5maW5kKCcuam9fY2xhc3NkaWFncmFtLXNwaW5uZXInKS5oaWRlKCk7XHJcblxyXG4gICAgICAgIC8vIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IGNvbG9yczogc3RyaW5nW10gPSBbXCIjMDA3NWRjXCIsIFwiIzk5M2YwMFwiLCBcIiMwMDVjMzFcIiwgXCIjZmY1MDA1XCIsIFwiIzJiY2U0OFwiLFxyXG4gICAgICAgICAgICBcIiMwMDAwZmZcIiwgXCIjZmZhNDA1XCIsICcjZmZhOGJiJywgJyM3NDBhZmYnLCAnIzk5MDAwMCcsICcjZmYwMDAwJ107XHJcbiAgICAgICAgbGV0IGNvbG9ySW5kZXggPSAwO1xyXG5cclxuICAgICAgICBsZXQgcm91dGluZ0lucHV0ID0gdGhpcy5kcmF3QXJyb3dzKCk7XHJcblxyXG4gICAgICAgIHRoaXMudmVyc2lvbisrO1xyXG4gICAgICAgIHJvdXRpbmdJbnB1dC52ZXJzaW9uID0gdGhpcy52ZXJzaW9uO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5yb3V0aW5nV29ya2VyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5yb3V0aW5nV29ya2VyLnRlcm1pbmF0ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yb3V0aW5nV29ya2VyID0gbmV3IFdvcmtlcignanMvbWFpbi9ndWkvZGlhZ3JhbXMvY2xhc3NkaWFncmFtL1JvdXRlci5qcycpO1xyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLnJvdXRpbmdXb3JrZXIub25tZXNzYWdlID0gZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgLy8gd2hlbiB3b3JrZXIgZmluaXNoZWQ6XHJcbiAgICAgICAgICAgIGxldCBybzogUm91dGluZ091dHB1dCA9IGUuZGF0YTtcclxuICAgICAgICAgICAgaWYgKHJvLnZlcnNpb24gPT0gdGhhdC52ZXJzaW9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGF0LiRodG1sRWxlbWVudC5maW5kKCcuam9fY2xhc3NkaWFncmFtLXNwaW5uZXInKS5oaWRlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhhdC5hcnJvd3MuZm9yRWFjaCgoYXJyb3cpID0+IHsgYXJyb3cucmVtb3ZlKCk7IH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBhcnJvd0lkZW50aWZpZXJUb0NvbG9yTWFwOiB7IFtpZGVudGlmaWVyOiBzdHJpbmddOiBzdHJpbmcgfSA9IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBhcnJvd3NXaXRob3V0Q29sb3I6IG51bWJlciA9IHJvLmFycm93cy5sZW5ndGggKyAxO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFycm93c1dpdGhvdXRDb2xvckxhc3Q6IG51bWJlcjtcclxuICAgICAgICAgICAgICAgIGRvIHtcclxuICAgICAgICAgICAgICAgICAgICBhcnJvd3NXaXRob3V0Q29sb3JMYXN0ID0gYXJyb3dzV2l0aG91dENvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgIGFycm93c1dpdGhvdXRDb2xvciA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcm8uYXJyb3dzLmZvckVhY2goKGFycm93KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcnJvdy5jb2xvciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJvd3NXaXRob3V0Q29sb3IrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcnJvdy5lbmRzT25BcnJvd1dpdGhJZGVudGlmaWVyID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJvdy5jb2xvciA9IGNvbG9yc1tjb2xvckluZGV4XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJvd0lkZW50aWZpZXJUb0NvbG9yTWFwW2Fycm93LmlkZW50aWZpZXJdID0gYXJyb3cuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2xvckluZGV4ID4gY29sb3JzLmxlbmd0aCAtIDEpIGNvbG9ySW5kZXggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJvdy5jb2xvciA9IGFycm93SWRlbnRpZmllclRvQ29sb3JNYXBbYXJyb3cuZW5kc09uQXJyb3dXaXRoSWRlbnRpZmllcl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gd2hpbGUgKGFycm93c1dpdGhvdXRDb2xvciA8IGFycm93c1dpdGhvdXRDb2xvckxhc3QpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJvLmFycm93cy5mb3JFYWNoKChhcnJvdykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhcnJvdy5jb2xvciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFycm93LmNvbG9yID0gXCIjZmYwMDAwXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcm8uYXJyb3dzLmZvckVhY2goKGFycm93KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRhOiBEaWFncmFtQXJyb3cgPSBuZXcgRGlhZ3JhbUFycm93KHRoYXQuc3ZnRWxlbWVudCwgYXJyb3csIGFycm93LmNvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICBkYS5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmFycm93cy5wdXNoKGRhKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucm91dGluZ1dvcmtlci5wb3N0TWVzc2FnZShyb3V0aW5nSW5wdXQpOyAvLyBzdGFydCB3b3JrZXIhXHJcbiAgICAgICAgdGhpcy4kaHRtbEVsZW1lbnQuZmluZCgnLmpvX2NsYXNzZGlhZ3JhbS1zcGlubmVyJykuc2hvdygpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBkcmF3QXJyb3dzKCk6IFJvdXRpbmdJbnB1dCB7XHJcblxyXG4gICAgICAgIGxldCByb3V0aW5nSW5wdXQ6IFJvdXRpbmdJbnB1dCA9IHtcclxuICAgICAgICAgICAgcmVjdGFuZ2xlczogW10sXHJcbiAgICAgICAgICAgIGFycm93czogW10sXHJcbiAgICAgICAgICAgIHhNYXg6IE1hdGguY2VpbCh0aGlzLndpZHRoQ20gLyBEaWFncmFtVW5pdENtKSxcclxuICAgICAgICAgICAgeU1heDogTWF0aC5jZWlsKHRoaXMuaGVpZ2h0Q20gLyBEaWFncmFtVW5pdENtKSxcclxuICAgICAgICAgICAgc3RyYWlnaHRBcnJvd1NlY3Rpb25BZnRlclJlY3RhbmdsZTogdGhpcy5zdHJhaWdodEFycm93U2VjdGlvbkFmdGVyUmVjdGFuZ2xlLFxyXG4gICAgICAgICAgICBkaXN0YW5jZUZyb21SZWN0YW5nbGVzOiB0aGlzLmRpc3RhbmNlRnJvbVJlY3RhbmdsZXMsXHJcbiAgICAgICAgICAgIHNsb3REaXN0YW5jZTogdGhpcy5zbG90RGlzdGFuY2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBjbGFzc0JveGVzID0gdGhpcy5jbGFzc0JveGVzUmVwb3NpdG9yeVt0aGlzLmN1cnJlbnRXb3Jrc3BhY2VJZF07XHJcblxyXG4gICAgICAgIGNsYXNzQm94ZXMuYWN0aXZlLmZvckVhY2goKGNiKSA9PiB7XHJcbiAgICAgICAgICAgIHJvdXRpbmdJbnB1dC5yZWN0YW5nbGVzLnB1c2goY2IuZ2V0Um91dGluZ1JlY3RhbmdsZSgpKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY2xhc3NCb3hlcy5hY3RpdmUuZm9yRWFjaCgoY2IpID0+IHtcclxuXHJcbiAgICAgICAgICAgIGlmIChjYi5rbGFzcyBpbnN0YW5jZW9mIEtsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2Iua2xhc3MuYmFzZUNsYXNzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY2IxID0gdGhpcy5maW5kQ2xhc3Nib3goY2Iua2xhc3MuYmFzZUNsYXNzLCBjbGFzc0JveGVzLmFjdGl2ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNiMSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZHJhd0FycndvdyhjYiwgY2IxLCBcImluaGVyaXRhbmNlXCIsIHJvdXRpbmdJbnB1dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaW50ZiBvZiBjYi5rbGFzcy5pbXBsZW1lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNiMSA9IHRoaXMuZmluZENsYXNzYm94KGludGYsIGNsYXNzQm94ZXMuYWN0aXZlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2IxICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmF3QXJyd293KGNiLCBjYjEsIFwicmVhbGl6YXRpb25cIiwgcm91dGluZ0lucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjZCBvZiBjYi5rbGFzcy5nZXRDb21wb3NpdGVEYXRhKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY2IxID0gdGhpcy5maW5kQ2xhc3Nib3goY2Qua2xhc3MsIGNsYXNzQm94ZXMuYWN0aXZlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2IxICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmF3QXJyd293KGNiMSwgY2IsIFwiY29tcG9zaXRpb25cIiwgcm91dGluZ0lucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICAgICAgcmV0dXJuIHJvdXRpbmdJbnB1dDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd0FycndvdyhjYjE6IENsYXNzQm94LCBjYjI6IENsYXNzQm94LCBhcnJvd1R5cGU6IHN0cmluZywgcm91dGluZ0lucHV0OiBSb3V0aW5nSW5wdXQpIHtcclxuXHJcbiAgICAgICAgbGV0IHJlY3QxID0gY2IxLmdldFJvdXRpbmdSZWN0YW5nbGUoKTtcclxuICAgICAgICBsZXQgcmVjdDIgPSBjYjIuZ2V0Um91dGluZ1JlY3RhbmdsZSgpO1xyXG5cclxuICAgICAgICBsZXQgY2xhc3NCb3hlcyA9IHRoaXMuY2xhc3NCb3hlc1JlcG9zaXRvcnlbdGhpcy5jdXJyZW50V29ya3NwYWNlSWRdO1xyXG5cclxuICAgICAgICByb3V0aW5nSW5wdXQuYXJyb3dzLnB1c2goe1xyXG4gICAgICAgICAgICBhcnJvd1R5cGU6IGFycm93VHlwZSxcclxuXHJcbiAgICAgICAgICAgIGRlc3RSZWN0YW5nbGVJbmRleDogY2xhc3NCb3hlcy5hY3RpdmUuaW5kZXhPZihjYjIpLFxyXG5cclxuICAgICAgICAgICAgc291cmNlUmVjdGFuZ2xlSW5kZXg6IGNsYXNzQm94ZXMuYWN0aXZlLmluZGV4T2YoY2IxKSxcclxuXHJcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uSWRlbnRpZmllcjogY2IyLmNsYXNzTmFtZSxcclxuICAgICAgICAgICAgaWRlbnRpZmllcjogY2IxLmNsYXNzTmFtZSArIFwiKGV4dGVuZHMpXCIgKyBjYjIuY2xhc3NOYW1lXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZpbmRDbGFzc2JveChrbGFzczogS2xhc3MgfCBJbnRlcmZhY2UsIGNsYXNzQm94ZXM6IENsYXNzQm94W10pOiBDbGFzc0JveCB7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGNiIG9mIGNsYXNzQm94ZXMpIHtcclxuICAgICAgICAgICAgaWYgKGNiLmtsYXNzID09IGtsYXNzKSByZXR1cm4gY2I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZmluZEFuZEVuYWJsZUNsYXNzKGtsYXNzOiBLbGFzcyB8IEludGVyZmFjZSwgY2xhc3NCb3hlczogQ2xhc3NCb3hlcywgbmV3Q2xhc3Nlc1RvRHJhdzogKEtsYXNzIHwgSW50ZXJmYWNlKVtdKTogQ2xhc3NCb3gge1xyXG4gICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICB3aGlsZSAoaSA8IGNsYXNzQm94ZXMuYWN0aXZlLmxlbmd0aCkge1xyXG4gICAgICAgICAgICBsZXQgayA9IGNsYXNzQm94ZXMuYWN0aXZlW2ldO1xyXG4gICAgICAgICAgICBpZiAoay5jbGFzc05hbWUgPT0ga2xhc3MuaWRlbnRpZmllciB8fCBrLmhhc1NpZ25hdHVyZUFuZEZpbGVPZihrbGFzcykpIHtcclxuICAgICAgICAgICAgICAgIGsuYXR0YWNoVG9DbGFzcyhrbGFzcyk7XHJcbiAgICAgICAgICAgICAgICBjbGFzc0JveGVzLmFjdGl2ZS5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpID0gMDtcclxuICAgICAgICB3aGlsZSAoaSA8IGNsYXNzQm94ZXMuaW5hY3RpdmUubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIGxldCBrID0gY2xhc3NCb3hlcy5pbmFjdGl2ZVtpXTtcclxuICAgICAgICAgICAgaWYgKGsuY2xhc3NOYW1lID09IGtsYXNzLmlkZW50aWZpZXIgfHwgay5oYXNTaWduYXR1cmVBbmRGaWxlT2Yoa2xhc3MpKSB7XHJcbiAgICAgICAgICAgICAgICBjbGFzc0JveGVzLmluYWN0aXZlLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgICAgIGsua2xhc3MgPSBrbGFzcztcclxuICAgICAgICAgICAgICAgIGsucmVuZGVyTGluZXMoKTtcclxuICAgICAgICAgICAgICAgIGsuc2hvdygpO1xyXG4gICAgICAgICAgICAgICAgay5hY3RpdmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kaXJ0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBuZXdDbGFzc2VzVG9EcmF3LnB1c2goa2xhc3MpO1xyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBjbGVhcigpIHtcclxuXHJcbiAgICAgICAgbGV0IGNiID0gdGhpcy5jbGFzc0JveGVzUmVwb3NpdG9yeVt0aGlzLmN1cnJlbnRXb3Jrc3BhY2VJZF07XHJcbiAgICAgICAgaWYgKGNiICE9IG51bGwpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyBvZiBjYi5hY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgIGMuZGV0YWNoKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxufSJdfQ==