"use client"

import { useContext } from "react"
import { AuthContext } from "@/contexts/AuthContext"

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