# 文件管理

文件/媒体上传和管理。上传后获得文件 ID，其他控件（如 upload、upload-group）通过 ID 引用文件。

## 命令

### 上传文件

```bash
kesi file-upload <filePath> [--name filename] [--mime mimeType]
```

返回文件 ID。

### 查询文件信息

```bash
kesi file-info <id>
```

### 删除文件

```bash
kesi file-delete <id>
```

## 与控件的关系

- `upload` 控件：记录值为文件 ID 数组，如 `["file-id-001"]`
- `upload-group` 控件：同上，前端渲染为图片预览模式

## 使用流程

```
1. kesi file-upload ./photo.jpg        → 获得 "file-id-001"
2. kesi record-create myTable --json '{"photos":["file-id-001"]}'
```

## 关联

- 控件详情见 [controls/upload.md](table/controls/upload.md)、[controls/upload-group.md](table/controls/upload-group.md)
- 记录管理见 [record.md](record.md)
