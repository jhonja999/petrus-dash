import { verifyToken } from "@/lib/jwt"
import type { NextRequest } from "next/server"

/**
 * Get the authenticated user from the request
 */
export async function getAuthUser(req?: NextRequest) {
  try {
    if (!req) return null

    const token = req.cookies.get("token")?.value
    if (!token) return null

    const payload = await verifyToken(token)
    return payload || null
  } catch (error) {
    console.error("Error getting auth user:", error)
    return null
  }
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: any, role: string): boolean {
  return user?.role === role
}

/**
 * Check if a user is an admin
 */
export function isAdmin(user: any): boolean {
  return hasRole(user, "admin")
}

/**
 * Check if a user is a conductor
 */
export function isConductor(user: any): boolean {
  return hasRole(user, "conductor")
}

/**
 * Check if a user can access a specific driver route
 */
export function canAccessDriverRoute(user: any, driverId: string): boolean {
  return isAdmin(user) || (isConductor(user) && user.id === driverId)
}

/**
 * Get user from token
 */
export async function getUserFromToken(token: string) {
  try {
    if (!token) return null
    const payload = await verifyToken(token)
    return payload
  } catch (error) {
    console.error("Error getting user from token:", error)
    return null
  }
}
