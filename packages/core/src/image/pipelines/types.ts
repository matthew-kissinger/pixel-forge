/**
 * Pipeline interface.
 *
 * A pipeline composes one or more provider calls into a canonical asset
 * workflow (sprite → chroma clean; soldier set → T-pose then 9 poses;
 * texture → FLUX → quantize → upscale). W4 will land concrete pipelines
 * against this interface.
 *
 * Design:
 * - `id` is stable and human-readable; surfaced by CLI / MCP tooling.
 * - `description` is agent-facing — one sentence, imperative mood.
 * - `run` is the only required method. Everything else (resumability,
 *   per-item skip logic) is an extension.
 */

/** Generic pipeline: one input → one output. */
export interface Pipeline<Input, Output> {
  /** Stable identifier, e.g. `'sprite'`, `'icon'`, `'texture'`, `'glb'`. */
  readonly id: string;

  /** Short agent-readable description of what this pipeline produces. */
  readonly description: string;

  /** Execute the pipeline. Throws structured errors from `../../errors.ts`. */
  run(input: Input): Promise<Output>;
}

/**
 * A pipeline that can be resumed across many inputs, skipping items that
 * already have a produced output on disk. Used by batch workflows
 * (soldier sets, faction icons, terrain biomes) that routinely hit rate
 * limits partway through.
 *
 * Implementations should treat `shouldSkip` as the canonical way to check
 * "is this input already satisfied" — never hardcode a filesystem check
 * inside `run`.
 */
export interface BatchPipeline<Input, Output> extends Pipeline<Input[], Output[]> {
  readonly resumable: true;

  /**
   * Return true if the output for `input` already exists and `run` should
   * skip it. Typical implementations check `existsSync(targetPath(input))`.
   */
  shouldSkip(input: Input): Promise<boolean>;
}
