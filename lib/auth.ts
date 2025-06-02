import { getUserFromToken } from "./jwt"
import bcrypt from "bcryptjs"

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
    const user = await getUserFromToken()
    return user
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

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}
