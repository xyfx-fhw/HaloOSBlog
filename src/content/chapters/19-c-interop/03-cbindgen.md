---
title: "暴露 Rust 给 C：cbindgen"
description: "学习将 Rust 库打包为 C 动态库，并使用 cbindgen 自动生成 C/C++ 接口头文件。"
difficulty: beginner
estimatedTime: 25
keywords: ["cbindgen", "FFI", "cdylib", "no_mangle", "extern C"]
---

# 导出 Rust 给 C

有时我们需要编写一个极高性能的 Rust 库，然后让现有的 C、C++ 或 Python 代码调用它。这需要我们完成两件事：
1. 将 Rust 代码编译成 C 兼容的动态链接库（`.so`/`.dll`）。
2. 为 C 代码提供对应的头文件（`.h`）。

这就是 **`cbindgen`** 的用武之地。

## 准备 Rust 代码

要导出函数，必须满足：
- 使用 `pub extern "C"`。
- 使用 `#[no_mangle]` 禁用符号重整。

```rust runnable
#[repr(C)]
pub struct CalculationResult {
    pub value: f64,
    pub is_valid: bool,
}

#[no_mangle]
pub extern "C" fn calculate_sqrt(input: f64) -> CalculationResult {
    if input < 0.0 {
        CalculationResult { value: 0.0, is_valid: false }
    } else {
        CalculationResult { value: input.sqrt(), is_valid: true }
    }
}
```

注意：结构体必须加上 `#[repr(C)]`，否则 Rust 的布局方式与 C 不一致，会导致严重的数据损坏问题。

## 项目配置

在 `Cargo.toml` 中，必须指定库类型为 `cdylib`：

```toml
[lib]
crate-type = ["cdylib"]
```

# 配置与使用

虽然可以手动写头文件，但如果你的 Rust 接口经常变动，同步起来会非常麻烦。`cbindgen` 可以自动化这一过程。

## 使用 CLI 工具

安装工具：

```bash
cargo install cbindgen
```

在 Rust 项目根目录运行：

```bash
cbindgen --config cbindgen.toml --crate my_project --output my_lib.h
```

生成的 `my_lib.h` 如下：

```c
#include <stdint.h>
#include <stdbool.h>

typedef struct {
  double value;
  bool is_valid;
} CalculationResult;

CalculationResult calculate_sqrt(double input);
```

## cbindgen.toml 配置

通过一个可选的配置文件，你可以精细控制头文件的生成逻辑：

```toml
language = "C" # 也可以是 "C++"
header = "/* 自动化生成的 Rust 绑定头文件 */"
include_guard = "MY_LIB_H"

[export]
include = ["CalculationResult", "calculate_sqrt"]
```

## 内存安全警告

从 C 调用 Rust 时，**所有权规则依然存在**。
- 如果 Rust 返回了一个在堆上分配的对象（如 `Box` 或 `Vec`），C 代码必须将其传回给 Rust 的特定函数来释放。
- 绝不要在 C 语言中直接调用 `free()` 来释放由 Rust 堆分配器管理的内存。

# 练习题

## 核心概念测验

```quiz single
Q: cbindgen 与 bindgen 的区别是什么？
- 没有区别，只是名字不同。
- bindgen 用于导出 Rust 给 C，cbindgen 则相反。
+ bindgen 是从 C 头文件产生 Rust 声明；cbindgen 是从 Rust 代码产生 C 头文件。
- cbindgen 专门用于嵌入式系统，bindgen 用于桌面端。
E: cbindgen 的 "c" 代表 "C Output"，它是为 C 代码准备接口的。
```

```quiz single
Q: 在导出给 C 的结构体上，为什么必须标注 `#[repr(C)]`？
- 为了让代码运行得更快。
- 为了开启所有权检查。
+ 为了确保结构体成员在内存中的排版顺序与 C 编译器一致。
- 为了让结构体变成私有的。
E: Rust 默认的内存布局由于其灵活性，可能与 C 不同（如字段重排以压缩空间）。通过 `#[repr(C)]` 强制使用 C 兼容布局。
```

```quiz multi
Q: 要让 Rust 函数能被 C 正确链接，哪些条件是必须的？
+ 标注 `#[no_mangle]`。
+ 标注 `extern "C"` 或 `pub extern "C"`。
- 函数必须返回 `Result`。
- 函数必须使用泛型。
E: `#[no_mangle]` 保证符号名不变，`extern "C"` 保证调用约定匹配。
```

```quiz single
Q: 在 `Cargo.toml` 中，`crate-type = ["cdylib"]` 的作用是？
- 把程序编译成浏览器可运行的 WASM。
+ 告诉 Cargo 编译一个符合标准 C 接口的动态库。
- 允许 Cargo 使用外部依赖。
- 自动生成头文件。
E: `cdylib` 是专为 FFI 场景设计的库类型，它会剥离 Rust 特有的元数据，只保留标准的链接符号。
```

```quiz single
Q: 关于内存管理，下列哪种做法在 FFI 中是安全的？
- 在 Rust 中 Box 一个对象返回，然后在 C 中用 `free()`。
+ 在 Rust 中提供一个专门的 `drop_obj(ptr)` 函数供 C 代码在结束时调用。
- 直接在 C 中修改 Rust 传来的 `&str` 的内容。
- 在 C 中申请内存，并在 Rust 中用 `Drop` 释放。
E: 跨语言调用的原则是「谁申请，谁释放」。Rust 分配的内存必须回到 Rust 代码中由 Rust 的释放机制（如 Drop）处理。
```
