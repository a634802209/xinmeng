const API_BASE = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('token')
}

export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
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

  const result: ApiResponse<T> = await res.json()
  
  if (result.code !== 0) {
    throw new Error(result.msg || 'Request failed')
  }
  
  return result.data
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

export const creditApi = {
  records: (page = 1) => apiFetch(`/api/credits/records?page=${page}`),
  stats: () => apiFetch('/api/credits/stats'),
}

export const canvasApi = {
  projects: () => apiFetch('/api/canvas/projects'),
  project: (id: number) => apiFetch(`/api/canvas/projects/${id}`),
  create: (data: { name: string; nodes: unknown[]; connections: unknown[] }) =>
    apiFetch('/api/canvas/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; nodes?: unknown[]; connections?: unknown[] }) =>
    apiFetch(`/api/canvas/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/api/canvas/projects/${id}`, { method: 'DELETE' }),
}

export const configApi = {
  generate: () => apiFetch('/api/config/generate'),
  pricing: () => apiFetch('/api/config/pricing'),
}
