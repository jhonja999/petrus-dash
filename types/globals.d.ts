//type para los roles de clerk
export {}

// Create a type for the roles
export type Roles = 'admin' | 'conductor' | 'Member'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles
    }
  }
}