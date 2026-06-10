import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';
import { readFileSync } from 'node:fs';

export async function tablesList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const params = normalizeQueryOptions(options);
    const result = await client.getTables(params);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function tableGet(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getTableById(id);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function tableCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    let data: any;
    if (options.json) {
      data = JSON.parse(options.json);
    } else if (options.file) {
      data = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else {
      throw new Error('请提供 --json 或 --file 参数');
    }
    const client = getApiClient();
    const id = await client.saveTable(data);
    console.log(formatSuccess(`创建成功，表ID: ${id}`));
  });
}

export async function tableUpdate(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    let data: any;
    if (options.json) {
      data = JSON.parse(options.json);
    } else if (options.file) {
      data = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else {
      throw new Error('请提供 --json 或 --file 参数');
    }
    const client = getApiClient();
    await client.updateTable(id, data);
    console.log(formatSuccess('更新成功'));
  });
}

export async function tableDelete(id: string): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.deleteTable(id);
    console.log(formatSuccess('删除成功'));
  });
}
