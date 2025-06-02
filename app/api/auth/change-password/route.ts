import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers" // Correct import for cookies

export async function PUT(request: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value // Correct usage of cookies()
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword, confirmPassword } = body

    // Manual validation
    if (!currentPassword || typeof currentPassword !== "string" || currentPassword.trim() === "") {
      return NextResponse.json({ error: "La contraseña actual es requerida" }, { status: 400 })
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres" }, { status: 400 })
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.id }, // payload.id is already number
      select: { id: true, password: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 })
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    })

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada exitosamente",
    })
  } catch (error: any) {
    console.error("Error changing password:", error.message || error)
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 })
  }
}
