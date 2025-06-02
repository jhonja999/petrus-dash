import { verifyToken, type AuthPayload } from "@/lib/jwt"
import { cookies } from "next/headers" // Import cookies

// Function to get the authenticated user from the token
export async function getAuthUser(): Promise<AuthPayload | null> {
  try {
    const token = (await cookies()).get("token")?.value // Use cookies()
    if (!token) {
      return null
    }
    const payload = await verifyToken(token)
    return payload
  } catch (error) {
    console.error("Error getting authenticated user:", error)
    return null
  }
}

// Function to check if the user is an Admin or S_A
export function isAdmin(user: AuthPayload | null): boolean {
  return user?.role === "Admin" || user?.role === "S_A"
}

// Function to check if the user is a Conductor (Operador)
export function isConductor(user: AuthPayload | null): boolean {
  return user?.role === "Operador"
}

// Function to log out the user (client-side call to API)
export async function logoutUser(): Promise<void> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to logout")
    }
  } catch (error) {
    console.error("Error during logout:", error)
    throw error
  }
}
