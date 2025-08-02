import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

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

    const formData = await request.formData()
    const assignmentId = formData.get("assignmentId") as string
    const type = formData.get("type") as string
    const images = formData.getAll("images") as File[]

    if (!assignmentId || !type || !images.length) {
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

    const uploadedImages = []

    for (const image of images) {
      if (!image.type.startsWith("image/")) {
        continue // Skip non-image files
      }

      const bytes = await image.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Crear directorio si no existe
      const uploadDir = join(process.cwd(), "public", "uploads", "assignments", assignmentId, type)
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      // Generar nombre único para la imagen
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 15)
      const extension = image.name.split('.').pop() || 'jpg'
      const filename = `${type}_${timestamp}_${randomId}.${extension}`
      const filepath = join(uploadDir, filename)

      // Guardar archivo
      await writeFile(filepath, buffer)

      // Guardar referencia en la base de datos
      const imageRecord = await prisma.assignmentImage.create({
        data: {
          assignmentId: Number(assignmentId),
          type: type as 'loading' | 'unloading',
          filename: filename,
          originalName: image.name,
          fileSize: image.size,
          mimeType: image.type,
          uploadedBy: payload.id,
        }
      })

      uploadedImages.push({
        id: imageRecord.id,
        filename: filename,
        url: `/uploads/assignments/${assignmentId}/${type}/${filename}`,
        originalName: image.name,
        uploadedAt: imageRecord.createdAt
      })
    }

    console.log(`✅ Uploaded ${uploadedImages.length} images for assignment ${assignmentId}, type: ${type}`)

    return NextResponse.json({
      success: true,
      message: `${uploadedImages.length} imagen(es) subida(s) correctamente`,
      images: uploadedImages
    })

  } catch (error) {
    console.error("❌ Error uploading images:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get("assignmentId")
    const type = searchParams.get("type")

    if (!assignmentId) {
      return NextResponse.json({ error: "ID de asignación requerido" }, { status: 400 })
    }

    // Verificar permisos
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(assignmentId) },
      include: { driver: true }
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    if (payload.role !== "Admin" && payload.role !== "S_A" && assignment.driverId !== payload.id) {
      return NextResponse.json({ error: "No tienes permisos para esta asignación" }, { status: 403 })
    }

    // Construir filtro
    const where: any = { assignmentId: Number(assignmentId) }
    if (type && ["loading", "unloading"].includes(type)) {
      where.type = type
    }

    const images = await prisma.assignmentImage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            lastname: true
          }
        }
      }
    })

    const imagesWithUrls = images.map(img => ({
      ...img,
      url: `/uploads/assignments/${assignmentId}/${img.type}/${img.filename}`
    }))

    return NextResponse.json({
      success: true,
      images: imagesWithUrls
    })

  } catch (error) {
    console.error("❌ Error fetching images:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
} 