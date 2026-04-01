import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-muted-foreground/30">404</h1>
        <h2 className="text-xl font-semibold text-foreground">
          Página no encontrada
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B8A5A] text-white text-sm font-medium hover:bg-[#157A4E] transition-colors"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
