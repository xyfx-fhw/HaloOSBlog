/**
 * remark-bold-class.mjs
 *
 * 区分 **bold**（星号）与 __bold__（下划线）两种加粗语法，
 * 分别为生成的 <strong> 元素添加不同 class：
 *   **text** → class="strong-star"  （蓝色加粗）
 *   __text__ → class="strong-under" （渐变彩色加粗）
 *
 * 实现原理：
 *   remark 的 mdast 不区分两种语法，但 node.position.start.offset
 *   指向原始源码的字符位置，通过读取该字符（'*' 或 '_'）即可区分。
 */

import { visit } from 'unist-util-visit';

export default function remarkBoldClass() {
  return function transformer(tree, file) {
    const src = String(file);

    visit(tree, 'strong', (node) => {
      if (!node.position) return;

      const marker = src[node.position.start.offset];
      const cls = marker === '_' ? 'strong-under' : 'strong-star';

      node.data = node.data ?? {};
      node.data.hProperties = node.data.hProperties ?? {};
      node.data.hProperties.className = [cls];
    });
  };
}
