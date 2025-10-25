import { ref, computed, watch } from 'vue'

const token = ref(localStorage.getItem('authToken') || '')
const isAuthenticated = computed(() => !!token.value)
const authCallbacks = []

export function useAuth() {
  const login = async (username, password) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
      
      const data = await response.json()
      
      if (data.success) {
        token.value = data.token
        localStorage.setItem('authToken', data.token)
        return { success: true }
      } else {
        return { success: false, error: data.error || '登录失败' }
      }
    } catch (error) {
      return { success: false, error: '网络错误' }
    }
  }
  
  const logout = () => {
    token.value = ''
    localStorage.removeItem('authToken')
  }
  
  const getAuthHeaders = () => {
    if (!token.value) return {}
    return {
      'Authorization': `Bearer ${token.value}`
    }
  }
  
  const onAuthChange = (callback) => {
    authCallbacks.push(callback)
  }
  
  // 全局 API 请求处理函数
  const apiRequest = async (url, options = {}) => {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    }
    
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    }
    
    try {
      const response = await fetch(url, mergedOptions)
      
      // 检查 401 错误
      if (response.status === 401) {
        // Token 过期，自动登出
        logout()
        throw new Error('Token expired')
      }
      
      return response
    } catch (error) {
      if (error.message === 'Token expired') {
        throw error
      }
      throw new Error('网络请求失败')
    }
  }
  
  // 监听认证状态变化
  watch(isAuthenticated, (newVal, oldVal) => {
    if (newVal !== oldVal) {
      authCallbacks.forEach(cb => cb(newVal))
    }
  })
  
  return {
    token,
    isAuthenticated,
    login,
    logout,
    getAuthHeaders,
    onAuthChange,
    apiRequest
  }
}

