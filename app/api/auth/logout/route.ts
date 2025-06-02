import { NextResponse } from "next/server"
import { cookies } from "next/headers" // Correct import for cookies

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: "Sesión cerrada correctamente" }, { status: 200 })

    ;(await cookies()).set("token", "", {
      // Correct usage of cookies()
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      path: "/",
      sameSite: "strict",
    })

    return response
  } catch (error: any) {
    console.error("Logout error:", error.message || error)
    return NextResponse.json({ error: "Error al cerrar sesión", details: error.message }, { status: 500 })
  }
}
