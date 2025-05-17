"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Save } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { DataPreview } from "@/components/ui/data-preview";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const assignmentSchema = z.object({
  truckId: z.string().min(1, "Seleccione un camión"),
  driverId: z.string().min(1, "Seleccione un conductor"),
  fuelType: z.string().min(1, "Seleccione un tipo de combustible"),
  totalLoaded: z.coerce
    .number()
    .positive("La cantidad debe ser mayor a 0")
    .max(10000, "La cantidad máxima es 10,000 galones"),
  notes: z.string().optional(),
});
type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface AssignmentFormProps {
  assignment?: any;
  onClose?: () => void;
  redirectAfterSubmit?: boolean;
  trucks?: any[];
  drivers?: any[];
}

export function AssignmentForm({
  assignment,
  onClose,
  redirectAfterSubmit = false,
  trucks: propTrucks,
  drivers: propDrivers,
}: AssignmentFormProps) {
  const router = useRouter();
  const isEditing = !!assignment;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [selectedTruck, setSelectedTruck] = useState<any>(null);

  // Fetch trucks & drivers if not passed as props
  const { data: fetchedTrucks, isLoading: trucksLoading } = useApi<any[]>(
    "/api/trucks",
    {
      queryParams: { state: "Activo" },
    }
  );
  const { data: fetchedDrivers, isLoading: driversLoading } = useApi<any[]>(
    "/api/users",
    {
      queryParams: { role: "Conductor", state: "Activo" },
    }
  );

  const trucks = propTrucks || fetchedTrucks || [];
  const drivers = propDrivers || fetchedDrivers || [];

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      truckId: assignment?.truckId?.toString() || "",
      driverId: assignment?.driverId?.toString() || "",
      fuelType: assignment?.fuelType || "",
      totalLoaded: assignment?.totalLoaded?.toString() || "",
      notes: assignment?.notes || "",
    },
  });

  const watchedValues = form.watch();
  const watchedTruckId = watchedValues.truckId;

  useEffect(() => {
    if (watchedTruckId && trucks.length) {
      const t = trucks.find((x) => x.id.toString() === watchedTruckId);
      if (t) {
        setSelectedTruck(t);
        form.setValue("fuelType", t.typefuel);
      }
    }
  }, [watchedTruckId, trucks, form]);

  const fuelTypeLabels: Record<string, string> = {
    DIESEL_B5: "Diesel B5",
    GASOLINA_90: "Gasolina 90",
    GASOLINA_95: "Gasolina 95",
    GLP: "GLP",
    ELECTRICA: "Eléctrica",
  };

  const formatters = {
    truckId: (val: string) =>
      trucks.find((t) => t.id.toString() === val)
        ? `${trucks.find((t) => t.id.toString() === val)!.placa}`
        : val,
    driverId: (val: string) =>
      drivers.find((d) => d.id.toString() === val)
        ? `${drivers.find((d) => d.id.toString() === val)!.name} ${
            drivers.find((d) => d.id.toString() === val)!.lastname
          }`
        : val,
    fuelType: (val: string) => <Badge>{fuelTypeLabels[val] || val}</Badge>,
    totalLoaded: (val: number) => `${val} galones`,
  };

  const hasValue = (key: keyof AssignmentFormValues) => !!watchedValues[key];

  const onSubmit = async (data: AssignmentFormValues) => {
    setIsSubmitting(true);
    try {
      /* const cap = parseFloat(selectedTruck.capacitygal)
const totalRemaining = cap - data.totalLoaded */

      const totalRemaining = data.totalLoaded;

      const payload = {
        truckId: Number(data.truckId),
        driverId: Number(data.driverId),
        fuelType: data.fuelType,
        totalLoaded: data.totalLoaded,
        totalRemaining, // ← lo agregamos
        notes: data.notes || "",
        ...(isEditing && { id: assignment.id }),
      };

      const res = await fetch("/api/assignments", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }

      toast({
        title: isEditing ? "Asignación actualizada" : "Asignación creada",
        description: isEditing
          ? "Se actualizó correctamente."
          : "Se creó correctamente.",
      });

      if (redirectAfterSubmit) {
        router.push("/assignment");
      } else if (onClose) {
        onClose();
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: (e as Error).message || "Ocurrió un error.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs
          value={activeTab}
          onValueChange={(val: string) =>
            setActiveTab(val as "form" | "preview")
          }
        >
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="form">Formulario</TabsTrigger>
            <TabsTrigger value="preview">Vista Previa</TabsTrigger>
          </TabsList>
          <TabsContent value="form" className="pt-4 space-y-4">
            <FormField
              control={form.control}
              name="truckId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Camión</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      const t = trucks.find((x) => x.id.toString() === v);
                      if (t) {
                        setSelectedTruck(t);
                        form.setValue("fuelType", t.typefuel);
                      }
                    }}
                    value={field.value}
                    disabled={trucksLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione camión" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trucks.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.placa} – {t.typefuel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conductor</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={driversLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione conductor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {d.name} {d.lastname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fuelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Combustible</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(fuelTypeLabels).map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalLoaded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carga Total (galones)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="500.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales sobre la asignación"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedTruck && (
              <div className="p-3 bg-muted rounded">
                <p className="font-medium">Camión: {selectedTruck.placa}</p>
                <p>Capacidad: {selectedTruck.capacitygal} galones</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="pt-4">
            <DataPreview
              title="Vista Previa"
              description="Revisa antes de guardar"
              data={watchedValues}
              formatters={formatters}
              excludeFields={["notes"].filter((k) => !hasValue(k as any))}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          {redirectAfterSubmit ? (
            <Button variant="outline" asChild disabled={isSubmitting}>
              <Link href="/assignment">Cancelar</Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
          )}

          {activeTab === "form" ? (
            <Button
              type="button"
              onClick={() => setActiveTab("preview")}
              disabled={isSubmitting}
            >
              Vista Previa <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? "Actualizar" : "Guardar"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );

  if (onClose) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Asignación" : "Nueva Asignación"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modifica los datos y guarda los cambios."
                : "Completa el formulario para crear una asignación."}
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Asignación</h3>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
