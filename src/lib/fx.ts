/**
 * Site-wide effects helpers.
 *
 * 1. Frame-rate probe: on a visitor's first page view, watch ~1.5 s of frames after load.
 *    If the device can't hold ~40 fps, switch to the "fx-lite" tier (see BaseLayout) and
 *    remember that, so later pages start in the cheaper tier straight away.
 * 2. Animate on scroll: elements rise in when they reach the viewport. Opt-in, so content
 *    stays visible without scripting and with reduced motion.
 */
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function probe() {
  let saved: string | null = null;
  try { saved = localStorage.getItem('nk-fx'); } catch { /* storage blocked: probe every visit */ }
  if (saved || root.classList.contains('fx-lite') || reduced.matches) return;
  const times: number[] = [];
  let last = 0;
  const step = (now: number) => {
    if (last) times.push(now - last);
    last = now;
    if (times.length < 90 && !document.hidden) { requestAnimationFrame(step); return; }
    if (document.hidden || times.length < 30) return;
    times.sort((a, b) => a - b);
    // The slower end of normal frames, ignoring one-off hitches.
    const slow = times[Math.floor(times.length * .75)];
    const verdict = slow > 25 ? 'lite' : 'full';
    if (verdict === 'lite') root.classList.add('fx-lite');
    try { localStorage.setItem('nk-fx', verdict); } catch { /* ignore */ }
  };
  // Start once the page has settled, so loading work doesn't count against the device.
  setTimeout(() => requestAnimationFrame(step), 1800);
}

const REVEAL = [
  '.pc-feat-copy > *', '.pc-feat-visual', '.pc-feat-cta', '.pc-photo', '.pc-about-copy > *', '.pc-contact > :not(.pc-blob)',
  '.pc-wsec-head', '.sv-head', '.sv-pkg', '.sv-side > *', '.sv-steps li', '.sv-tier', '.sv-note',
  '.dc-card', '.contact-form', '.contact .guidelines', '.terms-head > *', '.terms-list > *', '.site-footer .footer-inner > *',
];

function reveal() {
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: .08 });
  const seen = new Set<Element>();
  REVEAL.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((el, index) => {
      if (seen.has(el) || el.closest('[data-reveal]') || el.hasAttribute('data-reveal')) return;
      seen.add(el);
      el.setAttribute('data-aos', '');
      el.style.setProperty('--d', String(index % 6));
      io.observe(el);
    });
  });
  root.classList.add('aos-ready');
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    root.classList.remove('aos-ready');
    io.disconnect();
  });
}

reveal();
if (document.readyState === 'complete') probe();
else addEventListener('load', probe, { once: true });
