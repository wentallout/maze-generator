export type Cell = {
	x: number;
	y: number;
	walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
	visited: boolean;
};

export type Maze = {
	width: number;
	height: number;
	cells: Cell[][];
};

export type EntrancePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export type ExitPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'opposite';

export function getExitCoordinates(
	maze: Maze,
	entrance: EntrancePosition,
	exit: ExitPosition
): { x: number; y: number } {
	switch (exit) {
		case 'opposite':
			// Find opposite corner from entrance
			if (entrance === 'top-left') return { x: maze.width - 1, y: maze.height - 1 };
			if (entrance === 'top-right') return { x: 0, y: maze.height - 1 };
			if (entrance === 'bottom-left') return { x: maze.width - 1, y: 0 };
			if (entrance === 'bottom-right') return { x: 0, y: 0 };
			if (entrance === 'center') return { x: maze.width - 1, y: maze.height - 1 };
			break;
		case 'top-left':
			return { x: 0, y: 0 };
		case 'top-right':
			return { x: maze.width - 1, y: 0 };
		case 'bottom-left':
			return { x: 0, y: maze.height - 1 };
		case 'bottom-right':
			return { x: maze.width - 1, y: maze.height - 1 };
	}
	return { x: maze.width - 1, y: maze.height - 1 };
}

export type Point = { x: number; y: number };

export function solveMaze(maze: Maze, start: Point, end: Point): Point[] {
	// BFS to find shortest path from start to end
	console.log('Solving maze from', start, 'to', end);
	const queue: { point: Point; path: Point[] }[] = [];
	const visited = new Set<string>();

	queue.push({ point: start, path: [start] });
	visited.add(`${start.x},${start.y}`);

	let iterations = 0;
	const maxIterations = maze.width * maze.height * 4;

	while (queue.length > 0 && iterations < maxIterations) {
		iterations++;
		const { point: current, path } = queue.shift()!;

		// Check if we reached the end
		if (current.x === end.x && current.y === end.y) {
			console.log('Found path! Length:', path.length, 'iterations:', iterations);
			return path;
		}

		const cell = maze.cells[current.y][current.x];

		// Try moving in each direction if there's no wall
		const directions: Array<{ dx: number; dy: number; wallCheck: keyof Cell['walls'] }> = [
			{ dx: 1, dy: 0, wallCheck: 'right' },
			{ dx: 0, dy: 1, wallCheck: 'bottom' },
			{ dx: -1, dy: 0, wallCheck: 'left' },
			{ dx: 0, dy: -1, wallCheck: 'top' }
		];

		for (const { dx, dy, wallCheck } of directions) {
			const newX = current.x + dx;
			const newY = current.y + dy;
			const key = `${newX},${newY}`;

			// Check bounds
			if (newX < 0 || newX >= maze.width || newY < 0 || newY >= maze.height) continue;

			// Check if wall exists in that direction
			if (cell.walls[wallCheck]) continue;

			// Check if already visited
			if (visited.has(key)) continue;

			visited.add(key);
			queue.push({
				point: { x: newX, y: newY },
				path: [...path, { x: newX, y: newY }]
			});
		}
	}

	console.log('No path found! Visited:', visited.size, 'iterations:', iterations);
	// No path found - return path as far as we got
	if (queue.length > 0) {
		const { path } = queue[0];
		return path;
	}
	return [start];
}

function createCell(x: number, y: number): Cell {
	return {
		x,
		y,
		walls: { top: true, right: true, bottom: true, left: true },
		visited: false,
	};
}

export function createMaze(width: number, height: number): Maze {
	const cells: Cell[][] = [];
	for (let y = 0; y < height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < width; x++) {
			row.push(createCell(x, y));
		}
		cells.push(row);
	}
	return { width, height, cells };
}

function getNeighbors(cell: Cell, maze: Maze): Cell[] {
	const { x, y } = cell;
	const neighbors: Cell[] = [];

	if (y > 0 && !maze.cells[y - 1][x].visited) neighbors.push(maze.cells[y - 1][x]); // top
	if (x < maze.width - 1 && !maze.cells[y][x + 1].visited) neighbors.push(maze.cells[y][x + 1]); // right
	if (y < maze.height - 1 && !maze.cells[y + 1][x].visited) neighbors.push(maze.cells[y + 1][x]); // bottom
	if (x > 0 && !maze.cells[y][x - 1].visited) neighbors.push(maze.cells[y][x - 1]); // left

	return neighbors;
}

function removeWalls(current: Cell, next: Cell): void {
	const dx = current.x - next.x;
	const dy = current.y - next.y;

	if (dx === 1) {
		current.walls.left = false;
		next.walls.right = false;
	} else if (dx === -1) {
		current.walls.right = false;
		next.walls.left = false;
	}

	if (dy === 1) {
		current.walls.top = false;
		next.walls.bottom = false;
	} else if (dy === -1) {
		current.walls.bottom = false;
		next.walls.top = false;
	}
}

export function generateMaze(width: number, height: number, difficulty: number): Maze {
	const maze = createMaze(width, height);
	const stack: Cell[] = [];
	const startCell = maze.cells[0][0];
	startCell.visited = true;
	stack.push(startCell);

	let steps = 0;
	while (stack.length > 0) {
		steps++;
		const current = stack[stack.length - 1];
		const neighbors = getNeighbors(current, maze);

		if (neighbors.length > 0) {
			const next = neighbors[Math.floor(Math.random() * neighbors.length)];
			removeWalls(current, next);
			next.visited = true;
			stack.push(next);
		} else {
			stack.pop();
		}
	}

	console.log(`Maze generation complete: ${steps} steps processed`);

	return maze;
}

export function getEntranceCoordinates(
	maze: Maze,
	position: EntrancePosition
): { x: number; y: number } {
	switch (position) {
		case 'top-left':
			return { x: 0, y: 0 };
		case 'top-right':
			return { x: maze.width - 1, y: 0 };
		case 'bottom-left':
			return { x: 0, y: maze.height - 1 };
		case 'bottom-right':
			return { x: maze.width - 1, y: maze.height - 1 };
		case 'center':
			return { x: Math.floor(maze.width / 2), y: Math.floor(maze.height / 2) };
	}
}

// Serialize maze layout to a compressed string
export function serializeMaze(maze: Maze): string {
	const walls: string[] = [];
	for (const row of maze.cells) {
		for (const cell of row) {
			// Encode each cell's walls as a hex digit (0-15)
			// bit 0: top, bit 1: right, bit 2: bottom, bit 3: left
			let value = 0;
			if (cell.walls.top) value |= 1;
			if (cell.walls.right) value |= 2;
			if (cell.walls.bottom) value |= 4;
			if (cell.walls.left) value |= 8;
			walls.push(value.toString(16));
		}
	}
	return walls.join('');
}

// Deserialize maze layout from a compressed string
export function deserializeMaze(data: string, width: number, height: number): Maze {
	const cells: Cell[][] = [];
	let dataIndex = 0;

	for (let y = 0; y < height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < width; x++) {
			const value = parseInt(data[dataIndex] || '0', 16);
			row.push({
				x,
				y,
				walls: {
					top: (value & 1) !== 0,
					right: (value & 2) !== 0,
					bottom: (value & 4) !== 0,
					left: (value & 8) !== 0
				},
				visited: false
			});
			dataIndex++;
		}
		cells.push(row);
	}

	return { width, height, cells };
}
