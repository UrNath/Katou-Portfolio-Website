import { useEffect, useRef, useState } from 'preact/hooks';
import { flushSync } from 'preact/compat';
import { editCredit, youtubeId, type ViewerClip } from '../lib/clip-shared';

interface Props {
  clips: ViewerClip[];
}

function placeholder(href: string | null): boolean {
  return !href || href === '#';
}

export default function ClipViewer({ clips }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [embeds, setEmbeds] = useState<Record<string, boolean>>({});
  const [motion, setMotion] = useState(true);
  const openRef = useRef(false);
  const dragStart = useRef(0);

  const reduce = () =>
    document.documentElement.classList.contains('poster-only') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scrollToIndex = (next: number) => {
    const scroller = scrollerRef.current;
    const clip = clips[next];
    if (!scroller || !clip) return;
    const slide = scroller.querySelector<HTMLElement>(`[data-slide="${clip.id}"]`);
    slide?.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
  };

  const show = (id: string) => {
    const next = Math.max(0, clips.findIndex((clip) => clip.id === id));
    const card = document.querySelector<HTMLElement>(`[data-clip-id="${clips[next]?.id ?? id}"] .clip-frame`);
    const name = 'clip-open';
    const previousName = card?.style.viewTransitionName ?? '';

    const commit = () => {
      flushSync(() => {
        setIndex(next);
        setOpen(true);
      });
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) dialog.showModal();
      const scroller = scrollerRef.current;
      const slide = scroller?.querySelector<HTMLElement>(
        `[data-slide-media="${clips[next]?.id ?? id}"]`,
      );
      if (card) card.style.viewTransitionName = previousName;
      if (slide) slide.style.viewTransitionName = name;
      const target = scroller?.querySelector<HTMLElement>(`[data-slide="${clips[next]?.id ?? id}"]`);
      target?.scrollIntoView({ behavior: 'auto', block: 'start' });
      openRef.current = true;
      document.dispatchEvent(new CustomEvent('nk:viewer', { detail: { open: true } }));
      const queued = (window as Window & { __nkClip?: string }).__nkClip;
      if (queued === id) delete (window as Window & { __nkClip?: string }).__nkClip;
    };

    if (card && !reduce() && 'startViewTransition' in document) {
      card.style.viewTransitionName = name;
      const transition = document.startViewTransition(() => commit());
      transition.finished.finally(() => {
        document.querySelectorAll<HTMLElement>('[data-slide-media]').forEach((node) => {
          if (node.style.viewTransitionName === name) node.style.viewTransitionName = '';
        });
      });
    } else {
      commit();
    }

    if (!history.state || !(history.state as { viewer?: boolean }).viewer) {
      history.pushState({ viewer: true }, '');
      pushed.current = true;
    }
  };

  const hide = (fromPop: boolean) => {
    setOpen(false);
    openRef.current = false;
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    document.dispatchEvent(new CustomEvent('nk:viewer', { detail: { open: false } }));
    if (!fromPop && pushed.current) {
      pushed.current = false;
      history.back();
    }
  };

  useEffect(() => {
    setMotion(!reduce());
    const pending = (window as Window & { __nkClip?: string }).__nkClip;
    if (pending) show(pending);

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('[data-pause]')) return;
      const opener = target.closest<HTMLElement>('[data-open-clip]');
      if (!opener) return;
      const id = opener.getAttribute('data-open-clip');
      if (id) show(id);
    };

    const onPop = () => {
      if (openRef.current) {
        pushed.current = false;
        hide(true);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (!openRef.current) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setIndex((value) => {
          const next = Math.min(clips.length - 1, value + 1);
          scrollToIndex(next);
          return next;
        });
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setIndex((value) => {
          const next = Math.max(0, value - 1);
          scrollToIndex(next);
          return next;
        });
      }
    };

    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
    // show/hide close over the latest clips list; the island mounts once per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const onScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller || !openRef.current) return;
    const next = Math.round(scroller.scrollTop / Math.max(scroller.clientHeight, 1));
    const clamped = Math.min(clips.length - 1, Math.max(0, next));
    setIndex((value) => (value === clamped ? value : clamped));
  };

  const active = clips[index];

  const onPointerDown = (event: PointerEvent) => {
    dragStart.current = event.clientY;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (event.clientY - dragStart.current > 72) hide(false);
  };

  return (
    <dialog
      class="viewer"
      ref={dialogRef}
      aria-label="Clip viewer"
      onClose={() => {
        if (openRef.current) hide(false);
      }}
    >
      <div class="viewer-top" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <button class="icon-btn" type="button" aria-label="Close viewer" onClick={() => hide(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
        <p class="viewer-count" aria-live="polite">
          {clips.length ? `${index + 1} / ${clips.length}` : ''}
        </p>
        <button
          class="icon-btn"
          type="button"
          aria-pressed={muted}
          aria-label={muted ? 'Unmute' : 'Mute'}
          onClick={() => setMuted((value) => !value)}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5z" />
              <path d="m22 9-6 6" />
              <path d="m16 9 6 6" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5z" />
              <path d="M16 9a5 5 0 0 1 0 6" />
              <path d="M19 7a8 8 0 0 1 0 10" />
            </svg>
          )}
        </button>
      </div>
      <div class="viewer-scroller" ref={scrollerRef} onScroll={onScroll}>
        {clips.map((clip, clipIndex) => {
          const yt = youtubeId(clip.youtube);
          const showEmbed = Boolean(embeds[clip.id] && yt);
          const near = open && Math.abs(clipIndex - index) <= 1;
          const showVideo = open && motion && Boolean(clip.previewSrc) && clipIndex === index && !showEmbed;
          return (
            <section class="viewer-slide" data-slide={clip.id} key={clip.id} aria-label={clip.title}>
              <div class="viewer-stage">
                <div
                  class={clip.wide ? 'viewer-frame is-landscape' : 'viewer-frame'}
                  data-slide-media={clip.id}
                >
                  {showEmbed && yt ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`}
                      title={`YouTube embed of ${clip.title}`}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <>
                      {near && <img src={clip.poster} alt="" decoding="async" />}
                      {showVideo && (
                        <video
                          src={clip.previewSrc}
                          muted={muted}
                          playsInline
                          loop
                          autoPlay
                          preload="none"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
              <p class="viewer-caption">
                <strong>{clip.title}</strong>
                <span>{editCredit(clip.channelHandle)}</span>
              </p>
              <div class={clip.tiktok ? 'viewer-actions' : 'viewer-actions one-link'}>
                <a
                  class="watch-link"
                  href={clip.youtube}
                  title={placeholder(clip.youtube) ? 'Placeholder link' : undefined}
                >
                  Watch on YouTube
                </a>
                {clip.tiktok && (
                  <a class="watch-link" href={clip.tiktok}>
                    Watch on TikTok
                  </a>
                )}
                {yt && !showEmbed && (
                  <button
                    class="embed-btn"
                    type="button"
                    onClick={() => setEmbeds((current) => ({ ...current, [clip.id]: true }))}
                  >
                    Play YouTube embed
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {active ? <span class="sr-only">Showing {active.title}</span> : null}
    </dialog>
  );
}
