import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { validateValeNumber } from "@/lib/correlative"

export async function GET(request: NextRequest, { params }: { params: { valeNumber: string } }) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const valeNumber = params.valeNumber

    // Validate vale number format
    if (!validateValeNumber(valeNumber)) {
      return NextResponse.json({ error: "Formato de vale inválido" }, { status: 400 })
    }

    // Get discharge with all related data
    const discharge = await prisma.discharge.findUnique({
      where: { valeNumber },
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

    if (!discharge) {
      return NextResponse.json({ error: "Vale de despacho no encontrado" }, { status: 404 })
    }

    // Format response with complete discharge information
    const report = {
      valeNumber: discharge.valeNumber,
      fecha: discharge.createdAt,
      cliente: {
        razonSocial: discharge.customer.companyname,
        ruc: discharge.customer.ruc,
        direccion: discharge.customer.address,
      },
      conductor: {
        nombre: `${discharge.assignment.driver.name} ${discharge.assignment.driver.lastname}`,
        email: discharge.assignment.driver.email,
        dni: discharge.assignment.driver.dni,
      },
      operario: {
        email: discharge.operatorEmail || discharge.assignment.driver.email,
      },
      vehiculo: {
        placa: discharge.assignment.truck.placa,
        tipoCombustible: discharge.assignment.fuelType,
        capacidad: discharge.assignment.truck.capacitygal,
      },
      despacho: {
        cantidad: discharge.totalDischarged,
        tipoUnidad: discharge.tipoUnidad || "galones",
        marcadorInicial: discharge.marcadorInicial,
        marcadorFinal: discharge.marcadorFinal,
        cantidadReal: discharge.cantidadReal,
        kilometraje: discharge.kilometraje,
        ubicacion: discharge.ubicacion,
        observaciones: discharge.observaciones,
        estado: discharge.status,
        horaInicio: discharge.startTime,
        horaFin: discharge.endTime,
      },
      fotos: discharge.photoUrls || [],
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("Error fetching discharge report:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
