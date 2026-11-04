/* 宿主侧入口（lib/client.js）的离线自检 + apiBase 交界守卫回归。
 *
 * 为什么值得单独测：lib/client.js 不经过任何打包/编译，直接丢给宿主 renderer 的
 * `window.__ModuleLoader__.load({id, factory})`。写错形态（ESM、缺 customFrame、
 * 裸 iframe）在仓库里 npm run check 不会红，装到 Desktop 才发现。
 *
 * apiBase 是「交界守卫」：所有 fetch 都走它单处定义的前缀。历史上 apiBase 把
 * /api/aatd 带出来再拼一次 → /api/aatd/api/aatd/bootstrap 404、页面静默回退演示数据，
 * 跑单测不会红。这里用正反例钉住。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const CLIENT_SRC = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
const APP_SRC = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

/** 极简 React 替身：createElement 记录 tag/props/children；hooks 用一次性桩。 */
const React = {
  createElement(tag, props, ...children) {
    return { tag, props: props || {}, children };
  },
  useState(initial) { return [typeof initial === 'function' ? initial() : initial, () => {}]; },
  useRef(value) { return { current: value }; },
  useEffect() {},
  useCallback(fn) { return fn; },
};

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function loadClient() {
  let captured = null;
  const sandbox = {
    window: {
      __ModuleLoader__: { load(spec) { captured = spec; } },
      location: { origin: 'http://localhost' },
      addEventListener() {},
      removeEventListener() {},
    },
    localStorage: fakeStorage(),
  };
  const require = (name) => {
    if (name === 'react') return React;
    throw new Error(`client.js 不该 require(${name})——宿主只保证 react 可用`);
  };
  new Function('window', 'localStorage', 'require', `${CLIENT_SRC}\n`)(sandbox.window, sandbox.localStorage, require);
  return captured;
}

test('① 必须是 ModuleLoader.load({id, factory}) 包装的普通脚本，不能是 ESM', () => {
  assert.equal(/^\s*export\s/m.test(CLIENT_SRC), false, '出现 export 会被 renderer 拒绝');
  assert.equal(/^\s*import\s/m.test(CLIENT_SRC), false, '不能被当成 ESM 解析');
  const spec = loadClient();
  assert.ok(spec, '没有调用 window.__ModuleLoader__.load');
  assert.equal(spec.id, '@xyb-community/aatd-workbench');
  assert.equal(typeof spec.factory, 'function');
});

test('② factory 只依赖 react，返回 {apply, inject}，inject 必须带 sessions（会话桥接要用）', () => {
  const spec = loadClient();
  const mod = spec.factory((name) => {
    if (name === 'react') return React;
    throw new Error(`factory 里 require(${name}) 会炸`);
  });
  assert.equal(typeof mod.apply, 'function');
  assert.deepEqual(mod.inject, ['desktopWorkbenches', 'sessions']);
});

test('③ register 参数：标题、仓库、customFrame=true（否则顶栏没有 AI 按钮、分栏拖不动）', () => {
  const spec = loadClient();
  const mod = spec.factory(() => React);
  let registered = null;
  mod.apply({
    effect(fn) { return fn(); },
    desktopWorkbenches: { register(meta) { registered = meta; } },
  });
  assert.ok(registered, 'apply 里没有 register');
  assert.match(registered.title, /小筛宝/);
  assert.equal(registered.repository, 'https://github.com/xyb-openharness-dsh-plugins/aatd-workbench');
  assert.equal(registered.customFrame, true);
  assert.equal(registered.embedded, true);
  assert.equal(registered.version, '0.6.0');
});

test('④ Panel：自绘 header（首子元素，带 macOS 避让）+ 业务 iframe 指向 /api/aatd/ui/ + 会话 aside + splitter', () => {
  const spec = loadClient();
  const mod = spec.factory(() => React);
  let Panel = null;
  mod.apply({
    effect(fn) { return fn(); },
    desktopWorkbenches: { register(meta, P) { Panel = P; } },
  });

  const tree = Panel({});
  assert.equal(tree.tag, 'div');
  assert.equal(tree.children[0]?.tag, 'header', '根节点首个子元素必须是语义 <header>');
  assert.match(tree.children[0].props.style.paddingInlineStart, /--dsh-frame-leading-clearance/);

  const actions = tree.children[0].children.find((c) => c?.props?.style?.marginLeft === 'auto');
  assert.ok(actions, '顶栏缺少右侧按钮组');
  const labels = actions.children.map((c) => (typeof c === 'string' ? c : c?.children?.join?.('') ?? ''));
  assert.ok(labels.some((t) => /AI 对话/.test(t)), `顶栏没有 AI 对话按钮：${labels.join(' | ')}`);

  const body = tree.children[1];
  const iframe = body.children[0].children[0];
  assert.equal(iframe.tag, 'iframe');
  assert.equal(iframe.props.src, '/api/aatd/ui/', '业务区必须 iframe 到本包 UI 前缀，不维护第二套 UI');

  const aside = body.children.find((c) => c && c.tag === 'aside');
  assert.equal(aside.tag, 'aside');
  assert.equal(aside.props.style.display, 'none', '无会话时 aside 隐藏但不卸载');

  const live = Panel({ conversation: { tag: 'div', props: {}, children: ['native'] } });
  const liveAside = live.children[1].children.find((c) => c && c.tag === 'aside');
  assert.equal(liveAside.props.style.width, '35%', '默认会话宽度取 AGENT_PANE.def=0.35');
  const splitter = live.children[1].children.find((c) => c && c.props && c.props.role === 'separator');
  assert.equal(splitter?.props?.['aria-valuemin'], 25);
  assert.equal(splitter?.props?.['aria-valuemax'], 45);
  assert.equal(splitter?.props?.tabIndex, 0, 'splitter 必须可聚焦，键盘才调得了');
});

test('⑤ AI 草稿走 aatd:agent-draft（34 号契约），消息只认自家 iframe 与同源', () => {
  assert.match(CLIENT_SRC, /aatd:agent-draft/, '客户端必须监听 aatd:agent-draft');
  assert.match(CLIENT_SRC, /event\.source !== frame\.contentWindow/, '必须校验消息来自自家 iframe');
  assert.match(CLIENT_SRC, /event\.origin !== window\.location\.origin/, '必须校验同源');
});

/* ---------------- apiBase 交界守卫（public/app.js） ---------------- */

function loadApiBase() {
  const m = APP_SRC.match(/function apiBase\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'public/app.js 里找不到 apiBase()');
  return new Function('location', `${m[0]}\nreturn apiBase();`);
}

test('⑥ 正例：独立启动 / Desktop（页面在 /api/aatd/ui/ 下）基址必须是空串', () => {
  const apiBase = loadApiBase();
  assert.equal(apiBase({ pathname: '/api/aatd/ui/index.html' }), '');
  assert.equal(apiBase({ pathname: '/api/aatd/ui/' }), '');
});

test('⑦ 正例：挂到子路径下只留挂载前缀', () => {
  const apiBase = loadApiBase();
  assert.equal(apiBase({ pathname: '/w/abc/api/aatd/ui/index.html' }), '/w/abc');
  assert.equal(apiBase({ pathname: '/p/xyz/ui/index.html' }), '/p/xyz');
});

test('⑧ 反例：拼出的请求路径不许出现 /api/aatd/api/aatd 双前缀（历史事故的静默 404 形态）', () => {
  const apiBase = loadApiBase();
  const base = apiBase({ pathname: '/api/aatd/ui/index.html' });
  for (const p of ['bootstrap', 'export/A.md', 'health', 'settings/mineru', 'import']) {
    const url = `${base}/api/aatd/${p}`;
    assert.equal(url, `/api/aatd/${p}`, `拼出错路径：${url}`);
    assert.equal(url.includes('/api/aatd/api/aatd'), false);
  }
});

test('⑨ 反例：路径里没有 /ui/ 时基址是空串（file:// 直接打开也不许拼出绝对路径）', () => {
  const apiBase = loadApiBase();
  assert.equal(apiBase({ pathname: '/index.html' }), '');
});

test('⑩ 交界守卫：public/app.js 里所有 fetch 都走 apiBase()，不许手写第二份 /api/aatd 前缀', () => {
  const fetches = [...APP_SRC.matchAll(/fetch\(([`'"])([^`'"]+)\1/g)].map((m) => m[2]);
  assert.ok(fetches.length > 0, '开发版必须有真实 fetch');
  for (const f of fetches) {
    assert.match(f, /\$\{apiBase\(\)\}/, `fetch 必须经 apiBase()：${f}`);
    assert.equal(f.includes("'/api/aatd") || f.includes('`/api/aatd'), false, `fetch 里不许手写前缀：${f}`);
  }
  /* 失败态可见：bootstrap 拿不到必须回退并标注数据源，不许静默吞掉 */
  assert.match(APP_SRC, /DATA_SOURCE = 'demo'/, '拿不到 API 要如实标注离线演示态');
  assert.match(APP_SRC, /DATA_SOURCE = 'empty'/, 'API 通了但库为空要显示空态');
});
