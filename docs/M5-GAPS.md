# M5 遗留与三态清单（2026-11-05，无人值守夜间）

三态：**实测通过** / **骨架**（代码在、按接口契约验证过桩件，真机未验）/ **未实现**。
本文件不改 schema/0001_initial.sql 与 schema/freeze-contract.md（已冻结，哈希校验过）。

## 实测通过

- 七步移植本体：public/ 开发版页面（ui-parity 9/9）、dsh/ 服务模块（store 11/11、server 9/9）、lib/client.js 生成链（build-client --check 同步）、MinerU 六部件（import-export 12/12，桩件级）、版本十处同源（check-version-literal 过）、check 链全绿。
- `npm run check` 退出码 0；`npm test` 60/60（含原 schema.test.mjs 与 pack-contents.test.mjs）；`node scripts/build-client.mjs --check` 退出码 0。
- 私密三出口正反例：导出不含旧私密原文/家系线索（server ④、import-export ⑪）；拒收零副作用（server ⑥⑦、import-export ⑥⑦）；apiBase 双前缀反例（client ⑥–⑩）。

## 骨架（按接口契约验证，真机/真实服务未验）

1. **MinerU 真实云端解析：未验证（无凭据）**。本机无 MinerU Token；`dsh/mineru.js` 四步通道、`.html` 拒收、pipeline 模型、LaTeX 剥壳、htmlTablesToPipes、lib/zip.js 解包全部以注入 fetchImpl/parseFn 的桩件通过单测。装机后第一步应拿真实 Token 走一次真解析。
2. **Desktop 装机链路（M6）**：webServer.register / connection.requestRejection 按 docs/02 合同实现，`check-host-contract` 通过；实机激活、会话挂载、customFrame 布局未验（M6 范围）。
3. **apiBase 在 Desktop 挂载前缀下的行为**：`apiBase()` 有单测覆盖 `/w/abc/api/aatd/ui/` 形态，但未在真宿主的子路径挂载下实测（M6 探针覆盖）。
4. **AI 原生会话**：customFrame + `aatd:agent-draft` 草稿链有离线契约测试（client ⑤），原生会话真机未验。

## 未实现 / 需 0002 迁移窗口处理（schema 冻结，不改 0001）

5. **metric_defs.unit_note 无冻结列**：演示数据有 `unit_note`（「单位形态【待核】」），读模型从唯一源按 key 回带（store ⑥），POST /metric_defs 不接受该字段。建议 0002 加列。
6. **reports.id 类型**：0001 冻结为 INTEGER，唯一源是字符串业务键（r-a1…）。播种按顺序取自增 id 并把 metric_records.source_ref 改指（store ⑤）；未登记的报告键（r-b4）保留原样。建议 0002 给 reports 加 `demo_key` 或把 id 改 TEXT 迁移。
7. **trial_demo / demo_prompts / demo meta 无冻结表**：bootstrap 从唯一源 `demo/demo-data.js` 直读带回（不落库）。AATD 无真实试验登记表（M4 的 research/aatd 是检索快照，不是界面数据源）。建议 0002 建 `trial_snapshots` / `prompt_templates` 表。
8. **profiles.chips 无列**：读模型从 metric_defs.group_key 派生（肺/肝/随访节律，store ③ 断言与唯一源一致）。真档案若需要自定义 chips，0002 加列。
9. **声明条第二段文案**「未接入 DSH / AI」在开发版语境不准确（为 index.html 逐字节 parity 保留）。随第 2 条差异一起，在 M6 改骨架时同步原型（改原型→同步 public→ui-parity ⑥ 归一规则更新）。
10. **dev-server 独立启动脚本未移植**（cervical 有 scripts/dev-server.mjs）：两条链路共用的路由/静态服务都在 dsh/routes.js + dsh/server.js，测试直接用 `startWorkbenchServer` 起真服务验证；本地 `npm start` 便利脚本未做，不影响装机。

## 其他记录

- `scripts/check-schema.mjs` 从底本移植时兼容了本仓 freeze-contract.md 的列表式哈希格式（底本是表格行）；两仓格式不同属格式差异，校验语义一致（哈希逐一比对）。
- 改包升版：package.json 0.1.0 → 0.5.0；VERSION / lib/version.js / lib/client.js 注入 / public 页脚与 ver-chip / README / CHANGELOG 由 `scripts/build-version.mjs` + `scripts/build-client.mjs` 生成链同源（check-version-literal 断言）。

- 骨架：scripts/serve-artifact.mjs（starter 版）期望 dsh/store.js 导出 openStore——本仓 store.js API 不同，artifact 级走查探针未接。待 0002 轮统一 store 导出面或移植 dev-server 便利脚本时一并处理。
