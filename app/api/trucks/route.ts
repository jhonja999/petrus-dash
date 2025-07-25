import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

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
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
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
    const validFuelTypes = [
      "DIESEL_B5",
      "DIESEL_B500",
      "GASOLINA_PREMIUM_95",
      "GASOLINA_REGULAR_90",
      "GASOHOL_84",
      "GASOHOL_90",
      "GASOHOL_95",
      "SOLVENTE",
      "GASOL",
      "PERSONALIZADO",
    ]
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
        state: state || "Activo",
      },
    })

    return NextResponse.json(truck, { status: 201 })
  } catch (error: any) {
    console.error("Error creating truck:", error.message || error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
