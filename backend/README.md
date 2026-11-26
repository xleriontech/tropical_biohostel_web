# Backend PHP (cPanel / Apache / MariaDB)

Backend PHP compatible con hosting compartido cPanel (Apache + PHP 8.x + MariaDB). Reemplaza gradualmente al backend NestJS para que el sitio funcione en el servidor actual.

## Estado

- `backend-nestjs/`: backend original NestJS + Prisma + PostgreSQL (aislado para uso futuro / escalamiento).
- `backend/`: backend PHP actual para cPanel.

## Endpoints implementados (MVP público)

- `GET /api/health`
- `GET /api/config/parallax`
- `GET /api/config/ads-display`
- `GET /api/config/site-branding`
- `GET /api/properties?tipo=&page=&limit=`
- `GET /api/properties/{slug}`
- `GET /api/ads?placement=`
- `POST /api/search`
- `GET /api/reviews/top-rated?limit=`
- `GET /api/donaciones/proyectos`
- `GET /api/donaciones/proyectos/{slug}`
- `GET /api/donaciones/paypal-public`
- `POST /api/donaciones/orden`
- `POST /api/donaciones/capturar`

Los endpoints de admin/auth/reservas/chat/IA aún no están portados; devuelven 401/501 según el caso.

## Despliegue en cPanel

1. Crea una base de datos MariaDB y usuario en cPanel.
2. Importa `sql/schema-mariadb.sql` en phpMyAdmin.
3. Copia `config.example.php` a `config.php` y ajusta credenciales DB, `cors_origin`, PayPal y `jwt_secret`.
4. Sube el contenido de `backend/` a una carpeta fuera de `public_html` si es posible, o configura el subdominio `api.tropicalbiohostel.com` para que apunte al directorio `backend/public/`.
5. Asegura que `mod_rewrite` esté activo y que `backend/public/.htaccess` se aplique.
6. Verifica: `https://api.tropicalbiohostel.com/api/health`.

## Seguridad

- No subas `config.php` al repositorio.
- Usa HTTPS en frontend y API.
- Restringe `cors_origin` al dominio real.
- PayPal: usa credenciales sandbox para pruebas y live en producción.

## Siguiente fase (portar desde backend-nestjs)

- Auth/JWT y roles admin
- Reservas y disponibilidad
- Admin CRUD de propiedades/anuncios/donaciones
- Upload de imágenes
- Chat/IA/RAG (puede requerir servicio externo por límites de hosting compartido)
