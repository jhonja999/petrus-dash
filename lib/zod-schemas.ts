import { z } from "zod"

export const UserSchema = z.object({
  dni: z.string().min(8, "DNI debe tener al menos 8 dígitos").max(8, "DNI debe tener máximo 8 dígitos"),
  name: z.string().min(1, "El nombre es requerido").max(50, "El nombre es muy largo"),
  lastname: z.string().min(1, "El apellido es requerido").max(50, "El apellido es muy largo"),
  email: z.string().email("Email inválido").max(100, "El email es muy largo"),
  role: z.enum(["Operador", "Admin", "S-A"]),
  state: z.enum(["Activo", "Inactivo", "Suspendido", "Eliminado", "Asignado"]).optional(),
})

export const TruckSchema = z.object({
  placa: z.string().min(1, "La placa es requerida").max(10, "La placa es muy larga"),
  typefuel: z.enum(["DIESEL_B5", "GASOLINA_90", "GASOLINA_95", "GLP", "ELECTRICA"]),
  capacitygal: z.number().positive("La capacidad debe ser mayor a 0").max(10000, "Capacidad muy alta"),
  lastRemaining: z.number().min(0, "El remanente no puede ser negativo").optional(),
  state: z.enum(["Activo", "Inactivo", "Mantenimiento", "Transito", "Descarga", "Asignado"]).optional(),
})

export const CustomerSchema = z.object({
  companyname: z.string().min(1, "El nombre de la empresa es requerido").max(100, "Nombre muy largo"),
  ruc: z.string().min(11, "El RUC debe tener 11 dígitos").max(11, "El RUC debe tener 11 dígitos"),
  address: z.string().min(1, "La dirección es requerida").max(200, "Dirección muy larga"),
})

export const AssignmentSchema = z.object({
  truckId: z.number().positive("ID de camión inválido"),
  driverId: z.number().positive("ID de conductor inválido"),
  totalLoaded: z.number().positive("La carga total debe ser mayor a 0").max(10000, "Carga muy alta"),
  fuelType: z.enum(["DIESEL_B5", "GASOLINA_90", "GASOLINA_95", "GLP", "ELECTRICA"]),
  notes: z.string().max(500, "Notas muy largas").optional(),
})

export const DischargeSchema = z.object({
  assignmentId: z.number().positive("ID de asignación inválido"),
  customerId: z.number().positive("ID de cliente inválido"),
  totalDischarged: z.number().positive("La descarga debe ser mayor a 0").max(10000, "Descarga muy alta"),
  marcadorInicial: z.number().min(0, "Marcador inicial inválido").optional(),
  marcadorFinal: z.number().min(0, "Marcador final inválido").optional(),
})

export const ReportFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  truckId: z.number().optional(),
  driverId: z.number().optional(),
  fuelType: z.enum(["DIESEL_B5", "GASOLINA_90", "GASOLINA_95", "GLP", "ELECTRICA"]).optional(),
})

export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
})

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmar contraseña es requerido"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
