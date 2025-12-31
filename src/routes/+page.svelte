<script lang="ts">
	import {
		generateMaze,
		getEntranceCoordinates,
		getExitCoordinates,
		solveMaze,
		serializeMaze,
		deserializeMaze,
		type Maze,
		type Cell,
		type Point
	} from '$lib/maze';
	import { SvelteSet } from 'svelte/reactivity';

	// Constants
	const DEFAULT_MAZE_SIZE = 40;
	const MIN_MAZE_SIZE = 3;
	const MAX_MAZE_SIZE = 50;
	const MIN_DIFFICULTY = 1;
	const MAX_DIFFICULTY = 5;
	const DEFAULT_DIFFICULTY = 1;

	const CELL_SIZE = 30;
	const AXIS_LABEL_SIZE = 40;
	const AXIS_LABEL_OFFSET = 8;
	const AXIS_LABEL_PADDING = 10;
	const WALL_STROKE_WIDTH = 8;
	const SOLUTION_PATH_WIDTH = 3;

	const COLOR_WALL_NOT_BUILT = 'black';
	const COLOR_WALL_BUILT = '#eab308';
	const COLOR_CELL_BACKGROUND = '#9ca3af';
	const COLOR_CELL_OPACITY = '0.3';
	const COLOR_MAZE_BACKGROUND = 'transparent';
	const COLOR_ENTRANCE = 'green';
	const COLOR_EXIT = 'red';
	const COLOR_SOLUTION_PATH = 'red';
	const COLOR_AXIS_LABEL = 'black';

	const MARKER_RADIUS_RATIO = 4;
	const MARKER_OPACITY = '0.7';

	// Fixed entrance and exit positions
	const ENTRANCE_POSITION = 'top-left';
	const EXIT_POSITION = 'opposite';

	// State
	let width = $state(DEFAULT_MAZE_SIZE);
	let height = $state(DEFAULT_MAZE_SIZE);
	let difficulty = $state(MAX_DIFFICULTY);
	let maze = $state<Maze | null>(null);
	let solutionPath = $state<Point[]>([]);
	let toggledWalls = new SvelteSet<string>();
	let isInitialLoad = $state(true); // Track if this is initial load
	let isGenerating = $state(false); // Track if maze is being generated

	// Storage key
	const STORAGE_KEY = 'maze-generator-progress';

	// LocalStorage Management
	function saveToLocalStorage() {
		if (typeof window === 'undefined' || !maze) return;

		const data = {
			width,
			height,
			difficulty,
			mazeData: serializeMaze(maze),
			toggledWalls: Array.from(toggledWalls)
		};

		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

		console.log('Saved to localStorage:', {
			mazeSize: `${width}x${height}`,
			toggledWallsCount: toggledWalls.size,
			toggledWalls: Array.from(toggledWalls).slice(0, 5)
		});
	}

	function loadFromLocalStorage() {
		if (typeof window === 'undefined') return;

		console.log('[DEBUG] Attempting to load from localStorage...');
		const saved = localStorage.getItem(STORAGE_KEY);
		if (!saved) {
			console.log('[DEBUG] No saved data found in localStorage');
			return false;
		}

		console.log('[DEBUG] Found saved data, parsing...');
		try {
			const data = JSON.parse(saved);
			console.log('[DEBUG] Parsed data:', data);

			width = data.width || DEFAULT_MAZE_SIZE;
			height = data.height || DEFAULT_MAZE_SIZE;
			difficulty = data.difficulty || DEFAULT_DIFFICULTY;

			if (data.mazeData) {
				maze = deserializeMaze(data.mazeData, width, height);

				// Regenerate solution path after loading maze
				const entrance = getEntranceCoordinates(maze, ENTRANCE_POSITION);
				const exit = getExitCoordinates(maze, ENTRANCE_POSITION, EXIT_POSITION);
				solutionPath = solveMaze(maze, entrance, exit);
				console.log('[DEBUG] Maze loaded, solution path regenerated');
			}

			if (data.toggledWalls && Array.isArray(data.toggledWalls)) {
				console.log('[DEBUG] Loading toggled walls:', data.toggledWalls);
				toggledWalls.clear();
				for (const wall of data.toggledWalls) {
					toggledWalls.add(wall);
				}
				console.log('Loaded from localStorage:', {
					mazeSize: `${width}x${height}`,
					toggledWallsCount: toggledWalls.size,
					toggledWalls: Array.from(toggledWalls).slice(0, 5)
				});
			} else {
				console.log('Loaded from localStorage: no toggled walls found');
			}

			return true;
		} catch (err) {
			console.error('Failed to load from localStorage:', err);
			return false;
		}
	}

	function clearLocalStorage() {
		if (typeof window === 'undefined') return;
		localStorage.removeItem(STORAGE_KEY);
		console.log('Cleared localStorage');
	}

	// URL State Management
	function loadFromURL() {
		if (typeof window === 'undefined') return;

		const hash = location.hash.slice(1);
		if (!hash) {
			// No URL state, don't auto-generate
			return;
		}

		const params = new URLSearchParams(hash);

		const w = params.get('w');
		const h = params.get('h');
		const d = params.get('d');

		if (w) width = Math.max(MIN_MAZE_SIZE, Math.min(MAX_MAZE_SIZE, parseInt(w) || DEFAULT_MAZE_SIZE));
		if (h) height = Math.max(MIN_MAZE_SIZE, Math.min(MAX_MAZE_SIZE, parseInt(h) || DEFAULT_MAZE_SIZE));
		if (d) difficulty = Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, parseInt(d) || DEFAULT_DIFFICULTY));

		console.log('Loaded parameters from URL');
		// Note: Maze layout and toggled walls are loaded from localStorage, not URL
	}

	async function generate() {
		isGenerating = true;

		// Use setTimeout to allow the UI to update before generating
		await new Promise(resolve => setTimeout(resolve, 10));

		maze = generateMaze(width, height, difficulty);
		toggledWalls.clear();

		// Solve the maze
		if (maze) {
			const entrance = getEntranceCoordinates(maze, ENTRANCE_POSITION);
			const exit = getExitCoordinates(maze, ENTRANCE_POSITION, EXIT_POSITION);
			console.log('Generating maze - Entrance:', JSON.stringify(entrance), 'Exit:', JSON.stringify(exit));
			solutionPath = solveMaze(maze, entrance, exit);
			console.log('Solution path length:', solutionPath.length);
		}

		isGenerating = false;
	}

	function toggleWall(cell: Cell, wall: 'top' | 'right' | 'bottom' | 'left') {
		const key = `${cell.x}-${cell.y}-${wall}`;
		if (toggledWalls.has(key)) {
			toggledWalls.delete(key);
		} else {
			toggledWalls.add(key);
		}
		// No need to create new Set - SvelteSet is already reactive!
	}

	function isWallToggled(cell: Cell, wall: 'top' | 'right' | 'bottom' | 'left'): boolean {
		const key = `${cell.x}-${cell.y}-${wall}`;
		return toggledWalls.has(key);
	}

	let completion = $derived.by(() => {
		if (!maze) return 0;
		const totalWalls = maze.width * maze.height * 4;
		return totalWalls > 0 ? Math.round((toggledWalls.size / totalWalls) * 100) : 0;
	});

	// Watch for changes to maze parameters and update URL (but NOT maze layout or toggled walls)
	$effect(() => {
		if (typeof window === 'undefined' || !maze) return;

		// Update URL with parameters
		// Maze layout and toggled walls are stored in localStorage only
		const params = new URLSearchParams();
		params.set('w', width.toString());
		params.set('h', height.toString());
		params.set('d', difficulty.toString());

		const url = `#${params.toString()}`;
		if (location.hash !== `#${url}`) {
			console.log('Updating URL:', url);
			history.replaceState(null, '', url);
		}
	});

	// Auto-save to localStorage whenever toggledWalls change (but not during initial load)
	$effect(() => {
		if (typeof window === 'undefined' || !maze || isInitialLoad) return;

		// Track toggledWalls by accessing its size
		const _ = toggledWalls.size;
		saveToLocalStorage();
	});

	// Initialize: ALWAYS try localStorage first, then URL for parameters only
	if (typeof window !== 'undefined') {
		console.log('[DEBUG] Initializing...');

		// First, try to load everything from localStorage (maze + walls + parameters)
		if (loadFromLocalStorage()) {
			console.log('[DEBUG] Successfully loaded from localStorage');
		} else {
			// If no localStorage, try loading parameters from URL
			const hash = location.hash.slice(1);
			if (hash) {
				console.log('[DEBUG] No localStorage, loading parameters from URL');
				loadFromURL();
				// Generate a new maze since we only have parameters, not the maze itself
				generate();
			} else {
				console.log('[DEBUG] Starting fresh - no saved state');
			}
		}

		// Mark initial load as complete so auto-save can start working
		isInitialLoad = false;
		console.log('[DEBUG] Initialization complete, maze:', maze ? 'loaded' : 'none', 'toggled walls:', toggledWalls.size);
	}
</script>

<div class="container mx-auto p-4">
	<h1 class="text-3xl font-bold mb-6 text-center">Maze Generator</h1>

	<!-- Controls -->
	<div class="bg-white rounded-lg shadow-md p-6 mb-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label for="width" class="block text-sm font-medium mb-1">Width</label>
				<input
					id="width"
					type="number"
					min={MIN_MAZE_SIZE}
					max={MAX_MAZE_SIZE}
					bind:value={width}
					class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="height" class="block text-sm font-medium mb-1">Height</label>
				<input
					id="height"
					type="number"
					min={MIN_MAZE_SIZE}
					max={MAX_MAZE_SIZE}
					bind:value={height}
					class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
		</div>

		<button
			onclick={generate}
			class="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
		>
			Generate New Maze
		</button>
	</div>

	<!-- Completion Percentage -->
	{#if maze}
		{@const totalWalls = maze.cells.flat().filter(c => c.walls.top || c.walls.right || c.walls.bottom || c.walls.left).length * 4}
		<div class="bg-white rounded-lg shadow-md p-4 mb-6">
			<div class="flex items-center gap-4 mb-3">
				<div class="flex-1">
					<div class="flex items-center justify-between">
						<span class="text-lg font-medium">Build Progress</span>
						<span class="text-2xl font-bold {completion === 100 ? 'text-green-600' : 'text-blue-600'}">
							{completion}%
						</span>
					</div>
					<div class="mt-2 bg-gray-200 rounded-full h-3 overflow-hidden">
						<div
							class="h-full transition-all duration-300 {completion === 100
								? 'bg-green-500'
								: 'bg-blue-500'}"
							style="width: {completion}%"
						></div>
					</div>
				</div>
			</div>
			<div class="flex gap-6 text-sm">
				<div class="flex items-center gap-2">
					<div class="w-4 h-1 bg-gray-800"></div>
					<span>Not Built ({totalWalls - toggledWalls.size})</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="w-4 h-1 bg-yellow-500"></div>
					<span>Built ({toggledWalls.size})</span>
				</div>
			</div>
			<p class="text-sm text-gray-500 mt-2">
				Click walls to mark them as "built" in your game
			</p>
		</div>
	{/if}

	<!-- Maze Grid -->
	{#if isInitialLoad}
		<!-- Initial page load spinner -->
		<div class="bg-white rounded-lg shadow-md p-4">
			<div class="flex justify-center items-center py-20">
				<div class="flex flex-col items-center gap-4">
					<div class="w-20 h-20 border-6 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
					<p class="text-xl font-semibold text-gray-800">Loading maze...</p>
				</div>
			</div>
		</div>
	{:else if maze}
		{@const entrance = getEntranceCoordinates(maze, ENTRANCE_POSITION)}
		{@const exit = getExitCoordinates(maze, ENTRANCE_POSITION, EXIT_POSITION)}
		<div class="bg-white rounded-lg shadow-md p-4 overflow-auto">
			<div class="flex justify-center">
				<div class="relative">
					<!-- Loading Spinner -->
					{#if isGenerating}
						<div class="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-gray-100 z-10">
							<div class="flex flex-col items-center gap-4">
								<div class="w-20 h-20 border-6 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
								<p class="text-xl font-semibold text-gray-800">Generating maze...</p>
							</div>
						</div>
					{/if}
					<svg
						width={maze.width * CELL_SIZE + AXIS_LABEL_SIZE * 2}
						height={maze.height * CELL_SIZE + AXIS_LABEL_SIZE * 2}
						class="bg-white"
					>
						<!-- Draw Y axis labels (outside on the left) -->
						{#each maze.cells as row, y (y)}
							<text
								x={AXIS_LABEL_SIZE - AXIS_LABEL_PADDING}
								y={y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
								text-anchor="end"
								dominant-baseline="middle"
								fill={COLOR_AXIS_LABEL}
								font-size="14"
								font-weight="bold"
								font-family="monospace"
							>
								{y + 1}
							</text>
						{/each}

						<!-- Draw Y axis labels (outside on the right) -->
						{#each maze.cells as row, y (y)}
							<text
								x={maze.width * CELL_SIZE + AXIS_LABEL_SIZE + AXIS_LABEL_PADDING}
								y={y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
								text-anchor="start"
								dominant-baseline="middle"
								fill={COLOR_AXIS_LABEL}
								font-size="14"
								font-weight="bold"
								font-family="monospace"
							>
								{y + 1}
							</text>
						{/each}

						<!-- Draw X axis labels (outside on the top) -->
						{#each maze.cells[0] as cell, x (cell.x)}
							<text
								x={x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
								y={AXIS_LABEL_SIZE - AXIS_LABEL_PADDING}
								text-anchor="middle"
								dominant-baseline="auto"
								fill={COLOR_AXIS_LABEL}
								font-size="14"
								font-weight="bold"
								font-family="monospace"
							>
								{x + 1}
							</text>
						{/each}

						<!-- Draw X axis labels (outside on the bottom) -->
						{#each maze.cells[0] as cell, x (cell.x)}
							<text
								x={x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
								y={maze.height * CELL_SIZE + AXIS_LABEL_SIZE + AXIS_LABEL_OFFSET + AXIS_LABEL_PADDING}
								text-anchor="middle"
								dominant-baseline="top"
								fill={COLOR_AXIS_LABEL}
								font-size="14"
								font-weight="bold"
								font-family="monospace"
							>
								{x + 1}
							</text>
						{/each}

						<!-- Maze background -->
						<rect
							x={AXIS_LABEL_SIZE}
							y={AXIS_LABEL_SIZE}
							width={maze.width * CELL_SIZE}
							height={maze.height * CELL_SIZE}
							fill={COLOR_MAZE_BACKGROUND}
						/>

						<!-- Draw solution path with arrows -->
						{#if solutionPath.length > 1}
							<!-- Draw the path line -->
							<polyline
								fill="none"
								stroke={COLOR_SOLUTION_PATH}
								stroke-width={SOLUTION_PATH_WIDTH}
								stroke-linecap="round"
								stroke-linejoin="round"
								points={solutionPath
									.map(
										(p) =>
											`${p.x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE},${p.y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}`
									)
									.join(' ')}
								class="pointer-events-none"
							/>

							<!-- Draw arrows along the path -->
							{#each solutionPath as point, i}
								{#if i < solutionPath.length - 1}
									{@const nextPoint = solutionPath[i + 1]}
									{@const x1 = point.x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
									{@const y1 = point.y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
									{@const x2 = nextPoint.x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
									{@const y2 = nextPoint.y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
									{@const midX = (x1 + x2) / 2}
									{@const midY = (y1 + y2) / 2}
									{@const dx = x2 - x1}
									{@const dy = y2 - y1}
									{@const angle = Math.atan2(dy, dx) * 180 / Math.PI}
									<!-- Arrow marker at midpoint -->
									<g transform="translate({midX}, {midY}) rotate({angle})" class="pointer-events-none">
										<polygon
											points="-6,-3 6,0 -6,3"
											fill={COLOR_SOLUTION_PATH}
											opacity="0.8"
										/>
									</g>
								{/if}
							{/each}
						{/if}

						<!-- Draw walls and cells -->
						{#each maze.cells as row, y (y)}
							{#each row as cell, x (cell.x)}
								{@const cx = cell.x * CELL_SIZE + AXIS_LABEL_SIZE}
								{@const cy = cell.y * CELL_SIZE + AXIS_LABEL_SIZE}

								<!-- Cell background (drawn first so walls are on top) -->
								<rect
									x={cx + 1}
									y={cy + 1}
									width={CELL_SIZE - 2}
									height={CELL_SIZE - 2}
									fill={COLOR_CELL_BACKGROUND}
									opacity={COLOR_CELL_OPACITY}
								/>

								<!-- Top wall -->
								{#if cell.walls.top}
									<g class="cursor-pointer group" onclick={() => toggleWall(cell, 'top')}>
										<line
											x1={cx}
											y1={cy}
											x2={cx + CELL_SIZE}
											y2={cy}
											stroke={isWallToggled(cell, 'top') ? COLOR_WALL_BUILT : COLOR_WALL_NOT_BUILT}
											stroke-width={WALL_STROKE_WIDTH}
										/>
										<line
											x1={cx}
											y1={cy}
											x2={cx + CELL_SIZE}
											y2={cy}
											stroke="white"
											stroke-width={WALL_STROKE_WIDTH + 4}
											class="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
											pointer-events="none"
										/>
									</g>
								{/if}

								<!-- Right wall -->
								{#if cell.walls.right}
									<g class="cursor-pointer group" onclick={() => toggleWall(cell, 'right')}>
										<line
											x1={cx + CELL_SIZE}
											y1={cy}
											x2={cx + CELL_SIZE}
											y2={cy + CELL_SIZE}
											stroke={isWallToggled(cell, 'right') ? COLOR_WALL_BUILT : COLOR_WALL_NOT_BUILT}
											stroke-width={WALL_STROKE_WIDTH}
										/>
										<line
											x1={cx + CELL_SIZE}
											y1={cy}
											x2={cx + CELL_SIZE}
											y2={cy + CELL_SIZE}
											stroke="white"
											stroke-width={WALL_STROKE_WIDTH + 4}
											class="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
											pointer-events="none"
										/>
									</g>
								{/if}

								<!-- Bottom wall -->
								{#if cell.walls.bottom}
									<g class="cursor-pointer group" onclick={() => toggleWall(cell, 'bottom')}>
										<line
											x1={cx}
											y1={cy + CELL_SIZE}
											x2={cx + CELL_SIZE}
											y2={cy + CELL_SIZE}
											stroke={isWallToggled(cell, 'bottom') ? COLOR_WALL_BUILT : COLOR_WALL_NOT_BUILT}
											stroke-width={WALL_STROKE_WIDTH}
										/>
										<line
											x1={cx}
											y1={cy + CELL_SIZE}
											x2={cx + CELL_SIZE}
											y2={cy + CELL_SIZE}
											stroke="white"
											stroke-width={WALL_STROKE_WIDTH + 4}
											class="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
											pointer-events="none"
										/>
									</g>
								{/if}

								<!-- Left wall -->
								{#if cell.walls.left}
									<g class="cursor-pointer group" onclick={() => toggleWall(cell, 'left')}>
										<line
											x1={cx}
											y1={cy}
											x2={cx}
											y2={cy + CELL_SIZE}
											stroke={isWallToggled(cell, 'left') ? COLOR_WALL_BUILT : COLOR_WALL_NOT_BUILT}
											stroke-width={WALL_STROKE_WIDTH}
										/>
										<line
											x1={cx}
											y1={cy}
											x2={cx}
											y2={cy + CELL_SIZE}
											stroke="white"
											stroke-width={WALL_STROKE_WIDTH + 4}
											class="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
											pointer-events="none"
										/>
									</g>
								{/if}
							{/each}
						{/each}

						<!-- Entrance marker -->
						<circle
							cx={entrance.x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							cy={entrance.y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							r={CELL_SIZE / MARKER_RADIUS_RATIO}
							fill={COLOR_ENTRANCE}
							opacity={MARKER_OPACITY}
							class="pointer-events-none"
						/>
						<text
							x={entrance.x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							y={entrance.y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							text-anchor="middle"
							dominant-baseline="middle"
							fill="white"
							font-size="12"
							font-weight="bold"
							class="pointer-events-none"
						>
							S
						</text>

						<!-- Exit marker -->
						<circle
							cx={exit.x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							cy={exit.y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							r={CELL_SIZE / MARKER_RADIUS_RATIO}
							fill={COLOR_EXIT}
							opacity={MARKER_OPACITY}
							class="pointer-events-none"
						/>
						<text
							x={exit.x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							y={exit.y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							text-anchor="middle"
							dominant-baseline="middle"
							fill="white"
							font-size="12"
							font-weight="bold"
							class="pointer-events-none"
						>
							E
						</text>
					</svg>
				</div>
			</div>
		</div>
	{/if}
</div>
