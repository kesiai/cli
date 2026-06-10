import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';

export async function userGetCurrent(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getCurrentUser();
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function usersList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const params = normalizeQueryOptions(options);
    const result = await client.getUsers(params);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}
