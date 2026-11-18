# Installed skills and available capabilities

Initial setup completed on 17 November 2026. Additional skills were installed on 18 November 2026 after the owner requested them. Product implementation has since started; see the README for its actual status.

## Newly installed

Source: [OpenAI's curated skills repository](https://github.com/openai/skills/tree/main/skills/.curated), installed using the bundled skill-installer helper with Git transport.

| Skill | Purpose | Installation directory |
|---|---|---|
| pdf | Create, extract, and visually review PDF content assets | `C:/Users/Tanish Yadav/.codex/skills/pdf` |
| screenshot | Capture screen-based evidence and visual assets | `C:/Users/Tanish Yadav/.codex/skills/screenshot` |
| playwright | Browser workflows and later application testing | `C:/Users/Tanish Yadav/.codex/skills/playwright` |
| security-best-practices | Security guidance for the later application | `C:/Users/Tanish Yadav/.codex/skills/security-best-practices` |

Verified that all four directories contain SKILL.md and their packaged files. Skills are instruction/helper packages, not proof that every optional runtime dependency is installed. No separate browser binary, Python dependency bundle, paid service, or social-platform connection was installed in this step. Additional runtime setup can be performed when a concrete implementation task needs it.

## Relevant capabilities already available

The session already lists ECC skills for deep research, market research, content engines, brand voice, article writing, social publishing, browser QA, and security review. Image generation and computer-use capabilities are also already available. These were not newly installed during this task.

Existing skills do not establish API entitlement, background execution, social account access, or permission to publish. Research access and publishing routes still require the checks described in the product plan.

## Added on 18 November 2026

Editing additions: `davinci-resolve-editor` from [DaVinci-AutoEdit-Agent](https://github.com/liuluhaixiu/DaVinci-AutoEdit-Agent), pinned to `93cf371fad21900a2d475b57daa84c380560183f`, and `video-editing-skill` from [social-media-skills](https://github.com/social-media-skills/video-editing-skill), pinned to `f94d0517d717de281ee23569094aac616d32f4ef`. Both installed with packaged files. The former requires a verified Resolve Studio MCP/API connection; the latter uses local FFmpeg/Pillow and optional local transcription. Neither installation establishes working runtime dependencies or a tested editing pipeline. Its optional WoopSocial onboarding and paid API routes are not activated; existing user account plans, budget, and two approval gates take priority. The separate `davinci-autoedit-agent` was not installed because its many additional approval stages duplicate existing workflow and conflict with the desired minimal user involvement.

Second installation: six skills from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills), pinned to commit `73573e94a06a39965978b3fa1f9c1eace8cebc7c`: `competitor-profiling`, `reverse-engineer-marketing`, `content-strategy`, `marketing-loops`, `analytics`, and `attribution`. All six SKILL.md files and packaged references were verified after installation. No paid data service or account connection was activated.

Use these for dated competitor observations, public-content teardowns, evidence-based strategy proposals, recurring-run state and deduplication, measurement plans, and linking enquiries to content. The existing owner preferences override generic skill defaults: zero paid calls, Instagram/X first, no unsolicited outreach, owner-selected assets, timeline approval before full editing, and final approval before publishing. Public research can proceed autonomously; missing data stays unknown. These instruction packages do not themselves implement scheduled execution, platform APIs, or video rendering.

Source: [namddp/social-media-agent-skills](https://github.com/namddp/social-media-agent-skills) (MIT). Installed and verified: `social-brand-voice`, `social-source-miner`, `social-repurposer`, `social-platform-adapter`, `social-carousel-storyboard`, `social-short-video-script`, `social-content-calendar`, and `social-quality-auditor`. These are offline instruction workflows for evidence-backed drafting, platform adaptation, recording scripts, calendars, and review. They do not publish or access social accounts.

Source: [ludmila-omlopes/video-timeline-copilot](https://github.com/ludmila-omlopes/video-timeline-copilot) (MIT). Its `video-timeline-copilot` skill is installed and its files verified. Its separate `vtc` helper CLI is **not installed**; editable timeline generation, local transcription, and Resolve handoff have not been verified. The skill can use FCPXML for Resolve Free once its helper dependencies are set up.

The official speech and transcription skills were reviewed but not installed because they require paid OpenAI API access, contrary to the current zero-additional-spend budget. A Resolve 21.1 skill was also reviewed but not installed because it depends on Resolve Studio MCP and is written for a different setup. These choices do not change the pending social integrations described in `06-production-automation.md`.
