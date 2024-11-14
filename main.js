import * as THREE from 'three';
import { OrbitControls  } from 'three/examples/jsm/controls/OrbitControls.js';
import { FirstPersonControls, FontLoader } from 'three/examples/jsm/Addons.js';
import { TextGeometry } from 'three/examples/jsm/Addons.js';
import { genMaze, exitCoords  } from './maze';
import { ShadowMapViewer } from 'three/examples/jsm/Addons.js';

let camera, menuCamera, currentCamera, menuCameraTarget, cameraPosition, controls, renderer;

//temp
let orbitCamera;

let gameScene, menuScene, currentScene, player, hand, map;
let group, textMesh, textMesh2, textMesh3, textGeo, textGeo2, textGeo3, font;
let materialsTextGeo = [
    new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ),
    new THREE.MeshPhongMaterial({ color: 0xffffff })
];

let win = false;

init();

function init() {
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 25, 0);

    menuCamera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 1500);
    menuCamera.position.set(0, 100, 700);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(window.innerWidth, window.innerHeight);
    //renderer.setAnimationLoop( animate );
    document.body.appendChild(renderer.domElement);

    //temp
    orbitCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0,0,0);

    currentCamera = camera;

    gameScene = new THREE.Scene();
    gameScene.background = new THREE.Color(0x000000);
    gameScene.fog = new THREE.Fog(0xffffff, 200, 1000);

    menuScene = new THREE.Scene();
    menuScene.background = new THREE.Color(0x000000);
    menuScene.fog = new THREE.Fog(0xffffff, 200, 1000);

    //lighting

    const pointLight = new THREE.PointLight(0xffffff, 100, 100);
    pointLight.position.set(5, 15, 5); // Position the light
    gameScene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0.5, .0, 1.0).normalize();
    gameScene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
    gameScene.add(ambientLight);

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
    map = Array.from({ length: mapSize }, () => new Array(mapSize).fill(1))
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

    const floorGeometry = new THREE.PlaneGeometry(map.length * 2, map.length * 2);
    const floorMaterial = new THREE.MeshPhongMaterial({color: 0xffffff});
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
    menuPtLight.position.set(0, 100, 90);
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
        size: 50,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });

    textGeo.computeBoundingBox();
    const centerOffset = -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);

    textMesh = new THREE.Mesh(textGeo, materialsTextGeo);
    textMesh.position.set(centerOffset, 60, 0);

    textGeo2 = new TextGeometry('WIN', {
        font: font,
        size: 50,
        depth: 30,
        curveSegments: 3,
        bevelThickness: 2,
        bevelSize: 1,
        bevelEnabled: true
    });

    textGeo2.computeBoundingBox();
    const centerOffset2 = -0.5 * (textGeo2.boundingBox.max.x - textGeo2.boundingBox.min.x);

    textMesh2 = new THREE.Mesh(textGeo2, materialsTextGeo);
    textMesh2.position.set(centerOffset2, 1060, 0);

    group.add(textMesh);
    group.add(textMesh2);
}

function updateCameraPosition() {
    camera.position.set(player.position.x, player.position.y + 1.5, player.position.z); 
    camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z + 1);
}

window.addEventListener('keydown', function(event) {
    const speed = 0.5;
    let newX = player.position.x;
    let newZ = player.position.z;

    switch (event.key) {
        case 'w': //Up
        case 'ArrowUp' :
            newZ += Math.cos(camera.rotation.y) * speed;
            newX += Math.sin(camera.rotation.y) * speed;
            break;
        case 's': //Down
        case 'ArrowDown' :
            newZ -= Math.cos(camera.rotation.y) * speed;
            newX -= Math.sin(camera.rotation.y) * speed;
            break;
        case 'a': //Left
        case 'ArrowLeft' :
            newZ -= Math.sin(camera.rotation.y) * speed;
            newX += Math.cos(camera.rotation.y) * speed;
            break;
        case 'd': //Right
        case 'ArrowRight' :
            newZ += Math.sin(camera.rotation.y) * speed;
            newX -= Math.cos(camera.rotation.y) * speed;
            break;
        case 'k':
            currentCamera = orbitCamera;
            currentCamera.position.set(0, 50, 0);
            currentCamera.lookAt(0, 0, 0);
            controls.object = currentCamera;
            break;
        case 'Escape':
            currentScene = (currentScene === gameScene) ? menuScene : gameScene;
            if (currentScene === gameScene) {
                currentCamera = camera;
            } else {
                menuCamera.position.set(0, 80, 700);
                currentCamera = menuCamera;
            }
            break;
    }
    cameraPosition = camera.getWorldPosition(new THREE.Vector3());
    console.log(cameraPosition);

    // TBD : Fix collision check, prob push the player back the same units if collision detected
    const col = Math.round((newX + 30) / 2);
    const row = Math.round((newZ + 30) / 2);
    //if (map_30[row] && map_30[row][col] == 0) 
    //{
        player.position.set(newX, player.position.y, newZ);
    //}
});

function checkWin() {
    const vector = camera.getWorldPosition(new THREE.Vector3());
    if (vector.x === exitCoords.x && vector.z === exitCoords.z) {
        win = true;
        currentScene = menuScene;
        currentCamera = menuCamera;
        menuCamera.position.set(0, 1060, 700);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    checkWin();
    // Move camera to follow the player's position
    updateCameraPosition();
    renderer.render(currentScene, currentCamera);
}
animate();
