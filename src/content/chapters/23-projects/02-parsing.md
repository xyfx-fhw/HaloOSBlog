---
title: "解析命令行参数"
description: "用切片模式匹配把命令行参数解析成强类型的 Command 枚举，把解析逻辑放在 lib.rs 里实现职责分离"
difficulty: intermediate
estimatedTime: 25
keywords: ["命令行参数", "枚举", "模式匹配", "args", "Result", "lib.rs"]
---

# 定义 Command 枚举

在写任何代码之前，先想清楚用户怎么使用这个工具：

```bash
rtodo add "写代码"       # 第一个参数是命令名，第二个是内容
rtodo list              # 只有命令名，没有额外参数
rtodo done 1            # 第二个参数是任务 ID
rtodo remove 2          # 第二个参数是任务 ID
rtodo search "Rust"     # 第二个参数是搜索关键词
rtodo help              # 显示帮助
```

程序拿到这些参数后，需要先判断用户想做什么，再去执行。这个"判断"的过程叫**解析**，是这一章的主要内容。

## 定义枚举

解析的结果是什么？可以是一个字符串，但更好的做法是用枚举——每个变体精确表达一条命令，并携带它需要的数据。

`Command` 描述的是"用户输入了什么命令"，属于 CLI 层的概念，和业务逻辑没有关系。每个变体只携带自己需要的数据：

```rust
// rtodo/src/lib.rs — 新建此文件，写入以下内容
pub enum Command {
    Add(String),    // 要添加的任务标题
    List,           // 不需要额外数据
    Done(u32),      // 要标记完成的任务 ID
    Remove(u32),    // 要删除的任务 ID
    Search(String), // 要搜索的关键词
    Help,
}
```

`Add` 需要标题，`Done` 和 `Remove` 需要 ID，`List` 和 `Help` 不需要任何额外信息。

**为什么用枚举而不是直接 match 字符串？**

你可以直接 `match args[0].as_str() { "add" => ..., "list" => ... }`，但这样做参数解析和业务逻辑混在一起，一旦参数格式复杂（比如 `done` 后面没有 ID），错误处理就会散落各处，很难维护。

用枚举的方式，先把原始字符串解析成 `Command`，再执行——每一步职责清晰，错误统一在解析阶段处理。

# 搭建骨架

## 规划结构

`rtodo/src/lib.rs` 和 `rtodo/src/main.rs` 各司其职：

```text
rtodo/src/
├── lib.rs    ← Command、parse_args、run（可测试、可被外部引用）
└── main.rs   ← 只负责调用 run()
```

`lib.rs` 里的代码可以被单独测试和引用；`main.rs` 保持最小集，不含任何业务代码。

## 在 lib.rs 里规划函数签名

在 `Command` 定义之后，用 `todo!()` 占位写出函数签名：

```rust
// rtodo/src/lib.rs — 接着 Command 定义之后写入
/// 把命令行参数切片解析成 Command，格式错误时返回错误描述
pub fn parse_args(args: &[String]) -> Result<Command, String> {
    todo!()
}

/// 程序主逻辑：读取参数、解析命令、执行对应操作
pub fn run() -> Result<(), String> {
    todo!()
}
```

先把骨架写出来确认接口设计，再逐个填逻辑。

## 写入入口文件

入口文件只做一件事：调用 `run()`，出错时打印并退出：

```rust
// rtodo/src/main.rs — 全文替换为以下内容
fn main() {
    if let Err(e) = rtodo::run() {
        eprintln!("错误: {}", e);
        std::process::exit(1);
    }
}
```

`rtodo::run()` 用 crate 名直接限定，不需要额外 `use`。`std::process::exit(1)` 立即终止进程，向操作系统返回退出码 `1`——退出码 `0` 表示成功，非零表示失败，Shell 脚本可以用 `$?` 读取它。如果只写 `return`，退出码是 `0`，调用方会误以为执行成功了。

骨架写好后先编译一次，确认结构没问题（可能有 warning，后续章节会处理）：

```bash
cargo build
```

# 读取命令行参数

先填 `run()` 的第一部分：读取原始参数。

Rust 用 `std::env::args()` 获取命令行参数，它返回一个迭代器，每个元素是一个 `String`。有一个细节：**第一个参数永远是程序自身的路径**，不是用户输入的内容。比如运行 `rtodo add "写代码"`，`args()` 实际返回的是：

```text
["/usr/local/bin/rtodo", "add", "写代码"]
  ↑ 第 1 个，程序路径      ↑ 第 2 个  ↑ 第 3 个
```

所以要用 `.skip(1)` 跳过第一个。`.collect()` 把剩余的迭代器收集成 `Vec<String>`。把 `run()` 里的 `todo!()` 替换成：

```rust
// rtodo/src/lib.rs — 替换 run() 中的 todo!()
pub fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let command = parse_args(&args)?;

    // 后续章节在这里处理 command
    Ok(())
}
```

`parse_args(&args)?` 调用解析函数，`?` 把解析失败的错误直接从 `run` 传播出去，由入口文件打印。

# 实现 parse_args

## 先写测试

TDD 的做法是先写测试描述期望的行为，再写实现让测试通过。在 `lib.rs` 末尾添加测试模块：

```rust
// rtodo/src/lib.rs — 文件末尾添加
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        let result = parse_args(&["add".to_string(), "写代码".to_string()]);
        assert!(matches!(result, Ok(Command::Add(t)) if t == "写代码"));
    }

    #[test]
    fn test_list() {
        let result = parse_args(&["list".to_string()]);
        assert!(matches!(result, Ok(Command::List)));
    }

    #[test]
    fn test_done() {
        let result = parse_args(&["done".to_string(), "1".to_string()]);
        assert!(matches!(result, Ok(Command::Done(1))));
    }

    #[test]
    fn test_done_invalid_id() {
        let result = parse_args(&["done".to_string(), "abc".to_string()]);
        assert!(result.is_err());
    }

    #[test]
    fn test_remove() {
        let result = parse_args(&["remove".to_string(), "2".to_string()]);
        assert!(matches!(result, Ok(Command::Remove(2))));
    }

    #[test]
    fn test_search() {
        let result = parse_args(&["search".to_string(), "Rust".to_string()]);
        assert!(matches!(result, Ok(Command::Search(q)) if q == "Rust"));
    }

    #[test]
    fn test_empty_args_shows_help() {
        let result = parse_args(&[]);
        assert!(matches!(result, Ok(Command::Help)));
    }

    #[test]
    fn test_unknown_command_is_error() {
        let result = parse_args(&["unknown".to_string()]);
        assert!(result.is_err());
    }
}
```

现在运行测试：

```bash
cargo test
```

所有测试都会失败（`todo!()` 会 panic），这是正常的——测试先红，再让它变绿。

## 实现让测试通过

把 `parse_args` 里的 `todo!()` 替换成：

```rust
// rtodo/src/lib.rs — 替换 parse_args() 中的 todo!()
pub fn parse_args(args: &[String]) -> Result<Command, String> {
    match args {
        [cmd, title] if cmd == "add" => {
            Ok(Command::Add(title.clone()))
        }

        [cmd] if cmd == "list" => Ok(Command::List),

        [cmd, id] if cmd == "done" => {
            let id: u32 = id.parse()
                .map_err(|_| "任务 ID 无效".to_string())?;
            Ok(Command::Done(id))
        }

        [cmd, id] if cmd == "remove" => {
            let id: u32 = id.parse()
                .map_err(|_| "任务 ID 无效".to_string())?;
            Ok(Command::Remove(id))
        }

        [cmd, keyword] if cmd == "search" => {
            Ok(Command::Search(keyword.clone()))
        }

        [] => Ok(Command::Help),
        [cmd] if cmd == "help" => Ok(Command::Help),

        _ => Err("未知命令".to_string()),
    }
}
```

函数接受 `&[String]` 切片引用，而不是 `Vec<String>`——函数只需要读取数据，不需要拥有它，借用切片即可。

模式 `[cmd, title] if cmd == "add"` 叫**带守卫的切片模式**：`[cmd, title]` 要求参数数量恰好是两个，`if cmd == "add"` 要求第一个参数的值是 `"add"`，两个条件同时满足才匹配。

`title.clone()` 把借用的字符串复制一份。`parse_args` 接受的是借用（`&[String]`），`title` 是从中取出的引用，而 `Command::Add(String)` 需要拥有所有权的 `String`，不能直接把引用放进去，所以要 `.clone()` 复制一份。

`.parse()` 把字符串转成 `u32`，可能失败（比如用户输入 `"abc"`），`.map_err(|_| ...)` 把解析错误转成 `String`，`?` 传播出去。错误信息暂时用简单的固定字符串，后面优化章节会改成包含具体值的 `format!`。

再跑一次测试，确认全部通过：

```bash
cargo test
```

所有测试绿了说明实现正确。`cargo build` 此时编译器还会报 **unused variable** 警告（`command` 在 `run()` 里还没用到），后续章节自然消除。
