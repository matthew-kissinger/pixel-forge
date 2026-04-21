/**
 * Claude service — thin re-export of @pixel-forge/core/kiln
 *
 * The implementation has moved to `packages/core/src/kiln/generate.ts`. This
 * module exists so the server's routes + tests keep a stable import path
 * while the substrate is the real source of truth.
 *
 * If you're writing new code, import directly from `@pixel-forge/core/kiln`.
 */

export {
  generateKilnCode,
  editKilnCode,
  compactCode,
  refactorCode,
  type KilnGenerateRequest,
  type KilnGenerateResult,
  type RefactorRequest,
} from '@pixel-forge/core/kiln';

// Legacy alias — some call sites used `KilnGenerateResponse` instead of
// `KilnGenerateResult`. Keep both names live so we don't force a churn.
export type { KilnGenerateResult as KilnGenerateResponse } from '@pixel-forge/core/kiln';
