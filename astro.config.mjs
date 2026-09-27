// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// Static output is the Vercel default for this site. No adapter: the contact
// form opens an email draft instead of posting to a serverless function.
export default defineConfig({
  output: 'static',
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
});
