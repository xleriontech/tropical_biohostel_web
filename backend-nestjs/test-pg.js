const { Client } = require('pg');
const { readFileSync } = require('fs');
const { URL } = require('url');
async function test() {
  const env = readFileSync(require.resolve('path').join(__dirname, '.env'), 'utf8');
  const url = new URL((env.match(/^DATABASE_URL=(.+)$/m) || [])[1]);
  const c = new Client({
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  });
  await c.connect();
  const r = await c.query('SELECT 1 as alive');
  console.log('OK:', r.rows);
  await c.end();
}
test().catch(e => { console.error('FAILED:', e.message, e.code); process.exit(1); });
