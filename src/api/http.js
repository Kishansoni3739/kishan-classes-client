import axios from "axios";

let rawUrl = import.meta.env.VITE_API_URL || "";

// Ensure /api path suffix is present if a base domain was supplied
if (rawUrl && !rawUrl.endsWith("/api") && !rawUrl.endsWith("/api/")) {
  rawUrl = `${rawUrl.replace(/\/$/, "")}/api`;
}

// Fallback for native Capacitor Android apps if env var is missing or blank
if (!rawUrl && typeof window !== "undefined" && (window.location.protocol === "https:" && window.location.hostname === "localhost")) {
  rawUrl = "https://kishan-classes.onrender.com/api";
}

export const API_URL = rawUrl || "/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 45000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("kc_token");
      localStorage.removeItem("kc_user");
      localStorage.removeItem("kc_profile");
      localStorage.removeItem("kc_switchable_profiles");
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
