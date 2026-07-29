const API_BASE_URL = String(window.KARA_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  if (!path || /^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const state = {
  auth: {
    session: null,
    profile: null,
    mode: 'login'
  },
  lessons: [],
  lessonSearch: '',
  plan: null,
  lessonId: null,
  selectedSegment: null,
  speechBySegment: new Map(),
  playback: {
    active: false,
    currentIndex: -1,
    playable: [],
    finalVideoUrl: null,
    waitingForNext: false,
    userPaused: false
  },
  karaChat: []
};

let controlsHideTimer = null;
let preparingTimer = null;
let preparingProgress = 0;

const preparingMessages = [
  'Ders akışı kuruluyor...',
  'Anlatım bölümlere ayrılıyor...',
  'Ses metni hazırlanıyor...',
  'Görsel sahneler tasarlanıyor...',
  'Animasyon kodu düzenleniyor...',
  'İlk video bölümü hazırlanıyor...',
  'Ses ve görüntü eşleştiriliyor...',
  'Tahta düzeni son kez kontrol ediliyor...'
];

const els = {
  appShell: document.querySelector('#appShell'),
  authGate: document.querySelector('#authGate'),
  authForm: document.querySelector('#authForm'),
  authNameInput: document.querySelector('#authNameInput'),
  authEmailInput: document.querySelector('#authEmailInput'),
  authPasswordInput: document.querySelector('#authPasswordInput'),
  authSubmitBtn: document.querySelector('#authSubmitBtn'),
  authModeBtn: document.querySelector('#authModeBtn'),
  authMessage: document.querySelector('#authMessage'),
  userEmailText: document.querySelector('#userEmailText'),
  logoutBtn: document.querySelector('#logoutBtn'),
  logoHomeBtn: document.querySelector('#logoHomeBtn'),
  historyList: document.querySelector('.historyList'),
  homeView: document.querySelector('#homeView'),
  studioView: document.querySelector('#studioView'),
  configText: document.querySelector('#configText'),
  statusText: document.querySelector('#statusText'),
  topicInput: document.querySelector('#topicInput'),
  levelInput: document.querySelector('#levelInput'),
  targetMinutesInput: document.querySelector('#targetMinutesInput'),
  targetSegmentsInput: document.querySelector('#targetSegmentsInput'),
  priorInput: document.querySelector('#priorInput'),
  interruptInput: document.querySelector('#interruptInput'),
  questionImageInput: document.querySelector('#questionImageInput'),
  questionImageName: document.querySelector('#questionImageName'),
  clearQuestionImageBtn: document.querySelector('#clearQuestionImageBtn'),
  generatePlanBtn: document.querySelector('#generatePlanBtn'),
  backHomeBtn: document.querySelector('#backHomeBtn'),
  downloadVideoBtn: document.querySelector('#downloadVideoBtn'),
  lessonTitle: document.querySelector('#lessonTitle'),
  planMeta: document.querySelector('#planMeta'),
  planOutput: document.querySelector('#planOutput'),
  segmentList: document.querySelector('#segmentList'),
  segmentDetail: document.querySelector('#segmentDetail'),
  generateCodeBtn: document.querySelector('#generateCodeBtn'),
  generateFullBtn: document.querySelector('#generateFullBtn'),
  speechMeta: document.querySelector('#speechMeta'),
  speechOutput: document.querySelector('#speechOutput'),
  audioOutput: document.querySelector('#audioOutput'),
  renderBtn: document.querySelector('#renderBtn'),
  codeOutput: document.querySelector('#codeOutput'),
  videoOutput: document.querySelector('#videoOutput'),
  preloadVideo: document.querySelector('#preloadVideo'),
  preparingPanel: document.querySelector('#preparingPanel'),
  preparingTitle: document.querySelector('#preparingTitle'),
  preparingMessage: document.querySelector('#preparingMessage'),
  preparingBar: document.querySelector('#preparingBar'),
  playerControls: document.querySelector('#playerControls'),
  playPauseBtn: document.querySelector('#playPauseBtn'),
  fullscreenBtn: document.querySelector('#fullscreenBtn'),
  seekBar: document.querySelector('#seekBar'),
  currentTimeText: document.querySelector('#currentTimeText'),
  durationText: document.querySelector('#durationText'),
  videoOverlay: document.querySelector('#videoOverlay'),
  karaAskForm: document.querySelector('#karaAskForm'),
  karaQuestionInput: document.querySelector('#karaQuestionInput'),
  karaTimestamp: document.querySelector('#karaTimestamp'),
  karaSendBtn: document.querySelector('#karaSendBtn'),
  karaChat: document.querySelector('#karaChat'),
  logOutput: document.querySelector('#logOutput'),
  renderMeta: document.querySelector('#renderMeta')
};

function setStatus(message, isError = false) {
  els.statusText.textContent = message;
  els.statusText.classList.toggle('error', isError);
}

function startPreparingProgress(title) {
  clearTimeout(preparingTimer);
  preparingProgress = 4 + Math.random() * 3;
  els.preparingTitle.textContent = title || els.lessonTitle.textContent || 'Ders hazırlanıyor';
  els.preparingMessage.textContent = preparingMessages[0];
  els.preparingBar.style.width = `${preparingProgress}%`;
  els.preparingPanel.classList.remove('hidden');
  setVideoOverlay('', false);

  const tick = () => {
    const messageIndex = Math.min(
      preparingMessages.length - 1,
      Math.floor((preparingProgress / 100) * preparingMessages.length)
    );
    const remaining = 96 - preparingProgress;
    const randomStep = Math.max(0.4, Math.min(4.8, remaining * (0.018 + Math.random() * 0.028)));
    preparingProgress = Math.min(96, preparingProgress + randomStep);
    els.preparingMessage.textContent = preparingMessages[messageIndex];
    els.preparingBar.style.width = `${preparingProgress}%`;

    const nextDelay = 900 + Math.random() * 1900;
    preparingTimer = setTimeout(tick, nextDelay);
  };

  preparingTimer = setTimeout(tick, 900 + Math.random() * 900);
}

function stopPreparingProgress({ complete = false, error = null } = {}) {
  clearTimeout(preparingTimer);
  if (error) {
    els.preparingMessage.textContent = error;
    els.preparingBar.style.width = `${Math.max(preparingProgress, 12)}%`;
    els.preparingPanel.classList.remove('hidden');
    return;
  }
  if (complete) {
    preparingProgress = 100;
    els.preparingBar.style.width = '100%';
  }
  els.preparingPanel.classList.add('hidden');
}

function showStudio() {
  els.homeView.classList.add('hidden');
  els.studioView.classList.remove('hidden');
}

function showHome() {
  els.studioView.classList.add('hidden');
  els.homeView.classList.remove('hidden');
}

function setActiveChip(groupSelector, activeButton) {
  document.querySelectorAll(groupSelector).forEach((button) => {
    button.classList.toggle('active', button === activeButton);
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function authHeaders() {
  const token = state.auth.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function saveAuthSession(session, profile = null) {
  state.auth.session = session || null;
  state.auth.profile = profile || null;
  if (session) {
    localStorage.setItem('karaAuthSession', JSON.stringify({ session, profile }));
  } else {
    localStorage.removeItem('karaAuthSession');
  }
}

function loadStoredAuthSession() {
  try {
    const stored = JSON.parse(localStorage.getItem('karaAuthSession') || 'null');
    if (stored?.session?.access_token) {
      state.auth.session = stored.session;
      state.auth.profile = stored.profile || null;
    }
  } catch {
    saveAuthSession(null);
  }
}

function showAuth(message = '', isError = false) {
  els.authGate.classList.remove('hidden');
  els.appShell.classList.add('hidden');
  els.authMessage.textContent = message;
  els.authMessage.classList.toggle('error', isError);
}

function showApp() {
  els.authGate.classList.add('hidden');
  els.appShell.classList.remove('hidden');
  const email = state.auth.profile?.email || state.auth.session?.user?.email || '';
  els.userEmailText.textContent = email;
  refreshLessonHistory().catch(() => {});
}

function setAuthMode(mode) {
  state.auth.mode = mode;
  const isSignup = mode === 'signup';
  els.authNameInput.classList.toggle('hidden', !isSignup);
  els.authSubmitBtn.textContent = isSignup ? 'Hesap olustur' : 'Giris yap';
  els.authModeBtn.textContent = isSignup ? 'Giris yap' : 'Hesap olustur';
  els.authPasswordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
  els.authMessage.textContent = '';
  els.authMessage.classList.remove('error');
}

function shortDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function beginNewLesson() {
  state.plan = null;
  state.lessonId = null;
  state.selectedSegment = null;
  state.speechBySegment = new Map();
  resetProgressivePlayback();
  resetKaraChat();
  renderLessonHistory();
  showHome();
  setStatus('Hazir');
}

function renderLessonHistory() {
  const lessons = state.lessons || [];
  const query = state.lessonSearch.trim().toLowerCase();
  const visibleLessons = query
    ? lessons.filter((lesson) => String(lesson.title || lesson.topic || 'Ders').toLowerCase().includes(query))
    : lessons;
  els.historyList.innerHTML = `
    <button class="historyItem ${state.lessonId ? '' : 'active'}" type="button" data-new-lesson="true">
      <span class="historyText">
        <strong>Yeni ders</strong>
        <small>Bir konu sec ve uret</small>
      </span>
    </button>
    <label class="historySearch">
      <input id="lessonSearchInput" type="search" value="${escapeHtml(state.lessonSearch)}" placeholder="Derslerde ara">
    </label>
    ${visibleLessons.map((lesson) => `
      <button class="historyItem ${lesson.id === state.lessonId ? 'active' : ''}" type="button" data-lesson-id="${escapeHtml(lesson.id)}">
        <span class="historyText">
          <strong>${escapeHtml(lesson.title || lesson.topic || 'Ders')}</strong>
        </span>
      </button>
    `).join('')}
  `;
}

async function refreshLessonHistory() {
  const data = await apiGet('/api/lessons');
  state.lessons = data.lessons || [];
  renderLessonHistory();
}

function localVideoUrl(relativePath) {
  return relativePath ? apiUrl(`/renders/${relativePath}`) : null;
}

async function loadLessonFromHistory(lessonId) {
  if (!lessonId) return;
  setStatus('Ders gecmisten yukleniyor...');
  const data = await apiGet(`/api/lessons/${encodeURIComponent(lessonId)}`);
  const plan = data.plan || {
    topic: data.lesson?.topic || data.lesson?.title || 'Ders',
    estimated_duration_minutes: data.lesson?.target_minutes || null,
    segments: (data.segments || []).map((segment) => ({
      id: segment.segment_key,
      title: segment.title,
      duration_seconds: segment.duration_seconds,
      learning_objective: segment.learning_objective,
      narration: segment.narration,
      animation: segment.animation_json
    }))
  };
  plan._lesson_id = data.lesson.id;

  state.plan = plan;
  state.lessonId = data.lesson.id;
  state.selectedSegment = plan.segments?.[0] || null;
  state.speechBySegment = new Map();
  state.playback.finalVideoUrl = null;
  resetProgressivePlayback();
  state.karaChat = (data.messages || []).map((message) => ({
    role: message.role,
    timestamp: message.timestamp_label || '',
    content: message.content
  }));

  els.lessonTitle.textContent = data.lesson.title || plan.topic || 'Ders';
  renderPlan(plan);
  renderSegments();
  renderSegmentDetail();
  renderSpeech();
  renderKaraChat();
  showStudio();

  const videoUrl = localVideoUrl(data.video?.local_video_path);
  if (videoUrl) {
    els.videoOutput.src = videoUrl;
    els.videoOutput.classList.add('visible');
    state.playback.active = false;
    setDownloadVideo(videoUrl);
    updatePlayerControls();
    setStatus('Ders gecmisten yuklendi.');
  } else {
    setDownloadVideo(null);
    setVideoOverlay('Bu ders icin video kaydi bulunamadi.', true);
    updateKaraAskVisibility();
    setStatus('Ders gecmisten yuklendi, video bulunamadi.');
  }
  renderLessonHistory();
}

async function authApi(path, payload = null, options = {}) {
  const response = await fetch(apiUrl(path), {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Kimlik islemi basarisiz oldu.');
  }
  return data;
}

async function apiGet(path) {
  const response = await fetch(apiUrl(path), {
    headers: authHeaders()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      saveAuthSession(null);
      showAuth('Oturum suresi doldu. Lutfen tekrar giris yap.', true);
    }
    throw new Error(data.error || 'Istek basarisiz oldu.');
  }
  return data;
}

async function api(path, payload) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      saveAuthSession(null);
      showAuth('Oturum suresi doldu. Lutfen tekrar giris yap.', true);
    }
    const error = new Error(data.error || 'Istek basarisiz oldu.');
    error.details = data;
    throw error;
  }
  return data;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Fotoğraf okunamadı.'));
    reader.readAsDataURL(file);
  });
}

async function selectedQuestionImagePayload() {
  const file = els.questionImageInput.files?.[0];
  if (!file) {
    return null;
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Lütfen bir fotoğraf dosyası seçin.');
  }
  return {
    mimeType: file.type,
    data: await readFileAsDataUrl(file)
  };
}

function clearQuestionImage() {
  els.questionImageInput.value = '';
  els.questionImageName.textContent = 'Fotoğraf eklenmedi';
  els.clearQuestionImageBtn.classList.add('hidden');
}

function renderPlan(plan) {
  const misconceptions = Array.isArray(plan.common_misconceptions)
    ? plan.common_misconceptions
    : [];

  els.planMeta.textContent = `${plan.estimated_duration_minutes || '?'} dk | ${(plan.segments || []).length} segment`;
  els.planOutput.classList.remove('empty');
  els.planOutput.innerHTML = `
    <div class="row">
      <strong>Cekirdek fikir</strong>
      <div>${escapeHtml(plan.core_insight)}</div>
    </div>
    <div class="row">
      <strong>Acilis</strong>
      <div>${escapeHtml(plan.hook?.question)}</div>
    </div>
    <div class="row">
      <strong>Analoji</strong>
      <div>${escapeHtml(plan.analogy?.everyday_scenario)}</div>
    </div>
    <div class="row">
      <strong>Yanlis anlamalar</strong>
      <div>
        ${misconceptions.map((item) => `
          <span class="pill">${escapeHtml(item.misconception)}</span>
        `).join('') || '<span class="pill">Yok</span>'}
      </div>
    </div>
  `;
}

function renderSegments() {
  const segments = state.plan?.segments || [];
  els.segmentList.innerHTML = '';

  segments.forEach((segment) => {
    const button = document.createElement('button');
    button.className = 'segmentTab';
    button.textContent = segment.id || 'segment';
    button.classList.toggle('active', segment === state.selectedSegment);
    button.addEventListener('click', () => {
      state.selectedSegment = segment;
      renderSegments();
      renderSegmentDetail();
    });
    els.segmentList.append(button);
  });

  els.generateCodeBtn.disabled = !state.selectedSegment;
  els.generateFullBtn.disabled = !segments.length;
}

function renderSegmentDetail() {
  const segment = state.selectedSegment;
  if (!segment) {
    els.segmentDetail.classList.add('empty');
    els.segmentDetail.textContent = 'Bir segment sec.';
    return;
  }

  els.segmentDetail.classList.remove('empty');
  els.segmentDetail.innerHTML = `
    <div class="row">
      <strong>${escapeHtml(segment.title || segment.id)}</strong>
      <div>${escapeHtml(segment.learning_objective)}</div>
    </div>
    <div class="row">
      <strong>Anlatim</strong>
      <div>${escapeHtml(segment.narration)}</div>
    </div>
    <div class="row">
      <strong>Animasyon</strong>
      <div>${escapeHtml(segment.animation?.description)}</div>
      <span class="pill">${escapeHtml(segment.animation?.type)}</span>
      <span class="pill">${escapeHtml(segment.duration_seconds)} sn</span>
    </div>
  `;
  renderSpeech();
}

function renderSpeech() {
  const segmentId = state.selectedSegment?.id;
  const speechState = segmentId ? state.speechBySegment.get(segmentId) : null;

  if (!speechState) {
    els.speechMeta.textContent = '';
    els.speechOutput.classList.add('empty');
    els.speechOutput.textContent = 'Henuz speech yok.';
    els.audioOutput.classList.remove('visible');
    els.audioOutput.removeAttribute('src');
    return;
  }

  els.speechMeta.textContent = `${speechState.voiceName || 'Ses'} | ${speechState.durationSeconds.toFixed(1)} sn`;
  els.speechOutput.classList.remove('empty');
  els.speechOutput.innerHTML = `
    <div class="row">
      <strong>Ses metni</strong>
      <div>${escapeHtml(speechState.speech.speech_text)}</div>
    </div>
    <div class="row">
      <strong>Senkron ipuclari</strong>
      <div>
        ${(speechState.speech.cue_plan || []).map((cue) => `
          <span class="pill">%${escapeHtml(cue.at_percent)} ${escapeHtml(cue.visual_action)}</span>
        `).join('') || '<span class="pill">Yok</span>'}
      </div>
    </div>
  `;
  els.audioOutput.src = `${speechState.audioUrl}?t=${Date.now()}`;
  els.audioOutput.classList.add('visible');
}

async function startFullLessonGeneration() {
  const segments = state.plan?.segments || [];
  if (!segments.length) return;

  setBusy(els.generateFullBtn, true, 'Ders Uretiliyor');
  els.generateCodeBtn.disabled = true;
  els.renderBtn.disabled = true;
  els.logOutput.textContent = '';
  els.videoOutput.classList.remove('visible');
  els.renderMeta.textContent = '';
  setDownloadVideo(null);
  resetProgressivePlayback();
  startPreparingProgress(els.lessonTitle.textContent);
  setVideoOverlay('Ilk bolum hazirlaniyor...');

  try {
    setStatus('Tam ders uretiliyor...');
    const job = await api('/api/full-video', { plan: state.plan, lesson_id: state.lessonId });
    const finalJob = await pollFullVideoJob(job.id);
    els.renderMeta.textContent = 'Tam Ders';
    els.logOutput.textContent += `\nTam video: ${finalJob.result.videoUrl}`;
    state.playback.finalVideoUrl = finalJob.result.videoUrl;
    setDownloadVideo(finalJob.result.videoUrl);
    maybeStartOrContinuePlayback();
    refreshLessonHistory().catch(() => {});
    setStatus('Tam ders videosu hazir. Izleme akisi devam ediyor.');
  } catch (error) {
    els.logOutput.textContent = [error.message, error.details?.stdout, error.details?.stderr]
      .filter(Boolean)
      .join('\n\n');
    stopPreparingProgress({ error: error.message });
    setStatus(error.message, true);
  } finally {
    setBusy(els.generateFullBtn, false);
    renderSegments();
  }
}

function setBusy(button, busy, text) {
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }
  button.disabled = busy;
  button.textContent = busy ? text : button.dataset.defaultText;
}

function setVideoOverlay(message, visible = true) {
  els.videoOverlay.textContent = message;
  els.videoOverlay.classList.toggle('visible', visible);
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function renderMathMarkdown(value) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function typesetKaraChat() {
  if (!window.MathJax?.typesetPromise) {
    return;
  }
  window.MathJax.typesetPromise([els.karaChat]).catch(() => {});
}

function renderKaraChat() {
  if (!state.karaChat.length) {
    els.karaChat.classList.add('hidden');
    els.karaChat.innerHTML = '';
    return;
  }

  els.karaChat.classList.remove('hidden');
  els.karaChat.innerHTML = state.karaChat.map((message) => `
    <article class="chatMessage ${message.role === 'assistant' ? 'assistant' : 'user'}">
      <div class="chatMeta">${message.role === 'assistant' ? 'Kara' : `Sen · ${escapeHtml(message.timestamp || '')}`}</div>
      <div class="chatContent">${renderMathMarkdown(message.content)}</div>
    </article>
  `).join('');
  typesetKaraChat();
}

function resetKaraChat() {
  state.karaChat = [];
  els.karaQuestionInput.value = '';
  els.karaTimestamp.textContent = '';
  renderKaraChat();
}

function updateKaraAskVisibility() {
  const visible = els.videoOutput.classList.contains('visible');
  els.karaAskForm.classList.toggle('hidden', !visible);
  if (!visible) {
    els.karaTimestamp.textContent = '';
  }
}

function updateKaraTimestamp() {
  const hasQuestion = Boolean(els.karaQuestionInput.value.trim());
  els.karaTimestamp.textContent = hasQuestion ? formatTime(currentQuestionTimestamp()) : '';
}

function currentQuestionTimestamp() {
  if (state.playback.active) {
    return currentGlobalTime();
  }
  return els.videoOutput.currentTime || 0;
}

function captureVideoFrame() {
  if (!els.videoOutput.classList.contains('visible') || els.videoOutput.readyState < 2) {
    throw new Error('Soru sormak icin video karesi hazir degil.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = els.videoOutput.videoWidth || 1280;
  canvas.height = els.videoOutput.videoHeight || 720;
  const context = canvas.getContext('2d');
  context.drawImage(els.videoOutput, 0, 0, canvas.width, canvas.height);
  return {
    mimeType: 'image/jpeg',
    data: canvas.toDataURL('image/jpeg', 0.82)
  };
}

async function submitKaraQuestion(event) {
  event.preventDefault();
  const question = els.karaQuestionInput.value.trim();
  if (!question) {
    els.karaQuestionInput.focus();
    return;
  }

  let frame;
  let timestampSeconds;
  let timestampLabel;
  try {
    timestampSeconds = currentQuestionTimestamp();
    timestampLabel = formatTime(timestampSeconds);
    frame = captureVideoFrame();
  } catch (error) {
    setStatus(error.message, true);
    return;
  }

  const chatHistory = state.karaChat
    .filter((message) => !message.pending)
    .map((message) => ({
      role: message.role,
      timestamp: message.timestamp,
      content: message.content
    }));

  els.karaQuestionInput.value = '';
  updateKaraTimestamp();
  state.karaChat.push({ role: 'user', timestamp: timestampLabel, content: question });
  const pendingAnswer = { role: 'assistant', timestamp: timestampLabel, content: 'Dusunuyorum...', pending: true };
  state.karaChat.push(pendingAnswer);
  renderKaraChat();

  els.karaQuestionInput.disabled = true;
  els.karaSendBtn.disabled = true;
  setStatus('Kara soruyu inceliyor...');

  try {
    const data = await api('/api/ask-kara', {
      question,
      frame,
      timestamp_seconds: timestampSeconds,
      timestamp_label: timestampLabel,
      lesson_title: els.lessonTitle.textContent,
      lesson_id: state.lessonId,
      lesson_plan: state.plan,
      chat_history: chatHistory
    });
    pendingAnswer.content = data.answer || 'Bu soruya cevap uretilemedi.';
    pendingAnswer.pending = false;
    renderKaraChat();
    setStatus('Kara cevap verdi.');
  } catch (error) {
    pendingAnswer.content = `Cevap alinamadi: ${error.message}`;
    pendingAnswer.pending = false;
    renderKaraChat();
    setStatus(error.message, true);
  } finally {
    els.karaQuestionInput.disabled = false;
    els.karaSendBtn.disabled = false;
    els.karaQuestionInput.focus();
  }
}

function segmentDuration(segment, index) {
  if (Number.isFinite(segment?.durationSeconds)) {
    return segment.durationSeconds;
  }
  if (Number.isFinite(segment?.tts?.durationSeconds)) {
    return segment.tts.durationSeconds;
  }
  if (index === state.playback.currentIndex && Number.isFinite(els.videoOutput.duration)) {
    return els.videoOutput.duration;
  }
  return 0;
}

function elapsedBeforeSegment(index) {
  return state.playback.playable
    .slice(0, Math.max(0, index))
    .reduce((total, segment, segmentIndex) => total + segmentDuration(segment, segmentIndex), 0);
}

function availableDuration() {
  return state.playback.playable
    .reduce((total, segment, index) => total + segmentDuration(segment, index), 0);
}

function currentGlobalTime() {
  if (!state.playback.active || state.playback.currentIndex < 0) {
    return 0;
  }
  return elapsedBeforeSegment(state.playback.currentIndex) + (els.videoOutput.currentTime || 0);
}

function updatePlayerControls() {
  const standaloneVideo = !state.playback.active && els.videoOutput.classList.contains('visible');
  const duration = standaloneVideo && Number.isFinite(els.videoOutput.duration)
    ? els.videoOutput.duration
    : availableDuration();
  const current = standaloneVideo
    ? (els.videoOutput.currentTime || 0)
    : Math.min(currentGlobalTime(), duration);
  els.playerControls.classList.toggle('hidden', !state.playback.active && !els.videoOutput.classList.contains('visible'));
  els.seekBar.max = String(Math.max(0, duration));
  els.seekBar.value = String(Math.max(0, current));
  els.currentTimeText.textContent = formatTime(current);
  els.durationText.textContent = formatTime(duration);
  els.playPauseBtn.textContent = els.videoOutput.paused ? 'Oynat' : 'II';
  els.playPauseBtn.setAttribute('aria-label', els.videoOutput.paused ? 'Oynat' : 'Duraklat');
  updateKaraAskVisibility();
  updateKaraTimestamp();
}

function shouldShowPlayerControls() {
  return state.playback.active || els.videoOutput.classList.contains('visible');
}

function showPlayerControlsTemporarily() {
  if (!shouldShowPlayerControls()) {
    return;
  }

  els.playerControls.classList.remove('hidden', 'autoHidden');
  clearTimeout(controlsHideTimer);
  controlsHideTimer = setTimeout(() => {
    if (!els.videoOutput.paused && shouldShowPlayerControls()) {
      els.playerControls.classList.add('autoHidden');
    }
  }, 4000);
}

function keepPlayerControlsVisible() {
  clearTimeout(controlsHideTimer);
  if (shouldShowPlayerControls()) {
    els.playerControls.classList.remove('hidden', 'autoHidden');
  }
}

function hidePlayerControlsSoon() {
  clearTimeout(controlsHideTimer);
  controlsHideTimer = setTimeout(() => {
    if (!els.videoOutput.paused && shouldShowPlayerControls()) {
      els.playerControls.classList.add('autoHidden');
    }
  }, 4000);
}

function togglePlayback() {
  if (!state.playback.active && state.playback.playable.length) {
    state.playback.userPaused = false;
    playSegmentAt(0);
    return;
  }

  if (!els.videoOutput.classList.contains('visible')) {
    return;
  }

  if (els.videoOutput.paused) {
    state.playback.userPaused = false;
    els.videoOutput.play().catch(() => {});
  } else {
    state.playback.userPaused = true;
    els.videoOutput.pause();
  }
  updatePlayerControls();
  showPlayerControlsTemporarily();
}

function skipPlayback(seconds) {
  if (!els.videoOutput.classList.contains('visible')) {
    return;
  }
  const base = state.playback.active ? currentGlobalTime() : (els.videoOutput.currentTime || 0);
  seekToGlobalTime(base + seconds);
  showPlayerControlsTemporarily();
}

async function toggleFullscreen() {
  const target = document.querySelector('.videoShell');
  if (!document.fullscreenElement) {
    await target.requestFullscreen?.();
    return;
  }
  await document.exitFullscreen?.();
}

function setDownloadVideo(videoUrl) {
  if (!videoUrl) {
    els.downloadVideoBtn.classList.add('hidden');
    els.downloadVideoBtn.removeAttribute('href');
    return;
  }
  els.downloadVideoBtn.href = videoUrl;
  els.downloadVideoBtn.classList.remove('hidden');
}

function seekToGlobalTime(seconds) {
  if (!state.playback.active && els.videoOutput.classList.contains('visible')) {
    els.videoOutput.currentTime = Math.max(0, Math.min(Number(seconds) || 0, els.videoOutput.duration || 0));
    updatePlayerControls();
    return;
  }

  const target = Math.max(0, Math.min(Number(seconds) || 0, availableDuration()));
  let cursor = 0;

  for (let index = 0; index < state.playback.playable.length; index += 1) {
    const duration = segmentDuration(state.playback.playable[index], index);
    if (target <= cursor + duration || index === state.playback.playable.length - 1) {
      playSegmentAt(index, Math.max(0, target - cursor), !els.videoOutput.paused);
      return;
    }
    cursor += duration;
  }
}

function resetProgressivePlayback() {
  state.playback = {
    active: false,
    currentIndex: -1,
    playable: [],
    finalVideoUrl: null,
    waitingForNext: false,
    userPaused: false
  };
  els.videoOutput.pause();
  els.videoOutput.removeAttribute('src');
  els.videoOutput.load();
  els.videoOutput.classList.remove('visible');
  els.preloadVideo.removeAttribute('src');
  els.preloadVideo.load();
  stopPreparingProgress();
  clearTimeout(controlsHideTimer);
  els.playerControls.classList.add('hidden');
  els.playerControls.classList.remove('autoHidden');
  els.seekBar.value = '0';
  els.seekBar.max = '0';
  els.currentTimeText.textContent = '0:00';
  els.durationText.textContent = '0:00';
  setDownloadVideo(null);
  setVideoOverlay('', false);
  updateKaraAskVisibility();
}

function absoluteVideoUrl(videoUrl) {
  return apiUrl(videoUrl);
}

function updatePlayableSegments(job) {
  state.playback.playable = (job.segments || [])
    .map((segment, index) => ({ ...segment, index }))
    .filter((segment) => segment.videoUrl);
  if (job.result?.videoUrl) {
    state.playback.finalVideoUrl = job.result.videoUrl;
  }
  updatePlayerControls();
}

function playSegmentAt(index, startTime = 0, shouldPlay = true) {
  const segment = state.playback.playable[index];
  if (!segment) {
    state.playback.waitingForNext = true;
    setVideoOverlay('Sonraki bolum hazirlaniyor...');
    return;
  }

  const targetUrl = absoluteVideoUrl(segment.videoUrl);
  const sourceChanged = els.videoOutput.getAttribute('src') !== targetUrl;
  state.playback.active = true;
  state.playback.waitingForNext = false;
  state.playback.currentIndex = index;
  stopPreparingProgress({ complete: true });
  els.videoOutput.classList.add('visible');
  showPlayerControlsTemporarily();
  setVideoOverlay('', false);
  const applyStartTime = () => {
    if (Number.isFinite(startTime) && startTime > 0) {
      els.videoOutput.currentTime = Math.min(startTime, els.videoOutput.duration || startTime);
    }
    updatePlayerControls();
    if (shouldPlay && !state.playback.userPaused) {
      els.videoOutput.play().catch(() => {
        setVideoOverlay('Video hazir. Oynatmak icin play tusuna basin.');
      });
    }
  };

  if (sourceChanged) {
    els.videoOutput.addEventListener('loadedmetadata', applyStartTime, { once: true });
    els.videoOutput.src = targetUrl;
    els.videoOutput.load();
  } else {
    applyStartTime();
  }
  preloadNextSegment();
  updatePlayerControls();
}

function preloadNextSegment() {
  const next = state.playback.playable[state.playback.currentIndex + 1];
  if (!next) {
    els.preloadVideo.removeAttribute('src');
    els.preloadVideo.load();
    return;
  }
  els.preloadVideo.src = absoluteVideoUrl(next.videoUrl);
  els.preloadVideo.load();
}

function maybeStartOrContinuePlayback() {
  if (!state.playback.active && state.playback.playable.length) {
    playSegmentAt(0);
    return;
  }

  if (state.playback.waitingForNext) {
    const nextIndex = state.playback.currentIndex + 1;
    if (state.playback.playable[nextIndex]) {
      playSegmentAt(nextIndex);
      return;
    }
  }

  preloadNextSegment();
}

async function loadConfig() {
  const response = await fetch(apiUrl('/api/config'));
  const config = await response.json();
  els.configText.textContent = `${(config.llmProvider || 'LLM').toUpperCase()} | Plan ${config.planModel} | Kod ${config.codeModel} | ${config.targetVideoMinutes || 10} dk/${config.targetSegmentCount || 8} segment | TTS ${config.ttsProvider || 'TTS'} ${config.ttsVoice || 'yok'} | Manim ${config.manimQuality} | Font ${config.manimFont || 'varsayilan'}`;
  if (config.targetVideoMinutes && !els.targetMinutesInput.dataset.touched) {
    els.targetMinutesInput.value = config.targetVideoMinutes;
  }
  if (config.targetSegmentCount && !els.targetSegmentsInput.dataset.touched) {
    els.targetSegmentsInput.value = config.targetSegmentCount;
  }
  if (!config.hasApiKey) {
    const keyName = config.llmProvider === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY';
    setStatus(`.env icinde ${keyName} bekleniyor`, true);
  } else if (!config.hasTtsCredentials) {
    setStatus('.env icinde GOOGLE_APPLICATION_CREDENTIALS bekleniyor', true);
  }
}

async function initAuth() {
  loadStoredAuthSession();
  setAuthMode('login');

  if (!state.auth.session?.access_token) {
    showAuth();
    return;
  }

  try {
    const data = await authApi('/api/auth/me', null, { method: 'GET' });
    state.auth.profile = data.profile || state.auth.profile;
    saveAuthSession(state.auth.session, state.auth.profile);
    showApp();
  } catch {
    if (state.auth.session?.refresh_token) {
      try {
        const refreshed = await authApi('/api/auth/refresh', {
          refresh_token: state.auth.session.refresh_token
        });
        if (refreshed.session) {
          saveAuthSession(refreshed.session, refreshed.profile);
          showApp();
          return;
        }
      } catch {
        // Fall through to login.
      }
    }
    saveAuthSession(null);
    showAuth('Lutfen giris yap.', false);
  }
}

els.generatePlanBtn.addEventListener('click', async () => {
  const topic = els.topicInput.value.trim();
  let questionImage = null;
  try {
    questionImage = await selectedQuestionImagePayload();
  } catch (error) {
    setStatus(error.message, true);
    return;
  }

  if (!topic && !questionImage) {
    setStatus('Konu girin.', true);
    els.topicInput.focus();
    return;
  }

  setBusy(els.generatePlanBtn, true, 'Olusturuluyor');
  setStatus(questionImage ? 'Gemini soru fotografini cozumluyor...' : 'Gemini plan uretiyor...');
  const initialTitle = questionImage ? 'Soru çözümü hazırlanıyor' : topic;
  els.lessonTitle.textContent = initialTitle;
  showStudio();
  els.logOutput.textContent = '';
  els.videoOutput.classList.remove('visible');
  els.renderMeta.textContent = '';
  state.lessonId = null;
  resetProgressivePlayback();
  resetKaraChat();
  startPreparingProgress(initialTitle);

  try {
    const data = questionImage
      ? await api('/api/question-plan', {
          image: questionImage,
          student_level: els.levelInput.value,
          note: topic
        })
      : await api('/api/plan', {
          topic,
          student_level: els.levelInput.value,
          target_video_minutes: Number(els.targetMinutesInput.value || 10),
          target_segment_count: Number(els.targetSegmentsInput.value || 8),
          prior_knowledge: els.priorInput.value,
          interrupt_question: els.interruptInput.value.trim() || null
        });
    state.plan = data.plan;
    state.lessonId = data.lessonId || data.plan?._lesson_id || null;
    refreshLessonHistory().catch(() => {});
    state.selectedSegment = data.plan?.segments?.[0] || null;
    state.speechBySegment = new Map();
    els.lessonTitle.textContent = data.plan?.topic || initialTitle;
    renderPlan(state.plan);
    renderSegments();
    renderSegmentDetail();
    renderSpeech();
    els.codeOutput.value = '';
    els.renderBtn.disabled = true;
    setStatus('Plan hazir. Tam ders otomatik baslatiliyor...');
    startFullLessonGeneration();
  } catch (error) {
    stopPreparingProgress({ error: error.message });
    setStatus(error.message, true);
  } finally {
    setBusy(els.generatePlanBtn, false);
  }
});

async function buildSegmentAssets(segment) {
  setStatus(`${segment.id}: Gemini speech metni uretiyor...`);
  const speechData = await api('/api/speech-script', { segment });

    setStatus(`${segment.id}: Google Cloud TTS ses uretiyor...`);
  const ttsData = await api('/api/tts', {
    text: speechData.speech.speech_text,
    segment_id: segment.id
  });

  const speechState = {
    speech: speechData.speech,
    audioUrl: ttsData.audioUrl,
    audioRelativePath: ttsData.audioRelativePath,
    durationSeconds: ttsData.durationSeconds,
    voiceName: ttsData.usedFallback ? `${ttsData.voiceName} (fallback)` : ttsData.voiceName,
    voiceId: ttsData.voiceId
  };
  state.speechBySegment.set(segment.id, speechState);
  renderSpeech();

  setStatus(`${segment.id}: Manim kodu konusma suresine gore uretiliyor...`);
  const codeData = await api('/api/manim-code', {
    animation: segment.animation,
    duration_seconds: Math.max(6, Math.round(ttsData.durationSeconds)),
    speech: {
      speech_text: speechData.speech.speech_text,
      duration_seconds: ttsData.durationSeconds,
      cue_plan: speechData.speech.cue_plan || []
    },
    segment_id: segment.id
  });

  return {
    code: codeData.code,
    speechState
  };
}

els.generateCodeBtn.addEventListener('click', async () => {
  const segment = state.selectedSegment;
  if (!segment) return;

  setBusy(els.generateCodeBtn, true, 'Uretiliyor');
  els.codeOutput.value = '';
  els.renderBtn.disabled = true;

  try {
    const { code } = await buildSegmentAssets(segment);
    els.codeOutput.value = code;
    els.renderBtn.disabled = false;
    setStatus('Manim kodu hazir.');
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setBusy(els.generateCodeBtn, false);
    els.generateCodeBtn.disabled = !state.selectedSegment;
  }
});

els.generateFullBtn.addEventListener('click', startFullLessonGeneration);

async function pollFullVideoJob(jobId) {
  while (true) {
    const response = await fetch(apiUrl(`/api/jobs/${jobId}`), {
      headers: authHeaders()
    });
    const job = await response.json();
    if (!response.ok) {
      throw new Error(job.error || 'Job durumu okunamadi.');
    }

    const segmentLines = (job.segments || [])
      .map((segment) => `${segment.id}: ${segment.status}${segment.videoUrl ? ` -> ${segment.videoUrl}` : ''}`)
      .join('\n');

    updatePlayableSegments(job);
    maybeStartOrContinuePlayback();

    els.logOutput.textContent = [
      `Job: ${job.id}`,
      `Durum: ${job.status}`,
      `Ilerleme: ${job.progress}/${job.total}`,
      `Mesaj: ${job.message || ''}`,
      `Anlik: ${job.current || ''}`,
      '',
      segmentLines
    ].join('\n');
    setStatus(`${job.progress}/${job.total} segment | ${job.current || job.status}`);

    if (job.status === 'done') {
      setDownloadVideo(job.result?.videoUrl);
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(job.error || 'Tam ders uretimi basarisiz oldu.');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

els.renderBtn.addEventListener('click', async () => {
  const code = els.codeOutput.value.trim();
  if (!code) {
    setStatus('Manim kodu bos.', true);
    return;
  }

  setBusy(els.renderBtn, true, 'Render');
  setStatus('Manim render ve ses birlestirme calisiyor...');
  els.logOutput.textContent = '';
  els.videoOutput.classList.remove('visible');
  els.renderMeta.textContent = '';
  resetProgressivePlayback();
  startPreparingProgress(els.lessonTitle.textContent);

  try {
    const speechState = state.selectedSegment?.id
      ? state.speechBySegment.get(state.selectedSegment.id)
      : null;
    const data = await api('/api/render', {
      code,
      segment_id: state.selectedSegment?.id || 's1',
      audioRelativePath: speechState?.audioRelativePath || null
    });
    stopPreparingProgress({ complete: true });
    els.videoOutput.src = `${data.videoUrl}?t=${Date.now()}`;
    els.videoOutput.classList.add('visible');
    showPlayerControlsTemporarily();
    state.playback.active = false;
    els.logOutput.textContent = [data.stdout, data.stderr].filter(Boolean).join('\n');
    els.renderMeta.textContent = data.hasMusic
      ? (data.hasAudio ? 'Sesli + Muzik' : 'Muzikli')
      : (data.hasAudio ? 'Sesli' : 'Sessiz');
    setStatus(data.hasMusic
      ? `Video hazir. Muzik: ${data.backgroundMusic}`
      : (data.hasAudio ? 'Sesli video hazir.' : 'Video hazir.'));
    updatePlayerControls();
  } catch (error) {
    stopPreparingProgress({ error: error.message });
    els.logOutput.textContent = [error.message, error.details?.stdout, error.details?.stderr]
      .filter(Boolean)
      .join('\n\n');
    setStatus(error.message, true);
  } finally {
    setBusy(els.renderBtn, false);
    els.renderBtn.disabled = !els.codeOutput.value.trim();
  }
});

els.codeOutput.addEventListener('input', () => {
  els.renderBtn.disabled = !els.codeOutput.value.trim();
});

els.videoOutput.addEventListener('ended', () => {
  if (!state.playback.active) {
    return;
  }
  const nextIndex = state.playback.currentIndex + 1;
  if (state.playback.playable[nextIndex]) {
    playSegmentAt(nextIndex, 0, !state.playback.userPaused);
    return;
  }
  if (state.playback.finalVideoUrl && nextIndex >= state.playback.playable.length) {
    setVideoOverlay('Ders tamamlandi. Tam video hazir.', false);
    updatePlayerControls();
    return;
  }
  state.playback.waitingForNext = true;
  setVideoOverlay('Sonraki bolum hazirlaniyor...');
  updatePlayerControls();
});

els.videoOutput.addEventListener('timeupdate', updatePlayerControls);
els.videoOutput.addEventListener('loadedmetadata', updatePlayerControls);
els.videoOutput.addEventListener('durationchange', updatePlayerControls);
els.videoOutput.addEventListener('play', () => {
  state.playback.userPaused = false;
  updatePlayerControls();
  showPlayerControlsTemporarily();
});
els.videoOutput.addEventListener('pause', () => {
  updatePlayerControls();
  keepPlayerControlsVisible();
});

els.videoOutput.addEventListener('click', () => {
  togglePlayback();
});

document.querySelector('.videoShell').addEventListener('mousemove', showPlayerControlsTemporarily);
document.querySelector('.videoShell').addEventListener('mouseleave', hidePlayerControlsSoon);
els.playerControls.addEventListener('mouseenter', keepPlayerControlsVisible);
els.playerControls.addEventListener('mouseleave', hidePlayerControlsSoon);

els.playPauseBtn.addEventListener('click', () => {
  togglePlayback();
});

els.seekBar.addEventListener('input', () => {
  keepPlayerControlsVisible();
  seekToGlobalTime(els.seekBar.value);
});

els.fullscreenBtn.addEventListener('click', () => {
  showPlayerControlsTemporarily();
  toggleFullscreen().catch(() => {});
});

els.authModeBtn.addEventListener('click', () => {
  setAuthMode(state.auth.mode === 'login' ? 'signup' : 'login');
});

els.historyList.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.newLesson) {
    beginNewLesson();
    return;
  }
  if (button.dataset.lessonId) {
    loadLessonFromHistory(button.dataset.lessonId).catch((error) => setStatus(error.message, true));
  }
});

els.logoHomeBtn.addEventListener('click', beginNewLesson);

els.historyList.addEventListener('input', (event) => {
  if (event.target?.id !== 'lessonSearchInput') {
    return;
  }
  state.lessonSearch = event.target.value;
  renderLessonHistory();
  const searchInput = document.querySelector('#lessonSearchInput');
  searchInput?.focus();
  searchInput?.setSelectionRange(state.lessonSearch.length, state.lessonSearch.length);
});

els.authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = els.authEmailInput.value.trim();
  const password = els.authPasswordInput.value;
  const displayName = els.authNameInput.value.trim();
  const isSignup = state.auth.mode === 'signup';
  els.authSubmitBtn.disabled = true;
  els.authModeBtn.disabled = true;
  els.authMessage.textContent = isSignup ? 'Hesap olusturuluyor...' : 'Giris yapiliyor...';
  els.authMessage.classList.remove('error');

  try {
    const data = await authApi(isSignup ? '/api/auth/signup' : '/api/auth/login', {
      email,
      password,
      display_name: displayName
    });
    if (!data.session?.access_token) {
      setAuthMode('login');
      showAuth('Hesap olustu. E-posta onayi gerekiyorsa onayladiktan sonra giris yap.', false);
      return;
    }
    saveAuthSession(data.session, data.profile);
    showApp();
    setStatus('Hazir');
  } catch (error) {
    els.authMessage.textContent = error.message;
    els.authMessage.classList.add('error');
  } finally {
    els.authSubmitBtn.disabled = false;
    els.authModeBtn.disabled = false;
  }
});

els.logoutBtn.addEventListener('click', () => {
  saveAuthSession(null);
  state.lessons = [];
  resetProgressivePlayback();
  resetKaraChat();
  showHome();
  showAuth('Cikis yapildi.', false);
});

els.karaQuestionInput.addEventListener('input', updateKaraTimestamp);
els.karaAskForm.addEventListener('submit', submitKaraQuestion);

els.topicInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey) {
    return;
  }
  event.preventDefault();
  if (!els.generatePlanBtn.disabled) {
    els.generatePlanBtn.click();
  }
});

document.addEventListener('keydown', (event) => {
  const tagName = event.target?.tagName?.toLowerCase();
  const isTyping = ['input', 'textarea', 'select', 'button', 'a'].includes(tagName) || event.target?.isContentEditable;
  if (isTyping) {
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    togglePlayback();
    showPlayerControlsTemporarily();
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    skipPlayback(-5);
    return;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    skipPlayback(5);
  }
});

[els.targetMinutesInput, els.targetSegmentsInput].forEach((input) => {
  input.addEventListener('input', () => {
    input.dataset.touched = 'true';
  });
});

document.querySelectorAll('[data-level]').forEach((button) => {
  button.addEventListener('click', () => {
    els.levelInput.value = button.dataset.level;
    setActiveChip('[data-level]', button);
  });
});

document.querySelectorAll('[data-minutes]').forEach((button) => {
  button.addEventListener('click', () => {
    els.targetMinutesInput.value = button.dataset.minutes;
    els.targetSegmentsInput.value = button.dataset.segments;
    els.targetMinutesInput.dataset.touched = 'true';
    els.targetSegmentsInput.dataset.touched = 'true';
    setActiveChip('[data-minutes]', button);
  });
});

document.querySelectorAll('[data-topic]').forEach((button) => {
  button.addEventListener('click', () => {
    els.topicInput.value = button.dataset.topic;
    els.topicInput.focus();
  });
});

els.questionImageInput.addEventListener('change', () => {
  const file = els.questionImageInput.files?.[0];
  if (!file) {
    clearQuestionImage();
    return;
  }
  els.questionImageName.textContent = file.name;
  els.clearQuestionImageBtn.classList.remove('hidden');
  setStatus('Soru fotoğrafı eklendi.');
});

els.clearQuestionImageBtn.addEventListener('click', clearQuestionImage);

els.backHomeBtn.addEventListener('click', () => {
  resetProgressivePlayback();
  showHome();
  setStatus('Hazır');
});

loadConfig()
  .then(() => initAuth())
  .catch((error) => {
    showAuth(error.message, true);
    setStatus(error.message, true);
  });
