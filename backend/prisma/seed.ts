import { PrismaClient } from "@prisma/client";
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const img = (archivos: string[]) =>
  archivos.map((url, i) => ({ url: `/tropical/${url}`, orden: i, esPrincipal: i === 0 }));

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
    imagenes: ["Hostal5.jpeg", "MAndarina.jpeg", "MandarinaLimon.jpeg"],
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
    imagenes: ["Hostal6.jpeg", "Hostal8.jpeg", "Hostal9.jpeg"],
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
    imagenes: ["Hostal7.jpeg", "Hostal10.jpeg", "Hostal11.jpeg"],
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
        images: { create: img(r.imagenes) },
      },
    });
    nuevas++;
  }
  console.log(
    nuevas > 0
      ? `   - ${nuevas} rutas del café creadas`
      : "   - rutas del café ya presentes en la base de datos",
  );
}

async function main() {
  // Siempre asegura las rutas del café (idempotente; no depende del seed principal)
  await asegurarRutasCafe();

  const yaHay = await prisma.user.count();
  if (yaHay > 0) {
    console.log("ℹ️  La base de datos ya tiene datos. Seed omitido.");
    return;
  }

  const adminHash = bcrypt.hashSync("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@tropicalbiohostel.com",
      supabaseId: "local_admin@tropicalbiohostel.com",
      nombre: "Administrador",
      role: "admin",
    },
  });
  await prisma.$executeRawUnsafe(
    'UPDATE "User" SET "passwordHash" = $1 WHERE id = $2',
    adminHash,
    admin.id,
  );
  console.log("   - 1 admin creado (admin@tropicalbiohostel.com / admin123)");

  const aiProviders = [
    { name: "Gemini", apiEndpoint: "https://generativelanguage.googleapis.com/v1beta", websiteUrl: "https://aistudio.google.com/app/apikey", isActive: true, paraChat: true },
    { name: "OpenAI", apiEndpoint: "https://api.openai.com/v1", websiteUrl: "https://platform.openai.com/api-keys", isActive: false, paraChat: false },
    { name: "Claude (Anthropic)", apiEndpoint: "https://api.anthropic.com/v1", websiteUrl: "https://console.anthropic.com/settings/keys", isActive: false, paraChat: false },
    { name: "DeepSeek", apiEndpoint: "https://api.deepseek.com/v1", websiteUrl: "https://platform.deepseek.com/api-keys", isActive: false, paraChat: false },
    { name: "Groq", apiEndpoint: "https://api.groq.com/openai/v1", websiteUrl: "https://console.groq.com/keys", isActive: false, paraChat: false },
  ];
  for (const p of aiProviders) {
    await prisma.aIProvider.create({ data: p });
  }
  console.log(`   - ${aiProviders.length} proveedores IA (Gemini marcado para Nati, sin key: agrégala en admin)`);

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
  await prisma.propiedad.create({
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
      admiteMascotas: true, // cabañas y zonas comunes sí; Cosmic Bungaló no
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

  // 2) Cosmic Bungaló — refugio de arquitectura sagrada hexagonal
  await prisma.propiedad.create({
    data: {
      nombre: "Cosmic Bungaló",
      slug: "cosmic-bungalo",
      tipo: "glamping",
      estado: "PUBLICADO",
      descripcion:
        "Cosmic Bungaló: un refugio donde la naturaleza, el arte y la energía del lugar se encuentran. Cabaña íntima de aproximadamente cinco metros cuadrados, inspirada en arquitectura sagrada y geometría hexagonal, construida artesanalmente con ladrillo prensado y materiales naturales de la finca. Mándalas, símbolos rúnicos, matices, pisos rústicos y acabados hechos a mano. Cama confortable, sillas acogedoras, luz cálida y gran vista del trópico. Baño con ducha y pileta natural al aire libre entre vegetación. Flora y fauna presentes: ranas, mariposas, colibríes y criaturas del bosque. Espacios para el esparcimiento y la contemplación, rincón para observar estrellas, y para leer, escribir, pintar o trabajar con la naturaleza como inspiración. Tras tu reserva podrás programar según disponibilidad Yoga, Chi Kung y Tai Chi.",
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
  await prisma.propiedad.create({
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
      images: { create: img(["MAndarina.jpeg", "MandarinaLimon.jpeg", "Hostal8.jpeg"]) },
    },
  });

  // 3) Caminata ecológica + bienestar
  await prisma.propiedad.create({
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
      images: { create: img(["Hostal9.jpeg", "Hostal10.jpeg", "Hostal11.jpeg"]) },
    },
  });

  // 4) Restaurante de la finca
  await prisma.propiedad.create({
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
      images: { create: img(["MandarinaLimon.jpeg", "MAndarina.jpeg"]) },
    },
  });

  console.log("   - 5 sitios publicados (hostal + Cosmic Bungaló + 2 actividades + restaurante)");

  // Donaciones iniciales (siembra y carbono)
  const nProy = await prisma.proyectoDonacion.count();
  if (nProy === 0) {
    await prisma.proyectoDonacion.createMany({
      data: [
        {
          titulo: "Siembra 100 árboles nativos",
          slug: "siembra-100-arboles-nativos",
          descripcion:
            "Cada aporte siembra árboles nativos en la finca y zonas de restauración: guayacán, cedro, chicalá y especies del bosque seco tropical. Incluye placa con tu nombre y reporte fotográfico de la siembra.\n\nCosto aproximado por árbol: $25.000 (plántula, hoyado, tutorado y 1 año de mantenimiento).",
          categoria: "ARBOLES",
          meta: 2500000,
          moneda: "USD",
          estado: "ACTIVO",
          orden: 0,
        },
        {
          titulo: "Huella de carbono: compensa tu visita",
          slug: "huella-de-carbono-compensa-tu-visita",
          descripcion:
            "Calcula y compensa las emisiones de tu viaje apoyando conservación de bosque nativo, huerta orgánica y energías limpias en la finca. Recibirás un certificado simbólico de compensación con los kilos de CO2e apoyados.",
          categoria: "CARBONO",
          meta: 1000,
          moneda: "USD",
          estado: "ACTIVO",
          orden: 1,
        },
      ],
    });
    console.log("   - 2 proyectos de donación creados");
  }
  console.log("✅ Seed Tropical Biohostel completo. ⚠️ Revisa los precios placeholder en admin/properties.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
