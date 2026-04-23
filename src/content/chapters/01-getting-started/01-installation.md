---
title: "安装 Rust"
description: "学习如何在 macOS、Linux、Windows 上安装 Rust 工具链"
difficulty: beginner
estimatedTime: 15
keywords: ["安装", "rustup", "环境配置", "工具链"]
---

## Rustup 简介

`rustup` 是 Rust 官方的工具链版本管理器，负责：

- 安装和更新 Rust 编译器（`rustc`）
- 管理多个 Rust 版本（stable、beta、nightly）
- 安装标准库和工具组件

## 安装步骤

**macOS / Linux：** 在终端中运行：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

安装程序会引导你完成安装，选择默认选项（按回车）即可。

**Windows：** 访问 [rustup.rs](https://rustup.rs) 下载 `rustup-init.exe` 并运行。安装完成后打开新终端使环境变量生效。

## 验证安装

```bash
rustc --version
cargo --version
```

应输出类似：

```
rustc 1.78.0 (9b00956e5 2024-04-29)
cargo 1.78.0 (54d8815d0 2024-04-09)
```

两个命令均有输出，说明安装成功。
