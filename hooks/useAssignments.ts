"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import type { Assignment } from "@/types/globals"

export function useAssignments(driverId?: number, dateFilter?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const params = new URLSearchParams()
        if (driverId) params.append("driverId", driverId.toString())
        if (dateFilter) params.append("date", dateFilter)

        const url = `/api/assignments?${params.toString()}`
        const response = await axios.get(url)
        setAssignments(response.data)
      } catch (err) {
        setError("Error fetching assignments")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [driverId, dateFilter])

  const refreshAssignments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (driverId) params.append("driverId", driverId.toString())
      if (dateFilter) params.append("date", dateFilter)

      const url = `/api/assignments?${params.toString()}`
      const response = await axios.get(url)
      setAssignments(response.data)
    } catch (err) {
      setError("Error refreshing assignments")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return { assignments, loading, error, setAssignments, refreshAssignments }
}
