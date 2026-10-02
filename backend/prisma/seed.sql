-- Seed: AI Providers
INSERT INTO "AIProvider" ("id", "name", "apiEndpoint", "websiteUrl", "isActive", "createdAt", "updatedAt") VALUES
('ai_gemini', 'Gemini', 'https://generativelanguage.googleapis.com/v1beta', 'https://aistudio.google.com/app/apikey', true, NOW(), NOW()),
('ai_openai', 'OpenAI', 'https://api.openai.com/v1', 'https://platform.openai.com/api-keys', false, NOW(), NOW()),
('ai_claude', 'Claude', 'https://api.anthropic.com/v1', 'https://console.anthropic.com/settings/keys', false, NOW(), NOW());

-- Seed: Properties
INSERT INTO "Propiedad" ("id", "nombre", "tipo", "descripcion", "ubicacion", "admiteMascotas", "seguroDisponible", "capacidadMaxima", "numeroHabitaciones", "precioNoche", "actividades", "estado", "slug", "createdAt", "updatedAt") VALUES
('prop_1', 'Hotel Sierra Verde', 'hotel', 'Hotel boutique ubicado en el corazon de la sierra, con vistas panoramicas y acceso directo a senderos naturales.', 'Nocaima, Cundinamarca', true, true, 8, 4, 120, ARRAY['senderismo','avistamiento de aves','yoga']::text[], 'PUBLICADO', 'hotel-sierra-verde', NOW(), NOW()),
('prop_2', 'Hostal La Cabana', 'hostal', 'Hostal acogedor ideal para parejas y familias pequenas. Desayuno incluido y areas comunes amplias.', 'Nocaima, Cundinamarca', false, false, 6, 3, 65, ARRAY['ciclismo','pesca']::text[], 'PUBLICADO', 'hostal-la-cabana', NOW(), NOW()),
('prop_3', 'Centro Turistico Aventura Total', 'centro_turistico', 'Centro turistico con todas las actividades de aventura: canopy, rappel, senderismo y mas.', 'Nocaima, Cundinamarca', true, true, 20, 10, 95, ARRAY['canopy','rappel','senderismo','buceo','natacion']::text[], 'PUBLICADO', 'centro-turistico-aventura-total', NOW(), NOW());

-- Seed: Sponsor
INSERT INTO "Sponsor" ("id", "nombre", "sitioWeb", "contacto", "createdAt", "updatedAt") VALUES
('sponsor_1', 'Colombia Tourism Corp', 'https://colombiatourism.co', 'contacto@colombiatourism.co', NOW(), NOW());
