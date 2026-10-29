#!/usr/bin/env node
/**
 * Auditoría de secretos versionados.
 *
 * Recorre el historial y lista qué credenciales reales quedaron en blobs de
 * git: un archivo borrado en HEAD sigue expuesto para quien clone el repo.
 * Nunca imprime un valor: solo el nombre de la variable, su longitud y una
 * huella de 6 caracteres, para cotejarla contra el .env vigente.
 *
 *   node bin/auditar-secretos.js                # historial completo
 *   node bin/auditar-secretos.js --solo-head    # solo lo versionado hoy
 *
 * Regla de lectura: toda clave que aparezca "en N commits" hay que rotarla,
 * aunque ya no esté en el árbol. Sacarla del historial es otra operación
 * (git filter-repo + force-push) y necesita decisión explícita.
 */
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const SOLO_HEAD = process.argv.includes("--solo-head");

const git = (args) =>
  execFileSync("git", args, {
    cwd: RAIZ,
    encoding: "utf8",
    maxBuffer: 64e6,
    stdio: ["ignore", "pipe", "ignore"], // el "path not in commit" esperado no es un error
  });

const huella = (v) => crypto.createHash("sha256").update(v).digest("hex").slice(0, 6);

// Nombres de archivo que suelen guardar credenciales.
const RUTA_SENSIBLE = /(\.env|credencial|secret|\.pem$|\.key$|password|contrase|token|api[_-]?key|master)/i;
// Nombres de variable cuyo valor es un secreto.
const CLAVE_SECRETA = /(password|secret|key|token|master|creden|contrase|clave|anon)/i;
// Valores de ejemplo: no son credenciales reales.
const PLACEHOLDER =
  /^(your-|tu-|reemplazar|la_contrasena|change[-_]this|cambiame|example|ejemplo|xxx+|todo|<|\*+|''|""$)/i;

function rutasSensibles() {
  const salida = git(["log", "--all", "--pretty=format:", "--name-only", "--diff-filter=ACM"])
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return [...new Set(salida)].filter((r) => RUTA_SENSIBLE.test(r));
}

function commitsDe(ruta) {
  if (SOLO_HEAD) return [git(["rev-parse", "HEAD"]).trim()];
  return git(["log", "--all", "--format=%H", "--", ruta]).trim().split("\n").filter(Boolean);
}

function blob(ruta, commit) {
  try {
    return git(["show", `${commit}:${ruta}`]);
  } catch {
    return null;
  }
}

/** Claves con valor real de un archivo de entorno o de credenciales. */
function secretos(texto, ruta) {
  // El respaldo de "linea sin etiqueta" solo tiene sentido en archivos de
  // credenciales (.env, .txt). En código o documentación marcaría cada línea.
  const esNotaDeCredenciales = /\.(env\S*|txt)$/i.test(ruta) && !/\.example$/i.test(ruta);
  const hallados = [];
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim() || /^\s*#/.test(linea)) continue;
    const m = linea.match(
      /^\s*(?:export\s+)?([A-Za-zÁÉÍÓÚÑáéíóúñ_][A-Za-z0-9ÁÉÍÓÚÑáéíóúñ_ -]*)\s*[=:]\s*(.+?)\s*$/,
    );
    if (!m) {
      // Sin etiqueta "clave = valor": se reporta el largo y la huella, nunca el
      // contenido. Sirve para no pasar por alto un txt escrito a mano.
      if (!esNotaDeCredenciales || linea.trim().length < 8) continue;
      hallados.push({
        clave: `linea (sin etiqueta, ${linea.trim().length} chars)`,
        len: linea.trim().length,
        huella: huella(linea.trim()),
      });
      continue;
    }
    const [, etiqueta, bruto] = m;
    const valor = bruto.replace(/^["']|["']$/g, "");
    if (!valor || PLACEHOLDER.test(valor)) continue;

    // Una URL de conexión puede llevar la contraseña empotrada
    // (postgres://usuario:CONTRASENA@host), y entonces la clave se llama
    // DATABASE_URL: no es un secreto por nombre, pero lo contiene.
    const enUrl = valor.match(/^[a-z][a-z0-9+.-]*:\/\/[^:/@]*:([^@]+)@/i);
    if (enUrl) {
      const pass = enUrl[1];
      if (pass.length >= 8 && !PLACEHOLDER.test(pass)) {
        hallados.push({
          clave: `${etiqueta.toUpperCase()} (contraseña empotrada en la URL)`,
          len: pass.length,
          huella: huella(pass),
        });
      }
      // El resto de la URL (host, puerto, base de datos) no es un secreto.
      continue;
    }

    if (!CLAVE_SECRETA.test(etiqueta) || valor.length < 8) continue;
    hallados.push({
      clave: etiqueta.trim().toUpperCase(),
      len: valor.length,
      huella: huella(valor),
    });
  }
  return hallados;
}

function main() {
  const head = git(["rev-parse", "HEAD"]).trim();
  const rutas = rutasSensibles();
  if (!rutas.length) {
    console.log("Sin rutas con pinta de guardar credenciales en el historial.");
    return 0;
  }

  // Lo que sigue versionado en HEAD, por ruta y huella.
  const vigentes = new Set();
  for (const r of rutas) {
    const t = blob(r, head);
    if (!t) continue;
    for (const s of secretos(t, r)) vigentes.add(`${r}|${s.clave}|${s.huella}`);
  }

  const filas = [];
  for (const ruta of rutas) {
    const porClave = new Map();
    for (const c of commitsDe(ruta)) {
      const t = blob(ruta, c);
      if (!t) continue;
      for (const s of secretos(t, ruta)) {
        const k = `${s.clave}|${s.huella}`;
        if (!porClave.has(k)) porClave.set(k, { ...s, commits: 0 });
        porClave.get(k).commits++;
      }
    }
    for (const s of porClave.values()) {
      filas.push({ ruta, ...s, enHead: vigentes.has(`${ruta}|${s.clave}|${s.huella}`) });
    }
  }

  if (!filas.length) {
    console.log("No se detectaron valores reales en las rutas sensibles versionadas.");
    return 0;
  }

  let rutaActual = null;
  for (const f of filas.sort(
    (a, b) => a.ruta.localeCompare(b.ruta) || a.clave.localeCompare(b.clave),
  )) {
    if (f.ruta !== rutaActual) {
      rutaActual = f.ruta;
      console.log(`\n${rutaActual}`);
    }
    const estado = f.enHead ? "versionada hoy" : "borrada del árbol, sigue en el historial";
    console.log(
      `  ${f.clave.padEnd(28)} len=${String(f.len).padStart(3)}  huella=${f.huella}  ` +
        `en ${f.commits} commit${f.commits === 1 ? "" : "s"}  · ${estado}`,
    );
  }

  const unicas = new Set(filas.map((f) => `${f.clave}|${f.huella}`));
  console.log(
    `\n${unicas.size} credencial(es) real(es) alcanzables en el historial: todas hay que rotarlas.` +
      (SOLO_HEAD ? "" : " Borrarlas del historial exige reescribirlo y empujar forzado."),
  );
  return 0;
}

process.exit(main());
