# 系统设置（core/setting）

平台全局单例配置：系统名称、语言、登录限制、告警通道（邮件/微信/钉钉/短信）、时序库策略等。**改动即时影响整个平台**（登录页、界面标题、告警投递），写前想清楚、测完必须还原。

## 命令

| 命令 | 说明 |
|------|------|
| `$K setting` | 全量读（含 id；空值字段多属未配置） |
| `$K setting-fields` | 字段类型速查 |
| `$K setting-update --json '<键值>'` | 局部更新（按键合并，未传字段不动；CLI 自动补 id） |

## 字段类型（`$K setting-fields` 可查；不完整）

| 类型 | 字段 |
|------|------|
| string | `name`（系统名称）、`copyright`、`language`、`propTag` |
| boolean | `notShowCode`、`notShowCodeAdmin`、`useBrowserLanguage`、`enableCors`、`liteMode` |
| object | `loginDuration`、`loginLimit`、`loginSettings`、`email`、`wechat`、`dingtalk`、`sms`、`warning`、`logSaveRule`、`onlineCheck`、`bigModelSetting` |
| 只读 | `id`、`dependencies`（平台服务装配清单） |

## 关键语义（真机验证）

- **PATCH 按键合并**：只传要改的键，其他字段不动（前端是全量合并回写，CLI 局部即可）
- **PATCH 只回 `{status:"OK"}`**，不返回实体——CLI 自动回读并显示每个键的 `旧值 → 新值`
- **`name` 不可清空**：置 null → 400 字段置空失败（列非空约束）；空字符串 → 平台**静默忽略**（等于没改）。CLI 两头都拒
- **未知字段被静默吞**：PATCH 一个不存在的键返回 200 但不落库——字段名必须来自上表或 `setting` 读到的真实键
- **类型错配平台会点名**：如给 bool 字段传字符串报 `cannot unmarshal string into ... of type bool`，报错里的类型就是该字段真实类型
- `language` 可用 null 清除（回退平台默认 zh-CN）；`name` 不行
- 修改建议先 `$K setting` 记下原值，测完用 `setting-update` 还原

## 常见错误

| 报错 | 原因 | 处理 |
|------|------|------|
| `字段 "dependencies" 只读` | CLI 守卫：服务装配清单 | 不要改它 |
| `name 不允许空字符串 / null` | CLI 守卫：平台会忽略/400 | 给非空值 |
| `字段置空失败`（400） | 平台：该列非空约束 | 换可空字段或给值 |
| `cannot unmarshal X into ... of type Y` | 传值类型与字段不符 | 按报错点名的 Y 类型传 |
