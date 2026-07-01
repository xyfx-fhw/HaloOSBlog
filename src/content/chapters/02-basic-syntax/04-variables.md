---
title: "变量与可变性"
description: "学习 Rust 的变量声明（let/mut/const）、作用域、遮蔽与冻结，理解「默认不可变」的设计哲学。"
difficulty: beginner
estimatedTime: 25
keywords: ["let", "mut", "const", "shadowing", "遮蔽", "作用域", "变量绑定"]
---

# 声明与绑定

Rust 的变量系统比大多数语言多了一个维度：**可变性由你显式控制**，而不是默认允许修改。

Rust 用 `let` 关键字声明变量。"变量绑定"这个名字比"变量赋值"更准确——你是在把一个值**绑定**到一个名字上。

## 基本语法

```rust runnable
fn main() {
    let x = 5;          // 整数，编译器推断为 i32
    let y = 3.14;       // 浮点，推断为 f64
    let z: u8 = 255;    // 也可以显式标注类型
    let flag = true;    // 布尔值

    println!("x={} y={} z={} flag={}", x, y, z, flag);
}
```

> **类型推断**：Rust 的编译器非常聪明，大多数情况下能从赋值和使用方式推断出变量类型，你不需要每次都写类型注解。当推断不了时，编译器会直接报错告诉你需要补上。

## 默认不可变

Rust 的变量**默认是不可变的**——绑定之后，值就不能再改变：

```rust runnable expect-error
fn main() {
    let x = 5;
    x = 6; // 错误！不能对不可变变量二次赋值
    println!("{}", x);
}
```

编译器会给出非常清晰的错误信息，甚至告诉你解决方法：

```text
   Compiling playground v0.0.1 (/playground)
error[E0384]: cannot assign twice to immutable variable `x`
 --> src/main.rs:3:5
  |
2 |     let x = 5;
  |         - first assignment to `x`
3 |     x = 6; // 错误！不能对不可变变量二次赋值
  |     ^^^^^ cannot assign twice to immutable variable
  |
```

## 为什么要默认不可变？

这是 Rust 最有意思的设计决策之一，值得认真理解。

**问题场景**：假设你的程序里有这样一段逻辑——

```rust runnable
fn calculate_tax(income: f64) -> f64 {
    let rate = 0.20; // 税率 20%，"感觉"不会变

    // 假设中间有很多逻辑……
    let taxable = income * 0.8;

    //...很多行代码...

    // 某个地方悄悄修改了 rate（比如另一个同事写的）
    // rate = 0.25; // 如果是可变的，这行可能潜伏在几百行之后

    //...很多行代码...

    taxable * rate // 这里用的是哪个 rate？
}

fn main() {
    println!("税额: {:.2}", calculate_tax(100_000.0));
}
```

在大型项目中，`rate` 可能在函数的前半段设置，在几百行之后的某处被意外修改，导致最终计算结果出错。追踪这类 bug 非常痛苦——你不得不在整个函数里搜索"谁改了这个值"。

**Rust 的解法**：变量默认不可变。如果 `rate` 不需要改变，就不加 `mut`——编译器**保证**它不会被任何地方修改，你读代码时可以完全放心地说"这个值从声明到用完都是 0.20"。

```rust runnable expect-error
fn main() {
    let config_value = 42; // 配置项，不应该被修改

    // 几百行之后，某处意外尝试修改它……
    config_value = 99; // 编译器：不行！

    println!("{}", config_value);
}
```

> **不可变性 ≠ 性能损失**：不可变变量和可变变量在运行时没有性能差异，不可变只是编译期的约束。`mut` 是你告诉编译器"我真的需要修改这个值"的明确声明，而不是一个优化开关。

## 先声明，后初始化

可以先声明变量，稍后再给它赋值——但 **Rust 绝不允许使用未初始化的变量**：

```rust runnable
fn main() {
    let result; // 只声明，不赋值

    {
        let base = 4;
        result = base * base; // 在内层作用域里初始化
    }

    println!("result = {}", result); // 可以使用，因为已经初始化了
}
```

```rust runnable expect-error
fn main() {
    let x;
    println!("{}", x); // 错误！使用了未初始化的变量
    x = 1;
}
```

> 这和 C 语言不同。C 允许使用未初始化的变量（值是不确定的垃圾数据），这是很多 bug 的来源。Rust 编译器在编译期就禁止这种情况，彻底杜绝了"读垃圾值"的问题。

## 用 `_` 前缀抑制未使用警告

声明了但没有使用的变量，编译器会发出警告。如果某个变量是有意不使用的（比如调试时临时写的），加上 `_` 前缀可以告诉编译器"我知道，不用提醒我"：

```rust runnable
fn main() {
    let _intentionally_unused = 42; // 不会警告
    let also_unused = 99;           // 会警告：unused variable

    println!("只用这一个");
    // also_unused 从未被读取
    let _ = also_unused;            // 用 let _ = 显式丢弃也可以
}
```

# 可变与常量

## 用 `mut` 声明可变变量

在变量名前加 `mut`，就可以在绑定后修改它的值：

```rust runnable
fn main() {
    let mut count = 0;

    count += 1;
    count += 1;
    count += 1;

    println!("count = {}", count); // 3
}
```

`mut` 不只是给编译器看的，也是给**读代码的人**看的——它明确传达"这个变量的值会变化"。没有 `mut` 的变量，阅读代码时可以放心地认为它的值从始至终不变。

## 用 `const` 声明常量

`const` 声明的是真正的常量，有几个与 `let` 不同的规则：

```rust runnable
// 常量通常在函数外声明（全局可见），也可以在函数内
const MAX_SCORE: u32 = 100;
const SECONDS_PER_HOUR: u32 = 60 * 60; // 常量表达式，编译时计算

fn main() {
    println!("满分: {}", MAX_SCORE);
    println!("一小时: {} 秒", SECONDS_PER_HOUR);
}
```

`const` 的特点：
- **必须标注类型**：编译器不推断常量类型
- **命名约定**：全大写字母 + 下划线分隔（`SCREAMING_SNAKE_CASE`）
- **只能是常量表达式**：不能是函数调用结果或运行时才知道的值
- **在任意作用域有效**：包括全局，整个程序运行期间都存在

## `let` / `let mut` / `const` 对比

| | `let` | `let mut` | `const` |
|---|---|---|---|
| 可变 | 否 | **是** | 否（永远） |
| 必须标注类型 | 否（推断） | 否（推断） | **是** |
| 作用域 | 块作用域 | 块作用域 | 任意（含全局） |
| 能遮蔽 | 是 | 是 | 否 |
| 典型用途 | 局部值 | 需要修改的值 | 程序常量、配置值 |

> **const 与不可变 let 的本质区别**：`let` 默认不可变，但可以被遮蔽（重新绑定，下一页会讲到）；`const` 是真正的常量，不能被任何操作改变，编译器会把它内联到每个使用处。

# 作用域与遮蔽

## 作用域

变量的作用域由 `{}` 划定——超出大括号，变量就不再存在：

```rust runnable
fn main() {
    let outer = "外层";

    {
        let inner = "内层";
        println!("{} 和 {}", outer, inner); // 内层可以访问外层
    }

    println!("{}", outer);  // 正常
    // println!("{}", inner); // 错误！inner 已离开作用域
}
```

## 变量遮蔽

用 `let` 重新声明同名变量，会**遮蔽**（shadow）之前的变量——新变量使旧变量失效，在当前作用域内使用新值。遮蔽实际上是创建了一个同名的新变量（会消耗另外的内存），它在该作用域内遮挡外层同名变量，使其暂时无法访问：

```rust runnable
fn main() {
    let x = 5;
    println!("原始 x = {}", x); // 5

    let x = x + 1; // 遮蔽：新 x = 旧 x + 1
    println!("遮蔽后 x = {}", x); // 6

    {
        let x = x * 2; // 内层作用域遮蔽
        println!("内层 x = {}", x); // 12
    }

    println!("离开内层后 x = {}", x); // 回到 6，内层遮蔽消失
}
```

遮蔽有一个 `mut` 做不到的能力：**改变变量的类型**：

```rust runnable
fn main() {
    // mut 无法做到这件事（类型不能改变）
    let spaces = "   ";           // &str 类型
    let spaces = spaces.len();    // 遮蔽为 usize 类型

    println!("空格数: {}", spaces);

    // 如果用 mut 尝试改类型，会编译报错：
    // let mut spaces = "   ";
    // spaces = spaces.len(); // 错误！类型不匹配
}
```

> **遮蔽 vs mut 的选择**：如果需要修改同一个值，用 `mut`；如果想对一个值做一次性转换后得到一个新的不可变绑定，用遮蔽——遮蔽后的变量默认仍是不可变的。

## 冻结

当一个可变变量被**不可变绑定遮蔽**时，在该作用域内它就被"冻结"了，不能再修改。离开该作用域后，可变性恢复：

```rust runnable expect-error
fn main() {
    let mut value = 100;

    {
        let value = value; // 用不可变绑定遮蔽 value，冻结它
        value = 200;       // 错误！value 在此作用域被冻结
    }

    // 离开内层作用域，冻结解除
    value = 200; // 正常！
    println!("{}", value);
}
```

冻结的本质：遮蔽创建了一个新的不可变变量（名字相同），在它的作用域内，可变的外层变量被"挡住"了，无从访问。

# 练习题

## 不可变变量的错误

```rust
fn main() {
    let score = 100;
    score = 90;
    println!("{}", score);
}
```

```quiz single
Q: 上面的代码会发生什么？
+ 编译错误：不能对不可变变量二次赋值
- 正常运行，输出 90
- 输出 100（赋值被忽略）
- 运行时 panic
E: Rust 变量默认不可变。score 没有用 mut 声明，所以 score = 90 这一行会导致编译错误 E0384。要修复，需要将声明改为 let mut score = 100;。
```

## mut 的含义

```quiz single
Q: 在变量名前加 `mut` 除了让变量可以修改，还有什么意义？
- 允许变量跨作用域使用
+ 向阅读代码的人传达"这个变量的值会发生变化"
- 让变量在内存中占用更少空间
- 让编译器优化变量访问速度
E: mut 是给人看的信号，不只是给编译器看的。没有 mut 的变量，读代码时可以放心推断它的值从头到尾不变；有 mut 就意味着需要注意它何时被修改。
```

## const 与 let 的区别

```quiz multi
Q: 下列关于 `const` 与不可变 `let` 的区别，哪些是正确的？
+ const 只能是编译时常量表达式，不能是运行时计算的值
+ const 可以在函数外（全局作用域）声明，整个程序运行期间有效
- const 和不可变 let 完全相同，只是写法不同
+ const 必须显式标注类型，let 可以推断
E: const 和不可变 let 有实质区别：const 必须标注类型、命名用全大写、可在全局使用、只能是编译期确定的值，且永远不能被遮蔽。不可变 let 只是默认不可变，仍然可以被同名 let 遮蔽。
```

## 遮蔽的能力

```rust
fn main() {
    let x = "hello";
    let x = x.len();
    println!("{}", x);
}
```

```quiz single
Q: 上面的代码能编译成功吗？输出什么？
- 不能，x 已经声明，不能用 let 重新声明
- 能编译，输出 hello
+ 能编译，输出 5
- 不能，变量类型不能改变
E: Rust 的遮蔽（shadowing）允许用同名变量创建新绑定，新绑定可以是不同的类型。x.len() 返回字符串长度 5（usize 类型），新的 x 遮蔽了旧的 x。这是遮蔽区别于 mut 的重要特性。
```

## 变量超出作用域

```rust
fn main() {
    let x = 1;
    {
        let y = 2;
        println!("{}", x + y);
    }
    println!("{}", y);
}
```

```quiz single
Q: 上面代码会发生什么？
+ 编译错误：y 在第二个 println! 处已超出作用域
- 运行时错误：y 未定义
- 正常运行，输出 3 和 2
- 正常运行，输出 3 和 0
E: y 是在内层 {} 中声明的，作用域在 } 处结束。外层的 println!("{}", y) 试图使用已超出作用域的 y，编译器会直接报错。Rust 的作用域规则由编译器在编译时强制执行。
```

## 未初始化变量

```quiz single
Q: 下列关于 Rust 未初始化变量的说法，哪个正确？
- 未初始化变量的值是随机的（像 C 语言一样）
- 未初始化变量的值是 0
- 未初始化变量在运行时会触发 panic
+ 使用未初始化变量会导致编译错误，无法通过编译
E: Rust 在编译期就禁止使用未初始化变量，这是比 C/C++ 更安全的地方。C 语言读取未初始化变量会得到不确定的垃圾值，可能导致难以追踪的 bug。Rust 的编译器分析代码流程，确保每个变量在使用前一定已经被赋值。
```

## 编程练习 1

下面的代码想实现一个简单的计数器，但有编译错误，请修复它：

```rust editable
fn main() {
    let count = 0;

    count = count + 1;
    count = count + 1;
    count = count + 1;

    println!("count = {}", count);
}
```

```expected
count = 3
```

## 编程练习 2

用遮蔽把字符串 `"  Rust  "` 分三步处理：先去掉首尾空白，再转换为大写，最后输出长度。每一步用同名变量 `s` 遮蔽，不使用 `mut`。

```rust editable
fn main() {
    let s = "  Rust  ";
    // TODO: 第一步：s = s.trim()（去掉首尾空白）
    // TODO: 第二步：s = s.to_uppercase()（转大写）
    // TODO: 第三步：s = s.len()（取长度）
    println!("{}", s);
}
```

```expected
4
```
