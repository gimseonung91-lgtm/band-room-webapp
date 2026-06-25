# Band Room Web App

Band Room is a regular web app for a seven-member band. It is not Google Apps Script. A small Node server handles Google OAuth, Calendar API calls, Drive API calls, and shared rehearsal state.

## What It Includes

- Monthly rehearsal calendar with per-member availability.
- Deep blue date cells when all seven members are available, with lighter levels for fewer members.
- Google Calendar event creation.
- Google Drive score folder listing for PDF, image, Google Docs, and Google Slides files.
- Built-in score preview with a full-screen reader mode for phones and tablets.
- Shared song progress and notice checkboard stored in `data/state.json`.

## Google Setup

1. Create or open a Google Cloud project.
2. Enable these APIs:
   - Google Calendar API
   - Google Drive API
3. Configure OAuth consent.
4. Create an OAuth Client ID:
   - Application type: Web application
   - Authorized redirect URI for local use: `http://localhost:3000/oauth2callback`
5. Copy `.env.example` to `.env` and fill the values.

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

## Run

```bash
npm start
```

Open `http://localhost:3000`, enter the band access code, then press `Google 연결` once to connect the Google account that owns the calendar and score folder.

## Deploy Notes

For production, set the same environment variables on your host and add the deployed callback URL to the OAuth Client ID:

```text
https://your-domain.example/oauth2callback
```

The `data/` folder stores the Google token and app state. On a managed host, mount persistent storage or replace the file storage with a database.

