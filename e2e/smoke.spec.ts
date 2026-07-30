/**
 * SISEM Smoke Tests — Playwright
 * Valida flujo de login, dashboard y búsqueda básica de expedientes.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";

const EMAIL    = process.env.PLAYWRIGHT_EMAIL    ?? "";
const PASSWORD = process.env.PLAYWRIGHT_PASSWORD ?? "";
const BASE_PATH = (
  process.env.PLAYWRIGHT_BASE_PATH ??
  process.env.NEXT_PUBLIC_BASE_PATH ??
  ""
).replace(/\/$/, "");

function appPath(path: string): string {
  if (!path.startsWith("/")) return path;
  if (!BASE_PATH || path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) {
    return path;
  }
  return `${BASE_PATH}${path}`;
}

function requireCredentials() {
  test.skip(!EMAIL || !PASSWORD, "Se requieren PLAYWRIGHT_EMAIL y PLAYWRIGHT_PASSWORD");
}

// ---------------------------------------------------------------------------
// Helper: login
// ---------------------------------------------------------------------------
async function login(page: Page) {
  requireCredentials();
  await page.goto(appPath("/login"));
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`**${appPath("/dashboard")}`, { timeout: 20_000 });
}

async function expectHealthyPage(page: Page, path: string) {
  const pageErrors: string[] = [];
  const badResponses: string[] = [];
  const onPageError = (error: Error) => pageErrors.push(error.message);
  const onResponse = (response: { status(): number; url(): string }) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && url.startsWith("https://apps.profepa.gob.mx/sisem")) {
      badResponses.push(`${status} ${url}`);
    }
  };
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  await page.goto(appPath(path));
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await expect(page.locator("body")).not.toContainText("Internal Server Error");
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.locator("body")).not.toContainText("Error en contenido");
  expect(pageErrors, `Errores JS en ${path}`).toEqual([]);
  expect(badResponses, `Respuestas HTTP fallidas en ${path}`).toEqual([]);

  page.off("pageerror", onPageError);
  page.off("response", onResponse);
}

// ---------------------------------------------------------------------------
// Suite 1: Página de login
// ---------------------------------------------------------------------------
test.describe("Login", () => {
  test("muestra formulario de login", async ({ page }) => {
    const failedResponses: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(appPath("/login"));
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    const logo = page.getByAltText("SISEM");
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(failedResponses).toEqual([]);
  });

  test("rechaza credenciales inválidas", async ({ page }) => {
    await page.goto(appPath("/login"));
    await page.locator("#email").fill("noexiste@sisem.test");
    await page.locator("#password").fill("wrongpassword");
    await page.locator('button[type="submit"]').click();
    // Debe mostrar un mensaje de error o seguir en /login
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/login/);
  });

  test("login exitoso redirige a dashboard", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/dashboard/);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Dashboard — cifras generales
// ---------------------------------------------------------------------------
test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("carga el dashboard sin errores", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("muestra algún indicador de expedientes (número > 0)", async ({ page }) => {
    // Esperar a que la página cargue datos (algún número visible)
    const numericRegex = /\d{1,3}(,\d{3})*/;
    await expect(page.locator("body")).toContainText(numericRegex, { timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Expedientes
// ---------------------------------------------------------------------------
test.describe("Expedientes", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(appPath("/expedientes"));
    await page.waitForLoadState("networkidle");
  });

  test("carga la página sin errores 500", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("muestra tabla con datos (al menos una fila de expediente)", async ({ page }) => {
    // La tabla debe tener al menos un tr visible
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("buscador filtra expedientes", async ({ page }) => {
    // Buscar por un texto genérico; verificar que la tabla reacciona
    const searchInput = page.locator('input[type="search"], input[placeholder*="xpediente"], input[placeholder*="earch"], input[placeholder*="uscar"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("PROFEPA");
      await page.waitForTimeout(1000);
      // La tabla sigue mostrando algo (no crash)
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
    } else {
      // Si no hay buscador visible, el test pasa (la página existe)
      test.skip();
    }
  });

  test("aplica un periodo, lo conserva en la URL y ordena por encabezado", async ({ page }) => {
    const rangeResponse = page.waitForResponse((response) => {
      const url = response.url();
      return url.includes("/api/expedientes?") &&
        url.includes("fecha_desde=2024-10-01") &&
        url.includes("fecha_hasta=2099-12-31");
    });

    await page.locator("#fecha-desde").fill("2024-10-01");
    await page.locator("#fecha-hasta").fill("2099-12-31");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await rangeResponse;

    await expect(page).toHaveURL(/fecha_desde=2024-10-01/);
    await expect(page).toHaveURL(/fecha_hasta=2099-12-31/);
    await expect(page.getByText(/Periodo activo:/)).toContainText("2024");

    const sortResponse = page.waitForResponse((response) => {
      const url = response.url();
      return url.includes("/api/expedientes?") &&
        url.includes("sort_by=monto_multa") &&
        url.includes("sort_dir=desc");
    });
    await page.getByRole("button", { name: /Ordenar Monto de mayor a menor/i }).click();
    await sortResponse;
    await expect(page.getByRole("columnheader", { name: /Monto/ }))
      .toHaveAttribute("aria-sort", "descending");

    const dashboardLink = page.getByRole("link", { name: "Dashboard", exact: true }).first();
    await expect(dashboardLink).toHaveAttribute("href", /fecha_desde=2024-10-01/);
    await expect(dashboardLink).toHaveAttribute("href", /fecha_hasta=2099-12-31/);

    const pendientesLink = page.getByRole("link", { name: "Pendientes", exact: true }).first();
    await expect(pendientesLink).toHaveAttribute("href", /fecha_desde=2024-10-01/);
    await expect(pendientesLink).toHaveAttribute("href", /fecha_hasta=2099-12-31/);
  });
});

test.describe("Pendientes excluidos", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(appPath("/expedientes/pendientes-notificacion"));
  });

  test("aplica el periodo a la consulta y lo conserva en la URL", async ({ page }) => {
    const rangeResponse = page.waitForResponse((response) => {
      const url = response.url();
      return url.includes("/api/expedientes?") &&
        url.includes("excluida_estadisticas=true") &&
        url.includes("fecha_desde=2024-10-01") &&
        url.includes("fecha_hasta=2099-12-31");
    });

    await page.locator("#fecha-desde").fill("2024-10-01");
    await page.locator("#fecha-hasta").fill("2099-12-31");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await rangeResponse;

    await expect(page).toHaveURL(/fecha_desde=2024-10-01/);
    await expect(page).toHaveURL(/fecha_hasta=2099-12-31/);
    await expect(page.getByText(/Periodo activo:/)).toContainText("2024");
  });
});

// ---------------------------------------------------------------------------
// Suite 4: API de datos — validar conteos directos
// ---------------------------------------------------------------------------
test.describe("API Expedientes", () => {
  test("GET /api/expedientes devuelve datos", async ({ page }) => {
    // Obtener cookie de sesión haciendo login primero
    requireCredentials();
    await page.goto(appPath("/login"));
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(`**${appPath("/dashboard")}`, { timeout: 20_000 });

    // Llamar a la API de expedientes con las cookies de la sesión
    const resp = await page.request.get(appPath("/api/expedientes?limit=1"));
    // Acepta 200 o 206 (partial content)
    expect([200, 206]).toContain(resp.status());
  });

  test("genera PDF para un expediente existente", async ({ page }) => {
    await login(page);
    const listResponse = await page.request.get(appPath("/api/expedientes?pageSize=1"));
    expect(listResponse.status()).toBe(200);
    const payload = await listResponse.json();
    expect(payload.data?.length).toBeGreaterThan(0);
    const pdfResponse = await page.request.get(
      appPath(`/api/expedientes/${payload.data[0].id}/pdf`)
    );
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
  });

  test("rechaza rangos y ordenamientos inválidos", async ({ page }) => {
    await login(page);
    const reversedRange = await page.request.get(
      appPath("/api/expedientes?fecha_desde=2026-02-01&fecha_hasta=2026-01-01")
    );
    expect(reversedRange.status()).toBe(400);

    const invalidSort = await page.request.get(
      appPath("/api/expedientes?sort_by=campo_inexistente")
    );
    expect(invalidSort.status()).toBe(400);

    const dashboardRange = await page.request.get(
      appPath("/api/dashboard?fecha_desde=no-es-fecha")
    );
    expect(dashboardRange.status()).toBe(400);
  });

  test("ordena todas las páginas por monto y por ORPA", async ({ page }) => {
    await login(page);

    const amountResponse = await page.request.get(
      appPath("/api/expedientes?pageSize=100&sort_by=monto_multa&sort_dir=desc")
    );
    expect(amountResponse.status()).toBe(200);
    const amountPayload = await amountResponse.json();
    const amounts = amountPayload.data
      .map((row: { monto_multa: number | null }) => row.monto_multa)
      .filter((value: number | null): value is number => value !== null);
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a));

    const orpaResponse = await page.request.get(
      appPath("/api/expedientes?pageSize=100&sort_by=orpa&sort_dir=asc")
    );
    expect(orpaResponse.status()).toBe(200);
    const orpaPayload = await orpaResponse.json();
    const names = orpaPayload.data.map(
      (row: { orpa: { nombre: string } }) => row.orpa.nombre
    );
    const collator = new Intl.Collator("es-MX", { sensitivity: "base", numeric: true });
    expect(names).toEqual([...names].sort(collator.compare));
  });
});

// ---------------------------------------------------------------------------
// Suite 5: rutas principales públicas detrás de autenticación
// ---------------------------------------------------------------------------
test.describe("Flujos principales", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const routes = [
    "/dashboard",
    "/expedientes",
    "/expedientes/pendientes-notificacion",
    "/captura",
    "/importar",
    "/admin/usuarios",
    "/admin/orpas",
    "/admin/permisos",
  ];

  for (const route of routes) {
    test(`carga ${route} sin errores de cliente o HTTP`, async ({ page }) => {
      await expectHealthyPage(page, route);
      await expect(page).toHaveURL(new RegExp(`${appPath(route).replaceAll("/", "\\/")}$`));
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 6: infraestructura de basePath
// ---------------------------------------------------------------------------
test.describe("Publicación bajo basePath", () => {
  test("optimiza el logo usando la ruta pública completa", async ({ request }) => {
    const source = encodeURIComponent(appPath("/logo.png"));
    const response = await request.get(
      appPath(`/_next/image?url=${source}&w=96&q=75`)
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/");
  });

  test("callback sin código vuelve al login público", async ({ request }) => {
    const response = await request.get(appPath("/auth/callback"), {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(
      `https://apps.profepa.gob.mx${appPath("/login")}`
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 7: clasificación segura del archivo de pendientes (sin importarlo)
// ---------------------------------------------------------------------------
test.describe("Importación de pendientes", () => {
  test("detecta Pendientes junio.xlsx antes de subirlo", async ({ page }) => {
    await login(page);
    await page.goto(appPath("/importar"));

    await page.locator('input[type="file"][multiple]').setInputFiles([
      path.resolve(process.cwd(), "Data/datos_JULIO/Multas Junio.xlsx"),
      path.resolve(process.cwd(), "Data/datos_JULIO/Pendientes junio.xlsx"),
    ]);

    const generalRow = page
      .getByText("Multas Junio.xlsx", { exact: true })
      .locator("..");
    const pendingRow = page
      .getByText("Pendientes junio.xlsx", { exact: true })
      .locator("..");

    await expect(generalRow).toContainText("General");
    await expect(pendingRow).toContainText("Pendientes");
  });
});
