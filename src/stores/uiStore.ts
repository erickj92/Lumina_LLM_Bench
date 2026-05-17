import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView, CustomProviderConfig } from '../types';

function generateId(): string {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface UiState {
  currentView: AppView;
  sidebarOpen: boolean;
  recentlyUsedModels: Array<{ provider: string; model: string }>;
  customProviders: CustomProviderConfig[];
  setView: (view: AppView) => void;
  toggleSidebar: () => void;
  addRecentModel: (provider: string, model: string) => void;
  addCustomProvider: (name: string, baseUrl: string) => void;
  removeCustomProvider: (id: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      currentView: 'dashboard',
      sidebarOpen: true,
      recentlyUsedModels: [],
      customProviders: [],

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

      addCustomProvider: (name: string, baseUrl: string) => {
        const existing = get().customProviders;
        // Update if same baseUrl already exists, otherwise add
        const filtered = existing.filter(c => c.baseUrl !== baseUrl);
        set({
          customProviders: [
            ...filtered,
            { id: generateId(), name, baseUrl },
          ],
        });
      },

      removeCustomProvider: (id: string) => {
        set(state => ({
          customProviders: state.customProviders.filter(c => c.id !== id),
        }));
      },
    }),
    {
      name: 'lmb-ui',
      partialize: (state) => ({
        currentView: state.currentView,
        recentlyUsedModels: state.recentlyUsedModels,
        customProviders: state.customProviders,
      }),
    }
  )
);