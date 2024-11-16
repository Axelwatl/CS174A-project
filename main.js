import * as THREE from 'three';
import { OrbitControls  } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/Addons.js';
import { TextGeometry } from 'three/examples/jsm/Addons.js';
import { genMaze, exitCoords, losingCoordsTEMP, validSpawnPosition, wallBoundingBoxes, texture } from './maze.js';
export const floorTexture = new THREE.TextureLoader().load('textures/flesh.jpg');
floorTexture.wrapS = THREE.RepeatWrapping; //Horizontal wrapping
floorTexture.wrapT = THREE.RepeatWrapping; //Vertical wrapping
const floorRepeat = 4; //More/less reps
floorTexture.repeat.set(floorRepeat, floorRepeat);


let camera, menuCamera, gameOverCamera, current_camera, menuCameraTarget, cameraPosition, controls, renderer;

//temp
let orbitCamera;

let gameScene, menuScene, gameOverScene, currentScene, player, hand, map;
let entity1, entity1_fov, entity1_detected;    // todo steve: temporary until I formalize what I want to do with these


let spawnPoint = [];

//temp raycaster 
let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2();

let group, textMesh, textMesh2, textMesh3, textMesh4, textMesh5, textMesh6, textMesh7, textGeo, textGeo2, textGeo3, textGeo4, textGeo5, textGeo6, textGeo7, font;
let menuItems = [];
let keepMoving = true;//The walls and floor should keep moving unless k was pressed.

//mapsize
const MAX_MAP_SIZE = 30;
const MIN_MAP_SIZE = 20;
const clock = new THREE.Clock();//To animate texture
const ambientLight = new THREE.AmbientLight(0x505050);

let win = false;
let vector;

init();

function init() {
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 25, 0);

    menuCamera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 3000);
    menuCamera.position.set(0, 300, 700);

    vector = camera.position.clone();
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const backgroundMusic = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/audio/loop_audio.mp3', (buffer) => {
        backgroundMusic.setBuffer(buffer);
        backgroundMusic.setLoop(true);
        backgroundMusic.setVolume(1);//Adjust as necessary
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

    //const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
    ambientLight.intensity = 0.01;
    gameScene.add(ambientLight);
    //Make the room dark
    //ambientLight.intensity = 10;  // originally 0.01, change after demo or after better fine-tuning
    //Dim directional light to cast minimal ambient lighting
    directionalLight.intensity = 0.02;
    //Reduce point light's intensity
    pointLight.intensity = 0.3;

    //torchLight.intensity = 1; Moved to makeGameScene
    currentScene = gameScene;

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

    //Player hand
    const handGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
    //TBD : Work on design for hand material
    const handMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    hand = new THREE.Mesh(handGeometry, handMaterial);
    hand.position.set(0.3, -0.2, -0.5); // Relative to the camera
    camera.add(hand); // Fix to player
    gameScene.add(camera);

    // Create torch
    const torchLight = new THREE.SpotLight(0xff0000, 1, 50, Math.PI / 4, 0.1, 1); 
    //Change the color to dark red (0xff0000) and reduce the intensity to 0.5 for a dimmer effect
    torchLight.position.set(0, 0, 0.5); // Position it slightly in front of the hand
    torchLight.target.position.set(0, 0, -1);
    hand.add(torchLight);
    hand.add(torchLight.target);
    // Optionally adjust intensity further for desired dimness
    torchLight.intensity = 0.35; // Make it even dimmer


    //Create test enemy
    let entity1_spawn = setSpawn();  // todo steve: expand upon entity spawnpoints and patrolling routes later
    const entity1_Geometry = new THREE.OctahedronGeometry(1);
    const entity_Material = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
    entity1 = new THREE.Mesh(entity1_Geometry, entity_Material);
    entity1.position.set(entity1_spawn.x, 1, entity1_spawn.z);
    gameScene.add(entity1);
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

    // Room
    const floorGeometry = new THREE.PlaneGeometry(map.length * 2, map.length * 2);
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
    textMesh4 = new THREE.Mesh(textGeo4, new THREE.MeshPhongMaterial({ color: 0xF5F5F5, flatShading: true }));
    textMesh4.position.set(centerOffset4, 250, 0);
    textMesh4.name = 'RESTART'

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
    textMesh5 = new THREE.Mesh(textGeo5, new THREE.MeshPhongMaterial({ color: 0xF5F5F5, flatShading: true }));
    textMesh5.position.set(centerOffset5, 285, 0);
    textMesh5.name = 'NEWMAP'

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
    textMesh6 = new THREE.Mesh(textGeo6, new THREE.MeshPhongMaterial({ color: 0xF5F5F5, flatShading: true }));
    textMesh6.position.set(centerOffset6, -190, 0);
    textMesh6.name = 'RETRY'

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
    textMesh7 = new THREE.Mesh(textGeo7, new THREE.MeshPhongMaterial({ color: 0xF5F5F5, flatShading: true }));
    textMesh7.position.set(centerOffset7, -155, 0);
    textMesh7.name = 'NEWMAP';

    group.add(textMesh);
    group.add(textMesh2);
    group.add(textMesh3);
    group.add(textMesh4);
    group.add(textMesh5);
    group.add(textMesh6);
    group.add(textMesh7);

    textMesh.layers.set(1);
    textMesh2.layers.set(1);
    textMesh3.layers.set(1);
    textMesh4.layers.set(1);
    textMesh5.layers.set(1);
    textMesh6.layers.set(1);
    textMesh7.layers.set(1);

    menuItems.push(textMesh);
    menuItems.push(textMesh4);
    menuItems.push(textMesh5);
    menuItems.push(textMesh6);
    menuItems.push(textMesh7);
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

function isPlayerInFov(playerPosition, entity, cone) {
    const coneHeight = cone.geometry.parameters.height;
    const coneRadius = cone.geometry.parameters.radius;
    const coneAngle = Math.atan(coneRadius / coneHeight) ; // Should be about 28 degrees or 0.49 radians (r=2 h=8)
    console.log(coneAngle);

    // Calculate vector from entity to player
    let entityPosition = new THREE.Vector3();
    entityPosition = entity.position;
    //const directionToPlayer = new THREE.Vector3().subVectors(playerPosition, entityPosition);
    const directionToPlayer = new THREE.Vector3(
        playerPosition.x - entityPosition.x,
        0, // Ignore y-coordinate
        playerPosition.z - entityPosition.z
    );

    // Check if the player is within the cone's height
    const distanceToPlayer = directionToPlayer.length();
    if (distanceToPlayer > coneHeight) {
        return false; // Player is too far away
    }

    // Check angle between entity's forward direction and the direction to the player
    const forwardDirection = new THREE.Vector3(0, 0, 1);
    forwardDirection.applyQuaternion(entity.quaternion); // Get entity's current forward direction
    forwardDirection.y = 0;
    forwardDirection.normalize();
    directionToPlayer.normalize();
    
    const angleToPlayer = forwardDirection.angleTo(directionToPlayer);

    // Check if angle is within the cone's angle
    return angleToPlayer <= coneAngle;
}

function updateEntityFov() {
    let playerPosition = new THREE.Vector3();
    playerPosition = player.position;
    
    if (isPlayerInFov(playerPosition, entity1, entity1_fov)) {
        entity1_fov.material.color.set(0xFF8080);   // red
        console.log("cone now red")
    }
    else {
        entity1_fov.material.color.set(0xFFFF80);   // yellow
    }
}

window.addEventListener('keydown', function(event) {
    console.log('Key pressed:', event.key); // For debugging
    const speed = 0.5;
    //Compute the delta of players distance traversed 
    let deltaX = 0;
    let deltaZ = 0;

    switch (event.key) {
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
        case 'k':
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
            ambientLight.intensity = 0.01;
            keepMoving = true;//Resetting;
            player.y = 14;
            currentScene = (currentScene === gameScene) ? menuScene : gameScene;
            menuCamera.layers.enable(1);
            if (currentScene === gameScene) {
                current_camera = camera;
            } else {
                menuCamera.position.set(0, 145, 400);
                current_camera = menuCamera;
            }
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
});


//Handle rotation with left click
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
        // Rotate the player around its y-axis (YAW Rotation; )
        player.rotation.y -= deltaX * rotationSpeed;
        previousMouseX = event.clientX;
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
    if (intersection.length > 0){
        intersection[0].object.material.color.set(0xF8EFE0);
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
                current_camera = camera;
                currentScene = gameScene;
                //reset game logic function
                break;
            case 'RETRY':
            case 'RESTART':
                player.position.set(spawnPoint.x, 0, spawnPoint.z);
                current_camera = camera;
                currentScene = gameScene;
                //same map
                //reset entity logic fn
        }
        intersection[0].object = [];
    }
});


console.log('losing coords' + losingCoordsTEMP.x + ',' + losingCoordsTEMP.z);
console.log(exitCoords.x + ',' + exitCoords.z);

function checkWin() {
    const vector = camera.getWorldPosition(new THREE.Vector3());
    let distanceFromExit = Math.sqrt(Math.pow(exitCoords.x - vector.x, 2) + Math.pow(exitCoords.z - vector.z, 2));
    if (distanceFromExit < 0.7) {
        currentScene = menuScene;
        current_camera = menuCamera;
        menuCamera.position.set(0, 385, 400);
        //make sure we're not ontop of winning position
        player.position.set(50, 0, 50);
    } 
    //need to track position of entity
    //Temporary; checking for loss menu
    //Losing condition: Entity coords === player coords
    //Can use .intersectsSphere here for ease
    let distanceFromEntity = Math.sqrt(Math.pow(losingCoordsTEMP.x - losingCoordsTEMP.z, 2) + Math.pow(exitCoords.z - vector.z, 2));
    if (distanceFromEntity < 0.3) {
        currentScene = menuScene;
        current_camera = menuCamera;
        menuCamera.position.set(0, -55, 400);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    checkWin();
    updateEntityFov();
    // Move camera to follow the player's position
    // Animate the texture for a tremor effect
    const elapsedTime = clock.getElapsedTime();
    // Animate floor/wall
    if(keepMoving)
    {
        texture.offset.x = Math.sin(elapsedTime * 0.5) * 2;
        texture.offset.y = Math.cos(elapsedTime * 0.5) * 2;
        floorTexture.offset.x = -Math.sin(elapsedTime * 0.5) * 2;
        floorTexture.offset.z = Math.sin(elapsedTime * 0.5) * 2;
    }
    updateCameraPosition();
    renderer.render(currentScene, current_camera);
}
animate();
