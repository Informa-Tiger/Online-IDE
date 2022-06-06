import { ajax } from "../communication/AjaxHelper.js";
import { Helper } from "./gui/Helper.js";
import { InterpreterState } from "../interpreter/Interpreter.js";
import { SoundTools } from "../tools/SoundTools.js";
import { UserMenu } from "./gui/UserMenu.js";
import { escapeHtml } from "../tools/StringTools.js";
export class Login {
    constructor(main) {
        this.main = main;
    }
    initGUI(isLoginWithTicket) {
        let that = this;
        if (!isLoginWithTicket) {
            jQuery('#login').css('display', 'flex');
            jQuery('#bitteWarten').css('display', 'none');
            this.startAnimations();
        }
        let $loginSpinner = jQuery('#login-spinner>img');
        jQuery('#login-username').focus();
        jQuery('#login-username').on('keydown', (e) => {
            if (e.key == "Enter") {
                jQuery('#login-password').focus();
            }
        });
        jQuery('#login-password').on('keydown', (e) => {
            if (e.key == "Enter") {
                jQuery('#login-button').trigger('click');
            }
        });
        jQuery('#login-password').on('keydown', (e) => {
            if (e.key == "Tab") {
                e.preventDefault();
                jQuery('#login-button').focus();
                jQuery('#login-button').addClass('jo_active');
            }
            if (e.key == "Enter") {
                jQuery('#login-button').trigger('click');
            }
        });
        jQuery('#login-button').on('keydown', (e) => {
            if (e.key == "Tab") {
                e.preventDefault();
                jQuery('#login-username').focus();
                jQuery('#login-button').removeClass('jo_active');
            }
            else {
                jQuery('#login-button').trigger('click');
            }
        });
        jQuery('#jo_testuser-login-button').on('click', () => {
            jQuery('#login-username').val('Testuser');
            jQuery('#login-password').val('');
            jQuery('#login-button').trigger('click');
        });
        // Avoid double login when user does doubleclick:
        let loginHappened = false;
        jQuery('#login-button').on('click', () => {
            SoundTools.init();
            $loginSpinner.show();
            if (loginHappened)
                return;
            loginHappened = true;
            setTimeout(() => {
                loginHappened = false;
            }, 1000);
            this.sendLoginRequest(null);
        });
        jQuery('#buttonLogout').on('click', () => {
            if (that.main.user.is_testuser) {
                that.showLoginForm();
                return;
            }
            this.main.interpreter.closeAllWebsockets();
            jQuery('#bitteWartenText').html('Bitte warten, der letzte Bearbeitungsstand wird noch gespeichert ...');
            jQuery('#bitteWarten').css('display', 'flex');
            if (this.main.workspacesOwnerId != this.main.user.id) {
                this.main.projectExplorer.onHomeButtonClicked();
            }
            this.main.networkManager.sendUpdates(() => {
                var _a;
                this.main.rightDiv.classDiagram.clearAfterLogout();
                let logoutRequest = {
                    currentWorkspaceId: (_a = this.main.currentWorkspace) === null || _a === void 0 ? void 0 : _a.id
                };
                ajax('logout', logoutRequest, () => {
                    // window.location.href = 'index.html';
                    that.showLoginForm();
                });
            });
            this.main.networkManager.notifierClient.disconnect();
        });
    }
    sendLoginRequest(ticket) {
        let that = this;
        let servlet = "login";
        let loginRequest = {
            username: jQuery('#login-username').val(),
            password: jQuery('#login-password').val(),
            language: 0
        };
        if (ticket != null) {
            servlet = "ticketLogin";
            loginRequest = {
                ticket: ticket,
                language: 0
            };
        }
        ajax(servlet, loginRequest, (response) => {
            if (!response.success) {
                jQuery('#login-message').html('Fehler: Benutzername und/oder Passwort ist falsch.');
                jQuery('#login-spinner>img').hide();
            }
            else {
                // We don't do this anymore for security reasons - see AjaxHelper.ts
                // Alternatively we now set a long expiry interval for cookie.
                // credentials.username = loginRequest.username;
                // credentials.password = loginRequest.password;
                jQuery('#login').hide();
                jQuery('#main').css('visibility', 'visible');
                jQuery('#bitteWartenText').html('Bitte warten ...');
                jQuery('#bitteWarten').css('display', 'flex');
                let user = response.user;
                user.is_testuser = response.isTestuser;
                if (user.settings == null || user.settings.helperHistory == null) {
                    user.settings = {
                        helperHistory: {
                            consoleHelperDone: false,
                            newFileHelperDone: false,
                            newWorkspaceHelperDone: false,
                            speedControlHelperDone: false,
                            homeButtonHelperDone: false,
                            stepButtonHelperDone: false,
                            repositoryButtonDone: false,
                            folderButtonDone: false
                        },
                        viewModes: null,
                        classDiagram: null
                    };
                }
                that.main.user = user;
                this.main.waitForGUICallback = () => {
                    var _a, _b, _c, _d;
                    that.main.mainMenu.initGUI(user, "");
                    jQuery('#bitteWarten').hide();
                    let $loginSpinner = jQuery('#login-spinner>img');
                    $loginSpinner.hide();
                    jQuery('#menupanel-username').html(escapeHtml(user.rufname) + " " + escapeHtml(user.familienname));
                    new UserMenu(that.main).init();
                    if (user.is_teacher) {
                        that.main.initTeacherExplorer(response.classdata);
                    }
                    that.main.workspacesOwnerId = user.id;
                    that.main.restoreWorkspaces(response.workspaces, true);
                    that.main.networkManager.initializeTimer();
                    that.main.projectExplorer.fileListPanel.setFixed(!user.is_teacher);
                    that.main.projectExplorer.workspaceListPanel.setFixed(!user.is_teacher);
                    (_b = (_a = that.main.rightDiv) === null || _a === void 0 ? void 0 : _a.classDiagram) === null || _b === void 0 ? void 0 : _b.clear();
                    if (user.settings.classDiagram != null) {
                        (_d = (_c = that.main.rightDiv) === null || _c === void 0 ? void 0 : _c.classDiagram) === null || _d === void 0 ? void 0 : _d.deserialize(user.settings.classDiagram);
                    }
                    that.main.viewModeController.initViewMode();
                    that.main.bottomDiv.hideHomeworkTab();
                    if (!this.main.user.settings.helperHistory.folderButtonDone && that.main.projectExplorer.workspaceListPanel.elements.length > 5) {
                        Helper.showHelper("folderButton", this.main, jQuery('.img_add-folder-dark'));
                    }
                    that.main.networkManager.initializeNotifierClient();
                };
                if (this.main.startupComplete == 0) {
                    this.main.waitForGUICallback();
                    this.main.waitForGUICallback = null;
                }
            }
        }, (errorMessage) => {
            jQuery('#login-message').html('Login gescheitert: ' + errorMessage);
            jQuery('#login-spinner>img').hide();
        });
    }
    loginWithTicket(ticket) {
        jQuery('#login').hide();
        jQuery('#main').css('visibility', 'visible');
        jQuery('#bitteWartenText').html('Bitte warten ...');
        jQuery('#bitteWarten').css('display', 'flex');
        this.sendLoginRequest(ticket);
    }
    showLoginForm() {
        var _a, _b;
        jQuery('#login').show();
        jQuery('#main').css('visibility', 'hidden');
        jQuery('#bitteWarten').css('display', 'none');
        jQuery('#login-message').empty();
        this.main.interpreter.setState(InterpreterState.not_initialized);
        this.main.getMonacoEditor().setModel(monaco.editor.createModel("", "myJava"));
        this.main.projectExplorer.fileListPanel.clear();
        this.main.projectExplorer.fileListPanel.setCaption('');
        this.main.projectExplorer.workspaceListPanel.clear();
        (_b = (_a = this.main.bottomDiv) === null || _a === void 0 ? void 0 : _a.console) === null || _b === void 0 ? void 0 : _b.clear();
        this.main.interpreter.printManager.clear();
        if (this.main.user.is_teacher) {
            this.main.teacherExplorer.removePanels();
            this.main.teacherExplorer = null;
        }
        this.main.currentWorkspace = null;
        this.main.user = null;
    }
    startAnimations() {
        // let $loginAnimationDiv = $('#jo_login_animations');
        // $loginAnimationDiv.empty();
        // let $gifAnimation = $('<img src="assets/startpage/code_1.gif" class="jo_gif_animation">');
        // $loginAnimationDiv.append($gifAnimation);
        // let left = Math.trunc(Math.random()*(screen.width - 400)) + "px";
        // let top = Math.trunc(Math.random()*(screen.height - 400)) + "px";
        // $gifAnimation.css({
        //     "left": left,
        //     "top": top
        // })
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50L21haW4vTG9naW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3RELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUVyRCxNQUFNLE9BQU8sS0FBSztJQUdkLFlBQW9CLElBQVU7UUFBVixTQUFJLEdBQUosSUFBSSxDQUFNO0lBRTlCLENBQUM7SUFFRCxPQUFPLENBQUMsaUJBQTBCO1FBRTlCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztRQUNoQixJQUFHLENBQUMsaUJBQWlCLEVBQUM7WUFDbEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0MsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1NBQzFCO1FBRUQsSUFBSSxhQUFhLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFakQsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFbEMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxP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OEI7UUFHOUIsNkZBQTZGO1FBQzdGLDRDQUE0QztRQUU1QyxvRUFBb0U7UUFDcEUsb0VBQW9FO1FBRXBFLHNCQUFzQjtRQUN0QixvQkFBb0I7UUFDcEIsaUJBQWlCO1FBQ2pCLEtBQUs7SUFDVCxDQUFDO0NBR0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBhamF4IH0gZnJvbSBcIi4uL2NvbW11bmljYXRpb24vQWpheEhlbHBlci5qc1wiO1xyXG5pbXBvcnQgeyBMb2dpblJlcXVlc3QsIExvZ2luUmVzcG9uc2UsIExvZ291dFJlcXVlc3QsIFRpY2tldExvZ2luUmVxdWVzdCwgVXNlckRhdGEgfSBmcm9tIFwiLi4vY29tbXVuaWNhdGlvbi9EYXRhLmpzXCI7XHJcbmltcG9ydCB7IE1haW4gfSBmcm9tIFwiLi9NYWluLmpzXCI7XHJcbmltcG9ydCB7IEhlbHBlciB9IGZyb20gXCIuL2d1aS9IZWxwZXIuanNcIjtcclxuaW1wb3J0IHsgSW50ZXJwcmV0ZXJTdGF0ZSB9IGZyb20gXCIuLi9pbnRlcnByZXRlci9JbnRlcnByZXRlci5qc1wiO1xyXG5pbXBvcnQgeyB1c2VySW5mbyB9IGZyb20gXCJvc1wiO1xyXG5pbXBvcnQgeyBTb3VuZFRvb2xzIH0gZnJvbSBcIi4uL3Rvb2xzL1NvdW5kVG9vbHMuanNcIjtcclxuaW1wb3J0IHsgVXNlck1lbnUgfSBmcm9tIFwiLi9ndWkvVXNlck1lbnUuanNcIjtcclxuaW1wb3J0IHsgZXNjYXBlSHRtbCB9IGZyb20gXCIuLi90b29scy9TdHJpbmdUb29scy5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIExvZ2luIHtcclxuXHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBtYWluOiBNYWluKSB7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGluaXRHVUkoaXNMb2dpbldpdGhUaWNrZXQ6IGJvb2xlYW4pIHtcclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIGlmKCFpc0xvZ2luV2l0aFRpY2tldCl7XHJcbiAgICAgICAgICAgIGpRdWVyeSgnI2xvZ2luJykuY3NzKCdkaXNwbGF5JywnZmxleCcpO1xyXG4gICAgICAgICAgICBqUXVlcnkoJyNiaXR0ZVdhcnRlbicpLmNzcygnZGlzcGxheScsJ25vbmUnKTtcclxuICAgICAgICAgICAgdGhpcy5zdGFydEFuaW1hdGlvbnMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCAkbG9naW5TcGlubmVyID0galF1ZXJ5KCcjbG9naW4tc3Bpbm5lcj5pbWcnKTtcclxuXHJcbiAgICAgICAgalF1ZXJ5KCcjbG9naW4tdXNlcm5hbWUnKS5mb2N1cygpO1xyXG5cclxuICAgICAgICBqUXVlcnkoJyNsb2dpbi11c2VybmFtZScpLm9uKCdrZXlkb3duJywgKGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGUua2V5ID09IFwiRW50ZXJcIikge1xyXG4gICAgICAgICAgICAgICAgalF1ZXJ5KCcjbG9naW4tcGFzc3dvcmQnKS5mb2N1cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGpRdWVyeSgnI2xvZ2luLXBhc3N3b3JkJykub24oJ2tleWRvd24nLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZS5rZXkgPT0gXCJFbnRlclwiKSB7XHJcbiAgICAgICAgICAgICAgICBqUXVlcnkoJyNsb2dpbi1idXR0b24nKS50cmlnZ2VyKCdjbGljaycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGpRdWVyeSgnI2xvZ2luLXBhc3N3b3JkJykub24oJ2tleWRvd24nLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZS5rZXkgPT0gXCJUYWJcIikge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgalF1ZXJ5KCcjbG9naW4tYnV0dG9uJykuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnI2xvZ2luLWJ1dHRvbicpLmFkZENsYXNzKCdqb19hY3RpdmUnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZS5rZXkgPT0gXCJFbnRlclwiKSB7XHJcbiAgICAgICAgICAgICAgICBqUXVlcnkoJyNsb2dpbi1idXR0b24nKS50cmlnZ2VyKCdjbGljaycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGpRdWVyeSgnI2xvZ2luLWJ1dHRvbicpLm9uKCdrZXlkb3duJywgKGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGUua2V5ID09IFwiVGFiXCIpIHtcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnI2xvZ2luLXVzZXJuYW1lJykuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnI2xvZ2luLWJ1dHRvbicpLnJlbW92ZUNsYXNzKCdqb19hY3RpdmUnKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnI2xvZ2luLWJ1dHRvbicpLnRyaWdnZXIoJ2NsaWNrJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgIGpRdWVyeSgnI2pvX3Rlc3R1c2VyLWxvZ2luLWJ1dHRvbicpLm9uKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgalF1ZXJ5KCcjbG9naW4tdXNlcm5hbWUnKS52YWwoJ1Rlc3R1c2VyJyk7XHJcbiAgICAgICAgICAgIGpRdWVyeSgnI2xvZ2luLXBhc3N3b3JkJykudmFsKCcnKTtcclxuICAgICAgICAgICAgalF1ZXJ5KCcjbG9naW4tYnV0dG9uJykudHJpZ2dlcignY2xpY2snKTtcclxuXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgLy8gQXZvaWQgZG91YmxlIGxvZ2luIHdoZW4gdXNlciBkb2VzIGRvdWJsZWNsaWNrOlxyXG4gICAgICAgIGxldCBsb2dpbkhhcHBlbmVkID0gZmFsc2U7XHJcbiAgICAgICAgalF1ZXJ5KCcjbG9naW4tYnV0dG9uJykub24oJ2NsaWNrJywgKCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgU291bmRUb29scy5pbml0KCk7XHJcblxyXG4gICAgICAgICAgICAkbG9naW5TcGlubmVyLnNob3coKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChsb2dpbkhhcHBlbmVkKSByZXR1cm47XHJcbiAgICAgICAgICAgIGxvZ2luSGFwcGVuZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsb2dpbkhhcHBlbmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0sIDEwMDApO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZW5kTG9naW5SZXF1ZXN0KG51bGwpO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgalF1ZXJ5KCcjYnV0dG9uTG9nb3V0Jykub24oJ2NsaWNrJywgKCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgaWYodGhhdC5tYWluLnVzZXIuaXNfdGVzdHVzZXIpe1xyXG4gICAgICAgICAgICAgICAgdGhhdC5zaG93TG9naW5Gb3JtKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMubWFpbi5pbnRlcnByZXRlci5jbG9zZUFsbFdlYnNvY2tldHMoKTtcclxuXHJcbiAgICAgICAgICAgIGpRdWVyeSgnI2JpdHRlV2FydGVuVGV4dCcpLmh0bWwoJ0JpdHRlIHdhcnRlbiwgZGVyIGxldHp0ZSBCZWFyYmVpdHVuZ3NzdGFuZCB3aXJkIG5vY2ggZ2VzcGVpY2hlcnQgLi4uJyk7XHJcbiAgICAgICAgICAgIGpRdWVyeSgnI2JpdHRlV2FydGVuJykuY3NzKCdkaXNwbGF5JywgJ2ZsZXgnKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm1haW4ud29ya3NwYWNlc093bmVySWQgIT0gdGhpcy5tYWluLnVzZXIuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5wcm9qZWN0RXhwbG9yZXIub25Ib21lQnV0dG9uQ2xpY2tlZCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1haW4ubmV0d29ya01hbmFnZXIuc2VuZFVwZGF0ZXMoKCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi5yaWdodERpdi5jbGFzc0RpYWdyYW0uY2xlYXJBZnRlckxvZ291dCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBsb2dvdXRSZXF1ZXN0OiBMb2dvdXRSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRXb3Jrc3BhY2VJZDogdGhpcy5tYWluLmN1cnJlbnRXb3Jrc3BhY2U/LmlkXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgYWpheCgnbG9nb3V0JywgbG9nb3V0UmVxdWVzdCwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJ2luZGV4Lmh0bWwnO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3dMb2dpbkZvcm0oKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1haW4ubmV0d29ya01hbmFnZXIubm90aWZpZXJDbGllbnQuZGlzY29ubmVjdCgpO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNlbmRMb2dpblJlcXVlc3QodGlja2V0OiBzdHJpbmcpe1xyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgbGV0IHNlcnZsZXQgPSBcImxvZ2luXCI7XHJcblxyXG4gICAgICAgIGxldCBsb2dpblJlcXVlc3Q6IExvZ2luUmVxdWVzdHxUaWNrZXRMb2dpblJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIHVzZXJuYW1lOiA8c3RyaW5nPmpRdWVyeSgnI2xvZ2luLXVzZXJuYW1lJykudmFsKCksXHJcbiAgICAgICAgICAgIHBhc3N3b3JkOiA8c3RyaW5nPmpRdWVyeSgnI2xvZ2luLXBhc3N3b3JkJykudmFsKCksXHJcbiAgICAgICAgICAgIGxhbmd1YWdlOiAwXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0aWNrZXQgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgIHNlcnZsZXQgPSBcInRpY2tldExvZ2luXCI7XHJcbiAgICAgICAgICAgIGxvZ2luUmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgICAgIHRpY2tldDogdGlja2V0LFxyXG4gICAgICAgICAgICAgICAgbGFuZ3VhZ2U6IDBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWpheChzZXJ2bGV0LCBsb2dpblJlcXVlc3QsIChyZXNwb25zZTogTG9naW5SZXNwb25zZSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICBqUXVlcnkoJyNsb2dpbi1tZXNzYWdlJykuaHRtbCgnRmVobGVyOiBCZW51dHplcm5hbWUgdW5kL29kZXIgUGFzc3dvcnQgaXN0IGZhbHNjaC4nKTtcclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnI2xvZ2luLXNwaW5uZXI+aW1nJykuaGlkZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IGRvIHRoaXMgYW55bW9yZSBmb3Igc2VjdXJpdHkgcmVhc29ucyAtIHNlZSBBamF4SGVscGVyLnRzXHJcbiAgICAgICAgICAgICAgICAvLyBBbHRlcm5hdGl2ZWx5IHdlIG5vdyBzZXQgYSBsb25nIGV4cGlyeSBpbnRlcnZhbCBmb3IgY29va2llLlxyXG4gICAgICAgICAgICAgICAgLy8gY3JlZGVudGlhbHMudXNlcm5hbWUgPSBsb2dpblJlcXVlc3QudXNlcm5hbWU7XHJcbiAgICAgICAgICAgICAgICAvLyBjcmVkZW50aWFscy5wYXNzd29yZCA9IGxvZ2luUmVxdWVzdC5wYXNzd29yZDtcclxuXHJcbiAgICAgICAgICAgICAgICBqUXVlcnkoJyNsb2dpbicpLmhpZGUoKTtcclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnI21haW4nKS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xyXG5cclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnI2JpdHRlV2FydGVuVGV4dCcpLmh0bWwoJ0JpdHRlIHdhcnRlbiAuLi4nKTtcclxuICAgICAgICAgICAgICAgIGpRdWVyeSgnI2JpdHRlV2FydGVuJykuY3NzKCdkaXNwbGF5JywgJ2ZsZXgnKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdXNlcjogVXNlckRhdGEgPSByZXNwb25zZS51c2VyO1xyXG4gICAgICAgICAgICAgICAgdXNlci5pc190ZXN0dXNlciA9IHJlc3BvbnNlLmlzVGVzdHVzZXI7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHVzZXIuc2V0dGluZ3MgPT0gbnVsbCB8fCB1c2VyLnNldHRpbmdzLmhlbHBlckhpc3RvcnkgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHVzZXIuc2V0dGluZ3MgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlbHBlckhpc3Rvcnk6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGVIZWxwZXJEb25lOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0ZpbGVIZWxwZXJEb25lOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1dvcmtzcGFjZUhlbHBlckRvbmU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BlZWRDb250cm9sSGVscGVyRG9uZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob21lQnV0dG9uSGVscGVyRG9uZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGVwQnV0dG9uSGVscGVyRG9uZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvc2l0b3J5QnV0dG9uRG9uZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb2xkZXJCdXR0b25Eb25lOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3TW9kZXM6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzRGlhZ3JhbTogbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgdGhhdC5tYWluLnVzZXIgPSB1c2VyO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMubWFpbi53YWl0Rm9yR1VJQ2FsbGJhY2sgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5tYWluLm1haW5NZW51LmluaXRHVUkodXNlciwgXCJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgalF1ZXJ5KCcjYml0dGVXYXJ0ZW4nKS5oaWRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0ICRsb2dpblNwaW5uZXIgPSBqUXVlcnkoJyNsb2dpbi1zcGlubmVyPmltZycpO1xyXG4gICAgICAgICAgICAgICAgICAgICRsb2dpblNwaW5uZXIuaGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGpRdWVyeSgnI21lbnVwYW5lbC11c2VybmFtZScpLmh0bWwoZXNjYXBlSHRtbCh1c2VyLnJ1Zm5hbWUpICsgXCIgXCIgKyBlc2NhcGVIdG1sKHVzZXIuZmFtaWxpZW5uYW1lKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IFVzZXJNZW51KHRoYXQubWFpbikuaW5pdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh1c2VyLmlzX3RlYWNoZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tYWluLmluaXRUZWFjaGVyRXhwbG9yZXIocmVzcG9uc2UuY2xhc3NkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQubWFpbi53b3Jrc3BhY2VzT3duZXJJZCA9IHVzZXIuaWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5tYWluLnJlc3RvcmVXb3Jrc3BhY2VzKHJlc3BvbnNlLndvcmtzcGFjZXMsIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm1haW4ubmV0d29ya01hbmFnZXIuaW5pdGlhbGl6ZVRpbWVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQubWFpbi5wcm9qZWN0RXhwbG9yZXIuZmlsZUxpc3RQYW5lbC5zZXRGaXhlZCghdXNlci5pc190ZWFjaGVyKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm1haW4ucHJvamVjdEV4cGxvcmVyLndvcmtzcGFjZUxpc3RQYW5lbC5zZXRGaXhlZCghdXNlci5pc190ZWFjaGVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5tYWluLnJpZ2h0RGl2Py5jbGFzc0RpYWdyYW0/LmNsZWFyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh1c2VyLnNldHRpbmdzLmNsYXNzRGlhZ3JhbSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubWFpbi5yaWdodERpdj8uY2xhc3NEaWFncmFtPy5kZXNlcmlhbGl6ZSh1c2VyLnNldHRpbmdzLmNsYXNzRGlhZ3JhbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm1haW4udmlld01vZGVDb250cm9sbGVyLmluaXRWaWV3TW9kZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQubWFpbi5ib3R0b21EaXYuaGlkZUhvbWV3b3JrVGFiKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm1haW4udXNlci5zZXR0aW5ncy5oZWxwZXJIaXN0b3J5LmZvbGRlckJ1dHRvbkRvbmUgJiYgdGhhdC5tYWluLnByb2plY3RFeHBsb3Jlci53b3Jrc3BhY2VMaXN0UGFuZWwuZWxlbWVudHMubGVuZ3RoID4gNSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgSGVscGVyLnNob3dIZWxwZXIoXCJmb2xkZXJCdXR0b25cIiwgdGhpcy5tYWluLCBqUXVlcnkoJy5pbWdfYWRkLWZvbGRlci1kYXJrJykpO1xyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm1haW4ubmV0d29ya01hbmFnZXIuaW5pdGlhbGl6ZU5vdGlmaWVyQ2xpZW50KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1haW4uc3RhcnR1cENvbXBsZXRlID09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW4ud2FpdEZvckdVSUNhbGxiYWNrKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWluLndhaXRGb3JHVUlDYWxsYmFjayA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0sIChlcnJvck1lc3NhZ2U6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICBqUXVlcnkoJyNsb2dpbi1tZXNzYWdlJykuaHRtbCgnTG9naW4gZ2VzY2hlaXRlcnQ6ICcgKyBlcnJvck1lc3NhZ2UpO1xyXG4gICAgICAgICAgICBqUXVlcnkoJyNsb2dpbi1zcGlubmVyPmltZycpLmhpZGUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbG9naW5XaXRoVGlja2V0KHRpY2tldDogc3RyaW5nKSB7XHJcbiAgICAgICAgalF1ZXJ5KCcjbG9naW4nKS5oaWRlKCk7XHJcbiAgICAgICAgalF1ZXJ5KCcjbWFpbicpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XHJcblxyXG4gICAgICAgIGpRdWVyeSgnI2JpdHRlV2FydGVuVGV4dCcpLmh0bWwoJ0JpdHRlIHdhcnRlbiAuLi4nKTtcclxuICAgICAgICBqUXVlcnkoJyNiaXR0ZVdhcnRlbicpLmNzcygnZGlzcGxheScsICdmbGV4Jyk7XHJcbiAgICAgICAgdGhpcy5zZW5kTG9naW5SZXF1ZXN0KHRpY2tldCk7XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwcml2YXRlIHNob3dMb2dpbkZvcm0oKXtcclxuICAgICAgICBqUXVlcnkoJyNsb2dpbicpLnNob3coKTtcclxuICAgICAgICBqUXVlcnkoJyNtYWluJykuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xyXG4gICAgICAgIGpRdWVyeSgnI2JpdHRlV2FydGVuJykuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICBqUXVlcnkoJyNsb2dpbi1tZXNzYWdlJykuZW1wdHkoKTtcclxuICAgICAgICB0aGlzLm1haW4uaW50ZXJwcmV0ZXIuc2V0U3RhdGUoSW50ZXJwcmV0ZXJTdGF0ZS5ub3RfaW5pdGlhbGl6ZWQpO1xyXG4gICAgICAgIHRoaXMubWFpbi5nZXRNb25hY29FZGl0b3IoKS5zZXRNb2RlbChtb25hY28uZWRpdG9yLmNyZWF0ZU1vZGVsKFwiXCIsIFwibXlKYXZhXCIpKTtcclxuICAgICAgICB0aGlzLm1haW4ucHJvamVjdEV4cGxvcmVyLmZpbGVMaXN0UGFuZWwuY2xlYXIoKTtcclxuICAgICAgICB0aGlzLm1haW4ucHJvamVjdEV4cGxvcmVyLmZpbGVMaXN0UGFuZWwuc2V0Q2FwdGlvbignJyk7XHJcbiAgICAgICAgdGhpcy5tYWluLnByb2plY3RFeHBsb3Jlci53b3Jrc3BhY2VMaXN0UGFuZWwuY2xlYXIoKTtcclxuICAgICAgICB0aGlzLm1haW4uYm90dG9tRGl2Py5jb25zb2xlPy5jbGVhcigpO1xyXG4gICAgICAgIHRoaXMubWFpbi5pbnRlcnByZXRlci5wcmludE1hbmFnZXIuY2xlYXIoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubWFpbi51c2VyLmlzX3RlYWNoZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5tYWluLnRlYWNoZXJFeHBsb3Jlci5yZW1vdmVQYW5lbHMoKTtcclxuICAgICAgICAgICAgdGhpcy5tYWluLnRlYWNoZXJFeHBsb3JlciA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1haW4uY3VycmVudFdvcmtzcGFjZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5tYWluLnVzZXIgPSBudWxsO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgc3RhcnRBbmltYXRpb25zKCkge1xyXG4gICAgICAgIC8vIGxldCAkbG9naW5BbmltYXRpb25EaXYgPSAkKCcjam9fbG9naW5fYW5pbWF0aW9ucycpO1xyXG4gICAgICAgIC8vICRsb2dpbkFuaW1hdGlvbkRpdi5lbXB0eSgpO1xyXG5cclxuXHJcbiAgICAgICAgLy8gbGV0ICRnaWZBbmltYXRpb24gPSAkKCc8aW1nIHNyYz1cImFzc2V0cy9zdGFydHBhZ2UvY29kZV8xLmdpZlwiIGNsYXNzPVwiam9fZ2lmX2FuaW1hdGlvblwiPicpO1xyXG4gICAgICAgIC8vICRsb2dpbkFuaW1hdGlvbkRpdi5hcHBlbmQoJGdpZkFuaW1hdGlvbik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gbGV0IGxlZnQgPSBNYXRoLnRydW5jKE1hdGgucmFuZG9tKCkqKHNjcmVlbi53aWR0aCAtIDQwMCkpICsgXCJweFwiO1xyXG4gICAgICAgIC8vIGxldCB0b3AgPSBNYXRoLnRydW5jKE1hdGgucmFuZG9tKCkqKHNjcmVlbi5oZWlnaHQgLSA0MDApKSArIFwicHhcIjtcclxuXHJcbiAgICAgICAgLy8gJGdpZkFuaW1hdGlvbi5jc3Moe1xyXG4gICAgICAgIC8vICAgICBcImxlZnRcIjogbGVmdCxcclxuICAgICAgICAvLyAgICAgXCJ0b3BcIjogdG9wXHJcbiAgICAgICAgLy8gfSlcclxuICAgIH1cclxuXHJcblxyXG59Il19