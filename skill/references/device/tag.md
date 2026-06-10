# 数据点（Tags）

数据点是设备的核心，定义了设备采集哪些数据、如何采集、如何处理。

## 命令

```bash
# 查看表的所有数据点
kesi tags <tableId>

# 查看记录的数据点值
kesi record-tags <table> <recordId>

# 查询驱动 schema（获取点位必填字段和枚举值）
kesi driver-schema <driverType>
# 例: kesi driver-schema modbus
```

## ⚠️ 创建流程

**创建设备表时，点位的驱动参数（如 Modbus 的 area/offset/dataType）不是随意填写的，必须先查询驱动 schema：**

```bash
# 1. 查询可用驱动
kesi drivers

# 2. 获取驱动的点位字段定义（必填字段、枚举值等）
kesi driver-schema modbus
```

从 `driver-schema` 返回的 `model.tags.required` 和 `model.tags.fields` 可以得知：
- 哪些字段必填
- 每个字段的类型、枚举值、说明

**不同驱动的点位字段完全不同**（Modbus 有 area/offset/dataType，OPC UA 有 nodeId，MQTT 有 topic 等）。

## 点位完整字段

点位字段分两层：**基础字段**（所有驱动通用）+ **驱动字段**（来自 `kesi driver-schema`）。

### 基础字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 点位标识，在表中唯一 |
| `name` | string | ✅ | 点位名称 |
| `policy` | string | | 存储策略：`save`(存储) / `change`(变化时存储) / `drop`(丢弃) / `period`(周期存储) |
| `rw` | boolean | | 是否可读写 |
| `unit` | string | | 单位（如 ℃、%、MPa） |
| `fixed` | number | | 小数位数 |
| `mod` | number | | 缩放比例 |
| `value` | string | | 默认值 |
| `polish` | boolean | | 小数补零 |
| `noDataValue` | number | | 未采集数据时显示值 |

### 驱动字段（以 Modbus 为例）

通过 `kesi driver-schema modbus` 获取。Modbus 的必填驱动字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `area` | number | ✅ | 读取区域：`1`=线圈状态, `2`=输入状态, `3`=保持寄存器, `4`=输入寄存器 |
| `offset` | number | ✅ | 偏移地址 |
| `dataType` | string | ✅ | 数据类型：`Int8`, `UInt8`, `Int16BE`, `FloatBE`, `Boolean`, `String` 等 41 种 |

### 高级配置

#### 数值转换 — `tagValue`

```json
{
  "tagValue": {
    "minRaw": 0,
    "maxRaw": 100,
    "minValue": 0,
    "maxValue": 10,
    "enum": [
      { "value": "0", "label": "停止" },
      { "value": "1", "label": "运行" }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `minRaw` / `maxRaw` | number | 原始值范围 |
| `minValue` / `maxValue` | number | 映射后的目标范围（线性缩放） |
| `enum` | Array<{value, label}> | 离散值映射（显示文本） |

基础字段 `mod`(缩放比例) 和 `fixed`(小数位数) 也参与数值转换。

#### 数据处理 — `range`

```json
{
  "range": {
    "enable": true,
    "method": "valid",
    "conditions": [
      {
        "mode": "number",
        "condition": "range",
        "minValue": 0,
        "maxValue": 100
      }
    ],
    "active": "discard"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `enable` | boolean | 启用开关 |
| `method` | string | `"valid"`(有效范围) / `"invalid"`(无效范围) |
| `conditions` | RangeCondition[] | 范围条件列表 |
| `active` | string | 越界操作：`"fixed"`(替换值) / `"boundary"`(钳位) / `"discard"`(丢弃) / `"latest"`(用上次有效值) |
| `fixedValue` | number | 当 active=fixed 时使用的替换值 |

**RangeCondition：**

| 字段 | 说明 |
|------|------|
| `mode` | `"number"`(数值) / `"rate"`(变化率) / `"delta"`(差值) |
| `condition` | `"range"`(范围内) / `"greater"`(大于) / `"less"`(小于) |
| `minValue` / `maxValue` | 范围边界（condition=range 时） |
| `value` | 阈值（condition=greater/less 时） |

#### 点位级报警 — `rules`

每个点位可以单独配置报警阈值（区别于表级 `warning.rules`）：

```json
{
  "rules": {
    "low": 10,
    "high": 80,
    "llow": 0,
    "hhigh": 100,
    "globalSetting": {
      "interval": 60,
      "handle": true,
      "delay": 5
    }
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `llow` | number | 低低阈值 → 高级报警 |
| `low` | number | 低阈值 → 中级报警 |
| `high` | number | 高阈值 → 中级报警 |
| `hhigh` | number | 高高阈值 → 高级报警 |
| `globalSetting` | WarnSetting | 全局报警设置 |
| `llowSetting` / `lowSetting` / `highSetting` / `hhighSetting` | WarnSetting | 每级别独立设置 |

**WarnSetting（报警设置）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `interval` | number | 报警间隔（秒） |
| `delay` | number | 延时提醒时长（秒） |
| `delayTriggerLimit` | number | 报警计次（连续 N 次才触发） |
| `deadZone` | number | 报警死区 |
| `handle` | boolean | 需要人工处理 |
| `disable` | boolean | 禁用此规则 |
| `audioAlert` | boolean | 声音提醒 |
| `alert` | boolean | 次数提醒 |
| `timeoutSetting` | {value, unit} | 超时自动处理 |
| `executionSetting` | object | 报警有效期（调度） |
| `blockSetting` | {type, blackList, whiteList} | 设备黑白名单 |

#### 其他报警 — `sameValueWarn` / `timeoutWarn`

```json
{
  "sameValueWarn": {
    "show": true,
    "level": "中",
    "warnIntervalObj": { "count": 30, "unit": "m" }
  },
  "timeoutWarn": {
    "show": true,
    "level": "高",
    "warnIntervalObj": { "count": 10, "unit": "m" }
  }
}
```

| 字段 | 说明 |
|------|------|
| `sameValueWarn` | 值长时间不变时报警 |
| `timeoutWarn` | 超时无数据更新时报警 |
| `level` | `"低"` / `"中"` / `"高"` |
| `warnIntervalObj` | `{count: 数量, unit: "s"/"m"}` |

#### 仿真配置 — `emulator`

```json
{
  "emulator": {
    "min": 20,
    "max": 80,
    "type": "random",
    "step": 1
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `min` | number | 仿真最小值 |
| `max` | number | 仿真最大值 |
| `type` | string | `"random"`(随机) / `"linear"`(线性递增) |
| `step` | number | 线性步进值 |

#### 时间戳格式 — `timeFormat`

```json
{
  "timeFormat": {
    "hasFormat": true,
    "format": "YYYY-MM-DD HH:mm:ss"
  }
}
```

## 点位创建示例

```json
{
  "id": "temperature",
  "name": "温度",
  "policy": "save",
  "unit": "℃",
  "fixed": 1,
  "mod": 0.1,
  "area": 3,
  "offset": 0,
  "dataType": "FloatBE",
  "tagValue": {
    "minRaw": 0,
    "maxRaw": 1000,
    "minValue": 0,
    "maxValue": 100
  },
  "rules": {
    "low": 10,
    "high": 80,
    "hhigh": 100
  },
  "range": {
    "enable": true,
    "method": "valid",
    "conditions": [{ "mode": "number", "condition": "range", "minValue": -40, "maxValue": 120 }],
    "active": "discard"
  }
}
```

## 关联

- 设备表总览：[device.md](../device.md)
- 指令：[command.md](command.md)
- 事件：[event.md](event.md)
- 表级报警规则：[warning-rule.md](warning-rule.md)
- 计算节点：[computed.md](computed.md)
