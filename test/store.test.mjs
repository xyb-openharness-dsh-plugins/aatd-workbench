/* 数据层：迁移幂等 / 播种幂等 / 与 demo/demo-data.js 的 parity / 口径断言。
 *
 * parity 是这一层最重要的断言：开发版 `/api/aatd/bootstrap` 的 payload 必须与
 * 唯一源 demo/demo-data.js 逐表逐字段一致（前端是照着唯一源的形状写的，
 * 差一个字段就是"某个卡片空白"这种很难定位的 bug）。
 *
 * 已知映射（schema/0001_initial.sql 冻结导致的播种映射，不是数据差异）：
 * - reports.id：schema 是 INTEGER，唯一源是字符串业务键（r-a1…）→ 播种按顺序取自增 id，
 *   metric_records.source_ref 同步改指；断言按「演示键 → 顺序 id」归一后比较。
 * - metric_defs.unit_note：没有冻结列，由读模型从唯一源按 key 回带。
 * - 行序：id 表按 id 序（INTEGER PRIMARY KEY 即 rowid），与唯一源数组序可能差一个
 *   改写链先后（旧版本 id 更大），比较前两边都按 id 排序。
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { openDatabase, migrate, close } from '../dsh/store.js';
import { seedDemo, hasDemoData, loadDemoData } from '../dsh/demo.js';
import { bootstrap, filterPrivateRows, flareSummary, flareCount90, infusionStats } from '../dsh/readmodels.js';

const DEMO = loadDemoData();

const freshDb = () => openDatabase(':memory:');
const seededDb = () => {
  const db = freshDb();
  migrate(db);
  seedDemo(db);
  return db;
};

/** 演示键 → 库内报告 id（reports 按 demo 顺序插入，第 i 个 → i+1）。 */
const reportIdOf = (demoKey) => DEMO.reports.findIndex((r) => r.id === demoKey) + 1;

const tmp = mkdtempSync(join(homedir(), '.a1pal-test-'));
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ } });

test('① migrate 幂等：第二次执行不重跑已应用的迁移', () => {
  const db = freshDb();
  const first = migrate(db);
  assert.deepEqual(first.executed, ['0001_initial.sql'], '首次应执行 0001');
  const second = migrate(db);
  assert.deepEqual(second.executed, [], '第二次不应重跑');
  close(db);
});

test('② seedDemo 幂等：调两次只写一份档案', () => {
  const db = freshDb();
  migrate(db);
  const a = seedDemo(db);
  assert.equal(a.skipped, false);
  assert.equal(a.profiles, 2);
  assert.equal(hasDemoData(db), true);
  const b = seedDemo(db);
  assert.equal(b.skipped, true, '第二次应整批跳过');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n, 2);
  close(db);
});

test('③ parity：bootstrap 的 profiles 与 demo-data.js 逐字段一致（含派生 chips）', () => {
  const db = seededDb();
  const payload = bootstrap(db, { version: '0.5.0', build: 'test', demo: DEMO });
  assert.equal(payload.version, '0.5.0');
  assert.equal(payload.build, 'test');
  for (const key of ['A', 'B']) {
    assert.deepStrictEqual(payload.profiles[key], DEMO.profiles[key], `profiles.${key} 与 demo-data.js 不一致`);
  }
  close(db);
});

test('④ parity：无独立 id 冲突的表逐行一致（care_context / metric_defs / notes / med_events / episodes / visits / doc_refs / ai_candidates / infusion_series / flare_episodes / family_lines / section_titles / metric_records）', () => {
  const db = seededDb();
  const payload = bootstrap(db, { demo: DEMO });
  const byId = (list) => [...list].sort((a, b) => a.id - b.id);
  const cases = [
    ['care_context', null], ['section_titles', null],
    ['metric_defs', null], ['metric_records', null], ['notes', 'id'],
    ['med_events', 'id'], ['episodes', 'id'], ['visits', 'id'],
    ['doc_refs', 'id'], ['ai_candidates', 'id'], ['infusion_series', 'id'],
    ['flare_episodes', 'id'], ['family_lines', 'id'],
  ];
  /* metric_records 的 source_ref：schema 是「报告.id 或录入上下文」，reports.id 在库内是
     顺序整数，唯一源是字符串业务键——比较前按同一映射归一。 */
  const norm = (table, list) => (table === 'metric_records'
    ? list.map((r) => ({ ...r, source_ref: r.source_ref !== null && r.source_ref !== 'r-b4' && DEMO.reports.some((x) => x.id === r.source_ref) ? String(reportIdOf(r.source_ref)) : r.source_ref }))
    : list);
  for (const [table, sortKey] of cases) {
    const got = sortKey ? byId(payload[table]) : payload[table];
    const want = norm(table, sortKey ? byId(DEMO[table]) : DEMO[table]);
    assert.deepStrictEqual(got, want, `表 ${table} 与 demo-data.js 不一致`);
  }
  close(db);
});

test('⑤ parity：reports 的 id 按顺序映射，其余字段逐行一致；metric_records.source_ref 改指到库内 id', () => {
  const db = seededDb();
  const payload = bootstrap(db, { demo: DEMO });
  assert.equal(payload.reports.length, DEMO.reports.length);
  payload.reports.forEach((row, i) => {
    const want = DEMO.reports[i];
    assert.equal(row.id, i + 1, '报告 id 应按唯一源顺序 1..n');
    const { id: _drop, ...rest } = row;
    const { id: _drop2, ...wantRest } = want;
    assert.deepStrictEqual(rest, wantRest, `reports[${i}] 字段不一致`);
  });
  /* source_ref 改指：r-a1 → 1；唯一源里本就不存在的 r-b4 保留原样（如实空指） */
  const ra1 = payload.metric_records.find((r) => r.id === DEMO.metric_records.find((m) => m.source_ref === 'r-a1').id);
  assert.equal(ra1.source_ref, String(reportIdOf('r-a1')), 'TEXT 列里存的是字符串化的报告 id');
  const rb4 = payload.metric_records.find((r) => r.source_ref === 'r-b4');
  assert.ok(rb4, 'r-b4 指向未登记报告：应保留原样而不是被改写/丢弃');
  close(db);
});

test('⑥ metric_defs.unit_note 由读模型从唯一源回带（schema 无此冻结列）', () => {
  const db = seededDb();
  const payload = bootstrap(db, { demo: DEMO });
  const fev1 = payload.metric_defs.find((d) => d.key === 'fev1_a');
  assert.equal(fev1.unit_note, '单位形态【待核】');
  const alt = payload.metric_defs.find((d) => d.key === 'alt_a');
  assert.equal('unit_note' in alt, false, '唯一源没有 unit_note 的定义不许补该键');
  close(db);
});

test('⑦ 口径 7：发作第 N 天 / 距上次发作 / 近 90 天计数实时算（与前端同公式复算一致）', () => {
  const db = seededDb();
  /* 独立复算（直接从唯一源数据算，不走读模型）：档案 B 最新发作开放，A 最近发作已缓解 */
  const dayDiff = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
  const today = new Date().toISOString().slice(0, 10);
  const bOpen = DEMO.episodes.filter((e) => e.profile_key === 'B' && e.in_use === 1 && !e.ended_on)[0];
  assert.deepStrictEqual(flareSummary(db, 'B'),
    { mode: 'open', episodeId: bOpen.id, startedOn: bOpen.started_on, days: dayDiff(bOpen.started_on, today) });
  const aLast = DEMO.episodes.filter((e) => e.profile_key === 'A' && e.in_use === 1).sort((x, y) => x.started_on.localeCompare(y.started_on)).at(-1);
  assert.deepStrictEqual(flareSummary(db, 'A'),
    { mode: 'since', episodeId: aLast.id, startedOn: aLast.started_on, endedOn: aLast.ended_on, days: dayDiff(aLast.ended_on, today) });
  const cut = new Date(Date.parse(today) - 90 * 86400000).toISOString().slice(0, 10);
  const b90 = DEMO.episodes.filter((e) => e.profile_key === 'B' && e.in_use === 1 && e.started_on >= cut).length;
  assert.equal(flareCount90(db, 'B'), b90);
  close(db);
});

test('⑧ 口径 6：输注计次与缺口周不落库、读时算（含缺口周如实计数）', () => {
  const db = seededDb();
  /* 段 1：2024-04-08 → 2024-09-23，缺口 2024-06-17 / 06-24 两周 */
  const s1 = infusionStats(db, 1);
  const weeks = (from, until) => {
    const out = []; let d = from;
    while (d <= until) { out.push(d); d = new Date(Date.parse(d) + 7 * 86400000).toISOString().slice(0, 10); }
    return out;
  };
  assert.equal(s1.count, weeks('2024-04-08', '2024-09-23').length - 2, '段 1 计次 = 周数 − 2 个缺口周');
  assert.deepEqual(s1.gaps, ['2024-06-17', '2024-06-24']);
  const s2 = infusionStats(db, 2);
  assert.equal(s2.gaps.length, 1, '段 2 只有 2025-07-14 一个缺口周');
  /* 计次不落库：库里没有任何"次数"列可查 */
  const cols = db.prepare('PRAGMA table_info(infusion_series)').all().map((c) => c.name);
  assert.ok(!cols.some((c) => /count|times|次/.test(c)), 'infusion_series 不许有计次列');
  close(db);
});

test('⑨ 口径 5：跨 comparable_key 不合并——同名 FEV1 两条定义各带各的记录', () => {
  const db = seededDb();
  const payload = bootstrap(db, { demo: DEMO });
  const fev1 = payload.metric_defs.filter((d) => d.profile_key === 'B' && d.key.startsWith('fev1_b'));
  assert.equal(fev1.length, 2);
  assert.notEqual(fev1[0].comparable_key, fev1[1].comparable_key, '体描仪与便携仪必须是两个可比组');
  const recsOf = (defId) => payload.metric_records.filter((r) => r.metric_id === defId && r.in_use === 1);
  assert.equal(recsOf(fev1[0].id).length, 8);
  assert.equal(recsOf(fev1[1].id).length, 2);
  /* 读模型不输出任何"合并组"或判定字段 */
  for (const d of payload.metric_defs) {
    for (const banned of ['merged', 'risk_level', 'severity', 'diagnosis', 'stage']) {
      assert.equal(banned in d, false, `metric_defs 不许出现判定/合并字段 ${banned}`);
    }
  }
  close(db);
});

test('⑩ 口径 8：filterPrivateRows 过滤改写链——旧私密原文任何出口不可见，只有更正版可出口', () => {
  const db = seededDb();
  const payload = bootstrap(db, { demo: DEMO });
  const visible = filterPrivateRows(payload.notes);
  assert.ok(!visible.some((n) => /半夜又咳醒/.test(n.content)), '旧私密原文不许出现在任何出口');
  assert.ok(visible.some((n) => /夜间咳嗽加重/.test(n.content)), '更正版可出口');
  /* corrected_by 非空（旧原文）即使不私密也被过滤 */
  const corrected = visible.filter((n) => n.corrected_by);
  assert.equal(corrected.length, 0);
  /* bootstrap 本身仍带 is_private 标记行（页面的私密管理要如实写「N 条中私密 M 条」） */
  assert.ok(payload.notes.some((n) => n.is_private === 1));
  close(db);
});

test('⑪ 文件库：真实落盘 + 重开后资料仍在（播种只发生一次）', () => {
  mkdirSync(join(tmp, 'nested'), { recursive: true });
  const file = join(tmp, 'nested', 'xyb-aatd.sqlite');
  const db1 = openDatabase(file);
  migrate(db1);
  seedDemo(db1);
  close(db1);
  const db2 = openDatabase(file);
  migrate(db2);
  assert.equal(hasDemoData(db2), true, '重开时已播种，不该再种一次');
  assert.equal(db2.prepare('SELECT COUNT(*) AS n FROM notes').get().n, DEMO.notes.length);
  close(db2);
});
