# Proposed system structure

Status: the first local release is implemented in `server.js` and `web/`. The structure below remains a longer-term architecture proposal; this release uses a dependency-free Node server and JSON file persistence. See the root README for current functionality and limits.

## 1. Architecture

Use a local-first modular monolith: one web application, SQLite as the initial storage candidate, and local asset storage. Add a durable job runner when an actual automation requires it. Keep business logic separate from UI and provider clients. Do not begin with microservices or independent autonomous agents.

The supplied Next.js/React, TypeScript, Tailwind, and relational database preference is a reasonable candidate, subject to deployment confirmation. The confirmed zero-additional-spend budget favors the local pilot; PostgreSQL remains a later hosted candidate. Select one at implementation time; do not promise transparent portability or choose package versions before verifying current documentation.

```text
src/
  app/                     routes, screens, server entry points
  components/              shared accessible UI
  modules/
    profile/               audience, offer, voice, disclosure policy
    projects/              work records and build observations
    evidence/              sources, claims, excerpts, permissions
    research/              reference intake and optional connectors
    opportunities/         angles, eligibility, ranking rationale
    studio/                drafts, revisions, platform adaptations
    review/                questions, confirmations, approvals
    visuals/               templates, previews, exports
    calendar/              planned dates and publication records
    outcomes/              snapshots, conversations, enquiries
  ai/                      provider interface and task contracts
  jobs/                    durable execution and retries
  integrations/            source/platform adapters
  storage/                 database and asset access
  config/                  validated server configuration
tests/                     critical workflow and contract tests
docs/                      product, architecture, setup, decisions
```

This tree is a proposal; the folders need not be scaffolded before implementation.

## 2. Data model

| Record | Essential fields and relationships |
|---|---|
| Profile | audience, offer, pillars, preferences, voice examples, version |
| Project | name, type, status, description, disclosure boundaries |
| Observation | project, owner statement, date, actual vs hypothetical, confirmation |
| Source | URL/import, author, platform, published/retrieved dates, excerpt, access status |
| Evidence | project/source/observation references, type, public-use state, limitations |
| Asset | storage reference, type, owner, disclosure state, redaction state, alt text |
| Claim | statement, factual/opinion/personal/quantified type, supporting evidence, review status |
| Idea | target audience, problem, angle, pillar, evidence links, ratings, status |
| Story | selected thesis and approved factual basis; parent of platform drafts |
| DraftVersion | story, platform, format, exact content, claim links, assets, parent version |
| Question | affected claim/draft, missing fact, answer, answered by/at, resolution |
| Approval | draft version, exact asset versions, approver, timestamp, scope |
| Publication | draft version, platform/account, planned/actual time, URL, status, confirmation method |
| MetricSnapshot | publication, metric, value, units, observed at, data source |
| Outcome | conversation/enquiry, publication links, qualification, attribution method, notes |
| JobRun | task, input version, status, attempts, usage, error, output reference |

An owner confirmation supports a personal account but is not an independently measured result. Quantified claims need the underlying measurement and its context. A repository proves implementation details, not commercial success.

## 3. State and approval rules

Use separate lifecycles instead of one overloaded content status:

- Idea: inbox → needs evidence/ready → selected or archived.
- Draft: working → needs confirmation or review ready → approved; edits create a new working version.
- Publication: planned → awaiting manual publish → published or cancelled. Add scheduled/publishing/failed states only with an actual publisher integration.

Approval references an immutable draft and asset version. Editing copy, changing slides, or repurposing for another platform requires new approval. Approval of one post never authorizes later variants or automatic replies.

The owner wants approval-triggered automation after an initial manual period. For the MVP, planned is not scheduled externally. Mark published only after the owner records publication, with a live URL when available. An export alone is not proof of publication.

## 4. AI pipeline

1. Extract a structured summary from selected evidence; retain source references.
2. Propose a few distinct story angles, each with a reason and evidence requirements.
3. Identify missing claims and create targeted owner questions.
4. Draft from the selected angle, confirmed evidence, and voice profile.
5. Flag unsupported statements, stale facts, prohibited disclosure, and style issues.
6. Adapt the reviewed story for the selected platform.
7. Generate visual layout instructions if needed.

Each task returns structured output including evidence IDs, claims, unresolved questions, and warnings. Validate schema before storage. A model's self-assessed confidence must not override an unresolved fact.

Initially support assistant-operated task packets and validated result imports during active sessions. The assistant, not the owner, owns preparation and transfer of work; the owner sees review packets. This session-assisted mode is not an unattended API backend. Do not simulate background AI execution. Add one automated provider adapter only when supported access is verified within the budget, with configurable models by task. Record model/prompt/input versions and token usage where available. Reuse unchanged extraction outputs. Configure per-run limits, bounded retries, and cancellation; no endless agent loops. Additional operating budget is zero; paid API calls must stay disabled by default.

Treat imported text as untrusted content, never as instructions to the system. Fetch URLs through a restricted server path that rejects local/private network targets and rechecks redirects. Keep provider keys server-side, redact logs, and explicitly select what source material may be sent to a provider. Private project content stays excluded from public output until cleared.

Authentication is required before any hosted private workspace is exposed. Add backups, restore verification, asset access controls, and deletion behavior before depending on the system for daily work.

## 5. Integration policy

Start with owner-entered URLs, notes, screenshots, and pasted permitted excerpts. Every connector exposes available capabilities, access state, last successful fetch, freshness, and failure state.

Evaluate RSS, GitHub, supported search, publishing services, and platform APIs separately during implementation. Confirm actual account access, needed permissions, price, quotas, retention rules, and fit for the requested operation. Reading, publishing, and analytics are distinct capabilities; access to one does not imply the others.

Never label a static or manually imported discovery as live/trending. Broad automated access to Instagram, X, Facebook, YouTube, or Reddit has not been validated for this user.

For the planned later approval-triggered publisher, require explicit account/platform/time/version authorization, duplicate protection, and reconciliation after ambiguous timeouts before retrying. Existing approval covers that exact authorized action; do not request it twice. Verify the zero-cost route and host availability before promising unattended operation.

## 6. Acceptance criteria

The first useful release must demonstrate these behaviors using a real project selected by the owner:

- Save an observation and screenshot, restart/reload, and retrieve both.
- Export a generation brief and import an idea whose supporting evidence can be inspected; automated generation is a later adapter.
- Ask for confirmation when a proposed claim asserts unverified usage, clients, or results.
- Block approval of unresolved essential claims; allow correcting or removing them.
- Produce genuinely distinct Instagram and X treatments of one story.
- Regenerate a section without overwriting the owner's latest saved edits.
- Invalidate approval after content or asset changes.
- Export readable assets and copy without silently publishing anything.
- Record publication and a manual metric snapshot without treating missing values as zero.
- Recover from provider failure with the draft intact and a clear retry action.
- Keep private assets and credentials out of exports, client bundles, and logs.

Test these workflow boundaries and data persistence. Use visual/manual checks for carousel readability and voice quality. AI technical/fact review is assistance, not proof; uncertain claims remain reviewable by the owner.
