import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function LandingHero() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-emerald-50 to-white">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-4 py-1.5 mb-6 text-sm font-medium rounded-full bg-emerald-100 text-emerald-800">
              Sistema de Gestión de Combustible
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-gray-900">
              Gestión Inteligente de Combustible
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-lg">
              Optimice sus operaciones de distribución de combustible con nuestra plataforma integral de gestión.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-6">
                Solicitar Demo
              </Button>
              <Button size="lg" variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                Ver Características <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="mt-8 flex items-center text-sm text-gray-500">
              <span className="font-medium">Confiado por más de 100+ empresas</span>
              <div className="ml-4 flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                  >
                    {i}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-video rounded-xl overflow-hidden shadow-2xl border border-gray-200">
              <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-white/90 shadow-lg flex items-center justify-center cursor-pointer hover:bg-white transition-colors">
                  <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center">
                    <svg className="h-5 w-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <img
                src="/placeholder.svg?height=400&width=600"
                alt="Petrus platform demo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 -z-10 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl"></div>
            <div className="absolute -top-6 -left-6 -z-10 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
