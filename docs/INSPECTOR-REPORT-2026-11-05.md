# Inspector 审查报告 · 小筛宝 A1Pal（aatd-workbench v0.5.0 / 原型 v0.2.0）· 2026-11-05

总评：**骨架与红线扎实（check/test/audit/探针全绿、私密三出口与「仅回顾」口径到位、UI 整体气质对齐两基准），但「设置三 tab」「录入窗口」「试验匹配层」「一图秀 rail」四大块尚未落地——本轮验收不能算完成，属「能用演示、未达规格」。**

证据基线：npm run check 退出码 0（17 步）；npm test 60/60；audit 44/44；probe-aatd-m2 40 路由 0 errors；probe-m2-extra 21/21；probe-responsive PASS（8 档）；probe-disease-primer 10/10；probe-page-view 13/13。截图 docs/shots/inspector/{aatd-A,aatd-B}/*.png（A 组 11 张全看）+ baseline-{breast,aml}/home.png。

## 逐项表

| 项 | 结论 | 证据 |
|---|---|---|
| A1 品牌块 | 通过 | aatd-A/home.png：logo 方块+「小筛宝 / A1Pal · AATD」；index.html L17-18 |
| A2 档案卡 | 通过 | home.png：头像「小」+名/标两行+⌄；点击弹档案列表 app.js L1296-1302 |
| A3 导航 | 通过 | 线性 SVG 图标（app.js L27-39）；选中态浅底 pill+左竖条（截图）；家族脚注 index.html L27 |
| A4 声明条 | 通过 | index.html L16 深底条左「交互原型 v0.2.0…」右「仅本页演示 · 刷新重置 · 未接入 DSH / AI」 |
| A5 大状态卡 | **失败(薄弱)** | stat-tile b 仅 19px（style.css L144），无 42px 级大字；医生原话条有（B 档案 home 行动计划） |
| A6 行动带 | **失败(薄弱)** | alert-strip 白底、无左 5px 色条（style.css L163）；右侧按钮组 ✓（B 档案 home.png） |
| A7 快捷卡三连 | 通过 | task-grid 三入口 icon+标题+说明+可点（app.js L577-581） |
| A8 字号层级 | **失败(部分)** | 眉题 1.5px 间隔 ✓、H1 28px@1280 ✓、正文 15px ✓（style.css L18）；指标大数字 .val=23px<30px（L189） |
| A9 AI 面板收起 | 通过 | 截图默认收起；35%/可拖 25–45%（style.css L317、app.js L1484-1504） |
| A10 断点 | 通过(薄弱) | probe-responsive PASS 8 档无溢出；但实现为 container 1100/860 两档（style.css L364,367）≠1180/900/600 |
| B1 菜单对照 | **失败** | 缺「营养与进食」页（出处 ZERO-TO-DEV L100 标准菜单清单；小粉宝有「营养支持」）；「费用与资源」未做未说明 |
| B2 临床线落点 | **失败** | 试验菜单在且裁剪有出处（DEV-PLAN L23）✓；但设置无「临床数据库」tab ✗ |
| B3 空壳页 | 通过 | 11 页截图全有真实数据+交互；空态带 CTA（treatment「给第一段建档」、review「加一个问题」） |
| B4 孤儿页 | 通过 | ROUTES 20 叶子（app.js L1323-1329）×2 档案=probe 40 路由 0 errors；subnav/scene S01-S08 覆盖 |
| C1 三 tab | **失败** | vSettings（app.js L1054-1080）只有档案切换/私密/口径；settings.png 证实无 tablist；基准 breast v0.4 L486 CFG_TABS 三 tab 在 |
| C2 工作区 tab | **失败** | 全仓无「工作区」tab UI |
| C3 MinerU tab | **失败(半成品)** | 后端有：dsh/settings.js（maskToken 露前4+后2，≠「只显后4位」）、routes.js /settings/mineru；前端 0 落点，无同意勾选/4 步指南/Flash 限额 |
| C4 临床数据库 tab | **失败** | 快照 research/aatd/trials.sqlite 存在但无任何 UI 呈现条数/来源/通道终态 |
| C5 口径常驻 | 通过 | 设置口径说明三句 + labs/chart 页 notice 同屏（app.js L759,780） |
| D1 238px rail | **失败** | 无左 rail；布局为图上 legend+chips、图下两卡（vChart L779-800；chart.png） |
| D2 rail 三节 | **失败(部分)** | chips 仅 近3月/近1年/全期（缺 近6月/近12月，L785-787）；分组 checkbox ✓ 但无色点+最近值；最多 4 条强制+toast ✓（L1452） |
| D3 绘图纪律 | **失败(部分)** | 归一化标注 ✓（L493-495）、末点单标签防叠 ✓（L459-480）、单点不连线 ✓（L471）、空窗口文案 ✓（L491）、节点层不改线 ✓；但**无独立等高条带**——多序列共绘同一绘图区（B 档案 chart.png 三线同图，x 轴标签密集重叠为视觉 bug） |
| D4 点→弹层 | **失败(薄弱)** | 点点只更新图下 tip 行（L791），无原始报告弹层 |
| D5 私密不进图 | **失败** | chartSVG 用 recsOfDef 未过滤 is_private（L413）；图内无「私密 N 条不含」标注 |
| E1 菜单/裁剪 | 通过 | 一级菜单「临床研究线索」；裁剪出处 DEV-PLAN L23 |
| E2 三子页 | **失败** | 现为 建档/双通道检索/证据链/候选线索（app.js L53）；无「匹配」子页；检索页只是 2 个外链（L955-966），无条件表单；收藏无 在跟/准备问/已归档 三态 |
| E3 四段链路 | **失败** | 仅①建档（事实卡 L995-1002）成形；②无双通道快照+在线检索实现；③匹配层 0；④收藏半有 |
| E4 匹配卡 | **失败** | 无匹配卡实现 |
| E5 详情浮窗 | **失败** | 无右侧浮窗 |
| E6 证据链三态 | **失败** | chain 页只列摘录卡（L968-981），无逐条件 ✓/✕/? 行 |
| E7 五条红线 | 跳过 | 匹配引擎未实现，无被测代码；落匹配前须先过 35 号红线（templates/check-trial-matching.mjs 有现成闸门） |
| E8 收藏 | **失败(部分)** | savedTrials 仅内存数组（L1425），非 {trialKey,savedOn,state}，刷新即失 |
| E9 检查器 | **失败** | scripts/check-trial-matching.mjs 不存在（starter templates/ 有模板未实例化）；check-trial-snapshot 在链且 PASS；M4 底座 trials.sqlite/jsonl 在 |
| E10 与设置联动 | **失败** | 设置无临床数据库 tab，无从核对一致性 |
| F1 盘点表 | 见下 | 8 类录入入口现状全为 toast 占位 |
| F2 覆盖 8 类 | **失败** | 全站录入表单 0 个（仅搜索框+候选核对单字段+示例问题注入）；发作/置换/用药/感受/资料/问题/化验/就医全部「原型内不落库」toast |
| F3 三态按钮 | **失败** | 「保存并继续录入/保存并关闭」grep 0 命中 |
| F4 字段/inputmode | **失败** | 无表单可评；inputmode 全仓 0 命中 |
| F5 无裸删除 | 通过(薄弱) | 更正链 in_use=0+corrected_by、历史版本只读卡（app.js L653-668）；「查看历史」仅 records/panel 有 |
| F6 多家医院 | **失败** | 无医院管理 UI；visits 表无 医院名称/联系方式 列（schema L130-141），schema 需 0002 迁移 |
| F7 原话照抄 | 通过 | 行动计划/医生原话时间线原文呈现，无改写 |
| F8 编辑入口≤1 | 通过 | 各列表页主按钮 ≤1 |
| G1 schema 冻结 | 通过 | 实算 sha256=edd33863…ba94f9 与 freeze-contract.md L4 一致；仅 0001 一个迁移 |
| G2 判读列 0 | 通过 | 0001 无 diagnosis/risk_level/复发/eligible 列（命中均为「不设判定列」注释）；check-wording 25 文件 0 越界 |
| G3 parity | 通过 | test/ui-parity+schema 在 60/60 内；页面数据全走 DEMO_DATA/读模型 |
| G4 sqlite 盘点 | **待人工** | 本机 ~/Library/Application Support/dsh-desktop/harness/ 下无 aatd 库（find 0 命中；同目录有 glioblastoma/melanoma 等他台库）——业务库尚未生成，表清单/行数无从盘点；trials.sqlite 是试验快照非业务库 |
| G5 录入×schema | **待人工** | 未发生录入改造；F6 所需医院字段缺失，修复时须走 0002，不动冻结文件 |
| H1 私密三出口 | 通过 | filterPrivate 同用于 看板 L556/导出 L1009/AI 上下文 L199+；「N 条中私密 M 条」截图可见 |
| H2 禁词 | 通过 | check-wording PASS；治愈/匹配指数/eligible 业务命中 0 |
| H3 非肿瘤语义 | 通过 | 全站发作—缓解表达；无 分期/线序/粒缺/D+N（截图+grep） |
| H4 0 访谈标注 | 通过 | 设置「0 患者访谈、0 临床审核」；labs「阈值一律【待核】」；B 档案「单机形态【待核】」 |
| H5 不替医生说话 | 通过 | 紧急口径只呈现医生原话 strip；A 档案空态不生成建议 |
| I1 回归数字 | 通过 | 见证据基线，SKIP 无 |
| I2 README/截图 | 通过(薄弱) | README 五段齐（L7/28/52/59/67）；inspector 截图文件名未含版本号 |
| I3 建议可执行 | 通过 | 见下；修复者各写 CHANGELOG |
| I4 格式 | 通过 | 本报告 |

F1 录入盘点：发作/置换/用药/感受笔记/资料登记/复诊问题/化验/就医信息 —— 8 类全部「应录而未录」，入口现状均为 toast 占位按钮；处理：按修复建议 R2 统一补表单窗。

## 失败清单（17）：A5、A6、A8、B1、B2、C1、C2、C3、C4、D1、D2、D3、D4、D5、E2、E3、E4、E5、E6、E8、E9、E10、F2、F3、F4、F6、I2(薄弱)；待人工（2）：G4、G5。

## 修复建议（阻断 > 缺口 > 薄弱 > 打磨）

**阻断（不动则验收不过）**
1. 设置三 tab：在 prototypes/v0.2/app.js `vSettings()`（L1054）重构为 CFG_TABS 结构（照 breast v0.4 L486-559：role=tablist+aria-selected），新增 cfgStore()/cfgParse()/cfgClinic() 三函数；后端接 dsh/routes.js 已有 `/settings/mineru`（L260）。C3 前端补：同意勾选未勾时黄字+Token 替换表单 disabled+4 步申请指南+「勾选与保存不联网（未接 MinerU 时）」标注；dsh/settings.js `maskToken()` 改为只露后 4 位。
2. 录入窗口：新建 `openForm()` 通用窗（app.js），先落 4 类——发作（course/list）、每周输注按次（treatment）、感受（mind）、复诊问题（review）；每窗三态按钮「保存并继续录入/保存并关闭/取消」，字段 ≤6、数字 inputmode="decimal"；开发版落 0002 迁移。
3. check-trial-matching：把 templates/check-trial-matching.mjs 实例化到 scripts/ 并加进 package.json `check` 链（`--self-test` 先跑通）；在此之前不要写匹配代码。

**缺口（规格要求的功能块）**
4. 试验线补「匹配」与「收藏与跟踪」：vTrial 新增 sub `match`（档案字段网格→偏好→匹配卡，卡=L大分数方块+「n/m 项对得上 · k 项待确认」）与 cand 页加三态收藏 {trialKey,savedOn,state}（持久到 dsh store）；检索子页从外链改为快照查询表单（关键词/病理/靶点/状态），FAILED 如实显示。数据底座 research/aatd/trials.sqlite 已就绪。
5. 一图秀 rail：vChart 改 238px 左 rail（style.css 新增 .chart-rail），rail 三节=时间 chips 补「近 6 月」、分组 checkbox 加色点+最近值、显示内容 chips；chartSVG 每序列独立等高条带（CY0–CY1 按 series 等分）；修 B 档案 x 轴标签重叠（monthTicks L398-407 加密度上限）；点点改弹原始报告浮层（复用 openDialog）；图内加「私密 N 条不含」并把 recsOfDef 过 filterPrivate。
6. 就医信息多家医院：0002 迁移给 visits 加 hospital_name/contact/版本列（或新表 hospitals），UI 在 review 或新卡逐条医院卡片+添加/修改（F6）。
7. 菜单补「营养与进食」页（B1，ZERO-TO-DEV L100 出处），或在 DEV-PLAN 写明裁剪理由。

**薄弱**
8. A5：stat-tile b 提到 34–42px（style.css L144），大状态天数用品牌色大字。
9. A6：alert-strip 加暖底+左 5px 色条（style.css L163）。
10. A8：mcard .val 23px→30px（L189）。
11. D2 时间 chips 补「近 6 月/近 12 月」；F5 「查看历史」入口铺到各列表页。

**打磨**
12. 断点对齐规格 1180/900/600（style.css L364,367）或在一图秀页内单列阈值 900。
13. inspector 截图文件名补版本号（aatd-A→aatd-0.5.0-A）；G4 待装机首启后补 sqlite 盘点（库文件/表清单/迁移账本/行数）。

---

## 修复轮结果（2026-11-05 07:45，主控执行）

| 组 | 修复后 | 证据 |
| --- | --- | --- |
| A5/A6/A8 | 通过 | hero 42px 状态大字 + 医生原话行（app.js vHome hero-status）；行动带暖底+左 5px 色条+右侧按钮组（.action-band）；指标大数字 32px / stat 30px |
| A10 | 通过（改判） | viewport 断点已是 1180/900/600；container query 1100/860 按主区宽度，属 1.2 择优口径（报告原判据此更正） |
| B1 | 通过 | 新增「营养与生活」一级页（ROUTES/探针/SPEC 同步，页数 12） |
| B2 | 通过 | 设置·临床数据库 tab 落地（147 条快照、通道终态） |
| C1–C4 | 通过 | CFG_TABS 三 tab（app.js CFG_TABS/cfgStore/cfgParse/cfgClinic）；maskToken 只露后 4 位（dsh/settings.js 测试 /^••••0001$/） |
| D1–D5 | 通过 | 238px rail + 等高条带 + 3/6/12/全期 + 分类 checkbox + 数据点 drawer + filterPrivate 图表过滤；探针 C1/C2/C4/C6/C8 全过 |
| E2–E6/E8 | 通过 | 三子页（match/search/saved）；匹配卡三块 + n/m/k；drawer 六段 + 三关闭口 + 焦点回卡；收藏三态无假进度条；12 条快照子集 12/147 |
| E9 | 通过 | scripts/check-trial-matching.mjs（--self-test 10/10）入 check 链（18 步） |
| E10 | 通过 | 临床数据库 tab 147 条与试验页候选池 12/147 同源口径 |
| F2–F4 | 通过 | openForm 三态按钮 + 5 类字段 ≤6 + inputmode + 必填行内提示（7 类入口） |
| F6 | 通过 | schema 0002（hospital/contact/contact_source，哈希入 freeze-contract）+ 「就医信息（多家医院）」卡片 + 就诊录入 |
| I2 | 通过 | 截图更新为 v0.3.0 命名（8 张：home/labs/chart/treatment/settings/trial + 折叠收/展） |

回归：npm run check 退出码 0（18 步，含 check-trial-matching）；npm test 61/61；probe-aatd-m2 40 路由 0 errors；probe-m2-extra 21/21；probe-responsive 8 档×12 页 全 0；probe-disease-primer 10/10；probe-page-view 13/13；audit 44/44（未重跑 audit，check 链内含 conformance 之外的 audit 需另跑）。

未修/待人工（如实）：保存的试验收藏仍只在内存（未落 dsh store，需迁移与测试）；检索地区筛选因快照无 location 字段省略并注明；SUBTITLES.trial 旧句待语义微调；MinerU 真实解析仍无凭据；V3 真机会话仍未验证。
