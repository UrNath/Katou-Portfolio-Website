import { useEffect } from 'preact/hooks';
import { filterFromSearch, filterHref, type WorkFilters } from '../data/tags';

type FilterDimension = keyof WorkFilters;

function apply(filters: WorkFilters) {
  const html = document.documentElement;
  const dimensions: { key: FilterDimension; attribute: string }[] = [
    { key: 'creator', attribute: 'data-creator-filter' },
    { key: 'type', attribute: 'data-type-filter' },
    { key: 'tag', attribute: 'data-tag-filter' },
  ];

  for (const dimension of dimensions) {
    if (filters[dimension]) html.setAttribute(dimension.attribute, filters[dimension]);
    else html.removeAttribute(dimension.attribute);
  }

  document.querySelectorAll<HTMLElement>('[data-filter-kind][data-filter-value]').forEach((chip) => {
    const kind = chip.getAttribute('data-filter-kind') as FilterDimension;
    const value = chip.getAttribute('data-filter-value') ?? '';
    if (kind !== 'creator' && kind !== 'type' && kind !== 'tag') return;
    chip.setAttribute('aria-pressed', filters[kind] === value ? 'true' : 'false');
  });

  // This sync also applies search terms, hides empty sections and updates the count.
  (window as Window & { __nkWorksSync?: () => void }).__nkWorksSync?.();
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
      // Clicking an active chip toggles it off, while 'All' clears only its row.
      if (kind === 'type') {
        next.type = prev.type === value ? '' : value as WorkFilters['type'];
      } else if (kind === 'creator') {
        next.creator = prev.creator === value ? '' : value;
      } else {
        next.tag = prev.tag === value ? '' : value;
      }

      const query = new URLSearchParams(location.search).get('q') ?? '';
      const href = filterHref(next, query);
      const change = () => {
        if (location.pathname + location.search !== href) history.pushState(null, '', href);
        apply(next);
      };

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduce && 'startViewTransition' in document) {
        document.startViewTransition(() => change());
      } else {
        change();
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
