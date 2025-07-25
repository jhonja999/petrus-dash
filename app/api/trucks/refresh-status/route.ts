import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"
import type { Assignment, ClientAssignment, Truck, FuelType, TruckState } from "@prisma/client"

// Option 1: Use Prisma-generated types directly
type TruckWithAssignments = Truck & {
  Assignment: (Assignment & {
    clientAssignments: ClientAssignment[]
  })[]
}

// Option 2: Or define your own type that matches the schema
// type TruckWithAssignments = {
//   id: number
//   state: TruckState
//   placa: string
//   typefuel: FuelType
//   capacitygal: any
//   lastRemaining: any
//   Assignment: (Assignment & {
//     clientAssignments: ClientAssignment[]
//   })[]
// }

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Starting truck status refresh...")

    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // Get all trucks with their current assignments
    const trucks = await prisma.truck.findMany({
      include: {
        Assignment: {
          where: {
            isCompleted: false, // Only active assignments
          },
          include: {
            clientAssignments: true,
          },
        },
      },
    })

    let updatedCount = 0

    // Remove the type assertion since trucks is already properly typed
    for (const truck of trucks) {
      let newStatus: TruckState = "Activo" // Use the proper enum type
      let shouldUpdate = false

      // Check if truck has active assignments
      const activeAssignments = truck.Assignment.filter((assignment: Assignment) => !assignment.isCompleted)

      if (activeAssignments.length > 0) {
        // Truck should be "Asignado" if it has active assignments
        if (truck.state !== "Asignado") {
          newStatus = "Asignado"
          shouldUpdate = true
          console.log(`🚛 Truck ${truck.placa}: ${truck.state} → Asignado (has active assignments)`)
        }
      } else {
        // Check if truck was previously assigned but assignments are now completed
        const allAssignments = await prisma.assignment.findMany({
          where: {
            truckId: truck.id,
          },
          include: {
            clientAssignments: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        })

        if (allAssignments.length > 0) {
          const lastAssignment = allAssignments[0]

          // Check if the last assignment is truly completed
          const allClientAssignments = lastAssignment.clientAssignments
          const allCompleted =
            allClientAssignments.length > 0 && allClientAssignments.every((ca) => ca.status === "completed")

          if (lastAssignment.isCompleted && allCompleted) {
            // Assignment is properly completed, truck should be active
            if (truck.state !== "Activo") {
              newStatus = "Activo"
              shouldUpdate = true
              console.log(`🚛 Truck ${truck.placa}: ${truck.state} → Activo (assignments completed)`)
            }
          } else if (!lastAssignment.isCompleted || !allCompleted) {
            // Assignment exists but not properly completed, should be assigned
            if (truck.state !== "Asignado") {
              newStatus = "Asignado"
              shouldUpdate = true
              console.log(`🚛 Truck ${truck.placa}: ${truck.state} → Asignado (incomplete assignment found)`)

              // Also fix the assignment completion status if needed
              if (lastAssignment.isCompleted && !allCompleted) {
                await prisma.assignment.update({
                  where: { id: lastAssignment.id },
                  data: {
                    isCompleted: false,
                    completedAt: null,
                  },
                })
                console.log(`📋 Fixed assignment ${lastAssignment.id} completion status`)
              }
            }
          }
        }
      }

      // Update truck status if needed
      if (shouldUpdate) {
        await prisma.truck.update({
          where: { id: truck.id },
          data: { state: newStatus },
        })
        updatedCount++
      }
    }

    console.log(`🏁 Truck status refresh completed. ${updatedCount} trucks updated.`)

    return NextResponse.json({
      message: `Estados de camiones actualizados. ${updatedCount} cambios realizados.`,
      updatedCount,
    })
  } catch (error) {
    console.error("❌ Error refreshing truck status:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}