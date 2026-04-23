/**
 * Sweet Café QA — Global Setup de Autenticación
 *
 * Se ejecuta UNA VEZ antes de todos los tests.
 * Hace login en Odoo 19 y guarda el storageState (cookies de sesión)
 * en un archivo JSON para que todos los tests de backend lo reutilicen
 * sin necesidad de loguear en cada test.
 *
 * Referencia Odoo: odoo-19.0/odoo/addons/web/controllers/session.py
 */

import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Compatibilidad ESM — package.json tiene "type": "module"
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const ODOO_URL = process.env.ODOO_URL || "http://localhost:8069";
const ADMIN_EMAIL = process.env.ODOO_ADMIN_EMAIL || "admin";
const ADMIN_PASSWORD = process.env.ODOO_ADMIN_PASSWORD || "admin";
const STATE_FILE = path.resolve(__dirname, "../../.auth/admin.json");

async function globalSetup(_config: FullConfig) {
  // Crear directorio de auth si no existe
  const authDir = path.dirname(STATE_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log(`\n🔐 Global setup: autenticando en ${ODOO_URL}...`);

  try {
    const dbName = process.env.ODOO_DB || "prueba";

    // Navegar al login de Odoo, forzando la DB en la query
    await page.goto(`${ODOO_URL}/web/login?db=${encodeURIComponent(dbName)}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Si vemos el database manager, navegar al login específico de la DB
    const dbList = page.locator(".o_database_list").first();
    if (await dbList.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Intentar entrar a la DB específica
      await page.goto(
        `${ODOO_URL}/web/database/selector?db=${encodeURIComponent(dbName)}`,
        {
          waitUntil: "domcontentloaded",
        },
      );
    }

    // Esperar input de login (puede estar oculto con d-none si DB manager activo)
    const loginInput = page.locator("input[name='login'], #login").first();
    await loginInput.waitFor({ state: "attached", timeout: 15000 });

    // Si el formulario está oculto (d-none), removerlo vía JS
    await page.evaluate(() => {
      document.querySelectorAll(".oe_login_form, form").forEach((el) => {
        el.classList.remove("d-none");
        (el as HTMLElement).style.display = "block";
      });
    });

    // Seleccionar la base de datos si hay selector (multi-DB)
    const dbSelect = page.locator("select[name='db']");
    if (await dbSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dbSelect.selectOption(dbName).catch(() => {});
    }

    // Llenar credenciales (force porque puede estar parcialmente oculto)
    await loginInput.fill(ADMIN_EMAIL, { force: true });
    await page
      .locator("input[name='password'], #password")
      .first()
      .fill(ADMIN_PASSWORD, { force: true });
    await page
      .locator(
        ".oe_login_form button[type='submit'], form[action='/web/login'] button[type='submit']",
      )
      .first()
      .click({ force: true });

    // Esperar que Odoo 19 cargue el home — puede ir a /odoo o /web
    await page.waitForFunction(
      () => {
        const url = window.location.pathname;
        return url.startsWith("/odoo") || url === "/web" || url === "/";
      },
      { timeout: 30000 },
    );

    // Esperar que el cliente web de Odoo esté listo
    await page
      .waitForSelector(".o_home_menu, .o_main_navbar, .o_action_manager", {
        timeout: 30000,
      })
      .catch(() => {
        // Continuar aunque no aparezca el menú exacto
        console.log("  ⚠️  Navbar no detectado, continuando...");
      });

    // Guardar el estado de autenticación (cookies + localStorage)
    await context.storageState({ path: STATE_FILE });

    const finalUrl = page.url();
    console.log(`  ✅ Login exitoso → ${finalUrl}`);
    console.log(`  💾 storageState guardado en ${STATE_FILE}`);
  } catch (err) {
    console.error(`  ❌ Error en global setup: ${err}`);
    // Guardar captura de pantalla del error
    await page.screenshot({
      path: path.resolve(__dirname, "../../reports/setup-error.png"),
    });
    throw err;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
