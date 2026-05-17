import { useEffect } from 'react';
import { useUiStore } from './stores/uiStore';
import { useHistoryStore } from './stores/historyStore';
import { useAuthStore } from './stores/authStore';
import { AppShell } from './components/AppShell';
import { Dashboard } from './components/Dashboard';
import { StreamTest } from './components/StreamTest';
import { HistoryView } from './components/HistoryView';
import { KeyVault } from './components/KeyVault';
import { AuthPanel } from './components/AuthPanel';
import { Leaderboard } from './components/Leaderboard';

function App() {
  const currentView = useUiStore(s => s.currentView);

  // Load history on mount
  useEffect(() => {
    useHistoryStore.getState().loadResults();
    useAuthStore.getState().checkAuth();
  }, []);

  return (
    <AppShell>
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'run-test' && <StreamTest />}
      {currentView === 'history' && <HistoryView />}
      {currentView === 'vault' && <KeyVault />}
      {currentView === 'auth' && <AuthPanel />}
      {currentView === 'leaderboard' && <Leaderboard />}
    </AppShell>
  );
}

export default App;