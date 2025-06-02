import { SignJWT, jwtVerify, type JWTPayload } from "jose"

// Updated AuthPayload interface to match new Prisma enum roles
export interface AuthPayload extends JWTPayload {
  id: number
  email: string
  role: "Operador" | "Admin" | "S_A" // Updated roles
  dni: string
  name: string
  lastname: string
  [key: string]: unknown // Add index signature for JWTPayload compatibility
}

const secretKey = process.env.JWT_SECRET

if (!secretKey) {
  throw new Error("JWT_SECRET is not defined in environment variables")
}

const secret = new TextEncoder().encode(secretKey)

export async function signToken(payload: AuthPayload): Promise<string> {
  const token = await new SignJWT(payload) // payload is now compatible with JWTPayload
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Token expires in 7 days
    .sign(secret)
  return token
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    })

    // Basic runtime validation of payload structure and types
    if (
      typeof payload.id !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.dni !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.lastname !== "string"
    ) {
      console.error("Invalid JWT payload structure or types")
      return null
    }

    // Ensure role is one of the expected values
    const validRoles: AuthPayload["role"][] = ["Operador", "Admin", "S_A"]
    if (!validRoles.includes(payload.role as AuthPayload["role"])) {
      console.error("Invalid user role in JWT payload")
      return null
    }

    return payload as AuthPayload
  } catch (error) {
    console.error("JWT verification failed:", error)
    return null
  }
}
