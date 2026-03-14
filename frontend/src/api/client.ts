import axios from 'axios';

const IDLE_TIMEOUT_MS =
  (parseInt(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES ?? '30', 10) || 30) * 60 * 1000;
const PROACTIVE_REFRESH_BUFFER_MS = 2 * 60 * 1000; // refresh 2 min before expiry

function getTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isIdle(): boolean {
  const last = localStorage.getItem('last_activity');
  if (!last) return true;
  return Date.now() - parseInt(last, 10) > IDLE_TIMEOUT_MS;
}

function updateActivity(): void {
  localStorage.setItem('last_activity', Date.now().toString());
}

// Singleton refresh promise — prevents multiple concurrent refresh calls
let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = axios
    .post<{ access_token: string }>(
      'http://localhost:8000/api/v1/auth/refresh',
      {},
      { withCredentials: true }
    )
    .then(({ data }) => {
      localStorage.setItem('access_token', data.access_token);
      updateActivity();
      return data.access_token;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function redirectToLogin(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('last_activity');
  window.location.href = '/login';
}

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach token; proactively refresh if expiring soon and user is active
apiClient.interceptors.request.use(async (config) => {
  updateActivity();
  const token = localStorage.getItem('access_token');
  if (token) {
    const exp = getTokenExp(token);
    if (exp !== null && exp - Date.now() < PROACTIVE_REFRESH_BUFFER_MS) {
      // Token about to expire — refresh proactively if user is not idle
      if (!isIdle()) {
        try {
          const newToken = await doRefresh();
          config.headers.Authorization = `Bearer ${newToken}`;
          return config;
        } catch {
          redirectToLogin();
          return config;
        }
      }
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — on 401 refresh once if not idle, otherwise log out
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (isIdle()) {
        redirectToLogin();
        return Promise.reject(error);
      }
      try {
        const newToken = await doRefresh();
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        redirectToLogin();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
