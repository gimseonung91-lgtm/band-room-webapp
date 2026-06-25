const state = {
  data: null,
  selectedDate: '',
  activeScoreId: '',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1
};

const $ = (selector) => document.querySelector(selector);

async function api(path, options = {}) {
  setStatus('동기화 중');
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    openAccessDialog();
    setStatus('입장 코드 필요');
    throw new Error(data.error || 'Access code is required.');
  }

  if (!response.ok) {
    setStatus('오류');
    throw new Error(data.error || data.message || response.statusText || '요청에 실패했습니다.');
  }

  setStatus('저장됨');
  return data;
}

async function init() {
  bindEvents();
  await loadBootstrap();
}

async function loadBootstrap() {
  state.data = await api(`/api/bootstrap?year=${state.year}&month=${state.month}`);
  $('#appTitle').textContent = state.data.appTitle;
  state.selectedDate ||= todayIsoIfVisible();
  renderAll();
}

function renderAll() {
  renderSetup();
  renderCalendar();
  renderDayPanel();
  renderScores();
  renderSongs();
  renderNotices();
}

function renderSetup() {
  const messages = [];
  if (!state.data.setup.hasOAuthConfig) {
    messages.push('Google OAuth Client ID와 Client Secret 환경 변수가 필요합니다.');
  }
  if (!state.data.setup.hasDriveFolder) {
    messages.push('GOOGLE_DRIVE_FOLDER_ID 환경 변수에 악보 폴더 ID를 넣어주세요.');
  }
  if (!state.data.googleReady) {
    messages.push('Google 연결을 완료하면 드라이브 악보를 불러옵니다.');
  }
  for (const error of state.data.googleErrors || []) {
    messages.push(error);
  }

  $('#connectGoogle').hidden = state.data.googleReady || !state.data.setup.hasOAuthConfig;
  $('#setupPanel').hidden = messages.length === 0;
  $('#setupPanel').innerHTML = messages.map((message) => `<div>${escapeHtml(message)}</div>`).join('');
}

function renderCalendar() {
  $('#monthLabel').textContent = state.data.month.label;

  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    .map((day) => `<div class="weekday">${day}</div>`)
    .join('');

  const cells = state.data.month.cells.map((cell) => {
    if (cell.empty) return '<div class="day-cell empty" aria-hidden="true"></div>';

    const selected = cell.date === state.selectedDate ? 'selected' : '';
    const today = cell.isToday ? 'today' : '';
    return `
      <button
        class="day-cell ${cell.capacityClass} ${selected} ${today}"
        data-date="${cell.date}"
        aria-label="${cell.date}, ${cell.availableCount}명 참석 가능">
        <span class="day-top">
          <span class="day-number">${cell.day}</span>
          <span class="attendance-count">${cell.availableCount}/${state.data.members.length}</span>
        </span>
      </button>
    `;
  }).join('');

  $('#calendarGrid').innerHTML = weekdays + cells;
}

function renderDayPanel() {
  const day = selectedDay();

  if (!day) {
    $('#dayPanel').innerHTML = '<div class="empty-state">날짜를 선택하면 참석 가능 여부를 체크할 수 있습니다.</div>';
    return;
  }

  const members = state.data.members.map((member) => {
    const available = day.availability[member.id] === true;
    return `
      <button class="member-toggle" aria-pressed="${available}" data-member-id="${member.id}">
        <span>
          <strong>${escapeHtml(member.name)}</strong>
          <small>${escapeHtml(member.part)}</small>
        </span>
        <span class="toggle-state">${available ? '가능' : '체크'}</span>
      </button>
    `;
  }).join('');

  $('#dayPanel').innerHTML = `
    <h3 class="date-title">${day.date} · ${day.availableCount}/${state.data.members.length}명 가능</h3>
    <div class="member-list">${members}</div>
  `;
}

function renderScores() {
  const files = state.data.scores || [];
  if (files.length === 0) {
    $('#fileList').innerHTML = '<div class="empty-state">악보 폴더에 PDF나 이미지를 넣으면 목록이 표시됩니다.</div>';
    return;
  }

  $('#fileList').innerHTML = files.map((file) => `
    <button class="file-button ${file.id === state.activeScoreId ? 'active' : ''}" data-file-id="${file.id}">
      <span class="file-type">${escapeHtml(file.mimeLabel)}</span>
      <span>
        <span class="file-name">${escapeHtml(file.name)}</span>
        <span class="file-date">${formatDate(file.modifiedTime)}</span>
      </span>
    </button>
  `).join('');
}

function openScore(fileId) {
  const file = state.data.scores.find((item) => item.id === fileId);
  if (!file) return;

  state.activeScoreId = file.id;
  $('#viewerTitle').textContent = file.name;
  $('#viewerArea').className = '';
  $('#viewerArea').innerHTML = `
    <iframe
      class="score-frame"
      src="${escapeAttribute(file.viewerUrl)}"
      title="${escapeAttribute(file.name)}"
      allow="fullscreen">
    </iframe>
  `;
  renderScores();
}

function renderSongs() {
  $('#songList').innerHTML = state.data.songs.map((song) => `
    <article class="song-card" data-song-id="${song.id}">
      <div class="song-row">
        <label>
          <span>곡 제목</span>
          <input class="song-title" value="${escapeAttribute(song.title)}">
        </label>
        <button class="button ghost" data-delete-song="${song.id}">삭제</button>
      </div>
      <div class="progress-row">
        <input class="song-progress" type="range" min="0" max="100" value="${song.progress}" aria-label="${escapeAttribute(song.title)} 진척도">
        <strong class="progress-value">${song.progress}%</strong>
      </div>
      <label>
        <span>메모</span>
        <textarea class="song-note">${escapeHtml(song.note || '')}</textarea>
      </label>
      <div class="song-actions">
        <button class="button primary" data-save-song="${song.id}">저장</button>
      </div>
    </article>
  `).join('');
}

function renderNotices() {
  $('#noticeList').innerHTML = state.data.notices.map((notice) => `
    <article class="notice-card ${notice.done ? 'done' : ''}" data-notice-id="${notice.id}">
      <input type="checkbox" ${notice.done ? 'checked' : ''} data-toggle-notice="${notice.id}" aria-label="완료 표시">
      <span>${escapeHtml(notice.text)}</span>
      <button class="button ghost" data-delete-notice="${notice.id}">삭제</button>
    </article>
  `).join('');
}

function bindEvents() {
  document.addEventListener('click', handleClick);
  document.addEventListener('input', handleInput);
  document.addEventListener('change', handleChange);
  document.addEventListener('submit', handleSubmit);

  $('#prevMonth').addEventListener('click', () => changeMonth(-1));
  $('#nextMonth').addEventListener('click', () => changeMonth(1));
  $('#todayMonth').addEventListener('click', goToday);
  $('#refreshScores').addEventListener('click', refreshScores);
  $('#readerMode').addEventListener('click', toggleReaderMode);
}

async function handleClick(event) {
  const tab = event.target.closest('.tab');
  if (tab) return activateTab(tab);

  const dayCell = event.target.closest('.day-cell[data-date]');
  if (dayCell) {
    state.selectedDate = dayCell.dataset.date;
    renderCalendar();
    renderDayPanel();
    return;
  }

  const memberButton = event.target.closest('.member-toggle');
  if (memberButton) {
    await toggleMember(memberButton);
    return;
  }

  const fileButton = event.target.closest('.file-button');
  if (fileButton) {
    openScore(fileButton.dataset.fileId);
    return;
  }

  const saveSongButton = event.target.closest('[data-save-song]');
  if (saveSongButton) {
    await saveSong(saveSongButton.closest('.song-card'));
    return;
  }

  const deleteSongButton = event.target.closest('[data-delete-song]');
  if (deleteSongButton) {
    state.data.songs = await api(`/api/songs/${encodeURIComponent(deleteSongButton.dataset.deleteSong)}`, { method: 'DELETE' });
    renderSongs();
    return;
  }

  const deleteNoticeButton = event.target.closest('[data-delete-notice]');
  if (deleteNoticeButton) {
    state.data.notices = await api(`/api/notices/${encodeURIComponent(deleteNoticeButton.dataset.deleteNotice)}`, { method: 'DELETE' });
    renderNotices();
  }
}

function handleInput(event) {
  const range = event.target.closest('.song-progress');
  if (range) {
    range.closest('.song-card').querySelector('.progress-value').textContent = `${range.value}%`;
  }
}

async function handleChange(event) {
  const checkbox = event.target.closest('[data-toggle-notice]');
  if (!checkbox) return;

  const notice = state.data.notices.find((item) => item.id === checkbox.dataset.toggleNotice);
  notice.done = checkbox.checked;
  state.data.notices = await api('/api/notices', {
    method: 'POST',
    body: JSON.stringify(notice)
  });
  renderNotices();
}

async function handleSubmit(event) {
  event.preventDefault();

  if (event.target.id === 'accessForm') {
    await submitAccessCode();
    return;
  }

  if (event.target.id === 'songForm') {
    const title = $('#newSongTitle').value.trim();
    if (!title) return;
    state.data.songs = await api('/api/songs', {
      method: 'POST',
      body: JSON.stringify({ title, progress: 0, note: '' })
    });
    $('#newSongTitle').value = '';
    renderSongs();
    return;
  }

  if (event.target.id === 'noticeForm') {
    const text = $('#newNoticeText').value.trim();
    if (!text) return;
    state.data.notices = await api('/api/notices', {
      method: 'POST',
      body: JSON.stringify({ text, done: false })
    });
    $('#newNoticeText').value = '';
    renderNotices();
  }
}

async function submitAccessCode() {
  const accessCode = $('#accessCode').value.trim();
  const result = await api('/api/session', {
    method: 'POST',
    body: JSON.stringify({ accessCode })
  });

  if (result.ok) {
    $('#accessDialog').close();
    await loadBootstrap();
  }
}

async function toggleMember(button) {
  const day = selectedDay();
  const result = await api('/api/availability', {
    method: 'POST',
    body: JSON.stringify({
      date: day.date,
      memberId: button.dataset.memberId,
      available: button.getAttribute('aria-pressed') !== 'true'
    })
  });

  Object.assign(day, result);
  renderCalendar();
  renderDayPanel();
}

async function saveSong(card) {
  const song = {
    id: card.dataset.songId,
    title: card.querySelector('.song-title').value,
    progress: Number(card.querySelector('.song-progress').value),
    note: card.querySelector('.song-note').value
  };
  state.data.songs = await api('/api/songs', {
    method: 'POST',
    body: JSON.stringify(song)
  });
  renderSongs();
}

async function refreshScores() {
  state.data.scores = await api('/api/scores');
  renderScores();
}

async function changeMonth(delta) {
  const next = new Date(state.year, state.month - 1 + delta, 1);
  state.year = next.getFullYear();
  state.month = next.getMonth() + 1;
  state.selectedDate = '';
  await refreshMonth();
}

async function refreshMonth() {
  state.data.month = await api(`/api/month?year=${state.year}&month=${state.month}`);
  state.selectedDate ||= todayIsoIfVisible();
  renderCalendar();
  renderDayPanel();
}

function goToday() {
  const now = new Date();
  state.year = now.getFullYear();
  state.month = now.getMonth() + 1;
  state.selectedDate = dateIso(now);
  refreshMonth();
}

function activateTab(tab) {
  document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
  document.querySelectorAll('.view').forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  $(`#${tab.dataset.view}`).classList.add('active');
}

function toggleReaderMode() {
  document.body.classList.toggle('reader-focus');
  $('#readerMode').textContent = document.body.classList.contains('reader-focus') ? '나가기' : '악보 보기 모드';
}

function selectedDay() {
  if (!state.selectedDate) return null;
  return state.data.month.cells.find((cell) => cell.date === state.selectedDate);
}

function todayIsoIfVisible() {
  const today = dateIso(new Date());
  return state.data?.month?.cells?.some((cell) => cell.date === today) ? today : '';
}

function dateIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function openAccessDialog() {
  const dialog = $('#accessDialog');
  if (!dialog.open) dialog.showModal();
}

function setStatus(text) {
  $('#statusText').textContent = text;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

init().catch((error) => {
  setStatus('확인 필요');
  if (!String(error.message).includes('Access code')) {
    document.querySelector('main').insertAdjacentHTML(
      'afterbegin',
      `<section class="setup-panel"><span class="error-text">${escapeHtml(error.message)}</span></section>`
    );
  }
});
