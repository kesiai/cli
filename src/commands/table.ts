import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat, deepMerge } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';
import { readFileSync } from 'node:fs';
import { validateTableFields, formatValidationResult } from '../core/field-validator.js';
import { validateTableGuard, tableIdError, buildDriverContext } from '../core/table-guard.js';

function assertGuard(result: { errors: string[] }): void {
  if (result.errors.length > 0) {
    throw new Error(`表结构校验失败（${result.errors.length} 项，已拒绝写入）：\n  - ${result.errors.join('\n  - ')}`);
  }
}

export async function tablesList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const params = normalizeQueryOptions(options);
    const result = await client.getTables(params);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function tableGet(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getTableById(id);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function tableCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    let data: any;
    if (options.json) {
      data = JSON.parse(options.json);
    } else if (options.file) {
      data = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else {
      throw new Error('请提供 --json 或 --file 参数');
    }

    // 验证字段配置
    const validationResult = validateTableFields(data);
    const format = (options.output === 'json') ? 'json' : 'text';

    // 显示验证结果
    console.log(formatValidationResult(validationResult, format as 'text' | 'json'));

    // 如果有错误，终止创建
    if (!validationResult.valid) {
      throw new Error('字段验证失败，请修复后重试');
    }

    const client = getApiClient();

    // 不变量门禁（写前拦截）：template↔function 配对、模板预设字段、formSchema 行满、device 块驱动关联/tags
    assertGuard(validateTableGuard({
      payload: data,
      merged: data,
      isUpdate: false,
      ...(await buildDriverContext(client, data)),
    }));

    // 验证通过，继续创建
    const id = await client.saveTable(data);
    console.log(formatSuccess(`创建成功，表ID: ${id}`));
  });
}

export async function tableUpdate(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    let partialData: any;
    if (options.json) {
      partialData = JSON.parse(options.json);
    } else if (options.file) {
      partialData = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else {
      throw new Error('请提供 --json 或 --file 参数');
    }

    const client = getApiClient();

    // 1️⃣ 先获取原始表结构
    const original = await client.getTableById(id);

    // 2️⃣ 深度合并（注意 properties 等嵌套字段）
    const merged = deepMerge(original, partialData);

    // 3️⃣ 验证合并后的完整数据
    const validationResult = validateTableFields(merged);
    const format = (options.output === 'json') ? 'json' : 'text';

    // 显示验证结果
    console.log(formatValidationResult(validationResult, format as 'text' | 'json'));

    // 如果有错误，终止更新
    if (!validationResult.valid) {
      throw new Error('字段验证失败，请修复后重试');
    }

    // 3️⃣ 不变量门禁：只校验本次提交触及的部分（template/function、schema.properties、formSchema、device 块）
    assertGuard(validateTableGuard({
      payload: partialData,
      merged,
      isUpdate: true,
      ...(await buildDriverContext(client, merged)),
    }));

    // 4️⃣ 调用更新接口
    await client.updateTable(id, merged);
    console.log(formatSuccess('更新成功'));
  });
}

export async function tableDelete(id: string): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.deleteTable(id);
    console.log(formatSuccess('删除成功'));
  });
}

/**
 * 修改表标识（⚠️ 等同删除重建的特殊操作）
 * 后端实测只读 body.id（其余字段忽略、表配置保留），但表下记录不迁移（将无法访问）；
 * 普通 table-update 改不了 id（PATCH 的 body.id 不生效）。需同时改字段时先 table-update 再本命令。
 */
export async function tableChangeId(oldId: string, newId: string): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();

    // 1️⃣ 取全量原始表配置做基底（未传字段不会被清掉）
    const original = await client.getTableById(oldId);
    if (!original) {
      throw new Error(`表不存在: ${oldId}`);
    }
    const idErr = tableIdError(newId);
    if (idErr) throw new Error(idErr);

    // 2️⃣ 覆盖 id，先按 table-update 同样口径校验合并后的完整数据
    const merged = { ...original, id: newId };
    const validationResult = validateTableFields(merged);
    const format = 'text';
    console.log(formatValidationResult(validationResult, format));

    if (!validationResult.valid) {
      throw new Error('字段验证失败，请修复后重试');
    }

    // 3️⃣ 走专用 change 接口
    await client.changeTableId(oldId, merged);

    console.log(formatSuccess(`表标识已修改: ${oldId} → ${newId}`));
    console.log('⚠️  修改标识后表配置保留，但表下所有记录不会迁移（将无法访问）；其它数据对该表的引用（relate 关联、settable 配置、报表/大屏引用等）也不会自动迁移，且操作不可恢复。');
  });
}
