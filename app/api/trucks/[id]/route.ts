import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const truckId = Number.parseInt(params.id)

    if (isNaN(truckId)) {
      return NextResponse.json({ success: false, error: "ID de camión inválido" }, { status: 400 })
    }

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
    })

    if (!truck) {
      return NextResponse.json({ success: false, error: "Camión no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: truck })
  } catch (error) {
    console.error("Error fetching truck:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const truckId = Number.parseInt(params.id)

    if (isNaN(truckId)) {
      return NextResponse.json({ success: false, error: "ID de camión inválido" }, { status: 400 })
    }

    const truck = await prisma.truck.update({
      where: { id: truckId },
      data: body,
    })

    return NextResponse.json({ success: true, data: truck })
  } catch (error) {
    console.error("Error updating truck:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
