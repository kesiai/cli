import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';
import { readFileSync } from 'node:fs';

/**
 * 数据接口域（ds/*）。真机探查结论（2026-09-03，192.168.99.103/project kesi）：
 * - 分组 ds/group：最小体 {name, type} 即可建（type∈http/db/script/internal，平台校验 160010015）。
 * - 接口 ds/interface：最小体 {key, name, dataGroup:{id}}；服务端按分组 id 校验存在性（160020033）
 *   并自动增富 dataGroup 为整份分组文档；key 全库唯一（重复 160020011）。
 * - ⚠️ PATCH 接口 body 必须带 dataGroup，否则 500「服务器发生错误」（缺 id/key 都不报这个错，
 *   只有缺 dataGroup 报）——CLI 在 update 里自动补齐，吸收这个坑。
 * - ⚠️ GET 不存在的 id 返回 Go 零值对象（不 404）——CLI 检测 id 为空即报不存在。
 * - ⚠️ 删除分组不检查接口绑定：静默成功，接口悬挂（dataGroup.name=undefined）且不可修复
 *   ——CLI 删除前查绑定，有接口先拒删。
 * - 执行 POST ds/p/<key>，body 为参数键值；无 setting 的接口创建能成功但执行必炸
 *   （Get "": unsupported protocol scheme ""）——CLI 创建时强制要求 setting。
 */

/** 分组类型。平台校验枚举（真机 type:"rest" → 160010015 分组类型字段无效） */
const GROUP_TYPES = ['http', 'db', 'script', 'internal'] as const;

/** 参数类型（variableSchema.variableType.schema.type，JSON Schema 类型词表） */
const PARAM_TYPES = ['string', 'number', 'boolean', 'object', 'array'] as const;

/** 解析 --json 参数（setting / 完整参数体） */
function parseJsonArg(raw: string | undefined, flag: string): any {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${flag} 不是合法 JSON：${raw}`);
  }
}

/** 分组 id 或名称解析（id 优先精确匹配；名称重名时报错要求用 id）。
 * 注意：GET 不存在的 id 返回 Go 零值对象（不 404），靠 id 判空区分。 */
async function resolveGroup(idOrName: string): Promise<any> {
  const client = getApiClient();
  const byId = await client.getDataGroupById(idOrName);
  if (byId && byId.id) return byId;
  const groups = await client.listDataGroups();
  const byName = groups.filter((g) => g.name === idOrName);
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) {
    throw new Error(`分组名 "${idOrName}" 有 ${byName.length} 个重名，请用 id 指定：${byName.map((g) => g.id).join(', ')}`);
  }
  throw new Error(`分组 "${idOrName}" 不存在（ds-groups 查看现有分组；注意平台对不存在的 id 返回空对象而非 404）`);
}

/** 接口 id 或 key 解析（key 全库唯一，平台强制） */
async function resolveApi(idOrKey: string): Promise<any> {
  const client = getApiClient();
  const byId = await client.getDataInterfaceById(idOrKey);
  if (byId && byId.id) return byId; // 不存在的 id 返回零值对象（不 404），靠 id 判空
  const apis = await client.listDataInterfaces();
  const byKey = apis.find((a) => a.key === idOrKey);
  if (byKey) return byKey;
  throw new Error(`接口 "${idOrKey}" 不存在（ds-apis 查看现有接口）`);
}

/** 零值检测的分组详情读（接受 id 或名称，同 resolveGroup） */
async function requireGroup(idOrName: string): Promise<any> {
  return resolveGroup(idOrName);
}

/** --param name=type 列表 → variableSchema（形状照平台既有接口：含 defaultValue 包装） */
function buildVariableSchema(params: string[] | undefined): any[] | undefined {
  if (!params || params.length === 0) return undefined;
  return params.map((p) => {
    const eq = p.indexOf('=');
    if (eq < 0) throw new Error(`--param 格式为 名称=类型（如 --param limit=number），收到 "${p}"`);
    const paramKey = p.slice(0, eq);
    const type = p.slice(eq + 1);
    if (!(PARAM_TYPES as readonly string[]).includes(type)) {
      throw new Error(`参数类型 "${type}" 无效（可选：${PARAM_TYPES.join('/')}；如 --param ${paramKey}=number）`);
    }
    if (!paramKey) throw new Error(`--param 的参数名不能为空（收到 "${p}"）`);
    return {
      paramKey,
      name: paramKey,
      desc: '',
      paramType: '',
      variableType: { schema: { type } },
      defaultValue: { value: null },
    };
  });
}

/** 浅层合并（--json 的键覆盖快捷 flags 生成的同名键，其余保留） */
function mergeSetting(base: any, extra: any): any {
  return { ...base, ...extra };
}

/** 快捷 flags → setting，再被 --json 深覆盖（flags 打底、--json 补 params/headers 等复杂键）。
 * 分组类型决定 setting 形状（http/internal 共用 method+url 形态） */
function buildSetting(options: any, _groupType: string): any | undefined {
  const jsonSetting = options.json ? parseJsonArg(options.json, '--json') : undefined;
  const s: any = {};
  if (options.method || options.url) {
    // http / internal 形态：method + url（internal 的 url 是平台相对路径如 /core/role）
    s.method = options.method || 'GET';
    if (!options.url) throw new Error('--method/--url 需要同时提供（http 型接口的 setting 就是 {method, url, ...}；完整结构用 --json）');
    s.url = options.url;
  } else if (options.sql) {
    // db 形态：sendType + sql（+ tableName 可选）
    s.sql = options.sql;
    s.sendType = options.sendType || 'query';
    if (!['query', 'insert', 'update', 'delete'].includes(s.sendType)) {
      throw new Error(`--send-type "${s.sendType}" 无效（可选：query/insert/update/delete）`);
    }
    if (options.table) s.tableName = options.table;
    s.rawMode = false;
    s.exOr = false;
    s.tags = [];
  } else if (options.scriptFile) {
    // script 形态：type 固定 Node + content
    let content: string;
    try {
      content = readFileSync(options.scriptFile, 'utf8');
    } catch {
      throw new Error(`脚本文件读取失败：${options.scriptFile}`);
    }
    return mergeSetting({ type: 'Node', content }, jsonSetting || {});
  } else if (!jsonSetting) {
    return undefined; // 无任何 setting 来源
  }
  return mergeSetting(s, jsonSetting || {});
}

// ==================== 分组 ====================

export async function groupsList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const groups = await client.listDataGroups();
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(groups.map(({ id, name, type, remark, setting }) => ({ id, name, type, remark, setting })), format));
  });
}

export async function groupGet(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const g = await requireGroup(id);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(g, format));
  });
}

export async function groupCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    if (!options.name) throw new Error('分组名称不能为空（-n）');
    if (!options.type) throw new Error('分组类型不能为空（-t；可选 ' + GROUP_TYPES.join('/') + '）');
    if (!(GROUP_TYPES as readonly string[]).includes(options.type)) {
      throw new Error(`分组类型 "${options.type}" 无效（可选：${GROUP_TYPES.join('/')}）`);
    }
    const data: any = { name: options.name, type: options.type };
    if (options.remark !== undefined) data.remark = options.remark;
    if (options.json) data.setting = parseJsonArg(options.json, '--json');
    const client = getApiClient();
    const id = await client.createDataGroup(data);
    console.log(formatSuccess(`分组已创建：${options.name} (${id})`));
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput({ id, ...data }, format));
  });
}

export async function groupUpdate(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const cur = await requireGroup(id);
    const data: any = {};
    if (options.name) data.name = options.name;
    if (options.type) {
      if (!(GROUP_TYPES as readonly string[]).includes(options.type)) {
        throw new Error(`分组类型 "${options.type}" 无效（可选：${GROUP_TYPES.join('/')}）`);
      }
      data.type = options.type;
    }
    if (options.remark !== undefined) data.remark = options.remark;
    if (options.json) data.setting = parseJsonArg(options.json, '--json');
    if (Object.keys(data).length === 0) throw new Error('没有要更新的字段（-n / -t / --remark / --json）');
    const client = getApiClient();
    await client.updateDataGroup(cur.id, data);
    const after = await requireGroup(cur.id);
    const format = resolveOutputFormat(options.output);
    console.log(formatSuccess('分组已更新（按键合并）'));
    console.log(formatOutput(after, format));
  });
}

export async function groupDelete(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const cur = await requireGroup(id);
    const client = getApiClient();
    // 平台删分组不查接口绑定：静默成功后接口悬挂（dataGroup.name=undefined）且无法修复。
    // 这个破坏性后果平台不管，CLI 把关：有绑定先拒删，确要删用 --force 并自行承担。
    const bound = (await client.listDataInterfaces()).filter((a) => a.dataGroup && a.dataGroup.id === cur.id);
    if (bound.length > 0 && !options.force) {
      throw new Error(
        `分组 ${cur.name} (${cur.id}) 下还有 ${bound.length} 个接口，删除会让他们全部悬挂且无法修复：\n` +
          bound.map((a) => `  - ${a.key} (${a.name})`).join('\n') +
          `\n先 ds-api-delete 这些接口，或确认要连带悬挂用 --force`,
      );
    }
    await client.deleteDataGroup(cur.id);
    console.log(formatSuccess(`分组已删除：${cur.name} (${cur.id})` + (bound.length > 0 ? `；⚠️ ${bound.length} 个接口已悬挂` : '')));
  });
}

// ==================== 接口 ====================

export async function apisList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    let apis = await client.listDataInterfaces();
    if (options.group) {
      const g = await resolveGroup(options.group);
      apis = apis.filter((a) => a.dataGroup && a.dataGroup.id === g.id);
    }
    const format = resolveOutputFormat(options.output);
    console.log(
      formatOutput(
        apis.map((a) => ({
          id: a.id,
          key: a.key,
          name: a.name,
          group: a.dataGroup ? `${a.dataGroup.name} (${a.dataGroup.type})` : '⚠️ 悬挂（分组已删）',
          hasSetting: !!a.setting,
          params: (a.variableSchema || []).map((p: any) => `${p.paramKey}:${p.variableType?.schema?.type || '?'}`).join(','),
        })),
        format,
      ),
    );
  });
}

export async function apiGet(idOrKey: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const a = await resolveApi(idOrKey);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(a, format));
  });
}

export async function apiCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    if (!options.key) throw new Error('接口标识 key 不能为空（--key；全库唯一，执行时作为 URL 段）');
    if (!options.name) throw new Error('接口名称不能为空（-n）');
    if (!options.group) throw new Error('所属分组不能为空（--group，接受分组 id 或名称）');
    const group = await resolveGroup(options.group);

    const setting = buildSetting(options, group.type);
    if (!setting) {
      throw new Error(
        '缺少接口配置 setting：没有 setting 的接口能创建成功但一执行就报错（Get "": unsupported protocol scheme ""）。\n' +
          '按分组类型提供：http/internal → --method GET --url /core/role；db → --sql "..." --send-type query；script → --script-file 脚本.js；完整结构用 --json',
      );
    }

    const data: any = {
      key: options.key,
      name: options.name,
      // 服务端会校验分组存在性并自动增富 dataGroup——只需带 id
      dataGroup: { id: group.id },
      setting,
    };
    const schema = buildVariableSchema(options.param);
    if (schema) data.variableSchema = schema;

    const client = getApiClient();
    const id = await client.createDataInterface(data);
    console.log(formatSuccess(`接口已创建：${options.key} (${options.name})，执行：ds-api-exec ${options.key}`));
    const created = await client.getDataInterfaceById(id);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(created, format));
  });
}

export async function apiUpdate(idOrKey: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const cur = await resolveApi(idOrKey);
    const client = getApiClient();

    const data: any = {};
    if (options.name) data.name = options.name;
    if (options.group) {
      const g = await resolveGroup(options.group);
      data.dataGroup = { id: g.id };
    }
    if (options.json) {
      // setting 是单个顶层键：平台按键合并意味着部分 setting 会整体替换丢掉其余键
      // （真机验证：只传 params 时 method/url 被静默丢弃，执行报 unsupported protocol scheme）。
      // 与创建语义对齐：--json 的键合并覆盖到现有 setting 上。
      data.setting = mergeSetting((cur.setting as any) || {}, parseJsonArg(options.json, '--json'));
    }
    const schema = buildVariableSchema(options.param);
    if (schema) data.variableSchema = schema;
    if (Object.keys(data).length === 0) throw new Error('没有要更新的字段（-n / --group / --param / --json）');

    // 平台 PATCH 缺 dataGroup 直接 500（真机验证带 id/key 都救不了），这里无条件补上当前分组
    if (!data.dataGroup) data.dataGroup = { id: cur.dataGroup && cur.dataGroup.id };

    await client.updateDataInterface(cur.id, data);
    const after = await client.getDataInterfaceById(cur.id);
    const format = resolveOutputFormat(options.output);
    console.log(formatSuccess('接口已更新（按键合并，未传字段保持原值）'));
    console.log(formatOutput(after, format));
  });
}

export async function apiDelete(idOrKey: string): Promise<void> {
  await executeCommand(async () => {
    const cur = await resolveApi(idOrKey);
    const client = getApiClient();
    await client.deleteDataInterface(cur.id);
    console.log(formatSuccess(`接口已删除：${cur.key} (${cur.name})`));
  });
}

// ==================== 执行 ====================

export async function apiExec(key: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const params: any = {};
    if (options.param) {
      for (const p of options.param as string[]) {
        const eq = p.indexOf('=');
        if (eq < 0) throw new Error(`--param 格式为 键=值（如 --param limit=2），收到 "${p}"`);
        const k = p.slice(0, eq);
        const raw = p.slice(eq + 1);
        // 值尽量按 JSON 解析（数字/布尔/对象原样传），失败按字符串
        try {
          params[k] = JSON.parse(raw);
        } catch {
          params[k] = raw;
        }
      }
    }
    if (options.json) {
      Object.assign(params, parseJsonArg(options.json, '--json'));
    }
    const result = await client.executeDataInterface(key, params, !!options.debug);
    const format = resolveOutputFormat(options.output);
    console.log(formatSuccess(`执行成功：${key}`));
    console.log(formatOutput(result, format));
  });
}
