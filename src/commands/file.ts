import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';
import { readFileSync } from 'node:fs';

export async function fileUpload(filePath: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const buffer = readFileSync(filePath);
    const filename = options.name || filePath.split('/').pop() || 'file';
    const result = await client.uploadFile(buffer, filename, options.mime);
    const format = resolveOutputFormat(options.output);
    console.log(formatSuccess(`上传成功`));
    console.log(formatOutput(result, format));
  });
}

export async function fileInfo(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getFileInfo(id);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function fileDelete(id: string): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.deleteFile(id);
    console.log(formatSuccess('删除成功'));
  });
}
