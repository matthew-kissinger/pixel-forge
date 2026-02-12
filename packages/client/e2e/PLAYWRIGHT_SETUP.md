# Playwright E2E Test Setup Guide

## Overview

This project includes E2E tests written with Playwright to validate the Pixel Forge UI functionality. The tests are located in:

- `e2e/smoke.e2e.ts` - 9 smoke tests for basic UI functionality
- `e2e/workflow.e2e.ts` - 4 workflow execution tests
- `e2e/workflow-creation.e2e.ts` - 1 workflow creation test (create, connect, save)

## Test Coverage

### Smoke Tests (`smoke.e2e.ts`)

1. **app loads and renders React Flow canvas** - Verifies React Flow initializes
2. **toolbar is visible with key buttons** - Checks for Execute, Save, Load buttons
3. **node palette opens and shows node categories** - Validates INPUT, GENERATE, PROCESS, OUTPUT categories
4. **can add a TextPrompt node by dragging** - Tests drag-and-drop from palette to canvas
5. **keyboard shortcuts work - Ctrl+A selects all** - Tests keyboard shortcuts
6. **keyboard shortcuts work - Esc deselects** - Tests deselection
7. **workflow save triggers download dialog or localStorage** - Tests save functionality
8. **node palette search works** - Tests search/filter in node palette
9. **can collapse and expand node palette** - Tests UI layout toggles

### Workflow Tests (`workflow.e2e.ts`)

1. **can add TextPrompt -> Preview nodes, connect, and execute** - Full workflow test
2. **can load a preset workflow and verify it renders** - Tests preset loading
3. **can load a template workflow and verify it renders** - Tests template loading
4. **undo/redo works after adding nodes** - Tests history management

### Workflow Creation Tests (`workflow-creation.e2e.ts`)

1. **create TextPrompt + ImageGen nodes, connect, type, and save** - End-to-end workflow creation: drags TextPrompt and ImageGen nodes from palette, connects output to input, types prompt text, saves workflow as JSON download

## Configuration

The Playwright configuration is in `playwright.config.ts`:

- Uses Chromium browser only (to save disk space)
- Auto-starts the Vite dev server on port 5173
- Runs tests in parallel (4 workers locally)
- Configured with 10s timeout for React Flow initialization

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   cd packages/client
   bun install
   ```

2. Install Playwright browsers:
   ```bash
   bunx playwright install chromium
   ```

### Run Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run only smoke tests
bunx playwright test e2e/smoke.e2e.ts

# Run only workflow creation test
bunx playwright test e2e/workflow-creation.e2e.ts

# Run with UI for debugging
bunx playwright test --ui

# Run in headed mode (visible browser)
bunx playwright test --headed
```

## Known Limitations

### NixOS Compatibility

**Playwright tests cannot run on NixOS** without additional setup. Playwright downloads dynamically-linked Chromium binaries that expect a standard Linux FHS (Filesystem Hierarchy Standard) structure. NixOS uses a different approach where libraries are stored in `/nix/store` with unique hash prefixes.

#### Error Symptoms

When attempting to run tests on NixOS, you'll see errors like:

```
error while loading shared libraries: libglib-2.0.so.0: cannot open shared object file
error while loading shared libraries: libnspr4.so: cannot open shared object file
```

#### Workarounds for NixOS

1. **Use a NixOS-patched Chromium** (requires modifying playwright.config.ts):
   ```javascript
   // Use system chromium instead of downloaded
   executablePath: '/run/current-system/sw/bin/chromium'
   ```

2. **Use buildFHSEnv** to create an FHS-compatible environment

3. **Run in Docker** with a standard Linux distribution:
   ```bash
   docker run --rm -v $(pwd):/workspace -w /workspace mcr.microsoft.com/playwright:v1.50.0 bash -c "npm install && npx playwright test"
   ```

4. **Use GitHub Actions** or another CI system with standard Ubuntu runners

## Test Status

| Test File | Tests | Status | Notes |
|-----------|-------|--------|-------|
| smoke.e2e.ts | 9 | ⚠️ Not Verified | Cannot run on NixOS; tests appear well-structured |
| workflow.e2e.ts | 4 | ⚠️ Not Verified | Cannot run on NixOS; tests appear well-structured |
| workflow-creation.e2e.ts | 1 | ⚠️ Not Verified | Cannot run on NixOS; tests appear well-structured |

## Recommendations

1. **For Development**: The tests should be run in a standard Linux environment (Ubuntu/Debian) or via Docker

2. **For CI/CD**: Use GitHub Actions with `ubuntu-latest` runner which has native Playwright support

3. **Test Maintenance**: The test selectors and assertions look reasonable based on code review, but should be validated in a compatible environment

4. **Alternative Testing**: Consider using Vitest for component-level testing where possible, as it doesn't require browser binaries

## CI/CD Integration

A sample GitHub Actions workflow:

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx playwright install chromium
      - run: bun run test:e2e
```

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [NixOS Playwright Issue](https://github.com/NixOS/nixpkgs/issues/214765)
