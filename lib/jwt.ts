import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "tu_secreto_super_seguro")

export interface AuthPayload {
  id: number
  email: string
  name: string
  lastname: string
  role: "Admin" | "Operador" | "S_A"
  dni: string
  state: string
  iat?: number
  exp?: number
}

export async function signToken(payload: Omit<AuthPayload, "iat" | "exp">): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)
}

export async function verifyToken(token: string): Promise<AuthPayload> {
  try {
    const { payload } = await jwtVerify(token, secret)

    // Convert to unknown first, then to our custom type
    const unknownPayload = payload as unknown
    const authPayload = unknownPayload as AuthPayload

    // Type guard to ensure payload has required properties
    if (
      typeof authPayload.id === "number" &&
      typeof authPayload.email === "string" &&
      typeof authPayload.name === "string" &&
      typeof authPayload.lastname === "string" &&
      typeof authPayload.role === "string" &&
      typeof authPayload.dni === "string" &&
      typeof authPayload.state === "string"
    ) {
      return authPayload
    }

    throw new Error("Invalid token payload structure")
  } catch (error) {
    throw new Error("Invalid token")
  }
}

export async function getUserFromToken(): Promise<AuthPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return null
    }

    return await verifyToken(token)
  } catch (error) {
    console.error("Error getting user from token:", error)
    return null
  }
}

// Helper functions for role checking
export function isAdmin(user: AuthPayload | null): boolean {
  if (!user) return false
  return user.role === "Admin" || user.role === "S_A"
}

export function isOperator(user: AuthPayload | null): boolean {
  if (!user) return false
  return user.role === "Operador"
}

export function isSuperAdmin(user: AuthPayload | null): boolean {
  if (!user) return false
  return user.role === "S_A"
}

export function hasAdminAccess(user: AuthPayload | null): boolean {
  return isAdmin(user)
}

export function hasOperatorAccess(user: AuthPayload | null): boolean {
  return isOperator(user) || isAdmin(user)
}
