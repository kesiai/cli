# serial-number

序列号（自动编号）。

## 字段定义

```json
{
  "key": "serialNo",
  "type": "string",
  "controlType": "serial-number",
  "title": "编号"
}
```

## 记录值示例

```json
{ "serialNo": "SN-2024-001" }
```

## 说明

- 创建记录时可手动填写，也可由后端自动生成
- 常用于工单编号、设备编号等需要唯一标识的场景
- 自动生成规则通过 `config` 配置（前缀、起始值、步长等）
