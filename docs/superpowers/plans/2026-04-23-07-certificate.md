# 子计划 7：学习证书系统（jsPDF）实现计划

> **状态：✅ 已完结（2026-04-27）**
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
>
> ⚠️ **注意：** 此文件为范围定义版本，执行前需补充每个 Task 的完整代码步骤。

**目标：** 实现学习证书页面（`/certificate`），解锁条件为整体进度 ≥90%；支持网页展示（深色主题）和 PDF 导出（浅色主题，客户端 jsPDF 生成，无需后端）；首次领取时填写姓名存入 localStorage。

**架构：** `Certificate.astro` 为证书展示组件（Astro island，client:load）；`/certificate` 页在服务端渲染空壳，客户端检查进度并决定显示证书或进度不足提示；jsPDF 通过 CDN 加载；进度读写复用 sub-plan 4 的 `progress.ts`。

**技术栈：** jsPDF（CDN via esm.sh）、localStorage（复用 progress.ts）、CSS print media query

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 新建 | `src/components/ui/Certificate.astro` | 证书展示组件（网页版深色 + PDF 版浅色） |
| 修改 | `src/pages/certificate.astro` | 证书页：解锁检查 + 姓名填写 + 下载 PDF |
| 修改 | `src/pages/progress.astro` | 完成度 ≥90% 时显示"🎉 领取证书"按钮 |
| 修改 | `src/lib/progress.ts` | 确认 saveCertificateName/getCertificate 已实现（sub-plan 4 应已添加） |

---

## 证书内容（spec 8.5）

| 字段 | 来源 |
|------|------|
| 课程名称 | 硬编码：RUST 互动教程 |
| 学员姓名 | 首次填写，存 localStorage |
| 完成日期 | 自动取当前日期 |
| 完成度百分比 | `getOverallProgress()` |

## 样式规格

**网页展示：** 深色背景（`#0D0D0F`）+ 橙色装饰边框/印章，与全站风格一致

**PDF 导出：** 浅色背景（白底）+ 黑色文字 + 橙色装饰，避免打印时消耗大量墨水

---

## 任务概要

### Task 1: Certificate.astro 组件

- 接收 `name: string`, `earnedAt: string`, `progress: number`
- 渲染证书卡片（深色版，网页展示）
- 包含课程名称、学员姓名、完成日期、完成度
- 装饰元素：橙色边框、Rust logo 文字、印章效果

### Task 2: /certificate 页面逻辑

```typescript
// 客户端逻辑（<script> 标签）
const progress = getOverallProgress();
if (progress < 90) {
  // 显示"进度不足"提示，附进度条和返回学习链接
} else {
  const cert = getCertificate();
  if (!cert?.name) {
    // 显示姓名填写表单
  } else {
    // 显示证书组件 + 下载PDF按钮
  }
}
```

### Task 3: PDF 导出

使用 jsPDF（CDN）：
- 浅色背景版本
- A4 横版或竖版
- 包含所有证书字段
- 装饰元素用 jsPDF 的 rect/text API 绘制
- 下载文件名：`rust-tutorial-certificate-${name}.pdf`

### Task 4: 进度页证书入口

在 `/progress` 页顶部，当 `getOverallProgress() >= 90` 时显示：
```
🎉 恭喜！你已完成 95% 的学习内容。[领取证书 →]
```

---

## 验收标准

- [x] 进度 < 90% 时访问 `/certificate`，显示"进度不足"提示
- [x] 进度 ≥ 90% 时（可在 localStorage 中手动设置测试），显示姓名填写表单
- [x] 填写姓名后显示证书卡片，样式与全站深色风格一致
- [x] 点击"下载 PDF"，生成浅色背景 PDF 并自动下载
- [x] `/progress` 页在高进度时显示"领取证书"按钮
- [x] `npx astro build` 0 errors
