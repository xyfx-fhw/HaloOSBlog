---
title: "控制流"
description: "学习 Rust 的 if 表达式与 loop、while、for 三种循环，掌握条件分支和迭代的核心写法。"
difficulty: beginner
estimatedTime: 35
keywords: ["if", "else", "loop", "while", "for", "控制流", "循环", "条件分支"]
---

# 分支表达式

根据条件走不同的路，或者反复执行同一段代码——这就是**控制流**的本质。本文介绍 Rust 的 `if` 表达式和三种循环。

`if` 表达式让程序根据条件选择执行不同的代码块。

## 基本语法

关键字 `if`，后跟条件，再接花括号包裹的代码块。条件为真时执行该块，为假时执行可选的 `else` 块：

```rust runnable
fn main() {
    let number = 3;

    if number < 5 {
        println!("条件为真");
    } else {
        println!("条件为假");
    }
}
```

`else` 分支是**可选的**。如果条件为假且没有 `else`，程序直接跳过 `if` 块，继续往下执行。

## 条件必须是 bool

Rust **不会**自动将其他类型转换为布尔值。如果把整数直接作为条件，编译器会报错：

```rust runnable expect-error
fn main() {
    let number = 3;
    if number {  // 错误：期望 bool，得到整数
        println!("number 不等于零");
    }
}
```

这和 JavaScript 或 Ruby 不同——那些语言里 `0`、空字符串等会被隐式当作 `false`。Rust 要求你**显式写出条件**：

```rust runnable
fn main() {
    let number = 3;
    if number != 0 { //页面上有时候会显式不等号为≠，这里是显式的问题，代码里仍写成 ! + =
        println!("number 不等于零");
    }
}
```

这个设计让代码意图更清晰，也杜绝了一类依赖隐式转换的隐性 bug。

## else if 多重条件

需要检查多个条件时，可以用 `else if` 链：

```rust runnable
fn main() {
    let number = 6;

    if number % 4 == 0 {
        println!("number 能被 4 整除");
    } else if number % 3 == 0 {
        println!("number 能被 3 整除");
    } else if number % 2 == 0 {
        println!("number 能被 2 整除");
    } else {
        println!("number 不能被 4、3 或 2 整除");
    }
}
```

注意：Rust 只会执行**第一个条件为真**的分支，然后直接跳过其余所有分支。6 同时能被 3 和 2 整除，但程序只会打印"能被 3 整除"——找到第一个匹配就停了。

> 如果 `else if` 链过长，代码会变得难以维护。Rust 有一个更强大的分支结构 `match`，后续会详细介绍，它正是为处理多条件分支而生的。

## if 是表达式

这是 Rust 和许多语言的一个关键区别：`if` 在 Rust 中是**表达式**，不仅仅是语句——它可以返回一个值，可以用在赋值的右边。代码块的返回值是块中**最后一个表达式的值**；如果块中只有语句没有表达式，就隐式返回 `()`（之前讲过的单元类型）：

```rust runnable
fn main() {
    let condition = true;
    let number = if condition { 5 } else { 6 };

    println!("number 的值是：{}", number);

    // 如果分支中只有语句，就返回 ()
    let result = if condition {
        println!("条件为真"); // 这是语句，没有返回值
    } else {
        ()
    };
    println!("result 的类型是 (): {:?}", result);
}
```

`number` 会根据条件被绑定到 `5` 或 `6`。第二个例子中，`if` 分支中的 `println!` 是语句，没有返回值，所以 `result` 得到的是 `()`。

**两个分支的类型必须相同**。Rust 在编译时就需要确定变量的类型，如果两个分支返回不同类型，编译器无法决定 `number` 是什么类型：

```rust runnable expect-error
fn main() {
    let condition = true;
    let number = if condition { 5 } else { "six" }; // 错误：整数与字符串类型不兼容
    println!("number 的值是：{}", number);
}
```

这种编译期类型检查是 Rust 安全保证的基础——运行时不会出现"这个变量到底是什么类型"的意外。

# 循环表达式

Rust 有三种循环：`loop`、`while`、`for`，各有适用场景。

## loop 无限循环

`loop` 是最基础的循环——它会**无限重复**执行代码块，直到你用 `break` 显式停止。

> 与 C 的 `while(1)` 不同，**Rust 编译器会进行控制流分析**。如果编译器发现某个分支永远无法到达 `break`，它会标记该代码为不可达（unreachable code）。这样能帮你提前发现意外的无限循环。但如果代码真的被设计为无限循环（比如 `loop { /* 故意死循环 */ }`），编译器也不会报错（没有不可到达的代码时，比如 main  函数里的顶层 loop，后面没有任何代码了），尊重你的设计意图。

```rust runnable
fn main() {
    let mut count = 0;

    loop {
        count += 1;
        println!("第 {} 次循环", count);

        if count == 3 {
            break; // 满足条件，退出循环
        }
    }

    println!("循环结束");
}
```

`continue` 关键字会跳过当前迭代剩余的代码，直接进入下一次迭代：

```rust runnable
fn main() {
    let mut i = 0;

    loop {
        i += 1;
        if i > 6 { break; }

        if i % 2 == 0 {
            continue; // 跳过偶数，不执行下面的 println
        }
        println!("{}", i); // 只打印奇数
    }
}
```

## 循环标签

嵌套循环中，`break` 和 `continue` 默认作用于**最内层**的循环。如果需要跳出外层循环，可以给循环贴上**标签**：

```rust runnable
fn main() {
    let mut count = 0;

    'counting_up: loop {
        println!("count = {}", count);
        let mut remaining = 10;

        loop {
            println!("remaining = {}", remaining);
            if remaining == 9 {
                break; // 只退出内层循环
            }
            if count == 2 {
                break 'counting_up; // 退出外层循环
            }
            remaining -= 1;
        }

        count += 1;
    }

    println!("最终 count = {}", count);
}
```

标签以单引号开头，如 `'counting_up`。`break 'counting_up` 会跳出被标记的那层循环，无论当前嵌套多深。

## while 条件循环

`while` 是"当条件为真时持续循环"的简洁写法。**`while` 先检查条件再执行循环体**——如果条件一开始就为假，循环体会一次都不执行。

Rust 没有 `do-while` 这样的"先执行后检查"的循环结构。如果你需要至少执行一次的循环，可以用 `loop` + `if` + `break` 的模式代替：

```rust runnable
fn main() {
    let mut number = 3;

    while number != 0 {
        println!("{}!", number);
        number -= 1;
    }

    println!("发射！");
}
```

这等价于 `loop` + `if` + `break` 的组合写法，但更简洁清晰。**当循环只有一个退出条件时，优先用 `while`。**

## for 遍历集合

`for` 循环用于遍历一个集合中的每个元素，是 Rust 中**最常用的循环**：

```rust runnable
fn main() {
    let a = [10, 20, 30, 40, 50];

    for element in a {
        println!("值是：{}", element);
    }
}
```

对比用 `while` 手动管理索引，`for` 有明显优势：

- **不会越界**：Rust 自动处理边界，不存在意外访问越界索引的风险
- **更简洁**：不需要声明、更新索引变量
- **更安全**：如果数组长度变了，不需要同步修改循环条件

### Range（范围）

在 Rust 中，`..` 和 `..=` 是**Range 操作符**，用来表示一个数值序列。它们经常配合 `for` 使用：

| 操作符 | 示例 | 具体数字 | 说明 |
|--------|------|---------|------|
| `..` | `1..5` | 1, 2, 3, 4 | 不含右端点（半开区间） |
| `..=` | `1..=5` | 1, 2, 3, 4, 5 | 含两个端点（闭区间） |
| `..` | `..5` | 0, 1, 2, 3, 4 | 从 0 开始，不含右端 |
| `..=` | `..=5` | 0, 1, 2, 3, 4, 5 | 从 0 开始，含右端 |

```rust runnable
fn main() {
    // 不含右端：1、2、3、4
    for i in 1..5 {
        println!("1..5: {}", i);
    }

    // 含两端：1、2、3、4、5
    for i in 1..=5 {
        println!("1..=5: {}", i);
    }

    // 从 0 开始：0、1、2、3、4
    for i in ..5 {
        println!("..5: {}", i);
    }
}
```

使用 `Range` 配合 `.rev()` 来倒计时，这是 Rust 中的惯用写法：

```rust runnable
fn main() {
    for number in (1..4).rev() {
        println!("{}!", number);
    }
    println!("发射！");
}
```

`(1..4).rev()` 先创建 Range `1..4`（即 1、2、3），再用 `.rev()` 反转为 3、2、1。

> 即使只是重复固定次数，Rustacean 也倾向于用 `for` + Range，而不是 `while`。`for` 更能表达"遍历一个序列"的意图，代码读起来也更直观。

## 循环作为表达式

在 Rust 中，**`loop`、`while`、`for` 都是表达式**（就像 `if` 一样），可以返回值。通常 `while` 和 `for` 返回 `()`，但 `loop` 可以通过 `break` 返回具体的值。

| 循环 | 返回值 | 用法 |
|-----|--------|------|
| `loop` | 任意类型（由 `break` 决定） | 可用 `break value` 提取结果 |
| `while` | 通常是 `()` | 循环完成后返回 `()` |
| `for` | 通常是 `()` | 遍历完成后返回 `()` |

**代码对比**：

```rust runnable
fn main() {
    // loop 作为表达式，返回值
    let result1 = loop {
        break 42;
    };
    println!("loop 返回: {}", result1); // 42

    // while 作为表达式，返回 ()
    let result2 = while true { break; };
    println!("while 返回: {:?}", result2); // ()

    // for 作为表达式，返回 ()
    let result3 = for i in 1..=3 { println!("{}", i); };
    println!("for 返回: {:?}", result3); // ()
}
```

这种设计让 Rust 在表达式的层面保持了一致性——几乎所有控制流结构都遵循"表达式返回值"的原则。

# 练习题

## if 表达式测验

```rust
fn main() {
    let x = 10;
    let result = if x > 5 { x * 2 } else { x + 1 };
    println!("{}", result);
}
```

```quiz single
Q: 上面的代码输出什么？
+ 20
- 11
- 编译错误
- 5
E: x = 10，条件 x > 5 为真，执行 if 分支 x * 2 = 20。
```

```quiz single
Q: 以下哪段代码能通过 Rust 编译？
+ if 1 != 0 { println!("yes"); }
- if "true" { println!("yes"); }
- if 0 { println!("no"); }
- if 1 { println!("yes"); }
E: Rust 的 if 条件必须是 bool 类型。只有 `1 != 0` 是一个合法的布尔表达式，其余三项都把非 bool 值直接作为条件，会编译报错。
```

```rust
fn main() {
    let val = if true { 42 } else { "hello" };
    println!("{}", val);
}
```

```quiz single
Q: 上面的代码会发生什么？
- 正常运行，val 的值是 "hello"
- 正常运行，val 的值是 42
- 运行时 panic
+ 编译错误，两个分支类型不匹配
E: Rust 在编译时检查 if 表达式两个分支的类型。42 是整数，"hello" 是字符串，类型不兼容，编译失败。Rust 需要在编译期确定变量类型，两个分支类型不一致就无法做到。
```

## 循环测验

```rust
fn main() {
    let result = loop {
        break 42;
    };
    println!("{}", result);
}
```

```quiz single
Q: 上面的代码输出什么？
+ 42
- 0
- 编译错误
- 无输出（无限循环）
E: loop 可以返回值，break 后跟的表达式就是整个 loop 表达式的值。这里直接 break 42，所以 result = 42。
```

```rust
fn main() {
    let mut i = 0;
    'outer: loop {
        loop {
            if i == 2 {
                break 'outer;
            }
            i += 1;
        }
    }
    println!("{}", i);
}
```

```quiz single
Q: 上面的代码输出什么？
- 0
- 1
- 无限循环，不会打印
+ 2
E: 内层 loop 每次迭代给 i 加 1。当 i 等于 2 时，break 'outer 直接退出外层循环，跳到 println!，打印 2。
```

```quiz multi
Q: 下列关于 Rust 三种循环的说法，哪些是正确的？
+ for 循环遍历集合时不会发生越界访问
- while 循环不能使用 break 提前退出
+ 嵌套循环中可以用循环标签指定 break 作用于哪一层
+ loop 可以通过 break 表达式返回值
- for 循环只能遍历数组，不能遍历 Range
E: for 遍历集合时 Rust 自动处理边界；loop 支持 break value 返回值；while 同样支持 break；循环标签可控制 break/continue 的作用层级。for 循环可以遍历任何实现了迭代器的类型，包括 Range。
```

## 编程练习

### 练习一：FizzBuzz

经典的 FizzBuzz 问题：用 `for` 循环打印 1 到 20。能被 3 整除打印 `Fizz`，能被 5 整除打印 `Buzz`，既能被 3 也能被 5 整除打印 `FizzBuzz`，其余打印数字本身。

```rust editable
fn main() {
    for i in 1..=20 {
        // TODO：根据条件打印 Fizz、Buzz、FizzBuzz 或数字
        println!("{}", i);
    }
}
```

```expected
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
16
17
Fizz
19
Buzz
```

### 练习二：改写为 for 循环

下面用 `while` + 手动索引遍历数组，容易因索引出错导致 panic。请改写为等价的 `for` 循环，使代码更简洁、安全。

```rust editable
fn main() {
    let numbers = [1, 2, 3, 4, 5];
    let mut index = 0;

    while index < 5 {
        println!("值：{}", numbers[index]);
        index += 1;
    }
}
```

```expected
值：1
值：2
值：3
值：4
值：5
```
