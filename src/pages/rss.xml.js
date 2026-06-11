import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const dispatches = (await getCollection("dispatches", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
  return rss({
    title: "Dunfey Hotel — dispatches",
    description: "Analyses written on top of the WWDC dataset.",
    site: context.site,
    items: dispatches.map((d) => ({
      title: d.data.title,
      description: d.data.description,
      pubDate: d.data.date,
      link: `/dispatches/${d.id}/`,
    })),
  });
}
