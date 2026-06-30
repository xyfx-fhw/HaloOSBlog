---
title: "编写单元测试"
description: "掌握 Rust 测试函数的基本结构、常用断言宏、should_panic 属性，以及用 Result 编写测试。"
difficulty: beginner
estimatedTime: 25
keywords: ["单元测试", "#[test]", "assert!", "assert_eq!", "should_panic", "cargo test"]
---

# 测试函数的解剖

在 Rust 里，一个测试就是一个带有 `#[test]` 属性的普通函数。当你运行 `cargo test` 时，Rust 会编译一个专门的测试执行程序，找到所有标注了 `#[test]` 的函数并逐一运行，最后汇报哪些通过、哪些失败。

## 第一个测试

新建一个库项目时，Cargo 会自动帮你生成一个测试模块：

```bash
cargo new adder --lib
```

打开 `src/lib.rs`，可以看到：

```rust runnable
#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
```

几个关键点：

- **`#[cfg(test)]`**：条件编译标记，告诉 Rust 只在执行 `cargo test` 时才编译这个模块，`cargo build` 时不编译，不会浪费编译时间，也不会增大二进制文件体积。
- **`mod tests`**：普通的模块，只是约定俗成地叫 `tests`。
- **`#[test]`**：标记这个函数是一个测试函数。模块内也可以有普通的辅助函数（不加 `#[test]`），用来为测试准备数据。

运行测试：

```bash
cargo test
```

输出示例：

```text
running 1 test
test tests::it_works ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

## 测试是怎么失败的

**测试函数 panic，测试就失败。** 每个测试跑在独立的线程里，如果线程 panic 了，主线程会捕捉到并把这个测试标记为失败。

```rust runnable
#[cfg(test)]
mod tests {
    #[test]
    fn another() {
        panic!("让这个测试失败");  // 主动 panic
    }
}
```

输出示例：

```text
running 1 test
test tests::another ... FAILED

failures:
---- tests::another stdout ----
thread 'tests::another' panicked at '让这个测试失败', src/lib.rs:4:9

test result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out
```

> 这就是所有断言宏的工作原理——当条件不满足时，它们调用 `panic!`，从而让测试失败。

## use super::*

测试模块是嵌套在源码文件里的内部模块，要访问外层模块的内容，需要显式导入：

```rust runnable
pub fn add_two(a: i32) -> i32 {
    a + 2
}

#[cfg(test)]
mod tests {
    use super::*;  // 把外层模块的所有公开（及私有）内容引入

    #[test]
    fn it_adds_two() {
        assert_eq!(4, add_two(2));
    }
}
```

注意 `use super::*` 可以访问**私有函数**，这是 Rust 允许的——测试就在同一个文件里，没有跨越模块边界。

# 断言宏

Rust 标准库提供了三个核心断言宏，覆盖了绝大多数测试场景。

## assert!

`assert!(expr)` —— 断言表达式为 `true`，否则 panic。

```rust runnable
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn larger_can_hold_smaller() {
        let large = Rectangle { width: 8, height: 7 };
        let small = Rectangle { width: 5, height: 1 };
        assert!(large.can_hold(&small));  // 期望为 true
    }

    #[test]
    fn smaller_cannot_hold_larger() {
        let large = Rectangle { width: 8, height: 7 };
        let small = Rectangle { width: 5, height: 1 };
        assert!(!small.can_hold(&large));  // 取反，期望 false 变 true
    }
}
```

## assert_eq! 和 assert_ne!

`assert_eq!(left, right)` 断言两值**相等**；`assert_ne!(left, right)` 断言两值**不相等**。

它们比 `assert!(a == b)` 更好用的地方在于：**断言失败时会打印出具体的两个值**，方便定位问题。

```rust runnable
pub fn add_two(a: i32) -> i32 {
    a + 2
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_adds_two() {
        assert_eq!(4, add_two(2));  // 期望 4，实际 add_two(2) = 4，通过
    }
}
```

故意引入 bug，把 `a + 2` 改成 `a + 3`，失败输出会是：

```text
assertion failed: `(left == right)`
  left: `4`,
 right: `5`
```

清楚地告诉你"期望是 4，实际是 5"。

> **注意**：`assert_eq!` 的两个参数叫 `left` 和 `right`，没有"期望值必须放哪边"的强制约定，但通常习惯把期望值放左边。

使用 `assert_eq!` / `assert_ne!` 的类型必须实现 `PartialEq` 和 `Debug` trait，大多数内置类型已经实现。自定义结构体可以加 `#[derive(PartialEq, Debug)]`。

## 自定义失败信息

断言宏都支持额外的格式化字符串参数，失败时会一并打印出来：

```rust runnable
pub fn greeting(name: &str) -> String {
    format!("你好，{}！", name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greeting_contains_name() {
        let result = greeting("小明");
        assert!(
            result.contains("小明"),
            "问候语中没有包含名字，实际得到的是：`{}`",
            result
        );
    }
}
```

当测试失败时，你会看到具体的 `result` 值，而不是干巴巴的"断言失败"。

# 特殊测试属性

除了 `#[test]`，还有两种常用的测试属性，分别用于测试"应该 panic 的代码"和"应该返回错误的代码"。

## should_panic：测试预期中的 panic

有些函数在接收非法输入时**应该** panic（比如边界检查）。`#[should_panic]` 属性可以测试这类场景：

```rust runnable
pub struct Guess {
    value: i32,
}

impl Guess {
    pub fn new(value: i32) -> Guess {
        if value < 1 || value > 100 {
            panic!("猜测值必须在 1 到 100 之间，实际收到：{}", value);
        }
        Guess { value }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[should_panic]
    fn greater_than_100() {
        Guess::new(200);  // 这里应该 panic，如果没有 panic，测试反而失败
    }
}
```

但 `#[should_panic]` 有个缺点：只要函数 panic 了（不管原因），测试就通过，容易产生误报。

加上 `expected` 参数可以更精确——只有 panic 信息**包含**指定字符串时，测试才通过：

```rust runnable
pub struct Guess {
    value: i32,
}

impl Guess {
    pub fn new(value: i32) -> Guess {
        if value < 1 {
            panic!("猜测值必须大于等于 1，实际收到：{}", value);
        } else if value > 100 {
            panic!("猜测值必须小于等于 100，实际收到：{}", value);
        }
        Guess { value }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[should_panic(expected = "必须小于等于 100")]  // panic 信息必须包含这个子串
    fn greater_than_100() {
        Guess::new(200);
    }
}
```

## 用 Result\<T, E\> 编写测试

除了 panic，也可以让测试函数返回 `Result<(), E>`：

- 返回 `Ok(())` → 测试通过
- 返回 `Err(...)` → 测试失败

```rust runnable
#[cfg(test)]
mod tests {
    #[test]
    fn it_works() -> Result<(), String> {
        if 2 + 2 == 4 {
            Ok(())
        } else {
            Err(String::from("2 + 2 的结果不是 4"))
        }
    }
}
```

这种写法的好处是可以在测试体内使用 `?` 运算符，方便链式调用会返回 `Result` 的函数：

```rust
fn read_file_test() -> Result<(), std::io::Error> {
    let content = std::fs::read_to_string("config.txt")?;  // 失败则测试直接失败
    assert!(content.contains("version"));
    Ok(())
}
```

> **注意**：使用 `Result<T, E>` 的测试**不能**同时使用 `#[should_panic]`。如果想断言某操作返回 `Err`，用 `assert!(result.is_err())` 代替。

# 练习题

## 测验

```quiz single
Q: #[cfg(test)] 的作用是什么？
- 让测试函数更快运行
+ 告诉 Rust 只在 cargo test 时编译这段代码，cargo build 时跳过
- 声明这是一个集成测试模块
- 标记函数可以在测试中被调用
E: #[cfg(test)] 是条件编译标记，它告诉编译器：只有在 test 配置下（即运行 cargo test 时）才编译这个模块。cargo build 时不编译，节省时间和体积。
```

```rust
#[test]
fn another() {
    panic!("oops");
}
```

```quiz single
Q: 上面的测试函数，运行结果是？
- ok（测试通过）
+ FAILED（测试失败）
- 编译错误
- 测试被跳过
E: 测试函数 panic 时，测试就失败。panic! 宏触发 panic，所以 another 会标记为 FAILED。
```

```quiz single
Q: assert_eq!(4, add_two(2)) 与 assert!(add_two(2) == 4) 的主要区别是？
- 前者性能更好
- 前者更严格，后者更宽松
+ 前者失败时会打印出两个值，后者只说"断言失败"
- 没有区别，完全等价
E: assert_eq! 在失败时会用 Debug 格式打印 left 和 right 的具体值，告诉你"期望是 X，实际是 Y"。assert! 只会说断言失败，不给出具体值。
```

```quiz single
Q: 下面哪种写法能更精确地测试"panic 信息包含特定内容"？
- #[should_panic]
+ #[should_panic(expected = "某段文字")]
- #[test(panic = "某段文字")]
- assert_panic!("某段文字")
E: #[should_panic] 只要 panic 了就通过，不管原因。加上 expected 参数后，只有当 panic 信息包含指定子串时才通过，更精确。
```

```quiz single
Q: 使用 Result<(), String> 作为测试函数返回值的主要好处是什么？
- 可以同时使用 #[should_panic]
- 测试运行更快
+ 可以在测试体内使用 ? 运算符，方便传播错误
- 可以不写 #[test]
E: 返回 Result 的测试函数可以在内部使用 ? 运算符——遇到 Err 时测试直接失败，非常适合链式调用返回 Result 的函数。注意：这类测试不能同时使用 #[should_panic]。
```

```quiz single
Q: 在测试模块中写 use super::* 是为了什么？
- 引入标准库的测试工具
+ 把外层模块的内容（包括私有函数）引入测试模块的作用域
- 声明测试模块继承外层模块的所有属性
- 告诉编译器跳过可见性检查
E: tests 是嵌套在源码文件里的内部模块，use super::* 把父模块的内容引入当前作用域，包括私有函数——Rust 允许测试访问私有实现，因为它们在同一文件中。
```

## 编程练习

下面的函数已经写好，请**补全两处 `TODO`**，用 `assert_eq!` 验证 `multiply` 的结果：

```rust editable
pub fn multiply(a: i32, b: i32) -> i32 {
    a * b
}

fn main() {
    // TODO: 用 assert_eq! 验证 multiply(3, 4) == 12
    println!("test normal_multiply ... ok");

    // TODO: 用 assert_eq! 验证 multiply(5, 0) == 0
    println!("test multiply_by_zero ... ok");
}
```

```expected
test normal_multiply ... ok
test multiply_by_zero ... ok
```
