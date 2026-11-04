/* 服务层：路由表（两条链路共用）+ 鉴权 + 错误形态 + private 出口正反例。
 *
 * 用 dsh/server.js 的 startWorkbenchServer 起一个真 HTTP 服务（回环随机端口），
 * 用 fetch 打真实请求——路由错误形态（一律 {error} JSON、禁裸 throw）只有走 HTTP 才验得到。
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openDatabase, migrate, close } from '../dsh/store.js';
import { seedDemo } from '../dsh/demo.js';
import { bootstrap } from '../dsh/readmodels.js';
import { renderPrepMarkdown } from '../dsh/export.js';
import { startWorkbenchServer } from '../dsh/server.js';
import { API_PREFIX, UI_PREFIX } from '../dsh/routes.js';

const VERSION = '0.5.0';
const DEMO = (await import('../dsh/demo.js')).loadDemoData();

function makeWorkbench() {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  return {
    db,
    demo: DEMO,
    version: VERSION,
    build: 'test',
    bootstrap: () => bootstrap(db, { version: VERSION, build: 'test', demo: DEMO }),
    saveExport: (key) => {
      const result = renderPrepMarkdown(db, key, { generatedAt: null, version: VERSION });
      if (!result) throw Object.assign(new Error(`没有这个档案：${key}`), { code: 'NOT_FOUND' });
      return { file: `/tmp/exports/${result.filename}`, bytes: 123, excludedPrivate: result.excludedPrivate };
    },
    close: () => close(db),
  };
}

test('① 路由：bootstrap / health / 静态 UI 两条前缀正确', async () => {
  const wb = makeWorkbench();
  const { server, port } = await startWorkbenchServer({ port: 0, workbench: wb });
  try {
    const health = await (await fetch(`http://127.0.0.1:${port}${API_PREFIX}/health`)).json();
    assert.equal(health.ok, true);
    assert.equal(health.version, VERSION);
    assert.equal(health.ui, UI_PREFIX);

    const res = await fetch(`http://127.0.0.1:${port}${API_PREFIX}/bootstrap`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(Object.keys(data.profiles).length, 2);
    assert.equal(data.notes.length, DEMO.notes.length);
    assert.ok(data.derived.B, '派生口径（发作/计次）随 bootstrap 返回');

    const ui = await fetch(`http://127.0.0.1:${port}${UI_PREFIX}/index.html`);
    assert.equal(ui.status, 200);
    assert.match(ui.headers.get('content-type') || '', /text\/html/);
  } finally {
    server.closeAllConnections?.();
    server.close();
    wb.close();
  }
});

test('② 错误形态：未知路径 404 JSON；未知资源 404；缺 profile 400；不存在的档案 404——全部 {error}，不裸 throw、不回 HTML', async () => {
  const wb = makeWorkbench();
  const { server, port } = await startWorkbenchServer({ port: 0, workbench: wb });
  try {
    const cases = [
      [`${API_PREFIX}/no-such-route`, 404],
      [`${API_PREFIX}/not_a_table?profile=A`, 404],
      [`${API_PREFIX}/notes`, 400], /* 缺 ?profile= */
      [`${API_PREFIX}/notes?profile=Z`, 404], /* 档案不存在 */
    ];
    for (const [path, wantStatus] of cases) {
      const res = await fetch(`http://127.0.0.1:${port}${path}`);
      const body = await res.json().catch(() => null);
      assert.equal(res.status, wantStatus, path);
      assert.ok(body && typeof body.error === 'string', `${path} 应回 {error} JSON，实际 ${JSON.stringify(body)}`);
      assert.match(res.headers.get('content-type') || '', /application\/json/);
    }
  } finally {
    server.closeAllConnections?.();
    server.close();
    wb.close();
  }
});

test('③ REST：GET 列表与 POST 新增（notes），POST 缺字段 400', async () => {
  const wb = makeWorkbench();
  const { server, port } = await startWorkbenchServer({ port: 0, workbench: wb });
  try {
    const base = `http://127.0.0.1:${port}${API_PREFIX}`;
    const list = await (await fetch(`${base}/notes?profile=A`)).json();
    assert.equal(list.notes.length, DEMO.notes.filter((n) => n.profile_key === 'A').length);

    const created = await fetch(`${base}/notes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profile_key: 'A', kind: 'question', author_role: 'self', content: '想问：下次复查安排在什么时候？', occurred_on: '2026-11-05' }),
    });
    assert.equal(created.status, 200);
    const { id } = await created.json();
    assert.ok(Number.isInteger(id) && id > 0);
    const after = await (await fetch(`${base}/notes?profile=A`)).json();
    assert.equal(after.notes.length, list.notes.length + 1);
    assert.ok(after.notes.some((n) => n.content.includes('下次复查')));

    const bad = await fetch(`${base}/notes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profile_key: 'A', content: '缺 kind' }),
    });
    assert.equal(bad.status, 400);
    assert.ok((await bad.json()).error);
  } finally {
    server.closeAllConnections?.();
    server.close();
    wb.close();
  }
});

test('④ 导出：私密条目不进导出（正例=更正版在、反例=私密原文与家系线索不在），响应头带剔除计数', async () => {
  const wb = makeWorkbench();
  const { server, port } = await startWorkbenchServer({ port: 0, workbench: wb });
  try {
    const res = await fetch(`http://127.0.0.1:${port}${API_PREFIX}/export/B.md`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/markdown/);
    const md = await res.text();
    assert.ok(md.includes('夜间咳嗽加重'), '更正版（非私密新版本）应进导出');
    assert.ok(!md.includes('半夜又咳醒'), '改写链旧私密原文不许进导出');
    assert.ok(!md.includes('心里发慌'), '旧原文的任何片段都不许进导出');
    assert.ok(!md.includes('医生说'), '家系线索（默认私密）整节不进导出');
    assert.ok(!md.includes('要是早点戒烟'), '私密症状记录不进导出');
    const excluded = Number(res.headers.get('x-excluded-private'));
    assert.ok(excluded > 0, `应如实报告剔除条数，实际 ${excluded}`);
  } finally {
    server.closeAllConnections?.();
    server.close();
    wb.close();
  }
});

test('⑤ 导出保存：saveExport 有就 200，档案不存在 404；导出不存在的档案同样 404', async () => {
  const wb = makeWorkbench();
  const { server, port } = await startWorkbenchServer({ port: 0, workbench: wb });
  try {
    const base = `http://127.0.0.1:${port}${API_PREFIX}`;
    const ok = await fetch(`${base}/export/A.md/save`, { method: 'POST' });
    assert.equal(ok.status, 200);
    assert.ok((await ok.json()).file.includes('复诊材料'));
    const miss = await fetch(`${base}/export/Z.md/save`, { method: 'POST' });
    assert.equal(miss.status, 404);
    assert.equal((await miss.json()).error, 'NOT_FOUND');
    const missMd = await fetch(`${base}/export/Z.md`);
    assert.equal(missMd.status, 404);
  } finally {
    server.closeAllConnections?.();
    server.close();
    wb.close();
  }
});

test('⑥ 候选核对：accept/reject 只改状态（事实表零写入）；终态不可再改；拒收零副作用', async () => {
  const wb = makeWorkbench();
  const { server, port } = await startWorkbenchServer({ port: 0, workbench: wb });
  try {
    const base = `http://127.0.0.1:${port}${API_PREFIX}`;
    const cand = (await (await fetch(`${base}/ai_candidates?profile=A`)).json()).ai_candidates.find((c) => c.status === 'pending');
    const recBefore = wb.db.prepare('SELECT COUNT(*) AS n FROM metric_records').get().n;

    const reject = await fetch(`${base}/ai_candidates/${cand.id}/reject`, { method: 'POST' });
    assert.equal(reject.status, 200);
    assert.equal((await reject.json()).status, 'rejected');
    assert.equal(wb.db.prepare('SELECT COUNT(*) AS n FROM metric_records').get().n, recBefore, '拒收零副作用：事实表不写');

    const again = await fetch(`${base}/ai_candidates/${cand.id}/reject`, { method: 'POST' });
    assert.equal(again.status, 400, '终态不可再改');
    assert.equal((await again.json()).error, 'BAD_STATE');

    const miss = await fetch(`${base}/ai_candidates/99999/accept`, { method: 'POST' });
    assert.equal(miss.status, 404);
  } finally {
    server.closeAllConnections?.();
    server.close();
    wb.close();
  }
});

test('⑦ 导入：只写候选不写事实表；不支持类型 400；空文件 400', async () => {
  const savedToken = process.env.MINERU_TOKEN;
  delete process.env.MINERU_TOKEN; /* 本机环境可能带着一把真 Key：测试要在「无凭据」前提下跑 */
  const wb = makeWorkbench();
  const { server, port } = await startWorkbenchServer({ port: 0, workbench: wb });
  try {
    const base = `http://127.0.0.1:${port}${API_PREFIX}`;
    const factsBefore = ['metric_records', 'reports', 'notes'].map((t) => wb.db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n);
    const candsBefore = wb.db.prepare('SELECT COUNT(*) AS n FROM ai_candidates').get().n;

    /* 无 token 的客户端：解析入口会报 NO_TOKEN（503），但不许写任何行 */
    const res = await fetch(`${base}/import?name=报告.pdf&profile=A&persist=1`, { method: 'POST', body: Buffer.from('%PDF-fake') });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'NO_TOKEN');
    const factsAfter = ['metric_records', 'reports', 'notes'].map((t) => wb.db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n);
    assert.deepEqual(factsAfter, factsBefore, '失败不产生任何事实行');
    assert.equal(wb.db.prepare('SELECT COUNT(*) AS n FROM ai_candidates').get().n, candsBefore, '失败也不产候选');

    const html = await fetch(`${base}/import?name=报告.html&profile=A`, { method: 'POST', body: Buffer.from('<table><tr><td>x</td></tr></table>') });
    assert.equal(html.status, 400, '.html 拒收');
    const empty = await fetch(`${base}/import?name=报告.pdf&profile=A`, { method: 'POST', body: Buffer.alloc(0) });
    assert.equal(empty.status, 400, '空文件拒收');
  } finally {
    server.closeAllConnections?.();
    server.close();
    wb.close();
  }
});

test('⑧ MinerU 设置接口：GET 状态只给掩码不给原文；POST 保存后 source=file；400/500 分得开', async () => {
  const wb = makeWorkbench();
  const { server, port } = await startWorkbenchServer({ port: 0, workbench: wb });
  const { mkdtempSync, rmSync, existsSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'a1pal-settings-'));
  const secretFile = join(dir, 'mineru.json');
  const savedToken = process.env.MINERU_TOKEN;
  try {
    process.env.AATD_MINERU_SECRET = secretFile;
    const base = `http://127.0.0.1:${port}${API_PREFIX}`;

    delete process.env.MINERU_TOKEN; /* 同上：无凭据前提下断言"未配置" */
    const empty = await (await fetch(`${base}/settings/mineru`)).json();
    assert.equal(empty.configured, false);

    const bad = await fetch(`${base}/settings/mineru`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: 'short' }) });
    assert.equal(bad.status, 400, '用户输入问题回 400');
    const badBody = await bad.json();
    assert.equal(badBody.error, 'invalid_token');
    assert.ok(!JSON.stringify(badBody).includes('short'), '错误信息不回显 token 原文');

    const save = await fetch(`${base}/settings/mineru`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: 'sk-aatd-test-token-0001' }) });
    assert.equal(save.status, 200);
    const status = await save.json();
    assert.equal(status.configured, true);
    assert.equal(status.source, 'file', 'v2 口径：文件优先');
    assert.equal(existsSync(secretFile), true, 'token 落在指定密钥文件');
    assert.ok(readFileSync(secretFile, 'utf8').includes('sk-aatd-test-token-0001'));
    assert.ok(!JSON.stringify(status).includes('sk-aatd-test-token-0001'), '状态接口绝不回 token 原文');
    assert.match(status.masked, /^••••0001$/, '只显示后 4 位，不露前缀');

    const clear = await fetch(`${base}/settings/mineru`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'clear' }) });
    assert.equal((await clear.json()).configured, false);
    assert.equal(existsSync(secretFile), false, '文件因此变空就连文件一起清掉');
  } finally {
    delete process.env.AATD_MINERU_SECRET;
    if (savedToken !== undefined) process.env.MINERU_TOKEN = savedToken;
    rmSync(dir, { recursive: true, force: true });
    server.closeAllConnections?.();
    server.close();
    wb.close();
  }
});

test('⑨ 上传体积：超过 30 MB 回 413', async () => {
  const wb = makeWorkbench();
  const { server, port } = await startWorkbenchServer({ port: 0, workbench: wb });
  try {
    const big = Buffer.alloc(31 * 1024 * 1024, 7);
    const res = await fetch(`http://127.0.0.1:${port}${API_PREFIX}/import?name=大报告.pdf&profile=A`, { method: 'POST', body: big });
    assert.equal(res.status, 413);
    assert.equal((await res.json()).error, 'too_large');
  } finally {
    server.closeAllConnections?.();
    server.close();
    wb.close();
  }
});
