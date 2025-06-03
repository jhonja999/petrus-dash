import bcrypt from "bcryptjs"

// Hashear contraseña
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// Comparar contraseña
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Verificar si un usuario es administrador
export function isAdmin(user: any): boolean {
  return user?.role === "Admin" || user?.role === "S_A"
}

// Verificar si un usuario es super administrador
export function isSuperAdmin(user: any): boolean {
  return user?.role === "S_A"
}

// Verificar si un usuario es operador
export function isOperator(user: any): boolean {
  return user?.role === "Operador"
}
