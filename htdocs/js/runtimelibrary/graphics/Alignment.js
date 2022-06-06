import { Enum } from "../../compiler/types/Enum.js";
import { TokenType } from "../../compiler/lexer/Token.js";
export class AlignmentClass extends Enum {
    constructor(module) {
        super("Alignment", module, [
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "left"
            },
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "center"
            },
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "right"
            },
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "top"
            },
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "bottom"
            },
        ]);
        this.documentation = "Mögliche Ausrichtungen";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxpZ25tZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9BbGlnbm1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXBELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUxRCxNQUFNLE9BQU8sY0FBZSxTQUFRLElBQUk7SUFFcEMsWUFBWSxNQUFjO1FBQ3RCLEtBQUssQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFO1lBQ3ZCO2dCQUNJLElBQUksRUFBRSxTQUFTLENBQUMsYUFBYTtnQkFDN0IsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsVUFBVSxFQUFFLE1BQU07YUFDckI7WUFDRDtnQkFDSSxJQUFJLEVBQUUsU0FBUyxDQUFDLGFBQWE7Z0JBQzdCLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxRQUFRO2FBQ3ZCO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFNBQVMsQ0FBQyxhQUFhO2dCQUM3QixRQUFRLEVBQUUsSUFBSTtnQkFDZCxVQUFVLEVBQUUsT0FBTzthQUN0QjtZQUNEO2dCQUNJLElBQUksRUFBRSxTQUFTLENBQUMsYUFBYTtnQkFDN0IsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsVUFBVSxFQUFFLEtBQUs7YUFDcEI7WUFDRDtnQkFDSSxJQUFJLEVBQUUsU0FBUyxDQUFDLGFBQWE7Z0JBQzdCLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxRQUFRO2FBQ3ZCO1NBQ0osQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGFBQWEsR0FBRyx3QkFBd0IsQ0FBQTtJQUNqRCxDQUFDO0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFbnVtIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL0VudW0uanNcIjtcclxuaW1wb3J0IHsgTW9kdWxlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3BhcnNlci9Nb2R1bGUuanNcIjtcclxuaW1wb3J0IHsgVG9rZW5UeXBlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL2xleGVyL1Rva2VuLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQWxpZ25tZW50Q2xhc3MgZXh0ZW5kcyBFbnVtIHtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihtb2R1bGU6IE1vZHVsZSl7XHJcbiAgICAgICAgc3VwZXIoXCJBbGlnbm1lbnRcIiwgbW9kdWxlLCBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoRW51bVZhbHVlLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG51bGwsXHJcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBcImxlZnRcIlxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEVudW1WYWx1ZSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogXCJjZW50ZXJcIlxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEVudW1WYWx1ZSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogXCJyaWdodFwiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoRW51bVZhbHVlLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG51bGwsXHJcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBcInRvcFwiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5wdXNoRW51bVZhbHVlLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG51bGwsXHJcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBcImJvdHRvbVwiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXSk7XHJcblxyXG4gICAgICAgIHRoaXMuZG9jdW1lbnRhdGlvbiA9IFwiTcO2Z2xpY2hlIEF1c3JpY2h0dW5nZW5cIlxyXG4gICAgfVxyXG5cclxufSJdfQ==