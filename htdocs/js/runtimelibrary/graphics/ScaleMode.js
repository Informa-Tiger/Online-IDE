import { Enum } from "../../compiler/types/Enum.js";
import { TokenType } from "../../compiler/lexer/Token.js";
export class ScaleModeClass extends Enum {
    constructor(module) {
        super("ScaleMode", module, [
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "linear"
            },
            {
                type: TokenType.pushEnumValue,
                position: null,
                identifier: "nearest_neighbour"
            }
        ]);
        this.documentation = "Art der Interpolation der Pixelfarben beim Skalieren von grafischen Objekten";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2NhbGVNb2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9TY2FsZU1vZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXBELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUxRCxNQUFNLE9BQU8sY0FBZSxTQUFRLElBQUk7SUFFcEMsWUFBWSxNQUFjO1FBQ3RCLEtBQUssQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFO1lBQ3ZCO2dCQUNJLElBQUksRUFBRSxTQUFTLENBQUMsYUFBYTtnQkFDN0IsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsVUFBVSxFQUFFLFFBQVE7YUFDdkI7WUFDRDtnQkFDSSxJQUFJLEVBQUUsU0FBUyxDQUFDLGFBQWE7Z0JBQzdCLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxtQkFBbUI7YUFDbEM7U0FDSixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsYUFBYSxHQUFHLDhFQUE4RSxDQUFBO0lBQ3ZHLENBQUM7Q0FFSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEVudW0gfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvRW51bS5qc1wiO1xyXG5pbXBvcnQgeyBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBUb2tlblR5cGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvbGV4ZXIvVG9rZW4uanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTY2FsZU1vZGVDbGFzcyBleHRlbmRzIEVudW0ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG1vZHVsZTogTW9kdWxlKXtcclxuICAgICAgICBzdXBlcihcIlNjYWxlTW9kZVwiLCBtb2R1bGUsIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hFbnVtVmFsdWUsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbnVsbCxcclxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IFwibGluZWFyXCJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5UeXBlLnB1c2hFbnVtVmFsdWUsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogbnVsbCxcclxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IFwibmVhcmVzdF9uZWlnaGJvdXJcIlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXSk7XHJcblxyXG4gICAgICAgIHRoaXMuZG9jdW1lbnRhdGlvbiA9IFwiQXJ0IGRlciBJbnRlcnBvbGF0aW9uIGRlciBQaXhlbGZhcmJlbiBiZWltIFNrYWxpZXJlbiB2b24gZ3JhZmlzY2hlbiBPYmpla3RlblwiXHJcbiAgICB9XHJcblxyXG59Il19