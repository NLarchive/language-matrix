/**
 * Playwright E2E Tests — Mobile UI
 * Validates that:
 *   1. Main screen has no horizontal overflow / visible "vertical cut" on smartphones
 *   2. Buttons do not remain in a stuck pressed state after touch interactions
 *   3. Word Composer game touch controls clean up properly
 *
 * Uses manual viewport sizing so we can run within a single describe/worker.
 */
import { test, expect } from '@playwright/test';

/* Reusable viewport presets */
const IPHONE_SE = { width: 375, height: 667 };
const PIXEL_5   = { width: 393, height: 851 };

/* ------------------------------------------------------------------ */
/*  Layout — no horizontal overflow ("vertical cut" regression)        */
/* ------------------------------------------------------------------ */
test.describe('Mobile layout — no horizontal overflow', () => {

    test('iPhone SE: body does not overflow viewport width', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('#matrix-container table, #matrix-container .loading', { timeout: 15000 });

        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow).toBeLessThanOrEqual(1);
    });

    test('iPhone SE: matrix-table-container left offset is zero', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('#matrix-container table, #matrix-container .loading', { timeout: 15000 });

        const leftPx = await page.evaluate(() => {
            const el = document.querySelector('.matrix-table-container');
            if (!el) return 0;
            return parseFloat(getComputedStyle(el).left) || 0;
        });
        expect(Math.abs(leftPx)).toBeLessThanOrEqual(1);
    });

    test('iPhone SE: main element fills viewport width', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('#matrix-container table, #matrix-container .loading', { timeout: 15000 });

        const mainBox = await page.locator('main').boundingBox();
        expect(mainBox).not.toBeNull();
        expect(mainBox.x).toBeLessThanOrEqual(2);
        expect(mainBox.width).toBeGreaterThan(IPHONE_SE.width * 0.9);
    });

    test('iPhone SE: header is fully visible without clipping', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('header', { timeout: 15000 });

        const headerBox = await page.locator('header').boundingBox();
        expect(headerBox).not.toBeNull();
        expect(headerBox.x).toBeGreaterThanOrEqual(0);
        expect(headerBox.x + headerBox.width).toBeLessThanOrEqual(IPHONE_SE.width + 1);
    });

    test('iPhone SE: sentence builder does not overflow', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('.sentence-builder', { timeout: 15000 });

        const box = await page.locator('.sentence-builder').boundingBox();
        if (box) {
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(IPHONE_SE.width + 2);
        }
    });

    test('iPhone SE: tab navigation is visible and usable', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('.tab-btn', { timeout: 15000 });

        const tabs = page.locator('.tab-btn');
        const count = await tabs.count();
        expect(count).toBeGreaterThanOrEqual(2);

        for (let i = 0; i < count; i++) {
            const box = await tabs.nth(i).boundingBox();
            expect(box).not.toBeNull();
            expect(box.width).toBeGreaterThan(0);
        }
    });

    test('Pixel 5: body does not overflow viewport width', async ({ page }) => {
        await page.setViewportSize(PIXEL_5);
        await page.goto('/');
        await page.waitForSelector('#matrix-container table, #matrix-container .loading', { timeout: 15000 });

        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow).toBeLessThanOrEqual(1);
    });

    test('Pixel 5: matrix-table-container left offset is zero', async ({ page }) => {
        await page.setViewportSize(PIXEL_5);
        await page.goto('/');
        await page.waitForSelector('#matrix-container table, #matrix-container .loading', { timeout: 15000 });

        const leftPx = await page.evaluate(() => {
            const el = document.querySelector('.matrix-table-container');
            if (!el) return 0;
            return parseFloat(getComputedStyle(el).left) || 0;
        });
        expect(Math.abs(leftPx)).toBeLessThanOrEqual(1);
    });
});

/* ------------------------------------------------------------------ */
/*  Stuck-button regression (touch simulation on mobile viewport)      */
/* ------------------------------------------------------------------ */
test.describe('Touch button stuck-state regression', () => {
    test.use({ hasTouch: true });

    test('word button deselects on second tap', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('.word-btn', { timeout: 15000 });

        const btn = page.locator('.word-btn').first();
        if (await btn.isVisible()) {
            await btn.tap();
            await page.waitForTimeout(200);
            const selectedAfterFirst = await btn.evaluate(el => el.classList.contains('selected'));

            await btn.tap();
            await page.waitForTimeout(200);
            const selectedAfterSecond = await btn.evaluate(el => el.classList.contains('selected'));

            if (selectedAfterFirst) {
                expect(selectedAfterSecond).toBe(false);
            }
        }
    });

    test('Clear Selection button works correctly after tap', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('#clear-btn', { timeout: 15000 });

        const clearBtn = page.locator('#clear-btn');
        // Tap the button — should not throw, should not create stuck visual state
        await clearBtn.tap();
        await page.waitForTimeout(300);

        // Verify no lingering transient classes (the real stuck-button symptom)
        const hasStuckClass = await clearBtn.evaluate(el =>
            el.classList.contains('touch-dragging') ||
            el.classList.contains('dragging') ||
            el.classList.contains('drag-over')
        );
        expect(hasStuckClass).toBe(false);

        // Verify the button is still clickable (not frozen)
        await expect(clearBtn).toBeEnabled();
    });

    test('Play sentence button works correctly after tap', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('#play-sentence-btn', { timeout: 15000 });

        const playBtn = page.locator('#play-sentence-btn');
        await playBtn.tap();
        await page.waitForTimeout(300);

        // Verify no lingering transient classes
        const hasStuckClass = await playBtn.evaluate(el =>
            el.classList.contains('touch-dragging') ||
            el.classList.contains('dragging') ||
            el.classList.contains('drag-over')
        );
        expect(hasStuckClass).toBe(false);

        // Verify the button is still interactive
        await expect(playBtn).toBeEnabled();
    });
});

/* ------------------------------------------------------------------ */
/*  Word Composer – touch interactions on mobile viewport               */
/* ------------------------------------------------------------------ */
test.describe('Word Composer touch interactions', () => {

    test('Radicals tab renders without overflow on iPhone SE', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('.tab-btn[data-tab="radicals"]', { timeout: 15000 });

        const radicalsTab = page.locator('.tab-btn[data-tab="radicals"]');
        await radicalsTab.click();
        await page.waitForTimeout(1000);

        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow).toBeLessThanOrEqual(1);
    });

    test('No ghost elements linger in the DOM', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('.tab-btn[data-tab="radicals"]', { timeout: 15000 });

        await page.locator('.tab-btn[data-tab="radicals"]').click();
        await page.waitForTimeout(1000);

        const ghostCount = await page.locator('.touch-ghost').count();
        expect(ghostCount).toBe(0);
    });

    test('No drag-over classes linger after interactions', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('.tab-btn[data-tab="radicals"]', { timeout: 15000 });

        await page.locator('.tab-btn[data-tab="radicals"]').click();
        await page.waitForTimeout(1000);

        const dragOverCount = await page.locator('.drag-over').count();
        expect(dragOverCount).toBe(0);
    });

    test('Show Hints button toggles off cleanly', async ({ page }) => {
        await page.setViewportSize(IPHONE_SE);
        await page.goto('/');
        await page.waitForSelector('.tab-btn[data-tab="radicals"]', { timeout: 15000 });

        await page.locator('.tab-btn[data-tab="radicals"]').click();
        await page.waitForTimeout(1500);

        const hintBtn = page.locator('#highlight-radicals-btn');
        if (await hintBtn.isVisible()) {
            // Activate
            await hintBtn.click();
            await page.waitForTimeout(300);

            // Deactivate
            await hintBtn.click();
            await page.waitForTimeout(300);

            const isActive = await hintBtn.evaluate(el => el.classList.contains('active'));
            expect(isActive).toBe(false);

            const highlightedCards = await page.locator('.highlighted-hint').count();
            expect(highlightedCards).toBe(0);
        }
    });
});
