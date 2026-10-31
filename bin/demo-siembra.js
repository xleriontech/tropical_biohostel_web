#!/usr/bin/env node
/**
 * Datos de ejemplo para el tablero de siembra (/donaciones/siembra).
 *
 * Sirve para ver la sección poblada —árboles en cada etapa, café y cacao, muro
 * de padrinos, una casilla apartada y sus niveles de agua/abono/salud— sin tener
 * que pagar ninguno. Todo lo que crea lleva el código `TB-DEMO-…`, así que
 * `--limpiar` borra exactamente estas filas y ninguna otra. Nunca toca una
 * casilla con un apadrinamiento real.
 *
 *   node bin/demo-siembra.js                     # sembrar/actualizar la demo
 *   node bin/demo-siembra.js --limpiar           # dejar el tablero como estaba
 *   node bin/demo-siembra.js --limpiar --limpiar-catalogo
 *   node bin/demo-siembra.js --api=http://localhost:3003/api
 *
 * Además publica el catálogo de cuidados (riego, abono, sustrato, poda) con
 * precios de ejemplo: son placeholders para poder probar la compra, la finca
 * debe cambiarlos por los suyos. El script no reescribe un precio ya existente.
 *
 * Escribe directo en la base de DATABASE_URL (la del backend), y se niega a
 * correr contra una base que no sea local salvo --forzar.
 */
const path = require('path');
const fs = require('fs');

const RAIZ = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const bandera = (n) => argv.includes(`--${n}`);
const opcion = (n, def) => {
  const a = argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : def;
};

function cargaEntorno() {
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
const LOCAL = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(process.env.DATABASE_URL || '') || /localhost|127\.0\.0\.1/.test(API);
if (!LOCAL && !bandera('forzar')) {
  console.error('❌ DATABASE_URL/API no parecen locales. Usa --forzar solo si sabes qué base estás tocando.');
  process.exit(2);
}

const PREFIJO = 'TB-DEMO-';
const DIA = 86_400_000;
const hace = (dias) => new Date(Date.now() - dias * DIA);

/**
 * Alias, etapas y partes repartidos por el tablero para ver la finca completa.
 * `niveles` es cómo amanece cada árbol y `historial` los mimamientos ya pagados.
 */
const ARBOLES = [
  { codigo: `${PREFIJO}01`, fila: 1, columna: 2, especie: 'CAFE', etapa: 'PRODUCTIVO', alias: 'El abuelo', padrino: 'Ana Lucía Fernández', pais: 'Colombia', mensaje: 'Para mi papá, que murió con las manos en la tierra.', nota: 'Primera cosecha recogida en marzo: 1,8 kg de cereza.', desde: 420, niveles: { agua: 72, nutriente: 64, salud: 90 }, rego: 1, abono: 5, historial: [{ clave: 'RIEGO', cantidad: 2, hace: 3 }, { clave: 'PODA', cantidad: 1, hace: 40 }] },
  { codigo: `${PREFIJO}02`, fila: 2, columna: 5, especie: 'CACAO', etapa: 'JUVENIL', alias: 'Doña Herminia', padrino: 'Julián Castro', pais: 'España', mensaje: 'Un cacao para mi hija, que nació bajo un árbol.', nota: 'Poda de formación hecha; el dosel ya lo cubre.', desde: 210, niveles: { agua: 40, nutriente: 33, salud: 74 }, rego: 4, abono: 12, historial: [{ clave: 'HUMUS', cantidad: 1, hace: 20 }] },
  { codigo: `${PREFIJO}03`, fila: 3, columna: 1, especie: 'CAFE', etapa: 'BROTE', alias: 'Sombra baja', padrino: 'Marcela Ruiz', pais: 'México', nota: 'Prendió tras el primer mes; tutor puesto.', desde: 48, niveles: { agua: 22, nutriente: 28, salud: 66 }, rego: 8, historial: [{ clave: 'RIEGO', cantidad: 1, hace: 9 }] },
  { codigo: `${PREFIJO}04`, fila: 3, columna: 7, especie: 'CACAO', etapa: 'SEMILLA', alias: 'Cardón', padrino: 'Esteban Narváez', pais: 'Ecuador', desde: 9, niveles: { agua: 66, nutriente: 58, salud: 84 }, rego: 2 },
  { codigo: `${PREFIJO}05`, fila: 5, columna: 3, especie: 'CAFE', etapa: 'PRODUCTIVO', alias: 'La gotera', padrino: 'Sofía Londono', pais: 'Colombia', mensaje: 'Que crezca lento, como las cosas buenas.', nota: 'Cosecha de medio kilo; el grano secó en el patio.', desde: 380, niveles: { agua: 55, nutriente: 45, salud: 78 }, rego: 3, abono: 9 },
  { codigo: `${PREFIJO}06`, fila: 5, columna: 6, especie: 'CACAO', etapa: 'JUVENIL', alias: null, padrino: 'Andrés Pardo', pais: 'Chile', desde: 150, niveles: { agua: 30, nutriente: 41, salud: 70 }, rego: 6, historial: [{ clave: 'MULCH', cantidad: 2, hace: 30 }] },
  { codigo: `${PREFIJO}07`, fila: 7, columna: 1, especie: 'CACAO', etapa: 'BROTE', alias: 'Remanso', padrino: 'Valentina Ocampo', pais: 'Argentina', nota: 'Buen color de hoja después del abono.', desde: 36, niveles: { agua: 78, nutriente: 62, salud: 88 }, rego: 1, abono: 2, historial: [{ clave: 'ABONO_COMPOST', cantidad: 2, hace: 6 }, { clave: 'RIEGO', cantidad: 1, hace: 2 }] },
  { codigo: `${PREFIJO}08`, fila: 7, columna: 5, especie: 'CAFE', etapa: 'SEMILLA', alias: 'Brisa de Nocaima', padrino: 'Camila Restrepo', pais: 'Colombia', desde: 4, niveles: { agua: 60, nutriente: 52, salud: 80 }, rego: 2 },
  { codigo: `${PREFIJO}09`, fila: 8, columna: 8, especie: 'CAFE', etapa: 'JUVENIL', alias: 'Cerro alto', padrino: 'Diego Molano', pais: 'Perú', desde: 120, niveles: { agua: 46, nutriente: 25, salud: 68 }, rego: 5, abono: 18 },
];

/** Una reserva sin capturar, para ver cómo se pinta el estado apartada. */
const RESERVA = { codigo: `${PREFIJO}R1`, fila: 7, columna: 3, especie: 'CACAO', alias: 'Pendiente de pago' };

/**
 * La lista de lo que cuesta atender un árbol. Son precios de ejemplo: la finca
 * los cambia cuando publique los suyos. El script nunca pisa una fila que ya
 * exista, así que re-ejecutarlo no borra lo que alguien editó a mano.
 */
const CATALOGO = [
  { clave: 'RIEGO', etiqueta: 'Riego de apoyo', categoria: 'AGUA', unidad: 'L', precio: 1.5, descripcion: 'Un balde al pie cuando la lluvia falta.', realceAgua: 14, realceNutri: 0, realceSalud: 2, orden: 1 },
  { clave: 'ABONO_COMPOST', etiqueta: 'Compost de la finca', categoria: 'ABONO', unidad: 'kg', precio: 3.2, descripcion: 'Compost curado: devuelve lo que el grano se llevó.', realceAgua: 0, realceNutri: 16, realceSalud: 4, orden: 2 },
  { clave: 'HUMUS', etiqueta: 'Humus de lombriz', categoria: 'ABONO', unidad: 'kg', precio: 4.0, descripcion: 'El abono más lento y más noble del vivero.', realceAgua: 0, realceNutri: 20, realceSalud: 6, orden: 3 },
  { clave: 'MULCH', etiqueta: 'Cobertura de caña', categoria: 'SUSTRATO', unidad: 'kg', precio: 1.8, descripcion: 'Mulch al pie: retiene la humedad y enfría la raíz.', realceAgua: 8, realceNutri: 4, realceSalud: 6, orden: 4 },
  { clave: 'TUTOR', etiqueta: 'Tutor y amarre', categoria: 'CUIDADO', unidad: 'u', precio: 4.5, descripcion: 'Vara nueva y amarre suelto para que el tronco no se curve.', realceAgua: 0, realceNutri: 0, realceSalud: 9, orden: 5 },
  { clave: 'PODA', etiqueta: 'Poda de formación', categoria: 'CUIDADO', unidad: 'u', precio: 9.0, descripcion: 'Jornal de poda: el árbol reparte su fuerza en dos brazos.', realceAgua: 0, realceNutri: 0, realceSalud: 14, orden: 6 },
];

async function main() {
  const { PrismaClient } = require(path.join(RAIZ, 'backend', 'node_modules', '@prisma', 'client'));
  const prisma = new PrismaClient();

  const existentes = await prisma.parcela.findMany({ select: { id: true, fila: true, columna: true } });
  const porCasilla = new Map(existentes.map((p) => [`${p.fila}-${p.columna}`, p]));
  if (!existentes.length) {
    console.error('❌ El tablero está vacío: arranca el backend y pide /donaciones/siembra/tablero una vez.');
    process.exit(2);
  }

  if (bandera('limpiar')) {
    const arboles = await prisma.apadrinamiento.findMany({ where: { codigo: { startsWith: PREFIJO } }, select: { id: true, parcelaId: true, donacionId: true } });
    await prisma.apadrinamiento.deleteMany({ where: { codigo: { startsWith: PREFIJO } } });
    if (arboles.some((a) => a.donacionId)) await prisma.donacion.deleteMany({ where: { id: { in: arboles.map((a) => a.donacionId).filter(Boolean) } } });
    await prisma.parcela.updateMany({
      where: { id: { in: arboles.map((a) => a.parcelaId) } },
      data: { estado: 'LIBRE', expiraAt: null },
    });
    const reserva = await prisma.parcela.findMany({ where: { estado: 'RESERVADA', arbol: { codigo: { startsWith: PREFIJO } } }, select: { id: true } });
    if (reserva.length) await prisma.parcela.updateMany({ where: { id: { in: reserva.map((r) => r.id) } }, data: { estado: 'LIBRE', expiraAt: null } });
    // El catálogo no se borra: son los precios de la finca, no datos de la demo.
    if (bandera('limpiar-catalogo')) {
      const borrados = await prisma.itemCuidado.deleteMany({ where: { clave: { in: CATALOGO.map((i) => i.clave) } } });
      console.log(`   ${borrados.count} cuidados fuera del catálogo.`);
    }
    console.log(`🧹 ${arboles.length} árboles de ejemplo fuera del tablero; las casillas vuelven a quedar libres.`);
    await prisma.$disconnect();
    return;
  }

  // El catálogo se publica una sola vez: si la finca ya editó un precio, no lo pisamos.
  let nuevosCatalogo = 0;
  for (const i of CATALOGO) {
    const existe = await prisma.itemCuidado.findUnique({ where: { clave: i.clave }, select: { id: true } });
    if (existe) continue;
    await prisma.itemCuidado.create({ data: i });
    nuevosCatalogo++;
  }
  const items = await prisma.itemCuidado.findMany({ select: { id: true, clave: true, etiqueta: true, unidad: true, precio: true } });
  const porClave = new Map(items.map((i) => [i.clave, i]));

  let sembrados = 0;
  const saltadas = [];
  for (const a of [...ARBOLES, RESERVA]) {
    const parcela = porCasilla.get(`${a.fila}-${a.columna}`);
    if (!parcela) {
      saltadas.push(`${a.fila}-${a.columna} (fuera del tablero)`);
      continue;
    }
    const ocupada = await prisma.apadrinamiento.findUnique({
      where: { parcelaId: parcela.id },
      select: { codigo: true, confirmado: true },
    });
    if (ocupada && !ocupada.codigo.startsWith(PREFIJO) && ocupada.confirmado) {
      saltadas.push(`${a.fila}-${a.columna} (árbol real ${ocupada.codigo})`);
      continue;
    }
    const demo = a === RESERVA ? false : true;
    const hoy = new Date();
    const atencion = demo && a.niveles
      ? {
          aguaNivel: a.niveles.agua,
          nutrienteNivel: a.niveles.nutriente,
          saludNivel: a.niveles.salud,
          nivelesEn: hoy,
          ultimoRiego: a.rego ? hace(a.rego) : null,
          ultimoAbono: a.abono ? hace(a.abono) : null,
        }
      : {};
    const datos = {
      especie: a.especie,
      etapa: a.etapa || 'SEMILLA',
      alias: a.alias || null,
      padrino: a.padrino || 'Demostración',
      pais: a.pais || null,
      mensaje: a.mensaje || null,
      notasFinca: a.nota || null,
      confirmado: demo,
      fechaSiembra: demo ? hace(a.desde || 3) : null,
      ...atencion,
    };
    const arbol = await prisma.apadrinamiento.upsert({
      where: { codigo: a.codigo },
      create: { codigo: a.codigo, parcelaId: parcela.id, ...datos },
      update: datos,
    });
    await prisma.parcela.update({
      where: { id: parcela.id },
      data: {
        estado: demo ? 'OCUPADA' : 'RESERVADA',
        expiraAt: demo ? null : new Date(Date.now() + 25 * 60_000),
      },
    });

    // El historial de mimamientos: se rehace en cada corrida para no duplicarlo.
    if (demo && a.historial?.length) {
      await prisma.cuidadoAplicado.deleteMany({ where: { arbolId: arbol.id, donacionId: null } });
      for (const h of a.historial) {
        const item = porClave.get(h.clave);
        if (!item) continue;
        await prisma.cuidadoAplicado.create({
          data: {
            arbolId: arbol.id,
            itemId: item.id,
            etiqueta: item.etiqueta,
            unidad: item.unidad,
            cantidad: h.cantidad,
            costo: Math.round(Number(item.precio) * h.cantidad * 100) / 100,
            moneda: 'USD',
            estado: 'PAGADO',
            createdAt: hace(h.hace),
          },
        });
      }
    }
    sembrados++;
  }

  const t = await fetch(`${API}/donaciones/siembra/tablero`).then((r) => r.json()).catch(() => null);
  console.log(`🌱 ${sembrados} casillas de ejemplo en el tablero${nuevosCatalogo ? ` · catálogo: ${nuevosCatalogo} cuidados nuevos (precios de ejemplo, cámbialos por los de la finca)` : ''}.`);
  if (saltadas.length) console.log(`   respetadas: ${saltadas.join(', ')}`);
  if (t) console.log(`   libres ${t.estadisticas.libres} · con árbol ${t.estadisticas.ocupadas} · apartadas ${t.estadisticas.reservadas} · café ${t.estadisticas.cafe} · cacao ${t.estadisticas.cacao}`);
  console.log(`   abre http://localhost:3002/donaciones/siembra y para la ficha: /donaciones/mi-arbol?codigo=${ARBOLES[0].codigo}`);
  console.log('   para quitar todo: node bin/demo-siembra.js --limpiar');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ No se pudo cargar la demo:', e.message || e);
  process.exit(1);
});
