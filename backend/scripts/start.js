/**
 * Arranque del backend.
 *
 * Antes de levantar la API se asegura que la base de datos esté lista:
 *   1) baseline  → registra la migración inicial en bases preexistentes
 *   2) migrate   → aplica las migraciones pendientes (crea el esquema si falta)
 *   3) seed      → inserta los datos base del catálogo (p. ej. las rutas del café)
 *
 * Los tres pasos son idempotentes y tolerantes a fallos: si la base aún no
 * responde se reintenta y la API arranca igual, de modo que un arranque no
 * se rompe por un problema puntual de conectividad. Funciona en Windows, Linux
 * y dentro de Docker.
 */
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const SEED = path.join(RAIZ, "prisma", "dist", "seed.js");
const BASELINE = path.join(RAIZ, "prisma", "baseline.js");
const MAIN = path.join(RAIZ, "dist", "main.js");
const INTENTOS = 5;
const ESPERA_MS = 5000;

const esWindows = process.platform === "win32";
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ejecuta un comando de Node. Devuelve true si terminó con código 0. */
function ejecutarNode(args) {
  const r = spawnSync(process.execPath, args, { stdio: "inherit" });
  return r.status === 0;
}

/** Ejecuta la CLI de Prisma (npx). Devuelve true si terminó con código 0. */
function ejecutarPrisma(args) {
  const r = spawnSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    shell: esWindows,
  });
  return r.status === 0;
}

/** Repite un paso hasta INTENTOS veces. Devuelve true si alguno funcionó. */
async function conReintentos(nombre, fn) {
  for (let i = 1; i <= INTENTOS; i++) {
    if (fn()) {
      if (i > 1) console.log(`✅ ${nombre}: aplicado en el intento ${i}.`);
      return true;
    }
    console.warn(`⚠️  ${nombre}: falló (intento ${i}/${INTENTOS}). Reintentando…`);
    if (i < INTENTOS) await dormir(ESPERA_MS);
  }
  console.warn(`⚠️  ${nombre}: no se pudo aplicar. La API arranca igual.`);
  return false;
}

async function prepararBaseDeDatos() {
  // 1) Baseline: solo hace falta en bases creadas antes de existir las migraciones.
  if (fs.existsSync(BASELINE)) {
    await conReintentos("baseline", () => ejecutarNode([BASELINE]));
  }

  // 2) Migraciones: crean el esquema si falta y aplican los cambios pendientes.
  await conReintentos("migraciones", () => ejecutarPrisma(["migrate", "deploy"]));

  // 3) Seed: asegura el catálogo (hostal, actividades, rutas del café…).
  if (fs.existsSync(SEED)) {
    await conReintentos("seed", () => ejecutarNode([SEED]));
  } else {
    console.warn("⚠️  prisma/dist/seed.js no encontrado: se omite el seed.");
  }
}

function levantarApi() {
  const hijo = spawn(process.execPath, [MAIN], { stdio: "inherit" });
  ["SIGINT", "SIGTERM"].forEach((senal) => {
    process.on(senal, () => hijo.kill(senal));
  });
  hijo.on("exit", (codigo, senal) => {
    process.exit(senal ? 1 : codigo ?? 0);
  });
}

prepararBaseDeDatos().then(levantarApi);
