import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';
import { readFileSync } from 'node:fs';

export async function recordsList(tableName: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const params = normalizeQueryOptions(options);
    const result = await client.getTableRecords(tableName, params);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function recordGet(tableName: string, id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getTableRecordById(tableName, id);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function recordCreate(tableName: string, options: any): Promise<void> {
  await executeCommand(async () => {
    let data: any;
    if (options.file) {
      data = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else if (options.json) {
      data = JSON.parse(options.json);
    } else if (options.data) {
      data = JSON.parse(options.data);
    } else {
      throw new Error('请提供 --file, --json 或 --data 参数');
    }
    const client = getApiClient();
    const id = await client.saveTableRecord(tableName, data, options.upsert);
    console.log(formatSuccess(`创建成功，记录ID: ${id}`));
  });
}

export async function recordUpdate(tableName: string, id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    let data: any;
    if (options.file) {
      data = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else if (options.json) {
      data = JSON.parse(options.json);
    } else if (options.data) {
      data = JSON.parse(options.data);
    } else {
      throw new Error('请提供 --file, --json 或 --data 参数');
    }
    const client = getApiClient();
    await client.updateTableRecord(tableName, id, data);
    console.log(formatSuccess('更新成功'));
  });
}

export async function recordDelete(tableName: string, id: string, options: any = {}): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.deleteTableRecord(tableName, id, options.attachment);
    console.log(formatSuccess('删除成功'));
  });
}

export async function recordsBatchDelete(tableName: string, ids: string[]): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.batchDeleteTableRecords(tableName, ids);
    console.log(formatSuccess(`已删除 ${ids.length} 条记录`));
  });
}
