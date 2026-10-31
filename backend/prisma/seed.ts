import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/** "1 ruta creada" / "3 rutas creadas" */
const plural = (n: number, singular: string, plural_: string) =>
  `${n} ${n === 1 ? singular : plural_}`;

const huella = (v: string) => crypto.createHash('md5').update(v).digest('hex').slice(0, 8);

const img = (archivos: string[]) =>
  archivos.map((url, i) => ({ url: `/tropical/${url}`, orden: i, esPrincipal: i === 0 }));

// Fotos reales de la finca (frontend/public/fotos/sitio/)
const imgSitio = (archivos: string[]) =>
  archivos.map((url, i) => ({ url: `/fotos/sitio/${url}`, orden: i, esPrincipal: i === 0 }));

// Seed inicial de Tropical Biohostel: admin + proveedores IA + marca + oferta real
// (datos tomados de docs/Tropical_Biohostel.md y fotos de Imagenes/).
// ⚠️  Los precios son PLACEHOLDER: ajústalos en admin/properties.

type RutaCafeSeed = {
  nombre: string;
  slug: string;
  tipo: "actividad";
  descripcion: string;
  capacidadMaxima: number;
  precioNoche: number;
  actividades: string[];
  imagenes: string[];
};

// Rutas del café (docs/TropicalGuiaCafe.pdf). Se siembran de forma idempotente
// para que funcionen tanto en una base de datos nueva como en una ya poblada.
const RUTAS_CAFE: RutaCafeSeed[] = [
  {
    nombre: "Del bosque a tu taza",
    slug: "ruta-del-bosque-a-tu-taza",
    tipo: "actividad",
    descripcion:
      "Ruta de café orgánico y tostión artesanal: caminata de 15 minutos desde el casco urbano, experiencia de tostión con perfiles claro, medio y oscuro, brunch según el menú seleccionado, degustación de café preparado en casa y una porción de café artesanal para llevar.",
    capacidadMaxima: 10,
    precioNoche: 150000,
    actividades: ["cafe", "caminata", "tostion", "gastronomia", "degustacion"],
    imagenes: ["tropical-cafe.jpg", "tropical-cafe2.jpg", "tropical-cafe5.jpg"],
  },
  {
    nombre: "Respira el bosque",
    slug: "ruta-respira-el-bosque",
    tipo: "actividad",
    descripcion:
      "Ruta de bienestar en el bosque: caminata desde el casco urbano, clase de yoga, brunch según el menú seleccionado, experiencia de tostión artesanal, baño de bosque y degustación de café preparado en casa.",
    capacidadMaxima: 10,
    precioNoche: 200000,
    actividades: ["yoga", "bienestar", "cafe", "caminata", "bosque", "degustacion"],
    imagenes: ["tropical-flores2.jpg", "tropical-gente4.jpg", "tropical-voluntariado.jpg"],
  },
  {
    nombre: "Café y raíces colombianas",
    slug: "ruta-cafe-y-raices-colombianas",
    tipo: "actividad",
    descripcion:
      "Ruta cultural y gastronómica: caminata desde el casco urbano, experiencia de tostión artesanal, almuerzo típico de la región, clase de danza tradicional colombiana y degustación de café preparado en casa.",
    capacidadMaxima: 10,
    precioNoche: 200000,
    actividades: ["cafe", "gastronomia", "cultura", "danza", "caminata", "degustacion"],
    imagenes: ["tropical-cocina.jpg", "tropical-gente3.jpg", "tropical-postre2.jpg"],
  },
];

async function asegurarRutasCafe() {
  let nuevas = 0;
  for (const r of RUTAS_CAFE) {
    const existe = await prisma.propiedad.findUnique({ where: { slug: r.slug } });
    if (existe) continue;
    await prisma.propiedad.create({
      data: {
        nombre: r.nombre,
        slug: r.slug,
        tipo: r.tipo,
        estado: "PUBLICADO",
        descripcion: r.descripcion,
        ubicacion: "Finca Tropical Biohostel, Nocaima",
        ciudad: "Nocaima",
        telefono: "3118371264",
        email: "tropical_biostel@gmail.com",
        whatsapp: "573118371264",
        departamento: "Cundinamarca",
        coordenadas: { lat: 5.073441158648125, lng: -74.36892837539479 },
        capacidadMaxima: r.capacidadMaxima,
        precioNoche: r.precioNoche,
        admiteMascotas: true,
        actividades: r.actividades,
        fuenteDatos: "manual",
        verificado: true,
        images: { create: imgSitio(r.imagenes) },
      },
    });
    nuevas++;
  }
  console.log(
    nuevas > 0
      ? `   - ${plural(nuevas, "ruta del café creada", "rutas del café creadas")}`
      : "   - rutas del café ya presentes en la base de datos",
  );
}

/**
 * Carta de la finca: la taxonomía que el propio proyecto declara
 * (docs/Tropical_Biohostel.md §"Del territorio a la mesa" y la base de
 * conocimiento de Nati: "desayuno, almuerzo, cena, cafetería").
 *
 * ⚠️  Aquí va la ESTRUCTURA, no la carta. No se inventan platos ni precios:
 * los platos —con su precio en COP— los publica la finca desde admin/menus,
 * y `precio: null` ya significa "incluido / a convenir" en el esquema.
 * Mientras un menú no tenga platos, /comidas muestra
 * "Pronto agregaremos los platos de este menú" y Nati no lo menciona.
 *
 * Las descripciones salen del documento de textos de Tropical; las fotos son
 * las reales de frontend/public/fotos/sitio/. Los horarios se dejan vacíos a
 * propósito: nadie los ha publicado todavía.
 */
type MenuSeed = {
  slug: string;
  titulo: string;
  tipo: "DESAYUNO" | "ALMUERZO" | "CENA" | "MERIENDA" | "CAFETERIA" | "OTRO";
  descripcion: string;
  imagenUrl: string;
  orden: number;
};

const MENUS_BASE: MenuSeed[] = [
  {
    slug: "desayuno",
    titulo: "Desayuno",
    tipo: "DESAYUNO",
    descripcion:
      "Alimentación consciente desde la mañana: productos naturales, locales y cultivados en la finca, servidos en el comedor sin prisa.",
    imagenUrl: "/fotos/sitio/tropical-frutas.jpg",
    orden: 1,
  },
  {
    slug: "almuerzo",
    titulo: "Almuerzo",
    tipo: "ALMUERZO",
    descripcion:
      "Cocinado en la cocina abierta de Tropical con ingredientes de la huerta y de los cultivos de la finca, seleccionados conservando sus sabores, aromas, colores y texturas.",
    imagenUrl: "/fotos/sitio/tropical-cocina.jpg",
    orden: 2,
  },
  {
    slug: "cena",
    titulo: "Cena",
    tipo: "CENA",
    descripcion:
      "La mesa de la noche, en el comedor de la finca, con el mismo criterio que el almuerzo: comer es conocer el origen de lo que comemos.",
    imagenUrl: "/fotos/sitio/tropical-cocina2.jpg",
    orden: 3,
  },
  {
    slug: "cafeteria",
    titulo: "Cafetería",
    tipo: "CAFETERIA",
    descripcion:
      "Café de la finca —cerca de 400 plantas— y tostión artesanal propia con perfiles claro, medio y oscuro, además de los frutales de Tropical y sus aromáticas.",
    imagenUrl: "/fotos/sitio/tropical-granos-cafe.jpg",
    orden: 4,
  },
];

/**
 * Crea los menús que falten (idempotente por slug). Los ya existentes no se
 * tocan: si la finca editó el título, la foto o la descripción desde el panel,
 * el seed respeta esa versión.
 */
async function asegurarMenus() {
  let nuevos = 0;
  for (const m of MENUS_BASE) {
    const existe = await prisma.comida.findUnique({ where: { slug: m.slug } });
    if (existe) continue;
    await prisma.comida.create({
      data: {
        slug: m.slug,
        titulo: m.titulo,
        tipo: m.tipo,
        descripcion: m.descripcion,
        imagenUrl: m.imagenUrl,
        orden: m.orden,
        activo: true,
      },
    });
    nuevos++;
  }
  console.log(
    nuevos > 0
      ? `   - ${plural(nuevos, "menú base creado", "menús base creados")} (sin platos: la carta se publica desde admin)`
      : "   - menús base ya presentes en la base de datos",
  );
}

/**
 * Reseñas reales publicadas en Google Maps (58 opiniones, 4.8/5) para
 * Tropical Biohostel. Se siembran una sola vez: si ya existe una reseña del
 * mismo autor y origen, no se duplica.
 */
const RESENAS_GOOGLE = [
  {
    autor: "Pablo Garcia Larriba",
    calificacion: 5,
    fuente: "google",
    fecha: new Date("2026-02-20T12:00:00Z"),
    comentario:
      "Un lugar simplemente encantador. El hostel está en Nocaima, en un pueblito tranquilo y lleno de magia. Es muy sencillo, pero justamente ahí está su encanto: cabañas hermosas, rodeadas de naturaleza, donde se duerme delicioso. La comida es increíble, variada y de calidad; hecha con amor y sabor de hogar. Y lo mejor de todo, Nazareth y Rodrigo: anfitriones espectaculares, cálidos y con una energía que te hace sentir como en casa desde el primer momento. Volveríamos sin pensarlo. Súper recomendado.",
    respuesta:
      "Mil gracias por tan increíble visita. Lo más grato para nosotros es lograr tener un verdadero intercambio cultural y gastronómico.",
  },
  {
    autor: "Sarai Serrano Sánchez",
    calificacion: 5,
    fuente: "google",
    fecha: new Date("2026-02-18T12:00:00Z"),
    comentario:
      "Tropical Biohostel es un lugar mágico. Perfecto para conectarte con la naturaleza y el entorno y desconectar del ruido del día a día. Las cabañitas son súper lindas y acogedoras. Pero, sin duda, lo mejor de todo es el excelente trato de Nazareth y Rodrigo, son un amor de personas que te hacen sentir como en casa desde el minuto uno. La comida es otro punto excelente de la estancia, todo absolutamente delicioso y con productos de primera calidad. Volveríamos una y mil veces. Muchísimas gracias por la excelente acogida: nos llevamos para siempre un cachito de Nocaima con nosotros.",
    respuesta:
      "Saray, fue un verdadero honor. Para nosotros tu llegada es lo más grato, y más aún tu animosidad y energía: los espacios se hacen gracias a quienes los ocupan, y vosotros formáis parte de nuestro espacio por algunos días. Gracias.",
  },
  {
    autor: "60martha",
    calificacion: 4,
    fuente: "tripadvisor",
    fecha: new Date("2017-10-20T12:00:00Z"),
    comentario:
      "Es un lugar para conectar con la tierra, la naturaleza, sin las distracciones de la tecnología y la televisión. Extraordinario paisaje y la oportunidad de compartir la buena energía de su anfitrión, Rodrigo: es un lugar en el que se respira paz.",
    respuesta: "",
  },
  {
    autor: "Santiago Roa",
    calificacion: 5,
    fuente: "google",
    fecha: new Date("2025-12-20T12:00:00Z"),
    comentario:
      "Una experiencia verdaderamente mágica. Llegué a Tropical Biohostel recomendado por unos amigos, pero nunca imaginé que este lugar fuera tan especial. Desde el primer día sentí una energía única: el cariño de los dos guardianes, Orejas y Snupi, te recibe como si volvieras a casa. La comida es espectacular y el ambiente es exactamente lo que buscaba: naturaleza pura, muchos pajaritos, un pozo hermoso y una quebrada cercana que arrulla a los visitantes, especialmente en invierno. Cada rincón tiene vida, calma y belleza. Agradezco profundamente a Nazareth y a don Rodrigo por el tiempo compartido, por las conversaciones y por las enseñanzas. Esta semana aquí ha sido una gran experiencia que definitivamente quiero repetir, esta vez con la intención de quedarme mucho más tiempo. Gracias por crear un lugar tan mágico.",
    respuesta:
      "Santiago, tu tiempo en la finca fue realmente increíble. Mil gracias por tu visita.",
  },
  {
    autor: "Claudia Milena Hernandez Prada",
    calificacion: 5,
    fuente: "google",
    fecha: new Date("2025-10-20T12:00:00Z"),
    comentario:
      "Es un lugar donde encuentras la vibración pura de la Madre Naturaleza, y te conectas con la sencillez de la vida de los seres que aquí habitan, restaurando la energía de tu corazón y tu biología. La atención de Nazareth y Rodrigo es maravillosa, además de su amabilidad y su deliciosa comida: nos comparten su sabiduría de la conexión con la vida. Gozamos además de una clase de Bioworkout con Rodrigo y recuperamos la felicidad en nuestras células.",
    respuesta:
      "Doña Claudia, cómo no recordar su visita y su gran corazón y generosidad con el espacio. Un gran abrazo para su hija y su esposo. Que Dios les bendiga y prospere por siempre.",
  },
];

/** Siembra las reseñas de Google Maps (idempotente). */
async function sembrarResenasGoogle() {
  const propiedad = await prisma.propiedad.findUnique({ where: { slug: "tropical-biohostel" } });
  if (!propiedad) return;

  let nuevas = 0;
  for (const r of RESENAS_GOOGLE) {
    const existente = await prisma.review.findFirst({
      where: { propiedadId: propiedad.id, autorNombre: r.autor, fuente: r.fuente },
    });
    if (existente) continue;
    await prisma.review.create({
      data: {
        propiedadId: propiedad.id,
        autorNombre: r.autor,
        calificacion: r.calificacion,
        comentario: r.comentario,
        respuestaAnfitrion: r.respuesta || null,
        fuente: r.fuente,
        createdAt: r.fecha,
      },
    });
    nuevas++;
  }

  // Calificación global y número de opiniones publicados en Google Maps
  // (datos del perfil público: 4.8/5 con 58 opiniones).
  const GOOGLE_RATING = 4.8;
  const GOOGLE_OPINIONES = 58;

  const total = await prisma.review.count({
    where: { propiedadId: propiedad.id, fuente: { in: ["google", "tripadvisor"] } },
  });
  const promedio = await prisma.review.aggregate({
    where: { propiedadId: propiedad.id, fuente: { in: ["google", "tripadvisor"] } },
    _avg: { calificacion: true },
  });
  const rating = promedio._avg.calificacion ? Math.round(promedio._avg.calificacion * 10) / 10 : GOOGLE_RATING;

  await prisma.propiedad.update({
    where: { id: propiedad.id },
    data: {
      ratingExterno: rating,
      resenasExternas: Math.max(propiedad.resenasExternas ?? 0, GOOGLE_OPINIONES),
    },
  });

  console.log(
    nuevas > 0
      ? `   - ${nuevas} reseñas de Google Maps sembradas (${total} en total, media ${rating})`
      : `   - reseñas de Google Maps ya estaban (${total} en total, media ${rating})`,
  );
}

/**
 * Ajustes idempotentes sobre datos que ya existen en la base.
 *
 * Solo cambian valores que siguen en su valor por defecto: si alguien los editó
 * a mano desde el panel de administración, no se tocan.
 */
async function ajustarBase() {
  // Precio del Cosmic Bungalow: antes $120.000 → ahora $250.000 por pareja.
  const bung = await prisma.propiedad.findUnique({ where: { slug: "cosmic-bungalo" } });
  if (bung && bung.precioNoche.toNumber() === 120000) {
    await prisma.propiedad.update({
      where: { slug: "cosmic-bungalo" },
      data: { precioNoche: 250000 },
    });
    console.log("   - precio del Cosmic Bungalow actualizado a $250.000");
  }

  // Ortografía del nombre: el documento de textos escribe "Bungalow" (sin tilde).
  // El slug y la URL (cosmic-bungalo) no cambian.
  if (bung && bung.nombre.includes("Bungaló")) {
    await prisma.propiedad.update({
      where: { slug: "cosmic-bungalo" },
      data: {
        nombre: bung.nombre.replace(/Bungaló/g, "Bungalow"),
        descripcion: bung.descripcion?.replace(/Bungaló/g, "Bungalow") ?? null,
      },
    });
    console.log('   - nombre actualizado a "Cosmic Bungalow"');
  }

  // Portadas de los proyectos de donación (solo si están vacías).
  const portadas: Record<string, string> = {
    "siembra-100-arboles-nativos": "/fotos/sitio/tropical-gente4.jpg",
    "huella-de-carbono-compensa-tu-visita": "/fotos/sitio/tropical-flores2.jpg",
  };
  for (const [slug, imagenUrl] of Object.entries(portadas)) {
    const p = await prisma.proyectoDonacion.findUnique({ where: { slug } });
    if (p && !p.imagenUrl) {
      await prisma.proyectoDonacion.update({ where: { slug }, data: { imagenUrl } });
      console.log(`   - portada asignada a "${p.titulo}"`);
    }
  }

  await sincronizarFotosBase();
}

/**
 * Sustituye las fotos del catálogo base por las fotos reales de la finca.
 *
 * Solo reemplaza si la propiedad sigue con el juego de imágenes que dejó el
 * propio seed: si alguien cambió las fotos desde el panel, se respetan.
 */
const FOTOS_BASE: Record<string, { anteriores: string[]; nuevas: string[] }> = {
  "tour-cafe-cacao-tropical": {
    anteriores: ["/tropical/MAndarina.jpeg", "/tropical/MandarinaLimon.jpeg", "/tropical/Hostal8.jpeg"],
    nuevas: ["tropical-cafe.jpg", "tropical-gente.jpg", "tropical-cafe5.jpg"],
  },
  "caminata-bienestar-tropical": {
    anteriores: ["/tropical/Hostal9.jpeg", "/tropical/Hostal10.jpeg", "/tropical/Hostal11.jpeg"],
    nuevas: ["tropical-flores2.jpg", "tropical-gente4.jpg", "tropical-voluntariado.jpg"],
  },
  "mesa-tropical": {
    anteriores: ["/tropical/MandarinaLimon.jpeg", "/tropical/MAndarina.jpeg"],
    nuevas: ["tropical-cocina.jpg", "tropical-postre.jpg", "tropical-cocina2.jpg"],
  },
  "ruta-del-bosque-a-tu-taza": {
    anteriores: ["/tropical/Hostal5.jpeg", "/tropical/MAndarina.jpeg", "/tropical/MandarinaLimon.jpeg"],
    nuevas: ["tropical-cafe.jpg", "tropical-cafe2.jpg", "tropical-cafe5.jpg"],
  },
  "ruta-respira-el-bosque": {
    anteriores: ["/tropical/Hostal6.jpeg", "/tropical/Hostal8.jpeg", "/tropical/Hostal9.jpeg"],
    nuevas: ["tropical-flores2.jpg", "tropical-gente4.jpg", "tropical-voluntariado.jpg"],
  },
  "ruta-cafe-y-raices-colombianas": {
    anteriores: ["/tropical/Hostal7.jpeg", "/tropical/Hostal10.jpeg", "/tropical/Hostal11.jpeg"],
    nuevas: ["tropical-cocina.jpg", "tropical-gente3.jpg", "tropical-postre2.jpg"],
  },
};

async function sincronizarFotosBase() {
  for (const [slug, { anteriores, nuevas }] of Object.entries(FOTOS_BASE)) {
    const p = await prisma.propiedad.findUnique({
      where: { slug },
      include: { images: true },
    });
    if (!p) continue;

    const actuales = p.images.map((i) => i.url);
    const sonLasDelSeed =
      actuales.length > 0 && actuales.every((u) => anteriores.includes(u));
    if (!sonLasDelSeed) continue; // cambiadas a mano: no se tocan

    await prisma.propiedadImage.deleteMany({ where: { propiedadId: p.id } });
    await prisma.propiedadImage.createMany({
      data: nuevas.map((url, i) => ({
        propiedadId: p.id,
        url: `/fotos/sitio/${url}`,
        orden: i,
        esPrincipal: i === 0,
      })),
    });
    console.log(`   - fotos actualizadas en "${p.nombre}"`);
  }
}

/** Crea la propiedad solo si no existe ya ese slug (idempotente). */
async function crearPropiedad(args: { data: Prisma.PropiedadCreateInput }) {
  const slug = args.data.slug;
  const existente = await prisma.propiedad.findUnique({ where: { slug } });
  if (existente) return false;
  await prisma.propiedad.create(args);
  return true;
}

/** Cuatro sílabas + dígitos: se puede leer en voz alta y teclear sin errores. */
function generarClaveAdmin(): string {
  const consonantes = 'bcdfghjklmnpqrstvwz';
  const vocales = 'aeiou';
  const r = (n: number) => crypto.randomInt(n);
  const silaba = () =>
    consonantes[r(consonantes.length)] + vocales[r(vocales.length)] + consonantes[r(consonantes.length)];
  const clave = `${silaba()}${silaba()}${silaba()}${silaba()}${String(r(100))}`;
  return clave[0].toUpperCase() + clave.slice(1);
}

/** Primer directorio con .git subiendo desde el seed; en un contenedor no hay. */
function raizDelRepo(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const padre = path.dirname(dir);
    if (padre === dir) break;
    dir = padre;
  }
  return null;
}

/**
 * La clave del primer admin no puede estar en el código: el repositorio es
 * público y "admin123" se conoció. ADMIN_PASSWORD fija la del despliegue; sin
 * esa variable se genera y se deja en CredencialesAdmin.txt (0600, fuera de git).
 */
function claveDelAdmin(email: string): { clave: string; generada: boolean } | null {
  if (process.env.ADMIN_PASSWORD) return { clave: process.env.ADMIN_PASSWORD, generada: false };

  const raiz = raizDelRepo();
  if (!raiz) {
    // En un contenedor no hay dónde anotar la clave, y irla a buscar después no
    // sirve: sin ADMIN_PASSWORD se queda sin admin y hay que volver a correr el seed.
    console.log(
      '   - SIN ADMIN: este entorno no tiene repo donde anotar una clave generada. ' +
        'Defní ADMIN_PASSWORD y volvé a correr el seed (o node bin/rotar-admin.js --aplicar).',
    );
    return null;
  }

  const clave = generarClaveAdmin();
  const archivo = path.join(raiz, 'CredencialesAdmin.txt');
  const previo = fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8') : '';
  const momento = new Date().toISOString().slice(0, 16).replace('T', ' ');
  fs.writeFileSync(archivo, `${previo}\n## Panel admin — creada por el seed el ${momento}\n- ${email}: ${clave}\n`, {
    mode: 0o600,
  });
  return { clave, generada: true };
}

async function asegurarAdmin(email: string) {
  if (await prisma.user.findUnique({ where: { email } })) {
    console.log('   - admin ya existía');
    return;
  }

  const entregada = claveDelAdmin(email);
  if (!entregada) return;
  const { clave, generada } = entregada;

  const admin = await prisma.user.create({
    data: {
      email,
      supabaseId: 'local_admin@tropicalbiohostel.com',
      nombre: 'Administrador',
      role: 'admin',
    },
  });
  await prisma.$executeRawUnsafe(
    'UPDATE "User" SET "passwordHash" = $1 WHERE id = $2',
    bcrypt.hashSync(clave, 12),
    admin.id,
  );

  // El hash guardado tiene que abrir con la clave que se entregó.
  const vuelto = await prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { passwordHash: true } });
  if (!bcrypt.compareSync(clave, vuelto.passwordHash)) {
    throw new Error(`la contraseña de ${email} no verifica después de escribirla`);
  }

  console.log(
    generada
      ? `   - 1 admin creado; la clave se generó y quedó en CredencialesAdmin.txt (huella ${huella(clave)})`
      : `   - 1 admin creado con ADMIN_PASSWORD (huella ${huella(clave)})`,
  );
}

async function main() {
  // Siempre asegura las rutas del café (idempotente; no depende del seed principal)
  await asegurarRutasCafe();
  await asegurarMenus();
  await ajustarBase();
  await sembrarResenasGoogle();

  // Cada sección del seed es idempotente: si falta algo (p. ej. porque una
  // corrida anterior se interrumpió a mitad), se completa en la siguiente.
  await asegurarAdmin("admin@tropicalbiohostel.com");

  const aiProviders = [
    { name: "Gemini", apiEndpoint: "https://generativelanguage.googleapis.com/v1beta", websiteUrl: "https://aistudio.google.com/app/apikey", isActive: true, paraChat: true },
    { name: "OpenAI", apiEndpoint: "https://api.openai.com/v1", websiteUrl: "https://platform.openai.com/api-keys", isActive: false, paraChat: false },
    { name: "Claude (Anthropic)", apiEndpoint: "https://api.anthropic.com/v1", websiteUrl: "https://console.anthropic.com/settings/keys", isActive: false, paraChat: false },
    { name: "DeepSeek", apiEndpoint: "https://api.deepseek.com/v1", websiteUrl: "https://platform.deepseek.com/api-keys", isActive: false, paraChat: false },
    { name: "Groq", apiEndpoint: "https://api.groq.com/openai/v1", websiteUrl: "https://console.groq.com/keys", isActive: false, paraChat: false },
  ];
  let nuevosProveedores = 0;
  for (const p of aiProviders) {
    const existe = await prisma.aIProvider.findFirst({ where: { name: p.name } });
    if (existe) continue;
    await prisma.aIProvider.create({ data: p });
    nuevosProveedores++;
  }
  console.log(
    nuevosProveedores > 0
      ? `   - ${plural(nuevosProveedores, "proveedor IA creado", "proveedores IA creados")} (Gemini marcado para Nati, sin key: agrégala en admin)`
      : "   - proveedores IA ya estaban",
  );

  await prisma.siteConfig.upsert({
    where: { key: "site-branding" },
    update: {},
    create: {
      key: "site-branding",
      value: { nombre: "Tropical Biohostel", logoUrl: "/tropical-logo.svg" },
    },
  });
  console.log("   - marca site-branding creada (Tropical Biohostel)");

  // 1) El hostal
  await crearPropiedad({
    data: {
      nombre: "Tropical Biohostel",
      slug: "tropical-biohostel",
      tipo: "hostal",
      estado: "PUBLICADO",
      descripcion:
        "Eco-hostel en zona rural de Nocaima, a 10 minutos del casco urbano. Tres cabañas con baño privado y un bungalow de descanso en una finca con 30 % de bosque nativo, 400 plantas de café, frutales y huerta orgánica. Comedor para 10, cocina abierta equipada y experiencias de café, cacao, caminatas y bienestar. Naturaleza que se vive, sabores que se descubren.",
      ubicacion: "Zona rural, a 10 minutos del casco urbano de Nocaima",
      ciudad: "Nocaima",
      telefono: "3118371264",
      email: "tropical_biostel@gmail.com",
      whatsapp: "573118371264",
      departamento: "Cundinamarca",
      coordenadas: { lat: 5.073441158648125, lng: -74.36892837539479 },
      capacidadMaxima: 10,
      numeroHabitaciones: 4,
      numeroBanos: 3,
      tieneCocina: true,
      tieneParqueadero: true,
      tieneWifi: true,
      admiteMascotas: true, // cabañas y zonas comunes sí; Cosmic Bungalow no
      precioNoche: 150000,
      actividades: ["senderismo", "avistamiento", "yoga", "cafe", "cacao", "gastronomia", "bienestar"],
      horarioCheckIn: "15:00",
      horarioCheckOut: "12:00",
      fuenteDatos: "manual",
      verificado: true,
      images: {
        create: [
          { url: "/fotos/BioHostel5.jpg", orden: 0, esPrincipal: true },
          { url: "/fotos/BioHostel6.jpg", orden: 1, esPrincipal: false },
          ...img(["Hostel1.jpeg", "hostel2.jpeg", "hostel3.jpeg", "hostel4.jpeg", "Hostal5.jpeg", "Hostal6.jpeg", "Hostal7.jpeg"]).map((o, i) => ({ ...o, orden: o.orden + 2, esPrincipal: false })),
        ],
      },
    },
  });

  // 2) Cosmic Bungalow — refugio de arquitectura sagrada hexagonal
  await crearPropiedad({
    data: {
      nombre: "Cosmic Bungalow",
      slug: "cosmic-bungalo",
      tipo: "glamping",
      estado: "PUBLICADO",
      descripcion:
        "Cosmic Bungalow: un refugio donde la naturaleza, el arte y la energía del lugar se encuentran. Cabaña íntima de aproximadamente cinco metros cuadrados, inspirada en arquitectura sagrada y geometría hexagonal, construida artesanalmente con ladrillo prensado y materiales naturales de la finca. Mándalas, símbolos rúnicos, matices, pisos rústicos y acabados hechos a mano. Cama confortable, sillas acogedoras, luz cálida y gran vista del trópico. Baño con ducha y pileta natural al aire libre entre vegetación. Flora y fauna presentes: ranas, mariposas, colibríes y criaturas del bosque. Espacios para el esparcimiento y la contemplación, rincón para observar estrellas, y para leer, escribir, pintar o trabajar con la naturaleza como inspiración. Tras tu reserva podrás programar según disponibilidad Yoga, Chi Kung y Tai Chi.",
      ubicacion: "Finca Tropical Biohostel, zona rural a 10 minutos de Nocaima",
      ciudad: "Nocaima",
      telefono: "3118371264",
      email: "tropical_biostel@gmail.com",
      whatsapp: "573118371264",
      departamento: "Cundinamarca",
      coordenadas: { lat: 5.073441158648125, lng: -74.36892837539479 },
      capacidadMaxima: 2,
      numeroHabitaciones: 1,
      numeroBanos: 1,
      tieneCocina: false,
      tieneParqueadero: true,
      tieneWifi: true,
      precioNoche: 120000,
      actividades: ["descanso", "contemplacion", "yoga", "bienestar", "lectura", "pintura", "avistamiento", "estrellas"],
      horarioCheckIn: "15:00",
      horarioCheckOut: "12:00",
      fuenteDatos: "manual",
      verificado: true,
      images: {
        create: [
          { url: "/fotos/BioHostel10.jpg", orden: 0, esPrincipal: true },
          { url: "/fotos/BioHostel2.jpg", orden: 1, esPrincipal: false },
          { url: "/fotos/BioHostel9.jpg", orden: 2, esPrincipal: false },
          { url: "/fotos/BioHostel1.jpg", orden: 3, esPrincipal: false },
        ],
      },
    },
  });

  // 3) Tour del café y el cacao
  await crearPropiedad({
    data: {
      nombre: "Tour del Café y el Cacao",
      slug: "tour-cafe-cacao-tropical",
      tipo: "actividad",
      estado: "PUBLICADO",
      descripcion:
        "Recorrido guiado por los cultivos de la finca: 400 plantas de café, cacao, frutales y huerta de aromáticas. Conoce el proceso del grano a la taza, prueba frutos de temporada y cierra con degustación. Ideal para toda la familia.",
      ubicacion: "Finca Tropical Biohostel, Nocaima",
      ciudad: "Nocaima",
      telefono: "3118371264",
      email: "tropical_biostel@gmail.com",
      whatsapp: "573118371264",
      departamento: "Cundinamarca",
      coordenadas: { lat: 5.073441158648125, lng: -74.36892837539479 },
      capacidadMaxima: 10,
      precioNoche: 45000,
      admiteMascotas: true,
      actividades: ["cafe", "cacao", "caminata", "gastronomia", "taller"],
      fuenteDatos: "manual",
      verificado: true,
      images: { create: imgSitio(["tropical-cafe.jpg", "tropical-gente.jpg", "tropical-cafe5.jpg"]) },
    },
  });

  // 3) Caminata ecológica + bienestar
  await crearPropiedad({
    data: {
      nombre: "Caminata Ecológica y Bienestar",
      slug: "caminata-bienestar-tropical",
      tipo: "actividad",
      estado: "PUBLICADO",
      descripcion:
        "Caminata sin afán por el bosque nativo y los cultivos, con pausas de respiración y contemplación. Opción de sesión de yoga, tai chi o chi kung en medio de la naturaleza. Abejas meliponas, aves y sonidos del bosque incluidos.",
      ubicacion: "Finca Tropical Biohostel, Nocaima",
      ciudad: "Nocaima",
      telefono: "3118371264",
      email: "tropical_biostel@gmail.com",
      whatsapp: "573118371264",
      departamento: "Cundinamarca",
      coordenadas: { lat: 5.073441158648125, lng: -74.36892837539479 },
      capacidadMaxima: 10,
      precioNoche: 35000,
      admiteMascotas: true,
      actividades: ["senderismo", "caminata", "yoga", "avistamiento", "bienestar", "bosque"],
      fuenteDatos: "manual",
      verificado: true,
      images: { create: imgSitio(["tropical-flores2.jpg", "tropical-gente4.jpg", "tropical-voluntariado.jpg"]) },
    },
  });

  // 4) Restaurante de la finca
  await crearPropiedad({
    data: {
      nombre: "Mesa Tropical — Cocina de la Finca",
      slug: "mesa-tropical",
      tipo: "restaurante",
      estado: "PUBLICADO",
      descripcion:
        "Alimentación consciente del territorio a la mesa: frutos, aromáticas y productos cultivados en la finca, varios de manera orgánica. Comedor para 10 personas y cocina abierta. En Tropical comer no es solo alimentarse: es conocer el origen de lo que comemos.",
      ubicacion: "Finca Tropical Biohostel, Nocaima",
      ciudad: "Nocaima",
      telefono: "3118371264",
      email: "tropical_biostel@gmail.com",
      whatsapp: "573118371264",
      departamento: "Cundinamarca",
      coordenadas: { lat: 5.073441158648125, lng: -74.36892837539479 },
      capacidadMaxima: 10,
      tieneCocina: true,
      precioNoche: 25000,
      admiteMascotas: true,
      actividades: ["gastronomia", "cafe", "taller"],
      fuenteDatos: "manual",
      verificado: true,
      images: { create: imgSitio(["tropical-cocina.jpg", "tropical-postre.jpg", "tropical-cocina2.jpg"]) },
    },
  });

  console.log("   - sitios base verificados (hostal + Cosmic Bungalow + 2 actividades + restaurante)");

  // Donaciones iniciales (siembra y carbono) — idempotente por slug
  const proyectos = [
    {
      titulo: "Siembra 100 árboles nativos",
      slug: "siembra-100-arboles-nativos",
      descripcion:
        "Cada aporte siembra árboles nativos en la finca y zonas de restauración: guayacán, cedro, chicalá y especies del bosque seco tropical. Incluye placa con tu nombre y reporte fotográfico de la siembra.\n\nCosto aproximado por árbol: $25.000 (plántula, hoyado, tutorado y 1 año de mantenimiento).",
      categoria: "ARBOLES" as const,
      meta: 2500000,
      moneda: "USD",
      estado: "ACTIVO" as const,
      imagenUrl: "/fotos/sitio/tropical-gente4.jpg",
      orden: 0,
    },
    {
      titulo: "Huella de carbono: compensa tu visita",
      slug: "huella-de-carbono-compensa-tu-visita",
      descripcion:
        "Calcula y compensa las emisiones de tu viaje apoyando conservación de bosque nativo, huerta orgánica y energías limpias en la finca. Recibirás un certificado simbólico de compensación con los kilos de CO2e apoyados.",
      categoria: "CARBONO" as const,
      meta: 1000,
      moneda: "USD",
      estado: "ACTIVO" as const,
      imagenUrl: "/fotos/sitio/tropical-flores2.jpg",
      orden: 1,
    },
  ];
  let nuevosProyectos = 0;
  for (const p of proyectos) {
    const existe = await prisma.proyectoDonacion.findUnique({ where: { slug: p.slug } });
    if (existe) continue;
    await prisma.proyectoDonacion.create({ data: p });
    nuevosProyectos++;
  }
  console.log(
    nuevosProyectos > 0
      ? `   - ${plural(nuevosProyectos, "proyecto de donación creado", "proyectos de donación creados")}`
      : "   - proyectos de donación ya estaban",
  );
  console.log("✅ Seed Tropical Biohostel completo. ⚠️ Revisa los precios placeholder en admin/properties.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
