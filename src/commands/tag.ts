import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';

export async function tagsList(tableId: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getTableTags(tableId);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function recordTagsList(tableName: string, recordId: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getRecordTags(tableName, recordId);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}
