---
title: "引用与借用"
description: "学习 Rust 引用语法，理解不可变引用与可变引用的区别，以及借用检查器的两条核心规则。"
difficulty: intermediate
estimatedTime: 40
keywords: ["引用", "借用", "&T", "&mut T", "可变引用", "悬垂引用", "借用检查器", "NLL"]
---

# 引用与借用

上一篇我们看到，把 `String` 传给函数后所有权就转移进去了，调用方再也无法使用它。如果只是想让函数"看一眼"数据，不想让它"带走"呢？答案就是**引用**（reference）。

## 为什么需要引用

还记得这个令人烦恼的模式吗？

```rust runnable
fn main() {
    let s1 = String::from("hello");
    let (s2, len) = calculate_length(s1); // s1 被移入函数
    println!("'{}' 的长度是 {}", s2, len);
}

fn calculate_length(s: String) -> (String, usize) {
    let length = s.len();
    (s, length) // 必须把 s 一起返回，否则调用者再也拿不到它
}
```

为了在函数返回后还能使用 `s1`，不得不把它连同结果一起装进元组返回。很啰嗦。

**引用**解决了这个问题——让函数临时使用数据，而不转移所有权：

```rust runnable
fn main() {
    let s1 = String::from("hello");
    let len = calculate_length(&s1); // 传引用，s1 所有权不变
    println!("'{}' 的长度是 {}", s1, len); // s1 仍然有效
}

fn calculate_length(s: &String) -> usize { // 接收引用
    s.len()
} // s 离开作用域，但它只是借用，不负责释放，什么都不发生
```

`&s1` 创建了一个指向 `s1` 的引用，但不拥有 `s1`。引用离开作用域时不会 drop 它指向的数据，因为引用不拥有这些数据。

**创建引用的行为叫做借用（borrowing）**。就像借别人的东西，用完要还，而且你不是主人。

## 不可变引用

引用默认是**不可变的**——通过引用只能读取数据，不能修改：

```rust runnable expect-error
fn main() {
    let s = String::from("hello");
    change(&s);
}

fn change(s: &String) {
    s.push_str(", world"); // 错误：通过不可变引用不能修改数据
}
```

这和变量的默认行为一致：`let` 绑定默认不可变，`&T` 也默认不可变。

不可变引用可以同时有很多个，因为只读操作之间互不干扰：

```rust runnable
fn main() {
    let s = String::from("hello");

    let r1 = &s;
    let r2 = &s; // 完全没问题，可以有任意多个不可变引用
    println!("{} 和 {}", r1, r2);
    println!("原始值仍然有效：{}", s);
}
```

## 借用的两条规则

先记住这两条规则，后面所有例子都从这里推导：

> **规则一**：在任意给定时间，**要么**只能有任意数量的不可变引用，**要么**只能有一个可变引用。两者不能同时存在。
>
> **规则二**：引用必须总是有效的，不能指向已释放的数据。

规则一防止数据竞争；规则二防止悬垂引用。下一个 Tab 会逐一展开这两条规则。

# 可变引用

如果需要通过引用修改数据，使用**可变引用** `&mut T`。

## 可变引用的语法

使用可变引用需要三处配合：

1. 原变量必须声明为 `let mut`
2. 传入时写 `&mut 变量名`
3. 函数参数类型写 `&mut Type`

```rust runnable
fn main() {
    let mut s = String::from("hello"); // 1. 原变量必须是 mut

    change(&mut s); // 2. 传入时用 &mut
    println!("{}", s);
}

fn change(s: &mut String) { // 3. 参数类型是 &mut String
    s.push_str(", world");
}
```

三处缺一不可。如果原变量不是 `mut`，编译器会直接报错：

```rust runnable expect-error
fn main() {
    let s = String::from("hello"); // 没有 mut
    change(&mut s); // 错误：不能从不可变变量创建可变引用
}

fn change(s: &mut String) {
    s.push_str(", world");
}
```

## 同一时间只能有一个可变引用

可变引用有一个重要限制：**对同一数据，同一时间只能有一个活跃的可变引用**：

```rust runnable expect-error
fn main() {
    let mut s = String::from("hello");

    let r1 = &mut s;
    let r2 = &mut s; // 错误！s 已经被可变借用了

    println!("{}, {}", r1, r2);
}
```

**为什么有这个限制？** ——防止**数据竞争**（data race）。数据竞争发生在：两个或更多指针同时访问同一数据，且至少有一个在写入，且没有同步机制。数据竞争导致未定义行为，极难调试。Rust 直接在编译期拒绝有数据竞争风险的代码。

想在不同地方使用可变引用？用独立的作用域错开它们（关键是不能**同时**活跃）：

```rust runnable
fn main() {
    let mut s = String::from("hello");

    {
        let r1 = &mut s;
        r1.push_str(" world");
        println!("在内部作用域中：{}", r1);
    } // r1 在这里结束，s 的借用被归还

    let r2 = &mut s; // 现在可以重新创建可变引用
    r2.push_str("!");
    println!("最终结果：{}", r2);
}
```

## 不可变引用与可变引用不能共存

当已经有不可变引用时，不能创建可变引用：

```rust runnable expect-error
fn main() {
    let mut s = String::from("hello");

    let r1 = &s; // 不可变引用
    let r2 = &s; // 不可变引用，没问题
    let r3 = &mut s; // 错误！r1 和 r2 还活着，不能创建可变引用

    println!("{}, {}, {}", r1, r2, r3);
}
```

想象你正在读一份文件（不可变引用），同时另一个人正在修改同一份文件（可变引用）——你读到的内容就可能前后矛盾。Rust 不允许这种情况。

多个不可变引用可以共存，因为大家都只读，互不影响。

## 引用的有效范围（NLL）

Rust 编译器能智能判断引用最后一次使用的位置。引用的有效范围到**最后一次使用处**为止，而不是到块的右花括号。这叫做**非词法作用域生命周期**（Non-Lexical Lifetimes，NLL）。

正因如此，下面的代码是合法的：

```rust runnable
fn main() {
    let mut s = String::from("hello");

    let r1 = &s;
    let r2 = &s;
    println!("{} 和 {}", r1, r2);
    // r1、r2 在这里已经是最后一次使用，借用到此结束

    let r3 = &mut s; // 合法！r1 和 r2 的借用已经结束
    r3.push_str(", world");
    println!("{}", r3);
}
```

如果没有 NLL，r1 和 r2 的借用会持续到块结束，那么 r3 就无法创建了。NLL 让借用检查更精确，减少了误报。

## 悬垂引用

在有指针的语言中，很容易写出**悬垂指针**——指针指向的内存已被释放，但指针还在。Rust 在编译期就防止这种情况：

```rust runnable expect-error
fn main() {
    let r = dangle();
}

fn dangle() -> &String { // 试图返回字符串的引用
    let s = String::from("hello");
    &s // 返回 s 的引用
} // s 在这里离开作用域被释放，但引用指向的内存已不存在！
```

编译器报错，提示返回值借用了一个在函数结束时就会被释放的值。解决方案很简单：直接返回 `String` 本身，把所有权转移出去：

```rust runnable
fn main() {
    let s = no_dangle();
    println!("{}", s);
}

fn no_dangle() -> String {
    let s = String::from("hello");
    s // 返回 s，所有权转移给调用者，内存不会被释放
}
```

> 如果你在悬垂引用的错误信息里看到了"lifetime"（生命周期）字样，不要慌——那是 Rust 在帮你定位引用有效范围的问题，后续会详细介绍生命周期。

# 练习题

## 引用基础测验

```quiz single
Q: 关于 Rust 中"借用"，下列说法正确的是？
- 借用会将值的所有权临时转让给另一个变量
+ 借用是指创建引用（&T），使用数据而不获取其所有权
- 借用是指复制数据，让两个变量各持有一份
- 借用只适用于堆分配的类型，栈类型不需要借用
E: 借用（borrowing）就是创建引用来访问数据。引用不拥有数据，当引用离开作用域时不会释放被引用的数据。数据的所有者仍然是原变量。
```

```rust
fn main() {
    let s = String::from("hello");
    let r = &s;
    println!("{}", r);
    println!("{}", s);
}
```

```quiz single
Q: 上面代码最后一行 `println!("{}", s)` 能正常运行吗？
+ 能，&s 只是借用，s 的所有权没有转移，s 仍然有效
- 不能，s 已经被借用，无法再直接访问
- 不能，s 已经被"移动"到 r 中
- 能，但必须等 r 离开作用域之后才行
E: &s 创建了对 s 的不可变引用，所有权仍在 s 这里。引用不会让原变量失效。因此 s 在引用存在期间仍然可以读取——这正是引用存在的意义：让多方能同时读取数据。
```

## 可变引用测验

```rust
fn main() {
    let s = String::from("hello");
    append_world(&mut s);
    println!("{}", s);
}

fn append_world(s: &mut String) {
    s.push_str(", world");
}
```

```quiz single
Q: 上面的代码有什么问题？
- 函数签名有误，参数应该是 &String 而不是 &mut String
+ 变量 s 没有声明为 mut，不能从不可变变量创建可变引用
- push_str 方法不存在，应该用 + 运算符拼接
- 没有问题，代码可以正常编译
E: 创建可变引用 &mut s 要求原变量 s 必须声明为 let mut s。这里 s 声明为不可变变量，因此 &mut s 会触发编译错误。需要把 let s 改为 let mut s。
```

```quiz single
Q: 下列关于可变引用限制的说法，哪项是正确的？
- 同一时间可以有多个可变引用，但只能实际使用其中一个
+ 对同一数据，同一时间只能有一个活跃的可变引用
- 有了可变引用后，直到程序结束都不能再创建不可变引用
- 可变引用不受借用规则约束，只要不真正修改数据就行
E: 核心限制：对同一数据，同一时间只能有一个活跃的可变引用。"活跃"是关键——如果上一个可变引用已经不再使用（NLL 判定），可以创建新的可变引用。这个限制防止了数据竞争。
```

## 借用规则测验

```rust
fn main() {
    let mut s = String::from("hello");
    let r1 = &s;
    let r2 = &s;
    let r3 = &mut s;
    println!("{}, {}, {}", r1, r2, r3);
}
```

```quiz single
Q: 上面的代码能编译通过吗？
- 能，r1 和 r2 是不可变的，r3 是可变的，类型不同所以没问题
+ 不能，在 r1 和 r2 仍然活跃时，不能创建可变引用 r3
- 能，因为变量 s 声明了 mut，所以什么引用都可以同时存在
- 不能，但原因是 r1 和 r2 重复借用了 s
E: r1 和 r2 在 println! 中还在使用，它们的借用仍然活跃。此时创建可变引用 r3 违反了"不可变引用与可变引用不能共存"规则。如果把 println! 放在 let r3 之前（让 r1、r2 先用完），代码就可以编译了。
```

```rust
fn dangle() -> &String {
    let s = String::from("hello");
    &s
}
```

```quiz single
Q: 上面的函数有什么根本问题？
- 没有问题，返回引用是完全合法的
- 只需要加一个生命周期标注就能修复
+ s 在函数结束时被释放，返回它的引用会指向已释放的内存（悬垂引用）
- 问题是 s 没有声明为 mut
E: s 是函数内的局部变量，函数结束时 s 被 drop。返回 &s 的话，调用者拿到的引用指向已被释放的内存——悬垂引用。Rust 不允许这种情况，编译时直接报错。解决方案是返回 String 本身（转移所有权），而不是引用。
```

```quiz multi
Q: 下列哪些情况符合 Rust 的借用规则？（多选）
+ 同时存在三个不可变引用 &T
- 同时存在两个可变引用 &mut T
+ 先用完所有不可变引用，再创建一个可变引用（利用 NLL）
- 同时存在一个不可变引用和一个可变引用（均在活跃状态）
+ 仅存在一个可变引用，没有任何不可变引用
E: 规则是：要么多个不可变引用，要么一个可变引用，二者不能同时活跃。利用 NLL，不可变引用最后一次使用后，其借用即结束，此后可以创建可变引用——它们没有"同时"活跃，因此合法。
```

## 编程练习

下面的函数想通过引用给字符串追加感叹号，但无法编译。请修复 `append_exclamation` 的签名和 `main` 中的调用，使其输出正确：

```rust editable
fn append_exclamation(s: &String) {
    s.push_str("!");
}

fn main() {
    let s = String::from("hello");
    append_exclamation(&s);
    println!("{}", s);
}
```

```expected
hello!
```

---

下面的函数试图返回一个局部变量的引用，会产生悬垂引用错误。请修改 `create_greeting` 的返回类型和返回值，使其能正确返回数据：

```rust editable
fn create_greeting() -> &String {
    let greeting = String::from("hello, world");
    &greeting
}

fn main() {
    let s = create_greeting();
    println!("{}", s);
}
```

```expected
hello, world
```
