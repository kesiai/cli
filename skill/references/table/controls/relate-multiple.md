# relate-multiple

多选关联（关联其他表的多条记录）。当前端表单里需要"一个记录关联另一张表的多条记录"时使用，例如：一个供应商关联多个资质、一个设备关联多个标签。

## 字段定义（权威结构）

> 以下结构来自平台表设计器实际持久化的字段定义，**建表/改表时必须严格对齐**，否则前端可能把多选识别成单选、或不渲染关联选择器。

```json
{
  "id": "field-1782186503558",
  "key": "relate-multiple_ty9z",
  "title": "关联字段(多选)",
  "type": "array",
  "config": "关联字段",
  "controlType": "relate-multiple",
  "need": false,
  "order": 6,
  "isSystem": false,
  "items": {},
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
| `id` | ✅ | 字段实例 ID，格式 `field-<13位时间戳>`（如 `field-1782186503558`） |
| `key` | ✅ | 字段标识，英文，如 `qualificationIds` |
| `title` | ✅ | 显示名称 |
| `type` | ✅ | 固定 `"array"` |
| `config` | ✅ | 固定 `"关联字段"` |
| `controlType` | ✅ | 固定 `"relate-multiple"` |
| `need` | — | 是否必填，默认 `false` |
| `order` | — | 字段排序序号（整数） |
| `isSystem` | — | 是否系统字段，自定义字段填 `false` |
| `items` | ✅ | 固定空对象 `{}` |
| `relate` | ✅ | 关联配置，见下 |

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

**写入时**传目标表记录 ID 的**字符串数组**：

```json
{ "qualificationIds": ["6a39f48336c58c12ed173b71", "6a39f48336c58c12ed173b75"] }
```

**读取时**平台会归一化为对象数组：

```json
{ "qualificationIds": [ { "id": "6a39f48336c58c12ed173b71" }, { "id": "6a39f48336c58c12ed173b75" } ] }
```

## 说明

- 与单选 `relate` 的区别：`type` 为 `"array"`，值是目标表记录 ID 的数组；其余字段结构一致。
- 前端渲染为多选下拉/弹窗选择器。
- 关联关系可以单向放在"一"的一方（如供应商持 `qualificationIds` 指向多个资质），也可放在"多"的一方用单选 `relate`。建模时二选一，避免双向冗余。

## ⚠️ 常见错误（务必避免）

1. **`relate.fields` 写成字符串数组** `["name","status"]` —— ❌ 错。必须是 `[{title,key,fieldSchema}]` 对象数组。
2. **漏掉 `id` / `config` / `items` / `order` / `isSystem`** —— 会导致前端识别异常（如多选退化成单选、列表只剩该列）。
3. **自行添加 `selectType` / `recordSelectType` / `relateTo` / `relateShowFields`** —— ❌ 不要加。这些是前端运行时/内部字段，不属于持久化的字段 schema，乱加反而会让关联选择器渲染异常。正确结构只有上面"字段定义"里列出的那些 key。
4. **改字段结构时丢失其他字段** —— 用 `kesi table <id>` 取到的 schema 再整体 `table-update` 时，务必确认 `properties` / `tableSchema` / `formSchema` 里**所有原有字段都在**，只改目标字段；后端会按新 schema 裁剪记录数据，schema 缩减会**永久丢失**对应字段的数据。
