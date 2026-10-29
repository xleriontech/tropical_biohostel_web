#!/usr/bin/env node
/**
 * Cambia la contraseña del usuario administrador.
 *
 * El seed crea admin@tropicalbiohostel.com con la clave "admin123" y ese valor
 * está publicado en el repositorio; CredencialesAdmin.txt, que guardaba la
 * real, también estuvo versionado. Mientras la contraseña del panel sea una de
 * esas, todo lo demás de la rotación da igual: el /admin es la puerta.
 *
 *   node bin/rotar-admin.js                    # lista los administradores
 *   node bin/rotar-admin.js --aplicar          # cambia todos los administradores
 *   node bin/rotar-admin.js --email=x@y.com --aplicar
 *
 * La contraseña nueva se escribe en CredencialesAdmin.txt (0600, fuera de git)
 * y no se imprime: se imprime su huella, para cotejarla.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..');
const APLICAR = process.argv.includes('--aplicar');
const EMAIL = (process.argv.find((a) => a.startsWith('--email=')) || '').split('=')[1];
const ARCHIVO_CREDENCIALES = path.join(RAIZ, 'CredencialesAdmin.txt');

const huella = (v) => crypto.createHash('md5').update(v).digest('hex').slice(0, 8);

const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

function cargaEntorno() {
  for (const p of ['backend/.env', '.env']) {
    if (!fs.existsSync(path.join(RAIZ, p))) continue;
    for (const linea of leer(p).split(/\r?\n/)) {
      const m = linea.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}

/** Legible y fuerte: 4 sílabas + dígitos, sin caracteres ambiguos. */
function generarPassword() {
  const consonantes = 'bcdfghjklmnpqrstvwz';
  const vocales = 'aeiou';
  const r = (n) => crypto.randomInt(n);
  const silaba = () => consonantes[r(consonantes.length)] + vocales[r(vocales.length)] + consonantes[r(consonantes.length)];
  return (silaba() + silaba() + silaba() + silaba() + String(r(100))).replace(/^/, (c) => c.toUpperCase());
}

async function main() {
  cargaEntorno();
  const { PrismaClient } = require(path.join(RAIZ, 'backend', 'node_modules', '@prisma', 'client'));
  const bcrypt = require(path.join(RAIZ, 'backend', 'node_modules', 'bcryptjs'));
  const prisma = new PrismaClient();

  const admins = await prisma.user.findMany({
    where: EMAIL ? { email: EMAIL } : { role: 'admin' },
    select: { id: true, email: true, role: true, passwordHash: true },
    orderBy: { email: 'asc' },
  });

  if (!admins.length) {
    console.log(EMAIL ? `No hay ningún usuario con email ${EMAIL}.` : 'No hay usuarios con rol admin.');
    await prisma.$disconnect();
    return 1;
  }

  console.log(`${admins.length} cuenta(s) con acceso al panel:`);
  for (const a of admins) {
    const debil = a.passwordHash ? 'hash guardado' : 'sin contraseña local (Solo Supabase)';
    console.log(`  ${a.email}  role=${a.role}  ${debil}`);
  }

  if (!APLICAR) {
    console.log('\nCorré con --aplicar para asignar una contraseña nueva a cada una.');
    await prisma.$disconnect();
    return 0;
  }

  const registro = [];
  for (const a of admins) {
    const clave = generarPassword();
    await prisma.user.update({ where: { id: a.id }, data: { passwordHash: bcrypt.hashSync(clave, 12) } });
    // Verificación: el hash guardado tiene que abrir con la clave que se dio.
    const vuelto = await prisma.user.findUniqueOrThrow({ where: { id: a.id }, select: { passwordHash: true } });
    if (!bcrypt.compareSync(clave, vuelto.passwordHash)) {
      throw new Error(`la contraseña de ${a.email} no verifica después de escribirla`);
    }
    registro.push({ email: a.email, clave });
    console.log(`  cambiada ${a.email} (huella ${huella(clave)})`);
  }

  const bloque = [
    `\n## Panel admin — rotada el ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\n`,
    ...registro.map((r) => `- ${r.email}: ${r.clave}`),
    '',
  ].join('\n');
  const previo = fs.existsSync(ARCHIVO_CREDENCIALES) ? fs.readFileSync(ARCHIVO_CREDENCIALES, 'utf8') : '';
  fs.writeFileSync(ARCHIVO_CREDENCIALES, previo + bloque, { mode: 0o600 });

  console.log(`\nContraseñas escritas en ${path.relative(RAIZ, ARCHIVO_CREDENCIALES)} (0600, fuera de git).`);
  console.log('Mové ese archivo a un gestor de contraseñas y borrá las entradas viejas: las anteriores ya se conocían.');
  await prisma.$disconnect();
  return 0;
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
