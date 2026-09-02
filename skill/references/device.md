# 设备管理

设备表（`template: "device"`）是 KESI 物联网平台的核心，具备数据点、时序数据、远程控制、报警等能力。

## 与常规表的区别

| 特性 | 常规表 | 设备表 |
|------|--------|--------|
| 字段定义 | ✅ | ✅ |
| 记录 CRUD | ✅ | ✅ |
| 数据点(tags) | ❌ | ✅ |
| 时序数据 | ❌ | ✅ |
| 远程控制 | ❌ | ✅ |
| 在线状态 | ❌ | ✅ |
| 驱动配置 | ❌ | ✅ |
| 计算节点 | ❌ | ✅ |
| 报警规则 | ❌ | ✅ |

## 详细文档

| 配置项 | 文档 | 说明 |
|--------|------|------|
| 数据点 | [device-tag.md](device-tag.md) | 点位基础+驱动字段、数值转换、点位报警、数据处理、仿真 |
| 指令 | [device-command.md](device-command.md) | 远程控制指令、writeIn/writeOut 配置 |
| 事件 | [device-event.md](device-event.md) | 设备生命周期事件 |
| 报警规则 | [device-warning-rule.md](device-warning-rule.md) | 表级报警规则、jsonlogic 表达式 |
| 计算节点 | [device-computed.md](device-computed.md) | 映射/计算/统计/输入节点 |

## 命令

### 数据点

```bash
$K tags <tableId>                  # 查看表的数据点定义
$K record-tags <table> <recordId>  # 查看记录的数据点值
```

### 时序数据

```bash
$K data-latest --device <id> --tag <tagId>         # 最新数据
$K data-history --device <id> --tag <tagId> \
  --start <ms> --end <ms>                             # 历史数据
```

### 设备控制

```bash
$K control-send --device <id> --tag <tag> --value <val>  # 单个控制
$K control-batch --file commands.json                     # 批量控制
```

### 在线统计

```bash
$K stats-online <tableId1> <tableId2> ...
```

### 驱动管理

```bash
$K drivers                       # 列出驱动实例
$K driver <id>                   # 驱动详情
$K driver-schema <driverType>    # 驱动 schema（点位必填字段、settings 配置）
$K driver-catalog [--search kw]  # 驱动目录（可安装列表，含已安装注记）
```

**实例 state 枚举**：`none`（未创建）/ `restarting`（重启中）/ `running`（运行中）/ `stop`（停止）。
平台没有所需驱动时，走 [workflow-driver-create.md](workflow-driver-create.md) 自动创建安装。

## ⚠️ 设备表创建要点

### 创建流程

```
0. $K drivers                        → 无可用驱动？走 workflow-driver-create.md 创建安装
1. $K drivers                        → 选择驱动
2. $K driver <id>                    → 获取 settings 配置
3. $K driver-schema <driverType>     → 获取点位字段定义
4. 组装 JSON → $K table-create       → 创建设备表
```

### 必须正确的三项

1. **`template: "device"`** — 标记为设备表模板
2. **`function: ["device", "warning", "computed"]`** — 必须包含 `"device"`
3. **`device` / `computed` / `warning`** — 使用正确的 JSON 结构

### 设备表 7 个预设字段

固定预设字段（CLI 写前校验，缺项/改属性直接拒绝），照抄下表：

| key | title | type | controlType | need |
|-----|-------|------|-------------|------|
| `id` | 设备编号 | string | text | true |
| `name` | 设备名称 | string | text | true |
| `connectTime` | 通信时间 | string | date | false |
| `disable` | 是否禁用 | boolean | boolean | false |
| `online` | 在线 | boolean | boolean | false |
| `off` | 断电 | boolean | boolean | false |
| `warnFlag` | 报警状态 | boolean | boolean | false |

formLayout 固定 `cols: 3, labelLayout: "vertical"`，6 行填满（最后一行只有 warnFlag，占 1 格）。

### ⚠️ 驱动信息必须来自用户指定或 `$K drivers` 查询

- 用户指定驱动时，必须使用用户给出的驱动配置（driver/groupId），不能自行猜测或使用其他驱动
- 驱动关联字段只有 `driver` 和 `groupId`（CLI 拒绝写入废弃的 `driverType`/`driverName`/`driverExampleId`/`driverGroupId`）
- 测试驱动特征：`driver: "test"`, `groupId: "test"`；点位只要 id/name/policy（CLI 拒绝写入 area/offset 等协议字段）
- 测试驱动完整配置详见 [workflow-full.md](workflow-full.md#测试驱动配置)

### 驱动字段映射

⚠️ **驱动关联字段必须来自 `$K drivers` 和 `$K driver <id>` 的返回值**

| device 字段 | 来源 | 示例值 |
|-------------|------|--------|
| `driver` | 驱动实例的 `driverType` | `"modbus"` |
| `groupId` | 驱动实例的 `groupId` 字段（集群节点实例为其所属集群的 groupId；普通实例默认由后端生成） | `"69f1a55e..."` |
| `settings` | 驱动实例的 `device.settings` | `{ "ip": "127.0.0.1", "port": 502 }` |

### 点位字段

⚠️ **点位的驱动参数必须来自 `$K driver-schema <driverType>` 的返回值**

不同驱动的点位字段完全不同（Modbus 有 area/offset/dataType，OPC UA 有 nodeId，MQTT 有 topic）。

### 创建示例

```json
{
  "id": "my_devices",
  "title": "设备管理",
  "template": "device",
  "function": ["device", "warning", "computed"],
  "schema": {
    "type": "object",
    "name": "my_devices",
    "title": "设备管理",
    "properties": {
      "id": { "key": "id", "type": "string", "controlType": "text", "textContent": "text", "title": "设备编号", "need": true },
      "name": { "key": "name", "type": "string", "controlType": "text", "textContent": "text", "title": "设备名称", "need": true },
      "connectTime": { "key": "connectTime", "type": "string", "controlType": "date", "title": "通信时间", "need": false },
      "disable": { "key": "disable", "type": "boolean", "controlType": "boolean", "title": "是否禁用", "need": false },
      "online": { "key": "online", "type": "boolean", "controlType": "boolean", "title": "在线", "need": false },
      "off": { "key": "off", "type": "boolean", "controlType": "boolean", "title": "断电", "need": false },
      "warnFlag": { "key": "warnFlag", "type": "boolean", "controlType": "boolean", "title": "报警状态", "need": false }
    },
    "formLayout": { "cols": 3, "labelLayout": "vertical" },
    "formSchema": [
      { "key": "id", "colSpan": 1 }, { "key": "name", "colSpan": 1 }, { "key": "connectTime", "colSpan": 1 },
      { "key": "disable", "colSpan": 1 }, { "key": "online", "colSpan": 1 }, { "key": "off", "colSpan": 1 },
      { "key": "warnFlag", "colSpan": 1 }
    ],
    "tableSchema": [
      { "key": "id" }, { "key": "name" }, { "key": "connectTime" },
      { "key": "disable" }, { "key": "online" }, { "key": "off" }, { "key": "warnFlag" }
    ]
  },
  "device": {
    "driver": "<驱动实例的 driverType>",
    "groupId": "<驱动实例的 groupId>",
    "emulator": false,
    "settings": { "ip": "127.0.0.1", "port": 502 },
    "tags": [
      { "id": "temperature", "name": "温度", "policy": "save", "area": 3, "offset": 0, "dataType": "FloatBE" }
    ],
    "commands": [
      { "name": "启动", "showName": "启动", "retry": 3, "tag": { "id": "switch", "name": "开关" }, "ops": [{ "param": "start" }] }
    ],
    "events": [
      { "id": "online", "name": "设备上线" }
    ]
  },
  "computed": {
    "tags": [
      { "id": "dew_point", "name": "露点温度", "type": "compute", "policy": "save" }
    ]
  },
  "warning": {
    "rules": [
      { "id": "temp_high", "warningname": "温度超限", "level": "高", "logic": { "logic": { ">": [{ "var": "temperature" }, 80] }, "type": "jsonlogic" } }
    ]
  }
}
```

## 驱动实例数据结构

| 字段 | 说明 |
|------|------|
| `id` | 驱动实例 ID |
| `name` | 驱动名称 |
| `driverType` | 驱动类型：`modbus`、`opcua`、`mqtt` 等（设备表 device 块的 `driver` 填这个值） |
| `state` | 运行状态：`none`、`restarting`、`running`、`stop` |
| `driverVersion` | 驱动版本 |
| `runMode` | 运行模式：`one`（单驱动）/ `cluster`（集群）/ `node`（集群节点） |
| `groupId` | 集群组 ID（设备表 device 块的 `groupId` 填这个值；集群节点实例 = 其所属集群的 groupId，其余实例由后端创建时生成） |
| `ports` | 端口映射 |
| `device.settings` | 连接参数（ip/port 等） |

集群节点（`runMode: "node"`）创建时必须指定一个已存在的【集群】（`runMode: "cluster"`）驱动实例，节点继承该集群的驱动类型并把集群的 `groupId` 存上，详见 [driver-create.md](driver-create.md#集群节点创建)。

## 关联

- 表管理：[table-management.md](table-management.md)
- 记录管理：[record.md](record.md)
- 报警管理：[warning.md](warning.md)
- 数据点详细：[device-tag.md](device-tag.md)
- 指令详细：[device-command.md](device-command.md)
- 事件详细：[device-event.md](device-event.md)
- 报警规则详细：[device-warning-rule.md](device-warning-rule.md)
- 计算节点详细：[device-computed.md](device-computed.md)
