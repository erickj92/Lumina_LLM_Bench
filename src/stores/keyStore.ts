import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoredKey } from '../types';
import { encryptKey, decryptKey, storageKey } from '../lib/utils';

function generateId(): string {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface KeyState {
  keys: StoredKey[];
  /** Decrypt and return a key by id */
  getDecryptedKey: (id: string) => string | null;
  /** Decrypt and return a key by provider/baseUrl match */
  findKey: (baseUrl: string) => StoredKey | undefined;
  addKey: (provider: string, baseUrl: string, rawKey: string, alias?: string) => void;
  deleteKey: (id: string) => void;
  updateLastUsed: (id: string) => void;
}

export const useKeyStore = create<KeyState>()(
  persist(
    (set, get) => ({
      keys: [],

      getDecryptedKey: (id: string) => {
        const entry = get().keys.find(k => k.id === id);
        if (!entry) return null;
        return decryptKey(entry.encryptedKey);
      },

      findKey: (baseUrl: string) => {
        return get().keys.find(k => k.baseUrl === baseUrl);
      },

      addKey: (provider: string, baseUrl: string, rawKey: string, alias?: string) => {
        const newKey: StoredKey = {
          id: generateId(),
          provider,
          baseUrl,
          encryptedKey: encryptKey(rawKey),
          alias,
          createdAt: Date.now(),
        };
        set(state => ({
          keys: [...state.keys, newKey],
        }));
      },

      deleteKey: (id: string) => {
        set(state => ({
          keys: state.keys.filter(k => k.id !== id),
        }));
      },

      updateLastUsed: (id: string) => {
        set(state => ({
          keys: state.keys.map(k =>
            k.id === id ? { ...k, lastUsed: Date.now() } : k
          ),
        }));
      },
    }),
    {
      name: storageKey('vault'),
      partialize: (state) => ({ keys: state.keys }),
    }
  )
);