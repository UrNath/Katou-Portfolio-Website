/**
 * Paged rows for the Poster C pages. A "row" is a strip of cards that scrolls
 * sideways inside its own box (the page itself never scrolls sideways).
 * Markup: a wrapper with [data-rows-section] that holds one or more [data-rows]
 * strips, plus optional [data-rows-prev], [data-rows-next] and [data-rows-page].
 */
function visible(element: HTMLElement) {
  return element.offsetParent !== null;
}

const phone = window.matchMedia('(max-width: 899px)');

/** Same feel as the home carousel: cards leaving the middle shrink, tilt and drop a little toward the edges. */
function depth(strip: HTMLElement) {
  const cards = Array.from(strip.children) as HTMLElement[];
  const on = phone.matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && strip.offsetParent !== null;
  const box = strip.getBoundingClientRect();
  const mid = box.left + box.width / 2;
  for (const card of cards) {
    if (!on) { card.style.removeProperty('scale'); card.style.removeProperty('rotate'); card.style.removeProperty('translate'); continue; }
    const rect = card.getBoundingClientRect();
    const d = Math.max(-1.5, Math.min(1.5, (rect.left + rect.width / 2 - mid) / (box.width / 2)));
    const a = Math.abs(d);
    card.style.scale = String(1 - 0.08 * Math.min(1, a));
    card.style.rotate = `${d * 3}deg`;
    card.style.translate = `0 ${Math.min(1, a) * 12}px`;
  }
}

export function mountRows() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-rows-section]'));

  const activeStrip = (section: HTMLElement) =>
    Array.from(section.querySelectorAll<HTMLElement>('[data-rows]')).find(visible) ?? null;

  function paint(section: HTMLElement) {
    const strip = activeStrip(section);
    const label = section.querySelector<HTMLElement>('[data-rows-page]');
    const prev = section.querySelector<HTMLButtonElement>('[data-rows-prev]');
    const next = section.querySelector<HTMLButtonElement>('[data-rows-next]');
    if (!strip) return;
    const pages = Math.max(1, Math.ceil((strip.scrollWidth - 4) / Math.max(1, strip.clientWidth)));
    const page = Math.min(pages, Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth)) + 1);
    const atEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
    if (label) label.textContent = `Page ${atEnd ? pages : page} / ${pages}`;
    const prog = strip.parentElement?.querySelector<HTMLElement>('.pc-prog');
    if (prog) {
      prog.style.setProperty('--prog-w', `${Math.min(100, (strip.clientWidth / Math.max(1, strip.scrollWidth)) * 100)}%`);
      prog.style.setProperty('--prog-x', `${(strip.scrollLeft / Math.max(1, strip.scrollWidth)) * 100}%`);
    }
    if (prev) prev.disabled = strip.scrollLeft <= 2;
    if (next) next.disabled = atEnd;
    section.toggleAttribute('data-rows-single', pages <= 1);
  }

  sections.forEach((section) => {
    const step = (direction: number) => {
      const strip = activeStrip(section);
      if (!strip) return;
      const pad = parseFloat(getComputedStyle(strip).paddingLeft) || 0;
      strip.scrollBy({ left: direction * (strip.clientWidth - pad * 2), behavior: reduced.matches ? 'auto' : 'smooth' });
    };
    section.querySelector('[data-rows-prev]')?.addEventListener('click', () => step(-1));
    section.querySelector('[data-rows-next]')?.addEventListener('click', () => step(1));
    section.querySelectorAll<HTMLElement>('[data-rows]').forEach((strip) => {
      let frame = 0;
      const update = () => { frame = 0; paint(section); depth(strip); };
      const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
      strip.addEventListener('scroll', queue, { passive: true });
      new ResizeObserver(queue).observe(strip);
    });
    paint(section);
    section.querySelectorAll<HTMLElement>('[data-rows]').forEach(depth);
  });
  phone.addEventListener('change', () => document.querySelectorAll<HTMLElement>('[data-rows]').forEach(depth));

  const repaint = () => sections.forEach((section) => {
    const strip = activeStrip(section);
    if (strip) strip.scrollLeft = 0;
    paint(section);
    if (strip) depth(strip);
  });
  window.addEventListener('nk-rows', repaint);
}
