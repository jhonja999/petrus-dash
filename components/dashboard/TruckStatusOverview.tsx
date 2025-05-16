"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Loader2 } from "lucide-react"

type TruckState = "Activo" | "Inactivo" | "Mantenimiento" | "Transito" | "Descarga" | "Asignado"

type Truck = {
  id: number
  placa: string
  typefuel: string
  capacitygal: number
  state: TruckState
}

type StatusCount = {
  name: TruckState
  value: number
  color: string
}

// Define colors for each status with a more modern palette
const statusColors: Record<TruckState, string> = {
  Activo: "#10b981", // emerald-500
  Inactivo: "#f87171", // red-400
  Mantenimiento: "#f59e0b", // amber-500
  Transito: "#60a5fa", // blue-400
  Descarga: "#a78bfa", // violet-400
  Asignado: "#06b6d4", // cyan-500
}

export function TruckStatusOverview() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [chartData, setChartData] = useState<StatusCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrucks = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/trucks")

        if (!response.ok) {
          throw new Error(`Error al obtener datos: ${response.status}`)
        }

        const data = await response.json()
        setTrucks(data)
      } catch (err) {
        console.error("Error fetching truck data:", err)
        setError("Error al cargar los datos. Por favor, intente nuevamente.")
      } finally {
        setLoading(false)
      }
    }

    fetchTrucks()
  }, [])

  useEffect(() => {
    if (trucks.length === 0) {
      setChartData([])
      return
    }

    // Count trucks by status
    const statusCounts: Record<string, number> = {}

    trucks.forEach((truck) => {
      if (!statusCounts[truck.state]) {
        statusCounts[truck.state] = 0
      }
      statusCounts[truck.state]++
    })

    // Convert to chart data format
    const data: StatusCount[] = Object.keys(statusCounts).map((status) => ({
      name: status as TruckState,
      value: statusCounts[status],
      color: statusColors[status as TruckState] || "#cbd5e1", // Default color if status not in map
    }))

    setChartData(data)
  }, [trucks])

  if (loading) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center">
        <p className="text-muted-foreground">No hay datos disponibles</p>
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={90}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} camiones`, ""]} />
          <Legend layout="vertical" verticalAlign="middle" align="right" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
