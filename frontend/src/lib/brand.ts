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
export const VERSION = 2;

/** Icono principal (mandala de marca) con la versión de caché. */
export const ICONO = `/icons/icon-192.png?v=${VERSION}`;

/** Mandala de marca en formato vectorial, para el favicon. */
export const MANDALA = "/favicon.svg";
