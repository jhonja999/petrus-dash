"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import type { Truck } from "@/types/globals"

export function useTruckState() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const response = await axios.get("/api/trucks")
        setTrucks(response.data)
      } catch (err) {
        setError("Error al obtener camiones")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

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

  const refreshTrucks = async () => {
    setLoading(true)
    try {
      const response = await axios.get("/api/trucks")
      setTrucks(response.data)
    } catch (err) {
      setError("Error al actualizar camiones")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return { trucks, loading, error, updateTruckState, setTrucks, refreshTrucks }
}
