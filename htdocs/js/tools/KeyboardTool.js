import { InterpreterState } from "../interpreter/Interpreter.js";
export class KeyboardTool {
    constructor(element, main) {
        this.main = main;
        this.pressedKeys = {};
        this.keyPressedCallbacks = [];
        this.keyUpCallbacks = [];
        this.keyDownCallbacks = [];
        this.registerListeners(element);
    }
    unregisterListeners() {
        this.element.off("keydown");
        this.element.off("keyup");
        this.element.off("keypressed");
    }
    registerListeners(element) {
        this.element = element;
        let that = this;
        element.on("keydown", (e) => {
            let key = e.key;
            if (key == null)
                return true;
            // if(e.shiftKey) key = "shift+" + key;
            // if(e.ctrlKey) key = "ctrl+" + key;
            // if(e.altKey) key = "alt+" + key;
            that.pressedKeys[key.toLowerCase()] = true;
            for (let kpc of that.keyDownCallbacks) {
                kpc(key);
            }
            // prevent <html>-Element from scrolling in embedded mode
            if (this.main.isEmbedded() && this.main.getInterpreter().state == InterpreterState.running && !this.main.getMonacoEditor().hasTextFocus()) {
                if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) >= 0)
                    e.preventDefault();
            }
            return true;
        });
        element.on("keyup", (e) => {
            let key = e.key;
            if (key == null)
                return true;
            if (typeof key == "undefined")
                return;
            // if(e.shiftKey) key = "shift+" + key;
            // if(e.ctrlKey) key = "ctrl+" + key;
            // if(e.altKey) key = "alt+" + key;
            that.pressedKeys[key.toLowerCase()] = false;
            for (let kpc of that.keyUpCallbacks) {
                kpc(key);
            }
            // in ActionManager.init there is a 
            // if(that.main.isEmbedded && key == " "){
            //     for(let kpc of that.keyPressedCallbacks){
            //         kpc(key);
            //     }    
            // }
            return true;
        });
        element.on("keyup", (e) => {
            let k = e.key;
            if (e.shiftKey && k.length > 1) {
                k = "[shift]+" + k;
            }
            if (e.ctrlKey && k.length > 1) {
                k = "[ctrl]+" + k;
            }
            if (e.altKey && k.length > 1) {
                k = "[alt]+" + k;
            }
            for (let kpc of that.keyPressedCallbacks) {
                kpc(k);
            }
            return true;
        });
    }
    isPressed(key) {
        if (key == null)
            return null;
        return this.pressedKeys[key.toLowerCase()] == true;
    }
    unsubscribeAllListeners() {
        this.keyPressedCallbacks = [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiS2V5Ym9hcmRUb29sLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudC90b29scy9LZXlib2FyZFRvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHakUsTUFBTSxPQUFPLFlBQVk7SUFVckIsWUFBWSxPQUFvQixFQUFVLElBQWM7UUFBZCxTQUFJLEdBQUosSUFBSSxDQUFVO1FBTnhELGdCQUFXLEdBQTZCLEVBQUUsQ0FBQztRQUUzQyx3QkFBbUIsR0FBOEIsRUFBRSxDQUFDO1FBQ3BELG1CQUFjLEdBQThCLEVBQUUsQ0FBQztRQUMvQyxxQkFBZ0IsR0FBOEIsRUFBRSxDQUFDO1FBRzdDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsbUJBQW1CO1FBQ2YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVPLGlCQUFpQixDQUFDLE9BQW9CO1FBQzFDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztRQUNoQixPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDaEIsSUFBRyxHQUFHLElBQUksSUFBSTtnQkFBRSxPQUFPLElBQUksQ0FBQztZQUM1Qix1Q0FBdUM7WUFDdkMscUNBQXFDO1lBQ3JDLG1DQUFtQztZQUNuQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztZQUUzQyxLQUFJLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBQztnQkFDakMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ1o7WUFFRCx5REFBeUQ7WUFDekQsSUFBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsS0FBSyxJQUFJLGdCQUFnQixDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsWUFBWSxFQUFFLEVBQUM7Z0JBQ3JJLElBQUcsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7b0JBQzFFLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQzthQUN0QjtZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0QixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ2hCLElBQUcsR0FBRyxJQUFJLElBQUk7Z0JBQUUsT0FBTyxJQUFJLENBQUM7WUFDNUIsSUFBRyxPQUFPLEdBQUcsSUFBSSxXQUFXO2dCQUFFLE9BQU87WUFFckMsdUNBQXVDO1lBQ3ZDLHFDQUFxQztZQUNyQyxtQ0FBbUM7WUFDbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUM7WUFFNUMsS0FBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFDO2dCQUMvQixHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDWjtZQUVELG9DQUFvQztZQUNwQywwQ0FBMEM7WUFDMUMsZ0RBQWdEO1lBQ2hELG9CQUFvQjtZQUNwQixZQUFZO1lBQ1osSUFBSTtZQUVKLE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ2QsSUFBRyxDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO2dCQUMxQixDQUFDLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQzthQUN0QjtZQUNELElBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBQztnQkFDekIsQ0FBQyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUM7YUFDckI7WUFDRCxJQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7Z0JBQ3hCLENBQUMsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDO2FBQ3BCO1lBQ0QsS0FBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUM7Z0JBQ3BDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNWO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7SUFFUCxDQUFDO0lBRUQsU0FBUyxDQUFDLEdBQVc7UUFDakIsSUFBRyxHQUFHLElBQUksSUFBSTtZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQzVCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDdkQsQ0FBQztJQUVELHVCQUF1QjtRQUNuQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsRUFBRSxDQUFDO0lBQ2xDLENBQUM7Q0FHSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEludGVycHJldGVyU3RhdGUgfSBmcm9tIFwiLi4vaW50ZXJwcmV0ZXIvSW50ZXJwcmV0ZXIuanNcIjtcclxuaW1wb3J0IHsgTWFpbkJhc2UgfSBmcm9tIFwiLi4vbWFpbi9NYWluQmFzZS5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEtleWJvYXJkVG9vbCB7XHJcbiAgICBcclxuICAgIGVsZW1lbnQ6IEpRdWVyeTxhbnk+O1xyXG5cclxuICAgIHByZXNzZWRLZXlzOiB7W2tleTogc3RyaW5nXTogYm9vbGVhbn0gPSB7fTtcclxuXHJcbiAgICBrZXlQcmVzc2VkQ2FsbGJhY2tzOiAoKGtleTogc3RyaW5nKSA9PiB2b2lkKVtdID0gW107XHJcbiAgICBrZXlVcENhbGxiYWNrczogKChrZXk6IHN0cmluZykgPT4gdm9pZClbXSA9IFtdO1xyXG4gICAga2V5RG93bkNhbGxiYWNrczogKChrZXk6IHN0cmluZykgPT4gdm9pZClbXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnQ6IEpRdWVyeTxhbnk+LCBwcml2YXRlIG1haW46IE1haW5CYXNlKXtcclxuICAgICAgICB0aGlzLnJlZ2lzdGVyTGlzdGVuZXJzKGVsZW1lbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIHVucmVnaXN0ZXJMaXN0ZW5lcnMoKXtcclxuICAgICAgICB0aGlzLmVsZW1lbnQub2ZmKFwia2V5ZG93blwiKTtcclxuICAgICAgICB0aGlzLmVsZW1lbnQub2ZmKFwia2V5dXBcIik7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50Lm9mZihcImtleXByZXNzZWRcIik7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZWdpc3Rlckxpc3RlbmVycyhlbGVtZW50OiBKUXVlcnk8YW55Pil7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgZWxlbWVudC5vbihcImtleWRvd25cIiwgKGUpID0+IHtcclxuICAgICAgICAgICAgbGV0IGtleSA9IGUua2V5O1xyXG4gICAgICAgICAgICBpZihrZXkgPT0gbnVsbCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIC8vIGlmKGUuc2hpZnRLZXkpIGtleSA9IFwic2hpZnQrXCIgKyBrZXk7XHJcbiAgICAgICAgICAgIC8vIGlmKGUuY3RybEtleSkga2V5ID0gXCJjdHJsK1wiICsga2V5O1xyXG4gICAgICAgICAgICAvLyBpZihlLmFsdEtleSkga2V5ID0gXCJhbHQrXCIgKyBrZXk7XHJcbiAgICAgICAgICAgIHRoYXQucHJlc3NlZEtleXNba2V5LnRvTG93ZXJDYXNlKCldID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGZvcihsZXQga3BjIG9mIHRoYXQua2V5RG93bkNhbGxiYWNrcyl7XHJcbiAgICAgICAgICAgICAgICBrcGMoa2V5KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gcHJldmVudCA8aHRtbD4tRWxlbWVudCBmcm9tIHNjcm9sbGluZyBpbiBlbWJlZGRlZCBtb2RlXHJcbiAgICAgICAgICAgIGlmKHRoaXMubWFpbi5pc0VtYmVkZGVkKCkgJiYgdGhpcy5tYWluLmdldEludGVycHJldGVyKCkuc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5ydW5uaW5nICYmICF0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkuaGFzVGV4dEZvY3VzKCkpe1xyXG4gICAgICAgICAgICAgICAgaWYoW1wiQXJyb3dVcFwiLCBcIkFycm93RG93blwiLCBcIkFycm93TGVmdFwiLCBcIkFycm93UmlnaHRcIl0uaW5kZXhPZihlLmtleSkgPj0gMClcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGVsZW1lbnQub24oXCJrZXl1cFwiLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBsZXQga2V5ID0gZS5rZXk7XHJcbiAgICAgICAgICAgIGlmKGtleSA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgaWYodHlwZW9mIGtleSA9PSBcInVuZGVmaW5lZFwiKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAvLyBpZihlLnNoaWZ0S2V5KSBrZXkgPSBcInNoaWZ0K1wiICsga2V5O1xyXG4gICAgICAgICAgICAvLyBpZihlLmN0cmxLZXkpIGtleSA9IFwiY3RybCtcIiArIGtleTtcclxuICAgICAgICAgICAgLy8gaWYoZS5hbHRLZXkpIGtleSA9IFwiYWx0K1wiICsga2V5O1xyXG4gICAgICAgICAgICB0aGF0LnByZXNzZWRLZXlzW2tleS50b0xvd2VyQ2FzZSgpXSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgZm9yKGxldCBrcGMgb2YgdGhhdC5rZXlVcENhbGxiYWNrcyl7XHJcbiAgICAgICAgICAgICAgICBrcGMoa2V5KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gaW4gQWN0aW9uTWFuYWdlci5pbml0IHRoZXJlIGlzIGEgXHJcbiAgICAgICAgICAgIC8vIGlmKHRoYXQubWFpbi5pc0VtYmVkZGVkICYmIGtleSA9PSBcIiBcIil7XHJcbiAgICAgICAgICAgIC8vICAgICBmb3IobGV0IGtwYyBvZiB0aGF0LmtleVByZXNzZWRDYWxsYmFja3Mpe1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGtwYyhrZXkpO1xyXG4gICAgICAgICAgICAvLyAgICAgfSAgICBcclxuICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZWxlbWVudC5vbihcImtleXVwXCIsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBrID0gZS5rZXk7XHJcbiAgICAgICAgICAgIGlmKGUuc2hpZnRLZXkgJiYgay5sZW5ndGggPiAxKXtcclxuICAgICAgICAgICAgICAgIGsgPSBcIltzaGlmdF0rXCIgKyBrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmKGUuY3RybEtleSAmJiBrLmxlbmd0aCA+IDEpe1xyXG4gICAgICAgICAgICAgICAgayA9IFwiW2N0cmxdK1wiICsgaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZihlLmFsdEtleSAmJiBrLmxlbmd0aCA+IDEpe1xyXG4gICAgICAgICAgICAgICAgayA9IFwiW2FsdF0rXCIgKyBrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvcihsZXQga3BjIG9mIHRoYXQua2V5UHJlc3NlZENhbGxiYWNrcyl7XHJcbiAgICAgICAgICAgICAgICBrcGMoayk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGlzUHJlc3NlZChrZXk6IHN0cmluZyl7XHJcbiAgICAgICAgaWYoa2V5ID09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnByZXNzZWRLZXlzW2tleS50b0xvd2VyQ2FzZSgpXSA9PSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHVuc3Vic2NyaWJlQWxsTGlzdGVuZXJzKCkge1xyXG4gICAgICAgIHRoaXMua2V5UHJlc3NlZENhbGxiYWNrcyA9IFtdO1xyXG4gICAgfVxyXG5cclxuXHJcbn0iXX0=