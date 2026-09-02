import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';

// permission 是 "<资源>.<动作>" 字符串（如 apps.view）。词表在前端静态配置，平台无校验——
// CLI 只拦格式（至少两段、字符集），拼错的词靠 review 发现，不在这里猜词表。
const PERMISSION_RE = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;

/** 解析 --permission 输入（重复 flag 或逗号分隔） */
function parsePermissions(raw: string[] | undefined): string[] | undefined {
  if (!raw?.length) return undefined;
  const items = raw.flatMap((p) => String(p).split(',')).map((s) => s.trim()).filter(Boolean);
  const bad = items.filter((p) => !PERMISSION_RE.test(p));
  if (bad.length) {
    throw new Error(
      `permission 格式非法: ${bad.join('、')}（应为 "<资源>.<动作>"，如 apps.view / tables.edit）`
    );
  }
  return [...new Set(items)];
}

export async function rolesList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const params = normalizeQueryOptions(options);
    const result = await client.getRoles(params);
    console.log(formatOutput(result, resolveOutputFormat(options.output)));
  });
}

export async function roleGet(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const role = await client.getRoleById(id);
    if (!role || !role.id) throw new Error(`角色 '${id}' 不存在`);
    console.log(formatOutput(role, resolveOutputFormat(options.output)));
  });
}

export async function roleCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    const name = String(options.name || '').trim();
    if (!name) throw new Error('请提供角色名 (-n)');

    const client = getApiClient();
    // 重名预检：角色重名平台不拦（实测可建同名），先查出已有同名的给用户看
    const dup = (await client.getRoles({ limit: 1000 })).filter((r: any) => r.name === name);
    if (dup.length) {
      throw new Error(`已存在同名角色: ${name}（ID: ${dup.map((r: any) => r.id).join('、')}）——角色重名平台不拦，请换名或直接用已有角色`);
    }

    const payload: any = { name };
    if (options.description) payload.description = options.description;
    const permission = parsePermissions(options.permission);
    if (permission) payload.permission = permission;

    const id = await client.createRole(payload);
    console.log(formatSuccess(`角色创建成功`));
    console.log(formatOutput({ id, name }, resolveOutputFormat(options.output)));
  });
}

/** 更新角色（permission 整体替换语义） */
export async function roleUpdate(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const current = await client.getRoleById(id);
    if (!current || !current.id) throw new Error(`角色 '${id}' 不存在`);

    const payload: any = {};
    if (options.name) payload.name = options.name;
    if (options.description !== undefined) payload.description = options.description;
    const permission = parsePermissions(options.permission);
    if (permission) payload.permission = permission;

    if (!Object.keys(payload).length) {
      throw new Error('没有可更新的字段（--name / --description / --permission 至少给一个）');
    }

    await client.updateRole(id, payload);
    console.log(formatSuccess(`角色已更新: ${id}`));
    console.log(formatOutput({ id, updated: Object.keys(payload) }, resolveOutputFormat(options.output)));
  });
}

/** 删除角色（⚠️ 破坏性）。平台行为：被用户引用时也直接删并静默解绑——CLI 提前查出引用并拒绝，解绑后再删。 */
export async function roleDelete(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const role = await client.getRoleById(id);
    if (!role || !role.id) throw new Error(`角色 '${id}' 不存在`);

    // 内置超级管理员：影响面不可控，拒删
    if (role.name === '超级管理员') {
      throw new Error('拒绝删除内置角色「超级管理员」。确需操作请在平台管理端进行');
    }

    // 引用预检：平台删除时不校验引用（静默解绑所有用户），CLI 把影响面提前暴露。
    // rolesIds 是读取时 join 出来的派生字段（后端 PostgreSQL，非 user 表列）：
    // 列表端点投影固定不含它、服务端 filter 也不支持（真机 42703），只能逐个查详情。
    const users = await client.getUsers({ limit: 1000 });
    const bound: any[] = [];
    for (const u of users.slice(0, 500)) {
      const detail = await client.getUserById(u.id);
      if (Array.isArray(detail?.rolesIds) && detail.rolesIds.includes(id)) bound.push(detail);
    }
    if (users.length > 500) {
      console.error(`⚠️ 用户数 ${users.length} 超过 500，引用检查只覆盖前 500 个用户`);
    }
    if (bound.length) {
      throw new Error(
        `角色 '${role.name}' 仍被 ${bound.length} 个用户引用: ${bound.map((u: any) => `${u.name}(${u.id})`).join('、')}。`
        + `先逐个解绑（user-update <用户id> --roles <保留的角色>，全部解绑用 --clear-roles），再删除角色（直接删会静默解绑这些用户）`
      );
    }

    await client.deleteRole(id);
    console.log(formatSuccess(`角色已删除: ${id}`));
    console.log(formatOutput({ ok: true, id }, resolveOutputFormat(options.output)));
  });
}
