// Baseline de Prisma para bases de datos preexistentes.
//
// El proyecto se creó cuando el esquema se aplicaba a mano (prisma/init.sql),
// sin historial de migraciones. Para que `prisma migrate deploy` funcione en
// cada despliegue hay que "baselinar" esa base: registrar la migración inicial
// como YA APLICADA, sin ejecutar su SQL (el esquema ya existe).
//
// Es idempotente: si 0_init ya está registrada, no hace nada.
//
// Uso:  node prisma/baseline.js

const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

const prisma = new PrismaClient();

async function yaEstaAplicada() {
  const filas = await prisma.$queryRaw`
    SELECT 1 FROM "_prisma_migrations"
    WHERE migration_name = '0_init' AND finished_at IS NOT NULL
    LIMIT 1
  `.catch(() => []);
  return filas.length > 0;
}

/** ¿Existe ya el esquema? (tabla "Propiedad") */
async function elEsquemaExiste() {
  const filas = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Propiedad'
    LIMIT 1
  `.catch(() => []);
  return filas.length > 0;
}

async function main() {
  if (await yaEstaAplicada()) {
    console.log("   - migración 0_init ya registrada: no se requiere baseline");
    return;
  }
  if (!(await elEsquemaExiste())) {
    // Base vacía: no hay nada que baselinear. `migrate deploy` creará el esquema
    // aplicando la migración 0_init completa.
    console.log("   - base vacía: la migración 0_init se aplicará con migrate deploy");
    return;
  }
  console.log("   - base sin historial de migraciones: marcando 0_init como aplicada…");
  execSync("npx prisma migrate resolve --applied 0_init", { stdio: "inherit" });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
