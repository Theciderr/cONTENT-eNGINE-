import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('evidence approval, versioned drafts, export, and persistence', async () => {
  const dir = mkdtempSync(path.join(path.resolve('.'), 'test-data-temp', 'content-engine-'));
  const port = 34000 + Math.floor(Math.random()*10000);
  const child = spawn(process.execPath, ['server.js'], { cwd: path.resolve('.'), env: { ...process.env, PORT: String(port), CONTENT_DATA_DIR: dir, CONTENT_RESEARCH_DISABLED: '1' }, stdio: ['ignore','pipe','pipe'] });
  let output = ''; child.stdout.on('data', x => output += x); child.stderr.on('data', x => output += x);
  const base = `http://127.0.0.1:${port}`;
  const call = async (endpoint, method='GET', payload) => {
    const response = await fetch(base + '/api/' + endpoint, { method, headers: payload ? { 'Content-Type': 'application/json' } : {}, body: payload ? JSON.stringify(payload) : undefined });
    const contentType = response.headers.get('content-type') || '';
    return { status: response.status, data: contentType.includes('json') ? await response.json() : await response.text() };
  };
  try {
    let ready=false; for (let i=0;i<100;i++) { try { await fetch(base+'/'); ready=true; break } catch { await new Promise(r=>setTimeout(r,50)) } }
    assert.ok(ready, `Server did not start: ${output}`);
    const project=(await call('projects','POST',{name:'Internal lead tracker',type:'Internal tool',description:'Used internally'})).data;
    const evidence=(await call('evidence','POST',{projectId:project.id,title:'Intake screen',details:'Shows a lead form',publicUse:'pending'})).data;
    const idea=(await call('ideas','POST',{projectId:project.id,title:'Why intake needs a clear next step',evidenceIds:[evidence.id]})).data;
    const draft=(await call('drafts','POST',{ideaId:idea.id,platform:'x',format:'Standalone post',content:'A clear intake flow helps the team follow up.',evidenceIds:[evidence.id],claims:[{text:'We use this internally',status:'unresolved'}]})).data;
    assert.equal((await call('drafts/'+draft.id+'/approve','POST',{})).status,409);
    await call('projects/'+project.id,'PUT',{publicUse:'approved'});
    await call('evidence/'+evidence.id,'PUT',{publicUse:'approved'});
    assert.equal((await call('drafts/'+draft.id+'/approve','POST',{})).status,409);
    await call('drafts/'+draft.id,'PUT',{claims:[{text:'We use this internally',status:'confirmed'}]});
    assert.equal((await call('drafts/'+draft.id+'/approve','POST',{})).status,200);
    assert.equal((await call('export/'+draft.id)).status,200);
    assert.equal((await call('publications','POST',{draftId:draft.id,plannedAt:'2026-11-17T11:00'})).status,201);
    await call('drafts/'+draft.id,'PUT',{content:'Revised copy'});
    assert.equal((await call('export/'+draft.id)).status,409);
    assert.equal((await call('publications','POST',{draftId:draft.id})).status,409);
    assert.equal(JSON.parse(readFileSync(path.join(dir,'workspace.json'),'utf8')).drafts[0].version,3);
    assert.equal((await call('drafts/'+draft.id+'/approve','POST',{})).status,200);
    await call('evidence/'+evidence.id,'PUT',{details:'Corrected observation'});
    assert.equal((await call('export/'+draft.id)).status,409);
    assert.equal((await call('state')).data.projects.length,1);

    const production = (await call('productions', 'POST', { title: 'Recording brief' })).data;
    const route = `productions/${production.id}/video-review`;
    const review = input => call(route, 'POST', input);
    const bytes = Buffer.from('review upload fixture');
    const uploadResponse = await fetch(base+`/api/productions/${production.id}/video-upload?purpose=review&name=preview.mp4`, {
      method: 'POST', body: bytes
    });
    assert.equal(uploadResponse.status, 201);
    const upload = await uploadResponse.json();
    const media = await fetch(base+'/video/'+upload.filename, { headers: { Range: 'bytes=0-5' } });
    assert.equal(media.status, 206);
    assert.equal(await media.text(), 'review');
    const finalInput = { action: 'stage-final', filename: upload.filename, platform: 'instagram',
      account: '@test', caption: 'Exact copy', publishAt: '2026-11-18T10:00:00+05:30' };
    assert.equal((await review(finalInput)).status, 409);
    const first = (await review({ action: 'stage-timeline', filename: upload.filename, notes: 'Review shot order' })).data.timelines[0];
    assert.equal((await review({ action: 'request-changes', stage: 'timeline', reviewId: first.id, feedback: 'Tighten the opening' })).status, 200);
    const second = (await review({ action: 'stage-timeline', filename: upload.filename, notes: 'Revised opening' })).data.timelines[1];
    assert.equal((await review({ action: 'approve', stage: 'timeline', reviewId: first.id })).status, 409);
    assert.equal((await review({ action: 'approve', stage: 'timeline', reviewId: second.id })).status, 200);
    const final = (await review({ ...finalInput, timelineId: second.id })).data.finals[0];
    assert.equal((await review({ action: 'approve', stage: 'final', reviewId: final.id })).status, 200);
    await review({ action: 'stage-timeline', filename: upload.filename, notes: 'New cut' });
    assert.equal((await review({ action: 'approve', stage: 'final', reviewId: final.id })).status, 409);
    const saved = JSON.parse(readFileSync(path.join(dir,'workspace.json'),'utf8')).videoWork[production.id];
    assert.equal(saved.timelines[0].feedback, 'Tighten the opening');
    assert.equal(saved.finals[0].upload.sha256, upload.sha256);
    assert.equal(saved.finals[0].publishAt, '2026-11-18T04:30:00.000Z');
    assert.ok(saved.finals[0].approvedAt);
  } finally { child.kill(); rmSync(dir,{recursive:true,force:true}) }
});
