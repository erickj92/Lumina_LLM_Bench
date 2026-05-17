import { create } from 'zustand';
import type { TestResult } from '../types';
import * as historyDb from '../db/history';

interface HistoryState {
  results: TestResult[];
  loading: boolean;
  error: string | null;
  /** Load all results from IndexedDB */
  loadResults: () => Promise<void>;
  /** Save a new result to IndexedDB and add to local cache */
  addResult: (result: TestResult) => Promise<void>;
  /** Delete a result from IndexedDB */
  deleteResult: (id: string) => Promise<void>;
  /** Clear all history */
  clearAll: () => Promise<void>;
  /** Export all results as JSON string */
  exportJSON: () => Promise<string>;
  /** Get the last N runs for a specific provider+model combo */
  getRecentByProviderModel: (provider: string, model: string, limit?: number) => TestResult[];
  /** Get all unique provider+model pairs from results */
  getUniqueCombos: () => Array<{ provider: string; model: string }>;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  results: [],
  loading: false,
  error: null,

  loadResults: async () => {
    set({ loading: true, error: null });
    try {
      const results = await historyDb.getAllResults();
      set({ results, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load history',
        loading: false,
      });
    }
  },

  addResult: async (result: TestResult) => {
    try {
      await historyDb.saveTestResult(result);
      set(state => ({
        results: [result, ...state.results].sort(
          (a, b) => b.timestamp - a.timestamp
        ),
      }));
    } catch (err) {
      console.error('Failed to save result:', err);
    }
  },

  deleteResult: async (id: string) => {
    try {
      await historyDb.deleteResult(id);
      set(state => ({
        results: state.results.filter(r => r.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete result:', err);
    }
  },

  clearAll: async () => {
    try {
      await historyDb.clearAllResults();
      set({ results: [] });
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  },

  exportJSON: async () => {
    return historyDb.exportResultsToJSON();
  },

  getRecentByProviderModel: (
    provider: string,
    model: string,
    limit = 10
  ) => {
    return get()
      .results.filter(r => r.provider === provider && r.model === model)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },

  getUniqueCombos: () => {
    const seen = new Set<string>();
    const combos: Array<{ provider: string; model: string }> = [];
    for (const r of get().results) {
      const key = `${r.provider}::${r.model}`;
      if (!seen.has(key)) {
        seen.add(key);
        combos.push({ provider: r.provider, model: r.model });
      }
    }
    return combos;
  },
}));