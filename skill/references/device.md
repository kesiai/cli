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
| 数据点 | [device/tag.md](device/tag.md) | 点位基础+驱动字段、数值转换、点位报警、数据处理、仿真 |
| 指令 | [device/command.md](device/command.md) | 远程控制指令、writeIn/writeOut 配置 |
| 事件 | [device/event.md](device/event.md) | 设备生命周期事件 |
| 报警规则 | [device/warning-rule.md](device/warning-rule.md) | 表级报警规则、jsonlogic 表达式 |
| 计算节点 | [device/computed.md](device/computed.md) | 映射/计算/统计/输入节点 |

## 命令

### 数据点

```bash
kesi tags <tableId>                  # 查看表的数据点定义
kesi record-tags <table> <recordId>  # 查看记录的数据点值
```

### 时序数据

```bash
kesi data-latest --device <id> --tag <tagId>         # 最新数据
kesi data-history --device <id> --tag <tagId> \
  --start <ms> --end <ms>                             # 历史数据
```

### 设备控制

```bash
kesi control-send --device <id> --tag <tag> --value <val>  # 单个控制
kesi control-batch --file commands.json                     # 批量控制
```

### 在线统计

```bash
kesi stats-online <tableId1> <tableId2> ...
```

### 驱动管理

```bash
kesi drivers                       # 列出驱动实例
kesi driver <id>                   # 驱动详情
kesi driver-schema <driverType>    # 驱动 schema（点位必填字段、settings 配置）
```

## ⚠️ 设备表创建要点

### 创建流程

```
1. kesi drivers                        → 选择驱动
2. kesi driver <id>                    → 获取 settings 配置
3. kesi driver-schema <driverType>     → 获取点位字段定义
4. 组装 JSON → kesi table-create       → 创建设备表
```

### 必须正确的三项

1. **`template: "device"`** — 标记为设备表模板
2. **`function: ["device", "warning", "computed"]`** — 必须包含 `"device"`
3. **`device` / `computed` / `warning`** — 使用正确的 JSON 结构

### ⚠️ 设备表必须包含 7 个预设字段

设备表有固定的预设字段，**创建时必须全部包含**，不能自定义或省略：

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

### ⚠️ 驱动信息必须来自用户指定或 `kesi drivers` 查询

- 用户指定驱动时，必须使用用户给出的驱动配置（driver/driverType/driverName/driverExampleId/groupId/driverGroupId），不能自行猜测或使用其他驱动
- 测试驱动特征：`driver: "test"`, `driverType: "测试驱动"`, `driverExampleId: "test_test"`, `groupId: "test"`, `driverGroupId: "test_test"`
- 测试驱动的点位**不需要** area/offset/dataType 等协议字段，只需要 id/name/policy

### 驱动字段映射

⚠️ **驱动关联字段必须来自 `kesi drivers` 和 `kesi driver <id>` 的返回值**

| device 字段 | 来源 | 示例值 |
|-------------|------|--------|
| `driver` | 驱动实例的 `driverType` | `"modbus"` |
| `driverType` | 驱动实例的 `driverType` | `"modbus"` |
| `driverName` | 驱动实例的 `name` | `"Modbus"` |
| `driverExampleId` | 驱动实例的 `id` | `"69f1a55e..."` |
| `groupId` | 驱动实例的 `id` | `"69f1a55e..."` |
| `driverGroupId` | `"{driverType}_$$_{id}"` | `"modbus_$$_69f1a..."` |
| `settings` | 驱动实例的 `device.settings` | `{ "ip": "127.0.0.1", "port": 502 }` |

### 点位字段

⚠️ **点位的驱动参数必须来自 `kesi driver-schema <driverType>` 的返回值**

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
    "driver": "<driverType>",
    "driverType": "<driverType>",
    "driverName": "<name>",
    "driverExampleId": "<id>",
    "groupId": "<id>",
    "driverGroupId": "<from kesi driver>",
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
| `driverType` | 驱动类型：`modbus`、`opcua`、`mqtt` 等 |
| `state` | 运行状态：`running`、`stopped` |
| `driverVersion` | 驱动版本 |
| `runMode` | 运行模式：`one` |
| `ports` | 端口映射 |
| `device.settings` | 连接参数（ip/port 等） |

## 关联

- 表管理：[table/table.md](table/table.md)
- 记录管理：[record.md](record.md)
- 报警管理：[warning.md](warning.md)
- 数据点详细：[device/tag.md](device/tag.md)
- 指令详细：[device/command.md](device/command.md)
- 事件详细：[device/event.md](device/event.md)
- 报警规则详细：[device/warning-rule.md](device/warning-rule.md)
- 计算节点详细：[device/computed.md](device/computed.md)
