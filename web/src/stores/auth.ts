import { defineStore } from 'pinia';

interface AuthState {
  token: string | null;
  user_id: string | null;
  email: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem('meta-token'),
    user_id: localStorage.getItem('meta-user-id'),
    email: localStorage.getItem('meta-email'),
  }),

  getters: {
    isAuthenticated: (s) => !!s.token,
  },

  actions: {
    setAuth(data: { token: string; user_id: string; email: string }) {
      this.token = data.token;
      this.user_id = data.user_id;
      this.email = data.email;
      localStorage.setItem('meta-token', data.token);
      localStorage.setItem('meta-user-id', data.user_id);
      localStorage.setItem('meta-email', data.email);
    },

    logout() {
      this.token = null;
      this.user_id = null;
      this.email = null;
      localStorage.removeItem('meta-token');
      localStorage.removeItem('meta-user-id');
      localStorage.removeItem('meta-email');
    },
  },
});
