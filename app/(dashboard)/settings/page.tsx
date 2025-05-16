import { requireAdmin } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function SettingsPage() {
  // Only allow admins to access this page
  await requireAdmin()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración del Sistema</CardTitle>
          <CardDescription>Administra la configuración general del sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="security">Seguridad</TabsTrigger>
              <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <h3 className="text-lg font-medium">Información General</h3>
                  <p className="text-sm text-muted-foreground">
                    Configuración general del sistema de despacho de combustible.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <h3 className="text-lg font-medium">Seguridad</h3>
                  <p className="text-sm text-muted-foreground">Configuración de seguridad y permisos del sistema.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <h3 className="text-lg font-medium">Notificaciones</h3>
                  <p className="text-sm text-muted-foreground">Configuración de notificaciones del sistema.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
