/* 把 raw-ctgov.json + cn-registry-attempt.json 归一成快照：
 * manifest.json + trials.jsonl + trials.sqlite（trials 表 + source_statuses 表）
 *
 * 重跑：rm trials.sqlite && node research/aatd/build-snapshot.mjs
 * 断言：manifest.files sha256、recordCount/dbCount/sourceStatusRows 三处计数一致、逐字段映射非空。
 * 口径：登记状态 ≠ 入组资格 ≠ 疗效结论；status_note 里不带任何判断。
 */
import { writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DATE = new Date().toISOString().slice(0, 10);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const QUERY = 'alpha-1 antitrypsin deficiency';

const raw = JSON.parse(readFileSync(join(HERE, 'raw-ctgov.json'), 'utf8'));
if (!raw.studies?.length) { console.error('raw-ctgov.json 为空：不能写零结果'); process.exit(1); }

const pick = (s) => {
  const p = s.protocolSection ?? {};
  const id = p.identificationModule?.nctId;
  if (!id) throw new Error('缺 NCTId');
  const dates = [p.statusModule?.startDateStruct?.date, p.statusModule?.primaryCompletionDateStruct?.date, p.statusModule?.completionDateStruct?.date].filter(Boolean);
  const sponsor = p.sponsorCollaboratorsModule?.leadSponsor?.name ?? null;
  const interventions = (p.armsInterventionsModule?.interventions ?? []).map((i) => i.name).filter(Boolean);
  return {
    recordId: id,
    mergedSources: ['ctgov'],
    sourceId: 'ctgov',
    title: p.identificationModule?.briefTitle ?? '',
    studyType: p.designModule?.studyType ?? '',
    sponsor: sponsor ? [sponsor] : [],
    registryNumbers: [id],
    dates,
    sourceUrl: `https://clinicaltrials.gov/study/${id}`,
    retrievedAt: raw.fetched_at,
    statusNote: p.statusModule?.overallStatus ?? '',
    snapshotDate: SNAPSHOT_DATE,
  };
};

const records = raw.studies.map(pick);
for (const r of records) {
  for (const k of ['recordId', 'title', 'studyType', 'sponsor', 'registryNumbers', 'dates', 'sourceUrl', 'retrievedAt', 'statusNote', 'snapshotDate']) {
    if (r[k] === undefined || r[k] === null || r[k] === '') throw new Error(`字段映射缺 ${k}: ${r.recordId}`);
  }
}

/* jsonl（camelCase，isJson 字段落真数组） */
const jsonlPath = join(HERE, 'trials.jsonl');
const jsonlLines = records.map((r) => JSON.stringify(r));
writeFileSync(jsonlPath, jsonlLines.join('\n') + '\n');

/* sqlite（snake_case 列） */
const dbPath = join(HERE, 'trials.sqlite');
if (existsSync(dbPath)) throw new Error('trials.sqlite 已存在，请先 rm 再重建');
const db = new DatabaseSync(dbPath);
db.exec(`CREATE TABLE trials (
  record_id TEXT PRIMARY KEY, merged_sources TEXT, source_id TEXT, title TEXT, study_type TEXT,
  sponsors TEXT, registry_numbers TEXT, dates TEXT, source_url TEXT, retrieved_at TEXT,
  status_note TEXT, snapshot_date TEXT
)`);
db.exec('CREATE TABLE source_statuses (query TEXT, source_id TEXT, state TEXT, note TEXT, checked_at TEXT)');
const ins = db.prepare(`INSERT INTO trials (record_id, merged_sources, source_id, title, study_type, sponsors, registry_numbers, dates, source_url, retrieved_at, status_note, snapshot_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (const r of records) {
  ins.run(r.recordId, JSON.stringify(r.mergedSources), r.sourceId, r.title, r.studyType, JSON.stringify(r.sponsor), JSON.stringify(r.registryNumbers), JSON.stringify(r.dates), r.sourceUrl, r.retrievedAt, r.statusNote, r.snapshotDate);
}

const attempt = JSON.parse(readFileSync(join(HERE, 'cn-registry-attempt.json'), 'utf8'));
const statusIns = db.prepare('INSERT INTO source_statuses (query, source_id, state, note, checked_at) VALUES (?, ?, ?, ?, ?)');
statusIns.run(QUERY, 'ctgov', 'ok', `fetched ${records.length} studies via API v2`, raw.fetched_at);
for (const res of attempt.results ?? []) {
  const state = res.blockedReason ? 'blocked' : 'attempted-noapi';
  statusIns.run(QUERY, res.id, state, `HTTP ${res.status} bytes=${res.bytes} ${res.blockedReason ?? '页面无开放 API，未采集'}`, attempt.checkedAt);
}
const statusRows = db.prepare('SELECT query, source_id, state FROM source_statuses').all();
db.close();

/* manifest + 断言 */
const jsonlBytes = readFileSync(jsonlPath);
const dbBytes = readFileSync(dbPath);
const dbCount = new DatabaseSync(dbPath, { readOnly: true }).prepare('SELECT COUNT(*) AS c FROM trials').get().c;
const jsonlCount = jsonlBytes.toString().trim().split('\n').length;
if (jsonlCount !== records.length || dbCount !== records.length) {
  throw new Error(`计数不一致：raw=${records.length} jsonl=${jsonlCount} sqlite=${dbCount}`);
}
const manifest = {
  snapshot_date: SNAPSHOT_DATE,
  query: QUERY,
  recordCount: jsonlCount,
  dbCount,
  sourceStatusRows: statusRows.length,
  source: { id: 'ctgov', totalCount: raw.totalCount, fetched_at: raw.fetched_at },
  files: {
    'trials.jsonl': { sha256: sha256(jsonlBytes), bytes: jsonlBytes.length, records: jsonlCount },
    'trials.sqlite': { sha256: sha256(dbBytes), bytes: dbBytes.length, records: dbCount },
  },
  field_map: { recordId: 'record_id', mergedSources: 'merged_sources', sourceId: 'source_id', title: 'title', studyType: 'study_type', sponsor: 'sponsors', registryNumbers: 'registry_numbers', dates: 'dates', sourceUrl: 'source_url', retrievedAt: 'retrieved_at', statusNote: 'status_note', snapshotDate: 'snapshot_date' },
  caveat: '登记状态不等于入组资格，也不构成疗效结论；中国两通道未开放 API，尝试记录见 cn-registry-attempt.json 与 source_statuses 表',
};
writeFileSync(join(HERE, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`snapshot: raw=${records.length} jsonl=${jsonlCount} sqlite=${dbCount} statuses=${statusRows.length}`);
console.log(`sha256 jsonl=${manifest.files['trials.jsonl'].sha256.slice(0, 12)} sqlite=${manifest.files['trials.sqlite'].sha256.slice(0, 12)}`);
