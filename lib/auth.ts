import { cookies } from "next/headers"
import { verifyToken } from "./jwt"

export interface AuthUser {
  id: number
  email: string
  role: "Admin" | "Operador" | "S_A"
  dni: string
  name: string
  lastname: string
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return null
    }

    const payload = await verifyToken(token)
    return payload
  } catch (error) {
    console.error("Error getting auth user:", error)
    return null
  }
}

export function isAdmin(user: any): boolean {
  return user?.role === "Admin" || user?.role === "S_A"
}

export function isConductor(user: any): boolean {
  return user?.role === "Operador"
}

export function isAuthorized(user: any, requiredRoles: string[]): boolean {
  return user && requiredRoles.includes(user.role)
}

export function canAccessAdminRoutes(user: any): boolean {
  return isAdmin(user)
}

export function canAccessDriverRoutes(user: any): boolean {
  return isConductor(user) || isAdmin(user)
}