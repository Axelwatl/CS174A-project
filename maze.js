import * as THREE from 'three';

export let exitCoords;
export let losingCoordsTEMP;
export let validSpawnPosition = [];
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
    let chunk = maze.length / 3;
    for (let i = 1; i < chunk; ++i) {
        for (let j = 1; j < chunk; ++j) {  
            maze[i][j] = 0;
        }
    }
    for (let i = 1; i < chunk; ++i) {
        for (let j = maze[i].length - chunk; j < maze[i].length - 1; ++j) {  
            maze[i][j] = 0;
        }
    }
}

export function genMaze(maze, scene) {
    let texture = new THREE.TextureLoader().load('textures/wall_texture.jpg');
    maze[1][1] = 0;
    //Temp exit
    maze[0][maze.length - 2] = 0;
    //Temp exitcoords
    exitCoords = new THREE.Vector3((maze.length - 2) * 2 - maze.length + 1, 0, 0 * 2 - maze.length + 1);
    //temp 
    losingCoordsTEMP = new THREE.Vector3((maze.length - 5) * 2 - maze.length + 1, 0, 0 * 2 - maze.length + 1);
    
    carvePassages(1, 1, maze);
    //carveCorners(maze);

    console.log(maze)
    for (let row = 0; row < maze.length; ++row) {
        for (let col = 0; col < maze[row].length; ++col) {
            let x = col * 2 - maze.length + 1;
            let z = row * 2 - maze.length + 1;
            if (maze[row][col] === 1) {            
                let wall_geometry = new THREE.BoxGeometry(2, 5, 2);
                let wall_material = new THREE.MeshStandardMaterial({
                    //change 
                    map: texture
                });
                let wall = new THREE.Mesh(wall_geometry, wall_material);
                wall.position.set(x, 2, z);
                wall.userData = { type: 'wall' };
                scene.add(wall);
            } else if (row === 0 && col === maze.length - 2) {
                //then exit position
                continue;
            } else {
                validSpawnPosition.push([x, z]);
            }
        }
    }
}
