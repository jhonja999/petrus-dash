import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = await cookies()

    // Clear the authentication cookie
    cookieStore.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0, // Expire immediately
      path: "/",
      sameSite: "strict",
    })

    return NextResponse.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    })
  } catch (error: any) {
    console.error("Error during logout:", error)
    return NextResponse.json(
      {
        error: "Error al cerrar sesión",
        success: false,
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}
