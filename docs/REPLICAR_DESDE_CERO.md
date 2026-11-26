# Replicar Tropical Biohostel desde cero en otro servidor

Guía para levantar el sitio completo (frontend + backend PHP + base de datos + siembra) en un servidor nuevo.

## 1) Arquitectura

- **Frontend**: Next.js (App Router) exportado como sitio estático (`output: "export"`). Se sirve desde `public_html/`.
- **Backend API**: PHP 8.x simple (sin Composer) en un subdominio, ej. `api.tudominio.com`.
- **Base de datos**: MariaDB/MySQL.
- **Siembra 3D**: scripts PHP + tablas propias en la misma BD, servidos desde `public_html/siembra/`.
- **Hosting objetivo**: cPanel/Apache (también funciona en cualquier Apache/Nginx+PHP con ajustes).

> No se usa Node.js en producción. Node solo se usa localmente para compilar el frontend.

## 2) Requisitos

### Local (para compilar)
- Node.js 20+ y npm.
- Git.

### Servidor
- cPanel con Apache + PHP 8.1+ (recomendado 8.2).
- Extensiones PHP: `pdo_mysql`, `curl`, `mbstring`, `json`, `openssl`.
- MariaDB/MySQL.
- Dos dominios/subdominios con SSL:
  - `tudominio.com` → frontend (`public_html/`)
  - `api.tudominio.com` → backend PHP (`.../tropical-api/public`)

## 3) Obtener el código

```bash
git clone https://github.com/xleriontech/tropical_biohostel_web.git
cd tropical_biohostel_web
```

Estructura relevante:
- `frontend/` — Next.js
- `backend/` — API PHP para cPanel
- `backend/sql/` — esquemas y seeds
- `frontend/public/siembra/` — PHP de siembra (se publica con el frontend)
- `docs/` — documentación

## 4) Base de datos

En cPanel → MySQL Databases / phpMyAdmin:

1. Crear base de datos, ej. `USUARIO_tropical_db`.
2. Crear usuario, ej. `USUARIO_tropical_user`, contraseña segura.
3. Dar **ALL PRIVILEGES** al usuario sobre la BD.
4. Importar en orden:
   - `backend/sql/schema-mariadb.sql` — tablas principales (site_config, properties, reviews, advertisements, donacion_proyectos, donaciones, reservas, etc.).
   - `backend/sql/seed-tropical.sql` — datos iniciales de propiedades/experiencias de Tropical (opcional pero recomendado para que Zemisqua tenga opciones).
   - `frontend/src/app/donaciones/siembra/script_solo_tablas.sql` (o el SQL de siembra vigente) — tablas de siembra. Revisar `frontend/src/app/donaciones/siembra/DESPLIEGUE.md`.

> Verifica que existan tablas: `properties`, `reservas`, `site_config`, `donacion_proyectos`, `donaciones`, `reviews`, `advertisements`, y las de siembra (`parcela`, `apadrinamiento`, `donacion`, `item_cuidado`, `cuidado_aplicado`, etc.).

## 5) Backend PHP (API)

### 5.1 Subir archivos
Sube la carpeta `backend/` al servidor, **fuera de public_html** si es posible. Ejemplo:
- `/home/USUARIO/tropical-api/`

Debe contener: `public/`, `src/`, `sql/`, `config.example.php`.

### 5.2 Configurar
Copia `config.example.php` como `config.php` en la raíz de `tropical-api/` y edita:

```php
<?php
return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'USUARIO_tropical_db',
        'user' => 'USUARIO_tropical_user',
        'pass' => 'CONTRASEÑA_BD',
        'charset' => 'utf8mb4',
    ],
    'cors_origin' => 'https://tudominio.com',
    'app_env' => 'production',
    'paypal' => [
        'client_id' => '',
        'client_secret' => '',
        'mode' => 'sandbox', // live en producción real
        'currency' => 'USD',
    ],
    'jwt_secret' => 'GENERAR_ALEATORIO_LARGO',
    'admin_email' => 'admin@tudominio.com',
    'admin_password' => 'PASSWORD_ADMIN_SEGURA',
    'admin_token' => 'GENERAR_ALEATORIO_LARGO',
    'admin_name' => 'Administrador',
    'chat_ai' => [
        'enabled' => false,
        'provider' => 'openai-compatible',
        'base_url' => 'https://api.openai.com/v1',
        'api_key' => '',
        'model' => 'gpt-4o-mini',
        'system_prompt' => 'Eres Nati, anfitriona virtual de Tropical Biohostel en Nocaima, Cundinamarca. Responde en español, cálida y clara...',
    ],
];
```

Generar secretos aleatorios (local):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5.3 Subdominio API
En cPanel → Domains/Subdomains:
- Crear `api.tudominio.com`.
- Document Root: `/home/USUARIO/tropical-api/public` (la carpeta `public/` del backend).

### 5.4 Verificar
- `https://api.tudominio.com/api/health` debe responder `{"ok":true,...}`.
- Si hay 500, poner temporalmente `'app_env' => 'development'` en `config.php`, revisar error, y volver a `production`.

## 6) Frontend (compilar y publicar)

### 6.1 Variables de entorno
Crea `frontend/.env.production` (o verifica que exista):

```env
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api
NEXT_PUBLIC_SIEMBRA_API_URL=https://tudominio.com/siembra
```

> `NEXT_PUBLIC_*` se incrustan en el build. Si cambias dominio, debes recompilar.

### 6.2 Compilar
En Windows PowerShell:

```powershell
cd frontend
npm install
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
if (Test-Path out) { Remove-Item -Recurse -Force out }
$env:NEXT_PUBLIC_API_URL="https://api.tudominio.com/api"
$env:NEXT_PUBLIC_SIEMBRA_API_URL="https://tudominio.com/siembra"
npm run build
```

Salida: `frontend/out/`.

### 6.3 Publicar
En `public_html/` del dominio principal:
1. Conservar `.well-known/` si existe (SSL).
2. Borrar contenido viejo (especialmente `_next/`, `sw.js`, rutas HTML antiguas).
3. Subir **todo** el contenido de `frontend/out/` a `public_html/`.
4. Verificar que `public_html/.htaccess` existe (viene en `out/` desde `frontend/public/.htaccess`).

### 6.4 Caché / Service Worker
Después de cada despliegue, probar en incógnito o limpiar Service Worker (DevTools → Application → Service Workers → Unregister + Clear site data). Un SW viejo puede servir JS/HTML antiguo y causar errores tipo `Unexpected token '<'`.

## 7) Siembra 3D

La siembra vive en `public_html/siembra/` (PHP) y usa tablas en la misma BD.

1. Asegura que `frontend/out/siembra/` se subió (contiene `tablero.php`, `arbol.php`, `reserva.php`, `cuidado.php`, `admin_api.php`, `_config.php`, `.htaccess`).
2. Edita `public_html/siembra/_config.php` en el servidor:
   ```php
   const DB_HOST = 'localhost';
   const DB_NAME = 'USUARIO_tropical_db';
   const DB_USER = 'USUARIO_tropical_user';
   const DB_PASS = 'CONTRASEÑA_BD';
   const SIEMBRA_SECRET = 'SECRETO_LARGO_ALEATORIO';
   ```
3. Verifica: `https://tudominio.com/siembra/tablero.php` debe responder JSON (no HTML, no error de BD).
4. Si responde error de tablas, importa el SQL de siembra.

## 8) Configuración post-despliegue

### Admin
- Login: `https://tudominio.com/auth/login/`
- Credenciales: las de `config.php` (`admin_email`, `admin_password`).
- El panel admin usa `admin_token` de `config.php` para auth Bearer.

### Chat IA (Nati)
- Opción simple: Admin → **Proveedores IA** (`/admin/ai-providers/`).
- Elegir proveedor, pegar API key, cargar modelos, seleccionar modelo, habilitar, guardar.
- Probar con botón **Probar IA**.
- Alternativa: configurar `chat_ai` en `config.php` del servidor.

### Métodos de pago
- Admin → **Métodos de pago** (`/admin/pagos/`).
- Habilitar proveedor, modo sandbox/live, pegar keys, probar conexión, guardar.
- Para PayPal: crear app en https://developer.paypal.com/dashboard/applications/
- Para Wompi: https://comercios.wompi.co/
- Para Stripe: https://dashboard.stripe.com/apikeys

### Google Places (Alimentación)
- Habilitar **Places API (New)** en Google Cloud.
- Crear API key en https://console.cloud.google.com/apis/credentials
- Guardar en Admin → Claves API o pegar en Alimentación.

## 9) Checklist de verificación

- [ ] `https://api.tudominio.com/api/health` → OK
- [ ] `https://tudominio.com/` carga con HTTPS
- [ ] Login admin funciona y entra a `/admin/`
- [ ] `https://tudominio.com/siembra/tablero.php` devuelve JSON
- [ ] `/donaciones/siembra/` carga tablero 3D
- [ ] `/busqueda-inteligente/` muestra opciones (requiere propiedades en BD)
- [ ] Chat responde (básico o IA según config)
- [ ] Reservas: crear, ver en admin, cambiar estado, eliminar
- [ ] No hay errores `localhost` en consola del navegador
- [ ] No hay errores `Unexpected token '<'` en chunks JS

## 10) Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Unexpected token '<'` en JS | Chunk JS faltante, servidor devuelve HTML | Subir `out/` completo, limpiar SW/caché |
| Rutas abren home | Falta `.htaccess` o trailing slash | Verificar `.htaccess`, links con `/` final |
| API 500 | Error PHP/BD/config | `app_env=development` temporal, revisar Response |
| `No autorizado` en admin | Token admin incorrecto o sesión vieja | Revisar `config.php`, volver a iniciar sesión |
| CORS | `cors_origin` no coincide | Ajustar `cors_origin` en `config.php` |
| Siembra “No se pudo conectar a la base de datos” | `_config.php` de siembra con credenciales viejas | Editar `public_html/siembra/_config.php` |
| Chat no usa IA | `chat_ai.enabled` false o falta key/modelo | Configurar en `/admin/ai-providers/` y probar |
| Pago no aparece en reserva | Método no habilitado o frontend viejo | Habilitar en `/admin/pagos/`, subir `out/` nuevo |
| Config no se guarda | Problema de `site_config` | Verificar tabla `site_config` y subir Handlers.php actualizado |

## 11) Seguridad

- **Nunca** commitear `backend/config.php` ni `frontend/public/siembra/_config.php` con credenciales reales.
- Cambiar `jwt_secret`, `admin_token`, `SIEMBRA_SECRET` por valores aleatorios largos.
- Usar contraseñas fuertes para admin y BD.
- Mantener `app_env=production` en producción.
- Restringir claves API (Google, pagos) por dominio/IP cuando sea posible.
- Mantener SSL activo en dominio y subdominio API.

## 12) Actualizaciones futuras

1. Hacer cambios en código local.
2. `git pull` / commit / push.
3. Recompilar frontend con las env vars correctas.
4. Subir `frontend/out/` completo a `public_html/`.
5. Subir archivos PHP modificados a `tropical-api/` si hubo cambios de backend.
6. Probar en incógnito.

## 13) Archivos que NO se deben publicar en git

- `backend/config.php`
- `frontend/.env.local`
- `frontend/out/`
- `frontend/.next/`
- `frontend/node_modules/`
- `frontend/public/siembra/_config.php` (si contiene credenciales reales)
- archivos de debug: `backend/public/diag.php`, `t.php`
