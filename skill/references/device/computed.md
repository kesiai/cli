# 计算节点（Computed）

计算节点基于数据点的原始值进行二次计算，如露点温度、平均值、运行时长等。

计算节点定义在设备表的 `computed.tags` 数组中。

⚠️ **注意**：字段名是 `computed.tags`（不是 `computed.nodes`）。

## 通用字段（所有类型）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 节点标识 |
| `name` | string | ✅ | 节点名称 |
| `type` | string | ✅ | 节点类型：`compute` / `stats` / `mapping` / `input` |
| `policy` | string | | 存储策略：`save` / `change` / `drop`（默认 `save`） |
| `unit` | string | | 单位 |
| `fixed` | number | | 小数位数 |
| `polish` | boolean | | 小数补零 |
| `errview` | string | | 超时显示：`"不显示当前值"` / `"显示当前值"`（仅 mapping/stats） |
| `remark` | string | | 备注 |
| `tagValue` | object | | 值映射 `{ enum: [{value, label}] }` |
| `showInTableSetting` | object | | 列表显示配置 `{ freshInterval, selectFieldKey }` |

---

## type = `"compute"` — 计算值

通过公式对数据点值做数学运算。

### 计算公式 — `logic`

公式有两种模式，由 `logic.type` 区分：

#### 模式 A：jsonlogic（选择器）

```json
{
  "logic": {
    "type": "jsonlogic",
    "logic": { "/": [{ "+": [{ "var": ["tag1_temp"] }, { "var": ["tag2_temp"] }] }, 2] }
  }
}
```

支持的操作符：

| 类别 | 操作符 | 示例 |
|------|--------|------|
| 算术 | `+` `-` `*` `/` `%` | `{ "+": [{ "var": ["a"] }, 1] }` |
| 比较 | `==` `!=` `<` `>` `<=` `>=` | `{ ">": [{ "var": ["temp"] }, 80] }` |
| 逻辑 | `and` `or` `!` | `{ "and": [expr1, expr2] }` |
| 引用变量 | `{ "var": ["tagId"] }` | `{ "var": ["temperature"] }` |

#### 模式 B：jsLogic（公式编辑器）

```json
{
  "logic": {
    "type": "jsLogic",
    "jsLogic": "{#{{tag1}} + {{tag2}} * 0.5#}",
    "origin": [
      { "type": "variable", "children": [{"text":""}], "variable": {"path":"tag1","title":"温度","dataType":"number"} },
      { "text": " + " },
      { "type": "variable", "children": [{"text":""}], "variable": {"path":"tag2","title":"压力","dataType":"number"} },
      { "text": " * 0.5" }
    ],
    "error": null
  }
}
```

| 字段 | 说明 |
|------|------|
| `jsLogic` | 公式字符串，用 `{# ... #}` 包裹，变量用 `{{tagId}}` 引用 |
| `origin` | 富文本节点数组（Slate 编辑器格式） |
| `error` | esprima 解析错误，null 表示无错误 |

### 触发方式

| 字段 | 类型 | 说明 |
|------|------|------|
| `triggerMethod` | string | `"tag"`(数据点变化时触发) / `"time"`(定时触发) |
| `noDataValue` | number | 公式中引用的数据点无数据时的替代值 |

**triggerMethod = `"tag"` 时的额外字段：**

| 字段 | 说明 |
|------|------|
| `triggerSpecType` | `"any"`(任意参数变化) / `"specific"`(指定参数变化) |
| `triggerTag` | 指定触发计算的 tag ID（triggerSpecType=specific 时） |

**triggerMethod = `"time"` 时的额外字段：**

| 字段 | 说明 |
|------|------|
| `setMethod` | `"custom"`(自定义时间) / `"classes"`(按班次) |
| `statsInterval` | 周期间隔字符串，如 `"1d"`, `"2h"`, `"30m"`, `"1week"`, `"1month"` |
| `startTime` | 起始时间配置 `{ month?, day?, weekday?, hms? }` |
| `bcTable` | 班次表引用（setMethod=classes 时） |
| `bcTableData` | 班次记录引用（setMethod=classes 时） |

### startTime 结构

根据 `statsInterval` 的单位，显示不同字段：

| 间隔单位 | 显示字段 |
|----------|---------|
| `year` / `season` | month + day + hms |
| `month` | day + hms |
| `week` | weekday + hms |
| `d` | hms (`"HH:mm:ss"`) |
| `h` | hms (`"HH:mm"`) |
| `m` | hms (`"mm"`) |

```json
{ "month": 1, "day": 1, "hms": "00:00:00" }
```

### compute 完整示例

```json
{
  "type": "compute",
  "id": "temp_avg",
  "name": "平均温度",
  "unit": "℃",
  "policy": "save",
  "fixed": 2,
  "polish": true,
  "logic": {
    "type": "jsLogic",
    "jsLogic": "{#({{temperature}} + {{humidity}}) / 2#}",
    "origin": [
      { "text": "(" },
      { "type": "variable", "children": [{"text":""}], "variable": {"path":"temperature","title":"温度","dataType":"number"} },
      { "text": " + " },
      { "type": "variable", "children": [{"text":""}], "variable": {"path":"humidity","title":"湿度","dataType":"number"} },
      { "text": ") / 2" }
    ],
    "error": null
  },
  "noDataValue": 0,
  "triggerMethod": "tag",
  "triggerSpecType": "any"
}
```

---

## type = `"stats"` — 统计值

对数据点进行时间窗口内的聚合统计。

### 统计方法 — `statsMethod`

| 值 | 说明 | 额外必填字段 |
|----|------|-------------|
| `rate` | 变化率 | — |
| `abs` | 绝对值变化率 | — |
| `count` | 计数 | setMethod + statsInterval + startTime |
| `min` | 最小值 | setMethod + statsInterval + startTime |
| `max` | 最大值 | setMethod + statsInterval + startTime |
| `mean` | 平均值 | setMethod + statsInterval + startTime |
| `sum` | 求和 | setMethod + statsInterval + startTime |
| `first` | 首个值 | setMethod + statsInterval + startTime |
| `last` | 最末值 | setMethod + statsInterval + startTime |
| `difference` | 时段差 | triggerMethod + startTime + endTime |
| `yoy` | 同比比值 | statsInterval |
| `mom` | 环比值 | statsInterval |
| `cumuyoy` | 累计同比比值 | statsInterval |
| `totalCumulate` | 累计值 | statsInterval + startTime |
| `cumulate` | 单位增量 | timeBase |
| `runtime` | 运行时长 | statsVal + runtimeInterval + showSetting + triggerMethod |
| `offlinestatus` | 掉线查询 | statsInterval + startTime |
| `preDifference` | 数据差值 | preType |

### stats 专用字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `statsTag` | string | 统计目标的数据点 ID |
| `statsMethod` | string | 统计方法（见上表） |
| `setMethod` | string | 时间模式：`"custom"` / `"classes"`(按班次) |
| `statsInterval` | string | 统计周期：`"1d"`, `"2h"`, `"30m"`, `"1week"`, `"1month"` 等 |
| `startTime` | object | 起始时间 |
| `endTime` | object | 结束时间（仅 difference） |
| `preType` | string | 差值参考项：`"first"` / `"second"` / `"third"`（仅 preDifference） |
| `timeBase` | number | 时间基准（秒）（仅 cumulate） |
| `statsVal` | number | 状态值定义（仅 runtime） |
| `runtimeInterval` | string | 运行时长单位：`""`(驱动间隔) / `"h"` / `"m"` / `"s"` |
| `showSetting` | object | 显示配置（仅 runtime） |
| `triggerMethod` | string | 触发模式（difference/runtime） |
| `bcTable` | object | 班次表引用（setMethod=classes） |
| `bcTableData` | object | 班次记录引用（setMethod=classes） |

### showSetting（仅 runtime）

```json
{
  "unit": "h",
  "fixed": 2,
  "policy": "round"
}
```

| 字段 | 说明 |
|------|------|
| `unit` | 显示单位：`"s"` / `"m"` / `"h"` / `"d"` |
| `fixed` | 小数位数 |
| `policy` | 取整方式：`"round"` / `"ceil"` / `"floor"`（unit ≠ s 时） |

### stats 完整示例

**日平均温度：**

```json
{
  "type": "stats",
  "id": "temp_avg_daily",
  "name": "日平均温度",
  "unit": "℃",
  "policy": "save",
  "fixed": 1,
  "statsMethod": "mean",
  "statsTag": "temperature",
  "setMethod": "custom",
  "statsInterval": "1d",
  "startTime": { "hms": "00:00:00" }
}
```

**设备运行时长：**

```json
{
  "type": "stats",
  "id": "run_duration",
  "name": "运行时长",
  "statsMethod": "runtime",
  "statsTag": "switch",
  "statsVal": 1,
  "runtimeInterval": "h",
  "showSetting": { "unit": "h", "fixed": 2, "policy": "round" },
  "triggerMethod": "time",
  "setMethod": "custom",
  "statsInterval": "1d",
  "startTime": { "hms": "00:00:00" }
}
```

---

## type = `"mapping"` — 映射值

从其他表/设备引用数据点。

### mapping 字段

```json
{
  "type": "mapping",
  "id": "ref_temp",
  "name": "参考温度",
  "policy": "save",
  "mapping": {
    "id": "temperature",
    "name": "温度传感器1",
    "table": "other_devices",
    "tableData": {
      "id": "device_001",
      "name": "设备A",
      "table": { "id": "other_devices" }
    }
  },
  "savePolicyAuto": true,
  "errview": "显示当前值"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `mapping` | object | 映射引用（见结构） |
| `mapping.id` | string | 引用的数据点 ID |
| `mapping.name` | string | 引用的数据点名称 |
| `mapping.table` | string | 来源表 ID |
| `mapping.tableData` | object | 来源设备 `{ id, name, table: { id } }` |
| `notExtend` | boolean | 额外映射内容标记 |
| `savePolicyAuto` | boolean | 继承数据存储策略 |

---

## type = `"input"` — 输入值

手动输入的静态常量。

```json
{
  "type": "input",
  "id": "manual_factor",
  "name": "手动系数",
  "policy": "save",
  "value": 1.5
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `value` | number | 静态输入值 |

---

## statsInterval 格式

由数字 + 单位组成：`<number><unit>`

| 单位 | 说明 | 示例 |
|------|------|------|
| `s` | 秒 | `"30s"` |
| `m` | 分钟 | `"15m"`, `"30m"` |
| `h` | 小时 | `"1h"`, `"2h"` |
| `d` | 天 | `"1d"`, `"7d"` |
| `week` | 周 | `"1week"` |
| `month` | 月 | `"1month"` |
| `season` | 季度 | `"1season"` |
| `year` | 年 | `"1year"` |

## 关联

- 设备表总览：[device.md](../device.md)
- 数据点：[tag.md](tag.md)
- 报警规则：[warning-rule.md](warning-rule.md)
