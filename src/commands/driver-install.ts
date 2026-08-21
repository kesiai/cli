import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';

const STAGE_LABEL: Record<string, string> = { download: '下载', install: '安装', run: '启动' };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 解析安装进度响应的当前阶段
 * ⚠️ 阶段完成后对应字段会从响应中消失（download 消失 ≠ 错误）；
 *    done 判定是 run 存在且 progress===100；任一存在字段的 err 非空即失败。
 */
function resolveStage(info: any): { stage: string; done: boolean; error: string | null } {
  for (const key of ['download', 'install', 'run'] as const) {
    const seg = info?.[key];
    if (seg?.err) return { stage: key, done: false, error: seg.err };
  }
  if (info?.run?.progress === 100) return { stage: 'run', done: true, error: null };
  // 取"最靠后的活跃阶段"：run → install → download → 等待中
  for (const key of ['run', 'install', 'download'] as const) {
    const seg = info?.[key];
    if (seg && seg.progress < 100) return { stage: key, done: false, error: null };
  }
  return { stage: 'waiting', done: false, error: null };
}

/**
 * 安装驱动：触发安装 + 默认阻塞轮询到完成
 * - 进度输出走 stderr（\r 单行刷新），stdout 保持纯 JSON 结果
 * - 完成后轮询实例 state 并用 serviceList 二次校验
 * - 失败/超时：stdout 仍输出 JSON（status 标明），exitCode=1；超时打印 taskId 供 driver-install-info 续查
 * - 重试语义：重跑本命令复用同一 instanceId，绝不重新创建实例
 */
export async function driverInstall(instanceId: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();

    // 1. 解析实例（拿 driverType / driverVersion）
    const instance = await client.getDriverInstanceById(instanceId);
    if (!instance) throw new Error(`驱动实例 '${instanceId}' 不存在`);

    // 2. 解析安装包 url：--url 优先，其次驱动目录（允许为空——后端按驱动 key 解析安装包，前端同样传空串）
    const catalog = await client.getDriverCatalog();
    const url: string = options.url ?? catalog.find((c: any) => c.name === instance.driverType)?.url ?? '';

    // 3. 触发安装
    const taskId = await client.installDriver(url, instance.driverType, instanceId);
    if (!taskId) throw new Error('触发驱动安装失败：响应中无 taskId');

    if (options.wait === false) {
      // --no-wait：立即返回 taskId
      console.log(formatOutput({ instanceId, taskId, status: 'triggered' }, resolveOutputFormat(options.output)));
      return;
    }

    // 4. 阻塞轮询进度
    const timeoutMs = (Number(options.timeout) || 300) * 1000;
    const intervalMs = (Number(options.interval) || 2) * 1000;
    const startAt = Date.now();
    let stage = '';
    let error: string | null = null;
    let done = false;

    while (Date.now() - startAt < timeoutMs) {
      const info = await client.getInstallInfo(taskId);
      const resolved = resolveStage(info);
      stage = resolved.stage;
      error = resolved.error;
      done = resolved.done;

      const seg = info?.[resolved.stage];
      if (seg?.progress !== undefined) {
        process.stderr.write(`\r${STAGE_LABEL[stage] || stage} ${seg.progress}%   `);
      } else if (stage === 'waiting') {
        process.stderr.write('\r等待驱动启动...   ');
      }
      if (done || error) break;
      await sleep(intervalMs);
    }
    process.stderr.write('\n');

    if (error || !done) {
      const result = {
        instanceId, taskId,
        status: error ? 'failed' : 'timeout',
        stage, err: error || undefined,
        hint: error
          ? `重试请重跑 driver-install -i ${instanceId}（复用同一实例，禁止重新创建）`
          : `安装仍在进行，用 driver-install-info ${taskId} 续查进度`,
      };
      console.log(formatOutput(result, resolveOutputFormat(options.output)));
      process.exitCode = 1;
      return;
    }

    // 5. 完成后验证：轮询实例 state 离开 none（30s，state 在实例列表里），再用 serviceList 二次校验
    let state = 'none';
    for (let i = 0; i < 15; i++) {
      state = await client.getDriverInstanceState(instanceId) || 'none';
      if (state !== 'none') break;
      await sleep(2000);
    }
    let verify: 'ok' | 'service-missing' = 'ok';
    try {
      const services = await client.getDriverServiceList();
      if (!services.some((s: any) => s?.Meta?.serviceId === instanceId)) {
        verify = 'service-missing';
      }
    } catch {
      // serviceList 查询失败不阻断结果，verify 标记为准
      verify = 'service-missing';
    }

    console.log(formatOutput(
      { instanceId, taskId, status: 'completed', stage, state, verify },
      resolveOutputFormat(options.output),
    ));
    if (verify === 'service-missing') process.exitCode = 1;
  });
}

/** 查询安装进度（--no-wait / 超时后续查用），归一化为 {stage, done, error, ...原始段落} */
export async function driverInstallInfo(taskId: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const info = await client.getInstallInfo(taskId);
    const { stage, done, error } = resolveStage(info);
    console.log(formatOutput(
      { stage, done, error, download: info?.download, install: info?.install, run: info?.run },
      resolveOutputFormat(options.output),
    ));
  });
}
