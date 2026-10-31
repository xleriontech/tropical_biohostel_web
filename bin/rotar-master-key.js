#!/usr/bin/env node
/**
 * Rota AI_MASTER_KEY y vuelve a cifrar con la nueva las credenciales que ya
 * están en la base.
 *
 * Durante varias versiones la master key estuvo escrita en backend/.env.docker
 * (esa ruta ya se purgó del historial), así que quien tuviera ese clon puede
 * descifrar APIKey.key y ClaveApi.valor. Rotarla
 * sin recifrar deja la app inservible (decrypt() lanza con un ciphertext de la
 * clave anterior), y recifrar sin rotar no sirve de nada: los dos van juntos.
 *
 *   node bin/rotar-master-key.js            # ensayo: no escribe nada
 *   node bin/rotar-master-key.js --aplicar  # recifra y actualiza los .env
 *
 * Nunca imprime un valor: solo longitudes y huellas. Antes de tocar los .env
 * guarda una copia en .rotacion-backup/ (fuera de git) con la clave anterior,
 * que es lo único que puede volver a leer los datos si algo sale mal.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..');
const APLICAR = process.argv.includes('--aplicar');
const ENVS = ['backend/.env', '.env', 'backend/.env.docker'];
const RESPALDOS = path.join(RAIZ, '.rotacion-backup');

const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const existe = (p) => fs.existsSync(path.join(RAIZ, p));
const huella = (v) => crypto.createHash('md5').update(v).digest('hex').slice(0, 8);

/** Leo una clave de un archivo de entorno sin imprimir su valor. */
function leo(p, clave) {
  if (!existe(p)) return null;
  const m = leer(p).match(new RegExp(`^${clave}=(\\S+)`, 'm'));
  return m ? m[1] : null;
}

function escribir(p, t) {
  fs.writeFileSync(path.join(RAIZ, p), t, 'utf8');
}

function reemplazar(p, clave, valor) {
  let t = leer(p);
  const re = new RegExp(`^${clave}=.*$`, 'm');
  if (!re.test(t)) return false;
  t = t.replace(re, `${clave}=${valor}`);
  escribir(p, t);
  return true;
}

// El mismo esquema que usa backend/src/ai/ai.service.ts: AES-256-CBC con la
// clave derivada por scrypt y el IV en texto hexadecimal antes de los dos
// puntos. Si esto cambia allí, hay que cambiarlo aquí.
const descifrar = (masterKey, texto) => {
  if (!texto.includes(':')) return texto; // guardado en claro antes del cifrado
  const key = crypto.scryptSync(masterKey, 'salt', 32);
  const [ivHex, encHex] = texto.split(':');
  const d = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([d.update(Buffer.from(encHex, 'hex')), d.final()]).toString('utf8');
};

const cifrar = (masterKey, texto) => {
  const key = crypto.scryptSync(masterKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const c = crypto.createCipheriv('aes-256-cbc', key, iv);
  return iv.toString('hex') + ':' + Buffer.concat([c.update(texto, 'utf8'), c.final()]).toString('hex');
};

async function main() {
  // DATABASE_URL: la lee Prisma del entorno, así que se la damos desde los
  // mismos archivos de entorno que usa el backend.
  for (const p of ['backend/.env', '.env']) {
    if (!existe(p)) continue;
    for (const linea of leer(p).split(/\r?\n/)) {
      const m = linea.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }

  const anterior =
    leo('backend/.env', 'AI_MASTER_KEY') || leo('.env', 'AI_MASTER_KEY');
  if (!anterior) {
    console.error('No encuentro AI_MASTER_KEY en backend/.env ni en .env.');
    return 1;
  }
  const nueva = crypto.randomBytes(48).toString('base64');

  console.log(`AI_MASTER_KEY actual: len=${anterior.length} huella=${huella(anterior)}`);
  console.log(`AI_MASTER_KEY nueva : len=${nueva.length} huella=${huella(nueva)}`);
  console.log(APLICAR ? '\nModo APLICAR: se escriben la base y los .env.\n' : '\nModo ENSAYO: no se escribe nada.\n');

  const { PrismaClient } = require(path.join(RAIZ, 'backend', 'node_modules', '@prisma', 'client'));
  const prisma = new PrismaClient();

  const apiKeys = await prisma.aPIKey.findMany({ select: { id: true, key: true, provider: { select: { name: true } } } });
  const claves = await prisma.claveApi.findMany({ select: { id: true, clave: true, valor: true } });

  // 1) Verificar que la clave actual abre todo ANTES de escribir nada.
  const trabajo = [];
  let enClaro = 0;
  for (const r of apiKeys) {
    if (!r.key.includes(':')) { enClaro++; continue; }
    trabajo.push({ tabla: 'APIKey', id: r.id, campo: 'key', columnas: { key: 'key' }, texto: r.key, etiqueta: r.provider?.name || r.id });
  }
  for (const r of claves) {
    if (!r.valor.includes(':')) { enClaro++; continue; }
    trabajo.push({ tabla: 'ClaveApi', id: r.id, campo: 'valor', columnas: { valor: 'valor' }, texto: r.valor, etiqueta: r.clave });
  }

  let fallas = 0;
  const llanos = [];
  for (const t of trabajo) {
    try {
      const claro = descifrar(anterior, t.texto);
      const nuevoTexto = cifrar(nueva, claro);
      // Idempotencia: lo que escribe tiene que volver a abrir con la nueva.
      if (descifrar(nueva, nuevoTexto) !== claro) throw new Error('no reabre con la clave nueva');
      llanos.push({ ...t, nuevoTexto });
      console.log(`  ok    ${t.tabla}/${t.etiqueta}`);
    } catch (e) {
      fallas++;
      console.log(`  FALLA ${t.tabla}/${t.etiqueta}: ${e.message}`);
    }
  }

  console.log(`\n${trabajo.length} credenciales cifradas, ${fallas} sin poder descifrar, ${enClaro} guardadas en claro.`);
  if (fallas) {
    console.error('Se interrumpe sin escribir: ninguna fila cambió. Revisá qué AI_MASTER_KEY está en uso.');
    await prisma.$disconnect();
    return 1;
  }
  if (!APLICAR) {
    console.log('Ensayo conforme. Corré con --aplicar para rotar de verdad.');
    await prisma.$disconnect();
    return 0;
  }

  // 2) Respaldo de los .env con la clave anterior (0600, fuera de git).
  fs.mkdirSync(RESPALDOS, { recursive: true, mode: 0o700 });
  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  for (const p of ENVS) {
    if (!existe(p) || !leo(p, 'AI_MASTER_KEY')) continue;
    const destino = path.join(RESPALDOS, `${p.replace(/[\\/]/g, '_')}.${marca}`);
    fs.writeFileSync(destino, leer(p), { mode: 0o600 });
  }
  console.log(`\nCopias de los .env con la clave anterior en ${path.relative(RAIZ, RESPALDOS)}/${marca}`);

  // 3) Recifrar en la base y comprobar leyendo de nuevo.
  for (const t of llanos) {
    await prisma[t.tabla === 'APIKey' ? 'aPIKey' : 'claveApi'].update({
      where: { id: t.id },
      data: { [t.campo]: t.nuevoTexto },
    });
  }
  let verificados = 0;
  for (const t of llanos) {
    const fila = await prisma[t.tabla === 'APIKey' ? 'aPIKey' : 'claveApi'].findUnique({ where: { id: t.id } });
    const claro = descifrar(nueva, fila[t.campo]);
    if (!claro || claro.length < 4) throw new Error(`${t.tabla}/${t.etiqueta} no reabre después de escribir`);
    verificados++;
  }
  console.log(`${verificados} credenciales recifradas y verificadas con la clave nueva.`);

  // 4) Por último los .env: si la base ya quedó bien, cambiar la clave es lo
  //    único que puede dejar la app leyendo con la clave vieja.
  for (const p of ENVS) {
    if (!existe(p)) continue;
    if (reemplazar(p, 'AI_MASTER_KEY', nueva)) console.log(`AI_MASTER_KEY actualizada en ${p}`);
  }
  console.log('\nReiniciá el backend para que tome la clave nueva.');
  console.log('Pendiente del lado de la finca: re-emitir las keys de los proveedores y cargarlas en admin (quedan cifradas con la clave nueva).');

  await prisma.$disconnect();
  return 0;
}

main().catch(async (e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
