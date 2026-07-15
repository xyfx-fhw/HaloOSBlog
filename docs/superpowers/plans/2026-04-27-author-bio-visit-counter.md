# 作者简介与访问量统计实现计划

> **状态：✅ 已完结（2026-04-27）**
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 为首页添加详细作者简介区块，为文章页上下节导航之间添加精简作者信息，并通过不蒜子接入全站访问量统计。

**Architecture:** 新建 `src/components/home/` 目录，放置 `AuthorSection.astro`（首页详细版）和 `AuthorMini.astro`（文章页精简版）。不蒜子 script 挂载在 `BaseLayout.astro` `<head>` 内，计数显示仅出现在 `AuthorSection` 底部。`logo.svg` 迁移至 `public/images/` 作为静态资源。

**Tech Stack:** Astro 5, 原生 CSS, 不蒜子（busuanzi）外部计数服务

---

## 文件总览

| 操作 | 路径 |
|------|------|
| 移动 | `logo.svg` → `public/images/logo.svg` |
| 修改 | `src/components/layout/BaseLayout.astro`（head 追加不蒜子 script） |
| 新建 | `src/components/home/AuthorSection.astro` |
| 新建 | `src/components/home/AuthorMini.astro` |
| 修改 | `src/pages/index.astro`（引入 AuthorSection，删除 hero-author 段落及样式） |
| 修改 | `src/components/layout/ChapterLayout.astro`（article-nav 前引入 AuthorMini） |

---

### Task 1：迁移 logo.svg

**Files:**
- Move: `logo.svg` → `public/images/logo.svg`

- [x] **Step 1：创建目标目录并移动文件**

```bash
mkdir -p public/images
mv logo.svg public/images/logo.svg
```

- [x] **Step 2：验证文件存在**

```bash
ls public/images/
```

预期输出：`logo.svg`

- [x] **Step 3：提交**

```bash
git add public/images/logo.svg logo.svg
git commit -m "chore: move logo.svg to public/images/"
```

---

### Task 2：在 BaseLayout 中接入不蒜子

**Files:**
- Modify: `src/components/layout/BaseLayout.astro:30`

- [x] **Step 1：在 `<title>` 标签后追加 script**

在 `src/components/layout/BaseLayout.astro` 第 30 行（`<title>...</title>` 之后）添加：

```html
    <title>{title} — HaloOS 系列讲解</title>
    <script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
  </head>
```

- [x] **Step 2：构建确认无报错**

```bash
npm run build 2>&1 | tail -5
```

预期输出中含 `Finished` 且无 `error`。

- [x] **Step 3：提交**

```bash
git add src/components/layout/BaseLayout.astro
git commit -m "feat(analytics): add busuanzi visit counter script to head"
```

---

### Task 3：创建 AuthorSection.astro（首页详细版）

**Files:**
- Create: `src/components/home/AuthorSection.astro`

- [x] **Step 1：创建目录**

```bash
mkdir -p src/components/home
```

- [x] **Step 2：创建组件文件**

新建 `src/components/home/AuthorSection.astro`，内容如下：

```astro
---
const AUTHOR = {
  displayName: '雪云飞星',
  realName: '付皓文',
  title: '汽车嵌入式软件高级架构师',
  bio: '专注嵌入式系统安全与 Rust 工程实践，这套教程是对 Rust 在工业领域落地的一次尝试。',
  avatar: '/images/logo.svg',
};
---

<section class="author-section">
  <div class="author-inner">
    <img src={AUTHOR.avatar} alt={AUTHOR.displayName} class="author-avatar" width="80" height="80" />
    <div class="author-info">
      <div class="author-names">
        <span class="author-display-name">{AUTHOR.displayName}</span>
        <span class="author-real-name">{AUTHOR.realName}</span>
      </div>
      <p class="author-title">{AUTHOR.title}</p>
      <p class="author-bio">{AUTHOR.bio}</p>
      <p id="busuanzi_container_site_pv" class="author-pv">
        本站累计访问 · <span id="busuanzi_value_site_pv"></span> 次
      </p>
    </div>
  </div>
</section>

<style>
  .author-section {
    padding: 4rem 1.5rem 3rem;
    border-top: 1px solid var(--color-border);
  }

  .author-inner {
    max-width: 860px;
    margin: 0 auto;
    display: flex;
    align-items: flex-start;
    gap: 1.5rem;
  }

  .author-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .author-info {
    flex: 1;
    min-width: 0;
  }

  .author-names {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .author-display-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .author-real-name {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .author-title {
    font-size: 0.85rem;
    color: var(--color-accent);
    margin: 0 0 0.5rem;
  }

  .author-bio {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    line-height: 1.7;
    margin: 0 0 0.75rem;
  }

  .author-pv {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    opacity: 0.45;
    margin: 0;
    font-family: var(--font-mono);
  }
</style>
```

- [x] **Step 3：构建确认无报错**

```bash
npm run build 2>&1 | tail -5
```

预期：含 `Finished`，无 `error`。

- [x] **Step 4：提交**

```bash
git add src/components/home/AuthorSection.astro
git commit -m "feat(home): add AuthorSection component with busuanzi PV display"
```

---

### Task 4：创建 AuthorMini.astro（文章页精简版）

**Files:**
- Create: `src/components/home/AuthorMini.astro`

- [x] **Step 1：创建组件文件**

新建 `src/components/home/AuthorMini.astro`，内容如下：

```astro
---
const AVATAR = '/images/logo.svg';
const DISPLAY_NAME = '雪云飞星';
const AUTHOR_TITLE = '汽车嵌入式软件高级架构师';
---

<div class="author-mini">
  <img src={AVATAR} alt={DISPLAY_NAME} class="mini-avatar" width="28" height="28" />
  <span class="mini-text">{DISPLAY_NAME} · {AUTHOR_TITLE}</span>
</div>

<style>
  .author-mini {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 0;
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    margin: 2rem 0 0;
  }

  .mini-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .mini-text {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }
</style>
```

- [x] **Step 2：构建确认无报错**

```bash
npm run build 2>&1 | tail -5
```

预期：含 `Finished`，无 `error`。

- [x] **Step 3：提交**

```bash
git add src/components/home/AuthorMini.astro
git commit -m "feat(chapter): add AuthorMini component for article page"
```

---

### Task 5：更新 index.astro

**Files:**
- Modify: `src/pages/index.astro`

- [x] **Step 1：在 frontmatter 中引入 AuthorSection**

在 `src/pages/index.astro` 的 frontmatter（`---` 之间）中，在现有 import 末尾添加：

```typescript
import AuthorSection from '../components/home/AuthorSection.astro';
```

- [x] **Step 2：删除 Hero 区的作者小字**

找到并删除以下两处内容：

HTML 部分（位于 hero-actions div 之后）：
```html
      <p class="hero-author">作者：雪云飞星</p>
```

CSS 部分（位于 `.hero-actions { ... }` 之后的样式块）：
```css
  .hero-author {
    margin-top: 1rem;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    opacity: 0.55;
  }
```

- [x] **Step 3：在大纲 section 末尾后引入 AuthorSection**

找到 `</BaseLayout>` 的前一个 `</section>`（即大纲 section 的关闭标签），在其后、`</BaseLayout>` 之前添加：

```astro
  <AuthorSection />
</BaseLayout>
```

完整的文件末尾结构应为：

```astro
    </div>
  </section>

  <AuthorSection />
</BaseLayout>
```

- [x] **Step 4：构建并验证**

```bash
npm run build 2>&1 | tail -5
```

预期：含 `Finished`，无 `error`。

- [x] **Step 5：启动 dev server 目测首页**

```bash
npm run dev
```

在浏览器打开 `http://localhost:4321`，确认：
- Hero 区不再有「作者：雪云飞星」小字
- 页面底部（课程大纲之后）出现作者区块，含圆形头像、姓名、职位、简介
- 访问量数字区域显示（可能需要数秒加载）

- [x] **Step 6：提交**

```bash
git add src/pages/index.astro
git commit -m "feat(home): integrate AuthorSection, remove hero-author byline"
```

---

### Task 6：更新 ChapterLayout.astro

**Files:**
- Modify: `src/components/layout/ChapterLayout.astro`

- [x] **Step 1：在 frontmatter 中引入 AuthorMini**

在 `src/components/layout/ChapterLayout.astro` 的 frontmatter 中，现有 import 末尾添加：

```typescript
import AuthorMini from '../home/AuthorMini.astro';
```

- [x] **Step 2：在文章正文与上下节导航之间插入 AuthorMini**

找到以下代码段：

```astro
      </main>

      {(prevArticle || nextArticle) && (
```

将其替换为：

```astro
      </main>

      <AuthorMini />

      {(prevArticle || nextArticle) && (
```

- [x] **Step 3：构建并验证**

```bash
npm run build 2>&1 | tail -5
```

预期：含 `Finished`，无 `error`。

- [x] **Step 4：目测文章页**

```bash
npm run dev
```

打开任意文章页（如 `http://localhost:4321/chapters/...`），确认：
- 文章正文下方、上下节导航之间出现一行精简作者信息（圆形小头像 + 「雪云飞星 · 汽车嵌入式软件高级架构师」）
- 上下节按钮正常显示，位置未错乱

- [x] **Step 5：提交**

```bash
git add src/components/layout/ChapterLayout.astro
git commit -m "feat(chapter): add AuthorMini between article content and nav"
```
