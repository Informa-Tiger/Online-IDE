export class SoundTools {
    static init() {
        let praefix = "";
        //@ts-ignore
        if (window.javaOnlineDir != null) {
            //@ts-ignore
            praefix = window.javaOnlineDir;
        }
        if (!SoundTools.isInitialized) {
            SoundTools.isInitialized = true;
            for (let sound of SoundTools.sounds) {
                //@ts-ignore
                sound.player = new Howl({ src: [praefix + sound.url], preload: true });
                SoundTools.soundMap.set(sound.name, sound);
            }
        }
    }
    static play(name) {
        let st = SoundTools.soundMap.get(name);
        if (st != null) {
            st.player.play();
        }
    }
    static startDetectingVolume() {
        if (SoundTools.volumeDetectionRunning)
            return;
        SoundTools.volumeDetectionRunning = true;
        console.log("starting...");
        //@ts-ignore
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        //@ts-ignore
        if (navigator.getUserMedia) {
            //@ts-ignore
            navigator.getUserMedia({
                audio: true
            }, function (stream) {
                let audioContext = new AudioContext();
                let analyser = audioContext.createAnalyser();
                let microphone = audioContext.createMediaStreamSource(stream);
                analyser.smoothingTimeConstant = 0.8;
                analyser.fftSize = 1024;
                microphone.connect(analyser);
                SoundTools.getVolume = () => {
                    if (!SoundTools.volumeDetectionRunning)
                        return 0;
                    var times = new Float32Array(analyser.frequencyBinCount);
                    analyser.getFloatTimeDomainData(times);
                    let volume = 0;
                    for (let i = 0; i < times.length; i++) {
                        volume += Math.abs(times[i]);
                    }
                    volume = volume / times.length;
                    return volume;
                };
            }, function (err) {
                console.log("The following error occured: " + err.name);
            });
        }
        else {
            console.log("getUserMedia not supported");
        }
    }
}
SoundTools.sounds = [
    {
        url: "assets/mp3/nearby_explosion_with_debris.mp3",
        name: "nearby_explosion_with_debris",
        description: "nahe Explosion mit herabfallenden Trümmern"
    },
    {
        url: "assets/mp3/nearby_explosion.mp3",
        name: "nearby_explosion",
        description: "nahe Explosion"
    },
    {
        url: "assets/mp3/far_bomb.mp3",
        name: "far_bomb",
        description: "fernes Geräusch einer Bombe"
    },
    {
        url: "assets/mp3/cannon_boom.mp3",
        name: "cannon_boom",
        description: "einzelner Kanonendonner"
    },
    {
        url: "assets/mp3/far_explosion.mp3",
        name: "far_explosion",
        description: "ferne Explosion"
    },
    {
        url: "assets/mp3/laser_shoot.mp3",
        name: "laser_shoot",
        description: "Laserschuss (oder was man dafür hält...)"
    },
    {
        url: "assets/mp3/short_bell.mp3",
        name: "short_bell",
        description: "kurzes Klingeln (wie bei alter Landenkasse)"
    },
    {
        url: "assets/mp3/flamethrower.mp3",
        name: "flamethrower",
        description: "Flammenwerfer"
    },
    {
        url: "assets/mp3/digging.mp3",
        name: "digging",
        description: "Geräusch beim Sandschaufeln"
    },
    {
        url: "assets/mp3/short_digging.mp3",
        name: "short_digging",
        description: "kurzes Geräusch beim Sandschaufeln"
    },
    {
        url: "assets/mp3/shoot.mp3",
        name: "shoot",
        description: "Schussgeräusch"
    },
    {
        url: "assets/mp3/short_shoot.mp3",
        name: "short_shoot",
        description: "ein kurzer Schuss"
    },
    {
        url: "assets/mp3/step.mp3",
        name: "step",
        description: "ein Schritt"
    },
    {
        url: "assets/mp3/boulder.mp3",
        name: "boulder",
        description: "Geräusch eines Steins, der auf einen zweiten fällt"
    },
    {
        url: "assets/mp3/pong_d5.wav",
        name: "pong_d",
        description: "Tiefer Pong-Ton"
    },
    {
        url: "assets/mp3/pong_f5.wav",
        name: "pong_f",
        description: "Hoher Pong-Ton"
    },
];
SoundTools.soundMap = new Map();
SoundTools.getVolume = () => { return -1; };
SoundTools.isInitialized = false;
SoundTools.volumeDetectionRunning = false;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU291bmRUb29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGllbnQvdG9vbHMvU291bmRUb29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFRQSxNQUFNLE9BQU8sVUFBVTtJQTJGWixNQUFNLENBQUMsSUFBSTtRQUNkLElBQUksT0FBTyxHQUFXLEVBQUUsQ0FBQztRQUN6QixZQUFZO1FBQ1osSUFBSSxNQUFNLENBQUMsYUFBYSxJQUFJLElBQUksRUFBRTtZQUM5QixZQUFZO1lBQ1osT0FBTyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUM7U0FDbEM7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRTtZQUMzQixVQUFVLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztZQUNoQyxLQUFLLElBQUksS0FBSyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2pDLFlBQVk7Z0JBQ1osS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7Z0JBQ3RFLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDOUM7U0FDSjtJQUVMLENBQUM7SUFFTSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQVk7UUFDM0IsSUFBSSxFQUFFLEdBQWMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEQsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ1osRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUNwQjtJQUNMLENBQUM7SUFHTSxNQUFNLENBQUMsb0JBQW9CO1FBQzlCLElBQUcsVUFBVSxDQUFDLHNCQUFzQjtZQUFFLE9BQU87UUFDN0MsVUFBVSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQztRQUN6QyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzNCLFlBQVk7UUFDWixTQUFTLENBQUMsWUFBWSxHQUFHLFNBQVMsQ0FBQyxZQUFZLElBQUksU0FBUyxDQUFDLGtCQUFrQixJQUFJLFNBQVMsQ0FBQyxlQUFlLENBQUM7UUFDN0csWUFBWTtRQUNaLElBQUksU0FBUyxDQUFDLFlBQVksRUFBRTtZQUN4QixZQUFZO1lBQ1osU0FBUyxDQUFDLFlBQVksQ0FBQztnQkFDbkIsS0FBSyxFQUFFLElBQUk7YUFDZCxFQUNHLFVBQVUsTUFBTTtnQkFDWixJQUFJLFlBQVksR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUN0QyxJQUFJLFFBQVEsR0FBRyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzdDLElBQUksVUFBVSxHQUFHLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFFOUQsUUFBUSxDQUFDLHFCQUFxQixHQUFHLEdBQUcsQ0FBQztnQkFDckMsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7Z0JBRXhCLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRTdCLFVBQVUsQ0FBQyxTQUFTLEdBQUcsR0FBRyxFQUFFO29CQUN4QixJQUFHLENBQUMsVUFBVSxDQUFDLHNCQUFzQjt3QkFBRSxPQUFPLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxLQUFLLEdBQUcsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUM7b0JBQ3pELFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDdkMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO29CQUNmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO3dCQUNuQyxNQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDaEM7b0JBQ0QsTUFBTSxHQUFHLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO29CQUMvQixPQUFPLE1BQU0sQ0FBQztnQkFDbEIsQ0FBQyxDQUFDO1lBQ04sQ0FBQyxFQUNELFVBQVUsR0FBRztnQkFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMzRCxDQUFDLENBQUMsQ0FBQztTQUNWO2FBQU07WUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLENBQUM7U0FDN0M7SUFDTCxDQUFDOztBQTNKTSxpQkFBTSxHQUFnQjtJQUN6QjtRQUNJLEdBQUcsRUFBRSw2Q0FBNkM7UUFDbEQsSUFBSSxFQUFFLDhCQUE4QjtRQUNwQyxXQUFXLEVBQUUsNENBQTRDO0tBQzVEO0lBQ0Q7UUFDSSxHQUFHLEVBQUUsaUNBQWlDO1FBQ3RDLElBQUksRUFBRSxrQkFBa0I7UUFDeEIsV0FBVyxFQUFFLGdCQUFnQjtLQUNoQztJQUNEO1FBQ0ksR0FBRyxFQUFFLHlCQUF5QjtRQUM5QixJQUFJLEVBQUUsVUFBVTtRQUNoQixXQUFXLEVBQUUsNkJBQTZCO0tBQzdDO0lBQ0Q7UUFDSSxHQUFHLEVBQUUsNEJBQTRCO1FBQ2pDLElBQUksRUFBRSxhQUFhO1FBQ25CLFdBQVcsRUFBRSx5QkFBeUI7S0FDekM7SUFDRDtRQUNJLEdBQUcsRUFBRSw4QkFBOEI7UUFDbkMsSUFBSSxFQUFFLGVBQWU7UUFDckIsV0FBVyxFQUFFLGlCQUFpQjtLQUNqQztJQUNEO1FBQ0ksR0FBRyxFQUFFLDRCQUE0QjtRQUNqQyxJQUFJLEVBQUUsYUFBYTtRQUNuQixXQUFXLEVBQUUsMENBQTBDO0tBQzFEO0lBQ0Q7UUFDSSxHQUFHLEVBQUUsMkJBQTJCO1FBQ2hDLElBQUksRUFBRSxZQUFZO1FBQ2xCLFdBQVcsRUFBRSw2Q0FBNkM7S0FDN0Q7SUFDRDtRQUNJLEdBQUcsRUFBRSw2QkFBNkI7UUFDbEMsSUFBSSxFQUFFLGNBQWM7UUFDcEIsV0FBVyxFQUFFLGVBQWU7S0FDL0I7SUFDRDtRQUNJLEdBQUcsRUFBRSx3QkFBd0I7UUFDN0IsSUFBSSxFQUFFLFNBQVM7UUFDZixXQUFXLEVBQUUsNkJBQTZCO0tBQzdDO0lBQ0Q7UUFDSSxHQUFHLEVBQUUsOEJBQThCO1FBQ25DLElBQUksRUFBRSxlQUFlO1FBQ3JCLFdBQVcsRUFBRSxvQ0FBb0M7S0FDcEQ7SUFDRDtRQUNJLEdBQUcsRUFBRSxzQkFBc0I7UUFDM0IsSUFBSSxFQUFFLE9BQU87UUFDYixXQUFXLEVBQUUsZ0JBQWdCO0tBQ2hDO0lBQ0Q7UUFDSSxHQUFHLEVBQUUsNEJBQTRCO1FBQ2pDLElBQUksRUFBRSxhQUFhO1FBQ25CLFdBQVcsRUFBRSxtQkFBbUI7S0FDbkM7SUFDRDtRQUNJLEdBQUcsRUFBRSxxQkFBcUI7UUFDMUIsSUFBSSxFQUFFLE1BQU07UUFDWixXQUFXLEVBQUUsYUFBYTtLQUM3QjtJQUNEO1FBQ0ksR0FBRyxFQUFFLHdCQUF3QjtRQUM3QixJQUFJLEVBQUUsU0FBUztRQUNmLFdBQVcsRUFBRSxvREFBb0Q7S0FDcEU7SUFDRDtRQUNJLEdBQUcsRUFBRSx3QkFBd0I7UUFDN0IsSUFBSSxFQUFFLFFBQVE7UUFDZCxXQUFXLEVBQUUsaUJBQWlCO0tBQ2pDO0lBQ0Q7UUFDSSxHQUFHLEVBQUUsd0JBQXdCO1FBQzdCLElBQUksRUFBRSxRQUFRO1FBQ2QsV0FBVyxFQUFFLGdCQUFnQjtLQUNoQztDQUNKLENBQUE7QUFFTSxtQkFBUSxHQUEyQixJQUFJLEdBQUcsRUFBRSxDQUFDO0FBRTdDLG9CQUFTLEdBQWlCLEdBQUcsRUFBRSxHQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUEsQ0FBQSxDQUFDLENBQUM7QUFFcEMsd0JBQWEsR0FBWSxLQUFLLENBQUM7QUEyQnZDLGlDQUFzQixHQUFZLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCB0eXBlIFNvdW5kVHlwZSA9IHtcclxuICAgIHVybDogc3RyaW5nLFxyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBwbGF5ZXI/OiBIb3dsLFxyXG4gICAgZGVzY3JpcHRpb246IHN0cmluZ1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU291bmRUb29scyB7XHJcblxyXG4gICAgc3RhdGljIHNvdW5kczogU291bmRUeXBlW10gPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9uZWFyYnlfZXhwbG9zaW9uX3dpdGhfZGVicmlzLm1wM1wiLFxyXG4gICAgICAgICAgICBuYW1lOiBcIm5lYXJieV9leHBsb3Npb25fd2l0aF9kZWJyaXNcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwibmFoZSBFeHBsb3Npb24gbWl0IGhlcmFiZmFsbGVuZGVuIFRyw7xtbWVyblwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybDogXCJhc3NldHMvbXAzL25lYXJieV9leHBsb3Npb24ubXAzXCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwibmVhcmJ5X2V4cGxvc2lvblwiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJuYWhlIEV4cGxvc2lvblwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybDogXCJhc3NldHMvbXAzL2Zhcl9ib21iLm1wM1wiLFxyXG4gICAgICAgICAgICBuYW1lOiBcImZhcl9ib21iXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcImZlcm5lcyBHZXLDpHVzY2ggZWluZXIgQm9tYmVcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9jYW5ub25fYm9vbS5tcDNcIixcclxuICAgICAgICAgICAgbmFtZTogXCJjYW5ub25fYm9vbVwiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJlaW56ZWxuZXIgS2Fub25lbmRvbm5lclwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybDogXCJhc3NldHMvbXAzL2Zhcl9leHBsb3Npb24ubXAzXCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwiZmFyX2V4cGxvc2lvblwiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJmZXJuZSBFeHBsb3Npb25cIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9sYXNlcl9zaG9vdC5tcDNcIixcclxuICAgICAgICAgICAgbmFtZTogXCJsYXNlcl9zaG9vdFwiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJMYXNlcnNjaHVzcyAob2RlciB3YXMgbWFuIGRhZsO8ciBow6RsdC4uLilcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9zaG9ydF9iZWxsLm1wM1wiLFxyXG4gICAgICAgICAgICBuYW1lOiBcInNob3J0X2JlbGxcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwia3VyemVzIEtsaW5nZWxuICh3aWUgYmVpIGFsdGVyIExhbmRlbmthc3NlKVwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybDogXCJhc3NldHMvbXAzL2ZsYW1ldGhyb3dlci5tcDNcIixcclxuICAgICAgICAgICAgbmFtZTogXCJmbGFtZXRocm93ZXJcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiRmxhbW1lbndlcmZlclwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybDogXCJhc3NldHMvbXAzL2RpZ2dpbmcubXAzXCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwiZGlnZ2luZ1wiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJHZXLDpHVzY2ggYmVpbSBTYW5kc2NoYXVmZWxuXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdXJsOiBcImFzc2V0cy9tcDMvc2hvcnRfZGlnZ2luZy5tcDNcIixcclxuICAgICAgICAgICAgbmFtZTogXCJzaG9ydF9kaWdnaW5nXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcImt1cnplcyBHZXLDpHVzY2ggYmVpbSBTYW5kc2NoYXVmZWxuXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdXJsOiBcImFzc2V0cy9tcDMvc2hvb3QubXAzXCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwic2hvb3RcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU2NodXNzZ2Vyw6R1c2NoXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdXJsOiBcImFzc2V0cy9tcDMvc2hvcnRfc2hvb3QubXAzXCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwic2hvcnRfc2hvb3RcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiZWluIGt1cnplciBTY2h1c3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9zdGVwLm1wM1wiLFxyXG4gICAgICAgICAgICBuYW1lOiBcInN0ZXBcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiZWluIFNjaHJpdHRcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9ib3VsZGVyLm1wM1wiLFxyXG4gICAgICAgICAgICBuYW1lOiBcImJvdWxkZXJcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiR2Vyw6R1c2NoIGVpbmVzIFN0ZWlucywgZGVyIGF1ZiBlaW5lbiB6d2VpdGVuIGbDpGxsdFwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybDogXCJhc3NldHMvbXAzL3BvbmdfZDUud2F2XCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwicG9uZ19kXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlRpZWZlciBQb25nLVRvblwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybDogXCJhc3NldHMvbXAzL3BvbmdfZjUud2F2XCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwicG9uZ19mXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkhvaGVyIFBvbmctVG9uXCJcclxuICAgICAgICB9LFxyXG4gICAgXVxyXG5cclxuICAgIHN0YXRpYyBzb3VuZE1hcDogTWFwPHN0cmluZywgU291bmRUeXBlPiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICBzdGF0aWMgZ2V0Vm9sdW1lOiAoKSA9PiBudW1iZXIgPSAoKSA9PiB7cmV0dXJuIC0xfTtcclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBpc0luaXRpYWxpemVkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBpbml0KCkge1xyXG4gICAgICAgIGxldCBwcmFlZml4OiBzdHJpbmcgPSBcIlwiO1xyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIGlmICh3aW5kb3cuamF2YU9ubGluZURpciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICBwcmFlZml4ID0gd2luZG93LmphdmFPbmxpbmVEaXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghU291bmRUb29scy5pc0luaXRpYWxpemVkKSB7XHJcbiAgICAgICAgICAgIFNvdW5kVG9vbHMuaXNJbml0aWFsaXplZCA9IHRydWU7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHNvdW5kIG9mIFNvdW5kVG9vbHMuc291bmRzKSB7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgIHNvdW5kLnBsYXllciA9IG5ldyBIb3dsKHsgc3JjOiBbcHJhZWZpeCArIHNvdW5kLnVybF0sIHByZWxvYWQ6IHRydWUgfSlcclxuICAgICAgICAgICAgICAgIFNvdW5kVG9vbHMuc291bmRNYXAuc2V0KHNvdW5kLm5hbWUsIHNvdW5kKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBwbGF5KG5hbWU6IHN0cmluZykge1xyXG4gICAgICAgIGxldCBzdDogU291bmRUeXBlID0gU291bmRUb29scy5zb3VuZE1hcC5nZXQobmFtZSk7XHJcbiAgICAgICAgaWYgKHN0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgc3QucGxheWVyLnBsYXkoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHZvbHVtZURldGVjdGlvblJ1bm5pbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIHB1YmxpYyBzdGF0aWMgc3RhcnREZXRlY3RpbmdWb2x1bWUoKSB7XHJcbiAgICAgICAgaWYoU291bmRUb29scy52b2x1bWVEZXRlY3Rpb25SdW5uaW5nKSByZXR1cm47XHJcbiAgICAgICAgU291bmRUb29scy52b2x1bWVEZXRlY3Rpb25SdW5uaW5nID0gdHJ1ZTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcInN0YXJ0aW5nLi4uXCIpO1xyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYTtcclxuICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICBpZiAobmF2aWdhdG9yLmdldFVzZXJNZWRpYSkge1xyXG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSh7XHJcbiAgICAgICAgICAgICAgICBhdWRpbzogdHJ1ZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHN0cmVhbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhdWRpb0NvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFuYWx5c2VyID0gYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1pY3JvcGhvbmUgPSBhdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2Uoc3RyZWFtKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYW5hbHlzZXIuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gMC44O1xyXG4gICAgICAgICAgICAgICAgICAgIGFuYWx5c2VyLmZmdFNpemUgPSAxMDI0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBtaWNyb3Bob25lLmNvbm5lY3QoYW5hbHlzZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBTb3VuZFRvb2xzLmdldFZvbHVtZSA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIVNvdW5kVG9vbHMudm9sdW1lRGV0ZWN0aW9uUnVubmluZykgcmV0dXJuIDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0aW1lcyA9IG5ldyBGbG9hdDMyQXJyYXkoYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbmFseXNlci5nZXRGbG9hdFRpbWVEb21haW5EYXRhKHRpbWVzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHZvbHVtZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGltZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvbHVtZSArPSBNYXRoLmFicyh0aW1lc1tpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdm9sdW1lID0gdm9sdW1lIC8gdGltZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdm9sdW1lO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVGhlIGZvbGxvd2luZyBlcnJvciBvY2N1cmVkOiBcIiArIGVyci5uYW1lKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnZXRVc2VyTWVkaWEgbm90IHN1cHBvcnRlZFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbiJdfQ==