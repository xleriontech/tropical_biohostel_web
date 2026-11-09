<?php
/**
 * POST /siembra/cuidado.php
 * Aplica un "mimo" (riego, abono, sustrato, jornal) al árbol de una casilla.
 *
 * Entrada JSON:
 *   {"fila":0,"columna":4,"lineas":[{"clave":"RIEGO","cantidad":2}]}
 *
 * Mientras no haya pasarela de pago, el mimamiento se aplica y se registra
 * como donación aprobada (pago simulado).
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

/** Mismos ritmos de decaimiento que el backend NestJS. */
function nivelesAlDia(array $arbol): array
{
    $desde = $arbol['nivelesEn'] ?: ($arbol['updatedAt'] ?? null);
    $dias  = 0.0;
    if ($desde !== null) {
        $t = strtotime((string) $desde);
        if ($t !== false) {
            $dias = max(0.0, (time() - $t) / 86400);
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

function tope(float $v): int
{
    return (int) max(0, min(100, round($v)));
}

/* ---------------------------------------------------------------- entrada */

$raw = file_get_contents('php://input');
$input = [];

if (is_string($raw) && trim($raw) !== '') {
    $decodificado = json_decode($raw, true);
    if (is_array($decodificado)) {
        $input = $decodificado;
    } else {
        fallo('El cuerpo enviado no es JSON válido: ' . json_last_error_msg());
    }
}
if ($input === [] && $_POST !== []) {
    $input = $_POST;
}

$fila    = $input['fila']    ?? $input['f'] ?? null;
$columna = $input['columna'] ?? $input['c'] ?? null;
$lineas  = $input['lineas']  ?? [];

if (!is_numeric($fila) || !is_numeric($columna)) {
    fallo('Fila y columna son requeridas.');
}
if (!is_array($lineas) || $lineas === []) {
    fallo('No indicaste qué cuidados quieres aplicar.');
}

$fila    = (int) $fila;
$columna = (int) $columna;
$parcelaId = 'par-' . $fila . '-' . $columna;

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

/* ------------------------------------------------------------ validaciones */

try {
    $stmt = $pdo->prepare('SELECT * FROM apadrinamiento WHERE parcelaId = ? AND confirmado = 1 ORDER BY createdAt DESC LIMIT 1');
    $stmt->execute([$parcelaId]);
    $arbol = $stmt->fetch();

    if ($arbol === false) {
        fallo('Esa casilla todavía no tiene un árbol confirmado al que mimar.', [
            'fila'    => $fila,
            'columna' => $columna,
        ]);
    }

    $claves = [];
    foreach ($lineas as $l) {
        if (is_array($l) && !empty($l['clave']) && is_string($l['clave'])) {
            $claves[] = $l['clave'];
        }
    }
    $claves = array_values(array_unique($claves));
    if ($claves === []) {
        fallo('Ninguna de las líneas trae una clave de cuidado válida.');
    }

    $marcas = implode(',', array_fill(0, count($claves), '?'));
    $stmt = $pdo->prepare(
        "SELECT id, clave, etiqueta, categoria, unidad, precio, realceAgua, realceNutri, realceSalud
         FROM item_cuidado
         WHERE activo = 1 AND clave IN ($marcas)"
    );
    $stmt->execute($claves);
    $catalogo = [];
    foreach ($stmt->fetchAll() as $item) {
        $catalogo[$item['clave']] = $item;
    }
} catch (Throwable $e) {
    fallo('No se pudo leer el árbol o el catálogo de cuidados.', ['detalle' => $e->getMessage()]);
}

/* --------------------------------------------------------------- aplicar */

try {
    $pdo->beginTransaction();

    $niveles = nivelesAlDia($arbol);
    $total   = 0.0;
    $aplicados = [];
    $tocaRiego = false;
    $tocaAbono = false;

    foreach ($lineas as $l) {
        if (!is_array($l) || empty($l['clave']) || !isset($catalogo[$l['clave']])) {
            continue;
        }
        $item = $catalogo[$l['clave']];
        $cantidad = isset($l['cantidad']) && is_numeric($l['cantidad']) ? (float) $l['cantidad'] : 1.0;
        $cantidad = max(0.5, min(50.0, $cantidad));

        $niveles['agua']       = tope($niveles['agua']       + (float) $item['realceAgua']   * $cantidad);
        $niveles['nutrientes'] = tope($niveles['nutrientes'] + (float) $item['realceNutri']  * $cantidad);
        $niveles['salud']      = tope($niveles['salud']      + (float) $item['realceSalud']  * $cantidad);

        $costo = (float) $item['precio'] * $cantidad;
        $total += $costo;

        if ($item['categoria'] === 'AGUA') {
            $tocaRiego = true;
        } elseif ($item['categoria'] === 'ABONO' || $item['categoria'] === 'SUSTRATO') {
            $tocaAbono = true;
        } else {
            $tocaRiego = true;
            $tocaAbono = true;
        }

        $aplicados[] = [
            'itemId'   => $item['id'],
            'etiqueta' => $item['etiqueta'],
            'unidad'   => $item['unidad'],
            'cantidad' => $cantidad,
            'costo'    => $costo,
        ];
    }

    if ($aplicados === []) {
        $pdo->rollBack();
        fallo('Ninguno de los cuidados pedidos existe en el catálogo.');
    }

    $moneda = 'USD';
    try {
        $stmt = $pdo->prepare('SELECT moneda FROM proyecto_donacion WHERE id = ? LIMIT 1');
        $stmt->execute([$arbol['proyectoId']]);
        $m = $stmt->fetchColumn();
        if (is_string($m) && $m !== '') {
            $moneda = $m;
        }
    } catch (Throwable $e) {
        $moneda = 'USD';
    }

    $donacionId = 'don-' . bin2hex(random_bytes(8));

    $stmt = $pdo->prepare(
        'INSERT INTO donacion (id, proyectoId, monto, moneda, nombre, email, estado, esManual)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)'
    );
    $stmt->execute([$donacionId, $arbol['proyectoId'], $total, $moneda, 'APROBADA']);

    $stmt = $pdo->prepare(
        'INSERT INTO cuidado_aplicado
            (id, arbolId, itemId, donacionId, etiqueta, unidad, cantidad, costo, moneda, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($aplicados as $a) {
        $stmt->execute([
            'cui-' . bin2hex(random_bytes(8)),
            $arbol['id'],
            $a['itemId'],
            $donacionId,
            $a['etiqueta'],
            $a['unidad'],
            $a['cantidad'],
            $a['costo'],
            $moneda,
            'APLICADO',
        ]);
    }

    $sets = ['aguaNivel = ?', 'nutrienteNivel = ?', 'saludNivel = ?', 'nivelesEn = NOW()'];
    $valores = [$niveles['agua'], $niveles['nutrientes'], $niveles['salud']];
    if ($tocaRiego) {
        $sets[] = 'ultimoRiego = NOW()';
    }
    if ($tocaAbono) {
        $sets[] = 'ultimoAbono = NOW()';
    }
    $valores[] = $arbol['id'];

    $pdo->prepare('UPDATE apadrinamiento SET ' . implode(', ', $sets) . ' WHERE id = ?')
        ->execute($valores);

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fallo('No se pudo aplicar el mimamiento.', ['detalle' => $e->getMessage()]);
}

responder([
    'success'    => true,
    'status'     => 'ok',
    // Sin pasarela real no hay orden externa: el frontend usa el modo simulado.
    'orderId'    => null,
    'donacionId' => $donacionId,
    'total'      => $total,
    'moneda'     => $moneda,
    'aplicado'   => true,
    'niveles'    => $niveles,
    'arbol'      => $arbol['codigo'],
    'mensaje'    => 'Mimamiento aplicado al árbol ' . $arbol['codigo'] . '.',
]);
