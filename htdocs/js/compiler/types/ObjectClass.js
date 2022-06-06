import { Method, Parameterlist } from "./Types.js";
import { stringPrimitiveType } from "./PrimitiveTypes.js";
import { RuntimeObject } from "../../interpreter/RuntimeObject.js";
import { Klass } from "./Class.js";
/**
 * Base class for all classes
 */
export class ObjectClass extends Klass {
    constructor(module) {
        super("Object", module, "Basisklasse aller Klassen");
        // stringPrimitiveType is used here before it is initialized. This problem is solved
        // in the constructor of StringprimitiveType.
        let m = new Method("toString", new Parameterlist([]), stringPrimitiveType, (parameters) => {
            if (parameters[0].value instanceof RuntimeObject) {
                return "(" + parameters[0].value.class.identifier + ")";
            }
            else {
                return parameters[0].value;
            }
        }, false, false);
        m.isVirtual = true;
        this.addMethod(m);
        // // Add default parameterless constructor
        // let m = new Method("Object", new Parameterlist([]), null,
        // (parameters) => {
        // }, false, false);
        // m.isConstructor = true;
        // this.addMethod(m);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT2JqZWN0Q2xhc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L2NvbXBpbGVyL3R5cGVzL09iamVjdENsYXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFTLE1BQU0sWUFBWSxDQUFDO0FBQzFELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzFELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVuRSxPQUFPLEVBQWEsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBUTlDOztHQUVHO0FBRUgsTUFBTSxPQUFPLFdBQVksU0FBUSxLQUFLO0lBRWxDLFlBQVksTUFBYztRQUN0QixLQUFLLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBRXJELG9GQUFvRjtRQUNwRiw2Q0FBNkM7UUFDN0MsSUFBSSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLElBQUksYUFBYSxDQUFDLEVBQUUsQ0FBQyxFQUFFLG1CQUFtQixFQUN6RSxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ1gsSUFBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxZQUFZLGFBQWEsRUFBQztnQkFDNUMsT0FBTyxHQUFHLEdBQTRCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7YUFDckY7aUJBQU07Z0JBQ0gsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO2FBQzlCO1FBR0wsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqQixDQUFDLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUVuQixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBR2xCLDJDQUEyQztRQUMzQyw0REFBNEQ7UUFDNUQsb0JBQW9CO1FBRXBCLG9CQUFvQjtRQUVwQiwwQkFBMEI7UUFFMUIscUJBQXFCO0lBRXpCLENBQUM7Q0FJSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1ldGhvZCwgUGFyYW1ldGVybGlzdCwgVmFsdWUgfSBmcm9tIFwiLi9UeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBzdHJpbmdQcmltaXRpdmVUeXBlIH0gZnJvbSBcIi4vUHJpbWl0aXZlVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgUnVudGltZU9iamVjdCB9IGZyb20gXCIuLi8uLi9pbnRlcnByZXRlci9SdW50aW1lT2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IE1vZHVsZSB9IGZyb20gXCIuLi9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IEludGVyZmFjZSwgS2xhc3MgfSBmcm9tIFwiLi9DbGFzcy5qc1wiO1xyXG4vLyBuZXU6XHJcbmltcG9ydCB7IEVudW0sIEVudW1SdW50aW1lT2JqZWN0IH0gZnJvbSBcIi4vRW51bS5qc1wiO1xyXG5pbXBvcnQgeyB0eXBlIH0gZnJvbSBcImpxdWVyeVwiO1xyXG5pbXBvcnQgeyBqc29uIH0gZnJvbSBcImV4cHJlc3NcIjtcclxuaW1wb3J0IHsgQXJyYXlUeXBlIH0gZnJvbSBcIi4vQXJyYXkuanNcIjtcclxuXHJcblxyXG4vKipcclxuICogQmFzZSBjbGFzcyBmb3IgYWxsIGNsYXNzZXNcclxuICovXHJcblxyXG5leHBvcnQgY2xhc3MgT2JqZWN0Q2xhc3MgZXh0ZW5kcyBLbGFzcyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IobW9kdWxlOiBNb2R1bGUpIHtcclxuICAgICAgICBzdXBlcihcIk9iamVjdFwiLCBtb2R1bGUsIFwiQmFzaXNrbGFzc2UgYWxsZXIgS2xhc3NlblwiKTtcclxuXHJcbiAgICAgICAgLy8gc3RyaW5nUHJpbWl0aXZlVHlwZSBpcyB1c2VkIGhlcmUgYmVmb3JlIGl0IGlzIGluaXRpYWxpemVkLiBUaGlzIHByb2JsZW0gaXMgc29sdmVkXHJcbiAgICAgICAgLy8gaW4gdGhlIGNvbnN0cnVjdG9yIG9mIFN0cmluZ3ByaW1pdGl2ZVR5cGUuXHJcbiAgICAgICAgbGV0IG0gPSBuZXcgTWV0aG9kKFwidG9TdHJpbmdcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW10pLCBzdHJpbmdQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICAgICAgICAgIGlmKHBhcmFtZXRlcnNbMF0udmFsdWUgaW5zdGFuY2VvZiBSdW50aW1lT2JqZWN0KXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIihcIiArICg8UnVudGltZU9iamVjdD48dW5rbm93bj5wYXJhbWV0ZXJzWzBdLnZhbHVlKS5jbGFzcy5pZGVudGlmaWVyICsgXCIpXCI7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgfSwgZmFsc2UsIGZhbHNlKTtcclxuICAgICAgICBtLmlzVmlydHVhbCA9IHRydWU7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobSk7XHJcblxyXG5cclxuICAgICAgICAvLyAvLyBBZGQgZGVmYXVsdCBwYXJhbWV0ZXJsZXNzIGNvbnN0cnVjdG9yXHJcbiAgICAgICAgLy8gbGV0IG0gPSBuZXcgTWV0aG9kKFwiT2JqZWN0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtdKSwgbnVsbCxcclxuICAgICAgICAvLyAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAvLyB9LCBmYWxzZSwgZmFsc2UpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIG0uaXNDb25zdHJ1Y3RvciA9IHRydWU7XHJcblxyXG4gICAgICAgIC8vIHRoaXMuYWRkTWV0aG9kKG0pO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG5cclxufVxyXG4iXX0=