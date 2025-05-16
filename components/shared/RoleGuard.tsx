"use client"

import type React from "react"

import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import type { Roles } from "@/types/globals"

interface RoleGuardProps {
  allowedRoles: Roles[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { sessionClaims, isLoaded } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    if (isLoaded && sessionClaims?.metadata?.role) {
      const userRole = sessionClaims.metadata.role as Roles
      setHasAccess(allowedRoles.includes(userRole))
    }
  }, [isLoaded, sessionClaims, allowedRoles])

  if (!isLoaded) {
    return null
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
