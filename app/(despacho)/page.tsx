// This is a Server Component by default (no "use client")
import ClientDashboardWrapper from "./client-dashboard-wrapper"

export default function DriverDashboardPage() {
  // This Server Component simply renders the ClientDashboardWrapper.
  // All dynamic imports and client-side logic are encapsulated within the wrapper.
  return <ClientDashboardWrapper />
}
