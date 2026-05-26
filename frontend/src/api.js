const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_PREFIX = '/bfhl';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.data = data;
    throw error;
  }

  return data;
}

export function listTickets(filters) {
  const params = new URLSearchParams();
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.breachedOnly) params.set('breached', 'true');
  return request(`${API_PREFIX}/tickets?${params.toString()}`);
}

export function getStats() {
  return request(`${API_PREFIX}/tickets/stats`);
}

export function createTicket(payload) {
  return request(`${API_PREFIX}/tickets`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateTicket(id, payload) {
  return request(`${API_PREFIX}/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function deleteTicket(id) {
  return request(`${API_PREFIX}/tickets/${id}`, {
    method: 'DELETE'
  });
}
