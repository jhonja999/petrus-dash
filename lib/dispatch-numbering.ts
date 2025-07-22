import { prisma } from "@/lib/prisma"

/**
 * Genera el próximo número de despacho en formato PE-XXXXXX-YYYY
 * @returns Promise<string> - Número de despacho generado
 */
export async function generateDispatchNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()

  try {
    // Usar upsert para crear o actualizar la secuencia del año actual
    const sequence = await prisma.dispatchSequence.upsert({
      where: { year: currentYear },
      update: {
        lastNumber: {
          increment: 1,
        },
      },
      create: {
        year: currentYear,
        lastNumber: 1,
      },
    })

    // Formatear el número con ceros a la izquierda (6 dígitos)
    const formattedNumber = sequence.lastNumber.toString().padStart(6, "0")

    return `PE-${formattedNumber}-${currentYear}`
  } catch (error) {
    console.error("Error generating dispatch number:", error)
    throw new Error("Failed to generate dispatch number")
  }
}

/**
 * Obtiene el próximo número de despacho sin incrementar la secuencia
 * SOLO PARA USO EN EL SERVIDOR - NO LLAMAR DESDE EL CLIENTE
 * @returns Promise<string> - Próximo número de despacho
 */
export async function getNextDispatchNumber(): Promise<string> {
  // Verificar que estamos en el servidor
  if (typeof window !== "undefined") {
    throw new Error("getNextDispatchNumber can only be called on the server side")
  }

  const currentYear = new Date().getFullYear()

  try {
    const sequence = await prisma.dispatchSequence.findUnique({
      where: { year: currentYear },
    })

    const nextNumber = (sequence?.lastNumber || 0) + 1
    const formattedNumber = nextNumber.toString().padStart(6, "0")

    return `PE-${formattedNumber}-${currentYear}`
  } catch (error) {
    console.error("Error getting next dispatch number:", error)
    throw new Error("Failed to get next dispatch number")
  }
}

/**
 * Valida si un número de despacho tiene el formato correcto
 * @param dispatchNumber - Número de despacho a validar
 * @returns boolean - True si el formato es válido
 */
export function validateDispatchNumber(dispatchNumber: string): boolean {
  const pattern = /^PE-\d{6}-\d{4}$/
  return pattern.test(dispatchNumber)
}

/**
 * Extrae el año y número de secuencia de un número de despacho
 * @param dispatchNumber - Número de despacho
 * @returns Object con year y sequenceNumber, o null si es inválido
 */
export function parseDispatchNumber(dispatchNumber: string): { year: number; sequenceNumber: number } | null {
  if (!validateDispatchNumber(dispatchNumber)) {
    return null
  }

  const parts = dispatchNumber.split("-")
  const sequenceNumber = Number.parseInt(parts[1], 10)
  const year = Number.parseInt(parts[2], 10)

  return { year, sequenceNumber }
}

/**
 * Obtiene estadísticas de despachos por año
 * @param year - Año para obtener estadísticas (opcional, por defecto año actual)
 * @returns Promise con estadísticas del año
 */
export async function getDispatchStats(year?: number): Promise<{
  year: number
  totalDispatches: number
  lastDispatchNumber: string | null
  averagePerMonth: number
}> {
  const targetYear = year || new Date().getFullYear()

  try {
    const sequence = await prisma.dispatchSequence.findUnique({
      where: { year: targetYear },
    })

    const totalDispatches = sequence?.lastNumber || 0
    const lastDispatchNumber =
      totalDispatches > 0 ? `PE-${totalDispatches.toString().padStart(6, "0")}-${targetYear}` : null

    // Calcular promedio por mes (considerando solo meses transcurridos si es año actual)
    const currentDate = new Date()
    const isCurrentYear = targetYear === currentDate.getFullYear()
    const monthsElapsed = isCurrentYear ? currentDate.getMonth() + 1 : 12
    const averagePerMonth = monthsElapsed > 0 ? totalDispatches / monthsElapsed : 0

    return {
      year: targetYear,
      totalDispatches,
      lastDispatchNumber,
      averagePerMonth: Math.round(averagePerMonth * 100) / 100,
    }
  } catch (error) {
    console.error("Error getting dispatch stats:", error)
    throw new Error("Failed to get dispatch statistics")
  }
}
