<?php
/**
 * POST /siembra/reserva.php
 * Reserva (o siembra) un árbol en una casilla del tablero.
 *
 * Acepta JSON por POST:
 *   {"fila":0,"columna":0,"especie":"CAFE","alias":"...","nombre":"...","email":"...","pais":"...","mensaje":"..."}
 * También acepta las claves cortas f, c, e, a, n, m, p, msj.
 * Para probar desde el navegador acepta GET:
 *   reserva.php?fila=0&columna=0&especie=CAFE&alias=Prueba
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

// Si PHP muere por un error fatal, igual devolvemos JSON (nunca una página en blanco).
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
if ($input === [] && $_GET !== []) {
    $input = $_GET;
}

$fila     = $input['fila']     ?? $input['f']   ?? null;
$columna  = $input['columna']  ?? $input['c']   ?? null;
$especie  = $input['especie']  ?? $input['e']   ?? null;
$alias    = $input['alias']    ?? $input['a']   ?? null;
$nombre   = $input['nombre']   ?? $input['n']   ?? null;
$email    = $input['email']    ?? $input['m']   ?? null;
$pais     = $input['pais']     ?? $input['p']   ?? null;
$mensaje  = $input['mensaje']  ?? $input['msj'] ?? null;

if (!is_numeric($fila) || !is_numeric($columna)) {
    fallo('Fila y columna son requeridas y deben ser numéricas.', [
        'recibido' => ['fila' => $fila, 'columna' => $columna],
    ]);
}

$fila    = (int) $fila;
$columna = (int) $columna;
$especie = is_string($especie) ? strtoupper(trim($especie)) : '';

if ($fila < 0 || $columna < 0) {
    fallo('Fila y columna deben ser mayores o iguales a cero.');
}
if (!in_array($especie, ['CAFE', 'CACAO'], true)) {
    fallo('La especie debe ser CAFE o CACAO.');
}

function limpiarTexto($valor, int $max): string
{
    if (!is_string($valor)) {
        return '';
    }
    $texto = trim($valor);
    if (function_exists('mb_substr')) {
        return mb_substr($texto, 0, $max);
    }
    return substr($texto, 0, $max);
}

$alias   = limpiarTexto($alias, 40);
$nombre  = limpiarTexto($nombre, 120);
$email   = limpiarTexto($email, 160);
$pais    = limpiarTexto($pais, 60);
$mensaje = limpiarTexto($mensaje, 500);

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

/* --------------------------------------------------------- configuración */

$cfg = [
    'reservaMinutos' => 30,
    'montoPorArbol'  => null,
    'moneda'         => 'USD',
    'proyectoSlug'   => 'siembra-100-arboles-nativos',
];

try {
    $stmt = $pdo->prepare('SELECT `value` FROM site_config WHERE `key` = ? LIMIT 1');
    $stmt->execute(['siembraTablero']);
    $rawCfg = $stmt->fetchColumn();
    if (is_string($rawCfg) && $rawCfg !== '') {
        $v = json_decode($rawCfg, true);
        if (is_array($v)) {
            if (isset($v['reservaMinutos']) && is_numeric($v['reservaMinutos'])) {
                $cfg['reservaMinutos'] = max(1, (int) $v['reservaMinutos']);
            }
            if (isset($v['montoPorArbol']) && is_numeric($v['montoPorArbol']) && (float) $v['montoPorArbol'] > 0) {
                $cfg['montoPorArbol'] = (float) $v['montoPorArbol'];
            }
            if (!empty($v['moneda'])) {
                $cfg['moneda'] = (string) $v['moneda'];
            }
            if (!empty($v['proyectoSlug'])) {
                $cfg['proyectoSlug'] = (string) $v['proyectoSlug'];
            }
        }
    }
} catch (Throwable $e) {
    // La configuración es opcional: seguimos con los valores por defecto.
}

$proyecto = null;
try {
    $stmt = $pdo->prepare('SELECT id, slug, titulo, moneda, estado FROM proyecto_donacion WHERE slug = ? LIMIT 1');
    $stmt->execute([$cfg['proyectoSlug']]);
    $proyecto = $stmt->fetch() ?: null;

    if ($proyecto === null) {
        $proyecto = $pdo->query("SELECT id, slug, titulo, moneda, estado FROM proyecto_donacion WHERE estado = 'ACTIVO' ORDER BY orden ASC, createdAt ASC LIMIT 1")->fetch() ?: null;
    }
} catch (Throwable $e) {
    fallo('No se pudo leer el proyecto de donación.', ['detalle' => $e->getMessage()]);
}

if ($proyecto === null) {
    fallo('No hay un proyecto de donación configurado en la base de datos.');
}

$monto = $cfg['montoPorArbol'] !== null
    ? $cfg['montoPorArbol']
    : (isset($input['monto']) && is_numeric($input['monto']) ? (float) $input['monto'] : 0.0);

$moneda = !empty($proyecto['moneda']) ? (string) $proyecto['moneda'] : $cfg['moneda'];

// Cuando PayPal esté integrado, pon esta constante en true: la reserva quedará
// PENDIENTE hasta que se capture el pago. Mientras tanto el flujo es simulado y
// el árbol se confirma de inmediato (pagoSimulado = true en el tablero).
const PASARELA_ACTIVA = false;

$pagoHabilitado = $monto > 0;
$confirmado     = PASARELA_ACTIVA ? 0 : 1;

$parcelaId = 'par-' . $fila . '-' . $columna;

/* ------------------------------------------------------------- transacción */

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('SELECT id, estado, expiraAt FROM parcela WHERE id = ? FOR UPDATE');
    $stmt->execute([$parcelaId]);
    $parcela = $stmt->fetch();

    if ($parcela === false) {
        $pdo->prepare("INSERT INTO parcela (id, fila, columna, estado, expiraAt) VALUES (?, ?, ?, 'LIBRE', NULL)")
            ->execute([$parcelaId, $fila, $columna]);
        $parcela = ['id' => $parcelaId, 'estado' => 'LIBRE', 'expiraAt' => null];
    }

    if ($parcela['estado'] === 'OCUPADA') {
        $pdo->rollBack();
        fallo('Esa casilla ya está ocupada por otro árbol.', [
            'fila'    => $fila,
            'columna' => $columna,
            'estado'  => 'OCUPADA',
        ]);
    }

    if ($parcela['estado'] === 'RESERVADA') {
        $expira = $parcela['expiraAt'] !== null ? strtotime((string) $parcela['expiraAt']) : 0;
        if ($expira > time()) {
            $pdo->rollBack();
            fallo('Esa casilla está reservada en este momento. Intenta con otra.', [
                'fila'      => $fila,
                'columna'   => $columna,
                'estado'    => 'RESERVADA',
                'expiraAt'  => $parcela['expiraAt'],
            ]);
        }
    }

    // Limpiar reservas viejas o vencidas de esa casilla.
    $pdo->prepare('DELETE FROM apadrinamiento WHERE parcelaId = ? AND confirmado = 0')
        ->execute([$parcelaId]);

    // Código público del árbol, único.
    $codigo = '';
    for ($intento = 0; $intento < 10; $intento++) {
        $candidato = 'TB-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4)) . '-' . random_int(100, 999);
        $stmt = $pdo->prepare('SELECT 1 FROM apadrinamiento WHERE codigo = ? LIMIT 1');
        $stmt->execute([$candidato]);
        if ($stmt->fetchColumn() === false) {
            $codigo = $candidato;
            break;
        }
    }
    if ($codigo === '') {
        $pdo->rollBack();
        fallo('No se pudo generar un código único. Intenta de nuevo.');
    }

    $arbolId    = 'arb-' . bin2hex(random_bytes(8));
    $donacionId = 'don-' . bin2hex(random_bytes(8));

    $stmt = $pdo->prepare(
        'INSERT INTO apadrinamiento
            (id, codigo, parcelaId, proyectoId, donacionId, especie, etapa, alias, padrino, pais, mensaje,
             confirmado, fechaSiembra, aguaNivel, nutrienteNivel, saludNivel, nivelesEn)
         VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 55, 45, 78, NOW())'
    );
    $stmt->execute([
        $arbolId,
        $codigo,
        $parcelaId,
        $proyecto['id'],
        $donacionId,
        $especie,
        'SEMILLA',
        $alias !== '' ? $alias : null,
        $nombre !== '' ? $nombre : null,
        $pais !== '' ? $pais : null,
        $mensaje !== '' ? $mensaje : null,
        $confirmado,
        $confirmado === 1 ? date('Y-m-d H:i:s') : null,
    ]);

    $stmt = $pdo->prepare(
        'INSERT INTO donacion (id, proyectoId, monto, moneda, nombre, email, mensaje, estado, esManual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)'
    );
    $stmt->execute([
        $donacionId,
        $proyecto['id'],
        $monto,
        $moneda,
        $nombre !== '' ? $nombre : null,
        $email !== '' ? $email : null,
        $mensaje !== '' ? $mensaje : null,
        $pagoHabilitado ? 'PENDIENTE' : 'APROBADA',
    ]);

    if ($confirmado === 1) {
        $pdo->prepare("UPDATE parcela SET estado = 'OCUPADA', expiraAt = NULL WHERE id = ?")
            ->execute([$parcelaId]);
        $estadoParcela = 'OCUPADA';
        $expiraAt      = null;
    } else {
        $expiraAt = date('Y-m-d H:i:s', time() + $cfg['reservaMinutos'] * 60);
        $pdo->prepare("UPDATE parcela SET estado = 'RESERVADA', expiraAt = ? WHERE id = ?")
            ->execute([$expiraAt, $parcelaId]);
        $estadoParcela = 'RESERVADA';
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fallo('No se pudo guardar la reserva.', ['detalle' => $e->getMessage()]);
}

/* ---------------------------------------------------------------- salida */

responder([
    'success'     => true,
    'status'      => 'ok',
    'orderId'     => null,
    'donacionId'  => $donacionId,
    'codigo'      => $codigo,
    'expiraAt'    => $expiraAt,
    'confirmado'  => $confirmado === 1,
    'fila'        => $fila,
    'columna'     => $columna,
    'especie'     => $especie,
    'alias'       => $alias !== '' ? $alias : null,
    'monto'       => $monto,
    'moneda'      => $moneda,
    'parcela'     => ['id' => $parcelaId, 'estado' => $estadoParcela],
    'arbol'       => 'https://xlerion.com.co/siembra/arbol.php?codigo=' . urlencode($codigo),
    'mensaje'     => $confirmado === 1
        ? 'Árbol sembrado y confirmado. Código: ' . $codigo
        : 'Casilla reservada por ' . $cfg['reservaMinutos'] . ' minutos. Código: ' . $codigo,
]);
