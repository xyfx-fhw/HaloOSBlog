---
title: "示例：今天是星期几？"
description: "用一个完整的日期计算程序感受 Rust 编程的样子，看懂大致逻辑，动手修改一个日期，无需先掌握语法。"
difficulty: beginner
estimatedTime: 15
keywords: ["初探", "第一个程序", "日期计算", "星期几"]
---

# 代码初体验

在正式学习语法之前，我们先来跑一个真正"有用"的程序，感受一下 Rust 代码长什么样。

**你的目标很简单**：输入一个日期（年/月/日），程序告诉你那天是星期几。

你可以尝试看一下下面的代码，但不需要现在看懂每一行——就像第一次坐飞机，你不必先学会造飞机。先上去飞一圈，感受一下。

## 完整程序

下面是一个能运行的完整程序。点击"运行"看看结果，然后我们再一起扫一眼代码结构。

```rust runnable
// 判断是否是闰年
fn is_leap_year(year: u32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

// 返回某月有多少天
fn days_in_month(year: u32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11              => 30,
        2 => if is_leap_year(year) { 29 } else { 28 },
        _  => 0,
    }
}

// 计算星期几
// 基准：1583年1月1日是星期六（格里历正式实施的第一年元旦）
fn day_of_week(year: u32, month: u32, day: u32) -> &'static str {
    let weekdays = ["日", "一", "二", "三", "四", "五", "六"];

    let mut total_days: u32 = 0;

    // 累加 1583 年到目标年之前的天数
    for y in 1583..year {
        total_days += if is_leap_year(y) { 366 } else { 365 };
    }
    // 累加目标年内各月的天数
    for m in 1..month {
        total_days += days_in_month(year, m);
    }
    // 加上当月已过的天数（第1天不额外加）
    total_days += day - 1;

    // 1583-01-01 是星期六（索引 6），推算目标日期
    let index = (total_days + 6) % 7;
    weekdays[index as usize]
}

fn main() {
    // 几个有意思的日期
    let dates = [
        (1583,  1,  1, "1583年元旦（格里历元年）"),
        (1776,  7,  4, "美国独立宣言签署"),
        (1969,  7, 20, "阿波罗11号登月"),
        (2008,  8,  8, "北京奥运会开幕"),
        (2024,  1,  1, "2024年元旦"),
    ];

    println!("{:<24} 星期", "日期");
    println!("{}", "─".repeat(30));

    for (year, month, day, label) in dates {
        let w = day_of_week(year, month, day);
        println!("{:<24} 星期{}", label, w);
    }
}
```

> **为什么代码里要以 1583 年为基准？**
>
> 1582 年之前，欧洲使用的是**儒略历**（Julian calendar），它的闰年规则比较简单（每 4 年一闰），但长期积累了误差——到 16 世纪末，历法已经比天文实际多走了约 10 天，导致春分节气漂移，影响复活节的计算。
>
> 1582 年，罗马教皇格里高利十三世推行**格里历**（Gregorian calendar，即今天全球通用的公历）：规定整百年只有被 400 整除才算闰年（如 1600、2000 是闰年，而 1700、1800、1900 不是）。为了弥补历史误差，改历时**直接删掉了 10 天**——1582 年 10 月 4 日（星期四）的第二天变成了 10 月 15 日（星期五），中间 10 天在历史上消失了。
>
> 本程序使用格里历规则，从格里历正式生效的 **1583 年 1 月 1 日**起均可正确计算。

## 代码结构速览

不用现在记住语法细节，只看**整体骨架**：

```text
fn is_leap_year(...)  → 一个函数：判断闰年
fn days_in_month(...) → 一个函数：返回月份天数
fn day_of_week(...)   → 一个函数：返回"一"/"二"/...
fn main()             → 程序入口：调用上面的函数，打印结果
```

你能注意到的 Rust 特点：

- `fn` 开头定义函数（function 的缩写）
- `//` 是注释，编译器忽略
- `match` 类似其他语言的 `switch`，但更强大
- `for y in 1583..year` 是循环，从 1583 数到 year
- `let` 声明变量，`let mut` 声明可修改的变量

> 这些语法在后续章节里都会逐一讲清楚。现在只需要知道**代码可以拆成一个个小函数，每个函数只做一件事**——这是好代码的基本样子。

# 你来试试

## 算算你的生日

把下面代码里的日期改成你的生日或者今天，运行看看是哪天。

```rust editable
fn is_leap_year(year: u32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn days_in_month(year: u32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11              => 30,
        2 => if is_leap_year(year) { 29 } else { 28 },
        _  => 0,
    }
}

fn day_of_week(year: u32, month: u32, day: u32) -> &'static str {
    let weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    let mut total_days: u32 = 0;
    for y in 1583..year {
        total_days += if is_leap_year(y) { 366 } else { 365 };
    }
    for m in 1..month {
        total_days += days_in_month(year, m);
    }
    total_days += day - 1;
    weekdays[((total_days + 6) % 7) as usize]
}

fn main() {
    // 把这里改成你的生日 ↓
    let (year, month, day) = (2024, 1, 1);

    println!(
        "{}年{}月{}日 是 星期{}",
        year, month, day,
        day_of_week(year, month, day)
    );
}
```

用手机日历验证一下——结果对吗？

> **适用范围**：1583 年及之后的日期均可使用。修改 `(year, month, day) = (...)` 那一行即可。
