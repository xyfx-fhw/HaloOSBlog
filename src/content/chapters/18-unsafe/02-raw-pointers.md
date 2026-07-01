---
title: "裸指针"
description: "掌握 *const T 与 *mut T 裸指针的创建、解引用规则及常见使用模式"
difficulty: advanced
estimatedTime: 25
keywords: ["裸指针", "raw pointer", "*const T", "*mut T", "unsafe", "指针算术"]
---

# 裸指针基础

裸指针（raw pointer）是 Rust 中最接近 C 指针的东西，它绕过了所有借用规则和生命周期检查。和引用相比，裸指针：

- **不保证有效**：可能为空（null）、已悬垂（dangling）或指向未初始化内存
- **不受借用规则约束**：可以同时存在多个可变裸指针指向同一数据
- **不自动清理**：裸指针不拥有数据，不会触发 `Drop`

Rust 有两种裸指针：

| 类型 | 含义 |
|------|------|
| `*const T` | 不可变裸指针，解引用后不能修改目标 |
| `*mut T` | 可变裸指针，解引用后可以修改目标 |

> 裸指针类型名里的 `*` 是类型的一部分，不是解引用运算符。读作"pointer-const T"或"pointer-mut T"。

## 引用解决不了的四类场景

**99% 的情况下，引用（`&T` / `&mut T`）比裸指针更好**——有生命周期保护，有借用检查，出了问题编译期就报错。但有四类场景引用确实无能为力，必须用裸指针：

### 场景一：与 C 代码互操作

C 语言没有 Rust 的引用概念，C 的 API 全部用指针。调用 C 函数、接收 C 回调、读写 C 结构体，都必须用裸指针：

```rust runnable
extern "C" {
    // C 标准库的 memcpy，参数全是裸指针
    fn memcpy(dst: *mut u8, src: *const u8, n: usize) -> *mut u8;
}

fn main() {
    let src = [1u8, 2, 3, 4, 5];
    let mut dst = [0u8; 5];
    unsafe {
        memcpy(dst.as_mut_ptr(), src.as_ptr(), src.len());
    }
    println!("{:?}", dst); // [1, 2, 3, 4, 5]
}
```

### 场景二：借用检查器无法表达的数据结构

双向链表、图、自引用结构——这些数据结构里，一个节点同时被多个其他节点"指向"，用引用会产生循环借用，生命周期标注会陷入死局。裸指针绕过了这个限制：

```rust runnable
// 用引用实现双向链表几乎不可能——前后节点互相持有对方的引用，
// 生命周期无法描述。用裸指针则直接：
struct Node {
    val: i32,
    prev: *mut Node,  // 指向前一个节点，可为 null
    next: *mut Node,  // 指向后一个节点，可为 null
}

fn main() {
    // 演示：创建两个节点并连接
    let mut a = Box::new(Node { val: 1, prev: std::ptr::null_mut(), next: std::ptr::null_mut() });
    let mut b = Box::new(Node { val: 2, prev: std::ptr::null_mut(), next: std::ptr::null_mut() });

    // 用裸指针建立双向连接
    a.next = &mut *b as *mut Node;
    b.prev = &mut *a as *mut Node;

    unsafe {
        println!("a.next.val = {}", (*a.next).val); // 2
        println!("b.prev.val = {}", (*b.prev).val); // 1
    }
}
```

### 场景三：同时可变借用同一数据的不重叠部分

借用检查器是保守的：即使两个 `&mut` 指向同一切片的不同位置，它也会拒绝。标准库的 `split_at_mut` 就是通过裸指针实现的，它证明了"我知道这两段不会重叠"：

```rust runnable
fn split_at_mut_impl(slice: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
    let len = slice.len();
    let ptr = slice.as_mut_ptr();

    assert!(mid <= len);

    // 安全 Rust 无法表达这个操作——两个 &mut 来自同一 slice：
    // (&mut slice[..mid], &mut slice[mid..]) // 编译错误！

    // 裸指针可以：我们知道 [0, mid) 和 [mid, len) 不重叠
    unsafe {
        (
            std::slice::from_raw_parts_mut(ptr, mid),
            std::slice::from_raw_parts_mut(ptr.add(mid), len - mid),
        )
    }
}

fn main() {
    let mut v = [1, 2, 3, 4, 5];
    let (left, right) = split_at_mut_impl(&mut v, 3);
    left[0] = 10;
    right[0] = 40;
    println!("{:?}", v); // [10, 2, 3, 40, 5]
}
```

### 场景四：可空指针（nullable pointer）

C 的 API 常用 `NULL` 表示"无值"。Rust 的引用永远非空，`Option<&T>` 虽然可以表达这个语义，但在 FFI 边界上有时必须用真正的裸指针，因为 C 不认识 `Option`：

```rust runnable
/// 从可空的 C 字符串指针读取内容，null 时返回默认值
unsafe fn read_or_default(ptr: *const i32, default: i32) -> i32 {
    if ptr.is_null() {
        default
    } else {
        *ptr
    }
}

fn main() {
    let x = 42i32;
    unsafe {
        println!("{}", read_or_default(&x, 0));                    // 42
        println!("{}", read_or_default(std::ptr::null(), 0));      // 0（null 返回默认值）
    }
}
```

# 使用裸指针

## 创建裸指针

**创建裸指针不需要 `unsafe`**——创建本身只是记录一个内存地址，没有任何危险操作：

```rust runnable
fn main() {
    let x = 42i32;
    let mut y = 100i32;

    // 从引用转换：最常见、最安全的方式
    let p_const: *const i32 = &x as *const i32;
    let p_mut:   *mut i32   = &mut y as *mut i32;

    // 也可以用 std::ptr::addr_of! 宏（不需要创建引用）
    let p2 = std::ptr::addr_of!(x);

    println!("p_const 地址: {:?}", p_const);
    println!("p_mut   地址: {:?}", p_mut);
    println!("两者相等（都指向同类型）: {}", std::mem::size_of_val(&p_const) == std::mem::size_of_val(&p_mut));
}
```

## 解引用裸指针

解引用需要 `unsafe`，因为编译器无法保证指针有效：

```rust runnable
fn main() {
    let x = 42i32;
    let p: *const i32 = &x;

    // 安全：从有效引用创建的指针，在 x 的生命周期内解引用是安全的
    unsafe {
        println!("x = {}", *p);
    }

    let mut y = 0i32;
    let pm: *mut i32 = &mut y;
    unsafe {
        *pm = 99; // 通过可变裸指针写入
    }
    println!("y = {}", y); // 99
}
```

## null 指针

Rust 的裸指针可以是 null。`std::ptr::null()` 和 `std::ptr::null_mut()` 创建 null 指针：

```rust runnable
fn main() {
    let p: *const i32 = std::ptr::null();

    println!("is_null: {}", p.is_null()); // true

    // 解引用 null 指针是未定义行为——程序会崩溃或产生错误结果
    // unsafe { println!("{}", *p); } // 千万不要这样做！

    // 使用前必须检查
    if !p.is_null() {
        unsafe { println!("{}", *p); }
    } else {
        println!("指针为 null，跳过解引用");
    }
}
```

# 指针算术与高级用法

## 指针偏移

裸指针支持算术运算，用于遍历内存中连续排列的数据（如数组）：

```rust runnable
fn main() {
    let arr = [10i32, 20, 30, 40, 50];
    let base: *const i32 = arr.as_ptr(); // 指向第一个元素

    unsafe {
        // offset(n) 向后移动 n 个元素（以 T 的大小为单位）
        println!("arr[0] = {}", *base);
        println!("arr[1] = {}", *base.offset(1));
        println!("arr[2] = {}", *base.add(2)); // add 是 offset 的安全别名（不允许负偏移）
        println!("arr[4] = {}", *base.add(4));
    }
}
```

> `add(n)` 等价于 `offset(n as isize)`，但语义上只允许正方向偏移，代码更清晰。**越过数组边界的偏移是未定义行为**，不会有编译错误，但运行时可能崩溃或产生错误数据。

## 同时持有多个可变指针

裸指针绕过了借用规则，可以同时持有多个可变指针——这是双向链表、自引用结构等实现的基础，但也是最容易出错的地方：

```rust runnable
fn main() {
    let mut data = [1i32, 2, 3];

    // 在安全 Rust 里，不能同时持有两个 &mut
    // 但裸指针可以
    let p0: *mut i32 = &mut data[0];
    let p2: *mut i32 = &mut data[2];

    unsafe {
        *p0 = 100;
        *p2 = 300;
    }

    println!("{:?}", data); // [100, 2, 300]
}
```

## 裸指针与切片

从裸指针重建切片引用，是手动分配内存后访问数据的标准模式：

```rust runnable
fn main() {
    let v: Vec<i32> = vec![1, 2, 3, 4, 5];

    // 获取底层裸指针和长度
    let ptr: *const i32 = v.as_ptr();
    let len = v.len();

    // 从裸指针 + 长度重建切片
    let slice: &[i32] = unsafe {
        std::slice::from_raw_parts(ptr, len)
    };

    println!("{:?}", slice); // [1, 2, 3, 4, 5]

    // 注：此时 v 和 slice 都指向同一块内存
    // 只要 v 未被修改或释放，slice 就是有效的
}
```

# 练习题

## 裸指针基础测验

```quiz single
Q: 创建裸指针（不解引用）需要 unsafe 块吗？
- 需要，任何涉及裸指针的操作都需要 unsafe
+ 不需要，创建裸指针是安全操作，只有解引用才需要 unsafe
- 需要，但只有 *mut T 类型需要，*const T 不需要
- 取决于指针的来源
E: 创建裸指针只是记录一个内存地址，本身不危险。真正危险的是解引用——编译器无法在这一步保证指针有效，所以解引用需要 unsafe，创建不需要。
```

```rust
let x = 5i32;
let p: *const i32 = &x;
let q: *const i32 = &x;
```

```quiz single
Q: 上面的代码，p 和 q 同时指向 x，这在 Rust 中是否合法？
+ 合法，裸指针不受"同时只能有一个可变借用"的限制
- 不合法，同一数据不能有两个裸指针
- 合法，但只有 *const T 可以，*mut T 不行
- 不合法，需要 unsafe 才能创建指向同一地址的指针
E: 裸指针完全绕过借用规则。即使是两个 *mut T 同时指向同一地址，创建本身也是合法的。危险在于通过两个可变指针同时写入——那是未定义行为，但 Rust 不会在编译期阻止你。
```

```quiz single
Q: base.offset(5) 在数组越界时会发生什么？
- 编译错误
- 运行时 panic（类似越界索引）
+ 未定义行为，可能崩溃、返回垃圾数据，或看似正常运行
- 返回 null 指针
E: 裸指针越界是未定义行为（UB），不是 panic。Rust 不会像安全索引那样插入边界检查。UB 的后果完全不可预测——可能程序"碰巧"正常，可能崩溃，也可能悄悄读写错误内存。这是 unsafe 代码中最难调试的错误类型之一。
```

```quiz multi
Q: 下列哪些关于 *const T 和 *mut T 的说法是正确的？
+ *const T 解引用后只能读，不能写
+ 两者都可以为 null
+ *mut T 可以转换为 *const T
- *const T 指向的数据一定不会被修改（类似 const 变量）
E: 最后一项是错的。*const T 的"const"只是说"你不能通过这个指针写入"，并不代表那块内存真的不可变。同一块内存完全可以同时存在一个 *const T 和一个 *mut T，通过 *mut T 写入后，*const T 读出来的值就变了。就像你把一本书的地址给别人"只读"，但书本身没有上锁，其他人随时可以修改它。
```

## 编程练习

用裸指针实现一个 `sum_slice` 函数，通过指针算术遍历 `i32` 数组，返回所有元素的和：

```rust editable
unsafe fn sum_slice(ptr: *const i32, len: usize) -> i32 {
    // TODO: 从 ptr 开始，用 add(i) 逐个读取元素，累加后返回
    todo!()
}

fn main() {
    let arr = [3, 1, 4, 1, 5, 9, 2, 6];
    let result = unsafe { sum_slice(arr.as_ptr(), arr.len()) };
    println!("{}", result);
}
```

```expected
31
```
