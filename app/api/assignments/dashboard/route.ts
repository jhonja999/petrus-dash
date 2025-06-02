import { type NextRequest, NextResponse } from "next/server"
import {prisma} from "@/lib/prisma"
import { getUserFromToken, isOperator } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams
    const driverId = searchParams.get("driverId")
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    // Validar permisos
    // Si es operador, solo puede ver sus propias asignaciones
    if (isOperator(user) && (!driverId || Number(driverId) !== user.id)) {
      return NextResponse.json({ error: "No autorizado para ver estas asignaciones" }, { status: 403 })
    }

    // Construir la consulta base
    const whereClause: any = {}

    // Filtrar por fecha (createdAt debe ser del mismo día)
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    whereClause.createdAt = {
      gte: startDate,
      lte: endDate,
    }

    // Filtrar por conductor si se especifica
    if (driverId) {
      whereClause.driverId = Number(driverId)
    }

    // Obtener asignaciones
    const assignments = await prisma.assignment.findMany({
      where: whereClause,
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Error obteniendo asignaciones del dashboard:", error)
    return NextResponse.json({ error: "Error al obtener asignaciones" }, { status: 500 })
  }
}
