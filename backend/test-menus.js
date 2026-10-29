/**
 * Verificación de la carta sembrada: los cuatro menús base existen, activos,
 * con fotos reales y SIN platos inventados; la API pública los sirve y el
 * dinero de un plato viaja como número (no como string).
 *
 * Crea un plato temporal con precio y lo borra al salir, con lo que la base
 * queda como estaba.
 *
 *   node test-menus.js            # con el backend levantado (npm start)
 *   API=http://localhost:3001 node test-menus.js
 */
const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();
const API = process.env.API || "http://localhost:3003"; // PORT de backend/.env
const SLUG = "verificacion-menus-tmp";

async function get(ruta) {
  const r = await fetch(`${API}/api${ruta}`);
  if (!r.ok) throw new Error(`GET ${ruta} -> ${r.status}`);
  return r.json();
}

const mm = (n) => {
  const d = new Date(n);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

async function main() {
  let fallos = 0;
  const check = (ok, nombre, detalle) => {
    if (!ok) fallos++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${nombre}${detalle ? `  (${detalle})` : ""}`);
  };

  // 1) El seed crea la estructura que el proyecto declara.
  const menus = await prisma.comida.findMany({
    where: { slug: { in: ["desayuno", "almuerzo", "cena", "cafeteria"] } },
    include: { platos: true },
    orderBy: { orden: "asc" },
  });
  check(menus.length === 4, "4 menús base sembrados", menus.map((m) => m.slug).join(", "));
  check(menus.every((m) => m.activo), "todos activos");
  check(
    menus.every((m) => m.platos.length === 0),
    "sin platos inventados",
    `total platos: ${menus.reduce((a, m) => a + m.platos.length, 0)}`,
  );
  check(
    menus.every((m) => m.imagenUrl && m.imagenUrl.startsWith("/fotos/sitio/")),
    "fotos reales de la finca",
    menus[0] && menus[0].imagenUrl
  );

  // 2) La API pública los sirve.
  let publicos = [];
  try {
    publicos = await get("/menus");
    check(publicos.length >= 4, "/api/menus devuelve los menús", `${publicos.length} menús`);
  } catch (e) {
    check(false, "/api/menus accesible", `${e.message} — ¿corre "npm start" en el backend?`);
  }

  // 3) Dinero: un Plato sembrado a mano llega como número, no como "18000".
  const platoId = await prisma.plato.create({
    data: {
      comidaId: menus[0].id,
      nombre: "Plato de verificación",
      precio: new Prisma.Decimal("18000.00"),
    },
  });
  try {
    const uno = await get(`/menus/${menus[0].slug}`);
    const precio = uno.platos[0].precio;
    check(
      typeof precio === "number" && precio === 18000,
      "precio Decimal -> number en la API",
      `${typeof precio}: ${JSON.stringify(precio)}`,
    );
  } catch (e) {
    check(false, "detalle de menú por slug", e.message);
  }

  // 4) El slug del seed sirve para la ruta de detalle (/comidas usa estos slugs).
  try {
    const porSlug = await get(`/menus/${menus[1].slug}`);
    check(porSlug.slug === menus[1].slug, "detalle por slug con caracteres correctos", porSlug.slug);
  } catch (e) {
    check(false, "detalle por slug", e.message);
  }

  const conPlatos = await prisma.comida.count({
    where: { activo: true, platos: { some: {} } },
  });
  check(conPlatos === 1, "solo un menú con platos (el temporal)", `${conPlatos}`);

  console.log(`\nHora de la corrida: ${mm(Date.now())}`);
  console.log(fallos ? `${fallos} verificación(es) fallaron` : "Todas las verificaciones pasaron");
  return fallos ? 1 : 0;
}

main()
  .catch((e) => {
    console.error(e.message);
    return 1;
  })
  .then(async (codigo) => {
    // El plato temporal se borra siempre, pase lo que pase arriba.
    try {
      await prisma.plato.deleteMany({ where: { nombre: "Plato de verificación" } });
    } catch (e) {
      console.error(`no se pudo borrar el plato temporal: ${e.message}`);
      return 1;
    }
    await prisma.$disconnect();
    process.exit(codigo);
  });
