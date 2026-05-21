const API_BASE = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('token')
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Request failed')
  }
  return data
}

export const authApi = {
  sendCode: (email: string) => apiFetch('/api/auth/send-code', { method: 'POST', body: JSON.stringify({ email }) }),
  login: (email: string, code: string) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, code }) }),
  me: () => apiFetch('/api/auth/me'),
}

export const generateApi = {
  image: (params: Record<string, unknown>) => apiFetch('/api/generate/image', { method: 'POST', body: JSON.stringify(params) }),
  video: (params: Record<string, unknown>) => apiFetch('/api/generate/video', { method: 'POST', body: JSON.stringify(params) }),
  status: (taskId: string) => apiFetch(`/api/generate/status/${taskId}`),
}

export const userApi = {
  profile: () => apiFetch('/api/user/profile'),
  usage: () => apiFetch('/api/user/usage'),
}

export const worksApi = {
  list: () => apiFetch('/api/works'),
  delete: (id: number) => apiFetch(`/api/works/${id}`, { method: 'DELETE' }),
}
