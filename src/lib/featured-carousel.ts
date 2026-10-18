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
  function draw() {
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
  function move(step: number) {
    if (!step) return;
    cancelAnimationFrame(animation);
    const start = position;
    target += step;
    moving = true;
    root.dataset.moving = 'true';
    notify();
    // Move focus before a slide becomes inert (e.g. after keyboard navigation).
    if (cards.some((card) => card.contains(document.activeElement))) root.focus({ preventScroll: true });
    if (reduced.matches) { position = target; settle(); return; }
    const began = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - began) / 560);
      const eased = 1 - Math.pow(1 - progress, 3);
      position = start + (target - start) * eased;
      draw();
      if (progress < 1) animation = requestAnimationFrame(tick);
      else settle();
    }
    animation = requestAnimationFrame(tick);
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
  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    suppressClick = false;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
  });
  stage.addEventListener('pointermove', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      gesture.dragged = true;
      stage.setPointerCapture(event.pointerId);
    }
  });
  stage.addEventListener('pointerup', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    if (gesture.dragged) {
      suppressClick = true;
      if (Math.abs(dx) > 32) move(dx < 0 ? 1 : -1);
    }
    gesture = null;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  });
  stage.addEventListener('pointercancel', () => { gesture = null; suppressClick = false; });
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
  new ResizeObserver(draw).observe(stage);
  reduced.addEventListener('change', () => { if (reduced.matches && moving) { cancelAnimationFrame(animation); position = target; settle(); } });
  root.dataset.ready = 'true';
  settle();
}
