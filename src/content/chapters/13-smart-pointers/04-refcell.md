---
title: "RefCell<T> 与内部可变性"
description: "探索内部可变性模式：在持有不可变引用的情况下，安全地修改内部数据。"
difficulty: intermediate
estimatedTime: 35
keywords: ["RefCell", "内部可变性", "运行时借用检查", "Rc<RefCell<T>>"]
---

# 什么是内部可变性？

Rust 的借用规则很明确：当你拥有一个不可变引用 `&T` 时，你不能同时拥有可变引用 `&mut T`。这条规则防止了数据竞争，是内存安全的核心保障。

然而，在某些合理的设计场景中，这条规则会成为阻碍。**内部可变性** (Interior Mutability) 是一种设计模式，它允许你即使在持有不可变引用时，也能修改数据内部的值。

这听起来像是在绕开 Rust 的安全保障，实际上并非如此。`RefCell<T>` 并没有绕过借用规则，它只是将借用检查从**编译时**推迟到了**运行时**。如果运行时违反了规则，程序会 Panic 而不是产生未定义行为。

## `RefCell<T>`：运行时的借用检查

让我们先来理解 `Box<T>`、`Rc<T>` 和 `RefCell<T>` 之间的核心差异：

| 类型 | 所有者数量 | 借用检查时机 | 可变性 |
|------|----------|------------|--------|
| `Box<T>` | 唯一 | 编译时 | 可变或不可变 |
| `Rc<T>` | 多个 | 编译时 | 仅不可变 |
| `RefCell<T>` | 唯一 | **运行时** | 可变或不可变 |

`RefCell<T>` 提供了两个核心方法：

- **`borrow()`**：返回 `Ref<T>`，行为类似不可变引用 `&T`。
- **`borrow_mut()`**：返回 `RefMut<T>`，行为类似可变引用 `&mut T`。

`RefCell<T>` 在内部维护一个计数器，追踪当前活跃的 `Ref<T>` 和 `RefMut<T>` 的数量。规则和编译期一样：可以同时有多个 `Ref<T>`，但 `RefMut<T>` 必须独占。如果违反，程序会 Panic：

```text
thread 'main' panicked at 'already borrowed: BorrowMutError'
```

### 何时选择 `RefCell<T>`

当你**确信**代码在运行时不会违反借用规则，但编译器因为其分析的保守性而无法证明这一点时，`RefCell<T>` 是正确的选择。

# 内部可变性实战

最直接的场景：一个计数器，需要在只有 `&self` 的方法里更新自身状态。

## 直接修改（编译失败）

```rust
struct Counter {
    count: i32,
}

impl Counter {
    // &self 而非 &mut self
    fn increment(&self) {
        self.count += 1; // 编译错误：不能通过不可变引用修改字段
    }
}
```

## 用 `RefCell<T>` 解决

```rust runnable
use std::cell::RefCell;

struct Counter {
    count: RefCell<i32>,
}

impl Counter {
    fn new() -> Self {
        Counter { count: RefCell::new(0) }
    }

    // 签名仍是 &self，但内部可以修改
    fn increment(&self) {
        *self.count.borrow_mut() += 1;
    }

    fn value(&self) -> i32 {
        *self.count.borrow()
    }
}

fn main() {
    let c = Counter::new();
    c.increment();
    c.increment();
    c.increment();
    println!("计数: {}", c.value()); // 3
}
```

`borrow_mut()` 返回一个 `RefMut<T>` 智能指针，通过 `*` 解引用后就可以修改内部值，用完后自动归还借用权。`borrow()` 同理，返回 `Ref<T>` 用于只读访问。

# `Rc<RefCell<T>>`：共享且可变

`Rc<T>` 和 `RefCell<T>` 结合是 Rust 中一个非常强大的模式：

- `Rc<T>` 解决了**多所有者**的问题
- `RefCell<T>` 解决了**可变性**的问题

两者相结合，就能得到一个可以被多处共享，同时又可以被任意一处修改的值。可变性的借用检查仍然存在，只是时机变了——`Rc` 允许你从任意一个持有者处调用 `borrow_mut()`，但 `RefCell` 会在运行时确保同一时刻最多只有一个可变借用活跃；若有多个持有者同时尝试调用 `borrow_mut()` 且互相重叠，程序会 Panic：

```rust runnable
use std::rc::Rc;
use std::cell::RefCell;

#[derive(Debug)]
enum List {
    Cons(Rc<RefCell<i32>>, Rc<List>),
    Nil,
}
use List::{Cons, Nil};

fn main() {
    // 这个值将被多个列表节点共享，且可以被修改
    let shared_value = Rc::new(RefCell::new(5));

    // a、b、c 三个列表都持有 shared_value 的一份所有权
    let a = Rc::new(Cons(Rc::clone(&shared_value), Rc::new(Nil)));
    let b = Cons(Rc::new(RefCell::new(3)), Rc::clone(&a));
    let c = Cons(Rc::new(RefCell::new(4)), Rc::clone(&a));

    // 修改 shared_value 的值
    *shared_value.borrow_mut() += 10;

    // 所有持有 shared_value 的列表节点都看到了更新
    println!("修改后 a = {:?}", a);
    println!("修改后 b = {:?}", b);
    println!("修改后 c = {:?}", c);
}
```

# 练习题

## 测验

```quiz single
Q: `RefCell<T>` 相对于普通引用，最主要的区别是什么？
- 它允许多个所有者。
- 它可以跨线程使用。
+ 它将借用规则的检查从编译期推迟到运行时，允许在某些编译器无法验证的场景中进行可变借用。
- 它禁止了不可变借用。
E: RefCell 仍然遵守借用规则，只是检查时机变了。违规会在运行时 Panic，而非编译错误。
```

```quiz single
Q: 如果在同一作用域内对一个 `RefCell<T>` 调用了两次 `borrow_mut()`，会发生什么？
- 编译报错。
- 第二次调用会等待第一次释放。
+ 运行时 Panic，并显示 `BorrowMutError`。
- 正常运行，但可能产生数据竞争。
E: RefCell 在运行时维护借用计数，违反规则时会 Panic 并退出线程，以此替代编译时错误。
```

```rust
use std::rc::Rc;
use std::cell::RefCell;

let data = Rc::new(RefCell::new(0));
let a = Rc::clone(&data);
let b = Rc::clone(&data);

*a.borrow_mut() += 10;
*b.borrow_mut() += 5;

println!("{}", data.borrow());
```

```quiz single
Q: 以上代码最终打印的是什么？
- 0
- 10
- 5
+ 15
E: a 和 b 都持有同一个 RefCell<i32> 的共享所有权。两次 borrow_mut() 分别加了 10 和 5，最终值为 15。每次 borrow_mut() 调用结束后借用权立即归还，所以两次调用不会冲突。
```

```quiz single
Q: `borrow()` 和 `borrow_mut()` 的返回类型分别是什么？
- `&T` 和 `&mut T`
- `Option<&T>` 和 `Option<&mut T>`
+ `Ref<T>` 和 `RefMut<T>`
- `Cell<T>` 和 `Cell<T>`
E: 返回的是智能指针 Ref<T> 和 RefMut<T>，它们实现了 Deref，会在 Drop 时自动减少借用计数。
```

```quiz single
Q: 在以下场景中，哪种组合最合适？需要在单线程环境中，让多个地方能够修改同一份共享数据。
- `Rc<T>`
- `Box<RefCell<T>>`
+ `Rc<RefCell<T>>`
- `Arc<Mutex<T>>`
E: Rc 提供多所有权，RefCell 提供内部可变性，二者组合恰好满足单线程多写的需求。Arc<Mutex<T>> 用于多线程。
```
