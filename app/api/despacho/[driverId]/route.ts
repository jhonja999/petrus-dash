import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { generateValeNumber } from "@/lib/correlative"

export async function POST(request: NextRequest, { params }: { params: { driverId: string } }) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const driverId = Number.parseInt(params.driverId)
    if (isNaN(driverId)) {
      return NextResponse.json({ error: "ID de conductor inválido" }, { status: 400 })
    }

    const body = await request.json()
    const {
      assignmentId,
      customerId,
      totalDischarged,
      marcadorInicial,
      marcadorFinal,
      operatorEmail,
      kilometraje,
      ubicacion,
      observaciones,
      photoUrls = [],
    } = body

    // Validate required fields
    if (!assignmentId || !customerId || !totalDischarged) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Verify assignment exists and belongs to driver
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        driverId: driverId,
      },
      include: {
        truck: true,
        driver: true,
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada o no autorizada" }, { status: 404 })
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Validate discharge amount
    const dischargeAmount = Number.parseFloat(totalDischarged.toString())
    const currentRemaining = Number.parseFloat(assignment.totalRemaining.toString())

    if (dischargeAmount <= 0) {
      return NextResponse.json({ error: "La cantidad descargada debe ser mayor a 0" }, { status: 400 })
    }

    if (dischargeAmount > currentRemaining) {
      return NextResponse.json(
        {
          error: "La cantidad descargada no puede ser mayor al combustible disponible",
          details: `Disponible: ${currentRemaining} gal, Solicitado: ${dischargeAmount} gal`,
        },
        { status: 400 },
      )
    }

    // Generate correlative vale number
    const valeNumber = await generateValeNumber()

    // Create discharge with correlative numbering
    const discharge = await prisma.discharge.create({
      data: {
        valeNumber,
        assignmentId,
        customerId,
        totalDischarged: dischargeAmount,
        status: "finalizado",
        marcadorInicial: marcadorInicial ? Number.parseFloat(marcadorInicial.toString()) : null,
        marcadorFinal: marcadorFinal ? Number.parseFloat(marcadorFinal.toString()) : null,
        cantidadReal: dischargeAmount,
        operatorEmail: operatorEmail || assignment.driver.email,
        kilometraje: kilometraje ? Number.parseFloat(kilometraje.toString()) : null,
        ubicacion,
        tipoUnidad: "galones",
        observaciones,
        photoUrls,
        startTime: new Date(),
        endTime: new Date(),
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

    // Update assignment remaining fuel
    const newRemaining = currentRemaining - dischargeAmount
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        totalRemaining: newRemaining,
        updatedAt: new Date(),
      },
    })

    // Update truck's last remaining fuel
    await prisma.truck.update({
      where: { id: assignment.truckId },
      data: {
        lastRemaining: newRemaining,
        state: newRemaining <= 0 ? "Activo" : "Descarga",
      },
    })

    return NextResponse.json({
      success: true,
      discharge,
      valeNumber,
      message: `Despacho ${valeNumber} creado exitosamente`,
    })
  } catch (error) {
    console.error("Error creating discharge:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
