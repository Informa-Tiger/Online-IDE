export class PasswordPopup {
    static open(passwordFor, callbackCancel, callbackOK) {
        PasswordPopup.callbackOK = callbackOK;
        PasswordPopup.callbackCancel = callbackCancel;
        if (w2ui["PasswordForm"] == null) {
            $().w2form({
                name: 'PasswordForm',
                style: 'border: 0px; background-color: transparent;',
                formHTML: '<div class="w2ui-page page-0">' +
                    '    <div class="w2ui-field">' +
                    '        <label>Neues Passwort:</label>' +
                    '        <div>' +
                    '           <input name="password" type="password" autocomplete="new-password" maxlength="100" style="width: 250px"/>' +
                    '        </div>' +
                    '    </div>' +
                    '</div>' +
                    '<div class="w2ui-buttons">' +
                    '    <button class="w2ui-btn" name="cancel">Abbrechen</button>' +
                    '    <button class="w2ui-btn" name="ok">OK</button>' +
                    '</div>',
                fields: [
                    { field: 'password', type: 'password', required: true },
                ],
                record: {
                    password: '',
                },
                actions: {
                    "cancel": function () {
                        w2popup.close();
                        PasswordPopup.callbackCancel();
                    },
                    "ok": function () {
                        w2popup.close();
                        PasswordPopup.callbackOK(this.record["password"]);
                    }
                }
            });
        }
        $().w2popup({
            title: 'Passwort ändern für ' + passwordFor,
            body: '<div id="form" style="width: 100%; height: 100%;"></div>',
            style: 'padding: 15px 0px 0px 0px',
            width: 500,
            height: 300,
            showMax: false,
            onOpen: function (event) {
                event.onComplete = function () {
                    // specifying an onOpen handler instead is equivalent to specifying an onBeforeOpen handler, which would make this code execute too early and hence not deliver.
                    //@ts-ignore
                    $('#w2ui-popup #form').w2render('PasswordForm');
                };
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGFzc3dvcmRQb3B1cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGllbnQvYWRtaW5pc3RyYXRpb24vUGFzc3dvcmRQb3B1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLE9BQU8sYUFBYTtJQUt0QixNQUFNLENBQUMsSUFBSSxDQUFDLFdBQW1CLEVBQUUsY0FBMEIsRUFDdkQsVUFBc0M7UUFFdEMsYUFBYSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDdEMsYUFBYSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFFOUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksSUFBSSxFQUFFO1lBQzlCLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQztnQkFDUCxJQUFJLEVBQUUsY0FBYztnQkFDcEIsS0FBSyxFQUFFLDZDQUE2QztnQkFDcEQsUUFBUSxFQUNKLGdDQUFnQztvQkFDaEMsOEJBQThCO29CQUM5Qix3Q0FBd0M7b0JBQ3hDLGVBQWU7b0JBQ2Ysc0hBQXNIO29CQUN0SCxnQkFBZ0I7b0JBQ2hCLFlBQVk7b0JBQ1osUUFBUTtvQkFDUiw0QkFBNEI7b0JBQzVCLCtEQUErRDtvQkFDL0Qsb0RBQW9EO29CQUNwRCxRQUFRO2dCQUNaLE1BQU0sRUFBRTtvQkFDSixFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO2lCQUMxRDtnQkFDRCxNQUFNLEVBQUU7b0JBQ0osUUFBUSxFQUFFLEVBQUU7aUJBQ2Y7Z0JBQ0QsT0FBTyxFQUFFO29CQUNMLFFBQVEsRUFBRTt3QkFDTixPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ2hCLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDbkMsQ0FBQztvQkFDRCxJQUFJLEVBQUU7d0JBQ0YsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUNoQixhQUFhLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDdEQsQ0FBQztpQkFDSjthQUNKLENBQUMsQ0FBQztTQUVOO1FBR0QsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDO1lBQ1IsS0FBSyxFQUFFLHNCQUFzQixHQUFHLFdBQVc7WUFDM0MsSUFBSSxFQUFFLDBEQUEwRDtZQUNoRSxLQUFLLEVBQUUsMkJBQTJCO1lBQ2xDLEtBQUssRUFBRSxHQUFHO1lBQ1YsTUFBTSxFQUFFLEdBQUc7WUFDWCxPQUFPLEVBQUUsS0FBSztZQUNkLE1BQU0sRUFBRSxVQUFVLEtBQUs7Z0JBQ25CLEtBQUssQ0FBQyxVQUFVLEdBQUc7b0JBQ2YsZ0tBQWdLO29CQUNoSyxZQUFZO29CQUNaLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDcEQsQ0FBQyxDQUFBO1lBQ0wsQ0FBQztTQUNKLENBQUMsQ0FBQztJQUdQLENBQUM7Q0FFSiIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBQYXNzd29yZFBvcHVwIHtcclxuXHJcbiAgICBzdGF0aWMgY2FsbGJhY2tDYW5jZWw6ICgpID0+IHZvaWQ7XHJcbiAgICBzdGF0aWMgY2FsbGJhY2tPSzogKHBhc3N3b3JkOiBzdHJpbmcpID0+IHZvaWQ7XHJcblxyXG4gICAgc3RhdGljIG9wZW4ocGFzc3dvcmRGb3I6IHN0cmluZywgY2FsbGJhY2tDYW5jZWw6ICgpID0+IHZvaWQsXHJcbiAgICAgICAgY2FsbGJhY2tPSzogKHBhc3N3b3JkOiBzdHJpbmcpID0+IHZvaWQpIHtcclxuXHJcbiAgICAgICAgUGFzc3dvcmRQb3B1cC5jYWxsYmFja09LID0gY2FsbGJhY2tPSztcclxuICAgICAgICBQYXNzd29yZFBvcHVwLmNhbGxiYWNrQ2FuY2VsID0gY2FsbGJhY2tDYW5jZWw7XHJcblxyXG4gICAgICAgIGlmICh3MnVpW1wiUGFzc3dvcmRGb3JtXCJdID09IG51bGwpIHtcclxuICAgICAgICAgICAgJCgpLncyZm9ybSh7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnUGFzc3dvcmRGb3JtJyxcclxuICAgICAgICAgICAgICAgIHN0eWxlOiAnYm9yZGVyOiAwcHg7IGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50OycsXHJcbiAgICAgICAgICAgICAgICBmb3JtSFRNTDpcclxuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cIncydWktcGFnZSBwYWdlLTBcIj4nICtcclxuICAgICAgICAgICAgICAgICAgICAnICAgIDxkaXYgY2xhc3M9XCJ3MnVpLWZpZWxkXCI+JyArXHJcbiAgICAgICAgICAgICAgICAgICAgJyAgICAgICAgPGxhYmVsPk5ldWVzIFBhc3N3b3J0OjwvbGFiZWw+JyArXHJcbiAgICAgICAgICAgICAgICAgICAgJyAgICAgICAgPGRpdj4nICtcclxuICAgICAgICAgICAgICAgICAgICAnICAgICAgICAgICA8aW5wdXQgbmFtZT1cInBhc3N3b3JkXCIgdHlwZT1cInBhc3N3b3JkXCIgYXV0b2NvbXBsZXRlPVwibmV3LXBhc3N3b3JkXCIgbWF4bGVuZ3RoPVwiMTAwXCIgc3R5bGU9XCJ3aWR0aDogMjUwcHhcIi8+JyArXHJcbiAgICAgICAgICAgICAgICAgICAgJyAgICAgICAgPC9kaXY+JyArXHJcbiAgICAgICAgICAgICAgICAgICAgJyAgICA8L2Rpdj4nICtcclxuICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JyArXHJcbiAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJ3MnVpLWJ1dHRvbnNcIj4nICtcclxuICAgICAgICAgICAgICAgICAgICAnICAgIDxidXR0b24gY2xhc3M9XCJ3MnVpLWJ0blwiIG5hbWU9XCJjYW5jZWxcIj5BYmJyZWNoZW48L2J1dHRvbj4nICtcclxuICAgICAgICAgICAgICAgICAgICAnICAgIDxidXR0b24gY2xhc3M9XCJ3MnVpLWJ0blwiIG5hbWU9XCJva1wiPk9LPC9idXR0b24+JyArXHJcbiAgICAgICAgICAgICAgICAgICAgJzwvZGl2PicsXHJcbiAgICAgICAgICAgICAgICBmaWVsZHM6IFtcclxuICAgICAgICAgICAgICAgICAgICB7IGZpZWxkOiAncGFzc3dvcmQnLCB0eXBlOiAncGFzc3dvcmQnLCByZXF1aXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHJlY29yZDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhc3N3b3JkOiAnJyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgXCJjYW5jZWxcIjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3MnBvcHVwLmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFBhc3N3b3JkUG9wdXAuY2FsbGJhY2tDYW5jZWwoKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIFwib2tcIjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3MnBvcHVwLmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFBhc3N3b3JkUG9wdXAuY2FsbGJhY2tPSyh0aGlzLnJlY29yZFtcInBhc3N3b3JkXCJdKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAkKCkudzJwb3B1cCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnUGFzc3dvcnQgw6RuZGVybiBmw7xyICcgKyBwYXNzd29yZEZvcixcclxuICAgICAgICAgICAgYm9keTogJzxkaXYgaWQ9XCJmb3JtXCIgc3R5bGU9XCJ3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMDAlO1wiPjwvZGl2PicsXHJcbiAgICAgICAgICAgIHN0eWxlOiAncGFkZGluZzogMTVweCAwcHggMHB4IDBweCcsXHJcbiAgICAgICAgICAgIHdpZHRoOiA1MDAsXHJcbiAgICAgICAgICAgIGhlaWdodDogMzAwLFxyXG4gICAgICAgICAgICBzaG93TWF4OiBmYWxzZSxcclxuICAgICAgICAgICAgb25PcGVuOiBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50Lm9uQ29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc3BlY2lmeWluZyBhbiBvbk9wZW4gaGFuZGxlciBpbnN0ZWFkIGlzIGVxdWl2YWxlbnQgdG8gc3BlY2lmeWluZyBhbiBvbkJlZm9yZU9wZW4gaGFuZGxlciwgd2hpY2ggd291bGQgbWFrZSB0aGlzIGNvZGUgZXhlY3V0ZSB0b28gZWFybHkgYW5kIGhlbmNlIG5vdCBkZWxpdmVyLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgICAgICQoJyN3MnVpLXBvcHVwICNmb3JtJykudzJyZW5kZXIoJ1Bhc3N3b3JkRm9ybScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG5cclxuICAgIH1cclxuXHJcbn0iXX0=