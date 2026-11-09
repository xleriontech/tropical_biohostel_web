<?php
/**
 * GET /siembra/tablero.php
 * Devuelve el tablero 9x9 con el estado de cada parcela y el árbol que la ocupa.
 *
 * La forma de la respuesta coincide con la interfaz Tablero del frontend
 * (frontend/src/lib/siembra.ts).
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

/** Los niveles bajan solos con los días: se calculan al leer, igual que en el backend NestJS. */
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
    'filas'          => 9,
    'columnas'       => 9,
    'reservaMinutos' => 30,
    'montoPorArbol'  => null,
    'moneda'         => null,
    'proyectoSlug'   => 'siembra-100-arboles-nativos',
];

try {
    $stmt = $pdo->prepare('SELECT `value` FROM site_config WHERE `key` = ? LIMIT 1');
    $stmt->execute(['siembraTablero']);
    $rawCfg = $stmt->fetchColumn();
    if (is_string($rawCfg) && $rawCfg !== '') {
        $v = json_decode($rawCfg, true);
        if (is_array($v)) {
            if (isset($v['filas']) && is_numeric($v['filas'])) {
                $cfg['filas'] = max(1, (int) $v['filas']);
            }
            if (isset($v['columnas']) && is_numeric($v['columnas'])) {
                $cfg['columnas'] = max(1, (int) $v['columnas']);
            }
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
    // Seguimos con los valores por defecto.
}

/* ------------------------------------------------- mantener el tablero al día */

try {
    $stmt = $pdo->prepare("INSERT IGNORE INTO parcela (id, fila, columna, estado, expiraAt) VALUES (?, ?, ?, 'LIBRE', NULL)");
    for ($f = 0; $f < $cfg['filas']; $f++) {
        for ($c = 0; $c < $cfg['columnas']; $c++) {
            $stmt->execute(['par-' . $f . '-' . $c, $f, $c]);
        }
    }

    // Un árbol confirmado siempre deja su parcela OCUPADA.
    $pdo->exec("UPDATE parcela p
                JOIN apadrinamiento a ON a.parcelaId = p.id AND a.confirmado = 1
                SET p.estado = 'OCUPADA', p.expiraAt = NULL");

    // Las reservas vencidas vuelven a estar libres.
    $pdo->exec("UPDATE parcela SET estado = 'LIBRE', expiraAt = NULL
                WHERE estado = 'RESERVADA' AND (expiraAt IS NULL OR expiraAt < NOW())");
} catch (Throwable $e) {
    fallo('No se pudo preparar el tablero.', ['detalle' => $e->getMessage()]);
}

/* ---------------------------------------------------------------- parcelas */

try {
    $parcelas = $pdo->query(
        "SELECT p.id, p.fila, p.columna, p.estado, p.expiraAt,
                a.codigo, a.especie, a.etapa, a.alias, a.confirmado, a.pais, a.mensaje,
                a.aguaNivel, a.nutrienteNivel, a.saludNivel, a.nivelesEn, a.updatedAt,
                a.ultimoRiego, a.ultimoAbono
         FROM parcela p
         LEFT JOIN apadrinamiento a ON a.id = (
             SELECT a2.id FROM apadrinamiento a2
             WHERE a2.parcelaId = p.id
             ORDER BY a2.confirmado DESC, a2.createdAt DESC
             LIMIT 1
         )
         ORDER BY p.fila ASC, p.columna ASC"
    )->fetchAll();
} catch (Throwable $e) {
    fallo('No se pudieron leer las parcelas.', ['detalle' => $e->getMessage()]);
}

$libres = 0;
$reservadas = 0;
$ocupadas = 0;
$cafe = 0;
$cacao = 0;
$donantes = [];

$salida = [];
foreach ($parcelas as $p) {
    $estado = (string) $p['estado'];
    if ($estado === 'LIBRE') {
        $libres++;
    } elseif ($estado === 'RESERVADA') {
        $reservadas++;
    } elseif ($estado === 'OCUPADA') {
        $ocupadas++;
        if ($p['especie'] === 'CAFE') {
            $cafe++;
        } elseif ($p['especie'] === 'CACAO') {
            $cacao++;
        }
        if (!empty($p['alias']) && count($donantes) < 24) {
            $donantes[] = [
                'alias'   => $p['alias'],
                'especie' => $p['especie'],
                'etapa'   => $p['etapa'],
            ];
        }
    }

    $arbol = null;
    if ($p['codigo'] !== null && ($estado === 'OCUPADA' || $estado === 'RESERVADA')) {
        $niveles = nivelesAlDia($p);
        $arbol = [
            'codigo'      => $p['codigo'],
            'especie'     => $p['especie'],
            'etapa'       => $p['etapa'],
            // El alias es público solo cuando el árbol está confirmado.
            'alias'       => $p['confirmado'] ? $p['alias'] : null,
            'confirmado'  => (bool) $p['confirmado'],
            'niveles'     => $niveles,
            'estado'      => estadoDelArbol($niveles),
            'ultimoRiego' => $p['ultimoRiego'],
            'ultimoAbono' => $p['ultimoAbono'],
        ];
    }

    $salida[] = [
        'fila'    => (int) $p['fila'],
        'columna' => (int) $p['columna'],
        'estado'  => $estado,
        'arbol'   => $arbol,
        'expiraAt' => $p['expiraAt'],
        // Compatibilidad con la primera versión del endpoint.
        'display' => [
            'especieLabel' => $p['especie'] === 'CAFE' ? 'Café' : ($p['especie'] === 'CACAO' ? 'Cacao' : null),
            'estadoLabel'  => $arbol !== null ? ($p['confirmado'] ? 'OCUPADO' : 'RESERVADO') : null,
        ],
    ];
}

/* ---------------------------------------------------------------- proyecto */

$proyecto = null;
try {
    $stmt = $pdo->prepare('SELECT id, slug, titulo, meta, moneda, estado FROM proyecto_donacion WHERE slug = ? LIMIT 1');
    $stmt->execute([$cfg['proyectoSlug']]);
    $proyecto = $stmt->fetch() ?: null;

    if ($proyecto === null) {
        $proyecto = $pdo->query("SELECT id, slug, titulo, meta, moneda, estado FROM proyecto_donacion WHERE estado = 'ACTIVO' ORDER BY orden ASC, createdAt ASC LIMIT 1")->fetch() ?: null;
    }
} catch (Throwable $e) {
    $proyecto = null;
}

$moneda = ($proyecto !== null && !empty($proyecto['moneda']))
    ? (string) $proyecto['moneda']
    : ($cfg['moneda'] ?? 'USD');

/* ---------------------------------------------------------------- cuidados */

$cuidados = [];
try {
    $items = $pdo->query(
        "SELECT clave, etiqueta, categoria, unidad, precio, descripcion,
                realceAgua, realceNutri, realceSalud
         FROM item_cuidado
         WHERE activo = 1
         ORDER BY orden ASC, etiqueta ASC"
    )->fetchAll();

    foreach ($items as $i) {
        $cuidados[] = [
            'clave'       => $i['clave'],
            'etiqueta'    => $i['etiqueta'],
            'categoria'   => $i['categoria'],
            'unidad'      => $i['unidad'],
            'precio'      => (float) $i['precio'],
            'descripcion' => $i['descripcion'],
            'realce'      => [
                'agua'       => (int) $i['realceAgua'],
                'nutrientes' => (int) $i['realceNutri'],
                'salud'      => (int) $i['realceSalud'],
            ],
        ];
    }
} catch (Throwable $e) {
    $cuidados = [];
}

/* ------------------------------------------------------------------ salida */

responder([
    'success'        => true,
    'filas'          => $cfg['filas'],
    'columnas'       => $cfg['columnas'],
    'montoPorArbol'  => $cfg['montoPorArbol'],
    'moneda'         => $moneda,
    'reservaMinutos' => $cfg['reservaMinutos'],
    'estadisticas'   => [
        'total'      => count($parcelas),
        'libres'     => $libres,
        'reservadas' => $reservadas,
        'ocupadas'   => $ocupadas,
        'cafe'       => $cafe,
        'cacao'      => $cacao,
    ],
    'donantes'       => $donantes,
    // Hay proyecto activo: se puede apadrinar. Sin pasarela integrada, el pago es simulado.
    'pagoHabilitado' => $proyecto !== null && $proyecto['estado'] === 'ACTIVO',
    'pagoSimulado'   => true,
    'proyecto'       => $proyecto !== null ? [
        'slug'   => $proyecto['slug'],
        'titulo' => $proyecto['titulo'],
        'meta'   => (float) $proyecto['meta'],
        'estado' => $proyecto['estado'],
    ] : null,
    'parcelas'       => $salida,
    'cuidados'       => $cuidados,
]);
