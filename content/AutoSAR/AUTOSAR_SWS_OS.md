---
title: AUTOSAR_SWS_OS 规范核心解析
tags:
  - 嵌入式
  - C语言
  - AUTOSAR
date: 2026-10-01
---

> [!NOTE] 规范来源
> 本章节主要参考 AUTOSAR 官方文档 **Specification of Operating System (SWS_OS)**，对应标准版本：`4.3.1`。

---

## 概述

### 1. AUTOSAR OS 核心功能属性

- **静态配置与裁剪 (Statically configured and scaled)**  
  系统运行所需的所有对象（任务、中断、堆栈空间等）必须在编译前全部静态定义且分配内存，运行时不支持动态创建或销毁对象。不需要的特性可以在生成阶段彻底裁剪掉，以实现最小的资源占用。

- **实时性能分析友好 (Amenable to reasoning of real-time performance)**  
  面向硬实时系统设计，其上下文切换时间、最坏情况执行时间（Worst-Case Execution Time, WCET）均要求有高度的确定性，以便进行调度分析和时序收敛验证（例如 10ms 的 Task 确保其实际执行时间不超过 10ms）。

- **基于优先级的调度策略 (Priority-based scheduling policy)**  
  支持基于静态优先级的抢占式 / 非抢占式（Full-preemptive / Non-preemptive）调度算法，兼顾优先级打断和独占 CPU 模式。

- **运行时保护功能 (Protective functions at runtime)**  
  具备安全屏障机制，在内存保护单元（MPU）和硬件定时器辅助下，提供内存保护（防止内存越界与非法访问）和时间保护（监控执行预算与超时）。

- **极简资源开销，兼容低端 MCU (Hostable on low-end controllers)**  
  代码体积与 RAM 占用极小，无需外挂扩展内存即可在紧凑型、低算力的片上 MCU（如 16位 / 32位微控制器）上独立运行。

---

### 2. 应用领域与基石

专用于大部分车载 ECU（动力域控制器、车身域控制器等），**注意通讯和信息娱乐系统除外**（后者通常采用 Linux、Android、QNX 等富操作系统，通过操作系统抽象层与 AUTOSAR 组件交互）。

AUTOSAR OS 以 **OSEK/VDX OS 2.2.3** 规范为技术基石，并针对汽车功能安全与多核架构做了扩展与约束。

---

## OS 功能核心描述 (CoreOS)

### 1. 背景与继承自 OSEK 的特性

AUTOSAR OS 的核心功能深度继承自 OSEK OS，具备以下基础能力：
- 基于固定优先级的调度机制，仅处理优先级高于任务的中断；
- 针对 OS 服务的不当调用提供防护措施；
- 通过 `StartOS()` 和 `StartupHook()` 实现标准启动接口；
- 通过 `ShutdownOS()` 和 `ShutdownHook()` 实现安全关闭接口。

> [!TIP] 规范标识符说明
> 在 AUTOSAR 规范体系中，形如 **`[SWS_Os_00242]`** 的方括号标签，是汽车电子软件开发中极为核心的概念——**“规范级需求唯一标识符”（Requirement Unique Identifier）**。无论规范版本如何升级，该编号**终身绑定该条规则**，永不重复复用。

---

### 2. AUTOSAR 对 OSEK API 的核心变更与约束

#### 2.1 在特定可扩展性等级禁用 Alarm Callback
- 在 OSEK 中，Alarm 到期允许直接调用一个 C 语言回调函数；
- 在 AUTOSAR 的 **SC2、SC3、SC4** 等级中，**严禁使用 Alarm Callback**。因为回调函数直接运行在中断上下文，极难做内存隔离和时间监控；它**仅被允许存在于无保护的 SC1** 中。

> [!NOTE] AutoSAR 的可扩展性等级 (Scalability Class, SC)
> 用来定义 OS 支持的功能子集，基于老 OSEK 的 Conformance Class 扩展而来：
> 
> | 可扩展性等级 (SC) | 内存保护 (Memory) | 时间保护 (Timing) | 核心特性说明 |
> | :---: | :---: | :---: | :--- |
> | **SC1** | ❌ 无 | ❌ 无 | 标准 OSEK OS + 调度表 |
> | **SC2** | ❌ 无 | ✅ 有 | SC1 + 时序执行预算监控 (Timer) |
> | **SC3** | ✅ 有 | ❌ 无 | SC1 + 空间内存保护 (MPU) |
> | **SC4** | ✅ 有 | ✅ 有 | 全功能保护 (SC1 + SC2 + SC3) |

---

#### 2.2 废除 OSEK COM 内部接口
- 传统 OSEK OS 内置的单机消息传递接口全部被废除；
- 在 AUTOSAR 架构中，跨任务、跨核心、跨 ECU 的所有数据通信均全权移交给 **RTE (Runtime Environment)** 和 **COM** 模块负责。

---

#### 2.3 取消硬编码的 RES_SCHEDULER 锁
- OSEK 中无论是否使用，系统都默认硬编码生成最高优先级调度锁 `RES_SCHEDULER`；
- AUTOSAR 认为硬编码锁会破坏统一的时间保护预算，将其降级为普通 Resource，仅在配置工具明确需要时才按需生成。

> [!NOTE] 关于 OSEK 中的 RES_SCHEDULER
> 在优先级上限协议（PCP）中，`RES_SCHEDULER` 是一个特殊的系统级保留资源。
> 当运行任务调用 `GetResource(RES_SCHEDULER)` 时，优先级瞬间提升至系统最高任务优先级，充当“任务级临界区锁”。
> 
> 在 AUTOSAR OS 中，为了避免任务长时间持锁导致系统饿死，必须在静态工具链中为其配置 `OsTaskResourceLock`，并强制指定持锁时间上限 `OsTaskResourceLockBudget`。一旦超时，OS 会通过 `ProtectionHook` 实施保护介入。

---

#### 2.4 废除 `DeclareTask()` 等宏的实际功能
- 仅保留宏定义以向上兼容遗留 C 代码，但在 AUTOSAR OS 工程中不执行任何实际操作。

---

#### 2.5 允许系统启动前与停机后的中断控制
- 原有 OSEK OS 严苛禁止在 `StartOS()` 之前调用任何 OS API（如关中断）。
- 现代车载 ECU 频繁面临看门狗超时、UDS 诊断请求（如 `$11` 软复位服务）触发的**热复位（Warm Reset）**。在热复位期间，中断路由器（IR）的悬挂状态位可能残留，因此 `EcuM_Init()` 必须允许在启动前关中断。

```c
void EcuM_Init(void)
{
    /* 允许在启动前关闭所有中断，保护敏感外设配置 */
    SuspendAllInterrupts(); 

    /* 初始化 MCU 关键时钟与外设 */
    Mcu_Init(&Mcu_Config);
    Mcu_InitClock(0);
    while (Mcu_GetPllStatus() != MCU_PLL_LOCKED);
    Mcu_DistributePllClock();
    Port_Init(&Port_Config);
    Wdg_Init(&Wdg_Config);

    /* 初始化完成，成对恢复中断 */
    ResumeAllInterrupts(); 

    /* 正式启动 OS */
    StartOS(OSDEFAULTAPPMODE);
}
```

> [!TIP] 架构优势
> 允许启动前调用中断控制 API 后，工程师不再需要针对 ARM（`CPSID i`）或 TriCore（`DISABLE`）手写特定汇编，大幅提升了基础软件的跨芯片移植性。

---

#### 2.6 Alarm 到期支持累加软件计数器
- 报警器（Alarm）到期动作从 OSEK 的 3 种（`ACTIVATETASK`、`SETEVENT`、`ALARMCALLBACK`）扩展增加了第 4 种：**`INCREMENTCOUNTER`**。
- 可用于更方便地级联实现多级软件定时器分频。

---

#### 2.7 支持开机自启动“绝对时间”报警器 (Absolute Alarms)
- 允许操作系统在启动阶段自动激活预先配置好的绝对报警器。
- 在涉及车载网络全局时间同步（如 CAN / FlexRay / TSN 网络时间戳对齐）场景下，确保报警器固定在时钟周期的绝对刻度上精准触发。

---

#### 2.8 扩展状态下强制防空指针保护
- AUTOSAR 强制要求所有系统 API 入口执行防空指针防御性校验，返回标准错误码 `E_OS_PARAM_POINTER`，有效收敛致命异常。

---

返回：[[index|返回知识库主页]]
