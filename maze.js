import * as THREE from 'three';

export let exitCoords;
export let validSpawnPosition = [];
export let wallBoundingBoxes = [];
export let wallMeshes = [];
export let collisionScale = 0.95;
export const texture = new THREE.TextureLoader().load('textures/flesh.jpg');

// Recursive backtracking algorithm for maze generation
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

export function genMaze(maze, scene) {
    const wallHeight = 7;
    maze[1][1] = 0;
    maze[0][maze.length - 2] = 0;

    // Exit coordinates
    exitCoords = new THREE.Vector3((maze.length - 2) * 2 - maze.length + 1, 0, 0 * 2 - maze.length + 1);

    carvePassages(1, 1, maze);

    wallBoundingBoxes = [];
    validSpawnPosition = [];

    let map = new THREE.TextureLoader().load('textures/black_wall.jpg');
    let bmap = new THREE.TextureLoader().load('textures/black_wall_i.jpg');
    let dmap = new THREE.TextureLoader().load('textures/black_wall_d.jpg');

    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    bmap.wrapS = bmap.wrapT = THREE.RepeatWrapping;
    dmap.wrapS = dmap.wrapT = THREE.RepeatWrapping;

    map.repeat.set(1, wallHeight / 2);
    bmap.repeat.set(1, wallHeight / 2);
    dmap.repeat.set(1, wallHeight / 2);

    const wallWidth = 2;
    const wallDepth = 2;

    for (let row = 0; row < maze.length; ++row) {
        for (let col = 0; col < maze[row].length; ++col) {
            let x = col * 2 - maze.length + 1;
            let z = row * 2 - maze.length + 1;
            if (maze[row][col] === 1) {
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

                const scaledWidth = wallWidth * collisionScale;
                const scaledDepth = wallDepth * collisionScale;

                const halfScaledWidth = scaledWidth / 2;
                const halfScaledDepth = scaledDepth / 2;

                const minX = x - halfScaledWidth;
                const maxX = x + halfScaledWidth;
                const minY = 0; 
                const maxY = wallHeight;
                const minZ = z - halfScaledDepth;
                const maxZ = z + halfScaledDepth;

                const wallBox = new THREE.Box3(
                    new THREE.Vector3(minX, minY, minZ),
                    new THREE.Vector3(maxX, maxY, maxZ)
                );

                wallBoundingBoxes.push(wallBox);
                wallMeshes.push(wall);
            } else if (row === 0 && col === maze.length - 2) {
                // exit
                continue;
            } else {
                validSpawnPosition.push([x, z]);
            }
        }
    }
}
