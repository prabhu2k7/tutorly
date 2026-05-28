import axios from 'axios'

export const API_BASE = '/api'
const KEY_STORAGE = 'tutorly_openai_key'

export function getStoredKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

export function setStoredKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key)
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* ignore */
  }
}

export function clearStoredKey() {
  setStoredKey('')
}

/** axios instance that injects the BYOK header on every request that needs it. */
export const apiClient = axios.create({ baseURL: API_BASE })

apiClient.interceptors.request.use((cfg) => {
  const key = getStoredKey()
  if (key) {
    cfg.headers = cfg.headers || {}
    cfg.headers['X-OpenAI-Key'] = key
  }
  return cfg
})

/** True if the most recent /api/health said the server has no fallback key. */
export async function fetchHealth() {
  const { data } = await apiClient.get('/health')
  return data
}
