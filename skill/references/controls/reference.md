# reference

引用（从其他表引用字段值）。

## 字段定义

```json
{
  "key": "refField",
  "type": "string",
  "controlType": "reference",
  "title": "引用字段"
}
```

## 记录值示例

```json
{ "refField": "引用值" }
```

## 说明

- 从关联表的指定字段自动拉取值
- 与 `relate` 的区别：`reference` 直接引用字段值而非记录 ID
- 配置方式通过 `config` 或 `relate` 指定来源表和字段
