"use client"

import { useState, useEffect, useCallback } from "react"

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: any
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  enabled?: boolean
}

interface ApiResponse<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  mutate: (method?: "POST" | "PUT" | "PATCH" | "DELETE", data?: any) => Promise<T | null>
}

export function useApi<T>(endpoint: string, options: FetchOptions = {}): ApiResponse<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Build URL with query parameters
      let url = endpoint
      if (options.queryParams) {
        const params = new URLSearchParams()
        Object.entries(options.queryParams).forEach(([key, value]) => {
          if (value) params.append(key, value)
        })
        url = `${url}?${params.toString()}`
      }

      // Set up request options
      const requestOptions: RequestInit = {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      }

      if (options.body && (options.method === "POST" || options.method === "PUT" || options.method === "PATCH")) {
        requestOptions.body = JSON.stringify(options.body)
      }

      const response = await fetch(url, requestOptions)

      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`

        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (e) {
          // If response is not JSON, use the status text
          console.error("Error parsing error response:", e)
        }

        throw new Error(errorMessage)
      }

      // For DELETE requests, we might not have a response body
      if (options.method === "DELETE") {
        setData(null)
        return
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      console.error(`Error fetching from ${endpoint}:`, err)
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, options.method, options.body, options.headers, options.queryParams])

  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  const mutate = async (
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    data?: any
  ): Promise<T | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      })

      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`

        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (e) {
          // If response is not JSON, use the status text
          console.error("Error parsing error response:", e)
        }

        throw new Error(errorMessage)
      }

      if (method === "DELETE") {
        setData(null)
        return null
      }

      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      console.error(`Error mutating ${endpoint}:`, err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    mutate,
  }
}
