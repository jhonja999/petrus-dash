import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")
    const date = searchParams.get("date")

    if (!driverId) {
      return NextResponse.json({ error: "driverId es requerido" }, { status: 400 })
    }

    // Parse the date or use today - Important: use local timezone
    let targetDate: Date
    if (date) {
      // When date comes as YYYY-MM-DD, parse it correctly
      const [year, month, day] = date.split('-').map(Number)
      targetDate = new Date(year, month - 1, day)
    } else {
      targetDate = new Date()
    }

    // Get start and end of day in local timezone
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)

    console.log(`📊 Dashboard API: Fetching assignments for driver ${driverId}`)
    console.log(`📅 Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`)

    // Get assignments for the specific date OR assignments that are active
    const assignments = await prisma.assignment.findMany({
      where: {
        driverId: Number.parseInt(driverId),
        OR: [
          // Assignments created today
          {
            createdAt: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
          // OR active assignments not yet completed
          {
            isCompleted: false,
            // Only include if it has remaining fuel
            totalRemaining: {
              gt: 0
            }
          }
        ]
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
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log(`✅ Dashboard API: Found ${assignments.length} assignments for ${startOfDay.toISOString().split('T')[0]}`)

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("❌ Dashboard API Error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
