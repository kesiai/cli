import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat, deepMerge } from '../core/utils.js';
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
    let partialData: any;
    if (options.file) {
      partialData = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else if (options.json) {
      partialData = JSON.parse(options.json);
    } else if (options.data) {
      partialData = JSON.parse(options.data);
    } else {
      throw new Error('请提供 --file, --json 或 --data 参数');
    }

    const client = getApiClient();

    // 1️⃣ 先获取原始记录
    const original = await client.getTableRecordById(tableName, id);

    // 2️⃣ 合并数据（用户的修改覆盖原始值）
    const merged = deepMerge(original, partialData);

    // 3️⃣ 调用更新接口
    await client.updateTableRecord(tableName, id, merged);
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

/**
 * 修改记录标识（⚠️ 等同删除重建的特殊操作）
 * 后端实测只读 body.id（其余字段忽略、原数据保留），引用方（relate/时序/_settings）不迁移；
 * 普通 record-update 改不了 id（PATCH 的 body.id 不生效）。需同时改字段时先 record-update 再本命令。
 */
export async function recordChangeId(tableName: string, oldId: string, newId: string): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();

    // 1️⃣ 取全量原始记录做基底（未传字段不会被清掉）
    const original = await client.getTableRecordById(tableName, oldId);
    if (!original) {
      throw new Error(`记录不存在: ${tableName}/${oldId}`);
    }

    // 2️⃣ 覆盖 id 后走专用 change 接口
    await client.changeTableRecordId(tableName, oldId, { ...original, id: newId });

    console.log(formatSuccess(`记录标识已修改: ${oldId} → ${newId}`));
    console.log('⚠️  修改标识后本条数据保留，但其它数据对该记录的引用（关联字段、时序数据、_settings 扩展配置等）不会自动迁移，且操作不可恢复。');
  });
}
