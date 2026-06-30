---
title: "控制测试运行"
description: "学会通过命令行参数控制 cargo test 的行为：并行与串行、查看输出、按名称过滤测试、忽略耗时测试。"
difficulty: beginner
estimatedTime: 20
keywords: ["cargo test", "测试过滤", "并行测试", "ignore", "show-output", "test-threads"]
---

# cargo test 的参数体系

`cargo test` 的命令行参数分为**两段**，用 `--` 分隔：

```bash
cargo test [cargo 自身的参数] -- [传递给测试二进制的参数]
```

- `--` **之前**：控制 Cargo 编译行为（如 `--release`、`--package`）
- `--` **之后**：控制测试程序的运行方式（如 `--test-threads`、`--show-output`）

```bash
# -- 之前：Cargo 自身的参数
cargo test --release               # 以 release 模式编译后运行测试
cargo test --package my_lib        # 只测试指定的包（工作区场景）
cargo test --help                  # 查看 Cargo 层的选项

# -- 之后：传给测试二进制的参数
cargo test -- --test-threads=1     # 串行运行测试
cargo test -- --show-output        # 显示通过测试的 println! 输出
cargo test -- --ignored            # 只运行被 #[ignore] 标记的测试
cargo test -- --help               # 查看测试二进制层的所有选项

# 两段组合使用
cargo test --release -- --test-threads=1   # release 模式 + 串行运行
cargo test my_func -- --show-output        # 只运行名称含 my_func 的测试，并显示输出
```

这两段的参数各自独立，不要混淆。

# 控制测试运行方式

## 并行与串行

默认情况下，Rust 会**并行运行**所有测试（多线程），以加快速度。

但并行运行有一个前提：**测试之间不能共享状态**。如果两个测试都读写同一个文件，就可能相互干扰，导致莫名其妙的失败。

遇到这种情况，可以把线程数限制为 1，让测试**串行执行**：

```bash
cargo test -- --test-threads=1
```

这样慢一些，但测试结果稳定可靠，适合调试相互干扰的测试。

## 显示 println! 的输出

默认情况下，**通过的测试**中的 `println!` 输出会被 Rust 截获，不显示在终端，只有失败的测试才会显示标准输出。

```rust runnable
fn double(x: i32) -> i32 {
    println!("double({}) 被调用了", x);  // 正常运行时会看到，测试通过时看不到
    x * 2
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_double() {
        let result = double(5);
        assert_eq!(10, result);
    }
}
```

运行 `cargo test`，因为测试通过，你**看不到** `println!` 的内容。

如果你想在测试通过时也看到输出，加上 `--show-output`：

```bash
cargo test -- --show-output
```

这在调试时很有用——你可以在函数里加几行 `println!` 来观察中间状态，而不用担心干扰测试结果。

## 按名称过滤：只运行部分测试

有时你只想运行某一个或某一类测试，不需要跑所有测试：

假设有三个测试：

```rust runnable
pub fn add_two(a: i32) -> i32 {
    a + 2
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_two_and_two() {
        assert_eq!(4, add_two(2));
    }

    #[test]
    fn add_three_and_two() {
        assert_eq!(5, add_two(3));
    }

    #[test]
    fn one_hundred() {
        assert_eq!(102, add_two(100));
    }
}
```

**只运行一个测试**——传入完整函数名：

```bash
cargo test one_hundred
```

```text
running 1 test
test tests::one_hundred ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 2 filtered out
```

**运行名称包含某个词的所有测试**——传入部分名称：

```bash
cargo test add
```

```text
running 2 tests
test tests::add_two_and_two ... ok
test tests::add_three_and_two ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 1 filtered out
```

`2 filtered out` 说明有 2 个测试被过滤掉了（这里只有 1 个，但样例展示了概念）。

> 测试名称包含**模块路径**，因此 `cargo test tests` 可以运行 `tests` 模块里的所有测试。

## 忽略耗时测试

有些测试运行时间很长（比如访问网络、操作大文件），日常开发中不想每次都跑。用 `#[ignore]` 标记它们：

```rust runnable
#[cfg(test)]
mod tests {
    #[test]
    fn quick_test() {
        assert_eq!(2 + 2, 4);  // 瞬间完成
    }

    #[test]
    #[ignore]
    fn slow_test() {
        // 假设这里需要跑很久……
        assert!(true);
    }
}
```

运行 `cargo test`，`slow_test` 会显示为 `ignored`，不被执行：

```text
running 2 tests
test tests::slow_test ... ignored
test tests::quick_test ... ok

test result: ok. 1 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out
```

当你需要专门运行被忽略的测试（比如 CI 环境），用：

```bash
cargo test -- --ignored
```

这样只运行带 `#[ignore]` 的测试，方便单独跑耗时测试套件。

## 命令速查

| 目标 | 命令 |
|------|------|
| 运行所有测试 | `cargo test` |
| 串行运行（单线程） | `cargo test -- --test-threads=1` |
| 显示通过测试的输出 | `cargo test -- --show-output` |
| 只运行名称匹配的测试 | `cargo test <关键词>` |
| 只运行被忽略的测试 | `cargo test -- --ignored` |
| 运行所有（含被忽略的） | `cargo test -- --include-ignored` |

# 练习题

## 测验

```quiz single
Q: cargo test -- --test-threads=1 的作用是什么？
- 让测试编译得更快
- 只运行第一个测试
+ 让所有测试串行（按顺序一个接一个）运行，不并行
- 限制测试最多运行 1 秒
E: 默认 cargo test 并行运行测试。传入 --test-threads=1 把线程数设为 1，测试就会串行执行，适合测试之间有共享状态（如共享文件）的情况。
```

```quiz single
Q: 通过的测试中 println! 的输出默认是？
- 显示在终端
+ 被截获，不显示
- 写入日志文件
- 触发编译警告
E: 默认情况下，Rust 测试框架会截获通过测试的标准输出，终端不会看到。加上 -- --show-output 才能让通过测试的输出也显示出来。
```

```quiz single
Q: 假设有测试函数 fn test_add()、fn test_multiply()、fn benchmark_sort()，执行 cargo test test 会运行哪些测试？
+ test_add 和 test_multiply
- 只有 test_add
- 全部三个
- 一个都不运行
E: cargo test 后跟关键词时，会运行所有名称中包含该关键词的测试。test_add 和 test_multiply 都包含 "test"，而 benchmark_sort 不包含，所以只运行前两个。
```

```quiz single
Q: #[ignore] 属性的典型使用场景是？
- 临时禁用有 bug 的测试，让 CI 跑过
- 测试函数不需要 #[test] 时作为替代
+ 标记运行时间很长的测试，日常跑 cargo test 时跳过
- 标记只能在特定操作系统运行的测试
E: #[ignore] 用于标记耗时的测试（如网络请求、大文件操作），让日常的 cargo test 快速完成。需要专门运行这些测试时，使用 cargo test -- --ignored。
```

```quiz single
Q: 下面哪条命令只运行函数名里含有 "add" 的测试？
- cargo test --filter add
- cargo test --only add
+ cargo test add
- cargo test -- --name add
E: cargo test 直接在命令后面跟关键词即可过滤测试名称。写法是 cargo test <关键词>，不需要任何额外标志。
```
