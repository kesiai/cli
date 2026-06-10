# upload

文件上传。

## 字段定义

```json
{
  "key": "attachment",
  "type": "array",
  "controlType": "upload",
  "title": "附件"
}
```

## 记录值示例

```json
{ "attachment": ["file-id-001", "file-id-002"] }
```

## 说明

- `type` 为 `"array"`，值为文件 ID 数组
- 文件通过 `kesi file-upload` 上传后获得 ID
- 用 `kesi file-info <id>` 查询文件详情
