"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
// import { toast } from "sonner" // Descomenta cuando tengas Sonner instalado

export interface User {
  id: number
  email: string
  name: string
  lastname: string
  role: "Admin" | "Operador" | "S_A"
  dni: string
  state?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get("/api/auth/me")
      if (response.data.user) {
        setUser(response.data.user)
      }
    } catch (error: any) {
      // ✅ SILENCIOSO: 401 es normal para usuarios no logueados
      // Solo log errores que NO sean 401 (unauthorized)
      if (error.response?.status !== 401) {
        console.error("Auth check error:", error)
      }
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post("/api/auth/login", {
        email,
        password,
      })

      if (response.data.success) {
        setUser(response.data.user)
        
        // ✅ Toast de éxito (descomenta cuando tengas Sonner)
        // toast.success(`¡Bienvenido, ${response.data.user.name}!`, {
        //   description: "Iniciando sesión..."
        // })
        console.log(`✅ Login exitoso: ${response.data.user.name}`)
        
        // Redirección inmediata (sin delay por ahora)
        if (response.data.user.role === "Admin" || response.data.user.role === "S_A") {
          router.push("/admin/dashboard")
        } else if (response.data.user.role === "Operador") {
          router.push(`/despacho/${response.data.user.id}`)
        } else {
          router.push("/")
        }
      } else {
        throw new Error(response.data.error || "Error al iniciar sesión")
      }
    } catch (error: any) {
      // ✅ Toast de error (descomenta cuando tengas Sonner)
      const errorMessage = error.response?.data?.error || error.message || "Error al iniciar sesión"
      // toast.error("Error de autenticación", {
      //   description: errorMessage
      // })
      console.error("❌ Login error:", errorMessage)
      throw new Error(errorMessage)
    }
  }

  const logout = async () => {
    try {
      await axios.post("/api/auth/logout")
      
      // ✅ Toast de éxito (descomenta cuando tengas Sonner)
      // toast.success("Sesión cerrada correctamente")
      console.log("✅ Logout exitoso")
      
    } catch (error) {
      // ✅ Silencioso: logout siempre limpia el estado local
      console.log("⚠️ Logout con advertencia, pero sesión limpiada localmente")
    } finally {
      setUser(null)
      router.push("/")
    }
  }

  const isAuthenticated = !!user

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  const isConductor = context.user?.role === "Operador"
  const isAdmin = context.user?.role === "Admin" || context.user?.role === "S_A"

  return {
    ...context,
    isConductor,
    isAdmin,
  }
}

export { AuthContext }