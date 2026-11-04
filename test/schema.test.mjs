/* M3 断言：schema/0001_initial.sql 内存全建；无判读列；关键契约列在位。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const build = () => {
  const sql = readFileSync(join(ROOT, 'schema', '0001_initial.sql'), 'utf8');
  const db = new DatabaseSync(':memory:');
  db.exec(sql);
  return db;
};

const EXPECTED_TABLES = [
  // 档案 2
  'profiles', 'care_context',
  // 指标 3
  'metric_defs', 'metric_records', 'reports',
  // 通用 7
  'notes', 'med_events', 'episodes', 'visits', 'doc_refs', 'ai_candidates', 'audit_log',
  // 专属 3
  'infusion_series', 'flare_episodes', 'family_lines',
  // 导入 3
  'import_batches', 'import_maps', 'import_conflicts',
  // 分节标题
  'section_titles',
];

const FORBIDDEN_COLUMNS = ['diagnosis', 'risk_level', 'severity', 'stage', 'activity_score', 'progression_score', 'grade', 'response', 'mrd_status'];

test('0001 内存全建：21 张表齐全', () => {
  const db = build();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  for (const t of EXPECTED_TABLES) assert.ok(tables.includes(t), `缺表 ${t}`);
});

test('无判读列：任何表不得有派生判定列（含 INTEGER 隐藏形式）', () => {
  const db = build();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  for (const t of tables) {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name.toLowerCase());
    for (const bad of FORBIDDEN_COLUMNS) {
      assert.ok(!cols.includes(bad), `${t} 含判读列 ${bad}`);
    }
  }
});

test('契约列在位：is_private / in_use / corrected_by / author_role', () => {
  const db = build();
  const colsOf = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  assert.ok(colsOf('notes').includes('author_role'), 'notes 缺 author_role（家属代记必标）');
  assert.ok(colsOf('family_lines').includes('is_private'), 'family_lines 缺 is_private');
  assert.ok(colsOf('metric_records').includes('in_use') && colsOf('metric_records').includes('corrected_by'), 'metric_records 缺版本链列');
  assert.ok(colsOf('metric_defs').includes('comparable_key'), 'metric_defs 缺 comparable_key（方法/单位/机构可比组）');
  assert.ok(colsOf('section_titles').includes('title') && !colsOf('profiles').some((c) => c.endsWith('_title')), '分节标题必须表化，不用 *_title 列');
});

test('私密默认值：family_lines.is_private 缺省 1', () => {
  const db = build();
  const col = db.prepare('PRAGMA table_info(family_lines)').all().find((c) => c.name === 'is_private');
  assert.equal(col.dflt_value, '1', 'family_lines.is_private 缺省应为 1（口径 G）');
});

test('写读冒烟：插一条显式 null 记录并按 rowid 读回', () => {
  const db = build();
  db.prepare("INSERT INTO profiles (profile_key, display_name, demo_label) VALUES ('A', '小陈', '合成示例 · 仅演示')").run();
  db.prepare("INSERT INTO metric_defs (profile_key, key, name, group_key, unit, comparable_key, ord) VALUES ('A', 'fev1', 'FEV1', 'lung', 'L', 'spirometry-m1', 1)").run();
  db.prepare("INSERT INTO metric_records (profile_key, metric_id, value_num, value_text, measured_on) VALUES ('A', 1, 2.31, NULL, '2026-03-04')").run();
  db.prepare("INSERT INTO metric_records (profile_key, metric_id, value_num, value_text, measured_on) VALUES ('A', 1, NULL, '设备未出值', NULL)").run();
  const rows = db.prepare('SELECT id, value_num, measured_on FROM metric_records ORDER BY rowid').all();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].value_num, 2.31);
  assert.equal(rows[1].value_num, null, '缺失值必须显式 null，不是 0/空串');
  assert.equal(rows[1].measured_on, null, '未知日期必须显式 null');
});
