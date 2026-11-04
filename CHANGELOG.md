# 变更记录

只增不删；每条写清"改了什么 + 为什么 + 用户可见结果"。版本号与 VERSION、package.json 三处必须一致。

## 0.5.0 — 2026-11-05（开发版 · M5 七步移植）

- 开发版页面：`public/`（index.html / app.js / style.css / primer-data.js / demo-data.js）以 prototypes/v0.2 为基准生成——结构文案逐字符对齐，数据源换成宿主 API（`GET /api/aatd/bootstrap`，拿不到才回退演示）；逐条差异见 `docs/UI-PARITY-NOTES.md`，断言在 `test/ui-parity.test.mjs`（9 条）。
- 服务模块：`dsh/store.js`（node:sqlite，库文件在 Config.root 目录）、`readmodels.js`（bootstrap 与 demo/demo-data.js 逐表同形；发作第 N 天 / 距上次发作 / 近 90 天计数 / 输注计次与缺口周读时算；跨 comparable_key 不合并；私密三出口过滤含改写链）、`routes.js`（REST：profiles/notes/metric_defs/metric_records/reports/med_events/episodes/infusion_series/family_lines/ai_candidates/export/import/settings，全部 {error} JSON 错误形态）、`demo.js`（首启播种，标注 demo_label）、`import.js` / `export.js`（复诊材料导出 .md，私密过滤）。
- 宿主接线：`dsh/index.js` Config 声明 `root`（cordis.patch.yml 注入 dshHomePath('aatd')，消除"patch 注入但 Config 未声明"警告）；`lib/client.js` 由 `src/client.js` + `scripts/build-client.mjs` 常量注入生成（customFrame=true、业务 left 0.65、会话 25–45% 可拖），iframe 指向 `/api/aatd/ui/`。
- MinerU 六部件（18 号 v2）：提交通道（`.html` 拒收、pipeline 默认、vlm 降级）、token 设置页（文件 > env，v2 口径，掩码回显）、routes 设置接口、报告导入候选流（report→ai_candidates，拒收零副作用）、`lib/zip.js` 零依赖解包、LaTeX 剥壳 + htmlTablesToPipes。本机无 Token：真实云端解析未验证（无凭据），桩件全部通过。
- 测试五套：store（11）/ server（9）/ client（10，含 apiBase 双前缀反例）/ ui-parity（9）/ import-export（12）；加原 schema 与 pack-contents，`npm test` 60/60。
- 版本簿记十处同源（0.5.0）：VERSION / package.json / lib/version.js / lib/client.js / public 页脚与 ver-chip / README / CHANGELOG 由 build-version + build-client 生成链保证，`check-version-literal` 断言。
- 已知遗留与三态清单：`docs/M5-GAPS.md`（unit_note / reports.id / trial_demo 无冻结列、MinerU 真机未验等）。

## 0.1.0 — 2026-11-04

- 由社区脚手架 dsh-wb-cli@1.10.0-rc.4 (321754a+dirty) 初始化，仅有注册骨架与健康接口，无业务功能。
