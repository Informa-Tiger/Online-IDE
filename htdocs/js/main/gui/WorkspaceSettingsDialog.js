import { Dialog } from "./Dialog.js";
export class WorkspaceSettingsDialog {
    constructor(workspace, main) {
        this.workspace = workspace;
        this.main = main;
        this.libraries = [
            { identifier: "gng", description: "Graphics'n Games-Bibliothek zu den Informatikbüchern des Cornelsen-Verlages für das Land Bayern (Bemerkung: Die Klassen Turtle und Text heißen hier GTurtle und GText)" }
        ];
    }
    open() {
        let dialog = new Dialog();
        dialog.init();
        dialog.heading("Einstellungen zum Workspace " + this.workspace.name);
        dialog.subHeading("A. Verwendete Bibliotheken:");
        let currentLibraries = this.workspace.settings.libraries;
        for (let library of this.libraries) {
            let cbs = dialog.addCheckbox(library.description, currentLibraries.indexOf(library.identifier) >= 0, library.identifier);
            library.checkboxState = cbs;
        }
        dialog.buttons([
            {
                caption: "Abbrechen",
                color: "#a00000",
                callback: () => { dialog.close(); }
            },
            {
                caption: "OK",
                color: "green",
                callback: () => {
                    let changed = false;
                    let newLibs = [];
                    for (let lib of this.libraries) {
                        let used = lib.checkboxState();
                        changed = changed || (used != (currentLibraries.indexOf(lib.identifier) >= 0));
                        if (used)
                            newLibs.push(lib.identifier);
                    }
                    if (changed) {
                        this.workspace.settings.libraries = newLibs;
                        this.workspace.saved = false;
                        this.workspace.alterAdditionalLibraries();
                        this.main.networkManager.sendUpdates(null, true);
                    }
                    dialog.close();
                }
            },
        ]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya3NwYWNlU2V0dGluZ3NEaWFsb2cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L21haW4vZ3VpL1dvcmtzcGFjZVNldHRpbmdzRGlhbG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBaUIsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBU3BELE1BQU0sT0FBTyx1QkFBdUI7SUFNaEMsWUFBb0IsU0FBb0IsRUFBVSxJQUFVO1FBQXhDLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFBVSxTQUFJLEdBQUosSUFBSSxDQUFNO1FBSjVELGNBQVMsR0FBYztZQUNuQixFQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLHdLQUF3SyxFQUFDO1NBQzdNLENBQUE7SUFJRCxDQUFDO0lBRUQsSUFBSTtRQUNBLElBQUksTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7UUFDMUIsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2QsTUFBTSxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxVQUFVLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUVqRCxJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQztRQUV6RCxLQUFJLElBQUksT0FBTyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUM7WUFDOUIsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN6SCxPQUFPLENBQUMsYUFBYSxHQUFHLEdBQUcsQ0FBQztTQUMvQjtRQUVELE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFDWDtnQkFDSSxPQUFPLEVBQUUsV0FBVztnQkFDcEIsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUEsQ0FBQSxDQUFDO2FBQ25DO1lBQ0Q7Z0JBQ0ksT0FBTyxFQUFFLElBQUk7Z0JBQ2IsS0FBSyxFQUFFLE9BQU87Z0JBQ2QsUUFBUSxFQUFFLEdBQUcsRUFBRTtvQkFDWCxJQUFJLE9BQU8sR0FBWSxLQUFLLENBQUM7b0JBQzdCLElBQUksT0FBTyxHQUFhLEVBQUUsQ0FBQztvQkFDM0IsS0FBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFDO3dCQUMxQixJQUFJLElBQUksR0FBRyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUM7d0JBQy9CLE9BQU8sR0FBRyxPQUFPLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQy9FLElBQUcsSUFBSTs0QkFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztxQkFDekM7b0JBRUQsSUFBRyxPQUFPLEVBQUM7d0JBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQzt3QkFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO3dCQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLHdCQUF3QixFQUFFLENBQUM7d0JBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7cUJBQ3BEO29CQUVELE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDbkIsQ0FBQzthQUNKO1NBQ0osQ0FBQyxDQUFBO0lBR04sQ0FBQztDQUNKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgV29ya3NwYWNlIH0gZnJvbSBcInNyYy9jbGllbnQvd29ya3NwYWNlL1dvcmtzcGFjZS5qc1wiO1xyXG5pbXBvcnQgeyBNYWluIH0gZnJvbSBcIi4uL01haW4uanNcIjtcclxuaW1wb3J0IHsgTWFpbkJhc2UgfSBmcm9tIFwiLi4vTWFpbkJhc2UuanNcIjtcclxuaW1wb3J0IHsgQ2hlY2tib3hTdGF0ZSwgRGlhbG9nIH0gZnJvbSBcIi4vRGlhbG9nLmpzXCI7XHJcblxyXG5cclxudHlwZSBMaWJyYXJ5ID0ge1xyXG4gICAgaWRlbnRpZmllcjogc3RyaW5nLFxyXG4gICAgZGVzY3JpcHRpb246IHN0cmluZyxcclxuICAgIGNoZWNrYm94U3RhdGU/OiBDaGVja2JveFN0YXRlXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBXb3Jrc3BhY2VTZXR0aW5nc0RpYWxvZ3tcclxuXHJcbiAgICBsaWJyYXJpZXM6IExpYnJhcnlbXSA9IFtcclxuICAgICAgICB7aWRlbnRpZmllcjogXCJnbmdcIiwgZGVzY3JpcHRpb246IFwiR3JhcGhpY3MnbiBHYW1lcy1CaWJsaW90aGVrIHp1IGRlbiBJbmZvcm1hdGlrYsO8Y2hlcm4gZGVzIENvcm5lbHNlbi1WZXJsYWdlcyBmw7xyIGRhcyBMYW5kIEJheWVybiAoQmVtZXJrdW5nOiBEaWUgS2xhc3NlbiBUdXJ0bGUgdW5kIFRleHQgaGVpw59lbiBoaWVyIEdUdXJ0bGUgdW5kIEdUZXh0KVwifVxyXG4gICAgXVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgd29ya3NwYWNlOiBXb3Jrc3BhY2UsIHByaXZhdGUgbWFpbjogTWFpbil7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG9wZW4oKXtcclxuICAgICAgICBsZXQgZGlhbG9nID0gbmV3IERpYWxvZygpO1xyXG4gICAgICAgIGRpYWxvZy5pbml0KCk7XHJcbiAgICAgICAgZGlhbG9nLmhlYWRpbmcoXCJFaW5zdGVsbHVuZ2VuIHp1bSBXb3Jrc3BhY2UgXCIgKyB0aGlzLndvcmtzcGFjZS5uYW1lKTtcclxuICAgICAgICBkaWFsb2cuc3ViSGVhZGluZyhcIkEuIFZlcndlbmRldGUgQmlibGlvdGhla2VuOlwiKTtcclxuXHJcbiAgICAgICAgbGV0IGN1cnJlbnRMaWJyYXJpZXMgPSB0aGlzLndvcmtzcGFjZS5zZXR0aW5ncy5saWJyYXJpZXM7XHJcblxyXG4gICAgICAgIGZvcihsZXQgbGlicmFyeSBvZiB0aGlzLmxpYnJhcmllcyl7XHJcbiAgICAgICAgICAgIGxldCBjYnMgPSBkaWFsb2cuYWRkQ2hlY2tib3gobGlicmFyeS5kZXNjcmlwdGlvbiwgY3VycmVudExpYnJhcmllcy5pbmRleE9mKGxpYnJhcnkuaWRlbnRpZmllcikgPj0gMCwgbGlicmFyeS5pZGVudGlmaWVyKTtcclxuICAgICAgICAgICAgbGlicmFyeS5jaGVja2JveFN0YXRlID0gY2JzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGlhbG9nLmJ1dHRvbnMoW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBjYXB0aW9uOiBcIkFiYnJlY2hlblwiLFxyXG4gICAgICAgICAgICAgICAgY29sb3I6IFwiI2EwMDAwMFwiLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtkaWFsb2cuY2xvc2UoKX1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY2FwdGlvbjogXCJPS1wiLFxyXG4gICAgICAgICAgICAgICAgY29sb3I6IFwiZ3JlZW5cIixcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNoYW5nZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3TGliczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IobGV0IGxpYiBvZiB0aGlzLmxpYnJhcmllcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB1c2VkID0gbGliLmNoZWNrYm94U3RhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlZCA9IGNoYW5nZWQgfHwgKHVzZWQgIT0gKGN1cnJlbnRMaWJyYXJpZXMuaW5kZXhPZihsaWIuaWRlbnRpZmllcikgPj0gMCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih1c2VkKSBuZXdMaWJzLnB1c2gobGliLmlkZW50aWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoY2hhbmdlZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud29ya3NwYWNlLnNldHRpbmdzLmxpYnJhcmllcyA9IG5ld0xpYnM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud29ya3NwYWNlLnNhdmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud29ya3NwYWNlLmFsdGVyQWRkaXRpb25hbExpYnJhcmllcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW4ubmV0d29ya01hbmFnZXIuc2VuZFVwZGF0ZXMobnVsbCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdKVxyXG4gXHJcblxyXG4gICAgfVxyXG59Il19