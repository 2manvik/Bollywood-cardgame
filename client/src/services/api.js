const BASE_URL = 'https://bollywood-cardgame-2ftt.vercel.app/http://localhost:5000/api';

/**
 * Enhanced fetch wrapper with cookie credentials and auth header support
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  console.log(url)

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = localStorage.getItem('guess_it_token');
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // sends cookies
  };

  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Authentication APIs
export const authApi = {
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  getMe: () => apiFetch('/auth/me'),
};

// User Profile & Search APIs
export const userApi = {
  search: (query) => apiFetch(`/users/search?username=${encodeURIComponent(query)}`),
  getProfile: (id) => apiFetch(`/users/${id}/profile`),
  updateUsername: (username) => apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ username }) }),
};

// Categories API
export const cardApi = {
  getCategories: () => apiFetch('/cards/categories'),
};

// Match Requests (Friend Challenges) APIs
export const challengeApi = {
  send: (recipientId, category) => apiFetch('/match-requests', { method: 'POST', body: JSON.stringify({ recipientId, category }) }),
  getPending: () => apiFetch('/match-requests/pending'),
  accept: (id) => apiFetch(`/match-requests/${id}/accept`, { method: 'PATCH' }),
  reject: (id) => apiFetch(`/match-requests/${id}/reject`, { method: 'PATCH' }),
  cancel: (id) => apiFetch(`/match-requests/${id}`, { method: 'DELETE' }),
};

// Match History & State APIs
export const matchApi = {
  getHistory: () => apiFetch('/matches/history'),
  getDetails: (matchId) => apiFetch(`/matches/${matchId}`),
  getActive: () => apiFetch('/matches/active'),
};
