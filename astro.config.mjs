// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';

// Public pages stay prerendered. The Vercel adapter exists for Keystatic's
// sign-in routes. The contact form still opens an email draft.
export default defineConfig({
  site: 'https://nassukatou-site.vercel.app',
  output: 'static',
  adapter: vercel(),
  integrations: [
    react({ include: ['**/node_modules/@keystatic/**'] }),
    preact({ include: ['**/src/islands/**'] }),
    keystatic(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
