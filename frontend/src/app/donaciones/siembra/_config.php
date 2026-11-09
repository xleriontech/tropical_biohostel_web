<?php
/**
 * Configuración compartida del backend de siembra (cPanel).
 * No imprimir nada desde este archivo.
 */

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

date_default_timezone_set('America/Bogota');

const DB_HOST = 'localhost';
const DB_NAME = 'xlerion1_tropical_db';
const DB_USER = 'xlerion1_tropical_user';
const DB_PASS = 'Tropical81720164!';

/** Clave para firmar los tokens del panel de la finca. */
const SIEMBRA_SECRET = '586cac18556b04bc6f3bf933030c737bb4a19b518c732e1df2ebaa18f5345c57';

/** Vigencia del token del panel, en horas. */
const SIEMBRA_TOKEN_HORAS = 12;
