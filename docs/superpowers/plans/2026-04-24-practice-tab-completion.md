# 练习 tab 完成判定 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为章节页 H1 标签引入「练习 tab 完成判定」——tab 内所有互动块（quiz + editable 代码）最近一次提交都 pass 才标绿；无互动块的 tab 沿用滚到底。

**Architecture:** 扩展 remark 插件分配 blockId 并合并 `expected` 代码块；扩展 `progress.ts` 新增 `blocks` 存储；改造 `QuizChoice` / `CodeEditor` 在用户交互后写 latest；`SectionProgress` 扫描 tab 内容，对含互动块的 tab 用 recompute 替换滚到底哨兵，对普通 tab 保持现状。

**Tech Stack:** Astro 5、TypeScript、remark（unist-util-visit）、localStorage、Rust Playground API、Monaco Editor。

**Spec:** `docs/superpowers/specs/2026-04-24-practice-tab-completion-design.md`

**Verification model:** 本项目无测试框架。每个 Task 的验证由 (a) `npm run check`（TS 类型 + Astro 诊断）、(b) `npm run build`（静态构建通过）、(c) 浏览器手动测试 组合完成。每个 Task 末尾都给出需要触发的具体场景。

---

## 文件结构

| 文件 | 动作 | 责任 |
|------|------|------|
| `src/lib/progress.ts` | 修改 | 新增 `blocks` 字段、`markBlockResult` / `getBlockResult` / `setSectionStatus`；扩展 reset API 清理 blocks |
| `src/plugins/remark-rust-codeblock.mjs` | 修改 | 新增 expected 合并 pass、blockId 分配；为互动块 div 写 `data-block-id` / `data-expect-mode` / `data-expect-pattern` |
| `src/components/quiz/QuizChoice.astro` | 修改 | 提交时调 `markBlockResult`；初始化时读 latest 显示徽章 |
| `src/components/code/CodeEditor.astro` | 修改 | 运行后按 expect 判定并调 `markBlockResult`；显示历史徽章与结果提示行 |
| `src/components/ui/SectionProgress.astro` | 修改 | 扫描 tab 内互动块；practice tab 用 recompute 替代滚到底哨兵；监听 `progress-updated` |
| `src/content/chapters/01-getting-started/03-practice.md` | 修改 | 为 2 个 editable 块补 expected |
| `src/content/chapters/02-ownership/03-practice.md` | 修改 | 为 3 个 editable 块补 expected |
| `docs/superpowers/specs/2026-04-23-rust-tutorial-design.md` | 修改 | 同步 §5 / §7 / §9.1 / §9.3 |

---

## Task 1：扩展 progress.ts（存储层）

**Files:**

- Modify: `src/lib/progress.ts`

- [ ] **Step 1: 在 `ProgressStore` 接口加 `blocks` 字段**

打开 `src/lib/progress.ts`，把顶部接口改成：

```ts
interface ProgressStore {
  articles: Record<string, ArticleProgress>;
  blocks: Record<string, 'pass' | 'fail'>;  // 新增：blockId → latest
  exercises: Record<string, { completed: boolean; attempts: number }>;
  quizzes: Record<string, { score: number; completedAt: string }>;
  certificate: { name: string; earnedAt: string } | null;
}
```

- [ ] **Step 2: 更新 `empty()` 工厂函数**

```ts
function empty(): ProgressStore {
  return { articles: {}, blocks: {}, exercises: {}, quizzes: {}, certificate: null };
}
```

- [ ] **Step 3: 加兼容层（老 localStorage 数据无 blocks）**

修改 `load()`：

```ts
function load(): ProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<ProgressStore>;
    // 兼容旧数据：补齐缺失字段
    return {
      articles: parsed.articles ?? {},
      blocks: parsed.blocks ?? {},
      exercises: parsed.exercises ?? {},
      quizzes: parsed.quizzes ?? {},
      certificate: parsed.certificate ?? null,
    };
  } catch {
    return empty();
  }
}
```

- [ ] **Step 4: 新增 `markBlockResult` / `getBlockResult`**

在 `resetQuiz` 函数之前插入：

```ts
// ── 互动块 latest（practice tab 完成判定用）──────────────

export function markBlockResult(
  blockId: string,
  result: 'pass' | 'fail'
): void {
  const store = load();
  store.blocks[blockId] = result;
  save(store);
  window.dispatchEvent(new CustomEvent('progress-updated'));
}

export function getBlockResult(blockId: string): 'pass' | 'fail' | null {
  return load().blocks[blockId] ?? null;
}
```

- [ ] **Step 5: 新增 `setSectionStatus`（双向设置布尔）**

紧跟 `markSectionRead` 函数之后插入：

```ts
/**
 * 双向设置某 section 完成状态：practice tab 的 recompute 需要把绿变灰。
 * （markSectionRead 仅能 set true，不能 set false。）
 */
export function setSectionStatus(
  articleSlug: string,
  sectionTitle: string,
  completed: boolean
): void {
  const store = load();
  const ap: ArticleProgress = store.articles[articleSlug] ?? {
    status: 'not-started',
    sections: {},
  };
  const prev = ap.sections[sectionTitle] ?? false;
  if (prev === completed) return;  // 未变化不触发事件
  ap.sections[sectionTitle] = completed;
  ap.status = deriveStatus(ap.sections);
  store.articles[articleSlug] = ap;
  save(store);
  window.dispatchEvent(new CustomEvent('progress-updated'));
}
```

- [ ] **Step 6: 扩展 `resetArticle` 清理对应 blocks**

```ts
export function resetArticle(slug: string): void {
  const store = load();
  delete store.articles[slug];
  // 清理该文章所有 block latest
  for (const blockId of Object.keys(store.blocks)) {
    if (blockId.startsWith(`${slug}#`)) {
      delete store.blocks[blockId];
    }
  }
  save(store);
  window.dispatchEvent(new CustomEvent('progress-updated'));
}
```

- [ ] **Step 7: 扩展 `resetChapter` 清理对应 blocks**

```ts
export function resetChapter(chapterKey: string): void {
  const store = load();
  for (const slug of Object.keys(store.articles)) {
    if (slug.split('/')[0] === chapterKey) {
      delete store.articles[slug];
    }
  }
  for (const blockId of Object.keys(store.blocks)) {
    if (blockId.split('/')[0] === chapterKey) {
      delete store.blocks[blockId];
    }
  }
  save(store);
  window.dispatchEvent(new CustomEvent('progress-updated'));
}
```

- [ ] **Step 8: `resetAll` 无需改动**

`resetAll` 已经调用 `empty()` 重建 store，新版 `empty()` 自带空 `blocks`，自动覆盖。验证 resetAll 实现保留原样：

```ts
export function resetAll(): void {
  const prev = load();
  const fresh = empty();
  fresh.certificate = prev.certificate;
  save(fresh);
  window.dispatchEvent(new CustomEvent('progress-updated'));
}
```

- [ ] **Step 9: 运行类型检查**

```bash
cd /Users/fuhaowen/Documents/code/Web/rust_course_web
npm run check
```

Expected: 0 errors。若有错，修复后再继续。

- [ ] **Step 10: Commit**

```bash
git add src/lib/progress.ts
git commit -m "feat(progress): add blocks field and setSectionStatus API

为练习 tab 完成判定预备存储：新增 blocks: Record<blockId, 'pass'|'fail'>、
markBlockResult / getBlockResult、setSectionStatus（双向设置 sections[title]），
并扩展 resetArticle / resetChapter 同步清理 blocks。resetAll 天然兼容。"
```

---

## Task 2：扩展 remark 插件（expected 合并 + blockId 分配）

**Files:**

- Modify: `src/plugins/remark-rust-codeblock.mjs`

- [ ] **Step 1: 加 expected 解析工具函数**

在 `parseQuiz` 函数之后、`export default` 之前插入：

```js
/**
 * 解析 expected 代码块内容，返回 { mode, pattern }。
 * - 以 r"..." 包裹 → 正则模式，pattern 为去掉 r" 和末尾 " 的内容
 * - 其他 → 字面模式，pattern 为 trim 后的原内容
 * 注意：pattern 为空字符串时，正则也退回到字面（避免空正则永真）。
 *
 * @param {string} raw
 * @returns {{ mode: 'literal' | 'regex', pattern: string }}
 */
function parseExpected(raw) {
  const t = raw.trim();
  if (t.length >= 3 && t.startsWith('r"') && t.endsWith('"')) {
    const pattern = t.slice(2, -1);
    if (pattern === '') return { mode: 'literal', pattern: '' };
    return { mode: 'regex', pattern };
  }
  return { mode: 'literal', pattern: t };
}
```

- [ ] **Step 2: 加文件路径 → articleSlug 的工具函数**

紧跟 `parseExpected` 之后插入：

```js
/**
 * 从 vfile.history[0]（绝对路径）派生 articleSlug：
 *   .../src/content/chapters/01-getting-started/03-practice.md
 *   → "01-getting-started/03-practice"
 * 若无法匹配，返回空字符串（blockId 将退化为 `#0:0` 等，仍可工作但不稳定）。
 *
 * @param {string | undefined} filePath
 * @returns {string}
 */
function deriveArticleSlug(filePath) {
  if (!filePath) return '';
  const m = filePath.match(/[/\\]src[/\\]content[/\\]chapters[/\\](.+)\.md$/);
  if (!m) return '';
  return m[1].replace(/\\/g, '/');
}
```

- [ ] **Step 3: transformer 接收 vfile 参数**

把 `return function transformer(tree)` 改为：

```js
return function transformer(tree, file) {
  const articleSlug = deriveArticleSlug(file?.history?.[0]);
  // 下一步的合并 pass 与 visit 都需要 articleSlug
```

- [ ] **Step 4: 加 expected 合并 pre-pass（visit 之前）**

在 `visit(tree, 'code', ...)` 之前插入以下代码：

```js
// ── 前置 pass：把 expected 代码块合并到紧邻前一个 rust editable 上 ─
// 遍历顶层子节点（足够——代码块都在顶层），倒序遍历以便边合并边删除。
if (Array.isArray(tree.children)) {
  for (let i = tree.children.length - 1; i >= 0; i--) {
    const node = tree.children[i];
    if (node?.type !== 'code' || node.lang !== 'expected') continue;
    const prev = tree.children[i - 1];
    if (prev?.type !== 'code' || prev.lang !== 'rust') continue;
    if (!(prev.meta ?? '').includes('editable')) continue;
    const { mode, pattern } = parseExpected(node.value ?? '');
    // 暂存到 prev 节点的自定义字段，visit 阶段取出
    prev.__expect = { mode, pattern };
    tree.children.splice(i, 1);
  }
}
```

- [ ] **Step 5: 在 visit 里维护 tabIdx / blockIdx**

把 `visit(tree, 'code', (node, index, parent) => {` 改为同时访问 heading：

```js
let tabIdx = -1;
let blockIdxInTab = 0;

visit(tree, ['heading', 'code'], (node, index, parent) => {
  // 每遇到 H1 → 新 tab
  if (node.type === 'heading' && node.depth === 1) {
    tabIdx += 1;
    blockIdxInTab = 0;
    return;
  }
  if (node.type !== 'code') return;

  const lineNo = node.position?.start?.line ?? 0;
  // 当前 blockId 的生成函数（仅互动块用；普通 runnable 不参与）
  const nextBlockId = () => {
    const tId = Math.max(tabIdx, 0);  // 无 H1 时兜底 0
    const id = `${articleSlug}#${tId}:${blockIdxInTab}`;
    blockIdxInTab += 1;
    return id;
  };
```

> 注意：确保原有 `visit(tree, 'code', ...)` 的单节点回调逻辑都还在 `if (node.type !== 'code') return;` 之后。

- [ ] **Step 6: quiz 分支输出 data-block-id**

找到 quiz 分支（`if (node.lang === 'quiz')`）的 html 拼接处，修改为：

```js
if (node.lang === 'quiz') {
  const meta = node.meta ?? '';
  const kind = meta.includes('multi') ? 'multi' : meta.includes('single') ? 'single' : null;
  if (!kind) {
    throw new Error(`quiz 代码块需在语言标记后写明 "single" 或 "multi"（源码约第 ${lineNo} 行）`);
  }
  const parsed = parseQuiz(node.value, kind, lineNo);
  const dataPayload = encodeURIComponent(JSON.stringify(parsed));
  const blockId = nextBlockId();
  const html =
    `<div class="quiz-choice" data-kind="${kind}" data-block-id="${blockId}" data-payload="${dataPayload}">` +
    `<div class="quiz-placeholder">加载题目中…</div>` +
    `</div>`;
  parent.children[index] = { type: 'html', value: html };
  return;
}
```

- [ ] **Step 7: rust editable 分支输出 data-block-id + data-expect-***

找到 `if (meta.includes('editable'))` 分支，替换为：

```js
if (meta.includes('editable')) {
  const starter = node.value.replace(/\n+$/, '');
  const starterEnc = encodeURIComponent(starter);
  const highlighted = highlightCode(starter);
  const blockId = nextBlockId();
  let expectAttrs = '';
  if (node.__expect) {
    const { mode, pattern } = node.__expect;
    expectAttrs =
      ` data-expect-mode="${mode}"` +
      ` data-expect-pattern="${encodeURIComponent(pattern)}"`;
  }
  const html =
    `<div class="code-editor" data-block-id="${blockId}" data-starter-code="${starterEnc}"${expectAttrs}>` +
    `<pre class="code-editor-fallback"><code class="language-rust">${highlighted}</code></pre>` +
    `</div>`;
  parent.children[index] = { type: 'html', value: html };
  return;
}
```

- [ ] **Step 8: 运行 `npm run check`**

```bash
cd /Users/fuhaowen/Documents/code/Web/rust_course_web
npm run check
```

Expected: 0 errors。

- [ ] **Step 9: 触发 Markdown 重新解析（Astro 5 缓存坑）**

Astro 5 Content Collections 按文件内容 hash 缓存 Markdown 解析结果，光重启 dev 不会让 remark 插件重跑。追加一个无效空行强制重 hash：

```bash
echo "" >> src/content/chapters/01-getting-started/03-practice.md
echo "" >> src/content/chapters/02-ownership/03-practice.md
```

然后还原：

```bash
git checkout -- src/content/chapters/01-getting-started/03-practice.md src/content/chapters/02-ownership/03-practice.md
```

> 说明：开发期间每次改 remark 插件都需要重做一次以上动作才能看到效果。实现时牢记。

- [ ] **Step 10: 手动验证 remark 输出**

```bash
npm run build
```

构建成功后检查 `dist/chapters/01-getting-started/03-practice/index.html`，搜索 `data-block-id`：

```bash
grep -o 'data-block-id="[^"]*"' dist/chapters/01-getting-started/03-practice/index.html
```

Expected: 每个互动块都有一条，格式形如 `data-block-id="01-getting-started/03-practice#0:0"`。

- [ ] **Step 11: Commit**

```bash
git add src/plugins/remark-rust-codeblock.mjs
git commit -m "feat(remark): assign stable blockId + parse expected blocks

- 新增前置 pass：紧跟 rust editable 的 expected 代码块被合并为前块的判定配置，
  解析 'r\"...\"' 为正则模式，其他为字面模式，从 AST 删除。
- 按 H1 边界维护 tabIdx，按互动块出现顺序维护 blockIdx，为每个 quiz / editable
  分配 blockId = \${articleSlug}#\${tabIdx}:\${blockIdx}，写到 div 的 data-block-id 上。
- editable 块若带 expected，额外写 data-expect-mode / data-expect-pattern。"
```

---

## Task 3：QuizChoice 接入 markBlockResult + 历史徽章

**Files:**

- Modify: `src/components/quiz/QuizChoice.astro`

- [ ] **Step 1: 引入 progress API**

把文件顶部 `<script>` 的第一行（类型声明之前）改为：

```ts
import { markBlockResult, getBlockResult } from '../../lib/progress';
```

> Astro 组件内的 `<script>` 支持 ESM import，构建时自动打包。

- [ ] **Step 2: 在 initQuiz 开头读取 blockId**

在 `function initQuiz(el: HTMLElement): void {` 内、`const kind = ...` 下一行加：

```ts
const blockId = el.dataset.blockId ?? '';
```

- [ ] **Step 3: 渲染题干时插入历史徽章占位**

找到 `el.innerHTML = \`...\`` 模板，把 `.quiz-header` 部分改为：

```ts
<div class="quiz-header">
  <span class="quiz-badge">${kind === 'single' ? '单选题' : '多选题'}</span>
  <span class="quiz-history-badge" hidden></span>
  <div class="quiz-question">${escapeHtml(payload.question)}</div>
</div>
```

- [ ] **Step 4: 加更新徽章的函数并在初始化时调用**

在 `const inputs = Array.from(...)` 之前加：

```ts
const historyBadge = el.querySelector<HTMLSpanElement>('.quiz-history-badge')!;

function refreshHistoryBadge(): void {
  if (!blockId) { historyBadge.hidden = true; return; }
  const latest = getBlockResult(blockId);
  if (latest === 'pass') {
    historyBadge.hidden = false;
    historyBadge.textContent = '✓ 已答对';
    historyBadge.className = 'quiz-history-badge quiz-history-badge-pass';
  } else if (latest === 'fail') {
    historyBadge.hidden = false;
    historyBadge.textContent = '↻ 待重做';
    historyBadge.className = 'quiz-history-badge quiz-history-badge-fail';
  } else {
    historyBadge.hidden = true;
  }
}

refreshHistoryBadge();
```

- [ ] **Step 5: 在提交回调里调用 markBlockResult**

找到 `submitBtn.addEventListener('click', () => { ... const isCorrect = arrEq(...); ... setLocked(true); });`，在 `setLocked(true);` 之前插入：

```ts
if (blockId) {
  markBlockResult(blockId, isCorrect ? 'pass' : 'fail');
  refreshHistoryBadge();
}
```

- [ ] **Step 6: 给 .quiz-history-badge 加样式**

在 `<style is:global>` 里 `.quiz-badge { ... }` 规则之后追加：

```css
.quiz-history-badge {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  line-height: 1.4;
  white-space: nowrap;
}

.quiz-history-badge-pass {
  color: var(--color-success);
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.quiz-history-badge-fail {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
```

- [ ] **Step 7: 运行 `npm run check`**

```bash
npm run check
```

Expected: 0 errors。

- [ ] **Step 8: 手动验证**

启动 dev 服务器（若未启动）：

```bash
npm run dev
```

依次测试：

1. 打开 `http://localhost:4321/chapters/01-getting-started/03-practice` → 「环境与工具链」tab
2. 对第一题（单选：rustup）选择错误答案 `apt-get`，提交 → 红色反馈 ✗；刷新页面 → 题头应出现 `↻ 待重做` 徽章
3. 重做并选择正确答案 `rustup`，提交 → 绿色反馈 ✓；刷新页面 → 徽章变 `✓ 已答对`
4. 点击「重做」 → 徽章保持不变（只由下一次提交改写）

- [ ] **Step 9: Commit**

```bash
git add src/components/quiz/QuizChoice.astro
git commit -m "feat(quiz): persist latest result and show history badge

QuizChoice 读取 data-block-id，提交后调用 markBlockResult 写 pass/fail 到
localStorage；进入时渲染历史徽章（已答对 / 待重做）。点击重做不改 latest。"
```

---

## Task 4：CodeEditor 接入 expect 判定 + 运行结果提示 + 历史徽章

**Files:**

- Modify: `src/components/code/CodeEditor.astro`

> 前置确认：此文件已有 Monaco / textarea fallback、运行按钮、输出区。本 Task 在运行完成路径上插入判定与 markBlockResult。

- [ ] **Step 1: 引入 progress API**

在 `<script>` 顶部加：

```ts
import { markBlockResult, getBlockResult } from '../../lib/progress';
```

- [ ] **Step 2: 在每个 editor host 的初始化处提取 blockId / expect 配置**

在遍历 `.code-editor` 每个 el 的初始化函数中，与读取 `data-starter-code` 紧邻处加：

```ts
const blockId = el.dataset.blockId ?? '';
const expectMode = (el.dataset.expectMode ?? '') as '' | 'literal' | 'regex';
const expectPattern = el.dataset.expectPattern
  ? decodeURIComponent(el.dataset.expectPattern)
  : '';
```

- [ ] **Step 3: 加判定函数**

在初始化函数内（运行按钮回调之前）加：

```ts
/** 依据 expect 配置 + Playground 响应决定 pass/fail，并返回给 UI。 */
function judge(result: { success: boolean; stdout: string; stderr: string }):
  { ok: boolean; label: string; detail?: string } {
  if (!result.success) {
    return { ok: false, label: '✗ 编译或运行失败' };
  }
  if (expectMode === '') {
    return { ok: true, label: '✓ 编译运行通过' };
  }
  const out = (result.stdout ?? '').trim();
  if (expectMode === 'literal') {
    const ok = out === expectPattern;
    return ok
      ? { ok: true, label: '✓ 运行结果符合预期' }
      : { ok: false, label: '✗ 运行结果与预期不符', detail: `期望：\n${expectPattern}\n\n实际：\n${out}` };
  }
  // regex
  try {
    const re = new RegExp(expectPattern, 's');
    const ok = re.test(out);
    return ok
      ? { ok: true, label: '✓ 运行结果符合预期' }
      : { ok: false, label: '✗ 运行结果与预期不符', detail: `正则：${expectPattern}\n\n实际：\n${out}` };
  } catch (e) {
    console.warn('[CodeEditor] 正则语法错误', expectPattern, e);
    return { ok: false, label: '✗ 预期正则语法错误' };
  }
}
```

- [ ] **Step 4: 在运行完成回调里插入判定 + markBlockResult**

找到 `runBtn.addEventListener('click', async () => { ... const res = await executeCode(code); ... 显示 stdout/stderr ... })`，在**拿到 `res` 之后、渲染 UI 之前**加：

```ts
const verdict = judge(res);

// 结果提示行：插在输出区最前（若输出区元素叫 outputEl，名字按现实情况调整）
const resultLine = document.createElement('div');
resultLine.className = `ce-verdict ${verdict.ok ? 'ce-verdict-pass' : 'ce-verdict-fail'}`;
resultLine.textContent = verdict.label;
outputEl.innerHTML = '';  // 清掉旧内容
outputEl.appendChild(resultLine);
if (verdict.detail) {
  const detail = document.createElement('pre');
  detail.className = 'ce-verdict-detail';
  detail.textContent = verdict.detail;
  outputEl.appendChild(detail);
}
// ...（后续把 stdout / stderr 渲染到 outputEl 的既有逻辑继续执行）
```

> **实现提示**：如果当前 CodeEditor.astro 的输出区变量不叫 `outputEl`，替换为实际名字；如果它在渲染前会 clear，该 clear 放到 resultLine append 之前即可。如果它是增量 append，则把 resultLine 放在整个输出区的最顶（insertBefore 到第一个子节点之前）。

- [ ] **Step 5: 调用 markBlockResult**

在上一步之后加：

```ts
if (blockId) {
  markBlockResult(blockId, verdict.ok ? 'pass' : 'fail');
  refreshHistoryBadge();  // 下一步实现
}
```

- [ ] **Step 6: 加历史徽章 DOM + 刷新函数**

找到 CodeEditor 的 toolbar（运行 / 重置 / 复制按钮所在的 div），在它内部追加：

```html
<span class="ce-history-badge" hidden></span>
```

在初始化函数里加（紧跟 `const expectPattern = ...` 之后）：

```ts
const historyBadge = el.querySelector<HTMLSpanElement>('.ce-history-badge')!;

function refreshHistoryBadge(): void {
  if (!blockId) { historyBadge.hidden = true; return; }
  const latest = getBlockResult(blockId);
  if (latest === 'pass') {
    historyBadge.hidden = false;
    historyBadge.textContent = '✓ 已通过';
    historyBadge.className = 'ce-history-badge ce-history-badge-pass';
  } else if (latest === 'fail') {
    historyBadge.hidden = false;
    historyBadge.textContent = '↻ 上次未通过';
    historyBadge.className = 'ce-history-badge ce-history-badge-fail';
  } else {
    historyBadge.hidden = true;
  }
}

refreshHistoryBadge();
```

- [ ] **Step 7: 加样式**

在组件 `<style is:global>` 末尾追加：

```css
.code-editor .ce-history-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  line-height: 1.4;
  white-space: nowrap;
}
.code-editor .ce-history-badge-pass {
  color: var(--color-success);
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.code-editor .ce-history-badge-fail {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.code-editor .ce-verdict {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}
.code-editor .ce-verdict-pass {
  background: rgba(34, 197, 94, 0.1);
  border-left: 3px solid var(--color-success);
  color: var(--color-success);
}
.code-editor .ce-verdict-fail {
  background: rgba(239, 68, 68, 0.1);
  border-left: 3px solid var(--color-error);
  color: var(--color-error);
}
.code-editor .ce-verdict-detail {
  margin-top: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface, #1A1A1E);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: pre-wrap;
  overflow-x: auto;
}
```

- [ ] **Step 8: 运行 `npm run check`**

```bash
npm run check
```

Expected: 0 errors。

- [ ] **Step 9: 手动验证**

> 此时练习文章还没加 expected；先用 Task 1–2 产生的 `data-block-id` 路径验证无 expected 情形。

1. 打开 `http://localhost:4321/chapters/01-getting-started/03-practice` → 「第一个程序」tab 的可编辑代码块
2. 直接点「运行」（TODO 未补全，应编译失败但运行结果可能仍 success=true，视代码而定）；若失败 → 红色 `✗ 编译或运行失败`；徽章显示 `↻ 上次未通过`
3. 把代码补成 `fn main() { println!("Hello, World!"); }` 运行 → 绿色 `✓ 编译运行通过`；刷新 → 徽章 `✓ 已通过`

- [ ] **Step 10: Commit**

```bash
git add src/components/code/CodeEditor.astro
git commit -m "feat(editor): judge run result and persist latest

CodeEditor 读取 data-block-id / data-expect-mode / data-expect-pattern，运行后：
- 无 expect：按 Playground success 布尔判定
- literal：stdout.trim() === pattern
- regex：new RegExp(pattern, 's').test(stdout.trim())
判定结果写 markBlockResult；在输出区顶部显示绿/红提示行（含期望/实际 diff）；
toolbar 展示历史徽章。"
```

---

## Task 5：SectionProgress 区分 practice tab / 普通 tab

**Files:**

- Modify: `src/components/ui/SectionProgress.astro`

- [ ] **Step 1: 引入 setSectionStatus + getBlockResult**

把 `<script>` 顶部 import 改为：

```ts
import {
  markSectionRead,
  markArticleComplete,
  getSectionStatus,
  initArticleSections,
  setSectionStatus,
  getBlockResult,
} from '../../lib/progress';
```

- [ ] **Step 2: 在 tab-panel 包裹逻辑之后，扫描每个 panel 的互动块**

找到 `h1Els.forEach((h1, i) => { ... panels.push(panel); });` 循环结束之后，插入：

```ts
// 每个 panel 的互动块 blockId 列表。长度为 0 = 普通 tab，沿用滚到底。
const panelBlockIds: string[][] = panels.map((panel) =>
  Array.from(
    panel.querySelectorAll<HTMLElement>(
      '.quiz-choice[data-block-id], .code-editor[data-block-id]'
    )
  ).map((n) => n.dataset.blockId ?? '').filter(Boolean)
);

const isPracticeTab = (idx: number) => panelBlockIds[idx].length > 0;
```

- [ ] **Step 3: recompute 函数**

紧跟上面插入：

```ts
function recomputePracticeTab(idx: number): void {
  if (!isPracticeTab(idx)) return;
  const title = panels[idx].dataset.sectionTitle ?? '';
  const allPass = panelBlockIds[idx].every(
    (bid) => getBlockResult(bid) === 'pass'
  );
  setSectionStatus(articleSlug, title, allPass);
}

function recomputeAllPracticeTabs(): void {
  panels.forEach((_, i) => recomputePracticeTab(i));
}
```

- [ ] **Step 4: 改造 setupSentinelObserver — practice tab 跳过哨兵**

替换现有 `setupSentinelObserver` 为：

```ts
function setupSentinelObserver(idx: number) {
  currentObserver?.disconnect();
  if (isPracticeTab(idx)) {
    // practice tab 不依赖滚到底，由 blocks 结果决定
    currentObserver = null;
    return;
  }
  const sentinel = panels[idx]?.querySelector<HTMLElement>('.sp-sentinel');
  if (!sentinel) return;
  const title = panels[idx].dataset.sectionTitle ?? '';
  currentObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        markSectionRead(articleSlug, title);
        currentObserver?.disconnect();
      }
    },
    { rootMargin: '0px 0px -10% 0px' }
  );
  currentObserver.observe(sentinel);
}
```

- [ ] **Step 5: 注册 progress-updated 监听 + 初次 recompute**

把 `refreshTabs();` 紧跟的 `window.addEventListener('progress-updated', refreshTabs);` 改为：

```ts
refreshTabs();
recomputeAllPracticeTabs();  // 首次进入立即按 blocks 计算
window.addEventListener('progress-updated', () => {
  recomputeAllPracticeTabs();
  refreshTabs();
});
```

> 注意：setSectionStatus 内部本身会 dispatch progress-updated。为避免无限循环，setSectionStatus 在 Task 1 Step 5 已做「未变化不触发事件」的早退（`if (prev === completed) return;`）。

- [ ] **Step 6: 处理无 H1 且含互动块的退化分支**

修改无 H1 的早退分支（`if (!hasSections) { ... return; }`），替换为：

```ts
if (!hasSections) {
  const articleContent = document.getElementById('article-content');
  if (!articleContent) return;
  const blockIds = Array.from(
    articleContent.querySelectorAll<HTMLElement>(
      '.quiz-choice[data-block-id], .code-editor[data-block-id]'
    )
  ).map((n) => n.dataset.blockId ?? '').filter(Boolean);

  if (blockIds.length > 0) {
    // 整篇当成单个 practice tab 处理
    const recompute = () => {
      const allPass = blockIds.every((b) => getBlockResult(b) === 'pass');
      if (allPass) markArticleComplete(articleSlug);
      // 失绿：走 setSectionStatus 需要 title；无 H1 时 articles[slug].sections = {}
      // 这里用 markArticleComplete 的反面：直接把 status 回退到 'not-started'
      else {
        // 读当前 store，只在原 status=completed 时回退，避免不必要写入
        // （getArticleStatus 不会触发事件，适合做判断）
        if (getArticleStatus(articleSlug) === 'completed') {
          resetArticle(articleSlug);
        }
      }
    };
    recompute();
    window.addEventListener('progress-updated', recompute);
    return;
  }

  // 纯讲解型无 H1 → 滚到底
  const sentinel = document.createElement('div');
  sentinel.className = 'sp-sentinel';
  articleContent.appendChild(sentinel);
  new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) markArticleComplete(articleSlug);
    },
    { threshold: 0.1 }
  ).observe(sentinel);
  return;
}
```

> **⚠️ 此分支需额外引入 `getArticleStatus` / `resetArticle`**。把 Step 1 的 import 再加两个名字：

```ts
import {
  markSectionRead,
  markArticleComplete,
  getSectionStatus,
  getArticleStatus,   // 新增
  initArticleSections,
  setSectionStatus,
  getBlockResult,
  resetArticle,       // 新增
} from '../../lib/progress';
```

- [ ] **Step 7: 运行 `npm run check`**

```bash
npm run check
```

Expected: 0 errors。

- [ ] **Step 8: 触发 Astro 缓存重解析 + 手动验证**

先强制重解析（remark 插件的缓存同 Task 2 Step 9）：

```bash
echo "" >> src/content/chapters/01-getting-started/03-practice.md
echo "" >> src/content/chapters/02-ownership/03-practice.md
git checkout -- src/content/chapters/01-getting-started/03-practice.md src/content/chapters/02-ownership/03-practice.md
```

重启 dev（如需）。然后验证：

1. 无痕窗口打开 `http://localhost:4321/chapters/01-getting-started/03-practice`
2. 「环境与工具链」tab：tab dot 灰。答对第一题（rustup）→ dot 仍灰（还有多选题 + 编程题未完成）
3. 答对多选题（4 个正确选项都勾）、完成编程题 → 三题全对 → dot 变绿
4. 刷新页面 → dot 仍绿（`progress-updated` 事件首次触发 → recompute → 读 blocks → 仍全 pass）
5. 把其中一题重做并错选提交 → dot 立即由绿变灰
6. 把错题改回正确 → dot 再次变绿
7. 切到「第一个程序」tab → 重复上面流程
8. 切到「变量与可变性」tab，完成题目 → 整篇 articles[slug].status === 'completed'，首页总进度更新

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/SectionProgress.astro
git commit -m "feat(section-progress): practice tab uses blocks result instead of scroll

扫描每个 tab 面板里的 .quiz-choice / .code-editor[data-block-id]：
- 含互动块 → practice tab：跳过滚到底哨兵，监听 progress-updated 触发
  recomputePracticeTab，全 pass 则 setSectionStatus(..., true)，否则 false。
- 无互动块 → 普通 tab：沿用现有 IntersectionObserver 滚到底逻辑。
无 H1 但含互动块的文章也走相同 recompute 逻辑（退化为单 tab）。"
```

---

## Task 6：为现有练习文章补 expected 块

**Files:**

- Modify: `src/content/chapters/01-getting-started/03-practice.md`
- Modify: `src/content/chapters/02-ownership/03-practice.md`

- [ ] **Step 1: 第一章「补全 Hello, World!」加 expected**

在 `01-getting-started/03-practice.md` 中找到「补全 Hello, World!」的 `rust editable` 代码块，在其后紧跟一个 expected 块。修改后完整片段为：

````md
## 编程题：补全 Hello, World!

下面的代码少了一行打印语句。请在 `main` 函数内补上 `println!("Hello, World!");`，然后点「运行」查看输出。

```rust editable
fn main() {
    // TODO: 在此处打印 Hello, World!
}
```

```expected
Hello, World!
```
````

- [ ] **Step 2: 第一章「修复可变性错误」加 expected**

在同一文件中找到「修复可变性错误」的代码块，在其后紧跟：

````md
```rust editable
fn main() {
    let x = 5;
    x = 6;
    println!("{}", x);
}
```

```expected
6
```
````

- [ ] **Step 3: 第二章「修复移动后使用」加 expected**

在 `02-ownership/03-practice.md` 中找到「修复移动后使用」的代码块，修改后：

````md
```rust editable
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;
    println!("{}", s1);
    println!("{}", s2);
}
```

```expected
hello
hello
```
````

- [ ] **Step 4: 第二章「用借用改为不转移所有权」加 expected**

````md
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

```expected
长度：5
hello
```
````

- [ ] **Step 5: 第二章「让函数返回所有权」加 expected**

````md
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

```expected
world
```
````

- [ ] **Step 6: 运行构建确认解析无误**

```bash
npm run build
```

Expected: 构建成功；`dist/chapters/01-getting-started/03-practice/index.html` 里含 `data-expect-mode="literal"` 和 `data-expect-pattern` 属性。

```bash
grep -c 'data-expect-mode' dist/chapters/01-getting-started/03-practice/index.html
grep -c 'data-expect-mode' dist/chapters/02-ownership/03-practice/index.html
```

Expected: 第一个输出 2，第二个输出 3。

- [ ] **Step 7: 手动验证字面匹配**

启动 dev，打开第一章练习，完成「补全 Hello, World!」：

1. 补上 `println!("Hello, World!");` 运行 → 应 pass，徽章 ✓ 已通过
2. 改成 `println!("hello");` 运行 → 应 fail，verdict 显示 `期望：Hello, World!` 与 `实际：hello`

- [ ] **Step 8: Commit**

```bash
git add src/content/chapters/01-getting-started/03-practice.md src/content/chapters/02-ownership/03-practice.md
git commit -m "chore(practice): add expected blocks to editable exercises

为两篇练习文章里 5 个 rust editable 代码题补 expected 块（全部字面匹配），
使练习 tab 能基于 stdout 匹配判定 pass/fail。"
```

---

## Task 7：同步主设计文档

**Files:**

- Modify: `docs/superpowers/specs/2026-04-23-rust-tutorial-design.md`

- [ ] **Step 1: §5 代码块标记规则表补 expected 行**

找到 `## 五、代码块标记规则（方案 B）` 下的表格，在「` ```rust editable `」行之后插入：

```markdown
| ` ```expected ` | 紧跟 `rust editable` 时合并为该题的判定规则；字面匹配 stdout，以 `r"..."` 包裹则为正则匹配（flag=s） |
```

- [ ] **Step 2: §7 练习文章补「完成判定」段**

找到 `## 七、练习文章（同级章节）`。在段末（`进度上，练习文章走与普通文章相同的段落滚动完成规则...` 这段）之前插入新段落：

```markdown
**练习 tab 完成判定**：凡是 tab 内含有 quiz 或 `rust editable` 代码块的 tab，切换为「所有互动块最近一次提交都 pass 才标绿」规则。quiz 按提交正误判定；editable 无 `expected` 时以 Playground `success === true` 判定，有 `expected` 时按字面 / 正则匹配 stdout 判定。详细规则见 `docs/superpowers/specs/2026-04-24-practice-tab-completion-design.md`。

无互动块的 tab 维持滚到底判定不变。同一文章内两种 tab 可混用。
```

并把紧跟的"进度上，练习文章走与普通文章相同的段落滚动完成规则…"改为：

```markdown
进度上，practice tab 走 blocks 判定；非 practice tab 和无 H1 的纯讲解文章沿用段落滚动完成规则。`exercises` / `quizzes` 字段仍保留给未来显式评分，当前不写入。
```

- [ ] **Step 3: §9.1 localStorage 存储结构补 blocks 字段**

找到 `## 九、进度系统` → `### 9.1 存储结构（localStorage）`。把 TS 接口改为：

```typescript
// key: "rust-tutorial-progress"
{
  articles: {
    "getting-started/installation": {
      status: "completed" | "in-progress" | "not-started",
      sections: {
        "速览": true,
        "安装步骤": true,
        "验证安装": false
      }
    }
  },
  blocks: {
    // blockId = `${articleSlug}#${tabIdx}:${blockIdx}`
    // 由 remark 插件分配，值为最近一次提交结果
    "01-getting-started/03-practice#0:0": "pass",
    "01-getting-started/03-practice#0:1": "fail"
  },
  exercises: {
    "fix-mutability": { completed: true, attempts: 3 }
  },
  quizzes: {
    "getting-started": { score: 80, completedAt: "2026-04-23T10:00:00Z" }
  },
  certificate: {
    name: "张三",
    earnedAt: "2026-04-23T10:00:00Z"
  } | null
}
```

- [ ] **Step 4: §9.3 progress.ts 接口补三个新 API**

找到 `### 9.3 接口设计（progress.ts）`。在「文章 & 章节进度」段末、`resetAll` 之前追加：

```typescript
// 互动块 latest（practice tab 完成判定用）
export function markBlockResult(blockId: string, result: 'pass' | 'fail'): void
export function getBlockResult(blockId: string): 'pass' | 'fail' | null

// 双向设置（markSectionRead 只能 set true；practice tab 的 recompute 用这个）
export function setSectionStatus(articleSlug: string, sectionTitle: string, completed: boolean): void
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-23-rust-tutorial-design.md
git commit -m "docs(spec): integrate practice tab completion rules into main design

§5 代码块规则表补 expected；§7 练习文章补「完成判定」小节；§9.1 存储结构
补 blocks 字段；§9.3 progress.ts 接口补 markBlockResult / getBlockResult /
setSectionStatus。详细规则引用 2026-04-24-practice-tab-completion-design.md。"
```

---

## Task 8：端到端手动验证（与 Spec §12 对齐）

**Files:** 无（只读验证）

> 把 Spec §12 的 9 个场景做一遍，任何一条不通过回到相应 Task 修复。

- [ ] **Step 1: 准备**

```bash
npm run build && npm run preview
```

另开无痕浏览器窗口打开 `http://localhost:4321/`。清理 localStorage（DevTools → Application → Local Storage → Clear）。

- [ ] **Step 2: 场景 1 — 首次全对**

1. 打开 `/chapters/01-getting-started/03-practice`
2. 「环境与工具链」tab：所有题目一次答对 → tab 绿
3. 「第一个程序」tab：补全 Hello World 代码运行 → tab 绿
4. 「变量与可变性」tab：全部完成 → tab 绿；整篇文章 status=completed
5. 首页总进度百分比同步上升

Pass 条件：3 个 tab 全绿；首页百分比更新。

- [ ] **Step 3: 场景 2 — 刷新保留绿**

F5 刷新 → 3 个 tab 仍全绿，无需任何交互。

- [ ] **Step 4: 场景 3 — 答错失绿**

在某单选题重做并选错 → 该 tab 立即由绿变灰；首页百分比同步下降。

- [ ] **Step 5: 场景 4 — 改回再变绿**

把刚答错的那题重做并选对 → tab 再次变绿，百分比恢复。

- [ ] **Step 6: 场景 5 — 代码题字面判定**

打开「修复可变性错误」代码块：

1. 修正为 `let mut x = 5; x = 6;` 运行 → pass
2. 改成 `let mut x = 5; x = 7;` 运行 → fail，verdict 显示 `期望：6` / `实际：7`

- [ ] **Step 7: 场景 6 — 代码题正则判定**

（当前练习文章都是字面匹配，本场景需临时加一个正则块测。）

在 `01-getting-started/03-practice.md` 临时把某题的 expected 改为 `r"^\d+$"`，构建并运行 → 输入数字 pass、输入文本 fail。验证完把 expected 改回字面。

- [ ] **Step 8: 场景 7 — 无 expected 的代码题**

临时删除某题的 expected 块，构建。能编译运行的代码 → pass；故意写 `fn main() { let x = }` 运行 → fail。验证完恢复 expected 块。

- [ ] **Step 9: 场景 8 — 重置文章**

回到首页，在练习文章那行的进度灯上悬停 → 红色「↺ 重置进度」出现，点击并确认 → 所有 tab 回灰；DevTools 检查 `localStorage.rust-tutorial-progress` 里不再有该文章的 articles[slug] 和 `${slug}#` 前缀的 blocks。

- [ ] **Step 10: 场景 9 — 混合文章**

临时在 `02-ownership/01-ownership-rules.md` 文章中某 H1 下加一个 quiz single 块，构建。验证：

1. 该 tab 自动从滚到底切换为 practice 规则（答对才绿）
2. 答对 quiz → tab 绿
3. 删除该 quiz 块，构建，刷新 → tab 恢复滚到底规则（需滚到底才绿）

验证完 `git checkout -- src/content/chapters/02-ownership/01-ownership-rules.md` 还原。

- [ ] **Step 11: 若全部通过，收尾**

```bash
git log --oneline -n 8
```

确认本计划所有 Task 都已提交。若发现问题，记录到 TODO 并回到对应 Task 修。

- [ ] **Step 12: 交由 finishing-a-development-branch 决定分支去向**

执行该技能以决定合并本地 / 创建 PR / 保留分支 / 丢弃。

---

## 自审摘要

**Spec 覆盖对照：**

| Spec 节 | 对应 Task |
|---------|-----------|
| §4 判定规则 | Task 3（quiz 判定）、Task 4（代码块判定）、Task 5（tab 级聚合） |
| §5 DSL 扩展 | Task 2（expected 合并 + parseExpected） |
| §6 存储结构 | Task 1 |
| §7 blockId 分配 | Task 2（Step 5–7） |
| §8.1 remark 插件 | Task 2 |
| §8.2 QuizChoice | Task 3 |
| §8.3 CodeEditor | Task 4 |
| §8.4 SectionProgress | Task 5 |
| §8.5 UI 反馈细节 | Task 3 Step 6、Task 4 Step 7 |
| §9 迁移内容 | Task 6 |
| §10 边界情况 | Task 2（正则语法错）、Task 5 Step 6（无 H1 退化）、Task 1（reset 连带清理） |
| §11 更新主文档 | Task 7 |
| §12 验证场景 | Task 8 |

**关键类型 / API 一致性：**

- `blockId` 格式 `${articleSlug}#${tabIdx}:${blockIdx}` 在 Task 2 / Task 5 / Task 1 的 reset 清理里保持一致
- `markBlockResult(blockId, 'pass' | 'fail')` 在 Task 1 定义、Task 3 Step 5、Task 4 Step 5 调用，签名一致
- `setSectionStatus(slug, title, bool)` 在 Task 1 定义、Task 5 Step 3 调用，签名一致
- `data-expect-mode` 取值 `'literal' | 'regex'` 在 Task 2 Step 7 写入、Task 4 Step 2 读取一致
