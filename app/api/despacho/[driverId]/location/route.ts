import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Cache en memoria para ubicaciones activas
interface LocationData {
  latitude: number
  longitude: number
  timestamp: Date
  assignmentId?: number
  status: 'active' | 'inactive'
  driverName?: string
}

const locationCache = new Map<string, LocationData>()

// Función para obtener información del conductor
async function getDriverInfo(driverId: number) {
  try {
    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true
      }
    })
    return driver
  } catch (error) {
    console.error('Error getting driver info:', error)
    return null
  }
}

// Función para obtener la asignación actual del conductor
async function getCurrentAssignmentId(driverId: number) {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        driverId: driverId,
        status: 'IN_PROGRESS'
      },
      select: { id: true }
    })
    return assignment?.id
  } catch (error) {
    console.error('Error getting current assignment:', error)
    return null
  }
}

export async function POST(request: NextRequest, { params }: { params: { driverId: string } }) {
  try {
    const driverId = Number.parseInt(params.driverId)
    const { latitude, longitude, assignmentId } = await request.json()

    if (isNaN(driverId)) {
      return NextResponse.json({ error: "ID de conductor inválido" }, { status: 400 })
    }

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Latitud y longitud son requeridas" }, { status: 400 })
    }

    // Verificar que el conductor existe
    const driver = await getDriverInfo(driverId)
    if (!driver) {
      return NextResponse.json({ error: "Conductor no encontrado" }, { status: 404 })
    }

    // Guardar en cache temporal
    const locationData: LocationData = {
      latitude,
      longitude,
      timestamp: new Date(),
      assignmentId: assignmentId || await getCurrentAssignmentId(driverId),
      status: 'active',
      driverName: `${driver.name} ${driver.lastname}`
    }

    locationCache.set(driverId.toString(), locationData)

    // Auto-limpiar cache después de 10 minutos de inactividad
    setTimeout(() => {
      const cached = locationCache.get(driverId.toString())
      if (cached && Date.now() - cached.timestamp.getTime() > 600000) {
        locationCache.delete(driverId.toString())
        console.log(`🗑️ Cache cleared for driver ${driverId} - inactive for 10+ minutes`)
      }
    }, 600000)

    console.log(`📍 Location update for driver ${driverId}:`, {
      latitude,
      longitude,
      timestamp: locationData.timestamp,
      driver: locationData.driverName,
      assignmentId: locationData.assignmentId
    })

    return NextResponse.json({
      success: true,
      message: "Ubicación actualizada correctamente",
      cached: true
    })
  } catch (error) {
    console.error("Error updating driver location:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// Endpoint para obtener ubicaciones activas (para admin)
export async function GET(request: NextRequest, { params }: { params: { driverId: string } }) {
  try {
    const driverId = params.driverId
    
    if (driverId === 'all') {
      // Retornar todas las ubicaciones activas
      const activeLocations = Array.from(locationCache.entries())
        .filter(([_, data]) => data.status === 'active')
        .map(([driverId, data]) => ({
          driverId: Number(driverId),
          ...data,
          timeSinceUpdate: Date.now() - data.timestamp.getTime()
        }))

      return NextResponse.json({
        success: true,
        locations: activeLocations,
        total: activeLocations.length
      })
    } else {
      // Retornar ubicación específica del conductor
      const location = locationCache.get(driverId)
      
      if (!location) {
        return NextResponse.json({ error: "Ubicación no encontrada" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        location: {
          ...location,
          timeSinceUpdate: Date.now() - location.timestamp.getTime()
        }
      })
    }
  } catch (error) {
    console.error("Error getting driver location:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
