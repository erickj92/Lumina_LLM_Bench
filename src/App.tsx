import { useEffect } from 'react';
import { useUiStore } from './stores/uiStore';
import { useHistoryStore } from './stores/historyStore';
import { AppShell } from './components/AppShell';
import { Dashboard } from './components/Dashboard';
import { StreamTest } from './components/StreamTest';
import { HistoryView } from './components/HistoryView';
import { KeyVault } from './components/KeyVault';

function App() {
  const currentView = useUiStore(s => s.currentView);

  // Load history on mount
  useEffect(() => {
    useHistoryStore.getState().loadResults();
  }, []);

  return (
    <AppShell>
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'run-test' && <StreamTest />}
      {currentView === 'history' && <HistoryView />}
      {currentView === 'vault' && <KeyVault />}
    </AppShell>
  );
}

export default App;