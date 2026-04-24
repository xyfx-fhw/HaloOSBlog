// src/lib/progress.ts

export interface ArticleProgress {
  status: 'completed' | 'in-progress' | 'not-started';
  sections: Record<string, boolean>;
}

interface ProgressStore {
  articles: Record<string, ArticleProgress>;
  exercises: Record<string, { completed: boolean; attempts: number }>;
  quizzes: Record<string, { score: number; completedAt: string }>;
  certificate: { name: string; earnedAt: string } | null;
}

const STORAGE_KEY = 'rust-tutorial-progress';

function load(): ProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    return JSON.parse(raw) as ProgressStore;
  } catch {
    return empty();
  }
}

function empty(): ProgressStore {
  return { articles: {}, exercises: {}, quizzes: {}, certificate: null };
}

function save(store: ProgressStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function deriveStatus(
  sections: Record<string, boolean>
): ArticleProgress['status'] {
  const vals = Object.values(sections);
  if (vals.length === 0) return 'not-started';
  if (vals.every(Boolean)) return 'completed';
  if (vals.some(Boolean)) return 'in-progress';
  return 'not-started';
}

// ── 文章进度 ─────────────────────────────────────────────

export function getArticleStatus(slug: string): ArticleProgress['status'] {
  return load().articles[slug]?.status ?? 'not-started';
}

export function getSectionStatus(
  articleSlug: string
): Record<string, boolean> {
  return load().articles[articleSlug]?.sections ?? {};
}

export function markSectionRead(
  articleSlug: string,
  sectionTitle: string
): void {
  const store = load();
  const ap: ArticleProgress = store.articles[articleSlug] ?? {
    status: 'not-started',
    sections: {},
  };
  ap.sections[sectionTitle] = true;
  ap.status = deriveStatus(ap.sections);
  store.articles[articleSlug] = ap;
  save(store);
  window.dispatchEvent(new CustomEvent('progress-updated'));
}

export function markArticleComplete(slug: string): void {
  const store = load();
  const ap: ArticleProgress = store.articles[slug] ?? {
    status: 'not-started',
    sections: {},
  };
  ap.status = 'completed';
  store.articles[slug] = ap;
  save(store);
  window.dispatchEvent(new CustomEvent('progress-updated'));
}

export function resetArticle(slug: string): void {
  const store = load();
  delete store.articles[slug];
  save(store);
  window.dispatchEvent(new CustomEvent('progress-updated'));
}

export function resetChapter(chapterKey: string): void {
  const store = load();
  for (const slug of Object.keys(store.articles)) {
    if (slug.split('/')[0] === chapterKey) {
      delete store.articles[slug];
    }
  }
  save(store);
  window.dispatchEvent(new CustomEvent('progress-updated'));
}

export function resetAll(): void {
  const prev = load();
  const fresh = empty();
  fresh.certificate = prev.certificate;
  save(fresh);
  window.dispatchEvent(new CustomEvent('progress-updated'));
}

// ── 练习 & 测验（子计划 5 使用）─────────────────────────

export function markExerciseComplete(id: string, attempts: number): void {
  const store = load();
  store.exercises[id] = { completed: true, attempts };
  save(store);
}

export function saveQuizResult(slug: string, score: number): void {
  const store = load();
  store.quizzes[slug] = { score, completedAt: new Date().toISOString() };
  save(store);
}

export function resetExercise(id: string): void {
  const store = load();
  delete store.exercises[id];
  save(store);
}

export function resetQuiz(slug: string): void {
  const store = load();
  delete store.quizzes[slug];
  save(store);
}

// ── 进度计算 ─────────────────────────────────────────────

/**
 * 返回 0-100 的整体进度百分比。
 * totalArticles 由服务端通过 getFlatArticleList() 计算并经 data-* 属性传入。
 */
export function getOverallProgress(totalArticles: number): number {
  if (totalArticles === 0) return 0;
  const store = load();
  const completed = Object.values(store.articles).filter(
    (a) => a.status === 'completed'
  ).length;
  return Math.round((completed / totalArticles) * 100);
}

/**
 * 返回某章节的进度百分比。
 * articleSlugs：该章节所有文章（含 index）的 slug 列表。
 */
export function getChapterProgress(articleSlugs: string[]): number {
  if (articleSlugs.length === 0) return 0;
  const store = load();
  const completed = articleSlugs.filter(
    (s) => store.articles[s]?.status === 'completed'
  ).length;
  return Math.round((completed / articleSlugs.length) * 100);
}

// ── 证书 ─────────────────────────────────────────────────

export function saveCertificateName(name: string): void {
  const store = load();
  store.certificate = { name, earnedAt: new Date().toISOString() };
  save(store);
}

export function getCertificate(): { name: string; earnedAt: string } | null {
  return load().certificate;
}
