# PROGRESS（唯一进度速览，详情见 docs/DEV-PLAN.md）

- 当前里程碑：M0–M6 完成 + M9 完成；M7/M8 草稿冻结待晨审放行
- 已完成：
  - M0 认领（Issue #58）/建仓/init/接线/基线 check
  - M1 九件文档 + G1（医学台账 24 核实、重名率 4/11=36%）
  - M2 原型 v0.2.0 + 独立评审 P0=0 + G2（探针：40 路由、响应式 8 档、primer 10/10、page-view 13/13、extra 21/21）
  - M3 schema 0001 冻结（sha256=edd338…4f9）+ G3（test/schema 9/9）
  - M4 试验快照 147/147 一致性 PASS（CT.gov + 3 通道留痕）
  - M5 开发版 0.5.0（check 17 步=0、test 60/60、audit 44/44）+ V1
  - M6 装机（tgz 48 文件、bundle #61、宿主清单含本包、真机 :43129 鉴权 401 实证）+ V2；V3 停闸待人工
  - M9 回流 starter 1.10.0-rc.13（自排除修复、L61–L65、probe-all-routes 模板），starter 自检 214 文件 pass / test 67/67
- 下一步（晨审）：追认 G1–G3/V1/V2 → V3 真机走查 → M7 tag/release → M8 BACKLOG PR（草稿在 docs/release-draft/）
- 阻塞：V3 需授权会话（人工）；MinerU 无 Token；NMPA 412
- 闸口：G1/G2/G3/V1/V2 自动签认通过（待追认）；V3 停闸待人工

## 2026-11-05 晚追加（FAMILY-INSPECTOR 审查与修复 + E8 收尾）

- INSPECTOR 审查：docs/INSPECTOR-REPORT-2026-11-05.md（27 失败/2 待人工）→ 修复轮完成（原型 v0.3.0 / 包 v0.6.0）。
- 已修：设置三 tab、通用录入窗（三态按钮 ×7 类入口）、营养与生活页、一图秀 rail 双栏等高条带、试验匹配三子页 + drawer、就医信息多医院（schema 0002）、check-trial-matching 入链、A 组层级。
- E8 收尾：saved_trials 0003 落库 + upsert/state/remove 路由 + 客户端水合与持久化（test 63/63）。
- 装机：0.6.0 tgz 重装 Desktop profile（bundle #61、真机 :43129 路由注册实证）。
- G4：docs/SQLITE-INVENTORY.md（21 表/迁移账本 3/判读列 0）。
- 回归：check 18 步=0、test 63/63、audit 44/44、探针全过（40 路由 / 21·21 / 响应式 / primer / page-view）。
- 仍待人工：V3 授权会话走查、MinerU Token、NMPA 补查。

## 2026-11-06 凌晨追加：M7/M8 执行 + M9 第二轮回流（至 M9 完成）

- M7：tag v0.6.0 + Release（tgz 50 文件 + sha256 72c160cb…）——用户在场授权执行。
- M8：BACKLOG #6 行 ⬜→🔵 回填 PR（31 号口径只改状态列）。
- M9 rc.14：check-trial-matching T2 去注释扫描 + 11 条自测例（starter 与项目双份统一）；LESSONS L66–L69；starter 自检 217 pass / test 67/67；项目 DEV-REQUIREMENTS 追加 5 条带来源新坑。
- 回归：check 18 步=0、test 63/63、audit 44/44。
- 仍待人工：V3 授权会话走查、MinerU Token、NMPA 补查、PR #61 合并（维护者动作）。
