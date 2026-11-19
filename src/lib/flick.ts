/**
 * Flick scrolling for sideways scrollers with a mouse or pen: drag, let go, and the strip keeps
 * gliding with the speed of the flick, slowing smoothly to a stop. Touch already coasts natively,
 * so the scrollers use soft snapping (see poster.css) and this only handles mouse and pen.
 */
const TAU = 325; // ms; time constant of the slow-down (about 0.95 per 60fps frame)
const STOP = 0.02; // px/ms below which the glide ends

function scroller(start: EventTarget | null): HTMLElement | null {
  let el = start instanceof Element ? (start as HTMLElement) : null;
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) return el;
    el = el.parentElement;
  }
  return null;
}

function nearestSnap(el: HTMLElement): number {
  const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
  const box = el.getBoundingClientRect();
  const max = el.scrollWidth - el.clientWidth;
  let best = el.scrollLeft;
  let gap = Infinity;
  for (const child of Array.from(el.children) as HTMLElement[]) {
    if (child.offsetParent === null) continue;
    const left = child.getBoundingClientRect().left - box.left + el.scrollLeft - pad;
    const distance = Math.abs(left - el.scrollLeft);
    if (distance < gap) { gap = distance; best = left; }
  }
  return Math.max(0, Math.min(max, best));
}

let active: { el: HTMLElement; id: number; x: number; y: number; start: number; moved: boolean; samples: { x: number; t: number }[] } | null = null;
let glide = 0;
let swallowClick = false;

function endGlide(el: HTMLElement) {
  cancelAnimationFrame(glide);
  el.classList.remove('is-flicking');
  // Settle on the nearest card, then hand control back to the soft snapping.
  el.style.scrollSnapType = 'none';
  el.scrollTo({ left: nearestSnap(el), behavior: 'smooth' });
  window.setTimeout(() => { el.style.scrollSnapType = ''; }, 420);
}

function coast(el: HTMLElement, velocity: number) {
  let v = velocity;
  let last = performance.now();
  const max = el.scrollWidth - el.clientWidth;
  const step = (now: number) => {
    const dt = Math.min(48, now - last);
    last = now;
    v *= Math.exp(-dt / TAU);
    const next = el.scrollLeft - v * dt;
    el.scrollLeft = Math.max(0, Math.min(max, next));
    if (Math.abs(v) < STOP || next < 0 || next > max) { endGlide(el); return; }
    glide = requestAnimationFrame(step);
  };
  glide = requestAnimationFrame(step);
}

document.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch' || event.button !== 0 || !event.isPrimary) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest('input, textarea, select, button[data-rows-prev], button[data-rows-next]')) return;
  const el = scroller(target);
  if (!el) return;
  cancelAnimationFrame(glide);
  el.classList.remove('is-flicking');
  active = { el, id: event.pointerId, x: event.clientX, y: event.clientY, start: el.scrollLeft, moved: false, samples: [{ x: event.clientX, t: event.timeStamp }] };
});

document.addEventListener('pointermove', (event) => {
  if (!active || active.id !== event.pointerId) return;
  const dx = event.clientX - active.x;
  if (!active.moved) {
    if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(event.clientY - active.y)) return;
    active.moved = true;
    active.el.classList.add('is-flicking');
    active.el.style.scrollSnapType = 'none';
    active.el.setPointerCapture(event.pointerId);
  }
  active.samples.push({ x: event.clientX, t: event.timeStamp });
  if (active.samples.length > 8) active.samples.shift();
  active.el.scrollLeft = active.start - dx;
});

function finish(event: PointerEvent) {
  if (!active || active.id !== event.pointerId) return;
  const { el, moved, samples } = active;
  active = null;
  if (!moved) return;
  swallowClick = true;
  window.setTimeout(() => { swallowClick = false; }, 0);
  if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
  const last = samples[samples.length - 1];
  const first = samples.find((sample) => last.t - sample.t <= 100) ?? last;
  const velocity = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
  if (Math.abs(velocity) < STOP * 4 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) endGlide(el);
  else coast(el, velocity);
}
document.addEventListener('pointerup', finish);
document.addEventListener('pointercancel', finish);

// A drag must not open the card it ended on, and images must not start a native drag.
document.addEventListener('click', (event) => {
  if (!swallowClick) return;
  event.preventDefault();
  event.stopPropagation();
}, true);
document.addEventListener('dragstart', (event) => {
  if (scroller(event.target)) event.preventDefault();
});
