# 普通表创建指南（Common）

> **执行流程：每个部分独立完成「读文档 → 写数据 → 校验」，所有部分完成后统一执行指令**

普通表（`template: "common"`）用于纯信息管理、CRUD 操作，如楼宇信息、维保记录、人员名单等。

---

## 部分 1/2：基础信息

### 读文档

无需额外文档，基础结构固定。

### 写数据

```json
{
  "id": "buildings",
  "title": "楼宇信息",
  "template": "common",
  "function": []
}
```

### 校验规则

- `id`：必填，英文标识符，^[a-z][a-z0-9_]*$
- `title`：必填，显示名称
- `template`：必填，固定值 `"common"`
- `function`：必填，必须为空数组 `[]`

---

## 部分 2/2：表字段（schema.properties）

### 读文档

- [../references/table-schema.md](../references/table-schema.md) - 表结构完整文档
- [../references/table-field-rules.md](../references/table-field-rules.md) - 字段规则
- [../references/controls/](../references/controls/) - 24 种控件类型

### 写数据

**预设字段（自动生成，可选）：**

普通表会自动生成以下预设字段，创建时无需手动添加：

| key | title | controlType | need |
|-----|-------|-------------|------|
| `createTime` | 创建时间 | date | false |
| `creator` | 创建人 | user-role | false |
| `text-{random}` | 记录名称 | text | false |
| `upload-single-{random}` | 记录附件 | upload | false |

**自定义字段示例：**

```json
{
  "code": { "key": "code", "type": "string", "controlType": "text", "title": "楼宇编号", "need": true, "unique": true },
  "name": { "key": "name", "type": "string", "controlType": "text", "title": "楼宇名称", "need": true },
  "area": { "key": "area", "type": "number", "controlType": "number", "title": "建筑面积(㎡)", "need": false },
  "floors": { "key": "floors", "type": "number", "controlType": "number", "title": "楼层数", "need": false },
  "address": { "key": "address", "type": "string", "controlType": "area", "title": "地址", "need": false },
  "status": { "key": "status", "type": "string", "controlType": "select-string", "title": "状态", "need": false, "enum": ["正常", "装修中", "停用"], "enumNames": ["正常", "装修中", "停用"] },
  "manager": { "key": "manager", "type": "string", "controlType": "user-role", "title": "负责人", "need": false }
}
```

**组装 schema：**

```json
{
  "schema": {
    "type": "object",
    "name": "buildings",
    "title": "楼宇信息",
    "properties": { /* 自定义字段 */ },
    "formLayout": { "cols": 3, "labelLayout": "vertical" },
    "formSchema": [
      { "key": "code", "colSpan": 1 },
      { "key": "name", "colSpan": 1 },
      { "key": "status", "colSpan": 1 },
      { "key": "area", "colSpan": 1 },
      { "key": "floors", "colSpan": 1 },
      { "key": "manager", "colSpan": 1 },
      { "key": "address", "colSpan": 3 }
    ],
    "tableSchema": [
      { "key": "code", "canOrder": true },
      { "key": "name", "canOrder": true },
      { "key": "area", "canOrder": true },
      { "key": "status", "canOrder": true }
    ]
  }
}
```

### 校验规则

1. **字段属性完整性**：每个字段必须有 `key`、`type`、`controlType`、`title`
2. **字段属性校验**：
   - `key`：必填，字段标识符
   - `type`：必填，枚举值 `string`/`number`/`boolean`/`object`/`array`
   - `controlType`：必填，参见 [controls/](../references/controls/)
   - `title`：必填，显示名称
   - `need`：可选，布尔值
   - `unique`：可选，布尔值
3. **formLayout 校验**：
   - `cols` 必须为 1、2 或 3
   - `labelLayout` 推荐为 `"vertical"`
4. **formSchema / colSpan 校验**：
   - 每行 colSpan 之和必须等于 cols
   - `rich-text`、`editable-table`、`map` 必须独占整行（colSpan = cols）
5. **select 类型字段校验**：
   - `controlType` 为 `select-*` 时，必须有 `enum` 和 `enumNames`
   - `enum` 和 `enumNames` 长度必须一致
6. **字段规则校验**（可选）：
   - `fieldRules.mutualRules`：交互规则
   - `fieldRules.validations`：字段校验（正则表达式）

---

## 最终：组装与执行

### 组装完整 schema

```json
{
  "id": "buildings",
  "title": "楼宇信息",
  "template": "common",
  "function": [],
  "schema": {
    "type": "object",
    "name": "buildings",
    "title": "楼宇信息",
    "properties": { /* 自定义字段 */ },
    "formLayout": { "cols": 3, "labelLayout": "vertical" },
    "formSchema": [ /* ... */ ],
    "tableSchema": [ /* ... */ ],
    "fieldRules": { "mutualRules": [], "validations": [] }
  }
}
```

### 校验完整 schema

参考 [../references/validation-rules.md](../references/validation-rules.md)：
- § 一：表结构校验

### 执行指令

```bash
# 保存到临时文件
TMPFILE=$(mktemp)
cat > $TMPFILE << 'EOF'
<完整 schema>
EOF

# 执行创建
$K table-create --file $TMPFILE

# 清理临时文件
rm -f $TMPFILE
```

### 验证结果

```bash
$K scan --with-sample       # 验证创建结果
```

**验证要点：**
- `tableMajorType` 是否为 `normal`
- 字段是否正确创建
- 种子数据是否完整写入（如果有）

---

## 常见错误与修复

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `tableMajorType 为 device` | function 不为空数组 | 修改 function 为 `[]` |
| `formSchema colSpan 未填满` | 某行 colSum < cols | 调整 colSpan 使每行填满 |
| `select 字段缺少 enum` | controlType 为 select-* 但没有 enum | 添加 `enum` 和 `enumNames` |
| `控件必须独占整行` | rich-text 的 colSpan ≠ cols | 将 colSpan 设为 cols |

---

## 字段设计建议

**选择控件类型：**

| 数据类型 | 推荐 controlType | 示例 |
|----------|-----------------|------|
| 短文本 | text | 编号、名称 |
| 长文本 | rich-text | 备注、描述 |
| 数字 | number | 面积、数量 |
| 日期 | date | 创建时间 |
| 时间范围 | date-range | 开始-结束日期 |
| 布尔值 | boolean | 是否启用 |
| 单选（少量） | select-string | 状态、类型 |
| 多选（少量） | select-array-string | 标签 |
| 单选（关联表） | relate | 关联设备 |
| 多选（关联表） | relate-multiple | 关联多个设备 |
| 用户选择 | user-role | 负责人 |
| 省市区 | area | 地址 |
| 文件上传 | upload | 附件 |
| 多图片上传 | upload-group | 图片集 |

**colSpan 宽度推荐：**

| 控件宽度 | controlType | colSpan |
|----------|-------------|---------|
| 窄（1） | text, number, boolean, date, time, rate, select-*, serial-number, link, area, user-role, upload | 1 |
| 中（2） | date-range, relate, relate-multiple | 2 |
| 全宽（=cols） | rich-text, editable-table, map | cols |

---

## 关联文档

- 表结构完整：[../references/table-schema.md](../references/table-schema.md)
- 字段规则：[../references/table-field-rules.md](../references/table-field-rules.md)
- 控件类型：[../references/controls/](../references/controls/)
- 校验规则：[../references/validation-rules.md](../references/validation-rules.md)
