import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

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
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores pueden crear clientes." },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { companyname, ruc, address } = body

    // Manual validation
    if (!companyname?.trim() || !ruc?.trim() || !address?.trim()) {
      return NextResponse.json({ error: "Nombre de la empresa, RUC y dirección son requeridos" }, { status: 400 })
    }

    // Basic RUC validation (e.g., 11 digits for Peru)
    if (!/^\d{11}$/.test(ruc.trim())) {
      return NextResponse.json({ error: "El RUC debe tener 11 dígitos" }, { status: 400 })
    }

    // Check if customer already exists by companyname or ruc
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [{ companyname: companyname.trim() }, { ruc: ruc.trim() }],
      },
    })

    if (existingCustomer) {
      const duplicateField = existingCustomer.companyname === companyname.trim() ? "nombre de empresa" : "RUC"
      return NextResponse.json({ error: `Ya existe un cliente con ese ${duplicateField}` }, { status: 409 })
    }

    const customer = await prisma.customer.create({
      data: {
        companyname: companyname.trim(),
        ruc: ruc.trim(),
        address: address.trim(),
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error: any) {
    console.error("Error creating customer:", error.message || error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
