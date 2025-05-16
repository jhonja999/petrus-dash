import { Roles } from "@/types/globals"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export async function getUserRole() {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const user = await currentUser()

  if (!user) {
    return null
  }

  // Get role from publicMetadata
  const role = (user.publicMetadata.role as string) || "USER"

  return role
}

export async function requireAdmin() {
  const role = await getUserRole()

  if (role !== "admin") {
    redirect("/unauthorized")
  }
}

export async function requireAuthenticated() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }
}

export const checkRole = async (role: Roles) => {
  const { sessionClaims } = await auth()
  return sessionClaims?.metadata.role === role
}

// Helper functions for role checking
export function isAdmin(role?: string | null) {
  return role === "admin"
}

export function isConductor(role?: string | null) {
  return role === "conductor"
}

export function hasValidRole(role?: string | null) {
  return isAdmin(role) || isConductor(role)
}
