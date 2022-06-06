// export var credentials: { username: string, password: string } = { username: null, password: null };
export class PerformanceCollector {
    static registerPerformanceEntry(url, startTime) {
        let pe = PerformanceCollector.performanceData.find(pe => pe.url == url);
        if (pe == null) {
            pe = { count: 0, sumTime: 0, url: url };
            PerformanceCollector.performanceData.push(pe);
        }
        pe.count++; //Test
        let dt = Math.round(performance.now() - startTime);
        pe.sumTime += dt;
        PerformanceCollector.performanceDataCount++;
        // console.log("Performance entry for path " + pe.url + ": " + dt + " ms, aggregated: " + pe.sumTime + " for " + pe.count + " requests.");
    }
    static sendDataToServer() {
        if (performance.now() - PerformanceCollector.lastTimeSent > 3 * 60 * 1000) {
            let request = {
                data: PerformanceCollector.performanceData
            };
            PerformanceCollector.performanceData = [];
            PerformanceCollector.performanceDataCount = 0;
            PerformanceCollector.lastTimeSent = performance.now();
            ajax("collectPerformanceData", request, () => { });
        }
    }
}
PerformanceCollector.performanceData = [];
PerformanceCollector.performanceDataCount = 0;
PerformanceCollector.lastTimeSent = performance.now();
export function ajax(url, request, successCallback, errorCallback) {
    if (!url.startsWith("http")) {
        url = "servlet/" + url;
    }
    showNetworkBusy(true);
    let time = performance.now();
    $.ajax({
        type: 'POST',
        async: true,
        data: JSON.stringify(request),
        contentType: 'application/json',
        url: url,
        success: function (response) {
            PerformanceCollector.registerPerformanceEntry(url, time);
            showNetworkBusy(false);
            if (response.success != null && response.success == false || typeof (response) == "string" && response == '') {
                let error = "Fehler bei der Bearbeitung der Anfrage";
                if (response.message != null)
                    error = response.message;
                if (response.error != null)
                    error = response.error;
                if (error.indexOf("Not logged in") >= 0) {
                    // setTimeout(() => newLogin(url, request, successCallback, errorCallback), 10000);
                    // location.reload();
                }
                console.log("Netzwerkfehler: " + error);
                if (errorCallback)
                    errorCallback(error);
            }
            else {
                successCallback(response);
            }
            return;
        },
        error: function (jqXHR, message) {
            showNetworkBusy(false);
            if (errorCallback) {
                let statusText = "Server nicht erreichbar.";
                if (jqXHR.status != 0) {
                    statusText = "" + jqXHR.status;
                }
                errorCallback(message + ": " + statusText);
                return;
            }
        }
    });
}
export function showNetworkBusy(busy) {
    if (busy) {
        jQuery('.jo_network-busy').show();
    }
    else {
        jQuery('.jo_network-busy').hide();
    }
}
// export function newLogin(url: string, request: any, successCallback: (response: any) => void,
//     errorCallback?: (message: string) => void) {
//     if (credentials.username == null) return;
//     let loginRequest: LoginRequest = {username: credentials.username, password: credentials.password};
//     $.ajax({
//         type: 'POST',
//         data: JSON.stringify(loginRequest),
//         contentType: 'application/json',
//         url: "login",
//         success: function (response: any) {
//             if (response.success != null && response.success == false || typeof (response) == "string" && response == '') {
//             } else {
//                 ajax(url, request, successCallback, errorCallback);
//             }
//             return;
//         },
//         error: function (jqXHR, message) {
// //            ajax(url, request, successCallback, errorCallback);
//         }
//     });
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWpheEhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGllbnQvY29tbXVuaWNhdGlvbi9BamF4SGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLHVHQUF1RztBQUV2RyxNQUFNLE9BQU8sb0JBQW9CO0lBSzdCLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxHQUFXLEVBQUUsU0FBaUI7UUFDMUQsSUFBSSxFQUFFLEdBQW9CLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ3pGLElBQUksRUFBRSxJQUFJLElBQUksRUFBRTtZQUNaLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7WUFDeEMsb0JBQW9CLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNqRDtRQUNELEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU07UUFDbEIsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFDbkQsRUFBRSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDakIsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM1QywwSUFBMEk7SUFDOUksQ0FBQztJQUVELE1BQU0sQ0FBQyxnQkFBZ0I7UUFDbkIsSUFBSSxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsb0JBQW9CLENBQUMsWUFBWSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFO1lBQ3ZFLElBQUksT0FBTyxHQUFHO2dCQUNWLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxlQUFlO2FBQzdDLENBQUE7WUFFRCxvQkFB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UUFDSCxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztLQUNyQztBQUNMLENBQUM7QUFJRCxnR0FBZ0c7QUFDaEcsbURBQW1EO0FBRW5ELGdEQUFnRDtBQUNoRCx5R0FBeUc7QUFFekcsZUFBZTtBQUNmLHdCQUF3QjtBQUN4Qiw4Q0FBOEM7QUFDOUMsMkNBQTJDO0FBQzNDLHdCQUF3QjtBQUN4Qiw4Q0FBOEM7QUFDOUMsOEhBQThIO0FBQzlILHVCQUF1QjtBQUN2QixzRUFBc0U7QUFDdEUsZ0JBQWdCO0FBQ2hCLHNCQUFzQjtBQUN0QixhQUFhO0FBQ2IsNkNBQTZDO0FBQzdDLG9FQUFvRTtBQUNwRSxZQUFZO0FBQ1osVUFBVTtBQUNWLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMb2dpblJlcXVlc3QsIFBlcmZvcm1hbmNlRGF0YSB9IGZyb20gXCIuL0RhdGEuanNcIjtcclxuXHJcbi8vIGV4cG9ydCB2YXIgY3JlZGVudGlhbHM6IHsgdXNlcm5hbWU6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZyB9ID0geyB1c2VybmFtZTogbnVsbCwgcGFzc3dvcmQ6IG51bGwgfTtcclxuXHJcbmV4cG9ydCBjbGFzcyBQZXJmb3JtYW5jZUNvbGxlY3RvciB7XHJcbiAgICBzdGF0aWMgcGVyZm9ybWFuY2VEYXRhOiBQZXJmb3JtYW5jZURhdGFbXSA9IFtdO1xyXG4gICAgc3RhdGljIHBlcmZvcm1hbmNlRGF0YUNvdW50OiBudW1iZXIgPSAwO1xyXG4gICAgc3RhdGljIGxhc3RUaW1lU2VudDogbnVtYmVyID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblxyXG4gICAgc3RhdGljIHJlZ2lzdGVyUGVyZm9ybWFuY2VFbnRyeSh1cmw6IHN0cmluZywgc3RhcnRUaW1lOiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgcGU6IFBlcmZvcm1hbmNlRGF0YSA9IFBlcmZvcm1hbmNlQ29sbGVjdG9yLnBlcmZvcm1hbmNlRGF0YS5maW5kKHBlID0+IHBlLnVybCA9PSB1cmwpO1xyXG4gICAgICAgIGlmIChwZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHBlID0geyBjb3VudDogMCwgc3VtVGltZTogMCwgdXJsOiB1cmwgfTtcclxuICAgICAgICAgICAgUGVyZm9ybWFuY2VDb2xsZWN0b3IucGVyZm9ybWFuY2VEYXRhLnB1c2gocGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwZS5jb3VudCsrOyAvL1Rlc3RcclxuICAgICAgICBsZXQgZHQgPSBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gc3RhcnRUaW1lKTtcclxuICAgICAgICBwZS5zdW1UaW1lICs9IGR0O1xyXG4gICAgICAgIFBlcmZvcm1hbmNlQ29sbGVjdG9yLnBlcmZvcm1hbmNlRGF0YUNvdW50Kys7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJQZXJmb3JtYW5jZSBlbnRyeSBmb3IgcGF0aCBcIiArIHBlLnVybCArIFwiOiBcIiArIGR0ICsgXCIgbXMsIGFnZ3JlZ2F0ZWQ6IFwiICsgcGUuc3VtVGltZSArIFwiIGZvciBcIiArIHBlLmNvdW50ICsgXCIgcmVxdWVzdHMuXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBzZW5kRGF0YVRvU2VydmVyKCkge1xyXG4gICAgICAgIGlmIChwZXJmb3JtYW5jZS5ub3coKSAtIFBlcmZvcm1hbmNlQ29sbGVjdG9yLmxhc3RUaW1lU2VudCA+IDMgKiA2MCAqIDEwMDApIHtcclxuICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgICAgICBkYXRhOiBQZXJmb3JtYW5jZUNvbGxlY3Rvci5wZXJmb3JtYW5jZURhdGFcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgUGVyZm9ybWFuY2VDb2xsZWN0b3IucGVyZm9ybWFuY2VEYXRhID0gW107XHJcbiAgICAgICAgICAgIFBlcmZvcm1hbmNlQ29sbGVjdG9yLnBlcmZvcm1hbmNlRGF0YUNvdW50ID0gMDtcclxuICAgICAgICAgICAgUGVyZm9ybWFuY2VDb2xsZWN0b3IubGFzdFRpbWVTZW50ID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblxyXG4gICAgICAgICAgICBhamF4KFwiY29sbGVjdFBlcmZvcm1hbmNlRGF0YVwiLCByZXF1ZXN0LCAoKSA9PiB7IH0pXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhamF4KHVybDogc3RyaW5nLCByZXF1ZXN0OiBhbnksIHN1Y2Nlc3NDYWxsYmFjazogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQsXHJcblxyXG4gICAgZXJyb3JDYWxsYmFjaz86IChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpIHtcclxuXHJcbiAgICAgICAgaWYoIXVybC5zdGFydHNXaXRoKFwiaHR0cFwiKSl7XHJcbiAgICAgICAgICAgIHVybCA9IFwic2VydmxldC9cIiArIHVybDtcclxuICAgICAgICB9XHJcbiAgIFxyXG5cclxuICAgIHNob3dOZXR3b3JrQnVzeSh0cnVlKTtcclxuICAgIGxldCB0aW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblxyXG4gICAgJC5hamF4KHtcclxuICAgICAgICB0eXBlOiAnUE9TVCcsXHJcbiAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkocmVxdWVzdCksXHJcbiAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAocmVzcG9uc2U6IGFueSkge1xyXG5cclxuICAgICAgICAgICAgUGVyZm9ybWFuY2VDb2xsZWN0b3IucmVnaXN0ZXJQZXJmb3JtYW5jZUVudHJ5KHVybCwgdGltZSk7XHJcblxyXG4gICAgICAgICAgICBzaG93TmV0d29ya0J1c3koZmFsc2UpO1xyXG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3VjY2VzcyAhPSBudWxsICYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT0gZmFsc2UgfHwgdHlwZW9mIChyZXNwb25zZSkgPT0gXCJzdHJpbmdcIiAmJiByZXNwb25zZSA9PSAnJykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVycm9yID0gXCJGZWhsZXIgYmVpIGRlciBCZWFyYmVpdHVuZyBkZXIgQW5mcmFnZVwiXHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZSAhPSBudWxsKSBlcnJvciA9IHJlc3BvbnNlLm1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZXJyb3IgIT0gbnVsbCkgZXJyb3IgPSByZXNwb25zZS5lcnJvcjtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IuaW5kZXhPZihcIk5vdCBsb2dnZWQgaW5cIikgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNldFRpbWVvdXQoKCkgPT4gbmV3TG9naW4odXJsLCByZXF1ZXN0LCBzdWNjZXNzQ2FsbGJhY2ssIGVycm9yQ2FsbGJhY2spLCAxMDAwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbG9jYXRpb24ucmVsb2FkKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTmV0endlcmtmZWhsZXI6IFwiICsgZXJyb3IpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlcnJvckNhbGxiYWNrKSBlcnJvckNhbGxiYWNrKGVycm9yKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3NDYWxsYmFjayhyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbiAoanFYSFIsIG1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgc2hvd05ldHdvcmtCdXN5KGZhbHNlKTtcclxuICAgICAgICAgICAgaWYgKGVycm9yQ2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0dXNUZXh0ID0gXCJTZXJ2ZXIgbmljaHQgZXJyZWljaGJhci5cIlxyXG4gICAgICAgICAgICAgICAgaWYgKGpxWEhSLnN0YXR1cyAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IFwiXCIgKyBqcVhIUi5zdGF0dXNcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVycm9yQ2FsbGJhY2sobWVzc2FnZSArIFwiOiBcIiArIHN0YXR1c1RleHQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzaG93TmV0d29ya0J1c3koYnVzeTogYm9vbGVhbikge1xyXG4gICAgaWYgKGJ1c3kpIHtcclxuICAgICAgICBqUXVlcnkoJy5qb19uZXR3b3JrLWJ1c3knKS5zaG93KCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGpRdWVyeSgnLmpvX25ldHdvcmstYnVzeScpLmhpZGUoKTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcblxyXG4vLyBleHBvcnQgZnVuY3Rpb24gbmV3TG9naW4odXJsOiBzdHJpbmcsIHJlcXVlc3Q6IGFueSwgc3VjY2Vzc0NhbGxiYWNrOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCxcclxuLy8gICAgIGVycm9yQ2FsbGJhY2s/OiAobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKSB7XHJcblxyXG4vLyAgICAgaWYgKGNyZWRlbnRpYWxzLnVzZXJuYW1lID09IG51bGwpIHJldHVybjtcclxuLy8gICAgIGxldCBsb2dpblJlcXVlc3Q6IExvZ2luUmVxdWVzdCA9IHt1c2VybmFtZTogY3JlZGVudGlhbHMudXNlcm5hbWUsIHBhc3N3b3JkOiBjcmVkZW50aWFscy5wYXNzd29yZH07XHJcblxyXG4vLyAgICAgJC5hamF4KHtcclxuLy8gICAgICAgICB0eXBlOiAnUE9TVCcsXHJcbi8vICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkobG9naW5SZXF1ZXN0KSxcclxuLy8gICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4vLyAgICAgICAgIHVybDogXCJsb2dpblwiLFxyXG4vLyAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwb25zZTogYW55KSB7XHJcbi8vICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzICE9IG51bGwgJiYgcmVzcG9uc2Uuc3VjY2VzcyA9PSBmYWxzZSB8fCB0eXBlb2YgKHJlc3BvbnNlKSA9PSBcInN0cmluZ1wiICYmIHJlc3BvbnNlID09ICcnKSB7XHJcbi8vICAgICAgICAgICAgIH0gZWxzZSB7XHJcbi8vICAgICAgICAgICAgICAgICBhamF4KHVybCwgcmVxdWVzdCwgc3VjY2Vzc0NhbGxiYWNrLCBlcnJvckNhbGxiYWNrKTtcclxuLy8gICAgICAgICAgICAgfVxyXG4vLyAgICAgICAgICAgICByZXR1cm47XHJcbi8vICAgICAgICAgfSxcclxuLy8gICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGpxWEhSLCBtZXNzYWdlKSB7XHJcbi8vIC8vICAgICAgICAgICAgYWpheCh1cmwsIHJlcXVlc3QsIHN1Y2Nlc3NDYWxsYmFjaywgZXJyb3JDYWxsYmFjayk7XHJcbi8vICAgICAgICAgfVxyXG4vLyAgICAgfSk7XHJcbi8vIH1cclxuIl19