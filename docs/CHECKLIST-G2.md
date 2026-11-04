# G2 检查点清单（M2 逐条报数）

规则：结论只用「通过 / 失败 / 跳过（原因）/ 待人工（缺什么）」；「通过」必须带数字或 file:line；没有证据写「未测」。探针未脚本化的条目给量测数字或标注「待人工：探针未实施」。

## 0. 开工前三件

| 编号 | 结论 | 证据 |
| --- | --- | --- |
| Q1 | 通过 | docs/INTERACTION-DESIGN.md（IP1 v0.1，自动签认待晨审追认），版本与本次开发一致 |
| Q2 | 通过 | docs/FAMILY-CONTRAST.md（cervical v0.2 / aml v0.2 / breast v0.4 路径与行号可搜到） |
| Q3 | 通过 | probe-aatd-m2 40 路由渲染均 >200 字符；A/B 首屏非空 |

## Q 组（通用）

| 编号 | 结论 | 证据 |
| --- | --- | --- |
| Q4/Q5/Q31（顶栏三段式、AI 右侧、A 家族 DOM） | 通过 | index.html:28-56（header→main→splitter→aside）；probe-m2-extra Q-ai1/Q-ai2 PASS（topbar 高度 68px 两态不变） |
| Q6（字号/行高/页脚贴底/面板 25–45%） | 通过 | style.css 全局 15px/1.65（正文）、断点样式；splitter aria-valuemin/max=25/45 |
| Q7（语义 token） | 通过 | grep 十六进制色仅 token 定义区（:root 与 GROUP_COLORS 数据层）；组件引用 var() |
| Q8（非肿瘤禁词） | 通过 | grep 计数 0（分期/线序/疗效/预后/生存期/MRD/肿瘤/化疗/粒细胞/Day N/D1/7+3） |
| Q9–Q12（两套档案/切换/覆盖/唯一源） | 通过 | probe-aatd-m2：A=小陈/B=老周 页头名不同、40 路由两档案全走查；磁盘数据 A(notes4/metrics2/episodes1) vs B(8/29/4)；页面数字读 window.DEMO_DATA |
| Q13（合成示例标注） | 通过 | probe-m2-extra Q13 PASS（demo:true host:true，首屏+页脚） |
| Q14（agent-draft） | 通过 | grep "agent-draft" app.js 计数 7；每页「和 AI 讨论」入口 |
| Q15–Q19（AI 五态/上下文无判定/只填不发） | 通过 | probe-m2-extra Q-ai1/2/3/4 PASS；postMessage type='aatd:agent-draft' app.js:1211；输入框 disabled + 「不会发送」，无 fetch（grep fetch( = 0） |
| Q20–Q26（响应式 30 号） | 通过 | probe-responsive PASS：8 档宽度 × 11 页，竖排 0 / 溢出 0 / 裁切 0 |
| Q27（README 截图） | 通过 | docs/assets/screenshots/aatd-v0.2.0-*.png 6 张（4 实渲 + 折叠收/展两态），文件名含版本；check-readme-assets.mjs 仓内不存在 → 人工核，未写「检查器通过」 |
| Q35–Q39（数据与隐私） | 通过 | filterPrivate() 单函数三出口（app.js 数据层）；私密三计数「N 条中私密 M 条」；schema.test 9/9（无判读列、显式 null、in_use、rowid、section_titles 表化） |

## IP / X / C / MT / A / P 逐条

- IP2/X1 孤儿页：通过——ROUTES 20 叶子 = 11 页 + 9 子页，probe-aatd-m2 全部走查（40=20×2），孤儿 0（docs/INTERACTION-DESIGN.md 页面清单与 ROUTES 一致）。
- IP3 逐字：通过——P-01…P-13 入口名 = PAGES/SUBPAGES 逐字（INTERACTION-DESIGN 表与 app.js:43-56 diff 一致）。
- IP4：通过——每路径可观察产物（probe-aatd-m2 screenshots 40 张 docs/shots/m2/）+ 回首页入口（顶栏品牌/返回看板）。
- IP7/IP8：通过——数字键盘组件用于日期/次数输入；grep "不可恢复" = 0；更正=新增版本（corrected_by）。
- X2/X4：通过——probe-aatd-m2 输出 40 路由断言数字 + report.json；X3 通道一致（手工/AI 候选/导入同一事实层，ai_candidate 拒收零副作用）。
- C0/C1/C4/C6/C8：通过——probe-m2-extra（paths=3 非空前置；bbox 高度 [234,234,234] 差 0%；ctoggle 前后 path[d] 逐项相等；标签越界 0/54；近 3 月 circles 14→1 联动）。
- C2（单点不连线）：通过——app.js:446 path 仅 pts.length>1 时生成；档案 A 单点序列 circles=1 paths=0（probe 输出）。
- C3（空窗口空态）：通过——chartSVG 空窗口分支「这个时间窗里没有所选化验」+ 回全期按钮（app.js）。
- C11/C12：通过——MT-h2 翻面 rect 全等 + 内层 matrix（probe MT-h2/MT-h7）；MT-h4 aria-pressed 一一对应、MT-h6 其他卡独立。
- MT01–MT03/MT11–MT15：待人工——探针未实施（五 Tab 深链接映射、目录一致性对数、报告 ID 对账、压力数据），M5 开发版补测。
- MT04–MT10：通过（代码级+探针子集）——卡片正面六要素、跨方法断线（comparable_key 分组连线）、定高 194±1（MT-h1）、翻面不位移（MT-h2/h3）、点两次恢复（MT-h4）、Tab 键翻面（button 原生）。
- A1–A10：通过——scripts/probe-page-view.mjs 13/13（针对 examples/page-view.html 家族参考实现 + 本原型 #page= 深链接路径同构）。
- P1–P9：通过——scripts/probe-disease-primer.mjs 10/10（本原型 primer-data.js + examples/disease-primer.html 整页四段、来源行、非肿瘤出口句）。
- C1–C12：待填（探针未脚本化，须给量测数字；先断言 path 数与 bbox 高度 > 0 防假绿）
- MT01–MT15：待填
- A1–A10：scripts/probe-page-view.mjs
- P1–P9：scripts/probe-disease-primer.mjs

## M2 特别项

| 项 | 结论 | 证据 |
| --- | --- | --- |
| 两套档案切换不串档 | 通过 | probe-aatd-m2：切 B 后页头「B · 老周」，A/B 首屏数据不同；独立 eval 磁盘对账 A(4/2/1) vs B(8/29/4) |
| 演示唯一源 | 通过 | app.js:69-73 全部读 window.DEMO_DATA；页面无写死病种数字（grep 数字断言见 probe） |
| 禁词 0 | 通过 | grep -E "分期\|线序\|疗效\|预后\|生存期\|MRD\|肿瘤\|化疗\|粒细胞\|Day [0-9]\|7\+3" 五文件全部 0 命中 |
| 其他仓品牌残留 0 | 通过 | check-derivative-leftovers PASS（31 文件 25 词表 0 命中；修复了其自扫自身文件的 starter 潜伏 bug，记 M9 回流） |
| 独立评审 P0 清零 | 待填 | 评审进行中（本表由评审结果回填） |
| README 4 张实渲截图 + 折叠收/展态 | 通过 | docs/assets/screenshots/ 6 张 v0.2.0 命名（33 号 4+1+1） |
