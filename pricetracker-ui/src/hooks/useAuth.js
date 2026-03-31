import { useState, useCallback } from 'react'
import { jwtDecode } from 'jwt-decode'

const TOKEN_KEY = 'pt_token'

function getUser(token) {
  try {
    return jwtDecode(token)
  } catch {
    return null
  }
}

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))

  const login = useCallback(newToken => {
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }, [])

  const user = token ? getUser(token) : null

  return { token, user, login, logout, isLoggedIn: !!token }
}
