<?php
/**
 * GET /siembra/arbol.php?codigo=TB-XXXX-000
 * Devuelve la ficha completa de un árbol apadrinado.
 *
 * También acepta la ruta amigable: /siembra/arbol.php/TB-XXXX-000
 */
declare(strict_types=1);

date_default_timezone_set('America/Bogota');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const DB_HOST = 'localhost';
const DB_NAME = 'xlerion1_tropical_db';
const DB_USER = 'xlerion1_tropical_user';
const DB_PASS = 'Tropical81720164!';

$__respondido = false;

function responder(array $datos, int $codigoHttp = 200): void
{
    global $__respondido;
    $__respondido = true;
    if (!headers_sent()) {
        http_response_code($codigoHttp);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fallo(string $mensaje, array $extra = []): void
{
    responder(array_merge([
        'success' => false,
        'status'  => 'error',
        'error'   => $mensaje,
        'message' => $mensaje,
    ], $extra));
}

register_shutdown_function(static function (): void {
    global $__respondido;
    if ($__respondido) {
        return;
    }
    $e = error_get_last();
    if ($e === null) {
        return;
    }
    $fatales = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
    if (!in_array($e['type'], $fatales, true)) {
        return;
    }
    if (!headers_sent()) {
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'success' => false,
        'status'  => 'error',
        'error'   => 'Fallo interno de PHP: ' . $e['message'],
        'archivo' => basename($e['file']),
        'linea'   => $e['line'],
    ], JSON_UNESCAPED_UNICODE);
});

function nivelesAlDia(array $arbol): array
{
    $ahora = time();
    $desde = $arbol['nivelesEn'] ?: ($arbol['updatedAt'] ?? null);
    $dias  = 0.0;
    if ($desde !== null) {
        $t = strtotime((string) $desde);
        if ($t !== false) {
            $dias = max(0.0, ($ahora - $t) / 86400);
        }
    }
    $tope = static fn (float $v): int => (int) max(0, min(100, round($v)));
    $baja = static fn (float $valor, float $ritmo): int => $tope(max(12.0, $valor - $ritmo * $dias));

    return [
        'agua'       => $baja((float) $arbol['aguaNivel'], 4.0),
        'nutrientes' => $baja((float) $arbol['nutrienteNivel'], 1.2),
        'salud'      => $baja((float) $arbol['saludNivel'], 0.4),
    ];
}

function estadoDelArbol(array $n): array
{
    $minimo = min($n['agua'], $n['nutrientes']);
    if ($minimo < 35 || $n['salud'] < 60) {
        return ['clave' => 'CRITICO', 'etiqueta' => 'Necesita atención esta semana'];
    }
    if ($minimo < 60 || $n['salud'] < 82) {
        return ['clave' => 'ATENCIÓN', 'etiqueta' => 'Está bien, pero se le agradece un mimo'];
    }
    return ['clave' => 'OPTIMO', 'etiqueta' => 'Sano y bien atendido'];
}

/* ---------------------------------------------------------------- entrada */

$codigo = null;

if (isset($_GET['codigo']) && is_string($_GET['codigo'])) {
    $codigo = $_GET['codigo'];
} elseif (isset($_SERVER['PATH_INFO']) && is_string($_SERVER['PATH_INFO'])) {
    $codigo = trim($_SERVER['PATH_INFO'], '/');
}

if ($codigo === null || trim($codigo) === '') {
    fallo('Falta el código del árbol. Usa arbol.php?codigo=TB-XXXX-000');
}

$codigo = trim($codigo);

/* --------------------------------------------------------------- conexión */

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (Throwable $e) {
    fallo('No se pudo conectar a la base de datos.', ['detalle' => $e->getMessage()]);
}

/* ------------------------------------------------------------------ árbol */

try {
    $stmt = $pdo->prepare(
        "SELECT a.*,
                p.fila, p.columna, p.estado AS parcelaEstado,
                d.monto AS pagoMonto, d.moneda AS pagoMoneda, d.estado AS pagoEstado
         FROM apadrinamiento a
         LEFT JOIN parcela p ON p.id = a.parcelaId
         LEFT JOIN donacion d ON d.id = a.donacionId
         WHERE a.codigo = ?
         LIMIT 1"
    );
    $stmt->execute([$codigo]);
    $arbol = $stmt->fetch();
} catch (Throwable $e) {
    fallo('No se pudo leer el árbol.', ['detalle' => $e->getMessage()]);
}

if ($arbol === false) {
    fallo('No encontramos ningún árbol con ese código.', ['codigo' => $codigo]);
}

/* --------------------------------------------------------------- cuidados */

$cuidados = [];
try {
    $stmt = $pdo->prepare(
        'SELECT etiqueta, unidad, cantidad, costo, moneda, createdAt
         FROM cuidado_aplicado
         WHERE arbolId = ?
         ORDER BY createdAt DESC'
    );
    $stmt->execute([$arbol['id']]);
    foreach ($stmt->fetchAll() as $c) {
        $cuidados[] = [
            'etiqueta' => $c['etiqueta'],
            'unidad'   => $c['unidad'],
            'cantidad' => (float) $c['cantidad'],
            'costo'    => (float) $c['costo'],
            'moneda'   => $c['moneda'],
            'fecha'    => $c['createdAt'],
        ];
    }
} catch (Throwable $e) {
    $cuidados = [];
}

/* ------------------------------------------------------------------ salida */

$niveles   = nivelesAlDia($arbol);
$estado    = estadoDelArbol($niveles);
$confirmado = (bool) $arbol['confirmado'];

responder([
    'success'     => true,
    'codigo'      => $arbol['codigo'],
    'especie'     => $arbol['especie'],
    'etapa'       => $arbol['etapa'],
    'alias'       => $confirmado ? $arbol['alias'] : null,
    'pais'        => $arbol['pais'],
    'mensaje'     => $arbol['mensaje'],
    'notasFinca'  => $arbol['notasFinca'],
    'confirmado'  => $confirmado,
    'fechaSiembra' => $arbol['fechaSiembra'],
    'niveles'     => $niveles,
    'estado'      => $estado,
    'ultimoRiego' => $arbol['ultimoRiego'],
    'ultimoAbono' => $arbol['ultimoAbono'],
    'cuidados'    => $cuidados,
    'parcela'     => $arbol['fila'] !== null ? [
        'id'      => $arbol['parcelaId'],
        'fila'    => (int) $arbol['fila'],
        'columna' => (int) $arbol['columna'],
        'estado'  => $arbol['parcelaEstado'],
    ] : null,
    'pago'        => $arbol['pagoEstado'] !== null ? [
        'estado' => $arbol['pagoEstado'],
        'monto'  => (float) $arbol['pagoMonto'],
        'moneda' => $arbol['pagoMoneda'],
    ] : null,
    // Campos "planos" de la primera versión, por si algo viejo los consume.
    'especieLabel' => $arbol['especie'] === 'CAFE' ? 'Café' : ($arbol['especie'] === 'CACAO' ? 'Cacao' : null),
    'etapaLabel'   => $arbol['etapa'],
    'estadoLabel'  => $confirmado ? 'CONFIRMADO' : 'Reserva pendiente',
]);
