# Automated production workflow

The owner supplies exact asset selections, recordings, approvals, and personal facts when needed. The assistant performs research, strategy updates, briefs, assembly, and preparation.

## Active

- A Codex source scout checks accessible Instagram and X sources at 09:30 Asia/Kolkata and saves direct observations in the app when available. The local app checks saved public sources daily after 10:00 AM while running. It records access gaps, creates a strategy experiment and at most two recording briefs when inputs change, and exposes job status in Research.
- Strategy journal and Recording briefs views backed by persistent strategies and productions collections.
- First recording brief requests asset types, exact shots, framing, narration, capture instructions, and edit direction. It is a proposal, not permission to use any specific asset.

Scheduled Codex work depends on the app/runtime being available and the account allowance. It is not a hosted always-on service.

## Production contract

Research → strategy experiment → recording brief → owner selects assets → recordings received → proposed timeline / rough assembly → owner approves timeline version → full editing, captions, sound, color and export → owner approves exact render/caption/account/time → publishing → timestamped performance snapshots → strategy learning.

Use **Recording briefs** to upload selected footage and start a rough cut. The local worker keeps clips in upload order, trims long quiet sections, and transcribes the result. Review the preview and captions in the dashboard. Use **Revise shot order or trims** to change the cuts. Timeline approval queues a finished export with captions and adjusted audio levels. The app shows job status and offers a retry if a job fails.

The worker runs while the local server is running. It uses FFmpeg, ffprobe, and Video Timeline Copilot with the local English Whisper model. Use only clips you can show as recorded. Asset notes are saved for review and do not instruct the worker to apply visual masks or make creative edits. Direct DaVinci control, social publishing, and analytics connections remain pending.

The finished file can be downloaded or submitted for publishing approval with its exact caption, platform, account, and posting time. Changes to the timeline or the generated render require review of the current version.

## Creative review in the app

The recording submission form includes **Use Codex creative review**, enabled by default. This uses the local Codex CLI's existing ChatGPT login and its usage allowance. It sends transcripts, the brief, and up to eight sampled frames to Codex. It loads the installed `social-short-video-script` and `social-quality-auditor` instructions into one structured planning request.

The worker caches source transcripts by file hash and transcription model. It validates the returned segment references and time bounds before rendering. The proposal, suggested caption, review notes, skill names and skill hashes are saved with the timeline. The dashboard exposes these under the review. Manual trim revisions use the selected times directly. The finished render uses the approved timeline.

Codex runs with a read-only sandbox and a five-minute request timeout. Login, quota, dependency and invalid-proposal failures appear in the dashboard for retry. The option can be turned off for the existing upload-order cut. Research and strategy generation now run in the app. Publishing and direct DaVinci control remain separate integration work.

A strategy entry contains evidence, uncertainty, experiment, and change rationale. Competitor engagement is context, not proof of inbound sales. Source ideas are adapted with original evidence and writing.

Every recording brief includes purpose, platform, format, hook, exact shots and duration, narration, camera/screen framing, audio setup, asset types, masking needs, edit notes, deliverables, and approval checkpoint.

## Pending connections

- The owner will create Instagram and X accounts and supply their details later. Account setup, publishing and tracking remain pending. Do not repeatedly request handles; continue research and production preparation independently.
- Instagram professional-account publishing eligibility must be verified through supported Meta access.
- Direct X API is paid per usage: https://docs.x.com/x-api/getting-started/pricing . It remains disabled under the current zero-additional-spend constraint. A supported free scheduler route has not been verified.
- DaVinci Resolve installed. Local developer scripting README describes Studio and requires Resolve to be running. Edition, scripting access, successful timeline import, and rendering must be verified with owner-selected assets before claiming automated editing works.
- Tracking remains unconnected until accounts and metric permissions are available. Never record missing metrics as zero.

Final publication approval must bind the exact rendered file hash, copy version, account, and time. Editing any of those requires review again. Retry only after checking whether a previous publishing attempt succeeded. Research automation never carries implicit publishing authorization.
