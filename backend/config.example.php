<?php
// Copia este archivo como config.php y ajusta los valores.
// NUNCA subas config.php con credenciales reales a un repo público.

return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'tropical_db',
        'user' => 'tropical_user',
        'pass' => 'CAMBIAR',
        'charset' => 'utf8mb4',
    ],
    'cors_origin' => 'https://tropicalbiohostel.com',
    'app_env' => 'production',
    'paypal' => [
        'client_id' => '',
        'client_secret' => '',
        'mode' => 'sandbox', // sandbox | live
        'currency' => 'USD',
    ],
    'jwt_secret' => 'CAMBIAR_POR_UN_SECRETO_LARGO',
    // Auth admin básico para panel (cambiar en producción)
    'admin_email' => 'admin@tropicalbiohostel.com',
    'admin_password' => 'CAMBIAR_PASSWORD_ADMIN',
    'admin_token' => 'CAMBIAR_TOKEN_ADMIN_LARGO',
    'admin_name' => 'Administrador',
];
