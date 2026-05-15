---
title: "声明宏"
description: "深入理解 Rust 声明宏（macro_rules!）：元变量片段类型、多规则匹配、重复模式、宏的卫生性与作用域导出。"
difficulty: intermediate
estimatedTime: 50
keywords: ["macro_rules!", "声明宏", "元变量", "重复模式", "宏卫生性", "macro_export", "元编程"]
---

# 宏的基础

## 什么是宏

你已经频繁使用过宏了：`println!`、`vec!`、`format!`、`assert!`。是时候看清楚它们背后的机制，并学会编写自己的宏了。

**宏**（Macro）是一种"为写代码而写代码"的机制，称为**元编程**（metaprogramming）。宏在**编译时展开**——编译器遇到宏调用时，先把它展开成普通代码，再编译生成的代码。

宏调用有一个显眼的标志：名称后跟感叹号 `!`。

```rust runnable
fn main() {
    println!("这是宏调用");          // println! 展开为格式化打印代码
    let v = vec![10, 20, 30];        // vec! 展开为创建 Vec 的代码
    let s = format!("结果：{}", 42); // format! 展开为构建 String 的代码
    println!("{:?}  {}", v, s);
}
```

> **本文范围说明**：Rust 的宏分为两大类——**声明宏**（`macro_rules!`）和**过程宏**。本文只讲解声明宏。过程宏涉及 `TokenStream`、`syn`、`quote` 等进阶概念，难度较高，已单独成章，详见[第 16 章：过程宏](/RustCourse/chapters/16-proc-macros/00-index)。

## 宏与函数的核心区别

宏能做到函数做不到的三件事：

**一、接受可变数量的参数。** 函数签名必须写明参数个数，宏不需要：

```rust runnable
fn main() {
    println!("一个参数");
    println!("两个：{}", 99);
    println!("四个：{} {} {}", "a", "b", "c");
    // 普通函数无法做到参数个数可变
}
```

**二、可以在编译时生成代码（例如 trait 实现）。**
像 `#[derive(Debug)]` 这类宏，能在**编译期**为你自动“写”出实现 `Debug` trait 的完整 Rust 源代码，并交给编译器一起翻译成机器码。
普通函数绝对做不到这一点。因为普通函数只有在程序编译完成、进入**运行期**后才会被真正的执行。当函数运行时，程序已经是底层的机器码，编译器早就“下班”了，根本无法再接收和处理任何新生成的代码。
因此，“写代码”这个动作，只能交给在编译阶段就提前激活的**宏**来完成。

**三、必须在调用前定义或引入。** 这与函数不同——函数可以在文件任意位置定义，宏的作用域是**顺序**的：

```rust runnable expect-error
fn main() {
    greet!(); // 错误：此处宏尚未定义
}

macro_rules! greet {
    () => { println!("你好！"); };
}
```

把宏定义移到调用之前就能正常工作：

```rust runnable
macro_rules! greet {
    () => { println!("你好！"); };
}

fn main() {
    greet!();
}
```

## 第一个声明宏

`macro_rules!` 让你编写基于**模式匹配**的宏。语法结构：

```text
macro_rules! 宏名 {
    (模式1) => { 展开代码1 };
    (模式2) => { 展开代码2 };
}
```

调用宏时，编译器依次用输入去匹配各规则，使用**第一个匹配成功**的规则展开：

```rust runnable
macro_rules! say {
    // 规则 1：空参数
    () => {
        println!("你好，世界！");
    };
    // 规则 2：一个表达式
    ($msg:expr) => {
        println!("消息：{}", $msg);
    };
    // 规则 3：两个表达式
    ($a:expr, $b:expr) => {
        println!("{} + {} = {}", $a, $b, $a + $b);
    };
}

fn main() {
    say!();           // 匹配规则 1
    say!("Rust");     // 匹配规则 2
    say!(10, 20);     // 匹配规则 3
}
```

## 元变量与片段类型

模式中用 `$名称:片段类型` 捕获传入的代码片段，称为**元变量**（metavariable）。片段类型决定能匹配哪种代码：

| 片段类型 | 匹配内容 | 示例 |
|---------|---------|------|
| `expr`  | 任意表达式 | `1+2`、`"hello"`、`foo()` |
| `ty`    | 任意类型   | `i32`、`String`、`Vec<u8>` |
| `ident` | 标识符（变量名/函数名/类型名） | `x`、`my_fn`、`Point` |
| `literal` | 字面量 | `42`、`"text"`、`true`、`3.14` |
| `pat`   | 模式（match 分支里的那种） | `Some(x)`、`(a, b)`、`_` |
| `stmt`  | 单条语句 | `let x = 1;`、`foo();` |
| `block` | 代码块 | `{ let x = 1; x + 1 }` |
| `tt`    | 任意单个 token 树（最宽泛） | 任何东西 |

```rust runnable
macro_rules! create_fn {
    // $name:ident 匹配函数名，$ret:ty 匹配返回类型，$body:block 匹配函数体
    ($name:ident, $ret:ty, $body:block) => {
        fn $name() -> $ret $body
    };
}

// 宏展开后等价于：fn add_one() -> i32 { 41 + 1 }
create_fn!(add_one, i32, { 41 + 1 });

// 展开后：fn greeting() -> String { "你好！".to_string() }
create_fn!(greeting, String, { "你好！".to_string() });

fn main() {
    println!("{}", add_one());
    println!("{}", greeting());
}
```

### tt 的特殊地位

`tt`（token tree）是最宽泛的片段类型，可以匹配任何内容。当你不确定输入的类型，或需要原样转发给另一个宏时，用 `tt`：

```rust runnable
macro_rules! passthrough {
    ($($t:tt)*) => {
        // 把所有输入原封不动地放到 println! 里
        println!($($t)*)
    };
}

fn main() {
    passthrough!("格式化：{} + {} = {}", 1, 2, 3);
}
```

## 重复模式

重复模式让一条规则能匹配不定数量的输入，是声明宏最强大的特性之一。

语法：`$( 捕获内容 ) 分隔符? 量词`

| 量词 | 含义 |
|-----|------|
| `*` | 零次或多次 |
| `+` | 一次或多次 |
| `?` | 零次或一次（不能有分隔符） |

### 逗号分隔的列表

标准库的 `vec!` 宏就是用重复模式实现的，下面是简化版：

```rust runnable
macro_rules! my_vec {
    // $( $x:expr ),*  ←  零个或多个逗号分隔的表达式
    ( $( $x:expr ),* ) => {
        {
            let mut v = Vec::new();
            $(                  // 展开区：对每个 $x 重复这段代码
                v.push($x);
            )*
            v
        }
    };
    // 支持末尾多余的逗号（my_vec![1, 2, 3,]）
    ( $( $x:expr ),+ , ) => {
        my_vec![$($x),*]
    };
}

fn main() {
    let a = my_vec![1, 2, 3];
    let b = my_vec!["x", "y", "z", "w"];
    let c: Vec<i32> = my_vec![];   // 零个参数也合法

    println!("{:?}", a);
    println!("{:?}", b);
    println!("{:?}", c);
}
```

拆解 `$( $x:expr ),*`：
- `$(` `)` — 捕获组的开始与结束
- `$x:expr` — 在组内捕获一个表达式，命名为 `$x`
- `,` — 每次重复之间的**分隔符**（可选，可以是任意 token）
- `*` — 重复零次或多次

### 加号量词（至少一次）

```rust runnable
macro_rules! print_all {
    // 用 + 要求至少传入一个参数
    ( $first:expr $( , $rest:expr )* ) => {
        print!("{}", $first);
        $(
            print!(", {}", $rest);
        )*
        println!();
    };
}

fn main() {
    print_all!(1);
    print_all!(10, 20, 30);
    print_all!("a", "b", "c", "d");
}
```

### 问号量词（零或一次）

```rust runnable
macro_rules! config {
    // 可选的初始值：config!(capacity) 或 config!(capacity = 16)
    ($name:ident $( = $val:expr )?) => {
        {
            let v: usize = 0 $( + $val )?;  // 有值则加上，没有则加 0
            println!("配置 {}: {}", stringify!($name), v);
            v
        }
    };
}

fn main() {
    config!(max_size);          // 输出：配置 max_size: 0
    config!(buffer_size = 64);  // 输出：配置 buffer_size: 64
}
```

# 进阶与作用域

## 宏的卫生性

Rust 的声明宏是**卫生的**（hygienic）：宏内部引入的变量名不会"泄漏"到调用者的作用域，反之亦然。这防止了宏展开时意外覆盖用户变量的问题。

```rust runnable
macro_rules! swap {
    ($a:expr, $b:expr) => {
        // 宏内的 tmp 变量不会与调用者的 tmp 冲突
        let tmp = $a;
        $a = $b;
        $b = tmp;
    };
}

fn main() {
    let tmp = "这是用户的 tmp".to_string(); // 用户也有个 tmp
    let mut x = 10;
    let mut y = 20;
    swap!(x, y);
    println!("x={}, y={}", x, y); // 10 和 20 互换了
    println!("用户的 tmp 没被覆盖：{}", tmp); // 依然完好
}
```

但元变量 `$a`、`$b` 传入的是表达式本身（`x` 和 `y`），它们属于**调用者的作用域**，所以修改 `$a` 等于修改 `x`。

> **注意**：卫生性只对 `ident` 片段和宏内新声明的绑定有效。若用 `$name:ident` 直接拼接出新的标识符（`concat_idents` 这类场景），需要格外小心。

## 模块内作用域

宏默认只在定义它的**模块及其子模块**内可见，且遵循**顺序规则**（必须先定义后使用）：

```rust runnable
mod math {
    macro_rules! square {
        ($x:expr) => { $x * $x };
    }

    pub fn demo() {
        println!("3² = {}", square!(3)); // 在同一模块内可用
    }
}

fn main() {
    math::demo();
    // square!(4); // 错误：这里看不到 math 模块里的宏
}
```

## 跨模块与导出

在子模块上加 `#[macro_use]`，可以把该模块的宏提升到父模块。另外，使用 `#[macro_export]` 可以让宏被**其他 crate** 引入：

```rust runnable
#[macro_use]
mod helpers {
    macro_rules! double {
        ($x:expr) => { $x * 2 };
    }
}

fn main() {
    println!("{}", double!(7)); // 父模块可以使用
}
```

在库的开发中，如果你希望宏提供给最终用户使用，可以在宏上面添加 `#[macro_export]`：

```rust runnable
#[macro_export]
macro_rules! assert_approx_eq {
    ($a:expr, $b:expr, $eps:expr) => {
        let diff = ($a - $b).abs();
        if diff > $eps {
            panic!(
                "断言失败：|{} - {}| = {} > {}",
                $a, $b, diff, $eps
            );
        }
    };
}

fn main() {
    assert_approx_eq!(1.0_f64, 1.0000001, 0.001); // 通过
    println!("近似相等断言通过");
}
```

> `#[macro_export]` 会把宏提升到 crate 根作用域，其他 crate 用 `use your_crate::assert_approx_eq;` 引入。

# 常用宏与调试

## 实用标准库宏速查

你已经见过很多内置宏，这里做个系统整理：

```rust runnable
fn main() {
    // ---- 调试用 ----
    let x = 5;
    let y = dbg!(x * 2 + 1); // 打印表达式和值，返回值本身
    println!("y = {}", y);

    // ---- 编译时字符串 ----
    const GREET: &str = concat!("Hello", ", ", "world", "!");
    println!("{}", GREET);

    let expr = stringify!(1 + 2 * 3); // 把表达式转成字符串，不求值
    println!("表达式原文：{}", expr);

    // ---- 条件编译信息 ----
    // env!("CARGO_PKG_VERSION") 在编译时读取环境变量
    let version = env!("CARGO_PKG_VERSION");
    println!("版本：{}", version);
}
```

```rust runnable expect-error
fn not_done_yet() {
    todo!("等以后再实现");         // 运行时 panic，带消息
}

fn impossible_path(x: u8) -> &'static str {
    match x {
        0 => "零",
        1..=255 => "非零",
        _ => unreachable!("u8 不可能超过 255"), // 告诉编译器此处不可达
    }
}

fn main() {
    println!("{}", impossible_path(42));
    not_done_yet(); // 会 panic
}
```

## 调试宏展开

当宏行为不符合预期时，可以用 `cargo expand`（需安装 `cargo-expand`）查看展开后的代码：

```bash
cargo install cargo-expand
cargo expand        # 展开整个 crate
cargo expand main   # 只展开 main 函数
```

展开结果告诉你宏实际生成了什么代码，是调试声明宏最直接的方法。

# 练习题

## 基础测验

```quiz single
Q: `$( $x:expr ),+` 与 `$( $x:expr ),*` 的区别是什么？
- 两者完全相同，可以互换
- `+` 版本要求参数用加号分隔，`*` 版本用乘号分隔
+ `+` 要求至少一个参数，`*` 允许零个参数
- `+` 只能匹配数字，`*` 可以匹配任意类型
E: `+` 量词表示"一次或多次"，因此宏调用至少要传入一个参数，否则编译错误。`*` 表示"零次或多次"，空参数也合法。
```

```quiz single
Q: 以下代码（先调用 `hello!()`，再定义 `macro_rules! hello`）能否编译通过？
- 能，宏的作用域和函数一样，定义顺序不影响使用
+ 不能，声明宏必须在调用之前定义，此处宏定义在调用之后
- 能，只要在同一文件中定义就行
- 不能，宏不能在 main 函数外定义
E: 声明宏遵循顺序作用域——只有在定义之后的代码才能看到它。函数不受此限制，但宏受。
```

```quiz single
Q: 在 `macro_rules! let_bind { ($name:ident = $val:expr) => { let $name = $val; }; }` 中，调用 `let_bind!(answer = 6 * 7)` 时，`$name` 和 `$val` 分别捕获什么？
- `$name` 匹配 `answer = 6`，`$val` 匹配 `7`
+ `$name` 匹配标识符 `answer`，`$val` 匹配表达式 `6 * 7`
- `$name` 匹配 `answer = 6 * 7`，`$val` 为空
- 编译错误，宏不能包含 `=` 号
E: `ident` 片段精确匹配一个标识符 token，等号 `=` 是字面分隔符（不是元变量），之后的 `6 * 7` 是表达式，被 `$val:expr` 捕获。
```

```quiz single
Q: Rust 声明宏的"卫生性"（hygiene）指的是什么？
- 宏不允许使用 unsafe 代码
+ 宏内部引入的变量绑定与调用者的作用域隔离，不会意外覆盖用户的同名变量
- 宏只能在同一模块内使用
- 宏的参数类型必须在编译时已知
E: 卫生宏的核心是作用域隔离。宏展开时，宏内部新声明的绑定（如临时变量 `tmp`）和调用者的同名变量不会相互干扰，防止了宏"污染"使用者代码的问题。
```

```quiz multi
Q: 关于 `#[macro_export]`，以下哪些描述是正确的？
+ 它让宏可以被其他 crate 使用
+ 它会把宏提升到 crate 根作用域
- 它让宏可以在定义位置之前调用
- 它使宏变成过程宏
+ 在 Rust 2018+ 中，外部 crate 用 `use crate_name::macro_name;` 引入
E: `#[macro_export]` 专门用于跨 crate 导出宏，会将宏提升到 crate 根，让其他 crate 可以引入使用。它不改变宏的顺序作用域规则，也不将其转换为过程宏。
```

## 编程练习

### 练习一：定义 `print_twice!` 宏

定义一个 `print_twice!` 宏，接受一个表达式，将该值打印两次（每次单独一行）。

```rust editable
// 在这里定义 print_twice! 宏

fn main() {
    print_twice!(42);
    print_twice!("Hello");
}
```

```expected
42
42
Hello
Hello
```

### 练习二：实现 `max!` 宏

实现一个 `max!` 宏，接受**两个**表达式，返回较大的值。提示：宏可以展开为 `if` 表达式。

```rust editable
macro_rules! max {
    // TODO：填写规则，接受两个表达式，返回较大的那个
}

fn main() {
    println!("{}", max!(3, 7));     // 7
    println!("{}", max!(10, 2));    // 10
    println!("{}", max!(-1, -5));   // -1
}
```

```expected
7
10
-1
```

### 练习三：实现 `map_vec!` 宏

实现一个 `map_vec!` 宏，接受一个 `Vec` 和一个**闭包表达式**，返回映射后的新 `Vec`。

示例：`map_vec!(v, |x| x * 2)` 等价于 `v.iter().map(|x| x * 2).collect::<Vec<_>>()`。

```rust editable
macro_rules! map_vec {
    // TODO：实现宏
}

fn main() {
    let nums = vec![1, 2, 3, 4, 5];
    let doubled = map_vec!(nums, |x| x * 2);
    println!("{:?}", doubled); // [2, 4, 6, 8, 10]

    let words = vec!["hello", "world"];
    let upper = map_vec!(words, |s| s.to_uppercase());
    println!("{:?}", upper); // ["HELLO", "WORLD"]
}
```

```expected
[2, 4, 6, 8, 10]
["HELLO", "WORLD"]
```
