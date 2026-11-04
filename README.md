# 小筛宝 A1Pal · α1-抗胰蛋白酶缺乏症工作台（v0.2.0 原型）

服务 α1-抗胰蛋白酶缺乏症（AATD）患者及家属的本机信息整理与就诊准备工作台：把肺功能与肝功能两路化验、每周加强治疗输注、发作—缓解病程和医生原话放在一起回看，准备复诊材料。**只整理，不判读**——不输出诊断、风险或处置判断。

> 本页全部为合成示例（演示档案 A/B），未连接真实病历与宿主；0 患者访谈、0 临床审核。

## 疾病概要

α1-抗胰蛋白酶缺乏症是一种遗传病：SERPINA1 基因的变异让血清里的 α1-抗胰蛋白酶明显偏少，主要累及肺（肺气肿）与肝（肝病），国际综述与 2025 年版中国官方指南均有收载（本台标注来源，未取得的部分如实写「未取得」）。病程以长期随访为主，间有急性加重——工作台因此按「发作—缓解 + 肺/肝两路化验 + 每周输注」组织，不使用肿瘤分期与治疗线序语义。顶栏「?」可看四段疾病概要（定义 → 医学资料规范和指南情况 → 治疗全景 → 发展趋势），每段带来源行。

## 关键功能（截图墙）

### 看板：最近记录、待核对与想问医生的问题，一屏还原
![看板](docs/assets/screenshots/aatd-v0.2.0-home-A.png)
刚确诊的档案 A：记录少、未知多，缺失项显式留空，不冒充有数据。

### 检查与指标：肺功能、肝功能分节，不同方法不合并
![检查与指标](docs/assets/screenshots/aatd-v0.2.0-labs-B.png)
每张指标卡带方法/单位/机构可比组；「较上次」不画升降箭头，不暗示好坏。

### 病情一图秀：化验、发作—缓解与输注放回同一段时间
![一图秀](docs/assets/screenshots/aatd-v0.2.0-chart-B.png)
曲线按各自全期归一化，区间带与数据点分层；跨方法断开不连线。

### 输注与治疗：按周登记、按次计次，漏了哪周就空着哪周
![输注与治疗](docs/assets/screenshots/aatd-v0.2.0-treatment-B.png)
折叠卡按「一次发作 / 一次调药」分组（details 原生折叠，可打印全展开）。

### 折叠卡收起态
![折叠收起](docs/assets/screenshots/aatd-v0.2.0-fold-closed.png)

### 折叠卡展开态
![折叠展开](docs/assets/screenshots/aatd-v0.2.0-fold-open.png)

## 怎么用

1. `git clone` 本仓后直接双击 `prototypes/v0.2/index.html`（file:// 直开，零依赖）。
2. 顶栏「档案 A/B」切换两套合成演示档案：A 刚确诊记录少，B 随访 6 年数据多；切换后整页联动，不串档。
3. `npm run check` 跑静态检查链；`npm test` 跑数据层与打包测试；`node scripts/probe-aatd-m2.mjs` 跑 40 条路由 × 2 档案的无头走查（需本机 Chrome）。
4. 开发版（M5 起）通过 DSH Desktop 安装；本原型阶段未接入宿主，AI 面板为演示态（明说「不会发送」）。

## 数据与口径

- 演示数据唯一源：`demo/demo-data.js`（A/B 两套，字段对齐 `schema/0001_initial.sql`）；界面标注「合成示例 · 仅演示」。
- 口径同屏：「仅回顾，不解读」「解读归医生」「不同方法不合并」。
- 隐私：私密记录在看板、复诊准备导出、AI 上下文三出口共用同一过滤函数，页内写「N 条中私密 M 条」；更正=新增版本，无裸删除。
- 无判读列：schema 无 diagnosis/risk_level 类派生判定；阈值一律【待核·未过临床审核】。
- 医学内容来源与边界见 `docs/CLINICAL-DATA.md`（24 条核实、4 条未取得、失败 URL 留痕；0 临床审核）。

## 开发

- 文档入口：`docs/SPEC.md`（范围）、`docs/INTERACTION-DESIGN.md`（IP 路径）、`docs/DEV-PLAN.md`（阶段台账与闸口）、`docs/CHECKLIST-G2.md`（逐条报数）。
- 检查链：`npm run check`（13 步静态断言）；原型探针：`scripts/probe-aatd-m2.mjs`、`scripts/probe-m2-extra.mjs`、`scripts/probe-responsive.mjs`。
- 版本：package.json / 本 README / prototypes 版本行 / 页脚版本四处同源（v0.2.0）。
- 家族规范与基准对照：`docs/FAMILY-CONTRAST.md`。
