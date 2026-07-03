---
title: "类属性宏"
description: "掌握类属性宏的编写方式，理解它与 derive 宏的区别，学会用 #[proc_macro_attribute] 为函数、结构体等任意项添加自定义行为。"
difficulty: advanced
estimatedTime: 30
keywords: ["类属性宏", "proc_macro_attribute", "属性", "路由宏", "框架"]
---

# 属性宏的特点

## 与 derive 宏的对比

你已经学会了 derive 宏。现在来看**类属性宏**（Attribute Macro）——它比 derive 宏更灵活，也更强大。

两者的关键区别：

| | derive 宏 | 类属性宏 |
|--|--|--|
| 语法 | `#[derive(MyMacro)]` | `#[my_macro]` 或 `#[my_macro(args)]` |
| 只能用于 | 结构体和枚举 | **任意代码项**（函数、结构体、枚举、impl 块……） |
| 对原始代码 | **保留**原始定义，额外添加代码 | **可以完全替换**原始代码项 |
| 接收参数 | 无法直接传参（只能用辅助属性） | 可以通过 `#[macro(key = value)]` 传任意参数 |

以下都是类属性宏的真实例子：

```rust
// web 框架中标注路由
#[get("/users")]
async fn list_users() -> Vec<User> { ... }

// 追踪函数调用（tracing 库）
#[instrument(skip(password))]
fn login(username: &str, password: &str) -> Result<Token, Error> { ... }

// 测试框架标注异步测试（tokio）
#[tokio::test]
async fn test_database_connection() { ... }
```

## 属性宏的函数签名

属性宏函数接收**两个** `TokenStream`：

```rust
#[proc_macro_attribute]
pub fn my_attr(
    attr: TokenStream,  // #[my_attr(这里的内容)] ← 属性括号里的参数
    item: TokenStream,  // 被标注的代码项（函数体、结构体定义……）
) -> TokenStream {
    // 返回替换后的代码
}
```

- `attr`：属性括号里的参数，如 `#[route(GET, "/")]` 中的 `GET, "/"` 部分
- `item`：被标注的整个代码项（如函数的完整定义）
- 返回值：**替换** `item` 的新代码（注意：不是追加，而是替换！）

# 实现一个计时属性宏

## 需求：自动统计函数执行时间

你希望写这样的代码：

```rust
#[timed]
fn slow_computation(n: u64) -> u64 {
    // 模拟耗时计算
    (0..n).sum()
}
```

调用 `slow_computation(1000000)` 时，自动打印：

```text
slow_computation 执行耗时：5.2ms
```

不用每个函数都手动加计时代码，宏帮你搞定。

## 实现

属性宏的关键是：接收原始函数，生成一个包含计时逻辑的新函数。

```rust
// my-macros/src/lib.rs
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

#[proc_macro_attribute]
pub fn timed(
    _attr: TokenStream,  // 这个宏不需要参数，忽略 attr
    item: TokenStream,   // 被标注的函数
) -> TokenStream {
    // 把 item 解析为一个函数定义（ItemFn）
    let func = parse_macro_input!(item as ItemFn);

    // 提取函数信息
    let func_name = &func.sig.ident;        // 函数名
    let func_name_str = func_name.to_string(); // 函数名的字符串形式
    let func_vis = &func.vis;               // 可见性（pub、pub(crate) 等）
    let func_sig = &func.sig;               // 完整函数签名（名字、参数、返回类型）
    let func_body = &func.block;            // 函数体

    // 生成新函数：在原函数体外面包一层计时逻辑
    quote! {
        #func_vis #func_sig {
            let __start = std::time::Instant::now();
            let __result = (|| #func_body)(); // 把原函数体包进闭包执行
            let __elapsed = __start.elapsed();
            println!("{} 执行耗时：{:.1}ms", #func_name_str, __elapsed.as_secs_f64() * 1000.0);
            __result
        }
    }.into()
}
```

使用时：

```rust
use my_macros::timed;

#[timed]
fn compute_sum(n: u64) -> u64 {
    (0..n).sum()
}

fn main() {
    let result = compute_sum(10_000_000);
    println!("结果：{}", result);
    // 输出：
    // compute_sum 执行耗时：15.3ms
    // 结果：49999995000000
}
```

展开后，宏生成的代码相当于：

```rust
fn compute_sum(n: u64) -> u64 {
    let __start = std::time::Instant::now();
    let __result = (|| {
        (0..n).sum()  // 原函数体
    })();
    let __elapsed = __start.elapsed();
    println!("compute_sum 执行耗时：{:.1}ms", __elapsed.as_secs_f64() * 1000.0);
    __result
}
```

# 带参数的属性宏

## 接收和解析参数

属性宏可以通过 `#[my_macro(param)]` 传入参数，通过第一个 `attr: TokenStream` 接收。

下面实现一个 `#[retry(n)]` 宏——自动在函数失败时重试 n 次：

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, LitInt};

#[proc_macro_attribute]
pub fn retry(
    attr: TokenStream, // 接收括号里的参数，如 retry(3) 里的 "3"
    item: TokenStream,
) -> TokenStream {
    // 把参数解析为一个整数字面量
    let retry_count = parse_macro_input!(attr as LitInt);
    let count: u64 = retry_count.base10_parse().unwrap_or(3);

    let func = parse_macro_input!(item as ItemFn);
    let func_name = &func.sig.ident;
    let func_vis = &func.vis;
    let func_sig = &func.sig;
    let func_body = &func.block;

    quote! {
        #func_vis #func_sig {
            let mut __attempts = 0u64;
            loop {
                let __result = (|| #func_body)();
                match __result {
                    Ok(v) => return Ok(v),
                    Err(e) => {
                        __attempts += 1;
                        if __attempts >= #count {
                            eprintln!("{} 重试 {} 次后失败", stringify!(#func_name), #count);
                            return Err(e);
                        }
                        eprintln!("{} 第 {} 次失败，重试中...", stringify!(#func_name), __attempts);
                    }
                }
            }
        }
    }.into()
}
```

使用时：

```rust
use my_macros::retry;

#[retry(3)]  // 最多重试 3 次
fn fetch_data(url: &str) -> Result<String, String> {
    // 模拟可能失败的操作
    Err(format!("连接 {} 失败", url))
}

fn main() {
    match fetch_data("https://example.com") {
        Ok(data) => println!("数据：{}", data),
        Err(e) => println!("最终失败：{}", e),
    }
    // 输出：
    // fetch_data 第 1 次失败，重试中...
    // fetch_data 第 2 次失败，重试中...
    // fetch_data 重试 3 次后失败
    // 最终失败：连接 https://example.com 失败
}
```

# 练习题

## 类属性宏测验

```quiz single
Q: 类属性宏和 derive 宏最关键的区别是什么？
+ 类属性宏可以应用于任意代码项（函数、结构体、枚举等）并可以完全替换它们，derive 宏只能为结构体/枚举追加代码
- 类属性宏不需要 syn 和 quote
- derive 宏可以接收参数，类属性宏不能
- 类属性宏只能用于函数，derive 宏只能用于结构体
E: 两个关键区别：1. 适用范围——属性宏可以用于任意项，derive 宏只能用于结构体和枚举。2. 对原始代码的处理——derive 宏保留原始定义并追加代码，属性宏的返回值直接替换被标注的整个项。
```

```quiz single
Q: 类属性宏函数为什么接收两个 TokenStream 参数？
+ 一个是属性括号内的参数（如 #[macro(参数)] 里的"参数"），一个是被标注的代码项
- 两个参数实际上是同一个，是 Rust 的历史遗留设计
- 一个是类型信息，一个是值信息
- 一个是 derive 信息，一个是属性信息
E: 第一个参数 attr 是属性括号里的内容，比如 #[retry(3)] 里的 3，或 #[route(GET, "/")] 里的 GET, "/"。第二个参数 item 是被标注的整个代码项，比如完整的函数定义。两者用途完全不同。
```

```rust
// 假设宏实现如下：
#[proc_macro_attribute]
pub fn log_call(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let func = parse_macro_input!(item as ItemFn);
    let name = func.sig.ident.to_string();
    let vis = &func.vis;
    let sig = &func.sig;
    let body = &func.block;
    quote! {
        #vis #sig {
            println!("调用：{}", #name);
            #body
        }
    }.into()
}

// 使用宏标注函数：
#[log_call]
fn greet(name: &str) {
    println!("你好，{}", name);
}
```

```quiz single
Q: 使用 #[log_call] fn greet(name: &str) { println!("你好，{}", name); } 后，调用 greet("Alice") 会输出什么？
- 你好，Alice
- 编译错误，log_call 没有实现
+ 调用：greet\n你好，Alice
- 调用：greet
E: 宏在原函数体前插入了 println!("调用：{}", #name)，所以函数先打印"调用：greet"，然后执行原函数体打印"你好，Alice"，最终输出两行。
```

```quiz multi
Q: 关于类属性宏的返回值，下列哪些说法是正确的？
+ 如果返回原始 item 不变，效果等于"什么都没做"
- 必须返回 empty TokenStream
+ 返回值会完全替换被标注的代码项
- 返回值会被追加到被标注的代码项之后
E: 类属性宏的返回值是"替换"语义：返回什么，编译器就看到什么——原始被标注的代码消失，取而代之的是你返回的 TokenStream。如果你把 item 原样返回（不加任何修改），效果就是没有修改原始代码。如果你返回包装了计时逻辑的新函数，原始函数就被替换了。
```
