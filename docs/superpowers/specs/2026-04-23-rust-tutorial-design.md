# RUST 互动教程 — 需求设计文档

**日期**：2026-04-23  
**状态**：待审阅

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

---

## 三、目录结构

```
rust_course_web/
├── CLAUDE.md                          # 项目说明（所有回复和文档使用中文）
├── astro.config.mjs                   # Astro 配置，注册 remark 插件
├── package.json
├── tsconfig.json
│
├── public/
│   └── favicon.svg
│
├── src/
│   ├── content/                       # Astro Content Collections
│   │   ├── chapters/                  # 所有章节文章（Markdown）
│   │   │   ├── 01-getting-started/
│   │   │   │   ├── 00-index.md        # 父文章（有内容，也是章节入口）
│   │   │   │   ├── 01-installation.md
│   │   │   │   └── 02-hello-world.md
│   │   │   ├── 02-ownership/
│   │   │   │   ├── 00-index.md
│   │   │   │   ├── 01-ownership-rules.md
│   │   │   │   └── 02-borrowing.md
│   │   │   └── ...
│   │   ├── exercises/                 # 练习题配置（JSON）
│   │   │   ├── getting-started.json
│   │   │   ├── ownership.json
│   │   │   └── ...
│   │   └── quizzes/                   # 测验题配置（JSON）
│   │       ├── getting-started.json
│   │       ├── ownership.json
│   │       └── ...
│   │
│   ├── pages/
│   │   ├── index.astro                # 首页
│   │   ├── progress.astro             # 学习进度页
│   │   ├── certificate.astro          # 学习证书页
│   │   ├── chapters/
│   │   │   ├── index.astro            # 章节列表页
│   │   │   └── [...slug].astro        # 章节文档页（动态路由，支持多级）
│   │   ├── exercises/
│   │   │   └── [slug].astro           # 练习页
│   │   └── quiz/
│   │       └── [slug].astro           # 测验页
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BaseLayout.astro       # 基础布局（head、顶部导航、页脚）
│   │   │   ├── ChapterLayout.astro    # 章节页三栏布局
│   │   │   ├── Navbar.astro           # 顶部导航栏
│   │   │   ├── Sidebar.astro          # 左侧课程目录树
│   │   │   └── PageToc.astro          # 右侧页面内锚点目录
│   │   ├── code/
│   │   │   ├── CodeRunner.astro       # 只读可执行代码块
│   │   │   └── CodeEditor.astro       # 可编辑代码编辑器（练习用）
│   │   ├── quiz/
│   │   │   ├── QuizPage.astro         # 测验页主组件
│   │   │   ├── MultipleChoice.astro   # 选择题组件
│   │   │   └── CodingQuestion.astro   # 编码题组件（复用 CodeEditor）
│   │   └── ui/
│   │       ├── DifficultyBadge.astro  # 难度标签
│   │       ├── TimeEstimate.astro     # 预计时间
│   │       ├── KeywordTags.astro      # 关键词标签
│   │       ├── ProgressBar.astro      # 进度条
│   │       ├── SectionProgress.astro  # 文章内节段进度标签栏
│   │       ├── ConfirmDialog.astro    # 全局重置确认弹窗
│   │       └── Certificate.astro      # 证书展示组件
│   │
│   ├── lib/
│   │   ├── rust-playground.ts         # Rust Playground API 封装
│   │   ├── progress.ts                # 进度管理（localStorage + 预留接口）
│   │   └── content.ts                 # 内容读取工具函数
│   │
│   ├── plugins/
│   │   └── remark-rust-codeblock.mjs  # 解析 ```rust runnable 等特殊标记
│   │
│   └── styles/
│       └── global.css
│
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-23-rust-tutorial-design.md  # 本文档
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

### 6.1 只读可执行代码块（CodeRunner）

**功能：**
- Rust 语法高亮
- 复制按钮（复制完整代码含隐藏行）
- 展开/折叠隐藏行按钮
- 运行按钮（调用 Rust Playground API）
- 输出区域（点击运行后展开，显示 stdout / stderr）
- `expect-error` 模式：错误信息红色高亮，添加"这是预期的编译错误"提示

**代码执行 API：**
```
POST https://play.rust-lang.org/execute
Content-Type: application/json
Body: { "code": "...", "edition": "2021", "mode": "debug", "crateType": "bin" }
返回: { "success": true/false, "stdout": "...", "stderr": "..." }
```

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
RUST 互动教程    首页  开始学习  学习进度    ⏱ 38%
```

- Logo：文字 "RUST 互动教程"（RUST 全大写）
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
| Hero 区 | 课程名称、简介、"开始学习"按钮 |
| 继续学习卡片 | 上次学到哪里，"继续学习"快捷入口（有进度时显示） |
| 课程大纲预览 | 章节列表，每章显示难度、预计时间、完成状态 |
| 特性介绍 | 在线运行、可编辑练习、章节测验三大功能简介 |

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

项目根目录创建 `CLAUDE.md`，包含：
- 所有 AI 回复使用中文
- 编写文档、注释使用中文
- 项目概述和技术栈说明
