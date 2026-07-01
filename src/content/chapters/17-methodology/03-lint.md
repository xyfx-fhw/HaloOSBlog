---
title: "代码质量：Lint、Clippy 与 rustfmt"
description: "掌握 Rust 的 lint 系统、Clippy 静态分析与 rustfmt 格式化，用工具自动化代码规范。"
difficulty: beginner
estimatedTime: 30
keywords: ["lint", "clippy", "rustfmt", "cargo fmt", "#[allow]", "#[deny]", "代码质量"]
---

# Lint 基础

编译器会帮你检查代码能不能运行，而 **lint** 工具则会进一步检查代码**写得好不好**——即使编译通过，lint 也能发现潜在的 bug、低效写法或不符合惯例的代码。

Rust 内置了两层 lint 系统：编译器自带的警告，以及功能更强大的 **Clippy** 工具。

## 编译器内置 lint

Rust 编译器本身就会发出一些警告（warning），这些警告就是最基础的 lint。常见的有：

```rust runnable
fn unused_function() {
    // 未被调用的函数
}

fn main() {
    let x = 5; // 声明了但没用：dead_code / unused_variables
    println!("Hello");
}
```

运行上面代码时，编译器会输出警告：

```text
warning: unused variable: `x`
warning: function `unused_function` is never used
```

> 警告不会阻止编译，但应当认真对待——在成熟项目中，警告数量应尽量保持为零。

## 用属性控制 lint 级别

每条 lint 都可以设置四种级别：

| 级别 | 属性 | 效果 |
|------|------|------|
| 允许 | `#[allow(lint_name)]` | 静默这条警告 |
| 警告 | `#[warn(lint_name)]` | 显示警告（默认） |
| 错误 | `#[deny(lint_name)]` | 将警告升级为编译错误 |
| 禁止 | `#[forbid(lint_name)]` | 错误且不能被 allow 覆盖 |

作用范围可以是整个 crate（`#![]` 内部属性）或单个函数/结构体（`#[]` 外部属性）：

```rust runnable
// 整个 crate 级别：允许未使用代码（调试时常用）
#![allow(dead_code)]
#![allow(unused_variables)]

fn helper() {}   // 不再警告

fn main() {
    let _unused = 42;  // 不再警告
    println!("ok");
}
```

```rust runnable
// 将某条警告升级为错误——适合在 CI 中强制执行
#![deny(unused_must_use)]

fn main() {
    // Result 必须被处理，否则编译失败
    let result: Result<i32, &str> = Ok(1);
    let _ = result; // 需要显式处理
    println!("ok");
}
```

> 生产项目中常见的做法是在 `lib.rs` 或 `main.rs` 顶部添加 `#![deny(warnings)]`，把所有警告都变成错误，配合 CI 确保代码质量。

## 常见内置 lint

| Lint 名称 | 触发场景 |
|-----------|---------|
| `dead_code` | 定义了但从不调用的函数、结构体等 |
| `unused_variables` | 声明了但没有使用的变量 |
| `unused_imports` | 引入了但没有用到的 `use` |
| `unused_must_use` | 没有处理返回 `#[must_use]` 的值（如 `Result`） |
| `non_snake_case` | 变量/函数不符合 snake_case 命名规范 |
| `non_camel_case_types` | 类型名不符合 CamelCase 规范 |

> 用 `_` 前缀可以抑制单个变量的 `unused_variables` 警告：`let _temp = foo();`

# Clippy

## 什么是 Clippy

`cargo clippy` 是 Rust 官方的 lint 工具，内置 **700+ 条规则**，远超编译器自带的警告。它能发现：

- 可以简化的代码
- 常见的性能陷阱
- 容易引发 bug 的写法
- 不符合 Rust 惯例的模式

安装（随 rustup 自动安装，通常已有）：

```bash
rustup component add clippy
```

运行：

```bash
cargo clippy           # 检查当前项目
cargo clippy -- -D warnings  # 将所有 clippy 警告升级为错误（CI 推荐）
```

## Clippy 的 lint 分类

Clippy 把规则分成以下几个类别：

| 分类 | 说明 | 默认状态 |
|------|------|---------|
| `correctness` | 几乎肯定是 bug | **错误**（deny） |
| `suspicious` | 很可能是 bug 或误用 | **警告** |
| `style` | 不符合 Rust 惯用写法 | **警告** |
| `complexity` | 可以简化的复杂写法 | **警告** |
| `perf` | 有更高效的替代写法 | **警告** |
| `pedantic` | 更严格的风格检查 | 默认关闭 |
| `nursery` | 实验性规则 | 默认关闭 |
| `restriction` | 特定场景的限制性规则 | 默认关闭 |

## 典型 Clippy 警告示例

```rust runnable
fn main() {
    // clippy::len_zero：应该用 .is_empty() 代替 .len() == 0
    let v: Vec<i32> = vec![];
    if v.len() == 0 {
        println!("空");
    }

    // clippy::needless_return：不必要的 return
    // clippy 会建议去掉 return

    // clippy::map_unwrap_or：可以用 map_or 替代 .map().unwrap_or()
    let opt: Option<i32> = Some(5);
    let _x = opt.map(|v| v * 2).unwrap_or(0);
    // clippy 建议：opt.map_or(0, |v| v * 2)
}
```

## 针对 Clippy 的属性控制

和内置 lint 一样，可以用属性静默特定 Clippy 规则：

```rust runnable
// 允许整个文件使用某些 clippy 规则
#![allow(clippy::needless_return)]

fn get_value() -> i32 {
    return 42; // clippy 本来会警告这里，现在被静默
}

fn main() {
    // 只允许这一行的特定 clippy 规则
    #[allow(clippy::len_zero)]
    let check = vec![1, 2].len() == 0;
    println!("{}", check);
}
```

> 静默 lint 应该是例外而不是常规操作。遇到 Clippy 警告时，首先思考能否按建议修改，确实有充分理由才 `#[allow]`。

## 常用 Clippy 规则速查

| 规则 | 建议 |
|------|------|
| `clippy::len_zero` | 用 `.is_empty()` 替代 `.len() == 0` |
| `clippy::needless_return` | 去掉多余的 `return` |
| `clippy::clone_on_copy` | `Copy` 类型不需要 `.clone()` |
| `clippy::unwrap_used` | 避免直接 `.unwrap()`，处理错误 |
| `clippy::map_unwrap_or` | 用 `.map_or()` 替代 `.map().unwrap_or()` |
| `clippy::redundant_clone` | 不必要的 `.clone()` |
| `clippy::dbg_macro` | 发布前移除 `dbg!()` 调用 |
| `clippy::todo` | 提醒 `todo!()` 未完成的代码 |

# rustfmt

`rustfmt` 是 Rust 官方的代码格式化工具。它和 Clippy 解决的是不同层面的问题：Clippy 关注**代码逻辑和最佳实践**，rustfmt 关注**代码排版外观**——缩进、空格、换行、括号位置等。

两者的配合：先用 rustfmt 统一格式，消除格式噪音；再用 Clippy 关注实质性的逻辑问题。

## 什么是 rustfmt

rustfmt 按照 Rust 社区约定的风格重新排版代码，消除团队内部的格式争论（"括号要不要换行？""缩进用 2 还是 4 个空格？"）。

安装（随 rustup 自动安装）：

```bash
rustup component add rustfmt
```

运行：

```bash
cargo fmt           # 格式化整个项目（直接修改文件）
cargo fmt --check   # 只检查，不修改（CI 中使用）
```

`cargo fmt --check` 在文件格式不符合规范时以非零退出码退出，适合放入 CI 流水线，强制所有提交都经过格式检查。

## rustfmt.toml 配置

在项目根目录创建 `rustfmt.toml`（或 `.rustfmt.toml`）可以自定义格式规则。大多数项目使用默认规则即可，常见的调整有：

```toml
# rustfmt.toml
edition = "2021"          # Rust 版本（影响部分格式规则）
max_width = 100           # 最大行宽（默认 100）
use_small_heuristics = "Max"  # 尽量把短表达式放在同一行
imports_granularity = "Crate" # 将同一 crate 的 use 合并
group_imports = "StdExternalCrate"  # use 分组：std / 外部 / 本地
```

> **团队项目的建议**：把 `rustfmt.toml` 提交进版本库，保证所有人使用相同的格式规则。同时在 CI 中加上 `cargo fmt --check`，不符合格式的 PR 无法通过。

## 在 CI 中强制格式检查

格式化的最大价值在于**自动化强制**——不依赖每个人手动运行，而是让 CI 帮你把关。典型的 CI 格式检查步骤：

```bash
cargo fmt --check          # 检查格式（不修改文件）
cargo clippy -- -D warnings  # 检查 lint（警告视为错误）
```

当开发者忘记格式化时，CI 会失败，提示其本地运行 `cargo fmt` 后重新提交。

## 与编辑器集成

rustfmt 最常见的使用方式不是手动运行，而是**保存时自动格式化**：

- **VS Code**：安装 rust-analyzer 后，在设置中开启 `editor.formatOnSave = true`，并将 Rust 文件的默认格式化器设为 rust-analyzer
- **其他编辑器**：大多数主流编辑器（Vim、Emacs、IntelliJ）都有对应的 Rust 插件支持保存时格式化

保存时自动格式化后，你几乎不需要再思考格式问题——代码永远保持规范，`cargo fmt --check` 在 CI 中也永远通过。

# 练习题

## Lint 级别

```quiz single
Q: `#[deny(dead_code)]` 的效果是什么？
+ 将 dead_code 警告升级为编译错误，导致编译失败
- 显示 dead_code 警告（默认行为）
- 忽略所有 dead_code 警告
- 禁止写死代码，程序无法运行
E: deny 将指定 lint 从"警告"升级为"错误"——编译器遇到死代码时直接报错，不允许编译通过。这常用于 CI 强制代码质量，确保没有未使用的代码混入生产代码。
```

## 前缀 _ 的作用

```quiz single
Q: 变量命名为 `_result` 而不是 `result`，主要目的是什么？
- 这只是命名习惯，没有实际效果
- _ 前缀让变量不占用内存
+ 告诉编译器这个变量可能故意不使用，抑制 unused_variables 警告
- _ 前缀让变量变成私有的
E: 以 _ 开头的变量名是 Rust 的约定，明确告诉编译器"我知道这个值可能用不到"，从而抑制 unused_variables lint。注意 _ 本身（不带名字）会直接丢弃值，而 _result 仍然绑定了值。
```

## cargo clippy 与 cargo build 的区别

```quiz single
Q: `cargo clippy` 和 `cargo build` 的主要区别是什么？
+ cargo clippy 在编译检查基础上额外运行 lint 规则，给出代码改进建议
- cargo clippy 会生成可执行文件，cargo build 不会
- cargo clippy 只检查语法，不检查逻辑
- 两者完全相同
E: cargo build 只做编译检查（确保代码能编译）。cargo clippy 在此基础上还运行了 700+ 条额外规则，给出风格、性能、潜在 bug 等方面的改进建议，但同样不生成最终可执行文件（用 cargo run 运行）。
```

## #[forbid] 与 #[deny] 的区别

```quiz single
Q: `#[forbid(lint_name)]` 与 `#[deny(lint_name)]` 的区别是什么？
- 没有区别，两者完全相同
- forbid 用于 crate 级别，deny 用于函数级别
+ deny 可以被内层的 allow 覆盖，forbid 不能被覆盖
- forbid 会产生运行时错误，deny 只有编译时错误
E: deny 和 forbid 都将 lint 变成编译错误，但 deny 可以在子模块或函数上用 #[allow] 覆盖掉，而 forbid 一旦设置就无法被任何 allow 撤销——适合用于绝对不允许的行为（如 unsafe 代码）。
```

## rustfmt 使用

```quiz single
Q: `cargo fmt` 和 `cargo fmt --check` 的区别是什么？
+ cargo fmt 直接修改文件；cargo fmt --check 只检查格式是否符合规范，不修改文件，格式不对时以错误码退出
- --check 会检查 Clippy 规则，不带参数只检查格式
- cargo fmt --check 需要 CI 权限才能运行
- 两者功能相同，--check 只是输出更详细
E: CI 中使用 --check 是标准做法，避免 CI 直接修改代码。开发者本地运行 cargo fmt 格式化后提交，CI 用 --check 验证。
```

```quiz single
Q: 为什么推荐把 rustfmt.toml 提交进版本库？
- rustfmt 没有 rustfmt.toml 就无法运行
- rustfmt.toml 包含安全配置，必须版本控制
+ 保证团队所有成员和 CI 使用相同的格式规则，避免格式不一致
- 提交后可以减少 CI 运行时间
E: 如果不提交 rustfmt.toml，每个开发者的本地格式化结果可能不同，造成无意义的格式差异 diff，增加代码审查噪音。统一配置是团队协作的基础。
```
