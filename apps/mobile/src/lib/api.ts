import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

const BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3001/api/v1'

export const api = axios.create({ baseURL: BASE_URL, timeout: 15000 })

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, null, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        })
        await SecureStore.setItemAsync('accessToken', data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        await SecureStore.deleteItemAsync('accessToken')
        await SecureStore.deleteItemAsync('refreshToken')
        // Navigation handled in auth store
      }
    }
    return Promise.reject(error)
  }
)
