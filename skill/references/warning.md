# 报警系统

KESI 报警系统分为两部分：**报警规则**（定义什么条件触发报警）和 **报警事件**（实际触发的报警记录）。

## 报警规则（Rules）

定义监控条件，当设备数据满足条件时自动产生报警。

### 命令

```bash
# 列出所有规则
kesi rules list [-f filter] [-l limit] [--with-count]

# 获取规则详情
kesi rules get <id>

# 创建规则
kesi rules create -n "温度超限" -l 3 -e true -d "温度超过80度触发"

# 更新规则
kesi rules update <id> -n "新名称" -l 2 --enable false

# 删除规则
kesi rules delete <id>
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `-n` / `--name` | 规则名称（必填） |
| `-l` / `--level` | 报警级别（必填）：1=提示 2=一般 3=重要 4=严重 |
| `-e` / `--enable` | 是否启用 |
| `-d` / `--description` | 描述 |

### ⚠️ 表级报警规则 vs 独立报警规则

有两种报警规则：

1. **独立报警规则**（`/warning/rule` API）：通过 `kesi rules create` 管理
2. **表级报警规则**（嵌入表 schema 的 `warning` 字段）：在创建设备表时定义

### 表级报警规则结构

⚠️ **字段名是 `warningname`，不是 `name`**
⚠️ **`level` 是字符串类型（`"低"/"中"/"高"` 或 `"1"/"2"/"3"`），不是数字**

```json
{
  "warning": {
    "rules": [
      {
        "id": "temp_high",
        "warningname": "温度超限报警",
        "description": "当温度超过80℃时触发",
        "level": "高",
        "alert": true,
        "handle": true,
        "logic": {
          "logic": { ">": [{ "var": "temperature" }, 80] },
          "type": "jsonlogic"
        },
        "fieldName": ["temperature"],
        "disable": false
      }
    ]
  }
}
```

#### WarningRule 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 规则ID |
| `warningname` | string | ⚠️ 规则名称（不是 `name`） |
| `description` | string | 报警描述 |
| `level` | string | ⚠️ 报警级别：`"低"` / `"中"` / `"高"` 或 `"1"` / `"2"` / `"3"` |
| `alert` | boolean | 报警次数提醒 |
| `handle` | boolean | 报警处理 |
| `logic` | object | 报警逻辑 `{ logic, type: "jsonlogic"|"jsLogic" }` |
| `fieldName` | string[] | 关联字段名 |
| `disable` | boolean | 是否禁用 |
| `type` | string[] | 报警分类ID |
| `listType` | string | 范围限定：`"nolimit"` / `"black"` / `"white"` |
| `whiteList` | string[] | 白名单设备ID |
| `blackList` | string[] | 黑名单设备ID |
| `delayFull` | any | 报警触发周期 |
| `delay` | number | 延时提醒时长（秒） |
| `interval` | number | 报警合并间隔（秒） |
| `deadZone` | number | 报警死区 |
| `triggerLimit` | number | 报警次数上限 |
| `executionSetting` | object | 执行有效期设置 |

## 报警事件（Warnings）

设备数据触发规则后产生的报警记录。

### ⚠️ 查询限制

**`warning/warning` 不支持 `projectAll`**，查询时必须用 `project` 指定返回字段（MongoDB 投影格式）。CLI 已内置处理，无需手动指定。

### 命令

```bash
# 列出报警
kesi warnings list [--level 低/中/高] [--status 未确认/已确认] [--processed 未处理/已处理] [--table-id <id>] [--device-id <id>] [--keyword <text>] [-l limit]

# 获取报警详情
kesi warnings get <id>

# 确认报警（已知晓）
kesi warnings confirm <id> -n "已确认" --user-id <userId>

# 解决报警
kesi warnings resolve <id> -n "已修复"

# 批量确认
kesi warnings batch-confirm <id1> <id2> -n "批量确认"

# 报警统计
kesi warnings stats

# 最新报警（如后端不支持 /latest 端点，自动降级为 list + 时间倒序）
kesi warnings latest [-l 10]
```

### 报警事件字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 报警 ID |
| `time` | string | 报警时间（ISO 8601） |
| `type` | string[] | 报警规则类型 ID 列表 |
| `level` | string | 级别：`"低"` / `"中"` / `"高"` |
| `status` | string | 确认状态：`"未确认"` / `"已确认"` |
| `processed` | string | 处理状态：`"未处理"` / `"已处理"` |
| `handle` | boolean | 是否需要处理 |
| `tableID` | string | ⚠️ 数据表 ID（注意：不是 `table` 对象） |
| `tableDataID` | string | ⚠️ 设备 ID（注意：不是 `tableData` 对象，且大写 D） |
| `desc` | string | 报警描述 |
| `remark` | string | 处理备注 |
| `fields` | WarningField[] | 触发报警的点位列表（完整 tag 对象） |
| `confirmUser` | {id, name} | 确认人 |
| `confirmTime` | string | 确认时间 |
| `handleUser` | {id, name} | 处理人 |
| `handleTime` | string | 处理时间 |

### 报警级别

> ⚠️ 报警级别在不同场景下使用不同编码方式：

| 场景 | 编码方式 | 示例 |
|------|----------|------|
| **CLI `kesi rules create`**（独立规则） | 数字 1-4 | `-l 3` |
| **表级规则**（嵌入表 schema `warning.rules`） | 中文字符串 | `"低"` / `"中"` / `"高"` |
| **前端报警事件**（`warning/warning` 查询结果） | 中文字符串 | `"低"` / `"中"` / `"高"` |

**数字编码（CLI 独立规则）：**

| level | 名称 | 说明 |
|-------|------|------|
| 1 | 提示 | 一般信息通知 |
| 2 | 一般 | 需要关注但不紧急 |
| 3 | 重要 | 需要尽快处理 |
| 4 | 严重 | 必须立即处理 |

**中文字符串（表级规则 & 前端）：**

| level | 说明 |
|-------|------|
| `"低"` | 低级别报警 |
| `"中"` | 中级别报警 |
| `"高"` | 高级别报警 |

### 报警状态流转

```
未处理(0) → 已确认(1) → 已解决(2)
                         ↘ 已关闭(3)
```

## 关联

- 设备表通过 `function: ["device", "warning", "computed"]` 启用报警
- 设备管理见 [device.md](device.md)
