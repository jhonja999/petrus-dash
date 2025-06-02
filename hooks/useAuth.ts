"use client"

import { useContext } from "react"
import { AuthContext } from "@/contexts/AuthContext"
import type { User } from "@/contexts/AuthContext" // Import User type from AuthContext

interface UseAuthReturn {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isConductor: boolean
  isAdmin: boolean
}

export const useAuth = (): UseAuthReturn => {
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
