# CLAUDE.md — Guía operativa para SISEM

Guía para agentes que trabajan en **SISEM** (Sistema Integral de Seguimiento de
Expedientes de Multas de PROFEPA). Este archivo captura lo **no obvio** y lo
**operativamente crítico**. Para la descripción general del proyecto, stack,
estructura de carpetas, roles y despliegue, ver [`README.md`](README.md).

> **Next.js 16 — leer antes de tocar código de framework.** Ver
> [`AGENTS.md`](AGENTS.md): esta versión tiene breaking changes respecto a lo que
> conoces. Consulta `node_modules/next/dist/docs/` antes de escribir código de Next.

---

## Convenciones del cliente (obligatorias)

- **Etiquetas de estatus en femenino**: "Pagadas", "Enviadas", "Impugnadas" /
  "Recurso". Usar **"pagadas"** (no "cobradas") en toda la UI y reportes.
- Terminología de pago: el campo es `pagado`/`pagada`, no "cobrado".

## Reglas de trabajo (esta colaboración)

- **No** agregar `Co-Authored-By` en los commits. **No** agregarse como colaborador.
- **No** tocar archivos no relacionados con la tarea.
- Antes de cambios masivos de datos: **validar primero y proponer respaldo/rollback**.
- Aplicar **UPSERT** al actualizar registros existentes, salvo indicación explícita.
- Al trabajar con `Upload/Concentrado Multas mayo.xlsx`: usar la hoja **`29062026`**
  como datos reales; **ignorar** la hoja `Catálogo` (es plantilla/leyenda, no expedientes).

---

## Modelo de datos (lo esencial)

Tabla principal: **`expedientes`**. Clave única compuesta:
**`(numero_expediente, numero_registro)`** — `numero_registro` permite varios
registros/personas bajo el mismo número de expediente. Los UPSERT usan
`onConflict: "numero_expediente,numero_registro"`.

Catálogos: `orpas` (32 ORPAs + ZMVM), `estatus_expediente`, `tipos_impugnacion`,
`resultados_impugnacion`. Auditoría: `expediente_historial`. Documentos:
`expediente_documentos` (OneDrive/SharePoint). Concentrados mensuales:
`cifras_snapshots`.

Esquema completo en `supabase/migrations/` (ver orden en README).

## Importación de Excel — flujo y gotchas

Dos rutas en la app:

- `POST /api/importar` → listado de expedientes individuales
  (`src/lib/excel/parser.ts`, función `parseExcelBuffer`).
- `POST /api/importar/concentrado` → totales por ORPA (CIFRAS) →
  `cifras_snapshots` (`src/lib/excel/cifras-parser.ts`).

El parser mapea ~25 variantes de encabezados (`COLUMN_MAP`), normaliza nombres de
ORPA (`ORPA_NORMALIZE`), fechas, montos, booleanos (Sí/No) e impugnaciones.

### ⚠️ Gotcha crítico: fechas en scripts de Node

`XLSX.SSF.parse_date_code` **NO existe** al correr `xlsx` en Node plano (sí
funciona dentro del bundler de Next.js). Si lees el Excel con `raw: true` sin más,
las fechas llegan como **serial numérico** (ej. `45583`) y terminan como `NULL`.

**Solución usada en los scripts:** leer con `cellDates: true` para que las celdas de
fecha lleguen como objetos `Date` de JS, y convertir con `getUTCFullYear/Month/Date`
(usar **UTC** para evitar desplazamiento de zona horaria):

```js
const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
// fecha → Date; monto → number; texto → string
```

Con `raw: false` las fechas salen como string en formato **MM/DD/YY** (americano):
no usar para parsear fechas.

### ⚠️ Gotcha: fechas de calendario imposibles no basta con validar el año

Validar que el ISO caiga en un rango de años razonable (`2019-01-01`..`2027-12-31`)
**no detecta mes/día inválidos** (ej. una celda capturada como texto "05/15/26" con
mes=15). Si se construye el ISO sin validar, Postgres truena al insertar: `date/time
field value out of range`. Los parsers ya validan reconstruyendo la fecha con
`new Date(Date.UTC(y, m-1, d))` y comparando que `getUTCFullYear/Month/Date` regresen
los mismos valores — si no calienta, se descarta como `null` en vez de tronar el lote
completo.

## Scripts de datos (`scripts/`)

Scripts standalone de Node (`.mjs`), fuera del flujo de la app. Usan la
**service role key** para saltarse RLS. Ejecutar desde `sisem/`:

| Script | Propósito | Efecto |
| --- | --- | --- |
| `validate-mayo.mjs` | Diagnóstico de calidad de `Concentrado Multas mayo.xlsx`. | Solo lectura |
| `import-mayo.mjs` | UPSERT de la hoja `29062026` del concentrado a `expedientes`. | **Escribe en BD** |
| `reconcile-mayo.mjs` | Compara fila por fila concentrado ↔ BD y reporta discrepancias. | Solo lectura |
| `validate-pendientes-mayo.mjs` | Diagnóstico de `Pendientes Multas mayo.xlsx` (cuántos coincidirán/serán nuevos). | Solo lectura |
| `import-pendientes-mayo.mjs` | Marca `excluida_estadisticas=true` en coincidencias; inserta las que no existen. Respalda antes de escribir en `scripts/backups/`. | **Escribe en BD** |

```bash
node scripts/validate-mayo.mjs              # validar el concentrado antes de importar
node scripts/import-mayo.mjs                # importar concentrado (UPSERT)
node scripts/reconcile-mayo.mjs             # verificar concentrado tras importar
node scripts/validate-pendientes-mayo.mjs   # validar el Excel de pendientes
node scripts/import-pendientes-mayo.mjs     # marcar/insertar pendientes (con respaldo)
```

Todos replican la misma lógica de parseo (ORPA, fechas, montos, materia, impugnación)
y la misma asignación secuencial de `numero_registro` que `src/app/api/importar/route.ts`.
Si cambias el parser de la app, mantenlos en sincronía (o refactoriza para compartir
el módulo). `scripts/backups/` no se sube a git (contiene datos de expedientes).

### Migraciones: el historial del CLI está desincronizado

`supabase migration list --linked` muestra solo la primera migración
(`20241001000000`) como aplicada en `remote`; las demás se corrieron manualmente por
el SQL Editor (como indica el README) y el CLI no se enteró. **No usar `supabase db
push`** a ciegas — reintentaría las ~9 migraciones viejas y podría fallar o duplicar
políticas. Para aplicar una migración nueva de forma aislada:

```bash
npx supabase db query --linked -f "supabase/migrations/<archivo>.sql"
```

Esto ejecuta el SQL directo contra el proyecto vinculado sin tocar el historial de
migraciones de las demás.

## Bandera `excluida_estadisticas` — multas fuera del reporte general

Columna en `expedientes` (migración `20260701000000_excluida_estadisticas.sql`,
`BOOLEAN NOT NULL DEFAULT FALSE`). Es una **lista curada por el cliente** de qué
expedientes no deben contarse en el dashboard/totales por ORPA/lista principal,
aunque sí tienen seguimiento propio en `/expedientes/pendientes-notificacion`.

**No es derivable de otras columnas** — no confundir con "sin `fecha_notificacion`":
al validar contra el Excel de pendientes, solo 59 de 72 expedientes con
`fecha_notificacion IS NULL` coincidían con la lista real del cliente, y varios
expedientes ya notificados/pagados igual estaban en su lista. Se abandonó el criterio
automático por fecha en favor de esta bandera explícita.

**Fase 2 activa (2026-07-01):** el dashboard (`src/app/api/dashboard/route.ts`), los
totales por ORPA (`src/app/api/admin/orpas/route.ts`) y la lista principal de
expedientes (`src/app/api/expedientes/route.ts`, comportamiento por defecto) **ya
excluyen** `excluida_estadisticas = true`. La lista general solo muestra `=false`
salvo que se pida explícitamente `?excluida_estadisticas=true` (lo que hace
`/expedientes/pendientes-notificacion`). No hay modo "ver todo mezclado" — si se
necesita en el futuro, hay que agregarlo aparte.

Emparejamiento Excel↔BD al importar pendientes: por `(numero_expediente,
monto_multa≈$0.5)`, **no** por `numero_registro` secuencial (no es confiable entre
archivos generados por separado). Si el monto no coincide para el mismo número de
expediente, se trata como una persona/multa distinta (nuevo `numero_registro`).

---

## Estado actual de los datos (2026-07-01)

**Concentrado de mayo** (`Concentrado Multas mayo.xlsx`, hoja `29062026`):
4,104 expedientes importados al 100%, 0 discrepancias (verificado campo por campo).

**Pendientes de mayo** (`Pendientes Multas mayo.xlsx`, hoja `29062026`, 263 filas):
65 coincidían con expedientes ya existentes (solo se marcó la bandera); 198 eran
nuevas (se insertaron completas con la bandera activada). Reconciliado 1:1 contra
el Excel, 0 sin cobertura.

**Limpieza de datos ajenos (2026-07-01):** el cliente notó que la plataforma mostraba
4,890 expedientes cuando su Excel tenía 4,104. Se diagnosticó: 4,104 (concentrado) +
263 (pendientes) + **527 registros de origen desconocido**, creados el 2026-05-18,
**antes** de esta colaboración — no estaban en ningún Excel entregado. Se eliminaron
con respaldo previo completo en `scripts/backups/` (`scripts/cleanup-huerfanos-mayo.mjs`).

⚠️ **347 de esos 527 (66%) tenían documentos reales de SharePoint vinculados**
(recibos de pago, 360 documentos = 13.5% de todo el sistema). `expediente_documentos`
tiene `ON DELETE CASCADE`, así que esos vínculos se perdieron permanentemente al
borrar (los PDFs siguen en la carpeta compartida, la plataforma ya no sabe a qué
expediente pertenecían). **Se procedió con confirmación explícita del cliente**,
informado de esta consecuencia antes de ejecutar. El respaldo JSON conserva
`nombre_archivo` y `drive_file_id` de cada documento perdido por si se requiere
re-vincular manualmente.

**Corrección del cliente (2026-07-01, mismo día):** tras revisar los 4 expedientes que
aparecían en ambos Excel, el cliente actualizó los archivos en `Upload/` (mismo nombre,
contenido corregido) y confirmó por correo:
- 3 casos se restauran al reporte general (ya no están en `Pendientes Multas mayo.xlsx`).
- El 4° (`PFPAP/20.2/3S.2/00048-2025`) eran **dos multas distintas legítimas**
  (registro 1 y 2, montos $56,570 y $22,628); de paso corrigió el typo del concentrado
  (`PFPAP` → `PFPA`). Ninguno de los dos sigue en pendientes.

Aplicado con `scripts/sync-correcciones-mayo.mjs` (5 UPDATE puntuales por `id`, sin
insertar ni borrar nada — respaldo previo en `scripts/backups/`): se corrigió el
`numero_expediente` de esas 2 filas y se quitó `excluida_estadisticas` a las 4 que
salieron de pendientes.

**Total actual: 4,363** en `expedientes` (sin cambio). Con Fase 2 activa: reporte
general (dashboard/ORPA/lista) = **4,104** (coincide exacto con el concentrado del
cliente); apartado de pendientes = **259**.

Observaciones de calidad de datos reportadas al cliente (no corregidas silenciosamente):
- Una fila del Excel de pendientes tenía `FECHA PAGO = "05/15/26"` — fecha de
  calendario inválida (mes 15); se dejó como `null`, no se adivinó el valor.

> Nota: la fecha más reciente de `fecha_resolucion` es de **junio 2026**; el nombre
> del archivo ("mayo") es la fecha de compilación del reporte, no el rango de datos.

