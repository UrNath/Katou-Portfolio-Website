/**
 * Paged rows for the Poster C pages. A "row" is a strip of cards that scrolls
 * sideways inside its own box (the page itself never scrolls sideways).
 * Markup: a wrapper with [data-rows-section] that holds one or more [data-rows]
 * strips, plus optional [data-rows-prev], [data-rows-next] and [data-rows-page].
 */
function visible(element: HTMLElement) {
  return element.offsetParent !== null;
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
    if (prev) prev.disabled = strip.scrollLeft <= 2;
    if (next) next.disabled = atEnd;
    section.toggleAttribute('data-rows-single', pages <= 1);
  }

  sections.forEach((section) => {
    const step = (direction: number) => {
      const strip = activeStrip(section);
      if (!strip) return;
      strip.scrollBy({ left: direction * strip.clientWidth * 0.9, behavior: reduced.matches ? 'auto' : 'smooth' });
    };
    section.querySelector('[data-rows-prev]')?.addEventListener('click', () => step(-1));
    section.querySelector('[data-rows-next]')?.addEventListener('click', () => step(1));
    section.querySelectorAll<HTMLElement>('[data-rows]').forEach((strip) => {
      strip.addEventListener('scroll', () => paint(section), { passive: true });
      new ResizeObserver(() => paint(section)).observe(strip);
    });
    paint(section);
  });

  const repaint = () => sections.forEach((section) => {
    const strip = activeStrip(section);
    if (strip) strip.scrollLeft = 0;
    paint(section);
  });
  window.addEventListener('nk-rows', repaint);
}
