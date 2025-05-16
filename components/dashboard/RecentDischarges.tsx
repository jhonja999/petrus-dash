"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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

export function RecentDischarges() {
  const [discharges, setDischarges] = useState<DischargeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDischarges = async () => {
      setLoading(true)
      setError(null)
      try {
        // Get only recent discharges (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const startDate = format(sevenDaysAgo, "yyyy-MM-dd")
        const response = await fetch(`/api/discharges?startDate=${startDate}`)

        if (!response.ok) {
          throw new Error(`Error al obtener datos: ${response.status}`)
        }

        const data = await response.json()
        // Sort by date (newest first) and limit to 10
        const sortedData = data
          .sort(
            (a: DischargeData, b: DischargeData) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 10)

        setDischarges(sortedData)
      } catch (err) {
        console.error("Error fetching discharge data:", err)
        setError("Error al cargar los datos. Por favor, intente nuevamente.")
      } finally {
        setLoading(false)
      }
    }

    fetchDischarges()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (discharges.length === 0) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center">
        <p className="text-muted-foreground">No hay descargas recientes</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Camión</TableHead>
            <TableHead>Conductor</TableHead>
            <TableHead className="text-right">Galones</TableHead>
            <TableHead>Combustible</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discharges.map((discharge) => (
            <TableRow key={discharge.id}>
              <TableCell>{format(new Date(discharge.createdAt), "dd/MM/yyyy", { locale: es })}</TableCell>
              <TableCell>{discharge.customer.companyname}</TableCell>
              <TableCell>{discharge.assignment.truck.placa}</TableCell>
              <TableCell>{`${discharge.assignment.driver.name} ${discharge.assignment.driver.lastname}`}</TableCell>
              <TableCell className="text-right">{Number(discharge.totalDischarged).toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant="outline">{discharge.assignment.fuelType}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
