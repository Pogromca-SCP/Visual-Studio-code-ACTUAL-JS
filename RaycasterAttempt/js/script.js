// @ts-check
"use strict";

//settings

let fov = 60; //make it even, not odd
let fps = 40;
let renderAccuracy = 300; //ammount of blocks per frame
let turnSensitivity = 3; //degrees turning on click of a or d
let stepLength = 0.1; //how far you go every frame
let renderDistance = 250; //impacts how far away a wall has to be to not appear, much longer distances might slow down the game
let gameSpeed = 1000;//lower the number to make it faster 1000 is default
let sprintRate = 10;// sprint is this number * regular speed
let speedDampening = 0.1; //how fast you slow down, 0 makes you go on ice, 1 is instant
let maxSpeed = 0.5;
let recoilSeverity = 1;
let bounceDampening = 0.9; //0 no bounce, 1 same speed
let gametickPause = false;
let noclip = false;
//end of settings
let isFiring = false;
let currentFrame = 1;

/** @type {PlayerVector} */
const playerVector = { magnitude: 0, angle: 0 };

/** @type {PlayerPosition} */
let playerpos = { x: 220, y: 210, rotation: 50 };
/** @type {Record<string, number>} */
const keyMap = {
    'w': 0,
    'a': 1,
    's': 2,
    'd': 3,
    'j': 4,
    'l': 5,
    ' ': 6,
    'i': 7,
    'k': 8,
    'm': 9
};
const myCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById("content"));
myCanvas.height = 500;
let canvasHeight = myCanvas.height;
myCanvas.width = 1200;
const myUI = /** @type {HTMLCanvasElement} */ (document.getElementById("UI"));
myUI.height = 700;
myUI.width = 1200;
const myMap = /** @type {HTMLCanvasElement} */ (document.getElementById("map"));
myMap.height = 500;
myMap.width = 500;
const ctm = /** @type {CanvasRenderingContext2D} */ (myMap.getContext("2d"));
const ctx = /** @type {CanvasRenderingContext2D} */ (myCanvas.getContext("2d"));
const ctu = /** @type {CanvasRenderingContext2D} */ (myUI.getContext("2d"));

/** @type {MapPixel[][]} */
const mapData = [];
/** @type {MapVector[]} */
const vectorMapData = [];
let isShiftPressed = false;
const Gun1 = new Image();
Gun1.src = "assets/DNpistol1.png";
const skybox = new Image();
skybox.src = "assets/skybox1.png";
const testTexture1 = new Image();
testTexture1.src = "assets/bukit2.png";
const crosshair = new Image();
crosshair.src = "assets/crosshair1.png";
const chainlinkFence = new Image();
chainlinkFence.src = "assets/chainlink_fence.png";
const bluby = new Image();
bluby.src = "assets/BlubWallFinal1.png";

/**
 * @param {number} frame
 * @param {HTMLImageElement} gun
 */
function drawGunAnimation(frame, gun) {
    const gunPlacement = { x: 650, y: 250 };
    const gunScale = { x: 250, y: 250 };
    ctu.clearRect(gunPlacement.x, gunPlacement.y, gunScale.x, gunScale.y);
    const imageWidth = gun.width - 5;
    const frameShift = (imageWidth / 4) * (frame - 1);
    ctu.drawImage(gun, frameShift, 0, imageWidth / 4, gun.height, gunPlacement.x, gunPlacement.y, gunScale.x, gunScale.y);
}

let logpring = 0;

/**
 * @param {HTMLImageElement} skybox
 * @param {number} rotation
 */
function drawSkybox(skybox, rotation) {
    // if (logpring<100){console.log(playerpos.rotation);logpring++}
    const rot = skybox.width / 360;
    ctx.drawImage(skybox, rotation * rot, 0, rot * fov, skybox.height, 0, canvasHeight / 2 - 450, myCanvas.width, skybox.height - 40);

    if (rotation + fov > 360) {
        ctx.drawImage(skybox, rotation * rot - skybox.width, 0, rot * fov, skybox.height, 0, canvasHeight / 2 - 450, myCanvas.width, skybox.height - 40);
    }
}

UIHandler();
function UIHandler() {
    ctu.fillStyle = "rgba(0,255,0,0.8)";
    ctu.drawImage(crosshair, myUI.width / 2 - 10, myUI.height / 2 - 110, 20, 20);
    drawGunAnimation(1, Gun1);
    ctu.fillStyle = "grey";
    ctu.fillRect(0, 500, 1200, 200);
    ctu.fillStyle = "white";
    ctu.font = `80px Verdana`;
    ctu.fillText("this will be a banger UI some day", 10, 600, 1190);
}

/** @type {Record<number, ControllerKey>} */
const controller = {
    0: { key: "w", pressed: false },
    1: { key: "a", pressed: false },
    2: { key: "s", pressed: false },
    3: { key: "d", pressed: false },
    4: { key: "j", pressed: false },
    5: { key: "l", pressed: false },
    6: { key: " ", pressed: true },
    7: { key: "i", pressed: false },
    8: { key: "k", pressed: false },
    9: { key: "m", pressed: false }

}
setTimeout(() => {
    controller[6].pressed = false
}, 50);
makeLine(100, 100, 400, 400, "material-rainbow", false, "wall");
makeLine(100, 100, 400, 100, "materialverticalblackwhitesinewave", false, "wall");
makeLine(400, 100, 400, 400, "material verticalblacklineonwhite", false, "wall");
makeLine(450, 200, 500, 300, "materialverticalseawave", true, "passThroughMaterial");
makeLine(100, 200, 300, 400, "pink", false, "wall");
makeLine(300, 200, 300, 300, "materialimagetestTexture1", false, "wall");
makeLine(200, 200, 300, 200, "materialimagechainlinkFence", true, "wall");
makeLine(248, 250, 301, 200, "materialimagebluby", true, "wall");
document.addEventListener("keydown", (event) => {
    keySwitchboard(event, true, event.shiftKey);

    if (event.key === " ") {
        event.preventDefault();
    }
});
document.addEventListener("keyup", (event) => {
    keySwitchboard(event, false, event.shiftKey);
});
function moveMaker() {
    for (let i = 0; i < Object.keys(controller).length; ++i) {
        if (controller[i].pressed) {
            keyInterpreter(controller[i].key);
        }
    }
}
/**
 * @param {KeyboardEvent} event
 * @param {boolean} isDown
 * @param {boolean} isShiftDown
 */
function keySwitchboard(event, isDown, isShiftDown) {
    const key = event.key.toLowerCase();
    if (key.search(/^[wasd jlikm]$/g) === 0) {
        const index = keyMap[key];
        controller[index].pressed = isDown;
    }
    if (event.shiftKey || event.key.search(/^[WASD]$/gi) === 0) {
        isShiftPressed = isShiftDown;
    }
}
function apply() {
    fov = +(/** @type {HTMLInputElement} */ (document.getElementById("fov")).value);
    fps = +(/** @type {HTMLInputElement} */ (document.getElementById("fps")).value);
    renderAccuracy = +(/** @type {HTMLInputElement} */ (document.getElementById("renderAccuracy")).value);
    turnSensitivity = +(/** @type {HTMLInputElement} */ (document.getElementById("turnSensitivity")).value);
    stepLength = +(/** @type {HTMLInputElement} */ (document.getElementById("stepLength")).value);
    renderDistance = +(/** @type {HTMLInputElement} */ (document.getElementById("renderDistance")).value);
    gameSpeed = +(/** @type {HTMLInputElement} */ (document.getElementById("gameSpeed")).value);
    sprintRate = +(/** @type {HTMLInputElement} */ (document.getElementById("sprintRate")).value);
    recoilSeverity = +(/** @type {HTMLInputElement} */ (document.getElementById("recoilSeverity")).value);
    maxSpeed = +(/** @type {HTMLInputElement} */ (document.getElementById("maxSpeed")).value);
    speedDampening = +(/** @type {HTMLInputElement} */ (document.getElementById("speedDampening")).value);
    gametickPause = /** @type {HTMLInputElement} */ (document.getElementById("gametickPause")).checked;
    noclip = /** @type {HTMLInputElement} */ (document.getElementById("noclip")).checked;
}
let fireCooldown = false;
const Gun1shot = new Audio('assets/DNpistolshot.mp3');
/** @param {string} key */
function keyInterpreter(key) {
    switch (key) {
        case "w":
            movement(stepLength, 0);
            break;
        case "a":
            movement(stepLength, 270);
            break;
        case "s":
            movement(stepLength, 180);
            break;
        case "d":
            movement(stepLength, 90);
            break;
        case "j":
            playerpos.rotation = angleCorrector(playerpos.rotation - turnSensitivity);
            break;
        case "l":
            playerpos.rotation = angleCorrector(playerpos.rotation + turnSensitivity);
            break;
        case "i":
            canvasHeight += turnSensitivity * 5;
            break;
        case "k":
            canvasHeight -= turnSensitivity * 5;
            break;
        case " ":
            let recoilCount = 0;
            const randomNumber = (Math.random() * 2 - 1) * recoilSeverity;
            const correctPitch = canvasHeight;
            movement(0.1 * recoilSeverity, angleCorrector(180));
            function recoil() {
                switch (recoilCount) {
                    case 1:
                        drawGunAnimation(2, Gun1);
                        const newAudio = /** @type {HTMLAudioElement} */ (Gun1shot.cloneNode());
                        newAudio.play();
                        break;
                    case 3:
                        drawGunAnimation(3, Gun1);
                        break;
                    case 7:
                        drawGunAnimation(4, Gun1);
                        break;
                    case 14:
                        drawGunAnimation(1, Gun1);
                        break;
                    default:
                        break;
                }
                fireCooldown = true;
                if (recoilCount <= 10) {
                    isFiring = true;
                    canvasHeight += randomNumber;
                    playerpos.rotation += randomNumber * 0.1;
                } else {
                    isFiring = false;
                    canvasHeight -= randomNumber;
                    playerpos.rotation -= randomNumber * 0.1;
                }
                ++recoilCount;
                if (recoilCount < 21) {
                    setTimeout(recoil, gameSpeed / fps / 3);
                } else {
                    recoilCount = 0;
                    canvasHeight = correctPitch;
                    fireCooldown = false;
                    return;
                }
            }
            if (!fireCooldown) {
                recoil();
            }
        default:
            break;
    }
}
/**
 * @param {number} ammount
 * @param {number} angle
 */
function movement(ammount, angle) {
    let stepDistance = ammount;
    if (isShiftPressed && ammount === stepLength) {
        stepDistance *= sprintRate;
    }
    const vectorChange = calculateVectorDisplacement(angleCorrector(playerpos.rotation + angle), stepDistance);
    const currentPlayerVector = calculateVectorDisplacement(playerVector.angle, playerVector.magnitude);
    const newVector = { x: vectorChange.x + currentPlayerVector.x, y: vectorChange.y + currentPlayerVector.y };
    const newMagVector = returnAngleAndMagnitudeFromZero(newVector);
    playerVector.magnitude = Math.abs(newMagVector.magnitude);
    playerVector.angle = newMagVector.angle;
    //if(consolelogprint<20){console.log(playerVector);consolelogprint++}
}
function movementExecuter() {
    if (!(controller[0].pressed || controller[1].pressed || controller[2].pressed || controller[3].pressed)) {
        playerVector.magnitude *= 1 - speedDampening;
        if (playerVector.magnitude < 0.1) {
            playerVector.magnitude = 0;
        }
    }

    if (playerVector.magnitude > maxSpeed) {
        playerVector.magnitude = maxSpeed;
    }
    const playerShift = calculateVectorDisplacement(playerVector.angle, playerVector.magnitude);
    const wallDetection = rayCastingReturnWall(playerpos, playerVector.angle, playerVector.magnitude);
    const bounceResult = bounceCalculator(wallDetection, playerShift, noclip, true);
    playerpos.x += bounceResult.x;
    playerpos.y += bounceResult.y;
    if (bounceResult.angle !== undefined) {
        playerVector.angle = bounceResult.angle;
    }
}

/**
 * @param {undefined | MapVector | MapVector[]} wallDetection
 * @param {Vector} shift
 * @param {boolean} ignoreCollision
 * @param {boolean} isFirstBounce
 * @returns {AngledVector}
 */
function bounceCalculator(wallDetection, shift, ignoreCollision, isFirstBounce) {
    if (ignoreCollision || wallDetection === undefined) {
        return { x: shift.x, y: shift.y, angle: undefined };
    }

    let wallNormal = { x: 1, y: 1 };
    if (Array.isArray(wallDetection)) {
        if (wallDetection[0].proximity > 0.01) {
            wallNormal = normaliseVector({ x: -(wallDetection[0].end.y - wallDetection[0].start.y), y: (wallDetection[0].end.x - wallDetection[0].start.x) });
        }
        else if (wallDetection[0].proximity < 0.01 && !isFirstBounce) {
            console.log(wallDetection[1], "bruh");
        }
    }
    else {
        wallNormal = normaliseVector({ x: -(wallDetection.end.y - wallDetection.start.y), y: (wallDetection.end.x - wallDetection.start.x) });
    }
    let dotOfWallNormal = calculateDotProduct(shift, wallNormal);
    if (Math.sign(dotOfWallNormal) <= 0) {
        wallNormal.x *= -1;
        wallNormal.y *= -1;
        dotOfWallNormal = calculateDotProduct(shift, wallNormal);
    }
    shift.x -= 2 * (wallNormal.x * dotOfWallNormal);
    shift.y -= 2 * (wallNormal.y * dotOfWallNormal);
    const bounceVector = returnAngleAndMagnitudeFromZero(shift);
    const nextCollision = rayCastingReturnWall(Array.isArray(wallDetection) ? wallDetection[0].intersection : wallDetection.intersection, bounceVector.angle, bounceVector.magnitude);
    const nextCollisionCheckMath = returnAngleAndMagnitudeFromZero({ x: shift.x, y: shift.y })
    const nextCollisionCheck = rayCastingReturnWall(playerpos, nextCollisionCheckMath.angle, nextCollisionCheckMath.magnitude);

//this is definetelly unfinished
    if (Array.isArray(nextCollision)||Array.isArray(nextCollisionCheck)) {
        const nextBounce = bounceCalculator(nextCollision, calculateVectorDisplacement(bounceVector.angle, bounceVector.magnitude), ignoreCollision, false);
        console.log(nextBounce, wallDetection);
        return { x: shift.x * 0, y: shift.y * 0, angle: nextBounce.angle };
    }
    if (Array.isArray(nextCollisionCheck)) {
        const nextBounce = bounceCalculator(nextCollisionCheck, calculateVectorDisplacement(bounceVector.angle, bounceVector.magnitude), ignoreCollision, false);
        console.log(nextBounce, wallDetection);
        return { x: shift.x * nextBounce.x, y: shift.y * nextBounce.y, angle: nextBounce.angle };
    }
    console.log({ x: shift.x, y: shift.y, angle: bounceVector.angle })
    return { x: shift.x, y: shift.y, angle: bounceVector.angle };
}

/** @type {FrameData[]} */
let currentFrameData = [];
function drawFrame() {
    ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
    drawSkybox(skybox, playerpos.rotation);
    const wallProportionsX = Math.ceil(myCanvas.width / renderAccuracy);
    const angleEnd = playerpos.rotation + fov / 2;
    const angleDifference = fov / renderAccuracy;
    let currentAngle = playerpos.rotation - fov / 2;
    let currentLine = renderAccuracy;
    while (currentAngle < angleEnd) {
        const rayResult = rayCastingReturnWall(playerpos, currentAngle, renderDistance);
        if (rayResult !== undefined) {
            if (!Array.isArray(rayResult)) {
                const distance = Math.cos(toRadians(playerpos.rotation - currentAngle)) * (rayResult.proximity);
                const wallProportionsY = Math.round(myCanvas.height / distance);
                /** @type {Material} */
                let materialResult = new SimpleMaterial(rayResult.material);
                if (rayResult.material.search(/(material)[- ]?[a-z]{1,20}/gi) === 0) {
                    materialResult = materialEncyclopedia(rayResult.material.replace(/(material)[- ]?/gi, ""), returnIntersectionDistanceFromOrigin(rayResult, rayResult.intersection));
                }
                const currentWallPositionX = (myCanvas.width - currentLine * wallProportionsX) + wallProportionsX / 2;
                currentFrameData.push({ xPos: currentWallPositionX - (wallProportionsX / 2), yPos: (canvasHeight / 2) - wallProportionsY, xWidth: wallProportionsX + 1, yWidth: wallProportionsY * 2, material: materialResult, proximity: rayResult.proximity });
            }
            else {
                for (let f = 0; f < rayResult.length; f++) {
                    /** @type {MapVector} */
                    const currentRayResult = rayResult[f];
                    const distance = Math.cos(toRadians(playerpos.rotation - currentAngle)) * (currentRayResult.proximity);
                    const wallProportionsY = Math.round(myCanvas.height / distance);
                    /** @type {Material} */
                    let materialResult = new SimpleMaterial(currentRayResult.material);
                    if (currentRayResult.material.search(/(material)[- ]?[a-z]{1,20}/gi) === 0) {
                        materialResult = materialEncyclopedia(currentRayResult.material.replace(/(material)[- ]?/gi, ""), returnIntersectionDistanceFromOrigin(currentRayResult, currentRayResult.intersection));
                    }
                    const currentWallPositionX = (myCanvas.width - currentLine * wallProportionsX) + wallProportionsX / 2;
                    currentFrameData.push({ xPos: currentWallPositionX - (wallProportionsX / 2), yPos: (canvasHeight / 2) - wallProportionsY, xWidth: wallProportionsX + 1, yWidth: wallProportionsY * 2, material: materialResult, proximity: currentRayResult.proximity });
                }
            }
        }
        currentAngle += angleDifference;
        currentLine--;
    }
    frameExecuter();
}
let consolelogprint = 0;
function frameExecuter() {
    currentFrameData.sort((a, b) => b.proximity - a.proximity);
    //i need to make one where the background is 1 color and then you imprint another on that line because them bricks are frame murderers
    currentFrameData.forEach(element => {
        element.material.draw(myCanvas, ctx, element, renderAccuracy);
    });
    currentFrameData = [];
}
function addWall() {
    if (/** @type {HTMLInputElement} */ (document.getElementById("material")).value === "") {
        /** @type {HTMLElement} */ (document.getElementById("selectMaterialText")).innerHTML = "SELECT A MATERIAL BELOW FIRST";
        return;
    }
    const xStart = +/** @type {HTMLInputElement} */(document.getElementById("xStart")).value;
    const yStart = +/** @type {HTMLInputElement} */(document.getElementById("yStart")).value;
    const xEnd = +/** @type {HTMLInputElement} */(document.getElementById("xEnd")).value;
    const yEnd = +/** @type {HTMLInputElement} */(document.getElementById("yEnd")).value;
    const isSeeThrough = /** @type {HTMLInputElement} */ (document.getElementById("isSeeThrough")).checked;
    makeLine(xStart, yStart, xEnd, yEnd, /** @type {HTMLInputElement} */(document.getElementById("material")).value, isSeeThrough, "wall");
}
function reset() {
    playerVector.magnitude = 0;
    canvasHeight = myCanvas.height;
    currentFrame = 1;
    playerpos = { x: 220, y: 210, rotation: 50 };
}

/**
 * @param {string} materialName
 * @param {number} wallDistanceFromOrigin
 */
function materialEncyclopedia(materialName, wallDistanceFromOrigin) {
    switch (materialName) {
        case "imagetestTexture1":
            const position = parseFloat(getDecimalPart(wallDistanceFromOrigin)) * testTexture1.width;
            return new TextureMaterial(testTexture1, position);
            case "imagebluby":
                const pos = parseFloat(getDecimalPart(wallDistanceFromOrigin)) * bluby.width;
                return new TextureMaterial(bluby, pos);
        case "imagechainlinkFence":
            const position2 = parseFloat(getDecimalPart(wallDistanceFromOrigin)) * chainlinkFence.width;
            return new TextureMaterial(chainlinkFence, position2);
        case "rainbow":
            const r = (Math.sin(wallDistanceFromOrigin + currentFrame / 5)) * 255;
            const g = (Math.sin(wallDistanceFromOrigin + 2 + currentFrame / 5)) * 255;
            const b = (Math.sin(wallDistanceFromOrigin + 4 + currentFrame / 5)) * 255;
            return new RGBMaterial(r, g, b);
        case "shiftingrainbow":
            const red = (Math.sin(wallDistanceFromOrigin + currentFrame / 5)) * 255;
            const green = (Math.sin(wallDistanceFromOrigin + 2 + currentFrame / 4)) * 255;
            const blue = (Math.sin(wallDistanceFromOrigin + 4 + currentFrame / 3)) * 255;
            return new RGBMaterial(red, green, blue);
        case "blackwhitestripes":
            return new SimpleMaterial(Math.floor(wallDistanceFromOrigin) % 2 < 1 ? "black" : "white");
        case "verticalblackwhitesinewave":
            /** @type {string} */
            const decimalPart = getDecimalPart(Math.sin(wallDistanceFromOrigin * 2) / 2 + 0.5);
            if (parseFloat(decimalPart) <= 0.01) {
                return new SimpleMaterial("black");
            }
            const waveHeight = decimalPart.slice(0, 4);
            return new MappedMaterial({ 0: "white", [waveHeight]: "black" });
        case "verticalbricks":
            const wallBlockPos = getDecimalPart(wallDistanceFromOrigin);
            const wallBlockDecisionNum = wallBlockPos.toString().slice(2, 4);
            const wallBlockDecisionNumber = parseFloat(wallBlockDecisionNum);
            if (wallBlockDecisionNumber % 25 <= 2) {
                return new SimpleMaterial("black");
            }
            if (wallBlockDecisionNumber < 25) {
                return new MappedMaterial({ 0: "orange", 0.09: "black", 0.10: "orange", 0.19: "black", 0.20: "orange", 0.29: "black", 0.30: "orange", 0.39: "black", 0.40: "orange", 0.49: "black", 0.50: "orange", 0.59: "black", 0.60: "orange", 0.69: "black", 0.70: "orange", 0.79: "black", 0.80: "orange", 0.89: "black", 0.90: "orange", 0.99: "black" });
            }
            if (wallBlockDecisionNumber > 50 && wallBlockDecisionNumber < 75) {
                return new MappedMaterial({ 0: "orange", 0.09: "black", 0.10: "orange", 0.19: "black", 0.20: "orange", 0.29: "black", 0.30: "orange", 0.39: "black", 0.40: "orange", 0.49: "black", 0.50: "orange", 0.59: "black", 0.60: "orange", 0.69: "black", 0.70: "orange", 0.79: "black", 0.80: "orange", 0.89: "black", 0.90: "orange", 0.99: "black" });
            }
            return new MappedMaterial({ 0: "orange", 0.04: "black", 0.05: "orange", 0.14: "black", 0.15: "orange", 0.24: "black", 0.25: "orange", 0.34: "black", 0.35: "orange", 0.44: "black", 0.45: "orange", 0.54: "black", 0.55: "orange", 0.64: "black", 0.65: "orange", 0.74: "black", 0.75: "orange", 0.84: "black", 0.85: "orange", 0.94: "black", 0.95: "orange" });
        case "glass":
            return new SimpleMaterial(parseFloat(getDecimalPart(wallDistanceFromOrigin)) > 0.94 ? "black" : "rgba(0,0,255,0.1)");
        case "verticalblacklineonwhite":
            return new MappedMaterial({ 0: "white", 0.33: "gray", 0.66: "black" });
        case "verticalseawave":
            const calc = (Math.sin(wallDistanceFromOrigin * 2 + currentFrame / 10) / 2 + 0.5 / (wallDistanceFromOrigin * 0.1));

            if (calc > 1) {
                return new RGBMaterial(0, 0, 0, 0);
            }
            const waveSize = getDecimalPart(calc).slice(0, 4);
            return new MappedMaterial({ 0: "rgba(0,0,0,0)", [parseFloat(waveSize) - 0.1]: "rgba(0,0,150,0.1)", [waveSize]: "rgba(0,0,200,0.4)" });
        case "verticalbluby": //WIP
            const singleBlock = (parseFloat(getDecimalPart(wallDistanceFromOrigin))) * 4;
            // if(singleBlock>0.95){return "black"}
            const fish = getDecimalPart((singleBlock - 0.1) * 2 * singleBlock + 0.1);
            return new MappedMaterial({ 0: "rgba(0,0,0,0)", [fish]: "lightblue", [1 - parseFloat(fish)]: "rgba(0,0,0,0)" });
        default:
            return new SimpleMaterial("black");
    }
}

function drawPlayerOnMap() {
    drawSquare(playerpos.x, playerpos.y, "magenta", 5, ctm);
}
function drawMap() {
    ctm.clearRect(0, 0, myMap.height, myMap.width);
    /* for (let i = 0; i <= (mapData.length) - 1; i++) {
         for (let j = 0; j <= (mapData[i].length) - 1; j++) {
             const element = mapData[i][j];
             drawSquare(element.x, element.y, element.material, 1, ctm)
         };
     }
     */
    vectorMapData.forEach(element => {
        drawLine(element.start, element.end, "brown", ctm);
    });
}
/**
 * @param {Vector} vector
 * @returns {PlayerVector}
 */
function returnAngleAndMagnitudeFromZero(vector) {
    //cartesian->polar m = √(x² + y²) and θ = arccos(x / m), painfull 
    const m = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    return { magnitude: m, angle: toDegrees(Math.atan2(vector.y, vector.x)) + 180 };
}
let animcount = 0;
function testAnim() {
    if (animcount !== 0) {
        const animationAdress = vectorMapData.findIndex(i => i.wallFunction == "animation1");
        if (animationAdress >= 0) {
            vectorMapData.splice(animationAdress, 1), mapData.splice(animationAdress, 1);
        }
        if (consolelogprint < 20) {
            console.log(animationAdress);
            consolelogprint++;
        }
    }

    makeLine(0, animcount, 500, animcount, "red", false, "animation1");
    animcount++;
    if (animcount === 300) {
        console.log(vectorMapData);
    }
}
/**
 * @param {Vector} startingPoint
 * @param {number} angle
 * @param {number} length
 * @returns {undefined | MapVector | MapVector[]}
 */
function rayCastingReturnWall(startingPoint, angle, length) {
    /** @type {MapVector[]} */
    const relevantVectorMapData = [];
    /** @type {Vector | undefined} */
    let a = undefined;
    vectorMapData.forEach(element => {
        const calculatedDisplacement = calculateVectorDisplacement(angle, length);
        if (!returnTrueIfPointsOnSameVectorSide(element, startingPoint, { x: startingPoint.x + calculatedDisplacement.x, y: startingPoint.y + calculatedDisplacement.y })) {
            a = findIntersection(element, new MapVector(startingPoint.x, startingPoint.y, startingPoint.x + calculatedDisplacement.x, startingPoint.y + calculatedDisplacement.y, "", false, ""));
            if (a !== undefined) {
                const distanceFromPoint = Math.sqrt((a.x - startingPoint.x) * (a.x - startingPoint.x) + (a.y - startingPoint.y) * (a.y - startingPoint.y));
                element.proximity = distanceFromPoint;
                relevantVectorMapData.push(element);
                element.intersection = a;

                relevantVectorMapData.push(element);
                if (controller[9].pressed) {
                    drawSquare(a.x, a.y, "white", 2, ctm);
                }
            }
        }
    });
    if (relevantVectorMapData == [] || relevantVectorMapData[0] === undefined) {
        return undefined;
    }
    relevantVectorMapData.sort((a, b) => a.proximity - b.proximity);
    if (relevantVectorMapData[2] === undefined || !relevantVectorMapData[0].isSeeThrough) {
        return relevantVectorMapData[0];
    }
    //   if(a!==0&&a!==undefined){relevantVectorMapData[0].intersection = a}
    relevantVectorMapData.forEach((element, index) => {
        if (relevantVectorMapData[index + 1] !== undefined/*undefined doesnt work, only [undefined], i love JS*/) {
            if (Math.abs(element.proximity - relevantVectorMapData[index + 1].proximity) < 1) {
                relevantVectorMapData.splice(index, 1);
            }
        }
        //if (consolelogprint < 20) {console.log(relevantVectorMapData); consolelogprint++}
    });

    /** @type {MapVector[]} */
    let returnMapData = [];
    for (let r = 0; r < relevantVectorMapData.length; r++) {
        returnMapData.push(relevantVectorMapData[r]);
        if (!relevantVectorMapData[r].isSeeThrough || relevantVectorMapData[r + 1] === undefined) {
            return (returnMapData);
        }
    }
}
/**
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {string} material
 * @param {boolean} isSeeThrough
 * @param {string} wallFunction
 * @returns {MapPixel[]}
 */
function returnLineFromVector(x0, y0, x1, y1, material, isSeeThrough, wallFunction) {
    vectorMapData.push(new MapVector(x0, y0, x1, y1, material, isSeeThrough, wallFunction));
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let dir = dx - dy;
    /** @type {MapPixel[]} */
    const data = [];

    while (true) {
        data.push(new MapPixel(x0, y0));

        if (x0 === x1 && y0 === y1) {
            break;
        }
        const a = 2 * dir;
        if (a > -dy) {
            dir -= dy;
            x0 += sx;
        }
        if (a < dx) {
            dir += dx;
            y0 += sy;
        }
    }

    return data;
}
/**
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 * @param {string} material
 * @param {boolean} isSeeThrough
 * @param {string} wallFunction
 */
function makeLine(startX, startY, endX, endY, material, isSeeThrough, wallFunction) {
    const drawData = returnLineFromVector(startX, startY, endX, endY, material, isSeeThrough, wallFunction);
    mapData.push(drawData);
    for (let i = 0; i < drawData.length; i++) {
        drawSquare(drawData[i].x, drawData[i].y, material, 1, ctm);
    }
}

function printData() {
    consolelogprint = 0;
}
let count = 0;
function gameClock() {
    //   if(animcount<500){testAnim()}
    moveMaker();
    movementExecuter();
    if (controller[9].pressed) {
        drawMap();
        drawPlayerOnMap();
    }
    else {
        ctm.clearRect(0, 0, myMap.height, myMap.width);
    }
    drawFrame();

    if (!gametickPause) {
        currentFrame++;
    }
    setTimeout(gameClock, gameSpeed / fps);
}


gameClock();
/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isObject(value) {
    //I ripped this function from https://bobbyhadz.com/blog/javascript-check-if-value-is-object, its why it doesnt look like my code
    return typeof (value) === "object" && value !== null;
}
//console.log(returnTrueIfPointsOnSameVectorSide(vectorMapData[0],{x:160,y:150},{x:370,y:380}))