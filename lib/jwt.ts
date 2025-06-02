import { SignJWT, jwtVerify, type JWTPayload } from "jose"

// Updated AuthPayload interface to match Prisma enum roles
export interface AuthPayload extends JWTPayload {
  id: number
  email: string
  role: "Operador" | "Admin" | "S_A"
  dni: string
  name: string
  lastname: string
  state: string
  iat?: number
  exp?: number
}

const secretKey = process.env.JWT_SECRET

if (!secretKey) {
  throw new Error("JWT_SECRET is not defined in environment variables")
}

const secret = new TextEncoder().encode(secretKey)

export async function signToken(payload: Omit<AuthPayload, "iat" | "exp">): Promise<string> {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // Token expires in 7 days
      .sign(secret)
    return token
  } catch (error) {
    console.error("Error signing JWT token:", error)
    throw new Error("Failed to sign token")
  }
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    })

    // Comprehensive validation of payload structure and types
    if (
      typeof payload.id !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.dni !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.lastname !== "string"
    ) {
      console.error("Invalid JWT payload structure or types:", payload)
      return null
    }

    // Ensure role is one of the expected values
    const validRoles: AuthPayload["role"][] = ["Operador", "Admin", "S_A"]
    if (!validRoles.includes(payload.role as AuthPayload["role"])) {
      console.error("Invalid user role in JWT payload:", payload.role)
      return null
    }

    return payload as AuthPayload
  } catch (error) {
    console.error("JWT verification failed:", error)
    return null
  }
}

// Helper functions for role checking
export function isAdmin(user: AuthPayload | null): boolean {
  return user?.role === "Admin" || user?.role === "S_A"
}

export function isSuperAdmin(user: AuthPayload | null): boolean {
  return user?.role === "S_A"
}

export function isOperator(user: AuthPayload | null): boolean {
  return user?.role === "Operador"
}

export function hasAdminAccess(user: AuthPayload | null): boolean {
  return isAdmin(user)
}

export function hasOperatorAccess(user: AuthPayload | null): boolean {
  return isOperator(user) || isAdmin(user)
}
