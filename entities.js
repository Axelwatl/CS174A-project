import * as THREE from 'three';
import { wallBoundingBoxes, wallMeshes } from './maze.js';
import { getTwoValidMazeSpaces, gameScene, player } from './main.js';

export let entityList = [];

const ENTITY_COUNT = 1;
const ENTITY_SPEED = 1.0;

export function addEntities(){

    for (let i = 0; i < ENTITY_COUNT; i++) {
        // Entity Mesh
        const patrolPoints = getTwoValidMazeSpaces();
        const spawnPoint = patrolPoints[0];
        const patrolPoint = patrolPoints[1];

        const entityGeometry = new THREE.OctahedronGeometry(1);
        const entityMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
        const entityMesh = new THREE.Mesh(entityGeometry, entityMaterial);
        entityMesh.position.set(spawnPoint.x, 1, spawnPoint.z);
        entityMesh.castShadow = true;
        entityMesh.receiveShadow = true;

        // Entity's FOV Cone
        const fovGeometry = new THREE.ConeGeometry(4, 8, 8, 1);   // base radius, height, radius segments, height segments
        const fovMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFF80, 
            transparent: true, 
            opacity: 0.5,
            side: THREE.DoubleSide,
        });
        const fovMesh = new THREE.Mesh(fovGeometry, fovMaterial);
        fovMesh.rotation.x = -Math.PI / 2; 
        fovMesh.position.set(0, 0, 4);

        entityMesh.add(fovMesh);

        // Entity's pathing route
        const directionToPatrolPoint = new THREE.Vector3(
            patrolPoint.x - spawnPoint.x,
            0, // Ignore y-coordinate
            patrolPoint.z - spawnPoint.z
        );
        const routeLength = directionToPatrolPoint.length();

        // Assemble entity and keep track
        let entity = {
            mesh: entityMesh,
            fovMesh: fovMesh,
            spawnPoint: spawnPoint,
            patrolPoint: patrolPoint,
            routeVector: directionToPatrolPoint,
            routeLength: routeLength,
            detected: false,
        }

        gameScene.add(entity.mesh);
        entityList.push(entity);
    }

}

export function updateEntities(time){
    for(let entity of entityList) {
        if (entity.detected) {
            // Player was seen; make entity chase player
            //entity.mesh.
            console.log("t");
        }
        else {
            // Linear interpolation between spawnPoint and patrolPoint
            let period = entity.routeLength / ENTITY_SPEED;
            let a = (time % period) / period;
            if (a > 0.5) {
                a = 1 - a;
                entity.mesh.lookAt(entity.spawnPoint.x, entity.mesh.position.y, entity.spawnPoint.z);
            }
            else {
                entity.mesh.lookAt(entity.patrolPoint.x, entity.mesh.position.y, entity.patrolPoint.z);
            }
            a *= 2;

            entity.mesh.position.lerpVectors(entity.spawnPoint, entity.patrolPoint, a);
        } 
    }
}

export function isPlayerInFov(playerPosition, entity, cone) {
    const coneHeight = cone.geometry.parameters.height;
    const coneRadius = cone.geometry.parameters.radius;
    const coneAngle = Math.atan(coneRadius / coneHeight) ; // Should be about 28 degrees or 0.49 radians (r=2 h=8)
    // console.log(coneAngle);

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

    // If player is very close to the entity, consider that as a detection
    if (distanceToPlayer < 2) {
        return true;
    }

    // Check angle between entity's forward direction and the direction to the player
    const forwardDirection = new THREE.Vector3(0, 0, 1);
    forwardDirection.applyQuaternion(entity.quaternion); // Get entity's current forward direction
    forwardDirection.y = 0;
    forwardDirection.normalize();
    directionToPlayer.normalize();
    
    const angleToPlayer = forwardDirection.angleTo(directionToPlayer);

    // Check if angle is within the cone's angle
    //return angleToPlayer <= coneAngle;
    if (angleToPlayer > coneAngle) {
        return false; // Player is outside the cone's field of view
    }

    // Raycast to check for obstructions between the entity and player
    const raycaster = new THREE.Raycaster(entityPosition, directionToPlayer.normalize(), 0, distanceToPlayer); // Create ray from entity to player
    const intersects = raycaster.intersectObjects(wallMeshes); // Check for intersections with walls

    // If the ray intersects with any wall, the line of sight is blocked
    if (intersects.length > 0) {
        return false; // Player is obstructed by a wall
    }

    // Check if entity is inside a wall
    for (let box of wallBoundingBoxes) {
        if (box.containsPoint(entity.position)) {
            return false; // Entity is in a wall
        }
    }

    // If no intersection and player is in FOV, return true
    return true;
}

export function updateEntityFov() {
    let playerPosition = new THREE.Vector3();
    playerPosition = player.position;

    for (let entity of entityList) {
        if (isPlayerInFov(playerPosition, entity.mesh, entity.fovMesh)) {
            entity.fovMesh.material.color.set(0xFF8080);   // red
            entity.detected = true;
        }
        else {
            entity.fovMesh.material.color.set(0xFFFF80);   // yellow
        }
    }
}