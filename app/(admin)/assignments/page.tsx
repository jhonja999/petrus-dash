"use client"

import { useAssignments } from "@/hooks/useAssignments"
import { useTruckState } from "@/hooks/useTruckState"
import { useAuth } from "@/hooks/useAuth"
import { AssignmentForm } from "@/components/AssignmentForm"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import axios from "axios"

export default function AssignmentsPage() {
  // Add mounted state to prevent SSR issues
  const [mounted, setMounted] = useState(false)
  const [drivers, setDrivers] = useState([])
  const router = useRouter()

  // Initialize hooks conditionally after mounting
  const authData = mounted ? useAuth() : { isAdmin: false, isLoading: true }
  const assignmentsData = mounted ? useAssignments() : { assignments: [], loading: true, setAssignments: () => {} }
  const trucksData = mounted ? useTruckState() : { trucks: [] }

  const { isAdmin, isLoading } = authData
  const { assignments, loading: assignmentsLoading, setAssignments } = assignmentsData
  const { trucks } = trucksData

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      router.push("/unauthorized")
    }
  }, [isAdmin, isLoading, router, mounted])

  useEffect(() => {
    if (!mounted) return
    
    const fetchDrivers = async () => {
      try {
        const response = await axios.get("/api/users?role=conductor")
        setDrivers(response.data)
      } catch (error) {
        console.error("Error fetching drivers:", error)
      }
    }
    fetchDrivers()
  }, [mounted])

  const handleAssignmentSuccess = () => {
    // Refresh assignments
    window.location.reload()
  }

  // If not mounted yet, render a minimal placeholder
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isLoading || assignmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Asignaciones</h1>
              <p className="text-sm text-gray-600">Asignar camiones y combustible a conductores</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/admin/dashboard">Volver</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <AssignmentForm trucks={trucks} drivers={drivers} onSuccess={handleAssignmentSuccess} />
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Asignaciones Recientes ({assignments.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Camión</TableHead>
                      <TableHead>Conductor</TableHead>
                      <TableHead>Combustible</TableHead>
                      <TableHead>Carga Total</TableHead>
                      <TableHead>Remanente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.slice(0, 10).map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.truck?.placa || "N/A"}</TableCell>
                        <TableCell>
                          {assignment.driver ? `${assignment.driver.name} ${assignment.driver.lastname}` : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{assignment.fuelType}</Badge>
                        </TableCell>
                        <TableCell>{assignment.totalLoaded.toString()}</TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          {assignment.totalRemaining.toString()}
                        </TableCell>
                        <TableCell>{new Date(assignment.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">Activa</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}