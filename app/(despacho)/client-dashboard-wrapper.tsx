"use client"

import dynamic from "next/dynamic"

// Dynamically import DriverDashboardContent to ensure it's rendered on the client-side only.
// This prevents any client-side code or browser APIs from being evaluated during server-side prerendering.
const DriverDashboardContent = dynamic(() => import("@/components/DriverDashboardContent"), { ssr: false })

export default function ClientDashboardWrapper() {
  return <DriverDashboardContent />
}
