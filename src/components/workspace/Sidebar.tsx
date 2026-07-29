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

      <div className="sidebarFooter">
        <div className="userBlock">
          <span id="userEmailText" />
          <button id="logoutBtn" type="button">Çıkış yap</button>
        </div>
        <div className="status" id="statusText">Hazır</div>
      </div>
    </aside>
  );
}
