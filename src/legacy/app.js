import { LiveBoardPlayer } from './liveBoardPlayer.js';
import { FragmentedMp4Player } from './fragmentedMp4Player.js';

// Existing production workflow, loaded after the React shell mounts.
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
    mode: 'login',
    googleOAuthEnabled: false
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
  liveManim: {
    active: false,
    enabled: false,
    failed: false,
    browserFailed: false,
    jobId: null,
    streamUrl: null,
    introDurationSeconds: 0,
    handoffSeconds: 0,
    lastPlaybackSeconds: 0
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
  workspaceLoading: document.querySelector('#workspaceLoading'),
  workspaceLoadingTitle: document.querySelector('#workspaceLoadingTitle'),
  workspaceLoadingMessage: document.querySelector('#workspaceLoadingMessage'),
  authGate: document.querySelector('#authGate'),
  authForm: document.querySelector('#authForm'),
  authTitle: document.querySelector('#authTitle'),
  authSubtitle: document.querySelector('#authSubtitle'),
  authNameField: document.querySelector('#authNameField'),
  authNameInput: document.querySelector('#authNameInput'),
  authEmailField: document.querySelector('#authEmailField'),
  authEmailInput: document.querySelector('#authEmailInput'),
  authPasswordField: document.querySelector('#authPasswordField'),
  authPasswordLabel: document.querySelector('#authPasswordLabel'),
  authPasswordInput: document.querySelector('#authPasswordInput'),
  authOAuth: document.querySelector('#authOAuth'),
  googleAuthBtn: document.querySelector('#googleAuthBtn'),
  forgotPasswordBtn: document.querySelector('#forgotPasswordBtn'),
  authSubmitBtn: document.querySelector('#authSubmitBtn'),
  authModeBtn: document.querySelector('#authModeBtn'),
  authMessage: document.querySelector('#authMessage'),
  authSpamHint: document.querySelector('#authSpamHint'),
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
  liveStreamBadge: document.querySelector('#liveStreamBadge'),
  liveStreamText: document.querySelector('#liveStreamText'),
  preparingPanel: document.querySelector('#preparingPanel'),
  preparingTitle: document.querySelector('#preparingTitle'),
  preparingMessage: document.querySelector('#preparingMessage'),
  preparingBar: document.querySelector('#preparingBar'),
  videoLoadingPanel: document.querySelector('#videoLoadingPanel'),
  videoLoadingText: document.querySelector('#videoLoadingText'),
  liveManimVideo: document.querySelector('#liveManimVideo'),
  liveBoardCanvas: document.querySelector('#liveBoardCanvas'),
  liveBoardAudio: document.querySelector('#liveBoardAudio'),
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

const liveBoardPlayer = new LiveBoardPlayer({
  canvas: els.liveBoardCanvas,
  audio: els.liveBoardAudio,
  onStatus: (message) => {
    els.liveStreamText.textContent = message;
  },
  onPlaybackBlocked: () => {
    setVideoOverlay('Canlı anlatımı başlatmak için tahtaya dokun.');
  },
  onEnded: () => {
    setVideoOverlay('İlk kaliteli video bölümü hazırlanıyor...');
  }
});

function failLiveManimPlayback(error) {
  if (!state.liveManim.active && state.liveManim.browserFailed) return;
  const introDuration = Number(state.liveManim.introDurationSeconds ?? 0);
  const lastPlaybackSeconds = Math.max(
    Number(state.liveManim.lastPlaybackSeconds || 0),
    Number(els.liveManimVideo.currentTime || 0)
  );
  state.liveManim.handoffSeconds = Math.max(
    0,
    lastPlaybackSeconds - introDuration
  );
  state.liveManim.active = false;
  state.liveManim.enabled = false;
  state.liveManim.failed = true;
  state.liveManim.browserFailed = true;
  setVideoLoading(false);
  setVideoOverlay(
    `Son kare korunuyor; hazır video aynı noktadan devam edecek.${error?.message ? ` ${error.message}` : ''}`
  );
  maybeStartOrContinuePlayback();
}

const fragmentedMp4Player = new FragmentedMp4Player(els.liveManimVideo, {
  onConnected: () => {
    setVideoLoading(true, 'İlk gerçek ders segmenti hazırlanıyor...');
  },
  onFirstFragment: () => {
    stopPreparingProgress({ complete: true });
    els.liveManimVideo.classList.add('visible');
    setVideoLoading(false);
    setVideoOverlay('', false);
  },
  onFragment: () => {
    const buffered = els.liveManimVideo.buffered;
    const bufferedUntil = buffered.length ? buffered.end(buffered.length - 1) : 0;
    els.liveStreamText.textContent = `720P60 · ${Math.max(1, Math.floor(bufferedUntil))} saniye hazır`;
  },
  onInterrupted: () => {
    // Valid fragments stay playable. The regular video "ended" handler will
    // hand off from the captured timestamp after the buffered lesson is shown.
    state.liveManim.failed = true;
  },
  onError: failLiveManimPlayback
});

function setStatus(message, isError = false) {
  els.statusText.textContent = message;
  els.statusText.classList.toggle('error', isError);
}

function setWorkspaceLoading(loading, title = 'Ders yükleniyor', message = 'Video ve sohbet geçmişi hazırlanıyor...') {
  els.workspaceLoadingTitle.textContent = title;
  els.workspaceLoadingMessage.textContent = message;
  els.workspaceLoading.classList.toggle('hidden', !loading);
  els.workspaceLoading.setAttribute('aria-hidden', String(!loading));
}

function setVideoLoading(loading, message = 'Video yükleniyor...') {
  els.videoLoadingText.textContent = message;
  els.videoLoadingPanel.classList.toggle('hidden', !loading);
  els.videoLoadingPanel.setAttribute('aria-hidden', String(!loading));
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
  const isReset = mode === 'reset';
  const isUpdate = mode === 'update-password';
  const modeCopy = {
    login: {
      title: 'Tekrar hoş geldin',
      subtitle: 'Video derslerine devam etmek için giriş yap.',
      submit: 'Giriş yap',
      switch: 'Hesabın yok mu? Hesap oluştur'
    },
    signup: {
      title: 'Öğrenmeye başla',
      subtitle: 'İlk yapay zekâ destekli video dersini oluştur.',
      submit: 'Hesap oluştur',
      switch: 'Zaten hesabın var mı? Giriş yap'
    },
    reset: {
      title: 'Şifreni yenile',
      subtitle: 'Sıfırlama bağlantısını göndereceğimiz e-postayı yaz.',
      submit: 'Bağlantı gönder',
      switch: 'Giriş ekranına dön'
    },
    'update-password': {
      title: 'Yeni şifreni belirle',
      subtitle: 'Hesabın için en az 8 karakterlik yeni bir şifre oluştur.',
      submit: 'Şifreyi güncelle',
      switch: 'Giriş ekranına dön'
    }
  }[mode] || {};

  els.authTitle.textContent = modeCopy.title || '';
  els.authSubtitle.textContent = modeCopy.subtitle || '';
  els.authSubmitBtn.textContent = modeCopy.submit || '';
  els.authModeBtn.textContent = modeCopy.switch || '';
  els.authNameField.classList.toggle('hidden', !isSignup);
  els.authEmailField.classList.toggle('hidden', isUpdate);
  els.authPasswordField.classList.toggle('hidden', isReset);
  els.forgotPasswordBtn.classList.toggle('hidden', mode !== 'login');
  els.authOAuth.classList.toggle('hidden', isReset || isUpdate || !state.auth.googleOAuthEnabled);
  els.authSpamHint.classList.toggle('hidden', !isSignup && !isReset);
  els.authEmailInput.required = !isUpdate;
  els.authPasswordInput.required = !isReset;
  els.authPasswordInput.autocomplete = isSignup || isUpdate ? 'new-password' : 'current-password';
  els.authPasswordInput.minLength = isSignup || isUpdate ? 8 : 0;
  els.authPasswordInput.placeholder = isSignup || isUpdate ? 'En az 8 karakter' : 'Şifren';
  els.authPasswordLabel.textContent = isUpdate ? 'Yeni şifre' : 'Şifre';
  els.authPasswordInput.value = '';
  els.authMessage.textContent = '';
  els.authMessage.classList.remove('error', 'success');
}

function consumeAuthRedirect() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const expiresIn = Number(hash.get('expires_in') || 3600);
  const flow = hash.get('type') || query.get('auth');
  const error = hash.get('error_description') || query.get('error_description');

  if (accessToken) {
    saveAuthSession({
      access_token: accessToken,
      refresh_token: refreshToken || null,
      token_type: hash.get('token_type') || 'bearer',
      expires_in: expiresIn,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn
    });
  }

  if (window.location.hash || query.has('auth') || query.has('error_description')) {
    query.delete('auth');
    query.delete('error');
    query.delete('error_code');
    query.delete('error_description');
    const cleanUrl = `${window.location.pathname}${query.toString() ? `?${query}` : ''}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  return {
    error,
    isRecovery: flow === 'recovery' && Boolean(accessToken),
    isConfirmed: flow === 'confirmed' || flow === 'signup'
  };
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
  setWorkspaceLoading(false);
  setVideoLoading(false);
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

async function lessonVideoUrl(lessonId, video, signedVideoUrl = null) {
  if (signedVideoUrl) {
    return signedVideoUrl;
  }
  if (video?.video_storage_path) {
    try {
      const data = await apiGet(`/api/lessons/${encodeURIComponent(lessonId)}/video-url`);
      if (data.videoUrl) {
        return data.videoUrl;
      }
    } catch (error) {
      console.warn('Kalici video URL alinamadi, Railway kopyasi deneniyor.', error);
    }
  }
  return localVideoUrl(video?.local_video_path);
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

  const videoUrl = await lessonVideoUrl(data.lesson.id, data.video, data.videoUrl);
  if (videoUrl) {
    els.videoOutput.classList.add('visible');
    setVideoLoading(true, 'Ders videosu yükleniyor...');
    els.videoOutput.src = videoUrl;
    els.videoOutput.load();
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

async function monitorFullLessonJob(job) {
  setBusy(els.generateFullBtn, true, 'Ders Uretiliyor');
  els.liveStreamBadge.classList.remove('hidden');
  els.liveStreamText.textContent = `0/${job.total || 8} bölüm hazır`;

  try {
    const finalJob = await waitForFullVideoJob(job.id);
    const canonicalLive = finalJob.result?.source === 'live_manim';
    els.renderMeta.textContent = canonicalLive ? 'Canlı Ders · Aynı Final' : 'Tam Ders';
    els.logOutput.textContent += `\nTam video: ${finalJob.result.videoUrl}`;
    state.playback.finalVideoUrl = finalJob.result.videoUrl;
    setDownloadVideo(finalJob.result.videoUrl);
    maybeStartOrContinuePlayback();
    refreshLessonHistory().catch(() => {});
    setStatus(canonicalLive
      ? 'İzlediğin canlı ders aynı görüntüyle kaydedildi.'
      : 'Tam ders videosu hazir. Izleme akisi devam ediyor.');
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

async function startFullLessonGeneration() {
  const segments = state.plan?.segments || [];
  if (!segments.length) return;

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
    await monitorFullLessonJob(job);
  } catch (error) {
    stopPreparingProgress({ error: error.message });
    setStatus(error.message, true);
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
    <article class="chatMessage ${message.role === 'assistant' ? 'assistant' : 'user'} ${message.pending ? 'pending' : ''}" ${message.pending ? 'aria-busy="true"' : ''}>
      <div class="chatMeta">${message.role === 'assistant' ? 'Kara' : `Sen · ${escapeHtml(message.timestamp || '')}`}</div>
      <div class="chatContent">
        ${message.pending ? `
          <div class="chatThinking">
            <span>Kara düşünüyor</span>
            <span class="typingDots" aria-hidden="true"><i></i><i></i><i></i></span>
          </div>
        ` : renderMathMarkdown(message.content)}
      </div>
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

function activeLessonVideo() {
  if (state.liveManim.active && els.liveManimVideo.classList.contains('visible')) {
    return els.liveManimVideo;
  }
  return els.videoOutput;
}

function updateKaraAskVisibility() {
  const visible = activeLessonVideo().classList.contains('visible');
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
  if (state.liveManim.active) {
    return els.liveManimVideo.currentTime || 0;
  }
  if (state.playback.active) {
    return currentGlobalTime();
  }
  return els.videoOutput.currentTime || 0;
}

function captureVideoFrame() {
  const sourceVideo = activeLessonVideo();
  if (!sourceVideo.classList.contains('visible') || sourceVideo.readyState < 2) {
    throw new Error('Soru sormak icin video karesi hazir degil.');
  }

  const canvas = document.createElement('canvas');
  const sourceWidth = sourceVideo.videoWidth || 1280;
  const sourceHeight = sourceVideo.videoHeight || 720;
  const scale = Math.min(1, 640 / sourceWidth, 360 / sourceHeight);
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Video karesi hazirlanamadi.');
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
  return {
    mimeType: 'image/jpeg',
    data: canvas.toDataURL('image/jpeg', 0.68)
  };
}

function compactLessonPlanForKara(plan) {
  if (!plan || typeof plan !== 'object') {
    return null;
  }
  return {
    topic: String(plan.topic || '').slice(0, 240),
    core_insight: String(plan.core_insight || '').slice(0, 600),
    segments: Array.isArray(plan.segments)
      ? plan.segments.slice(0, 10).map((segment) => ({
          id: segment?.id || null,
          title: String(segment?.title || '').slice(0, 160),
          learning_objective: String(segment?.learning_objective || '').slice(0, 240),
          narration: String(segment?.narration || '').slice(0, 320)
        }))
      : []
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
    .slice(-6)
    .map((message) => ({
      role: message.role,
      timestamp: message.timestamp,
      content: String(message.content || '').slice(0, 1200)
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
      lesson_plan: compactLessonPlanForKara(state.plan),
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

function resetLiveManimStream() {
  fragmentedMp4Player.stop();
  state.liveManim = {
    active: false,
    enabled: false,
    failed: false,
    browserFailed: false,
    jobId: null,
    streamUrl: null,
    introDurationSeconds: 0,
    handoffSeconds: 0,
    lastPlaybackSeconds: 0
  };
  els.liveManimVideo.classList.remove('visible');
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
  resetLiveManimStream();
  liveBoardPlayer.stop();
  els.preloadVideo.removeAttribute('src');
  els.preloadVideo.load();
  els.liveStreamBadge.classList.add('hidden');
  els.liveStreamText.textContent = 'İlk bölüm hazırlanıyor';
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
  if (liveBoardPlayer.isActive) {
    liveBoardPlayer.stop();
  }
  state.playback.active = true;
  state.playback.waitingForNext = false;
  state.playback.currentIndex = index;
  stopPreparingProgress({ complete: true });
  showPlayerControlsTemporarily();
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
  const activateTarget = () => {
    if (els.liveManimVideo.classList.contains('visible')) {
      resetLiveManimStream();
    }
    els.videoOutput.classList.add('visible');
    setVideoOverlay('', false);
    applyStartTime();
  };

  if (sourceChanged) {
    setVideoLoading(true, 'Hazır bölüm arka planda yükleniyor...');
    els.videoOutput.addEventListener('canplay', activateTarget, { once: true });
    els.videoOutput.src = targetUrl;
    els.videoOutput.load();
  } else {
    activateTarget();
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
  if (
    state.liveManim.active
    || (
      state.liveManim.enabled
      && !state.liveManim.failed
      && !state.liveManim.browserFailed
    )
  ) {
    return;
  }
  if (!state.playback.active && state.playback.playable.length) {
    const handoffSeconds = Math.max(0, Number(state.liveManim.handoffSeconds || 0));
    if (handoffSeconds > 0) {
      let cursor = 0;
      for (let index = 0; index < state.playback.playable.length; index += 1) {
        const duration = segmentDuration(state.playback.playable[index], index);
        if (handoffSeconds <= cursor + duration) {
          playSegmentAt(
            index,
            Math.min(
              Math.max(0, handoffSeconds - cursor),
              Math.max(0, duration - 0.25)
            )
          );
          return;
        }
        cursor += duration;
      }
      // The archive has not caught up with the live playback position yet.
      // Preserve the last live frame instead of replaying the newest segment.
      setVideoLoading(false);
      setVideoOverlay('Hazır video aynı noktaya yetişiyor; son kare korunuyor.');
      return;
    }
    const liveSnapshot = liveBoardPlayer.snapshot();
    const firstSegment = state.playback.playable[0];
    const matchingLiveSegment = liveSnapshot.active && liveSnapshot.segmentId === firstSegment.id;
    const transitionTime = matchingLiveSegment
      ? Math.min(liveSnapshot.currentTime, Math.max(0, segmentDuration(firstSegment, 0) - 0.25))
      : 0;
    playSegmentAt(0, transitionTime);
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
  state.auth.googleOAuthEnabled = Boolean(config.googleOAuthEnabled);
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
    setStatus(`${config.ttsProvider || 'TTS'} kimlik bilgileri eksik`, true);
  }
  return config;
}

async function initAuth(config = {}) {
  loadStoredAuthSession();
  const redirect = consumeAuthRedirect();
  setAuthMode(redirect.isRecovery ? 'update-password' : 'login');

  if (!config.authRequired) {
    saveAuthSession(null);
    showApp();
    return;
  }

  if (redirect.error) {
    saveAuthSession(null);
    showAuth(`Bağlantı geçersiz veya süresi dolmuş: ${redirect.error}`, true);
    return;
  }

  if (redirect.isRecovery) {
    showAuth('Yeni şifreni belirleyebilirsin.');
    return;
  }

  if (!state.auth.session?.access_token) {
    showAuth(redirect.isConfirmed ? 'E-posta adresin doğrulandı. Şimdi giriş yapabilirsin.' : '');
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
    if (!questionImage) {
      const job = await api('/api/generate-lesson', {
        topic,
        student_level: els.levelInput.value,
        target_video_minutes: Number(els.targetMinutesInput.value || 10),
        target_segment_count: Number(els.targetSegmentsInput.value || 8),
        prior_knowledge: els.priorInput.value,
        interrupt_question: els.interruptInput.value.trim() || null
      });
      state.plan = job.plan || {
        topic,
        estimated_duration_minutes: Number(els.targetMinutesInput.value || 10),
        segments: []
      };
      state.lessonId = job.lessonId || job.plan?._lesson_id || null;
      state.selectedSegment = null;
      state.speechBySegment = new Map();
      els.lessonTitle.textContent = state.plan.topic || initialTitle;
      els.codeOutput.value = '';
      els.renderBtn.disabled = true;
      els.generateCodeBtn.disabled = true;
      els.liveStreamBadge.classList.remove('hidden');
      els.liveStreamText.textContent = `0/${job.total || 8} bölüm planlanıyor`;
      setVideoOverlay('İlk segment planlanıyor ve üretim motoru hazır tutuluyor...');
      setStatus('İlk segment gelir gelmez video üretimi başlayacak...');
      refreshLessonHistory().catch(() => {});
      void monitorFullLessonJob(job);
      return;
    }

    const data = await api('/api/question-plan', {
      image: questionImage,
      student_level: els.levelInput.value,
      note: topic
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

    applyFullVideoJobUpdate(job);

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

function applyFullVideoJobUpdate(job) {
  const incomingPlanCount = job.plan?.segments?.length || 0;
  const currentPlanCount = state.plan?.segments?.length || 0;
  if (incomingPlanCount > currentPlanCount) {
    const selectedId = state.selectedSegment?.id;
    state.plan = job.plan;
    state.lessonId = job.plan?._lesson_id || state.lessonId;
    state.selectedSegment = job.plan.segments.find((segment) => segment.id === selectedId)
      || job.plan.segments[0]
      || null;
    els.lessonTitle.textContent = job.plan.topic || els.lessonTitle.textContent;
    renderPlan(state.plan);
    renderSegments();
    renderSegmentDetail();
  }
  const segmentLines = (job.segments || [])
    .map((segment) => `${segment.id}: ${segment.status}${segment.videoUrl ? ` -> ${segment.videoUrl}` : ''}`)
    .join('\n');

  updateLiveManimFromJob(job);
  if (!state.liveManim.active) {
    updateLiveBoardFromJob(job);
  }
  updatePlayableSegments(job);
  maybeStartOrContinuePlayback();
  const liveManimRunning = state.liveManim.active && !els.liveManimVideo.ended;
  els.liveStreamBadge.classList.toggle(
    'hidden',
    job.status === 'failed' || (job.status === 'done' && !liveManimRunning)
  );
  els.liveStreamText.textContent = job.liveManimEnabled
    ? `MANIM · ${job.liveManim?.renderedActions || 0}/${job.liveManim?.generatedActions || 0} aksiyon${job.current ? ` · ${job.current}` : ''}`
    : `${job.progress}/${job.total} bölüm hazır${job.current ? ` · ${job.current}` : ''}`;
  els.logOutput.textContent = [
    `Job: ${job.id}`,
    `Durum: ${job.status}`,
    `Ilerleme: ${job.progress}/${job.total}`,
    `Mesaj: ${job.message || ''}`,
    `Anlik: ${job.current || ''}`,
    `Video kaynağı: ${job.result?.source || 'canlı üretim'}`,
    '',
    segmentLines
  ].join('\n');
  setStatus(`${job.progress}/${job.total} segment | ${job.current || job.status}`);
}

function updateLiveManimFromJob(job) {
  state.liveManim.enabled = Boolean(job.liveManimEnabled);
  state.liveManim.failed = job.liveManim?.status === 'failed';
  if (state.liveManim.browserFailed) return;
  if (!state.liveManim.enabled) {
    if (!state.liveManim.active) maybeStartOrContinuePlayback();
    return;
  }
  if (state.liveManim.failed) {
    // Do not reset the MediaSource here: doing so zeroes currentTime before
    // the stream reader/ended event can capture the handoff position.
    if (!state.liveManim.active) maybeStartOrContinuePlayback();
    return;
  }

  const canPlay = ['streaming', 'finishing', 'done'].includes(job.liveManim?.status);
  const streamUrl = job.liveManim?.streamUrl;
  if (!canPlay || !streamUrl) return;

  const absoluteStreamUrl = absoluteVideoUrl(streamUrl);
  const sourceChanged = state.liveManim.streamUrl !== absoluteStreamUrl;
  state.liveManim.jobId = job.id;
  state.liveManim.streamUrl = absoluteStreamUrl;
  state.liveManim.introDurationSeconds = Number(job.liveManim?.introDurationSeconds ?? 0);
  state.liveManim.active = true;
  liveBoardPlayer.stop();
  els.videoOutput.pause();
  els.videoOutput.classList.remove('visible');
  setVideoOverlay('', false);

  if (sourceChanged) {
    setVideoLoading(true, 'Kesintisiz 720p60 akışa bağlanılıyor...');
    fragmentedMp4Player.start(absoluteStreamUrl).catch(failLiveManimPlayback);
  }
}

function updateLiveBoardFromJob(job) {
  const firstSegment = job.segments?.[0];
  const liveBoard = firstSegment?.liveBoard;
  const hasCommands = Array.isArray(liveBoard?.commands) && liveBoard.commands.length > 0;
  const audioUrl = firstSegment?.tts?.audioUrl;

  if (
    state.playback.active
    || firstSegment?.videoUrl
    || !hasCommands
    || !audioUrl
    || job.status === 'failed'
  ) {
    return;
  }

  stopPreparingProgress({ complete: true });
  els.videoOutput.classList.remove('visible');
  setVideoOverlay('', false);
  liveBoardPlayer.update({
    segmentId: firstSegment.id,
    audioUrl: absoluteVideoUrl(audioUrl),
    durationSeconds: firstSegment.tts.durationSeconds,
    commands: liveBoard.commands
  });
}

async function streamFullVideoJob(jobId) {
  const response = await fetch(apiUrl(`/api/jobs/${jobId}/events`), {
    headers: {
      Accept: 'text/event-stream',
      ...authHeaders()
    }
  });
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Canlı üretim bağlantısı kurulamadı.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    let boundary = buffer.indexOf('\n\n');

    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const dataText = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (dataText) {
        const job = JSON.parse(dataText);
        applyFullVideoJobUpdate(job);
        if (job.status === 'done') {
          await reader.cancel().catch(() => {});
          setDownloadVideo(job.result?.videoUrl);
          return job;
        }
        if (job.status === 'failed') {
          const error = new Error(job.error || 'Tam ders üretimi başarısız oldu.');
          error.jobFailed = true;
          throw error;
        }
      }
      boundary = buffer.indexOf('\n\n');
    }

    if (done) {
      throw new Error('Canlı üretim bağlantısı tamamlanmadan kapandı.');
    }
  }
}

async function waitForFullVideoJob(jobId) {
  try {
    return await streamFullVideoJob(jobId);
  } catch (error) {
    if (error.jobFailed) throw error;
    els.logOutput.textContent += `\nCanlı bağlantı kesildi; durum sorgulamasına geçildi: ${error.message}`;
    return pollFullVideoJob(jobId);
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
els.videoOutput.addEventListener('loadstart', () => {
  if (els.videoOutput.classList.contains('visible')) {
    setVideoLoading(true);
  }
});
els.videoOutput.addEventListener('waiting', () => {
  setVideoLoading(true, 'Video devam etmek için hazırlanıyor...');
});
els.videoOutput.addEventListener('stalled', () => {
  setVideoLoading(true, 'Bağlantı bekleniyor...');
});
els.videoOutput.addEventListener('loadeddata', () => setVideoLoading(false));
els.videoOutput.addEventListener('canplay', () => setVideoLoading(false));
els.videoOutput.addEventListener('playing', () => setVideoLoading(false));
els.videoOutput.addEventListener('error', () => setVideoLoading(false));
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

els.liveManimVideo.addEventListener('loadstart', () => {
  setVideoLoading(true, 'Canlı Manim akışına bağlanılıyor...');
});
els.liveManimVideo.addEventListener('waiting', () => {
  setVideoLoading(true, 'Gemini’nin sıradaki Manim aksiyonu bekleniyor...');
});
els.liveManimVideo.addEventListener('canplay', () => setVideoLoading(false));
els.liveManimVideo.addEventListener('playing', () => {
  setVideoLoading(false);
  setVideoOverlay('', false);
  updateKaraAskVisibility();
});
els.liveManimVideo.addEventListener('timeupdate', () => {
  const currentTime = Number(els.liveManimVideo.currentTime || 0);
  if (Number.isFinite(currentTime) && currentTime > state.liveManim.lastPlaybackSeconds) {
    state.liveManim.lastPlaybackSeconds = currentTime;
  }
});
els.liveManimVideo.addEventListener('ended', () => {
  if (state.liveManim.failed || state.liveManim.browserFailed) {
    failLiveManimPlayback(new Error('Canlı akışın kullanılabilir kısmı tamamlandı.'));
    return;
  }
  // Keep the completed MediaSource video as the active player so the frame
  // never disappears and the user can replay it without switching elements.
  state.liveManim.active = true;
  els.liveStreamBadge.classList.add('hidden');
  setVideoOverlay(
    'Canlı ders tamamlandı ve gördüğün görüntü final video olarak kaydedildi. Tekrar oynatmak için videoya dokun.',
    false
  );
  updateKaraAskVisibility();
});
els.liveManimVideo.addEventListener('error', () => {
  if (!els.liveManimVideo.getAttribute('src')) return;
  failLiveManimPlayback(els.liveManimVideo.error);
});
els.liveManimVideo.addEventListener('click', () => {
  if (els.liveManimVideo.paused) {
    els.liveManimVideo.play().catch(() => {});
  } else {
    els.liveManimVideo.pause();
  }
});

els.liveBoardCanvas.addEventListener('click', () => {
  if (liveBoardPlayer.playbackBlocked) {
    liveBoardPlayer.retryPlayback();
    setVideoOverlay('', false);
    return;
  }
  if (els.liveBoardAudio.paused) {
    liveBoardPlayer.retryPlayback();
  } else {
    els.liveBoardAudio.pause();
  }
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

els.forgotPasswordBtn.addEventListener('click', () => {
  setAuthMode('reset');
});

els.googleAuthBtn.addEventListener('click', async () => {
  els.googleAuthBtn.disabled = true;
  els.authSubmitBtn.disabled = true;
  els.authModeBtn.disabled = true;
  els.forgotPasswordBtn.disabled = true;
  els.authMessage.classList.remove('error', 'success');
  els.authMessage.textContent = 'Google güvenli giriş sayfasına yönlendiriliyorsun...';

  try {
    const data = await authApi('/api/auth/oauth/google', null, { method: 'GET' });
    if (!data.url) {
      throw new Error('Google giriş adresi alınamadı.');
    }
    window.location.assign(data.url);
  } catch (error) {
    els.authMessage.textContent = error.message;
    els.authMessage.classList.add('error');
    els.googleAuthBtn.disabled = false;
    els.authSubmitBtn.disabled = false;
    els.authModeBtn.disabled = false;
    els.forgotPasswordBtn.disabled = false;
  }
});

els.historyList.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.newLesson) {
    beginNewLesson();
    return;
  }
  if (button.dataset.lessonId) {
    setWorkspaceLoading(true);
    loadLessonFromHistory(button.dataset.lessonId)
      .catch((error) => setStatus(error.message, true))
      .finally(() => setWorkspaceLoading(false));
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
  const mode = state.auth.mode;
  const isSignup = mode === 'signup';
  els.authSubmitBtn.disabled = true;
  els.googleAuthBtn.disabled = true;
  els.authModeBtn.disabled = true;
  els.forgotPasswordBtn.disabled = true;
  els.authMessage.classList.remove('error', 'success');

  try {
    if (mode === 'reset') {
      els.authMessage.textContent = 'Bağlantı gönderiliyor...';
      const data = await authApi('/api/auth/password-reset', { email });
      els.authMessage.textContent = `${data.message || 'Sıfırlama bağlantısı e-postana gönderildi.'} Gelen kutunda yoksa spam veya gereksiz klasörünü kontrol et.`;
      els.authMessage.classList.add('success');
      return;
    }

    if (mode === 'update-password') {
      els.authMessage.textContent = 'Şifren güncelleniyor...';
      await authApi('/api/auth/password-update', { password });
      els.authMessage.textContent = 'Şifren güncellendi. Hesabın açılıyor...';
      els.authMessage.classList.add('success');
      const data = await authApi('/api/auth/me', null, { method: 'GET' });
      state.auth.profile = data.profile || state.auth.profile;
      saveAuthSession(state.auth.session, state.auth.profile);
      showApp();
      setStatus('Hazır');
      return;
    }

    els.authMessage.textContent = isSignup ? 'Hesabın oluşturuluyor...' : 'Giriş yapılıyor...';
    const data = await authApi(isSignup ? '/api/auth/signup' : '/api/auth/login', {
      email,
      password,
      display_name: displayName
    });
    if (!data.session?.access_token) {
      setAuthMode('login');
      showAuth('Hesabın oluşturuldu. E-postandaki doğrulama bağlantısına tıkla. Gelen kutunda yoksa spam veya gereksiz klasörünü kontrol et.', false);
      els.authMessage.classList.add('success');
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
    els.googleAuthBtn.disabled = false;
    els.authModeBtn.disabled = false;
    els.forgotPasswordBtn.disabled = false;
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
  .then((config) => initAuth(config))
  .catch((error) => {
    showAuth(error.message, true);
    setStatus(error.message, true);
  });

export {};
