// REST API Client communicating with Backend on http://localhost:5000 (via Vite proxy / direct)
const BASE_URL = import.meta.env.VITE_API_URL || '';

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

export const apiClient = {
  get: async (endpoint) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Store-Id': getActiveStoreId()
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `GET ${endpoint} failed (${res.status})`);
    }
    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  },

  post: async (endpoint, body) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Store-Id': getActiveStoreId()
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `POST ${endpoint} failed (${res.status})`);
    }
    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  },

  put: async (endpoint, body) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Store-Id': getActiveStoreId()
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `PUT ${endpoint} failed (${res.status})`);
    }
    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  },

  delete: async (endpoint) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-Store-Id': getActiveStoreId()
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `DELETE ${endpoint} failed (${res.status})`);
    }
    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  }
};

export default apiClient;
