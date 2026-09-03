import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';

/**
 * 媒体库（core/mediaLibrary）。真机探查结论（2026-09-03）：
 * - 根列表 GET /core/mediaLibrary（内置资源/我的文件/用户目录等顶层目录）
 * - 按目录列内容 GET /core/mediaLibrary?catalog=<目录path>（path 形如 "我的文件/自定义组件"）
 * - 全量目录树 GET /core/mediaLibrary/all/dir（name/path/child[]）
 * - 建目录 POST /core/mediaLibrary/mkdir {catalog: 父目录path, dirName}
 * - ⚠️ 平台无删除/重命名端点（前端媒体库页也无删除 UI）：目录与文件的创建不可逆，
 *   写操作前要想清楚。上传用 file-upload --catalog 指定目录。
 */

export async function mediaDirs(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const tree = await client.getMediaDirTree();
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(tree, format));
  });
}

export async function mediaLs(path: string | undefined, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const items = path ? await client.listMediaDir(path) : await client.listMediaRoot();
    const format = resolveOutputFormat(options.output);
    console.log(
      formatOutput(
        items.map(({ name, isDir, path, size, modTime }) => ({ name, isDir, path, size, modTime })),
        format,
      ),
    );
  });
}

export async function mediaMkdir(dirName: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const catalog = options.catalog || '';
    if (dirName.includes('/')) throw new Error(`目录名不能含 "/"（要建多级请逐级 media-mkdir；收到 "${dirName}"）`);
    const client = getApiClient();
    await client.createMediaDir(catalog, dirName);
    const full = catalog ? `${catalog}/${dirName}` : dirName;
    console.log(formatSuccess(`目录已创建：${full}`));
    console.log(formatSuccess('注意：平台无目录删除端点，媒体库目录创建后不可移除'));
  });
}
