import { readFile } from 'node:fs/promises';

const configUrl = new URL('../netlify.toml', import.meta.url);
const indexUrl = new URL('../public/index.html', import.meta.url);
const config = await readFile(configUrl, 'utf8');
const indexHtml = await readFile(indexUrl, 'utf8');
const omitKeys = config.match(/SECRETS_SCAN_OMIT_KEYS\s*=\s*"([^"]*)"/)?.[1]
  .split(',')
  .map((key) => key.trim())
  .filter(Boolean) || [];
const expectedOmitKeys = [
  'GOOGLE_CALENDAR_ID',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_DRIVE_FOLDER_ID',
  'GOOGLE_REDIRECT_URI'
];
const missingOmitKeys = expectedOmitKeys.filter((key) => !omitKeys.includes(key));

if (missingOmitKeys.length > 0) {
  console.error(`Netlify secret-scan omit keys are missing: ${missingOmitKeys.join(', ')}`);
  process.exit(1);
}

const accessCode = process.env.BAND_ACCESS_CODE || '';
if (accessCode && indexHtml.includes(accessCode)) {
  console.error('BAND_ACCESS_CODE must not appear in public/index.html.');
  process.exit(1);
}

console.log('Netlify secret-scan compatibility check passed.');
