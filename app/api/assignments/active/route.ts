import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")

    console.log(`🔍 Active Assignments: Fetching for driver ${driverId}`)

    // Construir la consulta
    const where: any = {
      isCompleted: false,
    }

    // Filtrar por conductor si se proporciona un ID
    if (driverId) {
      where.driverId = Number.parseInt(driverId)
      // Solo incluir asignaciones con combustible restante
      where.totalRemaining = {
        gt: 0,
      }
    }

    // Obtener asignaciones activas
    const activeAssignments = await prisma.assignment.findMany({
      where,
      include: {
        truck: {
          select: {
            id: true,
            placa: true,
            capacitygal: true,
            lastRemaining: true,
            state: true,
            typefuel: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            role: true,
          },
        },
        clientAssignments: {
          include: {
            customer: {
              select: {
                id: true,
                companyname: true,
                ruc: true,
                address: true,
              },
            },
          },
          orderBy: {
            id: "asc",
          },
        },
        discharges: {
          include: {
            customer: {
              select: {
                id: true,
                companyname: true,
                ruc: true,
              },
            },
          },
          where: {
            status: {
              in: ["pendiente", "en_proceso"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log(`✅ Active Assignments: Found ${activeAssignments.length} active assignments`)

    // Log details for debugging
    activeAssignments.forEach((assignment) => {
      console.log(`📋 Assignment #${assignment.id}:`, {
        truck: assignment.truck.placa,
        remaining: assignment.totalRemaining,
        completed: assignment.isCompleted,
        clientAssignments: assignment.clientAssignments.length,
        activeDischarges: assignment.discharges.length,
      })
    })

    return NextResponse.json(activeAssignments)
  } catch (error) {
    console.error("❌ Active Assignments Error:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
