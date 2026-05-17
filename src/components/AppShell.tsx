import type { ReactNode } from 'react';
import type { AppView } from '../types';
import { useUiStore } from '../stores/uiStore';
const NAV_ITEMS: Array<{ view: AppView; label: string; icon: string }> = [
  { view: 'dashboard', label: 'Dashboard', icon: '📊' },
  { view: 'run-test', label: 'Run Test', icon: '▶' },
  { view: 'history', label: 'History', icon: '📋' },
  { view: 'vault', label: 'Vault', icon: '🔐' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { currentView, setView, sidebarOpen, toggleSidebar } = useUiStore();

  return (
    <div className="min-h-screen bg-surface">
      {/* Top nav bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95	px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-text-secondary hover:text-text hover:bg-surface-3 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🧪</span>
            <h1 className="text-lg font-bold text-text hidden sm:block">Lumina Bench</h1>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1" role="tablist">
          {NAV_ITEMS.map(item => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              role="tab"
              aria-selected={currentView === item.view}
              className={`
                px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5
                ${currentView === item.view
                  ? 'bg-lumina-500/15 text-lumina-300'
                  : 'text-text-secondary hover:text-text hover:bg-surface-3'}
              `}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="w-8" />
      </header>

      <div className="flex">
        {/* Sidebar (mobile) */}
        {sidebarOpen && (
          <aside className="fixed inset-0 z-30 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={toggleSidebar} />
            <div className="relative w-64 h-full bg-surface-2 border-r border-border p-4">
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold text-text">Navigation</span>
                <button onClick={toggleSidebar} className="text-text-secondary hover:text-text">
                  ✕
                </button>
              </div>
              <nav className="space-y-1" role="tablist">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.view}
                    onClick={() => { setView(item.view); toggleSidebar(); }}
                    role="tab"
                    aria-selected={currentView === item.view}
                    className={`
                      w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2
                      ${currentView === item.view
                        ? 'bg-lumina-500/15 text-lumina-300'
                        : 'text-text-secondary hover:text-text hover:bg-surface-3'}
                    `}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}