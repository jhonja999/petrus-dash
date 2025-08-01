import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      console.log("API Customers GET: No token found")
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !(payload.role === "Admin" || payload.role === "S_A")) {
      console.log("API Customers GET: Invalid token or insufficient role", payload)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const customerId = Number.parseInt(params.id)
    if (Number.isNaN(customerId)) {
      console.log("API Customers GET: Invalid customer ID", params.id)
      return NextResponse.json({ success: false, message: "Invalid customer ID" }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      console.log(`API Customers GET: Customer with ID ${customerId} not found`)
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 })
    }

    console.log("API Customers GET: Successfully fetched customer:", customer)
    return NextResponse.json({ success: true, data: customer })
  } catch (error) {
    console.error("API Customers GET: Error fetching customer:", error)
    return NextResponse.json({ success: false, message: "Error fetching customer" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !(payload.role === "Admin" || payload.role === "S_A")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const customerId = Number.parseInt(params.id)
    if (Number.isNaN(customerId)) {
      return NextResponse.json({ success: false, message: "Invalid customer ID" }, { status: 400 })
    }

    const body = await request.json()
    const { companyname, ruc, address, latitude, longitude } = body

    // Basic validation
    if (!companyname || !ruc || !address) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }
    if (!/^\d{11}$/.test(ruc)) {
      return NextResponse.json({ success: false, message: "RUC must be 11 digits" }, { status: 400 })
    }

    // Validate coordinates if provided
    if (latitude !== null && latitude !== undefined) {
      const lat = Number(latitude)
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return NextResponse.json({ success: false, message: "Invalid latitude value" }, { status: 400 })
      }
    }

    if (longitude !== null && longitude !== undefined) {
      const lng = Number(longitude)
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return NextResponse.json({ success: false, message: "Invalid longitude value" }, { status: 400 })
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        companyname,
        ruc,
        address,
        latitude: latitude !== null && latitude !== undefined ? Number(latitude) : null,
        longitude: longitude !== null && longitude !== undefined ? Number(longitude) : null,
      },
    })

    return NextResponse.json({ success: true, data: updatedCustomer })
  } catch (error) {
    console.error("Error updating customer:", error)
    return NextResponse.json({ success: false, message: "Error updating customer" }, { status: 500 })
  }
}
