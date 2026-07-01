---
title: "IDE 调试器（rust-analyzer）"
description: "在 VS Code 中配置 Rust 调试环境，掌握断点、单步执行、变量观察等核心调试操作。"
difficulty: beginner
estimatedTime: 25
keywords: ["IDE调试", "rust-analyzer", "CodeLLDB", "断点", "单步调试", "VS Code"]
---

# 配置调试环境

`dbg!` 适合快速排查，但当 bug 涉及复杂的状态变化、循环迭代或多函数调用时，**图形化调试器**会更有效率。你可以暂停程序在任意行，逐步观察每个变量的状态，而不需要插入任何代码。

## 需要安装什么

在 VS Code 中调试 Rust 程序需要两个扩展：

**1. rust-analyzer**（必须）
- Rust 语言服务器，提供代码补全、错误提示、跳转定义
- 搜索 `rust-analyzer`，安装官方扩展（Rust Programming Language 发布）

**2. CodeLLDB**（调试器后端，必须）
- 基于 LLDB 的调试适配器，让 VS Code 能控制 Rust 程序的执行
- 搜索 `CodeLLDB`，安装 Vadim Chugunov 发布的扩展

> 除了 CodeLLDB，也有 **MSVC Debugger**（`ms-vscode.cpptools`）可用于 Windows。本文以 CodeLLDB 为例，它在 macOS/Linux/Windows 上都可用。

## 创建 launch.json

VS Code 需要一个 `launch.json` 文件来知道如何启动调试会话。

**方法一：自动生成（推荐）**

1. 打开 `src/main.rs`
2. 点击左侧活动栏的"运行与调试"图标（或按 `Ctrl+Shift+D` / `Cmd+Shift+D`）
3. 点击"创建 launch.json 文件"
4. 选择 `LLDB` 作为调试器类型

VS Code 会在 `.vscode/launch.json` 生成类似以下内容：

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "lldb",
            "request": "launch",
            "name": "Debug executable 'my_app'",
            "cargo": {
                "args": [
                    "build",
                    "--bin=my_app",
                    "--package=my_app"
                ],
                "filter": {
                    "name": "my_app",
                    "kind": "bin"
                }
            },
            "args": [],
            "cwd": "${workspaceFolder}"
        }
    ]
}
```

关键字段说明：

| 字段 | 说明 |
|------|------|
| `type: "lldb"` | 使用 CodeLLDB 调试器 |
| `request: "launch"` | 启动一个新进程（另一个选项是 `attach` 附加到已运行的进程） |
| `cargo.args` | 构建参数，`--bin=my_app` 指定要调试的二进制名 |
| `args` | 传给程序本身的命令行参数 |
| `cwd` | 程序的工作目录 |

**方法二：手动创建**

在项目根目录创建 `.vscode/launch.json`，复制上面的模板，把 `my_app` 替换成你的 crate 名称（见 `Cargo.toml` 中的 `name` 字段）。

## 验证安装

配置好后，按 `F5` 应该能启动调试会话。如果程序正常结束，调试器会退出。如果遇到 `cargo: command not found` 或类似错误，检查 Rust 工具链是否正确安装（运行 `rustup show`）。

# 调试操作

## 设置断点

断点（Breakpoint）告诉调试器"在这行暂停程序，等我查看状态"。

**设置断点**：在代码编辑器里，点击行号左侧的空白区域，会出现一个红色圆点。

**条件断点**：右键红点 → "编辑断点" → 填入条件表达式（如 `i == 5`），只有条件为真时才暂停，在循环调试时非常有用。

## 启动调试

按 `F5` 或点击"运行与调试"面板里的绿色播放按钮。程序会运行直到遇到第一个断点，然后暂停。

此时顶部会出现**调试工具栏**：

| 按钮 | 快捷键 | 功能 |
|------|--------|------|
| 继续 | `F5` | 继续运行，直到下一个断点 |
| 单步跳过 | `F10` | 执行当前行，不进入函数 |
| 单步进入 | `F11` | 执行当前行，如果是函数调用则进入该函数 |
| 单步跳出 | `Shift+F11` | 运行完当前函数，回到调用处 |
| 重启 | `Ctrl+Shift+F5` | 重新从头开始调试 |
| 停止 | `Shift+F5` | 终止调试会话 |

## 观察变量

程序暂停时，左侧面板会显示：

**变量（Variables）面板**
- 自动列出当前作用域内所有变量及其值
- 可展开结构体、枚举、向量查看内部字段
- 悬停在代码中的变量名上也会弹出当前值

**监视（Watch）面板**
- 手动添加你想持续观察的表达式
- 程序每次暂停都会重新计算这些表达式的值
- 右键添加，或在变量面板右键 → "添加到监视"

**调用堆栈（Call Stack）面板**
- 显示当前的函数调用链
- 点击某一帧可以跳转到对应的代码位置，查看那一帧的局部变量

## 实际调试示例

假设有以下代码，`sum_squares` 函数的结果不对：

```rust runnable
fn sum_squares(nums: &[i32]) -> i32 {
    let mut total = 0;
    for &n in nums {
        // 在这行设断点，观察每轮的 n 和 total
        total += n;  // BUG：忘记平方了
    }
    total
}

fn main() {
    let data = vec![1, 2, 3, 4];
    let result = sum_squares(&data);
    println!("sum of squares = {}", result);  // 期望 30，实际 10
}
```

调试步骤：
1. 在 `total += n;` 这行设断点
2. 按 `F5` 启动调试
3. 程序第一次暂停时，Variables 面板显示 `n = 1`，`total = 0`
4. 按 `F10` 单步跳过，查看 `total` 变为 1
5. 继续按 `F5` 到下一轮循环，发现 `n` 是原始值而非平方值
6. 定位 bug：`n` 没有被平方

## 调试测试函数

如果要调试 `#[test]` 函数，`launch.json` 里的 `cargo.args` 改为：

```json
{
    "type": "lldb",
    "request": "launch",
    "name": "Debug unit tests",
    "cargo": {
        "args": [
            "test",
            "--no-run",
            "--lib"
        ]
    },
    "args": ["test_function_name"],  // 指定要运行的测试函数名
    "cwd": "${workspaceFolder}"
}
```

或者，在 VS Code 里找到测试函数上方出现的 `Run Test | Debug Test` 代码镜头（CodeLens），直接点"Debug Test"——这是最方便的方式，不需要手动配置。

> **rust-analyzer 的 CodeLens 功能**：安装 rust-analyzer 后，`#[test]` 函数和 `fn main()` 上方会自动显示 `▶ Run | Debug` 链接，点击即可一键调试，无需手动管理 launch.json。

# 练习题

## IDE 调试测验

```quiz single
Q: 在 VS Code 中调试 Rust 程序，除了 rust-analyzer 之外还需要安装哪个扩展？
- Rust Test Explorer
- Go 扩展
- C/C++ 扩展（ms-vscode.cpptools）
+ CodeLLDB（vadimcn.vscode-lldb）
E: CodeLLDB 是调试适配器，负责实际控制 LLDB 调试 Rust 程序。C/C++ 扩展的调试器也可以用，但 CodeLLDB 在 macOS/Linux/Windows 上更通用。
```

```quiz single
Q: 调试时按 F10（单步跳过）和 F11（单步进入）的区别是什么？
+ F10 不进入被调用函数，F11 会进入函数内部逐行执行
- 没有区别，效果相同
- F10 更快，F11 更慢
- F10 向下走，F11 向上走
E: F10 把函数调用当作一个整体跳过；F11 会"钻进"被调用的函数，逐行执行其内部代码。调试标准库函数时用 F10，调试自己的函数时用 F11。
```

```quiz single
Q: 条件断点的作用是什么？
+ 只有当指定条件为真时才暂停程序
- 每隔若干步暂停一次
- 在发生编译错误时暂停
- 在函数入口和出口都暂停
E: 条件断点非常适合调试循环——比如只想在第 100 次迭代时暂停，就设条件 `i == 100`，避免每次循环都手动继续。
```

```quiz multi
Q: 以下哪些场景更适合用 IDE 调试器而不是 dbg! 宏？
- 快速打印一两个变量的值
+ 追踪一个调用链很深的 bug，需要逐层展开
+ 调试一个循环中途的异常状态（条件断点）
+ 需要观察十几个变量同时变化的复杂状态
- 确认某个函数是否被调用
E: dbg! 适合快速、轻量的调试；IDE 调试器适合复杂状态、深层调用链、需要交互式探索的 bug。两者互补，不是替代关系。
```

```quiz single
Q: launch.json 中 cargo.args 里 --bin=my_app 的作用是什么？
+ 告诉 Cargo 构建并调试名为 my_app 的二进制目标
- 指定目标平台
- 指定要安装的依赖包名称
- 设置程序的命令行参数
E: Cargo 项目可能有多个二进制目标（多个 [[bin]] 入口）。--bin=name 指定调试哪一个。如果只有 main.rs 一个二进制，通常与 Cargo.toml 里的 name 字段相同。
```
