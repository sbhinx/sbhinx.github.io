---
title: CAN 总线协议快速入门
tags:
  - 嵌入式
  - 汽车电子
  - 通信协议
date: 2026-09-29
---

## 1. 什么是 CAN 总线？

**CAN (Controller Area Network)** 是一种广泛应用于汽车与工控领域的强抗干扰串行通信总线。

> [!TIP]
> CAN 总线采用**双绞线差分信号**传输（CAN_H 与 CAN_L），具有极强的抗共模干扰能力和自动冲突仲裁机制。

---

## 2. 差分电平与隐性显性

| 逻辑状态 | 信号线状态 | 差分电压 $(V_{diff} = V_{CAN\_H} - V_{CAN\_L})$ |
| :--- | :--- | :--- |
| **显性电平 (Dominant)** | 逻辑 `0` | 约 $2.0V \sim 3.0V$ （通常为 $2.5V$ 偏移） |
| **隐性电平 (Recessive)** | 逻辑 `1` | 约 $0V$（两者电平接近 $2.5V$） |

> [!WARNING]
> 总线上只要有一个节点发送**显性 (0)**，整个总线即呈现显性。显性电平拥有绝对优先权！

---

## 3. 标准数据帧格式代码示例

```c
typedef struct {
    uint32_t id;       /* 报文标准 ID: 11-bit 或 扩展 ID: 29-bit */
    uint8_t  dlc;      /* 数据长度码 (Data Length Code: 0~8 bytes) */
    uint8_t  data[8];   /* 数据载荷 */
    uint8_t  ide;      /* 0: 标准帧, 1: 扩展帧 */
    uint8_t  rtr;      /* 0: 数据帧, 1: 远程帧 */
} CanMessage_t;

void send_can_frame(CanMessage_t *msg) {
    /* 硬件发送邮箱填充逻辑 */
}
```

---

返回：[[index|返回主页]]
