"use client"

import React from "react"

import { useCallback, useRef } from "react"

interface StatusChangeDetectorOptions {
  onAssignmentComplete?: () => void
  onTruckStatusChange?: () => void
}

// Global debounce to prevent multiple simultaneous calls
let globalDebounceTimeout: NodeJS.Timeout | null = null

export function useStatusChangeDetector(options: StatusChangeDetectorOptions = {}) {
  const { onAssignmentComplete, onTruckStatusChange } = options
  const isProcessingRef = useRef(false)
  const mountedRef = useRef(true)

  // Debounced refresh function
  const debouncedRefresh = useCallback(async (action: () => Promise<void>, delay = 1000) => {
    if (globalDebounceTimeout) {
      clearTimeout(globalDebounceTimeout)
    }

    globalDebounceTimeout = setTimeout(async () => {
      if (mountedRef.current && !isProcessingRef.current) {
        await action()
      }
    }, delay)
  }, [])

  // Trigger refresh when assignment is completed
  const onAssignmentCompleted = useCallback(async () => {
    console.log("🎯 Assignment completed event triggered")

    await debouncedRefresh(async () => {
      isProcessingRef.current = true
      try {
        // Only call the callback, don't make API calls here
        onAssignmentComplete?.()
        console.log("✅ Assignment completion handled")
      } catch (error) {
        console.error("Error handling assignment completion:", error)
      } finally {
        isProcessingRef.current = false
      }
    })
  }, [debouncedRefresh, onAssignmentComplete])

  // Trigger refresh when truck status changes
  const onTruckStateChanged = useCallback(async () => {
    console.log("🚛 Truck status change event triggered")

    await debouncedRefresh(async () => {
      isProcessingRef.current = true
      try {
        // Only call the callback, don't make API calls here
        onTruckStatusChange?.()
        console.log("✅ Truck status change handled")
      } catch (error) {
        console.error("Error handling truck status change:", error)
      } finally {
        isProcessingRef.current = false
      }
    })
  }, [debouncedRefresh, onTruckStatusChange])

  // Manual refresh for user-triggered actions
  const manualRefresh = useCallback(async () => {
    if (isProcessingRef.current) {
      console.log("🚫 Manual refresh skipped - already processing")
      return
    }

    console.log("👤 Manual refresh triggered")
    // Return a function that the component can call with its own refresh logic
    return true
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      mountedRef.current = false
      if (globalDebounceTimeout) {
        clearTimeout(globalDebounceTimeout)
        globalDebounceTimeout = null
      }
    }
  }, [])

  return {
    onAssignmentCompleted,
    onTruckStateChanged,
    manualRefresh,
  }
}
