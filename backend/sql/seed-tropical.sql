-- Seed de propiedades para Tropical Biohostel (MariaDB)
-- Ejecutar en phpMyAdmin sobre tropica5_tropical_db
-- Idempotente por slug (ON DUPLICATE KEY UPDATE)

SET NAMES utf8mb4;

INSERT INTO properties (
  id, slug, nombre, tipo, descripcion, ubicacion, direccion, ciudad, departamento,
  telefono, email, whatsapp, estrellas, calificacion, precioNoche, capacidadMaxima,
  numeroHabitaciones, horarioCheckIn, horarioCheckOut, reglamento, politicasCancelacion,
  admiteMascotas, seguroDisponible, actividades, imagenes, videos, servicioImagenes,
  redesSociales, coordenadas, estado
) VALUES

-- 1) Hostal principal
(
  '11111111-1111-4111-8111-111111111111',
  'tropical-biohostel',
  'Tropical Biohostel',
  'hostal',
  'Hostal en plena naturaleza en Nocaima, Cundinamarca. Un refugio tranquilo a 10 minutos del casco urbano, rodeado de bosque nativo, frutales, café y aromas de la finca. Ofrece habitaciones cómodas, espacios sociales, desayuno, cocina compartida, zonas de hamacas y ambiente familiar para descansar, trabajar o explorar el territorio. Ideal para viajeros, parejas, familias y amantes de la naturaleza.',
  'Zona rural, a 10 minutos del casco urbano de Nocaima',
  'Vereda, Nocaima, Cundinamarca',
  'Nocaima',
  'Cundinamarca',
  '3209079174',
  'hola@tropicalbiohostel.com',
  '573209079174',
  0, 4.8, 120000.00, 10,
  4, '15:00', '12:00',
  'No fumar en habitaciones. Respetar el descanso de otros huéspedes. Mascotas permitidas en zonas comunes y cabañas (no en Cosmic Bungalow).',
  'Cancelación gratuita hasta 48 horas antes del check-in.',
  1, 0,
  JSON_ARRAY('senderismo','avistamiento de aves','yoga','cafe','cacao','gastronomia','bienestar','lectura','descanso'),
  JSON_ARRAY(
    JSON_OBJECT('url','/fotos/BioHostel5.jpg','esPrincipal',true,'orden',0),
    JSON_OBJECT('url','/fotos/BioHostel6.jpg','esPrincipal',false,'orden',1),
    JSON_OBJECT('url','/fotos/sitio/tropical-gente.jpg','esPrincipal',false,'orden',2),
    JSON_OBJECT('url','/fotos/sitio/tropical-cafe.jpg','esPrincipal',false,'orden',3)
  ),
  JSON_ARRAY(), JSON_ARRAY(), JSON_OBJECT(), JSON_OBJECT('lat',5.073441,'lng',-74.368928),
  'PUBLICADO'
),

-- 2) Cosmic Bungalow
(
  '22222222-2222-4222-8222-222222222222',
  'cosmic-bungalow',
  'Cosmic Bungalow',
  'glamping',
  'Refugio íntimo de arquitectura sagrada hexagonal, construido artesanalmente con materiales naturales de la finca. Cama confortable, luz cálida, vista al trópico, baño con ducha rodeado de vegetación y pileta natural al aire libre. Un espacio romántico y tranquilo para contemplar estrellas, leer, meditar y reconectar con la naturaleza. Ideal para parejas. Tras tu reserva podrás programar Yoga, Chi Kung o Tai Chi según disponibilidad.',
  'Finca Tropical Biohostel, zona rural a 10 minutos de Nocaima',
  'Vereda, Nocaima, Cundinamarca',
  'Nocaima',
  'Cundinamarca',
  '3209079174',
  'reservas@tropicalbiohostel.com',
  '573209079174',
  0, 5.0, 360000.00, 2,
  1, '15:00', '12:00',
  'No se permiten mascotas en Cosmic Bungalow. No fumar dentro del bungalow. Respetar la naturaleza y el silencio nocturno.',
  'Cancelación gratuita hasta 48 horas antes del check-in.',
  0, 0,
  JSON_ARRAY('descanso','contemplacion','yoga','meditación','bienestar','lectura','pintura','avistamiento de aves','estrellas','naturaleza'),
  JSON_ARRAY(
    JSON_OBJECT('url','/fotos/BioHostel10.jpg','esPrincipal',true,'orden',0),
    JSON_OBJECT('url','/fotos/BioHostel2.jpg','esPrincipal',false,'orden',1),
    JSON_OBJECT('url','/fotos/BioHostel9.jpg','esPrincipal',false,'orden',2),
    JSON_OBJECT('url','/fotos/BioHostel1.jpg','esPrincipal',false,'orden',3)
  ),
  JSON_ARRAY(), JSON_ARRAY(), JSON_OBJECT(), JSON_OBJECT('lat',5.073441,'lng',-74.368928),
  'PUBLICADO'
),

-- 3) Cabaña de la Luna
(
  '33333333-3333-4333-8333-333333333333',
  'cabana-de-la-luna',
  'Cabaña de la Luna',
  'glamping',
  'Espacio cálido y acogedor de 5x5 m, completamente equipado para el máximo confort. Dispone de baño amplio y vestier cómodo. Ideal para desconectarte con todas las comodidades en medio de la naturaleza. Capacidad conjunta entre cabañas de hasta 7 personas. Desayuno incluido. Un refugio tranquilo con vista al bosque y ambiente familiar.',
  'Finca Tropical Biohostel, Nocaima',
  'Vereda, Nocaima, Cundinamarca',
  'Nocaima',
  'Cundinamarca',
  '3209079174',
  'reservas@tropicalbiohostel.com',
  '573209079174',
  0, 4.9, 360000.00, 4,
  1, '15:00', '12:00',
  'Respetar el descanso y la naturaleza. Mascotas permitidas bajo responsabilidad del huésped.',
  'Cancelación gratuita hasta 48 horas antes del check-in.',
  1, 0,
  JSON_ARRAY('descanso','naturaleza','lectura','bienestar','avistamiento de aves','desayuno'),
  JSON_ARRAY(
    JSON_OBJECT('url','/fotos/BioHostel5.jpg','esPrincipal',true,'orden',0),
    JSON_OBJECT('url','/fotos/sitio/tropical-flores2.jpg','esPrincipal',false,'orden',1),
    JSON_OBJECT('url','/fotos/sitio/tropical-gente4.jpg','esPrincipal',false,'orden',2)
  ),
  JSON_ARRAY(), JSON_ARRAY(), JSON_OBJECT(), JSON_OBJECT('lat',5.073441,'lng',-74.368928),
  'PUBLICADO'
),

-- 4) Glamping Bosque
(
  '44444444-4444-4444-8444-444444444444',
  'glamping-bosque',
  'Glamping Bosque',
  'glamping',
  'La combinación perfecta entre aventura y confort. Duerme inmerso en los sonidos del bosque sin renunciar a una estadía placentera. Diseñado para grupos o familias de hasta 4 personas. Desayuno incluido. Ideal para quienes buscan naturaleza, tranquilidad y una experiencia diferente cerca de Nocaima.',
  'Finca Tropical Biohostel, Nocaima',
  'Vereda, Nocaima, Cundinamarca',
  'Nocaima',
  'Cundinamarca',
  '3209079174',
  'reservas@tropicalbiohostel.com',
  '573209079174',
  0, 4.7, 120000.00, 4,
  1, '15:00', '12:00',
  'Respeta la naturaleza. No dejar basura. Fuego solo en zonas autorizadas.',
  'Cancelación gratuita hasta 48 horas antes del check-in.',
  1, 0,
  JSON_ARRAY('naturaleza','aventura','descanso','avistamiento de aves','senderismo','desayuno'),
  JSON_ARRAY(
    JSON_OBJECT('url','/fotos/sitio/tropical-flores2.jpg','esPrincipal',true,'orden',0),
    JSON_OBJECT('url','/fotos/sitio/tropical-gente4.jpg','esPrincipal',false,'orden',1),
    JSON_OBJECT('url','/fotos/BioHostel6.jpg','esPrincipal',false,'orden',2)
  ),
  JSON_ARRAY(), JSON_ARRAY(), JSON_OBJECT(), JSON_OBJECT('lat',5.073441,'lng',-74.368928),
  'PUBLICADO'
),

-- 5) Ruta del Bosque a tu Taza
(
  '55555555-5555-4555-8555-555555555555',
  'ruta-del-bosque-a-tu-taza',
  'Del bosque a tu taza',
  'actividad',
  'Experiencia inmersiva de café: caminata por el cafetal, cosecha, despulpado, secado, tostión y degustación. Conoce el proceso del grano a la taza en la finca Tropical Biohostel. Incluye recorrido guiado, explicación del proceso artesanal y bebida de café. Ideal para amantes del café, familias y grupos.',
  'Finca Tropical Biohostel, Nocaima',
  'Vereda, Nocaima, Cundinamarca',
  'Nocaima',
  'Cundinamarca',
  '3209079174',
  'reservas@tropicalbiohostel.com',
  '573209079174',
  0, 5.0, 150000.00, 10,
  0, '08:00', '13:00',
  'Llevar ropa cómoda y protector solar. Actividad sujeta a clima.',
  'Cancelación gratuita hasta 24 horas antes.',
  1, 1,
  JSON_ARRAY('cafe','caminata','tostion','gastronomia','degustacion','naturaleza','cultura cafetera'),
  JSON_ARRAY(
    JSON_OBJECT('url','/fotos/sitio/tropical-cafe.jpg','esPrincipal',true,'orden',0),
    JSON_OBJECT('url','/fotos/sitio/tropical-cafe2.jpg','esPrincipal',false,'orden',1),
    JSON_OBJECT('url','/fotos/sitio/tropical-cafe5.jpg','esPrincipal',false,'orden',2)
  ),
  JSON_ARRAY(), JSON_ARRAY(), JSON_OBJECT(), JSON_OBJECT('lat',5.073441,'lng',-74.368928),
  'PUBLICADO'
),

-- 6) Respira el Bosque
(
  '66666666-6666-4666-8666-666666666666',
  'ruta-respira-el-bosque',
  'Respira el bosque',
  'actividad',
  'Experiencia de bienestar en la naturaleza: caminata suave por el bosque, respiración consciente, yoga o estiramiento suave y momento de contemplación. Incluye conexión con el entorno, sonidos del bosque y pausa para café o infusión. Ideal para quienes buscan descanso, bienestar y naturaleza.',
  'Finca Tropical Biohostel, Nocaima',
  'Vereda, Nocaima, Cundinamarca',
  'Nocaima',
  'Cundinamarca',
  '3209079174',
  'reservas@tropicalbiohostel.com',
  '573209079174',
  0, 4.9, 200000.00, 10,
  0, '07:30', '12:00',
  'Llevar ropa cómoda. Actividad suave apta para la mayoría de personas.',
  'Cancelación gratuita hasta 24 horas antes.',
  1, 1,
  JSON_ARRAY('yoga','bienestar','meditación','cafe','caminata','bosque','naturaleza','descanso'),
  JSON_ARRAY(
    JSON_OBJECT('url','/fotos/sitio/tropical-flores2.jpg','esPrincipal',true,'orden',0),
    JSON_OBJECT('url','/fotos/sitio/tropical-gente4.jpg','esPrincipal',false,'orden',1),
    JSON_OBJECT('url','/fotos/sitio/tropical-voluntariado.jpg','esPrincipal',false,'orden',2)
  ),
  JSON_ARRAY(), JSON_ARRAY(), JSON_OBJECT(), JSON_OBJECT('lat',5.073441,'lng',-74.368928),
  'PUBLICADO'
),

-- 7) Café y Raíces Colombianas
(
  '77777777-7777-4777-8777-777777777777',
  'ruta-cafe-y-raices-colombianas',
  'Café y raíces colombianas',
  'actividad',
  'Experiencia cultural y gastronómica alrededor del café colombiano. Recorrido por la finca, historia del café, preparación tradicional, degustación y encuentro con sabores locales. Una actividad para compartir en familia o con amigos, conectando con la cultura cafetera y el territorio.',
  'Finca Tropical Biohostel, Nocaima',
  'Vereda, Nocaima, Cundinamarca',
  'Nocaima',
  'Cundinamarca',
  '3209079174',
  'reservas@tropicalbiohostel.com',
  '573209079174',
  0, 4.9, 200000.00, 10,
  0, '09:00', '14:00',
  'Actividad apta para familias. Avisar alergias alimentarias.',
  'Cancelación gratuita hasta 24 horas antes.',
  1, 1,
  JSON_ARRAY('cafe','gastronomia','cultura','caminata','degustacion','familia','cultura cafetera'),
  JSON_ARRAY(
    JSON_OBJECT('url','/fotos/sitio/tropical-cocina.jpg','esPrincipal',true,'orden',0),
    JSON_OBJECT('url','/fotos/sitio/tropical-gente3.jpg','esPrincipal',false,'orden',1),
    JSON_OBJECT('url','/fotos/sitio/tropical-postre2.jpg','esPrincipal',false,'orden',2)
  ),
  JSON_ARRAY(), JSON_ARRAY(), JSON_OBJECT(), JSON_OBJECT('lat',5.073441,'lng',-74.368928),
  'PUBLICADO'
),

-- 8) Tour del Café y Cacao
(
  '88888888-8888-4888-8888-888888888888',
  'tour-cafe-cacao-tropical',
  'Tour del Café y el Cacao',
  'actividad',
  'Recorrido guiado por los cultivos de la finca: café, cacao, frutales y huerta de aromáticas. Conoce el proceso del grano a la taza, prueba frutos de temporada y cierra con degustación. Ideal para toda la familia, grupos y amantes de la naturaleza y la gastronomía rural.',
  'Finca Tropical Biohostel, Nocaima',
  'Vereda, Nocaima, Cundinamarca',
  'Nocaima',
  'Cundinamarca',
  '3209079174',
  'reservas@tropicalbiohostel.com',
  '573209079174',
  0, 4.8, 45000.00, 10,
  0, '09:00', '12:00',
  'Llevar calzado cómodo. Actividad al aire libre.',
  'Cancelación gratuita hasta 24 horas antes.',
  1, 1,
  JSON_ARRAY('cafe','cacao','caminata','gastronomia','naturaleza','familiar','degustacion'),
  JSON_ARRAY(
    JSON_OBJECT('url','/fotos/sitio/tropical-cafe.jpg','esPrincipal',true,'orden',0),
    JSON_OBJECT('url','/fotos/sitio/tropical-gente.jpg','esPrincipal',false,'orden',1),
    JSON_OBJECT('url','/fotos/sitio/tropical-cafe5.jpg','esPrincipal',false,'orden',2)
  ),
  JSON_ARRAY(), JSON_ARRAY(), JSON_OBJECT(), JSON_OBJECT('lat',5.073441,'lng',-74.368928),
  'PUBLICADO'
)

ON DUPLICATE KEY UPDATE
  nombre=VALUES(nombre),
  tipo=VALUES(tipo),
  descripcion=VALUES(descripcion),
  ubicacion=VALUES(ubicacion),
  direccion=VALUES(direccion),
  ciudad=VALUES(ciudad),
  departamento=VALUES(departamento),
  telefono=VALUES(telefono),
  email=VALUES(email),
  whatsapp=VALUES(whatsapp),
  estrellas=VALUES(estrellas),
  calificacion=VALUES(calificacion),
  precioNoche=VALUES(precioNoche),
  capacidadMaxima=VALUES(capacidadMaxima),
  numeroHabitaciones=VALUES(numeroHabitaciones),
  horarioCheckIn=VALUES(horarioCheckIn),
  horarioCheckOut=VALUES(horarioCheckOut),
  reglamento=VALUES(reglamento),
  politicasCancelacion=VALUES(politicasCancelacion),
  admiteMascotas=VALUES(admiteMascotas),
  seguroDisponible=VALUES(seguroDisponible),
  actividades=VALUES(actividades),
  imagenes=VALUES(imagenes),
  coordenadas=VALUES(coordenadas),
  estado=VALUES(estado),
  updated_at=CURRENT_TIMESTAMP;
