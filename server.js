import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { processVideoJob } from './video-worker.js';
import { researchAndPlan } from './research-worker.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.CONTENT_DATA_DIR ? path.resolve(process.env.CONTENT_DATA_DIR) : path.join(root, 'data');
const dbPath = path.join(dataDir, 'workspace.json');
const assetDir = path.join(dataDir, 'assets');
const videoDir = path.join(dataDir, 'video');
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });
const initial = () => ({ strategies: [], productions: [], videoWork: {}, researchRuns: [], researchJob: null, projects: [], evidence: [], ideas: [], drafts: [], publications: [], outcomes: [], research: [
  { id: 'seed-greg', title: 'Greg Isenberg — founder positioning', platform: 'Website', sourceUrl: 'https://www.gregisenberg.com/', observation: 'Official site connects founder identity, startup ideas, educational resources, and company offers. Social posting patterns were not verified.', access: 'inspected', createdAt: '2026-11-17T00:00:00.000Z' },
  { id: 'seed-designjoy', title: 'Designjoy — founder-led agency', platform: 'Website', sourceUrl: 'https://www.designjoy.co/', observation: 'Official site shows clear service packaging, work examples, and a founder-led offer. X content was not directly inspected.', access: 'inspected', createdAt: '2026-11-17T00:00:00.000Z' },
  { id: 'seed-liam', title: 'Liam Ottley — AI business demos', platform: 'Website', sourceUrl: 'https://liamottley.com/', observation: 'Official site presents AI building and filmed business transformations. Instagram feed was not directly inspected.', access: 'inspected', createdAt: '2026-11-17T00:00:00.000Z' },
  { id: 'seed-codestitch', title: 'CodeStitch — small-business websites', platform: 'Website', sourceUrl: 'https://codestitch.app/', observation: 'Official site focuses on small-business website components and developer education. Social accounts were not verified.', access: 'inspected', createdAt: '2026-11-17T00:00:00.000Z' }
], settings: { name: '', brand: 'ExpandR', audience: 'Local service businesses', language: 'English', inquiryUrl: '' } });
function readDb() { if (!fs.existsSync(dbPath)) return initial(); return { ...initial(), ...JSON.parse(fs.readFileSync(dbPath, 'utf8')) }; }
function writeDb(db) {
  const tmp = dbPath + '.' + crypto.randomUUID() + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, dbPath);
  } catch (error) {
    fs.rmSync(tmp, { force: true });
    throw error;
  }
}
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const collections = new Set(['projects', 'evidence', 'ideas', 'drafts', 'publications', 'outcomes', 'research', 'strategies', 'productions']);
function send(res, code, body, type = 'application/json') { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(type === 'application/json' ? JSON.stringify(body) : body); }
function fail(res, code, message) { send(res, code, { error: message }); }
async function body(req) { let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 8_000_000) throw new Error('Request too large'); } return JSON.parse(raw || '{}'); }
const videoLimit = 2 * 1024 ** 3;
const videoIdPattern = /^[a-f0-9-]{36}\.(mp4|mov|webm)$/;
const videoText = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const jobActive = job => ['queued', 'running'].includes(job?.status);
const queueJob = (work, input) => {
  work.job = { ...input, id: id(), status: 'queued', queuedAt: now() };
};

async function runNextVideoJob() {
  if (workerBusy || researchBusy) return;
  const db = readDb();
  const production = db.productions.find(p => db.videoWork[p.id]?.job?.status === 'queued');
  if (!production) return;
  const work = db.videoWork[production.id];
  const job = work.job;
  workerBusy = true;
  let generated;
  try {
    job.status = 'running';
    writeDb(db);
    generated = await processVideoJob({ job, work, videoDir });
    const fresh = readDb();
    const current = fresh.videoWork[production.id];
    if (!fresh.productions.some(p => p.id === production.id) || current?.job?.id !== job.id) return;
    const { upload, notes, cuts, srt, creative } = generated;
    current.uploads.push(upload);
    const review = { id: id(), upload, createdAt: now(), status: 'pending' };
    if (job.type === 'rough') {
      current.timelines.push({ ...review, version: current.timelines.length + 1, notes, cuts, srt, creative, sourceIds: job.sourceIds, automated: true });
    } else {
      if (current.render) (current.renderHistory ??= []).push(current.render);
      current.render = { ...review, timelineId: job.timelineId, srt };
    }
    current.job.status = 'completed';
    writeDb(fresh);
    generated = undefined;
  } catch (error) {
    const fresh = readDb();
    const current = fresh.videoWork[production.id];
    if (current?.job?.id === job.id) {
      current.job.status = 'failed';
      current.job.error = error.message;
      writeDb(fresh);
    }
  } finally {
    workerBusy = false;
    if (generated) await fs.promises.rm(path.join(videoDir, generated.upload.filename), { force: true });
  }
}
let workerBusy = false;
let researchBusy = false;

async function runNextResearchJob() {
  if (researchBusy || workerBusy) return;
  const db = readDb();
  if (db.researchJob?.status !== 'queued') return;
  researchBusy = true;
  const job = db.researchJob;
  try {
    job.status = 'running';
    job.startedAt = now();
    writeDb(db);
    const result = await researchAndPlan({
      references: db.research.filter(item => item.sourceUrl),
      settings: db.settings,
      outcomes: db.outcomes,
      previous: db.strategies,
      previousRun: db.researchRuns[0]
    });
    const fresh = readDb();
    if (fresh.researchJob?.id !== job.id) return;
    const runId = id();
    fresh.researchRuns.unshift({ id: runId, ...result });
    fresh.researchRuns = fresh.researchRuns.slice(0, 30);
    if (result.strategy) fresh.strategies.unshift({ id: id(), ...result.strategy, status: 'proposal', runId, createdAt: now() });
    for (const brief of result.briefs) {
      fresh.productions.unshift({ id: id(), ...brief, status: 'Proposed', runId, createdAt: now() });
    }
    fresh.researchJob.status = 'completed';
    fresh.researchJob.finishedAt = now();
    writeDb(fresh);
  } catch (error) {
    const fresh = readDb();
    if (fresh.researchJob?.id === job.id) {
      fresh.researchJob.status = 'failed';
      fresh.researchJob.error = error.message;
      fresh.researchJob.finishedAt = now();
      writeDb(fresh);
    }
  } finally {
    researchBusy = false;
  }
}

function researchDay() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { day: `${values.year}-${values.month}-${values.day}`, hour: Number(values.hour) };
}
function scheduleResearch() {
  if (process.env.CONTENT_RESEARCH_DISABLED === '1') return;
  if (researchBusy || workerBusy) return;
  const { day, hour } = researchDay();
  if (hour < 10) return;
  const db = readDb();
  if (db.researchJob?.status === 'queued' || db.researchJob?.status === 'running' ||
      db.researchJob?.day === day || db.researchRuns.some(run => run.checkedAt?.startsWith(day))) return;
  db.researchJob = { id: id(), day, status: 'queued', queuedAt: now(), mode: 'daily' };
  writeDb(db);
}

function parseCuts(text) {
  return text.split(/\r?\n/).filter(line => line.trim()).map(line => {
    const [clip, start, end, extra] = line.trim().split(/\s+/).map(Number);
    if (extra !== undefined || !Number.isInteger(clip) || clip < 1 || !(start >= 0) || !Number.isFinite(end) || end - start < 0.1) {
      throw new Error('Use one cut per line: recording number, start seconds, end seconds. Example: 1 2.5 8');
    }
    return { clip, start, end };
  });
}

async function saveVideo(req, res, productionId, url) {
  const purpose = url.searchParams.get('purpose');
  const name = videoText(url.searchParams.get('name'), 250);
  const ext = path.extname(name).toLowerCase();
  if (purpose !== 'recording' && purpose !== 'review') return fail(res, 400, 'Choose an upload purpose');
  if (!(purpose === 'review' ? ['.mp4'] : ['.mp4', '.mov', '.webm']).includes(ext)) {
    return fail(res, 400, purpose === 'review' ? 'Upload an MP4 preview' : 'Upload an MP4, MOV, or WebM recording');
  }
  if (Number(req.headers['content-length']) > videoLimit) return fail(res, 413, 'Video exceeds 2 GiB');
  if (!readDb().productions.some(p => p.id === productionId)) return fail(res, 404, 'Recording brief not found');

  const filename = id() + ext;
  const file = path.join(videoDir, filename);
  const hash = crypto.createHash('sha256');
  let size = 0;
  try {
    const handle = await fs.promises.open(file, 'wx');
    try {
      for await (const chunk of req) {
        size += chunk.length;
        if (size > videoLimit) throw new Error('Request too large');
        hash.update(chunk);
        for (let offset = 0; offset < chunk.length;) {
          const { bytesWritten } = await handle.write(chunk, offset, chunk.length - offset);
          offset += bytesWritten;
        }
      }
    } finally {
      await handle.close();
    }
    if (size < 12) throw new Error('The video file is empty or incomplete');
    const db = readDb();
    if (!db.productions.some(p => p.id === productionId)) throw new Error('Recording brief was removed');
    const work = db.videoWork[productionId] ??= { uploads: [], timelines: [], finals: [] };
    const upload = { filename, name, purpose, size, sha256: hash.digest('hex'), createdAt: now() };
    work.uploads.push(upload);
    writeDb(db);
    return send(res, 201, upload);
  } catch (error) {
    await fs.promises.rm(file, { force: true });
    throw error;
  }
}

function updateVideoReview(res, db, productionId, input) {
  if (!db.productions.some(p => p.id === productionId)) return fail(res, 404, 'Recording brief not found');
  const work = db.videoWork[productionId] ??= { uploads: [], timelines: [], finals: [] };
  const timeline = work.timelines.at(-1);
  const final = work.finals.at(-1);
  const render = work.render?.timelineId === timeline?.id ? work.render : undefined;
  const currentFinal = final?.timelineId === timeline?.id && (!final?.renderId || final.renderId === render?.id) ? final : undefined;

  if (input.action === 'save-intake') {
    if (input.startEdit && jobActive(work.job)) return fail(res, 409, 'Wait for the current edit to finish');
    if (input.startEdit) {
      if (!Array.isArray(input.sourceIds) || !input.sourceIds.length || new Set(input.sourceIds).size !== input.sourceIds.length ||
          !input.sourceIds.every(filename => work.uploads.some(u => u.filename === filename && u.purpose === 'recording'))) {
        return fail(res, 400, 'Select recordings to include');
      }
      const production = db.productions.find(p => p.id === productionId);
      queueJob(work, { type: 'rough', sourceIds: input.sourceIds, creative: input.creative === true,
        brief: { title: production.title, objective: production.objective, shots: production.shots, notes: videoText(input.notes, 8000) } });
    }
    work.intake = { notes: videoText(input.notes, 8000), submittedAt: now() };
  } else if (input.action === 'retry-job') {
    const previous = work.job;
    if (previous?.status !== 'failed' || previous.id !== input.jobId) return fail(res, 409, 'This job cannot be retried');
    const { type, sourceIds, cuts, timelineId, captions, creative, brief } = previous;
    queueJob(work, { type, sourceIds, cuts, timelineId, captions, creative, brief });
  } else if (input.action === 'revise-timeline') {
    if (jobActive(work.job)) return fail(res, 409, 'Wait for the current edit to finish');
    if (!timeline?.automated || timeline.id !== input.reviewId) return fail(res, 409, 'Choose the current automatic timeline');
    const cuts = parseCuts(videoText(input.cuts, 16000));
    if (!cuts.length) return fail(res, 400, 'Enter at least one cut');
    queueJob(work, { type: 'rough', sourceIds: timeline.sourceIds, cuts });
  } else if (input.action === 'revise-captions') {
    if (jobActive(work.job)) return fail(res, 409, 'Wait for the current edit to finish');
    if (!render || render.id !== input.renderId || timeline.status !== 'approved') return fail(res, 409, 'Choose the current finished video');
    const captions = videoText(input.captions, 80000);
    if (captions && !/^\d+\s*\r?\n\d{2}:\d{2}:\d{2},\d{3} --> /m.test(captions)) return fail(res, 400, 'Keep the subtitle numbers and timestamps when editing captions');
    queueJob(work, { type: 'finish', timelineId: timeline.id, captions });
  } else if (input.action === 'approve-render') {
    if (jobActive(work.job) || !render || render.id !== input.renderId || timeline.status !== 'approved') return fail(res, 409, 'Check the current finished video');
    render.approvedAt ??= now();
  } else if (input.action === 'stage-timeline' || input.action === 'stage-final') {
    if (jobActive(work.job)) return fail(res, 409, 'Wait for the current edit to finish');
    const upload = work.uploads.find(u => u.filename === input.filename && u.purpose === 'review');
    if (!upload || !fs.existsSync(path.join(videoDir, upload.filename))) return fail(res, 400, 'Choose a saved MP4 preview');
    const timelineStage = input.action === 'stage-timeline';
    const versions = timelineStage ? work.timelines : work.finals;
    const review = { id: id(), version: versions.length + 1, upload, createdAt: now(), status: 'pending' };
    if (timelineStage) {
      review.notes = videoText(input.notes, 12000);
      if (!review.notes) return fail(res, 400, 'Add the proposed shot order and edit notes');
    } else {
      if (timeline?.status !== 'approved' || timeline.id !== input.timelineId) return fail(res, 409, 'Approve the current timeline before submitting the final video');
      review.timelineId = timeline.id;
      if (render?.upload.filename === upload.filename) review.renderId = render.id;
      review.caption = videoText(input.caption, 12000);
      review.account = videoText(input.account, 250);
      review.platform = input.platform;
      const scheduled = Date.parse(input.publishAt);
      if (!['instagram', 'x'].includes(review.platform) || !review.account || !Number.isFinite(scheduled) || typeof input.caption !== 'string') {
        return fail(res, 400, 'Provide the platform, account, caption, and posting time');
      }
      review.publishAt = new Date(scheduled).toISOString();
    }
    if (work.job?.status === 'failed') delete work.job;
    versions.push(review);
  } else if (input.action === 'approve' || input.action === 'request-changes') {
    if (jobActive(work.job)) return fail(res, 409, 'Wait for the current edit to finish');
    const review = input.stage === 'timeline' ? timeline : input.stage === 'final' ? currentFinal : undefined;
    if (!review || review.id !== input.reviewId || review.status !== 'pending') return fail(res, 409, 'This version is no longer awaiting review. Refresh and check the current version.');
    if (input.stage === 'final' && timeline?.status !== 'approved') return fail(res, 409, 'The current timeline needs approval first');
    if (!fs.existsSync(path.join(videoDir, review.upload.filename))) return fail(res, 409, 'Review video is missing');
    if (input.action === 'approve') {
      review.status = 'approved';
      review.approvedAt = now();
      if (input.stage === 'timeline' && review.automated) queueJob(work, { type: 'finish', timelineId: review.id });
    } else {
      const feedback = videoText(input.feedback, 8000);
      if (!feedback) return fail(res, 400, 'Describe the change you want');
      review.status = 'changes-requested';
      review.feedback = feedback;
      review.feedbackAt = now();
    }
  } else {
    return fail(res, 400, 'Unknown video action');
  }
  writeDb(db);
  return send(res, 200, work);
}

function streamVideo(req, res, filename) {
  if (!videoIdPattern.test(filename)) return fail(res, 404, 'Video missing');
  const file = path.join(videoDir, filename);
  const size = fs.statSync(file, { throwIfNoEntry: false })?.size;
  if (!size) return fail(res, 404, 'Video missing');
  const type = filename.endsWith('.mp4') ? 'video/mp4' : filename.endsWith('.mov') ? 'video/quicktime' : 'video/webm';
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  let start = 0, end = size - 1;
  if (req.headers.range) {
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range?.[1]) {
      start = Number(range[1]);
      if (range[2]) end = Math.min(end, Number(range[2]));
    } else if (range?.[2]) {
      start = Math.max(0, size - Number(range[2]));
    }
    if (!range || (!range[1] && !range[2]) || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length'] = end - start + 1;
  res.writeHead(req.headers.range ? 206 : 200, headers);
  if (req.method === 'HEAD') return res.end();
  const stream = fs.createReadStream(file, { start, end });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}
function patchEntity(db, collection, entityId, patch) {
  const item = db[collection].find(x => x.id === entityId);
  if (!item) throw new Error('Item not found');
  delete patch.id; delete patch.createdAt; delete patch.updatedAt;
  Object.assign(item, patch, { updatedAt: now() }); return item;
}
function validUrl(value) { if (!value) return ''; const u = new URL(value); if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Use an http or https URL'); return u.href; }
function makeBrief(db, idea) {
  const project = db.projects.find(x => x.id === idea.projectId);
  const evidence = db.evidence.filter(x => idea.evidenceIds?.includes(x.id));
  return `Create an original ${idea.platform || 'X or Instagram'} content concept for ${db.settings.name || 'a founder'} (backed by ${db.settings.brand}). Audience: ${db.settings.audience}.\n\nIdea: ${idea.title}\nAngle: ${idea.angle || ''}\nProject: ${project?.name || 'none selected'}\nVerified material:\n${evidence.map(x => `- [${x.id}] ${x.title}: ${x.details} (${x.sourceUrl || 'owner record'}; public use: ${x.publicUse})`).join('\n') || '- No verified material attached.'}\n\nNever invent client work, metrics, experience, or outcomes. If essential information is missing, list exact questions instead of asserting it. Keep X and Instagram treatments distinct. Return draft, claim list with evidence IDs, and visual notes.`;
}
function exportedText(db, draft) {
  const idea = db.ideas.find(x => x.id === draft.ideaId);
  return `${draft.platform.toUpperCase()} / ${draft.format}\n${idea?.title || ''}\n\n${draft.content}\n\n---\nEvidence: ${(draft.evidenceIds || []).join(', ') || 'none'}\nApproved: ${draft.approvedAt}\nVersion: ${draft.version}`;
}
function approvalValid(db, draft) {
  if (!draft?.approvedAt || draft.approvedVersion !== draft.version) return false;
  const idea = db.ideas.find(x => x.id === draft.ideaId);
  if (!idea) return false;
  if (idea.projectId) { const project = db.projects.find(x => x.id === idea.projectId); if (!project || project.publicUse !== 'approved') return false; }
  const refs = (draft.evidenceIds || []).map(ref => db.evidence.find(x => x.id === ref));
  return refs.length > 0 && refs.every(ref => ref && ref.publicUse === 'approved') && (draft.claims || []).every(c => c.status === 'confirmed' || c.status === 'removed');
}
function invalidateRelatedDrafts(db, resource, entityId) {
  for (const draft of db.drafts) {
    const linkedIdea = db.ideas.find(x => x.id === draft.ideaId);
    if ((resource === 'evidence' && (draft.evidenceIds || []).includes(entityId)) || (resource === 'ideas' && draft.ideaId === entityId) || (resource === 'projects' && linkedIdea?.projectId === entityId)) {
      draft.approvedAt = null; draft.approvedVersion = null; draft.updatedAt = now();
    }
  }
}
async function api(req, res, url) {
  const segments = url.pathname.split('/').filter(Boolean).slice(1);
  const [resource, entityId, action] = segments;
  if (resource === 'research-cycle' && req.method === 'POST') {
    const db = readDb();
    if (['queued', 'running'].includes(db.researchJob?.status)) return fail(res, 409, 'Research is already running');
    db.researchJob = { id: id(), status: 'queued', queuedAt: now(), mode: 'manual', day: researchDay().day };
    writeDb(db);
    return send(res, 202, db.researchJob);
  }
  if (resource === 'productions' && entityId && req.method === 'POST') {
    if (action === 'video-upload') return saveVideo(req, res, entityId, url);
    if (action === 'video-review') {
      const input = await body(req);
      return updateVideoReview(res, readDb(), entityId, input);
    }
  }
  const payload = ['POST', 'PUT'].includes(req.method) ? await body(req) : undefined;
  const db = readDb();
  if (req.method === 'GET' && resource === 'state') return send(res, 200, db);
  if (resource === 'settings' && req.method === 'PUT') {
    const input = payload;
    db.settings = { ...db.settings, name: String(input.name || '').slice(0, 120), brand: String(input.brand || 'ExpandR').slice(0, 120), audience: String(input.audience || '').slice(0, 250), language: String(input.language || 'English').slice(0, 80), inquiryUrl: validUrl(input.inquiryUrl) };
    writeDb(db); return send(res, 200, db.settings);
  }
  if (resource === 'assets' && req.method === 'POST') {
    const input = payload; const match = /^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input.data || '');
    if (!match) return fail(res, 400, 'Upload a PNG, JPEG, or WebP image');
    const bytes = Buffer.from(match[3], 'base64'); if (bytes.length > 5_000_000) return fail(res, 413, 'Image exceeds 5 MB');
    const assetId = id(), filename = `${assetId}.${match[2] === 'jpeg' ? 'jpg' : match[2]}`;
    fs.writeFileSync(path.join(assetDir, filename), bytes);
    return send(res, 201, { id: assetId, filename, url: `/assets/${filename}` });
  }
  if (resource === 'brief' && req.method === 'GET') {
    const idea = db.ideas.find(x => x.id === entityId); if (!idea) return fail(res, 404, 'Idea not found');
    return send(res, 200, { text: makeBrief(db, idea) });
  }
  if (resource === 'export' && req.method === 'GET') {
    const draft = db.drafts.find(x => x.id === entityId); if (!draft) return fail(res, 404, 'Draft not found');
    if (!approvalValid(db, draft)) return fail(res, 409, 'Approve the current version and its public evidence before export');
    return send(res, 200, exportedText(db, draft), 'text/plain; charset=utf-8');
  }
  if (!collections.has(resource)) return fail(res, 404, 'Not found');
  if (req.method === 'POST' && !entityId) {
    const input = payload;
    const item = { ...input, id: id(), createdAt: now(), updatedAt: now() };
    if (resource === 'projects') { if (!item.name) return fail(res, 400, 'Project name required'); item.publicUse = item.publicUse || 'pending'; }
    if (resource === 'evidence') { if (!item.title || !item.details) return fail(res, 400, 'Title and details required'); item.sourceUrl = validUrl(item.sourceUrl); item.publicUse = item.publicUse || 'pending'; }
    if (resource === 'research') { if (!item.title || !item.sourceUrl) return fail(res, 400, 'Title and URL required'); item.sourceUrl = validUrl(item.sourceUrl); item.access = item.access || 'link only'; }
    if (resource === 'ideas') { if (!item.title) return fail(res, 400, 'Idea title required'); item.status = 'inbox'; item.evidenceIds = item.evidenceIds || []; }
    if (resource === 'drafts') { if (!item.ideaId || !item.content || !['x', 'instagram'].includes(item.platform)) return fail(res, 400, 'Idea, content, and platform required'); item.version = 1; item.approvedAt = null; item.approvedVersion = null; item.claims = item.claims || []; item.evidenceIds = item.evidenceIds || []; }
    if (resource === 'publications') { const draft = db.drafts.find(x => x.id === item.draftId); if (!approvalValid(db, draft)) return fail(res, 409, 'Current draft approval required'); item.version = draft.version; item.platform = draft.platform; item.status = item.url ? 'published' : 'planned'; item.url = validUrl(item.url); }
    db[resource].unshift(item); writeDb(db); return send(res, 201, item);
  }
  if (req.method === 'PUT' && entityId && !action) {
    const input = payload, item = db[resource].find(x => x.id === entityId); if (!item) return fail(res, 404, 'Item not found');
    if (resource === 'drafts') { delete input.approvedAt; delete input.approvedVersion; delete input.version; input.version = item.version + 1; input.approvedAt = null; input.approvedVersion = null; }
    if (resource === 'publications' && item.status === 'published' && input.draftId !== undefined && input.draftId !== item.draftId) return fail(res, 409, 'Cannot change the draft linked to a published record');
    if (resource === 'research' || resource === 'evidence') input.sourceUrl = validUrl(input.sourceUrl);
    if (resource === 'publications') { if (input.url) input.url = validUrl(input.url); input.status = input.url ? 'published' : 'planned'; }
    const updated = patchEntity(db, resource, entityId, input);
    if (resource === 'evidence' || resource === 'ideas' || resource === 'projects') invalidateRelatedDrafts(db, resource, entityId);
    writeDb(db); return send(res, 200, updated);
  }
  if (req.method === 'POST' && resource === 'drafts' && entityId && action === 'approve') {
    const draft = db.drafts.find(x => x.id === entityId); if (!draft) return fail(res, 404, 'Draft not found');
    const idea = db.ideas.find(x => x.id === draft.ideaId); if (!idea) return fail(res, 409, 'Idea missing');
    const refs = (draft.evidenceIds || []).map(ref => db.evidence.find(x => x.id === ref));
    const project = idea.projectId ? db.projects.find(x => x.id === idea.projectId) : null;
    if (idea.projectId && project?.publicUse !== 'approved') return fail(res, 409, 'Approve public use of the project first');
    if (!refs.length || refs.some(ref => !ref || ref.publicUse !== 'approved')) return fail(res, 409, 'Attach evidence approved for public use');
    if ((draft.claims || []).some(c => c.status !== 'confirmed' && c.status !== 'removed')) return fail(res, 409, 'Resolve every claim before approval');
    draft.approvedAt = now(); draft.approvedVersion = draft.version; draft.updatedAt = now(); writeDb(db); return send(res, 200, draft);
  }
  if (req.method === 'DELETE' && entityId && !action) {
    db[resource] = db[resource].filter(x => x.id !== entityId);
    if (resource === 'evidence' || resource === 'ideas' || resource === 'projects') invalidateRelatedDrafts(db, resource, entityId);
    writeDb(db); return send(res, 200, { ok: true });
  }
  return fail(res, 405, 'Unsupported action');
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const activePort = server.address().port;
    if (req.headers.host !== `127.0.0.1:${activePort}` && req.headers.host !== `localhost:${activePort}`) return fail(res, 403, 'Use the local workspace address');
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return fail(res, 403, 'Use the workspace to make changes');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname.startsWith('/video/') && ['GET', 'HEAD'].includes(req.method)) return streamVideo(req, res, url.pathname.slice(7));
    if (url.pathname.startsWith('/assets/')) {
      const filename = path.basename(url.pathname); if (filename !== url.pathname.slice(8)) return fail(res, 400, 'Invalid asset');
      const file = path.join(assetDir, filename); if (!fs.existsSync(file)) return fail(res, 404, 'Asset missing');
      const ext = path.extname(file).toLowerCase(); const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
      if (!types[ext]) return fail(res, 403, 'Asset type unsupported'); res.writeHead(200, { 'Content-Type': types[ext], 'X-Content-Type-Options': 'nosniff' }); return fs.createReadStream(file).pipe(res);
    }
    const files = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' };
    if (!files[url.pathname]) return fail(res, 404, 'Not found');
    const mime = url.pathname === '/app.js' ? 'text/javascript' : url.pathname === '/style.css' ? 'text/css' : 'text/html';
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }); fs.createReadStream(path.join(root, 'web', files[url.pathname])).pipe(res);
  } catch (err) { fail(res, err.message === 'Request too large' ? 413 : 400, err.message); }
});
const port = Number(process.env.PORT || 3187);
server.listen(port, '127.0.0.1', () => {
  console.log(`Founder Content Engine at http://127.0.0.1:${server.address().port}`);
  const db = readDb();
  let interrupted = false;
  if (db.researchJob?.status === 'running') {
    db.researchJob.status = 'queued';
    interrupted = true;
  }
  for (const work of Object.values(db.videoWork)) {
    if (work.job?.status === 'running') {
      work.job.status = 'queued';
      interrupted = true;
    }
  }
  if (interrupted) writeDb(db);
  setInterval(() => runNextVideoJob().catch(error => console.error('Video worker:', error.message)), 1000).unref();
  if (process.env.CONTENT_RESEARCH_DISABLED !== '1') {
    setInterval(() => runNextResearchJob().catch(error => console.error('Research worker:', error.message)), 2000).unref();
    setInterval(() => scheduleResearch(), 60_000).unref();
    scheduleResearch();
  }
});
