import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"
import { writeFile } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const formData = await request.formData()
    const photo = formData.get("photo") as File
    const description = formData.get("description") as string
    const dispatchId = formData.get("dispatchId") as string

    if (!photo || !description || !dispatchId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verificar que el despacho existe
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: Number.parseInt(dispatchId) },
    })

    if (!dispatch) {
      return NextResponse.json({ error: "Dispatch not found" }, { status: 404 })
    }

    // Generar nombre único para el archivo
    const bytes = await photo.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = `dispatch_${dispatchId}_${Date.now()}_${photo.name}`
    const path = join(process.cwd(), "public/uploads", filename)

    // Guardar archivo
    await writeFile(path, buffer)

    // En una implementación real, aquí guardarías la información en la base de datos
    // Por ahora, simulamos la respuesta
    const photoData = {
      id: Date.now(),
      url: `/uploads/${filename}`,
      description,
      timestamp: new Date().toISOString(),
      type: "other" as const,
      dispatchId: Number.parseInt(dispatchId),
    }

    return NextResponse.json({
      success: true,
      data: photoData,
      message: "Foto subida exitosamente",
    })
  } catch (error) {
    console.error("Error uploading photo:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
