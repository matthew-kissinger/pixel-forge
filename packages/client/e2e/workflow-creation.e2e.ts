import { test, expect } from '@playwright/test';

test.describe('Workflow Creation E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow', { timeout: 10000 });
  });

  test('create TextPrompt + ImageGen nodes, connect, type, and save', async ({ page }) => {
    // Wait for palette
    await page.waitForSelector('text=Node Palette', { timeout: 5000 });

    const canvas = page.locator('.react-flow__viewport');
    await expect(canvas).toBeVisible();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) {
      test.skip();
      return;
    }

    // --- Step 1: Drag TextPrompt node onto canvas ---
    const textPromptPalette = page.locator('text=Text Prompt').first();
    await expect(textPromptPalette).toBeVisible({ timeout: 5000 });

    const textPromptBox = await textPromptPalette.boundingBox();
    if (!textPromptBox) {
      test.skip();
      return;
    }

    await textPromptPalette.hover();
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 5 }
    );
    await page.mouse.up();

    // Wait for TextPrompt node on canvas (has textarea)
    await page.waitForSelector('.react-flow__node textarea', { timeout: 5000 });
    const nodesAfterFirst = page.locator('.react-flow__node');
    await expect(nodesAfterFirst).toHaveCount(1);

    // --- Step 2: Drag ImageGen node onto canvas ---
    // ImageGen is in GENERATE category — expand it if collapsed
    const generateCategory = page.locator('text=GENERATE');
    if (await generateCategory.isVisible()) {
      await generateCategory.click();
      await page.waitForTimeout(200);
    }

    const imageGenPalette = page.locator('text=Image Gen').first();
    await expect(imageGenPalette).toBeVisible({ timeout: 5000 });

    await imageGenPalette.hover();
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.65,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 5 }
    );
    await page.mouse.up();

    // Wait for second node
    await page.waitForTimeout(500);
    const nodesAfterSecond = page.locator('.react-flow__node');
    await expect(nodesAfterSecond).toHaveCount(2);

    // --- Step 3: Connect TextPrompt output → ImageGen input ---
    const firstNode = nodesAfterSecond.first();
    const secondNode = nodesAfterSecond.nth(1);

    const firstBox = await firstNode.boundingBox();
    const secondBox = await secondNode.boundingBox();

    if (!firstBox || !secondBox) {
      test.skip();
      return;
    }

    // Output handle is on right edge of first node
    const outputX = firstBox.x + firstBox.width - 3;
    const outputY = firstBox.y + firstBox.height / 2;
    // Input handle is on left edge of second node
    const inputX = secondBox.x + 3;
    const inputY = secondBox.y + secondBox.height / 2;

    await page.mouse.move(outputX, outputY);
    await page.waitForTimeout(100);
    await page.mouse.down();
    await page.mouse.move(inputX, inputY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();

    // --- Step 4: Verify connection ---
    await page.waitForTimeout(500);
    const edges = page.locator('.react-flow__edge');
    await expect(edges).toHaveCount(1);

    // --- Step 5: Verify both nodes visible ---
    await expect(firstNode).toBeVisible();
    await expect(secondNode).toBeVisible();

    // --- Step 6: Type text into TextPrompt ---
    const textarea = page.locator('.react-flow__node textarea').first();
    await textarea.fill('A futuristic spaceship in neon glow');
    await page.waitForTimeout(200);

    // Verify the text was entered
    await expect(textarea).toHaveValue('A futuristic spaceship in neon glow');

    // --- Step 7: Save workflow and verify download ---
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });

    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.json');
  });

  test('can delete nodes and edges from workflow', async ({ page }) => {
    // Wait for palette
    await page.waitForSelector('text=Node Palette', { timeout: 5000 });

    const canvas = page.locator('.react-flow__viewport');
    await expect(canvas).toBeVisible();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) {
      test.skip();
      return;
    }

    // Add TextPrompt node
    const textPromptPalette = page.locator('text=Text Prompt').first();
    await textPromptPalette.hover();
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Verify node exists
    const nodes = page.locator('.react-flow__node');
    await expect(nodes).toHaveCount(1);

    // Select node and delete it
    await nodes.first().click();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // Verify node is deleted
    await expect(nodes).toHaveCount(0);
  });

  test('workflow state persists after save', async ({ page }) => {
    // Wait for palette
    await page.waitForSelector('text=Node Palette', { timeout: 5000 });

    const canvas = page.locator('.react-flow__viewport');
    await expect(canvas).toBeVisible();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) {
      test.skip();
      return;
    }

    // Add TextPrompt and Preview nodes
    const textPromptPalette = page.locator('text=Text Prompt').first();
    await textPromptPalette.hover();
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.mouse.up();
    await page.waitForTimeout(300);

    const previewPalette = page.locator('text=Preview').first();
    await previewPalette.hover();
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.65,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Verify both nodes exist
    const nodes = page.locator('.react-flow__node');
    await expect(nodes).toHaveCount(2);

    // Type text into TextPrompt
    const textarea = page.locator('.react-flow__node textarea').first();
    await textarea.fill('Test text content');
    await page.waitForTimeout(200);

    // Save workflow
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();
    await downloadPromise;

    // Verify state is still intact after save
    await expect(nodes).toHaveCount(2);
    await expect(textarea).toHaveValue('Test text content');
  });
});
