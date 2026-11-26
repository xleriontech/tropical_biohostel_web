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

    private function ensureSiteConfigTable(): void
    {
        $this->pdo()->exec("CREATE TABLE IF NOT EXISTS site_config (
            config_key VARCHAR(100) PRIMARY KEY,
            value_json LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    private function setConfigValue(string $key, mixed $value): void
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        try {
            $stmt = $this->pdo()->prepare(
                'INSERT INTO site_config (config_key, value_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = CURRENT_TIMESTAMP'
            );
            $stmt->execute([$key, $json]);
        } catch (Throwable $e) {
            $this->ensureSiteConfigTable();
            $stmt = $this->pdo()->prepare(
                'INSERT INTO site_config (config_key, value_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = CURRENT_TIMESTAMP'
            );
            $stmt->execute([$key, $json]);
        }
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
                'access_token' => $adminToken,
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

    // ---------- Chat (Nati básico / IA opcional) ----------
    private function chatAiConfig(): array
    {
        $defaults = [
            'enabled' => false,
            'provider' => 'openai-compatible',
            'base_url' => 'https://api.openai.com/v1',
            'api_key' => '',
            'model' => 'gpt-4o-mini',
            'system_prompt' => 'Eres Nati, anfitriona virtual de Tropical Biohostel en Nocaima, Cundinamarca. Responde en español, cálida y clara. Ayuda con hospedaje, experiencias, reservas, donaciones y contacto. Si no sabes un dato exacto, dilo con honestidad y sugiere WhatsApp +57 320 907 9174 o reservas@tropicalbiohostel.com. No inventes precios ni disponibilidad.',
        ];
        $file = is_array($this->config['chat_ai'] ?? null) ? $this->config['chat_ai'] : [];
        $db = $this->getConfigValue('chatAi', []);
        if (!is_array($db)) $db = [];
        $merged = array_merge($defaults, $file, $db);
        // Si DB tiene enabled pero api_key vacío, conservar api_key de archivo
        if (empty($merged['api_key']) && !empty($file['api_key'])) $merged['api_key'] = $file['api_key'];
        return $merged;
    }

    private function chatAiEnabled(): bool
    {
        $c = $this->chatAiConfig();
        return !empty($c['enabled']) && !empty($c['api_key']);
    }

    private function chatPropertyContext(int $limit = 12): string
    {
        try {
            $stmt = $this->pdo()->prepare("SELECT nombre,tipo,slug,precioNoche,capacidadMaxima,ciudad,actividades,descripcion FROM properties WHERE estado='PUBLICADO' ORDER BY calificacion DESC, created_at DESC LIMIT ?");
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll();
            $lines = [];
            foreach ($rows as $r) {
                $acts = json_decode($r['actividades'] ?? '[]', true);
                $acts = is_array($acts) ? implode(', ', array_slice($acts, 0, 6)) : '';
                $desc = mb_substr(trim((string)($r['descripcion'] ?? '')), 0, 120);
                $lines[] = "- {$r['nombre']} ({$r['tipo']}, slug {$r['slug']}, $" . number_format((float)$r['precioNoche'],0,',','.') . "/noche o persona, cap {$r['capacidadMaxima']}, {$r['ciudad']}) actividades: {$acts}. {$desc}";
            }
            return $lines ? implode("\n", $lines) : "No hay propiedades publicadas en este momento.";
        } catch (Throwable $e) {
            return "No se pudo cargar el catálogo.";
        }
    }

    private function chatAiReply(string $msg, string $sessionId): ?array
    {
        if (!$this->chatAiEnabled()) return null;
        $c = $this->chatAiConfig();
        $baseUrl = rtrim((string)($c['base_url'] ?? 'https://api.openai.com/v1'), '/');
        $apiKey = (string)($c['api_key'] ?? '');
        $model = (string)($c['model'] ?? 'gpt-4o-mini');
        $system = (string)($c['system_prompt'] ?? 'Eres Nati, anfitriona virtual de Tropical Biohostel.');
        $catalog = $this->chatPropertyContext();

        $system .= "\n\nCatálogo actual de Tropical Biohostel:\n" . $catalog;
        $system .= "\n\nResponde en texto corto y útil. Si recomiendas opciones, menciona sus nombres exactos. Al final no incluyas JSON.";
        $system .= "\nContacto: WhatsApp +57 320 907 9174, reservas@tropicalbiohostel.com, hola@tropicalbiohostel.com, luna@tropicalbiohostel.com.";

        $payload = [
            'model' => $model,
            'temperature' => 0.4,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $msg],
            ],
        ];

        $ch = curl_init($baseUrl . '/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 8,
        ]);
        $raw = curl_exec($ch);
        $err = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($raw === false || $err || $status < 200 || $status >= 300) return null;

        $json = json_decode((string)$raw, true);
        $text = $json['choices'][0]['message']['content'] ?? null;
        if (!is_string($text) || trim($text) === '') return null;
        $text = trim($text);

        // sugerencias simples según contenido
        $sugerencias = ['Hospedaje', 'Experiencias', 'Donar', 'Reservar por WhatsApp'];
        $low = mb_strtolower($msg . ' ' . $text);
        if (preg_match('/reserv|disponib|fecha/', $low)) $sugerencias = ['Ver hospedaje', 'Experiencias', 'Contacto'];
        elseif (preg_match('/don|arbol|siembra/', $low)) $sugerencias = ['Ver donaciones', 'Hospedaje', 'Contacto'];

        // adjuntar propiedades si el mensaje parece pedirlas
        $propiedades = [];
        if (preg_match('/hosped|caba|glamping|cosmic|bungal|habitaci|dormir|aloj|experienc|actividad|tour|cafe|ruta|recomiend|opcion|que tienen|mostrar/', $low)) {
            $q = preg_match('/experienc|actividad|tour|ruta/', $low) ? '' : '';
            try { $propiedades = $this->buscarPropsForChat($msg, $low); } catch (Throwable $e) { $propiedades = []; }
        }

        return [
            'reply' => $text,
            'sessionId' => $sessionId,
            'propiedades' => $propiedades,
            'ubicacion' => null,
            'sugerencias' => $sugerencias,
        ];
    }

    private function buscarPropsForChat(string $msgRaw, string $low): array
    {
        $tipo = '';
        if (preg_match('/experienc|actividad|tour|ruta/', $low)) $tipo = 'actividad';
        $q = '';
        if (!preg_match('/^(hola|buenas|buenos dias|buen dia|hey|gracias)$/u', trim($low))) {
            $q = $msgRaw;
        }
        try {
            $where = ['estado = "PUBLICADO"'];
            $params = [];
            if ($tipo !== '') { $where[] = 'tipo = ?'; $params[] = $tipo; }
            if ($q !== '' && $tipo === '') {
                $like = '%' . $q . '%';
                $where[] = '(nombre LIKE ? OR descripcion LIKE ? OR ubicacion LIKE ? OR ciudad LIKE ? OR actividades LIKE ? OR tipo LIKE ?)';
                array_push($params, $like, $like, $like, $like, $like, $like);
            }
            $sql = 'SELECT * FROM properties WHERE ' . implode(' AND ', $where) . ' ORDER BY calificacion DESC, created_at DESC LIMIT 4';
            $stmt = $this->pdo()->prepare($sql);
            $stmt->execute($params);
            $rows = array_map([$this, 'normalizeProperty'], $stmt->fetchAll());
            if (!$rows && $tipo === '') {
                $stmt2 = $this->pdo()->prepare("SELECT * FROM properties WHERE estado='PUBLICADO' ORDER BY calificacion DESC, created_at DESC LIMIT 4");
                $stmt2->execute();
                $rows = array_map([$this, 'normalizeProperty'], $stmt2->fetchAll());
            }
            return $rows;
        } catch (Throwable $e) { return []; }
    }

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

            // Intentar IA si está configurada
            if ($msgRaw !== '') {
                $ai = $this->chatAiReply($msgRaw, $sessionId);
                if (is_array($ai) && !empty($ai['reply'])) {
                    Response::json($ai);
                    return;
                }
            }

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

    // ---------- Admin / Notificaciones (stubs) ----------
    public function getNotificacionesCount(): void
    {
        if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
        Response::json(['count' => 0]);
    }

    public function getNotificaciones(): void
    {
        if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
        Response::json([]);
    }

    public function getAdminProperties(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            $limit = min(1000, max(1, (int) $this->query('limit', 500)));
            $stmt = $this->pdo()->prepare('SELECT * FROM properties ORDER BY created_at DESC LIMIT ?');
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->execute();
            $items = array_map([$this, 'normalizeProperty'], $stmt->fetchAll());
            Response::json(['items' => $items, 'total' => count($items)]);
        });
    }

    public function getAdminDashboard(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            $stats = [
                'totalPropiedades' => 0,
                'propiedadesPublicadas' => 0,
                'propiedadesBorrador' => 0,
                'totalReservas' => 0,
                'reservasPendientes' => 0,
                'totalUsuarios' => 1,
                'ingresosPotenciales' => 0,
                'propiedadesPorTipo' => [],
            ];
            try {
                $pdo = $this->pdo();
                $stats['totalPropiedades'] = (int) $pdo->query("SELECT COUNT(*) FROM properties")->fetchColumn();
                $stats['propiedadesPublicadas'] = (int) $pdo->query("SELECT COUNT(*) FROM properties WHERE estado='PUBLICADO'")->fetchColumn();
                $stats['propiedadesBorrador'] = (int) $pdo->query("SELECT COUNT(*) FROM properties WHERE estado='BORRADOR'")->fetchColumn();
                $stats['totalReservas'] = (int) $pdo->query("SELECT COUNT(*) FROM reservas")->fetchColumn();
                $stats['reservasPendientes'] = (int) $pdo->query("SELECT COUNT(*) FROM reservas WHERE estado='PENDIENTE'")->fetchColumn();
                $rows = $pdo->query("SELECT tipo, COUNT(*) AS total FROM properties GROUP BY tipo ORDER BY total DESC")->fetchAll();
                $stats['propiedadesPorTipo'] = array_map(fn($r) => ['tipo' => $r['tipo'], 'total' => (int)$r['total']], $rows);
                $stats['ingresosPotenciales'] = (float) $pdo->query("SELECT COALESCE(SUM(precioNoche),0) FROM properties WHERE estado='PUBLICADO'")->fetchColumn();
            } catch (Throwable $e) {
                // devolver stats vacíos
            }
            Response::json($stats);
        });
    }

    public function getChatAiConfigAdmin(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            $c = $this->chatAiConfig();
            Response::json([
                'enabled' => !empty($c['enabled']),
                'provider' => (string)($c['provider'] ?? 'openai-compatible'),
                'base_url' => (string)($c['base_url'] ?? ''),
                'model' => (string)($c['model'] ?? ''),
                'system_prompt' => (string)($c['system_prompt'] ?? ''),
                'has_key' => !empty($c['api_key']),
                'key_masked' => !empty($c['api_key']) ? ('••••' . substr((string)$c['api_key'], -4)) : '',
            ]);
        });
    }

    public function saveChatAiConfigAdmin(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            $body = $this->body();
            $current = $this->chatAiConfig();
            $next = [
                'enabled' => !empty($body['enabled']),
                'provider' => trim((string)($body['provider'] ?? $current['provider'] ?? 'openai-compatible')),
                'base_url' => rtrim(trim((string)($body['base_url'] ?? $current['base_url'] ?? 'https://api.openai.com/v1')), '/'),
                'model' => trim((string)($body['model'] ?? $current['model'] ?? 'gpt-4o-mini')),
                'system_prompt' => trim((string)($body['system_prompt'] ?? $current['system_prompt'] ?? '')),
                'api_key' => $current['api_key'] ?? '',
            ];
            $newKey = trim((string)($body['api_key'] ?? ''));
            if ($newKey !== '') $next['api_key'] = $newKey;
            if (array_key_exists('clear_key', $body) && $body['clear_key']) $next['api_key'] = '';
            $this->setConfigValue('chatAi', $next);
            Response::json(['ok' => true, 'has_key' => !empty($next['api_key'])]);
        });
    }

    public function getChatAiModelsAdmin(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            $c = $this->chatAiConfig();
            $body = $this->body();
            $baseUrl = rtrim(trim((string)($body['base_url'] ?? $this->query('base_url', $c['base_url'] ?? 'https://api.openai.com/v1'))), '/');
            $apiKey = trim((string)($body['api_key'] ?? $this->query('api_key', '')));
            if ($apiKey === '') $apiKey = (string)($c['api_key'] ?? '');
            if ($baseUrl === '' || $apiKey === '') {
                Response::json(['models' => [], 'message' => 'Falta base URL o API key']);
                return;
            }

            $ch = curl_init($baseUrl . '/models');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $apiKey],
                CURLOPT_TIMEOUT => 15,
                CURLOPT_CONNECTTIMEOUT => 8,
            ]);
            $raw = curl_exec($ch);
            $err = curl_error($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($raw === false || $err || $status < 200 || $status >= 300) {
                Response::json(['models' => [], 'message' => 'No se pudieron cargar modelos (' . ($err ?: ('HTTP ' . $status)) . ')']);
                return;
            }
            $json = json_decode((string)$raw, true);
            $data = is_array($json['data'] ?? null) ? $json['data'] : (is_array($json['models'] ?? null) ? $json['models'] : []);
            $models = [];
            foreach ($data as $m) {
                $id = is_array($m) ? (string)($m['id'] ?? $m['name'] ?? '') : '';
                if ($id !== '') $models[] = ['id' => $id, 'name' => $id];
            }
            usort($models, fn($a,$b) => strcmp($a['id'], $b['id']));
            Response::json(['models' => array_values($models)]);
        });
    }

    // ---------- Ingesta / Scraping ----------
    private function ingSlug(string $s): string
    {
        $s = mb_strtolower(trim($s));
        $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s;
        $s = preg_replace('/[^a-z0-9]+/', '-', $s);
        $s = trim((string)$s, '-');
        return substr($s, 0, 80);
    }
    private function ingNorm(string $s): string
    {
        $s = mb_strtolower(trim($s));
        $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s;
        return trim(preg_replace('/\s+/', ' ', $s));
    }
    private function ingToNumber($v): ?float
    {
        if (is_numeric($v)) return (float)$v;
        $s = mb_strtolower(trim((string)$v));
        if ($s === '') return null;
        $mult = 1;
        if (str_contains($s, 'millon')) $mult = 1000000;
        elseif (preg_match('/\bmil\b|\bk\b/', $s)) $mult = 1000;
        $s = preg_replace('/[\$\s]/', '', $s);
        $s = preg_replace('/\bmil\b|\bk\b|millones?|pesos?/u', '', $s);
        if (preg_match('/^\d{1,3}([.,]\d{3})+$/', $s)) return (float)(intval(str_replace([',','.'],'',$s)) * $mult);
        $n = floatval(str_replace(',', '.', $s));
        if (is_nan($n)) return null;
        if ($mult === 1 && $n > 0 && $n < 1000) return round($n * 1000);
        return round($n * $mult);
    }
    private function ingToBool($v): ?bool
    {
        if (is_bool($v)) return $v;
        $s = $this->ingNorm((string)$v);
        if (in_array($s, ['si','true','1','x','verdadero','incluido','permitido','permitidas'], true)) return true;
        if (in_array($s, ['no','false','0','-','n/a','ninguno'], true)) return false;
        return null;
    }
    private function ingMapTipo($raw): ?string
    {
        $t = $this->ingNorm((string)$raw);
        if ($t === '') return null;
        if (str_contains($t, 'hotel')) return 'hotel';
        if (preg_match('/hostal|hostel|albergue/', $t)) return 'hostal';
        if (preg_match('/glamping|domo|tipi|camp/', $t)) return 'glamping';
        if (preg_match('/restaurante|pizzeria|parrilla|comida|gastronom/', $t)) return 'restaurante';
        if (preg_match('/\bbar\b|bares|pub|cerveceria|coctel/', $t)) return 'bar';
        if (str_contains($t, 'finca')) return 'finca';
        if (preg_match('/tour|actividad|excursion|avistamiento|mariposario|ecoturismo/', $t)) return 'actividad';
        if (str_contains($t, 'centro')) return 'centro_turistico';
        return null;
    }
    private function ingSplitList($v): array
    {
        if (is_array($v)) return array_values(array_filter(array_map(fn($x)=>trim((string)$x), $v)));
        return array_values(array_filter(array_map('trim', preg_split('/[,;|]/', (string)$v))));
    }
    private function ingClasificarWeb(string $url): string
    {
        $u = mb_strtolower($url);
        if (str_contains($u, 'sites.google.com')) return 'Google Sites';
        if (preg_match('/facebook\.com|instagram\.com|tiktok\.com|airbnb\.com|booking\.com|tripadvisor/', $u)) return 'Red social';
        return 'Web propia';
    }

    private function ingNormalizeRow(int $index, array $crudo, ?string $municipio): array
    {
        $datos = [];
        $errores = [];
        $map = [
            'nombre'=>'nombre','name'=>'nombre','titulo'=>'nombre','establecimiento'=>'nombre',
            'tipo'=>'tipo','type'=>'tipo','categoria'=>'tipo',
            'descripcion'=>'descripcion','description'=>'descripcion',
            'direccion'=>'direccion','address'=>'direccion',
            'ubicacion'=>'ubicacion','location'=>'ubicacion','vereda'=>'ubicacion','sector'=>'ubicacion',
            'ciudad'=>'ciudad','city'=>'ciudad','municipio'=>'ciudad',
            'departamento'=>'departamento',
            'telefono'=>'telefono','phone'=>'telefono','tel'=>'telefono','celular'=>'telefono',
            'email'=>'email','correo'=>'email',
            'whatsapp'=>'whatsapp','website'=>'website','sitio'=>'website','web'=>'website',
            'precio'=>'precioNoche','price'=>'precioNoche','precionoche'=>'precioNoche','tarifa'=>'precioNoche','valor'=>'precioNoche',
            'capacidad'=>'capacidadMaxima','capacity'=>'capacidadMaxima','capacidadmaxima'=>'capacidadMaxima','huespedes'=>'capacidadMaxima','cupo'=>'capacidadMaxima',
            'habitaciones'=>'numeroHabitaciones','rooms'=>'numeroHabitaciones','cuartos'=>'numeroHabitaciones','numerohabitaciones'=>'numeroHabitaciones',
            'banos'=>'numeroBanos','bathrooms'=>'numeroBanos','numerobanos'=>'numeroBanos',
            'mascotas'=>'admiteMascotas','pets'=>'admiteMascotas','admitemascotas'=>'admiteMascotas','petfriendly'=>'admiteMascotas',
            'seguro'=>'seguroDisponible','insurance'=>'seguroDisponible','segurodisponible'=>'seguroDisponible',
            'actividades'=>'actividades','activities'=>'actividades',
        ];
        if (isset($crudo['coordenadas']) && is_array($crudo['coordenadas']) && isset($crudo['coordenadas']['lat'],$crudo['coordenadas']['lng'])) {
            $datos['coordenadas'] = ['lat'=>(float)$crudo['coordenadas']['lat'], 'lng'=>(float)$crudo['coordenadas']['lng']];
        }
        foreach ($crudo as $k => $v) {
            $canon = $map[$this->ingNorm((string)$k)] ?? null;
            if (!$canon) continue;
            if ($canon === 'tipo') $datos['tipo'] = (string)$v;
            elseif ($canon === 'precioNoche') { $n = $this->ingToNumber($v); if ($n !== null) $datos['precioNoche'] = $n; }
            elseif (in_array($canon, ['capacidadMaxima','numeroHabitaciones','numeroBanos'], true)) { $n = $this->ingToNumber($v); if ($n !== null) $datos[$canon] = (int)round($n > 10000 ? $n/1000 : $n); }
            elseif (in_array($canon, ['admiteMascotas','seguroDisponible'], true)) { $b = $this->ingToBool($v); if ($b !== null) $datos[$canon] = $b; }
            elseif ($canon === 'actividades') $datos['actividades'] = $this->ingSplitList($v);
            else { $val = trim((string)$v); if ($val !== '') $datos[$canon] = $val; }
        }
        if (empty($datos['nombre'])) $errores[] = 'Falta el nombre del sitio.';
        $tipoFinal = $this->ingMapTipo($datos['tipo'] ?? '');
        if (!$tipoFinal) $errores[] = 'Tipo no reconocido: "' . ($datos['tipo'] ?? '(vacío)') . '".';
        else $datos['tipo'] = $tipoFinal;
        if ($municipio && empty($datos['ciudad'])) $datos['ciudad'] = $municipio;
        if (!empty($datos['ciudad']) && empty($datos['ubicacion'])) $datos['ubicacion'] = $datos['ciudad'];
        if (empty($datos['capacidadMaxima'])) $datos['capacidadMaxima'] = 4;
        if (!isset($datos['precioNoche'])) $errores[] = 'Falta el precio (se importará en 0, ajústalo luego).';
        if (!empty($datos['website'])) $datos['fuenteWeb'] = $this->ingClasificarWeb($datos['website']);

        $slug = !empty($datos['nombre']) ? $this->ingSlug($datos['nombre']) : null;
        $existente = null; $accion = 'crear';
        if ($slug) {
            try {
                $stmt = $this->pdo()->prepare('SELECT id,nombre,slug FROM properties WHERE slug = ? LIMIT 1');
                $stmt->execute([$slug]);
                $ex = $stmt->fetch();
                if ($ex) { $existente = ['id'=>$ex['id'],'nombre'=>$ex['nombre'],'slug'=>$ex['slug']]; $accion = 'actualizar'; }
                else {
                    $nombreN = $this->ingNorm((string)$datos['nombre']);
                    $cand = $this->pdo()->query('SELECT id,nombre,slug FROM properties LIMIT 150')->fetchAll();
                    foreach ($cand as $c) {
                        $cn = $this->ingNorm((string)$c['nombre']);
                        if ($cn && (str_contains($cn,$nombreN) || str_contains($nombreN,$cn)) && min(mb_strlen($cn), mb_strlen($nombreN)) > 4) {
                            $existente = ['id'=>$c['id'],'nombre'=>$c['nombre'],'slug'=>$c['slug']]; $accion = 'duplicado'; break;
                        }
                    }
                }
            } catch (Throwable $e) {}
        }
        return ['index'=>$index,'datos'=>$datos,'slug'=>$slug,'accion'=>$accion,'existente'=>$existente,'errores'=>$errores];
    }

    private function ingParseCsv(string $contenido): array
    {
        $lines = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $contenido))));
        if (count($lines) < 2) throw new RuntimeException('El CSV necesita encabezados y al menos una fila.');
        $delim = substr_count($lines[0], ';') >= substr_count($lines[0], ',') ? ';' : ',';
        $headers = array_map('trim', str_getcsv($lines[0], $delim));
        $rows = [];
        foreach (array_slice($lines, 1) as $line) {
            $cells = str_getcsv($line, $delim);
            $obj = [];
            foreach ($headers as $i => $h) { if ($h !== '') $obj[$h] = $cells[$i] ?? ''; }
            $rows[] = $obj;
        }
        return $rows;
    }

    private function ingGeocode(string $municipio, string $departamento): array
    {
        $q = urlencode($municipio . ', ' . $departamento . ', Colombia');
        $url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q={$q}";
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>15, CURLOPT_CONNECTTIMEOUT=>8, CURLOPT_HTTPHEADER=>['User-Agent: TropicalBiohostelBot/1.0 (hola@tropicalbiohostel.com)']]);
        $raw = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        $data = json_decode((string)$raw, true);
        if ($status < 200 || $status >= 300 || !is_array($data) || empty($data[0])) throw new RuntimeException('No se encontró el municipio "' . $municipio . '".');
        return ['lat'=>(float)$data[0]['lat'], 'lon'=>(float)$data[0]['lon'], 'nombre'=>(string)($data[0]['display_name'] ?? $municipio)];
    }

    private function ingOsmQuery(float $lat, float $lon, array $tipos): string
    {
        $radio = 12000; $t = array_fill_keys($tipos, true); $all = count($tipos) === 0;
        $filtros = [];
        if ($all || isset($t['hotel'])) $filtros[] = '["tourism"="hotel"]';
        if ($all || isset($t['hostal'])) $filtros[] = '["tourism"~"^(hostel|guest_house|apartment)$"]';
        if ($all || isset($t['glamping'])) $filtros[] = '["tourism"~"^(camp_site|caravan_site)$"]';
        if ($all || isset($t['restaurante'])) $filtros[] = '["amenity"~"^(restaurant|fast_food|food_court)$"]';
        if ($all || isset($t['bar'])) $filtros[] = '["amenity"~"^(bar|pub|biergarten|cafe)$"]';
        if ($all || isset($t['finca'])) $filtros[] = '["tourism"="farm"]';
        if ($all || isset($t['centro_turistico'])) $filtros[] = '["leisure"~"^(park|nature_reserve|water_park|resort)$"]';
        if ($all || isset($t['actividad'])) $filtros[] = '["tourism"~"^(attraction|museum|viewpoint|gallery)$"]';
        $lines = array_map(fn($f) => "  nwr{$f}(around:{$radio},{$lat},{$lon});", $filtros);
        return "[out:json][timeout:60];(\n" . implode("\n", $lines) . "\n);out center tags;";
    }

    private function ingFetchOsm(float $lat, float $lon, array $tipos): array
    {
        $query = $this->ingOsmQuery($lat, $lon, $tipos);
        $endpoints = [
            'https://overpass-api.de/api/interpreter',
            'https://overpass.private.coffee/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter',
        ];
        $lastError = 'sin respuesta';
        foreach ($endpoints as $url) {
            foreach ([0,5,15] as $espera) {
                if ($espera > 0) sleep($espera);
                $ch = curl_init($url);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$query,
                    CURLOPT_TIMEOUT=>90, CURLOPT_CONNECTTIMEOUT=>10,
                    CURLOPT_HTTPHEADER=>['User-Agent: TropicalBiohostelBot/1.0 (hola@tropicalbiohostel.com)','Content-Type: text/plain'],
                ]);
                $raw = curl_exec($ch); $err = curl_error($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
                if ($raw === false || $err) { $lastError = 'sin respuesta'; continue; }
                if ($status === 400) { $lastError = 'consulta rechazada (HTTP 400)'; break; }
                if ($status < 200 || $status >= 300) { $lastError = 'HTTP ' . $status; continue; }
                $data = json_decode((string)$raw, true);
                if (!is_array($data['elements'] ?? null)) { $lastError = 'respuesta vacía'; continue; }
                $vistos = []; $out = [];
                foreach ($data['elements'] as $e) {
                    $tags = is_array($e['tags'] ?? null) ? $e['tags'] : [];
                    if (empty($tags['name'])) continue;
                    $la = $e['lat'] ?? ($e['center']['lat'] ?? null);
                    $lo = $e['lon'] ?? ($e['center']['lon'] ?? null);
                    if ($la === null || $lo === null) continue;
                    $key = $this->ingNorm((string)$tags['name']) . '|' . number_format((float)$la,4,'.','') . '|' . number_format((float)$lo,4,'.','');
                    if (isset($vistos[$key])) continue;
                    $vistos[$key] = true; $out[] = $e;
                    if (count($out) >= 120) break;
                }
                return $out;
            }
        }
        throw new RuntimeException('Los servicios de mapas están saturados (' . $lastError . '). Espera unos minutos e intenta de nuevo.');
    }

    private function ingOsmTipo(array $tags): string
    {
        $tourism = $this->ingNorm((string)($tags['tourism'] ?? ''));
        $amenity = $this->ingNorm((string)($tags['amenity'] ?? ''));
        $leisure = $this->ingNorm((string)($tags['leisure'] ?? ''));
        if ($tourism === 'hotel') return 'hotel';
        if (in_array($tourism, ['hostel','guest_house','apartment'], true)) return 'hostal';
        if (in_array($tourism, ['camp_site','caravan_site'], true)) return 'glamping';
        if ($tourism === 'farm') return 'finca';
        if (in_array($amenity, ['restaurant','fast_food','food_court'], true)) return 'restaurante';
        if (in_array($amenity, ['bar','pub','biergarten','cafe'], true)) return 'bar';
        if (in_array($tourism, ['attraction','museum','viewpoint','gallery'], true)) return 'actividad';
        if (in_array($leisure, ['park','nature_reserve','water_park','resort'], true)) return 'centro_turistico';
        return 'actividad';
    }

    private function ingOsmToDato(array $e, string $municipio, string $departamento): array
    {
        $tags = is_array($e['tags'] ?? null) ? $e['tags'] : [];
        $la = $e['lat'] ?? ($e['center']['lat'] ?? null);
        $lo = $e['lon'] ?? ($e['center']['lon'] ?? null);
        $dir = trim(implode(' ', array_filter([$tags['addr:street'] ?? '', $tags['addr:housenumber'] ?? ''])));
        $website = $tags['website'] ?? ($tags['contact:website'] ?? null);
        $acts = [];
        $leisure = $this->ingNorm((string)($tags['leisure'] ?? ''));
        if ($leisure === 'nature_reserve') $acts[] = 'senderismo';
        return [
            'nombre' => $tags['name'] ?? '',
            'tipo' => $this->ingOsmTipo($tags),
            'descripcion' => ($tags['name'] ?? 'Sitio') . ' - sitio registrado en ' . $municipio . '.',
            'direccion' => $dir ?: null,
            'ciudad' => $tags['addr:city'] ?? $municipio,
            'departamento' => $departamento,
            'telefono' => $tags['phone'] ?? ($tags['contact:phone'] ?? null),
            'website' => $website ?: null,
            'fuenteWeb' => $website ? $this->ingClasificarWeb($website) : null,
            'coordenadas' => ['lat'=>(float)$la,'lng'=>(float)$lo],
            'actividades' => $acts,
        ];
    }

    public function ingestionPreview(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            $body = $this->body();
            $formato = (string)($body['formato'] ?? 'json');
            $contenido = (string)($body['contenido'] ?? '');
            $municipio = trim((string)($body['municipio'] ?? ''));
            if (trim($contenido) === '') { Response::error('Falta contenido', 400); return; }
            if ($formato === 'json') {
                $data = json_decode($contenido, true);
                if ($data === null) { Response::error('JSON inválido. Revisa comas, comillas y corchetes.', 400); return; }
                $crudos = is_array($data) ? (array_is_list($data) ? $data : ($data['sitios'] ?? $data['sites'] ?? $data['lugares'] ?? [$data])) : [$data];
            } elseif ($formato === 'csv') {
                $crudos = $this->ingParseCsv($contenido);
            } else {
                Response::error('El texto libre necesita un proveedor de IA activo. Usa JSON o CSV en este backend PHP.', 400); return;
            }
            $rows = [];
            foreach (array_values($crudos) as $i => $c) { $rows[] = $this->ingNormalizeRow($i, is_array($c)?$c:[], $municipio ?: null); }
            Response::json(['total'=>count($rows), 'rows'=>$rows]);
        });
    }

    public function ingestionScrape(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            $body = $this->body();
            $municipio = trim((string)($body['municipio'] ?? ''));
            $departamento = trim((string)($body['departamento'] ?? 'Cundinamarca'));
            $tipos = is_array($body['tipos'] ?? null) ? array_values(array_filter(array_map('strval', $body['tipos']))) : [];
            if ($municipio === '') { Response::error('Indica el municipio a buscar.', 400); return; }
            try {
                $geo = $this->ingGeocode($municipio, $departamento ?: 'Cundinamarca');
                $elements = $this->ingFetchOsm($geo['lat'], $geo['lon'], $tipos);
                $rows = [];
                foreach ($elements as $i => $e) {
                    $dato = $this->ingOsmToDato($e, $municipio, $departamento ?: 'Cundinamarca');
                    $rows[] = $this->ingNormalizeRow($i, $dato, $municipio);
                }
                Response::json(['total'=>count($rows), 'rows'=>$rows, 'centro'=>['lat'=>$geo['lat'],'lon'=>$geo['lon'],'nombre'=>$geo['nombre']], 'fuente'=>'OpenStreetMap']);
            } catch (Throwable $e) {
                Response::error($e->getMessage() ?: 'No se pudo completar el scraping', 400);
            }
        });
    }

    public function ingestionExecute(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            $body = $this->body();
            $items = is_array($body['items'] ?? null) ? $body['items'] : [];
            $publicar = !empty($body['publicarNuevos']);
            $creados = 0; $actualizados = 0; $omitidos = 0; $errores = [];
            foreach ($items as $it) {
                $accion = (string)($it['accion'] ?? 'omitir');
                $datos = is_array($it['datos'] ?? null) ? $it['datos'] : [];
                $slugObj = trim((string)($it['slugObjetivo'] ?? ''));
                if ($accion === 'omitir') { $omitidos++; continue; }
                try {
                    $nombre = trim((string)($datos['nombre'] ?? ''));
                    if ($nombre === '') { $omitidos++; continue; }
                    $slug = $this->ingSlug($nombre);
                    $tipo = $this->ingMapTipo($datos['tipo'] ?? '') ?: 'actividad';
                    $payload = [
                        'nombre'=>$nombre, 'slug'=>$slug, 'tipo'=>$tipo,
                        'descripcion'=>($datos['descripcion'] ?? null) ?: null,
                        'ubicacion'=>($datos['ubicacion'] ?? $datos['ciudad'] ?? null) ?: null,
                        'direccion'=>($datos['direccion'] ?? null) ?: null,
                        'ciudad'=>($datos['ciudad'] ?? null) ?: null,
                        'departamento'=>($datos['departamento'] ?? null) ?: null,
                        'telefono'=>($datos['telefono'] ?? null) ?: null,
                        'email'=>($datos['email'] ?? null) ?: null,
                        'whatsapp'=>($datos['whatsapp'] ?? null) ?: null,
                        'precioNoche'=>(float)($datos['precioNoche'] ?? 0),
                        'capacidadMaxima'=>max(1,(int)($datos['capacidadMaxima'] ?? 4)),
                        'numeroHabitaciones'=>isset($datos['numeroHabitaciones']) ? (int)$datos['numeroHabitaciones'] : 1,
                        'admiteMascotas'=>!empty($datos['admiteMascotas']) ? 1 : 0,
                        'seguroDisponible'=>!empty($datos['seguroDisponible']) ? 1 : 0,
                        'actividades'=>json_encode(array_values(is_array($datos['actividades'] ?? null)?$datos['actividades']:[]), JSON_UNESCAPED_UNICODE),
                        'imagenes'=>json_encode(array_values(is_array($datos['imagenes'] ?? null)?$datos['imagenes']:[]), JSON_UNESCAPED_UNICODE),
                        'videos'=>json_encode([]), 'servicioImagenes'=>json_encode([]), 'redesSociales'=>json_encode(!empty($datos['website'])?['sitio_web'=>$datos['website']]:new stdClass()),
                        'coordenadas'=>json_encode(is_array($datos['coordenadas'] ?? null)?$datos['coordenadas']:new stdClass()),
                    ];
                    if ($accion === 'actualizar' && $slugObj !== '') {
                        $stmt = $this->pdo()->prepare('UPDATE properties SET nombre=?,tipo=?,descripcion=?,ubicacion=?,direccion=?,ciudad=?,departamento=?,telefono=?,email=?,whatsapp=?,precioNoche=?,capacidadMaxima=?,numeroHabitaciones=?,admiteMascotas=?,seguroDisponible=?,actividades=?,coordenadas=?,updated_at=CURRENT_TIMESTAMP WHERE slug=?');
                        $stmt->execute([$payload['nombre'],$payload['tipo'],$payload['descripcion'],$payload['ubicacion'],$payload['direccion'],$payload['ciudad'],$payload['departamento'],$payload['telefono'],$payload['email'],$payload['whatsapp'],$payload['precioNoche'],$payload['capacidadMaxima'],$payload['numeroHabitaciones'],$payload['admiteMascotas'],$payload['seguroDisponible'],$payload['actividades'],$payload['coordenadas'],$slugObj]);
                        $actualizados++;
                    } else {
                        $id = $this->uuid();
                        $estado = $publicar ? 'PUBLICADO' : 'BORRADOR';
                        $stmt = $this->pdo()->prepare('INSERT INTO properties (id,slug,nombre,tipo,descripcion,ubicacion,direccion,ciudad,departamento,telefono,email,whatsapp,estrellas,calificacion,precioNoche,capacidadMaxima,numeroHabitaciones,horarioCheckIn,horarioCheckOut,reglamento,politicasCancelacion,admiteMascotas,seguroDisponible,actividades,imagenes,videos,servicioImagenes,redesSociales,coordenadas,estado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,0,?,?,?,?,NULL,NULL,NULL,NULL,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre),tipo=VALUES(tipo),descripcion=VALUES(descripcion),telefono=VALUES(telefono),updated_at=CURRENT_TIMESTAMP');
                        $stmt->execute([$id,$payload['slug'],$payload['nombre'],$payload['tipo'],$payload['descripcion'],$payload['ubicacion'],$payload['direccion'],$payload['ciudad'],$payload['departamento'],$payload['telefono'],$payload['email'],$payload['whatsapp'],$payload['precioNoche'],$payload['capacidadMaxima'],$payload['numeroHabitaciones'],$payload['admiteMascotas'],$payload['seguroDisponible'],$payload['actividades'],$payload['imagenes'],$payload['videos'],$payload['servicioImagenes'],$payload['redesSociales'],$payload['coordenadas'],$estado]);
                        $creados++;
                    }
                } catch (Throwable $e) { $errores[] = ($datos['nombre'] ?? 'fila') . ': ' . $e->getMessage(); }
            }
            Response::json(['creados'=>$creados,'actualizados'=>$actualizados,'omitidos'=>$omitidos,'errores'=>$errores]);
        });
    }

    public function ingestionEstado(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            Response::json(['pendientes'=>0,'desactualizados'=>[],'ultimaVerificacion'=>null]);
        });
    }
    public function ingestionActualizaciones(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            Response::json([]);
        });
    }
    public function ingestionVerificar(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            Response::json(['ok'=>true,'mensaje'=>'Verificación automática no disponible en backend PHP. Usa Scrapear municipio.']);
        });
    }
    public function ingestionResolver(array $params): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            Response::json(['ok'=>true]);
        });
    }
    public function ingestionGoogle(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            $body = $this->body();
            $rows = is_array($body['rows'] ?? null) ? $body['rows'] : [];
            $out = array_map(fn($r) => ['datos'=>$r['datos'] ?? $r, 'agregado'=>[]], $rows);
            Response::json(['total'=>count($out),'enriquecidos'=>0,'rows'=>$out,'message'=>'Enriquecimiento Google no configurado en backend PHP.']);
        });
    }
    public function ingestionEnriquecer(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            $body = $this->body();
            $rows = is_array($body['rows'] ?? null) ? $body['rows'] : [];
            $out = array_map(fn($r) => ['datos'=>$r['datos'] ?? $r, 'agregado'=>[]], $rows);
            Response::json(['total'=>count($out),'enriquecidos'=>0,'rows'=>$out]);
        });
    }
    public function getClavesEstado(): void
    {
        $this->safe(function () {
            if (!$this->isAdmin()) { Response::error('No autorizado', 401); return; }
            Response::json(['google_places'=>false]);
        });
    }
}
