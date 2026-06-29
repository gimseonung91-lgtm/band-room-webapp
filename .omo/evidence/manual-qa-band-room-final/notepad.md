# Manual QA Notepad - Band Room Final Pass

Tier: LIGHT - read-only final QA over existing webapp behavior; no implementation changes requested.
Skills: browser:control-in-app-browser for real browser evidence; visual-qa for mobile/tablet readability checks.
Success criteria:
1. Calendar API/user-facing calendar path removed: bootstrap/app data shows no calendar events and UI/static text has no calendar surface.
2. Attendance grid still presents counts and member toggles on mobile/tablet.
3. Score loading explicitly handles Google not connected, missing Drive folder, empty folder, and Drive errors.
4. Mobile/tablet UI remains readable with no obvious CJK clipping/overlap.
