'use strict';
/* 小筛宝 A1Pal · α1-抗胰蛋白酶缺乏症工作台 · 演示数据（唯一源）
 *
 * 全部为合成示例 · 仅演示：人物、日期、数值与事件不指向任何真实患者。
 * 字段结构与 schema/0001_initial.sql 逐表对齐：
 *   profiles / care_context / metric_defs / metric_records / reports / notes /
 *   med_events / episodes / visits / doc_refs / ai_candidates / infusion_series /
 *   flare_episodes / family_lines / section_titles
 * 数据层契约（与 schema 注释一致）：
 *   - 缺失一律显式 null，不用空串冒充；
 *   - 更正 = 新增版本（旧记录 in_use=0，corrected_by 指向新记录），旧版本保留；
 *   - 可比组 comparable_key 挂在 metric_defs 上，跨组不连线、不做差、不合并；
 *   - 输注按次存 med_events，infusion_series 只存段的起止与频次原话，计次由读模型现算；
 *   - 家系线索（涉及他人健康信息）默认 is_private=1；
 *   - 页面所有数字（计数、天数、图表、导出）只从本文件读，不在 HTML/JS 里写死病种数字。
 */
(function () {
  let seq = 0;
  const nid = () => ++seq;
  const addDays = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

  /* 每周一次的输注序列展开：从 from 到 until（含）每周一条；
     skip 里的日期是「缺口周」——如实缺，不补、不虚构。 */
  function weekly(from, until, skip) {
    const out = [];
    const sk = new Set(skip || []);
    let d = from;
    while (d <= until) {
      if (!sk.has(d)) out.push(d);
      d = addDays(d, 7);
    }
    return out;
  }

  /* ---------- 指标目录（metric_defs）：可比组挂在定义上，跨方法 = 两条定义 ---------- */
  const metric_defs = [
    /* 档案 A · 小陈：目录先行，多数还没有记录（未检测 ≠ 阴性） */
    { id: nid(), profile_key: 'A', key: 'aat_a', name: '血清 AAT 浓度（散射比浊法）', group_key: 'lung', unit: 'mg/dL', comparable_key: 'serum-neph-A', ord: 1 },
    { id: nid(), profile_key: 'A', key: 'fev1_a', name: 'FEV1 占预计值 %（肺功能室）', group_key: 'lung', unit: '%', comparable_key: 'spiro-A', ord: 2 },
    { id: nid(), profile_key: 'A', key: 'alt_a', name: 'ALT（IFCC 法）', group_key: 'liver', unit: 'U/L', comparable_key: 'ifcc-A', ord: 3 },
    { id: nid(), profile_key: 'A', key: 'ggt_a', name: 'GGT（IFCC 法）', group_key: 'liver', unit: 'U/L', comparable_key: 'ifcc-A', ord: 4 },
    /* 档案 B · 老周：肺功能两组（省医院体描仪 / 社区便携仪），跨组不合并 */
    { id: nid(), profile_key: 'B', key: 'fev1_b1', name: 'FEV1 占预计值 %（省人民医院 · 体描仪）', group_key: 'lung', unit: '%', comparable_key: 'spiro-bodybox', ord: 1 },
    { id: nid(), profile_key: 'B', key: 'fev1_b2', name: 'FEV1 占预计值 %（社区卫生服务中心 · 便携仪）', group_key: 'lung', unit: '%', comparable_key: 'spiro-portable', ord: 2 },
    { id: nid(), profile_key: 'B', key: 'dlco_b', name: 'DLCO 占预计值 %（省人民医院）', group_key: 'lung', unit: '%', comparable_key: 'dlco-bodybox', ord: 3 },
    { id: nid(), profile_key: 'B', key: 'aat_b1', name: '血清 AAT 浓度（免疫比浊法）', group_key: 'lung', unit: 'mg/dL', comparable_key: 'serum-immunoturbid', ord: 4 },
    { id: nid(), profile_key: 'B', key: 'aat_b2', name: '血清 AAT 浓度（散射比浊法）', group_key: 'lung', unit: 'mg/dL', comparable_key: 'serum-nephelometry', ord: 5 },
    { id: nid(), profile_key: 'B', key: 'alt_b', name: 'ALT（IFCC 法）', group_key: 'liver', unit: 'U/L', comparable_key: 'ifcc-general', ord: 6 },
    { id: nid(), profile_key: 'B', key: 'ggt_b', name: 'GGT（IFCC 法）', group_key: 'liver', unit: 'U/L', comparable_key: 'ifcc-general', ord: 7 }
  ];
  const defId = (key) => metric_defs.find((d) => d.key === key).id;

  /* ---------- 记录（notes）：author_role 标记录者；私密按条标注；未知日期为 null ---------- */
  const notes = [
    /* 档案 A */
    { id: nid(), profile_key: 'A', kind: 'doctor_quote', author_role: 'self', content: '呼吸科医生原话（2026-09-28）：「先按血清浓度和肺功能定方向，基因分型报告出来前，先把吸入药用规律。」', occurred_on: '2026-09-28', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-09-28' },
    { id: nid(), profile_key: 'A', kind: 'symptom', author_role: 'self', content: '这两天爬三楼会喘，以前没这么明显——具体哪天开始的记不清了。', occurred_on: null, is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-10-10' },
    { id: nid(), profile_key: 'A', kind: 'question', author_role: 'self', content: '想问医生：基因分型报告什么时候出？妹妹要不要也查一次血清浓度？', occurred_on: '2026-10-12', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-10-12' },
    { id: nid(), profile_key: 'A', kind: 'caregiver', author_role: 'self', content: '还没敢跟爸妈提这个病的事，想等基因报告出来一起说。', occurred_on: '2026-10-15', is_private: 1, in_use: 1, corrected_by: null, created_at: '2026-10-15' },
    /* 档案 B */
    { id: nid(), profile_key: 'B', kind: 'doctor_quote', author_role: 'self', content: '呼吸科医生原话（2026-07-14，急性加重的行动计划）：「若痰变黄绿、气短比平时明显加重，或发热超过 38℃，先打呼吸科门诊值班电话，不要自己加药。」', occurred_on: '2026-07-14', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-07-14' },
    { id: nid(), profile_key: 'B', kind: 'doctor_quote', author_role: 'self', content: '肝病科医生原话（2026-09-18）：「肝功能比去年又高了一点，先把酒停了，三个月后复查，肝超声每年做一次。」', occurred_on: '2026-09-18', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-09-19' },
    { id: nid(), profile_key: 'B', kind: 'doctor_quote', author_role: 'self', content: '呼吸科医生原话（2025-06-12，关于输注频次）：「每周输注一次，按周记录，漏了哪一周就空着哪一周。」', occurred_on: '2025-06-12', is_private: 0, in_use: 1, corrected_by: null, created_at: '2025-06-12' },
    { id: nid(), profile_key: 'B', kind: 'symptom', author_role: 'self', content: '2026-10-20 这次发作：晨起痰变黄绿，走平路比平时短一截，按行动计划给门诊打了电话。', occurred_on: '2026-10-20', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-10-20' },
    { id: nid(), profile_key: 'B', kind: 'caregiver', author_role: 'family', content: '这周夜里咳嗽多，白天精神还行；输注是女儿陪去的（老伴代记）。', occurred_on: '2026-10-26', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-10-26' },
    { id: nid(), profile_key: 'B', kind: 'symptom', author_role: 'self', content: '有时候会想，要是早点戒烟，现在会不会不一样——这种念头反复出现。', occurred_on: '2026-09-02', is_private: 1, in_use: 1, corrected_by: null, created_at: '2026-09-02' },
    { id: nid(), profile_key: 'B', kind: 'caregiver', author_role: 'family', content: '还没跟孩子说这次住院的事，没商量好怎么开口。', occurred_on: '2026-10-22', is_private: 1, in_use: 1, corrected_by: null, created_at: '2026-10-22' },
    { id: nid(), profile_key: 'B', kind: 'question', author_role: 'self', content: '想问肝病科：下次复查要不要加做肝弹性超声？', occurred_on: '2026-09-18', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-09-18' }
  ];
  const noteA1 = notes[0].id, noteA3 = notes[2].id;
  const noteBPlan = notes[4].id, noteBLiver = notes[5].id, noteBFlare = notes[7].id;

  /* ---------- 指标记录（metric_records）：显式 null；文本值走 value_text ---------- */
  const metric_records = [
    /* 档案 A：全档案只有 1 条数值记录（单点，图上只画 circle 不连线）；
       另 1 条文本记录连日期都记不清（measured_on=null）——缺失就这样留着 */
    { id: nid(), profile_key: 'A', metric_id: defId('aat_a'), value_num: 28, value_text: null, measured_on: '2026-10-08', source_kind: 'report', source_ref: 'r-a1', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-10-09' },
    { id: nid(), profile_key: 'A', metric_id: defId('alt_a'), value_num: null, value_text: '化验单原件没拿到，数值记不清了，等原件到了再核', measured_on: null, source_kind: 'manual', source_ref: null, is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-10-12' }
  ];
  /* 档案 B：多年多点 */
  [['2019-06-12', 58], ['2020-03-17', 55], ['2021-05-20', 52], ['2022-06-09', 49],
   ['2023-04-13', 46], ['2024-06-06', 44], ['2025-06-12', 42], ['2026-05-14', 40]].forEach((p) =>
    metric_records.push({ id: nid(), profile_key: 'B', metric_id: defId('fev1_b1'), value_num: p[1], value_text: null, measured_on: p[0], source_kind: 'report', source_ref: 'r-b1', is_private: 0, in_use: 1, corrected_by: null, created_at: p[0] }));
  /* 跨方法组：社区便携仪，与省医院体描仪不可比（不连线、不做差） */
  [['2025-11-19', 45], ['2026-08-10', 43]].forEach((p) =>
    metric_records.push({ id: nid(), profile_key: 'B', metric_id: defId('fev1_b2'), value_num: p[1], value_text: null, measured_on: p[0], source_kind: 'report', source_ref: 'r-b2', is_private: 0, in_use: 1, corrected_by: null, created_at: p[0] }));
  [['2021-05-20', 61], ['2023-04-13', 57], ['2025-06-12', 54], ['2026-05-14', 52]].forEach((p) =>
    metric_records.push({ id: nid(), profile_key: 'B', metric_id: defId('dlco_b'), value_num: p[1], value_text: null, measured_on: p[0], source_kind: 'report', source_ref: 'r-b1', is_private: 0, in_use: 1, corrected_by: null, created_at: p[0] }));
  [['2019-05-30', 31], ['2021-05-20', 30], ['2024-03-08', 29]].forEach((p) =>
    metric_records.push({ id: nid(), profile_key: 'B', metric_id: defId('aat_b1'), value_num: p[1], value_text: null, measured_on: p[0], source_kind: 'report', source_ref: 'r-b3', is_private: 0, in_use: 1, corrected_by: null, created_at: p[0] }));
  /* AAT 跨方法：另一家医院散射比浊法，只此一次，单独可比组 */
  metric_records.push({ id: nid(), profile_key: 'B', metric_id: defId('aat_b2'), value_num: 27, value_text: null, measured_on: '2026-02-11', source_kind: 'report', source_ref: 'r-b4', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-02-12' });
  [['2019-06-12', 33], ['2021-05-20', 39], ['2022-06-09', 45], ['2023-04-13', 41],
   ['2024-06-06', 52], ['2025-06-12', 58], ['2026-09-18', 63]].forEach((p) =>
    metric_records.push({ id: nid(), profile_key: 'B', metric_id: defId('alt_b'), value_num: p[1], value_text: null, measured_on: p[0], source_kind: 'report', source_ref: 'r-b5', is_private: 0, in_use: 1, corrected_by: null, created_at: p[0] }));
  [['2019-06-12', 28], ['2024-06-06', 47], ['2026-09-18', 55]].forEach((p) =>
    metric_records.push({ id: nid(), profile_key: 'B', metric_id: defId('ggt_b'), value_num: p[1], value_text: null, measured_on: p[0], source_kind: 'report', source_ref: 'r-b5', is_private: 0, in_use: 1, corrected_by: null, created_at: p[0] }));
  /* 更正链演示：2023-04 的一次 ALT 曾抄成 51，后来核对改成 41——
     旧版本 in_use=0 保留、corrected_by 指向新记录；不覆盖、不删除。 */
  {
    const good = metric_records.find((r) => r.profile_key === 'B' && r.metric_id === defId('alt_b') && r.measured_on === '2023-04-13' && r.in_use === 1);
    const old = { id: nid(), profile_key: 'B', metric_id: defId('alt_b'), value_num: 51, value_text: null, measured_on: '2023-04-13', source_kind: 'manual', source_ref: null, is_private: 0, in_use: 0, corrected_by: good.id, created_at: '2023-04-14' };
    metric_records.push(old);
  }

  /* ---------- 报告（reports）：A 的报告没有日期、没有原件 ---------- */
  const reports = [
    { id: 'r-a1', profile_key: 'A', title: '血清 AAT 浓度化验单', kind: 'other', report_date: null, org: '市第一医院 检验科', file_ref: null, summary_text: '数值 28 mg/dL（散射比浊法）；原件还在医院，没拿到。', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-10-09' },
    { id: 'r-b1', profile_key: 'B', title: '肺功能报告（含弥散）', kind: 'pulmonary_function', report_date: '2026-05-14', org: '省人民医院 呼吸功能室', file_ref: 'imports/肺功能-2026-05-14.pdf', summary_text: 'FEV1 占预计值 40%，DLCO 占预计值 52%；体描仪测定。', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-05-15' },
    { id: 'r-b2', profile_key: 'B', title: '社区肺功能随访单', kind: 'pulmonary_function', report_date: '2026-08-10', org: '社区卫生服务中心', file_ref: 'imports/社区肺功能-2026-08-10.jpg', summary_text: '便携肺功能仪测定；与省医院体描仪结果不合并比较，方法以报告原文为准。', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-08-11' },
    { id: 'r-b3', profile_key: 'B', title: 'SERPINA1 基因分型报告', kind: 'genetic', report_date: '2019-05-30', org: '医学院附属医院 分子诊断中心', file_ref: 'imports/基因分型-2019-05-30.pdf', summary_text: '报告原文照存，界面不重判读；解释卡见「家系与基因」。', is_private: 1, in_use: 1, corrected_by: null, created_at: '2019-06-02' },
    { id: 'r-b5', profile_key: 'B', title: '肝功能化验单', kind: 'liver_panel', report_date: '2026-09-18', org: '市第三医院 检验科', file_ref: 'imports/肝功能-2026-09-18.pdf', summary_text: 'ALT 63 U/L、GGT 55 U/L（IFCC 法）；只抄数值与方法，判读归医生。', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-09-19' }
  ];

  /* ---------- 发作—缓解区间（episodes）：ended_on=null 表示缓解未记录（仍开放） ---------- */
  const episodes = [
    { id: nid(), profile_key: 'A', kind: 'exacerbation', started_on: '2026-09-28', ended_on: '2026-10-12', title: '这次咳嗽加重了两个星期', note_ref: noteA1, is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-09-28' },
    { id: nid(), profile_key: 'B', kind: 'exacerbation', started_on: '2020-11-03', ended_on: '2020-11-18', title: '第一次加重，在呼吸科住了两周', note_ref: null, is_private: 0, in_use: 1, corrected_by: null, created_at: '2020-11-03' },
    { id: nid(), profile_key: 'B', kind: 'exacerbation', started_on: '2023-02-07', ended_on: '2023-02-24', title: '第二次加重，门诊用药后缓解', note_ref: null, is_private: 0, in_use: 1, corrected_by: null, created_at: '2023-02-07' },
    { id: nid(), profile_key: 'B', kind: 'exacerbation', started_on: '2026-07-14', ended_on: '2026-08-02', title: '夏天那次加重，全程门诊处理', note_ref: noteBPlan, is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-07-14' },
    { id: nid(), profile_key: 'B', kind: 'exacerbation', started_on: '2026-10-20', ended_on: null, title: '这次发作还没记录到缓解', note_ref: noteBFlare, is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-10-20' }
  ];
  const episodeA = episodes[0].id, episodeBOpen = episodes[4].id;

  /* ---------- 就诊（visits） ---------- */
  const visits = [
    { id: nid(), profile_key: 'A', dept: '呼吸科', visited_on: '2026-09-28', purpose: '咳嗽加重，第一次查血清 AAT', note_ref: noteA1, is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-09-28' },
    { id: nid(), profile_key: 'A', dept: '呼吸科', visited_on: '2026-10-12', purpose: '复诊：开吸入药，安排基因分型', note_ref: noteA3, is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-10-12' },
    { id: nid(), profile_key: 'B', dept: '呼吸科', visited_on: '2020-11-03', purpose: '第一次加重住院', note_ref: null, is_private: 0, in_use: 1, corrected_by: null, created_at: '2020-11-03' },
    { id: nid(), profile_key: 'B', dept: '呼吸科', visited_on: '2023-02-07', purpose: '第二次加重，门诊处理', note_ref: null, is_private: 0, in_use: 1, corrected_by: null, created_at: '2023-02-07' },
    { id: nid(), profile_key: 'B', dept: '呼吸科', visited_on: '2026-07-14', purpose: '急性加重，定行动计划', note_ref: noteBPlan, is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-07-14' },
    { id: nid(), profile_key: 'B', dept: '呼吸科', visited_on: '2026-05-14', purpose: '年度肺功能（含弥散）', note_ref: null, is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-05-14' },
    { id: nid(), profile_key: 'B', dept: '肝病科', visited_on: '2026-09-18', purpose: '肝功能年度复查', note_ref: noteBLiver, is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-09-18' },
    { id: nid(), profile_key: 'B', dept: '呼吸科', visited_on: '2026-10-20', purpose: '这次发作的门诊', note_ref: noteBFlare, is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-10-20' }
  ];
  const visitA1 = visits[0].id, visitBOpen = visits[7].id;

  /* ---------- 输注段（infusion_series）+ 输注按次（med_events）----------
     段 1（已结束）：2024-04-08 → 2024-09-23，缺口两周（2024-06-17 / 06-24 外出没输）。
     段 2（进行中）：2025-01-06 → 至今（ended_on=null），缺口一周（2025-07-14）。
     计次与缺口周都由页面从 med_events 现算，不落库。 */
  const infusion_series = [
    { id: 1, profile_key: 'B', label: '2024 年第一段每周输注', cadence_note: '呼吸科医生原话：每周输注一次，按周记录。', started_on: '2024-04-08', ended_on: '2024-09-23', is_private: 0, in_use: 1, created_at: '2024-04-08' },
    { id: 2, profile_key: 'B', label: '2025 年起第二段每周输注（进行中）', cadence_note: '同上：每周一次，漏了哪一周就空着哪一周。', started_on: '2025-01-06', ended_on: null, is_private: 0, in_use: 1, created_at: '2025-01-06' }
  ];
  const med_events = [];
  weekly('2024-04-08', '2024-09-23', ['2024-06-17', '2024-06-24']).forEach((d) =>
    med_events.push({ id: nid(), profile_key: 'B', kind: 'infusion', label: '加强治疗输注（第 1 段）', occurred_on: d, series_id: 1, source_kind: 'manual', is_private: 0, in_use: 1, corrected_by: null, created_at: d }));
  weekly('2025-01-06', '2026-11-02', ['2025-07-14']).forEach((d) =>
    med_events.push({ id: nid(), profile_key: 'B', kind: 'infusion', label: '加强治疗输注（第 2 段）', occurred_on: d, series_id: 2, source_kind: 'manual', is_private: 0, in_use: 1, corrected_by: null, created_at: d }));
  /* 用药（长期维持 / 急性期按需，分组列清单，不编序号） */
  med_events.push({ id: nid(), profile_key: 'B', kind: 'medication', label: '吸入维持用药（ICS/LABA 联合制剂，每日一次，医嘱名照抄）', occurred_on: '2021-05-20', series_id: null, source_kind: 'report', is_private: 0, in_use: 1, corrected_by: null, created_at: '2021-05-20' });
  med_events.push({ id: nid(), profile_key: 'B', kind: 'medication', label: '短效支气管扩张剂（按需吸入）', occurred_on: '2023-02-07', series_id: null, source_kind: 'report', is_private: 0, in_use: 1, corrected_by: null, created_at: '2023-02-07' });
  med_events.push({ id: nid(), profile_key: 'B', kind: 'medication', label: '吸入维持用药改为每日两次（医嘱原话照抄）', occurred_on: '2026-07-14', series_id: null, source_kind: 'manual', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-07-14' });
  /* 档案 A：只记得开了吸入药，具体哪天开始记不清了（occurred_on=null）——缺失就显式空着 */
  med_events.push({ id: nid(), profile_key: 'A', kind: 'medication', label: '吸入维持用药（第一次开，开始日期没记）', occurred_on: null, series_id: null, source_kind: 'manual', is_private: 0, in_use: 1, corrected_by: null, created_at: '2026-10-12' });

  /* ---------- 资料（doc_refs）：A 无原件；B 有原件与复印件 ---------- */
  const doc_refs = [
    { id: nid(), profile_key: 'A', title: '血清 AAT 化验单（手机拍的）', kind: 'copy', ref: 'imports/AAT化验单-手机翻拍.jpg', note: '原件在医院，还没取；先记下在哪拍的、哪天拍的。', in_use: 1, created_at: '2026-10-09' },
    { id: nid(), profile_key: 'B', title: 'SERPINA1 基因分型报告', kind: 'original', ref: 'imports/基因分型-2019-05-30.pdf', note: '2019 年确诊时的报告原件。', in_use: 1, created_at: '2019-06-02' },
    { id: nid(), profile_key: 'B', title: '肺功能报告 2026-05', kind: 'original', ref: 'imports/肺功能-2026-05-14.pdf', note: '省人民医院纸质原件扫描。', in_use: 1, created_at: '2026-05-15' },
    { id: nid(), profile_key: 'B', title: '肝功能化验单 2026-09', kind: 'original', ref: 'imports/肝功能-2026-09-18.pdf', note: '市第三医院原件。', in_use: 1, created_at: '2026-09-19' },
    { id: nid(), profile_key: 'B', title: '急性加重行动计划卡（医生写的）', kind: 'copy', ref: 'imports/行动计划卡-2026-07-14.jpg', note: '原件贴在家里冰箱上，这是翻拍。', in_use: 1, created_at: '2026-07-14' }
  ];

  /* ---------- AI 候选（ai_candidates）：拒收零副作用，核对前不入事实层 ---------- */
  const ai_candidates = [
    { id: nid(), profile_key: 'A', target_table: 'notes', payload: { kind: 'doctor_quote', content: '基因分型结果：Pi*ZZ（转写自报告页，尚未核对原件）。', occurred_on: null }, status: 'pending', created_at: '2026-10-20' },
    { id: nid(), profile_key: 'B', target_table: 'metric_records', payload: { metric_key: 'alt_b', value_num: 63, measured_on: '2026-09-18', source: '肝功能化验单 · 第 1 页' }, status: 'accepted', created_at: '2026-09-19' }
  ];

  /* ---------- 家系线索（family_lines）：涉及他人健康信息，默认私密 ---------- */
  const family_lines = [
    { id: nid(), profile_key: 'A', person_rel: '妹妹', doctor_quote: '医生说：一级亲属可以先查一次血清 AAT 浓度，要不要查由你们自己决定。', item_fact: '血清 AAT 浓度（一次抽血）', happened_on: '2026-10-08', is_private: 1, in_use: 1, corrected_by: null, created_at: '2026-10-12' },
    { id: nid(), profile_key: 'B', person_rel: '儿子', doctor_quote: '医生说：孩子成年后可以自己决定查不查，现在不用急。', item_fact: '血清 AAT 浓度（成年后自决）', happened_on: '2021-05-20', is_private: 1, in_use: 1, corrected_by: null, created_at: '2021-05-21' },
    { id: nid(), profile_key: 'B', person_rel: '妹妹', doctor_quote: '医生说：查过一次浓度正常，不代表以后永远不用再管，有症状再聊。', item_fact: '血清 AAT 浓度（已查过一次）', happened_on: '2023-04-13', is_private: 1, in_use: 1, corrected_by: null, created_at: '2023-04-13' },
    { id: nid(), profile_key: 'B', person_rel: '表弟', doctor_quote: '医生说：家族里谁想查，拿着这份基因报告的首页去呼吸科挂号就行。', item_fact: '基因报告首页（供亲属挂号参考）', happened_on: '2026-02-11', is_private: 1, in_use: 1, corrected_by: null, created_at: '2026-02-11' }
  ];

  /* ---------- 发作就诊关联（flare_episodes） ---------- */
  const flare_episodes = [
    { id: nid(), profile_key: 'A', episode_id: episodeA, dept: '呼吸科', care_ref: visitA1, in_use: 1, created_at: '2026-09-28' },
    { id: nid(), profile_key: 'B', episode_id: episodeBOpen, dept: '呼吸科', care_ref: visitBOpen, in_use: 1, created_at: '2026-10-20' }
  ];

  /* ---------- 分节标题（section_titles）：表化，加一节只加一行 ---------- */
  const section_titles = ['A', 'B'].flatMap((k) => [
    { profile_key: k, key: 'lung', title: '肺功能与血清 AAT（呼吸科）', ord: 1 },
    { profile_key: k, key: 'liver', title: '肝功能（消化科 / 肝病科）', ord: 2 },
    { profile_key: k, key: 'course', title: '发作与缓解', ord: 3 },
    { profile_key: k, key: 'treatment', title: '输注与调药', ord: 4 },
    { profile_key: k, key: 'family', title: '家系线索（默认私密）', ord: 5 }
  ]);

  /* ---------- 口径说明（care_context）：指标 / 趋势页常驻同屏 ---------- */
  const care_context = ['A', 'B'].flatMap((k) => [
    { profile_key: k, key: 'review', value: '仅回顾，不解读', ord: 1 },
    { profile_key: k, key: 'doctor', value: '解读归医生', ord: 2 },
    { profile_key: k, key: 'merge', value: '不同方法不合并', ord: 3 }
  ]);

  /* ---------- 档案（profiles）---------- */
  const profiles = {
    A: {
      key: 'A', name: '小陈', record_mode: 'self', meta: '36 岁 · 基因分型中 · 呼吸科随访',
      headline: '刚确诊一个月：先把第一份记录理清楚，没查的不等于没有。',
      demo_label: '合成示例 · 仅演示', created_at: '2026-09-28',
      chips: ['肺', '肝', '随访节律']
    },
    B: {
      key: 'B', name: '老周', record_mode: 'self', meta: '58 岁 · Pi*ZZ · 呼吸科 + 肝病科随访',
      headline: '随访第六年：发作、每周输注与肝功能都在这一份里。',
      demo_label: '合成示例 · 仅演示', created_at: '2019-05-30',
      chips: ['肺', '肝', '随访节律']
    }
  };

  /* 一图秀与泳道的事件（用药 / 就诊 / 检查 / 缓解开始 / 加重）全部由上方事实表派生，不另立数据源。 */

  window.DEMO_DATA = {
    meta: { generated: '2026-11-05', demo_label: '合成示例 · 仅演示' },
    profiles,
    care_context,
    metric_defs,
    metric_records,
    reports,
    notes,
    med_events,
    episodes,
    visits,
    doc_refs,
    ai_candidates,
    infusion_series,
    flare_episodes,
    family_lines,
    section_titles
  };
})();
