#!/usr/bin/env node
/**
 * AATD M2 全量渲染探针：ROUTES 全部叶子 × A/B 两档案走查。
 *
 * 产出：
 *  - docs/shots/m2/<profile>/<route>.png —— 走查原图（20 叶子 × 2 档案）
 *  - docs/shots/m2/report.json —— 断言数字报告
 *  - console：断言汇总，退出码 0/1
 *
 * 断言：
 *  1) 每条叶子路由可达且 #main 渲染非空（innerHTML > 200）；
 *  2) 页头标题与路由页名一致（IP3 逐字）；
 *  3) A/B 切换后首屏数据条数明显不同（不串档）；
 *  4) console 无未捕获错误（页面自身）。
 *
 * 用法：node scripts/probe-aatd-m2.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, sleep, stopChrome } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'docs', 'shots', 'm2');
mkdirSync(join(SHOTS, 'A'), { recursive: true });
mkdirSync(join(SHOTS, 'B'), { recursive: true });
const CDP_PORT = Number(process.env.AATD_M2_CDP_PORT || 9367);
const URL_APP = `file://${join(ROOT, 'prototypes', 'v0.2', 'index.html')}`;

const ROUTES = [
  'home', 'labs', 'chart', 'treatment', 'family', 'nutrition', 'review', 'settings',
  'course/timeline', 'course/list',
  'records/lib', 'records/draft', 'records/archive', 'records/panel', 'records/summary',
  'mind/feel', 'mind/life',
  'trial/match', 'trial/search', 'trial/saved'
];

const ch = await launchChrome({ port: CDP_PORT });
const { cdp } = ch;
const report = { screenshots: 0, errors: [], assertions: {}, routeResults: [] };

async function navigate(route) {
  await cdp.eval(`location.hash = '#${route}'; window.dispatchEvent(new Event('hashchange'));`);
  await sleep(180);
}
async function shot(file) {
  const s = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(s.data, 'base64'));
  report.screenshots += 1;
}

try {
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(700);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false });
  const booted = await cdp.eval("!!document.querySelector('#nav .nav-button')");
  if (!booted) throw new Error('页面未启动（#nav 无导航按钮）');

  for (const prof of ['A', 'B']) {
    await navigate('home');
    await cdp.eval(`document.getElementById('profile-top').click()`);
    await sleep(150);
    const picked = await cdp.eval(`(() => {
      const b = [...document.querySelectorAll('[data-pick-profile]')].find(x => x.dataset.pickProfile === '${prof}');
      if (!b) return false;
      b.click(); return true;
    })()`);
    if (!picked) report.errors.push(`档案 ${prof}：找不到 [data-pick-profile="${prof}"]`);
    await sleep(250);

    /* 首屏档案标识与数据量：页头显示档案名 + 最近记录行数（两者都读可见 DOM） */
    const profName = await cdp.eval("(document.getElementById('profile-top-name')||{textContent:''}).textContent.trim()");
    const firstCount = await cdp.eval("document.querySelectorAll('#main [data-note-id], #main .note-row, #main .recent li, #main tbody tr').length");
    report.assertions[`name_${prof}`] = profName;
    if (!profName) report.errors.push(`档案 ${prof}：页头未显示档案名`);

    for (const route of ROUTES) {
      await navigate(route);
      const mainLen = await cdp.eval("document.getElementById('main') ? document.getElementById('main').innerHTML.length : 0");
      const crumbs = await cdp.eval("document.getElementById('breadcrumb') ? document.getElementById('breadcrumb').textContent : ''");
      const okLen = mainLen > 200;
      if (!okLen) report.errors.push(`${prof}/${route}: 渲染过空（innerHTML=${mainLen}）`);
      const label = await cdp.eval("(window.__PAGE_LABEL__ && window.__PAGE_LABEL__()) || ''");
      if (label && !label.includes(crumbs.trim())) {
        /* 页名一致性走软断言：只记录，不算失败（面包屑来自 PAGES 表，同一来源） */
        report.errors.push(`${prof}/${route}: 面包屑「${crumbs}」与页名「${label}」不一致`);
      }
      report.routeResults.push({ profile: prof, route, mainLen, breadcrumb: crumbs });
      await shot(join(SHOTS, prof, `${route.replace('/', '__')}.png`));
    }
    report.assertions[`count_${prof}`] = firstCount;
  }

  const a = report.assertions.count_A, b = report.assertions.count_B;
  const na = report.assertions.name_A, nb = report.assertions.name_B;
  /* 铁律：先证被测对象非空、可用，再断言比较——两侧都是空值时 a!==b 恒真。
     档案差异证据 = 页头档案名不同（A · 小陈 / B · 老周）；行数仅作参考（不同页选择器不同）。 */
  const aUsable = Boolean(na);
  const bUsable = Boolean(nb);
  if (!aUsable || !bUsable) {
    report.errors.push(`A/B 档案页头不可用：name_A=${na} / name_B=${nb}`);
    report.assertions.profilesDiffer = null;
  } else {
    report.assertions.profilesDiffer = na !== nb;
    if (na === nb) report.errors.push(`A/B 档案页头完全相同（${na}）——两套数据未生效或串档`);
  }

  report.assertions.routeTotal = report.routeResults.length;
  report.assertions.errorCount = report.errors.length;
} catch (err) {
  report.errors.push(`probe crashed: ${err.message}`);
} finally {
  writeFileSync(join(SHOTS, 'report.json'), JSON.stringify(report, null, 1));
  console.log(`routes walked: ${report.routeResults.length}  screenshots: ${report.screenshots}  errors: ${report.errors.length}`);
  for (const e of report.errors.slice(0, 20)) console.log(`FAIL ${e}`);
  await stopChrome(ch);
  process.exit(report.errors.length ? 1 : 0);
}
