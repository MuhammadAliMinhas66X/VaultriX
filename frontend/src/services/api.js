import axios from 'axios';
import { getDeviceFallbackId } from '../utils/deviceFallbackId.js';
import { installRequestCache, clearRequestCache } from './requestCache.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 20000,
  headers: {
    // Backs up the server's own httpOnly device cookie for the per-device
    // account-creation limit - see utils/deviceFallbackId.js for why this
    // needs to be a second, independent signal rather than relying on the
    // cookie alone.
    'X-Device-Fallback-Id': getDeviceFallbackId(),
  },
});

installRequestCache(api);

export const setAuthToken = (token) => {
  if (!token) clearRequestCache();
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// Fires after a 401 was silently recovered from by refreshing the access
// token in the background - lets AuthContext keep its own `user`/
// `accessToken` state in sync with what api.js just did under the hood.
let onTokenRefreshed = null;

export const setTokenRefreshedHandler = (handler) => {
  onTokenRefreshed = handler;
};

const DEFAULT_RETRY_MS = 3000;
const MAX_AUTO_RETRY_MS = 8000;

export const retryAfterSeconds = (error) => {
  const headers = error?.response?.headers || {};
  const value = Number(headers['retry-after'] ?? headers['ratelimit-reset']);
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 0;
};

const NOT_A_SESSION_EXPIRY = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout', '/auth/google', '/users/me/password'];

// The access token lives 15 minutes (see backend/src/utils/tokens.js); the
// refresh token behind it lives 30 days in an httpOnly cookie. Before this,
// nothing ever refreshed the access token except once, on page load - so
// the very next request after 15 minutes on one page (including the
// AuthContext "am I still signed in" poll that runs every 45s) got a 401
// and was treated as a real logout, even though the refresh token was
// completely valid. This dedupes concurrent 401s onto one refresh call,
// retries the request that triggered it, and only actually signs the
// person out if the refresh itself fails (meaning the session really is
// gone - revoked, expired, logged out elsewhere).
let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(({ data }) => {
        setAuthToken(data.accessToken);
        onTokenRefreshed?.(data);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const url = config.url || '';
    const status = error.response?.status;
    // Login, signup, the refresh call itself, etc. - a 401 here is a real
    // answer (wrong password, no session yet), not an expired access
    // token on an otherwise-valid session, so none of this applies to them.
    const isAppRequest = !NOT_A_SESSION_EXPIRY.some((path) => url.includes(path));

    if (status === 429 && String(config.method).toLowerCase() === 'get' && !config._retriedAfterLimit) {
      const wait = retryAfterSeconds(error) * 1000 || DEFAULT_RETRY_MS;
      if (wait <= MAX_AUTO_RETRY_MS) {
        config._retriedAfterLimit = true;
        await new Promise((resolve) => setTimeout(resolve, wait));
        return api(config);
      }
    }

    if (status === 401 && isAppRequest && !config._retriedAfterRefresh) {
      config._retriedAfterRefresh = true;
      try {
        const newToken = await refreshAccessToken();
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      } catch (refreshError) {
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(error);
      }
    }

    if (status === 401 && onUnauthorized && isAppRequest) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;
