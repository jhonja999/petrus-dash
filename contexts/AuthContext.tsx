"use client"

import React, { createContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
// No longer importing getAuthUser from lib/auth directly here
// import type { AuthPayload } from "@/lib/jwt"; // Keep type import if still needed for AuthPayload structure reference

export interface User {
  id: number
  email: string
  name: string
  lastname: string
  role: "Operador" | "Admin" | "S_A"
  dni: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const checkAuthStatus = useCallback(async () => {
    try {
      // Call the new API route to get authentication status
      const response = await fetch("/api/auth/status")
      const data = await response.json()

      if (response.ok && data.isAuthenticated) {
        setUser(data.user)
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error("Error checking auth status via API:", error)
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await checkAuthStatus() // Re-check auth status to update user state after login
        toast.success("Inicio de sesión exitoso")
        if (data.redirectUrl) {
          router.replace(data.redirectUrl)
        } else {
          router.replace("/")
        }
      } else {
        throw new Error(data.error || "Error al iniciar sesión")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      toast.error(error.message || "Error desconocido al iniciar sesión")
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUser(null)
        setIsAuthenticated(false)
        toast.info("Sesión cerrada correctamente")
        router.replace("/")
      } else {
        throw new Error(data.error || "Error al cerrar sesión")
      }
    } catch (error: any) {
      console.error("Logout error:", error)
      toast.error(error.message || "Error desconocido al cerrar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  const contextValue = React.useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
    }),
    [user, isAuthenticated, isLoading],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
