import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers" // Correct import for cookies

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
    const token = (await cookies()).get("token")?.value // Correct usage of cookies()
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      // Only Admin or S_A can create trucks
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores pueden crear camiones." },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { placa, typefuel, capacitygal, lastRemaining, state } = body

    // Manual validation
    if (!placa?.trim() || !typefuel || isNaN(Number(capacitygal)) || Number(capacitygal) <= 0) {
      return NextResponse.json(
        { error: "Placa, tipo de combustible y capacidad son requeridos y válidos" },
        { status: 400 },
      )
    }

    // Validate typefuel against FuelType enum
    const validFuelTypes = ["DIESEL_B5", "GASOLINA_90", "GASOLINA_95", "GLP", "ELECTRICA"]
    if (!validFuelTypes.includes(typefuel)) {
      return NextResponse.json({ error: "Tipo de combustible inválido" }, { status: 400 })
    }

    // Validate state against TruckState enum
    const validTruckStates = ["Activo", "Inactivo", "Mantenimiento", "Transito", "Descarga", "Asignado"]
    if (state !== undefined && !validTruckStates.includes(state)) {
      return NextResponse.json({ error: "Estado de camión inválido" }, { status: 400 })
    }

    // Check if truck already exists by placa
    const existingTruck = await prisma.truck.findUnique({
      where: { placa: placa.trim() },
    })

    if (existingTruck) {
      return NextResponse.json({ error: "Ya existe un camión con esa placa" }, { status: 409 })
    }

    const truck = await prisma.truck.create({
      data: {
        placa: placa.trim(),
        typefuel,
        capacitygal: Number.parseFloat(capacitygal),
        lastRemaining: lastRemaining !== undefined ? Number.parseFloat(lastRemaining) : 0.0,
        state: state || "Activo", // Default to "Activo" if not provided
      },
    })

    return NextResponse.json(truck, { status: 201 })
  } catch (error: any) {
    console.error("Error creating truck:", error.message || error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
