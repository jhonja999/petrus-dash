import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken, isAdmin } from "@/lib/jwt"
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

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")
    const dateFilter = searchParams.get("date")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log(
      `🔍 API Asignaciones: Parámetros de consulta - driverId: ${driverId}, fecha: ${dateFilter}, página: ${page}, límite: ${limit}`,
    )

    // Construir cláusula where
    const where: any = {}

    // Filtrar por ID del conductor si se proporciona
    if (driverId) {
      const driverIdNum = Number.parseInt(driverId)
      if (isNaN(driverIdNum)) {
        return NextResponse.json({ error: "Formato de ID de conductor inválido" }, { status: 400 })
      }
      where.driverId = driverIdNum
      console.log(`🎯 API Asignaciones: Filtrando por driverId: ${driverIdNum}`)
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
      console.log(`📅 API Asignaciones: Filtrando por rango de fechas: ${startDate.toISOString()} a ${endDate.toISOString()}`)
    }

    // Verificar permisos para solicitudes específicas de conductor
    if (driverId && !isAdmin(user)) {
      if (user.id !== Number.parseInt(driverId)) {
        return NextResponse.json({ error: "Acceso denegado. Solo puedes ver tus propias asignaciones." }, { status: 403 })
      }
    }

    console.log(`🔍 API Asignaciones: Cláusula where final:`, where)

    // ✅ SIEMPRE devolver formato consistente independientemente de la consulta
    const skip = (page - 1) * limit

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          truck: {
            select: {
              id: true,
              placa: true,
            },
          },
          driver: {
            select: {
              id: true,
              name: true,
              lastname: true,
              dni: true,
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
        orderBy: { createdAt: "desc" },
        // ✅ Aplicar paginación solo si no se filtra por conductor específico
        ...(driverId ? {} : { skip, take: limit }),
      }),
      prisma.assignment.count({ where }),
    ])

    console.log(`✅ API Asignaciones: Se encontraron ${assignments.length} asignaciones (total: ${total})`)

    // ✅ SIEMPRE devolver el mismo formato
    return NextResponse.json({
      assignments,
      pagination: {
        page: driverId ? 1 : page,
        limit: driverId ? assignments.length : limit,
        total,
        totalPages: driverId ? 1 : Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("❌ API Asignaciones: Error al obtener asignaciones:", error)
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
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Acceso denegado. Se requieren privilegios de administrador." }, { status: 403 })
    }

    const body = await request.json()
    const { driverId, truckId, totalLoaded, fuelType, notes } = body

    // Validación
    if (!driverId || !truckId || !totalLoaded || !fuelType) {
      return NextResponse.json(
        {
          error: "Faltan campos requeridos (driverId, truckId, totalLoaded, fuelType)",
        },
        { status: 400 },
      )
    }

    if (isNaN(totalLoaded) || totalLoaded <= 0) {
      return NextResponse.json({ error: "La carga total debe ser un número positivo" }, { status: 400 })
    }

    // Verificar que el conductor existe y está activo
    const driver = await prisma.user.findUnique({
      where: { id: Number.parseInt(driverId) },
    })

    if (!driver || driver.role !== "Operador" || driver.state !== "Activo") {
      return NextResponse.json({ error: "Conductor no encontrado o no activo" }, { status: 404 })
    }

    // Verificar que el camión existe y está disponible
    const truck = await prisma.truck.findUnique({
      where: { id: Number.parseInt(truckId) },
    })

    if (!truck || truck.state !== "Activo") {
      return NextResponse.json({ error: "Camión no encontrado o no disponible" }, { status: 404 })
    }

    // Crear asignación
    const newAssignment = await prisma.assignment.create({
      data: {
        driverId: Number.parseInt(driverId),
        truckId: Number.parseInt(truckId),
        totalLoaded: Number.parseFloat(totalLoaded),
        totalRemaining: Number.parseFloat(totalLoaded),
        fuelType,
        notes: notes || null,
      },
      include: {
        truck: {
          select: {
            id: true,
            placa: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            dni: true,
          },
        },
        discharges: true,
      },
    })

    // Actualizar estado del camión a "Asignado"
    await prisma.truck.update({
      where: { id: Number.parseInt(truckId) },
      data: { state: "Asignado" },
    })

    console.log(`✅ API Asignaciones: Asignación ${newAssignment.id} creada para el conductor ${driverId}`)

    return NextResponse.json(newAssignment, { status: 201 })
  } catch (error) {
    console.error("❌ API Asignaciones: Error al crear asignación:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}