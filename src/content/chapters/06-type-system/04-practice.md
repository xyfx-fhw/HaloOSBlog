---
title: "综合练习"
description: "综合检验对类型推导、类型铸造、类型别名的理解，通过完整的数据分析项目掌握类型系统的核心概念。"
difficulty: intermediate
estimatedTime: 30
keywords: ["综合练习", "类型系统", "推导", "铸造", "别名"]
---

# 代码判断题

## 题目 1：类型推导的跨行推导

```rust
fn main() {
    let mut collection = Vec::new();
    collection.push(42);
    collection.push(100u32);
}
```

```quiz single
Q: 这段代码能编译吗？
- 能，编译器会自动转换
+ 不能，42 推导为 i32，而 100u32 是 u32，类型冲突
- 能，两者都会转为 i32
- 不能，Vec::new() 需要类型标注
E: 第一个 push 确定了元素类型是 i32，第二个 push 的 u32 不匹配，导致编译错误。
```

## 题目 2：类型转换中的数据丧失

```rust
fn main() {
    let f: f32 = 1000.5;
    let i = f as i32;
    println!("{}", i);
}
```

```quiz single
Q: 输出是什么？
- 1000.5
+ 1000
- 1001
- 编译错误
E: 浮点转整数时舍弃小数部分（向 0 取整）。1000.5 转为 1000。
```

## 题目 3：整数溢出的转换

```rust
fn main() {
    let x = 256u16;
    let y = x as u8;
    println!("{}", y);
}
```

```quiz single
Q: 输出是什么？
- 256
+ 0
- 255
- 编译错误
E: 256 = 0x100（2 个字节）。转为 u8 时只保留低 8 位：0x00 = 0。
```

## 题目 4：类型别名的类型安全

```rust
type UserId = u32;
type ProductId = u32;

fn main() {
    let user: UserId = 1;
    let product: ProductId = 2;
    println!("{}", user + product);
}
```

```quiz single
Q: 这段代码能编译吗？
+ 能，别名不提供类型安全
- 不能，UserId 和 ProductId 是不同类型
- 不能，需要显式转换
- 需要实现 From trait
E: 类型别名只是现有类型的新名字，不创建新类型。UserId 和 ProductId 本质上都是 u32，完全兼容。
```

## 题目 5：From trait 和 Into trait

```rust
use std::convert::From;

#[derive(Debug)]
struct Point(i32, i32);

impl From<(i32, i32)> for Point {
    fn from((x, y): (i32, i32)) -> Self {
        Point(x, y)
    }
}

fn main() {
    let p1 = Point::from((1, 2));
    let p2: Point = (3, 4).into();
}
```

```quiz single
Q: 这段代码能编译吗？
+ 能，from 的实现自动提供 into
- 不能，必须显式实现 Into
- 不能，类型标注有问题
- 需要导入 Into trait
E: 实现 From<T> 会自动获得 Into。所以 (3, 4).into() 能正常工作。
```

---

# 编程练习

## 综合项目：数据分析系统

实现一个简单的数据分析系统，综合应用**类型推导**、**类型铸造**和**类型别名**的知识。

该系统需要：
1. 使用**类型别名**定义复杂的数据结构
2. 通过**类型推导**自动确定集合的元素类型
3. 使用**类型铸造**（as）进行数据格式转换

```rust editable
use std::collections::HashMap;

// TODO: 定义类型别名
// - Score 表示整数分数（i32）
// - ScoreMap 表示 HashMap<String, i32>（学生名字 -> 分数）
// - Percentage 表示浮点百分比（f64）



fn main() {
    // 创建一个空的 ScoreMap，通过 insert 让编译器推导类型
    let mut scores: ScoreMap = HashMap::new();
    scores.insert("Alice".to_string(), 88);
    scores.insert("Bob".to_string(), 92);
    scores.insert("Charlie".to_string(), 85);
    
    println!("=== 成绩统计 ===");
    for (name, score) in &scores {
        println!("{}: {}", name, score);
    }
    
    // 计算平均分
    let total: Score = scores.values().sum();
    let count = scores.len() as f64;
    let average = total as f64 / count;  // 类型铸造：i32 -> f64
    
    println!("\n总分：{}", total);
    println!("参加人数：{}", scores.len());
    println!("平均分：{:.2}", average);
    
    // 计算及格人数和及格率
    let pass_count = scores.values().filter(|&&score| score >= 60).count();
    let pass_rate = pass_count as f64 / count;  // 类型铸造：usize -> f64
    let pass_percentage: Percentage = pass_rate * 100.0;
    
    println!("及格人数：{}", pass_count);
    println!("及格率：{:.2}%", pass_percentage);
    
    // 找出最高分和最低分
    if let (Some(&max_score), Some(&min_score)) = (scores.values().max(), scores.values().min()) {
        let score_range = (max_score - min_score) as f64;  // 类型铸造：i32 -> f64
        println!("\n最高分：{}", max_score);
        println!("最低分：{}", min_score);
        println!("分数范围：{}", score_range);
    }
}
```

```expected
=== 成绩统计 ===
Alice: 88
Bob: 92
Charlie: 85

总分：265
参加人数：3
平均分：88.33
及格人数：3
及格率：100.00%

最高分：92
最低分：85
分数范围：7
```
