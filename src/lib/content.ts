import { getCollection, type CollectionEntry } from 'astro:content';

export interface NavArticle {
  slug: string;
  title: string;
  href: string;
}

export interface NavChapter {
  key: string;
  title: string;
  indexSlug: string;
  href: string;
  articles: NavArticle[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export async function buildNavTree(): Promise<NavChapter[]> {
  const allEntries = await getCollection('chapters');
  const chapterMap = new Map<string, CollectionEntry<'chapters'>[]>();

  for (const entry of allEntries) {
    const chapterKey = entry.slug.split('/')[0];
    if (!chapterMap.has(chapterKey)) chapterMap.set(chapterKey, []);
    chapterMap.get(chapterKey)!.push(entry);
  }

  const sortedKeys = [...chapterMap.keys()].sort();

  return sortedKeys.map(key => {
    const entries = [...chapterMap.get(key)!].sort((a, b) =>
      (a.slug.split('/')[1] ?? '').localeCompare(b.slug.split('/')[1] ?? '')
    );

    const indexEntry = entries.find(e =>
      (e.slug.split('/')[1] ?? '').startsWith('00-')
    );
    const childEntries = entries.filter(e =>
      !(e.slug.split('/')[1] ?? '').startsWith('00-')
    );

    return {
      key,
      title: indexEntry?.data.title ?? key,
      indexSlug: indexEntry?.slug ?? `${key}/00-index`,
      href: `/chapters/${indexEntry?.slug ?? key}`,
      articles: childEntries.map(e => ({
        slug: e.slug,
        title: e.data.title,
        href: `/chapters/${e.slug}`,
      })),
    };
  });
}

export async function getFlatArticleList(): Promise<NavArticle[]> {
  const navTree = await buildNavTree();
  const flat: NavArticle[] = [];
  for (const chapter of navTree) {
    flat.push({ slug: chapter.indexSlug, title: chapter.title, href: chapter.href });
    flat.push(...chapter.articles);
  }
  return flat;
}
