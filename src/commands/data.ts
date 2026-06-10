import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';
import { readFileSync } from 'node:fs';

/**
 * 将用户传入的 pairs 转换为 API 格式
 * 用户输入: [{ deviceId, tagId }] 或 [{ tableId, dataId, tagId }]
 * API 需要: [{ tableId, id, tagId }]
 */
function normalizePairs(pairs: any[], defaultTableId?: string): any[] {
  return pairs.map((p: any) => ({
    tableId: p.tableId || defaultTableId || '',
    id: p.dataId || p.deviceId || p.id || '',
    tagId: p.tagId || '',
  }));
}

export async function dataLatest(options: any): Promise<void> {
  await executeCommand(async () => {
    let pairs: any[];
    if (options.file) {
      pairs = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else if (options.json) {
      pairs = JSON.parse(options.json);
    } else if (options.table && options.device && options.tag) {
      pairs = [{ tableId: options.table, dataId: options.device, tagId: options.tag }];
    } else {
      throw new Error('请提供 --table + --device + --tag, --file 或 --json 参数');
    }
    const client = getApiClient();
    const result = await client.getLatestData(normalizePairs(pairs));
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function dataHistory(options: any): Promise<void> {
  await executeCommand(async () => {
    if (!options.start || !options.end) {
      throw new Error('请提供 --start 和 --end 时间戳（毫秒）');
    }
    let pairs: any[];
    if (options.file) {
      pairs = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else if (options.json) {
      pairs = JSON.parse(options.json);
    } else if (options.table && options.device && options.tag) {
      pairs = [{ tableId: options.table, dataId: options.device, tagId: options.tag }];
    } else {
      throw new Error('请提供 --table + --device + --tag, --file 或 --json 参数');
    }
    const client = getApiClient();
    const result = await client.getHistoryData(
      pairs.map((p: any) => ({
        tableId: p.tableId || '',
        dataId: p.dataId || p.deviceId || p.id || '',
        tagId: p.tagId || '',
      })),
      new Date(Number(options.start)),
      new Date(Number(options.end)),
    );
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}
