import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")
    const date = searchParams.get("date")

    console.log("🔍 Active Assignments: Fetching for driver", driverId)

    if (!driverId || isNaN(Number(driverId))) {
      return NextResponse.json({ error: "ID de conductor requerido y válido" }, { status: 400 })
    }

    // Base where clause
    const where: any = {
      driverId: Number(driverId),
      // ✅ Usar status en lugar de isCompleted (que no existe en el schema)
      status: {
        not: "COMPLETADO" // Obtener todas las asignaciones que no estén completadas
      },
      totalRemaining: {
        gt: 0 // Solo asignaciones con combustible restante
      }
    }

    // Si se especifica una fecha, filtrar por fecha de creación
    if (date) {
      const targetDate = new Date(date)
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))
      
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay
      }
    } else {
      // Si no se especifica fecha, obtener las de los últimos 7 días para asegurar que se muestren las activas
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      where.createdAt = {
        gte: sevenDaysAgo
      }
    }

    console.log("🔍 Where clause:", JSON.stringify(where, null, 2))

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
            currentLoad: true // Agregar currentLoad
          }
        },
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            role: true
          }
        },
        clientAssignments: {
          include: {
            customer: {
              select: {
                id: true,
                companyname: true,
                ruc: true,
                address: true
              }
            }
          },
          orderBy: {
            id: "asc"
          }
        },
        discharges: {
          include: {
            customer: {
              select: {
                id: true,
                companyname: true,
                ruc: true
              }
            }
          },
          where: {
            status: {
              in: ["pendiente", "en_proceso"]
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    console.log(`✅ Found ${activeAssignments.length} active assignments for driver ${driverId}`)

    // ✅ Agregar campo isCompleted calculado para compatibilidad con el frontend
    const assignmentsWithCompatibility = activeAssignments.map(assignment => ({
      ...assignment,
      isCompleted: assignment.status === "COMPLETADO" || Number(assignment.totalRemaining) <= 0
    }))

    return NextResponse.json(assignmentsWithCompatibility)
  } catch (error) {
    console.error("❌ Active Assignments Error:", error)
    
    let errorMessage = "Error interno del servidor"
    let statusCode = 500
    
    if (error instanceof Error) {
      // Error específico de Prisma o validación
      if (error.message.includes("Invalid") || error.message.includes("validation")) {
        errorMessage = "Error de validación en la consulta de base de datos"
        statusCode = 400
      } else if (error.message.includes("connect") || error.message.includes("timeout")) {
        errorMessage = "Error de conexión a la base de datos"
        statusCode = 503
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: statusCode })
  }
}