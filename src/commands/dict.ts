import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';

/** type 枚举。平台不校验 type（真机验证 type:"int" 也 200 存入）——这道闸只能 CLI 把。 */
const DICT_TYPES = ['number', 'string', 'boolean', 'date', 'object', 'array'];

/** 按 type 把 --value 解析成平台要的 JSON 形态。
 * 真机验证：服务端按 type 强校验 value——number 要数字、boolean 要真布尔（"true" 400）、
 * date 要时间字符串（毫秒数 400「传入值不是时间字符串」）。 */
function parseDictValue(type: string, raw: any): any {
  if (type === 'number') {
    const n = Number(raw);
    if (raw === '' || raw === null || raw === undefined || Number.isNaN(n)) {
      throw new Error(`type=number 但值 "${raw}" 不是数字（--value 直接传数字，如 --value 150）`);
    }
    return n;
  }
  if (type === 'boolean') {
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    throw new Error(`type=boolean 但值 "${raw}" 不是布尔（字符串 "true" 会被平台 400 拒绝；写 --value true 或 --value false）`);
  }
  if (type === 'date') {
    const s = String(raw);
    if (!/^\d{4}-\d{2}-\d{2}/.test(s)) {
      throw new Error(`type=date 但值 "${raw}" 不是时间字符串（格式如 "2026-01-02 03:04:05"；毫秒时间戳会被平台 400 拒绝）`);
    }
    return s;
  }
  if (type === 'object' || type === 'array') {
    let parsed: any;
    try {
      parsed = JSON.parse(String(raw));
    } catch {
      throw new Error(`type=${type} 的 --value 必须是合法 JSON（如 --value '{"unit":"kWh","max":200}' 或 --value '[1,2,3]'）`);
    }
    if (type === 'object' && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
      throw new Error(`type=object 但解析出的不是 JSON 对象（如 --value '{"unit":"kWh"}'）`);
    }
    if (type === 'array' && !Array.isArray(parsed)) {
      throw new Error(`type=array 但解析出的不是 JSON 数组（如 --value '[1,2,3]'）`);
    }
    return parsed;
  }
  return String(raw);
}

/** id 或 uid 双解析。id 是服务端生成的 ObjectId，用户和 agent 记住的键是编号 uid；
 * 列表端点不支持 filter（真机验证被静默忽略），只能全量拉取后本地匹配——这个坑在 CLI 内吸收。 */
async function resolveDict(key: string): Promise<{ id: string; uid: string }> {
  const client = getApiClient();
  const all = await client.getSystemVariables();
  const hit = all.find((d: any) => d.id === key) || all.find((d: any) => d.uid === key);
  if (!hit) {
    const known = all.slice(0, 10).map((d: any) => `${d.name}(${d.uid})`).join('、');
    throw new Error(`字典项 '${key}' 不存在（dict 命令接受 id 或编号 uid）。现有: ${known}`);
  }
  return { id: hit.id, uid: hit.uid };
}

/** 字典列表。注意：列表投影不含 value（只有详情有），看值用 dict <id|uid> */
export async function dictsList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getSystemVariables();
    console.log(formatOutput(result, resolveOutputFormat(options.output)));
  });
}

export async function dictGet(key: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const { id } = await resolveDict(key);
    const client = getApiClient();
    const detail = await client.getSystemVariableById(id);
    if (!detail || !detail.id) throw new Error(`字典项 '${key}' 不存在`);
    console.log(formatOutput(detail, resolveOutputFormat(options.output)));
  });
}

/** 创建字典项（name/uid/type/value 四项全必填；uid 平台查重） */
export async function dictCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    const name = String(options.name || '').trim();
    const uid = String(options.uid || '').trim();
    const type = String(options.type || '').trim();
    if (!name) throw new Error('请提供名称 (-n)');
    if (!uid) throw new Error('请提供编号 (--uid，全库唯一)');
    if (!type) throw new Error(`请提供类型 (--type，可选: ${DICT_TYPES.join(' / ')})`);
    if (!DICT_TYPES.includes(type)) {
      throw new Error(`不支持的类型 "${type}"（平台不校验 type，乱填能存进去但字典页打不开；可选: ${DICT_TYPES.join(' / ')})`);
    }
    if (options.value === undefined || options.value === '') {
      throw new Error('请提供值 (--value，必填；形态由 --type 决定)');
    }
    const value = parseDictValue(type, options.value);

    const client = getApiClient();
    const id = await client.createSystemVariable({ name, uid, type, value });
    console.log(formatSuccess('字典项创建成功'));
    console.log(formatOutput({ id, uid, name, type }, resolveOutputFormat(options.output)));
  });
}

/** 更新字典项（局部更新；PATCH 不返回实体，CLI 回读详情给结果） */
export async function dictUpdate(key: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const { id } = await resolveDict(key);
    const current = await client.getSystemVariableById(id);
    if (!current || !current.id) throw new Error(`字典项 '${key}' 不存在`);

    const payload: any = {};
    if (options.name) payload.name = String(options.name).trim();
    if (options.uid) payload.uid = String(options.uid).trim();
    if (options.type) {
      const type = String(options.type).trim();
      if (!DICT_TYPES.includes(type)) {
        throw new Error(`不支持的类型 "${type}"（可选: ${DICT_TYPES.join(' / ')})`);
      }
      payload.type = type;
    }

    // value 按生效 type 校验：优先本次 --type，否则沿用当前 type
    const effectiveType = payload.type || current.type;
    if (options.value !== undefined) {
      payload.value = parseDictValue(effectiveType, options.value);
    } else if (payload.type && payload.type !== current.type) {
      // 只改 type 不改 value：先用旧值对新 type 预检，免得打过去才被 400 打回来
      parseDictValue(payload.type, current.value);
    }

    if (!Object.keys(payload).length) {
      throw new Error('没有可更新的字段（--name / --uid / --type / --value 至少给一个）');
    }

    await client.updateSystemVariable(id, payload);
    const detail = await client.getSystemVariableById(id);
    console.log(formatSuccess(`字典项已更新: ${detail?.uid || key}`));
    console.log(formatOutput(detail, resolveOutputFormat(options.output)));
  });
}

/** 删除字典项（平台删除幂等：删不存在的 id 也返回 OK） */
export async function dictDelete(key: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const { id, uid } = await resolveDict(key);
    await client.deleteSystemVariable(id);
    console.log(formatSuccess(`字典项已删除: ${uid}`));
    console.log(formatOutput({ ok: true, id, uid }, resolveOutputFormat(options.output)));
  });
}
