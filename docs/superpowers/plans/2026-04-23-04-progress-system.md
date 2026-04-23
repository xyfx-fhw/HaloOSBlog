# 子计划 4：进度系统（localStorage + SectionProgress）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠️ **注意：** 此文件为范围定义版本，执行前需补充每个 Task 的完整代码步骤。

**目标：** 实现完整的学习进度追踪系统：文章内节段（H2）滚动完成检测、文章级状态聚合、全站进度百分比计算，以及学习进度页（`/progress`）的展示和重置功能。

**架构：** `src/lib/progress.ts` 提供所有进度读写接口（localStorage 实现，对外暴露统一 API 便于将来替换后端）；`SectionProgress.astro` 为客户端组件，消费 progress.ts 并监听 IntersectionObserver 标记 H2 完成；Navbar 右侧进度数字通过 `progress.ts` 计算；`/progress` 页展示树状进度并支持重置。

**技术栈：** localStorage、IntersectionObserver、Astro client:load islands

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 新建 | `src/lib/progress.ts` | 进度读写、状态计算、权重汇总接口 |
| 新建 | `src/components/ui/SectionProgress.astro` | 文章内 H2 tab 进度栏（client:load） |
| 新建 | `src/components/ui/ConfirmDialog.astro` | 全局重置确认弹窗（输入"全部重新学习"） |
| 修改 | `src/components/layout/Navbar.astro` | 右侧进度百分比从 localStorage 读取 |
| 修改 | `src/components/layout/ChapterLayout.astro` | 引入 SectionProgress |
| 修改 | `src/pages/chapters/[...slug].astro` | 向 SectionProgress 传入 headings/slug |
| 修改 | `src/pages/progress.astro` | 完整学习进度页实现 |

---

## 进度存储结构（spec 第九节）

```typescript
// localStorage key: "rust-tutorial-progress"
{
  articles: {
    "[slug]": {
      status: "completed" | "in-progress" | "not-started",
      sections: { "[h2-title]": boolean }
    }
  },
  exercises: { "[id]": { completed: boolean, attempts: number } },
  quizzes: { "[slug]": { score: number, completedAt: string } },
  certificate: { name: string, earnedAt: string } | null
}
```

## 任务概要

### Task 1: progress.ts 接口实现

按 spec 9.3 节实现所有导出函数：
- `getArticleStatus`, `markSectionRead`, `markArticleComplete`, `resetArticle`, `resetChapter`, `resetAll`
- `markExerciseComplete`, `saveQuizResult`, `resetExercise`, `resetQuiz`
- `getOverallProgress`, `getChapterProgress`
- `saveCertificateName`, `getCertificate`

进度权重：章节文章 60%、练习 20%、测验 20%

### Task 2: SectionProgress.astro

- 接收 `headings: MarkdownHeading[]` 和 `articleSlug: string`
- 每个 H2 渲染为 tab（灰色/绿色）
- IntersectionObserver 监测每个 H2 section 底部到达视口
- 到达时调用 `markSectionRead(slug, sectionTitle)` → 标绿
- 无 H2 时：监测页面滚动到底部 → 调用 `markArticleComplete(slug)`

### Task 3: Navbar 进度显示

从 localStorage 读取 `getOverallProgress()` 并更新 `#nav-progress` 元素。
初始值为 `⏱ 0%`（已在 Navbar 中占位），用 `<script>` 客户端更新。

### Task 4: /progress 页

- 顶部总进度条 + "全部重新学习"按钮
- 每章：章节进度条 + "重新学习"按钮
- 每篇文章：状态图标（✅/🔵/⬜）+ "重新学习"按钮（章节/总进度级别需确认弹窗）
- 完成度 ≥90% 时显示"🎉 领取证书"入口

### Task 5: ConfirmDialog.astro

全局弹窗组件：需输入"全部重新学习"文字才能激活确认按钮，防误操作。

---

## 验收标准

- [ ] 访问章节页，滚动到 H2 section 底部，该 tab 变绿
- [ ] 所有 tab 变绿后，侧边栏对应文章标记为已完成（绿色）
- [ ] Navbar 进度百分比实时更新
- [ ] `/progress` 展示各章各文章状态
- [ ] "全部重新学习"需输入确认文字才执行
- [ ] `npx astro build` 0 errors
