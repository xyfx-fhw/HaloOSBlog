---
title: "安装 Rust"
description: "用 rustup 在 macOS、Linux、Windows 上安装 Rust 工具链，并验证环境是否就绪"
difficulty: beginner
estimatedTime: 10
keywords: ["rustup", "安装", "工具链", "cargo", "rustc", "环境配置"]
---

# 了解 rustup

## 什么是 rustup

安装 Rust 的官方推荐方式是 **rustup**——它不只是一个安装程序，而是 Rust 的**版本管理器**。

一个类比：rustup 之于 Rust，就像 nvm 之于 Node.js，或者 pyenv 之于 Python。它负责帮你管理 Rust 的版本，而不是让你只能通过系统包管理器装一个固定版本。

你可能会问：为什么不直接装一个固定版本就行？

因为 Rust 发布节奏较快，**每六周发布一次稳定版**。Rust 对向后兼容非常重视（几乎不会破坏已有代码），但新版本通常会带来：
- 更清晰的编译器报错信息（学习期间非常有价值）
- 新的语言特性和标准库 API
- 性能和编译速度改进

此外，Rust 维护三个发布渠道：

| 渠道 | 说明 | 适合谁 |
| --- | --- | --- |
| `stable` | 每六周发布，经过充分测试 | 日常开发，**推荐使用** |
| `beta` | 下一个 stable 的候选版本 | 想提前测试兼容性 |
| `nightly` | 每天构建，包含实验性特性 | 需要 `#![feature(...)]` 的高级用法 |

rustup 让你可以：
- 随时升级到最新稳定版（`rustup update`）
- 在不同渠道之间切换（`rustup default nightly`）
- 为不同项目指定不同版本（在项目目录放 `rust-toolchain.toml`）
- 为嵌入式等目标平台安装交叉编译工具链（`rustup target add`）

> 本教程全程使用 `stable` 渠道，安装时选默认选项即可。

## rustup 安装了什么

运行安装脚本后，你会得到：

| 工具 | 作用 |
| --- | --- |
| `rustc` | Rust 编译器 |
| `cargo` | 包管理器 + 构建工具（最常用的命令） |
| `rustup` | 版本管理器本身 |
| `rustfmt` | 代码格式化工具 |
| `clippy` | 代码检查（lint）工具 |
| `rust-analyzer` | LSP 服务器（IDE 代码补全的基础） |

日常开发中，你打交道最多的是 `cargo`和`rust-analyzer`，`rustc` 通常不需要直接调用。

## rustup 的日常使用

| 命令 | 作用 |
| --- | --- |
| `rustup update` | 升级 Rust 到最新稳定版 |
| `rustup show` | 查看当前安装的工具链信息 |
| `rustup doc` | 在浏览器打开本地离线的 Rust 官方英文文档 |
| `rustup self uninstall` | 完全卸载 Rust 和 rustup |

**建议定期运行 `rustup update`**——Rust 每六周发布新版本，新版本通常会改进编译器的报错信息，学习期间能看到更清晰的提示。

# 安装步骤

## macOS / Linux 安装

打开终端，运行：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

安装脚本会引导你完成安装，选择默认选项（按回车）即可。安装成功后会出现：

```text
Rust is installed now. Great!
```

安装完成后，**重新打开终端**，或者手动加载环境变量：

```bash
source "$HOME/.cargo/env"
```

### macOS：安装链接器

Rust 编译输出需要一个**链接器**把目标文件合并成可执行文件。macOS 上最简单的获取方式是安装 Xcode 命令行工具：

```bash
xcode-select --install
```

如果你已经安装了完整的 Xcode 或 Homebrew，通常已经自带链接器，可以跳过这一步。

### Linux：安装链接器

Linux 用户需要安装 C 编译器（包含链接器）。以 Ubuntu / Debian 为例：

```bash
sudo apt-get install build-essential
```

Fedora / RHEL 系：

```bash
sudo dnf install gcc
```

> **为什么 Rust 需要 C 链接器？** Rust 的标准库和部分 crate 在最终链接阶段依赖系统的 C 链接器（`ld`）。这不是 Rust 的缺陷，而是和操作系统 ABI 集成的必要步骤。

## Windows 安装

访问 [https://rustup.rs](https://rustup.rs) 下载 `rustup-init.exe` 并运行。

### Windows 需要 C++ 构建工具

Windows 上的 Rust 默认使用 MSVC 工具链，这需要 **Visual Studio C++ 构建工具**。安装向导会自动提示你，选择以下组件：

- **C++ 桌面开发**（Desktop development with C++）
- Windows 10/11 SDK
- MSVC 编译器组件

如果不想安装 Visual Studio，可以改用 GNU 工具链（`x86_64-pc-windows-gnu`），但建议初学者使用默认的 MSVC 工具链——兼容性更好，报错信息更清晰。

> **需要多少空间？** Visual Studio 构建工具约需 3-5 GB 磁盘空间。如果磁盘紧张，可以在安装时只选择最小必要组件。

安装完成后打开新终端（命令提示符或 PowerShell），使环境变量生效。

## 验证安装是否成功

在终端中运行：

```bash
rustc --version
```

正常输出类似：

```text
rustc 1.79.0 (129f3b996 2024-06-10)
```

再验证 Cargo：

```bash
cargo --version
```

输出类似：

```text
cargo 1.79.0 (ffa9cf99a 2024-06-03)
```

两个命令都有输出就说明安装成功。

## 常见问题：命令找不到

**macOS / Linux**：如果提示 `command not found`，说明环境变量没有生效。运行：

```bash
source "$HOME/.cargo/env"
```

然后把这行加到你的 `~/.bashrc` 或 `~/.zshrc` 末尾，以后打开终端就自动生效。

**Windows**：如果提示找不到命令，检查 `%USERPROFILE%\.cargo\bin` 是否在系统的 `PATH` 环境变量中。rustup 安装时通常会自动添加，但需要重新打开终端才能生效。
