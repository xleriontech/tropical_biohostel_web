/**
 * Identidad visual de Tropical Biohostel.
 *
 * Los iconos se sirven con `Cache-Control: immutable` (1 año) para no gastar
 * datos, así que cuando cambia la marca hay que cambiar la URL: si no, el
 * navegador y el service worker seguirían sirviendo la imagen anterior.
 *
 * **Al actualizar la marca: sube `VERSION` aquí y en los archivos estáticos**
 * (`public/manifest.webmanifest`, `public/offline.html`, `public/sw.js`).
 */
export const VERSION = 4;

/** Icono principal (emblema de marca) con la versión de caché. */
export const ICONO = `/icons/icon-192.png?v=${VERSION}`;

/** Emblema de marca en formato vectorial, para el favicon. */
export const MANDALA = `/favicon.svg?v=${VERSION}`;

/** Logotipo horizontal con versión de caché (lo usan header y loader). */
export const LOGO = `/tropical-logo.svg?v=${VERSION}`;

/**
 * Logotipo horizontal en versión clara: el texto va en crema `#F5EFE0`
 * en lugar de bosque `#1F3D2B`, para fondos oscuros (barra de navegación
 * de la mayoría de los temas, modo oscuro). El resto de la paleta
 * (verde `#8FB573`, sol `#E8A94A`) es igual en ambas versiones.
 */
export const LOGO_CLARO = `/tropical-logo-claro.svg?v=${VERSION}`;
