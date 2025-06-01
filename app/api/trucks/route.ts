import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { TruckSchema } from "@/lib/zod-schemas"
import { verifyToken } from "@/lib/jwt"

export async function GET() {
  try {
    const trucks = await prisma.truck.findMany({
      orderBy: { placa: "asc" },
    })

    return NextResponse.json(trucks)
  } catch (error) {
    console.error("Error fetching trucks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const validatedData = TruckSchema.parse(body)

    const truck = await prisma.truck.create({
      data: validatedData,
    })

    return NextResponse.json(truck)
  } catch (error) {
    console.error("Error creating truck:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
