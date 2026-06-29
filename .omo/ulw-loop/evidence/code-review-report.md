# Band Room Code Review Report

Verdict: PASS with documented residual risk.

Scope reviewed:
- `public/index.html`
- `public/app.js`
- `netlify/functions/api.mjs`
- `server.mjs`
- `netlify.toml`

User-visible objective:
- Remove remaining visible Google Calendar residue.
- Keep the attendance grid and 7-member availability counts.
- Make Google Drive score loading clearer and broader.
- Confirm the build/check path is green.

Diff review:
- Calendar API paths are absent from the changed app/server code.
- The visible primary tab changed from `일정` to `참석표`, with the internal view id left unchanged to keep the patch narrow.
- Attendance cells still render `availableCount`, `capacityClass`, and selected-day member toggles.
- Score list rendering now has explicit branches for:
  - Google not connected
  - missing `GOOGLE_DRIVE_FOLDER_ID`
  - Drive API errors from `googleErrors`
  - empty Drive folder
  - populated file list
- `/api/bootstrap` catches Drive listing failures through `loadDriveData()` and reports them as `googleErrors`, so a Drive problem does not blank the whole app.
- Drive listing now includes all non-folder files in the configured folder, which fixes the overly narrow previous PDF/image/doc/slides-only filter.
- Google Sheets preview/label support is included because the broader file query can now return Sheets.
- Static asset URLs and Netlify/local static responses now reduce stale-cache risk.

Programming coverage:
- `npm.cmd run check` passed:
  - `node --check server.mjs`
  - `node --check netlify/functions/api.mjs`
- No lint/test failures were suppressed.
- `git diff --check` produced only Windows CRLF normalization warnings.

Remove-AI-slop / overfit review:
- No decorative or unrelated UI redesign was introduced.
- The patch keeps existing architecture and data stores.
- No new abstraction was added; the small helper `loadDriveData()` mirrors the Netlify/local split already present in the repo.
- The broader Drive query is intentionally general rather than hardcoding a guessed score-file extension list.
- Cache-busting uses explicit query strings plus no-cache headers; this is simple but not ideal long-term. A build-time asset hash would be cleaner in a future bundler-based build.

Security and privacy review:
- Google OAuth remains Drive-readonly only.
- Google Calendar scopes/routes were not reintroduced.
- Tokens are handled by the existing token storage path; this change does not broaden token permissions.
- Error messages expose operational setup state but not secrets.

Residual risk:
- A real production Netlify OAuth token and real Google Drive folder were not available in this local run. Live Drive listing must be checked after redeploy on the user’s Netlify site.
- The server/API modules were already larger than 250 lines. Refactoring them now would expand risk beyond the live fix; see `module-size-note.md`.

Conclusion:
- The code change is narrowly scoped, build-clean, and supported by API/browser evidence.
- The only remaining risk is live production Drive data verification, which requires the user’s connected Netlify/Google environment.
