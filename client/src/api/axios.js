import axios from 'axios';

// sessionStorage: the token is cleared when the browser tab is closed
const TOKEN_KEY = 'spendwise_token';
export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Calls where a 401 is a normal "wrong password/code" answer, not an expired session
const AUTH_CALLS = ['/auth/login', '/auth/register', '/auth/mfa/verify', '/auth/logout'];

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const status = err.response?.status;
    const isAuthCall = AUTH_CALLS.some((path) => url.startsWith(path));
    const disabled = status === 403 && /disabled/i.test(err.response?.data?.message || '');

    if ((status === 401 && !isAuthCall) || disabled) {
      tokenStore.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = `/login?reason=${disabled ? 'disabled' : 'expired'}`;
      }
    }
    return Promise.reject(err);
  }
);

// Turns any API error into a readable message without exposing technical details
export const getError = (err) => {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?';
  if (err.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  return 'Something went wrong. Please try again.';
};

export default api;
