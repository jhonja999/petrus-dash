// lib/auth.ts
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

interface AuthResult {
  success: boolean
  user?: {
    id: number
    dni: string
    name: string
    lastname: string
    email: string
    role: string
  }
  error?: string
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Get the token from the Authorization header
    const authHeader = request.headers.get("authorization")
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        error: "Token de autorización requerido"
      }
    }
    const token = authHeader.substring(7) // Remove "Bearer " prefix
    if (!token) {
      return {
        success: false,
        error: "Token no válido"
      }
    }
    // Verify the JWT token
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET not configured")
    }
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (jwtError) {
      return {
        success: false,
        error: "Token expirado o inválido"
      }
    }
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        dni: true,
        name: true,
        lastname: true,
        email: true,
        role: true,
        state: true
      }
    })
    if (!user) {
      return {
        success: false,
        error: "Usuario no encontrado"
      }
    }
    if (user.state !== "Activo") {
      return {
        success: false,
        error: "Usuario inactivo"
      }
    }
    return {
      success: true,
      user: {
        id: user.id,
        dni: user.dni,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        role: user.role
      }
    }
  } catch (error) {
    console.error("Error verifying auth:", error)
    return {
      success: false,
      error: "Error interno de autenticación"
    }
  }
}
export async function generateToken(userId: number): Promise<string> {
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET not configured")
  }
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: "7d" }
  )
}
// Hashear contraseña
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// Comparar contraseña
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Verificar si un usuario es administrador
export function isAdmin(user: any): boolean {
  return user?.role === "Admin" || user?.role === "S_A"
}

// Verificar si un usuario es super administrador
export function isSuperAdmin(user: any): boolean {
  return user?.role === "S_A"
}

// Verificar si un usuario es operador
export function isOperator(user: any): boolean {
  return user?.role === "Operador"
}