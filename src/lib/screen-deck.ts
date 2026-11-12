/**
 * Phone "deck": on upright phones a page is one screen tall. Each top-level
 * section of a [data-deck] element becomes a screen chosen from a tab bar, and
 * long screens scroll inside themselves with a "more" cue. Wider screens are
 * untouched; all of the layout lives in src/styles/arcade.css.
 */
export const DECK_QUERY = '(max-width: 767px) and (max-aspect-ratio: 1/1)';

/** Shows the cue on `host` while `panel` still has content below the fold. */
export function watchScrollCue(panel: HTMLElement, host: HTMLElement = panel) {
  const update = () => host.toggleAttribute('data-more', panel.scrollHeight - panel.clientHeight - panel.scrollTop > 12);
  panel.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(panel);
  update();
  return update;
}

/** Moves the footer into the element marked [data-footer-slot] on phones, and back otherwise. */
export function dockFooter(phone: MediaQueryList) {
  const footer = document.querySelector<HTMLElement>('.site-footer');
  const slot = document.querySelector<HTMLElement>('[data-footer-slot]');
  if (!footer || !slot) return;
  const home = footer.parentElement!;
  const place = () => (phone.matches ? slot : home).append(footer);
  phone.addEventListener('change', place);
  place();
}

export function mountDeck() {
  const found = document.querySelector<HTMLElement>('[data-deck]');
  if (!found) return;
  const root: HTMLElement = found;
  const phone = matchMedia(DECK_QUERY);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const screens = Array.from(root.querySelectorAll<HTMLElement>(':scope > section[id]'));
  const tabs = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-deck-tab]'));
  const wipe = root.querySelector<HTMLElement>('.deck-wipe');
  let active = -1;

  const cue = () => {
    const screen = screens[active];
    if (screen) root.toggleAttribute('data-more', screen.scrollHeight - screen.clientHeight - screen.scrollTop > 12);
  };
  function show(id: string, animate = true) {
    const index = screens.findIndex((screen) => screen.id === id);
    if (index < 0 || index === active) return index >= 0;
    const forward = index > active;
    screens.forEach((screen, position) => {
      screen.classList.toggle('is-screen', position === index);
      screen.classList.remove('screen-in', 'screen-back');
    });
    tabs.forEach((tab) => {
      const on = tab.dataset.deckTab === id;
      if (on) tab.setAttribute('aria-current', 'true'); else tab.removeAttribute('aria-current');
      if (on && phone.matches) tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced.matches ? 'instant' : 'smooth' });
    });
    active = index;
    root.setAttribute('data-deck-ready', '');
    if (!phone.matches) return true;
    const screen = screens[index];
    screen.scrollTop = 0;
    if (animate && !reduced.matches) {
      // Same slanted band as the client switch, with the screen sliding in behind it.
      void screen.offsetWidth;
      screen.classList.add(forward ? 'screen-in' : 'screen-back');
      if (wipe) {
        wipe.classList.remove('is-running');
        wipe.dataset.dir = forward ? 'next' : 'prev';
        void wipe.offsetWidth;
        wipe.classList.add('is-running');
      }
    }
    requestAnimationFrame(cue);
    return true;
  }
  const fromHash = (animate: boolean) => show(location.hash.slice(1), animate);

  screens.forEach((screen) => screen.addEventListener('scroll', cue, { passive: true }));
  new ResizeObserver(cue).observe(root);
  window.addEventListener('hashchange', () => { if (phone.matches) fromHash(true); });
  // A link to the screen already in the address bar fires no hashchange.
  document.addEventListener('click', (event) => {
    if (!phone.matches) return;
    const link = (event.target as HTMLElement).closest?.<HTMLAnchorElement>('a[href*="#"]');
    if (!link || link.pathname !== location.pathname || !link.hash) return;
    if (show(link.hash.slice(1))) {
      event.preventDefault();
      history.replaceState(null, '', link.hash);
    }
  });
  phone.addEventListener('change', () => { if (phone.matches) requestAnimationFrame(cue); });
  if (!fromHash(false)) show(screens[0].id, false);
  dockFooter(phone);
}
