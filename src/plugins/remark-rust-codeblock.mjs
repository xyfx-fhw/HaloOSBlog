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
 *     <pre class="code-runner-pre"><code class="language-rust">可见代码的 HTML 转义文本</code></pre>
 *   </div>
 */

import { visit } from 'unist-util-visit';

// HTML 特殊字符转义（`&`、`<`、`>`）
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
 * remark 插件主函数。
 */
export default function remarkRustCodeblock() {
  return function transformer(tree) {
    visit(tree, 'code', (node, index, parent) => {
      // 只处理 lang 为 `rust` 且 meta 中包含 `runnable` 的节点
      if (node.lang !== 'rust') return;
      const meta = node.meta ?? '';
      if (!meta.includes('runnable')) return;

      // 确定运行模式
      const mode = meta.includes('expect-error') ? 'expect-error' : 'run';

      // 解析代码行
      const { fullLines, visibleLines, hasHidden } = parseCodeLines(node.value);

      // 编码后的代码字符串
      const dataFullCode = encodeLines(fullLines);

      // 可见代码的 HTML 转义文本（用于展示）
      const visibleCode = visibleLines.join('\n');
      const escapedVisible = escapeHtml(visibleCode);

      // 构造 data 属性字符串
      let dataAttrs = `data-mode="${mode}" data-full-code="${dataFullCode}"`;
      if (hasHidden) {
        const dataVisibleCode = encodeLines(visibleLines);
        dataAttrs += ` data-visible-code="${dataVisibleCode}" data-has-hidden="true"`;
      }

      // 构造输出 HTML
      const html =
        `<div class="code-runner" ${dataAttrs}>` +
        `<pre class="code-runner-pre"><code class="language-rust">${escapedVisible}</code></pre>` +
        `</div>`;

      // 将原节点替换为 html 节点
      parent.children[index] = { type: 'html', value: html };
    });
  };
}
