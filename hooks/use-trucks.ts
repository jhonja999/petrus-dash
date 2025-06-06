"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import type { Truck } from "@/types/globals"

export function useTrucks() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrucks = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get("/api/trucks")
      setTrucks(response.data)
      return response.data
    } catch (err) {
      setError("Error al obtener camiones")
      console.error(err)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTrucks()
  }, [])

  const updateTruckState = async (truckId: number, newState: string) => {
    try {
      await axios.put(`/api/trucks/${truckId}`, { state: newState })
      setTrucks((prev) => prev.map((truck) => (truck.id === truckId ? { ...truck, state: newState as any } : truck)))
      return true
    } catch (err) {
      setError("Error al actualizar estado del camión")
      console.error(err)
      return false
    }
  }

  const refresh = async () => {
    return await fetchTrucks()
  }

  return { trucks, isLoading, error, updateTruckState, setTrucks, refresh }
}
