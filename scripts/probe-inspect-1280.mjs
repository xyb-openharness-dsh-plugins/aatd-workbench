#!/usr/bin/env node
/**
 * FAMILY-INSPECTOR 开工三步之截图：每个一级页面 1280×860 逐屏截图（A/B 两档案）
 * + 两基准首屏（breast v0.4 / aml v0.2）。产出 docs/shots/inspector/<tag>/。
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, sleep, stopChrome } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'shots', 'inspector');
mkdirSync(join(OUT, 'aatd-A'), { recursive: true });
mkdirSync(join(OUT, 'aatd-B'), { recursive: true });
mkdirSync(join(OUT, 'baseline-breast'), { recursive: true });
mkdirSync(join(OUT, 'baseline-aml'), { recursive: true });
const CDP_PORT = Number(process.env.INSPECT_CDP_PORT || 9381);

const PAGES = ['home', 'course', 'records', 'labs', 'chart', 'treatment', 'family', 'mind', 'trial', 'review', 'settings'];
const BREAST = '/Users/qinxiaoqiang/Downloads/breast-cancer-workbench/prototypes/v0.4/index.html';
const AML = '/Users/qinxiaoqiang/Downloads/aml-workbench/prototypes/v0.2/index.html';
const APP = `file://${join(ROOT, 'prototypes', 'v0.2', 'index.html')}`;

const ch = await launchChrome({ port: CDP_PORT });
const { cdp } = ch;
const shot = async (file) => { const s = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(s.data, 'base64')); };

try {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: APP });
  await sleep(700);
  for (const prof of ['A', 'B']) {
    await cdp.eval("location.hash='#home'; window.dispatchEvent(new Event('hashchange'))"); await sleep(200);
    await cdp.eval("document.getElementById('profile-top').click()"); await sleep(150);
    await cdp.eval(`[...document.querySelectorAll('[data-pick-profile]')].find(x => x.dataset.pickProfile === '${prof}')?.click()`); await sleep(250);
    for (const p of PAGES) {
      await cdp.eval(`location.hash='#${p}'; window.dispatchEvent(new Event('hashchange'))`); await sleep(200);
      await shot(join(OUT, `aatd-${prof}`, `${p}.png`));
    }
  }
  if (existsSync(BREAST)) {
    await cdp.send('Page.navigate', { url: `file://${BREAST}` }); await sleep(800);
    await shot(join(OUT, 'baseline-breast', 'home.png'));
  }
  if (existsSync(AML)) {
    await cdp.send('Page.navigate', { url: `file://${AML}` }); await sleep(800);
    await shot(join(OUT, 'baseline-aml', 'home.png'));
  }
  console.log('done: screenshots at docs/shots/inspector/');
} finally {
  await stopChrome(ch);
  process.exit(0);
}
