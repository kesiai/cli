# upload-group

文件上传（附件组 / 多图）。

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

存储结构与 `upload` 完全一致——**文件对象数组**：

```json
{
  "photos": [
    { "name": "a.jpg", "url": "/core/mediaLibrary/xxx/a.jpg" },
    { "name": "b.jpg", "url": "/core/mediaLibrary/xxx/b.jpg" }
  ]
}
```

## 说明

- 与 `upload` 存储结构一致，区别是前端渲染为图片卡片预览 + 上传组件
- 文件对象字段同 [upload.md](upload.md)，核心为 `name` + `url`
- 通常用于图片，可附 `thumbUrl` 生成缩略图
