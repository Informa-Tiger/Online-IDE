import { Enum } from "../../compiler/types/Enum.js";
import { TokenType } from "../../compiler/lexer/Token.js";
export class RepeatTypeClass extends Enum {
    constructor(module) {
        super("RepeatType", module, [
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "once"
            },
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "loop"
            },
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "backAndForth"
            },
        ]);
        this.documentation = "Gibt an, auf welche Art eine Sprite-Animation abgespielt werden soll.";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVwZWF0VHlwZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9jbGllbnQvcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvUmVwZWF0VHlwZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFcEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTFELE1BQU0sT0FBTyxlQUFnQixTQUFRLElBQUk7SUFFckMsWUFBWSxNQUFjO1FBQ3RCLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSxFQUFFO1lBQ3hCO2dCQUNJLElBQUksRUFBRSxTQUFTLENBQUMsYUFBYTtnQkFDN0IsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsVUFBVSxFQUFFLE1BQU07YUFDckI7WUFDRDtnQkFDSSxJQUFJLEVBQUUsU0FBUyxDQUFDLGFBQWE7Z0JBQzdCLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxNQUFNO2FBQ3JCO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFNBQVMsQ0FBQyxhQUFhO2dCQUM3QixRQUFRLEVBQUUsSUFBSTtnQkFDZCxVQUFVLEVBQUUsY0FBYzthQUM3QjtTQUNKLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxhQUFhLEdBQUcsdUVBQXVFLENBQUE7SUFDaEcsQ0FBQztDQUVKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRW51bSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9FbnVtLmpzXCI7XHJcbmltcG9ydCB7IE1vZHVsZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IFRva2VuVHlwZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci9sZXhlci9Ub2tlbi5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFJlcGVhdFR5cGVDbGFzcyBleHRlbmRzIEVudW0ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG1vZHVsZTogTW9kdWxlKXtcclxuICAgICAgICBzdXBlcihcIlJlcGVhdFR5cGVcIiwgbW9kdWxlLCBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoRW51bVZhbHVlLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG51bGwsIFxyXG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogXCJvbmNlXCJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hFbnVtVmFsdWUsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbnVsbCxcclxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IFwibG9vcFwiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoRW51bVZhbHVlLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG51bGwsXHJcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBcImJhY2tBbmRGb3J0aFwiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXSk7XHJcblxyXG4gICAgICAgIHRoaXMuZG9jdW1lbnRhdGlvbiA9IFwiR2lidCBhbiwgYXVmIHdlbGNoZSBBcnQgZWluZSBTcHJpdGUtQW5pbWF0aW9uIGFiZ2VzcGllbHQgd2VyZGVuIHNvbGwuXCJcclxuICAgIH1cclxuXHJcbn0iXX0=