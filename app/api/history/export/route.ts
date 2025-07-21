import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"
import { HistoryEventType } from "@prisma/client" // Import HistoryEventType enum

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
    const format = searchParams.get("format") || "json"

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

    const historyRecords = await prisma.historyRecord.findMany({
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
    })

    const formattedRecords = historyRecords.map((record) => ({
      id: record.id,
      createdAt: record.createdAt.toISOString(), // Corrected from timestamp to createdAt
      eventType: record.eventType,
      entityType: record.entityType,
      entityId: record.entityId,
      action: record.action, // Re-added action
      description: record.description,
      // Removed oldValue and newValue as they are not in the schema
      userName: record.user ? `${record.user.name} ${record.user.lastname}` : "N/A",
      userEmail: record.user ? record.user.email : "N/A",
    }))

    if (format === "csv") {
      // Manually generate CSV since @json2csv/plainjs is not available
      const csvHeaders = Object.keys(formattedRecords[0] || {}).join(",")
      const csvRows = formattedRecords.map((row) =>
        Object.values(row)
          .map((value) => `"${value}"`)
          .join(","),
      )
      const csv = [csvHeaders, ...csvRows].join("\n")

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="history_export_${new Date().toISOString()}.csv"`,
        },
      })
    }

    return NextResponse.json({ success: true, data: formattedRecords })
  } catch (error) {
    console.error("Error exporting history records:", error)
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
    const { entityType, entityId, description, action } = body // Re-added action

    if (!entityType || !entityId || !description || !action) {
      return NextResponse.json({ error: "entityType, entityId, description y action son requeridos" }, { status: 400 })
    }

    const newRecord = await prisma.historyRecord.create({
      data: {
        eventType: HistoryEventType.SYSTEM_EVENT,
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
