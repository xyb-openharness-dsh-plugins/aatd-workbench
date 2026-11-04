# Release notes 草稿 · 小筛宝 A1Pal v0.5.0（无人值守冻结，M7 由晨审放行）

> 状态：草稿。tag 与 GitHub release 属无人值守禁止动作，晨审追认后执行。
> 发布物：xyb-community-aatd-workbench-0.5.0.tgz + sha256（M6 pack 后补录）。

## 变更（v0.1.0 骨架 → v0.5.0 开发版）

- 原型 v0.2.0：11 一级页 + 9 子页、A/B 两套合成档案、发作—缓解语义（非肿瘤）、私密三出口、AI 候选通道、疾病概要四段（含 NHC 官方指南 PDF 来源）。
- 开发版：src→build→lib 客户端链、dsh 服务模块（SQLite @ dshHomePath('aatd')）、REST 路由（鉴权+错误契约）、MinerU v2 六部件（token 文件优先；真机解析未验证——无凭据）、版本十处同源。
- 检查链：npm run check 全绿；test 六套全过；探针：40 路由×2 档案、8 档响应式、primer 10/10、page-view 13/13、m2-extra 20/20。
- 闸口：G1/G2/G3 自动签认（待追认）；V1 完成后冻结本 tag。

## 已知限制（如实）

- 0 患者访谈、0 临床审核；阈值全部【待核】。
- MinerU 真机解析未验证（无 Token）。
- Desktop 装机验证状态见 MORNING-REVIEW（无人值守窗口如实记录）。
