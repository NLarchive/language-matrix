import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 12'] });

test.describe('Mobile UI Verification', () => {

  test('Main screen should not have horizontal overflow (vertical cut)', async ({ page }) => {
    await page.goto('http://localhost:8080'); // Assuming local server runs on 8080
    await page.waitForSelector('.matrix-table-container');

    // Check for horizontal overflow on body/html
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    // In some cases, the "vertical cut" might be visible as a gap or clipping.
    // We expect no horizontal overflow on the root elements.
    expect(hasOverflow).toBe(false);

    // Check if matrix-table-container is clipped or has weird left offset
    const containerRect = await page.locator('.matrix-table-container').boundingBox();
    expect(containerRect.width).toBeLessThanOrEqual(page.viewportSize().width + 1); // Allow 1px rounding
  });

  test('Word Composer buttons should not stay stuck after click', async ({ page }) => {
    await page.goto('http://localhost:8080');
    
    // Switch to Radicals tab
    await page.click('.tab-btn[data-tab="radicals"]');
    await page.waitForSelector('.word-composer');

    // Find and click 'Show Hints' button
    const hintBtn = page.locator('#highlight-radicals-btn');
    await hintBtn.click();
    
    // Check if it has 'active' class (this is intended behavior for hints)
    await expect(hintBtn).toHaveClass(/active/);
    
    // Click again to deactivate
    await hintBtn.click();
    await expect(hintBtn).not.toHaveClass(/active/);

    // Check normal buttons (like Skip) do not keep a "pressed" state visually
    const skipBtn = page.locator('#skip-word-btn');
    await skipBtn.dispatchEvent('touchstart');
    // On some browsers, :active might persist until touchend.
    // We want to ensure no persistent 'active' class is stuck if it's added via JS.
    await skipBtn.dispatchEvent('touchend');
    
    // Ensure no classes like 'pressed' or 'active' (JS-managed) remain
    const classes = await skipBtn.evaluate(el => el.className);
    expect(classes).not.toContain('pressed');
    expect(classes).not.toContain('touch-active');
  });
});
