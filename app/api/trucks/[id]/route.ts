import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID de camión inválido" }, { status: 400 })
    }

    const truck = await prisma.truck.findUnique({
      where: { id },
    })

    if (!truck) {
      return NextResponse.json({ error: "Camión no encontrado" }, { status: 404 })
    }

    return NextResponse.json(truck)
  } catch (error) {
    console.error("Error fetching truck:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores pueden editar camiones." },
        { status: 403 },
      )
    }

    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID de camión inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { placa, typefuel, capacitygal, lastRemaining, state, customFuelType } = body

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

    // Validate custom fuel name if PERSONALIZADO is selected
    if (typefuel === "PERSONALIZADO") {
      if (!customFuelType?.trim()) {
        return NextResponse.json({ error: "El nombre del combustible personalizado es requerido" }, { status: 400 })
      }
      if (customFuelType.trim().length < 3) {
        return NextResponse.json(
          { error: "El nombre del combustible personalizado debe tener al menos 3 caracteres" },
          { status: 400 },
        )
      }
    }

    // Validate state against TruckState enum
    const validTruckStates = ["Activo", "Inactivo", "Mantenimiento", "Transito", "Descarga", "Asignado"]
    if (state !== undefined && !validTruckStates.includes(state)) {
      return NextResponse.json({ error: "Estado de camión inválido" }, { status: 400 })
    }

    // Check if truck exists
    const existingTruck = await prisma.truck.findUnique({
      where: { id },
    })

    if (!existingTruck) {
      return NextResponse.json({ error: "Camión no encontrado" }, { status: 404 })
    }

    // Check if placa is unique (excluding current truck)
    if (placa.trim() !== existingTruck.placa) {
      const duplicatePlaca = await prisma.truck.findUnique({
        where: { placa: placa.trim() },
      })

      if (duplicatePlaca) {
        return NextResponse.json({ error: "Ya existe un camión con esa placa" }, { status: 409 })
      }
    }

    const updatedTruck = await prisma.truck.update({
      where: { id },
      data: {
        placa: placa.trim(),
        typefuel,
        capacitygal: Number.parseFloat(capacitygal),
        lastRemaining: lastRemaining !== undefined ? Number.parseFloat(lastRemaining) : 0.0,
        state: state || "Activo",
        customFuelType: typefuel === "PERSONALIZADO" ? customFuelType?.trim() : null,
      },
    })

    return NextResponse.json({ success: true, data: updatedTruck })
  } catch (error: any) {
    console.error("Error updating truck:", error.message || error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores pueden eliminar camiones." },
        { status: 403 },
      )
    }

    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID de camión inválido" }, { status: 400 })
    }

    // Check if truck exists
    const existingTruck = await prisma.truck.findUnique({
      where: { id },
    })

    if (!existingTruck) {
      return NextResponse.json({ error: "Camión no encontrado" }, { status: 404 })
    }

    // Check if truck has active assignments or dispatches
    const activeAssignments = await prisma.assignment.count({
      where: {
        truckId: id,
        status: {
          in: ["PROGRAMADO", "CARGANDO", "EN_RUTA"],
        },
      },
    })

    const activeDispatches = await prisma.dispatch.count({
      where: {
        truckId: id,
        status: {
          in: ["PROGRAMADO", "CARGANDO", "EN_RUTA"],
        },
      },
    })

    if (activeAssignments > 0 || activeDispatches > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el camión porque tiene asignaciones o despachos activos" },
        { status: 400 },
      )
    }

    await prisma.truck.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Camión eliminado correctamente" })
  } catch (error: any) {
    console.error("Error deleting truck:", error.message || error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
