const { Client } = require('pg');
async function test() {
  const c = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'turismo_user',
    password: '***REMOVIDO-EN-PURGA***',
    database: 'turismo_db',
  });
  await c.connect();
  const r = await c.query('SELECT 1 as alive');
  console.log('OK:', r.rows);
  await c.end();
}
test().catch(e => { console.error('FAILED:', e.message, e.code); process.exit(1); });
