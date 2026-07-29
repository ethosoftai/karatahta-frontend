export function StudioView() {
  return (
    <section className="studioView hidden" id="studioView">
      <div className="studioHeader">
        <div>
          <p className="eyebrow">VİDEO DERS</p>
          <h2 id="lessonTitle">Ders hazırlanıyor</h2>
        </div>
        <div className="studioActions">
          <a id="downloadVideoBtn" className="secondaryAction hidden" href="#" download>Videoyu indir</a>
          <button id="generateFullBtn" className="primaryAction hidden" type="button" disabled>Tüm dersi üret</button>
          <button id="backHomeBtn" className="secondaryAction hidden" type="button">Yeni konu</button>
        </div>
      </div>

      <section className="watchPanel">
        <div className="videoShell">
          <div id="preparingPanel" className="preparingPanel hidden">
            <div className="preparingContent">
              <h3 id="preparingTitle">Ders hazırlanıyor</h3>
              <p id="preparingMessage">Plan kuruluyor...</p>
              <div className="preparingTrack" aria-hidden="true">
                <div id="preparingBar" className="preparingBar" />
              </div>
            </div>
          </div>
          <video id="videoOutput" playsInline crossOrigin="anonymous" />
          <video id="preloadVideo" preload="auto" muted crossOrigin="anonymous" />
          <div id="playerControls" className="playerControls hidden">
            <button id="playPauseBtn" className="playerButton" type="button" aria-label="Oynat">Oynat</button>
            <span id="currentTimeText" className="timeText">0:00</span>
            <input id="seekBar" className="seekBar" type="range" min="0" max="0" step="0.1" defaultValue="0" aria-label="Video ilerleme" />
            <span id="durationText" className="timeText">0:00</span>
            <button id="fullscreenBtn" className="playerIconButton" type="button" aria-label="Tam ekran">⛶</button>
          </div>
          <div id="videoOverlay" className="videoOverlay">Video hazırlanıyor...</div>
        </div>
        <section id="karaChat" className="karaChat hidden" aria-live="polite" />
        <form id="karaAskForm" className="karaAskForm hidden">
          <span id="karaTimestamp" className="karaTimestamp" />
          <input id="karaQuestionInput" type="text" autoComplete="off" placeholder="Kara'ya sor" />
          <button id="karaSendBtn" className="karaSendBtn" type="submit" aria-label="Soruyu gönder">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12 20 4l-5 16-3-7-8-1Z" />
              <path d="m12 13 8-9" />
            </svg>
          </button>
        </form>
        <div className="watchMeta hidden">
          <span id="renderMeta">Hazırlanıyor</span>
          <span id="planMeta" />
        </div>
        <pre id="logOutput" className="hidden" />
      </section>

      <section className="lessonGrid hidden">
        <article className="panel plan">
          <div className="sectionHead"><h3>Ders planı</h3></div>
          <div id="planOutput" className="empty">Henüz plan yok.</div>
        </article>
        <article className="panel segments">
          <div className="sectionHead">
            <h3>Bölümler</h3>
            <button id="generateCodeBtn" type="button" disabled>Seçili bölümü hazırla</button>
          </div>
          <div id="segmentList" className="segmentList" />
          <div id="segmentDetail" className="segmentDetail empty">Bir bölüm seç.</div>
        </article>
      </section>

      <details className="developerDetails hidden">
        <summary>Geliştirici detayları</summary>
        <section className="devGrid">
          <article className="panel speech">
            <div className="sectionHead">
              <h3>Speech</h3>
              <span id="speechMeta" />
            </div>
            <div id="speechOutput" className="empty">Henüz speech yok.</div>
            <audio id="audioOutput" controls />
          </article>
          <article className="panel code">
            <div className="sectionHead">
              <h3>Manim</h3>
              <button id="renderBtn" type="button" disabled>Seçili bölümü render et</button>
            </div>
            <textarea id="codeOutput" spellCheck="false" placeholder="Gemini'dan gelen Manim kodu burada görünür." />
          </article>
        </section>
      </details>
    </section>
  );
}
