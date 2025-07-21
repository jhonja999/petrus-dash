export interface TruckCapacity {
  id: number
  capacitygal: number
  currentLoad: number
  minCapacity?: number | null
  maxCapacity?: number | null
}

export interface CapacityValidation {
  isValid: boolean
  message: string
  availableCapacity: number
  utilizationPercentage: number
}

export class CapacityUtils {
  // Validar si se puede asignar una cantidad a un camión
  static validateCapacityAssignment(truck: TruckCapacity, requestedQuantity: number): CapacityValidation {
    const totalCapacity = Number(truck.capacitygal)
    const currentLoad = Number(truck.currentLoad || 0)
    const availableCapacity = totalCapacity - currentLoad
    const newLoad = currentLoad + requestedQuantity
    const utilizationPercentage = (newLoad / totalCapacity) * 100

    if (requestedQuantity <= 0) {
      return {
        isValid: false,
        message: "La cantidad debe ser mayor a 0",
        availableCapacity,
        utilizationPercentage: (currentLoad / totalCapacity) * 100,
      }
    }

    if (requestedQuantity > availableCapacity) {
      return {
        isValid: false,
        message: `Capacidad insuficiente. Disponible: ${availableCapacity.toLocaleString()} gal, Solicitado: ${requestedQuantity.toLocaleString()} gal`,
        availableCapacity,
        utilizationPercentage,
      }
    }

    if (utilizationPercentage > 100) {
      return {
        isValid: false,
        message: `La asignación excede la capacidad máxima del camión (${totalCapacity.toLocaleString()} gal)`,
        availableCapacity,
        utilizationPercentage,
      }
    }

    // Advertencia si se supera el 90%
    if (utilizationPercentage > 90) {
      return {
        isValid: true,
        message: `Advertencia: Se utilizará el ${utilizationPercentage.toFixed(1)}% de la capacidad`,
        availableCapacity: availableCapacity - requestedQuantity,
        utilizationPercentage,
      }
    }

    return {
      isValid: true,
      message: `Asignación válida. Capacidad restante: ${(availableCapacity - requestedQuantity).toLocaleString()} gal`,
      availableCapacity: availableCapacity - requestedQuantity,
      utilizationPercentage,
    }
  }

  // Calcular capacidad disponible
  static getAvailableCapacity(truck: TruckCapacity): number {
    const maxCapacity = Number(truck.maxCapacity || truck.capacitygal)
    const currentLoad = Number(truck.currentLoad || 0)
    return Math.max(maxCapacity - currentLoad, 0)
  }

  // Calcular porcentaje de utilización
  static getUtilizationPercentage(truck: TruckCapacity): number {
    const maxCapacity = Number(truck.maxCapacity || truck.capacitygal)
    const currentLoad = Number(truck.currentLoad || 0)
    return maxCapacity > 0 ? (currentLoad / maxCapacity) * 100 : 0
  }

  // Obtener estado de capacidad
  static getCapacityStatus(truck: TruckCapacity): "empty" | "low" | "medium" | "high" | "full" {
    const percentage = CapacityUtils.getUtilizationPercentage(truck)

    if (percentage >= 100) return "full"
    if (percentage >= 90) return "high"
    if (percentage >= 70) return "medium"
    if (percentage >= 30) return "low"
    return "empty"
  }

  // Formatear capacidad para mostrar
  static formatCapacity(value: number, unit = "gal"): string {
    return `${value.toLocaleString()} ${unit}`
  }

  // Calcular capacidad óptima para un conjunto de entregas
  static calculateOptimalCapacity(deliveries: { quantity: number }[]): number {
    return deliveries.reduce((total, delivery) => total + delivery.quantity, 0)
  }

  // Validar rango de capacidad
  static isValidCapacityRange(min: number, max: number): boolean {
    return min > 0 && max > min && min >= 1500 && max <= 15000
  }

  // Sugerir capacidad basada en historial
  static suggestCapacityBasedOnHistory(historicalLoads: number[]): {
    suggested: number
    confidence: number
    reasoning: string
  } {
    if (historicalLoads.length === 0) {
      return {
        suggested: 5000,
        confidence: 0,
        reasoning: "Sin historial disponible, se sugiere capacidad estándar",
      }
    }

    const average = historicalLoads.reduce((sum, load) => sum + load, 0) / historicalLoads.length
    const max = Math.max(...historicalLoads)
    const suggested = Math.ceil(max * 1.2) // 20% de margen

    const confidence = historicalLoads.length >= 10 ? 0.8 : (historicalLoads.length / 10) * 0.8

    return {
      suggested: Math.min(suggested, 15000), // No exceder límite máximo
      confidence,
      reasoning: `Basado en ${historicalLoads.length} cargas históricas (promedio: ${average.toFixed(0)} gal, máximo: ${max.toFixed(0)} gal)`,
    }
  }
}

// Función de conveniencia para validación rápida
export function validateCapacityAssignment(truck: TruckCapacity, quantity: number): CapacityValidation {
  const totalCapacity = Number(truck.capacitygal)
  const currentLoad = Number(truck.currentLoad || 0)
  const availableCapacity = totalCapacity - currentLoad
  const newLoad = currentLoad + quantity
  const utilizationPercentage = (newLoad / totalCapacity) * 100

  if (quantity <= 0) {
    return {
      isValid: false,
      message: "La cantidad debe ser mayor a 0",
      availableCapacity,
      utilizationPercentage: (currentLoad / totalCapacity) * 100,
    }
  }

  if (quantity > availableCapacity) {
    return {
      isValid: false,
      message: `Capacidad insuficiente. Disponible: ${availableCapacity.toLocaleString()} gal, Solicitado: ${quantity.toLocaleString()} gal`,
      availableCapacity,
      utilizationPercentage,
    }
  }

  if (utilizationPercentage > 100) {
    return {
      isValid: false,
      message: `La asignación excede la capacidad máxima del camión (${totalCapacity.toLocaleString()} gal)`,
      availableCapacity,
      utilizationPercentage,
    }
  }

  // Advertencia si se supera el 90%
  if (utilizationPercentage > 90) {
    return {
      isValid: true,
      message: `Advertencia: Se utilizará el ${utilizationPercentage.toFixed(1)}% de la capacidad`,
      availableCapacity: availableCapacity - quantity,
      utilizationPercentage,
    }
  }

  return {
    isValid: true,
    message: `Asignación válida. Capacidad restante: ${(availableCapacity - quantity).toLocaleString()} gal`,
    availableCapacity: availableCapacity - quantity,
    utilizationPercentage,
  }
}

export function calculateCapacityInfo(truck: TruckCapacity): {
  totalCapacity: number
  currentLoad: number
  availableCapacity: number
  utilizationPercentage: number
  status: "empty" | "low" | "medium" | "high" | "full"
  isOverCapacity: boolean
} {
  const totalCapacity = Number(truck.capacitygal)
  const currentLoad = Number(truck.currentLoad || 0)
  const availableCapacity = Math.max(totalCapacity - currentLoad, 0)
  const utilizationPercentage = totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0

  let status: "empty" | "low" | "medium" | "high" | "full"
  if (utilizationPercentage >= 100) status = "full"
  else if (utilizationPercentage >= 90) status = "high"
  else if (utilizationPercentage >= 70) status = "medium"
  else if (utilizationPercentage >= 30) status = "low"
  else status = "empty"

  return {
    totalCapacity,
    currentLoad,
    availableCapacity,
    utilizationPercentage,
    status,
    isOverCapacity: currentLoad > totalCapacity,
  }
}
