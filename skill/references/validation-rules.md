# 执行前校验规则

> **⚠️ 强制规则：所有调接口操作前必须先校验数据格式**
>
> 校验流程：准备数据 → 执行校验 → 修复问题 → 再次校验 → 执行命令

---

## 校验规则与表类型指南的对应关系

| 表类型 | 指南文档 | 校验规则对应 |
|--------|----------|--------------|
| 设备表 | [../table-guides/device-table-guide.md](../table-guides/device-table-guide.md) | 部分 1 → 本文档 §1.1<br>部分 2 → 本文档 §1.3<br>部分 3 → 本文档 §2<br>部分 4 → 本文档 §3 |
| 普通表 | [../table-guides/common-table-guide.md](../table-guides/common-table-guide.md) | 部分 1 → 本文档 §1.1<br>部分 2 → 本文档 §1.3 |
| 组织表 | [../table-guides/department-table-guide.md](../table-guides/department-table-guide.md) | 部分 1 → 本文档 §1.1<br>部分 2 → 本文档 §1.3 |
| 其他表类型 | 对应指南 | 部分 1 → 本文档 §1.1<br>部分 2 → 本文档 §1.3 |

---

## 校验触发时机

以下操作**必须在执行前校验**：

| 操作 | 命令 | 校验规则 |
|------|------|----------|
| 创建表 | `$K table-create --file schema.json` | 表结构校验 |
| 修改表 | `$K table-update <id> --file schema.json` | 表结构校验 |
| 批量建表 | `$K seed --file seed.json` | seed 校验 |
| 创建记录 | `$K record-create --data ...` | 记录数据校验 |
| 修改记录 | `$K record-update --data ...` | 记录数据校验 |
| 修改数据点 | 通过 API 修改 tags | 数据点校验 |
| 创建驱动实例 | `$K driver-create -n ... -t ...` | 驱动创建校验（见下） |
| 更新驱动配置 | `$K driver-update-config <id> --file ...` | 驱动配置校验（见下） |

**驱动创建校验**：① `-t` 必须是驱动 key（`driver-catalog` 输出的 `name`），禁止填分类路径；② 实例名称全局唯一——重名时复用报错信息中的实例，禁止换名盲试；③ 创建成功记录返回 id，后续一律 PATCH 更新，禁止重复 POST。

**驱动配置校验**：① 必须在 `driver-install` 完成后才能查 schema 并生成配置；② settings/tags/commands 的字段与 required 以 `$K driver-schema <驱动key>` 返回为准，禁止发明 schema 外字段；③ enum 字段必须取合法值。

---

## 一、表结构校验（table-create / table-update）

### 1.1 顶层字段校验

```json
{
  "id": "必填，英文标识符，^[a-z][a-z0-9_]*$",
  "title": "必填，显示名称",
  "template": "必填，枚举值校验",
  "function": "必填，数组类型，需与 template 匹配",
  "schema": "必填，对象类型"
}
```

### 1.2 template + function 映射校验

```javascript
// 校验规则：template 和 function 必须匹配
const TEMPLATE_FUNCTION_MAP = {
  common: { function: [], tableMajorType: 'normal' },
  device: { 
    function: ['device', 'warning', 'computed'], 
    tableMajorType: 'device',
    // device 表必须包含 'device'
    validate: (fn) => fn.includes('device')
  },
  department: { function: ['dataAuth'], tableMajorType: 'dataAuth' },
  settable: { function: ['settable'], tableMajorType: 'settable' },
  tableMapping: { function: ['tableMapping'], tableMajorType: 'tableMapping' },
  tableClasses: { function: ['tableClasses'], tableMajorType: 'tableClasses' }
}

// 校验逻辑
if (TEMPLATE_FUNCTION_MAP[template]) {
  const expected = TEMPLATE_FUNCTION_MAP[template].function
  const actual = function.sort()
  if (JSON.stringify(expected.sort()) !== JSON.stringify(actual)) {
    throw `template="${template}" 时，function 必须为 ${JSON.stringify(expected)}`
  }
  if (TEMPLATE_FUNCTION_MAP[template].validate) {
    if (!TEMPLATE_FUNCTION_MAP[template].validate(function)) {
      throw `template="${template}" 的校验失败`
    }
  }
}
```

### 1.3 schema 结构校验

```json
{
  "schema": {
    "type": "必填，固定值 'object'",
    "name": "必填，与 id 相同",
    "title": "必填，与顶层 title 相同",
    "properties": "必填，对象类型，至少包含预设字段",
    "formLayout": "必填，{ cols: 1|2|3, labelLayout: 'vertical' }",
    "formSchema": "必填，数组类型",
    "tableSchema": "必填，数组类型",
    "fieldRules": "可选，{ mutualRules: [], validations: [] }"
  }
}
```

### 1.4 设备表预设字段校验

```javascript
// 设备表必须包含 7 个预设字段
const DEVICE_REQUIRED_FIELDS = [
  { key: 'id', type: 'string', controlType: 'text', need: true },
  { key: 'name', type: 'string', controlType: 'text', need: true },
  { key: 'connectTime', type: 'string', controlType: 'date', need: false },
  { key: 'disable', type: 'boolean', controlType: 'boolean', need: false },
  { key: 'online', type: 'boolean', controlType: 'boolean', need: false },
  { key: 'off', type: 'boolean', controlType: 'boolean', need: false },
  { key: 'warnFlag', type: 'boolean', controlType: 'boolean', need: false }
]

// 校验逻辑
if (template === 'device') {
  for (const field of DEVICE_REQUIRED_FIELDS) {
    if (!properties[field.key]) {
      throw `设备表缺少预设字段: ${field.key}`
    }
    if (properties[field.key].type !== field.type) {
      throw `字段 ${field.key} 的 type 应为 ${field.type}`
    }
    if (properties[field.key].controlType !== field.controlType) {
      throw `字段 ${field.key} 的 controlType 应为 ${field.controlType}`
    }
    if (properties[field.key].need !== field.need) {
      throw `字段 ${field.key} 的 need 应为 ${field.need}`
    }
  }
}
```

### 1.5 formLayout + formSchema 校验

```javascript
// colSpan 计算规则
function validateFormSchema(formSchema, cols) {
  let currentLineSum = 0
  const lines = []

  for (const item of formSchema) {
    const colSpan = item.colSpan || 1

    // 检查 colSpan 范围
    if (colSpan < 1 || colSpan > cols) {
      throw `formSchema[${item.key}].colSpan=${colSpan} 超出范围 [1, ${cols}]`
    }

    // 检查特殊控件是否独占整行
    const controlType = properties[item.key]?.controlType
    if (['rich-text', 'editable-table', 'map'].includes(controlType)) {
      if (colSpan !== cols) {
        throw `控件 ${controlType} 必须独占整行 (colSpan=${cols})`
      }
    }

    currentLineSum += colSpan

    // 当前行填满或当前项独占整行时，换行
    if (currentLineSum === cols || colSpan === cols) {
      lines.push(currentLineSum)
      currentLineSum = 0
    } else if (currentLineSum > cols) {
      throw `formSchema 某行 colSum=${currentLineSum} 超过 cols=${cols}`
    }
  }

  // 检查最后一行是否填满
  if (currentLineSum !== 0 && currentLineSum !== cols) {
    throw `formSchema 最后一行 colSpan 之和=${currentLineSum} 未填满`
  }

  return true
}
```

### 1.6 字段属性校验

```javascript
// 每个字段的必填属性
function validateFieldProperty(key, field) {
  const required = ['key', 'type', 'controlType', 'title']
  for (const attr of required) {
    if (!field[attr]) {
      throw `字段 ${key} 缺少必填属性: ${attr}`
    }
  }

  // key 必须与字段定义的 key 相同
  if (field.key !== key) {
    throw `字段 key="${key}" 与 field.key="${field.key}" 不一致`
  }

  // type 枚举值校验
  const VALID_TYPES = ['string', 'number', 'boolean', 'object', 'array']
  if (!VALID_TYPES.includes(field.type)) {
    throw `字段 ${key} 的 type="${field.type}" 无效`
  }

  // need 必须是布尔值
  if (field.need !== undefined && typeof field.need !== 'boolean') {
    throw `字段 ${key} 的 need 必须是布尔值`
  }

  // unique 必须是布尔值
  if (field.unique !== undefined && typeof field.unique !== 'boolean') {
    throw `字段 ${key} 的 unique 必须是布尔值`
  }

  return true
}
```

### 1.7 枚举字段校验

```javascript
// select 类型的字段必须有 enum 和 enumNames
function validateSelectField(key, field) {
  if (field.controlType?.startsWith('select-')) {
    if (!field.enum || !Array.isArray(field.enum)) {
      throw `select 类型字段 ${key} 必须有 enum 数组`
    }
    if (!field.enumNames || !Array.isArray(field.enumNames)) {
      throw `select 类型字段 ${key} 必须有 enumNames 数组`
    }
    if (field.enum.length !== field.enumNames.length) {
      throw `字段 ${key} 的 enum 和 enumNames 长度不一致`
    }
  }
}
```

---

## 二、设备配置校验（device 块）

### 2.1 device 块顶层校验

```json
{
  "device": {
    "driver": "必填，驱动类型",
    "driverType": "必填，驱动类型（与 driver 相同）",
    "driverName": "必填，驱动名称",
    "driverExampleId": "必填，驱动实例 ID",
    "groupId": "必填，驱动实例 ID（与 driverExampleId 相同）",
    "driverGroupId": "必填，格式：{driverType}_$$_{id}",
    "emulator": "必填，布尔值",
    "settings": "必填，对象类型，驱动连接参数",
    "tags": "必填，数组类型，数据点列表",
    "commands": "可选，数组类型",
    "events": "可选，数组类型"
  }
}
```

### 2.2 驱动字段映射校验

```javascript
// 驱动字段必须来自 $K drivers 和 $K driver 的返回值
function validateDriverFields(device, driverInfo) {
  // driver 和 driverType 必须相同
  if (device.driver !== device.driverType) {
    throw `device.driver="${device.driver}" 与 device.driverType="${device.driverType}" 必须相同`
  }

  // driverName 必须来自驱动实例的 name
  if (device.driverName !== driverInfo.name) {
    throw `device.driverName="${device.driverName}" 与驱动实例 name="${driverInfo.name}" 不一致`
  }

  // driverExampleId 必须来自驱动实例的 id
  if (device.driverExampleId !== driverInfo.id) {
    throw `device.driverExampleId="${device.driverExampleId}" 与驱动实例 id="${driverInfo.id}" 不一致`
  }

  // groupId 必须与 driverExampleId 相同
  if (device.groupId !== device.driverExampleId) {
    throw `device.groupId="${device.groupId}" 必须与 driverExampleId="${device.driverExampleId}" 相同`
  }

  // driverGroupId 格式校验
  const expected = `${device.driverType}_$$_${device.driverExampleId}`
  if (device.driverGroupId !== expected) {
    throw `device.driverGroupId="${device.driverGroupId}" 格式错误，应为 "${expected}"`
  }

  return true
}
```

### 2.3 测试驱动固定配置校验

```javascript
// 测试驱动必须使用固定配置
function validateTestDriver(device) {
  if (device.driver === 'test' || device.driverType === '测试驱动') {
    const TEST_DRIVER_CONFIG = {
      driver: 'test',
      driverType: '测试驱动',
      driverName: '测试驱动',
      driverExampleId: 'test',
      groupId: 'test',
      driverGroupId: 'test_$$_test',
      emulator: false,
      settings: {}
    }

    for (const [key, expected] of Object.entries(TEST_DRIVER_CONFIG)) {
      if (JSON.stringify(device[key]) !== JSON.stringify(expected)) {
        throw `测试驱动字段 ${key}="${device[key]}" 应为 "${expected}"`
      }
    }
  }
}
```

---

## 三、数据点校验（tags）

### 3.1 基础字段校验

```json
{
  "id": "必填，点位标识",
  "name": "必填，点位名称",
  "policy": "可选，枚举值：save/change/drop/period",
  "rw": "可选，布尔值",
  "unit": "可选，字符串",
  "fixed": "可选，数字",
  "mod": "可选，数字",
  "value": "可选，字符串"
}
```

### 3.2 驱动字段校验

```javascript
// 点位的驱动字段必须来自 $K driver-schema 的返回值
function validateTagDriverFields(tag, driverSchema) {
  const required = driverSchema.model.tags.required || []
  const fields = driverSchema.model.tags.fields || {}

  // 检查必填字段
  for (const field of required) {
    if (!tag[field]) {
      throw `点位 ${tag.id} 缺少必填驱动字段: ${field}`
    }
  }

  // 检查字段类型
  for (const [key, tagField] of Object.entries(fields)) {
    if (tag[key] !== undefined) {
      const expectedType = tagField.type
      const actualType = typeof tag[key]
      if (expectedType === 'number' && actualType !== 'number') {
        throw `点位 ${tag.id} 的 ${key} 应为数字类型`
      }
    }
  }

  // 检查枚举值
  for (const [key, tagField] of Object.entries(fields)) {
    if (tag[key] !== undefined && tagField.enum) {
      if (!tagField.enum.includes(tag[key])) {
        throw `点位 ${tag.id} 的 ${key}="${tag[key]}" 不在枚举值范围内`
      }
    }
  }

  return true
}
```

### 3.3 测试驱动点位校验

```javascript
// 测试驱动的点位不需要协议字段
function validateTestDriverTag(tag) {
  // 测试驱动只需要基础字段
  const BASIC_FIELDS = ['id', 'name', 'policy', 'unit', 'fixed', 'mod']

  // 检查是否包含了不应该有的协议字段
  const PROTOCOL_FIELDS = ['area', 'offset', 'dataType', 'nodeId', 'topic']
  for (const field of PROTOCOL_FIELDS) {
    if (tag[field] !== undefined) {
      console.warn(`测试驱动点位 ${tag.id} 不应包含协议字段: ${field}`)
    }
  }
}
```

---

## 四、seed.json 校验

### 4.1 顶层结构校验

```json
{
  "tables": "必填，数组类型"
}
```

### 4.2 每个表项校验

```javascript
function validateSeedItem(item) {
  // 必须有 schema
  if (!item.schema) {
    throw 'seed 项缺少 schema'
  }

  // schema 必须通过表结构校验
  validateTableSchema(item.schema)

  // records 必须是数组（可选）
  if (item.records && !Array.isArray(item.records)) {
    throw 'seed 项的 records 必须是数组'
  }

  // 如果是设备表，必须有 device 配置
  if (item.schema.template === 'device' && !item.device) {
    throw '设备表的 seed 项必须包含 device 配置'
  }

  // device 配置必须通过设备配置校验
  if (item.device) {
    validateDeviceConfig(item.device)
  }

  return true
}
```

---

## 五、校验流程

### 5.1 完整校验流程

```
1. 准备数据（组装 JSON）
   ↓
2. 执行校验（按规则逐项检查）
   ↓
3. 收集错误（如果有）
   ↓
4. 修复问题（根据错误提示）
   ↓
5. 再次校验（直到通过）
   ↓
6. 执行命令（调用 CLI）
```

### 5.2 校验输出格式

```json
{
  "valid": false,
  "errors": [
    {
      "field": "schema.formSchema[2].colSpan",
      "message": "colSpan=3 超出范围 [1, 2]",
      "severity": "error"
    },
    {
      "field": "device.driverGroupId",
      "message": "格式错误，应为 'modbus_$$_abc123'",
      "severity": "error"
    }
  ],
  "warnings": [
    {
      "field": "schema.properties.description.need",
      "message": "建议将 need 设置为 false",
      "severity": "warning"
    }
  ]
}
```

### 5.3 校验失败处理

1. **停止执行**：校验不通过时，绝不执行 CLI 命令
2. **报告错误**：列出所有错误，按字段分组
3. **提供修复建议**：对于常见错误，给出修复示例
4. **再次校验**：修复后必须重新执行校验

---

## 六、常见校验错误与修复

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `template 与 function 不匹配` | template="device" 但 function 不包含 "device" | 修改 function 为 `["device", "warning", "computed"]` |
| `设备表缺少预设字段` | 缺少 id/name/online 等字段 | 补充 7 个预设字段 |
| `formSchema colSpan 之和未填满` | 某行 colSum < cols | 调整 colSpan 使每行填满 |
| `控件必须独占整行` | rich-text 的 colSpan ≠ cols | 将 colSpan 设为 cols |
| `device.driverGroupId 格式错误` | 格式不符合要求 | 按 `{driverType}_$$_{id}` 格式生成 |
| `点位缺少必填驱动字段` | 未调用 `$K driver-schema` | 先查询驱动 schema，再填写点位 |
| `测试驱动配置错误` | 未使用固定配置 | 使用测试驱动固定配置 |

---

## 关联文档

- 表结构：[table-schema.md](table-schema.md)
- 字段规则：[table-field-rules.md](table-field-rules.md)
- 设备管理：[device.md](device.md)
- 数据点：[device-tag.md](device-tag.md)
