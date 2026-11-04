/* 导出：把档案整理成一份「复诊材料」markdown（给用户带去门诊，不是病历）。
 *
 * 三条硬约束：
 * 1. **私密条目不进导出**（三出口之一在服务端的闸门）：notes / episodes / med_events /
 *    infusion_series / reports 里 is_private=1 的一律不写；更正链旧版本（corrected_by
 *    非空）一律不写——即便调用方传了 includePrivate 也只影响页面，导出侧一律剔除。
 *    家系线索（family_lines）涉及他人健康信息，整节不进导出。
 * 2. **只抄不解释**：数值、日期、原话照抄；不写"建议/可能/需要注意/恶化好转"这类判读词。
 * 3. **口径同屏**：导出头部写明「仅回顾，不解读；解读归医生」。
 */

import { filterPrivateRows } from './readmodels.js';

const LINE = '\n';
const fmtDate = (d) => (d === null || d === undefined || d === '' ? '未记录' : d);

/**
 * 生成一份档案的复诊材料 markdown。
 * @param {object} db 已 migrate 的库
 * @param {string} profileKey 档案键
 * @param {object} [opts]
 * @param {string|null} [opts.generatedAt] ISO 时间；不传则不写时间（避免"看起来像刚出的报告"）
 * @param {string|null} [opts.version]
 * @returns {{ markdown: string, excludedPrivate: number, filename: string }}
 */
export function renderPrepMarkdown(db, profileKey, { generatedAt = null, version = null } = {}) {
  const p = db.prepare('SELECT * FROM profiles WHERE profile_key = ?').get(profileKey);
  if (!p) return null;
  const name = p.display_name;

  const defs = db.prepare('SELECT * FROM metric_defs WHERE profile_key = ? ORDER BY ord, rowid').all(profileKey);
  const recs = (defId) => db.prepare('SELECT * FROM metric_records WHERE profile_key = ? AND metric_id = ? AND in_use = 1 ORDER BY measured_on, rowid')
    .all(profileKey, defId);
  const notesAll = db.prepare('SELECT * FROM notes WHERE profile_key = ? AND in_use = 1 ORDER BY rowid').all(profileKey);
  const notes = filterPrivateRows(notesAll);
  const epsAll = db.prepare('SELECT * FROM episodes WHERE profile_key = ? AND in_use = 1 ORDER BY started_on, rowid').all(profileKey);
  const eps = filterPrivateRows(epsAll);
  const series = db.prepare('SELECT * FROM infusion_series WHERE profile_key = ? AND in_use = 1 ORDER BY rowid').all(profileKey);
  const reportsAll = db.prepare('SELECT * FROM reports WHERE profile_key = ? AND in_use = 1 ORDER BY rowid').all(profileKey);
  const reports = filterPrivateRows(reportsAll);
  const meds = filterPrivateRows(db.prepare("SELECT * FROM med_events WHERE profile_key = ? AND in_use = 1 AND kind = 'medication' ORDER BY rowid").all(profileKey));
  const visits = db.prepare('SELECT * FROM visits WHERE profile_key = ? AND in_use = 1 ORDER BY visited_on, rowid').all(profileKey);

  /* 私密计数如实标注（条数可见，内容不可见） */
  const excludedPrivate = (list) => list.filter((x) => x.is_private).length;
  const privateTotal = excludedPrivate(notesAll) + excludedPrivate(epsAll)
    + excludedPrivate(reportsAll) + excludedPrivate(series) + excludedPrivate(meds);

  const out = [];
  out.push(`# 复诊材料 · ${name}`);
  out.push('');
  out.push(`- 档案：${name}（${p.meta ?? '—'}）`);
  out.push('- 受累器官：肺（呼吸科随访）+ 肝（肝病科随访）——两路化验都带上');
  out.push('- 本文件由本人从工作台导出，内容为本人记录的抄录，不是医院病历，也不是医生结论；仅回顾，不解读。');
  if (generatedAt) out.push(`- 导出时间：${generatedAt}`);
  if (version) out.push(`- 工作台版本：${version}`);

  /* 一、最近化验（只抄数值与方法，可比组原样带出；跨组不合并，口径 5） */
  out.push(`${LINE}## 最近化验（事实，按可比组分行）${LINE}`);
  defs.forEach((d) => {
    const rs = recs(d.id);
    const last = rs[rs.length - 1];
    out.push(`- ${d.name}：${last ? (last.value_num != null ? `${last.value_num} ${d.unit || ''}` : (last.value_text || '文本记录')) + `（${fmtDate(last.measured_on)}）` : '暂无记录（未检测不等于阴性）'}`);
  });

  /* 二、发作—缓解（最近 3 条，私密不进导出） */
  out.push(`${LINE}## 发作—缓解（最近 3 条）${LINE}`);
  const recent = eps.slice(-3).reverse();
  (recent.length ? recent : ['（没有可导出的发作记录）']).forEach((e) => {
    out.push(typeof e === 'string' ? `- ${e}` : `- ${e.started_on} → ${e.ended_on || '缓解未记录'}：${e.title || ''}`);
  });

  /* 三、输注（按段；计次读时算，口径 6） */
  if (series.length) {
    out.push(`${LINE}## 输注（按段）${LINE}`);
    series.forEach((s) => {
      const evs = db.prepare('SELECT occurred_on FROM med_events WHERE series_id = ? AND in_use = 1 AND occurred_on IS NOT NULL ORDER BY occurred_on')
        .all(s.id).map((r) => r.occurred_on);
      const gaps = [];
      if (evs.length) {
        const actual = new Set(evs);
        const lastActual = evs[evs.length - 1];
        const until = s.ended_on && s.ended_on < lastActual ? s.ended_on : (s.ended_on || lastActual);
        let d = s.started_on;
        while (d <= until) {
          if (!actual.has(d)) gaps.push(d);
          d = new Date(Date.parse(d) + 7 * 86400000).toISOString().slice(0, 10);
        }
      }
      out.push(`- ${s.label}：${s.started_on} → ${s.ended_on || '进行中'}，已记 ${evs.length} 次${gaps.length ? `，缺口周 ${gaps.length} 个（${gaps.join('、')}）` : ''}`);
    });
  }

  /* 四、用药（长期维持 / 急性期按需，照抄医嘱原话） */
  if (meds.length) {
    out.push(`${LINE}## 用药（医嘱原话照抄）${LINE}`);
    meds.forEach((m) => out.push(`- ${fmtDate(m.occurred_on)}：${m.label}`));
  }

  /* 五、报告（私密报告只计数不带内容） */
  if (reports.length) {
    out.push(`${LINE}## 报告与原件${LINE}`);
    reports.forEach((r) => {
      out.push(`- ${r.title}（${r.org || '机构未记录'}${r.report_date ? ` · ${r.report_date}` : ''}）：${r.summary_text || '—'}${r.file_ref ? `；原件：${r.file_ref}` : '；原件未取得'}`);
    });
  }

  /* 六、就诊（复诊节奏参考） */
  if (visits.length) {
    out.push(`${LINE}## 就诊记录（最近 3 次）${LINE}`);
    visits.slice(-3).forEach((v) => out.push(`- ${v.visited_on} ${v.dept}：${v.purpose || ''}`));
  }

  /* 七、医生原话（原文） */
  out.push(`${LINE}## 医生原话（原文）${LINE}`);
  notes.filter((n) => n.kind === 'doctor_quote').forEach((n) => out.push(`- ${fmtDate(n.occurred_on)}：${n.content}`));

  /* 八、我的症状与想问的事（不是医生结论） */
  out.push(`${LINE}## 我的症状与想问的事（不是医生结论）${LINE}`);
  notes.filter((n) => n.kind === 'symptom' || n.kind === 'question' || n.kind === 'caregiver')
    .forEach((n) => out.push(`- ${fmtDate(n.occurred_on)}：${n.content}`));

  if (privateTotal) {
    out.push(`${LINE}（私密 ${privateTotal} 条与家系线索默认不进本导出；三出口共用同一过滤。）`);
  }
  out.push(`${LINE}> 本文件由工作台整理，不构成医疗建议；判读归呼吸 / 肝病团队。`);
  out.push('');

  return {
    markdown: out.join(LINE),
    excludedPrivate: privateTotal,
    filename: `复诊材料-${name}-${new Date().toISOString().slice(0, 10)}.md`,
  };
}
