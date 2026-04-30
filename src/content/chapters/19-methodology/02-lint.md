---
title: "Lint：让编译器帮你审查代码"
description: "了解 Rust 的 lint 系统，掌握 cargo clippy 的使用方法、常见 lint 分类与属性控制，养成高质量代码习惯。"
difficulty: beginner
estimatedTime: 25
keywords: ["lint", "clippy", "cargo clippy", "#[allow]", "#[warn]", "#[deny]", "代码质量"]
---

编译器会帮你检查代码能不能运行，而 **lint** 工具则会进一步检查代码**写得好不好**——即使编译通过，lint 也能发现潜在的 bug、低效写法或不符合惯例的代码。

Rust 内置了两层 lint 系统：编译器自带的警告，以及功能更强大的 **Clippy** 工具。

# Lint 基础

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

# 练习题

## Lint 级别

```quiz single
Q: `#[deny(dead_code)]` 的效果是什么？
- 忽略所有 dead_code 警告
- 显示 dead_code 警告（默认行为）
+ 将 dead_code 警告升级为编译错误，导致编译失败
- 禁止写死代码，程序无法运行
E: deny 将指定 lint 从"警告"升级为"错误"——编译器遇到死代码时直接报错，不允许编译通过。这常用于 CI 强制代码质量，确保没有未使用的代码混入生产代码。
```

## 前缀 _ 的作用

```quiz single
Q: 变量命名为 `_result` 而不是 `result`，主要目的是什么？
- _ 前缀让变量变成私有的
+ 告诉编译器这个变量可能故意不使用，抑制 unused_variables 警告
- _ 前缀让变量不占用内存
- 这只是命名习惯，没有实际效果
E: 以 _ 开头的变量名是 Rust 的约定，明确告诉编译器"我知道这个值可能用不到"，从而抑制 unused_variables lint。注意 _ 本身（不带名字）会直接丢弃值，而 _result 仍然绑定了值。
```

## Clippy 分类

```quiz multi
Q: 下列哪些是 Clippy 的 lint 分类？
+ correctness（正确性，默认为错误）
+ perf（性能建议）
- memory（内存安全）
+ style（代码风格）
E: Clippy 的主要分类有 correctness、suspicious、style、complexity、perf、pedantic、nursery、restriction。没有专门的 memory 分类——内存安全由所有权系统和编译器保证，不归 Clippy 管。
```

## cargo clippy 与 cargo build 的区别

```quiz single
Q: `cargo clippy` 和 `cargo build` 的主要区别是什么？
- cargo clippy 会生成可执行文件，cargo build 不会
+ cargo clippy 在编译检查基础上额外运行 lint 规则，给出代码改进建议
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
