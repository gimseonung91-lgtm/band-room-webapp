import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(rootDir, 'public');
const dataDir = join(rootDir, 'data');
const statePath = join(dataDir, 'state.json');
const tokenPath = join(dataDir, 'google-token.json');

loadEnvFile();

const config = {
  port: Number(process.env.PORT || 3000),
  accessCode: process.env.BAND_ACCESS_CODE || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  members: [
    { id: 'vocal', name: '김 선생님', part: 'Vocal' },
    { id: 'guitar-1', name: '이 선생님', part: 'Guitar' },
    { id: 'guitar-2', name: '박 선생님', part: 'Guitar' },
    { id: 'bass', name: '최 선생님', part: 'Bass' },
    { id: 'keys', name: '정 선생님', part: 'Keyboard' },
    { id: 'drums', name: '강 선생님', part: 'Drums' },
    { id: 'perc', name: '윤 선생님', part: 'Percussion' }
  ]
};

function loadEnvFile() {
  const envPath = join(rootDir, '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');
    process.env[key] ||= value;
  }
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

async function main() {
  await mkdir(dataDir, { recursive: true });

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      if (url.pathname === '/auth/google') return redirectToGoogle(res);
      if (url.pathname === '/oauth2callback') return handleOAuthCallback(url, res);
      if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);

      return serveStatic(url.pathname, res);
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unknown server error' });
    }
  });

  server.listen(config.port, () => {
    console.log(`Band Room is running at http://localhost:${config.port}`);
  });
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/session' && req.method === 'POST') {
    const body = await readJson(req);
    const ok = !config.accessCode || body.accessCode === config.accessCode;
    return sendJson(res, ok ? 200 : 401, { ok });
  }

  if (!isSessionAllowed(req)) {
    return sendJson(res, 401, { error: 'Access code is required.' });
  }

  if (url.pathname === '/api/bootstrap' && req.method === 'GET') {
    const now = new Date();
    const year = Number(url.searchParams.get('year') || now.getFullYear());
    const month = Number(url.searchParams.get('month') || now.getMonth() + 1);
    const state = await readState();
    const googleReady = await hasGoogleToken();

    const [events, scores] = googleReady
      ? await Promise.all([listCalendarEvents(year, month), listDriveScores()])
      : [[], []];

    return sendJson(res, 200, {
      appTitle: 'Band Room',
      googleReady,
      setup: {
        hasOAuthConfig: Boolean(config.googleClientId && config.googleClientSecret),
        hasDriveFolder: Boolean(config.driveFolderId),
        calendarId: config.calendarId,
        driveFolderId: config.driveFolderId
      },
      members: config.members,
      month: buildMonth(year, month, state, events),
      scores,
      songs: state.songs,
      notices: state.notices
    });
  }

  if (url.pathname === '/api/month' && req.method === 'GET') {
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month'));
    const state = await readState();
    const events = await listCalendarEvents(year, month);
    return sendJson(res, 200, buildMonth(year, month, state, events));
  }

  if (url.pathname === '/api/availability' && req.method === 'POST') {
    const body = await readJson(req);
    const state = await readState();
    assertDate(body.date);
    assertMember(body.memberId);
    state.availability[body.date] ||= {};

    if (body.available === true) {
      state.availability[body.date][body.memberId] = true;
    } else {
      delete state.availability[body.date][body.memberId];
    }

    await writeState(state);
    return sendJson(res, 200, buildDay(body.date, state));
  }

  if (url.pathname === '/api/events' && req.method === 'POST') {
    const body = await readJson(req);
    const event = await createCalendarEvent(body);
    return sendJson(res, 200, event);
  }

  if (url.pathname === '/api/scores' && req.method === 'GET') {
    return sendJson(res, 200, await listDriveScores());
  }

  if (url.pathname === '/api/songs' && req.method === 'POST') {
    const body = await readJson(req);
    const state = await readState();
    const song = normalizeSong(body);
    const index = state.songs.findIndex((item) => item.id === song.id);
    if (index >= 0) state.songs[index] = song;
    else state.songs.push(song);
    await writeState(state);
    return sendJson(res, 200, state.songs);
  }

  if (url.pathname.startsWith('/api/songs/') && req.method === 'DELETE') {
    const songId = decodeURIComponent(url.pathname.replace('/api/songs/', ''));
    const state = await readState();
    state.songs = state.songs.filter((song) => song.id !== songId);
    await writeState(state);
    return sendJson(res, 200, state.songs);
  }

  if (url.pathname === '/api/notices' && req.method === 'POST') {
    const body = await readJson(req);
    const state = await readState();
    const notice = normalizeNotice(body);
    const index = state.notices.findIndex((item) => item.id === notice.id);
    if (index >= 0) state.notices[index] = notice;
    else state.notices.unshift(notice);
    await writeState(state);
    return sendJson(res, 200, state.notices);
  }

  if (url.pathname.startsWith('/api/notices/') && req.method === 'DELETE') {
    const noticeId = decodeURIComponent(url.pathname.replace('/api/notices/', ''));
    const state = await readState();
    state.notices = state.notices.filter((notice) => notice.id !== noticeId);
    await writeState(state);
    return sendJson(res, 200, state.notices);
  }

  return sendJson(res, 404, { error: 'API route not found.' });
}

function redirectToGoogle(res) {
  if (!config.googleClientId || !config.googleClientSecret) {
    return sendHtml(res, 400, 'Google OAuth 환경 변수를 먼저 설정하세요.');
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ];

  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes.join(' ')
  });

  res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  res.end();
}

async function handleOAuthCallback(url, res) {
  const code = url.searchParams.get('code');
  if (!code) return sendHtml(res, 400, 'Google 인증 코드가 없습니다.');

  const token = await googleTokenRequest({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: config.googleRedirectUri,
    grant_type: 'authorization_code'
  });

  await saveToken({
    ...token,
    expires_at: Date.now() + Number(token.expires_in || 3600) * 1000
  });

  res.writeHead(302, { Location: '/' });
  res.end();
}

async function googleTokenRequest(payload) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(payload)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google token request failed.');
  return data;
}

async function getAccessToken() {
  const token = await readToken();
  if (!token?.access_token) throw new Error('Google account is not connected.');

  if (token.expires_at && token.expires_at - Date.now() > 60_000) {
    return token.access_token;
  }

  if (!token.refresh_token) throw new Error('Google refresh token is missing. Connect Google again.');

  const refreshed = await googleTokenRequest({
    refresh_token: token.refresh_token,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    grant_type: 'refresh_token'
  });

  const nextToken = {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expires_at: Date.now() + Number(refreshed.expires_in || 3600) * 1000
  };

  await saveToken(nextToken);
  return nextToken.access_token;
}

async function googleApi(url, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Google API request failed.');
  return data;
}

async function listCalendarEvents(year, month) {
  const timeMin = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
  const timeMax = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '120'
  });
  const calendarId = encodeURIComponent(config.calendarId);
  const data = await googleApi(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`);

  return (data.items || []).map((event) => ({
    id: event.id,
    title: event.summary || '일정',
    start: event.start?.dateTime || event.start?.date || '',
    date: event.start?.date || toDateIso(new Date(event.start?.dateTime || Date.now()))
  }));
}

async function createCalendarEvent(body) {
  assertDate(body.date);
  const summary = String(body.title || '밴드 합주').trim().slice(0, 80);
  const startTime = /^\d{2}:\d{2}$/.test(body.startTime || '') ? body.startTime : '19:30';
  const endTime = /^\d{2}:\d{2}$/.test(body.endTime || '') ? body.endTime : '21:30';
  const calendarId = encodeURIComponent(config.calendarId);

  return googleApi(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
    method: 'POST',
    body: JSON.stringify({
      summary,
      description: 'Band Room 웹앱에서 등록한 합주 일정입니다.',
      start: { dateTime: `${body.date}T${startTime}:00+09:00`, timeZone: 'Asia/Seoul' },
      end: { dateTime: `${body.date}T${endTime}:00+09:00`, timeZone: 'Asia/Seoul' }
    })
  });
}

async function listDriveScores() {
  if (!config.driveFolderId) return [];

  const q = [
    `'${config.driveFolderId.replaceAll("'", "\\'")}' in parents`,
    'trashed = false',
    '(',
    "mimeType = 'application/pdf'",
    "or mimeType = 'image/jpeg'",
    "or mimeType = 'image/png'",
    "or mimeType = 'application/vnd.google-apps.document'",
    "or mimeType = 'application/vnd.google-apps.presentation'",
    ')'
  ].join(' ');

  const params = new URLSearchParams({
    q,
    pageSize: '100',
    orderBy: 'name',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink,thumbnailLink)'
  });

  const data = await googleApi(`https://www.googleapis.com/drive/v3/files?${params}`);
  return (data.files || []).map((file) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    mimeLabel: mimeLabel(file.mimeType),
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
    thumbnailLink: file.thumbnailLink || '',
    viewerUrl: previewUrl(file)
  }));
}

function buildMonth(year, month, state, events) {
  const first = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const todayIso = toDateIso(new Date());
  const eventsByDate = events.reduce((bucket, event) => {
    bucket[event.date] ||= [];
    bucket[event.date].push(event);
    return bucket;
  }, {});

  const cells = [];
  for (let index = 0; index < first.getDay(); index += 1) cells.push({ empty: true });

  for (let day = 1; day <= lastDay; day += 1) {
    const date = toDateIso(new Date(year, month - 1, day));
    const dayState = buildDay(date, state);
    cells.push({
      empty: false,
      date,
      day,
      isToday: date === todayIso,
      events: eventsByDate[date] || [],
      ...dayState
    });
  }

  return { year, month, label: `${year}년 ${month}월`, cells };
}

function buildDay(date, state) {
  const availability = state.availability[date] || {};
  const availableCount = config.members.reduce(
    (count, member) => count + (availability[member.id] === true ? 1 : 0),
    0
  );
  return { date, availability, availableCount, capacityClass: `capacity-${availableCount}` };
}

async function readState() {
  if (!existsSync(statePath)) {
    const initial = {
      availability: {},
      songs: [
        { id: randomUUID(), title: 'Autumn Leaves', progress: 45, note: '인트로와 엔딩 합 맞추기' },
        { id: randomUUID(), title: 'Isn’t She Lovely', progress: 70, note: '브레이크 타이밍 확인' },
        { id: randomUUID(), title: 'Fly Me to the Moon', progress: 30, note: '키와 템포 확정' }
      ],
      notices: [
        { id: randomUUID(), text: '합주 전 악보 버전 확인', done: false },
        { id: randomUUID(), text: '공용 보면대와 충전 케이블 준비', done: false }
      ]
    };
    await writeState(initial);
    return initial;
  }

  return JSON.parse(await readFile(statePath, 'utf8'));
}

async function writeState(state) {
  await writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
}

async function readToken() {
  if (!existsSync(tokenPath)) return null;
  return JSON.parse(await readFile(tokenPath, 'utf8'));
}

async function saveToken(token) {
  await writeFile(tokenPath, JSON.stringify(token, null, 2), 'utf8');
}

async function hasGoogleToken() {
  const token = await readToken();
  return Boolean(token?.access_token || token?.refresh_token);
}

function isSessionAllowed(req) {
  if (!config.accessCode) return true;
  const headerCode = req.headers['x-band-code'];
  const cookieCode = parseCookies(req.headers.cookie || '').band_code;
  return headerCode === config.accessCode || cookieCode === config.accessCode;
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

async function serveStatic(pathname, res) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const target = normalize(join(publicDir, safePath));
  if (!target.startsWith(publicDir) || !existsSync(target)) {
    return sendHtml(res, 404, 'Not found');
  }

  const body = await readFile(target);
  res.writeHead(200, { 'Content-Type': mimeTypes[extname(target)] || 'application/octet-stream' });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, body) {
  if (body.ok === true && config.accessCode) {
    res.setHeader('Set-Cookie', `band_code=${encodeURIComponent(config.accessCode)}; Path=/; SameSite=Lax`);
  }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function sendHtml(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body);
}

function normalizeSong(song) {
  return {
    id: song.id || randomUUID(),
    title: String(song.title || '새 곡').trim().slice(0, 80),
    progress: Math.max(0, Math.min(100, Number(song.progress || 0))),
    note: String(song.note || '').trim().slice(0, 200)
  };
}

function normalizeNotice(notice) {
  return {
    id: notice.id || randomUUID(),
    text: String(notice.text || '').trim().slice(0, 160),
    done: notice.done === true
  };
}

function assertDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error('Date must be yyyy-mm-dd.');
}

function assertMember(memberId) {
  if (!config.members.some((member) => member.id === memberId)) throw new Error('Unknown member.');
}

function toDateIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previewUrl(file) {
  if (file.mimeType === 'application/vnd.google-apps.document') {
    return `https://docs.google.com/document/d/${file.id}/preview`;
  }
  if (file.mimeType === 'application/vnd.google-apps.presentation') {
    return `https://docs.google.com/presentation/d/${file.id}/preview`;
  }
  return `https://drive.google.com/file/d/${file.id}/preview`;
}

function mimeLabel(mimeType) {
  return {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'application/vnd.google-apps.document': 'DOC',
    'application/vnd.google-apps.presentation': 'SLIDES'
  }[mimeType] || 'FILE';
}

main();
