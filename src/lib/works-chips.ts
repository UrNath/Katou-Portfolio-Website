/**
 * Creator chips that never clip. Only whole chips are shown; when more exist than fit,
 * a › button appears (and ‹ once the row has moved on). Hidden chips are inert so
 * keyboard focus never lands on something that is off screen.
 */
export function mountChips() {
  const root = document.querySelector<HTMLElement>('[data-chips]');
  if (!root) return;
  const view = root.querySelector<HTMLElement>('[data-chips-view]')!;
  const row = root.querySelector<HTMLElement>('[data-chips-row]')!;
  const prev = root.querySelector<HTMLButtonElement>('[data-chips-prev]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-chips-next]')!;
  const lane = root.parentElement as HTMLElement;
  const jump = lane.querySelector<HTMLElement>('.pw-jump');
  const wide = window.matchMedia('(min-width: 1040px)');
  const chips = () => Array.from(row.querySelectorAll<HTMLElement>('.pw-chip'));
  let start = 0;
  let count = 1;
  const GAP = 8;
  const PAD = 12; // room for focus rings on each side

  const arrowWidth = () => (wide.matches ? 44 : 34) + GAP;
  const room = () => {
    const laneWidth = lane.clientWidth;
    return wide.matches && jump ? laneWidth - jump.offsetWidth - 24 : laneWidth;
  };
  const fit = (widths: number[], from: number, available: number) => {
    let sum = 0;
    let n = 0;
    for (let i = from; i < widths.length; i++) {
      const w = widths[i] + (n ? GAP : 0);
      if (sum + w > available) break;
      sum += w;
      n++;
    }
    return { n, sum };
  };

  function layout() {
    if (!root.offsetWidth && !lane.offsetWidth) return;
    const items = chips();
    const widths = items.map((chip) => chip.offsetWidth);
    const total = items.length;
    const space = room();
    const everything = fit(widths, 0, space - PAD);
    if (everything.n >= total) {
      start = 0;
      prev.hidden = true;
      next.hidden = true;
      view.style.width = '';
      row.style.transform = '';
      items.forEach((chip) => { chip.inert = false; });
      return;
    }
    if (start >= total) start = total - 1;
    const arrow = arrowWidth();
    const left = start > 0 ? arrow : 0;
    let found = fit(widths, start, space - left - PAD);
    if (start + found.n < total) found = fit(widths, start, space - left - arrow - PAD);
    if (found.n < 1) found = { n: 1, sum: widths[start] };
    let offset = 0;
    for (let i = 0; i < start; i++) offset += widths[i] + GAP;
    prev.hidden = start === 0;
    next.hidden = start + found.n >= total;
    view.style.width = `${found.sum + PAD}px`;
    row.style.transform = `translateX(${-offset}px)`;
    count = found.n;
    items.forEach((chip, i) => { chip.inert = !(i >= start && i < start + found.n); });
  }

  function forward() {
    const items = chips();
    const widths = items.map((chip) => chip.offsetWidth);
    // Last page: show as many chips as fit (at least 3 when they fit) rather than a lone leftover.
    let sum = 0;
    let first = items.length;
    while (first > 0) {
      const w = widths[first - 1] + (sum ? GAP : 0);
      if (sum + w > room() - PAD - arrowWidth()) break;
      sum += w;
      first--;
    }
    start = Math.min(items.length - 1, Math.max(start + 1, Math.min(start + count, first)));
    layout();
    if (next.hidden && document.activeElement === next) prev.focus();
  }

  function back() {
    const items = chips();
    const widths = items.map((chip) => chip.offsetWidth);
    let s = start;
    let sum = 0;
    const left = (index: number) => (index > 0 ? arrowWidth() : 0);
    while (s > 0) {
      const w = widths[s - 1] + (sum ? GAP : 0);
      if (sum + w > room() - PAD - arrowWidth() - left(s - 1)) break;
      sum += w;
      s--;
    }
    start = Math.max(0, s === start ? start - 1 : s);
    layout();
    if (prev.hidden && document.activeElement === prev) next.focus();
  }

  next.addEventListener('click', forward);
  prev.addEventListener('click', back);
  new ResizeObserver(layout).observe(lane);
  wide.addEventListener('change', () => { start = 0; layout(); });
  // A selected chip must be on screen: after Back, page to it.
  window.addEventListener('nk-chips-reveal', (event) => {
    const id = (event as CustomEvent<string>).detail;
    const index = chips().findIndex((chip) => chip.getAttribute('data-filter-value') === id);
    if (index < 0) return;
    if (index < start || index >= start + count) { start = Math.max(0, index - 1); layout(); }
  });
  layout();
  document.fonts?.ready.then(layout);
}
