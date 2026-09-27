import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const tier = z.object({
  name: z.string(),
  price: z.string(),
  /** Shown as "from {price} / {unit}" when there is no approx line. */
  unit: z.string().optional(),
  /** Smaller muted line under the USD price, already prefixed with ≈. */
  approx: z.string().optional(),
  note: z.string().optional(),
  popular: z.boolean().default(false),
  points: z.array(z.string()),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    track: z.enum(['lavender', 'sakura']),
    icon: z.enum(['scissors', 'code-xml']),
    cta: z.string(),
    contactService: z.enum(['editing', 'web-design']),
    fromPrice: z.string(),
    /** Optional peso line under the hub's "from" price. Prefixed with ≈. */
    fromApprox: z.string().optional(),
    includes: z.array(z.string()),
    take: z.array(z.string()),
    dont: z.array(z.string()),
    tiers: z.array(tier),
    compare: z.array(
      z.object({
        feature: z.string(),
        values: z.array(z.string()),
      }),
    ),
    addons: z.array(
      z.object({
        name: z.string(),
        price: z.string(),
      }),
    ),
    process: z.array(z.string()).optional(),
    proof: z.string().optional(),
    pickNote: z.string(),
  }).superRefine((data, ctx) => {
    data.compare.forEach((row, index) => {
      if (row.values.length !== data.tiers.length) {
        ctx.addIssue({
          code: 'custom',
          message: `Compare row "${row.feature}" needs one value per tier (${data.tiers.length}).`,
          path: ['compare', index, 'values'],
        });
      }
    });
  }),
});

export const collections = { services };
