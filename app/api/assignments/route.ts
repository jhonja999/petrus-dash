import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")
    const date = searchParams.get("date")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log("🔍 Assignments API: Query params -", { driverId, date, page, limit })

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (driverId && driverId !== "null") {
      where.driverId = Number.parseInt(driverId)
    }

    if (date) {
      const targetDate = new Date(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)

      where.createdAt = {
        gte: targetDate,
        lt: nextDay,
      }
    }

    console.log("🔍 Assignments API: Final where clause:", where)

    // Get assignments with proper completion status verification
    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            role: true,
          },
        },
        truck: {
          select: {
            id: true,
            placa: true,
            typefuel: true,
            capacitygal: true,
            state: true,
          },
        },
        clientAssignments: {
          include: {
            customer: {
              select: {
                id: true,
                companyname: true,
                ruc: true,
              },
            },
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    })

    // Verify and fix completion status for each assignment
    const correctedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const clientAssignments = assignment.clientAssignments

        if (clientAssignments.length > 0) {
          // Check if all client assignments are actually completed
          const allCompleted = clientAssignments.every((ca) => ca.status === "completed")

          // If assignment is marked as completed but not all client assignments are completed
          if (assignment.isCompleted && !allCompleted) {
            console.log(`🔧 Fixing assignment ${assignment.id}: marked completed but has pending deliveries`)

            // Fix the assignment status
            const updatedAssignment = await prisma.assignment.update({
              where: { id: assignment.id },
              data: {
                isCompleted: false,
                completedAt: null,
              },
              include: {
                driver: {
                  select: {
                    id: true,
                    name: true,
                    lastname: true,
                    role: true,
                  },
                },
                truck: {
                  select: {
                    id: true,
                    placa: true,
                    typefuel: true,
                    capacitygal: true,
                    state: true,
                  },
                },
                clientAssignments: {
                  include: {
                    customer: {
                      select: {
                        id: true,
                        companyname: true,
                        ruc: true,
                      },
                    },
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
                },
              },
            })

            // Also fix truck status if needed
            if (assignment.truck && assignment.truck.state === "Activo") {
              await prisma.truck.update({
                where: { id: assignment.truckId },
                data: { state: "Asignado" },
              })
              console.log(`🚛 Fixed truck ${assignment.truck.placa} status: Activo → Asignado`)
            }

            return updatedAssignment
          }

          // If assignment is not marked as completed but all client assignments are completed
          if (!assignment.isCompleted && allCompleted && clientAssignments.length > 0) {
            console.log(`🔧 Fixing assignment ${assignment.id}: should be completed`)

            const updatedAssignment = await prisma.assignment.update({
              where: { id: assignment.id },
              data: {
                isCompleted: true,
                completedAt: new Date(),
              },
              include: {
                driver: {
                  select: {
                    id: true,
                    name: true,
                    lastname: true,
                    role: true,
                  },
                },
                truck: {
                  select: {
                    id: true,
                    placa: true,
                    typefuel: true,
                    capacitygal: true,
                    state: true,
                  },
                },
                clientAssignments: {
                  include: {
                    customer: {
                      select: {
                        id: true,
                        companyname: true,
                        ruc: true,
                      },
                    },
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
                },
              },
            })

            // Fix truck status
            if (assignment.truck && assignment.truck.state === "Asignado") {
              await prisma.truck.update({
                where: { id: assignment.truckId },
                data: { state: "Activo" },
              })
              console.log(`🚛 Fixed truck ${assignment.truck.placa} status: Asignado → Activo`)
            }

            return updatedAssignment
          }
        }

        return assignment
      }),
    )

    // Get total count for pagination
    const totalCount = await prisma.assignment.count({ where })

    console.log(`✅ Assignments API: Found ${correctedAssignments.length} assignments (total: ${totalCount})`)

    return NextResponse.json({
      assignments: correctedAssignments,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error("❌ Error fetching assignments:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { truckId, driverId, fuelType, totalLoaded, clients } = body

    console.log("📝 Creating new assignment:", {
      truckId,
      driverId,
      fuelType,
      totalLoaded,
      clientsCount: clients?.length,
    })

    // Validate required fields
    if (!truckId || !driverId || !fuelType || !totalLoaded) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    // Clients are optional for initial assignment creation
    const clientsArray = clients || []

    // Check if truck is available
    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      include: {
        Assignment: {
          where: { isCompleted: false },
        },
      },
    })

    if (!truck) {
      return NextResponse.json({ error: "Camión no encontrado" }, { status: 404 })
    }

    if (truck.state !== "Activo") {
      return NextResponse.json({ error: "El camión no está disponible para asignación" }, { status: 400 })
    }

    if (truck.Assignment.length > 0) {
      return NextResponse.json({ error: "El camión ya tiene una asignación activa" }, { status: 400 })
    }

    // Check if driver exists and is available
    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      include: {
        Assignment: {
          where: { isCompleted: false },
        },
      },
    })

    if (!driver) {
      return NextResponse.json({ error: "Conductor no encontrado" }, { status: 404 })
    }

    if (driver.Assignment.length > 0) {
      return NextResponse.json({ error: "El conductor ya tiene una asignación activa" }, { status: 400 })
    }

    // Validate total allocated quantity (only if clients are provided)
    if (clientsArray.length > 0) {
      const totalAllocated = clientsArray.reduce((sum: number, client: any) => sum + Number(client.quantity), 0)
      if (totalAllocated > totalLoaded) {
        return NextResponse.json({ error: "La cantidad total asignada excede la carga del camión" }, { status: 400 })
      }
    }

    // Create assignment with client assignments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the main assignment
      const assignment = await tx.assignment.create({
        data: {
          truckId,
          driverId,
          fuelType,
          totalLoaded: Number(totalLoaded),
          totalRemaining: Number(totalLoaded),
          isCompleted: false,
        },
      })

      // Create client assignments (only if clients are provided)
      const clientAssignments =
        clientsArray.length > 0
          ? await Promise.all(
              clientsArray.map((client: any) =>
                tx.clientAssignment.create({
                  data: {
                    assignmentId: assignment.id,
                    customerId: client.customerId,
                    allocatedQuantity: Number(client.quantity),
                    deliveredQuantity: 0,
                    status: "pending",
                  },
                }),
              ),
            )
          : []

      // Update truck status to "Asignado"
      await tx.truck.update({
        where: { id: truckId },
        data: { state: "Asignado" },
      })

      return { assignment, clientAssignments }
    })

    console.log(`✅ Assignment created successfully: ID ${result.assignment.id}`)

    // Return the created assignment with related data
    const createdAssignment = await prisma.assignment.findUnique({
      where: { id: result.assignment.id },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            role: true,
          },
        },
        truck: {
          select: {
            id: true,
            placa: true,
            typefuel: true,
            capacitygal: true,
            state: true,
          },
        },
        clientAssignments: {
          include: {
            customer: {
              select: {
                id: true,
                companyname: true,
                ruc: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(createdAssignment, { status: 201 })
  } catch (error) {
    console.error("❌ Error creating assignment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
