# SISEM — Sistema Integral de Seguimiento de Expedientes de Multas

Sistema web interno de **PROFEPA** para el seguimiento, control y análisis de expedientes de multas ambientales.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Cloud-3ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Tests](https://img.shields.io/badge/Tests-35%2F35-brightgreen)

## Descripción

SISEM centraliza la gestión de **3,854+ expedientes** de multas distribuidos en **32 ORPAs** (delegaciones) a nivel nacional. Permite importar datos masivos desde Excel, capturar expedientes manualmente, exportar a PDF y visualizar métricas clave en un dashboard interactivo con tendencias y rankings.

## Funcionalidades

### Core
- **Dashboard analítico** — KPIs animados, gráficas de barras/área/dona, tendencias mensuales (línea), ranking por ORPA, auto-refresh cada 5 min
- **Gestión de expedientes** — Búsqueda full-text (tsvector/GIN), filtrado avanzado (15+ filtros), ordenamiento, paginación configurable (10/25/50/100), historial de cambios
- **Importación masiva** — Carga de archivos Excel (.xlsx/.xls) con validación Zod, detección de materias, deduplicación automática, ~25 columnas mapeadas
- **Captura manual** — Formulario guiado con campos condicionales y validación en tiempo real
- **Exportación PDF** — Generación server-side con @react-pdf/renderer, descarga desde vista de detalle

### Administración
- **Usuarios** — CRUD completo (crear, editar roles, asignar ORPA, activar/desactivar, eliminar)
- **ORPAs** — Gestión con estadísticas (expedientes, montos, % cobrado, impugnados)
- **Permisos granulares** — 9 permisos configurables por rol en UI (importar, exportar, crear/editar/eliminar expedientes, cobro, dashboard, ORPAs, usuarios)

### Notificaciones y UX
- **Notificaciones en tiempo real** — Supabase Realtime (postgres_changes) + Browser Notification API para alertas de nuevos expedientes, pagos e impugnaciones
- **Campana de alertas** — Vencimientos de notificación y cobro con conteo y enlaces directos
- **Dark mode** — Toggle claro/oscuro con next-themes
- **Internacionalización** — Español/Inglés con selector de idioma (i18n context-based)

### DevOps
- **CI/CD** — GitHub Actions (lint → type-check → test → build), deploy automático en Vercel
- **Tests** — 35 tests con Vitest (días hábiles, validaciones Zod, parser Excel)
- **Error boundaries** — Recuperación de errores por sección sin perder el layout
- **Backup automático** — Cron semanal que exporta tablas a CSV en Supabase Storage

### Materias soportadas

Industria · Forestal · Impacto Ambiental · ZOFEMAT · Vida Silvestre · Recursos Marinos

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2 (App Router + Turbopack) |
| Lenguaje | TypeScript 5 |
| Base de datos | Supabase (PostgreSQL + Auth + RLS + Realtime) |
| Estilos | Tailwind CSS 4 + shadcn/ui 4.1 (base-ui) |
| Gráficas | Recharts 3.8 (Bar, Area, Pie, Line) |
| PDF | @react-pdf/renderer 4.3 |
| Validación | Zod 4 |
| Formularios | react-hook-form 7.72 |
| Excel | SheetJS (xlsx) 0.18 |
| Testing | Vitest 4.1 + Testing Library |
| Temas | next-themes 0.4 |
| i18n | Custom (React Context + JSON) |

## Estructura del proyecto

```
sisem/
├── .github/workflows/ci.yml     # CI pipeline
├── src/
│   ├── app/
│   │   ├── (auth)/login/         # Página de inicio de sesión
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/        # Dashboard principal
│   │   │   ├── expedientes/      # Tabla + detalle + editar
│   │   │   ├── captura/          # Captura manual
│   │   │   ├── importar/         # Importación Excel
│   │   │   └── admin/
│   │   │       ├── usuarios/     # CRUD de usuarios
│   │   │       ├── orpas/        # CRUD de ORPAs
│   │   │       └── permisos/     # Permisos por rol
│   │   ├── api/
│   │   │   ├── dashboard/        # API de métricas + tendencias
│   │   │   ├── expedientes/      # CRUD + búsqueda full-text
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts  # GET/PUT/DELETE con permisos
│   │   │   │       └── pdf/      # Generación de PDF
│   │   │   ├── importar/         # Procesamiento de Excel
│   │   │   ├── admin/
│   │   │   │   ├── usuarios/     # API de usuarios
│   │   │   │   ├── orpas/        # API de ORPAs
│   │   │   │   └── permisos/     # API de permisos
│   │   │   ├── alertas/          # Alertas de vencimiento
│   │   │   └── cron/backup/      # Backup automático
│   │   ├── error.tsx             # Error boundary global (i18n)
│   │   ├── not-found.tsx         # Página 404
│   │   └── layout.tsx            # ThemeProvider + I18nProvider
│   ├── components/
│   │   ├── ui/                   # shadcn/ui (20+ componentes)
│   │   ├── expediente-pdf.tsx    # Template PDF PROFEPA
│   │   ├── theme-toggle.tsx      # Toggle dark/light mode
│   │   ├── language-toggle.tsx   # Selector de idioma
│   │   └── section-error-boundary.tsx
│   ├── lib/
│   │   ├── supabase/             # Clientes (client, server, middleware)
│   │   ├── auth/permissions.ts   # checkPermission() helper
│   │   ├── excel/parser.ts       # Parser Excel → DB (~25 columnas)
│   │   ├── i18n/                 # es.json, en.json, provider
│   │   ├── validations/          # Esquemas Zod (create, update, parser)
│   │   ├── business-days.ts      # Días hábiles mexicanos
│   │   └── utils.ts
│   ├── __tests__/                # 35 tests (Vitest)
│   ├── middleware.ts             # Auth + autorización por rol
│   └── types/index.ts            # Tipos TypeScript
├── public/                       # Assets (logo, og-image, icons)
├── supabase/migrations/          # 4 migraciones SQL
│   ├── 20241001000000_initial.sql
│   ├── 20260326000000_orpas_rls.sql
│   ├── 20260401000000_fulltext_search.sql
│   ├── 20260402000000_role_permissions.sql
│   └── 20260403000000_realtime_expedientes.sql
└── vercel.json                   # Cron: backup semanal
```

## Requisitos previos

- Node.js 18+
- npm 9+
- Proyecto en [Supabase](https://supabase.com) con las migraciones ejecutadas

## Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/PROFEPA/SISEM.git
cd SISEM/sisem

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las credenciales de Supabase

# 4. Ejecutar migraciones en Supabase SQL Editor (en orden)
# → supabase/migrations/*.sql

# 5. Iniciar en modo desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|:---------:|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo servidor) | ✅ |
| `NEXT_PUBLIC_APP_URL` | URL de producción | ✅ |
| `CRON_SECRET` | Secret para autenticar cron jobs | ⬡ Backup |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Servir build de producción |
| `npm run lint` | Ejecutar ESLint |
| `npm run test` | Ejecutar tests (Vitest) |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests con cobertura |

## Migraciones SQL

Ejecutar en Supabase SQL Editor **en orden**:

| # | Migración | Descripción |
|---|-----------|-------------|
| 1 | `20241001000000_initial.sql` | Tablas base, RLS, catálogos |
| 2 | `20260326000000_orpas_rls.sql` | Políticas RLS de ORPAs |
| 3 | `20260401000000_fulltext_search.sql` | Columna tsvector + índice GIN |
| 4 | `20260402000000_role_permissions.sql` | Tabla permisos_rol + defaults |
| 5 | `20260403000000_realtime_expedientes.sql` | Habilitar Realtime |

## Roles y permisos

| Rol | Dashboard | Ver exp. | Crear | Editar | Eliminar | Importar | Exportar | ORPAs | Usuarios |
|-----|:---------:|:--------:|:-----:|:------:|:--------:|:--------:|:--------:|:-----:|:--------:|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Capturador** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Visualizador** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

Los permisos se pueden personalizar por rol desde **Admin → Permisos**.

## Despliegue en Vercel

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Configurar las variables de entorno en **Settings → Environment Variables**
3. Agregar el dominio de Vercel en **Supabase → Auth → URL Configuration → Redirect URLs**
4. Deploy automático en cada push a `main`

### Cron Jobs (Vercel)

| Cron | Horario | Descripción |
|------|---------|-------------|
| `/api/cron/backup` | Domingos 00:00 UTC | Exporta tablas a CSV en Supabase Storage (bucket `backups`) |

> **Requisito:** Crear bucket `backups` en Supabase Storage y configurar `CRON_SECRET` en Vercel.

## Seguridad

- Autenticación con Supabase Auth (cookies HTTP-only)
- Autorización por rol + permisos granulares en middleware y APIs
- Row Level Security (RLS) en todas las tablas
- Validación de entrada con Zod en endpoints POST/PUT
- Headers de seguridad (HSTS, X-Frame-Options, CSP referrer)
- Sanitización de búsquedas (escape de wildcards SQL)
- Límite de 10 MB en carga de archivos
- CRON_SECRET para proteger endpoints de cron

## Testing

```bash
npm run test          # 35 tests
npm run test:coverage # Con cobertura
```

| Suite | Tests | Descripción |
|-------|:-----:|-------------|
| `business-days` | 15 | Días hábiles mexicanos, festivos oficiales |
| `validations` | 13 | Esquemas Zod create/update |
| `parser` | 7 | Parser Excel con campos v3 |

## Licencia

Uso interno — PROFEPA © 2026
