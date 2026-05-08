---
title: "函数"
description: "学习 Rust 函数的定义、参数声明、语句与表达式的区别，以及如何正确返回值。"
difficulty: beginner
estimatedTime: 30
keywords: ["fn", "函数", "参数", "返回值", "语句", "表达式", "snake_case"]
---

# 函数基础

函数是组织代码的基本单位。本文介绍 Rust 函数的定义方式、参数规则，以及一个新手最容易踩的坑——语句与表达式的区别。

Rust 中函数无处不在，你已经认识了最重要的一个：`main`。

## 定义与调用

用 `fn` 关键字定义函数，后跟函数名和一对圆括号，再用花括号包裹函数体：

```rust runnable
fn main() {
    println!("Hello, world!");
    another_function(); // 调用另一个函数
}

fn another_function() {
    println!("这是另一个函数。");
}
```

**Rust 不关心函数定义的顺序**——`another_function` 定义在 `main` 之后完全没问题。只要在同一个作用域内定义过，就可以调用。

Rust 函数名使用 **snake_case**（蛇形命名法）：全部小写，单词之间用下划线连接。例如 `another_function`、`calculate_area`，而不是 `AnotherFunction` 或 `calculateArea`。

## 参数

函数可以声明参数，让调用者传入数据：

```rust runnable
fn main() {
    greet("Alice"); // 传入字符串字面量
}

fn greet(name: &str) {
    println!("你好，{}！", name);
}
```

**Rust 要求在函数签名中显式声明每个参数的类型**。这是一个有意为之的设计：只需看函数签名，不用查阅其他代码就能知道参数类型，编译器也不必在函数体外猜测类型。

如果省略类型标注，编译器会报错：

```rust runnable expect-error
fn add(x, y) -> i32 { // 错误：缺少参数类型
    x + y
}

fn main() {
    println!("{}", add(1, 2));
}
```

## 多个参数

多个参数用逗号分隔，每个参数都必须单独标注类型：

```rust runnable
fn main() {
    print_measurement(5, 'h');
}

fn print_measurement(value: i32, unit: char) {
    println!("测量值：{}{}", value, unit);
}
```

注意 `value: i32, unit: char` 不能省写成 `value, unit: i32, char`——每个参数都要写完整的 `名称: 类型` 对。

# 语句与返回值

Rust 是一门**基于表达式**的语言。理解语句和表达式的区别，是写好 Rust 函数的关键。

## 语句与表达式的区别

- **语句**（statement）：执行操作，**不返回值**。
- **表达式**（expression）：计算并**产生一个值**。

`let` 绑定是语句，`5 + 6` 是表达式。因此，你无法把 `let` 赋值的结果再赋给别的变量——它根本没有返回值：

```rust runnable expect-error
fn main() {
    let x = (let y = 6); // 错误：let 是语句，没有返回值
    println!("{}", x);
}
```

这和 C 或 Ruby 不同。在那些语言里 `x = y = 6` 是合法的，因为赋值语句会返回被赋的值。Rust 选择了更严格的设计：赋值就是赋值，不能当表达式使用。

## 代码块是表达式

花括号 `{}` 包裹的代码块本身也是一个表达式，**整个块的值是最后一行表达式的值**：

```rust runnable
fn main() {
    let y = {
        let x = 3;
        x + 1  // 注意：没有分号，这是表达式
    };

    println!("y 的值是：{}", y); // 打印 4
}
```

关键在 `x + 1` 这一行——**没有分号**。一旦加上分号，它就从表达式变成了语句，整个块的值变成空的 `()`。

## 返回值

函数的返回值用 `->` 声明类型，**返回值就是函数体最后一个表达式的值**：

```rust runnable
fn five() -> i32 {
    5  // 没有分号，这是返回值
}

fn main() {
    let x = five();
    println!("x 的值是：{}", x); // 打印 5
}
```

`five` 函数体只有一个裸数字 `5`，没有 `return`，没有分号——这完全合法。函数体的最后一个表达式就是返回值。

可以用 `return` 提前返回，这在需要提前退出时很有用：

```rust runnable
fn absolute_value(n: i32) -> i32 {
    if n < 0 {
        return -n; // 提前返回
    }
    n // 正常路径：最后一个表达式
}

fn main() {
    println!("{}", absolute_value(-7)); // 7
    println!("{}", absolute_value(3));  // 3
}
```

## 分号陷阱

这是 Rust 新手最常遇到的错误：在返回值表达式末尾多加了分号。

```rust runnable expect-error
fn plus_one(x: i32) -> i32 {
    x + 1; // 错误：加了分号，变成语句，返回 ()，与 i32 不符
}

fn main() {
    println!("{}", plus_one(5));
}
```

编译器会报 `mismatched types`，并贴心地提示"consider removing this semicolon"。记住规则：**函数体最后一行如果是返回值，不加分号**。

正确写法：

```rust runnable
fn plus_one(x: i32) -> i32 {
    x + 1 // 没有分号
}

fn main() {
    println!("{}", plus_one(5)); // 打印 6
}
```

# 练习题

## 函数基础测验

```quiz single
Q: Rust 函数签名中参数类型的声明规则是什么？
- 可以省略，编译器会自动推断
+ 每个参数都必须显式声明类型
- 只有第一个参数需要声明类型
- 可以用 auto 关键字让编译器推断
E: Rust 要求函数签名中每个参数都显式声明类型。这是有意设计：让函数签名本身就成为文档，调用者和编译器都不需要推断参数类型。
```

```quiz single
Q: 下面哪个函数名符合 Rust 的命名规范？
- calculateArea
- CalculateArea
+ calculate_area
- Calculate_Area
E: Rust 使用 snake_case（蛇形命名法），全部小写，单词用下划线分隔。
```

```quiz single
Q: 在 Rust 中，以下说法正确的是？
- 函数必须在调用之前定义
+ 函数可以在调用之后定义，只要在同一作用域内
- 函数必须定义在 main 函数之前
- 函数只能在文件顶部定义
E: Rust 不关心函数定义的顺序，只要函数在同一个作用域内定义过，就可以在任何位置调用。
```

## 语句与返回值测验

```rust
fn main() {
    let y = {
        let x = 10;
        x * 2
    };
    println!("{}", y);
}
```

```quiz single
Q: 上面的代码输出什么？
- 10
+ 20
- 编译错误
- ()
E: 代码块 { let x = 10; x * 2 } 是一个表达式，其值是最后一行 x * 2 = 20（注意没有分号）。y 被绑定到 20。
```

```rust
fn double(x: i32) -> i32 {
    x * 2;
}
```

```quiz single
Q: 上面的函数有什么问题？
- 参数类型错误
- 返回值类型应该是 i32 以外的类型
+ x * 2 后面有分号，使其变成语句，函数实际返回 ()
- 没有问题，能正常编译
E: x * 2; 末尾有分号，这把它从表达式变成了语句。语句不返回值（返回单元类型 ()），与声明的 -> i32 不符，编译报 mismatched types 错误。去掉分号即可修复。
```

```quiz multi
Q: 下列哪些是 Rust 中的表达式（而非语句）？
+ 5 + 3
- let x = 5;
+ { let a = 1; a + 2 }
+ "hello"
- fn foo() {}
E: 表达式计算并产生一个值：5+3 产生 8，代码块产生最后一个表达式的值，字符串字面量产生 &str 值。let 绑定和函数定义是语句，不返回值。
```

## 编程练习

### 练习一：实现 add 函数

补全下面的函数，使其返回两个整数之和。注意不要在返回值表达式末尾加分号。

```rust editable
fn add(a: i32, b: i32) -> i32 {
    // TODO：返回 a + b
}

fn main() {
    println!("{}", add(3, 4));   // 应输出 7
    println!("{}", add(-1, 5));  // 应输出 4
}
```

```expected
7
4
```

### 练习二：温度转换

实现一个摄氏度转华氏度的函数。转换公式：`华氏度 = 摄氏度 × 9 / 5 + 32`。

```rust editable
fn celsius_to_fahrenheit(c: i32) -> i32 {
    // TODO：实现转换公式
}

fn main() {
    println!("{}°C = {}°F", 0, celsius_to_fahrenheit(0));    // 0°C = 32°F
    println!("{}°C = {}°F", 100, celsius_to_fahrenheit(100)); // 100°C = 212°F
    println!("{}°C = {}°F", 37, celsius_to_fahrenheit(37));   // 37°C = 98°F
}
```

```expected
0°C = 32°F
100°C = 212°F
37°C = 98°F
```
