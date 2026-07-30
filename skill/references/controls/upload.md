# upload

文件上传（单附件）。

## 字段定义

```json
{
  "key": "attachment",
  "type": "object",
  "controlType": "upload",
  "title": "附件"
}
```

## 记录值示例

值为**单个文件对象**（不是数组，也不是文件 ID）：

```json
{
  "attachment": { "name": "report.pdf", "url": "/core/mediaLibrary/xxx/report.pdf" }
}
```

## 文件对象结构

| 字段 | 必需 | 说明 |
|------|------|------|
| `name` | 是 | 文件名，用于显示与下载 |
| `url` | 是 | 文件访问路径，前端读取时自动补 `/rest` 前缀 |
| `size` | 否 | 文件大小（字节） |
| `thumbUrl` | 否 | 缩略图地址（图片类） |
| `response` | 否 | 上传接口完整响应，读取时作为 `url` 的兜底（`response.url`） |

> 读取优先级：`url` → `response.url`。

## 说明

- `type` 为 `"object"`，值为单个文件对象（单附件，前端上传组件 `multiple=false`）
- 文件经 `$K file-upload` 上传，取返回对象填入字段（前端表单走 `/core/mediaLibrary/upload`，`onChange` 直接以该结构落库）
- 多附件场景使用 `upload-group`（`type` 为 `array`，见 [upload-group.md](upload-group.md)）
- 列表/详情由附件展示组件读取 `name` + `url` 渲染（单个对象会被兜底包成数组渲染）
