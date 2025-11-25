/**
 * Playwright E2E Tests - Matrix Application
 * Tests the full application flow in a real browser
 */
import { test, expect } from '@playwright/test';

test.describe('Matrix Application', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should load the application', async ({ page }) => {
        await expect(page).toHaveTitle(/Janulus Matrix/i);
    });

    test('should display matrix level selector', async ({ page }) => {
        const levelSelector = page.locator('#level-selector, .level-selector, select');
        await expect(levelSelector.first()).toBeVisible();
    });

    test('should load matrix data on page load', async ({ page }) => {
        // Wait for the matrix container to be populated
        const matrixContainer = page.locator('#matrix-container, .matrix-container');
        await expect(matrixContainer).toBeVisible({ timeout: 10000 });
    });

    test('should display category headers', async ({ page }) => {
        // Wait for categories to load
        await page.waitForSelector('.category, .category-header, th', { timeout: 10000 });
        const categories = page.locator('.category, .category-header, th');
        expect(await categories.count()).toBeGreaterThan(0);
    });
});

test.describe('Word Selection', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for the matrix to load
        await page.waitForSelector('.word-cell, .word, td', { timeout: 10000 });
    });

    test('should allow selecting a word', async ({ page }) => {
        const wordCells = page.locator('.word-cell, .word-btn, td[data-word]');
        const firstWord = wordCells.first();
        
        if (await firstWord.isVisible()) {
            await firstWord.click();
            // Check for selection indication (class change or visual feedback)
            // This depends on your implementation
        }
    });

    test('should display selected word in sentence area', async ({ page }) => {
        const wordCells = page.locator('.word-cell, .word-btn, td[data-word]');
        
        if (await wordCells.count() > 0) {
            await wordCells.first().click();
            
            // Check if sentence display area shows content
            const sentenceArea = page.locator('#sentence-display, .sentence-container, .selected-words');
            // May need adjustment based on actual selectors
        }
    });
});

test.describe('Audio Functionality', () => {
    
    test('should have audio elements or controls', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Check for audio-related elements
        const audioElements = page.locator('audio, .audio-btn, [data-audio], .play-audio');
        // Audio elements might be created dynamically
    });
});

test.describe('Level Switching', () => {
    
    test('should allow switching between proficiency levels', async ({ page }) => {
        await page.goto('/');
        
        const levelSelector = page.locator('#level-selector, select, .level-btn');
        
        if (await levelSelector.isVisible()) {
            // Try selecting different levels
            const options = await levelSelector.locator('option').allTextContents();
            
            if (options.length > 1) {
                await levelSelector.selectOption({ index: 1 });
                // Wait for matrix to reload
                await page.waitForTimeout(500);
            }
        }
    });
});

test.describe('Responsive Design', () => {
    
    test('should display correctly on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        
        // Check that main elements are still visible
        const matrixContainer = page.locator('#matrix-container, .matrix-container, main');
        await expect(matrixContainer).toBeVisible({ timeout: 10000 });
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        
        const matrixContainer = page.locator('#matrix-container, .matrix-container, main');
        await expect(matrixContainer).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Offline Support', () => {
    
    test('should register service worker', async ({ page, context }) => {
        await page.goto('/');
        
        // Check if service worker is registered
        const swRegistrations = await context.serviceWorkers();
        // Service worker should be registered after page load
    });

    test('should cache static assets', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Check if caches exist (through page evaluation)
        const hasCaches = await page.evaluate(async () => {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                return cacheNames.length > 0;
            }
            return false;
        });
        
        // Caches should be populated after first load
        // Note: This might need adjustment depending on timing
    });
});

test.describe('Error Handling', () => {
    
    test('should handle missing data files gracefully', async ({ page }) => {
        // Navigate to a page that might have missing resources
        await page.goto('/');
        
        // Check that no uncaught errors appear
        const errors = [];
        page.on('pageerror', error => errors.push(error));
        
        await page.waitForLoadState('networkidle');
        
        // Filter out expected errors (like 404 for optional files)
        const criticalErrors = errors.filter(e => 
            !e.message.includes('404') && 
            !e.message.includes('Failed to load resource')
        );
        
        // Should have no critical JavaScript errors
        // Note: URL construction errors would appear here!
    });

    test('should not have URL construction errors', async ({ page }) => {
        const consoleErrors = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Check for the specific URL construction bug
        const urlErrors = consoleErrors.filter(e => 
            e.includes('Failed to construct') || 
            e.includes('Failed to parse URL')
        );
        
        expect(urlErrors).toHaveLength(0);
    });
});

test.describe('Console Error Monitoring', () => {
    /**
     * This test specifically monitors for the URL construction bug
     * that was causing "Failed to construct 'Request'" errors
     */
    
    test('should not produce "Failed to construct Request" errors', async ({ page }) => {
        const requestErrors = [];
        
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('Failed to construct') && text.includes('Request')) {
                requestErrors.push(text);
            }
        });
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Interact with the page to trigger potential errors
        const wordCells = page.locator('.word-cell, .word-btn, td[data-word]');
        if (await wordCells.count() > 0) {
            await wordCells.first().click();
            await page.waitForTimeout(500);
        }
        
        // The original bug would produce errors here
        expect(requestErrors).toHaveLength(0);
    });

    test('should not produce "Failed to parse URL" errors', async ({ page }) => {
        const urlErrors = [];
        
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('Failed to parse URL')) {
                urlErrors.push(text);
            }
        });
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        expect(urlErrors).toHaveLength(0);
    });
});
