---
title: "集成测试"
description: "理解单元测试与集成测试的分工，掌握 tests/ 目录结构、共享辅助模块和运行指定集成测试文件的方法。"
difficulty: beginner
estimatedTime: 20
keywords: ["集成测试", "tests目录", "单元测试", "#[cfg(test)]", "测试组织", "cargo test"]
---

# 两种测试的分工

Rust 项目通常有两类测试，它们的目标不同、放的地方也不同：

| | 单元测试 | 集成测试 |
|---|---|---|
| **放在哪里** | 与源码同文件（`src/` 目录下） | 独立的 `tests/` 目录 |
| **测什么** | 单个函数/模块的正确性，可以访问私有函数 | 多个模块协作的整体行为，只能访问公有 API |
| **需要 `#[cfg(test)]`** | 是（因为和源码在同一文件） | 否（Cargo 自动识别 `tests/` 目录） |
| **典型用途** | 验证内部实现细节 | 模拟真实用户调用库的方式 |

单元测试发现的是"零件坏了"，集成测试发现的是"零件没坏，但组装有问题"。两者互补，缺一不可。

## 单元测试的组织

单元测试住在源码文件里，用 `#[cfg(test)]` 隔离：

```rust runnable
pub fn add_two(a: i32) -> i32 {
    internal_adder(a, 2)
}

fn internal_adder(a: i32, b: i32) -> i32 {  // 私有函数
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_public() {
        assert_eq!(4, add_two(2));
    }

    #[test]
    fn test_private() {
        // 可以直接测试私有函数！
        assert_eq!(5, internal_adder(3, 2));
    }
}
```

`#[cfg(test)]` 的作用是：`cargo build` 时这个模块完全不存在，只有 `cargo test` 时才编译进去。

# 编写集成测试

## tests/ 目录结构

集成测试放在项目根目录的 `tests/` 目录下（与 `src/` 同级）：

```text
my_project/
├── src/
│   └── lib.rs
└── tests/
    └── integration_test.rs   ← 集成测试文件
```

`tests/` 下每个文件都是一个独立的 crate，Cargo 会在 `cargo test` 时自动编译并运行它们，**不需要** `#[cfg(test)]` 标注。

示例 `tests/integration_test.rs`：

```rust
use adder;  // 引入我们的库 crate

#[test]
fn it_adds_two() {
    assert_eq!(4, adder::add_two(2));
}
```

注意：
- 需要用 `use` 显式引入库，像外部用户一样使用它
- 只能调用**公有** API，私有函数在集成测试中不可见
- 每个文件都是独立 crate，不同文件之间默认不共享代码

运行时，输出会分为三段：

```text
running 1 test                         ← 单元测试
test tests::internal ... ok

running 1 test                         ← 集成测试
test it_adds_two ... ok

running 0 tests                        ← 文档测试
```

## 运行指定的集成测试文件

如果 `tests/` 下有多个文件，可以用 `--test` 指定运行某个文件：

```bash
cargo test --test integration_test
```

只会运行 `tests/integration_test.rs` 中的测试，忽略其他文件。

结合名称过滤，可以更精确：

```bash
cargo test --test integration_test it_adds
```

只运行 `integration_test.rs` 中名称含 `it_adds` 的测试。

## 集成测试中的共享辅助模块

当多个集成测试文件都需要共同的辅助函数时，需要特别注意——**不能**直接创建 `tests/common.rs`。

为什么？因为 `tests/` 下每个 `.rs` 文件都被视为独立的测试 crate，`tests/common.rs` 也会被当成一个独立的测试文件运行，然后显示 `running 0 tests`——让输出变得混乱。

**正确做法**：创建子目录 `tests/common/mod.rs`：

```text
tests/
├── integration_test.rs
└── common/
    └── mod.rs          ← 辅助函数放这里
```

`tests/common/mod.rs` 中写辅助函数：

```rust
pub fn setup() {
    // 测试前的准备工作，比如创建临时文件、初始化数据等
}
```

在集成测试文件中引用它：

```rust
use adder;

mod common;  // 声明模块

#[test]
fn it_adds_two() {
    common::setup();  // 调用辅助函数
    assert_eq!(4, adder::add_two(2));
}
```

子目录里的文件不会被 Cargo 当作独立的测试 crate，测试输出里不会出现多余的 `running 0 tests`。

> **原理**：Cargo 的规则是：`tests/` 下的**直接子 `.rs` 文件**各自是独立 crate；但**子目录下的文件**不是，它们只是普通模块。`tests/common/mod.rs` 走的是第二条路，所以不会被单独编译为测试 crate。

## 二进制项目的集成测试

只有**库 crate**（`src/lib.rs`）才能被集成测试引入。如果你的项目只有 `src/main.rs`（二进制 crate），集成测试就无法用 `use` 引入它的代码。

这是 Rust 生态约定采用**薄 main + 厚 lib** 结构的原因：

```text
src/
├── main.rs   ← 只做参数解析、调用 lib 函数，尽量精简
└── lib.rs    ← 核心逻辑全在这里，方便测试
```

`main.rs` 里调用 `lib.rs` 中的函数；集成测试则通过 `use` 引入 `lib.rs` 测试核心逻辑。`main.rs` 的代码很少，不测也无妨。

# 练习题

## 测验

```quiz single
Q: 集成测试文件放在哪里？
- src/ 目录下，与源码同文件
- 任意位置，用 #[integration_test] 标注
+ 项目根目录的 tests/ 目录下（与 src/ 同级）
- src/tests/ 目录下
E: 集成测试放在 tests/ 目录下，Cargo 会自动识别并在 cargo test 时编译运行。不需要 #[cfg(test)]，也不需要任何特殊标注。
```

```quiz single
Q: 集成测试文件中为什么不需要 #[cfg(test)]？
+ 因为 tests/ 目录本身就是特殊目录，Cargo 只在 cargo test 时编译它
- 因为 #[cfg(test)] 只用于 struct 和 enum
- 因为集成测试不能有条件编译
- 因为集成测试总是编译进最终二进制
E: Cargo 把 tests/ 目录视为特殊目录，只在执行 cargo test 时才编译里面的文件。单元测试需要 #[cfg(test)] 是因为它们和源码在同一文件里，必须用条件编译把测试代码隔开。
```

```quiz single
Q: 集成测试和单元测试相比，主要限制是什么？
- 不能有多个测试函数
- 不能使用 assert! 宏
- 不能并行运行
+ 只能访问库的公有 API，不能访问私有函数
E: 集成测试是从库的"外部"调用的，就像真实用户一样，所以只能访问 pub 标记的公有 API。私有函数只有单元测试（在同一文件内）才能直接测试。
```

```quiz single
Q: 想要多个集成测试文件共享辅助函数，应该怎么做？
- 每个测试文件重复写辅助函数
+ 创建 tests/common/mod.rs 并写 pub fn
- 把辅助函数放在 src/lib.rs 里 pub 导出
- 创建 tests/common.rs 并写 pub fn
E: tests/common.rs 会被 Cargo 当成独立的测试 crate，测试输出里会出现 "running 0 tests" 的噪音。正确做法是 tests/common/mod.rs——子目录下的文件是普通模块，不会被单独运行。
```

```quiz single
Q: 下面关于"薄 main + 厚 lib"结构的说法，哪个是正确的？
- main.rs 和 lib.rs 可以互相调用，没有区别
+ main.rs 尽量精简，核心逻辑放 lib.rs，方便集成测试通过 use 引入
- 这样可以让程序运行更快
- 这只是代码风格建议，对测试没有实际影响
E: 集成测试只能通过 use 引入库 crate（lib.rs），无法引入二进制 crate（main.rs）。把核心逻辑放在 lib.rs 里，集成测试就能覆盖到；main.rs 只负责入口，代码少，不需要专门测试。
```
