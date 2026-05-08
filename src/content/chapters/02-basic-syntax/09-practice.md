---
title: "综合练习"
description: "综合运用 Rust 基础语法，完成 5 道经典算法题，涵盖循环、函数与递归。"
difficulty: intermediate
estimatedTime: 60
keywords: ["练习", "算法", "斐波那契", "质数", "递归", "排序", "函数"]
---

## 练习一：斐波那契数列

斐波那契数列从 0 和 1 开始，后续每项等于前两项之和：0, 1, 1, 2, 3, 5, 8, ...

打印数列的**前 10 项**，每行一个数字。

> **提示**：用两个变量 `a` 和 `b` 分别记录当前项和下一项。每轮循环打印 `a`，然后同时更新：新的 `a = b`，新的 `b = 原来的 a + b`。

```rust editable
fn main() {
    // TODO：打印斐波那契数列的前 10 项
}
```

```expected
0
1
1
2
3
5
8
13
21
34
```

## 练习二：质数判断

实现函数 `is_prime`，判断一个数是否为**质数**（只能被 1 和自身整除的大于 1 的整数），然后打印 2 到 50 之间所有质数，空格分隔。

> **提示**：检查 `i * i <= n` 即可停止，不需要遍历到 `n - 1`。如果 `n % i == 0`，则 `n` 不是质数。

```rust editable
fn is_prime(n: u64) -> bool {
    // TODO
    false
}

fn main() {
    for n in 2..=50 {
        if is_prime(n) {
            print!("{} ", n);
        }
    }
    println!();
}
```

```expected
2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 
```

## 练习三：数字反转

实现函数 `reverse_number`，将一个正整数各位数字反转后返回：

- 12345 → 54321
- 1000 → 1（前导零自动省略）
- 7 → 7

> **提示**：每轮取出 `n` 的最后一位（`n % 10`），追加到结果（`result = result * 10 + 个位`），然后 `n /= 10`，直到 `n == 0`。

```rust editable
fn reverse_number(mut n: u64) -> u64 {
    let mut result: u64 = 0;
    // TODO
    result
}

fn main() {
    println!("{}", reverse_number(12345)); // 54321
    println!("{}", reverse_number(1000));  // 1
    println!("{}", reverse_number(7));     // 7
    println!("{}", reverse_number(123));   // 321
}
```

```expected
54321
1
7
321
```

## 练习四：汉诺塔

三根柱子 A、B、C，初始时 A 上有 n 个圆盘（从底到顶从大到小）。每次只能移动一个圆盘，且不允许将大盘放在小盘上面。把所有圆盘从 A 移到 C，打印每一步操作。

> **提示**：递归拆分——把 `n` 个盘从 `from` 移到 `to`，等价于：
> 1. 把上面 `n-1` 个盘从 `from` 移到 `aux`（借助 `to`）
> 2. 把最大盘从 `from` 移到 `to`（打印这一步）
> 3. 把 `n-1` 个盘从 `aux` 移到 `to`（借助 `from`）
>
> 当 `n == 1` 时直接打印移动，不再递归。

```rust editable
fn hanoi(n: u32, from: char, to: char, aux: char) {
    // TODO
}

fn main() {
    hanoi(3, 'A', 'C', 'B');
}
```

```expected
将盘 1 从 A 移到 C
将盘 2 从 A 移到 B
将盘 1 从 C 移到 B
将盘 3 从 A 移到 C
将盘 1 从 B 移到 A
将盘 2 从 B 移到 C
将盘 1 从 A 移到 C
```

## 练习五：冒泡排序

对数组 `[64, 34, 25, 12, 22, 11, 90]` 实现**冒泡排序**，打印排序后的结果。

冒泡排序：多趟遍历数组，每趟将相邻两个顺序错误的元素交换，每趟结束后最大值"冒泡"到末尾。经过 `n-1` 趟后排序完成。

> **提示**：交换数组中的两个元素可以用 `arr.swap(i, j)`，也可以用临时变量：
>
> ```rust
> let temp = arr[i];
> arr[i] = arr[j];
> arr[j] = temp;
> ```
>
> 外层循环控制趟数（0..n-1），内层循环控制比较范围（0..n-1-i）。

```rust editable
fn main() {
    let mut arr = [64, 34, 25, 12, 22, 11, 90];
    let n = arr.len();

    // TODO：实现冒泡排序

    println!("{:?}", arr);
}
```

```expected
[11, 12, 22, 25, 34, 64, 90]
```
