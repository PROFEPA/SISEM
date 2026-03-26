# SISEM — Sistema Integral de Seguimiento de Expedientes de Multas

Sistema web interno de **PROFEPA** para el seguimiento, control y análisis de expedientes de multas ambientales.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Cloud-3ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

## Descripción

SISEM centraliza la gestión de **3,854+ expedientes** de multas distribuidos en **32 ORPAs** (delegaciones) a nivel nacional. Permite importar datos masivos desde Excel, capturar expedientes manualmente y visualizar métricas clave en un dashboard interactivo.

### Funcionalidades principales

- **Dashboard analítico** — KPIs animados, gráficas de barras/área/dona, tendencias mensuales y desglose por ORPA y materia
- **Gestión de expedientes** — Búsqueda, filtrado, ordenamiento, paginación y edición con historial de cambios
- **Importación masiva** — Carga de archivos Excel (.xlsx/.xls) con validación de estructura, detección de materias y deduplicación automática
- **Captura manual** — Formulario guiado para capturadores con campos condicionales y validación Zod
- **Control de acceso** — Tres roles (admin, capturador, visualizador) con middleware de autorización
- **Administración de usuarios** — Panel para crear, editar y eliminar cuentas de usuario

### Materias soportadas

Industria · Forestal · Impacto Ambiental · ZOFEMAT · Vida Silvestre · Recursos Marinos

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2 (App Router + Turbopack) |
| Lenguaje | TypeScript 5 |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) |
| Estilos | Tailwind CSS 4 + shadcn/ui (base-nova) |
| Gráficas | Recharts |
| Validación | Zod |
| Excel | SheetJS (xlsx) |

## Estructura del proyecto

```
sisem/
├── src/
│   ├── app/
│   │   ├── (auth)/login/        # Página de inicio de sesión
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/       # Dashboard principal
│   │   │   ├── expedientes/     # Tabla de expedientes
│   │   │   ├── captura/         # Captura manual
│   │   │   ├── importar/        # Importación Excel
│   │   │   └── admin/           # Gestión de usuarios
│   │   ├── api/
│   │   │   ├── dashboard/       # API de métricas
│   │   │   ├── expedientes/     # CRUD de expedientes
│   │   │   ├── importar/        # Procesamiento de Excel
│   │   │   └── admin/           # API de usuarios
│   │   ├── error.tsx            # Error boundary
│   │   └── not-found.tsx        # Página 404
│   ├── components/ui/           # Componentes shadcn/ui
│   ├── lib/
│   │   ├── supabase/            # Clientes Supabase (client, server, middleware)
│   │   └── validations/         # Esquemas Zod
│   ├── middleware.ts            # Autenticación y autorización por rol
│   └── types/                   # Tipos TypeScript
├── public/                      # Assets estáticos (logo, og-image)
├── supabase/migrations/         # Migraciones SQL
└── .env.example                 # Variables de entorno requeridas
```

## Requisitos previos

- Node.js 18+
- npm 9+
- Proyecto en [Supabase](https://supabase.com) con las tablas `orpas`, `expedientes` y `profiles`

## Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/PROFEPA/SISEM.git
cd SISEM

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las credenciales de Supabase

# 4. Iniciar en modo desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo servidor) |
| `NEXT_PUBLIC_APP_URL` | URL de producción (ej. `https://sisem.vercel.app`) |

## Despliegue en Vercel

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Configurar las variables de entorno en **Settings → Environment Variables**
3. Agregar el dominio de Vercel en **Supabase → Auth → URL Configuration → Redirect URLs**
4. Deploy automático en cada push a `main`

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Servir build de producción |
| `npm run lint` | Ejecutar ESLint |

## Seguridad

- Autenticación con Supabase Auth (cookies HTTP-only)
- Autorización por rol en middleware y APIs
- Row Level Security (RLS) en todas las tablas
- Validación de entrada con Zod en endpoints POST/PUT
- Headers de seguridad (HSTS, X-Frame-Options, CSP referrer)
- Sanitización de búsquedas (escape de wildcards SQL)
- Límite de 10 MB en carga de archivos

## Licencia

Uso interno — PROFEPA © 2026
