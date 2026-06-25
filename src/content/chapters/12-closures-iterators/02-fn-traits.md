---
title: "Fn trait 与闭包的高阶用法"
description: "理解 Fn/FnMut/FnOnce 三个 trait 的区别，学会用闭包作为函数参数和返回值"
difficulty: intermediate
estimatedTime: 25
keywords: ["Fn", "FnMut", "FnOnce", "闭包参数", "impl Fn", "高阶函数"]
---

# Fn / FnMut / FnOnce

## 为什么有三个 trait

上一篇我们看到闭包可以通过三种方式捕获变量：不可变引用、可变引用、所有权转移。这三种方式对应了三个 trait，它们描述的是**闭包能被怎样调用**：

| Trait | 调用方式 | 对应捕获方式 | 能调用几次 |
|-------|---------|------------|----------|
| `Fn` | 不可变引用调用 | `&T` 捕获 | 任意多次 |
| `FnMut` | 可变引用调用 | `&mut T` 捕获 | 任意多次（但需要 `mut`） |
| `FnOnce` | 消费调用 | `T` 捕获（移动） | 只能一次 |

三者之间有继承关系：**`Fn` 是最严格的子集，`FnOnce` 是最宽松的**。

```
FnOnce（所有闭包都实现）
  └── FnMut（不消耗所有权的闭包实现）
        └── Fn（只读访问的闭包实现）
```

即：`Fn` 的闭包一定实现了 `FnMut` 和 `FnOnce`；`FnMut` 的闭包一定实现了 `FnOnce`。

## 编译器自动推断

你不需要手动声明闭包实现哪个 trait——编译器根据闭包体里的行为自动决定：

```rust runnable
fn main() {
    let x = 5;
    // 只读取 x → 实现 Fn + FnMut + FnOnce
    let read_only = || println!("{}", x);
    read_only();
    read_only(); // 可以多次调用

    let mut count = 0;
    // 修改 count → 实现 FnMut + FnOnce（不实现 Fn）
    let mut mutating = || {
        count += 1;
        println!("{}", count);
    };
    mutating();
    mutating(); // FnMut 可以多次调用

    let name = String::from("Alice");
    // 消费 name → 只实现 FnOnce
    let consuming = || {
        let _n = name; // 移动了 name 的所有权
    };
    consuming();
    // consuming(); // 错误！FnOnce 只能调一次
}
```

# 闭包作为参数

## 用 impl Fn 接受闭包

当函数需要接受一个闭包参数时，用 `impl Fn`/`impl FnMut`/`impl FnOnce` 作为类型：

```rust runnable
// 接受任何 i32 -> i32 的闭包，对 3 调用它（只调一次，用 Fn 即可）
fn apply_to_3(f: impl Fn(i32) -> i32) -> i32 {
    f(3)
}

fn main() {
    let double = |x| x * 2;
    println!("{}", apply_to_3(double)); // 6

    let add_one = |x| x + 1;
    println!("{}", apply_to_3(add_one)); // 4
}
```

**`FnMut`：需要多次调用且闭包有副作用**

当函数要多次调用闭包，且闭包可能修改捕获的变量时，参数类型要用 `FnMut`：

```rust runnable
// 对列表的每一项调用 f——f 会被调用多次，且可能有副作用
fn for_each(items: &[i32], mut f: impl FnMut(i32)) {
    for &x in items {
        f(x);
    }
}

fn main() {
    let mut sum = 0;
    // 闭包修改了 sum，是 FnMut
    for_each(&[1, 2, 3, 4, 5], |x| sum += x);
    println!("sum = {}", sum); // 15

    // 只读取也能传，因为 Fn 是 FnMut 的子集
    for_each(&[1, 2, 3], |x| println!("{}", x));
}
```

> 注意：接受 `FnMut` 参数时，参数本身需要声明 `mut`（`mut f: impl FnMut()`），因为调用它会修改其内部状态。

**`FnOnce`：只需调用一次，接受最广泛**

```rust runnable
// 只调用一次，用 FnOnce——连消费变量的闭包都能接受
fn call_once(f: impl FnOnce() -> String) -> String {
    f()
}

fn main() {
    let msg = String::from("hello");
    // 消费了 msg 的闭包（FnOnce）也能传进来
    let result = call_once(move || msg.to_uppercase());
    println!("{}", result);
}
```

## 选哪个 trait？

**原则：选限制最少的那个**——这样调用方能传入范围最广的闭包：

```rust runnable
// 如果只需要调用一次，用 FnOnce（最宽松，接受所有闭包）
fn run_once(f: impl FnOnce() -> String) -> String {
    f()
}

// 如果需要调用多次，用 Fn（调用方的闭包不能有可变副作用）
fn run_twice(f: impl Fn() -> i32) -> i32 {
    f() + f()
}

fn main() {
    let msg = String::from("hello");
    // 消费了 msg，只能调一次 → 传给 FnOnce 没问题
    let result = run_once(move || msg.to_uppercase());
    println!("{}", result);

    let base = 10;
    // 只读取 base，可以多次调用 → 传给 Fn 没问题
    println!("{}", run_twice(|| base + 1));
}
```

> **实践建议：** 不确定用哪个时，从 `Fn` 开始写。编译器会告诉你是否需要放宽到 `FnMut` 或 `FnOnce`。

## 也可以用泛型写法

`impl Fn(...)` 是 `<F: Fn(...)>` 的简写，两种写法等价：

```rust runnable
// impl Trait 写法（更简洁）
fn apply_a(f: impl Fn(i32) -> i32, x: i32) -> i32 {
    f(x)
}

// 泛型写法（需要多次用到同一个闭包类型时更灵活）
fn apply_b<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(x)
}

fn main() {
    println!("{}", apply_a(|x| x * 3, 4)); // 12
    println!("{}", apply_b(|x| x * 3, 4)); // 12
}
```

# 闭包作为返回值

## 必须用 impl Fn

每个闭包都有一个唯一的匿名类型，函数不能以具体类型返回它，必须用 `impl Fn(...)` 语法：

```rust runnable
// 返回一个"加上偏移量"的闭包
fn make_adder(offset: i32) -> impl Fn(i32) -> i32 {
    move |x| x + offset  // 必须 move，否则 offset 在函数结束后就失效了
}

fn main() {
    let add5 = make_adder(5);
    let add10 = make_adder(10);

    println!("{}", add5(3));   // 8
    println!("{}", add10(3));  // 13
    println!("{}", add5(7));   // 12（add5 还可以继续用）
}
```

## 为什么必须 move

返回的闭包会在函数结束后继续使用，但 `offset` 是函数的局部变量，函数结束就销毁了。必须用 `move` 把 `offset` 的所有权移入闭包：

```rust runnable expect-error
fn make_adder_broken(offset: i32) -> impl Fn(i32) -> i32 {
    // 不加 move：闭包只是借用 offset
    // 函数返回后 offset 销毁，闭包持有悬垂引用 → 编译错误
    |x| x + offset
}
```

---

# 练习题

## Fn trait 测验

```quiz single
Q: 一个消费了捕获变量（通过 drop 或移动）的闭包实现了哪个 trait？
- 只实现 Fn
- 只实现 FnMut
+ 只实现 FnOnce
- 同时实现 Fn、FnMut 和 FnOnce
E: 消费捕获变量的闭包只能被调用一次（因为变量调用后就没了），所以只实现 FnOnce。Fn 和 FnMut 要求可以多次调用，无法满足。
```

```quiz single
Q: 函数参数要接受所有类型的闭包（包括只能调一次的），应该用哪个 trait bound？
- Fn
- FnMut
+ FnOnce
- 三个都写
E: FnOnce 是限制最少的——所有闭包（Fn、FnMut、FnOnce）都实现了 FnOnce。用 FnOnce 作为约束，接受范围最广。代价是只能调用一次。
```

```rust
fn run<F: Fn()>(f: F) {
    f();
    f();
}

fn main() {
    let mut count = 0;
    run(|| count += 1);
    println!("{}", count);
}
```

```quiz single
Q: 上面的代码能编译吗？
+ 不能，修改 count 的闭包是 FnMut，不满足 Fn 约束
- 能，输出 2
- 能，输出 0
- 不能，因为 Fn 不支持无参数闭包
E: 闭包 || count += 1 修改了捕获的变量，实现的是 FnMut 而不是 Fn。run 函数要求 F: Fn()，FnMut 不满足 Fn 的约束，编译报错。把 run 改成 F: FnMut() 并加上 mut 才能解决。
```

```quiz single
Q: 返回闭包时为什么通常需要 move 关键字？
+ 闭包可能捕获了函数的局部变量，函数返回后局部变量会被销毁，必须 move 进闭包才能继续使用
- 因为 impl Fn 语法要求 move
- 因为闭包不能返回引用
- 为了让闭包能被调用多次
E: 函数返回后其栈帧销毁，局部变量也随之消失。若闭包只是借用这些变量，返回后就会持有悬垂引用。move 把变量所有权移入闭包，闭包持有数据本身，不依赖原函数的生命周期。
```

## 编程练习

实现 `run_n` 函数，将传入的闭包执行 `n` 次。关键是选对 trait——`Fn`、`FnMut` 还是 `FnOnce`？

```rust editable
// TODO: 把 ??? 替换成正确的 trait（Fn / FnMut / FnOnce）
// 提示：f 会被调用 n 次，且第二个用法里 f 会修改外部变量
fn run_n(???) {
    for _ in 0..n {
        f();
    }
}

fn main() {
    // 用法 1：只读取，调用 3 次
    let msg = "hello";
    run_n(3, || println!("{}", msg));

    // 用法 2：修改外部变量，调用 4 次
    let mut count = 0;
    run_n(4, || count += 1);
    println!("count = {}", count);
}
```

```expected
hello
hello
hello
count = 4
```
