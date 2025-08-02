import { NextRequest, NextResponse } from "next/server"
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
    const { assignmentId, type, imageUrl, uploadedBy } = body

    if (!assignmentId || !type || !imageUrl || !uploadedBy) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    if (!["loading", "unloading"].includes(type)) {
      return NextResponse.json({ error: "Tipo de imagen inválido" }, { status: 400 })
    }

    // Verificar que la asignación existe y pertenece al usuario
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(assignmentId) },
      include: { driver: true }
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    // Verificar permisos: solo el conductor asignado o admins pueden subir imágenes
    if (payload.role !== "Admin" && payload.role !== "S_A" && assignment.driverId !== payload.id) {
      return NextResponse.json({ error: "No tienes permisos para esta asignación" }, { status: 403 })
    }

    // Extraer nombre del archivo de la URL de Cloudinary
    const urlParts = imageUrl.split('/')
    const filename = urlParts[urlParts.length - 1].split('?')[0] // Remove query parameters

    // Guardar referencia en la base de datos
    const imageRecord = await prisma.assignmentImage.create({
      data: {
        assignmentId: Number(assignmentId),
        type: type as 'loading' | 'unloading',
        filename: filename,
        originalName: `Cloudinary_${filename}`,
        fileSize: 0, // Cloudinary doesn't provide file size in URL
        mimeType: 'image/jpeg', // Default, could be determined from URL extension
        uploadedBy: Number(uploadedBy),
      }
    })

    console.log(`✅ Saved Cloudinary image to database: ${imageRecord.id}`)

    return NextResponse.json({
      success: true,
      message: "Imagen guardada correctamente",
      image: {
        id: imageRecord.id,
        filename: filename,
        url: imageUrl,
        originalName: imageRecord.originalName,
        uploadedAt: imageRecord.createdAt
      }
    })

  } catch (error) {
    console.error("❌ Error saving Cloudinary image:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
} 