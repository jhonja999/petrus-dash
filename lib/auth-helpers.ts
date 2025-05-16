// Helper functions for authentication and authorization

// Check if user has admin role
export function isAdmin(role?: string | null) {
    return role === "admin" || role === "dashboard_admin"
  }
  
  // Check if user has driver role
  export function isDriver(role?: string | null) {
    return role === "conductor"
  }
  
  // Check if user has any valid role
  export function hasValidRole(role?: string | null) {
    return isAdmin(role) || isDriver(role)
  }
  