import { prisma } from "./prisma"

/**
 * Generates a correlative vale number in format PE-000001-2025
 */
export async function generateValeNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  const prefix = "PE"

  try {
    // Get the highest number for the current year
    const lastDischarge = await prisma.discharge.findFirst({
      where: {
        valeNumber: {
          startsWith: `${prefix}-`,
          endsWith: `-${currentYear}`,
        },
      },
      orderBy: {
        valeNumber: "desc",
      },
    })

    let nextNumber = 1

    if (lastDischarge?.valeNumber) {
      // Extract number from format PE-000001-2025
      const match = lastDischarge.valeNumber.match(/PE-(\d+)-\d{4}/)
      if (match) {
        nextNumber = Number.parseInt(match[1]) + 1
      }
    }

    // Format: PE-000001-2025 (6 digits with leading zeros)
    const formattedNumber = nextNumber.toString().padStart(6, "0")
    return `${prefix}-${formattedNumber}-${currentYear}`
  } catch (error) {
    console.error("Error generating vale number:", error)
    throw new Error("Failed to generate vale number")
  }
}

/**
 * Validates vale number format
 */
export function validateValeNumber(valeNumber: string): boolean {
  const pattern = /^PE-\d{6}-\d{4}$/
  return pattern.test(valeNumber)
}

/**
 * Extracts components from vale number
 */
export function parseValeNumber(valeNumber: string): {
  prefix: string
  number: number
  year: number
} | null {
  const match = valeNumber.match(/^(PE)-(\d{6})-(\d{4})$/)

  if (!match) return null

  return {
    prefix: match[1],
    number: Number.parseInt(match[2]),
    year: Number.parseInt(match[3]),
  }
}

/**
 * Gets next available vale number for preview
 */
export async function getNextValeNumber(): Promise<string> {
  return generateValeNumber()
}
