# 子计划 6：交互式图解组件实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠️ **注意：** 此文件为范围定义版本，执行前需补充每个 Task 的完整代码步骤。

**目标：** 实现 6 个用于解释 Rust 核心概念的交互式图解组件（所有权转移、借用引用、内存布局等），可在 Markdown 文章中通过特殊代码块引用并嵌入。

**架构：** remark 插件扩展（或新增 ` ```diagram ` 解析器）将 Markdown 中的图解代码块转换为对应的 Astro 组件引用；每个图解组件为独立 `.astro` 文件，内嵌 SVG + CSS + vanilla JS 实现交互，不依赖外部图形库。

**技术栈：** SVG、CSS 动画/过渡、vanilla JavaScript、Astro islands（client:visible）

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 新建 | `src/components/diagrams/OwnershipMove.astro` | 所有权转移动画（s1 → s2，s1 失效演示） |
| 新建 | `src/components/diagrams/BorrowRef.astro` | 不可变借用（多个 &T 共存计数） |
| 新建 | `src/components/diagrams/BorrowMut.astro` | 可变借用排他性冲突演示 |
| 新建 | `src/components/diagrams/StackHeap.astro` | 栈与堆内存布局（滑动演示变量分配） |
| 新建 | `src/components/diagrams/LifetimeScope.astro` | 生命周期作用域可视化 |
| 新建 | `src/components/diagrams/StringSlice.astro` | String vs &str 内存关系（ptr/len 变化） |
| 修改 | `src/plugins/remark-rust-codeblock.mjs` | 扩展以支持 ` ```diagram ` 解析 |
| 修改 | `src/content/chapters/02-ownership/01-ownership-rules.md` | 嵌入 OwnershipMove 图解 |
| 修改 | `src/content/chapters/02-ownership/02-borrowing.md` | 嵌入 BorrowRef/BorrowMut 图解 |

---

## Markdown 引用语法（spec 5.5）

````md
```diagram
component: OwnershipMove
props:
  from: s1
  to: s2
```
````

remark 插件解析后输出 `<ownership-move data-from="s1" data-to="s2"></ownership-move>`，
Astro 在构建时将其替换为对应组件的 HTML+CSS+JS 内联输出。

---

## 各组件交互设计

| 组件 | 交互方式 | 关键视觉元素 |
|------|----------|-------------|
| OwnershipMove | 点击"执行移动"按钮，动态演示 s1 失效、s2 接管 | 内存盒子 + 箭头动画 + s1 灰显 |
| BorrowRef | 点击"创建借用"/"销毁借用"，观察借用计数 | 多个 &T 指针线条 + 计数器 |
| BorrowMut | 尝试同时创建两个可变借用，触发冲突红色提示 | 锁图标 + 冲突警告 |
| StackHeap | 滑动演示变量在栈/堆上的分配过程 | 双栏内存示意图 |
| LifetimeScope | 高亮显示变量的有效范围块 | 彩色作用域括号 + 时间轴 |
| StringSlice | 点击选择切片范围，显示 ptr/len 变化 | 字节数组 + 指针标注 |

---

## 任务概要

### Task 1: remark 插件扩展（支持 diagram 块）

在 `remark-rust-codeblock.mjs` 中添加对 ` ```diagram ` 的解析，
将 YAML props 解析后输出对应的自定义元素（供 Astro 静态渲染）。

### Task 2: OwnershipMove.astro

最核心组件，包含：
- 两个"内存盒子"（s1/s2）的 SVG 示意
- 点击按钮触发 CSS 过渡动画：箭头移向 s2，s1 变灰加删除线
- 重置按钮

### Task 3–7: 其余 5 个图解组件

每个组件独立实现，参照各自的交互描述。

### Task 8: 嵌入示例文章

在所有权章节的对应文章中添加图解引用，验证渲染效果。

---

## 验收标准

- [ ] 访问所有权章节文章，OwnershipMove 图解正常显示
- [ ] 点击"执行移动"，s1 灰显，s2 激活，动画流畅
- [ ] BorrowMut 冲突演示：尝试第二个可变借用时显示红色冲突提示
- [ ] 所有图解在移动端屏幕（375px）下不溢出
- [ ] `npx astro build` 0 errors
