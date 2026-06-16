---
title: "类型铸造（as 关键字）"
description: "掌握 Rust 中的显式类型转换（as 关键字），理解整数转换规则、浮点转换和指针转换，避免数据溢出等常见陷阱。"
difficulty: beginner
estimatedTime: 30
keywords: ["类型转换", "类型铸造", "as", "转换规则", "溢出"]
---

# 类型铸造基础

## 为什么需要类型铸造

不同类型的数据之间有时需要互相转换。例如：
- 将浮点数转为整数
- 将整数转为字符
- 将小范围的整数转为大范围的整数

Rust **不提供隐式类型转换**（除了某些特殊情况如自动解引用）。这是 Rust 的安全哲学：**显式优于隐式**。如果你想转换类型，必须明确地说出来。

这样做的好处：
- **防止意外的数据丢失**（如 `f64 -> i32` 丢失小数部分）
- **明确意图**（代码清晰可读）
- **捕获错误**（编译器会检查非法转换）

## 基本语法

使用 **`as`** 关键字进行显式类型转换：

```rust runnable
fn main() {
    // 浮点数 -> 整数
    let float_val: f32 = 65.4;
    let int_val = float_val as i32;
    println!("浮点数 {} 转为整数 {}", float_val, int_val);
    
    // 整数 -> 浮点数
    let num = 100;
    let float_num = num as f64;
    println!("整数 {} 转为浮点数 {}", num, float_num);
    
    // 整数 -> 字符
    let code = 65u8;
    let character = code as char;
    println!("整数 {} 转为字符 '{}'", code, character);
}
```

## 整数转换规则

### 无符号整数之间的转换

当从一个无符号整数类型转换到另一个时，**只保留有效位**。多余的高位被丢弃：

```rust runnable
fn main() {
    // 1000 在 u8 范围内吗？u8 最大值是 255，所以不在
    // 1000 的二进制是 11111010000（11 位）
    // 只保留低 8 位：11101000 = 232
    let value = 1000u16;
    let narrow = value as u8;
    println!("1000 as u8 = {} (期望 232)", narrow);
    
    // 验证：1000 mod 256 = 232
    println!("1000 % 256 = {}", 1000 % 256);
}
```

> **记住**：对于无符号整数转换，转换后的值相当于原值对 `2^(目标位数)` 取模。

### 有符号整数的转换

有符号整数的转换涉及**二进制补码**（two's complement）。转换规则：

1. **如果值在目标范围内**，直接转换
2. **如果值超出范围**，先转为对应的无符号类型（按上面的规则），再按二进制补码解释

```rust runnable
fn main() {
    // 例子 1：值在范围内
    let num = 128i32;
    let as_i16 = num as i16;
    println!("128 as i16 = {}", as_i16);  // 仍是 128
    
    // 例子 2：值超出范围
    // 128 作为 u8 还是 128
    // 但 128 的二进制补码被解释为 i8 时，最高位是 1，所以是负数
    // 128 = 10000000 (i8) -> -128
    let num2 = 128i32;
    let as_i8 = num2 as i8;
    println!("128 as i8 = {} (二进制补码解释为 -128)", as_i8);
    
    // 例子 3：负数转无符号
    // -1 的二进制补码是 11111111（所有位都是 1）
    // 转为 u8 后保留所有 8 位，结果是 255
    let neg = -1i8;
    let as_u8 = neg as u8;
    println!("-1 as u8 = {}", as_u8);
}
```

### 有符号转无符号，无符号转有符号

```rust runnable
fn main() {
    // 有符号 -> 无符号：按二进制补码转换
    let signed: i32 = -42;
    let unsigned = signed as u32;
    println!("-42 as u32 = {}", unsigned);  // 大正数
    
    // 无符号 -> 有符号：按二进制补码解释
    let unsigned2: u32 = 4294967254;  // 就是 -42 的二进制表示
    let signed2 = unsigned2 as i32;
    println!("4294967254 as i32 = {}", signed2);  // -42
}
```

## 浮点数转换

### 浮点数 -> 整数

转换时**舍弃小数部分**（向 0 取整）：

```rust runnable
fn main() {
    let f1 = 3.99f32;
    let i1 = f1 as i32;
    println!("3.99 as i32 = {} (舍弃小数部分)", i1);  // 3
    
    let f2 = -3.99f32;
    let i2 = f2 as i32;
    println!("-3.99 as i32 = {}", i2);  // -3
    
    // 如果浮点数太大，超出整数范围会产生未定义行为
    // （在实践中通常转为 0 或该类型的最小值）
}
```

### 整数 -> 浮点数

通常没有精度问题，因为浮点数范围更大：

```rust runnable
fn main() {
    let i = 100i32;
    let f = i as f64;
    println!("{} as f64 = {}", i, f);
    
    // 但大整数可能因浮点精度限制而丧失精确性
    let big = 1_000_000_000_000_000_i64;
    let f_big = big as f64;
    println!("大整数转浮点：{} -> {}", big, f_big);
}
```

### 浮点数 -> 浮点数

```rust runnable
fn main() {
    let f32_val: f32 = 3.14;
    let f64_val = f32_val as f64;
    println!("f32 {} -> f64 {}", f32_val, f64_val);
    
    let f64_val2: f64 = 2.71828;
    let f32_val2 = f64_val2 as f32;
    println!("f64 {} -> f32 {}", f64_val2, f32_val2);  // 精度可能丧失
}
```

## 字符和整数的转换

### 整数 -> 字符

使用 `as char` 将有效的 Unicode 标量值转为字符：

```rust runnable
fn main() {
    let codes = vec![65u8, 66, 67, 68];
    
    for code in codes {
        let ch = code as char;
        println!("{} -> '{}'", code, ch);
    }
}
```

### 字符 -> 整数

使用 `as u32` 获得 Unicode 代码点：

```rust runnable
fn main() {
    let chars = vec!['A', 'B', 'C', '中'];
    
    for ch in chars {
        let code = ch as u32;
        println!("'{}' -> {}", ch, code);
    }
}
```

> **注意**：不是所有整数都对应有效的 Unicode 字符。转换时 Rust 不检查有效性（这是 `as` 的限制）。如果需要安全的转换，应使用 `char::from_u32()`。

## 常见陷阱

### 陷阱 1：溢出时的未定义行为

在 release 模式下，整数溢出不会 panic，而是**环绕**：

```rust runnable
fn main() {
    // Debug 模式会 panic，release 模式会环绕
    #[cfg(debug_assertions)]
    println!("Debug 模式：大整数转 u8 可能 panic");
    
    #[cfg(not(debug_assertions))]
    println!("Release 模式：大整数转 u8 会环绕");
    
    let large = 256u16;
    let small = large as u8;
    println!("256 as u8 = {}", small);  // 0（环绕）
}
```

### 陷阱 2：浮点转整数时的精度丧失

```rust runnable
fn main() {
    let f = 123.456f64;
    let i = f as i32;
    println!("123.456 转为整数：{}", i);  // 123（小数丢失）
}
```

### 陷阱 3：转换顺序很重要

```rust runnable
fn main() {
    let a = 1000i32;
    
    // 方式 1：先转 u8，再转 f64
    let result1 = (a as u8) as f64;
    println!("(1000 as u8) as f64 = {}", result1);  // 232.0
    
    // 方式 2：先转 f64，再转 u8
    let result2 = (a as f64) as u8;
    println!("(1000 as f64) as u8 = {}", result2);  // 232
    
    // 两者结果相同，但过程不同
}
```

---

# 练习题

## 类型铸造测验

```quiz single
Q: 下列代码的输出是什么？
```rust
fn main() {
    let x: u8 = 256u16 as u8;
    println!("{}", x);
}
```
- 256
- 编译错误
+ 0
- 255
E: 256 超出 u8 的范围（0-255）。转换时只保留低 8 位：256 = 100000000（9位），低 8 位是 00000000 = 0。结果是 0。
```

```quiz single
Q: 下列代码的输出是什么？
```rust
fn main() {
    let f: f32 = 3.7;
    let i = f as i32;
    println!("{}", i);
}
```
- 4
+ 3
- 3.7
- 编译错误
E: 浮点转整数时舍弃小数部分（向 0 取整）。3.7 转为 3。
```

```quiz single
Q: 下列代码的输出是什么？
```rust
fn main() {
    let x: i8 = 128i32 as i8;
    println!("{}", x);
}
```
- 128
+ -128
- 编译错误
- 0
E: 128 超出 i8 范围（-128 到 127）。128 的二进制是 10000000，按 i8 的二进制补码解释，MSB 为 1 表示负数，结果是 -128。
```

```quiz multi
Q: 下列关于 `as` 类型转换的说法，正确的是？（多选）
+ 使用 `as` 进行显式类型转换是安全的，不会 panic
+ 浮点转整数时会舍弃小数部分
+ 整数转字符时，Rust 不检查 Unicode 有效性
- Rust 提供整数类型间的隐式转换
E: `as` 转换总是定义良好的（不会崩溃），但可能丧失数据精度。Rust 不提供隐式转换，必须显式使用 `as`。某些转换（如转字符）需要手动检查有效性。
```

```quiz single
Q: 如果想安全地将 `u32` 转为 `char`，应该用哪个方法？
- `x as char`
+ `char::from_u32(x)`
- `x.to_char()`
- `char::try_from(x)`
E: `as char` 不检查 Unicode 有效性。应使用 `char::from_u32()` 返回 `Option`，只有有效代码点才返回 `Some(ch)`。
```

## 编程练习

### 练习 1：整数转换

完成下面的代码，使其正确输出各种整数转换的结果：

```rust editable
fn main() {
    // TODO: 将 1000u16 转为 u8，输出结果和预期
    let val1 = 1000u16;
    
    
    // TODO: 将 -42i32 转为 u32，输出结果
    let val2 = -42i32;
    
    
    // TODO: 将 255i32 转为 i8，输出结果
    let val3 = 255i32;
    
    
    println!("1000 as u8 预期 232，实际 {}", val1);
    println!("-42 as u32 预期大数，实际 {}", val2);
    println!("255 as i8 预期 -1，实际 {}", val3);
}
```

```expected
1000 as u8 预期 232，实际 232
-42 as u32 预期大数，实际 4294967254
255 as i8 预期 -1，实际 -1
```

### 练习 2：浮点和字符转换

完成下面的代码，实现浮点数和字符的转换：

```rust editable
fn main() {
    // TODO: 将浮点数 3.99 转为 i32，存储在 int_val
    let float_val = 3.99f32;
    
    
    // TODO: 将整数 65 转为 char，存储在 char_val
    let int_code = 65u8;
    
    
    // TODO: 将字符 'Z' 转为 u32，存储在 code
    let character = 'Z';
    
    
    println!("浮点数 {} 转为整数：{}", float_val, int_val);
    println!("整数 {} 转为字符：'{}'", int_code, char_val);
    println!("字符 '{}' 转为代码：{}", character, code);
}
```

```expected
浮点数 3.99 转为整数：3
整数 65 转为字符：'A'
字符 'Z' 转为代码：90
```
