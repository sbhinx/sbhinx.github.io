---
title: AUTOSAR_SWS_OS
tags:
  - 嵌入式
  - C语言
date: 2026-10-01
btw: |-
  本章节主要参考AUTOSAR文档Specification of Operating System.
  标准版本:4.3.1
---

## 概述

### 1. AUTOSAR OS 功能属性：
- **静态配置与裁剪(Statically configured and scaled)** 
- 系统运行所需的所有对象(任务、中断、堆栈空间等)必须在编译前全部静态定义且分配内存，运行时不支持动态创建或者销毁对象。如果不需要的特性可以在生成阶段彻底裁剪掉，以便实现最小的资源占用。
- **实时性能分析友好(Amenable to reasoning of real-time performance)** 
- 面向硬实时系统设计，其上下文切换时间、最坏情况执行时间(Worst-Case Execution Time, WCET)均要求有高度的确定性，以便做调度分析和时序收敛验证。(例如一个10ms的Task确保其实际执行时间不超过10ms)
- **基于优先级的调度策略(Priority-based scheduling policy)**
- 支持基于静态优先级的抢占式/非抢占式(Full-preemptive/Non-preemptive)调度算法。(也就是同事支持优先级打断和独占CPU模式的两种调度方式)
- **运行时保护功能(Protective functions at runtime)**
- 运行时具备安全屏障，在内存保护单元(Memory Protection Unit, MPU)和定时器辅助下，提供内存保护(防止内存越界和非法读写)和时间保护(防止超时任务)。
- **极简资源开销，兼容低端MCU(Hostable on low-end controllers and without external resources)**
- 代码体积与 RAM 占用极小，无需外挂 RAM/Flash 即可在紧凑型、低算力的片上 MCU（如 16 位/32 位单片机）上独立运行。

### 2. 应用领域
- 专用于大部分车载ECU(动力域控制器、车身域控制器等)，==注意通讯和信息娱乐系统除外==。其被假设为使用专有的操作系统，如Windows CE、VxWorks、QNX等。如果要在上述操作系统种运行AUTOSAR组件，则需讲文档中所定义的接口作为操作系统抽象层来提供。AUTOSAR OS 参考OSEK/VDX OS 2.2.3规范为技术基石，做了相关的功能扩展和约束。

## OS功能描述

### 1. CoreOS

#### 1.1 背景
AUTOSAR OS 的核心功能应以 OSEK OS 为基础。具体而言，OSEK OS 提供以下特性，以支持 AUTOSAR 中的相关概念：
- 基于固定优先级的调度机制，仅处理优先级高于任务的中断；
- 针对 OS 服务的不当使用提供一定的防护措施；
- 通过 StartOS() 和 StartupHook() 实现启动接口；
- 通过 ShutdownOS() 和 ShutdownHook() 实现关闭接口；
OSEK OS 除了上述功能之外，还提供了诸多特性。可参考OSEK OS API。

> 备注：
> 在 AUTOSAR 规范体系中，形如 **`[SWS_Os_00242]`** 的方括号标签，是汽车电子软件开发中极为核心的概念——**“规范级需求唯一标识符”（Requirement Unique Identifier）**。无论规范版本如何迭代升级，这个编号**终身绑定该条核心规则**，永不重复复用。

AUTOSAR OS 应提供一个与OSEK操作系统API向后兼容的API。此外，AUTOSAR OS也根据需求针对OSEK OS的原有API进行了一些限制，对一些未定义行为进行了扩展和补充。

**1.在特定可扩展性等级禁用Alarm Callback**
- 在 OSEK 中，Alarm 到期可以调用一个 C 语言回调函数；
- 在 AUTOSAR 的 **SC2、SC3、SC4** 等级中，**严禁使用 Alarm Callback**。因为回调函数直接运行在中断上下文，极难做内存保护和时间保护；它**仅被允许存在于无保护的 SC1** 中。

> [!NOTE] AutoSAR的可扩展性等级(Scalability Class, SC)
> 用来定义 OS 支持的功能子集，基于老 OSEK 的 Conformance Class 扩展而来。有点类似于Linux内核在编译阶段配置不同选项得到的不同能力规格的系统。
> 
> | 可扩展性等级 (SC) | 内存保护 (Memory) | 时间保护 (Timing) | 核心特性 |
> | :--- | :---: | :---: | :--- |
> | **SC1** | ❌  | ❌  | 标准 OSEK OS+调度表|
> | **SC2** | ❌  | ✅  | SC1 + 时序保护(Timer) |
> | **SC3** | ✅  | ❌  | SC1 + 内存保护(MPU) |
> | **SC4** | ✅  | ✅  | SC1+2+3 |

**2.废除 OSEK COM**
- 传统OSEK OS的内部消息传递接口全部被废除；
- AUTOSAR架构中，跨任务/模块的通信全权由RTE和COM模块负责。

**3.取消OSEK中硬编码的 RES_SCHEDULER**
- OSEK 中无论用不用，系统都默认内置最高优先级的调度锁 `RES_SCHEDULER`；
- AUTOSAR 认为特殊硬编码会破坏统一的时间保护，因此将它视同为普通 Resource，仅在配置需要时才通过工具链生成。

> [!NOTE] 关于OESK中的RES_SCHEDULER
> 在基于优先级上限协议(Priority Ceiling Protocol，PCP)的调度体系中，`RES_SCHEDULER` 是一个**特殊的系统级保留资源**。
> 当一个正在运行的任务调用 类似`GetResource(RES_SCHEDULER)` 时，该任务的运行优先级会瞬间被提升至整个系统中的最高任务优先级。这意味着**在释放该资源前，任何其他任务都无法抢占它**（中断除外）。其本质上相当于一个“任务级临界区锁”，用于保护多任务共享的临界代码段，让任务可以在不关闭硬件中断的前提下安全执行，避免被其他同核任务插队。
> 
> 在OESK OS中，无论工程中是否计划使用它，其均默认、硬编码生成。AUTOSAR要求对执行时间和锁阻塞时间进行静态预算监控。其要求所有锁必须可静态配置，且能被审查。在AUTOSAR OS中，任务要实现类似`RES_SCHEDULER`的功能。必须在静态配置阶段为其配置`OsTaskResourceLock`，并明确设置一个时间上限`OsTaskResourceLockBudget`。若任务持有锁超过该时间，OS会通过`ProtectionHook`将其杀死。以免饿死系统。
> 
> 在实际的AUTOSAR OS中，该资源被设计为按需配置，并通过配置赋予最有任务优先级。一定程度上保持对OESK的兼容。

**4.废除`DeclareTask()`等宏的实际功能**
- 保持向上兼容。但这些宏在AUTOSAR OS的工程中不会起任何作用。

**5.允许系统启动前停机后的中断控制**


施工中。。。
