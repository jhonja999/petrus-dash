import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { isAdmin, isConductor } from "@/lib/auth"

// GET: Fetch all customers or filter by query params
export async function GET(req: Request) {
  try {
    const { userId, sessionClaims } =await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Check if user has valid role
    if (!isAdmin(userRole) && !isConductor(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const companyname = searchParams.get("companyname")
    const ruc = searchParams.get("ruc")

    // Build filter object based on query params
    const filter: any = {}
    if (companyname) filter.companyname = { contains: companyname }
    if (ruc) filter.ruc = { contains: ruc }

    const customers = await db.customer.findMany({
      where: filter,
      orderBy: { id: "desc" },
      include: {
        Discharge: {
          include: {
            assignment: true,
          },
        },
      },
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error("[CUSTOMERS_GET]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// POST: Create a new customer
export async function POST(req: Request) {
  try {
    const { userId, sessionClaims } =await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can create customers
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const body = await req.json()
    const { companyname, ruc, address, contactName, contactPhone, contactEmail } = body

    if (!companyname || !ruc || !address) {
      return new NextResponse("Faltan campos requeridos", { status: 400 })
    }

    // Check if customer with same RUC already exists
    const existingCustomer = await db.customer.findUnique({
      where: { ruc },
    })

    if (existingCustomer) {
      return new NextResponse("Ya existe un cliente con este RUC", { status: 409 })
    }

    const customer = await db.customer.create({
      data: {
        companyname,
        ruc,
        address,
        contactName,
        contactPhone,
        contactEmail,
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("[CUSTOMERS_POST]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// PATCH: Update a customer
export async function PATCH(req: Request) {
  try {
    const { userId, sessionClaims } =await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can update customers
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const body = await req.json()
    const { id, companyname, ruc, address, contactName, contactPhone, contactEmail } = body

    if (!id) {
      return new NextResponse("ID del cliente es requerido", { status: 400 })
    }

    // Check if customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id: Number(id) },
    })

    if (!existingCustomer) {
      return new NextResponse("Cliente no encontrado", { status: 404 })
    }

    // Check if new RUC conflicts with another customer
    if (ruc && ruc !== existingCustomer.ruc) {
      const rucExists = await db.customer.findUnique({
        where: { ruc },
      })

      if (rucExists) {
        return new NextResponse("Ya existe un cliente con este RUC", { status: 409 })
      }
    }

    const updatedCustomer = await db.customer.update({
      where: { id: Number(id) },
      data: {
        companyname: companyname || undefined,
        ruc: ruc || undefined,
        address: address || undefined,
        contactName: contactName || undefined,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
      },
    })

    return NextResponse.json(updatedCustomer)
  } catch (error) {
    console.error("[CUSTOMERS_PATCH]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// DELETE: Delete a customer
export async function DELETE(req: Request) {
  try {
    const { userId, sessionClaims } =await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can delete customers
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return new NextResponse("ID del cliente es requerido", { status: 400 })
    }

    // Check if customer has discharges
    const dischargesCount = await db.discharge.count({
      where: { customerId: Number(id) },
    })

    if (dischargesCount > 0) {
      return new NextResponse("No se puede eliminar el cliente porque tiene descargas asociadas", { status: 409 })
    }

    await db.customer.delete({
      where: { id: Number(id) },
    })

    return new NextResponse("Cliente eliminado correctamente")
  } catch (error) {
    console.error("[CUSTOMERS_DELETE]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}
