import { Klass } from "../../compiler/types/Class.js";
import { doublePrimitiveType, intPrimitiveType, stringPrimitiveType, voidPrimitiveType } from "../../compiler/types/PrimitiveTypes.js";
import { Method, Parameterlist } from "../../compiler/types/Types.js";
import { InterpreterState } from "../../interpreter/Interpreter.js";
import { RuntimeObject } from "../../interpreter/RuntimeObject.js";
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
        let colorType = this.module.typeStore.getType("Color");
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
        this.addMethod(new Method("setBackgroundColor", new Parameterlist([
            { identifier: "color", type: colorType, declaration: null, usagePositions: null, isFinal: true },
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
        if (color instanceof RuntimeObject) {
            color = (color.intrinsicData).hex;
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY2xpZW50L3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzL1dvcmxkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN2SSxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQzdFLE9BQU8sRUFBZSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUduRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFNL0QsTUFBTSxPQUFPLFVBQVcsU0FBUSxLQUFLO0lBRWpDLFlBQW1CLE1BQWM7UUFFN0IsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsK0NBQStDLENBQUMsQ0FBQTtRQUZ4RCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBSTdCLElBQUksQ0FBQyxZQUFZLENBQVEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUU3RCxJQUFJLFNBQVMsR0FBZSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5RCxJQUFJLFNBQVMsR0FBZSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5RCxJQUFJLGlCQUFpQixHQUEyQixNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMx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WUFBWSxFQUFFO1lBQzdGLGFBQWEsQ0FBQyxJQUFJLENBQ2Q7Z0JBQ0ksSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsS0FBSyxFQUFFLE1BQU07YUFDaEIsQ0FBQyxDQUFDO1NBQ1Y7UUFFRCxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDakIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDckU7YUFBTSxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFDdkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2Q7SUFFTCxDQUFDO0lBRUQsZUFBZTs7UUFDWCxPQUFPLE1BQUEsSUFBSSxDQUFDLFlBQVksMENBQUUsYUFBYSxDQUFDO0lBQzVDLENBQUM7Q0FFSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1vZHVsZSB9IGZyb20gXCIuLi8uLi9jb21waWxlci9wYXJzZXIvTW9kdWxlLmpzXCI7XHJcbmltcG9ydCB7IEtsYXNzIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL0NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGludFByaW1pdGl2ZVR5cGUsIHN0cmluZ1ByaW1pdGl2ZVR5cGUsIHZvaWRQcmltaXRpdmVUeXBlIH0gZnJvbSBcIi4uLy4uL2NvbXBpbGVyL3R5cGVzL1ByaW1pdGl2ZVR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IE1ldGhvZCwgUGFyYW1ldGVybGlzdCwgVmFsdWUgfSBmcm9tIFwiLi4vLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW50ZXJwcmV0ZXIsIEludGVycHJldGVyU3RhdGUgfSBmcm9tIFwiLi4vLi4vaW50ZXJwcmV0ZXIvSW50ZXJwcmV0ZXIuanNcIjtcclxuaW1wb3J0IHsgUnVudGltZU9iamVjdCB9IGZyb20gXCIuLi8uLi9pbnRlcnByZXRlci9SdW50aW1lT2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IEFjdG9ySGVscGVyIH0gZnJvbSBcIi4vQWN0b3IuanNcIjtcclxuaW1wb3J0IHsgQ29sb3JDbGFzc0ludHJpbnNpY0RhdGEgfSBmcm9tIFwiLi9Db2xvci5qc1wiO1xyXG5pbXBvcnQgeyBDb2xvckhlbHBlciB9IGZyb20gXCIuL0NvbG9ySGVscGVyLmpzXCI7XHJcbmltcG9ydCB7IEZpbGxlZFNoYXBlRGVmYXVsdHMgfSBmcm9tIFwiLi9GaWxsZWRTaGFwZURlZmF1bHRzLmpzXCI7XHJcbmltcG9ydCB7IEdyb3VwQ2xhc3MsIEdyb3VwSGVscGVyIH0gZnJvbSBcIi4vR3JvdXAuanNcIjtcclxuaW1wb3J0IHsgTW91c2VMaXN0ZW5lckludGVyZmFjZSB9IGZyb20gXCIuL01vdXNlTGlzdGVuZXIuanNcIjtcclxuaW1wb3J0IHsgU2hhcGVDbGFzcywgU2hhcGVIZWxwZXIgfSBmcm9tIFwiLi9TaGFwZS5qc1wiO1xyXG5pbXBvcnQgeyBTcHJpdGVIZWxwZXIgfSBmcm9tIFwiLi9TcHJpdGUuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBXb3JsZENsYXNzIGV4dGVuZHMgS2xhc3Mge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBtb2R1bGU6IE1vZHVsZSkge1xyXG5cclxuICAgICAgICBzdXBlcihcIldvcmxkXCIsIG1vZHVsZSwgXCJHcmFmaXNjaGUgWmVpY2hlbmZsw6RjaGUgbWl0IEtvb3JkaW5hdGVuc3lzdGVtXCIpXHJcblxyXG4gICAgICAgIHRoaXMuc2V0QmFzZUNsYXNzKDxLbGFzcz5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJPYmplY3RcIikpO1xyXG5cclxuICAgICAgICBsZXQgZ3JvdXBUeXBlID0gPEdyb3VwQ2xhc3M+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiR3JvdXBcIik7XHJcbiAgICAgICAgbGV0IHNoYXBlVHlwZSA9IDxTaGFwZUNsYXNzPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIlNoYXBlXCIpO1xyXG4gICAgICAgIGxldCBtb3VzZUxpc3RlbmVyVHlwZSA9IDxNb3VzZUxpc3RlbmVySW50ZXJmYWNlPm1vZHVsZS50eXBlU3RvcmUuZ2V0VHlwZShcIk1vdXNlTGlzdGVuZXJcIik7XHJcbiAgICAgICAgbGV0IGNvbG9yVHlwZTogS2xhc3MgPSA8S2xhc3M+dGhpcy5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJDb2xvclwiKTtcclxuXHJcbiAgICAgICAgLy8gdGhpcy5hZGRBdHRyaWJ1dGUobmV3IEF0dHJpYnV0ZShcIlBJXCIsIGRvdWJsZVByaW1pdGl2ZVR5cGUsIChvYmplY3QpID0+IHsgcmV0dXJuIE1hdGguUEkgfSwgdHJ1ZSwgVmlzaWJpbGl0eS5wdWJsaWMsIHRydWUsIFwiRGllIEtyZWlzemFobCBQaSAoMy4xNDE1Li4uKVwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJXb3JsZFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJicmVpdGVcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJow7ZoZVwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYnJlaXRlOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGjDtmhlOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGdoOiBXb3JsZEhlbHBlciA9IHRoaXMuZ2V0V29ybGRIZWxwZXIobywgYnJlaXRlLCBow7ZoZSk7ICAvL25ldyBXb3JsZEhlbHBlcihicmVpdGUsIGjDtmhlLCB0aGlzLm1vZHVsZSwgbyk7XHJcbiAgICAgICAgICAgICAgICBvLmludHJpbnNpY0RhdGFbXCJXb3JsZFwiXSA9IGdoO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkxlZ3QgZWluZW4gbmV1ZW4gR3JhZmlrYmVyZWljaCAoPSdXZWx0JykgYW5cIiwgdHJ1ZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiV29ybGRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBnaDogV29ybGRIZWxwZXIgPSB0aGlzLmdldFdvcmxkSGVscGVyKG8pOyAvLyBuZXcgV29ybGRIZWxwZXIoODAwLCA2MDAsIHRoaXMubW9kdWxlLCBvKTtcclxuICAgICAgICAgICAgICAgIG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdID0gZ2g7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiTGVndCBlaW5lbiBuZXVlbiBHcmFmaWtiZXJlaWNoICg9J1dlbHQnKSBhbi4gRGFzIEtvb3JkaW5hdGVuc3lzdGVtIGdlaHQgdm9uIDAgYmlzIDgwMCBpbiB4LVJpY2h0dW5nIHVuZCB2b24gMCAtIDYwMCBpbiB5LVJpY2h0dW5nLlwiLCB0cnVlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzZXRCYWNrZ3JvdW5kQ29sb3JcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiY29sb3JBc1JHQkludFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbG9yOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdoOiBXb3JsZEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoLnNldEJhY2tncm91bmRDb2xvcihjb2xvcik7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdTZXR6dCBkaWUgSGludGVyZ3J1bmRmYXJiZS4gRGllIEZhcmJlIHdpcmQgYWxzIGludGVnZXItWmFobCBlcndhcnRldC4gQW0gYmVzdGVuIHNjaHJlaWJ0IG1hbiBzaWUgYWxzIEhleGFkZXppbWFsemFobCwgYWxzbyB6LkIuIHNldEJhY2tncm91bmRDb2xvcigweGZmODA4MCkuXCInLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2V0QmFja2dyb3VuZENvbG9yXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImNvbG9yQXNSR0JBU3RyaW5nXCIsIHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgY29sb3I6IHN0cmluZyA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgd2guc2V0QmFja2dyb3VuZENvbG9yKGNvbG9yKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ1NldHp0IGRpZSBIaW50ZXJncnVuZGZhcmJlLiBEaWUgRmFyYmUgaXN0IGVudHdlZGVyIGVpbmUgdm9yZGVmaW5pZXJ0ZSBGYXJiZSAoXCJzY2h3YXJ6XCIsIFwicm90XCIsIC4uLikgb2RlciBlaW5lIGNzcy1GYXJiZSBkZXIgQXJ0IFwiI2ZmYTdiM1wiIChvaG5lIGFscGhhKSwgXCIjZmZhN2IzODBcIiAobWl0IGFscGhhKSwgXCJyZ2IoMTcyLCAyMiwgMTgpXCIgb2RlciBcInJnYmEoMTIzLCAyMiwxOCwgMC4zKVwiJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNldEJhY2tncm91bmRDb2xvclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJjb2xvclwiLCB0eXBlOiBjb2xvclR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgY29sb3I6IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdoOiBXb3JsZEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoLnNldEJhY2tncm91bmRDb2xvcihjb2xvcik7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdTZXR6dCBkaWUgSGludGVyZ3J1bmRmYXJiZS4gRGllIEZhcmJlIGlzdCBlbnR3ZWRlciBlaW5lIHZvcmRlZmluaWVydGUgRmFyYmUgKFwic2Nod2FyelwiLCBcInJvdFwiLCAuLi4pIG9kZXIgZWluZSBjc3MtRmFyYmUgZGVyIEFydCBcIiNmZmE3YjNcIiAob2huZSBhbHBoYSksIFwiI2ZmYTdiMzgwXCIgKG1pdCBhbHBoYSksIFwicmdiKDE3MiwgMjIsIDE4KVwiIG9kZXIgXCJyZ2JhKDEyMywgMjIsMTgsIDAuMylcIicsIGZhbHNlKSk7XHJcblxyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwibW92ZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ4XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeTogbnVtYmVyID0gcGFyYW1ldGVyc1syXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB3aDogV29ybGRIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJXb3JsZFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbWF0cml4ID0gbmV3IFBJWEkuTWF0cml4KCkuY29weUZyb20od2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybSk7XHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLmlkZW50aXR5KCk7XHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLnRyYW5zbGF0ZSh4LCB5KTtcclxuICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0ucHJlcGVuZChtYXRyaXgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoLmNvbXB1dGVDdXJyZW50V29ybGRCb3VuZHMoKTtcclxuICAgICAgICAgICAgICAgIHdoLnNoYXBlc05vdEFmZmVjdGVkQnlXb3JsZFRyYW5zZm9ybXMuZm9yRWFjaCgoc2hhcGUpID0+IHNoYXBlLm1vdmUoLXgsIC15KSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdWZXJzY2hpZWJ0IGFsbGUgT2JqZWt0ZSBkZXIgV2VsdCB1bSB4IG5hY2ggcmVjaHRzIHVuZCB5IG5hY2ggdW50ZW4uJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImZvbGxvd1wiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJzaGFwZVwiLCB0eXBlOiBzaGFwZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwibWFyZ2luXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieE1pblwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInhNYXhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ5TWluXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieU1heFwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGU6IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGZyYW1lV2lkdGg6IG51bWJlciA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeE1pbjogbnVtYmVyID0gcGFyYW1ldGVyc1szXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB4TWF4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzRdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHlNaW46IG51bWJlciA9IHBhcmFtZXRlcnNbNV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeU1heDogbnVtYmVyID0gcGFyYW1ldGVyc1s2XS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB3aDogV29ybGRIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJXb3JsZFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGVIZWxwZXI6IFNoYXBlSGVscGVyID0gc2hhcGUuaW50cmluc2ljRGF0YVtcIkFjdG9yXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBtb3ZlWDogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgICAgIGxldCBtb3ZlWTogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGVYOiBudW1iZXIgPSBzaGFwZUhlbHBlci5nZXRDZW50ZXJYKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGVZOiBudW1iZXIgPSBzaGFwZUhlbHBlci5nZXRDZW50ZXJZKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG91dHNpZGVSaWdodCA9IHNoYXBlWCAtICh3aC5jdXJyZW50TGVmdCArIHdoLmN1cnJlbnRXaWR0aCAtIGZyYW1lV2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG91dHNpZGVSaWdodCA+IDAgJiYgd2guY3VycmVudExlZnQgKyB3aC5jdXJyZW50V2lkdGggPCB4TWF4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW92ZVggPSAtb3V0c2lkZVJpZ2h0O1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvdXRzaWRlTGVmdCA9ICh3aC5jdXJyZW50TGVmdCArIGZyYW1lV2lkdGgpIC0gc2hhcGVYO1xyXG4gICAgICAgICAgICAgICAgaWYgKG91dHNpZGVMZWZ0ID4gMCAmJiB3aC5jdXJyZW50TGVmdCA+IHhNaW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBtb3ZlWCA9IG91dHNpZGVMZWZ0O1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvdXRzaWRlQm90dG9tID0gc2hhcGVZIC0gKHdoLmN1cnJlbnRUb3AgKyB3aC5jdXJyZW50SGVpZ2h0IC0gZnJhbWVXaWR0aCk7XHJcbiAgICAgICAgICAgICAgICBpZiAob3V0c2lkZUJvdHRvbSA+IDAgJiYgd2guY3VycmVudFRvcCArIHdoLmN1cnJlbnRIZWlnaHQgPD0geU1heCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1vdmVZID0gLW91dHNpZGVCb3R0b207XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG91dHNpZGVUb3AgPSAod2guY3VycmVudFRvcCArIGZyYW1lV2lkdGgpIC0gc2hhcGVZO1xyXG4gICAgICAgICAgICAgICAgaWYgKG91dHNpZGVUb3AgPiAwICYmIHdoLmN1cnJlbnRUb3AgPj0geU1pbikge1xyXG4gICAgICAgICAgICAgICAgICAgIG1vdmVZID0gb3V0c2lkZVRvcDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobW92ZVggIT0gMCB8fCBtb3ZlWSAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1hdHJpeCA9IG5ldyBQSVhJLk1hdHJpeCgpLmNvcHlGcm9tKHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0uaWRlbnRpdHkoKTtcclxuICAgICAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLnRyYW5zbGF0ZShtb3ZlWCwgbW92ZVkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0ucHJlcGVuZChtYXRyaXgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB3aC5jb21wdXRlQ3VycmVudFdvcmxkQm91bmRzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgd2guc2hhcGVzTm90QWZmZWN0ZWRCeVdvcmxkVHJhbnNmb3Jtcy5mb3JFYWNoKChzaGFwZSkgPT4gc2hhcGUubW92ZSgtbW92ZVgsIC1tb3ZlWSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ1ZlcnNjaGllYnQgZGllIFdlbHQgc28sIGRhc3MgZGFzIMO8YmVyZ2ViZW5lIGdyYXBoaXNjaGUgT2JqZWt0IChzaGFwZSkgc2ljaHRiYXIgd2lyZC4gVmVyc2Nob2JlbiB3aXJkIG51ciwgd2VubiBkYXMgT2JqZWt0IHdlbmlnZXIgYWxzIGZyYW1lV2lkdGggdm9tIFJhbmQgZW50ZmVybnQgaXN0IHVuZCBkaWUgV2VsdCBuaWNodCDDvGJlciBkaWUgZ2VnZWJlbmVuIEtvb3JkaW5hdGVuIHhNaW4sIHhNYXgsIHlNaW4gdW5kIHlNYXggaGluYXVzcmFndC4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwicm90YXRlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImFuZ2xlSW5EZWdcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ4XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieVwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFuZ2xlOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHg6IG51bWJlciA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeTogbnVtYmVyID0gcGFyYW1ldGVyc1szXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB3aDogV29ybGRIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJXb3JsZFwiXTtcclxuXHJcblxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBhbmdsZVJhZCA9IC1hbmdsZSAvIDE4MCAqIE1hdGguUEk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWF0cml4ID0gbmV3IFBJWEkuTWF0cml4KCkuY29weUZyb20od2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybSk7XHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLmlkZW50aXR5KCk7XHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLnRyYW5zbGF0ZSgteCwgLXkpO1xyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS5yb3RhdGUoYW5nbGVSYWQpO1xyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS50cmFuc2xhdGUoeCwgeSk7XHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLnByZXBlbmQobWF0cml4KTtcclxuXHJcbiAgICAgICAgICAgICAgICB3aC5jb21wdXRlQ3VycmVudFdvcmxkQm91bmRzKCk7XHJcbiAgICAgICAgICAgICAgICB3aC5zaGFwZXNOb3RBZmZlY3RlZEJ5V29ybGRUcmFuc2Zvcm1zLmZvckVhY2goXHJcbiAgICAgICAgICAgICAgICAgICAgKHNoYXBlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoYXBlLnJvdGF0ZSgtYW5nbGUsIHgsIHkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnUm90aWVydCBkaWUgV2VsdCB1bSBkZW4gYW5nZWdlYmVuZW4gV2lua2VsIGltIFVyemVpZ2Vyc2lubi4gRHJlaHB1bmt0IGlzdCBkZXIgUHVua3QgKHgveSkuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNjYWxlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImZhY3RvclwiLCB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ5XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCB2b2lkUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZmFjdG9yOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHg6IG51bWJlciA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgeTogbnVtYmVyID0gcGFyYW1ldGVyc1szXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB3aDogV29ybGRIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJXb3JsZFwiXTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG1hdHJpeCA9IG5ldyBQSVhJLk1hdHJpeCgpLmNvcHlGcm9tKHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0pO1xyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS5pZGVudGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS50cmFuc2xhdGUoLXgsIC15KTtcclxuICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0uc2NhbGUoZmFjdG9yLCBmYWN0b3IpO1xyXG4gICAgICAgICAgICAgICAgd2guc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS50cmFuc2xhdGUoeCwgeSk7XHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLnByZXBlbmQobWF0cml4KTtcclxuICAgICAgICAgICAgICAgIHdoLmNvbXB1dGVDdXJyZW50V29ybGRCb3VuZHMoKTtcclxuICAgICAgICAgICAgICAgIHdoLnNoYXBlc05vdEFmZmVjdGVkQnlXb3JsZFRyYW5zZm9ybXMuZm9yRWFjaCgoc2hhcGUpID0+IHNoYXBlLnNjYWxlKDEgLyBmYWN0b3IsIHgsIHkpKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ1N0cmVja3QgZGllIFdlbHQgdW0gZGVuIGFuZ2VnZWJlbmVuIEZha3Rvci4gWmVudHJ1bSBkZXIgU3RyZWNrdW5nIGlzdCAoeC95KS4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2V0Q29vcmRpbmF0ZVN5c3RlbVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJsZWZ0XCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwidG9wXCIsIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwid2lkdGhcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJoZWlnaHRcIiwgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBsZWZ0OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHRvcDogbnVtYmVyID0gcGFyYW1ldGVyc1syXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB3aWR0aDogbnVtYmVyID0gcGFyYW1ldGVyc1szXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBoZWlnaHQ6IG51bWJlciA9IHBhcmFtZXRlcnNbNF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0uaWRlbnRpdHkoKTsgICAgIC8vIGNvb3JkaW5hdGUgc3lzdGVtICgwLzApIHRvIChpbml0aWFsV2lkdGgvaW5pdGlhbEhlaWdodClcclxuICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0udHJhbnNsYXRlKC1sZWZ0LCAtdG9wKTtcclxuICAgICAgICAgICAgICAgIHdoLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0uc2NhbGUod2guaW5pdGlhbFdpZHRoIC8gd2lkdGgsIHdoLmluaXRpYWxIZWlnaHQgLyBoZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgd2guY29tcHV0ZUN1cnJlbnRXb3JsZEJvdW5kcygpO1xyXG4gICAgICAgICAgICAgICAgd2guc2hhcGVzTm90QWZmZWN0ZWRCeVdvcmxkVHJhbnNmb3Jtcy5mb3JFYWNoKChzaGFwZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHNoYXBlLnNjYWxlKHdpZHRoIC8gd2guaW5pdGlhbFdpZHRoLCBsZWZ0LCB0b3ApO1xyXG4gICAgICAgICAgICAgICAgICAgIHNoYXBlLm1vdmUobGVmdCwgdG9wKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnU3RyZWNrdCBkaWUgV2VsdCB1bSBkZW4gYW5nZWdlYmVuZW4gRmFrdG9yLiBaZW50cnVtIGRlciBTdHJlY2t1bmcgaXN0ICh4L3kpLicsIGZhbHNlKSk7XHJcblxyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2V0RGVmYXVsdEdyb3VwXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImdyb3VwXCIsIHR5cGU6IGdyb3VwVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIHZvaWRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBncm91cDogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgd2guZGVmYXVsdEdyb3VwID0gZ3JvdXAgPT0gbnVsbCA/IG51bGwgOiBncm91cC5pbnRyaW5zaWNEYXRhW1wiQWN0b3JcIl07XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdMZWd0IGVpbmUgR3J1cHBlIGZlc3QsIHp1IGRlciBhYiBqZXR6dCBhbGxlIG5ldWVuIE9iamVrdGUgYXV0b21hdGlzY2ggaGluenVnZWbDvGd0IHdlcmRlbi4gRmFsbHMgbnVsbCBhbmdlZ2ViZW4gd2lyZCwgd2VyZGVuIG5ldWUgT2JqZWt0ZSB6dSBrZWluZXIgR3J1cHBlIGF1dG9tYXRpc2NoIGhpbnp1Z2Vmw7xndC4nLCBmYWxzZSkpO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImdldERlZmF1bHRHcm91cFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGdyb3VwVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHdoLmdldERlZmF1bHRHcm91cCgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnR2lidCBkaWUgR3J1cHBlIHp1csO8Y2ssIHp1IGRlciBha3R1ZWxsIGFsbGUgbmV1ZW4gT2JqZWt0ZSBhdXRvbWF0aXNjaCBoaW56dWdlZsO8Z3Qgd2VyZGVuLiBGYWxscyBnZXJhZGUga2VpbmUgZGVmYXVsdEdyb3VwIGZlc3RnZWxlZ3QgaXN0LCB3aXJkIG51bGwgenVyw7xja2dlZ2ViZW4uJywgZmFsc2UpKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJhZGRNb3VzZUxpc3RlbmVyXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImxpc3RlbmVyXCIsIHR5cGU6IG1vdXNlTGlzdGVuZXJUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgdm9pZFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGxpc3RlbmVyOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB3aDogV29ybGRIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJXb3JsZFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICB3aC5hZGRNb3VzZUxpc3RlbmVyKGxpc3RlbmVyKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0bDvGd0IGVpbmVuIG5ldWVuIE1vdXNlTGlzdGVuZXIgaGluenUsIGRlc3NlbiBNZXRob2RlbiBiZWkgTWF1c2VyZWlnbmlzc2VuIGF1ZmdlcnVmZW4gd2VyZGVuLicsIGZhbHNlKSk7XHJcblxyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0V2lkdGhcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBpbnRQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB3aDogV29ybGRIZWxwZXIgPSBvLmludHJpbnNpY0RhdGFbXCJXb3JsZFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh3aC5jdXJyZW50V2lkdGgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnR2lidCBkaWUgXCJCcmVpdGVcIiBkZXMgR3JhZmlrYmVyZWljaHMgenVyw7xjaywgZ2VuYXVlcjogZGllIHgtS29vcmRpbmF0ZSBhbSByZWNodGVuIFJhbmQuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImdldEhlaWdodFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGludFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdoOiBXb3JsZEhlbHBlciA9IG8uaW50cmluc2ljRGF0YVtcIldvcmxkXCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHdoLmN1cnJlbnRIZWlnaHQpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnR2lidCBkaWUgXCJIw7ZoZVwiIGRlcyBHcmFmaWtiZXJlaWNocyB6dXLDvGNrLCBnZW5hdWVyOiBkaWUgeS1Lb29yZGluYXRlIGFtIHVudGVyZW4gUmFuZC4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0VG9wXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQod2guY3VycmVudFRvcCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdHaWJ0IGRpZSB5LUtvb3JkaW5hdGUgZGVyIGxpbmtlbiBvYmVyZW4gRWNrZSB6dXLDvGNrLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJnZXRMZWZ0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQod2guY3VycmVudExlZnQpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnR2lidCBkaWUgeC1Lb29yZGluYXRlIGRlciBsaW5rZW4gb2JlcmVuIEVja2UgenVyw7xjay4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2V0Q3Vyc29yXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImN1cnNvclwiLCB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd2g6IFdvcmxkSGVscGVyID0gby5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl07XHJcbiAgICAgICAgICAgICAgICBsZXQgY3Vyc29yOiBzdHJpbmcgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoLnNldEN1cnNvcihjdXJzb3IpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnw4RuZGVydCBkaWUgRm9ybSBkZXMgTWF1c2N1cnNvcnMgaW0gZ2VzYW10ZW4gR3JhZmlrYmVyZWljaC4gTcO2Z2ljaGUgV2VydGU6IHNpZWhlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2RlL2RvY3MvV2ViL0NTUy9jdXJzb3IuJywgZmFsc2UpKTtcclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldFdvcmxkSGVscGVyKHdvcmxkT2JqZWN0OiBSdW50aW1lT2JqZWN0LCBicmVpdGU6IG51bWJlciA9IDgwMCwgaMO2aGU6IG51bWJlciA9IDYwMCk6IFdvcmxkSGVscGVyIHtcclxuXHJcbiAgICAgICAgbGV0IHdoID0gdGhpcy5tb2R1bGU/Lm1haW4/LmdldEludGVycHJldGVyKCk/LndvcmxkSGVscGVyO1xyXG5cclxuXHJcbiAgICAgICAgaWYgKHdoICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKHdoLndpZHRoICE9IGJyZWl0ZSB8fCB3aC5oZWlnaHQgIT0gaMO2aGUpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcmF0aW86IG51bWJlciA9IE1hdGgucm91bmQoaMO2aGUgLyBicmVpdGUgKiAxMDApO1xyXG4gICAgICAgICAgICAgICAgd2guJGNvbnRhaW5lck91dGVyLmNzcygncGFkZGluZy1ib3R0b20nLCByYXRpbyArIFwiJVwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICB3aC5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLnNjYWxlKHdoLndpZHRoIC8gYnJlaXRlLCB3aC53aWR0aCAvIGjDtmhlKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZHVsZS5tYWluLmdldFJpZ2h0RGl2KCk/LmFkanVzdFdpZHRoVG9Xb3JsZCgpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHdoO1xyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JsZEhlbHBlcihicmVpdGUsIGjDtmhlLCB0aGlzLm1vZHVsZSwgd29ybGRPYmplY3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxufVxyXG5cclxuZXhwb3J0IHR5cGUgTW91c2VMaXN0ZW5lclNoYXBlRGF0YSA9IHtcclxuICAgIHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlcixcclxuICAgIHR5cGVzOiB7IFt0eXBlOiBzdHJpbmddOiBib29sZWFuIH0sXHJcbiAgICBtZXRob2RzOiB7IFt0eXBlOiBzdHJpbmddOiBNZXRob2QgfVxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBNb3VzZUxpc3RlbmVyRGF0YSA9IHtcclxuICAgIGxpc3RlbmVyOiBSdW50aW1lT2JqZWN0LFxyXG4gICAgdHlwZXM6IHsgW3R5cGU6IHN0cmluZ106IGJvb2xlYW4gfSxcclxuICAgIG1ldGhvZHM6IHsgW3R5cGU6IHN0cmluZ106IE1ldGhvZCB9XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIEFjdG9yRGF0YSA9IHtcclxuICAgIGFjdG9ySGVscGVyOiBBY3RvckhlbHBlcixcclxuICAgIG1ldGhvZDogTWV0aG9kXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAc2VlIGh0dHBzOi8vamF2YXNjcmlwdC5wbGFpbmVuZ2xpc2guaW8vaW5zaWRlLXBpeGlqcy1wcm9qZWN0aW9uLXN5c3RlbS04OTc4NzJhM2RjMTdcclxuICovXHJcbmNsYXNzIFdvcmxkQ29udGFpbmVyIGV4dGVuZHMgUElYSS5Db250YWluZXIge1xyXG5cclxuICAgIHByb2plY3Rpb25UcmFuc2Zvcm06IFBJWEkuTWF0cml4O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBzb3VyY2VGcmFtZTogUElYSS5SZWN0YW5nbGUsIHB1YmxpYyBkZXN0aW5hdGlvbkZyYW1lOiBQSVhJLlJlY3RhbmdsZSkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtID0gbmV3IFBJWEkuTWF0cml4KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVuZGVyKHJlbmRlcmVyOiBQSVhJLlJlbmRlcmVyKSB7XHJcblxyXG4gICAgICAgIHJlbmRlcmVyLnByb2plY3Rpb24ucHJvamVjdGlvbk1hdHJpeC5pZGVudGl0eSgpO1xyXG4gICAgICAgIHJlbmRlcmVyLnByb2plY3Rpb24udHJhbnNmb3JtID0gdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtO1xyXG4gICAgICAgIHJlbmRlcmVyLnJlbmRlclRleHR1cmUuYmluZChcclxuICAgICAgICAgICAgcmVuZGVyZXIucmVuZGVyVGV4dHVyZS5jdXJyZW50LFxyXG4gICAgICAgICAgICB0aGlzLnNvdXJjZUZyYW1lLFxyXG4gICAgICAgICAgICB0aGlzLmRlc3RpbmF0aW9uRnJhbWUsXHJcbiAgICAgICAgKTtcclxuICAgICAgICBzdXBlci5yZW5kZXIocmVuZGVyZXIpO1xyXG4gICAgICAgIHJlbmRlcmVyLmJhdGNoLmZsdXNoKCk7XHJcblxyXG4gICAgICAgIHJlbmRlcmVyLmJhdGNoLmZsdXNoKCk7XHJcbiAgICAgICAgcmVuZGVyZXIucHJvamVjdGlvbi5wcm9qZWN0aW9uTWF0cml4LmlkZW50aXR5KCk7XHJcbiAgICAgICAgcmVuZGVyZXIucHJvamVjdGlvbi50cmFuc2Zvcm0gPSBudWxsO1xyXG4gICAgICAgIHJlbmRlcmVyLnJlbmRlclRleHR1cmUuYmluZChudWxsKTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBXb3JsZEhlbHBlciB7XHJcblxyXG4gICAgJGNvbnRhaW5lck91dGVyOiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG4gICAgJGNvbnRhaW5lcklubmVyOiBKUXVlcnk8SFRNTEVsZW1lbnQ+O1xyXG4gICAgYXBwOiBQSVhJLkFwcGxpY2F0aW9uO1xyXG4gICAgc3RhZ2U6IFdvcmxkQ29udGFpbmVyO1xyXG5cclxuICAgIGFjdEFjdG9yczogQWN0b3JEYXRhW10gPSBbXTtcclxuICAgIGtleVByZXNzZWRBY3RvcnM6IEFjdG9yRGF0YVtdID0gW107XHJcbiAgICBrZXlVcEFjdG9yczogQWN0b3JEYXRhW10gPSBbXTtcclxuICAgIGtleURvd25BY3RvcnM6IEFjdG9yRGF0YVtdID0gW107XHJcbiAgICBhY3RvckhlbHBlcnNUb0Rlc3Ryb3k6IEFjdG9ySGVscGVyW10gPSBbXTtcclxuXHJcbiAgICBtb3VzZUxpc3RlbmVyU2hhcGVzOiBNb3VzZUxpc3RlbmVyU2hhcGVEYXRhW10gPSBbXTtcclxuICAgIG1vdXNlTGlzdGVuZXJzOiBNb3VzZUxpc3RlbmVyRGF0YVtdID0gW107XHJcblxyXG4gICAgaW50ZXJwcmV0ZXI6IEludGVycHJldGVyO1xyXG4gICAgYWN0b3JzRmluaXNoZWQ6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgc3VtbWVkRGVsdGE6IG51bWJlciA9IDA7XHJcblxyXG4gICAgZGVmYXVsdEdyb3VwOiBHcm91cEhlbHBlcjtcclxuXHJcbiAgICBpbml0aWFsV2lkdGg6IG51bWJlcjtcclxuICAgIGluaXRpYWxIZWlnaHQ6IG51bWJlcjtcclxuXHJcbiAgICAkY29vcmRpbmF0ZURpdjogSlF1ZXJ5PEhUTUxFbGVtZW50PjtcclxuXHJcbiAgICBwdWJsaWMgc2NhbGVkVGV4dHVyZXM6IHsgW25hbWU6IHN0cmluZ106IFBJWEkuVGV4dHVyZSB9ID0ge307XHJcblxyXG5cclxuICAgIHNoYXBlczogU2hhcGVIZWxwZXJbXSA9IFtdOyAgICAgLy8gYWxsIHNoYXBlcyBpbmNsLiBncm91cHMgdGhhdCBhcmVuJ3QgcGFydCBvZiBhIGdyb3VwXHJcblxyXG4gICAgY3VycmVudExlZnQ6IG51bWJlcjtcclxuICAgIGN1cnJlbnRUb3A6IG51bWJlcjtcclxuICAgIGN1cnJlbnRXaWR0aDogbnVtYmVyO1xyXG4gICAgY3VycmVudEhlaWdodDogbnVtYmVyO1xyXG5cclxuICAgIHNoYXBlc05vdEFmZmVjdGVkQnlXb3JsZFRyYW5zZm9ybXM6IFNoYXBlSGVscGVyW10gPSBbXTtcclxuXHJcbiAgICBnbG9iYWxTY2FsZTogbnVtYmVyO1xyXG5cclxuICAgIHJvYm90V29ybGRIZWxwZXI6IGFueTtcclxuXHJcbiAgICB0aWNrZXJGdW5jdGlvbjogKHQ6IG51bWJlcikgPT4gdm9pZDtcclxuXHJcbiAgICBjbGVhckFjdG9yTGlzdHMoKSB7XHJcbiAgICAgICAgdGhpcy5hY3RBY3RvcnMgPSBbXTtcclxuICAgICAgICB0aGlzLmtleVByZXNzZWRBY3RvcnMgPSBbXTtcclxuICAgICAgICB0aGlzLmtleVVwQWN0b3JzID0gW107XHJcbiAgICAgICAgdGhpcy5rZXlEb3duQWN0b3JzID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IocHVibGljIHdpZHRoOiBudW1iZXIsIHB1YmxpYyBoZWlnaHQ6IG51bWJlciwgcHJpdmF0ZSBtb2R1bGU6IE1vZHVsZSwgcHVibGljIHdvcmxkOiBSdW50aW1lT2JqZWN0KSB7XHJcblxyXG4gICAgICAgIFBJWEkuc2V0dGluZ3MuU0NBTEVfTU9ERSA9IFBJWEkuU0NBTEVfTU9ERVMuTkVBUkVTVDtcclxuICAgICAgICBQSVhJLnNldHRpbmdzLlRBUkdFVF9GUE1TID0gMzAuMCAvIDEwMDAuMDtcclxuXHJcbiAgICAgICAgdGhpcy5nbG9iYWxTY2FsZSA9IDE7XHJcblxyXG4gICAgICAgIHdoaWxlIChoZWlnaHQgPiAxMDAwIHx8IHdpZHRoID4gMjAwMCkge1xyXG4gICAgICAgICAgICB0aGlzLmdsb2JhbFNjYWxlICo9IDI7XHJcbiAgICAgICAgICAgIGhlaWdodCAvPSAyO1xyXG4gICAgICAgICAgICB3aWR0aCAvPSAyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pbml0aWFsSGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsV2lkdGggPSB0aGlzLndpZHRoO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRMZWZ0ID0gMDtcclxuICAgICAgICB0aGlzLmN1cnJlbnRUb3AgPSAwO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFdpZHRoID0gdGhpcy53aWR0aDtcclxuICAgICAgICB0aGlzLmN1cnJlbnRIZWlnaHQgPSB0aGlzLmhlaWdodDtcclxuXHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlciA9IHRoaXMubW9kdWxlPy5tYWluPy5nZXRJbnRlcnByZXRlcigpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pbnRlcnByZXRlci5wcm9jZXNzaW5nSGVscGVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkRpZSBoZXJrw7ZtbWxpY2hlIEdyYWZpa2F1c2dhYmUga2FubiBuaWNodCB6dXNhbW1lbiBtaXQgUHJvY2Vzc2luZyBnZW51dHp0IHdlcmRlbi5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5pbnRlcnByZXRlci53b3JsZEhlbHBlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJFcyBkYXJmIG51ciBlaW4gV29ybGQtT2JqZWt0IGluc3RhbnppZXJ0IHdlcmRlbi5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmludGVycHJldGVyLndvcmxkSGVscGVyID0gdGhpcztcclxuXHJcbiAgICAgICAgbGV0ICRncmFwaGljc0RpdiA9IHRoaXMubW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS5wcmludE1hbmFnZXIuZ2V0R3JhcGhpY3NEaXYoKTtcclxuICAgICAgICB0aGlzLiRjb29yZGluYXRlRGl2ID0gdGhpcy5tb2R1bGUubWFpbi5nZXRSaWdodERpdigpLiRyaWdodERpdi5maW5kKFwiLmpvX2Nvb3JkaW5hdGVzXCIpO1xyXG5cclxuICAgICAgICBsZXQgZiA9ICgpID0+IHtcclxuICAgICAgICAgICAgbGV0ICRqb190YWJzID0gJGdyYXBoaWNzRGl2LnBhcmVudHMoXCIuam9fdGFic1wiKTtcclxuICAgICAgICAgICAgaWYgKCRqb190YWJzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAkam9fdGFicyA9ICRncmFwaGljc0Rpdi5wYXJlbnRzKFwiLmpvZV9yaWdodERpdklubmVyXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBtYXhXaWR0aDogbnVtYmVyID0gJGpvX3RhYnMud2lkdGgoKTtcclxuICAgICAgICAgICAgbGV0IG1heEhlaWdodDogbnVtYmVyID0gJGpvX3RhYnMuaGVpZ2h0KCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoaGVpZ2h0IC8gd2lkdGggPiBtYXhIZWlnaHQgLyBtYXhXaWR0aCkge1xyXG4gICAgICAgICAgICAgICAgJGdyYXBoaWNzRGl2LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgJ3dpZHRoJzogd2lkdGggLyBoZWlnaHQgKiBtYXhIZWlnaHQgKyBcInB4XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2hlaWdodCc6IG1heEhlaWdodCArIFwicHhcIixcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAkZ3JhcGhpY3NEaXYuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAnaGVpZ2h0JzogaGVpZ2h0IC8gd2lkdGggKiBtYXhXaWR0aCArIFwicHhcIixcclxuICAgICAgICAgICAgICAgICAgICAnd2lkdGgnOiBtYXhXaWR0aCArIFwicHhcIixcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkZ3JhcGhpY3NEaXYub2ZmKCdzaXplQ2hhbmdlZCcpO1xyXG4gICAgICAgICRncmFwaGljc0Rpdi5vbignc2l6ZUNoYW5nZWQnLCBmKTtcclxuXHJcbiAgICAgICAgZigpO1xyXG5cclxuICAgICAgICB0aGlzLiRjb250YWluZXJPdXRlciA9IGpRdWVyeSgnPGRpdj48L2Rpdj4nKTtcclxuICAgICAgICB0aGlzLiRjb250YWluZXJJbm5lciA9IGpRdWVyeSgnPGRpdj48L2Rpdj4nKTtcclxuICAgICAgICB0aGlzLiRjb250YWluZXJPdXRlci5hcHBlbmQodGhpcy4kY29udGFpbmVySW5uZXIpO1xyXG5cclxuICAgICAgICAkZ3JhcGhpY3NEaXYuYXBwZW5kKHRoaXMuJGNvbnRhaW5lck91dGVyKTtcclxuXHJcbiAgICAgICAgJGdyYXBoaWNzRGl2LnNob3coKTtcclxuXHJcbiAgICAgICAgJGdyYXBoaWNzRGl2WzBdLm9uY29udGV4dG1lbnUgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubW9kdWxlLm1haW4ucGl4aUFwcCkge1xyXG4gICAgICAgICAgICB0aGlzLmFwcCA9IHRoaXMubW9kdWxlLm1haW4ucGl4aUFwcDtcclxuICAgICAgICAgICAgdGhpcy5hcHAucmVuZGVyZXIucmVzaXplKHdpZHRoLCBoZWlnaHQpO1xyXG4gICAgICAgICAgICB0aGlzLmFwcC5yZW5kZXJlci5iYWNrZ3JvdW5kQ29sb3IgPSAweDA7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5hcHAgPSBuZXcgUElYSS5BcHBsaWNhdGlvbih7XHJcbiAgICAgICAgICAgICAgICBhbnRpYWxpYXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogd2lkdGgsIGhlaWdodDogaGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgLy9yZXNpemVUbzogJGNvbnRhaW5lcklubmVyWzBdXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLm1vZHVsZS5tYWluLnBpeGlBcHAgPSB0aGlzLmFwcDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgdGhpcy50aWNrZXJGdW5jdGlvbiA9IChkZWx0YSkgPT4ge1xyXG4gICAgICAgICAgICB0aGF0LnRpY2soUElYSS5UaWNrZXIuc2hhcmVkLmVsYXBzZWRNUyk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5hcHAudGlja2VyLmFkZCh0aGlzLnRpY2tlckZ1bmN0aW9uKTtcclxuICAgICAgICB0aGlzLmFwcC50aWNrZXIubWF4RlBTID0gMzA7XHJcblxyXG4gICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGltZXJFeHRlcm4gPSB0cnVlO1xyXG5cclxuICAgICAgICBsZXQgc291cmNlRnJhbWUgPSBuZXcgUElYSS5SZWN0YW5nbGUoMCwgMCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xyXG4gICAgICAgIGxldCBkZXN0aW5hdGlvbkZyYW1lID0gbmV3IFBJWEkuUmVjdGFuZ2xlKDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xyXG4gICAgICAgIHRoaXMuc3RhZ2UgPSBuZXcgV29ybGRDb250YWluZXIoc291cmNlRnJhbWUsIGRlc3RpbmF0aW9uRnJhbWUpO1xyXG4gICAgICAgIHRoaXMuc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybSA9IG5ldyBQSVhJLk1hdHJpeCgpO1xyXG5cclxuICAgICAgICB0aGlzLmFwcC5zdGFnZS5hZGRDaGlsZCh0aGlzLnN0YWdlKTtcclxuXHJcbiAgICAgICAgdGhpcy4kY29udGFpbmVySW5uZXIuYXBwZW5kKHRoaXMuYXBwLnZpZXcpO1xyXG5cclxuICAgICAgICB0aGlzLmludGVycHJldGVyLmtleWJvYXJkVG9vbC5rZXlQcmVzc2VkQ2FsbGJhY2tzLnB1c2goKGtleSkgPT4ge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBrcGEgb2YgdGhhdC5rZXlQcmVzc2VkQWN0b3JzKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhhdC5ydW5BY3RvcldoZW5LZXlFdmVudChrcGEsIGtleSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIua2V5Ym9hcmRUb29sLmtleVVwQ2FsbGJhY2tzLnB1c2goKGtleSkgPT4ge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBrcGEgb2YgdGhhdC5rZXlVcEFjdG9ycykge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoYXQucnVuQWN0b3JXaGVuS2V5RXZlbnQoa3BhLCBrZXkpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmludGVycHJldGVyLmtleWJvYXJkVG9vbC5rZXlEb3duQ2FsbGJhY2tzLnB1c2goKGtleSkgPT4ge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBrcGEgb2YgdGhhdC5rZXlEb3duQWN0b3JzKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhhdC5ydW5BY3RvcldoZW5LZXlFdmVudChrcGEsIGtleSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG5cclxuICAgICAgICBmb3IgKGxldCBsaXN0ZW5lclR5cGUgb2YgW1wibW91c2V1cFwiLCBcIm1vdXNlZG93blwiLCBcIm1vdXNlbW92ZVwiLCBcIm1vdXNlZW50ZXJcIiwgXCJtb3VzZWxlYXZlXCJdKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgZXZlbnRUeXBlID0gbGlzdGVuZXJUeXBlO1xyXG4gICAgICAgICAgICBpZiAod2luZG93LlBvaW50ZXJFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnRUeXBlID0gZXZlbnRUeXBlLnJlcGxhY2UoJ21vdXNlJywgJ3BvaW50ZXInKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy4kY29udGFpbmVySW5uZXIub24oZXZlbnRUeXBlLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHggPSB3aWR0aCAqIGUub2Zmc2V0WCAvIHRoaXMuJGNvbnRhaW5lcklubmVyLndpZHRoKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgeSA9IGhlaWdodCAqIGUub2Zmc2V0WSAvIHRoaXMuJGNvbnRhaW5lcklubmVyLmhlaWdodCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwID0gbmV3IFBJWEkuUG9pbnQoeCAqIHRoaXMuZ2xvYmFsU2NhbGUsIHkgKiB0aGlzLmdsb2JhbFNjYWxlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS5hcHBseUludmVyc2UocCwgcCk7XHJcbiAgICAgICAgICAgICAgICB4ID0gcC54O1xyXG4gICAgICAgICAgICAgICAgeSA9IHAueTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGF0Lm9uTW91c2VFdmVudChsaXN0ZW5lclR5cGUsIHgsIHksIGUuYnV0dG9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBsaXN0ZW5lciBvZiB0aGlzLm1vdXNlTGlzdGVuZXJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyLnR5cGVzW2xpc3RlbmVyVHlwZV0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmludm9rZU1vdXNlTGlzdGVuZXIobGlzdGVuZXIsIGxpc3RlbmVyVHlwZSwgeCwgeSwgZS5idXR0b24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXJUeXBlID09IFwibW91c2Vkb3duXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZ25nRXJlaWduaXNiZWhhbmRsdW5nID0gdGhpcy5pbnRlcnByZXRlci5nbmdFcmVpZ25pc2JlaGFuZGx1bmdIZWxwZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGduZ0VyZWlnbmlzYmVoYW5kbHVuZyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGduZ0VyZWlnbmlzYmVoYW5kbHVuZy5oYW5kbGVNb3VzZUNsaWNrZWRFdmVudCh4LCB5KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCAkY29vcmRpbmF0ZURpdiA9IHRoaXMuJGNvb3JkaW5hdGVEaXY7XHJcblxyXG4gICAgICAgIGxldCBtb3VzZVBvaW50ZXIgPSB3aW5kb3cuUG9pbnRlckV2ZW50ID8gXCJwb2ludGVyXCIgOiBcIm1vdXNlXCI7XHJcblxyXG4gICAgICAgIHRoaXMuJGNvbnRhaW5lcklubmVyLm9uKG1vdXNlUG9pbnRlciArIFwibW92ZVwiLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgeCA9IHdpZHRoICogZS5vZmZzZXRYIC8gdGhpcy4kY29udGFpbmVySW5uZXIud2lkdGgoKTtcclxuICAgICAgICAgICAgbGV0IHkgPSBoZWlnaHQgKiBlLm9mZnNldFkgLyB0aGlzLiRjb250YWluZXJJbm5lci5oZWlnaHQoKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBwID0gbmV3IFBJWEkuUG9pbnQoeCAqIHRoaXMuZ2xvYmFsU2NhbGUsIHkgKiB0aGlzLmdsb2JhbFNjYWxlKTtcclxuICAgICAgICAgICAgdGhpcy5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtLmFwcGx5SW52ZXJzZShwLCBwKTtcclxuICAgICAgICAgICAgeCA9IE1hdGgucm91bmQocC54KTtcclxuICAgICAgICAgICAgeSA9IE1hdGgucm91bmQocC55KTtcclxuICAgICAgICAgICAgJGNvb3JkaW5hdGVEaXYudGV4dChgKCR7eH0vJHt5fSlgKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy4kY29udGFpbmVySW5uZXIub24obW91c2VQb2ludGVyICsgXCJlbnRlclwiLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAkY29vcmRpbmF0ZURpdi5zaG93KCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuJGNvbnRhaW5lcklubmVyLm9uKG1vdXNlUG9pbnRlciArIFwibGVhdmVcIiwgKGUpID0+IHtcclxuICAgICAgICAgICAgJGNvb3JkaW5hdGVEaXYuaGlkZSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLm1vZHVsZS5tYWluLmdldFJpZ2h0RGl2KCk/LmFkanVzdFdpZHRoVG9Xb3JsZCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb21wdXRlQ3VycmVudFdvcmxkQm91bmRzKCkge1xyXG5cclxuICAgICAgICBsZXQgcDE6IFBJWEkuUG9pbnQgPSBuZXcgUElYSS5Qb2ludCgwLCAwKTtcclxuICAgICAgICB0aGlzLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0uYXBwbHlJbnZlcnNlKHAxLCBwMSk7XHJcblxyXG4gICAgICAgIGxldCBwMjogUElYSS5Qb2ludCA9IG5ldyBQSVhJLlBvaW50KHRoaXMuaW5pdGlhbFdpZHRoLCB0aGlzLmluaXRpYWxIZWlnaHQpO1xyXG4gICAgICAgIHRoaXMuc3RhZ2UucHJvamVjdGlvblRyYW5zZm9ybS5hcHBseUludmVyc2UocDIsIHAyKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50TGVmdCA9IHAxLng7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50VG9wID0gcDEueTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRXaWR0aCA9IE1hdGguYWJzKHAyLnggLSBwMS54KTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRIZWlnaHQgPSBNYXRoLmFicyhwMi55IC0gcDEueSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGhhc0FjdG9ycygpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hY3RBY3RvcnMubGVuZ3RoID4gMCB8fCB0aGlzLmtleVByZXNzZWRBY3RvcnMubGVuZ3RoID4gMCB8fCB0aGlzLmtleVVwQWN0b3JzLmxlbmd0aCA+IDBcclxuICAgICAgICAgICAgfHwgdGhpcy5rZXlEb3duQWN0b3JzLmxlbmd0aCA+IDAgfHwgdGhpcy5tb3VzZUxpc3RlbmVycy5sZW5ndGggPiAwIHx8IHRoaXMubW91c2VMaXN0ZW5lclNoYXBlcy5sZW5ndGggPiAwO1xyXG4gICAgfVxyXG5cclxuICAgIHNldEFsbEhpdHBvbHlnb25zRGlydHkoKSB7XHJcbiAgICAgICAgZm9yIChsZXQgc2hhcGUgb2YgdGhpcy5zaGFwZXMpIHtcclxuICAgICAgICAgICAgc2hhcGUuc2V0SGl0UG9seWdvbkRpcnR5KHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZXRDdXJzb3IoY3Vyc29yOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLiRjb250YWluZXJJbm5lci5jc3MoJ2N1cnNvcicsIGN1cnNvcik7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGFjdG9yc05vdEZpbmlzaGVkOiBudW1iZXIgPSAwO1xyXG4gICAgdGlja3M6IG51bWJlciA9IDA7XHJcbiAgICBkZWx0YVN1bTogbnVtYmVyID0gMDtcclxuXHJcbiAgICBzcHJpdGVBbmltYXRpb25zOiBTcHJpdGVIZWxwZXJbXSA9IFtdO1xyXG5cclxuICAgIHRpY2soZGVsdGE6IGFueSkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pbnRlcnByZXRlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pbnRlcnByZXRlci5zdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJbnRlcnByZXRlclN0YXRlLnJ1bm5pbmc6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdW1tZWREZWx0YSArPSBkZWx0YTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBzcHJpdGVIZWxwZXIgb2YgdGhpcy5zcHJpdGVBbmltYXRpb25zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwcml0ZUhlbHBlci50aWNrKGRlbHRhKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5hY3RvcnNGaW5pc2hlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdG9yc05vdEZpbmlzaGVkKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaW50ZXJwcmV0ZXIucGF1c2VVbnRpbCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpcnN0OiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgYWN0b3JEYXRhIG9mIHRoaXMuYWN0QWN0b3JzKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYWN0b3JIZWxwZXIgPSBhY3RvckRhdGEuYWN0b3JIZWxwZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3RvckhlbHBlci50aW1lclBhdXNlZCB8fCBhY3RvckhlbHBlci5pc0Rlc3Ryb3llZCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJvZ3JhbSA9IGFjdG9yRGF0YS5tZXRob2Q/LnByb2dyYW07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucnVuQWN0b3IoZmlyc3QsIGFjdG9yRGF0YSwgdGhpcy5zdW1tZWREZWx0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9ncmFtICE9IG51bGwgJiYgIWFjdG9yRGF0YS5hY3RvckhlbHBlci5pc0Rlc3Ryb3llZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3QgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWN0b3JzRmluaXNoZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSW50ZXJwcmV0ZXJTdGF0ZS5kb25lOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBJbnRlcnByZXRlclN0YXRlLmVycm9yOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBJbnRlcnByZXRlclN0YXRlLm5vdF9pbml0aWFsaXplZDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyQWN0b3JMaXN0cygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgdGhpcy5zdW1tZWREZWx0YSA9IDA7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5pbnRlcnByZXRlci5zdGF0ZSA9PSBJbnRlcnByZXRlclN0YXRlLnJ1bm5pbmcpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdEFjdG9ycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aW1lckZ1bmN0aW9uKDMzLjMzLCB0cnVlLCAwLjUpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmludGVycHJldGVyLnN0YXRlID09IEludGVycHJldGVyU3RhdGUucnVubmluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRpbWVyU3RvcHBlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRpbWVyRnVuY3Rpb24oMzMuMzMsIGZhbHNlLCAwLjA4KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGltZXJGdW5jdGlvbigzMy4zMywgZmFsc2UsIDAuNyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdoaWxlICh0aGlzLmFjdG9ySGVscGVyc1RvRGVzdHJveS5sZW5ndGggPiAwKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgYWN0b3JIZWxwZXIgPSB0aGlzLmFjdG9ySGVscGVyc1RvRGVzdHJveS5wb3AoKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGFjdG9yTGlzdCBvZiBbdGhpcy5rZXlQcmVzc2VkQWN0b3JzLCB0aGlzLmtleVVwQWN0b3JzLCB0aGlzLmtleURvd25BY3RvcnNdKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFjdG9yTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvckxpc3RbaV0uYWN0b3JIZWxwZXIgPT09IGFjdG9ySGVscGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yTGlzdC5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubW91c2VMaXN0ZW5lclNoYXBlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubW91c2VMaXN0ZW5lclNoYXBlc1tpXS5zaGFwZUhlbHBlciA9PT0gYWN0b3JIZWxwZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdXNlTGlzdGVuZXJTaGFwZXMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmFjdEFjdG9ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0QWN0b3JzW2ldLmFjdG9ySGVscGVyID09PSBhY3RvckhlbHBlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWN0QWN0b3JzLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBkaXNwbGF5T2JqZWN0ID0gKDxTaGFwZUhlbHBlcj5hY3RvckhlbHBlcikuZGlzcGxheU9iamVjdDtcclxuICAgICAgICAgICAgaWYgKGRpc3BsYXlPYmplY3QgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZGlzcGxheU9iamVjdC5kZXN0cm95KCk7XHJcbiAgICAgICAgICAgICAgICAoPFNoYXBlSGVscGVyPmFjdG9ySGVscGVyKS5kaXNwbGF5T2JqZWN0ID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldEJhY2tncm91bmRDb2xvcihjb2xvcjogc3RyaW5nIHwgbnVtYmVyIHwgUnVudGltZU9iamVjdCkge1xyXG5cclxuICAgICAgICBpZiAoY29sb3IgaW5zdGFuY2VvZiBSdW50aW1lT2JqZWN0KSB7XHJcbiAgICAgICAgICAgIGNvbG9yID0gKDxDb2xvckNsYXNzSW50cmluc2ljRGF0YT4oY29sb3IuaW50cmluc2ljRGF0YSkpLmhleDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2YgY29sb3IgPT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICBsZXQgYyA9IENvbG9ySGVscGVyLnBhcnNlQ29sb3JUb09wZW5HTChjb2xvcik7XHJcbiAgICAgICAgICAgIHRoaXMuYXBwLnJlbmRlcmVyLmJhY2tncm91bmRDb2xvciA9IGMuY29sb3I7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5hcHAucmVuZGVyZXIuYmFja2dyb3VuZENvbG9yID0gY29sb3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBydW5BY3RvcldoZW5LZXlFdmVudChhY3RvckRhdGE6IEFjdG9yRGF0YSwga2V5OiBzdHJpbmcpIHtcclxuXHJcbiAgICAgICAgbGV0IHByb2dyYW0gPSBhY3RvckRhdGEubWV0aG9kPy5wcm9ncmFtO1xyXG4gICAgICAgIGxldCBpbnZva2UgPSBhY3RvckRhdGEubWV0aG9kPy5pbnZva2U7XHJcblxyXG4gICAgICAgIGxldCBydG8gPSBhY3RvckRhdGEuYWN0b3JIZWxwZXIucnVudGltZU9iamVjdDtcclxuXHJcbiAgICAgICAgbGV0IHN0YWNrRWxlbWVudHM6IFZhbHVlW10gPSBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IHJ0by5jbGFzcyxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBydG9cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBrZXlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIF07XHJcblxyXG4gICAgICAgIGlmIChwcm9ncmFtICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci5ydW5UaW1lcihhY3RvckRhdGEubWV0aG9kLCBzdGFja0VsZW1lbnRzLCBudWxsLCBmYWxzZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChpbnZva2UgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpbnZva2UoW10pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgcnVuQWN0b3IoZmlyc3Q6IGJvb2xlYW4sIGFjdG9yRGF0YTogQWN0b3JEYXRhLCBkZWx0YTogbnVtYmVyKSB7XHJcblxyXG4gICAgICAgIGxldCBwcm9ncmFtID0gYWN0b3JEYXRhLm1ldGhvZD8ucHJvZ3JhbTtcclxuICAgICAgICBsZXQgaW52b2tlID0gYWN0b3JEYXRhLm1ldGhvZD8uaW52b2tlO1xyXG5cclxuICAgICAgICBsZXQgcnRvID0gYWN0b3JEYXRhLmFjdG9ySGVscGVyLnJ1bnRpbWVPYmplY3Q7XHJcblxyXG4gICAgICAgIGxldCBzdGFja0VsZW1lbnRzOiBWYWx1ZVtdID0gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBydG8uY2xhc3MsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogcnRvXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgaWYgKGFjdG9yRGF0YS5tZXRob2QuZ2V0UGFyYW1ldGVyQ291bnQoKSA+IDApIHtcclxuICAgICAgICAgICAgc3RhY2tFbGVtZW50cy5wdXNoKFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGRlbHRhXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICBpZiAocHJvZ3JhbSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIucnVuVGltZXIoYWN0b3JEYXRhLm1ldGhvZCwgc3RhY2tFbGVtZW50cywgZmlyc3QgPyAoaW50ZXJwcmV0ZXIpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoYXQuYWN0b3JzRmluaXNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0ZXIudGltZXJTdG9wcGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSA6IG51bGwsIHRydWUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoaW52b2tlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaW52b2tlKFtdKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2FjaGVBc0JpdG1hcCgpIHtcclxuXHJcbiAgICAgICAgbGV0IGhhc1JvYm90ID0gdGhpcy5yb2JvdFdvcmxkSGVscGVyICE9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMubW91c2VMaXN0ZW5lclNoYXBlcyA9IFtdO1xyXG5cclxuICAgICAgICBsZXQgc2NhbGVNaW4gPSAxLjA7XHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFdpZHRoICogdGhpcy5jdXJyZW50SGVpZ2h0ID4gMjUwMDAwMCkgc2NhbGVNaW4gPSBNYXRoLnNxcnQoMjUwMDAwMCAvICh0aGlzLmN1cnJlbnRXaWR0aCAqIHRoaXMuY3VycmVudEhlaWdodCkpO1xyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRXaWR0aCAqIHRoaXMuY3VycmVudEhlaWdodCA8IDEwMjQgKiAxMDI0KSBzY2FsZU1pbiA9IE1hdGguc3FydCgxMDI0ICogMTAyNCAvICh0aGlzLmN1cnJlbnRXaWR0aCAqIHRoaXMuY3VycmVudEhlaWdodCkpO1xyXG5cclxuICAgICAgICBjb25zdCBicnQgPSBuZXcgUElYSS5CYXNlUmVuZGVyVGV4dHVyZShcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgc2NhbGVNb2RlOiBQSVhJLlNDQUxFX01PREVTLkxJTkVBUixcclxuICAgICAgICAgICAgICAgIHdpZHRoOiBNYXRoLnJvdW5kKHRoaXMuY3VycmVudFdpZHRoICogc2NhbGVNaW4pLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBNYXRoLnJvdW5kKHRoaXMuY3VycmVudEhlaWdodCAqIHNjYWxlTWluKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuICAgICAgICBsZXQgcnQ6IFBJWEkuUmVuZGVyVGV4dHVyZSA9IG5ldyBQSVhJLlJlbmRlclRleHR1cmUoYnJ0KTtcclxuXHJcbiAgICAgICAgbGV0IHRyYW5zZm9ybSA9IG5ldyBQSVhJLk1hdHJpeCgpLnNjYWxlKHNjYWxlTWluLCBzY2FsZU1pbik7XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIWhhc1JvYm90KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFwcC5yZW5kZXJlci5yZW5kZXIodGhpcy5zdGFnZSwge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlclRleHR1cmU6IHJ0LFxyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogdHJhbnNmb3JtXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YWdlLmNoaWxkcmVuLmZvckVhY2goYyA9PiBjLmRlc3Ryb3koKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFnZS5yZW1vdmVDaGlsZHJlbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3ByaXRlID0gbmV3IFBJWEkuU3ByaXRlKHJ0KTtcclxuICAgICAgICAgICAgICAgICAgICBzcHJpdGUubG9jYWxUcmFuc2Zvcm0uc2NhbGUodGhpcy5nbG9iYWxTY2FsZSwgdGhpcy5nbG9iYWxTY2FsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZGVidWdnZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc3ByaXRlLmxvY2FsVHJhbnNmb3JtLnRyYW5zbGF0ZSgwLCBydC5oZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZS50cmFuc2Zvcm0ub25DaGFuZ2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLnN0YWdlLnByb2plY3Rpb25UcmFuc2Zvcm0gPSBuZXcgUElYSS5NYXRyaXgoKS5zY2FsZSgxLCAtMSkudHJhbnNsYXRlKDAsIHRoaXMuY3VycmVudEhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFnZS5wcm9qZWN0aW9uVHJhbnNmb3JtID0gbmV3IFBJWEkuTWF0cml4KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFnZS5hZGRDaGlsZChzcHJpdGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIH0sIDMwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCAxNTApOyAgIC8vIG5lY2Vzc2FyeSB0byBhd2FpdCBUdXJ0bGUncyBkZWZlcnJlZCByZW5kZXJpbmdcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZGVzdHJveVdvcmxkKCkge1xyXG4gICAgICAgIGZvciAobGV0IGxpc3RlbmVyVHlwZSBvZiBbXCJtb3VzZXVwXCIsIFwibW91c2Vkb3duXCIsIFwibW91c2Vtb3ZlXCIsIFwibW91c2VlbnRlclwiLCBcIm1vdXNlbGVhdmVcIl0pIHtcclxuICAgICAgICAgICAgdGhpcy4kY29udGFpbmVySW5uZXIub2ZmKGxpc3RlbmVyVHlwZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc3ByaXRlQW5pbWF0aW9ucyA9IFtdO1xyXG4gICAgICAgIHRoaXMuYXBwLnRpY2tlci5yZW1vdmUodGhpcy50aWNrZXJGdW5jdGlvbik7XHJcblxyXG4gICAgICAgIHRoaXMuYXBwLnN0YWdlLmNoaWxkcmVuLmZvckVhY2goYyA9PiBjLmRlc3Ryb3koKSk7XHJcbiAgICAgICAgdGhpcy5hcHAuc3RhZ2UucmVtb3ZlQ2hpbGRyZW4oKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMucm9ib3RXb3JsZEhlbHBlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucm9ib3RXb3JsZEhlbHBlci5kZXN0cm95KCk7XHJcbiAgICAgICAgICAgIHRoaXMucm9ib3RXb3JsZEhlbHBlciA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBqUXVlcnkodGhpcy5hcHAudmlldykuZGV0YWNoKCk7XHJcblxyXG4gICAgICAgIHRoaXMuJGNvbnRhaW5lck91dGVyLnJlbW92ZSgpO1xyXG4gICAgICAgIHRoaXMubW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS5wcmludE1hbmFnZXIuZ2V0R3JhcGhpY3NEaXYoKS5oaWRlKCk7XHJcbiAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aW1lckV4dGVybiA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIud29ybGRIZWxwZXIgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuJGNvb3JkaW5hdGVEaXYuaGlkZSgpO1xyXG5cclxuICAgICAgICBGaWxsZWRTaGFwZURlZmF1bHRzLmluaXREZWZhdWx0VmFsdWVzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgb25Nb3VzZUV2ZW50KGxpc3RlbmVyVHlwZTogc3RyaW5nLCB4OiBudW1iZXIsIHk6IG51bWJlciwgYnV0dG9uOiBudW1iZXIpIHtcclxuXHJcbiAgICAgICAgc3dpdGNoIChsaXN0ZW5lclR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBcIm1vdXNlZG93blwiOlxyXG4gICAgICAgICAgICBjYXNlIFwibW91c2V1cFwiOlxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbGlzdGVuZXIgb2YgdGhpcy5tb3VzZUxpc3RlbmVyU2hhcGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoYXBlSGVscGVyOiBTaGFwZUhlbHBlciA9IGxpc3RlbmVyLnNoYXBlSGVscGVyO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXIudHlwZXNbbGlzdGVuZXJUeXBlXSAhPSBudWxsICYmIChzaGFwZUhlbHBlci5jb250YWluc1BvaW50KHgsIHkpIHx8IHNoYXBlSGVscGVyLnRyYWNrTW91c2VNb3ZlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmludm9rZVNoYXBlTW91c2VMaXN0ZW5lcihsaXN0ZW5lciwgbGlzdGVuZXJUeXBlLCB4LCB5LCBidXR0b24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJtb3VzZWVudGVyXCI6XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBsaXN0ZW5lciBvZiB0aGlzLm1vdXNlTGlzdGVuZXJTaGFwZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc2hhcGVIZWxwZXI6IFNoYXBlSGVscGVyID0gbGlzdGVuZXIuc2hhcGVIZWxwZXI7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lci50eXBlc1tsaXN0ZW5lclR5cGVdICE9IG51bGwgJiYgc2hhcGVIZWxwZXIuY29udGFpbnNQb2ludCh4LCB5KSAmJiAhc2hhcGVIZWxwZXIubW91c2VMYXN0U2Vlbkluc2lkZU9iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmludm9rZVNoYXBlTW91c2VMaXN0ZW5lcihsaXN0ZW5lciwgbGlzdGVuZXJUeXBlLCB4LCB5LCBidXR0b24sICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNoYXBlSGVscGVyLm1vdXNlTGFzdFNlZW5JbnNpZGVPYmplY3QgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJtb3VzZWxlYXZlXCI6XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBsaXN0ZW5lciBvZiB0aGlzLm1vdXNlTGlzdGVuZXJTaGFwZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc2hhcGVIZWxwZXI6IFNoYXBlSGVscGVyID0gbGlzdGVuZXIuc2hhcGVIZWxwZXI7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lci50eXBlc1tsaXN0ZW5lclR5cGVdICE9IG51bGwgJiYgc2hhcGVIZWxwZXIubW91c2VMYXN0U2Vlbkluc2lkZU9iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmludm9rZVNoYXBlTW91c2VMaXN0ZW5lcihsaXN0ZW5lciwgbGlzdGVuZXJUeXBlLCB4LCB5LCBidXR0b24sICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNoYXBlSGVscGVyLm1vdXNlTGFzdFNlZW5JbnNpZGVPYmplY3QgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwibW91c2Vtb3ZlXCI6XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBsaXN0ZW5lciBvZiB0aGlzLm1vdXNlTGlzdGVuZXJTaGFwZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc2hhcGVIZWxwZXI6IFNoYXBlSGVscGVyID0gbGlzdGVuZXIuc2hhcGVIZWxwZXI7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lci50eXBlc1tcIm1vdXNlbW92ZVwiXSAhPSBudWxsIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChsaXN0ZW5lci50eXBlc1tcIm1vdXNlZW50ZXJcIl0gIT0gbnVsbCAmJiAhc2hhcGVIZWxwZXIubW91c2VMYXN0U2Vlbkluc2lkZU9iamVjdCkgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGxpc3RlbmVyLnR5cGVzW1wibW91c2VsZWF2ZVwiXSAhPSBudWxsICYmIHNoYXBlSGVscGVyLm1vdXNlTGFzdFNlZW5JbnNpZGVPYmplY3QpXHJcbiAgICAgICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb250YWluc1BvaW50ID0gc2hhcGVIZWxwZXIuY29udGFpbnNQb2ludCh4LCB5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChzaGFwZUhlbHBlci50cmFja01vdXNlTW92ZSB8fCBjb250YWluc1BvaW50KSAmJiBsaXN0ZW5lci50eXBlc1tcIm1vdXNlbW92ZVwiXSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmludm9rZVNoYXBlTW91c2VMaXN0ZW5lcihsaXN0ZW5lciwgXCJtb3VzZW1vdmVcIiwgeCwgeSwgYnV0dG9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udGFpbnNQb2ludCAmJiBsaXN0ZW5lci50eXBlc1tcIm1vdXNlZW50ZXJcIl0gIT0gbnVsbCAmJiAhc2hhcGVIZWxwZXIubW91c2VMYXN0U2Vlbkluc2lkZU9iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZva2VTaGFwZU1vdXNlTGlzdGVuZXIobGlzdGVuZXIsIFwibW91c2VlbnRlclwiLCB4LCB5LCBidXR0b24sICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGFwZUhlbHBlci5tb3VzZUxhc3RTZWVuSW5zaWRlT2JqZWN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29udGFpbnNQb2ludCAmJiBsaXN0ZW5lci50eXBlc1tcIm1vdXNlbGVhdmVcIl0gIT0gbnVsbCAmJiBzaGFwZUhlbHBlci5tb3VzZUxhc3RTZWVuSW5zaWRlT2JqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmludm9rZVNoYXBlTW91c2VMaXN0ZW5lcihsaXN0ZW5lciwgXCJtb3VzZWxlYXZlXCIsIHgsIHksIGJ1dHRvbiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNoYXBlSGVscGVyLm1vdXNlTGFzdFNlZW5JbnNpZGVPYmplY3QgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGludm9rZVNoYXBlTW91c2VMaXN0ZW5lcihsaXN0ZW5lcjogTW91c2VMaXN0ZW5lclNoYXBlRGF0YSwgbGlzdGVuZXJUeXBlOiBzdHJpbmcsXHJcbiAgICAgICAgeDogbnVtYmVyLCB5OiBudW1iZXIsIGJ1dHRvbjogbnVtYmVyLCBjYWxsYmFjaz86ICgpID0+IHZvaWQpIHtcclxuXHJcbiAgICAgICAgaWYgKCFsaXN0ZW5lci5zaGFwZUhlbHBlci5yZWFjdFRvTW91c2VFdmVudHNXaGVuSW52aXNpYmxlICYmXHJcbiAgICAgICAgICAgICFsaXN0ZW5lci5zaGFwZUhlbHBlci5kaXNwbGF5T2JqZWN0LnZpc2libGUpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IG1ldGhvZCA9IGxpc3RlbmVyLm1ldGhvZHNbbGlzdGVuZXJUeXBlXTtcclxuICAgICAgICBsZXQgcHJvZ3JhbSA9IG1ldGhvZC5wcm9ncmFtO1xyXG4gICAgICAgIGxldCBpbnZva2UgPSBtZXRob2QuaW52b2tlO1xyXG5cclxuICAgICAgICBsZXQgcnRvID0gbGlzdGVuZXIuc2hhcGVIZWxwZXIucnVudGltZU9iamVjdDtcclxuXHJcbiAgICAgICAgbGV0IHN0YWNrRWxlbWVudHM6IFZhbHVlW10gPSBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IHJ0by5jbGFzcyxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBydG9cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB4XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IGRvdWJsZVByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogeVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgaWYgKGxpc3RlbmVyVHlwZSAhPSBcIm1vdXNlbW92ZVwiICYmIGxpc3RlbmVyVHlwZSAhPSBcIm1vdXNlZW50ZXJcIiAmJiBsaXN0ZW5lclR5cGUgIT0gXCJtb3VzZWxlYXZlXCIpIHtcclxuICAgICAgICAgICAgc3RhY2tFbGVtZW50cy5wdXNoKFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGJ1dHRvblxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHJvZ3JhbSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIucnVuVGltZXIobWV0aG9kLCBzdGFja0VsZW1lbnRzLCBjYWxsYmFjaywgZmFsc2UpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoaW52b2tlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaW52b2tlKFtdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGFkZE1vdXNlTGlzdGVuZXIobGlzdGVuZXI6IFJ1bnRpbWVPYmplY3QpIHtcclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICAgICAgSWYgYSBzaGFwZSBpcyByZWdpc3RlcmVkIGFzIE1vdXNlTGlzdGVuZXIgb2YgdGhlIHdvcmxkLW9iamVjdCwgaXQgZ2V0cyBhbGwgbW91c2UtZXZlbnRzIHR3aWNlLiBcclxuICAgICAgICAgICAgPT4gRGVyZWdpc3RlciBzaGFwZSBhcyBtb3VzZUxpc3RlbmVyU2hhcGUgYW5kIHJlZ2lzdGVyIGl0IGFzIG1vdXNlIGxpc3RlbmVyIGZvciB0aGUgd29ybGQgb2JqZWN0LlxyXG4gICAgICAgICovXHJcbiAgICAgICAgbGV0IGluZGV4OiBudW1iZXIgPSB0aGlzLm1vdXNlTGlzdGVuZXJTaGFwZXMuZmluZEluZGV4KChtbHMpID0+IHsgcmV0dXJuIG1scy5zaGFwZUhlbHBlci5ydW50aW1lT2JqZWN0ID09IGxpc3RlbmVyIH0pO1xyXG4gICAgICAgIGlmIChpbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMubW91c2VMaXN0ZW5lclNoYXBlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGxpc3RlbmVyVHlwZXMgPSBbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJNb3VzZVVwXCIsIHNpZ25hdHVyZTogXCIoZG91YmxlLCBkb3VibGUsIGludClcIiB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiTW91c2VEb3duXCIsIHNpZ25hdHVyZTogXCIoZG91YmxlLCBkb3VibGUsIGludClcIiB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiTW91c2VNb3ZlXCIsIHNpZ25hdHVyZTogXCIoZG91YmxlLCBkb3VibGUpXCIgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIk1vdXNlRW50ZXJcIiwgc2lnbmF0dXJlOiBcIihkb3VibGUsIGRvdWJsZSlcIiB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiTW91c2VMZWF2ZVwiLCBzaWduYXR1cmU6IFwiKGRvdWJsZSwgZG91YmxlKVwiIH0sXHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgbGV0IHNkOiBNb3VzZUxpc3RlbmVyRGF0YSA9IG51bGw7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGx0IG9mIGxpc3RlbmVyVHlwZXMpIHtcclxuICAgICAgICAgICAgbGV0IG1ldGhvZDogTWV0aG9kID0gKDxLbGFzcz5saXN0ZW5lci5jbGFzcykuZ2V0TWV0aG9kQnlTaWduYXR1cmUoXCJvblwiICsgbHQuaWRlbnRpZmllciArIGx0LnNpZ25hdHVyZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAobWV0aG9kPy5wcm9ncmFtICE9IG51bGwgJiYgbWV0aG9kLnByb2dyYW0uc3RhdGVtZW50cy5sZW5ndGggPiAyIHx8IG1ldGhvZD8uaW52b2tlICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2QgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNkID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcjogbGlzdGVuZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVzOiB7fSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kczoge31cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW91c2VMaXN0ZW5lcnMucHVzaChzZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc2QudHlwZXNbbHQuaWRlbnRpZmllci50b0xvd2VyQ2FzZSgpXSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBzZC5tZXRob2RzW2x0LmlkZW50aWZpZXIudG9Mb3dlckNhc2UoKV0gPSBtZXRob2Q7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgaW52b2tlTW91c2VMaXN0ZW5lcihsaXN0ZW5lcjogTW91c2VMaXN0ZW5lckRhdGEsIGxpc3RlbmVyVHlwZTogc3RyaW5nLFxyXG4gICAgICAgIHg6IG51bWJlciwgeTogbnVtYmVyLCBidXR0b246IG51bWJlciwgY2FsbGJhY2s/OiAoKSA9PiB2b2lkKSB7XHJcblxyXG4gICAgICAgIGxldCBtZXRob2QgPSBsaXN0ZW5lci5tZXRob2RzW2xpc3RlbmVyVHlwZV07XHJcbiAgICAgICAgbGV0IHByb2dyYW0gPSBtZXRob2QucHJvZ3JhbTtcclxuICAgICAgICBsZXQgaW52b2tlID0gbWV0aG9kLmludm9rZTtcclxuXHJcbiAgICAgICAgbGV0IHJ0byA9IGxpc3RlbmVyLmxpc3RlbmVyO1xyXG5cclxuICAgICAgICBsZXQgc3RhY2tFbGVtZW50czogVmFsdWVbXSA9IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogcnRvLmNsYXNzLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHJ0b1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBkb3VibGVQcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHhcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogZG91YmxlUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB5XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdO1xyXG5cclxuICAgICAgICBpZiAobGlzdGVuZXJUeXBlICE9IFwibW91c2Vtb3ZlXCIgJiYgbGlzdGVuZXJUeXBlICE9IFwibW91c2VlbnRlclwiICYmIGxpc3RlbmVyVHlwZSAhPSBcIm1vdXNlbGVhdmVcIikge1xyXG4gICAgICAgICAgICBzdGFja0VsZW1lbnRzLnB1c2goXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaW50UHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogYnV0dG9uXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwcm9ncmFtICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci5ydW5UaW1lcihtZXRob2QsIHN0YWNrRWxlbWVudHMsIGNhbGxiYWNrLCBmYWxzZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChpbnZva2UgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpbnZva2UoW10pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0RGVmYXVsdEdyb3VwKCk6IFJ1bnRpbWVPYmplY3Qge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRlZmF1bHRHcm91cD8ucnVudGltZU9iamVjdDtcclxuICAgIH1cclxuXHJcbn0iXX0=