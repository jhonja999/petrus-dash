import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")
    const eventType = searchParams.get("eventType")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")

    const where: any = {}

    if (entityType) {
      where.entityType = entityType
    }
    if (entityId) {
      where.entityId = Number.parseInt(entityId)
    }
    if (eventType) {
      // Assuming eventType from query param matches enum string directly
      where.eventType = eventType
    }
    if (startDate || endDate) {
      where.createdAt = {} // Corrected from timestamp to createdAt
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lt = new Date(new Date(endDate).setHours(23, 59, 59, 999))
      }
    }

    const skip = (page - 1) * pageSize

    const [records, totalRecords] = await prisma.$transaction([
      prisma.historyRecord.findMany({
        where,
        orderBy: {
          createdAt: "desc", // Corrected from timestamp to createdAt
        },
        include: {
          user: {
            select: {
              name: true,
              lastname: true,
              email: true,
            },
          },
        },
        skip,
        take: pageSize,
      }),
      prisma.historyRecord.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        totalRecords,
        currentPage: page,
        pageSize,
        totalPages: Math.ceil(totalRecords / pageSize),
      },
    })
  } catch (error) {
    console.error("Error fetching history records:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { eventType, entityType, entityId, description, action } = body // Re-added action

    if (!eventType || !entityType || !entityId || !description || !action) {
      return NextResponse.json(
        { error: "eventType, entityType, entityId, description y action son requeridos" },
        { status: 400 },
      )
    }

    const newRecord = await prisma.historyRecord.create({
      data: {
        eventType: eventType,
        entityType,
        entityId,
        description,
        action, // Re-added action
        userId: payload.id,
      },
    })

    return NextResponse.json({ success: true, data: newRecord }, { status: 201 })
  } catch (error) {
    console.error("Error creating history record:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    const body = await request.json()
    const { eventType, entityType, entityId, description, action } = body // Re-added action

    if (!eventType || !entityType || !entityId || !description || !action) {
      return NextResponse.json(
        { error: "eventType, entityType, entityId, description y action son requeridos" },
        { status: 400 },
      )
    }

    const updatedRecord = await prisma.historyRecord.update({
      where: { id: Number.parseInt(id) },
      data: {
        eventType,
        entityType,
        entityId,
        description,
        action, // Re-added action
      },
    })

    return NextResponse.json({ success: true, data: updatedRecord })
  } catch (error) {
    console.error("Error updating history record:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== "S_A") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    await prisma.historyRecord.delete({
      where: { id: Number.parseInt(id) },
    })

    return NextResponse.json({ success: true, message: "Registro de historial eliminado" })
  } catch (error) {
    console.error("Error deleting history record:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
