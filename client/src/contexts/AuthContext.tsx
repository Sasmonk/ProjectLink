import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  _id: string
  name: string
  email: string
  institution: string
  avatar: string
  isAdmin: boolean
  following: string[]
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, institution: string) => Promise<void>
  logout: () => void
  token: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
}

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL

// Add retry mechanism for API calls
const fetchWithRetry = async (url: string, options: any = {}, retries = 3, delay = 1000) => {
  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  } catch (error) {
    if (retries > 0) {
      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, delay))
      // Retry the request
      return fetchWithRetry(url, options, retries - 1, delay * 2)
    }
    throw error
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  token: null,
  setUser: () => {},
  setToken: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token')
    if (token) {
      fetchUser(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`API error: ${res.status} - ${text}`)
      }

      const data = await res.json()
      // Ensure both id and _id are set
      const userData = {
        ...data,
        id: data._id || data.id, // Use _id if available, fallback to id
        _id: data._id || data.id // Ensure _id is set
      }
      setUser(userData)
      setToken(token)
    } catch (error) {
      console.error('Error fetching user:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchWithRetry(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Login failed')
      setUser(data.user)
      setToken(data.token)
      localStorage.setItem('token', data.token)
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string, institution: string) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchWithRetry(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, institution }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Registration failed')
      setUser(data.user)
      setToken(data.token)
      localStorage.setItem('token', data.token)
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, token, setUser, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 