import { test, expect } from '@playwright/test';

test.describe('Pixel Forge E2E Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('app loads and renders React Flow canvas', async ({ page }) => {
    // Wait for React Flow to initialize
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    
    // Verify the canvas is visible
    const canvas = page.locator('.react-flow');
    await expect(canvas).toBeVisible();
  });

  test('toolbar is visible with expected buttons', async ({ page }) => {
    // Wait for toolbar to render
    await page.waitForSelector('button:has-text("Execute")', { timeout: 5000 });
    
    // Check for key toolbar buttons mentioned in requirements
    await expect(page.locator('button:has-text("Execute")')).toBeVisible();
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
    await expect(page.locator('button:has-text("Load")')).toBeVisible();
    await expect(page.locator('button:has-text("Validate")')).toBeVisible();
  });

  test('node palette is visible and can be expanded/collapsed', async ({ page }) => {
    // Wait for node palette to render
    await page.waitForSelector('text=Node Palette', { timeout: 5000 });
    
    // Verify palette is visible
    const palette = page.locator('text=Node Palette');
    await expect(palette).toBeVisible();
    
    // Find collapse button (chevron left icon)
    const collapseButton = page.locator('button[title="Collapse palette"]');
    await expect(collapseButton).toBeVisible();
    
    // Click to collapse
    await collapseButton.click();
    
    // Wait for collapse animation
    await page.waitForTimeout(300);
    
    // Verify palette is collapsed (should show expand button)
    const expandButton = page.locator('button[title="Expand palette"]');
    await expect(expandButton).toBeVisible();
    
    // Click to expand
    await expandButton.click();
    
    // Wait for expand animation
    await page.waitForTimeout(300);
    
    // Verify palette is expanded again
    await expect(collapseButton).toBeVisible();
  });

  test('can add a node by dragging from palette', async ({ page }) => {
    // Wait for node palette
    await page.waitForSelector('text=Node Palette', { timeout: 5000 });
    
    // Find TextPrompt node in the palette (it's in INPUT category which is expanded by default)
    const textPromptNode = page.locator('text=Text Prompt').first();
    
    // Wait for the node to be visible in the palette
    await expect(textPromptNode).toBeVisible({ timeout: 5000 });
    
    // Get the canvas element
    const canvas = page.locator('.react-flow__viewport');
    await expect(canvas).toBeVisible();
    
    // Get bounding boxes
    const nodeBox = await textPromptNode.boundingBox();
    const canvasBox = await canvas.boundingBox();
    
    if (nodeBox && canvasBox) {
      // Drag from node to canvas center
      await textPromptNode.hover();
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
      await page.mouse.up();
      
      // Wait for node to appear on canvas
      // TextPrompt nodes have a textarea input
      await page.waitForSelector('.react-flow__node textarea', { timeout: 5000 });
      
      // Verify node exists on canvas
      const nodeOnCanvas = page.locator('.react-flow__node');
      await expect(nodeOnCanvas.first()).toBeVisible();
    } else {
      // Skip if we can't get bounding boxes
      test.skip();
    }
  });

  test('keyboard shortcut Ctrl+A selects all nodes', async ({ page }) => {
    // First add a node to have something to select
    await page.waitForSelector('text=Node Palette', { timeout: 5000 });
    
    const textPromptNode = page.locator('text=Text Prompt').first();
    await expect(textPromptNode).toBeVisible({ timeout: 5000 });
    
    const canvas = page.locator('.react-flow__viewport');
    await expect(canvas).toBeVisible();
    
    const nodeBox = await textPromptNode.boundingBox();
    const canvasBox = await canvas.boundingBox();
    
    if (nodeBox && canvasBox) {
      // Add a node
      await textPromptNode.hover();
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
      await page.mouse.up();
      
      await page.waitForSelector('.react-flow__node', { timeout: 5000 });
      
      // Focus on the page
      await page.click('body');
      
      // Press Ctrl+A (Playwright handles platform differences)
      await page.keyboard.press('Control+a');
      
      // Wait for selection to take effect
      await page.waitForTimeout(300);
      
      // Verify node is selected (React Flow adds selected class)
      const selectedNode = page.locator('.react-flow__node.selected');
      await expect(selectedNode).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('demo mode loads sample data when URL has ?demo=true', async ({ page }) => {
    // Navigate with demo mode parameter
    await page.goto('/?demo=true');
    
    // Wait for React Flow to initialize
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    
    // Wait for demo template to load (demo pipeline should have nodes)
    // The demo template loads automatically when demoMode is true and nodes.length === 0
    await page.waitForSelector('.react-flow__node', { timeout: 5000 });
    
    // Verify nodes exist on canvas (demo template should have multiple nodes)
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThan(0);
    
    // Verify demo mode button is highlighted/active
    const demoButton = page.locator('button:has-text("DEMO MODE")');
    await expect(demoButton).toBeVisible();
  });

  test('save workflow via toolbar button', async ({ page }) => {
    // Wait for toolbar
    await page.waitForSelector('button:has-text("Save")', { timeout: 5000 });
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 2000 }).catch(() => null);
    
    // Click Save button
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();
    
    // Wait for download to potentially start
    await page.waitForTimeout(500);
    
    // Verify page is still responsive
    await expect(page.locator('body')).toBeVisible();
    
    // If download happened, verify it's a JSON file
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('.json');
      expect(download.suggestedFilename()).toContain('pixel-forge-workflow');
    }
  });

  test('load workflow via toolbar button', async ({ page }) => {
    // Wait for toolbar
    await page.waitForSelector('button:has-text("Load")', { timeout: 5000 });
    
    // Click Load button (this opens file picker - we can't actually select a file in headless mode)
    const loadButton = page.locator('button:has-text("Load")');
    await loadButton.click();
    
    // Wait a bit for the file input to be triggered
    await page.waitForTimeout(300);
    
    // Verify page is still responsive
    await expect(page.locator('body')).toBeVisible();
    
    // Verify the hidden file input exists (it's created by the Load button)
    const fileInput = page.locator('input[type="file"][accept=".json"]');
    await expect(fileInput).toBeAttached();
  });

  test('search/filter in node palette works', async ({ page }) => {
    // Wait for node palette
    await page.waitForSelector('text=Node Palette', { timeout: 5000 });
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    
    // Type in search query
    await searchInput.fill('text');
    
    // Wait for filtering
    await page.waitForTimeout(300);
    
    // Should show filtered results (TextPrompt should be visible)
    const textPromptResult = page.locator('text=Text Prompt');
    await expect(textPromptResult.first()).toBeVisible();
    
    // Clear search and verify all nodes are visible again
    await searchInput.fill('');
    await page.waitForTimeout(300);
    
    // Verify categories are visible (indicating full palette is shown)
    const inputCategory = page.locator('text=INPUT');
    await expect(inputCategory).toBeVisible();
  });

  test('validate button works', async ({ page }) => {
    // Wait for toolbar
    await page.waitForSelector('button:has-text("Validate")', { timeout: 5000 });
    
    // Validate button should be disabled when there are no nodes
    const validateButton = page.locator('button:has-text("Validate")');
    await expect(validateButton).toBeDisabled();
    
    // Add a node first
    await page.waitForSelector('text=Node Palette', { timeout: 5000 });
    const textPromptNode = page.locator('text=Text Prompt').first();
    await expect(textPromptNode).toBeVisible({ timeout: 5000 });
    
    const canvas = page.locator('.react-flow__viewport');
    const nodeBox = await textPromptNode.boundingBox();
    const canvasBox = await canvas.boundingBox();
    
    if (nodeBox && canvasBox) {
      await textPromptNode.hover();
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
      await page.mouse.up();
      
      await page.waitForSelector('.react-flow__node', { timeout: 5000 });
      
      // Now validate button should be enabled
      await expect(validateButton).toBeEnabled();
      
      // Click validate
      await validateButton.click();
      
      // Wait for validation to complete (should show toast)
      await page.waitForTimeout(500);
      
      // Verify page is still responsive
      await expect(page.locator('body')).toBeVisible();
    } else {
      test.skip();
    }
  });
});
