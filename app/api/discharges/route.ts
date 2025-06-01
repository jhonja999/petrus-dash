import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { DischargeSchema } from "@/lib/zod-schemas"
import { verifyToken } from "@/lib/jwt"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = DischargeSchema.parse(body)

    const discharge = await prisma.discharge.create({
      data: {
        ...validatedData,
        status: body.status || "pendiente",
      },
      include: {
        customer: true,
        assignment: {
          include: {
            truck: true,
            driver: true,
          },
        },
      },
    })

    return NextResponse.json(discharge)
  } catch (error) {
    console.error("Error creating discharge:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
