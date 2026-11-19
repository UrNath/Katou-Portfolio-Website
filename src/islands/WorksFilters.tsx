import { useEffect } from 'preact/hooks';
import { filterFromSearch, filterHref, type WorkFilters } from '../data/tags';

type FilterDimension = keyof WorkFilters;

type NkWindow = Window & { __nkWorksSync?: () => void; __nkTabs?: Record<string, string> };

/** In a creator's page one format tab is always selected: the one in the address, else their first format with work. */
function effectiveType(filters: WorkFilters): string {
  if (filters.type) return filters.type;
  if (!filters.creator) return '';
  return (window as NkWindow).__nkTabs?.[filters.creator] ?? '';
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

  document.querySelectorAll<HTMLElement>('[data-filter-kind][data-filter-value]').forEach((chip) => {
    const kind = chip.getAttribute('data-filter-kind') as FilterDimension;
    const value = chip.getAttribute('data-filter-value') ?? '';
    if (kind !== 'creator' && kind !== 'type' && kind !== 'tag') return;
    const active = (kind === 'type' ? type : filters[kind]) === value;
    if (chip.getAttribute('role') === 'tab') chip.setAttribute('aria-selected', active ? 'true' : 'false');
    else chip.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  // This sync also applies search terms, hides empty sections and updates the count.
  (window as NkWindow).__nkWorksSync?.();
}

export default function WorksFilters() {
  useEffect(() => {
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

      // The clicked chip's initial circle becomes the profile picture; the search bar eases to its new place.
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduce && 'startViewTransition' in document) {
        if (entering) nameAvatar(chipAvatar(next.creator));
        html.dataset.vt = entering || leaving ? 'view' : 'tab';
        const transition = document.startViewTransition(() => change());
        transition.finished.then(settle, settle);
      } else {
        change();
        settle();
      }
    };

    const onPop = () => apply(current());
    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  // Keep a tiny observable island so Astro client:visible hydrates the controls.
  return <span style={{ display: 'block', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true" />;
}
