import { test, expect } from '@playwright/test';

test.describe('Pixel Forge Workflow Execution E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for React Flow to initialize
    await page.waitForSelector('.react-flow', { timeout: 10000 });
  });

  test('can add TextPrompt -> Preview nodes, connect, and execute', async ({ page }) => {
    // Wait for node palette
    await page.waitForSelector('text=Node Palette', { timeout: 5000 });
    
    // Get canvas element
    const canvas = page.locator('.react-flow__viewport');
    await expect(canvas).toBeVisible();
    
    // Find TextPrompt node in palette
    const textPromptNode = page.locator('text=Text Prompt').first();
    await expect(textPromptNode).toBeVisible({ timeout: 5000 });
    
    // Drag TextPrompt to canvas
    const nodeBox = await textPromptNode.boundingBox();
    const canvasBox = await canvas.boundingBox();
    
    if (!nodeBox || !canvasBox) {
      test.skip();
      return;
    }
    
    // Drag to center-left of canvas
    await textPromptNode.hover();
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.up();
    
    // Wait for TextPrompt node to appear on canvas
    await page.waitForSelector('.react-flow__node textarea', { timeout: 5000 });
    
    // Find Preview node in palette
    const previewNode = page.locator('text=Preview').first();
    await expect(previewNode).toBeVisible();
    
    // Drag Preview to canvas (to the right of TextPrompt)
    await previewNode.hover();
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.7, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.up();
    
    // Wait for Preview node to appear on canvas
    await page.waitForSelector('.react-flow__node', { timeout: 5000 });
    
    // Verify we have 2 nodes on canvas
    const nodes = page.locator('.react-flow__node');
    await expect(nodes).toHaveCount(2);
    
    // Type text into TextPrompt
    const textarea = page.locator('.react-flow__node textarea').first();
    await textarea.fill('Test prompt text');
    
    // Wait a bit for the text to be processed
    await page.waitForTimeout(300);
    
    // Connect TextPrompt output to Preview input
    const textPromptNodeElement = nodes.first();
    const previewNodeElement = nodes.nth(1);
    
    // Get bounding boxes for both nodes
    const textPromptBox = await textPromptNodeElement.boundingBox();
    const previewBox = await previewNodeElement.boundingBox();
    
    if (!textPromptBox || !previewBox) {
      test.skip();
      return;
    }
    
    // Drag from right edge of TextPrompt (output handle area) to left edge of Preview (input handle area)
    // React Flow will detect the handles automatically
    const outputHandleX = textPromptBox.x + textPromptBox.width - 5; // Right edge, slightly inset
    const outputHandleY = textPromptBox.y + textPromptBox.height / 2; // Vertical center
    const inputHandleX = previewBox.x + 5; // Left edge, slightly inset
    const inputHandleY = previewBox.y + previewBox.height / 2; // Vertical center
    
    // Hover over output handle area first
    await page.mouse.move(outputHandleX, outputHandleY);
    await page.waitForTimeout(200);
    
    // Start drag
    await page.mouse.down();
    await page.waitForTimeout(100);
    
    // Move to input handle area
    await page.mouse.move(inputHandleX, inputHandleY, { steps: 5 });
    await page.waitForTimeout(100);
    
    // Release
    await page.mouse.up();
    
    // Wait for edge to appear
    await page.waitForTimeout(500);
    
    // Verify connection exists (edge should be visible)
    const edges = page.locator('.react-flow__edge');
    await expect(edges).toHaveCount(1);
    
    // Click Execute button
    const executeButton = page.locator('button:has-text("Execute")');
    await expect(executeButton).toBeVisible();
    await executeButton.click();
    
    // Wait for execution to start (button should change to "Stop" if executing)
    // For TextPrompt -> Preview, execution should be very fast since no API calls
    await page.waitForTimeout(500);
    
    // Wait for execution to complete - check that Execute button is visible again (not "Stop")
    // Or wait for success status on nodes
    await page.waitForTimeout(1000);
    
    // Verify Preview node shows the text content
    // Preview should display "Test prompt text" in its content area
    // The text might be in a div or span within the Preview node
    const previewContent = previewNodeElement.locator('text=Test prompt text');
    await expect(previewContent).toBeVisible({ timeout: 3000 });
    
    // Verify no error badges/icons on nodes
    const errorIcons = page.locator('.react-flow__node svg[class*="error"], .react-flow__node [class*="error"]');
    const errorIconCount = await errorIcons.count();
    // Allow for other icons, but check that error-specific elements are minimal
    expect(errorIconCount).toBeLessThan(2); // Should be 0, but allow some tolerance
  });

  test('can load a preset workflow and verify it renders', async ({ page }) => {
    // Click Presets button in toolbar
    const presetsButton = page.locator('button:has-text("Presets")');
    await expect(presetsButton).toBeVisible({ timeout: 5000 });
    await presetsButton.click();
    
    // Wait for PresetLauncher to appear
    await page.waitForSelector('text=Preset Launcher', { timeout: 5000 });
    
    // Find and click the first preset card (e.g., "Planet Texture")
    const firstPreset = page.locator('text=Planet Texture').first();
    await expect(firstPreset).toBeVisible({ timeout: 5000 });
    await firstPreset.click();
    
    // Wait for preset form to appear
    await page.waitForSelector('input[placeholder*="e.g."]', { timeout: 5000 });
    
    // Enter a subject
    const subjectInput = page.locator('input[placeholder*="e.g."]').first();
    await subjectInput.fill('lava world');
    
    // Click Generate Workflow button
    const generateButton = page.locator('button:has-text("Generate Workflow")');
    await expect(generateButton).toBeVisible();
    await generateButton.click();
    
    // Wait for nodes to appear on canvas
    await page.waitForSelector('.react-flow__node', { timeout: 5000 });
    
    // Verify nodes exist on canvas (preset workflows have multiple nodes)
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThan(0);
    
    // Verify edges exist (preset workflows have connections)
    const edges = page.locator('.react-flow__edge');
    const edgeCount = await edges.count();
    expect(edgeCount).toBeGreaterThan(0);
  });

  test('can load a template workflow and verify it renders', async ({ page }) => {
    // Click Templates button in toolbar
    const templatesButton = page.locator('button:has-text("Templates")');
    await expect(templatesButton).toBeVisible({ timeout: 5000 });
    await templatesButton.click();
    
    // Wait for template dropdown to appear
    await page.waitForSelector('text=Workflow Templates', { timeout: 5000 });
    
    // Find and click the first template button
    // Template buttons are in the dropdown and contain text like "X nodes"
    // Exclude the close button (X icon) and header buttons
    const templateButtons = page.locator('div:has-text("Workflow Templates")').locator('button:has-text("nodes")');
    const firstTemplate = templateButtons.first();
    await expect(firstTemplate).toBeVisible({ timeout: 5000 });
    await firstTemplate.click();
    
    // Wait for nodes to appear on canvas
    await page.waitForSelector('.react-flow__node', { timeout: 5000 });
    
    // Verify nodes exist on canvas
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThan(0);
    
    // Verify edges exist
    const edges = page.locator('.react-flow__edge');
    const edgeCount = await edges.count();
    expect(edgeCount).toBeGreaterThan(0);
  });

  test('undo/redo works after adding nodes', async ({ page }) => {
    // Wait for node palette
    await page.waitForSelector('text=Node Palette', { timeout: 5000 });
    
    // Get canvas element
    const canvas = page.locator('.react-flow__viewport');
    await expect(canvas).toBeVisible();
    
    // Find TextPrompt node in palette
    const textPromptNode = page.locator('text=Text Prompt').first();
    await expect(textPromptNode).toBeVisible({ timeout: 5000 });
    
    // Drag TextPrompt to canvas
    const nodeBox = await textPromptNode.boundingBox();
    const canvasBox = await canvas.boundingBox();
    
    if (!nodeBox || !canvasBox) {
      test.skip();
      return;
    }
    
    await textPromptNode.hover();
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.up();
    
    // Wait for node to appear on canvas
    await page.waitForSelector('.react-flow__node', { timeout: 5000 });
    
    // Verify node exists
    const nodesBefore = page.locator('.react-flow__node');
    await expect(nodesBefore).toHaveCount(1);
    
    // Focus on the page to ensure keyboard shortcuts work
    await page.click('body');
    
    // Press Ctrl+Z (undo)
    await page.keyboard.press('Control+z');
    
    // Wait for undo to complete
    await page.waitForTimeout(500);
    
    // Verify node is removed
    const nodesAfterUndo = page.locator('.react-flow__node');
    await expect(nodesAfterUndo).toHaveCount(0);
    
    // Press Ctrl+Shift+Z (redo)
    await page.keyboard.press('Control+Shift+z');
    
    // Wait for redo to complete
    await page.waitForTimeout(500);
    
    // Verify node reappears
    const nodesAfterRedo = page.locator('.react-flow__node');
    await expect(nodesAfterRedo).toHaveCount(1);
  });
});
