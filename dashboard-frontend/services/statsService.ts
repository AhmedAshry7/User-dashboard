import { API_BASE } from "@/lib/api";

export async function fetchNoActiveUsers() {
  const res = await fetch(`${API_BASE}/stats/noActiveUsers`);
  return res.json();
}

export async function fetchSources() {
  const res = await fetch(`${API_BASE}/stats/sources`);
  return res.json();
}

export async function fetchActiveUsers(source?: string) {
  const url = source
    ? `${API_BASE}/stats/activeUsers?source=${source}`
    : `${API_BASE}/stats/activeUsers`;

  const res = await fetch(url);
  if (!res.ok) {
    // This prevents the "Unexpected token <" error
    throw new Error(`Server responded with ${res.status}`);
  }

  return await res.json(); 
}

export async function updateActiveUsers(source?: string) {
  const url = source
    ? `${API_BASE}/stats/activeUsers?source=${source}`
    : `${API_BASE}/stats/activeUsers`;

  const res = await fetch(url, { method: "PUT" });
  return res.json();
}
