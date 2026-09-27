import { useEffect } from 'preact/hooks';

function saveDataOn(): boolean {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  return Boolean(nav.connection?.saveData);
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function ClipPreview() {
  useEffect(() => {
    const posterOnly =
      document.documentElement.classList.contains('poster-only') ||
      reducedMotion() ||
      saveDataOn();
    if (posterOnly) {
      document.documentElement.classList.add('poster-only');
      return;
    }

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video[data-preview]'));
    const ratios = new WeakMap<HTMLVideoElement, number>();
    const userPaused = new WeakSet<HTMLVideoElement>();
    let current: HTMLVideoElement | null = null;
    let raf = 0;
    let viewerOpen = false;

    const cardOf = (video: HTMLVideoElement) => video.closest('.clip-card');

    const attach = (video: HTMLVideoElement) => {
      if (video.dataset.ready === '1') return;
      const src = video.dataset.src;
      if (!src) return;
      video.src = src;
      video.dataset.ready = '1';
    };

    const stopRaf = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const tick = () => {
      if (current && !current.paused && current.duration) {
        const bar = cardOf(current)?.querySelector<HTMLElement>('.clip-progress');
        if (bar) bar.style.transform = `scaleX(${current.currentTime / current.duration})`;
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const mark = (video: HTMLVideoElement | null, playing: boolean) => {
      const card = video ? cardOf(video) : null;
      card?.classList.toggle('is-playing', playing);
      if (!playing && video) {
        const bar = card?.querySelector<HTMLElement>('.clip-progress');
        if (bar) bar.style.transform = 'scaleX(0)';
      }
    };

    const pause = (video: HTMLVideoElement) => {
      video.pause();
      mark(video, false);
      if (current === video) current = null;
    };

    const play = (video: HTMLVideoElement) => {
      if (viewerOpen || userPaused.has(video)) return;
      attach(video);
      if (current && current !== video) pause(current);
      current = video;
      mark(video, true);
      void video.play().catch(() => mark(video, false));
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const pickInView = () => {
      if (fine || viewerOpen) return;
      let best: HTMLVideoElement | null = null;
      let bestScore = Number.POSITIVE_INFINITY;
      for (const video of videos) {
        if (video.dataset.hero === 'true') continue;
        const ratio = ratios.get(video) ?? 0;
        if (ratio < 0.6 || userPaused.has(video)) continue;
        const rect = video.getBoundingClientRect();
        const score = Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
        if (score < bestScore) {
          bestScore = score;
          best = video;
        }
      }
      if (best) play(best);
      else if (current && current.dataset.hero !== 'true') pause(current);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          ratios.set(video, entry.intersectionRatio);
          if (video.dataset.hero === 'true') {
            if (entry.intersectionRatio >= 0.5 && !userPaused.has(video)) play(video);
            else if (!entry.isIntersecting) pause(video);
          }
        }
        pickInView();
      },
      { threshold: [0, 0.5, 0.6, 0.75, 1] },
    );

    for (const video of videos) {
      io.observe(video);
      const card = cardOf(video);
      if (fine && card && video.dataset.hero !== 'true') {
        const enter = () => play(video);
        const leave = () => {
          if (!userPaused.has(video)) pause(video);
        };
        card.addEventListener('pointerenter', enter);
        card.addEventListener('pointerleave', leave);
        card.addEventListener('focusin', enter);
        card.addEventListener('focusout', leave);
      }
    }

    const onPauseClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-pause]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const video = button.closest('.clip-card')?.querySelector<HTMLVideoElement>('video[data-preview]');
      if (!video) return;
      if (video.paused) {
        userPaused.delete(video);
        play(video);
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', 'Pause preview');
      } else {
        userPaused.add(video);
        pause(video);
        button.setAttribute('aria-pressed', 'true');
        button.setAttribute('aria-label', 'Play preview');
      }
    };

    const onViewer = (event: Event) => {
      viewerOpen = Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open);
      if (viewerOpen && current) pause(current);
      if (!viewerOpen) pickInView();
    };

    document.addEventListener('click', onPauseClick);
    document.addEventListener('nk:viewer', onViewer);

    return () => {
      io.disconnect();
      stopRaf();
      document.removeEventListener('click', onPauseClick);
      document.removeEventListener('nk:viewer', onViewer);
    };
  }, []);

  return <span style={{ display: 'block', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true" />;
}
