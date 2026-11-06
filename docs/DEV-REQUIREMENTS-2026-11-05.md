# DEV-REQUIREMENTS · 开发硬约束（2026-11-05，M5 定稿）

每条硬约束带可执行验收（命令或文件锚点）；跑不过就是没做，不靠人记。
适用语境：本仓 M5 开发版（v0.5.0）；家族规范源文档见各条括号。

1. **原型是唯一视觉与交互基准**：public/ 与 prototypes/v0.2 结构文案逐字符对齐，只许数据源与 AI 接宿主两类差异。
   验收：`node --test test/ui-parity.test.mjs`（9 条全过）；差异逐条记录在 docs/UI-PARITY-NOTES.md。
2. **演示数据唯一源**：页面数字、库内播种、离线回退三处读同一份 demo/demo-data.js，不许第二份手写数据。
   验收：`node --test test/store.test.mjs`（bootstrap 与唯一源逐表 deepStrictEqual）；`node scripts/build-demo-copy.mjs --check`。
3. **schema 冻结**：0001_initial.sql 与 freeze-contract.md 不改；加结构只新增 0002_*.sql。
   验收：`node scripts/check-schema.mjs`（sha256 逐一比对）；需改结构的项记 docs/M5-GAPS.md 等迁移窗口。
4. **无判定列**：不设 diagnosis / risk_level / severity 类列，读模型不输出合并组或判定字段。
   验收：test/store.test.mjs ⑨（字段黑名单断言）；test/schema.test.mjs（禁判读列）。
5. **派生值读时算，不落库**：发作第 N 天 / 距上次发作 / 近 90 天计数 / 输注计次与缺口周全部现算。
   验收：test/store.test.mjs ⑦⑧（与独立复算 deepEqual + 计次列不存在断言）。
6. **跨 comparable_key 不合并**：同名化验不同方法/机构各占一条定义，不做差、不连线。
   验收：test/store.test.mjs ⑨。
7. **私密三出口共用过滤（含改写链）**：看板（前端 filterPrivate）、导出、AI 上下文（服务端 filterPrivateRows）；旧私密原文任何出口不可见；条数可见、内容不可见。
   验收：test/server.test.mjs ④、test/import-export.test.mjs ⑪（正反例）；test/store.test.mjs ⑩。
8. **拒收零副作用**：解析失败 / 候选拒收 / 候选接受都不写事实表；候选终态不可再改。
   验收：test/server.test.mjs ⑥⑦、test/import-export.test.mjs ⑥⑦。
9. **apiBase 交界守卫**：所有 fetch 走单处定义的 apiBase()；不许拼出 /api/aatd/api/aatd 双前缀；失败态 UI 可见（离线演示/空态标注），不裸 throw。
   验收：test/client.test.mjs ⑥–⑩（正反例）。
10. **错误形态**：所有 API 错误一律 {error, message} JSON + 合适状态码（400/404/413/501/502/503），禁裸 throw、禁 HTML 错误页。
    验收：test/server.test.mjs ②⑨。
11. **MinerU v2 口径**：Token 优先级 显式 > 密钥文件 > env；.html 拒收；pipeline 默认；LaTeX 剥壳 + htmlTablesToPipes 先于对齐；位置对齐数量不符整行放弃；token 原文不进日志/错误/响应。
    验收：test/import-export.test.mjs ①–⑤⑩、test/server.test.mjs ⑧。
12. **客户端形态**：lib/client.js 必须是 ModuleLoader 普通脚本、customFrame=true、inject 带 sessions、Panel 首子元素 <header>、业务 iframe 指 /api/aatd/ui/。
    验收：node scripts/build-client.mjs --check、node scripts/check-host-contract.mjs、test/client.test.mjs ①–④。
13. **版本十处同源**：VERSION 唯一手写，其余派生；页面一个版本字面量都不许与 VERSION 打架。
    验收：node scripts/check-version-literal.mjs、node scripts/build-version.mjs --check（等价稳定字段）。
14. **底本残留零容忍**：移植后患者可见文案不许残留底本品牌/病种词。
    验收：node scripts/check-derivative-leftovers.mjs . （57 文件 0 命中）。
15. **医疗表述红线**：实现代码不给诊断、不给处置建议；免责语境除外。
    验收：node scripts/check-wording.mjs。
16. **tgz 内容自适应断言**：有 public/、schema/ 就必须随包发出，防"装上能开、进去是空"。
    验收：node --test test/pack-contents.test.mjs。
17. **改包必升版**：本次 0.1.0 → 0.5.0（package.json 与 VERSION 同步）。
18. **装机只向实际 DSH Desktop profile 安装**：M6 范围，本里程碑未执行（未验证项记 docs/M5-GAPS.md）。

## 夜班+INSPECTOR 轮新坑（带错误来源，2026-11-06 追加）

1. **升版重装先 remove 旧 tgz**（来源：0.6.0 重装 ENOENT）：Desktop profile 依赖 file: 指旧文件名；流程固定 remove → add 新 tgz → 校验 bundles。
2. **迁移加列必须同步唯一源**（来源：0002 visits.hospital 使 store.test ④ parity 红）：bootstrap 走 SELECT *，新可空列会进读模型行；demo-data 同提交补同名字段，migrate 测试 executed 断言随账本更新。
3. **检查器词表去注释再扫**（来源：check-trial-matching T2 把 doc 注释「不设 suitability 字段」判成命名）：T2 类禁词扫 stripComments 后文本；自测加注释回归例（11/11）。
4. **Agent 批处理一律绝对路径**（来源：checker 双副本补丁打到错误副本）：相对路径 + 持久 cwd 漂移会静默改错文件；改完 diff 校验副本一致。
5. **录入窗唯一性**：新增 openForm 通道后，每页显式编辑入口仍 ≤1 主按钮（IP6），其余收进「⋯ 更多」。
6. **探针必须打项目页面**（来源：2026-11-07 用户实测「? 打不开」）：primer 面板模块完整、
   probe-disease-primer 10/10 全绿，但原型 ? 按钮从未绑定 dpOpen——闸口测的是 starter
   参考页。已固化：probe-m2-extra P-home（首页入口 + 顶栏 ? 打开整页面板、四段、Esc）。
