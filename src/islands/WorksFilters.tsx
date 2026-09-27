import { useEffect } from 'preact/hooks';
import { filterFromSearch, filterHref } from '../data/tags';

function shownCards(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.clip-card')).filter(
    (card) => getComputedStyle(card).display !== 'none',
  );
}

function apply(filter: string) {
  if (filter) document.documentElement.setAttribute('data-filter', filter);
  else document.documentElement.removeAttribute('data-filter');
  document.documentElement.removeAttribute('data-tag');

  document.querySelectorAll<HTMLElement>('[data-filter]').forEach((chip) => {
    const value = chip.getAttribute('data-filter') ?? '';
    chip.setAttribute('aria-pressed', value === filter ? 'true' : 'false');
  });

  const visible = shownCards();
  const count = document.querySelector('[data-clip-count]');
  if (count) {
    const noun = visible.length === 1 ? 'edit' : 'edits';
    count.textContent = `${visible.length} ${noun}`;
  }

  const empty = document.querySelector<HTMLElement>('[data-empty]');
  if (empty) empty.hidden = visible.length !== 0;
}

export default function WorksFilters() {
  useEffect(() => {
    apply(filterFromSearch(new URLSearchParams(location.search)));

    const onClick = (event: MouseEvent) => {
      const chip = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-filter]');
      if (!chip) return;
      event.preventDefault();
      const filter = chip.getAttribute('data-filter') ?? '';
      const href = filterHref(filter);
      const next = () => {
        history.pushState(null, '', href);
        apply(filter);
      };
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduce && 'startViewTransition' in document) {
        document.startViewTransition(() => next());
      } else {
        next();
      }
    };

    const onPop = () => apply(filterFromSearch(new URLSearchParams(location.search)));
    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  return <span style={{ display: 'block', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true" />;
}
