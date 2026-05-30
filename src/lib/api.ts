const API_BASE = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('token')
}

export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
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

  const data = await res.json() as ApiResponse<T>
  
  // 如果状态码不是200，抛出错误
  if (data.code !== 200) {
    throw new Error(data.msg || '请求失败')
  }
  
  return data
}

export const authApi = {
  sendCode: (email: string) => apiFetch('/api/email/send-code', { method: 'POST', body: JSON.stringify({ email }) }),
  login: (email: string, code: string) =>
    apiFetch('/api/user/login', { method: 'POST', body: JSON.stringify({ email, code }) }),
  me: () => apiFetch('/api/auth/me'),
}

export const homeApi = {
  init: () => apiFetch('/api/home/init'),
}

export const payApi = {
  createOrder: (data: { recharge_type?: string; amount: number; power_num: number }) =>
    apiFetch('/api/pay/create', { method: 'POST', body: JSON.stringify(data) }),
  getOrderStatus: (orderNo: string) =>
    apiFetch(`/api/pay/status/${orderNo}`),
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
