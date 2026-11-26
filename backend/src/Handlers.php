<?php
declare(strict_types=1);

final class Handlers
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    private function pdo(): PDO
    {
        return Database::pdo($this->config);
    }

    private function body(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    private function query(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    private function safe(callable $fn): void
    {
        try {
            $fn();
        } catch (Throwable $e) {
            $env = $this->config['app_env'] ?? 'production';
            $msg = $env === 'production' ? 'Error interno del servidor' : $e->getMessage();
            Response::error($msg, 500);
        }
    }

    // ---------- Config ----------
    public function getParallax(): void
    {
        $this->safe(function () {
            Response::json($this->getConfigValue('parallax', [
                'enabled' => true,
                'slides' => [],
            ]));
        });
    }

    public function getAdsDisplay(): void
    {
        $this->safe(function () {
            Response::json($this->getConfigValue('ads-display', [
                'enabled' => true,
            ]));
        });
    }

    public function getSiteBranding(): void
    {
        $this->safe(function () {
            Response::json($this->getConfigValue('site-branding', [
                'logoUrl' => null,
            ]));
        });
    }

    private function getConfigValue(string $key, mixed $default): mixed
    {
        try {
            $stmt = $this->pdo()->prepare('SELECT value_json FROM site_config WHERE config_key = ? LIMIT 1');
            $stmt->execute([$key]);
            $row = $stmt->fetch();
            if ($row && isset($row['value_json'])) {
                $decoded = json_decode($row['value_json'], true);
                return $decoded === null ? $default : $decoded;
            }
        } catch (Throwable $e) {
            // tabla no existe o BD no disponible: devolver default
        }
        return $default;
    }

    // ---------- Properties ----------
    public function getProperties(): void
    {
        $this->safe(function () {
            $page = max(1, (int) $this->query('page', 1));
            $limit = min(100, max(1, (int) $this->query('limit', 12)));
            $tipo = trim((string) $this->query('tipo', ''));
            $offset = ($page - 1) * $limit;

            $where = 'WHERE estado = "PUBLICADO"';
            $params = [];
            if ($tipo !== '') {
                $where .= ' AND tipo = ?';
                $params[] = $tipo;
            }

            $countStmt = $this->pdo()->prepare("SELECT COUNT(*) AS total FROM properties $where");
            $countStmt->execute($params);
            $total = (int) ($countStmt->fetch()['total'] ?? 0);

            $sql = "SELECT * FROM properties $where ORDER BY created_at DESC LIMIT ? OFFSET ?";
            $stmt = $this->pdo()->prepare($sql);
            $i = 1;
            foreach ($params as $p) { $stmt->bindValue($i++, $p); }
            $stmt->bindValue($i++, $limit, PDO::PARAM_INT);
            $stmt->bindValue($i++, $offset, PDO::PARAM_INT);
            $stmt->execute();
            $items = array_map([$this, 'normalizeProperty'], $stmt->fetchAll());

            Response::json([
                'items' => $items,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => $limit > 0 ? (int) ceil($total / $limit) : 0,
                ],
            ]);
        });
    }

    public function getPropertyBySlug(array $params): void
    {
        $this->safe(function () use ($params) {
            $slug = $params['slug'] ?? '';
            $stmt = $this->pdo()->prepare('SELECT * FROM properties WHERE slug = ? LIMIT 1');
            $stmt->execute([$slug]);
            $row = $stmt->fetch();
            if (!$row) {
                Response::error('Propiedad no encontrada', 404);
                return;
            }
            Response::json($this->normalizeProperty($row));
        });
    }

    private function normalizeProperty(array $row): array
    {
        $jsonFields = ['imagenes', 'actividades', 'videos', 'servicioImagenes', 'redesSociales', 'coordenadas'];
        foreach ($jsonFields as $f) {
            if (isset($row[$f]) && is_string($row[$f])) {
                $decoded = json_decode($row[$f], true);
                $row[$f] = $decoded === null ? $row[$f] : $decoded;
            }
        }
        foreach (['precioNoche', 'calificacion', 'estrellas'] as $n) {
            if (isset($row[$n]) && is_numeric($row[$n])) $row[$n] = 0 + $row[$n];
        }
        foreach (['admiteMascotas', 'seguroDisponible', 'tieneWifi', 'tieneCocina', 'tieneParqueadero'] as $b) {
            if (isset($row[$b])) $row[$b] = (bool) $row[$b];
        }
        // El frontend espera "images" (relación Prisma); en PHP viene como "imagenes" (JSON)
        if (!isset($row['images']) && isset($row['imagenes'])) {
            $imgs = is_array($row['imagenes']) ? $row['imagenes'] : [];
            $row['images'] = array_map(function ($img, $i) {
                if (is_string($img)) return ['id' => (string)$i, 'url' => $img, 'esPrincipal' => $i === 0, 'orden' => $i];
                if (is_array($img)) return array_merge(['id' => (string)$i, 'esPrincipal' => $i === 0, 'orden' => $i], $img);
                return ['id' => (string)$i, 'url' => '', 'esPrincipal' => $i === 0, 'orden' => $i];
            }, $imgs, array_keys($imgs));
        }
        if (!isset($row['images'])) $row['images'] = [];
        return $row;
    }

    // ---------- Ads ----------
    public function getAdsByPlacement(): void
    {
        $this->safe(function () {
            $placement = trim((string) $this->query('placement', ''));
            try {
                $stmt = $this->pdo()->prepare(
                    'SELECT * FROM advertisements WHERE placement = ? AND activo = 1 ORDER BY prioridad DESC, created_at DESC'
                );
                $stmt->execute([$placement]);
                $rows = $stmt->fetchAll();
                Response::json(['items' => $rows, 'ads' => $rows]);
            } catch (Throwable $e) {
                Response::json(['items' => [], 'ads' => []]);
            }
        });
    }

    // ---------- Search ----------
    public function search(): void
    {
        $this->safe(function () {
            $body = $this->body();
            $q = trim((string) ($body['query'] ?? ''));
            if ($q === '') {
                Response::json(['results' => [], 'message' => 'Escribe qué buscas.']);
                return;
            }
            try {
                $like = '%' . $q . '%';
                $stmt = $this->pdo()->prepare(
                    'SELECT * FROM properties WHERE estado = "PUBLICADO" AND (nombre LIKE ? OR descripcion LIKE ? OR ubicacion LIKE ? OR ciudad LIKE ? OR tipo LIKE ?) ORDER BY calificacion DESC LIMIT 20'
                );
                $stmt->execute([$like, $like, $like, $like, $like]);
                $items = array_map([$this, 'normalizeProperty'], $stmt->fetchAll());
                Response::json([
                    'results' => $items,
                    'items' => $items,
                    'message' => count($items) ? null : 'No encontré propiedades con esa búsqueda.',
                ]);
            } catch (Throwable $e) {
                Response::json(['results' => [], 'items' => [], 'message' => 'Búsqueda no disponible por ahora.']);
            }
        });
    }

    public function getTopRatedReviews(): void
    {
        $this->safe(function () {
            $limit = min(20, max(1, (int) $this->query('limit', 6)));
            try {
                $stmt = $this->pdo()->prepare(
                    'SELECT r.*, p.nombre AS propertyNombre, p.slug AS propertySlug FROM reviews r LEFT JOIN properties p ON p.id = r.property_id WHERE r.calificacion >= 4 ORDER BY r.calificacion DESC, r.created_at DESC LIMIT ?'
                );
                $stmt->bindValue(1, $limit, PDO::PARAM_INT);
                $stmt->execute();
                Response::json($stmt->fetchAll());
            } catch (Throwable $e) {
                Response::json([]);
            }
        });
    }

    // ---------- Donaciones ----------
    public function getDonacionProyectos(): void
    {
        $this->safe(function () {
            try {
                $stmt = $this->pdo()->query(
                    'SELECT p.*, (SELECT COALESCE(SUM(d.monto),0) FROM donaciones d WHERE d.proyecto_id = p.id AND d.estado = "APROBADA") AS recaudado, (SELECT COUNT(*) FROM donaciones d WHERE d.proyecto_id = p.id AND d.estado = "APROBADA") AS donantes FROM donacion_proyectos p WHERE p.activo = 1 ORDER BY p.created_at DESC'
                );
                $rows = $stmt->fetchAll();
                $rows = array_map(function ($r) {
                    if (isset($r['media']) && is_string($r['media'])) $r['media'] = json_decode($r['media'], true) ?: [];
                    $r['recaudado'] = 0 + ($r['recaudado'] ?? 0);
                    $r['donantes'] = (int) ($r['donantes'] ?? 0);
                    return $r;
                }, $rows);
                Response::json($rows);
            } catch (Throwable $e) {
                Response::json([]);
            }
        });
    }

    public function getDonacionProyectoBySlug(array $params): void
    {
        $this->safe(function () use ($params) {
            $slug = $params['slug'] ?? '';
            try {
                $stmt = $this->pdo()->prepare(
                    'SELECT p.*, (SELECT COALESCE(SUM(d.monto),0) FROM donaciones d WHERE d.proyecto_id = p.id AND d.estado = "APROBADA") AS recaudado, (SELECT COUNT(*) FROM donaciones d WHERE d.proyecto_id = p.id AND d.estado = "APROBADA") AS donantes FROM donacion_proyectos p WHERE p.slug = ? AND p.activo = 1 LIMIT 1'
                );
                $stmt->execute([$slug]);
                $row = $stmt->fetch();
                if (!$row) { Response::error('Proyecto no encontrado', 404); return; }
                if (isset($row['media']) && is_string($row['media'])) $row['media'] = json_decode($row['media'], true) ?: [];
                $row['recaudado'] = 0 + ($row['recaudado'] ?? 0);
                $row['donantes'] = (int) ($row['donantes'] ?? 0);
                Response::json($row);
            } catch (Throwable $e) {
                Response::error('Proyecto no encontrado', 404);
            }
        });
    }

    public function getPaypalPublic(): void
    {
        $pp = $this->config['paypal'] ?? [];
        Response::json([
            'clientId' => $pp['client_id'] ?? '',
            'currency' => $pp['currency'] ?? 'USD',
            'mode' => $pp['mode'] ?? 'sandbox',
        ]);
    }

    public function createDonacionOrden(): void
    {
        $this->safe(function () {
            $body = $this->body();
            $proyectoId = trim((string) ($body['proyectoId'] ?? ''));
            $monto = (float) ($body['monto'] ?? 0);
            $nombre = trim((string) ($body['nombre'] ?? ''));
            $email = trim((string) ($body['email'] ?? ''));
            $mensaje = trim((string) ($body['mensaje'] ?? ''));

            if ($proyectoId === '' || $monto <= 0) {
                Response::error('Datos de donación inválidos', 400);
                return;
            }

            $pp = $this->config['paypal'] ?? [];
            if (empty($pp['client_id']) || empty($pp['client_secret'])) {
                Response::error('PayPal no está configurado en el servidor', 503);
                return;
            }

            $currency = $pp['currency'] ?? 'USD';
            $accessToken = $this->paypalAccessToken();
            $base = ($pp['mode'] ?? 'sandbox') === 'live'
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com';

            $orderPayload = [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'amount' => [
                        'currency_code' => $currency,
                        'value' => number_format($monto, 2, '.', ''),
                    ],
                    'description' => 'Donación Tropical Biohostel',
                ]],
            ];

            $ch = curl_init($base . '/v2/checkout/orders');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $accessToken,
                ],
                CURLOPT_POSTFIELDS => json_encode($orderPayload),
            ]);
            $res = curl_exec($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            $order = json_decode($res ?: '{}', true);
            if ($status < 200 || $status >= 300 || empty($order['id'])) {
                Response::error('No se pudo crear la orden PayPal', 502, ['detail' => $order]);
                return;
            }

            // Guardar donación pendiente
            try {
                $stmt = $this->pdo()->prepare(
                    'INSERT INTO donaciones (id, proyecto_id, monto, moneda, nombre, email, mensaje, estado, paypal_order_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, "PENDIENTE", ?, NOW())'
                );
                $id = $this->uuid();
                $stmt->execute([$id, $proyectoId, $monto, $currency, $nombre ?: null, $email ?: null, $mensaje ?: null, $order['id']]);
            } catch (Throwable $e) {
                // Si la tabla no existe, igual devolver orderId para no bloquear prueba
            }

            Response::json(['orderId' => $order['id']]);
        });
    }

    public function capturarDonacion(): void
    {
        $this->safe(function () {
            $body = $this->body();
            $orderId = trim((string) ($body['orderId'] ?? ''));
            if ($orderId === '') { Response::error('orderId requerido', 400); return; }

            $pp = $this->config['paypal'] ?? [];
            if (empty($pp['client_id']) || empty($pp['client_secret'])) {
                Response::error('PayPal no está configurado en el servidor', 503);
                return;
            }

            $accessToken = $this->paypalAccessToken();
            $base = ($pp['mode'] ?? 'sandbox') === 'live'
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com';

            $ch = curl_init($base . '/v2/checkout/orders/' . rawurlencode($orderId) . '/capture');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $accessToken,
                ],
                CURLOPT_POSTFIELDS => '{}',
            ]);
            $res = curl_exec($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            $capture = json_decode($res ?: '{}', true);
            $ok = $status >= 200 && $status < 300 && (($capture['status'] ?? '') === 'COMPLETED');

            if ($ok) {
                try {
                    $stmt = $this->pdo()->prepare('UPDATE donaciones SET estado = "APROBADA", paypal_capture = ?, updated_at = NOW() WHERE paypal_order_id = ?');
                    $stmt->execute([json_encode($capture, JSON_UNESCAPED_UNICODE), $orderId]);
                } catch (Throwable $e) {
                    // tabla ausente: ignorar
                }
                Response::json(['ok' => true, 'status' => 'COMPLETED']);
                return;
            }

            try {
                $stmt = $this->pdo()->prepare('UPDATE donaciones SET estado = "RECHAZADA", paypal_capture = ?, updated_at = NOW() WHERE paypal_order_id = ?');
                $stmt->execute([json_encode($capture, JSON_UNESCAPED_UNICODE), $orderId]);
            } catch (Throwable $e) {}
            Response::error('No se pudo confirmar el pago', 502, ['detail' => $capture]);
        });
    }

    private function paypalAccessToken(): string
    {
        $pp = $this->config['paypal'] ?? [];
        $base = ($pp['mode'] ?? 'sandbox') === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
        $ch = curl_init($base . '/v1/oauth2/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_USERPWD => ($pp['client_id'] ?? '') . ':' . ($pp['client_secret'] ?? ''),
            CURLOPT_POSTFIELDS => 'grant_type=client_credentials',
            CURLOPT_HTTPHEADER => ['Accept: application/json', 'Accept-Language: en_US'],
        ]);
        $res = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $data = json_decode($res ?: '{}', true);
        if ($status < 200 || $status >= 300 || empty($data['access_token'])) {
            throw new RuntimeException('No se pudo autenticar con PayPal');
        }
        return $data['access_token'];
    }

    private function uuid(): string
    {
        $d = random_bytes(16);
        $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
        $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
    }

    // ---------- Auth básico ----------
    private function bearerToken(): string
    {
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(.+)/i', $h, $m)) return trim($m[1]);
        return '';
    }

    private function isAdmin(): bool
    {
        $token = $this->bearerToken();
        $expected = (string) ($this->config['admin_token'] ?? '');
        return $expected !== '' && hash_equals($expected, $token);
    }

    private function requireAdmin(): void
    {
        if (!$this->isAdmin()) {
            Response::error('No autorizado', 401);
        }
    }

    public function authSignin(): void
    {
        $this->safe(function () {
            $body = $this->body();
            $email = trim((string) ($body['email'] ?? ''));
            $password = (string) ($body['password'] ?? '');
            $adminEmail = (string) ($this->config['admin_email'] ?? '');
            $adminPassword = (string) ($this->config['admin_password'] ?? '');
            $adminToken = (string) ($this->config['admin_token'] ?? '');

            if ($adminEmail === '' || $adminPassword === '' || $adminToken === '') {
                Response::error('Auth admin no configurado en el servidor', 503);
                return;
            }
            if (!hash_equals($adminEmail, $email) || !hash_equals($adminPassword, $password)) {
                Response::error('Credenciales inválidas', 401);
                return;
            }

            Response::json([
                'token' => $adminToken,
                'user' => [
                    'id' => 'admin',
                    'email' => $adminEmail,
                    'nombre' => $this->config['admin_name'] ?? 'Administrador',
                    'role' => 'admin',
                ],
            ]);
        });
    }

    public function authMe(): void
    {
        $this->safe(function () {
            if ($this->isAdmin()) {
                Response::json([
                    'id' => 'admin',
                    'email' => (string) ($this->config['admin_email'] ?? 'admin@tropicalbiohostel.com'),
                    'nombre' => $this->config['admin_name'] ?? 'Administrador',
                    'role' => 'admin',
                ]);
                return;
            }
            Response::error('No autenticado', 401);
        });
    }

    // ---------- Reservas ----------
    private function normalizeReserva(array $row): array
    {
        if (isset($row['total']) && is_numeric($row['total'])) $row['total'] = 0 + $row['total'];
        if (isset($row['huespedes'])) $row['huespedes'] = (int) $row['huespedes'];
        // map snake_case DB -> camelCase API
        $map = [
            'propiedad_id' => 'propiedadId',
            'user_id' => 'userId',
            'fecha_llegada' => 'fechaLlegada',
            'fecha_salida' => 'fechaSalida',
            'metodo_pago' => 'metodoPago',
            'created_at' => 'createdAt',
            'updated_at' => 'updatedAt',
        ];
        foreach ($map as $from => $to) {
            if (array_key_exists($from, $row) && !array_key_exists($to, $row)) {
                $row[$to] = $row[$from];
            }
        }
        // propiedad objeto para admin
        if (!isset($row['propiedad'])) {
            $row['propiedad'] = [
                'id' => $row['propiedadId'] ?? $row['propiedad_id'] ?? null,
                'nombre' => $row['propiedadNombre'] ?? $row['propiedad_nombre'] ?? 'Propiedad',
            ];
        }
        return $row;
    }

    public function createReserva(): void
    {
        $this->safe(function () {
            $body = $this->body();
            $propiedadId = trim((string) ($body['propiedadId'] ?? ''));
            $nombre = trim((string) ($body['nombre'] ?? ''));
            $email = trim((string) ($body['email'] ?? ''));
            $telefono = trim((string) ($body['telefono'] ?? ''));
            $identificacion = trim((string) ($body['identificacion'] ?? ''));
            $fechaLlegada = trim((string) ($body['fechaLlegada'] ?? ''));
            $fechaSalida = trim((string) ($body['fechaSalida'] ?? ''));
            $huespedes = max(1, (int) ($body['huespedes'] ?? 1));
            $metodoPago = strtoupper(trim((string) ($body['metodoPago'] ?? 'EFECTIVO')));
            $notas = trim((string) ($body['notas'] ?? ''));

            if ($propiedadId === '' || $nombre === '' || $email === '' || $telefono === '' || $identificacion === '' || $fechaLlegada === '' || $fechaSalida === '') {
                Response::error('Faltan campos obligatorios de la reserva', 400);
                return;
            }
            if (!in_array($metodoPago, ['EFECTIVO', 'TARJETA'], true)) $metodoPago = 'EFECTIVO';
            if ($fechaSalida <= $fechaLlegada) {
                Response::error('La fecha de salida debe ser posterior a la llegada', 400);
                return;
            }

            // Validar propiedad existe
            $pStmt = $this->pdo()->prepare('SELECT id, nombre, precioNoche, capacidadMaxima, estado FROM properties WHERE id = ? LIMIT 1');
            $pStmt->execute([$propiedadId]);
            $prop = $pStmt->fetch();
            if (!$prop) { Response::error('Propiedad no encontrada', 404); return; }
            if (($prop['estado'] ?? '') !== 'PUBLICADO') { Response::error('La propiedad no está disponible', 400); return; }
            if ($huespedes > (int) ($prop['capacidadMaxima'] ?? 99)) {
                Response::error('La cantidad de huéspedes supera la capacidad', 400);
                return;
            }

            // Verificar conflicto de fechas
            $cStmt = $this->pdo()->prepare(
                'SELECT id, fecha_llegada, fecha_salida, estado FROM reservas WHERE propiedad_id = ? AND estado IN ("PENDIENTE","CONFIRMADA") AND NOT (fecha_salida <= ? OR fecha_llegada >= ?) LIMIT 1'
            );
            $cStmt->execute([$propiedadId, $fechaLlegada, $fechaSalida]);
            $conf = $cStmt->fetch();
            if ($conf) {
                Response::error('Esas fechas ya están ocupadas. Elige otras fechas.', 409, [
                    'conflicto' => [
                        'desde' => $conf['fecha_llegada'],
                        'hasta' => $conf['fecha_salida'],
                        'fuente' => 'TROPICAL BIOHOSTEL',
                    ],
                ]);
                return;
            }

            $id = $this->uuid();
            $stmt = $this->pdo()->prepare(
                'INSERT INTO reservas (id, propiedad_id, nombre, email, telefono, identificacion, fecha_llegada, fecha_salida, huespedes, metodo_pago, estado, notas, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "PENDIENTE", ?, NOW(), NOW())'
            );
            $stmt->execute([$id, $propiedadId, $nombre, $email, $telefono, $identificacion, $fechaLlegada, $fechaSalida, $huespedes, $metodoPago, $notas ?: null]);

            $row = $this->pdo()->prepare('SELECT r.*, p.nombre AS propiedadNombre FROM reservas r LEFT JOIN properties p ON p.id = r.propiedad_id WHERE r.id = ? LIMIT 1');
            $row->execute([$id]);
            $reserva = $row->fetch();
            Response::json($this->normalizeReserva($reserva ?: ['id' => $id]), 201);
        });
    }

    public function getReservas(): void
    {
        $this->safe(function () {
            $this->requireAdmin();
            $stmt = $this->pdo()->query(
                'SELECT r.*, p.nombre AS propiedadNombre FROM reservas r LEFT JOIN properties p ON p.id = r.propiedad_id ORDER BY r.created_at DESC LIMIT 500'
            );
            $rows = array_map([$this, 'normalizeReserva'], $stmt->fetchAll());
            Response::json($rows);
        });
    }

    public function getReservaById(array $params): void
    {
        $this->safe(function () use ($params) {
            $this->requireAdmin();
            $id = $params['id'] ?? '';
            $stmt = $this->pdo()->prepare('SELECT r.*, p.nombre AS propiedadNombre FROM reservas r LEFT JOIN properties p ON p.id = r.propiedad_id WHERE r.id = ? LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) { Response::error('Reserva no encontrada', 404); return; }
            Response::json($this->normalizeReserva($row));
        });
    }

    public function cancelarReserva(array $params): void
    {
        $this->safe(function () use ($params) {
            $id = $params['id'] ?? '';
            $stmt = $this->pdo()->prepare('UPDATE reservas SET estado = "CANCELADA", updated_at = NOW() WHERE id = ?');
            $stmt->execute([$id]);
            Response::json(['ok' => true, 'id' => $id, 'estado' => 'CANCELADA']);
        });
    }

    public function noShowReserva(array $params): void
    {
        $this->safe(function () use ($params) {
            $this->requireAdmin();
            $id = $params['id'] ?? '';
            $stmt = $this->pdo()->prepare('UPDATE reservas SET estado = "NO_SHOW", updated_at = NOW() WHERE id = ?');
            $stmt->execute([$id]);
            Response::json(['ok' => true, 'id' => $id, 'estado' => 'NO_SHOW']);
        });
    }

    public function getPropertyAvailability(array $params): void
    {
        $this->safe(function () use ($params) {
            $slug = $params['slug'] ?? '';
            $desde = trim((string) ($_GET['desde'] ?? ''));
            $hasta = trim((string) ($_GET['hasta'] ?? ''));
            if ($desde === '' || $hasta === '') {
                Response::json(['disponible' => true, 'conflictos' => []]);
                return;
            }
            $pStmt = $this->pdo()->prepare('SELECT id FROM properties WHERE slug = ? LIMIT 1');
            $pStmt->execute([$slug]);
            $prop = $pStmt->fetch();
            if (!$prop) { Response::json(['disponible' => true, 'conflictos' => []]); return; }

            $stmt = $this->pdo()->prepare(
                'SELECT fecha_llegada, fecha_salida, estado FROM reservas WHERE propiedad_id = ? AND estado IN ("PENDIENTE","CONFIRMADA") AND NOT (fecha_salida <= ? OR fecha_llegada >= ?) ORDER BY fecha_llegada ASC'
            );
            $stmt->execute([$prop['id'], $desde, $hasta]);
            $conflictos = $stmt->fetchAll();
            $conflicto = null;
            if (count($conflictos) > 0) {
                $c = $conflictos[0];
                $conflicto = [
                    'desde' => $c['fecha_llegada'],
                    'hasta' => $c['fecha_salida'],
                    'fuente' => 'TROPICAL BIOHOSTEL',
                ];
            }
            Response::json([
                'disponible' => count($conflictos) === 0,
                'conflictos' => $conflictos,
                'conflictoCon' => $conflicto,
            ]);
        });
    }

    public function getPropertyReviews(array $params): void
    {
        $this->safe(function () use ($params) {
            $slug = $params['slug'] ?? '';
            try {
                $pStmt = $this->pdo()->prepare('SELECT id FROM properties WHERE slug = ? LIMIT 1');
                $pStmt->execute([$slug]);
                $prop = $pStmt->fetch();
                if (!$prop) { Response::json([]); return; }
                $stmt = $this->pdo()->prepare('SELECT id, autorNombre, calificacion, comentario, createdAt, created_at FROM reviews WHERE property_id = ? ORDER BY created_at DESC LIMIT 50');
                $stmt->execute([$prop['id']]);
                $rows = $stmt->fetchAll();
                $rows = array_map(function ($r) {
                    if (!isset($r['createdAt']) && isset($r['created_at'])) $r['createdAt'] = $r['created_at'];
                    $r['calificacion'] = (int) ($r['calificacion'] ?? 0);
                    return $r;
                }, $rows);
                Response::json($rows);
            } catch (Throwable $e) {
                Response::json([]);
            }
        });
    }

    // ---------- Chat (Nati básico) ----------
    public function chatSaludo(): void
    {
        Response::json([
            'reply' => "¡Hola! Soy Nati 🪷, tu anfitriona en Tropical Biohostel. En este momento estoy en modo básico, pero puedo orientarte. ¿Quieres información sobre hospedaje, experiencias, donaciones o reservas?",
            'sugerencias' => ['Hospedaje', 'Experiencias', 'Donar', 'Reservar por WhatsApp'],
        ]);
    }

    public function chatMensaje(): void
    {
        $this->safe(function () {
            $body = $this->body();
            $msgRaw = trim((string) ($body['mensaje'] ?? ''));
            $msg = mb_strtolower($msgRaw);
            $sessionId = trim((string) ($body['sessionId'] ?? ''));
            if ($sessionId === '') $sessionId = $this->uuid();

            $reply = "Gracias por escribirnos. Puedo ayudarte con información general del Tropical Biohostel. Para atención personalizada, escríbenos por WhatsApp al +57 320 907 9174 o al correo reservas@tropicalbiohostel.com.";
            $sugerencias = ['Hospedaje', 'Experiencias', 'Donar', 'Contacto'];
            $propiedades = [];

            $buscarProps = function (string $tipo = '', string $q = '', int $limit = 4): array {
                try {
                    $where = ['estado = "PUBLICADO"'];
                    $params = [];
                    if ($tipo !== '') { $where[] = 'tipo = ?'; $params[] = $tipo; }
                    if ($q !== '') {
                        $like = '%' . $q . '%';
                        $where[] = '(nombre LIKE ? OR descripcion LIKE ? OR ubicacion LIKE ? OR ciudad LIKE ? OR actividades LIKE ?)';
                        array_push($params, $like, $like, $like, $like, $like);
                    }
                    $sql = 'SELECT * FROM properties WHERE ' . implode(' AND ', $where) . ' ORDER BY calificacion DESC, created_at DESC LIMIT ?';
                    $stmt = $this->pdo()->prepare($sql);
                    $i = 1;
                    foreach ($params as $p) { $stmt->bindValue($i++, $p); }
                    $stmt->bindValue($i, $limit, PDO::PARAM_INT);
                    $stmt->execute();
                    return array_map([$this, 'normalizeProperty'], $stmt->fetchAll());
                } catch (Throwable $e) { return []; }
            };

            if ($msg !== '') {
                if (preg_match('/reserv|disponib|fecha|llegad|salid/', $msg)) {
                    $reply = "Para reservas y disponibilidad, escríbenos a reservas@tropicalbiohostel.com o por WhatsApp al +57 320 907 9174. Con gusto te confirmamos fechas y opciones. También puedes abrir una propiedad y usar el botón Reservar.";
                    $sugerencias = ['Ver hospedaje', 'Experiencias', 'Contacto'];
                    $propiedades = $buscarProps('', '', 3);
                } elseif (preg_match('/don|arbol|siembra|carbono/', $msg)) {
                    $reply = "Puedes apoyar nuestros proyectos de siembra y carbono en la sección Donar 🌱. Si necesitas ayuda, escríbenos a hola@tropicalbiohostel.com.";
                    $sugerencias = ['Ver donaciones', 'Siembra un árbol', 'Contacto'];
                } elseif (preg_match('/hosped|caba|glamping|cosmic|bungal|habitaci|dormir|aloj/', $msg)) {
                    $propiedades = $buscarProps('', '', 4);
                    // priorizar tipos de hospedaje
                    $hosp = array_values(array_filter($propiedades, fn($p) => in_array($p['tipo'] ?? '', ['glamping','hotel','hostal','centro_turistico','finca'])));
                    if ($hosp) $propiedades = $hosp;
                    $reply = $propiedades
                        ? "Estas son algunas opciones de hospedaje que tenemos en Tropical Biohostel 🌿. Toca una para ver detalles y reservar."
                        : "Tenemos opciones de hospedaje como Cosmic Bungalow, Cabaña de la Luna y Glamping. Escríbenos por WhatsApp al +57 320 907 9174 y te ayudamos a elegir.";
                    $sugerencias = ['Reservar por WhatsApp', 'Experiencias', 'Donar'];
                } elseif (preg_match('/experienc|actividad|tour|cafe|ruta|sender|naturalez/', $msg)) {
                    $propiedades = $buscarProps('actividad', '', 4);
                    $reply = $propiedades
                        ? "Mira estas experiencias y actividades disponibles 🌿."
                        : "Tenemos experiencias de naturaleza, café, bienestar y territorio. Puedes explorarlas en la sección Experiencias o escribirnos por WhatsApp.";
                    $sugerencias = ['Ver hospedaje', 'Reservar por WhatsApp', 'Donar'];
                } elseif (preg_match('/contact|whatsapp|correo|email|telefono|llamar/', $msg)) {
                    $reply = "Puedes contactarnos por WhatsApp al +57 320 907 9174, por reservas@tropicalbiohostel.com, hola@tropicalbiohostel.com o luna@tropicalbiohostel.com.";
                    $sugerencias = ['Reservar por WhatsApp', 'Ver hospedaje', 'Donar'];
                } elseif (preg_match('/hola|buen|gracias|hey/', $msg)) {
                    $reply = "¡Hola! 🌿 Soy Nati. Con gusto te oriento. ¿Te interesa hospedaje, experiencias, donaciones o reservas?";
                    $sugerencias = ['Hospedaje', 'Experiencias', 'Donar', 'Reservar por WhatsApp'];
                } else {
                    // búsqueda libre en propiedades
                    $propiedades = $buscarProps('', $msgRaw, 4);
                    if ($propiedades) {
                        $reply = "Encontré estas opciones relacionadas con tu búsqueda:";
                        $sugerencias = ['Ver hospedaje', 'Experiencias', 'Reservar por WhatsApp'];
                    }
                }
            }

            Response::json([
                'reply' => $reply,
                'sessionId' => $sessionId,
                'propiedades' => $propiedades,
                'ubicacion' => null,
                'sugerencias' => $sugerencias,
            ]);
        });
    }

    // ---------- Zemisqua / Buscador Ancestral ----------
    public function getBusquedaOpciones(): void
    {
        $this->safe(function () {
            try {
                $pdo = $this->pdo();
                $tipos = $pdo->query("SELECT tipo, COUNT(*) AS total FROM properties WHERE estado='PUBLICADO' GROUP BY tipo ORDER BY total DESC")->fetchAll();
                $tipos = array_map(fn($r) => ['tipo' => $r['tipo'], 'total' => (int)$r['total']], $tipos);
                $precios = $pdo->query("SELECT MIN(precioNoche) AS mn, MAX(precioNoche) AS mx FROM properties WHERE estado='PUBLICADO'")->fetch();
                $rows = $pdo->query("SELECT actividades FROM properties WHERE estado='PUBLICADO'")->fetchAll();
                $cuentaActs = [];
                foreach ($rows as $r) {
                    $acts = json_decode($r['actividades'] ?? '[]', true);
                    if (!is_array($acts)) continue;
                    foreach ($acts as $a) { $k = (string)$a; $cuentaActs[$k] = ($cuentaActs[$k] ?? 0) + 1; }
                }
                arsort($cuentaActs);
                $actividades = [];
                foreach (array_slice($cuentaActs, 0, 14, true) as $a => $t) $actividades[] = ['actividad' => $a, 'total' => $t];
                Response::json([
                    'tipos' => $tipos,
                    'precioMin' => (float)($precios['mn'] ?? 0),
                    'precioMax' => (float)($precios['mx'] ?? 0),
                    'actividades' => $actividades,
                    'total' => array_sum(array_column($tipos, 'total')),
                ]);
            } catch (Throwable $e) {
                Response::json(['tipos' => [], 'precioMin' => 0, 'precioMax' => 0, 'actividades' => [], 'total' => 0]);
            }
        });
    }

    public function busquedaAncestral(): void
    {
        $this->safe(function () {
            $b = $this->body();
            $adultos = max(1, min(30, (int)($b['adultos'] ?? 2)));
            $ninos = max(0, min(20, (int)($b['ninos'] ?? 0)));
            $llevaMascotas = (bool)($b['llevaMascotas'] ?? false);
            $habitacionesMin = max(0, min(20, (int)($b['habitacionesMin'] ?? 0)));
            $banosMin = max(0, min(10, (int)($b['banosMin'] ?? 0)));
            $tipo = trim((string)($b['tipo'] ?? ''));
            $presupuestoMax = isset($b['presupuestoMax']) && is_numeric($b['presupuestoMax']) ? (float)$b['presupuestoMax'] : null;
            $planes = is_array($b['planes'] ?? null) ? $b['planes'] : [];
            $extras = is_array($b['extras'] ?? null) ? $b['extras'] : [];
            $textoLibre = mb_substr(trim((string)($b['textoLibre'] ?? '')), 0, 400);

            $viajeros = max(1, $adultos + $ninos);

            try {
                $where = ['estado = "PUBLICADO"'];
                $params = [];
                $where[] = 'capacidadMaxima >= ?'; $params[] = $viajeros;
                if ($tipo !== '') { $where[] = 'tipo = ?'; $params[] = $tipo; }
                if ($presupuestoMax) { $where[] = 'precioNoche <= ?'; $params[] = $presupuestoMax; }
                if ($habitacionesMin > 0) { $where[] = 'numeroHabitaciones >= ?'; $params[] = $habitacionesMin; }
                if ($llevaMascotas) { $where[] = 'admiteMascotas = 1'; }
                $sql = 'SELECT * FROM properties WHERE ' . implode(' AND ', $where) . ' LIMIT 30';
                $stmt = $this->pdo()->prepare($sql);
                $stmt->execute($params);
                $candidates = array_map([$this, 'normalizeProperty'], $stmt->fetchAll());
            } catch (Throwable $e) {
                $candidates = [];
            }

            $PLANES = [
                'descanso'   => ['actividades' => ['lectura','meditación','yoga','spa'], 'keywords' => ['tranquilo'], 'label' => 'descanso'],
                'aventura'   => ['actividades' => ['canopy','rappel','senderismo','natación'], 'keywords' => ['aventura'], 'label' => 'aventura'],
                'romance'    => ['actividades' => ['spa'], 'keywords' => ['romantico'], 'label' => 'romance'],
                'familia'    => ['actividades' => ['natación'], 'keywords' => ['familiar'], 'label' => 'familia'],
                'naturaleza' => ['actividades' => ['senderismo','avistamiento de aves'], 'keywords' => ['bosque','ecologica'], 'label' => 'naturaleza'],
                'cafe'       => ['actividades' => ['gastronomía rural','permacultura'], 'keywords' => ['cafetal'], 'label' => 'cultura cafetera'],
            ];
            $EXTRAS = [
                'piscina'     => ['field' => null, 'actividades' => ['natación'], 'keywords' => ['piscina'], 'label' => 'piscina'],
                'wifi'        => ['field' => 'tieneWifi', 'actividades' => [], 'keywords' => [], 'label' => 'wifi'],
                'cocina'      => ['field' => 'tieneCocina', 'actividades' => [], 'keywords' => [], 'label' => 'cocina equipada'],
                'parqueadero' => ['field' => 'tieneParqueadero', 'actividades' => [], 'keywords' => [], 'label' => 'parqueadero'],
                'desayuno'    => ['field' => null, 'actividades' => [], 'keywords' => ['desayuno'], 'label' => 'desayuno incluido'],
                'chimenea'    => ['field' => null, 'actividades' => [], 'keywords' => ['chimenea'], 'label' => 'chimenea'],
                'jacuzzi'     => ['field' => null, 'actividades' => ['spa'], 'keywords' => ['jacuzzi'], 'label' => 'jacuzzi'],
                'vista'       => ['field' => null, 'actividades' => [], 'keywords' => ['vista'], 'label' => 'vista panorámica'],
                'seguro'      => ['field' => 'seguroDisponible', 'actividades' => [], 'keywords' => [], 'label' => 'seguro de viaje'],
            ];

            $wantedActs = []; $wantedKw = [];
            foreach ($planes as $pl) {
                $p = $PLANES[$pl] ?? null; if (!$p) continue;
                foreach ($p['actividades'] as $a) $wantedActs[$this->norm($a)] = $a;
                foreach ($p['keywords'] as $k) $wantedKw[$this->norm($k)] = $k;
            }
            if ($ninos > 0) $wantedKw['familiar'] = 'familiar';
            $wantedFields = [];
            foreach ($extras as $ex) {
                $e = $EXTRAS[$ex] ?? null; if (!$e) continue;
                foreach ($e['actividades'] as $a) $wantedActs[$this->norm($a)] = $a;
                foreach ($e['keywords'] as $k) $wantedKw[$this->norm($k)] = $k;
                if ($e['field']) $wantedFields[] = ['field' => $e['field'], 'label' => $e['label']];
            }

            $results = [];
            foreach ($candidates as $prop) {
                $score = 30; $motivos = [];
                $cap = (int)($prop['capacidadMaxima'] ?? 0);
                if ($cap === $viajeros) { $score += 8; $motivos[] = "Capacidad exacta para $viajeros " . ($viajeros === 1 ? 'persona' : 'personas'); }
                elseif ($cap <= $viajeros + 2) { $score += 5; $motivos[] = "Espacio ideal para tu grupo de $viajeros"; }

                if ($habitacionesMin > 0 && (int)($prop['numeroHabitaciones'] ?? 0) >= $habitacionesMin) { $score += 5; $motivos[] = 'Tiene ' . $prop['numeroHabitaciones'] . ' habitaciones'; }
                if ($banosMin > 0) { $score += 5; $motivos[] = 'Tiene baño disponible'; }
                if ($llevaMascotas && !empty($prop['admiteMascotas'])) { $score += 4; $motivos[] = 'Acepta mascotas'; }
                if ($ninos > 0 && $this->matchesAnyKeyword($prop, ['familiar'])) { $score += 6; $motivos[] = 'Ambiente familiar, apto para niños'; }

                $propActs = is_array($prop['actividades'] ?? null) ? $prop['actividades'] : [];
                $matchedActs = [];
                foreach ($wantedActs as $na => $orig) {
                    foreach ($propActs as $pa) { if ($this->norm((string)$pa) === $na) { $matchedActs[] = $orig; break; } }
                }
                if ($matchedActs) { $score += min(20, count($matchedActs) * 4); $motivos[] = 'Actividades: ' . implode(', ', array_slice($matchedActs, 0, 4)); }

                $matchedKw = [];
                foreach ($wantedKw as $nk => $orig) { if ($this->matchesAnyKeyword($prop, [$orig])) $matchedKw[] = $orig; }
                if ($matchedKw) { $score += min(20, count($matchedKw) * 4); $motivos[] = 'Es ' . implode(', ', $matchedKw); }

                foreach ($wantedFields as $f) { if (!empty($prop[$f['field']])) { $score += 5; $motivos[] = 'Cuenta con ' . $f['label']; } }

                // reputación simple (calificacion en propiedad)
                $rating = (float)($prop['calificacion'] ?? 0);
                $totalReviews = 0;
                try {
                    $rs = $this->pdo()->prepare('SELECT AVG(calificacion) AS avg_r, COUNT(*) AS cnt FROM reviews WHERE property_id = ?');
                    $rs->execute([$prop['id']]);
                    $rr = $rs->fetch();
                    if ($rr && (int)$rr['cnt'] > 0) { $rating = round((float)$rr['avg_r'], 1); $totalReviews = (int)$rr['cnt']; }
                } catch (Throwable $e) {}
                if ($rating >= 4.5) { $score += 8; $motivos[] = "Calificación excelente ($rating/5)"; }
                elseif ($rating >= 4) { $score += 5; $motivos[] = "Bien calificado ($rating/5)"; }

                if ($presupuestoMax && (float)$prop['precioNoche'] <= $presupuestoMax * 0.7) { $score += 3; $motivos[] = 'Precio por debajo de tu presupuesto'; }

                // bonus texto libre
                if ($textoLibre !== '') {
                    $terms = array_values(array_filter(preg_split('/[^a-z0-9]+/u', $this->norm($textoLibre)), fn($w) => mb_strlen($w) > 3));
                    $terms = array_slice($terms, 0, 10);
                    $hay = [];
                    foreach ($terms as $t) { if ($this->matchesAnyKeyword($prop, [$t])) $hay[] = $t; }
                    if ($hay) { $score += min(12, count($hay) * 4); $motivos[] = 'Coincide con tu descripción: ' . implode(', ', array_slice($hay, 0, 3)); }
                }

                $results[] = [
                    'propiedad' => $prop,
                    'compatibilidad' => min(100, (int)round($score)),
                    'motivos' => array_slice(array_values(array_unique($motivos)), 0, 6),
                    'ratingPromedio' => $rating,
                    'totalReviews' => $totalReviews,
                ];
            }

            usort($results, fn($a,$b) => $b['compatibilidad'] <=> $a['compatibilidad']);
            $out = array_slice($results, 0, 12);
            $top = $out[0] ?? null;
            $mensaje = null;
            if ($textoLibre !== '') {
                $mensaje = $top
                    ? 'Según tu descripción, ' . $top['propiedad']['nombre'] . ' es lo que mejor encaja (' . $top['compatibilidad'] . '% de compatibilidad).'
                    : 'Con esa descripción no encontré coincidencias; prueba con menos filtros.';
            }
            Response::json(['total' => count($results), 'results' => $out, 'mensaje' => $mensaje, 'fuentes' => []]);
        });
    }

    private function norm(string $s): string
    {
        $s = mb_strtolower($s);
        $s = strtr($s, ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n']);
        return trim(preg_replace('/\s+/', ' ', $s));
    }

    private function matchesAnyKeyword(array $prop, array $keywords): bool
    {
        $text = $this->norm(($prop['nombre'] ?? '') . ' ' . ($prop['descripcion'] ?? '') . ' ' . ($prop['ubicacion'] ?? '') . ' ' . ($prop['ciudad'] ?? ''));
        foreach ($keywords as $kw) {
            $k = $this->norm((string)$kw);
            if ($k !== '' && str_contains($text, $k)) return true;
        }
        return false;
    }
}
