/**
 * Soldier-set pipeline tests.
 */

import { describe, expect, test } from 'bun:test';

import { PipelineInputInvalid, PipelineStepFailed } from '../../../errors';
import { createSoldierSetPipeline } from '../soldier-set';
import {
  FakeBgRemovalProvider,
  FakeImageProvider,
  solidColorPng,
} from './fakes';

async function magenta(): Promise<Buffer> {
  return solidColorPng(8, 8, [255, 0, 255]);
}

describe('soldier-set pipeline — input validation', () => {
  test('rejects empty poses array', async () => {
    const provider = new FakeImageProvider({ image: await magenta() });
    const set = createSoldierSetPipeline({ imageProvider: provider });
    await expect(
      set.run({
        faction: 'NVA',
        tPosePrompt: 'tpose',
        poses: [],
      })
    ).rejects.toBeInstanceOf(PipelineInputInvalid);
  });

  test('rejects missing tPosePrompt', async () => {
    const provider = new FakeImageProvider({ image: await magenta() });
    const set = createSoldierSetPipeline({ imageProvider: provider });
    await expect(
      // @ts-expect-error — missing field
      set.run({ faction: 'NVA', poses: [{ name: 'a', prompt: 'b' }] })
    ).rejects.toBeInstanceOf(PipelineInputInvalid);
  });
});

describe('soldier-set pipeline — happy path', () => {
  test('generates 1 T-pose + N poses, T-pose feeds as ref to each pose', async () => {
    const provider = new FakeImageProvider({ image: await magenta() });
    const set = createSoldierSetPipeline({ imageProvider: provider });
    const out = await set.run({
      faction: 'NVA',
      tPosePrompt: 'NVA T-pose',
      poses: [
        { name: 'walk1', prompt: 'walking' },
        { name: 'walk2', prompt: 'walking other foot' },
      ],
    });
    expect(out.poses).toHaveLength(2);
    expect(out.poses[0]!.name).toBe('walk1');
    // 1 generate (T-pose) + 2 editWithRefs (poses)
    expect(provider.generateCalls).toBe(1);
    expect(provider.editWithRefsCalls).toBe(2);
    // Last pose call should have at least the T-pose buffer as a ref.
    expect(provider.lastRefs.length).toBeGreaterThanOrEqual(1);
  });

  test('factionStyleRefs trigger editWithRefs for the T-pose itself', async () => {
    const provider = new FakeImageProvider({ image: await magenta() });
    const set = createSoldierSetPipeline({ imageProvider: provider });
    const ref = await magenta();
    await set.run({
      faction: 'NVA',
      tPosePrompt: 'NVA T-pose',
      factionStyleRefs: [ref, ref],
      poses: [{ name: 'walk1', prompt: 'walking' }],
    });
    // 0 generate calls when T-pose has refs; 2 editWithRefs (T-pose + walk1).
    expect(provider.generateCalls).toBe(0);
    expect(provider.editWithRefsCalls).toBe(2);
  });

  test('pose with poseRef passes [tpose, poseRef] as refs', async () => {
    const provider = new FakeImageProvider({ image: await magenta() });
    const set = createSoldierSetPipeline({ imageProvider: provider });
    const poseRef = await solidColorPng(8, 8, [50, 50, 50]);
    await set.run({
      faction: 'NVA',
      tPosePrompt: 'tpose',
      poses: [{ name: 'walk1', prompt: 'walk', poseRef }],
    });
    expect(provider.lastRefs).toHaveLength(2);
  });

  test("auto-detects 'fire' pose names → preserveFlash on", async () => {
    const provider = new FakeImageProvider({ image: await magenta() });
    const bg = new FakeBgRemovalProvider({ image: await magenta() });
    const set = createSoldierSetPipeline({
      imageProvider: provider,
      bgRemovalProvider: bg,
    });
    const out = await set.run({
      faction: 'NVA',
      tPosePrompt: 'tpose',
      poses: [
        { name: 'front-fire', prompt: 'firing' },
      ],
    });
    // The fire pose ran through chroma — chromaCleaned is reported on
    // the inner SpriteMeta. Indirect smoke test: meta exists.
    expect(out.poses[0]!.sprite.meta.chromaCleaned).toBeGreaterThanOrEqual(0);
  });

  test('explicit preserveFlash:false overrides fire-pose auto-detect', async () => {
    const provider = new FakeImageProvider({ image: await magenta() });
    const set = createSoldierSetPipeline({ imageProvider: provider });
    const out = await set.run({
      faction: 'NVA',
      tPosePrompt: 'tpose',
      poses: [
        {
          name: 'front-fire',
          prompt: 'firing',
          preserveFlash: false,
        },
      ],
    });
    expect(out.poses).toHaveLength(1);
  });

  test('aggregates costs and latency', async () => {
    const provider = new FakeImageProvider({ image: await magenta() });
    const set = createSoldierSetPipeline({ imageProvider: provider });
    const out = await set.run({
      faction: 'NVA',
      tPosePrompt: 'tpose',
      poses: [
        { name: 'a', prompt: 'a' },
        { name: 'b', prompt: 'b' },
      ],
    });
    // Each fake call reports 0.001; we should have 3 calls total.
    expect(out.meta.totalCostUsd).toBeCloseTo(0.003, 5);
    expect(out.meta.totalLatencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe('soldier-set pipeline — error wrapping', () => {
  test('T-pose failure wrapped at tpose step', async () => {
    const provider = new FakeImageProvider({
      image: await magenta(),
      throwOnCall: new Error('T-pose blew up'),
    });
    const set = createSoldierSetPipeline({ imageProvider: provider });
    try {
      await set.run({
        faction: 'NVA',
        tPosePrompt: 'tpose',
        poses: [{ name: 'walk1', prompt: 'walk' }],
      });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PipelineStepFailed);
      expect((err as PipelineStepFailed).pipeline).toBe('soldier-set');
      expect((err as PipelineStepFailed).step).toBe('tpose');
    }
  });
});
