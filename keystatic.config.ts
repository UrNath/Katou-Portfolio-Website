import { config, fields, singleton } from '@keystatic/core';

const repo = 'UrNath/Katou-Portfolio-Website';

// PUBLIC_ so the browser bundle can tell GitHub mode from local mode.
// The client id, client secret, and KEYSTATIC_SECRET stay on the server.
const githubReady = Boolean(import.meta.env?.PUBLIC_KEYSTATIC_GITHUB_APP_SLUG);

const statusField = (label: string) =>
  fields.select({
    label,
    options: [
      { label: 'Open', value: 'open' },
      { label: 'Waitlist', value: 'waitlist' },
      { label: 'Closed', value: 'closed' },
    ],
    defaultValue: 'open',
  });

const lines = (label: string, description?: string) =>
  fields.array(fields.text({ label: 'Line' }), {
    label,
    description,
    itemLabel: (props) => props.value || 'Line',
  });

const tier = fields.object({
  name: fields.text({ label: 'Name' }),
  price: fields.text({ label: 'Price' }),
  unit: fields.text({ label: 'Unit', description: 'Example: short. Leave blank if this tier has no unit.' }),
  approx: fields.text({
    label: 'Approximate pesos',
    description: 'Include the ≈ sign, like ≈ ₱3,800. Leave blank if unused.',
  }),
  note: fields.text({ label: 'Note', description: 'Leave blank if unused.' }),
  popular: fields.checkbox({ label: 'Mark as Popular', defaultValue: false }),
  points: lines('Bullets'),
});

const compareRow = fields.object({
  feature: fields.text({ label: 'Row label' }),
  values: lines('Values', 'One value per tier, in the same order as the tiers.'),
});

const addon = fields.object({
  name: fields.text({ label: 'Name' }),
  price: fields.text({ label: 'Price' }),
});

const serviceSchema = {
  title: fields.text({ label: 'Title' }),
  subtitle: fields.text({ label: 'Subtitle' }),
  track: fields.select({
    label: 'Color track',
    options: [
      { label: 'Lavender', value: 'lavender' },
      { label: 'Sakura', value: 'sakura' },
    ],
    defaultValue: 'lavender',
  }),
  icon: fields.select({
    label: 'Icon',
    options: [
      { label: 'Scissors', value: 'scissors' },
      { label: 'Code', value: 'code-xml' },
    ],
    defaultValue: 'scissors',
  }),
  cta: fields.text({ label: 'Button label when the service is open' }),
  contactService: fields.select({
    label: 'Contact form value',
    options: [
      { label: 'Editing', value: 'editing' },
      { label: 'Web design', value: 'web-design' },
    ],
    defaultValue: 'editing',
  }),
  fromPrice: fields.text({ label: '“From” price', description: 'Shown on the home page. Example: PHP 1,000 or $60.' }),
  fromApprox: fields.text({ label: '“From” peso line', description: 'Example: ≈ ₱3,800. Leave blank if unused.' }),
  includes: lines('Includes'),
  take: lines('I take', 'Draft list. Review it before treating it as policy.'),
  dont: lines("I don't take", 'Draft list. Review it before treating it as policy.'),
  tiers: fields.array(tier, { label: 'Tiers', itemLabel: (props) => props.fields.name.value || 'Tier' }),
  compare: fields.array(compareRow, {
    label: 'Compare rows',
    itemLabel: (props) => props.fields.feature.value || 'Row',
  }),
  addons: fields.array(addon, { label: 'Add-ons', itemLabel: (props) => props.fields.name.value || 'Add-on' }),
  process: lines('Process'),
  proof: fields.text({ label: 'Line under the process' }),
  pickNote: fields.text({ label: 'Note under the lists', multiline: true }),
  body: fields.markdoc({
    label: 'Note at the bottom of the page',
    // Existing service files are Markdown (.md), not Markdoc (.mdoc).
    extension: 'md',
  }),
};

export default config({
  storage: githubReady ? { kind: 'github', repo } : { kind: 'local' },
  ui: {
    brand: { name: 'NassuKatou' },
    navigation: {
      Content: ['clips', 'hubOrder', 'editing', 'webDesign', 'terms', 'status', 'site', 'contact'],
    },
  },
  singletons: {
    clips: singleton({
      label: 'Clips',
      path: 'src/data/clips',
      format: { data: 'json' },
      schema: {
        clips: fields.array(
          fields.object({
            id: fields.text({
              label: 'Clip id',
              description: 'Short unique name, like chi-c3. Do not reuse miu-ms25, miu-mv1, miu-mv40, or pidge-p6.',
            }),
            creator: fields.text({ label: 'Creator', description: 'Pidge, Chi, Miu, or a new name.' }),
            channelHandle: fields.text({ label: 'Channel handle', description: 'Include the @.' }),
            title: fields.text({ label: 'Title', multiline: true }),
            youtubeUrl: fields.url({
              label: 'YouTube URL',
              description: 'Original post. This plays, with sound, when someone taps the clip.',
            }),
            tiktokUrl: fields.url({ label: 'TikTok URL', description: 'Optional. Used when there is no YouTube URL.' }),
            tiktokMatchConfidence: fields.text({ label: 'TikTok match note', description: 'Leave as-is. Not shown on the site.' }),
            uploadDate: fields.text({ label: 'Upload date', description: 'YYYY-MM-DD.' }),
            durationSec: fields.integer({ label: 'Length in seconds' }),
            viewCount: fields.integer({ label: 'View count', description: 'Kept for your notes. Not shown on the site.' }),
            orientation: fields.select({
              label: 'Orientation',
              options: [
                { label: 'Short (9:16)', value: 'vertical' },
                { label: 'Landscape (16:9)', value: 'landscape' },
              ],
              defaultValue: 'vertical',
            }),
            aspectRatio: fields.text({ label: 'Aspect ratio', description: '9:16 or 16:9.' }),
            type: fields.select({
              label: 'Type',
              options: [
                { label: 'Short', value: 'short' },
                { label: 'Video', value: 'video' },
              ],
              defaultValue: 'short',
            }),
            poster: fields.image({
              label: 'Thumbnail',
              description: 'A still image. Name it {clip id}.webp. Full videos stay on YouTube or TikTok.',
              directory: 'src/assets/posters',
              publicPath: 'posters/',
            }),
            preview: fields.file({
              label: 'Silent preview (optional)',
              description: 'A few seconds, video only, named {clip id}.mp4. Played muted on hover.',
              directory: 'public/media/previews',
              publicPath: 'previews/',
            }),
            tags: lines('Tags'),
            tagsSuggested: fields.checkbox({ label: 'Tags are suggestions', defaultValue: true }),
            featured: fields.checkbox({
              label: 'Show on the home page',
              description: 'Also add the clip id to Home order.',
              defaultValue: false,
            }),
            heroFeatured: fields.checkbox({
              label: 'Hero clip',
              description: 'The large clip in the middle of the home page. Only one should be checked.',
              defaultValue: false,
            }),
            credit: fields.text({ label: 'Credit note', description: 'Not the line on the card. The card uses the channel handle.' }),
          }),
          {
            label: 'Clips',
            description:
              'Drag to reorder Works (newest first is the top). Do not add miu-ms25, miu-mv1, miu-mv40, or pidge-p6 — those are not Katou edits.',
            itemLabel: (props) => props.fields.title.value || props.fields.id.value || 'Clip',
          },
        ),
      },
    }),
    hubOrder: singleton({
      label: 'Home order',
      path: 'src/data/hub-order',
      format: { data: 'json' },
      schema: {
        order: fields.array(fields.text({ label: 'Clip id' }), {
          label: 'Home page order',
          description: 'Top to bottom is the reel order. The hero is whichever of these has Hero clip checked. pidge-p6 stays off this list.',
          itemLabel: (props) => props.value || 'Clip id',
        }),
      },
    }),
    editing: singleton({
      label: 'Editing',
      path: 'src/content/services/editing',
      format: { contentField: 'body' },
      schema: serviceSchema,
    }),
    webDesign: singleton({
      label: 'Web design',
      path: 'src/content/services/web-design',
      format: { contentField: 'body' },
      schema: {
        ...serviceSchema,
        track: fields.select({
          label: 'Color track',
          options: [
            { label: 'Lavender', value: 'lavender' },
            { label: 'Sakura', value: 'sakura' },
          ],
          defaultValue: 'sakura',
        }),
        icon: fields.select({
          label: 'Icon',
          options: [
            { label: 'Scissors', value: 'scissors' },
            { label: 'Code', value: 'code-xml' },
          ],
          defaultValue: 'code-xml',
        }),
        contactService: fields.select({
          label: 'Contact form value',
          options: [
            { label: 'Editing', value: 'editing' },
            { label: 'Web design', value: 'web-design' },
          ],
          defaultValue: 'web-design',
        }),
      },
    }),
    terms: singleton({
      label: 'Terms',
      path: 'src/data/terms',
      format: { data: 'json' },
      schema: {
        sections: fields.array(
          fields.object({
            id: fields.text({ label: 'Section id', description: 'Leave existing ids as they are. refunds is the payment section.' }),
            title: fields.text({ label: 'Title' }),
            paragraphs: lines('Paragraphs'),
          }),
          { label: 'Sections', itemLabel: (props) => props.fields.title.value || 'Section' },
        ),
      },
    }),
    status: singleton({
      label: 'Commission status',
      path: 'src/data/status',
      format: { data: 'json' },
      schema: {
        editing: statusField('Editing status'),
        webDesign: statusField('Web design status'),
        updated: fields.text({ label: 'Prices updated line', description: 'Example: Sep 2026. Shown as “Prices updated …”. ' }),
        termsUpdated: fields.text({ label: 'Terms updated line', description: 'Example: Sep 2026.' }),
      },
    }),
    site: singleton({
      label: 'Site settings',
      path: 'src/data/site-settings',
      format: { data: 'json' },
      schema: {
        email: fields.text({ label: 'Contact email' }),
        role: fields.text({ label: 'Home tagline', multiline: true }),
        description: fields.text({ label: 'Short description', multiline: true }),
        previewBase: fields.text({
          label: 'Preview CDN origin',
          description: 'Leave blank to serve silent previews from this site. No trailing slash.',
        }),
        socials: fields.array(
          fields.object({
            id: fields.text({ label: 'Id', description: 'discord, youtube, tiktok, or x.' }),
            label: fields.text({ label: 'Label' }),
            href: fields.text({ label: 'URL' }),
          }),
          { label: 'Social links', itemLabel: (props) => props.fields.label.value || 'Link' },
        ),
      },
    }),
    contact: singleton({
      label: 'Contact notes',
      path: 'src/data/contact',
      format: { data: 'json' },
      schema: {
        guidelines: lines('Contact page notes'),
      },
    }),
  },
});
