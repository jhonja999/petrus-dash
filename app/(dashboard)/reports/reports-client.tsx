"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { FuelConsumptionChart } from "@/components/dashboard/FuelConsumptionChart"
import { FileDown, Printer } from "lucide-react"
import { subMonths } from "date-fns"
import type { DateRange } from "react-day-picker"

export function ReportsClient() {
  // Update the state type to match DateRange
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  })

  const handleExportPDF = () => {
    // Implement PDF export
    alert("Exportar a PDF - Funcionalidad pendiente de implementar")
  }

  const handleExportExcel = () => {
    // Implement Excel export
    alert("Exportar a Excel - Funcionalidad pendiente de implementar")
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Reportes</CardTitle>
              <CardDescription>Genera reportes de consumo de combustible, descargas y más.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handleExportPDF}>
                  <FileDown className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="consumption" className="space-y-4">
            <TabsList>
              <TabsTrigger value="consumption">Consumo de Combustible</TabsTrigger>
              <TabsTrigger value="trucks">Estado de Camiones</TabsTrigger>
              <TabsTrigger value="customers">Clientes</TabsTrigger>
            </TabsList>

            <TabsContent value="consumption" className="space-y-4">
              <FuelConsumptionChart />
            </TabsContent>

            <TabsContent value="trucks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Reporte de Camiones</CardTitle>
                  <CardDescription>
                    Visualiza el estado y uso de los camiones en el período seleccionado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Funcionalidad pendiente de implementar.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Reporte de Clientes</CardTitle>
                  <CardDescription>
                    Visualiza el consumo de combustible por cliente en el período seleccionado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Funcionalidad pendiente de implementar.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
