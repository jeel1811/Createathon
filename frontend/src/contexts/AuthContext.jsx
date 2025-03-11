import { createContext, useContext, useState, useEffect } from 'react'
import axiosInstance from '../utils/axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Token ${token}`
      fetchUserProfile()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/users/me/')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    const response = await axiosInstance.post('/api/users/login/', credentials)
    const { token, refresh_token, user } = response.data
    localStorage.setItem('token', token)
    localStorage.setItem('refresh_token', refresh_token)
    axiosInstance.defaults.headers.common['Authorization'] = `Token ${token}`
    setUser(user)
  }

  const register = async (userData) => {
    const response = await axiosInstance.post('/api/users/register/', userData)
    const { token } = response.data
    localStorage.setItem('token', token)
    axiosInstance.defaults.headers.common['Authorization'] = `Token ${token}`
    setUser(response.data.user)
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    delete axiosInstance.defaults.headers.common['Authorization']
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser(prevUser => ({
      ...prevUser,
      ...userData
    }))
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshProfile: fetchUserProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
