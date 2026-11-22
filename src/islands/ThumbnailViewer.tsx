import { useEffect, useRef, useState } from 'preact/hooks';
import type { StudioThumbnail } from '../lib/studio-shared';

interface Props {
  items: StudioThumbnail[];
}

export default function ThumbnailViewer({ items }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState<StudioThumbnail | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const opener = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-open-thumb]');
      if (!opener) return;
      const id = opener.getAttribute('data-open-thumb');
      const item = items.find((thumb) => thumb.id === id);
      if (!item) return;
      setCurrent(item);
      dialogRef.current?.showModal();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [items]);

  const close = () => {
    dialogRef.current?.close();
    setCurrent(null);
  };

  // Previous / next move through the thumbnails that are showing on the page right now,
  // so search and filters also apply inside the viewer.
  const shown = () => {
    const ids: string[] = [];
    document.querySelectorAll<HTMLElement>('[data-open-thumb]').forEach((opener) => {
      const id = opener.getAttribute('data-open-thumb');
      if (id && opener.getClientRects().length > 0 && !ids.includes(id)) ids.push(id);
    });
    const list = ids.map((id) => items.find((thumb) => thumb.id === id)).filter((thumb): thumb is StudioThumbnail => Boolean(thumb));
    return list.length > 0 ? list : items;
  };
  const list = current ? shown() : [];
  const index = current ? Math.max(0, list.findIndex((thumb) => thumb.id === current.id)) : 0;
  const step = (direction: number) => {
    if (list.length < 2) return;
    setCurrent(list[(index + direction + list.length) % list.length]);
  };

  return (
    <dialog class="thumb-viewer" ref={dialogRef} aria-label="Thumbnail" onClose={() => setCurrent(null)} onKeyDown={(event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    }} onClick={(event) => {
      if (event.target === dialogRef.current) close();
    }}>
      {current && (
        <div class="thumb-sheet">
          <button class="icon-btn thumb-close" type="button" aria-label="Close" onClick={close}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          <img src={current.image} alt={current.title} />
          {list.length > 1 && (
            <div class="thumb-nav">
              <button class="icon-btn" type="button" aria-label="Previous thumbnail" onClick={() => step(-1)}>←</button>
              <span aria-live="polite">{index + 1} / {list.length}</span>
              <button class="icon-btn" type="button" aria-label="Next thumbnail" onClick={() => step(1)}>→</button>
            </div>
          )}
          <div class="thumb-copy">
            <p class="thumb-owner">{current.creator}</p>
            {current.channelHandle && <p class="thumb-handle">{current.channelHandle}</p>}
            <a class="thumb-video" href={current.videoUrl} target="_blank" rel="noopener noreferrer">
              {current.title}
            </a>
            <a class="thumb-url" href={current.videoUrl} target="_blank" rel="noopener noreferrer">
              {current.videoUrl}
            </a>
          </div>
        </div>
      )}
    </dialog>
  );
}
