---
title: "函数中的生命周期"
description: "学会在函数签名中标注生命周期参数，理解它的含义，以及生命周期强制转换等进阶用法"
difficulty: intermediate
estimatedTime: 25
keywords: ["lifetime annotation", "生命周期标注", "函数", "lifetime coercion", "'a: 'b"]
---

# 函数中的标注

## 为什么函数需要手动标注

上一篇我们看到，两个变量之间的生命周期关系，编译器能自己推断。但函数呢？

考虑这个需求：写一个 `longest` 函数，接收两个字符串 slice，返回较长的那个。

```rust runnable expect-error
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let s1 = String::from("abcd");
    let s2 = "xyz";
    println!("{}", longest(s1.as_str(), s2));
}
```

编译器报错：`missing lifetime specifier`，提示返回值是一个借用，但搞不清楚是从 `x` 还是 `y` 借的。

你可能会想："上面的例子里 `s1` 和 `s2` 都在 `main` 里，生命周期一样长，不管返回哪个都没问题啊？"——确实，**这个特定的调用**没问题。但函数签名是一份**合约**，必须对所有可能的调用者都成立。这个函数完全可以被这样调用：

```rust
fn main() {
    let s1 = String::from("abcd");
    let result;
    {
        let s2 = String::from("xyz");
        result = longest(s1.as_str(), s2.as_str());
    }  // s2 在这里销毁
    println!("{}", result); // result 指向 s1 还是已销毁的 s2？
}
```

这里 `s1` 比 `s2` 活得更久。函数体里 `if x.len() > y.len() { x } else { y }` 要到运行时才知道返回哪个。如果返回了 `s2`，`result` 就变成悬垂引用了。

编译器检查函数和检查调用方是**完全隔离**的两件事：分析函数体时不看调用方，分析调用方时不看函数体。它在函数签名处看到"接受两个不知道谁更长的引用，返回其中一个"，却不知道该对返回值承诺多长的生命周期——所以报错，要求你手动说清楚。

## 生命周期标注语法

生命周期参数用撇号开头，通常命名为 `'a`、`'b`……写在 `&` 之后：

```rust
&i32        // 普通引用（没有显式生命周期）
&'a i32     // 带生命周期 'a 的引用
&'a mut i32 // 带生命周期 'a 的可变引用
```

和泛型类型参数一样，生命周期参数需要先在函数名后的尖括号里声明：

```rust runnable
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let s1 = String::from("long string is long");
    let s2 = String::from("xyz");
    let result = longest(s1.as_str(), s2.as_str());
    println!("最长的字符串是：{}", result);
}
```

现在能编译了。`<'a>` 声明了一个泛型生命周期参数，签名说明：两个输入引用和返回值都与生命周期 `'a` 相关联。

## 深入理解：标注的含义

`<'a>` 到底说了什么？它说的是：

> 对于某个生命周期 `'a`，函数接受两个至少活 `'a` 这么久的字符串 slice，并返回一个也至少活 `'a` 这么久的字符串 slice。

__'a 的实际值是 x 和 y 两个参数生命周期的「较短那个」。返回值的生命周期也会是这个较短值。有了这个信息，编译器就可以知道这个函数的返回值在调用方的作用域内是否是安全的。__

来看具体例子：

```rust runnable
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

fn main() {
    let s1 = String::from("long string is long");
    {
        let s2 = String::from("xyz");
        // s1 和 s2 在这个 {} 内都有效
        // 'a 取两者中较短的，即 s2 的生命周期
        let result = longest(s1.as_str(), s2.as_str());
        println!("最长的：{}", result); // 合法，result 在 {} 内用
    }
}
```

如果把 `result` 放到内部作用域外面用，就会出问题：

```rust runnable expect-error
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

fn main() {
    let s1 = String::from("long string is long");
    let result;
    {
        let s2 = String::from("xyz");
        result = longest(s1.as_str(), s2.as_str());
    }                    // s2 在这里销毁
    println!("{}", result); // 错误！result 可能引用已销毁的 s2
}
```

> 生命周期标注**不改变**任何引用的实际存活时间，它只是给编译器提供信息，让编译器能在违规时报错。

## 返回值生命周期必须来自参数

如果函数返回引用，这个引用要么指向某个参数，要么是 `'static`——不可能是函数内部创建的局部变量：

```rust runnable expect-error
fn make_string<'a>() -> &'a str {
    let s = String::from("hello");
    s.as_str() // 错误：s 在函数结束时被销毁，返回的引用会悬垂
}
```

这种情况应该返回有所有权的 `String`，而不是引用：

```rust runnable
fn make_string() -> String {
    String::from("hello")
}

fn main() {
    let s = make_string();
    println!("{}", s);
}
```

## 不相关的参数不需要标注

生命周期只需要标注**有关联**的参数和返回值。如果某个参数和返回值没有关系，不需要给它标注：

```rust runnable
// y 和返回值没有关系，不需要同一个生命周期
fn always_first<'a>(x: &'a str, _y: &str) -> &'a str {
    x
}

fn main() {
    let s1 = String::from("hello");
    let result;
    {
        let s2 = String::from("world");
        result = always_first(s1.as_str(), s2.as_str());
    }
    println!("{}", result); // 合法，result 和 s1 同生命周期
}
```

# 生命周期强制转换 `'a: 'b`

前面的例子里，两个参数都标注了同一个 `'a`，编译器会取两者中较短的那个作为 `'a` 的实际值。但有时候你需要**明确表达"这两个生命周期有长短关系"**，而不是把它们合并成同一个。

考虑这种情形：函数接受两个引用，生命周期分别是 `'a` 和 `'b`，你想把 `'a` 的引用当成 `'b` 的引用来返回。这当然得有个前提——`'a` 至少和 `'b` 一样长，否则返回的引用可能比 `'b` 先失效。

打个比方：你租了一套房子，租约到 12 月底（`'a`）。朋友问你能不能借住到 6 月（`'b`）。没问题——你的租约比 6 月更长，可以"缩短承诺"给朋友。但如果租约只到 4 月，你就没法承诺到 6 月了。

`'a: 'b` 就是用来声明这个前提的。它读作"生命周期 `'a` 至少和 `'b` 一样长"（`'a` outlives `'b`），让编译器接受"把 `&'a T` 当 `&'b T` 用"这件事：

```rust runnable
// 'a: 'b 表示 'a 至少和 'b 一样长
// 所以可以安全地把 &'a i32 当成 &'b i32 返回
fn choose_first<'a: 'b, 'b>(first: &'a i32, _second: &'b i32) -> &'b i32 {
    first
}

fn main() {
    let first = 10;
    let result;
    {
        let second = 20;
        // first 活得更长，可以被"缩短"到 second 的生命周期
        result = choose_first(&first, &second);
        println!("选择了: {}", result);
    }
}
```

为什么要这样写？签名说"返回值的生命周期是 `'b`"，但实际上我们返回的是 `first`（`'a`）。编译器需要知道 `'a` 至少和 `'b` 一样长，才能接受把 `'a` 引用当 `'b` 引用用。`'a: 'b` 就是这个保证。

> 日常代码里很少需要手写 `'a: 'b`——大多数情况编译器能自动推断。理解它的含义主要是为了读懂复杂的错误信息。

# 练习题

## 函数生命周期测验

```quiz single
Q: 函数签名 `fn foo<'a>(x: &'a str, y: &'a str) -> &'a str` 的含义是？
- x 和 y 必须拥有完全相同的生命周期
+ 返回值的生命周期不会超过 x 和 y 中较短的那个
- 函数会把 x 和 y 的生命周期延长到 'a
- 'a 是一个固定的全局生命周期
E: 生命周期参数 'a 表示一个具体的生命周期，在调用时会被实例化为 x 和 y 生命周期的交集（较短的那个）。返回值的有效期不会超过这个值。标注不会改变任何引用实际的存活时间。
```

```rust
fn dangle<'a>() -> &'a str {
    let s = String::from("hello");
    &s
}
```

```quiz single
Q: 上面代码无法编译，原因是？
- 缺少 main 函数
- 字符串类型不支持引用
+ 返回的引用指向函数内部的局部变量 s，s 在函数结束时被销毁
- 生命周期参数 'a 声明有误
E: s 是函数内部创建的 String，函数结束后 s 被 drop。返回指向 s 的引用会造成悬垂引用。编译器报错 "`s` does not live long enough"。正确做法是返回 String 而不是 &str。
```

```quiz multi
Q: 关于生命周期标注，下列说法哪些正确？
+ 生命周期标注不改变引用实际存活的时间
+ 如果函数某个参数和返回值没有关联，可以不给该参数标注生命周期
- 每个引用参数都必须显式写出生命周期
+ 返回引用的生命周期必须来自输入参数（或 'static），不能来自函数内部创建的值
E: 生命周期标注只是让编译器理解意图，不改变实际行为。与返回值无关的参数可以不标注。Rust 有省略规则，很多情况不需要显式标注。返回值引用必须指向某个输入，否则会造成悬垂引用。
```

```quiz single
Q: `'a: 'b` 这个写法的含义是？
- 'a 和 'b 是同一个生命周期
- 'b 必须比 'a 活得更久
+ 'a 至少和 'b 一样长（'a 比 'b 活得更久或一样久）
- 这是一个错误的语法
E: 'a: 'b 读作"'a outlives 'b"，表示生命周期 'a 的范围覆盖 'b 的范围。有了这个约束，可以把 &'a T 当作 &'b T 使用，因为编译器知道 'a 在 'b 结束之前不会结束。
```

## 编程练习

下面两个函数都无法编译，原因是缺少生命周期标注。请分析每个函数的返回值来自哪个参数，然后添加正确的标注使其通过编译。

注意：两个函数所需的标注方式不同——思考为什么。

```rust editable
// 函数 1：返回两个字符串中较短的那个
// 提示：返回值可能来自 a，也可能来自 b
fn shorter(a: &str, b: &str) -> &str {
    if a.len() <= b.len() { a } else { b }
}

// 函数 2：如果 text 以 prefix 开头，去掉前缀后返回剩余部分；否则原样返回
// 提示：返回值只可能来自 text，不会来自 prefix
fn strip_prefix(text: &str, prefix: &str) -> &str {
    if text.starts_with(prefix) {
        &text[prefix.len()..]
    } else {
        text
    }
}

fn main() {
    let s1 = String::from("hello");
    let result1;
    {
        let s2 = String::from("hi");
        result1 = shorter(&s1, &s2);
        println!("较短的：{}", result1);
    }

    let text = String::from("hello, world");
    let result2;
    {
        let prefix = String::from("hello, ");
        result2 = strip_prefix(&text, &prefix);
        // prefix 在这里销毁，但 result2 来自 text，text 还活着
    }
    println!("去掉前缀：{}", result2);
}
```

```expected
较短的：hi
去掉前缀：world
```
