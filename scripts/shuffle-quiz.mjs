#!/usr/bin/env node
/**
 * 将所有 quiz 代码块的选项随机打乱，使正确答案均匀分布在各位置。
 * 同时更新 E: 解析行中对选项位置的引用（第X项、第X个选项、选项X 等）。
 *
 * 用法：node scripts/shuffle-quiz.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const CHAPTERS_DIR = path.join(__dirname, '../src/content/chapters');

// Fisher-Yates 随机打乱
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CN_NUMS = ['一', '二', '三', '四'];
const LETTERS  = ['A', 'B', 'C', 'D'];

/**
 * 更新 E: 解析行中的位置引用。
 * 只处理明确的选项引用模式，避免误改代码逻辑描述：
 *   - 第X项        （第一项、第二项 等，这在 quiz 中专指选项）
 *   - 第X个选项    （明确带"选项"二字）
 *   - 选项X / X选项 / 答案X  （字母形式）
 * 不处理 "第X个push" / "第X个参数" 等代码上下文描述，避免误改。
 */
function remapPositionRefs(text, posMap) {
  // posMap: { oldIdx(number): newIdx(number), ... }
  const cnMap     = {}; // 中文序数：'一' -> '三'
  const numMap    = {}; // 阿拉伯数字：'1' -> '3'
  const letterMap = {}; // 字母：'A' -> 'C'

  for (const [oldIdx, newIdx] of Object.entries(posMap)) {
    const o = Number(oldIdx);
    if (o === newIdx) continue;
    cnMap[CN_NUMS[o]]       = CN_NUMS[newIdx];
    numMap[String(o + 1)]   = String(newIdx + 1);
    letterMap[LETTERS[o]]   = LETTERS[newIdx];
  }

  let result = text;

  // 模式 1：第X项（X 为中文序数词或数字，后接标点/空格/行尾，确保是 quiz 选项而非"第X项目"）
  result = result.replace(
    /第([一二三四1-4])项(?=[：:，。；\s一-龥]|$)/g,
    (m, num) => {
      const mapped = cnMap[num] ?? numMap[num];
      return mapped ? `第${mapped}项` : m;
    }
  );

  // 模式 2：第X个选项（明确包含"选项"）
  result = result.replace(
    /第([一二三四1-4])个选项/g,
    (m, num) => {
      const mapped = cnMap[num] ?? numMap[num];
      return mapped ? `第${mapped}个选项` : m;
    }
  );

  // 模式 3：选项X / 答案X（字母）
  result = result.replace(/(选项|答案)([A-D])/g, (m, pre, letter) => {
    return letterMap[letter] ? `${pre}${letterMap[letter]}` : m;
  });

  // 模式 4：X选项（字母在前）
  result = result.replace(/([A-D])选项/g, (m, letter) => {
    return letterMap[letter] ? `${letterMap[letter]}选项` : m;
  });

  return result;
}

/**
 * 处理单个 quiz 块内容（不含外层 ``` 标记）。
 * 返回 { newContent, correctNewPos[] } 用于统计。
 */
function processQuizContent(raw) {
  const lines = raw.split('\n');

  // 收集选项行索引（以 + 或 - 开头的行）
  const optIdxs = [];
  let eIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^[+\-] /.test(lines[i])) optIdxs.push(i);
    else if (lines[i].startsWith('E:')) eIdx = i;
  }

  if (optIdxs.length < 2) return { newContent: raw, correctNewPositions: [] };

  // 提取选项元数据
  const opts = optIdxs.map((lineIdx, pos) => ({
    lineIdx,
    text: lines[lineIdx],
    isCorrect: lines[lineIdx].startsWith('+ '),
    pos,
  }));

  const shuffled = shuffle(opts);

  // 构建位置映射：旧位置 -> 新位置
  const posMap = {};
  opts.forEach(opt => {
    posMap[opt.pos] = shuffled.findIndex(s => s.lineIdx === opt.lineIdx);
  });

  // 应用打乱后的选项
  const newLines = [...lines];
  shuffled.forEach((opt, newPos) => {
    newLines[optIdxs[newPos]] = opt.text;
  });

  // 更新解析文本中的位置引用
  if (eIdx >= 0) {
    newLines[eIdx] = remapPositionRefs(newLines[eIdx], posMap);
  }

  // 记录正确答案的新位置（用于统计）
  const correctNewPositions = shuffled
    .map((opt, newPos) => (opt.isCorrect ? newPos : -1))
    .filter(p => p >= 0);

  return { newContent: newLines.join('\n'), correctNewPositions };
}

// 统计：正确答案落在各位置的次数
const dist = { single: [0, 0, 0, 0], multi: [0, 0, 0, 0] };

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  let changed = false;
  const newContent = content.replace(
    /```quiz (single|multi)\n([\s\S]*?)```/g,
    (match, type, body) => {
      const raw = `quiz ${type}\n${body.trimEnd()}`;
      const { newContent: processed, correctNewPositions } = processQuizContent(raw);

      correctNewPositions.forEach(pos => {
        if (pos < 4) dist[type][pos]++;
      });

      const result = '```' + processed + '\n```';
      if (result !== match) changed = true;
      return result;
    }
  );

  if (changed && !DRY_RUN) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
  return changed;
}

function walkDir(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full));
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

// ── 主流程 ──────────────────────────────────────────────
const files = walkDir(CHAPTERS_DIR);
let updatedCount = 0;

for (const f of files) {
  if (processFile(f)) {
    console.log(`  ${DRY_RUN ? '[dry]' : 'shuffled'}: ${path.relative(process.cwd(), f)}`);
    updatedCount++;
  }
}

console.log(`\n处理完成：共 ${files.length} 个文件，${DRY_RUN ? '模拟' : '更新了'} ${updatedCount} 个。`);

// ── 分布统计 ─────────────────────────────────────────────
const total = n => n.reduce((a, b) => a + b, 0);
function printDist(label, counts) {
  const t = total(counts);
  if (t === 0) return;
  const bar = n => '█'.repeat(Math.round(n / t * 20)).padEnd(20);
  console.log(`\n${label} 正确答案分布（共 ${t} 道）：`);
  counts.forEach((n, i) => {
    console.log(`  第${i + 1}位  ${bar(n)} ${n} (${t ? ((n / t) * 100).toFixed(1) : 0}%)`);
  });
}
printDist('单选题', dist.single);
printDist('多选题', dist.multi);
