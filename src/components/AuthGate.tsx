export function AuthGate() {
  return (
    <section id="authGate" className="authGate">
      <div className="authLayout">
        <aside className="authShowcase" aria-label="Kara Tahta özellikleri">
          <div className="authShowcaseBadge">
            <span />
            Yapay zekâ video stüdyosu
          </div>
          <h1>Bir konudan, anlatan bir derse.</h1>
          <p>
            Kara Tahta konunu planlar, seslendirir ve animasyonlu bir video derse dönüştürür.
          </p>
          <div className="authFeatureGrid">
            <article>
              <strong>01</strong>
              <span>Kişisel anlatım</span>
            </article>
            <article>
              <strong>02</strong>
              <span>Animasyonlu çözüm</span>
            </article>
            <article>
              <strong>03</strong>
              <span>Kalıcı ders geçmişi</span>
            </article>
          </div>
        </aside>

        <form id="authForm" className="authCard">
          <div className="authBadge"><span /> Güvenli hesap</div>
          <img className="authLogo" src="/logo.png" width="230" height="58" alt="Kara Tahta" />
          <div className="authIntro">
            <h2 id="authTitle">Tekrar hoş geldin</h2>
            <p id="authSubtitle">Video derslerine devam etmek için giriş yap.</p>
          </div>

          <label id="authNameField" className="authField hidden">
            <span>Adın</span>
            <input id="authNameInput" type="text" autoComplete="name" placeholder="Ad Soyad" />
          </label>
          <label id="authEmailField" className="authField">
            <span>E-posta</span>
            <input id="authEmailInput" type="email" autoComplete="email" placeholder="ornek@eposta.com" required />
          </label>
          <label id="authPasswordField" className="authField">
            <span id="authPasswordLabel">Şifre</span>
            <input id="authPasswordInput" type="password" autoComplete="current-password" placeholder="Şifren" required />
          </label>

          <button id="forgotPasswordBtn" className="authLink" type="button">Şifremi unuttum</button>
          <button id="authSubmitBtn" className="primaryAction" type="submit">Giriş yap</button>
          <button id="authModeBtn" className="secondaryAction" type="button">Hesabın yok mu? Hesap oluştur</button>
          <div id="authMessage" className="authMessage" role="status" aria-live="polite" />
          <p className="authLegal">Hesabın Supabase Auth ile güvenli şekilde korunur.</p>
        </form>
      </div>
    </section>
  );
}
