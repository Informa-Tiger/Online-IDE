import { openContextMenu } from "../../tools/HtmlTools.js";
import { Dialog } from "./Dialog.js";
import { ajax } from "../../communication/AjaxHelper.js";
export class UserMenu {
    constructor(main) {
        this.main = main;
    }
    init() {
        let $userSettingsButton = jQuery('#buttonUserSettings');
        let that = this;
        $userSettingsButton.on("click", (e) => {
            let contextMenuItems = [
                {
                    caption: "Passwort ändern...",
                    callback: () => {
                        let passwortChanger = new PasswordChanger(that.main);
                        passwortChanger.show();
                    }
                }
            ];
            openContextMenu(contextMenuItems, $userSettingsButton.offset().left, $userSettingsButton.offset().top + $userSettingsButton.height());
        });
    }
}
export class PasswordChanger {
    constructor(main) {
        this.main = main;
        this.dialog = new Dialog();
    }
    show() {
        this.dialog.init();
        this.dialog.heading("Passwort ändern");
        this.dialog.description("Bitte geben Sie Ihr bisheriges Passwort und darunter zweimal Ihr neues Passwort ein. <br>" +
            "Das Passwort muss mindestens 8 Zeichen lang sein und sowohl Buchstaben als auch Zahlen oder Sonderzeichen enthalten.");
        let $oldPassword = this.dialog.input("password", "Altes Passwort");
        let $newPassword1 = this.dialog.input("password", "Neues Passwort");
        let $newPassword2 = this.dialog.input("password", "Neues Passwort wiederholen");
        let $errorDiv = this.dialog.description("", "red");
        let waitDiv = this.dialog.waitMessage("Bitte warten...");
        this.dialog.buttons([
            {
                caption: "Abbrechen",
                color: "#a00000",
                callback: () => { this.dialog.close(); }
            },
            {
                caption: "OK",
                color: "green",
                callback: () => {
                    if ($newPassword1.val() != $newPassword2.val()) {
                        $errorDiv.text("Die zwei eingegebenen neuen Passwörter stimmen nicht überein.");
                    }
                    else {
                        waitDiv(true);
                        ajax("changePassword", { oldPassword: $oldPassword.val(), newPassword: $newPassword1.val() }, () => {
                            waitDiv(false);
                            alert("Das Passwort wurde erfolgreich geändert.");
                            this.dialog.close();
                        }, (message) => {
                            waitDiv(false);
                            $errorDiv.text(message);
                        });
                    }
                }
            },
        ]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNlck1lbnUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L21haW4vZ3VpL1VzZXJNZW51LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxlQUFlLEVBQW1CLE1BQU0sMEJBQTBCLENBQUM7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNyQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFekQsTUFBTSxPQUFPLFFBQVE7SUFJakIsWUFBb0IsSUFBVTtRQUFWLFNBQUksR0FBSixJQUFJLENBQU07SUFFOUIsQ0FBQztJQUVELElBQUk7UUFDQSxJQUFJLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3hELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztRQUVoQixtQkFBbUIsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFFbEMsSUFBSSxnQkFBZ0IsR0FBc0I7Z0JBQ3RDO29CQUNJLE9BQU8sRUFBRSxvQkFBb0I7b0JBQzdCLFFBQVEsRUFBRSxHQUFHLEVBQUU7d0JBQ1gsSUFBSSxlQUFlLEdBQUcsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNyRCxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzNCLENBQUM7aUJBQ0o7YUFDSixDQUFBO1lBR0QsZUFBZSxDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUUxSSxDQUFDLENBQUMsQ0FBQztJQUVQLENBQUM7Q0FHSjtBQUdELE1BQU0sT0FBTyxlQUFlO0lBSXhCLFlBQW9CLElBQVU7UUFBVixTQUFJLEdBQUosSUFBSSxDQUFNO1FBRTFCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztJQUUvQixDQUFDO0lBRUQsSUFBSTtRQUNBLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQywyRkFBMkY7WUFDbkgsc0hBQXNILENBQUMsQ0FBQTtRQUN2SCxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNuRSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNwRSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUNoRixJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkQsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUV4RCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztZQUNoQjtnQkFDSSxPQUFPLEVBQUUsV0FBVztnQkFDcEIsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBLENBQUEsQ0FBQzthQUN4QztZQUNEO2dCQUNJLE9BQU8sRUFBRSxJQUFJO2dCQUNiLEtBQUssRUFBRSxPQUFPO2dCQUNkLFFBQVEsRUFBRSxHQUFHLEVBQUU7b0JBQ1gsSUFBRyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksYUFBYSxDQUFDLEdBQUcsRUFBRSxFQUFDO3dCQUMxQyxTQUFTLENBQUMsSUFBSSxDQUFDLCtEQUErRCxDQUFDLENBQUE7cUJBQ2xGO3lCQUFNO3dCQUNILE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDZCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsRUFBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLEdBQUcsRUFBRSxFQUFFLFdBQVcsRUFBRSxhQUFhLENBQUMsR0FBRyxFQUFFLEVBQUMsRUFBRSxHQUFHLEVBQUU7NEJBQzdGLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQzs0QkFDZixLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQzs0QkFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDeEIsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUU7NEJBQ1gsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUNmLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7d0JBQzNCLENBQUMsQ0FBQyxDQUFBO3FCQUNMO2dCQUVMLENBQUM7YUFDSjtTQUNKLENBQUMsQ0FBQTtJQUNOLENBQUM7Q0FFSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1haW4gfSBmcm9tIFwiLi4vTWFpbi5qc1wiO1xyXG5pbXBvcnQgeyBvcGVuQ29udGV4dE1lbnUsIENvbnRleHRNZW51SXRlbSB9IGZyb20gXCIuLi8uLi90b29scy9IdG1sVG9vbHMuanNcIjtcclxuaW1wb3J0IHsgRGlhbG9nIH0gZnJvbSBcIi4vRGlhbG9nLmpzXCI7XHJcbmltcG9ydCB7IGFqYXggfSBmcm9tIFwiLi4vLi4vY29tbXVuaWNhdGlvbi9BamF4SGVscGVyLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgVXNlck1lbnUge1xyXG5cclxuXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBtYWluOiBNYWluKXtcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICBpbml0KCl7XHJcbiAgICAgICAgbGV0ICR1c2VyU2V0dGluZ3NCdXR0b24gPSBqUXVlcnkoJyNidXR0b25Vc2VyU2V0dGluZ3MnKTtcclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgICR1c2VyU2V0dGluZ3NCdXR0b24ub24oXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgbGV0IGNvbnRleHRNZW51SXRlbXM6IENvbnRleHRNZW51SXRlbVtdID0gW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhcHRpb246IFwiUGFzc3dvcnQgw6RuZGVybi4uLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYXNzd29ydENoYW5nZXIgPSBuZXcgUGFzc3dvcmRDaGFuZ2VyKHRoYXQubWFpbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhc3N3b3J0Q2hhbmdlci5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcblxyXG5cclxuICAgICAgICAgICAgb3BlbkNvbnRleHRNZW51KGNvbnRleHRNZW51SXRlbXMsICR1c2VyU2V0dGluZ3NCdXR0b24ub2Zmc2V0KCkubGVmdCwgJHVzZXJTZXR0aW5nc0J1dHRvbi5vZmZzZXQoKS50b3AgKyAkdXNlclNldHRpbmdzQnV0dG9uLmhlaWdodCgpKTtcclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuXHJcblxyXG5leHBvcnQgY2xhc3MgUGFzc3dvcmRDaGFuZ2VyIHtcclxuXHJcbiAgICBkaWFsb2c6IERpYWxvZztcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1haW46IE1haW4pe1xyXG5cclxuICAgICAgICB0aGlzLmRpYWxvZyA9IG5ldyBEaWFsb2coKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICB0aGlzLmRpYWxvZy5pbml0KCk7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cuaGVhZGluZyhcIlBhc3N3b3J0IMOkbmRlcm5cIik7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cuZGVzY3JpcHRpb24oXCJCaXR0ZSBnZWJlbiBTaWUgSWhyIGJpc2hlcmlnZXMgUGFzc3dvcnQgdW5kIGRhcnVudGVyIHp3ZWltYWwgSWhyIG5ldWVzIFBhc3N3b3J0IGVpbi4gPGJyPlwiICsgXHJcbiAgICAgICAgXCJEYXMgUGFzc3dvcnQgbXVzcyBtaW5kZXN0ZW5zIDggWmVpY2hlbiBsYW5nIHNlaW4gdW5kIHNvd29obCBCdWNoc3RhYmVuIGFscyBhdWNoIFphaGxlbiBvZGVyIFNvbmRlcnplaWNoZW4gZW50aGFsdGVuLlwiKVxyXG4gICAgICAgIGxldCAkb2xkUGFzc3dvcmQgPSB0aGlzLmRpYWxvZy5pbnB1dChcInBhc3N3b3JkXCIsIFwiQWx0ZXMgUGFzc3dvcnRcIik7XHJcbiAgICAgICAgbGV0ICRuZXdQYXNzd29yZDEgPSB0aGlzLmRpYWxvZy5pbnB1dChcInBhc3N3b3JkXCIsIFwiTmV1ZXMgUGFzc3dvcnRcIik7XHJcbiAgICAgICAgbGV0ICRuZXdQYXNzd29yZDIgPSB0aGlzLmRpYWxvZy5pbnB1dChcInBhc3N3b3JkXCIsIFwiTmV1ZXMgUGFzc3dvcnQgd2llZGVyaG9sZW5cIik7XHJcbiAgICAgICAgbGV0ICRlcnJvckRpdiA9IHRoaXMuZGlhbG9nLmRlc2NyaXB0aW9uKFwiXCIsIFwicmVkXCIpO1xyXG4gICAgICAgIGxldCB3YWl0RGl2ID0gdGhpcy5kaWFsb2cud2FpdE1lc3NhZ2UoXCJCaXR0ZSB3YXJ0ZW4uLi5cIilcclxuXHJcbiAgICAgICAgdGhpcy5kaWFsb2cuYnV0dG9ucyhbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGNhcHRpb246IFwiQWJicmVjaGVuXCIsXHJcbiAgICAgICAgICAgICAgICBjb2xvcjogXCIjYTAwMDAwXCIsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge3RoaXMuZGlhbG9nLmNsb3NlKCl9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGNhcHRpb246IFwiT0tcIixcclxuICAgICAgICAgICAgICAgIGNvbG9yOiBcImdyZWVuXCIsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKCRuZXdQYXNzd29yZDEudmFsKCkgIT0gJG5ld1Bhc3N3b3JkMi52YWwoKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlcnJvckRpdi50ZXh0KFwiRGllIHp3ZWkgZWluZ2VnZWJlbmVuIG5ldWVuIFBhc3N3w7ZydGVyIHN0aW1tZW4gbmljaHQgw7xiZXJlaW4uXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdERpdih0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWpheChcImNoYW5nZVBhc3N3b3JkXCIsIHtvbGRQYXNzd29yZDogJG9sZFBhc3N3b3JkLnZhbCgpLCBuZXdQYXNzd29yZDogJG5ld1Bhc3N3b3JkMS52YWwoKX0sICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhaXREaXYoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoXCJEYXMgUGFzc3dvcnQgd3VyZGUgZXJmb2xncmVpY2ggZ2XDpG5kZXJ0LlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIChtZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YWl0RGl2KGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRlcnJvckRpdi50ZXh0KG1lc3NhZ2UpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdKVxyXG4gICAgfVxyXG5cclxufSJdfQ==