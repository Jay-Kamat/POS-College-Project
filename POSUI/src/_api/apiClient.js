// Central Production REST API Client with JWT Bearer Auth and 401 Token Refresh
const BASE_URL = import.meta.env.VITE_API_URL || '';

export const getToken = () => localStorage.getItem('pos_token') || '';
export const getRefreshToken = () => localStorage.getItem('pos_refresh_token') || '';

export const setAuthTokens = (token, refreshToken) => {
  if (token) localStorage.setItem('pos_token', token);
  if (refreshToken) localStorage.setItem('pos_refresh_token', refreshToken);
};

export const clearAuth = () => {
  localStorage.removeItem('pos_token');
  localStorage.removeItem('pos_refresh_token');
  localStorage.removeItem('pos_user');
  localStorage.removeItem('pos_permissions');
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

export const getActiveStoreId = () => {
  try {
    const raw = localStorage.getItem('pos_active_store');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id || parsed?.Id) return parsed.id || parsed.Id;
    }
  } catch (e) {}
  return 'store_mum_01';
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

async function executeRequest(endpoint, options = {}, isRetry = false) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const token = getToken();

  const headers = {
    'Accept': 'application/json',
    'X-Store-Id': getActiveStoreId(),
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (netErr) {
    throw new Error(`Network error connecting to API: ${netErr.message}`);
  }

  // Handle 401 Unauthorized by attempting Refresh Token rotation
  if (res.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const currentRefreshToken = getRefreshToken();
    if (!currentRefreshToken) {
      clearAuth();
      throw new Error('Session expired. Please log in again.');
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(newToken => {
        headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(url, { ...options, headers }).then(r => handleResponse(r, endpoint));
      });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken })
      });

      if (!refreshRes.ok) {
        throw new Error('Refresh token invalid or expired');
      }

      const refreshData = await refreshRes.json();
      const newToken = refreshData.token || refreshData.data?.token;
      const newRefreshToken = refreshData.refreshToken || refreshData.data?.refreshToken;

      setAuthTokens(newToken, newRefreshToken);
      processQueue(null, newToken);

      headers['Authorization'] = `Bearer ${newToken}`;
      const retryRes = await fetch(url, { ...options, headers });
      return handleResponse(retryRes, endpoint);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      clearAuth();
      throw new Error('Authentication expired. Please log in again.');
    } finally {
      isRefreshing = false;
    }
  }

  return handleResponse(res, endpoint);
}

async function handleResponse(res, endpoint) {
  if (!res.ok) {
    let errBody = null;
    try {
      errBody = await res.json();
    } catch {
      errBody = { message: res.statusText };
    }

    // Extract message from ProblemDetails or custom API format
    const errMsg = errBody?.detail || errBody?.title || errBody?.message || `Request failed with status ${res.status}`;
    const error = new Error(errMsg);
    error.status = res.status;
    error.data = errBody;
    throw error;
  }

  // Empty response (e.g. 204 No Content)
  if (res.status === 204) return null;

  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

export const apiClient = {
  get: (endpoint, options = {}) => executeRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options = {}) => executeRequest(endpoint, { 
    method: 'POST', 
    body: body ? JSON.stringify(body) : undefined, 
    ...options 
  }),
  put: (endpoint, body, options = {}) => executeRequest(endpoint, { 
    method: 'PUT', 
    body: body ? JSON.stringify(body) : undefined, 
    ...options 
  }),
  delete: (endpoint, options = {}) => executeRequest(endpoint, { method: 'DELETE', ...options })
};

export default apiClient;
