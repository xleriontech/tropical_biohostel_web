<?php
/**
 * Configuración del backend de siembra (cPanel tropicalbiohostel.com).
 * Ajustar DB_PASS si cambia la contraseña en cPanel.
 */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

date_default_timezone_set('America/Bogota');

const DB_HOST = 'localhost';
const DB_NAME = 'tropica5_tropical_db';
const DB_USER = 'tropica5_tropical_user';
const DB_PASS = 'Tropical2026!';

/** Clave para firmar los tokens del panel de la finca. Cambiar en producción. */
const SIEMBRA_SECRET = 'cambia_esta_clave_secreta_siembra_2026';

/** Vigencia del token del panel, en horas. */
const SIEMBRA_TOKEN_HORAS = 12;
