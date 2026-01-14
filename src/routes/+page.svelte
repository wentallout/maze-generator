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
	const MAX_DIFFICULTY = 10;
	const DEFAULT_DIFFICULTY = 1;

	const CELL_SIZE = 30;
	const AXIS_LABEL_SIZE = 40;
	const AXIS_LABEL_OFFSET = 8;
	const AXIS_LABEL_PADDING = 10;
	const WALL_THICKNESS = 4;
	const WALL_HITBOX_WIDTH = 12;
	const SOLUTION_PATH_WIDTH = 3;

	const COLOR_WALL_NOT_BUILT = 'rgba(255, 255, 255, 0.1)';
	const COLOR_WALL_BUILT = '#8b5cf6'; // accent-primary
	const COLOR_CELL_BACKGROUND = '#06b6d4'; // accent-secondary
	const COLOR_CELL_OPACITY = '0.05';
	const COLOR_MAZE_BACKGROUND = 'transparent';
	const COLOR_ENTRANCE = '#10b981'; // Emerald
	const COLOR_EXIT = '#f43f5e'; // accent-tertiary
	const COLOR_SOLUTION_PATH = '#22c55e'; // Vibrant Green
	const COLOR_AXIS_LABEL = 'rgba(255, 255, 255, 0.5)';

	const MARKER_RADIUS_RATIO = 2.5;
	const MARKER_OPACITY = '1';

	// Fixed entrance and exit positions
	const ENTRANCE_POSITION = 'top-left';
	const EXIT_POSITION = 'opposite';

	// State
	let width = $state(DEFAULT_MAZE_SIZE);
	let height = $state(DEFAULT_MAZE_SIZE);
	let difficulty = $state(5); // Balanced middle difficulty
	let maze = $state<Maze | null>(null);
	let solutionPath = $state<Point[]>([]);
	let toggledWalls = new SvelteSet<string>();
	let isInitialLoad = $state(true); // Track if this is initial load
	let isGenerating = $state(false); // Track if maze is being generated
	let isSidebarVisible = $state(true); // Toggle for the config sidebar

	// Navigation State
	let viewportContainer = $state<HTMLDivElement | null>(null);
	let isPanning = $state(false);
	let panStartX = 0;
	let panStartY = 0;
	let panScrollLeft = 0;
	let panScrollTop = 0;
	let dragDistance = 0;

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

			// Debug: count walls in the maze
			let wallCount = 0;
			let cellCount = 0;
			for (const row of maze.cells) {
				for (const cell of row) {
					cellCount++;
					if (cell.walls.top) wallCount++;
					if (cell.walls.right) wallCount++;
					if (cell.walls.bottom) wallCount++;
					if (cell.walls.left) wallCount++;
				}
			}
			console.log(`Maze generated: ${cellCount} cells, ${wallCount} walls (${((wallCount / (cellCount * 4)) * 100).toFixed(1)}% of max)`);
		}

		isGenerating = false;
	}

	function resetAndClear() {
		if (typeof window === 'undefined') return;
		localStorage.clear();
		maze = null;
		solutionPath = [];
		toggledWalls.clear();
		console.log('Cleared all data');
	}

	function toggleWall(cell: Cell, wall: 'top' | 'right' | 'bottom' | 'left') {
		if (dragDistance > 5) return; // Prevent toggle if user was dragging
		const key = `${cell.x}-${cell.y}-${wall}`;
		if (toggledWalls.has(key)) {
			toggledWalls.delete(key);
		} else {
			toggledWalls.add(key);
		}
	}

	// Panning implementation
	function startPanning(e: MouseEvent) {
		if (e.button !== 0) return; // Only left click
		if ((e.target as HTMLElement).closest('g.cursor-pointer')) {
			// If we clicked a wall, we might still want to allow drag if they move enough, 
			// but for now let's just reset distance to allow the click to fire if they don't move.
			dragDistance = 0;
		}

		isPanning = true;
		dragDistance = 0;
		if (!viewportContainer) return;
		panStartX = e.pageX - viewportContainer.offsetLeft;
		panStartY = e.pageY - viewportContainer.offsetTop;
		panScrollLeft = viewportContainer.scrollLeft;
		panScrollTop = viewportContainer.scrollTop;
	}

	function handlePanning(e: MouseEvent) {
		if (!isPanning || !viewportContainer) return;
		e.preventDefault();
		const x = e.pageX - viewportContainer.offsetLeft;
		const y = e.pageY - viewportContainer.offsetTop;
		const walkX = x - panStartX;
		const walkY = y - panStartY;
		
		dragDistance = Math.sqrt(walkX * walkX + walkY * walkY);
		
		viewportContainer.scrollLeft = panScrollLeft - walkX;
		viewportContainer.scrollTop = panScrollTop - walkY;
	}

	function stopPanning() {
		isPanning = false;
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

	// Create mini example mazes for algorithm visualization
	const MINI_CELL_SIZE = 50;

	// Step 1: Empty grid with start
	const step1Cells: Cell[][] = [];
	for (let y = 0; y < 4; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < 4; x++) {
			row.push({
				x, y,
				walls: { top: true, right: true, bottom: true, left: true },
				visited: x === 0 && y === 0
			});
		}
		step1Cells.push(row);
	}
	const step1Maze: Maze = { width: 4, height: 4, cells: step1Cells };

	// Step 2: Show neighbors
	const step2Cells: Cell[][] = [];
	for (let y = 0; y < 4; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < 4; x++) {
			row.push({
				x, y,
				walls: { top: true, right: true, bottom: true, left: true },
				visited: x === 0 && y === 0
			});
		}
		step2Cells.push(row);
	}
	const step2Maze: Maze = { width: 4, height: 4, cells: step2Cells };

	// Step 3: Move right, remove wall
	const step3Cells: Cell[][] = [];
	for (let y = 0; y < 4; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < 4; x++) {
			row.push({
				x, y,
				walls: { top: true, right: true, bottom: true, left: true },
				visited: (x === 0 && y === 0) || (x === 1 && y === 0)
			});
		}
		step3Cells.push(row);
	}
	step3Cells[0][0].walls.right = false;
	step3Cells[0][1].walls.left = false;
	const step3Maze: Maze = { width: 4, height: 4, cells: step3Cells };

	// Step 4: Continue path, hit dead end
	const step4Cells: Cell[][] = [];
	for (let y = 0; y < 4; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < 4; x++) {
			row.push({
				x, y,
				walls: { top: true, right: true, bottom: true, left: true },
				visited: false
			});
		}
		step4Cells.push(row);
	}
	const path4 = [{x:0,y:0}, {x:1,y:0}, {x:2,y:0}, {x:2,y:1}];
	for (const p of path4) {
		step4Cells[p.y][p.x].visited = true;
	}
	step4Cells[0][0].walls.right = false;
	step4Cells[0][1].walls.left = false;
	step4Cells[0][1].walls.right = false;
	step4Cells[0][2].walls.left = false;
	step4Cells[0][2].walls.bottom = false;
	step4Cells[1][2].walls.top = false;
	const step4Maze: Maze = { width: 4, height: 4, cells: step4Cells };

	// Step 5: Backtrack
	const step5Cells: Cell[][] = [];
	for (let y = 0; y < 4; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < 4; x++) {
			row.push({
				x, y,
				walls: { top: true, right: true, bottom: true, left: true },
				visited: false
			});
		}
		step5Cells.push(row);
	}
	for (const p of path4) {
		step5Cells[p.y][p.x].visited = true;
	}
	step5Cells[0][0].walls.right = false;
	step5Cells[0][1].walls.left = false;
	step5Cells[0][1].walls.right = false;
	step5Cells[0][2].walls.left = false;
	step5Cells[0][2].walls.bottom = false;
	step5Cells[1][2].walls.top = false;
	const step5Maze: Maze = { width: 4, height: 4, cells: step5Cells };

	// Step 6: Complete mini maze
	const step6Cells: Cell[][] = [];
	for (let y = 0; y < 4; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < 4; x++) {
			row.push({
				x, y,
				walls: { top: true, right: true, bottom: true, left: true },
				visited: true
			});
		}
		step6Cells.push(row);
	}
	step6Cells[0][0].walls.right = false;
	step6Cells[0][1].walls.left = false;
	step6Cells[0][1].walls.bottom = false;
	step6Cells[1][1].walls.top = false;
	step6Cells[1][1].walls.right = false;
	step6Cells[1][2].walls.left = false;
	step6Cells[0][2].walls.bottom = false;
	step6Cells[1][2].walls.top = false;
	step6Cells[1][2].walls.right = false;
	step6Cells[1][3].walls.left = false;
	step6Cells[1][3].walls.bottom = false;
	step6Cells[2][3].walls.top = false;
	step6Cells[2][3].walls.left = false;
	step6Cells[2][2].walls.right = false;
	step6Cells[2][2].walls.bottom = false;
	step6Cells[3][2].walls.top = false;
	step6Cells[2][0].walls.bottom = false;
	step6Cells[3][0].walls.top = false;
	step6Cells[3][0].walls.right = false;
	step6Cells[3][1].walls.left = false;
	const step6Maze: Maze = { width: 4, height: 4, cells: step6Cells };
</script>

<div class="max-w-[1600px] mx-auto px-4 py-8 md:py-12">
	<header class="text-center mb-10 md:mb-16 relative">
		<button 
			onclick={() => isSidebarVisible = !isSidebarVisible}
			class="absolute left-0 top-1/2 -translate-y-1/2 glass p-3 rounded-xl hover:bg-violet-500/10 transition-colors group z-50"
			title={isSidebarVisible ? "Hide Controls" : "Show Controls"}
		>
			<span class="text-xl transition-transform duration-300 inline-block {isSidebarVisible ? 'rotate-180' : ''}">
				{isSidebarVisible ? '◀' : '▶'}
			</span>
			<span class="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
				{isSidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
			</span>
		</button>

		<h1 class="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
			Maze Forge
		</h1>
		<p class="text-slate-400 text-lg">Generate, solve, and interact with complex mazes in real-time.</p>
	</header>

	<div class="grid grid-cols-1 {isSidebarVisible ? 'lg:grid-cols-12' : 'grid-cols-1'} gap-8 items-start transition-all duration-500">
		<!-- Sidebar Controls -->
		<aside class="{isSidebarVisible ? 'lg:col-span-4' : 'hidden'} space-y-6 transition-all duration-500 overflow-hidden">
			<div class="glass-card">
				<h2 class="text-xl font-bold mb-6 flex items-center gap-2 text-white">
					<span class="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">⚙️</span>
					Configuration
				</h2>
				
				<div class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="width" class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Width</label>
							<input
								id="width"
								type="number"
								min={MIN_MAZE_SIZE}
								max={MAX_MAZE_SIZE}
								bind:value={width}
								class="input-premium"
							/>
						</div>
						<div>
							<label for="height" class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Height</label>
							<input
								id="height"
								type="number"
								min={MIN_MAZE_SIZE}
								max={MAX_MAZE_SIZE}
								bind:value={height}
								class="input-premium"
							/>
						</div>
					</div>

					<div>
						<label for="difficulty" class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Difficulty: {difficulty}</label>
						<input
							id="difficulty"
							type="range"
							min={MIN_DIFFICULTY}
							max={MAX_DIFFICULTY}
							bind:value={difficulty}
							class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
						/>
						<div class="flex justify-between text-[10px] text-slate-600 font-bold mt-1">
							<span>SIMPLE</span>
							<span>COMPLEX</span>
						</div>
					</div>
					
					<div class="pt-4 space-y-3">
						<button
							onclick={generate}
							disabled={isGenerating}
							class="btn-primary w-full flex items-center justify-center gap-2"
						>
							{#if isGenerating}
								<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
								Generating...
							{:else}
								<span>Generate Maze</span>
							{/if}
						</button>

						<button
							onclick={resetAndClear}
							class="btn-danger w-full"
						>
							Reset Layout
						</button>
					</div>
				</div>
			</div>

			{#if maze}
				<div class="glass-card">
					<h2 class="text-xl font-bold mb-6 flex items-center gap-2 text-white">
						<span class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">🛠️</span>
						Build Progress
					</h2>
					
					<div class="relative pt-1">
						<div class="flex mb-2 items-center justify-between">
							<div>
								<span class="text-xs font-bold inline-block py-1 px-2 uppercase rounded-full text-cyan-400 bg-cyan-400/10">
									Interactive Walls
								</span>
							</div>
							<div class="text-right">
								<span class="text-sm font-bold inline-block text-cyan-400">
									{completion}%
								</span>
							</div>
						</div>
						<div class="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-slate-800">
							<div
								style="width: {completion}%"
								class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
							></div>
						</div>
					</div>
					
					<div class="flex flex-col gap-3 mt-4 text-xs text-slate-400">
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2">
								<span class="w-2 h-2 rounded-full bg-slate-700"></span>
								Remaining Walls
							</span>
							<span class="text-white font-mono">{(width * height * 4) - toggledWalls.size}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2">
								<span class="w-2 h-2 rounded-full bg-violet-500"></span>
								Active Walls
							</span>
							<span class="text-white font-mono">{toggledWalls.size}</span>
						</div>
					</div>
					<p class="text-[11px] text-slate-500 mt-6 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-white/5 italic">
						* Click on the maze walls to mark them.
					</p>
				</div>
			{/if}
		</aside>

		<!-- Maze Viewport -->
		<main class="{isSidebarVisible ? 'lg:col-span-8' : 'w-full'} flex flex-col gap-6 transition-all duration-500">
	{#if isInitialLoad}
		<div class="glass-card flex flex-col items-center justify-center py-32">
			<div class="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
			<p class="mt-6 text-slate-400 font-medium animate-pulse">Initializing Interface...</p>
		</div>
	{:else if maze}
		{@const entrance = getEntranceCoordinates(maze, ENTRANCE_POSITION)}
		{@const exit = getExitCoordinates(maze, ENTRANCE_POSITION, EXIT_POSITION)}
		<div class="glass-card p-0 overflow-hidden relative group">
			<!-- Loading Overlay -->
			{#if isGenerating}
				<div class="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20 transition-all">
					<div class="flex flex-col items-center gap-4">
						<div class="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
						<p class="text-sm font-bold text-cyan-400 uppercase tracking-widest">Forging Maze...</p>
					</div>
				</div>
			{/if}
			
			<div 
				bind:this={viewportContainer}
				onmousedown={startPanning}
				onmousemove={handlePanning}
				onmouseup={stopPanning}
				onmouseleave={stopPanning}
				class="overflow-auto p-4 md:p-8 bg-slate-950/20 min-h-[400px] max-h-[75vh] {isPanning ? 'cursor-grabbing select-none' : 'cursor-grab'}"
			>
				<div class="inline-block relative min-w-full pointer-events-none">
					<div class="flex justify-center pointer-events-auto">
						<div class="relative">
							<!-- Glow Effect behind SVG -->
							<div class="absolute -inset-10 bg-violet-600/5 blur-[80px] rounded-full pointer-events-none"></div>
							<div class="absolute -inset-10 bg-cyan-600/5 blur-[80px] rounded-full pointer-events-none animate-pulse"></div>
							
							<svg
								width={maze.width * CELL_SIZE + AXIS_LABEL_SIZE * 2}
								height={maze.height * CELL_SIZE + AXIS_LABEL_SIZE * 2}
								class="relative z-10"
							>
						<!-- Draw Axis Labels -->
						{#each maze.cells as row, y (y)}
							<text
								x={AXIS_LABEL_SIZE - AXIS_LABEL_PADDING}
								y={y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
								text-anchor="end"
								dominant-baseline="middle"
								fill={COLOR_AXIS_LABEL}
								class="text-[11px] font-mono font-bold"
							>
								{y + 1}
							</text>
							<text
								x={maze.width * CELL_SIZE + AXIS_LABEL_SIZE + AXIS_LABEL_PADDING}
								y={y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
								text-anchor="start"
								dominant-baseline="middle"
								fill={COLOR_AXIS_LABEL}
								class="text-[11px] font-mono font-bold"
							>
								{y + 1}
							</text>
						{/each}

						{#each maze.cells[0] as cell, x (cell.x)}
							<text
								x={x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
								y={AXIS_LABEL_SIZE - AXIS_LABEL_PADDING}
								text-anchor="middle"
								dominant-baseline="auto"
								fill={COLOR_AXIS_LABEL}
								class="text-[11px] font-mono font-bold"
							>
								{x + 1}
							</text>
							<text
								x={x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
								y={maze.height * CELL_SIZE + AXIS_LABEL_SIZE + AXIS_LABEL_OFFSET + AXIS_LABEL_PADDING}
								text-anchor="middle"
								dominant-baseline="top"
								fill={COLOR_AXIS_LABEL}
								class="text-[11px] font-mono font-bold"
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
							fill="rgba(255,255,255,0.02)"
						/>

						<!-- Draw solution path with arrows -->
						{#if solutionPath.length > 1}
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
								class="pointer-events-none opacity-90 drop-shadow-[0_0_3px_rgba(34,197,94,0.5)]"
							/>

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
									<g transform="translate({midX}, {midY}) rotate({angle})" class="pointer-events-none opacity-80">
										<polygon points="-4,-2 4,0 -4,2" fill={COLOR_SOLUTION_PATH} />
									</g>
								{/if}
							{/each}
						{/if}

						<!-- Draw walls and cells -->
						{#each maze.cells as row, y (y)}
							{#each row as cell, x (cell.x)}
								{@const cx = cell.x * CELL_SIZE + AXIS_LABEL_SIZE}
								{@const cy = cell.y * CELL_SIZE + AXIS_LABEL_SIZE}

								<rect
									x={cx + 1}
									y={cy + 1}
									width={CELL_SIZE - 2}
									height={CELL_SIZE - 2}
									fill={COLOR_CELL_BACKGROUND}
									opacity={COLOR_CELL_OPACITY}
								/>

								<!-- Wall rendering with improved interaction -->
								{#each [
									{ dir: 'top', wx: 0, wy: 0, ww: CELL_SIZE, wh: WALL_THICKNESS },
									{ dir: 'right', wx: CELL_SIZE, wy: 0, ww: WALL_THICKNESS, wh: CELL_SIZE },
									{ dir: 'bottom', wx: 0, wy: CELL_SIZE, ww: CELL_SIZE, wh: WALL_THICKNESS },
									{ dir: 'left', wx: 0, wy: 0, ww: WALL_THICKNESS, wh: CELL_SIZE }
								] as wallInfo}
									{@const { dir, wx, wy, ww, wh } = wallInfo}
									{#if cell.walls[dir as keyof typeof cell.walls]}
										<g class="cursor-pointer group/wall" onclick={() => toggleWall(cell, dir as any)}>
											<!-- Hitbox -->
											<rect
												x={cx + wx - (ww === WALL_THICKNESS ? WALL_HITBOX_WIDTH/2 : 0)}
												y={cy + wy - (wh === WALL_THICKNESS ? WALL_HITBOX_WIDTH/2 : 0)}
												width={ww === WALL_THICKNESS ? WALL_HITBOX_WIDTH : ww}
												height={wh === WALL_THICKNESS ? WALL_HITBOX_WIDTH : wh}
												fill="transparent"
											/>
											<!-- Wall -->
											<rect
												x={cx + wx - (ww === WALL_THICKNESS ? WALL_THICKNESS/2 : 0)}
												y={cy + wy - (wh === WALL_THICKNESS ? WALL_THICKNESS/2 : 0)}
												width={ww}
												height={wh}
												rx={WALL_THICKNESS/2}
												fill={isWallToggled(cell, dir as any) ? COLOR_WALL_BUILT : COLOR_WALL_NOT_BUILT}
												class="transition-all duration-300 pointer-events-none"
											/>
											<!-- Hover Glow -->
											<rect
												x={cx + wx - (ww === WALL_THICKNESS ? WALL_THICKNESS/2 : 0)}
												y={cy + wy - (wh === WALL_THICKNESS ? WALL_THICKNESS/2 : 0)}
												width={ww}
												height={wh}
												rx={WALL_THICKNESS/2}
												fill="white"
												class="opacity-0 group-hover/wall:opacity-20 transition-opacity duration-150 pointer-events-none"
											/>
										</g>
									{/if}
								{/each}

								<!-- Intersections -->
								{#if (cell.walls.top && cell.walls.left) || (cell.walls.top && cell.walls.right) || (cell.walls.bottom && cell.walls.left) || (cell.walls.bottom && cell.walls.right)}
									{#each [
										{ cxo: 0, cyo: 0, w1: 'top', w2: 'left' },
										{ cxo: CELL_SIZE, cyo: 0, w1: 'top', w2: 'right' },
										{ cxo: 0, cyo: CELL_SIZE, w1: 'bottom', w2: 'left' },
										{ cxo: CELL_SIZE, cyo: CELL_SIZE, w1: 'bottom', w2: 'right' }
									] as cornerInfo}
										{@const { cxo, cyo, w1, w2 } = cornerInfo}
										{#if cell.walls[w1 as keyof typeof cell.walls] && cell.walls[w2 as keyof typeof cell.walls]}
											<rect
												x={cx + cxo - WALL_THICKNESS/2}
												y={cy + cyo - WALL_THICKNESS/2}
												width={WALL_THICKNESS}
												height={WALL_THICKNESS}
												rx={WALL_THICKNESS/4}
												fill={isWallToggled(cell, w1 as any) || isWallToggled(cell, w2 as any) ? COLOR_WALL_BUILT : COLOR_WALL_NOT_BUILT}
												class="transition-colors duration-300"
											/>
										{/if}
									{/each}
								{/if}
							{/each}
						{/each}

						<!-- Markers with Glow -->
						<defs>
							<radialGradient id="startGlow">
								<stop offset="0%" stop-color={COLOR_ENTRANCE} stop-opacity="0.3" />
								<stop offset="100%" stop-color={COLOR_ENTRANCE} stop-opacity="0" />
							</radialGradient>
							<radialGradient id="exitGlow">
								<stop offset="0%" stop-color={COLOR_EXIT} stop-opacity="0.3" />
								<stop offset="100%" stop-color={COLOR_EXIT} stop-opacity="0" />
							</radialGradient>
						</defs>

						<circle
							cx={entrance.x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							cy={entrance.y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							r={CELL_SIZE}
							fill="url(#startGlow)"
							class="pointer-events-none"
						/>
						<circle
							cx={entrance.x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							cy={entrance.y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							r={CELL_SIZE / MARKER_RADIUS_RATIO}
							fill={COLOR_ENTRANCE}
							stroke="white"
							stroke-width="2"
							class="pointer-events-none"
						/>

						<circle
							cx={exit.x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							cy={exit.y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							r={CELL_SIZE}
							fill="url(#exitGlow)"
							class="pointer-events-none"
						/>
						<circle
							cx={exit.x * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							cy={exit.y * CELL_SIZE + CELL_SIZE / 2 + AXIS_LABEL_SIZE}
							r={CELL_SIZE / MARKER_RADIUS_RATIO}
							fill={COLOR_EXIT}
							stroke="white"
							stroke-width="2"
							class="pointer-events-none"
						/>
					</svg>
				</div>
			</div>
		</div>
	</div>
</div>
{/if}
</main>
</div>

	<!-- Algorithm Visualizer -->
	{#if maze}
		<section class="mt-8 space-y-8">
			<div class="glass-card">
				<h2 class="text-2xl font-black mb-8 flex items-center gap-3">
					<span class="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-xl">🧩</span>
					Algorithm Walkthrough
				</h2>

				{#snippet miniMaze(maze: Maze, highlightCell: Point | null, currentCell: Point | null, backtrackPath: Point[] | null)}
					<div class="relative group/mini p-4 rounded-2xl bg-slate-950/40 border border-white/5">
						<svg width={maze.width * MINI_CELL_SIZE + 2} height={maze.height * MINI_CELL_SIZE + 2} class="overflow-visible">
							{#each maze.cells as row, y}
								{#each row as cell, x}
									{@const cx = cell.x * MINI_CELL_SIZE + MINI_CELL_SIZE/2}
									{@const cy = cell.y * MINI_CELL_SIZE + MINI_CELL_SIZE/2}
									{@const isHighlight = highlightCell && highlightCell.x === x && highlightCell.y === y}
									{@const isCurrent = currentCell && currentCell.x === x && currentCell.y === y}
									{@const isBacktrack = backtrackPath && backtrackPath.some(p => p.x === x && p.y === y)}

									<!-- Background -->
									<rect
										x={cell.x * MINI_CELL_SIZE}
										y={cell.y * MINI_CELL_SIZE}
										width={MINI_CELL_SIZE}
										height={MINI_CELL_SIZE}
										fill={isCurrent ? "rgba(139, 92, 246, 0.2)" : (isHighlight ? "rgba(6, 182, 212, 0.2)" : (isBacktrack ? "rgba(244, 63, 94, 0.2)" : (cell.visited ? "rgba(16, 185, 129, 0.1)" : "transparent")))}
										class="transition-colors duration-500"
									/>

									<!-- Walls -->
									{#each [
										{ dir: 'top', wx: 0, wy: 0, ww: MINI_CELL_SIZE, wh: 2 },
										{ dir: 'right', wx: MINI_CELL_SIZE, wy: 0, ww: 2, wh: MINI_CELL_SIZE },
										{ dir: 'bottom', wx: 0, wy: MINI_CELL_SIZE, ww: MINI_CELL_SIZE, wh: 2 },
										{ dir: 'left', wx: 0, wy: 0, ww: 2, wh: MINI_CELL_SIZE }
									] as wallInfo}
										{@const { dir, wx, wy, ww, wh } = wallInfo}
										{#if cell.walls[dir as keyof typeof cell.walls]}
											<rect 
												x={cell.x * MINI_CELL_SIZE + wx - (ww === 2 ? 1 : 0)} 
												y={cell.y * MINI_CELL_SIZE + wy - (wh === 2 ? 1 : 0)} 
												width={ww} 
												height={wh} 
												fill="rgba(255,255,255,0.2)"
											/>
										{/if}
									{/each}

									{#if isCurrent}
										<text x={cx} y={cy} text-anchor="middle" dominant-baseline="middle" class="text-xl">🐭</text>
										<circle cx={cx} cy={cy} r={MINI_CELL_SIZE/2} fill="rgba(139, 92, 246, 0.2)" class="animate-ping"/>
									{/if}
								{/each}
							{/each}
						</svg>
					</div>
				{/snippet}

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<!-- Step Cards -->
					<div class="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
						<div class="flex items-center gap-3">
							<span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">01</span>
							<h3 class="font-bold text-white uppercase tracking-wider text-sm">Genesis</h3>
						</div>
						{@render miniMaze(step1Maze, {x:0, y:0}, {x:0, y:0}, null)}
						<p class="text-xs text-slate-400 leading-relaxed italic border-l-2 border-emerald-500/30 pl-3">We begin in the top-left sanctuary. All barriers remain impenetrable until exploration begins.</p>
					</div>

					<div class="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
						<div class="flex items-center gap-3">
							<span class="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold font-mono">02</span>
							<h3 class="font-bold text-white uppercase tracking-wider text-sm">Observation</h3>
						</div>
						<div class="flex gap-4">
							{@render miniMaze(step2Maze, {x:1, y:0}, {x:0, y:0}, null)}
							{@render miniMaze(step2Maze, {x:0, y:1}, {x:0, y:0}, null)}
						</div>
						<p class="text-xs text-slate-400 leading-relaxed italic border-l-2 border-cyan-500/30 pl-3">Scanning for adjacent temporal portals. Every unvisited node is a potential expansion vector.</p>
					</div>

					<div class="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
						<div class="flex items-center gap-3">
							<span class="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold font-mono">03</span>
							<h3 class="font-bold text-white uppercase tracking-wider text-sm">Expansion</h3>
						</div>
						{@render miniMaze(step3Maze, null, {x:1, y:0}, null)}
						<p class="text-xs text-slate-400 leading-relaxed italic border-l-2 border-violet-500/30 pl-3">Picking a random trajectory and deconstructing the barrier. Entropy fuels the path creation.</p>
					</div>
				</div>
			</div>

			<!-- More context cards -->
			<div class="grid md:grid-cols-2 gap-8">
				<div class="glass-card">
					<h3 class="text-xl font-bold mb-6 text-white">Why Depth-First Search?</h3>
					<div class="space-y-4">
						{#each [
							['Perfect Geometry', 'Ensures zero loops and exactly one valid path between any two points.', 'emerald'],
							['Visual Drama', 'Creates long, winding, and organic corridors through the grid.', 'violet'],
							['Resource Efficiency', 'Stateless execution using back-propagation (stack-based recursion).', 'cyan']
						] as [title, desc, color]}
							<div class="flex gap-4">
								<div class="mt-1 w-1.5 h-1.5 rounded-full bg-{color}-500 shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
								<div>
									<h4 class="text-sm font-bold text-slate-200 mb-1">{title}</h4>
									<p class="text-xs text-slate-500 leading-relaxed">{desc}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="glass-card">
					<h3 class="text-xl font-bold mb-6 text-white">Pathfinding Logic (BFS)</h3>
					<div class="p-4 rounded-xl bg-slate-950/40 border border-white/5">
						<p class="text-xs text-slate-400 leading-relaxed">
							While DFS creates the chaos, <strong class="text-slate-200">Breadth-First Search (BFS)</strong> provides the solution. 
							It radiates outward from the exit, level by level, ensuring that the first time it contacts the start, the path found is mathematically the shortest possible route.
						</p>
						<div class="mt-4 flex gap-2">
							<span class="px-2 py-1 rounded bg-violet-500/10 text-violet-400 text-[10px] uppercase font-bold tracking-tighter">Radially Efficient</span>
							<span class="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 text-[10px] uppercase font-bold tracking-tighter">Shortest Path Guaranteed</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	{/if}
</div>
