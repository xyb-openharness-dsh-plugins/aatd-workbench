# FAMILY-CONTRAST — AATD 工作台两基准结构对照（只读调研）

依据：/Users/qinxiaoqiang/Downloads/night_dev_dsh_workbench.md 第 1 节（1.2 差异点择优、1.3 非肿瘤必须替换的表达）。

## 0. 版本勘误（先读）
- cervical-workbench/prototypes/ 只有 v0.2（无 v0.4），且该底本产品名为「小莲宝 CerviPal · 宫颈癌」（index.html:6），不是小粉宝/乳腺癌。night_dev:100 点名的小粉宝基准实际位于 breast-cancer-workbench/prototypes/v0.4/（PinkyPal v0.4.0）。本文件以 cervical v0.2 为指令路径上的取证对象，小粉宝 v0.4 作交叉核对。
- 「截图墙」在三个基准中均无字面实现（grep 0 命中）；最接近的对应物：cervical v0.2 资料库原件表 docsTable（app.js:563-570）+ 小粉宝 v0.4 看板 task-entry/stat-band 卡墙（app.js:722-732）+ 品牌 logo 破图降级处理（breast app.js:592）。IP3 逐字比对时此项不可比。

## 1. 两基准逐字保留的导航结构与页面 key（IP3 比对用，一字不改）

### 1.1 小橙宝 aml-workbench/prototypes/v0.2/app.js
PAGES（app.js:57-61）：
```
['dash', '看板', 'home'], ['dx', '诊断与基因', 'dx'], ['tx', '诱导与疗程', 'tx'],
['neu', '粒缺血象与支持', 'neu'], ['mrd', 'MRD 与随访', 'mrd'], ['tp', '移植', 'tp'],
['chart', '病情一图秀', 'chart'], ['care', '营养与生活', 'care'], ['mind', '心理与家庭', 'mind'],
['trial', '临床研究', 'trial'], ['docs', '资料与复诊', 'docs']
```
SUBPAGES keys（app.js:63-72）：dx: dx-wk/dx-gene/dx-mdt；tx: tx-cal/tx-path/tx-cons/tx-pend；neu: neu-fever/neu-cbc/neu-tx/neu-oral/neu-inf；mrd: mrd-trend/mrd-bm/mrd-rhythm；tp: tp-eval/tp-donor/tp-day；care: care-intake/care-safe；mind: mind-feel/mind-death/mind-burden；trial: trial-facts/trial-search/trial-match；docs: docs-lib/docs-cand/docs-prep
路由 key 格式（app.js:1692）：`'mind': pageMindFeel, 'mind/mind-feel': …, 'mind/mind-burden': pageMindBurden`
场景直达 S01–S13（app.js:89-104）。index.html 骨架 key（index.html:13-64）：.prototype-bar / .sidebar / #nav / .topbar / #main / #agent-splitter / #agent-pane / #dialog / #toast / .footer。

### 1.2 小莲宝 cervical-workbench/prototypes/v0.2/app.js
PAGES（app.js:54-59）：
```
['dashboard', '看板', 'home'], ['records', '病情整理', 'folder'], ['stage', '我的分期', 'badge'],
['treatment', '治疗历程', 'drip'], ['fertility', '性与生育', 'flower'], ['late', '放疗与长期影响', 'ray'],
['labs', '检查与指标', 'report'], ['timeline', '病情一图秀', 'chart'], ['nutrition', '营养支持', 'leaf'],
['mind', '心理支持', 'heart'], ['review', '复诊准备', 'calendar'], ['trials', '临床研究', 'flask']
```
病情整理五 Tab（SUBPAGES.records，app.js:60-61）逐字：`['资料库', '整理草稿 / 核对', '病情档案', '指标检测', '病情汇总']`
顶栏按钮组顺序（index.html:30-35）：资料目录 → AI 对话 → 设置 → 大字 Aa → ?（疾病概要）→ 版本 chip。
hero（vDashboard，app.js:486-497）：section.hero = eyebrow「演示档案 · {histology}」+ h1「{name}，这次想先看什么」+ p.headline + chips（路径）+ stat-band 两 tile。

### 1.3 小粉宝 breast-cancer-workbench/prototypes/v0.4（交叉核对）
PAGES 8 一级页（app.js:33-36）：dashboard 看板 / records 病情整理 / timeline 病情一图秀 / clinical 临床 / nutrition 营养支持 / mind 心理支持 / care 全程与康复 / review 收藏与回顾。SUBPAGES.records 五 Tab 与 cervical 逐字相同（app.js:39）。「最近差值/次数」卡：app.js:732 stat-band。

## 2. 逐维度择优表（落 night_dev:115-123 结论）

| 维度 | 取哪套 | 依据 | 落点 |
|---|---|---|---|
| 滚动模型 | 小橙宝 | 视口锁高、#main 内滚、顶栏常驻 | aml index.html:27-41（.stage > #main）|
| 适配单位 | 小橙宝 | AI 面板在场按主区宽 container query | aml style.css:362-387（@container 1100/860）|
| 指标卡 | 小粉宝系（cervical 同源） | 真 3D 翻转、定高、背面折线 | cervical app.js:175-204 mcard；style.css:242-258（perspective 1100px / preserve-3d / rotateY180 / 定高 188px）|
| 一级导航 | 小粉宝系 | 236px、选中态粉底+左 3px 竖条 | cervical index.html:16-24；night_dev:120 |
| 折叠卡 | 小橙宝 | details.phase-fold + beforeprint 全展开 | aml app.js:943-961 fold()；style.css:263-282；打印重开逻辑 app.js:2112-2118 |
| AI 形态 | 小橙宝 | 右侧 #agent-pane 35%、splitter 25–45% | aml index.html:43-56；style.css:332-333 |
| 疾病概要 | 小橙宝 | 整屏浮层、四段、每段强制来源行 | aml index.html:37（? 按钮）；四段式结构同 cervical primer-data.js:19-65（定义/指南情况/治疗全景/发展趋势）|

## 3. AATD 移植映射表（被抄结构 → AATD 表达）

| 被抄元素 | 来源 | AATD 替换 |
|---|---|---|
| hero + 疾病介绍入口（eyebrow/h1/chips/stat-band + ? 按钮） | cervical app.js:486-497, index.html:34 | eyebrow 换「演示档案 · AAT 缺乏症（以医生记录为准）」；chips 换受累器官与随访要点（肺 / 肝 / 随访节律）；stat-band 换「距上次发作 N 天」「近 90 天发作次数」；? 按钮挂 AATD 疾病概要四段 |
| 病情整理五 Tab | cervical app.js:61 | 结构保留，内容换 AATD：「资料库 / 整理草稿 · 核对 / 病情档案 / 指标检测 / 病情汇总」；「病情汇总」里分期行换成受累器官行（肺功能基线 / 肝超声结论，只抄原文） |
| 最近值/差值/次数/来源卡 mcard | cervical app.js:175-204 | 值=AAT 浓度 / FEV1 / DLCO / 6MWD / 肝功能；差值写「较上次」不画升降箭头；次数=近 90 天发作次数；来源行保留方法/单位/机构可比组 |
| 最近报告表（指标/最近值/日期/来源四列） | cervical app.js:612-616 | 列结构逐字保留，指标目录换 AATD 化验；「不同方法不合并」注脚保留 |
| 眉题 section-title 区块 | cervical app.js:518-533（最近的变化/接下来/我记下的感受/今天可以做的事） | 标题结构保留，内容换发作—缓解语境：「最近的发作与缓解」「接下来的随访」「我记下的症状」 |
| 一级/二级导航命名分组 | aml app.js:57-72 | 键位骨架保留，中文名换 AATD 语境（见 SPEC 页面表）；「移植」整页不搬（见 §4） |
| 心智负担与生活影响（mind 三级） | aml app.js:70, 1176-1206 | 三级结构保留：「当下感受（双主体）」「私密记录（三出口机制照抄）」「家庭负担与照护者」——文案去化疗/粒缺语境，换慢病照护（戒烟支持、随访节律负担） |
| 时间线事件泳道（分类节点只画不连线 + 事件泳道） | aml app.js:589-591, 1125-1153 | 泳道机制逐字保留；事件类型换 用药 / 就诊 / 检查 / 缓解开始 / 加重（night_dev:132）；小时级体温轨道不搬，只保留节点泳道 |
| 空态与占位文案 | aml app.js:430, 1031, 1049；cervical app.js:413 emptyBox | .empty 结构逐字保留（h3 + p + 下一步按钮）：「这个时间窗里没有所选指标」→「这个时间窗里没有所选化验」；「未检测 ≠ 阴性」口径照抄 |
| 折叠卡 details.phase-fold | aml app.js:943-961 | 折叠单元由「疗程」换「一次发作 / 一次调药」；细节块换（当次处理 / 化验 / 影像 / 症状 / 支持措施），全部只抄原文 |
| 三段外壳 + 顶栏按钮组 | cervical index.html:14-58, aml index.html:13-41 | 逐字保留结构；品牌换「小筛宝 A1Pal」；footer 口径句换「与 AATD 患者和照护者一起整理、记录、准备沟通 · 判读归呼吸/肝病团队」 |

## 4. 禁搬清单（照搬即失真，逐条写替换）

| 禁搬（来源） | 替换为 |
|---|---|
| FIGO 分期档案 + 分期术语对照卡（cervical app.js:627-652 vStage；「我的分期」一级页） | 不设「分期」页与分期标签；换「受累器官档案」：肺（FEV1/DLCO/CT 原文）与肝（转氨酶/超声原文），结论/依据/日期只抄医生记录，阈值一律【待核】 |
| 治疗线序（p.lines、系统治疗线数） | 用药按「长期维持 / 急性期按需」分组列清单，不编线号、不排序 |
| 疗效/应答/评效、fit 评分、MRD 转阴（aml app.js:74 SUBTITLES.mrd 双口径话术） | 只列医生原文与日期，不判定 |
| MRD 双口径趋势页（mrd-trend，流式 % vs PCR 不连线） | 双口径「不连线」结构可复用，语义换 肺功能（FEV1）与影像（CT）分列，跨方法不合并 |
| Day+N 时间轴 / 诱导日历按天 / 疗程编号折叠（aml tp-day、tx-cal、tx-path） | 缓解期第 N 天 / 发作中第 N 天 + 距上次发作 N 天 + 近 90 天发作次数（night_dev:126）；折叠单元=一次发作/一次调药 |
| 阶段标签（术后/巩固/维持）、化疗按天打勾、profile-meta「巩固中」 | 发作—缓解区间带（night_dev:129）；档案 meta 换医生原文摘要 |
| 粒缺发热小时级轨道 + 粒缺阈值自动判定（aml neu-fever） | 急性加重提醒只用患者与医生已确认的行动计划原话，写「若出现 X 联系 Y」，不写「你已进入 Z 期」（night_dev:133） |
| 输注记录与反应、血象目录 ANC/WBC/Hb/PLT 语境（aml CATALOG app.js:106-115） | 指标目录换 AAT 浓度、FEV1、DLCO、6MWD、肝功能；下降箭头换「较上次 / 近 30 天中位数」（night_dev:130） |
| 移植一级页 tp + 供者配型 + GVHD 记录（aml app.js:59, 71） | 整页不搬 |
| 肿瘤标志物 SCC-Ag 话术（cervical SUBTITLES.labs app.js:79） | 换「AAT 水平只对血清学方法有意义；基因分型只存报告原文，界面不做重判读」 |
| 预后与危险度分层、生存期语义（aml SUBTITLES.dx「分层」） | 换「基因型—临床表型解释卡：解释不是判断；未检测 ≠ 阴性」 |
| 原型文案中「7+3」「三程」「D1–D42」等（aml app.js:89-104 SCENES） | 场景直达 S01–S13 结构保留，场景名换：确诊建档 / 一次发作 / 一次调药 / 复诊准备 / 家属代记 / 私密记录 / 文档导入 |

## 5. 引用索引
- 小橙宝：/Users/qinxiaoqiang/Downloads/aml-workbench/prototypes/v0.2/index.html（69 行）；app.js（2137 行）：PAGES:57、SUBPAGES:63、SCENES:89、CATALOG:106、hourlane 泳道:589-614、pageChart:1125、mind 三页:1176-1206、phase-fold:943、路由:1692、打印展开:2112
- 小莲宝：/Users/qinxiaoqiang/Downloads/cervical-workbench/prototypes/v0.2/index.html（71 行）；app.js（1449 行）：PAGES:54、五 Tab:61、mcard:175、vDashboard hero:486、vRecords:572、报告表:612、emptyBox:413；style.css（499 行）：mcard 3D:242-258
- 小粉宝：/Users/qinxiaoqiang/Downloads/breast-cancer-workbench/prototypes/v0.4/（index.html 53 行、app.js 1511 行、style.css 459 行）：PAGES:33、stat-band:732
- night_dev：/Users/qinxiaoqiang/Downloads/night_dev_dsh_workbench.md:96-133（基准与替换表）、:144（Q8 禁词）

## 6. 重名率实测（一级页名）

- 本仓一级页名（12，INSPECTOR 修复轮后）：看板 / 病程 / 记录与报告 / 检查与指标 / 病情一图秀 / 输注与治疗 / 家系与基因 / 心理与生活 / 营养与生活 / 临床研究线索 / 复诊准备 / 设置
- cervical 一级页名（12）：看板 / 病情整理 / 我的分期 / 治疗历程 / 性与生育 / 放疗与长期影响 / 检查与指标 / 病情一图秀 / 营养支持 / 心理支持 / 复诊准备 / 临床研究
- 精确同名：看板、病情一图秀、检查与指标、复诊准备 = 4；4/12 = 33%（≤70% 达标）。重名页的内容语义不同（指标=肺/肝双组、复诊准备=两科材料），差异化矩阵见 DIFF-MATRIX.md。
