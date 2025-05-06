import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  _id: string
  name: string
  email: string
  institution: string
  avatar: string
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
      const res = await fetch('/api/auth/me', {
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
      setError(null)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Login failed')
      }

      const data = await response.json()
      localStorage.setItem('token', data.token)
      await fetchUser(data.token)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed')
      throw error
    }
  }

  const register = async (name: string, email: string, password: string, institution: string) => {
    try {
      setError(null)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, institution }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Registration failed')
      }

      const data = await response.json()
      localStorage.setItem('token', data.token)
      await fetchUser(data.token)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed')
      throw error
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