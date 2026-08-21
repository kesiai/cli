# 设备表创建指南

> **执行流程：每个部分独立完成「读文档 → 写数据 → 校验」，所有部分完成后统一执行指令**

---

## 部分 1/7：基础信息

### 读文档

无需额外文档，基础结构固定。

### 写数据

```json
{
  "id": "ac_devices",
  "title": "空调设备",
  "template": "device",
  "function": ["device", "warning", "computed"]
}
```

### 校验规则

- `id`：必填，英文标识符，^[a-z][a-z0-9_]*$
- `title`：必填，显示名称
- `template`：必填，固定值 `"device"`
- `function`：必填，必须为 `["device", "warning", "computed"]`，且必须包含 `"device"`

---

## 部分 2/7：表字段（schema.properties）

### 读文档

- [../references/table-schema.md](../references/table-schema.md) - 表结构完整文档
- [../references/table-field-rules.md](../references/table-field-rules.md) - 字段规则
- [../references/controls/](../references/controls/) - 24 种控件类型

### 写数据

**设备表必须包含 7 个预设字段：**

```json
{
  "id": { "key": "id", "type": "string", "controlType": "text", "textContent": "text", "title": "设备编号", "need": true },
  "name": { "key": "name", "type": "string", "controlType": "text", "textContent": "text", "title": "设备名称", "need": true },
  "connectTime": { "key": "connectTime", "type": "string", "controlType": "date", "title": "通信时间", "need": false },
  "disable": { "key": "disable", "type": "boolean", "controlType": "boolean", "title": "是否禁用", "need": false },
  "online": { "key": "online", "type": "boolean", "controlType": "boolean", "title": "在线", "need": false },
  "off": { "key": "off", "type": "boolean", "controlType": "boolean", "title": "断电", "need": false },
  "warnFlag": { "key": "warnFlag", "type": "boolean", "controlType": "boolean", "title": "报警状态", "need": false }
}
```

**可追加自定义字段：**

```json
{
  "model": { "key": "model", "type": "string", "controlType": "text", "title": "型号", "need": false },
  "location": { "key": "location", "type": "string", "controlType": "area", "title": "位置", "need": false }
}
```

**组装 schema：**

```json
{
  "schema": {
    "type": "object",
    "name": "ac_devices",
    "title": "空调设备",
    "properties": { /* 预设字段 + 自定义字段 */ },
    "formLayout": { "cols": 3, "labelLayout": "vertical" },
    "formSchema": [
      { "key": "id", "colSpan": 1 },
      { "key": "name", "colSpan": 1 },
      { "key": "connectTime", "colSpan": 1 },
      { "key": "disable", "colSpan": 1 },
      { "key": "online", "colSpan": 1 },
      { "key": "off", "colSpan": 1 },
      { "key": "warnFlag", "colSpan": 1 },
      { "key": "model", "colSpan": 1 },
      { "key": "location", "colSpan": 2 }
    ],
    "tableSchema": [
      { "key": "id" },
      { "key": "name" },
      { "key": "online" },
      { "key": "warnFlag" }
    ]
  }
}
```

### 校验规则

1. **预设字段完整性**：7 个字段必须全部存在
2. **字段属性校验**：
   - `id`/`name`：`type="string"`, `controlType="text"`, `need=true`
   - 其他 5 个：`type="boolean"`, `controlType="boolean"`, `need=false`
3. **formLayout 校验**：
   - `cols` 必须为 1、2 或 3
   - `labelLayout` 推荐为 `"vertical"`
4. **formSchema / colSpan 校验**：
   - 每行 colSpan 之和必须等于 cols
   - `rich-text`、`editable-table`、`map` 必须独占整行（colSpan = cols）
5. **字段属性完整性**：每个字段必须有 `key`、`type`、`controlType`、`title`

---

## 部分 3/7：驱动配置（device 块）

### 读文档

1. 先执行命令查询驱动：
   ```bash
   $K drivers                        # 列出所有驱动实例
   $K driver <id>                    # 获取驱动详情（含 settings）
   ```

2. **平台没有所需驱动时**：用 `$K driver-catalog --search <关键词>` 匹配驱动目录，
   经用户确认后走 [../references/workflow-driver-create.md](../references/workflow-driver-create.md)
   自动创建安装，完成后带着新实例回到本部分

3. 参考 [../references/device.md](../references/device.md) - 驱动配置完整文档

### 写数据

**真实驱动示例（Modbus）：**

```json
{
  "device": {
    "driver": "modbus",
    "driverType": "modbus",
    "driverName": "Modbus 驱动",
    "driverExampleId": "69f1a55e-1234-5678-90ab-cdef12345678",
    "groupId": "69f1a55e-1234-5678-90ab-cdef12345678",
    "driverGroupId": "modbus_$$_69f1a55e-1234-5678-90ab-cdef12345678",
    "emulator": false,
    "settings": {
      "ip": "192.168.1.100",
      "port": 502
    }
  }
}
```

**测试驱动示例（固定配置）：**

```json
{
  "device": {
    "driver": "test",
    "driverType": "测试驱动",
    "driverName": "测试驱动",
    "driverExampleId": "test",
    "groupId": "test",
    "driverGroupId": "test_$$_test",
    "emulator": false,
    "settings": {}
  }
}
```

### 校验规则

1. **驱动查询前置**：必须先执行 `$K drivers` 检查驱动是否存在
2. **驱动字段映射**：
   - `driver` 和 `driverType` 必须相同
   - `driverExampleId` 必须来自 `$K drivers` 返回的 `id`
   - `groupId` 必须与 `driverExampleId` 相同
   - `driverGroupId` 格式必须为 `{driverType}_$$_{id}`
3. **测试驱动固定配置**：
   - `driver` = `"test"`
   - `driverType` = `"测试驱动"`
   - `driverName` = `"测试驱动"`
   - `driverExampleId` = `"test"`
   - `groupId` = `"test"`
   - `driverGroupId` = `"test_$$_test"`
   - `emulator` = `false`
   - `settings` = `{}`
4. **settings 校验**：连接参数必须来自 `$K driver <id>` 返回的 `device.settings`

---

## 部分 4/7：数据点（tags）

### 读文档

1. 先执行命令查询驱动 schema：
   ```bash
   $K driver-schema <driverType>     # 获取点位字段定义
   ```

2. 参考 [../references/device-tag.md](../references/device-tag.md) - 数据点完整文档

### 写数据

**基础字段（所有驱动通用）：**

```json
{
  "id": "temperature",
  "name": "温度",
  "policy": "save",
  "unit": "℃",
  "fixed": 1,
  "rw": false
}
```

**驱动字段（Modbus 示例）：**

```json
{
  "area": 3,
  "offset": 0,
  "dataType": "FloatBE"
}
```

**完整点位（合并）：**

```json
{
  "id": "temperature",
  "name": "温度",
  "policy": "save",
  "unit": "℃",
  "fixed": 1,
  "rw": false,
  "area": 3,
  "offset": 0,
  "dataType": "FloatBE"
}
```

**tags 数组：**

```json
{
  "tags": [
    { "id": "temperature", "name": "温度", "policy": "save", "unit": "℃", "fixed": 1, "area": 3, "offset": 0, "dataType": "FloatBE" },
    { "id": "humidity", "name": "湿度", "policy": "save", "unit": "%", "fixed": 1, "area": 3, "offset": 2, "dataType": "FloatBE" },
    { "id": "switch", "name": "开关", "policy": "save", "rw": true, "area": 0, "offset": 0, "dataType": "Boolean" }
  ]
}
```

### 校验规则

1. **基础字段校验**：
   - `id`：必填，点位标识
   - `name`：必填，点位名称
   - `policy`：可选，枚举值 `save`/`change`/`drop`/`period`
   - `unit`：可选，单位
   - `fixed`：可选，小数位数
   - `rw`：可选，是否可读写
2. **驱动字段校验**：
   - 必须先执行 `$K driver-schema <driverType>` 获取必填字段
   - 点位的驱动字段必须符合驱动 schema 定义
   - 枚举值必须在驱动 schema 定义的范围内
3. **测试驱动特殊规则**：
   - 不需要 `area`、`offset`、`dataType` 等协议字段
   - 只需要基础字段：`id`、`name`、`policy`、`unit`、`fixed` 等

---

## 部分 5/7：指令（commands）

### 读文档

参考 [../references/device-command.md](../references/device-command.md) - 指令完整文档

### 写数据

```json
{
  "commands": [
    {
      "name": "启动",
      "showName": "启动设备",
      "retry": 3,
      "tag": { "id": "switch", "name": "开关" },
      "ops": [{ "param": "start" }]
    },
    {
      "name": "停止",
      "showName": "停止设备",
      "retry": 3,
      "tag": { "id": "switch", "name": "开关" },
      "ops": [{ "param": "stop" }]
    }
  ]
}
```

### 校验规则

- `name`：必填，指令标识
- `showName`：必填，显示名称
- `retry`：可选，重试次数
- `tag`：必填，关联的数据点
- `ops`：必填，操作参数数组

---

## 部分 6/7：事件（events）

### 读文档

参考 [../references/device-event.md](../references/device-event.md) - 事件完整文档

### 写数据

```json
{
  "events": [
    { "id": "online", "name": "设备上线" },
    { "id": "offline", "name": "设备离线" },
    { "id": "fault", "name": "设备故障" }
  ]
}
```

### 校验规则

- `id`：必填，事件标识
- `name`：必填，事件名称

---

## 部分 7/7：报警规则（warning.rules）

### 读文档

参考 [../references/device-warning-rule.md](../references/device-warning-rule.md) - 报警规则完整文档

### 写数据

```json
{
  "warning": {
    "rules": [
      {
        "id": "temp_high",
        "warningname": "温度超限",
        "level": "高",
        "logic": {
          "logic": { ">": [{ "var": "temperature" }, 80] },
          "type": "jsonlogic"
        }
      },
      {
        "id": "temp_low",
        "warningname": "温度过低",
        "level": "中",
        "logic": {
          "logic": { "<": [{ "var": "temperature" }, 10] },
          "type": "jsonlogic"
        }
      }
    ]
  }
}
```

### 校验规则

- `id`：必填，规则标识
- `warningname`：必填，报警名称
- `level`：必填，枚举值 `低`/`中`/`高`
- `logic`：必填，jsonlogic 表达式，`{ var: "tagId" }` 引用数据点值

---

## 最终：组装与执行

### 组装完整 schema

```json
{
  "id": "ac_devices",
  "title": "空调设备",
  "template": "device",
  "function": ["device", "warning", "computed"],
  "schema": {
    "type": "object",
    "name": "ac_devices",
    "title": "空调设备",
    "properties": { /* 部分 2 */ },
    "formLayout": { "cols": 3, "labelLayout": "vertical" },
    "formSchema": [ /* 部分 2 */ ],
    "tableSchema": [ /* 部分 2 */ ]
  },
  "device": { /* 部分 3 */
    "settings": { /* ... */ },
    "tags": [ /* 部分 4 */ ],
    "commands": [ /* 部分 5 */ ],
    "events": [ /* 部分 6 */ ]
  },
  "computed": {
    "tags": []
  },
  "warning": {
    "rules": [ /* 部分 7 */ ]
  }
}
```

### 校验完整 schema

参考 [../references/validation-rules.md](../references/validation-rules.md)：
- § 一：表结构校验
- § 二：设备配置校验
- § 三：数据点校验

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
- `tableMajorType` 是否为 `device`（不是 `normal`）
- `tags` 是否正确创建
- `commands`、`events` 是否正确配置
- `warning.rules` 是否正确配置
- 种子数据是否完整写入（如果有）

---

## 常见错误与修复

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `tableMajorType 为 normal` | function 未包含 "device" | 修改 function 为 `["device", "warning", "computed"]` |
| `驱动不存在` | 未先执行 `$K drivers` 检查 | 先查询驱动，或使用测试驱动 |
| `点位缺少必填字段` | 未执行 `$K driver-schema` | 先查询驱动 schema，再填写点位 |
| `formSchema colSpan 未填满` | 某行 colSum < cols | 调整 colSpan 使每行填满 |

---

## 关联文档

- 设备管理总览：[../references/device.md](../references/device.md)
- 表结构完整：[../references/table-schema.md](../references/table-schema.md)
- 字段规则：[../references/table-field-rules.md](../references/table-field-rules.md)
- 校验规则：[../references/validation-rules.md](../references/validation-rules.md)
