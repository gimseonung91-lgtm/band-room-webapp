# Module Size Note

The touched production modules `server.mjs`, `netlify/functions/api.mjs`, and `public/app.js` were already larger than 250 lines before this change. This task intentionally kept the patch narrow because the user was debugging a live deployment path:

- remove visible Google Calendar residue
- keep attendance counts/member toggles
- make Drive score loading states explicit
- avoid cache-stale deployed assets

A structural split of the server/API files would increase deployment risk and is outside this requested fix. The current patch changes the smallest relevant behavior and leaves larger refactoring for a separate maintenance pass.
