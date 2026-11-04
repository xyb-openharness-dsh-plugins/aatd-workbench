/* AATD 工作台 · 初始数据模型（0001）
 *
 * 家族四条契约（与家族各仓同源，改这里等于改契约）：
 *   1. 看法恒不为结论：notes 只存记录，不设 is_conclusion 类判定列；
 *   2. 显式 null，不用空串冒充缺失；缺失项显式留空；
 *   3. 更正只新增版本，不覆盖：各事实表带 corrected_by（自引用），旧版本保留 in_use=0；
 *   4. 事实四层不合并：文档 / 候选 / 记录 / 指标分表存放。
 *
 * AATD 独有口径（读模型与前端按此执行）：
 *   A. **无任何判定列**：不设 diagnosis / risk_level / severity / progression 类列。
 *      基因型（SERPINA1 型别）按医生原话存 notes 或 profile.meta，不做分层。
 *   B. **肺功能与肝功能分节**：metric_def.group_key = 'lung' | 'liver'；跨组不做差、不合并、不连线。
 *   C. **可比组**：metric_record 不得跨 comparable_key 连线；同日多条按 rowid 先后，不做"前次"推断。
 *   D. **输注按次**：med_event 存单次输注；infusion_series 只存段的起止与口径说明，计次由读模型实时算，不落库。
 *   E. **发作—缓解区间**：episode 存起止日期与记录者，"发作中第 N 天 / 距上次发作 N 天"由读模型算。
 *   F. **家系线索只记原话**：family_line 存医生原话/条目事实 + 日期 + 记录者，无风险判定列。
 *   G. **私密默认**：notes.is_private / episode.is_private 缺省 0；家系线索涉及他人健康信息的条目缺省 1（is_private）。
 *
 * 分节标题进 section_titles 表（家族教训：不用一排 *_title 列，加一节只加一行）。
 *
 * 迁移只增不改：本文件冻结后（sha256 见 freeze-contract.md），
 * 要加结构只能新增 0002_*.sql，改这里会被 check-schema 类检查拦下。
 */

/* ---------- 档案级（2） ---------- */

CREATE TABLE profiles (
  profile_key   TEXT PRIMARY KEY,   -- 'A' | 'B'（演示）或真实档案键
  display_name  TEXT,
  record_mode   TEXT,               -- 'self' | 'family'：本条档案默认记录者
  meta          TEXT,               -- 侧栏第二行（基因型原话摘要 · 受累器官 · 随访科室），不判定
  headline      TEXT,               -- 看板顶部一句病情摘要（患者语言）
  demo_label    TEXT,               -- '合成示例 · 仅演示'（A/B 套标注，真实档案为 NULL）
  created_at    TEXT
);

CREATE TABLE care_context (
  profile_key   TEXT,
  key           TEXT,               -- 口径说明条目键
  value         TEXT,               -- 如「不同方法不合并」
  ord           INTEGER
);

/* ---------- 指标（3） ---------- */

CREATE TABLE metric_defs (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  key           TEXT,               -- 如 fev1 / dlco / alt / ggt
  name          TEXT,
  group_key     TEXT,               -- 'lung' | 'liver'（口径 B）
  unit          TEXT,
  comparable_key TEXT,              -- 方法/单位/机构可比组（口径 C）
  ord           INTEGER
);

CREATE TABLE metric_records (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  metric_id     INTEGER,            -- -> metric_defs.id
  value_num     REAL,               -- 显式 null：文本值或缺失不写 0
  value_text    TEXT,
  measured_on   TEXT,               -- ISO 日期；未知日期为 NULL（口径 2）
  source_kind   TEXT,               -- 'manual' | 'report' | 'ai_candidate'
  source_ref    TEXT,               -- report.id 或录入上下文
  is_private    INTEGER DEFAULT 0,
  in_use        INTEGER DEFAULT 1,
  corrected_by  INTEGER,            -- 更正=新增版本（契约 3）
  created_at    TEXT
);

CREATE TABLE reports (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  title         TEXT,
  kind          TEXT,               -- 'pulmonary_function' | 'liver_panel' | 'imaging' | 'genetic' | 'other'
  report_date   TEXT,
  org           TEXT,               -- 机构
  file_ref      TEXT,               -- 原件引用（本机路径/登记名），未取得原件为 NULL
  summary_text  TEXT,               -- 报告要点，仅回顾
  is_private    INTEGER DEFAULT 0,
  in_use        INTEGER DEFAULT 1,
  corrected_by  INTEGER,
  created_at    TEXT
);

/* ---------- 通用（7） ---------- */

CREATE TABLE notes (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  kind          TEXT,               -- 'symptom' | 'doctor_quote' | 'question' | 'caregiver'
  author_role   TEXT,               -- 'self' | 'family'：记录者（家属代记必标）
  content       TEXT,               -- 原话/自述，不重述判定
  occurred_on   TEXT,               -- 可为 NULL（未知日期）
  is_private    INTEGER DEFAULT 0,
  in_use        INTEGER DEFAULT 1,
  corrected_by  INTEGER,
  created_at    TEXT
);

CREATE TABLE med_events (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  kind          TEXT,               -- 'infusion' | 'medication' | 'procedure'
  label         TEXT,
  occurred_on   TEXT,
  series_id     INTEGER,            -- -> infusion_series.id（输注类必填）
  source_kind   TEXT,
  is_private    INTEGER DEFAULT 0,
  in_use        INTEGER DEFAULT 1,
  corrected_by  INTEGER,
  created_at    TEXT
);

CREATE TABLE episodes (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  kind          TEXT,               -- 'exacerbation' | 'symptom_period'（发作—缓解区间，口径 E）
  started_on    TEXT,
  ended_on      TEXT,               -- NULL = 缓解未记录（仍开放）
  title         TEXT,               -- 患者语言标题（如「这次加重住了 X 天」）
  note_ref      INTEGER,            -- -> notes.id 医生原话
  is_private    INTEGER DEFAULT 0,
  in_use        INTEGER DEFAULT 1,
  corrected_by  INTEGER,
  created_at    TEXT
);

CREATE TABLE visits (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  dept          TEXT,               -- '呼吸科' | '肝病科' | '其他'
  visited_on    TEXT,
  purpose       TEXT,
  note_ref      INTEGER,
  is_private    INTEGER DEFAULT 0,
  in_use        INTEGER DEFAULT 1,
  corrected_by  INTEGER,
  created_at    TEXT
);

CREATE TABLE doc_refs (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  title         TEXT,
  kind          TEXT,               -- 'original' | 'copy' | 'secondary'
  ref           TEXT,
  note          TEXT,
  in_use        INTEGER DEFAULT 1,
  created_at    TEXT
);

CREATE TABLE ai_candidates (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  target_table  TEXT,               -- 候选写入的事实表
  payload       TEXT,               -- JSON 候选体
  status        TEXT,               -- 'pending' | 'accepted' | 'rejected'（拒收零副作用：不写事实表）
  created_at    TEXT
);

CREATE TABLE audit_log (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  action        TEXT,
  entity_table  TEXT,
  entity_id     INTEGER,
  at            TEXT
);

/* ---------- 专属（3） ---------- */

CREATE TABLE infusion_series (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  label         TEXT,               -- 如「2026 年加强治疗段」（口径 D：只存段，不存判定）
  cadence_note  TEXT,               -- 医生原话的频次描述，如「每周一次」；无则 NULL
  started_on    TEXT,
  ended_on      TEXT,               -- NULL = 进行中
  is_private    INTEGER DEFAULT 0,
  in_use        INTEGER DEFAULT 1,
  created_at    TEXT
);

CREATE TABLE flare_episodes (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  episode_id    INTEGER,            -- -> episodes.id（kind='exacerbation'）
  dept          TEXT,               -- 就诊科室，可为 NULL
  care_ref      INTEGER,            -- -> visits.id
  in_use        INTEGER DEFAULT 1,
  created_at    TEXT
);

CREATE TABLE family_lines (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  person_rel    TEXT,               -- 关系称谓（如「妹妹」「儿子」），不存他人健康判定
  doctor_quote  TEXT,               -- 医生原话（口径 F）
  item_fact     TEXT,               -- 筛查条目事实（如「基因检测需要空腹吗」的条目名），无则 NULL
  happened_on   TEXT,
  is_private    INTEGER DEFAULT 1,  -- 口径 G：涉及他人健康信息默认私密
  in_use        INTEGER DEFAULT 1,
  corrected_by  INTEGER,
  created_at    TEXT
);

/* ---------- 导入（3） ---------- */

CREATE TABLE import_batches (
  id            INTEGER PRIMARY KEY,
  profile_key   TEXT,
  source_kind   TEXT,
  imported_at   TEXT,
  note          TEXT
);

CREATE TABLE import_maps (
  id            INTEGER PRIMARY KEY,
  batch_id      INTEGER,
  field_from    TEXT,
  field_to      TEXT,
  rule          TEXT
);

CREATE TABLE import_conflicts (
  id            INTEGER PRIMARY KEY,
  batch_id      INTEGER,
  entity_table  TEXT,
  payload       TEXT,
  reason        TEXT,
  resolved_at   TEXT                -- NULL = 未处理（不覆盖，显式留空）
);

/* ---------- 分节标题（家族口径：表化，不用 *_title 列） ---------- */

CREATE TABLE section_titles (
  profile_key   TEXT,
  key           TEXT,               -- 'lung' | 'liver' | 'course' | 'treatment' | 'family' ...
  title         TEXT,               -- 如「肺功能（呼吸科）」
  ord           INTEGER
);

/* ---------- 索引 ---------- */

CREATE INDEX idx_metric_records_profile ON metric_records (profile_key, metric_id, measured_on);
CREATE INDEX idx_notes_profile ON notes (profile_key, kind, occurred_on);
CREATE INDEX idx_med_events_series ON med_events (series_id);
CREATE INDEX idx_episodes_profile ON episodes (profile_key, started_on);
