"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-800 mb-4">Error Global</h2>
            <p className="text-red-600 mb-4">Ha ocurrido un error crítico en la aplicación</p>
            <button onClick={reset} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
