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

// Contador global para instancias de AuthProvider
let authProviderInstanceCount = 0

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
    authProviderInstanceCount++
    console.log(`🏗️ Instancia de AuthProvider ${authProviderInstanceCount} creada.`)
    if (authProviderInstanceCount > 1) {
      console.warn(
        "⚠️ ¡Múltiples instancias de AuthProvider detectadas! Esto puede causar comportamiento inesperado y bucles de llamadas a la API.",
      )
    }

    console.log(`🔄 AuthContext: Verificando estado de autenticación al montar para la ruta: ${pathname}`)
    checkAuthStatus()

    return () => {
      authProviderInstanceCount--
      console.log(`🗑️ Instancia de AuthProvider destruida. Restantes: ${authProviderInstanceCount}`)
    }
  }, [])

  // **CORREGIDO: Agregar efecto para manejar la navegación post-autenticación**
  useEffect(() => {
    if (!isLoading && user) {
      // Solo redirigir si el usuario está en la página no autorizada pero debería tener acceso
      if (pathname === "/unauthorized") {
        const redirectUrl = getRedirectUrl(user)
        console.log(`🔄 AuthContext: Usuario en página no autorizada, redirigiendo a ${redirectUrl}`)
        window.location.href = redirectUrl
      }
    }
  }, [user, isLoading, pathname])

  const checkAuthStatus = async () => {
    try {
      console.log(`🔍 AuthContext: Obteniendo datos del usuario`)
      const response = await axios.get("/api/auth/me")
      if (response.data.user) {
        console.log(`✅ AuthContext: Usuario autenticado - ${response.data.user.role}`)
        setUser(response.data.user)

        // **CORREGIDO: Verificar si el estado del usuario es válido**
        if (
          response.data.user.state === "Inactivo" ||
          response.data.user.state === "Suspendido" ||
          response.data.user.state === "Eliminado"
        ) {
          console.log(`⚠️ AuthContext: Estado de usuario inválido: ${response.data.user.state}`)
          setUser(null)
          window.location.href = "/unauthorized"
          return
        }
      } else {
        console.log(`❌ AuthContext: No se recibieron datos del usuario`)
        setUser(null)
      }
    } catch (error: any) {
      // Manejar errores 401 silenciosamente (usuario no autenticado)
      if (error.response?.status === 401) {
        console.log(`🔓 AuthContext: Usuario no autenticado (401)`)
        setUser(null)
      } else {
        // Solo registrar errores que no sean 401
        console.error("❌ AuthContext: Error inesperado en verificación de autenticación:", error.response?.status || error.message)
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    console.log(`🔄 AuthContext: Actualizando datos del usuario`)
    await checkAuthStatus()
  }

  const login = async (email: string, password: string) => {
    try {
      console.log(`🔐 AuthContext: Intentando iniciar sesión para ${email}`)
      const response = await axios.post("/api/auth/login", {
        email,
        password,
      })

      if (response.data.success) {
        setUser(response.data.user)
        console.log(`✅ AuthContext: Inicio de sesión exitoso para ${response.data.user.name}`)

        // **CORREGIDO: Verificar estado del usuario antes de redirigir**
        if (
          response.data.user.state === "Inactivo" ||
          response.data.user.state === "Suspendido" ||
          response.data.user.state === "Eliminado"
        ) {
          throw new Error("Tu cuenta está inactiva o suspendida. Contacta al administrador.")
        }

        // Redirigir basándose en el rol solo durante el inicio de sesión explícito
        const redirectUrl = getRedirectUrl(response.data.user)
        console.log(`🔄 AuthContext: Redirigiendo a ${redirectUrl}`)
        window.location.href = redirectUrl // Usar window.location en lugar de router
      } else {
        throw new Error(response.data.error || "Error al iniciar sesión")
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || "Error al iniciar sesión"
      console.error("❌ AuthContext: Error de inicio de sesión:", errorMessage)
      throw new Error(errorMessage)
    }
  }

  const logout = async () => {
    try {
      console.log(`🔓 AuthContext: Cerrando sesión`)
      await axios.post("/api/auth/logout")
      console.log("✅ AuthContext: Cierre de sesión exitoso")
    } catch (error) {
      console.log("⚠️ AuthContext: Advertencia al cerrar sesión, pero limpiando sesión localmente")
    } finally {
      setUser(null)
      window.location.href = "/" // Usar window.location en lugar de router
    }
  }

  // Función auxiliar para determinar la URL de redirección basada en el rol del usuario
  const getRedirectUrl = (user: User): string => {
    if (user.role === "Admin" || user.role === "S_A") {
      return "/dashboard"
    } else if (user.role === "Operador") {
      return `/despacho/${user.id}` // Directo al panel del conductor
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
    throw new Error("useAuth debe ser usado dentro de un AuthProvider")
  }
  return context
}

export { AuthContext }
