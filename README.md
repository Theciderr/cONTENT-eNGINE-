# Founder Content Engine

A local workspace for turning real ExpandR work into evidence-backed Instagram and X content. It includes project capture, scheduled public-source research, strategy and recording briefs, an automated video queue, two-stage video approval, drafts, claim review, export, a planning calendar, and outcome records.

## Run

Requires Node.js 20 or newer. Research synthesis requires a signed-in local Codex CLI and the installed `social-source-miner`, `content-strategy`, and `social-short-video-script` skills. Video editing also requires FFmpeg, ffprobe, and Video Timeline Copilot. No paid API key is required.

```powershell
npm start
```

Open http://127.0.0.1:3187 in a browser. The server listens only on localhost. Stop it with Ctrl+C. If the port is in use, set `PORT` before starting.

```powershell
npm test
```

The test starts a temporary localhost server and may need local network permission in a restricted environment.

## First use

1. Open **Settings** and enter your public name and enquiry destination.
2. Add one real **Project** and describe its actual state. Mark public use only after checking what can be shown.
3. Add **Evidence** such as a build note, source URL, or screenshot. Approve public use only for safe material.
4. Review or add public URLs in **Research**. While the app is running, it checks up to six sources daily after 10 AM IST, then uses the signed-in Codex CLI to propose a strategy experiment and up to two recording briefs. Use **Run research now** for an immediate check. Unchanged sources and outcomes do not create duplicate briefs. A website observation is not evidence that an Instagram or X format performs well.
5. In **Recording briefs**, select actual footage, upload recordings, and review the rough timeline. Approve its exact version before the worker generates a captioned finished video. Review the finished render, caption, account, and time separately before publishing.
6. Prepare distinct **X** and **Instagram** drafts in **Studio**. Add claim review items for personal experiences, client outcomes, or measurements. Confirm or remove each claim.
7. Approve the exact draft version. An edit clears approval. Export is available only for the approved version. For Instagram carousels, separate slide copy with `---` on its own line and use **Export slides** to download PNGs.
8. Add a planned publication record. Record the live URL after publishing, then log meaningful conversations or enquiries under **Outcomes**.

The app stores data in `data/workspace.json`, images in `data/assets`, and videos in `data/video`. Back up the entire `data` folder. It is ignored by Git. Research and video jobs run only while the local app is running. The app has no hosted authentication or automatic social posting. It makes no claim of live Instagram/X monitoring. A plan entry is a local reminder, not a platform schedule.

Publishing and platform metrics require account setup and a verified supported connection. The owner will supply Instagram and X account details later.

## Planning documents

- [Product plan](docs/01-product-plan.md)
- [System structure](docs/02-system-structure.md)
- [Open decisions](docs/03-open-decisions.md)
- [Research and operator workflow](docs/04-research-and-operator-workflow.md)
- [Installed skills](docs/05-installed-skills.md)

