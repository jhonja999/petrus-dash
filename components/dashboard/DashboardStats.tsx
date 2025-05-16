"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Users, Building2, Fuel, Loader2 } from "lucide-react"

type DashboardStat = {
  title: string
  value: string
  icon: React.ElementType
  change?: string
  changeType?: "increase" | "decrease" | "neutral"
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch trucks count
        const trucksPromise = fetch("/api/trucks")
          .then((res) => res.json())
          .then((data) => data.length)

        // Fetch customers count
        const customersPromise = fetch("/api/customers")
          .then((res) => res.json())
          .then((data) => data.length)

        // Fetch drivers count (users with role Conductor)
        const driversPromise = fetch("/api/users?role=Conductor")
          .then((res) => res.json())
          .then((data) => data.length)
          .catch(() => 0) // If API not implemented yet

        // Fetch today's discharges
        const today = new Date().toISOString().split("T")[0]
        const dischargesPromise = fetch(`/api/discharges?startDate=${today}&endDate=${today}`)
          .then((res) => res.json())
          .then((data) => data.length)

        // Wait for all promises to resolve
        const [trucksCount, customersCount, driversCount, dischargesCount] = await Promise.all([
          trucksPromise,
          customersPromise,
          driversPromise,
          dischargesPromise,
        ])

        // Create stats array
        const newStats: DashboardStat[] = [
          {
            title: "Total Camiones",
            value: trucksCount.toString(),
            icon: Truck,
          },
          {
            title: "Total Clientes",
            value: customersCount.toString(),
            icon: Building2,
          },
          {
            title: "Conductores",
            value: driversCount.toString(),
            icon: Users,
          },
          {
            title: "Despachos Hoy",
            value: dischargesCount.toString(),
            icon: Fuel,
          },
        ]

        setStats(newStats)
      } catch (err) {
        console.error("Error fetching dashboard stats:", err)
        setError("Error al cargar las estadísticas")

        // Set default stats in case of error
        setStats([
          {
            title: "Total Camiones",
            value: "0",
            icon: Truck,
          },
          {
            title: "Total Clientes",
            value: "0",
            icon: Building2,
          },
          {
            title: "Conductores",
            value: "0",
            icon: Users,
          },
          {
            title: "Despachos Hoy",
            value: "0",
            icon: Fuel,
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 opacity-50">
              <CardTitle className="text-sm font-medium">Cargando...</CardTitle>
            </CardHeader>
            <CardContent className="opacity-50">
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.change && (
              <p
                className={`text-xs ${
                  stat.changeType === "increase"
                    ? "text-green-500"
                    : stat.changeType === "decrease"
                      ? "text-red-500"
                      : "text-muted-foreground"
                }`}
              >
                {stat.change}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
