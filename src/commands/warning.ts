import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat, deepMerge } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';

// 报警生命周期（真机验证 2026-09-03，192.168.99.103/project kesi）：
//   POST warning/warning 造报警（level 是中文字符串，发数字直接 400 unmarshal 报错）
//   → PATCH status:'已确认'（确认，平台自动补 confirmTime，confirmUser 增富为完整用户文档）
//   → PATCH processed:'已处理'（处理）
//   → GET warning/warning/instantArchive?query={filter} 一键归档（报警移入归档库，主列表消失）
//   → GET warning/warning/archive 查归档库
// ⚠️ 前端没有「恢复」概念（status 只有 未确认/已确认 两态），旧 resolve(status:2) 是发明出来的。
// ⚠️ POST warning/warning/batch-confirm 端点不存在（404），批量确认按 id 逐条 PATCH。

/** 报警级别（中文字符串——平台 WarningSchema.level 是 string，发数字 400） */
const LEVELS = ['低', '中', '高'] as const;

function parseLevel(raw: string | undefined): string {
  if (!raw || !(LEVELS as readonly string[]).includes(raw)) {
    throw new Error(`报警级别必须是 ${LEVELS.join('/')}（中文字符串，平台 schema 不收数字），收到: "${raw}"`);
  }
  return raw;
}

/** 确认/处理共用的操作人（平台会把它增富为完整用户文档，只需 id+name） */
function confirmUser(userId?: string): any {
  const id = userId || 'admin';
  return { id, name: id };
}

// ==================== 报警规则 ====================

export async function warningRulesList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const params = normalizeQueryOptions(options);
    const result = await client.getWarningRules(params);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function warningRulesGet(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getWarningRuleById(id);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

// 独立规则集合的 level 也是中文字符串（RuleTableSchema.level string——发数字 400，真机 2026-09-03 验证；
// 旧文档写 1-4 数字是错的）
function parseRuleLevel(raw: string | undefined): string {
  if (!raw) return '低';
  if (!(LEVELS as readonly string[]).includes(raw)) {
    throw new Error(`规则级别必须是 ${LEVELS.join('/')}（中文字符串），收到: "${raw}"`);
  }
  return raw;
}

export async function warningRulesCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const data = {
      name: options.name,
      level: parseRuleLevel(options.level),
      enable: options.enable !== 'false',
      description: options.description,
    };
    const id = await client.createWarningRule(data);
    console.log(formatSuccess(`创建成功，规则ID: ${id}`));
  });
}

export async function warningRulesUpdate(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();

    // 1️⃣ 先获取原始规则
    const original = await client.getWarningRuleById(id);
    if (!original) throw new Error(`报警规则不存在: ${id}`);

    // 2️⃣ 构建部分更新对象
    const partialData: any = {};
    if (options.name !== undefined) partialData.name = options.name;
    if (options.level !== undefined) partialData.level = parseRuleLevel(options.level);
    if (options.enable !== undefined) partialData.enable = options.enable !== 'false';
    if (options.description !== undefined) partialData.description = options.description;

    // 3️⃣ 合并数据
    const merged = deepMerge(original, partialData);

    // 4️⃣ 调用更新接口
    await client.updateWarningRule(id, merged);
    console.log(formatSuccess('更新成功'));
  });
}

export async function warningRulesDelete(id: string): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.deleteWarningRule(id);
    console.log(formatSuccess('删除成功'));
  });
}

// ==================== 报警 ====================

export async function warningsList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    if (options.archived) {
      // 归档库（一键归档/定时归档移入的报警，主列表不再可见）
      const result = await client.getArchivedWarnings(normalizeQueryOptions(options));
      const format = resolveOutputFormat(options.output);
      console.log(formatOutput(result, format));
      return;
    }
    const params = normalizeQueryOptions(options);
    // 快捷过滤（字段值是中文字符串：status=未确认/已确认，processed=未处理/已处理，level=低/中/高）
    // ⚠️ 表过滤必须用嵌套对象等值 {table:{id}}——'table.id' 点路径平台 400（真机 2026-09-03 验证）
    if (options.level) params.filter = { ...params.filter, level: options.level };
    if (options.status) params.filter = { ...params.filter, status: options.status };
    if (options.processed) params.filter = { ...params.filter, processed: options.processed };
    if (options.tableId) params.filter = { ...params.filter, table: { id: options.tableId } };
    if (options.deviceId) params.filter = { ...params.filter, tableDataId: options.deviceId };
    if (options.keyword) params.filter = { ...params.filter, desc: { $regex: options.keyword } };
    const result = await client.getWarnings(params);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function warningGet(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getWarningById(id);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function warningCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    if (!options.desc) throw new Error('报警描述不能为空（-d）');
    const client = getApiClient();
    const data: any = { desc: options.desc, level: parseLevel(options.level) };
    // FK 用 {id} 对象形态：发平铺 tableId/tableDataId 服务端会静默丢弃（真机验证）
    if (options.table) data.table = { id: options.table };
    if (options.device) data.tableData = { id: options.device };
    const id = await client.createWarning(data);
    console.log(formatSuccess(`报警已创建：${id}（level=${data.level}；确认用 warnings confirm，处理用 warnings handle）`));
    const created = await client.getWarningById(id);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(created, format));
  });
}

/** 归档恢复：把归档库的报警移回主列表 */
export async function warningRestore(id: string): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.restoreArchivedWarning(id);
    console.log(formatSuccess(`已恢复到主列表：${id}`));
  });
}

/** 删除主列表报警（归档库没有 DELETE 端点——先 restore 再删） */
export async function warningDelete(id: string): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.deleteWarning(id);
    console.log(formatSuccess(`报警已删除：${id}`));
  });
}

export async function warningConfirm(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.updateWarning(id, {
      status: '已确认',
      confirmUser: confirmUser(options.userId),
    });
    console.log(formatSuccess('已确认（status=已确认，平台自动记录 confirmTime）'));
  });
}

export async function warningHandle(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.updateWarning(id, {
      processed: '已处理',
      confirmUser: confirmUser(options.userId),
    });
    console.log(formatSuccess('已处理（processed=已处理）'));
  });
}

export async function warningsStats(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getWarningStatistics();
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function warningsLatest(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getLatestWarnings(options.limit ? Number(options.limit) : 10);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function warningsBatchConfirm(ids: string[], options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    // 平台没有批量确认端点（batch-confirm 404），逐条 PATCH；任何一条失败即停，报已完成条数
    let done = 0;
    for (const id of ids) {
      await client.updateWarning(id, { status: '已确认', confirmUser: confirmUser(options.userId) });
      done++;
    }
    console.log(formatSuccess(`已确认 ${done}/${ids.length} 条报警`));
  });
}

export async function warningsArchive(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    // 一键归档：按过滤条件把报警移入归档库（主列表消失）。条件用平台中文枚举。
    // 不给条件 = 归档全部（平台语义）。
    const filter: any = {};
    if (options.status) {
      if (!['已确认', '未确认'].includes(options.status)) throw new Error('--status 只支持 已确认/未确认');
      filter.status = options.status;
    }
    if (options.processed) {
      if (!['已处理', '未处理'].includes(options.processed)) throw new Error('--processed 只支持 已处理/未处理');
      filter.processed = options.processed;
    }
    if (options.table) filter.table = { id: options.table }; // 嵌套对象等值——点路径平台不收
    const msg = await client.instantArchiveWarnings(Object.keys(filter).length > 0 ? filter : undefined);
    console.log(formatSuccess(`归档完成（平台返回：${msg}）——用 warnings list --archived 查归档库，warnings restore <id> 移回`));
  });
}
