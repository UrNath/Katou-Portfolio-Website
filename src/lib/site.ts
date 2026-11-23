/**
 * Shared behaviour for every public page (see layouts/Site.astro):
 * phone menu, home section tabs, the slash page wipe, scroll reveals, the video player,
 * hover previews and the frame-rate probe that turns on the cheaper effects tier.
 */
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const root = document.documentElement;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- header height (one-screen layouts) and phone menu ---------- */
const bar = $('.bar');
const setBar = () => { if (bar) root.style.setProperty('--barh', `${bar.offsetHeight}px`); };
setBar();
addEventListener('resize', setBar);
const burger = $<HTMLButtonElement>('#burger');
const sheet = $('#sheet');
burger?.addEventListener('click', () => {
  if (!sheet) return;
  sheet.hidden = !sheet.hidden;
  burger.setAttribute('aria-expanded', String(!sheet.hidden));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheet && !sheet.hidden) { sheet.hidden = true; burger?.setAttribute('aria-expanded', 'false'); burger?.focus(); }
});

/* ---------- home section tabs follow the scroll ---------- */
const subLinks = $$<HTMLAnchorElement>('#subnav a');
if (subLinks.length && 'IntersectionObserver' in window) {
  const mark = (id: string) => subLinks.forEach((a) => a.classList.toggle('on', a.dataset.sub === id));
  const spy = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) mark(e.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
  subLinks.forEach((a) => { const t = document.getElementById(a.dataset.sub!); if (t) spy.observe(t); });
  subLinks.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById(a.dataset.sub!)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  }));
}

/* ---------- page wipe: three slanted bands cover, navigate, then uncover ---------- */
const ROUTES: Record<string, [string, string, string]> = {
  '/': ['Home', '01', '#2f6fe0'], '/works': ['Works', '02', '#ff5b34'], '/clients': ['Clients', '03', '#8fc8ff'],
  '/pricing': ['Pricing', '04', '#2f6fe0'], '/contact': ['Contact', '05', '#2f6fe0'], '/terms': ['Terms', '06', '#f3c443'],
};
const norm = (p: string) => p.replace(/\/+$/, '') || '/';
const wipe = $('#wipe')!;
const bands = $$('i', wipe);
const SK = 'skewX(-18deg) ';
function label(path: string) {
  const r = ROUTES[path];
  if (!r) return;
  wipe.style.setProperty('--wc', r[2]);
  $('#wipe-label')!.textContent = r[0];
  $('#wipe-sub')!.textContent = `Loading · ${r[1]}`;
}
function sweep(from: number, to: number, dur: number) {
  const lite = root.classList.contains('fx-lite');
  return Promise.all(bands.map((b, k) => {
    if (lite && k < 2) { b.style.display = 'none'; return Promise.resolve(); }
    return b.animate([{ transform: `${SK}translate3d(${from}%,0,0)` }, { transform: `${SK}translate3d(${to}%,0,0)` }],
      { duration: dur, delay: lite ? 0 : k * 50, easing: 'cubic-bezier(.77,0,.18,1)', fill: 'forwards' }).finished.catch(() => undefined);
  }));
}
let leaving = false;
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || leaving || reduced()) return;
  const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]');
  if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  const to = norm(url.pathname);
  if (!ROUTES[to] || to === norm(location.pathname)) return;
  e.preventDefault();
  leaving = true;
  label(to);
  wipe.classList.add('on');
  $('main.page')?.classList.add('leaving');
  sweep(-150, 0, 480).then(() => {
    try { sessionStorage.setItem('nk-wipe', JSON.stringify({ t: Date.now() })); } catch { /* still navigates */ }
    location.href = url.href;
  });
}, true);
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  leaving = false;
  wipe.classList.remove('on', 'covering');
  bands.forEach((b) => b.getAnimations().forEach((an) => an.cancel()));
  $('main.page')?.classList.remove('leaving');
});
if (root.classList.contains('wipe-arrive')) {
  try { sessionStorage.removeItem('nk-wipe'); } catch { /* ignore */ }
  label(norm(location.pathname));
  wipe.classList.add('on', 'covering');
  const open = () => {
    root.classList.remove('wipe-arrive');
    wipe.classList.remove('covering');
    sweep(0, 150, 560).then(() => { wipe.classList.remove('on'); bands.forEach((b) => b.getAnimations().forEach((an) => an.cancel())); });
  };
  (document.fonts?.ready ?? Promise.resolve()).then(() => setTimeout(open, 60), open);
}

/* ---------- animate on scroll (opt-in, so content shows without scripting) ---------- */
const AOS = ['.feat .wrap > div:first-child', '.carousel', '.feat-cta', '.about .vid', '.about .wrap > div:last-child > *', '.cta-band .wrap > *',
  '#p-works .row-head', '.svc-head', '.pkg', '.ed-side > *', '.steps li', '.tier', '.svc-sec .notes',
  '.dc-card', '.write', '.mailrow', '.form', '.tm-head > *', '.acc details', '.foot .wrap > *'];
if ('IntersectionObserver' in window && !reduced()) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -6% 0px', threshold: .08 });
  root.classList.add('aos-ready');
  AOS.forEach((sel) => $$(sel).forEach((el, i) => {
    el.dataset.aos = '';
    if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', String(i % 6));
    io.observe(el);
  }));
}

/* ---------- video player ---------- */
// Any element with data-play opens the player. Data: data-title, data-yt (YouTube URL), data-tt (TikTok URL),
// data-private (YouTube private), data-preview (mp4 loop), data-poster, data-wide, data-image (still).
const player = $<HTMLDialogElement>('#player')!;
const frame = $('#player-frame')!;
const links = $('#player-links')!;
function ytId(url: string) {
  try {
    const u = new URL(url); const host = u.hostname.replace(/^www\./, '');
    const id = host === 'youtu.be' ? u.pathname.slice(1) : u.pathname.startsWith('/shorts/') ? u.pathname.split('/')[2] : u.searchParams.get('v');
    return id && /^[\w-]{6,}$/.test(id) ? id : null;
  } catch { return null; }
}
function ttId(url: string) { const m = url.match(/\/video\/(\d+)/); return m ? m[1] : null; }
let opener: HTMLElement | null = null;
function openPlayer(el: HTMLElement) {
  opener = el;
  const d = el.dataset;
  const wide = d.wide === 'true';
  player.classList.toggle('is-wide', wide || !!d.image);
  frame.replaceChildren();
  links.replaceChildren();
  const yt = d.yt && d.private !== 'true' ? ytId(d.yt) : null;
  const tt = d.tt ? ttId(d.tt) : null;
  if (d.image) {
    const img = document.createElement('img'); img.src = d.image; img.alt = d.title ?? ''; frame.append(img);
  } else if (yt || tt) {
    const f = document.createElement('iframe');
    f.src = yt ? `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1` : `https://www.tiktok.com/embed/v2/${tt}`;
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true; f.title = d.title ?? 'Video';
    frame.append(f);
  } else if (d.preview) {
    const v = document.createElement('video'); v.src = d.preview; v.poster = d.poster ?? ''; v.controls = true; v.autoplay = true; v.playsInline = true; frame.append(v);
  }
  $('#player-title')!.textContent = d.title ?? '';
  const add = (href: string | undefined, text: string) => { if (!href) return; const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'ui'; a.textContent = text; links.append(a); };
  if (d.private !== 'true') add(d.yt, 'Watch on YouTube ↗');
  add(d.tt, 'Watch on TikTok ↗');
  add(d.link, 'Open the video ↗');
  player.showModal();
  if (!reduced()) player.querySelector('.player-card')?.animate([{ opacity: 0, transform: 'translateY(24px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
document.addEventListener('click', (e) => {
  const el = (e.target as Element | null)?.closest?.<HTMLElement>('[data-play]');
  if (!el || el.dataset.play === 'off') return;
  e.preventDefault();
  openPlayer(el);
});
player.addEventListener('click', (e) => {
  if (e.target === player || (e.target as Element).closest('[data-player-close]')) player.close();
});
player.addEventListener('close', () => { frame.replaceChildren(); opener?.focus({ preventScroll: true }); });

/* ---------- hover previews (mouse only, full effects tier) ---------- */
document.addEventListener('pointerover', (e) => {
  if ((e as PointerEvent).pointerType !== 'mouse' || root.classList.contains('fx-lite')) return;
  const card = (e.target as Element | null)?.closest?.<HTMLElement>('[data-preview]');
  const box = card?.querySelector<HTMLElement>('.pf');
  if (!card || !box || box.querySelector('video')) return;
  const v = document.createElement('video');
  v.src = card.dataset.preview!; v.muted = true; v.loop = true; v.playsInline = true; v.className = 'pv';
  box.append(v);
  v.play().catch(() => v.remove());
  card.addEventListener('pointerleave', () => v.remove(), { once: true });
});

/* ---------- frame-rate probe: slow devices switch to the cheaper tier ---------- */
function probe() {
  let saved: string | null = null;
  try { saved = localStorage.getItem('nk-fx'); } catch { /* ignore */ }
  if (saved || root.classList.contains('fx-lite') || reduced()) return;
  const times: number[] = [];
  let last = 0;
  const step = (now: number) => {
    if (last) times.push(now - last);
    last = now;
    if (times.length < 90 && !document.hidden) { requestAnimationFrame(step); return; }
    if (document.hidden || times.length < 30) return;
    times.sort((a, b) => a - b);
    const verdict = times[Math.floor(times.length * .75)] > 25 ? 'lite' : 'full';
    if (verdict === 'lite') root.classList.add('fx-lite');
    try { localStorage.setItem('nk-fx', verdict); } catch { /* ignore */ }
  };
  setTimeout(() => requestAnimationFrame(step), 1800);
}
if (document.readyState === 'complete') probe(); else addEventListener('load', probe, { once: true });

export {};
