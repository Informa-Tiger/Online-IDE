import { KlassData, Pruefung, SchoolData, WorkspaceShortData } from "../communication/Data";

export class NewPruefungPopup {

    static callbackCancel: () => void;
    static callbackOK: (newPruefung: Pruefung) => void;
    
    static open(classList: KlassData[], workspaces: WorkspaceShortData[],
        callbackCancel: () => void,
        callbackOK: (newPruefung: Pruefung) => void) {
            
            NewPruefungPopup.callbackOK = callbackOK;
            NewPruefungPopup.callbackCancel = callbackCancel;
            
            w2ui["NewPruefungForm"]?.destroy();
            $().w2form({
                name: 'NewPruefungForm',
                style: 'border: 0px; background-color: transparent;',
                fields: [
                    { field: 'name', type: 'text', required: true,
                    html: { caption: 'Name der Prüfung', attr: 'style="width: 300px"' } },
                    { field: 'klasse', type: 'list',
                    html: { caption: 'Klasse', attr: 'style="width: 300px"' }, 
                    options: { items: classList.sort((a, b) => a.text.localeCompare(b.text)) } },
                    { field: 'template', type: 'list',
                    html: { caption: 'Vorlage-Workspace', attr: 'style="width: 300px"' }, 
                    options: { items: workspaces } },
                ],
                record: {
                    name: "",
                    klasse: classList.length > 0 ? classList[0] : null,
                    template: workspaces[0]
                },
                actions: {
                    "cancel": function () {
                        w2popup.close();
                        NewPruefungPopup.callbackCancel();
                    },
                    "ok": function () {
                        w2popup.close();
                        NewPruefungPopup.callbackOK(
                            {
                                id: -1,
                                klasse_id: this.record["klasse"].id,
                                state: "preparing",
                                template_workspace_id: this.record["template"]?.id,
                                name: this.record["name"]
                            }
                            );
                    }
                }
            });



        $().w2popup({
            title: 'Neue Prüfung anlegen',
            body: '<div id="form" style="width: 100%; height: 100%;"></div>',
            style: 'padding: 15px 0px 0px 0px',
            width: 500,
            height: 300,
            showMax: false,
            onOpen: function (event) {
                event.onComplete = function () {
                    // specifying an onOpen handler instead is equivalent to specifying an onBeforeOpen handler, which would make this code execute too early and hence not deliver.
                    //@ts-ignore
                    $('#w2ui-popup #form').w2render('NewPruefungForm');
                }
            }
        });


    }

}