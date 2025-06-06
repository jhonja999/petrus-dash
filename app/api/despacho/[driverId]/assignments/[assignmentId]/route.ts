import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken, isAdmin, isOperator } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: Request, { params }: { params: { driverId: string; assignmentId: string } }) {
  const { driverId, assignmentId } = params

  if (!driverId || !assignmentId) {
    return NextResponse.json({ error: "driverId y assignmentId son requeridos" }, { status: 400 })
  }

  try {
    // Verify authentication - await the cookies() function
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Log request details
    console.log(`🔍 API: /despacho/${driverId}/assignments/${assignmentId} - User: ${user.id}, Role: ${user.role}`)

    // Check permissions: operators can only access their own data
    if (isOperator(user) && !isAdmin(user) && user.id !== Number.parseInt(driverId)) {
      return NextResponse.json(
        {
          error: "Acceso denegado. Solo puedes acceder a tus propias asignaciones.",
        },
        { status: 403 },
      )
    }

    // Get the assignment with all related data
    const assignment = await prisma.assignment.findUnique({
      where: {
        id: Number.parseInt(assignmentId),
        driverId: Number.parseInt(driverId), // Ensure it belongs to the driver
      },
      include: {
        truck: true,
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            dni: true,
            email: true,
          },
        },
        discharges: {
          include: {
            customer: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error("Error al obtener la asignación:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
