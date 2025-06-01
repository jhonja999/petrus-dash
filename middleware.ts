import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET environment variable is not set")
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  const { pathname } = request.nextUrl
  const token = request.cookies.get("token")?.value
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  const url = request.nextUrl.clone()

  // Rutas que son siempre públicas (sin importar el estado de autenticación)
  // La ruta "/" es pública para permitir la landing page.
  const publicRoutes = ["/", "/auth/register", "/auth/login", "/unauthorized"]

  let payload = null
  if (token) {
    try {
      const { payload: verifiedPayload } = await jwtVerify(token, secret)
      payload = verifiedPayload
    } catch (error) {
      // Token inválido o expirado, lo eliminamos y permitimos que la solicitud continúe
      const response = NextResponse.next()
      response.cookies.delete("token")
      return response
    }
  }

  // Lógica de redirección para usuarios autenticados
  if (payload) {
    // Si un usuario autenticado intenta acceder a login/register, redirigirlo a su dashboard
    if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register")) {
      const redirectPath = payload.role === "Admin" ? "/admin/dashboard" : `/despacho/${payload.id}`
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    // Definir rutas permitidas por rol
    const adminRoutes = ["/admin"]
    const conductorRoutes = ["/despacho"] // La ruta base /despacho es para conductores

    // Proteger rutas de Admin
    if (adminRoutes.some((route) => pathname.startsWith(route)) && payload.role !== "Admin") {
      const redirectPath = payload.role === "Operador" ? `/despacho/${payload.id}` : "/auth/unauthorized"
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    // Proteger rutas de Conductor
    // Un conductor solo puede acceder a /despacho/[suId]
    if (conductorRoutes.some((route) => pathname.startsWith(route))) {
      if (payload.role === "Operador") {
        // Si es operador, solo puede acceder a su propia ruta de despacho
        if (pathname !== `/despacho/${payload.id}` && !pathname.startsWith(`/despacho/${payload.id}/`)) {
          return NextResponse.redirect(new URL(`/despacho/${payload.id}`, request.url))
        }
      } else if (payload.role !== "Admin") {
        // Si no es operador ni admin, y está en una ruta de despacho, es no autorizado
        return NextResponse.redirect(new URL("/auth/unauthorized", request.url))
      }
    }

    // Para cualquier otra ruta (incluyendo '/'), si está autenticado y no es una ruta protegida con rol incorrecto, permitir
    return NextResponse.next()
  } else {
    // El usuario NO está autenticado (no hay token válido)
    // Si intenta acceder a una ruta que NO es pública y NO es una API de autenticación, redirigir a login
    if (!publicRoutes.includes(pathname) && !pathname.startsWith("/api/auth")) {
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }
    // Si es una ruta pública o una API de autenticación, permitir acceso
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
