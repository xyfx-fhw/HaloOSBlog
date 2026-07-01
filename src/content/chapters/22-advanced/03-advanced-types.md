---
title: "高级类型"
description: "掌握类型别名、newtype 模式、Never 类型与动态大小类型，让 Rust 的类型系统为代码提供更强的安全保障"
difficulty: advanced
estimatedTime: 30
keywords: ["类型别名", "newtype", "Never类型", "动态大小类型", "DST", "type alias"]
---

# 类型别名与 newtype

## 类型别名：给长类型起个短名字

有些类型写起来非常冗长，比如 `Box<dyn Fn(i32, i32) -> Result<i32, String>>`。
每次都要完整写出这一串既费时又容易出错。**类型别名**（type alias）让你给现有类型起个简短的名字：

```rust runnable
type MathOp = Box<dyn Fn(i32, i32) -> i32>;

fn make_adder() -> MathOp {
    Box::new(|a, b| a + b)
}

fn make_multiplier() -> MathOp {
    Box::new(|a, b| a * b)
}

fn main() {
    let add = make_adder();
    let mul = make_multiplier();
    println!("{}", add(3, 4)); // 7
    println!("{}", mul(3, 4)); // 12
}
```

语法很简单：`type 新名字 = 原类型;`

> **注意**：类型别名**不创建新类型**，只是名字替换。`MathOp` 和原来那一大串完全等价，编译器不会因为名字不同就阻止你混用它们。

## newtype 模式：创建真正有区别的类型

类型别名的"不创建新类型"有时候是问题。来看一个真实的反例：

1998 年，NASA 的火星气候轨道飞船坠毁。原因是一个软件团队用**英磅·秒**，另一个团队期望**牛顿·秒**，两者都是 `f64`，编译器完全不知道这是两种不同的量，放任了混用。

**newtype 模式**解决这个问题——用只有一个字段的元组结构体包装原类型，创建一个真正独立的新类型：

```rust runnable expect-error
struct Meters(f64);      // 米
struct Kilograms(f64);   // 千克

fn report_weight(kg: Kilograms) {
    println!("重量：{:.1} 千克", kg.0);
}

fn main() {
    let distance = Meters(1000.0);
    let weight = Kilograms(75.0);

    report_weight(weight);     // ✅
    report_weight(distance);   // ❌ 编译错误！Meters 不是 Kilograms
}
```

`Meters` 和 `Kilograms` 内部都是 `f64`，但编译器把它们当成完全不同的类型，不允许互换传递。

**访问内部值**用 `.0`，或者模式解构：

```rust runnable
struct Meters(f64);

fn main() {
    let d = Meters(1500.0);

    // 方式1：字段访问
    println!("距离：{:.1} 米", d.0);

    // 方式2：解构
    let Meters(value) = d;
    println!("距离：{:.1} 米", value);
}
```

## newtype 的另一个用途：绕过孤儿规则

Rust 有一条"孤儿规则"：你不能为**外部类型**实现**外部 trait**。

比如，你不能直接为标准库的 `Vec<i32>` 实现标准库的 `fmt::Display`——`Vec` 和 `Display` 都属于标准库，不属于你的代码。

但用 newtype 包装后，这个包装类型属于你，就可以自由实现任何 trait 了：

```rust runnable
use std::fmt;

struct MyVec(Vec<i32>);

impl fmt::Display for MyVec {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "[")?;
        for (i, val) in self.0.iter().enumerate() {
            if i > 0 { write!(f, ", ")?; }
            write!(f, "{}", val)?;
        }
        write!(f, "]")
    }
}

fn main() {
    let v = MyVec(vec![10, 20, 30, 40]);
    println!("{}", v); // [10, 20, 30, 40]
}
```

# Never 类型与动态大小类型

## Never 类型（`!`）：永不返回的函数

Rust 有一个特殊类型叫 **Never 类型**，写作 `!`，意思是"这个表达式**永远不会产生值**"。

哪些情况会有 `!` 类型？

| 情况 | 原因 |
|------|------|
| `panic!("...")` | 直接终止程序，没有返回 |
| `loop { }` | 无限循环，永远不会到达循环后面的代码 |
| `std::process::exit(0)` | 退出进程 |
| `continue` / `break`（不带值） | 跳出当前上下文，不产生值 |

声明一个返回 `!` 的函数：

```rust runnable
fn fail(msg: &str) -> ! {
    panic!("严重错误：{}", msg);
}

fn main() {
    // if 的两个分支：一个返回 i32，一个调用返回 ! 的函数
    // ! 和任何类型都兼容，所以编译器接受这段代码
    let x: i32 = if true { 42 } else { fail("不该到这里") };
    println!("{}", x);
}
```

`!` 类型的最大用处：它和**任何类型都兼容**。

来看一个具体场景——`match` 的每个分支必须返回相同类型，但有了 `!`，`panic!` 的分支可以和任何类型的分支搭配：

```rust runnable
fn positive_only(n: i32) -> u32 {
    match n >= 0 {
        true  => n as u32,
        false => panic!("需要非负数，得到了 {}", n),
        //        ^^^^^ 类型是 !，兼容上面的 u32
    }
}

fn main() {
    println!("{}", positive_only(5));  // 5
}
```

`break` 也是 `!` 类型，所以可以把 `loop` 当表达式用：

```rust runnable
fn main() {
    let mut count = 0;

    let result = loop {
        count += 1;
        if count == 5 {
            break count * 2; // break 把值传出 loop，整个 loop 表达式的值是 10
        }
    };

    println!("结果：{}", result); // 结果：10
}
```

## 动态大小类型（DST）

Rust 的大多数类型在编译时大小就已固定：`i32` 是 4 字节，`(u8, f64)` 是 16 字节。

但有些类型的大小只有在运行时才能确定，叫做**动态大小类型（Dynamically Sized Types，DST）**。最常见的两个：

- `str`（注意：不是 `&str`）— 字符串数据本身，长度随内容而变
- `dyn Trait`（注意：不是 `&dyn Trait`）— trait 对象，实际类型运行时才确定

**为什么不能直接用 `str`：**

```text
"hi"           → 2 字节
"hello"        → 5 字节
"hello, world" → 12 字节
```

`str` 的大小取决于内容，编译时不知道，所以不能直接存在栈上：

```rust runnable expect-error
fn print_message(msg: str) {  // ❌ 大小未知，不能直接用
    println!("{}", msg);
}
# fn main() {}
```

解决方案：用**引用**或**智能指针**包装，它们的大小始终固定：

- `&str` — 胖指针：数据指针（8字节）+ 长度（8字节）= 16 字节
- `Box<str>` — 同样是胖指针，只是拥有所有权

```rust runnable
fn print_message(msg: &str) {  // ✅ &str 大小固定（16字节）
    println!("{}", msg);
}

fn main() {
    print_message("hi");           // 2字节的 str，但 &str 始终是 16字节
    print_message("hello, world"); // 12字节的 str，但 &str 始终是 16字节
}
```

**核心规律**：DST 需要通过"胖指针"使用。胖指针 = 普通指针 + 额外元数据（长度或 vtable），大小固定，Rust 可以把它放在栈上。

# 练习题

## 类型别名与 newtype 测验

```quiz single
Q: type Meters = f64; 和 struct Meters(f64); 的最大区别是什么？
- 两者完全等价，没有区别
- type 不能用在函数参数里，struct 可以
+ type 只是别名（和 f64 完全等价可互换），struct 创建真正的新类型（不能和 f64 互传）
- type 创建新类型，struct 只是别名
E: type 关键字只是起别名——Meters 和 f64 在编译器眼里是同一个类型，可以互相传递。struct Meters(f64) 创建了一个全新的类型，编译器会严格区分 Meters 和 f64，也会区分 Meters 和其他任何 newtype。
```

```rust
struct Celsius(f64);
struct Fahrenheit(f64);

fn to_fahrenheit(c: Celsius) -> Fahrenheit {
    Fahrenheit(c.0 * 9.0 / 5.0 + 32.0)
}
```

```quiz single
Q: 上面的代码中，to_fahrenheit(Fahrenheit(100.0)) 会发生什么？
- 正常运行，Celsius 和 Fahrenheit 内部都是 f64 所以可以互换
- 正常运行，返回一个 Celsius
+ 编译错误：Fahrenheit 不是 Celsius，不能传入期望 Celsius 的函数
- 运行时错误
E: newtype 模式的全部意义在于：虽然 Celsius(f64) 和 Fahrenheit(f64) 内部都是 f64，但编译器把它们当做完全不同的类型。传 Fahrenheit 给期望 Celsius 的参数，是类型错误，编译器在编译阶段就会拒绝。
```

```quiz single
Q: 为什么 newtype 可以绕过孤儿规则？
- 孤儿规则只适用于泛型类型，newtype 不受约束
- 因为 newtype 是标准库的特殊语法，有额外权限
+ 因为 newtype 创建的是你自己代码里的新类型，你可以为自己的类型实现任何 trait
- 因为 newtype 在实现 trait 时会自动委托给内部类型
E: 孤儿规则说的是"外部 trait + 外部类型"的组合不能实现。struct MyVec(Vec<i32>) 这个类型属于你的 crate，所以你可以为 MyVec 实现 Display——即使 Display 和 Vec 都来自标准库，MyVec 本身是你的类型。
```

```quiz single
Q: 关于 Never 类型（!），下列说法正确的是？
- ! 类型的值可以被显式转换为任意类型的值
+ ! 类型和任何类型都兼容，所以 panic! 可以出现在需要返回具体类型的 match 分支里
- 声明 -> ! 的函数也可以在某些分支正常返回
- ! 只能用在 panic! 的返回类型标注上
E: ! 类型表示"永不产生值"。由于它永远不会产生值，编译器允许把它放在任何类型的位置——反正那段代码永远不会执行到，产生什么类型都无所谓。这使得 panic!、continue、break 等可以出现在需要具体类型的地方。
```

```quiz multi
Q: 关于动态大小类型（DST），下列哪些说法是正确的？
- dyn Trait 不是 DST，因为 vtable 大小是固定的
+ str 是动态大小类型，因为字符串的字节长度在运行时才确定
- &str 是动态大小类型，因为它可以指向任意长度的字符串
+ 不能直接将 str 作为函数参数类型（如 fn f(s: str)），必须通过引用或 Box
E: str 是 DST（大小随内容变化）。但 &str 不是——它是一个胖指针，大小固定为 16 字节（指针+长度）。dyn Trait 也是 DST，它的大小取决于实际类型；&dyn Trait 才是固定大小的胖指针。
```

## 编程练习

用 newtype 模式实现温度类型，防止摄氏度和华氏度混淆：

```rust editable
use std::fmt;

struct Celsius(f64);
struct Fahrenheit(f64);

// TODO: 为 Celsius 实现 Display，格式为 "100.0°C"
// TODO: 为 Fahrenheit 实现 Display，格式为 "212.0°F"

// TODO: 实现转换函数（转换公式：°F = °C × 9/5 + 32）
// fn celsius_to_fahrenheit(c: Celsius) -> Fahrenheit { ... }

fn main() {
    let boiling = Celsius(100.0);
    // let f = celsius_to_fahrenheit(boiling);
    // println!("{}", Celsius(100.0)); // 100.0°C
    // println!("{}", f);              // 212.0°F
}
```

```expected
100.0°C
212.0°F
```
