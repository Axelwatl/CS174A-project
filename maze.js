import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export let exitCoords;
export let losingCoordsTEMP;
export let validSpawnPosition = [];
export let wallBoundingBoxes = []; // Store wall bounding boxes
export let wallMeshes = [];
export let collisionScale = 0.95; // From 0 -> 1
export const texture = new THREE.TextureLoader().load('textures/flesh.jpg');

// Recursive backtracking algorithm
function carvePassages(x, z, grid) {
    const N = [-1, 0];
    const S = [1, 0];
    const E = [0, 1];
    const W = [0, -1];
    const directions = [N, S, E, W].sort(() => Math.random() - 0.5);

    directions.forEach((direction) => {
        const nx = x + direction[0] * 2;
        const nz = z + direction[1] * 2;

        if (nz > 0 && nz < grid.length && nx > 0 && nx < grid[0].length && grid[nz][nx] === 1) {
            grid[z + direction[1]][x + direction[0]] = 0;
            grid[nz][nx] = 0;
            carvePassages(nx, nz, grid);
        }
    });
}

function placeModels(validSpawnPosition, scene, path, scale, y) {
    const loader = new GLTFLoader();
    const maxModelCount = validSpawnPosition.length / 8; 

    //valid positions
    const pos = validSpawnPosition.sort(() => Math.random() - 0.5).slice(0, maxModelCount);

    loader.load(
        path, 
        (mat) => {
            const model = mat.scene;
            pos.forEach((p) => {
                const m = model.clone();
                m.position.set(p[0] - 3, y, p[1] + 4); 
                m.scale.set(scale, scale, scale);
                scene.add(m);
            });
        }
    );
}

export function genMaze(maze, scene) {
    //texture.wrapS = THREE.RepeatWrapping; //Horizontal wrapping
    //texture.wrapT = THREE.RepeatWrapping; //Vertical
    const wallHeight = 7;//wallHeight could be altered
    //texture.repeat.set(1, wallHeight / 2); //Repeat once horizontally; play around w/divisor
    maze[1][1] = 0;
    // Temporary exit
    maze[0][maze.length - 2] = 0;
    // Exit coordinates
    exitCoords = new THREE.Vector3((maze.length - 2) * 2 - maze.length + 1, 0, 0 * 2 - maze.length + 1);

    carvePassages(1, 1, maze);
   // addFloorTiles(maze, scene, 'assets/Floor_Tile.glb', maze.length);
    //wallBoundingBoxes => Store the coordinates of the 4 corners of every wall in the maze. Use this for collision detection
    wallBoundingBoxes = []; // Reset wall bounding boxes
    validSpawnPosition = []; // Reset valid spawn positions

    //Used with wall_geometry to make defining the bounding box easier
    const wallWidth = 2;
    const wallDepth = 2;
    let map = new THREE.TextureLoader().load('textures/black_wall.jpg');
    let bmap = new THREE.TextureLoader().load('textures/black_wall_i.jpg');
    let dmap = new THREE.TextureLoader().load('textures/black_wall_d.jpg');

    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    bmap.wrapS = bmap.wrapT = THREE.RepeatWrapping;
    dmap.wrapS = dmap.wrapT = THREE.RepeatWrapping;

    map.repeat.set(1, wallHeight / wallWidth);
    bmap.repeat.set(1, wallHeight / wallWidth);
    dmap.repeat.set(1, wallHeight / wallWidth);

    //const wallHeight = 5;//wallHeight could be altered

    for (let row = 0; row < maze.length; ++row) {
        for (let col = 0; col < maze[row].length; ++col) {
            let x = col * 2 - maze.length + 1;
            let z = row * 2 - maze.length + 1;
            if (maze[row][col] === 1) {
                // Create wall
                let wall_geometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth);
                let wall_material = new THREE.MeshPhongMaterial({
                    bumpMap: bmap,
                    bumpScale: 0.5,
                    displacementMap: dmap,
                    displacementScale: 0.01,
                    map: map,
                });
                let wall = new THREE.Mesh(wall_geometry, wall_material);
                wall.receiveShadow = true;
                wall.castShadow = true;
                wall.position.set(x, wallHeight / 2, z);
                wall.userData = { type: 'wall' };
                scene.add(wall);

                // Calculate and store wall bounding box, adjust w/ collision factor to make less/more stringent
                const scaledWidth = wallWidth * collisionScale;
                const scaledDepth = wallDepth * collisionScale;

                const halfScaledWidth = scaledWidth / 2;
                const halfScaledDepth = scaledDepth / 2;

                const minX = x - halfScaledWidth;
                const maxX = x + halfScaledWidth;
                const minY = 0; // Not needed(? Consider removing to optimize)
                const maxY = wallHeight; // Full wall height
                const minZ = z - halfScaledDepth;
                const maxZ = z + halfScaledDepth;

                // Create bounding box for the wall
                const wallBox = new THREE.Box3(
                    new THREE.Vector3(minX, minY, minZ),
                    new THREE.Vector3(maxX, maxY, maxZ)
                );

                wallBoundingBoxes.push(wallBox);//Store all the coordinates in this array
                wallMeshes.push(wall);
            } else if (row === 0 && col === maze.length - 2) {
                //then exit position
                continue;
            } else {
                validSpawnPosition.push([x, z]);
            }
        }
    }
    placeModels(validSpawnPosition, scene, 'assets/Bones.glb', 0.015, 0.21);
    placeModels(validSpawnPosition, scene, 'assets/Blood.glb', 0.5, 0.01);
}
