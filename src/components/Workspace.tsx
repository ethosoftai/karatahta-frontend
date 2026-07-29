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
      </main>
    </div>
  );
}
