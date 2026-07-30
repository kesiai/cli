# map

地图定位。

## 字段定义

```json
{
  "key": "location",
  "type": "object",
  "controlType": "map",
  "title": "定位"
}
```

## 记录值示例

```json
{ "location": { "lng": 116.397, "lat": 39.908 } }
```

## 说明

- `type` 为 `"object"`，值为包含经纬度的对象
- 前端渲染为地图选点组件
- 经度 `lng`，纬度 `lat`
