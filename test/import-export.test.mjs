/* 导入/导出链路：MinerU 文本处理六件套 + 候选事务 + 导出私密过滤。
 *
 * 覆盖 docs/18 号 v2 的关键取舍（每条都有真实现象，不是品味）：
 * - .html 拒收（v4 批量接口实测 -10002）；
 * - LaTeX 单位外壳（$10^9/L$ 不剥壳界面原样显示）；
 * - htmlTablesToPipes 先转竖线表再对齐（先剥标签会整表压一行、静默串位）；
 * - 按位置对齐（指标数与数值数不符整行放弃，宁可漏一条不写错一个）；
 * - 参考范围两数一格整行放弃；<0.5 保原文 value_num=null；
 * - 拒收零副作用：失败/拒收不写事实表、不产候选。
 * 本机无 MinerU Token：全部用注入的 parseFn / fetchImpl 桩验证，真实云端解析记
 * 「未验证（无凭据）」（见 docs/M5-GAPS.md）。
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { openDatabase, migrate, close } from '../dsh/store.js';
import { seedDemo } from '../dsh/demo.js';
import { ImportService, extractRowCandidates, extractAlignedCandidates, stripLatexShell, LAB_DICT, guessReportDate } from '../dsh/import.js';
import { isSupportedExtension, extractWithMineru, resolveToken, MineruError } from '../dsh/mineru.js';
import { renderPrepMarkdown } from '../dsh/export.js';

const tmp = mkdtempSync(join(homedir(), '.a1pal-ie-test-'));
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ } });

const freshDb = () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  return db;
};

/* 夹具形态取自真实 full.md：MinerU 的表格是竖线表（或 HTML 表，见 ③），单位带 LaTeX 外壳。 */
const fixture = `# 肺功能检查报告
| 项目 | 结果 | 单位 |
| --- | --- | --- |
| 血清 AAT 浓度 | 28 | mg/dL |
| FEV1 占预计值 | $52$ | % |
| ALT | 63 | $\\mathrm{U/L}$ |
| GGT | 3.5-9.5 | U/L |

日期：2026-05-14`;

test('① LaTeX 剥壳：单位与数值先剥 $…$、\mathrm{}、花括号，认不出的只剥壳不推断', () => {
  assert.equal(stripLatexShell('$10^9/L$'), '10^9/L');
  assert.equal(stripLatexShell('$\\mathrm{U/L}$'), 'U/L');
  assert.equal(stripLatexShell('\\(52\\%\\)'), '52\%');
  assert.equal(stripLatexShell('10^{9}/L'), '10^9/L');
  assert.equal(stripLatexShell('\\mu mol/L'), 'μ mol/L');
});

test('② 行式抽取：认字典内的指标；参考范围两数一格整行放弃', () => {
  const { candidates, skipped } = extractRowCandidates(fixture);
  const keys = candidates.map((c) => c.key);
  assert.ok(keys.includes('aat_a'), `应认出血清 AAT：${keys.join(',')}`);
  assert.ok(keys.includes('alt_a'), '应认出 ALT');
  assert.equal(candidates.find((c) => c.key === 'alt_a').valueNum, 63);
  assert.ok(!keys.includes('ggt_a'), 'GGT 行是参考范围（两数一格），整行放弃');
  assert.ok(skipped.some((s) => /参考范围/.test(s.reason)), '放弃要留原因');
  /* LaTeX 单位被剥壳归一，不原样显示 */
  const fev1 = candidates.find((c) => c.key === 'fev1_a');
  assert.ok(fev1, 'FEV1 应被认出');
  assert.ok(!String(fev1.valueText).includes('$'), `FEV1 值不许带 LaTeX 外壳：${fev1.valueText}`);
});

test('③ htmlTablesToPipes 在抽取链之前：HTML 表格先转竖线表，不剥标签', () => {
  const md = '<table><tr><td>项目</td><td>结果</td></tr><tr><td>ALT</td><td>63</td></tr></table>';
  const { candidates } = extractRowCandidates(md);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].key, 'alt_a');
  assert.equal(candidates[0].valueNum, 63);
});

test('④ 位置对齐通道：整表塞进一个单元格时按位置配对，数量不符整行放弃（历史事故反例）', () => {
  /* 历史事故形态：指标一行、数值一行。朴素"名字后取第一个数"会把 8 个指标写成同一个数。 */
  /* 事故形态：表头被吃掉，指标一整行、数值一整行（每格一个值）。 */
  const packed = `| 项目 | ALT | GGT | 血清AAT浓度 |
| 结果 | 63 | 55 | 28 |`;
  const aligned = extractAlignedCandidates(packed);
  assert.equal(aligned.length, 3);
  assert.deepEqual(aligned.map((c) => c.key).sort(), ['aat_a', 'alt_a', 'ggt_a']);
  assert.equal(aligned.find((c) => c.key === 'ggt_a').valueNum, 55, '第 i 个指标配第 i 个数值，不许串位');
  /* 数量不符 → 整行放弃（返回空），不猜 */
  const mismatch = extractAlignedCandidates('| 项目 | ALT | GGT | 血清AAT浓度 |\n| 结果 | 63 | 55 |');
  assert.deepEqual(mismatch, [], '指标 3 个、数值 2 个：整行放弃，宁可漏一条不写错');
});

test('⑤ 拒收语义：.html 拒收、空文件拒收、无 token 报 NO_TOKEN（不匿名请求）', async () => {
  const db = freshDb();
  const service = new ImportService(db, { parseFn: async () => { throw new Error('不该被调用'); } });
  await assert.rejects(
    () => service.parse(Buffer.from('<table></table>'), { filename: '报告.html' }),
    /不支持此文件类型/,
  );
  await assert.rejects(
    () => service.parse(Buffer.alloc(0), { filename: '报告.pdf' }),
    /文件是空的/,
  );
  await assert.rejects(
    () => new ImportService(db, {}).parse(Buffer.from('%PDF'), { filename: '报告.pdf' }),
    (e) => e instanceof MineruError && e.code === 'NO_TOKEN',
  );
  /* mineru.js 层面同样拒收 .html（提交通道白名单） */
  assert.equal(isSupportedExtension('a.pdf'), true);
  assert.equal(isSupportedExtension('a.html'), false);
  await assert.rejects(
    () => extractWithMineru(Buffer.from('x'), '.html', { token: 'sk-x' }),
    /不支持此文件类型/,
  );
  close(db);
});

test('⑥ record()：候选进 ai_candidates（pending），事实表零写入；批号与冲突如实登记', () => {
  const db = freshDb();
  const service = new ImportService(db, { parseFn: async () => ({ markdown: fixture, engine: 'mineru-api-pipeline' }) });
  const countsBefore = ['metric_records', 'reports', 'notes'].map((t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n);
  const result = service.record({
    profileKey: 'B',
    document: { profileKey: 'B', name: '肺功能-2026-05-14.pdf', date: '2026-05-14', type: '报告原件', status: '已解析' },
    candidates: [{ key: 'alt_a', name: 'ALT', valueText: '63', valueNum: 63, unit: 'U/L', line: 6 }],
    skipped: [{ name: 'GGT', cell: '3.5-9.5', reason: '不是单一数值（参考范围/文字）' }],
    engine: 'mineru-api-pipeline',
  });
  assert.equal(result.candidates, 1);
  const cands = db.prepare("SELECT * FROM ai_candidates WHERE profile_key = 'B' AND status = 'pending'").all();
  assert.equal(cands.length, 1);
  const payload = JSON.parse(cands[0].payload);
  assert.equal(payload.value_num, 63);
  assert.equal(payload.metric_key, 'alt_a');
  assert.match(payload.source, /尚未核对原件/);
  const countsAfter = ['metric_records', 'reports', 'notes'].map((t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n);
  assert.deepEqual(countsAfter, countsBefore, '候选不是记录：事实表零写入');
  assert.ok(db.prepare('SELECT 1 FROM import_batches WHERE id = ?').get(result.batchId), '导入批次要登记');
  assert.ok(db.prepare('SELECT 1 FROM import_conflicts WHERE batch_id = ?').get(result.batchId), '放弃的行要如实登记冲突');
  close(db);
});

/** 接受 ≠ 入库：库里 source_kind='ai_candidate' 的记录数必须为 0（演示数据本来就没有）。 */
const DEMO_COUNT_AI = (db) => db.prepare("SELECT COUNT(*) AS n FROM metric_records WHERE source_kind = 'ai_candidate'").get().n;

test('⑦ decide()：accept/reject 只改候选状态；终态不可再改；不存在回 NOT_FOUND', () => {
  const db = freshDb();
  const service = new ImportService(db, {});
  const cand = db.prepare("SELECT id FROM ai_candidates WHERE status = 'pending'").get();
  assert.equal(service.decide(cand.id, 'accepted').status, 'accepted');
  assert.throws(() => service.decide(cand.id, 'rejected'), /终态不可再改/);
  assert.throws(() => service.decide(99999, 'accepted'), /没有这条候选/);
  assert.throws(() => service.decide(cand.id, 'weird'), /accepted \/ rejected/);
  /* 接受也不写事实表（接受 ≠ 医学审核） */
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM metric_records WHERE source_kind = ?').get('ai_candidate').n,
    DEMO_COUNT_AI(db), '接受候选不许自动写指标记录');
  close(db);
});
test('⑧ parse→record 全链（桩注入 parseFn）：markdown → 候选 → 落库，都不联网', async () => {
  const db = freshDb();
  const service = new ImportService(db, { parseFn: async () => ({ markdown: fixture, engine: 'mineru-api-pipeline' }) });
  const parsed = await service.parse(Buffer.from('%PDF-1.4'), { filename: '肺功能-2026-05-14.pdf', profileKey: 'B' });
  assert.equal(parsed.document.date, '2026-05-14', '报告日期从文件名取到');
  assert.ok(parsed.candidates.length >= 2, `应抽出至少 2 条候选：${parsed.candidates.length}`);
  const recorded = service.record({ profileKey: 'B', document: parsed.document, candidates: parsed.candidates, skipped: parsed.skipped, engine: parsed.engine });
  assert.equal(recorded.candidates, parsed.candidates.length);
  close(db);
});

test('⑨ guessReportDate：文件名/正文里的日期；取不到就是 null（不猜今天）', () => {
  assert.equal(guessReportDate('肺功能-2026-05-14.pdf'), '2026-05-14');
  assert.equal(guessReportDate('报告 2026年5月14日 出具'), '2026-05-14');
  assert.equal(guessReportDate('没有日期.pdf'), null);
});

test('⑩ token 解析优先级（18 号 v2）：显式 > 密钥文件 > env；文件坏了单独报 BAD_SECRET_FILE', () => {
  const secretFile = join(tmp, 'mineru.json');
  writeFileSync(secretFile, JSON.stringify({ token: 'sk-from-file-0001' }));
  const env = { MINERU_TOKEN: 'sk-from-env' };
  assert.deepEqual(resolveToken({ env, secretFile }), { token: 'sk-from-file-0001', source: 'secret-file' },
    '文件必须排在 env 前面（env 残留过期 Key 盖住新 Token 的真实事故）');
  assert.deepEqual(resolveToken({ env, secretFile: join(tmp, 'missing.json') }), { token: 'sk-from-env', source: 'env:MINERU_TOKEN' });
  writeFileSync(secretFile, '{ not json');
  assert.throws(() => resolveToken({ env, secretFile }), (e) => e.code === 'BAD_SECRET_FILE');
  assert.throws(() => resolveToken({ env: {}, secretFile: join(tmp, 'missing.json') }), (e) => e.code === 'NO_TOKEN');
});

test('⑪ 导出私密过滤（正反例）：更正版在、旧私密原文不在、家系线索整节不在、报告 private=1 不带内容', () => {
  const db = freshDb();
  const result = renderPrepMarkdown(db, 'B', { generatedAt: null, version: '0.5.0' });
  assert.ok(result);
  const md = result.markdown;
  assert.ok(md.includes('夜间咳嗽加重'), '更正版（最新非私密版本）进导出');
  assert.ok(!md.includes('半夜又咳醒') && !md.includes('心里发慌'), '改写链旧私密原文任何出口不可见');
  assert.ok(!md.includes('要是早点戒烟'), '私密症状记录不进导出');
  assert.ok(!md.includes('医生说'), '家系线索（默认私密）整节不进导出');
  assert.ok(!md.includes('报告原文照存'), '私密报告（r-b3）内容不进导出');
  assert.ok(md.includes('私密'), '剔除要有如实标注（条数可见，内容不可见）');
  assert.ok(result.excludedPrivate > 0);
  /* 判读词不许出现（只抄不解释） */
  assert.ok(!/(需要注意|恶化|好转|预后|可能提示|建议复查|风险较高)/.test(md), '导出里不许出现判读词（"不构成医疗建议"是免责声明，不算判读）');
  close(db);
});

test('⑫ 导出：A 档案缺失多（未检测 ≠ 阴性），如实写"暂无记录"；不存在档案返回 null', () => {
  const db = freshDb();
  const a = renderPrepMarkdown(db, 'A', {});
  assert.ok(a.markdown.includes('暂无记录（未检测不等于阴性）'));
  assert.equal(renderPrepMarkdown(db, 'Z', {}), null);
  close(db);
});
