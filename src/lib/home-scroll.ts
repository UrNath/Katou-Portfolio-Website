import { GalleryWheel } from './gallery-wheel.mjs';
import { interiorRange, sectionStep } from './home-snap.mjs';

export function mountHomeScroll() {
  const root = document.querySelector<HTMLElement>('.scroll-portfolio');
  const bar = document.querySelector<HTMLElement>('.site-bar');
  if (!root || !bar) return;
  const panels = [...root.querySelectorAll<HTMLElement>(':scope > section[id]')];
  const footer = document.querySelector<HTMLElement>('.site-footer');
  const elements = footer ? [...panels, footer] : panels;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wheel = new GalleryWheel();
  let sections: { top: number; height: number }[] = [];
  let viewport = innerHeight;
  let max = 0;
  let animation = 0;
  let queued = 0;
  let destination: number | undefined;
  let origin = 0;
  let measureFrame = 0;
  let scrollTimer: ReturnType<typeof setTimeout> | undefined;
  let nativeRange: { start: number; end: number } | undefined;
  let touch: { x: number; y: number; last: number; start: number; distance: number; direction: number; mode: 'pending' | 'snap' | 'native' | 'horizontal' } | undefined;
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
  const position = () => window.scrollY;
  const instant = (top: number) => window.scrollTo({ top, behavior: 'instant' });
  const modal = () => !!document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
  const editable = (target: EventTarget | null) => target instanceof Element && !!target.closest('input, textarea, select, [contenteditable="true"]');
  const opening = () => !!document.querySelector('#site-opening:not([hidden])');

  function cancel() {
    cancelAnimationFrame(animation);
    animation = 0;
    destination = undefined;
    queued = 0;
  }
  function go(target: number, focus = false) {
    cancelAnimationFrame(animation);
    animation = 0;
    const from = position();
    target = clamp(target, 0, max);
    destination = target;
    const finish = () => {
      instant(target);
      destination = undefined;
      animation = 0;
      if (focus) {
        const index = sections.findIndex(section => Math.abs(clamp(section.top, 0, max) - target) < 4);
        const element = elements[index];
        if (element) { element.tabIndex = -1; element.focus({ preventScroll: true }); }
      }
      if (queued) {
        const step = queued; queued = 0;
        origin = target;
        go(sectionStep(sections, target, viewport, max, step));
      }
    };
    if (reduced.matches || Math.abs(from - target) < 2) { finish(); return; }
    const started = performance.now();
    const duration = clamp(Math.abs(target - from) * .32, 220, 520);
    const frame = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      instant(from + (target - from) * eased);
      if (t < 1) animation = requestAnimationFrame(frame);
      else finish();
    };
    animation = requestAnimationFrame(frame);
  }
  function step(direction: number, focus = false) {
    if (destination !== undefined) {
      const activeDirection = Math.sign(destination - origin);
      if (direction !== activeDirection) {
        queued = 0;
        const back = origin;
        origin = destination;
        go(back, focus);
      } else queued = direction;
      return;
    }
    origin = position();
    go(sectionStep(sections, origin, viewport, max, direction), focus);
  }
  function measure() {
    measureFrame = 0;
    // Keep semantic section/edge identity: rotation can add extra tall-section
    // stops before the active section, so flattened stop indices are unstable.
    const locate = (value: number) => {
      const start = sections.findIndex(section => Math.abs(clamp(section.top, 0, max) - value) < 3);
      if (start >= 0) return { index: start, end: false };
      const end = sections.findIndex(section => section.height > viewport + 3 && Math.abs(clamp(section.top + section.height - viewport, 0, max) - value) < 3);
      return end >= 0 ? { index: end, end: true } : undefined;
    };
    const aligned = locate(position());
    const target = destination === undefined ? undefined : locate(destination);
    const header = bar!.getBoundingClientRect().height;
    viewport = Math.max(1, (window.visualViewport?.height ?? innerHeight) - header);
    document.documentElement.style.setProperty('--page-height', `${viewport}px`);
    document.documentElement.style.setProperty('--site-header-height', `${header}px`);
    sections = elements.map(element => ({ top: Math.max(0, element.getBoundingClientRect().top + position() - header), height: element.getBoundingClientRect().height }));
    max = Math.max(0, document.documentElement.scrollHeight - (window.visualViewport?.height ?? innerHeight));
    if (touch || editable(document.activeElement)) return;
    const resolve = (location: { index: number; end: boolean }) => {
      const section = sections[location.index];
      return clamp(section.top + (location.end ? Math.max(0, section.height - viewport) : 0), 0, max);
    };
    if (target) go(resolve(target));
    else if (destination !== undefined) cancel();
    else if (aligned) instant(resolve(aligned));
  }
  const scheduleMeasure = () => { if (!measureFrame) measureFrame = requestAnimationFrame(measure); };
  function nested(target: EventTarget | null, delta: number) {
    let element = target instanceof Element ? target : null;
    while (element && element !== root && element !== document.body) {
      if (element instanceof HTMLElement && element.scrollHeight > element.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(element).overflowY)) {
        if (delta > 0 ? element.scrollTop + element.clientHeight < element.scrollHeight - 2 : element.scrollTop > 2) return true;
      }
      element = element.parentElement;
    }
    return false;
  }

  document.documentElement.classList.add('home-snap-ready');
  measure();
  window.addEventListener('wheel', event => {
    if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || modal() || opening() || editable(event.target)) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport : 1);
    if (nested(event.target, delta)) return;
    event.preventDefault();
    nativeRange = undefined;
    const direction = Math.sign(delta);
    const intentional = wheel.feed(delta, performance.now(), event.deltaMode);
    if (destination !== undefined) { if (intentional) step(intentional); return; }
    const range = interiorRange(sections, position(), viewport, direction);
    if (range) instant(clamp(position() + delta, range.start, range.end));
    else if (intentional) step(intentional);
  }, { passive: false });

  window.addEventListener('touchstart', event => {
    if (event.touches.length !== 1 || modal() || opening() || editable(event.target)) return;
    cancel(); nativeRange = undefined;
    const finger = event.touches[0];
    touch = { x: finger.clientX, y: finger.clientY, last: finger.clientY, start: position(), distance: 0, direction: 0, mode: 'pending' };
  }, { passive: true });
  window.addEventListener('touchmove', event => {
    if (!touch) return;
    if (event.touches.length !== 1) { touch = undefined; return; }
    const finger = event.touches[0];
    const distance = touch.y - finger.clientY;
    if (touch.mode === 'pending') {
      if (Math.abs(distance) < 10 && Math.abs(finger.clientX - touch.x) < 10) return;
      if (Math.abs(finger.clientX - touch.x) > Math.abs(distance) || nested(event.target, distance)) { touch.mode = 'horizontal'; return; }
      touch.direction = Math.sign(distance);
      const range = interiorRange(sections, touch.start, viewport, touch.direction);
      if (range) { touch.mode = 'native'; nativeRange = range; }
      else touch.mode = 'snap';
    }
    touch.last = finger.clientY;
    touch.distance = distance;
    if (touch.mode !== 'snap') return;
    if (event.cancelable) event.preventDefault();
    const next = sectionStep(sections, touch.start, viewport, max, Math.sign(distance) || touch.direction);
    instant(clamp(touch.start + distance, Math.min(touch.start, next), Math.max(touch.start, next)));
  }, { passive: false });
  function release(cancelled: boolean) {
    const gesture = touch; touch = undefined;
    if (!gesture || gesture.mode !== 'snap') return;
    origin = gesture.start;
    const target = !cancelled && Math.abs(gesture.distance) >= 36
      ? sectionStep(sections, gesture.start, viewport, max, Math.sign(gesture.distance)) : gesture.start;
    go(target);
  }
  window.addEventListener('touchend', () => release(false), { passive: true });
  window.addEventListener('touchcancel', () => release(true), { passive: true });
  function settleNative() {
    if (!nativeRange || touch || destination !== undefined) return;
    const range = nativeRange; nativeRange = undefined;
    const edge = clamp(position(), range.start, range.end);
    if (Math.abs(edge - position()) > 2) go(edge);
  }
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    if (nativeRange) scrollTimer = setTimeout(settleNative, 180);
  }, { passive: true });
  window.addEventListener('scrollend', settleNative);

  window.addEventListener('keydown', event => {
    if (modal() || opening() || editable(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof Element && event.target.closest('[data-carousel], button, video, summary, a')) return;
    if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); nativeRange = undefined;
    if (event.key === 'Home' || event.key === 'End') { cancel(); go(event.key === 'Home' ? 0 : max, true); return; }
    const direction = event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey) ? -1 : 1;
    const range = interiorRange(sections, position(), viewport, direction);
    if (range && destination === undefined) {
      origin = position();
      go(clamp(origin + direction * (event.key.startsWith('Arrow') ? 64 : viewport * .9), range.start, range.end));
    } else step(direction, true);
  });
  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!link || event.defaultPrevented || (event instanceof MouseEvent && (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey))) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    const index = panels.findIndex(panel => `#${panel.id}` === url.hash);
    if (index < 0) return;
    event.preventDefault(); cancel(); history.pushState(null, '', url.hash);
    go(sections[index].top, true);
  });
  window.addEventListener('resize', scheduleMeasure);
  window.visualViewport?.addEventListener('resize', scheduleMeasure);
  window.addEventListener('orientationchange', scheduleMeasure);
  window.addEventListener('nk-layout', scheduleMeasure);
  window.addEventListener('hashchange', () => {
    cancel(); measure();
    const index = panels.findIndex(panel => `#${panel.id}` === location.hash);
    if (index >= 0) go(sections[index].top);
  });
  reduced.addEventListener('change', () => { if (destination !== undefined) { const target = destination; cancel(); go(target); } });
  const observer = new ResizeObserver(scheduleMeasure);
  elements.forEach(element => observer.observe(element));
  document.fonts.ready.then(scheduleMeasure);
  window.addEventListener('load', () => {
    measure();
    const index = panels.findIndex(panel => `#${panel.id}` === location.hash);
    if (index >= 0) instant(sections[index].top);
  }, { once: true });
}
