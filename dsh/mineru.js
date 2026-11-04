/**
 * MinerU 云端解析客户端（小筛宝 A1Pal · 解析接入层，docs/18 号 v2 口径）。
 *
 * 协议四步（https://mineru.net/doc/docs，API v4）：
 *   ① `POST /file-urls/batch` 申请上传链接 → ② `PUT` 上传原件（不设 Content-Type）
 *   → ③ 轮询 `GET /extract-results/batch/{id}` 到 done/failed → ④ 下载 `full_zip_url`
 *   并从 zip 里取 `full.md`（解包用 lib/zip.js，零依赖）。
 *
 * 六部件边界（18 号 v2）：
 * 1. **Token 优先级：显式 > 密钥文件 > 环境变量**（文件必须排在 env 前面——env 里残留
 *    过期 Key 盖住新 Token 是 2026-10-22 的真实事故）；三处都没有报 NO_TOKEN，不匿名请求；
 * 2. **Token 只有一份实现、一个文件**：读写全在 dsh/settings.js，这里只 resolve 不落盘；
 * 3. **Token 原文不进日志、不进错误消息**：错误里只给来源与掩码；
 * 4. **解析模型显式 pipeline**（默认统一口径）；只有接口明确拒绝模型参数才降级 vlm，
 *    文件本身解析失败不换模型重试（那只是多花一次额度）；
 * 5. **`.html` 拒收**：v4 批量接口拒收 HTML（-10002），白名单里不放 .html；
 * 6. **拿不到 `full.md` 就是失败**，不返回半份数据当成功；解析失败不产生候选。
 */
import { readZip } from '../lib/zip.js'
import { MINERU_TOKEN_URL, maskToken, readMineruToken, secretFile as currentSecretFile } from './settings.js'

export const MINERU_BASE_URL = 'https://mineru.net/api/v4'
/** 解析模型统一口径：默认 pipeline（2026-10-22 起）；vlm 只作为接口明确拒收时的降级。 */
export const MINERU_MODEL_DEFAULT = 'pipeline'
export const MINERU_MODEL_FALLBACK = 'vlm'
export { MINERU_TOKEN_URL, maskToken }

/* v4 批量接口拒收 HTML（实测 -10002 model_version cannot process html files）。
   白名单里不放 .html——留着它等于承诺一个一定失败的入口。 */
const supported = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'])

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export class MineruError extends Error {
  constructor(code, message, detail = null) {
    super(message)
    this.name = 'MineruError'
    this.code = code
    this.detail = detail
  }
}

/** 扩展名是否在提交通道白名单里（`.html` 一律拒收）。 */
export function isSupportedExtension(filename) {
  const ext = String(filename || '').toLowerCase().match(/\.[a-z0-9]+$/)
  return ext ? supported.has(ext[0]) : false
}

/** 接口是否"明确不接受这个模型参数"——只有这一类错误才降级 vlm。 */
export function modelFallbackWorthy(error) {
  if (!error) return false
  if (!['API_ERROR', 'BAD_INPUT'].includes(error.code)) return false
  return /model|模型|version|版本|参数|param|unsupported|not supported|不支持|invalid/iu.test(String(error.message ?? ''))
}

function authRejected(error) {
  return error?.code === 'UNAUTHORIZED'
}

/**
 * 系统是否配了代理。Node 内置 fetch 不走 HTTP_PROXY/HTTPS_PROXY（与 curl/CLI 不同），
 * 代理环境下网络失败要直说，不让人去查网络、查 Token。
 */
function proxyEnvHint() {
  const keys = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']
  const hit = keys.find((key) => String(process.env[key] || '').trim())
  return hit ? `系统设置了 ${hit}，当前版本的内置请求不走系统代理；可先关闭代理或改用直连网络重试。` : ''
}

/** 只用于错误提示，不落库、不进日志。 */
function safeDetail(error) {
  return String(error?.message || '').slice(0, 260)
}

async function requestJson(fetchImpl, url, { method = 'GET', token, tokenSource = '', body = null, timeoutMs = 60000 } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== null) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetchImpl(url, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new MineruError('TIMEOUT', 'MinerU 请求超时；原件仍保存在本机，可稍后重试。', { url })
    }
    const hint = proxyEnvHint()
    throw new MineruError('NETWORK', `无法连接 MinerU：${error?.message || error}${hint ? `（${hint}）` : ''}`, { url })
  }

  if (response.status === 401 || response.status === 403) {
    let apiMessage = ''
    try {
      const text = await response.text()
      apiMessage = String(JSON.parse(text)?.msg || '').trim()
    } catch { /* 报文不是 JSON 就只按状态码说 */ }
    const reason = /expired|过期/iu.test(apiMessage)
      ? 'Token 已过期'
      : /invalid|无效/iu.test(apiMessage) ? 'Token 无效' : apiMessage
    const from = tokenSource === 'secret-file'
      ? '本次使用的是你在设置里保存的 Token。'
      : tokenSource === 'env:MINERU_TOKEN'
        ? '本次使用的是环境变量 MINERU_TOKEN（它会盖过设置里未保存的值；如已换新 Token 仍报错，检查是否存在这条环境变量）。'
        : ''
    throw new MineruError(
      'UNAUTHORIZED',
      `MinerU 拒绝了这个 Token（HTTP ${response.status}${reason ? `，${reason}` : ''}）。${from}可在设置中替换 Token，或到 ${MINERU_TOKEN_URL} 申请 / 重置。`,
      { status: response.status, apiMessage },
    )
  }

  let json = null
  try {
    json = await response.json()
  } catch {
    throw new MineruError('BAD_RESPONSE', `MinerU 返回的不是 JSON（HTTP ${response.status}）`, { url })
  }
  if (json?.code !== 0) {
    const message = String(json?.msg ?? '未知错误')
    const code = /token|auth|权限|登录/iu.test(message) ? 'UNAUTHORIZED' : 'API_ERROR'
    throw new MineruError(code, `MinerU 接口报错（code=${json?.code}）：${message}`, { apiCode: json?.code })
  }
  return json
}

/** ① 申请上传链接；返回 batchId 与 PUT 地址。 */
async function createUploadBatch(fetchImpl, baseUrl, token, tokenSource, { name, modelVersion, language, timeoutMs }) {
  const body = { enable_formula: true, enable_table: true, language, files: [{ name }] }
  if (modelVersion) body.model_version = modelVersion
  const json = await requestJson(fetchImpl, `${baseUrl}/file-urls/batch`, { method: 'POST', token, tokenSource, body, timeoutMs })
  const batchId = json?.data?.batch_id
  const urls = json?.data?.file_urls
  if (!batchId || !Array.isArray(urls) || urls.length !== 1) {
    throw new MineruError('BAD_RESPONSE', '申请上传链接的返回不完整（缺 batch_id 或 file_urls 数量对不上）')
  }
  return { batchId, uploadUrl: urls[0] }
}

/** ② 上传原件。MinerU 要求不设 Content-Type，设了会被拒。 */
async function uploadFile(fetchImpl, uploadUrl, bytes, timeoutMs) {
  let response
  try {
    response = await fetchImpl(uploadUrl, { method: 'PUT', headers: {}, body: bytes, signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    throw new MineruError('UPLOAD_FAILED', `上传原件失败：${error?.message || error}`)
  }
  if (!response.ok) throw new MineruError('UPLOAD_FAILED', `上传原件失败：HTTP ${response.status}`)
}

/** ③ 轮询到结束（done / failed）或超时。 */
async function waitForBatch(fetchImpl, baseUrl, token, tokenSource, batchId, { intervalMs, timeoutMs }) {
  const startedAt = Date.now()
  for (;;) {
    const json = await requestJson(fetchImpl, `${baseUrl}/extract-results/batch/${batchId}`, { token, tokenSource, timeoutMs: 30000 })
    const results = json?.data?.extract_result
    if (!Array.isArray(results)) throw new MineruError('BAD_RESPONSE', '批次结果里没有 extract_result 数组')
    const pending = results.filter((r) => r.state !== 'done' && r.state !== 'failed')
    if (pending.length === 0) return results[0]
    if (Date.now() - startedAt > timeoutMs) {
      throw new MineruError(
        'TIMEOUT',
        `等了 ${Math.round(timeoutMs / 1000)} 秒还没解析完（仍在 ${[...new Set(pending.map((p) => p.state))].join('/')}）`,
      )
    }
    await sleep(intervalMs)
  }
}

/** ④ 下载并取出 full.md（不落盘，lib/zip.js 零依赖解包）。 */
async function downloadMarkdown(fetchImpl, zipUrl, timeoutMs) {
  let response
  try {
    response = await fetchImpl(zipUrl, { signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    throw new MineruError('NETWORK', `下载解析结果失败：${error?.message || error}`)
  }
  if (!response.ok) throw new MineruError('DOWNLOAD_FAILED', `下载解析结果失败：HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  let zip
  try {
    zip = readZip(buffer)
  } catch (error) {
    throw new MineruError('BAD_ZIP', `解析结果不是可读的 ZIP：${error.message}`)
  }
  if (!zip.has('full.md')) {
    throw new MineruError('NO_MARKDOWN', `解析结果里没有 full.md（实际条目：${zip.names.slice(0, 8).join(', ')}）`)
  }
  return zip.text('full.md')
}

/**
 * Token 解析优先级（18 号 v2）：显式 > 密钥文件 > 环境变量。
 * 文件坏了要单独说清（读不出 ≠ 没配）；三处都没有报 NO_TOKEN。
 */
export function resolveToken({ token = null, env = process.env, secretFile = currentSecretFile({ env }) } = {}) {
  if (token?.trim()) return { token: token.trim(), source: 'explicit' }
  let fileToken = ''
  try {
    fileToken = readMineruToken({ file: secretFile })
  } catch (error) {
    throw new MineruError('BAD_SECRET_FILE', error.message)
  }
  if (fileToken) return { token: fileToken, source: 'secret-file' }
  if (env?.MINERU_TOKEN?.trim()) return { token: env.MINERU_TOKEN.trim(), source: 'env:MINERU_TOKEN' }
  throw new MineruError(
    'NO_TOKEN',
    `没有 MinerU Token：在工作台「设置 → 文档解析」里填入，或设置环境变量 MINERU_TOKEN。申请地址：${MINERU_TOKEN_URL}`,
  )
}

/**
 * 解析一份文件，返回 markdown 与引擎标识。
 *
 * @param {Buffer|Uint8Array} bytes
 * @param {string} extension 含点，如 `.pdf`（`.html` 拒收）
 * @param {object} opts
 * @param {string} [opts.token] 不传就按 resolveToken 顺序找（显式 > 文件 > env）
 * @param {string} [opts.model] `pipeline`（默认）或 `vlm`
 * @param {Function} [opts.fetchImpl] 注入用（单测不联网）
 * @returns {Promise<{markdown: string, engine: string, message?: string}>}
 */
export async function extractWithMineru(bytes, extension, {
  token = '',
  tokenSource = '',
  model = MINERU_MODEL_DEFAULT,
  fetchImpl = null,
  baseUrl = MINERU_BASE_URL,
  language = 'ch',
  intervalMs = 3000,
  timeoutMs = 300000,
  requestTimeoutMs = 60000,
} = {}) {
  if (!supported.has(String(extension || '').toLowerCase())) {
    throw new MineruError('BAD_INPUT', 'MinerU 当前不支持此文件类型（.html 也不收）；可保留原件并手工录入。')
  }
  if (!bytes || bytes.byteLength === 0) throw new MineruError('BAD_INPUT', '文件内容为空，不提交解析。')
  if (bytes.byteLength > 200 * 1024 * 1024) throw new MineruError('BAD_INPUT', '单份资料超过 MinerU 支持的 200 MB 上限。')

  const resolved = token?.trim() ? { token: token.trim(), source: tokenSource || 'explicit' } : resolveToken({ env: process.env })
  const useFetch = fetchImpl ?? globalThis.fetch
  const preferred = model === MINERU_MODEL_FALLBACK ? MINERU_MODEL_FALLBACK : MINERU_MODEL_DEFAULT
  const attempts = preferred === MINERU_MODEL_FALLBACK ? [MINERU_MODEL_FALLBACK] : [MINERU_MODEL_DEFAULT, MINERU_MODEL_FALLBACK]

  let lastError = null
  for (const modelVersion of attempts) {
    try {
      const { batchId, uploadUrl } = await createUploadBatch(useFetch, baseUrl, resolved.token, resolved.source, { name: `source${extension}`, modelVersion, language, timeoutMs: requestTimeoutMs })
      await uploadFile(useFetch, uploadUrl, bytes, Math.max(requestTimeoutMs, 300000))
      const result = await waitForBatch(useFetch, baseUrl, resolved.token, resolved.source, batchId, { intervalMs, timeoutMs })

      if (result.state !== 'done') {
        // 文件本身失败：不换模型重试，直接报
        throw new MineruError('TASK_FAILED', `MinerU 解析失败：${result.err_msg || result.state}`, { batchId, state: result.state })
      }
      if (!result.full_zip_url) throw new MineruError('BAD_RESPONSE', '解析完成但没有返回 full_zip_url', { batchId })

      const markdown = String(await downloadMarkdown(useFetch, result.full_zip_url, Math.max(requestTimeoutMs, 120000)) || '').trim()
      if (!markdown) throw new MineruError('NO_MARKDOWN', 'MinerU 没有返回可读取的文本')

      const engine = `mineru-api-${modelVersion}`
      const message = modelVersion !== preferred
        ? `当前账号不支持 ${preferred} 模型，已改用 ${modelVersion} 解析。结果排版可能不同，核对时留意串位。`
        : ''
      return { markdown, engine, ...(message ? { message } : {}) }
    } catch (error) {
      lastError = error
      if (authRejected(error)) throw error
      // 只有"接口不接受这个模型"才换下一个模型，其余错误直接抛
      if (modelVersion === MINERU_MODEL_DEFAULT && modelFallbackWorthy(error)) continue
      throw error
    }
  }
  throw lastError ?? new MineruError('UNKNOWN', 'MinerU 解析未能完成')
}

/** 统一成用户能看懂的一句话；不再出现 ENOENT 这类机器痕迹。 */
export function describeMineruFailure(error) {
  if (error instanceof MineruError) {
    if (error.code === 'UNAUTHORIZED') return error.message
    if (error.code === 'TIMEOUT') return 'MinerU 解析超时；原件仍保存在本机，可稍后重试。'
    return `MinerU 解析失败：${safeDetail(error)}`
  }
  return `MinerU 解析失败：${error?.message || error}`
}

/**
 * ImportService 用的客户端封装：`parse({bytes, filename})` 一步到位。
 * Token 不在这里预读——extractWithMineru 内部按「显式 > 文件 > env」懒解析，
 * 没有 Token 时抛 NO_TOKEN，调用方按 503 处理。
 */
export function createMineruClient(options = {}) {
  return {
    async parse({ bytes, filename }) {
      const ext = String(filename || '').toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? ''
      const result = await extractWithMineru(bytes, ext, {
        fetchImpl: options.fetchImpl,
        baseUrl: options.baseUrl,
        model: options.model,
        language: options.language,
        intervalMs: options.intervalMs,
        timeoutMs: options.timeoutMs,
        requestTimeoutMs: options.requestTimeoutMs,
      })
      return { markdown: result.markdown, engine: result.engine, pages: null, message: result.message ?? null }
    },
  }
}
