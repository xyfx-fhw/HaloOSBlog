---
title: "宏"
description: "理解 Rust 四种宏的概念与用途，学会用 macro_rules! 编写声明宏，了解三种过程宏的使用场景。"
difficulty: advanced
estimatedTime: 40
keywords: ["macro_rules!", "宏", "声明宏", "过程宏", "derive", "元编程", "TokenStream"]
---

# 宏与元编程

宏（Macro）是 Rust 中一种"为写代码而写代码"的机制，称为**元编程**（metaprogramming）。

## 什么是宏

你在前面章节已经使用过宏了：`println!`、`vec!`、`format!`、`assert!`。这些看起来像函数的调用，但名称后跟着感叹号 `!`——这就是宏调用的标志。

```rust runnable
fn main() {
    // 这些都是宏调用，注意名称后的感叹号
    println!("Hello, Macro!");

    let v = vec![1, 2, 3, 4, 5]; // vec! 接受任意数量的参数
    println!("{:?}", v);

    let s = format!("{} + {} = {}", 1, 2, 1 + 2); // format! 返回 String
    println!("{}", s);
}
```

宏在**编译时展开**：编译器看到宏调用时，会把它替换成宏定义的代码，然后才编译生成的代码。这一点和函数完全不同——函数是在**运行时调用**的。

Rust 有四种宏：

- **声明宏**（`macro_rules!`）：最常见，基于模式匹配生成代码
- **自定义 derive 宏**：用 `#[derive(...)]` 为结构体/枚举自动生成 trait 实现
- **类属性宏**：可用于任意项（包括函数）的自定义属性
- **类函数宏**：看起来像函数调用，但在编译时处理任意 token 序列

## 宏与函数的区别

宏有几个函数做不到的事：

**1. 可变参数数量**——函数必须声明固定参数个数，宏不需要：

```rust runnable
fn main() {
    // println! 可以接受 1 个、2 个、任意多个参数
    println!("一个参数");
    println!("两个参数：{}", 42);
    println!("三个参数：{} {} {}", "a", "b", "c");
    // 普通函数做不到这一点
}
```

**2. 编译时展开，可实现 trait**——宏在编译器翻译代码之前展开，因此可以在编译时为类型生成 trait 实现；函数运行在程序执行期间，无法做到这一点。

**3. 必须先定义或引入**——调用宏之前必须先定义它，或将其引入作用域；而函数可以在文件任意位置定义：

```rust runnable expect-error
fn main() {
    my_macro!(); // 错误：宏在此处未定义
}

macro_rules! my_macro {
    () => { println!("展开了"); };
}
```

正确写法是把宏定义放在调用之前：

```rust runnable
macro_rules! my_macro {
    () => { println!("展开了"); };
}

fn main() {
    my_macro!();
}
```

## 声明宏入门

`macro_rules!` 让你编写基于**模式匹配**的宏：宏接收代码片段，与各个规则的模式比较，用第一个匹配成功的规则的代码替换掉宏调用。

```rust runnable
macro_rules! greet {
    // 规则 1：无参数
    () => {
        println!("你好，世界！");
    };
    // 规则 2：有一个表达式参数
    ($name:expr) => {
        println!("你好，{}！", $name);
    };
}

fn main() {
    greet!();            // 匹配规则 1
    greet!("Rustacean"); // 匹配规则 2
    greet!(42);          // 也匹配规则 2，42 是一个表达式
}
```

宏定义的语法：`macro_rules! 宏名 { (模式) => { 替换代码 }; ... }`，多个规则之间用分号分隔。

## 模式语法

模式中用**元变量**（metavariable）捕获传入的代码片段，格式为 `$名称:类型`：

| 元变量类型 | 匹配的内容 | 示例 |
|-----------|-----------|------|
| `$x:expr` | 任意表达式 | `1+2`、`"hello"`、`foo()` |
| `$t:ty` | 任意类型 | `i32`、`String`、`Vec<u8>` |
| `$i:ident` | 标识符（变量名/函数名） | `foo`、`my_var` |
| `$l:literal` | 字面量 | `42`、`"text"`、`true` |

**重复模式**：`$( ... )*` 表示零次或多次，`$( ... )+` 表示一次或多次：

```rust runnable
// 仿照标准库 vec! 宏的简化实现
macro_rules! my_vec {
    // $( $x:expr ),* 匹配零个或多个由逗号分隔的表达式
    ( $( $x:expr ),* ) => {
        {
            let mut v = Vec::new();
            $(
                v.push($x); // 对每个匹配的 $x 展开这一行
            )*
            v
        }
    };
}

fn main() {
    let a = my_vec![1, 2, 3];
    let b = my_vec!["x", "y", "z", "w"];
    let c: Vec<i32> = my_vec![]; // 零个参数也合法

    println!("{:?}", a);
    println!("{:?}", b);
    println!("{:?}", c);
}
```

`$( $x:expr ),*` 的解读：
- `$( ... )` — 捕获组，里面是要重复的内容
- `$x:expr` — 匹配任意表达式，命名为 `$x`
- `,` — 每次匹配之间的可选分隔符
- `*` — 重复零次或更多次

`#[macro_export]` 属性让宏可以被其他模块或 crate 引入使用：

```rust runnable
// #[macro_export] 让这个宏在模块外也可用
#[macro_export]
macro_rules! double {
    ($x:expr) => {
        $x * 2
    };
}

fn main() {
    println!("{}", double!(5));  // 展开为 5 * 2
    println!("{}", double!(3 + 1)); // 展开为 (3 + 1) * 2
}
```

# 过程宏

过程宏比声明宏更强大，它们接收 Rust 源代码的 token 流，经过程序逻辑处理后输出新的 token 流。

## 什么是过程宏

过程宏的三种形式都基于同一个核心：接收 `TokenStream`（源代码的 token 序列），返回新的 `TokenStream`（生成的代码）。

你最熟悉的过程宏是 `#[derive(...)]`：

```rust runnable
// #[derive(...)] 触发过程宏，自动生成 trait 实现
#[derive(Debug, Clone, PartialEq)]
struct Point {
    x: f64,
    y: f64,
}

fn main() {
    let p1 = Point { x: 1.0, y: 2.0 };
    let p2 = p1.clone();             // Clone：过程宏生成
    println!("{:?}", p1);             // Debug：过程宏生成
    println!("相等：{}", p1 == p2);   // PartialEq：过程宏生成
}
```

`#[derive(Debug)]` 这一行触发过程宏：宏读取结构体定义，自动生成等价于下面代码的 trait 实现：

```rust
impl std::fmt::Debug for Point {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.debug_struct("Point")
            .field("x", &self.x)
            .field("y", &self.y)
            .finish()
    }
}
```

你不用手写这段代码——宏替你生成了。

## 自定义 derive 宏

自定义 derive 宏让你可以为自己的 trait 提供 `#[derive(...)]` 支持。

没有宏时，用户需要为每个类型手动实现 trait：

```rust runnable
trait HelloMacro {
    fn hello_macro();
}

struct Dog;
struct Cat;

// 必须为每个类型分别手写
impl HelloMacro for Dog {
    fn hello_macro() { println!("Hello, Macro! My name is Dog!"); }
}
impl HelloMacro for Cat {
    fn hello_macro() { println!("Hello, Macro! My name is Cat!"); }
}

fn main() {
    Dog::hello_macro();
    Cat::hello_macro();
}
```

有了自定义 derive 宏，用户只需写一行注解：

```rust
#[derive(HelloMacro)]
struct Dog;

#[derive(HelloMacro)]
struct Cat;
```

宏的实现需要创建一个专用 crate，函数签名像这样（无法在单文件 Playground 中运行）：

```rust
use proc_macro::TokenStream;

// 注册为 derive 宏，名称是 HelloMacro
#[proc_macro_derive(HelloMacro)]
pub fn hello_macro_derive(input: TokenStream) -> TokenStream {
    // 用 syn crate 解析输入，用 quote crate 生成输出代码
    // ...
}
```

> 实现过程宏需要独立的 `proc-macro` 类型 crate，以及 `syn`（解析代码）和 `quote`（生成代码）两个外部库。这属于进阶话题，现阶段了解"是什么、怎么用"就足够了。

## 类属性宏

类属性宏可以应用于**任意项**（包括函数），而 derive 宏只能用于结构体和枚举。

`#[test]` 就是一个内置的类属性宏，标记某函数是测试函数：

```rust runnable
fn add(a: i32, b: i32) -> i32 {
    a + b
}

// #[test] 是类属性宏，把这个函数标记为单元测试
#[test]
fn test_add() {
    assert_eq!(add(2, 3), 5);
    assert_eq!(add(-1, 1), 0);
}

fn main() {
    println!("2 + 3 = {}", add(2, 3));
}
```

Web 框架（如 actix-web）大量使用类属性宏标注路由函数：

```rust
// 类属性宏的典型使用场景：路由注解
#[get("/")]
async fn index() -> String {
    "Hello, World!".to_string()
}
```

类属性宏的定义函数接收两个 `TokenStream`：属性参数和被标注的项本身：

```rust
#[proc_macro_attribute]
pub fn route(attr: TokenStream, item: TokenStream) -> TokenStream {
    // attr 对应 GET, "/" 部分
    // item 对应 fn index() { ... } 整个函数
}
```

## 类函数宏

类函数宏调用时像函数（带括号），但可以接受任意的 token 序列，甚至语法上不完整的内容：

```rust runnable
fn main() {
    // 内置的类函数宏示例
    // format! 接受任意数量和类型的参数
    let msg = format!("Hello, {}! 答案是 {}", "Rust", 42);
    println!("{}", msg);

    // concat! 在编译时连接字面量
    const GREETING: &str = concat!("Hello", ", ", "World", "!");
    println!("{}", GREETING);

    // stringify! 把表达式转成字符串（编译时）
    let expr_str = stringify!(1 + 2 + 3);
    println!("表达式文本：{}", expr_str); // 打印 "1 + 2 + 3"
}
```

基于过程宏的类函数宏还可以解析自定义的 DSL（领域专用语言），例如在编译时验证 SQL 语法：

```rust
// 过程宏可以在编译时解析和验证 SQL，而不是等到运行时
let query = sql!(SELECT * FROM users WHERE id = 1);
```

其定义签名：

```rust
#[proc_macro]
pub fn sql(input: TokenStream) -> TokenStream {
    // 解析 SQL 语法，检查合法性，生成对应的 Rust 代码
}
```

# 练习题

## 声明宏测验

```quiz single
Q: 宏调用与函数调用在语法上如何区分？
- 宏用方括号 []，函数用圆括号 ()
+ 宏名称后跟感叹号 !（如 println!），函数不带感叹号
- 宏必须全部大写
- 两者在语法上没有区别
E: Rust 宏调用的标志是名称后的 `!`，如 `println!`、`vec!`、`assert!`。这个设计让读者一眼能区分宏调用和函数调用。
```

```rust
macro_rules! my_macro {
    () => { println!("无参数"); };
    ($x:expr) => { println!("参数：{}", $x); };
    ($x:expr, $y:expr) => { println!("两个参数：{} {}", $x, $y); };
}

fn main() {
    my_macro!();
    my_macro!(42);
    my_macro!("hello", "world");
}
```

```quiz single
Q: 上面的代码输出什么？
- 编译错误，宏不支持多个规则
- 只有第一条规则生效，输出"无参数"三次
+ 依次输出"无参数"、"参数：42"、"两个参数：hello world"
- 三条规则同时展开，输出六行
E: 声明宏的规则按顺序匹配，第一个匹配的规则生效。my_macro!() 无参数匹配规则1；my_macro!(42) 匹配规则2；my_macro!("hello", "world") 匹配规则3。
```

```quiz single
Q: 在 `$( $x:expr ),*` 中，最后的 `*` 表示什么？
- 通配符，匹配任意内容
- 恰好一次
- 一次或多次
+ 零次或多次
E: `*` 表示重复零次或多次（包括零次）。若想要至少一次，应使用 `+`。`$( ... ),*` 是最常见的重复模式，用于匹配逗号分隔的列表。
```

```quiz single
Q: 关于宏和函数的区别，以下哪项正确？
- 宏比函数运行更快，应尽量用宏替代函数
- 宏在运行时展开，函数在编译时执行
+ 宏在编译时展开，因此可以实现 trait 等编译期操作；函数在运行时调用，无法做到这一点
- 宏只能在当前模块使用，函数可以跨模块调用
E: 宏在编译时展开是关键区别。这使宏能接受可变数量参数、在编译时生成 trait 实现等。代价是宏定义比函数复杂，且必须在调用前定义或引入作用域。
```

## 过程宏测验

```quiz single
Q: `#[derive(Debug, Clone)]` 是通过什么机制工作的？
- 编译器为这两个 trait 内置了特殊处理逻辑
+ 过程宏（derive 宏）：读取类型定义，在编译时自动生成对应的 trait 实现代码
- 运行时反射机制
- 标准库中已经为所有类型预先实现了这些 trait
E: #[derive(...)] 触发过程宏。宏读取你的结构体/枚举定义，生成等价于手写 `impl Debug for ...` 的代码。这发生在编译时，生成的代码和你手写的没有区别。
```

```quiz multi
Q: 下列关于三种过程宏的说法，哪些是正确的？
+ 自定义 derive 宏只能应用于结构体和枚举，不能用于函数
+ 类属性宏可以应用于函数，这是它比 derive 宏更灵活的地方
- 类函数宏和普通函数一样，在运行时执行
+ 三种过程宏都以 TokenStream 作为输入，返回 TokenStream 作为输出
- 过程宏可以在普通库 crate 中定义，不需要特殊设置
E: derive 宏确实只适用于结构体/枚举；类属性宏可用于函数等任意项；过程宏在编译时执行，不是运行时；所有过程宏都基于 TokenStream；过程宏必须在 proc-macro 类型的独立 crate 中定义。
```

## 编程练习

### 练习一：定义打印宏

定义一个名为 `print_twice` 的宏，接受一个表达式，将该值打印两次。

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

### 练习二：实现 max 宏

实现一个 `max!` 宏，接受两个表达式，返回较大的值。提示：宏可以展开为 `if` 表达式。

```rust editable
macro_rules! max {
    // TODO：填写宏规则，接受两个表达式，返回较大的那个
}

fn main() {
    println!("{}", max!(3, 7));    // 应输出 7
    println!("{}", max!(10, 2));   // 应输出 10
    println!("{}", max!(-1, -5));  // 应输出 -1
}
```

```expected
7
10
-1
```
