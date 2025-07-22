import { type NextRequest, NextResponse } from "next/server";
import { getNextDispatchNumber } from "@/lib/dispatch-numbering";

export async function GET(request: NextRequest) {
  try {
    const nextNumber = await getNextDispatchNumber();

    return NextResponse.json({
      success: true,
      data: nextNumber,
    });
  } catch (error) {
    console.error("Error getting next dispatch number:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener el siguiente número de despacho",
      },
      { status: 500 }
    );
  }
}
