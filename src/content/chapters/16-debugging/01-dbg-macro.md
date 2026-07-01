---
title: "dbg! 宏：快速打印调试"
description: "学会用 dbg! 宏替代 println! 进行快速调试，理解其返回值特性与使用技巧。"
difficulty: beginner
estimatedTime: 15
keywords: ["dbg!", "调试", "打印调试", "宏"]
---

# 认识 dbg!

`dbg!` 是 Rust 标准库内置的调试宏。和 `println!` 比起来，它有两大优势：

1. **自动打印文件名、行号、表达式文本和值**，不需要手写格式字符串
2. **返回表达式的值**，可以嵌套在任意表达式中而不破坏逻辑

一句话记忆：`dbg!` 就像给表达式加了个"临时监控探针"，随插随拔。

## 基本用法

最简单的用法：把变量或表达式传给 `dbg!`。

```rust runnable
fn main() {
    let x = 5;
    let y = x * 2;

    dbg!(x);       // 打印 x 的值
    dbg!(y + 1);   // 打印表达式的值
}
```

输出结果：

```text
[src/main.rs:4] x = 5
[src/main.rs:5] y + 1 = 11
```

注意输出格式：`[文件名:行号] 表达式 = 值`。这比 `println!("x = {}", x)` 少打很多字，而且**行号是自动的**，不需要你记住在哪一行插的调试语句。

## dbg! 会返回值

这是 `dbg!` 最独特的特性：它不是吞掉值，而是**把值的所有权返回出来**。

```rust runnable
fn main() {
    // dbg! 返回值，所以可以直接在表达式里用
    let x = dbg!(5 * 3) + 1;  // 先打印 "5 * 3 = 15"，再用返回值 15 加 1
    println!("x = {}", x);     // x = 16
}
```

这意味着你可以把 `dbg!` 插入计算链的中间，不改变程序逻辑：

```rust runnable
fn double(n: i32) -> i32 {
    n * 2
}

fn main() {
    // 原来的代码: let result = double(double(3));
    // 加入调试: 查看中间结果
    let result = double(dbg!(double(3)));
    println!("result = {}", result);
}
```

输出：
```text
[src/main.rs:8] double(3) = 6
result = 12
```

## 和 println! 的对比

| 特性 | `println!` | `dbg!` |
|------|-----------|--------|
| 需要格式字符串 | ✓ | ✗（自动） |
| 打印行号 | ✗（手动写） | ✓（自动） |
| 打印表达式文本 | ✗ | ✓（自动） |
| 返回值 | ✗（返回 `()`） | ✓（返回原值） |
| 输出到 | stdout | **stderr** |
| 需要 `Display` | ✓ | ✗（只需 `Debug`） |

> **输出到 stderr**：`dbg!` 的输出走 stderr，而 `println!` 走 stdout。这样在重定向程序输出时（`./app > output.txt`），调试信息不会混入结果文件里。

## 需要 Debug trait

`dbg!` 内部使用 `{:?}` 格式化，因此类型必须实现 `Debug` trait。基本类型、标准库类型都已实现。自定义类型加上 `#[derive(Debug)]` 即可：

```rust runnable
#[derive(Debug)]  // 必须加这个，否则 dbg! 报错
struct Point {
    x: f64,
    y: f64,
}

fn main() {
    let p = Point { x: 1.0, y: 2.5 };
    dbg!(&p);  // 借用，避免所有权转移
}
```

输出：
```text
[src/main.rs:10] &p = Point {
    x: 1.0,
    y: 2.5,
}
```

注意这里传的是 `&p`（引用）而不是 `p`。如果传 `p`，`dbg!` 会取得所有权并返回，后续就不能用 `p` 了。

# 实战技巧

## 同时调试多个值

`dbg!` 支持多个参数，一次打印多个表达式：

```rust runnable
fn main() {
    let a = 10;
    let b = 20;
    let c = a + b;

    dbg!(a, b, c);  // 三个值一起打
}
```

输出：
```text
[src/main.rs:6] a = 10
[src/main.rs:6] b = 20
[src/main.rs:6] c = 30
```

## 在循环中调试

在循环体里用 `dbg!` 可以追踪每次迭代的中间状态：

```rust runnable
fn main() {
    let mut sum = 0;
    for i in 1..=5 {
        sum += i;
        dbg!(i, sum);  // 追踪每轮 i 和累加结果
    }
}
```

## 在 if/match 条件中调试

有时你想知道某个条件判断里的值是什么，`dbg!` 可以不破坏条件逻辑地插入：

```rust runnable
fn classify(n: i32) -> &'static str {
    if dbg!(n) > 0 {   // 打印 n，并把 n 的值返回给 if 使用
        "正数"
    } else if n < 0 {
        "负数"
    } else {
        "零"
    }
}

fn main() {
    println!("{}", classify(42));
    println!("{}", classify(-5));
}
```

## release 模式下的行为

`dbg!` 在 **release 模式**（`cargo build --release`）下仍然会输出，不会自动消除。

如果想让调试代码只在开发时生效，有两种方式：

**方式一：手动删除**（最简单，调试完就清理）

**方式二：使用条件编译**

```rust runnable
fn main() {
    let x = 42;

    // 只在 debug 模式下执行
    #[cfg(debug_assertions)]
    dbg!(x);

    println!("x = {}", x);
}
```

> **最佳实践**：`dbg!` 是临时调试工具，调试完成后应该**删掉**，不要提交到版本库。把它当便利贴用，用完撕掉。

## 无参数用法

`dbg!()` 不传参数时，只打印文件名和行号——相当于一个"我执行到这里了"的标记：

```rust runnable
fn process(x: i32) -> i32 {
    dbg!();  // 确认函数被调用了
    if x > 0 {
        dbg!();  // 确认走了这个分支
        x * 2
    } else {
        x
    }
}

fn main() {
    process(5);
    process(-1);
}
```

# 练习题

## dbg! 基础测验

```rust
fn square(n: i32) -> i32 {
    n * n
}

fn main() {
    let result = square(dbg!(3 + 1));
    println!("{}", result);
}
```

```quiz single
Q: 上面的代码，`dbg!(3 + 1)` 会打印什么？
- 什么都不打印
+ `[src/main.rs:5] 3 + 1 = 4`
- `[main.rs:5] 3 + 1 = 7`
- `3 + 1 = 4`
E: dbg! 的输出格式是 `[文件名:行号] 表达式文本 = 值`。`3 + 1` 的结果是 4，不是 7。输出会包含文件名和行号。
```

```quiz single
Q: `dbg!(x)` 和 `println!("{:?}", x)` 最主要的区别是什么？
- dbg! 只能用于数字类型
+ dbg! 会返回 x 的值，可以嵌套在表达式中使用
- println! 无法打印复杂类型
- dbg! 只在 release 模式下有效
E: dbg! 最大的特点是返回值（所有权），所以可以插入任何表达式中而不改变程序逻辑。println! 返回 ()，无法嵌套。
```

```quiz single
Q: dbg! 的输出写入哪里？
+ 标准错误（stderr）
- 系统日志
- 日志文件
- 标准输出（stdout）
E: dbg! 输出到 stderr，这样在重定向 stdout 时不会混入调试信息，适合在命令行工具中使用。
```

```quiz multi
Q: 以下哪些情况适合使用 dbg! 而不是 println!？
+ 调试链式调用中某一步的返回值
+ 想快速查看一个中间计算结果
- 在生产环境记录运行日志
- 向用户显示程序状态
+ 需要知道代码走到了哪一行
E: dbg! 是临时调试工具，适合快速查看值和追踪执行路径。生产日志和用户输出应该用 log 库和 println!。
```

```quiz single
Q: 对于自定义结构体，使用 dbg! 的前提是什么？
- 不需要任何前提
- 实现 Clone trait
+ 实现 Debug trait（通常用 #[derive(Debug)]）
- 实现 Display trait
E: dbg! 内部使用 {:?} 格式化，依赖 Debug trait。基本类型已内置实现，自定义类型需要手动派生 #[derive(Debug)]。
```
