import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const tabs = [
  { id: 'lesson', label: 'Ders varsayılanları' },
  { id: 'voice', label: 'Ses' },
  { id: 'backend', label: 'Backend altyapısı' },
  { id: 'account', label: 'Hesap' }
] as const;

type TabId = (typeof tabs)[number]['id'];

export function Sidebar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('lesson');

  useEffect(() => {
    if (!settingsOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSettingsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen]);

  return (
    <aside className="sidebar">
      <div className="brandBlock">
        <button id="logoHomeBtn" className="logoHomeBtn" type="button" aria-label="Yeni ders">
          <img className="sidebarLogo" src="/logo.png" width="180" height="46" alt="Kara Tahta" />
        </button>
        <p id="configText" className="hidden">Gemini + Manim</p>
      </div>

      <nav className="historyList" aria-label="Ders geçmişi">
        <button className="historyItem active" type="button" data-new-lesson="true">
          <span className="historyText">
            <strong>Yeni ders</strong>
          </span>
        </button>
      </nav>

      <div className="userFooter">
        <span className="userAvatar" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.14 0-7.5 2.46-7.5 5.5V21h15v-1.5c0-3.04-3.36-5.5-7.5-5.5Z" fill="currentColor" /></svg>
        </span>
        <span id="userEmailText" className="userSummaryText" />
        <button
          type="button"
          className="settingsGearBtn"
          aria-label="Ayarlar"
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M19.4 13.5a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19.4a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4.6a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10.6a1.65 1.65 0 0 0 1-1.51V4.6a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10.6a1.65 1.65 0 0 0 1.51 1H19.4a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1 1.9Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="sidebarFooter">
        <div className="status" id="statusText">Hazır</div>
      </div>

      {createPortal(
      <div className={`settingsModalOverlay${settingsOpen ? ' open' : ''}`} onClick={() => setSettingsOpen(false)}>
        <div
          className="settingsModal"
          role="dialog"
          aria-modal="true"
          aria-label="Ayarlar"
          onClick={(event) => event.stopPropagation()}
        >
          <button className="settingsModalClose" type="button" aria-label="Kapat" onClick={() => setSettingsOpen(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>

          <nav className="settingsModalNav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`settingsModalNavItem${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="settingsModalContent">
            <h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2>

            <div className={`settingsModalPanel${activeTab === 'lesson' ? ' visible' : ''}`}>
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
              <button id="settingsResetBtn" className="secondaryAction" type="button">Varsayılanlara dön</button>
            </div>

            <div className={`settingsModalPanel${activeTab === 'voice' ? ' visible' : ''}`}>
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
            </div>

            <div className={`settingsModalPanel${activeTab === 'backend' ? ' visible' : ''}`}>
              <div className="settingsRow">
                <span>Aktif backend</span>
                <strong id="backendActiveBadge">Railway</strong>
              </div>
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
              <button id="backendHealthBtn" className="secondaryAction" type="button">Bağlantıları test et</button>
              <small id="backendModeHint" className="backendModeHint">Seçim bu tarayıcıda saklanır.</small>
            </div>

            <div className={`settingsModalPanel${activeTab === 'account' ? ' visible' : ''}`}>
              <button id="logoutBtn" className="secondaryAction" type="button">Çıkış yap</button>
            </div>
          </div>
        </div>
      </div>,
      document.body
      )}
    </aside>
  );
}
