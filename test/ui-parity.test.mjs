/* 逐视图 parity：public/ 与 prototypes/v0.2/ 必须是「同一份渲染代码，只换数据来源」。
 *
 * 原型签认（G2）签的是那套视图，开发版如果另写一套，后面每改一个卡片就要改两处，
 * 且原型再也不能当"验收基准"。所以这里钉：
 * 1. 原型里的每个函数在开发版里都存在（不许删视图/删交互）；
 * 2. 开发版新增的函数只能是数据层与启动那一组（白名单），不许偷偷加视图；
 * 3. 导航常量与样式表逐字节一致；index.html 骨架逐字节一致（版本号归一后）；
 * 4. 离线回退数据 public/demo-data.js 与唯一源 demo/demo-data.js 是同一份。
 *
 * 结构与文案的具体差异点见 docs/UI-PARITY-NOTES.md。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const proto = read('prototypes/v0.2/app.js');
const shipped = read('public/app.js');

/** 从源码里抠出一个 `const X = ` 形式的常量块（原型与开发版同形，够用）。 */
function block(src, name) {
  const i = src.indexOf(`const ${name} = `);
  assert.notEqual(i, -1, `找不到常量 ${name}`);
  return src.slice(i, src.indexOf('\n};', i) + 3 || src.length);
}

const fnNames = (src) => [...src.matchAll(/function ([A-Za-z_$][\w$]*)/g)].map((m) => m[1]).sort();

test('① 视图函数：原型里的每个函数开发版都有（一个都不许丢）', () => {
  const shippedSet = new Set(fnNames(shipped));
  /* boot 是原型启动 IIFE 的具名函数表达式：开发版由 init()（先取数据再 render）替代，
     属于数据层/启动组允许的差异（见 ⑨），不算丢视图。 */
  const missing = fnNames(proto).filter((n) => n !== 'boot' && !shippedSet.has(n));
  assert.deepEqual(missing, [], `开发版缺少这些函数：${missing.join(', ')}`);
});

test('② 新增函数只能是数据层与启动组（防止偷偷另写一套视图）', () => {
  const ALLOWED = new Set([
    'apiBase', 'applyData', 'loadBootstrap', 'init', 'uploadToWorkbench',
  ]);
  const protoSet = new Set(fnNames(proto));
  const extra = fnNames(shipped).filter((n) => !protoSet.has(n) && !ALLOWED.has(n));
  assert.deepEqual(extra, [], `开发版多出未登记的函数：${extra.join(', ')}（要加就先想清楚是不是在另写视图）`);
});

test('③ 11 个一级页与子页签：两边完全一致', () => {
  for (const name of ['PAGES', 'SUBPAGES', 'SUBTITLES']) {
    assert.equal(block(shipped, name), block(proto, name), `${name} 与原型不一致`);
  }
  const pages = [...proto.matchAll(/\['([a-z]+)', '[^']+', '[a-z]+'\]/g)].map((m) => m[1]);
  assert.equal(new Set(pages).size, 12, '一级页 12 个（SPEC 页表：含营养与生活）');
});

test('④ 样式表与原型逐字节一致（改视觉先改原型，再同步过来）', () => {
  assert.equal(read('public/style.css'), read('prototypes/v0.2/style.css'));
});

test('⑤ 疾病概要数据与原型逐字节一致（primer-data.js 不允许开发版私改一段）', () => {
  assert.equal(read('public/primer-data.js'), read('prototypes/v0.2/primer-data.js'));
});

test('⑥ index.html 只差版本号与数据脚本路径：不允许开发版自己造一套骨架', () => {
  /* 版本号随 VERSION 前移而原型冻结在 0.2.0——两边把 vX.Y.Z 归一化成占位符再比；
     除此之外逐字节相同：骨架、容器 id、favicon、顶栏、页脚、弹窗、AI 面板都必须一致。 */
  const strip = (html) => html
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g, 'vX.Y.Z')
    .replace(/<script src="(?:\.\.\/\.\.\/demo\/)?demo-data\.js"><\/script>/g, '<script src="demo-data.js"></script>')
    .replace(/<b>(?:交互原型|开发版) vX\.Y\.Z<\/b> · [^<]*/g, '<b>BAR vX.Y.Z</b> · ')
    .trim();
  assert.equal(strip(read('public/index.html')), strip(read('prototypes/v0.2/index.html')),
    'index.html 与原型不一致；若确需改骨架，先同步改原型并记进 UI-PARITY-NOTES');
});

test('⑦ 接口基址与 bootstrap 路径写死成前端唯一来源（改前缀要改这里）', () => {
  assert.match(shipped, /\/api\/aatd\/bootstrap/, 'Bootstrap 路径必须显式写出来');
  assert.match(shipped, /function apiBase\(\)/, '必须从 location.pathname 反推基址，dev 与 Desktop 共用一份');
});

test('⑧ 离线回退数据与唯一源是同一份（public/demo-data.js 是生成副本，不许各改各的）', () => {
  assert.equal(read('public/demo-data.js'), read('demo/demo-data.js'),
    'public/demo-data.js 与 demo/demo-data.js 不同步：重新复制（build:demo）后再提交');
});

test('⑨ 数据层开关：原型用 const D，开发版必须可重挂（let D + applyData + init），且只差这一层', () => {
  assert.match(proto, /const D = window\.DEMO_DATA;/, '原型数据层形态变了？先看这影响多大');
  assert.match(shipped, /let D = window\.DEMO_DATA/);
  assert.match(shipped, /let PROFILE_KEYS = Object\.keys\(D\.profiles\)/);
  assert.match(shipped, /let TRIAL_DEMO = D\.trial_demo \|\| \[\]/);
  assert.match(shipped, /async function init\(\)/);
  assert.doesNotMatch(shipped, /\(function boot\(\)/, '开发版启动必须走 init()（先取数据再 render）');
});
