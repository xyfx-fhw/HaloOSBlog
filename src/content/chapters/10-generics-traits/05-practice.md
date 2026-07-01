---
title: "综合练习"
description: "综合运用泛型语法，巩固本章核心概念"
difficulty: intermediate
estimatedTime: 15
keywords: ["泛型练习", "综合"]
---

# 综合判断题

## 泛型语法测验

```quiz single
Q: 下面哪个函数签名能正确编译？
+ fn first<T: Clone>(list: &[T]) -> T { list[0].clone() }
- fn first<T>(list: &[T]) -> T { list[0] }
- fn first<T>(list: Vec<T>) -> &T { &list[0] }
- fn first(list: &[T]) -> &T { &list[0] }
E: 第二项：把 T 从引用中移出需要 Copy 或 Clone，不能直接 list[0]。第一项正确：加了 Clone 约束后可以 .clone()。第四项：T 未声明。第三项：返回对局部 Vec 的引用，生命周期错误。
```

```rust
struct Stack<T> {
    items: Vec<T>,
}

impl<T> Stack<T> {
    fn new() -> Self { Stack { items: Vec::new() } }
    fn push(&mut self, item: T) { self.items.push(item); }
    fn pop(&mut self) -> Option<T> { self.items.pop() }
    fn is_empty(&self) -> bool { self.items.is_empty() }
}
```

```quiz multi
Q: 关于上面的 Stack<T>，哪些说法是正确的？
+ Stack<i32> 和 Stack<String> 都能正常使用
+ is_empty 不需要 T 有任何约束就能调用
+ push 和 pop 可以在同一个 Stack 实例上交替调用
- Stack<T> 隐式要求 T: Clone
E: Stack<T> 没有约束，Vec 的 push/pop 对任意 T 都有效，is_empty 只检查长度，Clone 不是隐式要求的。
```

```quiz single
Q: impl<T> Point<T> 和 impl Point<f64> 的区别是什么？
- 两种写法功能完全相同
- impl Point<f64> 会覆盖 impl<T> 对 f64 的所有实现
- Rust 不允许两者共存于同一文件
+ impl<T> 为所有类型实现，impl Point<f64> 只为 f64 实现专属方法
E: 两者可以同时存在。impl<T> 的方法对所有 Point 都有效；impl Point<f64> 添加的方法只有 f64 版本才能调用。
```

```quiz single
Q: 关于单态化，哪个说法是错误的？
+ 单态化会在运行时使用虚函数表（vtable）进行类型查找
- 单态化后的代码运行速度与手写具体类型代码相同
- 单态化在编译期完成
- 使用的泛型类型越多，二进制体积可能越大
E: vtable 是动态分发（dyn Trait）的机制，不是单态化。单态化在编译期为每种具体类型生成独立代码，运行时没有任何类型查找。
```

# 编程练习

## 练习一：泛型栈

下面是一个只能存 `i32` 的栈，实现已经完整。请把它改成泛型版本 `Stack<T>`，让它能存任意类型：

```rust editable
// TODO: 把 i32 换成泛型参数 T
struct Stack {
    items: Vec<i32>,
}

impl Stack {
    fn new() -> Self {
        Stack { items: Vec::new() }
    }

    fn push(&mut self, item: i32) {
        self.items.push(item);
    }

    fn pop(&mut self) -> Option<i32> {
        self.items.pop()
    }

    fn peek(&self) -> Option<&i32> {
        self.items.last()
    }

    fn is_empty(&self) -> bool {
        self.items.is_empty()
    }
}

fn main() {
    // 改完后这两段代码都应该能编译运行
    let mut int_stack: Stack<i32> = Stack::new();
    int_stack.push(1);
    int_stack.push(2);
    int_stack.push(3);
    println!("栈顶: {:?}", int_stack.peek()); // Some(3)
    println!("弹出: {:?}", int_stack.pop());  // Some(3)

    let mut str_stack: Stack<&str> = Stack::new();
    str_stack.push("hello");
    str_stack.push("world");
    println!("栈顶: {:?}", str_stack.peek()); // Some("world")
    println!("空栈: {}", int_stack.is_empty()); // false
}
```

```expected
栈顶: Some(3)
弹出: Some(3)
栈顶: Some("world")
空栈: false
```

## 练习二：泛型键值对

实现一个 `KeyValue<K, V>` 结构，存储一个键值对，并为它实现 `swap` 方法，返回键值互换后的新 `KeyValue<V, K>`。

```rust editable
struct KeyValue<K, V> {
    // TODO
}

impl<K, V> KeyValue<K, V> {
    fn new(key: K, value: V) -> Self {
        todo!()
    }

    fn swap(self) -> KeyValue<V, K> {
        todo!()
    }
}

fn main() {
    let pair = KeyValue::new("name", 42);
    println!("key={}, value={}", pair.key, pair.value); // key=name, value=42

    let swapped = pair.swap();
    println!("key={}, value={}", swapped.key, swapped.value); // key=42, value=name
}
```

```expected
key=name, value=42
key=42, value=name
```
