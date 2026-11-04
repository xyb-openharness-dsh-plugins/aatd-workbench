/* 文档导入（MinerU 真实解析 → ai_candidates 候选）。
 *
 * 链路：POST /api/aatd/import（原始文件字节 + ?name=&profile=）→ MinerU v4 解析 → full.md
 *      → 本文件抽指标候选 → 写 import_batches + ai_candidates（status='pending'）→ 前端逐条核对。
 *
 * 四条不可让步（家族契约，docs/18 号 v2；别为了"智能"放宽）：
 * 1. **只抄写不推测**：报告里没有的指标不生成候选；数值只做"字符串 → 数字"的搬运，
 *    单位换算、参考范围判定、缺失补齐全部不做。
 * 2. **候选不是记录**：解析只写 ai_candidates（status='pending'），不碰 metric_records /
 *    reports 等事实表。用户"接受"才落记录，且接受本身也不自动写事实表（接受 ≠ 医学审核）。
 * 3. **拒收零副作用**：reject 只改候选状态；解析失败一个候选都不写，原件保留可重试。
 * 4. **先转竖线表再对齐、先剥 LaTeX 外壳再认单位**：MinerU 的表格是 HTML `<table>`，
 *    先剥标签会整表压成一行、静默串位；单位是 `$10^9/L$` 这类 LaTeX，不剥壳界面原样显示。
 *
 * 按位置对齐的纯函数复用 examples/mineru-labparse-align.mjs（docs/18 号的参考实现）。
 */
import { createMineruClient, MineruError, isSupportedExtension } from './mineru.js';
import {
  buildMetricMatcher, parseResultValue, normalizeUnit, alignPositional,
  htmlTablesToPipes, splitMarkdownRow,
} from '../examples/mineru-labparse-align.mjs';

export { MineruError };

/** AATD 指标字典：name/alias → metric_defs.key（按仓内目录写死；不认识的行整行放弃）。 */
export const LAB_DICT = [
  { key: 'aat_a', names: ['血清AAT浓度', 'AAT浓度', 'α1-抗胰蛋白酶', '抗胰蛋白酶', 'AAT'] },
  { key: 'fev1_a', names: ['FEV1占预计值', 'FEV1%预计值', 'FEV1'] },
  { key: 'dlco', names: ['DLCO占预计值', 'DLCO', '一氧化碳弥散量'] },
  { key: 'alt_a', names: ['ALT', '谷丙转氨酶', '丙氨酸氨基转移酶'] },
  { key: 'ggt_a', names: ['GGT', '谷氨酰转肽酶', 'γ-谷氨酰转肽酶'] },
  { key: 'ast', names: ['AST', '谷草转氨酶', '天冬氨酸氨基转移酶'] },
  { key: 'alb', names: ['白蛋白', 'ALB'] },
  { key: 'wbc', names: ['白细胞计数', '白细胞', 'WBC'] },
  { key: 'neut', names: ['中性粒细胞绝对值', '中性粒细胞', 'NEUT#', 'ANC'] },
  { key: 'plt', names: ['血小板计数', '血小板', 'PLT'] },
  { key: 'hgb', names: ['血红蛋白', 'HGB', 'Hb'] },
  { key: 'crp', names: ['C反应蛋白', 'CRP'] },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 空格归一匹配器：单元格文本去掉空白后进字典匹配（"血清 AAT 浓度" ↔ 血清AAT浓度）。 */
function buildSpaceFreeMatcher() {
  const base = buildMetricMatcher(LAB_DICT.map((d) => ({ code: d.key, names: d.names })));
  return (text) => base(String(text ?? '').replace(/\s+/g, ''));
}

/** LaTeX 外壳剥离（18 号 §7.1）：先剥 $…$、\(…\)、\[…\]、\text{}/\mathrm{}、\mu、花括号；
 *  认不出的只剥壳、不推断。 */
export function stripLatexShell(text) {
  let t = String(text ?? '');
  t = t.replace(/\$\s*([^$]*)\s*\$/g, '$1');
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$1').replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  t = t.replace(/\\(?:text|mathrm|mbox)\{([^{}]*)\}/g, '$1');
  t = t.replace(/\\mu\b/g, 'μ').replace(/\\cdot/g, '·').replace(/\\times/g, '×');
  t = t.replace(/\\([%_&#])/g, '$1'); /* LaTeX 转义字符剥壳（\% → %）；认不出的反斜杠保留，不推断 */
  t = t.replace(/\{([^{}]*)\}/g, '$1');
  return t.trim();
}

/** 一段 markdown → 行数组：先 htmlTablesToPipes（绝不能先剥标签），再按行切。 */
export function markdownToLines(markdown) {
  return htmlTablesToPipes(String(markdown ?? '')).split(/\r?\n/);
}

const isTableLine = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');
const isSeparator = (line) => /^\|[\s:|-]+\|$/.test(line.trim());
const NUM_RE = /^[<>≥≤]?\s*-?\d+(?:\.\d+)?$/;

/**
 * 从 markdown 抽候选（行式表：项目 | 结果 | 单位）。返回 [{key, name, valueText, valueNum, unit, line}]。
 * 参考范围（两数一格 / "3.5-9.5"）整行放弃，不当成结果值。
 */
export function extractRowCandidates(markdown) {
  /* 单元格里常带空格（"血清 AAT 浓度"），字典键不带：匹配前把空格归一掉（只影响匹配，
     不改写原文——候选里的 name 仍是原单元格文本）。 */
  const match = buildSpaceFreeMatcher();
  const lines = markdownToLines(markdown);
  const candidates = [];
  const skipped = [];
  const seen = new Set();
  let i = 0;
  while (i < lines.length) {
    if (!isTableLine(lines[i])) { i += 1; continue; }
    const start = i;
    while (i < lines.length && isTableLine(lines[i])) i += 1;
    const blockLines = lines.slice(start, i).filter((l) => !isSeparator(l));
    if (blockLines.length < 2) continue;
    const header = blockLines[0].slice(1, -1).split('|').map((c) => stripLatexShell(c.trim()));
    const idxName = header.findIndex((h) => /项目|指标|名称|检验|item|test/i.test(h));
    const idxVal = header.findIndex((h) => /结果|数值|value|result/i.test(h));
    const idxUnit = header.findIndex((h) => /单位|unit/i.test(h));
    if (idxName === -1 || idxVal === -1) continue;
    for (const line of blockLines.slice(1)) {
      const cells = line.slice(1, -1).split('|').map((c) => stripLatexShell(c.trim()));
      const nameCell = cells[idxName] ?? '';
      const key = match(nameCell);
      if (!key) continue;
      const val = parseResultValue(cells[idxVal] ?? '');
      if (!val) { skipped.push({ name: nameCell, cell: cells[idxVal] ?? '', reason: '不是单一数值（参考范围/文字）' }); continue; }
      const unitCell = idxUnit >= 0 ? stripLatexShell(cells[idxUnit] ?? '') : '';
      const unit = unitCell ? normalizeUnit(unitCell) : null;
      if (unitCell && unit === null) { skipped.push({ name: nameCell, cell: unitCell, reason: '单位不认识（只剥壳不推断）' }); continue; }
      const dedupe = `${key}:${val.valueText}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      candidates.push({ key, name: nameCell, valueText: val.valueText, valueNum: val.valueNum, unit, line: start + 1 });
    }
  }
  return { candidates, skipped };
}

/**
 * 位置对齐通道（MinerU 把整表塞进一个单元格时）：labels 行 + values 行按位置配对，
 * 数量不符整行放弃（宁可漏一条让用户手填，不能把 N 个指标写成同一个数）。
 */
export function extractAlignedCandidates(markdown) {
  const match = buildSpaceFreeMatcher();
  const out = [];
  const rows = markdownToLines(markdown)
    .map(splitMarkdownRow)
    .filter(Boolean)
    .filter((cells) => !cells.every((c) => /^[-:\s]*$/.test(c)));
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i].filter((c) => match(c)).length < 2) continue;
    const valueRow = rows[i + 1];
    if (valueRow.filter((c) => NUM_RE.test(c)).length === 0) break;
    const after = rows[i + 2] ?? [];
    const units = after.length === valueRow.length && after.length > 0
      && after.every((c) => !NUM_RE.test(c)) && after.some((c) => c)
      ? after.map((c) => stripLatexShell(c))
      : [];
    const aligned = alignPositional(match, rows[i].map((c) => stripLatexShell(c)), valueRow, units) || [];
    for (const a of aligned) {
      out.push({ key: a.code, name: a.code, valueText: a.valueText, valueNum: a.valueNum, unit: a.unit ?? null, line: i + 1 });
    }
    return out;
  }
  return out;
}

/** 报告日期：文件名或正文里的 YYYY-MM-DD / YYYY年M月D日。取不到就是 null（不猜今天）。 */
export function guessReportDate(text, fallback = null) {
  const m = String(text ?? '').match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (!m) return fallback;
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}

/**
 * 导入服务：把「文件 → MinerU → 候选」串起来，并负责落库（只写候选 + 批次，不碰事实表）。
 * db 必须是已 migrate 的库；不传 client 时不联网（单测注入 parse 函数即可）。
 */
export class ImportService {
  constructor(db, { client = null, parseFn = null } = {}) {
    this.db = db;
    this.client = client;
    /* parseFn 注入点：单测给 (bytes, filename) => {markdown, engine}，不联网。 */
    this.parseFn = parseFn;
  }

  /** 纯解析：不落库，返回 {markdown, candidates, skipped, document}。 */
  async parse(buffer, { filename = 'document.pdf', profileKey = 'A' } = {}) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new MineruError('BAD_INPUT', '文件是空的');
    if (!isSupportedExtension(filename)) {
      throw new MineruError('BAD_INPUT', 'MinerU 当前不支持此文件类型（.html 也不收）；可保留原件并手工录入。');
    }
    if (!this.client && !this.parseFn) throw new MineruError('NO_TOKEN', '没有可用的 MinerU 客户端（缺 token？）');
    const ext = filename.toLowerCase().match(/\.[a-z0-9]+$/)[0];
    const parsed = this.parseFn
      ? await this.parseFn(buffer, filename)
      : await this.client.parse({ bytes: buffer, filename });
    const markdown = parsed.markdown ?? '';

    /* 行式与位置对齐两条通道合流；同一指标取先到的那条（seen 去重）。 */
    const rowResult = extractRowCandidates(markdown);
    const aligned = extractAlignedCandidates(markdown);
    const seen = new Set(rowResult.candidates.map((c) => `${c.key}:${c.valueText}`));
    const merged = [...rowResult.candidates];
    for (const c of aligned) {
      const dedupe = `${c.key}:${c.valueText}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      merged.push(c);
    }

    const date = guessReportDate(filename) ?? guessReportDate(markdown.slice(0, 4000)) ?? null;
    return {
      markdown,
      candidates: merged,
      skipped: rowResult.skipped,
      engine: parsed.engine ?? 'mineru-api',
      document: { profileKey, name: filename, date, type: '报告原件', status: '已解析', pages: parsed.pages ?? null },
    };
  }

  /**
   * 落库：import_batches 一行 + ai_candidates 逐条（status='pending'）。同事务，失败整体回滚。
   * **不写任何事实表**——候选在核对前不进 metric_records / reports（拒收零副作用的前提）。
   */
  record({ profileKey, document, candidates = [], skipped = [], engine = 'mineru-api' }) {
    this.db.exec('BEGIN');
    try {
      const batch = this.db.prepare('INSERT INTO import_batches (profile_key, source_kind, imported_at, note) VALUES (?,?,?,?)')
        .run(profileKey, engine, new Date().toISOString(), `${document.name}${document.date ? ` · 报告日期 ${document.date}` : ''}`);
      const batchId = Number(batch.lastInsertRowid);
      const insCand = this.db.prepare('INSERT INTO ai_candidates (profile_key, target_table, payload, status, created_at) VALUES (?,?,?,?,?)');
      const now = new Date().toISOString();
      for (const c of candidates) {
        insCand.run(profileKey, 'metric_records', JSON.stringify({
          metric_key: c.key,
          value_num: c.valueNum,
          value_text: c.valueNum === null ? c.valueText : null,
          measured_on: document.date,
          unit: c.unit ?? null,
          source: `${document.name} · 第 ${c.line ?? '?'} 行 · 尚未核对原件`,
        }), 'pending', now);
      }
      if (this.db.prepare('SELECT COUNT(*) AS n FROM import_maps').get().n === 0) {
        const insMap = this.db.prepare('INSERT INTO import_maps (batch_id, field_from, field_to, rule) VALUES (?,?,?,?)');
        insMap.run(batchId, '项目/结果/单位', 'metric_records.value_num|value_text', '只抄写不推测；可比组不变；单位只剥 LaTeX 外壳不换算');
      }
      if (this.db.prepare('SELECT COUNT(*) AS n FROM import_conflicts WHERE batch_id = ?').get(batchId).n === 0 && skipped.length) {
        const insConflict = this.db.prepare('INSERT INTO import_conflicts (batch_id, entity_table, payload, reason, resolved_at) VALUES (?,?,?,?,NULL)');
        insConflict.run(batchId, 'metric_records', JSON.stringify(skipped), '整行放弃：不是单一数值或单位不认识');
      }
      this.db.exec('COMMIT');
      return { batchId, candidates: candidates.length, skipped: skipped.length };
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch { /* 原始错误优先 */ }
      throw error;
    }
  }

  /**
   * 接受 / 拒收一条候选：**只改候选状态，不写任何事实表**（接受 ≠ 医学审核；
   * 拒收零副作用）。状态迁移：pending → accepted | rejected；终态不可再改。
   */
  decide(candidateId, status) {
    if (!['accepted', 'rejected'].includes(status)) throw new MineruError('BAD_INPUT', '状态只能是 accepted / rejected');
    const row = this.db.prepare('SELECT id, status FROM ai_candidates WHERE id = ?').get(candidateId);
    if (!row) throw new MineruError('NOT_FOUND', `没有这条候选：${candidateId}`);
    if (row.status !== 'pending') throw new MineruError('BAD_STATE', `这条候选已是 ${row.status}，终态不可再改`);
    const r = this.db.prepare('UPDATE ai_candidates SET status = ? WHERE id = ?').run(status, candidateId);
    return { changed: r.changes, id: candidateId, status };
  }
}

/** 默认客户端：从密钥文件 / 环境变量取 token（显式 > 文件 > env，18 号 v2）。 */
export function createImportService(db, options = {}) {
  const client = options.client ?? createMineruClient(options);
  return new ImportService(db, { client, parseFn: options.parseFn });
}
