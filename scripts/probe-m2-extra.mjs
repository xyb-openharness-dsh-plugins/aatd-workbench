#!/usr/bin/env node
/**
 * AATD M2 补充量测探针：C 组（一图秀）/ MT 组（指标卡 3D）/ Q 组（AI 面板与隐私）可断言子集。
 * 覆盖不到的条目在 docs/CHECKLIST-G2.md 里如实标「待人工：探针未实施」，不冒充通过。
 *
 * 用法：node scripts/probe-m2-extra.mjs；退出码 0/1。依赖本机 Chrome。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, sleep, stopChrome } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'docs', 'shots', 'm2-extra');
mkdirSync(SHOTS, { recursive: true });
const CDP_PORT = Number(process.env.AATD_EXTRA_CDP_PORT || 9369);
const URL_APP = `file://${join(ROOT, 'prototypes', 'v0.2', 'index.html')}`;

const ch = await launchChrome({ port: CDP_PORT });
const { cdp } = ch;
const results = [];
const check = (id, name, ok, detail = '') => { results.push({ id, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${name}${detail ? '  — ' + detail : ''}`); };
const shot = async (file) => { const s = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(s.data, 'base64')); };

const go = async (hash) => { await cdp.eval(`location.hash = '#${hash}'; window.dispatchEvent(new Event('hashchange'));`); await sleep(200); };

try {
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(700);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false });

  /* 切到档案 B（多年随访、点数多）：C/MT 断言需要多点多卡；A 套在 probe-aatd-m2 已覆盖 */
  await cdp.eval("document.getElementById('profile-top').click()"); await sleep(200);
  await cdp.eval("[...document.querySelectorAll('[data-pick-profile]')].find(x => x.dataset.pickProfile === 'B').click()"); await sleep(300);
  const profName = await cdp.eval("(document.getElementById('profile-top-name')||{textContent:''}).textContent.trim()");
  if (!profName.startsWith('B')) throw new Error(`档案切换失败：当前=${profName}`);

  /* ---------- C 组：一图秀 ---------- */
  await go('chart');
  const chartInfo = JSON.parse(await cdp.eval(`(() => {
    const svg = document.querySelector('#main svg.chart') || document.querySelector('#main svg');
    if (!svg) return JSON.stringify({ hasSvg: false });
    const paths = [...svg.querySelectorAll('path')];
    const circles = [...svg.querySelectorAll('circle')];
    const texts = [...svg.querySelectorAll('text')];
    const vb = svg.viewBox && svg.viewBox.baseVal;
    const out = {
      hasSvg: true, pathCount: paths.length, circleCount: circles.length, textCount: texts.length,
      fillNone: paths.every(p => getComputedStyle(p).fill === 'none'),
      bboxHeights: paths.slice(0, 4).map(p => Math.round(p.getBBox().height * 10) / 10),
      textOverflow: texts.filter(t => { const b = t.getBBox(); return b.x < 0 || b.y < (vb ? vb.y : 0) || (vb && b.x + b.width > vb.x + vb.width); }).length,
      viewBox: vb ? [vb.width, vb.height] : null,
    };
    return JSON.stringify(out);
  })()`));
  check('C0', '一图秀 svg.chart 存在且 path 非空（防假绿前置）', chartInfo.hasSvg && chartInfo.pathCount > 0, `paths=${chartInfo.pathCount} circles=${chartInfo.circleCount}`);
  check('C-computed', '全部 path computed fill=none（16 号合同）', chartInfo.fillNone === true, `paths=${chartInfo.pathCount}`);
  if (chartInfo.pathCount >= 2) {
    const hs = chartInfo.bboxHeights;
    const max = Math.max(...hs), min = Math.min(...hs);
    check('C1', '量纲差异大的序列占满纵向区（高度差 <10%）', max > 0 && (max - min) / max < 0.1, `bbox 高度 [${hs.join(', ')}]`);
  } else {
    check('C1', '量纲差异大的序列占满纵向区', false, 'path < 2 条，无法比较');
  }
  check('C6', '数值标签不越界（viewBox 内）', chartInfo.textOverflow === 0, `越界 ${chartInfo.textOverflow}/${chartInfo.textCount}`);

  /* C2 单点不连线 / C3 空窗口：构造后切换时间窗验证 */
  const winInfo = JSON.parse(await cdp.eval(`(() => {
    const btn = [...document.querySelectorAll('#main [data-action="range"]')];
    const before = document.querySelector('#main svg.chart') ? document.querySelectorAll('#main svg.chart path').length : -1;
    /* 真实点击「近 3 月」：联动后点数减少（C8；path 数不变，用 circle 数量测） */
    const circlesBefore = document.querySelectorAll('#main svg.chart circle').length;
    let after = -1, circlesAfter = -1;
    const b3m = btn.find(b => b.dataset.range === '3m');
    if (b3m) { b3m.click(); }
    const svg2 = document.querySelector('#main svg.chart');
    after = svg2 ? svg2.querySelectorAll('path').length : -1;
    circlesAfter = svg2 ? svg2.querySelectorAll('circle').length : -1;
    /* render 会替换 DOM，必须重查后再点（脱节点上的 click 不冒泡到 document） */
    const ball = document.querySelector('#main [data-action="range"][data-range="all"]');
    if (ball) ball.click();
    return JSON.stringify({ rangeButtons: btn.map(b => b.dataset.range), pathsBefore: before, pathsAfter3m: after, circlesBefore, circlesAfter });
  })()`));
  check('C8-pre', '时间窗控件存在（近 3 月/近 1 年/全期）', Array.isArray(winInfo.rangeButtons) && winInfo.rangeButtons.length >= 2, JSON.stringify(winInfo.rangeButtons));
  check('C8', '时间窗联动：切近 3 月后数据点减少（circle 数下降且非空前置）', winInfo.circlesBefore > 0 && winInfo.circlesAfter > 0 && winInfo.circlesAfter < winInfo.circlesBefore, `circles ${winInfo.circlesBefore} → ${winInfo.circlesAfter}`);

  /* C4 治疗节点开关不改曲线 */
  const c4 = JSON.parse(await cdp.eval(`(() => {
    const t = [...document.querySelectorAll('#main [data-action="ctoggle"] input, #main [data-action="ctoggle"]')];
    if (!t.length) return JSON.stringify({ hasToggle: false });
    const rangeAll = document.querySelector('#main [data-action="range"][data-range="all"]');
    if (rangeAll && rangeAll.getAttribute('aria-pressed') !== 'true') rangeAll.click(); /* 回到全期再测 */
    const el = t[0].matches('input') ? t[0] : t[0].querySelector('input') || t[0];
    const before = [...document.querySelectorAll('#main svg.chart path')].map(p => p.getAttribute('d'));
    el.click();
    const after = [...document.querySelectorAll('#main svg.chart path')].map(p => p.getAttribute('d'));
    el.click();
    return JSON.stringify({ hasToggle: true, same: JSON.stringify(before) === JSON.stringify(after) && before.length > 0, count: before.length });
  })()`));
  check('C4', '关治疗节点不改曲线（path[d] 逐项相等且非空）', c4.hasToggle === true && c4.same === true, `paths=${c4.count}`);

  /* ---------- MT 组：指标卡 3D ---------- */
  await go('labs');
  const mt = JSON.parse(await cdp.eval(`(() => {
    const card = document.querySelector('#main .mcard[data-mcard]:not([data-static])');
    if (!card) return JSON.stringify({ hasCard: false });
    const before = card.getBoundingClientRect();
    const inner = card.querySelector('.mcard-inner');
    const bodyBefore = document.body.scrollHeight;
    card.click();
    const pressed = card.getAttribute('aria-pressed');
    const flipTransform = inner ? getComputedStyle(inner).transform : '';
    const rectFlipped = card.getBoundingClientRect();
    const others = [...document.querySelectorAll('#main .mcard[data-mcard]:not([data-static])')].filter(c => c !== card).map(c => c.getAttribute('aria-pressed'));
    const heights = [...document.querySelectorAll('#main .mcard')].map(c => c.getBoundingClientRect().height);
    card.click();
    const backPressed = card.getAttribute('aria-pressed');
    const rectBack = card.getBoundingClientRect();
    const bodyAfter = document.body.scrollHeight;
    return JSON.stringify({
      hasCard: true,
      height: Math.round(before.height),
      flipHeight: Math.round(rectFlipped.height),
      backHeight: Math.round(rectBack.height),
      bodyStable: bodyBefore === bodyAfter,
      pressed, backPressed,
      maxHDiff: Math.round(Math.max(...heights) - Math.min(...heights)),
      othersPressed: others,
      hasMatrix: flipTransform.includes('matrix'),
    });
  })()`));
  check('MT-h1', '卡定高 194±1px（翻面前）', mt.hasCard && Math.abs(mt.height - 194) <= 1, `h=${mt.height}`);
  check('MT-h2', '翻面不改变栅格高度（翻转前后 rect 全等）', mt.hasCard && mt.height === mt.flipHeight && mt.height === mt.backHeight, `before=${mt.height} flipped=${mt.flipHeight} back=${mt.backHeight}`);
  check('MT-h3', '翻面不引起页面高度变化', mt.hasCard && mt.bodyStable === true, `body ${mt.bodyStable}`);
  check('MT-h4', 'aria-pressed 与翻面一一对应（点两次恢复正面）', mt.hasCard && mt.pressed === 'true' && mt.backPressed === 'false', `pressed=${mt.pressed}->${mt.backPressed}`);
  check('MT-h5', '同 grid 卡片高度差 ≤1px', mt.hasCard && mt.maxHDiff <= 1, `maxDiff=${mt.maxHDiff}`);
  check('MT-h6', '其他卡翻面独立（aria-pressed=false；无其他卡时如实记 SKIP 语义，不计通过）', mt.hasCard && mt.othersPressed.length > 0 && mt.othersPressed.every(v => v === 'false'), `others=${mt.othersPressed.length}`);
  check('MT-h7', '内层 transform 含 matrix（3D 生效）', mt.hasCard && mt.hasMatrix === true, '');

  /* 折叠卡收/展两态截图（README 33 号要求） */
  await go('treatment');
  const hasFold = await cdp.eval("!!document.querySelector('#main details.phase-fold, #main details')");
  if (hasFold) {
    const opened = await cdp.eval(`(() => {
      const d = document.querySelector('#main details.phase-fold, #main details');
      d.open = false;
      return d.open;
    })()`);
    await sleep(150); await shot(join(SHOTS, 'fold-closed.png'));
    await cdp.eval(`(() => { const d = document.querySelector('#main details.phase-fold, #main details'); d.open = true; })()`);
    await sleep(150); await shot(join(SHOTS, 'fold-open.png'));
    check('MT-fold', '折叠卡 details 原生语义 + 收/展两态截图', opened === false, 'docs/shots/m2-extra/fold-{closed,open}.png');
  } else {
    check('MT-fold', '折叠卡 details 存在', false, '未见 details 元素');
  }

  /* ---------- Q 组：AI 面板 ---------- */
  const ai = JSON.parse(await cdp.eval(`(() => {
    const btn = document.getElementById('agent-toggle');
    const pane = document.getElementById('agent-pane');
    if (!btn || !pane) return JSON.stringify({ hasPane: false });
    const r1 = btn.getBoundingClientRect();
    const mainBefore = { sw: document.getElementById('main').scrollWidth, cw: document.getElementById('main').clientWidth };
    btn.click();
    const open = !pane.hidden;
    const r2 = btn.getBoundingClientRect();
    const barStable = (r2.height === r1.height && r2.top === r1.top);
    const mainOpen = { sw: document.getElementById('main').scrollWidth, cw: document.getElementById('main').clientWidth };
    const disabled = [...pane.querySelectorAll('textarea, input')].map(el => el.disabled);
    const saysNotConnected = pane.textContent.includes('未接') || pane.textContent.includes('不会发送');
    btn.click();
    return JSON.stringify({ hasPane: true, open, btnRectStable: barStable, mainNoOverflow: mainOpen.sw <= mainOpen.cw, disabled, saysNotConnected });
  })()`));
  check('Q-ai1', 'AI 面板开关且不遮主区（#main 无横溢）', ai.hasPane && ai.open && ai.mainNoOverflow === true, `open=${ai.open} overflowOK=${ai.mainNoOverflow}`);
  check('Q-ai2', '顶栏不折行（AI 面板开/关两态 topbar 高度不变，Q33）', ai.hasPane && ai.btnRectStable === true, '顶栏单行保持；x 随业务区收窄左移属预期');
  check('Q-ai3', '演示态明说未接入（disabled 输入 + 未接通文案）', ai.hasPane && ai.disabled.every(Boolean) && ai.saysNotConnected === true, `disabled=${JSON.stringify(ai.disabled)} 未接文案=${ai.saysNotConnected}`);

  /* Q-ai4: agent-draft 一键协议存在 */
  const draftProbe = JSON.parse(await cdp.eval(`(() => {
    const links = [...document.querySelectorAll('a[href^="#agent"], a[href^="aatd:agent-draft"], [data-agent-draft]')];
    const a = document.querySelector('a.agent-link, [data-agent-draft]');
    return JSON.stringify({ links: links.length, hasBtn: !!a });
  })()`));
  check('Q-ai4', '正文含 agent-draft 入口（携带上下文）', draftProbe.hasBtn === true || draftProbe.links > 0, `links=${draftProbe.links}`);

  /* 演示标注（Q13）：首屏与页脚都能看到 */
  const demoLabels = JSON.parse(await cdp.eval(`(() => {
    const t = document.body.textContent;
    return JSON.stringify({ demo: t.includes('合成示例') || t.includes('仅演示'), host: t.includes('未接') });
  })()`));
  check('Q13', '界面标注「合成示例/仅演示」+ 未连接宿主', demoLabels.demo === true && demoLabels.host === true, JSON.stringify(demoLabels));

  await shot(join(SHOTS, 'final.png'));
} catch (err) {
  check('CRASH', '探针执行', false, err.message);
} finally {
  writeFileSync(join(SHOTS, 'report.json'), JSON.stringify(results, null, 1));
  const fails = results.filter(r => !r.ok);
  console.log(`\nm2-extra: ${results.length - fails.length}/${results.length} 通过`);
  await stopChrome(ch);
  process.exit(fails.length ? 1 : 0);
}
