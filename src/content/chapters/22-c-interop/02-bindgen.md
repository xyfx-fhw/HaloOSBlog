---
title: "自动生成绑定：bindgen"
description: "学习使用 bindgen 工具自动从 C 头文件生成 Rust 绑定代码，大幅提升开发效率。"
difficulty: intermediate
estimatedTime: 25
keywords: ["bindgen", "FFI", "build.rs", "自动化", "C-headers"]
---

# 自动化绑定

手动为成百上千个 C 函数编写 `extern "C"` 声明不仅枯燥，而且极易出错。如果 C 语言库更新了头文件，手动维护这些绑定简直是噩梦。

**`bindgen`** 是 Rust 官方推荐的工具，它可以自动读取 C 头文件（`.h`），并生成对应的 Rust 原始绑定。

## 使用 bindgen CLI

你可以先安装命令行工具来快速测试：

```bash
cargo install bindgen-cli
```

假设你有一个名为 `input.h` 的文件：

```c
typedef struct {
    int x;
    int y;
} Point;

void print_point(Point p);
```

运行以下命令：

```bash
bindgen input.h -o bindings.rs
```

生成的 `bindings.rs` 会包含：

```rust
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct Point {
    pub x: ::std::os::raw::c_int,
    pub y: ::std::os::raw::c_int,
}

extern "C" {
    pub fn print_point(p: Point);
}
```

# 构建脚本集成

在实际项目中，我们通常在 `build.rs`（构建脚本）中使用 `bindgen`，这样每次编译时它都会自动根据最新的头文件更新绑定。

## 配置步骤

1. 在 `Cargo.toml` 中添加依赖：

```toml
[build-dependencies]
bindgen = "0.69"
```

2. 编写 `build.rs`：

```rust
use std::env;
use std::path::PathBuf;

fn main() {
    // 告诉 Cargo，如果头文件变了，就重新运行脚本
    println!("cargo:rerun-if-changed=wrapper.h");

    let bindings = bindgen::Builder::default()
        .header("wrapper.h")
        .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
        .generate()
        .expect("Unable to generate bindings");

    // 将生成的绑定写入 $OUT_DIR/bindings.rs
    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings!");
}
```

3. 在 Rust 代码中引入生成的内容：

```rust
// 引入自动生成的代码
include!(concat!(env!("OUT_DIR"), "/bindings.rs"));

fn main() {
    let p = Point { x: 10, y: 20 };
    unsafe {
        print_point(p);
    }
}
```

### 关键机制：为什么使用 `OUT_DIR`？

在上面的 `build.rs` 示例中，你可能注意到我们并没有把生成的 `bindings.rs` 放在 `src/` 目录下。这是 Rust 构建脚本的标准实践：

1.  **避免源码污染**：自动生成的代码会随 C 头文件的变化而变动，不应该作为「手写源码」提交到 Git 仓库。
2.  **`OUT_DIR` 环境变量**：这是 Cargo 为构建脚本专门准备的临时存放目录（通常在 `target/debug/build/...` 路径下）。
3.  **`include!` 宏**：它是 Rust 内置的宏，可以将指定文件的内容「原封不动」地粘贴到当前位置，从而让我们在 Rust 源码中直接使用那些自动生成的结构体定义。

## 处理复杂情况

- **宏定义**：bindgen 会尝试将 C 中的 `#define` 转换为 Rust 的常量。
- **不透明类型**：对于不想在 Rust 中直接访问成员的结构体，可以使用 `.opaque_type("MyStruct")`。
- **白名单机制**：如果你只想为特定函数生成绑定，可以使用 `.allowlist_function("my_func_.*")`。

# 练习题

## 概念测验

```quiz single
Q: bindgen 的核心功能是什么？
- 把 Rust 编译成 C 语言。
+ 自动从 C 头文件生成 Rust FFI 声明代码。
- 自动优化 C 语言的运行效率。
- 给 C 语言添加所有权检查。
E: bindgen 的作用是作为桥梁，自动完成原本需要手动编写的 `extern "C"` 声明。
```

```quiz single
Q: 在 `build.rs` 中使用 bindgen 时，生成的 `bindings.rs` 通常放在哪里？
- 项目根目录。
- `src/` 目录下。
+ `OUT_DIR` 环境变量指向的临时构建目录。
- `target/debug/` 目录下。
E: 自动生成的代码不建议直接放进源码仓库（src/），而是放在构建输出目录中，通过 `include!` 宏引入。
```

```quiz multi
Q: 使用构建脚本（build.rs）集成 bindgen 的好处有哪些？
+ 自动同步 C 头文件的更新。
- 可以让 Rust 代码不再需要 `unsafe` 块。
+ 开发者不需要手动维护复杂的 FFI 类型声明。
+ 方便在不同的平台上自动适配。
E: 虽然生成了代码，但调用 FFI 依然是 `unsafe` 的。其他选项都是自动化集成带来的典型优势。
```

```quiz single
Q: 如果 C 头文件中包含大量无关的函数，但我只想要其中一个，该怎么做？
- 手动删除生成的 bindings.rs 中的代码。
- 必须全部引入，无法过滤。
+ 在 bindgen 生成器中使用 `.allowlist_function`（白名单）。
- 修改 C 头文件，删掉不需要的函数。
E: bindgen 提供了强大的过滤功能（白名单/黑名单），允许开发者精确控制生成的代码量。
```

```quiz single
Q: `include!(concat!(env!("OUT_DIR"), "/bindings.rs"));` 这行代码的作用是什么？
- 下载并安装一个叫 bindings 的 crate。
+ 在当前位置插入生成的 bindings.rs 文件的源代码。
- 把 bindings.rs 编译成动态链接库。
- 检查 bindings.rs 是否有语法错误。
E: `include!` 宏会将指定文件的内容原封不动地包含进当前文件中，类似于 C 语言的 `#include`。
```
