"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TruckTable } from "@/components/TruckTable"
import { useToast } from "@/hooks/use-toast"
import { useTruckState } from "@/hooks/useTruckState"
import Link from "next/link"
import { Plus, RefreshCw } from "lucide-react"
import type { Truck } from "@/types/globals"
import axios from "axios"

export default function TrucksPage() {
  const { trucks, loading, error, refreshTrucks, updateTruckState } = useTruckState()
  const [filteredTrucks, setFilteredTrucks] = useState<Truck[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const isAdmin = true // Assuming isAdmin is always true for this component

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTrucks(trucks)
    } else {
      const filtered = trucks.filter(
        (truck: Truck) =>
          truck.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
          truck.typefuel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          truck.state.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredTrucks(filtered)
    }
  }, [trucks, searchTerm])

  // Add this useEffect after the existing ones
  useEffect(() => {
    if (!mounted || !isAdmin) return

    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(() => {
      console.log("🔄 Auto-refreshing trucks data...")
      refreshTrucks()
    }, 30000)

    return () => clearInterval(interval)
  }, [mounted, isAdmin, refreshTrucks])

  const handleRefreshStatus = async () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    console.log("👤 Manual status refresh initiated")

    try {
      const response = await axios.post("/api/trucks/refresh-status")
      toast({
        title: "Estados actualizados",
        description: response.data.message,
      })
      await refreshTrucks()

      // Force additional refresh after 2 seconds to catch any delayed updates
      setTimeout(() => {
        refreshTrucks()
      }, 2000)

      console.log("✅ Status refresh completed")
    } catch (error) {
      console.error("Error refreshing truck status:", error)
      toast({
        title: "Error",
        description: "Error al actualizar estados de camiones",
        variant: "destructive",
      })
    } finally {
      setTimeout(() => {
        setIsRefreshing(false)
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Camiones</h1>
              <p className="text-sm text-gray-600">Administra la flota de vehículos</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                variant="outline"
                className="transition-all duration-200"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Actualizando..." : "Actualizar Estados"}
              </Button>
              <Button asChild>
                <Link href="/trucks/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Camión
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Volver</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Camiones ({filteredTrucks.length})</h2>
            <div className="flex items-center space-x-4">
              <Input
                placeholder="Buscar por placa, combustible o estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando camiones...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <p>Error: {error}</p>
                <Button onClick={refreshTrucks} className="mt-4" variant="outline">
                  Reintentar
                </Button>
              </div>
            ) : (
              <TruckTable
                trucks={filteredTrucks}
                onUpdateState={updateTruckState}
                onRefreshTrucks={refreshTrucks}
                isAdmin={true}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
