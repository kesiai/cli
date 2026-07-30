import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat, deepMerge } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';
import { readFileSync } from 'node:fs';

export async function reportsList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const params = normalizeQueryOptions(options);
    const result = await client.getReports(params);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function reportGet(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getReportById(id);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function reportExecute(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    let params: any;
    if (options.file) {
      params = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else if (options.json) {
      params = JSON.parse(options.json);
    }
    const client = getApiClient();
    const result = await client.executeReport(id, params);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function reportCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    let data: any;
    if (options.file) {
      data = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else {
      data = { name: options.name, type: options.type, description: options.description };
      if (options.config) data.config = JSON.parse(options.config);
    }
    const client = getApiClient();
    const id = await client.createReport(data);
    console.log(formatSuccess(`创建成功，报表ID: ${id}`));
  });
}

export async function reportUpdate(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();

    // 1️⃣ 先获取原始报表
    const original = await client.getReportById(id);

    // 2️⃣ 构建部分更新对象
    const partialData: any = {};
    if (options.name !== undefined) partialData.name = options.name;
    if (options.description !== undefined) partialData.description = options.description;
    if (options.config !== undefined) partialData.config = JSON.parse(options.config);

    // 3️⃣ 合并数据
    const merged = deepMerge(original, partialData);

    // 4️⃣ 调用更新接口
    await client.updateReport(id, merged);
    console.log(formatSuccess('更新成功'));
  });
}

export async function reportDelete(id: string): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.deleteReport(id);
    console.log(formatSuccess('删除成功'));
  });
}
