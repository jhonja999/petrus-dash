import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET() {
  console.log("🔍 GET /api/customers - Iniciando...")

  try {
    console.log("📊 Conectando a la base de datos...")

    // Test database connection
    await prisma.$connect()
    console.log("✅ Conexión a BD exitosa")

    console.log("🔍 Buscando clientes...")
    const customers = await prisma.customer.findMany({
      orderBy: { companyname: "asc" },
    })

    console.log(`✅ Clientes encontrados: ${customers.length}`)
    return NextResponse.json(customers)
  } catch (error: any) {
    console.error("❌ Error en GET /api/customers:")
    console.error("Error completo:", error)
    console.error("Error message:", error?.message)
    console.error("Error stack:", error?.stack)

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error?.message,
        type: error?.constructor?.name,
      },
      { status: 500 },
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  console.log("🔍 POST /api/customers - Iniciando...")

  try {
    console.log("🍪 Verificando cookies...")
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      console.log("❌ No hay token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔐 Verificando token...")
    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      console.log("❌ Token inválido o sin permisos")
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores pueden crear clientes." },
        { status: 403 },
      )
    }
    console.log(`✅ Usuario autorizado: ${payload.role}`)

    console.log("📝 Parseando body...")
    const body = await request.json()
    console.log("Body recibido:", body)

    const { companyname, ruc, address, latitude, longitude, confirmRuc } = body

    // Manual validation
    console.log("🔍 Validando campos...")
    if (!companyname?.trim() || !ruc?.trim() || !address?.trim()) {
      console.log("❌ Campos requeridos faltantes")
      return NextResponse.json({ error: "Nombre de la empresa, RUC y dirección son requeridos" }, { status: 400 })
    }

    // Validate RUC contains only numbers
    if (!/^\d+$/.test(ruc.trim())) {
      console.log("❌ RUC con caracteres no numéricos")
      return NextResponse.json({ error: "El RUC debe contener solo números" }, { status: 400 })
    }

    // RUC length validation with confirmation option
    const rucLength = ruc.trim().length
    console.log(`📏 RUC length: ${rucLength}`)

    if (rucLength !== 11) {
      if (!confirmRuc) {
        console.log("❌ RUC no estándar sin confirmación")
        return NextResponse.json(
          {
            error: `El RUC debe tener 11 dígitos. Actualmente tiene ${rucLength} dígitos.`,
            needsConfirmation: true,
          },
          { status: 400 },
        )
      }
      console.log(`⚠️ RUC no estándar confirmado: ${rucLength} dígitos`)
    }

    console.log("📊 Conectando a la base de datos...")
    await prisma.$connect()
    console.log("✅ Conexión a BD exitosa")

    console.log("🔍 Verificando duplicados...")
    // Check if customer already exists by companyname or ruc
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [{ companyname: companyname.trim() }, { ruc: ruc.trim() }],
      },
    })

    if (existingCustomer) {
      const duplicateField = existingCustomer.companyname === companyname.trim() ? "nombre de empresa" : "RUC"
      console.log(`❌ Cliente duplicado por: ${duplicateField}`)
      return NextResponse.json({ error: `Ya existe un cliente con ese ${duplicateField}` }, { status: 409 })
    }

    console.log("✅ No hay duplicados")
    console.log("💾 Creando cliente...")

    const customerData = {
      companyname: companyname.trim(),
      ruc: ruc.trim(),
      address: address.trim(),
      ...(latitude && !isNaN(Number.parseFloat(latitude)) && { latitude: Number.parseFloat(latitude) }),
      ...(longitude && !isNaN(Number.parseFloat(longitude)) && { longitude: Number.parseFloat(longitude) }),
    }
    console.log("Datos a guardar:", customerData)

    const customer = await prisma.customer.create({
      data: customerData,
    })

    console.log("✅ Cliente creado:", customer)

    // Include info about non-standard RUC in response
    const response = {
      ...customer,
      ...(rucLength !== 11 && { rucWarning: `RUC guardado con ${rucLength} dígitos (no estándar)` }),
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error("❌ Error en POST /api/customers:")
    console.error("Error completo:", error)
    console.error("Error message:", error?.message)
    console.error("Error stack:", error?.stack)
    console.error("Error code:", error?.code)
    console.error("Error meta:", error?.meta)

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error?.message,
        code: error?.code,
        type: error?.constructor?.name,
      },
      { status: 500 },
    )
  } finally {
    await prisma.$disconnect()
  }
}
