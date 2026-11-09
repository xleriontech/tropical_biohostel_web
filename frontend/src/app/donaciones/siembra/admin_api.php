<?php
/**
 * API del panel de administración de la finca.
 *
 * Login:  POST admin_api.php?accion=login      {"usuario":"finca","clave":"..."}
 * Datos:  GET  admin_api.php?accion=resumen|arboles|donaciones|config
 * Acción: POST admin_api.php?accion=confirmar|liberar|actualizar|config_guardar|clave
 *
 * Todas las rutas salvo `login` exigen un token firmado:
 *   Authorization: Bearer <token>   (o X-Admin-Token: <token>)
 */
require __DIR__ . '/_config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

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

function fallo(string $mensaje, array $extra = [], int $codigoHttp = 200): void
{
    responder(array_merge([
        'success' => false,
        'status'  => 'error',
        'error'   => $mensaje,
        'message' => $mensaje,
    ], $extra), $codigoHttp);
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

function texto($valor, int $max): string
{
    if (!is_string($valor)) {
        return '';
    }
    $t = trim($valor);
    return function_exists('mb_substr') ? mb_substr($t, 0, $max) : substr($t, 0, $max);
}

/* --------------------------------------------------------------------- CORS/token */

function b64url(string $s): string
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function b64urlDecode(string $s): string
{
    return base64_decode(strtr($s, '-_', '+/')) ?: '';
}

function firmarToken(string $usuario): string
{
    $payload = b64url(json_encode(['u' => $usuario, 'exp' => time() + SIEMBRA_TOKEN_HORAS * 3600]));
    $firma   = b64url(hash_hmac('sha256', $payload, SIEMBRA_SECRET, true));
    return $payload . '.' . $firma;
}

function tokenDePeticion(): ?string
{
    $cabecera = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (is_string($cabecera) && preg_match('/^Bearer\s+(.+)$/i', trim($cabecera), $m)) {
        return trim($m[1]);
    }
    if (!empty($_SERVER['HTTP_X_ADMIN_TOKEN'])) {
        return (string) $_SERVER['HTTP_X_ADMIN_TOKEN'];
    }
    if (!empty($_GET['token'])) {
        return (string) $_GET['token'];
    }
    return null;
}

function usuarioDelToken(): ?string
{
    $token = tokenDePeticion();
    if ($token === null) {
        return null;
    }
    $partes = explode('.', $token);
    if (count($partes) !== 2) {
        return null;
    }
    [$payload, $firma] = $partes;
    $esperada = b64url(hash_hmac('sha256', $payload, SIEMBRA_SECRET, true));
    if (!hash_equals($esperada, $firma)) {
        return null;
    }
    $datos = json_decode(b64urlDecode($payload), true);
    if (!is_array($datos) || empty($datos['u']) || empty($datos['exp'])) {
        return null;
    }
    if ((int) $datos['exp'] < time()) {
        return null;
    }
    return (string) $datos['u'];
}

/* ------------------------------------------------------------------ utilidades */

function niveles(array $arbol): array
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
    $baja = static fn (float $v, float $ritmo): int => $tope(max(12.0, $v - $ritmo * $dias));

    return [
        'agua'       => $baja((float) ($arbol['aguaNivel'] ?? 0), 4.0),
        'nutrientes' => $baja((float) ($arbol['nutrienteNivel'] ?? 0), 1.2),
        'salud'      => $baja((float) ($arbol['saludNivel'] ?? 0), 0.4),
    ];
}

function leerJson(): array
{
    $raw = file_get_contents('php://input');
    if (is_string($raw) && trim($raw) !== '') {
        $d = json_decode($raw, true);
        if (is_array($d)) {
            return $d;
        }
    }
    return $_POST;
}

function configTablero(PDO $pdo): array
{
    $cfg = [
        'filas'          => 9,
        'columnas'       => 9,
        'reservaMinutos' => 30,
        'montoPorArbol'  => null,
        'moneda'         => 'USD',
        'proyectoSlug'   => 'siembra-100-arboles-nativos',
    ];
    try {
        $stmt = $pdo->prepare('SELECT `value` FROM site_config WHERE `key` = ? LIMIT 1');
        $stmt->execute(['siembraTablero']);
        $raw = $stmt->fetchColumn();
        if (is_string($raw) && $raw !== '') {
            $v = json_decode($raw, true);
            if (is_array($v)) {
                foreach (['filas', 'columnas', 'reservaMinutos'] as $k) {
                    if (isset($v[$k]) && is_numeric($v[$k])) {
                        $cfg[$k] = (int) $v[$k];
                    }
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
        // valores por defecto
    }
    return $cfg;
}

/* ------------------------------------------------- límite de intentos por IP */

/**
 * Cuántos fallos se toleran dentro de la ventana antes de bloquear.
 * Un humano que se equivoca 4 veces y acierta a la quinta entra sin drama;
 * un script que prueba claves se topa con el bloqueo.
 */
const LOGIN_MAX_FALLOS      = 5;
const LOGIN_VENTANA_MIN     = 15;
const LOGIN_BLOQUEO_MIN     = 15;   // se duplica con cada bloqueo nuevo
const LOGIN_BLOQUEO_MAX_MIN = 360;

function ipDePeticion(): string
{
    // LiteSpeed sirve el sitio directamente. Si algún día se pone detrás de un
    // proxy de confianza, aquí habría que leer la cabecera real de la IP.
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : 'desconocida';
}

function filaIntentos(PDO $pdo, string $ip): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM siembra_login_intento WHERE ip = ? LIMIT 1');
    $stmt->execute([$ip]);
    $fila = $stmt->fetch();
    return $fila === false ? null : $fila;
}

/** Devuelve los datos del bloqueo si la IP todavía está castigada, o null. */
function bloqueoActivo(PDO $pdo, string $ip): ?array
{
    $fila = filaIntentos($pdo, $ip);
    if ($fila === null || empty($fila['bloqueadoHasta'])) {
        return null;
    }

    $hasta = strtotime((string) $fila['bloqueadoHasta']);
    if ($hasta === false || $hasta <= time()) {
        return null;
    }

    $segundos = $hasta - time();
    $minutos  = max(1, (int) ceil($segundos / 60));

    return [
        'segundos' => $segundos,
        'mensaje'  => 'Demasiados intentos fallidos. Espera ' . $minutos . ' minuto' .
                      ($minutos === 1 ? '' : 's') . ' antes de volver a intentar.',
    ];
}

function registrarFalloLogin(PDO $pdo, string $ip): void
{
    try {
        $ahora  = time();
        $fila   = filaIntentos($pdo, $ip);

        if ($fila === null) {
            $pdo->prepare(
                'INSERT INTO siembra_login_intento (ip, intentos, ventanaInicio, ultimoIntento, bloqueadoHasta, bloqueos)
                 VALUES (?, 1, NOW(), NOW(), NULL, 0)'
            )->execute([$ip]);
            return;
        }

        $ventana = strtotime((string) $fila['ventanaInicio']) ?: $ahora;
        $ultimo  = strtotime((string) $fila['ultimoIntento']) ?: $ahora;
        $intentos = (int) $fila['intentos'];
        $bloqueos = (int) $fila['bloqueos'];

        // Sin actividad por un día: el historial de castigos caduca.
        if ($ahora - $ultimo > 86400) {
            $bloqueos = 0;
        }

        // La ventana de conteo ya expiró: se arranca de cero.
        if ($ahora - $ventana > LOGIN_VENTANA_MIN * 60) {
            $pdo->prepare(
                'UPDATE siembra_login_intento
                 SET intentos = 1, ventanaInicio = NOW(), ultimoIntento = NOW(),
                     bloqueadoHasta = NULL, bloqueos = ?
                 WHERE ip = ?'
            )->execute([$bloqueos, $ip]);
            return;
        }

        $intentos++;

        if ($intentos >= LOGIN_MAX_FALLOS) {
            $bloqueos++;
            $minutos = min(LOGIN_BLOQUEO_MAX_MIN, LOGIN_BLOQUEO_MIN * (2 ** ($bloqueos - 1)));
            $hasta   = date('Y-m-d H:i:s', $ahora + $minutos * 60);

            $pdo->prepare(
                'UPDATE siembra_login_intento
                 SET intentos = 0, ventanaInicio = NOW(), ultimoIntento = NOW(),
                     bloqueadoHasta = ?, bloqueos = ?
                 WHERE ip = ?'
            )->execute([$hasta, $bloqueos, $ip]);
            return;
        }

        $pdo->prepare(
            'UPDATE siembra_login_intento SET intentos = ?, ultimoIntento = NOW() WHERE ip = ?'
        )->execute([$intentos, $ip]);

        // Limpieza ocasional de IPs viejas para que la tabla no crezca sin fin.
        if (random_int(1, 25) === 1) {
            $pdo->exec('DELETE FROM siembra_login_intento WHERE ultimoIntento < (NOW() - INTERVAL 1 DAY)');
        }
    } catch (Throwable $e) {
        // Un problema con el contador nunca debe tumbar el login.
    }
}

function limpiarIntentosLogin(PDO $pdo, string $ip): void
{
    try {
        $pdo->prepare('DELETE FROM siembra_login_intento WHERE ip = ?')->execute([$ip]);
    } catch (Throwable $e) {
        // idem
    }
}

/* ------------------------------------------------------------------- conexión */

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
    fallo('No se pudo conectar a la base de datos.', ['detalle' => $e->getMessage()], 500);
}

$accion = isset($_GET['accion']) && is_string($_GET['accion']) ? $_GET['accion'] : '';
$input  = leerJson();

/* --------------------------------------------------------------------- LOGIN */

if ($accion === 'login') {
    $ip = ipDePeticion();

    // Antes de tocar credenciales: ¿esta IP ya está castigada?
    try {
        $bloqueo = bloqueoActivo($pdo, $ip);
    } catch (Throwable $e) {
        $bloqueo = null; // si la tabla no existe, no se bloquea el acceso
    }
    if ($bloqueo !== null) {
        header('Retry-After: ' . $bloqueo['segundos']);
        fallo($bloqueo['mensaje'], [
            'codigo'               => 'DEMASIADOS_INTENTOS',
            'reintentarEnSegundos' => $bloqueo['segundos'],
        ], 429);
    }

    $usuario = texto($input['usuario'] ?? $input['user'] ?? '', 60);
    $clave   = is_string($input['clave'] ?? $input['password'] ?? null) ? (string) ($input['clave'] ?? $input['password']) : '';

    if ($usuario === '' || $clave === '') {
        fallo('Escribe el usuario y la clave de la finca.');
    }

    $stmt = $pdo->prepare('SELECT `value` FROM site_config WHERE `key` = ? LIMIT 1');
    $stmt->execute(['adminSiembra']);
    $raw = $stmt->fetchColumn();
    $cuenta = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;

    if (!is_array($cuenta) || empty($cuenta['usuario']) || empty($cuenta['hash'])) {
        fallo('Todavía no hay una cuenta de la finca configurada.');
    }

    if (!hash_equals((string) $cuenta['usuario'], $usuario) || !password_verify($clave, (string) $cuenta['hash'])) {
        registrarFalloLogin($pdo, $ip);
        usleep(250000);

        // Si este fallo disparó el bloqueo, se responde ya como bloqueado.
        try {
            $bloqueo = bloqueoActivo($pdo, $ip);
        } catch (Throwable $e) {
            $bloqueo = null;
        }
        if ($bloqueo !== null) {
            header('Retry-After: ' . $bloqueo['segundos']);
            fallo($bloqueo['mensaje'], [
                'codigo'               => 'DEMASIADOS_INTENTOS',
                'reintentarEnSegundos' => $bloqueo['segundos'],
            ], 429);
        }

        // Si no, se cuentan los fallos de esta IP para avisar cuántos quedan.
        $restantes = LOGIN_MAX_FALLOS;
        try {
            $fila = filaIntentos($pdo, $ip);
            if ($fila !== null) {
                $restantes = max(0, LOGIN_MAX_FALLOS - (int) $fila['intentos']);
            }
        } catch (Throwable $e) {
            // sin dato exacto: mensaje neutro
        }

        fallo(
            'Usuario o clave incorrectos. Te quedan ' . $restantes . ' intento' . ($restantes === 1 ? '' : 's') . '.',
            ['intentosRestantes' => $restantes],
            401
        );
    }

    limpiarIntentosLogin($pdo, $ip);

    responder([
        'success' => true,
        'token'   => firmarToken((string) $cuenta['usuario']),
        'usuario' => $cuenta['usuario'],
        'expiraEnHoras' => SIEMBRA_TOKEN_HORAS,
    ]);
}

/* ------------------------------------------------------- autenticación del resto */

$usuario = usuarioDelToken();
if ($usuario === null) {
    fallo('Sesión vencida o token inválido. Vuelve a entrar.', [], 401);
}

/* ------------------------------------------------------------------- ACCIONES */

try {
    switch ($accion) {
        case 'sesion':
            responder(['success' => true, 'usuario' => $usuario]);
            break;

        case 'clave': {
            $actual = is_string($input['actual'] ?? null) ? (string) $input['actual'] : '';
            $nueva  = is_string($input['nueva'] ?? null) ? (string) $input['nueva'] : '';
            if (strlen($nueva) < 8) {
                fallo('La clave nueva debe tener al menos 8 caracteres.');
            }

            $stmt = $pdo->prepare('SELECT `value` FROM site_config WHERE `key` = ? LIMIT 1');
            $stmt->execute(['adminSiembra']);
            $cuenta = json_decode((string) $stmt->fetchColumn(), true);
            if (!is_array($cuenta) || !password_verify($actual, (string) ($cuenta['hash'] ?? ''))) {
                sleep(1);
                fallo('La clave actual no coincide.');
            }

            $cuenta['hash'] = password_hash($nueva, PASSWORD_BCRYPT);
            $cuentaNueva = json_encode($cuenta, JSON_UNESCAPED_UNICODE);

            $pdo->prepare('UPDATE site_config SET `value` = ? WHERE `key` = ?')
                ->execute([$cuentaNueva, 'adminSiembra']);

            responder(['success' => true, 'mensaje' => 'Clave actualizada.']);
            break;
        }

        case 'resumen': {
            $cfg = configTablero($pdo);

            $parcelas = $pdo->query('SELECT estado, COUNT(*) AS n FROM parcela GROUP BY estado')->fetchAll();
            $porEstado = ['LIBRE' => 0, 'RESERVADA' => 0, 'OCUPADA' => 0];
            foreach ($parcelas as $p) {
                if (isset($porEstado[$p['estado']])) {
                    $porEstado[$p['estado']] = (int) $p['n'];
                }
            }

            $arboles = $pdo->query(
                "SELECT SUM(confirmado = 1) AS confirmados, SUM(confirmado = 0) AS pendientes, COUNT(*) AS total
                 FROM apadrinamiento"
            )->fetch();

            $dinero = $pdo->query(
                "SELECT COALESCE(SUM(CASE WHEN estado = 'APROBADA' THEN monto ELSE 0 END), 0) AS recaudado,
                        COUNT(*) AS total,
                        SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) AS pendientes
                 FROM donacion"
            )->fetch();

            $cuidados = $pdo->query(
                "SELECT COUNT(*) AS total, COALESCE(SUM(costo), 0) AS costo FROM cuidado_aplicado"
            )->fetch();

            $ultimas = $pdo->query(
                "SELECT d.id, d.monto, d.moneda, d.nombre, d.email, d.estado, d.createdAt,
                        a.codigo AS arbolCodigo
                 FROM donacion d
                 LEFT JOIN apadrinamiento a ON a.donacionId = d.id
                 ORDER BY d.createdAt DESC, d.id DESC
                 LIMIT 8"
            )->fetchAll();

            $proyecto = null;
            try {
                $stmt = $pdo->prepare('SELECT slug, titulo, meta, moneda, estado FROM proyecto_donacion WHERE slug = ? LIMIT 1');
                $stmt->execute([$cfg['proyectoSlug']]);
                $proyecto = $stmt->fetch() ?: null;
            } catch (Throwable $e) {
                $proyecto = null;
            }

            responder([
                'success'  => true,
                'usuario'  => $usuario,
                'parcelas' => [
                    'total'      => array_sum($porEstado),
                    'libres'     => $porEstado['LIBRE'],
                    'reservadas' => $porEstado['RESERVADA'],
                    'ocupadas'   => $porEstado['OCUPADA'],
                ],
                'arboles' => [
                    'total'      => (int) ($arboles['total'] ?? 0),
                    'confirmados' => (int) ($arboles['confirmados'] ?? 0),
                    'pendientes' => (int) ($arboles['pendientes'] ?? 0),
                ],
                'dinero' => [
                    'recaudado' => (float) $dinero['recaudado'],
                    'donaciones' => (int) $dinero['total'],
                    'pendientes' => (int) ($dinero['pendientes'] ?? 0),
                ],
                'cuidados' => [
                    'total' => (int) $cuidados['total'],
                    'costo' => (float) $cuidados['costo'],
                ],
                'config'   => $cfg,
                'proyecto' => $proyecto !== null ? [
                    'slug'   => $proyecto['slug'],
                    'titulo' => $proyecto['titulo'],
                    'meta'   => (float) $proyecto['meta'],
                    'moneda' => $proyecto['moneda'],
                    'estado' => $proyecto['estado'],
                ] : null,
                'ultimas'  => $ultimas,
            ]);
            break;
        }

        case 'arboles': {
            $estado = isset($_GET['estado']) && is_string($_GET['estado']) ? $_GET['estado'] : 'todos';
            $where  = '';
            if ($estado === 'sembrados') {
                $where = 'WHERE a.confirmado = 1';
            } elseif ($estado === 'pendientes') {
                $where = 'WHERE a.confirmado = 0';
            }

            $filas = $pdo->query(
                "SELECT a.id, a.codigo, a.parcelaId, a.especie, a.etapa, a.alias, a.padrino, a.pais,
                        a.mensaje, a.confirmado, a.fechaSiembra, a.notasFinca,
                        a.aguaNivel, a.nutrienteNivel, a.saludNivel, a.nivelesEn, a.updatedAt,
                        a.ultimoRiego, a.ultimoAbono, a.createdAt,
                        p.fila, p.columna, p.estado AS parcelaEstado, p.expiraAt,
                        d.id AS donacionId, d.monto, d.moneda, d.estado AS donacionEstado,
                        d.nombre AS donanteNombre, d.email AS donanteEmail
                 FROM apadrinamiento a
                 LEFT JOIN parcela p ON p.id = a.parcelaId
                 LEFT JOIN donacion d ON d.id = a.donacionId
                 $where
                 ORDER BY a.confirmado ASC, a.createdAt DESC
                 LIMIT 500"
            )->fetchAll();

            $salida = [];
            foreach ($filas as $a) {
                $salida[] = [
                    'id'          => $a['id'],
                    'codigo'      => $a['codigo'],
                    'parcelaId'   => $a['parcelaId'],
                    'fila'        => $a['fila'] !== null ? (int) $a['fila'] : null,
                    'columna'     => $a['columna'] !== null ? (int) $a['columna'] : null,
                    'parcelaEstado' => $a['parcelaEstado'],
                    'expiraAt'    => $a['expiraAt'],
                    'especie'     => $a['especie'],
                    'etapa'       => $a['etapa'],
                    'alias'       => $a['alias'],
                    'padrino'     => $a['padrino'],
                    'pais'        => $a['pais'],
                    'mensaje'     => $a['mensaje'],
                    'notasFinca'  => $a['notasFinca'],
                    'confirmado'  => (bool) $a['confirmado'],
                    'fechaSiembra' => $a['fechaSiembra'],
                    'niveles'     => niveles($a),
                    'ultimoRiego' => $a['ultimoRiego'],
                    'ultimoAbono' => $a['ultimoAbono'],
                    'createdAt'   => $a['createdAt'],
                    'donacion'    => $a['donacionId'] !== null ? [
                        'id'     => $a['donacionId'],
                        'monto'  => (float) $a['monto'],
                        'moneda' => $a['moneda'],
                        'estado' => $a['donacionEstado'],
                        'nombre' => $a['donanteNombre'],
                        'email'  => $a['donanteEmail'],
                    ] : null,
                ];
            }

            responder(['success' => true, 'arboles' => $salida]);
            break;
        }

        case 'confirmar': {
            $codigo = texto($input['codigo'] ?? '', 20);
            if ($codigo === '') {
                fallo('Falta el código del árbol.');
            }

            $stmt = $pdo->prepare('SELECT id, parcelaId, donacionId FROM apadrinamiento WHERE codigo = ? LIMIT 1');
            $stmt->execute([$codigo]);
            $arbol = $stmt->fetch();
            if ($arbol === false) {
                fallo('No existe un árbol con ese código.');
            }

            $pdo->beginTransaction();
            $pdo->prepare('UPDATE apadrinamiento SET confirmado = 1, fechaSiembra = COALESCE(fechaSiembra, NOW()) WHERE id = ?')
                ->execute([$arbol['id']]);
            $pdo->prepare("UPDATE parcela SET estado = 'OCUPADA', expiraAt = NULL WHERE id = ?")
                ->execute([$arbol['parcelaId']]);
            if (!empty($arbol['donacionId'])) {
                $pdo->prepare("UPDATE donacion SET estado = 'APROBADA' WHERE id = ? AND estado <> 'APROBADA'")
                    ->execute([$arbol['donacionId']]);
            }
            $pdo->commit();

            responder(['success' => true, 'mensaje' => 'Árbol ' . $codigo . ' marcado como sembrado.']);
            break;
        }

        case 'liberar': {
            $codigo = texto($input['codigo'] ?? '', 20);
            if ($codigo === '') {
                fallo('Falta el código del árbol.');
            }

            $stmt = $pdo->prepare('SELECT id, parcelaId FROM apadrinamiento WHERE codigo = ? LIMIT 1');
            $stmt->execute([$codigo]);
            $arbol = $stmt->fetch();
            if ($arbol === false) {
                fallo('No existe un árbol con ese código.');
            }

            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM cuidado_aplicado WHERE arbolId = ?')->execute([$arbol['id']]);
            $pdo->prepare('DELETE FROM apadrinamiento WHERE id = ?')->execute([$arbol['id']]);
            $pdo->prepare("UPDATE parcela SET estado = 'LIBRE', expiraAt = NULL WHERE id = ?")
                ->execute([$arbol['parcelaId']]);
            $pdo->commit();

            responder([
                'success' => true,
                'mensaje' => 'La casilla quedó libre. La donación se conserva en el histórico.',
            ]);
            break;
        }

        case 'actualizar': {
            $codigo = texto($input['codigo'] ?? '', 20);
            if ($codigo === '') {
                fallo('Falta el código del árbol.');
            }

            $permitidos = [
                'especie'    => ['CAFE', 'CACAO'],
                'etapa'      => ['SEMILLA', 'BROTE', 'JUVENIL', 'PRODUCTIVO'],
            ];
            $sets = [];
            $valores = [];

            if (isset($input['especie'])) {
                $especie = strtoupper(texto($input['especie'], 10));
                if (!in_array($especie, $permitidos['especie'], true)) {
                    fallo('La especie debe ser CAFE o CACAO.');
                }
                $sets[] = 'especie = ?';
                $valores[] = $especie;
            }
            if (isset($input['etapa'])) {
                $etapa = strtoupper(texto($input['etapa'], 20));
                if (!in_array($etapa, $permitidos['etapa'], true)) {
                    fallo('La etapa no es válida.');
                }
                $sets[] = 'etapa = ?';
                $valores[] = $etapa;
            }
            foreach ([
                'alias'      => 40,
                'pais'       => 60,
                'mensaje'    => 500,
                'notasFinca' => 4000,
            ] as $campo => $max) {
                if (array_key_exists($campo, $input)) {
                    $valor = texto($input[$campo], $max);
                    $sets[] = $campo . ' = ?';
                    $valores[] = $valor !== '' ? $valor : null;
                }
            }

            if ($sets === []) {
                fallo('No enviaste ningún cambio.');
            }

            $valores[] = $codigo;
            $stmt = $pdo->prepare('UPDATE apadrinamiento SET ' . implode(', ', $sets) . ' WHERE codigo = ?');
            $stmt->execute($valores);

            if ($stmt->rowCount() === 0) {
                $existe = $pdo->prepare('SELECT 1 FROM apadrinamiento WHERE codigo = ?');
                $existe->execute([$codigo]);
                if ($existe->fetchColumn() === false) {
                    fallo('No existe un árbol con ese código.');
                }
            }

            responder(['success' => true, 'mensaje' => 'Ficha de ' . $codigo . ' actualizada.']);
            break;
        }

        case 'donaciones': {
            $filas = $pdo->query(
                "SELECT d.id, d.proyectoId, d.monto, d.moneda, d.nombre, d.email, d.mensaje,
                        d.paypalOrderId, d.estado, d.esManual, d.createdAt,
                        p.titulo AS proyecto,
                        a.codigo AS arbolCodigo
                 FROM donacion d
                 LEFT JOIN proyecto_donacion p ON p.id = d.proyectoId
                 LEFT JOIN apadrinamiento a ON a.donacionId = d.id
                 ORDER BY d.createdAt DESC, d.id DESC
                 LIMIT 500"
            )->fetchAll();

            $totales = [];
            $totalGeneral = 0.0;
            foreach ($filas as $d) {
                $moneda = (string) ($d['moneda'] ?: 'USD');
                if (!isset($totales[$moneda])) {
                    $totales[$moneda] = 0.0;
                }
                if ($d['estado'] === 'APROBADA') {
                    $totales[$moneda] += (float) $d['monto'];
                    $totalGeneral += (float) $d['monto'];
                }
            }

            responder([
                'success'    => true,
                'donaciones' => $filas,
                'totales'    => $totales,
                'totalRegistros' => count($filas),
            ]);
            break;
        }

        case 'config': {
            $cfg = configTablero($pdo);
            responder([
                'success' => true,
                'config'  => $cfg,
                'moneda'  => $cfg['moneda'],
            ]);
            break;
        }

        case 'config_guardar': {
            $cfg = configTablero($pdo);

            if (array_key_exists('montoPorArbol', $input)) {
                if ($input['montoPorArbol'] === null || $input['montoPorArbol'] === '') {
                    $cfg['montoPorArbol'] = null;
                } elseif (is_numeric($input['montoPorArbol']) && (float) $input['montoPorArbol'] >= 0) {
                    $cfg['montoPorArbol'] = (float) $input['montoPorArbol'];
                } else {
                    fallo('El monto por árbol no es válido.');
                }
            }
            if (array_key_exists('reservaMinutos', $input)) {
                if (!is_numeric($input['reservaMinutos']) || (int) $input['reservaMinutos'] < 5) {
                    fallo('La reserva debe durar al menos 5 minutos.');
                }
                $cfg['reservaMinutos'] = (int) $input['reservaMinutos'];
            }
            if (!empty($input['proyectoSlug'])) {
                $cfg['proyectoSlug'] = texto($input['proyectoSlug'], 120);
            }

            $stmt = $pdo->prepare('SELECT COUNT(*) FROM site_config WHERE `key` = ?');
            $stmt->execute(['siembraTablero']);
            $existe = (int) $stmt->fetchColumn() > 0;

            $json = json_encode($cfg, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($existe) {
                $pdo->prepare('UPDATE site_config SET `value` = ? WHERE `key` = ?')->execute([$json, 'siembraTablero']);
            } else {
                $pdo->prepare('INSERT INTO site_config (`key`, `value`) VALUES (?, ?)')->execute(['siembraTablero', $json]);
            }

            responder(['success' => true, 'mensaje' => 'Configuración guardada.', 'config' => $cfg]);
            break;
        }

        default:
            fallo('Acción no reconocida: ' . $accion, [], 404);
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fallo('Error al ejecutar la acción.', ['detalle' => $e->getMessage()], 500);
}
