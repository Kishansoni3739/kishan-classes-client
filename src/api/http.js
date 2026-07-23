import axios from "axios";

let rawUrl = import.meta.env.VITE_API_URL || "";

// Automatically fix typo domain kishan-classes-server.onrender.com -> kishan-classes.onrender.com
if (rawUrl.includes("kishan-classes-server.onrender.com")) {
  rawUrl = rawUrl.replace("kishan-classes-server.onrender.com", "kishan-classes.onrender.com");
}

// Production web fallback for Vercel/live web if env var is missing or invalid
if (!rawUrl || rawUrl === "/api") {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    rawUrl = "https://kishan-classes.onrender.com/api";
  }
}

// Ensure /api path suffix is present if a base domain was supplied
if (rawUrl && !rawUrl.endsWith("/api") && !rawUrl.endsWith("/api/")) {
  rawUrl = `${rawUrl.replace(/\/$/, "")}/api`;
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
