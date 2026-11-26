<?php
declare(strict_types=1);
// TEMPORAL: mostrar errores en pantalla para diagnóstico (quitar en producción)
ini_set('display_errors', '1');
error_reporting(E_ALL);

$root = dirname(__DIR__);
$configPath = $root . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['message' => 'Falta config.php. Copia config.example.php y configúralo.']);
    exit;
}
$config = require $configPath;

require_once $root . '/src/Response.php';
require_once $root . '/src/Database.php';
require_once $root . '/src/Router.php';
require_once $root . '/src/Handlers.php';

// CORS
$origin = $config['cors_origin'] ?? '*';
header('Access-Control-Allow-Origin: ' . $origin);
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
// Permitir que el API se sirva en / o /api
$path = preg_replace('#^/api(?=/|$)#', '', $uri);
$path = '/' . trim($path, '/');
if ($path !== '/') $path = rtrim($path, '/');

$router = new Router();
$h = new Handlers($config);

// Health
$router->add('GET', '/', fn() => Response::json(['ok' => true, 'service' => 'tropical-api-php']));
$router->add('GET', '/health', fn() => Response::json(['ok' => true]));

// Config
$router->add('GET', '/config/parallax', [$h, 'getParallax']);
$router->add('GET', '/config/ads-display', [$h, 'getAdsDisplay']);
$router->add('GET', '/config/site-branding', [$h, 'getSiteBranding']);
$router->add('GET', '/config/payment-methods', [$h, 'getPublicPaymentMethods']);

// Public content
$router->add('GET', '/properties', [$h, 'getProperties']);
$router->add('GET', '/properties/{slug}/availability', [$h, 'getPropertyAvailability']);
$router->add('GET', '/properties/{slug}/reviews', [$h, 'getPropertyReviews']);
$router->add('GET', '/properties/{slug}', [$h, 'getPropertyBySlug']);
$router->add('GET', '/ads', [$h, 'getAdsByPlacement']);
$router->add('POST', '/search', [$h, 'search']);
$router->add('GET', '/busqueda/opciones', [$h, 'getBusquedaOpciones']);
$router->add('POST', '/busqueda/ancestral', [$h, 'busquedaAncestral']);
$router->add('GET', '/reviews/top-rated', [$h, 'getTopRatedReviews']);

// Donaciones
$router->add('GET', '/donaciones/proyectos', [$h, 'getDonacionProyectos']);
$router->add('GET', '/donaciones/proyectos/{slug}', [$h, 'getDonacionProyectoBySlug']);
$router->add('GET', '/donaciones/paypal-public', [$h, 'getPaypalPublic']);
$router->add('POST', '/donaciones/orden', [$h, 'createDonacionOrden']);
$router->add('POST', '/donaciones/capturar', [$h, 'capturarDonacion']);

// Reservas
$router->add('POST', '/reservas', [$h, 'createReserva']);
$router->add('GET', '/reservas', [$h, 'getReservas']);
$router->add('GET', '/reservas/{id}', [$h, 'getReservaById']);
$router->add('PATCH', '/reservas/{id}/cancelar', [$h, 'cancelarReserva']);
$router->add('PATCH', '/reservas/{id}/no-show', [$h, 'noShowReserva']);

// Chat (stub PHP - Nati en modo básico mientras el backend NestJS/IA no está desplegado)
$router->add('GET', '/chat/saludo', [$h, 'chatSaludo']);
$router->add('POST', '/chat/mensaje', [$h, 'chatMensaje']);

// Admin / Notificaciones (stubs mínimos para panel PHP)
$router->add('GET', '/notificaciones/count', [$h, 'getNotificacionesCount']);
$router->add('GET', '/notificaciones', [$h, 'getNotificaciones']);
$router->add('GET', '/admin/dashboard', [$h, 'getAdminDashboard']);
$router->add('GET', '/admin/properties', [$h, 'getAdminProperties']);
$router->add('GET', '/admin/leads/stats', [$h, 'getLeadsStats']);
$router->add('GET', '/admin/leads', [$h, 'getLeads']);
$router->add('GET', '/admin/leads/{id}', [$h, 'getLeadById']);
$router->add('DELETE', '/admin/leads/{id}', [$h, 'deleteLead']);
$router->add('GET', '/admin/menus', [$h, 'getMenus']);
$router->add('POST', '/admin/menus', [$h, 'stubOk']);
$router->add('PUT', '/admin/menus/{id}', [$h, 'stubOk']);
$router->add('DELETE', '/admin/menus/{id}', [$h, 'stubOk']);
$router->add('GET', '/admin/chat-ai-config', [$h, 'getChatAiConfigAdmin']);
$router->add('PUT', '/admin/chat-ai-config', [$h, 'saveChatAiConfigAdmin']);
$router->add('GET', '/admin/chat-ai-models', [$h, 'getChatAiModelsAdmin']);
$router->add('POST', '/admin/chat-ai-models', [$h, 'getChatAiModelsAdmin']);
$router->add('POST', '/admin/chat-ai-test', [$h, 'testChatAiConfigAdmin']);
$router->add('GET', '/admin/payment-config', [$h, 'getPaymentConfigAdmin']);
$router->add('PUT', '/admin/payment-config', [$h, 'savePaymentConfigAdmin']);
$router->add('POST', '/admin/payment-test', [$h, 'testPaymentConfigAdmin']);
// Ingesta / scraping (PHP)
$router->add('POST', '/admin/ingestion/preview', [$h, 'ingestionPreview']);
$router->add('POST', '/admin/ingestion/scrape', [$h, 'ingestionScrape']);
$router->add('POST', '/admin/ingestion/execute', [$h, 'ingestionExecute']);
$router->add('GET', '/admin/ingestion/estado', [$h, 'ingestionEstado']);
$router->add('GET', '/admin/ingestion/actualizaciones', [$h, 'ingestionActualizaciones']);
$router->add('POST', '/admin/ingestion/verificar', [$h, 'ingestionVerificar']);
$router->add('POST', '/admin/ingestion/actualizaciones/{id}/resolver', [$h, 'ingestionResolver']);
$router->add('POST', '/admin/ingestion/google', [$h, 'ingestionGoogle']);
$router->add('POST', '/admin/ingestion/enriquecer', [$h, 'ingestionEnriquecer']);
$router->add('GET', '/admin/claves/estado', [$h, 'getClavesEstado']);
$router->add('GET', '/admin/claves', [$h, 'getClaves']);
$router->add('PUT', '/admin/claves/{clave}', [$h, 'saveClave']);
$router->add('DELETE', '/admin/claves/{clave}', [$h, 'deleteClave']);
$router->add('POST', '/admin/claves/{clave}/probar', [$h, 'probarClave']);

// Auth básico (admin por token configurado)
$router->add('GET', '/auth/me', [$h, 'authMe']);
$router->add('POST', '/auth/signin', [$h, 'authSignin']);
$router->add('POST', '/auth/signup', fn() => Response::error('Registro no disponible en este backend', 501));

$router->dispatch($method, $path);
