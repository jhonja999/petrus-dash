import type { Metadata } from "next"
import { CustomerForm } from "../customer-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Nuevo Cliente | Petrus",
  description: "Agregar un nuevo cliente al sistema",
}

export default function NewCustomerPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Nuevo Cliente</h2>
        </div>
      </div>
      <div className="space-y-4">
        <CustomerForm redirectAfterSubmit={true} />
      </div>
    </div>
  )
}
