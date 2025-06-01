import { z } from "zod"

// Define the UserRole enum for Zod to match Prisma's new enum
export const UserRoleEnum = z.enum(["Operador", "Admin", "S_A"]) // S-A se convierte en S_A

export const UserSchema = z.object({
  dni: z.string().min(8, "DNI debe tener al menos 8 caracteres").max(8, "DNI debe tener máximo 8 caracteres"),
  name: z.string().min(1, "Nombre es requerido"),
  lastname: z.string().min(1, "Apellido es requerido"),
  email: z.string().email("Email inválido"),
  // Usa el nuevo UserRoleEnum
  role: UserRoleEnum.default("Operador"),
  state: z.enum(["Activo", "Inactivo", "Suspendido", "Eliminado", "Asignado"]).default("Activo"),
})

export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña es requerida"),
})

export const TruckSchema = z.object({
  placa: z.string().min(1, "Placa es requerida"),
  typefuel: z.enum(["DIESEL_B5", "GASOLINA_90", "GASOLINA_95", "GLP", "ELECTRICA"]),
  capacitygal: z.number().positive("Capacidad debe ser un número positivo"),
  lastRemaining: z.number().min(0, "Combustible restante no puede ser negativo").default(0.0),
  state: z.enum(["Activo", "Inactivo", "Mantenimiento", "Transito", "Descarga", "Asignado"]).default("Activo"),
})

export const AssignmentSchema = z.object({
  truckId: z.number().int().positive("ID de camión inválido"),
  driverId: z.number().int().positive("ID de conductor inválido"),
  totalLoaded: z.number().positive("Total cargado debe ser positivo"),
  totalRemaining: z.number().min(0, "Total restante no puede ser negativo"),
  fuelType: z.enum(["DIESEL_B5", "GASOLINA_90", "GASOLINA_95", "GLP", "ELECTRICA"]),
  isCompleted: z.boolean().default(false),
  notes: z.string().optional(),
})

export const DischargeSchema = z.object({
  assignmentId: z.number().int().positive("ID de asignación inválido"),
  customerId: z.number().int().positive("ID de cliente inválido"),
  totalDischarged: z.number().positive("Total despachado debe ser positivo"),
  status: z.string().default("pendiente"),
  marcadorInicial: z.number().optional(),
  marcadorFinal: z.number().optional(),
  cantidadReal: z.number().optional(),
})

export const CustomerSchema = z.object({
  companyname: z.string().min(1, "Nombre de la empresa es requerido"),
  ruc: z.string().min(11, "RUC debe tener 11 dígitos").max(11, "RUC debe tener 11 dígitos"),
  address: z.string().min(1, "Dirección es requerida"),
})
