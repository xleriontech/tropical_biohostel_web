const net = require('net');
// El Postgres del proyecto es el contenedor tropical-pg: el host publica PG_PORT
// (5434 por defecto), no 5432.
const port = Number(process.env.PG_PORT || 5434);
const socket = net.createConnection({ host: '127.0.0.1', port }, () => {
  const user = 'turismo_user\0';
  const db = 'turismo_db\0';
  const body = Buffer.concat([
    Buffer.from([0, 3, 0, 0]),
    Buffer.from('user\0'),
    Buffer.from(user),
    Buffer.from('database\0'),
    Buffer.from(db),
    Buffer.from('\0'),
  ]);
  const msg = Buffer.alloc(4 + body.length);
  msg.writeUInt32BE(body.length + 4, 0);
  body.copy(msg, 4);
  socket.write(msg);
});
socket.on('data', (data) => {
  const type = String.fromCharCode(data[0]);
  const authType = data.readInt32BE(5);
  console.log('Auth type:', authType, '(0=OK, 3=cleartext, 5=MD5, 10=SASL)');
  console.log('Full hex:', data.slice(0, 30).toString('hex'));
  socket.end();
});
socket.on('error', (e) => console.error('Error:', e.message));
socket.on('close', () => process.exit(0));
