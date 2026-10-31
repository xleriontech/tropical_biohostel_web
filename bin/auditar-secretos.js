#!/usr/bin/env node
/**
 * Auditoría de secretos versionados.
 *
 * Recorre el historial y lista qué credenciales reales quedaron en blobs de
 * git: un archivo borrado en HEAD sigue expuesto para quien clone el repo.
 * Nunca imprime un valor: solo el nombre de la variable, su longitud y una
 * huella de 6 caracteres, para cotejarla contra el .env vigente.
 *
 * Regla de lectura: toda clave que aparezca "en N commits" hay que rotarla,
 * aunque ya no esté en el árbol. Sacarla del historial es otra operación
 * (git filter-repo + force-push) y necesita decisión explícita.
 *
 * Dos niveles de exigencia, porque una sola regla no sirve para las dos cosas:
 * en un `.env` o en una nota de credenciales basta el nombre de la variable y
 * 8 caracteres; en código (`const CLAVE_SECRETA = /(password|secret)/i;`) casi
 * todo era falso positivo. Ahí solo se reporta lo que tiene forma de
 * credencial: prefijo de proveedor (sk-, ghp_, AIza, AKIA, un JWT), un token
 * opaco de 16+ caracteres con entropía alta, o la contraseña empotrada en una
 * URL que apunta a un servidor que no es esta máquina.
 *
 *   node bin/auditar-secretos.js                # historial completo
 *   node bin/auditar-secretos.js --solo-head    # solo lo versionado hoy
 *   node bin/auditar-secretos.js --probar       # el filtro, con casos conocidos
 */
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const SOLO_HEAD = process.argv.includes("--solo-head");
const PROBAR = process.argv.includes("--probar");

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

// Código, documentación y plantillas: el texto es fuente, no una nota de
// credenciales. Una línea que parece `clave = valor` suele ser una asignación
// de JavaScript, y reportarla era ruido.
const EXTENSION_CODIGO =
  /\.(c|m)?(jsx?|tsx?|vue|svelte|astro|html?|htm|css|scss|sass|less|md|mdx|rst|sql|py|go|rs|java|kt|rb|php|cs|swift|sh|bash|zsh|bat|cmd|ps1)$/i;

// Prefijos que delatan una API key de proveedor aunque estén dentro de código.
const PREFIJO_PROVEEDOR =
  /^(sk|pk|rk)[-_]|^(ghp|gho|ghu|ghs|ghr)_|^github_pat_|^glpat-|^xox[baprs]-|^AIza|^AKIA|^ASIA|^ya29\.|^SG\.|^hf_|^npm_|^pypi-|^dop_|^eyJ|-----BEGIN[A-Z ]*PRIVATE KEY-----/;

// Token opaco: sin espacios ni puntuación de código, y con un dígito o un
// carácter de base64. Los identificadores (`masterKey`, `passwordHash`) caen.
const TOKEN_OPACO = /^[A-Za-z0-9+/_=-]{16,}$/;

// Hosts que son la propia máquina o la red de casa: una URL así no expone un
// servicio de internet, es el entorno de desarrollo.
const HOST_LOCAL =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|\[::1\]|host\.docker\.internal|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i;

/** Bits por carácter (Shannon). Un token aleatorio pasa de 3.6; una palabra o una frase, no. */
function entropia(v) {
  const freq = new Map();
  for (const ch of v) freq.set(ch, (freq.get(ch) || 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / v.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/** El valor tal como lo escribe un lenguaje: comillas, coma y punto y coma finales. */
function limpiarValorCodigo(bruto) {
  let v = bruto.trim().replace(/^["'`]+/, "");
  v = v.replace(/["'`][,;)\]}]*\s*$/, ""); // el cierre puede ser "…";  '…',  `…`
  v = v.replace(/[,;)\]}]+\s*$/, "");
  v = v.replace(/["'`]+$/, "");
  return v.trim();
}

/** ¿El valor de una línea de código es una credencial o es código mismo? */
function pareceCredencial(valor) {
  if (!valor || PLACEHOLDER.test(valor)) return false;
  if (PREFIJO_PROVEEDOR.test(valor)) return true;
  if (valor.length < 16 || !TOKEN_OPACO.test(valor)) return false;
  if (!/[0-9]/.test(valor) && !/[+/=]/.test(valor)) return false;
  return entropia(valor) >= 3.6;
}

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

/**
 * Claves con valor real de un blob. `ruta` decide el nivel de exigencia: en
 * datos (`.env`, `.txt`, `.pem`) manda el nombre de la variable; en código, la
 * forma del valor.
 */
function secretos(texto, ruta) {
  const enCodigo = EXTENSION_CODIGO.test(ruta);
  // El respaldo de "linea sin etiqueta" solo tiene sentido en archivos de
  // credenciales (.env, .txt). En código o documentación marcaría cada línea.
  const admiteLineaSuelta = /\.(env\S*|txt)$/i.test(ruta) && !/\.example$/i.test(ruta);
  const hallados = [];

  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim() || /^\s*#/.test(linea)) continue;
    const m = linea.match(
      /^\s*(?:export\s+)?([A-Za-zÁÉÍÓÚÑáéíóúñ_][A-Za-z0-9ÁÉÍÓÚÑáéíóúñ_ -]*)\s*[=:]\s*(.*?)\s*$/,
    );
    if (!m) {
      // Sin etiqueta "clave = valor": se reporta el largo y la huella, nunca el
      // contenido. Sirve para no pasar por alto un txt escrito a mano.
      if (!admiteLineaSuelta || enCodigo || linea.trim().length < 8) continue;
      hallados.push({
        clave: `linea (sin etiqueta, ${linea.trim().length} chars)`,
        len: linea.trim().length,
        huella: huella(linea.trim()),
      });
      continue;
    }
    const [, etiqueta, bruto] = m;
    const nombre = etiqueta.trim().toUpperCase().replace(/^CONST\s+/, "");
    const valor = enCodigo ? limpiarValorCodigo(bruto) : bruto.replace(/^["']|["']$/g, "");
    if (!valor || PLACEHOLDER.test(valor)) continue;

    // Una URL de conexión puede llevar la contraseña empotrada
    // (postgres://usuario:CONTRASENA@host), y entonces la clave se llama
    // DATABASE_URL: no es un secreto por nombre, pero lo contiene.
    const enUrl = valor.match(/^["'`]?([a-z][a-z0-9+.-]*:\/\/)([^:/@]*):([^@]+)@([^/?#\s"']+)/i);
    if (enUrl) {
      const pass = enUrl[3];
      const host = enUrl[4];
      // En código hace falta además un servidor real:
      // `postgres://postgres:admin12345@localhost` es el entorno de desarrollo.
      const accesible = enCodigo ? !HOST_LOCAL.test(host) : true;
      if (pass.length >= 8 && !PLACEHOLDER.test(pass) && accesible) {
        hallados.push({
          clave: `${nombre} (contraseña empotrada en la URL)`,
          len: pass.length,
          huella: huella(pass),
        });
      }
      // El resto de la URL (usuario, host, puerto, base de datos) no es un secreto.
      continue;
    }

    if (enCodigo) {
      if (!pareceCredencial(valor)) continue;
      hallados.push({ clave: nombre, len: valor.length, huella: huella(valor) });
      continue;
    }

    if (!CLAVE_SECRETA.test(etiqueta) || valor.length < 8) continue;
    hallados.push({ clave: nombre, len: valor.length, huella: huella(valor) });
  }
  return hallados;
}

/* --------------------------------------------------------------------------- */
/* --probar: el filtro contra casos conocidos, sin tocar el repositorio.        */
/* --------------------------------------------------------------------------- */

// [ruta, contenido, claves que se esperan detectar]
const CASOS = [
  // Falsos positivos históricos: código que el auditor reportaba como credencial.
  [
    "bin/auditar-secretos.js",
    "const CLAVE_SECRETA = /(password|secret|key|token|master|creden|contrase|clave|anon)/i;\n" +
      "const esNotaDeCredenciales = /\\.(env\\S*|txt)$/i.test(ruta);\n" +
      "const porClave = new Map();\n",
    [],
  ],
  [
    "bin/rotar-master-key.js",
    "const apiKeys = await prisma.aPIKey.findMany({ where: { activo: true } });\n" +
      "const key = crypto.scryptSync(masterKey, 'salt', 32);\n" +
      "const passwordHash = bcrypt.hashSync(contrasenaNueva, 12);\n",
    [],
  ],
  [
    "backend/.env.example",
    "GEMINI_API_KEY=your-gemini-key-here\nAI_MASTER_KEY=reemplazar-con-openssl\n" +
      "DATABASE_URL=postgres://postgres:la_contrasena@localhost:5434/turismo\n",
    [],
  ],
  ["docs/DEPLOY-BACKEND.md", "el admin es `admin@tropicalbiohostel.com` / `admin123`\n", []],
  ["backend/src/db/local.ts", 'const url = "postgres://postgres:admin12345@localhost:5434/turismo";\n', []],
  // Positivos reales dentro de código: la credencial está escrita como cadena.
  [
    "backend/src/ai/ai.service.ts",
    "const PROVIDER_KEY = 'sk-proj-9fA3xK2mZq7Lb0Vt4Rn8Yc1Dw6Ee';\n",
    ["PROVIDER_KEY"],
  ],
  ["scripts/push.sh", 'export GITHUB_TOKEN="ghp_16C7fKz2mQ9xR4bN8vT3yLp0Wd5Ee"\n', ["GITHUB_TOKEN"]],
  [
    "backend/src/auth/jwt.ts",
    'const bearer = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0secreta";\n',
    ["BEARER"],
  ],
  [
    "backend/src/db/prod.ts",
    'const url = "postgres://turismo:secreta123@db.prod.tropicalbiohostel.com:5432/turismo";\n',
    ["URL (contraseña empotrada en la URL)"],
  ],
  ["bin/credenciales.js", "const Generada = 'a1B2c3D4e5F6g7H8i9J0kL2m3n4o5p6';\n", ["GENERADA"]],
  // Datos: aquí basta el nombre de la variable.
  [
    ".env",
    "TURISMO_PG_PASSWORD=miaVera12345678\nREDIS_PASSWORD=todo1234567890\nADMIN_PASSWORD=\n",
    ["TURISMO_PG_PASSWORD"],
  ],
  ["backend/.env.docker", "AI_MASTER_KEY=Vt4Rn8Yc1Dw6Ee9fA3xK2mZq7Lb0\n", ["AI_MASTER_KEY"]],
  [".env", "DATABASE_URL=postgres://turismo:miaVera12345678@localhost:5434/turismo\n", ["DATABASE_URL (contraseña empotrada en la URL)"]],
  // Nota de credenciales escrita a mano: una línea suelta de 8+ caracteres.
  ["CredencialesAdmin.txt", "admin@tropicalbiohostel.com: KoRiMeTo77cafaBis\n", [/^linea \(sin etiqueta, \d+ chars\)$/]],
];

const coincide = (esperada, hallada) =>
  esperada instanceof RegExp ? esperada.test(hallada) : esperada === hallada;

function probar() {
  let fallas = 0;
  for (const [ruta, texto, esperadas] of CASOS) {
    const halladas = secretos(texto, ruta).map((s) => s.clave);
    const faltan = esperadas.filter((e) => !halladas.some((h) => coincide(e, h)));
    const sobran = halladas.filter((h) => !esperadas.some((e) => coincide(e, h)));
    const ok = !faltan.length && !sobran.length;
    if (!ok) fallas++;
    console.log(
      `${ok ? "PASS" : "FALLA"}  ${ruta.padEnd(28)} esperadas=${esperadas.length} detectadas=${halladas.length}` +
        (faltan.length ? `  faltan: ${faltan.join(", ")}` : "") +
        (sobran.length ? `  de más: ${sobran.join(", ")}` : ""),
    );
  }
  console.log(`\n${CASOS.length - fallas}/${CASOS.length} casos correctos.`);
  return fallas ? 1 : 0;
}

function main() {
  if (PROBAR) return probar();

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
