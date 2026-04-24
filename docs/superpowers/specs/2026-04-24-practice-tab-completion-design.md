# 练习 tab 完成判定 — 需求设计文档

**日期**：2026-04-24
**状态**：设计中
**依赖**：子计划 4（进度系统）、子计划 5（练习文章）均已完成

---

## 一、背景

当前章节文档页的 H1 标签（由 `SectionProgress.astro` 渲染）统一使用「滚到底」的完成判定：`IntersectionObserver` 检测到 tab 面板末尾哨兵进入视口，就调用 `markSectionRead(articleSlug, title)` 把 tab 标绿。

这套规则对普通讲解文章合理，但对 **练习文章**（如 `01-getting-started/03-practice.md`）不合适——学员只要滚到页面底部就能拿到绿，跟练习题是否答对无关。

## 二、目标

为包含互动题的 tab 引入 **基于互动结果的完成判定**：

- tab 内所有互动块（quiz + 带期望的 editable 代码块）最近一次提交 / 运行都成功，tab 才绿。
- 规则必须在「重新进入但不操作」「答对又答错」「答错又改对」等场景下行为稳定，与用户对「tab 绿是否保留」的直觉一致。
- 没有互动块的 tab 沿用现有的滚到底判定，不做改动。
- 同一篇文章里可以混用两种 tab（比如一篇里前两个 tab 是讲解、第三个 tab 是练习）。

## 三、术语

| 名词 | 含义 |
|------|------|
| **互动块** | `quiz single`、`quiz multi`、或带 `expected` 的 `rust editable` 代码块；以及 **无 `expected` 但标记 `rust editable`** 的代码块（按"编译通过"判定） |
| **practice tab** | tab 面板内含至少一个互动块 |
| **普通 tab** | tab 面板内不含互动块（讲解型） |
| **blockId** | 互动块的稳定标识：`${articleSlug}#${tabIdx}:${blockIdx}`，由 remark 插件在构建时分配 |
| **latest** | 某 blockId 最近一次提交 / 运行的结果：`'pass' \| 'fail' \| null`（null = 从未提交） |

## 四、完成判定规则

### 4.1 tab 级规则

```text
tab 绿 ⟺ tab 是 practice tab 且 tab 内所有 blockId 的 latest === 'pass'
tab 绿 ⟺ tab 是普通 tab 且被滚到底过（沿用现状）
```

推论（自然成立，无需额外处理）：

- 初始进入，所有 blockId latest 均为 null → tab 非绿。
- 全部答对一遍 → 全员 latest='pass' → tab 绿。
- 重新进入但不操作 → latest 不变 → tab 仍绿。
- 重新进入后 **只重做某些题且都对** → 被重做的 latest 还是 'pass' → tab 仍绿。
- 重新进入后答错任一题 → 该题 latest='fail' → tab 立即失绿。
- 之后把错的那题改对 → 该题 latest='pass' → 全员又 pass → tab 再次变绿。

### 4.2 块级判定

**quiz single / multi**：

- 用户点「提交」后，比较选中集合与 `correct` 数组：相等 → pass；否则 → fail。
- 用户点「重做」**不改** latest（只是解除 UI 锁定，latest 只由下一次「提交」更新）。

**rust editable（无 `expected` 跟随）**：

- 用户点「运行」后，调 Playground `/execute`：`response.success === true` → pass；否则 → fail。
- 编译错误、panic、超时、网络错误一律 fail。

**rust editable（有 `expected` 跟随）**：

- 用户点「运行」后：先检查 `response.success`，false → fail；true 则按 expected 的 mode 判定：
  - `mode === 'literal'`：`stdout.trim() === pattern` → pass；否则 fail。
  - `mode === 'regex'`：`new RegExp(pattern, 's').test(stdout.trim())` → pass；否则 fail。

## 五、DSL 扩展

### 5.1 `expected` 代码块

在 `rust editable` 块后紧跟一个 `expected` 代码块，作为该题的判定依据。

**字面形式**（默认）：

````md
```rust editable
fn main() { println!("长度：5"); }
```

```expected
长度：5
```
````

> 字面内容 trim 后必须与 stdout trim 后严格相等（JS `===`）。

**正则形式**（以 `r"..."` 包裹，仿 Rust raw string）：

````md
```rust editable
fn main() { println!("长度：{}", compute()); }
```

```expected
r"长度：\d+"
```
````

> 内层 `长度：\d+` 作为 `RegExp` 源，flags = `s`（dotall）。

**解析规则**：expected 块内容 trim 后：

```js
if (raw.startsWith('r"') && raw.endsWith('"') && raw.length >= 3) {
  mode = 'regex';
  pattern = raw.slice(2, -1);
} else {
  mode = 'literal';
  pattern = raw;
}
```

**关联规则**：remark 插件在解析 AST 时，对每个 `expected` 代码块回看其前一个兄弟节点：

- 若前一节点是 `rust editable` → 把 `{mode, pattern}` 挂到前一节点的 hProperties 上，并从 AST 删除该 expected 节点（不渲染）。
- 若前一节点不符合 → 保留 expected 节点原样输出（Shiki 没有 expected 语法，会以 plaintext 渲染；作者借此发现语法错误）。

### 5.2 无 `expected` 的 `rust editable`

保持现有写法不变；在运行时按「success=true 即 pass」判定，自动参与所在 tab 的完成判定。

## 六、存储结构扩展

### 6.1 localStorage 字段

```ts
interface ProgressStore {
  articles: Record<string, ArticleProgress>;
  blocks: Record<string /* blockId */, 'pass' | 'fail'>;  // 新增
  exercises: Record<string, { completed: boolean; attempts: number }>;
  quizzes: Record<string, { score: number; completedAt: string }>;
  certificate: { name: string; earnedAt: string } | null;
}
```

- `blocks[blockId]` 只记录 `pass | fail`；从未提交的块不写入（相当于 `null`）。
- articles[slug].sections[title] 继续用 `boolean`，由 practice tab 的判定函数派生写入。

### 6.2 progress.ts 新增 / 修改 API

```ts
// 新增
export function markBlockResult(blockId: string, result: 'pass' | 'fail'): void;
export function getBlockResult(blockId: string): 'pass' | 'fail' | null;

// 新增：practice tab 需要能双向设置 sections[title]（markSectionRead 只能 set true）
export function setSectionStatus(
  articleSlug: string,
  sectionTitle: string,
  completed: boolean
): void;

// 修改：在清理 articles[slug] 的同时，删除 blocks 里所有以 `${slug}#` 开头的 key
export function resetArticle(slug: string): void;
export function resetChapter(chapterKey: string): void;  // 同理，清理该章节所有文章相关 blocks
export function resetAll(): void;  // 清空 blocks
```

markBlockResult 内部在更新完 blocks 后 `dispatchEvent('progress-updated')`，让 SectionProgress 重算 tab 状态。

## 七、blockId 分配

remark 插件 `remark-rust-codeblock.mjs` 在遍历 AST 时同步分配：

```js
let currentTabIdx = -1;   // 遇到第一个 H1 才变 0
let blockIdxInTab = 0;

visit(tree, ['heading', 'code'], (node) => {
  if (node.type === 'heading' && node.depth === 1) {
    currentTabIdx += 1;
    blockIdxInTab = 0;
    return;
  }
  if (node.type === 'code' && isInteractiveBlock(node)) {
    const blockId = `${articleSlug}#${Math.max(currentTabIdx, 0)}:${blockIdxInTab}`;
    blockIdxInTab += 1;
    // 把 blockId 写到生成的 div 的 data-block-id 上
  }
});
```

- articleSlug 来自 `file.history[0]`，剥去 `src/content/chapters/` 前缀与 `.md` 后缀（同 content.ts 的 slug 规则）。
- 文章无 H1 时 `currentTabIdx` 留在 -1，用 `Math.max(-1, 0) = 0` 兜底，视作「单 tab」。

## 八、组件改动

### 8.1 remark-rust-codeblock.mjs

- 新增 expected 合并 pass（在 visit 之前）。
- 互动块 div 上新增属性：
  - `data-block-id="..."`（所有互动块）
  - `data-expect-mode="literal|regex"`（仅带 expected 的 editable）
  - `data-expect-pattern="..."`（encodeURIComponent）

### 8.2 QuizChoice.astro

- 初始化读取 `dataset.blockId`；提交后调 `markBlockResult(blockId, isCorrect ? 'pass' : 'fail')`。
- 水合时若 `getBlockResult(blockId) === 'pass'`，在 quiz-badge 旁加小徽章 `✓ 已答对`（淡绿）；`=== 'fail'` 则加 `↻ 待重做`（淡红）；`null` 不显示徽章。
- 点「重做」不调用 markBlockResult，也不清徽章（徽章反映 latest，重做是 UI 状态，不影响 latest）。

### 8.3 CodeEditor.astro

- 初始化读取 `dataset.blockId` / `dataset.expectMode` / `dataset.expectPattern`。
- 点「运行」后在原有输出区逻辑之上：
  - 若有 expect：按 §4.2 判定并在输出顶部注入一行结果提示（绿 / 红）；
  - 若无 expect：仅按 `success` 判定，提示简化为「✓ 编译运行通过」/「✗ 编译或运行失败」。
  - 两种路径最后都 `markBlockResult(blockId, result)`。
- 水合时同样根据 latest 显示徽章。

### 8.4 SectionProgress.astro

水合逻辑调整：

1. 对每个 tab 面板（构建 DOM 包裹时）统计该面板内 `.quiz-choice[data-block-id]` 与 `.code-editor[data-block-id]` 的个数与 blockId 集合。
2. 若该 tab 的 blockId 集合非空 → **practice tab**：
   - 不挂滚到底哨兵。
   - 写一个 `recomputeTab(tabIdx)` 函数：读所有 blockId 的 latest，`every === 'pass'` → `setSectionStatus(slug, title, true)`；否则 `setSectionStatus(slug, title, false)`。
   - 监听 `progress-updated` 事件，对本文章的所有 practice tab 都跑一遍 recompute。
   - 初始化时立即跑一次（确保刷新页面后状态正确）。
3. 若 blockId 集合为空 → **普通 tab**：维持现有滚到底哨兵逻辑。

> `setSectionStatus` 的定义见 §6.2。

### 8.5 UI 反馈（细节）

- QuizChoice 徽章样式：复用 `quiz-badge` 配色系统，体积略小，字号 0.7rem。
- CodeEditor 结果提示行：紧贴输出区顶部，边框左侧高亮（绿/红），内容单行可 trim。
- 不对 tab dot 颜色做额外改动——继续沿用灰 / 橙（active 且未完成）/ 绿。

## 九、迁移现有内容

### 9.1 需要改动的练习文章

| 文件 | 改动 |
|------|------|
| `src/content/chapters/01-getting-started/03-practice.md` | 2 个 `rust editable`：「补全 Hello, World!」加 `expected` 为 `Hello, World!`；「修复可变性错误」加 `expected` 为 `6` |
| `src/content/chapters/02-ownership/03-practice.md` | 3 个 `rust editable`：用 `r"..."` 或字面匹配，按题目期望输出填写（如「修复移动后使用」两行 `println!` 都要输出 `hello` → 字面 `hello\nhello`；「用借用改为不转移所有权」→ `长度：5\nhello`；「让函数返回所有权」→ `world`） |

不加 expected 也能工作（走 success 判定），但有 expected 判定更精确。

### 9.2 不变动的内容

讲解文章（`00-index.md` / `01-*.md` / `02-*.md`）不含 quiz，也无需加 expected——它们的 `rust runnable` 代码块走独立的 CodeRunner 组件，不受本设计影响。

## 十、边界情况与兼容性

| 场景 | 行为 |
|------|------|
| 练习文章无 H1（理论上不该，但防御） | `currentTabIdx` 兜底为 0；整篇视作单 tab；无 H1 分支下 SectionProgress 对 practice 内容的处理：检测到 `#article-content` 内有互动块 → 用 recompute 逻辑；否则保持原滚到底 |
| expected 块写了但其 pattern 为空字符串 | pattern === '' 时：literal → stdout trim === '' 才 pass（合理）；regex → 空正则一律 pass（对 pattern === '' 做兜底，跳回 literal） |
| 正则语法错误（如 `r"["`） | `new RegExp` 抛异常，捕获后视为 fail，同时在控制台 warn |
| 用户切换工具链 / 网络错 | Playground 请求失败 → 视为 fail；不破坏其它块的 latest |
| 同一 blockId 多次运行 | 后写覆盖前写，latest 永远是最新一次结果 |
| 用户重置文章 / 章节 / 全部 | 相关 blocks[blockId] 同步清理，所有 tab 立即回到非绿 |

## 十一、需要更新的既有文档

- `docs/superpowers/specs/2026-04-23-rust-tutorial-design.md`：
  - §5 代码块标记规则表：为 `rust editable` 加一行「可带 `expected` 代码块配置判定」
  - §7 练习文章：新增「完成判定」小节，引用本文档
  - §9.1 localStorage 存储结构：补 `blocks` 字段
  - §9.3 progress.ts 接口列表：补 `markBlockResult` / `getBlockResult` / `setSectionStatus`

## 十二、验证（手动）

至少覆盖以下场景，所有与主文档 §9 的进度计算（总进度 / 章节进度）联动正确：

1. **首次全对**：新开无痕窗口 → 打开 `01-getting-started/03-practice.md` → 切到「环境与工具链」tab → 全部答对 → tab 变绿；再切「第一个程序」tab 把 Hello World 写对、运行 → 绿；最后 tab 同理 → 整篇 completed。
2. **刷新保留绿**：上述状态下刷新页面 → tab 仍全绿，不需要任何交互。
3. **答错失绿**：把某单选题重做但选错选项 → 该 tab 立即由绿变灰；首页总进度同步下降。
4. **改回再变绿**：把刚答错的那题重做并选对 → tab 再次变绿。
5. **代码题字面判定**：把 `println!("长度：5")` 改成 `println!("长度：6")` 再运行 → fail 提示 + tab 失绿。
6. **代码题正则判定**：正则题用一个符合正则的输出运行 → pass；改成不符合的输出 → fail。
7. **无 expected 的代码题**：能编译运行 → pass；故意写编译错（如删个分号）→ fail。
8. **重置文章**：首页悬停「↺ 重置进度」确认 → 所有 blocks 也一并清空，tab 全灰。
9. **混合文章**：在某讲解文章里手工加一个 quiz block（验证时用，不入库）→ 该 tab 自动变练习规则；删除后恢复滚到底。

---

**文档结束。** 实现将按本文档执行，详细任务拆分由后续 `writing-plans` 阶段的 plan 文档承担。
