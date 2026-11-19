/** Circular positions are continuous across both ends; no duplicated clips or reset jump. */
export function circularPose(index: number, position: number, count: number) {
  const angle = (index - position) * 2 * Math.PI / count;
  const depth = Math.cos(angle);
  return {
    x: Math.sin(angle),
    y: (1 - depth) * 14,
    scale: 0.72 + 0.28 * depth,
    opacity: Math.max(0, Math.min(1, (depth + 0.12) / 0.42)),
    tilt: -Math.sin(angle) * 10,
    depth,
  };
}
/** Phone layout from the wireframe: centre card on top, two smaller tilted cards peeking out behind it. */
export function phonePose(d: number, offset: number) {
  const a = Math.abs(d);
  const s = d < 0 ? -1 : 1;
  if (a <= 1) {
    return { x: s * offset * Math.sin(a * Math.PI / 2), y: 22 * a, scale: 1 - 0.15 * a, rot: s * 4 * a, opacity: 1 - 0.08 * a, z: 300 - 100 * a };
  }
  const u = Math.min(1, a - 1);
  return { x: s * offset * (1 + 0.3 * u), y: 22 + 8 * u, scale: 0.85 - 0.1 * u, rot: s * (4 + 2 * u), opacity: 0.92 * (1 - u), z: 200 - 100 * u };
}
export function shortestStep(current: number, target: number, count: number) {
  const half = Math.floor(count / 2);
  return ((target - current + count + half) % count) - half;
}
export function mountCarousel(root: HTMLElement) {
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-carousel-card]'));
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-carousel-dot]'));
  const stage = root.querySelector<HTMLElement>('[data-carousel-stage]');
  if (!stage || cards.length < 2) return;
  const count = cards.length;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let position = Number(root.dataset.initial) || 0;
  let target = position;
  let animation = 0;
  let moving = false;
  let gesture: { id: number; x: number; y: number; dragged: boolean } | null = null;
  let suppressClick = false;
  let wheelTotal = 0;
  let lastWheel = 0;
  let wheelLockedUntil = 0;
  const activeIndex = () => ((Math.round(target) % count) + count) % count;
  function notify() {
    root.dispatchEvent(new CustomEvent('nk:carousel', { bubbles: true, detail: { moving } }));
  }
  const phone = window.matchMedia('(max-width: 899px)');
  function layout() {
    const W = stage!.clientWidth;
    // Height left for the cards once the caption and dots are placed; cards are 9:16 with 18px spare for the tilt.
    const below = Array.from(root.children).filter((child) => child !== stage).reduce((sum, child) => sum + (child as HTMLElement).offsetHeight, 0) + 16;
    const room = root.clientHeight - below;
    const widthCap = (W / 2 - 12) / 0.796;
    const cw = Math.max(80, Math.min(widthCap, (room - 18) * 9 / 16));
    const offset = Math.min(W / 2 - 12 - cw * 0.425, cw * 0.371);
    stage!.style.setProperty('--cw', `${cw}px`);
    stage!.style.setProperty('--sh', `${cw * 16 / 9 + 18}px`);
    return { offset };
  }
  const pitch = () => (phone.matches ? layout().offset : stage!.clientWidth * 0.30 * 2 * Math.PI / count) || 1;
  function draw() {
    if (phone.matches) {
      const { offset } = layout();
      cards.forEach((card, index) => {
        let d = (((index - position) % count) + count) % count;
        if (d > count / 2) d -= count;
        const pose = phonePose(d, offset);
        card.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.rot}deg) scale(${pose.scale})`;
        card.style.opacity = String(pose.opacity);
        card.style.zIndex = String(Math.round(pose.z));
        card.style.pointerEvents = pose.opacity > 0.7 ? 'auto' : 'none';
      });
      return;
    }
    const radius = stage!.clientWidth * 0.30;
    cards.forEach((card, index) => {
      const pose = circularPose(index, position, count);
      card.style.transform = `translate3d(${pose.x * radius}px, ${pose.y}px, 0) scale(${pose.scale}) rotateY(${pose.tilt}deg)`;
      card.style.opacity = String(pose.opacity);
      card.style.zIndex = String(Math.round((pose.depth + 1) * 100));
      card.style.pointerEvents = pose.opacity > 0.7 ? 'auto' : 'none';
    });
  }
  function settle() {
    // Reduce the accumulator only after the animation, when all poses are identical.
    position = target = activeIndex();
    moving = false;
    root.dataset.moving = 'false';
    const active = activeIndex();
    cards.forEach((card, index) => {
      const visible = Math.abs(shortestStep(active, index, count)) <= 1;
      card.inert = !visible;
      card.setAttribute('aria-hidden', String(!visible));
      card.dataset.active = String(index === active);
      card.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
        video.dataset.hero = index === active ? 'true' : 'false';
      });
    });
    dots.forEach((dot, index) => dot.setAttribute('aria-pressed', String(index === active)));
    const label = root.querySelector('[data-carousel-current]');
    if (label) label.textContent = cards[active].dataset.caption ?? '';
    draw();
    notify();
  }
  function goTo(next: number) {
    cancelAnimationFrame(animation);
    const start = position;
    target = next;
    if (start === target) { settle(); return; }
    moving = true;
    root.dataset.moving = 'true';
    notify();
    // Move focus before a slide becomes inert (e.g. after keyboard navigation).
    if (cards.some((card) => card.contains(document.activeElement))) root.focus({ preventScroll: true });
    if (reduced.matches) { position = target; settle(); return; }
    const began = performance.now();
    // Longer flicks travel further and take a little longer to coast to a stop.
    const duration = Math.min(950, 380 + Math.abs(target - start) * 150);
    function tick(now: number) {
      const progress = Math.min(1, (now - began) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      position = start + (target - start) * eased;
      draw();
      if (progress < 1) animation = requestAnimationFrame(tick);
      else settle();
    }
    animation = requestAnimationFrame(tick);
  }
  function move(step: number) {
    if (step) goTo(target + step);
  }
  root.querySelector('[data-carousel-prev]')?.addEventListener('click', () => move(-1));
  root.querySelector('[data-carousel-next]')?.addEventListener('click', () => move(1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => move(shortestStep(activeIndex(), index, count))));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  root.addEventListener('click', (event) => {
    const targetElement = event.target instanceof Element ? event.target : null;
    const card = targetElement?.closest<HTMLElement>('[data-carousel-card]');
    if (!card) return;
    if (suppressClick || moving || card.dataset.active !== 'true') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!suppressClick && !moving) move(shortestStep(activeIndex(), Number(card.dataset.index), count));
      suppressClick = false;
    }
  }, true);
  type Drag = { id: number; x: number; y: number; start: number; active: boolean; samples: { x: number; t: number }[] };
  let drag: Drag | null = null;
  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary) return;
    suppressClick = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: position, active: false, samples: [{ x: event.clientX, t: event.timeStamp }] };
  });
  stage.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) <= 8 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
      drag.active = true;
      cancelAnimationFrame(animation);
      drag.start = position;
      stage.setPointerCapture(event.pointerId);
      moving = true;
      root.dataset.moving = 'true';
    }
    drag.samples.push({ x: event.clientX, t: event.timeStamp });
    if (drag.samples.length > 8) drag.samples.shift();
    // The cards follow the finger one to one.
    position = drag.start - dx / pitch();
    draw();
  });
  function release(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return;
    const finished = drag;
    drag = null;
    if (stage!.hasPointerCapture(event.pointerId)) stage!.releasePointerCapture(event.pointerId);
    if (!finished.active) return;
    suppressClick = true;
    // Velocity from the last ~100ms of the gesture, then coast: farther and faster flicks pass more cards.
    const last = finished.samples[finished.samples.length - 1];
    const first = finished.samples.find((sample) => last.t - sample.t <= 100) ?? last;
    const velocity = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    const projected = position - (velocity * 260) / pitch();
    const base = Math.round(finished.start);
    const next = Math.max(base - 3, Math.min(base + 3, Math.round(projected)));
    goTo(next);
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', (event) => { if (drag?.active) release(event); else { drag = null; suppressClick = false; } });
  stage.addEventListener('wheel', (event) => {
    const delta = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
    if (!delta || (!event.shiftKey && Math.abs(delta) <= Math.abs(event.deltaY))) return;
    event.preventDefault();
    const now = performance.now();
    if (now < wheelLockedUntil) return;
    if (now - lastWheel > 180) wheelTotal = 0;
    lastWheel = now;
    wheelTotal += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth : 1);
    if (Math.abs(wheelTotal) >= 45) {
      move(wheelTotal > 0 ? 1 : -1);
      wheelTotal = 0;
      wheelLockedUntil = now + 600;
    }
  }, { passive: false });
  const observer = new ResizeObserver(draw);
  observer.observe(stage);
  observer.observe(root);
  phone.addEventListener('change', draw);
  reduced.addEventListener('change', () => { if (reduced.matches && moving) { cancelAnimationFrame(animation); position = target; settle(); } });
  root.dataset.ready = 'true';
  settle();
}
