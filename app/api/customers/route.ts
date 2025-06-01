import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { CustomerSchema } from "@/lib/zod-schemas"
import { verifyToken } from "@/lib/jwt"

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { companyname: "asc" },
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error("Error fetching customers:", error)
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
    const validatedData = CustomerSchema.parse(body)

    const customer = await prisma.customer.create({
      data: validatedData,
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
