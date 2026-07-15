# HaloOS 系列讲解：完整章节目录设计

**日期**：2026-04-28（最后更新：2026-04-28）
**状态**：已批准
**决策**：方案 A（渐进主题式）

---

## 设计原则

- **渐进式复杂度**：按认知难度编排，不拘泥于 The Book 原有顺序
- **概念单一**：每章主题聚焦，每篇文章只讲一个核心概念
- **练习驱动**：每章末有综合练习文章，每篇技术文章包含测验或编程练习
- **目标读者**：零基础学习者，最终达到能够独立阅读官方文档、编写实用程序的水平

---

## 目录结构

共 **21 章**，约 **90 篇文章**（不含各章 `00-index.md`）。

---

### 第 01 章：入门基础 `01-rust-basics` ✅

| 文件 | 标题 |
|------|------|
| `01-installation.md` | 安装 Rust ✅ |
| `02-hello-world.md` | Hello, World! ✅ |
| `03-hello-cargo.md` | 使用 Cargo ✅ |

---

### 第 02 章：基础语法 `02-basic-syntax`

| 文件 | 标题 |
|------|------|
| `01-comments.md` | 注释 |
| `02-formatted-output.md` | 格式化输出 |
| `03-data-types.md` | 基础数据类型（整数、浮点、布尔、字符、元组、数组） |
| `04-variables.md` | 变量和可变性（let、mut、const、shadowing） |
| `05-control-flow.md` | 控制流（if/else、loop、while、for、range） |
| `06-functions.md` | 函数（参数、返回值、表达式 vs 语句） |
| `07-macros.md` | 宏基础（macro_rules!、常用内置宏） |
| `08-attributes.md` | 属性（#[derive]、#[cfg]、#[allow] 等） |
| `09-practice.md` | 综合练习 |

---

### 第 03 章：所有权系统 `03-ownership`

| 文件 | 标题 |
|------|------|
| `01-what-is-ownership.md` | 什么是所有权（规则、栈与堆） |
| `02-move-copy.md` | 移动与复制（move 语义、Copy trait、clone） |
| `03-references-borrowing.md` | 引用与借用（&T、&mut T、借用规则） |
| `04-slices.md` | 切片 |
| `05-practice.md` | 综合练习 |

---

### 第 04 章：自定义数据类型 `04-custom-types`

| 文件 | 标题 |
|------|------|
| `01-structs.md` | 结构体 |
| `02-struct-methods.md` | 方法语法（impl 块、方法、关联函数） |
| `03-enums.md` | 枚举 |
| `04-option.md` | Option\<T\> |
| `05-match.md` | 模式匹配（match、解构、守卫） |
| `06-if-let.md` | if let 与 while let |
| `07-practice.md` | 综合练习 |

---

### 第 05 章：标准库类型 `05-stdlib-types`

| 文件 | 标题 |
|------|------|
| `01-vectors.md` | Vec\<T\> |
| `02-strings.md` | String 与 &str |
| `03-hashmaps.md` | HashMap\<K, V\> |
| `04-practice.md` | 综合练习 |

---

### 第 06 章：类型系统 `06-type-system`

| 文件 | 标题 |
|------|------|
| `01-type-system-overview.md` | 类型系统概述 |
| `02-type-aliases.md` | 类型别名 |
| `03-type-conversion.md` | 类型转换（From/Into/as） |
| `04-newtype-pattern.md` | Newtype 模式 |
| `05-practice.md` | 综合练习 |

---

### 第 07 章：模块系统 `07-modules`

| 文件 | 标题 |
|------|------|
| `01-packages-crates.md` | 包与 Crate |
| `02-modules.md` | 模块与可见性（mod、pub） |
| `03-paths-use.md` | 路径与 use |
| `04-practice.md` | 综合练习 |

---

### 第 08 章：项目工程化 `08-engineering`

| 文件 | 标题 |
|------|------|
| `01-workspace.md` | 工作空间（Workspace 多 crate 大工程） |
| `02-features.md` | Features 与条件编译 |
| `03-build-scripts.md` | 构建脚本 build.rs |
| `04-doc-comments.md` | 文档注释与 doctest（///、cargo doc） |
| `05-practice.md` | 综合练习 |

---

### 第 09 章：错误处理 `09-error-handling`

| 文件 | 标题 |
|------|------|
| `01-panic.md` | panic! 与不可恢复错误 |
| `02-result.md` | Result\<T, E\> |
| `03-question-mark.md` | ? 运算符 |
| `04-when-to-panic.md` | 何时 panic，何时 Result |
| `05-practice.md` | 综合练习 |

---

### 第 10 章：泛型 `10-generics`

| 文件 | 标题 |
|------|------|
| `01-generics.md` | 泛型数据类型 |
| `02-practice.md` | 综合练习 |

---

### 第 11 章：Trait `11-traits`

| 文件 | 标题 |
|------|------|
| `01-traits.md` | Trait：定义共享行为 |
| `02-trait-bounds.md` | Trait 约束与 impl Trait |
| `03-common-traits.md` | 常用标准 Trait |
| `04-practice.md` | 综合练习 |

---

### 第 12 章：生命周期 `12-lifetimes`

| 文件 | 标题 |
|------|------|
| `01-what-are-lifetimes.md` | 为什么需要生命周期 |
| `02-lifetime-annotations.md` | 生命周期注解语法 |
| `03-struct-lifetimes.md` | 结构体中的生命周期 |
| `04-lifetime-elision.md` | 生命周期省略规则与 'static |
| `05-practice.md` | 综合练习 |

---

### 第 13 章：闭包 `13-closures`

| 文件 | 标题 |
|------|------|
| `01-closures.md` | 闭包（语法、捕获环境、Fn/FnMut/FnOnce） |
| `02-practice.md` | 综合练习 |

---

### 第 14 章：迭代器 `14-iterators`

| 文件 | 标题 |
|------|------|
| `01-iterators.md` | 迭代器（Iterator trait、惰性求值） |
| `02-iterator-adapters.md` | 迭代器适配器（map、filter、chain 等） |
| `03-consuming-iterators.md` | 消费迭代器（collect、fold、any 等） |
| `04-practice.md` | 综合练习 |

---

### 第 15 章：智能指针 `15-smart-pointers`

| 文件 | 标题 |
|------|------|
| `01-box.md` | Box\<T\> |
| `02-rc.md` | Rc\<T\> 引用计数 |
| `03-refcell.md` | RefCell\<T\> 内部可变性 |
| `04-arc-mutex.md` | Arc\<T\> 与 Mutex\<T\> |
| `05-practice.md` | 综合练习 |

---

### 第 16 章：并发编程 `16-concurrency`

| 文件 | 标题 |
|------|------|
| `01-threads.md` | 线程 |
| `02-channels.md` | 消息传递（mpsc） |
| `03-shared-state.md` | 共享状态 |
| `04-sync-send.md` | Send 与 Sync Trait |
| `05-practice.md` | 综合练习 |

---

### 第 17 章：测试 `17-testing`

| 文件 | 标题 |
|------|------|
| `01-unit-tests.md` | 单元测试 |
| `02-integration-tests.md` | 集成测试 |
| `03-test-control.md` | 控制测试运行 |
| `04-practice.md` | 综合练习 |

---

### 第 18 章：调试 `18-debugging`

| 文件 | 标题 |
|------|------|
| `01-dbg-macro.md` | dbg! 宏：快速打印调试 |
| `02-panic-reading.md` | 读懂 panic 与 backtrace |
| `03-ide-debugger.md` | IDE 调试器（rust-analyzer） |
| `04-logging.md` | 日志输出（log + env_logger） |
| `05-practice.md` | 综合练习 |

---

### 第 19 章：开发方法论 `19-methodology`

| 文件 | 标题 |
|------|------|
| `01-tdd.md` | 测试驱动开发（TDD） |
| `02-clippy-fmt.md` | Clippy 与 rustfmt：代码规范化 |
| `03-ci.md` | 持续集成配置（GitHub Actions / CI） |
| `04-profiling.md` | 性能分析与基准测试 |
| `05-dependencies.md` | 依赖管理与安全审计（cargo audit） |
| `06-practice.md` | 综合练习 |

---

### 第 19 章：不安全 Rust `19-unsafe`

| 文件 | 标题 |
|------|------|
| `01-unsafe.md` | unsafe Rust 概述 |
| `02-raw-pointers.md` | 裸指针（*const T、*mut T） |
| `03-unsafe-functions.md` | unsafe 函数与 Trait |
| `04-ffi-safety.md` | FFI 安全封装 |
| `05-practice.md` | 综合练习 |

---

### 第 20 章：高级特性 `20-advanced`

| 文件 | 标题 |
|------|------|
| `01-advanced-traits.md` | 高级 Trait（关联类型、运算符重载） |
| `02-advanced-types.md` | 高级类型（never 类型、动态大小类型） |
| `03-async-intro.md` | async/await 入门（Future、tokio 基础） |
| `04-practice.md` | 综合练习 |

---

### 第 21 章：模式匹配进阶 `21-advanced-patterns`

| 文件 | 标题 |
|------|------|
| `01-destructuring.md` | 解构（结构体、枚举、元组、引用） |
| `02-binding.md` | @ 绑定 |
| `03-guards.md` | 匹配守卫 |
| `04-or-patterns.md` | 多模式与 \| 语法 |
| `05-let-else.md` | let-else 与 if let 链 |
| `06-practice.md` | 综合练习 |

---

### 第 22 章：与 C 语言互操作 `22-c-interop`

| 文件 | 标题 |
|------|------|
| `01-ffi-basics.md` | FFI 基础（extern "C"、C 类型映射） |
| `02-bindgen.md` | 自动生成绑定：bindgen |
| `03-cbindgen.md` | 暴露 Rust 给 C：cbindgen |
| `04-practice.md` | 综合练习 |

---

### 第 23 章：嵌入式 Rust 基础 `23-embedded`

| 文件 | 标题 |
|------|------|
| `01-no-std.md` | #![no_std] 与裸机环境 |
| `02-memory-layout.md` | 内存布局与链接脚本 |
| `03-hal-pac.md` | PAC 与 HAL：硬件抽象层 |
| `04-embassy.md` | Embassy：异步嵌入式框架 |
| `05-practice.md` | 综合练习 |

---

### 第 24 章：综合项目 `24-projects`

| 文件 | 标题 |
|------|------|
| `01-minigrep.md` | 命令行工具 minigrep |
| `02-web-server.md` | 简易 Web Server |

---

## 统计

| 指标 | 数值 |
|------|------|
| 总章数 | 25 章 |
| 总文章数（不含 index） | 约 112 篇 |
| 已完成 | 5 篇（第 01-02 章） |
| 待编写 | 约 107 篇 |

## 文件命名约定

- `00-index.md`：章节首页，不出现在文章列表
- `NN-slug.md`：普通文章，按字母序决定侧边栏顺序
- 综合练习统一命名为该章最后一个编号

## 编写优先级建议

1. 第 02 章：基础语法（学习其他所有章的前提）
2. 第 03 章：所有权系统（Rust 核心，越早讲越好）
3. 第 04 章：自定义数据类型
4. 后续章节按序推进
