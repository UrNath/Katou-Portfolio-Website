/**
 * Meet the Clients profiles. Only confirmed facts go here: a `null` field is
 * rendered on the page as a clearly marked placeholder, never filled in.
 * Keys are the creator ids from works-layout.json.
 */
export interface ClientArt {
  src: string;
  width: number;
  height: number;
  /** Stage placement on landscape screens, as percentages of the stage. */
  height_pct: number;
  bottom_pct: number;
  right_pct: number;
  /** Rectangular artwork with no transparent cutout: shown whole in a 4:3 frame. */
  framed?: boolean;
  /** Which part of framed art stays in view when it is cropped, as CSS object-position. */
  focus?: string;
}

export interface ClientSkin {
  id: string;
  label: string;
  note: string;
  art: ClientArt | null;
  /** Optional painted background that replaces the generated backdrop. */
  background?: string;
}

export interface ClientProfile {
  description: string | null;
  /** Character type, e.g. cat girl. */
  type: string | null;
  /** Specialty class, e.g. Mage. */
  role: string | null;
  element: string | null;
  weapon: string | null;
  socials: { youtube: string | null; discord: string | null; tiktok: string | null };
  /** Backdrop, accent and rim-light colours for this client's stage. */
  palette: { panel: string; deep: string; accent: string; rim: string };
  skins: ClientSkin[];
  /**
   * Optional: up to three clip ids from clips.json to use as the highlight
   * diamonds, in order. Leave out to use this client's featured clips.
   */
  reels?: string[];
}

const neutral = { panel: '#27323a', deep: '#141b20', accent: '#a3f0db', rim: '#e9fffa' };

export const clientProfiles: Record<string, ClientProfile> = {
  pidge: {
    description: null,
    type: 'Cat',
    role: null,
    element: null,
    weapon: null,
    // YouTube uses the channel handle credited on her clips; TikTok is the
    // profile of the credited TikTok posts in clips.json.
    socials: { youtube: 'https://www.youtube.com/@pidgeira', discord: null, tiktok: 'https://www.tiktok.com/@pidgeira' },
    palette: { panel: '#2b4378', deep: '#131d3a', accent: '#8fc8ff', rim: '#eef7ff' },
    skins: [
      {
        id: 'cat',
        label: 'Cat',
        note: 'Current model',
        art: { src: '/clients/pidge-cat.webp', width: 916, height: 991, height_pct: 90, bottom_pct: -3, right_pct: 3 },
      },
      {
        id: 'rat-thief',
        label: 'Rat Thief',
        note: 'Former persona',
        art: { src: '/clients/pidge-foreground.webp', width: 1128, height: 1536, height_pct: 118, bottom_pct: -14, right_pct: -3 },
        background: '/clients/pidge-background.webp',
      },
    ],
  },
  chi: {
    description: null,
    type: 'Vampire pup',
    role: 'Mage',
    element: 'Blood',
    weapon: 'Blood scythe, made from her blood',
    socials: { youtube: 'https://www.youtube.com/@chiseyi', discord: null, tiktok: 'https://www.tiktok.com/@chiseyivt' },
    palette: { panel: '#5a1622', deep: '#22070d', accent: '#ff6b78', rim: '#ffe9ec' },
    skins: [
      {
        id: 'default',
        label: 'Default',
        note: 'Illustration',
        art: { src: '/clients/chi-illustration.webp', width: 1800, height: 840, height_pct: 60, bottom_pct: 17, right_pct: 5, framed: true, focus: '66% 50%' },
      },
    ],
  },
  miu: {
    description: null,
    type: null,
    role: null,
    element: null,
    weapon: null,
    socials: { youtube: 'https://www.youtube.com/@miuonivt', discord: null, tiktok: 'https://www.tiktok.com/@miuonivt' },
    palette: neutral,
    skins: [{ id: 'default', label: 'Default', note: 'Art placeholder', art: null }],
  },
};

/** A client added in the studio shows up with every field as a placeholder. */
export function hasProfile(id: string): boolean {
  return id in clientProfiles;
}

export function profileFor(id: string): ClientProfile {
  return clientProfiles[id] ?? {
    description: null, type: null, role: null, element: null, weapon: null,
    socials: { youtube: null, discord: null, tiktok: null },
    palette: neutral,
    skins: [{ id: 'default', label: 'Default', note: 'Art placeholder', art: null }],
  };
}
