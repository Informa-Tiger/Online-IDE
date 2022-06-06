import { Klass } from "../../../compiler/types/Class.js";
import { booleanPrimitiveType, intPrimitiveType, stringPrimitiveType } from "../../../compiler/types/PrimitiveTypes.js";
import { Method, Parameterlist } from "../../../compiler/types/Types.js";
import { RuntimeObject } from "../../../interpreter/RuntimeObject.js";
import { WorldHelper } from "../World.js";
import { RobotCubeFactory } from "./RobotCubeFactory.js";
export class RobotClass extends Klass {
    constructor(module) {
        super("Robot", module, "Robot Karol");
        this.setBaseClass(module.typeStore.getType("Object"));
        let robotWorldType = module.typeStore.getType("RobotWorld");
        // this.addAttribute(new Attribute("PI", doublePrimitiveType, (object) => { return Math.PI }, true, Visibility.public, true, "Die Kreiszahl Pi (3.1415...)"));
        this.addMethod(new Method("Robot", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let rh = new RobotHelper(module.main.getInterpreter(), o, 1, 1, 5, 8);
            o.intrinsicData["Robot"] = rh;
        }, false, false, 'Instanziert ein neues Robot-Objekt. Der Roboter steht anfangs an der Stelle (1/1)', true));
        this.addMethod(new Method("Robot", new Parameterlist([
            { identifier: "startX", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "startY", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let startX = parameters[1].value;
            let startY = parameters[2].value;
            let rh = new RobotHelper(module.main.getInterpreter(), o, startX, startY, 5, 10);
            o.intrinsicData["Robot"] = rh;
        }, false, false, 'Instanziert ein neues Robot-Objekt. Der Roboter wird anfangs an die Stelle (startX/startY) gesetzt.', true));
        this.addMethod(new Method("Robot", new Parameterlist([
            { identifier: "startX", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "startY", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "worldX", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "worldY", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let startX = parameters[1].value;
            let startY = parameters[2].value;
            let worldX = parameters[3].value;
            let worldY = parameters[4].value;
            let rh = new RobotHelper(module.main.getInterpreter(), o, startX, startY, worldX, worldY);
            o.intrinsicData["Robot"] = rh;
        }, false, false, 'Instanziert ein neues Robot-Objekt. Der Roboter wird anfangs an die Stelle (startX/startY) gesetzt. Wenn die RobotWorld noch nicht instanziert ist, wird sie mit der Größe worldX * worldY neu erstellt.', true));
        this.addMethod(new Method("Robot", new Parameterlist([
            { identifier: "startX", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "startY", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "initialeWelt", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let startX = parameters[1].value;
            let startY = parameters[2].value;
            let initialeWelt = parameters[3].value;
            let rh = new RobotHelper(module.main.getInterpreter(), o, startX, startY, 0, 0, initialeWelt);
            o.intrinsicData["Robot"] = rh;
        }, false, false, 'Instanziert ein neues Robot-Objekt. Der Roboter wird anfangs an die Stelle (startX/startY) gesetzt. Wenn die RobotWorld noch nicht instanziert ist, wird sie auf Grundlage des Strings initialeWelt erstellt.', true));
        this.addMethod(new Method("getWelt", new Parameterlist([]), robotWorldType, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            return rh.robotWorldHelper.runtimeObject;
        }, false, false, 'Gibt das RobotWorld-Objekt zurück', false));
        this.addMethod(new Method("rechtsDrehen", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            rh.direction.turnRight();
            rh.adjustAngle();
        }, false, false, 'Dreht den Roboter um 90° nach rechts.', false));
        this.addMethod(new Method("linksDrehen", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            rh.direction.turnLeft();
            rh.adjustAngle();
        }, false, false, 'Dreht den Roboter um 90° nach links.', false));
        this.addMethod(new Method("schritt", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            rh.schritt();
        }, false, false, 'Lässt den Roboter einen Schritt nach vorne gehen.', false));
        this.addMethod(new Method("schritt", new Parameterlist([
            { identifier: "Anzahl", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let anzahl = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            for (let i = 0; i < anzahl; i++) {
                if (!rh.schritt())
                    break;
            }
        }, false, false, 'Lässt den Roboter Anzahl Schritte nach vorne gehen.', false));
        this.addMethod(new Method("hinlegen", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            rh.hinlegen("rot");
        }, false, false, 'Lässt den Roboter einen roten Ziegel vor sich hinlegen.', false));
        this.addMethod(new Method("markeLöschen", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            rh.markeLöschen();
        }, false, false, 'Lässt den Roboter eine Marke, die direkt unter ihm liegt, löschen.', false));
        this.addMethod(new Method("markeSetzen", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            rh.markeSetzen("gelb");
        }, false, false, 'Lässt den Roboter eine gelbe Marke direkt unter sich setzen.', false));
        this.addMethod(new Method("markeSetzen", new Parameterlist([
            { identifier: "Farbe", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let farbe = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            rh.markeSetzen(farbe);
        }, false, false, 'Lässt den Roboter eine Marke der angegebenen Farbe direkt unter sich setzen.', false));
        this.addMethod(new Method("hinlegen", new Parameterlist([
            { identifier: "Anzahl", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let anzahl = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            for (let i = 0; i < anzahl; i++) {
                if (!rh.hinlegen("rot"))
                    break;
            }
        }, false, false, 'Lässt den Roboter Anzahl rote Ziegel vor sich hinlegen.', false));
        this.addMethod(new Method("hinlegen", new Parameterlist([
            { identifier: "Farbe", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let farbe = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            rh.hinlegen(farbe);
        }, false, false, 'Lässt den Roboter einen Ziegel der angegebenen Farbe vor sich hinlegen.', false));
        this.addMethod(new Method("aufheben", new Parameterlist([]), null, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            rh.aufheben();
        }, false, false, 'Lässt den Roboter einen roten Ziegel vor sich aufheben.', false));
        this.addMethod(new Method("aufheben", new Parameterlist([
            { identifier: "Anzahl", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let anzahl = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            for (let i = 0; i < anzahl; i++) {
                if (!rh.aufheben())
                    break;
            }
        }, false, false, 'Lässt den Roboter Anzahl rote Ziegel vor sich aufheben.', false));
        this.addMethod(new Method("warten", new Parameterlist([
            { identifier: "ZeitInMillisekunden", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), null, (parameters) => {
        }, false, false, "Pausiert das Programm für die angegebene Zeit in ms."));
        this.addMethod(new Method("langsam", new Parameterlist([]), null, (parameters) => {
            module.main.getInterpreter().controlButtons.speedControl.setSpeedInStepsPerSecond(5);
        }, false, false, "Setzt die Ausführungsgeschwindigkeit auf 5 Programmschritte/Sekunde."));
        this.addMethod(new Method("schnell", new Parameterlist([]), null, (parameters) => {
            module.main.getInterpreter().controlButtons.speedControl.setSpeedInStepsPerSecond("max");
        }, false, false, "Setzt die Ausführungsgeschwindigkeit auf 'maximal'."));
        this.addMethod(new Method("beenden", new Parameterlist([]), null, (parameters) => {
            var _a;
            let console = (_a = module.main.getBottomDiv()) === null || _a === void 0 ? void 0 : _a.console;
            if (console != null) {
                console.writeConsoleEntry("Das Programm wurde durch einen Roboter angehalten.", null, "#0000ff");
                console.showTab();
            }
            module.main.getInterpreter().stop();
        }, false, false, "Beendet das Programm."));
        this.addMethod(new Method("istWand", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            return rh.istWand();
        }, false, false, "Gibt genau dann true zurück, wenn der Roboter direkt vor einer Wand steht."));
        this.addMethod(new Method("nichtIstWand", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            return !rh.istWand();
        }, false, false, "Gibt genau dann true zurück, wenn der Roboter nicht direkt vor einer Wand steht."));
        this.addMethod(new Method("istZiegel", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            return rh.istZiegel(null);
        }, false, false, "Gibt genau dann true zurück, wenn direkt vor dem Roboter mindestens ein Ziegel liegt."));
        this.addMethod(new Method("istZiegel", new Parameterlist([
            { identifier: "Anzahl", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let anzahl = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            return rh.istZiegel(anzahl);
        }, false, false, "Gibt genau dann true zurück, wenn direkt vor dem Roboter genau Anzahl Ziegel liegen."));
        this.addMethod(new Method("istZiegel", new Parameterlist([
            { identifier: "Farbe", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let farbe = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            return rh.istZiegel(farbe);
        }, false, false, "Gibt genau dann true zurück, wenn auf dem Ziegelstapel direkt vor dem Roboter mindestens ein Ziegel mit der angegebenen Farbe liegt."));
        this.addMethod(new Method("nichtIstZiegel", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            return !rh.istZiegel(null);
        }, false, false, "Gibt genau dann true zurück, wenn direkt vor dem Roboter kein Ziegel liegt."));
        this.addMethod(new Method("nichtIstZiegel", new Parameterlist([
            { identifier: "Anzahl", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let anzahl = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            return !rh.istZiegel(anzahl);
        }, false, false, "Gibt genau dann true zurück, wenn direkt vor dem Roboter nicht genau Anzahl Ziegel liegen."));
        this.addMethod(new Method("nichtIstZiegel", new Parameterlist([
            { identifier: "Farbe", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let farbe = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            return !rh.istZiegel(farbe);
        }, false, false, "Gibt genau dann true zurück, wenn auf dem Ziegelstapel direkt vor dem Roboter kein Ziegel mit der angegebenen Farbe liegt."));
        this.addMethod(new Method("istMarke", new Parameterlist([
            { identifier: "Farbe", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let farbe = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            return rh.istMarke(farbe);
        }, false, false, "Gibt genau dann true zurück, wenn unter dem Roboter eine Marke in der angegebenen Farbe liegt."));
        this.addMethod(new Method("istMarke", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let farbe = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            return rh.istMarke(null);
        }, false, false, "Gibt genau dann true zurück, wenn unter dem Roboter eine Marke (egal in welcher Farbe) liegt."));
        this.addMethod(new Method("nichtIstMarke", new Parameterlist([
            { identifier: "Farbe", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let farbe = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            return !rh.istMarke(farbe);
        }, false, false, "Gibt genau dann true zurück, wenn unter dem Roboter keine Marke in der angegebenen Farbe liegt."));
        this.addMethod(new Method("nichtIstMarke", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            return !rh.istMarke(null);
        }, false, false, "Gibt genau dann true zurück, wenn unter dem Roboter keine Marke (egal in welcher Farbe) liegt."));
        let himmelsrichtungen = ["Norden", "Osten", "Süden", "Westen"];
        for (let i = 0; i < 4; i++) {
            let hr = himmelsrichtungen[i];
            this.addMethod(new Method("ist" + hr, new Parameterlist([]), booleanPrimitiveType, (parameters) => {
                let o = parameters[0].value;
                let rh = o.intrinsicData["Robot"];
                return rh.direction.index == i;
            }, false, false, "Gibt genau dann true zurück, wenn der Roboter nach " + hr + " blickt."));
        }
        this.addMethod(new Method("istLeer", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            return rh.hatSteine == 0;
        }, false, false, "Gibt genau dann true zurück, wenn der Roboter keinen Stein mit sich trägt."));
        this.addMethod(new Method("istVoll", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            return rh.hatSteine == rh.maxSteine;
        }, false, false, "Gibt genau dann true zurück, wenn der Roboter die maximale Anzahl von Steinen mit sich trägt."));
        this.addMethod(new Method("nichtIstLeer", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            return rh.hatSteine > 0;
        }, false, false, "Gibt genau dann true zurück, wenn der Roboter mindestens einen Stein mit sich trägt."));
        this.addMethod(new Method("hatZiegel", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            return rh.hatSteine > 0;
        }, false, false, "Gibt genau dann true zurück, wenn der Roboter mindestens einen Stein mit sich trägt."));
        this.addMethod(new Method("hatZiegel", new Parameterlist([
            { identifier: "Anzahl", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let anzahl = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            return rh.hatSteine >= anzahl;
        }, false, false, "Gibt genau dann true zurück, wenn der Roboter mindestens Anzahl Steine mit sich trägt."));
        this.addMethod(new Method("nichtIstVoll", new Parameterlist([]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let rh = o.intrinsicData["Robot"];
            return rh.hatSteine < rh.maxSteine;
        }, false, false, "Gibt genau dann true zurück, wenn der Roboter weniger als die maximale Anzahl von Steinen mit sich trägt."));
        this.addMethod(new Method("setzeAnzahlSteine", new Parameterlist([
            { identifier: "Anzahl", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let anzahl = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            return rh.hatSteine = anzahl;
        }, false, false, "Befüllt den Rucksack des Roboters mit genau Anzahl Steinen."));
        this.addMethod(new Method("setzeRucksackgröße", new Parameterlist([
            { identifier: "Anzahl", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let anzahl = parameters[1].value;
            let rh = o.intrinsicData["Robot"];
            return rh.maxSteine = anzahl;
        }, false, false, "Gibt dem Roboter einen Rucksack, der maximal Anzahl Steine fasst."));
    }
}
export class RobotWorldClass extends Klass {
    constructor(module) {
        super("RobotWorld", module, "Welt für Robot Karol");
        this.setBaseClass(module.typeStore.getType("Object"));
        // this.addAttribute(new Attribute("PI", doublePrimitiveType, (object) => { return Math.PI }, true, Visibility.public, true, "Die Kreiszahl Pi (3.1415...)"));
        this.addMethod(new Method("RobotWorld", new Parameterlist([
            { identifier: "worldX", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "worldY", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let worldX = parameters[1].value;
            let worldY = parameters[2].value;
            const interpreter = module.main.getInterpreter();
            let rh = new RobotWorldHelper(interpreter, o, worldX, worldY, null);
            o.intrinsicData["RobotWorldHelper"] = rh;
        }, false, false, 'Instanziert eine neue Robot-Welt', true));
        this.addMethod(new Method("RobotWorld", new Parameterlist([
            { identifier: "initialeWelt", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let initialeWelt = parameters[1].value;
            const interpreter = module.main.getInterpreter();
            let rh = new RobotWorldHelper(interpreter, o, 0, 0, initialeWelt);
            o.intrinsicData["RobotWorldHelper"] = rh;
        }, false, false, 'Instanziert eine neue Robot-Welt.', true));
        this.addMethod(new Method("setzeMaximalhöhe", new Parameterlist([
            { identifier: "Anzahl", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), booleanPrimitiveType, (parameters) => {
            let o = parameters[0].value;
            let anzahl = parameters[1].value;
            let rh = o.intrinsicData["RobotWorldHelper"];
            return rh.maximumHeight = anzahl;
        }, false, false, "Ändert die maximale Höhe der Ziegelstapel."));
        this.addMethod(new Method("setzeZiegel", new Parameterlist([
            { identifier: "x", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "farbe", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "anzahl", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let x = parameters[1].value;
            let y = parameters[2].value;
            let farbe = parameters[3].value;
            let anzahl = parameters[4].value;
            let rh = o.intrinsicData["RobotWorldHelper"];
            if (x < 1 || x > rh.worldX || y < 1 || y > rh.worldY) {
                rh.interpreter.throwException(`Die Position (${x}/${y}) ist außerhalb der Weltgrenzen.`);
                return;
            }
            for (let i = 0; i < anzahl; i++) {
                rh.addBrick(x - 1, y - 1, farbe);
            }
        }, false, false, "Setzt Anzahl Ziegel an der angegebenen Position mit der angegebenen Farbe. Die x- und y-Koordinaten beginnen bei 1."));
        this.addMethod(new Method("setzeMarke", new Parameterlist([
            { identifier: "x", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "y", type: intPrimitiveType, declaration: null, usagePositions: null, isFinal: true },
            { identifier: "farbe", type: stringPrimitiveType, declaration: null, usagePositions: null, isFinal: true }
        ]), null, (parameters) => {
            let o = parameters[0].value;
            let x = parameters[1].value;
            let y = parameters[2].value;
            let farbe = parameters[3].value;
            let rh = o.intrinsicData["RobotWorldHelper"];
            if (x < 1 || x > rh.worldX || y < 1 || y > rh.worldY) {
                rh.interpreter.throwException(`Die Position (${x}/${y}) ist außerhalb der Weltgrenzen.`);
                return;
            }
            rh.setMarker(x - 1, y - 1, farbe);
        }, false, false, "Setzt einen Marker an der angegebenen Position mit der angegebenen Farbe. Die x- und y-Koordinaten beginnen bei 1."));
    }
}
export class RobotWorldHelper {
    constructor(interpreter, runtimeObject, worldX, worldY, initialeWelt) {
        this.interpreter = interpreter;
        this.runtimeObject = runtimeObject;
        this.worldX = worldX;
        this.worldY = worldY;
        this.markers = []; // x, y
        this.bricks = []; // x, y, height
        this.maximumHeight = 15;
        this.robots = [];
        this.fetchWorld(interpreter);
        if (this.worldHelper.robotWorldHelper != null) {
            this.interpreter.throwException("Es wurde bereits ein Robot-World-Objekt instanziert. Davon kann es aber nur ein einziges geben. \nTipp: Jedes Robot-Objekt kann das Robot-World-Objekt mit der getRobotWorld() holen.");
            return;
        }
        this.worldHelper.robotWorldHelper = this;
        this.camera = new Pixi3d.Camera(this.worldHelper.app.renderer);
        this.robotCubeFactory = new RobotCubeFactory(this.worldHelper, this.camera);
        this.markers = [];
        this.bricks = [];
        this.container3D = new Pixi3d.Container3D();
        this.displayObject = this.container3D;
        this.worldHelper.stage.addChild(this.displayObject);
        if (initialeWelt != null) {
            this.initFromString(initialeWelt);
        }
        else {
            this.initWorldArrays(worldX, worldY);
        }
        this.renderOrnamentsAndInitCamera();
    }
    adjustRobotPositions(x, y) {
        for (let robot of this.robots) {
            if (robot.x == x && robot.y == y) {
                robot.model.y = this.getBrickCount(x, y) + 1.6;
            }
        }
    }
    initWorldArrays(worldX, worldY) {
        for (let x = 0; x < worldX; x++) {
            let markerColumn = [];
            this.markers.push(markerColumn);
            let brickColumn = [];
            this.bricks.push(brickColumn);
            for (let y = 0; y < worldY; y++) {
                markerColumn.push(null);
                brickColumn.push([]);
            }
        }
    }
    fetchWorld(interpreter) {
        let worldHelper = interpreter.worldHelper;
        if (worldHelper == null) {
            let w = new RuntimeObject(interpreter.moduleStore.getType("World").type);
            worldHelper = new WorldHelper(800, 600, interpreter.moduleStore.getModule("Base Module"), w);
            w.intrinsicData["World"] = worldHelper;
            interpreter.worldHelper = worldHelper;
        }
        this.worldHelper = worldHelper;
    }
    renderOrnamentsAndInitCamera() {
        this.worldHelper.app.renderer.backgroundColor = 0x8080ff;
        let gp = this.robotCubeFactory.getGrassPlane(this.worldX, this.worldY);
        this.container3D.addChild(gp);
        let deep = 0;
        let radius = 0;
        this.robotCubeFactory.getSidePlanes(this.worldX, this.worldY, "robot#3", radius, deep++)
            .forEach(p => { this.container3D.addChild(p); });
        this.robotCubeFactory.getSidePlanes(this.worldX, this.worldY, "robot#10", radius, deep++)
            .forEach(p => { this.container3D.addChild(p); });
        this.robotCubeFactory.makeClouds(this.container3D, 60, this.worldX / 2, this.worldY / 2);
        this.robotCubeFactory.makePlane(this.container3D, this.worldX / 2, -4, this.worldY / 2, 3000, 3000, new Pixi3d.Color(55.0 / 255, 174.0 / 255, 77.0 / 255));
        let northSprite = this.robotCubeFactory.makeSprite3d("robot#11", this.container3D);
        // northSprite.position.set(this.worldX + 6, 1, this.worldY - 1);
        northSprite.position.set(2 * this.worldX + 1, -1, 2 * this.worldY - 6);
        northSprite.scale.set(257.0 / 40, 1, 1);
        northSprite.rotationQuaternion.setEulerAngles(0, 90, 0);
        let control = new Pixi3d.CameraOrbitControl(this.worldHelper.app.view, this.camera);
        control.angles.x = 45;
        control.angles.y = -20;
        control.target = { x: this.worldX - 1, y: 0, z: this.worldY - 1 };
        control.distance = Math.max(this.worldX, this.worldY) * 2.3;
    }
    addBrick(x, y, farbe) {
        let oldHeight = this.bricks[x][y].length;
        if (oldHeight < this.maximumHeight) {
            let brick = this.robotCubeFactory.getBrick(farbe);
            this.setToXY(x, y, oldHeight, brick);
            this.bricks[x][y].push(brick);
            this.container3D.addChild(brick);
            this.adjustMarkerHeight(x, y);
            this.adjustRobotPositions(x, y);
            return true;
        }
        else {
            return false;
        }
    }
    removeBrick(x, y) {
        if (this.bricks[x][y].length > 0) {
            let brick = this.bricks[x][y].pop();
            brick.destroy();
            this.adjustMarkerHeight(x, y);
            this.adjustRobotPositions(x, y);
        }
        else {
            return false;
        }
    }
    getBrickCount(x, y) {
        return this.bricks[x][y].length;
    }
    hasBrickColor(x, y, farbe) {
        for (let brick of this.bricks[x][y]) {
            if (brick.farbe == farbe)
                return true;
        }
        return false;
    }
    getMarkerColor(x, y) {
        let marker = this.markers[x][y];
        if (marker == null)
            return null;
        return marker.farbe;
    }
    setMarker(x, y, farbe) {
        if (this.markers[x][y] != null) {
            this.markers[x][y].destroy();
        }
        let marker = this.robotCubeFactory.getMarker(farbe);
        this.markers[x][y] = marker;
        this.container3D.addChild(marker);
        this.setToXY(x, y, 0, marker);
        this.adjustMarkerHeight(x, y);
    }
    removeMarker(x, y) {
        let marker = this.markers[x][y];
        if (marker == null) {
            return false;
        }
        else {
            this.markers[x][y] = null;
            marker.destroy();
            return true;
        }
    }
    adjustMarkerHeight(x, y) {
        let marker = this.markers[x][y];
        if (marker != null) {
            let height = this.bricks[x][y].length;
            marker.y = height + 0.1;
        }
    }
    clear() {
        for (let x = 0; x < this.bricks.length; x++) {
            for (let y = 0; y < this.bricks[x].length; y++) {
                let brickList = this.bricks[x][y];
                while (brickList.length > 0) {
                    brickList.pop().destroy();
                }
            }
        }
        for (let x = 0; x < this.markers.length; x++) {
            for (let y = 0; y < this.markers[x].length; y++) {
                let marker = this.markers[x][y];
                if (marker != null) {
                    this.markers[x][y] = null;
                    marker.destroy();
                }
            }
        }
    }
    setDimensions(worldX, worldY) {
        this.clear();
        this.worldX = worldX;
        this.worldY = worldY;
        this.markers = [];
        this.bricks = [];
        for (let x = 0; x < worldX; x++) {
            let markerColumn = [];
            this.markers.push(markerColumn);
            let brickColumn = [];
            this.bricks.push(brickColumn);
            for (let y = 0; y < worldY; y++) {
                markerColumn.push(null);
                brickColumn.push([]);
            }
        }
    }
    getNumberOfBricks(x, y) {
        return this.bricks[x][y].length;
    }
    /**
     *
     * @param initString
     * " ": empty
     * "_": no brick, yellow marker
     * "Y", "G", "B", "R": switch marker color
     * "y", "g", "b", "r": switch brick color
     * "1", ..., "9": 1, ..., 9 bricks
     * "1m", ..., "9m": 1, ..., 9 bricks with markers on them
     */
    initFromString(initString) {
        let lowerCaseCharToColor = { "r": "rot", "g": "grün", "b": "blau", "y": "gelb" };
        let upperCaseCharToColor = { "R": "rot", "G": "grün", "B": "blau", "Y": "gelb" };
        let digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
        this.clear();
        let rows = initString.split("\n");
        let maxColumns = 0;
        rows.forEach((row) => { let rowLength = this.rowLength(row); if (rowLength > maxColumns)
            maxColumns = rowLength; });
        this.initWorldArrays(maxColumns, rows.length);
        this.worldX = maxColumns;
        this.worldY = rows.length;
        let c1;
        let c2;
        let brickColor = "rot";
        let markerColor = "gelb";
        for (let y = 0; y < rows.length; y++) {
            let row = rows[y];
            let x = 0;
            let pos = 0;
            while (pos < row.length) {
                c1 = row.charAt(pos);
                c2 = pos < row.length - 1 ? row.charAt(pos + 1) : null;
                pos++;
                if (lowerCaseCharToColor[c1] != null) {
                    brickColor = lowerCaseCharToColor[c1];
                    continue;
                }
                if (upperCaseCharToColor[c1] != null) {
                    markerColor = upperCaseCharToColor[c1];
                    continue;
                }
                let index = digits.indexOf(c1);
                if (index >= 0) {
                    for (let i = 0; i < index + 1; i++) {
                        this.addBrick(x, y, brickColor);
                    }
                    if (c2 == "m") {
                        this.setMarker(x, y, markerColor);
                        pos++;
                    }
                    x++;
                    continue;
                }
                if (c1 == " ") {
                    x++;
                    continue;
                }
                if (c1 == "_") {
                    this.setMarker(x, y, markerColor);
                    x++;
                    continue;
                }
            }
        }
    }
    rowLength(row) {
        let l = 0;
        let forwardChars = " _1234567890";
        for (let i = 0; i < row.length; i++) {
            if (forwardChars.indexOf(row.charAt(i)) >= 0) {
                l++;
            }
        }
        return l;
    }
    setToXY(x, y, height, mesh) {
        mesh.x = 2 * (this.worldX - x - 1);
        mesh.z = 2 * (this.worldY - y - 1);
        mesh.y = height;
    }
    // Wird von WorldHelper aufgerufen
    destroy() {
    }
    gibtFarbe(farbe) {
        return this.robotCubeFactory.farben.indexOf(farbe) >= 0;
    }
}
class Direction {
    constructor() {
        this.names = ["top", "right", "bottom", "left"];
        this.deltas = [{ dx: 0, dy: -1 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }];
        this.angles = [0, 90, 180, 270];
        this.index = 2; // top
    }
    turnRight() {
        this.index = (this.index - 1 + 4) % 4;
    }
    turnLeft() {
        this.index = (this.index + 1 + 4) % 4;
    }
    getAngle() {
        return this.angles[this.index];
    }
    getDeltas() {
        return this.deltas[this.index];
    }
}
export class RobotHelper {
    constructor(interpreter, runtimeObject, startX, startY, worldX, worldY, initialeWelt = null) {
        this.interpreter = interpreter;
        this.runtimeObject = runtimeObject;
        this.hatSteine = 10000000;
        this.maxSteine = 100000000;
        this.direction = new Direction();
        this.fetchRobotWorld(interpreter, worldX, worldY, initialeWelt);
        this.robotWorldHelper.robots.push(this);
        this.render();
        this.moveTo(startX - 1, startY - 1);
        this.adjustAngle();
    }
    fetchRobotWorld(interpreter, worldX, worldY, initialeWelt) {
        let worldHelper = interpreter.worldHelper;
        this.robotWorldHelper = worldHelper === null || worldHelper === void 0 ? void 0 : worldHelper.robotWorldHelper;
        if (this.robotWorldHelper == null) {
            let w = new RuntimeObject(interpreter.moduleStore.getType("RobotWorld").type);
            this.robotWorldHelper = new RobotWorldHelper(interpreter, w, worldX, worldY, initialeWelt);
            w.intrinsicData["RobotWorldHelper"] = this.robotWorldHelper;
        }
    }
    render() {
        //@ts-ignore
        let robot = Pixi3d.Model.from(PIXI.Loader.shared.resources["steve"].gltf);
        robot.scale.set(0.1);
        for (let mesh of robot.meshes) {
            let sm = mesh.material;
            sm.camera = this.robotWorldHelper.camera;
            sm.exposure = 0.5;
            sm.lightingEnvironment = this.robotWorldHelper.robotCubeFactory.lightingEnvironment;
        }
        this.robotWorldHelper.container3D.addChild(robot);
        this.model = robot;
    }
    ;
    crop(n, min, max) {
        if (n < min)
            n = min;
        if (n > max)
            n = max;
        return n;
    }
    moveTo(x, y) {
        const rw = this.robotWorldHelper;
        x = this.crop(x, 0, rw.worldX - 1);
        y = this.crop(y, 0, rw.worldY - 1);
        this.model.x = 2 * (rw.worldX - x - 1);
        this.model.z = 2 * (rw.worldY - y - 1);
        this.model.y = rw.getNumberOfBricks(x, y) + 1.6;
        this.x = x;
        this.y = y;
    }
    adjustAngle() {
        this.model.transform.rotationQuaternion.setEulerAngles(0, this.direction.getAngle(), 0);
    }
    schritt() {
        let deltas = this.direction.getDeltas();
        let newX = this.x + deltas.dx;
        let newY = this.y + deltas.dy;
        const rw = this.robotWorldHelper;
        if (newX < 0 || newX >= rw.worldX || newY < 0 || newY >= rw.worldY) {
            this.interpreter.throwException("Der Roboter ist gegen eine Wand geprallt!");
            return false;
        }
        let oldHeight = rw.getNumberOfBricks(this.x, this.y);
        let newHeight = rw.getNumberOfBricks(newX, newY);
        if (newHeight < oldHeight - 1) {
            this.interpreter.throwException("Der Roboter kann maximal einen Ziegel nach unten springen.");
            return false;
        }
        if (newHeight > oldHeight + 1) {
            this.interpreter.throwException("Der Roboter kann maximal einen Ziegel hoch springen.");
            return false;
        }
        this.moveTo(newX, newY);
        return true;
    }
    hinlegen(farbe) {
        let deltas = this.direction.getDeltas();
        let newX = this.x + deltas.dx;
        let newY = this.y + deltas.dy;
        const rw = this.robotWorldHelper;
        if (newX < 0 || newX >= rw.worldX || newY < 0 || newY >= rw.worldY) {
            this.interpreter.throwException("Der Roboter steht direkt vor einer Wand. Da kann er keine Ziegel hinlegen.");
            return false;
        }
        farbe = farbe.toLocaleLowerCase();
        if (!rw.gibtFarbe(farbe)) {
            this.interpreter.throwException("Es gibt nur Ziegel der Farben " + rw.robotCubeFactory.farben.join(", ") + ". Die Farbe " + farbe + " ist nicht darunter.");
            return false;
        }
        if (this.hatSteine == 0) {
            this.interpreter.throwException("Der Roboter hat keine Ziegel mehr bei sich und kann daher keinen mehr hinlegen.");
            return false;
        }
        if (rw.bricks[newX][newY].length >= rw.maximumHeight) {
            this.interpreter.throwException("Der Ziegelstapel darf die maximale Höhe " + rw.maximumHeight + " nicht überschreiten.");
            return false;
        }
        rw.addBrick(newX, newY, farbe);
        this.hatSteine--;
        return true;
    }
    aufheben() {
        let deltas = this.direction.getDeltas();
        let newX = this.x + deltas.dx;
        let newY = this.y + deltas.dy;
        const rw = this.robotWorldHelper;
        if (newX < 0 || newX >= rw.worldX || newY < 0 || newY >= rw.worldY) {
            this.interpreter.throwException("Der Roboter steht direkt vor einer Wand. Da kann er keinen Ziegel aufheben.");
            return false;
        }
        if (rw.getNumberOfBricks(newX, newY) < 1) {
            this.interpreter.throwException("Vor dem Roboter liegt kein Ziegel, er kann daher keinen aufheben.");
            return false;
        }
        rw.removeBrick(newX, newY);
        if (this.hatSteine < this.maxSteine) {
            this.hatSteine++;
        }
        else {
            this.interpreter.throwException("Der Roboter kann nicht mehr Steine aufheben, da er keinen Platz mehr in seinem Rucksack hat.");
            return false;
        }
        return true;
    }
    markeSetzen(farbe) {
        const rw = this.robotWorldHelper;
        farbe = farbe.toLocaleLowerCase();
        if (!rw.gibtFarbe(farbe)) {
            this.interpreter.throwException("Es gibt nur Marken der Farben " + rw.robotCubeFactory.farben.join(", ") + ". Die Farbe " + farbe + " ist nicht darunter.");
            return false;
        }
        rw.setMarker(this.x, this.y, farbe);
    }
    markeLöschen() {
        const rw = this.robotWorldHelper;
        rw.removeMarker(this.x, this.y);
    }
    istWand() {
        let deltas = this.direction.getDeltas();
        let newX = this.x + deltas.dx;
        let newY = this.y + deltas.dy;
        const rw = this.robotWorldHelper;
        return (newX < 0 || newX >= rw.worldX || newY < 0 || newY >= rw.worldY);
    }
    istZiegel(param) {
        let deltas = this.direction.getDeltas();
        let newX = this.x + deltas.dx;
        let newY = this.y + deltas.dy;
        const rw = this.robotWorldHelper;
        if (newX < 0 || newX >= rw.worldX || newY < 0 || newY >= rw.worldY) {
            return false;
        }
        if (param == null)
            return rw.getBrickCount(newX, newY) > 0;
        if (typeof param == "string") {
            return rw.hasBrickColor(newX, newY, param.toLocaleLowerCase());
        }
        return rw.bricks[newX][newY].length == param;
    }
    istMarke(param) {
        const rw = this.robotWorldHelper;
        let marke = rw.markers[this.x][this.y];
        if (param == null)
            return marke != null;
        if (typeof param == "string") {
            return marke != null && marke.farbe == param.toLocaleLowerCase();
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUm9ib3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvY2xpZW50L3J1bnRpbWVsaWJyYXJ5L2dyYXBoaWNzLzNkL1JvYm90LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDN0ksT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFdEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUsxQyxPQUFPLEVBQWMsZ0JBQWdCLEVBQWUsTUFBTSx1QkFBdUIsQ0FBQztBQUVsRixNQUFNLE9BQU8sVUFBVyxTQUFRLEtBQUs7SUFFakMsWUFBWSxNQUFjO1FBRXRCLEtBQUssQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRXRDLElBQUksQ0FBQyxZQUFZLENBQVEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUM3RCxJQUFJLGNBQWMsR0FBVSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVuRSw4SkFBOEo7UUFFOUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxhQUFhLENBQUMsRUFDcEQsQ0FBQyxFQUFFLElBQUksRUFDSixDQUFDLFVBQVUsRUFBRSxFQUFFO1lBRVgsSUFBSSxDQUFDLEdBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFFM0MsSUFBSSxFQUFFLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFB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QUssQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUM7U0FDcEU7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0NBR0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb2R1bGUgfSBmcm9tIFwiLi4vLi4vLi4vY29tcGlsZXIvcGFyc2VyL01vZHVsZS5qc1wiO1xyXG5pbXBvcnQgeyBLbGFzcyB9IGZyb20gXCIuLi8uLi8uLi9jb21waWxlci90eXBlcy9DbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBib29sZWFuUHJpbWl0aXZlVHlwZSwgZG91YmxlUHJpbWl0aXZlVHlwZSwgaW50UHJpbWl0aXZlVHlwZSwgc3RyaW5nUHJpbWl0aXZlVHlwZSB9IGZyb20gXCIuLi8uLi8uLi9jb21waWxlci90eXBlcy9QcmltaXRpdmVUeXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBNZXRob2QsIFBhcmFtZXRlcmxpc3QgfSBmcm9tIFwiLi4vLi4vLi4vY29tcGlsZXIvdHlwZXMvVHlwZXMuanNcIjtcclxuaW1wb3J0IHsgUnVudGltZU9iamVjdCB9IGZyb20gXCIuLi8uLi8uLi9pbnRlcnByZXRlci9SdW50aW1lT2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IEZpbGxlZFNoYXBlSGVscGVyIH0gZnJvbSBcIi4uL0ZpbGxlZFNoYXBlLmpzXCI7XHJcbmltcG9ydCB7IFdvcmxkSGVscGVyIH0gZnJvbSBcIi4uL1dvcmxkLmpzXCI7XHJcbmltcG9ydCB7IEludGVycHJldGVyIH0gZnJvbSBcIi4uLy4uLy4uL2ludGVycHJldGVyL0ludGVycHJldGVyLmpzXCI7XHJcbmltcG9ydCB7IEZpbGxlZFNoYXBlRGVmYXVsdHMgfSBmcm9tIFwiLi4vRmlsbGVkU2hhcGVEZWZhdWx0cy5qc1wiO1xyXG5pbXBvcnQgeyBTaGFwZUhlbHBlciB9IGZyb20gXCIuLi9TaGFwZS5qc1wiO1xyXG5pbXBvcnQgeyBCb3hlczNkIH0gZnJvbSBcIi4vQm94ZXMzZC5qc1wiO1xyXG5pbXBvcnQgeyBSb2JvdEJyaWNrLCBSb2JvdEN1YmVGYWN0b3J5LCBSb2JvdE1hcmtlciB9IGZyb20gXCIuL1JvYm90Q3ViZUZhY3RvcnkuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBSb2JvdENsYXNzIGV4dGVuZHMgS2xhc3Mge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG1vZHVsZTogTW9kdWxlKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKFwiUm9ib3RcIiwgbW9kdWxlLCBcIlJvYm90IEthcm9sXCIpO1xyXG5cclxuICAgICAgICB0aGlzLnNldEJhc2VDbGFzcyg8S2xhc3M+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiT2JqZWN0XCIpKTtcclxuICAgICAgICBsZXQgcm9ib3RXb3JsZFR5cGUgPSA8S2xhc3M+bW9kdWxlLnR5cGVTdG9yZS5nZXRUeXBlKFwiUm9ib3RXb3JsZFwiKTtcclxuXHJcbiAgICAgICAgLy8gdGhpcy5hZGRBdHRyaWJ1dGUobmV3IEF0dHJpYnV0ZShcIlBJXCIsIGRvdWJsZVByaW1pdGl2ZVR5cGUsIChvYmplY3QpID0+IHsgcmV0dXJuIE1hdGguUEkgfSwgdHJ1ZSwgVmlzaWJpbGl0eS5wdWJsaWMsIHRydWUsIFwiRGllIEtyZWlzemFobCBQaSAoMy4xNDE1Li4uKVwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJSb2JvdFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCByaCA9IG5ldyBSb2JvdEhlbHBlcihtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLCBvLCAxLCAxLCA1LCA4KVxyXG4gICAgICAgICAgICAgICAgby5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl0gPSByaDtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0luc3RhbnppZXJ0IGVpbiBuZXVlcyBSb2JvdC1PYmpla3QuIERlciBSb2JvdGVyIHN0ZWh0IGFuZmFuZ3MgYW4gZGVyIFN0ZWxsZSAoMS8xKScsIHRydWUpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIlJvYm90XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInN0YXJ0WFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInN0YXJ0WVwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnRYOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0WTogbnVtYmVyID0gcGFyYW1ldGVyc1syXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSBuZXcgUm9ib3RIZWxwZXIobW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKSwgbywgc3RhcnRYLCBzdGFydFksIDUsIDEwKVxyXG4gICAgICAgICAgICAgICAgby5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl0gPSByaDtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0luc3RhbnppZXJ0IGVpbiBuZXVlcyBSb2JvdC1PYmpla3QuIERlciBSb2JvdGVyIHdpcmQgYW5mYW5ncyBhbiBkaWUgU3RlbGxlIChzdGFydFgvc3RhcnRZKSBnZXNldHp0LicsIHRydWUpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIlJvYm90XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInN0YXJ0WFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInN0YXJ0WVwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIndvcmxkWFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIndvcmxkWVwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnRYOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0WTogbnVtYmVyID0gcGFyYW1ldGVyc1syXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB3b3JsZFg6IG51bWJlciA9IHBhcmFtZXRlcnNbM10udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd29ybGRZOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzRdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCByaCA9IG5ldyBSb2JvdEhlbHBlcihtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLCBvLCBzdGFydFgsIHN0YXJ0WSwgd29ybGRYLCB3b3JsZFkpXHJcbiAgICAgICAgICAgICAgICBvLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXSA9IHJoO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnSW5zdGFuemllcnQgZWluIG5ldWVzIFJvYm90LU9iamVrdC4gRGVyIFJvYm90ZXIgd2lyZCBhbmZhbmdzIGFuIGRpZSBTdGVsbGUgKHN0YXJ0WC9zdGFydFkpIGdlc2V0enQuIFdlbm4gZGllIFJvYm90V29ybGQgbm9jaCBuaWNodCBpbnN0YW56aWVydCBpc3QsIHdpcmQgc2llIG1pdCBkZXIgR3LDtsOfZSB3b3JsZFggKiB3b3JsZFkgbmV1IGVyc3RlbGx0LicsIHRydWUpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIlJvYm90XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInN0YXJ0WFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInN0YXJ0WVwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImluaXRpYWxlV2VsdFwiLCB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGFydFg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnRZOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGluaXRpYWxlV2VsdDogc3RyaW5nID0gcGFyYW1ldGVyc1szXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSBuZXcgUm9ib3RIZWxwZXIobW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKSwgbywgc3RhcnRYLCBzdGFydFksIDAsIDAsIGluaXRpYWxlV2VsdClcclxuICAgICAgICAgICAgICAgIG8uaW50cmluc2ljRGF0YVtcIlJvYm90XCJdID0gcmg7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdJbnN0YW56aWVydCBlaW4gbmV1ZXMgUm9ib3QtT2JqZWt0LiBEZXIgUm9ib3RlciB3aXJkIGFuZmFuZ3MgYW4gZGllIFN0ZWxsZSAoc3RhcnRYL3N0YXJ0WSkgZ2VzZXR6dC4gV2VubiBkaWUgUm9ib3RXb3JsZCBub2NoIG5pY2h0IGluc3RhbnppZXJ0IGlzdCwgd2lyZCBzaWUgYXVmIEdydW5kbGFnZSBkZXMgU3RyaW5ncyBpbml0aWFsZVdlbHQgZXJzdGVsbHQuJywgdHJ1ZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiZ2V0V2VsdFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIHJvYm90V29ybGRUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmgucm9ib3RXb3JsZEhlbHBlci5ydW50aW1lT2JqZWN0O1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnR2lidCBkYXMgUm9ib3RXb3JsZC1PYmpla3QgenVyw7xjaycsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJyZWNodHNEcmVoZW5cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByaC5kaXJlY3Rpb24udHVyblJpZ2h0KCk7XHJcbiAgICAgICAgICAgICAgICByaC5hZGp1c3RBbmdsZSgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnRHJlaHQgZGVuIFJvYm90ZXIgdW0gOTDCsCBuYWNoIHJlY2h0cy4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwibGlua3NEcmVoZW5cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByaC5kaXJlY3Rpb24udHVybkxlZnQoKTtcclxuICAgICAgICAgICAgICAgIHJoLmFkanVzdEFuZ2xlKCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdEcmVodCBkZW4gUm9ib3RlciB1bSA5MMKwIG5hY2ggbGlua3MuJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNjaHJpdHRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByaC5zY2hyaXR0KCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdMw6Rzc3QgZGVuIFJvYm90ZXIgZWluZW4gU2Nocml0dCBuYWNoIHZvcm5lIGdlaGVuLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzY2hyaXR0XCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIkFuemFobFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYW56YWhsOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJoID0gPFJvYm90SGVscGVyPm8uaW50cmluc2ljRGF0YVtcIlJvYm90XCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYW56YWhsOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJoLnNjaHJpdHQoKSkgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdMw6Rzc3QgZGVuIFJvYm90ZXIgQW56YWhsIFNjaHJpdHRlIG5hY2ggdm9ybmUgZ2VoZW4uJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImhpbmxlZ2VuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSA8Um9ib3RIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmguaGlubGVnZW4oXCJyb3RcIik7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdMw6Rzc3QgZGVuIFJvYm90ZXIgZWluZW4gcm90ZW4gWmllZ2VsIHZvciBzaWNoIGhpbmxlZ2VuLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJtYXJrZUzDtnNjaGVuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSA8Um9ib3RIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmgubWFya2VMw7ZzY2hlbigpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnTMOkc3N0IGRlbiBSb2JvdGVyIGVpbmUgTWFya2UsIGRpZSBkaXJla3QgdW50ZXIgaWhtIGxpZWd0LCBsw7ZzY2hlbi4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwibWFya2VTZXR6ZW5cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByaC5tYXJrZVNldHplbihcImdlbGJcIik7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdMw6Rzc3QgZGVuIFJvYm90ZXIgZWluZSBnZWxiZSBNYXJrZSBkaXJla3QgdW50ZXIgc2ljaCBzZXR6ZW4uJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm1hcmtlU2V0emVuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIkZhcmJlXCIsIHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBmYXJiZTogc3RyaW5nID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICByaC5tYXJrZVNldHplbihmYXJiZSk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdMw6Rzc3QgZGVuIFJvYm90ZXIgZWluZSBNYXJrZSBkZXIgYW5nZWdlYmVuZW4gRmFyYmUgZGlyZWt0IHVudGVyIHNpY2ggc2V0emVuLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJoaW5sZWdlblwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJBbnphaGxcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFuemFobDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFuemFobDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyaC5oaW5sZWdlbihcInJvdFwiKSkgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsICdMw6Rzc3QgZGVuIFJvYm90ZXIgQW56YWhsIHJvdGUgWmllZ2VsIHZvciBzaWNoIGhpbmxlZ2VuLicsIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJoaW5sZWdlblwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJGYXJiZVwiLCB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZmFyYmU6IHN0cmluZyA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSA8Um9ib3RIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmguaGlubGVnZW4oZmFyYmUpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnTMOkc3N0IGRlbiBSb2JvdGVyIGVpbmVuIFppZWdlbCBkZXIgYW5nZWdlYmVuZW4gRmFyYmUgdm9yIHNpY2ggaGlubGVnZW4uJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImF1ZmhlYmVuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSA8Um9ib3RIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmguYXVmaGViZW4oKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0zDpHNzdCBkZW4gUm9ib3RlciBlaW5lbiByb3RlbiBaaWVnZWwgdm9yIHNpY2ggYXVmaGViZW4uJywgZmFsc2UpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImF1ZmhlYmVuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIkFuemFobFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYW56YWhsOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJoID0gPFJvYm90SGVscGVyPm8uaW50cmluc2ljRGF0YVtcIlJvYm90XCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYW56YWhsOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJoLmF1ZmhlYmVuKCkpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnTMOkc3N0IGRlbiBSb2JvdGVyIEFuemFobCByb3RlIFppZWdlbCB2b3Igc2ljaCBhdWZoZWJlbi4nLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwid2FydGVuXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIlplaXRJbk1pbGxpc2VrdW5kZW5cIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH1cclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJQYXVzaWVydCBkYXMgUHJvZ3JhbW0gZsO8ciBkaWUgYW5nZWdlYmVuZSBaZWl0IGluIG1zLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJsYW5nc2FtXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgIG1vZHVsZS5tYWluLmdldEludGVycHJldGVyKCkuY29udHJvbEJ1dHRvbnMuc3BlZWRDb250cm9sLnNldFNwZWVkSW5TdGVwc1BlclNlY29uZCg1KTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJTZXR6dCBkaWUgQXVzZsO8aHJ1bmdzZ2VzY2h3aW5kaWdrZWl0IGF1ZiA1IFByb2dyYW1tc2Nocml0dGUvU2VrdW5kZS5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2NobmVsbFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBtb2R1bGUubWFpbi5nZXRJbnRlcnByZXRlcigpLmNvbnRyb2xCdXR0b25zLnNwZWVkQ29udHJvbC5zZXRTcGVlZEluU3RlcHNQZXJTZWNvbmQoXCJtYXhcIik7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJTZXR6dCBkaWUgQXVzZsO8aHJ1bmdzZ2VzY2h3aW5kaWdrZWl0IGF1ZiAnbWF4aW1hbCcuXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImJlZW5kZW5cIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbnNvbGUgPSBtb2R1bGUubWFpbi5nZXRCb3R0b21EaXYoKT8uY29uc29sZTtcclxuICAgICAgICAgICAgICAgIGlmIChjb25zb2xlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndyaXRlQ29uc29sZUVudHJ5KFwiRGFzIFByb2dyYW1tIHd1cmRlIGR1cmNoIGVpbmVuIFJvYm90ZXIgYW5nZWhhbHRlbi5cIiwgbnVsbCwgXCIjMDAwMGZmXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuc2hvd1RhYigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKS5zdG9wKCk7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJCZWVuZGV0IGRhcyBQcm9ncmFtbS5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiaXN0V2FuZFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByaC5pc3RXYW5kKCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBnZW5hdSBkYW5uIHRydWUgenVyw7xjaywgd2VubiBkZXIgUm9ib3RlciBkaXJla3Qgdm9yIGVpbmVyIFdhbmQgc3RlaHQuXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm5pY2h0SXN0V2FuZFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAhcmguaXN0V2FuZCgpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gZGVyIFJvYm90ZXIgbmljaHQgZGlyZWt0IHZvciBlaW5lciBXYW5kIHN0ZWh0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJpc3RaaWVnZWxcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSA8Um9ib3RIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmguaXN0WmllZ2VsKG51bGwpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gZGlyZWt0IHZvciBkZW0gUm9ib3RlciBtaW5kZXN0ZW5zIGVpbiBaaWVnZWwgbGllZ3QuXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImlzdFppZWdlbFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJBbnphaGxcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhbnphaGw6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSA8Um9ib3RIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmguaXN0WmllZ2VsKGFuemFobCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBnZW5hdSBkYW5uIHRydWUgenVyw7xjaywgd2VubiBkaXJla3Qgdm9yIGRlbSBSb2JvdGVyIGdlbmF1IEFuemFobCBaaWVnZWwgbGllZ2VuLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJpc3RaaWVnZWxcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiRmFyYmVcIiwgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBmYXJiZTogc3RyaW5nID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByaC5pc3RaaWVnZWwoZmFyYmUpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gYXVmIGRlbSBaaWVnZWxzdGFwZWwgZGlyZWt0IHZvciBkZW0gUm9ib3RlciBtaW5kZXN0ZW5zIGVpbiBaaWVnZWwgbWl0IGRlciBhbmdlZ2ViZW5lbiBGYXJiZSBsaWVndC5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwibmljaHRJc3RaaWVnZWxcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSA8Um9ib3RIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gIXJoLmlzdFppZWdlbChudWxsKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIGRpcmVrdCB2b3IgZGVtIFJvYm90ZXIga2VpbiBaaWVnZWwgbGllZ3QuXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm5pY2h0SXN0WmllZ2VsXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcIkFuemFobFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFuemFobDogbnVtYmVyID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAhcmguaXN0WmllZ2VsKGFuemFobCk7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBnZW5hdSBkYW5uIHRydWUgenVyw7xjaywgd2VubiBkaXJla3Qgdm9yIGRlbSBSb2JvdGVyIG5pY2h0IGdlbmF1IEFuemFobCBaaWVnZWwgbGllZ2VuLlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJuaWNodElzdFppZWdlbFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJGYXJiZVwiLCB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGZhcmJlOiBzdHJpbmcgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJoID0gPFJvYm90SGVscGVyPm8uaW50cmluc2ljRGF0YVtcIlJvYm90XCJdO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICFyaC5pc3RaaWVnZWwoZmFyYmUpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gYXVmIGRlbSBaaWVnZWxzdGFwZWwgZGlyZWt0IHZvciBkZW0gUm9ib3RlciBrZWluIFppZWdlbCBtaXQgZGVyIGFuZ2VnZWJlbmVuIEZhcmJlIGxpZWd0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJpc3RNYXJrZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJGYXJiZVwiLCB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGZhcmJlOiBzdHJpbmcgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJoID0gPFJvYm90SGVscGVyPm8uaW50cmluc2ljRGF0YVtcIlJvYm90XCJdO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJoLmlzdE1hcmtlKGZhcmJlKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIHVudGVyIGRlbSBSb2JvdGVyIGVpbmUgTWFya2UgaW4gZGVyIGFuZ2VnZWJlbmVuIEZhcmJlIGxpZWd0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJpc3RNYXJrZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBmYXJiZTogc3RyaW5nID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByaC5pc3RNYXJrZShudWxsKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIHVudGVyIGRlbSBSb2JvdGVyIGVpbmUgTWFya2UgKGVnYWwgaW4gd2VsY2hlciBGYXJiZSkgbGllZ3QuXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIm5pY2h0SXN0TWFya2VcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiRmFyYmVcIiwgdHlwZTogc3RyaW5nUHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBmYXJiZTogc3RyaW5nID0gcGFyYW1ldGVyc1sxXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAhcmguaXN0TWFya2UoZmFyYmUpO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gdW50ZXIgZGVtIFJvYm90ZXIga2VpbmUgTWFya2UgaW4gZGVyIGFuZ2VnZWJlbmVuIEZhcmJlIGxpZWd0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJuaWNodElzdE1hcmtlXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJoID0gPFJvYm90SGVscGVyPm8uaW50cmluc2ljRGF0YVtcIlJvYm90XCJdO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICFyaC5pc3RNYXJrZShudWxsKTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIHVudGVyIGRlbSBSb2JvdGVyIGtlaW5lIE1hcmtlIChlZ2FsIGluIHdlbGNoZXIgRmFyYmUpIGxpZWd0LlwiKSk7XHJcblxyXG4gICAgICAgIGxldCBoaW1tZWxzcmljaHR1bmdlbiA9IFtcIk5vcmRlblwiLCBcIk9zdGVuXCIsIFwiU8O8ZGVuXCIsIFwiV2VzdGVuXCJdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgaHI6IHN0cmluZyA9IGhpbW1lbHNyaWNodHVuZ2VuW2ldO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImlzdFwiICsgaHIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmguZGlyZWN0aW9uLmluZGV4ID09IGk7XHJcblxyXG4gICAgICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gZGVyIFJvYm90ZXIgbmFjaCBcIiArIGhyICsgXCIgYmxpY2t0LlwiKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwiaXN0TGVlclwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdEhlbHBlcj5vLmludHJpbnNpY0RhdGFbXCJSb2JvdFwiXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByaC5oYXRTdGVpbmUgPT0gMDtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIGRlciBSb2JvdGVyIGtlaW5lbiBTdGVpbiBtaXQgc2ljaCB0csOkZ3QuXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcImlzdFZvbGxcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSA8Um9ib3RIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmguaGF0U3RlaW5lID09IHJoLm1heFN0ZWluZTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIGRlciBSb2JvdGVyIGRpZSBtYXhpbWFsZSBBbnphaGwgdm9uIFN0ZWluZW4gbWl0IHNpY2ggdHLDpGd0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJuaWNodElzdExlZXJcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSA8Um9ib3RIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmguaGF0U3RlaW5lID4gMDtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIGRlciBSb2JvdGVyIG1pbmRlc3RlbnMgZWluZW4gU3RlaW4gbWl0IHNpY2ggdHLDpGd0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJoYXRaaWVnZWxcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSA8Um9ib3RIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmguaGF0U3RlaW5lID4gMDtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIGRlciBSb2JvdGVyIG1pbmRlc3RlbnMgZWluZW4gU3RlaW4gbWl0IHNpY2ggdHLDpGd0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJoYXRaaWVnZWxcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiQW56YWhsXCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYW56YWhsOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJoID0gPFJvYm90SGVscGVyPm8uaW50cmluc2ljRGF0YVtcIlJvYm90XCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiByaC5oYXRTdGVpbmUgPj0gYW56YWhsO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIkdpYnQgZ2VuYXUgZGFubiB0cnVlIHp1csO8Y2ssIHdlbm4gZGVyIFJvYm90ZXIgbWluZGVzdGVucyBBbnphaGwgU3RlaW5lIG1pdCBzaWNoIHRyw6RndC5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwibmljaHRJc3RWb2xsXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJoID0gPFJvYm90SGVscGVyPm8uaW50cmluc2ljRGF0YVtcIlJvYm90XCJdO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJoLmhhdFN0ZWluZSA8IHJoLm1heFN0ZWluZTtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJHaWJ0IGdlbmF1IGRhbm4gdHJ1ZSB6dXLDvGNrLCB3ZW5uIGRlciBSb2JvdGVyIHdlbmlnZXIgYWxzIGRpZSBtYXhpbWFsZSBBbnphaGwgdm9uIFN0ZWluZW4gbWl0IHNpY2ggdHLDpGd0LlwiKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzZXR6ZUFuemFobFN0ZWluZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJBbnphaGxcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgXSksIGJvb2xlYW5QcmltaXRpdmVUeXBlLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBhbnphaGw6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSA8Um9ib3RIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJoLmhhdFN0ZWluZSA9IGFuemFobDtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgXCJCZWbDvGxsdCBkZW4gUnVja3NhY2sgZGVzIFJvYm90ZXJzIG1pdCBnZW5hdSBBbnphaGwgU3RlaW5lbi5cIikpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZE1ldGhvZChuZXcgTWV0aG9kKFwic2V0emVSdWNrc2Fja2dyw7bDn2VcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiQW56YWhsXCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBib29sZWFuUHJpbWl0aXZlVHlwZSxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYW56YWhsOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJoID0gPFJvYm90SGVscGVyPm8uaW50cmluc2ljRGF0YVtcIlJvYm90XCJdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiByaC5tYXhTdGVpbmUgPSBhbnphaGw7XHJcblxyXG4gICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiR2lidCBkZW0gUm9ib3RlciBlaW5lbiBSdWNrc2FjaywgZGVyIG1heGltYWwgQW56YWhsIFN0ZWluZSBmYXNzdC5cIikpO1xyXG5cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSb2JvdFdvcmxkQ2xhc3MgZXh0ZW5kcyBLbGFzcyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IobW9kdWxlOiBNb2R1bGUpIHtcclxuXHJcbiAgICAgICAgc3VwZXIoXCJSb2JvdFdvcmxkXCIsIG1vZHVsZSwgXCJXZWx0IGbDvHIgUm9ib3QgS2Fyb2xcIik7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0QmFzZUNsYXNzKDxLbGFzcz5tb2R1bGUudHlwZVN0b3JlLmdldFR5cGUoXCJPYmplY3RcIikpO1xyXG5cclxuICAgICAgICAvLyB0aGlzLmFkZEF0dHJpYnV0ZShuZXcgQXR0cmlidXRlKFwiUElcIiwgZG91YmxlUHJpbWl0aXZlVHlwZSwgKG9iamVjdCkgPT4geyByZXR1cm4gTWF0aC5QSSB9LCB0cnVlLCBWaXNpYmlsaXR5LnB1YmxpYywgdHJ1ZSwgXCJEaWUgS3JlaXN6YWhsIFBpICgzLjE0MTUuLi4pXCIpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcIlJvYm90V29ybGRcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwid29ybGRYXCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwid29ybGRZXCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgIF0pLCBudWxsLFxyXG4gICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvOiBSdW50aW1lT2JqZWN0ID0gcGFyYW1ldGVyc1swXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGxldCB3b3JsZFg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgd29ybGRZOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGludGVycHJldGVyID0gbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSBuZXcgUm9ib3RXb3JsZEhlbHBlcihpbnRlcnByZXRlciwgbywgd29ybGRYLCB3b3JsZFksIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgby5pbnRyaW5zaWNEYXRhW1wiUm9ib3RXb3JsZEhlbHBlclwiXSA9IHJoO1xyXG5cclxuICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCAnSW5zdGFuemllcnQgZWluZSBuZXVlIFJvYm90LVdlbHQnLCB0cnVlKSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJSb2JvdFdvcmxkXCIsIG5ldyBQYXJhbWV0ZXJsaXN0KFtcclxuICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImluaXRpYWxlV2VsdFwiLCB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgKHBhcmFtZXRlcnMpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5pdGlhbGVXZWx0OiBzdHJpbmcgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGludGVycHJldGVyID0gbW9kdWxlLm1haW4uZ2V0SW50ZXJwcmV0ZXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSBuZXcgUm9ib3RXb3JsZEhlbHBlcihpbnRlcnByZXRlciwgbywgMCwgMCwgaW5pdGlhbGVXZWx0KTtcclxuICAgICAgICAgICAgICAgIG8uaW50cmluc2ljRGF0YVtcIlJvYm90V29ybGRIZWxwZXJcIl0gPSByaDtcclxuXHJcbiAgICAgICAgICAgIH0sIGZhbHNlLCBmYWxzZSwgJ0luc3RhbnppZXJ0IGVpbmUgbmV1ZSBSb2JvdC1XZWx0LicsIHRydWUpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzZXR6ZU1heGltYWxow7ZoZVwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwiQW56YWhsXCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICBdKSwgYm9vbGVhblByaW1pdGl2ZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhbnphaGw6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJoID0gPFJvYm90V29ybGRIZWxwZXI+by5pbnRyaW5zaWNEYXRhW1wiUm9ib3RXb3JsZEhlbHBlclwiXTtcclxuICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByaC5tYXhpbXVtSGVpZ2h0ID0gYW56YWhsO1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiw4RuZGVydCBkaWUgbWF4aW1hbGUgSMO2aGUgZGVyIFppZWdlbHN0YXBlbC5cIikpO1xyXG4gICAgXHJcbiAgICAgICAgICAgIHRoaXMuYWRkTWV0aG9kKG5ldyBNZXRob2QoXCJzZXR6ZVppZWdlbFwiLCBuZXcgUGFyYW1ldGVybGlzdChbXHJcbiAgICAgICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJ5XCIsIHR5cGU6IGludFByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImZhcmJlXCIsIHR5cGU6IHN0cmluZ1ByaW1pdGl2ZVR5cGUsIGRlY2xhcmF0aW9uOiBudWxsLCB1c2FnZVBvc2l0aW9uczogbnVsbCwgaXNGaW5hbDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcImFuemFobFwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgXSksIG51bGwsXHJcbiAgICAgICAgICAgICAgICAocGFyYW1ldGVycykgPT4ge1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG86IFJ1bnRpbWVPYmplY3QgPSBwYXJhbWV0ZXJzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB4OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzFdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB5OiBudW1iZXIgPSBwYXJhbWV0ZXJzWzJdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBmYXJiZTogc3RyaW5nID0gcGFyYW1ldGVyc1szXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYW56YWhsOiBudW1iZXIgPSBwYXJhbWV0ZXJzWzRdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdFdvcmxkSGVscGVyPm8uaW50cmluc2ljRGF0YVtcIlJvYm90V29ybGRIZWxwZXJcIl07XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoeCA8IDEgfHwgeCA+IHJoLndvcmxkWCB8fCB5IDwgMSB8fCB5ID4gcmgud29ybGRZKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmguaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oYERpZSBQb3NpdGlvbiAoJHt4fS8ke3l9KSBpc3QgYXXDn2VyaGFsYiBkZXIgV2VsdGdyZW56ZW4uYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBhbnphaGw7IGkrKyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJoLmFkZEJyaWNrKHgtMSwgeS0xLCBmYXJiZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgXHJcbiAgICAgICAgICAgICAgICB9LCBmYWxzZSwgZmFsc2UsIFwiU2V0enQgQW56YWhsIFppZWdlbCBhbiBkZXIgYW5nZWdlYmVuZW4gUG9zaXRpb24gbWl0IGRlciBhbmdlZ2ViZW5lbiBGYXJiZS4gRGllIHgtIHVuZCB5LUtvb3JkaW5hdGVuIGJlZ2lubmVuIGJlaSAxLlwiKSk7XHJcbiAgICBcclxuICAgICAgICAgICAgdGhpcy5hZGRNZXRob2QobmV3IE1ldGhvZChcInNldHplTWFya2VcIiwgbmV3IFBhcmFtZXRlcmxpc3QoW1xyXG4gICAgICAgICAgICAgICAgeyBpZGVudGlmaWVyOiBcInhcIiwgdHlwZTogaW50UHJpbWl0aXZlVHlwZSwgZGVjbGFyYXRpb246IG51bGwsIHVzYWdlUG9zaXRpb25zOiBudWxsLCBpc0ZpbmFsOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICB7IGlkZW50aWZpZXI6IFwieVwiLCB0eXBlOiBpbnRQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgIHsgaWRlbnRpZmllcjogXCJmYXJiZVwiLCB0eXBlOiBzdHJpbmdQcmltaXRpdmVUeXBlLCBkZWNsYXJhdGlvbjogbnVsbCwgdXNhZ2VQb3NpdGlvbnM6IG51bGwsIGlzRmluYWw6IHRydWUgfVxyXG4gICAgICAgICAgICBdKSwgbnVsbCxcclxuICAgICAgICAgICAgICAgIChwYXJhbWV0ZXJzKSA9PiB7XHJcbiAgICBcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbzogUnVudGltZU9iamVjdCA9IHBhcmFtZXRlcnNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHg6IG51bWJlciA9IHBhcmFtZXRlcnNbMV0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHk6IG51bWJlciA9IHBhcmFtZXRlcnNbMl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZhcmJlOiBzdHJpbmcgPSBwYXJhbWV0ZXJzWzNdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCByaCA9IDxSb2JvdFdvcmxkSGVscGVyPm8uaW50cmluc2ljRGF0YVtcIlJvYm90V29ybGRIZWxwZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmKHggPCAxIHx8IHggPiByaC53b3JsZFggfHwgeSA8IDEgfHwgeSA+IHJoLndvcmxkWSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJoLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKGBEaWUgUG9zaXRpb24gKCR7eH0vJHt5fSkgaXN0IGF1w59lcmhhbGIgZGVyIFdlbHRncmVuemVuLmApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByaC5zZXRNYXJrZXIoeC0xLCB5LTEsIGZhcmJlKTtcclxuICAgIFxyXG4gICAgICAgICAgICAgICAgfSwgZmFsc2UsIGZhbHNlLCBcIlNldHp0IGVpbmVuIE1hcmtlciBhbiBkZXIgYW5nZWdlYmVuZW4gUG9zaXRpb24gbWl0IGRlciBhbmdlZ2ViZW5lbiBGYXJiZS4gRGllIHgtIHVuZCB5LUtvb3JkaW5hdGVuIGJlZ2lubmVuIGJlaSAxLlwiKSk7XHJcbiAgICBcclxuICAgIFxyXG4gICAgfVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFJvYm90V29ybGRIZWxwZXIge1xyXG5cclxuICAgIHdvcmxkSGVscGVyOiBXb3JsZEhlbHBlcjtcclxuXHJcbiAgICByb2JvdEN1YmVGYWN0b3J5OiBSb2JvdEN1YmVGYWN0b3J5O1xyXG4gICAgY2FtZXJhOiBQaXhpM2QuQ2FtZXJhO1xyXG4gICAgZGlzcGxheU9iamVjdDogUElYSS5EaXNwbGF5T2JqZWN0O1xyXG4gICAgY29udGFpbmVyM0Q6IFBpeGkzZC5Db250YWluZXIzRDtcclxuXHJcbiAgICBtYXJrZXJzOiBSb2JvdE1hcmtlcltdW10gPSBbXTsgICAgLy8geCwgeVxyXG4gICAgYnJpY2tzOiBSb2JvdEJyaWNrW11bXVtdID0gW107ICAgLy8geCwgeSwgaGVpZ2h0XHJcblxyXG4gICAgbWF4aW11bUhlaWdodDogbnVtYmVyID0gMTU7XHJcblxyXG4gICAgcm9ib3RzOiBSb2JvdEhlbHBlcltdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IocHVibGljIGludGVycHJldGVyOiBJbnRlcnByZXRlciwgcHVibGljIHJ1bnRpbWVPYmplY3Q6IFJ1bnRpbWVPYmplY3QsXHJcbiAgICAgICAgcHVibGljIHdvcmxkWDogbnVtYmVyLCBwdWJsaWMgd29ybGRZOiBudW1iZXIsIGluaXRpYWxlV2VsdDogc3RyaW5nKSB7XHJcblxyXG4gICAgICAgIHRoaXMuZmV0Y2hXb3JsZChpbnRlcnByZXRlcik7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLndvcmxkSGVscGVyLnJvYm90V29ybGRIZWxwZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRXMgd3VyZGUgYmVyZWl0cyBlaW4gUm9ib3QtV29ybGQtT2JqZWt0IGluc3RhbnppZXJ0LiBEYXZvbiBrYW5uIGVzIGFiZXIgbnVyIGVpbiBlaW56aWdlcyBnZWJlbi4gXFxuVGlwcDogSmVkZXMgUm9ib3QtT2JqZWt0IGthbm4gZGFzIFJvYm90LVdvcmxkLU9iamVrdCBtaXQgZGVyIGdldFJvYm90V29ybGQoKSBob2xlbi5cIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMud29ybGRIZWxwZXIucm9ib3RXb3JsZEhlbHBlciA9IHRoaXM7XHJcblxyXG4gICAgICAgIHRoaXMuY2FtZXJhID0gbmV3IFBpeGkzZC5DYW1lcmEoPFBJWEkuUmVuZGVyZXI+dGhpcy53b3JsZEhlbHBlci5hcHAucmVuZGVyZXIpO1xyXG5cclxuICAgICAgICB0aGlzLnJvYm90Q3ViZUZhY3RvcnkgPSBuZXcgUm9ib3RDdWJlRmFjdG9yeSh0aGlzLndvcmxkSGVscGVyLCB0aGlzLmNhbWVyYSk7XHJcblxyXG4gICAgICAgIHRoaXMubWFya2VycyA9IFtdO1xyXG4gICAgICAgIHRoaXMuYnJpY2tzID0gW107XHJcblxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyM0QgPSBuZXcgUGl4aTNkLkNvbnRhaW5lcjNEKCk7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5T2JqZWN0ID0gdGhpcy5jb250YWluZXIzRDtcclxuICAgICAgICB0aGlzLndvcmxkSGVscGVyLnN0YWdlLmFkZENoaWxkKHRoaXMuZGlzcGxheU9iamVjdCk7XHJcblxyXG5cclxuICAgICAgICBpZiAoaW5pdGlhbGVXZWx0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5pbml0RnJvbVN0cmluZyhpbml0aWFsZVdlbHQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdFdvcmxkQXJyYXlzKHdvcmxkWCwgd29ybGRZKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyT3JuYW1lbnRzQW5kSW5pdENhbWVyYSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBhZGp1c3RSb2JvdFBvc2l0aW9ucyh4OiBudW1iZXIsIHk6IG51bWJlcil7XHJcbiAgICAgICAgZm9yKGxldCByb2JvdCBvZiB0aGlzLnJvYm90cyl7XHJcbiAgICAgICAgICAgIGlmKHJvYm90LnggPT0geCAmJiByb2JvdC55ID09IHkpe1xyXG4gICAgICAgICAgICAgICAgcm9ib3QubW9kZWwueSA9IHRoaXMuZ2V0QnJpY2tDb3VudCh4LCB5KSArIDEuNjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpbml0V29ybGRBcnJheXMod29ybGRYOiBudW1iZXIsIHdvcmxkWTogbnVtYmVyKSB7XHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3b3JsZFg7IHgrKykge1xyXG4gICAgICAgICAgICBsZXQgbWFya2VyQ29sdW1uID0gW107XHJcbiAgICAgICAgICAgIHRoaXMubWFya2Vycy5wdXNoKG1hcmtlckNvbHVtbik7XHJcbiAgICAgICAgICAgIGxldCBicmlja0NvbHVtbiA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmJyaWNrcy5wdXNoKGJyaWNrQ29sdW1uKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB3b3JsZFk7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgbWFya2VyQ29sdW1uLnB1c2gobnVsbCk7XHJcbiAgICAgICAgICAgICAgICBicmlja0NvbHVtbi5wdXNoKFtdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmZXRjaFdvcmxkKGludGVycHJldGVyOiBJbnRlcnByZXRlcikge1xyXG4gICAgICAgIGxldCB3b3JsZEhlbHBlciA9IGludGVycHJldGVyLndvcmxkSGVscGVyO1xyXG4gICAgICAgIGlmICh3b3JsZEhlbHBlciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCB3OiBSdW50aW1lT2JqZWN0ID0gbmV3IFJ1bnRpbWVPYmplY3QoPEtsYXNzPmludGVycHJldGVyLm1vZHVsZVN0b3JlLmdldFR5cGUoXCJXb3JsZFwiKS50eXBlKTtcclxuICAgICAgICAgICAgd29ybGRIZWxwZXIgPSBuZXcgV29ybGRIZWxwZXIoODAwLCA2MDAsIGludGVycHJldGVyLm1vZHVsZVN0b3JlLmdldE1vZHVsZShcIkJhc2UgTW9kdWxlXCIpLCB3KTtcclxuICAgICAgICAgICAgdy5pbnRyaW5zaWNEYXRhW1wiV29ybGRcIl0gPSB3b3JsZEhlbHBlcjtcclxuICAgICAgICAgICAgaW50ZXJwcmV0ZXIud29ybGRIZWxwZXIgPSB3b3JsZEhlbHBlcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy53b3JsZEhlbHBlciA9IHdvcmxkSGVscGVyO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICByZW5kZXJPcm5hbWVudHNBbmRJbml0Q2FtZXJhKCkge1xyXG4gICAgICAgIHRoaXMud29ybGRIZWxwZXIuYXBwLnJlbmRlcmVyLmJhY2tncm91bmRDb2xvciA9IDB4ODA4MGZmO1xyXG5cclxuICAgICAgICBsZXQgZ3AgPSB0aGlzLnJvYm90Q3ViZUZhY3RvcnkuZ2V0R3Jhc3NQbGFuZSh0aGlzLndvcmxkWCwgdGhpcy53b3JsZFkpO1xyXG4gICAgICAgIHRoaXMuY29udGFpbmVyM0QuYWRkQ2hpbGQoZ3ApO1xyXG5cclxuICAgICAgICBsZXQgZGVlcDogbnVtYmVyID0gMDtcclxuICAgICAgICBsZXQgcmFkaXVzOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIHRoaXMucm9ib3RDdWJlRmFjdG9yeS5nZXRTaWRlUGxhbmVzKHRoaXMud29ybGRYLCB0aGlzLndvcmxkWSwgXCJyb2JvdCMzXCIsIHJhZGl1cywgZGVlcCsrKVxyXG4gICAgICAgICAgICAuZm9yRWFjaChwID0+IHsgdGhpcy5jb250YWluZXIzRC5hZGRDaGlsZChwKTsgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnJvYm90Q3ViZUZhY3RvcnkuZ2V0U2lkZVBsYW5lcyh0aGlzLndvcmxkWCwgdGhpcy53b3JsZFksIFwicm9ib3QjMTBcIiwgcmFkaXVzLCBkZWVwKyspXHJcbiAgICAgICAgICAgICAgICAuZm9yRWFjaChwID0+IHsgdGhpcy5jb250YWluZXIzRC5hZGRDaGlsZChwKTsgfSk7XHJcblxyXG4gICAgICAgIHRoaXMucm9ib3RDdWJlRmFjdG9yeS5tYWtlQ2xvdWRzKHRoaXMuY29udGFpbmVyM0QsIDYwLCB0aGlzLndvcmxkWC8yLCB0aGlzLndvcmxkWS8yKTtcclxuXHJcbiAgICAgICAgdGhpcy5yb2JvdEN1YmVGYWN0b3J5Lm1ha2VQbGFuZSh0aGlzLmNvbnRhaW5lcjNELCB0aGlzLndvcmxkWC8yLCAtNCwgdGhpcy53b3JsZFkvMiwgMzAwMCwgMzAwMCwgXHJcbiAgICAgICAgbmV3IFBpeGkzZC5Db2xvcig1NS4wLzI1NSwgMTc0LjAvMjU1LCA3Ny4wLzI1NSkpO1xyXG5cclxuICAgICAgICBsZXQgbm9ydGhTcHJpdGUgPSB0aGlzLnJvYm90Q3ViZUZhY3RvcnkubWFrZVNwcml0ZTNkKFwicm9ib3QjMTFcIiwgdGhpcy5jb250YWluZXIzRCk7XHJcbiAgICAgICAgLy8gbm9ydGhTcHJpdGUucG9zaXRpb24uc2V0KHRoaXMud29ybGRYICsgNiwgMSwgdGhpcy53b3JsZFkgLSAxKTtcclxuICAgICAgICBub3J0aFNwcml0ZS5wb3NpdGlvbi5zZXQoMip0aGlzLndvcmxkWCArIDEsIC0xLCAyKnRoaXMud29ybGRZIC0gNik7XHJcbiAgICAgICAgbm9ydGhTcHJpdGUuc2NhbGUuc2V0KDI1Ny4wLzQwLCAxLCAxKTtcclxuICAgICAgICBub3J0aFNwcml0ZS5yb3RhdGlvblF1YXRlcm5pb24uc2V0RXVsZXJBbmdsZXMoMCwgOTAsIDApO1xyXG5cclxuICAgICAgICBsZXQgY29udHJvbCA9IG5ldyBQaXhpM2QuQ2FtZXJhT3JiaXRDb250cm9sKHRoaXMud29ybGRIZWxwZXIuYXBwLnZpZXcsIHRoaXMuY2FtZXJhKTtcclxuICAgICAgICBjb250cm9sLmFuZ2xlcy54ID0gNDU7XHJcbiAgICAgICAgY29udHJvbC5hbmdsZXMueSA9IC0yMDtcclxuICAgICAgICBjb250cm9sLnRhcmdldCA9IHsgeDogdGhpcy53b3JsZFggLSAxLCB5OiAwLCB6OiB0aGlzLndvcmxkWSAtIDEgfVxyXG4gICAgICAgIGNvbnRyb2wuZGlzdGFuY2UgPSBNYXRoLm1heCh0aGlzLndvcmxkWCwgdGhpcy53b3JsZFkpICogMi4zO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBhZGRCcmljayh4OiBudW1iZXIsIHk6IG51bWJlciwgZmFyYmU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCBvbGRIZWlnaHQgPSB0aGlzLmJyaWNrc1t4XVt5XS5sZW5ndGg7XHJcbiAgICAgICAgaWYgKG9sZEhlaWdodCA8IHRoaXMubWF4aW11bUhlaWdodCkge1xyXG4gICAgICAgICAgICBsZXQgYnJpY2sgPSB0aGlzLnJvYm90Q3ViZUZhY3RvcnkuZ2V0QnJpY2soZmFyYmUpO1xyXG4gICAgICAgICAgICB0aGlzLnNldFRvWFkoeCwgeSwgb2xkSGVpZ2h0LCBicmljayk7XHJcbiAgICAgICAgICAgIHRoaXMuYnJpY2tzW3hdW3ldLnB1c2goYnJpY2spO1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lcjNELmFkZENoaWxkKGJyaWNrKTtcclxuICAgICAgICAgICAgdGhpcy5hZGp1c3RNYXJrZXJIZWlnaHQoeCwgeSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRqdXN0Um9ib3RQb3NpdGlvbnMoeCwgeSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlQnJpY2soeDogbnVtYmVyLCB5OiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICBpZiAodGhpcy5icmlja3NbeF1beV0ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBsZXQgYnJpY2sgPSB0aGlzLmJyaWNrc1t4XVt5XS5wb3AoKTtcclxuICAgICAgICAgICAgYnJpY2suZGVzdHJveSgpO1xyXG4gICAgICAgICAgICB0aGlzLmFkanVzdE1hcmtlckhlaWdodCh4LCB5KTtcclxuICAgICAgICAgICAgdGhpcy5hZGp1c3RSb2JvdFBvc2l0aW9ucyh4LCB5KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRCcmlja0NvdW50KHg6IG51bWJlciwgeTogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYnJpY2tzW3hdW3ldLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICBoYXNCcmlja0NvbG9yKHg6IG51bWJlciwgeTogbnVtYmVyLCBmYXJiZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgZm9yIChsZXQgYnJpY2sgb2YgdGhpcy5icmlja3NbeF1beV0pIHtcclxuICAgICAgICAgICAgaWYgKGJyaWNrLmZhcmJlID09IGZhcmJlKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGdldE1hcmtlckNvbG9yKHg6IG51bWJlciwgeTogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgICAgICBsZXQgbWFya2VyID0gdGhpcy5tYXJrZXJzW3hdW3ldO1xyXG4gICAgICAgIGlmIChtYXJrZXIgPT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgcmV0dXJuIG1hcmtlci5mYXJiZTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRNYXJrZXIoeDogbnVtYmVyLCB5OiBudW1iZXIsIGZhcmJlOiBzdHJpbmcpIHtcclxuICAgICAgICBpZiAodGhpcy5tYXJrZXJzW3hdW3ldICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXJrZXJzW3hdW3ldLmRlc3Ryb3koKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IG1hcmtlciA9IHRoaXMucm9ib3RDdWJlRmFjdG9yeS5nZXRNYXJrZXIoZmFyYmUpO1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1t4XVt5XSA9IG1hcmtlcjtcclxuICAgICAgICB0aGlzLmNvbnRhaW5lcjNELmFkZENoaWxkKG1hcmtlcik7XHJcbiAgICAgICAgdGhpcy5zZXRUb1hZKHgsIHksIDAsIG1hcmtlcik7XHJcbiAgICAgICAgdGhpcy5hZGp1c3RNYXJrZXJIZWlnaHQoeCwgeSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlTWFya2VyKHg6IG51bWJlciwgeTogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IG1hcmtlciA9IHRoaXMubWFya2Vyc1t4XVt5XTtcclxuICAgICAgICBpZiAobWFya2VyID09IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFya2Vyc1t4XVt5XSA9IG51bGw7XHJcbiAgICAgICAgICAgIG1hcmtlci5kZXN0cm95KCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhZGp1c3RNYXJrZXJIZWlnaHQoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgbWFya2VyID0gdGhpcy5tYXJrZXJzW3hdW3ldO1xyXG4gICAgICAgIGlmIChtYXJrZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgaGVpZ2h0ID0gdGhpcy5icmlja3NbeF1beV0ubGVuZ3RoXHJcbiAgICAgICAgICAgIG1hcmtlci55ID0gaGVpZ2h0ICsgMC4xO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbGVhcigpIHtcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuYnJpY2tzLmxlbmd0aDsgeCsrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5icmlja3NbeF0ubGVuZ3RoOyB5KyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBicmlja0xpc3QgPSB0aGlzLmJyaWNrc1t4XVt5XTtcclxuICAgICAgICAgICAgICAgIHdoaWxlIChicmlja0xpc3QubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJyaWNrTGlzdC5wb3AoKS5kZXN0cm95KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5tYXJrZXJzLmxlbmd0aDsgeCsrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5tYXJrZXJzW3hdLmxlbmd0aDsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWFya2VyID0gdGhpcy5tYXJrZXJzW3hdW3ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKG1hcmtlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXJrZXJzW3hdW3ldID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBtYXJrZXIuZGVzdHJveSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldERpbWVuc2lvbnMod29ybGRYOiBudW1iZXIsIHdvcmxkWTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5jbGVhcigpO1xyXG5cclxuICAgICAgICB0aGlzLndvcmxkWCA9IHdvcmxkWDtcclxuICAgICAgICB0aGlzLndvcmxkWSA9IHdvcmxkWTtcclxuXHJcbiAgICAgICAgdGhpcy5tYXJrZXJzID0gW107XHJcbiAgICAgICAgdGhpcy5icmlja3MgPSBbXTtcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdvcmxkWDsgeCsrKSB7XHJcbiAgICAgICAgICAgIGxldCBtYXJrZXJDb2x1bW4gPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5tYXJrZXJzLnB1c2gobWFya2VyQ29sdW1uKTtcclxuICAgICAgICAgICAgbGV0IGJyaWNrQ29sdW1uID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuYnJpY2tzLnB1c2goYnJpY2tDb2x1bW4pO1xyXG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHdvcmxkWTsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICBtYXJrZXJDb2x1bW4ucHVzaChudWxsKTtcclxuICAgICAgICAgICAgICAgIGJyaWNrQ29sdW1uLnB1c2goW10pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldE51bWJlck9mQnJpY2tzKHg6IG51bWJlciwgeTogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYnJpY2tzW3hdW3ldLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIGluaXRTdHJpbmcgXHJcbiAgICAgKiBcIiBcIjogZW1wdHkgXHJcbiAgICAgKiBcIl9cIjogbm8gYnJpY2ssIHllbGxvdyBtYXJrZXJcclxuICAgICAqIFwiWVwiLCBcIkdcIiwgXCJCXCIsIFwiUlwiOiBzd2l0Y2ggbWFya2VyIGNvbG9yXHJcbiAgICAgKiBcInlcIiwgXCJnXCIsIFwiYlwiLCBcInJcIjogc3dpdGNoIGJyaWNrIGNvbG9yXHJcbiAgICAgKiBcIjFcIiwgLi4uLCBcIjlcIjogMSwgLi4uLCA5IGJyaWNrcyBcclxuICAgICAqIFwiMW1cIiwgLi4uLCBcIjltXCI6IDEsIC4uLiwgOSBicmlja3Mgd2l0aCBtYXJrZXJzIG9uIHRoZW1cclxuICAgICAqL1xyXG4gICAgaW5pdEZyb21TdHJpbmcoaW5pdFN0cmluZzogc3RyaW5nKSB7XHJcblxyXG4gICAgICAgIGxldCBsb3dlckNhc2VDaGFyVG9Db2xvciA9IHsgXCJyXCI6IFwicm90XCIsIFwiZ1wiOiBcImdyw7xuXCIsIFwiYlwiOiBcImJsYXVcIiwgXCJ5XCI6IFwiZ2VsYlwiIH07XHJcbiAgICAgICAgbGV0IHVwcGVyQ2FzZUNoYXJUb0NvbG9yID0geyBcIlJcIjogXCJyb3RcIiwgXCJHXCI6IFwiZ3LDvG5cIiwgXCJCXCI6IFwiYmxhdVwiLCBcIllcIjogXCJnZWxiXCIgfTtcclxuICAgICAgICBsZXQgZGlnaXRzID0gW1wiMVwiLCBcIjJcIiwgXCIzXCIsIFwiNFwiLCBcIjVcIiwgXCI2XCIsIFwiN1wiLCBcIjhcIiwgXCI5XCIsIFwiMFwiXTtcclxuXHJcbiAgICAgICAgdGhpcy5jbGVhcigpO1xyXG4gICAgICAgIGxldCByb3dzID0gaW5pdFN0cmluZy5zcGxpdChcIlxcblwiKTtcclxuICAgICAgICBsZXQgbWF4Q29sdW1ucyA9IDA7XHJcbiAgICAgICAgcm93cy5mb3JFYWNoKChyb3cpID0+IHsgbGV0IHJvd0xlbmd0aCA9IHRoaXMucm93TGVuZ3RoKHJvdyk7IGlmIChyb3dMZW5ndGggPiBtYXhDb2x1bW5zKSBtYXhDb2x1bW5zID0gcm93TGVuZ3RoIH0pO1xyXG4gICAgICAgIHRoaXMuaW5pdFdvcmxkQXJyYXlzKG1heENvbHVtbnMsIHJvd3MubGVuZ3RoKTtcclxuXHJcbiAgICAgICAgdGhpcy53b3JsZFggPSBtYXhDb2x1bW5zO1xyXG4gICAgICAgIHRoaXMud29ybGRZID0gcm93cy5sZW5ndGg7XHJcblxyXG4gICAgICAgIGxldCBjMTogc3RyaW5nO1xyXG4gICAgICAgIGxldCBjMjogc3RyaW5nO1xyXG4gICAgICAgIGxldCBicmlja0NvbG9yID0gXCJyb3RcIjtcclxuICAgICAgICBsZXQgbWFya2VyQ29sb3IgPSBcImdlbGJcIjtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCByb3dzLmxlbmd0aDsgeSsrKSB7XHJcbiAgICAgICAgICAgIGxldCByb3cgPSByb3dzW3ldO1xyXG4gICAgICAgICAgICBsZXQgeCA9IDA7XHJcbiAgICAgICAgICAgIGxldCBwb3MgPSAwO1xyXG4gICAgICAgICAgICB3aGlsZSAocG9zIDwgcm93Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgYzEgPSByb3cuY2hhckF0KHBvcyk7XHJcbiAgICAgICAgICAgICAgICBjMiA9IHBvcyA8IHJvdy5sZW5ndGggLSAxID8gcm93LmNoYXJBdChwb3MgKyAxKSA6IG51bGw7XHJcbiAgICAgICAgICAgICAgICBwb3MrKztcclxuICAgICAgICAgICAgICAgIGlmIChsb3dlckNhc2VDaGFyVG9Db2xvcltjMV0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJyaWNrQ29sb3IgPSBsb3dlckNhc2VDaGFyVG9Db2xvcltjMV07XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodXBwZXJDYXNlQ2hhclRvQ29sb3JbYzFdICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBtYXJrZXJDb2xvciA9IHVwcGVyQ2FzZUNoYXJUb0NvbG9yW2MxXTtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCBpbmRleCA9IGRpZ2l0cy5pbmRleE9mKGMxKTtcclxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRleCArIDE7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEJyaWNrKHgsIHksIGJyaWNrQ29sb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYzIgPT0gXCJtXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRNYXJrZXIoeCwgeSwgbWFya2VyQ29sb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3MrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgeCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGMxID09IFwiIFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGMxID09IFwiX1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRNYXJrZXIoeCwgeSwgbWFya2VyQ29sb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIHgrKztcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJvd0xlbmd0aChyb3c6IHN0cmluZykge1xyXG4gICAgICAgIGxldCBsOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIGxldCBmb3J3YXJkQ2hhcnMgPSBcIiBfMTIzNDU2Nzg5MFwiO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvdy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoZm9yd2FyZENoYXJzLmluZGV4T2Yocm93LmNoYXJBdChpKSkgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgbCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBsO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFRvWFkoeDogbnVtYmVyLCB5OiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBtZXNoOiBQaXhpM2QuTWVzaDNEKSB7XHJcbiAgICAgICAgbWVzaC54ID0gMiAqICh0aGlzLndvcmxkWCAtIHggLSAxKTtcclxuICAgICAgICBtZXNoLnogPSAyICogKHRoaXMud29ybGRZIC0geSAtIDEpO1xyXG4gICAgICAgIG1lc2gueSA9IGhlaWdodDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBXaXJkIHZvbiBXb3JsZEhlbHBlciBhdWZnZXJ1ZmVuXHJcbiAgICBkZXN0cm95KCkge1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnaWJ0RmFyYmUoZmFyYmU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnJvYm90Q3ViZUZhY3RvcnkuZmFyYmVuLmluZGV4T2YoZmFyYmUpID49IDA7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5cclxuY2xhc3MgRGlyZWN0aW9uIHtcclxuICAgIG5hbWVzOiBzdHJpbmdbXSA9IFtcInRvcFwiLCBcInJpZ2h0XCIsIFwiYm90dG9tXCIsIFwibGVmdFwiXTtcclxuICAgIGRlbHRhczogeyBkeDogbnVtYmVyLCBkeTogbnVtYmVyIH1bXSA9IFt7IGR4OiAwLCBkeTogLTEgfSwgeyBkeDogLTEsIGR5OiAwIH0sIHsgZHg6IDAsIGR5OiAxIH0sIHsgZHg6IDEsIGR5OiAwIH1dO1xyXG4gICAgYW5nbGVzOiBudW1iZXJbXSA9IFswLCA5MCwgMTgwLCAyNzBdO1xyXG5cclxuICAgIHB1YmxpYyBpbmRleDogbnVtYmVyID0gMjsgLy8gdG9wXHJcblxyXG4gICAgdHVyblJpZ2h0KCkge1xyXG4gICAgICAgIHRoaXMuaW5kZXggPSAodGhpcy5pbmRleCAtIDEgKyA0KSAlIDQ7XHJcbiAgICB9XHJcblxyXG4gICAgdHVybkxlZnQoKSB7XHJcbiAgICAgICAgdGhpcy5pbmRleCA9ICh0aGlzLmluZGV4ICsgMSArIDQpICUgNDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRBbmdsZSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hbmdsZXNbdGhpcy5pbmRleF07XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0RGVsdGFzKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRlbHRhc1t0aGlzLmluZGV4XTtcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSb2JvdEhlbHBlciB7XHJcblxyXG4gICAgcm9ib3RXb3JsZEhlbHBlcjogUm9ib3RXb3JsZEhlbHBlcjtcclxuICAgIG1vZGVsOiBQaXhpM2QuTW9kZWw7XHJcbiAgICB4OiBudW1iZXI7XHJcbiAgICB5OiBudW1iZXI7XHJcblxyXG4gICAgaGF0U3RlaW5lOiBudW1iZXIgPSAxMDAwMDAwMDtcclxuICAgIG1heFN0ZWluZTogbnVtYmVyID0gMTAwMDAwMDAwO1xyXG5cclxuICAgIGRpcmVjdGlvbjogRGlyZWN0aW9uID0gbmV3IERpcmVjdGlvbigpO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgaW50ZXJwcmV0ZXI6IEludGVycHJldGVyLCBwcml2YXRlIHJ1bnRpbWVPYmplY3Q6IFJ1bnRpbWVPYmplY3QsXHJcbiAgICAgICAgc3RhcnRYOiBudW1iZXIsIHN0YXJ0WTogbnVtYmVyLFxyXG4gICAgICAgIHdvcmxkWDogbnVtYmVyLCB3b3JsZFk6IG51bWJlcixcclxuICAgICAgICBpbml0aWFsZVdlbHQ6IHN0cmluZyA9IG51bGxcclxuICAgICkge1xyXG5cclxuICAgICAgICB0aGlzLmZldGNoUm9ib3RXb3JsZChpbnRlcnByZXRlciwgd29ybGRYLCB3b3JsZFksIGluaXRpYWxlV2VsdCk7XHJcbiAgICAgICAgdGhpcy5yb2JvdFdvcmxkSGVscGVyLnJvYm90cy5wdXNoKHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG5cclxuICAgICAgICB0aGlzLm1vdmVUbyhzdGFydFggLSAxLCBzdGFydFkgLSAxKTtcclxuICAgICAgICB0aGlzLmFkanVzdEFuZ2xlKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZldGNoUm9ib3RXb3JsZChpbnRlcnByZXRlcjogSW50ZXJwcmV0ZXIsIHdvcmxkWDogbnVtYmVyLCB3b3JsZFk6IG51bWJlciwgaW5pdGlhbGVXZWx0OiBzdHJpbmcpIHtcclxuICAgICAgICBsZXQgd29ybGRIZWxwZXIgPSBpbnRlcnByZXRlci53b3JsZEhlbHBlcjtcclxuICAgICAgICB0aGlzLnJvYm90V29ybGRIZWxwZXIgPSB3b3JsZEhlbHBlcj8ucm9ib3RXb3JsZEhlbHBlcjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMucm9ib3RXb3JsZEhlbHBlciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxldCB3OiBSdW50aW1lT2JqZWN0ID0gbmV3IFJ1bnRpbWVPYmplY3QoPEtsYXNzPmludGVycHJldGVyLm1vZHVsZVN0b3JlLmdldFR5cGUoXCJSb2JvdFdvcmxkXCIpLnR5cGUpO1xyXG4gICAgICAgICAgICB0aGlzLnJvYm90V29ybGRIZWxwZXIgPSBuZXcgUm9ib3RXb3JsZEhlbHBlcihpbnRlcnByZXRlciwgdywgd29ybGRYLCB3b3JsZFksIGluaXRpYWxlV2VsdCk7XHJcbiAgICAgICAgICAgIHcuaW50cmluc2ljRGF0YVtcIlJvYm90V29ybGRIZWxwZXJcIl0gPSB0aGlzLnJvYm90V29ybGRIZWxwZXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZW5kZXIoKTogdm9pZCB7XHJcblxyXG4gICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgIGxldCByb2JvdCA9IFBpeGkzZC5Nb2RlbC5mcm9tKFBJWEkuTG9hZGVyLnNoYXJlZC5yZXNvdXJjZXNbXCJzdGV2ZVwiXS5nbHRmKTtcclxuICAgICAgICByb2JvdC5zY2FsZS5zZXQoMC4xKTtcclxuICAgICAgICBmb3IgKGxldCBtZXNoIG9mIHJvYm90Lm1lc2hlcykge1xyXG4gICAgICAgICAgICBsZXQgc20gPSA8UGl4aTNkLlN0YW5kYXJkTWF0ZXJpYWw+bWVzaC5tYXRlcmlhbDtcclxuICAgICAgICAgICAgc20uY2FtZXJhID0gdGhpcy5yb2JvdFdvcmxkSGVscGVyLmNhbWVyYTtcclxuICAgICAgICAgICAgc20uZXhwb3N1cmUgPSAwLjU7XHJcbiAgICAgICAgICAgIHNtLmxpZ2h0aW5nRW52aXJvbm1lbnQgPSB0aGlzLnJvYm90V29ybGRIZWxwZXIucm9ib3RDdWJlRmFjdG9yeS5saWdodGluZ0Vudmlyb25tZW50O1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnJvYm90V29ybGRIZWxwZXIuY29udGFpbmVyM0QuYWRkQ2hpbGQocm9ib3QpO1xyXG4gICAgICAgIHRoaXMubW9kZWwgPSByb2JvdDtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIGNyb3AobjogbnVtYmVyLCBtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGlmIChuIDwgbWluKSBuID0gbWluO1xyXG4gICAgICAgIGlmIChuID4gbWF4KSBuID0gbWF4O1xyXG4gICAgICAgIHJldHVybiBuO1xyXG4gICAgfVxyXG5cclxuICAgIG1vdmVUbyh4OiBudW1iZXIsIHk6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IHJ3ID0gdGhpcy5yb2JvdFdvcmxkSGVscGVyO1xyXG4gICAgICAgIHggPSB0aGlzLmNyb3AoeCwgMCwgcncud29ybGRYIC0gMSk7XHJcbiAgICAgICAgeSA9IHRoaXMuY3JvcCh5LCAwLCBydy53b3JsZFkgLSAxKTtcclxuXHJcbiAgICAgICAgdGhpcy5tb2RlbC54ID0gMiAqIChydy53b3JsZFggLSB4IC0gMSk7XHJcbiAgICAgICAgdGhpcy5tb2RlbC56ID0gMiAqIChydy53b3JsZFkgLSB5IC0gMSk7XHJcbiAgICAgICAgdGhpcy5tb2RlbC55ID0gcncuZ2V0TnVtYmVyT2ZCcmlja3MoeCwgeSkgKyAxLjY7XHJcblxyXG4gICAgICAgIHRoaXMueCA9IHg7XHJcbiAgICAgICAgdGhpcy55ID0geTtcclxuICAgIH1cclxuXHJcbiAgICBhZGp1c3RBbmdsZSgpIHtcclxuICAgICAgICB0aGlzLm1vZGVsLnRyYW5zZm9ybS5yb3RhdGlvblF1YXRlcm5pb24uc2V0RXVsZXJBbmdsZXMoMCwgdGhpcy5kaXJlY3Rpb24uZ2V0QW5nbGUoKSwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2Nocml0dCgpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgZGVsdGFzID0gdGhpcy5kaXJlY3Rpb24uZ2V0RGVsdGFzKCk7XHJcbiAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBkZWx0YXMuZHg7XHJcbiAgICAgICAgbGV0IG5ld1kgPSB0aGlzLnkgKyBkZWx0YXMuZHk7XHJcbiAgICAgICAgY29uc3QgcncgPSB0aGlzLnJvYm90V29ybGRIZWxwZXI7XHJcblxyXG4gICAgICAgIGlmIChuZXdYIDwgMCB8fCBuZXdYID49IHJ3LndvcmxkWCB8fCBuZXdZIDwgMCB8fCBuZXdZID49IHJ3LndvcmxkWSkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGVyIFJvYm90ZXIgaXN0IGdlZ2VuIGVpbmUgV2FuZCBnZXByYWxsdCFcIik7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBvbGRIZWlnaHQgPSBydy5nZXROdW1iZXJPZkJyaWNrcyh0aGlzLngsIHRoaXMueSk7XHJcbiAgICAgICAgbGV0IG5ld0hlaWdodCA9IHJ3LmdldE51bWJlck9mQnJpY2tzKG5ld1gsIG5ld1kpO1xyXG5cclxuICAgICAgICBpZiAobmV3SGVpZ2h0IDwgb2xkSGVpZ2h0IC0gMSkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGVyIFJvYm90ZXIga2FubiBtYXhpbWFsIGVpbmVuIFppZWdlbCBuYWNoIHVudGVuIHNwcmluZ2VuLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5ld0hlaWdodCA+IG9sZEhlaWdodCArIDEpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkRlciBSb2JvdGVyIGthbm4gbWF4aW1hbCBlaW5lbiBaaWVnZWwgaG9jaCBzcHJpbmdlbi5cIik7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubW92ZVRvKG5ld1gsIG5ld1kpO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGhpbmxlZ2VuKGZhcmJlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgZGVsdGFzID0gdGhpcy5kaXJlY3Rpb24uZ2V0RGVsdGFzKCk7XHJcbiAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBkZWx0YXMuZHg7XHJcbiAgICAgICAgbGV0IG5ld1kgPSB0aGlzLnkgKyBkZWx0YXMuZHk7XHJcbiAgICAgICAgY29uc3QgcncgPSB0aGlzLnJvYm90V29ybGRIZWxwZXI7XHJcblxyXG4gICAgICAgIGlmIChuZXdYIDwgMCB8fCBuZXdYID49IHJ3LndvcmxkWCB8fCBuZXdZIDwgMCB8fCBuZXdZID49IHJ3LndvcmxkWSkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGVyIFJvYm90ZXIgc3RlaHQgZGlyZWt0IHZvciBlaW5lciBXYW5kLiBEYSBrYW5uIGVyIGtlaW5lIFppZWdlbCBoaW5sZWdlbi5cIik7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZhcmJlID0gZmFyYmUudG9Mb2NhbGVMb3dlckNhc2UoKTtcclxuICAgICAgICBpZiAoIXJ3LmdpYnRGYXJiZShmYXJiZSkpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkVzIGdpYnQgbnVyIFppZWdlbCBkZXIgRmFyYmVuIFwiICsgcncucm9ib3RDdWJlRmFjdG9yeS5mYXJiZW4uam9pbihcIiwgXCIpICsgXCIuIERpZSBGYXJiZSBcIiArIGZhcmJlICsgXCIgaXN0IG5pY2h0IGRhcnVudGVyLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGF0U3RlaW5lID09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIkRlciBSb2JvdGVyIGhhdCBrZWluZSBaaWVnZWwgbWVociBiZWkgc2ljaCB1bmQga2FubiBkYWhlciBrZWluZW4gbWVociBoaW5sZWdlbi5cIik7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHJ3LmJyaWNrc1tuZXdYXVtuZXdZXS5sZW5ndGggPj0gcncubWF4aW11bUhlaWdodCl7XHJcbiAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJEZXIgWmllZ2Vsc3RhcGVsIGRhcmYgZGllIG1heGltYWxlIEjDtmhlIFwiICsgcncubWF4aW11bUhlaWdodCArIFwiIG5pY2h0IMO8YmVyc2NocmVpdGVuLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcncuYWRkQnJpY2sobmV3WCwgbmV3WSwgZmFyYmUpO1xyXG4gICAgICAgIHRoaXMuaGF0U3RlaW5lLS07XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGF1ZmhlYmVuKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCBkZWx0YXMgPSB0aGlzLmRpcmVjdGlvbi5nZXREZWx0YXMoKTtcclxuICAgICAgICBsZXQgbmV3WCA9IHRoaXMueCArIGRlbHRhcy5keDtcclxuICAgICAgICBsZXQgbmV3WSA9IHRoaXMueSArIGRlbHRhcy5keTtcclxuICAgICAgICBjb25zdCBydyA9IHRoaXMucm9ib3RXb3JsZEhlbHBlcjtcclxuXHJcbiAgICAgICAgaWYgKG5ld1ggPCAwIHx8IG5ld1ggPj0gcncud29ybGRYIHx8IG5ld1kgPCAwIHx8IG5ld1kgPj0gcncud29ybGRZKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW50ZXJwcmV0ZXIudGhyb3dFeGNlcHRpb24oXCJEZXIgUm9ib3RlciBzdGVodCBkaXJla3Qgdm9yIGVpbmVyIFdhbmQuIERhIGthbm4gZXIga2VpbmVuIFppZWdlbCBhdWZoZWJlbi5cIik7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChydy5nZXROdW1iZXJPZkJyaWNrcyhuZXdYLCBuZXdZKSA8IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcnByZXRlci50aHJvd0V4Y2VwdGlvbihcIlZvciBkZW0gUm9ib3RlciBsaWVndCBrZWluIFppZWdlbCwgZXIga2FubiBkYWhlciBrZWluZW4gYXVmaGViZW4uXCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBydy5yZW1vdmVCcmljayhuZXdYLCBuZXdZKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaGF0U3RlaW5lIDwgdGhpcy5tYXhTdGVpbmUpIHtcclxuICAgICAgICAgICAgdGhpcy5oYXRTdGVpbmUrKztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRGVyIFJvYm90ZXIga2FubiBuaWNodCBtZWhyIFN0ZWluZSBhdWZoZWJlbiwgZGEgZXIga2VpbmVuIFBsYXR6IG1laHIgaW4gc2VpbmVtIFJ1Y2tzYWNrIGhhdC5cIik7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIG1hcmtlU2V0emVuKGZhcmJlOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBydyA9IHRoaXMucm9ib3RXb3JsZEhlbHBlcjtcclxuICAgICAgICBmYXJiZSA9IGZhcmJlLnRvTG9jYWxlTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgICAgIGlmICghcncuZ2lidEZhcmJlKGZhcmJlKSkge1xyXG4gICAgICAgICAgICB0aGlzLmludGVycHJldGVyLnRocm93RXhjZXB0aW9uKFwiRXMgZ2lidCBudXIgTWFya2VuIGRlciBGYXJiZW4gXCIgKyBydy5yb2JvdEN1YmVGYWN0b3J5LmZhcmJlbi5qb2luKFwiLCBcIikgKyBcIi4gRGllIEZhcmJlIFwiICsgZmFyYmUgKyBcIiBpc3QgbmljaHQgZGFydW50ZXIuXCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBydy5zZXRNYXJrZXIodGhpcy54LCB0aGlzLnksIGZhcmJlKTtcclxuICAgIH1cclxuXHJcbiAgICBtYXJrZUzDtnNjaGVuKCkge1xyXG4gICAgICAgIGNvbnN0IHJ3ID0gdGhpcy5yb2JvdFdvcmxkSGVscGVyO1xyXG5cclxuICAgICAgICBydy5yZW1vdmVNYXJrZXIodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgfVxyXG5cclxuICAgIGlzdFdhbmQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IGRlbHRhcyA9IHRoaXMuZGlyZWN0aW9uLmdldERlbHRhcygpO1xyXG4gICAgICAgIGxldCBuZXdYID0gdGhpcy54ICsgZGVsdGFzLmR4O1xyXG4gICAgICAgIGxldCBuZXdZID0gdGhpcy55ICsgZGVsdGFzLmR5O1xyXG4gICAgICAgIGNvbnN0IHJ3ID0gdGhpcy5yb2JvdFdvcmxkSGVscGVyO1xyXG5cclxuICAgICAgICByZXR1cm4gKG5ld1ggPCAwIHx8IG5ld1ggPj0gcncud29ybGRYIHx8IG5ld1kgPCAwIHx8IG5ld1kgPj0gcncud29ybGRZKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBpc3RaaWVnZWwocGFyYW06IG51bWJlciB8IHN0cmluZyB8IG51bGwpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgZGVsdGFzID0gdGhpcy5kaXJlY3Rpb24uZ2V0RGVsdGFzKCk7XHJcbiAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBkZWx0YXMuZHg7XHJcbiAgICAgICAgbGV0IG5ld1kgPSB0aGlzLnkgKyBkZWx0YXMuZHk7XHJcbiAgICAgICAgY29uc3QgcncgPSB0aGlzLnJvYm90V29ybGRIZWxwZXI7XHJcblxyXG4gICAgICAgIGlmIChuZXdYIDwgMCB8fCBuZXdYID49IHJ3LndvcmxkWCB8fCBuZXdZIDwgMCB8fCBuZXdZID49IHJ3LndvcmxkWSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocGFyYW0gPT0gbnVsbCkgcmV0dXJuIHJ3LmdldEJyaWNrQ291bnQobmV3WCwgbmV3WSkgPiAwO1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIHBhcmFtID09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJ3Lmhhc0JyaWNrQ29sb3IobmV3WCwgbmV3WSwgcGFyYW0udG9Mb2NhbGVMb3dlckNhc2UoKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcncuYnJpY2tzW25ld1hdW25ld1ldLmxlbmd0aCA9PSBwYXJhbTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaXN0TWFya2UocGFyYW06IHN0cmluZyB8IG51bGwpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBydyA9IHRoaXMucm9ib3RXb3JsZEhlbHBlcjtcclxuICAgICAgICBsZXQgbWFya2UgPSBydy5tYXJrZXJzW3RoaXMueF1bdGhpcy55XTtcclxuICAgICAgICBpZiAocGFyYW0gPT0gbnVsbCkgcmV0dXJuIG1hcmtlICE9IG51bGw7XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2YgcGFyYW0gPT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICByZXR1cm4gbWFya2UgIT0gbnVsbCAmJiBtYXJrZS5mYXJiZSA9PSBwYXJhbS50b0xvY2FsZUxvd2VyQ2FzZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuIl19