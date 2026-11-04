# MORNING-REVIEW · 2026-11-05 夜班（00:55–04:05）

## 一、一句话结论

α1-抗胰蛋白酶缺乏症工作台（aatd-workbench，认领 Issue #58）从认领走到 **M0–M6 + M9 全链**：G1/G2/G3/V1 自动签认通过、V2 装机五要素过且真机 harness 路由注册实证、V3 真机业务闭环停闸待人工（需授权会话操作）；M7/M8 按无人值守纪律只备草稿未发布；无停闸级事故。

## 二、原型审查入口

- 打开方式：双击 `prototypes/v0.2/index.html`（file:// 直开，零依赖）；顶栏「档案 A/B」切两套合成档案。
- 截图：`docs/shots/m2/`（20 叶子路由 × A/B 共 40 张）+ `docs/shots/m2-extra/`（折叠收/展、私密断言现场）+ README 用 `docs/assets/screenshots/aatd-v0.2.0-*.png` 6 张。
- 走查清单：`docs/CHECKLIST-G2.md`（逐条四态+证据路径）。
- 探针复跑：`node scripts/probe-aatd-m2.mjs`（40 路由 0 errors）、`node scripts/probe-m2-extra.mjs`（21/21）、`node scripts/probe-responsive.mjs`、`npm run check`（17 步退出码 0）、`npm test`（60/60）。

## 三、自动签认清单（全部待晨审追认）

| 闸口 | 文档 | 结论 |
| --- | --- | --- |
| G1 | docs/signoffs/G1-自动签认.md | 自动签认通过（医学台账 24 核实/4 未取得/NMPA 412 留痕；重名率 4/11=36%） |
| G2 | docs/signoffs/G2-自动签认.md | 自动签认通过（独立评审 P0=0；P1×6/P2×6 修复后探针全绿） |
| G3 | docs/signoffs/G3-自动签认.md | 自动签认通过（schema 0001 冻结 sha256=edd338…4f9） |
| V1 | docs/signoffs/V1-自动签认.md | 自动签认通过（主控复测 check=0 / test 60/60 / build-client=0 / audit 44/44） |
| V2 | docs/signoffs/V2-V3-自动签认.md | 自动签认通过（装机五要素 + 真机 :43129 鉴权 401 实证路由注册；会话级加载待追认） |
| V3 | 同上 | **停闸待人工**（需新建授权会话做真机走查） |

一切自动签认均非用户确认；晨审须逐项追认。

## 四、待用户决策项

1. **可回退默认值追认**（docs/DEV-PLAN.md 表）：服务主体=成人患者及家属；病程覆盖=确诊后随访；MinerU=未接入（无凭据）；品牌占位名=小筛宝 A1Pal；试验线=35 号四段链路裁剪执行；git 边界=仅推自身私有仓。
2. **M7 放行**：tag v0.5.0 + GitHub release（草稿 docs/release-draft/RELEASE-NOTES-v0.5.0.md，tgz 已 pack 于 release/，sha256 未录——放行时补）。
3. **M8 放行**：BACKLOG 状态行 PR（草稿 docs/release-draft/BACKLOG-STATUS-PR.md，先 pull 最新 main）。
4. **V3 补齐**：打开 DSH Desktop → 新建会话 → 打开小筛宝 A1Pal → 真机走查 + 截图刷新 README（预期路径：dshHomePath('aatd') 数据目录生成 + demo 播种 + 真实 API 200）。
5. **MinerU Token**：提供后走一次真实解析，替换「未验证（无凭据）」。
6. **NMPA 补查**：官方库 412 被拦截，中国适应证/检测试剂批准情况记「未取得」；建议人工在可控网络补查（docs/CLINICAL-DATA.md 8.3/8.4）。
7. **XDPool 告警关注**：harness 日志「5 entries did not activate」（2026-11-04T19:55Z 段，涉及 web-search-free 等），与本包无关（log 无 aatd 行）但未逐一排查。

## 五、消耗

- 时长：00:55–04:05（约 3 小时 10 分，含并行子代理等待）。
- token：客户端可见数据本窗未取得（无遥测读取通道），如实记「未取得」；主会话 + 5 个子代理（医学台账 / 家族对比 / 原型构建 / 评审 / P1P2 修复）+ 1 个 M5 移植代理。模型：会话内 GLM 免费档（glm flash 系），未使用付费额度。

## 六、未验证与异常

- 未验证：MinerU 真实云端解析（无 Token，桩件全过）；V3 真机业务闭环与 dshHomePath 数据目录（需授权会话）；check-primer-links --http 联网核验（结构校验通过，未联网复核 content-type）。
- 异常（已修）：① starter check-derivative-leftovers 自扫自爆（37/39 假残留，M0 起即存在，被管道截断的 EXIT 读取掩盖；starter 已修并回流 L61）；② 原型 range chips 缺 data-action（点击静默无效，C8 探针抓到）；③ 窄时间窗空序列炸断 render（lastPos 对 pts=[] 取 undefined.x，UI 静默不更新；修复+空态分支）；④ ep 标签越界 viewBox（C6）。前三条均已回流 starter（L61–L65）。
- 异常（留痕未修）：NMPA 412；goldcopd.org 超时（GOLD 2025 仅摘要核实）；github.com 直连超时（全程走 SSH/gh api 通道）。
- starter 回流：1.10.0-rc.13（自排除修复 + L61–L65 + templates/probe-all-routes.mjs），starter 自检 check-starter pass（214 文件）/ npm test 67/67。
