const { PrismaClient } = require('@prisma/client');
async function test() {
  const { readFileSync } = require('fs');
  const url = (readFileSync(__dirname + '/.env', 'utf8').match(/^DATABASE_URL=(.+)$/m) || [])[1];
  const p = new PrismaClient({
    datasources: { db: { url } },
    log: ['query', 'error', 'warn'],
  });
  await p.$connect();
  const count = await p.propiedad.count();
  console.log('PrismaClient OK, propiedades:', count);
  await p.$disconnect();
}
test().catch(e => { console.error('FAILED:', e.message, e.stack); process.exit(1); });
