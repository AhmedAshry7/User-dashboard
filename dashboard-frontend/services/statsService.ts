import { API_BASE } from "@/lib/api";

function authHeader() {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
  };
}

export const fetchActiveUsers = async (filters?: any) => {
  const res = await fetch(`${API_BASE}/stats/activeUsers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ filters }),
  });
  if (!res.ok) {
    // This prevents the "Unexpected token <" error
    throw new Error(`Server responded with ${res.status}`);
  }
  return res.json();
};


export async function fetchNoActiveUsers() {
  const res = await fetch(`${API_BASE}/stats/noActiveUsers`, {
    headers: authHeader(),
  });
  return res.json();
}

export async function fetchFilters() {
  const res = await fetch(`${API_BASE}/stats/filters`, {
    headers: authHeader(),
  });
  return res.json();
}

export async function updateActiveUsers(source?: string) {
  const url = source
    ? `${API_BASE}/stats/activeUsers?source=${source}`
    : `${API_BASE}/stats/activeUsers`;

  const res = await fetch(url, { method: "PUT", headers: authHeader() });
  return res.json();
}
