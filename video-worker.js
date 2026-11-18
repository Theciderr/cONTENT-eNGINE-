import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { planCreativeEdit } from './creative-editor.js';

const exec = promisify(execFile);
const ffmpeg = process.env.CONTENT_FFMPEG || 'ffmpeg';
const ffprobe = process.env.CONTENT_FFPROBE || 'ffprobe';
const vtc = process.env.CONTENT_VTC || (process.platform === 'win32'
  ? path.join(process.env.USERPROFILE, '.local', 'bin', 'vtc.exe') : 'vtc');

async function command(tool, args, cwd) {
  try {
    return await exec(tool, args, { cwd, windowsHide: true, timeout: 60 * 60 * 1000, maxBuffer: 4 * 1024 * 1024 });
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Cannot find ${path.basename(tool)}. Check the local editing tools and restart the app.`);
    const detail = (error.stderr || error.stdout || error.message).trim().split(/\r?\n/).slice(-5).join(' ');
    throw new Error(`${path.basename(tool)}: ${detail.slice(-1200)}`);
  }
}

const encode = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-movflags', '+faststart'];
const frame = 'scale=1080:1920:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x14151b,setsar=1,fps=30';
const render = (cwd, args) => command(ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', ...args], cwd);

async function probe(file, cwd) {
  const { stdout } = await command(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file], cwd);
  const data = JSON.parse(stdout);
  const duration = Number(data.format?.duration);
  if (!data.streams?.some(s => s.codec_type === 'video') || !Number.isFinite(duration) || duration <= 0) {
    throw new Error('The recording needs a readable video track and duration.');
  }
  return { duration, audio: data.streams.some(s => s.codec_type === 'audio') };
}

async function automaticRanges(file, media, cwd) {
  if (!media.audio) return [[0, media.duration]];
  const { stderr } = await command(ffmpeg, ['-nostdin', '-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'silencedetect=n=-38dB:d=1.5', '-f', 'null', '-'], cwd);
  const ranges = [];
  let cursor = 0;
  let silenceStart;
  for (const match of stderr.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    const time = Number(match[2]);
    if (match[1] === 'start') {
      silenceStart = time;
      if (time + 0.3 > cursor + 0.2) ranges.push([cursor, Math.min(media.duration, time + 0.3)]);
    } else {
      cursor = Math.max(0, time - 0.3);
      silenceStart = undefined;
    }
  }
  if (silenceStart === undefined && media.duration > cursor + 0.1) ranges.push([cursor, media.duration]);
  return ranges.length ? ranges : [[0, media.duration]];
}

function stamp(seconds) {
  return new Date(Math.max(0, Math.round(seconds * 1000))).toISOString().slice(11, 23).replace('.', ',');
}

async function rough(job, uploads, videoDir, cwd) {
  const recordings = job.sourceIds.map(filename => uploads.find(upload => upload.filename === filename));
  const files = await Promise.all(recordings.map(async (upload, i) => {
    if (!upload) throw new Error('A selected recording is missing.');
    const file = path.join(videoDir, upload.filename);
    return { number: i + 1, upload, file, ...await probe(file, cwd) };
  }));
  const cuts = [];
  let creative;
  const sourceSegments = new Map();
  async function transcriptFor(source) {
    if (!source.audio) return [];
    if (sourceSegments.has(source.number)) return sourceSegments.get(source.number);
    const cacheDir = path.join(videoDir, 'transcripts');
    await fs.mkdir(cacheDir, { recursive: true });
    const cache = path.join(cacheDir, source.upload.sha256 + '-base-en.json');
    let segments;
    try {
      segments = JSON.parse(await fs.readFile(cache, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const sourceName = `source${source.number}.mp4`;
      await fs.copyFile(source.file, path.join(cwd, sourceName));
      await command(vtc, ['transcribe', sourceName, '--edit-dir', 'edit', '--model', 'base.en', '--device', 'cpu', '--compute-type', 'int8', '--language', 'en'], cwd);
      const transcript = JSON.parse(await fs.readFile(path.join(cwd, 'edit', 'transcripts', `source${source.number}.json`), 'utf8'));
      segments = transcript.segments.map(({ start, end, text }) => ({ start, end, text }));
      await fs.writeFile(cache, JSON.stringify(segments));
    }
    sourceSegments.set(source.number, segments);
    return segments;
  }
  if (job.creative && !job.cuts?.length) {
    const sources = [];
    const frames = [];
    for (const source of files) {
      let segments = [{ start: 0, end: source.duration, text: 'Silent footage' }];
      if (source.audio) {
        segments = await transcriptFor(source);
      }
      if (!segments.length) segments = [{ start: 0, end: source.duration, text: 'No speech detected' }];
      sources.push({ clip: source.number, name: source.upload.name, duration: source.duration, segments });
      if (frames.length < 8) {
        const frameFile = `source${source.number}.jpg`;
        await render(cwd, ['-ss', String(Math.min(2, source.duration / 2)), '-i', source.file, '-frames:v', '1', '-vf', 'scale=640:-2', frameFile]);
        frames.push(frameFile);
      }
    }
    creative = await planCreativeEdit({ sources, frames, brief: job.brief, cwd });
  }
  const selectedCuts = job.cuts || creative?.cuts;
  if (selectedCuts?.length) {
    for (const { clip, start, end } of selectedCuts) {
      const source = files[clip - 1];
      if (!source || end > source.duration + 0.04) throw new Error(`Check the times for recording ${clip}. Its duration is ${source?.duration.toFixed(2) ?? 'unavailable'} seconds.`);
      cuts.push({ source, start, end: Math.min(end, source.duration) });
    }
  } else {
    for (const source of files) {
      for (const [start, end] of await automaticRanges(source.file, source, cwd)) cuts.push({ source, start, end });
    }
  }
  const parts = [];
  for (const [index, { source, start, end }] of cuts.entries()) {
    const part = `clip-${index}.mp4`;
    const duration = (end - start).toFixed(4);
    await render(cwd, [
      '-ss', String(start), '-i', source.file,
      ...source.audio ? [] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'],
      '-t', duration, '-map', '0:v:0', '-map', source.audio ? '0:a:0' : '1:a:0',
      '-vf', frame, '-af', 'aresample=48000,apad', ...encode, part
    ]);
    parts.push(part);
  }
  await fs.writeFile(path.join(cwd, 'clips.txt'), parts.map(part => `file '${part}'`).join('\n'));
  await render(cwd, ['-f', 'concat', '-safe', '1', '-i', 'clips.txt', '-c', 'copy', '-movflags', '+faststart', 'rough.mp4']);
  const cues = [];
  let recordStart = 0;
  for (const { source, start, end } of cuts) {
    for (const segment of await transcriptFor(source)) {
      const cueStart = Math.max(start, segment.start);
      const cueEnd = Math.min(end, segment.end);
      if (cueEnd > cueStart + 0.08 && segment.text?.trim()) {
        cues.push({ start: recordStart + cueStart - start, end: recordStart + cueEnd - start, text: segment.text });
      }
    }
    recordStart += end - start;
  }
  const srt = cues.map((s, i) => `${i + 1}\n${stamp(s.start)} --> ${stamp(s.end)}\n${s.text.trim()}\n`).join('\n');
  const notes = cuts.map(({ source, start, end }, i) =>
    `${i + 1}. ${source.upload.name} · ${start.toFixed(2)}–${end.toFixed(2)} s`).join('\n');
  return {
    file: 'rough.mp4', srt, creative,
    cuts: cuts.map(({ source, start, end }) => ({ clip: source.number, start, end })),
    notes: `9:16 · Original framing preserved\n\n${creative ? creative.summary+'\n\nReview notes\n'+creative.reviewNotes+'\n\n' : ''}${notes}\n\n${cues.length ? 'Proposed captions:\n' + cues.map(s => s.text.trim()).join('\n') : 'No speech captions detected.'}`
  };
}

async function finish(timeline, videoDir, cwd, captions) {
  const source = path.join(videoDir, timeline.upload.filename);
  const filters = [];
  const srt = captions ?? timeline.srt;
  if (srt) {
    await fs.writeFile(path.join(cwd, 'captions.srt'), srt, 'utf8');
    filters.push("subtitles=captions.srt:force_style='FontName=Arial,FontSize=14,Outline=2,Alignment=2,MarginV=35'");
  }
  await render(cwd, ['-i', source, ...filters.length ? ['-vf', filters.join(',')] : [],
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', ...encode, 'finished.mp4']);
  return { file: 'finished.mp4', srt };
}

export async function processVideoJob({ job, work, videoDir }) {
  const cwd = await fs.mkdtemp(path.join(videoDir, 'job-'));
  try {
    const result = job.type === 'rough' ? await rough(job, work.uploads, videoDir, cwd) :
      await finish(work.timelines.find(t => t.id === job.timelineId), videoDir, cwd, job.captions);
    const output = path.join(cwd, result.file);
    const checked = await probe(output, cwd);
    const filename = randomUUID() + '.mp4';
    const sha256 = createHash('sha256');
    for await (const chunk of (await fs.open(output, 'r')).createReadStream()) sha256.update(chunk);
    const size = (await fs.stat(output)).size;
    await fs.rename(output, path.join(videoDir, filename));
    return { ...result, upload: { filename, name: result.file, size, sha256: sha256.digest('hex'), duration: checked.duration, purpose: 'review', createdAt: new Date().toISOString() } };
  } finally {
    try { await fs.rm(cwd, { recursive: true, force: true }); }
    catch (error) { console.error('Could not clean up temporary video files:', error.message); }
  }
}
