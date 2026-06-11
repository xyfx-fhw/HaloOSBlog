---
title: "声明宏"
description: "深入理解 Rust 声明宏（macro_rules!）：元变量片段类型、多规则匹配、重复模式、宏的卫生性与作用域导出。"
difficulty: intermediate
estimatedTime: 50
keywords: ["macro_rules!", "声明宏", "元变量", "重复模式", "宏卫生性", "macro_export", "元编程"]
---

# 宏的基础

## 什么是宏

你已经频繁使用过`println!`宏了。是时候看清楚它背后的机制，并学会编写自己的宏了。

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

> `#[derive(...)]` 可能会令你疑惑，不是刚讲了是属性吗，现在怎么又说是宏了呢？这其实是因为从**语法层面**看`#[derive(...)]`是一个属性，但从**实现原理**看，它由**过程宏**提供支持——编译器在编译时调用这些宏，自动生成代码。这是 Rust 元编程的核心体现。详细原理见[第 16 章：过程宏](/RustCourse/chapters/16-proc-macros/00-index)。本章仅了解即可。

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

| 片段类型 | 匹配内容 | 示例 | 说明 |
|---------|---------|------|------|
| `expr`  | 任意表达式 | `1+2`、`"hello"`、`foo()` | 能计算出值的代码，最常用 |
| `ty`    | 任意类型   | `i32`、`String`、`Vec<u8>` | 类型标注中使用 |
| `ident` | 标识符 | `x`、`my_fn`、`Point` | 变量名、函数名、类型名等（不能是表达式） |
| `literal` | 字面量 | `42`、`"text"`、`true`、`3.14` | 具体的值，不是变量 |
| `pat`   | 模式 | `Some(x)`、`(a, b)`、`_` | match/if let 分支的模式 |
| `stmt`  | 单条语句 | `let x = 1;`、`foo();` | 以分号结尾的单行代码 |
| `block` | 代码块 | `{ let x = 1; x + 1 }` | 花括号包裹的多行代码 |
| `tt`    | Token 树 | 任何东西 | 最宽泛的类型，作为"兜底方案" |

**实际应用**：

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

`tt`（token tree）是最宽泛的片段类型。**重要**：`tt` 能匹配**单个 token 或完整的括号对**，但不能匹配像 `3 + 5` 这样跨越多个不括号的 token。

```rust runnable
macro_rules! my_debug {
    // 接收任意单个 token 或括号对
    ($x:tt) => {
        println!("{:?}", $x);
    };
}

fn main() {
    let x = 5;

    my_debug!(42);           // 单个字面量 ✓
    my_debug!(true);         // 单个字面量 ✓
    my_debug!(x);            // 单个标识符 ✓
    my_debug!((3 + 5));      // 括号对 ✓
    // my_debug!(3 + 5);     // ✗ 错误：多个不括号的 token
}
```

**tt 的实际用途**：在需要原样转发给其他宏时（通常配合重复模式 `$(...)*`，后面会讲）：

```rust runnable
macro_rules! passthrough {
    ($($t:tt)*) => {
        // 把所有 token 原封不动地放到 println! 里
        // 宏展开后等价于：println!("格式化：{} + {} = {}", 1, 2, 3)
        println!($($t)*)
    };
}

fn main() {
    passthrough!("格式化：{} + {} = {}", 1, 2, 3);
}
```

## 重复模式

重复模式让一条规则能匹配不定数量的输入，是声明宏最强大的特性之一。

语法：`$( 捕获内容 ) 分隔符? 量词`，这里很类似正则表达式的写法

| 量词 | 含义 |
|-----|------|
| `*` | 零次或多次 |
| `+` | 一次或多次 |
| `?` | 零次或一次（不能有分隔符） |

### 逗号分隔的列表

标准库的 `vec!` 宏就是用重复模式实现的，下面是简化版：

```rust runnable
macro_rules! my_vec {
    // $( $x:expr ),*  ←  匹配：零个或多个"表达式"，中间用逗号分隔
    // 如果要用分号分隔，写法就是：$( $x:expr );*
    ( $( $x:expr ),* ) => {
        {
            let mut v = Vec::new();
            $(               // 展开区：对每个 $x 重复这段代码
                v.push($x);
            )*
            v
        }
    };
    // 支持末尾多余的逗号（my_vec![1, 2, 3,]）
    ( $( $x:expr ),+ , ) => {
        my_vec![$($x),*]    //递归使用自己
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

**三种不同调用的展开示例**：

```rust
// 调用 1：my_vec![1, 2, 3]
// 展开后：
let a = {
    let mut v = Vec::new();
    v.push(1);      // 这是语句（有分号）
    v.push(2);      // 这是语句（有分号）
    v.push(3);      // 这是语句（有分号）
    v               // 最后是表达式（无分号），作为块的返回值
};

// 调用 2：my_vec!["x", "y", "z", "w"]
// 展开后：
let b = {
    let mut v = Vec::new();
    v.push("x");
    v.push("y");
    v.push("z");
    v.push("w");
    v
};

// 调用 3：my_vec![]
// 展开后（零个元素）：
let c = {
    let mut v = Vec::new();
    // $( v.push($x); )* 重复 0 次，所以中间什么都没有
    v
};
```

> **为什么 `$( v.push($x); )*` 后面没有分号？**
>
> 因为 `v.push($x);` 里面**已经有分号了**。展开时，每次重复生成的代码都是完整的语句：
>
> ```
> v.push(1);  v.push(2);  v.push(3);
> ```
>
> 如果在 `)*` 后面再加分号，就变成了：
>
> ```
> v.push(1);  v.push(2);  v.push(3);;  // ✗ 双分号，错误
> ```
>
> **为什么`( $( $x:expr ),* )`有两层 `{}`？**
>
> 宏展开后，我们希望能写 `let a = my_vec![1, 2, 3];` 这样的代码。但 `let mut v = Vec::new()` 是**语句**，不是**表达式**，无法直接放在赋值号的右边。在 Rust 中，赋值号右边必须是表达式才能返回一个值。
>
> 所以宏需要：
> 1. **外层 `{}` 是宏语法**——`=> { ... }` 这是定义宏展开体的必须写法
> 2. **内层 `{}` 是代码块表达式**——把多个语句包裹成一个表达式，这样整个块可以在赋值位置使用，最后一行 `v` 成为块的返回值
>
> 对比：
>
> ```rust
> // ✗ 没有内层 {} 的展开（错误）
> let a = let mut v = Vec::new(); v.push(1); v;
>
> // ✓ 有内层 {} 的展开（正确）
> let a = { let mut v = Vec::new(); v.push(1); v };
> ```

### 加号量词（至少一次）

用 `+` 表示至少一次重复。对比 `*` 的区别就是：`*` 可以零次，`+` 必须至少一次。

```rust runnable
macro_rules! print_all {
    // 用 + 表示至少一个参数，用逗号分隔
    ( $( $x:expr ),+ ) => {
        $(
            print!("{} ", $x);
        )*
        println!();
    };
}

fn main() {
    print_all!(1);                      // ✓ 一个参数
    print_all!(10, 20, 30);             // ✓ 多个参数
    print_all!("a", "b", "c", "d");     // ✓ 多个参数
    // print_all!();                    // ✗ 错误：+ 要求至少一个
}
```

**展开示例**：

```rust
print_all!(10, 20)  展开为：
    print!("{} ", 10);
    print!("{} ", 20);
    println!();
```

### 问号量词（零或一次）

用 `?` 表示可选的（零次或一次）。**注意：`?` 不能有分隔符**。

```rust runnable
macro_rules! config {
    // 可选的赋值：config!(name) 或 config!(name = value)
    ($name:ident $( = $val:expr )?) => {
        {
            let v: usize = 0 $( + $val )?;  // 有值则加上，没有则保持 0
            println!("配置 {}: {}", stringify!($name), v);
            v
        }
    };
}

fn main() {
    config!(max_size);          // ✓ 无赋值
    config!(buffer_size = 64);  // ✓ 有赋值
}
```

**展开示例**：

```rust
config!(max_size)  展开为：
    let v: usize = 0;
    println!("配置 {}: {}", "max_size", v);

config!(buffer_size = 64)  展开为：
    let v: usize = 0 + 64;
    println!("配置 {}: {}", "buffer_size", v);
```

# 进阶与作用域

## 宏的卫生性

Rust 的声明宏是**卫生的**（hygienic）。这意味着：
1. **宏内部定义的变量不会污染外层作用域** — 下面代码里宏内的 `tmp` 不会覆盖调用者的 `tmp`
2. **调用者的变量也不会污染宏内部** — 但通过参数传入的变量除外

简单理解：**宏内部是隔离的**，宏内新定义的名字不会逃逸出去。

```rust runnable
macro_rules! swap {
    ($a:expr, $b:expr) => {
        // 宏内的 tmp 变量不会与调用者的 tmp 冲突（卫生性）
        let tmp = $a;
        $a = $b;
        $b = tmp;
    };
}

fn main() {
    let tmp = "这是用户的 tmp".to_string(); // 用户有个 tmp
    let mut x = 10;
    let mut y = 20;
    swap!(x, y);

    println!("x={}, y={}", x, y);           // 10 和 20 互换了
    println!("用户的 tmp 没被覆盖：{}", tmp); // 用户的 tmp 依然完好，不是宏内的 tmp
}
```

**关键点**：元变量 `$a`、`$b` 传入的是**表达式本身**（`x` 和 `y`），它们属于**调用者的作用域**，所以修改 `$a` 等于直接修改 `x`。

> **注意**：卫生性只对 `ident` 片段和宏内新声明的绑定有效。若用 `$name:ident` 直接拼接出新的标识符（`concat_idents` 这类场景），需要格外小心。

## 模块内作用域

**快速概念预览**：`mod` 是 Rust 的模块系统，用来组织代码。`pub` 关键字使项目对外部可见；没有 `pub` 的项只在模块内可见。在下面的例子中，`square` 宏定义在 `math` 模块内，所以 `main` 函数无法访问它。要深入了解模块系统，见[模块系统](/RustCourse/chapters/07-modules/00-index)。本页内容目前仅作了解即可。

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

## 实用标准库宏预览

这里还有一些你可能会用到的宏，现在可以先混个脸熟，防止后面看到后慌乱：

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

**为什么需要调试宏**：宏在编译时展开，不像普通代码那样好追踪。如果宏没有按预期工作，你需要看到实际展开后的代码才能理解发生了什么。

**使用 cargo-expand 工具**：

安装工具：

```bash
cargo install cargo-expand
```

常见用法：

```bash
cargo expand              # 展开整个 crate，输出所有宏展开结果
cargo expand my_module   # 只展开指定模块
cargo expand my_module::my_macro  # 只展开特定宏
```

**实际例子**：

假设你的代码中有这个宏调用：

```rust
my_vec![1, 2, 3]
```

运行 `cargo expand` 后会看到：

```rust
// 展开后的代码
let a = {
    let mut v = Vec::new();
    v.push(1);
    v.push(2);
    v.push(3);
    v
};
```

**常见用途**：
1. **排查宏展开错误** — 看不懂编译错误时，查看展开代码能帮你理解宏生成了什么
2. **调试变量捕获** — 确认元变量是否正确替换（比如 `$x` 是否替换成了你期望的值）
3. **验证分隔符和重复** — 确认 `$( ... )*` 是否按预期重复展开

**在哪里运行**：`cargo expand` 是**命令行工具**，在项目的根目录（`Cargo.toml` 所在位置）运行。它会自动检测当前 Cargo 项目，展开该项目中的所有宏。展开结果输出到**终端**（标准输出），不会写入代码文件——你需要查看输出来理解展开后的代码。

**注意**：如果宏有语法错误，`cargo expand` 会直接报错，不会输出展开结果。展开失败时的错误信息就是调试的关键线索。

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

```rust
macro_rules! let_bind {
    ($name:ident = $val:expr) => {
        let $name = $val;
    };
}
```

```quiz single
Q: 在上面的代码里，调用 `let_bind!(answer = 6 * 7)` 时，`$name` 和 `$val` 分别捕获什么？
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

### 练习三：实现 `repeat_str!` 宏

实现一个 `repeat_str!` 宏，接受多个字符串字面量，返回它们连接后的结果。

示例：`repeat_str!("Hello", " ", "world")` 应该返回 `"Hello world"`。

```rust editable
macro_rules! repeat_str {
    // TODO：实现宏，使用重复模式 + 分隔符匹配字符串列表
}

fn main() {
    let greeting = repeat_str!("Hello");
    println!("{}", greeting);

    let message = repeat_str!("Hello", " ", "world", "!");
    println!("{}", message);

    let words = repeat_str!("Rust", " ", "is", " ", "awesome");
    println!("{}", words);
}
```

```expected
Hello
Hello world!
Rust is awesome
```
