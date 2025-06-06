"use client"

import React from "react"

import { useState, useCallback, useRef } from "react"
import axios from "axios"
import type { Truck } from "@/types/globals"

interface UseRealTimeStatusOptions {
  refreshTimeout?: number
}

interface RefreshResponse {
  success: boolean
  message: string
  updatedCount?: number
}

// Global flag to prevent multiple instances
let globalRefreshInProgress = false

export function useRealTimeStatus(options: UseRealTimeStatusOptions = {}) {
  const { refreshTimeout = 3000 } = options

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Clear any existing timeout
  const clearRefreshTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Set refresh state with auto-reset
  const setRefreshingWithTimeout = useCallback(() => {
    if (!mountedRef.current) return

    setIsRefreshing(true)
    clearRefreshTimeout()

    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setIsRefreshing(false)
        globalRefreshInProgress = false
      }
    }, refreshTimeout)
  }, [refreshTimeout, clearRefreshTimeout])

  const refreshTruckStatus = useCallback(async (): Promise<RefreshResponse> => {
    if (globalRefreshInProgress || !mountedRef.current) {
      console.log("🚫 Refresh already in progress or component unmounted")
      return { success: false, message: "Refresh already in progress" }
    }

    globalRefreshInProgress = true
    setRefreshingWithTimeout()
    setError(null)

    try {
      const response = await axios.post("/api/trucks/refresh-status")
      if (mountedRef.current) {
        setLastRefresh(new Date())
      }
      return {
        success: true,
        message: response.data.message,
        updatedCount: response.data.updatedCount,
      }
    } catch (err) {
      const errorMessage = "Error al actualizar estados de camiones"
      if (mountedRef.current) {
        setError(errorMessage)
      }
      console.error(err)
      return {
        success: false,
        message: errorMessage,
      }
    } finally {
      globalRefreshInProgress = false
    }
  }, [setRefreshingWithTimeout])

  const refreshTruckData = useCallback(async (): Promise<Truck[]> => {
    if (globalRefreshInProgress || !mountedRef.current) {
      console.log("🚫 Data refresh skipped - already in progress or unmounted")
      return []
    }

    globalRefreshInProgress = true
    setRefreshingWithTimeout()
    setError(null)

    try {
      const response = await axios.get("/api/trucks")
      if (mountedRef.current) {
        setLastRefresh(new Date())
      }
      return response.data
    } catch (err) {
      const errorMessage = "Error al obtener datos de camiones"
      if (mountedRef.current) {
        setError(errorMessage)
      }
      console.error(err)
      return []
    } finally {
      globalRefreshInProgress = false
    }
  }, [setRefreshingWithTimeout])

  const refreshAssignmentData = useCallback(async () => {
    if (globalRefreshInProgress || !mountedRef.current) {
      console.log("🚫 Assignment refresh skipped - already in progress or unmounted")
      return []
    }

    globalRefreshInProgress = true
    setRefreshingWithTimeout()
    setError(null)

    try {
      const response = await axios.get("/api/assignments")
      if (mountedRef.current) {
        setLastRefresh(new Date())
      }
      return response.data
    } catch (err) {
      const errorMessage = "Error al obtener datos de asignaciones"
      if (mountedRef.current) {
        setError(errorMessage)
      }
      console.error(err)
      return []
    } finally {
      globalRefreshInProgress = false
    }
  }, [setRefreshingWithTimeout])

  // Clean up on unmount
  const cleanup = useCallback(() => {
    mountedRef.current = false
    clearRefreshTimeout()
    globalRefreshInProgress = false
  }, [clearRefreshTimeout])

  // Set unmounted flag on cleanup
  React.useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    isRefreshing,
    lastRefresh,
    error,
    refreshTruckStatus,
    refreshTruckData,
    refreshAssignmentData,
    cleanup,
  }
}
