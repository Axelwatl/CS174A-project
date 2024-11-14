import * as THREE from 'three';

export let exitCoords;
//Recursive backtracking
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


function carveCorners(maze) {
    let topLeft, bottomLeft, topRight, bottomRight;
    let 
}

export function genMaze(maze, scene) {
    maze[1][1] = 0;
    //temp exit
    maze[0][maze.length - 2] = 0;
    exitCoords = new THREE.Vector3((maze.length - 2) * 2 - maze.length + 1, 0, 0 * 2 - maze.length + 1);

    carvePassages(1, 1, maze);
    console.log(maze)
    for (let row = 0; row < maze.length; ++row) {
        for (let col = 0; col < maze[row].length; ++col) {
            if (maze[row][col] === 1) {
                let x = col * 2 - maze.length + 1;
                let z = row * 2 - maze.length + 1;
                let wall_geometry = new THREE.BoxGeometry(2, 5, 2);
                let wall_material = new THREE.MeshStandardMaterial({
                    //change 
                    map: new THREE.TextureLoader().load('textures/wall_texture.jpg')
                });
                let wall = new THREE.Mesh(wall_geometry, wall_material);
                let rand_row = Math.random() * ((maze.length - 2) - (1)) + 1;
                let rand_col = Math.random() * ((maze[row].length - 2) - (1)) + 1;
                maze[Math.floor(rand_row)][Math.floor(rand_col)] = 0;
                wall.position.set(x, 2, z);
                scene.add(wall);
            }
        }
    }
    carveCorners(maze);
}
