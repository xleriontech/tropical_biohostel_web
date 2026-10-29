#!/usr/bin/env node
/**
 * Asegura las credenciales del Postgres y del Redis locales y las sincroniza
 * con los archivos de entorno. Lo llama instalar.bat antes de arrancar-db.bat.
 *
 *   node bin/credenciales.js            # crea lo que falte, no toca lo existente
 *   node bin/credenciales.js --rotate   # genera claves nuevas y re-sincroniza
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..');
const ROTAR = process.argv.includes('--rotate');
const ENVS = ['.env', 'backend/.env', 'backend/.env.docker'];

const gen = () => crypto.randomBytes(24).toString('base64url');
const ruta = (p) => path.join(RAIZ, p);
const existe = (p) => fs.existsSync(ruta(p));
const leer = (p) => fs.readFileSync(ruta(p), 'utf8');
const escribir = (p, t) => fs.writeFileSync(ruta(p), t, 'utf8');
const huella = (v) => crypto.createHash('md5').update(v).digest('hex').slice(0, 8);

function leo(p, clave) {
  if (!existe(p)) return null;
  const m = leer(p).match(new RegExp(`^${clave}=(\\S+)`, 'm'));
  return m ? m[1] : null;
}

function asegurar(p, pares) {
  let t = existe(p) ? leer(p) : '';
  for (const [clave, valor] of pares) {
    const re = new RegExp(`^${clave}=.*$`, 'm');
    if (re.test(t)) t = t.replace(re, `${clave}=${valor}`);
    else t = `${t.replace(/\n$/, '')}\n${clave}=${valor}\n`;
  }
  escribir(p, t);
}

// 1. Las credenciales viven solo en .env, que está fuera de git.
let pg = leo('.env', 'TURISMO_PG_PASSWORD');
let rd = leo('.env', 'REDIS_PASSWORD');
const nuevas = ROTAR || !pg || !rd;
if (nuevas) {
  pg = pg && !ROTAR ? pg : gen();
  rd = rd && !ROTAR ? rd : gen();
  asegurar('.env', [
    ['TURISMO_PG_PASSWORD', pg],
    ['REDIS_PASSWORD', rd],
  ]);
  console.log(`${ROTAR ? 'Rotadas' : 'Generadas'} las credenciales locales en .env`);
} else {
  console.log('Las credenciales de .env ya existían: se conservan.');
}
console.log(`  TURISMO_PG_PASSWORD  len=${pg.length} huella=${huella(pg)}`);
console.log(`  REDIS_PASSWORD       len=${rd.length} huella=${huella(rd)}`);

// 2. Las URLs de conexión deben apuntar a esas mismas credenciales.
for (const env of ENVS) {
  if (!existe(env)) {
    console.log(`  (sin ${env}: cópialo de su .example)`);
    continue;
  }
  let t = leer(env);
  const re = /^([A-Z_]+)=(\S+)$/;
  const salidas = [];
  t = t
    .split('\n')
    .map((l) => {
      const m = l.match(/^DATABASE_URL=(.+)$/);
      if (m) {
        const nuevo = m[1].replace(/^(postgres(?:ql)?:\/\/[^:@/]+:)[^@]+(@)/, `$1${pg}$2`);
        if (nuevo !== m[1]) salidas.push('DATABASE_URL');
        return `DATABASE_URL=${nuevo}`;
      }
      const r = l.match(/^REDIS_URL=(.+)$/);
      if (r) {
        const host = r[1].replace(/^redis:\/\/(:[^@]*@)?/, '');
        const nuevo = `redis://:${rd}@${host}`;
        if (nuevo !== r[1]) salidas.push('REDIS_URL');
        return `REDIS_URL=${nuevo}`;
      }
      return l;
    })
    .join('\n');
  if (salidas.length) escribir(env, t);
  console.log(`  ${env}: ${salidas.length ? `alineado ${salidas.join(', ')}` : 'ya estaba alineado'}`);
}

// 3. Recordatorio: la master key de cifrado no se puede inventar aquí.
const ejemplo = existe('.env.example') ? leer('.env.example') : '';
if (/^AI_MASTER_KEY=REEMPLAZAR/m.test(ejemplo)) {
  console.log('\n  Plantillas OK: AI_MASTER_KEY no trae un valor real.');
} else {
  console.log('\n  ALERTA: .env.example vuelve a contener una AI_MASTER_KEY real.');
}
for (const env of ENVS) {
  if (!existe(env)) continue;
  const m = leo(env, 'AI_MASTER_KEY');
  if (!m) console.log(`  ${env} no define AI_MASTER_KEY.`);
  else if (m.startsWith('REEMPLAZAR')) console.log(`  ${env}: AI_MASTER_KEY sin definir (placeholder).`);
  else console.log(`  ${env}: AI_MASTER_KEY len=${m.length} huella=${huella(m)}`);
}
