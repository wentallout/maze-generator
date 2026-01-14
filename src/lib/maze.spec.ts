import { describe, it, expect } from 'vitest';
import {
	createMaze,
	generateMaze,
	solveMaze,
	getEntranceCoordinates,
	getExitCoordinates,
	serializeMaze,
	deserializeMaze,
	type Maze,
	type Cell
} from './maze';

describe('Maze Logic', () => {
	describe('createMaze', () => {
		it('should create a maze with correct dimensions', () => {
			const width = 10;
			const height = 5;
			const maze = createMaze(width, height);

			expect(maze.width).toBe(width);
			expect(maze.height).toBe(height);
			expect(maze.cells.length).toBe(height);
			expect(maze.cells[0].length).toBe(width);
		});

		it('should initialize cells with all walls intact', () => {
			const maze = createMaze(2, 2);
			const cell = maze.cells[0][0];

			expect(cell.walls).toEqual({
				top: true,
				right: true,
				bottom: true,
				left: true
			});
			expect(cell.visited).toBe(false);
		});
	});

	describe('generateMaze', () => {
		it('should generate a maze where all cells are visited', () => {
			const width = 5;
			const height = 5;
			const maze = generateMaze(width, height, 1);

			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					expect(maze.cells[y][x].visited).toBe(true);
				}
			}
		});

		it('should generate a solvable maze', () => {
			const width = 5;
			const height = 5;
			const maze = generateMaze(width, height, 1);
			const start = { x: 0, y: 0 };
			const end = { x: width - 1, y: height - 1 };
			
			// We can use solveMaze to verify solvability since we trust solveMaze logic 
			// (which we will test separately, but for now it confirms connectivity)
			const path = solveMaze(maze, start, end);
			expect(path.length).toBeGreaterThan(0);
			expect(path[0]).toEqual(start);
			expect(path[path.length - 1]).toEqual(end);
		});
	});

	describe('solveMaze', () => {
		it('should find a path in a simple maze', () => {
			// Create a simple 2x1 maze: [Start] -> [End]
			// We manually construct the maze to ensure we know the path
			const width = 2;
			const height = 1;
			const maze = createMaze(width, height);
			
			// Open the wall between them
			maze.cells[0][0].walls.right = false;
			maze.cells[0][1].walls.left = false;

			const start = { x: 0, y: 0 };
			const end = { x: 1, y: 0 };

			const path = solveMaze(maze, start, end);

			expect(path).toHaveLength(2);
			expect(path[0]).toEqual(start);
			expect(path[1]).toEqual(end);
		});

		it('should return start point if no path exists', () => {
			// 2x1 maze with wall between them
			const width = 2;
			const height = 1;
			const maze = createMaze(width, height);
			
			const start = { x: 0, y: 0 };
			const end = { x: 1, y: 0 };

			const path = solveMaze(maze, start, end);

			// Logic in maze.ts says: "No path found - return path as far as we got... or [start]"
			// Since we start at start, it should return just [start] if it can't go anywhere.
			expect(path).toEqual([start]);
		});
		
		it('should avoid walls', () => {
			// 2x2 maze
			// S X
			// | E
			// Path should be (0,0) -> (0,1) -> (1,1)
			const maze = createMaze(2, 2);
			// Open path
			maze.cells[0][0].walls.bottom = false;
			maze.cells[1][0].walls.top = false;
			maze.cells[1][0].walls.right = false;
			maze.cells[1][1].walls.left = false;
			
			const start = { x: 0, y: 0 };
			const end = { x: 1, y: 1 };
			
			const path = solveMaze(maze, start, end);
			
			expect(path).toHaveLength(3);
			expect(path[0]).toEqual({ x: 0, y: 0 });
			expect(path[1]).toEqual({ x: 0, y: 1 });
			expect(path[2]).toEqual({ x: 1, y: 1 });
		});
	});

	describe('Coordinates Helpers', () => {
		const width = 10;
		const height = 10;
		const maze: Maze = { width, height, cells: [] };

		it('getEntranceCoordinates should return correct points', () => {
			expect(getEntranceCoordinates(maze, 'top-left')).toEqual({ x: 0, y: 0 });
			expect(getEntranceCoordinates(maze, 'top-right')).toEqual({ x: 9, y: 0 });
			expect(getEntranceCoordinates(maze, 'bottom-left')).toEqual({ x: 0, y: 9 });
			expect(getEntranceCoordinates(maze, 'bottom-right')).toEqual({ x: 9, y: 9 });
			expect(getEntranceCoordinates(maze, 'center')).toEqual({ x: 5, y: 5 });
		});

		it('getExitCoordinates should return correct points relative to entrance', () => {
			// Opposite logic
			expect(getExitCoordinates(maze, 'top-left', 'opposite')).toEqual({ x: 9, y: 9 });
			expect(getExitCoordinates(maze, 'top-right', 'opposite')).toEqual({ x: 0, y: 9 });
			expect(getExitCoordinates(maze, 'bottom-left', 'opposite')).toEqual({ x: 9, y: 0 });
			expect(getExitCoordinates(maze, 'bottom-right', 'opposite')).toEqual({ x: 0, y: 0 });
			expect(getExitCoordinates(maze, 'center', 'opposite')).toEqual({ x: 9, y: 9 });

			// Absolute logic
			expect(getExitCoordinates(maze, 'top-left', 'top-left')).toEqual({ x: 0, y: 0 });
		});
	});

	describe('Serialization', () => {
		it('should serialize and deserialize correctly', () => {
			const width = 5;
			const height = 5;
			const originalMaze = generateMaze(width, height, 1);
			
			// Modify a specific wall to ensure it's captured
			// e.g. ensure (0,0) has no right wall
			originalMaze.cells[0][0].walls.right = false; 

			const serialized = serializeMaze(originalMaze);
			const deserialized = deserializeMaze(serialized, width, height);

			expect(deserialized.width).toBe(width);
			expect(deserialized.height).toBe(height);
			
			// Check cell by cell
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const origCell = originalMaze.cells[y][x];
					const deserCell = deserialized.cells[y][x];
					
					expect(deserCell.walls).toEqual(origCell.walls);
					// Note: deserialize initializes visited as false, whereas generateMaze sets them to true.
					// If this difference is intended, we don't assert visited state equality.
					// Checking the code: deserializeMaze sets visited: false.
					expect(deserCell.visited).toBe(false); 
				}
			}
		});
	});
});
