# 数据+前端模式 · 完整工作流（场景二）

> 适用于：数据操作基础上还要**生成前端项目**。先建表灌数据，数据层就绪后交接 kesi-frontend。
> 若只操作数据、不生成前端，走 [workflow-data-ops.md](workflow-data-ops.md)。

以下工作流**必须按阶段顺序执行，每个阶段都需要用户确认后才能继续。**

---

## Phase 0: 认证

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

## Phase 1: 数据发现

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

## Phase 2: 表规划

根据用户需求规划完整表方案。

### 判断每张表的类型

- **需要实时数据采集、有传感器/控制器** → `device` 表
- **纯信息管理、CRUD 操作** → `common` 表
- **需要作为组织权限的节点** → `department` 表
- **需要排班/值班管理** → `tableClasses` 表

### 设备表（template: "device"）额外要求

设备表除了 `template` 和 `function` 外，还需要 `device` 配置块。

创建设备表**前**必须查询可用驱动：

```bash
$K drivers                        # 获取驱动实例列表
$K driver <id>                    # 获取驱动详情和连接参数（settings）
$K driver-schema <driverType>     # 获取点位的必填字段和枚举值
```

**⚠️ 驱动选择强制规则：**

1. **必须先调用 `$K drivers`** 查看平台实际安装了哪些驱动
2. **用户指定驱动名称时**（如"测试驱动"、"仿真驱动"、"Modbus"）：
   - 先调用 `$K drivers` 检查该驱动是否已安装
   - 如果已安装，使用返回的驱动信息（`id`、`driverType`、`name`、`device.settings`）
   - 如果未安装，**明确告知用户**"平台未安装该驱动，请先安装或选择其他已安装驱动"
3. **平台没有安装任何驱动时**：
   - 明确告知用户"当前平台未安装任何驱动，请先安装驱动或使用测试驱动"
   - 测试驱动的固定配置见下文"测试驱动配置"

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

### 测试驱动配置（当平台无驱动时使用）

当平台未安装任何驱动，或用户明确使用"测试驱动"时，使用以下固定配置：

```json
{
  "driver": "test",
  "driverType": "test",
  "driverName": "测试驱动",
  "driverExampleId": "test",
  "groupId": "test",
  "driverGroupId": "test_$$_test",
  "emulator": false,
  "settings": {},
  "tags": [
    { "id": "<tagId>", "name": "<tag名称>", "policy": "save" }
  ],
  "commands": [],
  "events": []
}
```

**测试驱动字段说明：**
- `driver`: 固定为 `"test"`
- `driverType`: 固定为 `"test"`
- `driverName`: 固定为 `"测试驱动"`
- `driverExampleId`: 驱动实例 id，测试驱动固定为 `"test"`
- `groupId`: 驱动实例 id，测试驱动固定为 `"test"`
- `driverGroupId`: 按 `{driverType}_$$_{id}` 格式生成，测试驱动为 `"test_$$_test"`
- `emulator`: 仿真开关，测试驱动固定为 `false`（不开启仿真）
- `settings`: 空对象 `{}`
- `commands`: 空数组 `[]`（如需要可添加指令）
- `events`: 空数组 `[]`（如需要可添加事件）

**测试驱动点位规则：**
- 不需要 `area`、`offset`、`dataType` 等协议字段
- 只需要基础字段：`id`、`name`、`policy`、`unit`、`fixed` 等
- 不需要调用 `$K driver-schema`

### 仿真驱动说明

"仿真驱动"与"测试驱动"含义相同，都是指用于测试/模拟设备的驱动。两者使用相同的固定配置（见上文"测试驱动配置"）。

**用户意图判断：**
- 用户说"测试驱动"、"仿真驱动"、"模拟驱动"、"demo 驱动"等 → 使用测试驱动配置
- 用户说具体协议驱动（"Modbus"、"OPC UA"、"MQTT"）→ 必须调用 `$K drivers` 检查该驱动是否已安装

### 规划输出格式

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

### ⚠️ 用户确认后才能进入 Phase 3

---

## Phase 3: 表创建与验证

### 3.1 生成 seed.json

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

### 3.2 执行创建

```bash
$K seed --file seed.json    # 建表 + 灌种子数据
```

### 3.3 验证

```bash
$K scan --with-sample       # 验证创建结果
```

**验证要点：**
- 每张表的 `tableMajorType` 是否正确（设备表应为 `device`，不是 `normal`）
- 设备表的 tags 是否正确创建
- 种子数据是否完整写入

如果验证发现问题，修正 seed.json 后重新执行。

---

## Phase 3 后：交接到前端生成（仅数据+前端模式）

> ⚠️ 本节**仅在数据+前端模式（场景二）执行**。数据操作模式（场景一）不会走到这里——它在 [workflow-data-ops.md](workflow-data-ops.md) 报告完数据结果就结束了，**不交接前端、不提"下一步创建项目"**。

数据层创建并验证完成后，将控制权交给 kesi-frontend skill 进行前端生成。

**交接数据：**
- `$K scan --with-sample` 的完整输出（表结构、字段、数据点、样本数据）
- 用户确认的项目类型偏好（大屏可视化 vs 中台管理）

**交接指令：**
告诉用户：`数据层已就绪。现在切换到 kesi-frontend skill 生成前端项目规划报告。`

> **下一步 skill：`kesi-frontend`**
>
> kesi-frontend skill 将读取 scan 数据，生成前端规划报告（页面结构、数据映射），然后初始化前端项目。
