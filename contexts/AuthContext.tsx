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
  const isAdmin = user?.role === "Admin" || user?.role === "S_A"
  const isOperator = user?.role === "Operador"
  const isSuperAdmin = user?.role === "S_A"
  const isAuthenticated = !!user

  useEffect(() => {
    console.log(`🔄 AuthContext: Checking auth status on mount`)
    checkAuthStatus()
  }, [])

   const checkAuthStatus = async () => {
    try {
      console.log(`🔍 AuthContext: Fetching user data`)
      const response = await axios.get("/api/auth/me")
      if (response.data.user) {
        console.log(`✅ AuthContext: User authenticated - ${response.data.user.role}`)
        setUser(response.data.user)
      } else {
        console.log(`❌ AuthContext: No user data received`)
        setUser(null)
      }
    } catch (error: any) {
      // Manejar errores 401 silenciosamente (usuario no autenticado)
      if (error.response?.status === 401) {
        console.log(`🔓 AuthContext: User not authenticated (401)`)
        setUser(null)
      } else {
        // Solo mostrar errores que no sean 401
        console.error("❌ AuthContext: Unexpected auth check error:", error.response?.status || error.message)
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    console.log(`🔄 AuthContext: Refreshing user data`)
    await checkAuthStatus()
  }

  const login = async (email: string, password: string) => {
    try {
      console.log(`🔐 AuthContext: Attempting login for ${email}`)
      const response = await axios.post("/api/auth/login", {
        email,
        password,
      })

      if (response.data.success) {
        setUser(response.data.user)
        console.log(`✅ AuthContext: Login successful for ${response.data.user.name}`)

        // Redirect based on role
        const redirectUrl = getRedirectUrl(response.data.user)
        console.log(`🔄 AuthContext: Redirecting to ${redirectUrl}`)
        router.push(redirectUrl)
      } else {
        throw new Error(response.data.error || "Error al iniciar sesión")
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || "Error al iniciar sesión"
      console.error("❌ AuthContext: Login error:", errorMessage)
      throw new Error(errorMessage)
    }
  }

  const logout = async () => {
    try {
      console.log(`🔓 AuthContext: Logging out`)
      await axios.post("/api/auth/logout")
      console.log("✅ AuthContext: Logout successful")
    } catch (error) {
      console.log("⚠️ AuthContext: Logout warning, but clearing session locally")
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