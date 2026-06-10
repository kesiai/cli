# 报警规则（Warning Rules）

表级报警规则定义在 `warning.rules` 数组中，支持 jsonlogic 表达式，可跨多个数据点组合判断。

⚠️ 区别于点位的 `rules` 字段（单点阈值报警），表级报警规则支持复杂逻辑表达式。

## 命令

```bash
# 报警规则管理
kesi rules list                    # 查询规则列表
kesi rules get <id>                # 规则详情
kesi rules create -n <name> -l <level>  # 创建规则
kesi rules update <id>             # 更新规则
kesi rules delete <id>             # 删除规则

# 报警事件管理
kesi warnings list                 # 报警列表
kesi warnings get <id>             # 报警详情
kesi warnings confirm <id>         # 确认报警
kesi warnings resolve <id>         # 标记恢复
kesi warnings stats                # 报警统计
```

## 规则数据结构（WarningRule）

```json
{
  "id": "temp_high",
  "warningname": "温度超高报警",
  "description": "温度超过80℃触发",
  "level": "高",
  "alert": true,
  "handle": true,
  "logic": {
    "logic": { ">": [{ "var": "temperature" }, 80] },
    "type": "jsonlogic"
  },
  "fieldName": ["temperature"],
  "disable": false,
  "executionSetting": {
    "disable": false,
    "executionType": {}
  },
  "timeoutSetting": { "value": 1, "unit": "h" },
  "separateAlert": false,
  "broadcastContent": "",
  "timesOfPlay": 1,
  "listType": "nolimit",
  "whiteList": [],
  "blackList": []
}
```

### 基础字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 规则标识 |
| `warningname` | string | ✅ | 规则名称（⚠️ 字段名是 `warningname` 不是 `name`） |
| `level` | string | ✅ | 报警级别：`"低"` / `"中"` / `"高"` |
| `logic` | WarningRuleLogic | ✅ | 报警逻辑表达式 |
| `description` | string | | 描述 |
| `alert` | boolean | | 声音提醒 |
| `handle` | boolean | | 需要人工处理 |
| `disable` | boolean | | 禁用 |
| `fieldName` | string[] | | 关联的数据点 ID 列表 |

### WarningRuleLogic — 报警逻辑

```json
{
  "logic": { ">": [{ "var": "temperature" }, 80] },
  "type": "jsonlogic"
}
```

| 字段 | 说明 |
|------|------|
| `logic` | jsonlogic 表达式（`{var: "tagId"}` 引用数据点值） |
| `type` | `"jsonlogic"` 或 `"jsLogic"` |

#### 常用 jsonlogic 操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `>` | 大于 | `{ ">": [{ "var": "temperature" }, 80] }` |
| `<` | 小于 | `{ "<": [{ "var": "pressure" }, 0.2] }` |
| `>=` | 大于等于 | `{ ">=": [{ "var": "humidity" }, 90] }` |
| `<=` | 小于等于 | |
| `==` | 等于 | `{ "==": [{ "var": "status" }, 0] }` |
| `and` | 与 | `{ "and": [expr1, expr2] }` |
| `or` | 或 | `{ "or": [expr1, expr2] }` |
| `!` | 非 | `{ "!": expr }` |

### 高级配置

#### executionSetting — 报警有效期

```json
{
  "executionSetting": {
    "disable": false,
    "executionType": {
      "execution": { "weekCycle": [1, 2, 3, 4, 5] }
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `disable` | 是否启用（false=启用） |
| `executionType.execution` | 周期配置（secondCycle/minuteCycle/hourCycle/dayCycle/weekCycle/monthCycle/yearCycle） |
| `executionType.specifyConditions` | 指定条件 |

#### timeoutSetting — 超时处理

```json
{ "timeoutSetting": { "value": 1, "unit": "h" } }
```

| 字段 | 说明 |
|------|------|
| `value` | 数值 |
| `unit` | `"d"`(天) / `"h"`(小时) / `"m"`(分钟) |

#### 广播与提醒

| 字段 | 类型 | 说明 |
|------|------|------|
| `broadcastContent` | string | 播报内容（支持 `{{tableDataName}}`、`{{desc}}` 变量） |
| `timesOfPlay` | number | 播放次数 |
| `separateAlert` | boolean | 分离报警 |

#### 范围限定

| 字段 | 类型 | 说明 |
|------|------|------|
| `listType` | string | `"nolimit"` / `"black"` / `"white"` |
| `whiteList` | string[] | 白名单 |
| `blackList` | string[] | 黑名单 |

#### 延时与限次

| 字段 | 类型 | 说明 |
|------|------|------|
| `delayFull` | object | 延时配置 |
| `triggerLimit` | number | 报警次数上限 |

## 规则示例

### 单点阈值报警

```json
{
  "id": "temp_high",
  "warningname": "温度超高报警",
  "level": "高",
  "alert": true,
  "handle": true,
  "description": "温度超过80℃触发",
  "logic": {
    "logic": { ">": [{ "var": "temperature" }, 80] },
    "type": "jsonlogic"
  }
}
```

### 组合条件报警

```json
{
  "id": "temp_humidity",
  "warningname": "温湿度同时异常",
  "level": "高",
  "alert": true,
  "handle": true,
  "description": "温度>60且湿度>85时触发",
  "logic": {
    "logic": { "and": [
      { ">": [{ "var": "temperature" }, 60] },
      { ">": [{ "var": "humidity" }, 85] }
    ]},
    "type": "jsonlogic"
  }
}
```

### 带有效期的工作时间报警

```json
{
  "id": "pressure_work",
  "warningname": "工作时段压力报警",
  "level": "中",
  "logic": {
    "logic": { "<": [{ "var": "pressure" }, 0.2] },
    "type": "jsonlogic"
  },
  "executionSetting": {
    "disable": false,
    "executionType": {
      "execution": { "weekCycle": [1, 2, 3, 4, 5] }
    }
  },
  "timeoutSetting": { "value": 30, "unit": "m" }
}
```

## 关联

- 设备表总览：[device.md](../device.md)
- 数据点（含点位级报警）：[tag.md](tag.md)
- 报警管理详细文档：[warning.md](../warning.md)
