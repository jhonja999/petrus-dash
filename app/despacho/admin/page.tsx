"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Calendar, Search, Filter } from "lucide-react";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import type { Discharge, Assignment, User } from "@/types/globals.d";
import { useAuth } from "@/contexts/AuthContext";

export default function DespachoAdminPage() {
  // Fecha formateada para evitar SSR hydration mismatch
  const [todayFormatted, setTodayFormatted] = useState<string>("");
  useEffect(() => {
    setTodayFormatted(new Date().toLocaleDateString());
  }, []);
  // Toast para feedback
  const { toast } = require("@/hooks/use-toast");
  // Estado para el botón de completar
  const [isCompleting, setIsCompleting] = useState<number | null>(null);

  // Completar asignación con confirmación y evidencia
  const completeAssignment = async (assignmentId: number) => {
    if (!window.confirm("¿Está seguro que desea completar esta asignación? Esta acción no se puede deshacer.")) {
      return;
    }
    setIsCompleting(assignmentId);
    try {
      // Verifica que haya al menos una evidencia
      const res = await axios.get(`/api/assignments/upload-images?assignmentId=${assignmentId}&type=evidence`);
      if (!res.data.images || res.data.images.length === 0) {
        toast({
          title: "❌ Error",
          description: "Debes subir al menos una evidencia antes de completar la asignación.",
          variant: "destructive"
        });
        setIsCompleting(null);
        return;
      }
      // Completa la asignación en la base de datos usando el endpoint correcto
      await axios.post(`/api/assignments/${assignmentId}/complete`);
      toast({
        title: "✅ Asignación completada",
        description: "La asignación #" + assignmentId + " ha sido completada exitosamente.",
        className: "border-green-200 bg-green-50"
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      let errorMsg = "No se pudo completar la asignación.";
      if (err && typeof err === 'object') {
        if ('response' in err && err.response && (err.response as any)?.data && (err.response as any)?.data?.error) {
          errorMsg = (err.response as any)?.data?.error || errorMsg;
        } else if ('message' in err && typeof err.message === 'string') {
          errorMsg = err.message;
        }
      }
      toast({
        title: "❌ Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsCompleting(null);
    }
  };
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();

  // Verificación de autenticación de admin
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log("🔒 DespachoAdminPage: Usuario no autenticado");
        router.push("/login");
        return;
      }

      if (!isAdmin) {
        console.log(
          "🔒 DespachoAdminPage: Usuario no es admin, redirigiendo a no autorizado"
        );
        router.push("/unauthorized");
        return;
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  // Estados
  const [allDischarges, setAllDischarges] = useState<Discharge[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        console.log("🔄 Admin: Obteniendo todos los datos de despacho");

        // Auto-completar asignaciones antiguas de todos los conductores
        try {
          const driversResponse = await axios.get("/api/users?role=Operador");
          const operatorDrivers = driversResponse.data

          for (const driver of operatorDrivers) {
            try {
              await axios.post('/api/assignments/auto-complete', { 
                driverId: driver.id 
              })
            } catch (error) {
              console.log("⚠️ Auto-complete failed for driver " + driver.id);
            }
          }
          console.log("✅ Auto-completed assignments for all drivers")
        } catch (error) {
          console.log("⚠️ Failed to auto-complete assignments")
        }

        // Hacer las llamadas por separado para identificar cuál está fallando
        try {
          const dischargesResponse = await axios.get("/api/discharges")
          console.log("✅ Admin: Despachos obtenidos", dischargesResponse.data);
          
          // La API puede retornar un array directo o un objeto con discharges
          const dischargesData = Array.isArray(dischargesResponse.data) 
            ? dischargesResponse.data 
            : dischargesResponse.data.discharges || []
            
          setAllDischarges(dischargesData)
        } catch (error) {
          console.error("❌ Admin: Error al obtener despachos:", error);
          setAllDischarges([])
        }

        try {
          const assignmentsResponse = await axios.get("/api/assignments")
          console.log("✅ Admin: Asignaciones obtenidas", assignmentsResponse.data);
          
          // La API puede retornar un array directo o un objeto con assignments
          const assignmentsData = Array.isArray(assignmentsResponse.data)
            ? assignmentsResponse.data
            : assignmentsResponse.data.assignments || []
            
          setAllAssignments(assignmentsData)
        } catch (error) {
          console.error("❌ Admin: Error al obtener asignaciones:", error);
          setAllAssignments([])
        }

        try {
          const driversResponse = await axios.get("/api/users?role=Operador")
          console.log("✅ Admin: Conductores obtenidos");
          setDrivers(driversResponse.data)
        } catch (error) {
          console.error("❌ Admin: Error al obtener conductores:", error)
          setDrivers([])
        }

      } catch (error) {
        console.error("❌ Admin: Error general al obtener datos:", error)
        setError("Error al cargar los datos")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filtrar datos
  const filteredDischarges = allDischarges.filter((discharge) => {
    const matchesDriver =
      selectedDriver === "all" ||
      discharge.assignment?.driverId.toString() === selectedDriver;
    const matchesDate =
      !selectedDate ||
      new Date(discharge.createdAt).toDateString() ===
        new Date(selectedDate).toDateString();
    const matchesSearch =
      !searchTerm ||
      discharge.customer?.companyname
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      discharge.customer?.ruc?.includes(searchTerm);

    return matchesDriver && matchesDate && matchesSearch;
  });

  const filteredAssignments = allAssignments.filter((assignment) => {
    const matchesDriver =
      selectedDriver === "all" ||
      assignment.driverId.toString() === selectedDriver;
    const matchesDate =
      !selectedDate ||
      new Date(assignment.createdAt).toDateString() ===
        new Date(selectedDate).toDateString();
    const matchesSearch =
      !searchTerm ||
      assignment.truck?.placa
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      assignment.fuelType?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesDriver && matchesDate && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            Cargando datos administrativos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Encabezado */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/despacho">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link href="/dashboard">
                  Dashboard
                </Link>
              </Button>
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Panel Administrativo
                </h1>
                <p className="text-sm text-gray-600">
                  Vista general de todos los despachos
                </p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              <Calendar className="h-3 w-3 mr-1" />
              {todayFormatted}
            </Badge>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Conductor</label>
                <Select
                  value={selectedDriver}
                  onValueChange={setSelectedDriver}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los conductores</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        {driver.name} {driver.lastname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cliente, RUC, placa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Acciones</label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDriver("all");
                    setSelectedDate(new Date().toISOString().split("T")[0]);
                    setSearchTerm("");
                  }}
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pestañas */}
        <Tabs defaultValue="despachos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="despachos">
              Despachos ({filteredDischarges.length})
            </TabsTrigger>
            <TabsTrigger value="asignaciones">
              Asignaciones ({filteredAssignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="despachos">
            {error && (
              <Card className="mb-4 border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-red-700">{error}</p>
                </CardContent>
              </Card>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDischarges.map((discharge) => (
                <Card
                  key={discharge.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">
                        {discharge.customer?.companyname ||
                          "Cliente Desconocido"}
                      </CardTitle>
                      <Badge
                        className={
                          discharge.status === "finalizado"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }
                      >
                        {discharge.status === "finalizado"
                          ? "Completado"
                          : "Pendiente"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Conductor: {discharge.assignment?.driver?.name}{" "}
                      {discharge.assignment?.driver?.lastname}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Cantidad:</strong>{" "}
                        {discharge.totalDischarged.toString()} gal
                      </p>
                      <p>
                        <strong>RUC:</strong> {discharge.customer?.ruc || "N/A"}
                      </p>
                      <p>
                        <strong>Fecha:</strong>{" "}
                        {new Date(discharge.createdAt).toLocaleDateString()}
                      </p>
                      {discharge.status === "finalizado" &&
                        discharge.cantidadReal && (
                          <p>
                            <strong>Cantidad Real:</strong>{" "}
                            {discharge.cantidadReal.toString()} gal
                          </p>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {filteredDischarges.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">No se encontraron despachos con los filtros aplicados</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="asignaciones">
            {error && (
              <Card className="mb-4 border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-red-700">{error}</p>
                </CardContent>
              </Card>
            )}
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                <Card
                  key={assignment.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>
                        Asignación #{assignment.id} - {assignment.truck?.placa}
                      </CardTitle>
                      <Badge
                        className={
                          assignment.isCompleted
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }
                      >
                        {assignment.isCompleted ? "Completada" : "En Progreso"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Conductor: {assignment.driver?.name}{" "}
                      {assignment.driver?.lastname} • {assignment.fuelType}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <p className="text-xs text-blue-600">Cargado</p>
                        <p className="font-bold text-blue-700">
                          {assignment.totalLoaded.toString()}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <p className="text-xs text-green-600">Descargado</p>
                        <p className="font-bold text-green-700">
                          {(
                            Number(assignment.totalLoaded) -
                            Number(assignment.totalRemaining)
                          ).toFixed(0)}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <p className="text-xs text-orange-600">Remanente</p>
                        <p className="font-bold text-orange-700">
                          {assignment.totalRemaining.toString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>Fecha:</strong>{" "}
                        {new Date(assignment.createdAt).toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Despachos:</strong>{" "}
                        {assignment.discharges?.length || 0}
                      </p>
                      {assignment.notes && (
                        <p>
                          <strong>Notas:</strong> {assignment.notes}
                        </p>
                      )}
                    </div>
                    {/* Botón Completar Asignación (solo si no está completada) */}
                    {!assignment.isCompleted && (
                      <div className="flex justify-end mt-4">
                        <Button
                          onClick={() => completeAssignment(assignment.id)}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {isCompleting === assignment.id ? "Completando..." : "Completar Asignación"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {filteredAssignments.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">No se encontraron asignaciones con los filtros aplicados</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
