# Maze Generator Project Context

## Project Overview

This is a **Maze Generator** application built with **Svelte 5** and **SvelteKit**. It visualizes maze generation and solving algorithms, allowing users to create custom mazes, interact with them, and understand the underlying logic.

## Tech Stack & Architecture

*   **Framework:** Svelte 5 (Runes syntax) + SvelteKit
*   **Language:** TypeScript (Strict mode)
*   **Styling:** TailwindCSS v4 (configured via Vite plugin)
*   **Testing:**
    *   **Unit:** Vitest
    *   **E2E:** Playwright
*   **Build Tool:** Vite

## Key Files & Directories

*   `src/lib/maze.ts`: Core logic for maze generation (DFS Backtracking) and solving (BFS). Contains types for `Maze`, `Cell`, `Point`.
*   `src/routes/+page.svelte`: Main application UI. Handles state, user interaction, rendering (SVG-based), and visualization logic.
*   `src/routes/layout.css`: TailwindCSS directives.
*   `src/lib/`: Shared utilities and assets.
*   `e2e/`: End-to-end tests using Playwright.
*   `vite.config.ts`: Vite configuration, including plugins for Svelte and TailwindCSS.

## Development Workflow

### 1. Installation & Setup
```bash
npm install
```

### 2. Running Development Server
```bash
npm run dev        # Start dev server
npm run dev -- --open # Start and open browser
```

### 3. Building for Production
```bash
npm run build      # Build the application
npm run preview    # Preview the built application
```

### 4. Testing
```bash
npm run test       # Run all tests (Unit + E2E)
npm run test:unit  # Run unit tests only (Vitest)
npm run test:e2e   # Run E2E tests only (Playwright)
```

### 5. Quality Assurance
```bash
npm run check      # Svelte type checking
npm run lint       # Linting (ESLint + Prettier)
npm run format     # Format code (Prettier)
```

## Coding Conventions

*   **Svelte 5 Runes:** Use `$state`, `$derived`, `$effect`, and `$props` for reactivity. Avoid legacy Svelte stores where runes are appropriate.
*   **TypeScript:** Ensure all variables and functions are strictly typed. Use interfaces/types defined in `src/lib/maze.ts`.
*   **TailwindCSS:** Use utility classes for styling.
*   **Formatting:** Follow Prettier configuration (single quotes, no trailing commas, tab indentation).

## Feature Highlights

*   **Generation:** Randomized Prim's or DFS algorithm (specifically DFS Backtracking in `maze.ts`).
*   **Solving:** BFS algorithm to find the shortest path.
*   **Persistence:** Saves maze state and user modifications (toggled walls) to `localStorage`.
*   **URL State:** Syncs maze parameters (width, height, difficulty) with URL hash for sharing.
*   **Interactivity:** Users can manually toggle walls.
*   **Visualization:** Step-by-step educational visualization of the generation algorithm.
