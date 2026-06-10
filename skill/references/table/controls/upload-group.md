# upload-group

图片上传（多图）。

## 字段定义

```json
{
  "key": "photos",
  "type": "array",
  "controlType": "upload-group",
  "title": "照片"
}
```

## 记录值示例

```json
{ "photos": ["img-id-001", "img-id-002"] }
```

## 说明

- 与 `upload` 结构一致，区别是前端渲染为图片预览+上传组件
- 值为文件 ID 数组，通常用于图片类型文件
