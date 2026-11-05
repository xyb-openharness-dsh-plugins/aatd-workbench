# SQLite 现状盘点（INSPECTOR G4 · 2026-11-05 晚）

- 盘点方式：真实迁移链 `openDatabase(':memory:') + migrate() + seedDemo()`（与 dsh/store.js 同一条代码路径，非快照转述）。
- 迁移账本：0001_initial → 0002_visits_hospital → 0003_saved_trials（schema_migrations 3 行；幂等重跑 0 行新增）。
- Desktop harness 下的真实库（dshHomePath('aatd')）**尚未生成**：服务端 apply 需授权会话触发（V3 待人工）——本盘点是同一迁移+播种代码在内存库的实测结果。

| 表 | 行数 | 说明 |
| --- | --- | --- |
| profiles | 2 | 演示档案 A/B |
| care_context | 6 | 口径条目 |
| metric_defs | 13 | 肺/肝/体重三组（weight 为 body 组，只给营养页） |
| metric_records | 37 | 显式 null；含更正链示例（in_use=0 旧版本保留） |
| reports | 5 | 报告登记 |
| notes | 14 | 自述/医生原话/问题；私密按条标注 |
| med_events | 122 | 输注按次（B 多年） |
| infusion_series | 2 | 输注段（计次读时算，不落库） |
| episodes | 5 | 发作—缓解区间 |
| flare_episodes | 2 | 加重关联 |
| visits | 8 | 就诊（0002 后含 hospital/contact/contact_source） |
| family_lines | 4 | 家系线索（默认私密） |
| doc_refs | 5 | 原件/出处登记 |
| ai_candidates | 2 | 候选（拒收零副作用） |
| section_titles | 10 | 分节标题（表化） |
| saved_trials | 0 | 试验收藏（0003 新表，初始空 = 确实没有收藏） |
| audit_log / import_* | 0 | 导入与审计未发生（不冒充有记录） |
| schema_migrations | 3 | 迁移账本 |

- 判读列扫描：0 命中（test/schema.test「无判读列」断言，含 0002/0003 新列）。
- 缺口：0002/0003 为可空补列，演示数据未覆盖 saved_trials 行数>0 的形态（由路由测试 ⑨ 覆盖 upsert/remove 语义）。
