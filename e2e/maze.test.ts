import { expect, test } from '@playwright/test';

test('home page has maze generator title and maze grid after generation', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveText('Maze Generator');
	
	// Click "Generate New Maze" to ensure a maze is created
	const generateButton = page.getByRole('button', { name: /Generate New Maze/i });
	await generateButton.click();
	
	// Check if the maze SVG is present
	await expect(page.locator('svg')).toBeVisible({ timeout: 10000 });
	
	// Check for a few cells (rects) inside the SVG to ensure it's not empty
	const cells = page.locator('svg rect');
	await expect(cells.count()).toBeGreaterThan(0);
});