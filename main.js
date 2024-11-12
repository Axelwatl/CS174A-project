import * as THREE from 'three';
import { OrbitControls  } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const orbit_camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let current_camera = camera;

const renderer = new THREE.WebGLRenderer();
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 25, 0)
//camera.position.set(-1, 3, 30);

const wall_texture = new THREE.TextureLoader().load('textures/wall_texture.jpg');
const floor_texture = new THREE.TextureLoader().load('textures/floor.jpeg');
let floor_material = new THREE.MeshStandardMaterial({ map: floor_texture });
let floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floor_material);
floor.rotateX(-Math.PI / 2);

scene.add(floor);

const createAxisLine = (color, start, end) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color: color });
    return new THREE.Line(geometry, material);
};
const xAxis = createAxisLine(0xff0000, new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0, 0)); // Red
const yAxis = createAxisLine(0x00ff00, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 3, 0)); // Green
const zAxis = createAxisLine(0x0000ff, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 3)); // Blue
scene.add(xAxis);
scene.add(yAxis);
scene.add(zAxis);

const pointLight = new THREE.PointLight(0xffffff, 100, 100);
pointLight.position.set(5, 5, 5); // Position the light
scene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0.5, .0, 1.0).normalize();
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
scene.add(ambientLight);

// Make player
const player_geometry = new THREE.SphereGeometry(0.5, 14, 14);
const player_material = new THREE.MeshStandardMaterial({ color: 0x000fff });
const player = new THREE.Mesh(player_geometry, player_material);
scene.add(player);

// Temp. use box for hand (MC)
const hand_geometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
const hand_material = new THREE.MeshStandardMaterial({ color: 0x804fff });
const hand = new THREE.Mesh(hand_geometry, hand_material);
hand.position.set(0.3, -0.2, -0.5); // Relative to the camera
camera.add(hand); // Fix to player
scene.add(camera);


const phong_material = new THREE.MeshPhongMaterial({
    color: 0x00ff00, // Green color
    shininess: 100   // Shininess of the material
});

const grid = new THREE.GridHelper(60, 30);
scene.add(grid);

const map_30 = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

for (let row = 0; row < map_30.length; ++row) {
    for (let col = 0; col < map_30[row].length; ++col) {
        if (map_30[row][col] === 1) {
            let x = col * 2 - 30 + 1;
            let z = row * 2 - 30 + 1;
            let wall_geometry = new THREE.BoxGeometry(2, 4, 2);
            let wall_material = new THREE.MeshStandardMaterial({ map: wall_texture });
            let wall = new THREE.Mesh(wall_geometry, wall_material);
            wall.position.set(x, 2, z);
            scene.add(wall); 
        }
    }
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
    }

    // TBD : Fix collision check, prob push the player back the same units if collision detected
    const col = Math.round((newX + 30) / 2);
    const row = Math.round((newZ + 30) / 2);
    //if (map_30[row] && map_30[row][col] == 0) 
    //{
        player.position.set(newX, player.position.y, newZ);
    //}
});

function updateCameraPosition() {
    camera.position.set(player.position.x, player.position.y + 1.5, player.position.z); 
    camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z + 1);
}


function animate() {
    requestAnimationFrame(animate);
    
    // Move camera to follow the player's position
    updateCameraPosition();

    renderer.render(scene, camera);
}
animate();
