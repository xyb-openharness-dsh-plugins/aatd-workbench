/* 抓 AATD 试验登记列表，落到 research/aatd/raw-ctgov.json
 *
 * 用途：docs/CLINICAL-DATA.md 试验线的第一层证据——"N 条原始登记"要能复现。
 * 重跑：node research/aatd/fetch-list.mjs
 *
 * 口径：
 *   - query.cond="alpha-1 antitrypsin deficiency"（CT.gov 条件索引，不是全文搜）
 *   - 全量抓取（147 条量级），用 pageToken 翻页
 *   - CT.gov 是公开登记库，无需 token；"登记状态"不等于入组资格，也不是疗效结论
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const COND = 'alpha-1 antitrypsin deficiency';

const studies = [];
let pageToken = '';
let totalCount = null;
for (let page = 0; page < 20; page++) {
  const params = new URLSearchParams({
    'query.cond': COND,
    pageSize: '200',
    countTotal: 'true',
    fields: 'NCTId,BriefTitle,OverallStatus,StudyType,LeadSponsorName,StartDate,CompletionDate,PrimaryCompletionDate,EnrollmentCount,InterventionName,BriefSummary',
  });
  if (pageToken) params.set('pageToken', pageToken);
  const url = `https://clinicaltrials.gov/api/v2/studies?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('FAIL', res.status, await res.text().catch(() => ''));
    process.exit(1);
  }
  const data = await res.json();
  studies.push(...(data.studies ?? []));
  totalCount = data.totalCount ?? totalCount;
  pageToken = data.nextPageToken ?? '';
  if (!pageToken) break;
}

writeFileSync(join(HERE, 'raw-ctgov.json'), JSON.stringify({
  fetched_at: new Date().toISOString(),
  query: COND,
  count: studies.length,
  totalCount,
  studies,
}, null, 1));

console.log(`saved ${studies.length} 条（totalCount=${totalCount ?? '—'}）`);
