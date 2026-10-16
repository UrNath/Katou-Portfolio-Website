import { useEffect, useState } from 'preact/hooks';
import { youtubeId } from '../lib/clip-shared';
import {
  OMITTED_CLIP_IDS,
  isThumbnailImage,
  slugify,
  type SectionKind,
  type StudioClip,
  type StudioCreator,
  type StudioPayload,
  type StudioSection,
  type StudioTerm,
  type StudioThumbnail,
} from '../lib/studio-shared';

const omitted = new Set<string>(OMITTED_CLIP_IDS);
const TOKEN_KEY = 'nk-studio-github-token';
const tabs = [
  { id: 'videos', label: 'Videos' },
  { id: 'featured', label: 'Home' },
  { id: 'creators', label: 'Clients' },
  { id: 'sections', label: 'Sections' },
  { id: 'thumbnails', label: 'Thumbnails' },
  { id: 'tags', label: 'Tags' },
  { id: 'terms', label: 'Terms' },
] as const;

type Tab = (typeof tabs)[number]['id'];

const kindName: Record<SectionKind, string> = {
  vertical: 'Shorts',
  landscape: 'Long videos',
  thumbnail: 'Thumbnails',
  custom: 'Custom',
};

const emptyVideo = {
  title: '',
  creator: '',
  handle: '',
  youtubeUrl: '',
  tiktokUrl: '',
  sectionId: 'shorts',
  longFormCategory: 'normal' as 'vlogs' | 'mvs' | 'normal',
  tags: [] as string[],
};

function storedToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

function studioHeaders(token: string, json = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers['content-type'] = 'application/json';
  if (token) headers['x-admin-token'] = token;
  return headers;
}

function clipTagLabels(clip: StudioClip): string[] {
  return Array.isArray(clip.tags) ? clip.tags.map(String) : [];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function uniqueId(base: string, taken: Set<string>): string {
  let id = slugify(base) || 'clip';
  let n = 2;
  while (taken.has(id) || omitted.has(id)) id = `${slugify(base) || 'clip'}-${n++}`;
  return id;
}

function posterOf(clip: StudioClip): string {
  if (typeof clip.posterUrl === 'string' &&
      (clip.posterUrl.startsWith('https://') || clip.posterUrl.startsWith('/media/posters/'))) {
    return clip.posterUrl;
  }
  const id = youtubeId(clip.youtubeUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '/og.png';
}

export default function AdminStudio({ oauth = false, login = '' }: { oauth?: boolean; login?: string }) {
  const [data, setData] = useState<StudioPayload | null>(null);
  const [saved, setSaved] = useState('');
  const [tab, setTab] = useState<Tab>('videos');
  const [query, setQuery] = useState('');
  const [client, setClient] = useState('');
  const [draft, setDraft] = useState(emptyVideo);
  const [thumb, setThumb] = useState({
    creator: '', handle: '', title: '', image: '', videoUrl: '',
    orientation: 'landscape' as 'vertical' | 'landscape',
  });
  const [editingThumb, setEditingThumb] = useState('');
  const [thumbUploading, setThumbUploading] = useState('');
  const [thumbPreviews, setThumbPreviews] = useState<Record<string, string>>({});
  const [clientName, setClientName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [sectionKind, setSectionKind] = useState<SectionKind>('custom');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [tokenDraft, setTokenDraft] = useState('');
  const [needsToken, setNeedsToken] = useState(false);
  const [tagName, setTagName] = useState('');
  const [editingPoster, setEditingPoster] = useState('');
  const [posterDraft, setPosterDraft] = useState('');
  const [posterUploading, setPosterUploading] = useState('');
  const [posterPreviews, setPosterPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    if (oauth) {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
    }
    const token = oauth ? '' : storedToken();
    setGithubToken(token);
    const apply = (response: Response, body: { error?: string }) => {
      setNeedsToken(response.headers.get('x-studio-save') === 'needs-token');
      if (body.error) setError(body.error);
      else {
        setData(body as StudioPayload);
        setSaved(JSON.stringify(body));
      }
    };
    fetch('/api/admin/studio', { headers: studioHeaders(token) })
      .then(async (response) => {
        if (response.status === 401 && oauth) {
          location.href = '/api/admin/login';
          return;
        }
        const body = await response.json();
        if (body.error && token) {
          try {
            localStorage.removeItem(TOKEN_KEY);
          } catch {
            /* ignore */
          }
          setGithubToken('');
          const retry = await fetch('/api/admin/studio');
          apply(retry, await retry.json());
          setError('The token saved in this browser was refused. Paste the new one under Live save.');
          return;
        }
        apply(response, body);
      })
      .catch(() => setError('Could not load the editor.'));
  }, [oauth]);

  if (!data) {
    return (
      <section class="studio">
        <h1 class="page-title">Studio</h1>
        <p class="studio-note">{error || 'Loading the catalog…'}</p>
        {error && !oauth && (
          <button
            class="cta studio-save"
            type="button"
            style="margin-top: 16px"
            onClick={() => {
              try {
                localStorage.removeItem(TOKEN_KEY);
              } catch {
                /* ignore */
              }
              location.reload();
            }}
          >
            Forget saved token and reload
          </button>
        )}
      </section>
    );
  }

  const dirty = JSON.stringify(data) !== saved;
  const clipSections = data.sections.filter((section) => section.kind !== 'thumbnail');
  const counts: Record<Tab, number> = {
    videos: data.clips.length,
    featured: data.order.length,
    creators: data.creators.length,
    sections: data.sections.length,
    thumbnails: data.thumbnails.length,
    tags: data.tags.length,
    terms: data.terms.length,
  };

  const patch = (next: Partial<StudioPayload>) => setData({ ...data, ...next });

  const sectionOf = (clip: StudioClip): string => {
    if (clip.section && clipSections.some((section) => section.id === clip.section)) return clip.section;
    const kind = clip.orientation === 'landscape' ? 'landscape' : 'vertical';
    return data.sections.find((section) => section.kind === kind)?.id ?? '';
  };

  const shown = data.clips.filter((clip) => {
    if (client && slugify(clip.creator) !== client) return false;
    const hay = `${clip.title} ${clip.creator} ${clip.id}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  const groups = clipSections
    .map((section) => ({ section, clips: shown.filter((clip) => sectionOf(clip) === section.id) }))
    .filter((group) => group.clips.length > 0);

  const setClip = (id: string, change: Partial<StudioClip>) => {
    patch({ clips: data.clips.map((clip) => (clip.id === id ? { ...clip, ...change } : clip)) });
  };

  const editPoster = (clip: StudioClip) => {
    setEditingPoster(editingPoster === clip.id ? '' : clip.id);
    setPosterDraft(typeof clip.posterUrl === 'string' ? clip.posterUrl : '');
    setError('');
  };

  const applyPosterUrl = (clip: StudioClip) => {
    const value = posterDraft.trim();
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch {
      setError('Enter a valid HTTPS image link, or upload a thumbnail file.');
      return;
    }
    setClip(clip.id, { posterUrl: value });
    setPosterPreviews((current) => ({ ...current, [clip.id]: '' }));
    setError('');
    setMessage('Thumbnail link selected. Press Save to publish.');
  };

  const uploadPoster = async (clip: StudioClip, file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setError('Choose a PNG, JPG, or WebP image smaller than 4 MB.');
      return;
    }
    setPosterUploading(clip.id);
    setError('');
    try {
      const form = new FormData();
      form.set('clipId', clip.id);
      form.set('file', file);
      const response = await fetch('/api/admin/poster', {
        method: 'POST',
        headers: studioHeaders(oauth ? '' : githubToken),
        body: form,
      });
      if (response.status === 401 && oauth) {
        location.href = '/api/admin/login';
        return;
      }
      const body = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !body.url) throw new Error(body.error || 'Upload failed.');
      // Show the selected file immediately; the real path becomes available after redeployment.
      const preview = URL.createObjectURL(file);
      setPosterPreviews((current) => {
        if (current[clip.id]?.startsWith('blob:')) URL.revokeObjectURL(current[clip.id]);
        return { ...current, [clip.id]: preview };
      });
      setClip(clip.id, { posterUrl: body.url });
      setPosterDraft(body.url);
      setMessage('Thumbnail uploaded to the repository. Press Save to attach it to this video.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Upload failed.');
    } finally {
      setPosterUploading('');
    }
  };

  const assignSection = (clip: StudioClip, sectionId: string) => {
    const section = data.sections.find((item) => item.id === sectionId);
    if (!section || section.kind === 'thumbnail') return;
    const orientation =
      section.kind === 'landscape' ? 'landscape' : section.kind === 'vertical' ? 'vertical' : clip.orientation;
    const next: Partial<StudioClip> = { section: section.id, orientation };
    if (orientation !== clip.orientation) {
      next.aspectRatio = orientation === 'landscape' ? '16:9' : '9:16';
      next.type = orientation === 'landscape' ? 'video' : 'short';
    }
    setClip(clip.id, next);
  };

  const removeClip = (id: string) => {
    if (data.clips.length <= 1) {
      setError('Keep at least one video on Works.');
      return;
    }
    const clips = data.clips.filter((clip) => clip.id !== id);
    let order = data.order.filter((item) => item !== id);
    let heroId = data.heroId === id ? order[0] ?? clips[0]?.id ?? '' : data.heroId;
    if (heroId && !order.includes(heroId)) order = [heroId, ...order];
    patch({ clips, order, heroId });
    setError('');
  };

  const addClip = () => {
    const title = draft.title.trim();
    const creator = draft.creator.trim();
    const youtubeUrl = draft.youtubeUrl.trim();
    if (!title || !creator || !youtubeUrl.startsWith('http')) {
      setError('A video needs a title, a client, and a YouTube link.');
      return;
    }
    const section = data.sections.find((item) => item.id === draft.sectionId);
    const orientation = section?.kind === 'landscape' ? 'landscape' : 'vertical';
    const id = uniqueId(title, new Set(data.clips.map((clip) => clip.id)));
    const handle = draft.handle.trim();
    const clip: StudioClip = {
      id,
      creator,
      channelHandle: handle ? (handle.startsWith('@') ? handle : `@${handle}`) : '@unknown',
      title,
      youtubeUrl,
      tiktokUrl: draft.tiktokUrl.trim().startsWith('http') ? draft.tiktokUrl.trim() : null,
      tiktokMatchConfidence: null,
      uploadDate: today(),
      durationSec: orientation === 'landscape' ? 180 : 45,
      viewCount: 0,
      orientation,
      aspectRatio: orientation === 'landscape' ? '16:9' : '9:16',
      type: orientation === 'landscape' ? 'video' : 'short',
      longFormCategory: orientation === 'landscape' ? draft.longFormCategory : undefined,
      poster: `posters/${id}.webp`,
      preview: '',
      tags: draft.tags,
      tagsSuggested: true,
      featured: false,
      heroFeatured: false,
      credit: 'Edit by NassuKatou',
      section: section?.id,
    };
    const creators = data.creators.some((item) => item.id === slugify(creator))
      ? data.creators
      : [...data.creators, { id: slugify(creator), label: creator }];
    patch({ clips: [clip, ...data.clips], creators });
    setDraft({ ...emptyVideo, sectionId: draft.sectionId, creator });
    setError('');
    setMessage('Added. Save to publish it on Works.');
    setTab('videos');
  };

  const move = (id: string, delta: number) => {
    const order = [...data.order];
    const index = order.indexOf(id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= order.length) return;
    const [item] = order.splice(index, 1);
    order.splice(next, 0, item);
    patch({ order });
  };

  const addFeatured = (id: string) => {
    if (!id || data.order.includes(id)) return;
    patch({ order: [...data.order, id] });
  };

  const removeFeatured = (id: string) => {
    if (data.order.length <= 1) {
      setError('The home page needs at least one video.');
      return;
    }
    const order = data.order.filter((item) => item !== id);
    patch({ order, heroId: data.heroId === id ? order[0] : data.heroId });
    setError('');
  };

  const addCreator = () => {
    const label = clientName.trim();
    const id = slugify(label);
    if (!label || !id) return;
    if (data.creators.some((creator) => creator.id === id)) {
      setError('That client is already on the list.');
      return;
    }
    patch({ creators: [...data.creators, { id, label }] });
    setClientName('');
    setError('');
    setMessage(`${label} will get a filter on Works after you save.`);
  };

  const renameCreator = (creator: StudioCreator, label: string) => {
    patch({
      creators: data.creators.map((item) => (item.id === creator.id ? { ...item, label } : item)),
      clips: data.clips.map((clip) => (slugify(clip.creator) === creator.id ? { ...clip, creator: label } : clip)),
      thumbnails: data.thumbnails.map((item) =>
        slugify(item.creator) === creator.id ? { ...item, creator: label } : item,
      ),
    });
  };

  const addSection = () => {
    const label = sectionName.trim();
    const id = slugify(label);
    if (!label || !id) return;
    if (data.sections.some((section) => section.id === id)) {
      setError('That section already exists.');
      return;
    }
    patch({ sections: [...data.sections, { id, label, kind: sectionKind }] });
    setSectionName('');
    setError('');
  };

  const moveSection = (index: number, delta: number) => {
    const sections = [...data.sections];
    const next = index + delta;
    if (next < 0 || next >= sections.length) return;
    const [item] = sections.splice(index, 1);
    sections.splice(next, 0, item);
    patch({ sections });
  };

  const removeSection = (section: StudioSection) => {
    const kindCount = data.sections.filter((item) => item.kind === section.kind).length;
    if ((section.kind === 'vertical' || section.kind === 'landscape') && kindCount <= 1) {
      setError('Keep at least one short section and one long section.');
      return;
    }
    patch({
      sections: data.sections.filter((item) => item.id !== section.id),
      clips: data.clips.map((clip) => (clip.section === section.id ? { ...clip, section: undefined } : clip)),
    });
    setError('');
  };

  const imageOfThumbnail = (item: StudioThumbnail): string => {
    if (item.image.startsWith('clip:')) {
      const source = data.clips.find((clip) => clip.id === item.image.slice(5));
      return source ? posterOf(source) : '/og.png';
    }
    return item.image;
  };

  const fromVideo = (clip: StudioClip): Partial<StudioThumbnail> => ({
    image: `clip:${clip.id}`,
    title: clip.title,
    creator: clip.creator,
    channelHandle: clip.channelHandle,
    videoUrl: clip.youtubeUrl,
    orientation: clip.orientation,
  });

  const setThumbnail = (id: string, change: Partial<StudioThumbnail>) => {
    patch({ thumbnails: data.thumbnails.map((row) => row.id === id ? { ...row, ...change } : row) });
  };

  const moveThumbnail = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= data.thumbnails.length) return;
    const items = [...data.thumbnails];
    const [row] = items.splice(index, 1);
    items.splice(next, 0, row);
    patch({ thumbnails: items });
  };

  const uploadThumbnail = async (item: StudioThumbnail, file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 4 * 1024 * 1024) {
      setError('Select a JPG, PNG or WebP image smaller than 4 MB.');
      return;
    }
    setThumbUploading(item.id);
    setError('');
    try {
      const form = new FormData();
      form.set('thumbnailId', item.id);
      form.set('file', file);
      const response = await fetch('/api/admin/poster', {
        method: 'POST',
        headers: studioHeaders(oauth ? '' : githubToken),
        body: form,
      });
      if (response.status === 401 && oauth) {
        location.href = '/api/admin/login';
        return;
      }
      const result = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !result.url) throw new Error(result.error || 'Thumbnail upload failed.');
      const url = URL.createObjectURL(file);
      setThumbPreviews((current) => {
        if (current[item.id]?.startsWith('blob:')) URL.revokeObjectURL(current[item.id]);
        return { ...current, [item.id]: url };
      });
      setThumbnail(item.id, { image: result.url });
      setMessage('Thumbnail uploaded. Press Save to attach it to this gallery entry.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Thumbnail upload failed.');
    } finally {
      setThumbUploading('');
    }
  };

  const addThumb = () => {
    const title = thumb.title.trim();
    const creator = thumb.creator.trim();
    if (!title || !creator || !isThumbnailImage(thumb.image.trim()) || !thumb.videoUrl.startsWith('http')) {
      setError('A thumbnail needs the client, the image link, the video name, and the video link.');
      return;
    }
    const handle = thumb.handle.trim();
    const item: StudioThumbnail = {
      id: uniqueId(title, new Set(data.thumbnails.map((row) => row.id))),
      creator,
      channelHandle: handle ? (handle.startsWith('@') ? handle : `@${handle}`) : '',
      title,
      image: thumb.image.trim(),
      videoUrl: thumb.videoUrl.trim(),
      orientation: thumb.orientation,
    };
    const creators = data.creators.some((row) => row.id === slugify(creator))
      ? data.creators
      : [...data.creators, { id: slugify(creator), label: creator }];
    patch({ thumbnails: [item, ...data.thumbnails], creators });
    setThumb({ creator, handle: thumb.handle, title: '', image: '', videoUrl: '', orientation: 'landscape' });
    setError('');
    setMessage('Thumbnail added. Save to show it on Works.');
  };

  const setTerm = (id: string, change: Partial<StudioTerm>) => {
    patch({ terms: data.terms.map((section) => (section.id === id ? { ...section, ...change } : section)) });
  };

  const moveTerm = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= data.terms.length) return;
    const terms = [...data.terms];
    const [row] = terms.splice(index, 1);
    terms.splice(next, 0, row);
    patch({ terms });
  };

  const addTerm = () => {
    const id = uniqueId('section', new Set(data.terms.map((section) => section.id)));
    patch({ terms: [...data.terms, { id, title: 'New section', paragraphs: [''] }] });
    setError('');
    setMessage('Section added. Save to publish it on Terms.');
  };

  const save = async () => {
    const invalid = data.thumbnails.find((item) =>
      !item.title.trim() ||
      !item.creator.trim() ||
      !isThumbnailImage(item.image.trim()) ||
      !item.videoUrl.startsWith('http')
    );
    if (invalid) {
      setTab('thumbnails');
      setEditingThumb(invalid.id);
      setError(`Check the thumbnail details for "${invalid.title || invalid.id}" before saving.`);
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/studio', {
        method: 'POST',
        headers: studioHeaders(oauth ? '' : githubToken, true),
        body: JSON.stringify(data),
      });
      if (response.status === 401 && oauth) {
        location.href = '/api/admin/login';
        return;
      }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Save failed.');
      setSaved(JSON.stringify(data));
      setMessage(body.mode === 'github' ? 'Saved. Vercel will rebuild the live site.' : 'Saved on this computer.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const tagUses = (label: string) =>
    data.clips.filter((clip) => clipTagLabels(clip).some((tag) => slugify(tag) === slugify(label))).length;

  const renameTag = (label: string, nextLabel: string) => {
    const next = nextLabel.trim();
    if (!next) return;
    if (slugify(next) !== slugify(label) && data.tags.some((tag) => slugify(tag) === slugify(next))) {
      setError('That tag already exists.');
      return;
    }
    patch({
      tags: data.tags.map((tag) => (tag === label ? next : tag)),
      clips: data.clips.map((clip) => ({
        ...clip,
        tags: clipTagLabels(clip).map((tag) => (slugify(tag) === slugify(label) ? next : tag)),
      })),
    });
    setError('');
  };

  const moveTag = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= data.tags.length) return;
    const tags = [...data.tags];
    const [row] = tags.splice(index, 1);
    tags.splice(next, 0, row);
    patch({ tags });
  };

  const removeTag = (label: string) => {
    const id = slugify(label);
    patch({
      tags: data.tags.filter((tag) => slugify(tag) !== id),
      clips: data.clips.map((clip) => ({
        ...clip,
        tags: clipTagLabels(clip).filter((tag) => slugify(tag) !== id),
      })),
    });
    setError('');
  };

  const toggleClipTag = (clip: StudioClip, label: string) => {
    const id = slugify(label);
    const tags = clipTagLabels(clip);
    const has = tags.some((tag) => slugify(tag) === id);
    setClip(clip.id, { tags: has ? tags.filter((tag) => slugify(tag) !== id) : [...tags, label] });
  };

  const uses = (id: string) =>
    data.clips.filter((clip) => slugify(clip.creator) === id).length +
    data.thumbnails.filter((item) => slugify(item.creator) === id).length;

  return (
    <section class="studio">
      <header class="studio-head">
        <div>
          <p class="kicker">Private</p>
          <h1 class="page-title">Studio</h1>
          <p class="studio-note">
            Works, the home reel, client filters, tag filters, and the Terms page. Prices and contact stay in <a href="/keystatic">Keystatic</a>.
          </p>
          {oauth && login && <p class="studio-note">Signed in as {login}.</p>}
        </div>
        <div class="studio-head-actions">
          {oauth && (
            <a class="studio-preview" href="/api/admin/logout">
              Sign out
            </a>
          )}
          <a class="studio-preview" href="/works">View Works</a>
          <button class="cta studio-save" type="button" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </header>
      {(message || error) && <p class={error ? 'studio-error' : 'studio-ok'}>{error || message}</p>}
      {!oauth && (needsToken || githubToken || /token/i.test(error)) && (
        <form
          class="studio-card studio-token"
          onSubmit={(event) => {
            event.preventDefault();
            const next = tokenDraft.trim();
            try {
              if (next) localStorage.setItem(TOKEN_KEY, next);
              else localStorage.removeItem(TOKEN_KEY);
            } catch {
              setError('This browser blocked saving the token.');
              return;
            }
            setGithubToken(next);
            setTokenDraft('');
            setNeedsToken(!next);
            setError('');
            setMessage(next ? 'Token saved in this browser. Press Save again.' : 'Token removed from this browser.');
          }}
        >
          <h2>Live save</h2>
          <p class="studio-note">
            The live site saves by committing to GitHub. Create a fine-grained token for only this repo, with Contents set to Read and write, then paste it here. It stays in this browser.
          </p>
          {githubToken && <p class="studio-note">A token is already saved in this browser.</p>}
          <label class="field">
            <span>GitHub token</span>
            <input
              type="password"
              autocomplete="off"
              value={tokenDraft}
              placeholder="github_pat_… or ghp_…"
              onInput={(event) => setTokenDraft(event.currentTarget.value)}
            />
          </label>
          <div class="studio-actions">
            <button class="cta" type="submit" disabled={!tokenDraft.trim()}>
              Save token
            </button>
            {githubToken && (
              <button
                class="studio-icon is-quiet"
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(TOKEN_KEY);
                  } catch {
                    /* ignore */
                  }
                  setGithubToken('');
                  setNeedsToken(true);
                  setMessage('Token removed from this browser.');
                }}
              >
                Remove token
              </button>
            )}
            <a class="studio-preview" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
              Create a token
            </a>
          </div>
        </form>
      )}
      <div class="filters" role="tablist" aria-label="Editor sections">
        {tabs.map((item) => (
          <button
            class="filter-chip"
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-pressed={tab === item.id}
            onClick={() => {
              setTab(item.id);
              setError('');
            }}
          >
            {item.label}
            <span class="studio-count">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      {tab === 'videos' && (
        <div class="studio-videos">
          <form
            class="studio-card studio-composer"
            onSubmit={(event) => {
              event.preventDefault();
              addClip();
            }}
          >
            <h2>Add a video</h2>
            <p class="studio-note">New videos land at the top of Works. A poster file can come later — YouTube’s image is used until then.</p>
            <label class="field">
              <span>Title</span>
              <input value={draft.title} onInput={(event) => setDraft({ ...draft, title: event.currentTarget.value })} required />
            </label>
            <div class="studio-split">
              <label class="field">
                <span>Client</span>
                <input
                  list="client-names"
                  value={draft.creator}
                  onInput={(event) => setDraft({ ...draft, creator: event.currentTarget.value })}
                  required
                />
              </label>
              <label class="field">
                <span>Handle</span>
                <input
                  value={draft.handle}
                  placeholder="@name"
                  onInput={(event) => setDraft({ ...draft, handle: event.currentTarget.value })}
                />
              </label>
            </div>
            <label class="field">
              <span>YouTube link</span>
              <input
                type="url"
                value={draft.youtubeUrl}
                onInput={(event) => setDraft({ ...draft, youtubeUrl: event.currentTarget.value })}
                required
              />
            </label>
            <label class="field">
              <span>TikTok link</span>
              <input
                type="url"
                value={draft.tiktokUrl}
                onInput={(event) => setDraft({ ...draft, tiktokUrl: event.currentTarget.value })}
              />
            </label>
            <label class="field">
              <span>Section</span>
              <select value={draft.sectionId} onInput={(event) => setDraft({ ...draft, sectionId: event.currentTarget.value })}>
                {clipSections.map((section) => (
                  <option value={section.id}>{section.label}</option>
                ))}
              </select>
            </label>
            {data.sections.find((section) => section.id === draft.sectionId)?.kind === 'landscape' && (
              <label class="field">
                <span>Long Form Video category</span>
                <select value={draft.longFormCategory} onInput={(event) => setDraft({ ...draft, longFormCategory: event.currentTarget.value as 'vlogs' | 'mvs' | 'normal' })}>
                  <option value="vlogs">Vlogs</option>
                  <option value="mvs">MVs</option>
                  <option value="normal">Normal Videos</option>
                </select>
              </label>
            )}
            {data.tags.length > 0 && (
              <div class="studio-tag-picks" role="group" aria-label="Tags for the new video">
                {data.tags.map((tag) => {
                  const on = draft.tags.some((item) => slugify(item) === slugify(tag));
                  return (
                    <button
                      class="filter-chip"
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          tags: on ? draft.tags.filter((item) => slugify(item) !== slugify(tag)) : [...draft.tags, tag],
                        })
                      }
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
            <button class="cta" type="submit">Add video</button>
          </form>
          <div class="studio-catalog">
            <label class="field studio-find">
              <span>Find</span>
              <input value={query} placeholder="Title or client" onInput={(event) => setQuery(event.currentTarget.value)} />
            </label>
            <div class="filters studio-clients" role="toolbar" aria-label="Filter by client">
              <button class="filter-chip" type="button" aria-pressed={client === ''} onClick={() => setClient('')}>
                All
              </button>
              {data.creators.map((creator) => (
                <button
                  class="filter-chip"
                  type="button"
                  aria-pressed={client === creator.id}
                  onClick={() => setClient(client === creator.id ? '' : creator.id)}
                >
                  {creator.label}
                </button>
              ))}
            </div>
            {groups.map((group) => (
              <div key={group.section.id}>
                <h3 class="studio-group">
                  {group.section.label}
                  <span>{group.clips.length}</span>
                </h3>
                <ul class="studio-list">
                  {group.clips.map((clip) => (
                    <li class="studio-row studio-clip" key={clip.id}>
                      <img
                        class={clip.orientation === 'landscape' ? 'studio-poster is-wide' : 'studio-poster'}
                        src={posterOf(clip)}
                        alt=""
                      />
                      <div class="studio-copy">
                        <strong>{clip.title}</strong>
                        <span>{clip.creator}</span>
                      </div>
                      <div class="studio-clip-selects">
                        <select aria-label={`Section for ${clip.title}`} value={sectionOf(clip)} onInput={(event) => assignSection(clip, event.currentTarget.value)}>
                          {clipSections.map((section) => (
                            <option value={section.id}>{section.label}</option>
                          ))}
                        </select>
                        {clip.orientation === 'landscape' && (
                          <select
                            aria-label={`Long Form Video category for ${clip.title}`}
                            value={clip.longFormCategory ?? 'normal'}
                            onInput={(event) => setClip(clip.id, { longFormCategory: event.currentTarget.value as 'vlogs' | 'mvs' | 'normal' })}
                          >
                            <option value="vlogs">Vlogs</option>
                            <option value="mvs">MVs</option>
                            <option value="normal">Normal Videos</option>
                          </select>
                        )}
                      </div>
                      <button class="studio-icon is-quiet" type="button" onClick={() => removeClip(clip.id)}>
                        Remove
                      </button>
                      <button
                        class="studio-icon"
                        type="button"
                        aria-expanded={editingPoster === clip.id}
                        aria-controls={`poster-editor-${clip.id}`}
                        onClick={() => editPoster(clip)}
                      >
                        {editingPoster === clip.id ? 'Close thumbnail' : 'Edit thumbnail'}
                      </button>
                      {editingPoster === clip.id && (
                        <div class="studio-poster-editor" id={`poster-editor-${clip.id}`}>
                          <img
                            class={clip.orientation === 'landscape' ? 'is-wide' : ''}
                            src={posterPreviews[clip.id] || posterOf(clip)}
                            alt={`Current thumbnail for ${clip.title}`}
                          />
                          <div class="studio-poster-fields">
                            <p class="studio-note">Change this video's poster image. Uploaded files are cropped to {clip.orientation === 'landscape' ? '960 × 540' : '540 × 960'} WebP.</p>
                            <label class="field">
                              <span>Upload image</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                disabled={posterUploading === clip.id}
                                onChange={(event) => {
                                  const file = event.currentTarget.files?.[0];
                                  if (file) void uploadPoster(clip, file);
                                  event.currentTarget.value = '';
                                }}
                              />
                            </label>
                            <label class="field">
                              <span>Or use an HTTPS image URL</span>
                              <input
                                type="url"
                                value={posterDraft}
                                placeholder="Paste an HTTPS image URL…"
                                onInput={(event) => setPosterDraft(event.currentTarget.value)}
                              />
                            </label>
                            <div class="studio-actions">
                              <button class="studio-icon" type="button" disabled={posterUploading === clip.id} onClick={() => applyPosterUrl(clip)}>
                                Apply link
                              </button>
                              <button
                                class="studio-icon is-quiet"
                                type="button"
                                disabled={posterUploading === clip.id}
                                onClick={() => {
                                  setClip(clip.id, { posterUrl: undefined });
                                  setPosterDraft('');
                                  setPosterPreviews((current) => ({ ...current, [clip.id]: '' }));
                                  setMessage('Bundled poster selected. Press Save to publish.');
                                }}
                              >
                                Use stored poster
                              </button>
                              <button
                                class="studio-icon is-quiet"
                                type="button"
                                disabled={posterUploading === clip.id}
                                onClick={() => {
                                  const id = youtubeId(clip.youtubeUrl);
                                  if (!id) return;
                                  const url = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
                                  setClip(clip.id, { posterUrl: url });
                                  setPosterDraft(url);
                                  setPosterPreviews((current) => ({ ...current, [clip.id]: '' }));
                                  setMessage('YouTube thumbnail selected. Press Save to publish.');
                                }}
                              >
                                Use YouTube thumbnail
                              </button>
                            </div>
                            {posterUploading === clip.id && <p class="studio-note">Uploading and optimizing…</p>}
                            <p class="studio-note">After changing a thumbnail, press the Studio Save button. Live uploads require GitHub sign-in or a repository token.</p>
                          </div>
                        </div>
                      )}

                      {data.tags.length > 0 && (
                        <div class="studio-tag-picks" role="group" aria-label={`Tags for ${clip.title}`}>
                          {data.tags.map((tag) => {
                            const on = clipTagLabels(clip).some((item) => slugify(item) === slugify(tag));
                            return (
                              <button class="filter-chip" type="button" aria-pressed={on} onClick={() => toggleClipTag(clip, tag)}>
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {groups.length === 0 && <p class="studio-note">No videos match.</p>}
          </div>
        </div>
      )}

      {tab === 'featured' && (
        <div class="studio-panel">
          <p class="studio-note">This order is the home reel. The hero is the large clip in the middle.</p>
          <ol class="studio-list">
            {data.order.map((id, index) => {
              const clip = data.clips.find((item) => item.id === id);
              if (!clip) return null;
              const hero = data.heroId === id;
              return (
                <li class={hero ? 'studio-row studio-reel is-hero' : 'studio-row studio-reel'} key={id}>
                  <span class="studio-index">{index + 1}</span>
                  <img
                    class={clip.orientation === 'landscape' ? 'studio-poster is-wide' : 'studio-poster'}
                    src={posterOf(clip)}
                    alt=""
                  />
                  <div class="studio-copy">
                    <strong>{clip.title}</strong>
                    <span>{hero ? 'Hero · ' : ''}{clip.creator}</span>
                  </div>
                  <div class="studio-actions">
                    <button class="studio-icon" type="button" aria-label={`Move ${clip.title} up`} onClick={() => move(id, -1)} disabled={index === 0}>
                      Up
                    </button>
                    <button class="studio-icon" type="button" aria-label={`Move ${clip.title} down`} onClick={() => move(id, 1)} disabled={index === data.order.length - 1}>
                      Down
                    </button>
                    <button class={hero ? 'studio-icon is-on' : 'studio-icon'} type="button" onClick={() => patch({ heroId: id })} disabled={hero}>
                      {hero ? 'Hero' : 'Make hero'}
                    </button>
                    <button class="studio-icon is-quiet" type="button" onClick={() => removeFeatured(id)}>
                      Hide
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <label class="field">
            <span>Add to the home reel</span>
            <select
              onInput={(event) => {
                addFeatured(event.currentTarget.value);
                event.currentTarget.value = '';
              }}
            >
              <option value="">Choose a video</option>
              {data.clips
                .filter((clip) => !data.order.includes(clip.id))
                .map((clip) => (
                  <option value={clip.id}>{clip.title}</option>
                ))}
            </select>
          </label>
        </div>
      )}

      {tab === 'creators' && (
        <div class="studio-panel">
          <p class="studio-note">Each name is a filter on Works, including a new client who does not have a video yet.</p>
          <form
            class="studio-inline"
            onSubmit={(event) => {
              event.preventDefault();
              addCreator();
            }}
          >
            <input value={clientName} placeholder="New client name" onInput={(event) => setClientName(event.currentTarget.value)} />
            <button class="cta" type="submit">Add client</button>
          </form>
          <ul class="studio-list">
            {data.creators.map((creator) => (
              <li class="studio-row studio-line" key={creator.id}>
                <input
                  aria-label={`${creator.label} name`}
                  value={creator.label}
                  onInput={(event) => renameCreator(creator, event.currentTarget.value)}
                />
                <span class="studio-meta">{uses(creator.id)} on Works</span>
                <button
                  class="studio-icon is-quiet"
                  type="button"
                  onClick={() => {
                    if (data.creators.length <= 1) {
                      setError('Keep at least one client.');
                      return;
                    }
                    patch({ creators: data.creators.filter((item) => item.id !== creator.id) });
                    if (client === creator.id) setClient('');
                    setError('');
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'sections' && (
        <div class="studio-panel">
          <p class="studio-note">
            Shorts and Long Form Videos are already here. Categorize long videos as Vlogs, MVs, or Normal Videos from the Videos tab.
          </p>
          <form
            class="studio-inline"
            onSubmit={(event) => {
              event.preventDefault();
              addSection();
            }}
          >
            <input value={sectionName} placeholder="Section name" onInput={(event) => setSectionName(event.currentTarget.value)} />
            <select value={sectionKind} onInput={(event) => setSectionKind(event.currentTarget.value as SectionKind)}>
              <option value="custom">Custom videos</option>
              <option value="vertical">Short videos</option>
              <option value="landscape">Long videos</option>
              <option value="thumbnail">Thumbnails</option>
            </select>
            <button class="cta" type="submit">Add section</button>
          </form>
          <ul class="studio-list">
            {data.sections.map((section, index) => (
              <li class="studio-row studio-line" key={section.id}>
                <input
                  aria-label={`${section.label} name`}
                  value={section.label}
                  onInput={(event) =>
                    patch({
                      sections: data.sections.map((item) =>
                        item.id === section.id ? { ...item, label: event.currentTarget.value } : item,
                      ),
                    })
                  }
                />
                <span class={`studio-pill is-${section.kind}`}>{kindName[section.kind]}</span>
                <div class="studio-actions">
                  <button class="studio-icon" type="button" aria-label={`Move ${section.label} up`} onClick={() => moveSection(index, -1)} disabled={index === 0}>
                    Up
                  </button>
                  <button class="studio-icon" type="button" aria-label={`Move ${section.label} down`} onClick={() => moveSection(index, 1)} disabled={index === data.sections.length - 1}>
                    Down
                  </button>
                  <button class="studio-icon is-quiet" type="button" onClick={() => removeSection(section)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'thumbnails' && (
        <div class="studio-videos">
          <form
            class="studio-card studio-composer"
            onSubmit={(event) => {
              event.preventDefault();
              addThumb();
            }}
          >
            <h2>Add a gallery thumbnail</h2>
            <p class="studio-note">
              These are separate entries in Works → Thumbnails. Removing one does not remove its video.
              The imported examples include some thumbnails you may not have designed; remove those you do not want to show.
            </p>
            <label class="field">
              <span>Use a thumbnail from an existing video (optional)</span>
              <select
                value={thumb.image.startsWith('clip:') ? thumb.image.slice(5) : ''}
                onInput={(event) => {
                  const source = data.clips.find((clip) => clip.id === event.currentTarget.value);
                  if (!source) return;
                  setThumb({
                    ...thumb, title: source.title, creator: source.creator,
                    handle: source.channelHandle, image: `clip:${source.id}`,
                    videoUrl: source.youtubeUrl, orientation: source.orientation,
                  });
                }}
              >
                <option value="">Choose video…</option>
                {data.clips.map((clip) => <option value={clip.id}>{clip.title} — {clip.creator}</option>)}
              </select>
            </label>
            <div class="studio-split">
              <label class="field">
                <span>Client</span>
                <input list="client-names" value={thumb.creator} onInput={(event) => setThumb({ ...thumb, creator: event.currentTarget.value })} required />
              </label>
              <label class="field">
                <span>Handle</span>
                <input value={thumb.handle} placeholder="@name" onInput={(event) => setThumb({ ...thumb, handle: event.currentTarget.value })} />
              </label>
            </div>
            <label class="field">
              <span>Video name</span>
              <input value={thumb.title} onInput={(event) => setThumb({ ...thumb, title: event.currentTarget.value })} required />
            </label>
            <label class="field">
              <span>Thumbnail image URL or linked video poster</span>
              <input
                type="text"
                value={thumb.image}
                placeholder="https://… or clip:video-id"
                onInput={(event) => setThumb({ ...thumb, image: event.currentTarget.value })}
                required
              />
            </label>
            <div class="studio-split">
              <label class="field">
                <span>Layout</span>
                <select value={thumb.orientation} onInput={(event) => setThumb({ ...thumb, orientation: event.currentTarget.value as 'landscape' | 'vertical' })}>
                  <option value="landscape">Landscape (16:9)</option>
                  <option value="vertical">Portrait (9:16)</option>
                </select>
              </label>
              <label class="field">
                <span>Video link</span>
                <input type="url" value={thumb.videoUrl} onInput={(event) => setThumb({ ...thumb, videoUrl: event.currentTarget.value })} required />
              </label>
            </div>
            <button class="cta" type="submit">Add gallery thumbnail</button>
            <p class="studio-note">To upload an image file, first add and Save the entry, then use Edit → Upload image below.</p>
          </form>
          <div class="studio-catalog">
            <p class="studio-note">Reorder entries with Up/Down, edit details or image, or remove those that aren't your thumbnail designs. Press Save to publish the changes.</p>
            {data.thumbnails.length === 0 && <p class="studio-note">No gallery thumbnails yet. This section stays hidden on Works until you add one.</p>}
            <ul class="studio-list">
              {data.thumbnails.map((item, index) => (
                <li class="studio-row studio-thumb-row" key={item.id}>
                  <img
                    class={item.orientation === 'vertical' ? 'studio-poster' : 'studio-poster is-wide'}
                    src={thumbPreviews[item.id] || imageOfThumbnail(item)}
                    alt=""
                  />
                  <div class="studio-copy">
                    <strong>{item.title}</strong>
                    <span>{item.creator}</span>
                  </div>
                  <div class="studio-actions studio-thumb-actions">
                    <button
                      class="studio-icon"
                      type="button"
                      onClick={() => { setEditingThumb(editingThumb === item.id ? '' : item.id); setError(''); }}
                      aria-expanded={editingThumb === item.id}
                      aria-controls={`thumb-edit-${item.id}`}
                    >
                      {editingThumb === item.id ? 'Close' : 'Edit'}
                    </button>
                    <button class="studio-icon" type="button" onClick={() => moveThumbnail(index, -1)} disabled={index === 0} aria-label={`Move ${item.title} up`}>Up</button>
                    <button class="studio-icon" type="button" onClick={() => moveThumbnail(index, 1)} disabled={index === data.thumbnails.length - 1} aria-label={`Move ${item.title} down`}>Down</button>
                    <button
                      class="studio-icon is-quiet"
                      type="button"
                      onClick={() => {
                        patch({ thumbnails: data.thumbnails.filter((row) => row.id !== item.id) });
                        if (editingThumb === item.id) setEditingThumb('');
                        setMessage('Gallery entry removed. The video and original poster are unchanged. Press Save to publish.');
                      }}
                    >Remove</button>
                  </div>
                  {editingThumb === item.id && (
                    <div class="studio-thumb-edit" id={`thumb-edit-${item.id}`}>
                      <label class="field">
                        <span>Copy poster from an existing video</span>
                        <select
                          value={item.image.startsWith('clip:') ? item.image.slice(5) : ''}
                          onInput={(event) => {
                            const clip = data.clips.find((source) => source.id === event.currentTarget.value);
                            if (!clip) return;
                            setThumbnail(item.id, fromVideo(clip));
                            setThumbPreviews((current) => ({ ...current, [item.id]: '' }));
                          }}
                        >
                          <option value="">Choose video…</option>
                          {data.clips.map((clip) => <option value={clip.id}>{clip.title} — {clip.creator}</option>)}
                        </select>
                      </label>
                      <label class="field">
                        <span>Title</span>
                        <input value={item.title} onInput={(event) => setThumbnail(item.id, { title: event.currentTarget.value })} />
                      </label>
                      <div class="studio-split">
                        <label class="field">
                          <span>Client</span>
                          <input value={item.creator} onInput={(event) => setThumbnail(item.id, { creator: event.currentTarget.value })} />
                        </label>
                        <label class="field">
                          <span>Channel handle</span>
                          <input value={item.channelHandle} onInput={(event) => setThumbnail(item.id, { channelHandle: event.currentTarget.value })} />
                        </label>
                      </div>
                      <label class="field">
                        <span>Image link (HTTPS, an uploaded thumbnail, or clip:video-id)</span>
                        <input
                          value={item.image}
                          onInput={(event) => {
                            setThumbnail(item.id, { image: event.currentTarget.value });
                            setThumbPreviews((current) => ({ ...current, [item.id]: '' }));
                          }}
                        />
                      </label>
                      <label class="field">
                        <span>Upload a custom JPG, PNG or WebP (max 4 MB)</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={thumbUploading === item.id}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) void uploadThumbnail(item, file);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                      <div class="studio-split">
                        <label class="field">
                          <span>Layout</span>
                          <select value={item.orientation === 'vertical' ? 'vertical' : 'landscape'} onInput={(event) => setThumbnail(item.id, { orientation: event.currentTarget.value as 'landscape' | 'vertical' })}>
                            <option value="landscape">Landscape (16:9)</option>
                            <option value="vertical">Portrait (9:16)</option>
                          </select>
                        </label>
                        <label class="field">
                          <span>Video link</span>
                          <input value={item.videoUrl} onInput={(event) => setThumbnail(item.id, { videoUrl: event.currentTarget.value })} />
                        </label>
                      </div>
                      {thumbUploading === item.id && <p class="studio-note">Uploading and optimizing your thumbnail…</p>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'tags' && (
        <div class="studio-panel">
          <p class="studio-note">
            These chips sit on Works after the client names. They were labels already stored on the videos. Rename, reorder, or remove one here. Removing a tag takes it off every video. A new tag stays visible even before a video uses it.
          </p>
          <form
            class="studio-inline"
            onSubmit={(event) => {
              event.preventDefault();
              const label = tagName.trim();
              if (!label) return;
              if (data.tags.some((tag) => slugify(tag) === slugify(label))) {
                setError('That tag already exists.');
                return;
              }
              patch({ tags: [...data.tags, label] });
              setTagName('');
              setError('');
              setMessage('Tag added. Put it on the videos, then Save. Works shows it as a category with those videos.');
            }}
          >
            <input value={tagName} placeholder="New tag" onInput={(event) => setTagName(event.currentTarget.value)} />
            <button class="cta" type="submit">Add tag</button>
          </form>
          <ul class="studio-list">
            {data.tags.map((tag, index) => (
              <li class="studio-row studio-line" key={`tag-${index}`}>
                <input aria-label={`${tag} name`} value={tag} onInput={(event) => renameTag(tag, event.currentTarget.value)} />
                <span class="studio-meta">{tagUses(tag)} videos</span>
                <div class="studio-actions">
                  <button class="studio-icon" type="button" aria-label={`Move ${tag} up`} onClick={() => moveTag(index, -1)} disabled={index === 0}>
                    Up
                  </button>
                  <button class="studio-icon" type="button" aria-label={`Move ${tag} down`} onClick={() => moveTag(index, 1)} disabled={index === data.tags.length - 1}>
                    Down
                  </button>
                  <button class="studio-icon is-quiet" type="button" onClick={() => removeTag(tag)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {data.tags.length === 0 && <p class="studio-note">No tags. Works will only show the client filters.</p>}
        </div>
      )}

      {tab === 'terms' && (
        <div class="studio-panel">
          <p class="studio-note">
            This text is the public Terms page. Save publishes it. A blank paragraph is dropped, and a section with no text is removed. Keep at least one section.
          </p>
          <ul class="studio-list">
            {data.terms.map((section, index) => (
              <li class="studio-card studio-term" key={section.id}>
                <label class="field">
                  <span>Section title</span>
                  <input
                    aria-label={`Title for ${section.title || 'section'}`}
                    value={section.title}
                    onInput={(event) => setTerm(section.id, { title: event.currentTarget.value })}
                  />
                </label>
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <label class="field" key={`${section.id}-${paragraphIndex}`}>
                    <span>Paragraph {paragraphIndex + 1}</span>
                    <textarea
                      class="studio-term-text"
                      value={paragraph}
                      onInput={(event) => {
                        const paragraphs = section.paragraphs.map((text, textIndex) =>
                          textIndex === paragraphIndex ? event.currentTarget.value : text,
                        );
                        setTerm(section.id, { paragraphs });
                      }}
                    />
                  </label>
                ))}
                <div class="studio-actions">
                  <button
                    class="studio-icon"
                    type="button"
                    onClick={() => setTerm(section.id, { paragraphs: [...section.paragraphs, ''] })}
                  >
                    Add paragraph
                  </button>
                  <button
                    class="studio-icon"
                    type="button"
                    disabled={section.paragraphs.length <= 1}
                    onClick={() =>
                      setTerm(section.id, { paragraphs: section.paragraphs.slice(0, -1) })
                    }
                  >
                    Remove paragraph
                  </button>
                  <button class="studio-icon" type="button" aria-label={`Move ${section.title} up`} onClick={() => moveTerm(index, -1)} disabled={index === 0}>
                    Up
                  </button>
                  <button
                    class="studio-icon"
                    type="button"
                    aria-label={`Move ${section.title} down`}
                    onClick={() => moveTerm(index, 1)}
                    disabled={index === data.terms.length - 1}
                  >
                    Down
                  </button>
                  <button
                    class="studio-icon is-quiet"
                    type="button"
                    onClick={() => {
                      if (data.terms.length <= 1) {
                        setError('Keep at least one terms section.');
                        return;
                      }
                      patch({ terms: data.terms.filter((item) => item.id !== section.id) });
                      setError('');
                    }}
                  >
                    Remove section
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button class="cta" type="button" onClick={addTerm}>Add section</button>
          <a class="studio-preview" href="/terms">View Terms</a>
        </div>
      )}

      <datalist id="client-names">
        {data.creators.map((creator) => (
          <option value={creator.label} />
        ))}
      </datalist>
    </section>
  );
}
