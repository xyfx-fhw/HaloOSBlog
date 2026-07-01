---
title: "日志输出（log + env_logger）"
description: "掌握用 log 门面库和 env_logger 给 Rust 程序添加可分级、可过滤的结构化日志。"
difficulty: beginner
estimatedTime: 25
keywords: ["log", "env_logger", "RUST_LOG", "日志", "tracing", "调试"]
---

# 为什么需要日志

## println! 的局限

`dbg!` 和 `println!` 适合开发期的临时调试，但有几个明显的局限：

1. **无法分级**：你没法说"这条消息是警告，那条是调试信息"
2. **无法过滤**：不需要的时候必须手动删，需要的时候再手动加回来
3. **不适合库代码**：库的使用者不想看到你的调试输出
4. **格式固定**：无法输出带时间戳、带模块名的结构化日志

日志系统解决了这些问题。Rust 生态有一个广泛采用的日志**门面**（Facade）—— [`log`](https://crates.io/crates/log) crate，它只定义接口，不绑定具体输出方式。程序中用 `log` 的宏写日志，运行时插入一个**日志实现**（如 `env_logger`）来决定怎么输出。

类比：USB 是接口标准，具体的 U 盘品牌是实现。你买了 `log` 的"USB 接口"，可以随时换不同的"U 盘"（日志后端），代码不需要改。

## 日志级别

`log` 定义了五个级别，从最详细到最严重：

| 级别 | 宏 | 用途 |
|------|-----|------|
| `TRACE` | `trace!()` | 极细粒度的追踪信息，通常不在生产环境开启 |
| `DEBUG` | `debug!()` | 开发调试信息，生产环境通常关闭 |
| `INFO` | `info!()` | 常规运行信息（启动、完成、重要事件） |
| `WARN` | `warn!()` | 警告，程序还能运行但有潜在问题 |
| `ERROR` | `error!()` | 错误，某个操作失败（但程序可能继续运行） |

级别越高（ERROR 最高），越重要。生产环境一般只输出 `INFO` 及以上级别。

## 添加依赖

在 `Cargo.toml` 中添加：

```toml
[dependencies]
log = "0.4"
env_logger = "0.11"
```

`log` 是接口，`env_logger` 是开发和测试常用的简单实现（读取 `RUST_LOG` 环境变量来配置输出）。

# env_logger 实战

## 初始化与基本使用

在 `main` 函数的**最开始**调用 `env_logger::init()` 来初始化日志系统，然后就可以用 `log` 的宏了：

```rust runnable
# use log::{trace, debug, info, warn, error};
fn main() {
    // 初始化 env_logger，读取 RUST_LOG 环境变量
    env_logger::init();

    trace!("超详细的追踪信息：{}", 42);
    debug!("调试信息：正在处理请求");
    info!("服务器启动，监听端口 {}", 8080);
    warn!("配置文件中未找到超时设置，使用默认值 30s");
    error!("数据库连接失败：{}", "connection refused");
}
```

直接 `cargo run`，你会发现**没有任何输出**。这是正常的——默认情况下 `env_logger` 不输出任何内容，需要通过 `RUST_LOG` 环境变量指定要显示的级别。

## RUST_LOG 环境变量

`RUST_LOG` 是控制 env_logger 输出的核心变量：

```bash
# 显示 INFO 及以上（INFO、WARN、ERROR）
RUST_LOG=info cargo run

# 显示所有级别（包括 TRACE、DEBUG）
RUST_LOG=trace cargo run

# 只显示 ERROR 级别
RUST_LOG=error cargo run
```

开启 `RUST_LOG=info` 后，上面程序的输出类似：

```text
[2026-01-15T10:30:00Z INFO  my_app] 服务器启动，监听端口 8080
[2026-01-15T10:30:00Z WARN  my_app] 配置文件中未找到超时设置，使用默认值 30s
[2026-01-15T10:30:00Z ERROR my_app] 数据库连接失败：connection refused
```

输出格式：`[时间 级别 模块名] 消息`

## 按模块过滤

`RUST_LOG` 支持精确指定哪些模块的日志要显示：

```bash
# 只显示名为 my_app::database 的模块的 DEBUG 及以上日志
RUST_LOG=my_app::database=debug cargo run

# my_app 模块用 debug 级别，其他依赖用 warn 级别
RUST_LOG=warn,my_app=debug cargo run

# 多模块独立控制
RUST_LOG=my_app::http=info,my_app::db=debug cargo run
```

这种过滤对调试复杂系统非常有用：你可以只打开正在排查的模块的详细日志，而不被其他模块的噪音淹没。

## 在库中使用日志

`log` 是专门为库设计的门面。**库代码只使用 `log` 的宏，不调用 `env_logger::init()`**——由使用库的应用程序决定用哪个日志实现：

```rust runnable
// 这是一个库的代码（lib.rs）
use log::{debug, info, warn};

pub fn parse_config(path: &str) -> Result<String, String> {
    debug!("开始解析配置文件：{}", path);

    // 模拟读取配置
    if path.is_empty() {
        warn!("配置文件路径为空，使用默认配置");
        return Ok("default".to_string());
    }

    info!("配置文件解析成功");
    Ok("config content".to_string())
}
```

库不调用 `env_logger::init()`，这样库的使用者可以自由选择 `env_logger`、`tracing`、`fern` 等任意日志后端。

> **注意**：如果你同时在库和应用里都调用了 `env_logger::init()`，会触发运行时 panic（日志系统只能初始化一次）。库里永远不要调用 `init()`。

## 在测试中查看日志

单元测试默认会捕获 stdout，但 `env_logger` 输出到 stderr。要在测试中查看日志，可以这样初始化：

```rust runnable
#[cfg(test)]
mod tests {
    use super::*;

    fn init_logger() {
        // try_init 在已初始化时不报错（测试会多次调用）
        let _ = env_logger::builder()
            .is_test(true)       // 让日志走 test 的输出机制
            .try_init();
    }

    #[test]
    fn test_with_logging() {
        init_logger();
        // 设置 RUST_LOG=debug cargo test 即可看到测试中的日志
        log::debug!("测试开始");
        assert_eq!(2 + 2, 4);
    }
}
```

## 日志格式定制

`env_logger` 的 Builder API 支持自定义输出格式：

```rust runnable
# use log::info;
fn main() {
    env_logger::Builder::from_default_env()
        .format_timestamp_secs()   // 时间戳精度到秒（默认是毫秒）
        .format_module_path(false) // 不显示模块路径
        .init();

    info!("格式更简洁的日志");
}
```

对于生产级别的日志需求（结构化 JSON 输出、异步日志、分布式追踪），可以考虑 [`tracing`](https://crates.io/crates/tracing) 生态——它是 `log` 的超集，额外支持 span（时间段追踪）概念，在异步程序中特别有用。

# 练习题

## 日志系统测验

```quiz single
Q: log 和 env_logger 的关系是什么？
- log 是输出实现，env_logger 是接口定义
+ log 定义接口（宏和 trait），env_logger 是一种具体的日志输出实现
- env_logger 已包含 log，只需要加 env_logger 依赖
- 它们是同一个 crate 的两个模块
E: log 是"门面"（Facade）设计模式的体现：定义接口，不绑定实现。这样库代码只依赖 log，应用程序可以自由选择 env_logger、tracing 等任意实现。
```

```quiz single
Q: 下列 RUST_LOG 设置中，哪个会同时显示 TRACE、DEBUG、INFO、WARN、ERROR？
- RUST_LOG=debug,trace
- RUST_LOG=5
- RUST_LOG=all
+ RUST_LOG=trace
E: 日志级别是有序的：trace < debug < info < warn < error。设置 RUST_LOG=trace 意味着显示 trace 及以上所有级别，即全部级别。
```

```quiz single
Q: 为什么库代码（lib.rs）不应该调用 env_logger::init()？
- 因为库代码不支持日志
- 因为库不能添加依赖
- 因为 env_logger 不稳定
+ 初始化只能调用一次，由应用程序决定使用哪种日志实现
E: 日志系统是全局单例，只能初始化一次。如果库自己初始化，就剥夺了应用程序选择日志后端的权利，还可能因为重复初始化而 panic。
```

```quiz single
Q: 运行 cargo run 时没有任何日志输出，最可能的原因是什么？
- main 函数中忘记了 println!
- 代码中没有 use log::info; 等导入
- env_logger 版本太旧
+ 没有设置 RUST_LOG 环境变量，env_logger 默认不输出任何内容
E: env_logger 默认完全静默。需要设置 RUST_LOG=info（或其他级别）才会开始输出日志。这是有意的设计，避免库日志在生产环境意外泄漏调试信息。
```
