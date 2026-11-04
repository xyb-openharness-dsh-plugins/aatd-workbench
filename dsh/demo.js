/* 演示数据播种（AATD）。
 *
 * 唯一数据源是 `demo/demo-data.js`（原型 index.html 用 <script> 加载它、测试用它做
 * parity 断言，本文件在 Node 侧把同一份纯数据写进**用户资料目录里那个库**，
 * 不新增、不改写任何数值——演示数据一旦在这里多出一条，原型与开发版就会各说一套。
 *
 * 读法：demo/demo-data.js 是浏览器 IIFE（给 window.DEMO_DATA 赋值），本模块用
 * `new Function('window', src)` 在隔离作用域里跑一遍拿结果，零依赖、不改原文件。
 *
 * 幂等：库里已经有 profiles 就整批跳过（开发版启动会跑很多次，不能每次复制一份档案）。
 * 事务：整批一个事务，中途失败整体回滚，不留"半个档案"。
 *
 * 字段口径：
 * 1. 所有 INSERT 写显式列名 + 显式问号数（schema/0001_initial.sql 冻结，列数不匹配直接报错）；
 * 2. ai_candidates.payload 与 profiles.meta 之外的 JSON 字段写 JSON.stringify；
 * 3. 缺失一律显式 null（契约 2），is_private / in_use 按数据原值写；
 * 4. trial_demo / demo_prompts / meta 没有对应的冻结表（M5-GAPS 记录），不落库、只随
 *    bootstrap 从本文件带回。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const DEMO_DATA_FILE = fileURLToPath(new URL('../demo/demo-data.js', import.meta.url))

/** 在 Node 里加载 demo/demo-data.js（唯一源），返回 window.DEMO_DATA 的内容。 */
export function loadDemoData(file = DEMO_DATA_FILE) {
  const src = readFileSync(file, 'utf8')
  const scope = {}
  try {
    new Function('window', src)(scope)
  } catch (error) {
    throw new Error(`加载演示数据失败（demo/demo-data.js）：${error.message}`)
  }
  if (!scope.DEMO_DATA) {
    throw new Error('demo/demo-data.js 没有产出 window.DEMO_DATA（唯一源被改动？）')
  }
  return scope.DEMO_DATA
}

const j = (v) => (v === undefined ? null : JSON.stringify(v));

/** 把 demo/demo-data.js 的数据写进库。返回写入计数（便于启动日志与测试）。 */
export function seedDemo(db, input) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('seedDemo 需要一个已打开的数据库');
  const data = input || loadDemoData();

  const already = db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n;
  if (already > 0) return { skipped: true, profiles: 0, rows: 0 };

  const counts = { skipped: false, profiles: 0, rows: 0 };
  const bump = (n = 1) => { counts.rows += n; };

  db.exec('BEGIN');
  try {
    const insProfile = db.prepare(`INSERT INTO profiles
      (profile_key, display_name, record_mode, meta, headline, demo_label, created_at)
      VALUES (?,?,?,?,?,?,?)`);
    const insCare = db.prepare('INSERT INTO care_context (profile_key, key, value, ord) VALUES (?,?,?,?)');
    const insDef = db.prepare(`INSERT INTO metric_defs
      (id, profile_key, key, name, group_key, unit, comparable_key, ord) VALUES (?,?,?,?,?,?,?,?)`);
    const insRec = db.prepare(`INSERT INTO metric_records
      (id, profile_key, metric_id, value_num, value_text, measured_on, source_kind, source_ref, is_private, in_use, corrected_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insReport = db.prepare(`INSERT INTO reports
      (profile_key, title, kind, report_date, org, file_ref, summary_text, is_private, in_use, corrected_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const insNote = db.prepare(`INSERT INTO notes
      (id, profile_key, kind, author_role, content, occurred_on, is_private, in_use, corrected_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const insMed = db.prepare(`INSERT INTO med_events
      (id, profile_key, kind, label, occurred_on, series_id, source_kind, is_private, in_use, corrected_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const insEpisode = db.prepare(`INSERT INTO episodes
      (id, profile_key, kind, started_on, ended_on, title, note_ref, is_private, in_use, corrected_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const insVisit = db.prepare(`INSERT INTO visits
      (id, profile_key, dept, visited_on, purpose, note_ref, is_private, in_use, corrected_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const insDoc = db.prepare('INSERT INTO doc_refs (id, profile_key, title, kind, ref, note, in_use, created_at) VALUES (?,?,?,?,?,?,?,?)');
    const insCand = db.prepare('INSERT INTO ai_candidates (id, profile_key, target_table, payload, status, created_at) VALUES (?,?,?,?,?,?)');
    const insSeries = db.prepare(`INSERT INTO infusion_series
      (id, profile_key, label, cadence_note, started_on, ended_on, is_private, in_use, created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    const insFlare = db.prepare('INSERT INTO flare_episodes (id, profile_key, episode_id, dept, care_ref, in_use, created_at) VALUES (?,?,?,?,?,?,?)');
    const insFamily = db.prepare(`INSERT INTO family_lines
      (id, profile_key, person_rel, doctor_quote, item_fact, happened_on, is_private, in_use, corrected_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const insTitle = db.prepare('INSERT INTO section_titles (profile_key, key, title, ord) VALUES (?,?,?,?)');

    /* 报告 id 是字符串业务键（r-a1 …），其余表用 demo 数据自带的数字 id：更正链
       （corrected_by 自引用）按 id 指向，播种必须保号，不能重新分配。 */
    for (const [key, p] of Object.entries(data.profiles || {})) {
      insProfile.run(key, p.name, p.record_mode ?? 'self', p.meta ?? null, p.headline ?? null, p.demo_label ?? null, p.created_at ?? null);
      counts.profiles++;
    }
    for (const r of data.care_context || []) { insCare.run(r.profile_key, r.key, r.value, r.ord); bump(); }
    for (const d of data.metric_defs || []) {
      /* unit_note 没有冻结列（M5-GAPS 记录）：它随 bootstrap 从唯一源带回，不落库。 */
      insDef.run(d.id, d.profile_key, d.key, d.name, d.group_key, d.unit ?? null, d.comparable_key ?? null, d.ord);
      bump();
    }
    /* 报告先插：schema 冻结 reports.id 为 INTEGER，而唯一源里是字符串业务键（r-a1…）。
       播种按唯一源顺序取自增 id，并记下「演示键 → 库内 id」映射，供 metric_records.source_ref
       改指（未登记的报告键如 r-b4 保留原样——它本来就指向不存在的报告，如实留空语义）。 */
    const reportIdRemap = new Map();
    for (const r of data.reports || []) {
      const res = insReport.run(r.profile_key, r.title, r.kind, r.report_date ?? null, r.org ?? null, r.file_ref ?? null,
        r.summary_text ?? null, r.is_private ? 1 : 0, r.in_use === undefined ? 1 : r.in_use,
        r.corrected_by ?? null, r.created_at ?? null);
      reportIdRemap.set(r.id, Number(res.lastInsertRowid));
      bump();
    }
    for (const r of data.metric_records || []) {
      const ref = r.source_ref ?? null;
      const mapped = ref !== null && reportIdRemap.has(ref) ? String(reportIdRemap.get(ref)) : ref;
      insRec.run(r.id, r.profile_key, r.metric_id, r.value_num ?? null, r.value_text ?? null, r.measured_on ?? null,
        r.source_kind ?? null, mapped, r.is_private ? 1 : 0, r.in_use === undefined ? 1 : r.in_use,
        r.corrected_by ?? null, r.created_at ?? null);
      bump();
    }
    for (const r of data.notes || []) {
      insNote.run(r.id, r.profile_key, r.kind, r.author_role, r.content, r.occurred_on ?? null,
        r.is_private ? 1 : 0, r.in_use === undefined ? 1 : r.in_use, r.corrected_by ?? null, r.created_at ?? null);
      bump();
    }
    for (const r of data.med_events || []) {
      insMed.run(r.id, r.profile_key, r.kind, r.label, r.occurred_on ?? null, r.series_id ?? null,
        r.source_kind ?? null, r.is_private ? 1 : 0, r.in_use === undefined ? 1 : r.in_use,
        r.corrected_by ?? null, r.created_at ?? null);
      bump();
    }
    for (const r of data.episodes || []) {
      insEpisode.run(r.id, r.profile_key, r.kind, r.started_on, r.ended_on ?? null, r.title ?? null,
        r.note_ref ?? null, r.is_private ? 1 : 0, r.in_use === undefined ? 1 : r.in_use,
        r.corrected_by ?? null, r.created_at ?? null);
      bump();
    }
    for (const r of data.visits || []) {
      insVisit.run(r.id, r.profile_key, r.dept, r.visited_on, r.purpose ?? null, r.note_ref ?? null,
        r.is_private ? 1 : 0, r.in_use === undefined ? 1 : r.in_use, r.corrected_by ?? null, r.created_at ?? null);
      bump();
    }
    for (const r of data.doc_refs || []) {
      insDoc.run(r.id, r.profile_key, r.title, r.kind, r.ref ?? null, r.note ?? null, r.in_use === undefined ? 1 : r.in_use, r.created_at ?? null);
      bump();
    }
    for (const r of data.ai_candidates || []) {
      insCand.run(r.id, r.profile_key, r.target_table, j(r.payload), r.status, r.created_at ?? null);
      bump();
    }
    for (const r of data.infusion_series || []) {
      insSeries.run(r.id, r.profile_key, r.label, r.cadence_note ?? null, r.started_on, r.ended_on ?? null,
        r.is_private ? 1 : 0, r.in_use === undefined ? 1 : r.in_use, r.created_at ?? null);
      bump();
    }
    for (const r of data.flare_episodes || []) {
      insFlare.run(r.id, r.profile_key, r.episode_id, r.dept ?? null, r.care_ref ?? null,
        r.in_use === undefined ? 1 : r.in_use, r.created_at ?? null);
      bump();
    }
    for (const r of data.family_lines || []) {
      insFamily.run(r.id, r.profile_key, r.person_rel, r.doctor_quote, r.item_fact ?? null, r.happened_on ?? null,
        r.is_private === undefined ? 1 : r.is_private, r.in_use === undefined ? 1 : r.in_use,
        r.corrected_by ?? null, r.created_at ?? null);
      bump();
    }
    for (const r of data.section_titles || []) { insTitle.run(r.profile_key, r.key, r.title, r.ord); bump(); }

    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* 回滚失败也要把原始错误抛出去 */ }
    throw new Error(`播种演示数据失败（已回滚）：${error.message}`);
  }
  return counts;
}

/** 库的演示档案是否已播种过。启动流程用它决定要不要 seedDemo。 */
export function hasDemoData(db) {
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n > 0;
  } catch {
    return false;
  }
}
