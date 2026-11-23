/** One continuous reveal clock; wheel pressure can shorten its remaining time. */
export class GalleryReveal {
  /** @param {number} from @param {number} target @param {number} started @param {'wheel' | 'gesture'} input */
  constructor(from, target, started, input = 'gesture') {
    this.from = from;
    this.target = target;
    this.started = started;
    this.segmentStart = started;
    this.duration = input === 'wheel' ? 400 : 180 + 460 * Math.abs(target - from);
    this.end = started + this.duration;
  }

  /** @param {number} now */
  value(now) {
    const time = Math.max(0, Math.min(1, (now - this.segmentStart) / this.duration));
    return this.from + (this.target - this.from) * (1 - (1 - time) ** 3);
  }

  /** @param {number} now */
  done(now) { return now >= this.end; }

  /** Rebase at the current position: speed changes never jump either curtain.
   * @param {number} now
   */
  hurry(now) {
    const end = Math.max(this.started + 240, now + 100);
    if (end >= this.end || this.done(now)) return;
    this.from = this.value(now);
    this.segmentStart = now;
    this.duration = end - now;
    this.end = end;
  }
}
