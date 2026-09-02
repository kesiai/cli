// 表结构写前校验（table-create / table-update）：与 kesi-skill-test/lib/checks.mjs 同源，平台冒烟校准 2026-08-31。
// 原则：create 全查；update 只查本次提交涉及的部分（避免旧表的存量问题阻塞正常局部更新）。

export const TEMPLATE_MAP: Record<string, { fn: string[]; major: string }> = {
  common: { fn: [], major: 'normal' },
  device: { fn: ['computed', 'device', 'warning'], major: 'device' },
  department: { fn: ['dataAuth'], major: 'dataAuth' },
  settable: { fn: ['settable'], major: 'settable' },
  tableMapping: { fn: ['tableMapping'], major: 'tableMapping' },
  tableClasses: { fn: ['tableClasses'], major: 'tableClasses' },
};

// 平台表详情（GET 回来的）没有 template 字段，用 tableMajorType 反推（冒烟校准 2026-08-31）
const MAJOR_TO_TEMPLATE = Object.fromEntries(Object.entries(TEMPLATE_MAP).map(([k, v]) => [v.major, k]));

// 各模板预设字段（存在性 + 关键属性精确比对）；tableMapping 特例：properties 必须为空
const PRESET_FIELDS: Record<string, Record<string, { controlType: string; need: boolean; unique?: boolean; enum?: any[] }>> = {
  device: {
    id: { controlType: 'text', need: true },
    name: { controlType: 'text', need: true },
    connectTime: { controlType: 'date', need: false },
    disable: { controlType: 'boolean', need: false },
    online: { controlType: 'boolean', need: false },
    off: { controlType: 'boolean', need: false },
    warnFlag: { controlType: 'boolean', need: false },
  },
  department: {
    id: { controlType: 'text', need: true },
    name: { controlType: 'text', need: true },
  },
  settable: {
    id: { controlType: 'text', need: true },
    table: { controlType: 'text', need: true },
    tabledata: { controlType: 'text', need: true },
  },
  tableClasses: {
    classesID: { controlType: 'text', need: true, unique: true },
    classesName: { controlType: 'text', need: true, unique: true },
    endCycle: { controlType: 'select-string', need: true, enum: ['now', 'next'] },
    endTime: { controlType: 'time', need: true },
    startCycle: { controlType: 'select-string', need: true, enum: ['before', 'now', 'after'] },
    startTime: { controlType: 'time', need: true },
  },
};

const FULLROW_CONTROL_TYPES = ['rich-text', 'editable-table', 'map'];
const POLICY_ENUM = ['save', 'change', 'drop', 'period'];
const PROTOCOL_TAG_FIELDS = ['area', 'offset', 'dataType', 'nodeId', 'topic'];
const DEPRECATED_DEVICE_KEYS = ['driverType', 'driverName', 'driverExampleId', 'driverGroupId'];
const DEVICE_REQUIRED_KEYS = ['driver', 'groupId', 'emulator', 'settings', 'tags'];

/**
 * schema 块新旧格式归一（UI 层 trans 的 CLI 内等价物，防格式漂移时校验静默失效）：
 * 旧格式：{ fields|properties: {...}, required: ['a','b'] }（required 与字段映射同级，JSON Schema 风格，驱动 schema 现行）
 * 新格式：字段映射内逐字段 need:true（表 schema 现行）
 * 两种都归一成 { required, fields }。
 */
export function normalizeSchemaBlock(block: any): { required: string[]; fields: Record<string, any> } {
  const b = block && typeof block === 'object' ? block : {};
  const fields: Record<string, any> = b.fields || b.properties || {};
  const required: string[] = Array.isArray(b.required)
    ? b.required
    : Object.keys(fields).filter((k) => fields[k] && (fields[k].need === true || fields[k].required === true));
  return { required, fields };
}

/** 表 id 命名规范（平台正则）：不满足时返回错误消息，满足返回 null */
export function tableIdError(id: unknown): string | null {
  return /^[a-z][a-z0-9_]*$/.test(String(id || ''))
    ? null
    : `表 id "${id}" 不满足 ^[a-z][a-z0-9_]*$（小写字母开头，只含小写字母/数字/下划线）`;
}

export interface TableGuardInput {
  payload: any;   // 本次提交的原始数据（update 时判断哪些部分需要校验）
  merged: any;    // create 时 = payload；update 时 = 与现有表深合并后的完整数据
  isUpdate: boolean;
  drivers?: any[];      // 可选：驱动实例列表（校验 device.driver 能匹配到实例）
  driverSchema?: any;   // 可选：驱动 schema（校验 tags 驱动字段 required/enum）
}

/**
 * 设备表 guard 上下文（fail-open）：非测试驱动时拉驱动实例列表 + schema，
 * 供「driver/groupId 必须匹配 running 实例」「tags 驱动字段按 schema 校验」使用；拉不到就跳过这部分校验。
 */
export async function buildDriverContext(client: any, data: any): Promise<{ drivers?: any[]; driverSchema?: any }> {
  const device = data && data.device;
  if (!device || device.driver === undefined || device.driver === 'test') return {};
  try {
    const drivers = await client.getDriverInstances();
    const hit = drivers.find((d: any) => d && d.driverType === device.driver && d.groupId === device.groupId);
    if (!hit) return { drivers };
    try {
      return { drivers, driverSchema: await client.getDriverSchema(device.driver) };
    } catch {
      return { drivers };
    }
  } catch {
    return {};
  }
}

export function validateTableGuard(input: TableGuardInput): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { payload, merged, isUpdate } = input;

  // 1. 表 id 命名 + schema 一致性（create 必查；update 时 id 不可改，跳过）
  if (!isUpdate) {
    const idErr = tableIdError(merged.id);
    if (idErr) errors.push(idErr);
    if (!merged.title) errors.push('表缺少 title');
    const schema = merged.schema || {};
    if (schema.name !== undefined && schema.name !== merged.id) errors.push(`schema.name(${schema.name}) 必须等于表 id(${merged.id})`);
    if (schema.title !== undefined && schema.title !== merged.title) errors.push(`schema.title(${schema.title}) 必须等于表 title(${merged.title})`);
    if (schema.type !== undefined && schema.type !== 'object') errors.push(`schema.type 必须是 "object"，实际 ${schema.type}`);
  }

  // 2. template 枚举 + function/tableMajorType 配对（表详情无 template 时按 tableMajorType 反推）
  const touchesTemplate = !isUpdate || payload.template !== undefined || payload.function !== undefined;
  const template = merged.template || (isUpdate ? MAJOR_TO_TEMPLATE[merged.tableMajorType] : undefined);
  if (touchesTemplate) {
    const want = TEMPLATE_MAP[template];
    if (!want) {
      errors.push(`未知模板 template="${template}"，合法值: ${Object.keys(TEMPLATE_MAP).join('/')}`);
    } else {
      const fn = Array.isArray(merged.function) ? [...merged.function].sort() : [];
      const fnWant = [...want.fn].sort();
      if (JSON.stringify(fn) !== JSON.stringify(fnWant)) {
        errors.push(`template="${template}" 的 function 期望 [${fnWant.join(',')}]，实际 [${(merged.function || []).join(',')}]`);
      }
      if (merged.tableMajorType !== undefined && merged.tableMajorType !== want.major) {
        errors.push(`template="${template}" 的 tableMajorType 期望 ${want.major}，实际 ${merged.tableMajorType}`);
      }
    }
  }

  const properties = (merged.schema && merged.schema.properties) || {};

  // 3. 预设字段（tableMapping 特例：必须空）
  const touchesProperties = !isUpdate || (payload.schema && payload.schema.properties !== undefined);
  if (touchesProperties && template) {
    if (template === 'tableMapping') {
      if (Object.keys(properties).length > 0) {
        errors.push(`tableMapping（映射表）创建时 properties 必须为空 {}（字段由外部数据库映射同步），实际含 ${Object.keys(properties).join(',')}`);
      }
    } else {
      const preset = PRESET_FIELDS[template];
      if (preset) {
        for (const [key, exp] of Object.entries(preset)) {
          const f = properties[key];
          if (!f) { errors.push(`template="${template}" 缺预设字段 ${key}`); continue; }
          if (f.controlType !== exp.controlType) errors.push(`预设字段 ${key}.controlType 期望 ${exp.controlType}，实际 ${f.controlType}`);
          if (f.need !== undefined && f.need !== exp.need) errors.push(`预设字段 ${key}.need 期望 ${exp.need}，实际 ${f.need}`);
          if (exp.unique && f.unique !== true) errors.push(`预设字段 ${key} 必须 unique: true`);
          if (exp.enum && (JSON.stringify(f.enum) !== JSON.stringify(exp.enum))) {
            errors.push(`预设字段 ${key}.enum 期望 [${exp.enum.join(',')}]，实际 ${JSON.stringify(f.enum)}`);
          }
        }
      }
    }
  }

  // 4. formSchema 行满（colSpan 合法、整行控件、每行和=cols、key 必须在 properties）
  const touchesForm = !isUpdate || payload.formSchema !== undefined || (payload.schema && payload.schema.formSchema !== undefined);
  if (touchesForm) {
    const schema = merged.schema || {};
    const formSchema = schema.formSchema !== undefined ? schema.formSchema : merged.formSchema;
    const cols = Number((schema.formLayout && schema.formLayout.cols) || (merged.formLayout && merged.formLayout.cols) || 3);
    if (Array.isArray(formSchema) && formSchema.length > 0) {
      if (![1, 2, 3].includes(cols)) {
        errors.push(`formLayout.cols 非法: ${cols}（合法 1/2/3）`);
      } else {
        let sum = 0;
        formSchema.forEach((item: any, i: number) => {
          const key = item.key;
          const field = properties[key];
          const span = item.colSpan ?? 1;
          if (!(Number.isInteger(span) && span >= 1 && span <= cols)) {
            errors.push(`formSchema[${i}](${key}) colSpan=${span} 越界 [1,${cols}]`);
          }
          if (FULLROW_CONTROL_TYPES.includes(field && field.controlType) && span !== cols) {
            errors.push(`${key}(${field.controlType}) 必须独占整行 colSpan=${cols}，实际 ${span}`);
          }
          if (Object.keys(properties).length > 0 && !field) {
            errors.push(`formSchema[${i}] 的 key="${key}" 在 schema.properties 中不存在`);
          }
          sum += span;
          if (sum === cols) sum = 0;
          else if (sum > cols) {
            errors.push(`formSchema 在 ${key} 处行累加 ${sum} > cols=${cols}（每行 colSpan 之和必须等于 cols，不允许留空）`);
            sum = span > cols ? 0 : span;
          }
        });
        if (sum !== 0) errors.push(`formSchema 末行未填满：colSpan 累加余 ${sum}，应为 0`);
      }
    }
  }

  // 5. device 块（template=device 时）：废弃字段禁令 + 必备键 + 实例匹配 + tags
  const touchesDevice = template === 'device' && (!isUpdate || payload.device !== undefined);
  if (touchesDevice) {
    const device = merged.device;
    if (!device || typeof device !== 'object') {
      errors.push('设备表缺少 device 块（必填 driver/groupId/emulator/settings/tags）');
    } else {
      // 废弃字段只拦本次提交带入的（update 时原表存量不算，避免阻塞对旧表的合法局部编辑）
      const deviceSource = isUpdate ? (payload.device || {}) : device;
      for (const legacy of DEPRECATED_DEVICE_KEYS) {
        if (deviceSource[legacy] !== undefined) {
          errors.push(`device.${legacy} 已废弃（驱动关联只允许 driver/groupId），请从提交中移除后重试`);
        }
      }
      for (const k of DEVICE_REQUIRED_KEYS) {
        if (device[k] === undefined) errors.push(`device 块缺少必备键 ${k}`);
      }
      const isTest = device.driver === 'test';
      if (!isTest && input.drivers) {
        const hit = input.drivers.some(
          (d) => d && d.driverType === device.driver && d.groupId === device.groupId && d.state === 'running',
        );
        if (!hit) {
          errors.push(`device.driver(${device.driver}) + groupId(${device.groupId}) 匹配不到 running 的驱动实例，请先 $K drivers 确认并复制实例的 driverType/groupId`);
        }
      }
      // tags 基础字段 + 驱动字段
      if (Array.isArray(device.tags)) {
        const seen = new Set<string>();
        device.tags.forEach((tag: any, i: number) => {
          const label = tag.id || `tags[${i}]`;
          if (!tag.id) errors.push(`device.tags[${i}] 缺少 id`);
          else if (seen.has(tag.id)) errors.push(`点位 id 重复: ${tag.id}`);
          seen.add(tag.id);
          if (!tag.name) errors.push(`${label} 缺少 name`);
          if (tag.policy !== undefined && !POLICY_ENUM.includes(tag.policy)) {
            errors.push(`${label}.policy=${tag.policy} 不在 ${POLICY_ENUM.join('/')}`);
          }
          if (isTest) {
            for (const pf of PROTOCOL_TAG_FIELDS) {
              if (tag[pf] !== undefined) errors.push(`测试驱动点位 ${tag.id} 不应包含协议字段 ${pf}（测试驱动只用 id/name/policy/unit/fixed）`);
            }
          }
        });
        if (!isTest && input.driverSchema) {
          const { required, fields } = normalizeSchemaBlock(
            (input.driverSchema.model && input.driverSchema.model.tags)
            || (input.driverSchema.device && input.driverSchema.device.tags),
          );
          device.tags.forEach((tag: any) => {
            for (const rf of required) {
              if (tag[rf] === undefined || tag[rf] === null || tag[rf] === '') {
                errors.push(`点位 ${tag.id} 缺少驱动必填字段 ${rf}（来自 driver-schema 的 tags.required）`);
                continue;
              }
              const def = fields[rf] || {};
              if ((def.type === 'number' || def.type === 'integer') && typeof tag[rf] !== 'number') {
                errors.push(`点位 ${tag.id}.${rf} 期望 number，实际 ${typeof tag[rf]}(${tag[rf]})`);
              }
              const enumVals = def.enum || (Array.isArray(def.options) ? def.options.map((o: any) => (o && o.value !== undefined ? o.value : o)) : null);
              if (enumVals && enumVals.length && !enumVals.includes(tag[rf]) && !enumVals.map(String).includes(String(tag[rf]))) {
                errors.push(`点位 ${tag.id}.${rf}=${tag[rf]} 不在合法枚举 [${enumVals.join(',')}]`);
              }
            }
          });
        }
      }
    }
  }

  return { errors, warnings };
}
