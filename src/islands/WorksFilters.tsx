import { useEffect } from 'preact/hooks';
import { filterFromSearch, filterHref, type WorkFilters } from '../data/tags';

type FilterDimension = keyof WorkFilters;

type NkWindow = Window & { __nkWorksSync?: () => void; __nkTabs?: Record<string, string>; __nkTypes?: Record<string, string[]> };

/** In a creator's page one format tab is always selected: the one in the address, else their first format with work. */
function effectiveType(filters: WorkFilters): string {
  const has = filters.creator ? (window as NkWindow).__nkTypes?.[filters.creator] : undefined;
  if (filters.type && (!has || has.includes(filters.type))) return filters.type;
  if (!filters.creator) return filters.type;
  return (window as NkWindow).__nkTabs?.[filters.creator] ?? '';
}

function syncChips(filters: WorkFilters) {
  const type = effectiveType(filters);
  document.querySelectorAll<HTMLElement>('[data-filter-kind][data-filter-value]').forEach((chip) => {
    const kind = chip.getAttribute('data-filter-kind') as FilterDimension;
    const value = chip.getAttribute('data-filter-value') ?? '';
    if (kind !== 'creator' && kind !== 'type' && kind !== 'tag') return;
    const active = (kind === 'type' ? type : filters[kind]) === value;
    if (chip.getAttribute('role') === 'tab') chip.setAttribute('aria-selected', active ? 'true' : 'false');
    else chip.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  placeIndicators();
}

/** One highlight per group slides to the selected item with an eased transform (no jump, no re-render). */
function place(container: HTMLElement, activeSelector: string, fill: boolean) {
  let ind = container.querySelector<HTMLElement>(':scope > .nk-ind');
  if (container.offsetParent === null) {
    if (ind) delete ind.dataset.ready;
    return;
  }
  if (!ind) {
    ind = document.createElement('i');
    ind.className = 'nk-ind';
    ind.setAttribute('aria-hidden', 'true');
    container.prepend(ind);
  }
  const active = container.querySelector<HTMLElement>(activeSelector);
  if (!active) { ind.style.opacity = '0'; return; }
  const first = !ind.dataset.ready;
  if (first) ind.style.transition = 'none';
  ind.style.opacity = '1';
  ind.style.width = `${active.offsetWidth}px`;
  if (fill) ind.style.height = `${active.offsetHeight}px`;
  ind.style.transform = `translate(${active.offsetLeft}px, ${fill ? active.offsetTop : 0}px)`;
  if (first) {
    void ind.offsetWidth;
    ind.style.transition = '';
    ind.dataset.ready = '1';
  }
}

function placeIndicators() {
  document.querySelectorAll<HTMLElement>('.pw-tabs').forEach((tabs) => place(tabs, '.pw-tab[aria-selected="true"]', false));
  document.querySelectorAll<HTMLElement>('.pw-tags .filters').forEach((group) => place(group, '.filter-chip[aria-pressed="true"]', true));
  document.querySelectorAll<HTMLElement>('.pc-tabs-sm').forEach((group) => place(group, '[data-lf-tab][aria-selected="true"]', true));
}

function apply(filters: WorkFilters) {
  const html = document.documentElement;
  const type = effectiveType(filters);
  const dimensions: { key: FilterDimension; attribute: string }[] = [
    { key: 'creator', attribute: 'data-creator-filter' },
    { key: 'type', attribute: 'data-type-filter' },
    { key: 'tag', attribute: 'data-tag-filter' },
  ];

  for (const dimension of dimensions) {
    const value = dimension.key === 'type' ? type : filters[dimension.key];
    if (value) html.setAttribute(dimension.attribute, value);
    else html.removeAttribute(dimension.attribute);
  }

  syncChips(filters);

  // This sync also applies search terms, hides empty sections and updates the count.
  (window as NkWindow).__nkWorksSync?.();
}

export default function WorksFilters() {
  useEffect(() => {
    let busy = false;
    const current = () => filterFromSearch(new URLSearchParams(location.search));
    apply(current());

    const onClick = (event: MouseEvent) => {
      const chip = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        '[data-filter-kind][data-filter-value]',
      );
      if (!chip) return;
      const kind = chip.getAttribute('data-filter-kind');
      if (kind !== 'creator' && kind !== 'type' && kind !== 'tag') return;
      const value = chip.getAttribute('data-filter-value') ?? '';
      event.preventDefault();

      const prev = current();
      const next: WorkFilters = { ...prev };
      const keep = chip.hasAttribute('data-filter-keep');
      // Clicking an active chip toggles it off, while 'All' clears only its row. Format tabs and Back never toggle.
      if (kind === 'type') {
        next.type = keep || prev.type !== value ? value as WorkFilters['type'] : '';
      } else if (kind === 'creator') {
        next.creator = prev.creator === value ? '' : value;
      } else {
        next.tag = prev.tag === value ? '' : value;
      }
      if (chip.getAttribute('data-filter-clear') === 'type') next.type = '';

      const query = new URLSearchParams(location.search).get('q') ?? '';
      const href = filterHref(next, query);
      const entering = kind === 'creator' && !!next.creator && !prev.creator;
      const leaving = kind === 'creator' && !next.creator && !!prev.creator;
      const html = document.documentElement;
      const nameAvatar = (element: Element | null | undefined) => (element as HTMLElement | null | undefined)?.style.setProperty('view-transition-name', 'pw-avatar');
      const chipAvatar = (id: string) => document.querySelector<HTMLElement>(`.pw-chip[data-filter-value="${id}"] .pw-av`);
      const change = () => {
        if (location.pathname + location.search !== href) history.pushState(null, '', href);
        apply(next);
        if (entering || leaving) {
          window.scrollTo(0, 0);
          if (leaving) {
            window.dispatchEvent(new CustomEvent('nk-chips-reveal', { detail: prev.creator }));
            nameAvatar(chipAvatar(prev.creator));
          }
        }
      };
      const settle = () => {
        document.querySelectorAll<HTMLElement>('.pw-av').forEach((avatar) => avatar.style.removeProperty('view-transition-name'));
        delete html.dataset.vt;
        if (entering) {
          document.querySelector<HTMLElement>(`[data-profile="${next.creator}"] [data-profile-name]`)?.focus({ preventScroll: true });
        } else if (leaving) {
          document.querySelector<HTMLElement>(`.pw-chip[data-filter-value="${prev.creator}"]`)?.focus({ preventScroll: true });
        }
      };

      // The clicked chip's avatar becomes the profile picture; the search bar eases to its new place.
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // Leaving a profile the avatar has scrolled out of: skip the avatar flight and use the plain fade.
      const avatarRect = leaving ? document.querySelector<HTMLElement>(`[data-profile="${prev.creator}"] .pw-avatar`)?.getBoundingClientRect() : null;
      const avatarSeen = !leaving || (!!avatarRect && avatarRect.bottom > 130 && avatarRect.top < window.innerHeight);
      if (!reduce && (entering || leaving) && avatarSeen && 'startViewTransition' in document) {
        if (entering) nameAvatar(chipAvatar(next.creator));
        html.dataset.vt = 'view';
        const transition = document.startViewTransition(() => change());
        transition.finished.then(settle, settle);
        return;
      }

      // Every other change (format tab, tag, no View Transitions): current cards drop away, then the new ones rise in one after another.
      if (reduce) {
        change();
        settle();
        return;
      }
      if (busy) return;
      busy = true;
      if (!entering && !leaving) syncChips(next);
      const shown = () => Array.from(document.querySelectorAll<HTMLElement>('.pw-secs .clip-card')).filter((card) => card.offsetParent !== null).slice(0, 24);
      const out = shown().map((card) => card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(8px)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' }));
      Promise.all(out.map((animation) => animation.finished.catch(() => undefined))).then(() => {
        change();
        out.forEach((animation) => animation.cancel());
        requestAnimationFrame(() => {
          shown().forEach((card, index) => card.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 460, delay: Math.min(index, 8) * 30, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' }));
          if (entering || leaving) {
            document.querySelectorAll<HTMLElement>('.pw-profile, .pw-tabs, .pw-head').forEach((block) => {
              if (block.offsetParent !== null) block.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' });
            });
          }
          settle();
          window.setTimeout(() => { busy = false; }, 200);
        });
      });
    };

    const onPop = () => apply(current());
    const refit = () => { syncChips(current()); };
    (window as Window & { __nkSlide?: () => void }).__nkSlide = placeIndicators;
    requestAnimationFrame(refit);
    document.fonts?.ready.then(refit);
    window.addEventListener('resize', refit);
    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('resize', refit);
    };
  }, []);

  // Keep a tiny observable island so Astro client:visible hydrates the controls.
  return <span style={{ display: 'block', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true" />;
}
