export class CacheManager {
    fetchTemplateFromCache(databaseId, callback) {
        if (databaseId == null) {
            callback(null);
            return;
        }
        let that = this;
        if (!this.cacheAvailable())
            callback(null);
        this.getCache((cache) => {
            cache.match(that.databaseIdToCacheIdentifier(databaseId)).then((value) => {
                value.arrayBuffer().then((buffer) => callback(new Uint8Array(buffer)));
            })
                .catch(() => callback(null));
        });
    }
    saveTemplateToCache(databaseId, templateDump) {
        if (!this.cacheAvailable())
            return;
        let that = this;
        this.getCache((cache) => {
            cache.put(that.databaseIdToCacheIdentifier(databaseId), new Response(templateDump));
        });
    }
    cacheAvailable() {
        return 'caches' in self;
    }
    getCache(callback) {
        caches.open('my-cache').then(callback);
    }
    databaseIdToCacheIdentifier(databaseId) {
        return "/onlineIdeTemplateDb" + databaseId;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FjaGVNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC90b29scy9kYXRhYmFzZS9DYWNoZU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxPQUFPLFlBQVk7SUFFckIsc0JBQXNCLENBQUMsVUFBa0IsRUFBRSxRQUE0QztRQUNuRixJQUFHLFVBQVUsSUFBSSxJQUFJLEVBQUM7WUFBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFBQyxPQUFPO1NBQUM7UUFDL0MsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLElBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNwQixLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDMUQsQ0FBQyxLQUFLLEVBQUMsRUFBRTtnQkFDTCxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNFLENBQUMsQ0FBQztpQkFDRCxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQsbUJBQW1CLENBQUMsVUFBa0IsRUFBRSxZQUF3QjtRQUM1RCxJQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUFFLE9BQU87UUFDbEMsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNwQixLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3hGLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVELGNBQWM7UUFDVixPQUFPLFFBQVEsSUFBSSxJQUFJLENBQUM7SUFDNUIsQ0FBQztJQUVELFFBQVEsQ0FBQyxRQUFnQztRQUNyQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsMkJBQTJCLENBQUMsVUFBa0I7UUFDMUMsT0FBTyxzQkFBc0IsR0FBRyxVQUFVLENBQUM7SUFDL0MsQ0FBQztDQUVKIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNsYXNzIENhY2hlTWFuYWdlciB7XHJcbiAgICBcclxuICAgIGZldGNoVGVtcGxhdGVGcm9tQ2FjaGUoZGF0YWJhc2VJZDogbnVtYmVyLCBjYWxsYmFjazogKHRlbXBsYXRlRHVtcDogVWludDhBcnJheSkgPT4gdm9pZCkge1xyXG4gICAgICAgIGlmKGRhdGFiYXNlSWQgPT0gbnVsbCl7Y2FsbGJhY2sobnVsbCk7IHJldHVybjt9XHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIGlmKCF0aGlzLmNhY2hlQXZhaWxhYmxlKCkpIGNhbGxiYWNrKG51bGwpO1xyXG4gICAgICAgIHRoaXMuZ2V0Q2FjaGUoKGNhY2hlKSA9PiB7XHJcbiAgICAgICAgICAgIGNhY2hlLm1hdGNoKHRoYXQuZGF0YWJhc2VJZFRvQ2FjaGVJZGVudGlmaWVyKGRhdGFiYXNlSWQpKS50aGVuKFxyXG4gICAgICAgICAgICAgICAgKHZhbHVlKT0+e1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLmFycmF5QnVmZmVyKCkudGhlbigoYnVmZmVyKSA9PiBjYWxsYmFjayhuZXcgVWludDhBcnJheShidWZmZXIpKSk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+IGNhbGxiYWNrKG51bGwpKTtcclxuICAgICAgICB9KSAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgc2F2ZVRlbXBsYXRlVG9DYWNoZShkYXRhYmFzZUlkOiBudW1iZXIsIHRlbXBsYXRlRHVtcDogVWludDhBcnJheSkge1xyXG4gICAgICAgIGlmKCF0aGlzLmNhY2hlQXZhaWxhYmxlKCkpIHJldHVybjtcclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5nZXRDYWNoZSgoY2FjaGUpID0+IHtcclxuICAgICAgICAgICAgY2FjaGUucHV0KHRoYXQuZGF0YWJhc2VJZFRvQ2FjaGVJZGVudGlmaWVyKGRhdGFiYXNlSWQpLCBuZXcgUmVzcG9uc2UodGVtcGxhdGVEdW1wKSk7XHJcbiAgICAgICAgfSkgICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIGNhY2hlQXZhaWxhYmxlKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiAnY2FjaGVzJyBpbiBzZWxmO1xyXG4gICAgfVxyXG5cclxuICAgIGdldENhY2hlKGNhbGxiYWNrOiAoY2FjaGU6IENhY2hlKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgY2FjaGVzLm9wZW4oJ215LWNhY2hlJykudGhlbihjYWxsYmFjayk7XHJcbiAgICB9XHJcblxyXG4gICAgZGF0YWJhc2VJZFRvQ2FjaGVJZGVudGlmaWVyKGRhdGFiYXNlSWQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIFwiL29ubGluZUlkZVRlbXBsYXRlRGJcIiArIGRhdGFiYXNlSWQ7XHJcbiAgICB9XHJcblxyXG59Il19