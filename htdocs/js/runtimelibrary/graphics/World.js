import { Klass } from "../../compiler/types/Class.js";
import { doublePrimitiveType, intPrimitiveType, stringPrimitiveType, voidPrimitiveType } from "../../compiler/types/PrimitiveTypes.js";
import { Method, Parameterlist } from "../../compiler/types/Types.js";
import { InterpreterState } from "../../interpreter/Interpreter.js";
import { ColorHelper } from "./ColorHelper.js";
import { FilledShapeDefaults } from "./FilledShapeDefaults.js";
export class WorldClass extends Klass {
    constructor(module) {
        super("World", module, "Grafische Zeichenfläche mit Koordinatensystem");
        this.module = module;
        this.setBaseClass(module.typeStore.getType("Object"));
        let groupType = module.typeStore.getType("Group");
        let shapeType = module.typeStore.getType("Shape");
        let mouseListenerType = module.typeStore.getType("MouseListener");
        // this.addAttribute(new Attribute("PI", doublePrimitiveType, (object) => { return Math.PI }, true, Visibility.public, true, "Die Kreiszahl Pi (3.1415...)"));
        this.addMethod(new Method("World", new Parameterlist([
            { identifier: "breite", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "höhe", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let breite = parameters[1].value;
            let höhe = parameters[2].value;
            let gh = this.getWorldHelper(o, breite, höhe); //new WorldHelper(breite, höhe, this.module, o);
            o.intrinsicData["World"] = gh;
        }, false, false, "Legt einen neuen Grafikbereich (='Welt') an", true));
        this.addMethod(new Method("World", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let gh = this.getWorldHelper(o); // new WorldHelper(800, 600, this.module, o);
            o.intrinsicData["World"] = gh;
        }, false, false, "Legt einen neuen Grafikbereich (='Welt') an. Das Koordinatensystem geht von 0 bis 800 in x-Richtung und von 0 - 600 in y-Richtung.", true));
        this.addMethod(new Method("setBackgroundColor", new Parameterlist([
            { identifier: "colorAsRGBInt", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let color = parameters[1].value;
            let wh = o.intrinsicData["World"];
            wh.setBackgroundColor(color);
        }, false, false, 'Setzt die Hintergrundfarbe. Die Farbe wird als integer-Zahl erwartet. Am besten schreibt man sie als Hexadezimalzahl, also z.B. setBackgroundColor(0xff8080)."', false));
        this.addMethod(new Method("setBackgroundColor", new Parameterlist([
            { identifier: "colorAsRGBAString", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let color = parameters[1].value;
            let wh = o.intrinsicData["World"];
            wh.setBackgroundColor(color);
        }, false, false, 'Setzt die Hintergrundfarbe. Die Farbe ist entweder eine vordefinierte Farbe ("schwarz", "rot", ...) oder eine css-Farbe der Art "#ffa7b3" (ohne alpha), "#ffa7b380" (mit alpha), "rgb(172, 22, 18)" oder "rgba(123, 22,18, 0.3)"', false));
        this.addMethod(new Method("move", new Parameterlist([
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let x = parameters[1].value;
            let y = parameters[2].value;
            let wh = o.intrinsicData["World"];
            let matrix = new PIXI.Matrix().copyFrom(wh.stage.projectionTransform);
            wh.stage.projectionTransform.identity();
            wh.stage.projectionTransform.translate(x, y);
            wh.stage.projectionTransform.prepend(matrix);
            wh.computeCurrentWorldBounds();
            wh.shapesNotAffectedByWorldTransforms.forEach((shape) => shape.move(-x, -y));
        }, false, false, 'Verschiebt alle Objekte der Welt um x nach rechts und y nach unten.', false));
        this.addMethod(new Method("follow", new Parameterlist([
            { identifier: "shape", type: shapeType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "margin", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "xMin", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "xMax", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "yMin", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "yMax", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let shape = parameters[1].value;
            let frameWidth = parameters[2].value;
            let xMin = parameters[3].value;
            let xMax = parameters[4].value;
            let yMin = parameters[5].value;
            let yMax = parameters[6].value;
            let wh = o.intrinsicData["World"];
            let shapeHelper = shape.intrinsicData["Actor"];
            let moveX = 0;
            let moveY = 0;
            let shapeX = shapeHelper.getCenterX();
            let shapeY = shapeHelper.getCenterY();
            let outsideRight = shapeX - (wh.currentLeft + wh.currentWidth - frameWidth);
            if (outsideRight > 0 && wh.currentLeft + wh.currentWidth < xMax) {
                moveX = -outsideRight;
            }
            let outsideLeft = (wh.currentLeft + frameWidth) - shapeX;
            if (outsideLeft > 0 && wh.currentLeft > xMin) {
                moveX = outsideLeft;
            }
            let outsideBottom = shapeY - (wh.currentTop + wh.currentHeight - frameWidth);
            if (outsideBottom > 0 && wh.currentTop + wh.currentHeight <= yMax) {
                moveY = -outsideBottom;
            }
            let outsideTop = (wh.currentTop + frameWidth) - shapeY;
            if (outsideTop > 0 && wh.currentTop >= yMin) {
                moveY = outsideTop;
            }
            if (moveX != 0 || moveY != 0) {
                let matrix = new PIXI.Matrix().copyFrom(wh.stage.projectionTransform);
                wh.stage.projectionTransform.identity();
                wh.stage.projectionTransform.translate(moveX, moveY);
                wh.stage.projectionTransform.prepend(matrix);
                wh.computeCurrentWorldBounds();
                wh.shapesNotAffectedByWorldTransforms.forEach((shape) => shape.move(-moveX, -moveY));
            }
        }, false, false, 'Verschiebt die Welt so, dass das übergebene graphische Objekt (shape) sichtbar wird. Verschoben wird nur, wenn das Objekt weniger als frameWidth vom Rand entfernt ist und die Welt nicht über die gegebenen Koordinaten xMin, xMax, yMin und yMax hinausragt.', false));
        this.addMethod(new Method("rotate", new Parameterlist([
            { identifier: "angleInDeg", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let angle = parameters[1].value;
            let x = parameters[2].value;
            let y = parameters[3].value;
            let wh = o.intrinsicData["World"];
            let angleRad = -angle / 180 * Math.PI;
            let matrix = new PIXI.Matrix().copyFrom(wh.stage.projectionTransform);
            wh.stage.projectionTransform.identity();
            wh.stage.projectionTransform.translate(-x, -y);
            wh.stage.projectionTransform.rotate(angleRad);
            wh.stage.projectionTransform.translate(x, y);
            wh.stage.projectionTransform.prepend(matrix);
            wh.computeCurrentWorldBounds();
            wh.shapesNotAffectedByWorldTransforms.forEach((shape) => {
                shape.rotate(-angle, x, y);
            });
        }, false, false, 'Rotiert die Welt um den angegebenen Winkel im Urzeigersinn. Drehpunkt ist der Punkt (x/y).', false));
        this.addMethod(new Method("scale", new Parameterlist([
            { identifier: "factor", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "x", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let factor = parameters[1].value;
            let x = parameters[2].value;
            let y = parameters[3].value;
            let wh = o.intrinsicData["World"];
            let matrix = new PIXI.Matrix().copyFrom(wh.stage.projectionTransform);
            wh.stage.projectionTransform.identity();
            wh.stage.projectionTransform.translate(-x, -y);
            wh.stage.projectionTransform.scale(factor, factor);
            wh.stage.projectionTransform.translate(x, y);
            wh.stage.projectionTransform.prepend(matrix);
            wh.computeCurrentWorldBounds();
            wh.shapesNotAffectedByWorldTransforms.forEach((shape) => shape.scale(1 / factor, x, y));
        }, false, false, 'Streckt die Welt um den angegebenen Faktor. Zentrum der Streckung ist (x/y).', false));
        this.addMethod(new Method("setCoordinateSystem", new Parameterlist([
            { identifier: "left", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "top", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "width", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "height", type: doublePrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let left = parameters[1].value;
            let top = parameters[2].value;
            let width = parameters[3].value;
            let height = parameters[4].value;
            let wh = o.intrinsicData["World"];
            wh.stage.projectionTransform.identity(); // coordinate system (0/0) to (initialWidth/initialHeight)
            wh.stage.projectionTransform.translate(-left, -top);
            wh.stage.projectionTransform.scale(wh.initialWidth / width, wh.initialHeight / height);
            wh.computeCurrentWorldBounds();
            wh.shapesNotAffectedByWorldTransforms.forEach((shape) => {
                shape.scale(width / wh.initialWidth, left, top);
                shape.move(left, top);
            });
        }, false, false, 'Streckt die Welt um den angegebenen Faktor. Zentrum der Streckung ist (x/y).', false));
        this.addMethod(new Method("setDefaultGroup", new Parameterlist([
            { identifier: "group", type: groupType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let group = parameters[1].value;
            let wh = o.intrinsicData["World"];
            wh.defaultGroup = group == null ? null : group.intrinsicData["Actor"];
        }, false, false, 'Legt eine Gruppe fest, zu der ab jetzt alle neuen Objekte automatisch hinzugefügt werden. Falls null angegeben wird, werden neue Objekte zu keiner Gruppe automatisch hinzugefügt.', false));
        this.addMethod(new Method("getDefaultGroup", new Parameterlist([]), groupType, (parameters) => {
            let o = parameters[0].value;
            let wh = o.intrinsicData["World"];
            return wh.getDefaultGroup();
        }, false, false, 'Gibt die Gruppe zurück, zu der aktuell alle neuen Objekte automatisch hinzugefügt werden. Falls gerade keine defaultGroup festgelegt ist, wird null zurückgegeben.', false));
        this.addMethod(new Method("addMouseListener", new Parameterlist([
            { identifier: "listener", type: mouseListenerType, declaration: null, usagePositions: null, isFinal: true },
        ]), voidPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let listener = parameters[1].value;
            let wh = o.intrinsicData["World"];
            wh.addMouseListener(listener);
        }, false, false, 'Fügt einen neuen MouseListener hinzu, dessen Methoden bei Mausereignissen aufgerufen werden.', false));
        this.addMethod(new Method("getWidth", new Parameterlist([]), intPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let wh = o.intrinsicData["World"];
            return Math.round(wh.currentWidth);
        }, false, false, 'Gibt die "Breite" des Grafikbereichs zurück, genauer: die x-Koordinate am rechten Rand.', false));
        this.addMethod(new Method("getHeight", new Parameterlist([]), intPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let wh = o.intrinsicData["World"];
            return Math.round(wh.currentHeight);
        }, false, false, 'Gibt die "Höhe" des Grafikbereichs zurück, genauer: die y-Koordinate am unteren Rand.', false));
        this.addMethod(new Method("getTop", new Parameterlist([]), intPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let wh = o.intrinsicData["World"];
            return Math.round(wh.currentTop);
        }, false, false, 'Gibt die y-Koordinate der linken oberen Ecke zurück.', false));
        this.addMethod(new Method("getLeft", new Parameterlist([]), intPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let wh = o.intrinsicData["World"];
            return Math.round(wh.currentLeft);
        }, false, false, 'Gibt die x-Koordinate der linken oberen Ecke zurück.', false));
        this.addMethod(new Method("setCursor", new Parameterlist([
            { identifier: "cursor", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let wh = o.intrinsicData["World"];
            let cursor = parameters[1].value;
            wh.setCursor(cursor);
        }, false, false, 'Ändert die Form des Mauscursors im gesamten Grafikbereich. Mögiche Werte: siehe https://developer.mozilla.org/de/docs/Web/CSS/cursor.', false));
    }
    getWorldHelper(worldObject, breite = 800, höhe = 600) {
        var _a, _b, _c, _d;
        let wh = (_c = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.main) === null || _b === void 0 ? void 0 : _b.getInterpreter()) === null || _c === void 0 ? void 0 : _c.worldHelper;
        if (wh != null) {
            if (wh.width != breite || wh.height != höhe) {
                let ratio = Math.round(höhe / breite * 100);
                wh.$containerOuter.css('padding-bottom', ratio + "%");
                wh.stage.projectionTransform.scale(wh.width / breite, wh.width / höhe);
                (_d = this.module.main.getRightDiv()) === null || _d === void 0 ? void 0 : _d.adjustWidthToWorld();
            }
            return wh;
        }
        else {
            return new WorldHelper(breite, höhe, this.module, worldObject);
        }
    }
}
/**
 * @see https://javascript.plainenglish.io/inside-pixijs-projection-system-897872a3dc17
 */
class WorldContainer extends PIXI.Container {
    constructor(sourceFrame, destinationFrame) {
        super();
        this.sourceFrame = sourceFrame;
        this.destinationFrame = destinationFrame;
        this.projectionTransform = new PIXI.Matrix();
    }
    render(renderer) {
        renderer.projection.projectionMatrix.identity();
        renderer.projection.transform = this.projectionTransform;
        renderer.renderTexture.bind(renderer.renderTexture.current, this.sourceFrame, this.destinationFrame);
        super.render(renderer);
        renderer.batch.flush();
        renderer.batch.flush();
        renderer.projection.projectionMatrix.identity();
        renderer.projection.transform = null;
        renderer.renderTexture.bind(null);
    }
}
export class WorldHelper {
    constructor(width, height, module, world) {
        var _a, _b, _c;
        this.width = width;
        this.height = height;
        this.module = module;
        this.world = world;
        this.actActors = [];
        this.keyPressedActors = [];
        this.keyUpActors = [];
        this.keyDownActors = [];
        this.actorHelpersToDestroy = [];
        this.mouseListenerShapes = [];
        this.mouseListeners = [];
        this.actorsFinished = true;
        this.summedDelta = 0;
        this.scaledTextures = {};
        this.shapes = []; // all shapes incl. groups that aren't part of a group
        this.shapesNotAffectedByWorldTransforms = [];
        this.actorsNotFinished = 0;
        this.ticks = 0;
        this.deltaSum = 0;
        this.spriteAnimations = [];
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        PIXI.settings.TARGET_FPMS = 30.0 / 1000.0;
        this.globalScale = 1;
        while (height > 1000 || width > 2000) {
            this.globalScale *= 2;
            height /= 2;
            width /= 2;
        }
        this.initialHeight = this.height;
        this.initialWidth = this.width;
        this.currentLeft = 0;
        this.currentTop = 0;
        this.currentWidth = this.width;
        this.currentHeight = this.height;
        this.interpreter = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.main) === null || _b === void 0 ? void 0 : _b.getInterpreter();
        if (this.interpreter.processingHelper != null) {
            this.interpreter.throwException("Die herkömmliche Grafikausgabe kann nicht zusammen mit Processing genutzt werden.");
        }
        if (this.interpreter.worldHelper != null) {
            this.interpreter.throwException("Es darf nur ein World-Objekt instanziert werden.");
        }
        this.interpreter.worldHelper = this;
        let $graphicsDiv = this.module.main.getInterpreter().printManager.getGraphicsDiv();
        this.$coordinateDiv = this.module.main.getRightDiv().$rightDiv.find(".jo_coordinates");
        let f = () => {
            let $jo_tabs = $graphicsDiv.parents(".jo_tabs");
            if ($jo_tabs.length == 0) {
                $jo_tabs = $graphicsDiv.parents(".joe_rightDivInner");
            }
            let maxWidth = $jo_tabs.width();
            let maxHeight = $jo_tabs.height();
            if (height / width > maxHeight / maxWidth) {
                $graphicsDiv.css({
                    'width': width / height * maxHeight + "px",
                    'height': maxHeight + "px",
                });
            }
            else {
                $graphicsDiv.css({
                    'height': height / width * maxWidth + "px",
                    'width': maxWidth + "px",
                });
            }
        };
        $graphicsDiv.off('sizeChanged');
        $graphicsDiv.on('sizeChanged', f);
        f();
        this.$containerOuter = jQuery('<div></div>');
        this.$containerInner = jQuery('<div></div>');
        this.$containerOuter.append(this.$containerInner);
        $graphicsDiv.append(this.$containerOuter);
        $graphicsDiv.show();
        $graphicsDiv[0].oncontextmenu = function (e) {
            e.preventDefault();
        };
        if (this.module.main.pixiApp) {
            this.app = this.module.main.pixiApp;
            this.app.renderer.resize(width, height);
            this.app.renderer.backgroundColor = 0x0;
        }
        else {
            this.app = new PIXI.Application({
                antialias: true,
                width: width, height: height,
                //resizeTo: $containerInner[0]
            });
            this.module.main.pixiApp = this.app;
        }
        let that = this;
        this.tickerFunction = (delta) => {
            that.tick(PIXI.Ticker.shared.elapsedMS);
        };
        this.app.ticker.add(this.tickerFunction);
        this.app.ticker.maxFPS = 30;
        this.interpreter.timerExtern = true;
        let sourceFrame = new PIXI.Rectangle(0, 0, this.width, this.height);
        let destinationFrame = new PIXI.Rectangle(0, 0, width, height);
        this.stage = new WorldContainer(sourceFrame, destinationFrame);
        this.stage.projectionTransform = new PIXI.Matrix();
        this.app.stage.addChild(this.stage);
        this.$containerInner.append(this.app.view);
        this.interpreter.keyboardTool.keyPressedCallbacks.push((key) => {
            for (let kpa of that.keyPressedActors) {
                that.runActorWhenKeyEvent(kpa, key);
            }
        });
        this.interpreter.keyboardTool.keyUpCallbacks.push((key) => {
            for (let kpa of that.keyUpActors) {
                that.runActorWhenKeyEvent(kpa, key);
            }
        });
        this.interpreter.keyboardTool.keyDownCallbacks.push((key) => {
            for (let kpa of that.keyDownActors) {
                that.runActorWhenKeyEvent(kpa, key);
            }
        });
        for (let listenerType of ["mouseup", "mousedown", "mousemove", "mouseenter", "mouseleave"]) {
            let eventType = listenerType;
            if (window.PointerEvent) {
                eventType = eventType.replace('mouse', 'pointer');
            }
            this.$containerInner.on(eventType, (e) => {
                let x = width * e.offsetX / this.$containerInner.width();
                let y = height * e.offsetY / this.$containerInner.height();
                let p = new PIXI.Point(x * this.globalScale, y * this.globalScale);
                this.stage.projectionTransform.applyInverse(p, p);
                x = p.x;
                y = p.y;
                that.onMouseEvent(listenerType, x, y, e.button);
                for (let listener of this.mouseListeners) {
                    if (listener.types[listenerType] != null) {
                        this.invokeMouseListener(listener, listenerType, x, y, e.button);
                    }
                }
                if (listenerType == "mousedown") {
                    let gngEreignisbehandlung = this.interpreter.gngEreignisbehandlungHelper;
                    if (gngEreignisbehandlung != null) {
                        gngEreignisbehandlung.handleMouseClickedEvent(x, y);
                    }
                }
            });
        }
        let $coordinateDiv = this.$coordinateDiv;
        let mousePointer = window.PointerEvent ? "pointer" : "mouse";
        this.$containerInner.on(mousePointer + "move", (e) => {
            let x = width * e.offsetX / this.$containerInner.width();
            let y = height * e.offsetY / this.$containerInner.height();
            let p = new PIXI.Point(x * this.globalScale, y * this.globalScale);
            this.stage.projectionTransform.applyInverse(p, p);
            x = Math.round(p.x);
            y = Math.round(p.y);
            $coordinateDiv.text(`(${x}/${y})`);
        });
        this.$containerInner.on(mousePointer + "enter", (e) => {
            $coordinateDiv.show();
        });
        this.$containerInner.on(mousePointer + "leave", (e) => {
            $coordinateDiv.hide();
        });
        (_c = this.module.main.getRightDiv()) === null || _c === void 0 ? void 0 : _c.adjustWidthToWorld();
    }
    clearActorLists() {
        this.actActors = [];
        this.keyPressedActors = [];
        this.keyUpActors = [];
        this.keyDownActors = [];
    }
    computeCurrentWorldBounds() {
        let p1 = new PIXI.Point(0, 0);
        this.stage.projectionTransform.applyInverse(p1, p1);
        let p2 = new PIXI.Point(this.initialWidth, this.initialHeight);
        this.stage.projectionTransform.applyInverse(p2, p2);
        this.currentLeft = p1.x;
        this.currentTop = p1.y;
        this.currentWidth = Math.abs(p2.x - p1.x);
        this.currentHeight = Math.abs(p2.y - p1.y);
    }
    hasActors() {
        return this.actActors.length > 0 || this.keyPressedActors.length > 0 || this.keyUpActors.length > 0
            || this.keyDownActors.length > 0 || this.mouseListeners.length > 0 || this.mouseListenerShapes.length > 0;
    }
    setAllHitpolygonsDirty() {
        for (let shape of this.shapes) {
            shape.setHitPolygonDirty(true);
        }
    }
    setCursor(cursor) {
        this.$containerInner.css('cursor', cursor);
    }
    tick(delta) {
        var _a;
        if (this.interpreter != null) {
            switch (this.interpreter.state) {
                case InterpreterState.running:
                    this.summedDelta += delta;
                    for (let spriteHelper of this.spriteAnimations) {
                        spriteHelper.tick(delta);
                    }
                    if (!this.actorsFinished) {
                        this.actorsNotFinished++;
                        break;
                    }
                    if (this.interpreter.pauseUntil != null) {
                        break;
                    }
                    let first = true;
                    for (let actorData of this.actActors) {
                        let actorHelper = actorData.actorHelper;
                        if (actorHelper.timerPaused || actorHelper.isDestroyed)
                            continue;
                        let program = (_a = actorData.method) === null || _a === void 0 ? void 0 : _a.program;
                        this.runActor(first, actorData, this.summedDelta);
                        if (program != null && !actorData.actorHelper.isDestroyed) {
                            first = false;
                            this.actorsFinished = false;
                        }
                    }
                    break;
                case InterpreterState.done:
                case InterpreterState.error:
                case InterpreterState.not_initialized:
                    this.clearActorLists();
                    break;
            }
            this.summedDelta = 0;
            if (this.interpreter.state == InterpreterState.running) {
                if (this.actActors.length > 0) {
                    this.interpreter.timerFunction(33.33, true, 0.5);
                    //@ts-ignore
                    if (this.interpreter.state == InterpreterState.running) {
                        this.interpreter.timerStopped = false;
                        this.interpreter.timerFunction(33.33, false, 0.08);
                    }
                }
                else {
                    this.interpreter.timerFunction(33.33, false, 0.7);
                }
            }
        }
        while (this.actorHelpersToDestroy.length > 0) {
            let actorHelper = this.actorHelpersToDestroy.pop();
            for (let actorList of [this.keyPressedActors, this.keyUpActors, this.keyDownActors]) {
                for (let i = 0; i < actorList.length; i++) {
                    if (actorList[i].actorHelper === actorHelper) {
                        actorList.splice(i, 1);
                        i--;
                    }
                }
            }
            for (let i = 0; i < this.mouseListenerShapes.length; i++) {
                if (this.mouseListenerShapes[i].shapeHelper === actorHelper) {
                    this.mouseListenerShapes.splice(i, 1);
                    i--;
                }
            }
            for (let i = 0; i < this.actActors.length; i++) {
                if (this.actActors[i].actorHelper === actorHelper) {
                    this.actActors.splice(i, 1);
                    i--;
                }
            }
            let displayObject = actorHelper.displayObject;
            if (displayObject != null) {
                displayObject.destroy();
                actorHelper.displayObject = null;
            }
        }
    }
    setBackgroundColor(color) {
        if (typeof color == "string") {
            let c = ColorHelper.parseColorToOpenGL(color);
            this.app.renderer.backgroundColor = c.color;
        }
        else {
            this.app.renderer.backgroundColor = color;
        }
    }
    runActorWhenKeyEvent(actorData, key) {
        var _a, _b;
        let program = (_a = actorData.method) === null || _a === void 0 ? void 0 : _a.program;
        let invoke = (_b = actorData.method) === null || _b === void 0 ? void 0 : _b.invoke;
        let rto = actorData.actorHelper.runtimeObject;
        let stackElements = [
            {
                type: rto.class,
                value: rto
            },
            {
                type: stringPrimitiveType,
                value: key
            }
        ];
        if (program != null) {
            this.interpreter.runTimer(actorData.method, stackElements, null, false);
        }
        else if (invoke != null) {
            invoke([]);
        }
    }
    runActor(first, actorData, delta) {
        var _a, _b;
        let program = (_a = actorData.method) === null || _a === void 0 ? void 0 : _a.program;
        let invoke = (_b = actorData.method) === null || _b === void 0 ? void 0 : _b.invoke;
        let rto = actorData.actorHelper.runtimeObject;
        let stackElements = [
            {
                type: rto.class,
                value: rto
            },
        ];
        if (actorData.method.getParameterCount() > 0) {
            stackElements.push({
                type: doublePrimitiveType,
                value: delta
            });
        }
        let that = this;
        if (program != null) {
            this.interpreter.runTimer(actorData.method, stackElements, first ? (interpreter) => {
                that.actorsFinished = true;
                interpreter.timerStopped = true;
            } : null, true);
        }
        else if (invoke != null) {
            invoke([]);
        }
    }
    cacheAsBitmap() {
        let hasRobot = this.robotWorldHelper != null;
        this.mouseListenerShapes = [];
        let scaleMin = 1.0;
        if (this.currentWidth * this.currentHeight > 2500000)
            scaleMin = Math.sqrt(2500000 / (this.currentWidth * this.currentHeight));
        if (this.currentWidth * this.currentHeight < 1024 * 1024)
            scaleMin = Math.sqrt(1024 * 1024 / (this.currentWidth * this.currentHeight));
        const brt = new PIXI.BaseRenderTexture({
            scaleMode: PIXI.SCALE_MODES.LINEAR,
            width: Math.round(this.currentWidth * scaleMin),
            height: Math.round(this.currentHeight * scaleMin)
        });
        let rt = new PIXI.RenderTexture(brt);
        let transform = new PIXI.Matrix().scale(scaleMin, scaleMin);
        setTimeout(() => {
            if (!hasRobot) {
                this.app.renderer.render(this.stage, {
                    renderTexture: rt,
                    transform: transform
                });
                setTimeout(() => {
                    this.stage.children.forEach(c => c.destroy());
                    this.stage.removeChildren();
                    let sprite = new PIXI.Sprite(rt);
                    sprite.localTransform.scale(this.globalScale, this.globalScale);
                    // debugger;
                    // sprite.localTransform.translate(0, rt.height);
                    //@ts-ignore
                    sprite.transform.onChange();
                    // this.stage.projectionTransform = new PIXI.Matrix().scale(1, -1).translate(0, this.currentHeight);
                    this.stage.projectionTransform = new PIXI.Matrix();
                    this.stage.addChild(sprite);
                }, 300);
            }
        }, 150); // necessary to await Turtle's deferred rendering
    }
    destroyWorld() {
        for (let listenerType of ["mouseup", "mousedown", "mousemove", "mouseenter", "mouseleave"]) {
            this.$containerInner.off(listenerType);
        }
        this.spriteAnimations = [];
        this.app.ticker.remove(this.tickerFunction);
        this.app.stage.children.forEach(c => c.destroy());
        this.app.stage.removeChildren();
        if (this.robotWorldHelper != null) {
            this.robotWorldHelper.destroy();
            this.robotWorldHelper = null;
        }
        jQuery(this.app.view).detach();
        this.$containerOuter.remove();
        this.module.main.getInterpreter().printManager.getGraphicsDiv().hide();
        this.interpreter.timerExtern = false;
        this.interpreter.worldHelper = null;
        this.$coordinateDiv.hide();
        FilledShapeDefaults.initDefaultValues();
    }
    onMouseEvent(listenerType, x, y, button) {
        switch (listenerType) {
            case "mousedown":
            case "mouseup":
                for (let listener of this.mouseListenerShapes) {
                    let shapeHelper = listener.shapeHelper;
                    if (listener.types[listenerType] != null && (shapeHelper.containsPoint(x, y) || shapeHelper.trackMouseMove)) {
                        this.invokeShapeMouseListener(listener, listenerType, x, y, button);
                    }
                }
                break;
            case "mouseenter":
                for (let listener of this.mouseListenerShapes) {
                    let shapeHelper = listener.shapeHelper;
                    if (listener.types[listenerType] != null && shapeHelper.containsPoint(x, y) && !shapeHelper.mouseLastSeenInsideObject) {
                        this.invokeShapeMouseListener(listener, listenerType, x, y, button, () => {
                            shapeHelper.mouseLastSeenInsideObject = true;
                        });
                    }
                }
                break;
            case "mouseleave":
                for (let listener of this.mouseListenerShapes) {
                    let shapeHelper = listener.shapeHelper;
                    if (listener.types[listenerType] != null && shapeHelper.mouseLastSeenInsideObject) {
                        this.invokeShapeMouseListener(listener, listenerType, x, y, button, () => {
                            shapeHelper.mouseLastSeenInsideObject = false;
                        });
                    }
                }
                break;
            case "mousemove":
                for (let listener of this.mouseListenerShapes) {
                    let shapeHelper = listener.shapeHelper;
                    if (listener.types["mousemove"] != null ||
                        (listener.types["mouseenter"] != null && !shapeHelper.mouseLastSeenInsideObject) ||
                        (listener.types["mouseleave"] != null && shapeHelper.mouseLastSeenInsideObject)) {
                        let containsPoint = shapeHelper.containsPoint(x, y);
                        if ((shapeHelper.trackMouseMove || containsPoint) && listener.types["mousemove"] != null) {
                            this.invokeShapeMouseListener(listener, "mousemove", x, y, button);
                        }
                        if (containsPoint && listener.types["mouseenter"] != null && !shapeHelper.mouseLastSeenInsideObject) {
                            this.invokeShapeMouseListener(listener, "mouseenter", x, y, button, () => {
                                shapeHelper.mouseLastSeenInsideObject = true;
                            });
                        }
                        if (!containsPoint && listener.types["mouseleave"] != null && shapeHelper.mouseLastSeenInsideObject) {
                            this.invokeShapeMouseListener(listener, "mouseleave", x, y, button, () => {
                                shapeHelper.mouseLastSeenInsideObject = false;
                            });
                        }
                    }
                }
                break;
        }
    }
    invokeShapeMouseListener(listener, listenerType, x, y, button, callback) {
        if (!listener.shapeHelper.reactToMouseEventsWhenInvisible &&
            !listener.shapeHelper.displayObject.visible)
            return;
        let method = listener.methods[listenerType];
        let program = method.program;
        let invoke = method.invoke;
        let rto = listener.shapeHelper.runtimeObject;
        let stackElements = [
            {
                type: rto.class,
                value: rto
            },
            {
                type: doublePrimitiveType,
                value: x
            },
            {
                type: doublePrimitiveType,
                value: y
            }
        ];
        if (listenerType != "mousemove" && listenerType != "mouseenter" && listenerType != "mouseleave") {
            stackElements.push({
                type: intPrimitiveType,
                value: button
            });
        }
        if (program != null) {
            this.interpreter.runTimer(method, stackElements, callback, false);
        }
        else if (invoke != null) {
            invoke([]);
        }
    }
    addMouseListener(listener) {
        /*
            If a shape is registered as MouseListener of the world-object, it gets all mouse-events twice.
            => Deregister shape as mouseListenerShape and register it as mouse listener for the world object.
        */
        let index = this.mouseListenerShapes.findIndex((mls) => { return mls.shapeHelper.runtimeObject == listener; });
        if (index >= 0) {
            this.mouseListenerShapes.splice(index, 1);
        }
        let listenerTypes = [
            { identifier: "MouseUp", signature: "(double, double, int)" },
            { identifier: "MouseDown", signature: "(double, double, int)" },
            { identifier: "MouseMove", signature: "(double, double)" },
            { identifier: "MouseEnter", signature: "(double, double)" },
            { identifier: "MouseLeave", signature: "(double, double)" },
        ];
        let sd = null;
        for (let lt of listenerTypes) {
            let method = listener.class.getMethodBySignature("on" + lt.identifier + lt.signature);
            if ((method === null || method === void 0 ? void 0 : method.program) != null && method.program.statements.length > 2 || (method === null || method === void 0 ? void 0 : method.invoke) != null) {
                if (sd == null) {
                    sd = {
                        listener: listener,
                        types: {},
                        methods: {}
                    };
                    this.mouseListeners.push(sd);
                }
                sd.types[lt.identifier.toLowerCase()] = true;
                sd.methods[lt.identifier.toLowerCase()] = method;
            }
        }
    }
    invokeMouseListener(listener, listenerType, x, y, button, callback) {
        let method = listener.methods[listenerType];
        let program = method.program;
        let invoke = method.invoke;
        let rto = listener.listener;
        let stackElements = [
            {
                type: rto.class,
                value: rto
            },
            {
                type: doublePrimitiveType,
                value: x
            },
            {
                type: doublePrimitiveType,
                value: y
            }
        ];
        if (listenerType != "mousemove" && listenerType != "mouseenter" && listenerType != "mouseleave") {
            stackElements.push({
                type: intPrimitiveType,
                value: button
            });
        }
        if (program != null) {
            this.interpreter.runTimer(method, stackElements, callback, false);
        }
        else if (invoke != null) {
            invoke([]);
        }
    }
    getDefaultGroup() {
        var _a;
        return (_a = this.defaultGroup) === null || _a === void 0 ? void 0 : _a.runtimeObject;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1dvcmxkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN2SSxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQzdFLE9BQU8sRUFBZSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR2pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQU0vRCxNQUFNLE9BQU8sVUFBVyxTQUFRLEtBQUs7SUFFakMsWUFBbUIsTUFBYztRQUU3QixLQUFLLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSwrQ0FBK0MsQ0FBQyxDQUFBO1FBRnhELFdBQU0sR0FBTixNQUFNLENBQVE7UUFJN0IsSUFBSSxDQUFDLFlBQVksQ0FBUSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRTdELElBQUksU0FBUyxHQUFlLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlELElBQUksU0FBUyxHQUFlLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlELElBQUksaUJBQWlCLEdBQTJCLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRTFGLDhKQUE4SjtRQUU5SixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFB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Q0Q7Z0JBQ0ksSUFBSSxFQUFFLG1CQUFtQjtnQkFDekIsS0FBSyxFQUFFLENBQUM7YUFDWDtZQUNEO2dCQUNJLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLEtBQUssRUFBRSxDQUFDO2FBQ1g7U0FDSixDQUFDO1FBRUYsSUFBSSxZQUFZLElBQUksV0FBVyxJQUFJLFlBQVksSUFBSSxZQUFZLElBQUksWUFBWSxJQUFJLFlBQVksRUFBRTtZQUM3RixhQUFhLENBQUMsSUFBSSxDQUNkO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLEtBQUssRUFBRSxNQUFNO2FBQ2hCLENBQUMsQ0FBQztTQUNWO1FBRUQsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO1lBQ2pCLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3JFO2FBQU0sSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ3ZCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNkO0lBRUwsQ0FBQztJQUVELGVBQWU7O1FBQ1gsT0FBTyxNQUFBLElBQUksQ0FBQyxZQUFZLDBDQUFFLGFBQWEsQ0FBQztJQUM1QyxDQUFDO0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBLbGFzcyB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBkb3VibGVQcmltaXRpdmVUeXBlLCBpbnRQcmltaXRpdmVUeXBlLCBzdHJpbmdQcmltaXRpdmVUeXBlLCB2b2lkUHJpbWl0aXZlVHlwZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBNZXRob2QsIFBhcmFtZXRlcmxpc3QsIFZhbHVlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL1R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEludGVycHJldGVyLCBJbnRlcnByZXRlclN0YXRlIH0gZnJvbSBcIi4uLy4uL2ludGVycHJldGVyL0ludGVycHJldGVyLmpzXCI7XHJcbmltcG9ydCB7IFJ1bnRpbWVPYmplY3QgfSBmcm9tIFwiLi4vLi4vaW50ZXJwcmV0ZXIvUnVudGltZU9iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBBY3RvckhlbHBlciB9IGZyb20gXCIuL0FjdG9yLmpzXCI7XHJcbmltcG9ydCB7IENvbG9ySGVscGVyIH0gZnJvbSBcIi4vQ29sb3JIZWxwZXIuanNcIjtcclxuaW1wb3J0IHsgRmlsbGVkU2hhcGVEZWZhdWx0cyB9IGZyb20gXCIuL0ZpbGxlZFNoYXBlRGVmYXVsdHMuanNcIjtcclxuaW1wb3J0IHsgR3JvdXBDbGFzcywgR3JvdXBIZWxwZXIgfSBmcm9tIFwiLi9Hcm91cC5qc1wiO1xyXG5pbXBvcnQgeyBNb3VzZUxpc3RlbmVySW50ZXJmYWNlIH0gZnJvbSBcIi4vTW91c2VMaXN0ZW5lci5qc1wiO1xyXG5pbXBvcnQgeyBTaGFwZUNsYXNzLCBTaGFwZUhlbHBlciB9IGZyb20gXCIuL1NoYXBlLmpzXCI7XHJcbmltcG9ydCB7IFNwcml0ZUhlbHBlciB9IGZyb20gXCIuL1Nwcml0ZS5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFdvcmxkQ2xhc3MgZXh0ZW5kcyBLbGFzcyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IocHVibGljIG1vZHVsZTogTW9kdWxlKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKFwiV29ybGRcIiwgbW9kdWxlLCBcIkdyYWZpc2NoZSBaZWljaGVuZmzDpGNoZSBtaXQgS29vcmRpbmF0ZW5zeXN0ZW1cIilcclxuXHJcbiAgICAgICAgdGhpcy5zZXRCYXNlQ2xhc3MoPEtsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIk9iamVjdFwiKSk7XHJcblxyXG4gICAgICAgIGxldCBncm91cFR5cGUgPSA8R3JvdXBDbGFzcz5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJHcm91cFwiKTtcclxuICAgICAgICBsZXQgc2hhcGVUeXBlID0gPFNoYXBlQ2xhc3M+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiU2hhcGVcIik7XHJcbiAgICAgICAgbGV0IG1vdXNlTGlzdGVuZXJUeXBlID0gPE1vdXNlTGlzdGVuZXJJbnRlcmZhY2U+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiTW91c2VMaXN0ZW5lclwiKTtcclxuXHJcbiAgICAgICAgLy8gdGhpcy5hZGRBdHRyaWJ1dGUobmV3IEF0dHJpYnV0ZShcIlBJXCIsIGRvdWJsZVByaW1pdGl2ZVR5cGUsIChvYmplY3QpID0+IHsgcmV0dXJuIE1hdGguUEkgfSwgdHJ1ZSwgVmlzaWJpbGl0eS5wdWJsaWMsIHRydWUsIFwiRGllIEtyZWlzemFobCBQaSAoMy4xNDE1Li4uKVwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJXb3JsZFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJicmVpdGVcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJow7ZoZVwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYnJlaXRlOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGjDtmhlOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGdoOiBXb3JsZEhlbHBlciA9IHRoaXMuZ2V0V29ybGRIZWxwZXIobywgYnJlaXRlLCBow7ZoZSk7ICAvL25ldyBXb3JsZEhlbHBlcihicmVpdGUsIGjDtmhlLCB0aGlzLm1vZHVsZSwgbyk7XHJcbiAgICAgICAgICAgICAgICBvLmludHJpbnNpY0RhdGFbXCJXb3JsZFwiXSA9IGdoO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkxlZ3QgZWluZW4gbmV1ZW4gR3JhZmlrYmVyZWljaCAoPSdXZWx0JykgYW5cIiwgdHJ1ZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiV29ybGRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBnaDogV29ybGRIZWxwZXIgPSB0aGlzLmdldFdvcmxkSGVscGVyKG8pOyAvLyBuZXcgV29ybGRIZWxwZXIoODAwLCA2MDAsIHRoaXMubW9kdWxlLCBvKTtcclxuICAgICAgICAgICAgICAgIG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdID0gZ2g7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiTGVndCBlaW5lbiBuZXVlbiBHcmFmaWtiZXJlaWNoICg9J1dlbHQnKSBhbi4gRGFzIEtvb3JkaW5hdGVuc3lzdGVtIGdlaHQgdm9uIDAgYmlzIDgwMCBpbiB4LVJpY2h0dW5nIHVuZCB2b24gMCAtIDYwMCBpbiB5LVJpY2h0dW5nLlwiLCB0cnVlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzZXRCYWNrZ3JvdW5kQ29sb3JcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY29sb3JBc1JHQkludFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbG9yOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdoOiBXb3JsZEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoLnNldEJhY2tncm91bmRDb2xvcihjb2xvcik7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdTZXR6dCBkaWUgSGludGVyZ3J1bmRmYXJiZS4gRGllIEZhcmJlIHdpcmQgYWxzIGludGVnZXItWmFobCBlcndhcnRldC4gQW0gYmVzdGVuIHNjaHJlaWJ0IG1hbiBzaWUgYWxzIEhleGFkZXppbWFsemFobCwgYWxzbyB6LkIuIHNldEJhY2tncm91bmRDb2xvcigweGZmODA4MCkuXCInLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2V0QmFja2dyb3VuZENvbG9yXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImNvbG9yQXNSR0JBU3RyaW5nXCIsIHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgY29sb3I6IHN0cmluZyA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgd2guc2V0QmFja2dyb3VuZENvbG9yKGNvbG9yKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ1NldHp0IGRpZSBIaW50ZXJncnVuZGZhcmJlLiBEaWUgRmFyYmUgaXN0IGVudHdlZGVyIGVpbmUgdm9yZGVmaW5pZXJ0ZSBGYXJiZSAoXCJzY2h3YXJ6XCIsIFwicm90XCIsIC4uLikgb2RlciBlaW5lIGNzcy1GYXJiZSBkZXIgQXJ0IFwiI2ZmYTdiM1wiIChvaG5lIGFscGhhKSwgXCIjZmZhN2IzODBcIiAobWl0IGFscGhhKSwgXCJyZ2IoMTcyLCAyMiwgMTgpXCIgb2RlciBcInJnYmEoMTIzLCAyMiwxOCwgMC4zKVwiJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm1vdmVcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInlcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHk6IG51bWJlciA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG1hdHJpeCA9IG5ldyBQSVhJLk1hdHJpeCgpLmNvcHlGcm9tKHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0pO1xyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS5pZGVudGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS50cmFuc2xhdGUoeCwgeSk7XHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLnByZXBlbmQobWF0cml4KTtcclxuXHJcbiAgICAgICAgICAgICAgICB3aC5jb21wdXRlQ3VycmVudFdvcmxkQm91bmRzKCk7XHJcbiAgICAgICAgICAgICAgICB3aC5zaGFwZXNOb3RBZmZlY3RlZEJ5V29ybGRUcmFuc2Zvcm1zLmZvckVhY2goKHNoYXBlKSA9PiBzaGFwZS5tb3ZlKC14LCAteSkpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnVmVyc2NoaWVidCBhbGxlIE9iamVrdGUgZGVyIFdlbHQgdW0geCBuYWNoIHJlY2h0cyB1bmQgeSBuYWNoIHVudGVuLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJmb2xsb3dcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwic2hhcGVcIiwgdHlwZTogc2hhcGVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIm1hcmdpblwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInhNaW5cIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ4TWF4XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieU1pblwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInlNYXhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBmcmFtZVdpZHRoOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHhNaW46IG51bWJlciA9IHBhcmFtZXRlcnNbM10udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeE1heDogbnVtYmVyID0gcGFyYW1ldGVyc1s0XS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB5TWluOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzVdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHlNYXg6IG51bWJlciA9IHBhcmFtZXRlcnNbNl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciA9IHNoYXBlLmludHJpbnNpY0RhdGFbXCJBY3RvclwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbW92ZVg6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgICAgICBsZXQgbW92ZVk6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlWDogbnVtYmVyID0gc2hhcGVIZWxwZXIuZ2V0Q2VudGVyWCgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlWTogbnVtYmVyID0gc2hhcGVIZWxwZXIuZ2V0Q2VudGVyWSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvdXRzaWRlUmlnaHQgPSBzaGFwZVggLSAod2guY3VycmVudExlZnQgKyB3aC5jdXJyZW50V2lkdGggLSBmcmFtZVdpZHRoKTtcclxuICAgICAgICAgICAgICAgIGlmIChvdXRzaWRlUmlnaHQgPiAwICYmIHdoLmN1cnJlbnRMZWZ0ICsgd2guY3VycmVudFdpZHRoIDwgeE1heCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1vdmVYID0gLW91dHNpZGVSaWdodDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgb3V0c2lkZUxlZnQgPSAod2guY3VycmVudExlZnQgKyBmcmFtZVdpZHRoKSAtIHNoYXBlWDtcclxuICAgICAgICAgICAgICAgIGlmIChvdXRzaWRlTGVmdCA+IDAgJiYgd2guY3VycmVudExlZnQgPiB4TWluKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW92ZVggPSBvdXRzaWRlTGVmdDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgb3V0c2lkZUJvdHRvbSA9IHNoYXBlWSAtICh3aC5jdXJyZW50VG9wICsgd2guY3VycmVudEhlaWdodCAtIGZyYW1lV2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG91dHNpZGVCb3R0b20gPiAwICYmIHdoLmN1cnJlbnRUb3AgKyB3aC5jdXJyZW50SGVpZ2h0IDw9IHlNYXgpIHtcclxuICAgICAgICAgICAgICAgICAgICBtb3ZlWSA9IC1vdXRzaWRlQm90dG9tO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvdXRzaWRlVG9wID0gKHdoLmN1cnJlbnRUb3AgKyBmcmFtZVdpZHRoKSAtIHNoYXBlWTtcclxuICAgICAgICAgICAgICAgIGlmIChvdXRzaWRlVG9wID4gMCAmJiB3aC5jdXJyZW50VG9wID49IHlNaW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBtb3ZlWSA9IG91dHNpZGVUb3A7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVYICE9IDAgfHwgbW92ZVkgIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBtYXRyaXggPSBuZXcgUElYSS5NYXRyaXgoKS5jb3B5RnJvbSh3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtKTtcclxuICAgICAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLmlkZW50aXR5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS50cmFuc2xhdGUobW92ZVgsIG1vdmVZKTtcclxuICAgICAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLnByZXBlbmQobWF0cml4KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgd2guY29tcHV0ZUN1cnJlbnRXb3JsZEJvdW5kcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoLnNoYXBlc05vdEFmZmVjdGVkQnlXb3JsZFRyYW5zZm9ybXMuZm9yRWFjaCgoc2hhcGUpID0+IHNoYXBlLm1vdmUoLW1vdmVYLCAtbW92ZVkpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdWZXJzY2hpZWJ0IGRpZSBXZWx0IHNvLCBkYXNzIGRhcyDDvGJlcmdlYmVuZSBncmFwaGlzY2hlIE9iamVrdCAoc2hhcGUpIHNpY2h0YmFyIHdpcmQuIFZlcnNjaG9iZW4gd2lyZCBudXIsIHdlbm4gZGFzIE9iamVrdCB3ZW5pZ2VyIGFscyBmcmFtZVdpZHRoIHZvbSBSYW5kIGVudGZlcm50IGlzdCB1bmQgZGllIFdlbHQgbmljaHQgw7xiZXIgZGllIGdlZ2ViZW5lbiBLb29yZGluYXRlbiB4TWluLCB4TWF4LCB5TWluIHVuZCB5TWF4IGhpbmF1c3JhZ3QuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInJvdGF0ZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJhbmdsZUluRGVnXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInlcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhbmdsZTogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHk6IG51bWJlciA9IHBhcmFtZXRlcnNbM10udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYW5nbGVSYWQgPSAtYW5nbGUgLyAxODAgKiBNYXRoLlBJO1xyXG4gICAgICAgICAgICAgICAgbGV0IG1hdHJpeCA9IG5ldyBQSVhJLk1hdHJpeCgpLmNvcHlGcm9tKHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0pO1xyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS5pZGVudGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS50cmFuc2xhdGUoLXgsIC15KTtcclxuICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0ucm90YXRlKGFuZ2xlUmFkKTtcclxuICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0udHJhbnNsYXRlKHgsIHkpO1xyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS5wcmVwZW5kKG1hdHJpeCk7XHJcblxyXG4gICAgICAgICAgICAgICAgd2guY29tcHV0ZUN1cnJlbnRXb3JsZEJvdW5kcygpO1xyXG4gICAgICAgICAgICAgICAgd2guc2hhcGVzTm90QWZmZWN0ZWRCeVdvcmxkVHJhbnNmb3Jtcy5mb3JFYWNoKFxyXG4gICAgICAgICAgICAgICAgICAgIChzaGFwZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaGFwZS5yb3RhdGUoLWFuZ2xlLCB4LCB5KTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ1JvdGllcnQgZGllIFdlbHQgdW0gZGVuIGFuZ2VnZWJlbmVuIFdpbmtlbCBpbSBVcnplaWdlcnNpbm4uIERyZWhwdW5rdCBpc3QgZGVyIFB1bmt0ICh4L3kpLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzY2FsZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJmYWN0b3JcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ4XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGZhY3RvcjogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHk6IG51bWJlciA9IHBhcmFtZXRlcnNbM10udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBtYXRyaXggPSBuZXcgUElYSS5NYXRyaXgoKS5jb3B5RnJvbSh3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtKTtcclxuICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0uaWRlbnRpdHkoKTtcclxuICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0udHJhbnNsYXRlKC14LCAteSk7XHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLnNjYWxlKGZhY3RvciwgZmFjdG9yKTtcclxuICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0udHJhbnNsYXRlKHgsIHkpO1xyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS5wcmVwZW5kKG1hdHJpeCk7XHJcbiAgICAgICAgICAgICAgICB3aC5jb21wdXRlQ3VycmVudFdvcmxkQm91bmRzKCk7XHJcbiAgICAgICAgICAgICAgICB3aC5zaGFwZXNOb3RBZmZlY3RlZEJ5V29ybGRUcmFuc2Zvcm1zLmZvckVhY2goKHNoYXBlKSA9PiBzaGFwZS5zY2FsZSgxIC8gZmFjdG9yLCB4LCB5KSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdTdHJlY2t0IGRpZSBXZWx0IHVtIGRlbiBhbmdlZ2ViZW5lbiBGYWt0b3IuIFplbnRydW0gZGVyIFN0cmVja3VuZyBpc3QgKHgveSkuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNldENvb3JkaW5hdGVTeXN0ZW1cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwibGVmdFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInRvcFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIndpZHRoXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiaGVpZ2h0XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgbGVmdDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB0b3A6IG51bWJlciA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2lkdGg6IG51bWJlciA9IHBhcmFtZXRlcnNbM10udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgaGVpZ2h0OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzRdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdoOiBXb3JsZEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLmlkZW50aXR5KCk7ICAgICAvLyBjb29yZGluYXRlIHN5c3RlbSAoMC8wKSB0byAoaW5pdGlhbFdpZHRoL2luaXRpYWxIZWlnaHQpXHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLnRyYW5zbGF0ZSgtbGVmdCwgLXRvcCk7XHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLnNjYWxlKHdoLmluaXRpYWxXaWR0aCAvIHdpZHRoLCB3aC5pbml0aWFsSGVpZ2h0IC8gaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIHdoLmNvbXB1dGVDdXJyZW50V29ybGRCb3VuZHMoKTtcclxuICAgICAgICAgICAgICAgIHdoLnNoYXBlc05vdEFmZmVjdGVkQnlXb3JsZFRyYW5zZm9ybXMuZm9yRWFjaCgoc2hhcGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBzaGFwZS5zY2FsZSh3aWR0aCAvIHdoLmluaXRpYWxXaWR0aCwgbGVmdCwgdG9wKTtcclxuICAgICAgICAgICAgICAgICAgICBzaGFwZS5tb3ZlKGxlZnQsIHRvcCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ1N0cmVja3QgZGllIFdlbHQgdW0gZGVuIGFuZ2VnZWJlbmVuIEZha3Rvci4gWmVudHJ1bSBkZXIgU3RyZWNrdW5nIGlzdCAoeC95KS4nLCBmYWxzZSkpO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNldERlZmF1bHRHcm91cFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJncm91cFwiLCB0eXBlOiBncm91cFR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZ3JvdXA6IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdoOiBXb3JsZEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoLmRlZmF1bHRHcm91cCA9IGdyb3VwID09IG51bGwgPyBudWxsIDogZ3JvdXAuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnTGVndCBlaW5lIEdydXBwZSBmZXN0LCB6dSBkZXIgYWIgamV0enQgYWxsZSBuZXVlbiBPYmpla3RlIGF1dG9tYXRpc2NoIGhpbnp1Z2Vmw7xndCB3ZXJkZW4uIEZhbGxzIG51bGwgYW5nZWdlYmVuIHdpcmQsIHdlcmRlbiBuZXVlIE9iamVrdGUgenUga2VpbmVyIEdydXBwZSBhdXRvbWF0aXNjaCBoaW56dWdlZsO8Z3QuJywgZmFsc2UpKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJnZXREZWZhdWx0R3JvdXBcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBncm91cFR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdoOiBXb3JsZEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB3aC5nZXREZWZhdWx0R3JvdXAoKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0dpYnQgZGllIEdydXBwZSB6dXLDvGNrLCB6dSBkZXIgYWt0dWVsbCBhbGxlIG5ldWVuIE9iamVrdGUgYXV0b21hdGlzY2ggaGluenVnZWbDvGd0IHdlcmRlbi4gRmFsbHMgZ2VyYWRlIGtlaW5lIGRlZmF1bHRHcm91cCBmZXN0Z2VsZWd0IGlzdCwgd2lyZCBudWxsIHp1csO8Y2tnZWdlYmVuLicsIGZhbHNlKSk7XHJcblxyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiYWRkTW91c2VMaXN0ZW5lclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJsaXN0ZW5lclwiLCB0eXBlOiBtb3VzZUxpc3RlbmVyVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBsaXN0ZW5lcjogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgd2guYWRkTW91c2VMaXN0ZW5lcihsaXN0ZW5lcik7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdGw7xndCBlaW5lbiBuZXVlbiBNb3VzZUxpc3RlbmVyIGhpbnp1LCBkZXNzZW4gTWV0aG9kZW4gYmVpIE1hdXNlcmVpZ25pc3NlbiBhdWZnZXJ1ZmVuIHdlcmRlbi4nLCBmYWxzZSkpO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImdldFdpZHRoXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQod2guY3VycmVudFdpZHRoKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0dpYnQgZGllIFwiQnJlaXRlXCIgZGVzIEdyYWZpa2JlcmVpY2hzIHp1csO8Y2ssIGdlbmF1ZXI6IGRpZSB4LUtvb3JkaW5hdGUgYW0gcmVjaHRlbiBSYW5kLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJnZXRIZWlnaHRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB3aDogV29ybGRIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJXb3JsZFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh3aC5jdXJyZW50SGVpZ2h0KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0dpYnQgZGllIFwiSMO2aGVcIiBkZXMgR3JhZmlrYmVyZWljaHMgenVyw7xjaywgZ2VuYXVlcjogZGllIHktS29vcmRpbmF0ZSBhbSB1bnRlcmVuIFJhbmQuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImdldFRvcFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGludFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdoOiBXb3JsZEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHdoLmN1cnJlbnRUb3ApO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnR2lidCBkaWUgeS1Lb29yZGluYXRlIGRlciBsaW5rZW4gb2JlcmVuIEVja2UgenVyw7xjay4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0TGVmdFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGludFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdoOiBXb3JsZEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHdoLmN1cnJlbnRMZWZ0KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0dpYnQgZGllIHgtS29vcmRpbmF0ZSBkZXIgbGlua2VuIG9iZXJlbiBFY2tlIHp1csO8Y2suJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNldEN1cnNvclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJjdXJzb3JcIiwgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdoOiBXb3JsZEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGN1cnNvcjogc3RyaW5nID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICB3aC5zZXRDdXJzb3IoY3Vyc29yKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ8OEbmRlcnQgZGllIEZvcm0gZGVzIE1hdXNjdXJzb3JzIGltIGdlc2FtdGVuIEdyYWZpa2JlcmVpY2guIE3DtmdpY2hlIFdlcnRlOiBzaWVoZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9kZS9kb2NzL1dlYi9DU1MvY3Vyc29yLicsIGZhbHNlKSk7XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRXb3JsZEhlbHBlcih3b3JsZE9iamVjdDogUnVudGltZU9iamVjdCwgYnJlaXRlOiBudW1iZXIgPSA4MDAsIGjDtmhlOiBudW1iZXIgPSA2MDApOiBXb3JsZEhlbHBlciB7XHJcblxyXG4gICAgICAgIGxldCB3aCA9IHRoaXMubW9kdWxlPy5tYWluPy5nZXRJbnRlcnByZXRlcigpPy53b3JsZEhlbHBlcjtcclxuXHJcblxyXG4gICAgICAgIGlmICh3aCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmICh3aC53aWR0aCAhPSBicmVpdGUgfHwgd2guaGVpZ2h0ICE9IGjDtmhlKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHJhdGlvOiBudW1iZXIgPSBNYXRoLnJvdW5kKGjDtmhlIC8gYnJlaXRlICogMTAwKTtcclxuICAgICAgICAgICAgICAgIHdoLiRjb250YWluZXJPdXRlci5jc3MoJ3BhZGRpbmctYm90dG9tJywgcmF0aW8gKyBcIiVcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS5zY2FsZSh3aC53aWR0aCAvIGJyZWl0ZSwgd2gud2lkdGggLyBow7ZoZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2R1bGUubWFpbi5nZXRSaWdodERpdigpPy5hZGp1c3RXaWR0aFRvV29ybGQoKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB3aDtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgV29ybGRIZWxwZXIoYnJlaXRlLCBow7ZoZSwgdGhpcy5tb2R1bGUsIHdvcmxkT2JqZWN0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIE1vdXNlTGlzdGVuZXJTaGFwZURhdGEgPSB7XHJcbiAgICBzaGFwZUhlbHBlcjogU2hhcGVIZWxwZXIsXHJcbiAgICB0eXBlczogeyBbdHlwZTogc3RyaW5nXTogYm9vbGVhbiB9LFxyXG4gICAgbWV0aG9kczogeyBbdHlwZTogc3RyaW5nXTogTWV0aG9kIH1cclxufVxyXG5cclxuZXhwb3J0IHR5cGUgTW91c2VMaXN0ZW5lckRhdGEgPSB7XHJcbiAgICBsaXN0ZW5lcjogUnVudGltZU9iamVjdCxcclxuICAgIHR5cGVzOiB7IFt0eXBlOiBzdHJpbmddOiBib29sZWFuIH0sXHJcbiAgICBtZXRob2RzOiB7IFt0eXBlOiBzdHJpbmddOiBNZXRob2QgfVxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBBY3RvckRhdGEgPSB7XHJcbiAgICBhY3RvckhlbHBlcjogQWN0b3JIZWxwZXIsXHJcbiAgICBtZXRob2Q6IE1ldGhvZFxyXG59XHJcblxyXG4vKipcclxuICogQHNlZSBodHRwczovL2phdmFzY3JpcHQucGxhaW5lbmdsaXNoLmlvL2luc2lkZS1waXhpanMtcHJvamVjdGlvbi1zeXN0ZW0tODk3ODcyYTNkYzE3XHJcbiAqL1xyXG5jbGFzcyBXb3JsZENvbnRhaW5lciBleHRlbmRzIFBJWEkuQ29udGFpbmVyIHtcclxuXHJcbiAgICBwcm9qZWN0aW9uVHJhbnNmb3JtOiBQSVhJLk1hdHJpeDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgc291cmNlRnJhbWU6IFBJWEkuUmVjdGFuZ2xlLCBwdWJsaWMgZGVzdGluYXRpb25GcmFtZTogUElYSS5SZWN0YW5nbGUpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMucHJvamVjdGlvblRyYW5zZm9ybSA9IG5ldyBQSVhJLk1hdHJpeCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJlbmRlcihyZW5kZXJlcjogUElYSS5SZW5kZXJlcikge1xyXG5cclxuICAgICAgICByZW5kZXJlci5wcm9qZWN0aW9uLnByb2plY3Rpb25NYXRyaXguaWRlbnRpdHkoKTtcclxuICAgICAgICByZW5kZXJlci5wcm9qZWN0aW9uLnRyYW5zZm9ybSA9IHRoaXMucHJvamVjdGlvblRyYW5zZm9ybTtcclxuICAgICAgICByZW5kZXJlci5yZW5kZXJUZXh0dXJlLmJpbmQoXHJcbiAgICAgICAgICAgIHJlbmRlcmVyLnJlbmRlclRleHR1cmUuY3VycmVudCxcclxuICAgICAgICAgICAgdGhpcy5zb3VyY2VGcmFtZSxcclxuICAgICAgICAgICAgdGhpcy5kZXN0aW5hdGlvbkZyYW1lLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgc3VwZXIucmVuZGVyKHJlbmRlcmVyKTtcclxuICAgICAgICByZW5kZXJlci5iYXRjaC5mbHVzaCgpO1xyXG5cclxuICAgICAgICByZW5kZXJlci5iYXRjaC5mbHVzaCgpO1xyXG4gICAgICAgIHJlbmRlcmVyLnByb2plY3Rpb24ucHJvamVjdGlvbk1hdHJpeC5pZGVudGl0eSgpO1xyXG4gICAgICAgIHJlbmRlcmVyLnByb2plY3Rpb24udHJhbnNmb3JtID0gbnVsbDtcclxuICAgICAgICByZW5kZXJlci5yZW5kZXJUZXh0dXJlLmJpbmQobnVsbCk7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5leHBvcnQgY2xhc3MgV29ybGRIZWxwZXIge1xyXG5cclxuICAgICRjb250YWluZXJPdXRlcjogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuICAgICRjb250YWluZXJJbm5lcjogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuICAgIGFwcDogUElYSS5BcHBsaWNhdGlvbjtcclxuICAgIHN0YWdlOiBXb3JsZENvbnRhaW5lcjtcclxuXHJcbiAgICBhY3RBY3RvcnM6IEFjdG9yRGF0YVtdID0gW107XHJcbiAgICBrZXlQcmVzc2VkQWN0b3JzOiBBY3RvckRhdGFbXSA9IFtdO1xyXG4gICAga2V5VXBBY3RvcnM6IEFjdG9yRGF0YVtdID0gW107XHJcbiAgICBrZXlEb3duQWN0b3JzOiBBY3RvckRhdGFbXSA9IFtdO1xyXG4gICAgYWN0b3JIZWxwZXJzVG9EZXN0cm95OiBBY3RvckhlbHBlcltdID0gW107XHJcblxyXG4gICAgbW91c2VMaXN0ZW5lclNoYXBlczogTW91c2VMaXN0ZW5lclNoYXBlRGF0YVtdID0gW107XHJcbiAgICBtb3VzZUxpc3RlbmVyczogTW91c2VMaXN0ZW5lckRhdGFbXSA9IFtdO1xyXG5cclxuICAgIGludGVycHJldGVyOiBJbnRlcnByZXRlcjtcclxuICAgIGFjdG9yc0ZpbmlzaGVkOiBib29sZWFuID0gdHJ1ZTtcclxuICAgIHN1bW1lZERlbHRhOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGRlZmF1bHRHcm91cDogR3JvdXBIZWxwZXI7XHJcblxyXG4gICAgaW5pdGlhbFdpZHRoOiBudW1iZXI7XHJcbiAgICBpbml0aWFsSGVpZ2h0OiBudW1iZXI7XHJcblxyXG4gICAgJGNvb3JkaW5hdGVEaXY6IEpRdWVyeTxIVE1MRWxlbWVudD47XHJcblxyXG4gICAgcHVibGljIHNjYWxlZFRleHR1cmVzOiB7IFtuYW1lOiBzdHJpbmddOiBQSVhJLlRleHR1cmUgfSA9IHt9O1xyXG5cclxuXHJcbiAgICBzaGFwZXM6IFNoYXBlSGVscGVyW10gPSBbXTsgICAgIC8vIGFsbCBzaGFwZXMgaW5jbC4gZ3JvdXBzIHRoYXQgYXJlbid0IHBhcnQgb2YgYSBncm91cFxyXG5cclxuICAgIGN1cnJlbnRMZWZ0OiBudW1iZXI7XHJcbiAgICBjdXJyZW50VG9wOiBudW1iZXI7XHJcbiAgICBjdXJyZW50V2lkdGg6IG51bWJlcjtcclxuICAgIGN1cnJlbnRIZWlnaHQ6IG51bWJlcjtcclxuXHJcbiAgICBzaGFwZXNOb3RBZmZlY3RlZEJ5V29ybGRUcmFuc2Zvcm1zOiBTaGFwZUhlbHBlcltdID0gW107XHJcblxyXG4gICAgZ2xvYmFsU2NhbGU6IG51bWJlcjtcclxuXHJcbiAgICByb2JvdFdvcmxkSGVscGVyOiBhbnk7XHJcblxyXG4gICAgdGlja2VyRnVuY3Rpb246ICh0OiBudW1iZXIpID0+IHZvaWQ7XHJcblxyXG4gICAgY2xlYXJBY3Rvckxpc3RzKCkge1xyXG4gICAgICAgIHRoaXMuYWN0QWN0b3JzID0gW107XHJcbiAgICAgICAgdGhpcy5rZXlQcmVzc2VkQWN0b3JzID0gW107XHJcbiAgICAgICAgdGhpcy5rZXlVcEFjdG9ycyA9IFtdO1xyXG4gICAgICAgIHRoaXMua2V5RG93bkFjdG9ycyA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB3aWR0aDogbnVtYmVyLCBwdWJsaWMgaGVpZ2h0OiBudW1iZXIsIHByaXZhdGUgbW9kdWxlOiBNb2R1bGUsIHB1YmxpYyB3b3JsZDogUnVudGltZU9iamVjdCkge1xyXG5cclxuICAgICAgICBQSVhJLnNldHRpbmdzLlNDQUxFX01PREUgPSBQSVhJLlNDQUxFX01PREVTLk5FQVJFU1Q7XHJcbiAgICAgICAgUElYSS5zZXR0aW5ncy5UQVJHRVRfRlBNUyA9IDMwLjAgLyAxMDAwLjA7XHJcblxyXG4gICAgICAgIHRoaXMuZ2xvYmFsU2NhbGUgPSAxO1xyXG5cclxuICAgICAgICB3aGlsZSAoaGVpZ2h0ID4gMTAwMCB8fCB3aWR0aCA+IDIwMDApIHtcclxuICAgICAgICAgICAgdGhpcy5nbG9iYWxTY2FsZSAqPSAyO1xyXG4gICAgICAgICAgICBoZWlnaHQgLz0gMjtcclxuICAgICAgICAgICAgd2lkdGggLz0gMjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuaW5pdGlhbEhlaWdodCA9IHRoaXMuaGVpZ2h0O1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbFdpZHRoID0gdGhpcy53aWR0aDtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50TGVmdCA9IDA7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50VG9wID0gMDtcclxuICAgICAgICB0aGlzLmN1cnJlbnRXaWR0aCA9IHRoaXMud2lkdGg7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50SGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XHJcblxyXG4gICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIgPSB0aGlzLm1vZHVsZT8ubWFpbj8uZ2V0SW50ZXJwcmV0ZXIoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW50ZXJwcmV0ZXIucHJvY2Vzc2luZ0hlbHBlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJEaWUgaGVya8O2bW1saWNoZSBHcmFmaWthdXNnYWJlIGthbm4gbmljaHQgenVzYW1tZW4gbWl0IFByb2Nlc3NpbmcgZ2VudXR6dCB3ZXJkZW4uXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW50ZXJwcmV0ZXIud29ybGRIZWxwZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRXMgZGFyZiBudXIgZWluIFdvcmxkLU9iamVrdCBpbnN0YW56aWVydCB3ZXJkZW4uXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlci53b3JsZEhlbHBlciA9IHRoaXM7XHJcblxyXG4gICAgICAgIGxldCAkZ3JhcGhpY3NEaXYgPSB0aGlzLm1vZHVsZS5tYWluLmdldEludGVycHJldGVyKCkucHJpbnRNYW5hZ2VyLmdldEdyYXBoaWNzRGl2KCk7XHJcbiAgICAgICAgdGhpcy4kY29vcmRpbmF0ZURpdiA9IHRoaXMubW9kdWxlLm1haW4uZ2V0UmlnaHREaXYoKS4kcmlnaHREaXYuZmluZChcIi5qb19jb29yZGluYXRlc1wiKTtcclxuXHJcbiAgICAgICAgbGV0IGYgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCAkam9fdGFicyA9ICRncmFwaGljc0Rpdi5wYXJlbnRzKFwiLmpvX3RhYnNcIik7XHJcbiAgICAgICAgICAgIGlmICgkam9fdGFicy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgJGpvX3RhYnMgPSAkZ3JhcGhpY3NEaXYucGFyZW50cyhcIi5qb2VfcmlnaHREaXZJbm5lclwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgbWF4V2lkdGg6IG51bWJlciA9ICRqb190YWJzLndpZHRoKCk7XHJcbiAgICAgICAgICAgIGxldCBtYXhIZWlnaHQ6IG51bWJlciA9ICRqb190YWJzLmhlaWdodCgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGhlaWdodCAvIHdpZHRoID4gbWF4SGVpZ2h0IC8gbWF4V2lkdGgpIHtcclxuICAgICAgICAgICAgICAgICRncmFwaGljc0Rpdi5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICd3aWR0aCc6IHdpZHRoIC8gaGVpZ2h0ICogbWF4SGVpZ2h0ICsgXCJweFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICdoZWlnaHQnOiBtYXhIZWlnaHQgKyBcInB4XCIsXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgJGdyYXBoaWNzRGl2LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgJ2hlaWdodCc6IGhlaWdodCAvIHdpZHRoICogbWF4V2lkdGggKyBcInB4XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3dpZHRoJzogbWF4V2lkdGggKyBcInB4XCIsXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJGdyYXBoaWNzRGl2Lm9mZignc2l6ZUNoYW5nZWQnKTtcclxuICAgICAgICAkZ3JhcGhpY3NEaXYub24oJ3NpemVDaGFuZ2VkJywgZik7XHJcblxyXG4gICAgICAgIGYoKTtcclxuXHJcbiAgICAgICAgdGhpcy4kY29udGFpbmVyT3V0ZXIgPSBqUXVlcnkoJzxkaXY+PC9kaXY+Jyk7XHJcbiAgICAgICAgdGhpcy4kY29udGFpbmVySW5uZXIgPSBqUXVlcnkoJzxkaXY+PC9kaXY+Jyk7XHJcbiAgICAgICAgdGhpcy4kY29udGFpbmVyT3V0ZXIuYXBwZW5kKHRoaXMuJGNvbnRhaW5lcklubmVyKTtcclxuXHJcbiAgICAgICAgJGdyYXBoaWNzRGl2LmFwcGVuZCh0aGlzLiRjb250YWluZXJPdXRlcik7XHJcblxyXG4gICAgICAgICRncmFwaGljc0Rpdi5zaG93KCk7XHJcblxyXG4gICAgICAgICRncmFwaGljc0RpdlswXS5vbmNvbnRleHRtZW51ID0gZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm1vZHVsZS5tYWluLnBpeGlBcHApIHtcclxuICAgICAgICAgICAgdGhpcy5hcHAgPSB0aGlzLm1vZHVsZS5tYWluLnBpeGlBcHA7XHJcbiAgICAgICAgICAgIHRoaXMuYXBwLnJlbmRlcmVyLnJlc2l6ZSh3aWR0aCwgaGVpZ2h0KTtcclxuICAgICAgICAgICAgdGhpcy5hcHAucmVuZGVyZXIuYmFja2dyb3VuZENvbG9yID0gMHgwO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXBwID0gbmV3IFBJWEkuQXBwbGljYXRpb24oe1xyXG4gICAgICAgICAgICAgICAgYW50aWFsaWFzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgd2lkdGg6IHdpZHRoLCBoZWlnaHQ6IGhlaWdodCxcclxuICAgICAgICAgICAgICAgIC8vcmVzaXplVG86ICRjb250YWluZXJJbm5lclswXVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5tb2R1bGUubWFpbi5waXhpQXBwID0gdGhpcy5hcHA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIHRoaXMudGlja2VyRnVuY3Rpb24gPSAoZGVsdGEpID0+IHtcclxuICAgICAgICAgICAgdGhhdC50aWNrKFBJWEkuVGlja2VyLnNoYXJlZC5lbGFwc2VkTVMpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuYXBwLnRpY2tlci5hZGQodGhpcy50aWNrZXJGdW5jdGlvbik7XHJcbiAgICAgICAgdGhpcy5hcHAudGlja2VyLm1heEZQUyA9IDMwO1xyXG5cclxuICAgICAgICB0aGlzLmludGVycHJldGVyLnRpbWVyRXh0ZXJuID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgbGV0IHNvdXJjZUZyYW1lID0gbmV3IFBJWEkuUmVjdGFuZ2xlKDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcclxuICAgICAgICBsZXQgZGVzdGluYXRpb25GcmFtZSA9IG5ldyBQSVhJLlJlY3RhbmdsZSgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcclxuICAgICAgICB0aGlzLnN0YWdlID0gbmV3IFdvcmxkQ29udGFpbmVyKHNvdXJjZUZyYW1lLCBkZXN0aW5hdGlvbkZyYW1lKTtcclxuICAgICAgICB0aGlzLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0gPSBuZXcgUElYSS5NYXRyaXgoKTtcclxuXHJcbiAgICAgICAgdGhpcy5hcHAuc3RhZ2UuYWRkQ2hpbGQodGhpcy5zdGFnZSk7XHJcblxyXG4gICAgICAgIHRoaXMuJGNvbnRhaW5lcklubmVyLmFwcGVuZCh0aGlzLmFwcC52aWV3KTtcclxuXHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlci5rZXlib2FyZFRvb2wua2V5UHJlc3NlZENhbGxiYWNrcy5wdXNoKChrZXkpID0+IHtcclxuICAgICAgICAgICAgZm9yIChsZXQga3BhIG9mIHRoYXQua2V5UHJlc3NlZEFjdG9ycykge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoYXQucnVuQWN0b3JXaGVuS2V5RXZlbnQoa3BhLCBrZXkpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmludGVycHJldGVyLmtleWJvYXJkVG9vbC5rZXlVcENhbGxiYWNrcy5wdXNoKChrZXkpID0+IHtcclxuICAgICAgICAgICAgZm9yIChsZXQga3BhIG9mIHRoYXQua2V5VXBBY3RvcnMpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGF0LnJ1bkFjdG9yV2hlbktleUV2ZW50KGtwYSwga2V5KTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlci5rZXlib2FyZFRvb2wua2V5RG93bkNhbGxiYWNrcy5wdXNoKChrZXkpID0+IHtcclxuICAgICAgICAgICAgZm9yIChsZXQga3BhIG9mIHRoYXQua2V5RG93bkFjdG9ycykge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoYXQucnVuQWN0b3JXaGVuS2V5RXZlbnQoa3BhLCBrZXkpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICAgICAgZm9yIChsZXQgbGlzdGVuZXJUeXBlIG9mIFtcIm1vdXNldXBcIiwgXCJtb3VzZWRvd25cIiwgXCJtb3VzZW1vdmVcIiwgXCJtb3VzZWVudGVyXCIsIFwibW91c2VsZWF2ZVwiXSkge1xyXG5cclxuICAgICAgICAgICAgbGV0IGV2ZW50VHlwZSA9IGxpc3RlbmVyVHlwZTtcclxuICAgICAgICAgICAgaWYgKHdpbmRvdy5Qb2ludGVyRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50VHlwZSA9IGV2ZW50VHlwZS5yZXBsYWNlKCdtb3VzZScsICdwb2ludGVyJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuJGNvbnRhaW5lcklubmVyLm9uKGV2ZW50VHlwZSwgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCB4ID0gd2lkdGggKiBlLm9mZnNldFggLyB0aGlzLiRjb250YWluZXJJbm5lci53aWR0aCgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHkgPSBoZWlnaHQgKiBlLm9mZnNldFkgLyB0aGlzLiRjb250YWluZXJJbm5lci5oZWlnaHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcCA9IG5ldyBQSVhJLlBvaW50KHggKiB0aGlzLmdsb2JhbFNjYWxlLCB5ICogdGhpcy5nbG9iYWxTY2FsZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0uYXBwbHlJbnZlcnNlKHAsIHApO1xyXG4gICAgICAgICAgICAgICAgeCA9IHAueDtcclxuICAgICAgICAgICAgICAgIHkgPSBwLnk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhhdC5vbk1vdXNlRXZlbnQobGlzdGVuZXJUeXBlLCB4LCB5LCBlLmJ1dHRvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbGlzdGVuZXIgb2YgdGhpcy5tb3VzZUxpc3RlbmVycykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lci50eXBlc1tsaXN0ZW5lclR5cGVdICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZva2VNb3VzZUxpc3RlbmVyKGxpc3RlbmVyLCBsaXN0ZW5lclR5cGUsIHgsIHksIGUuYnV0dG9uKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyVHlwZSA9PSBcIm1vdXNlZG93blwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGduZ0VyZWlnbmlzYmVoYW5kbHVuZyA9IHRoaXMuaW50ZXJwcmV0ZXIuZ25nRXJlaWduaXNiZWhhbmRsdW5nSGVscGVyO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChnbmdFcmVpZ25pc2JlaGFuZGx1bmcgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnbmdFcmVpZ25pc2JlaGFuZGx1bmcuaGFuZGxlTW91c2VDbGlja2VkRXZlbnQoeCwgeSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgJGNvb3JkaW5hdGVEaXYgPSB0aGlzLiRjb29yZGluYXRlRGl2O1xyXG5cclxuICAgICAgICBsZXQgbW91c2VQb2ludGVyID0gd2luZG93LlBvaW50ZXJFdmVudCA/IFwicG9pbnRlclwiIDogXCJtb3VzZVwiO1xyXG5cclxuICAgICAgICB0aGlzLiRjb250YWluZXJJbm5lci5vbihtb3VzZVBvaW50ZXIgKyBcIm1vdmVcIiwgKGUpID0+IHtcclxuICAgICAgICAgICAgbGV0IHggPSB3aWR0aCAqIGUub2Zmc2V0WCAvIHRoaXMuJGNvbnRhaW5lcklubmVyLndpZHRoKCk7XHJcbiAgICAgICAgICAgIGxldCB5ID0gaGVpZ2h0ICogZS5vZmZzZXRZIC8gdGhpcy4kY29udGFpbmVySW5uZXIuaGVpZ2h0KCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgcCA9IG5ldyBQSVhJLlBvaW50KHggKiB0aGlzLmdsb2JhbFNjYWxlLCB5ICogdGhpcy5nbG9iYWxTY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS5hcHBseUludmVyc2UocCwgcCk7XHJcbiAgICAgICAgICAgIHggPSBNYXRoLnJvdW5kKHAueCk7XHJcbiAgICAgICAgICAgIHkgPSBNYXRoLnJvdW5kKHAueSk7XHJcbiAgICAgICAgICAgICRjb29yZGluYXRlRGl2LnRleHQoYCgke3h9LyR7eX0pYCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuJGNvbnRhaW5lcklubmVyLm9uKG1vdXNlUG9pbnRlciArIFwiZW50ZXJcIiwgKGUpID0+IHtcclxuICAgICAgICAgICAgJGNvb3JkaW5hdGVEaXYuc2hvdygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLiRjb250YWluZXJJbm5lci5vbihtb3VzZVBvaW50ZXIgKyBcImxlYXZlXCIsIChlKSA9PiB7XHJcbiAgICAgICAgICAgICRjb29yZGluYXRlRGl2LmhpZGUoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5tb2R1bGUubWFpbi5nZXRSaWdodERpdigpPy5hZGp1c3RXaWR0aFRvV29ybGQoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY29tcHV0ZUN1cnJlbnRXb3JsZEJvdW5kcygpIHtcclxuXHJcbiAgICAgICAgbGV0IHAxOiBQSVhJLlBvaW50ID0gbmV3IFBJWEkuUG9pbnQoMCwgMCk7XHJcbiAgICAgICAgdGhpcy5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLmFwcGx5SW52ZXJzZShwMSwgcDEpO1xyXG5cclxuICAgICAgICBsZXQgcDI6IFBJWEkuUG9pbnQgPSBuZXcgUElYSS5Qb2ludCh0aGlzLmluaXRpYWxXaWR0aCwgdGhpcy5pbml0aWFsSGVpZ2h0KTtcclxuICAgICAgICB0aGlzLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0uYXBwbHlJbnZlcnNlKHAyLCBwMik7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudExlZnQgPSBwMS54O1xyXG4gICAgICAgIHRoaXMuY3VycmVudFRvcCA9IHAxLnk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50V2lkdGggPSBNYXRoLmFicyhwMi54IC0gcDEueCk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50SGVpZ2h0ID0gTWF0aC5hYnMocDIueSAtIHAxLnkpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBoYXNBY3RvcnMoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWN0QWN0b3JzLmxlbmd0aCA+IDAgfHwgdGhpcy5rZXlQcmVzc2VkQWN0b3JzLmxlbmd0aCA+IDAgfHwgdGhpcy5rZXlVcEFjdG9ycy5sZW5ndGggPiAwXHJcbiAgICAgICAgICAgIHx8IHRoaXMua2V5RG93bkFjdG9ycy5sZW5ndGggPiAwIHx8IHRoaXMubW91c2VMaXN0ZW5lcnMubGVuZ3RoID4gMCB8fCB0aGlzLm1vdXNlTGlzdGVuZXJTaGFwZXMubGVuZ3RoID4gMDtcclxuICAgIH1cclxuXHJcbiAgICBzZXRBbGxIaXRwb2x5Z29uc0RpcnR5KCkge1xyXG4gICAgICAgIGZvciAobGV0IHNoYXBlIG9mIHRoaXMuc2hhcGVzKSB7XHJcbiAgICAgICAgICAgIHNoYXBlLnNldEhpdFBvbHlnb25EaXJ0eSh0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2V0Q3Vyc29yKGN1cnNvcjogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy4kY29udGFpbmVySW5uZXIuY3NzKCdjdXJzb3InLCBjdXJzb3IpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhY3RvcnNOb3RGaW5pc2hlZDogbnVtYmVyID0gMDtcclxuICAgIHRpY2tzOiBudW1iZXIgPSAwO1xyXG4gICAgZGVsdGFTdW06IG51bWJlciA9IDA7XHJcblxyXG4gICAgc3ByaXRlQW5pbWF0aW9uczogU3ByaXRlSGVscGVyW10gPSBbXTtcclxuXHJcbiAgICB0aWNrKGRlbHRhOiBhbnkpIHtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW50ZXJwcmV0ZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuaW50ZXJwcmV0ZXIuc3RhdGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSW50ZXJwcmV0ZXJTdGF0ZS5ydW5uaW5nOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3VtbWVkRGVsdGEgKz0gZGVsdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgc3ByaXRlSGVscGVyIG9mIHRoaXMuc3ByaXRlQW5pbWF0aW9ucykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzcHJpdGVIZWxwZXIudGljayhkZWx0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuYWN0b3JzRmluaXNoZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hY3RvcnNOb3RGaW5pc2hlZCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmludGVycHJldGVyLnBhdXNlVW50aWwgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBmaXJzdDogYm9vbGVhbiA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGFjdG9yRGF0YSBvZiB0aGlzLmFjdEFjdG9ycykge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFjdG9ySGVscGVyID0gYWN0b3JEYXRhLmFjdG9ySGVscGVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3JIZWxwZXIudGltZXJQYXVzZWQgfHwgYWN0b3JIZWxwZXIuaXNEZXN0cm95ZWQpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByb2dyYW0gPSBhY3RvckRhdGEubWV0aG9kPy5wcm9ncmFtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJ1bkFjdG9yKGZpcnN0LCBhY3RvckRhdGEsIHRoaXMuc3VtbWVkRGVsdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvZ3JhbSAhPSBudWxsICYmICFhY3RvckRhdGEuYWN0b3JIZWxwZXIuaXNEZXN0cm95ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdG9yc0ZpbmlzaGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEludGVycHJldGVyU3RhdGUuZG9uZTpcclxuICAgICAgICAgICAgICAgIGNhc2UgSW50ZXJwcmV0ZXJTdGF0ZS5lcnJvcjpcclxuICAgICAgICAgICAgICAgIGNhc2UgSW50ZXJwcmV0ZXJTdGF0ZS5ub3RfaW5pdGlhbGl6ZWQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhckFjdG9yTGlzdHMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3VtbWVkRGVsdGEgPSAwO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaW50ZXJwcmV0ZXIuc3RhdGUgPT0gSW50ZXJwcmV0ZXJTdGF0ZS5ydW5uaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3RBY3RvcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGltZXJGdW5jdGlvbigzMy4zMywgdHJ1ZSwgMC41KTtcclxuICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pbnRlcnByZXRlci5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLnJ1bm5pbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aW1lclN0b3BwZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aW1lckZ1bmN0aW9uKDMzLjMzLCBmYWxzZSwgMC4wOCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRpbWVyRnVuY3Rpb24oMzMuMzMsIGZhbHNlLCAwLjcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3aGlsZSAodGhpcy5hY3RvckhlbHBlcnNUb0Rlc3Ryb3kubGVuZ3RoID4gMCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IGFjdG9ySGVscGVyID0gdGhpcy5hY3RvckhlbHBlcnNUb0Rlc3Ryb3kucG9wKCk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBhY3Rvckxpc3Qgb2YgW3RoaXMua2V5UHJlc3NlZEFjdG9ycywgdGhpcy5rZXlVcEFjdG9ycywgdGhpcy5rZXlEb3duQWN0b3JzXSkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhY3Rvckxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3JMaXN0W2ldLmFjdG9ySGVscGVyID09PSBhY3RvckhlbHBlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rvckxpc3Quc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm1vdXNlTGlzdGVuZXJTaGFwZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1vdXNlTGlzdGVuZXJTaGFwZXNbaV0uc2hhcGVIZWxwZXIgPT09IGFjdG9ySGVscGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3VzZUxpc3RlbmVyU2hhcGVzLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5hY3RBY3RvcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdEFjdG9yc1tpXS5hY3RvckhlbHBlciA9PT0gYWN0b3JIZWxwZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdEFjdG9ycy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaS0tO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZGlzcGxheU9iamVjdCA9ICg8U2hhcGVIZWxwZXI+YWN0b3JIZWxwZXIpLmRpc3BsYXlPYmplY3Q7XHJcbiAgICAgICAgICAgIGlmIChkaXNwbGF5T2JqZWN0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGRpc3BsYXlPYmplY3QuZGVzdHJveSgpO1xyXG4gICAgICAgICAgICAgICAgKDxTaGFwZUhlbHBlcj5hY3RvckhlbHBlcikuZGlzcGxheU9iamVjdCA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRCYWNrZ3JvdW5kQ29sb3IoY29sb3I6IHN0cmluZyB8IG51bWJlcikge1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIGNvbG9yID09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgbGV0IGMgPSBDb2xvckhlbHBlci5wYXJzZUNvbG9yVG9PcGVuR0woY29sb3IpO1xyXG4gICAgICAgICAgICB0aGlzLmFwcC5yZW5kZXJlci5iYWNrZ3JvdW5kQ29sb3IgPSBjLmNvbG9yO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXBwLnJlbmRlcmVyLmJhY2tncm91bmRDb2xvciA9IGNvbG9yO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcnVuQWN0b3JXaGVuS2V5RXZlbnQoYWN0b3JEYXRhOiBBY3RvckRhdGEsIGtleTogc3RyaW5nKSB7XHJcblxyXG4gICAgICAgIGxldCBwcm9ncmFtID0gYWN0b3JEYXRhLm1ldGhvZD8ucHJvZ3JhbTtcclxuICAgICAgICBsZXQgaW52b2tlID0gYWN0b3JEYXRhLm1ldGhvZD8uaW52b2tlO1xyXG5cclxuICAgICAgICBsZXQgcnRvID0gYWN0b3JEYXRhLmFjdG9ySGVscGVyLnJ1bnRpbWVPYmplY3Q7XHJcblxyXG4gICAgICAgIGxldCBzdGFja0VsZW1lbnRzOiBWYWx1ZVtdID0gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBydG8uY2xhc3MsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogcnRvXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZToga2V5XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdO1xyXG5cclxuICAgICAgICBpZiAocHJvZ3JhbSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIucnVuVGltZXIoYWN0b3JEYXRhLm1ldGhvZCwgc3RhY2tFbGVtZW50cywgbnVsbCwgZmFsc2UpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoaW52b2tlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaW52b2tlKFtdKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHJ1bkFjdG9yKGZpcnN0OiBib29sZWFuLCBhY3RvckRhdGE6IEFjdG9yRGF0YSwgZGVsdGE6IG51bWJlcikge1xyXG5cclxuICAgICAgICBsZXQgcHJvZ3JhbSA9IGFjdG9yRGF0YS5tZXRob2Q/LnByb2dyYW07XHJcbiAgICAgICAgbGV0IGludm9rZSA9IGFjdG9yRGF0YS5tZXRob2Q/Lmludm9rZTtcclxuXHJcbiAgICAgICAgbGV0IHJ0byA9IGFjdG9yRGF0YS5hY3RvckhlbHBlci5ydW50aW1lT2JqZWN0O1xyXG5cclxuICAgICAgICBsZXQgc3RhY2tFbGVtZW50czogVmFsdWVbXSA9IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogcnRvLmNsYXNzLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHJ0b1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcblxyXG4gICAgICAgIGlmIChhY3RvckRhdGEubWV0aG9kLmdldFBhcmFtZXRlckNvdW50KCkgPiAwKSB7XHJcbiAgICAgICAgICAgIHN0YWNrRWxlbWVudHMucHVzaChcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBkZWx0YVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgaWYgKHByb2dyYW0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnJ1blRpbWVyKGFjdG9yRGF0YS5tZXRob2QsIHN0YWNrRWxlbWVudHMsIGZpcnN0ID8gKGludGVycHJldGVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmFjdG9yc0ZpbmlzaGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGludGVycHJldGVyLnRpbWVyU3RvcHBlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gOiBudWxsLCB0cnVlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGludm9rZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGludm9rZShbXSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNhY2hlQXNCaXRtYXAoKSB7XHJcblxyXG4gICAgICAgIGxldCBoYXNSb2JvdCA9IHRoaXMucm9ib3RXb3JsZEhlbHBlciAhPSBudWxsO1xyXG5cclxuICAgICAgICB0aGlzLm1vdXNlTGlzdGVuZXJTaGFwZXMgPSBbXTtcclxuXHJcbiAgICAgICAgbGV0IHNjYWxlTWluID0gMS4wO1xyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRXaWR0aCAqIHRoaXMuY3VycmVudEhlaWdodCA+IDI1MDAwMDApIHNjYWxlTWluID0gTWF0aC5zcXJ0KDI1MDAwMDAgLyAodGhpcy5jdXJyZW50V2lkdGggKiB0aGlzLmN1cnJlbnRIZWlnaHQpKTtcclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50V2lkdGggKiB0aGlzLmN1cnJlbnRIZWlnaHQgPCAxMDI0ICogMTAyNCkgc2NhbGVNaW4gPSBNYXRoLnNxcnQoMTAyNCAqIDEwMjQgLyAodGhpcy5jdXJyZW50V2lkdGggKiB0aGlzLmN1cnJlbnRIZWlnaHQpKTtcclxuXHJcbiAgICAgICAgY29uc3QgYnJ0ID0gbmV3IFBJWEkuQmFzZVJlbmRlclRleHR1cmUoXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHNjYWxlTW9kZTogUElYSS5TQ0FMRV9NT0RFUy5MSU5FQVIsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogTWF0aC5yb3VuZCh0aGlzLmN1cnJlbnRXaWR0aCAqIHNjYWxlTWluKSxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogTWF0aC5yb3VuZCh0aGlzLmN1cnJlbnRIZWlnaHQgKiBzY2FsZU1pbilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgbGV0IHJ0OiBQSVhJLlJlbmRlclRleHR1cmUgPSBuZXcgUElYSS5SZW5kZXJUZXh0dXJlKGJydCk7XHJcblxyXG4gICAgICAgIGxldCB0cmFuc2Zvcm0gPSBuZXcgUElYSS5NYXRyaXgoKS5zY2FsZShzY2FsZU1pbiwgc2NhbGVNaW4pO1xyXG5cclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgaWYgKCFoYXNSb2JvdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hcHAucmVuZGVyZXIucmVuZGVyKHRoaXMuc3RhZ2UsIHtcclxuICAgICAgICAgICAgICAgICAgICByZW5kZXJUZXh0dXJlOiBydCxcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IHRyYW5zZm9ybVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFnZS5jaGlsZHJlbi5mb3JFYWNoKGMgPT4gYy5kZXN0cm95KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhZ2UucmVtb3ZlQ2hpbGRyZW4oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZShydCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlLmxvY2FsVHJhbnNmb3JtLnNjYWxlKHRoaXMuZ2xvYmFsU2NhbGUsIHRoaXMuZ2xvYmFsU2NhbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlYnVnZ2VyO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNwcml0ZS5sb2NhbFRyYW5zZm9ybS50cmFuc2xhdGUoMCwgcnQuaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICBzcHJpdGUudHJhbnNmb3JtLm9uQ2hhbmdlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtID0gbmV3IFBJWEkuTWF0cml4KCkuc2NhbGUoMSwgLTEpLnRyYW5zbGF0ZSgwLCB0aGlzLmN1cnJlbnRIZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybSA9IG5ldyBQSVhJLk1hdHJpeCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhZ2UuYWRkQ2hpbGQoc3ByaXRlKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9LCAzMDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMTUwKTsgICAvLyBuZWNlc3NhcnkgdG8gYXdhaXQgVHVydGxlJ3MgZGVmZXJyZWQgcmVuZGVyaW5nXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGRlc3Ryb3lXb3JsZCgpIHtcclxuICAgICAgICBmb3IgKGxldCBsaXN0ZW5lclR5cGUgb2YgW1wibW91c2V1cFwiLCBcIm1vdXNlZG93blwiLCBcIm1vdXNlbW92ZVwiLCBcIm1vdXNlZW50ZXJcIiwgXCJtb3VzZWxlYXZlXCJdKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGNvbnRhaW5lcklubmVyLm9mZihsaXN0ZW5lclR5cGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnNwcml0ZUFuaW1hdGlvbnMgPSBbXTtcclxuICAgICAgICB0aGlzLmFwcC50aWNrZXIucmVtb3ZlKHRoaXMudGlja2VyRnVuY3Rpb24pO1xyXG5cclxuICAgICAgICB0aGlzLmFwcC5zdGFnZS5jaGlsZHJlbi5mb3JFYWNoKGMgPT4gYy5kZXN0cm95KCkpO1xyXG4gICAgICAgIHRoaXMuYXBwLnN0YWdlLnJlbW92ZUNoaWxkcmVuKCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnJvYm90V29ybGRIZWxwZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLnJvYm90V29ybGRIZWxwZXIuZGVzdHJveSgpO1xyXG4gICAgICAgICAgICB0aGlzLnJvYm90V29ybGRIZWxwZXIgPSBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgalF1ZXJ5KHRoaXMuYXBwLnZpZXcpLmRldGFjaCgpO1xyXG5cclxuICAgICAgICB0aGlzLiRjb250YWluZXJPdXRlci5yZW1vdmUoKTtcclxuICAgICAgICB0aGlzLm1vZHVsZS5tYWluLmdldEludGVycHJldGVyKCkucHJpbnRNYW5hZ2VyLmdldEdyYXBoaWNzRGl2KCkuaGlkZSgpO1xyXG4gICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGltZXJFeHRlcm4gPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmludGVycHJldGVyLndvcmxkSGVscGVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLiRjb29yZGluYXRlRGl2LmhpZGUoKTtcclxuXHJcbiAgICAgICAgRmlsbGVkU2hhcGVEZWZhdWx0cy5pbml0RGVmYXVsdFZhbHVlcygpO1xyXG4gICAgfVxyXG5cclxuICAgIG9uTW91c2VFdmVudChsaXN0ZW5lclR5cGU6IHN0cmluZywgeDogbnVtYmVyLCB5OiBudW1iZXIsIGJ1dHRvbjogbnVtYmVyKSB7XHJcblxyXG4gICAgICAgIHN3aXRjaCAobGlzdGVuZXJUeXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJtb3VzZWRvd25cIjpcclxuICAgICAgICAgICAgY2FzZSBcIm1vdXNldXBcIjpcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGxpc3RlbmVyIG9mIHRoaXMubW91c2VMaXN0ZW5lclNoYXBlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzaGFwZUhlbHBlcjogU2hhcGVIZWxwZXIgPSBsaXN0ZW5lci5zaGFwZUhlbHBlcjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyLnR5cGVzW2xpc3RlbmVyVHlwZV0gIT0gbnVsbCAmJiAoc2hhcGVIZWxwZXIuY29udGFpbnNQb2ludCh4LCB5KSB8fCBzaGFwZUhlbHBlci50cmFja01vdXNlTW92ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZva2VTaGFwZU1vdXNlTGlzdGVuZXIobGlzdGVuZXIsIGxpc3RlbmVyVHlwZSwgeCwgeSwgYnV0dG9uKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwibW91c2VlbnRlclwiOlxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbGlzdGVuZXIgb2YgdGhpcy5tb3VzZUxpc3RlbmVyU2hhcGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciA9IGxpc3RlbmVyLnNoYXBlSGVscGVyO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXIudHlwZXNbbGlzdGVuZXJUeXBlXSAhPSBudWxsICYmIHNoYXBlSGVscGVyLmNvbnRhaW5zUG9pbnQoeCwgeSkgJiYgIXNoYXBlSGVscGVyLm1vdXNlTGFzdFNlZW5JbnNpZGVPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZva2VTaGFwZU1vdXNlTGlzdGVuZXIobGlzdGVuZXIsIGxpc3RlbmVyVHlwZSwgeCwgeSwgYnV0dG9uLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGFwZUhlbHBlci5tb3VzZUxhc3RTZWVuSW5zaWRlT2JqZWN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwibW91c2VsZWF2ZVwiOlxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbGlzdGVuZXIgb2YgdGhpcy5tb3VzZUxpc3RlbmVyU2hhcGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciA9IGxpc3RlbmVyLnNoYXBlSGVscGVyO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXIudHlwZXNbbGlzdGVuZXJUeXBlXSAhPSBudWxsICYmIHNoYXBlSGVscGVyLm1vdXNlTGFzdFNlZW5JbnNpZGVPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZva2VTaGFwZU1vdXNlTGlzdGVuZXIobGlzdGVuZXIsIGxpc3RlbmVyVHlwZSwgeCwgeSwgYnV0dG9uLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGFwZUhlbHBlci5tb3VzZUxhc3RTZWVuSW5zaWRlT2JqZWN0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcIm1vdXNlbW92ZVwiOlxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbGlzdGVuZXIgb2YgdGhpcy5tb3VzZUxpc3RlbmVyU2hhcGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciA9IGxpc3RlbmVyLnNoYXBlSGVscGVyO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXIudHlwZXNbXCJtb3VzZW1vdmVcIl0gIT0gbnVsbCB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAobGlzdGVuZXIudHlwZXNbXCJtb3VzZWVudGVyXCJdICE9IG51bGwgJiYgIXNoYXBlSGVscGVyLm1vdXNlTGFzdFNlZW5JbnNpZGVPYmplY3QpIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChsaXN0ZW5lci50eXBlc1tcIm1vdXNlbGVhdmVcIl0gIT0gbnVsbCAmJiBzaGFwZUhlbHBlci5tb3VzZUxhc3RTZWVuSW5zaWRlT2JqZWN0KVxyXG4gICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29udGFpbnNQb2ludCA9IHNoYXBlSGVscGVyLmNvbnRhaW5zUG9pbnQoeCwgeSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoc2hhcGVIZWxwZXIudHJhY2tNb3VzZU1vdmUgfHwgY29udGFpbnNQb2ludCkgJiYgbGlzdGVuZXIudHlwZXNbXCJtb3VzZW1vdmVcIl0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZva2VTaGFwZU1vdXNlTGlzdGVuZXIobGlzdGVuZXIsIFwibW91c2Vtb3ZlXCIsIHgsIHksIGJ1dHRvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRhaW5zUG9pbnQgJiYgbGlzdGVuZXIudHlwZXNbXCJtb3VzZWVudGVyXCJdICE9IG51bGwgJiYgIXNoYXBlSGVscGVyLm1vdXNlTGFzdFNlZW5JbnNpZGVPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW52b2tlU2hhcGVNb3VzZUxpc3RlbmVyKGxpc3RlbmVyLCBcIm1vdXNlZW50ZXJcIiwgeCwgeSwgYnV0dG9uLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hhcGVIZWxwZXIubW91c2VMYXN0U2Vlbkluc2lkZU9iamVjdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbnRhaW5zUG9pbnQgJiYgbGlzdGVuZXIudHlwZXNbXCJtb3VzZWxlYXZlXCJdICE9IG51bGwgJiYgc2hhcGVIZWxwZXIubW91c2VMYXN0U2Vlbkluc2lkZU9iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZva2VTaGFwZU1vdXNlTGlzdGVuZXIobGlzdGVuZXIsIFwibW91c2VsZWF2ZVwiLCB4LCB5LCBidXR0b24sICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGFwZUhlbHBlci5tb3VzZUxhc3RTZWVuSW5zaWRlT2JqZWN0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpbnZva2VTaGFwZU1vdXNlTGlzdGVuZXIobGlzdGVuZXI6IE1vdXNlTGlzdGVuZXJTaGFwZURhdGEsIGxpc3RlbmVyVHlwZTogc3RyaW5nLFxyXG4gICAgICAgIHg6IG51bWJlciwgeTogbnVtYmVyLCBidXR0b246IG51bWJlciwgY2FsbGJhY2s/OiAoKSA9PiB2b2lkKSB7XHJcblxyXG4gICAgICAgIGlmICghbGlzdGVuZXIuc2hhcGVIZWxwZXIucmVhY3RUb01vdXNlRXZlbnRzV2hlbkludmlzaWJsZSAmJlxyXG4gICAgICAgICAgICAhbGlzdGVuZXIuc2hhcGVIZWxwZXIuZGlzcGxheU9iamVjdC52aXNpYmxlKSByZXR1cm47XHJcblxyXG4gICAgICAgIGxldCBtZXRob2QgPSBsaXN0ZW5lci5tZXRob2RzW2xpc3RlbmVyVHlwZV07XHJcbiAgICAgICAgbGV0IHByb2dyYW0gPSBtZXRob2QucHJvZ3JhbTtcclxuICAgICAgICBsZXQgaW52b2tlID0gbWV0aG9kLmludm9rZTtcclxuXHJcbiAgICAgICAgbGV0IHJ0byA9IGxpc3RlbmVyLnNoYXBlSGVscGVyLnJ1bnRpbWVPYmplY3Q7XHJcblxyXG4gICAgICAgIGxldCBzdGFja0VsZW1lbnRzOiBWYWx1ZVtdID0gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBydG8uY2xhc3MsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogcnRvXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogeFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIF07XHJcblxyXG4gICAgICAgIGlmIChsaXN0ZW5lclR5cGUgIT0gXCJtb3VzZW1vdmVcIiAmJiBsaXN0ZW5lclR5cGUgIT0gXCJtb3VzZWVudGVyXCIgJiYgbGlzdGVuZXJUeXBlICE9IFwibW91c2VsZWF2ZVwiKSB7XHJcbiAgICAgICAgICAgIHN0YWNrRWxlbWVudHMucHVzaChcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBidXR0b25cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHByb2dyYW0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnJ1blRpbWVyKG1ldGhvZCwgc3RhY2tFbGVtZW50cywgY2FsbGJhY2ssIGZhbHNlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGludm9rZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGludm9rZShbXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBhZGRNb3VzZUxpc3RlbmVyKGxpc3RlbmVyOiBSdW50aW1lT2JqZWN0KSB7XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgICAgIElmIGEgc2hhcGUgaXMgcmVnaXN0ZXJlZCBhcyBNb3VzZUxpc3RlbmVyIG9mIHRoZSB3b3JsZC1vYmplY3QsIGl0IGdldHMgYWxsIG1vdXNlLWV2ZW50cyB0d2ljZS4gXHJcbiAgICAgICAgICAgID0+IERlcmVnaXN0ZXIgc2hhcGUgYXMgbW91c2VMaXN0ZW5lclNoYXBlIGFuZCByZWdpc3RlciBpdCBhcyBtb3VzZSBsaXN0ZW5lciBmb3IgdGhlIHdvcmxkIG9iamVjdC5cclxuICAgICAgICAqL1xyXG4gICAgICAgIGxldCBpbmRleDogbnVtYmVyID0gdGhpcy5tb3VzZUxpc3RlbmVyU2hhcGVzLmZpbmRJbmRleCgobWxzKSA9PiB7IHJldHVybiBtbHMuc2hhcGVIZWxwZXIucnVudGltZU9iamVjdCA9PSBsaXN0ZW5lciB9KTtcclxuICAgICAgICBpZiAoaW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLm1vdXNlTGlzdGVuZXJTaGFwZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBsaXN0ZW5lclR5cGVzID0gW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiTW91c2VVcFwiLCBzaWduYXR1cmU6IFwiKGRvdWJsZSwgZG91YmxlLCBpbnQpXCIgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIk1vdXNlRG93blwiLCBzaWduYXR1cmU6IFwiKGRvdWJsZSwgZG91YmxlLCBpbnQpXCIgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIk1vdXNlTW92ZVwiLCBzaWduYXR1cmU6IFwiKGRvdWJsZSwgZG91YmxlKVwiIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJNb3VzZUVudGVyXCIsIHNpZ25hdHVyZTogXCIoZG91YmxlLCBkb3VibGUpXCIgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIk1vdXNlTGVhdmVcIiwgc2lnbmF0dXJlOiBcIihkb3VibGUsIGRvdWJsZSlcIiB9LFxyXG4gICAgICAgIF07XHJcblxyXG4gICAgICAgIGxldCBzZDogTW91c2VMaXN0ZW5lckRhdGEgPSBudWxsO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBsdCBvZiBsaXN0ZW5lclR5cGVzKSB7XHJcbiAgICAgICAgICAgIGxldCBtZXRob2Q6IE1ldGhvZCA9ICg8S2xhc3M+bGlzdGVuZXIuY2xhc3MpLmdldE1ldGhvZEJ5U2lnbmF0dXJlKFwib25cIiArIGx0LmlkZW50aWZpZXIgKyBsdC5zaWduYXR1cmUpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG1ldGhvZD8ucHJvZ3JhbSAhPSBudWxsICYmIG1ldGhvZC5wcm9ncmFtLnN0YXRlbWVudHMubGVuZ3RoID4gMiB8fCBtZXRob2Q/Lmludm9rZSAhPSBudWxsKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNkID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXI6IGxpc3RlbmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlczoge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZHM6IHt9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdXNlTGlzdGVuZXJzLnB1c2goc2QpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNkLnR5cGVzW2x0LmlkZW50aWZpZXIudG9Mb3dlckNhc2UoKV0gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgc2QubWV0aG9kc1tsdC5pZGVudGlmaWVyLnRvTG93ZXJDYXNlKCldID0gbWV0aG9kO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGludm9rZU1vdXNlTGlzdGVuZXIobGlzdGVuZXI6IE1vdXNlTGlzdGVuZXJEYXRhLCBsaXN0ZW5lclR5cGU6IHN0cmluZyxcclxuICAgICAgICB4OiBudW1iZXIsIHk6IG51bWJlciwgYnV0dG9uOiBudW1iZXIsIGNhbGxiYWNrPzogKCkgPT4gdm9pZCkge1xyXG5cclxuICAgICAgICBsZXQgbWV0aG9kID0gbGlzdGVuZXIubWV0aG9kc1tsaXN0ZW5lclR5cGVdO1xyXG4gICAgICAgIGxldCBwcm9ncmFtID0gbWV0aG9kLnByb2dyYW07XHJcbiAgICAgICAgbGV0IGludm9rZSA9IG1ldGhvZC5pbnZva2U7XHJcblxyXG4gICAgICAgIGxldCBydG8gPSBsaXN0ZW5lci5saXN0ZW5lcjtcclxuXHJcbiAgICAgICAgbGV0IHN0YWNrRWxlbWVudHM6IFZhbHVlW10gPSBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IHJ0by5jbGFzcyxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBydG9cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB4XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogeVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgaWYgKGxpc3RlbmVyVHlwZSAhPSBcIm1vdXNlbW92ZVwiICYmIGxpc3RlbmVyVHlwZSAhPSBcIm1vdXNlZW50ZXJcIiAmJiBsaXN0ZW5lclR5cGUgIT0gXCJtb3VzZWxlYXZlXCIpIHtcclxuICAgICAgICAgICAgc3RhY2tFbGVtZW50cy5wdXNoKFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGJ1dHRvblxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHJvZ3JhbSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIucnVuVGltZXIobWV0aG9kLCBzdGFja0VsZW1lbnRzLCBjYWxsYmFjaywgZmFsc2UpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoaW52b2tlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaW52b2tlKFtdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldERlZmF1bHRHcm91cCgpOiBSdW50aW1lT2JqZWN0IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kZWZhdWx0R3JvdXA/LnJ1bnRpbWVPYmplY3Q7XHJcbiAgICB9XHJcblxyXG59Il19