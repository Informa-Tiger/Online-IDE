import { Main } from "../Main.js";
export class Helper {
    static openHelper(text, targetElement, direction) {
        let $helper = jQuery('.jo_arrow_box');
        $helper.removeClass(['jo_arrow_box_left', 'jo_arrow_box_right', 'jo_arrow_box_top', 'jo_arrow_box_bottom']);
        $helper.addClass('jo_arrow_box_' + direction);
        $helper.css({ left: '', right: '', top: '', bottom: '' });
        let to = targetElement.offset();
        let b = jQuery('body');
        let delta = 34;
        switch (direction) {
            case "bottom":
                $helper.css({
                    left: to.left + targetElement.width() / 2 - delta,
                    bottom: b.height() - to.top + delta
                });
                break;
            case "top":
                $helper.css({
                    left: to.left + targetElement.width() / 2 - delta,
                    top: to.top + targetElement.height() + 26
                });
                break;
            case "left":
                $helper.css({
                    left: to.left + targetElement.width() + delta,
                    top: to.top + targetElement.height() / 2 - delta
                });
                break;
            case "right":
                $helper.css({
                    right: b.width() - to.left,
                    top: to.top + targetElement.height() / 2 - delta
                });
                break;
        }
        $helper.find('span').html(text);
        let $button = $helper.find('.jo_button');
        $button.on('click', (e) => {
            e.stopPropagation();
            $button.off('click');
            Helper.close();
        });
        $helper.fadeIn(800);
    }
    static close() {
        let $helper = jQuery('.jo_arrow_box');
        $helper.fadeOut(800);
    }
    static showHelper(id, mainBase, $element) {
        let main;
        if (mainBase instanceof Main) {
            main = mainBase;
        }
        else {
            return;
        }
        let helperHistory = main.user.settings.helperHistory;
        if (id == "speedControlHelper" && helperHistory["speedControlHelperDone"]) {
            id = "stepButtonHelper";
        }
        let flag = id + "Done";
        if (helperHistory != null && (helperHistory[flag] == null || !helperHistory[flag])) {
            helperHistory[flag] = true;
            main.networkManager.sendUpdateUserSettings(() => { });
            let text = "";
            let direction = "left";
            switch (id) {
                case "folderButton":
                    text = `Mit diesem Button können Sie in der Liste der Workspaces Ordner anlegen. 
                    <ul>
                    <li>Bestehende Workspaces lassen sich mit der Maus in Ordner ziehen.</li>
                    <li>Wollen Sie einen Workspace in die oberste Ordnerebene bringen, so ziehen Sie ihn einfach auf den "Workspaces"-Balken.</li>
                    <li>Über das Kontextmenü der Ordner lassen sich Workspaces und Unterordner anlegen.</li>
                    </ul>`,
                        direction = "top";
                    break;
                case "repositoryButton":
                    text = `Wenn der aktuelle Workspace mit einem Repository verknüft ist, erscheint hier der "Synchronisieren-Button". Ein Klick darauf öffnet einen Dialog, in dem die Dateien des Workspace mit denen des Repositorys abgeglichen werden können.`;
                    direction = "top";
                    break;
                case "speedControlHelper":
                    text = `Mit dem Geschwindigkeitsregler können  
                            Sie einstellen, wie schnell das Programm abläuft. 
                            Bei Geschwindigkeiten bis 10 Steps/s wird 
                            während des Programmablaufs der Programzeiger gezeigt
                            und die Anzeige der Variablen auf der linken 
                            Seite stets aktualisiert.`;
                    direction = "top";
                    $element = main.interpreter.controlButtons.speedControl.$grip;
                    break;
                case "newFileHelper":
                    text = `Es gibt noch keine Programmdatei im Workspace. <br> Nutzen Sie den Button 
                        <span class='img_add-file-dark jo_inline-image'></span> um eine Programmdatei anzulegen.
                        `;
                    direction = "left";
                    break;
                case "newWorkspaceHelper":
                    text = `Es gibt noch keinen Workspace. <br> Nutzen Sie den Button
                        <span class='img_add-workspace-dark jo_inline-image'></span> um einen Workspace anzulegen.
                        `;
                    direction = "left";
                    break;
                case "homeButtonHelper":
                    text = "Mit dem Home-Button <span class='img_home-dark jo_inline-image'></span> können Sie wieder zu Ihren eigenen Workspaces wechseln.";
                    direction = "top";
                    $element = jQuery('.img_home-dark');
                    break;
                case "stepButtonHelper":
                    text = `Mit den Buttons "Step over"
                        (<span class='img_step-over-dark jo_inline-image'></span>, Taste F8), 
                        "Step into" 
                        (<span class='img_step-into-dark jo_inline-image'></span>, Taste F7) und 
                        "Step out" 
                        (<span class='img_step-out-dark jo_inline-image'></span>, Taste F9)  
                        können Sie das Programm schrittweise ausführen und sich nach jedem Schritt die Belegung der Variablen ansehen. <br>
                        <ul><li><span class='img_step-over-dark jo_inline-image'></span> Step over führt den nächsten Schritt aus, insbesondere werden Methodenaufrufe in einem Schritt durchgeführt.</li>
                        <li><span class='img_step-into-dark jo_inline-image'></span> Step into führt auch den nächsten Schritt aus, geht bei Methodenaufrufen aber in die Methode hinein und führt auch die Anweisungen innerhalb der Methode schrittweise aus.</li>
                        <li><span class='img_step-out-dark jo_inline-image'></span> Befindet sich die Programmausführung innerhalb einer Methode, so bewirkt ein Klick auf Step out, dass der Rest der Methode ausgeführt wird und die Programmausführung erst nach der Aufrufstelle der Methode anhält.</li>
                        </ul>
                        `;
                    direction = "top";
                    $element = main.interpreter.controlButtons.$buttonStepOver;
                    break;
                case "consoleHelper":
                    text = `
                        Hier können Sie Anweisungen oder Terme eingeben, die nach Bestätigung mit der Enter-Taste ausgeführt/ausgewertet werden. Das Ergebnis sehen Sie im Bereich über der Eingabezeile. <br>
                        Falls das Programm gerade pausiert (z.B. bei Ausführung in Einzelschritten) können Sie auch auf die Variablen des aktuellen Sichtbarkeitsbereiches zugreifen.
                    `;
                    direction = "bottom";
                    $element = main.bottomDiv.console.$consoleTab.find('.jo_monaco-editor');
            }
            if (text != "" && $element != null && $element.length > 0) {
                Helper.openHelper(text, $element, direction);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9IZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFlBQVksQ0FBQztBQUtsQyxNQUFNLE9BQU8sTUFBTTtJQUVSLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBWSxFQUFFLGFBQWtDLEVBQUUsU0FBMEI7UUFFakcsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3RDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFFNUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFFOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRTFELElBQUksRUFBRSxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNoQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFdkIsSUFBSSxLQUFLLEdBQVcsRUFBRSxDQUFDO1FBRXZCLFFBQVEsU0FBUyxFQUFFO1lBQ2YsS0FBSyxRQUFRO2dCQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUM7b0JBQ3ZCLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsS0FBSztvQkFDakQsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEtBQUs7aUJBQ3RDLENBQUMsQ0FBQztnQkFDQyxN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QUFJLElBQUksRUFBRSxJQUFJLFFBQVEsSUFBSSxJQUFJLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3ZELE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQzthQUNoRDtTQUVKO0lBRUwsQ0FBQztDQUlKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTWFpbiB9IGZyb20gXCIuLi9NYWluLmpzXCI7XHJcbmltcG9ydCB7IE1haW5CYXNlIH0gZnJvbSBcIi4uL01haW5CYXNlLmpzXCI7XHJcblxyXG5leHBvcnQgdHlwZSBIZWxwZXJEaXJlY3Rpb24gPSBcInRvcFwiIHwgXCJib3R0b21cIiB8IFwibGVmdFwiIHwgXCJyaWdodFwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEhlbHBlciB7XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBvcGVuSGVscGVyKHRleHQ6IHN0cmluZywgdGFyZ2V0RWxlbWVudDogSlF1ZXJ5PEhUTUxFbGVtZW50PiwgZGlyZWN0aW9uOiBIZWxwZXJEaXJlY3Rpb24pIHtcclxuXHJcbiAgICAgICAgbGV0ICRoZWxwZXIgPSBqUXVlcnkoJy5qb19hcnJvd19ib3gnKTsgXHJcbiAgICAgICAgJGhlbHBlci5yZW1vdmVDbGFzcyhbJ2pvX2Fycm93X2JveF9sZWZ0JywgJ2pvX2Fycm93X2JveF9yaWdodCcsICdqb19hcnJvd19ib3hfdG9wJywgJ2pvX2Fycm93X2JveF9ib3R0b20nXSk7XHJcblxyXG4gICAgICAgICRoZWxwZXIuYWRkQ2xhc3MoJ2pvX2Fycm93X2JveF8nICsgZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgJGhlbHBlci5jc3MoeyBsZWZ0OiAnJywgcmlnaHQ6ICcnLCB0b3A6ICcnLCBib3R0b206ICcnIH0pO1xyXG5cclxuICAgICAgICBsZXQgdG8gPSB0YXJnZXRFbGVtZW50Lm9mZnNldCgpO1xyXG4gICAgICAgIGxldCBiID0galF1ZXJ5KCdib2R5Jyk7XHJcblxyXG4gICAgICAgIGxldCBkZWx0YTogbnVtYmVyID0gMzQ7XHJcblxyXG4gICAgICAgIHN3aXRjaCAoZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJib3R0b21cIjogJGhlbHBlci5jc3Moe1xyXG4gICAgICAgICAgICAgICAgbGVmdDogdG8ubGVmdCArIHRhcmdldEVsZW1lbnQud2lkdGgoKSAvIDIgLSBkZWx0YSxcclxuICAgICAgICAgICAgICAgIGJvdHRvbTogYi5oZWlnaHQoKSAtIHRvLnRvcCArIGRlbHRhXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJ0b3BcIjogJGhlbHBlci5jc3Moe1xyXG4gICAgICAgICAgICAgICAgbGVmdDogdG8ubGVmdCArIHRhcmdldEVsZW1lbnQud2lkdGgoKSAvIDIgLSBkZWx0YSxcclxuICAgICAgICAgICAgICAgIHRvcDogdG8udG9wICsgdGFyZ2V0RWxlbWVudC5oZWlnaHQoKSArIDI2XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJsZWZ0XCI6ICRoZWxwZXIuY3NzKHtcclxuICAgICAgICAgICAgICAgIGxlZnQ6IHRvLmxlZnQgKyB0YXJnZXRFbGVtZW50LndpZHRoKCkgKyBkZWx0YSxcclxuICAgICAgICAgICAgICAgIHRvcDogdG8udG9wICsgdGFyZ2V0RWxlbWVudC5oZWlnaHQoKSAvIDIgLSBkZWx0YVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwicmlnaHRcIjogJGhlbHBlci5jc3Moe1xyXG4gICAgICAgICAgICAgICAgcmlnaHQ6IGIud2lkdGgoKSAtIHRvLmxlZnQsXHJcbiAgICAgICAgICAgICAgICB0b3A6IHRvLnRvcCArIHRhcmdldEVsZW1lbnQuaGVpZ2h0KCkgLyAyIC0gZGVsdGFcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRoZWxwZXIuZmluZCgnc3BhbicpLmh0bWwodGV4dCk7XHJcblxyXG4gICAgICAgIGxldCAkYnV0dG9uID0gJGhlbHBlci5maW5kKCcuam9fYnV0dG9uJyk7XHJcbiAgICAgICAgJGJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAkYnV0dG9uLm9mZignY2xpY2snKTtcclxuICAgICAgICAgICAgSGVscGVyLmNsb3NlKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRoZWxwZXIuZmFkZUluKDgwMCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBjbG9zZSgpIHtcclxuICAgICAgICBsZXQgJGhlbHBlciA9IGpRdWVyeSgnLmpvX2Fycm93X2JveCcpO1xyXG4gICAgICAgICRoZWxwZXIuZmFkZU91dCg4MDApO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBzdGF0aWMgc2hvd0hlbHBlcihpZDogc3RyaW5nLCBtYWluQmFzZTogTWFpbkJhc2UsICRlbGVtZW50PzogSlF1ZXJ5PEhUTUxFbGVtZW50Pikge1xyXG5cclxuICAgICAgICBsZXQgbWFpbjogTWFpbjtcclxuICAgICAgICBpZihtYWluQmFzZSBpbnN0YW5jZW9mIE1haW4pe1xyXG4gICAgICAgICAgICBtYWluID0gbWFpbkJhc2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGhlbHBlckhpc3RvcnkgPSBtYWluLnVzZXIuc2V0dGluZ3MhLmhlbHBlckhpc3Rvcnk7XHJcblxyXG4gICAgICAgIGlmIChpZCA9PSBcInNwZWVkQ29udHJvbEhlbHBlclwiICYmIGhlbHBlckhpc3RvcnlbXCJzcGVlZENvbnRyb2xIZWxwZXJEb25lXCJdKSB7XHJcbiAgICAgICAgICAgIGlkID0gXCJzdGVwQnV0dG9uSGVscGVyXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZmxhZyA9IGlkICsgXCJEb25lXCI7XHJcblxyXG4gICAgICAgIGlmIChoZWxwZXJIaXN0b3J5ICE9IG51bGwgJiYgKGhlbHBlckhpc3RvcnlbZmxhZ10gPT0gbnVsbCB8fCAhaGVscGVySGlzdG9yeVtmbGFnXSkpIHtcclxuICAgICAgICAgICAgaGVscGVySGlzdG9yeVtmbGFnXSA9IHRydWU7XHJcbiAgICAgICAgICAgIG1haW4ubmV0d29ya01hbmFnZXIuc2VuZFVwZGF0ZVVzZXJTZXR0aW5ncygoKSA9PiB7IH0pO1xyXG5cclxuICAgICAgICAgICAgbGV0IHRleHQ6IHN0cmluZyA9IFwiXCI7XHJcbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEhlbHBlckRpcmVjdGlvbiA9IFwibGVmdFwiO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChpZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImZvbGRlckJ1dHRvblwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQgPSBgTWl0IGRpZXNlbSBCdXR0b24ga8O2bm5lbiBTaWUgaW4gZGVyIExpc3RlIGRlciBXb3Jrc3BhY2VzIE9yZG5lciBhbmxlZ2VuLiBcclxuICAgICAgICAgICAgICAgICAgICA8dWw+XHJcbiAgICAgICAgICAgICAgICAgICAgPGxpPkJlc3RlaGVuZGUgV29ya3NwYWNlcyBsYXNzZW4gc2ljaCBtaXQgZGVyIE1hdXMgaW4gT3JkbmVyIHppZWhlbi48L2xpPlxyXG4gICAgICAgICAgICAgICAgICAgIDxsaT5Xb2xsZW4gU2llIGVpbmVuIFdvcmtzcGFjZSBpbiBkaWUgb2JlcnN0ZSBPcmRuZXJlYmVuZSBicmluZ2VuLCBzbyB6aWVoZW4gU2llIGlobiBlaW5mYWNoIGF1ZiBkZW4gXCJXb3Jrc3BhY2VzXCItQmFsa2VuLjwvbGk+XHJcbiAgICAgICAgICAgICAgICAgICAgPGxpPsOcYmVyIGRhcyBLb250ZXh0bWVuw7wgZGVyIE9yZG5lciBsYXNzZW4gc2ljaCBXb3Jrc3BhY2VzIHVuZCBVbnRlcm9yZG5lciBhbmxlZ2VuLjwvbGk+XHJcbiAgICAgICAgICAgICAgICAgICAgPC91bD5gLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IFwidG9wXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicmVwb3NpdG9yeUJ1dHRvblwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQgPSBgV2VubiBkZXIgYWt0dWVsbGUgV29ya3NwYWNlIG1pdCBlaW5lbSBSZXBvc2l0b3J5IHZlcmtuw7xmdCBpc3QsIGVyc2NoZWludCBoaWVyIGRlciBcIlN5bmNocm9uaXNpZXJlbi1CdXR0b25cIi4gRWluIEtsaWNrIGRhcmF1ZiDDtmZmbmV0IGVpbmVuIERpYWxvZywgaW4gZGVtIGRpZSBEYXRlaWVuIGRlcyBXb3Jrc3BhY2UgbWl0IGRlbmVuIGRlcyBSZXBvc2l0b3J5cyBhYmdlZ2xpY2hlbiB3ZXJkZW4ga8O2bm5lbi5gO1xyXG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IFwidG9wXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwic3BlZWRDb250cm9sSGVscGVyXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dCA9IGBNaXQgZGVtIEdlc2Nod2luZGlna2VpdHNyZWdsZXIga8O2bm5lbiAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBTaWUgZWluc3RlbGxlbiwgd2llIHNjaG5lbGwgZGFzIFByb2dyYW1tIGFibMOkdWZ0LiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEJlaSBHZXNjaHdpbmRpZ2tlaXRlbiBiaXMgMTAgU3RlcHMvcyB3aXJkIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd8OkaHJlbmQgZGVzIFByb2dyYW1tYWJsYXVmcyBkZXIgUHJvZ3JhbXplaWdlciBnZXplaWd0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmQgZGllIEFuemVpZ2UgZGVyIFZhcmlhYmxlbiBhdWYgZGVyIGxpbmtlbiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNlaXRlIHN0ZXRzIGFrdHVhbGlzaWVydC5gO1xyXG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IFwidG9wXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQgPSBtYWluLmludGVycHJldGVyLmNvbnRyb2xCdXR0b25zLnNwZWVkQ29udHJvbC4kZ3JpcDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJuZXdGaWxlSGVscGVyXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dCA9IGBFcyBnaWJ0IG5vY2gga2VpbmUgUHJvZ3JhbW1kYXRlaSBpbSBXb3Jrc3BhY2UuIDxicj4gTnV0emVuIFNpZSBkZW4gQnV0dG9uIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz0naW1nX2FkZC1maWxlLWRhcmsgam9faW5saW5lLWltYWdlJz48L3NwYW4+IHVtIGVpbmUgUHJvZ3JhbW1kYXRlaSBhbnp1bGVnZW4uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGA7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gXCJsZWZ0XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwibmV3V29ya3NwYWNlSGVscGVyXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dCA9IGBFcyBnaWJ0IG5vY2gga2VpbmVuIFdvcmtzcGFjZS4gPGJyPiBOdXR6ZW4gU2llIGRlbiBCdXR0b25cclxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9J2ltZ19hZGQtd29ya3NwYWNlLWRhcmsgam9faW5saW5lLWltYWdlJz48L3NwYW4+IHVtIGVpbmVuIFdvcmtzcGFjZSBhbnp1bGVnZW4uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGA7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gXCJsZWZ0XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiaG9tZUJ1dHRvbkhlbHBlclwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQgPSBcIk1pdCBkZW0gSG9tZS1CdXR0b24gPHNwYW4gY2xhc3M9J2ltZ19ob21lLWRhcmsgam9faW5saW5lLWltYWdlJz48L3NwYW4+IGvDtm5uZW4gU2llIHdpZWRlciB6dSBJaHJlbiBlaWdlbmVuIFdvcmtzcGFjZXMgd2VjaHNlbG4uXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gXCJ0b3BcIjtcclxuICAgICAgICAgICAgICAgICAgICAkZWxlbWVudCA9IGpRdWVyeSgnLmltZ19ob21lLWRhcmsnKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJzdGVwQnV0dG9uSGVscGVyXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dCA9IGBNaXQgZGVuIEJ1dHRvbnMgXCJTdGVwIG92ZXJcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPHNwYW4gY2xhc3M9J2ltZ19zdGVwLW92ZXItZGFyayBqb19pbmxpbmUtaW1hZ2UnPjwvc3Bhbj4sIFRhc3RlIEY4KSwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiU3RlcCBpbnRvXCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8c3BhbiBjbGFzcz0naW1nX3N0ZXAtaW50by1kYXJrIGpvX2lubGluZS1pbWFnZSc+PC9zcGFuPiwgVGFzdGUgRjcpIHVuZCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJTdGVwIG91dFwiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPHNwYW4gY2xhc3M9J2ltZ19zdGVwLW91dC1kYXJrIGpvX2lubGluZS1pbWFnZSc+PC9zcGFuPiwgVGFzdGUgRjkpICBcclxuICAgICAgICAgICAgICAgICAgICAgICAga8O2bm5lbiBTaWUgZGFzIFByb2dyYW1tIHNjaHJpdHR3ZWlzZSBhdXNmw7xocmVuIHVuZCBzaWNoIG5hY2ggamVkZW0gU2Nocml0dCBkaWUgQmVsZWd1bmcgZGVyIFZhcmlhYmxlbiBhbnNlaGVuLiA8YnI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDx1bD48bGk+PHNwYW4gY2xhc3M9J2ltZ19zdGVwLW92ZXItZGFyayBqb19pbmxpbmUtaW1hZ2UnPjwvc3Bhbj4gU3RlcCBvdmVyIGbDvGhydCBkZW4gbsOkY2hzdGVuIFNjaHJpdHQgYXVzLCBpbnNiZXNvbmRlcmUgd2VyZGVuIE1ldGhvZGVuYXVmcnVmZSBpbiBlaW5lbSBTY2hyaXR0IGR1cmNoZ2Vmw7xocnQuPC9saT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGxpPjxzcGFuIGNsYXNzPSdpbWdfc3RlcC1pbnRvLWRhcmsgam9faW5saW5lLWltYWdlJz48L3NwYW4+IFN0ZXAgaW50byBmw7xocnQgYXVjaCBkZW4gbsOkY2hzdGVuIFNjaHJpdHQgYXVzLCBnZWh0IGJlaSBNZXRob2RlbmF1ZnJ1ZmVuIGFiZXIgaW4gZGllIE1ldGhvZGUgaGluZWluIHVuZCBmw7xocnQgYXVjaCBkaWUgQW53ZWlzdW5nZW4gaW5uZXJoYWxiIGRlciBNZXRob2RlIHNjaHJpdHR3ZWlzZSBhdXMuPC9saT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGxpPjxzcGFuIGNsYXNzPSdpbWdfc3RlcC1vdXQtZGFyayBqb19pbmxpbmUtaW1hZ2UnPjwvc3Bhbj4gQmVmaW5kZXQgc2ljaCBkaWUgUHJvZ3JhbW1hdXNmw7xocnVuZyBpbm5lcmhhbGIgZWluZXIgTWV0aG9kZSwgc28gYmV3aXJrdCBlaW4gS2xpY2sgYXVmIFN0ZXAgb3V0LCBkYXNzIGRlciBSZXN0IGRlciBNZXRob2RlIGF1c2dlZsO8aHJ0IHdpcmQgdW5kIGRpZSBQcm9ncmFtbWF1c2bDvGhydW5nIGVyc3QgbmFjaCBkZXIgQXVmcnVmc3RlbGxlIGRlciBNZXRob2RlIGFuaMOkbHQuPC9saT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC91bD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgYDtcclxuICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBcInRvcFwiO1xyXG4gICAgICAgICAgICAgICAgICAgICRlbGVtZW50ID0gbWFpbi5pbnRlcnByZXRlci5jb250cm9sQnV0dG9ucy4kYnV0dG9uU3RlcE92ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiY29uc29sZUhlbHBlclwiOiBcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0PWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgSGllciBrw7ZubmVuIFNpZSBBbndlaXN1bmdlbiBvZGVyIFRlcm1lIGVpbmdlYmVuLCBkaWUgbmFjaCBCZXN0w6R0aWd1bmcgbWl0IGRlciBFbnRlci1UYXN0ZSBhdXNnZWbDvGhydC9hdXNnZXdlcnRldCB3ZXJkZW4uIERhcyBFcmdlYm5pcyBzZWhlbiBTaWUgaW0gQmVyZWljaCDDvGJlciBkZXIgRWluZ2FiZXplaWxlLiA8YnI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEZhbGxzIGRhcyBQcm9ncmFtbSBnZXJhZGUgcGF1c2llcnQgKHouQi4gYmVpIEF1c2bDvGhydW5nIGluIEVpbnplbHNjaHJpdHRlbikga8O2bm5lbiBTaWUgYXVjaCBhdWYgZGllIFZhcmlhYmxlbiBkZXMgYWt0dWVsbGVuIFNpY2h0YmFya2VpdHNiZXJlaWNoZXMgenVncmVpZmVuLlxyXG4gICAgICAgICAgICAgICAgICAgIGA7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gXCJib3R0b21cIjtcclxuICAgICAgICAgICAgICAgICAgICAkZWxlbWVudCA9IG1haW4uYm90dG9tRGl2LmNvbnNvbGUuJGNvbnNvbGVUYWIuZmluZCgnLmpvX21vbmFjby1lZGl0b3InKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRleHQgIT0gXCJcIiAmJiAkZWxlbWVudCAhPSBudWxsICYmICRlbGVtZW50Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIEhlbHBlci5vcGVuSGVscGVyKHRleHQsICRlbGVtZW50LCBkaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuXHJcbn0iXX0=