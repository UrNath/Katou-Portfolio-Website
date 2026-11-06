import test from 'node:test';
import assert from 'node:assert/strict';
import { GalleryReveal } from '../src/lib/gallery-reveal.mjs';

test('normal wheel navigation reaches its endpoint sooner than the old reveal', () => {
  const reveal = new GalleryReveal(0, 1, 0, 'wheel');
  assert.equal(reveal.value(0), 0);
  assert.equal(reveal.value(400), 1);
  assert.equal(reveal.done(400), true);
});

test('wheel pressure speeds up without jumping the current reveal position', () => {
  const reveal = new GalleryReveal(0, 1, 0, 'wheel');
  const before = reveal.value(80);
  reveal.hurry(80);
  assert.equal(reveal.value(80), before);
  assert.equal(reveal.done(239), false);
  assert.equal(reveal.value(240), 1);
  assert.equal(reveal.done(240), true);
});

test('continued spam neither extends the deadline nor drops progress', () => {
  const reveal = new GalleryReveal(0, 1, 0, 'wheel');
  let previous = 0;
  for (let time = 40; time <= 240; time += 40) {
    const before = reveal.value(time);
    reveal.hurry(time);
    assert.equal(reveal.value(time), before);
    assert.ok(before >= previous && before <= 1);
    previous = before;
  }
  assert.equal(reveal.done(240), true);
});

test('late wheel input shortens the tail without overshooting', () => {
  const reveal = new GalleryReveal(0, 1, 0, 'wheel');
  const before = reveal.value(250);
  reveal.hurry(250);
  assert.equal(reveal.value(250), before);
  assert.equal(reveal.done(349), false);
  assert.equal(reveal.value(350), 1);
});

test('touch completion and cancellation retain their existing timing', () => {
  const full = new GalleryReveal(0, 1, 0);
  assert.equal(full.done(639), false);
  assert.equal(full.done(640), true);
  const cancel = new GalleryReveal(.4, 0, 0);
  assert.equal(cancel.value(0), .4);
  assert.equal(cancel.done(363), false);
  assert.equal(cancel.value(364), 0);
});
