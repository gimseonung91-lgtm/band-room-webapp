# Band Room Manual QA Matrix

| Area | Scenario | Result | Evidence |
| --- | --- | --- | --- |
| App shell | Load local app at `http://localhost:3010/` | Pass | App title `Band Room`, tabs `참석표`, `악보`, `체크보드` |
| Calendar removal | Confirm no Google Calendar event UI remains | Pass | `hasEventForm=false`, `hasEventChips=false`, bootstrap day cells have no `events` field |
| Attendance grid | Confirm attendance counts still render | Pass | Day cells show `0/7`, selected panel shows `0/7명 가능` |
| Score setup state | Confirm score list gives a clear state when Google is not connected | Pass | `Google 연결을 완료하면 악보 폴더의 파일을 불러옵니다.` |
| Cache refresh | Confirm browser receives fresh static assets | Pass | Versioned `/app.js?v=20260626-drive-cache`, `/styles.css?v=20260626-drive-cache`, no-cache headers |
| Build | Syntax check server and Netlify function | Pass | `npm.cmd run check` passed |
| Responsive UI | Mobile/tablet surfaces are readable | Pass | `mobile-attendance.png`, `tablet-attendance.png` |

Residual risk:
- Live Drive listing against the user's connected production Google token was not executed in this local run.
- After redeploy, verify the production Netlify site while signed in and with files in the configured Drive folder.
