# 作者简介与访问量统计 — 设计文档

日期：2026-04-27

## 背景

当前首页 Hero 区仅有一行极小的「作者：雪云飞星」文字，缺乏作者信息展示；
文章页也没有任何作者身份呈现。同时站点无任何访问量统计。
本次需求新增两项轻量功能：

1. **访问量统计**：接入不蒜子（busuanzi），展示累计 PV，显示在首页作者区底部不显眼处。
2. **作者简介**：首页底部详细版 + 文章页上下节导航之间精简版。

---

## 一、资源文件迁移

| 当前路径 | 新路径 | 说明 |
|----------|--------|------|
| `logo.svg`（项目根） | `public/images/logo.svg` | Astro `public/` 下静态资源原样输出，引用路径 `/images/logo.svg` |

迁移后删除项目根目录的 `logo.svg`。

---

## 二、访问量统计（不蒜子）

### 接入方式

在 `src/components/layout/BaseLayout.astro` 的 `<head>` 中追加：

```html
<script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
```

### 展示位置

仅在首页 `AuthorSection.astro` 底部，用极小字号（`0.7rem`）灰色展示：

```
本站累计访问 · <span id="busuanzi_value_site_pv"></span> 次
```

外层容器使用不蒜子内置的 `id="busuanzi_container_site_pv"`，脚本未加载时自动隐藏，不影响页面布局。

### 不展示在文章页

文章页的 `AuthorMini` 不展示访问量，避免干扰阅读。

---

## 三、`AuthorSection.astro`（首页详细版）

### 文件位置

`src/components/home/AuthorSection.astro`

### 引入位置

`src/pages/index.astro`：在课程大纲 `<section class="outline">` 之后引入，同时移除现有 Hero 区的 `<p class="hero-author">` 小字。

### 布局

水平卡片，最大宽 860px（与大纲保持对齐）：

```
┌─────────────────────────────────────────────────────┐
│ [头像 80px 圆形]  雪云飞星                            │
│                  付皓文                              │
│                  汽车嵌入式软件高级架构师               │
│                                                     │
│                  专注嵌入式安全与 Rust 工程实践，        │
│                  这套教程是对 Rust 落地的一次尝试。      │
│                                                     │
│                  本站累计访问 · ··· 次（淡色极小字）    │
└─────────────────────────────────────────────────────┘
```

### 样式规范

- 上边距：`4rem`，下边距：`3rem`
- 顶部一条 `1px solid var(--color-border)` 分隔线
- 背景透明，无卡片感，融入页面
- 头像：`border-radius: 50%`，`80px × 80px`，轻描边 `1px solid var(--color-border)`
- 姓名 `雪云飞星`：`1rem`，`font-weight: 600`
- 副名 `付皓文`：`0.8rem`，`color: var(--color-text-muted)`
- 职位：`0.85rem`，`color: var(--color-accent)`
- 简介：`0.875rem`，`color: var(--color-text-muted)`，行高 1.7
- 访问量：`0.7rem`，`color: var(--color-text-muted)`，`opacity: 0.45`

---

## 四、`AuthorMini.astro`（文章页精简版）

### 文件位置

`src/components/home/AuthorMini.astro`

### 引入位置

`src/components/layout/ChapterLayout.astro`：插入上下节 `<nav class="article-nav">` 之前。

### 布局

单行居中，两条细线围住：

```
─────────────────────────────────────────────────────
  [头像 28px]  雪云飞星 · 汽车嵌入式软件高级架构师
─────────────────────────────────────────────────────
```

### 样式规范

- 上下各一条 `1px solid var(--color-border)` 分隔线，`padding: 0.875rem 0`
- 内容居中，`display: flex; align-items: center; justify-content: center; gap: 0.5rem`
- 头像：`28px × 28px`，`border-radius: 50%`
- 文字：`0.8rem`，`color: var(--color-text-muted)`
- 不展示访问量、不展示简介文字

---

## 五、文件变更汇总

| 操作 | 文件 |
|------|------|
| 移动 | `logo.svg` → `public/images/logo.svg` |
| 修改 | `src/components/layout/BaseLayout.astro`（`<head>` 追加不蒜子 script） |
| 新建 | `src/components/home/AuthorSection.astro` |
| 新建 | `src/components/home/AuthorMini.astro` |
| 修改 | `src/pages/index.astro`（引入 AuthorSection，删除 `.hero-author` 段落及其样式） |
| 修改 | `src/components/layout/ChapterLayout.astro`（在 article-nav 前引入 AuthorMini） |

---

## 六、作者信息常量

| 字段 | 值 |
|------|----|
| 笔名 | 雪云飞星 |
| 原名 | 付皓文 |
| 职位 | 汽车嵌入式软件高级架构师 |
| 头像 | `/images/logo.svg` |
| 简介 | 专注嵌入式系统安全与 Rust 工程实践，这套教程是对 Rust 在工业领域落地的一次尝试。 |

---

## 七、不做的事

- 不添加作者社交链接（保持克制）
- 不在文章页展示访问量
- 不新建全站 Footer 组件（避免过度设计）
- 不对 logo.svg 做图像处理或转换格式
