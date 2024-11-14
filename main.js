import * as THREE from 'three';
import { OrbitControls  } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/Addons.js';
import { TextGeometry } from 'three/examples/jsm/Addons.js';
import { genMaze, exitCoords, losingCoordsTEMP  } from './maze';


let camera, menuCamera, gameOverCamera, current_camera, menuCameraTarget, cameraPosition, controls, renderer;

//temp
let orbitCamera;

let gameScene, menuScene, gameOverScene, currentScene, player, hand, map;

//rmv txt meshes
let group, textMesh, textMesh2, textMesh3, textMesh4, textMesh5, textMesh6, textMesh7, textGeo, textGeo2, textGeo3, textGeo4, textGeo5, textGeo6, textGeo7, font;
let group2;
let materialsTextGeo = [
    new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ),
    new THREE.MeshPhongMaterial({ color: 0xffffff })
];

let win = false;
let vector;

init();

function init() {
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 25, 0);

    menuCamera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 3000);
    menuCamera.position.set(0, 300, 700);

    vector = camera.position.clone();

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    //renderer.setAnimationLoop( animate );
    document.body.appendChild(renderer.domElement);

    //temp
    orbitCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0,0,0);
    //controls.enableKeys = false;

    current_camera = camera;

    gameScene = new THREE.Scene();
    gameScene.background = new THREE.Color(0x000000);
    gameScene.fog = new THREE.Fog(0xffffff, 200, 1000);

    menuScene = new THREE.Scene();
    menuScene.background = new THREE.Color(0x000000);

    //lighting

    const pointLight = new THREE.PointLight(0xffffff, 100, 100);
    pointLight.position.set(5, 15, 5); // Position the light
    gameScene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0.5, .0, 1.0).normalize();
    gameScene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
    ambientLight.intensity = 0.01;
    gameScene.add(ambientLight);
    //Make the room dark
    ambientLight.intensity = 0.01;
    //Dim directional light to cast minimal ambient lighting
    directionalLight.intensity = 0.02;
    //Reduce point light's intensity
    pointLight.intensity = 0.3;

    //torchLight.intensity = 1; Moved to makeGameScene
    currentScene = gameScene;

    makeGameScene();
    makeText();

}

function makeGameScene() {
    let mapSize = Math.floor(Math.random() * (34 - 15 + 1) + 15);
    if (mapSize % 2 == 0) {
        if (mapSize == 34) {
            mapSize -= 1;
        } else {
            mapSize += 1;
        }
    }  
    //Temp small map for testing
    map = Array.from({ length: 5 }, () => new Array(5).fill(1))
    genMaze(map, gameScene);

    //Player
    const playerGeometry = new THREE.SphereGeometry(0.5, 14, 14);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x000fff });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    gameScene.add(player);

    //Player hand
    const handGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
    const handMaterial = new THREE.MeshStandardMaterial({ color: 0x804fff });
    hand = new THREE.Mesh(handGeometry, handMaterial);
    hand.position.set(0.3, -0.2, -0.5); // Relative to the camera
    camera.add(hand); // Fix to player
    gameScene.add(camera);

    //Create torch
    const torchLight = new THREE.SpotLight(0xffffff, 1, 10, Math.PI / 4, 0.1, 1); 
    torchLight.position.set(0, 0, 0.5); //Position it slightly in front of the hand
    torchLight.target.position.set(0, 0, -1);
    hand.add(torchLight);
    hand.add(torchLight.target);
    torchLight.intensity = 1;

    const floorGeometry = new THREE.PlaneGeometry(map.length * 2, map.length * 2);
    const floorMaterial = new THREE.MeshPhongMaterial({color: 0x555555});
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)

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
    menuPtLight.color.setHSL(Math.random(), 1, 0.5);
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
    textMesh = new THREE.Mesh(textGeo, materialsTextGeo);
    textMesh.position.set(centerOffset, 160, 0);

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
    textMesh2 = new THREE.Mesh(textGeo2, materialsTextGeo);
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
    textMesh3 = new THREE.Mesh(textGeo3, materialsTextGeo);
    textMesh3.position.set(centerOffset3, -40, 0);

    textGeo4 = new TextGeometry (('RESTART'), {
        font: font,
        size: 20,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo4.computeBoundingBox();
    const centerOffset4 = -0.5 * (textGeo4.boundingBox.max.x - textGeo4.boundingBox.min.x);
    textMesh4 = new THREE.Mesh(textGeo4, materialsTextGeo);
    textMesh4.position.set(centerOffset4, 250, 0);

    textGeo5 = new TextGeometry (('NEW MAP'), {
        font: font,
        size: 20,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo5.computeBoundingBox();
    const centerOffset5 = -0.5 * (textGeo5.boundingBox.max.x - textGeo5.boundingBox.min.x);
    textMesh5 = new THREE.Mesh(textGeo5, materialsTextGeo);
    textMesh5.position.set(centerOffset5, 285, 0);

    textGeo6 = new TextGeometry (('RETRY MAP'), {
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
    textMesh6 = new THREE.Mesh(textGeo6, materialsTextGeo);
    textMesh6.position.set(centerOffset6, -190, 0);

    textGeo7 = new TextGeometry (('NEW MAP'), {
        font: font,
        size: 20,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });
    textGeo7.computeBoundingBox();
    const centerOffset7 = -0.5 * (textGeo7.boundingBox.max.x - textGeo7.boundingBox.min.x);
    textMesh7 = new THREE.Mesh(textGeo7, materialsTextGeo);
    textMesh7.position.set(centerOffset7, -155, 0);

    group.add(textMesh);
    group.add(textMesh2);
    group.add(textMesh3);
    group.add(textMesh4);
    group.add(textMesh5);
    group.add(textMesh6);
    group.add(textMesh7);
}


function updateCameraPosition() {
    // Camera offset from player; can adjust if necessary
    const cameraOffset = new THREE.Vector3(0, 1.5, 0);
    // Apply the player's rotation
    cameraOffset.applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
    camera.position.copy(player.position.clone().add(cameraOffset));
    const lookAtOffset = new THREE.Vector3(0, 1.5, 1); //Where do we look from
    lookAtOffset.applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
    camera.lookAt(player.position.clone().add(lookAtOffset));//Look from offset
}

window.addEventListener('keydown', function(event) {
    console.log('Key pressed:', event.key); // For debugging
    const speed = 0.5;
    let newX = player.position.x;
    let newZ = player.position.z;

    switch (event.key) {
        case 'w': //Forward
        case 'ArrowUp':
            newX += Math.sin(player.rotation.y) * speed;
            newZ += Math.cos(player.rotation.y) * speed;
            break;
        case 's': //Down
        case 'ArrowDown' :
            newX -= Math.sin(player.rotation.y) * speed;
            newZ -= Math.cos(player.rotation.y) * speed;
            break;
        case 'a': //Left
        case 'ArrowLeft' :
            newX += Math.cos(player.rotation.y) * speed;
            newZ -= Math.sin(player.rotation.y) * speed;
            break;
        case 'd': //Right
        case 'ArrowRight' :
            newX -= Math.cos(player.rotation.y) * speed;
            newZ += Math.sin(player.rotation.y) * speed;
            break;
        case 'k':
            current_camera = orbitCamera;
            current_camera.position.set(0, 50, 0);
            current_camera.lookAt(0, 0, 0);
            controls.object = current_camera;
            break;
        case 'Escape':
            currentScene = (currentScene === gameScene) ? menuScene : gameScene;
            if (currentScene === gameScene) {
                current_camera = camera;
            } else {
                menuCamera.position.set(0, 145, 400);
                current_camera = menuCamera;
            }
            break;
    }
    vector = player.getWorldPosition(new THREE.Vector3());
    console.log(vector.x + ' ' + vector.z);

    // TBD : Fix collision check, prob push the player back the same units if collision detected
    const col = Math.round((newX + 30) / 2);
    const row = Math.round((newZ + 30) / 2);
    //if (map_30[row] && map_30[row][col] == 0) 
    //{
        player.position.set(newX, player.position.y, newZ);
    //}
});

let isLeftClickHeld = false;
let previousMouseX = null;

// Deact Orbitcontrols when left clicked
window.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
        isLeftClickHeld = true;
        previousMouseX = event.clientX;
        controls.enabled = false; // Disable
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
    if (isLeftClickHeld && previousMouseX !== null) {
        const deltaX = event.clientX - previousMouseX;
        const rotationSpeed = 0.005;
        // Rotate the player around its y-axis
        player.rotation.y -= deltaX * rotationSpeed;
        previousMouseX = event.clientX;
    }
});


console.log(losingCoordsTEMP.x + ',' + losingCoordsTEMP.z);
console.log(exitCoords.x + ',' + exitCoords.z);
function checkWin() {
    const vector = camera.getWorldPosition(new THREE.Vector3());
    let distanceFromExit = Math.sqrt(Math.pow(exitCoords.x - vector.x, 2) + Math.pow(exitCoords.z - vector.z, 2));
    if (distanceFromExit < 0.3) {
        win = true;
        currentScene = menuScene;
        current_camera = menuCamera;
        menuCamera.position.set(0, 385, 400);
    } 
    //Temporary; checking for loss menu
    //Losing condition: Entity coords === player coords
    if (vector.x === losingCoordsTEMP.x && vector.z === losingCoordsTEMP.z) {
        win = false;
        currentScene = menuScene;
        current_camera = menuCamera;
        menuCamera.position.set(0, -55, 400);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    checkWin();
    // Move camera to follow the player's position
    updateCameraPosition();
    renderer.render(currentScene, current_camera);
}
animate();
