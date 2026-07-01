---
title: "闭包语法与捕获"
description: "掌握闭包的基本语法、类型推断，以及三种捕获环境变量的方式和 move 关键字"
difficulty: intermediate
estimatedTime: 25
keywords: ["closure", "闭包", "捕获", "move", "FnOnce", "捕获环境"]
---

# 闭包语法

## 什么是闭包

闭包是一种可以**像变量一样存储**、**像函数一样调用**的代码块。和普通函数最大的区别是：闭包可以捕获它定义时所在作用域中的变量。

先看一个最简单的对比：

```rust runnable
fn add_one_fn(x: i32) -> i32 {
    x + 1
}

fn main() {
    // 普通函数：定义好之后通过名字调用
    println!("{}", add_one_fn(5));

    // 闭包：存储在变量里，像调用函数一样使用
    let add_one = |x| x + 1;
    println!("{}", add_one(5));
}
```

## 语法结构

闭包用一对竖线 `|` 包围参数，后跟函数体：

```rust runnable
fn main() {
    // 通常不需要类型标注，编译器能推断
    let add = |x, y| x + y;

    // 无参数
    let greet = || println!("你好！");

    // 多行需要大括号
    let process = |x: i32| {
        let doubled = x * 2;
        doubled + 1
    };

    println!("{}", add(3, 4));
    greet();
    println!("{}", process(5));
}
```

把各种写法并排对比，看它们有多相似：

```rust
fn  add_v1   (x: i32, y: i32) -> i32 { x + y }  // 普通函数
let add_v2 = |x: i32, y: i32| -> i32 { x + y };  // 完整闭包标注
let add_v3 = |x, y|                  { x + y };  // 省略类型
let add_v4 = |x, y|                    x + y  ;  // 省略大括号
```

## 类型一旦推断就固定

闭包的参数类型通过第一次调用来推断，之后就固定了——不能再用不同类型调用：

```rust runnable expect-error
fn main() {
    let identity = |x| x;

    // 第一次调用：编译器推断 x 为 String
    let _s = identity(String::from("hello"));

    // 类型已锁定为 String，传 i32 报错
    let _n = identity(5);
}
```

## 闭包能做函数做不到的事

普通函数不能访问外部作用域的变量，闭包可以：

```rust runnable expect-error
fn main() {
    let threshold = 10;

    // 普通函数：无法访问外部的 threshold
    fn is_big(x: i32) -> bool {
        x > threshold  // 错误！
    }
}
```

```rust runnable
fn main() {
    let threshold = 10;

    // 闭包：能直接使用同一作用域里的变量
    let is_big = |x| x > threshold;

    println!("{}", is_big(5));   // false
    println!("{}", is_big(15));  // true
}
```

这就是闭包最核心的能力——**捕获环境**。

## 主要应用场景

闭包最常见的用途——把"某个操作"作为参数传进去，让函数决定何时调用：

```rust runnable
// apply 接受一个值和一个"如何处理它"的闭包
# fn apply(x: i32, f: impl Fn(i32) -> i32) -> i32 {
#     f(x)
# }

fn main() {
    println!("{}", apply(5, |x| x * 2));       // 10，乘以 2
    println!("{}", apply(5, |x| x + 100));     // 105，加 100
    println!("{}", apply(5, |x| x * x));       // 25，平方
}
```

> 闭包还有一个高频使用场景——配合迭代器的 `.map()`、`.filter()` 等方法，这部分在本章后面的迭代器文章中详细介绍。

# 捕获方式

## 三种捕获方式

闭包捕获变量有三种方式，**Rust 会自动选择限制最少的那种**：

| 捕获方式 | 发生条件 |
|---------|---------|
| 不可变引用 `&T` | 只读取变量 |
| 可变引用 `&mut T` | 修改变量 |
| 获取所有权 `T` | 消费或 drop 变量 |

**只读取 → 不可变引用：**

```rust runnable
fn main() {
    let message = String::from("你好");

    let print = || println!("{}", message);

    print();
    print();
    // message 仍然有效
    println!("原来的值还在：{}", message);
}
```

**修改变量 → 可变引用：**

```rust runnable
fn main() {
    let mut count = 0;

    // 闭包自身也要声明 mut，因为它内部有可变状态
    let mut increment = || {
        count += 1;
        println!("count = {}", count);
    };

    increment();
    increment();
    // 可变借用结束后，count 可以再次访问
    println!("最终 count = {}", count);
}
```

> 可变引用捕获期间，不能对同一变量进行其他借用。

**消费变量 → 获取所有权：**

```rust runnable
fn main() {
    let name = String::from("Alice");

    // drop 需要所有权，闭包必须移动 name
    let consume = || {
        println!("再见，{}", name);
        drop(name);
    };

    consume();
    // consume(); // 错误：name 已被消费，这个闭包只能调用一次
}
```

## move 关键字：强制转移所有权

`move` 让闭包**强制获取所有变量的所有权**，即使闭包体里只是读取：

```rust runnable
fn main() {
    let data = vec![1, 2, 3];

    // move 强制闭包拥有 data
    let contains = move |x| data.contains(x);

    println!("{}", contains(&1)); // true
    println!("{}", contains(&5)); // false

    // data 已被移入闭包，外部不能再用
    // println!("{:?}", data); // 错误！
}
```

不加 `move`——闭包借用 `data`，外部仍可使用：

```rust runnable
fn main() {
    let data = vec![1, 2, 3];

    let contains = |x| data.contains(x);

    println!("{}", contains(&2));
    println!("data 还在：{:?}", data); // 完全合法
}
```

> **什么时候用 `move`？** 最典型的场景是把闭包传给新线程：`thread::spawn(move || { ... })`。新线程的生命周期可能比当前函数更长，数据必须从当前线程"移入"新线程，否则会有悬垂引用风险。

# 练习题

## 语法与捕获测验

```quiz single
Q: 下面哪种写法是合法的闭包定义？
- closure |x| { x + 1 }
- let f = fn(x) { x + 1 };
+ let f = |x| x + 1;
- fn |x| x + 1
E: 闭包用 |参数| 体 的形式定义，存储在变量里。不需要 fn 关键字，也没有 closure 关键字。
```

```rust
fn main() {
    let greet = |msg: &str| println!("你好，{}", msg);
    greet("Rust");
    greet(42);
}
```

```quiz single
Q: 上面的代码能编译吗？
+ 不能，第一次调用推断参数类型为 &str，第二次传 i32 类型不匹配
- 能，输出"你好，Rust"和"你好，42"
- 不能，闭包不能接受 &str 类型
- 能，因为闭包参数类型可以随时改变
E: 闭包在第一次调用时确定参数类型（&str），之后类型被锁定，传入 i32 会类型不匹配，编译报错。
```

```quiz multi
Q: 关于闭包捕获方式，下列说法哪些正确？
+ 需要修改外部变量时，闭包升级为可变引用捕获
+ move 关键字会强制闭包通过值（所有权转移）捕获所有变量
+ 只读取外部变量时，闭包优先使用不可变引用捕获
- 闭包总是通过复制方式捕获变量
E: Rust 自动选择限制最少的捕获方式：只读 → &T，修改 → &mut T，消费/move → T。不会自动复制，除非类型实现了 Copy。
```

```quiz single
Q: 什么情况下通常需要使用 move 关键字？
- 当闭包需要修改变量时
+ 当闭包的生命周期需要超过被捕获变量时（例如传给新线程）
- 当闭包有多个参数时
- 当闭包没有参数时
E: move 的典型用途是将闭包传给新线程，需要保证被捕获的数据在新线程整个生命周期内有效。不加 move 时闭包借用变量，若原变量先销毁会导致悬垂引用，编译器不允许。
```

## 编程练习

`base_price` 和 `discount` 已经给定，请创建一个闭包 `final_price`，捕获这两个变量，接受数量 `qty`，返回 `(base_price - discount) * qty`：

```rust editable
fn main() {
    let base_price = 100;
    let discount = 20;

    // TODO: 创建闭包 final_price，接受数量 qty，返回折后总价
    let final_price = ???;

    println!("{}", final_price(3)); // (100 - 20) * 3 = 240
    println!("{}", final_price(5)); // (100 - 20) * 5 = 400
}
```

```expected
240
400
```
