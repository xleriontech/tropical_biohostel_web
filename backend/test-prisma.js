const { PrismaClient } = require('@prisma/client');
async function test() {
  const url = 'postgresql://turismo_user:***REMOVIDO-EN-PURGA***@127.0.0.1:5432/turismo_db';
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
