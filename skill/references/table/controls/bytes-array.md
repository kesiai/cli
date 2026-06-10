# bytes-array

字节数组。

## 字段定义

```json
{
  "key": "data",
  "type": "string",
  "controlType": "bytes-array",
  "title": "数据"
}
```

## 记录值示例

```json
{ "data": "AAECAwQ=" }
```

## 说明

- 值为 Base64 编码的字节数据
- 适用于二进制数据存储场景（如设备报文、配置字节等）
