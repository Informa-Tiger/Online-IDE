import { Klass, Interface, Visibility } from "./Class.js";
import { Method, Attribute } from "./Types.js";
import { objectType } from "./PrimitiveTypes.js";
import { formatAsJavadocComment } from "../../tools/StringTools.js";
export function getDeclarationAsString(element, indent = "", short = false) {
    if (element instanceof Klass) {
        if (element.isTypeVariable) {
            return getTypeVariableDeclaration(element);
        }
        let s = "";
        if (element.documentation != null && element.documentation != "") {
            if (element.documentation.startsWith("/*")) {
                s += (indent + element.documentation).replace(/\n/g, "\n" + indent) + "\n";
            }
            else {
                // s += indent + "/**  \n" + element.documentation + "  \n**/  \n" + indent;
                s += formatAsJavadocComment(element.documentation, indent) + "\n";
            }
        }
        if (element.visibility != null)
            s += Visibility[element.visibility] + " ";
        if (element.isAbstract)
            s += "abstract ";
        s += "class " + element.identifier + " ";
        if (element.typeVariables.length > 0) {
            s += getGenericParameterDefinition(element);
        }
        if (element.baseClass != null && element.baseClass.identifier != "Object") {
            s += "extends " + element.baseClass.identifier + " ";
            if (element.baseClass.typeVariables.length > 0) {
                s += getGenericParameterDefinition(element.baseClass);
            }
        }
        if (element.implements != null && element.implements.length > 0) {
            s += "implements ";
            for (let i = 0; i < element.implements.length; i++) {
                s += element.implements[i].identifier;
                if (element.implements[i].typeVariables.length > 0) {
                    s += getGenericParameterDefinition(element.implements[i]);
                }
                if (i < element.implements.length - 1) {
                    s += ", ";
                }
            }
        }
        if (short)
            return s;
        s += indent + "{\n  ";
        for (let a of element.getAttributes(Visibility.protected)) {
            s += indent + "\n" + getDeclarationAsString(a, "  ") + ";\n";
        }
        if (element.staticClass != null) {
            for (let a of element.staticClass.getAttributes(Visibility.protected)) {
                s += indent + "\n" + getDeclarationAsString(a, "  ") + ";\n";
            }
        }
        for (let m of element.getMethods(Visibility.protected)) {
            s += indent + "\n" + getDeclarationAsString(m, "  ") + ";\n";
        }
        if (element.staticClass != null) {
            for (let m of element.staticClass.getMethods(Visibility.protected)) {
                s += indent + "\n" + getDeclarationAsString(m, "  ") + ";\n";
            }
        }
        s += "\n}";
        return s;
    }
    if (element instanceof Interface) {
        let decl = "";
        if (element.documentation != null && element.documentation != "" && !short) {
            if (element.documentation.startsWith("/*")) {
                decl += (indent + element.documentation).replace(/\n/g, "\n" + indent) + "\n";
            }
            else {
                decl += formatAsJavadocComment(element.documentation, indent) + "\n";
            }
        }
        decl += indent + "interface " + element.identifier;
        if (element.typeVariables.length > 0) {
            decl += getGenericParameterDefinition(element);
        }
        if (element.extends != null && element.extends.length > 0) {
            decl += "extends ";
            for (let i = 0; i < element.extends.length; i++) {
                decl += element.extends[i].identifier;
                if (element.extends[i].typeVariables.length > 0) {
                    decl += getGenericParameterDefinition(element.extends[i]);
                }
                if (i < element.extends.length - 1) {
                    decl += ", ";
                }
            }
        }
        if (!short) {
            decl += "{\n";
            for (let m of element.methods) {
                decl += indent + "\n" + getDeclarationAsString(m, "  ") + ";\n";
            }
            decl += "\n}";
        }
        return decl;
    }
    if (element instanceof Attribute) {
        let s = "";
        if (element.documentation != null && element.documentation != "" && !short) {
            if (element.documentation.startsWith("/*")) {
                s += indent + element.documentation.replace(/\n/g, "\n" + indent) + "\n";
            }
            else {
                s += formatAsJavadocComment(element.documentation, indent) + "\n";
            }
        }
        s += indent;
        if (element.visibility != null)
            s += Visibility[element.visibility] + " ";
        if (element.isStatic)
            s += "static ";
        s += getTypeIdentifier(element.type) + " " + element.identifier;
        return s;
    }
    if (element instanceof Method) {
        let s = "";
        if (element.documentation != null && element.documentation != "" && !short) {
            if (element.documentation.startsWith("/*")) {
                s += indent + element.documentation.replace(/\n/g, "\n" + indent) + "\n";
            }
            else {
                s += formatAsJavadocComment(element.documentation, indent) + "\n";
            }
        }
        s += indent;
        if (element.visibility != null)
            s += Visibility[element.visibility] + " ";
        if (element.isStatic)
            s += "static ";
        if (element.getReturnType() != null) {
            s += getTypeIdentifier(element.getReturnType()) + " ";
        }
        else {
            s += element.isConstructor ? "" : "void ";
        }
        s += element.identifier + "(";
        let parameters = element.getParameterList().parameters;
        for (let i = 0; i < parameters.length; i++) {
            let p = parameters[i];
            let type = element.getParameterType(i);
            if (p.isEllipsis) {
                type = type.arrayOfType;
            }
            s += getTypeIdentifier(type) + (p.isEllipsis ? "..." : "") + " " + p.identifier;
            if (i < parameters.length - 1) {
                s += ", ";
            }
        }
        s += ")";
        return s;
    }
    return "";
}
function getTypeVariableDeclaration(element) {
    let s = element.identifier;
    if (element.isGenericVariantFrom != objectType)
        s += " extends " + getTypeIdentifier(element.isGenericVariantFrom);
    if (element.implements.length > 0) {
        let implList = element.implements.filter(impl => element.isGenericVariantFrom.implements.indexOf(impl) < 0)
            .map(impl => getTypeIdentifier(impl)).join(", ");
        if (implList != "") {
            s += " implements " + implList;
        }
    }
    return s;
}
export function getTypeIdentifier(type) {
    var _a, _b;
    if (type instanceof Klass || type instanceof Interface) {
        if (type.typeVariables.length > 0) {
            let s = (type["isTypeVariable"] ? (type.identifier + " extends " + ((_a = type.isGenericVariantFrom) === null || _a === void 0 ? void 0 : _a.identifier)) : type.identifier)
                + "<";
            s += type.typeVariables.map(tv => getTypeIdentifier(tv.type)).join(", ");
            return s + ">";
        }
    }
    return type["isTypeVariable"] ? (type.identifier + " extends " + ((_b = type["isGenericVariantFrom"]) === null || _b === void 0 ? void 0 : _b.identifier)) : type.identifier;
}
export function getGenericParameterDefinition(element) {
    let s = "";
    if (element.typeVariables.length > 0) {
        s = "<";
        let typeList = [];
        for (let tv of element.typeVariables) {
            let t = tv.type.identifier;
            let k = tv.type;
            if (k.isGenericVariantFrom != null && k.isGenericVariantFrom.identifier != "Object") {
                t += " extends " + k.isGenericVariantFrom.identifier;
            }
            if (k.implements != null) {
                let implList = k.implements;
                if (k.isGenericVariantFrom != null) {
                    implList = implList.filter(impl => k.isGenericVariantFrom.implements.indexOf(impl) < 0);
                }
                for (let im of implList) {
                    t += " & " + im.identifier;
                }
            }
            typeList.push(t);
        }
        s += typeList.join(", ");
        s += "> ";
    }
    return s;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGVjbGFyYXRpb25IZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L2NvbXBpbGVyL3R5cGVzL0RlY2xhcmF0aW9uSGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUMxRCxPQUFPLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBaUMsTUFBTSxZQUFZLENBQUM7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRWpELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRXBFLE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxPQUEwRCxFQUM3RixTQUFpQixFQUFFLEVBQUUsUUFBaUIsS0FBSztJQUUzQyxJQUFJLE9BQU8sWUFBWSxLQUFLLEVBQUU7UUFFMUIsSUFBSSxPQUFPLENBQUMsY0FBYyxFQUFFO1lBQ3hCLE9BQU8sMEJBQTBCLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDOUM7UUFFRCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFWCxJQUFJLE9BQU8sQ0FBQyxhQUFhLElBQUksSUFBSSxJQUFJLE9BQU8sQ0FBQyxhQUFhLElBQUksRUFBRSxFQUFFO1lBQzlELElBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUM7Z0JBQ3RDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDO2FBQzlFO2lCQUFNO2dCQUNILDRFQUE0RTtnQkFDNUUsQ0FBQyxJQUFJLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDO2FBQ3JF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QUM1QixJQUFJLENBQUMsQ0FBQyxvQkFBb0IsSUFBSSxJQUFJLEVBQUU7b0JBQ2hDLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7aUJBQzNGO2dCQUVELEtBQUssSUFBSSxFQUFFLElBQUksUUFBUSxFQUFFO29CQUNyQixDQUFDLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUM7aUJBQzlCO2FBQ0o7WUFDRCxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3BCO1FBRUQsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsQ0FBQyxJQUFJLElBQUksQ0FBQztLQUNiO0lBRUQsT0FBTyxDQUFDLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgS2xhc3MsIEludGVyZmFjZSwgVmlzaWJpbGl0eSB9IGZyb20gXCIuL0NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IE1ldGhvZCwgQXR0cmlidXRlLCBUeXBlLCBQcmltaXRpdmVUeXBlLCBWYXJpYWJsZSB9IGZyb20gXCIuL1R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IG9iamVjdFR5cGUgfSBmcm9tIFwiLi9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheVR5cGUgfSBmcm9tIFwiLi9BcnJheS5qc1wiO1xyXG5pbXBvcnQgeyBmb3JtYXRBc0phdmFkb2NDb21tZW50IH0gZnJvbSBcIi4uLy4uL3Rvb2xzL1N0cmluZ1Rvb2xzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVjbGFyYXRpb25Bc1N0cmluZyhlbGVtZW50OiBLbGFzcyB8IEludGVyZmFjZSB8IE1ldGhvZCB8IEF0dHJpYnV0ZSB8IFZhcmlhYmxlLFxyXG4gICAgaW5kZW50OiBzdHJpbmcgPSBcIlwiLCBzaG9ydDogYm9vbGVhbiA9IGZhbHNlKTogc3RyaW5nIHtcclxuXHJcbiAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEtsYXNzKSB7XHJcblxyXG4gICAgICAgIGlmIChlbGVtZW50LmlzVHlwZVZhcmlhYmxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBnZXRUeXBlVmFyaWFibGVEZWNsYXJhdGlvbihlbGVtZW50KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzID0gXCJcIjtcclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQuZG9jdW1lbnRhdGlvbiAhPSBudWxsICYmIGVsZW1lbnQuZG9jdW1lbnRhdGlvbiAhPSBcIlwiKSB7XHJcbiAgICAgICAgICAgIGlmKGVsZW1lbnQuZG9jdW1lbnRhdGlvbi5zdGFydHNXaXRoKFwiLypcIikpe1xyXG4gICAgICAgICAgICAgICAgcyArPSAoaW5kZW50ICsgZWxlbWVudC5kb2N1bWVudGF0aW9uKS5yZXBsYWNlKC9cXG4vZywgXCJcXG5cIiArIGluZGVudCkgKyBcIlxcblwiO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gcyArPSBpbmRlbnQgKyBcIi8qKiAgXFxuXCIgKyBlbGVtZW50LmRvY3VtZW50YXRpb24gKyBcIiAgXFxuKiovICBcXG5cIiArIGluZGVudDtcclxuICAgICAgICAgICAgICAgIHMgKz0gZm9ybWF0QXNKYXZhZG9jQ29tbWVudChlbGVtZW50LmRvY3VtZW50YXRpb24sIGluZGVudCkgKyBcIlxcblwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZWxlbWVudC52aXNpYmlsaXR5ICE9IG51bGwpIHMgKz0gVmlzaWJpbGl0eVtlbGVtZW50LnZpc2liaWxpdHldICsgXCIgXCI7XHJcbiAgICAgICAgaWYgKGVsZW1lbnQuaXNBYnN0cmFjdCkgcyArPSBcImFic3RyYWN0IFwiO1xyXG4gICAgICAgIHMgKz0gXCJjbGFzcyBcIiArIGVsZW1lbnQuaWRlbnRpZmllciArIFwiIFwiO1xyXG5cclxuICAgICAgICBpZiAoZWxlbWVudC50eXBlVmFyaWFibGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgcyArPSBnZXRHZW5lcmljUGFyYW1ldGVyRGVmaW5pdGlvbihlbGVtZW50KTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBpZiAoZWxlbWVudC5iYXNlQ2xhc3MgIT0gbnVsbCAmJiBlbGVtZW50LmJhc2VDbGFzcy5pZGVudGlmaWVyICE9IFwiT2JqZWN0XCIpIHtcclxuICAgICAgICAgICAgcyArPSBcImV4dGVuZHMgXCIgKyBlbGVtZW50LmJhc2VDbGFzcy5pZGVudGlmaWVyICsgXCIgXCI7XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmJhc2VDbGFzcy50eXBlVmFyaWFibGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHMgKz0gZ2V0R2VuZXJpY1BhcmFtZXRlckRlZmluaXRpb24oZWxlbWVudC5iYXNlQ2xhc3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZWxlbWVudC5pbXBsZW1lbnRzICE9IG51bGwgJiYgZWxlbWVudC5pbXBsZW1lbnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgcyArPSBcImltcGxlbWVudHMgXCI7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWxlbWVudC5pbXBsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBzICs9IGVsZW1lbnQuaW1wbGVtZW50c1tpXS5pZGVudGlmaWVyO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuaW1wbGVtZW50c1tpXS50eXBlVmFyaWFibGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBzICs9IGdldEdlbmVyaWNQYXJhbWV0ZXJEZWZpbml0aW9uKGVsZW1lbnQuaW1wbGVtZW50c1tpXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA8IGVsZW1lbnQuaW1wbGVtZW50cy5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcyArPSBcIiwgXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzaG9ydCkgcmV0dXJuIHM7XHJcblxyXG4gICAgICAgIHMgKz0gaW5kZW50ICsgXCJ7XFxuICBcIjtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgYSBvZiBlbGVtZW50LmdldEF0dHJpYnV0ZXMoVmlzaWJpbGl0eS5wcm90ZWN0ZWQpKSB7XHJcbiAgICAgICAgICAgIHMgKz0gaW5kZW50ICsgXCJcXG5cIiArIGdldERlY2xhcmF0aW9uQXNTdHJpbmcoYSwgXCIgIFwiKSArIFwiO1xcblwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQuc3RhdGljQ2xhc3MgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBhIG9mIGVsZW1lbnQuc3RhdGljQ2xhc3MuZ2V0QXR0cmlidXRlcyhWaXNpYmlsaXR5LnByb3RlY3RlZCkpIHtcclxuICAgICAgICAgICAgICAgIHMgKz0gaW5kZW50ICsgXCJcXG5cIiArIGdldERlY2xhcmF0aW9uQXNTdHJpbmcoYSwgXCIgIFwiKSArIFwiO1xcblwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBtIG9mIGVsZW1lbnQuZ2V0TWV0aG9kcyhWaXNpYmlsaXR5LnByb3RlY3RlZCkpIHtcclxuICAgICAgICAgICAgcyArPSBpbmRlbnQgKyBcIlxcblwiICsgZ2V0RGVjbGFyYXRpb25Bc1N0cmluZyhtLCBcIiAgXCIpICsgXCI7XFxuXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZWxlbWVudC5zdGF0aWNDbGFzcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG0gb2YgZWxlbWVudC5zdGF0aWNDbGFzcy5nZXRNZXRob2RzKFZpc2liaWxpdHkucHJvdGVjdGVkKSkge1xyXG4gICAgICAgICAgICAgICAgcyArPSBpbmRlbnQgKyBcIlxcblwiICsgZ2V0RGVjbGFyYXRpb25Bc1N0cmluZyhtLCBcIiAgXCIpICsgXCI7XFxuXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBzICs9IFwiXFxufVwiO1xyXG5cclxuICAgICAgICByZXR1cm4gcztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBJbnRlcmZhY2UpIHtcclxuXHJcbiAgICAgICAgbGV0IGRlY2wgPSBcIlwiO1xyXG5cclxuICAgICAgICBpZiAoZWxlbWVudC5kb2N1bWVudGF0aW9uICE9IG51bGwgJiYgZWxlbWVudC5kb2N1bWVudGF0aW9uICE9IFwiXCIgJiYgIXNob3J0KSB7XHJcbiAgICAgICAgICAgIGlmKGVsZW1lbnQuZG9jdW1lbnRhdGlvbi5zdGFydHNXaXRoKFwiLypcIikpe1xyXG4gICAgICAgICAgICAgICAgZGVjbCArPSAoaW5kZW50ICsgZWxlbWVudC5kb2N1bWVudGF0aW9uKS5yZXBsYWNlKC9cXG4vZywgXCJcXG5cIiArIGluZGVudCkgKyBcIlxcblwiO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZGVjbCArPSBmb3JtYXRBc0phdmFkb2NDb21tZW50KGVsZW1lbnQuZG9jdW1lbnRhdGlvbiwgaW5kZW50KSArIFwiXFxuXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlY2wgKz0gaW5kZW50ICsgXCJpbnRlcmZhY2UgXCIgKyBlbGVtZW50LmlkZW50aWZpZXI7XHJcblxyXG4gICAgICAgIGlmIChlbGVtZW50LnR5cGVWYXJpYWJsZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBkZWNsICs9IGdldEdlbmVyaWNQYXJhbWV0ZXJEZWZpbml0aW9uKGVsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQuZXh0ZW5kcyAhPSBudWxsICYmIGVsZW1lbnQuZXh0ZW5kcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGRlY2wgKz0gXCJleHRlbmRzIFwiO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVsZW1lbnQuZXh0ZW5kcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgZGVjbCArPSBlbGVtZW50LmV4dGVuZHNbaV0uaWRlbnRpZmllcjtcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmV4dGVuZHNbaV0udHlwZVZhcmlhYmxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVjbCArPSBnZXRHZW5lcmljUGFyYW1ldGVyRGVmaW5pdGlvbihlbGVtZW50LmV4dGVuZHNbaV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGkgPCBlbGVtZW50LmV4dGVuZHMubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlY2wgKz0gXCIsIFwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXNob3J0KSB7XHJcblxyXG4gICAgICAgICAgICBkZWNsICs9IFwie1xcblwiO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgbSBvZiBlbGVtZW50Lm1ldGhvZHMpIHtcclxuICAgICAgICAgICAgICAgIGRlY2wgKz0gaW5kZW50ICsgXCJcXG5cIiArIGdldERlY2xhcmF0aW9uQXNTdHJpbmcobSwgXCIgIFwiKSArIFwiO1xcblwiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkZWNsICs9IFwiXFxufVwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGRlY2w7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgQXR0cmlidXRlKSB7XHJcbiAgICAgICAgbGV0IHMgPSBcIlwiO1xyXG5cclxuICAgICAgICBpZiAoZWxlbWVudC5kb2N1bWVudGF0aW9uICE9IG51bGwgJiYgZWxlbWVudC5kb2N1bWVudGF0aW9uICE9IFwiXCIgJiYgIXNob3J0KSB7XHJcbiAgICAgICAgICAgIGlmKGVsZW1lbnQuZG9jdW1lbnRhdGlvbi5zdGFydHNXaXRoKFwiLypcIikpe1xyXG4gICAgICAgICAgICAgICAgcyArPSBpbmRlbnQgKyBlbGVtZW50LmRvY3VtZW50YXRpb24ucmVwbGFjZSgvXFxuL2csIFwiXFxuXCIgKyBpbmRlbnQpICsgXCJcXG5cIjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHMgKz0gZm9ybWF0QXNKYXZhZG9jQ29tbWVudChlbGVtZW50LmRvY3VtZW50YXRpb24sIGluZGVudCkgKyBcIlxcblwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzICs9IGluZGVudDtcclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQudmlzaWJpbGl0eSAhPSBudWxsKSBzICs9IFZpc2liaWxpdHlbZWxlbWVudC52aXNpYmlsaXR5XSArIFwiIFwiO1xyXG5cclxuICAgICAgICBpZiAoZWxlbWVudC5pc1N0YXRpYykgcyArPSBcInN0YXRpYyBcIjtcclxuXHJcbiAgICAgICAgcyArPSBnZXRUeXBlSWRlbnRpZmllcihlbGVtZW50LnR5cGUpICsgXCIgXCIgKyBlbGVtZW50LmlkZW50aWZpZXI7XHJcblxyXG4gICAgICAgIHJldHVybiBzO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgTWV0aG9kKSB7XHJcblxyXG4gICAgICAgIGxldCBzID0gXCJcIjtcclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQuZG9jdW1lbnRhdGlvbiAhPSBudWxsICYmIGVsZW1lbnQuZG9jdW1lbnRhdGlvbiAhPSBcIlwiICYmICFzaG9ydCkge1xyXG4gICAgICAgICAgICBpZihlbGVtZW50LmRvY3VtZW50YXRpb24uc3RhcnRzV2l0aChcIi8qXCIpKXtcclxuICAgICAgICAgICAgICAgIHMgKz0gaW5kZW50ICsgZWxlbWVudC5kb2N1bWVudGF0aW9uLnJlcGxhY2UoL1xcbi9nLCBcIlxcblwiICsgaW5kZW50KSArIFwiXFxuXCI7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzICs9IGZvcm1hdEFzSmF2YWRvY0NvbW1lbnQoZWxlbWVudC5kb2N1bWVudGF0aW9uLCBpbmRlbnQpICsgXCJcXG5cIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcyArPSBpbmRlbnQ7XHJcblxyXG4gICAgICAgIGlmIChlbGVtZW50LnZpc2liaWxpdHkgIT0gbnVsbCkgcyArPSBWaXNpYmlsaXR5W2VsZW1lbnQudmlzaWJpbGl0eV0gKyBcIiBcIjtcclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQuaXNTdGF0aWMpIHMgKz0gXCJzdGF0aWMgXCI7XHJcblxyXG4gICAgICAgIGlmIChlbGVtZW50LmdldFJldHVyblR5cGUoKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHMgKz0gZ2V0VHlwZUlkZW50aWZpZXIoZWxlbWVudC5nZXRSZXR1cm5UeXBlKCkpICsgXCIgXCI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcyArPSBlbGVtZW50LmlzQ29uc3RydWN0b3IgPyBcIlwiIDogXCJ2b2lkIFwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcyArPSBlbGVtZW50LmlkZW50aWZpZXIgKyBcIihcIjtcclxuXHJcbiAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSBlbGVtZW50LmdldFBhcmFtZXRlckxpc3QoKS5wYXJhbWV0ZXJzO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyYW1ldGVycy5sZW5ndGg7IGkrKykge1xyXG5cclxuICAgICAgICAgICAgbGV0IHAgPSBwYXJhbWV0ZXJzW2ldO1xyXG4gICAgICAgICAgICBsZXQgdHlwZTogVHlwZSA9IGVsZW1lbnQuZ2V0UGFyYW1ldGVyVHlwZShpKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChwLmlzRWxsaXBzaXMpIHtcclxuICAgICAgICAgICAgICAgIHR5cGUgPSAoPEFycmF5VHlwZT50eXBlKS5hcnJheU9mVHlwZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcyArPSBnZXRUeXBlSWRlbnRpZmllcih0eXBlKSArIChwLmlzRWxsaXBzaXMgPyBcIi4uLlwiIDogXCJcIikgKyBcIiBcIiArIHAuaWRlbnRpZmllcjtcclxuXHJcbiAgICAgICAgICAgIGlmIChpIDwgcGFyYW1ldGVycy5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICBzICs9IFwiLCBcIjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHMgKz0gXCIpXCI7XHJcblxyXG4gICAgICAgIHJldHVybiBzO1xyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFwiXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFR5cGVWYXJpYWJsZURlY2xhcmF0aW9uKGVsZW1lbnQ6IEtsYXNzKSB7XHJcbiAgICBsZXQgczogc3RyaW5nID0gZWxlbWVudC5pZGVudGlmaWVyO1xyXG5cclxuICAgIGlmIChlbGVtZW50LmlzR2VuZXJpY1ZhcmlhbnRGcm9tICE9IG9iamVjdFR5cGUpIHMgKz0gXCIgZXh0ZW5kcyBcIiArIGdldFR5cGVJZGVudGlmaWVyKGVsZW1lbnQuaXNHZW5lcmljVmFyaWFudEZyb20pO1xyXG4gICAgaWYgKGVsZW1lbnQuaW1wbGVtZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgbGV0IGltcGxMaXN0ID0gZWxlbWVudC5pbXBsZW1lbnRzLmZpbHRlcihpbXBsID0+IGVsZW1lbnQuaXNHZW5lcmljVmFyaWFudEZyb20uaW1wbGVtZW50cy5pbmRleE9mKGltcGwpIDwgMClcclxuICAgICAgICAgICAgLm1hcChpbXBsID0+IGdldFR5cGVJZGVudGlmaWVyKGltcGwpKS5qb2luKFwiLCBcIik7XHJcbiAgICAgICAgaWYgKGltcGxMaXN0ICE9IFwiXCIpIHtcclxuICAgICAgICAgICAgcyArPSBcIiBpbXBsZW1lbnRzIFwiICsgaW1wbExpc3Q7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZUlkZW50aWZpZXIodHlwZTogVHlwZSk6IHN0cmluZyB7XHJcbiAgICBpZiAodHlwZSBpbnN0YW5jZW9mIEtsYXNzIHx8IHR5cGUgaW5zdGFuY2VvZiBJbnRlcmZhY2UpIHtcclxuICAgICAgICBpZiAodHlwZS50eXBlVmFyaWFibGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgbGV0IHM6IHN0cmluZyA9ICh0eXBlW1wiaXNUeXBlVmFyaWFibGVcIl0gPyAodHlwZS5pZGVudGlmaWVyICsgXCIgZXh0ZW5kcyBcIiArIHR5cGUuaXNHZW5lcmljVmFyaWFudEZyb20/LmlkZW50aWZpZXIpIDogdHlwZS5pZGVudGlmaWVyKVxyXG4gICAgICAgICAgICAgICAgKyBcIjxcIjtcclxuICAgICAgICAgICAgcyArPSB0eXBlLnR5cGVWYXJpYWJsZXMubWFwKHR2ID0+IGdldFR5cGVJZGVudGlmaWVyKHR2LnR5cGUpKS5qb2luKFwiLCBcIik7XHJcbiAgICAgICAgICAgIHJldHVybiBzICsgXCI+XCI7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0eXBlW1wiaXNUeXBlVmFyaWFibGVcIl0gPyAodHlwZS5pZGVudGlmaWVyICsgXCIgZXh0ZW5kcyBcIiArIHR5cGVbXCJpc0dlbmVyaWNWYXJpYW50RnJvbVwiXT8uaWRlbnRpZmllcikgOiB0eXBlLmlkZW50aWZpZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRHZW5lcmljUGFyYW1ldGVyRGVmaW5pdGlvbihlbGVtZW50OiBLbGFzcyB8IEludGVyZmFjZSk6IHN0cmluZyB7XHJcblxyXG4gICAgbGV0IHM6IHN0cmluZyA9IFwiXCI7XHJcblxyXG4gICAgaWYgKGVsZW1lbnQudHlwZVZhcmlhYmxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcyA9IFwiPFwiO1xyXG5cclxuICAgICAgICBsZXQgdHlwZUxpc3Q6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgdHYgb2YgZWxlbWVudC50eXBlVmFyaWFibGVzKSB7XHJcbiAgICAgICAgICAgIGxldCB0OiBzdHJpbmcgPSB0di50eXBlLmlkZW50aWZpZXI7XHJcbiAgICAgICAgICAgIGxldCBrOiBLbGFzcyA9IHR2LnR5cGU7XHJcbiAgICAgICAgICAgIGlmIChrLmlzR2VuZXJpY1ZhcmlhbnRGcm9tICE9IG51bGwgJiYgay5pc0dlbmVyaWNWYXJpYW50RnJvbS5pZGVudGlmaWVyICE9IFwiT2JqZWN0XCIpIHtcclxuICAgICAgICAgICAgICAgIHQgKz0gXCIgZXh0ZW5kcyBcIiArIGsuaXNHZW5lcmljVmFyaWFudEZyb20uaWRlbnRpZmllcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoay5pbXBsZW1lbnRzICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaW1wbExpc3QgPSBrLmltcGxlbWVudHM7XHJcbiAgICAgICAgICAgICAgICBpZiAoay5pc0dlbmVyaWNWYXJpYW50RnJvbSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW1wbExpc3QgPSBpbXBsTGlzdC5maWx0ZXIoaW1wbCA9PiBrLmlzR2VuZXJpY1ZhcmlhbnRGcm9tLmltcGxlbWVudHMuaW5kZXhPZihpbXBsKSA8IDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGltIG9mIGltcGxMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdCArPSBcIiAmIFwiICsgaW0uaWRlbnRpZmllcjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0eXBlTGlzdC5wdXNoKHQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcyArPSB0eXBlTGlzdC5qb2luKFwiLCBcIik7XHJcbiAgICAgICAgcyArPSBcIj4gXCI7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHM7XHJcbn0iXX0=