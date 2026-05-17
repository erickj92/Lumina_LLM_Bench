/** Auth state management with Zustand.

Keeps track of whether the user is logged in and their username.
Persists to localStorage alongside the JWT token.
*/

import { create } from 'zustand';
import { hasToken, getStoredUsername, logout as apiLogout } from '../api/client';

interface AuthState {
  /** Is the user currently logged in? */
  isLoggedIn: boolean;
  /** Current username (null if logged out) */
  username: string | null;
  /** Refresh state from localStorage (call on app mount) */
  checkAuth: () => void;
  /** Log the user out (clears token and state) */
  logout: () => void;
  /** Signal to the store that login/register succeeded */
  setLoggedIn: (username: string) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  isLoggedIn: hasToken(),
  username: getStoredUsername(),

  checkAuth: () => {
    set({
      isLoggedIn: hasToken(),
      username: getStoredUsername(),
    });
  },

  logout: () => {
    apiLogout();
    set({ isLoggedIn: false, username: null });
  },

  setLoggedIn: (username: string) => {
    localStorage.setItem('lmb-auth-username', username);
    set({ isLoggedIn: true, username });
  },
}));