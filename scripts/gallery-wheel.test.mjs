import test from 'node:test';
import assert from 'node:assert/strict';
import { GalleryWheel } from '../src/lib/gallery-wheel.mjs';

test('continuous momentum advances once, including a stalled decreasing tail', () => {
  const wheel = new GalleryWheel();
  const accepted = [];
  for (let time = 0; time < 1200; time += 16) {
    if (wheel.feed(Math.max(1, 100 * Math.exp(-time / 160)), time)) accepted.push(time);
  }
  assert.deepEqual(accepted, [0]);
  assert.equal(wheel.feed(.5, 1420), 0);
});

test('fresh gesture is ready at completion without an extra cooldown', () => {
  const wheel = new GalleryWheel();
  assert.equal(wheel.feed(120, 0), 1);
  assert.equal(wheel.feed(120, 641), 1);
  assert.equal(wheel.feed(120, 1282), 1);
});

test('new trackpad push can be recognized during the previous tail', () => {
  const wheel = new GalleryWheel();
  assert.equal(wheel.feed(60, 0), 1);
  wheel.feed(20, 200);
  wheel.feed(4, 220);
  assert.equal(wheel.feed(36, 240), 1);
  assert.equal(wheel.feed(20, 256), 0);
});

test('distinct notches can be buffered before animation completion', () => {
  const wheel = new GalleryWheel();
  assert.equal(wheel.feed(100, 0), 1);
  assert.equal(wheel.feed(100, 90), 1);
  assert.equal(wheel.feed(100, 100), 0);
});

test('direction changes require intent; tiny reversal jitter does not navigate', () => {
  const wheel = new GalleryWheel();
  assert.equal(wheel.feed(120, 0), 1);
  assert.equal(wheel.feed(-2, 40), 0);
  assert.equal(wheel.feed(2, 56), 0);
  assert.equal(wheel.feed(-16, 100), 0);
  assert.equal(wheel.feed(-16, 116), -1);
  assert.equal(wheel.feed(-12, 132), 0);
});

test('constant high-frequency deltas are one gesture, not repeated notches', () => {
  const wheel = new GalleryWheel();
  const accepted = [];
  for (let time = 0; time < 1600; time += 16) if (wheel.feed(100, time)) accepted.push(time);
  assert.deepEqual(accepted, [0]);
});


test('reversal jitter cannot re-arm the previous momentum tail', () => {
  const wheel = new GalleryWheel();
  assert.equal(wheel.feed(100, 0), 1);
  assert.equal(wheel.feed(30, 160), 0);
  assert.equal(wheel.feed(-1, 176), 0);
  assert.equal(wheel.feed(20, 192), 0);
  assert.equal(wheel.feed(18, 208), 0);
  assert.equal(wheel.feed(12, 224), 0);
});

test('single-line wheel and page-mode input remain responsive', () => {
  assert.equal(new GalleryWheel().feed(16, 0, 1), 1);
  assert.equal(new GalleryWheel().feed(900, 0, 2), 1);
});
