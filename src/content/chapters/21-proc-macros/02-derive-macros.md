---
title: "自定义 derive 宏"
description: "学会为自定义 trait 编写 #[derive(...)] 支持，使用 syn 解析结构体定义并自动生成 trait 实现代码。"
difficulty: advanced
estimatedTime: 40
keywords: ["derive宏", "proc_macro_derive", "syn", "quote", "自动实现trait"]
---

# 从需求出发

## 一个需要手动重复的 trait

假设你有一个日志 trait，要求每种类型都能描述自己的名字：

```rust runnable
trait Describe {
    fn describe(&self) -> String;
}

struct Point { x: f64, y: f64 }
struct Circle { x: f64, y: f64, radius: f64 }
struct Rectangle { width: f64, height: f64 }

// 为每个类型手动实现——代码完全雷同
impl Describe for Point {
    fn describe(&self) -> String { "Point".to_string() }
}
impl Describe for Circle {
    fn describe(&self) -> String { "Circle".to_string() }
}
impl Describe for Rectangle {
    fn describe(&self) -> String { "Rectangle".to_string() }
}

fn main() {
    println!("{}", Point { x: 0.0, y: 0.0 }.describe()); // Point
    println!("{}", Circle { x: 0.0, y: 0.0, radius: 1.0 }.describe()); // Circle
}
```

这三个实现**逻辑完全相同**：返回类型名字符串。但你不得不为每个类型都写一遍。

如果用自定义 derive 宏，使用时只需写：

```rust
#[derive(Describe)]
struct Point { x: f64, y: f64 }

// 等价于自动生成：
// impl Describe for Point {
//     fn describe(&self) -> String { "Point".to_string() }
// }
```

## derive 宏做的事：读取结构体名字，生成实现代码

derive 宏在编译时：

1. 接收结构体的 `TokenStream`（包含类型名、字段等信息）
2. 从中提取**类型名**（`Point`、`Circle`……）
3. **生成代码**：`impl Describe for 类型名 { ... }`
4. 把生成的代码注入到编译结果中

# 实现步骤

## 项目准备

按照前一章的结构，创建一个 proc-macro crate `my-macros`。

在 `my-macros/Cargo.toml` 中：

```toml
[package]
name = "my-macros"
version = "0.1.0"
edition = "2021"

[lib]
proc-macro = true

[dependencies]
syn = { version = "2", features = ["full"] }
quote = "1"
```

- **`syn`**：解析 `TokenStream` 为 Rust 语法树（AST），让你能方便地提取"类型名"等信息
- **`quote`**：用模板语法生成新的 `TokenStream`，比手动拼接 token 简单得多

有了这两个工具，实现 Describe 宏的思路就清晰了：用 syn 把输入解析成语法树、从中读出类型名，再用 quote 拼出 impl 块返回给编译器。

## 写最简单的 derive 宏

目标：`#[derive(Describe)]` 为类型自动生成 `Describe::describe()` 返回类型名。

```rust
// my-macros/src/lib.rs
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(Describe)]
pub fn describe_derive(input: TokenStream) -> TokenStream {
    // 第一步：把 TokenStream 解析成 Rust 语法树
    // DeriveInput 包含了被 derive 的类型的所有信息
    let ast = parse_macro_input!(input as DeriveInput);

    // 第二步：从语法树中提取类型名
    // ast.ident 就是类型的标识符（如 Point、Circle……）
    let name = &ast.ident;
    // name 是 Ident 类型，表示一个标识符，这里是结构体/枚举的名字

    // 第三步：用 quote! 生成实现代码
    // quote! 里可以用 #name 插值，#name 会被替换为实际的类型名
    let expanded = quote! {
        impl Describe for #name {
            fn describe(&self) -> String {
                // stringify! 把标识符转为字符串字面量
                stringify!(#name).to_string()
            }
        }
    };

    // 第四步：把生成的代码转回 TokenStream 返回给编译器
    expanded.into()
}
```

## 在主项目中使用

```rust
// src/main.rs
use my_macros::Describe;

trait Describe {
    fn describe(&self) -> String;
}

#[derive(Describe)]
struct Point { x: f64, y: f64 }

#[derive(Describe)]
struct Circle { radius: f64 }

#[derive(Describe)]
enum Direction { North, South, East, West }

fn main() {
    let p = Point { x: 1.0, y: 2.0 };
    let c = Circle { radius: 5.0 };
    let d = Direction::North;

    println!("{}", p.describe()); // Point
    println!("{}", c.describe()); // Circle
    println!("{}", d.describe()); // Direction
}
```

## 展开后的代码是什么样的

`#[derive(Describe)]` 在 `Point` 上展开后，编译器相当于看到了：

```rust
struct Point { x: f64, y: f64 }

// 宏自动生成的代码（invisible to user）：
impl Describe for Point {
    fn describe(&self) -> String {
        "Point".to_string()
    }
}
```

宏生成的代码和用户写的代码**并存**——宏不替换原来的结构体定义，只是**额外添加**了 impl 块。

# 提取字段信息

## 访问字段列表

仅仅输出类型名还不够。更多场景需要遍历字段，比如：
- `#[derive(Debug)]` 需要打印每个字段的名字和值
- `#[derive(Serialize)]` 需要把每个字段序列化为 JSON

下面演示如何遍历结构体的字段：

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, Data, Fields};

#[proc_macro_derive(FieldNames)]
pub fn field_names_derive(input: TokenStream) -> TokenStream {
    let ast = parse_macro_input!(input as DeriveInput);
    let name = &ast.ident;

    // 从 ast.data 里提取字段信息
    let field_names: Vec<String> = match &ast.data {
        // Data::Struct 说明这是一个结构体
        Data::Struct(data_struct) => {
            match &data_struct.fields {
                // 命名字段（如 struct Foo { x: i32, y: i32 }）
                Fields::Named(fields) => {
                    fields.named.iter()
                        .map(|f| f.ident.as_ref().unwrap().to_string())
                        .collect()
                }
                // 其他情况（元组结构体、单元结构体）暂时不处理
                _ => vec![],
            }
        }
        // 如果不是结构体，暂时返回空
        _ => vec![],
    };

    let fields_str = field_names.join(", ");

    let expanded = quote! {
        impl #name {
            pub fn field_names() -> &'static str {
                #fields_str
            }
        }
    };

    expanded.into()
}
```

用法：

```rust
#[derive(FieldNames)]
struct User {
    name: String,
    email: String,
    age: u32,
}

fn main() {
    println!("{}", User::field_names()); // name, email, age
}
```

## 完整示例：自动生成 Display

下面是一个更实用的例子——自动为只有一个字段的 newtype 结构体生成 `Display`：

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, Data, Fields};

// #[derive(NewtypeDisplay)] 为 struct Foo(InnerType) 自动实现 Display
// 委托给内部类型的 Display
#[proc_macro_derive(NewtypeDisplay)]
pub fn newtype_display_derive(input: TokenStream) -> TokenStream {
    let ast = parse_macro_input!(input as DeriveInput);
    let name = &ast.ident;

    // 检查是否是单字段元组结构体
    let is_newtype = matches!(
        &ast.data,
        Data::Struct(s) if matches!(&s.fields, Fields::Unnamed(f) if f.unnamed.len() == 1)
    );

    if !is_newtype {
        // compile_error! 宏可以让编译器输出自定义错误信息
        return quote! {
            compile_error!("NewtypeDisplay 只能用于单字段元组结构体，如 struct Foo(Bar)");
        }.into();
    }

    // 生成：impl Display for Foo，委托给 self.0 的 Display
    quote! {
        impl std::fmt::Display for #name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                std::fmt::Display::fmt(&self.0, f)
            }
        }
    }.into()
}
```

> **注意**：以上过程宏代码需要在独立的 proc-macro crate 中运行。`cargo-expand` 工具可以让你看到宏展开后的代码（`cargo expand`），在调试时很有用。

# 练习题

## derive 宏原理测验

```quiz single
Q: #[derive(MyTrait)] 宏的返回值会被编译器如何处理？
- 替换掉被标注的结构体定义
- 作为注释存储，不影响实际编译
- 替换掉文件中所有相关代码
+ 追加到被标注的结构体定义之后，相当于自动写了一个 impl 块
E: derive 宏不修改原来的结构体定义，只是在它后面追加生成的代码。所以被 #[derive(Debug)] 标注的结构体，编译器会看到原始的 struct 定义 + 自动生成的 impl Debug for Xxx 实现，两者都存在。
```

```quiz single
Q: syn 和 quote 在过程宏开发中各自负责什么？
+ syn 负责把 TokenStream 解析为可操作的 Rust AST（让你能读取类型名、字段等），quote 负责通过模板生成新的 TokenStream（让你能生成 impl 块等代码）
- syn 负责执行过程宏，quote 负责注册过程宏
- syn 和 quote 功能相同，用哪个都行
- syn 处理结构体，quote 处理枚举
E: 两者是互补的一对工具：syn = 解析器（输入 TokenStream → Rust AST），quote = 代码生成器（Rust 语法模板 → 输出 TokenStream）。绝大多数 derive 宏都同时用这两个库。
```

```rust
// 过程宏代码（在 proc-macro crate 中）
#[proc_macro_derive(MyDerive)]
pub fn my_derive(input: TokenStream) -> TokenStream {
    let ast = parse_macro_input!(input as DeriveInput);
    let name = &ast.ident;
    quote! {
        impl MyTrait for #name {
            fn hello(&self) { println!("Hello from {}!", stringify!(#name)); }
        }
    }.into()
}
```

```quiz single
Q: 上面的宏展开后，#name 会被替换成什么？
- 宏函数本身的名字 my_derive
- 字符串 "name"
+ 被 #[derive(MyDerive)] 标注的那个类型的标识符（如 Point、User 等）
- 编译时的时间戳
E: quote! 里的 #name 是插值语法，name 是之前从 ast.ident 获取的 Ident（类型名标识符）。如果你在 struct Point 上用了这个宏，#name 就会替换为 Point，生成 impl MyTrait for Point { ... }。
```

```quiz single
Q: 在过程宏里，如何向用户提供编译时错误信息？
- 写入错误日志文件
- 用 println! 输出错误
+ 在返回的 TokenStream 里包含 compile_error!("...") 宏调用，编译器会把它当作编译错误显示给用户
- 用 panic!() 宏
E: compile_error!("消息") 是一个特殊的内置宏，当编译器遇到它时，会把引号里的字符串当作编译错误输出。在过程宏里检测到非法使用时，返回 quote! { compile_error!("...") }.into() 是标准的错误报告方式。
```
