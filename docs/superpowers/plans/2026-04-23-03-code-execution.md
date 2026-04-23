# 子计划 3：代码执行（remark 插件 + CodeRunner）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠️ **注意：** 此文件为范围定义版本，执行前需补充每个 Task 的完整代码步骤。

**目标：** 让 Markdown 中的 ` ```rust runnable ` 代码块渲染为可运行的 CodeRunner 组件，调用 Rust Playground API 执行代码并展示输出；支持隐藏行（`# ` 前缀）的展开/折叠；支持 `expect-error` 模式红色高亮错误。

**架构：** remark 插件 `remark-rust-codeblock.mjs` 在构建时将特殊 fenced code block 转换为 HTML 自定义元素（`<code-runner>`），Astro 的 `client:load` 岛屿在运行时挂载 `CodeRunner.astro` 组件，调用 `src/lib/rust-playground.ts` 封装的 POST API。

**技术栈：** remark（unist/mdast）、Astro islands、Fetch API、Rust Playground REST API

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 新建 | `src/plugins/remark-rust-codeblock.mjs` | 解析 ` ```rust runnable ` 等标记，输出 HTML |
| 新建 | `src/lib/rust-playground.ts` | POST https://play.rust-lang.org/execute 封装 |
| 新建 | `src/components/code/CodeRunner.astro` | 只读可执行代码块（Monaco 只读 or `<pre>`），含运行/复制/展开按钮 |
| 修改 | `astro.config.mjs` | 注册 remark 插件 |
| 修改 | `src/content/chapters/01-getting-started/01-installation.md` | 添加 runnable 代码块示例 |
| 修改 | `src/content/chapters/02-ownership/01-ownership-rules.md` | 添加 runnable + expect-error 代码块示例 |

---

## 任务概要

### Task 1: 安装依赖

```bash
npm install unist-util-visit
```

（remark 和 mdast 类型已随 Astro 内置）

### Task 2: remark 插件 (remark-rust-codeblock.mjs)

解析规则：
- ` ```rust runnable ` → 生成 `<code-runner data-code="..." data-mode="run">`
- ` ```rust runnable expect-error ` → 生成 `<code-runner data-code="..." data-mode="expect-error">`
- ` ```rust ` (无标记) → 不处理，走 Astro 默认代码高亮

隐藏行处理：
- `# ` 前缀的行在 `data-hidden-lines` 属性中记录行号列表
- 完整代码（含隐藏行）放入 `data-code`
- 可见代码（去掉隐藏行）放入 `data-visible-code`

### Task 3: rust-playground.ts

```typescript
export interface PlaygroundResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

export async function executeCode(code: string): Promise<PlaygroundResult>
```

POST `https://play.rust-lang.org/execute` with `{ code, edition: "2021", mode: "debug", crateType: "bin" }`

### Task 4: CodeRunner.astro

功能要点：
- 展示可见代码（Prism/Shiki 高亮，或 `<pre>` 简单高亮）
- 有隐藏行时显示"展开/折叠"按钮
- 复制按钮（复制完整代码含隐藏行）
- 运行按钮 → 调用 rust-playground.ts → 输出区展开
- `expect-error` 模式：错误信息红色高亮 + "这是预期的编译错误"提示
- 运行中显示加载状态（spinner）

### Task 5: 注册插件 & 验证

修改 `astro.config.mjs`，在 `markdown.remarkPlugins` 中添加插件。
在两篇示例文章中添加 runnable 代码块，浏览器验证可执行。

---

## 验收标准

- [ ] 访问含 runnable 代码块的章节页，代码块显示运行按钮
- [ ] 点击运行 → 2-5 秒内显示 stdout 输出
- [ ] 含隐藏行的代码块显示"展开"按钮，点击后显示完整代码
- [ ] 复制按钮复制完整代码（含隐藏行）
- [ ] expect-error 模式：错误信息红色高亮
- [ ] `npx astro build` 0 errors
