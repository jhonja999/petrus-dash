import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

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

    const { dispatchId, recipients } = await request.json()

    if (!dispatchId || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verificar que el despacho existe
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: {
        truck: true,
        driver: true,
        customer: true,
      },
    })

    if (!dispatch) {
      return NextResponse.json({ error: "Dispatch not found" }, { status: 404 })
    }

    // En una implementación real, aquí enviarías el email usando un servicio como SendGrid, Nodemailer, etc.
    // Por ahora, simulamos el envío
    console.log("Sending email to:", recipients)
    console.log("Dispatch:", dispatch.dispatchNumber)

    // Simular delay de envío
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      message: `Reporte enviado a ${recipients.length} destinatarios`,
      data: {
        dispatchNumber: dispatch.dispatchNumber,
        recipients,
        sentAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
