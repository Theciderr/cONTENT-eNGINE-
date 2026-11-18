let state, page = 'today', query = '', modalSave = null;
const $ = s => document.querySelector(s);
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = x => x ? new Date(x).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : 'No date';
const api = async (path, method='GET', data) => { const res = await fetch('/api/'+path,{method,headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined}); const out = await res.json(); if(!res.ok) throw new Error(out.error||'Request failed'); return out; };
const notify=(message,error=false)=>{const el=$('#notice');el.textContent=message;el.className=error?'error':'';setTimeout(()=>{if(el.textContent===message)el.textContent=''},5000)};
const mutate=async(path,method,data)=>{try{const out=await api(path,method,data);await refresh();return out}catch(e){notify(e.message,true);throw e}};
const get=(col,id)=>state[col].find(x=>x.id===id);
const title=id=>get('projects',id)?.name||'No project';
const tag=(text,warn=false)=>`<span class="tag ${warn?'warn':''}">${esc(text)}</span>`;
const btn=(label,action,id,kind='ghost')=>`<button class="button small ${kind}" data-action="${action}" data-id="${esc(id)}">${esc(label)}</button>`;
const empty=(heading,sub,action,label)=>`<div class="empty"><strong>${heading}</strong><p>${sub}</p>${action?btn(label,action,'','primary'):''}</div>`;
const card=(heading,description,meta,actions,badge='')=>`<article class="card"><div class="card-top"><div><h3>${esc(heading)}</h3><div class="meta">${esc(meta)}</div></div>${badge}</div><p>${esc(description)}</p><div class="card-actions">${actions}</div></article>`;
const heading=(text,button,action)=>`<div class="section-head"><h2>${text}</h2>${button?btn(button,action,'','primary'):''}</div>`;
const filtered=items=>items.filter(x=>JSON.stringify(x).toLowerCase().includes(query.toLowerCase()));
const search=()=>`<div class="toolbar"><input id="search" placeholder="Search this view" aria-label="Search this view" value="${esc(query)}"></div>`;
function today(){let pending=state.drafts.filter(x=>!x.approvedAt), approved=state.drafts.filter(x=>x.approvedAt), unpublished=approved.filter(x=>!state.publications.some(p=>p.draftId===x.id&&p.status==='published'));
return `<div class="banner"><h2>Make the work visible.</h2><p>Capture what you built, connect it to evidence, then turn it into content you can stand behind.</p></div><div class="stat-grid"><div class="stat"><span>Projects</span><strong>${state.projects.length}</strong><small>Real work logged</small></div><div class="stat"><span>Ideas</span><strong>${state.ideas.length}</strong><small>Angles to explore</small></div><div class="stat"><span>In review</span><strong>${pending.length}</strong><small>Drafts awaiting approval</small></div><div class="stat"><span>Ready</span><strong>${unpublished.length}</strong><small>Approved, not published</small></div></div><div class="two-col"> <section>${heading('Next actions')}${!state.projects.length?empty('Start with a real project','Add an internal tool or demo site. Record only what you can show publicly.','add-project','Add project'):!state.evidence.length?empty('Add evidence','Capture one observation, screenshot, or build note from a project.','add-evidence','Add evidence'):pending.length?pending.slice(0,4).map(d=>card(get('ideas',d.ideaId)?.title||'Draft',d.content.slice(0,160),`${d.platform.toUpperCase()} · Version ${d.version}`,btn('Review','open-draft',d.id),tag('Needs review',true))).join(''):empty('Ready to develop an idea','Turn project evidence into a specific, useful story.','add-idea','Add idea')}</section><section>${heading('Operating notes')}<div class="panel"><h3>Evidence before claims</h3><p>Client outcomes, time savings and conversions require confirmed measurements. Internal usage can be described when its public disclosure is approved.</p><h3>Approval stays precise</h3><p>Editing a draft invalidates its approval. Export and publication records use the approved version.</p><h3>Local and private</h3><p>This workspace runs on your computer. Social publishing is not connected.</p></div></section></div>`}
function projects(){return `${heading('Projects & real work','Add project','add-project')}${search()}${filtered(state.projects).length?`<div class="grid-cards">${filtered(state.projects).map(p=>card(p.name,p.description||'No description yet',`${p.type||'Project'} · ${p.status||'Status not set'} · ${date(p.createdAt)}`,btn('Add evidence','add-evidence',p.id)+btn('Edit','edit-project',p.id),tag(p.publicUse==='approved'?'Public use approved':'Public use pending',p.publicUse!=='approved'))).join('')}</div>`:empty('No projects yet','Add a demo site or internal tool. You can document its real status and scope.','add-project','Add project')}${heading('Evidence library','Add evidence','add-evidence')}${state.evidence.length?state.evidence.map(e=>card(e.title,e.details,`${title(e.projectId)} · ${e.kind||'Observation'} · ${date(e.createdAt)}`,`${e.sourceUrl?`<a class="button small ghost" href="${esc(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source</a>`:''}${e.assetUrl?`<a class="button small ghost" href="${esc(e.assetUrl)}" target="_blank" rel="noopener noreferrer">Open image</a>`:''}${btn('Edit','edit-evidence',e.id)}`,tag(e.publicUse==='approved'?'Public use approved':'Private / pending',e.publicUse!=='approved'))).join(''):empty('No evidence yet','Attach an actual note, URL, or screenshot to a project.','add-evidence','Add evidence')}`}
function research(){
  const job=state.researchJob, runs=state.researchRuns||[];
  const jobStatus=job ? `<div class="panel"><strong>Research · ${esc(job.status)}</strong>${job.error?`<p role="alert">${esc(job.error)}</p>`:''}<p>${esc(job.queuedAt?new Date(job.queuedAt).toLocaleString():'')}</p></div>`:'';
  return `${heading('Research sources','Add reference','add-research')}
    <p class="lead">Daily research runs after 10 AM IST while the app is running. Add public source URLs for founders, builders, and agencies. Sources that cannot be read appear as access gaps.</p>
    <div class="card-actions">${btn(job?.status==='failed'?'Retry research':'Run research now','research-run','')}</div>${jobStatus}
    ${runs.length ? `<h2>Recent research runs</h2>${runs.slice(0,5).map(run=>`<div class="panel"><h3>${esc(date(run.checkedAt))}</h3><p>${esc(run.summary)}</p>
      <details><summary>Sources checked</summary><ul>${run.sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a> · ${esc(source.error||'Accessible')} · ${esc(new Date(source.checkedAt).toLocaleString())}</li>`).join('')}</ul></details></div>`).join('')}`:''}
    ${search()}${filtered(state.research).length?filtered(state.research).map(r=>card(r.title,r.observation||'No observation recorded',`${r.platform||'Web'} · ${r.access||'link only'} · ${date(r.createdAt)}`,`<a class="button small ghost" href="${esc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source</a>${btn('Edit','edit-research',r.id)}`,tag(r.access||'link only',r.access!=='inspected'))).join(''):empty('No references saved','Add a public source for recurring research.','add-research','Add reference')}`;
}
function ideas(){return `${heading('Story ideas','Add idea','add-idea')}<p class="lead">Ideas stay attached to real work and evidence. Choose an angle that helps your intended buyer understand a problem or decision.</p>${search()}${filtered(state.ideas).length?filtered(state.ideas).map(i=>card(i.title,`${i.angle||'No angle yet'}\n${i.problem?'Buyer problem: '+i.problem:''}`,`${title(i.projectId)} · ${i.pillar||'Builder'} · ${(i.evidenceIds||[]).length} evidence item(s)`,btn('Open brief','brief',i.id)+btn('Draft','add-draft',i.id)+btn('Edit','edit-idea',i.id),tag(i.status||'inbox'))).join(''):empty('No ideas yet','Create an angle from a project or a research observation.','add-idea','Add idea')}`}
function studio(){return `${heading('Content studio','New draft','add-draft')}<p class="lead">Write distinct treatments for X and Instagram. For carousels, separate slides with a line containing three dashes (---). Every factual claim should connect to approved evidence.</p>${search()}${filtered(state.drafts).length?filtered(state.drafts).map(d=>card(get('ideas',d.ideaId)?.title||'Untitled idea',d.content.slice(0,250),`${d.platform.toUpperCase()} · ${d.format||'Post'} · Version ${d.version} · ${date(d.updatedAt)}`,btn('Open editor','open-draft',d.id)+btn('Review claims','claims',d.id)+(d.approvedAt?btn('Export copy','export',d.id)+(d.platform==='instagram'&&d.format==='Carousel'?btn('Export slides','export-slides',d.id):''):btn('Approve','approve',d.id)),tag(d.approvedAt?'Approved':'Needs review',!d.approvedAt))).join(''):empty('No drafts yet','Create a draft from an idea and attach public-use evidence.','add-draft','New draft')}`}
function calendar(){return `${heading('Publishing calendar','Plan post','add-publication')}<p class="lead">A planned date is a local reminder. Publishing remains manual until a supported account connection is configured.</p>${state.publications.length?state.publications.map(p=>{let d=get('drafts',p.draftId);return card(get('ideas',d?.ideaId)?.title||'Post',p.url||'No live URL recorded',`${p.platform?.toUpperCase()||''} · ${date(p.plannedAt)} · ${p.status}`,btn('Edit record','edit-publication',p.id)+(p.url?`<a class="button small ghost" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">View post</a>`:''),tag(p.status,p.status!=='published'))}).join(''):empty('No posts planned','Approve a draft before making a publication record.','add-publication','Plan post')}`}
function outcomes(){const published=state.publications.filter(p=>p.status==='published');return `${heading('Outcomes','Record outcome','add-outcome')}<div class="metrics"><div><strong>${published.length}</strong><small>Published records</small></div><div><strong>${state.outcomes.filter(o=>o.type==='enquiry').length}</strong><small>Enquiries logged</small></div><div><strong>${state.outcomes.filter(o=>o.type==='conversation').length}</strong><small>Conversations logged</small></div></div><p class="lead">Record actual replies and enquiries. Attribution may be direct, self-reported, inferred, or unknown.</p>${state.outcomes.length?state.outcomes.map(o=>card(o.title,o.notes||'',`${o.type||'Outcome'} · ${o.attribution||'unknown attribution'} · ${date(o.createdAt)}`,btn('Edit','edit-outcome',o.id),tag(o.qualified?'Qualified':'Not qualified / unknown',!o.qualified))).join(''):empty('No outcomes logged','Record a meaningful conversation or inbound enquiry when it happens.','add-outcome','Record outcome')}`}
function settings(){let s=state.settings;return `${heading('Identity & workspace')}<div class="panel" style="max-width:650px"><form id="settings-form"><div class="field"><label for="setting-name">Your public name</label><input id="setting-name" name="name" value="${esc(s.name)}"></div><div class="field"><label for="setting-brand">Company backing</label><input id="setting-brand" name="brand" value="${esc(s.brand)}"></div><div class="field"><label for="setting-audience">Primary audience</label><input id="setting-audience" name="audience" value="${esc(s.audience)}"></div><div class="field"><label for="setting-language">Language</label><input id="setting-language" name="language" value="${esc(s.language)}"></div><div class="field"><label for="setting-url">Enquiry destination URL</label><input id="setting-url" name="inquiryUrl" type="url" value="${esc(s.inquiryUrl)}"></div><button class="button primary">Save settings</button></form></div>${heading('Data & access')}<div class="panel" style="max-width:650px"><p>All workspace records are stored in <code>data/workspace.json</code>; uploaded images are stored in <code>data/assets</code>. Back up this folder regularly.</p><p>The server listens only on 127.0.0.1. No social accounts or paid AI API are connected.</p></div>`}
function strategy(){return heading('Strategy journal')+'<p class="lead">Research-driven experiments, with evidence and a record of what changed. Performance is unknown until measured.</p>'+((state.strategies||[]).map(s=>card(s.title,s.summary+'\n\nNext experiment: '+s.experiment+'\n\nEvidence: '+s.evidence+'\n\nChange rationale: '+s.rationale,date(s.createdAt),'',tag(s.status||'hypothesis',true))).join('')||empty('Research is building the baseline','Strategy updates will appear here with their evidence and next experiment.'));}
function reviewPanel(stage, review, productionId) {
  const timeline = stage === 'timeline';
  const title = timeline ? 'Proposed timeline' : 'Finished video';
  if (!review) return `<h3>${title}</h3><p>Waiting for a preview.</p>`;
  const status = { pending: 'Awaiting your review', approved: 'Approved', 'changes-requested': 'Changes requested' }[review.status];
  const details = timeline ? `<pre>${esc(review.notes)}</pre>` :
    `<p>${esc(review.platform === 'x' ? 'X' : 'Instagram')} · ${esc(review.account)} · ${esc(new Date(review.publishAt).toLocaleString())}</p><pre>${esc(review.caption || 'No caption')}</pre>`;
  return `<h3>${title} · v${review.version}</h3>
    <p>${esc(status)}${review.approvedAt ? ' · '+esc(new Date(review.approvedAt).toLocaleString()) : ''}</p>
    <video controls playsinline preload="metadata" style="display:block;max-width:100%;max-height:480px" src="/video/${esc(review.upload.filename)}"></video>
    ${details}${review.creative ? `<details><summary>Skills used for this edit</summary><p>${review.creative.skills.map(s => esc(s.name)).join(', ')}</p><pre>${esc(review.creative.caption)}</pre></details>` : ''}${review.feedback ? `<p>Requested changes</p><pre>${esc(review.feedback)}</pre>` : ''}
    ${review.status === 'pending' ? `<div class="card-actions">${btn(timeline ? 'Approve timeline' : 'Approve for publishing', 'video-approve-'+stage, productionId, 'primary')}${btn('Request changes', 'video-feedback-'+stage, productionId)}</div>` : ''}`;
}
function production() {
  return heading('Your recording queue', 'New video brief', 'video-new') +
    `<div class="card-actions">${btn('Refresh queue','video-refresh','')}</div>` +
    ((state.productions || []).map(p => {
      const work = state.videoWork[p.id];
      const timeline = work?.timelines.at(-1);
      const latestFinal = work?.finals.at(-1);
      const recordings = (work?.uploads || []).filter(u => u.purpose === 'recording');
      const finished = work?.render?.timelineId === timeline?.id ? work?.render : undefined;
      const final = latestFinal?.timelineId === timeline?.id && (!latestFinal?.renderId || latestFinal.renderId === finished?.id) ? latestFinal : undefined;
      const job = work?.job;
      const busy = ['queued','running'].includes(job?.status);
      return `<article class="panel" style="margin-bottom:18px">
        <h2>${esc(p.title)}</h2><p>${esc(p.objective)}</p>
        <details open><summary>Recording brief</summary>
          <h3>Assets requested</h3><p>${esc(p.assets)}</p>
          <h3>Setup</h3><p>${esc(p.setup)}</p>
          <h3>Shot list & narration</h3><pre>${esc(p.shots)}</pre>
          <h3>Editing instructions</h3><p>${esc(p.edit)}</p>
        </details>
        <h3>Recordings and asset notes</h3>
        ${recordings.length ? `<ul>${recordings.map(u => `<li><a href="/video/${esc(u.filename)}" download="${esc(u.name)}">${esc(u.name)}</a></li>`).join('')}</ul>` : '<p>No recordings uploaded.</p>'}
        ${work?.intake?.notes ? `<pre>${esc(work.intake.notes)}</pre>` : ''}
        ${!busy ? btn('Upload recordings and start rough cut', 'video-intake', p.id) : ''}
        ${busy ? `<p role="status">${job.status === 'queued' ? 'Queued' : 'Processing'} · ${job.type === 'rough' ? 'Rough cut and transcription' : 'Captions and finished export'}</p>` : ''}
        ${job?.status === 'failed' ? `<p role="alert">Editing stopped: ${esc(job.error)}</p>${btn('Retry edit','video-retry',p.id)}` : ''}
        ${reviewPanel('timeline', timeline, p.id)}
        ${!busy && timeline?.automated ? btn('Revise shot order or trims', 'video-revise', p.id) : ''}
        ${timeline?.status === 'approved' && finished ? `<h3>Finished export</h3>
          <video controls playsinline preload="metadata" style="display:block;max-width:100%;max-height:480px" src="/video/${esc(finished.upload.filename)}"></video>
          <p><a download="finished.mp4" href="/video/${esc(finished.upload.filename)}">Download MP4</a></p>
          <div class="card-actions">${!busy ? btn('Correct captions', 'video-captions', p.id)+btn('Add publishing details', 'video-stage-final', p.id) : ''}
          ${!busy && !finished.approvedAt ? btn('Approve finished export', 'video-accept-render', p.id) : ''}</div>
          ${finished.approvedAt ? `<p>Export approved · ${esc(new Date(finished.approvedAt).toLocaleString())}</p>` : ''}` : ''}
        ${timeline?.status === 'approved' && (final || !finished) ? reviewPanel('final', final, p.id) : ''}
        ${final?.status === 'approved' ? '<p>Approved for publishing. Publishing is handled separately.</p>' : ''}
        <details><summary>Prepare a version for review</summary>
          <div class="card-actions">${btn('Submit timeline preview', 'video-stage-timeline', p.id)}${timeline?.status === 'approved' ? btn('Submit finished video', 'video-stage-final', p.id) : ''}</div>
        </details>
        ${work && work.timelines.length + work.finals.length > 0 ? `<details><summary>Review history</summary><ul>${
          [['Timeline', work.timelines], ['Finished video', work.finals]].flatMap(([label, versions]) =>
            versions.map(v => `<li>${label} v${v.version} · ${v.status === 'approved' ? 'Approved '+esc(new Date(v.approvedAt).toLocaleString()) : v.status === 'changes-requested' ? 'Changes requested' : 'Submitted'}${v.feedback ? ' · '+esc(v.feedback) : ''}</li>`)
          ).join('')
        }</ul></details>` : ''}
      </article>`;
    }).join('') || empty('No recording briefs yet', 'Create a brief to collect recordings and review video versions.'));
}
async function uploadProductionVideo(id, purpose, file) {
  const params = new URLSearchParams({ purpose, name: file.name });
  const res = await fetch(`/api/productions/${encodeURIComponent(id)}/video-upload?${params}`, {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file
  });
  const out = await res.json();
  if (!res.ok) throw new Error(out.error);
  return out;
}
function videoAction(name, id) {
  if (name === 'video-refresh') return refresh().catch(error => notify(error.message, true));
  const route = 'productions/'+id+'/video-review';
  const work = state.videoWork[id];
  const timeline = work?.timelines.at(-1);
  const final = work?.finals.at(-1);
  const stage = name.endsWith('-final') ? 'final' : 'timeline';
  const save = async (route, input) => {
    await mutate(route, 'POST', input);
    $('#modal').close();
    notify('Saved to the workspace');
  };
  if (name === 'video-retry') {
    return mutate(route, 'POST', { action: 'retry-job', jobId: work.job.id }).catch(() => {});
  }
  if (name === 'video-revise') {
    const sources = timeline.sourceIds.map((filename, i) =>
      `${i + 1}. ${work.uploads.find(upload => upload.filename === filename)?.name || filename}`).join('\n');
    const cuts = timeline.cuts.map(({ clip, start, end }) => `${clip} ${start.toFixed(3)} ${end.toFixed(3)}`).join('\n');
    return modal('Revise the timeline', 'VIDEO REVIEW', `<pre>${esc(sources)}</pre>
      <p>Each line is a shot. Enter recording number, start seconds and end seconds. Put the lines in playback order.</p>`+
      field('Shots', 'cuts', cuts, 'textarea'),
      form => save(route, { action: 'revise-timeline', reviewId: timeline.id, cuts: new FormData(form).get('cuts') }));
  }
  if (name === 'video-captions' || name === 'video-accept-render') {
    const finished = work.render;
    if (name === 'video-captions') {
      return modal('Correct captions', 'VIDEO REVIEW',
        '<p>Edit the text and preserve the numbers and timestamps. Saving renders a new version.</p>'+
        field('Captions', 'captions', finished.srt, 'textarea'),
        form => save(route, { action: 'revise-captions', renderId: finished.id, captions: new FormData(form).get('captions') }));
    }
    return modal('Approve finished export', 'VIDEO REVIEW',
      '<p>Save approval of this MP4. Publishing approval is recorded separately with the posting details.</p>',
      () => save(route, { action: 'approve-render', renderId: finished.id }));
  }
  if (name === 'video-new') {
    return modal('New video brief', 'RECORDING BRIEFS',
      field('Title','title')+field('Topic and goal','objective','','textarea')+
      field('Assets requested','assets','','textarea')+field('Recording setup','setup','','textarea')+
      field('Shot list and narration','shots','','textarea')+field('Editing instructions','edit','','textarea'),
      form => {
        const input = Object.fromEntries(new FormData(form));
        if (!input.title.trim()) throw new Error('Enter a title');
        return save('productions', input);
      });
  }
  if (name === 'video-intake') {
    const recordings = (work?.uploads || []).filter(upload => upload.purpose === 'recording');
    return modal('Start rough cut', 'RECORDING BRIEFS',
      '<div class="field"><label for="video-file">Recordings (MP4, MOV or WebM)</label><input id="video-file" type="file" accept=".mp4,.mov,.webm" multiple></div>'+
      `<p>Only include footage cleared for this edit.</p>
      <label><input type="checkbox" name="creative" checked style="width:auto"> Use Codex creative review</label>
      <p>Uses your signed-in Codex allowance to review transcripts and sampled frames with the installed video-script and quality-review skills. With this option off, clips stay in order and long pauses are trimmed.</p>
      <div id="recording-options">${recordings.map(upload =>
        `<label style="display:block"><input type="checkbox" style="width:auto" name="recording" value="${esc(upload.filename)}"> ${esc(upload.name)}</label>`).join('')}</div>`+
      field('Selected assets and what can appear publicly', 'notes', work?.intake?.notes || '', 'textarea'),
      async form => {
        const notes = new FormData(form).get('notes');
        const files = [...$('#video-file').files];
        for (const file of files) {
          const uploaded = await uploadProductionVideo(id, 'recording', file);
          $('#recording-options').insertAdjacentHTML('beforeend', `<label style="display:block"><input checked type="checkbox" style="width:auto" name="recording" value="${esc(uploaded.filename)}"> ${esc(uploaded.name)}</label>`);
        }
        $('#video-file').value = '';
        const sourceIds = new FormData(form).getAll('recording');
        if (!sourceIds.length) throw new Error('Upload or select at least one recording');
        await save(route, { action: 'save-intake', notes, sourceIds, startEdit: true, creative: new FormData(form).has('creative') });
      });
  }
  if (name.startsWith('video-stage-')) {
    const pending = (work?.uploads || []).filter(u => u.purpose === 'review');
    const generated = stage === 'final' && work?.render?.timelineId === timeline?.id ? work?.render : undefined;
    const existing = pending.length ? field('Or select a saved MP4','filename',generated?.upload.filename || '','select',[
      ['','Choose a saved file'], ...pending.map(u => [u.filename, u.name+' · '+new Date(u.createdAt).toLocaleString()])
    ]) : '';
    const details = stage === 'timeline' ? field('Shot order, trims and edit notes','notes','','textarea') :
      field('Platform','platform','instagram','select',[['instagram','Instagram'],['x','X']])+
      field('Publishing account','account')+field('Posting time (local)','publishAt','','datetime-local')+
      field('Exact caption','caption',timeline?.creative?.caption || '','textarea');
    return modal(stage === 'timeline' ? 'Submit timeline preview' : 'Submit finished video', 'VIDEO REVIEW',
      '<div class="field"><label for="video-file">Upload MP4</label><input id="video-file" type="file" accept=".mp4"></div>'+existing+details,
      async form => {
        const input = Object.fromEntries(new FormData(form));
        if (stage === 'timeline' && !input.notes.trim()) throw new Error('Add shot order and edit notes');
        if (stage === 'final') {
          if (!input.account.trim() || !input.publishAt) throw new Error('Enter the account and posting time');
          input.publishAt = new Date(input.publishAt).toISOString();
        }
        const file = $('#video-file').files[0];
        if (file) {
          const upload = await uploadProductionVideo(id, 'review', file);
          input.filename = upload.filename;
          // Preserve the upload reference if staging fails and the form is retried.
          $('#video-file').value = '';
          let saved = form.elements.namedItem('filename');
          if (!saved) {
            form.insertAdjacentHTML('beforeend', '<input type="hidden" name="filename">');
            saved = form.elements.namedItem('filename');
          }
          if (saved instanceof HTMLSelectElement) saved.add(new Option(upload.name, upload.filename));
          saved.value = upload.filename;
        }
        if (!input.filename) throw new Error('Choose an MP4 for review');
        await save(route, { ...input, action: 'stage-'+stage, timelineId: timeline?.id });
      });
  }
  const review = stage === 'timeline' ? timeline : final;
  if (name.startsWith('video-approve-')) {
    return modal(stage === 'timeline' ? 'Confirm timeline approval' : 'Confirm publishing approval', 'VIDEO REVIEW',
      `<p>Save your approval for version ${review.version} of ${esc(get('productions', id).title)}.</p>`,
      () => save(route, { action: 'approve', stage, reviewId: review.id }));
  }
  if (name.startsWith('video-feedback-')) {
    return modal('Request changes to version '+review.version, 'VIDEO REVIEW',
      field('What should change?', 'feedback', '', 'textarea'),
      form => save(route, { action: 'request-changes', stage, reviewId: review.id, feedback: new FormData(form).get('feedback') }));
  }
}
const views={today,projects,research,ideas,studio,calendar,outcomes,settings,strategy,production};
function render(){document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('#page-title').textContent={strategy:'Strategy',production:'Recording briefs',today:'Overview',projects:'Projects',research:'Research',ideas:'Ideas',studio:'Studio',calendar:'Calendar',outcomes:'Outcomes',settings:'Settings'}[page];$('#today-date').textContent=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});$('#content').innerHTML=views[page]();$('#search')?.addEventListener('input',e=>{query=e.target.value;let start=e.target.selectionStart;render();$('#search')?.focus();$('#search')?.setSelectionRange(start,start)});$('#settings-form')?.addEventListener('submit',async e=>{e.preventDefault();await mutate('settings','PUT',Object.fromEntries(new FormData(e.target)));notify('Settings saved')})}
async function refresh(){state=await api('state');render()}
function field(label,name,value='',type='text',options){const id='f-'+name;return `<div class="field"><label for="${id}">${label}</label>${type==='textarea'?`<textarea id="${id}" name="${name}">${esc(value)}</textarea>`:type==='select'?`<select id="${id}" name="${name}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select>`:`<input id="${id}" name="${name}" type="${type}" value="${esc(value)}">`}</div>`}
const selectProject=val=>field('Project','projectId',val,'select',[['','Choose a project'],...state.projects.map(p=>[p.id,p.name])]);
const selectIdea=val=>field('Idea','ideaId',val,'select',[['','Choose an idea'],...state.ideas.map(i=>[i.id,i.title])]);
const selectDraft=val=>field('Approved draft','draftId',val,'select',[['','Choose a draft'],...state.drafts.filter(d=>d.approvedAt).map(d=>[d.id,(get('ideas',d.ideaId)?.title||'Draft')+' / '+d.platform])]);
const evidenceChecks=selected=>`<div class="field"><label>Supporting evidence (must be approved for public use)</label>${state.evidence.length?state.evidence.map(e=>`<label style="display:flex;gap:9px;align-items:center;text-transform:none;letter-spacing:0"><input style="width:auto" type="checkbox" name="evidenceIds" value="${esc(e.id)}" ${(selected||[]).includes(e.id)?'checked':''}>${esc(e.title)} ${e.publicUse==='approved'?'✓':'(private/pending)'}</label>`).join(''):'<span class="hint">Add evidence first.</span>'}</div>`;
function modal(title,kicker,html,save){$('#modal-title').textContent=title;$('#modal-kicker').textContent=kicker;$('#modal-fields').innerHTML=html;modalSave=save;$('#modal').showModal()}
function formData(form){const out=Object.fromEntries(new FormData(form));out.evidenceIds=[...form.querySelectorAll('[name=evidenceIds]:checked')].map(x=>x.value);return out}
function openForm(resource,entityId,seed){const item=entityId?get(resource,entityId):seed||{};const edit=!!entityId;let html='';
if(resource==='projects')html=field('Project name','name',item.name)+field('Type','type',item.type||'Internal tool','select',[['Internal tool','Internal tool'],['Demo site','Demo site'],['Client project','Client project'],['Experiment','Experiment']])+field('Current status','status',item.status||'In use internally')+field('What it does / actual state','description',item.description,'textarea')+field('Public use','publicUse',item.publicUse||'pending','select',[['pending','Needs review'],['approved','Approved for public use'],['private','Private']]);
if(resource==='evidence')html=selectProject(item.projectId||'')+field('Evidence title','title',item.title)+field('Kind','kind',item.kind||'Observation','select',[['Observation','Observation'],['Screenshot','Screenshot'],['Build note','Build note'],['Measurement','Measurement'],['Source','External source']])+field('What actually happened / what it shows','details',item.details,'textarea')+field('Source URL (optional)','sourceUrl',item.sourceUrl,'url')+field('Public use','publicUse',item.publicUse||'pending','select',[['pending','Needs review'],['approved','Approved for public use'],['private','Private']])+`<div class="field"><label for="asset-file">Image (optional; PNG/JPEG/WebP, 5 MB max)</label><input id="asset-file" type="file" accept="image/png,image/jpeg,image/webp"></div>`;
if(resource==='research')html=field('Source / account','title',item.title)+field('Platform','platform',item.platform||'X','select',[['X','X'],['Instagram','Instagram'],['Website','Website'],['Other','Other']])+field('Source URL','sourceUrl',item.sourceUrl,'url')+field('Exact observation','observation',item.observation,'textarea')+field('Access level','access',item.access||'link only','select',[['link only','Link only'],['inspected','Content inspected'],['inaccessible','Inaccessible']]);
if(resource==='ideas')html=field('Idea title','title',item.title)+selectProject(item.projectId||'')+field('Buyer problem','problem',item.problem,'textarea')+field('Original angle','angle',item.angle,'textarea')+field('Pillar','pillar',item.pillar||'Builder','select',[['Builder','Builder'],['Founder','Founder'],['Operator','Operator']])+evidenceChecks(item.evidenceIds);
if(resource==='drafts')html=selectIdea(item.ideaId||'')+field('Platform','platform',item.platform||'x','select',[['x','X'],['instagram','Instagram']])+field('Format','format',item.format||'Standalone post','select',[['Standalone post','Standalone post'],['Thread','Thread'],['Carousel','Carousel'],['Reel outline','Reel outline']])+field('Draft copy / slide lines','content',item.content,'textarea')+field('Visual / recording notes','visualNotes',item.visualNotes,'textarea')+evidenceChecks(item.evidenceIds);
if(resource==='publications')html=selectDraft(item.draftId||'')+field('Planned date and time','plannedAt',item.plannedAt?.slice(0,16)||'','datetime-local')+field('Live URL (leave empty until published)','url',item.url,'url')+field('Notes','notes',item.notes,'textarea');
if(resource==='outcomes')html=field('Title','title',item.title)+field('Type','type',item.type||'enquiry','select',[['enquiry','Enquiry'],['conversation','Conversation']])+field('Attribution','attribution',item.attribution||'unknown','select',[['unknown','Unknown'],['direct','Direct link'],['self-reported','Self reported'],['inferred','Inferred']])+field('Related publication','publicationId',item.publicationId||'','select',[['','None'],...state.publications.map(p=>[p.id,(get('ideas',get('drafts',p.draftId)?.ideaId)?.title||'Post')+' / '+p.platform])])+field('Qualified?','qualified',String(item.qualified||false),'select',[['false','No / unknown'],['true','Yes']])+field('Notes','notes',item.notes,'textarea');
modal(edit?'Edit '+resource.slice(0,-1):'Add '+resource.slice(0,-1),'WORKSPACE RECORD',html,async form=>{let input=formData(form);if(resource==='outcomes')input.qualified=input.qualified==='true';if(resource==='evidence'){const file=$('#asset-file')?.files[0];if(file){const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});const asset=await api('assets','POST',{data});input.assetUrl=asset.url;}}if(resource==='drafts'&&edit){input.claims=item.claims||[]}await mutate(`${resource}${edit?'/'+entityId:''}`,edit?'PUT':'POST',input);$('#modal').close();notify('Saved')});}
function openDraft(id){const d=get('drafts',id);const idea=get('ideas',d.ideaId);modal('Edit draft','STUDIO / '+d.platform.toUpperCase(),`<div class="warning">Editing creates a new version and clears approval. Resolve every factual claim before approval.</div>${field('Copy','content',d.content,'textarea')}${field('Visual / recording notes','visualNotes',d.visualNotes,'textarea')}${evidenceChecks(d.evidenceIds)}<div class="preview"><small>${esc(d.platform.toUpperCase())} / ${esc(d.format||'POST')}</small><strong>${esc((d.content||'').split('\n')[0].slice(0,140))}</strong><small>${esc(state.settings.name||'FOUNDER')} · ${esc(state.settings.brand)}</small></div>`,async form=>{const input=formData(form);await mutate('drafts/'+id,'PUT',{...input,claims:d.claims||[]});$('#modal').close();notify('New draft version saved')})}
function claims(id){let d=get('drafts',id);const html=`<p class="lead">Add every personal, quantified, or client claim here. Mark confirmed only after checking its evidence. Remove unsupported claims from the draft copy too.</p><div id="claim-list">${(d.claims||[]).map((c,i)=>`<div class="field"><label>Claim ${i+1}</label><textarea data-claim="${i}">${esc(c.text)}</textarea><select data-status="${i}"><option value="unresolved" ${c.status==='unresolved'?'selected':''}>Unresolved</option><option value="confirmed" ${c.status==='confirmed'?'selected':''}>Confirmed</option><option value="removed" ${c.status==='removed'?'selected':''}>Removed</option></select></div>`).join('')}</div><button type="button" class="button ghost" id="new-claim">+ Add claim</button>`;modal('Review claims','FACT CHECK',html,async()=>{const list=[...document.querySelectorAll('[data-claim]')].map(e=>({text:e.value,status:document.querySelector(`[data-status="${e.dataset.claim}"]`).value})).filter(c=>c.text.trim());await mutate('drafts/'+id,'PUT',{claims:list});$('#modal').close();notify('Claim review saved')});$('#new-claim').onclick=()=>{let i=document.querySelectorAll('[data-claim]').length;$('#claim-list').insertAdjacentHTML('beforeend',`<div class="field"><label>Claim ${i+1}</label><textarea data-claim="${i}"></textarea><select data-status="${i}"><option value="unresolved">Unresolved</option><option value="confirmed">Confirmed</option><option value="removed">Removed</option></select></div>`)};}
function wrapLines(ctx,text,width){const lines=[];for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){lines.push(line);line=word}else line=next}lines.push(line||' ')}return lines}
async function exportSlides(id){const res=await fetch('/api/export/'+id);if(!res.ok)throw new Error((await res.json()).error);const draft=get('drafts',id);const slides=draft.content.split(/^---$/m).map(s=>s.trim()).filter(Boolean);if(!slides.length)throw new Error('Add slide copy first');if(slides.length>12)throw new Error('Use at most 12 slides');for(let i=0;i<slides.length;i++){const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext('2d');ctx.fillStyle='#e9eee5';ctx.fillRect(0,0,1080,1080);ctx.fillStyle='#233b2d';ctx.fillRect(0,0,1080,14);ctx.font='700 31px Arial';ctx.fillText((state.settings.brand||'EXPANDR').toUpperCase(),82,100);ctx.font='600 62px Arial';let lines=wrapLines(ctx,slides[i],900);if(lines.length>10)throw new Error('Slide '+(i+1)+' has too much text. Shorten it before export.');let y=290;ctx.fillStyle='#19251d';for(const line of lines){ctx.fillText(line,82,y);y+=82}ctx.fillStyle='#66806b';ctx.font='27px Arial';ctx.fillText(`${i+1} / ${slides.length}`,82,1000);ctx.fillText(state.settings.name||'Founder',790,1000);const url=canvas.toDataURL('image/png');const a=document.createElement('a');a.href=url;a.download=`carousel-${id.slice(0,8)}-${String(i+1).padStart(2,'0')}.png`;a.click();await new Promise(r=>setTimeout(r,120))}notify(`${slides.length} slide image(s) exported`)}
async function action(name,id){try{if(name==='research-run'){await mutate('research-cycle','POST',{});return notify('Research queued')}if(name.startsWith('add-'))return openForm(({ 'add-project':'projects','add-evidence':'evidence','add-research':'research','add-idea':'ideas','add-draft':'drafts','add-publication':'publications','add-outcome':'outcomes'})[name],null,name==='add-evidence'?{projectId:id}:name==='add-draft'?{ideaId:id}:{});if(name.startsWith('edit-'))return openForm(({ 'edit-project':'projects','edit-evidence':'evidence','edit-research':'research','edit-idea':'ideas','edit-publication':'publications','edit-outcome':'outcomes'})[name],id);if(name==='open-draft')return openDraft(id);if(name==='claims')return claims(id);if(name==='approve'){await mutate('drafts/'+id+'/approve','POST',{});return notify('Current version approved')}if(name==='brief'){let out=await api('brief/'+id);return modal('Generation brief','IDEA / EVIDENCE',`<pre>${esc(out.text)}</pre><button type="button" class="button" id="copy-brief">Copy brief</button>`,async()=>{$('#modal').close()})}if(name==='export-slides')return exportSlides(id);if(name==='export'){const res=await fetch('/api/export/'+id);if(!res.ok)throw new Error((await res.json()).error);const text=await res.text();const blob=new Blob([text],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='approved-'+id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return notify('Approved copy exported')}}catch(e){notify(e.message,true)}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b){if(b.dataset.action.startsWith('video-'))videoAction(b.dataset.action,b.dataset.id);else action(b.dataset.action,b.dataset.id)}if(e.target.id==='copy-brief'){navigator.clipboard.writeText($('#modal-fields pre').textContent).then(()=>notify('Brief copied'))}});
$('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b)return;page=b.dataset.page;query='';history.replaceState(null,'','#'+page);render()});
$('#quick-capture').onclick=()=>{page='projects';render();openForm(state.projects.length?'evidence':'projects')};
$('#close-modal').onclick=$('#cancel-modal').onclick=()=>$('#modal').close();
$('#modal-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const submit = e.submitter || e.target.querySelector('[type=submit]');
  if (!modalSave || submit?.disabled) return;
  if (submit) submit.disabled = true;
  try { await modalSave(e.target); } catch (error) { notify(error.message, true); }
  finally { if (submit) submit.disabled = false; }
});
if (Object.hasOwn(views, location.hash.slice(1))) page = location.hash.slice(1);
refresh().catch(e=>notify(e.message,true));
setInterval(async () => {
  if (!['production','research'].includes(page) || !state || document.hidden || $('#modal').open || [...document.querySelectorAll('video')].some(v => !v.paused)) return;
  try {
    const next = await api('state');
    if (!$('#modal').open &&
        (page === 'production' ?
          (JSON.stringify(next.videoWork) !== JSON.stringify(state.videoWork) || JSON.stringify(next.productions) !== JSON.stringify(state.productions)) :
          (JSON.stringify(next.researchJob) !== JSON.stringify(state.researchJob) || JSON.stringify(next.researchRuns) !== JSON.stringify(state.researchRuns)))) {
      state = next;
      render();
    }
  } catch { /* The dashboard will retry when the server is reachable. */ }
}, 3500);
