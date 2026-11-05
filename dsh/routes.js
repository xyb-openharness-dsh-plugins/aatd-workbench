/* 路由表：独立启动（dev-server / server.js）与 DSH 宿主两条链路共用这一份。
 *
 * 为什么抽出来：不抽的话 `/api/aatd/bootstrap` 会有两个实现，本地能开、装进 Desktop
 * 就 404。这里只依赖 node 内置模块与同目录模块，**不许 import Schemastery**
 * —— 独立启动时那个 peer 依赖并不存在。
 *
 * 鉴权不在这里：宿主链路由 dsh/index.js 先过 `connection.requestRejection`，
 * 独立启动本来就只有本机回环访问，不需要登录态。
 *
 * 错误形态（apiBase 交界守卫）：所有错误一律 `{error, message}` JSON + 合适状态码，
 * **禁裸 throw**——handler 最外层有 catch-all，未识别异常也回 500 JSON，不回 HTML/堆栈。
 */

export const API_PREFIX = '/api/aatd'
export const UI_PREFIX = `${API_PREFIX}/ui`

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024

function sendJson(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body), 'utf8')
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': buf.length, 'cache-control': 'no-store' })
  res.end(buf)
}

function sendMarkdown(res, status, text, headers = {}) {
  const buf = Buffer.from(text, 'utf8')
  res.writeHead(status, { 'content-type': 'text/markdown; charset=utf-8', 'content-length': buf.length, 'cache-control': 'no-store', ...headers })
  res.end(buf)
}

/** 错误 → {status, body}。MinerU 的错因直接透传，但不带 token。 */
function errorBody(error) {
  const code = error?.code
  if (code && typeof code === 'string' && /^[A-Z_]+$/.test(code)) {
    const status = code === 'NO_TOKEN' || code === 'UNAUTHORIZED' || code === 'BAD_SECRET_FILE' ? 503
      : code === 'NOT_FOUND' ? 404
        : code === 'BAD_INPUT' || code === 'BAD_STATE' ? 400
          : 502
    return { status, body: { error: code, message: error.message } }
  }
  if (error?.status === 413) return { status: 413, body: { error: 'too_large', message: error.message } }
  return { status: 500, body: { error: 'internal_error', message: error.message } }
}

function readBody(req, limit = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        /* 不在这里 destroy：先把 413 响应送回客户端（调用方 sendJson），残余上传
           丢弃（resume）即可。立刻 destroy 会让客户端只看到 fetch failed 而不是 413。 */
        const err = Object.assign(new Error('文件超过 30 MB'), { status: 413 })
        req.removeAllListeners('data')
        req.resume()
        reject(err)
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', () => { /* 响应已经发走，这里不用再做什么 */ })
  })
}

/* ---------------- 资源表：REST GET/POST 的白名单 ----------------
 * POST 只收白名单列；is_private 显式给才生效；created_at 服务端写；
 * corrected_by / id 不许从外部指定（更正=新增版本是服务端语义）。 */

const RESOURCE_COLUMNS = {
  profiles: { key: 'profile_key', columns: ['profile_key', 'display_name', 'record_mode', 'meta', 'headline', 'demo_label'], required: ['profile_key', 'display_name'] },
  notes: { columns: ['profile_key', 'kind', 'author_role', 'content', 'occurred_on', 'is_private'], required: ['profile_key', 'kind', 'content'] },
  metric_defs: { columns: ['profile_key', 'key', 'name', 'group_key', 'unit', 'comparable_key', 'ord'], required: ['profile_key', 'key', 'name'] },
  metric_records: { columns: ['profile_key', 'metric_id', 'value_num', 'value_text', 'measured_on', 'source_kind', 'source_ref', 'is_private'], required: ['profile_key', 'metric_id'] },
  reports: { columns: ['profile_key', 'title', 'kind', 'report_date', 'org', 'file_ref', 'summary_text', 'is_private'], required: ['profile_key', 'title', 'kind'] },
  med_events: { columns: ['profile_key', 'kind', 'label', 'occurred_on', 'series_id', 'source_kind', 'is_private'], required: ['profile_key', 'kind', 'label'] },
  episodes: { columns: ['profile_key', 'kind', 'started_on', 'ended_on', 'title', 'note_ref', 'is_private'], required: ['profile_key', 'kind', 'started_on'] },
  infusion_series: { columns: ['profile_key', 'label', 'cadence_note', 'started_on', 'ended_on', 'is_private'], required: ['profile_key', 'label', 'started_on'] },
  family_lines: { columns: ['profile_key', 'person_rel', 'doctor_quote', 'item_fact', 'happened_on', 'is_private'], required: ['profile_key', 'person_rel'] },
  ai_candidates: { columns: ['profile_key', 'target_table', 'payload', 'status'], required: ['profile_key', 'target_table', 'payload'] },
  saved_trials: { columns: ['profile_key', 'trial_key', 'saved_on', 'state'], required: ['profile_key', 'trial_key'] },
}

/** POST 一行。返回 {id}；字段缺失 / 类型不对走 400，不裸 throw。 */
function insertResource(db, resource, body) {
  const spec = RESOURCE_COLUMNS[resource]
  if (!spec) return { status: 404, body: { error: 'unknown_resource', message: `没有这个资源：${resource}` } }
  const missing = spec.required.filter((c) => body?.[c] === undefined || body?.[c] === null || body?.[c] === '')
  if (missing.length) return { status: 400, body: { error: 'missing_fields', message: `缺少必填字段：${missing.join(', ')}` } }
  const values = spec.columns.map((c) => {
    const v = body?.[c]
    if (c === 'is_private') return v === undefined ? 0 : (v ? 1 : 0)
    if (c === 'payload') return typeof v === 'string' ? v : JSON.stringify(v ?? null)
    if (v === undefined) return null
    return v
  })
  const cols = spec.columns.join(', ')
  const marks = spec.columns.map(() => '?').join(', ')
  try {
    /* saved_trials 语义：重复收藏同一条登记 = 恢复并改 state，不是插入第二行（UNIQUE 约束）。 */
    if (resource === 'saved_trials') {
      const state = String(values[3] ?? 'following')
      if (!['following', 'to_ask', 'archived'].includes(state)) {
        return { status: 400, body: { error: 'bad_state', message: 'state 只许 following / to_ask / archived' } }
      }
      const r = db.prepare(`INSERT INTO saved_trials (profile_key, trial_key, saved_on, state, in_use, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
        ON CONFLICT(profile_key, trial_key) DO UPDATE SET in_use = 1, state = excluded.state, saved_on = excluded.saved_on`)
        .run(values[0], values[1], values[2] ?? new Date().toISOString().slice(0, 10), state, new Date().toISOString())
      return { status: 200, body: { id: Number(r.lastInsertRowid), upserted: true } }
    }
    const r = db.prepare(`INSERT INTO ${resource} (${cols}, created_at) VALUES (${marks}, ?)`).run(...values, new Date().toISOString())
    return { status: 200, body: { id: Number(r.lastInsertRowid) } }
  } catch (error) {
    return { status: 400, body: { error: 'insert_failed', message: error.message } }
  }
}

/** GET 列表。?profile= 必填（不给就 400；档案不存在 404）。 */
function listResource(db, resource, profileKey) {
  if (!RESOURCE_COLUMNS[resource]) return { status: 404, body: { error: 'unknown_resource', message: `没有这个资源：${resource}` } }
  if (!profileKey) return { status: 400, body: { error: 'profile_required', message: '缺少 ?profile= 档案键' } }
  if (!db.prepare('SELECT 1 AS ok FROM profiles WHERE profile_key = ?').get(profileKey)) {
    return { status: 404, body: { error: 'profile_not_found', message: `没有这个档案：${profileKey}` } }
  }
  const order = resource === 'metric_defs' ? 'ORDER BY ord, rowid' : 'ORDER BY rowid'
  /* saved_trials 的 GET 语义 = 「在跟清单」：in_use=0 的已移除项不出列表（bootstrap 同口径）。 */
  const where = resource === 'saved_trials' ? 'profile_key = ? AND in_use = 1' : 'profile_key = ?'
  const list = db.prepare(`SELECT * FROM ${resource} WHERE ${where} ${order}`).all(profileKey)
    .map((r) => {
      if (resource === 'ai_candidates') {
        try { return { ...r, payload: JSON.parse(r.payload) } } catch { return r }
      }
      return r
    })
  return { status: 200, body: { profile: profileKey, [resource]: list } }
}

/**
 * @param {object} opts
 * @param {{bootstrap():object, db:object, saveExport?(key:string):object}} opts.source
 * @param {string} opts.version
 * @param {string} opts.build
 * @param {object} [opts.demo] demo/demo-data.js 内容（bootstrap 用）
 * @param {(req:object,res:object,path:string)=>boolean} opts.serveUi 静态文件出口（两条链路的 public/ 定位不同）
 * @param {string|null} [opts.failure] 数据源打不开的原因；非空时除 /health 外一律 503
 */
export function createApiHandler({ source, version, build, demo = null, serveUi, failure = null }) {
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://127.0.0.1')
    const path = url.pathname

    /* 数据源打不开：/health 已经报了原因，其它接口统一 503，不假装返回空数据。 */
    const unavailable = () => sendJson(res, 503, { error: 'bootstrap_unavailable', message: failure })
    if (failure && !(path === UI_PREFIX || path.startsWith(`${UI_PREFIX}/`))) {
      if (path === `${API_PREFIX}/health`) {
        return sendJson(res, 200, { ok: false, version, build, apiVersion: 'v1', ui: UI_PREFIX, error: failure })
      }
      return unavailable()
    }

    if (path === `${API_PREFIX}/health`) {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' })
      return sendJson(res, 200, {
        ok: true, version, build, apiVersion: 'v1', ui: UI_PREFIX,
        capabilities: ['bootstrap', 'profiles', 'notes', 'metric_defs', 'metric_records', 'reports', 'med_events', 'episodes', 'infusion_series', 'family_lines', 'ai_candidates', 'export', 'import', 'candidate-decision', 'mineru-settings'],
      })
    }

    if (path === `${API_PREFIX}/bootstrap`) {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' })
      try {
        return sendJson(res, 200, source.bootstrap())
      } catch (error) {
        const { status, body } = errorBody(error)
        return sendJson(res, status, body)
      }
    }

    /* REST：GET 列表 / POST 新增。 */
    const resourceMatch = path.match(new RegExp(`^${API_PREFIX}/(profiles|notes|metric_defs|metric_records|reports|med_events|episodes|infusion_series|family_lines|ai_candidates|saved_trials)$`))
    if (resourceMatch) {
      const resource = resourceMatch[1]
      if (req.method === 'GET') {
        const { status, body } = listResource(source.db, resource, url.searchParams.get('profile'))
        return sendJson(res, status, body)
      }
      if (req.method === 'POST') {
        let body = {}
        try {
          const raw = await readBody(req, 1024 * 1024)
          body = raw.length ? JSON.parse(raw.toString('utf8')) : {}
        } catch {
          return sendJson(res, 400, { error: 'bad_json', message: '请求体不是合法 JSON' })
        }
        try {
          const result = insertResource(source.db, resource, body)
          return sendJson(res, result.status, result.body)
        } catch (error) {
          const { status, body: errBody } = errorBody(error)
          return sendJson(res, status, errBody)
        }
      }
      return sendJson(res, 405, { error: 'method_not_allowed' })
    }

    /* 候选核对：只改候选状态（接受 ≠ 医学审核；拒收零副作用）。 */
    const decideMatch = path.match(new RegExp(`^${API_PREFIX}/ai_candidates/(\\d+)/(accept|reject)$`))
    if (decideMatch) {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
      try {
        const { createImportService } = await import('./import.js')
        const service = createImportService(source.db)
        return sendJson(res, 200, service.decide(Number(decideMatch[1]), decideMatch[2] === 'accept' ? 'accepted' : 'rejected'))
      } catch (error) {
        const { status, body } = errorBody(error)
        return sendJson(res, status, body)
      }
    }

    /* 试验收藏三态（E8）：POST state 改三态；POST remove = in_use=0（零副作用，只删本机收藏）。 */
    const trialStateMatch = path.match(new RegExp(`^${API_PREFIX}/saved_trials/(\\d+)/(state|remove)$`))
    if (trialStateMatch) {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
      let body = {}
      try {
        const raw = await readBody(req, 64 * 1024)
        body = raw.length ? JSON.parse(raw.toString('utf8')) : {}
      } catch {
        return sendJson(res, 400, { error: 'bad_json', message: '请求体不是合法 JSON' })
      }
      try {
        const id = Number(trialStateMatch[1])
        if (trialStateMatch[2] === 'remove') {
          source.db.prepare('UPDATE saved_trials SET in_use = 0 WHERE id = ?').run(id)
          return sendJson(res, 200, { ok: true, removed: id })
        }
        const state = String(body.state || '')
        if (!['following', 'to_ask', 'archived'].includes(state)) {
          return sendJson(res, 400, { error: 'bad_state', message: 'state 只许 following / to_ask / archived' })
        }
        source.db.prepare('UPDATE saved_trials SET state = ? WHERE id = ?').run(state, id)
        return sendJson(res, 200, { ok: true, id, state })
      } catch (error) {
        const { status, body: errBody } = errorBody(error)
        return sendJson(res, status, errBody)
      }
    }

    /* 按 key 移除收藏（客户端只有 trialKey，没有库内 id）。 */
    const trialRemoveKeyMatch = path.match(new RegExp(`^${API_PREFIX}/saved_trials/by-key/remove$`))
    if (trialRemoveKeyMatch) {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
      let body = {}
      try {
        const raw = await readBody(req, 64 * 1024)
        body = raw.length ? JSON.parse(raw.toString('utf8')) : {}
      } catch {
        return sendJson(res, 400, { error: 'bad_json', message: '请求体不是合法 JSON' })
      }
      if (!body.profile_key || !body.trial_key) return sendJson(res, 400, { error: 'missing_fields', message: '缺少 profile_key / trial_key' })
      source.db.prepare('UPDATE saved_trials SET in_use = 0 WHERE profile_key = ? AND trial_key = ?').run(body.profile_key, body.trial_key)
      return sendJson(res, 200, { ok: true, removed: String(body.trial_key) })
    }

    /* 复诊材料 markdown：私密条目在服务端剔除（export.js 约束 1，三出口之一）。 */
    const exportMatch = path.match(new RegExp(`^${API_PREFIX}/export/([^/]+)\\.md$`))
    if (exportMatch) {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' })
      try {
        const { renderPrepMarkdown } = await import('./export.js')
        const result = renderPrepMarkdown(source.db, decodeURIComponent(exportMatch[1]), { generatedAt: null, version })
        if (!result) return sendJson(res, 404, { error: 'profile_not_found', message: `没有这个档案：${decodeURIComponent(exportMatch[1])}` })
        return sendMarkdown(res, 200, result.markdown, {
          'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
          'x-excluded-private': String(result.excludedPrivate),
        })
      } catch (error) {
        const { status, body } = errorBody(error)
        return sendJson(res, status, body)
      }
    }

    /* 把导出写进资料目录（exports/）。only 桌面/独立启动能存；没配 root 时不支持。 */
    const saveMatch = path.match(new RegExp(`^${API_PREFIX}/export/([^/]+)\\.md/save$`))
    if (saveMatch) {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
      if (typeof source.saveExport !== 'function') return sendJson(res, 501, { error: 'export_save_unavailable' })
      try {
        return sendJson(res, 200, source.saveExport(decodeURIComponent(saveMatch[1])))
      } catch (error) {
        const { status, body } = errorBody(error)
        return sendJson(res, status, body)
      }
    }

    /* 导入：原始字节 + 查询串，走 MinerU；只写候选不写记录（拒收零副作用的前提）。 */
    if (path === `${API_PREFIX}/import`) {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
      const filename = url.searchParams.get('name') || 'document.pdf'
      const profileKey = url.searchParams.get('profile') || 'A'
      const persist = url.searchParams.get('persist') === '1'
      try {
        const { createImportService } = await import('./import.js')
        const bytes = await readBody(req)
        const service = createImportService(source.db)
        const result = await service.parse(bytes, { filename, profileKey })
        if (persist) result.record = service.record({ profileKey, document: result.document, candidates: result.candidates, skipped: result.skipped, engine: result.engine })
        /* markdown 全文可能很大：默认不回，需要时加 ?full=1。 */
        return sendJson(res, 200, { ...result, markdown: url.searchParams.get('full') === '1' ? result.markdown : undefined })
      } catch (error) {
        const { status, body } = errorBody(error)
        return sendJson(res, status, body)
      }
    }

    /* 文档解析设置：Token 的读取（只给掩码与路径）与手工保存/清除。
       原文永不出现在响应里——界面只需要知道「有没有配、存在哪个文件、哪把 key 生效」。 */
    if (path === `${API_PREFIX}/settings/mineru`) {
      const settings = await import('./settings.js')
      if (req.method === 'GET') {
        try {
          return sendJson(res, 200, settings.mineruSettingsStatus())
        } catch (error) {
          return sendJson(res, 500, { error: 'settings_unavailable', message: error.message })
        }
      }
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
      let body = {}
      try {
        const raw = await readBody(req, 64 * 1024)
        body = raw.length ? JSON.parse(raw.toString('utf8')) : {}
      } catch {
        return sendJson(res, 400, { error: 'bad_json', message: '请求体不是合法 JSON' })
      }
      try {
        const status = body?.action === 'clear'
          ? settings.clearMineruToken()
          : settings.saveMineruToken(body?.token)
        return sendJson(res, 200, status)
      } catch (error) {
        /* 校验失败是用户输入问题（400）；文件坏、写不进去是环境问题（500） */
        const status = /请先填写|太短|过长|不能有空格|意外字符|不合法 JSON/.test(error.message) ? 400 : 500
        return sendJson(res, status, { error: status === 400 ? 'invalid_token' : 'settings_write_failed', message: error.message })
      }
    }

    if (path === UI_PREFIX || path.startsWith(`${UI_PREFIX}/`)) {
      return void serveUi(req, res, path.slice(UI_PREFIX.length) || '/')
    }
    return sendJson(res, 404, { error: 'not_found', path })
  }
}
