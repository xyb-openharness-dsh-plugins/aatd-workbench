# freeze-contract（M3 · G3）

- 文件：schema/0001_initial.sql
- sha256：edd33863a022418648c69a6f64fa5b7fd5e557a1909c629b78955ec02fba94f9
- 冻结时间：2026-11-05 03:00（+0800），G2 签认后生效（无人值守自动签认，待晨审追认）
- 规则：迁移只增不改。此后加结构只能新增 0002_*.sql；修改本文件被 check 拦下。
- 口径锚点（改 0002 也不得违反）：
  1. 无判读列（diagnosis/risk_level/severity/stage/grade/response/mrd_status 等）；
  2. 显式 null（不用空串/0 冒充缺失）；未知日期 NULL；
  3. 更正=新增版本（corrected_by 自引用 + in_use=0 旧版本保留）；旧版本可查；
  4. 分节标题走 section_titles 表，不用 *_title 列；
  5. metric_defs.comparable_key：方法/单位/机构可比组，跨组不做差不连线；
  6. med_events/infusion_series：输注按次，计次由读模型实时算不落库；
  7. episodes：发作—缓解区间，「第 N 天/距上次 N 天」读时算；
  8. family_lines.is_private 缺省 1；私密三出口共用过滤，改写链上任一私密版本则旧原文不出口。
- 验证：test/schema.test.mjs 9/9（内存全建、禁判读列、契约列、私密默认、rowid 读写冒烟）。

## 0002（2026-11-05 追加，INSPECTOR F6）

- 文件：0002_visits_hospital.sql
- sha256：4044e9d07ff7d26a5889c3ba0dfd52d9a4b7f748261cf2bb4adecccde5c6f336
- 变更：visits 增可空列 hospital / contact / contact_source（多家医院卡片用）；旧行 NULL 保留。

## 0003（2026-11-05 晚追加，E8 收藏落库）

- 文件：0003_saved_trials.sql
- sha256：4a7ba8c7c1fa5f52ff793f47cf41a0b6e780e4192964db2c2af1a24b81babb93
- 变更：新增 saved_trials 表（本机收藏三态），UNIQUE(profile_key, trial_key)。
