import { DashboardStats } from "@/components/dashboard/DashboardStats"
import { FuelConsumptionChart } from "@/components/dashboard/FuelConsumptionChart"
import { RecentDischarges } from "@/components/dashboard/RecentDischarges"
import { TruckStatusOverview } from "@/components/dashboard/TruckStatusOverview"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Tabs defaultValue="today" className="w-[400px]">
          <TabsList>
            <TabsTrigger value="today">Hoy</TabsTrigger>
            <TabsTrigger value="week">Esta Semana</TabsTrigger>
            <TabsTrigger value="month">Este Mes</TabsTrigger>
            <TabsTrigger value="year">Este Año</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DashboardStats />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Consumo de Combustible</CardTitle>
            <CardDescription>Análisis de consumo de combustible por tipo y período</CardDescription>
          </CardHeader>
          <CardContent>
            <FuelConsumptionChart />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Estado de Camiones</CardTitle>
            <CardDescription>Distribución del estado actual de los camiones</CardDescription>
          </CardHeader>
          <CardContent>
            <TruckStatusOverview />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Despachos Recientes</CardTitle>
          <CardDescription>Últimos despachos realizados en los últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentDischarges />
        </CardContent>
      </Card>
    </div>
  )
}
