import { NextResponse } from "next/server"
import { cookies } from "next/headers"

// ✅ Función común para limpiar cookies y hacer logout
async function performLogout() {
  try {
    const response = NextResponse.redirect(new URL("/", "http://localhost:3000"))

    ;(await cookies()).set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      path: "/",
      sameSite: "strict",
    })

    return response
  } catch (error: any) {
    console.error("Logout error:", error.message || error)
    // En caso de error, redirigir igual
    return NextResponse.redirect(new URL("/", "http://localhost:3000"))
  }
}

// ✅ Manejar GET (para enlaces directos como <a href="/api/auth/logout">)
export async function GET() {
  return performLogout()
}

// ✅ Manejar POST (para llamadas AJAX)
export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: "Sesión cerrada correctamente" }, { status: 200 })

    ;(await cookies()).set("token", "", {
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