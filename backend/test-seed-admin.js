#!/usr/bin/env node
/**
 * Prueba el alta del admin contra una base desechable, sin imprimir la clave.
 *
 *   node backend/test-seed-admin.js          # requiere Postgres local arrancado
 *
 * Cubre lo que un repositorio público no puede dejar abierto: que el seed cree
 * el /admin con una clave generada y la anote en CredencialesAdmin.txt, que esa
 * clave abra de verdad, que ADMIN_PASSWORD mande cuando existe, y que en un
 * entorno sin repo (contenedor) el seed se niegue a dejar un admin sin clave.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const BACKEND = path.join(RAIZ, 'backend');
const BASE_TEST = 'seed_test_admin';
const CREDENCIALES = path.join(RAIZ, 'CredencialesAdmin.txt');
const EMAIL = 'admin@tropicalbiohostel.com';

let ok = 0, mal = 0;
const checar = (nombre, condicion, detalle = '') => {
  console.log(`  ${condicion ? 'PASS' : 'FAIL'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  condicion ? ok++ : mal++;
};

function cargaEntorno() {
  const env = {};
  for (const p of ['backend/.env', '.env']) {
    const f = path.join(RAIZ, p);
    if (!fs.existsSync(f)) continue;
    for (const linea of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = linea.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

const conBase = (url, base) => url.replace(/\/[^/?]+(\?|$)/, `/${base}$1`);

function main() {
  const { PrismaClient } = require(path.join(BACKEND, 'node_modules', '@prisma', 'client'));
  const bcrypt = require(path.join(BACKEND, 'node_modules', 'bcryptjs'));
  const entorno = cargaEntorno();
  if (!entorno.DATABASE_URL) throw new Error('falta DATABASE_URL en backend/.env');

  const urlTest = conBase(entorno.DATABASE_URL, BASE_TEST);
  const urlAdmin = conBase(entorno.DATABASE_URL, 'postgres');
  const prismaTest = new PrismaClient({ datasources: { db: { url: urlTest } }, log: [] });
  const prismaAdmin = new PrismaClient({ datasources: { db: { url: urlAdmin } }, log: [] });

  // En Windows `npx` es un .cmd: se lanza por cmd.exe para evitar el shell
  // escaping de la URL de conexión.
  const corre = (args, env) => spawnSync(
    args[0] === 'npx' ? 'cmd.exe' : args[0],
    args[0] === 'npx' ? ['/c', ...args] : args.slice(1),
    {
      cwd: BACKEND, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, ...env, DATABASE_URL: urlTest },
    },
  );
  const ultimasLineas = (r) => `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-2).join(' ').slice(0, 160);

  return (async () => {
    console.log(`Base desechable: ${BASE_TEST}\n`);
    if ((await prismaAdmin.$queryRawUnsafe(`SELECT 1 FROM pg_database WHERE datname = '${BASE_TEST}'`)).length) {
      await prismaAdmin.$executeRawUnsafe(`DROP DATABASE ${BASE_TEST}`);
    }
    await prismaAdmin.$executeRawUnsafe(`CREATE DATABASE ${BASE_TEST}`);

    const sizeAntes = fs.existsSync(CREDENCIALES) ? fs.statSync(CREDENCIALES).size : 0;
    try {
      const migradas = corre(['npx', 'prisma', 'migrate', 'deploy']);
      checar('migrate deploy sobre la base nueva', migradas.status === 0, ultimasLineas(migradas));

      // 1) Sin ADMIN_PASSWORD y con el repo al lado: genera la clave y la anota.
      const primero = corre(['node', 'prisma/dist/seed.js'], { ADMIN_PASSWORD: '' });
      const log1 = primero.stdout || '';
      checar('el seed corre entero', primero.status === 0, ultimasLineas(primero));
      checar('no imprime ninguna clave en claro', !/admin123/.test(log1));
      checar('el log entrega huella en lugar de la clave', /huella [0-9a-f]{8}/.test(log1));
      checar('anota la clave en CredencialesAdmin.txt', fs.statSync(CREDENCIALES).size > sizeAntes);

      const registro = fs.readFileSync(CREDENCIALES).subarray(sizeAntes).toString('utf8');
      const bytesTrasGenerar = fs.statSync(CREDENCIALES).size;
      const generada = (registro.match(new RegExp(`- ${EMAIL}: (\\S+)`)) || [])[1];
      checar('la clave anotada es legible y fuerte', !!generada && generada.length >= 13 && /\d$/.test(generada));

      const guardada = await prismaTest.user.findUnique({
        where: { email: EMAIL }, select: { passwordHash: true, role: true },
      });
      checar('el admin existe con rol admin', !!guardada && guardada.role === 'admin');
      checar('la clave generada abre el hash guardado', !!guardada && bcrypt.compareSync(generada, guardada.passwordHash));
      checar('el hash quedó con costo 12', !!guardada && /^\$2[aby]\$12\$/.test(guardada.passwordHash));

      // 2) ADMIN_PASSWORD manda sobre la clave generada.
      await prismaTest.user.delete({ where: { email: EMAIL } });
      const conFija = corre(['node', 'prisma/dist/seed.js'], { ADMIN_PASSWORD: 'ClaveFijadaDePrueba99' });
      checar('con ADMIN_PASSWORD crea el admin con esa clave', /ADMIN_PASSWORD \(huella/.test(conFija.stdout || ''));
      const fija = await prismaTest.user.findUnique({ where: { email: EMAIL }, select: { passwordHash: true } });
      checar('ADMIN_PASSWORD abre el hash guardado', !!fija && bcrypt.compareSync('ClaveFijadaDePrueba99', fija.passwordHash));
      checar('el admin con clave fija no se anota en el archivo', fs.statSync(CREDENCIALES).size === bytesTrasGenerar);

      // 3) Entorno sin repo (contenedor): no deja un admin sin clave accesible.
      await prismaTest.user.delete({ where: { email: EMAIL } });
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-sin-repo-'));
      fs.copyFileSync(path.join(BACKEND, 'prisma', 'dist', 'seed.js'), path.join(tmp, 'seed.js'));
      const enContenedor = spawnSync('node', ['seed.js'], {
        cwd: tmp, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, NODE_PATH: path.join(BACKEND, 'node_modules'), DATABASE_URL: urlTest, ADMIN_PASSWORD: '' },
      });
      const log3 = enContenedor.stdout || '';
      checar('sin repo avisa que no crea el admin', /SIN ADMIN/.test(log3), ultimasLineas(enContenedor));
      checar('sin repo no queda un admin huérfano', !(await prismaTest.user.findUnique({ where: { email: EMAIL } })));
      fs.rmSync(tmp, { recursive: true, force: true });
    } finally {
      await prismaTest.$disconnect();
      try {
        await prismaAdmin.$executeRawUnsafe(`DROP DATABASE ${BASE_TEST}`);
      } catch (e) {
        console.log(`  ⚠️  no se pudo borrar ${BASE_TEST}: ${String(e.message).split('\n')[0]}`);
      }
      await prismaAdmin.$disconnect();
      // La prueba deja su propia fila en CredencialesAdmin.txt: se corta el archivo.
      // Se corta en bytes, no en caracteres: el bloque tiene emes y acentos.
      if (fs.existsSync(CREDENCIALES)) {
        const t = fs.readFileSync(CREDENCIALES);
        fs.writeFileSync(CREDENCIALES, t.subarray(0, sizeAntes), { mode: 0o600 });
        console.log(`\n  base ${BASE_TEST} eliminada y anotación de prueba quitada de CredencialesAdmin.txt`);
      }
    }

    console.log(`\n${ok}/${ok + mal} PASS`);
    if (mal) process.exitCode = 1;
  })();
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
