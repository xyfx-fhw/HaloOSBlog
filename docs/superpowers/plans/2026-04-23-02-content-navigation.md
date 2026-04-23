# 子计划 2：内容导航（三栏布局 + 侧边栏 + TOC）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 为章节文档页添加三栏布局，包含左侧可折叠课程目录树（Sidebar）、右侧页内标题锚点目录（PageToc，含滚动高亮），以及面包屑导航和上一节/下一节文章级跳转按钮。

**架构：** `src/lib/content.ts` 新增导航工具函数，从 Content Collections 构建带层级的 `NavChapter[]` 树和扁平的 `NavArticle[]` 列表；`Sidebar.astro` 消费导航树，服务端预展开活跃章节；`PageToc.astro` 消费 `render()` 返回的 `headings`，用 IntersectionObserver 实现滚动高亮；`ChapterLayout.astro` 用 CSS flex 组合三栏布局并包装 BaseLayout；`[...slug].astro` 替换为 ChapterLayout 并传入所需数据。

**技术栈：** Astro 5.x Content Collections（传统 API）、TypeScript、CSS Flex/Sticky、IntersectionObserver API

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 新建 | `src/lib/content.ts` | 导航树构建、扁平文章列表、面包屑类型 |
| 新建 | `src/content/chapters/02-ownership/00-index.md` | 第二章入口文章（用于测试跨章节导航） |
| 新建 | `src/content/chapters/02-ownership/01-ownership-rules.md` | 所有权规则（含多个 H2，测试 TOC） |
| 新建 | `src/content/chapters/02-ownership/02-borrowing.md` | 借用与引用 |
| 新建 | `src/components/layout/Sidebar.astro` | 左侧章节目录树，服务端预展开活跃章节 |
| 新建 | `src/components/layout/PageToc.astro` | 右侧页内标题目录，含滚动高亮 |
| 新建 | `src/components/layout/ChapterLayout.astro` | 三栏布局包装器，含面包屑和上下节导航 |
| 修改 | `src/pages/chapters/[...slug].astro` | 使用 ChapterLayout，传入 navTree/headings/面包屑/prev-next |

---

### Task 1: 导航树构建工具函数 (content.ts)

**Files:**
- Create: `src/lib/content.ts`

- [ ] **Step 1: 创建 `src/lib/content.ts`**

```typescript
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
```

- [ ] **Step 2: 验证类型**

```bash
npx astro check
```

预期：0 errors

- [ ] **Step 3: 提交**

```bash
git add src/lib/content.ts
git commit -m "feat: add content.ts nav tree builder and flat article list"
```

---

### Task 2: 添加第二章示例内容

**Files:**
- Create: `src/content/chapters/02-ownership/00-index.md`
- Create: `src/content/chapters/02-ownership/01-ownership-rules.md`
- Create: `src/content/chapters/02-ownership/02-borrowing.md`

- [ ] **Step 1: 创建 `src/content/chapters/02-ownership/00-index.md`**

```markdown
---
title: "所有权系统"
description: "理解 Rust 最核心的概念：所有权，以及它如何保证内存安全"
difficulty: intermediate
estimatedTime: 10
keywords: ["所有权", "内存安全", "drop"]
---

## 什么是所有权

所有权是 Rust 最独特的特性，它让 Rust 在不需要垃圾回收器的情况下保证内存安全。

## 所有权规则

Rust 中每一个值都有一个 **所有者**（owner）。值在任一时刻只能有一个所有者。当所有者离开作用域，值将被丢弃（drop）。
```

- [ ] **Step 2: 创建 `src/content/chapters/02-ownership/01-ownership-rules.md`**

```markdown
---
title: "所有权规则"
description: "深入理解 Rust 所有权的三条基本规则及其含义"
difficulty: intermediate
estimatedTime: 20
keywords: ["所有权规则", "移动", "Clone", "Copy"]
---

## 三条基本规则

Rust 中的所有权遵循以下三条规则：

1. 每个值都有一个变量作为其 **所有者**
2. 值在任一时刻只能有 **一个** 所有者
3. 当所有者离开作用域，值将被自动丢弃

## 移动语义

当你将一个变量赋值给另一个变量时，所有权会发生 **移动**（move）：

```rust
let s1 = String::from("hello");
let s2 = s1; // s1 的所有权移动到 s2
// println!("{}", s1); // 编译错误！s1 已失效
println!("{}", s2);
```

## Copy 类型

实现了 `Copy` trait 的类型（如整数、浮点数、bool）在赋值时会**复制**而非移动：

```rust
let x = 5;
let y = x; // x 被复制，x 和 y 都有效
println!("x = {}, y = {}", x, y);
```

## 函数与所有权

将值传给函数时，所有权同样会发生移动或复制，规则与赋值完全相同：

```rust
fn main() {
    let s = String::from("hello");
    takes_ownership(s);        // s 的所有权移入函数
    // println!("{}", s);      // 错误！s 已无效

    let x = 5;
    makes_copy(x);             // x 的值被复制
    println!("{}", x);         // 仍然有效
}

fn takes_ownership(some_string: String) {
    println!("{}", some_string);
} // some_string 在这里被 drop

fn makes_copy(some_integer: i32) {
    println!("{}", some_integer);
}
```
```

- [ ] **Step 3: 创建 `src/content/chapters/02-ownership/02-borrowing.md`**

```markdown
---
title: "借用与引用"
description: "学习如何通过引用借用值，而不转移所有权"
difficulty: intermediate
estimatedTime: 25
keywords: ["借用", "引用", "&T", "&mut T", "借用规则"]
---

## 什么是借用

**借用**允许你使用一个值而不取得其所有权。通过创建引用（reference）实现：

```rust
fn main() {
    let s = String::from("hello");
    let len = calculate_length(&s); // 借用 s
    println!("'{}' 的长度是 {}。", s, len); // s 依然有效
}

fn calculate_length(s: &String) -> usize {
    s.len()
}
```

## 不可变借用与可变借用

| 类型 | 语法 | 同时可以有几个 |
|------|------|--------------|
| 不可变引用 | `&T` | 任意多个 |
| 可变引用 | `&mut T` | 仅一个 |

## 借用规则

任意时刻，你只能拥有：

- **若干个**不可变引用，**或者**
- **一个**可变引用

这些规则在编译期由借用检查器（borrow checker）强制执行。

## 悬垂引用

Rust 编译器保证引用永远不会成为**悬垂引用**（dangling reference）：

```rust
// 以下代码无法编译：
fn dangle() -> &String {
    let s = String::from("hello");
    &s // s 在函数结束时被 drop，引用将悬垂
}
```
```

- [ ] **Step 4: 验证**

```bash
npx astro check
npm run dev
# 访问 http://localhost:4321/chapters 确认两章均显示
```

- [ ] **Step 5: 提交**

```bash
git add src/content/chapters/02-ownership/
git commit -m "feat: add chapter 02 ownership sample content"
```

---

### Task 3: Sidebar.astro

**Files:**
- Create: `src/components/layout/Sidebar.astro`

- [ ] **Step 1: 创建 `src/components/layout/Sidebar.astro`**

```astro
---
import type { NavChapter } from '../../lib/content';

interface Props {
  navTree: NavChapter[];
  currentSlug: string;
}

const { navTree, currentSlug } = Astro.props;

const activeChapterKey = navTree.find(
  ch => ch.indexSlug === currentSlug || ch.articles.some(a => a.slug === currentSlug)
)?.key ?? '';
---

<aside class="sidebar" id="sidebar">
  <nav class="sidebar-nav" aria-label="课程目录">
    {navTree.map((chapter, chapterIdx) => {
      const isExpanded = chapter.key === activeChapterKey;
      const isIndexActive = chapter.indexSlug === currentSlug;
      return (
        <div class="chapter-item" data-open={isExpanded ? 'true' : 'false'}>
          <div class="chapter-row">
            <a
              href={chapter.href}
              class:list={['chapter-link', { active: isIndexActive }]}
              aria-current={isIndexActive ? 'page' : undefined}
            >
              <span class="chapter-num">第{chapterIdx + 1}章</span>
              {chapter.title}
            </a>
            <button
              class:list={['chapter-toggle', { open: isExpanded }]}
              aria-label={isExpanded ? '折叠' : '展开'}
              aria-expanded={isExpanded ? 'true' : 'false'}
              data-chapter-toggle
            >
              <span class="toggle-arrow">{isExpanded ? '▾' : '▸'}</span>
            </button>
          </div>
          <ul
            class="article-list"
            aria-hidden={!isExpanded ? 'true' : 'false'}
            hidden={!isExpanded || undefined}
          >
            {chapter.articles.map((article, articleIdx) => (
              <li>
                <a
                  href={article.href}
                  class:list={['article-link', { active: article.slug === currentSlug }]}
                  aria-current={article.slug === currentSlug ? 'page' : undefined}
                >
                  <span class="article-num">{chapterIdx + 1}.{articleIdx + 1}</span>
                  {article.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      );
    })}
  </nav>
</aside>

<script>
  document.querySelectorAll('[data-chapter-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.chapter-item') as HTMLElement;
      const list = item.querySelector('.article-list') as HTMLElement;
      const isOpen = item.dataset.open === 'true';
      item.dataset.open = isOpen ? 'false' : 'true';
      list.hidden = isOpen;
      list.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      btn.classList.toggle('open', !isOpen);
      const arrow = btn.querySelector('.toggle-arrow');
      if (arrow) arrow.textContent = isOpen ? '▸' : '▾';
    });
  });
</script>

<style>
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    position: sticky;
    top: var(--navbar-height);
    height: calc(100vh - var(--navbar-height));
    overflow-y: auto;
    border-right: 1px solid var(--color-border);
    padding: 1.25rem 0;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .chapter-item {
    padding: 0 0.75rem;
  }

  .chapter-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .chapter-link {
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
    padding: 0.4375rem 0.5rem;
    border-radius: 5px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color 0.15s, background 0.15s;
    min-width: 0;
    overflow: hidden;
  }

  .chapter-link:hover {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.04);
    text-decoration: none;
  }

  .chapter-link.active {
    color: var(--color-text);
    background: rgba(206, 65, 43, 0.08);
  }

  .chapter-num {
    font-size: 0.75rem;
    color: var(--color-accent);
    font-weight: 600;
    flex-shrink: 0;
  }

  .chapter-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }

  .chapter-toggle:hover {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.06);
  }

  .toggle-arrow {
    font-size: 0.75rem;
    line-height: 1;
  }

  .article-list {
    list-style: none;
    padding: 0.25rem 0 0.25rem 0.75rem;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.0625rem;
  }

  .article-link {
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
    padding: 0.3125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color 0.15s, background 0.15s;
  }

  .article-link:hover {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.04);
    text-decoration: none;
  }

  .article-link.active {
    color: var(--color-accent);
    background: rgba(206, 65, 43, 0.06);
  }

  .article-num {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  .article-link.active .article-num {
    color: var(--color-accent);
    opacity: 0.7;
  }
</style>
```

- [ ] **Step 2: 验证类型**

```bash
npx astro check
```

预期：0 errors

- [ ] **Step 3: 提交**

```bash
git add src/components/layout/Sidebar.astro
git commit -m "feat: add Sidebar component with chapter tree navigation"
```

---

### Task 4: PageToc.astro

**Files:**
- Create: `src/components/layout/PageToc.astro`

- [ ] **Step 1: 创建 `src/components/layout/PageToc.astro`**

```astro
---
import type { MarkdownHeading } from 'astro';

interface Props {
  headings: MarkdownHeading[];
}

const { headings } = Astro.props;
const tocHeadings = headings.filter(h => h.depth === 2 || h.depth === 3);
---

{tocHeadings.length > 0 && (
  <aside class="page-toc">
    <p class="toc-title">目录</p>
    <nav aria-label="页内目录">
      <ul class="toc-list">
        {tocHeadings.map(h => (
          <li class:list={['toc-item', `toc-h${h.depth}`]}>
            <a href={`#${h.slug}`} class="toc-link">{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  </aside>
)}

<script>
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc-link'));
  if (links.length > 0) {
    const headingEls = links.map(l => {
      const id = l.getAttribute('href')?.slice(1);
      return id ? document.getElementById(id) : null;
    });

    let activeIdx = -1;
    const activate = (idx: number) => {
      if (idx === activeIdx) return;
      if (activeIdx >= 0) links[activeIdx]?.classList.remove('active');
      activeIdx = idx;
      links[activeIdx]?.classList.add('active');
    };

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = headingEls.indexOf(entry.target as HTMLElement);
            if (idx !== -1) activate(idx);
          }
        });
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 }
    );

    headingEls.forEach(el => el && observer.observe(el));
  }
</script>

<style>
  .page-toc {
    width: 200px;
    flex-shrink: 0;
    position: sticky;
    top: calc(var(--navbar-height) + 1.5rem);
    max-height: calc(100vh - var(--navbar-height) - 3rem);
    overflow-y: auto;
    padding: 0 1rem 1rem 0.5rem;
    align-self: flex-start;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  .toc-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.75rem;
  }

  .toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--color-border);
  }

  .toc-h3 {
    padding-left: 0.875rem;
  }

  .toc-link {
    display: block;
    padding: 0.25rem 0.75rem;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    text-decoration: none;
    line-height: 1.5;
    border-left: 2px solid transparent;
    margin-left: -1px;
    transition: color 0.15s, border-color 0.15s;
  }

  .toc-link:hover {
    color: var(--color-text);
    text-decoration: none;
  }

  .toc-link.active {
    color: var(--color-accent);
    border-left-color: var(--color-accent);
  }
</style>
```

- [ ] **Step 2: 验证**

```bash
npx astro check
```

预期：0 errors

- [ ] **Step 3: 提交**

```bash
git add src/components/layout/PageToc.astro
git commit -m "feat: add PageToc component with IntersectionObserver scrollspy"
```

---

### Task 5: ChapterLayout.astro

**Files:**
- Create: `src/components/layout/ChapterLayout.astro`

- [ ] **Step 1: 创建 `src/components/layout/ChapterLayout.astro`**

```astro
---
import type { MarkdownHeading } from 'astro';
import BaseLayout from './BaseLayout.astro';
import Sidebar from './Sidebar.astro';
import PageToc from './PageToc.astro';
import type { NavChapter, NavArticle, BreadcrumbItem } from '../../lib/content';

interface Props {
  title: string;
  description?: string;
  navTree: NavChapter[];
  currentSlug: string;
  headings: MarkdownHeading[];
  breadcrumb: BreadcrumbItem[];
  prevArticle?: NavArticle;
  nextArticle?: NavArticle;
}

const {
  title,
  description,
  navTree,
  currentSlug,
  headings,
  breadcrumb,
  prevArticle,
  nextArticle,
} = Astro.props;
---

<BaseLayout title={title} description={description}>
  <div class="chapter-layout">
    <Sidebar navTree={navTree} currentSlug={currentSlug} />
    <div class="chapter-body">
      <nav class="breadcrumb" aria-label="面包屑">
        {breadcrumb.map((item, i) => (
          <Fragment>
            {i > 0 && <span class="breadcrumb-sep" aria-hidden="true">／</span>}
            {item.href
              ? <a href={item.href} class="breadcrumb-link">{item.label}</a>
              : <span class="breadcrumb-current" aria-current="page">{item.label}</span>
            }
          </Fragment>
        ))}
      </nav>

      <main class="chapter-main">
        <slot />
      </main>

      <nav class="article-nav" aria-label="文章导航">
        <div class="article-nav-prev">
          {prevArticle && (
            <a href={prevArticle.href} class="article-nav-link">
              <span class="nav-label">← 上一节</span>
              <span class="nav-title">{prevArticle.title}</span>
            </a>
          )}
        </div>
        <div class="article-nav-next">
          {nextArticle && (
            <a href={nextArticle.href} class="article-nav-link">
              <span class="nav-label">下一节 →</span>
              <span class="nav-title">{nextArticle.title}</span>
            </a>
          )}
        </div>
      </nav>
    </div>
    <PageToc headings={headings} />
  </div>
</BaseLayout>

<style>
  .chapter-layout {
    display: flex;
    align-items: flex-start;
    min-height: calc(100vh - var(--navbar-height));
  }

  .chapter-body {
    flex: 1;
    min-width: 0;
    padding: 1.5rem 2rem 4rem;
    max-width: 820px;
  }

  /* 面包屑 */
  .breadcrumb {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    margin-bottom: 2rem;
  }

  .breadcrumb-sep {
    color: var(--color-border);
    margin: 0 0.125rem;
  }

  .breadcrumb-link {
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color 0.15s;
  }

  .breadcrumb-link:hover {
    color: var(--color-text);
    text-decoration: none;
  }

  .breadcrumb-current {
    color: var(--color-text);
  }

  /* 上一节/下一节导航 */
  .article-nav {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
  }

  .article-nav-prev,
  .article-nav-next {
    flex: 1;
  }

  .article-nav-next {
    text-align: right;
  }

  .article-nav-link {
    display: inline-flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.875rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    text-decoration: none;
    transition: border-color 0.15s, background 0.15s;
    max-width: 100%;
  }

  .article-nav-link:hover {
    border-color: var(--color-accent);
    background: rgba(206, 65, 43, 0.04);
    text-decoration: none;
  }

  .nav-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .nav-title {
    font-size: 0.9375rem;
    color: var(--color-text);
    font-weight: 500;
  }

  /* 响应式：中等屏幕隐藏右侧 TOC */
  @media (max-width: 1200px) {
    :global(.page-toc) {
      display: none;
    }
  }

  /* 响应式：小屏幕隐藏侧边栏 */
  @media (max-width: 768px) {
    :global(.sidebar) {
      display: none;
    }

    .chapter-body {
      padding: 1.5rem 1rem 4rem;
    }
  }
</style>
```

- [ ] **Step 2: 验证类型**

```bash
npx astro check
```

预期：0 errors

- [ ] **Step 3: 提交**

```bash
git add src/components/layout/ChapterLayout.astro
git commit -m "feat: add ChapterLayout three-column wrapper with breadcrumb and prev/next nav"
```

---

### Task 6: 更新章节文档页 ([...slug].astro)

**Files:**
- Modify: `src/pages/chapters/[...slug].astro`

- [ ] **Step 1: 完整替换 `src/pages/chapters/[...slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import ChapterLayout from '../../components/layout/ChapterLayout.astro';
import { buildNavTree, getFlatArticleList, type BreadcrumbItem } from '../../lib/content';

export async function getStaticPaths() {
  const chapters = await getCollection('chapters');
  return chapters.map(entry => ({
    params: { slug: entry.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content, headings } = await render(entry);
const { title, description, difficulty, estimatedTime, keywords } = entry.data;

const navTree = await buildNavTree();
const flatList = await getFlatArticleList();

const currentIndex = flatList.findIndex(a => a.slug === entry.slug);
const prevArticle = currentIndex > 0 ? flatList[currentIndex - 1] : undefined;
const nextArticle = currentIndex < flatList.length - 1 ? flatList[currentIndex + 1] : undefined;

const chapterInfo = navTree.find(
  ch => ch.indexSlug === entry.slug || ch.articles.some(a => a.slug === entry.slug)
);

const breadcrumb: BreadcrumbItem[] = [
  { label: '首页', href: '/' },
  { label: '开始学习', href: '/chapters' },
  ...(chapterInfo && entry.slug !== chapterInfo.indexSlug
    ? [{ label: chapterInfo.title, href: chapterInfo.href }]
    : []),
  { label: title },
];

const difficultyLabel: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};
---

<ChapterLayout
  title={title}
  description={description}
  navTree={navTree}
  currentSlug={entry.slug}
  headings={headings}
  breadcrumb={breadcrumb}
  prevArticle={prevArticle}
  nextArticle={nextArticle}
>
  <article>
    <header class="article-header">
      <h1 class="article-title">{title}</h1>
      <p class="article-desc">{description}</p>
      <div class="article-meta">
        <span class={`meta-badge difficulty-${difficulty}`}>
          {difficultyLabel[difficulty] ?? difficulty}
        </span>
        <span class="meta-time">⏱ {estimatedTime} 分钟</span>
        {keywords.map(kw => (
          <span class="meta-keyword">{kw}</span>
        ))}
      </div>
    </header>

    <div class="prose">
      <Content />
    </div>
  </article>
</ChapterLayout>

<style>
  .article-header {
    margin-bottom: 2rem;
  }

  .article-title {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.25;
    margin-bottom: 0.5rem;
  }

  .article-desc {
    color: var(--color-text-muted);
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .article-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .meta-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.625rem;
    border: 1px solid;
    border-radius: 999px;
    font-weight: 500;
  }

  .meta-badge.difficulty-beginner {
    color: var(--color-success);
    border-color: rgba(34, 197, 94, 0.2);
  }

  .meta-badge.difficulty-intermediate {
    color: var(--color-warning);
    border-color: rgba(245, 158, 11, 0.2);
  }

  .meta-badge.difficulty-advanced {
    color: var(--color-error);
    border-color: rgba(239, 68, 68, 0.2);
  }

  .meta-time {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }

  .meta-keyword {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-muted);
  }
</style>
```

- [ ] **Step 2: 验证类型检查**

```bash
npx astro check
```

预期：0 errors

- [ ] **Step 3: 浏览器验证**

```bash
npm run dev
```

访问以下页面并逐项确认：

**`http://localhost:4321/chapters/01-getting-started/00-index`**
- [ ] 左侧侧边栏显示两章（第1章、第2章）
- [ ] 第1章自动展开，第2章折叠
- [ ] 第1章标题高亮（章节链接为活跃状态）
- [ ] 面包屑：首页 ／ 开始学习 ／ 认识 Rust
- [ ] 右侧 TOC 显示文章内的 H2 标题（"为什么选择 Rust？"、"Rust 适合做什么？"等）
- [ ] 无"← 上一节"按钮（第一篇文章）
- [ ] 有"下一节 → 安装 Rust"按钮

**`http://localhost:4321/chapters/01-getting-started/01-installation`**
- [ ] 第1章展开，"1.1 安装 Rust"条目高亮（橙色）
- [ ] 面包屑：首页 ／ 开始学习 ／ 认识 Rust ／ 安装 Rust
- [ ] 有"← 上一节 认识 Rust"
- [ ] 有"下一节 → Hello, World!"

**`http://localhost:4321/chapters/02-ownership/00-index`**
- [ ] 第2章自动展开，第1章折叠
- [ ] 第2章标题高亮
- [ ] 面包屑：首页 ／ 开始学习 ／ 所有权系统
- [ ] 有"← 上一节 Hello, World!"（上一章最后一篇）
- [ ] 有"下一节 → 所有权规则"

**`http://localhost:4321/chapters/02-ownership/01-ownership-rules`**
- [ ] 右侧 TOC 显示"三条基本规则"、"移动语义"、"Copy 类型"、"函数与所有权"
- [ ] 向下滚动时 TOC 高亮条目随滚动位置变化

**折叠/展开测试**
- [ ] 点击第1章的折叠按钮 → 第1章子文章列表收起
- [ ] 再次点击 → 子文章列表展开

- [ ] **Step 4: 构建验证**

```bash
npx astro build
```

预期：Build complete，0 errors，输出 6 个章节页面（共 2 章 × 3 篇 = 6 篇）

- [ ] **Step 5: 提交**

```bash
git add src/pages/chapters/[...slug].astro
git commit -m "feat: chapter doc page now uses ChapterLayout with sidebar, TOC and breadcrumb"
```

---

*计划结束。全部 6 个 Task 完成后，章节文档页具备完整的三栏导航体验。后续进度追踪（sidebar 活跃状态来自 localStorage）将在子计划 4 中叠加。*
