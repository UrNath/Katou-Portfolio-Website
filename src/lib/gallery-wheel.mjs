/** Recognize a new wheel gesture without tying input readiness to animation time. */
export class GalleryWheel {
  lastTime = -Infinity;
  lastMagnitude = 0;
  peak = 0;
  direction = 0;
  total = 0;
  consumed = false;
  reverseTotal = 0;
  started = -Infinity;

  /** @param {number} delta normalized vertical pixels @param {number} time monotonic milliseconds @param {number} mode original WheelEvent deltaMode */
  feed(delta, time, mode = 0) {
    const magnitude = Math.abs(delta);
    if (!magnitude) return 0;
    const direction = Math.sign(delta);
    const gap = time - this.lastTime;
    const same = direction === this.direction;
    // A tiny, still-decreasing tail remains momentum even if event delivery
    // briefly stalls. A renewed impulse, notch, or direction change is intent.
    const tail = same && gap < 420 && magnitude < Math.max(8, this.peak * .35) && magnitude <= this.lastMagnitude * 1.1;
    // Browsers may combine several physical ticks into one 200/240+ delta.
    // Keep the cadence test so a dense trackpad stream is still one gesture.
    const coarseTick = magnitude >= 100 && (magnitude % 100 === 0 || magnitude % 120 === 0);
    const notch = (mode !== 0 || coarseTick) && gap >= 32;
    const surge = same && time - this.started > 120 && magnitude >= 20 &&
      magnitude > this.lastMagnitude * 1.8 && this.lastMagnitude < this.peak * .5;
    const fresh = !this.direction || (gap > 140 && !tail) || notch || surge;
    if (fresh) {
      this.total = 0;
      this.consumed = false;
      this.peak = 0;
      this.started = time;
      this.direction = direction;
      this.reverseTotal = 0;
    }
    this.lastTime = time;
    if (direction !== this.direction) {
      this.reverseTotal += magnitude;
      if (this.reverseTotal < 28) return 0;
      this.direction = direction;
      this.total = 0;
      this.reverseTotal = 0;
      this.peak = magnitude;
      this.started = time;
      this.consumed = true;
      this.lastMagnitude = magnitude;
      return direction;
    }
    this.reverseTotal = 0;
    this.lastMagnitude = magnitude;
    this.peak = Math.max(this.peak, magnitude);
    this.total += magnitude;
    if (this.consumed || this.total < (mode ? 8 : 28)) return 0;
    this.consumed = true;
    return direction;
  }
}
