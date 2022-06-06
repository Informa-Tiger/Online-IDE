export class ThemeManager {
    constructor() {
        this.themes = [];
        this.initThemes();
    }
    switchTheme(name) {
        for (let theme of this.themes) {
            if (theme.name == name) {
                this.internalSwitchTheme(theme);
                break;
            }
        }
    }
    internalSwitchTheme(theme) {
        monaco.editor.setTheme(theme.monacoTheme);
        let root = document.documentElement;
        for (const key of Object.keys(theme.cssColors)) {
            const value = theme.cssColors[key];
            root.style.setProperty(key, value);
        }
    }
    initThemes() {
        this.themes.push({
            name: "dark",
            monacoTheme: "myCustomThemeDark",
            cssColors: {
                "--backgroundDark": "#1e1e1e",
                "--backgroundLight": "#252526",
                "--backgroundHeading": "#37373d",
                "--backgroundSelected": "#2a2d2e",
                "--fontColorNormal": "#c2cccc",
                "--fontColorLight": "#e7e7e7",
                "--slider": "#414141",
                "--loginButtonBackgrond": "#59a15d",
                "--loginButtonFontColor": "#000000",
                "--loginMessageColor": "rgb(122, 48, 48)",
                "--loginButtonHover": "#63a867",
                "--loginButtonActive": "#94ffd1",
                "--scrollbar": "#1e1e1e",
                "--scrollbar-thumb": "#3e3e3e",
                "--scrollbar-thumb-hover": "#5e5e5e",
                "--scrollbar-thumb-active": "#7e7e7e",
                "--submenu-hover": "#094771",
                "--submenu-color": "#ffffff",
                "--menuitemsdivider": "#616162",
                "--file-hover": "hsla(0, 0%, 38%, 0.125)",
                "--file-active": "#094771",
                "--file-active-hover": "rgba(9, 71, 113, 0.827)",
                "--file-errorcount": "red",
                "--inplace-editor": "blue",
                "--contextmenu-background": "#3c3c3c",
                "--contextmenu-color": "rgb(212,212,212)",
                "--contextmenu-hover-background": "#094771",
                "--contextmenu-hover-color": "#ffffff",
                "--error-filename": "#2a709e",
                "--error-line-ative": "#094771",
                "--error-line-hover": "rgba(96, 96, 96, 0.125)",
                "--error-position": "#c0802d",
                "--linecolumn": "#14c714",
                "--reveal-error": "rgba(253, 101, 101, 0.745)",
                "--reveal-method": "#2b2b7d2f",
                "--reveal-errorline-background": "red",
                "--reveal-error-whole-line": "rgba(255, 0, 0, 0.555)",
                "--reveal-programpointer": "rgba(111, 214, 27, 0.337)",
                "--reveal-syntaxelement": "rgb(85,85,85)",
                "--margin-breakpoint": "rgba(255, 0, 0, 0.623)",
                "--speedcontrol-bar": "#9d9d9d",
                "--speedcontrol-grip": "#588555",
                "--speedcontrol-grip-hover": "#89d185",
                "--speedcontrol-display-background": "#383838",
                "--speedcontrol-display-border": "#9d9d9d",
                "--editorTooltip-background": "#252526",
                "--editorTooltip-border": "#454545",
                "--renameInput-color": "#ffffff",
                //bottomDiv
                "--bottomdiv-tabheading-hover": "white",
                "--bottomdiv-tabheading-active": "rgb(97,97,255)",
                "--noErrorMessage": "rgb(37, 211, 37)",
                "--console-top-borderbottom": "#c4c4c4",
                "--console-top-background": "#1e1e1e",
                "--consoleEntry-withBorder": "#303030",
                "--consoleEntryValue": "white",
                "--consoleEntryIdentifier": "rgb(156, 156, 235)",
                "--consoleEntryNoValue": "gray",
                "--consoleEntryCaption": "white",
                "--error-Caption": "rgb(166, 165, 176)",
                "--console-error": "rgb(155, 51, 51)",
                // Debugger
                "--deIdentifier": "rgb(156, 156, 235)",
                "--deValue": "white",
                // Helper
                "--helper-background-color": "#383838",
                "--helper-border-color": "#d4d4d4",
                "--arrowBoxButtonOuter-background": "#59a15d",
                "--arrowBoxButtonOuter-border": "#3d3d3d",
                "--arrowBoxButtonOuter-color": "black",
                "--arrowBoxButtonOuter-button-hover": "#63a867",
                "--arrowBox-after": "rgba(136, 183, 213, 0)",
                "--arrowBox-before": "rgba(194, 225, 245, 0)",
                //run
                "--defaultOutputColor": "#ffffff",
                "--runInputColor": "#ffffff",
                "--runBackgroundColor": "rgba(255, 255, 255, 0.2)",
            }
        });
        let highlightColor = "#8080ff";
        this.themes.push({
            name: "light",
            monacoTheme: "myCustomThemeLight",
            cssColors: {
                "--backgroundDark": "white",
                "--backgroundLight": "#f3f3f3",
                "--backgroundHeading": "#dcdcdc",
                "--backgroundSelected": "#e8e8e8",
                "--fontColorNormal": "#756161",
                "--fontColorLight": "#756161",
                "--slider": "#b0b0b0",
                "--loginButtonBackgrond": "#59a15d",
                "--loginButtonFontColor": "#000000",
                "--loginMessageColor": "rgb(122, 48, 48)",
                "--loginButtonHover": "#63a867",
                "--loginButtonActive": "#94ffd1",
                "--scrollbar": "#e3e3e3",
                "--scrollbar-thumb": "#bababa",
                "--scrollbar-thumb-hover": "#8e8e8e",
                "--scrollbar-thumb-active": "#616161",
                "--submenu-hover": highlightColor,
                "--submenu-color": "#ffffff",
                "--menuitemsdivider": "#cfcfcf",
                "--file-hover": "#e8e8e8",
                "--file-active": highlightColor,
                "--file-active-hover": "#a0a0ff",
                "--file-errorcount": "red",
                "--inplace-editor": "white",
                "--contextmenu-background": "white",
                "--contextmenu-color": "#756161",
                "--contextmenu-hover-background": highlightColor,
                "--contextmenu-hover-color": "#a0a0ff",
                "--error-filename": "#ff0000",
                "--error-line-ative": "#ffa0a0",
                "--error-line-hover": "#ffc0c0",
                "--error-position": "#804040",
                "--linecolumn": "#14c714",
                "--reveal-error": "rgba(253, 101, 101, 0.745)",
                "--reveal-method": "#babaec80",
                "--reveal-errorline-background": "red",
                "--reveal-error-whole-line": "rgba(255, 0, 0, 0.555)",
                "--reveal-programpointer": "rgba(111, 214, 27, 0.337)",
                "--reveal-syntaxelement": "#c0c0c0",
                "--margin-breakpoint": "rgba(255, 0, 0, 0.623)",
                "--speedcontrol-bar": "#9d9d9d",
                "--speedcontrol-grip": "#588555",
                "--speedcontrol-grip-hover": "#89d185",
                "--speedcontrol-display-background": "#e0e0e0",
                "--speedcontrol-display-border": "#9d9d9d",
                "--editorTooltip-background": "#e0e0e0",
                "--editorTooltip-border": "#9d9d9d",
                "--renameInput-color": "#000000",
                //bottomDiv
                "--bottomdiv-tabheading-hover": "#424242",
                "--bottomdiv-tabheading-active": "#424242",
                "--noErrorMessage": "rgb(17, 180, 17)",
                "--console-top-borderbottom": "#c4c4c4",
                "--console-top-background": "white",
                "--consoleEntry-withBorder": "#303030",
                "--consoleEntryValue": "#0000a0",
                "--consoleEntryIdentifier": "black",
                "--consoleEntryNoValue": "gray",
                "--consoleEntryCaption": "#756161",
                "--error-Caption": "rgb(166, 165, 176)",
                "--console-error": "rgb(155, 21, 21)",
                // Debugger
                "--deIdentifier": "black",
                "--deValue": "#0000a0",
                // Helper
                "--helper-background-color": "#f3f3f3",
                "--helper-border-color": "#606060",
                "--arrowBoxButtonOuter-background": "#59a15d",
                "--arrowBoxButtonOuter-border": "#3d3d3d",
                "--arrowBoxButtonOuter-color": "black",
                "--arrowBoxButtonOuter-button-hover": "#63a867",
                "--arrowBox-after": "rgba(136, 183, 213, 0)",
                "--arrowBox-before": "rgba(194, 225, 245, 0)",
                //run
                "--defaultOutputColor": "#303030",
                "--runInputColor": "#000000",
                "--runBackgroundColor": "rgba(0, 0, 0, 0.2)",
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGhlbWVNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9UaGVtZU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBUUEsTUFBTSxPQUFPLFlBQVk7SUFJckI7UUFGQSxXQUFNLEdBQVksRUFBRSxDQUFDO1FBR2pCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRUQsV0FBVyxDQUFDLElBQVk7UUFDcEIsS0FBSyxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzNCLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ3BCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDaEMsTUFBTTthQUNUO1NBQ0o7SUFDTCxDQUFDO0lBQ0QsbUJBQW1CLENBQUMsS0FBWTtRQUM1QixNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFMUMsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQztRQUNwQyxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzVDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFbEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBRXRDO0lBRUwsQ0FBQztJQUVELFVBQVU7UUFFTixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNiLElBQUksRUFBRSxNQUFNO1lBQ1osV0FBVyxFQUFFLG1CQUFtQjtZQUNoQyxTQUFTLEVBQUU7Z0JBQ1Asa0JBQWtCLEVBQUUsU0FBUztnQkFDN0IsbUJBQW1CLEVBQUUsU0FBUztnQkFDOUIs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QXdCO2dCQUM1QyxtQkFBbUIsRUFBRSx3QkFBd0I7Z0JBRTdDLEtBQUs7Z0JBQ0wsc0JBQXNCLEVBQUUsU0FBUztnQkFDakMsaUJBQWlCLEVBQUUsU0FBUztnQkFDNUIsc0JBQXNCLEVBQUUsb0JBQW9CO2FBRS9DO1NBQ0osQ0FBQyxDQUFDO0lBSVAsQ0FBQztDQUtKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTWFpbiB9IGZyb20gXCIuLi9NYWluXCI7XHJcblxyXG5leHBvcnQgdHlwZSBUaGVtZSA9IHtcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIG1vbmFjb1RoZW1lOiBzdHJpbmcsXHJcbiAgICBjc3NDb2xvcnM6IHsgW2NvbG9yOiBzdHJpbmddOiBzdHJpbmcgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGhlbWVNYW5hZ2VyIHtcclxuXHJcbiAgICB0aGVtZXM6IFRoZW1lW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmluaXRUaGVtZXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2hUaGVtZShuYW1lOiBzdHJpbmcpIHtcclxuICAgICAgICBmb3IgKGxldCB0aGVtZSBvZiB0aGlzLnRoZW1lcykge1xyXG4gICAgICAgICAgICBpZiAodGhlbWUubmFtZSA9PSBuYW1lKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmludGVybmFsU3dpdGNoVGhlbWUodGhlbWUpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpbnRlcm5hbFN3aXRjaFRoZW1lKHRoZW1lOiBUaGVtZSkge1xyXG4gICAgICAgIG1vbmFjby5lZGl0b3Iuc2V0VGhlbWUodGhlbWUubW9uYWNvVGhlbWUpO1xyXG5cclxuICAgICAgICBsZXQgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcclxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGVtZS5jc3NDb2xvcnMpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gdGhlbWUuY3NzQ29sb3JzW2tleV1cclxuXHJcbiAgICAgICAgICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoa2V5LCB2YWx1ZSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgaW5pdFRoZW1lcygpIHtcclxuXHJcbiAgICAgICAgdGhpcy50aGVtZXMucHVzaCh7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiZGFya1wiLFxyXG4gICAgICAgICAgICBtb25hY29UaGVtZTogXCJteUN1c3RvbVRoZW1lRGFya1wiLFxyXG4gICAgICAgICAgICBjc3NDb2xvcnM6IHtcclxuICAgICAgICAgICAgICAgIFwiLS1iYWNrZ3JvdW5kRGFya1wiOiBcIiMxZTFlMWVcIixcclxuICAgICAgICAgICAgICAgIFwiLS1iYWNrZ3JvdW5kTGlnaHRcIjogXCIjMjUyNTI2XCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tYmFja2dyb3VuZEhlYWRpbmdcIjogXCIjMzczNzNkXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tYmFja2dyb3VuZFNlbGVjdGVkXCI6IFwiIzJhMmQyZVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWZvbnRDb2xvck5vcm1hbFwiOiBcIiNjMmNjY2NcIixcclxuICAgICAgICAgICAgICAgIFwiLS1mb250Q29sb3JMaWdodFwiOiBcIiNlN2U3ZTdcIixcclxuICAgICAgICAgICAgICAgIFwiLS1zbGlkZXJcIjogXCIjNDE0MTQxXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tbG9naW5CdXR0b25CYWNrZ3JvbmRcIjogXCIjNTlhMTVkXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tbG9naW5CdXR0b25Gb250Q29sb3JcIjogXCIjMDAwMDAwXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tbG9naW5NZXNzYWdlQ29sb3JcIjogXCJyZ2IoMTIyLCA0OCwgNDgpXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tbG9naW5CdXR0b25Ib3ZlclwiOiBcIiM2M2E4NjdcIixcclxuICAgICAgICAgICAgICAgIFwiLS1sb2dpbkJ1dHRvbkFjdGl2ZVwiOiBcIiM5NGZmZDFcIixcclxuICAgICAgICAgICAgICAgIFwiLS1zY3JvbGxiYXJcIjogXCIjMWUxZTFlXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tc2Nyb2xsYmFyLXRodW1iXCI6IFwiIzNlM2UzZVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLXNjcm9sbGJhci10aHVtYi1ob3ZlclwiOiBcIiM1ZTVlNWVcIixcclxuICAgICAgICAgICAgICAgIFwiLS1zY3JvbGxiYXItdGh1bWItYWN0aXZlXCI6IFwiIzdlN2U3ZVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLXN1Ym1lbnUtaG92ZXJcIjogXCIjMDk0NzcxXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tc3VibWVudS1jb2xvclwiOiBcIiNmZmZmZmZcIixcclxuICAgICAgICAgICAgICAgIFwiLS1tZW51aXRlbXNkaXZpZGVyXCI6IFwiIzYxNjE2MlwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWZpbGUtaG92ZXJcIjogXCJoc2xhKDAsIDAlLCAzOCUsIDAuMTI1KVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWZpbGUtYWN0aXZlXCI6IFwiIzA5NDc3MVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWZpbGUtYWN0aXZlLWhvdmVyXCI6IFwicmdiYSg5LCA3MSwgMTEzLCAwLjgyNylcIixcclxuICAgICAgICAgICAgICAgIFwiLS1maWxlLWVycm9yY291bnRcIjogXCJyZWRcIixcclxuICAgICAgICAgICAgICAgIFwiLS1pbnBsYWNlLWVkaXRvclwiOiBcImJsdWVcIixcclxuICAgICAgICAgICAgICAgIFwiLS1jb250ZXh0bWVudS1iYWNrZ3JvdW5kXCI6IFwiIzNjM2MzY1wiLFxyXG4gICAgICAgICAgICAgICAgXCItLWNvbnRleHRtZW51LWNvbG9yXCI6IFwicmdiKDIxMiwyMTIsMjEyKVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWNvbnRleHRtZW51LWhvdmVyLWJhY2tncm91bmRcIjogXCIjMDk0NzcxXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tY29udGV4dG1lbnUtaG92ZXItY29sb3JcIjogXCIjZmZmZmZmXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tZXJyb3ItZmlsZW5hbWVcIjogXCIjMmE3MDllXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tZXJyb3ItbGluZS1hdGl2ZVwiOiBcIiMwOTQ3NzFcIixcclxuICAgICAgICAgICAgICAgIFwiLS1lcnJvci1saW5lLWhvdmVyXCI6IFwicmdiYSg5NiwgOTYsIDk2LCAwLjEyNSlcIixcclxuICAgICAgICAgICAgICAgIFwiLS1lcnJvci1wb3NpdGlvblwiOiBcIiNjMDgwMmRcIixcclxuICAgICAgICAgICAgICAgIFwiLS1saW5lY29sdW1uXCI6IFwiIzE0YzcxNFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLXJldmVhbC1lcnJvclwiOiBcInJnYmEoMjUzLCAxMDEsIDEwMSwgMC43NDUpXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tcmV2ZWFsLW1ldGhvZFwiOiBcIiMyYjJiN2QyZlwiLFxyXG4gICAgICAgICAgICAgICAgXCItLXJldmVhbC1lcnJvcmxpbmUtYmFja2dyb3VuZFwiOiBcInJlZFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLXJldmVhbC1lcnJvci13aG9sZS1saW5lXCI6IFwicmdiYSgyNTUsIDAsIDAsIDAuNTU1KVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLXJldmVhbC1wcm9ncmFtcG9pbnRlclwiOiBcInJnYmEoMTExLCAyMTQsIDI3LCAwLjMzNylcIixcclxuICAgICAgICAgICAgICAgIFwiLS1yZXZlYWwtc3ludGF4ZWxlbWVudFwiOiBcInJnYig4NSw4NSw4NSlcIixcclxuICAgICAgICAgICAgICAgIFwiLS1tYXJnaW4tYnJlYWtwb2ludFwiOiBcInJnYmEoMjU1LCAwLCAwLCAwLjYyMylcIixcclxuICAgICAgICAgICAgICAgIFwiLS1zcGVlZGNvbnRyb2wtYmFyXCI6IFwiIzlkOWQ5ZFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLXNwZWVkY29udHJvbC1ncmlwXCI6IFwiIzU4ODU1NVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLXNwZWVkY29udHJvbC1ncmlwLWhvdmVyXCI6IFwiIzg5ZDE4NVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLXNwZWVkY29udHJvbC1kaXNwbGF5LWJhY2tncm91bmRcIjogXCIjMzgzODM4XCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tc3BlZWRjb250cm9sLWRpc3BsYXktYm9yZGVyXCI6IFwiIzlkOWQ5ZFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWVkaXRvclRvb2x0aXAtYmFja2dyb3VuZFwiOiBcIiMyNTI1MjZcIixcclxuICAgICAgICAgICAgICAgIFwiLS1lZGl0b3JUb29sdGlwLWJvcmRlclwiOiBcIiM0NTQ1NDVcIixcclxuXHJcbiAgICAgICAgICAgICAgICBcIi0tcmVuYW1lSW5wdXQtY29sb3JcIjogXCIjZmZmZmZmXCIsXHJcblxyXG4gICAgICAgICAgICAgICAgLy9ib3R0b21EaXZcclxuICAgICAgICAgICAgICAgIFwiLS1ib3R0b21kaXYtdGFiaGVhZGluZy1ob3ZlclwiOiBcIndoaXRlXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tYm90dG9tZGl2LXRhYmhlYWRpbmctYWN0aXZlXCI6IFwicmdiKDk3LDk3LDI1NSlcIixcclxuICAgICAgICAgICAgICAgIFwiLS1ub0Vycm9yTWVzc2FnZVwiOiBcInJnYigzNywgMjExLCAzNylcIixcclxuICAgICAgICAgICAgICAgIFwiLS1jb25zb2xlLXRvcC1ib3JkZXJib3R0b21cIjogXCIjYzRjNGM0XCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tY29uc29sZS10b3AtYmFja2dyb3VuZFwiOiBcIiMxZTFlMWVcIixcclxuICAgICAgICAgICAgICAgIFwiLS1jb25zb2xlRW50cnktd2l0aEJvcmRlclwiOiBcIiMzMDMwMzBcIixcclxuICAgICAgICAgICAgICAgIFwiLS1jb25zb2xlRW50cnlWYWx1ZVwiOiBcIndoaXRlXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tY29uc29sZUVudHJ5SWRlbnRpZmllclwiOiBcInJnYigxNTYsIDE1NiwgMjM1KVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWNvbnNvbGVFbnRyeU5vVmFsdWVcIjogXCJncmF5XCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tY29uc29sZUVudHJ5Q2FwdGlvblwiOiBcIndoaXRlXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tZXJyb3ItQ2FwdGlvblwiOiBcInJnYigxNjYsIDE2NSwgMTc2KVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWNvbnNvbGUtZXJyb3JcIjogXCJyZ2IoMTU1LCA1MSwgNTEpXCIsXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gRGVidWdnZXJcclxuICAgICAgICAgICAgICAgIFwiLS1kZUlkZW50aWZpZXJcIjogXCJyZ2IoMTU2LCAxNTYsIDIzNSlcIixcclxuICAgICAgICAgICAgICAgIFwiLS1kZVZhbHVlXCI6IFwid2hpdGVcIixcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBIZWxwZXJcclxuICAgICAgICAgICAgICAgIFwiLS1oZWxwZXItYmFja2dyb3VuZC1jb2xvclwiOiBcIiMzODM4MzhcIixcclxuICAgICAgICAgICAgICAgIFwiLS1oZWxwZXItYm9yZGVyLWNvbG9yXCI6IFwiI2Q0ZDRkNFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWFycm93Qm94QnV0dG9uT3V0ZXItYmFja2dyb3VuZFwiOiBcIiM1OWExNWRcIixcclxuICAgICAgICAgICAgICAgIFwiLS1hcnJvd0JveEJ1dHRvbk91dGVyLWJvcmRlclwiOiBcIiMzZDNkM2RcIixcclxuICAgICAgICAgICAgICAgIFwiLS1hcnJvd0JveEJ1dHRvbk91dGVyLWNvbG9yXCI6IFwiYmxhY2tcIixcclxuICAgICAgICAgICAgICAgIFwiLS1hcnJvd0JveEJ1dHRvbk91dGVyLWJ1dHRvbi1ob3ZlclwiOiBcIiM2M2E4NjdcIixcclxuICAgICAgICAgICAgICAgIFwiLS1hcnJvd0JveC1hZnRlclwiOiBcInJnYmEoMTM2LCAxODMsIDIxMywgMClcIixcclxuICAgICAgICAgICAgICAgIFwiLS1hcnJvd0JveC1iZWZvcmVcIjogXCJyZ2JhKDE5NCwgMjI1LCAyNDUsIDApXCIsXHJcblxyXG4gICAgICAgICAgICAgICAgLy9ydW5cclxuICAgICAgICAgICAgICAgIFwiLS1kZWZhdWx0T3V0cHV0Q29sb3JcIjogXCIjZmZmZmZmXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tcnVuSW5wdXRDb2xvclwiOiBcIiNmZmZmZmZcIixcclxuICAgICAgICAgICAgICAgIFwiLS1ydW5CYWNrZ3JvdW5kQ29sb3JcIjogXCJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMilcIixcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGV0IGhpZ2hsaWdodENvbG9yID0gXCIjODA4MGZmXCI7XHJcblxyXG4gICAgICAgIHRoaXMudGhlbWVzLnB1c2goe1xyXG4gICAgICAgICAgICBuYW1lOiBcImxpZ2h0XCIsXHJcbiAgICAgICAgICAgIG1vbmFjb1RoZW1lOiBcIm15Q3VzdG9tVGhlbWVMaWdodFwiLFxyXG4gICAgICAgICAgICBjc3NDb2xvcnM6IHtcclxuICAgICAgICAgICAgICAgIFwiLS1iYWNrZ3JvdW5kRGFya1wiOiBcIndoaXRlXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tYmFja2dyb3VuZExpZ2h0XCI6IFwiI2YzZjNmM1wiLFxyXG4gICAgICAgICAgICAgICAgXCItLWJhY2tncm91bmRIZWFkaW5nXCI6IFwiI2RjZGNkY1wiLFxyXG4gICAgICAgICAgICAgICAgXCItLWJhY2tncm91bmRTZWxlY3RlZFwiOiBcIiNlOGU4ZThcIixcclxuICAgICAgICAgICAgICAgIFwiLS1mb250Q29sb3JOb3JtYWxcIjogXCIjNzU2MTYxXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tZm9udENvbG9yTGlnaHRcIjogXCIjNzU2MTYxXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tc2xpZGVyXCI6IFwiI2IwYjBiMFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWxvZ2luQnV0dG9uQmFja2dyb25kXCI6IFwiIzU5YTE1ZFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWxvZ2luQnV0dG9uRm9udENvbG9yXCI6IFwiIzAwMDAwMFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWxvZ2luTWVzc2FnZUNvbG9yXCI6IFwicmdiKDEyMiwgNDgsIDQ4KVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWxvZ2luQnV0dG9uSG92ZXJcIjogXCIjNjNhODY3XCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tbG9naW5CdXR0b25BY3RpdmVcIjogXCIjOTRmZmQxXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tc2Nyb2xsYmFyXCI6IFwiI2UzZTNlM1wiLFxyXG4gICAgICAgICAgICAgICAgXCItLXNjcm9sbGJhci10aHVtYlwiOiBcIiNiYWJhYmFcIixcclxuICAgICAgICAgICAgICAgIFwiLS1zY3JvbGxiYXItdGh1bWItaG92ZXJcIjogXCIjOGU4ZThlXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tc2Nyb2xsYmFyLXRodW1iLWFjdGl2ZVwiOiBcIiM2MTYxNjFcIixcclxuICAgICAgICAgICAgICAgIFwiLS1zdWJtZW51LWhvdmVyXCI6IGhpZ2hsaWdodENvbG9yLFxyXG4gICAgICAgICAgICAgICAgXCItLXN1Ym1lbnUtY29sb3JcIjogXCIjZmZmZmZmXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tbWVudWl0ZW1zZGl2aWRlclwiOiBcIiNjZmNmY2ZcIixcclxuICAgICAgICAgICAgICAgIFwiLS1maWxlLWhvdmVyXCI6IFwiI2U4ZThlOFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWZpbGUtYWN0aXZlXCI6IGhpZ2hsaWdodENvbG9yLFxyXG4gICAgICAgICAgICAgICAgXCItLWZpbGUtYWN0aXZlLWhvdmVyXCI6IFwiI2EwYTBmZlwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWZpbGUtZXJyb3Jjb3VudFwiOiBcInJlZFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWlucGxhY2UtZWRpdG9yXCI6IFwid2hpdGVcIixcclxuICAgICAgICAgICAgICAgIFwiLS1jb250ZXh0bWVudS1iYWNrZ3JvdW5kXCI6IFwid2hpdGVcIixcclxuICAgICAgICAgICAgICAgIFwiLS1jb250ZXh0bWVudS1jb2xvclwiOiBcIiM3NTYxNjFcIixcclxuICAgICAgICAgICAgICAgIFwiLS1jb250ZXh0bWVudS1ob3Zlci1iYWNrZ3JvdW5kXCI6IGhpZ2hsaWdodENvbG9yLFxyXG4gICAgICAgICAgICAgICAgXCItLWNvbnRleHRtZW51LWhvdmVyLWNvbG9yXCI6IFwiI2EwYTBmZlwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWVycm9yLWZpbGVuYW1lXCI6IFwiI2ZmMDAwMFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWVycm9yLWxpbmUtYXRpdmVcIjogXCIjZmZhMGEwXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tZXJyb3ItbGluZS1ob3ZlclwiOiBcIiNmZmMwYzBcIixcclxuICAgICAgICAgICAgICAgIFwiLS1lcnJvci1wb3NpdGlvblwiOiBcIiM4MDQwNDBcIixcclxuICAgICAgICAgICAgICAgIFwiLS1saW5lY29sdW1uXCI6IFwiIzE0YzcxNFwiLCAvLyBUT0RPXHJcbiAgICAgICAgICAgICAgICBcIi0tcmV2ZWFsLWVycm9yXCI6IFwicmdiYSgyNTMsIDEwMSwgMTAxLCAwLjc0NSlcIixcclxuICAgICAgICAgICAgICAgIFwiLS1yZXZlYWwtbWV0aG9kXCI6IFwiI2JhYmFlYzgwXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tcmV2ZWFsLWVycm9ybGluZS1iYWNrZ3JvdW5kXCI6IFwicmVkXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tcmV2ZWFsLWVycm9yLXdob2xlLWxpbmVcIjogXCJyZ2JhKDI1NSwgMCwgMCwgMC41NTUpXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tcmV2ZWFsLXByb2dyYW1wb2ludGVyXCI6IFwicmdiYSgxMTEsIDIxNCwgMjcsIDAuMzM3KVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLXJldmVhbC1zeW50YXhlbGVtZW50XCI6IFwiI2MwYzBjMFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLW1hcmdpbi1icmVha3BvaW50XCI6IFwicmdiYSgyNTUsIDAsIDAsIDAuNjIzKVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLXNwZWVkY29udHJvbC1iYXJcIjogXCIjOWQ5ZDlkXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tc3BlZWRjb250cm9sLWdyaXBcIjogXCIjNTg4NTU1XCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tc3BlZWRjb250cm9sLWdyaXAtaG92ZXJcIjogXCIjODlkMTg1XCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tc3BlZWRjb250cm9sLWRpc3BsYXktYmFja2dyb3VuZFwiOiBcIiNlMGUwZTBcIixcclxuICAgICAgICAgICAgICAgIFwiLS1zcGVlZGNvbnRyb2wtZGlzcGxheS1ib3JkZXJcIjogXCIjOWQ5ZDlkXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tZWRpdG9yVG9vbHRpcC1iYWNrZ3JvdW5kXCI6IFwiI2UwZTBlMFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWVkaXRvclRvb2x0aXAtYm9yZGVyXCI6IFwiIzlkOWQ5ZFwiLFxyXG5cclxuICAgICAgICAgICAgICAgIFwiLS1yZW5hbWVJbnB1dC1jb2xvclwiOiBcIiMwMDAwMDBcIixcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLy9ib3R0b21EaXZcclxuICAgICAgICAgICAgICAgIFwiLS1ib3R0b21kaXYtdGFiaGVhZGluZy1ob3ZlclwiOiBcIiM0MjQyNDJcIixcclxuICAgICAgICAgICAgICAgIFwiLS1ib3R0b21kaXYtdGFiaGVhZGluZy1hY3RpdmVcIjogXCIjNDI0MjQyXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tbm9FcnJvck1lc3NhZ2VcIjogXCJyZ2IoMTcsIDE4MCwgMTcpXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tY29uc29sZS10b3AtYm9yZGVyYm90dG9tXCI6IFwiI2M0YzRjNFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWNvbnNvbGUtdG9wLWJhY2tncm91bmRcIjogXCJ3aGl0ZVwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWNvbnNvbGVFbnRyeS13aXRoQm9yZGVyXCI6IFwiIzMwMzAzMFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWNvbnNvbGVFbnRyeVZhbHVlXCI6IFwiIzAwMDBhMFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWNvbnNvbGVFbnRyeUlkZW50aWZpZXJcIjogXCJibGFja1wiLFxyXG4gICAgICAgICAgICAgICAgXCItLWNvbnNvbGVFbnRyeU5vVmFsdWVcIjogXCJncmF5XCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tY29uc29sZUVudHJ5Q2FwdGlvblwiOiBcIiM3NTYxNjFcIixcclxuICAgICAgICAgICAgICAgIFwiLS1lcnJvci1DYXB0aW9uXCI6IFwicmdiKDE2NiwgMTY1LCAxNzYpXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tY29uc29sZS1lcnJvclwiOiBcInJnYigxNTUsIDIxLCAyMSlcIixcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBEZWJ1Z2dlclxyXG4gICAgICAgICAgICAgICAgXCItLWRlSWRlbnRpZmllclwiOiBcImJsYWNrXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tZGVWYWx1ZVwiOiBcIiMwMDAwYTBcIixcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBIZWxwZXJcclxuICAgICAgICAgICAgICAgIFwiLS1oZWxwZXItYmFja2dyb3VuZC1jb2xvclwiOiBcIiNmM2YzZjNcIixcclxuICAgICAgICAgICAgICAgIFwiLS1oZWxwZXItYm9yZGVyLWNvbG9yXCI6IFwiIzYwNjA2MFwiLFxyXG4gICAgICAgICAgICAgICAgXCItLWFycm93Qm94QnV0dG9uT3V0ZXItYmFja2dyb3VuZFwiOiBcIiM1OWExNWRcIixcclxuICAgICAgICAgICAgICAgIFwiLS1hcnJvd0JveEJ1dHRvbk91dGVyLWJvcmRlclwiOiBcIiMzZDNkM2RcIixcclxuICAgICAgICAgICAgICAgIFwiLS1hcnJvd0JveEJ1dHRvbk91dGVyLWNvbG9yXCI6IFwiYmxhY2tcIixcclxuICAgICAgICAgICAgICAgIFwiLS1hcnJvd0JveEJ1dHRvbk91dGVyLWJ1dHRvbi1ob3ZlclwiOiBcIiM2M2E4NjdcIixcclxuICAgICAgICAgICAgICAgIFwiLS1hcnJvd0JveC1hZnRlclwiOiBcInJnYmEoMTM2LCAxODMsIDIxMywgMClcIixcclxuICAgICAgICAgICAgICAgIFwiLS1hcnJvd0JveC1iZWZvcmVcIjogXCJyZ2JhKDE5NCwgMjI1LCAyNDUsIDApXCIsXHJcblxyXG4gICAgICAgICAgICAgICAgLy9ydW5cclxuICAgICAgICAgICAgICAgIFwiLS1kZWZhdWx0T3V0cHV0Q29sb3JcIjogXCIjMzAzMDMwXCIsXHJcbiAgICAgICAgICAgICAgICBcIi0tcnVuSW5wdXRDb2xvclwiOiBcIiMwMDAwMDBcIixcclxuICAgICAgICAgICAgICAgIFwiLS1ydW5CYWNrZ3JvdW5kQ29sb3JcIjogXCJyZ2JhKDAsIDAsIDAsIDAuMilcIixcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcblxyXG5cclxuICAgIH1cclxuXHJcblxyXG5cclxuXHJcbn0iXX0=