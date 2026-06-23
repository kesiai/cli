# relate

单选关联（关联其他表的一条记录）。当前端表单里需要"一个记录关联另一张表的某条记录"时使用，例如：一条工单关联一台设备、一条资质归属一个供应商。

## 字段定义（权威结构）

> 以下结构来自平台表设计器实际持久化的字段定义，**建表/改表时必须严格对齐**，否则前端可能不渲染关联选择器或识别异常。

```json
{
  "id": "field-1782186884436",
  "key": "relate_23g3",
  "title": "关联字段(单选)",
  "type": "object",
  "config": "关联字段",
  "controlType": "relate",
  "need": false,
  "order": 6,
  "isSystem": false,
  "relate": {
    "id": "qualification",
    "title": "资质",
    "fields": [
      {
        "title": "资质名称",
        "key": "name",
        "fieldSchema": {
          "controlType": "text",
          "key": "name",
          "need": true,
          "textContent": "text",
          "title": "资质名称",
          "type": "string"
        }
      }
    ]
  }
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✅ | 字段实例 ID，格式 `field-<13位时间戳>`（如 `field-1782186884436`） |
| `key` | ✅ | 字段标识，英文，如 `supplierId` |
| `title` | ✅ | 显示名称 |
| `type` | ✅ | 固定 `"object"` |
| `config` | ✅ | 固定 `"关联字段"` |
| `controlType` | ✅ | 固定 `"relate"` |
| `need` | — | 是否必填，默认 `false` |
| `order` | — | 字段排序序号（整数） |
| `isSystem` | — | 是否系统字段，自定义字段填 `false` |
| `relate` | ✅ | 关联配置，见下 |

> ⚠️ 单选 `relate` **没有 `items` 字段**（只有多选 `relate-multiple` 才有 `items:{}`）。

### `relate` 配置

| 字段 | 必填 | 说明 |
|------|------|------|
| `relate.id` | ✅ | **目标表的表 ID**（如 `qualification`） |
| `relate.title` | ✅ | 目标表标题 |
| `relate.fields` | ✅ | 关联显示字段数组，**元素是对象**（见下），不是字符串数组 |

`relate.fields` 元素结构：

```json
{
  "title": "资质名称",
  "key": "name",
  "fieldSchema": {
    "controlType": "text",
    "key": "name",
    "need": true,
    "textContent": "text",
    "title": "资质名称",
    "type": "string"
  }
}
```

> ⚠️ `relate.fields` 通常只放**一个**显示字段（一般是对应表的"名称"字段，如 `name`）。`fieldSchema` 复制自目标表该字段的定义。

## 记录值示例

记录值为目标表某条记录的 ID（字符串）：

```json
{ "supplierId": "6a39f3f936c58c12ed173993" }
```

## 说明

- `relate.id` 指定关联的目标表 ID，`relate.fields` 指定关联时显示的目标表字段。
- 与多选 `relate-multiple` 的区别：`type` 为 `"object"`（多选是 `"array"`），记录值是单个 ID 字符串（多选是 ID 数组），且**没有 `items`**。
- 前端渲染为下拉框，选项来自目标表的记录。
- 关联关系建模时单向放一边即可：放"多"的一方用单选 `relate`（如资质持 `supplierId` 指向供应商），或放"一"的一方用多选 `relate-multiple`（如供应商持 `qualificationIds`）。二选一，避免双向冗余。

## ⚠️ 常见错误（务必避免）

1. **`type` 写成 `"string"`** —— ❌ 错。单选 `relate` 的 `type` 必须是 `"object"`。
2. **`relate.fields` 写成字符串数组** `["name","status"]` —— ❌ 错。必须是 `[{title,key,fieldSchema}]` 对象数组。
3. **漏掉 `id` / `config` / `order` / `isSystem`** —— 会导致前端识别异常（关联选择器不渲染、列表显示异常）。
4. **自行添加 `selectType` / `recordSelectType` / `relateTo` / `relateShowFields` / `items`** —— ❌ 不要加。这些不属于单选 `relate` 的持久化字段 schema，乱加反而会渲染异常。正确结构只有上面"字段定义"里列出的那些 key。
5. **改字段结构时丢失其他字段** —— 用 `kesi table <id>` 取到的 schema 再整体 `table-update` 时，务必确认 `properties` / `tableSchema` / `formSchema` 里**所有原有字段都在**，只改目标字段；后端会按新 schema 裁剪记录数据，schema 缩减会**永久丢失**对应字段的数据。
