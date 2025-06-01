import { jwtVerify } from "jose"
import type { NextRequest } from "next/server"

// Actualizado para reflejar los roles de Prisma
interface AuthPayload {
  id: number
  email: string
  role: "Operador" | "Admin" | "S_A" // Nuevos roles de Prisma
  dni: string
  name: string
  lastname: string
}

interface AuthResult {
  isValid: boolean
  payload: AuthPayload | null
  error: string | null
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const token = request.cookies.get("token")?.value

  if (!token) {
    return { isValid: false, payload: null, error: "No token provided" }
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET environment variable is not set")
    return { isValid: false, payload: null, error: "Server configuration error" }
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET)

  try {
    // Usar 'unknown' primero para una aserción de tipo más segura
    const { payload } = await jwtVerify(token, secret)
    return { isValid: true, payload: payload as unknown as AuthPayload, error: null }
  } catch (error: any) {
    console.error("Token verification failed:", error.message)
    return { isValid: false, payload: null, error: "Invalid or expired token" }
  }
}

/**
 * Get the authenticated user from the request
 */
export async function getAuthUser(req?: NextRequest) {
  try {
    if (!req) return null

    const token = req.cookies.get("token")?.value
    if (!token) return null

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET environment variable is not set")
      return null
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)

    const { payload } = await jwtVerify(token, secret)
    return (payload as unknown as AuthPayload) || null
  } catch (error) {
    console.error("Error getting auth user:", error)
    return null
  }
}

/**
 * Type guard to check if a user has a specific role and narrow its type
 */
export function hasRole<T extends AuthPayload>(user: T | null, role: "Operador" | "Admin" | "S_A"): user is T {
  return user !== null && user.role === role
}

/**
 * Check if a user is an admin
 */
export function isAdmin(user: AuthPayload | null): boolean {
  return hasRole(user, "Admin") // Comprueba el rol "Admin"
}

/**
 * Check if a user is a conductor (Operador)
 */
export function isConductor(user: AuthPayload | null): boolean {
  return hasRole(user, "Operador") // Comprueba el rol "Operador"
}

/**
 * Check if a user can access a specific driver route
 */
export function canAccessDriverRoute(user: AuthPayload | null, driverId: string): boolean {
  // Añadir una comprobación explícita para 'user' no sea null
  if (!user) {
    return false
  }
  // Con hasRole como type guard, TypeScript puede inferir que user no es null
  return isAdmin(user) || (isConductor(user) && user.id.toString() === driverId)
}

/**
 * Get user from token
 */
export async function getUserFromToken(token: string) {
  try {
    if (!token) return null
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET environment variable is not set")
      return null
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as AuthPayload
  } catch (error) {
    console.error("Error getting user from token:", error)
    return null
  }
}
