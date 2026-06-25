# Band Room Web App

Band Room is a regular web app for a seven-member band. It is not Google Apps Script.

The local development server uses `server.mjs`. The Netlify deployment uses Netlify Functions and Netlify Blobs for Google OAuth, Calendar API calls, Drive API calls, and shared rehearsal state.

## What It Includes

- Monthly rehearsal calendar with per-member availability.
- Deep blue date cells when all seven members are available, with lighter levels for fewer members.
- Google Calendar event creation.
- Google Drive score folder listing for PDF, image, Google Docs, and Google Slides files.
- Built-in score preview with a full-screen reader mode for phones and tablets.
- Shared song progress and notice checkboard.
- Netlify deployment stores shared state and Google OAuth token data in Netlify Blobs.

## Google Setup

1. Create or open a Google Cloud project.
2. Enable these APIs:
   - Google Calendar API
   - Google Drive API
3. Configure OAuth consent.
4. Create an OAuth Client ID:
   - Application type: Web application
   - Authorized redirect URI for local use: `http://localhost:3000/oauth2callback`
   - Authorized redirect URI for Netlify: `https://your-site-name.netlify.app/oauth2callback`
5. Copy `.env.example` to `.env` for local use and fill the values.

```bash
PORT=3000
BAND_ACCESS_CODE=change-this-code
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
GOOGLE_CALENDAR_ID=primary
GOOGLE_DRIVE_FOLDER_ID=your-drive-folder-id
```

Use `primary` for your main calendar, or paste a shared band calendar ID. The Drive folder ID is the last part of the folder URL.

## Local Run

```bash
npm start
```

Open `http://localhost:3000`, enter the band access code, then press `Google 연결` once to connect the Google account that owns the calendar and score folder.

## Netlify Deploy

The repository includes:

- `netlify.toml`
- `netlify/functions/api.mjs`
- `public/` as the publish directory

Set these environment variables in Netlify:

- `BAND_ACCESS_CODE`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_DRIVE_FOLDER_ID`

For production, set `GOOGLE_REDIRECT_URI` to the deployed callback URL and add the same URL to the OAuth Client ID:

```text
https://your-site-name.netlify.app/oauth2callback
```

After deployment, open the Netlify site and press `Google 연결` once. Netlify Blobs will store the shared app state and the Google refresh token for future requests.

