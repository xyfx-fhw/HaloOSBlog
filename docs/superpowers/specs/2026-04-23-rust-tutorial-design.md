# RUST 互动教程 — 需求设计文档

**日期**：2026-04-23  
**状态**：实现中（子计划 1–3 已完成，子计划 4–7 待实现）

| 子计划 | 内容 | 状态 |
|--------|------|------|
| 1 | 基础框架（Astro 配置、全局样式、首页骨架） | ✅ 完成 |
| 2 | 内容导航（章节布局、侧边栏、TOC、面包屑、前后页导航） | ✅ 完成 |
| 3 | 代码执行（runnable 代码块、Shiki 高亮、Playground API） | ✅ 完成 |
| 4 | 进度系统（localStorage 进度追踪、进度页） | ⬜ 待实现 |
| 5 | 练习与测验（Monaco Editor + 选择题 + 编码题） | ⬜ 待实现 |
| 6 | 交互式图解（SVG + JS 动画组件） | ⬜ 待实现 |
| 7 | 学习证书（jsPDF 导出） | ⬜ 待实现 |

---

## 一、项目背景

构建一个名为 **RUST 互动教程** 的网页教学平台，面向完全零基础的 Rust 学习者（即使有 C 语言背景，也从零开始讲解所有 Rust 概念）。核心目标是提供像官方 Rust Book 一样系统的讲解，同时加入在线代码执行、可编辑练习、章节测验等互动功能。

---

## 二、技术栈

| 项目 | 选型 | 说明 |
|------|------|------|
| 前端框架 | **Astro** | 内容优先，岛屿架构，最灵活 |
| 内容格式 | **Markdown + 自定义代码块标记** | 纯 Markdown 写内容，remark 插件解析特殊标记 |
| 代码编辑器 | **Monaco Editor** | VS Code 同款，支持 Rust 语法高亮 |
| 代码执行 | **Rust Playground API** | 公开 REST API，无需自建后端 |
| 进度存储 | **localStorage**（预留后端接口） | 当前纯本地，架构上预留接入后端的接口 |
| 样式 | **CSS（全局 + 组件级）** | 无 UI 框架依赖 |

---

## 二·五、视觉风格

**整体基调**：深色沉浸风，简洁不复杂，类似 ngrok blog 的气质。

| 属性 | 值 |
|------|-----|
| 页面背景 | `#0D0D0F`（近黑） |
| 内容区背景 | `#111114` |
| 代码块背景 | `#1A1A1E` |
| 主题色（强调/链接/按钮） | Rust 橙 `#CE412B` |
| 主要文字 | `#E8E8E8` |
| 次要文字 | `#888890` |
| 中文字体 | `Noto Sans SC`（优先）/ `PingFang SC` / `微软雅黑` |
| 英文 / 代码字体 | `Inter`（正文）/ `JetBrains Mono`（代码） |
| 内容最大宽度 | `720px`（文章正文），居中，不撑满全宽 |

**页面顶部动态光晕背景（两层）：**

**全局层（`BaseLayout` 共享）：** `.page-bg` 固定在页面顶部，高度 640px，包含三个径向渐变色块，带 `hue-rotate` + `scale` 动画，各自独立周期（10s / 13s / 16s），产生彩色极光感：

- 光晕 1：Rust 橙红 `rgba(220, 60, 30, 0.60)`，顶部居中
- 光晕 2：青蓝 `rgba(20, 160, 200, 0.55)`，左上角
- 光晕 3：紫 `rgba(150, 40, 220, 0.50)`，右上角

**首页 Hero 专属层：** Hero `<section>` 内的绝对定位层（`overflow: hidden`），包含三个径向渐变模糊色块（filter: blur 80px），做缓慢漂浮动画（translateX/Y + 轻微 scale），周期分别为 18s / 22s / 15s：

- 光晕 1：Rust 橙 `rgba(206, 65, 43, 0.22)`，居中偏右上
- 光晕 2：暖琥珀 `rgba(217, 119, 6, 0.15)`，左上角
- 光晕 3：深蓝紫 `rgba(99, 55, 180, 0.12)`，右下角

随 Hero 区结束消失，不影响下方内容。

---

## 三、目录结构

> ✅ = 已创建，⬜ = 计划中（尚未实现）

```
rust_course_web/
├── .claude/
│   └── CLAUDE.md                          ✅ 项目说明（AI 回复和文档使用中文）
├── astro.config.mjs                       ✅ 注册 remark-rust-codeblock 插件
├── package.json / package-lock.json       ✅
├── tsconfig.json                          ✅
│
├── public/
│   └── favicon.svg                        ✅
│
├── src/
│   ├── content/                           # Astro Content Collections
│   │   ├── config.ts                      ✅ chapters collection 定义
│   │   └── chapters/                      ✅ 所有章节文章（Markdown）
│   │       ├── 00-preface/
│   │       │   └── 00-index.md            ✅
│   │       ├── 01-getting-started/
│   │       │   ├── 00-index.md            ✅
│   │       │   ├── 01-installation.md     ✅
│   │       │   └── 02-hello-world.md      ✅
│   │       └── 02-ownership/
│   │           ├── 00-index.md            ✅
│   │           ├── 01-ownership-rules.md  ✅（含 runnable 代码块示例）
│   │           └── 02-borrowing.md        ✅
│   │   ├── exercises/                     ⬜ 练习题配置（JSON）—— 子计划 5
│   │   └── quizzes/                       ⬜ 测验题配置（JSON）—— 子计划 5
│   │
│   ├── pages/
│   │   ├── index.astro                    ✅ 首页（Hero + 课程目录 + 进度点占位）
│   │   ├── progress.astro                 ✅ 学习进度页（占位，子计划 4 实现）
│   │   ├── certificate.astro              ✅ 学习证书页（占位，子计划 7 实现）
│   │   └── chapters/
│   │       ├── index.astro                ✅ 重定向至 /#outline
│   │       └── [...slug].astro            ✅ 章节文档页（动态路由，三栏布局）
│   │   ├── exercises/
│   │   │   └── [slug].astro               ⬜ 练习页 —— 子计划 5
│   │   └── quiz/
│   │       └── [slug].astro               ⬜ 测验页 —— 子计划 5
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BaseLayout.astro           ✅ 基础布局（head、全局 page-bg 动画）
│   │   │   ├── ChapterLayout.astro        ✅ 章节页三栏布局（含 CodeRunner 挂载）
│   │   │   ├── Navbar.astro               ✅ 顶部导航（logo、链接、进度显示占位）
│   │   │   ├── Footer.astro               ✅ 页脚（作者信息、版权年份）
│   │   │   ├── Sidebar.astro              ✅ 左侧课程目录（可折叠章节）
│   │   │   └── PageToc.astro              ✅ 右侧页内目录（IntersectionObserver 追踪）
│   │   ├── code/
│   │   │   ├── CodeRunner.astro           ✅ 只读可执行代码块（含工具栏状态区）
│   │   │   └── CodeEditor.astro           ⬜ 可编辑代码编辑器 —— 子计划 5
│   │   ├── quiz/                          ⬜ 测验组件 —— 子计划 5
│   │   │   ├── QuizPage.astro
│   │   │   ├── MultipleChoice.astro
│   │   │   └── CodingQuestion.astro
│   │   ├── diagrams/                      ⬜ 交互式图解组件 —— 子计划 6
│   │   └── ui/                            ⬜ 通用 UI 组件 —— 子计划 4+
│   │       ├── ProgressBar.astro
│   │       ├── ConfirmDialog.astro
│   │       └── Certificate.astro
│   │
│   ├── lib/
│   │   ├── rust-playground.ts             ✅ Rust Playground API 封装
│   │   ├── content.ts                     ✅ 导航树构建（buildNavTree / getFlatArticleList）
│   │   └── progress.ts                    ⬜ 进度管理接口 —— 子计划 4
│   │
│   ├── plugins/
│   │   └── remark-rust-codeblock.mjs      ✅ 解析 rust runnable / expect-error 标记
│   │
│   └── styles/
│       └── global.css                     ✅ CSS 变量、排版（.prose）、动画
│
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-04-23-rust-tutorial-design.md   # 本文档
        └── plans/
            ├── 2026-04-23-01-foundation.md           ✅
            ├── 2026-04-23-02-content-navigation.md   ✅
            ├── 2026-04-23-03-code-execution.md       ✅
            ├── 2026-04-23-04-progress-system.md      ⬜
            ├── 2026-04-23-05-quiz-exercises.md       ⬜
            ├── 2026-04-23-06-interactive-diagrams.md ⬜
            └── 2026-04-23-07-certificate.md          ⬜
```

---

## 四、内容组织

### 4.1 目录结构即层级结构

不使用独立的 `toc.json`，直接用文件系统目录结构表达层级关系：

- **目录** = 章节容器（如 `01-getting-started/`）
- **`00-index.md`** = 该目录的父文章（有内容，也作为章节入口页）
- **其他 `.md` 文件** = 子文章（如 `01-installation.md`）
- **数字前缀**（`01-`、`02-`）控制排列顺序，渲染时剥离不显示
- **显示名称**来自每篇文章 frontmatter 的 `title` 字段
- `content.ts` 工具函数递归扫描目录树，按数字前缀排序后构建导航数据

**示例结构：**

```text
chapters/
  01-getting-started/
    00-index.md          → 显示：认识 Rust（父文章）
    01-installation.md   → 显示：安装 Rust
    02-hello-world.md    → 显示：Hello, World!
  02-ownership/
    00-index.md          → 显示：所有权系统（父文章）
    01-ownership-rules.md → 显示：所有权规则
    02-borrowing.md      → 显示：借用与引用
```

**调整顺序**：重命名数字前缀即可，无需维护额外配置文件。

### 4.2 章节 Markdown frontmatter

```yaml
---
title: "安装 Rust"
description: "学习如何在不同操作系统上安装 Rust 工具链"
difficulty: beginner        # beginner / intermediate / advanced
estimatedTime: 15           # 预计学习时间（分钟）
keywords: ["安装", "rustup", "环境配置"]
---
```

---

## 五、代码块标记规则（方案 B）

remark 插件 `remark-rust-codeblock.mjs` 解析以下标记并转换为对应组件：

| 标记 | 渲染结果 |
|------|----------|
| ` ```rust ` | 普通代码展示，无交互 |
| ` ```rust runnable ` | 只读可执行代码块，含运行按钮 |
| ` ```rust runnable expect-error ` | 只读可执行，预期报错，错误信息红色高亮 |

**隐藏行语法**（沿用官方 Rust Book 惯例）：

````md
```rust runnable
# fn main() {
    let x = 5;
    println!("{}", x);
# }
```
````

- `# ` 前缀的行默认隐藏
- 右上角显示"展开"按钮，点击后显示完整代码，按钮变为"折叠"
- 复制按钮始终复制完整代码（含隐藏行）

---

## 五·五、交互式图解组件

### 概述

文档中用于解释 Rust 概念的示意图（内存布局、所有权转移、借用检查等）支持制作为**可交互的网页组件**，取代静态图片。用户可以通过点击、拖拽、切换状态等方式直观理解概念。

### Markdown 引用语法

在 Markdown 中用特殊代码块标记引用图解组件，由 `remark-rust-codeblock.mjs` 插件统一解析：

````md
```diagram
component: OwnershipMove
props:
  from: s1
  to: s2
```
````

### 内置图解组件清单

组件存放在 `src/components/diagrams/` 目录：

| 组件名 | 用途 | 交互方式 |
|--------|------|----------|
| `OwnershipMove` | 所有权转移（s1 → s2 内存示意） | 点击"执行移动"按钮，动态演示 s1 失效、s2 接管 |
| `BorrowRef` | 不可变借用（多个 &T 共存） | 点击创建/销毁借用，观察借用计数变化 |
| `BorrowMut` | 可变借用（&mut T 排他性） | 尝试同时创建两个可变借用，触发冲突提示 |
| `StackHeap` | 栈与堆内存布局 | 滑动演示变量分配到栈/堆的过程 |
| `LifetimeScope` | 生命周期作用域 | 高亮显示变量的有效范围，拖动改变作用域边界 |
| `StringSlice` | String vs &str 内存关系 | 点击选择不同切片范围，显示 ptr/len 变化 |

### 技术实现

- 每个组件为独立的 `.astro` 文件，内嵌 `<style>` 和 `<script>`
- 使用纯 HTML/CSS + JavaScript 实现（无需 D3 等重库）
- 支持通过 `props` 传入参数定制初始状态
- 组件可复用，同一组件可在不同章节以不同 props 出现

### 目录结构补充

```
src/components/diagrams/
  OwnershipMove.astro
  BorrowRef.astro
  BorrowMut.astro
  StackHeap.astro
  LifetimeScope.astro
  StringSlice.astro
```

---

## 六、交互组件规格

### 6.1 只读可执行代码块（CodeRunner）✅ 已实现

**功能（已实现）：**

- Shiki 语法高亮（github-dark 主题，服务端构建时生成）
- 工具栏布局：`[状态区（左，flex:1）] [▶ 运行] [展开] [复制]`
- **状态区**：执行中显示 `⏳ 执行中...`；`expect-error` 成功显示 `✓ 这是预期的编译错误`；失败显示 `⚠️` 或 `✗` 提示
- 展开/折叠隐藏行按钮（有隐藏行时显示）；展开后保持语法高亮
- 复制按钮（始终复制含隐藏行的完整代码）
- 输出区域（点击运行后展开，显示 stdout / stderr）
- `expect-error` 模式：编译失败为预期结果，详细 stderr 在输出区展示

**隐藏行技术方案：**

- remark 插件在构建时用 Shiki 高亮完整代码，存入 `<div class="code-runner-full-hl" hidden>` 隐藏 div
- 客户端展开时直接读取该 div 的 innerHTML，无编解码开销
- `rehypeShiki` 在 `rehypeRaw` 之前执行，故不会二次处理 raw HTML，隐藏 div 安全透明

**代码执行 API（已修正）：**

```
POST https://play.rust-lang.org/execute
Content-Type: application/json
Body: {
  "code": "...",
  "channel": "stable",
  "edition": "2021",
  "mode": "debug",
  "crateType": "bin",
  "tests": false,
  "backtrace": false
}
返回: { "success": true/false, "stdout": "...", "stderr": "..." }
```

> ⚠️ `channel`、`tests`、`backtrace` 为必填字段，缺少会导致 400 错误。超时设置 15 秒。

**CSS 注意事项：**

- `.code-runner .code-runner-pre`（优先级 0-2-0）需显式覆盖 `.prose pre`（优先级 0-1-1）的 `margin-bottom`，否则代码区下方出现空白。

### 6.2 可编辑代码编辑器（CodeEditor）

**功能：**
- Monaco Editor，Rust 语法高亮
- 运行按钮
- 重置按钮（恢复 `starterCode`）
- 输出区域（stdout / stderr 分开展示）
- 测试结果区域（逐条显示通过/失败）

### 6.3 节段进度标签栏（SectionProgress）

文章页正文上方的横向标签栏，每个 tab 对应文章内一个 H2 小节。

**显示条件：** 仅当文章包含 H2 标题时渲染；若文章无 H2，直接展示正文内容，不显示标签栏。

**状态与颜色：**

| 状态 | 颜色 | 触发条件 |
|------|------|----------|
| 未学习 | 灰色 | 默认 |
| 已完成 | 绿色 | 该 H2 小节内容被滚动到底部 |

**文章级状态（由 H2 tab 状态聚合）：**

| 文章状态 | 颜色 | 条件 |
|----------|------|------|
| 未开始 | 灰色 | 无任何 tab 绿色 |
| 学习中 | 黄色 | 至少一个 tab 绿色，但未全绿 |
| 已完成 | 绿色 | 所有 tab 均为绿色 |
| 无 H2 文章 | 绿色 | 页面滚动到底部时直接完成 |

**标签栏导航（上一节 / 下一节）：**

- "上一节"和"下一节"按钮在**标签栏层级**导航，而非文章层级
- 点击"下一节"：跳到当前文章的下一个 tab；若已是最后一个 tab，则跳到下一篇文章的第一个 tab
- 点击"上一节"：跳到当前文章的上一个 tab；若已是第一个 tab，则跳到上一篇文章的最后一个 tab
- 第一篇文章的第一个 tab：隐藏"上一节"按钮
- 最后一篇文章的最后一个 tab：隐藏"下一节"按钮
- 无 H2 的文章：以整篇文章为一个导航单元，正常显示上一节/下一节

**章节文档页底部按钮：** 同样遵循上述 tab 级导航规则，"进入练习"和"进入测验"仅在该章节配置了对应 exercises.json / quiz.json 时显示，否则隐藏。

---

## 七、练习题与测验题格式

### 7.1 exercises.json

```json
[
  {
    "id": "fix-mutability",
    "title": "修复可变性错误",
    "description": "下面的代码无法编译，请找出问题并修复",
    "starterCode": "fn main() {\n    let x = 5;\n    x = 6;\n    println!(\"{}\", x);\n}",
    "tests": [
      { "type": "compiles", "description": "代码可以成功编译" },
      { "type": "stdout", "expected": "6", "description": "输出结果为 6" }
    ],
    "hint": "Rust 变量默认不可变，需要 mut 关键字",
    "solution": "fn main() {\n    let mut x = 5;\n    x = 6;\n    println!(\"{}\", x);\n}"
  }
]
```

### 7.2 quiz.json

```json
[
  {
    "type": "multiple-choice",
    "question": "Rust 中声明可变变量需要使用哪个关键字？",
    "options": ["var", "mut", "let mut", "mutable"],
    "answer": 2,
    "explanation": "使用 let mut x = 5; 声明可变变量"
  },
  {
    "type": "coding",
    "exerciseId": "fix-mutability"
  }
]
```

---

## 八、页面设计

### 8.1 顶部导航栏（全站共用）

```
RUST 互动教程    首页  教程    ⏱ 38%
```

- Logo：文字 "RUST 互动教程"（RUST 全大写）
- "教程"：点击跳转至上次阅读的文章（读取 `rust-tutorial-last-visited` localStorage key）；无记录时跳转至第一章；在章节文档页时高亮激活
- 右侧：整体学习进度百分比

### 8.2 章节文档页（三栏布局）

```
┌─────────────────────────────────────────────────────────┐
│  顶部导航栏                                               │
├──────────────┬──────────────────────────┬───────────────┤
│ 课程目录树   │ 面包屑：首页 / Rust基础 / 安装 Rust        │
│              │                          │ 目录          │
│ 第1章 ▼     │ # 安装 Rust               │               │
│  1.1 安装   │ 学习如何在不同操作系统...  │ 速览          │
│  1.2 Hello  │ ⏱15分钟  初级  安装  rustup│ Rustup 简介  │
│ 第2章 ▶     │                          │   什么是Rustup│
│              │ [速览✅|Rustup✅|安装步骤|] │ 安装步骤      │
│              │                          │ 验证安装      │
│              │ 正文内容...               │               │
│              │                          │               │
│              │ ← 上一节    下一节 →      │               │
│              │ [进入练习]  [进入测验]    │               │
└──────────────┴──────────────────────────┴───────────────┘
```

### 8.3 首页模块

| 模块 | 内容 |
|------|------|
| Hero 区 | 课程名称、简介、"开始学习"按钮（→ 上次阅读文章，无记录则第一章），背景有动态光晕 |
| 课程目录（完整目录） | 全课程章节 + 文章完整列表，`id="outline"`，每章可作为锚点直链 |
| 继续学习卡片 | 上次学到哪里，"继续学习"快捷入口（有进度时显示，待实现） |

**课程目录每行布局（一级章节与二级文章结构相同）：**

```
[链接区（flex 列）                                    ] [进度圆圈] [↺悬停显示]
  编号  标题  难度标签  ⏱ 时间           ← 主行
  描述文字...  [关键词] [关键词]          ← 副行（描述缩进对齐标题）
```

- 编号：章节用 `01`（等宽加粗灰色），文章用 `1.1`（小号等宽）
- 难度标签：入门（绿）/ 进阶（橙）/ 高级（红），取自各文章 frontmatter
- 进度圆圈：右侧空心圆，`data-slug` 属性预留给进度系统，悬停后显示 `↺ 重置进度` 按钮
- 一级目录标题颜色 `#E8E8E8`（全亮），文章标题 `rgba(232,232,232,0.78)`（略暗），描述 `--color-text-muted`，形成清晰层次

### 8.4 学习进度页（`/progress`）

展示全课程的学习状态，支持精细化进度管理。

**页面结构：**

```
总进度：███████░░░ 72%    [全部重新学习]

第1章：Rust 基础          ████████░░ 80%   [重新学习]
  1.1 安装 Rust           ✅ 已完成         [重新学习]
  1.2 Hello, World!       ✅ 已完成         [重新学习]
  1.3 变量与可变性         🔵 进行中         [重新学习]
  1.4 控制流              ⬜ 未开始

第2章：所有权系统          ██░░░░░░░░ 20%   [重新学习]
  ...
```

**重置规则：**

| 操作 | 触发方式 | 确认要求 |
|------|----------|----------|
| 重置单节进度 | 点击节旁的"重新学习" | 无需确认，直接重置 |
| 重置整章进度 | 点击章旁的"重新学习" | 无需确认，直接重置 |
| 重置全部进度 | 点击页面顶部"全部重新学习" | 弹出确认框，需手动输入"全部重新学习"文字后方可执行 |

**证书入口：** 完成度 ≥90% 时，页面顶部显示"🎉 领取证书"按钮，跳转至 `/certificate`。

### 8.5 学习证书页（`/certificate`）

**解锁条件：** 整体学习进度 ≥90%，未达到时访问该页面显示进度不足提示。

**证书内容：**
- 课程名称：RUST 互动教程
- 学员姓名（用户首次领取时填写，保存到 localStorage）
- 完成日期（自动取当前日期）
- 完成度百分比

**下载功能：**
- "下载 PDF"按钮，使用 `jsPDF` 库在客户端生成 PDF，无需后端
- **网页展示**：深色背景 + 橙色装饰（与全站风格一致）
- **PDF 导出**：浅色背景版本（白底黑字 + 橙色装饰），避免打印深色背景消耗墨水

---

## 九、进度系统

### 9.1 存储结构（localStorage）

```typescript
// key: "rust-tutorial-progress"
{
  // 文章级进度（每篇 .md 文件）
  articles: {
    "getting-started/installation": {
      status: "completed" | "in-progress" | "not-started",
      // 各 H2 小节的完成状态（无 H2 则此字段为空对象）
      sections: {
        "速览": true,
        "安装步骤": true,
        "验证安装": false
      }
    }
  },
  exercises: {
    "fix-mutability": { completed: true, attempts: 3 }
  },
  quizzes: {
    "getting-started": { score: 80, completedAt: "2026-04-23T10:00:00Z" }
  },
  // 证书信息（解锁后首次填写姓名时写入）
  certificate: {
    name: "张三",
    earnedAt: "2026-04-23T10:00:00Z"
  } | null
}
```

**文章 status 派生规则：**
- `sections` 全部为 `true` → `"completed"`
- 至少一个为 `true` → `"in-progress"`
- 全部为 `false` 或 `sections` 为空对象且未滚动到底 → `"not-started"`
- 无 H2 的文章：页面滚动到底部时直接置为 `"completed"`

### 9.2 进度计算权重

总进度百分比由三类内容加权计算：

| 类型 | 权重 | 计算方式 |
|------|------|----------|
| 章节文章 | 60% | 已完成文章数 / 总文章数 × 60 |
| 练习 | 20% | 已完成练习数 / 总练习数 × 20 |
| 测验 | 20% | 已完成测验数 / 总测验数 × 20 |

### 9.3 接口设计（progress.ts）

所有进度读写通过统一接口，便于将来替换为后端 API：

```typescript
// 文章 & 章节进度
export function getArticleStatus(slug: string): "completed" | "in-progress" | "not-started"
export function markSectionRead(articleSlug: string, sectionTitle: string): void
export function markArticleComplete(slug: string): void  // 用于无 H2 文章
export function resetArticle(slug: string): void
export function resetChapter(chapterSlug: string): void  // 重置整章所有文章
export function resetAll(): void

// 练习 & 测验
export function markExerciseComplete(id: string, attempts: number): void
export function saveQuizResult(slug: string, score: number): void
export function resetExercise(id: string): void
export function resetQuiz(slug: string): void

// 总进度
export function getOverallProgress(): number  // 返回 0-100（加权百分比）
export function getChapterProgress(chapterSlug: string): number

// 证书
export function saveCertificateName(name: string): void
export function getCertificate(): { name: string; earnedAt: string } | null
```

---

## 十、CLAUDE.md 说明

项目指令文件位于 `.claude/CLAUDE.md`（Astro 项目根目录），包含：

- 所有 AI 对话回复使用中文
- 代码注释、文档（README、设计文档、计划文档等）使用中文
- 代码标识符（变量名、函数名、文件名）保持英文惯例
- 项目概述和技术栈说明
