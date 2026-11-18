# Capability audit — 18 November 2026

Overall: local content-management MVP with assistant-operated planning capabilities. Not yet an autonomous production and publishing system.

## Verified

- Node app and JSON data store exist. `npm test` passed with localhost permission: one integration test covering evidence approvals, claim review, draft versions, export restrictions, and persistence. The earlier restricted-environment failure did not reproduce with this permission.
- Saved data: one project, one evidence record, one idea, two drafts, four website research references, one baseline strategy, and one production brief. No publications or outcomes.
- Seventeen added content/marketing/editing skills are installed, in addition to the earlier four utility skills. Skills are instructions and packaged helpers; installation does not connect services.
- Daily research heartbeat configuration is ACTIVE at 10:00 AM Asia/Calcutta. No dated research-run documents were found; current data still contains starter research only. Reliable recurring execution is unverified.
- Resolve executable version is 19.0.1.6. Edition and scripting connectivity remain unverified.

## Current limits

- No app listener detected on port 3187 during audit.
- Research and writing can be performed by the assistant using available tools. The local app has no connected model backend or native social-feed ingestion.
- Strategy and recording-brief pages store/display records. They do not independently generate or learn from performance.
- Image uploads exist; no video ingestion, media queue, timeline preview, or video approval state machine is implemented.
- Timeline and final-render approvals are operator instructions, not machine-enforced video gates. Text-draft approval is a separate implemented workflow.
- `ffmpeg`, `ffprobe`, `uv`, and `vtc` were not found on PATH. Previous editing setup check found Pillow and local transcription missing. Python 3.11 exists through MSYS2; the Windows `py` launcher reports no registered Python installations.
- No Resolve import/render or media end-to-end test has been completed.
- No publishing or analytics connectors. Calendar entries and outcomes are manual records, not platform jobs or automatic measurements.
- No demonstrated durable production worker, retry/recovery queue, duplicate-publication protection, or completed unattended content cycle.

## Implementation order

1. Install and verify a compatible local media toolchain; test using synthetic fixtures before owner-selected footage.
2. Implement production states and exact-version approvals: asset selection, rough timeline review, approved edit, final render/copy/account/time approval.
3. Add resumable work jobs and observable research runs; persist sources, failures, and strategy changes.
4. Verify publishing eligibility and supported access after the owner creates accounts; respect the zero-additional-spend constraint.
5. Connect timestamped performance collection and feed measured results into bounded strategy experiments.

This audit did not modify private assets, publish content, connect accounts, or install dependencies. Existing owner approvals and asset boundaries continue to apply.
