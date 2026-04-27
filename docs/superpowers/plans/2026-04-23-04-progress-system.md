# 子计划 4：进度系统（localStorage + SectionProgress）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 实现完整的学习进度追踪系统：H2 节段滚动完成检测、文章级状态聚合、Navbar 进度百分比、`/progress` 进度页展示与重置，以及首页大纲进度点同步。

**架构：** `src/lib/progress.ts` 提供所有进度读写接口（纯 localStorage，统一 API 便于将来替换后端）；`SectionProgress.astro` 用 IntersectionObserver 检测 H2 滚动完成，调用 progress.ts；Navbar 监听 `progress-updated` 自定义事件实时更新进度百分比；`/progress` 页全客户端渲染进度状态；`ConfirmDialog.astro` 通过全局 `window.openConfirmDialog` API 提供输入确认弹窗。

**技术栈：** localStorage、IntersectionObserver、Astro client-side `<script>`、TypeScript

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `src/lib/progress.ts` | 进度读写、状态计算、事件分发 |
| 新建 | `src/components/ui/SectionProgress.astro` | H2 tab 栏 + IntersectionObserver |
| 新建 | `src/components/ui/ConfirmDialog.astro` | 全局重置确认弹窗 |
| 修改 | `src/components/layout/BaseLayout.astro` | 传 totalArticles 给 Navbar |
| 修改 | `src/components/layout/Navbar.astro` | 读取进度百分比并显示 |
| 修改 | `src/pages/chapters/[...slug].astro` | 注入 SectionProgress 组件 |
| 修改 | `src/pages/progress.astro` | 完整进度页实现（替换占位页） |
| 修改 | `src/pages/index.astro` | 首页进度点与 localStorage 同步 |

---

### Task 1: 创建 `src/lib/progress.ts`

**文件：**
- 新建：`src/lib/progress.ts`

> ⚠️ 此模块使用 `localStorage` 和 `window.dispatchEvent`，只能在客户端 `<script>` 块中 import，不能在 Astro frontmatter（`---`）中 import。

- [ ] **Step 1: 创建文件**

```typescript
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
```

- [ ] **Step 2: 验证类型**

运行：`npx astro check`

预期：0 errors（若报 `localStorage is not defined`，说明错误地在服务端导入了此模块，请检查 import 位置）

- [ ] **Step 3: 提交**

```bash
git add src/lib/progress.ts
git commit -m "feat(progress): add progress.ts with localStorage read/write API"
```

---

### Task 2: 更新 Navbar 进度百分比显示

**文件：**
- 修改：`src/components/layout/BaseLayout.astro`
- 修改：`src/components/layout/Navbar.astro`

- [ ] **Step 1: 修改 BaseLayout.astro**

将 frontmatter 中的 import 行：
```astro
import { buildNavTree } from '../../lib/content';
```
改为：
```astro
import { buildNavTree, getFlatArticleList } from '../../lib/content';
```

在 `const firstChapterHref = navTree[0]?.href ?? '/chapters';` 之后追加：
```astro
const flatList = await getFlatArticleList(navTree);
const totalArticles = flatList.length;
```

将 `<Navbar firstChapterHref={firstChapterHref} />` 改为：
```astro
<Navbar firstChapterHref={firstChapterHref} totalArticles={totalArticles} />
```

- [ ] **Step 2: 修改 Navbar.astro**

将 `interface Props` 改为：
```astro
interface Props {
  firstChapterHref?: string;
  totalArticles?: number;
}
```

将解构行改为：
```astro
const { firstChapterHref = '/chapters', totalArticles = 0 } = Astro.props;
```

将 `<div class="nav-progress" id="nav-progress">⏱ 0%</div>` 改为：
```astro
<div class="nav-progress" id="nav-progress" data-total={totalArticles}>⏱ 0%</div>
```

在现有 `<script define:vars=...>` 之后新增独立 `<script>` 块（**不要** `is:inline`）：
```astro
<script>
  (function refreshNavProgress() {
    const el = document.getElementById('nav-progress');
    if (!el) return;
    const total = parseInt(el.dataset['total'] ?? '0', 10);
    if (total === 0) return;

    function update() {
      try {
        const raw = localStorage.getItem('rust-tutorial-progress');
        if (!raw) return;
        const store = JSON.parse(raw) as {
          articles?: Record<string, { status: string }>;
        };
        const completed = Object.values(store.articles ?? {}).filter(
          (a) => a.status === 'completed'
        ).length;
        const pct = Math.round((completed / total) * 100);
        el!.textContent = `⏱ ${pct}%`;
      } catch {
        // ignore
      }
    }

    update();
    window.addEventListener('progress-updated', update);
  })();
</script>
```

- [ ] **Step 3: 验证类型**

运行：`npx astro check`

预期：0 errors

- [ ] **Step 4: 提交**

```bash
git add src/components/layout/BaseLayout.astro src/components/layout/Navbar.astro
git commit -m "feat(progress): pass totalArticles to Navbar, show progress % from localStorage"
```

---

### Task 3: 创建 `src/components/ui/SectionProgress.astro`

**文件：**
- 新建：`src/components/ui/SectionProgress.astro`

- [ ] **Step 1: 创建文件**

```astro
---
// SectionProgress.astro
// 章节文档页内 H2 小节进度标签栏。
// 放在 .prose 内、article-meta 之后、<Content /> 之前。
// 有 H2 时渲染 tab 栏并用 IntersectionObserver 检测完成；无 H2 时监听页面底部。

import type { MarkdownHeading } from 'astro';

interface Props {
  headings: MarkdownHeading[];
  articleSlug: string;
}

const { headings, articleSlug } = Astro.props;
const h2s = headings.filter((h) => h.depth === 2);
const hasH2 = h2s.length > 0;
---

<div
  class="section-progress"
  data-article-slug={articleSlug}
  data-has-h2={String(hasH2)}
>
  {hasH2 && (
    <div class="sp-tabs" role="tablist" aria-label="文章章节进度">
      {h2s.map((h) => (
        <button
          class="sp-tab"
          data-h2-id={h.slug}
          data-h2-text={h.text}
          role="tab"
          type="button"
          aria-label={h.text}
        >
          <span class="sp-dot"></span>
          <span class="sp-label">{h.text}</span>
        </button>
      ))}
    </div>
  )}
</div>

<script>
  import {
    markSectionRead,
    markArticleComplete,
    getSectionStatus,
  } from '../../lib/progress';

  const el = document.querySelector<HTMLElement>('.section-progress');
  if (!el) throw new Error('SectionProgress: element not found');

  const articleSlug = el.dataset.articleSlug ?? '';
  const hasH2 = el.dataset.hasH2 === 'true';
  const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>('.sp-tab'));

  function refreshTabs(): void {
    const sections = getSectionStatus(articleSlug);
    tabs.forEach((tab) => {
      const text = tab.dataset.h2Text ?? '';
      tab.dataset.completed = String(sections[text] === true);
    });
  }

  refreshTabs();
  window.addEventListener('progress-updated', refreshTabs);

  // 点击 tab：平滑滚动到对应 H2
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.h2Id ?? '';
      document.getElementById(id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  });

  // 找到 .prose 容器（SectionProgress 在 .prose 内部）
  const prose = el.closest<HTMLElement>('.prose');
  if (!prose) throw new Error('SectionProgress: .prose not found');

  if (hasH2) {
    // 在每个 H2 末尾（下一个 H2 之前，或 prose 末尾）注入 sentinel
    const h2Elements = Array.from(prose.querySelectorAll<HTMLElement>('h2'));

    h2Elements.forEach((h2, i) => {
      const sentinel = document.createElement('div');
      sentinel.className = 'sp-sentinel';
      sentinel.dataset.sectionText = h2.textContent?.trim() ?? '';

      const nextH2 = h2Elements[i + 1];
      if (nextH2) {
        prose.insertBefore(sentinel, nextH2);
      } else {
        prose.appendChild(sentinel);
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const text = (entry.target as HTMLElement).dataset.sectionText ?? '';
            if (text) {
              markSectionRead(articleSlug, text);
              refreshTabs();
            }
          }
        });
      },
      { rootMargin: '0px 0px -15% 0px' }
    );

    prose
      .querySelectorAll<HTMLElement>('.sp-sentinel')
      .forEach((s) => observer.observe(s));
  } else {
    // 无 H2：滚动到页面底部时标记整篇完成
    const endSentinel = document.createElement('div');
    endSentinel.className = 'sp-sentinel';
    prose.appendChild(endSentinel);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          markArticleComplete(articleSlug);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(endSentinel);
  }
</script>

<style>
  .section-progress {
    margin-bottom: 1.5rem;
  }

  .sp-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem 0;
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }

  .sp-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.3rem 0.7rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    font-family: var(--font-sans);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    line-height: 1.4;
  }

  .sp-tab:hover {
    border-color: var(--color-text-muted);
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.04);
  }

  .sp-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-border);
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .sp-tab[data-completed='true'] .sp-dot {
    background: var(--color-success);
  }

  .sp-tab[data-completed='true'] {
    border-color: rgba(34, 197, 94, 0.35);
    color: var(--color-text);
  }

  /* sentinel 不占空间 */
  .sp-sentinel {
    height: 0;
    visibility: hidden;
    pointer-events: none;
  }
</style>
```

- [ ] **Step 2: 验证类型**

运行：`npx astro check`

预期：0 errors

- [ ] **Step 3: 提交**

```bash
git add src/components/ui/SectionProgress.astro
git commit -m "feat(progress): add SectionProgress component with H2 IntersectionObserver"
```

---

### Task 4: 将 SectionProgress 注入章节文档页

**文件：**
- 修改：`src/pages/chapters/[...slug].astro`

- [ ] **Step 1: 在 frontmatter 添加 import**

在现有 import 行之后追加：
```astro
import SectionProgress from '../../components/ui/SectionProgress.astro';
```

- [ ] **Step 2: 在模板中插入 SectionProgress**

当前 `<article class="prose">` 内结构：
```astro
    <h1>{entry.data.title}</h1>
    <div class="article-meta">
      ...
    </div>
    <Content />
```

改为（在 `.article-meta` 和 `<Content />` 之间插入）：
```astro
    <h1>{entry.data.title}</h1>
    <div class="article-meta">
      ...
    </div>
    <SectionProgress headings={headings} articleSlug={entry.slug} />
    <Content />
```

- [ ] **Step 3: 验证类型和构建**

运行：`npx astro check && npx astro build`

预期：0 errors，build 成功

- [ ] **Step 4: 手动浏览器验证**

运行 `npm run dev`，访问有 H2 的章节页（如 `/chapters/01-getting-started/01-installation`）：
- meta 信息下方出现 tab 栏
- 每个 H2 对应一个灰色圆点 pill 按钮
- 点击 pill 按钮平滑滚动到对应 H2
- 向下滚动经过某个 H2 的内容底部后，对应 pill 变绿
- Navbar 右侧进度百分比更新

- [ ] **Step 5: 提交**

```bash
git add src/pages/chapters/\[...slug\].astro
git commit -m "feat(progress): integrate SectionProgress into chapter pages"
```

---

### Task 5: 创建 `src/components/ui/ConfirmDialog.astro`

**文件：**
- 新建：`src/components/ui/ConfirmDialog.astro`

- [ ] **Step 1: 创建文件**

```astro
---
// ConfirmDialog.astro
// 全局确认弹窗，通过 window.openConfirmDialog({ message, confirmText, onConfirm }) 调用。
// 在需要的页面中 import 并渲染此组件一次即可使用。
---

<div
  id="confirm-dialog-overlay"
  class="cd-overlay"
  hidden
  aria-hidden="true"
>
  <div
    class="cd-box"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="cd-message"
    aria-describedby="cd-hint"
  >
    <p id="cd-message" class="cd-message"></p>
    <p id="cd-hint" class="cd-hint">
      请输入 "<strong class="cd-required"></strong>" 来确认：
    </p>
    <input
      type="text"
      class="cd-input"
      autocomplete="off"
      spellcheck="false"
    />
    <div class="cd-actions">
      <button type="button" class="btn-secondary cd-cancel">取消</button>
      <button type="button" class="btn-primary cd-ok" disabled>确认</button>
    </div>
  </div>
</div>

<script>
  const overlay = document.getElementById(
    'confirm-dialog-overlay'
  ) as HTMLElement | null;
  if (!overlay) throw new Error('ConfirmDialog: overlay not found');

  const msgEl = overlay.querySelector<HTMLElement>('#cd-message');
  const requiredEl = overlay.querySelector<HTMLElement>('.cd-required');
  const inputEl = overlay.querySelector<HTMLInputElement>('.cd-input');
  const cancelBtn = overlay.querySelector<HTMLButtonElement>('.cd-cancel');
  const okBtn = overlay.querySelector<HTMLButtonElement>('.cd-ok');

  let currentCallback: (() => void) | null = null;
  let requiredText = '';

  function open(opts: {
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }): void {
    if (!msgEl || !requiredEl || !inputEl || !okBtn) return;
    msgEl.textContent = opts.message;
    requiredEl.textContent = opts.confirmText;
    requiredText = opts.confirmText;
    currentCallback = opts.onConfirm;
    inputEl.value = '';
    okBtn.disabled = true;
    overlay.hidden = false;
    overlay.removeAttribute('aria-hidden');
    inputEl.focus();
  }

  function close(): void {
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    currentCallback = null;
    requiredText = '';
  }

  inputEl?.addEventListener('input', () => {
    if (okBtn) okBtn.disabled = inputEl.value !== requiredText;
  });

  cancelBtn?.addEventListener('click', close);

  okBtn?.addEventListener('click', () => {
    if (inputEl?.value === requiredText && currentCallback) {
      currentCallback();
      close();
    }
  });

  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });

  (
    window as typeof window & {
      openConfirmDialog: typeof open;
    }
  ).openConfirmDialog = open;
</script>

<style>
  .cd-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .cd-box {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.75rem;
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cd-message {
    font-size: 0.9375rem;
    color: var(--color-text);
    line-height: 1.5;
  }

  .cd-hint {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .cd-required {
    color: var(--color-error);
  }

  .cd-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: var(--color-code-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-text);
    font-size: 0.9375rem;
    font-family: var(--font-mono);
    outline: none;
    transition: border-color 0.15s;
  }

  .cd-input:focus {
    border-color: var(--color-accent);
  }

  .cd-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
</style>
```

- [ ] **Step 2: 验证类型**

运行：`npx astro check`

预期：0 errors

- [ ] **Step 3: 提交**

```bash
git add src/components/ui/ConfirmDialog.astro
git commit -m "feat(progress): add ConfirmDialog component with window.openConfirmDialog API"
```

---

### Task 6: 实现 `/progress` 进度页

**文件：**
- 修改（完整替换）：`src/pages/progress.astro`

- [ ] **Step 1: 替换文件内容**

```astro
---
import BaseLayout from '../components/layout/BaseLayout.astro';
import ConfirmDialog from '../components/ui/ConfirmDialog.astro';
import { buildNavTree, getFlatArticleList } from '../lib/content';

const navTree = await buildNavTree();
const flatList = await getFlatArticleList(navTree);
const totalArticles = flatList.length;

const chapterBlocks = navTree.map((chapter) => ({
  key: chapter.key,
  title: chapter.title,
  href: chapter.href,
  indexSlug: chapter.indexSlug,
  articles: chapter.articles,
  allSlugs: [chapter.indexSlug, ...chapter.articles.map((a) => a.slug)],
}));
---

<BaseLayout title="学习进度">
  <ConfirmDialog />
  <div class="progress-page" data-total-articles={totalArticles}>

    <!-- 总进度 header -->
    <div class="progress-header">
      <div class="progress-header-inner">
        <h1 class="page-title">学习进度</h1>
        <div class="overall-row">
          <div class="overall-meta">
            <span class="overall-label">总进度</span>
            <span class="overall-pct" id="overall-pct">0%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" id="overall-bar"></div>
          </div>
        </div>
        <div class="header-actions">
          <a href="/certificate" class="btn-primary" id="cert-btn" hidden>
            🎉 领取证书
          </a>
          <button type="button" class="btn-secondary" id="reset-all-btn">
            全部重新学习
          </button>
        </div>
      </div>
    </div>

    <!-- 章节列表 -->
    <div class="chapters-container">
      {chapterBlocks.map((chapter) => (
        <div
          class="chapter-block"
          data-chapter-key={chapter.key}
          data-all-slugs={chapter.allSlugs.join(',')}
        >
          <!-- 章节 header -->
          <div class="chapter-header">
            <a href={chapter.href} class="chapter-title-link">
              {chapter.title}
            </a>
            <div class="chapter-bar-row">
              <div class="progress-track sm">
                <div
                  class="progress-fill chapter-bar-fill"
                  data-chapter-key={chapter.key}
                ></div>
              </div>
              <span class="chapter-pct" data-chapter-pct={chapter.key}>0%</span>
            </div>
            <button
              type="button"
              class="btn-secondary sm reset-chapter-btn"
              data-chapter-key={chapter.key}
            >
              重新学习
            </button>
          </div>

          <!-- 文章列表 -->
          <ul class="article-list">
            <!-- 章节索引文章 -->
            <li class="article-item">
              <span class="status-icon" data-slug={chapter.indexSlug}>⬜</span>
              <a href={chapter.href} class="article-link">{chapter.title}</a>
              <button
                type="button"
                class="reset-article-btn"
                data-slug={chapter.indexSlug}
              >
                重新学习
              </button>
            </li>
            <!-- 子文章 -->
            {chapter.articles.map((article) => (
              <li class="article-item">
                <span class="status-icon" data-slug={article.slug}>⬜</span>
                <a href={article.href} class="article-link">{article.title}</a>
                <button
                  type="button"
                  class="reset-article-btn"
                  data-slug={article.slug}
                >
                  重新学习
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
</BaseLayout>

<script>
  import { resetArticle, resetChapter, resetAll } from '../lib/progress';

  const page = document.querySelector<HTMLElement>('.progress-page');
  if (!page) throw new Error('progress page: root element not found');

  const total = parseInt(page.dataset.totalArticles ?? '0', 10);
  const overallBar = document.getElementById('overall-bar') as HTMLElement | null;
  const overallPctEl = document.getElementById('overall-pct');
  const certBtn = document.getElementById('cert-btn') as HTMLAnchorElement | null;

  type Store = { articles?: Record<string, { status: string }> };

  function readStore(): Store {
    try {
      const raw = localStorage.getItem('rust-tutorial-progress');
      return raw ? (JSON.parse(raw) as Store) : {};
    } catch {
      return {};
    }
  }

  function refreshProgress(): void {
    const store = readStore();
    let completedTotal = 0;

    page.querySelectorAll<HTMLElement>('.chapter-block').forEach((block) => {
      const chapterKey = block.dataset.chapterKey ?? '';
      const slugs = (block.dataset.allSlugs ?? '').split(',').filter(Boolean);
      let completedChapter = 0;

      slugs.forEach((slug) => {
        const status = store.articles?.[slug]?.status ?? 'not-started';
        const icon = block.querySelector<HTMLElement>(
          `.status-icon[data-slug="${slug}"]`
        );
        if (icon) {
          icon.textContent =
            status === 'completed' ? '✅' : status === 'in-progress' ? '🔵' : '⬜';
        }
        if (status === 'completed') completedChapter++;
      });

      completedTotal += completedChapter;

      const chapterPct =
        slugs.length > 0
          ? Math.round((completedChapter / slugs.length) * 100)
          : 0;

      const barFill = block.querySelector<HTMLElement>(
        `.chapter-bar-fill[data-chapter-key="${chapterKey}"]`
      );
      const pctEl = block.querySelector<HTMLElement>(
        `[data-chapter-pct="${chapterKey}"]`
      );
      if (barFill) barFill.style.width = `${chapterPct}%`;
      if (pctEl) pctEl.textContent = `${chapterPct}%`;
    });

    const overallPct =
      total > 0 ? Math.round((completedTotal / total) * 100) : 0;
    if (overallBar) overallBar.style.width = `${overallPct}%`;
    if (overallPctEl) overallPctEl.textContent = `${overallPct}%`;
    if (certBtn) certBtn.hidden = overallPct < 90;
  }

  // 重置单篇文章（无需确认）
  page.querySelectorAll<HTMLButtonElement>('.reset-article-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slug = btn.dataset.slug ?? '';
      if (slug) {
        resetArticle(slug);
        refreshProgress();
      }
    });
  });

  // 重置整章（无需确认）
  page.querySelectorAll<HTMLButtonElement>('.reset-chapter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.chapterKey ?? '';
      if (key) {
        resetChapter(key);
        refreshProgress();
      }
    });
  });

  // 重置全部（需输入确认文字）
  document.getElementById('reset-all-btn')?.addEventListener('click', () => {
    (
      window as typeof window & {
        openConfirmDialog?: (opts: {
          message: string;
          confirmText: string;
          onConfirm: () => void;
        }) => void;
      }
    ).openConfirmDialog?.({
      message: '此操作将清除全部学习进度，无法撤销。',
      confirmText: '全部重新学习',
      onConfirm: () => {
        resetAll();
        refreshProgress();
      },
    });
  });

  refreshProgress();
</script>

<style>
  .progress-page {
    max-width: 860px;
    margin: 0 auto;
    padding: 2rem 1.5rem 5rem;
  }

  .progress-header {
    margin-bottom: 2.5rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--color-border);
  }

  .progress-header-inner {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .overall-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .overall-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 90px;
    flex-shrink: 0;
  }

  .overall-label {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .overall-pct {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-success);
    font-family: var(--font-mono);
  }

  .progress-track {
    flex: 1;
    height: 8px;
    background: var(--color-code-bg);
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--color-border);
  }

  .progress-track.sm {
    flex: none;
    width: 80px;
    height: 5px;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-success);
    border-radius: 4px;
    width: 0%;
    transition: width 0.3s ease;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .chapters-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .chapter-block {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .chapter-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: var(--color-surface);
  }

  .chapter-title-link {
    flex: 1;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-text);
    text-decoration: none;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.15s;
  }

  .chapter-title-link:hover {
    color: var(--color-accent);
    text-decoration: none;
  }

  .chapter-bar-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .chapter-pct {
    font-size: 0.75rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    min-width: 2.5rem;
    text-align: right;
  }

  .btn-secondary.sm {
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
  }

  .article-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .article-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 1rem 0.6rem 1.25rem;
    border-top: 1px solid var(--color-border);
  }

  .status-icon {
    font-size: 0.875rem;
    flex-shrink: 0;
    width: 1.25rem;
    text-align: center;
  }

  .article-link {
    flex: 1;
    font-size: 0.875rem;
    color: rgba(232, 232, 232, 0.78);
    text-decoration: none;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.15s;
  }

  .article-link:hover {
    color: var(--color-accent);
    text-decoration: none;
  }

  .reset-article-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    padding: 0.15rem 0.4rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s, background 0.15s;
  }

  .article-item:hover .reset-article-btn {
    opacity: 1;
  }

  .reset-article-btn:hover {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.06);
  }
</style>
```

- [ ] **Step 2: 验证类型和构建**

运行：`npx astro check && npx astro build`

预期：0 errors，build 成功

- [ ] **Step 3: 手动浏览器验证**

运行 `npm run dev`，访问 `/progress`：
- 显示所有章节和文章列表，状态图标初始为 ⬜
- 访问并滚动完成任意文章后返回，该文章状态更新为 ✅ 或 🔵
- 点击文章旁"重新学习"：图标回到 ⬜，无需确认
- 点击"全部重新学习"：弹出确认框，输入"全部重新学习"后确认，所有进度清零

- [ ] **Step 4: 提交**

```bash
git add src/pages/progress.astro
git commit -m "feat(progress): implement full /progress page with chapter/article reset"
```

---

### Task 7: 首页进度点与 localStorage 同步

**文件：**
- 修改：`src/pages/index.astro`

`index.astro` 中 `.item-progress-area[data-slug]` 和 `.progress-dot` 元素已存在，需追加客户端脚本让进度点颜色与 localStorage 同步。

- [ ] **Step 1: 在 `index.astro` 末尾追加 `<script>` 块**

在最后一个 `</style>` 标签之后追加：

```astro
<script>
  function syncProgressDots(): void {
    let store: { articles?: Record<string, { status: string }> } = {};
    try {
      const raw = localStorage.getItem('rust-tutorial-progress');
      if (raw) store = JSON.parse(raw) as typeof store;
    } catch {
      // ignore
    }

    document
      .querySelectorAll<HTMLElement>('.item-progress-area[data-slug]')
      .forEach((area) => {
        const slug = area.dataset.slug ?? '';
        const status = store.articles?.[slug]?.status ?? 'not-started';
        const dot = area.querySelector<HTMLElement>('.progress-dot');
        if (!dot) return;

        if (status === 'completed') {
          dot.style.background = 'var(--color-success)';
          dot.style.borderColor = 'var(--color-success)';
        } else if (status === 'in-progress') {
          dot.style.background = 'rgba(245, 158, 11, 0.2)';
          dot.style.borderColor = 'var(--color-warning)';
        } else {
          dot.style.background = '';
          dot.style.borderColor = '';
        }
      });
  }

  syncProgressDots();
  window.addEventListener('progress-updated', syncProgressDots);
</script>
```

- [ ] **Step 2: 验证类型和构建**

运行：`npx astro check && npx astro build`

预期：0 errors，build 成功

- [ ] **Step 3: 手动浏览器验证**

运行 `npm run dev`：
1. 访问任意章节并滚动完成（让 H2 tab 变绿）
2. 返回首页 `/`
3. 对应文章旁的圆圈进度点变为绿色（已完成）或黄色边框（进行中）

- [ ] **Step 4: 提交**

```bash
git add src/pages/index.astro
git commit -m "feat(progress): sync progress dots on home page with localStorage"
```

---

## 验收标准

- [ ] 访问章节页，滚动到 H2 section 底部，对应 tab pill 变绿
- [ ] 所有 H2 tab 变绿后，Navbar 进度百分比实时更新
- [ ] 无 H2 的页面滚动到底部后，整篇文章被标记完成
- [ ] `/progress` 页展示所有章节/文章的状态（✅/🔵/⬜）
- [ ] 首页大纲各文章/章节进度点颜色与 localStorage 同步
- [ ] 点击"全部重新学习"需在确认框中输入"全部重新学习"才能执行
- [ ] `npx astro check` 0 errors
- [ ] `npx astro build` 0 errors
