/**
 * 包的入口：DSH 插件的服务端侧。宿主加载的就是这个文件，需要
 * `name` / `inject` / `Config` / `apply` 四样（docs/02-DSH-CONTRACT.md）。
 *
 * 这一层只做四件事：
 * 1. 打开数据（配了 `root` 就用那个资料目录；没配就退到内存演示库，保证装上去能看见东西）；
 * 2. 过宿主鉴权（`connection.requestRejection`），不自己造登录；
 * 3. 把请求交给 `dsh/routes.js` 那张**两条链路共用**的路由表（独立启动用的是同一份，
 *    否则本地能开、装进 Desktop 就 404）；
 * 4. 卸载时按序关库。
 *
 * UI 走 iframe：业务界面（public/，11 个视图）是一份独立的前端，宿主只负责
 * 把它放进面板的业务区。面板本身是 **customFrame=true**（lib/layout.js 顶部注释），
 * 由 lib/client.js 自绘 header + 会话分栏，iframe 只是业务区那半边的容器。iframe 指向
 * `/api/aatd/ui/`，页面里的接口基址按自身路径推出来（public/app.js 的 apiBase()），
 * 所以「本地 dev-server 打开」与「装进 Desktop」用的是同一份前端，不需要两套构建。
 */
import Schema from '@deepseek-ai/schemastery'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { openDatabase, migrate, close } from './store.js'
import { seedDemo, hasDemoData, loadDemoData } from './demo.js'
import { bootstrap } from './readmodels.js'
import { servePublic } from './server.js'
import { createApiHandler, API_PREFIX, UI_PREFIX } from './routes.js'
import { renderPrepMarkdown } from './export.js'
import { version, build } from '../lib/version.js'

export const name = 'aatd-main'
export const inject = ['webServer', 'connection']

/** 接口前缀与 UI 前缀：真身在 routes.js；这里再导出一次是为了给包检查与前端文档一个稳定入口。 */
export { API_PREFIX, UI_PREFIX }

/** Config 必须是 Schemastery schema；root 可选——不给就用内存演示库。
 *  cordis.patch.yml 会把 root 注入成 dshHomePath('aatd')（DSH 家目录下的数据目录）；
 *  这里声明同名 schema 项，消除「patch 注入但 Config 未声明」的检查警告。 */
export const Config = Schema.object({
  root: Schema.string().description('资料目录（库文件 xyb-aatd.sqlite 的落点；留空=内存演示库）'),
})

function sendJson(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body), 'utf8')
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': buf.length, 'cache-control': 'no-store' })
  res.end(buf)
}

/** 演示数据在进程里只加载一次（demo/demo-data.js 是唯一源）。 */
let demoCache;
function demoData() {
  if (!demoCache) demoCache = loadDemoData();
  return demoCache;
}

/** 打开数据源。返回 { db, bootstrap(), saveExport(), close() }。 */
function openDataSource(root) {
  // 没配资料目录：内存库 + 演示数据。只读演示，不落盘，不会在用户机器上留文件。
  const file = root ? `${root.replace(/\/+$/, '')}/xyb-aatd.sqlite` : ':memory:'
  const db = openDatabase(file)
  migrate(db)
  if (!hasDemoData(db)) seedDemo(db)
  return {
    db,
    bootstrap: () => bootstrap(db, { version, build, demo: demoData() }),
    saveExport: (key) => {
      if (!root) throw Object.assign(new Error('没有配置资料目录，不能保存导出文件'), { code: 'EXPORT_NO_ROOT' })
      const result = renderPrepMarkdown(db, key, { generatedAt: new Date().toISOString(), version })
      if (!result) throw Object.assign(new Error(`没有这个档案：${key}`), { code: 'NOT_FOUND' })
      const dir = join(root.replace(/\/+$/, ''), 'exports')
      mkdirSync(dir, { recursive: true })
      const target = join(dir, result.filename)
      writeFileSync(target, result.markdown, 'utf8')
      return { file: target, bytes: Buffer.byteLength(result.markdown), excludedPrivate: result.excludedPrivate }
    },
    close: () => close(db),
  }
}

export function apply(ctx, config = {}) {
  if (!ctx.webServer?.register) throw new Error('Desktop webServer.register is unavailable')

  let source = null
  let failure = null
  try {
    source = openDataSource(config.root)
  } catch (error) {
    failure = error.message
  }

  const api = createApiHandler({
    source: source ?? {
      db: null,
      bootstrap: () => { throw new Error(failure) },
      saveExport: () => { throw new Error(failure) },
    },
    version,
    build,
    demo: source ? demoData() : null,
    serveUi: (req, res, urlPath) => servePublic(req, res, urlPath),
    failure,
  })

  const handler = (req, res) => {
    // 鉴权：宿主不给结论就不放行，不自建登录态
    if (typeof ctx.connection?.requestRejection !== 'function') {
      return sendJson(res, 503, { error: 'connection authentication capability unavailable' })
    }
    const rejection = ctx.connection.requestRejection(req)
    if (rejection !== undefined) return sendJson(res, rejection, { error: 'Authentication required' })

    /* 数据源打不开时只有 /health 能回（带错误原因），其余走各自分支的 503。 */
    return api(req, res)
  }

  ctx.effect(() => {
    const dispose = ctx.webServer.register({ kind: 'prefix', path: API_PREFIX, handler })
    return () => {
      try { dispose && dispose() } catch { /* 宿主卸载时的清理失败不该盖住原错误 */ }
      if (source) { try { source.close() } catch { /* 同上 */ } }
    }
  }, 'aatd ui + api')
}
