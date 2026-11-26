import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Aplica a la base de datos existente las modificaciones del documento
 * "MODIFICACIONES EN LA PLATAFORMA" (el seed solo corre al crear la BD):
 *
 *   #9  Quitar las fotos con camas hostel3/hostel4 de la galería del hostal
 *   #10 Cosmic Bungalow → $360.000/noche por pareja (+ $150.000 adicional)
 *   #11 Slug/URL "cosmic-bungalo" → "cosmic-bungalow"
 *   #12 El baño NO está en el exterior (texto de la descripción)
 *   #17 Hostal → $120.000 por persona/noche
 *
 * Uso (requiere la BD levantada: docker compose up -d):
 *   cd backend
 *   node -r ts-node/register prisma/aplicar-modificaciones.ts
 */
async function main() {
  // ---- #11: slug/URL corregido ------------------------------------------
  let cosmic = await prisma.propiedad.findUnique({ where: { slug: "cosmic-bungalo" } });
  if (cosmic) {
    await prisma.propiedad.update({
      where: { id: cosmic.id },
      data: { slug: "cosmic-bungalow" },
    });
    cosmic = { ...cosmic, slug: "cosmic-bungalow" };
    console.log('✓ slug y URL del Cosmic Bungalow → "cosmic-bungalow"');
  } else {
    cosmic = await prisma.propiedad.findUnique({ where: { slug: "cosmic-bungalow" } });
    console.log(cosmic ? "✓ slug cosmic-bungalow ya estaba correcto" : "✗ Cosmic Bungalow no encontrado");
  }

  // ---- #10: precio Cosmic Bungalow --------------------------------------
  if (cosmic && [120000, 250000].includes(cosmic.precioNoche.toNumber())) {
    await prisma.propiedad.update({
      where: { id: cosmic.id },
      data: { precioNoche: 360000 },
    });
    console.log("✓ precio Cosmic Bungalow → $360.000/noche");
  } else if (cosmic) {
    console.log(`· precio Cosmic Bungalow intacto (${cosmic.precioNoche.toNumber()}) — ajústalo en admin si hace falta`);
  }

  // ---- #12: el baño no está en el exterior ------------------------------
  if (cosmic?.descripcion?.includes("Baño con ducha y pileta natural al aire libre")) {
    await prisma.propiedad.update({
      where: { id: cosmic.id },
      data: {
        descripcion: cosmic.descripcion.replace(
          "Baño con ducha y pileta natural al aire libre entre vegetación",
          "Baño con ducha rodeado de vegetación y pileta natural al aire libre entre la vegetación",
        ),
      },
    });
    console.log("✓ descripción del baño corregida (sin 'exterior')");
  }

  // ---- #17: tarifa del hostal -------------------------------------------
  const hostal = await prisma.propiedad.findUnique({ where: { slug: "tropical-biohostel" } });
  if (hostal && hostal.precioNoche.toNumber() === 150000) {
    await prisma.propiedad.update({
      where: { id: hostal.id },
      data: { precioNoche: 120000 },
    });
    console.log("✓ tarifa hostal → $120.000 por persona/noche");
  } else if (hostal) {
    console.log(`· tarifa hostal intacta (${hostal.precioNoche.toNumber()}) — ajústala en admin si hace falta`);
  }

  // ---- #9: quitar fotos con camas de la galería -------------------------
  if (hostal) {
    const { count } = await prisma.propiedadImage.deleteMany({
      where: {
        propiedadId: hostal.id,
        url: { in: ["/tropical/hostel3.jpeg", "/tropical/hostel4.jpeg"] },
      },
    });

    // Reordenar lo que queda para que no queden huecos en la galería.
    const restantes = await prisma.propiedadImage.findMany({
      where: { propiedadId: hostal.id },
      orderBy: { orden: "asc" },
      select: { id: true },
    });
    for (let i = 0; i < restantes.length; i++) {
      await prisma.propiedadImage.update({
        where: { id: restantes[i].id },
        data: { orden: i },
      });
    }
    console.log(
      count > 0
        ? `✓ ${count} foto(s) con camas eliminadas. Galería: ${restantes.length} fotos.`
        : `· fotos con camas ya estaban quitadas. Galería: ${restantes.length} fotos.`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
