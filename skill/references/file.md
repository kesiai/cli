# 文件管理

文件/媒体上传和管理。上传后获得文件对象，附件控件（upload、upload-group）以**文件对象数组**形式存储记录值。

## 命令

### 上传文件

```bash
$K file-upload <filePath> [--name filename] [--mime mimeType]
```

返回文件对象（含 `url`、`name` 等字段）。

> 上传走 `/mediaLibrary` 端点，返回结构与前端表单上传一致。

### 查询文件信息

```bash
$K file-info <id>
```

### 删除文件

```bash
$K file-delete <id>
```

## 与控件的关系

- `upload` 控件：记录值为单个文件对象，如 `{"name":"report.pdf","url":"..."}`
- `upload-group` 控件：记录值为文件对象数组，如 `[{"name":"a.jpg","url":"..."}]`，前端渲染为图片预览模式

## 使用流程

```
1. $K file-upload ./photo.jpg   → {"name":"photo.jpg","url":"/core/mediaLibrary/.../photo.jpg"}
2. $K record-create myTable --json '{"photos":[{"name":"photo.jpg","url":"..."}]}'
```

## 关联

- 控件详情见 [controls/upload.md](table/controls/upload.md)、[controls/upload-group.md](table/controls/upload-group.md)
- 记录管理见 [record.md](record.md)
