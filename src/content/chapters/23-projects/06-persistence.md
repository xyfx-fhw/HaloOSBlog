---
title: "数据持久化"
description: "用 serde_json 把任务列表序列化到 JSON 文件，让数据在程序重启后依然保留"
difficulty: intermediate
estimatedTime: 30
keywords: ["持久化", "serde_json", "文件读写", "JSON", "错误处理", "PathBuf"]
---

# 让 Todo 能转成 JSON

上一章的程序每次运行都从空列表开始，原因是任务只存在内存里，进程结束就消失了。要让数据保留，需要在程序退出前把列表写入文件，下次启动时再读回来。

最直接的格式是 JSON，人类可读，也方便调试。一份持久化后的任务文件长这样：

```json
[
  { "id": 1, "title": "写完命令实现章节", "completed": true },
  { "id": 2, "title": "写完持久化章节", "completed": false }
]
```

要实现这个，需要解决两件事：让 `Todo` 能自动转成 JSON，以及读写文件。

## 添加 serde 依赖

serde 是 Rust 生态里事实上的序列化标准库，本身只定义"如何转换"的接口；`serde_json` 是专门处理 JSON 格式的后端。在 `rtodo-core/Cargo.toml` 的 `[dependencies]` 里添加：

```toml
# rtodo-core/Cargo.toml — [dependencies] 部分添加
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

`features = ["derive"]` 启用 serde 的 derive 宏功能。不加的话，无法在结构体上写 `#[derive(Serialize, Deserialize)]`，需要手写大量转换代码。

## 给 Todo 加上序列化 derive

依赖加好之后，回到 `rtodo-core/src/lib.rs`，在文件顶部引入 serde，修改 `Todo` 的定义：

```rust
// rtodo-core/src/lib.rs — 文件顶部添加 use，并替换原有 Todo 定义
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Todo {
    pub id: u32,
    pub title: String,
    pub completed: bool,
}
```

和上一章相比，这里做了三处改动：

- 加了 `#[derive(Serialize, Deserialize)]`：编译器在编译时自动生成 `Todo ↔ JSON` 的转换代码，不需要手写任何逻辑
- 加了 `Clone`：`TodoStore` 的 load 方法里会用到，一并加上
- 结构体和字段都加了 `pub`：让 `rtodo` bin crate 能访问 `Todo` 的字段

# 确定存储路径

## 数据文件放在哪里

有两种常见选择：

- **当前目录** `./todos.json`：简单，但在不同目录运行 `rtodo` 会看到不同的任务列表
- **用户主目录** `~/.rtodo.json`：不管在哪个目录运行，都访问同一份数据

我们选用户主目录，这更符合任务管理工具的使用习惯。

## 实现 data_path

在 `rtodo-core/src/lib.rs` 里，在 `Todo` 定义之后写一个返回数据文件路径的公开函数：

```rust
// rtodo-core/src/lib.rs — Todo 定义之后添加
use std::path::PathBuf;

pub fn data_path() -> PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))  // Windows 的主目录变量
        .unwrap_or_else(|_| ".".to_string());        // 找不到就用当前目录

    PathBuf::from(home).join(".rtodo.json")
}
```

这里用 `PathBuf` 而不是 `String` 来表示路径。路径在不同操作系统上分隔符不同（Unix 用 `/`，Windows 用 `\`），`PathBuf` 会自动处理这个差异，`.join()` 也会使用正确的分隔符拼接。如果用字符串硬拼 `home + "/.rtodo.json"`，在 Windows 上路径会出错。

# 给 TodoStore 加上文件读写

## 给 TodoStore 加 path 字段

上一章的 `TodoStore` 只有 `todos` 字段。现在要加一个 `path`，记录数据文件的位置：

```rust
// rtodo-core/src/lib.rs — 替换原有 TodoList 定义
pub struct TodoStore {
    path: PathBuf,
    todos: Vec<Todo>,
}
```

`path` 是私有字段，外部不能直接改，只能通过 `load` 方法传入。同时把上一章的 `new()` 方法删掉，改用 `load()` 来创建 `TodoStore`。

## 实现 load

`load` 从文件读取任务列表，文件不存在时返回空列表（第一次运行的正常情况）：

```rust
// rtodo-core/src/lib.rs — TodoStore 定义之后写入
impl TodoStore {
    pub fn load(path: PathBuf) -> Result<Self, String> {
        let todos = if path.exists() {
            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("读取文件失败：{}", e))?;
            serde_json::from_str(&content)
                .map_err(|e| format!("解析 JSON 失败：{}", e))?
        } else {
            Vec::new()
        };

        Ok(TodoStore { path, todos })
    }
}
```

`load` 接受 `PathBuf`（获取所有权），存进 `self.path`。两个 `?` 各自负责一种错误：第一个处理文件读取失败（权限不足、路径错误等），第二个处理 JSON 格式损坏（文件被手动编辑乱了）。`.map_err(|e| format!(...))` 把标准库的错误类型统一转成 `String`，让调用方不需要处理多种不同的错误类型。

## 实现 save

`save` 把当前任务列表序列化并写回文件：

```rust
// rtodo-core/src/lib.rs — impl TodoStore 内，load 之后添加
    pub fn save(&self) -> Result<(), String> {
        let content = serde_json::to_string_pretty(&self.todos)
            .map_err(|e| format!("序列化失败：{}", e))?;
        std::fs::write(&self.path, content)
            .map_err(|e| format!("写入文件失败：{}", e))?;
        Ok(())
    }
```

`to_string_pretty` 生成带缩进的 JSON，文件内容更易于人工查看。`fs::write` 不需要提前创建文件——文件不存在时自动创建，存在时直接覆盖。

# 接入 main

## 更新引入和 run 函数

回到 `rtodo/src/lib.rs`，更新顶部的引入，加上 `data_path` 和 `TodoStore`：

```rust
// rtodo/src/lib.rs — 文件顶部，替换原有 use
use rtodo_core::{TodoStore, data_path};
```

在 `run` 函数里，把 `TodoList::new()` 换成 `TodoStore::load(data_path())`，并在命令执行完后调用 `store.save()`：

```rust
// rtodo/src/lib.rs — 替换 run() 函数
pub fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let command = parse_args(&args)?;

    let mut store = TodoStore::load(data_path())?;

    match command {
        // ... 和上一章完全相同 ...
    }

    store.save()?;
    Ok(())
}
```

`store.save()` 放在 `match` **之后**，每次命令执行完都写回文件，不管执行的是哪条命令。

## 再次运行

```bash
cargo run -p rtodo -- add "写完命令实现章节"
cargo run -p rtodo -- add "写完持久化章节"
cargo run -p rtodo -- list
cargo run -p rtodo -- done 1
cargo run -p rtodo -- list
```

这次再运行 `list`，上次添加的任务还在。查看 `~/.rtodo.json`，可以看到完整的 JSON 文件内容。

如果想直接用 `rtodo` 命令而不是每次写 `cargo run`，可以编译安装到系统：

```bash
cargo install --path rtodo
rtodo add "用原生命令添加任务"
```
