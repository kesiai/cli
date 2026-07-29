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

判断完模式后：
- 数据操作模式 → 走「数据操作模式 · 工作流（场景一）」（见下文）
- 数据+前端模式 → 走「数据+前端模式 · 完整工作流（场景二）」（见下文）

---

## 快速开始

```bash
# 本 skill 自带 CLI（已打包到 cli/index.cjs），无需全局安装
K=node cli/index.cjs     # 在 skill 根目录执行；部署到项目时 node .claude/skills/kesi-cli/cli/index.cjs

$K tables -o json        # 默认输出 JSON（AI 友好）
```

> 改了 CLI 源码后，运行 `npm run build:bundle` 重新生成 `skill/cli/index.cjs`。

---

## 数据操作模式 · 工作流（场景一）

> 适用于中台数据管理：对内置表、自定义表及记录做增删改查、查询统计、表结构管理。**按需操作，完成后即结束，不创建前端项目。**

### Phase 0: 认证

凭据经 params/env 提供（详见下文「数据+前端模式」的 Phase 0: 认证）。服务器端 agent 由后端注入 `KESI_TOKEN` 环境变量。

### Phase 1: 查看现状

```bash
$K tables                      # 列出所有表
$K scan --with-sample          # 全库概览（表结构 + 样本数据）
$K describe <tableId>          # 某张表的字段级 schema
$K sample <tableId>            # 预览某张表的数据
```

### Phase 2: 按需操作数据

**记录增删改查：**

```bash
$K records <table> [-f filter] [-l limit] [--with-count]   # 查询列表
$K record  <table> <id>                                     # 查单条
$K record-create <table> --data k=v ...                     # 新增（支持 --json / --file / --upsert）
$K record-update <table> <id> --data k=v                    # (⚠️ 是完全替换操作，不是合并)
$K record-delete <table> <id>                               # 删除
$K records-batch-delete <table> <id1> <id2>                 # 批量删除
```

**表结构管理（自定义表）：**

```bash
$K table-create --file schema.json      # 建表（⚠️ 必须遵循上面的 template+function 映射）
$K table-update <id> --file schema.json # 改表 (⚠️ 是完全替换操作，不是合并)
$K table-delete <id>                    # 删表（⚠️ 连带删除全部记录，不可恢复）
```

**批量建表 + 灌种子数据（可选）：** 用 `$K seed --file seed.json`，seed.json 结构参考下文「Phase 3: 表创建与验证 → 3.1 生成 seed.json」。

**通用资源查询（内置表 / 系统资源）：**

```bash
$K query <resource> [-f filter] [-l limit]    # 如 core/user、core/department、warning/warning
$K query-get <resource> <id>
```

> 记录命令详细参数见 [references/record.md](references/record.md)，表命令见 [references/table/table.md](references/table/table.md)，内置资源路径见下文「命令速查 → 通用资源查询」，查询/过滤语法见 [references/query-syntax.md](references/query-syntax.md)。

### Phase 3: 报告结果，结束

向用户报告本次操作结果（新建/修改/删除了哪些表或记录、查询返回了什么、受影响行数），然后**结束任务**。

> ⚠️ **不要**引导「下一步创建前端项目」。若用户后续明确提出前端需求，再切换为数据+前端模式。

---

## 数据+前端模式 · 完整工作流（场景二）

> 适用于：数据操作基础上还要**生成前端项目**。先建表灌数据，数据层就绪后交接 kesi-frontend。
> 若只操作数据、不生成前端，走上面的「数据操作模式 · 工作流（场景一）」。

以下工作流**必须按阶段顺序执行，每个阶段都需要用户确认后才能继续。**

---

### Phase 0: 认证

**连接凭据经 params/env 提供，无登录步骤。优先级：CLI 参数 > 环境变量。**

| 字段 | CLI 参数 | 环境变量 |
|------|----------|----------|
| baseUrl | `--base-url` | `KESI_BASE_URL` |
| projectId | `--project-id` | `KESI_PROJECT` |
| token | `--token` | `KESI_TOKEN` |

服务器端 agent 场景：后端启动进程时注入该用户的 `KESI_TOKEN` 环境变量。

```bash
# 环境变量方式（进程级）
KESI_BASE_URL=http://<平台>/rest KESI_PROJECT=<projectId> KESI_TOKEN=<token> $K tables

# CLI 参数方式（优先级更高）
$K tables --base-url http://<平台>/rest --project-id <projectId> --token <token>
```

⚠️ 缺 baseUrl/projectId/token → `CONFIG_ERROR`。验证:`$K config`。

---

### Phase 1: 数据发现

扫描平台现有数据，了解当前状态：

```bash
$K scan --with-sample
```

**向用户报告当前状态：**
- 已有多少张表、每张表的类型（普通/设备/组织/…）
- 每张表有多少条记录
- 设备表有哪些数据点（tags）、哪些可写（rw=true）
- 设备表有哪些指令（commands）

**让用户选择：**

| 选项 | 说明 |
|------|------|
| A. 继续添加 | 在现有数据基础上添加新表 |
| B. 清除重来 | 删除现有表，从零开始 |
| C. 直接生成前端 | 数据已满足需求，切换到 kesi-frontend skill |

---

### Phase 2: 表规划

根据用户需求规划完整表方案。

#### 判断每张表的类型

- **需要实时数据采集、有传感器/控制器** → `device` 表
- **纯信息管理、CRUD 操作** → `common` 表
- **需要作为组织权限的节点** → `department` 表
- **需要排班/值班管理** → `tableClasses` 表

#### 设备表（template: "device"）额外要求

设备表除了 `template` 和 `function` 外，还需要 `device` 配置块。

创建设备表**前**必须查询可用驱动：

```bash
$K drivers                        # 获取驱动实例列表
$K driver <id>                    # 获取驱动详情和连接参数（settings）
$K driver-schema <driverType>     # 获取点位的必填字段和枚举值
```

设备表有 **7 个固定预设字段**（必须全部包含）：

| key | title | controlType | need |
|-----|-------|-------------|------|
| `id` | 设备编号 | text | true |
| `name` | 设备名称 | text | true |
| `connectTime` | 通信时间 | date | false |
| `disable` | 是否禁用 | boolean | false |
| `online` | 在线 | boolean | false |
| `off` | 断电 | boolean | false |
| `warnFlag` | 报警状态 | boolean | false |

用户可在预设字段基础上追加自定义字段。

#### 规划输出格式

向用户展示完整方案（示例）：

```
📋 项目表规划（共 N 张表）

📋 信息管理（common 表）
├── <table_id>    <表标题>     <字段数> 个字段
└── ...

🔧 设备管理（device 表）
├── <table_id>    <表标题>     7 预设 + N 自定义字段 | N 数据点
└── ...

🏢 组织管理（department 表，如需要）
└── <table_id>    <表标题>     <字段数> 个字段
```

然后**逐表展示详细字段和数据点配置**。

#### ⚠️ 用户确认后才能进入 Phase 3

---

### Phase 3: 表创建与验证

#### 3.1 生成 seed.json

正确的 seed.json 结构：

```json
{
  "tables": [
    {
      "schema": {
        "id": "<表ID>",
        "title": "<表标题>",
        "template": "common",
        "function": [],
        "schema": {
          "type": "object",
          "name": "<表ID>",
          "title": "<表标题>",
          "properties": {
            "<fieldKey>": { "key": "<fieldKey>", "type": "<类型>", "controlType": "<控件类型>", "title": "<字段标题>", "need": true }
          },
          "formLayout": { "cols": 3, "labelLayout": "vertical" },
          "formSchema": [
            { "key": "<fieldKey>", "colSpan": 1 }
          ],
          "tableSchema": [
            { "key": "<fieldKey>", "canOrder": true }
          ]
        }
      },
      "records": [
        { "<fieldKey>": "<值>" }
      ]
    },
    {
      "schema": {
        "id": "<表ID>",
        "title": "<表标题>",
        "template": "device",
        "function": ["device", "warning", "computed"],
        "schema": {
          "type": "object",
          "name": "<表ID>",
          "title": "<表标题>",
          "properties": {
            "id": { "key": "id", "type": "string", "controlType": "text", "textContent": "text", "title": "设备编号", "need": true },
            "name": { "key": "name", "type": "string", "controlType": "text", "textContent": "text", "title": "设备名称", "need": true },
            "connectTime": { "key": "connectTime", "type": "string", "controlType": "date", "title": "通信时间" },
            "disable": { "key": "disable", "type": "boolean", "controlType": "boolean", "title": "是否禁用" },
            "online": { "key": "online", "type": "boolean", "controlType": "boolean", "title": "在线" },
            "off": { "key": "off", "type": "boolean", "controlType": "boolean", "title": "断电" },
            "warnFlag": { "key": "warnFlag", "type": "boolean", "controlType": "boolean", "title": "报警状态" }
          },
          "formLayout": { "cols": 3, "labelLayout": "vertical" },
          "formSchema": [
            { "key": "id", "colSpan": 1 },
            { "key": "name", "colSpan": 1 },
            { "key": "connectTime", "colSpan": 1 },
            { "key": "disable", "colSpan": 1 },
            { "key": "online", "colSpan": 1 },
            { "key": "off", "colSpan": 1 },
            { "key": "warnFlag", "colSpan": 1 }
          ],
          "tableSchema": [
            { "key": "id" }, { "key": "name" },
            { "key": "online" }, { "key": "warnFlag" }
          ]
        },
        "device": {
          "driver": "<驱动名>",
          "driverType": "<驱动类型>",
          "driverName": "<驱动名称>",
          "driverExampleId": "<from $K drivers>",
          "groupId": "<from $K driver>",
          "driverGroupId": "<from $K driver>",
          "emulator": false,
          "settings": { "<连接参数>": "<值>" },
          "tags": [
            { "id": "<tagId>", "name": "<tag名称>", "policy": "save", "<点位字段>": "<值>" }
          ]
        },
        "computed": { "tags": [] },
        "warning": { "rules": [] }
      },
      "records": [
        { "id": "<设备ID>", "name": "<设备名称>" }
      ]
    }
  ]
}
```

#### 3.2 执行创建

```bash
$K seed --file seed.json    # 建表 + 灌种子数据
```

#### 3.3 验证

```bash
$K scan --with-sample       # 验证创建结果
```

**验证要点：**
- 每张表的 `tableMajorType` 是否正确（设备表应为 `device`，不是 `normal`）
- 设备表的 tags 是否正确创建
- 种子数据是否完整写入

如果验证发现问题，修正 seed.json 后重新执行。

---

### Phase 3 后：交接到前端生成（仅数据+前端模式）

> ⚠️ 本节**仅在数据+前端模式（场景二）执行**。数据操作模式（场景一）不会走到这里——它在「数据操作模式 · 工作流」里报告完数据结果就结束了，**不交接前端、不提"下一步创建项目"**。

数据层创建并验证完成后，将控制权交给 kesi-frontend skill 进行前端生成。

**交接数据：**
- `$K scan --with-sample` 的完整输出（表结构、字段、数据点、样本数据）
- 用户确认的项目类型偏好（大屏可视化 vs 中台管理）

**交接指令：**
告诉用户：`数据层已就绪。现在切换到 kesi-frontend skill 生成前端项目规划报告。`

> **下一步 skill：`kesi-frontend`**
>
> kesi-frontend skill 将读取 scan 数据，生成前端规划报告（页面结构、数据映射），然后初始化前端项目。

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

### 报警系统

12 个命令 | [references/warning.md](references/warning.md)

### 其他

| 领域 | 命令数 | 详细文档 |
|------|--------|----------|
| 文件管理 | 3 | [references/file.md](references/file.md) |
| 报表管理 | 6 | [references/report.md](references/report.md) |
| 用户管理 | 2 | [references/user.md](references/user.md) |

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
