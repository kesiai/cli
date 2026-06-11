import { getApiClient, executeCommand, resolveOutputFormat } from '../../core/utils.js';
import { formatOutput } from '../../core/formatter.js';
import { writeFileSync } from 'node:fs';

export async function scan(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const withSample = options.withSample ?? false;
    const sampleLimit = options.limit ? Number(options.limit) : 3;

    console.error('正在扫描表列表...');
    const tables = await client.getTables({ limit: 200 });

    const result: any[] = [];
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const tableId = table.id || table.uid;
      if (!tableId) continue;

      console.error(`[${i + 1}/${tables.length}] 扫描表: ${table.title || tableId}`);

      // 获取表详情（含 schema）
      let detail: any;
      try {
        detail = await client.getTableById(tableId);
      } catch {
        detail = table;
      }

      const entry: any = {
        id: tableId,
        title: detail.title || table.title,
        description: detail.description || '',
        template: detail.template || table.template,
        tableMajorType: detail.tableMajorType || table.tableMajorType,
        resource: `core/t/${tableId}`,
        recordCount: detail.recordCount ?? table.recordCount,
        fields: extractFields(detail.schema || table.schema),
      };

      // 获取属性点（仅设备表）
      if (detail.template === 'device' || detail.tableMajorType === 'device') {
        try {
          const rawTags = await client.getTableTags(tableId);
          // 提取 tag 元数据，帮助 kesi-frontend 决定展示方式
          entry.tags = rawTags.map((tag: any) => ({
            id: tag.id,
            name: tag.name,
            unit: tag.unit || '',
            rw: tag.rw || 'r',
            policy: tag.policy || 'save',
          }));
        } catch {
          entry.tags = [];
        }

        // 获取指令列表
        try {
          const rawCommands = await client.getTableCommands(tableId);
          if (rawCommands.length > 0) {
            entry.commands = rawCommands.map((cmd: any) => ({
              id: cmd.id,
              name: cmd.name,
              description: cmd.description || '',
              fields: cmd.fields || [],
            }));
          }
        } catch {
          // 指令查询失败不影响整体扫描
        }
      }

      // 样本数据
      if (withSample) {
        try {
          const records = await client.getTableRecords(tableId, { limit: sampleLimit, withCount: !options.skipCount });
          entry.sample = records.list;
          entry.totalRecords = records.total;
        } catch {
          entry.sample = [];
          entry.totalRecords = 0;
        }
      }

      result.push(entry);
    }

    const output = {
      generatedAt: new Date().toISOString(),
      tableCount: result.length,
      tables: result,
    };

    const format = resolveOutputFormat(options.output);

    if (options.outputFile) {
      writeFileSync(options.outputFile, JSON.stringify(output, null, 2), 'utf-8');
      console.error(`已写入: ${options.outputFile}`);
      if (format === 'json') {
        console.log(JSON.stringify({ tableCount: output.tableCount, outputFile: options.outputFile }));
      }
    } else {
      console.log(formatOutput(output, format));
    }
  });
}

function extractFields(schema: any): any[] {
  if (!schema?.properties) return [];
  return Object.entries(schema.properties).map(([key, field]: [string, any]) => ({
    key,
    title: field.title || key,
    type: field.type,
    controlType: field.controlType || field.fieldType,
    need: field.need ?? false,
    unique: field.unique ?? false,
    enum: field.enum || undefined,
    enumNames: field.enumNames || undefined,
  }));
}
