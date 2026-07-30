# 报警规则（Warning Rules）

表级报警规则定义在 `warning.rules` 数组中，支持 jsonlogic 表达式，可跨多个数据点组合判断。

⚠️ 区别于点位的 `rules` 字段（单点阈值报警），表级报警规则支持复杂逻辑表达式。

## 命令

```bash
# 报警规则管理
$K rules list                    # 查询规则列表
$K rules get <id>                # 规则详情
$K rules create -n <name> -l <level>  # 创建规则
$K rules update <id>             # 更新规则
$K rules delete <id>             # 删除规则

# 报警事件管理
$K warnings list                 # 报警列表
$K warnings get <id>             # 报警详情
$K warnings confirm <id>         # 确认报警
$K warnings resolve <id>         # 标记恢复
$K warnings stats                # 报警统计
```

---

## 查询报警类型（warningkind）

创建报警规则前，需要先查询可用的报警类型。

```bash
# 查询系统设置（包含报警类型）
$K query-get core/setting
```

### 返回数据结构

```json
{
  "warning": {
    "alarm_card": true,
    "alarm_sound": true,
    "show_all": true,
    "show_recovery": true,
    "warningkind": [
      {
        "id": "ada21497-888f-4f6d-acc3-cb04250d8037",
        "name": "超限报警",
        "alert": true,
        "fix": true,
        "handle": true,
        "show": true
      },
      {
        "id": "61024533-e716-439d-bf3f-e8f2a5c99128",
        "name": "仪表故障",
        "alert": true,
        "fix": true,
        "handle": true,
        "show": true
      },
      {
        "id": "1f849be4-2907-4459-9665-3fda916bf286",
        "name": "其他报警",
        "alert": true,
        "fix": true,
        "handle": true,
        "show": true
      },
      {
        "id": "1d345be4-2567-4764-7890-3ghj278vb342",
        "name": "数值超限",
        "alert": true,
        "fix": true,
        "handle": true,
        "show": true
      },
      {
        "id": "1z875be4-2267-4564-7790-4kij278vb342",
        "name": "驱动掉线报警",
        "alert": true,
        "fix": true,
        "handle": true,
        "show": true
      },
      {
        "id": "1z875xn8-2237-4544-7770-4kix918vb342",
        "name": "常规表数据报警",
        "alert": true,
        "fix": true,
        "handle": true,
        "show": true
      },
      {
        "id": "1z875zt8-2357-4664-7756-4kfg9vzyu672",
        "name": "采集数据类型不一致",
        "alert": true,
        "fix": true,
        "handle": true,
        "show": true
      }
    ]
  }
}
```

### 常用报警类型

| ID（示例） | 名称 | 说明 |
|-----------|------|------|
| `ada21497-...` | 超限报警 | 数值超出阈值 |
| `61024533-...` | 仪表故障 | 仪表设备故障 |
| `1f849be4-...` | 其他报警 | 其他类型报警 |
| `1d345be4-...` | 数值超限 | 数值超出范围 |
| `1z875be4-...` | 驱动掉线报警 | 驱动连接断开 |
| `1z875xn8-...` | 常规表数据报警 | 常规表数据异常 |
| `1z875zt8-...` | 采集数据类型不一致 | 数据类型不匹配 |

> ⚠️ **注意**：报警类型 ID 和名称因平台而异，必须通过接口查询获取。

### 使用方式

创建报警规则时，`type` 字段使用报警类型 ID 数组：

```json
{
  "type": ["ada21497-888f-4f6d-acc3-cb04250d8037"]
}
```

如果规则属于多个报警类型，可以传多个 ID：

```json
{
  "type": [
    "ada21497-888f-4f6d-acc3-cb04250d8037",
    "1d345be4-2567-4764-7890-3ghj278vb342"
  ]
}
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
| `type` | string[] | ✅ | 报警类型 ID 数组，从 `/core/setting.warning.warningkind` 获取 |
| `level` | string | | 报警级别：`"低"` / `"中"` / `"高"` |
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
  "type": ["ada21497-888f-4f6d-acc3-cb04250d8037"],
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
  "type": ["ada21497-888f-4f6d-acc3-cb04250d8037"],
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
  "type": ["ada21497-888f-4f6d-acc3-cb04250d8037"],
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
