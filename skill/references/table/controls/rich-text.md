# rich-text

富文本编辑器。

## 字段定义

```json
{
  "key": "description",
  "type": "string",
  "controlType": "rich-text",
  "title": "描述"
}
```

## 记录值示例

```json
{ "description": "<p>这是<b>富文本</b>内容</p>" }
```

## 说明

- 值为 HTML 字符串
- 前端通常用富文本编辑器组件渲染
