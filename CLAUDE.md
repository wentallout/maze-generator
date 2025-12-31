# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **maze-generator** built with Svelte 5 and SvelteKit. The project is a fresh SvelteKit scaffold using TypeScript, TailwindCSS v4, and modern tooling.

## Development Commands

### Core Development
```bash
npm run dev          # Start dev server (add --open to auto-open browser)
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Code Quality
```bash
npm run check        # Run svelte-check (type checking)
npm run check:watch  # Run svelte-check in watch mode
npm run lint         # Run Prettier check + ESLint
npm run format       # Format code with Prettier
```

### Testing
```bash
npm run test         # Run all tests (unit + e2e)
npm run test:unit    # Run unit tests with Vitest
npm run test:e2e     # Run E2E tests with Playwright

# Run specific tests with Vitest
npx vitest run path/to/test.spec.ts
```

## Architecture

### Tech Stack
- **Svelte 5** with SvelteKit (using latest runes syntax: `$state`, `$props`, `$derived`)
- **TypeScript** with strict mode enabled
- **TailwindCSS v4** via Vite plugin
- **Vitest** for unit testing (with Playwright browser runner for Svelte components)
- **Playwright** for E2E testing

### Project Structure
```
src/
├── routes/
│   ├── +layout.svelte      # Root layout (imports layout.css)
│   ├── +page.svelte        # Home page route
│   └── layout.css          # TailwindCSS stylesheet (Prettier configured to sort classes)
├── lib/
│   ├── assets/             # Static assets (importable)
│   └── index.ts            # Barrel file for $lib imports
└── app.d.ts                # Global type declarations
e2e/                        # Playwright E2E tests
```

### SvelteKit Configuration
- **Adapter**: `@sveltejs/adapter-netlify` (configured in `svelte.config.js`)
- **Preprocessing**: Vite-based preprocessing via `vitePreprocess()`
- **Path Aliases**: `$lib` points to `src/lib/` (auto-configured by SvelteKit)

### Testing Configuration

**Vitest** (vite.config.ts):
- Two test projects:
  - `client`: Browser-based tests using Playwright (`src/**/*.svelte.{test,spec}.{js,ts}`)
  - `server`: Node-based tests (`src/**/*.{test,spec}.{js,ts}`, excludes Svelte files)
- Assertions required (`expect.requireAssertions: true`)

**Playwright** (playwright.config.ts):
- WebServer: Runs `npm run build && npm run preview` on port 4173
- Test directory: `e2e/`

### Code Style (Prettier)
- Tabs for indentation
- Single quotes
- No trailing commas
- 100 char print width
- TailwindCSS class sorting enabled (targets `src/routes/layout.css`)

### ESLint Configuration
- TypeScript ESLint + Svelte ESLint recommended configs
- Prettier integration (no conflicts)
- `no-undef` disabled for TypeScript (handled by TS checker)
- Project service enabled for Svelte files

## Svelte MCP Server

You have access to the Svelte MCP server for Svelte 5 and SvelteKit documentation. Use it when working with Svelte-specific features.

### Available MCP Tools:

1. **list-sections** - Discover available documentation sections
2. **get-documentation** - Retrieve full documentation for sections
3. **svelte-autofixer** - Analyze Svelte code for issues (MUST use before writing Svelte code)
4. **playground-link** - Generate Svelte Playground links (only after user confirmation)

When asked about Svelte/SvelteKit topics, use `list-sections` first, then `get-documentation` to fetch relevant docs.
