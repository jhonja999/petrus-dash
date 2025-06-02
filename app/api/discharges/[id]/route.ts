import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers" // Correct import for cookies

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
   const { id } = await params

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const discharge = await prisma.discharge.findUnique({
      where: { id: Number(id) },
      include: {
        assignment: true,
        customer: true,
      },
    })

    if (!discharge) {
      return NextResponse.json({ error: "Despacho no encontrado" }, { status: 404 })
    }

    return NextResponse.json(discharge)
  } catch (error: any) {
    console.error("Error obteniendo despacho:", error.message || error)
    return NextResponse.json({ error: "Error al obtener el despacho", details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get("token")?.value // Correct usage of cookies()
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      // Only Admin or S_A can update discharges
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores pueden actualizar despachos." },
        { status: 403 },
      )
    }

    const { id } = await params
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { totalDischarged, status, marcadorInicial, marcadorFinal, cantidadReal } = body

    // Manual validation and update data construction
    const updateData: { [key: string]: any } = {}
    if (totalDischarged !== undefined) {
      if (isNaN(Number(totalDischarged)))
        return NextResponse.json({ error: "totalDischarged debe ser un número" }, { status: 400 })
      updateData.totalDischarged = Number.parseFloat(totalDischarged)
    }
    if (status !== undefined) {
      if (typeof status !== "string")
        return NextResponse.json({ error: "status debe ser una cadena de texto" }, { status: 400 })
      updateData.status = status
    }
    if (marcadorInicial !== undefined) {
      if (isNaN(Number(marcadorInicial)))
        return NextResponse.json({ error: "marcadorInicial debe ser un número" }, { status: 400 })
      updateData.marcadorInicial = Number.parseFloat(marcadorInicial)
    }
    if (marcadorFinal !== undefined) {
      if (isNaN(Number(marcadorFinal)))
        return NextResponse.json({ error: "marcadorFinal debe ser un número" }, { status: 400 })
      updateData.marcadorFinal = Number.parseFloat(marcadorFinal)
    }
    if (cantidadReal !== undefined) {
      if (isNaN(Number(cantidadReal)))
        return NextResponse.json({ error: "cantidadReal debe ser un número" }, { status: 400 })
      updateData.cantidadReal = Number.parseFloat(cantidadReal)
    }

    const updatedDischarge = await prisma.discharge.update({
      where: { id: Number(id) },
      data: updateData,
    })

    return NextResponse.json(updatedDischarge)
  } catch (error: any) {
    console.error("Error updating discharge:", error.message || error)
    return NextResponse.json({ error: "Error al actualizar despacho", details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get("token")?.value // Correct usage of cookies()
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      // Only Admin or S_A can delete discharges
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores pueden eliminar despachos." },
        { status: 403 },
      )
    }

    const { id } = await params
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const deletedDischarge = await prisma.discharge.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ message: "Despacho eliminado exitosamente", deletedDischarge })
  } catch (error: any) {
    console.error("Error deleting discharge:", error.message || error)
    return NextResponse.json({ error: "Error al eliminar despacho", details: error.message }, { status: 500 })
  }
}
