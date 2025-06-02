"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { toast } from "sonner" // Using Sonner for better toast experience

// Consistent User interface using Prisma types
export interface User {
  id: number
  email: string
  name: string
  lastname: string
  role: "Admin" | "Operador" | "S_A"
  dni: string
  state?: "Activo" | "Inactivo" | "Suspendido" | "Eliminado" | "Asignado"
  createdAt?: Date
  updatedAt?: Date
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

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get("/api/auth/me")
      if (response.data.user) {
        setUser(response.data.user)
      }
    } catch (error) {
      // User is not authenticated - this is normal, no toast needed
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      // Show loading toast
      const loadingToast = toast.loading("Iniciando sesión...")

      const response = await axios.post("/api/auth/login", {
        email,
        password,
      })

      if (response.data.success) {
        setUser(response.data.user)
        
        // Dismiss loading toast and show success
        toast.dismiss(loadingToast)
        toast.success(`¡Bienvenido, ${response.data.user.name}!`, {
          description: "Has iniciado sesión correctamente",
          duration: 3000,
        })
        
        // Small delay to show the success message before redirect
        setTimeout(() => {
          // Redirect based on role
          if (response.data.user.role === "Admin" || response.data.user.role === "S_A") {
            router.push("/admin/dashboard")
          } else if (response.data.user.role === "Operador") {
            router.push(`/despacho/${response.data.user.id}`)
          } else {
            router.push("/")
          }
        }, 1000)
      } else {
        toast.dismiss(loadingToast)
        throw new Error(response.data.error || "Error al iniciar sesión")
      }
    } catch (error: any) {
      // Show error toast
      const errorMessage = error.response?.data?.error || error.message || "Error al iniciar sesión"
      toast.error("Error de autenticación", {
        description: errorMessage,
        duration: 5000,
      })
      throw new Error(errorMessage)
    }
  }

  const logout = async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading("Cerrando sesión...")
      
      await axios.post("/api/auth/logout")
      
      // Dismiss loading and show success
      toast.dismiss(loadingToast)
      toast.success("Sesión cerrada", {
        description: "Has cerrado sesión correctamente",
        duration: 3000,
      })
      
    } catch (error) {
      console.error("Logout error:", error)
      // Even if logout fails on server, we still clear client state
      toast.warning("Sesión cerrada localmente", {
        description: "Hubo un problema con el servidor, pero tu sesión se cerró localmente",
        duration: 3000,
      })
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