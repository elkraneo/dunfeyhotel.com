import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

// Dispatches: editorial analyses written in MDX, augmented with live data
// components (SessionList, ResourceList, StatStrip). One file per piece.
const dispatches = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/dispatches" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { dispatches };
