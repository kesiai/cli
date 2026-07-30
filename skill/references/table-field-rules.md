# 字段规则（fieldRules）

字段规则分两类：**交互规则**（mutualRules）和**字段校验**（validations）。

## 结构

```json
{
  "fieldRules": {
    "mutualRules": [ ... ],
    "validations": [ ... ]
  }
}
```

## 交互规则（mutualRules）

根据条件自动控制字段的显示/隐藏/必填/禁用/赋值。

### 结构

```json
{
  "mutualRules": [
    {
      "name": "设备运行时显示运行时长",
      "key": "rule_show_runtime",
      "condition": [
        [
          { "field": "status", "method": "eq", "value": "running" }
        ]
      ],
      "action": [
        { "type": "show", "field": "running_hours" },
        { "type": "setRequire", "field": "running_hours" }
      ],
      "disabled": false
    }
  ]
}
```

### 条件（condition）

`condition` 是二维数组：**外层 OR，内层 AND**。

```json
// status="running" AND type="sensor"  OR  status="fault"
"condition": [
  [
    { "field": "status", "method": "eq", "value": "running" },
    { "field": "type", "method": "eq", "value": "sensor" }
  ],
  [
    { "field": "status", "method": "eq", "value": "fault" }
  ]
]
```

#### 条件方法（method）

| 方法 | 说明 | 示例 |
|------|------|------|
| `eq` | 等于 | `{ "field": "status", "method": "eq", "value": "running" }` |
| `ne` | 不等于 | `{ "field": "status", "method": "ne", "value": "stopped" }` |
| `gt` | 大于 | `{ "field": "age", "method": "gt", "value": 18 }` |
| `lt` | 小于 | `{ "field": "score", "method": "lt", "value": 60 }` |
| `ge` | 大于等于 | `{ "field": "count", "method": "ge", "value": 10 }` |
| `le` | 小于等于 | `{ "field": "count", "method": "le", "value": 100 }` |
| `in` | 在列表中 | `{ "field": "type", "method": "in", "value": ["A","B"] }` |
| `nin` | 不在列表中 | `{ "field": "type", "method": "nin", "value": ["X"] }` |
| `isNull` | 值为空 | `{ "field": "email", "method": "isNull" }` |
| `notNull` | 值不为空 | `{ "field": "name", "method": "notNull" }` |
| `contains` | 包含（字符串/数组） | `{ "field": "tags", "method": "contains", "value": "urgent" }` |
| `onchange` | 字段值变化时触发 | `{ "field": "status", "method": "onchange" }` |

### 动作（action）

| 动作类型 | 说明 | 示例 |
|----------|------|------|
| `show` | 显示字段 | `{ "type": "show", "field": "reason" }` |
| `hide` | 隐藏字段 | `{ "type": "hide", "field": "secret_field" }` |
| `setRequire` | 设为必填 | `{ "type": "setRequire", "field": "reason" }` |
| `setOptional` | 设为选填 | `{ "type": "setOptional", "field": "remark" }` |
| `canEdit` | 设为可编辑 | `{ "type": "canEdit", "field": "quantity" }` |
| `setDisabled` | 设为禁用 | `{ "type": "setDisabled", "field": "locked_field" }` |
| `setValue` | 设置字段值 | `{ "type": "setValue", "field": "total", "value": "{{price}} * {{qty}}" }` |
| `message` | 显示提示信息 | `{ "type": "message", "value": "温度超过阈值" }` |

`setValue` 支持模板表达式 `{{fieldName}}`，可用算术运算（如 `{{price}} * {{qty}}`）。

### 常见场景示例

**场景 1：设备故障时必填故障描述**
```json
{
  "name": "故障时必填描述",
  "key": "fault_desc_required",
  "condition": [[{ "field": "status", "method": "eq", "value": "fault" }]],
  "action": [
    { "type": "show", "field": "fault_description" },
    { "type": "setRequire", "field": "fault_description" }
  ]
}
```

**场景 2：自动计算总价**
```json
{
  "name": "自动计算总价",
  "key": "auto_total",
  "condition": [[{ "field": "quantity", "method": "onchange" }]],
  "action": [
    { "type": "setValue", "field": "total_price", "value": "{{unit_price}} * {{quantity}}" }
  ]
}
```

**场景 3：选择"其他"时显示说明输入框**
```json
{
  "name": "选择其他时显示说明",
  "key": "show_other_desc",
  "condition": [[{ "field": "category", "method": "eq", "value": "other" }]],
  "action": [
    { "type": "show", "field": "other_description" },
    { "type": "setRequire", "field": "other_description" }
  ]
}
```

## 字段校验（validations）

使用正则表达式校验字段值，在表单提交时触发。

### 结构

```json
{
  "validations": [
    {
      "id": "val_email",
      "field": "email",
      "pattern": "^[\\w.-]+@[\\w.-]+\\.\\w+$",
      "message": "请输入有效的邮箱地址",
      "disabled": false
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 校验规则 ID |
| `field` | string | 要校验的字段 key |
| `pattern` | string | 正则表达式 |
| `message` | string | 校验失败时的错误提示 |
| `disabled` | boolean | 是否禁用此规则 |

### 常见正则示例

```json
[
  { "id": "val_email", "field": "email", "pattern": "^[\\w.-]+@[\\w.-]+\\.\\w+$", "message": "邮箱格式错误" },
  { "id": "val_phone", "field": "phone", "pattern": "^1[3-9]\\d{9}$", "message": "手机号格式错误" },
  { "id": "val_idcard", "field": "idcard", "pattern": "^\\d{17}[\\dXx]$", "message": "身份证号格式错误" },
  { "id": "val_ip", "field": "ip_address", "pattern": "^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$", "message": "IP地址格式错误" },
  { "id": "val_url", "field": "website", "pattern": "^https?://.+", "message": "请输入有效的URL" },
  { "id": "val_code", "field": "code", "pattern": "^[A-Z]{2}\\d{4}$", "message": "编号格式：2位大写字母+4位数字" }
]
```

## 关联

- 表结构定义见 [table-schema.md](table-schema.md)
- 控件类型见 [controls/](controls/)
