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

  return (
    <dialog class="thumb-viewer" ref={dialogRef} aria-label="Thumbnail" onClick={(event) => {
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
