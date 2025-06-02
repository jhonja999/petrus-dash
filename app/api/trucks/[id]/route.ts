import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function PUT(request: NextRequest, props: { params: { id: string } }) {
  const params = props.params
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const truckId = Number.parseInt(params.id)

    const truck = await prisma.truck.update({
      where: { id: truckId },
      data: body,
    })

    return NextResponse.json(truck)
  } catch (error) {
    console.error("Error updating truck:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
