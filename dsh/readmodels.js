/* 读模型（AATD）：把库里的行还原成**前端要的形状**（与 demo/demo-data.js 同形）。
 *
 * 契约：`GET /api/aatd/bootstrap` 的 payload 必须与 demo/demo-data.js 逐表逐字段一致
 * （test/store.test.mjs 做 deepStrictEqual）。所以这里不做任何"顺手优化"：
 * 字段名、数组层级、null 与缺失的语义都跟着唯一源走。
 *
 * schema/0001_initial.sql 的 8 条口径在这里执行：
 * 1. 无判定列：不输出任何 diagnosis / risk_level 类字段（schema 也没有）；
 * 2. 显式 null：缺失照 null 返回，不用空串冒充；
 * 3. 更正链：旧版本 in_use=0 保留随行返回（前端与导出/AI 上下文各自按规则过滤）；
 * 4. 四层不合并：reports / ai_candidates / 事实表 / metric_defs 分表返回；
 * 5. 跨 comparable_key 不合并：metric_defs 原样带 comparable_key，读模型不并组、不做差；
 * 6. 计次不落库：输注次数 / 缺口周由 infusionStats() 现算；
 * 7. 发作第 N 天 / 距上次发作 / 近 90 天计数由 flareSummary() / flareCount90() 现算；
 * 8. 私密三出口共用 filterPrivateRows()（改写链上任一版本私密则旧原文不出口）：
 *    看板出口由前端同一语义的 filterPrivate() 执行；导出与 AI 上下文在服务端执行。
 */
import { AGENT_PANE } from '../lib/layout.js';

/* node:sqlite 返回 null-prototype 行对象，直接 deepStrictEqual 会因原型不同而失败。统一摊平。 */
const rows = (db, sql, ...args) => db.prepare(sql).all(...args).map((r) => ({ ...r }));
const jp = (s, fallback = null) => {
  if (s === null || s === undefined) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};
const flag = (v) => (v ? 1 : 0);

/* ---------------- 私密三出口过滤（口径 8） ----------------
 * 1) 自身 is_private=1 的版本永不出口；
 * 2) 已被更正的旧版本（corrected_by 非空，即「旧原文」）永不出口；
 * 3) 因此链上任一版本为私密时，该链的旧原文在任何出口都不可见，
 *    只有最新的非私密新版本可出口，且它只承载更正后的文本、不复述旧原文。
 * 演示数据见 demo/demo-data.js「私密改写链示例」与 schema/freeze-contract.md 口径 8。 */
export function filterPrivateRows(list) {
  return (list || []).filter((x) => {
    if (flag(x.is_private)) return false;
    if (x.corrected_by) return false; /* 旧原文：已被新版本取代，任何出口不出现 */
    return true;
  });
}

/** 私密计数（页面要如实写「N 条中私密 M 条」，所以条数要单独可查）。 */
export function privateCountRows(list) {
  return (list || []).filter((x) => flag(x.is_private)).length;
}

/* ---------------- 派生值：读时算，不落库（口径 6/7） ---------------- */

const utcOf = (s) => {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
};
export const dayDiff = (from, to) => {
  const a = utcOf(from), b = utcOf(to);
  return a === null || b === null ? null : Math.round((b - a) / 86400000);
};
export const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * 发作—缓解摘要：开放区间 → 「发作中第 N 天」；否则「距上次发作 N 天」（以缓解日开始算）。
 * 私密发作不进摘要（口径 8），与前端 filterPrivate 后的 lastFlareInfo 同一结果。
 */
export function flareSummary(db, profileKey, { today = todayISO() } = {}) {
  const eps = filterPrivateRows(
    rows(db, 'SELECT * FROM episodes WHERE profile_key = ? AND in_use = 1 ORDER BY started_on', profileKey),
  );
  if (!eps.length) return { mode: 'none' };
  const open = eps.find((e) => !e.ended_on);
  if (open) return { mode: 'open', episodeId: open.id, startedOn: open.started_on, days: dayDiff(open.started_on, today) };
  const last = eps[eps.length - 1];
  return { mode: 'since', episodeId: last.id, startedOn: last.started_on, endedOn: last.ended_on, days: dayDiff(last.ended_on, today) };
}

/** 近 90 天发作计数（私密不进计数；口径 7）。 */
export function flareCount90(db, profileKey, { today = todayISO() } = {}) {
  const cut = new Date(Date.parse(today) - 90 * 86400000).toISOString().slice(0, 10);
  return filterPrivateRows(
    rows(db, 'SELECT * FROM episodes WHERE profile_key = ? AND in_use = 1 ORDER BY started_on', profileKey),
  ).filter((e) => e.started_on >= cut).length;
}

/**
 * 输注按次统计：一段的已记次数、缺口周、最近一次。
 * 缺口周从段起点逐周推到 min(ended_on, 最后一次实际输注)（进行中段推到最后一次），
 * 与前端 infusionStats() 同一算法——计次不落库（口径 6）。
 */
export function infusionStats(db, seriesId) {
  const evs = rows(db, 'SELECT occurred_on FROM med_events WHERE series_id = ? AND in_use = 1 AND occurred_on IS NOT NULL ORDER BY occurred_on', seriesId)
    .map((r) => r.occurred_on);
  if (!evs.length) return { count: 0, gaps: [], last: null };
  const s = db.prepare('SELECT started_on, ended_on FROM infusion_series WHERE id = ?').get(seriesId);
  if (!s) return { count: evs.length, gaps: [], last: evs[evs.length - 1] };
  const actual = new Set(evs);
  const lastActual = evs[evs.length - 1];
  const until = s.ended_on && s.ended_on < lastActual ? s.ended_on : (s.ended_on || lastActual);
  const gaps = [];
  let d = s.started_on;
  while (d <= until) {
    if (!actual.has(d)) gaps.push(d);
    d = new Date(Date.parse(d) + 7 * 86400000).toISOString().slice(0, 10);
  }
  return { count: evs.length, gaps, last: lastActual };
}

/* ---------------- 各表读取 ---------------- */

function readMetricDefs(db, profileKey, unitNoteByKey) {
  return rows(db, 'SELECT * FROM metric_defs WHERE profile_key = ? ORDER BY ord, rowid', profileKey)
    .map((d) => {
      /* unit_note 没有冻结列（M5-GAPS）：从唯一源按 key 回带，保持与 demo-data.js 同形。 */
      const note = unitNoteByKey?.get(d.key);
      return note ? { ...d, unit_note: note } : d;
    });
}

function readProfileEntries(db) {
  return rows(db, 'SELECT * FROM profiles ORDER BY rowid').map((p) => ({
    key: p.profile_key,
    name: p.display_name,
    record_mode: p.record_mode,
    meta: p.meta,
    headline: p.headline,
    demo_label: p.demo_label,
    created_at: p.created_at,
  }));
}

/** 受累器官 chips 从指标分组派生（肺 / 肝）+ 随访节律，不落库、不判定。 */
export function deriveChips(db, profileKey) {
  const groups = new Set(
    rows(db, 'SELECT DISTINCT group_key FROM metric_defs WHERE profile_key = ?', profileKey).map((r) => r.group_key),
  );
  const chips = [];
  if (groups.has('lung')) chips.push('肺');
  if (groups.has('liver')) chips.push('肝');
  chips.push('随访节律');
  return chips;
}

/**
 * `/api/aatd/bootstrap` 的 payload。
 * @param {object} db 已 migrate（可未播种）的库
 * @param {object} opts
 * @param {string} [opts.version] 唯一来源 lib/version.js
 * @param {string} [opts.build]
 * @param {object} [opts.demo] demo/demo-data.js 的内容（dsh/demo.js loadDemoData()），
 *   只取没有冻结表的三块：trial_demo / demo_prompts / meta（M5-GAPS 记录）。
 */
export function bootstrap(db, { version, build, demo = null } = {}) {
  const unitNoteByKey = new Map((demo?.metric_defs || []).filter((d) => d.unit_note).map((d) => [d.key, d.unit_note]));
  const profiles = {};
  for (const p of readProfileEntries(db)) {
    profiles[p.key] = { ...p, chips: deriveChips(db, p.key) };
  }
  const payload = {
    version: version ?? null,
    build: build ?? null,
    meta: { demo_label: '合成示例 · 仅演示' },
    profiles,
    trial_demo: demo?.trial_demo ?? [],
    demo_prompts: demo?.demo_prompts ?? {},
    care_context: rows(db, 'SELECT * FROM care_context ORDER BY profile_key, ord, rowid'),
    metric_defs: [].concat(
      ...rows(db, 'SELECT DISTINCT profile_key FROM metric_defs ORDER BY rowid')
        .map((r) => readMetricDefs(db, r.profile_key, unitNoteByKey)),
    ),
    metric_records: rows(db, 'SELECT * FROM metric_records ORDER BY rowid'),
    reports: rows(db, 'SELECT * FROM reports ORDER BY rowid'),
    notes: rows(db, 'SELECT * FROM notes ORDER BY rowid'),
    med_events: rows(db, 'SELECT * FROM med_events ORDER BY rowid'),
    episodes: rows(db, 'SELECT * FROM episodes ORDER BY rowid'),
    visits: rows(db, 'SELECT * FROM visits ORDER BY rowid'),
    doc_refs: rows(db, 'SELECT * FROM doc_refs ORDER BY rowid'),
    ai_candidates: rows(db, 'SELECT * FROM ai_candidates ORDER BY rowid').map((c) => ({ ...c, payload: jp(c.payload) })),
    infusion_series: rows(db, 'SELECT * FROM infusion_series ORDER BY rowid'),
    flare_episodes: rows(db, 'SELECT * FROM flare_episodes ORDER BY rowid'),
    family_lines: rows(db, 'SELECT * FROM family_lines ORDER BY rowid'),
    section_titles: rows(db, 'SELECT * FROM section_titles ORDER BY profile_key, ord, rowid'),
    /* 派生值：页面同款算法的服务端版本（口径 6/7）。前端自己也算，两边一致由测试钉住。 */
    derived: {},
    /* 宿主未提供原生会话时这里会是 available:false；开发版自带挂载位演示，所以默认 true。 */
    agent: { available: true, mode: 'dev-mount' },
    layout: { agentPane: AGENT_PANE },
  };
  for (const key of Object.keys(profiles)) {
    payload.derived[key] = {
      flare: flareSummary(db, key),
      flares90: flareCount90(db, key),
      infusions: rows(db, 'SELECT id, label, started_on, ended_on FROM infusion_series WHERE profile_key = ? AND in_use = 1 ORDER BY rowid', key)
        .map((s) => ({ id: s.id, label: s.label, ...infusionStats(db, s.id) })),
    };
  }
  return payload;
}
