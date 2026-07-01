---
title: "数据建模"
description: "从需求出发设计 Todo 结构体和 Command 枚举，学会用 Rust 的类型系统表达命令行工具的数据与行为"
difficulty: intermediate
estimatedTime: 25
keywords: ["数据建模", "结构体", "枚举", "命令行参数", "serde", "Todo"]
---

# 从需求出发

## 工具需要哪些数据

在写代码之前，先思考：`rtodo` 需要存储和操作哪些数据？

一条任务有这些属性：
- **唯一 ID**：区分不同的任务（用于 `done 1`、`remove 2` 等操作）
- **标题**：任务描述（一段文字）
- **是否完成**：布尔值
- **创建时间**：可选，方便排序（先放一放，后面扩展）

工具接收的命令有：
- `add "内容"` — 新建任务
- `list` — 列出所有任务
- `done <id>` — 标记完成
- `remove <id>` — 删除任务
- `search "关键词"` — 搜索标题包含关键词的任务
- 其他输入 — 显示帮助

## Todo 结构体

```rust runnable
// 需要 serde 来序列化，先用 derive(Debug) 验证结构
#[derive(Debug)]
struct Todo {
    id: u32,
    title: String,
    completed: bool,
}

impl Todo {
    fn new(id: u32, title: String) -> Self {
        Todo { id, title, completed: false }
    }
}

fn main() {
    let task = Todo::new(1, "写完第一章".to_string());
    println!("{:?}", task);
    // Todo { id: 1, title: "写完第一章", completed: false }
}
```

等会儿加上 `serde` 的 `Serialize`/`Deserialize` derive，让它能自动读写 JSON。

## Command 枚举

用枚举表示所有可能的命令——每个变体带上它需要的数据：

```rust runnable
#[derive(Debug)]
enum Command {
    Add(String),    // 要添加的任务内容
    List,           // 不需要额外数据
    Done(u32),      // 要标记完成的任务 ID
    Remove(u32),    // 要删除的任务 ID
    Search(String), // 要搜索的关键词
    Help,           // 显示帮助
}

fn main() {
    let cmds = vec![
        Command::Add("学习 Rust".to_string()),
        Command::List,
        Command::Done(1),
        Command::Remove(2),
        Command::Search("Rust".to_string()),
    ];
    for cmd in &cmds {
        println!("{:?}", cmd);
    }
}
```

**为什么用枚举而不是字符串匹配？**

你可以直接 `match args[0].as_str() { "add" => ..., "list" => ... }`，但这样做：
1. 参数解析和业务逻辑混在一起，难以测试
2. 一旦参数缺失（比如 `done` 后面没有 ID），错误处理很散乱

用枚举的方式：**先解析 → 得到强类型的 `Command` → 再执行**。每一步职责清晰，错误统一在解析阶段处理。

# 解析命令行参数

## 读取 args

`std::env::args()` 返回所有命令行参数的迭代器：

```rust runnable
fn main() {
    // 跳过第一个参数（程序自身路径）
    let args: Vec<String> = std::env::args().skip(1).collect();
    println!("{:?}", args);
    // 运行 `rtodo add "写代码"` 时输出：["add", "写代码"]
}
```

## 实现参数解析函数

```rust runnable
#[derive(Debug)]
enum Command { Add(String), List, Done(u32), Remove(u32), Search(String), Help }

fn parse_args(args: &[String]) -> Result<Command, String> {
    match args {
        // add "任务内容"
        [cmd, title] if cmd == "add" => {
            if title.trim().is_empty() {
                Err("任务内容不能为空".to_string())
            } else {
                Ok(Command::Add(title.clone()))
            }
        }

        // list
        [cmd] if cmd == "list" => Ok(Command::List),

        // done <id>
        [cmd, id_str] if cmd == "done" => {
            let id = id_str.parse::<u32>()
                .map_err(|_| format!("'{}' 不是有效的任务 ID", id_str))?;
            Ok(Command::Done(id))
        }

        // remove <id>
        [cmd, id_str] if cmd == "remove" => {
            let id = id_str.parse::<u32>()
                .map_err(|_| format!("'{}' 不是有效的任务 ID", id_str))?;
            Ok(Command::Remove(id))
        }

        // search "关键词"
        [cmd, query] if cmd == "search" => {
            if query.trim().is_empty() {
                Err("搜索关键词不能为空".to_string())
            } else {
                Ok(Command::Search(query.clone()))
            }
        }

        // 无参数或 help
        [] | [_] if args.first().map(|s| s.as_str()) == Some("help") => Ok(Command::Help),
        [] => Ok(Command::Help),

        // 其他情况
        _ => Err(format!("未知命令：{}", args.join(" "))),
    }
}

fn main() {
    // 模拟不同的参数输入
    let test_cases: Vec<Vec<String>> = vec![
        vec!["add".into(), "写代码".into()],
        vec!["list".into()],
        vec!["done".into(), "1".into()],
        vec!["done".into(), "abc".into()],   // 错误情况
        vec!["search".into(), "Rust".into()],
        vec!["unknown".into()],              // 错误情况
    ];

    for args in &test_cases {
        match parse_args(args) {
            Ok(cmd) => println!("✓ {:?}", cmd),
            Err(e)  => println!("✗ {}", e),
        }
    }
}
```

**几个要注意的地方：**

- `args` 是 `&[String]` 而不是 `Vec<String>`——函数不需要拥有所有权，借用切片即可
- 模式 `[cmd, title] if cmd == "add"` 叫**带守卫的切片模式**，同时检查了长度和内容
- `.map_err(|_| ...)` 把 `parse` 的错误转成我们自己的错误字符串，然后 `?` 传播出去

## 连接 main 和解析器

```rust
fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();

    let command = match parse_args(&args) {
        Ok(cmd) => cmd,
        Err(e) => {
            eprintln!("错误：{}", e);
            eprintln!("运行 `rtodo help` 查看使用说明");
            std::process::exit(1);
        }
    };

    // 下一篇实现这里
    println!("收到命令：{:?}", command);
}
```

`eprintln!` 把错误信息输出到 stderr，`std::process::exit(1)` 以非零退出码退出——这是 CLI 工具的标准错误处理方式。

# 加上 serde 序列化

现在给 `Todo` 加上 serde 的 derive，让它可以自动转换为 JSON：

```rust
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Todo {
    id: u32,
    title: String,
    completed: bool,
}
```

`#[derive(Serialize, Deserialize)]` 是 serde 提供的 derive 宏，它在编译时自动生成把 `Todo` 转成 JSON 字符串、以及从 JSON 字符串还原 `Todo` 的代码。

你不需要手写任何序列化逻辑——只需要加两个单词，就能把结构体变成 JSON，再从 JSON 还原。这正是过程宏（第 21 章）的典型应用场景。

## 本章小结与练习

**本章完成的事：**
- 设计 `Todo` 结构体（id、title、completed）
- 用带数据的枚举 `Command` 表达所有命令
- 用切片模式解析 `&[String]` 参数，统一在一处处理错误

**练习：**

为 `parse_args` 添加一个 `clear` 命令支持——`rtodo clear` 删除所有已完成的任务：

1. 在 `Command` 枚举里添加 `Clear` 变体
2. 在 `parse_args` 里添加对应的模式匹配分支
3. 在测试用例里验证 `["clear"]` 能正确解析为 `Command::Clear`
