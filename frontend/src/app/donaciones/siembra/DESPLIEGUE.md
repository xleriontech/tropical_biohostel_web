# Backend de siembra (cPanel)

Los PHP de esta carpeta son la copia versionada de lo que corre en el hosting.
No los sirve Next.js: se suben por FTP a `public_html/siembra/`.

## Archivos que deben estar en `public_html/siembra/`

| Archivo | Para qué |
|---|---|
| `_config.php` | Credenciales de la base y `SIEMBRA_SECRET` (firma de tokens del panel). |
| `.htaccess` | CORS con `Authorization` + bloqueo de todo lo que empiece con `_`. Copiar desde `.htaccess.example`. |
| `tablero.php` | Tablero público: casillas, árboles, cuidados. |
| `arbol.php` | Ficha pública de un árbol por `codigo`. |
| `reserva.php` | Aparta y siembra un árbol. `PASARELA_ACTIVA = false` → confirma de inmediato. |
| `cuidado.php` | Aplica riego/abono/sustrato/jornal. |
| `admin_api.php` | API del panel de la finca (`/finca`). |

`_config.php` y `.htaccess` no deben quedar accesibles por HTTP: el `.htaccess`
devuelve 403 para lo que empiece con `_`.

## Cuenta del panel

Se guarda en `site_config`, clave `adminSiembra`:

```json
{ "usuario": "finca", "hash": "<bcrypt>" }
```

El token que emite `accion=login` es HMAC-SHA256 sobre el payload, firmado con
`SIEMBRA_SECRET`, y dura `SIEMBRA_TOKEN_HORAS` (12 h). La clave se cambia desde
la pestaña **Ajustes** del panel, sin tocar la base a mano.

## Variables del frontend

```
NEXT_PUBLIC_SIEMBRA_API_URL=https://xlerion.com.co/siembra
```

Es independiente de `NEXT_PUBLIC_API_URL` (el NestJS del resto del sitio).
En Cloudflare Pages hay que fijarla en Settings → Environment variables.

## Cuando se integre PayPal

1. Crear `capturar.php`.
2. `reserva.php`: `const PASARELA_ACTIVA = true;`
3. `tablero.php`: `'pagoSimulado' => false`.

Ahí la reserva queda pendiente hasta capturar el pago y el panel de la finca
usa "Marcar sembrado" para cerrar el ciclo.
