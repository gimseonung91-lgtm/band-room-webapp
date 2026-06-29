---
slug: drive-calendar-fix
status: plan-complete
intent: clear
pending-action: wait for explicit execution command; do not edit product code in plan mode
approach: verify and finish the already-started fix for Drive score loading, stale calendar UI removal, and Netlify deployment/cache behavior before any commit/push.
---

# Draft: drive-calendar-fix

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
| C1 | Google Calendar residue is absent from server API, frontend render path, and deployed browser asset path. | active | public/app.js:81, public/index.html:8, netlify/functions/api.mjs:46 |
| C2 | Google Drive score loading returns useful files and visible errors rather than a silent empty state. | active | netlify/functions/api.mjs:207, netlify/functions/api.mjs:247, public/app.js:136 |
| C3 | Netlify deployment and browser cache cannot keep serving the old calendar-enabled app.js. | active | public/index.html:8, netlify.toml:6 |
| C4 | Real-surface QA proves the app users see has Attendance/악보 behavior and no calendar event chips. | active | pending browser evidence |

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->
| Cache strategy | Add cache-busting query strings for app assets and no-store headers for the small static app. | The reported symptom matches stale frontend JS after Calendar removal; the app is small enough that no-store is acceptable. | Yes |
| Drive file scope | List all non-folder files in the configured Drive folder instead of only PDF/JPG/PNG/Docs/Slides. | "악보 불러오기" should surface user-visible folder contents; unsupported types can still open in Drive preview or display as FILE. | Yes |
| Error language | Surface Drive errors in the 악보 tab and setup panel as explicit text. | Silent empty states are the current usability failure; visible error is safer while setup stabilizes. | Yes |
| Current dirty worktree | Treat current uncommitted product changes as an in-progress candidate fix, not as approved/shipped work. | ulw-plan was invoked after implementation had already begun; executor must inspect and validate rather than blindly commit. | Yes |

## Findings (cited - path:lines)
- Current source search found no `GOOGLE_CALENDAR`, Calendar OAuth scopes, Calendar API URL, `/api/events`, `eventForm`, `event-chip`, or `cell.events` references; direct grep returned no matches.
- `public/app.js:81-104` renders month cells from attendance data only; no event list is read.
- `netlify/functions/api.mjs:46-70` builds `/api/bootstrap` with `month: buildMonth(...)`, `scores`, and `googleErrors`; `setup` no longer includes `calendarId`.
- `netlify/functions/api.mjs:73-78` builds `/api/month` without Google calls.
- `netlify/functions/api.mjs:247-276` lists Drive folder files; current candidate broadens query to non-folder files and maps each file to preview metadata.
- `public/app.js:136-158` currently distinguishes score errors, Google-not-connected, missing Drive folder, empty folder, and populated file list.
- `public/index.html:8-9` currently adds versioned `/styles.css` and `/app.js`; this addresses likely stale browser/CDN JS.
- `netlify.toml:6-9` currently adds no-store headers for static routes.
- `npm run check` passed after the candidate changes.
- Dirty worktree exists: `netlify.toml`, `netlify/functions/api.mjs`, `public/app.js`, `public/index.html`, `server.mjs`, plus `.omo/` plan artifacts.
- Explorer report confirmed no surviving Google Calendar API integration in target files; remaining "calendar" code is the app's own attendance grid (`public/app.js`, `public/index.html`, `server.mjs`, `netlify/functions/api.mjs`).
- Explorer report flagged Drive weak points: missing `GOOGLE_DRIVE_FOLDER_ID` returns `[]`, disconnected Google suppresses Drive loading, bootstrap soft-fails to empty scores plus error, while `/api/scores` can hard-fail.
- Explorer report flagged cache risk: asset versioning is manual (`public/index.html:8-9`), Netlify no-store exists in candidate change (`netlify.toml:6-10`), and local static serving lacks equivalent headers.

## Decisions (with rationale)
- Intent route: CLEAR. The user wants a specific fix: score loading must work and prior Google Calendar-derived UI must disappear.
- Tier: HEAVY. The plan touches external Google Drive/OAuth behavior, Netlify deployment/cache behavior, and browser UI.
- Topology lock: four components, C1-C4 above, because backend API, Drive loading, deployment/cache, and browser QA can each fail independently.
- Test strategy: tests-after plus mandatory real-surface QA. The bug is integration/UI/deployment-shaped; a useful plan must include API checks and browser evidence in addition to syntax checks.
- Commit strategy: one atomic `fix(band-room): restore score loading without calendar residue` commit only after full QA passes.

## Scope IN
- Remove or prevent every user-visible Google Calendar event residue in the shipped app.
- Ensure the schedule surface is explicitly an attendance board, preserving attendance counts and member toggles.
- Make Drive score loading more reliable for the configured folder and expose actionable errors when it fails.
- Force fresh frontend assets on Netlify so users do not keep seeing old calendar-enabled JavaScript.
- Verify locally and against the deployed Netlify URL after push.

## Scope OUT (Must NOT have)
- Must not reintroduce Google Calendar OAuth scopes, Calendar API calls, `/api/events`, or calendar event creation.
- Must not delete existing attendance, song, notice, or Google token state as a hidden workaround.
- Must not require the user to manually clear browser cache for the fix to work.
- Must not replace Drive OAuth with public-folder-only access unless the user explicitly chooses that product change.
- Must not broaden into a redesign beyond labels/error states needed for the bug.

## Open questions
None blocking. Recommended default is to proceed with the candidate direction above. The only user-owned choice is optional: whether to run high-accuracy plan review before execution.

## Approval gate
status: approved-for-plan-generation
approval evidence: the user subsequently invoked the execution loop for this named plan, which necessarily approved generating the plan; this record does not authorize further product-code edits during the current planning-only goal.
pending action: wait for `$start-work`, `$ulw-loop`, or another explicit execution command before product-code changes.
brief: Finish the bug fix by validating/refining the current candidate changes, prove the old calendar UI is not served anymore, prove Drive loading/error states through API and browser surfaces, then commit/push only after evidence is captured.
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
