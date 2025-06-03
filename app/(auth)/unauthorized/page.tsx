"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield,
  Home,
  LogOut,
  AlertTriangle,
  User,
  ArrowLeft,
  Lock,
  RefreshCw,
  Mail,
  Phone,
  HelpCircle,
} from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, logout, isLoading, isAdmin, isOperator } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error during logout:", error);
      window.location.href = "/api/auth/logout";
    }
  };

  const handleGoHome = () => {
    router.push("/");
  };

  // 1. CORRECCIÓN EN UnauthorizedPage - función handleGoToPanel
  const handleGoToPanel = () => {
    if (isAdmin || user?.role === "S_A") {
      router.push("/dashboard");
    } else if (isOperator) {
      router.push(`/despacho/${user?.id}`);
    } else {
      router.push("/");
    }
  };

  const handleContactAdmin = () => {
    // You can customize this to open email client or redirect to contact page
    window.location.href =
      "mailto:admin@petrusdash.com?subject=Solicitud de Acceso - Sistema PetrusDash";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <Card className="border-red-200 shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <AlertTriangle className="h-7 w-7 text-red-600" />
              Acceso Denegado
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 mt-2">
              No tienes los permisos necesarios para acceder a esta página
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* User Information */}
            {user && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-lg">
                        {user.name} {user.lastname}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">DNI: {user.dni}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {user.role === "Admin"
                            ? "Administrador"
                            : user.role === "S_A"
                            ? "Super Administrador"
                            : user.role === "Operador"
                            ? "Operador"
                            : user.role}
                        </Badge>
                        <Badge
                          variant={
                            user.state === "Activo" ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {user.state}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Details */}
            <Alert className="border-red-200 bg-red-50">
              <Shield className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-2">
                  <p className="font-semibold">Permisos Insuficientes</p>
                  <p className="text-sm">
                    Tu cuenta no tiene los permisos necesarios para acceder a
                    esta funcionalidad. Esto puede deberse a:
                  </p>
                  <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                    <li>Restricciones de rol de usuario</li>
                    <li>Acceso limitado a ciertas secciones</li>
                    <li>Estado de cuenta inactivo</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-3">
              {user && (
                <Button
                  onClick={handleGoToPanel}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ir a Mi Panel Principal
                </Button>
              )}

              <Button
                onClick={handleGoHome}
                variant="outline"
                className="w-full border-gray-300 hover:bg-gray-50"
                size="lg"
              >
                <Home className="h-4 w-4 mr-2" />
                Volver al Inicio
              </Button>

              <Button
                onClick={handleContactAdmin}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                size="lg"
              >
                <Mail className="h-4 w-4 mr-2" />
                Contactar Administrador
              </Button>

              {user ? (
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              ) : (
                <Button
                  onClick={() => router.push("/login")}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Iniciar Sesión
                </Button>
              )}
            </div>

            {/* Contact Information */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      ¿Necesitas ayuda?
                    </h4>
                    <div className="space-y-2 text-sm text-blue-800">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>admin@petrus.com</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>+51 (01) 234-5678</span>
                      </div>
                      <p className="text-xs mt-2">
                        Horario de atención: Lunes a Viernes, 8:00 AM - 6:00 PM
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Help */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Si crees que esto es un error, por favor contacta con el
                administrador del sistema proporcionando tu información de
                usuario y la página a la que intentabas acceder.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
