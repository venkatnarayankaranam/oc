export const API_URL = import.meta.env.VITE_API_URL;

export const endpoints = {
  base: `${API_URL}/api`,
  auth: `${API_URL}/api/auth`,
  users: `${API_URL}/api/users`,
  events: `${API_URL}/api/events`,
};
