import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat } from '../core/utils.js';
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

export async function warningRulesCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const data = {
      name: options.name,
      level: Number(options.level),
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
    const data: any = {};
    if (options.name !== undefined) data.name = options.name;
    if (options.level !== undefined) data.level = Number(options.level);
    if (options.enable !== undefined) data.enable = options.enable !== 'false';
    if (options.description !== undefined) data.description = options.description;
    await client.updateWarningRule(id, data);
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
    // 快捷过滤
    if (options.level) params.filter = { ...params.filter, level: Number(options.level) };
    if (options.status) params.filter = { ...params.filter, status: Number(options.status) };
    if (options.ruleId) params.filter = { ...params.filter, ruleId: options.ruleId };
    if (options.deviceId) params.filter = { ...params.filter, deviceId: options.deviceId };
    if (options.tagId) params.filter = { ...params.filter, tagId: options.tagId };
    if (options.keyword) params.filter = { ...params.filter, title: { $regex: options.keyword } };
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
