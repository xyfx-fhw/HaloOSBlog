---
title: "格式化输出进阶"
description: "深入理解 Display 与 Debug 的区别，掌握格式化参数的完整用法，学会为自定义类型实现优雅的输出"
difficulty: advanced
estimatedTime: 30
keywords: ["Display", "Debug", "格式化", "fmt", "write!", "精度", "对齐", "填充"]
---

# Display 与 Debug

## 两种"打印"方式的本质区别

你用过 `println!("{}", x)` 和 `println!("{:?}", x)`，但可能没想过它们背后的差异：

| 格式 | 对应 trait | 设计意图 |
|------|-----------|---------|
| `{}` | `Display` | **面向用户**：给人看的可读输出 |
| `{:?}` | `Debug` | **面向开发者**：调试用的详细输出 |
| `{:#?}` | `Debug`（美化） | 带缩进的 Debug 输出 |

类比：
- `Display` 是你对外展示的名片——简洁、美观
- `Debug` 是程序员查 bug 时看的日志——完整、精确

```rust runnable
#[derive(Debug)]  // 自动生成 Debug 实现
struct Point {
    x: f64,
    y: f64,
}

fn main() {
    let p = Point { x: 3.14, y: -2.71 };

    println!("{:?}", p);   // Debug：Point { x: 3.14, y: -2.71 }
    println!("{:#?}", p);  // 美化 Debug，带缩进
}
```

## 为什么标准库类型不能直接 `{}`

`#[derive(Debug)]` 是编译器自动给你生成 `Debug` 实现，但没有对应的 `#[derive(Display)]`——`Display` **必须手动实现**，因为"如何给用户展示"是业务决策，编译器不知道你想怎么显示。

比如 `Point { x: 3.14, y: -2.71 }` 对用户来说可能要显示成：
- `(3.14, -2.71)`
- `3.14, -2.71`
- `x=3.14, y=-2.71`

全看你的需求，所以必须你来定义。

## 实现 Display

实现 `Display` 需要引入 `std::fmt`，并实现 `fmt` 方法：

```rust runnable
use std::fmt;

struct Point {
    x: f64,
    y: f64,
}

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        // write! 向 Formatter 写入内容，返回 fmt::Result
        write!(f, "({:.2}, {:.2})", self.x, self.y)
    }
}

fn main() {
    let p = Point { x: 3.14159, y: -2.71828 };
    println!("{}", p);          // (3.14, -2.72)
    let s = p.to_string();      // Display 自动提供 to_string()
    println!("{}", s);          // (3.14, -2.72)
}
```

实现了 `Display`，`to_string()` 方法就免费得到了——标准库自动为实现 `Display` 的类型提供 `to_string()`。

更复杂的例子——为链表实现显示：

```rust runnable
use std::fmt;

struct Matrix {
    data: Vec<Vec<f64>>,
    rows: usize,
    cols: usize,
}

impl fmt::Display for Matrix {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        for (i, row) in self.data.iter().enumerate() {
            write!(f, "[")?;
            for (j, val) in row.iter().enumerate() {
                if j > 0 { write!(f, ", ")?; }
                write!(f, "{:6.2}", val)?;  // 宽度6，2位小数
            }
            write!(f, "]")?;
            if i < self.rows - 1 { writeln!(f)?; }  // 最后一行不加换行
        }
        Ok(())
    }
}

fn main() {
    let m = Matrix {
        data: vec![
            vec![1.0, 2.0, 3.0],
            vec![4.5, 5.5, 6.5],
            vec![7.0, 8.0, 9.0],
        ],
        rows: 3,
        cols: 3,
    };
    println!("{}", m);
}
```

# 格式化参数详解

## 宽度、对齐与填充

格式化字符串可以精确控制输出的排版：

```rust runnable
fn main() {
    // 宽度：数字后面跟位数
    println!("{:10}", "hello");    // "hello     "（右边补空格到10位）

    // 对齐：< 左对齐，> 右对齐，^ 居中
    println!("{:<10}", "hello");   // "hello     "（左对齐）
    println!("{:>10}", "hello");   // "     hello"（右对齐）
    println!("{:^10}", "hello");   // "  hello   "（居中）

    // 填充字符：在 < > ^ 前面写
    println!("{:*<10}", "hi");     // "hi********"（用*填充，左对齐）
    println!("{:0>5}", 42);        // "00042"（用0填充，右对齐）
    println!("{:-^20}", " 标题 "); // "-------  标题  -------"（居中）
}
```

数字的特殊格式：

```rust runnable
fn main() {
    // 精度（小数位数）
    println!("{:.3}", 3.14159);  // 3.142（四舍五入到3位）
    println!("{:.0}", 3.7);      // 4（四舍五入到整数）

    // 宽度 + 精度组合
    println!("{:10.3}", 3.14);   // "     3.140"（宽10，3位小数）

    // 正数显示 +
    println!("{:+}", 42);        // +42
    println!("{:+}", -42);       // -42

    // 进制
    println!("{:b}", 42);        // 101010（二进制）
    println!("{:o}", 42);        // 52（八进制）
    println!("{:x}", 255);       // ff（十六进制小写）
    println!("{:X}", 255);       // FF（十六进制大写）
    println!("{:#x}", 255);      // 0xff（带 0x 前缀）
    println!("{:#b}", 42);       // 0b101010（带 0b 前缀）
}
```

## 命名参数与位置参数

```rust runnable
fn main() {
    // 位置参数
    println!("{0} + {1} = {2}", 1, 2, 3);       // 1 + 2 = 3
    println!("{0}，你好！{0}，再见！", "Alice"); // Alice，你好！Alice，再见！

    // 命名参数
    println!("{name} 今年 {age} 岁", name = "Bob", age = 30);

    // 变量捕获（Rust 1.58+）
    let user = "Carol";
    let count = 5;
    println!("{user} 有 {count} 条消息");  // 直接用变量名
}
```

## 动态宽度与精度

宽度和精度也可以用变量指定，用 `$` 语法引用位置或命名参数：

```rust runnable
fn main() {
    // 宽度用变量
    let width = 10;
    println!("{:>width$}", "hi");  // "        hi"（宽度10，右对齐）

    // 精度用变量
    let precision = 4;
    println!("{:.precision$}", 3.14159); // 3.1416

    // 打印对齐的表格
    let items = vec![
        ("苹果", 3.5_f64, 10_u32),
        ("香蕉", 1.2_f64, 25_u32),
        ("草莓", 8.8_f64, 5_u32),
    ];

    println!("{:<8} {:>8} {:>6}", "商品", "单价(元)", "数量");
    println!("{:-<24}", "");
    for (name, price, qty) in &items {
        println!("{:<8} {:>8.2} {:>6}", name, price, qty);
    }
}
```

## 自定义格式（实现多种 fmt trait）

除了 `Display` 和 `Debug`，还可以实现其他格式 trait，让你的类型支持 `{:b}`、`{:x}` 等：

```rust runnable
use std::fmt;

struct Color {
    r: u8,
    g: u8,
    b: u8,
}

// {} 输出：rgb(255, 128, 0)
impl fmt::Display for Color {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "rgb({}, {}, {})", self.r, self.g, self.b)
    }
}

// {:#x} 输出：#ff8000（十六进制 HTML 颜色）
impl fmt::LowerHex for Color {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        if f.alternate() {
            // f.alternate() 检测是否有 # 标志（如 {:#x}）
            write!(f, "#{:02x}{:02x}{:02x}", self.r, self.g, self.b)
        } else {
            write!(f, "{:02x}{:02x}{:02x}", self.r, self.g, self.b)
        }
    }
}

fn main() {
    let c = Color { r: 255, g: 128, b: 0 };
    println!("{}", c);    // rgb(255, 128, 0)
    println!("{:x}", c);  // ff8000
    println!("{:#x}", c); // #ff8000
}
```

# 练习题

## 格式化输出测验

```quiz single
Q: Display 和 Debug 的核心区别是什么？
- Display 只能用于基本类型，Debug 可以用于任意类型
- Display 用 {}，Debug 用 {:?}，没有其他区别
- Debug 实现了 Display 的全部功能，所以只需要实现 Debug
+ Display 面向用户（需要手动实现，表达业务含义），Debug 面向开发者（可以 #[derive] 自动生成，显示结构详情）
E: 关键区别在设计意图上。Display 是"对外展示"，格式由你决定（所以编译器无法自动生成）。Debug 是"供调试"，格式就是 Rust 结构本身的表示（所以可以 #[derive(Debug)] 让编译器自动生成）。实现了 Display 还能免费获得 to_string() 方法。
```

```quiz single
Q: 实现了 Display trait 之后，额外免费获得了什么？
- 可以用 println!("{:?}", ...) 打印
+ 自动实现了 to_string() 方法（因为标准库为所有实现 Display 的类型提供了 ToString）
- 自动实现了 PartialEq
- 自动实现了 Debug
E: 标准库有一个实现：impl<T: Display> ToString for T。也就是说，只要实现了 Display，就自动得到 to_string() 方法。这就是为什么数字、字符串等都可以调用 .to_string()。
```

```rust
fn main() {
    println!("{:0>6}", 42);
}
```

```quiz single
Q: 上面的代码输出什么？
- 42    
- 420000
- 编译错误
+ 000042
E: {:0>6} 解读：0 是填充字符，> 是右对齐，6 是总宽度。右对齐意味着内容靠右，左边补填充字符。42 是2位数，需要补4个0到左边，结果是 000042。
```

```quiz single
Q: println!("{:.2}", 3.14159) 的输出是什么？
- 3.14159
- 3.1
+ 3.14
- 3.141590
E: .2 指定精度为2位小数。3.14159 保留2位小数并四舍五入，第三位是1（小于5），所以结果是 3.14。
```

```quiz multi
Q: 关于格式化字符串，下列哪些写法是合法的？
+ println!("{:*^20}", "标题")  // 用 * 居中填充，宽度20
+ println!("{:>10}", "hi")  // 右对齐，宽度10
+ println!("{name} 今年 {age} 岁", name="Bob", age=30)  // 命名参数
- println!("{:display}", x)  // 用变量名指定格式
E: 合法的有：对齐和填充（:>10, :*^20）、命名参数（name="Bob"）。{:display} 不是有效的格式语法。动态宽度要用 {:width$} 语法（其中 width 是变量），不是 {:variablename}。
```

## 编程练习

为商品结构体实现 `Display`，输出格式化的价格标签：

```rust editable
use std::fmt;

struct Product {
    name: String,
    price: f64,
    in_stock: bool,
}

// TODO: 为 Product 实现 Display，格式如下：
// 商品名称              ¥ 19.90  [有货]
// 另一个商品            ¥  5.00  [缺货]
// 要求：
// - 商品名称左对齐，占 20 个字符宽度
// - 价格右对齐，占 8 个字符宽度，2 位小数
// - 库存状态：有货显示 [有货]，缺货显示 [缺货]

fn main() {
    let products = vec![
        Product { name: "红富士苹果".to_string(), price: 19.9, in_stock: true },
        Product { name: "进口蓝莓".to_string(), price: 58.0, in_stock: false },
        Product { name: "香蕉".to_string(), price: 5.0, in_stock: true },
    ];

    for p in &products {
        println!("{}", p);
    }
}
```

```expected
红富士苹果               ¥  19.90  [有货]
进口蓝莓                 ¥  58.00  [缺货]
香蕉                     ¥   5.00  [有货]
```
