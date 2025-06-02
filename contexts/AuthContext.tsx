"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import axios from "axios"

export interface User {
  id: number
  email: string
  name: string
  lastname: string
  role: "Admin" | "Operador" | "S_A"
  dni: string
  state: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isAdmin: boolean
  isOperator: boolean
  isSuperAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get("/api/auth/me")
      if (response.data.user) {
        setUser(response.data.user)
      } else {
        setUser(null)
      }
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.error("Auth check error:", error)
      }
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    await checkAuthStatus()
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post("/api/auth/login", {
        email,
        password,
      })

      if (response.data.success) {
        setUser(response.data.user)

        console.log(`✅ Login exitoso: ${response.data.user.name}`)

        // Redirect based on role
        const redirectUrl = getRedirectUrl(response.data.user)
        router.push(redirectUrl)
      } else {
        throw new Error(response.data.error || "Error al iniciar sesión")
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || "Error al iniciar sesión"
      console.error("❌ Login error:", errorMessage)
      throw new Error(errorMessage)
    }
  }

  const logout = async () => {
    try {
      await axios.post("/api/auth/logout")
      console.log("✅ Logout exitoso")
    } catch (error) {
      console.log("⚠️ Logout con advertencia, pero sesión limpiada localmente")
    } finally {
      setUser(null)
      router.push("/")
    }
  }

  const getRedirectUrl = (user: User): string => {
    if (user.role === "Admin" || user.role === "S_A") {
      return "/dashboard"
    } else if (user.role === "Operador") {
      return `/despacho/${user.id}`
    }
    return "/"
  }

  const isAuthenticated = !!user
  const isAdmin = user?.role === "Admin" || user?.role === "S_A"
  const isOperator = user?.role === "Operador"
  const isSuperAdmin = user?.role === "S_A"

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isOperator,
    isSuperAdmin,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export { AuthContext }
