---
title: "格式化输出"
description: "掌握 println! 等五个打印宏、{} 与 {:?} 占位符、调试输出、位置/命名参数及常用格式规范。"
difficulty: beginner
estimatedTime: 25
keywords: ["println!", "format!", "格式化", "{:?}", "Debug", "#[derive(Debug)]", "格式规范"]
---

# 基础输出

`println!` 是你写下的第一行 Rust 代码就用到的工具，但它的能力远不止打印一句话。Rust 的格式化系统统一处理所有打印相关的操作，并且格式字符串的正确性在**编译时**就能检查——拼写错一个占位符，直接报编译错误，不会等到运行时才发现。

## 五个打印宏

`std::fmt` 模块（Rust 提供的标准库的模块，通常自动加载）提供了五个打印宏，记住它们的分工：

| 宏 | 输出目标 | 换行 |
|---|---------|------|
| `print!` | 标准输出（stdout） | 否 |
| `println!` | 标准输出（stdout） | **是** |
| `format!` | 返回 `String`，不输出 | — |
| `eprint!` | 标准错误（stderr） | 否 |
| `eprintln!` | 标准错误（stderr） | **是** |

**stdout 与 stderr 的区别**：操作系统为每个程序提供了两条独立的输出通道。`print!/println!` 写入 **stdout**（标准输出），用于程序的正常运行结果；`eprint!/eprintln!` 写入 **stderr**（标准错误），用于错误信息、警告和调试诊断。

在终端里两者看起来一样，但它们的用途不同，分开写的好处在于：用户可以把正常输出重定向到文件（`./app > output.txt`），而错误信息仍然显示在终端上；或者反过来只捕获错误（`./app 2> error.log`）。

```rust runnable
fn main() {
    print!("没有换行");
    print!("，继续在同一行\n"); // 手动加换行

    println!("这行自动换行");

    let s = format!("拼接成字符串：{} + {} = {}", 1, 2, 3);
    println!("{}", s);

    // 终端通常也能看到，但博主试了网页好像看不到
    eprintln!("这是错误信息，输出到 stderr");
}
```

> `format!` 是"静默"版本，不打印，只返回 `String`，在需要构建字符串时很有用：`let msg = format!("Hello, {}!", name);`

## `{}` 与 `{:?}`：两种格式化方式

Rust 的占位符有两类，对应两种格式化 trait（后面章节会讲解）：

| 占位符 | 对应 trait | 设计目标 |
|--------|-----------|---------|
| `{}` | `Display` | 面向用户的友好展示 |
| `{:?}` | `Debug` | 面向开发者的调试信息 |
| `{:#?}` | `Debug`（美化版） | 多行缩进，结构更清晰 |

**Display** 和 **Debug** 是两个 trait（可以理解为"能力接口"）：
- **`Display`**：定义类型"给人看"时的样子。`42`、`"hello"`、`true` 这些基本类型都实现了它，但自定义的结构体默认没有，需要手动实现。
- **`Debug`**：定义类型"供调试用"时的样子，格式更详细，通常包含类型名和字段名。可以用 `#[derive(Debug)]` 让编译器自动生成，不需要手写。

简单记：**开发阶段看数据用 `{:?}`，给用户展示用 `{}`**。

> trait 是 Rust 的核心概念，相当于其他语言的"接口"或"协议"。如何自定义 `Display`（控制 `{}` 输出格式）会在**泛型与 Trait 章节**中详细讲解。现在只需知道怎么用 `{:?}` 和 `{:#?}` 就够了。

```rust runnable
fn main() {
    let v = vec![1, 2, 3];

    // {} 只对实现了 Display 的类型有效
    // Vec 没有实现 Display，下面这行会编译报错：
    // println!("{}", v);

    // {:?} 对所有实现了 Debug 的类型有效，Vec 默认支持
    println!("{:?}", v);   // [1, 2, 3]

    // {:#?} 美化打印，多行缩进
    println!("{:#?}", v);
}
```

对于基本类型（数字、字符串、布尔值、元组等），`{}` 和 `{:?}` 都能用。对于自定义类型（结构体、枚举、集合等），需要先告诉 Rust 如何格式化它们。

## 为自定义类型启用调试输出

> 自定义类型是用户自己定义的数据类型（通常是结构体、枚举等），将会在[自定义数据类型](/RustCourse/chapters/04-custom-types/00-index)章节讲解。现在只需要知道其并非 Rust 原生已经完全定义的类型即可。

通过 `#[derive(Debug)]` 属性，可以让编译器**自动生成** `Debug` trait 的实现，不需要手写任何代码。

> `#[...]` 这种写法叫**属性（Attribute）**，会在本章[属性一节](/RustCourse/chapters/02-basic-syntax/07-attributes)详细讲解。现在只需要知道：把 `#[derive(Debug)]` 写在结构体上方，就能让它支持 `{:?}` 打印。

```rust runnable
// 加上这一行，编译器自动帮你实现 {:?} 格式化
#[derive(Debug)]
struct Point {
    x: f64,
    y: f64,
}

#[derive(Debug)]
struct Rectangle {
    top_left: Point,
    bottom_right: Point,
}

fn main() {
    let rect = Rectangle {
        top_left: Point { x: 0.0, y: 10.0 },
        bottom_right: Point { x: 5.0, y: 0.0 },
    };

    println!("{:?}", rect);   // 单行
    println!("{:#?}", rect);  // 多行美化
}
```

## 参数引用：位置与命名

除了按顺序填充 `{}`，还可以用**位置索引**或**命名参数**更灵活地引用：

```rust runnable
fn main() {
    // 顺序填充：按出现顺序依次替换
    println!("{} {} {}", "a", "b", "c");

    // 位置索引：可以重复使用同一个参数
    println!("{0} {1} {0}", "Alice", "Bob"); // Alice Bob Alice

    // 命名参数：更易读
    println!(
        "{subject} {verb} {object}",
        verb = "追",
        object = "小鱼",
        subject = "小猫",
    );
}
```

## 常用格式规范

在 `{}` 的 `:` 后面可以加格式规范，控制数制、宽度、对齐和精度：

### 进制输出

```rust runnable
fn main() {
    let n = 255;
    println!("十进制: {}",   n);      // 255
    println!("二进制: {:b}", n);      // 11111111
    println!("八进制: {:o}", n);      // 377
    println!("十六进制(小): {:x}", n); // ff
    println!("十六进制(大): {:X}", n); // FF
    println!("带前缀:  {:#x}", n);    // 0xff
    println!("带前缀:  {:#b}", n);    // 0b11111111
}
```

### 宽度与对齐

宽度规范会为输出内容分配一个**指定宽度的"格子"**，当内容不足这个宽度时，用空格（或指定字符）填满——对齐方式决定内容靠哪边放。

```rust runnable
fn main() {
    // 右对齐（默认），宽度 20
    println!("{:>20}", "hello");   //                hello

    // 左对齐，宽度 10
    println!("{:<10}", "hello");   // hello

    // 居中，宽度 10
    println!("{:^10}", "hello");   //   hello

    // 用指定字符填充（这里用 '-'），宽度 10
    println!("{:-^10}", "hello");  // --hello---

    // 数字补零，宽度 6
    println!("{:0>6}", 42);        // 000042
    // 等价写法
    println!("{:06}", 42);         // 000042
}
```

### 小数精度

```rust runnable
fn main() {
    let pi = 3.141592653589793;

    println!("{}", pi);        // 完整精度
    println!("{:.2}", pi);     // 保留 2 位小数：3.14
    println!("{:.5}", pi);     // 保留 5 位小数：3.14159
    println!("{:8.3}", pi);    // 宽度 8，3 位小数：   3.142
    println!("{:08.3}", pi);   // 宽度 8，3 位小数，补零：0003.142
}
```

## 小结

| 场景 | 写法 |
|------|------|
| 普通打印 | `println!("{}", val)` |
| 调试打印 | `println!("{:?}", val)` 需要 `#[derive(Debug)]` |
| 美化调试 | `println!("{:#?}", val)` |
| 构建字符串 | `format!("...")` |
| 二进制/十六进制 | `{:b}` / `{:x}` / `{:#x}` |
| 固定宽度 | `{:>10}` / `{:<10}` / `{:^10}` |
| 小数位数 | `{:.2}` |

实现自定义类型的 `Display`（控制 `{}` 的输出格式）属于进阶内容，会在[补充内容：格式化输出进阶](/RustCourse/chapters/22-supplements/02-advanced-formatting)中详细讲解。

# 练习题

## 选择正确的宏

```quiz single
Q: 想把一个格式化字符串存入变量而不直接打印，应该用哪个宏？
- println!
- print!
- eprintln!
+ format!
E: format! 是"静默"版本，返回 String 而不输出到终端。println! 和 print! 直接输出到 stdout，eprintln! 输出到 stderr。
```

## `{}` 与 `{:?}` 的区别

```rust
#[derive(Debug)]
struct Foo(i32);

fn main() {
    let f = Foo(42);
    println!("{:?}", f);
    // println!("{}", f); // 这行会编译报错
}
```

```quiz single
Q: 上面代码中，为什么 `println!("{}", f)` 会报错？
- Foo 结构体没有字段名，不能用 {}
- {} 只能用于数字类型
- 应该写成 println!("{}", f.0)
+ Foo 没有实现 Display trait，{} 要求实现 Display
E: {} 对应 fmt::Display trait，需要手动实现或标准库内置支持。{:?} 对应 fmt::Debug trait，可以通过 #[derive(Debug)] 自动生成。Foo 只 derive 了 Debug，没有实现 Display，所以 {} 无法使用。
```

## `#[derive(Debug)]` 的作用

```quiz single
Q: 给结构体加上 `#[derive(Debug)]` 之后，能做到什么？
- 结构体自动实现了所有格式化 trait
+ 结构体可以用 {:?} 和 {:#?} 打印
- 编译速度会变慢，不推荐使用
- 结构体可以用 {} 打印
E: #[derive(Debug)] 只自动生成 fmt::Debug 的实现，让结构体支持 {:?} 和 {:#?}。要支持 {} 还需要手动实现 fmt::Display。
```

## 格式规范识别

```quiz single
Q: `println!("{:08.2}", 3.14)` 的输出是什么？
- 000003.14
- 3.1400000
+ 00003.14
- 3.14
E: {:08.2} 表示：总宽度 8，小数点后 2 位，不足位数用 0 补齐。3.14 写成 2 位小数是 3.14（4 个字符，小数点也算字符），总宽度 8 需补 4 个零，得到 00003.14。
```

## stderr 与 stdout

```quiz multi
Q: 下列关于 `eprintln!` 和 `println!` 的说法，哪些是正确的？
+ 两者格式字符串语法完全相同
+ 在终端运行时，两者的输出都默认显示在屏幕上
+ eprintln! 输出到 stderr，通常用于错误信息和诊断输出
- eprintln! 输出到文件，println! 输出到终端
E: eprintln! 和 println! 使用完全相同的格式化语法，区别只在输出目标：println! 写入 stdout，eprintln! 写入 stderr。在终端中两者都显示，但可以用重定向分别捕获（如 2>/dev/null 忽略 stderr）。
```

## 编程练习

补全下面程序，让序号用零补齐到 2 位宽度输出（`01`、`02`……而不是 `1`、`2`……）。

```rust editable
fn main() {
    let days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    for (i, day) in days.iter().enumerate() {
        // TODO：序号从 1 开始，宽度 2，用零补齐
        println!("{} {}", i + 1, day);
    }
}
```

```expected
01 Monday
02 Tuesday
03 Wednesday
04 Thursday
05 Friday
```
