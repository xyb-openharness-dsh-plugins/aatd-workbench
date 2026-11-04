'use strict';
/* 小筛宝 A1Pal v0.2.0 — α1-抗胰蛋白酶缺乏症工作台 · 交互原型。
 * 患者数据全部为合成示例 · 仅演示；不读写真实文件、不调用模型或宿主 API、无 fetch。
 * 结构工艺：三段外壳 / 侧栏 236px（选中态底色 + 左 3px 竖条）/ 顶栏三段式 + 右按钮组贴右缘 /
 * 页脚贴底；指标卡真 3D 翻面（定高 194px）；一图秀 Fritsch–Carlson 单调三次插值；
 * 泳道五类事件节点只画不连线；details.phase-fold 原生折叠 + 打印全展开；
 * 整页视图 #page=xxx（history 导航栈、Esc 一层一退、返回 + 关闭双入口）；
 * 疾病概要整页面板（四段、每段强制来源行）；AI 面板 35%（1px splitter + 11px 热区，可拖 25–45%）；
 * 私密三出口共用 filterPrivate()；唯一数据源 window.DEMO_DATA。
 */

const APP_INFO = {
  version: '0.3.0',
  build: '2026-11-05',
  channel: 'prototype',
  channelLabel: '交互原型 · 未接入 DSH'
};
APP_INFO.displayVersion = `v${APP_INFO.version}`;
const TITLE = '小筛宝 A1Pal · α1-抗胰蛋白酶缺乏症工作台';
if (document.title !== TITLE) document.title = TITLE;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- icons & nav ---------------- */
const icons = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  pulse: 'M3 12h4l2.5-6 4 12 2.5-6h5',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  report: 'M6 3h9l4 4v14H6ZM14 3v5h5M9 12h6M9 16h4',
  chart: 'M4 3v17h17M7 14l4-5 4 3 5-7',
  drip: 'M12 3v6m0 0a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM7 7h10',
  users: 'M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.6a3.5 3.5 0 0 1 0 6.8M17 14.3c2.9.7 5 3.1 5 5.7',
  heart: 'M12 20.3c-4.6-2.9-7.4-5.6-7.4-9A4.1 4.1 0 0 1 12 8.4a4.1 4.1 0 0 1 7.4 2.9c0 3.4-2.8 6.1-7.4 9Z',
  flask: 'M9 3h6v5l5 9a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3l5-9Z',
  calendar: 'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 3h2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.2-1.6l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2.7-1.6L13.8 2h-3.6l-.4 2.5a7.6 7.6 0 0 0-2.7 1.6l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 3.2l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 2.7 1.6l.4 2.5h3.6l.4-2.5a7.6 7.6 0 0 0 2.7-1.6l2.3 1 2-3.4-2-1.5c.13-.52.2-1.06.2-1.6Z'
};
const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[k] || icons.home}"/></svg>`;

/* 11 个一级页：页名逐字来自 SPEC / 任务页表（IP3） */
const PAGES = [
  ['home', '看板', 'home'], ['course', '病程', 'pulse'], ['records', '记录与报告', 'folder'],
  ['labs', '检查与指标', 'report'], ['chart', '病情一图秀', 'chart'], ['treatment', '输注与治疗', 'drip'],
  ['family', '家系与基因', 'users'], ['mind', '心理与生活', 'heart'], ['nutrition', '营养与生活', 'leaf'], ['trial', '临床研究线索', 'flask'],
  ['review', '复诊准备', 'calendar'], ['settings', '设置', 'gear']
];
const SUBPAGES = {
  course: [['timeline', '时间线'], ['list', '发作列表']],
  records: [['lib', '资料库'], ['draft', '整理草稿 · 核对'], ['archive', '病情档案'], ['panel', '指标检测'], ['summary', '病情汇总']],
  mind: [['feel', '当下感受'], ['life', '生活与负担']],
  trial: [['match', '匹配'], ['search', '检索'], ['saved', '收藏与跟踪']]
};
const SUBTITLES = {
  home: '发作—缓解、肺与肝两路化验、每周输注，都放在一起看。',
  course: '加重与缓解按时间并列；「第几天」由记录算出，不手填。',
  records: '上传 → 解析 → 核对 → 入档；原件永远保留，接受之前都只是候选。',
  labs: '肺功能与肝功能分节；同一可比组内才连线，不同方法不合并。',
  chart: '把肺、肝两条线的化验放回同一段时间里，看见变化发生在哪一步。',
  treatment: '输注按周登记、按次计次；漏了哪一周就空着哪一周。',
  family: '家系线索只记医生原话与筛查条目，不判定任何家族成员的风险。',
  mind: '害怕、疲惫、反复出现的念头都算正常反应；这里的内容默认只属于你。',
  nutrition: '体重和进食的变化只按记录回顾；怎么吃、要不要补，归营养师和医生判断。',
  trial: '线索不是推荐；登记状态与入排条件以研究中心为准，这里不做匹配判定。',
  review: '该带什么、该问什么，提前理成一页，诊室里就不用凭记忆。',
  settings: '档案切换、私密管理、大字模式与口径说明。'
};

/* ---------------- 数据层（唯一源：window.DEMO_DATA） ---------------- */
const D = window.DEMO_DATA;
const PROFILE_KEYS = Object.keys(D.profiles);
const inUse = (r) => r.in_use === undefined || r.in_use === 1;
const rows = (table, pk) => (D[table] || []).filter((r) => r.profile_key === pk && inUse(r));

const GROUP_COLORS = { lung: '#1f8a8c', liver: '#7a5c1e', body: '#5c707a' };
const metricDefs = (pk) => rows('metric_defs', pk).slice().sort((a, b) => a.ord - b.ord);
const metricRecs = (pk) => rows('metric_records', pk);
const recsOfDef = (pk, defId) => metricRecs(pk).filter((r) => r.metric_id === defId)
  .slice().sort((a, b) => String(a.measured_on || '9999').localeCompare(String(b.measured_on || '9999')));
const notesFor = (pk) => rows('notes', pk).slice().sort((a, b) => String(b.occurred_on || b.created_at).localeCompare(String(a.occurred_on || a.created_at)));
const episodesFor = (pk) => rows('episodes', pk).slice().sort((a, b) => a.started_on.localeCompare(b.started_on));
const seriesFor = (pk) => rows('infusion_series', pk);
const visitsFor = (pk) => rows('visits', pk).slice().sort((a, b) => String(a.visited_on).localeCompare(String(b.visited_on)));
const sectionTitle = (pk, key) => { const t = (D.section_titles || []).find((s) => s.profile_key === pk && s.key === key); return t ? t.title : key; };
const careValue = (pk) => (D.care_context || []).filter((c) => c.profile_key === pk).sort((a, b) => a.ord - b.ord).map((c) => c.value);

/* 私密三出口共用同一过滤函数（看板 / 复诊准备导出 / AI 上下文三处调用同一份）。
 * 更正链口径（按 corrected_by 链溯源）：
 *   1) 自身 is_private=1 的版本永不出口；
 *   2) 已被更正的旧版本（corrected_by 非空，即「旧原文」）永不出口；
 *   3) 因此链上任一版本为私密时，该链的旧原文在三出口都不可见，
 *      只有最新的非私密新版本可出口，且它只承载更正后的文本、不复述旧原文。
 * 演示数据见 demo/demo-data.js「私密改写链示例」：旧版私密情绪原文 + 新版公开事实记录，
 *   看板 / 导出 / AI 上下文三处都只出现更正版，旧私密原文任何出口都不可见。 */
function filterPrivate(list) {
  return (list || []).filter((x) => {
    if (x.is_private) return false;
    if (x.corrected_by) return false; /* 旧原文：已被新版本取代，任何出口不出现 */
    return true;
  });
}
function privateCount(list) { return (list || []).filter((x) => x.is_private).length; }
function privateLabel(n, pn) { return pn > 0 ? `${n} 条中私密 ${pn} 条（默认不进导出、看板摘要与 AI 上下文）` : `${n} 条（无私密项）`; }

/* 派生值读时算，不落库 */
const utcOf = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; };
const dayDiff = (from, to) => { const a = utcOf(from), b = utcOf(to); return a === null || b === null ? null : Math.round((b - a) / 86400000); };
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d === null || d === undefined || d === '' ? '未记录' : d;
/* 看板摘要口径：私密发作不进计数（N 条中私密 M 条在 UI 上如实标注） */
function lastFlareInfo(pk) {
  const eps = filterPrivate(episodesFor(pk));
  if (!eps.length) return { mode: 'none' };
  const open = eps.find((e) => !e.ended_on);
  if (open) return { mode: 'open', ep: open, days: dayDiff(open.started_on, todayISO()) };
  const last = eps[eps.length - 1];
  return { mode: 'since', ep: last, days: dayDiff(last.ended_on, todayISO()) };
}
function flares90(pk) {
  const cut = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  return filterPrivate(episodesFor(pk)).filter((e) => e.started_on >= cut);
}
/* 输注计次与缺口周：由 med_events 现算（schema 口径 D：计次不落库） */
function infusionStats(pk, s) {
  const evs = rows('med_events', pk).filter((m) => m.series_id === s.id && m.occurred_on).map((m) => m.occurred_on).sort();
  if (!evs.length) return { count: 0, gaps: [], last: null };
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
/* 泳道 / 时间线事件：五类（用药 / 就诊 / 检查 / 缓解开始 / 加重），由事实表派生 */
function laneEvents(pk) {
  const out = [];
  rows('med_events', pk).forEach((m) => { if (m.occurred_on) out.push({ d: m.occurred_on, kind: 'med', text: m.label }); });
  visitsFor(pk).forEach((v) => out.push({ d: v.visited_on, kind: 'visit', text: `${v.dept} · ${v.purpose}` }));
  metricRecs(pk).forEach((r) => { if (r.measured_on) { const def = (D.metric_defs || []).find((x) => x.id === r.metric_id); out.push({ d: r.measured_on, kind: 'exam', text: def ? `${def.name}${r.value_num != null ? '：' + r.value_num + ' ' + (def.unit || '') : ''}` : '化验记录' }); } });
  rows('reports', pk).forEach((r) => { if (r.report_date) out.push({ d: r.report_date, kind: 'exam', text: `报告：${r.title}` }); });
  episodesFor(pk).forEach((e) => {
    out.push({ d: e.started_on, kind: 'flare', text: `加重开始：${e.title}` });
    if (e.ended_on) out.push({ d: e.ended_on, kind: 'relief', text: `缓解开始：${e.title}` });
  });
  return out.sort((a, b) => a.d.localeCompare(b.d));
}

/* ---------------- state ---------------- */
const defaultSel = (pk) => {
  const defs = metricDefs(pk).filter((d) => recsOfDef(pk, d.id).some((r) => typeof r.value_num === 'number'));
  return defs.slice(0, 3).map((d) => d.id);
};
const state = {
  view: 'home', sub: {}, profile: 'A', sel: {}, range: 'all',
  toggles: { bands: true, treat: true }, pin: null,
  agentOpen: false, agentDrafts: 0, cfgTab: 'store',
  mineru: { consent: false, tokenMasked: '' },
  privateOpen: false, query: '',
  trialPref: { recruiting: false, observational: false },
  trialQuery: { keyword: '', studyType: '', status: '' },
  mem: { questions: [], docs: [], savedTrials: [] }
};
if (!state.sel.A) { PROFILE_KEYS.forEach((k) => { state.sel[k] = defaultSel(k); }); }
const P = () => D.profiles[state.profile];
const MDEFS = () => metricDefs(state.profile);

/* ---------------- 通用元件 ---------------- */
const pageHead = (sub) => {
  const pg = PAGES.find((p) => p[0] === state.view);
  return `<div class="page-head"><div><h1>${esc(pg[1])}</h1><p>${esc(SUBTITLES[state.view])}</p></div>
    <div class="actions">${aiBtn(state.view)}</div></div>${sub ? subnav() : ''}`;
};
const subnav = () => {
  const subs = SUBPAGES[state.view] || [];
  if (!subs.length) return '';
  const cur = state.sub[state.view] || subs[0][0];
  return `<div class="subnav" role="tablist">${subs.map(([k, label]) =>
    `<button role="tab" aria-selected="${cur === k}" data-action="sub-nav" data-sub="${k}">${esc(label)}</button>`).join('')}</div>`;
};
const pill = (t, c = '') => `<span class="pill ${c}">${esc(t)}</span>`;
const row = (b, p, right = '') => `<div class="row"><div class="row-main"><div><b>${b}</b>${p ? `<p>${p}</p>` : ''}</div></div>${right}</div>`;
const emptyBox = (h, p, btn = '') => `<div class="empty"><h3>${esc(h)}</h3><p>${esc(p)}</p>${btn ? `<div class="actions">${btn}</div>` : ''}</div>`;
const sceneBtn = (label, act) => `<button class="chip" data-action="${act}">${esc(label)}</button>`;
/* 场景直达条 S01–S08 */
const SCENES = [
  ['S01', '确诊建档', 'records', 'lib'], ['S02', '一次发作', 'course', 'timeline'],
  ['S03', '一次调药', 'treatment', ''], ['S04', '复诊准备', 'review', ''],
  ['S05', '家属代记', 'mind', 'life'], ['S06', '私密记录', 'mind', 'feel'],
  ['S07', '文档导入', 'records', 'draft'], ['S08', '家系沟通', 'family', '']
];
const sceneBar = () => `<div class="scene-bar" role="group" aria-label="场景直达">${SCENES.map(([sid, label, pg, sb]) =>
  `<button class="chip" data-action="scene" data-page="${pg}" data-sub="${esc(sb || '')}">${sid} ${esc(label)}</button>`).join('')}</div>`;
const authorTag = (r) => r.author_role === 'family' ? pill('家属代记', 'brand') : pill('本人记', 'grey');
const kindLabel = { symptom: '症状', doctor_quote: '医生原话', question: '想问', caregiver: '照护' };

/* ---------------- AI 入口（IP11 / 34 号）：只填提示词，不自动发送 ---------------- */
function pageFacts(view) {
  const pk = state.profile, p = P();
  const pub = (list) => filterPrivate(list);
  switch (view) {
    case 'home': {
      const lf = lastFlareInfo(pk);
      const notesAll = notesFor(pk);
      const visible = pub(notesAll);
      return {
        facts: [
          `档案：${p.name}（${p.meta}）——${p.demo_label}`,
          lf.mode === 'open' ? `当前一次发作自 ${lf.ep.started_on} 起，缓解未记录（发作中第 ${lf.days} 天）`
            : lf.mode === 'since' ? `最近一次发作 ${lf.ep.started_on} → ${lf.ep.ended_on}（距上次发作 ${lf.days} 天）`
            : '暂无发作记录',
          `近 90 天发作 ${flares90(pk).length} 次`,
          `可见记录 ${visible.length} 条（私密 ${privateCount(notesAll)} 条已排除，不进入本提示词）`
        ],
        missing: ['下次随访的具体日期', '基因分型报告（如未出）']
      };
    }
    case 'course': {
      const epsAll = episodesFor(pk);
      const eps = filterPrivate(epsAll);
      const pn = privateCount(epsAll);
      return { facts: [`发作—缓解区间共 ${eps.length} 条${pn ? `（私密 ${pn} 条已排除，不进入本提示词）` : ''}`, ...eps.slice(-3).map((e) => `${e.started_on} → ${e.ended_on || '缓解未记录'}：${e.title}`)], missing: [] };
    }
    case 'records': {
      const cands = rows('ai_candidates', pk);
      return {
        facts: [`资料 ${rows('doc_refs', pk).length} 份、报告 ${rows('reports', pk).length} 份`, `候选 ${cands.filter((c) => c.status === 'pending').length} 条待核对（拒收零副作用）`],
        missing: []
      };
    }
    case 'labs': case 'chart': {
      const defs = metricDefs(pk);
      let recTotal = 0, recPrivate = 0;
      const lines = defs.map((d) => {
        const rsAll = recsOfDef(pk, d.id);
        const rs = filterPrivate(rsAll);
        recTotal += rsAll.length; recPrivate += privateCount(rsAll);
        const last = rs[rs.length - 1];
        return last ? `${d.name} 最近：${last.value_num != null ? last.value_num + ' ' + (d.unit || '') : (last.value_text || '文本记录')}（${fmtDate(last.measured_on)}）` : `${d.name}：暂无记录`;
      });
      if (recPrivate) lines.unshift(`化验记录 ${recTotal} 条中私密 ${recPrivate} 条已排除，不进入本提示词`);
      return { facts: lines, missing: ['两次化验之间医生的原话（如有）'] };
    }
    case 'treatment': {
      const ssAll = seriesFor(pk);
      const ss = filterPrivate(ssAll);
      const ssPn = privateCount(ssAll);
      const facts = ss.length ? ss.map((s) => {
        const st = infusionStats(pk, s);
        return `${s.label}：${s.started_on} → ${s.ended_on || '进行中'}，已记录 ${st.count} 次${st.gaps.length ? `，缺口周 ${st.gaps.length} 个` : ''}`;
      }) : ['尚无输注段记录'];
      if (ssPn) facts.push(`私密输注段 ${ssPn} 条已排除，不进入本提示词`);
      const medsAll = rows('med_events', pk).filter((m) => m.kind === 'medication');
      const meds = filterPrivate(medsAll);
      const medsPn = privateCount(medsAll);
      if (medsPn) facts.push(`用药记录 ${medsAll.length} 条中私密 ${medsPn} 条已排除，不进入本提示词`);
      return { facts: [...facts, ...meds.map((m) => `用药：${m.label}（${fmtDate(m.occurred_on)}）`)], missing: [] };
    }
    case 'family': {
      const fl = rows('family_lines', pk);
      return { facts: [`家系线索 ${fl.length} 条（涉及他人健康信息，默认私密；本提示词只带条目数，不带原文）`], missing: ['医生对筛查条目的补充说明'] };
    }
    case 'mind': return { facts: [`心理与生活记录：${notesFor(pk).filter((n) => n.kind === 'symptom' || n.kind === 'caregiver').length} 条（私密条目只计数量，原文不进入本提示词）`], missing: [] };
    case 'trial': return { facts: [`建档事实 ${trialFacts(pk).length} 条（只含医生原话与报告原文，无判定）`], missing: ['研究中心对登记状态的最新答复'] };
    case 'review': {
      const notesAll = notesFor(pk);
      return { facts: [`复诊材料预览：可见记录 ${filterPrivate(notesAll).length} 条（私密 ${privateCount(notesAll)} 条已排除）`, `想问清单 ${state.mem.questions.length} 条`], missing: [] };
    }
    case 'settings': return { facts: [`当前档案：${p.name}（${p.demo_label}）`, '口径：' + careValue(pk).join(' / ')], missing: [] };
    default: return { facts: [`当前页：${PAGES.find((x) => x[0] === view)[1]}`], missing: [] };
  }
}
function buildPrompt(view) {
  const ctx = pageFacts(view);
  const title = PAGES.find((p) => p[0] === view)[1];
  return [`【来自小筛宝工作台 · ${title}页】`, `档案：${P().name}（${P().meta}）——${P().demo_label}`, '',
    '本页已核对的事实：', ...ctx.facts.map((f) => '- ' + f), '',
    '尚未核对 / 待确认：', ...(ctx.missing.length ? ctx.missing.map((f) => '- ' + f) : ['- （无）']), '',
    '边界：以上是记录整理，不是医疗建议；请基于原文与医生沟通，不要求工作台外推结论。'].join('\n');
}
function aiBtn(view) {
  const prompt = buildPrompt(view);
  return `<a class="chip ai-link" href="aatd:agent-draft?prompt=${encodeURIComponent(prompt)}" data-ai="${view}"
    title="把预写提示词与当前病情上下文带进 AI 对话（只填不发；私密已过滤）">和 AI 讨论 ↗</a>`;
}

/* ---------------- 指标卡 mcard（真 3D · 定高 194px） ---------------- */
function sparkline(rs, color, w = 190, h = 40) {
  const pts = rs.filter((r) => typeof r.value_num === 'number');
  if (pts.length < 2) return '';
  const vs = pts.map((r) => r.value_num);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi === lo) { hi += 1; lo -= 1; }
  const X = (i) => 4 + (w - 8) * i / (pts.length - 1);
  const Y = (v) => h - 5 - (h - 10) * (v - lo) / (hi - lo);
  const path = pts.map((r, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(r.value_num).toFixed(1)}`).join('');
  const dots = pts.map((r, i) => `<circle class="sp-dot" cx="${X(i).toFixed(1)}" cy="${Y(r.value_num).toFixed(1)}" r="2.6" fill="${color}"/>`).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="base" d="M4 ${h - 5}H${w - 4}"/><path class="sp-line" d="${path}" stroke="${color}"/>${dots}</svg>`;
}
function deltaText(rs) {
  const nums = rs.filter((r) => typeof r.value_num === 'number');
  if (nums.length < 2) return null;
  const a = nums[nums.length - 1], b = nums[nums.length - 2];
  const d = a.value_num - b.value_num;
  return { text: (d > 0 ? '+' : '') + d, from: b.measured_on };
}
function flipCard(defId) {
  const el = document.querySelector(`[data-mcard="${defId}"]`);
  if (!el || el.dataset.static) return;
  const on = el.dataset.flipped !== 'true';
  el.dataset.flipped = String(on);
  el.setAttribute('aria-pressed', String(on));
  const front = el.querySelector('[data-face="front"]');
  const back = el.querySelector('[data-face="back"]');
  if (front) front.setAttribute('aria-hidden', String(on));
  if (back) back.setAttribute('aria-hidden', String(!on));
}
function mcard(def) {
  const rs = recsOfDef(state.profile, def.id);
  const color = GROUP_COLORS[def.group_key] || '#1f8a8c';
  const cat = `<span class="cat"><i style="background:${color}"></i>${def.group_key === 'lung' ? '肺' : '肝'} · ${esc(def.comparable_key)}</span>`;
  if (!rs.length) {
    return `<div class="mcard" data-mcard="${def.id}" data-static="1" role="group" aria-roledescription="指标卡"
      aria-label="${esc(def.name)}：暂无记录（未检测不等于阴性）">
      <span class="mface front" data-face="front" aria-hidden="false">${cat}<span class="name">${esc(def.name)}</span>
      <span class="na">还没有记录；未检测不等于阴性，查过之后在这里落第一条。</span>
      <span class="meta"><span>${esc(def.unit || '')}${def.unit_note ? `（${esc(def.unit_note)}）` : ''}</span><span class="hint">未检测</span></span></span></div>`;
  }
  const last = rs[rs.length - 1];
  const numeric = typeof last.value_num === 'number';
  if (!numeric) {
    return `<div class="mcard" data-mcard="${def.id}" data-static="1" role="group" aria-roledescription="指标卡"
      aria-label="${esc(def.name)}：文本记录（只按原文记录，不连折线）">
      <span class="mface front" data-face="front" aria-hidden="false">${cat}<span class="name">${esc(def.name)}</span>
      <span class="na">${esc(last.value_text || '文本记录')}</span>
      <span class="meta"><span>日期：${esc(fmtDate(last.measured_on))}</span><span class="hint">分类记录</span></span></span></div>`;
  }
  const d = deltaText(rs);
  return `<button class="mcard" data-mcard="${def.id}" data-flipped="false" aria-pressed="false" aria-roledescription="指标卡"
    aria-label="${esc(def.name)} 最近 ${last.value_num} ${esc(def.unit || '')}（${esc(fmtDate(last.measured_on))}）；点一下翻面看趋势">
    <span class="mcard-inner">
    <span class="mface front" data-face="front" aria-hidden="false">${cat}<span class="name">${esc(def.name)}</span>
      <span class="val">${last.value_num}<small>${esc(def.unit || '')}</small></span>
      ${def.unit_note ? `<small class="hint">${esc(def.unit_note)}</small>` : ''}
      ${d ? `<span class="delta">较上次 <em>${d.text}${def.unit ? ' ' + esc(def.unit) : ''}</em>（${esc(fmtDate(d.from))}）</span>` : `<span class="delta">仅 1 次记录，暂无前次可比</span>`}
      <span class="rec">${esc(fmtDate(last.measured_on))} · ${esc(last.source_kind === 'report' ? '来自报告' : '手工录入')}</span></span>
    <span class="mface back" data-face="back" aria-hidden="true">${cat}<span class="name">${esc(def.name)}</span>
      ${sparkline(rs, color)}
      <span class="meta"><span>共 ${rs.filter((r) => typeof r.value_num === 'number').length} 次数值记录 · 同一可比组内连线</span><span class="hint">轻点翻回</span></span></span>
    </span></button>`;
}

/* ---------------- 一图秀引擎（Fritsch–Carlson 单调三次插值） ---------------- */
const CW = 980;
const CX0 = 78, CX1 = 958;
const CHART_TOP = 82, BAND_H = 90, BAND_PAD = 13, CHART_BOTTOM = 54;
const inDomain = (d, t0, t1) => { const t = Date.parse(d); return t >= t0 && t <= t1; };
const xOf = (t, t0, t1) => CX0 + (t - t0) / Math.max(1, t1 - t0) * (CX1 - CX0);
function chartBounds() {
  const ds = [];
  MDEFS().forEach((d) => filterPrivate(recsOfDef(state.profile, d.id)).forEach((r) => { if (r.measured_on) ds.push(r.measured_on); }));
  filterPrivate(episodesFor(state.profile)).forEach((e) => { ds.push(e.started_on); if (e.ended_on) ds.push(e.ended_on); });
  ds.sort();
  return [Date.parse(ds[0] || todayISO()), Date.parse(ds[ds.length - 1] || todayISO())];
}
function chartDomain() {
  const [s, e] = chartBounds();
  const months = { '3m': 3, '6m': 6, '12m': 12, '1y': 12 }[state.range] || 0;
  const end = Math.max(e, Date.parse(todayISO()));
  const start = months ? new Date(new Date(end).setMonth(new Date(end).getMonth() - months)).getTime() : s;
  return [start, end];
}
/* 单调三次插值（Fritsch–Carlson，同 d3 curveMonotoneX）：平滑且不越过相邻点的 y 范围 */
function smoothPath(coords) {
  const n = coords.length;
  if (!n) return '';
  if (n === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  const dx = [], slope = [];
  for (let i = 0; i < n - 1; i++) {
    const ddx = coords[i + 1].x - coords[i].x;
    dx.push(ddx);
    slope.push(ddx ? (coords[i + 1].y - coords[i].y) / ddx : 0);
  }
  const tan = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) tan.push(0);
    else {
      const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
      tan.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]));
    }
  }
  tan.push(slope[n - 2]);
  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = coords[i].x + dx[i] / 3, c1y = coords[i].y + tan[i] * dx[i] / 3;
    const c2x = coords[i + 1].x - dx[i] / 3, c2y = coords[i + 1].y - tan[i + 1] * dx[i] / 3;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${coords[i + 1].x.toFixed(1)} ${coords[i + 1].y.toFixed(1)}`;
  }
  return d;
}
/* 顶部时间轴：按可用宽度和条带数双重限流，先减少刻度再减半，避免标签互相压叠 */
function monthTicks(t0, t1, AX0 = CX0, AX1 = CX1, maxTicks = 0) {
  const out = []; const d = new Date(t0); let cur = new Date(d.getFullYear(), d.getMonth(), 1);
  if (cur.getTime() < t0) cur.setMonth(cur.getMonth() + 1);
  while (cur.getTime() <= t1) {
    const x = AX0 + (cur.getTime() - t0) / Math.max(1, t1 - t0) * (AX1 - AX0);
    if (x > AX0 + 6 && x < AX1 - 6) out.push({ x, label: `${cur.getFullYear() === new Date(t1).getFullYear() ? '' : String(cur.getFullYear()).slice(2) + '.'}${cur.getMonth() + 1}月` });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  const cap = Math.max(3, Math.min(maxTicks || Math.floor((AX1 - AX0) / 78), 12));
  if (out.length > cap) {
    const step = Math.ceil(out.length / cap);
    return out.filter((_, i) => i % step === 0);
  }
  return out;
}
/* 每条序列单独成带：按该指标全期最小–最大归一化；私密与旧版本记录不进图（D5） */
function chartSeriesList(t0, t1) {
  const pk = state.profile;
  return state.sel[pk].map((id) => {
    const def = MDEFS().find((d) => d.id === id);
    if (!def) return null;
    const all = filterPrivate(recsOfDef(pk, id)).filter((r) => typeof r.value_num === 'number');
    if (!all.length) return null;
    const pts = all.filter((r) => inDomain(r.measured_on, t0, t1));
    const lo = Math.min(...all.map((r) => r.value_num));
    const hi = Math.max(...all.map((r) => r.value_num));
    const span = hi - lo || Math.max(Math.abs(hi) * 0.08, 1);
    return { id, def, color: GROUP_COLORS[def.group_key] || GROUP_COLORS.lung, all, pts, lo, hi, span };
  }).filter(Boolean);
}
function chartPrivateStats(pk) {
  const all = metricRecs(pk);
  const visible = filterPrivate(all);
  return { total: all.length, visible: visible.length, excluded: all.length - visible.length, private: privateCount(all) };
}
function chartSVG(t0, t1) {
  const pk = state.profile;
  const list = chartSeriesList(t0, t1).filter((s) => s.pts.length);
  if (!list.length) {
    return `<div class="empty" role="status"><h3>这个时间窗里没有所选化验</h3><p>当前窗口内没有所选指标的数据点。把时间范围切回「全期」就能看到已有记录，或在左侧换几项指标。</p><div class="actions"><button class="chip" data-action="range" data-range="all" aria-pressed="false">回到全期</button></div></div>`;
  }
  const n = list.length;
  const H = CHART_TOP + n * BAND_H + CHART_BOTTOM;
  const plotH = n * BAND_H;
  const yOf = (s, v, top) => top + BAND_PAD + (1 - (v - s.lo) / s.span) * (BAND_H - 2 * BAND_PAD);
  const ticks = monthTicks(t0, t1, CX0, CX1, Math.max(4, Math.min(10, Math.floor((CX1 - CX0) / (n > 3 ? 96 : 84)))));
  const axis = ticks.map((t) => `<line class="axis" x1="${t.x.toFixed(1)}" x2="${t.x.toFixed(1)}" y1="22" y2="27"/><text class="tick" x="${t.x.toFixed(1)}" y="16" text-anchor="middle">${t.label}</text>`).join('');

  /* 发作—缓解区间带：铺在全部条带之下，只作背景层；开关只增删这一层，不改曲线坐标 */
  let epLayer = '';
  if (state.toggles.bands) {
    const eps = filterPrivate(episodesFor(pk)).filter((e) => !(e.ended_on && Date.parse(e.ended_on) < t0) && Date.parse(e.started_on) <= t1);
    const rects = eps.map((e) => {
      const s0 = Math.max(Date.parse(e.started_on), t0);
      const e0 = Math.min(Date.parse(e.ended_on || new Date(t1).toISOString().slice(0, 10)), t1);
      const x1 = xOf(s0, t0, t1), x2 = xOf(Math.max(e0, s0), t0, t1);
      return `<rect class="ep-band" x="${x1.toFixed(1)}" y="${CHART_TOP}" width="${Math.max(x2 - x1, 3).toFixed(1)}" height="${plotH}"/>`;
    }).join('');
    epLayer = rects ? `<text class="ep-label" x="8" y="${CHART_TOP - 10}">发作带</text>${rects}` : '';
  }
  /* 输注段：顶部独立细条层，同样不占曲线坐标 */
  let treatLayer = '';
  if (state.toggles.treat) {
    const segs = filterPrivate(seriesFor(pk)).filter((s) => !(s.ended_on && Date.parse(s.ended_on) < t0) && Date.parse(s.started_on) <= t1)
      .map((s) => {
        const s0 = Math.max(Date.parse(s.started_on), t0);
        const e0 = Math.min(Date.parse(s.ended_on || new Date(t1).toISOString().slice(0, 10)), t1);
        const x1 = xOf(s0, t0, t1), x2 = xOf(Math.max(e0, s0), t0, t1);
        return `<rect class="treat-band" x="${x1.toFixed(1)}" y="64" width="${Math.max(x2 - x1, 5).toFixed(1)}" height="6" rx="3"/>`;
      }).join('');
    treatLayer = segs ? `<text class="treat-label" x="8" y="61">输注段</text>${segs}` : '';
  }

  const bands = list.map((s, i) => {
    const top = CHART_TOP + i * BAND_H;
    const name = String(s.def.name).replace(/（[^）]*）/g, '');
    const shortName = name.length > 8 ? name.slice(0, 8) + '…' : name;
    const last = s.pts[s.pts.length - 1];
    const coords = s.pts.map((r) => ({ x: xOf(Date.parse(r.measured_on), t0, t1), y: yOf(s, r.value_num, top) }));
    const path = s.pts.length > 1 ? `<path class="line" d="${smoothPath(coords)}" stroke="${s.color}"/>` : '';
    const points = coords.map((c, j) => {
      const r = s.pts[j];
      return `<circle class="pt" tabindex="0" role="button" aria-label="${esc(`${r.measured_on} ${r.value_num} ${s.def.unit || ''}，点击查看来源`)}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${j === s.pts.length - 1 ? 5.2 : 4}" fill="${s.color}" data-action="pin" data-id="${s.id}" data-d="${esc(r.measured_on)}"><title>${esc(`${r.measured_on} · ${r.value_num} ${s.def.unit || ''} · ${s.def.name}`)}</title></circle>`;
    }).join('');
    const lx = coords[coords.length - 1].x > CX1 - 46 ? coords[coords.length - 1].x - 8 : coords[coords.length - 1].x + 8;
    const ly = Math.min(top + BAND_H - 6, Math.max(top + 13, coords[coords.length - 1].y));
    const label = `<text class="delta-tag" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${coords[coords.length - 1].x > CX1 - 46 ? 'end' : 'start'}" fill="${s.color}">${last.value_num}${s.def.unit ? ' ' + esc(s.def.unit) : ''}</text>`;
    return `<g class="band" data-band="${s.id}">
      <rect class="band-bg" x="${CX0}" y="${top}" width="${CX1 - CX0}" height="${BAND_H}"/>
      <line class="band-line" x1="${CX0}" x2="${CX1}" y1="${top}" y2="${top}"/>
      <text class="band-name" x="8" y="${(top + BAND_H / 2 - 3).toFixed(1)}" fill="${s.color}" textLength="62" lengthAdjust="spacingAndGlyphs">${esc(shortName)}</text>
      <text class="band-sub" x="8" y="${(top + BAND_H / 2 + 13).toFixed(1)}" textLength="62" lengthAdjust="spacingAndGlyphs">${esc(`${last.value_num}${s.def.unit ? ' ' + s.def.unit : ''} · ${last.measured_on.slice(5)}`)}</text>
      ${path}${points}${label}</g>`;
  }).join('');

  const ps = chartPrivateStats(pk);
  return `<svg class="chart" viewBox="0 0 ${CW} ${H}" role="img" aria-label="所选化验的独立等高条带：${n} 条序列各自按全期最小–最大值归一化，顶部共用时间轴；不同指标不可比">
    ${axis}${treatLayer}${epLayer}${bands}
    <text class="tick" x="${CX0}" y="${H - 32}">每条带按该指标全部记录的最小值–最大值单独归一化，不代表不同指标数值可比；不同方法不合并、不连线；单点只画一个点</text>
    <text class="tick" x="${CX0}" y="${H - 16}">私密 ${ps.private} 条不含${ps.excluded > ps.private ? ` · 另有旧版本 ${ps.excluded - ps.private} 条不含` : ''}（口径同看板 / 导出 / AI 上下文）</text>
  </svg>`;
}

/* ---------------- 泳道（时间线）：五类节点只画不连线 + 发作—缓解区间带 ---------------- */
function laneSVG(t0, t1) {
  const W = 980, H = 250, X0 = 60, X1 = 940;
  const evs = laneEvents(state.profile).filter((e) => inDomain(e.d, t0, t1));
  const eps = episodesFor(state.profile).filter((e) => !(e.ended_on && Date.parse(e.ended_on) < t0) && Date.parse(e.started_on) <= t1);
  const xOfL = (d) => X0 + (Date.parse(d) - t0) / Math.max(1, t1 - t0) * (X1 - X0);
  const bandY = 46, laneY = 168;
  const epRects = eps.map((e) => {
    const s0 = Math.max(Date.parse(e.started_on), t0);
    const e0 = Math.min(Date.parse(e.ended_on || new Date(t1).toISOString().slice(0, 10)), t1);
    const x1 = xOfL(new Date(s0).toISOString().slice(0, 10)), x2 = xOfL(new Date(Math.max(e0, s0)).toISOString().slice(0, 10));
    return `<g><rect class="ep-band" x="${x1.toFixed(1)}" y="${bandY}" width="${Math.max(x2 - x1, 3).toFixed(1)}" height="16" rx="4"/>
      <text class="ep-label" x="${(x1 + 3).toFixed(1)}" y="${bandY - 4}">发作${e.ended_on ? ' → 缓解' : ' → 缓解未记录'}</text></g>`;
  }).join('');
  const shapes = {
    med: (x, y) => `<circle class="ev" cx="${x}" cy="${y}" r="5.5" style="fill:var(--brand)"/>`,
    visit: (x, y) => `<rect class="ev" x="${x - 5}" y="${y - 5}" width="10" height="10" rx="2.5" style="fill:var(--ink-2)"/>`,
    exam: (x, y) => `<path class="ev" d="M ${x} ${y - 6.5} l6 12 h-12 Z" style="fill:var(--ok)"/>`,
    relief: (x, y) => `<path class="ev" d="M ${x} ${y - 6.5} l6 6.5 -6 6.5 -6 -6.5 Z" style="fill:#fff;stroke:var(--ok);stroke-width:2.4"/>`,
    flare: (x, y) => `<path class="ev" d="M ${x} ${y - 7} l7 14 h-14 Z" style="fill:var(--warn)"/>`
  };
  const KIND_LABEL = { med: '用药', visit: '就诊', exam: '检查', relief: '缓解开始', flare: '加重' };
  /* 标签两行错位：节点密的月份防叠字 */
  let lastX = -Infinity, rrow = 0;
  const nodes = evs.map((e) => {
    const x = xOfL(e.d);
    let y = laneY, lab = '';
    if (x - lastX < 16) { rrow = (rrow + 1) % 2; } else { rrow = 0; }
    lastX = x;
    const ly = laneY + 26 + rrow * 12;
    if (e.kind === 'flare' || e.kind === 'relief') lab = `<text class="evlab" x="${x.toFixed(1)}" y="${ly}" text-anchor="middle">${esc(e.d.slice(5))}</text>`;
    return `<g>${shapes[e.kind](x.toFixed(1), y)}${lab}<title>${esc(`${e.d} · ${KIND_LABEL[e.kind]} · ${e.text}`)}</title></g>`;
  }).join('');
  const laneLine = `<line class="lane-line" x1="${X0}" x2="${X1}" y1="${laneY}" y2="${laneY}"/>`;
  const laneLab = `<text class="lane-lab" x="${X0 - 8}" y="${laneY + 4}" text-anchor="end">事件</text>`;
  const bandLab = `<text class="lane-lab" x="${X0 - 8}" y="${bandY + 13}" text-anchor="end">发作带</text>`;
  const ticks = monthTicks(t0, t1, X0, X1);
  const axis = ticks.map((t) => `<line class="axis" x1="${t.x.toFixed(1)}" x2="${t.x.toFixed(1)}" y1="${laneY + 8}" y2="${laneY + 13}"/><text class="tick" x="${t.x.toFixed(1)}" y="${laneY + 26}" text-anchor="middle">${t.label}</text>`).join('');
  const legend = Object.entries(KIND_LABEL).map(([k, lab]) =>
    `<span class="legend-i"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">${shapes[k](7, 7)}</svg>${lab}</span>`).join('');
  return `<svg class="hourlane" viewBox="0 0 ${W} ${H}" role="img" aria-label="时间线：发作—缓解区间带与五类事件节点（用药、就诊、检查、缓解开始、加重），节点只画不连线">
    ${epRects}${bandLab}${axis}${laneLine}${laneLab}${nodes}
  </svg>
  <div class="legend" aria-hidden="true">${legend}</div>`;
}

/* ---------------- 看板 ---------------- */
function vHome() {
  const p = P(), pk = state.profile;
  const lf = lastFlareInfo(pk);
  const f90 = flares90(pk).length;
  const statA = lf.mode === 'open' ? ['当前发作', `发作中第 ${lf.days} 天`, `自 ${lf.ep.started_on} 起 · 缓解未记录`]
    : lf.mode === 'since' ? ['距上次发作', `${lf.days} 天`, `${lf.ep.started_on} → ${lf.ep.ended_on}`]
    : ['发作记录', '暂无', '记一次加重会出现在这里'];
  const notesAll = notesFor(pk).filter((n) => n.kind === 'symptom' || n.kind === 'caregiver');
  const visibleNotes = filterPrivate(notesAll);
  /* 计划卡：私密记录的医生原话不进看板摘要（改写链旧私密原文同样不可见） */
  const notesForDash = filterPrivate(notesFor(pk));
  const cards = MDEFS().filter((d) => recsOfDef(pk, d.id).length).map((d) => mcard(d)).join('');
  const emptyCards = MDEFS().filter((d) => !recsOfDef(pk, d.id).length).map((d) => mcard(d)).join('');
  const lastVisit = visitsFor(pk)[visitsFor(pk).length - 1];
  const qs = notesForDash.filter((n) => n.kind === 'question');
  const plan = notesForDash.find((n) => n.kind === 'doctor_quote' && /行动计划/.test(n.content));
  return `${pageHead(false)}
  ${sceneBar()}
  <section class="hero">
    <div>
      <span class="eyebrow">演示档案 · AAT 缺乏症</span>
      <h1>${esc(p.name)}，这次想先看什么</h1>
      <p>${esc(p.headline)}</p>
      <div class="hero-status"><b>${esc(statA[1])}</b><span>${esc(statA[0])} · ${esc(statA[2])}</span></div>
      ${plan ? `<p class="hero-doc"><b>医生原话</b>：${esc(plan.content.replace(/^呼吸科医生原话（[^）]*，[^）]*）：/, ''))}</p>` : `<p class="hero-doc muted">医生原话未记录；这里不代写——医生说过的话进「家系与基因」的医生原话条目，复诊准备会自动带上。</p>`}
      <div class="chips">${(p.chips || []).map((x) => `<span class="chip on">${esc(x)}</span>`).join('')}</div>
    </div>
    <div class="stat-band">
      <div class="stat-tile"><span>${esc(statA[0])}</span><b>${esc(statA[1])}</b><small>${esc(statA[2])}</small></div>
      <div class="stat-tile"><span>近 90 天发作次数</span><b>${f90}</b><small>由发作记录算出，不手填</small></div>
    </div>
  </section>
  <div class="action-band">
    <div class="action-band-text">${plan ? `<b>急性加重的行动计划（医生原话）</b><span>${esc(plan.content.replace(/^呼吸科医生原话（[^）]*，[^）]*）：/, ''))}</span>` : `<b>接下来可以做的事</b><span>还没有医生确认的行动计划；先把这次的加重和输注记下来，复诊时带上。</span>`}</div>
    <div class="action-band-actions">
      <button data-action="entry" data-kind="flare">记一次加重</button>
      <button class="primary" data-action="go" data-page="review" data-sub="">准备复诊</button>
    </div>
  </div>
  <div class="task-grid">
    <button class="task-entry" data-action="go" data-page="course" data-sub="timeline">${icon('pulse')}<b>看这次发作到哪一步了</b><span>时间线 · 泳道 · 发作列表</span></button>
    <button class="task-entry" data-action="go" data-page="treatment" data-sub="">${icon('drip')}<b>输注记了几次、漏了几周</b><span>按周登记，缺口周如实留空</span></button>
    <button class="task-entry" data-action="go" data-page="review" data-sub="">${icon('calendar')}<b>准备下次复诊</b><span>${lastVisit ? `上次就诊：${esc(lastVisit.visited_on)} ${esc(lastVisit.dept)}` : '就诊记录还没有'}</span></button>
  </div>
  <div class="dash-cols">
    <div>
      <div class="section-title"><h2>最近的化验</h2><span class="muted">轻点卡片翻面看趋势 · ${careValue(pk)[0] || ''}</span></div>
      <div class="metric-grid">${cards}${emptyCards}</div>
    </div>
    <div>
      <div class="card">
        <div class="card-head"><h2>接下来</h2><span class="muted">按医生安排</span></div>
        <div class="rows">
          ${lastVisit ? row(`${esc(lastVisit.dept)} · ${esc(lastVisit.visited_on)}`, esc(lastVisit.purpose)) : row('下一次就诊', '还没有记录')}
          ${(qs[0] ? row('想问医生', esc(qs[0].content)) : '')}
          ${row('记录者', p.record_mode === 'self' ? '本人（家属代记会标注）' : '家属')}
        </div>
        <div class="actions"><button data-action="go" data-page="review" data-sub="">打开复诊准备</button></div>
      </div>
      <div class="card">
        <div class="card-head"><h2>我记下的症状</h2><span class="muted">${privateLabel(visibleNotes.length, privateCount(notesAll))}</span></div>
        <div class="rows">
          ${visibleNotes.slice(0, 3).map((n) => row(esc(fmtDate(n.occurred_on)), esc(n.content), authorTag(n))).join('') || emptyBox('还没有症状记录', '身体反应按发生时间记，不用判断轻重。')}
        </div>
        <div class="actions"><button data-action="go" data-page="mind" data-sub="feel">心理与生活 →</button></div>
      </div>
    </div>
  </div>`;
}

/* ---------------- 病程 ---------------- */
function foldEpisode(e) {
  const open = !e.ended_on;
  const n = e.note_ref != null ? (D.notes || []).find((x) => x.id === e.note_ref) : null;
  const visits = visitsFor(state.profile).filter((v) => e.started_on <= v.visited_on && (!e.ended_on || v.visited_on <= e.ended_on));
  const labs = metricRecs(state.profile).filter((r) => r.measured_on && r.measured_on >= e.started_on && (!e.ended_on || r.measured_on <= e.ended_on));
  const lf = lastFlareInfo(state.profile);
  const dayTxt = open ? `发作中第 ${dayDiff(e.started_on, todayISO()) ?? '—'} 天` : `缓解期第 ${dayDiff(e.ended_on, todayISO()) ?? '—'} 天 · 持续 ${dayDiff(e.started_on, e.ended_on)} 天`;
  const blk = (title, body) => `<section class="pd-block"><h4>${esc(title)}</h4>${body || '<p class="pd-summary">无（本次没有此项记录）</p>'}</section>`;
  return `<details class="phase-fold"${open ? ' open' : ''}>
    <summary><span class="tl-dot${open ? ' open-dot' : ''}"></span>
      <b class="ph-name">${esc(e.title)}</b>
      <span class="ph-date">${esc(e.started_on)} → ${esc(fmtDate(e.ended_on))}</span>
      <span class="ph-brief">${esc(dayTxt)}</span>
      <span class="ph-hint">展开细节 ▸</span></summary>
    <div class="phase-detail">
      ${blk('当次处理（医生原话）', n ? `<p class="pd-summary">${esc(n.content)}</p>` : '')}
      ${blk('就诊', visits.map((v) => `<div class="pd-row"><em>${esc(v.visited_on)}</em><span>${esc(v.dept)} · ${esc(v.purpose)}</span></div>`).join(''))}
      ${blk('发作窗口内的化验', labs.map((r) => { const def = (D.metric_defs || []).find((x) => x.id === r.metric_id); return `<div class="pd-row"><em>${esc(r.measured_on)}</em><span>${esc(def ? def.name : '化验')}${r.value_num != null ? '：' + r.value_num + ' ' + esc(def.unit || '') : ''}</span></div>`; }).join(''))}
      ${blk('影像', '<p class="pd-summary">无（本次没有影像记录）</p>')}
      ${blk('支持措施', '<p class="pd-summary">按医生与护士当时的安排记录；原型内先留位。</p>')}
    </div></details>`;
}
function vCourse() {
  const pk = state.profile;
  const sub = state.sub.course || 'timeline';
  const [t0, t1] = chartDomain();
  if (sub === 'list') {
    const eps = episodesFor(pk).slice().reverse();
    return `${pageHead(true)}
    <div class="notice">折叠单元 = 一次发作；打印时全部展开。只记「哪天开始、哪天缓解、医生说了什么」，不做轻重排序。</div>
    ${eps.length ? `<div class="fold-line">${eps.map(foldEpisode).join('')}</div>` : emptyBox('还没有发作记录', '记下第一次加重，时间线会从这里开始画。', '<button data-action="entry" data-kind="flare">记一次加重</button>')}`;
  }
  const eps = episodesFor(pk);
  return `${pageHead(true)}
  <div class="notice">时间线：发作—缓解区间带 + 事件泳道（用药 / 就诊 / 检查 / 缓解开始 / 加重五类节点，只画不连线）。</div>
  ${eps.length ? `<div class="chart-panel"><div class="ep-band-strip">${laneSVG(t0, t1)}</div></div>` : emptyBox('时间线还是空的', '有发作或化验记录后，泳道会自动出现。')}
  <div class="card" style="margin-top:14px"><div class="card-head"><h2>发作与缓解（${eps.length}）</h2><span class="muted">近 90 天 ${flares90(pk).length} 次</span></div>
    <div class="rows">${eps.slice().reverse().map((e) => row(esc(e.title), `${esc(e.started_on)} → ${esc(fmtDate(e.ended_on))}${e.ended_on ? ' · 持续 ' + dayDiff(e.started_on, e.ended_on) + ' 天' : ' · 缓解未记录'}`, pill(e.ended_on ? '已缓解' : '发作中', e.ended_on ? 'green' : 'yellow'))).join('')}</div>
    <div class="actions"><button data-action="sub" data-view="course" data-sub="list">打开发作列表 →</button></div></div>`;
}

/* 更正链历史版本（只读）：旧版本 in_use=0、corrected_by 指向新版本，保留可查。
 * 本区块只展示旧值 / 日期 / 更正说明，不提供任何删除或覆盖入口；
 * 三出口（看板 / 导出 / AI 上下文）仍按 filterPrivate 口径只出现现行版本。 */
function historyVersions(pk) {
  const all = (D.metric_records || []).filter((r) => r.profile_key === pk && r.in_use === 0 && r.corrected_by);
  if (!all.length) return '';
  const findRec = (id) => (D.metric_records || []).find((r) => r.id === id);
  const lines = all.map((old) => {
    const neu = findRec(old.corrected_by);
    const def = (D.metric_defs || []).find((d) => d.id === old.metric_id);
    const unit = def && def.unit ? ' ' + def.unit : '';
    const val = (r) => (r.value_num != null ? r.value_num + unit : (r.value_text || '文本记录'));
    return row(`${esc(def ? def.name : '指标')} · ${esc(fmtDate(old.measured_on))}`,
      `旧值：${esc(val(old))} → 已由新版本更正${neu ? `为 ${esc(val(neu))}（${esc(fmtDate(neu.measured_on))}）` : ''}。更正说明：人工核对原件后发现抄录有误，以新版本为准；旧版本保留（in_use=0），不覆盖、不删除。`,
      pill('旧版本 · 只读', 'grey'));
  }).join('');
  return `<div class="card" style="margin-top:14px"><div class="card-head"><h2>历史版本（更正链 · 只读）</h2><span class="muted">旧版本保留可查；无删除 / 覆盖入口</span></div>
    <div class="rows">${lines}</div></div>`;
}

/* ---------------- 记录与报告（五 Tab） ---------------- */
function docsTable() {
  const pk = state.profile;
  const q = (state.query || '').trim();
  const docs = rows('doc_refs', pk).map((d) => ({ id: 'd' + d.id, name: d.title, date: fmtDate(d.created_at), type: d.kind === 'original' ? '原件' : d.kind === 'copy' ? '翻拍 / 复印' : '二手', note: d.note, ref: d.ref }));
  const rpts = rows('reports', pk).map((r) => ({ id: r.id, name: r.title, date: fmtDate(r.report_date), type: r.file_ref ? '报告 · 有原件' : '报告 · 未取得原件', note: r.org, ref: r.file_ref }));
  const all = [...docs, ...rpts, ...state.mem.docs].filter((d) => !q || `${d.name} ${d.type}`.includes(q));
  if (!all.length) return emptyBox('没有匹配的资料', '换个关键词，或先登记一份报告。');
  return `<div class="table-wrap"><table><thead><tr><th>文件 / 报告</th><th>日期</th><th>类型</th><th>说明</th><th></th></tr></thead><tbody>
    ${all.map((d) => `<tr><td><b>${esc(d.name)}</b></td><td>${esc(d.date)}</td><td>${esc(d.type)}</td><td>${esc(d.note || '—')}</td>
      <td><button class="text-button" data-action="source" data-name="${esc(d.name)}" data-ref="${esc(d.ref || '')}">原件在哪</button></td></tr>`).join('')}
  </tbody></table></div><div class="scroll-hint">左右滑动查看表格</div>`;
}
function vRecords() {
  const pk = state.profile;
  const sub = state.sub.records || 'lib';
  if (sub === 'lib') {
    return `${pageHead(true)}
    <div class="notice">上传 → 解析 → 核对 → 入档；<b>原件永远保留</b>，接受之前都只是候选。没拿到原件的报告如实标「未取得原件」。</div>
    <div class="toolbar">
      <input type="search" placeholder="搜索文件名或类型" data-action="records-search" value="${esc(state.query)}" aria-label="搜索资料">
      <button data-action="toast" data-msg="已接住 1 份文件（演示）：原件保留在资料目录，解析结果会先进候选">上传报告</button>
      <button data-action="toast" data-msg="载入一份模拟报告（演示）：解析完成，候选已放入「整理草稿 · 核对」">载入一份模拟报告</button>
    </div>
    <div class="card"><div class="card-head"><h2>资料库</h2><span class="muted">${rows('doc_refs', pk).length + rows('reports', pk).length} 份 · 原件不改动</span></div><div id="docs-table">${docsTable()}</div></div>`;
  }
  if (sub === 'draft') {
    const cands = rows('ai_candidates', pk);
    const pending = cands.filter((c) => c.status === 'pending');
    const accepted = cands.filter((c) => c.status === 'accepted');
    return `${pageHead(true)}
    <div class="notice">核对 = 逐字检查转录，<b>不等于医学审核</b>；没把握就保留「待核对」，不会丢。拒收零副作用，不写事实层。</div>
    <div class="card"><div class="card-head"><h2>待核对（${pending.length}）</h2></div>
      <div class="rows">${pending.length ? pending.map((c) => row(esc(c.target_table === 'notes' ? '记录候选' : '指标候选'), esc(JSON.stringify(c.payload)), `<button data-action="candidate" data-id="${c.id}">核对这一项</button>`)).join('') : emptyBox('没有待核对内容', '解析出的字段都核对完了。')}</div>
    </div>
    <div class="card"><div class="card-head"><h2>已接受（${accepted.length}）</h2><span class="muted">保留来源，可回溯</span></div>
      <div class="rows">${accepted.map((c) => row(esc(c.target_table === 'notes' ? '记录候选' : '指标候选'), esc(JSON.stringify(c.payload)), pill('已接受', 'green'))).join('') || '<p class="muted" style="padding:12px">还没有已接受的记录。</p>'}</div>
    </div>`;
  }
  if (sub === 'archive') {
    const p = P(), pk2 = state.profile;
    const quotes = notesFor(pk2).filter((n) => n.kind === 'doctor_quote');
    return `${pageHead(true)}<div class="grid two">
      <div class="card"><div class="card-head"><h2>受累器官档案</h2><span class="muted">只抄医生记录，结论以医生为准</span></div>
        <div class="rows">
          ${row('肺（呼吸科）', (() => { const f = recsOfDef(pk2, (MDEFS().find((d) => d.key === (pk2 === 'A' ? 'fev1_a' : 'fev1_b1')) || {}).id); const l = f[f.length - 1]; return l ? `最近肺功能：${l.value_num ?? '—'} %（${fmtDate(l.measured_on)}）；原文见「检查与指标」` : '还没有肺功能记录（未检测不等于阴性）'; })())}
          ${row('肝（肝病科）', (() => { const q2 = notesFor(pk2).find((n) => n.kind === 'doctor_quote' && /肝/.test(n.content)); return q2 ? esc(q2.content).slice(0, 60) + '…' : '还没有肝功能记录（未检测不等于阴性）'; })())}
          ${row('记录者', p.record_mode === 'self' ? '本人（家属代记逐条标注）' : '家属')}
        </div></div>
      <div class="card"><div class="card-head"><h2>医生原话时间线</h2><span class="muted">原话照抄，工作台不加解释</span></div>
        <div class="rows">${quotes.map((n) => row(esc(fmtDate(n.occurred_on)), esc(n.content))).join('') || '<p class="muted" style="padding:12px">还没有医生原话。</p>'}</div></div>
    </div>`;
  }
  if (sub === 'panel') {
    const defs = MDEFS();
    return `${pageHead(true)}<div class="notice">「不同方法不合并」：可比组不同的同名化验各占一行，不做差、不连线。</div>
    <div class="card"><div class="card-head"><h2>指标检测（${defs.length}）</h2><span class="muted">缺的行如实空着</span></div>
      <div class="table-wrap"><table><thead><tr><th>指标</th><th>最近值</th><th>日期</th><th>来源</th><th>可比组</th></tr></thead><tbody>
      ${defs.map((d) => { const rs = recsOfDef(pk, d.id); const l = rs[rs.length - 1]; return `<tr><td>${esc(d.name)}</td>
        <td>${l ? esc(l.value_num != null ? `${l.value_num} ${d.unit || ''}` : (l.value_text || '文本记录')) : '<span class="muted">暂无记录</span>'}</td>
        <td>${l ? esc(fmtDate(l.measured_on)) : '—'}</td><td>${l ? esc(l.source_kind === 'report' ? '报告' : '手工') : '—'}</td><td>${esc(d.comparable_key)}</td></tr>`; }).join('')}
      </tbody></table></div><div class="scroll-hint">左右滑动查看表格</div></div>
    ${historyVersions(pk)}`;
  }
  /* 病情汇总：内容超过 1.5 屏 → 开整页视图 #page=summary */
  return `${pageHead(true)}
  <div class="card"><div class="card-head"><h2>病情汇总</h2><span class="muted">整页视图 · 打印或导出都从这里走</span></div>
    <div class="rows">
      ${row('这份汇总里有什么', '受累器官行、化验最近值、发作—缓解区间、输注计次、医生原话与想问清单（私密条目默认排除）。')}
      ${row('私密策略', privateLabel(notesFor(pk).length + rows('family_lines', pk).length, privateCount(notesFor(pk)) + privateCount(rows('family_lines', pk))))}
    </div>
    <div class="actions"><button class="primary" data-action="open-page" data-page="summary">打开病情汇总整页 →</button>${aiBtn('records')}</div></div>`;
}

/* ---------------- 检查与指标 ---------------- */
function metricSections() {
  const pk = state.profile;
  return ['lung', 'liver'].map((g) => {
    const items = MDEFS().filter((d) => d.group_key === g);
    if (!items.length) return '';
    const title = sectionTitle(pk, g);
    return `<div class="metric-group"><div class="metric-group-head"><h3>${esc(title)}</h3><span>${items.length} 项 · 组内可比</span></div>
      <div class="metric-grid">${items.map((d) => mcard(d)).join('')}</div></div>`;
  }).join('');
}
function vLabs() {
  const pk = state.profile;
  const rpts = rows('reports', pk);
  return `${pageHead(true)}
  <div class="notice">「仅回顾，不解读」·「解读归医生」·「不同方法不合并」——三句常驻：这里只抄数值、方法与日期，不做参考范围的自动判定，阈值一律【待核】。</div>
  ${metricSections()}
  <div class="section-title"><h2>最近报告</h2><span class="muted">同一报告的值与方法一一对应</span></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>报告</th><th>日期</th><th>机构</th><th>原件</th><th>要点（原文摘录）</th></tr></thead><tbody>
    ${rpts.length ? rpts.map((r) => `<tr><td><b>${esc(r.title)}</b>${r.is_private ? ' ' + pill('私密', 'grey') : ''}</td><td>${esc(fmtDate(r.report_date))}</td><td>${esc(r.org)}</td>
      <td>${r.file_ref ? esc(r.file_ref) : '<span class="muted">未取得原件</span>'}</td><td>${esc(r.summary_text || '—')}</td></tr>`).join('') : `<tr><td colspan="5">${emptyBox('还没有报告', '化验单或报告登记进来会出现在这里。')}</td></tr>`}
  </tbody></table></div><div class="scroll-hint">左右滑动查看表格</div></div>`;
}

/* ---------------- 病情一图秀 ---------------- */
function vChart() {
  const pk = state.profile;
  window.__vChartRange = String(state.range);
  const [t0, t1] = chartDomain();
  const ps = chartPrivateStats(pk);
  const groupLabel = { lung: '肺功能与血清 AAT', liver: '肝功能', body: '体重' };
  const groups = ['lung','liver','body'].map((g) => {
    const items = MDEFS().filter((d) => d.group_key === g);
    if (!items.length) return '';
    return `<div class="rail-group"><span class="rail-group-title">${esc(groupLabel[g] || sectionTitle(pk, g))}</span>
      ${items.map((d) => {
        const nums = filterPrivate(recsOfDef(pk, d.id)).filter((r) => typeof r.value_num === 'number');
        const last = nums[nums.length - 1];
        const disabled = !last;
        const checked = state.sel[pk].includes(d.id) && !disabled;
        return `<label class="metric-pick${disabled ? ' disabled' : ''}"><input type="checkbox" data-sel="${d.id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><i style="background:${GROUP_COLORS[g] || GROUP_COLORS.lung}"></i><span class="mp-name" title="${esc(d.name)}">${esc(d.name)}</span><small class="mp-last">${last ? `${last.value_num}${d.unit ? ' ' + esc(d.unit) : ''}` : '无记录'}</small></label>`;
      }).join('')}</div>`;
  }).join('');
  const picked = state.sel[pk].filter((id) => {
    const def = MDEFS().find((d) => d.id === id);
    return def && filterPrivate(recsOfDef(pk, def.id)).some((r) => typeof r.value_num === 'number');
  }).length;
  return `${pageHead(true)}
  <div class="notice">「仅回顾，不解读」「解读归医生」——每条数值线按该指标全期最小值–最大值归一化，<b>线的高低不能跨指标比较</b>；「不同方法不合并」（可比组不同的线各自独立、断开）。</div>
  <div class="overview">
    <aside class="chart-rail" aria-label="一图秀筛选项">
      <section><h3>时间范围</h3><div class="chips">
        ${[['3m', '近 3 月'], ['6m', '近 6 月'], ['12m', '近 12 月'], ['all', '全部']].map(([k, l]) => `<button class="chip" data-action="range" data-range="${k}" aria-pressed="${state.range === k}">${l}</button>`).join('')}
      </div></section>
      <section><h3>选择指标 <span class="muted">最多 4 项</span></h3>${groups}</section>
      <section><h3>显示内容</h3><div class="chips">
        <label class="chip toggle-chip" data-action="ctoggle" data-toggle="bands"><input type="checkbox" ${state.toggles.bands ? 'checked' : ''}><span>发作—缓解带</span></label>
        <label class="chip toggle-chip" data-action="ctoggle" data-toggle="treat"><input type="checkbox" ${state.toggles.treat ? 'checked' : ''}><span>输注段</span></label>
      </div></section>
      <p class="rail-note">私密 ${ps.private} 条不含${ps.excluded > ps.private ? ` · 旧版本 ${ps.excluded - ps.private} 条不含` : ''}；点图上的数据点可查看原始报告/记录来源。</p>
    </aside>
    <div class="chart-main">
      <div class="chart-panel">
        <div class="chart-top"><div><h2>病程时间轴</h2>
          <p class="small-note">${picked} 条独立等高条带 · 各自按全期范围归一化 · 只呈现已核对记录</p></div>
          <div class="actions">${pill(`${picked} 个指标`, 'brand')}${pill('仅已核对记录', 'green')}</div></div>
        <div class="chart-wrap">${chartSVG(t0, t1)}</div>
        <div class="chart-tip">点图上的任意数据点，右侧浮窗显示那次的日期、值、单位、来源与可比组。</div>
      </div>
    </div>
  </div>`;
}

/* ---------------- 输注与治疗 ---------------- */
function foldSeries(s) {
  const st = infusionStats(state.profile, s);
  const dates = rows('med_events', state.profile).filter((m) => m.series_id === s.id && m.occurred_on).map((m) => m.occurred_on).sort();
  return `<details class="phase-fold">
    <summary><span class="tl-dot"></span>
      <b class="ph-name">${esc(s.label)}</b>
      <span class="ph-date">${esc(s.started_on)} → ${esc(fmtDate(s.ended_on))}</span>
      <span class="ph-brief">已记 ${st.count} 次${st.gaps.length ? ` · 缺口周 ${st.gaps.length} 个` : ''}</span>
      <span class="ph-hint">展开细节 ▸</span></summary>
    <div class="phase-detail">
      <section class="pd-block"><h4>频次口径（医生原话）</h4><p class="pd-summary">${esc(s.cadence_note || '未记录频次说明')}</p></section>
      <section class="pd-block"><h4>计次（由记录现算）</h4><p class="pd-summary">${st.count} 次 · 最近一次 ${esc(fmtDate(st.last))}；计次不落库，随时可对账。</p></section>
      <section class="pd-block"><h4>按次记录</h4>${dates.map((d) => `<div class="pd-row"><em>${esc(d)}</em><span>输注一次</span></div>`).join('')}</section>
      <section class="pd-block"><h4>缺口周（如实留空，不补记）</h4>${st.gaps.length ? st.gaps.map((g) => `<div class="pd-row"><em>${esc(g)}</em><span>当周没有输注记录</span></div>`).join('') : '<p class="pd-summary">无缺口</p>'}</section>
    </div></details>`;
}
function foldMed(m) {
  return `<details class="phase-fold">
    <summary><span class="tl-dot" style="background:var(--ok)"></span>
      <b class="ph-name">一次调药</b>
      <span class="ph-date">${esc(fmtDate(m.occurred_on))}</span>
      <span class="ph-brief">${esc(m.label)}</span>
      <span class="ph-hint">展开细节 ▸</span></summary>
    <div class="phase-detail">
      <section class="pd-block"><h4>医嘱原文</h4><p class="pd-summary">${esc(m.label)}</p></section>
      <section class="pd-block"><h4>记录与来源</h4><p class="pd-summary">记录者：${esc(m.source_kind === 'report' ? '来自报告转写' : '手工登记')} · 日期 ${esc(fmtDate(m.occurred_on))}；剂量调整请以医嘱为准。</p></section>
    </div></details>`;
}
function vTreatment() {
  const pk = state.profile;
  const ss = seriesFor(pk);
  const meds = rows('med_events', pk).filter((m) => m.kind === 'medication');
  const total = ss.reduce((n, s) => n + infusionStats(pk, s).count, 0);
  const gaps = ss.reduce((n, s) => n + infusionStats(pk, s).gaps.length, 0);
  return `${pageHead(true)}
  <div class="notice">输注按周登记、按次计次（计次由记录现算，不落库）；<b>漏了哪一周就空着哪一周</b>，缺口不补记、不圆场。</div>
  <div class="grid three" style="margin-bottom:14px">
    <div class="card"><span class="eyebrow">输注段</span><div style="font-size:24px;font-weight:600;margin-top:4px">${ss.length} 段</div><p class="small-note">每段 = 一段连续安排的每周输注</p></div>
    <div class="card"><span class="eyebrow">按次累计</span><div style="font-size:24px;font-weight:600;margin-top:4px">${total} 次</div><p class="small-note">由 med_events 逐条相加，可对账</p></div>
    <div class="card"><span class="eyebrow">缺口周</span><div style="font-size:24px;font-weight:600;margin-top:4px">${gaps} 个</div><p class="small-note">如实留空；是否需要处理听医生的</p></div>
  </div>
  ${ss.length ? `<div class="section-title"><h2>${esc(sectionTitle(pk, 'treatment'))}</h2><span class="muted">折叠单元 = 一段输注 / 一次调药 · 打印时全部展开</span></div>
  <div class="fold-line">${ss.map(foldSeries).join('')}</div>`
    : emptyBox('还没有输注段记录', '如果医生安排了每周输注，第一段会在这里建档；在那之前，这里如实空着。', '<button data-action="entry" data-kind="infusion">记一次输注</button>')}
  <div class="section-title"><h2>用药清单</h2><span class="muted">长期维持 / 急性期按需 分组列清单，不编序号</span></div>
  <div class="grid two">
    <div class="card"><div class="card-head"><h2>长期维持</h2></div>
      <div class="rows">${meds.filter((m) => !/按需/.test(m.label)).map((m) => row(esc(m.label), `开始：${esc(fmtDate(m.occurred_on))}`)).join('') || '<p class="muted" style="padding:12px">还没有记录。</p>'}</div></div>
    <div class="card"><div class="card-head"><h2>急性期按需</h2></div>
      <div class="rows">${meds.filter((m) => /按需/.test(m.label)).map((m) => row(esc(m.label), `开始：${esc(fmtDate(m.occurred_on))}`)).join('') || '<p class="muted" style="padding:12px">还没有记录。</p>'}</div></div>
  </div>
  ${meds.length ? `<div class="section-title"><h2>调药记录（折叠卡）</h2></div><div class="fold-line">${meds.map(foldMed).join('')}</div>` : ''}`;
}

/* ---------------- 家系与基因 ---------------- */
function vFamily() {
  const pk = state.profile;
  const fl = rows('family_lines', pk);
  const items = Array.from(new Set(fl.map((f) => f.item_fact).filter(Boolean)));
  return `${pageHead(true)}
  <div class="notice">这一页只放<b>医生已说的话与筛查条目原文</b>；不判定任何家族成员的风险，「要不要查」由每个人自己决定。家系线索涉及他人健康信息，默认私密（不进导出、看板摘要与 AI 上下文）。</div>
  <div class="grid two">
    <div class="card"><div class="card-head"><h2>基因型—临床表型解释卡</h2><span class="muted">解释不是判断</span></div>
      <div class="rows">
        ${row('报告原文', '基因分型报告只存原文（见「记录与报告 · 资料库」），界面不做重判读。')}
        ${row('血清 AAT 浓度', '只对血清学方法有意义；不同方法不合并。')}
        ${row('未检测', '未检测不等于阴性；没查过的项目显式空着。')}
      </div></div>
    <div class="card"><div class="card-head"><h2>筛查条目清单（${items.length}）</h2><span class="muted">来自医生原话，条目事实</span></div>
      <div class="rows">${items.map((i) => row(esc(i), '是否做、什么时候做，由本人与医生决定')).join('') || '<p class="muted" style="padding:12px">还没有条目。</p>'}</div></div>
  </div>
  <div class="section-title"><h2>${esc(sectionTitle(pk, 'family'))}</h2><span class="muted">${privateLabel(fl.length, privateCount(fl))} · 页内默认脱敏，展开才显示原话全文</span></div>
  ${state.privateOpen ? '' : privateGate('家系线索（含医生原话）', fl.length, privateCount(fl))}
  ${state.privateOpen ? `<div class="card private"><div class="card-head"><h2>医生原话（含私密，仅本页展开）</h2>${pill('私密 · 不进导出', 'grey')}</div>
  <div class="rows">
    ${fl.map((f) => row(`${esc(f.person_rel)} · ${esc(fmtDate(f.happened_on))}`, esc(f.doctor_quote), pill('私密 · 默认', 'grey'))).join('') || emptyBox('还没有家系线索', '医生谈到家族筛查时，把原话记在这里。')}
  </div>
  <div class="notice" style="margin-top:10px">展开只影响本页显示；这些原话依旧不进导出、不进看板摘要、不进 AI 上下文。</div>
  <div class="actions"><button data-action="toggle-private">收起</button></div></div>`
    : `<div class="card"><div class="card-head"><h2>医生原话（脱敏态）</h2><span class="muted">只显示条目数，不显示原文</span></div>
      <div class="rows">
        ${row('医生原话条目', `${fl.length} 条（涉及他人健康信息；点上方「本人确认，展开查看」后才显示全文）`)}
        ${row('筛查条目事实', `${items.length} 类（见上方清单，不涉及原话）`)}
      </div></div>`}
  <div class="actions" style="margin-top:12px"><button data-action="entry" data-kind="family">记录一条医生原话</button>${aiBtn('family')}</div>`;
}

/* ---------------- 心理与生活 ---------------- */
function privateGate(what, n, pn) {
  if (state.privateOpen) return '';
  return `<div class="notice"><b>${esc(what)}默认私密。</b>不进导出、不进看板摘要、不进 AI 上下文（三出口共用同一过滤函数）；页内 ${n} 条中私密 ${pn} 条。点下面的按钮才会在本页展开。</div>
    <div class="actions"><button data-action="toggle-private">本人确认，展开查看</button></div>`;
}
function feelRow(n) {
  return row(esc(fmtDate(n.occurred_on)), esc(n.content), `${authorTag(n)}${n.is_private ? pill('私密', 'grey') : ''}`);
}
function vMind() {
  const pk = state.profile;
  const sub = state.sub.mind || 'feel';
  if (sub === 'life') {
    const burden = notesFor(pk).filter((n) => n.kind === 'caregiver');
    const visible = filterPrivate(burden);
    return `${pageHead(true)}
    <div class="notice">照护者自己的记录位：「还能正常上班吗」「家里谁顶夜班」在这里承接；代记的记录逐条标注记录者。${privateLabel(burden.length, privateCount(burden))}</div>
    <div class="card"><div class="card-head"><h2>生活与负担</h2><span class="muted">只记事实，不给方法建议</span></div>
      <div class="rows">${visible.map((n) => feelRow(n)).join('') || '<p class="muted" style="padding:12px">还没有照护记录。</p>'}</div>
      <div class="actions"><button data-action="entry" data-kind="feel">记一条照护记录</button>${aiBtn('mind')}</div></div>
    <div class="card" style="margin-top:14px"><div class="card-head"><h2>长期话题（只提供记录位）</h2></div>
      <div class="rows">
        ${row('戒烟支持', '医生提过的支持方式照抄记录；这里不推荐产品或课程。')}
        ${row('随访节律负担', '两个科室的复查节奏、路程与请假，按实际记。')}
        ${row('想找人说话时', '问主诊医生能不能转介心理支持；只听不说是可以的。')}
      </div></div>`;
  }
  const feels = notesFor(pk).filter((n) => n.kind === 'symptom' || n.kind === 'caregiver');
  const visible = filterPrivate(feels);
  return `${pageHead(true)}
  ${privateGate('这一页的内容', feels.length, privateCount(feels))}
  ${state.privateOpen ? `<div class="card private"><div class="card-head"><h2>当下感受（含私密）</h2>${pill('私密 · 不进导出', 'grey')}</div>
    <div class="rows">${feels.map(feelRow).join('')}</div>
    <div class="notice" style="margin-top:10px">这里的内容不会被复制进「和 AI 讨论」的上下文，也不会出现在导出里。</div>
    <div class="actions"><button data-action="toggle-private">收起</button></div></div>`
    : `<div class="card"><div class="card-head"><h2>当下感受（双主体）</h2><span class="muted">${privateLabel(visible.length, privateCount(feels))}</span></div>
    <div class="rows">${visible.map(feelRow).join('') || emptyBox('还没有感受记录', '反复出现的念头、复查前的紧张，都可以按日期记一条。')}</div>
    <div class="actions"><button data-action="entry" data-kind="feel">记一条今天的感受</button>${aiBtn('mind')}</div></div>`}
  <div class="card" style="margin-top:14px"><div class="card-head"><h2>常见的几种反应</h2><span class="muted">不是医生结论</span></div>
    <div class="rows">
      ${row('反复出现的念头', '「要是早点……会不会不一样」——这类念头反复出现是常见的，不必当成倒退。')}
      ${row('复查前紧张', '可以提前把想问的写下来，减少在诊室的慌乱。')}
      ${row('不想解释', '可以只告诉家人「今天不想聊」，不需要理由。')}
    </div></div>`;
}

/* ---------------- 临床研究线索（35 号四段；无匹配指数与判读列） ---------------- */
/* 登记摘录唯一源：demo/demo-data.js 的 trial_demo（DEMO_DATA.trial_demo），app.js 不写死数据 */
const TRIAL_DEMO = D.trial_demo || [];
function trialFacts(pk) {
  const facts = [];
  const gq = notesFor(pk).find((n) => n.kind === 'doctor_quote' && /基因|浓度/.test(n.content));
  if (gq) facts.push(`基因 / 浓度原话：${gq.content.slice(0, 60)}…`);
  const lung = recsOfDef(pk, (MDEFS().find((d) => /fev1/.test(d.key)) || {}).id);
  if (lung.length) facts.push(`肺功能最近一次：${lung[lung.length - 1].measured_on}`);
  const inf = seriesFor(pk);
  if (inf.length) facts.push(`输注段 ${inf.length} 段（进行中 ${inf.filter((s) => !s.ended_on).length} 段）`);
  const liver = notesFor(pk).find((n) => n.kind === 'doctor_quote' && /肝/.test(n.content));
  if (liver) facts.push(`肝病科原话：${liver.content.slice(0, 50)}…`);
  return facts;
}
function vNutrition() {
  const pk = state.profile;
  const wDef = MDEFS().find((d) => d.key && d.key.startsWith('weight'));
  const ws = wDef ? recsOfDef(pk, wDef.id).filter((r) => typeof r.value_num === 'number') : [];
  const last = ws[ws.length - 1], prev = ws[ws.length - 2];
  const diff = last && prev ? Math.round((last.value_num - prev.value_num) * 10) / 10 : null;
  const notes = filterPrivate(notesFor(pk).filter((n) => n.kind === 'symptom' || n.kind === 'caregiver'));
  const visits = visitsFor(pk);
  return `${pageHead(false)}
  <div class="notice plain">「仅回顾，不解读」：体重与进食只按记录回看；<b>怎么吃、要不要补充，归营养师与医生判断</b>。「不同秤/不同时间称重不合并比较」——同一可比组内才做「较上次」。</div>
  <div class="grid two" style="margin-top:14px">
    <div class="card"><div class="card-head"><h2>当下困扰</h2><span class="muted">${privateLabel(notes.length + 1, 0)}</span></div>
      <div class="rows">
        ${notes.length ? notes.slice(-3).map((n) => row(esc(n.content), `${esc(fmtDate(n.occurred_on))} · ${n.author_role === 'family' ? '家属代记' : '本人'}`)).join('') : row('还没有记录', '食欲、吞咽、饭后胀这些感受都可以记一条')}
      </div>
      <div class="actions"><button data-action="entry" data-kind="feel">记一条今天的感受</button>${aiBtn('nutrition')}</div></div>
    <div class="card"><div class="card-head"><h2>体重（家用秤）</h2><span class="muted">单位形态【待核】· 不做判读</span></div>
      <div class="rows">
        ${last ? row('最近一次', `${last.value_num} kg · ${esc(fmtDate(last.measured_on))} · ${esc(wDef.comparable_key)}`) : row('最近一次', '还没有体重记录（未检测不等于异常）')}
        ${last ? row('较上次', diff === null ? '只有 1 条记录，不做差' : `${diff > 0 ? '+' : ''}${diff} kg（不同秤/不同时间不合并）`) : ''}
        ${row('记录次数', `${ws.length} 次 · 只按记录次数计，不评价增减快慢`)}
      </div>
      <div class="actions"><button data-action="entry" data-kind="weight">记一次体重</button></div></div>
  </div>
  <div class="card" style="margin-top:14px"><div class="card-head"><h2>复查节律</h2><span class="muted">按医生安排，不自动生成提醒</span></div>
    <div class="rows">
      ${visits.length ? visits.slice(-3).map((v) => row(`${esc(v.dept)} · ${esc(fmtDate(v.visited_on))}`, esc(v.purpose || ''))).join('') : row('就诊记录', '还没有记录；第一次复诊后从「复诊准备」记一条')}
      ${row('下一次复查', '以医生给的时间为准；本台不推算、不提醒"该去了"')}
    </div>
    <div class="actions"><button data-action="go" data-page="review" data-sub="">打开复诊准备</button></div></div>`;
}

/* ---------------- 临床研究线索 · 三子页（匹配 / 检索 / 收藏与跟踪） ----------------
 * 口径：采集只搬登记的结构化字段；匹配只对照「登记字段 × 已确认档案事实」，
 * 百分数只在渲染层算，不写进 DEMO_DATA、不设任何入组判定字段。
 * 干预/药物名称只作标签，不进分母；入排原文与最终资格以研究中心答复为准。 */
const TRIAL_SNAPSHOT_TOTAL = 147; /* research/aatd/trials.jsonl 全量条数（快照 2026-11-04） */
const TRIAL_SAVED_STATES = ['在跟', '准备问', '已归档'];
const TRIAL_STATUS = {
  RECRUITING: ['招募中', 'green'],
  ENROLLING_BY_INVITATION: ['仅邀请入组', 'yellow'],
  NOT_YET_RECRUITING: ['尚未招募', 'yellow'],
  ACTIVE_NOT_RECRUITING: ['进行中 · 已停止招募', 'grey'],
  COMPLETED: ['已完成', 'grey'],
  TERMINATED: ['已终止', 'red'],
  WITHDRAWN: ['已撤回', 'red'],
  SUSPENDED: ['已暂停', 'yellow'],
  NO_LONGER_AVAILABLE: ['不再提供', 'red'],
  UNKNOWN: ['状态未知', 'grey']
};
const TRIAL_STUDY = { INTERVENTIONAL: '干预性', OBSERVATIONAL: '观察性', EXPANDED_ACCESS: '扩展可及' };
const TRIAL_ORGAN_LABEL = { lung: '肺', liver: '肝' };

function trialStatusMeta(status) {
  const hit = TRIAL_STATUS[status];
  return hit ? { text: hit[0], tone: hit[1] } : { text: status || '状态未知', tone: 'grey' };
}
function trialStudyLabel(studyType) { return TRIAL_STUDY[studyType] || studyType || '未提供'; }
function trialById(key) { return TRIAL_DEMO.find((t) => t.id === key || t.nct === key); }
function trialLastDate(trial) {
  const ds = (trial.dates || []).filter(Boolean).slice().sort();
  const d = ds[ds.length - 1] || '';
  if (!d) return '';
  return /^\d{4}-\d{2}$/.test(d) ? `${d}-01` : d;
}
function trialIntervention(trial) { return String(trial.intervention || '').trim(); }
/* 只从登记标题识别「关注器官」，不猜入排原文；识别不到就如实返回空 */
function trialOrgans(trial) {
  const title = String(trial.title || '');
  const out = [];
  if (/pulmonary|emphysema|lung|respirat|airway|spirom/i.test(title)) out.push('lung');
  if (/liver|hepat|cirrhos/i.test(title)) out.push('liver');
  return out;
}
function profileOrgans(record) {
  const out = [];
  (record.followupDepts || []).forEach((d) => {
    if (/呼吸/.test(d) && !out.includes('lung')) out.push('lung');
    if (/肝|消化/.test(d) && !out.includes('liver')) out.push('liver');
  });
  return out;
}
/* 档案事实：只取已确认入库（profiles / 已核对 metric_records / episodes / infusion_series）；
 * ai_candidates 未核对，任何字段都不进这里。 */
function trialProfileRecord(pk) {
  const p = P();
  const meta = String(p.meta || '');
  const ageMatch = meta.match(/(\d+)\s*岁/);
  const geneMatch = meta.match(/Pi\s*\*?\s*[A-Za-z0-9*]+/);
  const depts = [];
  visitsFor(pk).forEach((v) => { if (v.dept && !depts.includes(v.dept)) depts.push(v.dept); });
  const visits = visitsFor(pk);
  const eps = filterPrivate(episodesFor(pk));
  const ser = filterPrivate(seriesFor(pk));
  const lastEp = eps[eps.length - 1];
  const lastSer = ser[ser.length - 1];
  return {
    age: ageMatch ? Number(ageMatch[1]) : null,
    ageDate: p.created_at || '未记录',
    gene: geneMatch ? geneMatch[0].replace(/\s+/g, '') : (meta.includes('分型中') ? '基因分型中' : '未记录'),
    geneDate: p.created_at || '未记录',
    followupDepts: depts,
    followupDate: visits.length ? visits[visits.length - 1].visited_on : null,
    hasInfusion: ser.length > 0,
    infusionCount: ser.length,
    infusionDate: lastSer ? lastSer.started_on : null,
    hasFlares: eps.length > 0,
    flareCount: eps.length,
    flareDate: lastEp ? (lastEp.ended_on || lastEp.started_on) : null,
    today: todayISO()
  };
}
function trialProfileFields(pk) {
  const p = P();
  const rec = trialProfileRecord(pk);
  const out = [
    { label: '档案', value: `${p.name} · ${p.meta}`, source: '档案', date: p.created_at || '未记录' },
    { label: '年龄', value: rec.age === null ? '未记录' : `${rec.age} 岁`, source: '档案 meta', date: rec.ageDate },
    { label: '基因分型', value: rec.gene, source: '档案 meta', date: rec.geneDate },
    { label: '随访科室', value: rec.followupDepts.length ? rec.followupDepts.join(' + ') : '未记录', source: '就诊记录', date: rec.followupDate || '未记录' },
  ];
  if (rec.hasFlares) {
    const last = filterPrivate(episodesFor(pk)).slice(-1)[0];
    out.push({ label: '发作记录', value: `${rec.flareCount} 段 · 最近 ${last.started_on} → ${last.ended_on || '缓解未记录'}`, source: '发作记录', date: rec.flareDate });
  } else {
    out.push({ label: '发作记录', value: '未记录', source: '发作记录', date: '未记录' });
  }
  if (rec.hasInfusion) {
    out.push({ label: '输注段', value: `${rec.infusionCount} 段 · 最近开始 ${rec.infusionDate}`, source: '输注段', date: rec.infusionDate });
  } else {
    out.push({ label: '输注段', value: '未记录', source: '输注段', date: '未记录' });
  }
  MDEFS().forEach((def) => {
    const nums = filterPrivate(recsOfDef(pk, def.id)).filter((r) => typeof r.value_num === 'number');
    if (!nums.length) return;
    const last = nums[nums.length - 1];
    out.push({
      label: def.name,
      value: `${last.value_num}${def.unit ? ' ' + def.unit : ''}`,
      source: last.source_kind === 'report' ? '来自报告' : '手工录入',
      date: last.measured_on || '未记录'
    });
  });
  return out;
}
/* 纯函数：matchTrial(record, trial) —— 不读 DOM / 不写数据；结果只在渲染层使用。
 * 可对照项只来自快照真实字段（status / studyType / dates / 标题里的关注器官）
 * 与档案已确认字段（随访科室 / 输注段）；干预/药物名称不进分母。
 * 可判定项（✓+✕）< 2 时不返回百分数（pct=null）。 */
function matchTrial(record, trial) {
  const criteria = [];
  const today = Date.parse(record.today || todayISO());
  const status = String(trial.status || '');
  let state = 'unknown', requireText = '登记状态未提供，需到登记页核对';
  let recordText = '未联系过该研究（无参与记录）';
  if (status === 'RECRUITING') { state = 'match'; requireText = '公开招募中，可向研究中心询问'; }
  else if (['COMPLETED', 'TERMINATED', 'WITHDRAWN', 'NO_LONGER_AVAILABLE', 'ACTIVE_NOT_RECRUITING'].includes(status)) {
    state = 'miss'; requireText = `登记状态为「${trialStatusMeta(status).text}」，当前不能新入组`;
  } else {
    state = 'unknown'; requireText = `登记状态为「${trialStatusMeta(status).text}」，能否询问以研究中心答复为准`;
  }
  criteria.push({ key: 'status', category: '登记状态', hard: true, countable: true, state, recordText, recordDate: record.today || todayISO(), requireText });

  const studyType = String(trial.studyType || '');
  let stState = 'unknown', stRequire = '研究类型未提供，需到登记页核对';
  if (studyType === 'OBSERVATIONAL') { stState = 'match'; stRequire = '观察性研究，通常不改变现有随访/治疗安排'; }
  else if (studyType === 'INTERVENTIONAL') {
    stState = 'unknown';
    stRequire = record.hasInfusion
      ? '干预性研究；你已有输注段，能否同时参加需研究中心确认'
      : '干预性研究；是否接受研究干预需研究中心确认';
  } else if (studyType === 'EXPANDED_ACCESS') { stState = 'unknown'; stRequire = '扩展可及项目；适用条件需研究中心确认'; }
  criteria.push({
    key: 'studyType', category: '研究类型', hard: false, countable: true, state: stState,
    recordText: record.hasInfusion ? `已记录输注段 ${record.infusionCount} 段（最近 ${record.infusionDate}）` : '没有输注段记录',
    recordDate: record.infusionDate || record.today || todayISO(),
    requireText: stRequire
  });

  const tOrgans = trialOrgans(trial);
  const pOrgans = profileOrgans(record);
  let orgState = 'unknown', orgRequire = '登记标题未结构化到关注器官，需人工核对';
  if (tOrgans.length && pOrgans.length) {
    const hit = tOrgans.some((o) => pOrgans.includes(o));
    orgState = hit ? 'match' : 'miss';
    orgRequire = `研究关注${tOrgans.map((o) => TRIAL_ORGAN_LABEL[o]).join(' / ')}，与随访科室${hit ? '相符' : '不符'}`;
  } else if (tOrgans.length) {
    orgRequire = `研究关注${tOrgans.map((o) => TRIAL_ORGAN_LABEL[o]).join(' / ')}；档案未记录随访科室`;
  }
  criteria.push({
    key: 'organ', category: '关注器官 / 随访科室', hard: false, countable: true, state: orgState,
    recordText: record.followupDepts.length ? `随访科室：${record.followupDepts.join(' + ')}` : '随访科室未记录',
    recordDate: record.followupDate || record.today || todayISO(),
    requireText: orgRequire
  });

  const lastDate = trialLastDate(trial);
  let dateState = 'unknown', dateRequire = '登记日期未提供，需到登记页核对';
  if (lastDate) {
    dateState = Date.parse(lastDate) >= today ? 'match' : 'miss';
    dateRequire = `登记计划最后日期 ${lastDate} ${dateState === 'match' ? '未过' : '已过'}`;
  }
  criteria.push({
    key: 'dates', category: '登记日期', hard: false, countable: true, state: dateState,
    recordText: `本机日期 ${record.today || todayISO()}`, recordDate: record.today || todayISO(), requireText: dateRequire
  });

  /* 未结构化条件：如实写「需人工核对」，不进入可判定项分母 */
  criteria.push({
    key: 'flares', category: '近期发作记录', hard: true, countable: false, state: 'unknown',
    recordText: record.hasFlares ? `${record.flareCount} 段 · 最近 ${record.flareDate}` : '无发作记录',
    recordDate: record.flareDate || record.ageDate,
    requireText: '登记页对稳定性 / 近期发作的要求（本机快照未存）'
  });
  criteria.push({
    key: 'age', category: '年龄区间', hard: true, countable: false, state: 'unknown',
    recordText: record.age === null ? '年龄未记录' : `${record.age} 岁`,
    recordDate: record.ageDate,
    requireText: '登记页年龄门槛（本机快照未存）'
  });
  criteria.push({
    key: 'gene', category: '基因型', hard: true, countable: false, state: 'unknown',
    recordText: record.gene,
    recordDate: record.geneDate,
    requireText: '登记页基因型 / 检测门槛（本机快照未存）'
  });

  /* m = 已能判定的项数（✓ + ✕），k = 待确认项（含未结构化项）；m < 2 不给百分数 */
  const resolved = criteria.filter((c) => c.countable && c.state !== 'unknown');
  const n = resolved.filter((c) => c.state === 'match').length;
  const m = resolved.length;
  const k = criteria.filter((c) => c.state === 'unknown').length;
  return { criteria, n, m, k, pct: m >= 2 ? Math.round((n / m) * 100) : null };
}
function matchPctHTML(result) {
  if (!result || result.pct === null) {
    return `<span class="match-score na"><b>无法计算</b><small>登记字段符合度无法计算，需人工核对</small><em>${result ? `${result.n} / ${result.m} 项对得上 · ${result.k} 项待确认` : '—'}</em></span>`;
  }
  const band = result.pct >= 80 ? '字段都对得上（快照层面）' : '部分对得上';
  return `<span class="match-score"><b>${result.pct}%</b><small>登记字段符合度</small><em>${result.n} / ${result.m} 项对得上 · ${result.k} 项待确认 · ${band}</em><em class="score-note">这不是入组资格</em></span>`;
}
function hardTagsHTML(result) {
  return result.criteria.filter((c) => c.hard).map((c) => {
    const mark = c.state === 'match' ? '✓' : c.state === 'miss' ? '✕' : '?';
    return `<span class="hard-pill ${c.state}">${esc(c.category)} ${mark}</span>`;
  }).join('');
}
function matchCardHTML(t, result) {
  const st = trialStatusMeta(t.status);
  const intervention = trialIntervention(t);
  const sponsor = (t.sponsor || []).join(' / ') || '未提供';
  return `<button class="match-card" data-action="trial-detail" data-trial="${esc(t.id)}" data-mode="match" aria-label="${esc(`${t.nct || t.id}，${result.pct === null ? '登记字段符合度无法计算，需人工核对' : `登记字段符合度 ${result.pct}%`}，查看逐条判据`)}">
    ${matchPctHTML(result)}
    <span class="match-main">
      <b class="match-title">${esc(t.title)}</b>
      <span class="match-meta">${esc(t.nct || t.id)} · ${esc(trialStudyLabel(t.studyType))} · ${esc(st.text)} · 申办方 ${esc(sponsor)} · 中心数 未提供</span>
      ${intervention ? `<span class="match-inter">登记干预（标题摘录）：${esc(intervention)} · 不进符合度分母</span>` : ''}
    </span>
    <span class="match-hard"><span class="hard-head">硬性条件</span>${hardTagsHTML(result)}</span>
  </button>`;
}
function trialMatchRows(record) {
  const prefs = state.trialPref || {};
  const rankStatus = (s) => s === 'RECRUITING' ? 0 : (s === 'ENROLLING_BY_INVITATION' || s === 'NOT_YET_RECRUITING') ? 1 : s === 'ACTIVE_NOT_RECRUITING' ? 2 : 3;
  const rankStudy = (s) => s === 'OBSERVATIONAL' ? 0 : s === 'EXPANDED_ACCESS' ? 1 : 2;
  return TRIAL_DEMO.map((t) => ({ t, r: matchTrial(record, t) })).sort((a, b) => {
    if (prefs.recruiting) { const d = rankStatus(a.t.status) - rankStatus(b.t.status); if (d) return d; }
    if (prefs.observational) { const d = rankStudy(a.t.studyType) - rankStudy(b.t.studyType); if (d) return d; }
    const d = String(b.t.snapshotDate || '').localeCompare(String(a.t.snapshotDate || ''));
    if (d) return d;
    return String(a.t.title).localeCompare(String(b.t.title));
  });
}
function vTrialMatch() {
  const pk = state.profile;
  const record = trialProfileRecord(pk);
  const fields = trialProfileFields(pk);
  const pending = rows('ai_candidates', pk).filter((c) => c.status === 'pending').length;
  const prefs = state.trialPref || {};
  const snapshotDate = (TRIAL_DEMO[0] && TRIAL_DEMO[0].snapshotDate) || '未记录';
  return `${pageHead(true)}
  <div class="notice">匹配只对照<b>登记的结构化字段</b>（登记状态 / 研究类型 / 关注器官 / 登记日期）与<b>已确认入库的档案事实</b>；未核对候选不参与；百分数只在展示层算、按已能判定的项计算（待确认项单列），<b>不代表入选可能</b>。</div>
  <div class="card"><div class="card-head"><h2>档案字段（只列已确认入库）</h2><span class="muted">${fields.length} 项 · 每项带来源日期</span></div>
    ${trialFactGridHTML(fields)}
    <p class="small-note">另有 ${pending} 条 AI 候选未核对，不参与匹配；未核对 ≠ 已确认，不计入任何分母。</p>
  </div>
  <div class="pref-row">
    <span class="eyebrow">偏好（只影响排序）</span>
    <button class="chip" data-action="trial-pref" data-pref="recruiting" aria-pressed="${prefs.recruiting}">先看还在招募</button>
    <button class="chip" data-action="trial-pref" data-pref="observational" aria-pressed="${prefs.observational}">先看观察性研究</button>
    <button class="chip" disabled title="本机快照不含地区 / 中心字段">先看离家近（快照无地区）</button>
    <span class="small-note">偏好只改变排序，不改变任何一条的符合度分母。</span>
  </div>
  <div class="pool-head"><div><b>候选池</b> <span>已载 ${TRIAL_DEMO.length} / ${TRIAL_SNAPSHOT_TOTAL}</span></div><span class="small-note">本机快照子集，不是全库扫描</span><span class="pill grey">快照 ${esc(snapshotDate)}</span></div>
  <p class="small-note pool-note">快照子集，登记状态未核实、会过期；条件索引会带入相关病种研究，逐条以登记页与研究中心答复为准。</p>
  <div class="match-list">${trialMatchRows(record).map(({ t, r }) => matchCardHTML(t, r)).join('')}</div>`;
}
function trialSearchRows() {
  const q = String((state.trialQuery || {}).keyword || '').trim().toLowerCase();
  const studyType = (state.trialQuery || {}).studyType || '';
  const status = (state.trialQuery || {}).status || '';
  return TRIAL_DEMO.filter((t) => {
    if (studyType && t.studyType !== studyType) return false;
    if (status && t.status !== status) return false;
    if (q) {
      const hay = [t.title, t.nct, t.id, (t.sponsor || []).join(' '), trialIntervention(t)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).slice().sort((a, b) => String(b.snapshotDate || '').localeCompare(String(a.snapshotDate || '')) || trialLastDate(b).localeCompare(trialLastDate(a)));
}
function trialSearchRowsHTML() {
  const list = trialSearchRows();
  return `<div class="card" style="margin-top:14px"><div class="card-head"><h2>结果 ${list.length} 条</h2><span class="muted">按快照日期倒序 · 不掺分数</span></div>
    ${list.map((t) => {
      const st = trialStatusMeta(t.status);
      const sponsor = (t.sponsor || []).join(' / ') || '未提供';
      return `<button class="trial-result" data-action="trial-detail" data-trial="${esc(t.id)}" data-mode="search">
        <span class="trial-result-main"><b>${esc(t.title)}</b><span>${esc(t.nct || t.id)} · ${esc(trialStudyLabel(t.studyType))} · 申办方 ${esc(sponsor)} · 中心数 未提供</span></span>
        <span class="trial-result-side">${pill(st.text, st.tone)}<span class="trial-open">查看详情 →</span></span>
      </button>`;
    }).join('') || emptyBox('没有匹配的快照条目', '换一个关键词，或清空研究类型 / 状态筛选；查不到不等于没有登记。', '<button class="chip" data-action="trial-reset">清空条件</button>')}
    <p class="small-note" style="margin-top:10px">快照样例，检索真库走开发版；登记状态可能滞后，以研究中心答复为准。</p>
  </div>`;
}
function vTrialSearch() {
  const q = state.trialQuery || {};
  const statuses = [];
  const studies = [];
  TRIAL_DEMO.forEach((t) => {
    if (t.status && !statuses.includes(t.status)) statuses.push(t.status);
    if (t.studyType && !studies.includes(t.studyType)) studies.push(t.studyType);
  });
  return `${pageHead(true)}
  <div class="notice">检索只按你选的条件排序，<b>不掺分数</b>；条件来自本机快照样例，检索真库走开发版。这里不把「没检到」写成零结果。</div>
  <div class="card"><div class="card-head"><h2>筛选</h2>${pill('快照子集', 'yellow')}</div>
    <div class="trial-filters">
      <div class="field"><label for="trial-q">关键词（药名 / 位点 / NCT 编号 / 申办方）</label><input id="trial-q" data-trial-q value="${esc(q.keyword || '')}" placeholder="如 Fazirsiran、BEAM-302、NCT05677971"></div>
      <div class="field"><label for="trial-study">研究类型</label><select id="trial-study" data-trial-filter="studyType"><option value="">全部类型</option>${studies.map((s) => `<option value="${esc(s)}" ${q.studyType === s ? 'selected' : ''}>${esc(trialStudyLabel(s))}</option>`).join('')}</select></div>
      <div class="field"><label for="trial-status">登记状态</label><select id="trial-status" data-trial-filter="status"><option value="">全部状态</option>${statuses.map((s) => `<option value="${esc(s)}" ${q.status === s ? 'selected' : ''}>${esc(trialStatusMeta(s).text)}</option>`).join('')}</select></div>
    </div>
    <p class="small-note" style="margin-top:8px">本机快照不含地区 / 中心字段：地区筛选省略并如实标注（不是零结果，也不是没有相关研究）。</p>
  </div>
  <div id="trial-results">${trialSearchRowsHTML()}</div>`;
}
function savedTrialList() {
  const raw = state.mem.savedTrials;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => typeof x === 'string'
    ? { trialKey: x, savedOn: '未记录', state: '在跟' }
    : { trialKey: String(x.trialKey || x.id || ''), savedOn: x.savedOn || '未记录', state: TRIAL_SAVED_STATES.includes(x.state) ? x.state : '在跟' }
  ).filter((x) => x.trialKey);
}
function isTrialSaved(key) { return savedTrialList().some((x) => x.trialKey === key); }
function toggleTrialSaved(key) {
  const list = savedTrialList();
  const i = list.findIndex((x) => x.trialKey === key);
  if (i >= 0) {
    list.splice(i, 1);
    state.mem.savedTrials = list;
    toast('已从本机收藏移除（零副作用：不改登记状态，不通知研究中心）');
    return false;
  }
  list.push({ trialKey: key, savedOn: todayISO(), state: '在跟' });
  state.mem.savedTrials = list;
  toast('已收藏到本机（只做个人跟踪，不等于报名）');
  return true;
}
function setSavedTrialState(key, next) {
  if (!TRIAL_SAVED_STATES.includes(next)) return;
  const list = savedTrialList();
  const hit = list.find((x) => x.trialKey === key);
  if (!hit) return;
  hit.state = next;
  state.mem.savedTrials = list;
}
function vTrialSaved() {
  const list = savedTrialList();
  return `${pageHead(true)}
  <div class="notice">收藏只是本机个人跟踪：登记状态不变、报名与否不变、不产生任何外部副作用。移除只删本机收藏。</div>
  <div class="card"><div class="card-head"><h2>我的收藏（${list.length}）</h2><span class="muted">收藏日期 + 在跟 / 准备问 / 已归档</span></div>
    <p class="small-note">本机未存登记状态变化时间线，不画进度；下面的登记状态只是快照里的最后值，未核实。</p>
    ${list.map((item) => {
      const t = trialById(item.trialKey);
      if (!t) return '';
      const st = trialStatusMeta(t.status);
      return `<div class="saved-row" data-saved="${esc(item.trialKey)}">
        <div class="saved-main"><b>${esc(t.title)}</b><p>${esc(t.nct || t.id)} · 快照状态 ${esc(st.text)}（${esc(t.snapshotDate || '日期未记录')}，未核实） · 收藏于 ${esc(item.savedOn)}</p></div>
        <div class="saved-actions">
          <span class="saved-state-group">${TRIAL_SAVED_STATES.map((s) => `<button class="chip" data-action="saved-state" data-key="${esc(item.trialKey)}" data-state="${esc(s)}" aria-pressed="${item.state === s}">${esc(s)}</button>`).join('')}</span>
          <button class="text-button" data-action="trial-detail" data-trial="${esc(t.id)}" data-mode="saved">详情</button>
          <button class="text-button" data-action="save-trial" data-id="${esc(t.id)}">移除</button>
        </div></div>`;
    }).join('') || emptyBox('还没有收藏', '在「匹配」或「检索」里打开任一条目，点浮窗底部的收藏按钮，会出现在这里。')}
  </div>`;
}
function vTrial() {
  const sub = state.sub.trial || 'match';
  if (sub === 'search') return vTrialSearch();
  if (sub === 'saved') return vTrialSaved();
  return vTrialMatch();
}

/* ---------------- 复诊准备 ---------------- */
function buildExportMd() {
  const pk = state.profile, p = P();
  const notesAll = notesFor(pk);
  const visible = filterPrivate(notesAll);
  const eps = filterPrivate(episodesFor(pk)).slice(-3).reverse();
  const ss = seriesFor(pk);
  const L = [`# 复诊准备（演示导出）`, '', `档案：${p.name}（${p.meta}）——${p.demo_label}`, '', '## 受累器官与最近化验（事实）'];
  MDEFS().forEach((d) => {
    const rs = recsOfDef(pk, d.id);
    const last = rs[rs.length - 1];
    L.push(`- ${d.name}：${last ? (last.value_num != null ? `${last.value_num} ${d.unit || ''}` : (last.value_text || '文本记录')) + `（${fmtDate(last.measured_on)}）` : '暂无记录'}`);
  });
  L.push('', '## 发作—缓解（最近 3 条）');
  (eps.length ? eps : []).forEach((e) => L.push(`- ${e.started_on} → ${e.ended_on || '缓解未记录'}：${e.title}`));
  if (ss.length) {
    L.push('', '## 输注（按段）');
    ss.forEach((s) => { const st = infusionStats(pk, s); L.push(`- ${s.label}：已记 ${st.count} 次${st.gaps.length ? `，缺口周 ${st.gaps.length} 个` : ''}`); });
  }
  L.push('', '## 医生原话（原文）');
  filterPrivate(notesAll).filter((n) => n.kind === 'doctor_quote').forEach((n) => L.push(`- ${fmtDate(n.occurred_on)}：${n.content}`));
  L.push('', '## 我的症状与想问的事（不是医生结论）');
  visible.filter((n) => n.kind === 'symptom' || n.kind === 'question').forEach((n) => L.push(`- ${fmtDate(n.occurred_on)}：${n.content}`));
  state.mem.questions.forEach((q) => L.push(`- （待问）${q}`));
  const pn = privateCount(notesAll) + privateCount(rows('family_lines', pk));
  if (pn) L.push('', `（私密 ${pn} 条默认不进本导出；三出口共用同一过滤函数。）`);
  L.push('', '> 本文件由工作台整理，不构成医疗建议；判读归呼吸 / 肝病团队。');
  return L.join('\n');
}
function vReview() {
  const pk = state.profile;
  const notesAll = notesFor(pk);
  const visible = filterPrivate(notesAll);
  const qs = state.mem.questions;
  return `${pageHead(true)}
  <div class="notice">导出的材料与页内数据同源（读同一份记录）；私密条目由 filterPrivate() 过滤，不进导出、不进看板摘要、不进 AI 上下文。</div>
  <div class="card"><div class="card-head"><h2>就诊材料预览</h2><span class="muted">${privateLabel(visible.length, privateCount(notesAll))}</span></div>
    <div class="rows">
      ${row('受累器官', '肺（呼吸科随访）+ 肝（肝病科随访）——两路化验都带上')}
      ${row('最近发作', (() => { const lf = lastFlareInfo(pk); return lf.mode === 'open' ? `${lf.ep.started_on} 起，缓解未记录` : lf.mode === 'since' ? `${lf.ep.started_on} → ${lf.ep.ended_on}` : '暂无记录'; })())}
      ${row('行动计划原话', (() => { const n = notesFor(pk).find((x) => x.kind === 'doctor_quote' && /行动计划/.test(x.content)); return n ? esc(n.content).slice(0, 50) + '…' : '还没有记录'; })())}
      ${row('想问清单', qs.length ? esc(qs.join('；')) : '还没有；下面可以加一条')}
    </div>
    <div class="actions"><button class="primary" data-action="open-page" data-page="plan">打开就诊材料整页 →</button><button data-action="export-review">整理成 Markdown</button><button data-action="entry" data-kind="question">加一个问题</button></div></div>
  <div class="card" style="margin-top:14px"><div class="card-head"><h2>就医信息（多家医院）</h2><span class="muted">按医院逐条；联系方式只记原话/出处</span></div>
    <div class="rows">
      ${(() => {
        const vs = visitsFor(pk);
        if (!vs.length) return row('还没有就诊记录', '第一次就诊后在这里记一条：医院 / 科室 / 日期 / 联系方式');
        const byH = new Map();
        vs.forEach((v) => { const h = v.hospital || '（医院未记录）'; if (!byH.has(h)) byH.set(h, []); byH.get(h).push(v); });
        return [...byH.entries()].map(([h, list]) => {
          const last = list[list.length - 1];
          return row(`${esc(h)} · ${esc(last.dept)}`, `${esc(fmtDate(last.visited_on))} · ${esc(last.contact || '联系方式未记录（可问前台）')} · 版本 ${list.length}（更正保留历史）`, `<button data-action="entry" data-kind="visit">添加/更正</button>`);
        }).join('');
      })()}
    </div>
    <div class="actions"><button data-action="entry" data-kind="visit">添加一条就诊</button></div>
    <p class="small-note" style="padding:0 14px 12px">不同医院/不同科室分开记，不合并；更正 = 新增版本，旧版本保留可查（无裸删除）。</p></div>
  <div class="card" style="margin-top:14px"><div class="card-head"><h2>我的问题清单（${qs.length}）</h2></div>
    <div class="rows">${qs.length ? qs.map((q) => row(esc(q), '', '<button class="text-button" data-action="toast" data-msg="已标记已问（演示）">标记已问</button>')).join('') : '<p class="muted" style="padding:12px">还没有问题；点「加一个问题」放一条示例。</p>'}</div></div>`;
}

/* ---------------- 设置（三 tab，照家族 CFG_TABS 结构） ---------------- */
const CFG_TABS = [['store', '工作区'], ['parse', '文档解析（MinerU）'], ['clinic', '临床数据库']];
function cfgStore() {
  const pk = state.profile;
  const fl = rows('family_lines', pk);
  const privNotes = notesFor(pk).filter((n) => n.is_private);
  return `<div class="grid two">
    <div class="card"><div class="card-head"><h2>档案切换</h2><span class="muted">两套均为合成示例 · 仅演示</span></div>
      <div class="rows">${PROFILE_KEYS.map((k) => {
        const p2 = D.profiles[k];
        return row(`${k} · ${esc(p2.name)}`, `${esc(p2.meta)} · ${esc(p2.headline)}`, k === pk ? pill('当前', 'brand') : `<button data-action="pick-profile" data-id="${k}">切换</button>`);
      }).join('')}</div></div>
    <div class="card"><div class="card-head"><h2>私密管理</h2><span class="muted">三出口共用 filterPrivate()</span></div>
      <div class="rows">
        ${row('记录中的私密', `${privNotes.length} 条（看板 / 导出 / AI 上下文三处排除）`)}
        ${row('家系线索', `${fl.length} 条（涉及他人健康信息，默认私密）`)}
        ${row('页内显示口径', privateLabel(notesFor(pk).length + fl.length, privateCount(notesFor(pk)) + privateCount(fl)))}
      </div>
      <div class="actions"><button id="font-toggle-2" data-action="font">大字模式 ${document.body.classList.contains('large') ? '关' : '开'}</button></div></div>
  </div>
  <div class="card" style="margin-top:14px"><div class="card-head"><h2>业务资料根目录</h2><span class="muted">本机唯一存储</span></div>
    <div class="rows">
      ${row('资料根目录（示意）', '~/…/dsh-desktop/harness/aatd/（宿主 dshHomePath(\'aatd\')；原型不写盘）')}
      ${row('原件 / 派生 / 数据库', '原件 0 份 · 派生 0 份 · 数据库（演示画像）三块体积 tile：本轮全部为内存演示，不落盘')}
      ${row('备份与恢复', '导出备份 = 数据库 + 原件清单；恢复前校验 freeze-contract sha256。原型态不提供真实备份按钮')}
      ${row('目录口径', '拒绝主目录 / 桌面 / 下载根 / tmp；真实版由宿主弹窗选目录，不静默建目录')}
    </div>
    <div class="actions"><button data-action="pick-profile" disabled aria-disabled="true" title="原型态：真实版由宿主选择目录">更改位置（原型禁用）</button></div></div>
  <div class="card" style="margin-top:14px"><div class="card-head"><h2>口径说明</h2></div>
    <div class="rows">
      ${careValue(pk).map((v) => row(v, '在任何指标 / 趋势页常驻同屏')).join('')}
      ${row('审核状态', '本台 0 患者访谈、0 临床审核；场景为开发者假设改写。')}
      ${row('表达口径', '本台用发作—缓解、受累器官（肺 / 肝）与随访节律表达；「第几天」由记录算出。')}
      ${row('数据', '演示数据唯一源：demo/demo-data.js；全部为合成示例 · 仅演示，不指向任何真实患者。')}
    </div></div>`;
}
function cfgParse() {
  const c = state.mineru;
  return `<div class="card"><div class="card-head"><h2>文档解析（MinerU）</h2>${pill(c.consent ? '已同意（演示）' : '待确认', c.consent ? 'green' : 'yellow')}</div>
    <div class="rows">
      <label class="check-row"><input type="checkbox" data-action="mineru-consent" ${c.consent ? 'checked' : ''}><span>我了解：勾选后（真实版）会把所选 PDF 上传到 MinerU 云端解析，只传文件本身，不传档案、判读记录与收藏；可随时关闭。</span></label>
      ${c.consent ? '' : '<p class="small-note" style="color:var(--warn-ink)">未勾选：不会上传、不会调用任何解析服务。本仓当前未接入 MinerU，勾选与保存也不会联网（演示态）。</p>'}
      ${row('Token（只显示后 4 位）', c.tokenMasked ? esc(c.tokenMasked) : '未配置（演示态）')}
      <div class="form-inline"><input type="password" ${c.consent ? '' : 'disabled'} data-mineru-token placeholder="粘贴新 Token（未勾选时禁用）" aria-label="MinerU Token"><button data-action="mineru-save" ${c.consent ? '' : 'disabled'}>保存 Token（演示）</button></div>
      ${row('解析模型', 'pipeline（固定，不可切 VLM）')}
      ${row('固定原因', 'pipeline 跨工作台统一口径，表格结构与单位解析可对账；VLM 通道结果不可横向比较')}
      ${row('免费额度', 'Flash 免费解析单文件上限 10 MB / 20 页；超限保留原件并提示，不丢文件')}
      ${row('降级提示', '认证失败自动尝试 Flash 时会明确标注「Flash 降级解析」，不静默换通道')}
    </div>
    <div class="card" style="box-shadow:none;border:1px dashed var(--line);margin-top:10px"><div class="card-head"><h2>如何申请 Token</h2></div>
      <div class="rows">${row('1', '访问 MinerU 官网注册账号（真实地址以官网为准）')}${row('2', '控制台创建 API Token')}${row('3', '回到本页勾选同意并粘贴保存')}${row('4', '首次解析前用一份演示 PDF 试跑，核对单位与表格')}</div></div>
    <div class="actions"><button data-action="mineru-save" ${c.consent ? '' : 'disabled'} class="primary">保存（演示，不联网）</button></div></div>`;
}
function cfgClinic() {
  return `<div class="card"><div class="card-head"><h2>临床数据库（试验/登记离线快照）</h2>${pill('快照已载 · 147 条', 'brand')}</div>
    <div class="rows">
      ${row('快照状态', 'research/aatd/trials.sqlite · 147 条登记 · 快照日期 2026-11-05（CT.gov API v2，query.cond="alpha-1 antitrypsin deficiency"）')}
      ${row('来源与通道终态', 'ctgov OK 147 条；chinadrugtrials HTTP 202（FAILED，反爬未采集）；chictr HTTP 405（FAILED）；WHO ICTRP 门户无 API（未采集）——未查过/失败不等于零结果')}
      ${row('断网空态', '临床研究页给出「离线快照不可用」空态与获取说明，不报错、不假装有结果')}
      ${row('与临床研究页同源', '候选池卡头「已载 N / M」与本 tab 的 147 条同源；登记状态一律「未核实」，快照会过期')}
      ${row('入排原文', '本机快照只存登记的结构化字段；入排标准请到官方登记页核对')}
    </div>
    <div class="actions"><button disabled aria-disabled="true" title="原型态：真实版走开发版接口">检查更新（原型禁用）</button></div></div>`;
}
function vSettings() {
  const tab = state.cfgTab;
  return `${pageHead(true)}
  <div class="cfg-tabs" role="tablist" aria-label="设置分区">${CFG_TABS.map(([id, label]) => `<button role="tab" aria-selected="${tab === id}" data-action="settings-tab" data-tab="${id}">${label}</button>`).join('')}</div>
  <div class="tab-body">${tab === 'store' ? cfgStore() : tab === 'parse' ? cfgParse() : cfgClinic()}</div>`;
}

/* ---------------- 整页视图（#page=xxx）：history 是导航栈唯一真源 ---------------- */
const PV = { el: null, open: false, trigger: null, scrollY: 0 };
function pvRegistry(id) {
  if (id === 'summary') return { title: '病情汇总', body: pvSummary };
  if (id === 'plan') return { title: '就诊材料', body: pvPlan };
  return null;
}
function pvSummary() {
  const pk = state.profile, p = P();
  const notesAll = notesFor(pk);
  const fl = rows('family_lines', pk);
  const ss = seriesFor(pk);
  const rowsHtml = [];
  rowsHtml.push(row('受累器官', '肺：肺功能与血清 AAT（呼吸科）；肝：肝功能（消化科 / 肝病科）——两路分节，不合并。'));
  MDEFS().forEach((d) => {
    const rs = recsOfDef(pk, d.id);
    const last = rs[rs.length - 1];
    rowsHtml.push(row(esc(d.name), last ? `${last.value_num != null ? last.value_num + ' ' + (d.unit || '') : esc(last.value_text || '文本记录')} · ${esc(fmtDate(last.measured_on))} · 可比组 ${esc(d.comparable_key)}` : '暂无记录（未检测不等于阴性）'));
  });
  filterPrivate(episodesFor(pk)).slice().reverse().forEach((e) => rowsHtml.push(row(esc(e.title), `${esc(e.started_on)} → ${esc(fmtDate(e.ended_on))}${e.ended_on ? ' · 持续 ' + dayDiff(e.started_on, e.ended_on) + ' 天' : ' · 缓解未记录'}`)));
  ss.forEach((s) => { const st = infusionStats(pk, s); rowsHtml.push(row(esc(s.label), `${s.started_on} → ${fmtDate(s.ended_on)} · 已记 ${st.count} 次${st.gaps.length ? ' · 缺口周 ' + st.gaps.length + ' 个' : ''}`)); });
  return `<div class="pv-inner">
    <div class="notice">这份汇总是记录整理，不是判读；私密条目已排除（${privateLabel(notesAll.length + fl.length, privateCount(notesAll) + privateCount(fl))}）。判读归呼吸 / 肝病团队。</div>
    <div class="card"><div class="card-head"><h2>${esc(p.name)}的病情汇总</h2>${pill(p.demo_label, 'grey')}</div><div class="rows">${rowsHtml.join('')}</div></div>
    <div class="card" style="margin-top:14px"><div class="card-head"><h2>医生原话</h2></div>
      <div class="rows">${filterPrivate(notesAll).filter((n) => n.kind === 'doctor_quote').map((n) => row(esc(fmtDate(n.occurred_on)), esc(n.content))).join('') || '<p class="muted" style="padding:12px">暂无。</p>'}</div></div>
  </div>`;
}
function pvPlan() {
  const pk = state.profile;
  const md = buildExportMd();
  return `<div class="pv-inner">
    <div class="notice">这一页与导出文件同源；私密已过滤。可以直接打印，或回「复诊准备」整理成 Markdown。</div>
    <div class="card"><pre style="white-space:pre-wrap;font:12.5px/1.75 ui-monospace,Menlo,monospace;color:var(--ink-2);margin:0">${esc(md)}</pre></div>
  </div>`;
}
function pvOpen(id, trigger) {
  const reg = pvRegistry(id);
  if (!reg) return;
  PV.trigger = trigger || document.activeElement;
  PV.scrollY = $('#main').scrollTop;
  if (!PV.el) {
    PV.el = document.createElement('div');
    PV.el.className = 'pageview';
    PV.el.id = 'page-view';
    PV.el.setAttribute('role', 'dialog');
    PV.el.setAttribute('aria-modal', 'true');
    PV.el.hidden = true;
    document.body.appendChild(PV.el);
  }
  PV.el.innerHTML = `<div class="pv-head">
      <button class="dp-btn" data-action="pv-back" aria-label="返回工作台">← 返回</button>
      <div style="flex:1;min-width:0"><span class="pv-crumb">小筛宝工作台 › ${esc(PAGES.find((p) => p[0] === state.view)[1])} › 整页</span><h2>${esc(reg.title)}</h2></div>
      <button class="icon-button" data-action="pv-close" aria-label="关闭整页视图">✕</button>
    </div><div class="pv-body" tabindex="-1">${reg.body()}</div>`;
  PV.el.hidden = false;
  PV.open = true;
  document.documentElement.classList.add('dp-lock');
  try { history.pushState({ pv: id }, '', `#page=${id}`); } catch (_) {}
  $('.pv-body', PV.el).focus();
}
function pvApplyClose() {
  if (!PV.open) return;
  PV.open = false;
  if (PV.el) PV.el.hidden = true;
  document.documentElement.classList.remove('dp-lock');
  if (PV.trigger && PV.trigger.focus) { try { PV.trigger.focus({ preventScroll: true }); } catch (_) { PV.trigger.focus(); } }
  if (PV.scrollY != null) $('#main').scrollTop = PV.scrollY;
  PV.trigger = null;
}
function pvClose() {
  if (!PV.open) return;
  let ours = false;
  try { ours = !!(history.state && history.state.pv); } catch (_) {}
  if (ours) { try { history.back(); return; } catch (_) {} }
  pvApplyClose();
}

/* ---------------- 疾病概要（36 号 · 整页面板，四段 · 每段强制来源行） ---------------- */
const DP = { el: null, open: false, trigger: null, scrollY: 0 };
const dpSafeHref = (u) => /^https:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
function dpSourceLine(s) {
  const bits = [s.org, s.doc].filter(Boolean).join(' · ');
  const tail = [];
  if (s.version) tail.push(esc(s.version));
  const sec = dpSafeHref(s.secondaryUrl);
  if (s.nolink) { /* 说明行 / 无对应公开文件：显式标注 nolink */ }
  else if (sec) tail.push(`<a class="dp-link" href="${sec}" target="_blank" rel="noopener noreferrer">未取得原件，据二次来源 ↗</a>`);
  else tail.push('<span class="dp-miss">未取得原件（本条缺公开链接，见 note 说明）</span>');
  if (s.page) tail.push('页码 ' + esc(s.page));
  if (s.note) tail.push(esc(s.note));
  return bits + (tail.length ? '（' + tail.join(' · ') + '）' : '');
}
function dpBuild() {
  if (DP.el) return DP.el;
  const d = window.DISEASE_PRIMER || {};
  const sections = Array.isArray(d.sections) ? d.sections : [];
  DP.el = document.createElement('div');
  DP.el.className = 'dp-overlay';
  DP.el.id = 'disease-primer';
  DP.el.hidden = true;
  DP.el.innerHTML = `<div class="dp-panel" role="dialog" aria-modal="true" aria-labelledby="dp-title" tabindex="-1">
    <div class="dp-head">
      <button class="dp-btn dp-back" type="button" data-action="dp-close" aria-label="返回工作台">← 返回</button>
      <div class="dp-head-title"><span class="dp-crumb">${esc(d.brand || '')} › 疾病概要</span>
        <h2 class="dp-title" id="dp-title">${esc(d.name || '疾病概要')}<span class="dp-en">${esc(d.en || '')}</span></h2></div>
      <button class="dp-btn dp-close icon-button" type="button" data-action="dp-close" aria-label="关闭疾病概要">✕</button>
    </div>
    <div class="dp-body" tabindex="0"><div class="dp-inner">
      <p class="dp-note">这是公开信息的整理，属于<b>解释</b>：说明这个病是什么、依据哪些文件、公开资料里列了哪些手段、这些年发生了什么。它不是对你个人情况的判断，也不构成任何建议。</p>
      ${sections.map((s, i) => {
        let body = '';
        if (s.intro) body += `<p class="dp-lead">${esc(s.intro)}</p>`;
        if (Array.isArray(s.groups)) body += s.groups.map((g) => `<div class="dp-group"><h4>${esc(g.label)}</h4><ul class="dp-points">${(g.points || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`).join('');
        if (Array.isArray(s.points) && s.points.length) body += `<ul class="dp-points">${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;
        if (s.table && Array.isArray(s.table.rows)) body += `<div class="dp-table-wrap"><table class="dp-table"><thead><tr>${s.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
          ${s.table.rows.map((r) => `<tr>${r.map((c) => {
            if (c && typeof c === 'object' && !Array.isArray(c)) {
              const u = dpSafeHref(c.url);
              return `<td>${esc(c.text != null ? c.text : '')}${u ? ` <a class="dp-link" href="${u}" target="_blank" rel="noopener noreferrer">↗</a>` : ''}</td>`;
            }
            return `<td>${esc(c)}</td>`;
          }).join('')}</tr>`).join('')}
        </tbody></table></div>`;
        const src = (s.sources && s.sources.length)
          ? `<p class="dp-src"><b>来源</b>${s.sources.map(dpSourceLine).join(' ｜ ')}</p>`
          : `<p class="dp-src dp-src-missing"><b>来源</b>未标注——这一段还不能用。</p>`;
        return `<section class="dp-section" data-dp-section="${esc(s.id || i)}" aria-labelledby="dp-h-${i}"><h3 id="dp-h-${i}">${esc(s.title || '')}</h3>${body}${src}</section>`;
      }).join('')}
      <p class="dp-foot">最后更新 ${esc(d.updated || '未标注')} · 内容只做事实与原文整理 · 任何与你有关的判断，这一句需要问你的医生。</p>
    </div></div></div>`;
  document.body.appendChild(DP.el);
  DP.el.addEventListener('click', (e) => { if (e.target === DP.el) dpClose(); });
  return DP.el;
}
function dpOpen(trigger) {
  if (DP.open) return;
  if (!window.DISEASE_PRIMER) { toast('疾病概要数据未加载（primer-data.js 缺失）'); return; }
  dpBuild();
  DP.trigger = trigger || document.querySelector('[data-primer-open]') || document.activeElement;
  DP.scrollY = $('#main').scrollTop;
  DP.open = true;
  DP.el.hidden = false;
  document.documentElement.classList.add('dp-lock');
  if (DP.trigger) DP.trigger.setAttribute('aria-expanded', 'true');
  try { history.pushState({ dp: 1 }, '', '#disease-primer'); } catch (_) {}
  $('.dp-panel', DP.el).focus();
}
function dpApplyClose() {
  if (!DP.open) return;
  DP.open = false;
  if (DP.el) DP.el.hidden = true;
  document.documentElement.classList.remove('dp-lock');
  if (DP.trigger) {
    DP.trigger.setAttribute('aria-expanded', 'false');
    try { DP.trigger.focus({ preventScroll: true }); } catch (_) { try { DP.trigger.focus(); } catch (__) {} }
  }
  if (DP.scrollY != null) $('#main').scrollTop = DP.scrollY;
  DP.trigger = null;
}
function dpClose() {
  if (!DP.open) return;
  let ours = false;
  try { ours = !!(history.state && history.state.dp); } catch (_) {}
  if (ours) { try { history.back(); setTimeout(() => { if (DP.open) dpApplyClose(); }, 250); return; } catch (_) {} }
  dpApplyClose();
}

/* ---------------- AI 面板 / splitter ---------------- */
const EMBEDDED = () => window.parent && window.parent !== window;
function setAgent(open) {
  state.agentOpen = open;
  const pane = $('#agent-pane'), spl = $('#agent-splitter'), btn = $('#agent-toggle');
  if (!pane) return;
  if (EMBEDDED()) { pane.hidden = true; if (spl) spl.hidden = true; if (btn) btn.hidden = true; return; }
  pane.hidden = !open;
  if (spl) spl.hidden = !open;
  if (btn) { btn.setAttribute('aria-expanded', String(open)); }
}
function agentShowDraft(prompt) {
  /* 只填不发：把提示词草稿放进面板，输入框保持禁用（未接入，不会发送） */
  const body = $('#agent-body');
  if (!body) return;
  const card = document.createElement('div');
  card.className = 'agent-draft';
  card.innerHTML = `<b>提示词草稿（只填不发 · 私密已过滤）</b><pre>${esc(prompt)}</pre>`;
  body.appendChild(card);
  body.scrollTop = body.scrollHeight;
  state.agentDrafts += 1;
}
function sendAgentDraft(prompt) {
  if (EMBEDDED()) {
    /* 34 号契约：嵌入式形态 → 壳层 aatd:agent-draft（业务页只填草稿，发送由壳层会话决定） */
    try {
      window.parent.postMessage({ type: 'aatd:agent-draft', prompt, send: true }, location.origin === 'null' ? '*' : location.origin);
      toast('已带到 AI 对话（aatd:agent-draft）；回复是候选，核对才采纳');
    } catch (_) { toast('发送失败：草稿已保留在演示面板'); if (!state.agentOpen) setAgent(true); agentShowDraft(prompt); }
  } else {
    if (!state.agentOpen) setAgent(true);
    agentShowDraft(prompt);
    toast('演示面板：原型独立打开不假装发送——输入框保持禁用，不会发送');
  }
}

/* ---------------- 右侧浮窗 drawer（登记详情 / 图表数据点复用） ----------------
 * 不是居中 dialog：aside.drawer 从右侧推入；三个关闭口（遮罩 / 标题栏 ✕ / Esc）；
 * 关闭后焦点回触发元素；不改 location.hash、不 pushState、不产生导航栈条目。 */
const DR = { el: null, open: false, trigger: null };
function drEnsure() {
  if (DR.el) return DR.el;
  const root = document.createElement('div');
  root.className = 'drawer-layer';
  root.id = 'drawer-layer';
  root.hidden = true;
  root.innerHTML = `<div class="drawer-scrim" data-action="drawer-close" aria-hidden="true"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1">
      <div class="drawer-head">
        <div class="drawer-head-text"><span class="eyebrow" id="drawer-eyebrow"></span><h2 id="drawer-title"></h2></div>
        <button class="icon-button" type="button" data-action="drawer-close" aria-label="关闭浮窗">✕</button>
      </div>
      <div class="drawer-body" id="drawer-body"></div>
      <div class="drawer-foot" id="drawer-foot" hidden></div>
    </aside>`;
  document.body.appendChild(root);
  DR.el = root;
  return root;
}
function drOpen({ eyebrow, title, body, trigger, foot }) {
  const root = drEnsure();
  root.querySelector('#drawer-eyebrow').textContent = eyebrow || '';
  root.querySelector('#drawer-title').textContent = title || '';
  root.querySelector('#drawer-body').innerHTML = body || '';
  const f = root.querySelector('#drawer-foot');
  f.innerHTML = foot || '';
  f.hidden = !foot;
  DR.trigger = trigger || document.activeElement;
  DR.open = true;
  root.hidden = false;
  document.documentElement.classList.add('drawer-lock');
  const aside = root.querySelector('.drawer');
  try { aside.focus({ preventScroll: true }); } catch (_) { try { aside.focus(); } catch (__) {} }
}
function drClose(refocus = true) {
  if (!DR.open) return;
  const root = DR.el;
  if (root) root.hidden = true;
  DR.open = false;
  document.documentElement.classList.remove('drawer-lock');
  const t = DR.trigger;
  DR.trigger = null;
  if (refocus && t && t.focus) { try { t.focus({ preventScroll: true }); } catch (_) { try { t.focus(); } catch (__) {} } }
}

/* ---- 登记详情（固定顺序：分数 → 判据 → 档案字段 → 登记字段 → 缺失声明 → 官方登记页） ---- */
function trialFactGridHTML(fields) {
  return `<div class="fact-grid">${fields.map((f) => `<div class="fact-cell"><span>${esc(f.label)}</span><b>${esc(f.value)}</b><em>${esc(f.source)} · ${esc(f.date)}</em></div>`).join('')}</div>`;
}
function trialScoreBlockHTML(result, mode) {
  const declaration = '登记字段符合度，不是入组资格，也不代表入选可能；最终以研究中心答复为准。';
  if (mode === 'search') {
    return `<div class="drawer-score na"><b>—</b><small>检索视图不计算符合度</small><em>检索只按条件排序，不掺分数</em></div><p class="drawer-decl">${declaration}</p>`;
  }
  if (mode === 'saved') {
    return `<div class="drawer-score na"><b>—</b><small>收藏视图不计算符合度</small><em>分数只在「匹配」子页展示</em></div><p class="drawer-decl">${declaration}</p>`;
  }
  if (!result || result.pct === null) {
    return `<div class="drawer-score na"><b>无法计算</b><small>登记字段符合度无法计算，需人工核对</small><em>${result ? `${result.n} / ${result.m} 项对得上 · ${result.k} 项待确认` : '—'}</em></div><p class="drawer-decl">${declaration}</p>`;
  }
  return `<div class="drawer-score"><b>${result.pct}%</b><small>登记字段符合度</small><em>${result.n} / ${result.m} 项对得上 · ${result.k} 项待确认</em></div><p class="drawer-decl">${declaration}</p>`;
}
function trialCriterionRowHTML(c) {
  const mark = c.state === 'match' ? '✓' : c.state === 'miss' ? '✕' : '?';
  const label = c.state === 'match' ? '符合' : c.state === 'miss' ? '不符合' : '待确认';
  return `<div class="crit-row ${c.state}"><span class="crit-mark" aria-hidden="true">${mark}</span><div class="crit-body">
    <div class="crit-head"><b>${esc(c.category)}</b><span class="crit-state">${label}</span>${c.hard ? '<span class="hard-tag">硬性</span>' : ''}</div>
    <p class="crit-line">记录里是：${esc(c.recordText)}（${esc(c.recordDate)}）· ${c.countable ? `条件要求：${esc(c.requireText)}` : '条目无法结构化，需人工核对'}</p>
    ${!c.countable && c.requireText ? `<p class="crit-line crit-src">登记页可能要求：${esc(c.requireText)}</p>` : ''}
  </div></div>`;
}
function trialCriteriaHTML(result) {
  const order = { miss: 0, unknown: 1, match: 2 };
  const attention = result.criteria.filter((c) => c.state !== 'match').sort((a, b) => order[a.state] - order[b.state]);
  const passed = result.criteria.filter((c) => c.state === 'match');
  return `<div class="crit-list">${attention.map(trialCriterionRowHTML).join('') || '<p class="small-note">没有 ✕ / ? 条目；仍不代表能入组，入排原文请到登记页核对。</p>'}</div>
    ${passed.length ? `<details class="crit-pass"><summary>✓ 符合项 ${passed.length} 条（折叠）</summary><div class="crit-pass-body">${passed.map(trialCriterionRowHTML).join('')}</div></details>` : ''}`;
}
function trialRegistryHTML(t) {
  const st = trialStatusMeta(t.status);
  const sponsor = (t.sponsor || []).join(' / ') || '未提供';
  const dates = (t.dates || []).join(' → ') || '未提供';
  const intervention = trialIntervention(t);
  const rows = [
    ['登记号', t.nct || t.id || '未提供'],
    ['研究类型', trialStudyLabel(t.studyType)],
    ['登记状态', `${st.text}（快照 ${t.snapshotDate || '日期未记录'}，未核实）`],
    ['申办方', sponsor],
    ['中心数', '未提供（快照字段未含中心数）'],
    ['登记日期', `${dates}（开始 / 计划完成 / 最后更新）`],
    ['登记干预', intervention ? `${intervention}（标题摘录，仅作标签）` : '未在标题中出现'],
  ];
  return `<div class="reg-grid">${rows.map(([k, v]) => `<div class="reg-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
    <p class="reg-note">登记干预 ≠ 你的检测条件；药物名称只作标签，不算进符合度分母。</p>`;
}
function trialDrawer(t, mode, trigger) {
  const result = mode === 'match' ? matchTrial(trialProfileRecord(state.profile), t) : null;
  const profileFields = trialProfileFields(state.profile);
  const nct = String(t.nct || t.id || '').replace(/[^\w-]/g, '');
  const official = `https://clinicaltrials.gov/study/${encodeURIComponent(nct)}`;
  const body = `
    <section class="drawer-sec"><h3>1. 分数与声明</h3>${trialScoreBlockHTML(result, mode)}<p class="small-note">百分数按已能判定的项计算（✓ + ✕）；? 待确认项单列，不计入分母。</p></section>
    <section class="drawer-sec"><h3>2. 判据逐条三态</h3><p class="small-note">✓ 符合 / ✕ 不符合 / ? 待确认；先列 ✕ 与 ?，✓ 折叠在最后。</p>${trialCriteriaHTML(result)}</section>
    <section class="drawer-sec"><h3>3. 档案字段（已确认）</h3>${trialFactGridHTML(profileFields)}</section>
    <section class="drawer-sec"><h3>4. 登记字段（快照）</h3>${trialRegistryHTML(t)}</section>
    <section class="drawer-sec"><h3>5. 缺失声明</h3><p class="drawer-miss">本机快照只存登记的结构化字段，入排标准请到官方登记页核对。快照日期 ${esc(t.snapshotDate || '未记录')}；登记状态未核实、会过期。</p></section>
    <section class="drawer-sec"><h3>6. 官方登记页</h3><a class="drawer-link" href="${esc(official)}" target="_blank" rel="noopener noreferrer">打开 ClinicalTrials.gov 登记页 ↗</a><p class="small-note">${esc(nct)} 真链；离开工作台后以登记页原文为准。</p></section>`;
  const foot = `<button class="soft" id="drawer-save" data-action="save-trial" data-id="${esc(t.id)}">${isTrialSaved(t.id) ? '已收藏 · 从本机移除' : '收藏到本机跟踪'}</button><button class="text-button" data-action="ask-trial" data-id="${esc(t.id)}">加进待问清单</button>`;
  drOpen({ eyebrow: '临床研究线索 · 登记详情', title: t.title, body, trigger, foot });
}
/* ---- 图表数据点：原始记录来源（日期 / 值 / 单位 / 来源类型 / 可比组） ---- */
function chartPointDrawer(id, d, trigger) {
  const pk = state.profile;
  const def = MDEFS().find((x) => x.id === id);
  if (!def) return;
  const rec = filterPrivate(recsOfDef(pk, id)).find((r) => r.measured_on === d);
  if (!rec) { toast('这条记录已被过滤或已更新'); return; }
  const report = (D.reports || []).find((r) => r.id === rec.source_ref);
  const src = rec.source_kind === 'report' ? '来自报告' : rec.source_kind === 'manual' ? '手工录入' : (rec.source_kind || '未记录');
  const rows = [
    ['指标', def.name],
    ['日期', rec.measured_on || '未记录'],
    ['值', rec.value_num != null ? `${rec.value_num}${def.unit ? ' ' + def.unit : ''}` : (rec.value_text || '文本记录')],
    ['单位', def.unit || '未记录'],
    ['来源类型', src],
    ['可比组', def.comparable_key || '未记录'],
    ['来源引用', rec.source_ref || '未记录'],
  ];
  const body = `<section class="drawer-sec"><h3>原始记录</h3>
    <div class="reg-grid">${rows.map(([k, v]) => `<div class="reg-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
    ${report && (!report.report_date || report.report_date === rec.measured_on)
      ? `<p class="small-note">关联报告：${esc(report.title)} · ${esc(report.report_date || '日期未记录')} · ${esc(report.org || '机构未记录')}</p>`
      : report ? `<p class="small-note">来源引用 ${esc(rec.source_ref)} 指向「${esc(report.title)}」；该报告日期 ${esc(report.report_date)} 与本条日期不一致，以原文为准。</p>` : ''}
    <p class="drawer-miss">只按原文记录回顾，不解读、不做参考范围判定；私密与旧版本记录不会进入图表。</p>
  </section>`;
  drOpen({ eyebrow: '病情一图秀 · 数据点', title: `${def.name} · ${d}`, body, trigger });
}

/* ---------------- dialogs / toast ---------------- */
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 2600); }
function openDialog(eyebrow, title, body, foot = '') {
  $('#dialog-eyebrow').textContent = eyebrow; $('#dialog-title').textContent = title;
  $('#dialog-body').innerHTML = body; $('#dialog-foot').innerHTML = foot;
  $('#dialog').showModal();
}
const closeDialog = () => $('#dialog').close();
function dlgProfiles() {
  openDialog('小筛宝 A1Pal', '档案 A/B', PROFILE_KEYS.map((k) => {
    const p = D.profiles[k];
    return `<button class="profile-row ${state.profile === k ? 'on' : ''}" data-pick-profile="${k}">
      <div><b>档案 ${k} · ${esc(p.name)}的资料</b><p>${esc(p.meta)} · ${esc(p.headline)} · ${esc(p.demo_label)}</p></div>
      <span class="profile-caret">${state.profile === k ? '当前' : '切换'}</span></button>`;
  }).join(''), '<button data-action="close">取消</button>');
}
function dlgExport() {
  const md = buildExportMd();
  openDialog('小筛宝 A1Pal', '导出编辑（Markdown）', `
    <textarea id="export-edit" aria-label="导出内容，可直接编辑" style="width:100%;min-height:320px;font:12px/1.7 ui-monospace,SFMono-Regular,monospace;padding:12px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);resize:vertical">${esc(md)}</textarea>
    <p class="small-note">直接在上方编辑；私密条目已由 filterPrivate() 排除，不会出现在这里。</p>`,
    '<button class="soft" data-action="close">取消</button><button class="primary" data-action="export-save">保存到资料目录（演示）</button>');
}
function dlgCandidate(id) {
  const c = rows('ai_candidates', state.profile).find((x) => String(x.id) === String(id));
  if (!c) return;
  openDialog('小筛宝 A1Pal', '核对这一项内容', `
    <div class="notice">核对表示「转录已逐字检查过」，不等于医学审核。</div>
    <label style="display:block;margin-top:10px"><span class="eyebrow">候选内容</span><input id="cand-input" style="width:100%;margin-top:6px" value="${esc(typeof c.payload === 'string' ? c.payload : JSON.stringify(c.payload))}" maxlength="200"></label>
    <p class="small-note">来源：AI 候选（拒收零副作用，不写事实层）。暂时不确定就保留待核对，不会丢。</p>`,
    `<button class="soft" data-action="cand-reject" data-id="${esc(String(c.id))}">不用这条</button><button class="primary" data-action="cand-save" data-id="${esc(String(c.id))}">接受这条记录</button>`);
}

/* ---------------- 通用录入窗（三态按钮：保存并继续录入 / 保存并关闭 / 取消） ---------------- */
const FORM_DEFS = {
  flare: {
    title: '记一次加重', eyebrow: '病程 · 一次发作',
    fields: [
      { k: 'title', label: '一句话标题', type: 'text', required: true, ph: '如「这次咳喘加重，走两层楼就喘」' },
      { k: 'started_on', label: '开始日期', type: 'date', required: true, mode: 'numeric' },
      { k: 'ended_on', label: '缓解日期（还没缓解就留空）', type: 'date', mode: 'numeric' },
      { k: 'author', label: '记录者', type: 'select', options: [['self', '本人'], ['family', '家属代记']] },
    ],
  },
  infusion: {
    title: '记一次输注', eyebrow: '输注与治疗 · 按次',
    fields: [
      { k: 'occurred_on', label: '输注日期', type: 'date', required: true, mode: 'numeric' },
      { k: 'series', label: '所属输注段', type: 'select', options: [] },
      { k: 'label', label: '名称（医生原文）', type: 'text', ph: '如「每周一次加强治疗」' },
      { k: 'note', label: '备注', type: 'text', ph: '如「左前臂，护士说下次换右侧」' },
    ],
  },
  feel: {
    title: '记一条今天的感受', eyebrow: '心理与生活 · 只属于你',
    fields: [
      { k: 'content', label: '今天想说的', type: 'textarea', required: true, ph: '不用组织语言，写成什么样都可以' },
      { k: 'occurred_on', label: '日期', type: 'date', mode: 'numeric' },
      { k: 'author', label: '记录者', type: 'select', options: [['self', '本人'], ['family', '家属代记']] },
      { k: 'private', label: '私密（默认只自己可见）', type: 'checkbox', checked: true },
    ],
  },
  question: {
    title: '加一个想问医生的问题', eyebrow: '复诊准备 · 待问',
    fields: [
      { k: 'content', label: '问题', type: 'textarea', required: true, ph: '如「下次复查要不要加做肝弹性超声？」' },
      { k: 'occurred_on', label: '想在哪次复诊问', type: 'date', mode: 'numeric' },
    ],
  },
  visit: {
    title: '记一次就诊（可多家医院）', eyebrow: '复诊准备 · 就医信息',
    fields: [
      { k: 'hospital', label: '医院 / 机构', type: 'text', required: true, ph: '如「省人民医院」' },
      { k: 'dept', label: '科室', type: 'text', required: true, ph: '如「呼吸科」「肝病科」' },
      { k: 'visited_on', label: '就诊日期', type: 'date', required: true, mode: 'numeric' },
      { k: 'contact', label: '联系方式 / 出处', type: 'text', ph: '电话，或写「以挂号页为准」' },
      { k: 'purpose', label: '这次为了什么', type: 'text', ph: '如「年度肺功能复查」' },
    ],
  },
  weight: {
    title: '记一次体重', eyebrow: '营养与生活 · 按次记录',
    fields: [
      { k: 'value', label: '体重（kg）', type: 'number', required: true, mode: 'decimal', ph: '如 62.4' },
      { k: 'measured_on', label: '称重日期', type: 'date', required: true, mode: 'numeric' },
      { k: 'note', label: '备注（同一台秤？饭前饭后？）', type: 'text', ph: '如「早饭后，家用秤」' },
    ],
  },
  family: {
    title: '记一条医生原话（家系线索）', eyebrow: '家系与基因 · 只记原话',
    fields: [
      { k: 'person_rel', label: '关系称谓', type: 'text', required: true, ph: '如「妹妹」「儿子」' },
      { k: 'doctor_quote', label: '医生原话', type: 'textarea', required: true, ph: '逐字照抄，不改写' },
      { k: 'happened_on', label: '日期', type: 'date', mode: 'numeric' },
    ],
  },
};
const formErr = { kind: null, errors: [] };
function formField(f, v) {
  const id = 'f-' + f.k;
  const req = f.required ? '<em class="req" aria-hidden="true">*</em>' : '';
  const base = `id="${id}" data-field="${f.k}" ${f.mode === 'numeric' ? 'inputmode="numeric"' : ''}`;
  if (f.mode === 'decimal') return `<label class="form-label" for="${id}">${esc(f.label)}${req}</label><input type="number" step="0.1" ${base} placeholder="${esc(f.ph || '')}" value="${esc(v || '')}">`;
  if (f.type === 'select') {
    const opts = (f.options || []).map(([val, lab]) => `<option value="${esc(val)}">${esc(lab)}</option>`).join('');
    return `<label class="form-label" for="${id}">${esc(f.label)}${req}</label><select ${base}>${opts}</select>`;
  }
  if (f.type === 'textarea') {
    return `<label class="form-label" for="${id}">${esc(f.label)}${req}</label><textarea ${base} rows="3" placeholder="${esc(f.ph || '')}">${esc(v || '')}</textarea>`;
  }
  if (f.type === 'checkbox') {
    return `<label class="check-row"><input type="checkbox" ${base} ${f.checked ? 'checked' : ''}><span>${esc(f.label)}</span></label>`;
  }
  return `<label class="form-label" for="${id}">${esc(f.label)}${req}</label><input type="${f.type}" ${base} placeholder="${esc(f.ph || '')}" value="${esc(v || '')}">`;
}
function openForm(kind, opts = {}) {
  const def = FORM_DEFS[kind];
  if (!def) return;
  formErr.kind = kind; formErr.errors = [];
  const seriesOpts = kind === 'infusion'
    ? seriesFor(state.profile).map((s) => [String(s.id), s.label || '输注段'])
    : [];
  if (seriesOpts.length) FORM_DEFS.infusion.fields[1].options = seriesOpts;
  const body = `<div class="notice plain">录入只写本机事实层；本页是演示态，保存进内存画像，刷新即回到合成示例。文本类内容只能照抄，不代写、不改写。</div>
    <div id="form-err" role="alert"></div>
    <div class="form-grid">${def.fields.map((f) => `<div class="form-row">${formField(f, opts[f.k])}</div>`).join('')}</div>`;
  openDialog(def.eyebrow, def.title, body,
    `<button class="soft" data-action="close">取消</button><button class="soft" data-action="form-save" data-mode="continue">保存并继续录入</button><button class="primary" data-action="form-save" data-mode="close">保存并关闭</button>`);
}
function readForm() {
  const def = FORM_DEFS[formErr.kind];
  const out = {}; const errs = [];
  for (const f of def.fields) {
    const el = document.querySelector(`[data-field="${f.k}"]`);
    const v = el ? (f.type === 'checkbox' ? el.checked : String(el.value || '').trim()) : '';
    if (f.required && !v) errs.push(f.label);
    out[f.k] = v;
  }
  return { out, errs };
}
function saveForm(mode) {
  const kind = formErr.kind;
  const { out, errs } = readForm();
  formErr.errors = errs;
  if (errs.length) {
    const box = $('#form-err');
    if (box) box.innerHTML = `<div class="notice warn">还有必填项没填：${errs.map((e) => esc(e)).join('、')}。填好再保存。</div>`;
    return;
  }
  const pk = state.profile, now = todayISO();
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  if (kind === 'flare') {
    D.episodes.push({ id: uid('e'), profile_key: pk, kind: 'exacerbation', started_on: out.started_on, ended_on: out.ended_on || null, title: out.title, note_ref: null, is_private: 0, in_use: 1, created_at: now });
  } else if (kind === 'infusion') {
    let sid = out.series;
    if (!sid || sid === '') {
      sid = uid('is');
      D.infusion_series.push({ id: sid, profile_key: pk, label: out.label || '新的一段输注（演示）', cadence_note: null, started_on: out.occurred_on, ended_on: null, is_private: 0, in_use: 1, created_at: now });
    }
    D.med_events.push({ id: uid('me'), profile_key: pk, kind: 'infusion', label: out.label || '加强治疗输注', occurred_on: out.occurred_on, series_id: sid, source_kind: 'manual', is_private: 0, in_use: 1, created_at: now });
  } else if (kind === 'feel' || kind === 'question') {
    D.notes.push({ id: uid('n'), profile_key: pk, kind: kind === 'feel' ? 'symptom' : 'question', author_role: out.author || 'self', content: out.content, occurred_on: out.occurred_on || null, is_private: kind === 'feel' ? (out.private ? 1 : 0) : 0, in_use: 1, created_at: now });
  } else if (kind === 'visit') {
    D.visits.push({ id: uid('v'), profile_key: pk, dept: out.dept, visited_on: out.visited_on, purpose: out.purpose || null, note_ref: null, hospital: out.hospital, contact: out.contact || null, contact_source: out.contact ? '患者口述' : null, is_private: 0, in_use: 1, corrected_by: null, created_at: now });
  } else if (kind === 'weight') {
    let def = MDEFS().find((d) => d.key && d.key.startsWith('weight'));
    if (!def) {
      def = { id: uid('wd'), profile_key: pk, key: 'weight_' + pk.toLowerCase(), name: '体重（家用秤）', group_key: 'body', unit: 'kg', unit_note: '单位形态【待核】', comparable_key: 'home-scale', ord: 9 };
      D.metric_defs.push(def);
    }
    D.metric_records.push({ id: uid('wr'), profile_key: pk, metric_id: def.id, value_num: Number(out.value), value_text: null, measured_on: out.measured_on, source_kind: 'manual', source_ref: out.note || null, is_private: 0, in_use: 1, corrected_by: null, created_at: now });
  } else if (kind === 'family') {
    D.family_lines.push({ id: uid('fl'), profile_key: pk, person_rel: out.person_rel, doctor_quote: out.doctor_quote, item_fact: null, happened_on: out.happened_on || null, is_private: 1, in_use: 1, created_at: now });
  }
  if (mode === 'continue') {
    /* 继续录入：清空字段但保持弹窗（可一口气录完一次疗程） */
    FORM_DEFS[kind].fields.forEach((f) => {
      const el = document.querySelector(`[data-field="${f.k}"]`);
      if (!el) return;
      if (f.type === 'checkbox') el.checked = !!f.checked;
      else if (f.type === 'select') el.selectedIndex = 0;
      else el.value = '';
    });
    const box = $('#form-err');
    if (box) box.innerHTML = `<div class="notice">已保存 1 条（演示）。可以接着录下一条。</div>`;
    render();
    toast('已保存并继续录入（演示）');
  } else {
    closeDialog(); render(); toast('已保存并关闭（演示）：在看板与对应页面可见');
  }
}

/* ---------------- 渲染根 ---------------- */
const VIEWS = { home: vHome, course: vCourse, records: vRecords, labs: vLabs, chart: vChart, treatment: vTreatment, family: vFamily, mind: vMind, nutrition: vNutrition, trial: vTrial, review: vReview, settings: vSettings };
/* 路由登记（navigate/applyHash 可达的全部叶子，探针按此穷举） */
const ROUTES = [
  'home', 'labs', 'chart', 'treatment', 'family', 'nutrition', 'review', 'settings',
  'course/timeline', 'course/list',
  'records/lib', 'records/draft', 'records/archive', 'records/panel', 'records/summary',
  'mind/feel', 'mind/life',
  'trial/match', 'trial/search', 'trial/saved'
];
function render() {
  window.__renderCount = (window.__renderCount || 0) + 1; /* 探针观测钩子 */
  if (DR.open) drClose(false); /* 换页/重绘时收起浮窗，避免内容指向旧数据 */
  const p = P();
  $('#nav').innerHTML = PAGES.map(([id, label, ic]) =>
    `<button class="nav-button" data-action="go" data-page="${id}" ${state.view === id ? 'aria-current="page"' : 'aria-current="false"'}>${icon(ic)}<span>${esc(label)}</span></button>`).join('');
  $('#breadcrumb').textContent = PAGES.find((x) => x[0] === state.view)[1];
  $('#profile-name').textContent = `${p.name}的资料`;
  $('#profile-meta').textContent = p.meta;
  $('#profile-avatar').textContent = p.name[0];
  $('#profile-top-name').textContent = `${state.profile} · ${p.name}`;
  $('#profile-top').setAttribute('aria-label', `切换演示档案 A / B，当前为档案 ${state.profile} ${p.name}`);
  $('#main').innerHTML = (VIEWS[state.view] || vHome)();
  $('#main').classList.remove('page-enter');
  void $('#main').offsetWidth;
  $('#main').classList.add('page-enter');
}
function navigate(page, sub) {
  if (!PAGES.some((x) => x[0] === page)) page = 'home';
  state.view = page;
  const subs = SUBPAGES[page];
  if (subs) { const ok = sub && subs.some((x) => x[0] === sub); state.sub[page] = ok ? sub : subs[0][0]; }
  else state.sub[page] = '';
  state.privateOpen = false; state.pin = null;
  const hash = subs && state.sub[page] ? `#${page}/${state.sub[page]}` : `#${page}`;
  if (location.hash !== hash) { try { history.pushState(null, '', hash); } catch (_) {} }
  render();
  $('#main').scrollTop = 0;
}
function applyHash() {
  const raw = (location.hash || '#home').slice(1);
  if (raw.startsWith('page=') || raw === 'disease-primer') return; /* 整页视图 / 概要由各自模块处理 */
  const [page, sub] = raw.split('/');
  if (!PAGES.some((x) => x[0] === page)) { state.view = 'home'; return; }
  state.view = page;
  const subs = SUBPAGES[page];
  state.sub[page] = sub && subs && subs.some((x) => x[0] === sub) ? sub : (subs ? subs[0][0] : '');
}

/* ---------------- events ---------------- */
document.addEventListener('click', (e) => {
  /* 34 号：AI 协助协议链接（aatd:agent-draft）——只填提示词，不自动发送 */
  const aiLink = e.target.closest('a[href^="aatd:agent-draft"]');
  if (aiLink) {
    e.preventDefault();
    try { const u = new URL(aiLink.getAttribute('href')); sendAgentDraft(u.searchParams.get('prompt') || ''); }
    catch (_) { toast('协议链接解析失败（演示）'); }
    return;
  }
  const navBtn = e.target.closest('[data-pick-profile]');
  if (navBtn) {
    state.profile = navBtn.dataset.pickProfile;
    state.sel[state.profile] = state.sel[state.profile] && state.sel[state.profile].length ? state.sel[state.profile] : defaultSel(state.profile);
    state.pin = null; state.privateOpen = false; state.query = '';
    closeDialog(); render();
    toast(`已切换到档案 ${state.profile} · ${P().name}（演示；两套数据独立，不串档）`);
    return;
  }
  const mcardEl = e.target.closest('.mcard[data-mcard]:not([data-static])');
  if (mcardEl) { flipCard(mcardEl.dataset.mcard); return; }
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  window.__lastAction = a; /* 探针观测钩子 */
  if (a === 'go') { navigate(el.dataset.page, el.dataset.sub || ''); return; }
  if (a === 'scene') { navigate(el.dataset.page, el.dataset.sub || ''); return; }
  if (a === 'sub-nav') { state.sub[state.view] = el.dataset.sub; state.pin = null; render(); return; }
  if (a === 'range') { state.range = el.dataset.range; window.__rangeSet = [String(el.dataset.range), String(state.range)]; render(); return; }
  if (a === 'pin') { chartPointDrawer(+el.dataset.id, el.dataset.d, el); return; }
  if (a === 'ctoggle') { const box = el.matches('input') ? el : el.querySelector('input'); if (!box) return; state.toggles[el.dataset.toggle] = box.checked; render(); return; }
  if (a === 'agent-toggle') { setAgent(!state.agentOpen); return; }
  if (a === 'agent-hide') { setAgent(false); toast('已收起面板（会话保留，草稿不丢）'); return; }
  if (a === 'toggle-private') { state.privateOpen = !state.privateOpen; render(); return; }
  if (a === 'profiles') { dlgProfiles(); return; }
  if (a === 'pick-profile') { return; } /* 由 data-pick-profile 分支处理 */
  if (a === 'settings') { navigate('settings', ''); return; }
  if (a === 'about') { openDialog('小筛宝 A1Pal', '关于', `<p style="font-size:13.5px">小筛宝 A1Pal ${APP_INFO.displayVersion} · build ${APP_INFO.build}<br>${esc(APP_INFO.channelLabel)}</p><p class="small-note">演示数据（合成示例 · 仅演示）：人物、数值与时间线不指向任何真实患者。演示数据唯一源 demo/demo-data.js。</p>`, '<button class="primary" data-action="close">关闭</button>'); return; }
  if (a === 'help') { openDialog('小筛宝 A1Pal', '原型操作说明', `<div class="notice plain">· 左侧切换 11 条一级线；二级页签在页头下方展开。<br>· 顶栏「档案 A/B」切换两套演示档案，整页联动不串档。<br>· 指标卡轻点翻面看趋势；「病情一图秀」可切时间窗、开关发作带。<br>· 「和 AI 讨论」把预写提示词带进右侧面板（只填不发；私密已过滤）。<br>· 顶栏「?」打开疾病概要整页（四段 · 每段来源行）。<br>· 所有数据为合成示例 · 仅演示；刷新重置。</div>`, '<button class="primary" data-action="close">知道了</button>'); return; }
  if (a === 'open-store') { toast('资料目录已激活（演示）'); return; }
  if (a === 'close') { closeDialog(); return; }
  if (a === 'toast') { toast(el.dataset.msg || '（演示）'); return; }
  if (a === 'source') {
    openDialog('小筛宝 A1Pal', '原件在哪', `<p style="font-size:13px">${esc(el.dataset.name)}</p>
      <p class="small-note">${el.dataset.ref ? `登记位置：${esc(el.dataset.ref)}（演示路径；工作台不改动原文）` : '未取得原件：报告还在医院 / 没拿到，这里如实空着，不冒充有原件。'}</p>`,
      '<button class="primary" data-action="close">关闭</button>');
    return;
  }
  if (a === 'candidate') { dlgCandidate(el.dataset.id); return; }
  /* 演示态不落库；真实版默认继承私密标记：接受候选时沿用来源候选 / 原件的 is_private，
   * 私密来源接受的记录默认仍私密，避免改写为公开造成泄露（口径与 filterPrivate 一致）。 */
  if (a === 'cand-save') { closeDialog(); render(); toast('已接受：写入事实层（演示）；候选留版本不覆盖'); return; }
  if (a === 'cand-reject') { closeDialog(); toast('已拒收这条候选（零副作用，事实层不变）'); return; }
  if (a === 'export-review') { dlgExport(); return; }
  if (a === 'export-save') { state.mem.docs.unshift({ id: 'ex' + Date.now().toString(36), name: `复诊准备 · ${P().name} · ${todayISO()}`, date: todayISO(), type: '导出件', note: '生成文件 · 由导出创建', ref: 'exports/' + todayISO() + '.md' }); closeDialog(); render(); toast('已保存到资料目录 exports/（演示）；在「记录与报告 · 资料库」可见'); return; }
  /* 示例问题文案唯一源：demo/demo-data.js 的 demo_prompts，按档案取 */
  if (a === 'add-question') { const q = (D.demo_prompts || {})[state.profile] || '请写下想问医生的一个问题'; if (!state.mem.questions.includes(q)) state.mem.questions.push(q); render(); toast('已加入复诊准备的问题清单'); return; }
  if (a === 'save-trial') {
    const nowSaved = toggleTrialSaved(el.dataset.id);
    if (DR.open) { if (el.id === 'drawer-save') el.textContent = nowSaved ? '已收藏 · 从本机移除' : '收藏到本机跟踪'; }
    else render();
    return;
  }
  if (a === 'trial-detail') { const t = trialById(el.dataset.trial); if (t) trialDrawer(t, el.dataset.mode || 'match', el); return; }
  if (a === 'trial-pref') { const k = el.dataset.pref; if (k && state.trialPref && Object.prototype.hasOwnProperty.call(state.trialPref, k)) { state.trialPref[k] = !state.trialPref[k]; render(); } return; }
  if (a === 'trial-reset') { state.trialQuery = { keyword: '', studyType: '', status: '' }; render(); return; }
  if (a === 'saved-state') { setSavedTrialState(el.dataset.key, el.dataset.state); render(); toast(`跟踪状态已改为「${el.dataset.state}」（本机）`); return; }
  if (a === 'ask-trial') { const t = trialById(el.dataset.id); const q = `${t ? t.id : '登记'}：入排条件与我的记录是否相符，需要带哪些材料？`; if (!state.mem.questions.includes(q)) state.mem.questions.push(q); if (!DR.open) render(); toast('已加入待问清单（以研究中心答复为准）'); return; }
  if (a === 'drawer-close') { drClose(); return; }
  if (a === 'open-page') { pvOpen(el.dataset.page, el); return; }
  if (a === 'pv-back') { pvClose(); return; }
  if (a === 'pv-close') { pvApplyClose(); try { if (history.state && history.state.pv) history.back(); } catch (_) {} return; }
  if (a === 'dp-close') { dpClose(); return; }
  if (a === 'font') { toggleFont(); return; }
  if (a === 'settings-tab') { state.cfgTab = el.dataset.tab; render(); return; }
  if (a === 'entry') { openForm(el.dataset.kind); return; }
  if (a === 'form-save') { saveForm(el.dataset.mode); return; }
  if (a === 'mineru-consent') { state.mineru.consent = el.checked; render(); return; }
  if (a === 'mineru-save') {
    const input = document.querySelector('[data-mineru-token]');
    const raw = input ? String(input.value || '').trim() : '';
    /* 只显示后 4 位（评审 C3 口径）：空输入不覆盖已保存掩码 */
    if (raw) state.mineru.tokenMasked = '••••' + raw.slice(-4);
    render();
    toast('已保存（演示）：本仓未接入 MinerU，保存不联网、不写密钥文件');
    return;
  }
});
/* 深链接 #page=xxx：刷新后按当前档案重建 */
function pvFromHash() {
  const m = (location.hash || '').match(/^#page=(\w[\w-]*)$/);
  if (m && pvRegistry(m[1]) && !PV.open) { pvOpen(m[1], document.querySelector('[data-primer-open]')); }
}
document.addEventListener('input', (e) => {
  if (e.target.matches('[data-action="records-search"]')) {
    state.query = e.target.value;
    const wrap = $('#docs-table');
    if (wrap) wrap.innerHTML = docsTable(); /* 只重画表格，保持输入框焦点 */
  }
  if (e.target.matches('[data-trial-q]')) {
    state.trialQuery.keyword = e.target.value;
    const box = $('#trial-results');
    if (box) box.innerHTML = trialSearchRowsHTML(); /* 只重画结果，保持输入框焦点 */
  }
});
document.addEventListener('change', (e) => {
  const tf = e.target.closest('[data-trial-filter]');
  if (tf) {
    state.trialQuery[tf.dataset.trialFilter] = tf.value;
    const box = $('#trial-results');
    if (box) box.innerHTML = trialSearchRowsHTML();
    return;
  }
  const sel = e.target.closest('[data-sel]');
  if (sel) {
    const id = +sel.dataset.sel;
    const arr = state.sel[state.profile];
    if (sel.checked) {
      if (arr.includes(id)) { render(); return; }
      if (arr.length >= 4) { sel.checked = false; toast('最多同时看 4 项化验；先取消一个再加。'); return; }
      arr.push(id);
    } else {
      if (arr.length === 1) { sel.checked = true; toast('至少留一项。'); return; }
      state.sel[state.profile] = arr.filter((x) => x !== id);
    }
    render();
  }
});
/* Esc 一层一退：疾病概要 > 整页视图 > 弹窗。
   mcard 是原生 button：Enter / 空格由浏览器触发 click 翻面，这里不重复处理。 */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (DR.open) { e.preventDefault(); drClose(); return; }
  if (DP.open) { e.preventDefault(); dpClose(); return; }
  if (PV.open) { e.preventDefault(); pvClose(); return; }
  if ($('#dialog').open) { e.preventDefault(); closeDialog(); return; }
});
window.addEventListener('popstate', () => {
  if (DP.open) { dpApplyClose(); return; }
  if (PV.open && !(history.state && history.state.pv)) { pvApplyClose(); }
  applyHash(); render();
});
window.addEventListener('hashchange', () => { applyHash(); render(); });

function toggleFont() {
  const on = document.body.classList.toggle('large');
  ['#font-toggle', '#font-toggle-2'].forEach((s) => { const b = $(s); if (b) b.setAttribute('aria-pressed', String(on)); });
  const b2 = $('#font-toggle-2'); if (b2) b2.textContent = `大字模式 ${on ? '关' : '开'}`;
}
$('#font-toggle').addEventListener('click', toggleFont);

/* splitter：1px 线 + 11px 热区；拖动 25–45%；方向键步进 2% */
(() => {
  const spl = $('#agent-splitter'), pane = $('#agent-pane');
  if (!spl || !pane) return;
  let dragging = false;
  spl.addEventListener('pointerdown', (e) => { dragging = true; try { spl.setPointerCapture(e.pointerId); } catch (_) {} });
  spl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const stage = spl.parentElement.getBoundingClientRect();
    const pct = Math.min(45, Math.max(25, ((stage.right - e.clientX) / stage.width) * 100));
    pane.style.width = pct + '%';
    spl.setAttribute('aria-valuenow', String(Math.round(pct)));
  });
  spl.addEventListener('pointerup', () => { dragging = false; });
  spl.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const cur = parseInt(spl.getAttribute('aria-valuenow') || '35', 10);
    const next = Math.min(45, Math.max(25, cur + (e.key === 'ArrowRight' ? 2 : -2)));
    pane.style.width = next + '%';
    spl.setAttribute('aria-valuenow', String(next));
  });
})();

/* 打印展开（32 号：beforeprint 全展开，afterprint 还原） */
(() => {
  let prior = null;
  window.addEventListener('beforeprint', () => {
    const folds = $$('#main details.phase-fold');
    prior = folds.map((d) => d.open);
    folds.forEach((d) => { d.open = true; });
  });
  window.addEventListener('afterprint', () => {
    if (!prior) return;
    $$('#main details.phase-fold').forEach((d, i) => { d.open = Boolean(prior[i]); });
    prior = null;
  });
})();

/* ---------------- boot ---------------- */
(function boot() {
  const initialHash = (location.hash || '').slice(1);
  if (initialHash && !initialHash.startsWith('page=') && initialHash !== 'disease-primer') {
    const [pg, sub] = initialHash.split('/');
    if (PAGES.some((x) => x[0] === pg)) { state.view = pg; if (sub) state.sub[pg] = sub; }
  }
  render();
  if (EMBEDDED()) setAgent(false); /* 34 号 2b：嵌入式下自有演示面板整体隐藏，原生会话是唯一 AI 面板 */
  pvFromHash();
})();
