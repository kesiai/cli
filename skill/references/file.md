# 文件与媒体库

文件上传实际入**媒体库**（`core/mediaLibrary`，平台「业务模块-媒体库」页）。上传返回 `{url}`，附件控件（upload、upload-group）以**文件对象**形式存记录值。

## 命令

### 上传

```bash
$K file-upload <filePath> [--name filename] [--mime mimeType] [--catalog <目录path>]
```

- 返回 `{"url":"/core/fileServer/mediaLibrary/..."}`（无 id）
- `--catalog` 指定目标目录（path 用 `media-dirs` 查，如 `我的文件/自定义组件`）；**不传会落在文件服务项目根，媒体库页不可见**
- ⚠️ **平台没有删除端点**：上传不可逆（前端媒体库页也没有删除按钮），传错只能覆盖同名（action=cover）

### 媒体库浏览

```bash
$K media-dirs                 # 全量目录树（name/path/child[]）
$K media-ls [path]            # 目录内容（path 省略 = 根列表；目录 path 如 "我的文件/驱动模板"）
$K media-mkdir <dirName> [--catalog <父目录path>]     # 建目录（⚠️ 同样不可删除，创建前想清楚）
```

> 旧 `file-info` / `file-delete` 命令指向不存在的 `/api/files/:id`（死端点），已移除；媒体库的文件/目录管理平台只提供「上传 + 建目录」两个写操作。

## 目录结构（根列表）

| 目录 | 用途 |
|------|------|
| `我的文件` | 当前用户上传区（userFiles/admin） |
| `内置资源` / `下载资源` / `共享自定义组件` / `共享驱动模板` / `国际化语言包` | 平台预置，勿动 |

## 与控件的关系

- `upload` 控件：记录值为单个文件对象，如 `{"name":"report.pdf","url":"..."}`
- `upload-group` 控件：记录值为文件对象数组，如 `[{"name":"a.jpg","url":"..."}]`，前端渲染为图片预览模式

## 使用流程

```
1. $K media-dirs                                     → 找目标目录 path
2. $K file-upload ./photo.jpg --catalog 我的文件      → {"url":"/core/fileServer/..."}
3. $K record-create myTable --json '{"photos":[{"name":"photo.jpg","url":"..."}]}'
```

## 关联

- 控件详情见 [controls/upload.md](table/controls/upload.md)、[controls/upload-group.md](table/controls/upload-group.md)
- 记录管理见 [record.md](record.md)
