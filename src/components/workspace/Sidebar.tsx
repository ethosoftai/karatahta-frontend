export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brandBlock">
        <button id="logoHomeBtn" className="logoHomeBtn" type="button" aria-label="Yeni ders">
          <img className="sidebarLogo" src="/logo.png" width="180" height="46" alt="Kara Tahta" />
        </button>
        <p id="configText" className="hidden">Gemini + Manim</p>
      </div>

      <div className="sidebarLabel">ÇALIŞMA ALANI</div>
      <nav className="historyList" aria-label="Ders geçmişi">
        <button className="historyItem active" type="button">
          <span className="historyText">
            <strong>Yeni ders</strong>
            <small>Bir konu seç ve üret</small>
          </span>
        </button>
      </nav>

      <details id="settingsPortal" className="backendPortal settingsPortal">
        <summary>
          <span>Ayarlar</span>
        </summary>
        <div className="backendPortalBody">
          <p>Hesap</p>
          <div className="userBlock">
            <span id="userEmailText" />
            <button id="logoutBtn" type="button">Çıkış yap</button>
          </div>

          <p>Ders varsayılanları</p>
          <label className="settingsField">
            <span>Varsayılan seviye</span>
            <select id="settingsDefaultLevel">
              <option value="beginner">Başlangıç</option>
              <option value="intermediate">Orta</option>
              <option value="advanced">İleri</option>
            </select>
          </label>
          <label className="settingsField">
            <span>Varsayılan süre (dk)</span>
            <input id="settingsDefaultMinutes" type="number" min={1} max={20} />
          </label>
          <label className="settingsField">
            <span>Varsayılan segment sayısı</span>
            <input id="settingsDefaultSegments" type="number" min={1} max={12} />
          </label>
          <label className="settingsField">
            <span>Varsayılan ön bilgi</span>
            <input id="settingsDefaultPrior" type="text" placeholder="Ör. lise 10. sınıf" />
          </label>

          <p>Ses</p>
          <label className="settingsField">
            <span>Anlatım sesi</span>
            <select id="settingsTtsVoice">
              <option value="tr-TR-AhmetNeural">Ahmet (Erkek)</option>
              <option value="tr-TR-EmelNeural">Emel (Kadın)</option>
            </select>
          </label>
          <label className="settingsField settingsFieldRange">
            <span>Anlatım ses düzeyi</span>
            <input id="settingsSpeechVolume" type="range" min={0.5} max={2} step={0.05} />
          </label>
          <label className="settingsField settingsFieldRange">
            <span>Arka plan müziği düzeyi</span>
            <input id="settingsMusicVolume" type="range" min={0} max={1} step={0.05} />
          </label>
          <button id="settingsResetBtn" type="button">Varsayılanlara dön</button>
        </div>
      </details>

      <details id="developerPortal" className="backendPortal">
        <summary>
          <span>Developer portal</span>
          <strong id="backendActiveBadge">Railway</strong>
        </summary>
        <div className="backendPortalBody">
          <p>Backend altyapısı</p>
          <div className="backendModeOptions" role="radiogroup" aria-label="Backend altyapısı">
            <label>
              <input type="radio" name="backendMode" value="railway" />
              <span><strong>Railway</strong><small>Yalnız Railway</small></span>
            </label>
            <label>
              <input type="radio" name="backendMode" value="vps" />
              <span><strong>VPS</strong><small>Yalnız VPS</small></span>
            </label>
            <label>
              <input type="radio" name="backendMode" value="hybrid" />
              <span><strong>Hibrit</strong><small>VPS + Railway yedek</small></span>
            </label>
          </div>
          <div className="backendHealthRows" aria-live="polite">
            <span><i id="vpsHealthDot" /><small>VPS</small><strong id="vpsHealthText">Kontrol edilmedi</strong></span>
            <span><i id="railwayHealthDot" /><small>Railway</small><strong id="railwayHealthText">Kontrol edilmedi</strong></span>
          </div>
          <button id="backendHealthBtn" type="button">Bağlantıları test et</button>
          <small id="backendModeHint" className="backendModeHint">Seçim bu tarayıcıda saklanır.</small>
        </div>
      </details>

      <div className="sidebarFooter">
        <div className="status" id="statusText">Hazır</div>
      </div>
    </aside>
  );
}
