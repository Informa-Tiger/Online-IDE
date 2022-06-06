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
SoundTools.isInitialized = false;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU291bmRUb29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGllbnQvdG9vbHMvU291bmRUb29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFRQSxNQUFNLE9BQU8sVUFBVTtJQXlGWixNQUFNLENBQUMsSUFBSTtRQUNkLElBQUksT0FBTyxHQUFXLEVBQUUsQ0FBQztRQUN6QixZQUFZO1FBQ1osSUFBRyxNQUFNLENBQUMsYUFBYSxJQUFJLElBQUksRUFBQztZQUM1QixZQUFZO1lBQ1osT0FBTyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUM7U0FDbEM7UUFDRCxJQUFHLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBQztZQUN6QixVQUFVLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztZQUNoQyxLQUFJLElBQUksS0FBSyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUM7Z0JBQy9CLFlBQVk7Z0JBQ1osS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUE7Z0JBQ3BFLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDOUM7U0FDSjtJQUVMLENBQUM7SUFFTSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQVk7UUFDM0IsSUFBSSxFQUFFLEdBQWMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEQsSUFBRyxFQUFFLElBQUksSUFBSSxFQUFDO1lBQ1YsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUNwQjtJQUNMLENBQUM7O0FBOUdNLGlCQUFNLEdBQWdCO0lBQ3pCO1FBQ0ksR0FBRyxFQUFFLDZDQUE2QztRQUNsRCxJQUFJLEVBQUUsOEJBQThCO1FBQ3BDLFdBQVcsRUFBRSw0Q0FBNEM7S0FDNUQ7SUFDRDtRQUNJLEdBQUcsRUFBRSxpQ0FBaUM7UUFDdEMsSUFBSSxFQUFFLGtCQUFrQjtRQUN4QixXQUFXLEVBQUUsZ0JBQWdCO0tBQ2hDO0lBQ0Q7UUFDSSxHQUFHLEVBQUUseUJBQXlCO1FBQzlCLElBQUksRUFBRSxVQUFVO1FBQ2hCLFdBQVcsRUFBRSw2QkFBNkI7S0FDN0M7SUFDRDtRQUNJLEdBQUcsRUFBRSw0QkFBNEI7UUFDakMsSUFBSSxFQUFFLGFBQWE7UUFDbkIsV0FBVyxFQUFFLHlCQUF5QjtLQUN6QztJQUNEO1FBQ0ksR0FBRyxFQUFFLDhCQUE4QjtRQUNuQyxJQUFJLEVBQUUsZUFBZTtRQUNyQixXQUFXLEVBQUUsaUJBQWlCO0tBQ2pDO0lBQ0Q7UUFDSSxHQUFHLEVBQUUsNEJBQTRCO1FBQ2pDLElBQUksRUFBRSxhQUFhO1FBQ25CLFdBQVcsRUFBRSwwQ0FBMEM7S0FDMUQ7SUFDRDtRQUNJLEdBQUcsRUFBRSwyQkFBMkI7UUFDaEMsSUFBSSxFQUFFLFlBQVk7UUFDbEIsV0FBVyxFQUFFLDZDQUE2QztLQUM3RDtJQUNEO1FBQ0ksR0FBRyxFQUFFLDZCQUE2QjtRQUNsQyxJQUFJLEVBQUUsY0FBYztRQUNwQixXQUFXLEVBQUUsZUFBZTtLQUMvQjtJQUNEO1FBQ0ksR0FBRyxFQUFFLHdCQUF3QjtRQUM3QixJQUFJLEVBQUUsU0FBUztRQUNmLFdBQVcsRUFBRSw2QkFBNkI7S0FDN0M7SUFDRDtRQUNJLEdBQUcsRUFBRSw4QkFBOEI7UUFDbkMsSUFBSSxFQUFFLGVBQWU7UUFDckIsV0FBVyxFQUFFLG9DQUFvQztLQUNwRDtJQUNEO1FBQ0ksR0FBRyxFQUFFLHNCQUFzQjtRQUMzQixJQUFJLEVBQUUsT0FBTztRQUNiLFdBQVcsRUFBRSxnQkFBZ0I7S0FDaEM7SUFDRDtRQUNJLEdBQUcsRUFBRSw0QkFBNEI7UUFDakMsSUFBSSxFQUFFLGFBQWE7UUFDbkIsV0FBVyxFQUFFLG1CQUFtQjtLQUNuQztJQUNEO1FBQ0ksR0FBRyxFQUFFLHFCQUFxQjtRQUMxQixJQUFJLEVBQUUsTUFBTTtRQUNaLFdBQVcsRUFBRSxhQUFhO0tBQzdCO0lBQ0Q7UUFDSSxHQUFHLEVBQUUsd0JBQXdCO1FBQzdCLElBQUksRUFBRSxTQUFTO1FBQ2YsV0FBVyxFQUFFLG9EQUFvRDtLQUNwRTtJQUNEO1FBQ0ksR0FBRyxFQUFFLHdCQUF3QjtRQUM3QixJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxpQkFBaUI7S0FDakM7SUFDRDtRQUNJLEdBQUcsRUFBRSx3QkFBd0I7UUFDN0IsSUFBSSxFQUFFLFFBQVE7UUFDZCxXQUFXLEVBQUUsZ0JBQWdCO0tBQ2hDO0NBQ0osQ0FBQTtBQUVNLG1CQUFRLEdBQTJCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFckMsd0JBQWEsR0FBWSxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgdHlwZSBTb3VuZFR5cGUgPSB7XHJcbiAgICB1cmw6IHN0cmluZyxcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgcGxheWVyPzogSG93bCxcclxuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmdcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNvdW5kVG9vbHMge1xyXG5cclxuICAgIHN0YXRpYyBzb3VuZHM6IFNvdW5kVHlwZVtdID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdXJsOiBcImFzc2V0cy9tcDMvbmVhcmJ5X2V4cGxvc2lvbl93aXRoX2RlYnJpcy5tcDNcIixcclxuICAgICAgICAgICAgbmFtZTogXCJuZWFyYnlfZXhwbG9zaW9uX3dpdGhfZGVicmlzXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIm5haGUgRXhwbG9zaW9uIG1pdCBoZXJhYmZhbGxlbmRlbiBUcsO8bW1lcm5cIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9uZWFyYnlfZXhwbG9zaW9uLm1wM1wiLFxyXG4gICAgICAgICAgICBuYW1lOiBcIm5lYXJieV9leHBsb3Npb25cIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwibmFoZSBFeHBsb3Npb25cIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9mYXJfYm9tYi5tcDNcIixcclxuICAgICAgICAgICAgbmFtZTogXCJmYXJfYm9tYlwiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJmZXJuZXMgR2Vyw6R1c2NoIGVpbmVyIEJvbWJlXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdXJsOiBcImFzc2V0cy9tcDMvY2Fubm9uX2Jvb20ubXAzXCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwiY2Fubm9uX2Jvb21cIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiZWluemVsbmVyIEthbm9uZW5kb25uZXJcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9mYXJfZXhwbG9zaW9uLm1wM1wiLFxyXG4gICAgICAgICAgICBuYW1lOiBcImZhcl9leHBsb3Npb25cIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiZmVybmUgRXhwbG9zaW9uXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdXJsOiBcImFzc2V0cy9tcDMvbGFzZXJfc2hvb3QubXAzXCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwibGFzZXJfc2hvb3RcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTGFzZXJzY2h1c3MgKG9kZXIgd2FzIG1hbiBkYWbDvHIgaMOkbHQuLi4pXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdXJsOiBcImFzc2V0cy9tcDMvc2hvcnRfYmVsbC5tcDNcIixcclxuICAgICAgICAgICAgbmFtZTogXCJzaG9ydF9iZWxsXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcImt1cnplcyBLbGluZ2VsbiAod2llIGJlaSBhbHRlciBMYW5kZW5rYXNzZSlcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9mbGFtZXRocm93ZXIubXAzXCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwiZmxhbWV0aHJvd2VyXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkZsYW1tZW53ZXJmZXJcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9kaWdnaW5nLm1wM1wiLFxyXG4gICAgICAgICAgICBuYW1lOiBcImRpZ2dpbmdcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiR2Vyw6R1c2NoIGJlaW0gU2FuZHNjaGF1ZmVsblwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybDogXCJhc3NldHMvbXAzL3Nob3J0X2RpZ2dpbmcubXAzXCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwic2hvcnRfZGlnZ2luZ1wiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJrdXJ6ZXMgR2Vyw6R1c2NoIGJlaW0gU2FuZHNjaGF1ZmVsblwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybDogXCJhc3NldHMvbXAzL3Nob290Lm1wM1wiLFxyXG4gICAgICAgICAgICBuYW1lOiBcInNob290XCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlNjaHVzc2dlcsOkdXNjaFwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybDogXCJhc3NldHMvbXAzL3Nob3J0X3Nob290Lm1wM1wiLFxyXG4gICAgICAgICAgICBuYW1lOiBcInNob3J0X3Nob290XCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcImVpbiBrdXJ6ZXIgU2NodXNzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdXJsOiBcImFzc2V0cy9tcDMvc3RlcC5tcDNcIixcclxuICAgICAgICAgICAgbmFtZTogXCJzdGVwXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcImVpbiBTY2hyaXR0XCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdXJsOiBcImFzc2V0cy9tcDMvYm91bGRlci5tcDNcIixcclxuICAgICAgICAgICAgbmFtZTogXCJib3VsZGVyXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkdlcsOkdXNjaCBlaW5lcyBTdGVpbnMsIGRlciBhdWYgZWluZW4gendlaXRlbiBmw6RsbHRcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9wb25nX2Q1LndhdlwiLFxyXG4gICAgICAgICAgICBuYW1lOiBcInBvbmdfZFwiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJUaWVmZXIgUG9uZy1Ub25cIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB1cmw6IFwiYXNzZXRzL21wMy9wb25nX2Y1LndhdlwiLFxyXG4gICAgICAgICAgICBuYW1lOiBcInBvbmdfZlwiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJIb2hlciBQb25nLVRvblwiXHJcbiAgICAgICAgfSxcclxuICAgIF1cclxuXHJcbiAgICBzdGF0aWMgc291bmRNYXA6IE1hcDxzdHJpbmcsIFNvdW5kVHlwZT4gPSBuZXcgTWFwKCk7XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgaXNJbml0aWFsaXplZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgaW5pdCgpe1xyXG4gICAgICAgIGxldCBwcmFlZml4OiBzdHJpbmcgPSBcIlwiO1xyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIGlmKHdpbmRvdy5qYXZhT25saW5lRGlyICE9IG51bGwpe1xyXG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgcHJhZWZpeCA9IHdpbmRvdy5qYXZhT25saW5lRGlyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZighU291bmRUb29scy5pc0luaXRpYWxpemVkKXtcclxuICAgICAgICAgICAgU291bmRUb29scy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgZm9yKGxldCBzb3VuZCBvZiBTb3VuZFRvb2xzLnNvdW5kcyl7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgIHNvdW5kLnBsYXllciA9IG5ldyBIb3dsKHtzcmM6IFtwcmFlZml4ICsgc291bmQudXJsXSwgcHJlbG9hZDogdHJ1ZX0pXHJcbiAgICAgICAgICAgICAgICBTb3VuZFRvb2xzLnNvdW5kTWFwLnNldChzb3VuZC5uYW1lLCBzb3VuZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgcGxheShuYW1lOiBzdHJpbmcpe1xyXG4gICAgICAgIGxldCBzdDogU291bmRUeXBlID0gU291bmRUb29scy5zb3VuZE1hcC5nZXQobmFtZSk7XHJcbiAgICAgICAgaWYoc3QgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgIHN0LnBsYXllci5wbGF5KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSJdfQ==