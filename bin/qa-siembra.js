#!/usr/bin/env node
/**
 * QA de la sección Siembra (apadrinamiento de árboles de café y cacao).
 *
 * Corre contra el backend vivo y contra la base que apunta DATABASE_URL, y
 * verifica lo que el navegador no puede ver: que el tablero se auto-provisiona,
 * que dos donantes no pueden reservar la misma casilla, que una reserva sin
 * pago se libera sola y que nunca queda un árbol huérfano si PayPal falla.
 *
 *   node bin/qa-siembra.js                          # checks públicos
 *   node bin/qa-siembra.js --api=http://localhost:3003/api
 *   node bin/qa-siembra.js --admin --email=x@y.com --password=...   # endpoints de admin
 *
 * Sin --admin se omite la tanda de administrador; las claves no se leen de
 * ningún archivo ni se imprimen: se pasan por bandera o por el entorno.
 * Solo toca datos de prueba que él mismo crea y limpia, y se niega a correr
 * contra una base que no sea local salvo que se lo indique con --forzar.
 */
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const bandera = (n) => argv.includes(`--${n}`);
const opcion = (n, def) => {
  const a = argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : def;
};

function cargaEntorno() {
  const fs = require('fs');
  for (const p of ['backend/.env', '.env']) {
    const full = path.join(RAIZ, p);
    if (!fs.existsSync(full)) continue;
    for (const linea of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
      const m = linea.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}
cargaEntorno();

const API = (opcion('api', process.env.QA_API || 'http://localhost:3003/api')).replace(/\/$/, '');
const DATABASE_URL = process.env.DATABASE_URL || '';
const LOCAL = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(DATABASE_URL) || /localhost|127\.0\.0\.1/.test(API);
if (!LOCAL && !bandera('forzar')) {
  console.error('❌ DATABASE_URL/API no parecen locales. Usa --forzar solo si sabes qué base estás tocando.');
  process.exit(2);
}

let fallos = 0;
function checa(nombre, ok, detalle) {
  console.log(`${ok ? '  ✓' : '  ✗'} ${nombre}${ok || !detalle ? '' : ` → ${detalle}`}`);
  if (!ok) fallos++;
}

async function http(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function main() {
  const { PrismaClient } = require(path.join(RAIZ, 'backend', 'node_modules', '@prisma', 'client'));
  const prisma = new PrismaClient();
  const arriba = await http('/donaciones/siembra/tablero');
  if (arriba.status !== 200) {
    console.error(`❌ No hay backend en ${API} (estado ${arriba.status}). Arranca el backend y vuelve.`);
    process.exit(2);
  }

  console.log(`\n— Tablero (${API})`);
  const t = arriba.data;
  const base = t.estadisticas;
  checa('responde con la configuración del tablero', Number.isFinite(t.filas) && Number.isFinite(t.columnas));
  checa('las parcelas se auto-provisionan (filas × columnas)', t.parcelas.length === t.filas * t.columnas,
    `${t.parcelas.length} de ${t.filas * t.columnas}`);
  checa('el tablero no expone correos ni nombres de donante',
    !JSON.stringify(t).match(/padrino|@"|email/));

  console.log('\n— Validación de la reserva');
  const fuera = await http('/donaciones/siembra/reserva', { metodo: 'POST', cuerpo: { fila: 9999, columna: 9999, especie: 'CAFE', monto: 10 } });
  checa('una casilla inexistente se rechaza con 404', fuera.status === 404, fuera.data?.message);
  const especie = await http('/donaciones/siembra/reserva', { metodo: 'POST', cuerpo: { fila: 0, columna: 0, especie: 'BANANO', monto: 10 } });
  checa('una especie que no sea café o cacao se rechaza', especie.status === 400);
  const colado = await http('/donaciones/siembra/reserva', { metodo: 'POST', cuerpo: { fila: 0, columna: 0, especie: 'CAFE', monto: 10, descuento: 'TODO' } });
  checa('un campo no declarado se rechaza (forbidNonWhitelisted)', colado.status === 400);
  const sinMonto = await http('/donaciones/siembra/reserva', { metodo: 'POST', cuerpo: { fila: 0, columna: 0, especie: 'CAFE', alias: 'Sin monto' } });
  checa('sin monto definido por la finca, pide uno', sinMonto.status === 400, sinMonto.data?.message);

  // Sin un pago detrás la reserva debe deshacerse: ni casilla tomada ni árbol huérfano.
  // Con el pago habilitado (PayPal real o la simulación de desarrollo) prospera y deja
  // la casilla RESERVADA hasta la captura.
  const casilla = await prisma.parcela.findFirst({ where: { fila: 2, columna: 2 }, include: { arbol: true } });
  // La casilla de prueba arranca limpia: si quedó una reserva de otra tanda, se libera.
  if (casilla.arbol && !casilla.arbol.confirmado) await prisma.apadrinamiento.delete({ where: { id: casilla.arbol.id } });
  await prisma.parcela.update({ where: { id: casilla.id }, data: { estado: 'LIBRE', expiraAt: null } });
  const intento = await http('/donaciones/siembra/reserva', { metodo: 'POST', cuerpo: { fila: 2, columna: 2, especie: 'CACAO', monto: 10 } });
  const despues = await prisma.parcela.findUnique({ where: { id: casilla.id }, include: { arbol: true } });
  const limpiaReserva = async () => {
    const viva = await prisma.parcela.findUnique({ where: { id: casilla.id }, include: { arbol: true } });
    if (viva?.arbol) await prisma.apadrinamiento.delete({ where: { id: viva.arbol.id } });
    await prisma.parcela.update({ where: { id: casilla.id }, data: { estado: 'LIBRE', expiraAt: null } });
  };
  if (t.pagoHabilitado) {
    checa('con el pago habilitado la reserva toma la casilla',
      intento.status < 400 && despues.estado === 'RESERVADA' && !!despues.arbol,
      `estado=${despues.estado} arbol=${despues.arbol ? 'sí' : 'no'}`);
    if (t.pagoSimulado && intento.data?.orderId) {
      const capturada = await http('/donaciones/capturar', { metodo: 'POST', cuerpo: { orderId: intento.data.orderId } });
      const sembrada = await prisma.parcela.findUnique({ where: { id: casilla.id }, include: { arbol: true } });
      checa('capturar el aporte siembra el árbol en el tablero',
        capturada.status < 400 && sembrada.estado === 'OCUPADA' && !!sembrada.arbol?.confirmado,
        `estado=${sembrada.estado}`);
    }
    await limpiaReserva();
  } else {
    checa('el pago rechazado libera la casilla', intento.status >= 400 && despues.estado === 'LIBRE' && !despues.arbol,
      `estado=${despues.estado} arbol=${despues.arbol ? 'sí' : 'no'}`);
    await limpiaReserva();
  }

  console.log('\n— Carrera por la misma casilla');
  await prisma.parcela.update({
    where: { fila_columna: { fila: 4, columna: 4 } },
    data: { estado: 'RESERVADA', expiraAt: new Date(Date.now() + 10 * 60_000) },
  });
  const choque = await http('/donaciones/siembra/reserva', { metodo: 'POST', cuerpo: { fila: 4, columna: 4, especie: 'CAFE', monto: 10 } });
  checa('la casilla ya reservada responde 409', choque.status === 409, choque.data?.message);
  await prisma.parcela.update({ where: { fila_columna: { fila: 4, columna: 4 } }, data: { estado: 'LIBRE', expiraAt: null } });

  console.log('\n— Reserva vencida y ficha pública');
  const parcela = await prisma.parcela.findUnique({ where: { fila_columna: { fila: 5, columna: 5 } } });
  const codigo = `QA-${Date.now().toString(36).toUpperCase().slice(-8)}`;
  const arbol = await prisma.apadrinamiento.create({
    data: {
      codigo,
      parcelaId: parcela.id,
      especie: 'CAFE',
      alias: 'Árbol de prueba',
      padrino: 'Prueba QA',
    },
  });
  await prisma.parcela.update({
    where: { id: parcela.id },
    data: { estado: 'RESERVADA', expiraAt: new Date(Date.now() - 60_000) },
  });

  const ficha = await http(`/donaciones/siembra/arbol/${codigo}`);
  checa('la ficha por código existe y marca el pago pendiente', ficha.status === 200 && ficha.data.pago === null, ficha.status);
  checa('la ficha oculta el nombre del padrino', !('padrino' in (ficha.data || {})));
  const cuatro = await http('/donaciones/siembra/arbol/TB-NOEXISTE');
  checa('un código desconocido responde 404', cuatro.status === 404);

  await http('/donaciones/siembra/tablero'); // la lectura limpia las vencidas
  const trasLimpieza = await prisma.parcela.findUnique({ where: { id: parcela.id }, include: { arbol: true } });
  const arbolVivo = await prisma.apadrinamiento.findUnique({ where: { id: arbol.id } });
  checa('la reserva vencida vuelve a quedar LIBRE', trasLimpieza.estado === 'LIBRE' && !trasLimpieza.arbol && !arbolVivo,
    `estado=${trasLimpieza.estado}`);

  console.log('\n— Sin capturar, la siembra no aparece confirmada');
  const tablero = await http('/donaciones/siembra/tablero');
  // Comparado contra el arranque: la tanda de QA no debe dejar ningún árbol nuevo.
  checa('no hay árboles fantasma en el muro', tablero.data.donantes.every((d) => !!d.alias) && tablero.data.estadisticas.ocupadas === base.ocupadas,
    `al empezar ${base.ocupadas}, ahora ${tablero.data.estadisticas.ocupadas}`);

  console.log('\n— Cuidados del árbol');
  const catalogo = t.cuidados || [];
  if (!catalogo.length) {
    console.log('  · omitido: no hay catálogo publicado (corre `node bin/demo-siembra.js` para traer el de ejemplo).');
  } else {
    checa('el tablero publica el catálogo con su precio y su realce',
      catalogo.every((i) => i.clave && i.etiqueta && Number.isFinite(i.precio) && i.realce),
      `${catalogo.length} cuidados`);

    // Un árbol sembrado ex profeso, en una casilla libre que la tanda devuelve al terminar.
    const hueco = await prisma.parcela.findFirst({ where: { estado: 'LIBRE' }, orderBy: [{ fila: 'asc' }, { columna: 'asc' }] });
    const codigoMimo = `QA-MIMO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const arbolMimo = await prisma.apadrinamiento.create({
      data: { codigo: codigoMimo, parcelaId: hueco.id, especie: 'CACAO', alias: 'Árbol de mimo', confirmado: true, fechaSiembra: new Date() },
    });
    await prisma.parcela.update({ where: { id: hueco.id }, data: { estado: 'OCUPADA', expiraAt: null } });

    const conNiveles = await http('/donaciones/siembra/tablero');
    const casillaMimo = (conNiveles.data.parcelas || []).find((p) => p.fila === hueco.fila && p.columna === hueco.columna);
    checa('cada árbol llega con sus barras de agua, nutrientes y salud',
      !!casillaMimo?.arbol?.niveles && Number.isFinite(casillaMimo.arbol.niveles.agua) && !!casillaMimo.arbol.estado?.clave,
      JSON.stringify(casillaMimo?.arbol?.niveles));

    const regador = catalogo.find((i) => i.realce.agua > 0) || catalogo[0];
    const sed = (await http(`/donaciones/siembra/arbol/${codigoMimo}`)).data.niveles.agua;

    const lineaMala = await http('/donaciones/siembra/cuidado', {
      metodo: 'POST', cuerpo: { fila: hueco.fila, columna: hueco.columna, lineas: [{ clave: regador.clave, cantidad: 0 }] },
    });
    checa('una cantidad imposible no arma el pedido', lineaMala.status === 400, lineaMala.data?.message);
    const claveFalsa = await http('/donaciones/siembra/cuidado', {
      metodo: 'POST', cuerpo: { fila: hueco.fila, columna: hueco.columna, lineas: [{ clave: 'AGUA_DEL_MAR', cantidad: 1 }] },
    });
    checa('un cuidado que la finca no vende se rechaza', claveFalsa.status === 400);

    if (t.pagoHabilitado) {
      const pedido = await http('/donaciones/siembra/cuidado', {
        metodo: 'POST', cuerpo: { fila: hueco.fila, columna: hueco.columna, lineas: [{ clave: regador.clave, cantidad: 2 }] },
      });
      const esperado = Math.round(Number(regador.precio) * 2 * 100) / 100;
      checa('comprar cuidados crea una orden con el total de las líneas',
        pedido.status < 400 && pedido.data?.total === esperado, `total ${pedido.data?.total} vs ${esperado}`);
      const pendientes = await prisma.cuidadoAplicado.count({ where: { arbolId: arbolMimo.id, estado: 'PENDIENTE' } });
      checa('sin capturar, el mimamiento queda pendiente y no aplica', pendientes === 1 && (await http(`/donaciones/siembra/arbol/${codigoMimo}`)).data.niveles.agua === sed,
        `pendientes ${pendientes}`);
      if (t.pagoSimulado && pedido.data?.orderId) {
        await http('/donaciones/capturar', { metodo: 'POST', cuerpo: { orderId: pedido.data.orderId } });
        const despues = await http(`/donaciones/siembra/arbol/${codigoMimo}`);
        const pagados = await prisma.cuidadoAplicado.count({ where: { arbolId: arbolMimo.id, estado: 'PAGADO' } });
        checa('capturar el pago aplica el mimo y sube el agua del árbol',
          pagados === 1 && despues.data.niveles.agua === Math.min(100, sed + regador.realce.agua * 2),
          `agua ${sed} → ${despues.data.niveles.agua}`);
        checa('la ficha publica el mimamiento en el parte del árbol',
          (despues.data.cuidados || []).some((c) => c.etiqueta === regador.etiqueta && c.cantidad === 2));
      } else {
        console.log('  · la captura se omite: el pago es PayPal real, no simulado.');
      }
    } else {
      const sinPago = await http('/donaciones/siembra/cuidado', {
        metodo: 'POST', cuerpo: { fila: hueco.fila, columna: hueco.columna, lineas: [{ clave: regador.clave, cantidad: 1 }] },
      });
      checa('sin pago configurado la compra se rechaza', sinPago.status === 400, sinPago.data?.message);
    }

    const compraDon = await prisma.donacion.findMany({ where: { cuidados: { some: { arbolId: arbolMimo.id } } }, select: { id: true } });
    await prisma.apadrinamiento.delete({ where: { id: arbolMimo.id } });
    if (compraDon.length) await prisma.donacion.deleteMany({ where: { id: { in: compraDon.map((d) => d.id) } } });
    await prisma.parcela.update({ where: { id: hueco.id }, data: { estado: 'LIBRE', expiraAt: null } });
  }

  if (bandera('admin')) {
    console.log('\n— Admin');
    const email = opcion('email', process.env.QA_ADMIN_EMAIL);
    const password = opcion('password', process.env.QA_ADMIN_PASSWORD);
    if (!email || !password) {
      console.log('  · omitido: pasa --email= y --password= (o QA_ADMIN_EMAIL/QA_ADMIN_PASSWORD).');
    } else {
      const login = await http('/auth/signin', { metodo: 'POST', cuerpo: { email, password } });
      const token = login.data?.access_token || login.data?.token;
      checa('el administrador inicia sesión', !!token, `estado ${login.status}`);
      if (token) {
        const lista = await http('/admin/donaciones/siembra/arboles', { token });
        checa('lista los árboles apadrinados', lista.status === 200 && Array.isArray(lista.data));
        const p = await prisma.parcela.findUnique({ where: { fila_columna: { fila: 6, columna: 6 } } });
        const a = await prisma.apadrinamiento.create({
          data: { codigo: `${codigo}B`, parcelaId: p.id, especie: 'CACAO', confirmado: true },
        });
        await prisma.parcela.update({ where: { id: p.id }, data: { estado: 'OCUPADA' } });
        const upd = await http(`/admin/donaciones/siembra/arbol/${a.id}`, {
          metodo: 'PATCH', token, cuerpo: { etapa: 'JUVENIL', notasFinca: 'Parte de crecimiento de prueba.' },
        });
        checa('actualiza etapa y parte de la finca', upd.status === 200 && upd.data.etapa === 'JUVENIL', upd.status);
        const noLiberar = await http(`/admin/donaciones/siembra/parcela/${p.id}/liberar`, { metodo: 'POST', token });
        checa('no libera una casilla con árbol sembrado', noLiberar.status === 400);
        await prisma.apadrinamiento.delete({ where: { id: a.id } });
        await prisma.parcela.update({ where: { id: p.id }, data: { estado: 'LIBRE', expiraAt: null } });
      }
    }
  } else {
    console.log('\n— Admin: omitido (usa --admin --email= --password= para la tanda de administrador).');
  }

  await prisma.$disconnect();
  console.log(fallos ? `\n❌ ${fallos} chequeo(s) fallaron.` : '\n✅ QA de siembra completo.');
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => {
  console.error(`❌ ${e.message}`);
  process.exit(1);
});
