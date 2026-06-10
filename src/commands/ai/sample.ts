import { getApiClient, executeCommand, resolveOutputFormat } from '../../core/utils.js';
import { formatOutput } from '../../core/formatter.js';

export async function sample(tableId: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const limit = options.limit ? Number(options.limit) : 5;

    const result = await client.getTableRecords(tableId, { limit, withCount: true });

    const output = {
      table: tableId,
      total: result.total,
      sampleCount: result.list.length,
      sample: result.list,
    };

    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(output, format));
  });
}
