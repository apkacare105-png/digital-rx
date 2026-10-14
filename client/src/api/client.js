import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';
export const assetUrl = (p) => (p ? (import.meta.env.VITE_ASSET_URL || '') + p : '');

const api = axios.create({ baseURL: BASE, withCredentials: true });

// Access token lives in memory only (never localStorage); the refresh token is an httpOnly cookie.
let accessToken = null;
export const setToken = (t) => {
  accessToken = t;
};

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

// Single-flight refresh: concurrent 401s (and React StrictMode's double mount) share ONE refresh call.
// Required because refresh tokens rotate — a second parallel call would look like token reuse.
let refreshing = null;
export function refreshSession() {
  if (!refreshing) {
    refreshing = axios
      .post(`${BASE}/auth/refresh`, {}, { withCredentials: true })
      .then((r) => {
        setToken(r.data.accessToken);
        return r.data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

let onAuthFail = () => {};
export const setAuthFailHandler = (fn) => {
  onAuthFail = fn;
};

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const { config, response } = err;
    if (response?.status === 401 && config && !config._retry && !config.url.startsWith('/auth/')) {
      config._retry = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        setToken(null);
        onAuthFail();
      }
    }
    throw err;
  }
);

export const errMsg = (err, fallback = 'Something went wrong') => {
  const d = err?.response?.data;
  if (d?.details?.length) return d.details.map((x) => x.message).join(', ');
  return d?.message || fallback;
};

export default api;
