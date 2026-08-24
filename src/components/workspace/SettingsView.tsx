import type { ReactNode } from 'react';

function SettingsCardHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="settingsCardHeader">
      <span className="settingsCardIcon" aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
    </div>
  );
}

export function SettingsView() {
  return (
    <section className="placeholderView settingsView hidden" id="settingsView">
      <div className="settingsViewInner">
        <div className="settingsViewHeader">
          <div className="settingsViewHeaderIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div>
            <strong>Ayarlar</strong>
            <span>Hesabını, planını ve ders varsayılanlarını buradan yönet</span>
          </div>
        </div>

        <div className="settingsCard">
          <SettingsCardHeader
            title="Hesap"
            icon={(
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
              </svg>
            )}
          />
          <div className="userBlock">
            <span id="userEmailText" />
            <button id="logoutBtn" type="button" className="iconTextButton">Çıkış yap</button>
          </div>
        </div>

        <div className="settingsCard">
          <SettingsCardHeader
            title="Plan"
            icon={(
              <svg viewBox="0 0 24 24">
                <rect x="2" y="5" width="20" height="14" rx="2.5" />
                <path d="M2 10h20" />
              </svg>
            )}
          />
          <div className="planCurrent">
            <strong id="planCurrentName">Ücretsiz Deneme</strong>
            <div className="planUsageRow">
              <span>Video</span>
              <span id="planVideoUsage">0/2</span>
            </div>
            <div className="planUsageRow">
              <span>Kart</span>
              <span id="planCardUsage">0/2</span>
            </div>
          </div>
          <div className="planCards">
            <div className="planCard active" id="planCardFree">
              <strong>Ücretsiz Deneme</strong>
              <span className="planPrice">$0</span>
              <small>2 video + 2 kart</small>
              <span className="planBadge">Aktif</span>
            </div>
            <div className="planCard" id="planCard5">
              <strong>Başlangıç</strong>
              <span className="planPrice">$5</span>
              <small>Yakında</small>
              <span className="planBadge planBadgeSoon">Yakında</span>
            </div>
            <div className="planCard" id="planCard10">
              <strong>Pro</strong>
              <span className="planPrice">$10</span>
              <small>Yakında</small>
              <span className="planBadge planBadgeSoon">Yakında</span>
            </div>
          </div>
        </div>

        <div className="settingsCard">
          <SettingsCardHeader
            title="Ders varsayılanları"
            icon={(
              <svg viewBox="0 0 24 24">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
              </svg>
            )}
          />
          <div className="settingsFieldGrid">
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
          </div>
        </div>

        <div className="settingsCard">
          <SettingsCardHeader
            title="Ses"
            icon={(
              <svg viewBox="0 0 24 24">
                <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                <path d="M16.5 8.5a5 5 0 0 1 0 7" />
                <path d="M19 6a9 9 0 0 1 0 12" />
              </svg>
            )}
          />
          <div className="settingsFieldGrid">
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
          <button id="settingsResetBtn" type="button" className="secondaryAction settingsResetBtn">Varsayılanlara dön</button>
        </div>
      </div>
    </section>
  );
}
