import { InterpreterState } from "../../interpreter/Interpreter.js";
import { makeTabs } from "../../tools/HtmlTools.js";
import { ClassDiagram } from "./diagrams/classdiagram/ClassDiagram.js";
import { ObjectDiagram } from "./diagrams/objectdiagram/ObjectDiagram.js";
export class RightDiv {
    constructor(main, $rightDiv) {
        this.main = main;
        this.$rightDiv = $rightDiv;
        this.isWholePage = false;
        this.$tabs = $rightDiv.find('.jo_tabs');
        this.$headings = $rightDiv.find('.jo_tabheadings');
        let withClassDiagram = this.$headings.find('.jo_classDiagramTabHeading').length > 0;
        let withObjectDiagram = this.$headings.find('.jo_objectDiagramTabHeading').length > 0;
        if (withClassDiagram) {
            this.classDiagram = new ClassDiagram(this.$tabs.find('.jo_classdiagram'), main);
            this.$headings.find('.jo_classDiagramTabHeading').on("click", () => { that.main.drawClassDiagrams(false); });
        }
        if (withObjectDiagram) {
            this.objectDiagram = new ObjectDiagram(this.main, this.$tabs.find('.jo_objectdiagram'));
            this.$headings.find('.jo_objectDiagramTabHeading').on("click", () => { that.onObjectDiagramEnabled(); });
        }
        let that = this;
        let rightdiv_width = "100%";
        $rightDiv.find('.jo_whole-window').on("click", () => {
            that.isWholePage = !that.isWholePage;
            let $wholeWindow = jQuery('.jo_whole-window');
            if (!that.isWholePage) {
                jQuery('#code').css('display', 'flex');
                jQuery('#rightdiv').css('width', rightdiv_width);
                // jQuery('#run').css('width', '');
                $wholeWindow.removeClass('img_whole-window-back');
                $wholeWindow.addClass('img_whole-window');
                jQuery('#controls').insertAfter(jQuery('#view-mode'));
                $wholeWindow.attr('title', 'Auf Fenstergröße vergrößern');
                jQuery('.jo_graphics').trigger('sizeChanged');
            }
            else {
                jQuery('#code').css('display', 'none');
                rightdiv_width = jQuery('#rightdiv').css('width');
                jQuery('#rightdiv').css('width', '100%');
                $wholeWindow.removeClass('img_whole-window');
                $wholeWindow.addClass('img_whole-window-back');
                // that.adjustWidthToWorld();
                jQuery('.jo_control-container').append(jQuery('#controls'));
                $wholeWindow.attr('title', 'Auf normale Größe zurückführen');
                jQuery('.jo_graphics').trigger('sizeChanged');
            }
        });
    }
    adjustWidthToWorld() {
        let worldHelper = this.main.getInterpreter().worldHelper;
        if (worldHelper != null && this.isWholePage) {
            let screenHeight = window.innerHeight - this.$headings.height() - 6;
            let screenWidthToHeight = window.innerWidth / (screenHeight);
            let worldWidthToHeight = worldHelper.width / worldHelper.height;
            if (worldWidthToHeight <= screenWidthToHeight) {
                let newWidth = worldWidthToHeight * screenHeight;
                this.$tabs.find('.jo_run').css('width', newWidth + "px");
                this.$tabs.find('.jo_run').css('height', screenHeight + "px");
            }
            else {
                let newHeight = window.innerWidth / worldWidthToHeight;
                this.$tabs.find('.jo_run').css('width', window.innerWidth + "px");
                this.$tabs.find('.jo_run').css('height', newHeight + "px");
            }
        }
    }
    initGUI() {
        makeTabs(this.$rightDiv);
    }
    isClassDiagramEnabled() {
        let heading = this.$headings.find('.jo_classDiagramTabHeading');
        if (heading.length == 0)
            return false;
        return heading.hasClass("jo_active");
    }
    isObjectDiagramEnabled() {
        let heading = this.$headings.find('.jo_objectDiagramTabHeading');
        if (heading.length == 0)
            return false;
        return heading.hasClass("jo_active");
    }
    updateObjectDiagramSettings() {
        if (this.isObjectDiagramEnabled) {
            this.objectDiagram.updateSettings();
        }
    }
    onObjectDiagramEnabled() {
        this.objectDiagram.updateSettings();
        if (this.main.getInterpreter().state == InterpreterState.paused || this.main.getInterpreter().state == InterpreterState.running) {
            this.objectDiagram.updateDiagram();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmlnaHREaXYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L21haW4vZ3VpL1JpZ2h0RGl2LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRzFFLE1BQU0sT0FBTyxRQUFRO0lBU2pCLFlBQW9CLElBQWMsRUFBUyxTQUE4QjtRQUFyRCxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQVMsY0FBUyxHQUFULFNBQVMsQ0FBcUI7UUFMekUsZ0JBQVcsR0FBWSxLQUFLLENBQUM7UUFPekIsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRW5ELElBQUksZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3BGLElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBRXRGLElBQUcsZ0JBQWdCLEVBQUM7WUFDaEIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2hGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLDRC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QUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUNyQyxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVELHNCQUFzQjtRQUNsQixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ2pFLElBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDckMsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCwyQkFBMkI7UUFDdkIsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUU7WUFDN0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztTQUN2QztJQUNMLENBQUM7SUFFRCxzQkFBc0I7UUFDbEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNwQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsS0FBSyxJQUFJLGdCQUFnQixDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLEtBQUssSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUU7WUFDN0gsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztTQUN0QztJQUNMLENBQUM7Q0FHSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEludGVycHJldGVyU3RhdGUgfSBmcm9tIFwiLi4vLi4vaW50ZXJwcmV0ZXIvSW50ZXJwcmV0ZXIuanNcIjtcclxuaW1wb3J0IHsgV29ybGRIZWxwZXIgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvV29ybGQuanNcIjtcclxuaW1wb3J0IHsgbWFrZVRhYnMgfSBmcm9tIFwiLi4vLi4vdG9vbHMvSHRtbFRvb2xzLmpzXCI7XHJcbmltcG9ydCB7IE1haW4gfSBmcm9tIFwiLi4vTWFpbi5qc1wiO1xyXG5pbXBvcnQgeyBDbGFzc0RpYWdyYW0gfSBmcm9tIFwiLi9kaWFncmFtcy9jbGFzc2RpYWdyYW0vQ2xhc3NEaWFncmFtLmpzXCI7XHJcbmltcG9ydCB7IE9iamVjdERpYWdyYW0gfSBmcm9tIFwiLi9kaWFncmFtcy9vYmplY3RkaWFncmFtL09iamVjdERpYWdyYW0uanNcIjtcclxuaW1wb3J0IHsgTWFpbkJhc2UgfSBmcm9tIFwiLi4vTWFpbkJhc2UuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBSaWdodERpdiB7XHJcblxyXG4gICAgY2xhc3NEaWFncmFtOiBDbGFzc0RpYWdyYW07XHJcbiAgICBvYmplY3REaWFncmFtOiBPYmplY3REaWFncmFtO1xyXG4gICAgaXNXaG9sZVBhZ2U6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAkdGFiczogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuICAgICRoZWFkaW5nczogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1haW46IE1haW5CYXNlLCBwdWJsaWMgJHJpZ2h0RGl2OiBKUXVlcnk8SFRNTEVsZW1lbnQ+KSB7XHJcblxyXG4gICAgICAgIHRoaXMuJHRhYnMgPSAkcmlnaHREaXYuZmluZCgnLmpvX3RhYnMnKTtcclxuICAgICAgICB0aGlzLiRoZWFkaW5ncyA9ICRyaWdodERpdi5maW5kKCcuam9fdGFiaGVhZGluZ3MnKTtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgd2l0aENsYXNzRGlhZ3JhbSA9IHRoaXMuJGhlYWRpbmdzLmZpbmQoJy5qb19jbGFzc0RpYWdyYW1UYWJIZWFkaW5nJykubGVuZ3RoID4gMDtcclxuICAgICAgICBsZXQgd2l0aE9iamVjdERpYWdyYW0gPSB0aGlzLiRoZWFkaW5ncy5maW5kKCcuam9fb2JqZWN0RGlhZ3JhbVRhYkhlYWRpbmcnKS5sZW5ndGggPiAwO1xyXG5cclxuICAgICAgICBpZih3aXRoQ2xhc3NEaWFncmFtKXtcclxuICAgICAgICAgICAgdGhpcy5jbGFzc0RpYWdyYW0gPSBuZXcgQ2xhc3NEaWFncmFtKHRoaXMuJHRhYnMuZmluZCgnLmpvX2NsYXNzZGlhZ3JhbScpLCBtYWluKTtcclxuICAgICAgICAgICAgdGhpcy4kaGVhZGluZ3MuZmluZCgnLmpvX2NsYXNzRGlhZ3JhbVRhYkhlYWRpbmcnKS5vbihcImNsaWNrXCIsICgpID0+IHsgdGhhdC5tYWluLmRyYXdDbGFzc0RpYWdyYW1zKGZhbHNlKSB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHdpdGhPYmplY3REaWFncmFtKXtcclxuICAgICAgICAgICAgdGhpcy5vYmplY3REaWFncmFtID0gbmV3IE9iamVjdERpYWdyYW0odGhpcy5tYWluLCB0aGlzLiR0YWJzLmZpbmQoJy5qb19vYmplY3RkaWFncmFtJykpO1xyXG4gICAgICAgICAgICB0aGlzLiRoZWFkaW5ncy5maW5kKCcuam9fb2JqZWN0RGlhZ3JhbVRhYkhlYWRpbmcnKS5vbihcImNsaWNrXCIsICgpID0+IHsgdGhhdC5vbk9iamVjdERpYWdyYW1FbmFibGVkKCkgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgbGV0IHJpZ2h0ZGl2X3dpZHRoOiBzdHJpbmcgPSBcIjEwMCVcIjtcclxuICAgICAgICAkcmlnaHREaXYuZmluZCgnLmpvX3dob2xlLXdpbmRvdycpLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgdGhhdC5pc1dob2xlUGFnZSA9ICF0aGF0LmlzV2hvbGVQYWdlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbGV0ICR3aG9sZVdpbmRvdyA9IGpRdWVyeSgnLmpvX3dob2xlLXdpbmRvdycpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGF0LmlzV2hvbGVQYWdlKSB7XHJcbiAgICAgICAgICAgICAgICBqUXVlcnkoJyNjb2RlJykuY3NzKCdkaXNwbGF5JywgJ2ZsZXgnKTtcclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnI3JpZ2h0ZGl2JykuY3NzKCd3aWR0aCcsIHJpZ2h0ZGl2X3dpZHRoKTtcclxuICAgICAgICAgICAgICAgIC8vIGpRdWVyeSgnI3J1bicpLmNzcygnd2lkdGgnLCAnJyk7XHJcbiAgICAgICAgICAgICAgICAkd2hvbGVXaW5kb3cucmVtb3ZlQ2xhc3MoJ2ltZ193aG9sZS13aW5kb3ctYmFjaycpO1xyXG4gICAgICAgICAgICAgICAgJHdob2xlV2luZG93LmFkZENsYXNzKCdpbWdfd2hvbGUtd2luZG93Jyk7XHJcbiAgICAgICAgICAgICAgICBqUXVlcnkoJyNjb250cm9scycpLmluc2VydEFmdGVyKGpRdWVyeSgnI3ZpZXctbW9kZScpKTtcclxuICAgICAgICAgICAgICAgICR3aG9sZVdpbmRvdy5hdHRyKCd0aXRsZScsICdBdWYgRmVuc3Rlcmdyw7bDn2UgdmVyZ3LDtsOfZXJuJyk7XHJcbiAgICAgICAgICAgICAgICBqUXVlcnkoJy5qb19ncmFwaGljcycpLnRyaWdnZXIoJ3NpemVDaGFuZ2VkJyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBqUXVlcnkoJyNjb2RlJykuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICAgICAgICAgIHJpZ2h0ZGl2X3dpZHRoID0galF1ZXJ5KCcjcmlnaHRkaXYnKS5jc3MoJ3dpZHRoJyk7XHJcbiAgICAgICAgICAgICAgICBqUXVlcnkoJyNyaWdodGRpdicpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xyXG4gICAgICAgICAgICAgICAgJHdob2xlV2luZG93LnJlbW92ZUNsYXNzKCdpbWdfd2hvbGUtd2luZG93Jyk7XHJcbiAgICAgICAgICAgICAgICAkd2hvbGVXaW5kb3cuYWRkQ2xhc3MoJ2ltZ193aG9sZS13aW5kb3ctYmFjaycpO1xyXG4gICAgICAgICAgICAgICAgLy8gdGhhdC5hZGp1c3RXaWR0aFRvV29ybGQoKTtcclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnLmpvX2NvbnRyb2wtY29udGFpbmVyJykuYXBwZW5kKGpRdWVyeSgnI2NvbnRyb2xzJykpO1xyXG4gICAgICAgICAgICAgICAgJHdob2xlV2luZG93LmF0dHIoJ3RpdGxlJywgJ0F1ZiBub3JtYWxlIEdyw7bDn2UgenVyw7xja2bDvGhyZW4nKTtcclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnLmpvX2dyYXBoaWNzJykudHJpZ2dlcignc2l6ZUNoYW5nZWQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBhZGp1c3RXaWR0aFRvV29ybGQoKSB7XHJcbiAgICAgICAgbGV0IHdvcmxkSGVscGVyOiBXb3JsZEhlbHBlciA9IHRoaXMubWFpbi5nZXRJbnRlcnByZXRlcigpLndvcmxkSGVscGVyO1xyXG4gICAgICAgIGlmICh3b3JsZEhlbHBlciAhPSBudWxsICYmIHRoaXMuaXNXaG9sZVBhZ2UpIHtcclxuICAgICAgICAgICAgbGV0IHNjcmVlbkhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIHRoaXMuJGhlYWRpbmdzLmhlaWdodCgpIC0gNjtcclxuICAgICAgICAgICAgbGV0IHNjcmVlbldpZHRoVG9IZWlnaHQgPSB3aW5kb3cuaW5uZXJXaWR0aCAvIChzY3JlZW5IZWlnaHQpO1xyXG4gICAgICAgICAgICBsZXQgd29ybGRXaWR0aFRvSGVpZ2h0ID0gd29ybGRIZWxwZXIud2lkdGggLyB3b3JsZEhlbHBlci5oZWlnaHQ7XHJcbiAgICAgICAgICAgIGlmICh3b3JsZFdpZHRoVG9IZWlnaHQgPD0gc2NyZWVuV2lkdGhUb0hlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld1dpZHRoID0gd29ybGRXaWR0aFRvSGVpZ2h0ICogc2NyZWVuSGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kdGFicy5maW5kKCcuam9fcnVuJykuY3NzKCd3aWR0aCcsIG5ld1dpZHRoICsgXCJweFwiKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHRhYnMuZmluZCgnLmpvX3J1bicpLmNzcygnaGVpZ2h0Jywgc2NyZWVuSGVpZ2h0ICsgXCJweFwiKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdIZWlnaHQgPSB3aW5kb3cuaW5uZXJXaWR0aCAvIHdvcmxkV2lkdGhUb0hlaWdodDtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHRhYnMuZmluZCgnLmpvX3J1bicpLmNzcygnd2lkdGgnLCB3aW5kb3cuaW5uZXJXaWR0aCArIFwicHhcIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiR0YWJzLmZpbmQoJy5qb19ydW4nKS5jc3MoJ2hlaWdodCcsIG5ld0hlaWdodCArIFwicHhcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGluaXRHVUkoKSB7XHJcbiAgICAgICAgbWFrZVRhYnModGhpcy4kcmlnaHREaXYpO1xyXG4gICAgfVxyXG5cclxuICAgIGlzQ2xhc3NEaWFncmFtRW5hYmxlZCgpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgaGVhZGluZyA9IHRoaXMuJGhlYWRpbmdzLmZpbmQoJy5qb19jbGFzc0RpYWdyYW1UYWJIZWFkaW5nJyk7XHJcbiAgICAgICAgaWYoaGVhZGluZy5sZW5ndGggPT0gMCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIHJldHVybiBoZWFkaW5nLmhhc0NsYXNzKFwiam9fYWN0aXZlXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlzT2JqZWN0RGlhZ3JhbUVuYWJsZWQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IGhlYWRpbmcgPSB0aGlzLiRoZWFkaW5ncy5maW5kKCcuam9fb2JqZWN0RGlhZ3JhbVRhYkhlYWRpbmcnKTtcclxuICAgICAgICBpZihoZWFkaW5nLmxlbmd0aCA9PSAwKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIGhlYWRpbmcuaGFzQ2xhc3MoXCJqb19hY3RpdmVcIik7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlT2JqZWN0RGlhZ3JhbVNldHRpbmdzKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmlzT2JqZWN0RGlhZ3JhbUVuYWJsZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5vYmplY3REaWFncmFtLnVwZGF0ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG9uT2JqZWN0RGlhZ3JhbUVuYWJsZWQoKSB7XHJcbiAgICAgICAgdGhpcy5vYmplY3REaWFncmFtLnVwZGF0ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgaWYgKHRoaXMubWFpbi5nZXRJbnRlcnByZXRlcigpLnN0YXRlID09IEludGVycHJldGVyU3RhdGUucGF1c2VkIHx8IHRoaXMubWFpbi5nZXRJbnRlcnByZXRlcigpLnN0YXRlID09IEludGVycHJldGVyU3RhdGUucnVubmluZykge1xyXG4gICAgICAgICAgICB0aGlzLm9iamVjdERpYWdyYW0udXBkYXRlRGlhZ3JhbSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG59Il19