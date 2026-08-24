export function SettingsView() {
  return (
    <section className="placeholderView settingsView hidden" id="settingsView">
      <div className="settingsViewInner">
        <div className="settingsViewHeader">
          <strong>Ayarlar</strong>
        </div>

        <div className="settingsGroup">
          <p>Hesap</p>
          <div className="userBlock">
            <span id="userEmailText" />
            <button id="logoutBtn" type="button">Çıkış yap</button>
          </div>
        </div>

        <div className="settingsGroup">
          <p>Planlar</p>
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

        <div className="settingsGroup">
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
        </div>

        <div className="settingsGroup">
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
          <button id="settingsResetBtn" type="button" className="secondaryAction">Varsayılanlara dön</button>
        </div>
      </div>
    </section>
  );
}
