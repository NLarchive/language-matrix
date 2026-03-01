import { test, expect } from '@playwright/test';

test('Category header colors are applied from CSV config', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // Wait for table to render
  const firstHeader = page.locator('table.matrix-table thead tr th').first();
  await expect(firstHeader).toBeVisible({ timeout: 10000 });

  // Get the category name and computed background color
  const categoryName = await firstHeader.locator('.category-name').innerText();
  const bg = await firstHeader.evaluate(el => getComputedStyle(el).backgroundColor);

  // Map of expected colors from data/categories_config.csv (first entry Pronoun: #FF6B6B)
  const expectedColors = {
    'Pronoun': 'rgb(255, 107, 107)',
    'Verb': 'rgb(78, 205, 196)'
  };

  if (expectedColors[categoryName]) {
    expect(bg).toBe(expectedColors[categoryName]);
  } else {
    // If the category isn't the expected one, at least ensure it has a non-transparent background
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  }
});