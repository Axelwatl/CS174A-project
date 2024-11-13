import * as THREE from 'three';
import { OrbitControls  } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/Addons.js';
import { TextGeometry } from 'three/examples/jsm/Addons.js';
import { genMaze, exitCoords  } from './maze';

let gameScene = new THREE.Scene();
let menuScene = new THREE.Scene();
let currentScene = new THREE.Scene();
let win = false;

currentScene = gameScene;

let menuCameraTarget = new THREE.Vector3(0, 150, 0);
let camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
let menuCamera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 1500);
menuCamera.position.set(0, 100, 700);
menuCamera.lookAt(menuCameraTarget);

const orbit_camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let current_camera = camera;

const renderer = new THREE.WebGLRenderer();
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 25, 0)

camera.updateWorldMatrix();
let vector = camera.position.clone();
vector = camera.getWorldPosition(new THREE.Vector3());
console.log(vector);
//camera.position.set(-1, 3, 30);

const wall_texture = new THREE.TextureLoader().load('textures/wall_texture.jpg');
const floor_texture = new THREE.TextureLoader().load('textures/floor.jpeg');
let floor_material = new THREE.MeshStandardMaterial({ map: floor_texture });
let floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floor_material);
floor.rotateX(-Math.PI / 2);

gameScene.add(floor);

const createAxisLine = (color, start, end) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color: color });
    return new THREE.Line(geometry, material);
};
const xAxis = createAxisLine(0xff0000, new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0, 0)); // Red
const yAxis = createAxisLine(0x00ff00, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 3, 0)); // Green
const zAxis = createAxisLine(0x0000ff, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 3)); // Blue
gameScene.add(xAxis);
gameScene.add(yAxis);
gameScene.add(zAxis);

const pointLight = new THREE.PointLight(0xffffff, 100, 100);
pointLight.position.set(5, 5, 5); // Position the light
gameScene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0.5, .0, 1.0).normalize();
gameScene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
gameScene.add(ambientLight);

// Make player
const player_geometry = new THREE.SphereGeometry(0.5, 14, 14);
const player_material = new THREE.MeshStandardMaterial({ color: 0x000fff });
const player = new THREE.Mesh(player_geometry, player_material);
gameScene.add(player);

// Temp. use box for hand (MC)
const hand_geometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
const hand_material = new THREE.MeshStandardMaterial({ color: 0x804fff });
const hand = new THREE.Mesh(hand_geometry, hand_material);
hand.position.set(0.3, -0.2, -0.5); // Relative to the camera
camera.add(hand); // Fix to player
gameScene.add(camera);


const phong_material = new THREE.MeshPhongMaterial({
    color: 0x00ff00, // Green color
    shininess: 100   // Shininess of the material
});

const grid = new THREE.GridHelper(60, 30);
gameScene.add(grid);

let mapSize = Math.floor(Math.random() * (34 - 15 + 1) + 15);
if (mapSize % 2 == 0) {
    if (mapSize == 34) {
        mapSize -= 1;
    } else {
        mapSize += 1;
    }
}

const map = Array.from({ length: mapSize }, () => new Array(mapSize).fill(1))
genMaze(map, gameScene);


function updateCameraPosition() {
    camera.position.set(player.position.x, player.position.y + 1.5, player.position.z); 
    camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z + 1);
}

let group, textMesh, textMesh2, textMesh3, textGeo, textGeo2, textGeo3, font;

const menuDirLight = new THREE.DirectionalLight(0xffffff, 1);
menuDirLight.position.set(0,0,1).normalize();
menuScene.add(menuDirLight);

const menuPtLight = new THREE.PointLight(0xffffff, 1, 0, 0);
menuPtLight.color.setHSL(Math.random(), 1, 0.5);
menuPtLight.position.set(0, 100, 90);
menuScene.add(menuPtLight);

let materials = [
    new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ),
    new THREE.MeshPhongMaterial({ color: 0xffffff })
];

group = new THREE.Group();
group.position.y = 50;
menuScene.add(group);

loadFont();

function loadFont() {
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

    textMesh = new THREE.Mesh(textGeo, materials);
    textMesh.position.set(centerOffset, 70, 0);

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

    textMesh2 = new THREE.Mesh(textGeo2, materials);
    textMesh2.position.set(centerOffset2, 300, 0);

    group.add(textMesh);
    group.add(textMesh2);
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
            current_camera = orbit_camera;
            current_camera.position.set(0, 50, 0);
            current_camera.lookAt(0, 0, 0);
            controls.object = current_camera;
            break;
        case 'Escape':
            currentScene = (currentScene === gameScene) ? menuScene : gameScene;
            if (currentScene === gameScene) {
                current_camera = camera;
            } else {
                current_camera = menuCamera;
            }
            break;
    }
    vector = camera.getWorldPosition(new THREE.Vector3());
    console.log(vector);

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
        current_camera = menuCamera;
        menuCamera.position.set(0, 330, 700);
    }
}

function animate() {
    requestAnimationFrame(animate);
    checkWin();
    // Move camera to follow the player's position
    updateCameraPosition();
    renderer.render(currentScene, current_camera);
}
animate();
