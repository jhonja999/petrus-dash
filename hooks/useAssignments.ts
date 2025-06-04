"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import type { Assignment } from "@/types/globals";

export function useAssignments(driverId?: number, dateFilter?: string) {
  // ✅ Mantener los mismos hooks useState que el original
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Mantener la misma estructura useEffect que el original
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (driverId) params.append("driverId", driverId.toString());
        if (dateFilter) params.append("date", dateFilter);

        const url = `/api/assignments?${params.toString()}`;
        console.log("🔍 useAssignments: Obteniendo desde:", url);

        const response = await axios.get(url);

        // ✅ FIX: Manejar el nuevo formato de respuesta de la API
        const data = response.data;

        if (data && data.assignments && Array.isArray(data.assignments)) {
          // Nuevo formato: {assignments: [...], pagination: {...}}
          setAssignments(data.assignments);
          console.log(
            `✅ useAssignments: Cargadas ${data.assignments.length} asignaciones desde respuesta paginada`
          );
        } else if (Array.isArray(data)) {
          // Respaldo: array directo (en caso de que la API aún retorne el formato antiguo a veces)
          setAssignments(data);
          console.log(
            `✅ useAssignments: Cargadas ${data.length} asignaciones desde array directo`
          );
        } else {
          console.warn("⚠️ useAssignments: Formato de respuesta inesperado:", data);
          setAssignments([]);
        }
      } catch (err) {
        console.error("❌ useAssignments: Error al obtener asignaciones:", err);
        setError("Error al obtener asignaciones");
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [driverId, dateFilter]);

  // ✅ Mantener la misma estructura de función refreshAssignments que el original
  const refreshAssignments = async () => {
    setLoading(true);
    try {
      setError(null);

      const params = new URLSearchParams();
      if (driverId) params.append("driverId", driverId.toString());
      if (dateFilter) params.append("date", dateFilter);

      const url = `/api/assignments?${params.toString()}`;
      const response = await axios.get(url);

      // ✅ FIX: Manejar el nuevo formato de respuesta de la API
      const data = response.data;

      if (data && data.assignments && Array.isArray(data.assignments)) {
        // Nuevo formato: {assignments: [...], pagination: {...}}
        setAssignments(data.assignments);
        console.log(
          `✅ useAssignments: Actualizadas ${data.assignments.length} asignaciones desde respuesta paginada`
        );
      } else if (Array.isArray(data)) {
        // Respaldo: array directo (en caso de que la API aún retorne el formato antiguo a veces)
        setAssignments(data);
        console.log(
          `✅ useAssignments: Actualizadas ${data.length} asignaciones desde array directo`
        );
      } else {
        console.warn(
          "⚠️ useAssignments: Formato de respuesta inesperado al actualizar:",
          data
        );
        setAssignments([]);
      }
    } catch (err) {
      console.error("❌ useAssignments: Error al actualizar asignaciones:", err);
      setError("Error al actualizar asignaciones");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Retornar exactamente la misma interfaz que el hook original
  return { assignments, loading, error, setAssignments, refreshAssignments };
}