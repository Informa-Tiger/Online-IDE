onmessage = function (e) {
    let ri = e.data;
    if (ri.xMax == null)
        return; // BugFix 06.06.2020: Monaco Editor sends messages to everyone...
    let router = new Router(ri);
    router.arrows = ri.arrows;
    let result = router.routeAllArrows();
    //@ts-ignore
    postMessage(result);
    self.close();
};
class Router {
    constructor(routingInput) {
        this.routingInput = routingInput;
        this.rectangles = [];
        this.initRoutingRectangles(routingInput.rectangles);
        this.arrows = routingInput.arrows;
        this.arrowPointField = new Array(this.routingInput.xMax).fill(0).map(() => new Array(this.routingInput.yMax).fill(null));
    }
    initRoutingRectangles(rectangles) {
        if (rectangles == null)
            return;
        for (let r of rectangles) {
            this.rectangles.push({
                left: r.left,
                width: r.width,
                top: r.top,
                height: r.height,
                slots: [
                    {
                        arrowDirectionOutward: { x: 0, y: -1 },
                        deltaFromSlotToSlot: { x: 1, y: 0 },
                        min: 1 - Math.round(r.width / 2),
                        max: r.width - Math.round(r.width / 2) - 1,
                        mid: { x: r.left + Math.round(r.width / 2), y: r.top },
                        lastDelta: -1
                    },
                    {
                        arrowDirectionOutward: { x: 1, y: 0 },
                        deltaFromSlotToSlot: { x: 0, y: 1 },
                        min: 1 - Math.round(r.height / 2),
                        max: r.height - Math.round(r.height / 2) - 1,
                        mid: { x: r.left + r.width, y: r.top + Math.round(r.height / 2) },
                        lastDelta: -1
                    },
                    {
                        arrowDirectionOutward: { x: 0, y: 1 },
                        deltaFromSlotToSlot: { x: 1, y: 0 },
                        min: 1 - Math.round(r.width / 2),
                        max: r.width - Math.round(r.width / 2) - 1,
                        mid: { x: r.left + Math.round(r.width / 2), y: r.top + r.height },
                        lastDelta: -1
                    },
                    {
                        arrowDirectionOutward: { x: -1, y: 0 },
                        deltaFromSlotToSlot: { x: 0, y: 1 },
                        min: 1 - Math.round(r.height / 2),
                        max: r.height - Math.round(r.height / 2) - 1,
                        mid: { x: r.left, y: r.top + Math.round(r.height / 2) },
                        lastDelta: -1
                    }
                ]
            });
        }
    }
    initWeights() {
        this.weights = new Array(this.routingInput.xMax).fill(0).map(() => new Array(this.routingInput.yMax).fill(-1));
        this.locks = new Array(this.routingInput.xMax).fill(0).map(() => new Array(this.routingInput.yMax).fill(0));
    }
    prepareRectangles() {
        let distanceFromRectangles = this.routingInput.distanceFromRectangles;
        if (distanceFromRectangles == null)
            distanceFromRectangles = 1;
        for (let r of this.rectangles) {
            let left = r.left - distanceFromRectangles;
            if (left < 0)
                left = 0;
            let right = r.left + r.width + distanceFromRectangles;
            if (right > this.routingInput.xMax - 1)
                right = this.routingInput.xMax - 1;
            let top = r.top - distanceFromRectangles;
            if (top < 0)
                top = 0;
            let bottom = r.top + r.height + distanceFromRectangles;
            if (bottom > this.routingInput.yMax - 1)
                bottom = this.routingInput.yMax - 1;
            for (let y = top; y <= bottom; y++) {
                for (let x = left; x <= right; x++) {
                    this.locks[x][y] = Router.RectangleWeight;
                }
            }
        }
    }
    smoothArrows() {
        this.weights = new Array(this.routingInput.xMax).fill(0).map(() => new Array(this.routingInput.yMax).fill(0));
        for (let a of this.arrows) {
            if (a.points == null)
                continue;
            for (let p of a.points) {
                this.weights[p.x][p.y]++;
            }
        }
        this.locks = new Array(this.routingInput.xMax).fill(0).map(() => new Array(this.routingInput.yMax).fill(0));
        this.prepareRectangles();
        let done = false;
        while (!done) {
            done = true;
            let p = [null, null, null, null];
            let delta = [null, null, null];
            for (let a of this.arrows) {
                if (a.points == null || a.minimalPoints == null)
                    continue;
                let arrowDirty = false;
                let debug = a.identifier == "a3";
                if (debug)
                    debugger;
                if (a.minimalPoints.length > 4) {
                    for (let i = 0; i < a.minimalPoints.length - 4; i++) {
                        for (let j = 0; j <= 3; j++) {
                            p[j] = a.minimalPoints[i + j];
                        }
                        for (let j = 0; j <= 2; j++) {
                            delta[j] = { x: p[j + 1].x - p[j].x, y: p[j + 1].y - p[j].y };
                        }
                        if (this.sameDirection(delta[0], delta[2]) &&
                            !this.sameDirection(delta[0], delta[1])) {
                            let d01 = Math.abs(delta[0].x) + Math.abs(delta[0].y);
                            let d12 = Math.abs(delta[1].x) + Math.abs(delta[1].y);
                            let d23 = Math.abs(delta[2].x) + Math.abs(delta[2].y);
                            // if(d12 > 20 || d23 > 20) continue;
                            let x = p[0].x;
                            let y = p[0].y;
                            // if(x == 8 && y == 2) debugger;
                            let free = true;
                            for (let i = 1; i <= Math.round(d12); i++) {
                                x += Math.sign(delta[1].x);
                                y += Math.sign(delta[1].y);
                                if (this.weights[x][y] != 0 || this.locks[x][y] != 0) {
                                    free = false;
                                    break;
                                }
                            }
                            for (let i = 1; i < Math.round(d01); i++) {
                                x += Math.sign(delta[0].x);
                                y += Math.sign(delta[0].y);
                                if (this.weights[x][y] != 0 || this.locks[x][y] != 0) {
                                    free = false;
                                    break;
                                }
                            }
                            if (free) {
                                x = p[0].x;
                                y = p[0].y;
                                for (let i = 1; i <= Math.round(d12); i++) {
                                    x += Math.sign(delta[1].x);
                                    y += Math.sign(delta[1].y);
                                    this.weights[x][y] = 1;
                                }
                                for (let i = 1; i < Math.round(d01); i++) {
                                    x += Math.sign(delta[0].x);
                                    y += Math.sign(delta[0].y);
                                    this.weights[x][y] = 1;
                                }
                                x = p[0].x;
                                y = p[0].y;
                                for (let i = 1; i <= Math.round(d01); i++) {
                                    x += Math.sign(delta[0].x);
                                    y += Math.sign(delta[0].y);
                                    this.weights[x][y] = 0;
                                }
                                for (let i = 1; i < Math.round(d12); i++) {
                                    x += Math.sign(delta[1].x);
                                    y += Math.sign(delta[1].y);
                                    this.weights[x][y] = 0;
                                }
                                let s = a.identifier + ": ";
                                for (let p of a.minimalPoints)
                                    s += "(" + p.x + ", " + p.y + "),";
                                p[1].x = p[0].x + delta[1].x;
                                p[1].y = p[0].y + delta[1].y;
                                let delete2And3 = p[1].x == p[3].x && p[1].y == p[3].y;
                                a.minimalPoints.splice(i + 2, delete2And3 ? 2 : 1);
                                arrowDirty = true;
                                i--;
                                done = false;
                            }
                        }
                    }
                }
                if (arrowDirty) {
                    for (let i = 0; i < a.minimalPoints.length - 2; i++) {
                        if (a.minimalPoints[i + 0].x == a.minimalPoints[i + 1].x &&
                            a.minimalPoints[i + 1].x == a.minimalPoints[i + 2].x ||
                            a.minimalPoints[i + 0].y == a.minimalPoints[i + 1].y &&
                                a.minimalPoints[i + 1].y == a.minimalPoints[i + 2].y) {
                            a.minimalPoints.splice(i + 1, 1);
                            i--;
                        }
                    }
                    let s = "->";
                    for (let p of a.minimalPoints)
                        s += "(" + p.x + ", " + p.y + "),";
                }
            }
        }
    }
    sameDirection(p1, p2) {
        return Math.sign(p1.x) == Math.sign(p2.x) && Math.sign(p1.y) == Math.sign(p2.y);
    }
    prepareArrowLocks(newArrow) {
        for (let a of this.arrows) {
            if (a == newArrow)
                return;
            let joinArrow = a.arrowType == newArrow.arrowType && a.destinationIdentifier == newArrow.destinationIdentifier;
            if (a.points == null)
                return;
            for (let p of a.points) {
                if (joinArrow) {
                    this.locks[p.x][p.y] = 0;
                    this.weights[p.x][p.y] = 0;
                }
                else {
                    let w = 6;
                    this.locks[p.x][p.y] += w;
                }
            }
        }
    }
    calculateWeights(xStart, yStart, dxStart, dyStart) {
        if (this.weights[xStart + dxStart] == null) {
            return;
        }
        this.weights[xStart + dxStart][yStart + dyStart] = 1;
        this.weights[xStart][yStart] = 0;
        let d = this.routingInput.straightArrowSectionAfterRectangle;
        if (d == null)
            d = 3;
        let normalX = 1 - Math.abs(dxStart);
        let normalY = 1 - Math.abs(dyStart);
        let i = 0;
        while (i < d + 3) {
            let x = xStart + dxStart * i;
            let y = yStart + dyStart * i;
            if (x > 0 && x < this.routingInput.xMax &&
                y > 0 && y < this.routingInput.yMax &&
                this.locks[x][y] > 0) {
                this.locks[x][y] = 0;
            }
            i++;
        }
        i = 0;
        while (i <= d) {
            let x = xStart + dxStart * i;
            let y = yStart + dyStart * i;
            if (x > 0 && x < this.routingInput.xMax &&
                y > 0 && y < this.routingInput.yMax) {
                this.locks[x + normalX][y + normalY] = 1000;
                this.locks[x - normalX][y - normalY] = 1000;
            }
            i++;
        }
        let stack = [];
        for (let y = 0; y < this.routingInput.yMax; y++) {
            for (let x = 0; x < this.routingInput.xMax; x++) {
                if (this.weights[x][y] >= 0) {
                    stack.push({ x: x, y: y });
                }
            }
        }
        // stack.push({ x: xStart + dxStart, y: yStart + dyStart });
        while (stack.length > 0) {
            let stack1 = stack;
            stack = [];
            for (let p of stack1) {
                let x = p.x;
                let y = p.y;
                let w = this.weights[x][y];
                if (x > 0) {
                    let w1 = this.weights[x - 1][y];
                    let l1 = this.locks[x - 1][y];
                    if ((w1 < 0 || w1 > w + 1) && l1 < 1000) { // w1 < 0
                        this.weights[x - 1][y] = w + 1;
                        stack.push({ x: x - 1, y: y });
                    }
                }
                if (x < this.routingInput.xMax - 1) {
                    let w1 = this.weights[x + 1][y];
                    let l1 = this.locks[x + 1][y];
                    if ((w1 < 0 || w1 > w + 1) && l1 < 1000) { // w1 < 0
                        this.weights[x + 1][y] = w + 1;
                        stack.push({ x: x + 1, y: y });
                    }
                }
                if (y > 0) {
                    let w1 = this.weights[x][y - 1];
                    let l1 = this.locks[x][y - 1];
                    if ((w1 < 0 || w1 > w + 1) && l1 < 1000) { // w1 < 0
                        this.weights[x][y - 1] = w + 1;
                        stack.push({ x: x, y: y - 1 });
                    }
                }
                if (y < this.routingInput.yMax - 1) {
                    let w1 = this.weights[x][y + 1];
                    let l1 = this.locks[x][y + 1];
                    if ((w1 < 0 || w1 > w + 1) && l1 < 1000) { // w1 < 0
                        this.weights[x][y + 1] = w + 1;
                        stack.push({ x: x, y: y + 1 });
                    }
                }
            }
        }
    }
    addPoint(x, y, arrow) {
        if (x < this.arrowPointField.length && y < this.arrowPointField[x].length) {
            arrow.points.push({ x: x, y: y });
            let arrows = this.arrowPointField[x][y];
            if (arrows != null) {
                for (let a of arrows) {
                    if (a.arrowType == arrow.arrowType && a.destinationIdentifier == arrow.destinationIdentifier) {
                        return a;
                    }
                }
            }
        }
    }
    addArrowToArrowPointsField(arrow) {
        if (arrow.points == null)
            return;
        for (let p of arrow.points) {
            let arrows = this.arrowPointField[p.x][p.y];
            if (arrows == null) {
                this.arrowPointField[p.x][p.y] = [arrow];
            }
            else {
                arrows.push(arrow);
            }
        }
    }
    // addPoint(x: number, y: number, arrow: RoutingArrow): RoutingArrow {
    //     arrow.points.push({ x: x, y: y });
    //     let arrows: RoutingArrow[] = this.arrowPointField[x][y];
    //     if (arrows == null) {
    //         arrows = [];
    //         this.arrowPointField[x][y] = arrows;
    //     } else {
    //         for (let a of arrows) {
    //             if (a.arrowType == arrow.arrowType && a.destinationIdentifier == arrow.destinationIdentifier) {
    //                 arrows.push(arrow);
    //                 return a;
    //             }
    //         }
    //     }
    //     arrows.push(arrow);
    // }
    routeAllArrows() {
        if (this.arrows != null) {
            for (let a of this.arrows) {
                this.routeArrowOptimized(a, a.debug == true);
            }
            this.smoothArrows();
        }
        return {
            xMax: this.routingInput.xMax,
            yMax: this.routingInput.yMax,
            arrows: this.arrows,
            rectangles: this.rectangles,
            weights: this.weights,
            locks: this.locks,
            version: this.routingInput.version
        };
    }
    routeArrowOptimized(a, debug = false) {
        let routeVariants = [];
        let sourceRect = this.rectangles[a.sourceRectangleIndex];
        let destRect = this.rectangles[a.destRectangleIndex];
        let slotDistance = this.routingInput.slotDistance;
        for (let sourceDirection = 0; sourceDirection < 4; sourceDirection++) {
            // for (let sourceSlotDelta of [-1, 1]) 
            {
                for (let destDirection = 0; destDirection < 4; destDirection++) {
                    // for (let destSlotDelta of [-1, 1]) 
                    {
                        let sourceSlot = sourceRect.slots[sourceDirection];
                        let destSlot = destRect.slots[destDirection];
                        let sourceDeltaFromMid = 0;
                        let sourceSlotDelta = sourceSlot.lastDelta * -1;
                        sourceSlot.lastDelta *= -1;
                        let destSlotDelta = destSlot.lastDelta * -1;
                        destSlot.lastDelta *= -1;
                        if (sourceSlot.usedFrom != null) {
                            sourceDeltaFromMid = sourceSlotDelta > 0 ?
                                sourceSlot.usedTo + slotDistance : sourceSlot.usedFrom - slotDistance;
                            if (sourceDeltaFromMid < sourceSlot.min || sourceDeltaFromMid > sourceSlot.max) {
                                continue;
                            }
                        }
                        let sourcePos = {
                            x: sourceSlot.mid.x + sourceSlot.deltaFromSlotToSlot.x * sourceDeltaFromMid,
                            y: sourceSlot.mid.y + sourceSlot.deltaFromSlotToSlot.y * sourceDeltaFromMid
                        };
                        let destDeltaFromMid = 0;
                        if (destSlot.usedFrom != null) {
                            destDeltaFromMid = destSlotDelta > 0 ?
                                destSlot.usedTo + slotDistance : destSlot.usedFrom - slotDistance;
                            if (destDeltaFromMid < destSlot.min || destDeltaFromMid > destSlot.max) {
                                continue;
                            }
                        }
                        let destPos = {
                            x: destSlot.mid.x + destSlot.deltaFromSlotToSlot.x * destDeltaFromMid,
                            y: destSlot.mid.y + destSlot.deltaFromSlotToSlot.y * destDeltaFromMid
                        };
                        a.source = sourcePos;
                        a.dest = destPos;
                        a.sourceDirection = sourceSlot.arrowDirectionOutward;
                        a.destDirection = { x: destSlot.arrowDirectionOutward.x, y: destSlot.arrowDirectionOutward.y };
                        a.endsOnArrowWithIdentifier = null;
                        if (Math.abs(sourcePos.x - destPos.x) + Math.abs(sourcePos.y - destPos.y) > 2 * this.routingInput.straightArrowSectionAfterRectangle) {
                            this.routeArrow(a, false);
                            let weight = 0;
                            for (let p of a.points) {
                                let w = this.weights[p.x][p.y];
                                weight += (w < 0 ? 1000 : w);
                                let l = this.locks[p.x][p.y];
                                if (l > 11 && l < 1000) { // Intersection of arrows
                                    weight += 500;
                                }
                            }
                            routeVariants.push({
                                dest: destPos,
                                source: sourcePos,
                                destDeltaFromMid: destDeltaFromMid,
                                sourceDeltaFromMid: sourceDeltaFromMid,
                                destDirection: a.destDirection,
                                sourceDirection: a.sourceDirection,
                                weightSum: weight,
                                endsOnArrowWithIdentifier: a.endsOnArrowWithIdentifier,
                                points: a.points,
                                minimalPoints: a.minimalPoints,
                                sourceSlot: sourceSlot,
                                destSlot: destSlot
                            });
                        }
                    }
                }
            }
        }
        let minWeight = 1000000;
        let bestVariant = null;
        for (let v of routeVariants) {
            if (v.weightSum > 3 && v.weightSum < minWeight) {
                bestVariant = v;
                minWeight = v.weightSum;
            }
        }
        if (bestVariant != null) {
            a.source = bestVariant.source;
            a.dest = bestVariant.dest;
            a.sourceDirection = bestVariant.sourceDirection;
            a.destDirection = bestVariant.destDirection;
            a.endsOnArrowWithIdentifier = bestVariant.endsOnArrowWithIdentifier;
            a.minimalPoints = bestVariant.minimalPoints;
            a.points = bestVariant.points;
            if (bestVariant.sourceDeltaFromMid < 0) {
                bestVariant.sourceSlot.usedFrom = bestVariant.sourceDeltaFromMid;
                if (bestVariant.sourceSlot.usedTo == null)
                    bestVariant.sourceSlot.usedTo = 0;
            }
            else {
                bestVariant.sourceSlot.usedTo = bestVariant.sourceDeltaFromMid;
                if (bestVariant.sourceSlot.usedFrom == null)
                    bestVariant.sourceSlot.usedFrom = 0;
            }
            if (bestVariant.destDeltaFromMid < 0) {
                bestVariant.destSlot.usedFrom = bestVariant.destDeltaFromMid;
                if (bestVariant.destSlot.usedTo == null)
                    bestVariant.destSlot.usedTo = 0;
            }
            else {
                bestVariant.destSlot.usedTo = bestVariant.destDeltaFromMid;
                if (bestVariant.destSlot.usedFrom == null)
                    bestVariant.destSlot.usedFrom = 0;
            }
            this.addArrowToArrowPointsField(a);
        }
    }
    routeArrow(a, debug = false) {
        if (debug == true)
            debugger;
        this.initWeights();
        this.prepareRectangles();
        this.prepareArrowLocks(a);
        this.calculateWeights(a.dest.x, a.dest.y, a.destDirection.x, a.destDirection.y);
        // this.render(ctx);
        let dx = a.sourceDirection.x;
        let dy = a.sourceDirection.y;
        a.points = [];
        this.addPoint(a.source.x, a.source.y, a);
        let x = a.source.x + a.sourceDirection.x * 2;
        let y = a.source.y + a.sourceDirection.y * 2;
        if (x < 0 || x >= this.routingInput.xMax || y < 0 || y >= this.routingInput.yMax) {
            return;
        }
        let lockWeight = 6;
        this.locks[x][y] = lockWeight;
        let fertig = false;
        let endsInArrow = null;
        this.addPoint(a.source.x + a.sourceDirection.x, a.source.y + a.sourceDirection.y, a);
        endsInArrow = this.addPoint(x, y, a);
        let routeStrategies = [];
        for (let straight = 5; straight >= 0; straight--) {
            for (let normal = 0; normal <= 5; normal++) {
                if (straight != 0 || normal != 0) {
                    routeStrategies.push({ straight: straight, normal: normal, bonus: -Math.abs(straight) - Math.abs(normal) + 1 });
                    if (normal != 0)
                        routeStrategies.push({ straight: straight, normal: -normal, bonus: -Math.abs(straight) - Math.abs(normal) + 1 });
                }
            }
        }
        let lastLength = 0;
        while (!fertig) {
            let newDirectionX = 0;
            let newDirectionY = 0;
            if (Math.abs(a.dest.x - x) + Math.abs(a.dest.y - y) < 4) {
                newDirectionX = a.dest.x - x;
                newDirectionY = a.dest.y - y;
                fertig = true;
            }
            else {
                let minimumWeight = 1000000;
                let w = this.weights[x][y];
                let from = { x: x, y: y };
                if (debug == true)
                    console.log("Position: " + x + "/" + y + ", weight: " + this.weights[x][y] + "+" + this.locks[x][y] + " = " + w);
                for (let rs of routeStrategies) {
                    let ndx = rs.straight * dx + rs.normal * dy;
                    let ndy = rs.straight * dy - rs.normal * dx;
                    let xNew = x + ndx;
                    let yNew = y + ndy;
                    if (xNew < 0 || yNew < 0 || xNew > this.routingInput.xMax - 1 || yNew > this.routingInput.yMax - 1) {
                        continue;
                    }
                    let weight = this.getWeight(from, { x: xNew, y: yNew });
                    let newWeight = weight.destWeight + Math.sqrt(weight.wayWeight); //this.weights[xNew][yNew] + this.locks[xNew][yNew];
                    let s = "Trying " + xNew + "/" + yNew + ": w = " + this.weights[xNew][yNew] + "+" +
                        this.locks[xNew][yNew] + " = " + newWeight + ", Bonus = " + rs.bonus;
                    if (newWeight > w) {
                        newWeight += 3;
                        s += " Verschlechterung => Strafe -3! ";
                    }
                    newWeight -= rs.bonus;
                    // deltaW /= rs.length;
                    if (newWeight < minimumWeight) {
                        minimumWeight = newWeight;
                        newDirectionX = ndx;
                        newDirectionY = ndy;
                        s += " -> new Minimum!";
                    }
                    if (debug == true)
                        console.log(s);
                }
                if (x == a.dest.x && y == a.dest.y || newDirectionX == 0 && newDirectionY == 0) {
                    fertig = true;
                }
            }
            if (x + newDirectionX < 0 || x + newDirectionX > this.routingInput.xMax - 1
                || y + newDirectionY < 0 || y + newDirectionY > this.routingInput.yMax - 1) {
                fertig = true;
                break;
            }
            let weightSumFirstXThenY = 0;
            let weightSumFirstYThenX = 0;
            // first x then y
            let xn = x;
            let yn = y;
            for (let i = 1; i <= Math.abs(newDirectionX); i++) {
                xn += Math.sign(newDirectionX);
                weightSumFirstXThenY += this.weights[xn][yn] + this.locks[xn][yn];
            }
            for (let i = 1; i <= Math.abs(newDirectionY); i++) {
                yn += Math.sign(newDirectionY);
                weightSumFirstXThenY += this.weights[xn][yn] + this.locks[xn][yn];
            }
            // first y then x
            xn = x;
            yn = y;
            for (let i = 1; i <= Math.abs(newDirectionY); i++) {
                yn += Math.sign(newDirectionY);
                weightSumFirstYThenX += this.weights[xn][yn] + this.locks[xn][yn];
            }
            for (let i = 1; i <= Math.abs(newDirectionX); i++) {
                xn += Math.sign(newDirectionX);
                weightSumFirstYThenX += this.weights[xn][yn] + this.locks[xn][yn];
            }
            if (weightSumFirstXThenY <= weightSumFirstYThenX) {
                if (newDirectionX != 0) {
                    for (let i = 1; i <= Math.abs(newDirectionX); i++) {
                        if (endsInArrow != null)
                            break;
                        x += Math.sign(newDirectionX);
                        this.locks[x][y] += lockWeight;
                        endsInArrow = this.addPoint(x, y, a);
                    }
                    dx = Math.sign(newDirectionX);
                    dy = 0;
                }
                if (newDirectionX * newDirectionY != 0) {
                    this.locks[x][y] += 1;
                }
                if (newDirectionY != 0 && endsInArrow == null) {
                    for (let i = 1; i <= Math.abs(newDirectionY); i++) {
                        if (endsInArrow != null)
                            break;
                        y += Math.sign(newDirectionY);
                        this.locks[x][y] += lockWeight;
                        endsInArrow = this.addPoint(x, y, a);
                    }
                    dx = 0;
                    dy = Math.sign(newDirectionY);
                }
            }
            else {
                for (let i = 1; i <= Math.abs(newDirectionY); i++) {
                    if (endsInArrow != null)
                        break;
                    y += Math.sign(newDirectionY);
                    this.locks[x][y] += lockWeight;
                    endsInArrow = this.addPoint(x, y, a);
                }
                this.locks[x][y] += 1;
                for (let i = 1; i <= Math.abs(newDirectionX); i++) {
                    if (endsInArrow != null)
                        break;
                    x += Math.sign(newDirectionX);
                    this.locks[x][y] += lockWeight;
                    endsInArrow = this.addPoint(x, y, a);
                }
                dy = 0;
                dx = Math.sign(newDirectionX);
            }
            if (a.points.length > 1000 || a.points.length == lastLength)
                fertig = true;
            lastLength = a.points.length;
            if (endsInArrow != null) {
                fertig = true;
            }
        }
        if (endsInArrow == null) {
            this.addPoint(x, y, a);
        }
        a.minimalPoints = [];
        if (a.points.length > 0) {
            let lastEdge = a.points[0];
            a.minimalPoints.push(lastEdge);
            let lastPoint = a.points[0];
            let i = 0;
            for (let p of a.points) {
                if (p.x != lastEdge.x && p.y != lastEdge.y || i == a.points.length - 1) {
                    a.minimalPoints.push(lastPoint);
                    lastEdge = lastPoint;
                }
                lastPoint = p;
                i++;
            }
            a.minimalPoints.push(lastPoint);
        }
        if (endsInArrow != null) {
            a.endsOnArrowWithIdentifier = endsInArrow.identifier;
        }
    }
    getWeight(from, to) {
        let dx = to.x - from.x;
        let dy = to.y - from.y;
        let length = Math.abs(dx) + Math.abs(dy);
        let weightFirstHorizontal = 0;
        let weightFirstVertical = 0;
        let x = from.x;
        let y = from.y;
        for (let delta = 1; delta <= Math.abs(dx); delta++) {
            x += Math.sign(dx);
            let w = this.weights[x][y];
            let l = this.locks[x][y];
            weightFirstHorizontal += l;
        }
        for (let delta = 1; delta <= Math.abs(dy); delta++) {
            y += Math.sign(dy);
            let w = this.weights[x][y];
            let l = this.locks[x][y];
            weightFirstHorizontal += l;
        }
        x = from.x;
        y = from.y;
        for (let delta = 1; delta <= Math.abs(dy); delta++) {
            y += Math.sign(dy);
            let w = this.weights[x][y];
            let l = this.locks[x][y];
            weightFirstVertical += l;
        }
        for (let delta = 1; delta <= Math.abs(dx); delta++) {
            x += Math.sign(dx);
            let w = this.weights[x][y];
            let l = this.locks[x][y];
            weightFirstVertical += l;
        }
        let firstHorizontal = weightFirstHorizontal < weightFirstVertical;
        return {
            wayWeight: firstHorizontal ? weightFirstHorizontal : weightFirstVertical,
            firstHorizontal: firstHorizontal,
            destWeight: this.weights[to.x][to.y] + this.locks[to.x][to.y]
        };
    }
    dist(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
    }
}
Router.RectangleWeight = 1000;
export {};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NsaWVudC9tYWluL2d1aS9kaWFncmFtcy9jbGFzc2RpYWdyYW0vUm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsR0FBRyxVQUFVLENBQUM7SUFFbkIsSUFBSSxFQUFFLEdBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFFOUIsSUFBRyxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUk7UUFBRSxPQUFPLENBQUMsaUVBQWlFO0lBRTdGLElBQUksTUFBTSxHQUFXLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUUxQixJQUFJLE1BQU0sR0FBRyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7SUFFckMsWUFBWTtJQUNaLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUVwQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7QUFFakIsQ0FBQyxDQUFBO0FBK0ZELE1BQU0sTUFBTTtJQVlSLFlBQW1CLFlBQTBCO1FBQTFCLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBSjdDLGVBQVUsR0FBdUIsRUFBRSxDQUFDO1FBS2hDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENB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QUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3lCQUNqRTt3QkFFRCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDdEMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTs0QkFFekMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ3RELElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUN0RCxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFFdEQscUNBQXFDOzRCQUVyQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNmLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBRWYsaUNBQWlDOzRCQUVqQyxJQUFJLElBQUksR0FBWSxJQUFJLENBQUM7NEJBQ3pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dDQUN2QyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQzNCLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDM0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQ0FDbEQsSUFBSSxHQUFHLEtBQUssQ0FBQztvQ0FDYixNQUFNO2lDQUNUOzZCQUNKOzRCQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dDQUN0QyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQzNCLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDM0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQ0FDbEQsSUFBSSxHQUFHLEtBQUssQ0FBQztvQ0FDYixNQUFNO2lDQUNUOzZCQUNKOzRCQUVELElBQUksSUFBSSxFQUFFO2dDQUNOLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUNYLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUNYLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29DQUN2QyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0NBQzNCLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQ0FDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7aUNBQzFCO2dDQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29DQUN0QyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0NBQzNCLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQ0FDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7aUNBQzFCO2dDQUVELENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUNYLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUNYLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29DQUN2QyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0NBQzNCLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQ0FDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7aUNBQzFCO2dDQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29DQUN0QyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0NBQzNCLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQ0FDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7aUNBQzFCO2dDQUVELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO2dDQUM1QixLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhO29DQUFFLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7Z0NBRWxFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FFN0IsSUFBSSxXQUFXLEdBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FFaEUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQ25ELFVBQVUsR0FBRyxJQUFJLENBQUM7Z0NBRWxCLENBQUMsRUFBRSxDQUFDO2dDQUVKLElBQUksR0FBRyxLQUFLLENBQUM7NkJBQ2hCO3lCQUVKO3FCQUVKO2lCQUVKO2dCQUVELElBQUksVUFBVSxFQUFFO29CQUVaLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7d0JBRWpELElBQ0ksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ3BELENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNwRCxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDcEQsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDdEQ7NEJBRUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFDakMsQ0FBQyxFQUFFLENBQUM7eUJBRVA7cUJBRUo7b0JBRUQsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO29CQUNiLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWE7d0JBQUUsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztpQkFFckU7YUFFSjtTQUNKO0lBQ0wsQ0FBQztJQUVELGFBQWEsQ0FBQyxFQUFTLEVBQUUsRUFBUztRQUM5QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxRQUFzQjtRQUVwQyxLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFFdkIsSUFBSSxDQUFDLElBQUksUUFBUTtnQkFBRSxPQUFPO1lBQzFCLElBQUksU0FBUyxHQUFZLENBQUMsQ0FBQyxTQUFTLElBQUksUUFBUSxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMscUJBQXFCLElBQUksUUFBUSxDQUFDLHFCQUFxQixDQUFDO1lBRXhILElBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJO2dCQUFFLE9BQU87WUFFNUIsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFO2dCQUNwQixJQUFJLFNBQVMsRUFBRTtvQkFDWCxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUM5QjtxQkFBTTtvQkFDSCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ1YsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDN0I7YUFDSjtTQUdKO0lBRUwsQ0FBQztJQUdELGdCQUFnQixDQUFDLE1BQWMsRUFBRSxNQUFjLEVBQUUsT0FBZSxFQUFFLE9BQWU7UUFFN0UsSUFBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxJQUFJLEVBQUM7WUFDdEMsT0FBTztTQUNWO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVqQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGtDQUFrQyxDQUFDO1FBQzdELElBQUksQ0FBQyxJQUFJLElBQUk7WUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXJCLElBQUksT0FBTyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLElBQUksT0FBTyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXBDLElBQUksQ0FBQyxHQUFXLENBQUMsQ0FBQztRQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2QsSUFBSSxDQUFDLEdBQUcsTUFBTSxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDN0IsSUFBSSxDQUFDLEdBQUcsTUFBTSxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDN0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUk7Z0JBQ25DLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSTtnQkFDbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3RCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3hCO1lBQ0QsQ0FBQyxFQUFFLENBQUM7U0FDUDtRQUVELENBQUMsR0FBRyxDQUFDLENBQUM7UUFDTixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDWCxJQUFJLENBQUMsR0FBRyxNQUFNLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsR0FBRyxNQUFNLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSTtnQkFDbkMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUM7YUFDL0M7WUFDRCxDQUFDLEVBQUUsQ0FBQztTQUNQO1FBRUQsSUFBSSxLQUFLLEdBQVksRUFBRSxDQUFDO1FBRXhCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM3QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzdDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3pCLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUM5QjthQUVKO1NBQ0o7UUFFRCw0REFBNEQ7UUFHNUQsT0FBTyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUVyQixJQUFJLE1BQU0sR0FBWSxLQUFLLENBQUM7WUFDNUIsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUVYLEtBQUssSUFBSSxDQUFDLElBQUksTUFBTSxFQUFFO2dCQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNaLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1osSUFBSSxDQUFDLEdBQVcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUNQLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNoQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUIsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxFQUFFLEVBQWUsU0FBUzt3QkFDN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDL0IsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNsQztpQkFDSjtnQkFDRCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUU7b0JBQ2hDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNoQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUIsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxFQUFFLEVBQWUsU0FBUzt3QkFDN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDL0IsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNsQztpQkFDSjtnQkFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ2hDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM5QixJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxJQUFJLEVBQUUsRUFBZSxTQUFTO3dCQUM3RCxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ2xDO2lCQUNKO2dCQUNELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRTtvQkFDaEMsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ2hDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM5QixJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxJQUFJLEVBQUUsRUFBZSxTQUFTO3dCQUM3RCxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENB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Q0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwRSxDQUFDOztBQTN6Qk0sc0JBQWUsR0FBRyxJQUFJLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJvbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZSkge1xyXG5cclxuICAgIGxldCByaTogUm91dGluZ0lucHV0ID0gZS5kYXRhO1xyXG4gICAgXHJcbiAgICBpZihyaS54TWF4ID09IG51bGwpIHJldHVybjsgLy8gQnVnRml4IDA2LjA2LjIwMjA6IE1vbmFjbyBFZGl0b3Igc2VuZHMgbWVzc2FnZXMgdG8gZXZlcnlvbmUuLi5cclxuXHJcbiAgICBsZXQgcm91dGVyOiBSb3V0ZXIgPSBuZXcgUm91dGVyKHJpKTtcclxuICAgIHJvdXRlci5hcnJvd3MgPSByaS5hcnJvd3M7XHJcblxyXG4gICAgbGV0IHJlc3VsdCA9IHJvdXRlci5yb3V0ZUFsbEFycm93cygpO1xyXG5cclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgcG9zdE1lc3NhZ2UocmVzdWx0KTtcclxuXHJcbiAgICBzZWxmLmNsb3NlKCk7XHJcblxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBSb3V0aW5nSW5wdXQgPSB7XHJcbiAgICB4TWF4OiBudW1iZXIsXHJcbiAgICB5TWF4OiBudW1iZXIsXHJcbiAgICBzdHJhaWdodEFycm93U2VjdGlvbkFmdGVyUmVjdGFuZ2xlPzogbnVtYmVyLFxyXG4gICAgZGlzdGFuY2VGcm9tUmVjdGFuZ2xlczogbnVtYmVyLFxyXG4gICAgc2xvdERpc3RhbmNlOiBudW1iZXIsXHJcbiAgICByZWN0YW5nbGVzOiBSZWN0YW5nbGVbXTtcclxuICAgIGFycm93czogUm91dGluZ0Fycm93W107XHJcbiAgICB2ZXJzaW9uPzogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBSb3V0aW5nT3V0cHV0ID0ge1xyXG4gICAgeE1heDogbnVtYmVyLFxyXG4gICAgeU1heDogbnVtYmVyLFxyXG4gICAgYXJyb3dzOiBSb3V0aW5nQXJyb3dbXSxcclxuICAgIHJlY3RhbmdsZXM6IFJlY3RhbmdsZVtdLFxyXG4gICAgd2VpZ2h0czogbnVtYmVyW11bXSxcclxuICAgIGxvY2tzOiBudW1iZXJbXVtdLFxyXG4gICAgdmVyc2lvbjogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIFJlY3RhbmdsZSA9IHsgdG9wOiBudW1iZXIsIGxlZnQ6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIgfTtcclxuXHJcbnR5cGUgU2xvdCA9IHtcclxuICAgIGFycm93RGlyZWN0aW9uT3V0d2FyZDogUG9pbnQsXHJcbiAgICBkZWx0YUZyb21TbG90VG9TbG90OiBQb2ludCxcclxuICAgIHVzZWRGcm9tPzogbnVtYmVyLFxyXG4gICAgdXNlZFRvPzogbnVtYmVyLFxyXG4gICAgbGFzdERlbHRhOiBudW1iZXIsXHJcbiAgICBtaWQ6IFBvaW50LFxyXG4gICAgbWluOiBudW1iZXIsXHJcbiAgICBtYXg6IG51bWJlclxyXG59XHJcblxyXG50eXBlIFJvdXRpbmdSZWN0YW5nbGUgPSBSZWN0YW5nbGUgJiB7XHJcbiAgICBzbG90czogU2xvdFtdO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgUm91dGluZ0Fycm93ID0ge1xyXG4gICAgaWRlbnRpZmllcjogc3RyaW5nLFxyXG5cclxuICAgIC8vIGlucHV0XHJcbiAgICBzb3VyY2U/OiBQb2ludCxcclxuICAgIHNvdXJjZURpcmVjdGlvbj86IFBvaW50LFxyXG4gICAgc291cmNlUmVjdGFuZ2xlSW5kZXg6IG51bWJlcjtcclxuXHJcbiAgICBkZXN0PzogUG9pbnQsXHJcbiAgICBkZXN0RGlyZWN0aW9uPzogUG9pbnQsXHJcbiAgICBkZXN0UmVjdGFuZ2xlSW5kZXg6IG51bWJlcjtcclxuXHJcbiAgICBhcnJvd1R5cGU6IHN0cmluZyxcclxuICAgIGRlc3RpbmF0aW9uSWRlbnRpZmllcjogc3RyaW5nLFxyXG4gICAgZGVidWc/OiBib29sZWFuLFxyXG5cclxuICAgIC8vIG91dHB1dFxyXG4gICAgcG9pbnRzPzogUG9pbnRbXSxcclxuICAgIG1pbmltYWxQb2ludHM/OiBQb2ludFtdLFxyXG4gICAgZW5kc09uQXJyb3dXaXRoSWRlbnRpZmllcj86IHN0cmluZyxcclxuICAgIGNvbG9yPzogc3RyaW5nXHJcbn1cclxuXHJcbnR5cGUgcm91dGVWYXJpYW50ID0ge1xyXG4gICAgc291cmNlOiBQb2ludCxcclxuICAgIHNvdXJjZURpcmVjdGlvbjogUG9pbnQsXHJcblxyXG4gICAgc291cmNlRGVsdGFGcm9tTWlkOiBudW1iZXIsXHJcblxyXG5cclxuICAgIGRlc3Q6IFBvaW50LFxyXG4gICAgZGVzdERpcmVjdGlvbjogUG9pbnQsXHJcblxyXG4gICAgZGVzdERlbHRhRnJvbU1pZDogbnVtYmVyLFxyXG5cclxuICAgIC8vIG91dHB1dFxyXG4gICAgcG9pbnRzPzogUG9pbnRbXSxcclxuICAgIG1pbmltYWxQb2ludHM/OiBQb2ludFtdLFxyXG4gICAgZW5kc09uQXJyb3dXaXRoSWRlbnRpZmllcj86IHN0cmluZyxcclxuXHJcbiAgICB3ZWlnaHRTdW06IG51bWJlcixcclxuXHJcbiAgICBzb3VyY2VTbG90OiBTbG90LFxyXG4gICAgZGVzdFNsb3Q6IFNsb3RcclxufVxyXG5cclxuXHJcbmV4cG9ydCB0eXBlIFBvaW50ID0geyB4OiBudW1iZXIsIHk6IG51bWJlciB9O1xyXG5cclxudHlwZSBSb3V0ZVN0cmF0ZWd5ID0ge1xyXG4gICAgc3RyYWlnaHQ6IG51bWJlcixcclxuICAgIG5vcm1hbDogbnVtYmVyLFxyXG4gICAgYm9udXM6IG51bWJlclxyXG59O1xyXG5cclxuY2xhc3MgUm91dGVyIHtcclxuXHJcbiAgICB3ZWlnaHRzOiBudW1iZXJbXVtdO1xyXG4gICAgbG9ja3M6IG51bWJlcltdW107XHJcbiAgICBhcnJvd1BvaW50RmllbGQ6IFJvdXRpbmdBcnJvd1tdW11bXTtcclxuXHJcbiAgICBzdGF0aWMgUmVjdGFuZ2xlV2VpZ2h0ID0gMTAwMDtcclxuXHJcbiAgICByZWN0YW5nbGVzOiBSb3V0aW5nUmVjdGFuZ2xlW10gPSBbXTtcclxuICAgIGFycm93czogUm91dGluZ0Fycm93W107XHJcblxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByb3V0aW5nSW5wdXQ6IFJvdXRpbmdJbnB1dCkge1xyXG4gICAgICAgIHRoaXMuaW5pdFJvdXRpbmdSZWN0YW5nbGVzKHJvdXRpbmdJbnB1dC5yZWN0YW5nbGVzKTtcclxuICAgICAgICB0aGlzLmFycm93cyA9IHJvdXRpbmdJbnB1dC5hcnJvd3M7XHJcbiAgICAgICAgdGhpcy5hcnJvd1BvaW50RmllbGQgPSBuZXcgQXJyYXkodGhpcy5yb3V0aW5nSW5wdXQueE1heCkuZmlsbCgwKS5tYXAoKCkgPT4gbmV3IEFycmF5KHRoaXMucm91dGluZ0lucHV0LnlNYXgpLmZpbGwobnVsbCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGluaXRSb3V0aW5nUmVjdGFuZ2xlcyhyZWN0YW5nbGVzOiBSZWN0YW5nbGVbXSkge1xyXG4gICAgICAgIGlmKHJlY3RhbmdsZXMgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgIGZvciAobGV0IHIgb2YgcmVjdGFuZ2xlcykge1xyXG4gICAgICAgICAgICB0aGlzLnJlY3RhbmdsZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBsZWZ0OiByLmxlZnQsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogci53aWR0aCxcclxuICAgICAgICAgICAgICAgIHRvcDogci50b3AsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IHIuaGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgc2xvdHM6IFtcclxuICAgICAgICAgICAgICAgICAgICB7ICAgLy8gdG9wXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFycm93RGlyZWN0aW9uT3V0d2FyZDogeyB4OiAwLCB5OiAtMSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWx0YUZyb21TbG90VG9TbG90OiB7IHg6IDEsIHk6IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWluOiAxIC0gTWF0aC5yb3VuZChyLndpZHRoIC8gMiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heDogci53aWR0aCAtIE1hdGgucm91bmQoci53aWR0aCAvIDIpIC0gMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWlkOiB7IHg6IHIubGVmdCArIE1hdGgucm91bmQoci53aWR0aCAvIDIpLCB5OiByLnRvcCB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0RGVsdGE6IC0xXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7ICAgLy8gcmlnaHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyb3dEaXJlY3Rpb25PdXR3YXJkOiB7IHg6IDEsIHk6IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsdGFGcm9tU2xvdFRvU2xvdDogeyB4OiAwLCB5OiAxIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbjogMSAtIE1hdGgucm91bmQoci5oZWlnaHQgLyAyKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4OiByLmhlaWdodCAtIE1hdGgucm91bmQoci5oZWlnaHQgLyAyKSAtIDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pZDogeyB4OiByLmxlZnQgKyByLndpZHRoLCB5OiByLnRvcCArIE1hdGgucm91bmQoci5oZWlnaHQgLyAyKSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0RGVsdGE6IC0xXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7ICAgLy8gYm90dG9tXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFycm93RGlyZWN0aW9uT3V0d2FyZDogeyB4OiAwLCB5OiAxIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbHRhRnJvbVNsb3RUb1Nsb3Q6IHsgeDogMSwgeTogMCB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW46IDEgLSBNYXRoLnJvdW5kKHIud2lkdGggLyAyKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4OiByLndpZHRoIC0gTWF0aC5yb3VuZChyLndpZHRoIC8gMikgLSAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtaWQ6IHsgeDogci5sZWZ0ICsgTWF0aC5yb3VuZChyLndpZHRoIC8gMiksIHk6IHIudG9wICsgci5oZWlnaHQgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdERlbHRhOiAtMVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeyAgIC8vIGxlZnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyb3dEaXJlY3Rpb25PdXR3YXJkOiB7IHg6IC0xLCB5OiAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbHRhRnJvbVNsb3RUb1Nsb3Q6IHsgeDogMCwgeTogMSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW46IDEgLSBNYXRoLnJvdW5kKHIuaGVpZ2h0IC8gMiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heDogci5oZWlnaHQgLSBNYXRoLnJvdW5kKHIuaGVpZ2h0IC8gMikgLSAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtaWQ6IHsgeDogci5sZWZ0LCB5OiByLnRvcCArIE1hdGgucm91bmQoci5oZWlnaHQgLyAyKSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0RGVsdGE6IC0xXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpbml0V2VpZ2h0cygpIHtcclxuXHJcbiAgICAgICAgdGhpcy53ZWlnaHRzID0gbmV3IEFycmF5KHRoaXMucm91dGluZ0lucHV0LnhNYXgpLmZpbGwoMCkubWFwKCgpID0+IG5ldyBBcnJheSh0aGlzLnJvdXRpbmdJbnB1dC55TWF4KS5maWxsKC0xKSk7XHJcbiAgICAgICAgdGhpcy5sb2NrcyA9IG5ldyBBcnJheSh0aGlzLnJvdXRpbmdJbnB1dC54TWF4KS5maWxsKDApLm1hcCgoKSA9PiBuZXcgQXJyYXkodGhpcy5yb3V0aW5nSW5wdXQueU1heCkuZmlsbCgwKSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByZXBhcmVSZWN0YW5nbGVzKCkge1xyXG5cclxuICAgICAgICBsZXQgZGlzdGFuY2VGcm9tUmVjdGFuZ2xlcyA9IHRoaXMucm91dGluZ0lucHV0LmRpc3RhbmNlRnJvbVJlY3RhbmdsZXM7XHJcbiAgICAgICAgaWYgKGRpc3RhbmNlRnJvbVJlY3RhbmdsZXMgPT0gbnVsbCkgZGlzdGFuY2VGcm9tUmVjdGFuZ2xlcyA9IDE7XHJcblxyXG4gICAgICAgIGZvciAobGV0IHIgb2YgdGhpcy5yZWN0YW5nbGVzKSB7XHJcbiAgICAgICAgICAgIGxldCBsZWZ0ID0gci5sZWZ0IC0gZGlzdGFuY2VGcm9tUmVjdGFuZ2xlcztcclxuICAgICAgICAgICAgaWYgKGxlZnQgPCAwKSBsZWZ0ID0gMDtcclxuICAgICAgICAgICAgbGV0IHJpZ2h0ID0gci5sZWZ0ICsgci53aWR0aCArIGRpc3RhbmNlRnJvbVJlY3RhbmdsZXM7XHJcbiAgICAgICAgICAgIGlmIChyaWdodCA+IHRoaXMucm91dGluZ0lucHV0LnhNYXggLSAxKSByaWdodCA9IHRoaXMucm91dGluZ0lucHV0LnhNYXggLSAxO1xyXG4gICAgICAgICAgICBsZXQgdG9wID0gci50b3AgLSBkaXN0YW5jZUZyb21SZWN0YW5nbGVzO1xyXG4gICAgICAgICAgICBpZiAodG9wIDwgMCkgdG9wID0gMDtcclxuICAgICAgICAgICAgbGV0IGJvdHRvbSA9IHIudG9wICsgci5oZWlnaHQgKyBkaXN0YW5jZUZyb21SZWN0YW5nbGVzO1xyXG4gICAgICAgICAgICBpZiAoYm90dG9tID4gdGhpcy5yb3V0aW5nSW5wdXQueU1heCAtIDEpIGJvdHRvbSA9IHRoaXMucm91dGluZ0lucHV0LnlNYXggLSAxO1xyXG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gdG9wOyB5IDw9IGJvdHRvbTsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB4ID0gbGVmdDsgeCA8PSByaWdodDsgeCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2Nrc1t4XVt5XSA9IFJvdXRlci5SZWN0YW5nbGVXZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNtb290aEFycm93cygpIHtcclxuXHJcbiAgICAgICAgdGhpcy53ZWlnaHRzID0gbmV3IEFycmF5KHRoaXMucm91dGluZ0lucHV0LnhNYXgpLmZpbGwoMCkubWFwKCgpID0+IG5ldyBBcnJheSh0aGlzLnJvdXRpbmdJbnB1dC55TWF4KS5maWxsKDApKTtcclxuICAgICAgICBmb3IgKGxldCBhIG9mIHRoaXMuYXJyb3dzKSB7XHJcbiAgICAgICAgICAgIGlmIChhLnBvaW50cyA9PSBudWxsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgZm9yIChsZXQgcCBvZiBhLnBvaW50cykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53ZWlnaHRzW3AueF1bcC55XSsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxvY2tzID0gbmV3IEFycmF5KHRoaXMucm91dGluZ0lucHV0LnhNYXgpLmZpbGwoMCkubWFwKCgpID0+IG5ldyBBcnJheSh0aGlzLnJvdXRpbmdJbnB1dC55TWF4KS5maWxsKDApKTtcclxuICAgICAgICB0aGlzLnByZXBhcmVSZWN0YW5nbGVzKCk7XHJcblxyXG4gICAgICAgIGxldCBkb25lID0gZmFsc2U7XHJcbiAgICAgICAgd2hpbGUgKCFkb25lKSB7XHJcbiAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgbGV0IHA6IFBvaW50W10gPSBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF07XHJcbiAgICAgICAgICAgIGxldCBkZWx0YTogUG9pbnRbXSA9IFtudWxsLCBudWxsLCBudWxsXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGEgb2YgdGhpcy5hcnJvd3MpIHtcclxuICAgICAgICAgICAgICAgIGlmIChhLnBvaW50cyA9PSBudWxsIHx8IGEubWluaW1hbFBvaW50cyA9PSBudWxsKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYXJyb3dEaXJ0eSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBkZWJ1ZzogYm9vbGVhbiA9IGEuaWRlbnRpZmllciA9PSBcImEzXCI7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGVidWcpIGRlYnVnZ2VyO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhLm1pbmltYWxQb2ludHMubGVuZ3RoID4gNCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEubWluaW1hbFBvaW50cy5sZW5ndGggLSA0OyBpKyspIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDw9IDM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcFtqXSA9IGEubWluaW1hbFBvaW50c1tpICsgal07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDw9IDI7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsdGFbal0gPSB7IHg6IHBbaiArIDFdLnggLSBwW2pdLngsIHk6IHBbaiArIDFdLnkgLSBwW2pdLnkgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2FtZURpcmVjdGlvbihkZWx0YVswXSwgZGVsdGFbMl0pICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAhdGhpcy5zYW1lRGlyZWN0aW9uKGRlbHRhWzBdLCBkZWx0YVsxXSkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZDAxID0gTWF0aC5hYnMoZGVsdGFbMF0ueCkgKyBNYXRoLmFicyhkZWx0YVswXS55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkMTIgPSBNYXRoLmFicyhkZWx0YVsxXS54KSArIE1hdGguYWJzKGRlbHRhWzFdLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGQyMyA9IE1hdGguYWJzKGRlbHRhWzJdLngpICsgTWF0aC5hYnMoZGVsdGFbMl0ueSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYoZDEyID4gMjAgfHwgZDIzID4gMjApIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB4ID0gcFswXS54O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHkgPSBwWzBdLnk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYoeCA9PSA4ICYmIHkgPT0gMikgZGVidWdnZXI7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZyZWU6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gTWF0aC5yb3VuZChkMTIpOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ICs9IE1hdGguc2lnbihkZWx0YVsxXS54KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5ICs9IE1hdGguc2lnbihkZWx0YVsxXS55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy53ZWlnaHRzW3hdW3ldICE9IDAgfHwgdGhpcy5sb2Nrc1t4XVt5XSAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyZWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgTWF0aC5yb3VuZChkMDEpOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ICs9IE1hdGguc2lnbihkZWx0YVswXS54KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5ICs9IE1hdGguc2lnbihkZWx0YVswXS55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy53ZWlnaHRzW3hdW3ldICE9IDAgfHwgdGhpcy5sb2Nrc1t4XVt5XSAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyZWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmcmVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9IHBbMF0ueDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5ID0gcFswXS55O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IE1hdGgucm91bmQoZDEyKTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggKz0gTWF0aC5zaWduKGRlbHRhWzFdLngpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5ICs9IE1hdGguc2lnbihkZWx0YVsxXS55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWlnaHRzW3hdW3ldID0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBNYXRoLnJvdW5kKGQwMSk7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ICs9IE1hdGguc2lnbihkZWx0YVswXS54KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeSArPSBNYXRoLnNpZ24oZGVsdGFbMF0ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud2VpZ2h0c1t4XVt5XSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0gcFswXS54O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHkgPSBwWzBdLnk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gTWF0aC5yb3VuZChkMDEpOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCArPSBNYXRoLnNpZ24oZGVsdGFbMF0ueCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHkgKz0gTWF0aC5zaWduKGRlbHRhWzBdLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndlaWdodHNbeF1beV0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IE1hdGgucm91bmQoZDEyKTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggKz0gTWF0aC5zaWduKGRlbHRhWzFdLngpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5ICs9IE1hdGguc2lnbihkZWx0YVsxXS55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWlnaHRzW3hdW3ldID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzID0gYS5pZGVudGlmaWVyICsgXCI6IFwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHAgb2YgYS5taW5pbWFsUG9pbnRzKSBzICs9IFwiKFwiICsgcC54ICsgXCIsIFwiICsgcC55ICsgXCIpLFwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwWzFdLnggPSBwWzBdLnggKyBkZWx0YVsxXS54O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBbMV0ueSA9IHBbMF0ueSArIGRlbHRhWzFdLnk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkZWxldGUyQW5kMzogYm9vbGVhbiA9IHBbMV0ueCA9PSBwWzNdLnggJiYgcFsxXS55ID09IHBbM10ueTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYS5taW5pbWFsUG9pbnRzLnNwbGljZShpICsgMiwgZGVsZXRlMkFuZDMgPyAyIDogMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJyb3dEaXJ0eSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGktLTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhcnJvd0RpcnR5KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5taW5pbWFsUG9pbnRzLmxlbmd0aCAtIDI7IGkrKykge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYS5taW5pbWFsUG9pbnRzW2kgKyAwXS54ID09IGEubWluaW1hbFBvaW50c1tpICsgMV0ueCAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYS5taW5pbWFsUG9pbnRzW2kgKyAxXS54ID09IGEubWluaW1hbFBvaW50c1tpICsgMl0ueCB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYS5taW5pbWFsUG9pbnRzW2kgKyAwXS55ID09IGEubWluaW1hbFBvaW50c1tpICsgMV0ueSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYS5taW5pbWFsUG9pbnRzW2kgKyAxXS55ID09IGEubWluaW1hbFBvaW50c1tpICsgMl0ueVxyXG4gICAgICAgICAgICAgICAgICAgICAgICApIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhLm1pbmltYWxQb2ludHMuc3BsaWNlKGkgKyAxLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGktLTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgcyA9IFwiLT5cIjtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBwIG9mIGEubWluaW1hbFBvaW50cykgcyArPSBcIihcIiArIHAueCArIFwiLCBcIiArIHAueSArIFwiKSxcIjtcclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNhbWVEaXJlY3Rpb24ocDE6IFBvaW50LCBwMjogUG9pbnQpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5zaWduKHAxLngpID09IE1hdGguc2lnbihwMi54KSAmJiBNYXRoLnNpZ24ocDEueSkgPT0gTWF0aC5zaWduKHAyLnkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByZXBhcmVBcnJvd0xvY2tzKG5ld0Fycm93OiBSb3V0aW5nQXJyb3cpIHtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgYSBvZiB0aGlzLmFycm93cykge1xyXG5cclxuICAgICAgICAgICAgaWYgKGEgPT0gbmV3QXJyb3cpIHJldHVybjtcclxuICAgICAgICAgICAgbGV0IGpvaW5BcnJvdzogYm9vbGVhbiA9IGEuYXJyb3dUeXBlID09IG5ld0Fycm93LmFycm93VHlwZSAmJiBhLmRlc3RpbmF0aW9uSWRlbnRpZmllciA9PSBuZXdBcnJvdy5kZXN0aW5hdGlvbklkZW50aWZpZXI7XHJcblxyXG4gICAgICAgICAgICBpZihhLnBvaW50cyA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBmb3IgKGxldCBwIG9mIGEucG9pbnRzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoam9pbkFycm93KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2Nrc1twLnhdW3AueV0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMud2VpZ2h0c1twLnhdW3AueV0gPSAwO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdyA9IDY7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2Nrc1twLnhdW3AueV0gKz0gdztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgY2FsY3VsYXRlV2VpZ2h0cyh4U3RhcnQ6IG51bWJlciwgeVN0YXJ0OiBudW1iZXIsIGR4U3RhcnQ6IG51bWJlciwgZHlTdGFydDogbnVtYmVyKSB7XHJcblxyXG4gICAgICAgIGlmKHRoaXMud2VpZ2h0c1t4U3RhcnQgKyBkeFN0YXJ0XSA9PSBudWxsKXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy53ZWlnaHRzW3hTdGFydCArIGR4U3RhcnRdW3lTdGFydCArIGR5U3RhcnRdID0gMTtcclxuICAgICAgICB0aGlzLndlaWdodHNbeFN0YXJ0XVt5U3RhcnRdID0gMDtcclxuXHJcbiAgICAgICAgbGV0IGQgPSB0aGlzLnJvdXRpbmdJbnB1dC5zdHJhaWdodEFycm93U2VjdGlvbkFmdGVyUmVjdGFuZ2xlO1xyXG4gICAgICAgIGlmIChkID09IG51bGwpIGQgPSAzO1xyXG5cclxuICAgICAgICBsZXQgbm9ybWFsWCA9IDEgLSBNYXRoLmFicyhkeFN0YXJ0KTtcclxuICAgICAgICBsZXQgbm9ybWFsWSA9IDEgLSBNYXRoLmFicyhkeVN0YXJ0KTtcclxuXHJcbiAgICAgICAgbGV0IGk6IG51bWJlciA9IDA7XHJcbiAgICAgICAgd2hpbGUgKGkgPCBkICsgMykge1xyXG4gICAgICAgICAgICBsZXQgeCA9IHhTdGFydCArIGR4U3RhcnQgKiBpO1xyXG4gICAgICAgICAgICBsZXQgeSA9IHlTdGFydCArIGR5U3RhcnQgKiBpO1xyXG4gICAgICAgICAgICBpZiAoeCA+IDAgJiYgeCA8IHRoaXMucm91dGluZ0lucHV0LnhNYXggJiZcclxuICAgICAgICAgICAgICAgIHkgPiAwICYmIHkgPCB0aGlzLnJvdXRpbmdJbnB1dC55TWF4ICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvY2tzW3hdW3ldID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2Nrc1t4XVt5XSA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaSA9IDA7XHJcbiAgICAgICAgd2hpbGUgKGkgPD0gZCkge1xyXG4gICAgICAgICAgICBsZXQgeCA9IHhTdGFydCArIGR4U3RhcnQgKiBpO1xyXG4gICAgICAgICAgICBsZXQgeSA9IHlTdGFydCArIGR5U3RhcnQgKiBpO1xyXG4gICAgICAgICAgICBpZiAoeCA+IDAgJiYgeCA8IHRoaXMucm91dGluZ0lucHV0LnhNYXggJiZcclxuICAgICAgICAgICAgICAgIHkgPiAwICYmIHkgPCB0aGlzLnJvdXRpbmdJbnB1dC55TWF4KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvY2tzW3ggKyBub3JtYWxYXVt5ICsgbm9ybWFsWV0gPSAxMDAwO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2Nrc1t4IC0gbm9ybWFsWF1beSAtIG5vcm1hbFldID0gMTAwMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc3RhY2s6IFBvaW50W10gPSBbXTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLnJvdXRpbmdJbnB1dC55TWF4OyB5KyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnJvdXRpbmdJbnB1dC54TWF4OyB4KyspIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLndlaWdodHNbeF1beV0gPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeyB4OiB4LCB5OiB5IH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc3RhY2sucHVzaCh7IHg6IHhTdGFydCArIGR4U3RhcnQsIHk6IHlTdGFydCArIGR5U3RhcnQgfSk7XHJcblxyXG5cclxuICAgICAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHN0YWNrMTogUG9pbnRbXSA9IHN0YWNrO1xyXG4gICAgICAgICAgICBzdGFjayA9IFtdO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgcCBvZiBzdGFjazEpIHtcclxuICAgICAgICAgICAgICAgIGxldCB4ID0gcC54O1xyXG4gICAgICAgICAgICAgICAgbGV0IHkgPSBwLnk7XHJcbiAgICAgICAgICAgICAgICBsZXQgdzogbnVtYmVyID0gdGhpcy53ZWlnaHRzW3hdW3ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKHggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHcxID0gdGhpcy53ZWlnaHRzW3ggLSAxXVt5XTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbDEgPSB0aGlzLmxvY2tzW3ggLSAxXVt5XTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKHcxIDwgMCB8fCB3MSA+IHcgKyAxKSAmJiBsMSA8IDEwMDApIHsgICAgICAgICAgICAgIC8vIHcxIDwgMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndlaWdodHNbeCAtIDFdW3ldID0gdyArIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeyB4OiB4IC0gMSwgeTogeSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoeCA8IHRoaXMucm91dGluZ0lucHV0LnhNYXggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHcxID0gdGhpcy53ZWlnaHRzW3ggKyAxXVt5XTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbDEgPSB0aGlzLmxvY2tzW3ggKyAxXVt5XTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKHcxIDwgMCB8fCB3MSA+IHcgKyAxKSAmJiBsMSA8IDEwMDApIHsgICAgICAgICAgICAgIC8vIHcxIDwgMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndlaWdodHNbeCArIDFdW3ldID0gdyArIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goeyB4OiB4ICsgMSwgeTogeSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoeSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdzEgPSB0aGlzLndlaWdodHNbeF1beSAtIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBsMSA9IHRoaXMubG9ja3NbeF1beSAtIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgodzEgPCAwIHx8IHcxID4gdyArIDEpICYmIGwxIDwgMTAwMCkgeyAgICAgICAgICAgICAgLy8gdzEgPCAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud2VpZ2h0c1t4XVt5IC0gMV0gPSB3ICsgMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh7IHg6IHgsIHk6IHkgLSAxIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh5IDwgdGhpcy5yb3V0aW5nSW5wdXQueU1heCAtIDEpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdzEgPSB0aGlzLndlaWdodHNbeF1beSArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBsMSA9IHRoaXMubG9ja3NbeF1beSArIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgodzEgPCAwIHx8IHcxID4gdyArIDEpICYmIGwxIDwgMTAwMCkgeyAgICAgICAgICAgICAgLy8gdzEgPCAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud2VpZ2h0c1t4XVt5ICsgMV0gPSB3ICsgMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh7IHg6IHgsIHk6IHkgKyAxIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgYWRkUG9pbnQoeDogbnVtYmVyLCB5OiBudW1iZXIsIGFycm93OiBSb3V0aW5nQXJyb3cpOiBSb3V0aW5nQXJyb3cge1xyXG4gICAgICAgIGlmKHggPCB0aGlzLmFycm93UG9pbnRGaWVsZC5sZW5ndGggJiYgeSA8IHRoaXMuYXJyb3dQb2ludEZpZWxkW3hdLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIGFycm93LnBvaW50cy5wdXNoKHsgeDogeCwgeTogeSB9KTtcclxuICAgICAgICAgICAgbGV0IGFycm93czogUm91dGluZ0Fycm93W10gPSB0aGlzLmFycm93UG9pbnRGaWVsZFt4XVt5XTtcclxuICAgICAgICAgICAgaWYgKGFycm93cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhIG9mIGFycm93cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhLmFycm93VHlwZSA9PSBhcnJvdy5hcnJvd1R5cGUgJiYgYS5kZXN0aW5hdGlvbklkZW50aWZpZXIgPT0gYXJyb3cuZGVzdGluYXRpb25JZGVudGlmaWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhZGRBcnJvd1RvQXJyb3dQb2ludHNGaWVsZChhcnJvdzogUm91dGluZ0Fycm93KSB7XHJcbiAgICAgICAgaWYgKGFycm93LnBvaW50cyA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgZm9yIChsZXQgcCBvZiBhcnJvdy5wb2ludHMpIHtcclxuICAgICAgICAgICAgbGV0IGFycm93czogUm91dGluZ0Fycm93W10gPSB0aGlzLmFycm93UG9pbnRGaWVsZFtwLnhdW3AueV07XHJcbiAgICAgICAgICAgIGlmIChhcnJvd3MgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hcnJvd1BvaW50RmllbGRbcC54XVtwLnldID0gW2Fycm93XTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGFycm93cy5wdXNoKGFycm93KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBhZGRQb2ludCh4OiBudW1iZXIsIHk6IG51bWJlciwgYXJyb3c6IFJvdXRpbmdBcnJvdyk6IFJvdXRpbmdBcnJvdyB7XHJcbiAgICAvLyAgICAgYXJyb3cucG9pbnRzLnB1c2goeyB4OiB4LCB5OiB5IH0pO1xyXG4gICAgLy8gICAgIGxldCBhcnJvd3M6IFJvdXRpbmdBcnJvd1tdID0gdGhpcy5hcnJvd1BvaW50RmllbGRbeF1beV07XHJcbiAgICAvLyAgICAgaWYgKGFycm93cyA9PSBudWxsKSB7XHJcbiAgICAvLyAgICAgICAgIGFycm93cyA9IFtdO1xyXG4gICAgLy8gICAgICAgICB0aGlzLmFycm93UG9pbnRGaWVsZFt4XVt5XSA9IGFycm93cztcclxuICAgIC8vICAgICB9IGVsc2Uge1xyXG4gICAgLy8gICAgICAgICBmb3IgKGxldCBhIG9mIGFycm93cykge1xyXG4gICAgLy8gICAgICAgICAgICAgaWYgKGEuYXJyb3dUeXBlID09IGFycm93LmFycm93VHlwZSAmJiBhLmRlc3RpbmF0aW9uSWRlbnRpZmllciA9PSBhcnJvdy5kZXN0aW5hdGlvbklkZW50aWZpZXIpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgICBhcnJvd3MucHVzaChhcnJvdyk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgcmV0dXJuIGE7XHJcbiAgICAvLyAgICAgICAgICAgICB9XHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICB9XHJcbiAgICAvLyAgICAgYXJyb3dzLnB1c2goYXJyb3cpO1xyXG4gICAgLy8gfVxyXG5cclxuICAgIHJvdXRlQWxsQXJyb3dzKCk6IFJvdXRpbmdPdXRwdXQge1xyXG4gICAgICAgIGlmKHRoaXMuYXJyb3dzICE9IG51bGwpe1xyXG4gICAgICAgICAgICBmb3IgKGxldCBhIG9mIHRoaXMuYXJyb3dzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvdXRlQXJyb3dPcHRpbWl6ZWQoYSwgYS5kZWJ1ZyA9PSB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnNtb290aEFycm93cygpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHhNYXg6IHRoaXMucm91dGluZ0lucHV0LnhNYXgsXHJcbiAgICAgICAgICAgIHlNYXg6IHRoaXMucm91dGluZ0lucHV0LnlNYXgsXHJcbiAgICAgICAgICAgIGFycm93czogdGhpcy5hcnJvd3MsXHJcbiAgICAgICAgICAgIHJlY3RhbmdsZXM6IHRoaXMucmVjdGFuZ2xlcyxcclxuICAgICAgICAgICAgd2VpZ2h0czogdGhpcy53ZWlnaHRzLFxyXG4gICAgICAgICAgICBsb2NrczogdGhpcy5sb2NrcyxcclxuICAgICAgICAgICAgdmVyc2lvbjogdGhpcy5yb3V0aW5nSW5wdXQudmVyc2lvblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgcm91dGVBcnJvd09wdGltaXplZChhOiBSb3V0aW5nQXJyb3csIGRlYnVnOiBib29sZWFuID0gZmFsc2UpIHtcclxuXHJcbiAgICAgICAgbGV0IHJvdXRlVmFyaWFudHM6IHJvdXRlVmFyaWFudFtdID0gW107XHJcbiAgICAgICAgbGV0IHNvdXJjZVJlY3QgPSB0aGlzLnJlY3RhbmdsZXNbYS5zb3VyY2VSZWN0YW5nbGVJbmRleF07XHJcbiAgICAgICAgbGV0IGRlc3RSZWN0ID0gdGhpcy5yZWN0YW5nbGVzW2EuZGVzdFJlY3RhbmdsZUluZGV4XTtcclxuICAgICAgICBsZXQgc2xvdERpc3RhbmNlID0gdGhpcy5yb3V0aW5nSW5wdXQuc2xvdERpc3RhbmNlO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBzb3VyY2VEaXJlY3Rpb24gPSAwOyBzb3VyY2VEaXJlY3Rpb24gPCA0OyBzb3VyY2VEaXJlY3Rpb24rKykge1xyXG4gICAgICAgICAgICAvLyBmb3IgKGxldCBzb3VyY2VTbG90RGVsdGEgb2YgWy0xLCAxXSkgXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGRlc3REaXJlY3Rpb24gPSAwOyBkZXN0RGlyZWN0aW9uIDwgNDsgZGVzdERpcmVjdGlvbisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZm9yIChsZXQgZGVzdFNsb3REZWx0YSBvZiBbLTEsIDFdKSBcclxuICAgICAgICAgICAgICAgICAgICB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgc291cmNlU2xvdCA9IHNvdXJjZVJlY3Quc2xvdHNbc291cmNlRGlyZWN0aW9uXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRlc3RTbG90ID0gZGVzdFJlY3Quc2xvdHNbZGVzdERpcmVjdGlvbl07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgc291cmNlRGVsdGFGcm9tTWlkID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzb3VyY2VTbG90RGVsdGEgPSBzb3VyY2VTbG90Lmxhc3REZWx0YSAqIC0xO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VTbG90Lmxhc3REZWx0YSAqPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRlc3RTbG90RGVsdGEgPSBkZXN0U2xvdC5sYXN0RGVsdGEgKiAtMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzdFNsb3QubGFzdERlbHRhICo9IC0xO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvdXJjZVNsb3QudXNlZEZyb20gIT0gbnVsbCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZURlbHRhRnJvbU1pZCA9IHNvdXJjZVNsb3REZWx0YSA+IDAgP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZVNsb3QudXNlZFRvICsgc2xvdERpc3RhbmNlIDogc291cmNlU2xvdC51c2VkRnJvbSAtIHNsb3REaXN0YW5jZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihzb3VyY2VEZWx0YUZyb21NaWQgPCBzb3VyY2VTbG90Lm1pbiB8fCBzb3VyY2VEZWx0YUZyb21NaWQgPiBzb3VyY2VTbG90Lm1heCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzb3VyY2VQb3MgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBzb3VyY2VTbG90Lm1pZC54ICsgc291cmNlU2xvdC5kZWx0YUZyb21TbG90VG9TbG90LnggKiBzb3VyY2VEZWx0YUZyb21NaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBzb3VyY2VTbG90Lm1pZC55ICsgc291cmNlU2xvdC5kZWx0YUZyb21TbG90VG9TbG90LnkgKiBzb3VyY2VEZWx0YUZyb21NaWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkZXN0RGVsdGFGcm9tTWlkID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlc3RTbG90LnVzZWRGcm9tICE9IG51bGwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXN0RGVsdGFGcm9tTWlkID0gZGVzdFNsb3REZWx0YSA+IDAgP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc3RTbG90LnVzZWRUbyArIHNsb3REaXN0YW5jZSA6IGRlc3RTbG90LnVzZWRGcm9tIC0gc2xvdERpc3RhbmNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGRlc3REZWx0YUZyb21NaWQgPCBkZXN0U2xvdC5taW4gfHwgZGVzdERlbHRhRnJvbU1pZCA+IGRlc3RTbG90Lm1heCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkZXN0UG9zID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogZGVzdFNsb3QubWlkLnggKyBkZXN0U2xvdC5kZWx0YUZyb21TbG90VG9TbG90LnggKiBkZXN0RGVsdGFGcm9tTWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogZGVzdFNsb3QubWlkLnkgKyBkZXN0U2xvdC5kZWx0YUZyb21TbG90VG9TbG90LnkgKiBkZXN0RGVsdGFGcm9tTWlkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgYS5zb3VyY2UgPSBzb3VyY2VQb3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGEuZGVzdCA9IGRlc3RQb3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGEuc291cmNlRGlyZWN0aW9uID0gc291cmNlU2xvdC5hcnJvd0RpcmVjdGlvbk91dHdhcmQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGEuZGVzdERpcmVjdGlvbiA9IHsgeDogZGVzdFNsb3QuYXJyb3dEaXJlY3Rpb25PdXR3YXJkLngsIHk6IGRlc3RTbG90LmFycm93RGlyZWN0aW9uT3V0d2FyZC55IH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGEuZW5kc09uQXJyb3dXaXRoSWRlbnRpZmllciA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnMoc291cmNlUG9zLnggLSBkZXN0UG9zLngpICsgTWF0aC5hYnMoc291cmNlUG9zLnkgLSBkZXN0UG9zLnkpID4gMiAqIHRoaXMucm91dGluZ0lucHV0LnN0cmFpZ2h0QXJyb3dTZWN0aW9uQWZ0ZXJSZWN0YW5nbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm91dGVBcnJvdyhhLCBmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHdlaWdodCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBwIG9mIGEucG9pbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHcgPSB0aGlzLndlaWdodHNbcC54XVtwLnldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlaWdodCArPSAodyA8IDAgPyAxMDAwIDogdyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2tzW3AueF1bcC55XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsID4gMTEgJiYgbCA8IDEwMDApeyAvLyBJbnRlcnNlY3Rpb24gb2YgYXJyb3dzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlaWdodCArPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlVmFyaWFudHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdDogZGVzdFBvcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHNvdXJjZVBvcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXN0RGVsdGFGcm9tTWlkOiBkZXN0RGVsdGFGcm9tTWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZURlbHRhRnJvbU1pZDogc291cmNlRGVsdGFGcm9tTWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc3REaXJlY3Rpb246IGEuZGVzdERpcmVjdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VEaXJlY3Rpb246IGEuc291cmNlRGlyZWN0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlaWdodFN1bTogd2VpZ2h0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZHNPbkFycm93V2l0aElkZW50aWZpZXI6IGEuZW5kc09uQXJyb3dXaXRoSWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludHM6IGEucG9pbnRzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltYWxQb2ludHM6IGEubWluaW1hbFBvaW50cyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VTbG90OiBzb3VyY2VTbG90LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc3RTbG90OiBkZXN0U2xvdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtaW5XZWlnaHQgPSAxMDAwMDAwO1xyXG4gICAgICAgIGxldCBiZXN0VmFyaWFudDogcm91dGVWYXJpYW50ID0gbnVsbDtcclxuICAgICAgICBmb3IgKGxldCB2IG9mIHJvdXRlVmFyaWFudHMpIHtcclxuICAgICAgICAgICAgaWYgKHYud2VpZ2h0U3VtID4gMyAmJiB2LndlaWdodFN1bSA8IG1pbldlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgYmVzdFZhcmlhbnQgPSB2O1xyXG4gICAgICAgICAgICAgICAgbWluV2VpZ2h0ID0gdi53ZWlnaHRTdW07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChiZXN0VmFyaWFudCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGEuc291cmNlID0gYmVzdFZhcmlhbnQuc291cmNlO1xyXG4gICAgICAgICAgICBhLmRlc3QgPSBiZXN0VmFyaWFudC5kZXN0O1xyXG4gICAgICAgICAgICBhLnNvdXJjZURpcmVjdGlvbiA9IGJlc3RWYXJpYW50LnNvdXJjZURpcmVjdGlvbjtcclxuICAgICAgICAgICAgYS5kZXN0RGlyZWN0aW9uID0gYmVzdFZhcmlhbnQuZGVzdERpcmVjdGlvbjtcclxuICAgICAgICAgICAgYS5lbmRzT25BcnJvd1dpdGhJZGVudGlmaWVyID0gYmVzdFZhcmlhbnQuZW5kc09uQXJyb3dXaXRoSWRlbnRpZmllcjtcclxuICAgICAgICAgICAgYS5taW5pbWFsUG9pbnRzID0gYmVzdFZhcmlhbnQubWluaW1hbFBvaW50cztcclxuICAgICAgICAgICAgYS5wb2ludHMgPSBiZXN0VmFyaWFudC5wb2ludHM7XHJcblxyXG4gICAgICAgICAgICBpZiAoYmVzdFZhcmlhbnQuc291cmNlRGVsdGFGcm9tTWlkIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgYmVzdFZhcmlhbnQuc291cmNlU2xvdC51c2VkRnJvbSA9IGJlc3RWYXJpYW50LnNvdXJjZURlbHRhRnJvbU1pZDtcclxuICAgICAgICAgICAgICAgIGlmIChiZXN0VmFyaWFudC5zb3VyY2VTbG90LnVzZWRUbyA9PSBudWxsKSBiZXN0VmFyaWFudC5zb3VyY2VTbG90LnVzZWRUbyA9IDA7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBiZXN0VmFyaWFudC5zb3VyY2VTbG90LnVzZWRUbyA9IGJlc3RWYXJpYW50LnNvdXJjZURlbHRhRnJvbU1pZDtcclxuICAgICAgICAgICAgICAgIGlmIChiZXN0VmFyaWFudC5zb3VyY2VTbG90LnVzZWRGcm9tID09IG51bGwpIGJlc3RWYXJpYW50LnNvdXJjZVNsb3QudXNlZEZyb20gPSAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChiZXN0VmFyaWFudC5kZXN0RGVsdGFGcm9tTWlkIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgYmVzdFZhcmlhbnQuZGVzdFNsb3QudXNlZEZyb20gPSBiZXN0VmFyaWFudC5kZXN0RGVsdGFGcm9tTWlkO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJlc3RWYXJpYW50LmRlc3RTbG90LnVzZWRUbyA9PSBudWxsKSBiZXN0VmFyaWFudC5kZXN0U2xvdC51c2VkVG8gPSAwO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYmVzdFZhcmlhbnQuZGVzdFNsb3QudXNlZFRvID0gYmVzdFZhcmlhbnQuZGVzdERlbHRhRnJvbU1pZDtcclxuICAgICAgICAgICAgICAgIGlmIChiZXN0VmFyaWFudC5kZXN0U2xvdC51c2VkRnJvbSA9PSBudWxsKSBiZXN0VmFyaWFudC5kZXN0U2xvdC51c2VkRnJvbSA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQXJyb3dUb0Fycm93UG9pbnRzRmllbGQoYSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcm91dGVBcnJvdyhhOiBSb3V0aW5nQXJyb3csIGRlYnVnOiBib29sZWFuID0gZmFsc2UpIHtcclxuXHJcbiAgICAgICAgaWYgKGRlYnVnID09IHRydWUpIGRlYnVnZ2VyO1xyXG4gICAgICAgIHRoaXMuaW5pdFdlaWdodHMoKTtcclxuICAgICAgICB0aGlzLnByZXBhcmVSZWN0YW5nbGVzKCk7XHJcbiAgICAgICAgdGhpcy5wcmVwYXJlQXJyb3dMb2NrcyhhKTtcclxuICAgICAgICB0aGlzLmNhbGN1bGF0ZVdlaWdodHMoYS5kZXN0LngsIGEuZGVzdC55LCBhLmRlc3REaXJlY3Rpb24ueCwgYS5kZXN0RGlyZWN0aW9uLnkpO1xyXG5cclxuICAgICAgICAvLyB0aGlzLnJlbmRlcihjdHgpO1xyXG4gICAgICAgIGxldCBkeCA9IGEuc291cmNlRGlyZWN0aW9uLng7XHJcbiAgICAgICAgbGV0IGR5ID0gYS5zb3VyY2VEaXJlY3Rpb24ueTtcclxuXHJcbiAgICAgICAgYS5wb2ludHMgPSBbXTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRQb2ludChhLnNvdXJjZS54LCBhLnNvdXJjZS55LCBhKTtcclxuXHJcbiAgICAgICAgbGV0IHggPSBhLnNvdXJjZS54ICsgYS5zb3VyY2VEaXJlY3Rpb24ueCAqIDI7XHJcbiAgICAgICAgbGV0IHkgPSBhLnNvdXJjZS55ICsgYS5zb3VyY2VEaXJlY3Rpb24ueSAqIDI7XHJcblxyXG4gICAgICAgIGlmICh4IDwgMCB8fCB4ID49IHRoaXMucm91dGluZ0lucHV0LnhNYXggfHwgeSA8IDAgfHwgeSA+PSB0aGlzLnJvdXRpbmdJbnB1dC55TWF4KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBsb2NrV2VpZ2h0ID0gNjtcclxuICAgICAgICB0aGlzLmxvY2tzW3hdW3ldID0gbG9ja1dlaWdodDtcclxuXHJcbiAgICAgICAgbGV0IGZlcnRpZyA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBlbmRzSW5BcnJvdzogUm91dGluZ0Fycm93ID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRQb2ludChhLnNvdXJjZS54ICsgYS5zb3VyY2VEaXJlY3Rpb24ueCwgYS5zb3VyY2UueSArIGEuc291cmNlRGlyZWN0aW9uLnksIGEpO1xyXG4gICAgICAgIGVuZHNJbkFycm93ID0gdGhpcy5hZGRQb2ludCh4LCB5LCBhKTtcclxuXHJcbiAgICAgICAgbGV0IHJvdXRlU3RyYXRlZ2llczogUm91dGVTdHJhdGVneVtdID0gW107XHJcblxyXG4gICAgICAgIGZvciAobGV0IHN0cmFpZ2h0ID0gNTsgc3RyYWlnaHQgPj0gMDsgc3RyYWlnaHQtLSkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBub3JtYWwgPSAwOyBub3JtYWwgPD0gNTsgbm9ybWFsKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChzdHJhaWdodCAhPSAwIHx8IG5vcm1hbCAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcm91dGVTdHJhdGVnaWVzLnB1c2goeyBzdHJhaWdodDogc3RyYWlnaHQsIG5vcm1hbDogbm9ybWFsLCBib251czogLU1hdGguYWJzKHN0cmFpZ2h0KSAtIE1hdGguYWJzKG5vcm1hbCkgKyAxIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vcm1hbCAhPSAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByb3V0ZVN0cmF0ZWdpZXMucHVzaCh7IHN0cmFpZ2h0OiBzdHJhaWdodCwgbm9ybWFsOiAtbm9ybWFsLCBib251czogLU1hdGguYWJzKHN0cmFpZ2h0KSAtIE1hdGguYWJzKG5vcm1hbCkgKyAxIH0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsZXQgbGFzdExlbmd0aCA9IDA7XHJcbiAgICAgICAgd2hpbGUgKCFmZXJ0aWcpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBuZXdEaXJlY3Rpb25YID0gMDtcclxuICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvblkgPSAwO1xyXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoYS5kZXN0LnggLSB4KSArIE1hdGguYWJzKGEuZGVzdC55IC0geSkgPCA0KSB7XHJcbiAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb25YID0gYS5kZXN0LnggLSB4O1xyXG4gICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uWSA9IGEuZGVzdC55IC0geTtcclxuICAgICAgICAgICAgICAgIGZlcnRpZyA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWluaW11bVdlaWdodCA9IDEwMDAwMDA7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHcgPSB0aGlzLndlaWdodHNbeF1beV07XHJcbiAgICAgICAgICAgICAgICBsZXQgZnJvbTogUG9pbnQgPSB7IHg6IHgsIHk6IHkgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZGVidWcgPT0gdHJ1ZSkgY29uc29sZS5sb2coXCJQb3NpdGlvbjogXCIgKyB4ICsgXCIvXCIgKyB5ICsgXCIsIHdlaWdodDogXCIgKyB0aGlzLndlaWdodHNbeF1beV0gKyBcIitcIiArIHRoaXMubG9ja3NbeF1beV0gKyBcIiA9IFwiICsgdyk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBycyBvZiByb3V0ZVN0cmF0ZWdpZXMpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5keCA9IHJzLnN0cmFpZ2h0ICogZHggKyBycy5ub3JtYWwgKiBkeTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmR5ID0gcnMuc3RyYWlnaHQgKiBkeSAtIHJzLm5vcm1hbCAqIGR4O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgeE5ldyA9IHggKyBuZHg7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHlOZXcgPSB5ICsgbmR5O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoeE5ldyA8IDAgfHwgeU5ldyA8IDAgfHwgeE5ldyA+IHRoaXMucm91dGluZ0lucHV0LnhNYXggLSAxIHx8IHlOZXcgPiB0aGlzLnJvdXRpbmdJbnB1dC55TWF4IC0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCB3ZWlnaHQgPSB0aGlzLmdldFdlaWdodChmcm9tLCB7IHg6IHhOZXcsIHk6IHlOZXcgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXdXZWlnaHQgPSB3ZWlnaHQuZGVzdFdlaWdodCArIE1hdGguc3FydCh3ZWlnaHQud2F5V2VpZ2h0KTsgLy90aGlzLndlaWdodHNbeE5ld11beU5ld10gKyB0aGlzLmxvY2tzW3hOZXddW3lOZXddO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzOiBzdHJpbmcgPSBcIlRyeWluZyBcIiArIHhOZXcgKyBcIi9cIiArIHlOZXcgKyBcIjogdyA9IFwiICsgdGhpcy53ZWlnaHRzW3hOZXddW3lOZXddICsgXCIrXCIgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvY2tzW3hOZXddW3lOZXddICsgXCIgPSBcIiArIG5ld1dlaWdodCArIFwiLCBCb251cyA9IFwiICsgcnMuYm9udXM7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1dlaWdodCA+IHcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3V2VpZ2h0ICs9IDM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHMgKz0gXCIgVmVyc2NobGVjaHRlcnVuZyA9PiBTdHJhZmUgLTMhIFwiO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBuZXdXZWlnaHQgLT0gcnMuYm9udXM7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZGVsdGFXIC89IHJzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobmV3V2VpZ2h0IDwgbWluaW11bVdlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5pbXVtV2VpZ2h0ID0gbmV3V2VpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb25YID0gbmR4O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb25ZID0gbmR5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzICs9IFwiIC0+IG5ldyBNaW5pbXVtIVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGVidWcgPT0gdHJ1ZSkgY29uc29sZS5sb2cocyk7XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh4ID09IGEuZGVzdC54ICYmIHkgPT0gYS5kZXN0LnkgfHwgbmV3RGlyZWN0aW9uWCA9PSAwICYmIG5ld0RpcmVjdGlvblkgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZlcnRpZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh4ICsgbmV3RGlyZWN0aW9uWCA8IDAgfHwgeCArIG5ld0RpcmVjdGlvblggPiB0aGlzLnJvdXRpbmdJbnB1dC54TWF4IC0gMVxyXG4gICAgICAgICAgICAgICAgfHwgeSArIG5ld0RpcmVjdGlvblkgPCAwIHx8IHkgKyBuZXdEaXJlY3Rpb25ZID4gdGhpcy5yb3V0aW5nSW5wdXQueU1heCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIGZlcnRpZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHdlaWdodFN1bUZpcnN0WFRoZW5ZID0gMDtcclxuICAgICAgICAgICAgbGV0IHdlaWdodFN1bUZpcnN0WVRoZW5YID0gMDtcclxuXHJcbiAgICAgICAgICAgIC8vIGZpcnN0IHggdGhlbiB5XHJcbiAgICAgICAgICAgIGxldCB4biA9IHg7XHJcbiAgICAgICAgICAgIGxldCB5biA9IHk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IE1hdGguYWJzKG5ld0RpcmVjdGlvblgpOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHhuICs9IE1hdGguc2lnbihuZXdEaXJlY3Rpb25YKTtcclxuICAgICAgICAgICAgICAgIHdlaWdodFN1bUZpcnN0WFRoZW5ZICs9IHRoaXMud2VpZ2h0c1t4bl1beW5dICsgdGhpcy5sb2Nrc1t4bl1beW5dO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IE1hdGguYWJzKG5ld0RpcmVjdGlvblkpOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHluICs9IE1hdGguc2lnbihuZXdEaXJlY3Rpb25ZKTtcclxuICAgICAgICAgICAgICAgIHdlaWdodFN1bUZpcnN0WFRoZW5ZICs9IHRoaXMud2VpZ2h0c1t4bl1beW5dICsgdGhpcy5sb2Nrc1t4bl1beW5dO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBmaXJzdCB5IHRoZW4geFxyXG4gICAgICAgICAgICB4biA9IHg7XHJcbiAgICAgICAgICAgIHluID0geTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gTWF0aC5hYnMobmV3RGlyZWN0aW9uWSk7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgeW4gKz0gTWF0aC5zaWduKG5ld0RpcmVjdGlvblkpO1xyXG4gICAgICAgICAgICAgICAgd2VpZ2h0U3VtRmlyc3RZVGhlblggKz0gdGhpcy53ZWlnaHRzW3huXVt5bl0gKyB0aGlzLmxvY2tzW3huXVt5bl07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gTWF0aC5hYnMobmV3RGlyZWN0aW9uWCk7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgeG4gKz0gTWF0aC5zaWduKG5ld0RpcmVjdGlvblgpO1xyXG4gICAgICAgICAgICAgICAgd2VpZ2h0U3VtRmlyc3RZVGhlblggKz0gdGhpcy53ZWlnaHRzW3huXVt5bl0gKyB0aGlzLmxvY2tzW3huXVt5bl07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh3ZWlnaHRTdW1GaXJzdFhUaGVuWSA8PSB3ZWlnaHRTdW1GaXJzdFlUaGVuWCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5ld0RpcmVjdGlvblggIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IE1hdGguYWJzKG5ld0RpcmVjdGlvblgpOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuZHNJbkFycm93ICE9IG51bGwpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB4ICs9IE1hdGguc2lnbihuZXdEaXJlY3Rpb25YKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2Nrc1t4XVt5XSArPSBsb2NrV2VpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmRzSW5BcnJvdyA9IHRoaXMuYWRkUG9pbnQoeCwgeSwgYSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGR4ID0gTWF0aC5zaWduKG5ld0RpcmVjdGlvblgpOyBkeSA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAobmV3RGlyZWN0aW9uWCAqIG5ld0RpcmVjdGlvblkgIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9ja3NbeF1beV0gKz0gMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChuZXdEaXJlY3Rpb25ZICE9IDAgJiYgZW5kc0luQXJyb3cgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IE1hdGguYWJzKG5ld0RpcmVjdGlvblkpOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuZHNJbkFycm93ICE9IG51bGwpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB5ICs9IE1hdGguc2lnbihuZXdEaXJlY3Rpb25ZKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2Nrc1t4XVt5XSArPSBsb2NrV2VpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmRzSW5BcnJvdyA9IHRoaXMuYWRkUG9pbnQoeCwgeSwgYSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGR4ID0gMDsgZHkgPSBNYXRoLnNpZ24obmV3RGlyZWN0aW9uWSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8PSBNYXRoLmFicyhuZXdEaXJlY3Rpb25ZKTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuZHNJbkFycm93ICE9IG51bGwpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIHkgKz0gTWF0aC5zaWduKG5ld0RpcmVjdGlvblkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9ja3NbeF1beV0gKz0gbG9ja1dlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBlbmRzSW5BcnJvdyA9IHRoaXMuYWRkUG9pbnQoeCwgeSwgYSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvY2tzW3hdW3ldICs9IDE7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8PSBNYXRoLmFicyhuZXdEaXJlY3Rpb25YKTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuZHNJbkFycm93ICE9IG51bGwpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIHggKz0gTWF0aC5zaWduKG5ld0RpcmVjdGlvblgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9ja3NbeF1beV0gKz0gbG9ja1dlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBlbmRzSW5BcnJvdyA9IHRoaXMuYWRkUG9pbnQoeCwgeSwgYSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkeSA9IDA7IGR4ID0gTWF0aC5zaWduKG5ld0RpcmVjdGlvblgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYS5wb2ludHMubGVuZ3RoID4gMTAwMCB8fCBhLnBvaW50cy5sZW5ndGggPT0gbGFzdExlbmd0aCkgZmVydGlnID0gdHJ1ZTtcclxuICAgICAgICAgICAgbGFzdExlbmd0aCA9IGEucG9pbnRzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIGlmIChlbmRzSW5BcnJvdyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBmZXJ0aWcgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGVuZHNJbkFycm93ID09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5hZGRQb2ludCh4LCB5LCBhKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGEubWluaW1hbFBvaW50cyA9IFtdO1xyXG4gICAgICAgIGlmIChhLnBvaW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGxldCBsYXN0RWRnZSA9IGEucG9pbnRzWzBdO1xyXG4gICAgICAgICAgICBhLm1pbmltYWxQb2ludHMucHVzaChsYXN0RWRnZSk7XHJcbiAgICAgICAgICAgIGxldCBsYXN0UG9pbnQgPSBhLnBvaW50c1swXTtcclxuICAgICAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBwIG9mIGEucG9pbnRzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocC54ICE9IGxhc3RFZGdlLnggJiYgcC55ICE9IGxhc3RFZGdlLnkgfHwgaSA9PSBhLnBvaW50cy5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYS5taW5pbWFsUG9pbnRzLnB1c2gobGFzdFBvaW50KTtcclxuICAgICAgICAgICAgICAgICAgICBsYXN0RWRnZSA9IGxhc3RQb2ludDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxhc3RQb2ludCA9IHA7XHJcbiAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYS5taW5pbWFsUG9pbnRzLnB1c2gobGFzdFBvaW50KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlbmRzSW5BcnJvdyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGEuZW5kc09uQXJyb3dXaXRoSWRlbnRpZmllciA9IGVuZHNJbkFycm93LmlkZW50aWZpZXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXRXZWlnaHQoZnJvbTogUG9pbnQsIHRvOiBQb2ludCk6IHsgZGVzdFdlaWdodDogbnVtYmVyLCB3YXlXZWlnaHQ6IG51bWJlciwgZmlyc3RIb3Jpem9udGFsOiBib29sZWFuIH0ge1xyXG5cclxuICAgICAgICBsZXQgZHggPSB0by54IC0gZnJvbS54O1xyXG4gICAgICAgIGxldCBkeSA9IHRvLnkgLSBmcm9tLnk7XHJcblxyXG4gICAgICAgIGxldCBsZW5ndGggPSBNYXRoLmFicyhkeCkgKyBNYXRoLmFicyhkeSk7XHJcblxyXG4gICAgICAgIGxldCB3ZWlnaHRGaXJzdEhvcml6b250YWwgPSAwO1xyXG4gICAgICAgIGxldCB3ZWlnaHRGaXJzdFZlcnRpY2FsID0gMDtcclxuXHJcbiAgICAgICAgbGV0IHggPSBmcm9tLng7XHJcbiAgICAgICAgbGV0IHkgPSBmcm9tLnk7XHJcbiAgICAgICAgZm9yIChsZXQgZGVsdGEgPSAxOyBkZWx0YSA8PSBNYXRoLmFicyhkeCk7IGRlbHRhKyspIHtcclxuICAgICAgICAgICAgeCArPSBNYXRoLnNpZ24oZHgpO1xyXG4gICAgICAgICAgICBsZXQgdyA9IHRoaXMud2VpZ2h0c1t4XVt5XTtcclxuICAgICAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2tzW3hdW3ldO1xyXG4gICAgICAgICAgICB3ZWlnaHRGaXJzdEhvcml6b250YWwgKz0gbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yIChsZXQgZGVsdGEgPSAxOyBkZWx0YSA8PSBNYXRoLmFicyhkeSk7IGRlbHRhKyspIHtcclxuICAgICAgICAgICAgeSArPSBNYXRoLnNpZ24oZHkpO1xyXG4gICAgICAgICAgICBsZXQgdyA9IHRoaXMud2VpZ2h0c1t4XVt5XTtcclxuICAgICAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2tzW3hdW3ldO1xyXG4gICAgICAgICAgICB3ZWlnaHRGaXJzdEhvcml6b250YWwgKz0gbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHggPSBmcm9tLng7XHJcbiAgICAgICAgeSA9IGZyb20ueTtcclxuICAgICAgICBmb3IgKGxldCBkZWx0YSA9IDE7IGRlbHRhIDw9IE1hdGguYWJzKGR5KTsgZGVsdGErKykge1xyXG4gICAgICAgICAgICB5ICs9IE1hdGguc2lnbihkeSk7XHJcbiAgICAgICAgICAgIGxldCB3ID0gdGhpcy53ZWlnaHRzW3hdW3ldO1xyXG4gICAgICAgICAgICBsZXQgbCA9IHRoaXMubG9ja3NbeF1beV07XHJcbiAgICAgICAgICAgIHdlaWdodEZpcnN0VmVydGljYWwgKz0gbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yIChsZXQgZGVsdGEgPSAxOyBkZWx0YSA8PSBNYXRoLmFicyhkeCk7IGRlbHRhKyspIHtcclxuICAgICAgICAgICAgeCArPSBNYXRoLnNpZ24oZHgpO1xyXG4gICAgICAgICAgICBsZXQgdyA9IHRoaXMud2VpZ2h0c1t4XVt5XTtcclxuICAgICAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2tzW3hdW3ldO1xyXG4gICAgICAgICAgICB3ZWlnaHRGaXJzdFZlcnRpY2FsICs9IGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZmlyc3RIb3Jpem9udGFsID0gd2VpZ2h0Rmlyc3RIb3Jpem9udGFsIDwgd2VpZ2h0Rmlyc3RWZXJ0aWNhbDtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgd2F5V2VpZ2h0OiBmaXJzdEhvcml6b250YWwgPyB3ZWlnaHRGaXJzdEhvcml6b250YWwgOiB3ZWlnaHRGaXJzdFZlcnRpY2FsLFxyXG4gICAgICAgICAgICBmaXJzdEhvcml6b250YWw6IGZpcnN0SG9yaXpvbnRhbCxcclxuICAgICAgICAgICAgZGVzdFdlaWdodDogdGhpcy53ZWlnaHRzW3RvLnhdW3RvLnldICsgdGhpcy5sb2Nrc1t0by54XVt0by55XVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBkaXN0KHgxOiBudW1iZXIsIHkxOiBudW1iZXIsIHgyOiBudW1iZXIsIHkyOiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KCh4MSAtIHgyKSAqICh4MSAtIHgyKSArICh5MSAtIHkyKSAqICh5MSAtIHkyKSk7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbn0iXX0=