// 记录值级写前校验（record-create / record-update）：与 kesi-skill-test/lib/checks.mjs 的 records-match-own-schema 同源。
// 原则：create 查全部字段；update 只查本次提交触及的键（旧记录的存量空值/旧枚举不阻塞合法局部更新）。

export function validateRecordData(
  properties: Record<string, any>,
  merged: any,                     // create=提交数据；update=与原记录合并后的最终值
  touched?: Record<string, any>,   // update 时传本次提交的键集合（未知键 + 必填/枚举/类型的触发范围）；create 省略
): string[] {
  const errors: string[] = [];
  const keys = touched || merged || {};

  // 未知键：写入不报错但不显示在任何页面（无对应列/表单项），几乎必然是字段名写错
  const legal = Object.keys(properties).filter((k) => !k.startsWith('_'));
  for (const key of Object.keys(keys)) {
    if (key.startsWith('_')) continue;
    if (!(key in properties)) {
      errors.push(`字段 "${key}" 不在表 schema 中（合法字段: ${legal.join(', ')}）——写入后不会显示在任何页面`);
    }
  }

  for (const [key, f] of Object.entries(properties)) {
    if (!f || typeof f !== 'object') continue;
    if (touched && !(key in touched)) continue;
    const val = merged ? merged[key] : undefined;
    const empty = val === undefined || val === null || val === '';
    if ((f.need || f.required) && empty) {
      errors.push(`必填字段 "${key}" 为空`);
      continue;
    }
    if (empty) continue;
    if (Array.isArray(f.enum) && f.enum.length) {
      const names = Array.isArray(f.enumNames) ? f.enumNames : [];
      const ok = (v: any) => f.enum.includes(v) || f.enum.map(String).includes(String(v)) || names.includes(v);
      // select-array-*（type: array）值为数组：逐元素校验，空数组=未选，合法（controls/select-array-string.md）
      const items = Array.isArray(val) ? val : [val];
      for (const item of items) {
        if (!ok(item)) {
          errors.push(`字段 "${key}" 值 ${JSON.stringify(item)} 不在枚举 [${f.enum.join(',')}${names.length ? '/' + names.join(',') : ''}]`);
        }
      }
    }
    if (f.type === 'number' && typeof val !== 'number') {
      errors.push(`字段 "${key}" 期望 number，实际 ${typeof val}(${JSON.stringify(val)})`);
    }
    // 平台实测：number 字段的小数会被后端截断为整数存储（写 2.5 读回 2，PATCH 同样），静默丢精度——写前拦截
    if (f.type === 'number' && typeof val === 'number' && !Number.isInteger(val)) {
      errors.push(
        `字段 "${key}" 值 ${val} 含小数：平台会把 number 字段截断为整数存储（写 ${val} 实际存 ${Math.trunc(val)}），拒绝写入以免静默丢精度——请改用整数，或与平台方确认小数支持后再写`,
      );
    }
  }
  return errors;
}
