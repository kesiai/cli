import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat, deepMerge } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';

/** 把 --roles 的值（id 或名称，逗号分隔或重复 flag）解析为平台要的 roles:[{id}] 结构。
 * 真机验证：core/user 只认 roles:[{id}]，直接传 rolesIds 会被静默忽略（200 但回读为空）——所以 CLI 不暴露 rolesIds，
 * 名称输入也在这里解析成 id（name 是 i18n 字段，靠它做后续匹配不可靠）。 */
async function resolveRolesInput(rawRoles: string[] | undefined): Promise<{ id: string }[] | undefined> {
  if (!rawRoles?.length) return undefined;
  const inputs = rawRoles.flatMap((r) => String(r).split(',')).map((s) => s.trim()).filter(Boolean);
  if (!inputs.length) return undefined;
  const client = getApiClient();
  const roles = await client.getRoles({ limit: 1000 });
  const out: { id: string }[] = [];
  for (const input of inputs) {
    const hit = roles.find((r: any) => r.id === input) || roles.find((r: any) => r.name === input);
    if (!hit) {
      const known = roles.slice(0, 10).map((r: any) => `${r.name}(${r.id})`).join('、');
      throw new Error(
        `角色 "${input}" 不存在（--roles 只接受角色 id 或角色名）。现有角色: ${known}`
      );
    }
    if (!out.some((x) => x.id === hit.id)) out.push({ id: hit.id });
  }
  return out;
}

export async function userGetCurrent(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getCurrentUser();
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function usersList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const params = normalizeQueryOptions(options);
    const result = await client.getUsers(params);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function userGet(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const user = await client.getUserById(id);
    if (!user || !user.id) throw new Error(`用户 '${id}' 不存在`);
    console.log(formatOutput(user, resolveOutputFormat(options.output)));
  });
}

/** 创建用户（最小集 name + password；密码收明文，服务端自哈希——与登录接口的客户端 sha1 不是一套，别混淆） */
export async function userCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    const name = String(options.name || '').trim();
    if (!name) throw new Error('请提供用户名 (-n)');
    if (!options.password) throw new Error('请提供密码 (--password，明文传入，服务端负责哈希存储)');

    const client = getApiClient();

    // 重名预检：平台虽会拒（"用户名已存在"），但预检能直接给出已存在用户的 id，省一轮试错
    const existed = (await client.getUsers({ limit: 1000, filter: { name } })).find((u: any) => u.name === name);
    if (existed) throw new Error(`用户名已存在: ${name}（用户ID: ${existed.id}），如需修改请用 user-update`);

    // flag 构建基础 payload；--json 深合并覆盖（组织字段等长尾走这里）
    let payload: any = { name, password: options.password };
    if (options.nickName) payload.nickName = options.nickName;
    const roles = await resolveRolesInput(options.roles);
    if (roles) payload.roles = roles;
    if (options.json) {
      payload = deepMerge(payload, JSON.parse(options.json));
    }

    const id = await client.createUser(payload);
    console.log(formatSuccess(`用户创建成功`));
    console.log(formatOutput(
      { id, name, rolesIds: roles?.map((r) => r.id) || [] },
      resolveOutputFormat(options.output),
    ));
  });
}

/** 更新用户（改角色/改密/停用）。角色传 roles:[{id}] 由 CLI 组装；密码明文。 */
export async function userUpdate(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const current = await client.getUserById(id);
    if (!current || !current.id) throw new Error(`用户 '${id}' 不存在`);

    const payload: any = {};
    if (options.nickName !== undefined) payload.nickName = options.nickName;
    if (options.password) payload.password = options.password;
    if (options.disabled !== undefined) payload.disabled = options.disabled === true || options.disabled === 'true';
    const roles = await resolveRolesInput(options.roles);
    if (roles) payload.roles = roles; // 整体替换语义（不传则不动）
    if (options.clearRoles) payload.roles = []; // 显式解绑全部

    if (!Object.keys(payload).length) {
      throw new Error('没有可更新的字段（--nick-name / --password / --disabled / --roles / --clear-roles 至少给一个）');
    }

    await client.updateUser(id, payload);
    console.log(formatSuccess(`用户已更新: ${id}`));
    console.log(formatOutput({ id, updated: Object.keys(payload) }, resolveOutputFormat(options.output)));
  });
}

/** 删除用户（⚠️ 破坏性；admin 是平台内置账户，拒删） */
export async function userDelete(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    if (id === 'admin') {
      throw new Error('拒绝删除 admin（平台内置管理员账户，删了会导致无法登录管理端）');
    }
    const client = getApiClient();
    await client.deleteUser(id);
    console.log(formatSuccess(`用户已删除: ${id}`));
    console.log(formatOutput({ ok: true, id }, resolveOutputFormat(options.output)));
  });
}
