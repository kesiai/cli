# user-role

用户选择器（选择系统用户）。

## 字段定义

```json
{
  "key": "creator",
  "type": "object",
  "controlType": "user-role",
  "title": "创建人"
}
```

## 记录值示例

```json
{ "creator": { "id": "user-001", "name": "张三" } }
```

## 说明

- `type` 为 `"object"`，值为包含用户 ID 和名称的对象
- 系统自动注入当前用户信息（创建人/修改人字段常用此控件）
- 前端渲染为用户选择下拉框
