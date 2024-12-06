import * as THREE from 'three';
import { OrbitControls  } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/Addons.js';
import { TextGeometry } from 'three/examples/jsm/Addons.js';
import { genMaze, exitCoords, losingCoordsTEMP, validSpawnPosition, wallBoundingBoxes, texture } from './maze.js';
import { OBJLoader } from 'three/examples/jsm/Addons.js';
import { MTLLoader } from 'three/examples/jsm/Addons.js';
import { entityList, addEntities, updateEntities, isPlayerInFov, updateEntityFov } from './entities.js';
export const floorTexture = new THREE.TextureLoader().load('textures/flesh.jpg');
floorTexture.wrapS = THREE.RepeatWrapping; //Horizontal wrapping
floorTexture.wrapT = THREE.RepeatWrapping; //Vertical wrapping
const floorRepeat = 4; //More/less reps
floorTexture.repeat.set(floorRepeat, floorRepeat);


let camera, menuCamera, gameOverCamera, current_camera, menuCameraTarget, cameraPosition, controls, renderer;

let quit = false;
let inMenu = true;
let staminaSection = document.querySelector('.stamina-section');
let staminaText = document.querySelector('.stamina-text');
let staminaContainer = document.querySelector('.stamina-bar');
let staminaAmt = document.querySelector('.stamina-amt');

//temp
let orbitCamera;

export let gameScene, player;
let menuScene, gameOverScene, currentScene, hand, map;
let entity1, entity1_fov, entity1_detected;    // todo steve: temporary until I formalize what I want to do with these


let textGeoA, textMeshA, textGeoB, textMeshB, textGeoC, textMeshC;

let spawnPoint = [];
let entitySpawn = [];

//temp raycaster 
let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2();

let group, textMesh, textMesh2, textMesh3, textMesh4, textMesh5, textMesh6, textMesh7, textMesh8, textMesh9, textGeo, textGeo2, textGeo3, textGeo4, textGeo5, textGeo6, textGeo7, textGeo8, textGeo9, font;
let menuItems = [];
let inputs = {};
let keepMoving = true;//The walls and floor should keep moving unless k was pressed.

//mapsize
const MAX_MAP_SIZE = 30;    // originally 30
const MIN_MAP_SIZE = 25;    // originally 25
const clock = new THREE.Clock();//To animate texture
const ambientLight = new THREE.AmbientLight(0x505050);

let win = false;
let vector;

init();

function init() {
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 25, 0);
    
    menuCamera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 3000);
    menuCamera.layers.enable(1);
    menuCamera.position.set(0, -270, 400);

    vector = camera.position.clone();
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const backgroundMusic = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/audio/loop_audio.mp3', (buffer) => {
        backgroundMusic.setBuffer(buffer);
        backgroundMusic.setLoop(true);
        backgroundMusic.setVolume(0.2);//Adjust as necessary
        //backgroundMusic.play();
    });
    //Some broswers block autoplay...
    const startAudio = () => {
        backgroundMusic.play();
        window.removeEventListener('click', startAudio);
        window.removeEventListener('keydown', startAudio);
    };

    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    //renderer.setAnimationLoop( animate );
    document.body.appendChild(renderer.domElement);

    //temp
    orbitCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0,0,0);
    //controls.enableKeys = false;

    current_camera = menuCamera;

    gameScene = new THREE.Scene();
    gameScene.background = new THREE.Color(0x000000);
    gameScene.fog = new THREE.Fog(0x000000, 5, 13);

    menuScene = new THREE.Scene();
    menuScene.background = new THREE.Color(0x000000);

    //lighting

    const pointLight = new THREE.PointLight(0xffffff, 100, 100);
    pointLight.position.set(5, 15, 5);
    pointLight.castShadow = true; 
    pointLight.shadow.mapSize.width = 1024; 
    pointLight.shadow.mapSize.height = 1024;

    gameScene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0.5, .0, 1.0).normalize();
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; 
    directionalLight.shadow.mapSize.height = 2048;
    gameScene.add(directionalLight);

    //const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
    ambientLight.intensity = 0.25;
    gameScene.add(ambientLight);
    //Make the room dark
    //ambientLight.intensity = 10;  // originally 0.01, change after demo or after better fine-tuning
    //Dim directional light to cast minimal ambient lighting
    directionalLight.intensity = 0.03;
    //Reduce point light's intensity
    pointLight.intensity = 0.05;

    //torchLight.intensity = 1; Moved to makeGameScene
    currentScene = menuScene;

    //spawnPoint = setSpawn();
    makeGameScene();
    makeText();

}

function makeGameScene() {
    loadMap(MAX_MAP_SIZE, MIN_MAP_SIZE);
    //Player
    spawnPoint = setSpawn();
    const playerGeometry = new THREE.SphereGeometry(0.5, 14, 14);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x000fff });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(spawnPoint.x, 0, spawnPoint.z);
    console.log(spawnPoint.x, 0, spawnPoint.z);
    gameScene.add(player);


    //Flashlight by Robert Ramsay [CC-BY] via Poly Pizza
    //Can change later if different model preferred 
    const mtlLoader = new MTLLoader();
    mtlLoader.load('./assets/Flashlight/FlashlightAndMat.mtl', (mat) => {
        mat.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(mat);
        objLoader.load('./assets/Flashlight/FlashlightAndMat.obj', (flashlight) => {
            flashlight.scale.set(0.031, 0.031, 0.031);
            flashlight.position.set(0.3, -0.2, -0.5);
            camera.add(flashlight);
            // Create torch
            const torchLight = new THREE.SpotLight(0xff0000, 1, 50, Math.PI / 4, 0.1, 1); 
            //Change the color to dark red (0xff0000) and reduce the intensity to 0.5 for a dimmer effect
            torchLight.position.set(0, 0, 0.5); // Position it slightly in front of the hand
            torchLight.target.position.set(0, 0, -1);
            flashlight.add(torchLight);
            flashlight.add(torchLight.target);
            // Optionally adjust intensity further for desired dimness
            torchLight.intensity = 0.35; // Make it even dimmer
            torchLight.castShadow = true;
            torchLight.shadow.mapSize.width = 1024; 
            torchLight.shadow.mapSize.height = 1024;
            torchLight.shadow.camera.near = 0.5;
            torchLight.shadow.camera.far = 30;
            torchLight.shadow.camera.left = -20;
            torchLight.shadow.camera.right = 20;
        });
    });
    /*
    //Player hand
    const handGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
    //TBD : Work on design for hand material
    const handMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    hand = new THREE.Mesh(handGeometry, handMaterial);
    hand.position.set(0.3, -0.2, -0.5); // Relative to the camera
    camera.add(hand); // Fix to player
    
    
    // Create torch
    const torchLight = new THREE.SpotLight(0xff0000, 1, 50, Math.PI / 4, 0.1, 1); 
    //Change the color to dark red (0xff0000) and reduce the intensity to 0.5 for a dimmer effect
    torchLight.position.set(0, 0, 0.5); // Position it slightly in front of the hand
    torchLight.target.position.set(0, 0, -1);
    hand.add(torchLight);
    hand.add(torchLight.target);
    // Optionally adjust intensity further for desired dimness
    torchLight.intensity = 0.35; // Make it even dimmer
    */
    gameScene.add(camera);

    //Create test enemy
    let entity1_spawn = setSpawn();  // todo steve: expand upon entity spawnpoints and patrolling routes later
    const entity1_Geometry = new THREE.OctahedronGeometry(1);
    const entity_Material = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
    entity1 = new THREE.Mesh(entity1_Geometry, entity_Material);
    entity1.position.set(entity1_spawn.x, 1, entity1_spawn.z);
    entity1.castShadow = true;
    entity1.receiveShadow = true;
    //gameScene.add(entity1);
    const entity1_fovGeometry = new THREE.ConeGeometry(2, 8, 8, 1);   // base radius, height, radius segments, height segments
    const entity1_fovMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFF80, 
        transparent: true, 
        opacity: 0.5,
        side: THREE.DoubleSide,
    });
    entity1_fov = new THREE.Mesh(entity1_fovGeometry, entity1_fovMaterial);
    entity1_fov.rotation.x = -Math.PI / 2; 
    entity1_fov.position.set(0, 0, 4);
    entity1.add(entity1_fov);

    // Create and place entities
    addEntities();

    // Room
    const floorGeometry = new THREE.PlaneGeometry(map.length * 2 + 1, map.length * 2 + 1);
    const floorMaterial = new THREE.MeshStandardMaterial({map : floorTexture});
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);

    floor.position.set(0, 0, 0);
    floor.rotation.x = -Math.PI / 2;
    
    gameScene.add(floor);
} 

function makeText() {
    //lighting
    const menuDirLight = new THREE.DirectionalLight(0xffffff, 1);
    menuDirLight.position.set(0,0,1).normalize();
    menuScene.add(menuDirLight);

    const menuPtLight = new THREE.PointLight(0xffffff, 1, 0, 0);
    menuPtLight.color.setHSL(0, 0, 1);
    menuPtLight.position.set(0, 100, 1400);
    menuScene.add(menuPtLight);

    group = new THREE.Group();
    group.position.y = 50;
    menuScene.add(group);

    const loader = new FontLoader();
    loader.load('fonts/Pixelify.json', (response) => {
        font = response;
        createMenuText();
    });
    
}
let modelEntity;
function createMenuText() {
    if (!font) return;
    textGeo = new TextGeometry('PAUSED ||', {
        font: font,
        size: 30,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo.computeBoundingBox();
    const centerOffset = -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);
    textMesh = new THREE.Mesh(textGeo, new THREE.MeshPhongMaterial({ color: 0xF5F5F5, flatShading: true }));
    textMesh.position.set(centerOffset, 160, 0);
    textMesh.name = 'PAUSE';

    textGeoC = new TextGeometry (('QUIT'), {
        font: font,
        size: 20,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeoC.computeBoundingBox();
    const centerOffsetC = -0.5 * (textGeoC.boundingBox.max.x - textGeoC.boundingBox.min.x);
    textMeshC = new THREE.Mesh(textGeoC, new THREE.MeshPhongMaterial({ color: 0xff0000, flatShading: true }));
    textMeshC.position.set(centerOffsetC, 20, 0);
    textMeshC.name = 'QUIT'

    textGeoA = new TextGeometry (('NEW MAP'), {
        font: font,
        size: 10,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeoA.computeBoundingBox();
    const centerOffsetA = -0.5 * (textGeoA.boundingBox.max.x - textGeoA.boundingBox.min.x);
    textMeshA = new THREE.Mesh(textGeoA, new THREE.MeshPhongMaterial({ color: 0xF5F5F5, flatShading: true }));
    textMeshA.position.set(centerOffsetA, 55, 0);
    textMeshA.name = 'NEWMAP'

    textGeoB = new TextGeometry (('RESTART'), {
        font: font,
        size: 10,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeoB.computeBoundingBox();
    const centerOffsetB = -0.5 * (textGeoB.boundingBox.max.x - textGeoB.boundingBox.min.x);
    textMeshB = new THREE.Mesh(textGeoB, new THREE.MeshPhongMaterial({ color: 0xF5F5F5, flatShading: true }));
    textMeshB.position.set(centerOffsetB, 85, 0);
    textMeshB.name = 'RESTART'

    textGeo2 = new TextGeometry('YOU WIN', {
        font: font,
        size: 30,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo2.computeBoundingBox();
    const centerOffset2 = -0.5 * (textGeo2.boundingBox.max.x - textGeo2.boundingBox.min.x);
    textMesh2 = new THREE.Mesh(textGeo2, new THREE.MeshPhongMaterial({ color: 0xF5F5F5, flatShading: true }));
    textMesh2.position.set(centerOffset2, 400, 0);

    textGeo3 = new TextGeometry (('GAME OVER'), {
        font: font,
        size: 30,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo3.computeBoundingBox();
    const centerOffset3 = -0.5 * (textGeo3.boundingBox.max.x - textGeo3.boundingBox.min.x);
    textMesh3 = new THREE.Mesh(textGeo3, new THREE.MeshPhongMaterial({ color: 0xff0000, flatShading: true }));
    textMesh3.position.set(centerOffset3, -40, 0);

    textGeo4 = new TextGeometry (('QUIT'), {
        font: font,
        size: 10,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo4.computeBoundingBox();
    const centerOffset4 = -0.5 * (textGeo4.boundingBox.max.x - textGeo4.boundingBox.min.x);
    textMesh4 = new THREE.Mesh(textGeo4, new THREE.MeshPhongMaterial({ color: 0xff0000, flatShading: true }));
    textMesh4.position.set(centerOffset4, 250, 0);
    textMesh4.name = 'QUIT'

    textGeo5 = new TextGeometry (('NEW MAP'), {
        font: font,
        size: 15,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo5.computeBoundingBox();
    const centerOffset5 = -0.5 * (textGeo5.boundingBox.max.x - textGeo5.boundingBox.min.x);
    textMesh5 = new THREE.Mesh(textGeo5, new THREE.MeshPhongMaterial({ color: 0xF5F5F5, flatShading: true }));
    textMesh5.position.set(centerOffset5, 285, 0);
    textMesh5.name = 'NEWMAP'

    textGeo6 = new TextGeometry (('QUIT'), {
        font: font,
        size: 20,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo6.computeBoundingBox();
    const centerOffset6 = -0.5 * (textGeo6.boundingBox.max.x - textGeo6.boundingBox.min.x);
    textMesh6 = new THREE.Mesh(textGeo6, new THREE.MeshPhongMaterial({ color: 0xff0000, flatShading: true }));
    textMesh6.position.set(centerOffset6, -190, 0);
    textMesh6.name = 'QUIT'

    textGeo7 = new TextGeometry (('NEW MAP'), {
        font: font,
        size: 10,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo7.computeBoundingBox();
    const centerOffset7 = -0.5 * (textGeo7.boundingBox.max.x - textGeo7.boundingBox.min.x);
    textMesh7 = new THREE.Mesh(textGeo7, new THREE.MeshPhongMaterial({ color: 0xF5F5F5, flatShading: true }));
    textMesh7.position.set(centerOffset7, -155, 0);
    textMesh7.name = 'NEWMAP';

    textGeo8 = new TextGeometry (('SHADOWS IN THE \n     LABYRINTH'), {
        font: font,
        size: 20,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo8.computeBoundingBox();
    const centerOffset8 = -0.5 * (textGeo8.boundingBox.max.x - textGeo8.boundingBox.min.x);
    textMesh8 = new THREE.Mesh(textGeo8, new THREE.MeshPhongMaterial({ color: 0xff0000, flatShading: true }));
    textMesh8.position.set(centerOffset8, -245, 0);
    textMesh8.name = 'TITLE';

    textGeo9 = new TextGeometry (('START'), {
        font: font,
        size: 20,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo9.computeBoundingBox();
    const centerOffset9 = -0.5 * (textGeo9.boundingBox.max.x - textGeo9.boundingBox.min.x);
    textMesh9 = new THREE.Mesh(textGeo9, new THREE.MeshPhongMaterial({ color: 0xF5F5F5, flatShading: true }));
    textMesh9.position.set(centerOffset9, -410, 0);
    textMesh9.name = 'START';

    modelEntity = entity1.clone();
    modelEntity.position.set(0, -270, 370);
    menuScene.add(modelEntity);

    group.add(textMesh);
    group.add(textMesh2);
    group.add(textMesh3);
    group.add(textMesh4);
    group.add(textMesh5);
    group.add(textMesh6);
    group.add(textMesh7);
    group.add(textMesh8);
    group.add(textMesh9);
    group.add(textMeshA);
    group.add(textMeshB);
    group.add(textMeshC);

    textMesh.layers.set(1);
    textMesh2.layers.set(1);
    textMesh3.layers.set(1);
    textMesh4.layers.set(1);
    textMesh5.layers.set(1);
    textMesh6.layers.set(1);
    textMesh7.layers.set(1);
    textMesh8.layers.set(1);
    textMesh9.layers.set(1);
    textMeshA.layers.set(1);
    textMeshB.layers.set(1);
    textMeshC.layers.set(1);

    menuItems.push(textMesh);
    menuItems.push(textMesh4);
    menuItems.push(textMesh5);
    menuItems.push(textMesh6);
    menuItems.push(textMesh7);
    menuItems.push(textMesh9);
    menuItems.push(textMeshA);
    menuItems.push(textMeshB);
    menuItems.push(textMeshC);
}

function loadMap(max, min) {
    gameScene.children.filter(wall => wall.userData?.type === 'wall') 
        .forEach(wall => gameScene.remove(wall));
    validSpawnPosition.length = 0;
    let mapSize = Math.floor(Math.random() * (max - min + 1) + min); 
    if (mapSize % 2 === 0) {
        mapSize -= 1;
    }
    map = Array.from({ length: mapSize }, () => new Array(mapSize).fill(1))
    genMaze(map, gameScene);
}

function setSpawn() {
    //if (!player) {
    //    return { x: 0, y: 0, z: 0 }; 
    //} Removed this as it was causing the player to be stuck when the game started
    validSpawnPosition.sort(() => Math.random() - 0.5);
    let x = validSpawnPosition.at(0)[0];
    let z = validSpawnPosition.at(0)[1];
    return { x: x, y: 0, z: z };
}

export function getTwoValidMazeSpaces() {   // Variation of setSpawn function but for two points
    validSpawnPosition.sort(() => Math.random() - 0.5);
    let point1 = validSpawnPosition.at(0);
    let point2 = validSpawnPosition.at(1);
    return [
        { x: point1[0], y: 1, z: point1[1] },
        { x: point2[0], y: 1, z: point2[1] }
    ];
}

let bob = 0;

function updateCameraPosition() {
    // Camera offset from player; can adjust if necessary
    const cameraOffset = new THREE.Vector3(0, 1.5, 0);
    // Apply the player's rotation
    cameraOffset.applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
    camera.position.copy(player.position.clone().add(cameraOffset));
    const lookAtOffset = new THREE.Vector3(0, 1.5, 1); //Where do we look from
    lookAtOffset.applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
    camera.lookAt(player.position.clone().add(lookAtOffset));//Look from offset
    let oscillation = 15;
    let range = 0.05;
    if (moving) {
        bob += 0.003;
        let bobbing = Math.sin(bob * oscillation) * range;
        camera.position.y = player.position.y + 1.5 + bobbing;
    } else {
        camera.position.y = player.position.y + 1.5;
        bob = 0;
    }
}

function isPositionValid(x, z) {
    const playerRadius = 0.20; // Increase/Decrease this value to fix too many/too few collisions
    const playerPosition = new THREE.Vector3(x, player.position.y, z);

    const playerSphere = new THREE.Sphere(playerPosition, playerRadius);

    for (let i = 0; i < wallBoundingBoxes.length; i++) {
        const wallBox = wallBoundingBoxes[i];
        if (wallBox.intersectsSphere(playerSphere)) {//Use this built in func. to simplify check
            // Collision detected
            return false;
        }
    }
    return true;
}


let stamina = 100;

let shift = false;
let moving = false;
window.addEventListener('keydown', function(event) {
    console.log('Key pressed:', event.key); // For debugging
    if (event.shiftKey) shift = true;
    inputs[event.key] = true;
    switch (event.key) {
        case 'k':
            gameScene.fog = new THREE.Fog(0x000000, 500, 1300);
            ambientLight.intensity = 10;
            keepMoving = false;
            //Currently in order to view the map after pressing k we will increase the ambient light and stop the walls from moving
            //This requires the player to press "Escape" to return to normal setting. Not a great solution, should be fixed.
            current_camera = orbitCamera;
            current_camera.position.set(0, 63, 0);
            current_camera.lookAt(0, 0, 0);
            controls.object = current_camera;
            break;
        case 'Escape':
            if (inMenu) {
                break;
            } 
            keepMoving = true;//Resetting;
            player.y = 14;
            currentScene = (currentScene === gameScene) ? menuScene : gameScene;
            menuCamera.layers.enable(1);
            if (currentScene === gameScene) {
                current_camera = camera;
                staminaSection.id = 'stamina-show';
                staminaText.id = 'stamina-text-show';
                staminaContainer.id = 'stamina-container'
                staminaAmt.id = 'stamina';
            } else {
                menuCamera.position.set(0, 145, 400);
                current_camera = menuCamera;
                staminaSection.id = '';
                staminaText.id = '';
                staminaContainer.id = '';
                staminaAmt.id = '';
            }
            break;
        }
});

window.addEventListener('keyup', (event) => {
    inputs[event.key] = false;
    shift = false;
    moving = false;
});

let isRunning = false;
function playerMovement(key) {
    moving = true;
    const walkSpeed = 0.05;
    if (shift && stamina > 0 && !inMenu) {
        isRunning = true;
        staminaSection.id = 'stamina-show';
        staminaText.id = 'stamina-text-show';
        staminaContainer.id = 'stamina-container'
        staminaAmt.id = 'stamina';
        stamina = stamina < 0 ? 0 : stamina - 0.05;
        staminaAmt.style.width = `${(stamina/100) * 100}%`;
    } else {
        isRunning = false;
        stamina = stamina > 100 ? 100 : stamina + 0.05;
        staminaAmt.style.width = `${(stamina/100) * 100}%`;
    }
    let speed = walkSpeed;
    if (isRunning && stamina > 0) {
        speed += 0.05;
    }
    //Compute the delta of players distance traversed 
    let deltaX = 0;
    let deltaZ = 0;
    switch (key) {
        case 'w': // Forward
        case 'ArrowUp':
            deltaX += Math.sin(player.rotation.y) * speed;
            deltaZ += Math.cos(player.rotation.y) * speed;
            break;
        case 's': // Backward
        case 'ArrowDown':
            deltaX -= Math.sin(player.rotation.y) * speed;
            deltaZ -= Math.cos(player.rotation.y) * speed;
            break;
        case 'a': // Left
        case 'ArrowLeft':
            deltaX += Math.cos(player.rotation.y) * speed;
            deltaZ -= Math.sin(player.rotation.y) * speed;
            break;
        case 'd': // Right
        case 'ArrowRight':
            deltaX -= Math.cos(player.rotation.y) * speed;
            deltaZ += Math.sin(player.rotation.y) * speed;
            break;
    }
    // Movement vector
   let movementVector = new THREE.Vector3(deltaX, 0, deltaZ);

   // Break your movement into 1000 steps and check if a collision occured; needed to stop the player if moving too fast
   let steps = 1000;
   let stepVector = movementVector.clone().divideScalar(steps);

   // Move incrementally
   for (let i = 0; i < steps; i++) {
       let newX = player.position.x + stepVector.x;
       let newZ = player.position.z + stepVector.z;

       if (isPositionValid(newX, newZ)) {
           player.position.x = newX;
           player.position.z = newZ;
       } else {
           // Collision detected, stop movement
           break;
       }
   }
    // Update camera and other necessary components
    updateCameraPosition();
}

//Handle rotation with left click
let isLeftClickHeld = false;
let previousMouseX = null;
let mesh = null;
// Deact Orbitcontrols when left clicked
window.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
        isLeftClickHeld = true;
        previousMouseX = event.clientX;
        controls.enabled = false; // Disable
    }
    //Set x and y coordinates of the mouse
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    //set the position of the ray
    raycaster.setFromCamera(pointer, current_camera);
    if (currentScene === menuScene) {
        raycaster.layers.set(1); 
    } else {
        raycaster.layers.set(0); 
    }
    menuCamera.layers.enable(1);
    let intersection = raycaster.intersectObjects(menuItems);
    if (intersection.length > 0) {
        mesh = intersection[0].object;
    } else {
        mesh = null;
    }
});
window.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
        isLeftClickHeld = false;
        previousMouseX = null;
        controls.enabled = true; // Re-enable
    }
});
window.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === renderer.domElement) {
        /*
        const deltaX = event.clientX - previousMouseX;
        const rotationSpeed = 0.005;
        // Rotate the player around its y-axis (YAW Rotation; )
        player.rotation.y -= deltaX * rotationSpeed;
        previousMouseX = event.clientX;
        */
        const rotationSpeed = 0.005;
        // Rotate the player around its y-axis (YAW Rotation; )
        player.rotation.y -= event.movementX * rotationSpeed;
        //previousMouseX = event.clientX;
    }
});
window.addEventListener('click', (event) => {
    //Set x and y coordinates of the mouse
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    //set the position of the ray
    raycaster.setFromCamera(pointer, current_camera);
    if (currentScene === menuScene) {
        raycaster.layers.set(1); 
    } else {
        raycaster.layers.set(0); 
    }
    menuCamera.layers.enable(1);
    let intersection = raycaster.intersectObjects(menuItems);
    if (intersection.length > 0 && mesh === intersection[0].object){
        switch (intersection[0].object.name) {
            case 'PAUSE':
                current_camera = camera;
                currentScene = gameScene;
                break;
            case 'NEWMAP':
                loadMap(MAX_MAP_SIZE, MIN_MAP_SIZE);
                //rand spawn
                spawnPoint = setSpawn();
                player.position.set(spawnPoint.x, 0, spawnPoint.z);
                entitySpawn = setSpawn();
                entity1.position.set(entitySpawn.x, 1, entitySpawn.z);
                resetGame();
                //reset game logic function
                break;
            case 'RETRY':
            case 'RESTART':
                player.position.set(spawnPoint.x, 0, spawnPoint.z);
                resetGame();
                //same map
                //reset entity logic fn
                break;
            case 'START':
                if (quit) {
                    loadMap(MAX_MAP_SIZE, MIN_MAP_SIZE);
                    spawnPoint = setSpawn();
                    player.position.set(spawnPoint.x, 0, spawnPoint.z);
                    entitySpawn = setSpawn();
                    entity1.position.set(entitySpawn.x, 1, entitySpawn.z);
                    renderer.domElement.requestPointerLock();
                }
                resetGame();
                quit = false;
                break;
            case 'QUIT':
                quit = true;
                inMenu = true;
                current_camera = menuCamera;
                currentScene = menuScene;
                menuCamera.position.set(0, -270, 400);
                break;
        }
        intersection[0].object = [];
    }
    if (!quit) renderer.domElement.requestPointerLock();
});

function resetGame() {
    walkingAudio.setVolume(1);
    inMenu = false;
    current_camera = camera;
    currentScene = gameScene;
    stamina = 100;
    staminaSection.id = 'stamina-show';
    staminaText.id = 'stamina-text-show';
    staminaContainer.id = 'stamina-container'
    staminaAmt.id = 'stamina';
}

console.log('losing coords' + losingCoordsTEMP.x + ',' + losingCoordsTEMP.z);
console.log(exitCoords.x + ',' + exitCoords.z);

function checkWin() {
    const vector = camera.getWorldPosition(new THREE.Vector3());
    let distanceFromExit = Math.sqrt(Math.pow(exitCoords.x - vector.x, 2) + Math.pow(exitCoords.z - vector.z, 2));
    if (distanceFromExit < 0.7) {
        currentScene = menuScene;
        current_camera = menuCamera;
        menuCamera.position.set(0, 385, 400);
        player.position.set(player.position.x - 5, 0, player.position.z - 5);
        inMenu = true;
        staminaSection.id = '';
        staminaText.id = '';
        staminaContainer.id = '';
        staminaAmt.id = '';
        document.exitPointerLock();
        moving = false;
        walkingAudio.setVolume(0);
    } 
    //need to track position of entity
    //Losing condition: Entity coords === player coords
    let distanceFromEntity = Math.sqrt(Math.pow(entity1.position.x - vector.x, 2) + Math.pow(entity1.position.z - vector.z, 2));
    if (distanceFromEntity < 0.5) {
        /* For if we want a jumpscare, otherwise commented out for now
        setTimeout(() => {
            currentScene = menuScene;
            current_camera = menuCamera;
            menuCamera.position.set(0, -55, 400);
            player.position.set(player.position.x - 5, 0, player.position.z - 5);
            inMenu = true;
            staminaSection.id = '';
            staminaText.id = '';
            staminaContainer.id = '';
            staminaAmt.id = '';
        }, 3000);
        */
        currentScene = menuScene;
        current_camera = menuCamera;
        menuCamera.position.set(0, -55, 400);
        player.position.set(player.position.x - 5, 0, player.position.z - 5);
        inMenu = true;
        staminaSection.id = '';
        staminaText.id = '';
        staminaContainer.id = '';
        staminaAmt.id = '';
        document.exitPointerLock();
        walkingAudio.setVolume(0);
    }
}

const l = new THREE.AudioListener();
camera.add(l);
const walkingAudio = new THREE.Audio(l);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('/audio/concrete-footsteps.mp3', (buffer) => {
    walkingAudio.setBuffer(buffer);
    walkingAudio.setLoop(true);
    walkingAudio.setVolume(0);
});
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    checkWin();
    updateEntityFov();
    // Move camera to follow the player's position
    // Animate the texture for a tremor effect
    const elapsedTime = clock.getElapsedTime();
    updateEntities(elapsedTime);
    // Animate floor/wall

    if (modelEntity) {
        modelEntity.rotation.y += 0.01;
    }

    if(keepMoving)
    {
        texture.offset.x = Math.sin(elapsedTime * 0.5) * 2;
        texture.offset.y = Math.cos(elapsedTime * 0.5) * 2;
        floorTexture.offset.x = -Math.sin(elapsedTime * 0.5) * 2;
        floorTexture.offset.z = Math.sin(elapsedTime * 0.5) * 2;
    }

    if (stamina >= 100) {
        staminaSection.id = '';
        staminaText.id = '';
        staminaContainer.id = '';
        staminaAmt.id = '';
    }

    Object.keys(inputs).forEach(ip => {
        if (inputs[ip]) 
            playerMovement(ip);
    });

    moving = ['w', 'a', 's', 'd'].some(key => inputs[key]);

    if (!isRunning && !(['w'].some(key => inputs[key]))) {
        stamina = stamina > 100 ? 100 : stamina + 0.05;
        staminaAmt.style.width = `${(stamina/100) * 100}%`;
    }
    if (moving && shift && stamina > 0) {
        if (!walkingAudio.isPlaying) {
            walkingAudio.play();
        } 
        walkingAudio.setPlaybackRate(1.3);
    } else if (moving) {
        if (!walkingAudio.isPlaying) {
            walkingAudio.play();
        }
        walkingAudio.setPlaybackRate(1.0);
    } else {
        if (walkingAudio.isPlaying) {
            walkingAudio.stop();
        }
        walkingAudio.setPlaybackRate(1.0);
    }
    updateEntities(elapsedTime);
    updateCameraPosition();
    renderer.render(currentScene, current_camera);
}
animate();
