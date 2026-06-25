import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';

const MEMBERS = [
  { id: 'vocal', name: '김 선생님', part: 'Vocal' },
  { id: 'guitar-1', name: '이 선생님', part: 'Guitar' },
  { id: 'guitar-2', name: '박 선생님', part: 'Guitar' },
  { id: 'bass', name: '최 선생님', part: 'Bass' },
  { id: 'keys', name: '정 선생님', part: 'Keyboard' },
  { id: 'drums', name: '강 선생님', part: 'Drums' },
  { id: 'perc', name: '윤 선생님', part: 'Percussion' }
];

const STATE_KEY = 'band-room-state-v1';
const TOKEN_KEY = 'google-token-v1';

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const pathname = normalizePath(url.pathname);

    if (pathname === '/auth/google') return redirectToGoogle(request);
    if (pathname === '/oauth2callback') return handleOAuthCallback(request, url);
    if (pathname.startsWith('/api/')) return handleApi(request, url, pathname);

    return json({ error: 'Not found.' }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error.' }, 500);
  }
}

async function handleApi(request, url, pathname) {
  if (pathname === '/api/session' && request.method === 'POST') {
    const body = await readJson(request);
    const accessCode = process.env.BAND_ACCESS_CODE || '';
    const ok = !accessCode || body.accessCode === accessCode;
    return json({ ok }, ok ? 200 : 401, ok && accessCode ? {
      'Set-Cookie': `band_code=${encodeURIComponent(accessCode)}; Path=/; SameSite=Lax; Secure`
    } : {});
  }

  if (!isSessionAllowed(request)) {
    return json({ error: 'Access code is required.' }, 401);
  }

  if (pathname === '/api/bootstrap' && request.method === 'GET') {
    const now = new Date();
    const year = Number(url.searchParams.get('year') || now.getFullYear());
    const month = Number(url.searchParams.get('month') || now.getMonth() + 1);
    const state = await readState();
    const googleReady = await hasGoogleToken();
    const driveData = googleReady
      ? await loadDriveData()
      : { scores: [], errors: [] };

    return json({
      appTitle: 'Band Room',
      googleReady,
      setup: {
        hasOAuthConfig: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        hasDriveFolder: Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID),
        driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || ''
      },
      members: MEMBERS,
      month: buildMonth(year, month, state),
      scores: driveData.scores,
      googleErrors: driveData.errors,
      songs: state.songs,
      notices: state.notices
    });
  }

  if (pathname === '/api/month' && request.method === 'GET') {
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month'));
    const state = await readState();
    return json(buildMonth(year, month, state));
  }

  if (pathname === '/api/availability' && request.method === 'POST') {
    const body = await readJson(request);
    assertDate(body.date);
    assertMember(body.memberId);

    const state = await readState();
    state.availability[body.date] ||= {};
    if (body.available === true) state.availability[body.date][body.memberId] = true;
    else delete state.availability[body.date][body.memberId];

    await writeState(state);
    return json(buildDay(body.date, state));
  }

  if (pathname === '/api/scores' && request.method === 'GET') {
    return json(await listDriveScores());
  }

  if (pathname === '/api/songs' && request.method === 'POST') {
    const state = await readState();
    const song = normalizeSong(await readJson(request));
    const index = state.songs.findIndex((item) => item.id === song.id);
    if (index >= 0) state.songs[index] = song;
    else state.songs.push(song);
    await writeState(state);
    return json(state.songs);
  }

  if (pathname.startsWith('/api/songs/') && request.method === 'DELETE') {
    const songId = decodeURIComponent(pathname.replace('/api/songs/', ''));
    const state = await readState();
    state.songs = state.songs.filter((song) => song.id !== songId);
    await writeState(state);
    return json(state.songs);
  }

  if (pathname === '/api/notices' && request.method === 'POST') {
    const state = await readState();
    const notice = normalizeNotice(await readJson(request));
    const index = state.notices.findIndex((item) => item.id === notice.id);
    if (index >= 0) state.notices[index] = notice;
    else state.notices.unshift(notice);
    await writeState(state);
    return json(state.notices);
  }

  if (pathname.startsWith('/api/notices/') && request.method === 'DELETE') {
    const noticeId = decodeURIComponent(pathname.replace('/api/notices/', ''));
    const state = await readState();
    state.notices = state.notices.filter((notice) => notice.id !== noticeId);
    await writeState(state);
    return json(state.notices);
  }

  return json({ error: 'API route not found.' }, 404);
}

function redirectToGoogle(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) {
    return html('Google OAuth 환경 변수를 먼저 설정하세요.', 400);
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly'
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(request),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes.join(' ')
  });

  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

async function handleOAuthCallback(request, url) {
  const code = url.searchParams.get('code');
  if (!code) return html('Google 인증 코드가 없습니다.', 400);

  const token = await googleTokenRequest({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirect_uri: googleRedirectUri(request),
    grant_type: 'authorization_code'
  });

  await saveToken({
    ...token,
    expires_at: Date.now() + Number(token.expires_in || 3600) * 1000
  });

  return redirect('/');
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

async function googleApi(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Google API request failed.');
  return data;
}

async function loadDriveData() {
  const [scoresResult] = await Promise.allSettled([
    listDriveScores()
  ]);

  return {
    scores: scoresResult.status === 'fulfilled' ? scoresResult.value : [],
    errors: [
      scoresResult.status === 'rejected' ? `드라이브 오류: ${errorMessage(scoresResult.reason)}` : ''
    ].filter(Boolean)
  };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function getAccessToken() {
  const token = await readToken();
  if (!token?.access_token) throw new Error('Google account is not connected.');
  if (token.expires_at && token.expires_at - Date.now() > 60_000) return token.access_token;
  if (!token.refresh_token) throw new Error('Google refresh token is missing. Connect Google again.');

  const refreshed = await googleTokenRequest({
    refresh_token: token.refresh_token,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
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

async function listDriveScores() {
  const folderId = normalizeDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID || '');
  if (!folderId) return [];

  const q = [
    `'${folderId.replaceAll("'", "\\'")}' in parents`,
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

function buildMonth(year, month, state) {
  const first = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const todayIso = toDateIso(new Date());

  const cells = [];
  for (let index = 0; index < first.getDay(); index += 1) cells.push({ empty: true });

  for (let day = 1; day <= lastDay; day += 1) {
    const date = toDateIso(new Date(year, month - 1, day));
    cells.push({
      empty: false,
      date,
      day,
      isToday: date === todayIso,
      ...buildDay(date, state)
    });
  }

  return { year, month, label: `${year}년 ${month}월`, cells };
}

function buildDay(date, state) {
  const availability = state.availability[date] || {};
  const availableCount = MEMBERS.reduce(
    (count, member) => count + (availability[member.id] === true ? 1 : 0),
    0
  );
  return { date, availability, availableCount, capacityClass: `capacity-${availableCount}` };
}

async function readState() {
  const state = await stateStore().get(STATE_KEY, { type: 'json' });
  if (state) return state;

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

async function writeState(state) {
  await stateStore().setJSON(STATE_KEY, state);
}

async function readToken() {
  return tokenStore().get(TOKEN_KEY, { type: 'json' });
}

async function saveToken(token) {
  await tokenStore().setJSON(TOKEN_KEY, token);
}

async function hasGoogleToken() {
  const token = await readToken();
  return Boolean(token?.access_token || token?.refresh_token);
}

function stateStore() {
  return getStore('band-room-state');
}

function tokenStore() {
  return getStore('band-room-google-token');
}

function isSessionAllowed(request) {
  const accessCode = process.env.BAND_ACCESS_CODE || '';
  if (!accessCode) return true;
  const cookieCode = parseCookies(request.headers.get('cookie') || '').band_code;
  return cookieCode === accessCode || request.headers.get('x-band-code') === accessCode;
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index < 0) return [decodeURIComponent(part), ''];
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

async function readJson(request) {
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    }
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

function normalizePath(pathname) {
  const path = pathname.replace(/^\/\.netlify\/functions\/api/, '') || '/';
  if (path === '/auth/google' || path === '/oauth2callback') return path;
  if (path.startsWith('/api/')) return path;
  return `/api${path}`;
}

function googleRedirectUri(request) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const url = new URL(request.url);
  return `${url.origin}/oauth2callback`;
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
  if (!MEMBERS.some((member) => member.id === memberId)) throw new Error('Unknown member.');
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

function normalizeDriveFolderId(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const folderUrlMatch = trimmed.match(/\/folders\/([^/?#]+)/);
  if (folderUrlMatch) return folderUrlMatch[1];

  const queryIdMatch = trimmed.match(/[?&]id=([^&#]+)/i);
  if (queryIdMatch) return queryIdMatch[1];

  return trimmed.replace(/^GOOGLE_DRIVE_FOLDER_ID=/i, '').replace(/^ID=/i, '').trim();
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
