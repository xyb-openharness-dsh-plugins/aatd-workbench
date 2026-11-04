/* 中国与国际登记通道尝试记录（四通道里的三个非 CT.gov 通道）
 *
 * 这两个中国平台没有开放 API；本文件只记录"查过、结果如何"，不复制站点内容。
 * 重跑：node research/aatd/fetch-cn-registries.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const KW = encodeURIComponent('抗胰蛋白酶缺乏症');
const targets = [
  { id: 'chinadrugtrials', name: '国家药监局药物临床试验登记与信息公示平台', url: `https://www.chinadrugtrials.org.cn/clinicaltrials.searchlist.dhtml?keywords=${KW}` },
  { id: 'chictr', name: '中国临床试验注册中心（ChiCTR）', url: `https://www.chictr.org.cn/searchproj.html?title=${KW}` },
  { id: 'ictrp', name: 'WHO ICTRP 检索入口', url: 'https://trialsearch.who.int/' },
];

const results = [];
for (const t of targets) {
  const startedAt = new Date().toISOString();
  let entry = { ...t, startedAt, status: null, bytes: 0, blockedReason: null, collectable: false };
  try {
    const res = await fetch(t.url, { signal: AbortSignal.timeout(20000) });
    entry.status = res.status;
    const buf = await res.arrayBuffer();
    entry.bytes = buf.byteLength;
    if (!res.ok) entry.blockedReason = `HTTP ${res.status}`;
  } catch (err) {
    entry.blockedReason = String(err?.cause?.code || err?.name || err?.message || err).slice(0, 120);
  }
  results.push(entry);
  console.log(`${t.id}: status=${entry.status} bytes=${entry.bytes} blocked=${entry.blockedReason ?? 'no'}`);
}

writeFileSync(join(HERE, 'cn-registry-attempt.json'), JSON.stringify({
  checkedAt: new Date().toISOString(),
  note: '这些平台没有开放 API；本文件只记录"查过、结果如何"，不复制站点内容。未查过或服务失败时不能写零结果。',
  results,
}, null, 2));
