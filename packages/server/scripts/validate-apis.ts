#!/usr/bin/env bun

/**
 * Manual API validation script.
 * Run with: bun run scripts/validate-apis.ts
 *
 * Make sure the server is running first:
 * bun run src/index.ts
 */

const API_BASE = 'http://localhost:3000';

async function testHealthCheck() {
  console.log('\n--- Testing Health Check ---');
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
    return res.ok;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

async function testImageGeneration() {
  console.log('\n--- Testing Image Generation ---');
  try {
    const res = await fetch(`${API_BASE}/api/image/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'pixel art sword, 16-bit style, transparent background' }),
    });
    const data = await res.json();
    console.log('Status:', res.status);

    if (data.image) {
      console.log('Image received:', data.image.substring(0, 50) + '...');
      console.log('Image length:', data.image.length);
      return true;
    } else {
      console.log('Response:', data);
      return false;
    }
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

async function testModelGeneration() {
  console.log('\n--- Testing 3D Model Generation ---');
  try {
    const res = await fetch(`${API_BASE}/api/model/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'low poly sword, game asset' }),
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);

    if (data.requestId) {
      console.log('\n--- Polling Model Status ---');
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes at 5 second intervals

      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 5000));
        attempts++;

        const statusRes = await fetch(`${API_BASE}/api/model/status/${data.requestId}`);
        const status = await statusRes.json();
        console.log(`Attempt ${attempts}:`, status);

        if (status.status === 'completed') {
          console.log('Model URL:', status.modelUrl);
          console.log('Thumbnail URL:', status.thumbnailUrl);
          return true;
        } else if (status.status === 'failed') {
          console.log('Generation failed:', status.error);
          return false;
        }
      }
      console.log('Timed out waiting for model generation');
      return false;
    }
    return false;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

async function main() {
  console.log('=== Pixel Forge API Validation ===');
  console.log('API Base:', API_BASE);

  const results = {
    health: await testHealthCheck(),
    imageGen: false,
    modelGen: false,
  };

  // Only test API endpoints if health check passes
  if (results.health) {
    // Parse args to see what to test
    const args = process.argv.slice(2);
    const testAll = args.length === 0;
    const testImage = testAll || args.includes('--image');
    const testModel = testAll || args.includes('--model');

    if (testImage) {
      results.imageGen = await testImageGeneration();
    }

    if (testModel) {
      results.modelGen = await testModelGeneration();
    }
  }

  console.log('\n=== Results ===');
  console.log('Health Check:', results.health ? 'PASS' : 'FAIL');
  console.log('Image Generation:', results.imageGen ? 'PASS' : 'SKIP/FAIL');
  console.log('Model Generation:', results.modelGen ? 'PASS' : 'SKIP/FAIL');
}

main().catch(console.error);
