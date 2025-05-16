"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { format, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2 } from "lucide-react"
import type { DateRange } from "react-day-picker"

// Define types for our data
type DischargeData = {
  id: number
  assignmentId: number
  customerId: number
  totalDischarged: number
  createdAt: string
  assignment: {
    fuelType: string
    truck: {
      placa: string
    }
    driver: {
      name: string
      lastname: string
    }
  }
  customer: {
    companyname: string
  }
}

type ChartData = {
  name: string
  DIESEL_B5?: number
  GASOLINA_90?: number
  GASOLINA_95?: number
  GLP?: number
  ELECTRICA?: number
}

export function FuelConsumptionChart() {
  const [discharges, setDischarges] = useState<DischargeData[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"month" | "week" | "day">("month")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  })

  // Fetch discharge data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Format dates for API query
        const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined
        const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined

        const queryParams = new URLSearchParams()
        if (startDate) queryParams.append("startDate", startDate)
        if (endDate) queryParams.append("endDate", endDate)

        const response = await fetch(`/api/discharges?${queryParams.toString()}`)

        if (!response.ok) {
          throw new Error(`Error al obtener datos: ${response.status}`)
        }

        const data = await response.json()
        setDischarges(data)
      } catch (err) {
        console.error("Error fetching discharge data:", err)
        setError("Error al cargar los datos. Por favor, intente nuevamente.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange])

  // Process data for chart
  useEffect(() => {
    if (discharges.length === 0) {
      setChartData([])
      return
    }

    // Group discharges by time period and fuel type
    const groupedData: Record<string, Record<string, number>> = {}

    discharges.forEach((discharge) => {
      const date = new Date(discharge.createdAt)
      let periodKey: string

      // Format the period key based on selected time range
      switch (timeRange) {
        case "day":
          periodKey = format(date, "yyyy-MM-dd")
          break
        case "week":
          // Get the week number and year
          const weekNumber = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)
          periodKey = `${format(date, "MMM yyyy", { locale: es })} S${weekNumber}`
          break
        case "month":
        default:
          periodKey = format(date, "MMM yyyy", { locale: es })
          break
      }

      // Initialize period if not exists
      if (!groupedData[periodKey]) {
        groupedData[periodKey] = {}
      }

      const fuelType = discharge.assignment.fuelType

      // Add discharge amount to the fuel type
      if (!groupedData[periodKey][fuelType]) {
        groupedData[periodKey][fuelType] = 0
      }

      groupedData[periodKey][fuelType] += Number(discharge.totalDischarged)
    })

    // Convert grouped data to chart format
    const formattedData: ChartData[] = Object.keys(groupedData)
      .sort((a, b) => {
        // Sort by date for proper chronological order
        if (timeRange === "day") {
          return new Date(a).getTime() - new Date(b).getTime()
        } else if (timeRange === "week") {
          // Extract month and week for comparison
          const [monthYearA, weekA] = a.split(" S")
          const [monthYearB, weekB] = b.split(" S")
          const dateA = new Date(monthYearA)
          const dateB = new Date(monthYearB)

          if (dateA.getFullYear() !== dateB.getFullYear()) {
            return dateA.getFullYear() - dateB.getFullYear()
          }
          if (dateA.getMonth() !== dateB.getMonth()) {
            return dateA.getMonth() - dateB.getMonth()
          }
          return Number(weekA) - Number(weekB)
        } else {
          // For months, convert to date objects for comparison
          const dateA = new Date(a)
          const dateB = new Date(b)
          return dateA.getTime() - dateB.getTime()
        }
      })
      .map((period) => {
        return {
          name: period,
          ...groupedData[period],
        }
      })

    setChartData(formattedData)
  }, [discharges, timeRange])

  // Handle date range change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Consumo de Combustible</CardTitle>
          <CardDescription>Galones despachados por tipo de combustible</CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <DatePickerWithRange date={dateRange} onDateChange={handleDateRangeChange} />
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as "month" | "week" | "day")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Agrupar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensual</SelectItem>
              <SelectItem value="week">Semanal</SelectItem>
              <SelectItem value="day">Diario</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="h-[400px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-destructive">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No hay datos disponibles para el período seleccionado</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 70,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
              <YAxis
                label={{
                  value: "Galones",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle" },
                }}
              />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} gal`, ""]} />
              <Legend />
              <Bar dataKey="DIESEL_B5" name="Diesel B5" fill="#3b82f6" />
              <Bar dataKey="GASOLINA_90" name="Gasolina 90" fill="#f59e0b" />
              <Bar dataKey="GASOLINA_95" name="Gasolina 95" fill="#8b5cf6" />
              <Bar dataKey="GLP" name="GLP" fill="#10b981" />
              <Bar dataKey="ELECTRICA" name="Eléctrica" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
