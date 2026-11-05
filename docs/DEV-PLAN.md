# 开发计划与阶段证据（唯一进度来源）

病种：α1-抗胰蛋白酶缺乏症（AATD，罕见病 #6 · R2 非肿瘤慢性病型 · T2）
仓：aatd-workbench（私有，Issue 认领 #58）
更新：2026-11-05 04:05（夜班收尾）。状态只分：✅ 实测完成、🔧 骨架/草案、⏳ 未实现、⛔ 闸口待签。文档自述不能替代证据。

## 认领理由（M0 记录）

- BACKLOG 2026-10-26 版中 T0/T1 未认领条目经核实均已被认领：T1 的成人斯蒂尔病（Issue #51，v0.5.9 开发中）、ANCA（#44）、白塞病（#56）、发作性睡病（#37）、PBC（#35）等；儿童线（R3）认领主体必须为患儿家长，本窗口不适用。
- 未认领池中按「随访天然结构化 + 与已有仓差异化明显」选 AATD（T2）：
  - 结构化：肺功能（FEV1/FVC/DLCO）与肝功能（ALT/AST/GGT）周期复查、每周加强治疗输注按次记录、急性加重发作—缓解病程，全部天然落在家族引擎（指标卡/趋势图/折叠卡/泳道）上。
  - 差异化：家族 45 仓无呼吸系统病种；肺—肝双器官随访 + 家系筛查维度无重叠仓。
- 认领动作：Issue #58 创建并 /claim、claimed 标签已挂（2026-11-05）。

## 可回退默认值（无人值守，待晨审追认）

| 项 | 默认值 | 依据 |
| --- | --- | --- |
| 服务主体 | 成人 AATD 患者及家属；家系成员仅作线索记录，不做成主视角 | R2 FSHD 形态 |
| 病程覆盖 | 确诊后长期随访（含急性加重发作—缓解），不含确诊前筛查流程 | 避免筛查判定 |
| MinerU | 未接入；报告录入走手工/AI 候选两通道 | 夜间无凭据 |
| 品牌占位名 | 小筛宝 A1Pal | 家族命名法 |
| 试验线 | AATD 相关临床试验线索按 35 号四段链路裁剪执行；检索失败如实记 FAILED，不写零结果 | 35 号 |
| git 推送 | 仅推私有新仓自身分支；M7 tag/release、M8 BACKLOG PR 只备草稿 | 无人值守对外边界 |

## 阶段台账

| 阶段 | 范围 | 出口与证据 | 状态 |
| --- | --- | --- | --- |
| M0 | 认领（Issue #58）、starter init（205 文件）、接线前置（patch config.root + dsh 块 + repository）、文档九件、基线 check | `npm run check` staticPass=true 退出码 0；patch 根声明警告已记缺口（服务端是否读 config.root 待核） | ✅ 实测完成（骨架） |
| M1 | 医学十主题台账、用户研究证据分层（0 访谈如实）、家族结构对比（cervical + aml）、DIFF-MATRIX 全量（重名率实测）、SPEC、INTERACTION-DESIGN | docs/signoffs/G1-自动签认.md；重名率 4/11=36% | ✅ 实测完成（G1 签认待追认） |
| M2 | 两套合成档案演示数据构建器 + prototypes/v0.2 四件套 + 检查点清单逐项 | docs/signoffs/G2-自动签认.md；探针 40 路由/响应式/primer 10·10/page-view 13·13/extra 21·21；评审 P0=0 | ✅ 实测完成（G2 签认待追认） |
| M3 | schema/0001_initial.sql + freeze-contract（sha256） | schema/freeze-contract.md sha256=edd338…4f9；test/schema 9/9；G3 签认 | ✅ 实测完成 |
| M4 | research/aatd/ 四件套（fetch-list / fetch-cn-registries / build-snapshot / LEDGER） | check-trial-snapshot PASS：147/147，4 通道状态 | ✅ 实测完成 |
| M5 | 七步移植 + apiBase 契约 + MinerU v2 六部件 + test 五套 | check 17 步=0；test 60/60；audit 44/44；V1 签认（主控复测） | ✅ 实测完成 |
| M6 | 装机 DSH Desktop | tgz 48 文件/bundle #61/宿主清单含本包/:43129 鉴权 401 实证；V2 签认；V3 停闸待人工 | ✅ 装机完成（会话级未验证） |
| M7 | tag + release（无人值守只备草稿 docs/release-draft/） | RELEASE-NOTES-v0.5.0.md 草稿就绪 | 🔧 草稿冻结（晨审放行） |
| M8 | BACKLOG 状态行回填（无人值守只备 PR 草稿） | BACKLOG-STATUS-PR.md 草稿就绪（31 号口径） | 🔧 草稿冻结（晨审放行） |
| M9 | 经验收敛回流 starter + MORNING-REVIEW.md | starter 1.10.0-rc.13（自排除修复+L61–L65+probe 模板）；starter 自检 214 pass/test 67·67；MORNING-REVIEW.md 六节 | ✅ 实测完成 |

## 闸口记录

| 闸口 | 结果 | 证据 | 签认 |
| --- | --- | --- | --- |
| G1 | ⏳ | — | 待 M1 完成后自动签认（待晨审追认） |
| G2 | ⏳ | — | — |
| G3 | ⏳ | — | — |
| V1 | ⏳ | — | — |
| V2/V3 | ⏳ | — | — |

## INSPECTOR 修复轮（2026-11-05，FAMILY-INSPECTOR）

- 审查报告：docs/INSPECTOR-REPORT-2026-11-05.md（27 失败 / 2 待人工）。
- 已修：C1–C4 设置三 tab（工作区/文档解析 MinerU/临床数据库，token 只露后 4 位）；F2–F4 通用录入窗（三态按钮、≤6 字段、inputmode、必填提示，5 类入口）；B1 营养与生活页（体重按次记录，不判读）；A5/A6/A8（42px 状态大字、暖底左条行动带、指标大数字 ≥30px）；A10 改判（viewport 断点已为 1180/900/600，container query 按主区宽度属 1.2 择优）；F6 schema 0002（visits + hospital/contact/contact_source）与演示数据多家医院。
- 进行中：D1–D5 一图秀 rail 双栏 + E2–E6/E8/E10 试验匹配层（专项代理）。
- 版本：0.5.0 → 0.3.0 原型轮次（原型 v0.3.0 / 开发版随升）。

## 2026-11-05 晚：E8 收藏落库 + 0.6.0 重装

- schema 0003_saved_trials.sql（UNIQUE(profile,trial_key)，三态 following/to_ask/archived；哈希入 freeze-contract）。
- 路由：GET/POST /saved_trials（upsert 语义：重复收藏=改 state；非法 state 400）+ /saved_trials/:id/state|remove + /saved_trials/by-key/remove；GET 只出 in_use=1。
- 开发版客户端：applyData 水合 saved_trials → 本机收藏态；toggle/三态切换 persistTrialSave/persistTrialState（DATA_SOURCE==='api' 时 POST，失败 toast 不丢本地）。
- 测试 63/63（新增 store ⑤ upsert/remove 幂等、server ⑨ 路由正反例）；check 18 步=0；audit 44/44。
- 装机：0.6.0 tgz 重装 Desktop profile + bundle 登记 + 真机路由注册实证（V2 追加签认见 docs/signoffs/V2-V3-自动签认.md）。
