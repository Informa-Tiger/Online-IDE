export class DistributeToStudentsDialog {
    constructor(classes, workspace, main) {
        this.classes = classes;
        this.workspace = workspace;
        this.main = main;
        this.studentCount = 0;
        this.init();
    }
    init() {
        this.$dialog = jQuery('#dialog');
        jQuery('#main').css('visibility', 'hidden');
        this.$dialog.append(jQuery(`<div class="jo_ds_heading">Austeilen eines Workspace an einzelne Schüler/innen</div>
             <div class="jo_ds_settings">
                <div class="jo_ds_settings_caption">Workspace:</div><div class="jo_ds_workspacename">${this.workspace.name}</div>
                <div class="jo_ds_settings_caption">Liste filtern:</div><div class="jo_ds_filterdiv"><input class="dialog-input"></input></div>
             </div>
             <div class="jo_ds_student_list jo_scrollable">
             </div>
             <div class="jo_ds_selected_message"></div>
             <div class="dialog-buttonRow jo_ds_buttonRow">
                <button id="jo_ds_cancel_button">Abbrechen</button>
                <button id="jo_ds_distribute_button">Austeilen</button>
             </div>
            `));
        let $studentList = jQuery('.jo_ds_student_list');
        let that = this;
        for (let klass of this.classes) {
            for (let student of klass.students) {
                let $studentLine = jQuery('<div class="jo_ds_student_line">');
                let $studentClass = jQuery(`<div class="jo_ds_student_class">${klass.name}</div>`);
                let $studentName = jQuery(`<div class="jo_ds_student_name">${student.rufname} ${student.familienname}</div>`);
                $studentLine.append($studentClass, $studentName);
                $studentList.append($studentLine);
                $studentLine.on('mousedown', () => {
                    $studentLine.toggleClass('jo_active');
                    that.studentCount += $studentLine.hasClass('jo_active') ? 1 : -1;
                    jQuery('.jo_ds_selected_message').text(`${that.studentCount} Schüler/inn/en selektiert`);
                });
                $studentLine.data('student', student);
                $studentLine.data('klass', klass);
            }
        }
        jQuery('.jo_ds_filterdiv>input').on('input', () => {
            let filterText = jQuery('.jo_ds_filterdiv>input').val();
            if (filterText == null || filterText == "") {
                $('.jo_ds_student_line').show();
            }
            else {
                $('.jo_ds_student_line').each((index, element) => {
                    let $element = jQuery(element);
                    let klass = $element.data('klass');
                    let student = $element.data('student');
                    let text = klass.name + " " + student.rufname + " " + student.familienname;
                    if (text.indexOf(filterText) >= 0) {
                        $element.show();
                    }
                    else {
                        $element.hide();
                    }
                });
            }
        });
        this.$dialogMain = this.$dialog.find('.dialog-main');
        this.$dialog.css('visibility', 'visible');
        jQuery('#jo_ds_cancel_button').on('click', () => { window.history.back(); });
        jQuery('#jo_ds_distribute_button').on('click', () => { that.distributeWorkspace(); });
        this.main.windowStateManager.registerOneTimeBackButtonListener(() => {
            that.close();
        });
    }
    distributeWorkspace() {
        let student_ids = [];
        $('.jo_ds_student_line').each((index, element) => {
            let $element = jQuery(element);
            if ($element.hasClass('jo_active')) {
                let student = $element.data('student');
                student_ids.push(student.id);
            }
        });
        window.history.back();
        this.main.networkManager.sendDistributeWorkspace(this.workspace, null, student_ids, (error) => {
            if (error == null) {
                let networkManager = this.main.networkManager;
                let dt = networkManager.updateFrequencyInSeconds;
                alert(`Der Workspace ${this.workspace.name} wurde an ${student_ids.length} Schüler/innen ausgeteilt. Er wird in maximal ${dt} s bei jedem Schüler ankommen.`);
            }
            else {
                alert(error);
            }
        });
    }
    close() {
        this.$dialog.css('visibility', 'hidden');
        this.$dialog.empty();
        jQuery('#main').css('visibility', 'visible');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGlzdHJpYnV0ZVRvU3R1ZGVudHNEaWFsb2cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L21haW4vZ3VpL0Rpc3RyaWJ1dGVUb1N0dWRlbnRzRGlhbG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLE1BQU0sT0FBTywwQkFBMEI7SUFNbkMsWUFBb0IsT0FBb0IsRUFBVSxTQUFvQixFQUFVLElBQVU7UUFBdEUsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUFVLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFBVSxTQUFJLEdBQUosSUFBSSxDQUFNO1FBRjFGLGlCQUFZLEdBQVcsQ0FBQyxDQUFDO1FBR3JCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNoQixDQUFDO0lBRU8sSUFBSTtRQUNSLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FDdEI7O3VHQUUyRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUk7Ozs7Ozs7Ozs7YUFVN0csQ0FDSixDQUFDLENBQUM7UUFFSCxJQUFJLFlBQVksR0FBRyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNqRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFFaEIsS0FBSSxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFDO1lBQzFCLEtBQUksSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBQztnQkFDOUIsSUFBSSxZQUFZLEdBQUcsTUFBTSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7Z0JBQzlELElBQUksYUFBYSxHQUFHLE1BQU0sQ0FBQyxvQ0FBb0MsS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUM7Z0JB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LENBQUM7UUFDekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNyQixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNqRCxDQUFDO0NBR0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDbGFzc0RhdGEsIFVzZXJEYXRhIH0gZnJvbSBcIi4uLy4uL2NvbW11bmljYXRpb24vRGF0YS5qc1wiO1xyXG5pbXBvcnQgeyBXb3Jrc3BhY2UgfSBmcm9tIFwiLi4vLi4vd29ya3NwYWNlL1dvcmtzcGFjZS5qc1wiO1xyXG5pbXBvcnQgeyBNYWluIH0gZnJvbSBcIi4uL01haW4uanNcIjtcclxuaW1wb3J0IHsgaXNFbXB0eU9iamVjdCB9IGZyb20gXCJqcXVlcnlcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBEaXN0cmlidXRlVG9TdHVkZW50c0RpYWxvZyB7XHJcblxyXG4gICAgJGRpYWxvZzogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuICAgICRkaWFsb2dNYWluOiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG4gICAgc3R1ZGVudENvdW50OiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgY2xhc3NlczogQ2xhc3NEYXRhW10sIHByaXZhdGUgd29ya3NwYWNlOiBXb3Jrc3BhY2UsIHByaXZhdGUgbWFpbjogTWFpbil7XHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpbml0KCkge1xyXG4gICAgICAgIHRoaXMuJGRpYWxvZyA9IGpRdWVyeSgnI2RpYWxvZycpO1xyXG4gICAgICAgIGpRdWVyeSgnI21haW4nKS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XHJcbiAgICAgICAgdGhpcy4kZGlhbG9nLmFwcGVuZChqUXVlcnkoXHJcbiAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwiam9fZHNfaGVhZGluZ1wiPkF1c3RlaWxlbiBlaW5lcyBXb3Jrc3BhY2UgYW4gZWluemVsbmUgU2Now7xsZXIvaW5uZW48L2Rpdj5cclxuICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb19kc19zZXR0aW5nc1wiPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImpvX2RzX3NldHRpbmdzX2NhcHRpb25cIj5Xb3Jrc3BhY2U6PC9kaXY+PGRpdiBjbGFzcz1cImpvX2RzX3dvcmtzcGFjZW5hbWVcIj4ke3RoaXMud29ya3NwYWNlLm5hbWV9PC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9fZHNfc2V0dGluZ3NfY2FwdGlvblwiPkxpc3RlIGZpbHRlcm46PC9kaXY+PGRpdiBjbGFzcz1cImpvX2RzX2ZpbHRlcmRpdlwiPjxpbnB1dCBjbGFzcz1cImRpYWxvZy1pbnB1dFwiPjwvaW5wdXQ+PC9kaXY+XHJcbiAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJqb19kc19zdHVkZW50X2xpc3Qgam9fc2Nyb2xsYWJsZVwiPlxyXG4gICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiam9fZHNfc2VsZWN0ZWRfbWVzc2FnZVwiPjwvZGl2PlxyXG4gICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRpYWxvZy1idXR0b25Sb3cgam9fZHNfYnV0dG9uUm93XCI+XHJcbiAgICAgICAgICAgICAgICA8YnV0dG9uIGlkPVwiam9fZHNfY2FuY2VsX2J1dHRvblwiPkFiYnJlY2hlbjwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBpZD1cImpvX2RzX2Rpc3RyaWJ1dGVfYnV0dG9uXCI+QXVzdGVpbGVuPC9idXR0b24+XHJcbiAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgYFxyXG4gICAgICAgICkpO1xyXG5cclxuICAgICAgICBsZXQgJHN0dWRlbnRMaXN0ID0galF1ZXJ5KCcuam9fZHNfc3R1ZGVudF9saXN0Jyk7XHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICBmb3IobGV0IGtsYXNzIG9mIHRoaXMuY2xhc3Nlcyl7XHJcbiAgICAgICAgICAgIGZvcihsZXQgc3R1ZGVudCBvZiBrbGFzcy5zdHVkZW50cyl7XHJcbiAgICAgICAgICAgICAgICBsZXQgJHN0dWRlbnRMaW5lID0galF1ZXJ5KCc8ZGl2IGNsYXNzPVwiam9fZHNfc3R1ZGVudF9saW5lXCI+Jyk7XHJcbiAgICAgICAgICAgICAgICBsZXQgJHN0dWRlbnRDbGFzcyA9IGpRdWVyeShgPGRpdiBjbGFzcz1cImpvX2RzX3N0dWRlbnRfY2xhc3NcIj4ke2tsYXNzLm5hbWV9PC9kaXY+YCk7ICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgbGV0ICRzdHVkZW50TmFtZSA9IGpRdWVyeShgPGRpdiBjbGFzcz1cImpvX2RzX3N0dWRlbnRfbmFtZVwiPiR7c3R1ZGVudC5ydWZuYW1lfSAke3N0dWRlbnQuZmFtaWxpZW5uYW1lfTwvZGl2PmApO1xyXG4gICAgICAgICAgICAgICAgJHN0dWRlbnRMaW5lLmFwcGVuZCgkc3R1ZGVudENsYXNzLCAkc3R1ZGVudE5hbWUpO1xyXG4gICAgICAgICAgICAgICAgJHN0dWRlbnRMaXN0LmFwcGVuZCgkc3R1ZGVudExpbmUpO1xyXG4gICAgICAgICAgICAgICAgJHN0dWRlbnRMaW5lLm9uKCdtb3VzZWRvd24nLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHN0dWRlbnRMaW5lLnRvZ2dsZUNsYXNzKCdqb19hY3RpdmUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgdGhhdC5zdHVkZW50Q291bnQgKz0gJHN0dWRlbnRMaW5lLmhhc0NsYXNzKCdqb19hY3RpdmUnKSA/IDEgOiAtMTtcclxuICAgICAgICAgICAgICAgICAgICAgalF1ZXJ5KCcuam9fZHNfc2VsZWN0ZWRfbWVzc2FnZScpLnRleHQoYCR7dGhhdC5zdHVkZW50Q291bnR9IFNjaMO8bGVyL2lubi9lbiBzZWxla3RpZXJ0YCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICRzdHVkZW50TGluZS5kYXRhKCdzdHVkZW50Jywgc3R1ZGVudCk7XHJcbiAgICAgICAgICAgICAgICAkc3R1ZGVudExpbmUuZGF0YSgna2xhc3MnLCBrbGFzcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGpRdWVyeSgnLmpvX2RzX2ZpbHRlcmRpdj5pbnB1dCcpLm9uKCdpbnB1dCcsICgpID0+IHtcclxuICAgICAgICAgICAgbGV0IGZpbHRlclRleHQgPSA8c3RyaW5nPmpRdWVyeSgnLmpvX2RzX2ZpbHRlcmRpdj5pbnB1dCcpLnZhbCgpO1xyXG4gICAgICAgICAgICBpZihmaWx0ZXJUZXh0ID09IG51bGwgfHwgZmlsdGVyVGV4dCA9PSBcIlwiKXtcclxuICAgICAgICAgICAgICAgICQoJy5qb19kc19zdHVkZW50X2xpbmUnKS5zaG93KCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAkKCcuam9fZHNfc3R1ZGVudF9saW5lJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgJGVsZW1lbnQgPSBqUXVlcnkoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGtsYXNzOkNsYXNzRGF0YSA9ICRlbGVtZW50LmRhdGEoJ2tsYXNzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0dWRlbnQ6IFVzZXJEYXRhID0gJGVsZW1lbnQuZGF0YSgnc3R1ZGVudCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0ZXh0ID0ga2xhc3MubmFtZSArIFwiIFwiICsgc3R1ZGVudC5ydWZuYW1lICsgXCIgXCIgKyBzdHVkZW50LmZhbWlsaWVubmFtZTtcclxuICAgICAgICAgICAgICAgICAgICBpZih0ZXh0LmluZGV4T2YoZmlsdGVyVGV4dCkgPj0gMCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LnNob3coKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5oaWRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy4kZGlhbG9nTWFpbiA9IHRoaXMuJGRpYWxvZy5maW5kKCcuZGlhbG9nLW1haW4nKTtcclxuICAgICAgICB0aGlzLiRkaWFsb2cuY3NzKCd2aXNpYmlsaXR5JywgJ3Zpc2libGUnKTtcclxuXHJcbiAgICAgICAgalF1ZXJ5KCcjam9fZHNfY2FuY2VsX2J1dHRvbicpLm9uKCdjbGljaycsICgpID0+IHsgd2luZG93Lmhpc3RvcnkuYmFjaygpOyB9KTtcclxuICAgICAgICBqUXVlcnkoJyNqb19kc19kaXN0cmlidXRlX2J1dHRvbicpLm9uKCdjbGljaycsICgpID0+IHt0aGF0LmRpc3RyaWJ1dGVXb3Jrc3BhY2UoKTt9KTtcclxuXHJcbiAgICAgICAgdGhpcy5tYWluLndpbmRvd1N0YXRlTWFuYWdlci5yZWdpc3Rlck9uZVRpbWVCYWNrQnV0dG9uTGlzdGVuZXIoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGF0LmNsb3NlKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGRpc3RyaWJ1dGVXb3Jrc3BhY2UoKSB7XHJcblxyXG4gICAgICAgIGxldCBzdHVkZW50X2lkczogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICAkKCcuam9fZHNfc3R1ZGVudF9saW5lJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgbGV0ICRlbGVtZW50ID0galF1ZXJ5KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICBpZigkZWxlbWVudC5oYXNDbGFzcygnam9fYWN0aXZlJykpe1xyXG4gICAgICAgICAgICAgICAgbGV0IHN0dWRlbnQ6IFVzZXJEYXRhID0gJGVsZW1lbnQuZGF0YSgnc3R1ZGVudCcpO1xyXG4gICAgICAgICAgICAgICAgc3R1ZGVudF9pZHMucHVzaChzdHVkZW50LmlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB3aW5kb3cuaGlzdG9yeS5iYWNrKCk7XHJcblxyXG4gICAgICAgIHRoaXMubWFpbi5uZXR3b3JrTWFuYWdlci5zZW5kRGlzdHJpYnV0ZVdvcmtzcGFjZSh0aGlzLndvcmtzcGFjZSwgbnVsbCwgc3R1ZGVudF9pZHMsIChlcnJvcjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV0d29ya01hbmFnZXIgPSB0aGlzLm1haW4ubmV0d29ya01hbmFnZXI7XHJcbiAgICAgICAgICAgICAgICBsZXQgZHQgPSBuZXR3b3JrTWFuYWdlci51cGRhdGVGcmVxdWVuY3lJblNlY29uZHM7XHJcbiAgICAgICAgICAgICAgICBhbGVydChgRGVyIFdvcmtzcGFjZSAke3RoaXMud29ya3NwYWNlLm5hbWV9IHd1cmRlIGFuICR7c3R1ZGVudF9pZHMubGVuZ3RofSBTY2jDvGxlci9pbm5lbiBhdXNnZXRlaWx0LiBFciB3aXJkIGluIG1heGltYWwgJHtkdH0gcyBiZWkgamVkZW0gU2Now7xsZXIgYW5rb21tZW4uYCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBhbGVydChlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIHRoaXMuJGRpYWxvZy5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XHJcbiAgICAgICAgdGhpcy4kZGlhbG9nLmVtcHR5KCk7XHJcbiAgICAgICAgalF1ZXJ5KCcjbWFpbicpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XHJcbiAgICB9XHJcblxyXG5cclxufSJdfQ==