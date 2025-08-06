import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  apiKey: string | null;

  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setApiKey: (apiKey: string) => void;
  setLoading: (loading: boolean) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      apiKey: null,

      setUser: user => set({ user, isAuthenticated: !!(user && get().token) }),
      setToken: token => {
        // Update localStorage for API interceptor
        if (token) {
          localStorage.setItem('authToken', token);
        } else {
          localStorage.removeItem('authToken');
        }
        set({ token, isAuthenticated: !!(token && get().user) });
      },
      setApiKey: apiKey => set({ apiKey }),
      setLoading: isLoading => set({ isLoading }),

      login: (token, user) => {
        // Update localStorage for API interceptor
        localStorage.setItem('authToken', token);
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        // Remove from localStorage
        localStorage.removeItem('authToken');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          apiKey: null,
          isLoading: false,
        });
      },

      clearAuth: () => {
        // Remove from localStorage
        localStorage.removeItem('authToken');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          apiKey: null,
          isLoading: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        token: state.token,
        user: state.user,
        apiKey: state.apiKey,
      }),
      // Add hydration handler
      onRehydrateStorage: () => state => {
        if (state?.token && state?.user) {
          // Sync localStorage with persisted token
          localStorage.setItem('authToken', state.token);
          // Update isAuthenticated based on persisted data
          useAuthStore.setState({ isAuthenticated: true });
        }
      },
    }
  )
);
