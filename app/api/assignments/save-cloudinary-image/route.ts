import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const body = await request.json()
    const { assignmentId, dispatchId, type, imageUrl, publicId, originalName, fileSize, format, uploadedBy } = body

    if (!assignmentId || !type || !imageUrl) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Validar que la asignación existe
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(assignmentId) },
      include: { driver: true },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    // Verificar permisos
    if (payload.role !== "Admin" && payload.role !== "S_A" && assignment.driverId !== payload.id) {
      return NextResponse.json({ error: "No tienes permisos para esta asignación" }, { status: 403 })
    }

    // Extraer información de la URL de Cloudinary
    const urlParts = imageUrl.split("/")
    const filename = urlParts[urlParts.length - 1].split("?")[0]
    const cloudinaryPublicId = publicId || filename.split(".")[0]

    // Crear el registro de imagen
    const imageRecord = await prisma.assignmentImage.create({
      data: {
        assignmentId: Number(assignmentId),
        dispatchId: dispatchId ? Number(dispatchId) : null,
        type: type,
        filename: filename,
        originalName: originalName || `Cloudinary_${filename}`,
        fileSize: fileSize || 0,
        mimeType: format ? `image/${format}` : "image/jpeg",
        uploadedBy: uploadedBy || payload.id,
        url: imageUrl,
      },
    })

    console.log(`✅ Imagen de Cloudinary guardada: ${imageRecord.id}`)

    return NextResponse.json({
      success: true,
      message: "Imagen guardada correctamente",
      image: {
        id: imageRecord.id,
        filename: filename,
        url: imageUrl,
        originalName: imageRecord.originalName,
        uploadedAt: imageRecord.createdAt,
        type: type,
        uploadedBy: imageRecord.uploadedBy,
      },
    })
  } catch (error: any) {
    console.error("❌ Error saving Cloudinary image:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
