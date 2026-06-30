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

## Scripts de datos (`scripts/`)

Scripts standalone de Node (`.mjs`), fuera del flujo de la app. Usan la
**service role key** para saltarse RLS. Ejecutar desde `sisem/`:

| Script | Propósito | Efecto |
|--------|-----------|--------|
| `validate-mayo.mjs`  | Diagnóstico de calidad del Excel (conteos, ORPAs, fechas, montos). | Solo lectura |
| `import-mayo.mjs`    | UPSERT de la hoja `29062026` a `expedientes` (lotes de 100). | **Escribe en BD** |
| `reconcile-mayo.mjs` | Compara fila por fila Excel ↔ BD y reporta discrepancias. | Solo lectura |

```bash
node scripts/validate-mayo.mjs    # validar antes de importar
node scripts/import-mayo.mjs      # importar (UPSERT)
node scripts/reconcile-mayo.mjs   # verificar tras importar
```

Los tres replican la misma lógica de parseo y la misma asignación secuencial de
`numero_registro` que `src/app/api/importar/route.ts`. Si cambias el parser de la
app, mantén estos scripts en sincronía (o refactoriza para compartir el módulo).

---

## Estado actual de los datos (2026-06-30)

Tras importar `Concentrado Multas mayo.xlsx` (hoja `29062026`):

- **4,104** expedientes del Excel → importados al 100%, **0 discrepancias**
  (verificado campo por campo con `reconcile-mayo.mjs`: monto, fechas, pago,
  impugnación, cobro, ORPA).
- **4,692** registros totales en `expedientes`. Los **588** restantes provienen de
  una importación previa (2026-05-18, `fuente="excel"`) y **no** están en el
  concentrado de mayo:
  - 583 son expedientes con número distinto (sobre todo **Tamaulipas** —100, ausente
    del concentrado de mayo—, **BCS** 217, **Chihuahua** 140).
  - 5 son `registro 2` de expedientes que en mayo aparecen una sola vez.
- Por UPSERT, esos 588 **se conservan** (no se borra lo que no viene en el Excel).
  Si el cliente quiere que el sistema refleje **solo** el concentrado de mayo, hace
  falta una limpieza explícita **con respaldo previo** (no ejecutar sin confirmación).

> Nota: la fecha más reciente de `fecha_resolucion` es de **junio 2026**; el nombre
> del archivo ("mayo") es la fecha de compilación del reporte, no el rango de datos.
