import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"
import { TruckState, FuelType } from "@prisma/client" // Import TruckState and FuelType enums from Prisma client

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const state = searchParams.get("state") as TruckState | undefined // Filter by state
    const placa = searchParams.get("placa") || "" // Filter by placa

    const skip = (page - 1) * limit

    const where: any = {}
    if (state) {
      where.state = state
    }
    if (placa) {
      where.placa = {
        contains: placa,
        mode: "insensitive", // Case-insensitive search
      }
    }

    const trucks = await prisma.truck.findMany({
      where,
      orderBy: {
        placa: "asc", // Order by placa alphabetically
      },
      skip,
      take: limit,
    })

    const totalCount = await prisma.truck.count({ where })

    return NextResponse.json({
      trucks,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error: any) {
    // Explicitly type error as any
    console.error("Error fetching trucks:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { placa, typefuel, capacitygal } = body

    if (!placa || !typefuel || !capacitygal) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    // Validate typefuel against the FuelType enum
    const validFuelTypes = Object.values(FuelType) as string[]
    if (!validFuelTypes.includes(typefuel)) {
      return NextResponse.json({ error: "Tipo de combustible inválido" }, { status: 400 })
    }

    const newTruck = await prisma.truck.create({
      data: {
        placa,
        typefuel: typefuel as FuelType, // Cast to FuelType enum
        capacitygal: Number(capacitygal),
        state: TruckState.Activo, // Default state
      },
    })

    return NextResponse.json(newTruck, { status: 201 })
  } catch (error: any) {
    // Explicitly type error as any
    console.error("Error creating truck:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "La placa o el RUC ya existen" }, { status: 409 })
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { id, placa, typefuel, capacitygal, state } = body

    if (!id || !placa || !typefuel || !capacitygal || !state) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    // Validate typefuel against the FuelType enum
    const validFuelTypes = Object.values(FuelType) as string[]
    if (!validFuelTypes.includes(typefuel)) {
      return NextResponse.json({ error: "Tipo de combustible inválido" }, { status: 400 })
    }

    // Validate state against the TruckState enum
    const validTruckStates = Object.values(TruckState) as string[]
    if (!validTruckStates.includes(state)) {
      return NextResponse.json({ error: "Estado de camión inválido" }, { status: 400 })
    }

    const updatedTruck = await prisma.truck.update({
      where: { id: Number(id) },
      data: {
        placa,
        typefuel: typefuel as FuelType, // Cast to FuelType enum
        capacitygal: Number(capacitygal),
        state: state as TruckState, // Cast to TruckState enum
      },
    })

    return NextResponse.json(updatedTruck)
  } catch (error: any) {
    // Explicitly type error as any
    console.error("Error updating truck:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "La placa ya existe" }, { status: 409 })
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
