import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken, isAdmin } from "@/lib/jwt"
import { cookies } from "next/headers"
import { DischargeStatus } from "@prisma/client"

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

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")
    const dateFilter = searchParams.get("date")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log(
      `🔍 API Despachos: Parámetros de consulta - driverId: ${driverId}, fecha: ${dateFilter}, página: ${page}, límite: ${limit}`,
    )

    // Construir cláusula where
    const where: any = {}

    // Filtrar por ID del conductor si se proporciona
    if (driverId) {
      const driverIdNum = Number.parseInt(driverId)
      if (isNaN(driverIdNum)) {
        return NextResponse.json({ error: "Formato de ID de conductor inválido" }, { status: 400 })
      }
      where.assignment = {
        driverId: driverIdNum
      }
      console.log(`🎯 API Despachos: Filtrando por driverId: ${driverIdNum}`)
    }

    // Filtrar por fecha si se proporciona
    if (dateFilter) {
      const startDate = new Date(dateFilter)
      const endDate = new Date(dateFilter)
      endDate.setDate(endDate.getDate() + 1)

      where.createdAt = {
        gte: startDate,
        lt: endDate,
      }
      console.log(`📅 API Despachos: Filtrando por rango de fechas: ${startDate.toISOString()} a ${endDate.toISOString()}`)
    }

    // Verificar permisos para solicitudes específicas de conductor
    if (driverId && !isAdmin(user)) {
      if (user.id !== Number.parseInt(driverId)) {
        return NextResponse.json({ error: "Acceso denegado. Solo puedes ver tus propios despachos." }, { status: 403 })
      }
    }

    console.log(`🔍 API Despachos: Cláusula where final:`, where)

    // Si se filtra por conductor específico, devolver array simple
    if (driverId) {
      const discharges = await prisma.discharge.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              companyname: true,
              ruc: true,
            },
          },
          assignment: {
            include: {
              driver: {
                select: {
                  id: true,
                  name: true,
                  lastname: true,
                  dni: true,
                },
              },
              truck: {
                select: {
                  id: true,
                  placa: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })

      console.log(`✅ API Despachos: Se encontraron ${discharges.length} despachos para el conductor ${driverId}`)
      return NextResponse.json(discharges)
    }

    // Para solicitudes de admin sin conductor específico, devolver resultados paginados
    const skip = (page - 1) * limit

    const [discharges, total] = await Promise.all([
      prisma.discharge.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              companyname: true,
              ruc: true,
            },
          },
          assignment: {
            include: {
              driver: {
                select: {
                  id: true,
                  name: true,
                  lastname: true,
                  dni: true,
                },
              },
              truck: {
                select: {
                  id: true,
                  placa: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.discharge.count({ where }),
    ])

    console.log(`✅ API Despachos: Se encontraron ${discharges.length} despachos (total: ${total})`)

    return NextResponse.json({
      discharges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("❌ API Despachos: Error al obtener despachos:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
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

    const body = await request.json()
    const { assignmentId, customerId, totalDischarged, status, marcadorInicial, marcadorFinal } = body

    // Validación
    if (!assignmentId || !customerId || !totalDischarged) {
      return NextResponse.json(
        {
          error: "Faltan campos requeridos (assignmentId, customerId, totalDischarged)",
        },
        { status: 400 },
      )
    }

    if (isNaN(totalDischarged) || totalDischarged <= 0) {
      return NextResponse.json({ error: "La cantidad descargada debe ser un número positivo" }, { status: 400 })
    }

    // Validar status si se proporciona
    const validStatuses: DischargeStatus[] = ["pendiente", "en_proceso", "finalizado", "cancelado"]
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }

    // Verificar que la asignación existe
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number.parseInt(assignmentId) },
      include: { driver: true }
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    // Verificar permisos: solo el conductor asignado o admin pueden crear despachos
    if (!isAdmin(user) && assignment.driverId !== user.id) {
      return NextResponse.json({ error: "Acceso denegado. Solo puedes crear despachos para tus propias asignaciones." }, { status: 403 })
    }

    // Verificar que el cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: Number.parseInt(customerId) },
    })

    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Verificar que hay suficiente combustible remanente
    if (Number(totalDischarged) > Number(assignment.totalRemaining)) {
      return NextResponse.json({ 
        error: `Cantidad excede el remanente disponible. Remanente: ${assignment.totalRemaining}` 
      }, { status: 400 })
    }

    // Preparar datos del despacho
    const dischargeData: any = {
      assignmentId: Number.parseInt(assignmentId),
      customerId: Number.parseInt(customerId),
      totalDischarged: Number(totalDischarged),
      status: (status as DischargeStatus) || "pendiente",
    }

    // Añadir campos opcionales si se proporcionan
    if (marcadorInicial !== undefined) {
      dischargeData.marcadorInicial = Number(marcadorInicial)
    }

    if (marcadorFinal !== undefined) {
      dischargeData.marcadorFinal = Number(marcadorFinal)
    }

    // Si el status es en_proceso, establecer startTime
    if (dischargeData.status === "en_proceso") {
      dischargeData.startTime = new Date()
    }

    // Si el status es finalizado, establecer endTime
    if (dischargeData.status === "finalizado") {
      dischargeData.endTime = new Date()
    }

    // Crear despacho
    const newDischarge = await prisma.discharge.create({
      data: dischargeData,
      include: {
        customer: {
          select: {
            id: true,
            companyname: true,
            ruc: true,
          },
        },
        assignment: {
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                lastname: true,
                dni: true,
              },
            },
            truck: {
              select: {
                id: true,
                placa: true,
              },
            },
          },
        },
      },
    })

    // Actualizar el remanente de la asignación
    const newTotalRemaining = Number(assignment.totalRemaining) - Number(totalDischarged)
    await prisma.assignment.update({
      where: { id: Number.parseInt(assignmentId) },
      data: { 
        totalRemaining: newTotalRemaining
      },
    })

    console.log(`✅ API Despachos: Despacho ${newDischarge.id} creado para la asignación ${assignmentId}`)

    return NextResponse.json(newDischarge, { status: 201 })
  } catch (error) {
    console.error("❌ API Despachos: Error al crear despacho:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
