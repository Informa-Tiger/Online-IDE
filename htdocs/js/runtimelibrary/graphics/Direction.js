import { Enum } from "../../compiler/types/Enum.js";
import { TokenType } from "../../compiler/lexer/Token.js";
export class DirectionClass extends Enum {
    constructor(module) {
        super("Direction", module, [
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "top"
            },
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "right"
            },
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "bottom"
            },
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "left"
            }
        ]);
        this.documentation = "Richtung (oben, rechts, unten, links)";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGlyZWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9EaXJlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXBELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUxRCxNQUFNLE9BQU8sY0FBZSxTQUFRLElBQUk7SUFFcEMsWUFBWSxNQUFjO1FBQ3RCLEtBQUssQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFO1lBQ3ZCO2dCQUNJLElBQUksRUFBRSxTQUFTLENBQUMsYUFBYTtnQkFDN0IsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsVUFBVSxFQUFFLEtBQUs7YUFDcEI7WUFDRDtnQkFDSSxJQUFJLEVBQUUsU0FBUyxDQUFDLGFBQWE7Z0JBQzdCLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxPQUFPO2FBQ3RCO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFNBQVMsQ0FBQyxhQUFhO2dCQUM3QixRQUFRLEVBQUUsSUFBSTtnQkFDZCxVQUFVLEVBQUUsUUFBUTthQUN2QjtZQUNEO2dCQUNJLElBQUksRUFBRSxTQUFTLENBQUMsYUFBYTtnQkFDN0IsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsVUFBVSxFQUFFLE1BQU07YUFDckI7U0FDSixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsYUFBYSxHQUFHLHVDQUF1QyxDQUFBO0lBQ2hFLENBQUM7Q0FFSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEVudW0gfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvRW51bS5qc1wiO1xyXG5pbXBvcnQgeyBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBUb2tlblR5cGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvbGV4ZXIvVG9rZW4uanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBEaXJlY3Rpb25DbGFzcyBleHRlbmRzIEVudW0ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG1vZHVsZTogTW9kdWxlKXtcclxuICAgICAgICBzdXBlcihcIkRpcmVjdGlvblwiLCBtb2R1bGUsIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hFbnVtVmFsdWUsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbnVsbCxcclxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IFwidG9wXCJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hFbnVtVmFsdWUsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbnVsbCxcclxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IFwicmlnaHRcIlxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEVudW1WYWx1ZSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogXCJib3R0b21cIlxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlblR5cGUucHVzaEVudW1WYWx1ZSxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogXCJsZWZ0XCJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIF0pO1xyXG5cclxuICAgICAgICB0aGlzLmRvY3VtZW50YXRpb24gPSBcIlJpY2h0dW5nIChvYmVuLCByZWNodHMsIHVudGVuLCBsaW5rcylcIlxyXG4gICAgfVxyXG5cclxufSJdfQ==