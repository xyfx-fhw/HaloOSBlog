# 子计划 5：练习与测验（Monaco Editor + 练习页 + 测验页）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠️ **注意：** 此文件为范围定义版本，执行前需补充每个 Task 的完整代码步骤。

**目标：** 实现可编辑代码练习页（Monaco Editor + Rust Playground 执行 + 测试验证）和章节测验页（选择题 + 编码题），并为第一章和第二章添加练习/测验示例数据。

**架构：** `CodeEditor.astro` 集成 Monaco Editor（CDN 加载），实现编辑→运行→测试验证流程；`exercises/[slug].astro` 从 JSON 读取练习题配置；`quiz/[slug].astro` 渲染选择题和编码题；`ChapterLayout.astro` 底部按钮在有对应 JSON 时显示"进入练习"/"进入测验"。

**技术栈：** Monaco Editor（CDN via esm.sh）、Rust Playground API、Astro Content Collections（JSON type）

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 新建 | `src/components/code/CodeEditor.astro` | Monaco 可编辑代码编辑器，含运行/重置/测试 |
| 新建 | `src/components/quiz/MultipleChoice.astro` | 选择题组件 |
| 新建 | `src/components/quiz/CodingQuestion.astro` | 编码题组件（复用 CodeEditor） |
| 新建 | `src/components/quiz/QuizPage.astro` | 测验页主组件 |
| 新建 | `src/pages/exercises/[slug].astro` | 练习页动态路由 |
| 新建 | `src/pages/quiz/[slug].astro` | 测验页动态路由 |
| 新建 | `src/content/exercises/getting-started.json` | 第一章练习题数据 |
| 新建 | `src/content/exercises/ownership.json` | 第二章练习题数据 |
| 新建 | `src/content/quizzes/getting-started.json` | 第一章测验题数据 |
| 新建 | `src/content/quizzes/ownership.json` | 第二章测验题数据 |
| 修改 | `src/content/config.ts` | 添加 exercises 和 quizzes collections 定义 |
| 修改 | `src/components/layout/ChapterLayout.astro` | 底部显示"进入练习"/"进入测验"按钮（有数据时） |
| 修改 | `src/pages/chapters/[...slug].astro` | 传入 hasExercise/hasQuiz 给 ChapterLayout |

---

## 练习题数据格式（spec 7.1）

```json
[{
  "id": "fix-mutability",
  "title": "修复可变性错误",
  "description": "...",
  "starterCode": "...",
  "tests": [
    { "type": "compiles", "description": "代码可以编译" },
    { "type": "stdout", "expected": "6", "description": "输出为 6" }
  ],
  "hint": "...",
  "solution": "..."
}]
```

## 测验题数据格式（spec 7.2）

```json
[
  { "type": "multiple-choice", "question": "...", "options": [...], "answer": 2, "explanation": "..." },
  { "type": "coding", "exerciseId": "fix-mutability" }
]
```

## 任务概要

### Task 1: Content Collections 配置扩展

在 `src/content/config.ts` 添加 `exercises` 和 `quizzes` collections（JSON type + zod schema）。

### Task 2: CodeEditor.astro

- Monaco Editor 通过 CDN 加载（esm.sh/monaco-editor）
- 支持 props：`starterCode`, `tests`
- 运行按钮 → Rust Playground API → 显示 stdout/stderr
- 重置按钮 → 恢复 starterCode
- 自动测试：compiles 类型检查 success，stdout 类型比对输出
- 测试结果逐条显示 ✅/❌

### Task 3: 练习页 (exercises/[slug].astro)

从 exercises collection 读取数据，渲染 CodeEditor + 题目描述 + 提示按钮 + 答案折叠。

### Task 4: 测验组件 (MultipleChoice, CodingQuestion, QuizPage)

- MultipleChoice：点击选项 → 即时反馈 + 解析
- CodingQuestion：复用 CodeEditor
- QuizPage：汇总得分，完成后调用 `saveQuizResult()`

### Task 5: 测验页 (quiz/[slug].astro)

动态路由，渲染 QuizPage。

### Task 6: 添加示例数据 & 更新 ChapterLayout

创建 getting-started.json 和 ownership.json 练习/测验数据。
ChapterLayout 底部在 hasExercise/hasQuiz 为 true 时显示跳转按钮。

---

## 验收标准

- [ ] `/exercises/getting-started` 显示练习题，Monaco 编辑器可用
- [ ] 提交代码 → 运行 → 测试结果逐条显示
- [ ] `/quiz/getting-started` 显示测验题
- [ ] 选择题选错 → 红色提示，选对 → 绿色 + 解析
- [ ] 章节文档页底部出现"进入练习"/"进入测验"按钮
- [ ] `npx astro build` 0 errors
