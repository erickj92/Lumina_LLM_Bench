import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView } from '../types';

interface UiState {
  currentView: AppView;
  sidebarOpen: boolean;
  recentlyUsedModels: Array<{ provider: string; model: string }>;
  setView: (view: AppView) => void;
  toggleSidebar: () => void;
  addRecentModel: (provider: string, model: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      currentView: 'dashboard',
      sidebarOpen: true,
      recentlyUsedModels: [],

      setView: (view: AppView) => set({ currentView: view }),

      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

      addRecentModel: (provider: string, model: string) => {
        const existing = get().recentlyUsedModels;
        const filtered = existing.filter(
          m => !(m.provider === provider && m.model === model)
        );
        set({
          recentlyUsedModels: [{ provider, model }, ...filtered].slice(0, 10),
        });
      },
    }),
    {
      name: 'lmb-ui',
      partialize: (state) => ({
        currentView: state.currentView,
        recentlyUsedModels: state.recentlyUsedModels,
      }),
    }
  )
);