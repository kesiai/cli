# number

数字输入。

## 字段定义

```json
{
  "key": "age",
  "type": "number",
  "controlType": "number",
  "title": "年龄"
}
```

## 记录值示例

```json
{ "age": 42 }
```

## dbType —— 数据库存储类型（决定能否存小数）

| dbType | 服务端类型 | 小数 |
|--------|-----------|------|
| `"Double"` | float64 | ✅ 完整保留 |
| `"Int32"` / `"Int64"` | 整数 | ❌ 截断 |
| 未设 | int | ❌ REST 直接拒绝（`cannot unmarshal ... of type int`） |

```json
{
  "key": "temperature",
  "type": "number",
  "controlType": "number",
  "title": "温度",
  "dbType": "Double"
}
```

> ⚠️ 合法值**只有 `Int32` / `Int64` / `Double` 三种**。`Float` / `Decimal` 平台不识别——不报错，但字段回落整数存储，小数被静默截断。**需要小数的字段必须显式设 `"dbType": "Double"`**（建表时定好；属性平铺在字段顶层，不在 config 里）。

## 其他字段属性（顶层平铺）

| 属性 | 说明 |
|------|------|
| `min` / `max` | 允许的最小/最大值 |
| `decimal` | 小数位数精度（显示层） |
| `unit` | 数字单位 |
| `textContent` + `jsLogic` | `origin` 原始值 / `logic` 公式计算（如 `row.a + row.b`） |
| `readOnly` | 只读 |
