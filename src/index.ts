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
import * as role from './commands/role.js';
import * as dict from './commands/dict.js';
import * as setting from './commands/setting.js';
import * as ds from './commands/ds.js';
import * as media from './commands/media.js';
import * as driver from './commands/driver.js';
import * as driverSchema from './commands/driver-schema.js';
import * as driverCatalog from './commands/driver-catalog.js';
import * as driverInstall from './commands/driver-install.js';
import * as driverUpdateConfig from './commands/driver-update-config.js';
import * as query from './commands/query.js';
import { setCliCredentials } from './core/config.js';
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
// 凭据经 params/env 提供(--base-url/--project-id/--token 或 KESI_BASE_URL/KESI_PROJECT/KESI_TOKEN),
// 由入口 extractCredentials 从 argv 抽出后注入 setCliCredentials。无 login/logout/init。

program.command('config').description('查看解析后的配置').action(auth.showConfig);

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

program
  .command('table-change-id <oldId> <newId>')
  .description('修改表标识（⚠️ 删除重建语义，引用不自动迁移，不可恢复）')
  .action(table.tableChangeId);

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
  .option('--data <key=value>', 'key=value 数据（可重复传多个；也接受整段 JSON）', (v: string, p: string[]) => p.concat(v), [] as string[])
  .option('--upsert', '存在则更新')
  .action(record.recordCreate);

program
  .command('record-update <table> <id>')
  .description('更新记录')
  .option('--file <path>', '从 JSON 文件读取')
  .option('--json <json>', 'JSON 数据')
  .option('--data <key=value>', 'key=value 数据（可重复传多个；也接受整段 JSON）', (v: string, p: string[]) => p.concat(v), [] as string[])
  .action(record.recordUpdate);

program
  .command('record-change-id <table> <oldId> <newId>')
  .description('修改记录标识（⚠️ 删除重建语义，引用不自动迁移，不可恢复）')
  .action(record.recordChangeId);

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
  .option('--level <text>', '级别：低/中/高')
  .option('--status <text>', '确认状态：未确认/已确认')
  .option('--processed <text>', '处理状态：未处理/已处理')
  .option('--table-id <id>', '按数据表ID过滤')
  .option('--device-id <id>', '按设备ID过滤')
  .option('--keyword <text>', '关键词搜索（匹配报警描述）')
  .option('--archived', '查归档库（一键归档/定时归档移入的报警）'))
  .action(warning.warningsList);
addOutput(warnings.command('get <id>').description('报警详情')).action(warning.warningGet);
addOutput(warnings.command('create').description('手动创建报警')
  .option('-d, --desc <text>', '报警描述（必填）')
  .option('-l, --level <text>', '级别：低/中/高（必填，中文字符串）')
  .option('--table <id>', '关联表ID')
  .option('--device <id>', '关联设备/记录ID'))
  .action(warning.warningCreate);
warnings.command('confirm <id>').description('确认报警（status=已确认）').option('--user-id <id>', '操作人ID（默认 admin）').action(warning.warningConfirm);
warnings.command('handle <id>').description('处理报警（processed=已处理）').option('--user-id <id>', '操作人ID（默认 admin）').action(warning.warningHandle);
addOutput(warnings.command('stats').description('报警统计（按表计数；真路径 /stats）')).action(warning.warningsStats);
addOutput(warnings.command('archive').description('一键归档（按条件移入归档库，主列表消失；无条件=归档全部）')
  .option('--status <text>', '只归档该确认状态：已确认/未确认')
  .option('--processed <text>', '只归档该处理状态：已处理/未处理')
  .option('--table <id>', '只归档该表（id 或名称）'))
  .action(warning.warningsArchive);
warnings.command('restore <id>').description('归档恢复（把归档库的报警移回主列表）').action(warning.warningRestore);
warnings.command('delete <id>').description('删除报警（仅主列表；归档库的先 restore 再删）').action(warning.warningDelete);
addOutput(warnings.command('latest').description('最新报警').option('-l, --limit <number>', '数量', '10')).action(warning.warningsLatest);
warnings.command('batch-confirm <ids...>').description('批量确认（平台无批量端点，逐条执行）').option('--user-id <id>', '操作人ID（默认 admin）').action(warning.warningsBatchConfirm);

// ==================== 文件 / 媒体库 ====================

program.command('file-upload <filePath>')
  .description('上传文件到媒体库（返回 {url}；平台无删除端点，上传不可逆）')
  .option('--name <name>', '文件名')
  .option('--mime <type>', 'MIME类型')
  .option('--catalog <path>', '目标目录 path（media-dirs 查；不传落在文件服务根，媒体库页不可见）')
  .action(file.fileUpload);

addOutput(program.command('media-dirs').description('媒体库全量目录树')).action(media.mediaDirs);
addOutput(program.command('media-ls [path]').description('媒体库目录内容（path 为目录 path；不传=根列表）')).action(media.mediaLs);
program.command('media-mkdir <dirName>').description('建目录（⚠️ 平台无目录删除端点，创建不可逆）').option('--catalog <path>', '父目录 path（不传=根）').action(media.mediaMkdir);

// ==================== 数据接口（ds） ====================

addOutput(program.command('ds-groups').description('数据源分组列表')).action(ds.groupsList);
addOutput(program.command('ds-group <id>').description('分组详情')).action(ds.groupGet);

program.command('ds-group-create')
  .description('创建数据源分组')
  .requiredOption('-n, --name <name>', '分组名称')
  .requiredOption('-t, --type <type>', '类型：http / db / script / internal')
  .option('--remark <remark>', '备注')
  .option('--json <json>', 'setting 完整 JSON（http: baseUrl/headers；db: driverType/ip/port/dbName/username/password；script: inputScript/outputScript）')
  .action(ds.groupCreate);

program.command('ds-group-update <id>')
  .description('更新分组（按键合并）')
  .option('-n, --name <name>', '名称')
  .option('-t, --type <type>', '类型')
  .option('--remark <remark>', '备注')
  .option('--json <json>', 'setting JSON（整体替换）')
  .action(ds.groupUpdate);

program.command('ds-group-delete <id>')
  .description('删除分组（有接口绑定时拒删，先删接口；--force 强删留悬挂）')
  .option('--force', '跳过绑定检查强删（接口会悬挂且无法修复）')
  .action(ds.groupDelete);

addOutput(program.command('ds-apis').description('数据接口列表').option('-g, --group <id|name>', '按分组过滤')).action(ds.apisList);
addOutput(program.command('ds-api <idOrKey>').description('接口详情（接受 id 或 key）')).action(ds.apiGet);

program.command('ds-api-create')
  .description('创建数据接口（必须提供 setting，否则能建但执行必失败）')
  .requiredOption('--group <id|name>', '所属分组（ds-groups 查）')
  .requiredOption('--key <key>', '接口标识（全库唯一，执行时的 URL 段）')
  .requiredOption('-n, --name <name>', '接口名称')
  .option('--method <method>', 'http/internal 型：请求方法（默认 GET）')
  .option('--url <url>', 'http 型完整路径或 internal 型平台相对路径（如 /core/role）')
  .option('--sql <sql>', 'db 型：SQL 语句')
  .option('--send-type <type>', 'db 型：query/insert/update/delete（默认 query）')
  .option('--table <table>', 'db 型：表名')
  .option('--script-file <path>', 'script 型：Node 脚本文件路径')
  .option('-p, --param <name=type...>', '接口参数（可多个，type: string/number/boolean/object/array，如 --param limit=number）')
  .option('--json <json>', 'setting 完整 JSON（覆盖快捷 flags）')
  .action(ds.apiCreate);

program.command('ds-api-update <idOrKey>')
  .description('更新接口（按键合并；CLI 自动补 dataGroup——平台 PATCH 缺它直接 500）')
  .option('-n, --name <name>', '名称')
  .option('--group <id|name>', '迁移到其他分组')
  .option('-p, --param <name=type...>', '参数定义（整体替换 variableSchema）')
  .option('--json <json>', 'setting 完整 JSON（整体替换）')
  .action(ds.apiUpdate);

program.command('ds-api-delete <idOrKey>').description('删除接口').action(ds.apiDelete);

addOutput(program.command('ds-api-exec <key>')
  .description('执行数据接口，返回结果')
  .option('-p, --param <k=v...>', '参数值（可多个，值按 JSON 解析后回退字符串，如 --param limit=2)')
  .option('--json <json>', '参数体 JSON（与 --param 合并）')
  .option('--debug', '服务端 debug 模式执行'))
  .action(ds.apiExec);

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

// ==================== 用户 / 角色 ====================

addOutput(program.command('user [id]').description('用户详情（无 id = 当前用户）')).action((id: string | undefined, options: any) =>
  id !== undefined ? user.userGet(id, options) : user.userGetCurrent(options));

addOutput(program.command('users').description('用户列表').option('-f, --filter <json>', '过滤').option('-l, --limit <number>', '数量限制')).action(user.usersList);

program.command('user-create')
  .description('创建用户（密码明文传入，服务端哈希存储）')
  .option('-n, --name <name>', '用户名（唯一，重名平台拒建）')
  .option('-p, --password <pwd>', '密码（明文）')
  .option('--nick-name <name>', '昵称')
  .option('--roles <ids...>', '角色（id 或角色名，可多个；CLI 组装为平台要求的 roles:[{id}]）')
  .option('--json <json>', '完整 payload 覆盖（组织字段等长尾，深合并）')
  .action(user.userCreate);

program.command('user-update <id>')
  .description('更新用户（未传字段保持原值；--roles 整体替换）')
  .option('--nick-name <name>', '昵称')
  .option('-p, --password <pwd>', '密码（明文，服务端重新哈希）')
  .option('--disabled <bool>', '停用 (true/false)')
  .option('--roles <ids...>', '角色（id 或角色名，可多个，整体替换）')
  .option('--clear-roles', '解绑全部角色')
  .action(user.userUpdate);

program.command('user-delete <id>').description('删除用户（⚠️ 破坏性；admin 拒删）').action(user.userDelete);

addOutput(program.command('roles').description('角色列表').option('-f, --filter <json>', '过滤').option('-l, --limit <number>', '数量限制')).action(role.rolesList);
addOutput(program.command('role <id>').description('角色详情')).action(role.roleGet);

program.command('role-create')
  .description('创建角色')
  .option('-n, --name <name>', '角色名')
  .option('-d, --description <text>', '描述')
  .option('--permission <perms...>', '权限（"<资源>.<动作>"，如 apps.view，可多个）')
  .action(role.roleCreate);

program.command('role-update <id>')
  .description('更新角色（未传字段保持原值；--permission 整体替换）')
  .option('-n, --name <name>', '角色名')
  .option('-d, --description <text>', '描述')
  .option('--permission <perms...>', '权限（"<资源>.<动作>"，可多个，整体替换）')
  .action(role.roleUpdate);

program.command('role-delete <id>').description('删除角色（⚠️ 破坏性；被用户引用时拒删，先解绑）').action(role.roleDelete);

// ==================== 数据字典 ====================

addOutput(program.command('dicts').description('数据字典列表（列表不含 value，看值用 dict <id|uid>）')).action(dict.dictsList);
addOutput(program.command('dict <idOrUid>').description('字典项详情（含 value；接受 id 或编号 uid）')).action(dict.dictGet);

program.command('dict-create')
  .description('创建字典项（name/uid/type/value 全必填；uid 全库唯一）')
  .option('-n, --name <name>', '名称')
  .option('--uid <uid>', '编号（全库唯一）')
  .option('--type <type>', '类型（number/string/boolean/date/object/array）')
  .option('--value <value>', '值（形态由 type 决定；object/array 传 JSON 字符串）')
  .action(dict.dictCreate);

program.command('dict-update <idOrUid>')
  .description('更新字典项（未传字段保持原值）')
  .option('-n, --name <name>', '名称')
  .option('--uid <uid>', '编号（改成已占用的编号会被平台 400 拒绝）')
  .option('--type <type>', '类型（number/string/boolean/date/object/array）')
  .option('--value <value>', '值（按生效 type 校验）')
  .action(dict.dictUpdate);

program.command('dict-delete <idOrUid>').description('删除字典项（⚠️ 破坏性）').action(dict.dictDelete);

// ==================== 系统设置 ====================

addOutput(program.command('setting').description('系统设置全量读（全局单例配置）')).action(setting.settingShow);
addOutput(program.command('setting-fields').description('系统设置字段类型速查')).action(setting.settingFields);

program.command('setting-update')
  .description('局部更新系统设置（⚠️ 即时影响全平台，测完必须还原；按键合并）')
  .option('--json <json>', '要改的键值，如 \'{"language":"zh-CN"}\'（CLI 自动补 id）')
  .action(setting.settingUpdate);

// ==================== 驱动管理 ====================

addOutput(program.command('drivers').description('驱动实例列表')).action(driver.driversList);
addOutput(program.command('driver <id>').description('驱动实例详情')).action(driver.driverGet);

addOutput(program.command('driver-catalog')
  .description('驱动目录（可安装驱动列表，含已安装注记）')
  .option('--search <keyword>', '关键词过滤（匹配 key/描述/分类）'))
  .action(driverCatalog.driverCatalog);

program.command('driver-create')
  .description('创建驱动实例（-t 填驱动 key，即 driver-catalog 的 name 字段）')
  .requiredOption('-n, --name <name>', '实例名称（唯一）')
  .option('-t, --type <driverKey>', '驱动 key（--run-mode node 可省略，自动继承 --cluster 集群的驱动类型）')
  .option('--version <version>', '驱动版本（缺省从目录解析）')
  .option('--run-mode <mode>', '运行模式: one | cluster | node', 'one')
  .option('--cluster <clusterInstanceId>', '集群实例 id（仅 --run-mode node 时必填：继承其 driverType，并把其 groupId 存上）')
  .option('--distributed <mode>', '分配方式: all | average | lazy', 'all')
  .option('--file <path>', '完整 payload JSON 文件（与 flags 深合并）')
  .option('--json <json>', '完整 payload JSON（与 flags 深合并）')
  .action(driver.driverCreate);

addOutput(program.command('driver-install <instanceId>')
  .description('安装驱动（默认阻塞等待到完成，进度走 stderr）')
  .option('--url <url>', '安装包地址（缺省从驱动目录解析）')
  .option('--no-wait', '只触发安装，立即返回 taskId')
  .option('--timeout <seconds>', '等待超时（秒）', '300')
  .option('--interval <seconds>', '轮询间隔（秒）', '2'))
  .action(driverInstall.driverInstall);

addOutput(program.command('driver-install-info <taskId>')
  .description('查询安装进度（--no-wait / 超时后续查用）'))
  .action(driverInstall.driverInstallInfo);

program.command('driver-update-config <instanceId>')
  .description('更新驱动配置（device 块: settings/tags/commands/events，深合并；driver 块无 tags 定义的驱动拒写 tags）')
  .option('--file <path>', '配置 JSON 文件')
  .option('--json <json>', '配置 JSON 数据')
  .action(driverUpdateConfig.driverUpdateConfig);

addOutput(program.command('driver-restart <instanceId>')
  .description('重启驱动（配置变更后生效），默认轮询 state 到 running')
  .option('--no-wait', '不等待 running'))
  .action(driver.driverRestart);

program.command('driver-delete <instanceId>')
  .description('删除驱动实例（会使其绑定的设备表失效）')
  .action(driver.driverDelete);

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

// 凭据 flag 是全局的,子命令不认 program 级 option;这里从 argv 抽出注入,再从 argv 移除,
// 让 commander 正常解析剩余参数(凭据 flag 可出现在命令任意位置)。
function extractCredentials(argv: string[]): string[] {
  const rest: string[] = [];
  const c: { baseUrl?: string; projectId?: string; token?: string; username?: string } = {};
  let noMoreOpts = false;
  const isCred = (k: string) => k === 'base-url' || k === 'project-id' || k === 'token' || k === 'username';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { noMoreOpts = true; rest.push(a); continue; }
    if (!noMoreOpts && a.startsWith('--')) {
      const eq = a.indexOf('=');
      const key = eq > -1 ? a.slice(2, eq) : a.slice(2);
      if (isCred(key)) {
        const v = eq > -1 ? a.slice(eq + 1) : argv[++i];
        if (key === 'base-url') c.baseUrl = v;
        else if (key === 'project-id') c.projectId = v;
        else if (key === 'token') c.token = v;
        else c.username = v;
        continue;
      }
    }
    rest.push(a);
  }
  setCliCredentials(c);
  return rest;
}

const userArgs = extractCredentials(process.argv.slice(2));
program.parse(userArgs, { from: 'user' });

if (!userArgs.length) {
  program.outputHelp();
}
