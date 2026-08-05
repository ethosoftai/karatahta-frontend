import { HomeView } from './workspace/HomeView';
import { Sidebar } from './workspace/Sidebar';
import { StudioView } from './workspace/StudioView';

export function Workspace() {
  return (
    <div className="appShell hidden" id="appShell">
      <Sidebar />
      <main className="mainPane">
        <HomeView />
        <StudioView />
        <section className="placeholderView hidden" id="cardView">
          <div className="placeholderViewBody">
            <h2>Kart</h2>
            <p>Bu bölüm yakında hazır olacak.</p>
          </div>
        </section>
        <section className="placeholderView hidden" id="liveTeacherView">
          <div className="placeholderViewBody">
            <h2>Canlı öğretmen</h2>
            <p>Bu bölüm yakında hazır olacak.</p>
          </div>
        </section>
      </main>
      <div id="workspaceLoading" className="workspaceLoading hidden" role="status" aria-live="polite">
        <div className="workspaceLoadingCard">
          <span className="loadingSpinner" aria-hidden="true" />
          <strong id="workspaceLoadingTitle">Ders yükleniyor</strong>
          <span id="workspaceLoadingMessage">Video ve sohbet geçmişi hazırlanıyor...</span>
        </div>
      </div>
    </div>
  );
}
