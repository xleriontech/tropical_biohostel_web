const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$connect()
  .then(() => { console.log('Connected!'); return p.$disconnect(); })
  .catch(e => { console.error(e.message); p.$disconnect(); });
