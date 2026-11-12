/** Document-space section stops, including both edges of oversized sections. */
export function sectionStops(sections, viewport, max) {
  return [...new Set(sections.flatMap(({ top, height }) => {
    const start = Math.max(0, Math.min(max, top));
    const end = Math.max(start, Math.min(max, top + height - viewport));
    return end - start > 2 ? [start, end] : [start];
  }))].sort((a, b) => a - b);
}

/** Resolve one section step without skipping the remainder of tall content. */
export function sectionStep(sections, position, viewport, max, direction) {
  const stops = sectionStops(sections, viewport, max);
  return direction > 0
    ? stops.find(stop => stop > position + 3) ?? max
    : [...stops].reverse().find(stop => stop < position - 3) ?? 0;
}

export function sectionAt(sections, position) {
  return Math.max(0, sections.findLastIndex(section => section.top <= position + 3));
}

/** A tall section keeps its own scrolling range before advancing. */
export function interiorRange(sections, position, viewport, direction) {
  const section = sections[sectionAt(sections, position)];
  if (!section || section.height <= viewport + 3) return null;
  const start = section.top;
  const end = start + section.height - viewport;
  if (direction > 0 ? position < end - 3 : position > start + 3) return { start, end };
  return null;
}
