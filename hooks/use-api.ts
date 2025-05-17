"use client"

import { useState, useEffect } from "react"

interface UseApiOptions {
  queryParams?: Record<string, string>
  enabled?: boolean
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  dedupingInterval?: number
}

// Create a simple cache
const cache: Record<string, { data: any; timestamp: number }> = {}

export function useApi<T>(
  url: string,
  options: UseApiOptions = {
    enabled: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000, // 5 seconds
  },
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Build the full URL with query parameters
  const queryString = options.queryParams
    ? "?" +
      Object.entries(options.queryParams)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&")
    : ""
  const fullUrl = `${url}${queryString}`

  // Function to fetch data
  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if we have a valid cached response
      const now = Date.now()
      const cachedResponse = cache[fullUrl]
      if (cachedResponse && now - cachedResponse.timestamp < (options.dedupingInterval || 5000)) {
        setData(cachedResponse.data)
        setIsLoading(false)
        return
      }

      const response = await fetch(fullUrl)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result)

      // Cache the response
      cache[fullUrl] = {
        data: result,
        timestamp: now,
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // Function to refetch data
  const refetch = () => {
    // Remove from cache to force a fresh fetch
    delete cache[fullUrl]
    fetchData()
  }

  useEffect(() => {
    if (options.enabled !== false) {
      fetchData()
    } else {
      setIsLoading(false)
    }

    // Set up event listeners for revalidation
    const handleFocus = () => {
      if (options.revalidateOnFocus) {
        refetch()
      }
    }

    const handleReconnect = () => {
      if (options.revalidateOnReconnect) {
        refetch()
      }
    }

    if (options.revalidateOnFocus) {
      window.addEventListener("focus", handleFocus)
    }

    if (options.revalidateOnReconnect) {
      window.addEventListener("online", handleReconnect)
    }

    return () => {
      if (options.revalidateOnFocus) {
        window.removeEventListener("focus", handleFocus)
      }
      if (options.revalidateOnReconnect) {
        window.removeEventListener("online", handleReconnect)
      }
    }
  }, [fullUrl, options.enabled, options.revalidateOnFocus, options.revalidateOnReconnect])

  return { data, isLoading, error, refetch }
}
