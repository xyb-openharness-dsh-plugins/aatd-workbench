# UI Parity 记录：public/（开发版）↔ prototypes/v0.2/（G2 冻结基准）

- 基准：`prototypes/v0.2/`（index.html / app.js / style.css / primer-data.js），M2 自动签认版本 v0.2.0。
- 开发版：`public/`（v0.5.0），断言在 `test/ui-parity.test.mjs`（9 条，全过）。
- 判定规则：**结构 + 文案一致，数据行来自 API**。差异只允许「数据源从 window.DEMO_DATA 换成宿主 API 读取 + AI 面板接宿主」及其直接载体；下面逐条列出实际差异点。

## 一、逐字节一致的部分（测试钉住）

| 文件 | 断言 |
| --- | --- |
| `public/style.css` | 与 `prototypes/v0.2/style.css` 逐字节相同（ui-parity ④） |
| `public/primer-data.js` | 与原型逐字节相同（ui-parity ⑤） |
| `PAGES / SUBPAGES / SUBTITLES` 常量块 | 与原型逐字符相同（ui-parity ③） |
| 原型全部具名函数 | 开发版一个不丢（ui-parity ①，`boot` 例外见下） |
| index.html 骨架 | 版本号归一 + 声明条文案归一后逐字节相同（ui-parity ⑥） |

## 二、允许的差异（逐条列理由）

1. **版本字面量**：title、声明条、ver-chip、页脚从 v0.2.0 → v0.5.0（版本十处同源；原型冻结在 0.2.0 不动）。
2. **声明条首段文案**：`<b>交互原型 v0.2.0</b> · 本页全部为模拟演示、未接入宿主…` → `<b>开发版 v0.5.0</b> · 优先读取本机工作台数据（连不上时回退演示，合成示例 · 仅演示）`。数据来源变了，这条必须如实变；第二段「仅本页演示 · 刷新重置 · 未接入 DSH / AI」为保骨架逐字节一致**原样保留**，其中"未接入 DSH"在开发版语境下不准确——已列入 docs/M5-GAPS.md（待 0002 迁移窗口连同骨架一起改）。
3. **演示数据脚本路径**：`../../demo/demo-data.js` → `demo-data.js`（public/ 内生成副本，由 `npm run build:demo` 从唯一源同步，ui-parity ⑧ 钉住两份一致）。
4. **app.js 数据层**（ui-parity ⑨）：
   - `const D = window.DEMO_DATA` → `let D` + `DATA_SOURCE`（'api' | 'demo' | 'empty'）；
   - 新增 `apiBase()`（交界守卫，单处定义）/ `applyData()` / `loadBootstrap()` / `init()` / `uploadToWorkbench()`（白名单五函数，ui-parity ②）；
   - `PROFILE_KEYS`、`TRIAL_DEMO` 改 let，随服务端数据重挂；
   - 原型 `(function boot(){…})()` → `init()`（必须先取数据再 render，避免整页空态）；
   - bootstrap 成功时 `APP_INFO.version/build/channel` 覆写为服务端值；API 通但库空显示空态，**不拿演示档案填空工作区**。
5. **导出接宿主**：`dlgExport` 增加第三个按钮「下载 .md（完整版）」；DATA_SOURCE==='api' 时预览文本被 `GET /api/aatd/export/<key>.md`（服务端生成、私密剔除）覆盖；`export-save` 走 `POST …/save`；新增 `export-download` 动作（手改过就下改过的那份）。
6. **候选核对接宿主**：`cand-save` / `cand-reject` 在 api 态走 `POST /api/aatd/ai_candidates/<id>/accept|reject`，成功后重新拉 bootstrap；失败提示可见、不裸 throw。
7. **导入接宿主**：`上传报告` 按钮文案不变，动作从演示 toast 改为 `upload-report`：api 态打开隐藏 `<input type="file">`，选文件后逐份 `POST /api/aatd/import`（原型没有文件选择器，这是 MinerU 六部件的入口，属"数据源换成宿主"的必然载体）；演示态保留原演示 toast 文案。
8. **AI 面板**：嵌入式（壳层 iframe）下演示面板整体隐藏、`aatd:agent-draft` 草稿交给壳层（与原型同一实现，宿主侧由 lib/client.js 的 `aatd:agent-draft` 监听接收，test/client.test.mjs ⑤ 钉住）；演示态行为与原型逐字一致。

## 三、数据形状契约

`GET /api/aatd/bootstrap` 返回与 `demo/demo-data.js` 同形的 payload（version/build/meta/profiles/trial_demo/demo_prompts/各事实表/section_titles/care_context），已知的两处播种映射（reports.id 字符串键→顺序整数、unit_note 由读模型回带）见 `test/store.test.mjs` 头注与 docs/M5-GAPS.md。

## 四、未比对的豁免声明

- `index.html` 中 favicon、nav、agent-pane、dialog 等骨架元素全部参与 ⑥ 的逐字节比对，无豁免。
- 行为差异（2/5/6/7 条）无法用纯文本 diff 断言，由 store/server/client 三套测试从接口侧钉住。
