---
title: "静态混合编译：Rust 与 C 的深度链接"
description: "学习如何在工程中进行静态混合编译：无论是将 C 源码打包进 Rust，还是将 Rust 编译为静态库供 C 使用。"
difficulty: intermediate
estimatedTime: 20
keywords: ["cc-crate", "staticlib", "静态链接", "混合构建", "Cargo.toml"]
---

# 静态混合编译

在系统级编程中，**静态链接 (Static Linking)** 是最稳健的方案。它将所有依赖的代码在编译期直接拷贝到最终的可执行文件中，生成一个没有任何外部库依赖的二进制文件，这对于跨平台分发和嵌入式开发至关重要。

本节我们将讨论两种典型的静态混合编译场景。

## 场景一：C 为 Rust 所用（在 Rust 项目中编译 C 源码）

当你需要调用一小段 C 代码，或者正在将一个现有的 C 库集成到 Rust 项目中时，你会选择这个方案。

### 1. 目录结构

推荐将 C 源码放在项目根目录下的独立文件夹中（如 `c_src`），以保持源码整洁：

```text
my_project/
├── Cargo.toml
├── build.rs         <-- 构建脚本
├── c_src/           <-- C 源码
│   ├── utils.c
│   └── utils.h
└── src/
    └── main.rs      <-- Rust 逻辑
```

### 2. 使用 `cc` crate 管理构建

`cc` crate 是 Rust 生态中编译 C/C++ 代码的标准工具。它会自动搜索系统中安装的编译器（如 `gcc`, `clang`, `msvc`），并根据目标平台设置正确的编译参数。

**步骤 A：添加依赖** (`Cargo.toml`)
```toml
[build-dependencies]
cc = "1.0"
```

**步骤 B：编写构建脚本** (`build.rs`)
构建脚本在 Rust 编译开始前运行。其核心任务是调用编译器将 C 文件编译成静态库（`.a` 或 `.lib`）。

```rust
fn main() {
    // 1. 指定监控的文件：如果 utils.c 变动，Cargo 会自动重新编译 C 代码
    println!("cargo:rerun-if-changed=c_src/utils.c");

    // 2. 使用 cc::Build 配置编译
    cc::Build::new()
        .file("c_src/utils.c")      // 添加源文件
        .include("c_src")           // 添加头文件搜索路径（-I）
        .define("DEBUG_MODE", "1")  // 添加宏定义（-D）
        .warnings(true)             // 启用警告
        .compile("myutils");        // 编译并生成 libmyutils.a 静态库
}
```

### 3. 构建脚本背后的「秘密」

当你调用 `.compile("myutils")` 时，`cc` crate 实际上为 Cargo 做了两件事：
1.  **运行编译器**：在 `target/` 目录下生成静态库文件。
2.  **发送链接指令**：它会自动向 Cargo 标准输出打印如下内容（你看不到但 Cargo 能接收到）：
    *   `cargo:rustc-link-lib=static=myutils` (告诉链接器包含这个库)
    *   `cargo:rustc-link-search=native=/path/to/library` (告诉链接器在哪找)

### 4. 在 Rust 中建立桥梁

现在你可以直接在 Rust 里声明对应的外部函数了：

```rust
// src/main.rs
extern "C" {
    // 必须与 C 中的声明完全一致
    fn c_function_name(arg: i32);
}

fn main() {
    unsafe {
        c_function_name(42);
    }
}
```

---

## 场景二：Rust 为 C 所用（将 Rust 打包给 C 工程）

如果你想在一个现有的庞大 C 语言工程中引入 Rust（例如重写某个性能瓶颈模块），你需要将 Rust 编译成一个 C 编译器能理解的「静态库文件」。

### 1. 配置项目类型

默认情况下，Cargo 会生成 Rust 专用的 `.rlib`。要生成 C 定义的静态库，必须在 `Cargo.toml` 中显式指定：

```toml
[lib]
name = "my_rust_core"
crate-type = ["staticlib"] # 👈 关键点：生成静态二进制库 (.a 或 .lib)
```

### 2. 导出函数

确保你的 Rust 函数使用了 `extern "C"` 和 `#[no_mangle]`：

```rust
#[no_mangle]
pub extern "C" fn rust_add(a: i32, b: i32) -> i32 {
    a + b
}
```

### 3. 在 C 工程中链接

当你运行 `cargo build --release` 后，在 `target/release/` 下会找到 `libmy_rust_core.a`。

**链接命令示例 (GCC)：**
```bash
gcc main.c -L ./target/release/ -lmy_rust_core -lpthread -ldl -o my_app
```

> **💡 专家提示：**
> 静态链接 Rust 时，必须手动链接其底层的操作系统依赖。在 Linux 上通常是 `-lpthread` 和 `-ldl`。如果链接时报错「undefined reference」，请检查是否遗漏了这些系统库。

# 练习题

## 概念测验

```quiz single
Q: 在 `cc` crate 的配置中，`.include("path")` 的主要作用是什么？
- 链接该路径下的静态库。
+ 告诉编译器在哪可以找到 `#include` 引入的头文件。
- 将 path 下的所有 C 文件加入编译。
- 自动生成 Rust 对应的头文件。
E: include 对应的是编译器的 -I 参数，用于指定搜索头文件的目录。
```

```quiz single
Q: 为什么在 build.rs 中建议写 `println!("cargo:rerun-if-changed=...")`？
- 为了让代码运行得更快。
- 为了自动删除旧的构建产物。
+ 为了让 Cargo 知道只有在这些文件变化时才重新运行构建脚本。
- 为了在终端打印调试信息。
E: 这是构建系统的增量编译机制，可以节省大量的重复编译时间。
```

```quiz multi
Q: 当你需要在 C 语言工程中链接由 Rust 生成的静态库时，需要链接哪些东西？
- Rust 的源代码文件。
- Cargo.toml 文件。
+ 目标平台相关的系统库（如 Linux 下的 lpthread）。
+ Rust 生成的静态库（如 libxxx.a）。
E: 链接器只需要二进制目标文件和它依赖的底层库，不需要源码或配置文件。
```
