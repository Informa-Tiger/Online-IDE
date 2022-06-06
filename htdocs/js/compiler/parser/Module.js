import { ArrayListClass } from "../../runtimelibrary/collections/ArrayList.js";
import { CollectionClass } from "../../runtimelibrary/collections/Collection.js";
import { IterableClass } from "../../runtimelibrary/collections/Iterable.js";
import { IteratorClass } from "../../runtimelibrary/collections/Iterator.js";
import { ListClass } from "../../runtimelibrary/collections/List.js";
import { ListIteratorImplClass } from "../../runtimelibrary/collections/ListIteratorImpl.js";
import { StackClass } from "../../runtimelibrary/collections/Stack.js";
import { VectorClass } from "../../runtimelibrary/collections/Vector.js";
import { SetClass } from "../../runtimelibrary/collections/Set.js";
import { SetIteratorImplClass } from "../../runtimelibrary/collections/SetIteratorImpl.js";
import { HashSetClass } from "../../runtimelibrary/collections/HashSet.js";
import { LinkedHashSetClass } from "../../runtimelibrary/collections/LinkedHashSet.js";
import { QueueClass } from "../../runtimelibrary/collections/Queue.js";
import { DequeClass } from "../../runtimelibrary/collections/Deque.js";
import { LinkedListClass } from "../../runtimelibrary/collections/LinkedList.js";
import { ConsoleClass } from "../../runtimelibrary/Console.js";
import { Actor as ActorClass } from "../../runtimelibrary/graphics/Actor.js";
import { AlignmentClass } from "../../runtimelibrary/graphics/Alignment.js";
import { BitmapClass } from "../../runtimelibrary/graphics/Bitmap.js";
import { CircleClass as CircleClass } from "../../runtimelibrary/graphics/Circle.js";
import { SectorClass } from "../../runtimelibrary/graphics/Sector.js";
import { ArcClass } from "../../runtimelibrary/graphics/Arc.js";
import { ColorClass } from "../../runtimelibrary/graphics/Color.js";
import { EllipseClass } from "../../runtimelibrary/graphics/Ellipse.js";
import { FilledShapeClass } from "../../runtimelibrary/graphics/FilledShape.js";
import { CollisionPairClass, GroupClass } from "../../runtimelibrary/graphics/Group.js";
import { KeyClass } from "../../runtimelibrary/graphics/Key.js";
import { PolygonClass } from "../../runtimelibrary/graphics/Polygon.js";
import { RectangleClass } from "../../runtimelibrary/graphics/Rectangle.js";
import { RepeatTypeClass } from "../../runtimelibrary/graphics/RepeatType.js";
import { RoundedRectangleClass } from "../../runtimelibrary/graphics/RoundedRectangle.js";
import { ScaleModeClass } from "../../runtimelibrary/graphics/ScaleMode.js";
import { ShapeClass } from "../../runtimelibrary/graphics/Shape.js";
import { SoundKlass as SoundClass } from "../../runtimelibrary/graphics/Sound.js";
import { SpriteClass, TileClass } from "../../runtimelibrary/graphics/Sprite.js";
import { SpriteLibraryClass } from "../../runtimelibrary/graphics/SpriteLibraryEnum.js";
import { TextClass } from "../../runtimelibrary/graphics/Text.js";
import { WorldClass } from "../../runtimelibrary/graphics/World.js";
import { InputClass } from "../../runtimelibrary/Input.js";
import { GamepadClass } from "../../runtimelibrary/Gamepad.js";
import { MathClass } from "../../runtimelibrary/Math.js";
import { MathToolsClass } from "../../runtimelibrary/MathToolsClass.js";
import { PrintStreamClass, SystemClass } from "../../runtimelibrary/System.js";
import { KeyListener, SystemToolsClass } from "../../runtimelibrary/SystemTools.js";
import { Runnable, TimerClass } from "../../runtimelibrary/Timer.js";
import { TokenType } from "../lexer/Token.js";
import { Interface, Klass, Visibility } from "../types/Class.js";
import { booleanPrimitiveType, BooleanType, CharacterType, charPrimitiveType, doublePrimitiveType, DoubleType, floatPrimitiveType, FloatType, IntegerType, intPrimitiveType, objectType, stringPrimitiveType, voidPrimitiveType, varType, longPrimitiveType, LongType } from "../types/PrimitiveTypes.js";
import { Method, PrimitiveType, Type } from "../types/Types.js";
import { SymbolTable } from "./SymbolTable.js";
import { MapClass } from "../../runtimelibrary/collections/Map.js";
import { HashMapClass } from "../../runtimelibrary/collections/HashMap.js";
import { TriangleClass } from "../../runtimelibrary/graphics/Triangle.js";
import { LocalDateTimeClass, DayOfWeekEnum, MonthEnum } from "../../runtimelibrary/graphics/LocalDateTime.js";
import { LineClass } from "../../runtimelibrary/graphics/Line.js";
import { Vector2Class } from "../../runtimelibrary/Vector2.js";
import { MouseAdapterClass, MouseListenerInterface } from "../../runtimelibrary/graphics/MouseListener.js";
import { WebSocketClass } from "../../runtimelibrary/network/WebSocket.js";
import { WebSocketClientClass } from "../../runtimelibrary/network/WebSocketClient.js";
import { ProcessingClass } from "../../runtimelibrary/graphics/Processing.js";
import { TurtleClass } from "../../runtimelibrary/graphics/Turtle.js";
import { GNGZeichenfensterClass } from "../../runtimelibrary/gng/GNGZeichenfenster.js";
import { GNGRechteckClass } from "../../runtimelibrary/gng/GNGRechteck.js";
import { GNGBaseFigurClass } from "../../runtimelibrary/gng/GNGBaseFigur.js";
import { GNGAktionsempfaengerInterface } from "../../runtimelibrary/gng/GNGAktionsempfaenger.js";
import { GNGDreieckClass } from "../../runtimelibrary/gng/GNGDreieck.js";
import { GNGKreisClass } from "../../runtimelibrary/gng/GNGKreis.js";
import { GNGTurtleClass } from "../../runtimelibrary/gng/GNGTurtle.js";
import { GNGTextClass } from "../../runtimelibrary/gng/GNGText.js";
import { GNGEreignisbehandlung } from "../../runtimelibrary/gng/GNGEreignisbehandlung.js";
import { GNGFigurClass } from "../../runtimelibrary/gng/GNGFigur.js";
import { RandomClass } from "../../runtimelibrary/Random.js";
import { DirectionClass } from "../../runtimelibrary/graphics/Direction.js";
import { Patcher } from "./Patcher.js";
import { KeyEvent as KeyEventClass } from "../../runtimelibrary/graphics/KeyEvent.js";
import { Formatter } from "../../main/gui/Formatter.js";
import { RobotClass, RobotWorldClass } from "../../runtimelibrary/graphics/3d/Robot.js";
import { ResultSetClass } from "../../runtimelibrary/database/ResultSet.js";
import { DatabaseStatementClass } from "../../runtimelibrary/database/DatabaseStatement.js";
import { ConnectionClass } from "../../runtimelibrary/database/Connection.js";
import { DatabaseManagerClass } from "../../runtimelibrary/database/DatabaseManager.js";
import { DatabasePreparedStatementClass } from "../../runtimelibrary/database/DatabasePreparedStatement.js";
export class Module {
    constructor(file, main) {
        this.main = main;
        this.oldErrorDecorations = [];
        this.isSystemModule = false;
        this.breakpoints = [];
        this.breakpointDecorators = [];
        this.decoratorIdToBreakpointMap = {};
        this.errors = [[], [], [], []]; // 1st pass, 2nd pass, 3rd pass
        this.colorInformation = [];
        this.identifierPositions = {};
        this.methodCallPositions = {};
        if (file == null || this.main == null)
            return; // used by AdhocCompiler and ApiDoc
        this.file = file;
        // this.uri = monaco.Uri.from({ path: '/file' + (Module.maxUriNumber++) + '.learnJava', scheme: 'file' });
        let path = file.name;
        let uriCounter = Module.uriMap[path];
        if (uriCounter == null) {
            uriCounter = 0;
        }
        else {
            uriCounter++;
        }
        Module.uriMap[path] = uriCounter;
        if (uriCounter > 0)
            path += " (" + uriCounter + ")";
        this.uri = monaco.Uri.from({ path: path, scheme: 'inmemory' });
        this.model = monaco.editor.createModel(file.text, "myJava", this.uri);
        this.model.updateOptions({ tabSize: 3, bracketColorizationOptions: { enabled: true } });
        let formatter = new Formatter();
        if (main.isEmbedded() && file.text != null && file.text.length > 3) {
            let edits = formatter.format(this.model);
            this.model.applyEdits(edits);
        }
        this.lastSavedVersionId = this.model.getAlternativeVersionId();
        let that = this;
        this.model.onDidChangeContent(() => {
            let versionId = that.model.getAlternativeVersionId();
            if (versionId != that.lastSavedVersionId) {
                that.file.dirty = true;
                that.file.saved = false;
                that.file.identical_to_repository_version = false;
                that.lastSavedVersionId = versionId;
            }
            if (!that.main.isEmbedded()) {
                let main1 = main;
                if (main1.workspacesOwnerId != main1.user.id) {
                    if (that.file.text_before_revision == null || that.file.student_edited_after_revision) {
                        that.file.student_edited_after_revision = false;
                        that.file.text_before_revision = that.file.text;
                        that.file.saved = false;
                        main1.networkManager.sendUpdates(null, false);
                        main1.bottomDiv.homeworkManager.showHomeWorkRevisionButton();
                        main1.projectExplorer.renderHomeworkButton(that.file);
                    }
                }
                else {
                    that.file.student_edited_after_revision = true;
                }
            }
        });
    }
    toExportedModule() {
        return {
            name: this.file.name,
            text: this.getProgramTextFromMonacoModel(),
            identical_to_repository_version: this.file.identical_to_repository_version,
            is_copy_of_id: this.file.is_copy_of_id,
            repository_file_version: this.file.repository_file_version
        };
    }
    getMethodDeclarationAtPosition(position) {
        if (this.classDefinitionsAST == null)
            return null;
        for (let cd of this.classDefinitionsAST) {
            if (cd.type == TokenType.keywordClass || cd.type == TokenType.keywordEnum) {
                for (let methodAST of cd.methods) {
                    if (methodAST.position != null && methodAST.scopeTo != null) {
                        if (methodAST.position.line <= position.lineNumber && methodAST.scopeTo.line >= position.lineNumber) {
                            return methodAST;
                        }
                    }
                }
            }
        }
        return null;
    }
    static restoreFromData(f, main) {
        let patched = Patcher.patch(f.text);
        let f1 = {
            name: f.name,
            text: patched.patchedText,
            text_before_revision: f.text_before_revision,
            submitted_date: f.submitted_date,
            student_edited_after_revision: false,
            dirty: true,
            saved: !patched.modified,
            version: f.version,
            id: f.id,
            is_copy_of_id: f.is_copy_of_id,
            repository_file_version: f.repository_file_version,
            identical_to_repository_version: f.identical_to_repository_version
        };
        let m = new Module(f1, main);
        return m;
    }
    getFileData(workspace) {
        let file = this.file;
        let fd = {
            id: file.id,
            name: file.name,
            text: file.text,
            text_before_revision: file.text_before_revision,
            submitted_date: file.submitted_date,
            student_edited_after_revision: file.student_edited_after_revision,
            version: file.version,
            is_copy_of_id: file.is_copy_of_id,
            repository_file_version: file.repository_file_version,
            identical_to_repository_version: file.identical_to_repository_version,
            workspace_id: workspace.id,
            forceUpdate: false,
            file_type: 0
        };
        return fd;
    }
    pushMethodCallPosition(identifierPosition, commaPositions, possibleMethods, rightBracketPosition) {
        let lines = [];
        lines.push(identifierPosition.line);
        for (let cp of commaPositions) {
            if (lines.indexOf[cp.line] < 0) {
                lines.push(cp.line);
            }
        }
        let mcp = {
            identifierPosition: identifierPosition,
            commaPositions: commaPositions,
            possibleMethods: possibleMethods,
            rightBracketPosition: rightBracketPosition
        };
        for (let line of lines) {
            let mcpList = this.methodCallPositions[line];
            if (mcpList == null) {
                this.methodCallPositions[line] = [];
                mcpList = this.methodCallPositions[line];
            }
            mcpList.push(mcp);
        }
    }
    toggleBreakpoint(lineNumber, rerender) {
        this.getBreakpointPositionsFromEditor();
        if (this.getBreakpoint(lineNumber, true) == null) {
            this.setBreakpoint(lineNumber, 1);
        }
        if (rerender) {
            this.renderBreakpointDecorators();
        }
    }
    getBreakpoint(line, remove = false) {
        for (let i = 0; i < this.breakpoints.length; i++) {
            let b = this.breakpoints[i];
            if (b.line == line) {
                this.breakpoints.splice(i, 1);
                if (b.statement != null) {
                    b.statement.breakpoint = undefined;
                }
                return b;
            }
        }
        return null;
    }
    setBreakpoint(line, column) {
        let breakpoint = {
            line: line,
            column: column,
            statement: null
        };
        this.attachToStatement(breakpoint);
        this.breakpoints.push(breakpoint);
        return breakpoint;
    }
    attachToStatement(breakpoint, programList) {
        var _a;
        if (breakpoint.statement != null) {
            breakpoint.statement.breakpoint = undefined;
        }
        if (programList == null)
            programList = this.getPrograms();
        let nearestStatement = null;
        let nearestDistance = 100000;
        for (let program of programList) {
            for (let statement of program.statements) {
                let line = (_a = statement === null || statement === void 0 ? void 0 : statement.position) === null || _a === void 0 ? void 0 : _a.line;
                if (line != null && line >= breakpoint.line) {
                    if (line - breakpoint.line < nearestDistance) {
                        nearestStatement = statement;
                        nearestDistance = line - breakpoint.line;
                    }
                    break;
                }
            }
        }
        breakpoint.statement = nearestStatement;
        if (nearestStatement != null) {
            nearestStatement.breakpoint = breakpoint;
            // let pp = new ProgramPrinter();
            // console.log("Attached Breakpoint line " + breakpoint.line + ", column " + 
            //     breakpoint.column + " to statement " + pp.print([nearestStatement]));
        }
    }
    getPrograms() {
        let programList = [];
        if (this.mainProgram != null) {
            programList.push(this.mainProgram);
        }
        if (this.typeStore != null) {
            for (let type of this.typeStore.typeList) {
                if (type instanceof Klass) {
                    if (type.attributeInitializationProgram != null) {
                        programList.push(type.attributeInitializationProgram);
                    }
                    for (let method of type.methods) {
                        if (method.program != null) {
                            programList.push(method.program);
                        }
                    }
                    if (type.staticClass.attributeInitializationProgram != null) {
                        programList.push(type.staticClass.attributeInitializationProgram);
                    }
                    for (let method of type.staticClass.methods) {
                        if (method.program != null) {
                            programList.push(method.program);
                        }
                    }
                }
            }
        }
        return programList;
    }
    renderBreakpointDecorators() {
        this.getBreakpointPositionsFromEditor();
        let decorations = [];
        for (let breakpoint of this.breakpoints) {
            decorations.push({
                range: { startLineNumber: breakpoint.line, endLineNumber: breakpoint.line, startColumn: 1, endColumn: 1 },
                options: {
                    isWholeLine: true, className: "jo_decorate_breakpoint",
                    overviewRuler: {
                        color: "#580000",
                        position: monaco.editor.OverviewRulerLane.Left
                    },
                    minimap: {
                        color: "#580000",
                        position: monaco.editor.MinimapPosition.Inline
                    },
                    marginClassName: "jo_margin_breakpoint",
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                },
                //@ts-ignore
                breakpoint: breakpoint
            });
        }
        this.breakpointDecorators = this.main.getMonacoEditor().deltaDecorations(this.breakpointDecorators, decorations);
        this.decoratorIdToBreakpointMap = {};
        for (let i = 0; i < this.breakpointDecorators.length; i++) {
            this.decoratorIdToBreakpointMap[this.breakpointDecorators[i]] = this.breakpoints[i];
        }
    }
    getBreakpointPositionsFromEditor() {
        for (let decoration of this.main.getMonacoEditor().getModel().getAllDecorations()) {
            if (decoration.options.marginClassName == "margin_breakpoint") {
                let breakpoint = this.decoratorIdToBreakpointMap[decoration.id];
                if (breakpoint != null) {
                    breakpoint.line = decoration.range.startLineNumber;
                }
            }
        }
    }
    findSymbolTableAtPosition(line, column) {
        if (this.mainSymbolTable == null) {
            return null;
        }
        if (line > this.mainSymbolTable.positionTo.line ||
            line == this.mainSymbolTable.positionTo.line && column > this.mainSymbolTable.positionTo.column) {
            line = this.mainSymbolTable.positionTo.line;
            column = this.mainSymbolTable.positionTo.column - 1;
        }
        return this.mainSymbolTable.findTableAtPosition(line, column);
    }
    getErrorCount() {
        let ec = 0;
        for (let el of this.errors) {
            el.forEach(error => ec += error.level == "error" ? 1 : 0);
            // ec += el.length;
        }
        return ec;
    }
    hasMainProgram() {
        if (this.mainProgram == null)
            return false;
        if (this.mainProgram.statements == null)
            return false;
        return this.mainProgram.statements.length > 2 || this.mainProgram.statements.length == 2 && this.mainProgram.statements[0].type == TokenType.callMainMethod;
    }
    getProgramTextFromMonacoModel() {
        return this.model.getValue(monaco.editor.EndOfLinePreference.LF, false);
    }
    addIdentifierPosition(position, element) {
        let positionList = this.identifierPositions[position.line];
        if (positionList == null) {
            positionList = [];
            this.identifierPositions[position.line] = positionList;
        }
        positionList.push({
            position: position,
            element: element
        });
    }
    getTypeAtPosition(line, column) {
        let positionsOnLine = this.identifierPositions[line];
        if (positionsOnLine == null)
            return null;
        let foundPosition = null;
        for (let p of positionsOnLine) {
            if (column >= p.position.column && column <= p.position.column + p.position.length) {
                foundPosition = p;
                let element = foundPosition.element;
                if (element instanceof Method) {
                    return { type: element, isStatic: false };
                }
                // Attribute, Variable
                let type = (element instanceof Type) ? element : element.type;
                //@ts-ignore
                if (foundPosition.position.length > 0 && element.type != null) {
                    //@ts-ignore
                    return { type: type, isStatic: false };
                }
                return { type: type, isStatic: foundPosition.position.length > 0 };
            }
        }
        return null;
    }
    getElementAtPosition(line, column) {
        let positionsOnLine = this.identifierPositions[line];
        if (positionsOnLine == null)
            return null;
        let bestFoundPosition = null;
        for (let p of positionsOnLine) {
            if (column >= p.position.column && column <= p.position.column + p.position.length) {
                if (p.position.length > 0) {
                    if (bestFoundPosition == null) {
                        bestFoundPosition = p;
                    }
                    else {
                        if (p.element instanceof Method && bestFoundPosition.element instanceof Klass) {
                            bestFoundPosition = p;
                        }
                    }
                }
            }
        }
        return bestFoundPosition == null ? null : bestFoundPosition.element;
    }
    copy() {
        let m = new Module(this.file, this.main);
        m.model = this.model;
        m.mainProgram = this.mainProgram;
        this.mainProgram = null;
        m.mainSymbolTable = this.mainSymbolTable;
        this.mainSymbolTable = null;
        m.typeStore = this.typeStore;
        // this.typeStore = null;
        m.isStartable = this.isStartable;
        m.dependsOnModulesWithErrors = this.dependsOnModulesWithErrors;
        m.breakpoints = this.breakpoints;
        this.breakpoints = [];
        let programs = m.getPrograms();
        programs.forEach((p) => p.module = m);
        for (let b of m.breakpoints) {
            this.breakpoints.push({
                line: b.line,
                column: b.column,
                statement: null
            });
            m.attachToStatement(b, programs);
        }
        this.file.dirty = true;
        return m;
    }
    clear() {
        this.identifierPositions = {};
        if (this.file != null && this.file.dirty) {
            // Lexer
            this.tokenList = null;
            this.errors[0] = [];
            // AST Parser
            this.errors[1] = [];
        }
        // type resolver
        this.errors[2] = [];
        this.typeNodes = [];
        this.typeStore = new TypeStore();
        // Code generator
        this.errors[3] = [];
        this.mainSymbolTable = new SymbolTable(null, { line: 1, column: 1, length: 1 }, { line: 100000, column: 1, length: 0 });
        this.mainProgram = null;
        this.methodCallPositions = {};
        this.dependsOnModules = new Map();
    }
    hasErrors() {
        for (let el of this.errors) {
            if (el.find(error => error.level == "error")) {
                return true;
            }
            // if (el.length > 0) {
            //     return true;
            // }
        }
        return false;
    }
    getSortedAndFilteredErrors() {
        let list = [];
        for (let el of this.errors) {
            list = list.concat(el);
        }
        list.sort((a, b) => {
            if (a.position.line > b.position.line) {
                return 1;
            }
            if (b.position.line > a.position.line) {
                return -1;
            }
            if (a.position.column >= b.position.column) {
                return 1;
            }
            return -1;
        });
        for (let i = 0; i < list.length - 1; i++) {
            let e1 = list[i];
            let e2 = list[i + 1];
            if (e1.position.line == e2.position.line && e1.position.column + 10 > e2.position.column) {
                if (this.errorLevelCompare(e1.level, e2.level) == 1) {
                    list.splice(i + 1, 1);
                }
                else {
                    list.splice(i, 1);
                }
                i--;
            }
        }
        return list;
    }
    errorLevelCompare(level1, level2) {
        if (level1 == "error")
            return 1;
        if (level2 == "error")
            return 2;
        if (level1 == "warning")
            return 1;
        if (level2 == "warning")
            return 2;
        return 1;
    }
    renderStartButton() {
        var _a, _b, _c;
        let $buttonDiv = (_c = (_b = (_a = this.file) === null || _a === void 0 ? void 0 : _a.panelElement) === null || _b === void 0 ? void 0 : _b.$htmlFirstLine) === null || _c === void 0 ? void 0 : _c.find('.jo_additionalButtonStart');
        if ($buttonDiv == null)
            return;
        $buttonDiv.find('.jo_startButton').remove();
        if (this.isStartable) {
            let $startButtonDiv = jQuery('<div class="jo_startButton img_start-dark jo_button jo_active" title="Hauptprogramm in der Datei starten"></div>');
            $buttonDiv.append($startButtonDiv);
            let that = this;
            $startButtonDiv.on('mousedown', (e) => e.stopPropagation());
            $startButtonDiv.on('click', (e) => {
                e.stopPropagation();
                that.main.setModuleActive(that);
                that.main.getInterpreter().start();
            });
        }
    }
}
Module.maxUriNumber = 0;
Module.uriMap = {};
export class BaseModule extends Module {
    constructor(main) {
        super({ name: "Base Module", text: "", text_before_revision: null, submitted_date: null, student_edited_after_revision: false, dirty: false, saved: true, version: 1, identical_to_repository_version: true }, main);
        this.isSystemModule = true;
        this.mainProgram = null;
        this.clear();
        this.typeStore.addType(voidPrimitiveType);
        this.typeStore.addType(intPrimitiveType);
        this.typeStore.addType(longPrimitiveType);
        this.typeStore.addType(floatPrimitiveType);
        this.typeStore.addType(doublePrimitiveType);
        this.typeStore.addType(charPrimitiveType);
        this.typeStore.addType(booleanPrimitiveType);
        this.typeStore.addType(stringPrimitiveType);
        this.typeStore.addType(objectType);
        this.typeStore.addType(varType);
        this.typeStore.addType(IntegerType);
        this.typeStore.addType(LongType);
        this.typeStore.addType(FloatType);
        this.typeStore.addType(DoubleType);
        this.typeStore.addType(CharacterType);
        this.typeStore.addType(BooleanType);
        // Collections Framework
        this.typeStore.addType(new IteratorClass(this));
        this.typeStore.addType(new IterableClass(this));
        this.typeStore.addType(new CollectionClass(this));
        this.typeStore.addType(new ListClass(this));
        this.typeStore.addType(new ArrayListClass(this));
        this.typeStore.addType(new VectorClass(this));
        this.typeStore.addType(new QueueClass(this));
        this.typeStore.addType(new DequeClass(this));
        this.typeStore.addType(new LinkedListClass(this));
        this.typeStore.addType(new StackClass(this));
        this.typeStore.addType(new ListIteratorImplClass(this));
        this.typeStore.addType(new SetClass(this));
        this.typeStore.addType(new HashSetClass(this));
        this.typeStore.addType(new LinkedHashSetClass(this));
        this.typeStore.addType(new SetIteratorImplClass(this));
        this.typeStore.addType(new MapClass(this));
        this.typeStore.addType(new HashMapClass(this));
        this.typeStore.addType(new ConsoleClass(this));
        this.typeStore.addType(new MathClass(this));
        this.typeStore.addType(new RandomClass(this));
        this.typeStore.addType(new Vector2Class(this));
        this.typeStore.addType(new MathToolsClass(this));
        this.typeStore.addType(new KeyClass(this));
        this.typeStore.addType(new SoundClass(this));
        this.typeStore.addType(new InputClass(this));
        this.typeStore.addType(new Runnable(this));
        this.typeStore.addType(new TimerClass(this));
        this.typeStore.addType(new ColorClass(this));
        this.typeStore.addType(new ActorClass(this));
        this.typeStore.addType(new DirectionClass(this));
        this.typeStore.addType(new ShapeClass(this));
        this.typeStore.addType(new FilledShapeClass(this));
        this.typeStore.addType(new RectangleClass(this));
        this.typeStore.addType(new RoundedRectangleClass(this));
        this.typeStore.addType(new CircleClass(this));
        this.typeStore.addType(new SectorClass(this));
        this.typeStore.addType(new ArcClass(this));
        this.typeStore.addType(new EllipseClass(this));
        this.typeStore.addType(new BitmapClass(this));
        this.typeStore.addType(new AlignmentClass(this));
        this.typeStore.addType(new TextClass(this));
        this.typeStore.addType(new ScaleModeClass(this));
        this.typeStore.addType(new SpriteLibraryClass(this));
        this.typeStore.addType(new RepeatTypeClass(this));
        this.typeStore.addType(new TileClass(this));
        this.typeStore.addType(new SpriteClass(this));
        this.typeStore.addType(new CollisionPairClass(this));
        this.typeStore.addType(new GroupClass(this));
        this.typeStore.addType(new PolygonClass(this));
        this.typeStore.addType(new LineClass(this));
        this.typeStore.addType(new TriangleClass(this));
        this.typeStore.addType(new TurtleClass(this));
        this.typeStore.addType(new MouseListenerInterface(this));
        this.typeStore.addType(new MouseAdapterClass(this));
        this.typeStore.addType(new GamepadClass(this));
        this.typeStore.addType(new WorldClass(this));
        this.typeStore.addType(new ProcessingClass(this));
        this.typeStore.getType("Actor").registerWorldType();
        this.typeStore.addType(new PrintStreamClass(this));
        this.typeStore.addType(new KeyListener(this));
        this.typeStore.addType(new SystemClass(this));
        this.typeStore.addType(new SystemToolsClass(this));
        this.typeStore.addType(new DayOfWeekEnum(this));
        this.typeStore.addType(new MonthEnum(this));
        this.typeStore.addType(new LocalDateTimeClass(this));
        this.typeStore.addType(new WebSocketClientClass(this));
        this.typeStore.addType(new WebSocketClass(this));
        this.typeStore.addType(new RobotWorldClass(this));
        this.typeStore.addType(new RobotClass(this));
        this.typeStore.addType(new ResultSetClass(this));
        this.typeStore.addType(new DatabaseStatementClass(this));
        this.typeStore.addType(new DatabasePreparedStatementClass(this));
        this.typeStore.addType(new ConnectionClass(this));
        this.typeStore.addType(new DatabaseManagerClass(this));
        stringPrimitiveType.module = this;
        // stringPrimitiveType.baseClass = <any>(this.typeStore.getType("Object"));
        // stringPrimitiveType.baseClass = objectType;
        // IntegerType.baseClass = objectType;
        // DoubleType.baseClass = objectType;
        // FloatType.baseClass = objectType;
        // CharacterType.baseClass = objectType;
        // BooleanType.baseClass = objectType;
    }
    clearUsagePositions() {
        for (let type of this.typeStore.typeList) {
            type.clearUsagePositions();
        }
    }
}
export class GNGModule extends Module {
    constructor(main, moduleStore) {
        super({ name: "Graphics and Games - Module", text: "", text_before_revision: null, submitted_date: null, student_edited_after_revision: false, dirty: false, saved: true, version: 1, identical_to_repository_version: true }, main);
        this.isSystemModule = true;
        this.mainProgram = null;
        this.clear();
        this.typeStore.addType(new GNGAktionsempfaengerInterface(this));
        this.typeStore.addType(new GNGBaseFigurClass(this, moduleStore));
        this.typeStore.addType(new GNGZeichenfensterClass(this, moduleStore));
        this.typeStore.addType(new GNGEreignisbehandlung(this, moduleStore));
        this.typeStore.addType(new GNGRechteckClass(this, moduleStore));
        this.typeStore.addType(new GNGDreieckClass(this, moduleStore));
        this.typeStore.addType(new GNGKreisClass(this, moduleStore));
        this.typeStore.addType(new GNGTextClass(this, moduleStore));
        this.typeStore.addType(new GNGTurtleClass(this, moduleStore));
        this.typeStore.addType(new GNGFigurClass(this, moduleStore));
        this.typeStore.addType(new KeyEventClass(this, moduleStore));
    }
    clearUsagePositions() {
        for (let type of this.typeStore.typeList) {
            type.clearUsagePositions();
        }
    }
}
export class ModuleStore {
    constructor(main, withBaseModule, additionalLibraries = []) {
        this.main = main;
        this.additionalLibraries = additionalLibraries;
        this.modules = [];
        this.moduleMap = {};
        this.dirty = false;
        if (withBaseModule) {
            this.baseModule = new BaseModule(main);
            this.putModule(this.baseModule);
        }
        // additionalLibraries = ["gng"];
        for (let lib of additionalLibraries) {
            this.addLibraryModule(lib);
        }
    }
    addLibraryModule(identifier) {
        switch (identifier) {
            case "gng":
                this.putModule(new GNGModule(this.main, this));
                break;
        }
    }
    setAdditionalLibraries(additionalLibraries) {
        this.modules = this.modules.filter(m => (!m.isSystemModule) || m instanceof BaseModule);
        this.moduleMap = {};
        for (let m of this.modules) {
            this.moduleMap[m.file.name] = m;
        }
        if (additionalLibraries != null) {
            for (let lib of additionalLibraries) {
                this.addLibraryModule(lib);
            }
        }
    }
    findModuleById(module_id) {
        for (let module of this.modules) {
            if (module.file.id == module_id)
                return module;
        }
        return null;
    }
    getBaseModule() {
        return this.baseModule;
    }
    clearUsagePositions() {
        this.baseModule.clearUsagePositions();
    }
    copy() {
        let ms = new ModuleStore(this.main, true);
        for (let m of this.modules) {
            if (!m.isSystemModule) {
                ms.putModule(m.copy());
            }
        }
        return ms;
    }
    findModuleByFile(file) {
        for (let m of this.modules) {
            if (m.file == file) {
                return m;
            }
        }
        return null;
    }
    hasErrors() {
        for (let m of this.modules) {
            if (m.hasErrors()) {
                return true;
            }
        }
        return false;
    }
    getFirstModule() {
        if (this.modules.length > 0) {
            for (let mo of this.modules) {
                if (!mo.isSystemModule) {
                    return mo;
                }
            }
        }
        return null;
    }
    isDirty() {
        if (this.dirty) {
            this.dirty = false;
            return true;
        }
        let dirty = false;
        for (let m of this.modules) {
            if (m.file.dirty) {
                dirty = true;
                break;
            }
        }
        return dirty;
    }
    getModules(includeSystemModules, excludedModuleName) {
        let ret = [];
        for (let m of this.modules) {
            if (m.file.name != excludedModuleName) {
                if (!m.isSystemModule || includeSystemModules) {
                    ret.push(m);
                }
            }
        }
        return ret;
    }
    putModule(module) {
        this.modules.push(module);
        this.moduleMap[module.file.name] = module;
    }
    removeModuleWithFile(file) {
        for (let m of this.modules) {
            if (m.file == file) {
                this.removeModule(m);
                break;
            }
        }
    }
    removeModule(module) {
        if (this.modules.indexOf(module) < 0)
            return;
        this.modules.splice(this.modules.indexOf(module), 1);
        this.moduleMap[module.file.name] = undefined;
        this.dirty = true;
    }
    getModule(moduleName) {
        return this.moduleMap[moduleName];
    }
    getType(identifier) {
        for (let module of this.modules) {
            if (module.typeStore != null) {
                let type = module.typeStore.getType(identifier);
                if (type != null) {
                    return { type: type, module: module };
                }
            }
        }
        return null;
    }
    getTypeCompletionItems(moduleContext, rangeToReplace) {
        let completionItems = [];
        for (let module of this.modules) {
            if (module.typeStore != null) {
                for (let type of module.typeStore.typeList) {
                    if (module == moduleContext || (type instanceof Klass && type.visibility == Visibility.public)
                        || module.isSystemModule) {
                        let detail = "Klasse";
                        if (type.documentation != null) {
                            detail = type.documentation;
                        }
                        else if (module.isSystemModule) {
                            if (type instanceof PrimitiveType) {
                                detail = "Primitiver Datentyp";
                            }
                            else {
                                detail = "Systemklasse";
                            }
                        }
                        let item = {
                            label: type.identifier,
                            detail: detail,
                            insertText: type.identifier,
                            kind: type instanceof PrimitiveType ?
                                monaco.languages.CompletionItemKind.Struct : monaco.languages.CompletionItemKind.Class,
                            range: rangeToReplace,
                            generic: ((type instanceof Klass || type instanceof Interface) && type.typeVariables.length > 0)
                        };
                        completionItems.push(item);
                    }
                }
            }
        }
        return completionItems;
    }
}
export class TypeStore {
    constructor() {
        this.typeList = [];
        this.typeMap = new Map();
    }
    addType(type) {
        this.typeList.push(type);
        this.typeMap.set(type.identifier, type);
    }
    clear() {
        this.typeList.length = 0;
        this.typeMap.clear();
    }
    getType(identifier) {
        return this.typeMap.get(identifier);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9jb21waWxlci9wYXJzZXIvTW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDN0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDM0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxJQUFJLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxjQUFj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LGNBQWM7NEJBQ3JCLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxZQUFZLEtBQUssSUFBSSxJQUFJLFlBQVksU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO3lCQUNuRyxDQUFDO3dCQUVGLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQzlCO2lCQUNKO2FBQ0o7U0FDSjtRQUVELE9BQU8sZUFBZSxDQUFDO0lBRTNCLENBQUM7Q0FLSjtBQUdELE1BQU0sT0FBTyxTQUFTO0lBQXRCO1FBRUksYUFBUSxHQUFXLEVBQUUsQ0FBQztRQUN0QixZQUFPLEdBQXNCLElBQUksR0FBRyxFQUFFLENBQUM7SUFrQjNDLENBQUM7SUFoQkcsT0FBTyxDQUFDLElBQVU7UUFDZCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxLQUFLO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVELE9BQU8sQ0FBQyxVQUFrQjtRQUN0QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7Q0FJSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEZpbGVEYXRhLCBXb3Jrc3BhY2VTZXR0aW5ncyB9IGZyb20gXCIuLi8uLi9jb21tdW5pY2F0aW9uL0RhdGEuanNcIjtcclxuaW1wb3J0IHsgQWNjb3JkaW9uRWxlbWVudCB9IGZyb20gXCIuLi8uLi9tYWluL2d1aS9BY2NvcmRpb24uanNcIjtcclxuaW1wb3J0IHsgTWFpbkJhc2UgfSBmcm9tIFwiLi4vLi4vbWFpbi9NYWluQmFzZS5qc1wiO1xyXG5pbXBvcnQgeyBBcnJheUxpc3RDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9jb2xsZWN0aW9ucy9BcnJheUxpc3QuanNcIjtcclxuaW1wb3J0IHsgQ29sbGVjdGlvbkNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2NvbGxlY3Rpb25zL0NvbGxlY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgSXRlcmFibGVDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9jb2xsZWN0aW9ucy9JdGVyYWJsZS5qc1wiO1xyXG5pbXBvcnQgeyBJdGVyYXRvckNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2NvbGxlY3Rpb25zL0l0ZXJhdG9yLmpzXCI7XHJcbmltcG9ydCB7IExpc3RDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9jb2xsZWN0aW9ucy9MaXN0LmpzXCI7XHJcbmltcG9ydCB7IExpc3RJdGVyYXRvckltcGxDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9jb2xsZWN0aW9ucy9MaXN0SXRlcmF0b3JJbXBsLmpzXCI7XHJcbmltcG9ydCB7IFN0YWNrQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvY29sbGVjdGlvbnMvU3RhY2suanNcIjtcclxuaW1wb3J0IHsgVmVjdG9yQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvY29sbGVjdGlvbnMvVmVjdG9yLmpzXCI7XHJcbmltcG9ydCB7IFNldENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2NvbGxlY3Rpb25zL1NldC5qc1wiO1xyXG5pbXBvcnQgeyBTZXRJdGVyYXRvckltcGxDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9jb2xsZWN0aW9ucy9TZXRJdGVyYXRvckltcGwuanNcIjtcclxuaW1wb3J0IHsgSGFzaFNldENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2NvbGxlY3Rpb25zL0hhc2hTZXQuanNcIjtcclxuaW1wb3J0IHsgTGlua2VkSGFzaFNldENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2NvbGxlY3Rpb25zL0xpbmtlZEhhc2hTZXQuanNcIjtcclxuaW1wb3J0IHsgUXVldWVDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9jb2xsZWN0aW9ucy9RdWV1ZS5qc1wiO1xyXG5pbXBvcnQgeyBEZXF1ZUNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2NvbGxlY3Rpb25zL0RlcXVlLmpzXCI7XHJcbmltcG9ydCB7IExpbmtlZExpc3RDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9jb2xsZWN0aW9ucy9MaW5rZWRMaXN0LmpzXCI7XHJcbmltcG9ydCB7IENvbnNvbGVDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9Db25zb2xlLmpzXCI7XHJcbmltcG9ydCB7IEFjdG9yIGFzIEFjdG9yQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvQWN0b3IuanNcIjtcclxuaW1wb3J0IHsgQWxpZ25tZW50Q2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvQWxpZ25tZW50LmpzXCI7XHJcbmltcG9ydCB7IEJpdG1hcENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL0JpdG1hcC5qc1wiO1xyXG5pbXBvcnQgeyBDaXJjbGVDbGFzcyBhcyBDaXJjbGVDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9DaXJjbGUuanNcIjtcclxuaW1wb3J0IHsgU2VjdG9yQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvU2VjdG9yLmpzXCI7XHJcbmltcG9ydCB7IEFyY0NsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL0FyYy5qc1wiO1xyXG5pbXBvcnQgeyBDb2xvckNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL0NvbG9yLmpzXCI7XHJcbmltcG9ydCB7IEVsbGlwc2VDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9FbGxpcHNlLmpzXCI7XHJcbmltcG9ydCB7IEZpbGxlZFNoYXBlQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvRmlsbGVkU2hhcGUuanNcIjtcclxuaW1wb3J0IHsgQ29sbGlzaW9uUGFpckNsYXNzLCBHcm91cENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL0dyb3VwLmpzXCI7XHJcbmltcG9ydCB7IEtleUNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL0tleS5qc1wiO1xyXG5pbXBvcnQgeyBQb2x5Z29uQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvUG9seWdvbi5qc1wiO1xyXG5pbXBvcnQgeyBSZWN0YW5nbGVDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9SZWN0YW5nbGUuanNcIjtcclxuaW1wb3J0IHsgUmVwZWF0VHlwZUNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1JlcGVhdFR5cGUuanNcIjtcclxuaW1wb3J0IHsgUm91bmRlZFJlY3RhbmdsZUNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1JvdW5kZWRSZWN0YW5nbGUuanNcIjtcclxuaW1wb3J0IHsgU2NhbGVNb2RlQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvU2NhbGVNb2RlLmpzXCI7XHJcbmltcG9ydCB7IFNoYXBlQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvU2hhcGUuanNcIjtcclxuaW1wb3J0IHsgU291bmRLbGFzcyBhcyBTb3VuZENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1NvdW5kLmpzXCI7XHJcbmltcG9ydCB7IFNwcml0ZUNsYXNzLCBUaWxlQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvU3ByaXRlLmpzXCI7XHJcbmltcG9ydCB7IFNwcml0ZUxpYnJhcnlDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9TcHJpdGVMaWJyYXJ5RW51bS5qc1wiO1xyXG5pbXBvcnQgeyBUZXh0Q2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvVGV4dC5qc1wiO1xyXG5pbXBvcnQgeyBXb3JsZENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1dvcmxkLmpzXCI7XHJcbmltcG9ydCB7IElucHV0Q2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvSW5wdXQuanNcIjtcclxuaW1wb3J0IHsgR2FtZXBhZENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L0dhbWVwYWQuanNcIjtcclxuaW1wb3J0IHsgTWF0aENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L01hdGguanNcIjtcclxuaW1wb3J0IHsgTWF0aFRvb2xzQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvTWF0aFRvb2xzQ2xhc3MuanNcIjtcclxuaW1wb3J0IHsgUHJpbnRTdHJlYW1DbGFzcywgU3lzdGVtQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvU3lzdGVtLmpzXCI7XHJcbmltcG9ydCB7IEtleUxpc3RlbmVyLCBTeXN0ZW1Ub29sc0NsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L1N5c3RlbVRvb2xzLmpzXCI7XHJcbmltcG9ydCB7IFJ1bm5hYmxlLCBUaW1lckNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L1RpbWVyLmpzXCI7XHJcbmltcG9ydCB7IFdvcmtzcGFjZSB9IGZyb20gXCIuLi8uLi93b3Jrc3BhY2UvV29ya3NwYWNlLmpzXCI7XHJcbmltcG9ydCB7IEVycm9yLCBFcnJvckxldmVsIH0gZnJvbSBcIi4uL2xleGVyL0xleGVyLmpzXCI7XHJcbmltcG9ydCB7IFRleHRQb3NpdGlvbiwgVG9rZW4sIFRva2VuVHlwZSwgVGV4dFBvc2l0aW9uV2l0aG91dExlbmd0aCB9IGZyb20gXCIuLi9sZXhlci9Ub2tlbi5qc1wiO1xyXG5pbXBvcnQgeyBJbnRlcmZhY2UsIEtsYXNzLCBWaXNpYmlsaXR5IH0gZnJvbSBcIi4uL3R5cGVzL0NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IGJvb2xlYW5QcmltaXRpdmVUeXBlLCBCb29sZWFuVHlwZSwgQ2hhcmFjdGVyVHlwZSwgY2hhclByaW1pdGl2ZVR5cGUsIGRvdWJsZVByaW1pdGl2ZVR5cGUsIERvdWJsZVR5cGUsIGZsb2F0UHJpbWl0aXZlVHlwZSwgRmxvYXRUeXBlLCBJbnRlZ2VyVHlwZSwgaW50UHJpbWl0aXZlVHlwZSwgb2JqZWN0VHlwZSwgc3RyaW5nUHJpbWl0aXZlVHlwZSwgdm9pZFByaW1pdGl2ZVR5cGUsIHZhclR5cGUsIGxvbmdQcmltaXRpdmVUeXBlLCBMb25nVHlwZSB9IGZyb20gXCIuLi90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBBdHRyaWJ1dGUsIE1ldGhvZCwgUHJpbWl0aXZlVHlwZSwgVHlwZSwgVmFyaWFibGUgfSBmcm9tIFwiLi4vdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgQVNUTm9kZSwgTWV0aG9kRGVjbGFyYXRpb25Ob2RlLCBUeXBlTm9kZSB9IGZyb20gXCIuL0FTVC5qc1wiO1xyXG5pbXBvcnQgeyBCcmVha3BvaW50LCBQcm9ncmFtLCBTdGF0ZW1lbnQgfSBmcm9tIFwiLi9Qcm9ncmFtLmpzXCI7XHJcbmltcG9ydCB7IFN5bWJvbFRhYmxlIH0gZnJvbSBcIi4vU3ltYm9sVGFibGUuanNcIjtcclxuaW1wb3J0IHsgTWFwQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvY29sbGVjdGlvbnMvTWFwLmpzXCI7XHJcbmltcG9ydCB7IEhhc2hNYXBDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9jb2xsZWN0aW9ucy9IYXNoTWFwLmpzXCI7XHJcbmltcG9ydCB7IFRyaWFuZ2xlQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvVHJpYW5nbGUuanNcIjtcclxuaW1wb3J0IHsgTWFpbiB9IGZyb20gXCIuLi8uLi9tYWluL01haW4uanNcIjtcclxuaW1wb3J0IHsgTG9jYWxEYXRlVGltZUNsYXNzLCBEYXlPZldlZWtFbnVtLCBNb250aEVudW0gfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvTG9jYWxEYXRlVGltZS5qc1wiO1xyXG5pbXBvcnQgeyBMaW5lQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ3JhcGhpY3MvTGluZS5qc1wiO1xyXG5pbXBvcnQgeyBWZWN0b3IyQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvVmVjdG9yMi5qc1wiO1xyXG5pbXBvcnQgeyBNb3VzZUFkYXB0ZXJDbGFzcywgTW91c2VMaXN0ZW5lckludGVyZmFjZSB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9Nb3VzZUxpc3RlbmVyLmpzXCI7XHJcbmltcG9ydCB7IFdlYlNvY2tldENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L25ldHdvcmsvV2ViU29ja2V0LmpzXCI7XHJcbmltcG9ydCB7IFdlYlNvY2tldENsaWVudENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L25ldHdvcmsvV2ViU29ja2V0Q2xpZW50LmpzXCI7XHJcbmltcG9ydCB7IFByb2Nlc3NpbmdDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9ncmFwaGljcy9Qcm9jZXNzaW5nLmpzXCI7XHJcbmltcG9ydCB7IFR1cnRsZUNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1R1cnRsZS5qc1wiO1xyXG5pbXBvcnQgeyBHTkdaZWljaGVuZmVuc3RlckNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2duZy9HTkdaZWljaGVuZmVuc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBHTkdSZWNodGVja0NsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2duZy9HTkdSZWNodGVjay5qc1wiO1xyXG5pbXBvcnQgeyBHTkdCYXNlRmlndXJDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9nbmcvR05HQmFzZUZpZ3VyLmpzXCI7XHJcbmltcG9ydCB7IEdOR0FrdGlvbnNlbXBmYWVuZ2VySW50ZXJmYWNlIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2duZy9HTkdBa3Rpb25zZW1wZmFlbmdlci5qc1wiO1xyXG5pbXBvcnQgeyBHTkdEcmVpZWNrQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ25nL0dOR0RyZWllY2suanNcIjtcclxuaW1wb3J0IHsgR05HS3JlaXNDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9nbmcvR05HS3JlaXMuanNcIjtcclxuaW1wb3J0IHsgR05HVHVydGxlQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ25nL0dOR1R1cnRsZS5qc1wiO1xyXG5pbXBvcnQgeyBHTkdUZXh0Q2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZ25nL0dOR1RleHQuanNcIjtcclxuaW1wb3J0IHsgR05HRXJlaWduaXNiZWhhbmRsdW5nIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2duZy9HTkdFcmVpZ25pc2JlaGFuZGx1bmcuanNcIjtcclxuaW1wb3J0IHsgR05HRmlndXJDbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9nbmcvR05HRmlndXIuanNcIjtcclxuaW1wb3J0IHsgUmFuZG9tQ2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvUmFuZG9tLmpzXCI7XHJcbmltcG9ydCB7IERpcmVjdGlvbkNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL0RpcmVjdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBQYXRjaGVyIH0gZnJvbSBcIi4vUGF0Y2hlci5qc1wiO1xyXG5pbXBvcnQgeyBLZXlFdmVudCBhcyBLZXlFdmVudENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL0tleUV2ZW50LmpzXCI7XHJcbmltcG9ydCB7IEZvcm1hdHRlciB9IGZyb20gXCIuLi8uLi9tYWluL2d1aS9Gb3JtYXR0ZXIuanNcIjtcclxuaW1wb3J0IHsgUm9ib3RDbGFzcywgUm9ib3RXb3JsZENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzLzNkL1JvYm90LmpzXCI7XHJcbmltcG9ydCB7IFJlc3VsdFNldENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2RhdGFiYXNlL1Jlc3VsdFNldC5qc1wiO1xyXG5pbXBvcnQgeyBEYXRhYmFzZVN0YXRlbWVudENsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2RhdGFiYXNlL0RhdGFiYXNlU3RhdGVtZW50LmpzXCI7XHJcbmltcG9ydCB7IENvbm5lY3Rpb25DbGFzcyB9IGZyb20gXCIuLi8uLi9ydW50aW1lbGlicmFyeS9kYXRhYmFzZS9Db25uZWN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IERhdGFiYXNlTWFuYWdlckNsYXNzIH0gZnJvbSBcIi4uLy4uL3J1bnRpbWVsaWJyYXJ5L2RhdGFiYXNlL0RhdGFiYXNlTWFuYWdlci5qc1wiO1xyXG5pbXBvcnQgeyBEYXRhYmFzZVByZXBhcmVkU3RhdGVtZW50Q2xhc3MgfSBmcm9tIFwiLi4vLi4vcnVudGltZWxpYnJhcnkvZGF0YWJhc2UvRGF0YWJhc2VQcmVwYXJlZFN0YXRlbWVudC5qc1wiO1xyXG5cclxuZXhwb3J0IHR5cGUgRXhwb3J0ZWRXb3Jrc3BhY2UgPSB7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBtb2R1bGVzOiBFeHBvcnRlZE1vZHVsZVtdO1xyXG4gICAgc2V0dGluZ3M6IFdvcmtzcGFjZVNldHRpbmdzO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBFeHBvcnRlZE1vZHVsZSA9IHtcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIHRleHQ6IHN0cmluZztcclxuXHJcbiAgICBpc19jb3B5X29mX2lkPzogbnVtYmVyLFxyXG4gICAgcmVwb3NpdG9yeV9maWxlX3ZlcnNpb24/OiBudW1iZXIsXHJcbiAgICBpZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uOiBib29sZWFuLFxyXG5cclxufVxyXG5cclxuZXhwb3J0IHR5cGUgRmlsZSA9IHtcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIGlkPzogbnVtYmVyLFxyXG4gICAgdGV4dDogc3RyaW5nLFxyXG5cclxuICAgIHRleHRfYmVmb3JlX3JldmlzaW9uOiBzdHJpbmcsXHJcbiAgICBzdWJtaXR0ZWRfZGF0ZTogc3RyaW5nLFxyXG4gICAgc3R1ZGVudF9lZGl0ZWRfYWZ0ZXJfcmV2aXNpb246IGJvb2xlYW4sXHJcblxyXG4gICAgaXNfY29weV9vZl9pZD86IG51bWJlcixcclxuICAgIHJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uPzogbnVtYmVyLFxyXG4gICAgaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbjogYm9vbGVhbixcclxuXHJcbiAgICBkaXJ0eTogYm9vbGVhbixcclxuICAgIHNhdmVkOiBib29sZWFuLFxyXG4gICAgdmVyc2lvbjogbnVtYmVyLFxyXG4gICAgcGFuZWxFbGVtZW50PzogQWNjb3JkaW9uRWxlbWVudFxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBJZGVudGlmaWVyUG9zaXRpb24gPSB7XHJcbiAgICBwb3NpdGlvbjogVGV4dFBvc2l0aW9uLFxyXG4gICAgZWxlbWVudDogVHlwZSB8IE1ldGhvZCB8IEF0dHJpYnV0ZSB8IFZhcmlhYmxlO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBNZXRob2RDYWxsUG9zaXRpb24gPSB7XHJcbiAgICBpZGVudGlmaWVyUG9zaXRpb246IFRleHRQb3NpdGlvbixcclxuICAgIHBvc3NpYmxlTWV0aG9kczogTWV0aG9kW10gfCBzdHJpbmcsIC8vIHN0cmluZyBmb3IgcHJpbnQsIHByaW50bG4sIC4uLlxyXG4gICAgY29tbWFQb3NpdGlvbnM6IFRleHRQb3NpdGlvbltdLFxyXG4gICAgcmlnaHRCcmFja2V0UG9zaXRpb246IFRleHRQb3NpdGlvblxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTW9kdWxlIHtcclxuICAgIGZpbGU6IEZpbGU7XHJcbiAgICBzdGF0aWMgbWF4VXJpTnVtYmVyOiBudW1iZXIgPSAwO1xyXG4gICAgdXJpOiBtb25hY28uVXJpO1xyXG4gICAgbW9kZWw6IG1vbmFjby5lZGl0b3IuSVRleHRNb2RlbDtcclxuICAgIG9sZEVycm9yRGVjb3JhdGlvbnM6IHN0cmluZ1tdID0gW107XHJcbiAgICBsYXN0U2F2ZWRWZXJzaW9uSWQ6IG51bWJlcjtcclxuICAgIGVkaXRvclN0YXRlOiBtb25hY28uZWRpdG9yLklDb2RlRWRpdG9yVmlld1N0YXRlO1xyXG5cclxuICAgIGlzU3lzdGVtTW9kdWxlOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgYnJlYWtwb2ludHM6IEJyZWFrcG9pbnRbXSA9IFtdO1xyXG4gICAgYnJlYWtwb2ludERlY29yYXRvcnM6IHN0cmluZ1tdID0gW107XHJcbiAgICBkZWNvcmF0b3JJZFRvQnJlYWtwb2ludE1hcDogeyBbaWQ6IHN0cmluZ106IEJyZWFrcG9pbnQgfSA9IHt9O1xyXG5cclxuICAgIGVycm9yczogRXJyb3JbXVtdID0gW1tdLCBbXSwgW10sIFtdXTsgLy8gMXN0IHBhc3MsIDJuZCBwYXNzLCAzcmQgcGFzc1xyXG5cclxuICAgIGNvbG9ySW5mb3JtYXRpb246IG1vbmFjby5sYW5ndWFnZXMuSUNvbG9ySW5mb3JtYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIC8vIDFzdCBwYXNzOiBMZXhlclxyXG4gICAgdG9rZW5MaXN0OiBUb2tlbltdO1xyXG5cclxuICAgIC8vIDJuZCBwYXNzOiBBU1RQYXJzZXJcclxuICAgIG1haW5Qcm9ncmFtQXN0OiBBU1ROb2RlW107XHJcbiAgICBjbGFzc0RlZmluaXRpb25zQVNUOiBBU1ROb2RlW107XHJcbiAgICB0eXBlTm9kZXM6IFR5cGVOb2RlW107XHJcblxyXG4gICAgLy8gM3JkIHBhc3M6IFR5cGVSZXNvbHZlciBmaWxsIGluIHJlc29sdmVkVHlwZSBpbiB0eXBlTm9kZXMgYW5kIHBvcHVsYXRlIHR5cGVTdG9yZVxyXG4gICAgdHlwZVN0b3JlOiBUeXBlU3RvcmU7XHJcblxyXG4gICAgLy8gNHRoIHBhc3M6IGdlbmVyYXRlIGNvZGUgYW5kIHN5bWJvbCB0YWJsZXNcclxuXHJcbiAgICAvKlxyXG4gICAgVGhlIG1haW5Qcm9ncmFtQVNUIGhvbGRzIHN0YXRlbWVudHMgdG86XHJcbiAgICAxLiBjYWxsIHN0YXRpYyBjb25zdHJ1Y3RvciBvZiBlYWNoIHVzZWQgY2xhc3NcclxuICAgIDIuIGV4ZWN1dGUgbWFpbiBQcm9ncmFtXHJcbiAgICAqL1xyXG5cclxuICAgIG1haW5Qcm9ncmFtPzogUHJvZ3JhbTtcclxuICAgIG1haW5Qcm9ncmFtRW5kOiBUZXh0UG9zaXRpb247XHJcbiAgICBtYWluU3ltYm9sVGFibGU6IFN5bWJvbFRhYmxlO1xyXG5cclxuICAgIGlkZW50aWZpZXJQb3NpdGlvbnM6IHsgW2xpbmU6IG51bWJlcl06IElkZW50aWZpZXJQb3NpdGlvbltdIH0gPSB7fTtcclxuICAgIG1ldGhvZENhbGxQb3NpdGlvbnM6IHsgW2xpbmU6IG51bWJlcl06IE1ldGhvZENhbGxQb3NpdGlvbltdIH0gPSB7fTtcclxuXHJcbiAgICBkZXBlbmRzT25Nb2R1bGVzOiBNYXA8TW9kdWxlLCBib29sZWFuPjtcclxuICAgIGlzU3RhcnRhYmxlOiBib29sZWFuO1xyXG4gICAgZGVwZW5kc09uTW9kdWxlc1dpdGhFcnJvcnM6IGJvb2xlYW47XHJcblxyXG4gICAgc3RhdGljIHVyaU1hcDogeyBbbmFtZTogc3RyaW5nXTogbnVtYmVyIH0gPSB7fTtcclxuICAgIGJyYWNrZXRFcnJvcjogc3RyaW5nO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGZpbGU6IEZpbGUsIHB1YmxpYyBtYWluOiBNYWluQmFzZSkge1xyXG4gICAgICAgIGlmIChmaWxlID09IG51bGwgfHwgdGhpcy5tYWluID09IG51bGwpIHJldHVybjsgLy8gdXNlZCBieSBBZGhvY0NvbXBpbGVyIGFuZCBBcGlEb2NcclxuXHJcbiAgICAgICAgdGhpcy5maWxlID0gZmlsZTtcclxuICAgICAgICAvLyB0aGlzLnVyaSA9IG1vbmFjby5VcmkuZnJvbSh7IHBhdGg6ICcvZmlsZScgKyAoTW9kdWxlLm1heFVyaU51bWJlcisrKSArICcubGVhcm5KYXZhJywgc2NoZW1lOiAnZmlsZScgfSk7XHJcbiAgICAgICAgbGV0IHBhdGggPSBmaWxlLm5hbWU7XHJcblxyXG4gICAgICAgIGxldCB1cmlDb3VudGVyID0gTW9kdWxlLnVyaU1hcFtwYXRoXTtcclxuICAgICAgICBpZiAodXJpQ291bnRlciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHVyaUNvdW50ZXIgPSAwO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHVyaUNvdW50ZXIrKztcclxuICAgICAgICB9XHJcbiAgICAgICAgTW9kdWxlLnVyaU1hcFtwYXRoXSA9IHVyaUNvdW50ZXI7XHJcblxyXG4gICAgICAgIGlmICh1cmlDb3VudGVyID4gMCkgcGF0aCArPSBcIiAoXCIgKyB1cmlDb3VudGVyICsgXCIpXCI7XHJcbiAgICAgICAgdGhpcy51cmkgPSBtb25hY28uVXJpLmZyb20oeyBwYXRoOiBwYXRoLCBzY2hlbWU6ICdpbm1lbW9yeScgfSk7XHJcbiAgICAgICAgdGhpcy5tb2RlbCA9IG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoZmlsZS50ZXh0LCBcIm15SmF2YVwiLCB0aGlzLnVyaSk7XHJcbiAgICAgICAgdGhpcy5tb2RlbC51cGRhdGVPcHRpb25zKHsgdGFiU2l6ZTogMywgYnJhY2tldENvbG9yaXphdGlvbk9wdGlvbnM6IHtlbmFibGVkOiB0cnVlfSB9KTtcclxuICAgICAgICBsZXQgZm9ybWF0dGVyID0gbmV3IEZvcm1hdHRlcigpO1xyXG5cclxuICAgICAgICBpZihtYWluLmlzRW1iZWRkZWQoKSAmJiBmaWxlLnRleHQgIT0gbnVsbCAmJiBmaWxlLnRleHQubGVuZ3RoID4gMyl7XHJcbiAgICAgICAgICAgIGxldCBlZGl0cyA9IDxtb25hY28ubGFuZ3VhZ2VzLlRleHRFZGl0W10+Zm9ybWF0dGVyLmZvcm1hdCh0aGlzLm1vZGVsKTtcclxuICAgICAgICAgICAgdGhpcy5tb2RlbC5hcHBseUVkaXRzKGVkaXRzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubGFzdFNhdmVkVmVyc2lvbklkID0gdGhpcy5tb2RlbC5nZXRBbHRlcm5hdGl2ZVZlcnNpb25JZCgpO1xyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIHRoaXMubW9kZWwub25EaWRDaGFuZ2VDb250ZW50KCgpID0+IHtcclxuICAgICAgICAgICAgbGV0IHZlcnNpb25JZCA9IHRoYXQubW9kZWwuZ2V0QWx0ZXJuYXRpdmVWZXJzaW9uSWQoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh2ZXJzaW9uSWQgIT0gdGhhdC5sYXN0U2F2ZWRWZXJzaW9uSWQpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuZmlsZS5kaXJ0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmZpbGUuc2F2ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoYXQuZmlsZS5pZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGF0Lmxhc3RTYXZlZFZlcnNpb25JZCA9IHZlcnNpb25JZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYoIXRoYXQubWFpbi5pc0VtYmVkZGVkKCkpe1xyXG4gICAgICAgICAgICAgICAgbGV0IG1haW4xOiBNYWluID0gPE1haW4+bWFpbjtcclxuICAgICAgICAgICAgICAgIGlmKG1haW4xLndvcmtzcGFjZXNPd25lcklkICE9IG1haW4xLnVzZXIuaWQpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHRoYXQuZmlsZS50ZXh0X2JlZm9yZV9yZXZpc2lvbiA9PSBudWxsIHx8IHRoYXQuZmlsZS5zdHVkZW50X2VkaXRlZF9hZnRlcl9yZXZpc2lvbil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZmlsZS5zdHVkZW50X2VkaXRlZF9hZnRlcl9yZXZpc2lvbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmZpbGUudGV4dF9iZWZvcmVfcmV2aXNpb24gPSB0aGF0LmZpbGUudGV4dDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5maWxlLnNhdmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haW4xLm5ldHdvcmtNYW5hZ2VyLnNlbmRVcGRhdGVzKG51bGwsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbjEuYm90dG9tRGl2LmhvbWV3b3JrTWFuYWdlci5zaG93SG9tZVdvcmtSZXZpc2lvbkJ1dHRvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWluMS5wcm9qZWN0RXhwbG9yZXIucmVuZGVySG9tZXdvcmtCdXR0b24odGhhdC5maWxlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZmlsZS5zdHVkZW50X2VkaXRlZF9hZnRlcl9yZXZpc2lvbiA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdG9FeHBvcnRlZE1vZHVsZSgpOiBFeHBvcnRlZE1vZHVsZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbmFtZTogdGhpcy5maWxlLm5hbWUsXHJcbiAgICAgICAgICAgIHRleHQ6IHRoaXMuZ2V0UHJvZ3JhbVRleHRGcm9tTW9uYWNvTW9kZWwoKSxcclxuICAgICAgICAgICAgaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbjogdGhpcy5maWxlLmlkZW50aWNhbF90b19yZXBvc2l0b3J5X3ZlcnNpb24sXHJcbiAgICAgICAgICAgIGlzX2NvcHlfb2ZfaWQ6IHRoaXMuZmlsZS5pc19jb3B5X29mX2lkLFxyXG4gICAgICAgICAgICByZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbjogdGhpcy5maWxlLnJlcG9zaXRvcnlfZmlsZV92ZXJzaW9uXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldE1ldGhvZERlY2xhcmF0aW9uQXRQb3NpdGlvbihwb3NpdGlvbjogeyBsaW5lTnVtYmVyOiBudW1iZXI7IGNvbHVtbjogbnVtYmVyOyB9KTogTWV0aG9kRGVjbGFyYXRpb25Ob2RlIHtcclxuXHJcbiAgICAgICAgaWYodGhpcy5jbGFzc0RlZmluaXRpb25zQVNUID09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGZvcihsZXQgY2Qgb2YgdGhpcy5jbGFzc0RlZmluaXRpb25zQVNUKXtcclxuICAgICAgICAgICAgaWYoY2QudHlwZSA9PSBUb2tlblR5cGUua2V5d29yZENsYXNzIHx8IGNkLnR5cGUgPT0gVG9rZW5UeXBlLmtleXdvcmRFbnVtKXtcclxuICAgICAgICAgICAgICAgIGZvcihsZXQgbWV0aG9kQVNUIG9mIGNkLm1ldGhvZHMpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKG1ldGhvZEFTVC5wb3NpdGlvbiAhPSBudWxsICYmIG1ldGhvZEFTVC5zY29wZVRvICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihtZXRob2RBU1QucG9zaXRpb24ubGluZSA8PSBwb3NpdGlvbi5saW5lTnVtYmVyICYmIG1ldGhvZEFTVC5zY29wZVRvLmxpbmUgPj0gcG9zaXRpb24ubGluZU51bWJlcil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kQVNUO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHN0YXRpYyByZXN0b3JlRnJvbURhdGEoZjogRmlsZURhdGEsIG1haW46IE1haW5CYXNlKTogTW9kdWxlIHtcclxuXHJcbiAgICAgICAgbGV0IHBhdGNoZWQgPSBQYXRjaGVyLnBhdGNoKGYudGV4dCk7XHJcblxyXG4gICAgICAgIGxldCBmMTogRmlsZSA9IHtcclxuICAgICAgICAgICAgbmFtZTogZi5uYW1lLFxyXG4gICAgICAgICAgICB0ZXh0OiBwYXRjaGVkLnBhdGNoZWRUZXh0LFxyXG4gICAgICAgICAgICB0ZXh0X2JlZm9yZV9yZXZpc2lvbjogZi50ZXh0X2JlZm9yZV9yZXZpc2lvbixcclxuICAgICAgICAgICAgc3VibWl0dGVkX2RhdGU6IGYuc3VibWl0dGVkX2RhdGUsXHJcbiAgICAgICAgICAgIHN0dWRlbnRfZWRpdGVkX2FmdGVyX3JldmlzaW9uOiBmYWxzZSxcclxuICAgICAgICAgICAgZGlydHk6IHRydWUsXHJcbiAgICAgICAgICAgIHNhdmVkOiAhcGF0Y2hlZC5tb2RpZmllZCxcclxuICAgICAgICAgICAgdmVyc2lvbjogZi52ZXJzaW9uLFxyXG4gICAgICAgICAgICBpZDogZi5pZCxcclxuICAgICAgICAgICAgaXNfY29weV9vZl9pZDogZi5pc19jb3B5X29mX2lkLFxyXG4gICAgICAgICAgICByZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbjogZi5yZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbixcclxuICAgICAgICAgICAgaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbjogZi5pZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbTogTW9kdWxlID0gbmV3IE1vZHVsZShmMSwgbWFpbik7XHJcblxyXG4gICAgICAgIHJldHVybiBtO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRGaWxlRGF0YSh3b3Jrc3BhY2U6IFdvcmtzcGFjZSk6IEZpbGVEYXRhIHtcclxuICAgICAgICBsZXQgZmlsZSA9IHRoaXMuZmlsZTtcclxuICAgICAgICBsZXQgZmQ6IEZpbGVEYXRhID0ge1xyXG4gICAgICAgICAgICBpZDogZmlsZS5pZCxcclxuICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lLFxyXG4gICAgICAgICAgICB0ZXh0OiBmaWxlLnRleHQsXHJcbiAgICAgICAgICAgIHRleHRfYmVmb3JlX3JldmlzaW9uOiBmaWxlLnRleHRfYmVmb3JlX3JldmlzaW9uLFxyXG4gICAgICAgICAgICBzdWJtaXR0ZWRfZGF0ZTogZmlsZS5zdWJtaXR0ZWRfZGF0ZSxcclxuICAgICAgICAgICAgc3R1ZGVudF9lZGl0ZWRfYWZ0ZXJfcmV2aXNpb246IGZpbGUuc3R1ZGVudF9lZGl0ZWRfYWZ0ZXJfcmV2aXNpb24sXHJcbiAgICAgICAgICAgIHZlcnNpb246IGZpbGUudmVyc2lvbixcclxuICAgICAgICAgICAgaXNfY29weV9vZl9pZDogZmlsZS5pc19jb3B5X29mX2lkLFxyXG4gICAgICAgICAgICByZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbjogZmlsZS5yZXBvc2l0b3J5X2ZpbGVfdmVyc2lvbixcclxuICAgICAgICAgICAgaWRlbnRpY2FsX3RvX3JlcG9zaXRvcnlfdmVyc2lvbjogZmlsZS5pZGVudGljYWxfdG9fcmVwb3NpdG9yeV92ZXJzaW9uLFxyXG4gICAgICAgICAgICB3b3Jrc3BhY2VfaWQ6IHdvcmtzcGFjZS5pZCxcclxuICAgICAgICAgICAgZm9yY2VVcGRhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBmaWxlX3R5cGU6IDBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmZDtcclxuICAgIH1cclxuXHJcbiAgICBwdXNoTWV0aG9kQ2FsbFBvc2l0aW9uKGlkZW50aWZpZXJQb3NpdGlvbjogVGV4dFBvc2l0aW9uLCBjb21tYVBvc2l0aW9uczogVGV4dFBvc2l0aW9uW10sXHJcbiAgICAgICAgcG9zc2libGVNZXRob2RzOiBNZXRob2RbXSB8IHN0cmluZywgcmlnaHRCcmFja2V0UG9zaXRpb246IFRleHRQb3NpdGlvbikge1xyXG5cclxuICAgICAgICBsZXQgbGluZXM6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgbGluZXMucHVzaChpZGVudGlmaWVyUG9zaXRpb24ubGluZSk7XHJcbiAgICAgICAgZm9yIChsZXQgY3Agb2YgY29tbWFQb3NpdGlvbnMpIHtcclxuICAgICAgICAgICAgaWYgKGxpbmVzLmluZGV4T2ZbY3AubGluZV0gPCAwKSB7XHJcbiAgICAgICAgICAgICAgICBsaW5lcy5wdXNoKGNwLmxpbmUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbWNwOiBNZXRob2RDYWxsUG9zaXRpb24gPSB7XHJcbiAgICAgICAgICAgIGlkZW50aWZpZXJQb3NpdGlvbjogaWRlbnRpZmllclBvc2l0aW9uLFxyXG4gICAgICAgICAgICBjb21tYVBvc2l0aW9uczogY29tbWFQb3NpdGlvbnMsXHJcbiAgICAgICAgICAgIHBvc3NpYmxlTWV0aG9kczogcG9zc2libGVNZXRob2RzLFxyXG4gICAgICAgICAgICByaWdodEJyYWNrZXRQb3NpdGlvbjogcmlnaHRCcmFja2V0UG9zaXRpb25cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKGxldCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICAgICAgICAgIGxldCBtY3BMaXN0ID0gdGhpcy5tZXRob2RDYWxsUG9zaXRpb25zW2xpbmVdO1xyXG4gICAgICAgICAgICBpZiAobWNwTGlzdCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1ldGhvZENhbGxQb3NpdGlvbnNbbGluZV0gPSBbXTtcclxuICAgICAgICAgICAgICAgIG1jcExpc3QgPSB0aGlzLm1ldGhvZENhbGxQb3NpdGlvbnNbbGluZV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbWNwTGlzdC5wdXNoKG1jcCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgdG9nZ2xlQnJlYWtwb2ludChsaW5lTnVtYmVyOiBudW1iZXIsIHJlcmVuZGVyOiBib29sZWFuKSB7XHJcbiAgICAgICAgdGhpcy5nZXRCcmVha3BvaW50UG9zaXRpb25zRnJvbUVkaXRvcigpO1xyXG4gICAgICAgIGlmICh0aGlzLmdldEJyZWFrcG9pbnQobGluZU51bWJlciwgdHJ1ZSkgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldEJyZWFrcG9pbnQobGluZU51bWJlciwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChyZXJlbmRlcikge1xyXG4gICAgICAgICAgICB0aGlzLnJlbmRlckJyZWFrcG9pbnREZWNvcmF0b3JzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldEJyZWFrcG9pbnQobGluZTogbnVtYmVyLCByZW1vdmU6IGJvb2xlYW4gPSBmYWxzZSk6IEJyZWFrcG9pbnQge1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnJlYWtwb2ludHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgbGV0IGIgPSB0aGlzLmJyZWFrcG9pbnRzW2ldO1xyXG4gICAgICAgICAgICBpZiAoYi5saW5lID09IGxpbmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnJlYWtwb2ludHMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGIuc3RhdGVtZW50ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBiLnN0YXRlbWVudC5icmVha3BvaW50ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRCcmVha3BvaW50KGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIpOiBCcmVha3BvaW50IHtcclxuXHJcbiAgICAgICAgbGV0IGJyZWFrcG9pbnQ6IEJyZWFrcG9pbnQgPSB7XHJcbiAgICAgICAgICAgIGxpbmU6IGxpbmUsXHJcbiAgICAgICAgICAgIGNvbHVtbjogY29sdW1uLFxyXG4gICAgICAgICAgICBzdGF0ZW1lbnQ6IG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYXR0YWNoVG9TdGF0ZW1lbnQoYnJlYWtwb2ludCk7XHJcbiAgICAgICAgdGhpcy5icmVha3BvaW50cy5wdXNoKGJyZWFrcG9pbnQpO1xyXG5cclxuICAgICAgICByZXR1cm4gYnJlYWtwb2ludDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgYXR0YWNoVG9TdGF0ZW1lbnQoYnJlYWtwb2ludDogQnJlYWtwb2ludCwgcHJvZ3JhbUxpc3Q/OiBQcm9ncmFtW10pIHtcclxuXHJcbiAgICAgICAgaWYgKGJyZWFrcG9pbnQuc3RhdGVtZW50ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgYnJlYWtwb2ludC5zdGF0ZW1lbnQuYnJlYWtwb2ludCA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwcm9ncmFtTGlzdCA9PSBudWxsKSBwcm9ncmFtTGlzdCA9IHRoaXMuZ2V0UHJvZ3JhbXMoKTtcclxuXHJcbiAgICAgICAgbGV0IG5lYXJlc3RTdGF0ZW1lbnQ6IFN0YXRlbWVudCA9IG51bGw7XHJcbiAgICAgICAgbGV0IG5lYXJlc3REaXN0YW5jZTogbnVtYmVyID0gMTAwMDAwO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBwcm9ncmFtIG9mIHByb2dyYW1MaXN0KSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHN0YXRlbWVudCBvZiBwcm9ncmFtLnN0YXRlbWVudHMpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbGluZSA9IHN0YXRlbWVudD8ucG9zaXRpb24/LmxpbmU7XHJcbiAgICAgICAgICAgICAgICBpZiAobGluZSAhPSBudWxsICYmIGxpbmUgPj0gYnJlYWtwb2ludC5saW5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmUgLSBicmVha3BvaW50LmxpbmUgPCBuZWFyZXN0RGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVhcmVzdFN0YXRlbWVudCA9IHN0YXRlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVhcmVzdERpc3RhbmNlID0gbGluZSAtIGJyZWFrcG9pbnQubGluZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJyZWFrcG9pbnQuc3RhdGVtZW50ID0gbmVhcmVzdFN0YXRlbWVudDtcclxuICAgICAgICBpZiAobmVhcmVzdFN0YXRlbWVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIG5lYXJlc3RTdGF0ZW1lbnQuYnJlYWtwb2ludCA9IGJyZWFrcG9pbnQ7XHJcbiAgICAgICAgICAgIC8vIGxldCBwcCA9IG5ldyBQcm9ncmFtUHJpbnRlcigpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkF0dGFjaGVkIEJyZWFrcG9pbnQgbGluZSBcIiArIGJyZWFrcG9pbnQubGluZSArIFwiLCBjb2x1bW4gXCIgKyBcclxuICAgICAgICAgICAgLy8gICAgIGJyZWFrcG9pbnQuY29sdW1uICsgXCIgdG8gc3RhdGVtZW50IFwiICsgcHAucHJpbnQoW25lYXJlc3RTdGF0ZW1lbnRdKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIGdldFByb2dyYW1zKCk6IFByb2dyYW1bXSB7XHJcbiAgICAgICAgbGV0IHByb2dyYW1MaXN0OiBQcm9ncmFtW10gPSBbXTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubWFpblByb2dyYW0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBwcm9ncmFtTGlzdC5wdXNoKHRoaXMubWFpblByb2dyYW0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMudHlwZVN0b3JlICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IHR5cGUgb2YgdGhpcy50eXBlU3RvcmUudHlwZUxpc3QpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlIGluc3RhbmNlb2YgS2xhc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZS5hdHRyaWJ1dGVJbml0aWFsaXphdGlvblByb2dyYW0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtTGlzdC5wdXNoKHR5cGUuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgbWV0aG9kIG9mIHR5cGUubWV0aG9kcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWV0aG9kLnByb2dyYW0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbUxpc3QucHVzaChtZXRob2QucHJvZ3JhbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUuc3RhdGljQ2xhc3MuYXR0cmlidXRlSW5pdGlhbGl6YXRpb25Qcm9ncmFtICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbUxpc3QucHVzaCh0eXBlLnN0YXRpY0NsYXNzLmF0dHJpYnV0ZUluaXRpYWxpemF0aW9uUHJvZ3JhbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IG1ldGhvZCBvZiB0eXBlLnN0YXRpY0NsYXNzLm1ldGhvZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGhvZC5wcm9ncmFtICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW1MaXN0LnB1c2gobWV0aG9kLnByb2dyYW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHByb2dyYW1MaXN0O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByZW5kZXJCcmVha3BvaW50RGVjb3JhdG9ycygpIHtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRCcmVha3BvaW50UG9zaXRpb25zRnJvbUVkaXRvcigpO1xyXG5cclxuICAgICAgICBsZXQgZGVjb3JhdGlvbnM6IG1vbmFjby5lZGl0b3IuSU1vZGVsRGVsdGFEZWNvcmF0aW9uW10gPSBbXTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgYnJlYWtwb2ludCBvZiB0aGlzLmJyZWFrcG9pbnRzKSB7XHJcbiAgICAgICAgICAgIGRlY29yYXRpb25zLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHsgc3RhcnRMaW5lTnVtYmVyOiBicmVha3BvaW50LmxpbmUsIGVuZExpbmVOdW1iZXI6IGJyZWFrcG9pbnQubGluZSwgc3RhcnRDb2x1bW46IDEsIGVuZENvbHVtbjogMSB9LFxyXG4gICAgICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGlzV2hvbGVMaW5lOiB0cnVlLCBjbGFzc05hbWU6IFwiam9fZGVjb3JhdGVfYnJlYWtwb2ludFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG92ZXJ2aWV3UnVsZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6IFwiIzU4MDAwMFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbW9uYWNvLmVkaXRvci5PdmVydmlld1J1bGVyTGFuZS5MZWZ0XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBtaW5pbWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiBcIiM1ODAwMDBcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG1vbmFjby5lZGl0b3IuTWluaW1hcFBvc2l0aW9uLklubGluZVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgbWFyZ2luQ2xhc3NOYW1lOiBcImpvX21hcmdpbl9icmVha3BvaW50XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RpY2tpbmVzczogbW9uYWNvLmVkaXRvci5UcmFja2VkUmFuZ2VTdGlja2luZXNzLk5ldmVyR3Jvd3NXaGVuVHlwaW5nQXRFZGdlc1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgYnJlYWtwb2ludDogYnJlYWtwb2ludFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYnJlYWtwb2ludERlY29yYXRvcnMgPSB0aGlzLm1haW4uZ2V0TW9uYWNvRWRpdG9yKCkuZGVsdGFEZWNvcmF0aW9ucyh0aGlzLmJyZWFrcG9pbnREZWNvcmF0b3JzLCBkZWNvcmF0aW9ucyk7XHJcblxyXG4gICAgICAgIHRoaXMuZGVjb3JhdG9ySWRUb0JyZWFrcG9pbnRNYXAgPSB7fTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnJlYWtwb2ludERlY29yYXRvcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdGhpcy5kZWNvcmF0b3JJZFRvQnJlYWtwb2ludE1hcFt0aGlzLmJyZWFrcG9pbnREZWNvcmF0b3JzW2ldXSA9IHRoaXMuYnJlYWtwb2ludHNbaV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRCcmVha3BvaW50UG9zaXRpb25zRnJvbUVkaXRvcigpIHtcclxuICAgICAgICBmb3IgKGxldCBkZWNvcmF0aW9uIG9mIHRoaXMubWFpbi5nZXRNb25hY29FZGl0b3IoKS5nZXRNb2RlbCgpLmdldEFsbERlY29yYXRpb25zKCkpIHtcclxuICAgICAgICAgICAgaWYgKGRlY29yYXRpb24ub3B0aW9ucy5tYXJnaW5DbGFzc05hbWUgPT0gXCJtYXJnaW5fYnJlYWtwb2ludFwiKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYnJlYWtwb2ludCA9IHRoaXMuZGVjb3JhdG9ySWRUb0JyZWFrcG9pbnRNYXBbZGVjb3JhdGlvbi5pZF07XHJcbiAgICAgICAgICAgICAgICBpZiAoYnJlYWtwb2ludCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWtwb2ludC5saW5lID0gZGVjb3JhdGlvbi5yYW5nZS5zdGFydExpbmVOdW1iZXI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZmluZFN5bWJvbFRhYmxlQXRQb3NpdGlvbihsaW5lOiBudW1iZXIsIGNvbHVtbjogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubWFpblN5bWJvbFRhYmxlID09IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobGluZSA+IHRoaXMubWFpblN5bWJvbFRhYmxlLnBvc2l0aW9uVG8ubGluZSB8fFxyXG4gICAgICAgICAgICBsaW5lID09IHRoaXMubWFpblN5bWJvbFRhYmxlLnBvc2l0aW9uVG8ubGluZSAmJiBjb2x1bW4gPiB0aGlzLm1haW5TeW1ib2xUYWJsZS5wb3NpdGlvblRvLmNvbHVtblxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBsaW5lID0gdGhpcy5tYWluU3ltYm9sVGFibGUucG9zaXRpb25Uby5saW5lO1xyXG4gICAgICAgICAgICBjb2x1bW4gPSB0aGlzLm1haW5TeW1ib2xUYWJsZS5wb3NpdGlvblRvLmNvbHVtbiAtIDE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5tYWluU3ltYm9sVGFibGUuZmluZFRhYmxlQXRQb3NpdGlvbihsaW5lLCBjb2x1bW4pO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEVycm9yQ291bnQoKTogbnVtYmVyIHtcclxuXHJcbiAgICAgICAgbGV0IGVjID0gMDtcclxuICAgICAgICBmb3IgKGxldCBlbCBvZiB0aGlzLmVycm9ycykge1xyXG4gICAgICAgICAgICBlbC5mb3JFYWNoKGVycm9yID0+IGVjICs9IGVycm9yLmxldmVsID09IFwiZXJyb3JcIiA/IDEgOiAwKTtcclxuICAgICAgICAgICAgLy8gZWMgKz0gZWwubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGVjO1xyXG4gICAgfVxyXG5cclxuICAgIGhhc01haW5Qcm9ncmFtKCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5tYWluUHJvZ3JhbSA9PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgaWYgKHRoaXMubWFpblByb2dyYW0uc3RhdGVtZW50cyA9PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFpblByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAyIHx8IHRoaXMubWFpblByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPT0gMiAmJiB0aGlzLm1haW5Qcm9ncmFtLnN0YXRlbWVudHNbMF0udHlwZSA9PSBUb2tlblR5cGUuY2FsbE1haW5NZXRob2Q7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldFByb2dyYW1UZXh0RnJvbU1vbmFjb01vZGVsKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZWwuZ2V0VmFsdWUobW9uYWNvLmVkaXRvci5FbmRPZkxpbmVQcmVmZXJlbmNlLkxGLCBmYWxzZSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGFkZElkZW50aWZpZXJQb3NpdGlvbihwb3NpdGlvbjogVGV4dFBvc2l0aW9uLCBlbGVtZW50OiBUeXBlIHwgTWV0aG9kIHwgQXR0cmlidXRlIHwgVmFyaWFibGUpIHtcclxuICAgICAgICBsZXQgcG9zaXRpb25MaXN0OiBJZGVudGlmaWVyUG9zaXRpb25bXSA9IHRoaXMuaWRlbnRpZmllclBvc2l0aW9uc1twb3NpdGlvbi5saW5lXTtcclxuICAgICAgICBpZiAocG9zaXRpb25MaXN0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgcG9zaXRpb25MaXN0ID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuaWRlbnRpZmllclBvc2l0aW9uc1twb3NpdGlvbi5saW5lXSA9IHBvc2l0aW9uTGlzdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcG9zaXRpb25MaXN0LnB1c2goe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXHJcbiAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnRcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZ2V0VHlwZUF0UG9zaXRpb24obGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6IHsgdHlwZTogVHlwZSwgaXNTdGF0aWM6IGJvb2xlYW4gfSB7XHJcblxyXG4gICAgICAgIGxldCBwb3NpdGlvbnNPbkxpbmUgPSB0aGlzLmlkZW50aWZpZXJQb3NpdGlvbnNbbGluZV07XHJcbiAgICAgICAgaWYgKHBvc2l0aW9uc09uTGluZSA9PSBudWxsKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgbGV0IGZvdW5kUG9zaXRpb246IElkZW50aWZpZXJQb3NpdGlvbiA9IG51bGw7XHJcbiAgICAgICAgZm9yIChsZXQgcCBvZiBwb3NpdGlvbnNPbkxpbmUpIHtcclxuICAgICAgICAgICAgaWYgKGNvbHVtbiA+PSBwLnBvc2l0aW9uLmNvbHVtbiAmJiBjb2x1bW4gPD0gcC5wb3NpdGlvbi5jb2x1bW4gKyBwLnBvc2l0aW9uLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgZm91bmRQb3NpdGlvbiA9IHA7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudCA9IGZvdW5kUG9zaXRpb24uZWxlbWVudDtcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgTWV0aG9kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogZWxlbWVudCwgaXNTdGF0aWM6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBBdHRyaWJ1dGUsIFZhcmlhYmxlXHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZTogVHlwZSA9IChlbGVtZW50IGluc3RhbmNlb2YgVHlwZSkgPyBlbGVtZW50IDogZWxlbWVudC50eXBlO1xyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICBpZiAoZm91bmRQb3NpdGlvbi5wb3NpdGlvbi5sZW5ndGggPiAwICYmIGVsZW1lbnQudHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogPFR5cGU+dHlwZSwgaXNTdGF0aWM6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogdHlwZSwgaXNTdGF0aWM6IGZvdW5kUG9zaXRpb24ucG9zaXRpb24ubGVuZ3RoID4gMCB9O1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0RWxlbWVudEF0UG9zaXRpb24obGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6IEtsYXNzIHwgSW50ZXJmYWNlIHwgTWV0aG9kIHwgQXR0cmlidXRlIHwgVmFyaWFibGUge1xyXG5cclxuICAgICAgICBsZXQgcG9zaXRpb25zT25MaW5lID0gdGhpcy5pZGVudGlmaWVyUG9zaXRpb25zW2xpbmVdO1xyXG4gICAgICAgIGlmIChwb3NpdGlvbnNPbkxpbmUgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGxldCBiZXN0Rm91bmRQb3NpdGlvbjogSWRlbnRpZmllclBvc2l0aW9uID0gbnVsbDtcclxuICAgICAgICBmb3IgKGxldCBwIG9mIHBvc2l0aW9uc09uTGluZSkge1xyXG4gICAgICAgICAgICBpZiAoY29sdW1uID49IHAucG9zaXRpb24uY29sdW1uICYmIGNvbHVtbiA8PSBwLnBvc2l0aW9uLmNvbHVtbiArIHAucG9zaXRpb24ubGVuZ3RoKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHAucG9zaXRpb24ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChiZXN0Rm91bmRQb3NpdGlvbiA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJlc3RGb3VuZFBvc2l0aW9uID0gcDtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihwLmVsZW1lbnQgaW5zdGFuY2VvZiBNZXRob2QgJiYgYmVzdEZvdW5kUG9zaXRpb24uZWxlbWVudCBpbnN0YW5jZW9mIEtsYXNzKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlc3RGb3VuZFBvc2l0aW9uID0gcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGJlc3RGb3VuZFBvc2l0aW9uID09IG51bGwgPyBudWxsIDogPGFueT5iZXN0Rm91bmRQb3NpdGlvbi5lbGVtZW50O1xyXG4gICAgfVxyXG5cclxuICAgIGNvcHkoKTogTW9kdWxlIHtcclxuICAgICAgICBsZXQgbSA9IG5ldyBNb2R1bGUodGhpcy5maWxlLCB0aGlzLm1haW4pO1xyXG4gICAgICAgIG0ubW9kZWwgPSB0aGlzLm1vZGVsO1xyXG4gICAgICAgIG0ubWFpblByb2dyYW0gPSB0aGlzLm1haW5Qcm9ncmFtO1xyXG4gICAgICAgIHRoaXMubWFpblByb2dyYW0gPSBudWxsO1xyXG4gICAgICAgIG0ubWFpblN5bWJvbFRhYmxlID0gdGhpcy5tYWluU3ltYm9sVGFibGU7XHJcbiAgICAgICAgdGhpcy5tYWluU3ltYm9sVGFibGUgPSBudWxsO1xyXG4gICAgICAgIG0udHlwZVN0b3JlID0gdGhpcy50eXBlU3RvcmU7XHJcbiAgICAgICAgLy8gdGhpcy50eXBlU3RvcmUgPSBudWxsO1xyXG4gICAgICAgIG0uaXNTdGFydGFibGUgPSB0aGlzLmlzU3RhcnRhYmxlO1xyXG4gICAgICAgIG0uZGVwZW5kc09uTW9kdWxlc1dpdGhFcnJvcnMgPSB0aGlzLmRlcGVuZHNPbk1vZHVsZXNXaXRoRXJyb3JzO1xyXG5cclxuICAgICAgICBtLmJyZWFrcG9pbnRzID0gdGhpcy5icmVha3BvaW50cztcclxuICAgICAgICB0aGlzLmJyZWFrcG9pbnRzID0gW107XHJcbiAgICAgICAgbGV0IHByb2dyYW1zID0gbS5nZXRQcm9ncmFtcygpO1xyXG5cclxuICAgICAgICBwcm9ncmFtcy5mb3JFYWNoKChwKSA9PiBwLm1vZHVsZSA9IG0pO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBiIG9mIG0uYnJlYWtwb2ludHMpIHtcclxuICAgICAgICAgICAgdGhpcy5icmVha3BvaW50cy5wdXNoKHtcclxuICAgICAgICAgICAgICAgIGxpbmU6IGIubGluZSxcclxuICAgICAgICAgICAgICAgIGNvbHVtbjogYi5jb2x1bW4sXHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnQ6IG51bGxcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBtLmF0dGFjaFRvU3RhdGVtZW50KGIsIHByb2dyYW1zKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmZpbGUuZGlydHkgPSB0cnVlO1xyXG5cclxuICAgICAgICByZXR1cm4gbTtcclxuICAgIH1cclxuXHJcbiAgICBjbGVhcigpIHtcclxuXHJcbiAgICAgICAgdGhpcy5pZGVudGlmaWVyUG9zaXRpb25zID0ge307XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmZpbGUgIT0gbnVsbCAmJiB0aGlzLmZpbGUuZGlydHkpIHtcclxuICAgICAgICAgICAgLy8gTGV4ZXJcclxuICAgICAgICAgICAgdGhpcy50b2tlbkxpc3QgPSBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmVycm9yc1swXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgLy8gQVNUIFBhcnNlclxyXG4gICAgICAgICAgICB0aGlzLmVycm9yc1sxXSA9IFtdO1xyXG5cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0eXBlIHJlc29sdmVyXHJcbiAgICAgICAgdGhpcy5lcnJvcnNbMl0gPSBbXTtcclxuICAgICAgICB0aGlzLnR5cGVOb2RlcyA9IFtdO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlID0gbmV3IFR5cGVTdG9yZSgpO1xyXG5cclxuICAgICAgICAvLyBDb2RlIGdlbmVyYXRvclxyXG4gICAgICAgIHRoaXMuZXJyb3JzWzNdID0gW107XHJcbiAgICAgICAgdGhpcy5tYWluU3ltYm9sVGFibGUgPSBuZXcgU3ltYm9sVGFibGUobnVsbCwgeyBsaW5lOiAxLCBjb2x1bW46IDEsIGxlbmd0aDogMSB9LCB7IGxpbmU6IDEwMDAwMCwgY29sdW1uOiAxLCBsZW5ndGg6IDAgfSk7XHJcbiAgICAgICAgdGhpcy5tYWluUHJvZ3JhbSA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMubWV0aG9kQ2FsbFBvc2l0aW9ucyA9IHt9O1xyXG4gICAgICAgIHRoaXMuZGVwZW5kc09uTW9kdWxlcyA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaGFzRXJyb3JzKCkge1xyXG5cclxuICAgICAgICBmb3IgKGxldCBlbCBvZiB0aGlzLmVycm9ycykge1xyXG4gICAgICAgICAgICBpZihlbC5maW5kKGVycm9yID0+IGVycm9yLmxldmVsID09IFwiZXJyb3JcIikpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gaWYgKGVsLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgLy8gICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldFNvcnRlZEFuZEZpbHRlcmVkRXJyb3JzKCk6IEVycm9yW10ge1xyXG5cclxuICAgICAgICBsZXQgbGlzdDogRXJyb3JbXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBlbCBvZiB0aGlzLmVycm9ycykge1xyXG4gICAgICAgICAgICBsaXN0ID0gbGlzdC5jb25jYXQoZWwpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGlzdC5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChhLnBvc2l0aW9uLmxpbmUgPiBiLnBvc2l0aW9uLmxpbmUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChiLnBvc2l0aW9uLmxpbmUgPiBhLnBvc2l0aW9uLmxpbmUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYS5wb3NpdGlvbi5jb2x1bW4gPj0gYi5wb3NpdGlvbi5jb2x1bW4pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aCAtIDE7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgZTEgPSBsaXN0W2ldO1xyXG4gICAgICAgICAgICBsZXQgZTIgPSBsaXN0W2kgKyAxXTtcclxuICAgICAgICAgICAgaWYgKGUxLnBvc2l0aW9uLmxpbmUgPT0gZTIucG9zaXRpb24ubGluZSAmJiBlMS5wb3NpdGlvbi5jb2x1bW4gKyAxMCA+IGUyLnBvc2l0aW9uLmNvbHVtbikge1xyXG4gICAgICAgICAgICAgICAgaWYodGhpcy5lcnJvckxldmVsQ29tcGFyZShlMS5sZXZlbCwgZTIubGV2ZWwpID09IDEpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxpc3Quc3BsaWNlKGkgKyAxLCAxKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGlzdC5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBsaXN0O1xyXG4gICAgfVxyXG5cclxuICAgIGVycm9yTGV2ZWxDb21wYXJlKGxldmVsMTogRXJyb3JMZXZlbCwgbGV2ZWwyOiBFcnJvckxldmVsKTogbnVtYmVyIHtcclxuICAgICAgICBpZihsZXZlbDEgPT0gXCJlcnJvclwiKSByZXR1cm4gMTtcclxuICAgICAgICBpZihsZXZlbDIgPT0gXCJlcnJvclwiKSByZXR1cm4gMjtcclxuICAgICAgICBpZihsZXZlbDEgPT0gXCJ3YXJuaW5nXCIpIHJldHVybiAxO1xyXG4gICAgICAgIGlmKGxldmVsMiA9PSBcIndhcm5pbmdcIikgcmV0dXJuIDI7XHJcbiAgICAgICAgcmV0dXJuIDE7XHJcbiAgICB9XHJcblxyXG4gICAgcmVuZGVyU3RhcnRCdXR0b24oKSB7XHJcbiAgICAgICAgbGV0ICRidXR0b25EaXYgPSB0aGlzLmZpbGU/LnBhbmVsRWxlbWVudD8uJGh0bWxGaXJzdExpbmU/LmZpbmQoJy5qb19hZGRpdGlvbmFsQnV0dG9uU3RhcnQnKTtcclxuICAgICAgICBpZiAoJGJ1dHRvbkRpdiA9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgICAgICRidXR0b25EaXYuZmluZCgnLmpvX3N0YXJ0QnV0dG9uJykucmVtb3ZlKCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzU3RhcnRhYmxlKSB7XHJcbiAgICAgICAgICAgIGxldCAkc3RhcnRCdXR0b25EaXYgPSBqUXVlcnkoJzxkaXYgY2xhc3M9XCJqb19zdGFydEJ1dHRvbiBpbWdfc3RhcnQtZGFyayBqb19idXR0b24gam9fYWN0aXZlXCIgdGl0bGU9XCJIYXVwdHByb2dyYW1tIGluIGRlciBEYXRlaSBzdGFydGVuXCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgICAgICRidXR0b25EaXYuYXBwZW5kKCRzdGFydEJ1dHRvbkRpdik7XHJcbiAgICAgICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuICAgICAgICAgICAgJHN0YXJ0QnV0dG9uRGl2Lm9uKCdtb3VzZWRvd24nLCAoZSkgPT4gZS5zdG9wUHJvcGFnYXRpb24oKSk7XHJcbiAgICAgICAgICAgICRzdGFydEJ1dHRvbkRpdi5vbignY2xpY2snLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGF0Lm1haW4uc2V0TW9kdWxlQWN0aXZlKHRoYXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoYXQubWFpbi5nZXRJbnRlcnByZXRlcigpLnN0YXJ0KCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9IFxyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBCYXNlTW9kdWxlIGV4dGVuZHMgTW9kdWxlIHtcclxuICAgIGNvbnN0cnVjdG9yKG1haW46IE1haW5CYXNlKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKHsgbmFtZTogXCJCYXNlIE1vZHVsZVwiLCB0ZXh0OiBcIlwiLCB0ZXh0X2JlZm9yZV9yZXZpc2lvbjogbnVsbCwgc3VibWl0dGVkX2RhdGU6IG51bGwsIHN0dWRlbnRfZWRpdGVkX2FmdGVyX3JldmlzaW9uOiBmYWxzZSwgZGlydHk6IGZhbHNlLCBzYXZlZDogdHJ1ZSwgdmVyc2lvbjogMSAsIGlkZW50aWNhbF90b19yZXBvc2l0b3J5X3ZlcnNpb246IHRydWV9LCBtYWluKTtcclxuXHJcbiAgICAgICAgdGhpcy5pc1N5c3RlbU1vZHVsZSA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5tYWluUHJvZ3JhbSA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMuY2xlYXIoKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUodm9pZFByaW1pdGl2ZVR5cGUpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUoaW50UHJpbWl0aXZlVHlwZSk7IFxyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobG9uZ1ByaW1pdGl2ZVR5cGUpOyBcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKGZsb2F0UHJpbWl0aXZlVHlwZSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShkb3VibGVQcmltaXRpdmVUeXBlKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKGNoYXJQcmltaXRpdmVUeXBlKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKGJvb2xlYW5QcmltaXRpdmVUeXBlKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKHN0cmluZ1ByaW1pdGl2ZVR5cGUpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUob2JqZWN0VHlwZSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZSh2YXJUeXBlKTtcclxuXHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShJbnRlZ2VyVHlwZSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShMb25nVHlwZSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShGbG9hdFR5cGUpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUoRG91YmxlVHlwZSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShDaGFyYWN0ZXJUeXBlKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKEJvb2xlYW5UeXBlKTtcclxuXHJcbiAgICAgICAgLy8gQ29sbGVjdGlvbnMgRnJhbWV3b3JrXHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgSXRlcmF0b3JDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgSXRlcmFibGVDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgQ29sbGVjdGlvbkNsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBMaXN0Q2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IEFycmF5TGlzdENsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBWZWN0b3JDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgUXVldWVDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgRGVxdWVDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgTGlua2VkTGlzdENsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBTdGFja0NsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBMaXN0SXRlcmF0b3JJbXBsQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IFNldENsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBIYXNoU2V0Q2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IExpbmtlZEhhc2hTZXRDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgU2V0SXRlcmF0b3JJbXBsQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IE1hcENsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBIYXNoTWFwQ2xhc3ModGhpcykpO1xyXG5cclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBDb25zb2xlQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IE1hdGhDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgUmFuZG9tQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IFZlY3RvcjJDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgTWF0aFRvb2xzQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IEtleUNsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBTb3VuZENsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBJbnB1dENsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBSdW5uYWJsZSh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgVGltZXJDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgQ29sb3JDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgQWN0b3JDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgRGlyZWN0aW9uQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IFNoYXBlQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IEZpbGxlZFNoYXBlQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IFJlY3RhbmdsZUNsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBSb3VuZGVkUmVjdGFuZ2xlQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IENpcmNsZUNsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBTZWN0b3JDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgQXJjQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IEVsbGlwc2VDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgQml0bWFwQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IEFsaWdubWVudENsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBUZXh0Q2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IFNjYWxlTW9kZUNsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBTcHJpdGVMaWJyYXJ5Q2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IFJlcGVhdFR5cGVDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgVGlsZUNsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBTcHJpdGVDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgQ29sbGlzaW9uUGFpckNsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBHcm91cENsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBQb2x5Z29uQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IExpbmVDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgVHJpYW5nbGVDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgVHVydGxlQ2xhc3ModGhpcykpO1xyXG5cclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBNb3VzZUxpc3RlbmVySW50ZXJmYWNlKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBNb3VzZUFkYXB0ZXJDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgR2FtZXBhZENsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBXb3JsZENsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBQcm9jZXNzaW5nQ2xhc3ModGhpcykpO1xyXG5cclxuICAgICAgICAoPEFjdG9yQ2xhc3M+dGhpcy50eXBlU3RvcmUuZ2V0VHlwZShcIkFjdG9yXCIpKS5yZWdpc3RlcldvcmxkVHlwZSgpO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgUHJpbnRTdHJlYW1DbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgS2V5TGlzdGVuZXIodGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IFN5c3RlbUNsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBTeXN0ZW1Ub29sc0NsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBEYXlPZldlZWtFbnVtKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBNb250aEVudW0odGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IExvY2FsRGF0ZVRpbWVDbGFzcyh0aGlzKSk7XHJcbiAgICBcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBXZWJTb2NrZXRDbGllbnRDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgV2ViU29ja2V0Q2xhc3ModGhpcykpO1xyXG5cclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBSb2JvdFdvcmxkQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IFJvYm90Q2xhc3ModGhpcykpO1xyXG5cclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBSZXN1bHRTZXRDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgRGF0YWJhc2VTdGF0ZW1lbnRDbGFzcyh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgRGF0YWJhc2VQcmVwYXJlZFN0YXRlbWVudENsYXNzKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBDb25uZWN0aW9uQ2xhc3ModGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IERhdGFiYXNlTWFuYWdlckNsYXNzKHRoaXMpKTtcclxuXHJcbiAgICBcclxuXHJcbiAgICAgICAgc3RyaW5nUHJpbWl0aXZlVHlwZS5tb2R1bGUgPSB0aGlzO1xyXG4gICAgICAgIC8vIHN0cmluZ1ByaW1pdGl2ZVR5cGUuYmFzZUNsYXNzID0gPGFueT4odGhpcy50eXBlU3RvcmUuZ2V0VHlwZShcIk9iamVjdFwiKSk7XHJcbiAgICAgICAgLy8gc3RyaW5nUHJpbWl0aXZlVHlwZS5iYXNlQ2xhc3MgPSBvYmplY3RUeXBlO1xyXG4gICAgICAgIC8vIEludGVnZXJUeXBlLmJhc2VDbGFzcyA9IG9iamVjdFR5cGU7XHJcbiAgICAgICAgLy8gRG91YmxlVHlwZS5iYXNlQ2xhc3MgPSBvYmplY3RUeXBlO1xyXG4gICAgICAgIC8vIEZsb2F0VHlwZS5iYXNlQ2xhc3MgPSBvYmplY3RUeXBlO1xyXG4gICAgICAgIC8vIENoYXJhY3RlclR5cGUuYmFzZUNsYXNzID0gb2JqZWN0VHlwZTtcclxuICAgICAgICAvLyBCb29sZWFuVHlwZS5iYXNlQ2xhc3MgPSBvYmplY3RUeXBlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjbGVhclVzYWdlUG9zaXRpb25zKCkge1xyXG4gICAgICAgIGZvciAobGV0IHR5cGUgb2YgdGhpcy50eXBlU3RvcmUudHlwZUxpc3QpIHtcclxuICAgICAgICAgICAgdHlwZS5jbGVhclVzYWdlUG9zaXRpb25zKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgR05HTW9kdWxlIGV4dGVuZHMgTW9kdWxlIHtcclxuICAgIGNvbnN0cnVjdG9yKG1haW46IE1haW5CYXNlLCBtb2R1bGVTdG9yZTogTW9kdWxlU3RvcmUpIHtcclxuXHJcbiAgICAgICAgc3VwZXIoeyBuYW1lOiBcIkdyYXBoaWNzIGFuZCBHYW1lcyAtIE1vZHVsZVwiLCB0ZXh0OiBcIlwiLCB0ZXh0X2JlZm9yZV9yZXZpc2lvbjogbnVsbCwgc3VibWl0dGVkX2RhdGU6IG51bGwsIHN0dWRlbnRfZWRpdGVkX2FmdGVyX3JldmlzaW9uOiBmYWxzZSwgZGlydHk6IGZhbHNlLCBzYXZlZDogdHJ1ZSwgdmVyc2lvbjogMSAsIGlkZW50aWNhbF90b19yZXBvc2l0b3J5X3ZlcnNpb246IHRydWV9LCBtYWluKTtcclxuXHJcbiAgICAgICAgdGhpcy5pc1N5c3RlbU1vZHVsZSA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5tYWluUHJvZ3JhbSA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMuY2xlYXIoKTtcclxuXHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgR05HQWt0aW9uc2VtcGZhZW5nZXJJbnRlcmZhY2UodGhpcykpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IEdOR0Jhc2VGaWd1ckNsYXNzKHRoaXMsIG1vZHVsZVN0b3JlKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgR05HWmVpY2hlbmZlbnN0ZXJDbGFzcyh0aGlzLCBtb2R1bGVTdG9yZSkpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IEdOR0VyZWlnbmlzYmVoYW5kbHVuZyh0aGlzLCBtb2R1bGVTdG9yZSkpO1xyXG4gICAgICAgIHRoaXMudHlwZVN0b3JlLmFkZFR5cGUobmV3IEdOR1JlY2h0ZWNrQ2xhc3ModGhpcywgbW9kdWxlU3RvcmUpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBHTkdEcmVpZWNrQ2xhc3ModGhpcywgbW9kdWxlU3RvcmUpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBHTkdLcmVpc0NsYXNzKHRoaXMsIG1vZHVsZVN0b3JlKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgR05HVGV4dENsYXNzKHRoaXMsIG1vZHVsZVN0b3JlKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgR05HVHVydGxlQ2xhc3ModGhpcywgbW9kdWxlU3RvcmUpKTtcclxuICAgICAgICB0aGlzLnR5cGVTdG9yZS5hZGRUeXBlKG5ldyBHTkdGaWd1ckNsYXNzKHRoaXMsIG1vZHVsZVN0b3JlKSk7XHJcbiAgICAgICAgdGhpcy50eXBlU3RvcmUuYWRkVHlwZShuZXcgS2V5RXZlbnRDbGFzcyh0aGlzLCBtb2R1bGVTdG9yZSkpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjbGVhclVzYWdlUG9zaXRpb25zKCkge1xyXG4gICAgICAgIGZvciAobGV0IHR5cGUgb2YgdGhpcy50eXBlU3RvcmUudHlwZUxpc3QpIHtcclxuICAgICAgICAgICAgdHlwZS5jbGVhclVzYWdlUG9zaXRpb25zKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG59XHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIE1vZHVsZVN0b3JlIHtcclxuXHJcbiAgICBwcml2YXRlIG1vZHVsZXM6IE1vZHVsZVtdID0gW107XHJcbiAgICBwcml2YXRlIG1vZHVsZU1hcDoge1tuYW1lOiBzdHJpbmddOiBNb2R1bGV9ID0ge307XHJcbiAgICBwcml2YXRlIGJhc2VNb2R1bGU6IEJhc2VNb2R1bGU7XHJcblxyXG4gICAgZGlydHk6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1haW46IE1haW5CYXNlLCB3aXRoQmFzZU1vZHVsZTogYm9vbGVhbiwgcHJpdmF0ZSBhZGRpdGlvbmFsTGlicmFyaWVzOiBzdHJpbmdbXSA9IFtdKSB7XHJcbiAgICAgICAgaWYgKHdpdGhCYXNlTW9kdWxlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmFzZU1vZHVsZSA9IG5ldyBCYXNlTW9kdWxlKG1haW4pO1xyXG4gICAgICAgICAgICB0aGlzLnB1dE1vZHVsZSh0aGlzLmJhc2VNb2R1bGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBhZGRpdGlvbmFsTGlicmFyaWVzID0gW1wiZ25nXCJdO1xyXG5cclxuICAgICAgICBmb3IobGV0IGxpYiBvZiBhZGRpdGlvbmFsTGlicmFyaWVzKXtcclxuICAgICAgICAgICAgdGhpcy5hZGRMaWJyYXJ5TW9kdWxlKGxpYik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFkZExpYnJhcnlNb2R1bGUoaWRlbnRpZmllcjogc3RyaW5nKXtcclxuICAgICAgICBzd2l0Y2goaWRlbnRpZmllcil7XHJcbiAgICAgICAgICAgIGNhc2UgXCJnbmdcIjogdGhpcy5wdXRNb2R1bGUobmV3IEdOR01vZHVsZSh0aGlzLm1haW4sIHRoaXMpKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldEFkZGl0aW9uYWxMaWJyYXJpZXMoYWRkaXRpb25hbExpYnJhcmllczogc3RyaW5nW10pe1xyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZXMgPSB0aGlzLm1vZHVsZXMuZmlsdGVyKCBtID0+ICghbS5pc1N5c3RlbU1vZHVsZSkgfHwgbSBpbnN0YW5jZW9mIEJhc2VNb2R1bGUpO1xyXG4gICAgICAgIHRoaXMubW9kdWxlTWFwID0ge307XHJcblxyXG4gICAgICAgIGZvcihsZXQgbSBvZiB0aGlzLm1vZHVsZXMpe1xyXG4gICAgICAgICAgICB0aGlzLm1vZHVsZU1hcFttLmZpbGUubmFtZV0gPSAgbTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKGFkZGl0aW9uYWxMaWJyYXJpZXMgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgIGZvcihsZXQgbGliIG9mIGFkZGl0aW9uYWxMaWJyYXJpZXMpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRMaWJyYXJ5TW9kdWxlKGxpYik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZpbmRNb2R1bGVCeUlkKG1vZHVsZV9pZDogbnVtYmVyKTogTW9kdWxlIHtcclxuICAgICAgICBmb3IobGV0IG1vZHVsZSBvZiB0aGlzLm1vZHVsZXMpe1xyXG4gICAgICAgICAgICBpZihtb2R1bGUuZmlsZS5pZCA9PSBtb2R1bGVfaWQpIHJldHVybiBtb2R1bGU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRCYXNlTW9kdWxlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJhc2VNb2R1bGU7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNsZWFyVXNhZ2VQb3NpdGlvbnMoKSB7XHJcbiAgICAgICAgdGhpcy5iYXNlTW9kdWxlLmNsZWFyVXNhZ2VQb3NpdGlvbnMoKTtcclxuICAgIH1cclxuXHJcbiAgICBjb3B5KCk6IE1vZHVsZVN0b3JlIHtcclxuICAgICAgICBsZXQgbXM6IE1vZHVsZVN0b3JlID0gbmV3IE1vZHVsZVN0b3JlKHRoaXMubWFpbiwgdHJ1ZSk7XHJcbiAgICAgICAgZm9yIChsZXQgbSBvZiB0aGlzLm1vZHVsZXMpIHtcclxuICAgICAgICAgICAgaWYgKCFtLmlzU3lzdGVtTW9kdWxlKSB7XHJcbiAgICAgICAgICAgICAgICBtcy5wdXRNb2R1bGUobS5jb3B5KCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBtcztcclxuICAgIH1cclxuXHJcbiAgICBmaW5kTW9kdWxlQnlGaWxlKGZpbGU6IEZpbGUpIHtcclxuICAgICAgICBmb3IgKGxldCBtIG9mIHRoaXMubW9kdWxlcykge1xyXG4gICAgICAgICAgICBpZiAobS5maWxlID09IGZpbGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGhhc0Vycm9ycygpOiBib29sZWFuIHtcclxuICAgICAgICBmb3IgKGxldCBtIG9mIHRoaXMubW9kdWxlcykge1xyXG4gICAgICAgICAgICBpZiAobS5oYXNFcnJvcnMoKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEZpcnN0TW9kdWxlKCk6IE1vZHVsZSB7XHJcbiAgICAgICAgaWYgKHRoaXMubW9kdWxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG1vIG9mIHRoaXMubW9kdWxlcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFtby5pc1N5c3RlbU1vZHVsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtbztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBpc0RpcnR5KCk6IGJvb2xlYW4ge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5kaXJ0eSkge1xyXG4gICAgICAgICAgICB0aGlzLmRpcnR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGRpcnR5ID0gZmFsc2U7XHJcbiAgICAgICAgZm9yIChsZXQgbSBvZiB0aGlzLm1vZHVsZXMpIHtcclxuICAgICAgICAgICAgaWYgKG0uZmlsZS5kaXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgZGlydHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGRpcnR5O1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBnZXRNb2R1bGVzKGluY2x1ZGVTeXN0ZW1Nb2R1bGVzOiBib29sZWFuLCBleGNsdWRlZE1vZHVsZU5hbWU/OiBTdHJpbmcpOiBNb2R1bGVbXSB7XHJcbiAgICAgICAgbGV0IHJldCA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IG0gb2YgdGhpcy5tb2R1bGVzKSB7XHJcbiAgICAgICAgICAgIGlmIChtLmZpbGUubmFtZSAhPSBleGNsdWRlZE1vZHVsZU5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGlmICghbS5pc1N5c3RlbU1vZHVsZSB8fCBpbmNsdWRlU3lzdGVtTW9kdWxlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKG0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHV0TW9kdWxlKG1vZHVsZTogTW9kdWxlKSB7XHJcbiAgICAgICAgdGhpcy5tb2R1bGVzLnB1c2gobW9kdWxlKTtcclxuICAgICAgICB0aGlzLm1vZHVsZU1hcFttb2R1bGUuZmlsZS5uYW1lXSA9IG1vZHVsZTtcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmVNb2R1bGVXaXRoRmlsZShmaWxlOiBGaWxlKSB7XHJcbiAgICAgICAgZm9yIChsZXQgbSBvZiB0aGlzLm1vZHVsZXMpIHtcclxuICAgICAgICAgICAgaWYgKG0uZmlsZSA9PSBmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZU1vZHVsZShtKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZU1vZHVsZShtb2R1bGU6IE1vZHVsZSkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5tb2R1bGVzLmluZGV4T2YobW9kdWxlKSA8IDApIHJldHVybjtcclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGVzLnNwbGljZSh0aGlzLm1vZHVsZXMuaW5kZXhPZihtb2R1bGUpLCAxKTtcclxuICAgICAgICB0aGlzLm1vZHVsZU1hcFttb2R1bGUuZmlsZS5uYW1lXSA9IHVuZGVmaW5lZDtcclxuICAgICAgICB0aGlzLmRpcnR5ID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRNb2R1bGUobW9kdWxlTmFtZTogc3RyaW5nKTogTW9kdWxlIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tb2R1bGVNYXBbbW9kdWxlTmFtZV07XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0VHlwZShpZGVudGlmaWVyOiBzdHJpbmcpOiB7IHR5cGU6IFR5cGUsIG1vZHVsZTogTW9kdWxlIH0ge1xyXG4gICAgICAgIGZvciAobGV0IG1vZHVsZSBvZiB0aGlzLm1vZHVsZXMpIHtcclxuICAgICAgICAgICAgaWYgKG1vZHVsZS50eXBlU3RvcmUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHR5cGUgPSBtb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoaWRlbnRpZmllcik7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogdHlwZSwgbW9kdWxlOiBtb2R1bGUgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUeXBlQ29tcGxldGlvbkl0ZW1zKG1vZHVsZUNvbnRleHQ6IE1vZHVsZSwgcmFuZ2VUb1JlcGxhY2U6IG1vbmFjby5JUmFuZ2UpOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtW10ge1xyXG5cclxuICAgICAgICBsZXQgY29tcGxldGlvbkl0ZW1zOiBtb25hY28ubGFuZ3VhZ2VzLkNvbXBsZXRpb25JdGVtW10gPSBbXTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgbW9kdWxlIG9mIHRoaXMubW9kdWxlcykge1xyXG4gICAgICAgICAgICBpZiAobW9kdWxlLnR5cGVTdG9yZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB0eXBlIG9mIG1vZHVsZS50eXBlU3RvcmUudHlwZUxpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobW9kdWxlID09IG1vZHVsZUNvbnRleHQgfHwgKHR5cGUgaW5zdGFuY2VvZiBLbGFzcyAmJiB0eXBlLnZpc2liaWxpdHkgPT0gVmlzaWJpbGl0eS5wdWJsaWMpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IG1vZHVsZS5pc1N5c3RlbU1vZHVsZSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbCA9IFwiS2xhc3NlXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlLmRvY3VtZW50YXRpb24gIT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWwgPSB0eXBlLmRvY3VtZW50YXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobW9kdWxlLmlzU3lzdGVtTW9kdWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSBpbnN0YW5jZW9mIFByaW1pdGl2ZVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWwgPSBcIlByaW1pdGl2ZXIgRGF0ZW50eXBcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsID0gXCJTeXN0ZW1rbGFzc2VcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogdHlwZS5pZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBkZXRhaWwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0OiB0eXBlLmlkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kOiB0eXBlIGluc3RhbmNlb2YgUHJpbWl0aXZlVHlwZSA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUtpbmQuU3RydWN0IDogbW9uYWNvLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbUtpbmQuQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogcmFuZ2VUb1JlcGxhY2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZW5lcmljOiAoKHR5cGUgaW5zdGFuY2VvZiBLbGFzcyB8fCB0eXBlIGluc3RhbmNlb2YgSW50ZXJmYWNlKSAmJiB0eXBlLnR5cGVWYXJpYWJsZXMubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRpb25JdGVtcy5wdXNoKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNvbXBsZXRpb25JdGVtcztcclxuXHJcbiAgICB9XHJcblxyXG5cclxuXHJcblxyXG59XHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIFR5cGVTdG9yZSB7XHJcblxyXG4gICAgdHlwZUxpc3Q6IFR5cGVbXSA9IFtdO1xyXG4gICAgdHlwZU1hcDogTWFwPHN0cmluZywgVHlwZT4gPSBuZXcgTWFwKCk7XHJcblxyXG4gICAgYWRkVHlwZSh0eXBlOiBUeXBlKSB7XHJcbiAgICAgICAgdGhpcy50eXBlTGlzdC5wdXNoKHR5cGUpO1xyXG4gICAgICAgIHRoaXMudHlwZU1hcC5zZXQodHlwZS5pZGVudGlmaWVyLCB0eXBlKTtcclxuICAgIH1cclxuXHJcbiAgICBjbGVhcigpIHtcclxuICAgICAgICB0aGlzLnR5cGVMaXN0Lmxlbmd0aCA9IDA7XHJcbiAgICAgICAgdGhpcy50eXBlTWFwLmNsZWFyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0VHlwZShpZGVudGlmaWVyOiBzdHJpbmcpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy50eXBlTWFwLmdldChpZGVudGlmaWVyKTtcclxuICAgIH1cclxuXHJcblxyXG5cclxufVxyXG4iXX0=