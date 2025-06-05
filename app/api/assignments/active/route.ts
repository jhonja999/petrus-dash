
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")

    if (!driverId) {
      return NextResponse.json({ error: "driverId es requerido" }, { status: 400 })
    }

    console.log(`🔍 Active Assignments: Fetching for driver ${driverId}`)

    // Get all active (not completed) assignments for the driver
    const activeAssignments = await prisma.assignment.findMany({
      where: {
        driverId: Number.parseInt(driverId),
        isCompleted: false,
        // Only include if it has remaining fuel
        totalRemaining: {
          gt: 0
        }
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            dni: true,
            email: true,
          },
        },
        truck: {
          select: {
            id: true,
            placa: true,
            capacitygal: true, // ✅ Corregido: era "capacidad"
            lastRemaining: true, // ✅ Agregado campo útil
            state: true,
            typefuel: true, // ✅ Agregado tipo de combustible
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
        discharges: { // ✅ Agregado para tracking completo
          include: {
            customer: {
              select: {
                id: true,
                companyname: true,
              },
            },
          },
          where: {
            status: {
              in: ["pendiente", "en_proceso"] // Solo descargas activas
            }
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

    // Log details for debugging - ✅ Corregido el acceso a propiedades
    activeAssignments.forEach(assignment => {
      console.log(`📋 Assignment #${assignment.id}:`, {
        truck: assignment.truck.placa, // ✅ Corregido: ahora sí existe truck
        remaining: assignment.totalRemaining,
        completed: assignment.isCompleted,
        createdAt: assignment.createdAt,
        clientAssignments: assignment.clientAssignments.length, // ✅ Corregido: ahora sí existe
        activeDischarges: assignment.discharges.length
      })
    })

    return NextResponse.json(activeAssignments)
  } catch (error) {
    console.error("❌ Active Assignments Error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}