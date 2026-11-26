const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('Connected to database!');

    const gemini = await prisma.aIProvider.create({
      data: {
        name: 'Gemini',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
        websiteUrl: 'https://aistudio.google.com/app/apikey',
        isActive: true,
      },
    });

    const openai = await prisma.aIProvider.create({
      data: {
        name: 'OpenAI',
        apiEndpoint: 'https://api.openai.com/v1',
        websiteUrl: 'https://platform.openai.com/api-keys',
        isActive: false,
      },
    });

    const claude = await prisma.aIProvider.create({
      data: {
        name: 'Claude',
        apiEndpoint: 'https://api.anthropic.com/v1',
        websiteUrl: 'https://console.anthropic.com/settings/keys',
        isActive: false,
      },
    });

    const propiedades = [
      {
        nombre: 'Hotel Sierra Verde',
        tipo: 'hotel',
        descripcion: 'Hotel boutique ubicado en el corazon de la sierra, con vistas panoramicas y acceso directo a senderos naturales.',
        ubicacion: 'Nocaima, Cundinamarca',
        admiteMascotas: true,
        seguroDisponible: true,
        capacidadMaxima: 8,
        numeroHabitaciones: 4,
        precioNoche: 120,
        actividades: ['senderismo', 'avistamiento de aves', 'yoga'],
        estado: 'PUBLICADO',
        slug: 'hotel-sierra-verde-' + Date.now().toString(36),
      },
      {
        nombre: 'Hostal La Cabana',
        tipo: 'hostal',
        descripcion: 'Hostal acogedor ideal para parejas y familias pequenas. Desayuno incluido y areas comunes amplias.',
        ubicacion: 'Nocaima, Cundinamarca',
        admiteMascotas: false,
        seguroDisponible: false,
        capacidadMaxima: 6,
        numeroHabitaciones: 3,
        precioNoche: 65,
        actividades: ['ciclismo', 'pesca'],
        estado: 'PUBLICADO',
        slug: 'hostal-la-cabana-' + Date.now().toString(36),
      },
      {
        nombre: 'Centro Turistico Aventura Total',
        tipo: 'centro_turistico',
        descripcion: 'Centro turistico con todas las actividades de aventura: canopy, rappel, senderismo y mas.',
        ubicacion: 'Nocaima, Cundinamarca',
        admiteMascotas: true,
        seguroDisponible: true,
        capacidadMaxima: 20,
        numeroHabitaciones: 10,
        precioNoche: 95,
        actividades: ['canopy', 'rappel', 'senderismo', 'buceo', 'natacion'],
        estado: 'PUBLICADO',
        slug: 'centro-turistico-aventura-total-' + Date.now().toString(36),
      },
    ];

    for (const p of propiedades) {
      await prisma.propiedad.create({ data: p });
    }

    const sponsor = await prisma.sponsor.create({
      data: {
        nombre: 'Colombia Tourism Corp',
        sitioWeb: 'https://colombiatourism.co',
        contacto: 'contacto@colombiatourism.co',
      },
    });

    console.log('Seed completed:');
    console.log('  - 3 AI providers configured');
    console.log('  - 3 properties created');
    console.log('  - 1 sponsor created');
  } catch (e) {
    console.error('Seed failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
