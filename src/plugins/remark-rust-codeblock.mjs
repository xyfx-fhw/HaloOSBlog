/**
 * remark-rust-codeblock.mjs
 *
 * Astro remark 插件：将 markdown 中带有 `runnable` meta 的 rust 代码块
 * 转换为 HTML div，供客户端脚本处理交互（运行、复制、隐藏行展开等）。
 *
 * 转换规则：
 *   ```rust runnable           → mode = "run"
 *   ```rust runnable expect-error → mode = "expect-error"
 *   ```rust（无 runnable）    → 不处理，保持原样
 *
 * 隐藏行惯例（沿用 Rust Book）：
 *   以 `# ` 开头（注意有空格）的行为隐藏行。
 *   - data-full-code：去掉 `# ` 前缀后的完整代码（encodeURIComponent 编码）
 *   - data-visible-code：仅可见行（仅当存在隐藏行时才输出此属性）
 *   - data-has-hidden="true"：仅当存在隐藏行时输出
 *
 * 输出 HTML 结构：
 *   <div class="code-runner"
 *        data-mode="run|expect-error"
 *        data-full-code="...url-encoded..."
 *        [data-visible-code="...url-encoded..."]
 *        [data-has-hidden="true"]>
 *     <pre class="code-runner-pre"><code class="language-rust">Shiki 高亮 HTML</code></pre>
 *   </div>
 */

import { visit } from 'unist-util-visit';
import { createHighlighter } from 'shiki';

// 模块加载时初始化 Shiki（top-level await，ESM 支持）
// 之后 highlighter.codeToHtml() 是同步调用，transformer 无需 async
const highlighter = await createHighlighter({
  themes: ['github-dark'],
  langs: ['rust'],
});

// 转义 HTML 标签体内容（不适用于属性值，双引号不转义）
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 用 Shiki 高亮代码，返回 <code> 标签内部的 HTML（不含外层 <pre>）。
 * 出错时回退为纯文本转义。
 */
function highlightCode(code) {
  try {
    const html = highlighter.codeToHtml(code, { lang: 'rust', theme: 'github-dark' });
    // 提取 <code>...</code> 之间的内容（Shiki 输出结构固定）
    const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/);
    return match?.[1] ?? escapeHtml(code);
  } catch {
    return escapeHtml(code);
  }
}

/**
 * 解析代码行，区分隐藏行与可见行。
 *
 * @param {string} code - 原始代码字符串
 * @returns {{ fullLines: string[], visibleLines: string[], hasHidden: boolean }}
 */
function parseCodeLines(code) {
  const lines = code.split('\n');

  // 移除末尾空行（代码块末尾通常有一个多余换行）
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  const fullLines = [];    // 完整代码行（隐藏行去掉 `# ` 前缀）
  const visibleLines = []; // 仅可见行
  let hasHidden = false;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      // 隐藏行：去掉 `# ` 前缀，但内容保留到完整代码中
      hasHidden = true;
      fullLines.push(line.slice(2));
    } else {
      fullLines.push(line);
      visibleLines.push(line);
    }
  }

  return { fullLines, visibleLines, hasHidden };
}

/**
 * 将代码行数组重新拼接为字符串，并用 encodeURIComponent 编码。
 *
 * @param {string[]} lines
 * @returns {string}
 */
function encodeLines(lines) {
  return encodeURIComponent(lines.join('\n'));
}

/**
 * remark 插件主函数（同步 transformer，Shiki 在模块加载时已初始化）。
 */
export default function remarkRustCodeblock() {
  return function transformer(tree) {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'rust') return;
      const meta = node.meta ?? '';
      if (!meta.includes('runnable')) return;

      const mode = meta.includes('expect-error') ? 'expect-error' : 'run';

      const { fullLines, visibleLines, hasHidden } = parseCodeLines(node.value);

      const dataFullCode = encodeLines(fullLines);
      const visibleCode = visibleLines.join('\n');

      const highlightedInner = highlightCode(visibleCode);

      let dataAttrs = `data-mode="${mode}" data-full-code="${dataFullCode}"`;
      if (hasHidden) {
        const fullCode = fullLines.join('\n');
        const fullHighlightedInner = highlightCode(fullCode);
        dataAttrs += ` data-has-hidden="true" data-full-code-hl="${encodeURIComponent(fullHighlightedInner)}"`;
      }

      const html =
        `<div class="code-runner" ${dataAttrs}>` +
        `<pre class="code-runner-pre"><code class="language-rust">${highlightedInner}</code></pre>` +
        `</div>`;

      parent.children[index] = { type: 'html', value: html };
    });
  };
}
