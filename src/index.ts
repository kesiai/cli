#!/usr/bin/env node
import { Command } from 'commander';

// 命令模块
import * as auth from './commands/auth.js';
import * as table from './commands/table.js';
import * as record from './commands/record.js';
import * as tag from './commands/tag.js';
import * as data from './commands/data.js';
import * as warning from './commands/warning.js';
import * as stats from './commands/stats.js';
import * as file from './commands/file.js';
import * as control from './commands/control.js';
import * as report from './commands/report.js';
import * as user from './commands/user.js';
import * as driver from './commands/driver.js';
import * as driverSchema from './commands/driver-schema.js';
import * as query from './commands/query.js';
import * as initCmd from './commands/init.js';
import * as ai from './commands/ai/scan.js';
import * as aiDescribe from './commands/ai/describe.js';
import * as aiSample from './commands/ai/sample.js';
import * as aiSeed from './commands/ai/seed.js';

const program = new Command();

program
  .name('kesi')
  .description('KESI IoT 平台命令行工具')
  .version('2.0.0');

// 通用输出格式选项
function addOutput(cmd: Command) {
  return cmd.option('-o, --output <format>', '输出格式: json, table, plain', 'json');
}

// ==================== 认证 ====================

program
  .command('login')
  .description('登录 KESI 平台')
  .requiredOption('--url <url>', '平台地址')
  .requiredOption('--project <id>', '项目ID')
  .option('-u, --username <user>', '用户名')
  .option('-p, --password <pass>', '密码')
  .option('-t, --token <token>', '直接使用 token')
  .action(auth.login);

program.command('logout').description('清除配置').action(auth.logout);
program.command('config').description('查看配置').action(auth.showConfig);

// ==================== 初始化 ====================

program
  .command('init')
  .description('在当前目录创建 .kesirc.json 配置文件')
  .option('--url <url>', '平台地址')
  .option('--project <id>', '项目ID')
  .option('-u, --username <user>', '用户名')
  .option('-p, --password <pass>', '密码')
  .option('--force', '覆盖已有配置')
  .action(initCmd.init);

// ==================== 表管理 ====================

addOutput(program
  .command('tables')
  .alias('tbl')
  .description('查询表列表')
  .option('-f, --filter <json>', '过滤条件')
  .option('-s, --sort <json>', '排序')
  .option('-l, --limit <number>', '数量限制', '50')
  .option('--skip <number>', '跳过数量'))
  .action(table.tablesList);

addOutput(program
  .command('table <id>')
  .description('获取表详情'))
  .action(table.tableGet);

program
  .command('table-create')
  .description('创建表')
  .option('--file <path>', '从 JSON 文件读取')
  .option('--json <json>', 'JSON 数据')
  .action(table.tableCreate);

program
  .command('table-update <id>')
  .description('更新表')
  .option('--file <path>', '从 JSON 文件读取')
  .option('--json <json>', 'JSON 数据')
  .action(table.tableUpdate);

program.command('table-delete <id>').description('删除表').action(table.tableDelete);

// ==================== 记录管理 ====================

addOutput(program
  .command('records <table>')
  .alias('rec')
  .description('查询记录')
  .option('-f, --filter <json>', '过滤条件')
  .option('-s, --sort <json>', '排序')
  .option('-l, --limit <number>', '数量限制', '50')
  .option('--skip <number>', '跳过数量')
  .option('--with-count', '返回总数'))
  .action(record.recordsList);

addOutput(program
  .command('record <table> <id>')
  .description('获取单条记录'))
  .action(record.recordGet);

program
  .command('record-create <table>')
  .description('创建记录')
  .option('--file <path>', '从 JSON 文件读取')
  .option('--json <json>', 'JSON 数据')
  .option('--data <json>', 'JSON 数据（别名）')
  .option('--upsert', '存在则更新')
  .action(record.recordCreate);

program
  .command('record-update <table> <id>')
  .description('更新记录')
  .option('--file <path>', '从 JSON 文件读取')
  .option('--json <json>', 'JSON 数据')
  .option('--data <json>', 'JSON 数据（别名）')
  .action(record.recordUpdate);

program
  .command('record-delete <table> <id>')
  .description('删除记录')
  .option('--attachment', '级联删除附件')
  .action(record.recordDelete);

program
  .command('records-batch-delete <table> <ids...>')
  .description('批量删除记录')
  .action(record.recordsBatchDelete);

// ==================== 属性点 ====================

addOutput(program
  .command('tags <tableId>')
  .description('查询表属性点'))
  .action(tag.tagsList);

addOutput(program
  .command('record-tags <table> <recordId>')
  .description('查询记录属性点'))
  .action(tag.recordTagsList);

// ==================== 时序数据 ====================

addOutput(program
  .command('data-latest')
  .description('查询最新数据')
  .option('--table <id>', '表ID')
  .option('--device <id>', '设备/记录ID')
  .option('--tag <id>', '属性点ID')
  .option('--file <path>', '从文件读取')
  .option('--json <json>', 'JSON 数据（[{tableId,id,tagId}]）'))
  .action(data.dataLatest);

addOutput(program
  .command('data-history')
  .description('查询历史数据')
  .option('--table <id>', '表ID')
  .option('--device <id>', '设备/记录ID')
  .option('--tag <id>', '属性点ID')
  .option('--file <path>', '从文件读取')
  .option('--json <json>', 'JSON 数据（[{tableId,dataId,tagId}]）')
  .requiredOption('--start <timestamp>', '开始时间戳(ms)')
  .requiredOption('--end <timestamp>', '结束时间戳(ms)'))
  .action(data.dataHistory);

// ==================== 统计 ====================

addOutput(program
  .command('stats-online <tableIds...>')
  .description('设备在线统计'))
  .action(stats.statsOnline);

// ==================== 报警 ====================

// 规则
const rules = program.command('rules').description('报警规则管理');
addOutput(rules.command('list').description('查询规则列表')
  .option('-f, --filter <json>', '过滤条件').option('-l, --limit <number>', '数量限制').option('--with-count', '返回总数'))
  .action(warning.warningRulesList);
addOutput(rules.command('get <id>').description('获取规则详情')).action(warning.warningRulesGet);
rules.command('create').description('创建规则')
  .requiredOption('-n, --name <name>', '规则名称')
  .requiredOption('-l, --level <number>', '报警级别 1-4')
  .option('-e, --enable <boolean>', '是否启用', 'true')
  .option('-d, --description <text>', '描述')
  .action(warning.warningRulesCreate);
rules.command('update <id>').description('更新规则')
  .option('-n, --name <name>', '规则名称')
  .option('-l, --level <number>', '报警级别')
  .option('-e, --enable <boolean>', '是否启用')
  .option('-d, --description <text>', '描述')
  .action(warning.warningRulesUpdate);
rules.command('delete <id>').description('删除规则').action(warning.warningRulesDelete);

// 报警
const warnings = program.command('warnings').alias('w').description('报警管理');
addOutput(warnings.command('list').alias('ls').description('查询报警列表')
  .option('-f, --filter <json>', '过滤条件')
  .option('-l, --limit <number>', '数量限制')
  .option('--with-count', '返回总数')
  .option('--level <number>', '级别')
  .option('--status <number>', '状态')
  .option('--rule-id <id>', '规则ID')
  .option('--device-id <id>', '设备ID')
  .option('--keyword <text>', '关键词'))
  .action(warning.warningsList);
addOutput(warnings.command('get <id>').description('报警详情')).action(warning.warningGet);
warnings.command('confirm <id>').description('确认报警').option('-n, --note <text>', '备注').option('--user-id <id>', '用户ID').action(warning.warningConfirm);
warnings.command('resolve <id>').alias('rv').description('标记恢复').option('-n, --note <text>', '备注').action(warning.warningResolve);
addOutput(warnings.command('stats').description('报警统计')).action(warning.warningsStats);
addOutput(warnings.command('latest').description('最新报警').option('-l, --limit <number>', '数量', '10')).action(warning.warningsLatest);
warnings.command('batch-confirm <ids...>').description('批量确认').option('-n, --note <text>', '备注').option('--user-id <id>', '用户ID').action(warning.warningsBatchConfirm);

// ==================== 文件 ====================

program.command('file-upload <filePath>').description('上传文件').option('--name <name>', '文件名').option('--mime <type>', 'MIME类型').action(file.fileUpload);
addOutput(program.command('file-info <id>').description('文件信息')).action(file.fileInfo);
program.command('file-delete <id>').description('删除文件').action(file.fileDelete);

// ==================== 设备控制 ====================

addOutput(program.command('control-send').description('发送设备指令')
  .requiredOption('--table <tableId>', '表ID')
  .requiredOption('--device <id>', '设备ID')
  .requiredOption('--command <name>', '指令名称')
  .option('--params <json>', '指令参数（表单写入时必填）'))
  .action(control.controlSend);
addOutput(program.command('control-batch').description('批量控制').option('--file <path>', '从文件读取').option('--json <json>', 'JSON 数据')).action(control.controlBatch);

// ==================== 报表 ====================

addOutput(program.command('reports').alias('rpt').description('报表列表').option('-f, --filter <json>', '过滤').option('-l, --limit <number>', '数量限制')).action(report.reportsList);
addOutput(program.command('report <id>').description('报表详情')).action(report.reportGet);
addOutput(program.command('report-execute <id>').description('执行报表').option('--file <path>', '参数文件').option('--json <json>', '参数')).action(report.reportExecute);
program.command('report-create').description('创建报表').option('--file <path>', '定义文件').requiredOption('-n, --name <name>', '名称').requiredOption('-t, --type <type>', '类型').option('-d, --description <desc>', '描述').option('-c, --config <json>', '配置').action(report.reportCreate);
program.command('report-update <id>').description('更新报表').option('-n, --name <name>', '名称').option('-d, --description <desc>', '描述').option('-c, --config <json>', '配置').action(report.reportUpdate);
program.command('report-delete <id>').description('删除报表').action(report.reportDelete);

// ==================== 用户 ====================

addOutput(program.command('user').description('当前用户')).action(user.userGetCurrent);
addOutput(program.command('users').description('用户列表').option('-f, --filter <json>', '过滤').option('-l, --limit <number>', '数量限制')).action(user.usersList);

// ==================== 驱动管理 ====================

addOutput(program.command('drivers').description('驱动实例列表')).action(driver.driversList);
addOutput(program.command('driver <id>').description('驱动实例详情')).action(driver.driverGet);

addOutput(program.command('driver-schema <driverType>')
  .description('获取驱动 schema（点位字段、settings 配置等）'))
  .action(driverSchema.driverSchema);

// ==================== 通用资源查询 ====================

addOutput(program.command('query <resource>')
  .description('查询任意资源（如 core/role, warning/rule）')
  .option('-f, --filter <json>', '过滤条件')
  .option('-s, --sort <json>', '排序')
  .option('-l, --limit <number>', '数量限制', '20')
  .option('--skip <number>', '跳过条数', '0')
  .option('--with-count', '返回总数'))
  .action(query.queryList);

addOutput(program.command('query-get <resource> <id>')
  .description('获取资源单条记录'))
  .action(query.queryGet);

// ==================== AI 聚合命令 ====================

addOutput(program
  .command('scan')
  .description('导出全库 schema manifest（AI 专用）')
  .option('--with-sample', '附带样本数据')
  .option('-l, --limit <number>', '每张表样本数量', '3')
  .option('--skip-count', '跳过 count 查询（大数据量时加速）')
  .option('--output-file <path>', '输出到文件'))
  .action(ai.scan);

addOutput(program
  .command('describe <tableId>')
  .description('输出字段级 schema（AI 专用）')
  .option('--with-tags', '包含属性点'))
  .action(aiDescribe.describe);

addOutput(program
  .command('sample <tableId>')
  .description('快速预览数据（AI 专用）')
  .option('-l, --limit <number>', '样本数量', '5'))
  .action(aiSample.sample);

program
  .command('seed')
  .description('批量建表 + 灌种子数据（AI 专用）')
  .option('--file <path>', 'seed JSON 文件')
  .option('--json <json>', 'seed JSON 数据')
  .action(aiSeed.seed);

// ==================== 解析 ====================

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
