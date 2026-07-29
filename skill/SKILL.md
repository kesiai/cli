---
name: kesi-cli
description: "KESI 数据层工具 — 查询和操作平台数据：内置表/自定义表及其记录的增删改查、查询统计、表规划与建表灌数据。两种运行模式（按用户意图自动判断）：①数据操作模式（中台数据管理，完成后即结束，不生成前端）②数据+前端模式（数据就绪后交接 kesi-frontend 生成前端项目）。"

keywords: KESI, IoT, 物联网, 表管理, 设备管理, 报警管理, 增删改查, CRUD, 数据操作, 中台, CLI, schema, seed, 智慧楼宇, 智慧工厂
---

## ⚠️ 核心原则

### 数据来源原则

**所有数据结构、表配置、字段定义必须基于本 skill 的 references 目录和 CLI 命令输出，禁止参考其他项目代码。**

- ✅ 允许：本 skill 的 `references/` 文档、`$K scan` / `$K describe` 等命令输出、用户的口述需求
- ❌ 禁止：读取其他项目的代码来决定表结构或字段配置

### 临时文件规则

**⚠️ 禁止在 skill 目录下创建临时文件。**

所有临时 JSON/数据文件必须使用系统临时目录：
- Bash: `TMPFILE=$(mktemp)` 或 `/tmp/kesi-$RANDOM.json`
- 用完后删除：`rm -f $TMPFILE`

### Schema 读取强制规则

**⚠️ 任何涉及字段/属性/配置的修改操作，必须先读取 references/ 中对应文档获取真实 schema，禁止凭经验或推断猜测字段名。**

适用范围：表字段、数据点、指令、事件、计算节点、报警规则、驱动配置等。

**强制流程：**
1. 读取 `references/` 中对应文档（如 `references/device/tag.md`）
2. 从文档中读取真实字段名和结构
3. 使用真实字段名执行修改，**不得创造或推断字段名**

### 表类型正确性

**创建表时必须严格遵循 template + function 映射，否则后端会将设备表识别为普通表。**

| template | function | 判断标准 |
|----------|----------|----------|
| `common` | `[]` | 纯信息管理、CRUD（楼宇信息、维保记录、人员名单） |
| `device` | `["device", "warning", "computed"]` | 有实时数据采集的设备（空调、照明、电梯、传感器、电表） |
| `department` | `["dataAuth"]` | 组织架构、权限分组（物业部门、管理组） |
| `settable` | `["settable"]` | 跨表数据聚合（综合看板数据源） |
| `tableMapping` | `["tableMapping"]` | 外部数据库同步（ERP/MES 映射） |
| `tableClasses` | `["tableClasses"]` | 班次管理（排班表、值班表） |

> ⚠️ 设备表 `function` 中**必须包含 `"device"`**，否则后端识别为普通表。

---

## ⚠️ 使用场景与运行模式

本 skill 有**两种使用场景**，开始任务前必须先判断属于哪一种——它决定了任务结束时的行为。**这是最容易出错的地方，务必先读这一节。**

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
# 本 skill 自带 CLI（已打包到 cli/index.cjs），无需全局安装
K=node cli/index.cjs     # 在 skill 根目录执行；部署到项目时 node .claude/skills/kesi-cli/cli/index.cjs

$K tables -o json        # 默认输出 JSON（AI 友好）
```

> 改了 CLI 源码后，运行 `npm run build:bundle` 重新生成 `skill/cli/index.cjs`。

---

## 工作流

判断完模式后，选择对应的工作流：

| 模式 | 工作流文档 | 说明 |
|------|----------|------|
| 数据操作模式 | [references/workflow-data-ops.md](references/workflow-data-ops.md) | 中台数据管理，完成后直接结束 |
| 数据+前端模式 | [references/workflow-full.md](references/workflow-full.md) | 建表灌数据后交接 kesi-frontend |

---

## 命令速查

### 通用命令

```bash
$K config   # 查看解析后的配置
# 凭据优先级：CLI 参数 > 环境变量（--base-url/--project-id/--token 或 KESI_BASE_URL/KESI_PROJECT/KESI_TOKEN）
```

### AI 聚合命令（推荐先用这些）

| 命令 | 用途 |
|------|------|
| `$K scan [--with-sample] [-o file]` | 全库 schema 导出，AI 一次了解全局 |
| `$K describe <tableId> [--with-tags]` | 字段级 schema，AI 据此生成表单/表格 |
| `$K sample <tableId> [-l 5]` | 预览数据，AI 理解数据长什么样 |
| `$K seed --file seed.json` | 批量建表+灌种子数据 |

### 命令总览

| 领域 | 命令数 | 说明 | 详细文档 |
|------|--------|------|----------|
| 表管理 | 5 | 表 CRUD、schema 查询 | [references/table/table.md](references/table/table.md) |
| 记录管理 | 6 | 记录 CRUD、批量操作 | [references/record.md](references/record.md) |
| 设备/数据 | 10 | 数据点、时序数据、设备控制、在线统计、驱动管理、驱动 schema | [references/device.md](references/device.md) |
| 报警系统 | 12 | 报警规则、报警事件、报警归档 | [references/warning.md](references/warning.md) |
| 文件管理 | 3 | 文件上传、下载、删除 | [references/file.md](references/file.md) |
| 报表管理 | 6 | 报表 CRUD、执行、导出 | [references/report.md](references/report.md) |
| 用户管理 | 2 | 用户 CRUD、角色管理 | [references/user.md](references/user.md) |

### 驱动与点位

```bash
$K drivers                        # 列出驱动实例
$K driver <id>                    # 驱动详情（含 device.settings 连接参数）
$K driver-schema <driverType>     # 驱动 schema（点位字段定义、枚举值、settings 配置）
```

⚠️ 创建设备表时必须：
1. `$K drivers` → 获取驱动 ID 和 driverType
2. `$K driver <id>` → 获取连接参数（settings）
3. `$K driver-schema <driverType>` → 获取点位的必填字段和枚举值（不同驱动的点位字段完全不同）
4. 然后组装 JSON 创建设备表

详见 [references/device.md](references/device.md) 和 [references/device/tag.md](references/device/tag.md)。

### 通用资源查询

平台内置 63 个 schema，每个都有 `resource` 字段（API 路径）。

```bash
$K query <resource> [-f filter] [-s sort] [-l limit] [--with-count]
$K query-get <resource> <id>
```

常用资源：

| 资源路径 | 说明 |
|----------|------|
| `core/t/schema` | 数据表定义 |
| `core/user` | 用户管理 |
| `core/role` | 角色管理 |
| `core/department` | 组织架构 |
| `core/systemVariable` | 数据字典 |
| `core/catalog` | 数据分组 |
| `core/log` | 操作日志 |
| `syslog/log` | 系统日志 |
| `core/t/<tableId>/d` | 数据表记录（需替换 tableId） |
| `driver/driverInstance` | 驱动实例 |
| `driver/instruct` | 指令状态 |
| `driver/event` | 驱动事件 |
| `warning/warning` | 报警事件 |
| `warning/warning/archive` | 报警归档 |
| `warning/rule` | 报警规则 |
| `report/report` | 报表管理 |
| `ds/interface` | 数据接口定义 |
| `flow/flow` | 工作流 |
| `flow/flowTask/currentUser` | 我的任务 |

---

## 表 Schema 参考

### 完整文档

- 表结构完整文档：[references/table/table-schema.md](references/table/table-schema.md)
- 字段规则（交互规则+校验）：[references/table/field-rules.md](references/table/field-rules.md)
- 24 种控件类型：[references/table/controls/](references/table/controls/)
- 设备表详细配置：[references/device.md](references/device.md)
- **查询语法参考**：[references/query-syntax.md](references/query-syntax.md) — 过滤操作符、分页、排序、完整示例

### formLayout + colSpan 规则

**核心规则：**
1. 每行的 colSpan 之和必须等于 cols
2. `rich-text`、`editable-table`、`map` 必须独占整行（colSpan = cols）

| 控件宽度 | controlType |
|----------|-------------|
| 窄（1） | text, number, boolean, date, time, rate, select-*, serial-number, link, area, user-role, bytes-array, reference, upload, upload-group |
| 中（2） | date-range, relate, relate-multiple |
| 全宽（=cols） | **rich-text, editable-table, map** |

---

## 输出格式

所有命令支持 `-o json|table|plain`，默认 `json`（AI 友好）。
