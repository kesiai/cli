import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat, deepMerge } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';

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

// level 枚举：1提示 / 2一般 / 3重要 / 4严重
function parseRuleLevel(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 4) {
    throw new Error(`报警级别 level 必须是 1-4 整数（1提示/2一般/3重要/4严重），收到: "${raw}"`);
  }
  return n;
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
    const params = normalizeQueryOptions(options);
    // 快捷过滤（使用正确的 API 字段名）
    if (options.level) params.filter = { ...params.filter, level: options.level };
    if (options.status) params.filter = { ...params.filter, status: options.status };
    if (options.processed) params.filter = { ...params.filter, processed: options.processed };
    if (options.tableId) params.filter = { ...params.filter, 'table.id': { $eq: options.tableId } };
    if (options.deviceId) params.filter = { ...params.filter, tableDataId: { $eq: options.deviceId } };
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

export async function warningConfirm(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.updateWarning(id, {
      status: 1,
      confirmNote: options.note,
      confirmUser: options.userId,
    });
    console.log(formatSuccess('已确认'));
  });
}

export async function warningResolve(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.updateWarning(id, {
      status: 2,
      recoverNote: options.note,
    });
    console.log(formatSuccess('已标记恢复'));
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
    await client.batchConfirmWarnings({
      ids,
      note: options.note,
      userId: options.userId,
    });
    console.log(formatSuccess(`已确认 ${ids.length} 条报警`));
  });
}
