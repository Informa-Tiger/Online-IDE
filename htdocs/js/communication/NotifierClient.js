import { ajax } from "./AjaxHelper.js";
export class NotifierClient {
    constructor(main, networkManager) {
        this.main = main;
        this.networkManager = networkManager;
        this.unsentMessages = [];
        this.connect();
    }
    connect() {
        this.state = "connecting";
        ajax('getWebSocketToken', {}, (response) => {
            let url = (window.location.protocol.startsWith("https") ? "wss://" : "ws://") + window.location.host + "/servlet/subscriptionwebsocket";
            this.connection = new WebSocket(url);
            this.connection.onerror = (error) => { this.onError(error); };
            this.connection.onclose = (event) => { this.onClose(event); };
            this.connection.onmessage = (event) => { this.onMessage(event); };
            this.connection.onopen = (event) => {
                let request = {
                    command: 1,
                    token: response.token
                };
                this.state = "connected";
                this.sendIntern(JSON.stringify(request));
            };
            let that = this;
            setTimeout(() => {
                if (this.state != "subscribed") {
                    this.networkManager.forcedUpdateEvery = 1;
                    this.networkManager.counterTillForcedUpdate = 1;
                }
            }, 7000);
        });
    }
    disconnect() {
        let request = {
            command: 2 // "disconnect"
        };
        this.state = "connected";
        this.sendIntern(JSON.stringify(request));
    }
    sendIntern(message) {
        if (this.state != "disconnected") {
            try {
                this.connection.send(message);
            }
            catch (exception) {
                console.log(exception);
            }
        }
    }
    onClose(event) {
        this.state = "disconnected";
    }
    onMessage(event) {
        let response = JSON.parse(event.data);
        if (response.command == undefined)
            return;
        // 1 == Acknoledge Connection, 2 == Notify, 3 == disconnect, 4 == keep alive response
        switch (response.command) {
            case 1: // Acknoledge Connection
                this.state = "subscribed";
                break;
            case 2: // Notify
                this.networkManager.sendUpdates(() => { }, true);
                break;
            case 3: // disconnect
                this.state = "disconnected";
                break;
            case 4: // keep alive response
                break;
        }
    }
    onError(error) {
        console.log("Fehler beim Notifier-Websocket");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTm90aWZpZXJDbGllbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50L2NvbW11bmljYXRpb24vTm90aWZpZXJDbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBZ0J2QyxNQUFNLE9BQU8sY0FBYztJQUt2QixZQUFvQixJQUFVLEVBQVUsY0FBOEI7UUFBbEQsU0FBSSxHQUFKLElBQUksQ0FBTTtRQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQWdEdEUsbUJBQWMsR0FBYSxFQUFFLENBQUM7UUEvQzFCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRUQsT0FBTztRQUNILElBQUksQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDO1FBRTFCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFtQyxFQUFFLEVBQUU7WUFFbEUsSUFBSSxHQUFHLEdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsZ0NBQWdDLENBQUM7WUFDaEosSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVyQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxDQUFDLEtBQVksRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxDQUFDLEtBQWlCLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDekUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxLQUFtQixFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRS9FLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsS0FBWSxFQUFFLEVBQUU7Z0JBQ3RDLElBQUksT0FBTyxHQUFrQztvQkFDekMsT0FBTyxFQUFFLENBQUM7b0JBQ1YsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO2lCQUN4QixDQUFBO2dCQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO2dCQUN6QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUU3QyxDQUFDLENBQUE7WUFFRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7WUFDaEIsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDWixJQUFHLElBQUksQ0FBQyxLQUFLLElBQUksWUFBWSxFQUFDO29CQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQztvQkFDMUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsR0FBRyxDQUFDLENBQUM7aUJBQ25EO1lBQ0wsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsVUFBVTtRQUNOLElBQUksT0FBTyxHQUFrQztZQUN6QyxPQUFPLEVBQUUsQ0FBQyxDQUFHLGVBQWU7U0FDL0IsQ0FBQTtRQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBRTdDLENBQUM7SUFHRCxVQUFVLENBQUMsT0FBZTtRQUV0QixJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksY0FBYyxFQUFFO1lBQzlCLElBQUk7Z0JBQ0EsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDakM7WUFBQyxPQUFPLFNBQVMsRUFBRTtnQkFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUMxQjtTQUNKO0lBQ0wsQ0FBQztJQUVELE9BQU8sQ0FBQyxLQUFpQjtRQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsU0FBUyxDQUFDLEtBQW1CO1FBRXpCLElBQUksUUFBUSxHQUFrQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyRSxJQUFJLFFBQVEsQ0FBQyxPQUFPLElBQUksU0FBUztZQUFFLE9BQU87UUFFMUMscUZBQXFGO1FBQ3JGLFFBQVEsUUFBUSxDQUFDLE9BQU8sRUFBRTtZQUN0QixLQUFLLENBQUMsRUFBRSx3QkFBd0I7Z0JBQzVCLElBQUksQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDO2dCQUMxQixNQUFNO1lBQ1YsS0FBSyxDQUFDLEVBQUUsU0FBUztnQkFDYixJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ2hELE1BQU07WUFDVixLQUFLLENBQUMsRUFBRSxhQUFhO2dCQUNqQixJQUFJLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQztnQkFDNUIsTUFBTTtZQUNWLEtBQUssQ0FBQyxFQUFFLHNCQUFzQjtnQkFDMUIsTUFBTTtTQUNiO0lBQ0wsQ0FBQztJQUVELE9BQU8sQ0FBQyxLQUFZO1FBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNYWluIH0gZnJvbSBcIi4uL21haW4vTWFpbi5qc1wiO1xyXG5pbXBvcnQgeyBhamF4IH0gZnJvbSBcIi4vQWpheEhlbHBlci5qc1wiO1xyXG5pbXBvcnQgeyBHZXRXZWJTb2NrZXRUb2tlblJlc3BvbnNlIH0gZnJvbSBcIi4vRGF0YS5qc1wiO1xyXG5pbXBvcnQgeyBOZXR3b3JrTWFuYWdlciB9IGZyb20gXCIuL05ldHdvcmtNYW5hZ2VyLmpzXCI7XHJcblxyXG50eXBlIFN1YnNjcmlwdGlvbk1lc3NhZ2VGcm9tQ2xpZW50ID0ge1xyXG4gICAgY29tbWFuZDogbnVtYmVyLCAgLy8gMSA9PSBcInN1YnNjcmliZVwiLCAyID09IFwiZGlzY29ubmVjdFwiXHJcbiAgICAvLyAzID09IFwia2VlcGFsaXZlIHJlcXVlc3RcIlxyXG4gICAgdG9rZW4/OiBzdHJpbmcgICAvLyB3aGVuIFwic3Vic2NyaWJlXCJcclxufVxyXG5cclxudHlwZSBTdWJzY3JpcHRpb25NZXNzYWdlRnJvbVNlcnZlciA9IHtcclxuICAgIGNvbW1hbmQ6IG51bWJlciAvLyAxID09IEFja25vbGVkZ2UgQ29ubmVjdGlvbiwgMiA9PSBOb3RpZnksIDMgPT0gZGlzY29ubmVjdCwgNCA9PSBrZWVwIGFsaXZlIHJlc3BvbnNlXHJcbn1cclxuXHJcbnR5cGUgTm90aWZpZXJTdGF0ZSA9IFwiY29ubmVjdGluZ1wiIHwgXCJjb25uZWN0ZWRcIiB8IFwic3Vic2NyaWJlZFwiIHwgXCJkaXNjb25uZWN0ZWRcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBOb3RpZmllckNsaWVudCB7XHJcblxyXG4gICAgY29ubmVjdGlvbjogV2ViU29ja2V0O1xyXG4gICAgc3RhdGU6IE5vdGlmaWVyU3RhdGU7XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBtYWluOiBNYWluLCBwcml2YXRlIG5ldHdvcmtNYW5hZ2VyOiBOZXR3b3JrTWFuYWdlcil7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29ubmVjdCgpIHtcclxuICAgICAgICB0aGlzLnN0YXRlID0gXCJjb25uZWN0aW5nXCI7XHJcblxyXG4gICAgICAgIGFqYXgoJ2dldFdlYlNvY2tldFRva2VuJywge30sIChyZXNwb25zZTogR2V0V2ViU29ja2V0VG9rZW5SZXNwb25zZSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgbGV0IHVybDogc3RyaW5nID0gKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbC5zdGFydHNXaXRoKFwiaHR0cHNcIikgPyBcIndzczovL1wiIDogXCJ3czovL1wiKSArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgXCIvc2VydmxldC9zdWJzY3JpcHRpb253ZWJzb2NrZXRcIjtcclxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uID0gbmV3IFdlYlNvY2tldCh1cmwpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLm9uZXJyb3IgPSAoZXJyb3I6IEV2ZW50KSA9PiB7IHRoaXMub25FcnJvcihlcnJvcik7IH1cclxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLm9uY2xvc2UgPSAoZXZlbnQ6IENsb3NlRXZlbnQpID0+IHsgdGhpcy5vbkNsb3NlKGV2ZW50KTsgfVxyXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24ub25tZXNzYWdlID0gKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHsgdGhpcy5vbk1lc3NhZ2UoZXZlbnQpOyB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24ub25vcGVuID0gKGV2ZW50OiBFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3Q6IFN1YnNjcmlwdGlvbk1lc3NhZ2VGcm9tQ2xpZW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmQ6IDEsICAgLy8gXCJzdWJzY3JpYmVcIlxyXG4gICAgICAgICAgICAgICAgICAgIHRva2VuOiByZXNwb25zZS50b2tlblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBcImNvbm5lY3RlZFwiO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kSW50ZXJuKEpTT04uc3RyaW5naWZ5KHJlcXVlc3QpKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZih0aGlzLnN0YXRlICE9IFwic3Vic2NyaWJlZFwiKXtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5ldHdvcmtNYW5hZ2VyLmZvcmNlZFVwZGF0ZUV2ZXJ5ID0gMTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5ldHdvcmtNYW5hZ2VyLmNvdW50ZXJUaWxsRm9yY2VkVXBkYXRlID0gMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgNzAwMCk7XHJcblxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGRpc2Nvbm5lY3QoKXtcclxuICAgICAgICBsZXQgcmVxdWVzdDogU3Vic2NyaXB0aW9uTWVzc2FnZUZyb21DbGllbnQgPSB7XHJcbiAgICAgICAgICAgIGNvbW1hbmQ6IDIgICAvLyBcImRpc2Nvbm5lY3RcIlxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IFwiY29ubmVjdGVkXCI7XHJcbiAgICAgICAgdGhpcy5zZW5kSW50ZXJuKEpTT04uc3RyaW5naWZ5KHJlcXVlc3QpKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdW5zZW50TWVzc2FnZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICBzZW5kSW50ZXJuKG1lc3NhZ2U6IHN0cmluZykge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPSBcImRpc2Nvbm5lY3RlZFwiKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZChtZXNzYWdlKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhleGNlcHRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG9uQ2xvc2UoZXZlbnQ6IENsb3NlRXZlbnQpIHtcclxuICAgICAgICB0aGlzLnN0YXRlID0gXCJkaXNjb25uZWN0ZWRcIjtcclxuICAgIH1cclxuXHJcbiAgICBvbk1lc3NhZ2UoZXZlbnQ6IE1lc3NhZ2VFdmVudCkge1xyXG5cclxuICAgICAgICBsZXQgcmVzcG9uc2U6IFN1YnNjcmlwdGlvbk1lc3NhZ2VGcm9tQ2xpZW50ID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTtcclxuICAgICAgICBpZiAocmVzcG9uc2UuY29tbWFuZCA9PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgLy8gMSA9PSBBY2tub2xlZGdlIENvbm5lY3Rpb24sIDIgPT0gTm90aWZ5LCAzID09IGRpc2Nvbm5lY3QsIDQgPT0ga2VlcCBhbGl2ZSByZXNwb25zZVxyXG4gICAgICAgIHN3aXRjaCAocmVzcG9uc2UuY29tbWFuZCkge1xyXG4gICAgICAgICAgICBjYXNlIDE6IC8vIEFja25vbGVkZ2UgQ29ubmVjdGlvblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFwic3Vic2NyaWJlZFwiO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMjogLy8gTm90aWZ5XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5ldHdvcmtNYW5hZ2VyLnNlbmRVcGRhdGVzKCgpID0+IHt9LCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDM6IC8vIGRpc2Nvbm5lY3RcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBcImRpc2Nvbm5lY3RlZFwiO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgNDogLy8ga2VlcCBhbGl2ZSByZXNwb25zZVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG9uRXJyb3IoZXJyb3I6IEV2ZW50KSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJGZWhsZXIgYmVpbSBOb3RpZmllci1XZWJzb2NrZXRcIik7XHJcbiAgICB9XHJcblxyXG59Il19