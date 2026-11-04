# AATD 试验快照台账（M4）

- 抓取：2026-11-05，CT.gov API v2，query.cond="alpha-1 antitrypsin deficiency"，147 条（totalCount=147），无时间窗过滤（全量存量登记）。
- 快照：manifest.json + trials.jsonl + trials.sqlite（147/147/147）+ source_statuses 4 行。
- 四通道：ctgov ok（147）；chinadrugtrials HTTP 202（反爬，未采集）；chictr HTTP 405（未采集）；ictrp 门户页无 API（未采集）。未采集通道如实记 blocked/attempted-noapi，不写零结果。
- 一致性：node scripts/check-trial-snapshot.mjs . → PASS（records=147/147，sha256 入 manifest）。
- 口径：登记状态 ≠ 入组资格 ≠ 疗效结论；CT.gov 条件索引会带入相关病种研究（如结节病共研究），候选层由原型「临床研究线索」页人工核对标注，不做匹配指数。
