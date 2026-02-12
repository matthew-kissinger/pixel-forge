import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport Smoke Tests', () => {
  test.describe('iPhone viewport (375x812)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('renders without console errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/');
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      const canvas = page.locator('.react-flow');
      await expect(canvas).toBeVisible();

      // Filter out known benign errors (e.g. favicon, HMR)
      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes('favicon') && !e.includes('[hmr]')
      );
      expect(criticalErrors).toHaveLength(0);
    });

    test('React Flow canvas is visible and has dimensions', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      const canvas = page.locator('.react-flow');
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });

    test('panels do not overflow viewport width', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      const overflow = await page.evaluate(() => {
        return document.body.scrollWidth <= window.innerWidth;
      });
      expect(overflow).toBe(true);
    });

    test('canvas accepts touch tap interaction', async ({ page, browserName }) => {
      test.use({ hasTouch: true });

      await page.goto('/');
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      const canvas = page.locator('.react-flow');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();

      // Simulate a tap on the canvas center
      await page.touchscreen.tap(
        box!.x + box!.width / 2,
        box!.y + box!.height / 2
      );

      // Verify no crash — page is still responsive
      await expect(page.locator('body')).toBeVisible();
      await expect(canvas).toBeVisible();
    });

    test('pinch-zoom simulation does not crash', async ({ page }) => {
      test.use({ hasTouch: true });

      await page.goto('/');
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      const canvas = page.locator('.react-flow');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();

      const centerX = box!.x + box!.width / 2;
      const centerY = box!.y + box!.height / 2;

      // Simulate pinch-zoom using wheel event with ctrlKey (Playwright convention)
      await page.mouse.move(centerX, centerY);
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, 100);

      // Page should still be responsive after zoom
      await expect(page.locator('body')).toBeVisible();
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('iPad viewport (768x1024)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('renders without console errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/');
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      const canvas = page.locator('.react-flow');
      await expect(canvas).toBeVisible();

      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes('favicon') && !e.includes('[hmr]')
      );
      expect(criticalErrors).toHaveLength(0);
    });

    test('React Flow canvas is visible and has dimensions', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      const canvas = page.locator('.react-flow');
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });

    test('panels do not overflow viewport width', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      const overflow = await page.evaluate(() => {
        return document.body.scrollWidth <= window.innerWidth;
      });
      expect(overflow).toBe(true);
    });

    test('canvas accepts touch tap interaction', async ({ page }) => {
      test.use({ hasTouch: true });

      await page.goto('/');
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      const canvas = page.locator('.react-flow');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();

      await page.touchscreen.tap(
        box!.x + box!.width / 2,
        box!.y + box!.height / 2
      );

      await expect(page.locator('body')).toBeVisible();
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Demo mode on mobile', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('demo mode loads on iPhone viewport', async ({ page }) => {
      await page.goto('/?demo=true');
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      // Demo should load nodes even on mobile
      await page.waitForSelector('.react-flow__node', { timeout: 5000 });

      const nodes = page.locator('.react-flow__node');
      const nodeCount = await nodes.count();
      expect(nodeCount).toBeGreaterThan(0);
    });
  });
});
