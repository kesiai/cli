import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';

export async function statsOnline(tableIds: string[], options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getOnlineStats(tableIds);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}
