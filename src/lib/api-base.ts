// Prefijo público de la aplicación. Next agrega `basePath` automáticamente a
// Link/router, pero no a fetch, window.location ni al `src` de next/image.
// En Vercel puede quedar vacío; en el servidor PROFEPA vale "/sisem".
export const APP_BASE_PATH = (
  process.env.NEXT_PUBLIC_BASE_PATH ?? ""
).replace(/\/$/, "");

// Alias conservado para las llamadas existentes a las rutas API.
export const API_BASE = APP_BASE_PATH;

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  if (!APP_BASE_PATH || path === APP_BASE_PATH || path.startsWith(`${APP_BASE_PATH}/`)) {
    return path;
  }
  return `${APP_BASE_PATH}${path}`;
}
