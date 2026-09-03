import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';
import { readFileSync } from 'node:fs';

/** 文件上传（实际入媒体库：POST /core/mediaLibrary/upload?action=cover，返回 {url}，无 id）。
 * 真机验证：--catalog 指定目标目录（目录 path 用 media-dirs 查）；不带 catalog 落在
 * 文件服务项目根，媒体库页不可见。平台无删除端点，上传不可逆。
 * 旧 file-info / file-delete 指向不存在的 /api/files/:id（404 死端点），已移除。 */
export async function fileUpload(filePath: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const buffer = readFileSync(filePath);
    const filename = options.name || filePath.split('/').pop() || 'file';
    const result = await client.uploadFile(buffer, filename, options.mime, options.catalog);
    const format = resolveOutputFormat(options.output);
    console.log(formatSuccess(`上传成功${options.catalog ? `（目录：${options.catalog}）` : ''}`));
    console.log(formatOutput(result, format));
  });
}
