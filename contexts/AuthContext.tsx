"use client"

import type React from "react"
import { createContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify" // Usar toast de react-toastify

interface User {
  id: number
  email: string
  name: string
  lastname: string
  role: "admin" | "conductor"
  dni: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isConductor: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void> // Modified to accept email and password
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user
  const isAdmin = user?.role === "admin"
  const isConductor = user?.role === "conductor"

  const fetchUser = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Error fetching user:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Modified login function to handle API call
  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Error al iniciar sesión")
      }

      setUser(data.user)
      router.push(data.redirectUrl)
      // toast.success("Inicio de sesión exitoso!"); // Toast handled by LoginPage
    } catch (error: any) {
      console.error("Login error:", error)
      setUser(null) // Ensure user is null on login failure
      throw error // Re-throw to be caught by the component
    } finally {
      setIsLoading(false)
    }
  }

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch (error) {
      console.error("Error logging out:", error)
      toast.error("Error al cerrar sesión.")
    } finally {
      setUser(null)
      router.push("/") // Redirect to homepage after logout
    }
  }, [router])

  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      fetchUser()
    }
  }, [fetchUser])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isConductor,
        isLoading,
        login,
        logout,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
