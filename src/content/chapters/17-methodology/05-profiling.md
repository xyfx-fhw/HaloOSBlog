---
title: "性能分析与基准测试"
description: "学会用 criterion 编写基准测试，用 flamegraph 定位热点，建立量化驱动的性能优化习惯。"
difficulty: beginner
estimatedTime: 20
keywords: ["性能分析", "基准测试", "criterion", "flamegraph", "perf", "profiling"]
---

# 基准测试

"这段代码应该更快"——在没有测量之前，这只是猜测。性能优化必须从**测量**开始，测量要有**可比较的基准**。基准测试（Benchmark）就是对代码性能建立可复现、可量化的测量标准。

## 先测量再优化

**过早优化是万恶之源。**（Donald Knuth）

在没有性能数据之前动手优化，有两个常见后果：

1. **优化了不重要的地方**：花了一天把某个函数优化了 30%，但那个函数只占总运行时间的 0.1%
2. **让代码变复杂**：为了性能牺牲了可读性，结果实际收益几乎为零

正确的流程：

```text
① 确认有性能问题（用户反馈、监控数据）
② 测量（profiling），找出真正的热点（通常 80% 的时间在 20% 的代码）
③ 对热点建立基准测试
④ 优化热点
⑤ 重新运行基准测试，确认优化有效
⑥ 运行功能测试，确认没有引入 bug
```

> Rust 的编译器优化（特别是 release 模式）本身就很强。很多"手动优化"在 release 模式下实际上没有效果，因为编译器已经做了。永远在 `--release` 模式下测量性能。

## cargo bench 与 criterion

Rust 标准库内置了 `#[bench]` 属性（nightly only），但生产中更常用 **criterion** 这个第三方 benchmark 框架，它提供：

- 统计上更可靠的测量（多次采样，过滤噪音）
- 自动检测性能退化（与上次运行对比）
- HTML 报告，包含可视化图表
- 稳定版 Rust 即可使用

**在项目中添加 criterion：**

```toml
# Cargo.toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

**基准测试文件结构（`benches/my_benchmark.rs`）：**

```rust runnable
# use criterion::{black_box, criterion_group, criterion_main, Criterion};
# fn fibonacci(n: u64) -> u64 {
#     match n {
#         0 => 1,
#         1 => 1,
#         n => fibonacci(n - 1) + fibonacci(n - 2),
#     }
# }
fn bench_fibonacci(c: &mut Criterion) {
    // c.bench_function 注册一个基准测试
    c.bench_function("fibonacci 20", |b| {
        // b.iter 是实际测量的循环
        b.iter(|| fibonacci(black_box(20)))
        //                   ^^^^^^^^^ black_box 防止编译器优化掉被测代码
    });
}
# criterion_group!(benches, bench_fibonacci);
# criterion_main!(benches);
```

**运行基准测试：**

```bash
cargo bench                          # 运行所有基准测试
cargo bench -- fibonacci             # 只运行名称包含 "fibonacci" 的测试
cargo bench -- --save-baseline main  # 保存当前结果为基准线
cargo bench -- --baseline main       # 与之前保存的基准线对比
```

## 设计有意义的 benchmark

基准测试写错了会给出误导性的数据，有几个常见陷阱：

**陷阱一：让编译器优化掉被测代码**

如果被测函数的结果没有被使用，编译器可能直接删掉整个计算。使用 `black_box()` 告诉编译器"这个值我会用，不要优化掉"。

**陷阱二：测量了初始化时间**

如果被测代码需要初始化（比如创建大型数据结构），应该把初始化放在 `iter` 循环外：

```rust runnable
# use criterion::{black_box, Criterion};
fn bench_sort(c: &mut Criterion) {
    // 初始化放在 iter 外
    let data: Vec<i32> = (0..1000).rev().collect();

    c.bench_function("sort 1000 elements", |b| {
        b.iter(|| {
            let mut v = data.clone(); // clone 是被测成本的一部分（如果你想）
            v.sort();
            black_box(v)
        })
    });
}
```

**陷阱三：数据量太小**

如果被测操作本身只需要几纳秒，测量误差会淹没真实结果。选择有代表性的数据量（通常与生产环境接近）。

# 性能分析

基准测试告诉你"代码快了还是慢了"，但不告诉你"慢在哪里"。**性能分析（Profiling）** 工具可以记录程序运行时每个函数花了多少时间，帮你定位热点。

## perf 与 flamegraph

**perf**（Linux）是最常用的性能采样工具，它以固定频率对程序进行快照，记录当时正在执行的函数。**flamegraph** 把 perf 的采样结果可视化成一张火焰图，让热点一目了然。

**基本工作流（Linux）：**

```bash
# 1. 编译 release 版本并保留调试符号
cargo build --release
# 在 Cargo.toml 中添加：
# [profile.release]
# debug = true

# 2. 用 perf 采样运行
perf record -g ./target/release/my_app

# 3. 生成火焰图
perf script | stackcollapse-perf | flamegraph > flamegraph.svg

# 或者用 cargo-flamegraph（封装了上述步骤）
cargo install flamegraph
cargo flamegraph --bin my_app
```

**在 macOS 上：** 使用 Instruments（Xcode 自带）或 `cargo-instruments`：

```bash
cargo install cargo-instruments
cargo instruments -t time --bin my_app
```

## 读懂火焰图

火焰图的阅读方式：

```text
┌──────────────────────────────────────────────────┐
│                  main                            │  ← 最底层：程序入口
├──────────────┬───────────────────────────────────┤
│  parse_config│        process_data               │  ← 调用的函数
├──────────────┴──────────┬────────────────────────┤
│                         │   sort_records         │  ← 热点！宽度大 = 时间多
│                         ├────────────────────────┤
│                         │   HashMap::insert      │
└─────────────────────────┴────────────────────────┘
  横轴 = 时间占比（越宽 = 占用时间越多）
  纵轴 = 调用栈深度（越高 = 调用层数越深）
```

**关键原则：**
- 找**最宽的"平顶"函数**——这是热点，花了最多时间，没有继续向下调用
- 不要被调用栈深的函数迷惑——高度只代表调用层数，不代表时间多

## 定位热点的工作流

```text
① 确认性能问题确实存在（用基准测试或生产监控数据）
    ↓
② 用 flamegraph 找出最宽的热点函数
    ↓
③ 分析热点函数：是算法复杂度问题、内存分配问题还是 IO 等待？
    ↓
④ 针对性优化：
   - 算法问题 → 换数据结构或算法
   - 内存分配过多 → 预分配、复用 buffer、避免不必要 clone
   - IO 等待 → 异步/并发、批处理、缓存
    ↓
⑤ 重新运行基准测试，量化改善幅度
    ↓
⑥ 检查功能测试，确认没有引入 bug
    ↓
⑦ 如果改善不够，回到②
```

## 常见性能瓶颈模式

Rust 程序中反复出现的性能问题：

| 模式 | 表现 | 解决思路 |
|------|------|---------|
| **频繁小内存分配** | 火焰图中大量 `alloc` / `malloc` | 预分配 `Vec::with_capacity`；使用 arena 分配器 |
| **不必要的 clone** | 数据被复制多次 | 检查所有权，能借用就不克隆 |
| **低效的字符串处理** | 大量 `String` 拼接 | 用 `write!` 到 buffer；或 `join` |
| **HashMap 哈希函数慢** | 大量 HashMap 操作占用时间 | 换用 `FxHashMap` / `AHashMap` 等更快的哈希实现 |
| **迭代器中的条件分支** | 循环内有大量 if/match | 尝试提取不变条件到循环外；SIMD 优化 |
| **同步 IO 阻塞** | 线程长时间等待 IO | 换用异步 IO（tokio/async-std） |

> **性能优化的黄金法则**：优化之后，测量必须能证明改善。如果改善不显著，回滚——复杂的代码是维护成本，不应该为不明显的收益付出这个代价。

# 练习题

## 基准测试测验

```quiz single
Q: criterion 基准测试中 `black_box()` 的作用是什么？
- 让测试结果显示为黑色，更易阅读
- 将多次运行结果取平均值
+ 防止编译器将被测代码优化掉，确保实际执行了计算
- 隐藏函数内部实现，保护代码安全
E: 编译器非常聪明，如果它发现计算结果没有被使用，可能直接删掉整段代码，导致基准测试测出来是 0 纳秒。black_box 告诉编译器"这个值在外部有用"，阻止这种优化。
```

```quiz single
Q: 为什么性能基准测试必须在 `--release` 模式下运行？
+ debug 模式包含大量调试检查（溢出检测、断言等），性能比 release 低 10-100 倍，测出来的数据不能反映实际情况
- 这只是约定俗成，没有实质影响
- release 模式只能运行基准测试
- release 模式运行更稳定，不会崩溃
E: Rust 的 debug 和 release 模式性能差异极大。debug 模式有整数溢出检查、没有内联优化等，专门为调试设计。生产环境跑 release，所以性能测量也必须在 release 模式下才有意义。
```

## Profiling 测验

```quiz single
Q: 火焰图中，最应该优先优化的是哪种函数？
- 标准库内部的函数
- 名称包含 "unsafe" 的函数
- 调用栈最深的函数（图中最高的部分）
+ 最宽的"平顶"函数（没有子调用、占用时间最多）
E: 宽度代表时间占比，平顶代表这里是实际消耗时间的地方（而不是继续向下调用）。最宽的平顶就是热点，优化它收益最大。调用栈深度只代表嵌套层数，与时间消耗无关。
```

```quiz multi
Q: 下列哪些是 Rust 程序中常见的性能瓶颈？
+ HashMap 使用默认的 SipHash（安全但较慢）
+ 不必要的 clone()，导致数据被多次复制
- 定义了太多 struct
+ 循环内频繁的小内存分配（Vec 未预分配）
- 使用了泛型（编译时单态化，运行时无额外开销）
E: 泛型在 Rust 中是零成本抽象，编译后和手写具体类型一样快。定义 struct 不影响性能。内存分配、clone 和哈希函数速度是真实的热点来源。
```
