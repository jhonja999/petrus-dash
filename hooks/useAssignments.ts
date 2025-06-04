"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import type { Assignment } from "@/types/globals";

export function useAssignments(driverId?: number, dateFilter?: string) {
  // ✅ Keep the exact same useState hooks as the original
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Keep the same useEffect structure as the original
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (driverId) params.append("driverId", driverId.toString());
        if (dateFilter) params.append("date", dateFilter);

        const url = `/api/assignments?${params.toString()}`;
        console.log("🔍 useAssignments: Fetching from:", url);

        const response = await axios.get(url);

        // ✅ FIX: Handle the new API response format
        const data = response.data;

        if (data && data.assignments && Array.isArray(data.assignments)) {
          // New format: {assignments: [...], pagination: {...}}
          setAssignments(data.assignments);
          console.log(
            `✅ useAssignments: Loaded ${data.assignments.length} assignments from paginated response`
          );
        } else if (Array.isArray(data)) {
          // Fallback: direct array (in case the API still returns the old format sometimes)
          setAssignments(data);
          console.log(
            `✅ useAssignments: Loaded ${data.length} assignments from direct array`
          );
        } else {
          console.warn("⚠️ useAssignments: Unexpected response format:", data);
          setAssignments([]);
        }
      } catch (err) {
        console.error("❌ useAssignments: Error fetching assignments:", err);
        setError("Error fetching assignments");
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [driverId, dateFilter]);

  // ✅ Keep the same refreshAssignments function structure as the original
  const refreshAssignments = async () => {
    setLoading(true);
    try {
      setError(null);

      const params = new URLSearchParams();
      if (driverId) params.append("driverId", driverId.toString());
      if (dateFilter) params.append("date", dateFilter);

      const url = `/api/assignments?${params.toString()}`;
      const response = await axios.get(url);

      // ✅ FIX: Handle the new API response format
      const data = response.data;

      if (data && data.assignments && Array.isArray(data.assignments)) {
        // New format: {assignments: [...], pagination: {...}}
        setAssignments(data.assignments);
        console.log(
          `✅ useAssignments: Refreshed ${data.assignments.length} assignments from paginated response`
        );
      } else if (Array.isArray(data)) {
        // Fallback: direct array (in case the API still returns the old format sometimes)
        setAssignments(data);
        console.log(
          `✅ useAssignments: Refreshed ${data.length} assignments from direct array`
        );
      } else {
        console.warn(
          "⚠️ useAssignments: Unexpected response format on refresh:",
          data
        );
        setAssignments([]);
      }
    } catch (err) {
      console.error("❌ useAssignments: Error refreshing assignments:", err);
      setError("Error refreshing assignments");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Return the exact same interface as the original hook
  return { assignments, loading, error, setAssignments, refreshAssignments };
}
