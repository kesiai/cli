# 数据字典（core/systemVariable）

平台「数据字典」页面的数据源。字典项 = 全局键值对（编号 `uid` → 值 `value`），值类型六选一；系统预置的统计变量（报警总数 `warnCount` 等）也存在这里。

## 命令

| 命令 | 说明 |
|------|------|
| `$K dicts` | 字典列表（⚠️ 列表投影**不含 value**，只有 id/name/type/uid） |
| `$K dict <idOrUid>` | 字典详情（含 value；接受 id 或编号 uid） |
| `$K dict-create -n <名> --uid <编号> --type <类型> --value <值>` | 创建 |
| `$K dict-update <idOrUid> [--name] [--uid] [--type] [--value]` | 局部更新（未传字段保持原值） |
| `$K dict-delete <idOrUid>` | 删除 |

## type 与 value 形态（服务端按 type 强校验）

| type | --value 写法 | 说明 |
|------|--------------|------|
| `number` | `--value 150` | 数字 |
| `string` | `--value hello` | 原样字符串 |
| `boolean` | `--value true` | 必须真布尔；字符串 `"true"` 会被平台 400 拒绝 |
| `date` | `--value "2026-01-02 03:04:05"` | 必须时间字符串；毫秒时间戳会被 400 拒绝 |
| `object` | `--value '{"unit":"kWh","max":200}'` | JSON 对象 |
| `array` | `--value '[1,2,3]'` | JSON 数组 |

## 关键语义（真机验证）

- **四项全必填**：name / uid / type / value（缺了平台分步报「名称为空 / 编号为空 / 必填项 值 为空」）
- **uid 全库唯一**：create 与 update 都查重（改成已占用的编号 → 400 编号重复）
- **平台不校验 type**：`type:"int"` 也能 200 存入，但字典页打不开——CLI 守卫六枚举，乱填会被拒
- **列表端点不支持 filter**（query 里的过滤条件被静默忽略）→ `dicts` 只能全量拉；`dict <uid>` 内部本地匹配，无需手查
- PATCH 局部更新不返回实体，`dict-update` 自动回读详情输出
- 删除幂等：删不存在的 id 也返回 OK
- 预置项（`warnCount` / `confirmCount` / `processedCount` / `warnDeviceCount`）是报警统计变量，**不要修改或删除**

## 常见错误

| 报错 | 原因 | 处理 |
|------|------|------|
| `不支持的类型 "int"` | type 不在六枚举内（CLI 守卫，平台自己不拦） | 换 number/string/boolean/date/object/array |
| `type=number 但值 "abc" 不是数字` | value 与 type 不匹配 | 按 type 形态传值 |
| `type=date 但值 … 不是时间字符串` | 传了毫秒时间戳 | 改传 `"YYYY-MM-DD HH:mm:ss"` 字符串 |
| `API 错误 (400): 编号重复` | uid 已被占用 | 换 uid，或用 `dict-update` 改已有项 |
| `必填项 值 为空` | 没传 --value | 四项全给 |
