# 子计划 5：练习文章（测验 + 可编辑代码）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 在现有章节 Markdown 体系内，新增「练习文章」类型；练习文章与教程文章同级（例如 1.3 紧跟 1.2 之后），标题以 `练习：...` 命名；文章内支持三种新代码块：`quiz single`（单选题）、`quiz multi`（多选题）、`rust editable`（可编辑可运行代码）；多个 H1 自动构成标签页（复用现有 `SectionProgress`）。

**架构：** 扩展 `remark-rust-codeblock.mjs` 解析三种新标记，转换为带 `data-*` 属性的占位 `<div>`；新增 `QuizChoice.astro`、`CodeEditor.astro` 两个全局组件，在 `ChapterLayout.astro` 挂载，在客户端扫描页面并水合（hydrate）所有占位 div；Monaco 通过 jsdelivr 的 AMD loader 懒加载；练习题内容写在普通 Markdown 文件里（如 `src/content/chapters/01-getting-started/03-practice.md`），自动走现有动态路由、侧栏编号、进度追踪。

**技术栈：** Astro Content Collections（现有 chapters）、remark 插件（扩展）、Monaco Editor（CDN AMD loader）、Rust Playground API（现有 `executeCode`）。

**与 spec §7 的差异：** 本计划放弃了 spec §7.1 / §7.2 提出的独立 `exercises/` 与 `quizzes/` collection + 独立动态路由方案，改为「练习即章节文章」的内联方案。实现完成后，spec §7 与 §3 目录树中的 `exercises/`、`quizzes/`、`/exercises/[slug]`、`/quiz/[slug]` 条目会变为废弃；本计划末尾包含一个同步修订 spec 的任务。

**内容作者速查（实现后可用的 Markdown 写法）：**

- 单选题：
````md
```quiz single
Q: Rust 中声明可变变量需要使用哪个关键字？
- var
+ mut
- let
- mutable
E: Rust 变量默认不可变，使用 `mut` 关键字声明可变变量，如 `let mut x = 5;`。
```
````

- 多选题：
````md
```quiz multi
Q: 以下哪些关于 Rust 的说法是正确的？
+ Rust 变量默认不可变
- Rust 使用垃圾回收管理内存
+ Rust 在编译期进行借用检查
- Rust 不支持泛型
E: Rust 没有 GC，它用所有权系统在编译期保证内存安全。
```
````

- 可编辑代码：
````md
```rust editable
fn main() {
    let x = 5;
    x = 6;
    println!("{}", x);
}
```
````

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 修改 | `src/plugins/remark-rust-codeblock.mjs` | 扩展：解析 `quiz single` / `quiz multi` / `rust editable` 三种新代码块 |
| 新建 | `src/components/quiz/QuizChoice.astro` | 全局组件：客户端水合所有 `.quiz-choice`（单选 + 多选），含交互与样式 |
| 新建 | `src/components/code/CodeEditor.astro` | 全局组件：客户端水合所有 `.code-editor`（Monaco 懒加载 + 运行 + 重置），含样式 |
| 修改 | `src/components/layout/ChapterLayout.astro` | 在 `<CodeRunner />` 同层挂载 `<QuizChoice />` 与 `<CodeEditor />` |
| 新建 | `src/content/chapters/01-getting-started/03-practice.md` | 第一章练习文章（标题：`练习：入门基础`） |
| 新建 | `src/content/chapters/02-ownership/03-practice.md` | 第二章练习文章（标题：`练习：所有权与借用`） |
| 修改 | `docs/superpowers/specs/2026-04-23-rust-tutorial-design.md` | 同步：将 §7 与 §3 目录树中的 exercises/quizzes 独立方案标注为已废弃，改用本计划的练习文章方案 |

---

## DSL 规范（由 remark 插件解析）

### `quiz single` / `quiz multi`

一个以换行分隔的极简 DSL：

| 行前缀 | 含义 |
|--------|------|
| `Q:` | 题干（单行；可含中英文标点） |
| `-` (后跟空格) | 一个选项，表示**错误**答案 |
| `+` (后跟空格) | 一个选项，表示**正确**答案 |
| `E:` | 解析（可选；单行） |

解析规则：
1. 按行遍历；空行忽略；其他前缀的行忽略（容错）。
2. `Q:` 与 `E:` 各自仅取第一次出现；去掉前缀与前导空白后作为字符串。
3. 选项按遇到顺序编号 0、1、2、...；`+` 表示正确。`single` 模式如果出现 0 个或 >1 个 `+`，报错；`multi` 模式如果出现 0 个 `+`，报错。
4. 错误时：插件在构建期抛出 `Error(信息 + 代码块起始行号)`，让构建失败——不在前端静默容错。

### `rust editable`

内容即 starter code（与 `rust runnable` 相同格式，但**不**支持 `# ` 隐藏行惯例——可编辑代码块里隐藏行没有意义；遇到 `# ` 开头的行原样保留，不做剥离）。

---

## Task 1: 扩展 remark 插件解析 quiz + editable 代码块

**Files:**
- Modify: `src/plugins/remark-rust-codeblock.mjs`

- [ ] **Step 1: 新增 `parseQuiz(code, kind, lineNo)` 辅助函数**

在 `parseCodeLines` 函数之下插入：

```js
/**
 * 解析 ```quiz single | ```quiz multi 代码块的 DSL。
 *
 * @param {string} code - 代码块原始内容
 * @param {'single' | 'multi'} kind - 题目类型
 * @param {number} lineNo - 代码块在源文件中的起始行号（用于错误信息）
 * @returns {{ question: string, options: string[], correct: number[], explanation: string }}
 */
function parseQuiz(code, kind, lineNo) {
  const lines = code.split('\n');
  let question = '';
  let explanation = '';
  const options = [];
  const correct = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === '') continue;
    if (line.startsWith('Q:')) {
      if (question === '') question = line.slice(2).trim();
      continue;
    }
    if (line.startsWith('E:')) {
      if (explanation === '') explanation = line.slice(2).trim();
      continue;
    }
    if (line.startsWith('+ ')) {
      correct.push(options.length);
      options.push(line.slice(2).trim());
      continue;
    }
    if (line.startsWith('- ')) {
      options.push(line.slice(2).trim());
      continue;
    }
    // 其他行静默忽略
  }

  if (question === '') {
    throw new Error(`quiz 代码块缺少 "Q:" 题干（源码约第 ${lineNo} 行）`);
  }
  if (options.length < 2) {
    throw new Error(`quiz 代码块选项少于 2 个（源码约第 ${lineNo} 行）`);
  }
  if (kind === 'single' && correct.length !== 1) {
    throw new Error(`quiz single 必须有且仅有 1 个正确答案（用 "+"），当前为 ${correct.length}（源码约第 ${lineNo} 行）`);
  }
  if (kind === 'multi' && correct.length < 1) {
    throw new Error(`quiz multi 至少需要 1 个正确答案（用 "+"），当前为 0（源码约第 ${lineNo} 行）`);
  }

  return { question, options, correct, explanation };
}
```

- [ ] **Step 2: 在 `transformer` 内新增 `quiz` 分支**

将 `visit(tree, 'code', ...)` 回调体从

```js
if (node.lang !== 'rust') return;
```

改为

```js
const lineNo = node.position?.start?.line ?? 0;

// ── quiz single / quiz multi ─────────────────────────────────────────
if (node.lang === 'quiz') {
  const meta = node.meta ?? '';
  const kind = meta.includes('multi') ? 'multi' : meta.includes('single') ? 'single' : null;
  if (!kind) {
    throw new Error(`quiz 代码块需在语言标记后写明 "single" 或 "multi"（源码约第 ${lineNo} 行）`);
  }
  const parsed = parseQuiz(node.value, kind, lineNo);
  const dataPayload = encodeURIComponent(JSON.stringify(parsed));
  const html =
    `<div class="quiz-choice" data-kind="${kind}" data-payload="${dataPayload}">` +
    `<div class="quiz-placeholder">加载题目中…</div>` +
    `</div>`;
  parent.children[index] = { type: 'html', value: html };
  return;
}

if (node.lang !== 'rust') return;
```

- [ ] **Step 3: 在 rust 分支内新增 `editable` 子分支**

将 rust 分支当前首句

```js
const meta = node.meta ?? '';
if (!meta.includes('runnable')) return;
```

替换为

```js
const meta = node.meta ?? '';

// ── rust editable：可编辑可运行的代码块 ───────────────────────────────
if (meta.includes('editable')) {
  const starter = node.value.replace(/\n+$/, '');
  const starterEnc = encodeURIComponent(starter);
  const highlighted = highlightCode(starter);
  const html =
    `<div class="code-editor" data-starter-code="${starterEnc}">` +
    `<pre class="code-editor-fallback"><code class="language-rust">${highlighted}</code></pre>` +
    `</div>`;
  parent.children[index] = { type: 'html', value: html };
  return;
}

if (!meta.includes('runnable')) return;
```

> `code-editor-fallback` 这个 `<pre>` 会在 Monaco 成功挂载后被 JS 移除；未挂载前（或 JS 关闭）用户仍然能看到静态高亮代码，不至于空白。

- [ ] **Step 4: 构建验证**

Run: `npx astro build`
Expected: 0 errors（此时没有 `.md` 文件使用新标记，插件分支不触发，仅是增量代码检查通过）。

- [ ] **Step 5: 提交**

```bash
git add src/plugins/remark-rust-codeblock.mjs
git commit -m "feat(plugin): support quiz single/multi and rust editable code blocks"
```

---

## Task 2: QuizChoice.astro —— 单选/多选题客户端水合

**Files:**
- Create: `src/components/quiz/QuizChoice.astro`

- [ ] **Step 1: 创建目录与文件骨架**

Run: `mkdir -p src/components/quiz`

创建 `src/components/quiz/QuizChoice.astro`，写入：

```astro
---
// QuizChoice.astro
// 无 props、无服务端渲染内容。
// 客户端扫描所有 <div class="quiz-choice">，读取 data-payload，渲染成交互题。
// 支持 data-kind="single"（单选）与 data-kind="multi"（多选）。
---

<script>
  interface QuizPayload {
    question: string;
    options: string[];
    correct: number[];
    explanation: string;
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function arrEq(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    const s = new Set(a);
    return b.every((x) => s.has(x));
  }

  function initQuiz(el: HTMLElement): void {
    const kind = (el.dataset.kind ?? 'single') as 'single' | 'multi';
    let payload: QuizPayload;
    try {
      payload = JSON.parse(decodeURIComponent(el.dataset.payload ?? ''));
    } catch {
      el.innerHTML = '<div class="quiz-error">题目解析失败</div>';
      return;
    }

    const inputType = kind === 'single' ? 'radio' : 'checkbox';
    // 同一组单选按钮需要唯一 name，使用元素在页面中的索引
    const groupName = `quiz-${Math.random().toString(36).slice(2, 9)}`;

    const optionsHtml = payload.options
      .map(
        (opt, i) => `
          <label class="quiz-option" data-idx="${i}">
            <input type="${inputType}" name="${groupName}" value="${i}" />
            <span class="quiz-option-label">${escapeHtml(opt)}</span>
            <span class="quiz-option-icon" aria-hidden="true"></span>
          </label>
        `
      )
      .join('');

    el.innerHTML = `
      <div class="quiz-header">
        <span class="quiz-badge">${kind === 'single' ? '单选题' : '多选题'}</span>
        <div class="quiz-question">${escapeHtml(payload.question)}</div>
      </div>
      <div class="quiz-options" role="${kind === 'single' ? 'radiogroup' : 'group'}">
        ${optionsHtml}
      </div>
      <div class="quiz-actions">
        <button type="button" class="quiz-submit">提交</button>
        <button type="button" class="quiz-reset" hidden>重做</button>
      </div>
      <div class="quiz-feedback" hidden></div>
    `;

    const inputs = Array.from(el.querySelectorAll<HTMLInputElement>('input'));
    const optionEls = Array.from(el.querySelectorAll<HTMLLabelElement>('.quiz-option'));
    const submitBtn = el.querySelector<HTMLButtonElement>('.quiz-submit')!;
    const resetBtn = el.querySelector<HTMLButtonElement>('.quiz-reset')!;
    const feedback = el.querySelector<HTMLDivElement>('.quiz-feedback')!;

    function setLocked(locked: boolean): void {
      inputs.forEach((i) => (i.disabled = locked));
      submitBtn.hidden = locked;
      resetBtn.hidden = !locked;
    }

    submitBtn.addEventListener('click', () => {
      const selected = inputs.filter((i) => i.checked).map((i) => Number(i.value));
      if (selected.length === 0) {
        feedback.hidden = false;
        feedback.className = 'quiz-feedback quiz-feedback-warn';
        feedback.textContent = '请先选择一个选项';
        return;
      }

      const isCorrect = arrEq(selected, payload.correct);

      optionEls.forEach((o) => {
        const idx = Number(o.dataset.idx);
        o.classList.remove('correct', 'wrong', 'should-be-correct');
        if (payload.correct.includes(idx)) {
          o.classList.add(selected.includes(idx) ? 'correct' : 'should-be-correct');
        } else if (selected.includes(idx)) {
          o.classList.add('wrong');
        }
      });

      feedback.hidden = false;
      feedback.className = `quiz-feedback ${isCorrect ? 'quiz-feedback-ok' : 'quiz-feedback-err'}`;
      const head = isCorrect ? '✓ 回答正确' : '✗ 回答错误';
      feedback.innerHTML = payload.explanation
        ? `<strong>${head}</strong><div class="quiz-explanation">${escapeHtml(payload.explanation)}</div>`
        : `<strong>${head}</strong>`;

      setLocked(true);
    });

    resetBtn.addEventListener('click', () => {
      inputs.forEach((i) => (i.checked = false));
      optionEls.forEach((o) => o.classList.remove('correct', 'wrong', 'should-be-correct'));
      feedback.hidden = true;
      setLocked(false);
    });
  }

  document.querySelectorAll<HTMLElement>('.quiz-choice').forEach(initQuiz);
</script>

<style is:global>
  .quiz-choice {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 1.25rem 1.25rem 1rem;
    margin: 1.5rem 0;
  }

  .quiz-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .quiz-badge {
    flex-shrink: 0;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    color: var(--color-accent);
    background: rgba(206, 65, 43, 0.1);
    border: 1px solid rgba(206, 65, 43, 0.3);
    line-height: 1.4;
    white-space: nowrap;
  }

  .quiz-question {
    font-size: 0.9375rem;
    color: var(--color-text);
    font-weight: 500;
    line-height: 1.6;
  }

  .quiz-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .quiz-option {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--color-text);
    transition: border-color 0.15s, background 0.15s;
  }

  .quiz-option:hover:not(:has(input:disabled)) {
    border-color: var(--color-text-muted);
    background: rgba(255, 255, 255, 0.03);
  }

  .quiz-option input {
    accent-color: var(--color-accent);
    cursor: pointer;
    flex-shrink: 0;
  }

  .quiz-option input:disabled {
    cursor: default;
  }

  .quiz-option-label {
    flex: 1;
  }

  .quiz-option-icon {
    width: 1rem;
    text-align: right;
    font-size: 0.875rem;
    line-height: 1;
  }

  .quiz-option.correct {
    border-color: var(--color-success);
    background: rgba(34, 197, 94, 0.08);
  }
  .quiz-option.correct .quiz-option-icon::after { content: '✓'; color: var(--color-success); }

  .quiz-option.wrong {
    border-color: var(--color-error);
    background: rgba(239, 68, 68, 0.08);
  }
  .quiz-option.wrong .quiz-option-icon::after { content: '✗'; color: var(--color-error); }

  .quiz-option.should-be-correct {
    border-color: var(--color-success);
    border-style: dashed;
  }
  .quiz-option.should-be-correct .quiz-option-icon::after { content: '✓'; color: var(--color-success); opacity: 0.6; }

  .quiz-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .quiz-submit,
  .quiz-reset {
    padding: 0.375rem 0.875rem;
    font-size: 0.8125rem;
    font-family: var(--font-sans);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;
  }

  .quiz-submit {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .quiz-submit:hover {
    background: rgba(206, 65, 43, 0.1);
  }

  .quiz-reset:hover {
    color: var(--color-text);
    border-color: var(--color-text-muted);
    background: rgba(255, 255, 255, 0.04);
  }

  .quiz-feedback {
    margin-top: 0.875rem;
    padding: 0.75rem 0.875rem;
    border-radius: 6px;
    font-size: 0.8125rem;
    line-height: 1.55;
  }

  .quiz-feedback-ok {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: var(--color-text);
  }
  .quiz-feedback-ok strong { color: var(--color-success); }

  .quiz-feedback-err {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: var(--color-text);
  }
  .quiz-feedback-err strong { color: var(--color-error); }

  .quiz-feedback-warn {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: var(--color-warning);
  }

  .quiz-explanation {
    margin-top: 0.5rem;
    color: var(--color-text-muted);
  }

  .quiz-placeholder {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-style: italic;
  }

  .quiz-error {
    color: var(--color-error);
    font-size: 0.875rem;
  }
</style>
```

- [ ] **Step 2: 提交（此时尚未挂载到 ChapterLayout，稍后一起提交验证）**

Run: `npx astro check` — 预期 0 errors。

---

## Task 3: CodeEditor.astro —— Monaco 懒加载 + 运行 + 重置

**Files:**
- Create: `src/components/code/CodeEditor.astro`

- [ ] **Step 1: 创建 CodeEditor.astro**

写入：

```astro
---
// CodeEditor.astro
// 无 props、无服务端渲染内容。
// 客户端扫描所有 <div class="code-editor">，读取 data-starter-code，懒加载 Monaco 并挂载编辑器。
// 工具栏布局与 CodeRunner 对齐：[状态区] [▶ 运行] [重置] [复制]
---

<script>
  import { executeCode } from '../../lib/rust-playground';

  // ── Monaco 懒加载 ────────────────────────────────────────────────────────
  // 使用 jsdelivr 的 AMD loader（monaco 官方推荐的 CDN 方式）。
  // 第一个 CodeEditor 出现时触发加载；之后共享 Promise。

  const MONACO_VERSION = '0.45.0';
  const MONACO_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;

  let monacoPromise: Promise<unknown> | null = null;

  function loadMonaco(): Promise<unknown> {
    if (monacoPromise) return monacoPromise;

    monacoPromise = new Promise((resolve, reject) => {
      // 注入 loader 脚本
      const loaderScript = document.createElement('script');
      loaderScript.src = `${MONACO_BASE}/loader.min.js`;
      loaderScript.onerror = () => reject(new Error('Monaco loader 加载失败'));
      loaderScript.onload = () => {
        const w = window as unknown as {
          require: {
            config: (cfg: Record<string, unknown>) => void;
            (deps: string[], cb: (m: unknown) => void): void;
          };
          MonacoEnvironment?: { getWorkerUrl: (moduleId: string, label: string) => string };
        };

        // 跨域 worker：用一个 blob 包装 importScripts，规避 CORS 限制
        w.MonacoEnvironment = {
          getWorkerUrl: function () {
            return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
              self.MonacoEnvironment = { baseUrl: '${MONACO_BASE}/' };
              importScripts('${MONACO_BASE}/base/worker/workerMain.js');
            `)}`;
          },
        };

        w.require.config({ paths: { vs: MONACO_BASE } });
        w.require(['vs/editor/editor.main'], (m: unknown) => {
          resolve((window as unknown as { monaco: unknown }).monaco ?? m);
        });
      };
      document.head.appendChild(loaderScript);
    });

    return monacoPromise;
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  interface MonacoLike {
    editor: {
      create: (el: HTMLElement, opts: Record<string, unknown>) => {
        getValue: () => string;
        setValue: (v: string) => void;
        dispose: () => void;
        layout: () => void;
      };
    };
  }

  async function initCodeEditor(el: HTMLElement): Promise<void> {
    const starterCode = decodeURIComponent(el.dataset.starterCode ?? '');
    if (!starterCode) return;

    // ── 工具栏 ─────────────────────────────────────────────────────────────
    const toolbar = document.createElement('div');
    toolbar.className = 'code-editor-toolbar';

    const statusEl = document.createElement('span');
    statusEl.className = 'code-editor-status';
    toolbar.appendChild(statusEl);

    const runBtn = document.createElement('button');
    runBtn.className = 'code-editor-btn code-editor-run';
    runBtn.textContent = '▶ 运行';
    runBtn.disabled = true;  // Monaco 挂载前禁用
    toolbar.appendChild(runBtn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'code-editor-btn code-editor-reset';
    resetBtn.textContent = '重置';
    resetBtn.disabled = true;
    toolbar.appendChild(resetBtn);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-editor-btn code-editor-copy';
    copyBtn.textContent = '复制';
    toolbar.appendChild(copyBtn);

    // ── 编辑器挂载容器 ────────────────────────────────────────────────────
    const editorHost = document.createElement('div');
    editorHost.className = 'code-editor-host';

    // 挂载前的占位高度，避免布局抖动（按行数估算，最小 120px）
    const lineCount = Math.max(starterCode.split('\n').length, 5);
    editorHost.style.height = `${Math.min(lineCount * 20 + 24, 480)}px`;

    // ── 输出区 ─────────────────────────────────────────────────────────────
    const output = document.createElement('div');
    output.className = 'code-editor-output';
    output.hidden = true;

    // 清空（移除 fallback <pre>），装入新结构
    el.innerHTML = '';
    el.appendChild(toolbar);
    el.appendChild(editorHost);
    el.appendChild(output);

    // ── 复制按钮（无需 Monaco） ───────────────────────────────────────────
    let currentCode = starterCode;  // 在 Monaco 加载前复制用 starterCode
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(currentCode).then(
        () => {
          copyBtn.textContent = '已复制';
          setTimeout(() => (copyBtn.textContent = '复制'), 2000);
        },
        () => {
          copyBtn.textContent = '复制失败';
          setTimeout(() => (copyBtn.textContent = '复制'), 2000);
        }
      );
    });

    // ── 加载 Monaco 并挂载 ────────────────────────────────────────────────
    statusEl.textContent = '加载编辑器中…';
    statusEl.className = 'code-editor-status code-editor-status-running';

    let editor: ReturnType<MonacoLike['editor']['create']>;
    try {
      const monaco = (await loadMonaco()) as MonacoLike;
      editor = monaco.editor.create(editorHost, {
        value: starterCode,
        language: 'rust',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 },
        tabSize: 4,
      });
      statusEl.textContent = '';
      statusEl.className = 'code-editor-status';
      runBtn.disabled = false;
      resetBtn.disabled = false;
    } catch (e) {
      statusEl.textContent = '✗ 编辑器加载失败';
      statusEl.className = 'code-editor-status code-editor-status-error';
      // 回退：普通 textarea
      const ta = document.createElement('textarea');
      ta.className = 'code-editor-fallback-input';
      ta.value = starterCode;
      ta.spellcheck = false;
      editorHost.innerHTML = '';
      editorHost.appendChild(ta);
      const shim: ReturnType<MonacoLike['editor']['create']> = {
        getValue: () => ta.value,
        setValue: (v: string) => { ta.value = v; },
        dispose: () => {},
        layout: () => {},
      };
      editor = shim;
      runBtn.disabled = false;
      resetBtn.disabled = false;
    }

    // ── 运行按钮 ───────────────────────────────────────────────────────────
    runBtn.addEventListener('click', async () => {
      currentCode = editor.getValue();
      runBtn.disabled = true;
      runBtn.textContent = '运行中...';
      statusEl.textContent = '⏳ 执行中...';
      statusEl.className = 'code-editor-status code-editor-status-running';
      output.hidden = true;

      try {
        const result = await executeCode(currentCode);
        statusEl.textContent = '';
        statusEl.className = 'code-editor-status';
        output.hidden = false;
        if (result.success) {
          output.innerHTML = result.stdout
            ? `<pre class="code-editor-stdout">${escapeHtml(result.stdout)}</pre>`
            : '<span class="code-editor-stdout">（无输出）</span>';
        } else {
          output.innerHTML = result.stderr
            ? `<pre class="code-editor-stderr">${escapeHtml(result.stderr)}</pre>`
            : '<span class="code-editor-stderr">（编译失败，无错误信息）</span>';
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        statusEl.textContent = '✗ 请求失败';
        statusEl.className = 'code-editor-status code-editor-status-error';
        output.hidden = false;
        output.innerHTML = `<span class="code-editor-stderr">${escapeHtml(msg)}</span>`;
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = '▶ 运行';
      }
    });

    // ── 重置按钮 ───────────────────────────────────────────────────────────
    resetBtn.addEventListener('click', () => {
      editor.setValue(starterCode);
      currentCode = starterCode;
      output.hidden = true;
      output.innerHTML = '';
    });
  }

  document.querySelectorAll<HTMLElement>('.code-editor').forEach((el) => {
    initCodeEditor(el).catch((err) => {
      console.error('CodeEditor 初始化失败：', err);
    });
  });
</script>

<style is:global>
  .code-editor {
    background: var(--color-code-bg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    margin: 1.5rem 0;
    overflow: hidden;
  }

  .code-editor-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--color-border);
  }

  .code-editor-status {
    flex: 1;
    min-width: 0;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .code-editor-status-running { color: var(--color-text-muted); }
  .code-editor-status-error   { color: var(--color-error); }

  .code-editor-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.625rem;
    background: transparent;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
    white-space: nowrap;
  }

  .code-editor-btn:hover:not(:disabled) {
    color: var(--color-text);
    border-color: var(--color-text-muted);
    background: rgba(255, 255, 255, 0.06);
  }

  .code-editor-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .code-editor-run {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .code-editor-run:hover:not(:disabled) {
    color: var(--color-text);
    background: rgba(206, 65, 43, 0.12);
  }

  .code-editor-host {
    /* Monaco 自己会填满该容器；初始 height 在脚本中按行数估算 */
    min-height: 120px;
    max-height: 480px;
  }

  /* 构建期 Shiki 高亮 fallback（Monaco 加载前短暂可见） */
  .code-editor-fallback {
    margin: 0 !important;
    padding: 1rem 1.25rem !important;
    background: none !important;
    border: none !important;
    border-radius: 0 !important;
    overflow-x: auto;
  }
  .code-editor-fallback code {
    background: none;
    color: var(--color-code-text);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    line-height: 1.65;
  }

  /* Monaco 加载失败时的 textarea 兜底 */
  .code-editor-fallback-input {
    width: 100%;
    min-height: 120px;
    padding: 1rem 1.25rem;
    background: var(--color-code-bg);
    color: var(--color-code-text);
    border: none;
    outline: none;
    resize: vertical;
    font-family: var(--font-mono);
    font-size: 0.875rem;
    line-height: 1.65;
  }

  .code-editor-output {
    border-top: 1px solid var(--color-border);
    padding: 0.875rem 1.25rem;
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    line-height: 1.6;
    overflow-x: auto;
  }

  .code-editor-stdout { color: var(--color-text); }
  .code-editor-stderr { color: var(--color-error); }

  .code-editor-output pre {
    margin: 0;
    font-family: inherit;
    font-size: inherit;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
```

- [ ] **Step 2: 类型检查**

Run: `npx astro check`
Expected: 0 errors（若报 `require` / `MonacoEnvironment` 未定义，已用类型断言规避；如仍报错按错误信息调整类型注释）。

---

## Task 4: 在 ChapterLayout 挂载两个新全局组件

**Files:**
- Modify: `src/components/layout/ChapterLayout.astro`

- [ ] **Step 1: 追加 import**

在现有 `import CodeRunner from '../code/CodeRunner.astro';` 下方插入两行：

```astro
import QuizChoice from '../quiz/QuizChoice.astro';
import CodeEditor from '../code/CodeEditor.astro';
```

- [ ] **Step 2: 追加组件挂载**

将

```astro
  <CodeRunner />
</BaseLayout>
```

改为

```astro
  <CodeRunner />
  <QuizChoice />
  <CodeEditor />
</BaseLayout>
```

- [ ] **Step 3: 构建验证**

Run: `npx astro build`
Expected: 0 errors。

- [ ] **Step 4: 提交组件体与挂载**

```bash
git add src/components/quiz/QuizChoice.astro src/components/code/CodeEditor.astro src/components/layout/ChapterLayout.astro
git commit -m "feat(practice): add QuizChoice and CodeEditor global components"
```

---

## Task 5: 第一章练习文章

**Files:**
- Create: `src/content/chapters/01-getting-started/03-practice.md`

- [ ] **Step 1: 写入文件**

````markdown
---
title: "练习：入门基础"
description: "巩固第一章内容的单选、多选与可编辑代码练习"
difficulty: beginner
estimatedTime: 15
keywords: ["练习", "rustup", "Hello World", "可变性"]
---

# 环境与工具链

## 单选：安装工具

```quiz single
Q: Rust 推荐使用哪一个工具来安装和管理工具链？
- apt-get
+ rustup
- cargo install
- brew install rust
E: rustup 是官方的工具链管理器，可以安装多个 Rust 版本（stable / beta / nightly）并在它们之间切换。
```

## 多选：Cargo 能做什么

```quiz multi
Q: 下列哪些操作由 Cargo 负责？
+ 创建新项目（cargo new）
+ 构建项目（cargo build）
- 安装操作系统补丁
+ 运行测试（cargo test）
E: Cargo 是 Rust 的构建系统与包管理器，负责项目创建、依赖管理、构建、测试、发布等，但不管系统级操作。
```

# 第一个程序

## 单选：main 函数

```quiz single
Q: Rust 可执行程序的入口函数名称是？
- start
- init
+ main
- run
E: 与 C/C++ 类似，Rust 用 `fn main()` 作为可执行程序入口。
```

## 编程题：补全 Hello, World!

下面的代码少了一行打印语句。请在 `main` 函数内补上 `println!("Hello, World!");`，然后点「运行」查看输出。

```rust editable
fn main() {
    // TODO: 在此处打印 Hello, World!
}
```

# 变量与可变性

## 单选：可变变量

```quiz single
Q: 下列哪一种语法可以声明一个可变的 i32 变量？
- let x: i32 = 5;
+ let mut x: i32 = 5;
- var x: i32 = 5;
- mut x: i32 = 5;
E: Rust 变量默认不可变。要让变量可变，在 `let` 后加 `mut` 关键字。
```

## 编程题：修复可变性错误

下面的代码无法编译。请修复它，使得程序最终打印 `6`。

```rust editable
fn main() {
    let x = 5;
    x = 6;
    println!("{}", x);
}
```
````

- [ ] **Step 2: 启动 dev server 并手工验证**

Run: `npm run dev`
打开 `http://localhost:4321/chapters/01-getting-started/03-practice`，确认：
- 侧栏显示「1.3 练习：入门基础」
- 三个 H1 构成三个标签页
- 单选题选错有红色提示 + 解析，选对有绿色提示
- 多选题允许多选后提交
- 可编辑代码块可在 Monaco 中编辑、运行，并看到 stdout / stderr
- 文章底部的「上一节 / 下一节」按钮正常工作

Run: `npx astro build`
Expected: 0 errors。

- [ ] **Step 3: 提交**

```bash
git add src/content/chapters/01-getting-started/03-practice.md
git commit -m "feat(content): add practice article for chapter 1"
```

---

## Task 6: 第二章练习文章

**Files:**
- Create: `src/content/chapters/02-ownership/03-practice.md`

- [ ] **Step 1: 写入文件**

````markdown
---
title: "练习：所有权与借用"
description: "巩固所有权规则、移动、借用与生命周期的单选、多选与可编辑代码练习"
difficulty: intermediate
estimatedTime: 20
keywords: ["练习", "所有权", "借用", "移动"]
---

# 所有权规则

## 单选：所有者数量

```quiz single
Q: 在任一时刻，一个值可以有几个所有者？
- 0 个
+ 1 个
- 多个，由编译器自动协调
- 任意个，但需要手动同步
E: Rust 的核心规则之一：一个值在任一时刻只能有一个所有者。这是编译器保证内存安全的前提。
```

## 多选：值何时被 drop

```quiz multi
Q: 下列哪些情形会让值被自动 drop？
+ 所有者离开作用域
+ 所有者被赋值给另一个变量后原变量不再使用（发生移动）
- 程序调用 malloc
- 变量被标记为 const
E: Rust 在所有者离开作用域或所有权转移后会自动 drop；它没有 GC，也没有 `const` 与 drop 的直接关系。
```

## 编程题：修复移动后使用

下面的代码把 `s1` 的所有权移动给了 `s2`，然后又尝试使用 `s1`，会编译失败。请用 `clone()` 修复，使两行 `println!` 都能正常打印。

```rust editable
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;
    println!("{}", s1);
    println!("{}", s2);
}
```

# 借用与引用

## 单选：可变借用的独占性

```quiz single
Q: 对同一个值，在同一作用域内，下列哪种组合是合法的？
- 两个 `&mut T`
+ 一个 `&mut T`
- 一个 `&mut T` 与一个 `&T`
- 多个 `&mut T` 与一个 `&T`
E: 可变引用是独占的：在同一作用域内，同一值要么有任意多个不可变引用 `&T`，要么只有一个可变引用 `&mut T`，二者不能并存。
```

## 多选：引用的规则

```quiz multi
Q: 下列哪些说法是正确的？
+ 引用必须总是有效（不能悬垂）
+ 在同一作用域中可以有任意多个不可变引用
- 可变引用可以与不可变引用同时存在
+ 可变引用在同一作用域中只能存在一个
E: 借用检查器保证：引用永远有效，且 `&T` 与 `&mut T` 不能共存，`&mut T` 独占。
```

## 编程题：用借用改为"不转移所有权"

下面的 `print_length` 获取了 `String` 的所有权，导致 `main` 里 `s` 之后不能再用。请改为接受借用 `&String`，然后在调用处传入 `&s`，使得末尾的 `println!("{}", s);` 能正常工作。

```rust editable
fn print_length(s: String) {
    println!("长度：{}", s.len());
}

fn main() {
    let s = String::from("hello");
    print_length(s);
    println!("{}", s);
}
```

# 综合练习

## 单选：Clone vs Copy

```quiz single
Q: 下列关于 Copy 与 Clone 的说法，哪一项正确？
- 所有类型都实现了 Copy
+ Copy 是按位复制，通常用于基础类型（如 i32、bool）；String 等堆数据只有 Clone
- Clone 是浅拷贝，Copy 是深拷贝
- Copy 需要显式调用 .copy() 方法
E: Copy 是「赋值即隐式按位复制」，限于栈上简单类型；String 这类持有堆数据的类型只能通过显式 `.clone()` 深拷贝。
```

## 编程题：让函数返回所有权

下面的 `take_and_give_back` 接收 `String` 又返回它。请在调用处用 `let s = take_and_give_back(s);` 形式接住返回值，让最后的 `println!` 能打印原字符串。

```rust editable
fn take_and_give_back(s: String) -> String {
    s
}

fn main() {
    let s = String::from("world");
    take_and_give_back(s);
    println!("{}", s);
}
```
````

- [ ] **Step 2: 手工验证**

Run: `npm run dev`
打开 `http://localhost:4321/chapters/02-ownership/03-practice`，确认：
- 侧栏显示「2.3 练习：所有权与借用」
- 三个 H1 标签页切换正常
- 所有 quiz 题目交互正确
- 所有 editable 代码块能运行，未修复时看到编译错误；修复后能看到 `hello` / `长度：5` 等期望输出

Run: `npx astro build`
Expected: 0 errors。

- [ ] **Step 3: 提交**

```bash
git add src/content/chapters/02-ownership/03-practice.md
git commit -m "feat(content): add practice article for chapter 2"
```

---

## Task 7: 同步 spec 文档

**Files:**
- Modify: `docs/superpowers/specs/2026-04-23-rust-tutorial-design.md`

- [ ] **Step 1: 顶部状态表更新**

将：

```markdown
| 5 | 练习与测验（Monaco Editor + 选择题 + 编码题） | ⬜ 待实现 |
```

改为：

```markdown
| 5 | 练习文章（quiz single/multi + rust editable 代码块） | ✅ 完成 |
```

- [ ] **Step 2: 目录树更新**

将 §三「目录结构」下的以下行：

```
│   │   ├── exercises/                     ⬜ 练习题配置（JSON）—— 子计划 5
│   │   └── quizzes/                       ⬜ 测验题配置（JSON）—— 子计划 5
```

删除（不再使用独立 collection）。

同步删除：

```
│   │   ├── exercises/
│   │   │   └── [slug].astro               ⬜ 练习页 —— 子计划 5
│   │   └── quiz/
│   │       └── [slug].astro               ⬜ 测验页 —— 子计划 5
```

同步删除 `components/quiz/` 下的 `QuizPage.astro` 条目（改为仅 `QuizChoice.astro`）：

```
│   │   ├── quiz/                          ⬜ 测验组件 —— 子计划 5
│   │   │   ├── QuizPage.astro
│   │   │   ├── MultipleChoice.astro
│   │   │   └── CodingQuestion.astro
```

改为：

```
│   │   ├── quiz/                          ✅ 练习题组件（子计划 5）
│   │   │   └── QuizChoice.astro
│   │   ├── code/
│   │   │   ├── CodeRunner.astro           ✅
│   │   │   └── CodeEditor.astro           ✅ Monaco 可编辑可运行代码块（子计划 5）
```

并在 `chapters/` 章节目录示例中，在 `01-getting-started/` 下补 `03-practice.md ✅`，在 `02-ownership/` 下补 `03-practice.md ✅`。

- [ ] **Step 3: §五 代码块标记规则扩展**

在 `| 标记 | 渲染结果 |` 表格底部追加三行：

```markdown
| ` ```rust editable ` | Monaco 可编辑、可运行代码块 |
| ` ```quiz single ` | 单选题（DSL：`Q:` / `- ` / `+ ` / `E:`） |
| ` ```quiz multi ` | 多选题（同上 DSL，可多个 `+`） |
```

- [ ] **Step 4: §七 重写为「练习文章」方案**

把 §七 整节内容替换为：

````markdown
## 七、练习文章（同级章节）

练习与测验统一作为**章节内的普通 Markdown 文章**存在，标题以「练习：」开头（如 `练习：入门基础`）。它们：

- 放在 `src/content/chapters/<chapterDir>/` 下，文件名惯例为 `03-practice.md`（或按顺序编号），与教程文章共享同一 collection、同一动态路由 `/chapters/[...slug]`。
- 自动进入侧栏，编号紧跟教程文章（例如 1.1、1.2 教程之后的 1.3 即为练习）。
- 多个 H1 自动构成标签页（复用 `SectionProgress`），章节底部的上一节/下一节也自动串起练习文章。

文章内部可混用三种互动块：

**单选题：**

```quiz single
Q: 题干
- 错误选项
+ 正确选项
- 错误选项
E: 解析（可选）
```

**多选题：** 与单选同 DSL，允许多个 `+`；用户提交后同时标出所有正确项与错选项。

**可编辑代码题：** `rust editable` 代码块，Monaco 编辑，点「运行」调用 Rust Playground API，返回 stdout / stderr；支持「重置」恢复初始代码。题目描述写在代码块上方的普通段落里。

进度上，练习文章走与普通文章相同的段落滚动完成规则，不再引入单独的 `exercises` / `quizzes` 存储字段（spec §9.1 中的这两个字段继续保留给未来的显式评分功能，当前实现不写入）。
````

- [ ] **Step 5: 提交**

Run: `npx astro build`
Expected: 0 errors（无代码改动的情况下，本次构建仅为回归验证）。

```bash
git add docs/superpowers/specs/2026-04-23-rust-tutorial-design.md
git commit -m "docs(spec): rewrite practice section to inline article approach"
```

---

## 验收标准

- [ ] 侧栏在第一章下显示「1.3 练习：入门基础」，第二章下显示「2.3 练习：所有权与借用」。
- [ ] 打开两篇练习文章，顶部出现 H1 标签栏（复用 `SectionProgress`），可点击切换。
- [ ] 单选题：选错 → 选项红色 + 红色反馈 + 显示正确答案（虚线）；选对 → 选项绿色 + 绿色反馈；「重做」恢复可选状态。
- [ ] 多选题：同上，全选对才算正确；错选与漏选均能区分显示。
- [ ] 可编辑代码块：Monaco 加载成功，可编辑；「运行」调用 Playground 返回 stdout / stderr；「重置」恢复初始代码；「复制」把当前编辑器内容写入剪贴板。
- [ ] Monaco CDN 不可用时，fallback 为 textarea，仍能运行代码。
- [ ] 章节文档页底部的「上一节 / 下一节」按钮在练习文章与普通文章之间无缝跳转。
- [ ] `npx astro build` 0 errors / warnings。
- [ ] spec §7 与 §3 目录树中所有已废弃条目已同步更新。

---

## 执行提示（对执行 agent）

- 每个 Task 结束都跑一次 `npx astro build`；构建失败即使代码看似对了也要停下来定位原因（remark 插件的 AST 变换在构建期同步执行，任何 parseQuiz 抛错会直接让构建失败——这是预期行为）。
- Monaco CDN 加载涉及跨域 Worker，已在 Task 3 用 data-URL Blob 方式规避；若本地浏览器因 CSP 拦截，请在 `BaseLayout` 的 `<head>` 检查是否需要放开 `worker-src data:`（Astro 默认没有注入 CSP，所以通常无需改动）。
- 在添加新 `quiz single` / `quiz multi` 块时，请严格遵循 DSL 语法，特别是 `+ ` / `- ` 后必须有**一个空格**。
