import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: "Sesión cerrada correctamente" }, { status: 200 })

    response.cookies.set("token", "", {
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
