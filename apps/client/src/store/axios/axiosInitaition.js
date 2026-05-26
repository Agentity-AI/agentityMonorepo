import axios from "axios";

export const AUTH_TOKEN_STORAGE_KEY = "agentity_auth_token";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  "https://agentitymonorepo.onrender.com";

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setAuthToken(token) {
  if (typeof window === "undefined") return;

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function clearAuthToken() {
  setAuthToken(null);
}

const api = axios.create({
  baseURL: apiBaseUrl.replace(/\/+$/, ""),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
