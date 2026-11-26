// Verifica el aislamiento de Redis sin imprimir la contraseña: solo longitudes y
// resultados de los intentos de mando.
const fs = require('fs');
const Redis = require('ioredis');
const t = fs.readFileSync('.env', 'latin1');
const puerto = parseInt((t.match(/^REDIS_URL=redis:\/\/[^:]*:(\d+)/m) || [])[1] || '6380', 10);
const pass = ((fs.readFileSync('../.env', 'latin1').match(/^REDIS_PASSWORD=(.*)$/m) || [])[1] || '').trim();
console.log(`redis://127.0.0.1:${puerto} — contraseña local de ${pass.length} caracteres`);

(async () => {
  const sinAuth = new Redis({ host: '127.0.0.1', port: puerto, lazyConnect: true, retryStrategy: () => null });
  try {
    await sinAuth.connect();
    const r = await sinAuth.ping();
    console.log('PING sin AUTH =>', r, '(DEBERÍA HABER FALLADO: requirepass no actúa)');
  } catch (e) {
    console.log('PING sin AUTH => rechazado:', /NOAUTH/.test(e.message) ? 'NOAUTH' : e.message.slice(0, 60));
  }
  await sinAuth.quit().catch(() => {});

  const conAuth = new Redis({ host: '127.0.0.1', port: puerto, password: pass, lazyConnect: true, retryStrategy: () => null });
  try {
    await conAuth.connect();
    console.log('PING con AUTH =>', await conAuth.ping());
    await conAuth.set('qoder:verificacion', 'ok', 'EX', 30);
    console.log('SET/GET =>', await conAuth.get('qoder:verificacion'));
    await conAuth.del('qoder:verificacion');
  } catch (e) {
    console.log('PING con AUTH => FALLÓ:', e.message.slice(0, 80));
  }
  await conAuth.quit().catch(() => {});
})();
