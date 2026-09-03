---
name: kesi-cli
description: "KESI 数据层工具 — 查询和操作平台数据：内置表/自定义表及其记录的增删改查、查询统计、表规划与建表灌数据。两种运行模式（按用户意图自动判断）：①数据操作模式（中台数据管理，完成后即结束，不生成前端）②数据+前端模式（数据就绪后交接 kesi-frontend 生成前端项目）。"

keywords: KESI, IoT, 物联网, 表管理, 设备管理, 报警管理, 增删改查, CRUD, 数据操作, 中台, CLI, schema, seed, 智慧楼宇, 智慧工厂
---

# KESI CLI Skill

> KESI 平台数据层工具，支持表/记录的增删改查、数据点配置、报警规则设置等操作。

---

## ⚠️ 核心原则

### 🔵 统一执行流程框架

**每个操作部分都遵循以下流程：**

```
读文档 → 写数据 → 校验 → 执行指令 → 验证结果
```

**示例（创建设备表）：**

```
部分 1：基础信息
  → 读文档 → 写 {id, title, template, function} → 校验 → 累积

部分 2：表字段
  → 读 table-schema.md → 写 properties → 校验 → 累积

部分 3：驱动配置
  → 执行 $K drivers → 写 device 块 → 校验 → 累积

部分 4：数据点
  → 执行 $K driver-schema → 写 tags → 校验 → 累积

所有部分完成后：
  → 组装完整 schema → 校验 → $K table-create → 验证
```

---

### 🔵 模式判断强制规则

**任务开始前，必须先判断属于哪种模式，并在响应中显式声明：**

```
🔵 本次任务模式：[数据操作模式 / 数据+前端模式]

判断依据：[用户需求中的关键表述]
```

| 模式 | 触发条件 | 收尾行为 |
|------|----------|----------|
| **数据操作模式** | 用户只涉及表/记录的增删改查、查询、统计、表结构管理 | 报告数据操作结果后**直接结束**，**绝不**引导"创建前端项目" |
| **数据+前端模式** | 用户明确提到「创建前端 / 生成项目 / 做可视化大屏 / 做管理界面 / 生成页面 / 接入数据做展示」 | 数据层就绪后**交接 kesi-frontend** 创建前端项目 |

**意图含糊时的处理：**
- 主动询问：「这次只处理数据，还是处理完数据后要生成前端项目？」
- 按用户回答执行，并在响应中声明模式

**⚠️ 模式纪律（最重要）：**
- 数据操作模式下，任务结束**只报告数据结果**（建了什么表、改了多少记录、查询返回了什么）
- **不要**说「数据都处理好了，下一步创建项目」或任何引导前端的话
- 前端交接**只在数据+前端模式**发生

---

### 🔵 执行前校验强制规则

**⚠️ 所有调接口操作前必须先校验数据格式。**

**需要校验的操作：**

| 操作 | 命令 | 校验规则 |
|------|------|----------|
| 创建表 | `$K table-create --file schema.json` | [references/validation-rules.md § 一](references/validation-rules.md#一表结构校验-table-create--table-update) |
| 批量建表 | `$K seed --file seed.json` | [references/validation-rules.md § 四](references/validation-rules.md#四seedjson-校验) |
| 创建记录 | `$K record-create --data ...` | 根据表 schema 检查必填字段 |
| 修改数据点 | 通过 API 修改 tags | [references/validation-rules.md § 三](references/validation-rules.md#三数据点校验-tags) |

**校验不通过时：**
- **绝不执行 CLI 命令**
- 列出所有校验错误，按字段分组
- 修复后必须重新执行校验

---

### 🔵 数据来源原则

**所有数据结构、表配置、字段定义必须基于 references 目录和 CLI 命令输出，禁止参考其他项目代码。**

- ✅ 允许：`references/` 文档、`$K scan` / `$K describe` 等命令输出、用户的口述需求
- ❌ 禁止：读取其他项目的代码来决定表结构或字段配置

---

### 🔵 临时文件规则

**⚠️ 禁止在 skill 目录下创建临时文件。**

所有临时 JSON/数据文件必须使用系统临时目录：
- Bash: `TMPFILE=$(mktemp)` 或 `/tmp/kesi-$RANDOM.json`
- 用完后删除：`rm -f $TMPFILE`

---

### 🔵 Schema 读取强制规则

**⚠️ 任何涉及字段/属性/配置的修改操作，必须先读取 references/ 中对应文档获取真实 schema，禁止凭经验或推断猜测字段名。**

适用范围：表字段、数据点、指令、事件、计算节点、报警规则、驱动配置等。

**强制流程：**
1. 读取 `references/` 中对应文档（如 `references/device-tag.md`）
2. 从文档中读取真实字段名和结构
3. 使用真实字段名执行修改，**不得创造或推断字段名**

---

## ⚠️ 使用场景与运行模式

本 skill 有**两种使用场景**，开始任务前必须先判断属于哪一种。

| 模式 | 场景 | 何时使用 | 收尾行为 |
|------|------|----------|----------|
| **数据操作模式**（场景一） | 中台数据管理 | 对内置表、自定义表及表内记录做增删改查、查询统计、表结构管理 | 报告数据操作结果后**直接结束**，**绝不**引导"创建前端项目" |
| **数据+前端模式**（场景二） | 数据准备 + 前端生成 | 在数据操作基础上，用户还要求生成前端项目（可视化大屏、管理界面、接入数据做展示） | 数据层就绪后**交接 kesi-frontend** 创建前端项目 |

### 如何判断模式（自动判断意图）

按用户的需求表述判断，**不需要每次都问**：

- **→ 数据操作模式**：用户只涉及表/记录的增删改查、查询、统计、表结构管理。例如「帮我加几条设备」「查一下当前报警」「建一张人员表」「把这个字段改一下」「统计下在线设备数」。**中台数据管理 agent 默认此模式。**
- **→ 数据+前端模式**：用户明确提到「创建前端 / 生成项目 / 做可视化大屏 / 做管理界面 / 生成页面 / 接入数据做展示」等。
- **意图含糊时**：主动问一句——「这次只处理数据，还是处理完数据后要生成前端项目？」再按回答执行。

> ⚠️ **关键纪律（最重要）**：数据操作模式下，任务结束**只报告数据结果**（建了什么表、改了多少记录、查询返回了什么），**不要**说「数据都处理好了，下一步创建项目」或任何引导前端的话。前端交接**只在数据+前端模式**发生。
>
> 反过来：即使用户在数据操作模式下提了一句「之后可能要做前端」，只要本次任务没明确要求生成前端，就按数据操作模式收尾，把"是否生成前端"留给用户下一次明确发起。

---

## 快速开始

```bash
# 本 skill 自带 CLI（已打包到 cli/index.cjs）
K=node cli/index.cjs

$K tables                 # 列出所有表
$K scan --with-sample     # 全库概览（表结构 + 样本数据）
$K describe <tableId>     # 某张表的字段级 schema
```

> 改了 CLI 源码后，运行 `npm run build:bundle` 重新生成 `skill/cli/index.cjs`。

---

## 工作流索引

判断完模式后，选择对应的工作流：

| 模式 | 工作流文档 | 说明 |
|------|----------|------|
| 数据操作模式 | [references/workflow-data-ops.md](references/workflow-data-ops.md) | 中台数据管理，完成后直接结束 |
| 数据+前端模式 | [references/workflow-full.md](references/workflow-full.md) | 建表灌数据后交接 kesi-frontend |
| 驱动创建（子工作流） | [references/workflow-driver-create.md](references/workflow-driver-create.md) | 接入新协议/厂商驱动：目录选型→创建→安装→配置→验证 running。可独立触发，也可由 workflow-full Phase 2 在无可用驱动时进入 |

---

## 表类型指南索引

根据用户需求判断表类型，然后查阅对应指南：

| 表类型 | 指南文档 | 适用场景 | 复杂度 |
|--------|----------|----------|--------|
| 设备表 | [table-guides/device-table-guide.md](table-guides/device-table-guide.md) | 有实时数据采集的设备（空调、照明、电梯、传感器、电表） | ⭐⭐⭐⭐⭐ |
| 普通表 | [table-guides/common-table-guide.md](table-guides/common-table-guide.md) | 纯信息管理、CRUD 操作（楼宇信息、维保记录、人员名单） | ⭐⭐ |
| 组织表 | [table-guides/department-table-guide.md](table-guides/department-table-guide.md) | 组织架构、权限分组（物业部门、管理组） | ⭐⭐ |
| 集合表 | [table-guides/settable-table-guide.md](table-guides/settable-table-guide.md) | 跨表数据聚合（综合看板数据源） | ⭐⭐ |
| 映射表 | [table-guides/tableMapping-table-guide.md](table-guides/tableMapping-table-guide.md) | 外部数据库同步（ERP/MES 映射） | ⭐ |
| 班次表 | [table-guides/tableClasses-table-guide.md](table-guides/tableClasses-table-guide.md) | 排班/值班管理 | ⭐⭐ |

**每个表类型指南都遵循统一流程：**
- 按部分组织（如设备表的 7 个部分）
- 每个部分：读文档 → 写数据 → 校验
- 所有部分完成后：组装 → 校验 → 执行 → 验证

---

## 命令速查

完整的命令分类说明，参见 [command-cheat-sheet.md](command-cheat-sheet.md)。

**常用命令快速参考：**

| 领域 | 常用命令 |
|------|----------|
| 表管理 | `$K tables`, `$K table-create`, `$K table-update`, `$K table-change-id`（⚠️ 删除重建语义） |
| 记录管理 | `$K records`, `$K record-create`, `$K record-update`, `$K record-change-id`（⚠️ 删除重建语义） |
| 设备/数据点 | `$K tags`, `$K drivers`, `$K driver-schema` |
| 驱动创建 | `$K driver-catalog`, `$K driver-create`, `$K driver-install`, `$K driver-update-config`, `$K driver-restart` |
| 报警 | `$K warnings`, `$K warning-rules` |

---

## 参考文档索引

详细的技术文档，按需查阅：

| 文档 | 说明 |
|------|------|
| [references/INDEX.md](references/INDEX.md) | 参考文档索引 |
| [references/table-schema.md](references/table-schema.md) | 表结构完整文档 |
| [references/table-field-rules.md](references/table-field-rules.md) | 字段规则（交互规则+校验） |
| [references/device.md](references/device.md) | 设备管理总览 |
| [references/device-tag.md](references/device-tag.md) | 数据点详细 |
| [references/driver-create.md](references/driver-create.md) | 驱动创建与管理命令参考 |
| [references/user.md](references/user.md) | 用户管理（CRUD、角色绑定、组织字段） |
| [references/role.md](references/role.md) | 角色管理（CRUD、permission 词表、引用守卫） |
| [references/dict.md](references/dict.md) | 数据字典（字典项 CRUD、type 六枚举、value 形态） |
| [references/setting.md](references/setting.md) | 系统设置（全局配置读写、字段类型、必须还原） |
| [references/ds.md](references/ds.md) | 数据接口（分组→接口→执行；setting 按类型；删分组/半成品守卫） |
| [references/file.md](references/file.md) | 文件与媒体库（上传 --catalog 定目录；目录树/列表/建目录；无删除端点） |
| [references/validation-rules.md](references/validation-rules.md) | 校验规则 |

---

## 输出格式

所有命令支持 `-o json|table|plain`，默认 `json`（AI 友好）。

```bash
$K tables -o table       # 表格格式输出
$K tables -o plain       # 纯文本输出
$K tables -o json        # JSON 格式（默认）
```
