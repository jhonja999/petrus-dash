// app/api/customers/[id]/route.ts
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const customerId = Number.parseInt(id)

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return new Response(JSON.stringify({ message: "Customer not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(customer), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error fetching customer:", error)
    return new Response(JSON.stringify({ message: "Error fetching customer" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
