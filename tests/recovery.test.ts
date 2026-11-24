import assert from 'node:assert/strict';
import test from 'node:test';
import { initialRecovery, recover } from '../src/webview/recovery';

const terminated = {
  type: 'failed', generation: 0, failure: { kind: 'renderer' }, active: true, now: 100,
} as const;

test('a healthy page survives foregrounding and a lost background page is recreated once', () => {
  const foreground = { type: 'foreground', now: 70000 } as const;
  assert.equal(recover(initialRecovery, foreground), initialRecovery);
  const waiting = recover(initialRecovery, { ...terminated, active: false });
  assert.equal(waiting.waitingForForeground, true);
  assert.equal(waiting.generation, 0);
  assert.equal(recover(waiting, terminated), waiting);
  const restored = recover(waiting, foreground);
  assert.equal(restored.generation, 1);
  assert.equal(restored.lastRecovery, foreground.now);
  assert.equal(recover(restored, foreground), restored);
  assert.equal(recover(restored, terminated), restored);
});

test('an active crash recovers immediately and repeated crashes allow manual retry', () => {
  const restored = recover(initialRecovery, terminated);
  assert.equal(restored.generation, 1);
  const repeated = { ...terminated, generation: 1, now: 200 };
  const stopped = recover(restored, repeated);
  assert.deepEqual(stopped.failure, terminated.failure);
  const manual = recover(stopped, { type: 'retry' });
  assert.deepEqual(manual, { ...initialRecovery, generation: 2 });
  assert.equal(recover(restored, { ...repeated, now: 60000 }).generation, 2);
});

test('load and HTTP errors remain available for manual retry', () => {
  for (const failure of [{ kind: 'load', code: -1009 }, { kind: 'http', status: 503 }] as const) {
    const stopped = recover(initialRecovery, { ...terminated, failure });
    assert.equal(stopped.failure, failure);
    assert.equal(recover(stopped, terminated), stopped);
    assert.equal(recover(stopped, { type: 'foreground', now: 200 }), stopped);
    assert.equal(recover(stopped, { type: 'retry' }).failure, null);
  }
});
