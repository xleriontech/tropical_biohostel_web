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
    // Chat IA (opción 1): proveedor compatible con OpenAI Chat Completions.
    // Ejemplos base_url: https://api.openai.com/v1  |  https://api.groq.com/openai/v1  |  https://openrouter.ai/api/v1
    'chat_ai' => [
        'enabled' => false,
        'provider' => 'openai-compatible',
        'base_url' => 'https://api.openai.com/v1',
        'api_key' => '',
        'model' => 'gpt-4o-mini',
        'system_prompt' => 'Eres Nati, anfitriona virtual de Tropical Biohostel en Nocaima, Cundinamarca. Responde en español, cálida y clara. Ayuda con hospedaje, experiencias, reservas, donaciones y contacto. Si no sabes un dato exacto, dilo con honestidad y sugiere WhatsApp +57 320 907 9174 o reservas@tropicalbiohostel.com. No inventes precios ni disponibilidad.',
    ],
];
