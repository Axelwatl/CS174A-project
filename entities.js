import * as THREE from 'three';
import { wallBoundingBoxes, wallMeshes } from './maze.js';
import { torchOn } from './main.js'; 
import { getTwoValidMazeSpaces, gameScene, player } from './main.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// Remove skull entity entirely, only insect entity remains
export let entityList = [];
let insectModel = null;
let modelsLoaded = false;

const INSECT_COUNT = 2; // For example, let's have two insect entities now.
const ENTITY_SPEED = 1.0;

// Torch on/off state
//let torchOn = true; 



function loadMtlObj(mtlPath, objPath, scale = 0.5) {
    return new Promise((resolve, reject) => {
        const mtlLoader = new MTLLoader();
        mtlLoader.load(mtlPath, (materials) => {
            materials.preload();
            const objLoader = new OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.load(objPath, (obj) => {
                // Center and floor the model
                const box = new THREE.Box3().setFromObject(obj);
                const center = box.getCenter(new THREE.Vector3());

                // Re-center the model so its base sits at y=0
                obj.position.x -= center.x;
                obj.position.z -= center.z;
                obj.position.y -= box.min.y;

                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Apply scale
                obj.scale.set(scale, scale, scale);

                resolve(obj);
            }, undefined, (error) => {
                console.error('Error loading OBJ:', error);
                reject(error);
            });
        }, undefined, (error) => {
            console.error('Error loading MTL:', error);
            reject(error);
        });
    });
}

export function loadEntityModel() {
    // Only insect model now
    const insectPromise = loadMtlObj(
        'assets/Insect/uploads_files_3941940_monster+insects.mtl',
        'assets/Insect/uploads_files_3941940_monster+insects.obj',
        0.5 // Insect scale
    );

    return insectPromise.then((insectObj) => {
        insectModel = insectObj;
        modelsLoaded = true;
    }).catch((error) => {
        console.error('Error loading models:', error);
    });
}

export function addEntities() {
    if (!modelsLoaded || !insectModel) {
        console.warn("Entity model not loaded yet.");
        return;
    }

    // Clear old entities
    entityList.forEach(ent => gameScene.remove(ent.mesh));
    entityList = [];

    // Create insect entities
    addSingleEntity(insectModel, INSECT_COUNT);
}

function addSingleEntity(model, count) {
    for (let i = 0; i < count; i++) {
        const patrolPoints = getTwoValidMazeSpaces();
        const spawnPoint = patrolPoints[0];
        const patrolPoint = patrolPoints[1];

        const entityMesh = model.clone(true);
        
        // Position entity above floor
        entityMesh.position.set(spawnPoint.x, spawnPoint.y + 0.5, spawnPoint.z);

        const fovMesh = createFovCone();
        entityMesh.add(fovMesh);

        const directionToPatrolPoint = new THREE.Vector3(
            patrolPoint.x - spawnPoint.x,
            0,
            patrolPoint.z - spawnPoint.z
        );
        const routeLength = directionToPatrolPoint.length();

        let entity = {
            mesh: entityMesh,
            fovMesh: fovMesh,
            spawnPoint: spawnPoint,
            patrolPoint: patrolPoint,
            routeVector: directionToPatrolPoint,
            routeLength: routeLength,
            detected: false,
        };
        gameScene.add(entity.mesh);
        entityList.push(entity);
    }
}

function createFovCone() {
    const fovGeometry = new THREE.ConeGeometry(4, 8, 8, 1); 
    // POV Cone now a dull grey
    const fovMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555, 
        transparent: true, 
        opacity: 0.5,
        side: THREE.DoubleSide,
    });
    const fovMesh = new THREE.Mesh(fovGeometry, fovMaterial);
    fovMesh.rotation.x = -Math.PI / 2; 
    fovMesh.position.set(0, 0, 4);
    return fovMesh;
}

export function updateEntities(time) {
    for (let entity of entityList) {
        // If detected, entity rushes the player
        if (entity.detected) {
            // Rush speed, faster than normal
            let rushSpeed = ENTITY_SPEED * 2.0;

            // Move directly toward the player
            let playerPosition = player.position.clone();
            let entityPosition = entity.mesh.position.clone();
            let directionToPlayer = playerPosition.sub(entityPosition).normalize();
            directionToPlayer.multiplyScalar(rushSpeed * 0.01); // Move in small increments
            entity.mesh.position.add(directionToPlayer);

            // Check if entity reached player
            const distanceToPlayer = entity.mesh.position.distanceTo(player.position);
            if (distanceToPlayer < 0.3) {
                // If torchOn and entity reaches player, player dies -> game ends
                if (torchOn) {
                    console.log("The entity caught you with torch ON! Game Over!");
                    // Simulate game end: reposition player to some place
                    player.position.set(player.position.x - 5, 0, player.position.z - 5);
                    // You could set a global variable or call a reset function here
                } else {
                    // Torch off: entity resets to its spawn point
                    console.log("Entity reached player but torch was OFF, entity resets.");
                    entity.mesh.position.set(entity.spawnPoint.x, entity.spawnPoint.y + 0.5, entity.spawnPoint.z);
                    entity.detected = false;
                }
            }
        } else {
            // Normal patrol behavior
            let period = entity.routeLength / ENTITY_SPEED;
            let a = (time % period) / period;
            if (a > 0.5) {
                a = 1 - a;
                entity.mesh.lookAt(entity.spawnPoint.x, entity.mesh.position.y, entity.spawnPoint.z);
            } else {
                entity.mesh.lookAt(entity.patrolPoint.x, entity.mesh.position.y, entity.mesh.position.z);
            }
            a *= 2;
            entity.mesh.position.lerpVectors(entity.spawnPoint, entity.patrolPoint, a);
        }
    }
}

export function isPlayerInFov(playerPosition, entity, cone) {
    const coneHeight = cone.geometry.parameters.height;
    const coneRadius = cone.geometry.parameters.radius;
    const coneAngle = Math.atan(coneRadius / coneHeight);

    let entityPosition = entity.position.clone();
    const directionToPlayer = new THREE.Vector3(
        playerPosition.x - entityPosition.x,
        0,
        playerPosition.z - entityPosition.z
    );

    const distanceToPlayer = directionToPlayer.length();
    if (distanceToPlayer > coneHeight) return false;
    if (distanceToPlayer < 2) return true;

    const forwardDirection = new THREE.Vector3(0, 0, 1);
    forwardDirection.applyQuaternion(entity.quaternion);
    forwardDirection.y = 0;
    forwardDirection.normalize();
    directionToPlayer.normalize();
    
    const angleToPlayer = forwardDirection.angleTo(directionToPlayer);
    if (angleToPlayer > coneAngle) return false;

    const raycaster = new THREE.Raycaster(entityPosition, directionToPlayer, 0, distanceToPlayer);
    const intersects = raycaster.intersectObjects(wallMeshes);
    if (intersects.length > 0) {
        return false;
    }

    for (let box of wallBoundingBoxes) {
        if (box.containsPoint(entity.position)) {
            return false;
        }
    }

    return true;
}

export function updateEntityFov() {
    let playerPosition = player.position;
    for (let entity of entityList) {
        if (isPlayerInFov(playerPosition, entity.mesh, entity.fovMesh)) {
            entity.fovMesh.material.color.set(0x717378);
            entity.detected = true;
        } else {
            entity.fovMesh.material.color.set(0x717378);
            entity.detected = false;
        }
    }
}
