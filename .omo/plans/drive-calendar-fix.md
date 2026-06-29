# drive-calendar-fix - Work Plan

## TL;DR (For humans)
**What you'll get:** The first screen will be an attendance board with no Google Calendar events, and the score tab will reliably list files from the configured Google Drive folder with clear setup, empty, and error messages.

**Why this approach:** Calendar removal is enforced at the data contract, visible labels, and deployed asset layers. Drive handling is kept identical between local development and Netlify, while cache controls ensure the browser receives the corrected app.

**What it will NOT do:** It will not restore Google Calendar access, delete attendance or checkboard data, make the Drive folder public, or redesign unrelated parts of the app.

**Effort:** Medium
**Risk:** Medium - final proof depends on the real Netlify OAuth token and configured Drive folder.
**Decisions to sanity-check:** Keep Drive OAuth read-only; show all non-folder files in the selected folder; retain the existing seven-member attendance data.

Your next move: explicitly start execution when this plan should be applied. Full execution detail follows below.

---

> TL;DR (machine): Medium effort, medium risk; remove Calendar-derived contracts and UI, harden Drive listing/preview/error states, prevent stale assets, then verify locally and on Netlify.

## Scope
### Must have
- `GET /api/bootstrap` and `GET /api/month` expose attendance data only: no Calendar ID, event collection, event title, or Google Calendar API result.
- The primary tab and month heading use attendance language (`참석표`, `월간 참석표`), while the seven-member date counts, color levels, and member toggles continue to work.
- Google OAuth requests only `https://www.googleapis.com/auth/drive.readonly`.
- `GOOGLE_DRIVE_FOLDER_ID` accepts a raw folder ID, a Drive folder URL, or a pasted `GOOGLE_DRIVE_FOLDER_ID=...` value.
- Netlify and the local server list up to 200 non-folder files from the configured folder, including shared-drive folders, and return consistent file metadata and preview URLs.
- The score tab differentiates disconnected Google, missing folder ID, empty folder, Drive API failure, refresh failure, and populated folder states.
- Static assets are served with explicit freshness controls so a previous Calendar-enabled `app.js` cannot remain visible after deployment.
- README and setup text describe the attendance board and Drive-only Google integration accurately.
- Local syntax/API/browser checks and a production Netlify browser check create evidence before completion is claimed.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Must not add Calendar OAuth scopes, Calendar API requests, `/api/events`, event mutation forms, event chips, or event arrays to day cells.
- Must not delete or rewrite `availability`, `songs`, `notices`, Google OAuth token data, or unrelated Netlify Blob state.
- Must not require the Drive folder to be public or replace OAuth with an API key.
- Must not expose `GOOGLE_CLIENT_SECRET`, access tokens, refresh tokens, or the band access code in browser responses or evidence.
- Must not make unrelated visual redesigns, change the seven members, or alter song/notice behavior.
- Must not rely on a user manually clearing the browser cache.
- Must not commit `.omo/`, local `.env`, `data/token.json`, screenshots outside the agreed evidence location, or unrelated dirty-worktree changes.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after using the existing `npm run check` syntax gate, deterministic HTTP assertions against the local Node server, source-contract scans with `rg`, and real browser QA at phone/tablet/desktop widths. No new test framework is introduced for this small JavaScript app.
- Local API assertions must parse JSON and verify field absence as well as field presence; a grep-only result is not sufficient.
- Drive integration uses two levels of evidence: deterministic local states for disconnected/missing-folder/error presentation, followed by a connected production Netlify check for a real folder listing and file preview.
- Browser QA must exercise the app, not merely capture the initial page: select a day, toggle one member and restore the original value, switch to 악보, refresh, open one score when available, enter/exit reader mode, and confirm no console/page errors.
- Evidence: Todos 1-7 write to the exact `.omo/evidence/task-1-drive-calendar-fix...` through `.omo/evidence/task-7-drive-calendar-fix...` paths named below; screenshots use `.png`, API/source assertions use `.txt`, and final reviews use `.md`.

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.
- Wave 1 (contract and implementation, parallel where files do not overlap): Todos 1-4.
- Wave 2 (integrated local verification): Todos 5-6 after Todos 1-4.
- Wave 3 (release and live verification): Todo 7 after local gates pass.
- Final wave: F1-F4 run after Todo 7; every reviewer must approve before completion.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | None | 5, 6 | 2, 3, 4 |
| 2 | None | 3, 5, 6 | 1, 4 |
| 3 | 2 contract | 5, 6 | 1, 4 after contract is fixed |
| 4 | None | 5, 6, 7 | 1, 2, 3 |
| 5 | 1, 2, 3, 4 | 7 | 6 |
| 6 | 1, 2, 3, 4 | 7 | 5 |
| 7 | 5, 6 | F1-F4 | None |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [ ] 1. Remove Google Calendar residue from every shipped contract and visible label
  What to do / Must NOT do: In both backends, keep month generation limited to `date`, `availability`, `availableCount`, and `capacityClass`; remove any legacy Calendar ID/event loading or event mutation route that reappears. In the frontend, render only attendance counts/toggles and use `참석표`/`월간 참석표` copy. Update README's feature wording from a rehearsal calendar to an attendance board. Internal CSS/JS identifiers such as `calendarGrid` may remain because they describe the month grid and are not Google Calendar integration. Do not delete legacy keys from stored Blob/local JSON state; excluding them from responses and rendering is sufficient.
  Parallelization: Wave 1 | Blocked by: None | Blocks: 5, 6
  References (executor has NO interview context - be exhaustive): `netlify/functions/api.mjs:46-95`, `netlify/functions/api.mjs:279-307`, `server.mjs:94-148`, `server.mjs:339-368`, `public/app.js:44-56`, `public/app.js:81-134`, `public/app.js:388-400`, `public/index.html:13-60`, `README.md:3-14`.
  Acceptance criteria (agent-executable): `rg -n -i "GOOGLE_CALENDAR|calendar\\.googleapis|calendar\\.events|/api/events|eventForm|event-chip|cell\\.events|Google Calendar|구글 캘린더" netlify public server.mjs README.md .env.example` returns no match; a parsed local `/api/bootstrap` response has no `calendarId` or `events` key at any depth; every non-empty day has exactly attendance fields plus `date`, `day`, `empty`, and `isToday`; availability toggle still returns the updated count.
  QA scenarios (name the exact tool + invocation): Happy - start `node server.mjs` on an unused port, use a Node HTTP assertion script to fetch `/api/bootstrap` and `/api/month`, toggle one member through `/api/availability`, assert the count changes, then restore it; Evidence `.omo/evidence/task-1-drive-calendar-fix.txt`. Failure - seed a disposable local state copy with a legacy `events` key and prove it is absent from both API responses and page text; Evidence `.omo/evidence/task-1-drive-calendar-fix-legacy-state.txt`.
  Commit: N | Included in the final atomic fix commit.

- [ ] 2. Make Drive folder parsing and listing consistent in Netlify and local development
  What to do / Must NOT do: Keep `netlify/functions/api.mjs` and `server.mjs` behavior in parity. Normalize a raw ID, `/folders/<id>` URL, `?id=<id>` URL, or pasted environment assignment. Return an empty list without calling Google when the folder value is absent. Query direct children with `trashed = false`, exclude folders, request `supportsAllDrives` and `includeItemsFromAllDrives`, order by name, and cap the result at 200. Preserve the single `drive.readonly` OAuth scope and do not add write permissions or public sharing.
  Parallelization: Wave 1 | Blocked by: None | Blocks: 3, 5, 6
  References (executor has NO interview context - be exhaustive): `netlify/functions/api.mjs:137-157`, `netlify/functions/api.mjs:192-277`, `netlify/functions/api.mjs:460-484`, `server.mjs:191-210`, `server.mjs:274-337`, `server.mjs:497-531`, `.env.example:3-6`, `README.md:16-37`.
  Acceptance criteria (agent-executable): Both backends use the same folder-normalization rules, Drive query, fields, shared-drive flags, ordering, page size, MIME labels, and preview rules; missing folder configuration produces `[]` without a Google request; OAuth authorization URLs contain `drive.readonly` and no Calendar scope; `npm run check` passes.
  QA scenarios (name the exact tool + invocation): Happy - use a deterministic Node harness with a stubbed Google response containing PDF, PNG, Google Doc, Slides, Sheet, and another non-folder type, then assert stable name ordering metadata and preview URLs; Evidence `.omo/evidence/task-2-drive-calendar-fix.txt`. Failure - run the same harness with blank folder input, a full folder URL, `GOOGLE_DRIVE_FOLDER_ID=<id>`, a rejected Drive response, and a folder item; assert blank skips Google, URL/assignment normalize to the same ID, rejection is preserved as a Drive error, and folders are absent; Evidence `.omo/evidence/task-2-drive-calendar-fix-errors.txt`.
  Commit: N | Included in the final atomic fix commit.

- [ ] 3. Complete score-list states and preview behavior
  What to do / Must NOT do: Keep one explicit frontend state for each condition: Google disconnected, folder ID missing, connected folder empty, bootstrap Drive failure, manual refresh failure, and populated list. Reset stale refresh errors on a successful bootstrap or refresh. Render every API error with HTML escaping. Map each file to a button, set the iframe title and escaped preview URL, and make reader mode enter/exit without losing the active file. Change the viewer placeholder so it does not claim only PDF/image support when the backend lists other Drive file types. Do not display secrets, raw token data, or raw HTML from Google errors.
  Parallelization: Wave 1 | Blocked by: Todo 2 contract | Blocks: 5, 6
  References (executor has NO interview context - be exhaustive): `public/app.js:1-78`, `public/app.js:136-189`, `public/app.js:226-260`, `public/app.js:378-385`, `public/app.js:411-420`, `public/app.js:454-475`, `public/index.html:62-85`, `public/styles.css` score-list/viewer/reader-focus rules.
  Acceptance criteria (agent-executable): Each state produces unique Korean guidance in `#fileList`; a successful refresh clears a prior error; an error containing `<script>` renders as text; selecting a file creates exactly one titled iframe with the expected preview URL; reader mode toggles and returns to the same selected file; no layout text says that only PDF/image files are supported.
  QA scenarios (name the exact tool + invocation): Happy - run the local app with a fixture bootstrap containing two files, use the in-app browser to open 악보, select each file, toggle reader mode twice, and assert active selection/title/iframe remain correct; Evidence `.omo/evidence/task-3-drive-calendar-fix.png` plus `.omo/evidence/task-3-drive-calendar-fix.txt`. Failure - intercept `/api/bootstrap` and `/api/scores` success/error variants in the browser harness for all six states, including an HTML-shaped error string, and assert the exact safe empty/error state; Evidence `.omo/evidence/task-3-drive-calendar-fix-errors.txt`.
  Commit: N | Included in the final atomic fix commit.

- [ ] 4. Guarantee fresh assets and align setup/deployment documentation
  What to do / Must NOT do: Version `styles.css` and `app.js` references in `public/index.html`; add equivalent `no-cache, no-store, must-revalidate` static responses in Netlify and the local server; leave API redirects and OAuth callback routes unchanged. Update README to name only Drive API setup, the five Netlify variables, the callback URL, and the one-time Google connection. Do not cache-bust by asking users to clear browser storage and do not add Calendar configuration.
  Parallelization: Wave 1 | Blocked by: None | Blocks: 5, 6, 7
  References (executor has NO interview context - be exhaustive): `public/index.html:3-10`, `netlify.toml:1-27`, `server.mjs:430-443`, `README.md:16-69`, `.env.example:1-6`.
  Acceptance criteria (agent-executable): HTML references versioned CSS/JS; local responses for `/`, `/app.js`, and `/styles.css` and deployed Netlify responses include freshness headers that prevent reuse of stale Calendar-era assets; README and `.env.example` contain Drive/OAuth variables but no Calendar API, Calendar ID, or Calendar scope instructions; redirects still resolve `/api/*`, `/auth/google`, and `/oauth2callback`.
  QA scenarios (name the exact tool + invocation): Happy - fetch local and deployed headers with `curl -I` (or Node `fetch` when HEAD is unsupported), then fetch HTML and assert the versioned asset URLs return 200; Evidence `.omo/evidence/task-4-drive-calendar-fix.txt`. Failure - request a deliberately old/unversioned asset URL and prove current response headers prevent long-lived reuse; compare fetched production HTML to the expected asset version; Evidence `.omo/evidence/task-4-drive-calendar-fix-stale-asset.txt`.
  Commit: N | Included in the final atomic fix commit.

- [ ] 5. Run integrated source, syntax, and HTTP regression checks
  What to do / Must NOT do: Run the repository's actual build gate and deterministic HTTP assertions after Todos 1-4. Verify both positive attendance behavior and negative Calendar absence. Verify score setup/empty/error payloads without recording secrets. Do not treat a successful process exit alone as proof; save the assertions and relevant sanitized response shapes.
  Parallelization: Wave 2 | Blocked by: 1, 2, 3, 4 | Blocks: 7
  References (executor has NO interview context - be exhaustive): `package.json:6-10`, `server.mjs:61-188`, `public/app.js:12-50`, `.omo/drafts/drive-calendar-fix.md`.
  Acceptance criteria (agent-executable): `npm run check` exits 0; `git diff --check` exits 0; forbidden Calendar scan exits with no matches; local `/api/bootstrap`, `/api/month`, `/api/availability`, and `/api/scores` scenarios satisfy the assertions from Todos 1-3; captured evidence contains no client secret, access token, refresh token, or band access code.
  QA scenarios (name the exact tool + invocation): Happy - run `npm run check`, `git diff --check`, the forbidden-source scan, and a Node HTTP smoke script against an isolated port; save command, exit code, and assertion summary; Evidence `.omo/evidence/task-5-drive-calendar-fix.txt`. Failure - intentionally point the smoke script at an unused port and at a malformed fixture, prove it exits nonzero with a useful assertion, then rerun the valid case; Evidence `.omo/evidence/task-5-drive-calendar-fix-failure-control.txt`.
  Commit: N | No commit until browser QA also passes.

- [ ] 6. Exercise the corrected app on phone, tablet, and desktop surfaces
  What to do / Must NOT do: Start the local app on an unused port and use the in-app browser/Playwright at 390x844, 820x1180, and 1440x900. Interact with attendance and score flows, inspect console/page errors, and capture screenshots. Restore any availability value changed during the test. Do not accept screenshots with clipped Korean text, horizontal page overflow, hidden tabs, overlapping controls, or a blank iframe container.
  Parallelization: Wave 2 | Blocked by: 1, 2, 3, 4 | Blocks: 7
  References (executor has NO interview context - be exhaustive): `public/index.html:12-138`, `public/styles.css`, `public/app.js:39-189`, `public/app.js:226-260`, `public/app.js:348-420`.
  Acceptance criteria (agent-executable): All three viewports show `참석표`, `악보`, `체크보드`; month cells contain only day/count UI; selecting a date shows seven members; toggling and restoring one member updates the count; all score states are readable; reader mode uses the available screen and exits; console and page error collections are empty; document width does not exceed viewport width.
  QA scenarios (name the exact tool + invocation): Happy - browser automation performs the full attendance and score journey at all three viewports and saves screenshots plus DOM assertions; Evidence `.omo/evidence/task-6-drive-calendar-fix-mobile.png`, `.omo/evidence/task-6-drive-calendar-fix-tablet.png`, `.omo/evidence/task-6-drive-calendar-fix-desktop.png`, and `.omo/evidence/task-6-drive-calendar-fix.txt`. Failure - run a browser route with a synthetic Drive failure and assert a readable `드라이브 오류` state replaces the list without breaking tab navigation; Evidence `.omo/evidence/task-6-drive-calendar-fix-error.png`.
  Commit: N | No commit until the local gate is fully green.

- [ ] 7. Commit, push, and prove the Netlify production result
  What to do / Must NOT do: Re-read `git status` and stage only the product files intentionally changed by this plan. Create one atomic commit, push the intended GitHub branch, wait for the Git-linked Netlify deploy to succeed, then test the canonical Netlify URL. Use the configured Google account to confirm the real Drive folder lists at least one known score and opens its preview. Confirm fetched production bootstrap/month responses and visible UI have no Calendar residue. Do not stage `.omo/`, `.env`, token files, unrelated user changes, or amend an existing commit.
  Parallelization: Wave 3 | Blocked by: 5, 6 | Blocks: F1-F4
  References (executor has NO interview context - be exhaustive): `netlify.toml:1-27`, `README.md:47-69`, `.gitignore`, current `git status`, Netlify production URL recorded in deployment metadata or the existing site configuration.
  Acceptance criteria (agent-executable): The commit includes only agreed product files; push succeeds; Netlify reports a successful deploy for that commit; production HTML contains the expected asset version; production browser shows attendance-only month cells; the real Drive folder list loads and one file preview opens; no browser console/page error occurs; all secrets are redacted from evidence.
  QA scenarios (name the exact tool + invocation): Happy - use GitHub/Netlify status plus the in-app browser on the canonical site to refresh 악보, open a known file, enter/exit reader mode, and inspect bootstrap/month response shapes; Evidence `.omo/evidence/task-7-drive-calendar-fix-deploy.txt`, `.omo/evidence/task-7-drive-calendar-fix-production.png`, and `.omo/evidence/task-7-drive-calendar-fix-api.txt`. Failure - if deploy or Drive loading fails, capture the deploy ID/status and sanitized visible/API error, return to the owning todo, add a new corrective commit (never amend), redeploy, and rerun the full production scenario; Evidence `.omo/evidence/task-7-drive-calendar-fix-failure.txt`.
  Commit: Y | `fix(band-room): restore score loading without calendar residue`

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit - independently map every Must have/Must NOT have item to current source, command output, API response, or production evidence; reject missing or indirect proof. Evidence `.omo/evidence/final-f1-drive-calendar-fix.md`.
- [ ] F2. Code quality review - inspect the final diff for local/Netlify parity, escaped output, OAuth least privilege, secret leakage, dead Calendar paths, and unrelated changes; report severity-ordered findings or APPROVE. Evidence `.omo/evidence/final-f2-drive-calendar-fix.md`.
- [ ] F3. Real manual QA - rerun the production phone/tablet journey, including attendance toggle-and-restore and real Drive preview, without relying on Todo 7's screenshots; report APPROVE only with fresh evidence. Evidence `.omo/evidence/final-f3-drive-calendar-fix.md` and `.omo/evidence/final-f3-drive-calendar-fix.png`.
- [ ] F4. Scope fidelity - compare the final commit and deployed page against the user's request, proving Calendar removal, Drive score loading, attendance preservation, and no unrelated redesign/data deletion. Evidence `.omo/evidence/final-f4-drive-calendar-fix.md`.

## Commit strategy
- Keep the dirty worktree intact and never revert unrelated edits.
- Stage only the agreed product files after local verification: expected candidates are `netlify.toml`, `netlify/functions/api.mjs`, `public/app.js`, `public/index.html`, `server.mjs`, and documentation files changed by the plan.
- Exclude `.omo/`, `.env`, local tokens, `data/`, `qa/`, and unrelated modifications unless the user explicitly requests otherwise.
- Use one conventional commit: `fix(band-room): restore score loading without calendar residue`.
- Push only after Todos 5 and 6 pass. If the live deploy exposes a defect, create a separate corrective commit; never amend or force-push.

## Success criteria
- The deployed app's visible schedule surface is an attendance board with no event titles, event chips, Calendar setup copy, or Google Calendar-derived records.
- Production `/api/bootstrap` and `/api/month` responses contain attendance state and no Calendar ID/event payload.
- All seven members can still toggle availability; day counts and capacity colors update correctly.
- A connected Google account can list files from the configured Drive folder, refresh the list, and open at least one real score preview on phone/tablet.
- Disconnected, missing-folder, empty-folder, Drive-error, refresh-error, and populated-list states each display clear, safe guidance.
- Google OAuth requests only Drive read access, and no secret appears in client responses, logs, screenshots, or committed files.
- Current assets are served after deployment without requiring manual cache clearing.
- `npm run check`, `git diff --check`, deterministic HTTP assertions, responsive browser QA, and all four final reviewers pass.
- The final commit contains only planned product/documentation changes and the Netlify deploy for that commit is successful.
