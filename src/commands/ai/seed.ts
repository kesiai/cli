import { getApiClient, executeCommand } from '../../core/utils.js';
import { formatSuccess } from '../../core/formatter.js';
import { readFileSync } from 'node:fs';

interface SeedData {
  tables: Array<{
    schema: any;
    records?: any[];
  }>;
}

/**
 * 校验表 schema 的常见配置错误
 */
function validateTableSchema(tableSchema: any, index: number): string[] {
  const warnings: string[] = [];
  const title = tableSchema.title || tableSchema.id || `表 #${index + 1}`;

  if (tableSchema.template === 'device') {
    // 设备表必须有 function 数组且包含 "device"
    if (!tableSchema.function || !Array.isArray(tableSchema.function)) {
      warnings.push(
        `⚠️  [${title}] template="device" 但缺少 function 字段。` +
        `设备表必须设置 "function": ["device", "warning", "computed"]，否则后端会识别为普通表。`
      );
    } else if (!tableSchema.function.includes('device')) {
      warnings.push(
        `⚠️  [${title}] template="device" 但 function 数组中不包含 "device"。` +
        `当前 function: ${JSON.stringify(tableSchema.function)}，应包含 "device"。`
      );
    }

    // 设备表应该有 device 配置块
    if (!tableSchema.device) {
      warnings.push(
        `⚠️  [${title}] template="device" 但缺少 device 配置块。` +
        `设备表需要 device: { tags, settings, driver... } 来定义数据点和驱动。`
      );
    } else {
      // 检查 device.tags 是否存在
      if (!tableSchema.device.tags || !Array.isArray(tableSchema.device.tags) || tableSchema.device.tags.length === 0) {
        warnings.push(
          `⚠️  [${title}] device.tags 为空。设备表通常需要至少一个数据点。`
        );
      }
    }
  }

  // 检查其他模板类型的 function 配置
  const templateFunctionMap: Record<string, string[]> = {
    'common': [],
    'department': ['dataAuth'],
    'settable': ['settable'],
    'tableMapping': ['tableMapping'],
    'tableClasses': ['tableClasses'],
  };

  const expectedFn = templateFunctionMap[tableSchema.template];
  if (expectedFn && tableSchema.function) {
    const missing = expectedFn.filter((f: string) => !tableSchema.function.includes(f));
    if (missing.length > 0) {
      warnings.push(
        `⚠️  [${title}] template="${tableSchema.template}" 但 function 缺少 ${JSON.stringify(missing)}。` +
        `建议设置 "function": ${JSON.stringify(expectedFn)}。`
      );
    }
  }

  return warnings;
}

export async function seed(options: any): Promise<void> {
  await executeCommand(async () => {
    let data: SeedData;
    if (options.file) {
      data = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else if (options.json) {
      data = JSON.parse(options.json);
    } else {
      throw new Error('请提供 --file 或 --json 参数');
    }

    // 预扫描：校验所有表配置
    let hasWarnings = false;
    for (let i = 0; i < data.tables.length; i++) {
      const warnings = validateTableSchema(data.tables[i].schema, i);
      if (warnings.length > 0) {
        hasWarnings = true;
        warnings.forEach(w => console.error(w));
      }
    }
    if (hasWarnings) {
      console.error('\n⚠️  发现配置警告，建议修正后重试。继续执行可能导致表类型不正确。\n');
    }

    const client = getApiClient();
    const results: any[] = [];

    for (let i = 0; i < data.tables.length; i++) {
      const table = data.tables[i];
      const tableSchema = table.schema;

      console.error(`[${i + 1}/${data.tables.length}] 创建表: ${tableSchema.title || tableSchema.id}`);

      // 创建表
      let tableId: string;
      try {
        tableId = await client.saveTable(tableSchema);
        console.error(`  ✓ 表已创建, ID: ${tableId}`);
      } catch (err: any) {
        console.error(`  ✗ 创建表失败: ${err.message}`);
        results.push({ table: tableSchema.id, status: 'error', error: err.message });
        continue;
      }

      // 灌入记录
      const recordResults: any = { table: tableSchema.id, tableId, records: [] };
      if (table.records && table.records.length > 0) {
        for (let j = 0; j < table.records.length; j++) {
          const record = table.records[j];
          try {
            const recordId = await client.saveTableRecord(tableSchema.id, record);
            recordResults.records.push({ index: j, id: recordId, status: 'ok' });
          } catch (err: any) {
            recordResults.records.push({ index: j, status: 'error', error: err.message });
          }
        }
        console.error(`  ✓ 已插入 ${recordResults.records.filter((r: any) => r.status === 'ok').length}/${table.records.length} 条记录`);
      }

      results.push(recordResults);
    }

    const successCount = results.filter(r => r.status !== 'error').length;
    console.log(formatSuccess(`完成: ${successCount}/${data.tables.length} 张表处理成功`));
    console.log(JSON.stringify(results, null, 2));
  });
}
