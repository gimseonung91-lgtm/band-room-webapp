import { readFile } from 'node:fs/promises';

const configUrl = new URL('../netlify.toml', import.meta.url);
const config = await readFile(configUrl, 'utf8');
const omitKeys = config.match(/SECRETS_SCAN_OMIT_KEYS\s*=\s*"([^"]*)"/)?.[1]
  .split(',')
  .map((key) => key.trim())
  .filter(Boolean) || [];

if (!omitKeys.includes('GOOGLE_CALENDAR_ID')) {
  console.error('Netlify must omit the stale GOOGLE_CALENDAR_ID value from secret scanning.');
  process.exit(1);
}

console.log('Netlify secret-scan compatibility check passed.');
